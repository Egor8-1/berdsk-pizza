// ============================================================
//  BERDSK_PIZZA — АДМИН-ПАНЕЛЬ
//  Версия 3.0 — аудит, отмена промо, обратная связь, поиск
// ============================================================

let adminFilterStatus = "Все";
let adminSearchQuery = "";

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("admin")) return;

  const user = getCurrentUser();
  const adminUserEl = document.getElementById("adminUser");
  if (adminUserEl) adminUserEl.textContent = user.name || user.login;

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
            alert("Модуль отчётов не загружен");
          }
          break;
        case "tickets":
          renderTicketsManagement();
          break;
        case "promocodes":
          renderPromocodesManagement();
          break;
        case "audit":
          renderAuditLog();
          break;
        default:
          renderDashboard();
      }
    });
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

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
    const [orders, products, users, tickets, pendingPromos] = await Promise.all([
      getOrders(),
      getProducts(),
      getUsers(),
      getTickets(),
      getPendingPromocodes(),
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
    const pendingPromosCount = pendingPromos.length;

    const recentOrders = orders.slice(0, 5);

    container.innerHTML = `
      <div class="dashboard">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Дашборд</h1>
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
          <div class="stat-card">
            <div class="stat-card__label">Промо на проверке</div>
            <div class="stat-card__value" style="color:#dc3545;">${pendingPromosCount}</div>
          </div>
        </div>

        <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #eee;">
          <h3 style="margin-bottom:12px;">Последние заказы</h3>
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
                      <td>${o.order_type === "delivery" ? "Доставка" : "Самовывоз"}</td>
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
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ВСЕ ЗАКАЗЫ (С ПОИСКОМ)
// ============================================================

async function renderAllOrders(searchQuery = "") {
  if (typeof searchQuery === "string") adminSearchQuery = searchQuery;
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [orders, points, couriers] = await Promise.all([
      getOrders(),
      getPickupPoints(),
      getUsers(),
    ]);

    let filtered = orders;
    if (adminSearchQuery) {
      filtered = orders.filter((o) =>
        String(o.id).includes(adminSearchQuery.trim())
      );
    }

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">Все заказы</h1>
          <button class="btn btn--outline btn--small" onclick="window.print()">Печать</button>
        </div>

        <div style="margin-bottom:20px; display:flex; gap:8px; flex-wrap:wrap;">
          <input 
            type="text" 
            id="adminOrderSearchInput" 
            placeholder="Поиск по номеру заказа..." 
            value="${adminSearchQuery}"
            style="flex:1; max-width:300px; padding:10px 14px; border:1.5px solid #ddd; border-radius:8px; font-size:14px;"
            onkeypress="if(event.key==='Enter') adminSearchOrders()"
          />
          <button class="btn btn--primary" onclick="adminSearchOrders()">Найти</button>
          ${adminSearchQuery ? `<button class="btn btn--secondary" onclick="renderAllOrders('')">Сбросить</button>` : ''}
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
                <th>Курьер</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (filtered.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center; color:#999;">${adminSearchQuery ? "Заказы не найдены" : "Нет заказов"}</td></tr>`;
    } else {
      filtered.forEach((order) => {
        const point = points.find((p) => p.id === order.pickup_point_id);
        const courier = couriers.find((u) => u.id === order.courier_id);
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
            <td>${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}</td>
            <td>${order.total} ₽</td>
            <td>${location}</td>
            <td>${courier ? courier.name : "—"}</td>
            <td>${order.status}${order.is_refunded ? ' (возврат)' : ''}</td>
            <td>
              <button class="btn btn--primary btn--small" onclick="adminViewOrder(${order.id})">Открыть</button>
              <button class="btn btn--warning btn--small" onclick="adminChangeStatus(${order.id})">Статус</button>
              ${
                order.status !== "Отменен" && order.status !== "Выдан" && order.status !== "Доставлен"
                  ? `<button class="btn btn--danger btn--small" onclick="adminCancelOrder(${order.id})">Отменить</button>`
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
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

function adminSearchOrders() {
  const query = document.getElementById("adminOrderSearchInput")?.value || "";
  renderAllOrders(query);
}

async function adminViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("Заказ не найден");
      return;
    }

    const products = await getProducts();
    const courier = order.courier_id ? await getUser(order.courier_id) : null;

    const itemsText = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return `${product ? product.name : "Товар"} × ${item.quantity} = ${
          item.price * item.quantity
        } ₽`;
      })
      .join("\n");

    alert(
      `Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Тип: ${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}\n` +
        `${order.order_type === "delivery" ? `Адрес: ${order.delivery_address}\n` : ""}` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n` +
        `Курьер: ${courier ? courier.name : "Не назначен"}\n` +
        `Возврат: ${order.is_refunded ? `Да (${order.refund_amount} ₽)` : "Нет"}\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}\n` +
        `Создан: ${new Date(order.created_at).toLocaleString("ru-RU")}`
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
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
    alert("Некорректный статус");
    return;
  }

  try {
    await updateOrder(orderId, { status: newStatus });
    await createAuditLog({
      action: "UPDATE_ORDER_STATUS",
      entity_type: "order",
      entity_id: orderId,
      description: `Заказ #${orderId}: ${currentStatus} → ${newStatus}`,
    });
    renderAllOrders();
    alert("Статус обновлён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function adminCancelOrder(orderId) {
  const reason = prompt("Причина отмены:");
  if (!reason) return;

  if (!confirm(`Отменить заказ #${orderId}? Средства будут возвращены клиенту.`)) return;

  try {
    const order = await getOrder(orderId);
    await updateOrder(orderId, {
      status: "Отменен",
      cancel_reason: reason,
      is_refunded: true,
      refund_amount: order.total,
    });

    await createAuditLog({
      action: "CANCEL_ORDER",
      entity_type: "order",
      entity_id: orderId,
      description: `Заказ #${orderId} отменён: ${reason}. Возврат ${order.total} ₽`,
    });

    renderAllOrders();
    alert("Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
          <h1 style="font-size:24px; font-weight:700;">Управление товарами</h1>
          <button class="btn btn--primary" onclick="showAddProduct()">Добавить товар</button>
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
            <td>${p.is_stopped ? "Да" : "Нет"}</td>
            <td>
              <button class="btn btn--warning btn--small" onclick="editProduct(${p.id})">Изменить</button>
              <button class="btn btn--secondary btn--small" onclick="toggleProductStop(${p.id})">${p.is_stopped ? "Вернуть" : "В стоп"}</button>
              <button class="btn btn--danger btn--small" onclick="deleteProductItem(${p.id})">Удалить</button>
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

function showAddProduct() {
  document.getElementById("productModalTitle").textContent = "Добавление товара";
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
      alert("Товар не найден");
      return;
    }

    document.getElementById("productModalTitle").textContent = "Редактирование";
    document.getElementById("productId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodCategory").value = p.category;
    document.getElementById("prodPrice").value = p.price;
    document.getElementById("prodDesc").value = p.description || "";
    document.getElementById("prodImage").value = p.image || "🍕";
    document.getElementById("prodStopped").value = p.is_stopped ? "true" : "false";
    document.getElementById("productModal").classList.add("active");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
    alert("Заполните название и корректную цену");
    return;
  }

  try {
    if (id) {
      await updateProduct(parseInt(id), data);
      await createAuditLog({
        action: "UPDATE_PRODUCT",
        entity_type: "product",
        entity_id: parseInt(id),
        description: `Изменён товар: ${data.name}`,
      });
    } else {
      const created = await createProduct(data);
      await createAuditLog({
        action: "CREATE_PRODUCT",
        entity_type: "product",
        entity_id: created.id,
        description: `Создан товар: ${data.name}`,
      });
    }
    document.getElementById("productModal").classList.remove("active");
    renderProductsManagement();
    alert("Товар сохранён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function toggleProductStop(id) {
  try {
    const p = await getProduct(id);
    if (!p) {
      alert("Товар не найден");
      return;
    }
    await updateProduct(id, { is_stopped: !p.is_stopped });
    await createAuditLog({
      action: "TOGGLE_PRODUCT_STOP",
      entity_type: "product",
      entity_id: id,
      description: `Товар "${p.name}" ${p.is_stopped ? "возвращён в продажу" : "отправлен в стоп"}`,
    });
    renderProductsManagement();
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function deleteProductItem(id) {
  if (!confirm("Удалить товар?")) return;
  try {
    const p = await getProduct(id);
    await deleteProduct(id);
    await createAuditLog({
      action: "DELETE_PRODUCT",
      entity_type: "product",
      entity_id: id,
      description: `Удалён товар: ${p ? p.name : id}`,
    });
    renderProductsManagement();
    alert("Товар удалён");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
          <h1 style="font-size:24px; font-weight:700;">Пункты выдачи</h1>
          <button class="btn btn--primary" onclick="showAddPoint()">Добавить пункт</button>
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
              <button class="btn btn--warning btn--small" onclick="editPoint(${p.id})">Изменить</button>
              <button class="btn btn--danger btn--small" onclick="deletePointItem(${p.id})">Удалить</button>
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

function showAddPoint() {
  document.getElementById("pointModalTitle").textContent = "Добавление пункта";
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
      alert("Пункт не найден");
      return;
    }

    document.getElementById("pointModalTitle").textContent = "Редактирование";
    document.getElementById("pointId").value = p.id;
    document.getElementById("pointName").value = p.name;
    document.getElementById("pointAddress").value = p.address;
    document.getElementById("pointPhone").value = p.phone || "";
    document.getElementById("pointWorkHours").value = p.work_hours || "10:00 - 22:00";
    document.getElementById("pointModal").classList.add("active");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
    alert("Заполните название и адрес");
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
    alert("Пункт сохранён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function deletePointItem(id) {
  if (!confirm("Удалить пункт?")) return;
  try {
    await deletePickupPoint(id);
    renderPointsManagement();
    alert("Пункт удалён");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
      admin: "Админ",
      kitchen: "Кухня",
      operator: "Оператор",
      courier: "Курьер",
      client: "Клиент",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Пользователи</h1>
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
          <td>${u.is_blocked ? "Заблокирован" : "Активен"}</td>
          <td>
            <button class="btn btn--secondary btn--small" onclick="toggleUserBlock(${u.id})">
              ${u.is_blocked ? "Разблокировать" : "Заблокировать"}
            </button>
            <button class="btn btn--danger btn--small" onclick="deleteUserItem(${u.id})">Удалить</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

async function toggleUserBlock(id) {
  try {
    const user = await getUser(id);
    if (!user) {
      alert("Пользователь не найден");
      return;
    }

    if (user.id === getCurrentUser().id) {
      alert("Нельзя заблокировать себя!");
      return;
    }

    await updateUser(id, { is_blocked: !user.is_blocked });

    await createAuditLog({
      action: user.is_blocked ? "UNBLOCK_USER" : "BLOCK_USER",
      entity_type: "user",
      entity_id: id,
      description: `Пользователь ${user.name} ${user.is_blocked ? "разблокирован" : "заблокирован"}`,
    });

    renderUsersManagement();
    alert(`Пользователь ${user.is_blocked ? "разблокирован" : "заблокирован"}`);
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function deleteUserItem(id) {
  const user = getCurrentUser();
  if (user && user.id === id) {
    alert("Нельзя удалить себя!");
    return;
  }
  if (!confirm("Удалить пользователя?")) return;
  try {
    const target = await getUser(id);
    await deleteUser(id);
    await createAuditLog({
      action: "DELETE_USER",
      entity_type: "user",
      entity_id: id,
      description: `Удалён пользователь: ${target ? target.name : id}`,
    });
    renderUsersManagement();
    alert("Пользователь удалён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ (ОБРАТНАЯ СВЯЗЬ + ОТМЕНА ИЗ ТИКЕТА)
// ============================================================

async function renderTicketsManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [tickets, users] = await Promise.all([getTickets(), getUsers()]);

    const statusLabels = {
      "Новое": "Новое",
      "В работе": "В работе",
      "Ожидает клиента": "Ожидает клиента",
      "Решено": "Решено",
      "Отклонено": "Отклонено",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Тикеты</h1>
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
            <td>${isCancelRequest ? "Запрос отмены" : "Обращение"}</td>
            <td>${user ? user.name : "Неизвестно"}</td>
            <td>${user?.phone || "—"}</td>
            <td>${t.subject}</td>
            <td>${statusLabels[t.status] || t.status}</td>
            <td>
              <button class="btn btn--primary btn--small" onclick="adminViewTicket(${t.id})">Открыть</button>
              ${
                isCancelRequest && t.status === "Новое"
                  ? `<button class="btn btn--danger btn--small" onclick="adminCancelOrderFromTicket(${t.id})">Отменить заказ</button>`
                  : ""
              }
              ${
                !isCancelRequest && (t.status === "Новое" || t.status === "В работе")
                  ? `<button class="btn btn--success btn--small" onclick="adminResolveTicketDialog(${t.id})">Решить</button>`
                  : ""
              }
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

async function adminViewTicket(id) {
  try {
    const t = await getTicket(id);
    if (!t) {
      alert("Тикет не найден");
      return;
    }
    const user = await getUser(t.client_id);
    const order = t.order_id ? await getOrder(t.order_id) : null;

    alert(
      `Тикет #${t.id}\n` +
        `Тип: ${t.subject.includes("Запрос отмены") ? "Запрос отмены" : "Обращение"}\n` +
        `Клиент: ${user ? user.name : "Неизвестно"}\n` +
        `Телефон: ${user?.phone || "—"}\n` +
        `Тема: ${t.subject}\n\n` +
        `Описание:\n${t.description}\n\n` +
        `Статус: ${t.status}\n` +
        `Создан: ${new Date(t.created_at).toLocaleString("ru-RU")}` +
        (order ? `\n\nЗаказ: #${order.id} (${order.status}) — ${order.total} ₽` : "") +
        (t.resolution ? `\n\nРешение: ${t.resolution}` : "")
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ===== ДИАЛОГ РЕШЕНИЯ ТИКЕТА =====
async function adminResolveTicketDialog(ticketId) {
  try {
    const t = await getTicket(ticketId);
    if (!t) {
      alert("Тикет не найден");
      return;
    }
    const user = await getUser(t.client_id);
    const order = t.order_id ? await getOrder(t.order_id) : null;

    const container = document.getElementById("adminContent");

    container.innerHTML = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Решение тикета #${ticketId}</h1>

        <div style="background:#fff; padding:20px; border-radius:12px; max-width:700px; border:1px solid #eee; margin-bottom:20px;">
          <h3 style="margin-bottom:12px;">Информация</h3>
          <div style="font-size:14px; line-height:1.8;">
            <div><strong>Клиент:</strong> ${user ? user.name : "Неизвестно"}</div>
            <div><strong>Телефон:</strong> ${user?.phone || "—"}</div>
            <div><strong>Тема:</strong> ${t.subject}</div>
            <div><strong>Описание:</strong> ${t.description}</div>
            ${order ? `<div><strong>Заказ:</strong> #${order.id} (${order.status}) — ${order.total} ₽</div>` : ""}
            <div><strong>Создан:</strong> ${new Date(t.created_at).toLocaleString("ru-RU")}</div>
          </div>
        </div>

        <div style="background:#fff; padding:20px; border-radius:12px; max-width:700px; border:1px solid #eee;">
          <h3 style="margin-bottom:12px;">Решение</h3>

          <div class="form-group">
            <label>Тип компенсации</label>
            <select id="resolutionType" onchange="toggleResolutionFields()">
              <option value="promocode">Промокод</option>
              <option value="refund">Возврат средств</option>
              <option value="rejection">Отказ (без компенсации)</option>
            </select>
          </div>

          <div class="form-group" id="promoAmountGroup">
            <label>Сумма промокода (₽)</label>
            <input type="number" id="promoAmount" value="200" min="1" />
          </div>

          <div class="form-group" id="refundAmountGroup" style="display:none;">
            <label>Сумма возврата (₽)</label>
            <input type="number" id="refundAmount" value="0" min="0" />
          </div>

          <div class="form-group">
            <label>Комментарий для клиента</label>
            <textarea id="resolutionComment" rows="3" placeholder="Например: Приносим извинения за доставленные неудобства..."></textarea>
          </div>

          <button class="btn btn--success btn--full" onclick="submitTicketResolution(${ticketId})">Применить решение</button>
          <button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderTicketsManagement()">Отмена</button>
        </div>
      </div>
    `;
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

function toggleResolutionFields() {
  const type = document.getElementById("resolutionType").value;
  const promoGroup = document.getElementById("promoAmountGroup");
  const refundGroup = document.getElementById("refundAmountGroup");

  if (type === "promocode") {
    promoGroup.style.display = "block";
    refundGroup.style.display = "none";
  } else if (type === "refund") {
    promoGroup.style.display = "none";
    refundGroup.style.display = "block";
  } else {
    promoGroup.style.display = "none";
    refundGroup.style.display = "none";
  }
}

async function submitTicketResolution(ticketId) {
  const type = document.getElementById("resolutionType").value;
  const comment = document.getElementById("resolutionComment").value.trim();

  try {
    const t = await getTicket(ticketId);
    if (!t) {
      alert("Тикет не найден");
      return;
    }

    if (type === "promocode") {
      const amount = parseInt(document.getElementById("promoAmount").value);
      if (!amount || amount <= 0) {
        alert("Введите корректную сумму промокода");
        return;
      }

      const code = "PIZZA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + new Date().getFullYear();
      const promo = await createPromocode({
        code: code,
        user_id: t.client_id,
        amount: amount,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: getCurrentUser().id,
      });

      await updateTicket(ticketId, {
        status: "Решено",
        resolution_type: "promocode",
        compensation_type: "promocode",
        compensation_amount: amount,
        promocode_id: promo.id,
        resolution: comment || `Выдан промокод ${code} на ${amount} ₽`,
      });

      await createAuditLog({
        action: "RESOLVE_TICKET_PROMO",
        entity_type: "ticket",
        entity_id: ticketId,
        description: `Тикет #${ticketId} решён: промокод ${code} на ${amount} ₽`,
      });

      alert(`Тикет решён. Промокод: ${code} на ${amount} ₽`);
    } else if (type === "refund") {
      const amount = parseInt(document.getElementById("refundAmount").value);
      if (!amount || amount <= 0) {
        alert("Введите корректную сумму возврата");
        return;
      }

      if (t.order_id) {
        const order = await getOrder(t.order_id);
        if (order) {
          await updateOrder(order.id, {
            is_refunded: true,
            refund_amount: amount,
          });
        }
      }

      await updateTicket(ticketId, {
        status: "Решено",
        resolution_type: "refund",
        compensation_type: "refund",
        compensation_amount: amount,
        resolution: comment || `Возврат ${amount} ₽ выполнен`,
      });

      await createAuditLog({
        action: "RESOLVE_TICKET_REFUND",
        entity_type: "ticket",
        entity_id: ticketId,
        description: `Тикет #${ticketId} решён: возврат ${amount} ₽`,
      });

      alert(`Тикет решён. Возврат ${amount} ₽ выполнен.`);
    } else {
      await updateTicket(ticketId, {
        status: "Отклонено",
        resolution_type: "rejection",
        compensation_type: "none",
        compensation_amount: 0,
        resolution: comment || "Отказ в компенсации",
      });

      await createAuditLog({
        action: "REJECT_TICKET",
        entity_type: "ticket",
        entity_id: ticketId,
        description: `Тикет #${ticketId} отклонён`,
      });

      alert("Тикет отклонён без компенсации.");
    }

    renderTicketsManagement();
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function adminCancelOrderFromTicket(ticketId) {
  if (!confirm("Отменить заказ и вернуть деньги клиенту?")) return;

  try {
    const ticket = await getTicket(ticketId);
    if (!ticket) {
      alert("Тикет не найден");
      return;
    }

    const order = await getOrder(ticket.order_id);
    if (!order) {
      alert("Заказ не найден");
      return;
    }

    await updateOrder(order.id, {
      status: "Отменен",
      cancel_reason: "Запрос курьера через тикет #" + ticketId,
      is_refunded: true,
      refund_amount: order.total,
    });

    await updateTicket(ticketId, {
      status: "Решено",
      resolution_type: "refund",
      resolution: "Заказ отменён, деньги возвращены клиенту",
    });

    await createAuditLog({
      action: "CANCEL_ORDER_FROM_TICKET",
      entity_type: "order",
      entity_id: order.id,
      description: `Заказ #${order.id} отменён по тикету #${ticketId}. Возврат ${order.total} ₽`,
    });

    renderTicketsManagement();
    alert("Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ============================================================
//  ПРОМОКОДЫ (С ОДОБРЕНИЕМ И ОТМЕНОЙ)
// ============================================================

async function renderPromocodesManagement() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const [promocodes, users] = await Promise.all([
      getPromocodes(),
      getUsers(),
    ]);

    const pending = promocodes.filter((p) => p.approval_status === "pending");
    const others = promocodes.filter((p) => p.approval_status !== "pending");

    const statusLabels = {
      approved: "Одобрен",
      pending: "На проверке",
      rejected: "Отклонён",
      cancelled: "Отменён",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Промокоды</h1>
    `;

    // Блок ожидающих одобрения
    if (pending.length > 0) {
      html += `
        <div style="background:#fff3cd; padding:20px; border-radius:12px; margin-bottom:24px; border:2px solid #ffc107;">
          <h3 style="margin-bottom:16px; color:#856404;">Требуют одобрения (${pending.length})</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Код</th>
                  <th>Клиент</th>
                  <th>Сумма</th>
                  <th>Создал</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                ${pending
                  .map((p) => {
                    const user = users.find((u) => u.id === p.user_id);
                    const creator = users.find((u) => u.id === p.created_by);
                    return `
                    <tr>
                      <td>${p.id}</td>
                      <td><strong>${p.code}</strong></td>
                      <td>${user ? user.name : "Общий"}</td>
                      <td style="color:#dc3545; font-weight:700;">${p.amount} ₽</td>
                      <td>${creator ? creator.name : "—"}</td>
                      <td>${new Date(p.created_at).toLocaleDateString("ru-RU")}</td>
                      <td>
                        <button class="btn btn--success btn--small" onclick="adminApprovePromo(${p.id})">Одобрить</button>
                        <button class="btn btn--danger btn--small" onclick="adminRejectPromo(${p.id})">Отклонить</button>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Остальные промокоды
    html += `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Код</th>
                <th>Клиент</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Использован</th>
                <th>Срок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (others.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center; color:#999;">Нет промокодов</td></tr>`;
    } else {
      others.forEach((p) => {
        const user = users.find((u) => u.id === p.user_id);
        html += `
          <tr>
            <td>${p.id}</td>
            <td><strong>${p.code}</strong></td>
            <td>${user ? user.name : "Общий"}</td>
            <td>${p.amount} ₽</td>
            <td>${statusLabels[p.approval_status] || p.approval_status}${p.is_cancelled ? " (отменён)" : ""}</td>
            <td>${p.is_used ? "Да" : "Нет"}</td>
            <td>${p.expires_at ? new Date(p.expires_at).toLocaleDateString("ru-RU") : "∞"}</td>
            <td>
              ${
                !p.is_cancelled && !p.is_used
                  ? `<button class="btn btn--danger btn--small" onclick="adminCancelPromo(${p.id})">Отменить</button>`
                  : ""
              }
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

async function adminApprovePromo(id) {
  if (!confirm("Одобрить промокод?")) return;
  try {
    await approvePromocode(id, getCurrentUser().id);
    renderPromocodesManagement();
    alert("Промокод одобрен");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function adminRejectPromo(id) {
  const reason = prompt("Причина отклонения:");
  if (!reason) return;
  try {
    await rejectPromocode(id, getCurrentUser().id, reason);
    renderPromocodesManagement();
    alert("Промокод отклонён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function adminCancelPromo(id) {
  const reason = prompt("Причина отмены промокода:");
  if (!reason) return;
  if (!confirm("Отменить промокод? Он больше не сможет быть использован.")) return;
  try {
    await cancelPromocode(id, getCurrentUser().id, reason);
    renderPromocodesManagement();
    alert("Промокод отменён");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ============================================================
//  АУДИТ (логи действий)
// ============================================================

async function renderAuditLog(filters = {}) {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const logs = await getAuditLog(filters);

    const actionLabels = {
      CREATE_ORDER: "Создание заказа",
      UPDATE_ORDER_STATUS: "Изменение статуса заказа",
      CANCEL_ORDER: "Отмена заказа",
      CANCEL_ORDER_FROM_TICKET: "Отмена из тикета",
      TAKE_ORDER: "Курьер взял заказ",
      DELIVER_ORDER: "Курьер доставил",
      CREATE_PRODUCT: "Создание товара",
      UPDATE_PRODUCT: "Изменение товара",
      DELETE_PRODUCT: "Удаление товара",
      TOGGLE_PRODUCT_STOP: "Стоп-лист",
      BLOCK_USER: "Блокировка пользователя",
      UNBLOCK_USER: "Разблокировка",
      DELETE_USER: "Удаление пользователя",
      CREATE_PROMOCODE: "Создание промокода",
      UPDATE_PROMOCODE: "Изменение промокода",
      APPROVE_PROMOCODE: "Одобрение промокода",
      REJECT_PROMOCODE: "Отклонение промокода",
      CANCEL_PROMOCODE: "Отмена промокода",
      RESOLVE_TICKET_PROMO: "Решение тикета (промокод)",
      RESOLVE_TICKET_REFUND: "Решение тикета (возврат)",
      REJECT_TICKET: "Отклонение тикета",
    };

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Журнал действий</h1>
        
        <div style="margin-bottom:20px; display:flex; gap:8px; flex-wrap:wrap;">
          <select id="auditFilterAction" style="padding:10px 14px; border:1.5px solid #ddd; border-radius:8px; font-size:14px;" onchange="applyAuditFilter()">
            <option value="">Все действия</option>
            ${Object.keys(actionLabels)
              .map(
                (k) =>
                  `<option value="${k}" ${filters.action === k ? "selected" : ""}>${actionLabels[k]}</option>`
              )
              .join("")}
          </select>
          <button class="btn btn--secondary" onclick="renderAuditLog({})">Сбросить</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (logs.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center; color:#999;">Нет записей</td></tr>`;
    } else {
      logs.forEach((log) => {
        html += `
          <tr>
            <td style="white-space:nowrap;">${new Date(log.created_at).toLocaleString("ru-RU")}</td>
            <td>${log.user_name || "—"}</td>
            <td>${log.user_role || "—"}</td>
            <td>${actionLabels[log.action] || log.action}</td>
            <td>${log.entity_type ? log.entity_type + " #" + (log.entity_id || "") : "—"}</td>
            <td style="font-size:13px;">${log.description || "—"}</td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

function applyAuditFilter() {
  const action = document.getElementById("auditFilterAction").value;
  renderAuditLog(action ? { action } : {});
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
window.renderAuditLog = renderAuditLog;

window.adminViewOrder = adminViewOrder;
window.adminChangeStatus = adminChangeStatus;
window.adminCancelOrder = adminCancelOrder;
window.adminCancelOrderFromTicket = adminCancelOrderFromTicket;
window.adminSearchOrders = adminSearchOrders;

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
window.adminResolveTicketDialog = adminResolveTicketDialog;
window.submitTicketResolution = submitTicketResolution;
window.toggleResolutionFields = toggleResolutionFields;

window.adminApprovePromo = adminApprovePromo;
window.adminRejectPromo = adminRejectPromo;
window.adminCancelPromo = adminCancelPromo;

window.applyAuditFilter = applyAuditFilter;
