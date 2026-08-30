// ============================================================
//  BERDSK_PIZZA — АДМИН-ПАНЕЛЬ
//  Дашборд, заказы, товары, пункты, пользователи
// ============================================================

let adminFilterStatus = "Все";

// ===== ПРОВЕРКА ДОСТУПА =====
function checkAdminAccess() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    alert("⛔ Доступ запрещен. Требуются права администратора.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAdminAccess()) return;

  const user = getCurrentUser();
  const adminUserEl = document.getElementById("adminUser");
  if (adminUserEl) adminUserEl.textContent = user.name || user.login;

  document.querySelectorAll(".admin-sidebar__link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.dataset.page;
      document.querySelectorAll(".admin-sidebar__link").forEach(function (l) {
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
          renderReports();
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

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderDashboard();
});

// ============================================================
//  DASHBOARD
// ============================================================

async function renderDashboard() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const orders = await getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(function (sum, o) {
      return sum + o.total;
    }, 0);
    const newOrders = orders.filter(function (o) {
      return o.status === "Новый";
    }).length;
    const waitingOrders = orders.filter(function (o) {
      return o.status === "Ожидает подтверждения";
    }).length;

    container.innerHTML = `
      <div class="dashboard">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📊 Дашборд</h1>
        <div class="dashboard__stats">
          <div class="stat-card"><div class="stat-card__label">Всего заказов</div><div class="stat-card__value">${totalOrders}</div></div>
          <div class="stat-card"><div class="stat-card__label">Выручка</div><div class="stat-card__value orange">${totalRevenue} ₽</div></div>
          <div class="stat-card"><div class="stat-card__label">Новых</div><div class="stat-card__value" style="color:#e65100;">${newOrders}</div></div>
          <div class="stat-card"><div class="stat-card__label">Ожидают подтверждения</div><div class="stat-card__value" style="color:#F37321;">${waitingOrders}</div></div>
        </div>
        <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #eee;">
          <h3 style="margin-bottom:12px;">📋 Последние заказы</h3>
          ${
            orders.length === 0
              ? '<p style="color:#999;">Нет заказов</p>'
              : `
            <div class="admin-table-wrap"><table class="admin-table">
              <thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th></tr></thead>
              <tbody>
                ${orders
                  .slice(0, 5)
                  .map(function (o) {
                    return (
                      "<tr><td>#" +
                      o.id +
                      "</td><td>" +
                      o.client_name +
                      "</td><td>" +
                      o.total +
                      " ₽</td><td>" +
                      o.status +
                      "</td></tr>"
                    );
                  })
                  .join("")}
              </tbody>
            </table></div>
          `
          }
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

// ============================================================
//  ВСЕ ЗАКАЗЫ (АДМИН)
// ============================================================

async function renderAllOrders() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const orders = await getOrders();
    const users = await getUsers();
    const points = await getPickupPoints();

    let html = `
      <div><div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <h1 style="font-size:24px; font-weight:700;">📋 Все заказы</h1>
        <button class="btn btn--outline btn--small" onclick="window.print()">🖨️ Печать</button>
      </div>
      <div class="admin-table-wrap"><table class="admin-table" id="ordersTable">
        <thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Пункт</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
    `;

    for (const order of orders) {
      const point = points.find(function (p) {
        return p.id === order.pickup_point_id;
      });
      html += `
        <tr>
          <td>#${order.id}</td>
          <td>${order.client_name}</td>
          <td>${order.total} ₽</td>
          <td>${point ? point.name.substring(0, 20) + "..." : "Неизвестно"}</td>
          <td>${order.status}</td>
          <td>
            <button class="btn btn--warning btn--small" onclick="changeOrderStatus(${order.id}, 'Готовится')">👨‍🍳 В работу</button>
            <button class="btn btn--danger btn--small" onclick="cancelOrder(${order.id})">🗑️ Отменить</button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const order = await getOrder(orderId);
    order.status = newStatus;
    await updateOrder(orderId, order);
    renderAllOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function cancelOrder(orderId) {
  if (!confirm("Отменить заказ #" + orderId + "?")) return;
  try {
    const order = await getOrder(orderId);
    order.status = "Отменен";
    await updateOrder(orderId, order);
    renderAllOrders();
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
      <div><div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <h1 style="font-size:24px; font-weight:700;">📦 Управление товарами</h1>
        <button class="btn btn--primary" onclick="showAddProduct()">➕ Добавить</button>
      </div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>#</th><th>Название</th><th>Категория</th><th>Цена</th><th>Стоп</th><th>Действия</th></tr></thead>
        <tbody>
    `;

    for (const p of products) {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.image || "🍕"} ${p.name}</td>
          <td>${p.category}</td>
          <td>${p.price} ₽</td>
          <td>${p.is_stopped ? "❌" : "✅"}</td>
          <td>
            <button class="btn btn--warning btn--small" onclick="editProduct(${p.id})">✏️</button>
            <button class="btn btn--danger btn--small" onclick="deleteProductItem(${p.id})">🗑️</button>
            <button class="btn btn--secondary btn--small" onclick="toggleStop(${p.id})">${p.is_stopped ? "В продажу" : "В стоп"}</button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

function showAddProduct() {
  document.getElementById("productModalTitle").textContent =
    "➕ Добавление товара";
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
    document.getElementById("productModalTitle").textContent =
      "✏️ Редактирование";
    document.getElementById("productId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodCategory").value = p.category;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("prodDesc").value = p.description || "";
    document.getElementById("prodImage").value = p.image || "🍕";
    document.getElementById("prodStopped").value = p.is_stopped
      ? "true"
      : "false";
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

  try {
    if (id) {
      await updateProduct(parseInt(id), data);
    } else {
      await createProduct(data);
    }
    document.getElementById("productModal").classList.remove("active");
    renderProductsManagement();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function toggleStop(id) {
  try {
    const p = await getProduct(id);
    p.is_stopped = !p.is_stopped;
    await updateProduct(id, p);
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
      <div><div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <h1 style="font-size:24px; font-weight:700;">📍 Пункты выдачи</h1>
        <button class="btn btn--primary" onclick="showAddPoint()">➕ Добавить</button>
      </div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>#</th><th>Название</th><th>Адрес</th><th>Телефон</th><th>Действия</th></tr></thead>
        <tbody>
    `;

    for (const p of points) {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${p.address}</td>
          <td>${p.phone || "-"}</td>
          <td>
            <button class="btn btn--warning btn--small" onclick="editPoint(${p.id})">✏️</button>
            <button class="btn btn--danger btn--small" onclick="deletePointItem(${p.id})">🗑️</button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

function showAddPoint() {
  document.getElementById("pointModalTitle").textContent =
    "➕ Добавление пункта";
  document.getElementById("pointId").value = "";
  document.getElementById("pointName").value = "";
  document.getElementById("pointAddress").value = "";
  document.getElementById("pointPhone").value = "";
  document.getElementById("pointModal").classList.add("active");
}

async function editPoint(id) {
  try {
    const p = await getPickupPoint(id);
    document.getElementById("pointModalTitle").textContent =
      "✏️ Редактирование";
    document.getElementById("pointId").value = p.id;
    document.getElementById("pointName").value = p.name;
    document.getElementById("pointAddress").value = p.address;
    document.getElementById("pointPhone").value = p.phone || "";
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
  };

  try {
    if (id) {
      await updatePickupPoint(parseInt(id), data);
    } else {
      await createPickupPoint(data);
    }
    document.getElementById("pointModal").classList.remove("active");
    renderPointsManagement();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function deletePointItem(id) {
  if (!confirm("Удалить пункт?")) return;
  try {
    await deletePickupPoint(id);
    renderPointsManagement();
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
    const html = `
      <div><h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">👥 Пользователи</h1>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>ID</th><th>Имя</th><th>Логин</th><th>Роль</th><th>Действия</th></tr></thead>
        <tbody>
          ${users
            .map(function (u) {
              return (
                "<tr><td>" +
                u.id +
                "</td><td>" +
                u.name +
                "</td><td>" +
                u.login +
                "</td><td>" +
                u.role +
                '</td><td><button class="btn btn--danger btn--small" onclick="deleteUserItem(' +
                u.id +
                ')">🗑️</button></td></tr>'
              );
            })
            .join("")}
        </tbody>
      </table></div></div>
    `;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
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
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ (АДМИН)
// ============================================================

async function renderTicketsManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const tickets = await getTickets();
    const users = await getUsers();

    let html = `
      <div><h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎫 Тикеты</h1>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>ID</th><th>Клиент</th><th>Тема</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
    `;

    for (const t of tickets) {
      const user = users.find(function (u) {
        return u.id === t.client_id;
      });
      html += `
        <tr>
          <td>#${t.id}</td>
          <td>${user ? user.name : "Неизвестно"}</td>
          <td>${t.subject}</td>
          <td>${t.status}</td>
          <td><button class="btn btn--primary btn--small" onclick="viewTicket(${t.id})">👁️</button></td>
        </tr>
      `;
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

async function viewTicket(id) {
  try {
    const t = await getTicket(id);
    alert(
      "📩 Тикет #" +
        t.id +
        "\nТема: " +
        t.subject +
        "\nОписание: " +
        t.description +
        "\nСтатус: " +
        t.status,
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ПРОМОКОДЫ (АДМИН)
// ============================================================

async function renderPromocodesManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const promocodes = await getPromocodes();
    const users = await getUsers();

    let html = `
      <div><h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎁 Промокоды</h1>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>ID</th><th>Код</th><th>Клиент</th><th>Сумма</th><th>Использован</th></tr></thead>
        <tbody>
    `;

    for (const p of promocodes) {
      const user = users.find(function (u) {
        return u.id === p.user_id;
      });
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.code}</td>
          <td>${user ? user.name : "Общий"}</td>
          <td>${p.amount} ₽</td>
          <td>${p.is_used ? "✅" : "❌"}</td>
        </tr>
      `;
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

// ============================================================
//  ЗАКРЫТИЕ МОДАЛОК
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  const closeProduct = document.getElementById("closeProductModal");
  if (closeProduct) {
    closeProduct.addEventListener("click", function () {
      document.getElementById("productModal").classList.remove("active");
    });
  }

  const closePoint = document.getElementById("closePointModal");
  if (closePoint) {
    closePoint.addEventListener("click", function () {
      document.getElementById("pointModal").classList.remove("active");
    });
  }

  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.remove("active");
    });
  });
});

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
window.showAddProduct = showAddProduct;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.toggleStop = toggleStop;
window.deleteProductItem = deleteProductItem;
window.showAddPoint = showAddPoint;
window.editPoint = editPoint;
window.savePoint = savePoint;
window.deletePointItem = deletePointItem;
window.deleteUserItem = deleteUserItem;
window.changeOrderStatus = changeOrderStatus;
window.cancelOrder = cancelOrder;
window.viewTicket = viewTicket;
