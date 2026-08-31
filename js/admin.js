// ============================================================
//  BERDSK_PIZZA — АДМИН-ПАНЕЛЬ
//  Полностью переписанный и исправленный модуль
// ============================================================

let adminFilterStatus = "Все";

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("admin")) return;

  const user = getCurrentUser();
  const adminUserEl = document.getElementById("adminUser");
  if (adminUserEl) adminUserEl.textContent = user.name || user.login;

  // Навигация по сайдбару
  document.querySelectorAll(".admin-sidebar__link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.dataset.page;

      document.querySelectorAll(".admin-sidebar__link").forEach((l) => {
        l.classList.remove("active");
      });
      this.classList.add("active");

      switch (page) {
        case "dashboard":
          renderDashboard();
          break;
        case "orders":
          renderAllOrders();
          break;
        case "products":
          renderProductsManagement();
          break;
        case "points":
          renderPointsManagement();
          break;
        case "users":
          renderUsersManagement();
          break;
        case "reports":
          if (typeof renderReports === "function") {
            renderReports();
          } else {
            alert("❌ Модуль отчётов не загружен");
          }
          break;
        case "tickets":
          renderTicketsManagement();
          break;
        case "promocodes":
          renderPromocodesManagement();
          break;
        default:
          renderDashboard();
      }
    });
  });

  // Выход
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Закрытие модалок
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.remove("active");
    });
  });

  const closeProduct = document.getElementById("closeProductModal");
  if (closeProduct) {
    closeProduct.addEventListener("click", () => {
      document.getElementById("productModal").classList.remove("active");
    });
  }

  const closePoint = document.getElementById("closePointModal");
  if (closePoint) {
    closePoint.addEventListener("click", () => {
      document.getElementById("pointModal").classList.remove("active");
    });
  }

  renderDashboard();
});

// ============================================================
//  DASHBOARD
// ============================================================

async function renderDashboard() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [orders, products, users, tickets] = await Promise.all([
      getOrders(),
      getProducts(),
      getUsers(),
      getTickets(),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + (o.status !== "Отменен" ? o.total : 0),
      0
    );
    const newOrders = orders.filter((o) => o.status === "Новый").length;
    const waitingOrders = orders.filter(
      (o) => o.status === "Ожидает подтверждения"
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === "Отменен"
    ).length;
    const activeProducts = products.filter((p) => !p.is_stopped).length;
    const totalUsers = users.filter((u) => u.role === "client").length;
    const openTickets = tickets.filter((t) => t.status === "Новое").length;

    const recentOrders = orders.slice(0, 5);

    container.innerHTML = `
      <div class="dashboard">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📊 Дашборд</h1>
        <div class="dashboard__stats">
          <div class="stat-card">
            <div class="stat-card__label">Всего заказов</div>
            <div class="stat-card__value">${totalOrders}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Выручка</div>
            <div class="stat-card__value orange">${totalRevenue} ₽</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Новых</div>
            <div class="stat-card__value" style="color:#e65100;">${newOrders}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Ожидают</div>
            <div class="stat-card__value" style="color:#F37321;">${waitingOrders}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Отменено</div>
            <div class="stat-card__value" style="color:#dc3545;">${cancelledOrders}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Активных товаров</div>
            <div class="stat-card__value green">${activeProducts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Клиентов</div>
            <div class="stat-card__value">${totalUsers}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Открытых тикетов</div>
            <div class="stat-card__value" style="color:#e65100;">${openTickets}</div>
          </div>
        </div>

        <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #eee;">
          <h3 style="margin-bottom:12px;">📋 Последние заказы</h3>
          ${
            recentOrders.length === 0
              ? '<p style="color:#999;">Нет заказов</p>'
              : `
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Клиент</th>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders
                    .map(
                      (o) => `
                    <tr>
                      <td>#${o.id}</td>
                      <td>${o.client_name}</td>
                      <td>${o.order_type === "delivery" ? "🛵 Доставка" : "🏪 Самовывоз"}</td>
                      <td>${o.total} ₽</td>
                      <td>${o.status}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ВСЕ ЗАКАЗЫ
// ============================================================

async function renderAllOrders() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [orders, points] = await Promise.all([
      getOrders(),
      getPickupPoints(),
    ]);

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">📋 Все заказы</h1>
          <button class="btn btn--outline btn--small" onclick="window.print()">🖨️ Печать</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Клиент</th>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Пункт/Адрес</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (orders.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center; color:#999;">Нет заказов</td></tr>`;
    } else {
      orders.forEach((order) => {
        const point = points.find((p) => p.id === order.pickup_point_id);
        const location =
          order.order_type === "delivery"
            ? order.delivery_address
            : point
            ? point.name
            : "—";

        html += `
          <tr>
            <td>#${order.id}</td>
            <td>${order.client_name}</td>
            <td>${order.order_type === "delivery" ? "🛵" : "🏪"}</td>
            <td>${order.total} ₽</td>
            <td>${location}</td>
            <td>${order.status}</td>
            <td>
              <button class="btn btn--primary btn--small" onclick="adminViewOrder(${order.id})">👁️</button>
              <button class="btn btn--warning btn--small" onclick="adminChangeStatus(${order.id})">✏️</button>
              ${
                order.status !== "Отменен" && order.status !== "Выдан" && order.status !== "Доставлен"
                  ? `<button class="btn btn--danger btn--small" onclick="adminCancelOrder(${order.id})">🗑️</button>`
                  : ""
              }
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

async function adminViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    const products = await getProducts();
    const itemsText = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return `${product ? product.name : "Товар"} × ${item.quantity} = ${
          item.price * item.quantity
        } ₽`;
      })
      .join("\n");

    alert(
      `📦 Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Тип: ${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}\n` +
        `${
          order.order_type === "delivery"
            ? `Адрес: ${order.delivery_address}\n`
            : ""
        }` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n` +
        `Возврат: ${order.is_refunded ? "✅ Да" : "❌ Нет"}\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}\n` +
        `Создан: ${new Date(order.created_at).toLocaleString("ru-RU")}`
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function adminChangeStatus(orderId) {
  const statuses = [
    "Новый",
    "Ожидает подтверждения",
    "Готовится",
    "Готов к выдаче",
    "В пути",
    "Доставлен",
    "Выдан",
    "Отменен",
    "Возврат",
  ];

  const currentStatus = await getOrder(orderId).then((o) => o.status);
  const statusList = statuses.join("\n");
  const newStatus = prompt(
    `Текущий статус: ${currentStatus}\n\nВыберите новый статус:\n${statusList}`,
    currentStatus
  );

  if (!newStatus || newStatus === currentStatus) return;

  if (!statuses.includes(newStatus)) {
    alert("❌ Некорректный статус");
    return;
  }

  try {
    await updateOrder(orderId, { status: newStatus });
    renderAllOrders();
    alert("✅ Статус обновлён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function adminCancelOrder(orderId) {
  const reason = prompt("Причина отмены:");
  if (!reason) return;

  if (!confirm(`Отменить заказ #${orderId}?`)) return;

  try {
    await updateOrder(orderId, {
      status: "Отменен",
      cancel_reason: reason,
      is_refunded: true,
      refund_amount: (await getOrder(orderId)).total,
    });
    renderAllOrders();
    alert("✅ Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  УПРАВЛЕНИЕ ТОВАРАМИ
// ============================================================

async function renderProductsManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const products = await getProducts();

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">📦 Управление товарами</h1>
          <button class="btn btn--primary" onclick="showAddProduct()">➕ Добавить</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Стоп</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (products.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center; color:#999;">Нет товаров</td></tr>`;
    } else {
      products.forEach((p) => {
        html += `
          <tr>
            <td>${p.id}</td>
            <td>${p.image || "🍕"} ${p.name}</td>
            <td>${p.category}</td>
            <td>${p.price} ₽</td>
            <td>${p.is_stopped ? "❌" : "✅"}</td>
            <td>
              <button class="btn btn--warning btn--small" onclick="editProduct(${p.id})">✏️</button>
              <button class="btn btn--secondary btn--small" onclick="toggleProductStop(${p.id})">${p.is_stopped ? "▶️" : "⏸️"}</button>
              <button class="btn btn--danger btn--small" onclick="deleteProductItem(${p.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

function showAddProduct() {
  document.getElementById("productModalTitle").textContent = "➕ Добавление товара";
  document.getElementById("productId").value = "";
  document.getElementById("prodName").value = "";
  document.getElementById("prodCategory").value = "Пицца";
  document.getElementById("prodPrice").value = "";
  document.getElementById("prodDesc").value = "";
  document.getElementById("prodImage").value = "🍕";
  document.getElementById("prodStopped").value = "false";
  document.getElementById("productModal").classList.add("active");
}

async function editProduct(id) {
  try {
    const p = await getProduct(id);
    if (!p) {
      alert("❌ Товар не найден");
      return;
    }

    document.getElementById("productModalTitle").textContent = "✏️ Редактирование";
    document.getElementById("productId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodCategory").value = p.category;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("prodDesc").value = p.description || "";
    document.getElementById("prodImage").value = p.image || "🍕";
    document.getElementById("prodStopped").value = p.is_stopped ? "true" : "false";
    document.getElementById("productModal").classList.add("active");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function saveProduct() {
  const id = document.getElementById("productId").value;
  const data = {
    name: document.getElementById("prodName").value.trim(),
    category: document.getElementById("prodCategory").value,
    price: parseInt(document.getElementById("prodPrice").value),
    description: document.getElementById("prodDesc").value.trim(),
    image: document.getElementById("prodImage").value.trim() || "🍕",
    is_stopped: document.getElementById("prodStopped").value === "true",
  };

  if (!data.name || !data.price || data.price <= 0) {
    alert("❌ Заполните название и корректную цену");
    return;
  }

  try {
    if (id) {
      await updateProduct(parseInt(id), data);
    } else {
      await createProduct(data);
    }
    document.getElementById("productModal").classList.remove("active");
    renderProductsManagement();
    alert("✅ Товар сохранён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function toggleProductStop(id) {
  try {
    const p = await getProduct(id);
    if (!p) {
      alert("❌ Товар не найден");
      return;
    }
    await updateProduct(id, { is_stopped: !p.is_stopped });
    renderProductsManagement();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function deleteProductItem(id) {
  if (!confirm("Удалить товар?")) return;
  try {
    await deleteProduct(id);
    renderProductsManagement();
    alert("✅ Товар удалён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  УПРАВЛЕНИЕ ПУНКТАМИ
// ============================================================

async function renderPointsManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const points = await getPickupPoints();

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">📍 Пункты выдачи</h1>
          <button class="btn btn--primary" onclick="showAddPoint()">➕ Добавить</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Адрес</th>
                <th>Телефон</th>
                <th>Часы работы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (points.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center; color:#999;">Нет пунктов</td></tr>`;
    } else {
      points.forEach((p) => {
        html += `
          <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.address}</td>
            <td>${p.phone || "—"}</td>
            <td>${p.work_hours || "—"}</td>
            <td>
              <button class="btn btn--warning btn--small" onclick="editPoint(${p.id})">✏️</button>
              <button class="btn btn--danger btn--small" onclick="deletePointItem(${p.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

function showAddPoint() {
  document.getElementById("pointModalTitle").textContent = "➕ Добавление пункта";
  document.getElementById("pointId").value = "";
  document.getElementById("pointName").value = "";
  document.getElementById("pointAddress").value = "";
  document.getElementById("pointPhone").value = "";
  document.getElementById("pointWorkHours").value = "10:00 - 22:00";
  document.getElementById("pointModal").classList.add("active");
}

async function editPoint(id) {
  try {
    const p = await getPickupPoint(id);
    if (!p) {
      alert("❌ Пункт не найден");
      return;
    }

    document.getElementById("pointModalTitle").textContent = "✏️ Редактирование";
    document.getElementById("pointId").value = p.id;
    document.getElementById("pointName").value = p.name;
    document.getElementById("pointAddress").value = p.address;
    document.getElementById("pointPhone").value = p.phone || "";
    document.getElementById("pointWorkHours").value = p.work_hours || "10:00 - 22:00";
    document.getElementById("pointModal").classList.add("active");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function savePoint() {
  const id = document.getElementById("pointId").value;
  const data = {
    name: document.getElementById("pointName").value.trim(),
    address: document.getElementById("pointAddress").value.trim(),
    phone: document.getElementById("pointPhone").value.trim(),
    work_hours: document.getElementById("pointWorkHours").value.trim(),
  };

  if (!data.name || !data.address) {
    alert("❌ Заполните название и адрес");
    return;
  }

  try {
    if (id) {
      await updatePickupPoint(parseInt(id), data);
    } else {
      await createPickupPoint(data);
    }
    document.getElementById("pointModal").classList.remove("active");
    renderPointsManagement();
    alert("✅ Пункт сохранён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function deletePointItem(id) {
  if (!confirm("Удалить пункт?")) return;
  try {
    await deletePickupPoint(id);
    renderPointsManagement();
    alert("✅ Пункт удалён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
// ============================================================

async function renderUsersManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const users = await getUsers();

    const roleLabels = {
      admin: "👑 Админ",
      kitchen: "👨‍🍳 Кухня",
      operator: "📋 Оператор",
      courier: "🛵 Курьер",
      client: "👤 Клиент",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">👥 Пользователи</h1>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>Телефон</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    users.forEach((u) => {
      html += `
        <tr>
          <td>${u.id}</td>
          <td>${u.name}</td>
          <td>${u.login}</td>
          <td>${roleLabels[u.role] || u.role}</td>
          <td>${u.phone || "—"}</td>
          <td>${u.is_blocked ? "🚫 Заблокирован" : "✅ Активен"}</td>
          <td>
            <button class="btn btn--secondary btn--small" onclick="toggleUserBlock(${u.id})">
              ${u.is_blocked ? "✅ Разблокировать" : "🚫 Блокировать"}
            </button>
            <button class="btn btn--danger btn--small" onclick="deleteUserItem(${u.id})">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

async function toggleUserBlock(id) {
  try {
    const user = await getUser(id);
    if (!user) {
      alert("❌ Пользователь не найден");
      return;
    }

    if (user.id === getCurrentUser().id) {
      alert("⛔ Нельзя заблокировать себя!");
      return;
    }

    await updateUser(id, { is_blocked: !user.is_blocked });
    renderUsersManagement();
    alert(`✅ Пользователь ${user.is_blocked ? "разблокирован" : "заблокирован"}`);
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function deleteUserItem(id) {
  const user = getCurrentUser();
  if (user && user.id === id) {
    alert("⛔ Нельзя удалить себя!");
    return;
  }
  if (!confirm("Удалить пользователя?")) return;
  try {
    await deleteUser(id);
    renderUsersManagement();
    alert("✅ Пользователь удалён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ (С ОТМЕНОЙ ЗАКАЗА)
// ============================================================

async function renderTicketsManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [tickets, users] = await Promise.all([getTickets(), getUsers()]);

    const statusLabels = {
      "Новое": "🟡 Новое",
      "В работе": "🟠 В работе",
      "Решено": "✅ Решено",
      "Возврат": "🔄 Возврат",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎫 Тикеты</h1>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Тип</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Тема</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (tickets.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center; color:#999;">Нет тикетов</td></tr>`;
    } else {
      tickets.forEach((t) => {
        const user = users.find((u) => u.id === t.client_id);
        const isCancelRequest = t.subject.includes("Запрос отмены");
        
        html += `
          <tr>
            <td>#${t.id}</td>
            <td>${isCancelRequest ? "🚨 Отмена" : "📩 Обращение"}</td>
            <td>${user ? user.name : "Неизвестно"}</td>
            <td>${user?.phone || "—"}</td>
            <td>${t.subject}</td>
            <td>${statusLabels[t.status] || t.status}</td>
            <td>
              <button class="btn btn--primary btn--small" onclick="adminViewTicket(${t.id})">👁️</button>
              ${
                isCancelRequest && t.status === "Новое"
                  ? `<button class="btn btn--danger btn--small" onclick="adminCancelOrderFromTicket(${t.id})">❌ Отменить заказ</button>`
                  : ""
              }
              ${
                !isCancelRequest && t.status === "Новое"
                  ? `<button class="btn btn--success btn--small" onclick="adminResolveTicket(${t.id})">✅ Решить</button>`
                  : ""
              }
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

async function adminViewTicket(id) {
  try {
    const t = await getTicket(id);
    if (!t) {
      alert("❌ Тикет не найден");
      return;
    }
    const user = await getUser(t.client_id);
    const order = t.order_id ? await getOrder(t.order_id) : null;

    alert(
      `📩 Тикет #${t.id}\n` +
        `Тип: ${t.subject.includes("Запрос отмены") ? "🚨 Запрос отмены" : "📩 Обращение"}\n` +
        `Клиент: ${user ? user.name : "Неизвестно"}\n` +
        `Телефон: ${user?.phone || "—"}\n` +
        `Тема: ${t.subject}\n\n` +
        `Описание:\n${t.description}\n\n` +
        `Статус: ${t.status}\n` +
        `Создан: ${new Date(t.created_at).toLocaleString("ru-RU")}` +
        (order ? `\n\nЗаказ: #${order.id} (${order.status})` : "")
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function adminCancelOrderFromTicket(ticketId) {
  if (!confirm("Отменить заказ и вернуть деньги клиенту?")) return;

  try {
    const ticket = await getTicket(ticketId);
    if (!ticket) {
      alert("❌ Тикет не найден");
      return;
    }

    const order = await getOrder(ticket.order_id);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    // Отменяем заказ
    await updateOrder(order.id, {
      status: "Отменен",
      cancel_reason: "Запрос курьера через тикет #" + ticketId,
      is_refunded: true,
      refund_amount: order.total,
    });

    // Обновляем тикет
    await updateTicket(ticketId, {
      status: "Решено",
      resolution: "Заказ отменён, деньги возвращены",
    });

    renderTicketsManagement();
    alert("✅ Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function adminResolveTicket(id) {
  const resolution = prompt(
    "Решение:\n1. Промокод\n2. Возврат\n3. Без компенсации"
  );
  if (!resolution) return;

  const compensationType =
    resolution === "1" ? "promocode" : resolution === "2" ? "refund" : "none";
  const amount =
    compensationType === "promocode"
      ? parseInt(prompt("Сумма промокода:"))
      : compensationType === "refund"
      ? parseInt(prompt("Сумма возврата:"))
      : 0;

  try {
    await updateTicket(id, {
      status: "Решено",
      compensation_type: compensationType,
      compensation_amount: amount || 0,
      resolution: resolution,
    });
    renderTicketsManagement();
    alert("✅ Тикет решён");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ПРОМОКОДЫ
// ============================================================

async function renderPromocodesManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [promocodes, users] = await Promise.all([
      getPromocodes(),
      getUsers(),
    ]);

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎁 Промокоды</h1>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Код</th>
                <th>Клиент</th>
                <th>Сумма</th>
                <th>Использован</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (promocodes.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center; color:#999;">Нет промокодов</td></tr>`;
    } else {
      promocodes.forEach((p) => {
        const user = users.find((u) => u.id === p.user_id);
        html += `
          <tr>
            <td>${p.id}</td>
            <td><strong>${p.code}</strong></td>
            <td>${user ? user.name : "Общий"}</td>
            <td>${p.amount} ₽</td>
            <td>${p.is_used ? "✅" : "❌"}</td>
            <td>${p.expires_at ? new Date(p.expires_at).toLocaleDateString("ru-RU") : "∞"}</td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.renderDashboard = renderDashboard;
window.renderAllOrders = renderAllOrders;
window.renderProductsManagement = renderProductsManagement;
window.renderPointsManagement = renderPointsManagement;
window.renderUsersManagement = renderUsersManagement;
window.renderTicketsManagement = renderTicketsManagement;
window.renderPromocodesManagement = renderPromocodesManagement;

window.adminViewOrder = adminViewOrder;
window.adminChangeStatus = adminChangeStatus;
window.adminCancelOrder = adminCancelOrder;
window.adminCancelOrderFromTicket = adminCancelOrderFromTicket;

window.showAddProduct = showAddProduct;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.toggleProductStop = toggleProductStop;
window.deleteProductItem = deleteProductItem;

window.showAddPoint = showAddPoint;
window.editPoint = editPoint;
window.savePoint = savePoint;
window.deletePointItem = deletePointItem;

window.toggleUserBlock = toggleUserBlock;
window.deleteUserItem = deleteUserItem;

window.adminViewTicket = adminViewTicket;
window.adminResolveTicket = adminResolveTicket;
