// ============================================================
//  BERDSK_PIZZA — АВТОРИЗАЦИЯ
//  Полностью переписанный модуль
// ============================================================

let currentUser = null;

// ============================================================
//  РАБОТА С ТЕКУЩИМ ПОЛЬЗОВАТЕЛЕМ
// ============================================================

function getCurrentUser() {
  if (currentUser) return currentUser;

  const saved = localStorage.getItem("berdskUser");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      return currentUser;
    } catch (e) {
      console.error("Ошибка парсинга пользователя из localStorage:", e);
      localStorage.removeItem("berdskUser");
      return null;
    }
  }
  return null;
}

function saveUser(user) {
  currentUser = user;
  localStorage.setItem("berdskUser", JSON.stringify(user));
}

function logout() {
  currentUser = null;
  localStorage.removeItem("berdskUser");
  localStorage.removeItem("berdskCart"); // очищаем корзину при выходе
  window.location.href = "index.html";
}

function isAuthenticated() {
  return getCurrentUser() !== null;
}

function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

// ============================================================
//  АВТОРИЗАЦИЯ
// ============================================================

async function loginUser(login, password) {
  // 1. Проверяем что пользователь существует
  const user = await getUserByLogin(login);
  if (!user) {
    throw new Error("Неверный логин или пароль");
  }

  // 2. Проверяем блокировку
  if (user.is_blocked) {
    throw new Error("Аккаунт заблокирован. Обратитесь к администратору.");
  }

  // 3. Хешируем введённый пароль
  const hashedPassword = await hashPasswordFrontend(password);

  // 4. Сравниваем с хешем в БД
  if (user.password !== hashedPassword) {
    throw new Error("Неверный логин или пароль");
  }

  // 5. Сохраняем пользователя (без пароля)
  const safeUser = {
    id: user.id,
    login: user.login,
    role: user.role,
    name: user.name,
    phone: user.phone,
    is_blocked: user.is_blocked,
    created_at: user.created_at,
  };
  saveUser(safeUser);
  return safeUser;
}

async function registerUser(name, login, password) {
  // 1. Валидация
  if (!name || !login || !password) {
    throw new Error("Все поля обязательны");
  }
  if (login.length < 3) {
    throw new Error("Логин должен быть не короче 3 символов");
  }
  if (password.length < 6) {
    throw new Error("Пароль должен быть не короче 6 символов");
  }

  // 2. Проверяем что логин свободен
  const existing = await getUserByLogin(login);
  if (existing) {
    throw new Error("Пользователь с таким логином уже существует");
  }

  // 3. Хешируем пароль
  const hashedPassword = await hashPasswordFrontend(password);

  // 4. Создаём пользователя
  const userData = {
    login: login,
    password: hashedPassword,
    role: "client",
    name: name,
    phone: null,
    is_blocked: false,
  };

  const created = await createUser(userData);
  return created;
}

// ============================================================
//  ПРОВЕРКА ДОСТУПА ПО РОЛЯМ
// ============================================================

function checkAccess(role) {
  const user = getCurrentUser();
  if (!user) {
    alert("⛔ Доступ запрещен. Требуется авторизация.");
    window.location.href = "index.html";
    return false;
  }
  if (user.role !== role) {
    alert("⛔ Доступ запрещен. Требуются права: " + role);
    redirectByRole(user.role);
    return false;
  }
  return true;
}

function redirectByRole(role) {
  switch (role) {
    case "admin":
      window.location.href = "admin.html";
      break;
    case "kitchen":
      window.location.href = "kitchen.html";
      break;
    case "operator":
      window.location.href = "operator.html";
      break;
    case "courier":
      window.location.href = "courier.html";
      break;
    default:
      window.location.href = "index.html";
  }
}

// ============================================================
//  ОБРАБОТЧИКИ ФОРМ
// ============================================================

async function handleLogin() {
  const login = document.getElementById("loginInput")?.value.trim();
  const password = document.getElementById("passwordInput")?.value.trim();

  if (!login || !password) {
    alert("⚠️ Введите логин и пароль");
    return;
  }

  try {
    const user = await loginUser(login, password);
    alert("✅ Добро пожаловать, " + (user.name || user.login) + "!");

    // Закрываем модалку
    const authModal = document.getElementById("authModal");
    if (authModal) authModal.classList.remove("active");

    // Перенаправляем по роли
    redirectByRole(user.role);
  } catch (error) {
    alert("❌ " + error.message);
  }
}

async function handleRegister() {
  const name = document.getElementById("regName")?.value.trim();
  const login = document.getElementById("regLogin")?.value.trim();
  const password = document.getElementById("regPassword")?.value.trim();

  if (!name || !login || !password) {
    alert("⚠️ Заполните все поля");
    return;
  }

  try {
    await registerUser(name, login, password);
    alert("✅ Регистрация успешна! Теперь войдите.");

    // Закрываем модалку регистрации
    const registerModal = document.getElementById("registerModal");
    if (registerModal) registerModal.classList.remove("active");

    // Открываем модалку входа
    const authModal = document.getElementById("authModal");
    if (authModal) authModal.classList.add("active");

    // Подставляем логин
    const loginInput = document.getElementById("loginInput");
    if (loginInput) loginInput.value = login;
  } catch (error) {
    alert("❌ " + error.message);
  }
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ UI
// ============================================================

function initAuthUI() {
  const user = getCurrentUser();
  const nameEl = document.getElementById("userName");
  const authBtn = document.getElementById("authBtn");

  if (user) {
    if (nameEl) nameEl.textContent = user.name || user.login;
    if (authBtn) {
      authBtn.textContent = "🚪 Выйти";
      authBtn.className = "btn btn--secondary";
      authBtn.onclick = logout;
    }
  } else {
    if (nameEl) nameEl.textContent = "👤 Гость";
    if (authBtn) {
      authBtn.textContent = "🔑 Войти";
      authBtn.className = "btn btn--primary";
      authBtn.onclick = function () {
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.add("active");
      };
    }
  }
}

// ============================================================
//  DOM ОБРАБОТЧИКИ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  // Закрытие модалок по клику на фон
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.remove("active");
    });
  });

  // Закрытие модалки входа
  const closeAuth = document.getElementById("closeAuth");
  if (closeAuth) {
    closeAuth.addEventListener("click", function () {
      document.getElementById("authModal").classList.remove("active");
    });
  }

  // Закрытие модалки регистрации
  const closeRegister = document.getElementById("closeRegister");
  if (closeRegister) {
    closeRegister.addEventListener("click", function () {
      document.getElementById("registerModal").classList.remove("active");
    });
  }

  // Переключение на регистрацию
  const showRegister = document.getElementById("showRegister");
  if (showRegister) {
    showRegister.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("authModal").classList.remove("active");
      document.getElementById("registerModal").classList.add("active");
    });
  }

  // Переключение на вход
  const showAuth = document.getElementById("showAuth");
  if (showAuth) {
    showAuth.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("registerModal").classList.remove("active");
      document.getElementById("authModal").classList.add("active");
    });
  }

  // Инициализация UI
  initAuthUI();
});

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.getCurrentUser = getCurrentUser;
window.saveUser = saveUser;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.hasRole = hasRole;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.checkAccess = checkAccess;
window.redirectByRole = redirectByRole;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.initAuthUI = initAuthUI;
