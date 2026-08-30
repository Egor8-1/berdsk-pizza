// ============================================================
//  BERDSK_PIZZA — АВТОРИЗАЦИЯ
//  Роль определяется по БД
// ============================================================

let currentUser = null;

function getCurrentUser() {
  if (currentUser) return currentUser;
  const saved = localStorage.getItem("berdskUser");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      return currentUser;
    } catch (e) {
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
//  API
// ============================================================

async function loginUser(login, password) {
  const users = await getUsers();
  const user = users.find((u) => u.login === login && u.password === password);
  if (!user) throw new Error("Неверный логин или пароль");
  saveUser(user);
  return user;
}

async function registerUser(name, login, password) {
  const users = await getUsers();
  if (users.find((u) => u.login === login)) {
    throw new Error("Пользователь с таким логином уже существует");
  }
  return createUser({ name, login, password, role: "client" });
}

// ============================================================
//  ОБРАБОТЧИКИ
// ============================================================

function handleLogin() {
  const login = document.getElementById("loginInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();

  if (!login || !password) {
    alert("⚠️ Введите логин и пароль");
    return;
  }

  loginUser(login, password)
    .then(function (user) {
      alert("✅ Добро пожаловать, " + (user.name || user.login) + "!");
      document.getElementById("authModal").classList.remove("active");

      const role = user.role;
      if (role === "admin") window.location.href = "admin.html";
      else if (role === "kitchen") window.location.href = "kitchen.html";
      else if (role === "operator") window.location.href = "operator.html";
      else if (role === "courier") window.location.href = "courier.html";
      else location.reload();
    })
    .catch(function (err) {
      alert("❌ " + err.message);
    });
}

function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const login = document.getElementById("regLogin").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!name || !login || !password) {
    alert("⚠️ Заполните все поля");
    return;
  }

  registerUser(name, login, password)
    .then(function () {
      alert("✅ Регистрация успешна! Теперь войдите.");
      document.getElementById("registerModal").classList.remove("active");
      document.getElementById("authModal").classList.add("active");
      document.getElementById("loginInput").value = login;
    })
    .catch(function (err) {
      alert("❌ " + err.message);
    });
}

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
        document.getElementById("authModal").classList.add("active");
      };
    }
  }
}

// ============================================================
//  DOM
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  // Закрытие модалок
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.remove("active");
    });
  });

  const closeAuth = document.getElementById("closeAuth");
  if (closeAuth) {
    closeAuth.addEventListener("click", function () {
      document.getElementById("authModal").classList.remove("active");
    });
  }

  const closeRegister = document.getElementById("closeRegister");
  if (closeRegister) {
    closeRegister.addEventListener("click", function () {
      document.getElementById("registerModal").classList.remove("active");
    });
  }

  const showRegister = document.getElementById("showRegister");
  if (showRegister) {
    showRegister.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("authModal").classList.remove("active");
      document.getElementById("registerModal").classList.add("active");
    });
  }

  const showAuth = document.getElementById("showAuth");
  if (showAuth) {
    showAuth.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("registerModal").classList.remove("active");
      document.getElementById("authModal").classList.add("active");
    });
  }

  initAuthUI();
});

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.hasRole = hasRole;
window.initAuthUI = initAuthUI;
