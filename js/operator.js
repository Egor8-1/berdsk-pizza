// ============================================================
//  BERDSK_PIZZA — ОПЕРАТОР
//  Заказы, подтверждение, отмена, тикеты, промокоды
// ============================================================

let operatorFilterStatus = "Все";

// ===== ПРОВЕРКА ДОСТУПА =====
function checkOperatorAccess() {
  const user = getCurrentUser();
  if (!user || user.role !== "operator") {
    alert("⛔ Доступ запрещен. Требуются права оператора.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkOperatorAccess()) return;

  const user = getCurrentUser();
  const operatorUserEl = document.getElementById("operatorUser");
  if (operatorUserEl) operatorUserEl.textContent = user.name || user.login;

  document.querySelectorAll(".operator-sidebar__link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.dataset.page;
      document
        .querySelectorAll(".operator-sidebar__link")
        .forEach(function (l) {
          l.classList.remove("active");
        });
      this.classList.add("active");

      switch (page) {
        case "orders":
          renderOperatorOrders();
          break;
        case "tickets":
          renderOperatorTickets();
          break;
        case "promocodes":
          renderOperatorPromocodes();
          break;
        default:
          renderOperatorOrders();
      }
    });
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderOperatorOrders();
});

// ============================================================
//  ЗАКАЗЫ (ОПЕРАТОР)
// ============================================================

async function renderOperatorOrders(filterStatus) {
  if (filterStatus !== undefined) operatorFilterStatus = filterStatus;
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const orders = await getOrders();
    const points = await getPickupPoints();
    const users = await getUsers();

    const statuses = [
      "Все",
      "Новый",
      "Ожидает подтверждения",
      "Готовится",
      "Готов к выдаче",
      "В пути",
      "Доставлен",
      "Отменен",
    ];

    let filtered = orders;
    if (operatorFilterStatus !== "Все") {
      filtered = orders.filter(function (o) {
        return o.status === operatorFilterStatus;
      });
    }

    const counts = {};
    statuses.forEach(function (s) {
      if (s === "Все") counts[s] = orders.length;
      else
        counts[s] = orders.filter(function (o) {
          return o.status === s;
        }).length;
    });

    let html = `
      <div class="operator-orders">
        <h1 style="font-size:24px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">📋 Заказы</h1>
        <p style="color:#888; margin-bottom:20px;">Управление заказами, подтверждение и отмена</p>

        <div class="operator__tabs" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach(function (s) {
      const active = s === operatorFilterStatus ? "active" : "";
      const count = counts[s] || 0;
      html += `<button class="operator__tab ${active}" onclick="renderOperatorOrders('${s}')" style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">${s} <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${count}</span></button>`;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `<p style="color:#999; padding:20px 0;">Нет заказов с выбранным статусом</p>`;
    } else {
      for (const order of filtered) {
        const point = points.find(function (p) {
          return p.id === order.pickup_point_id;
        });
        const user = users.find(function (u) {
          return u.id === order.user_id;
        });

        const itemsHtml = order.items
          .map(function (item) {
            return item.productId + " × " + item.quantity;
          })
          .join(", ");

        const isLarge = order.items.some(function (item) {
          return item.quantity > 30;
        });

        html += `
          <div class="operator__order" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${order.status === "Новый" ? "#fff3cd" : order.status === "Ожидает подтверждения" ? "#ffe0b2" : "#eee"};">${order.status}</span>
                ${isLarge ? '<span style="margin-left:8px; background:#ffcc00; padding:2px 10px; border-radius:12px; font-size:12px;">⚠️ Крупный заказ</span>' : ""}
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            <div style="color:#555; font-size:14px; margin:4px 0;">${itemsHtml}</div>
            <div style="color:#888; font-size:13px;">📍 ${point ? point.name : "Неизвестный пункт"} | 📞 ${order.client_phone} | 👤 ${order.client_name}</div>
            ${order.comment ? '<div style="color:#888; font-size:13px;">💬 ' + order.comment + "</div>" : ""}
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${order.status === "Ожидает подтверждения" ? `<button class="btn btn--success btn--small" onclick="operatorConfirmOrder(${order.id})">✅ Подтвердить</button>` : ""}
              ${order.status === "Новый" || order.status === "Ожидает подтверждения" ? `<button class="btn btn--danger btn--small" onclick="operatorCancelOrder(${order.id})">❌ Отменить</button>` : ""}
              ${order.status === "Готов к выдаче" ? `<button class="btn btn--primary btn--small" onclick="operatorMarkDelivered(${order.id})">📦 Выдан</button>` : ""}
              <button class="btn btn--secondary btn--small" onclick="operatorViewOrder(${order.id})">👁️</button>
            </div>
          </div>
        `;
      }
    }

    html += `<div style="margin-top:16px;"><button class="btn btn--secondary" onclick="window.location.href='index.html'">← На главную</button></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

// ===== ПОДТВЕРДИТЬ ЗАКАЗ =====
async function operatorConfirmOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    order.status = "Готовится";
    await updateOrder(orderId, order);
    renderOperatorOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ОТМЕНИТЬ ЗАКАЗ =====
async function operatorCancelOrder(orderId) {
  const reason = prompt(
    "Причина отмены:\n1. Клиент отказался\n2. Нет ингредиентов\n3. Клиент не пришел\n4. Ошибка оператора\n5. Другое",
  );
  if (!reason) return;
  try {
    const order = await getOrder(orderId);
    order.status = "Отменен";
    order.cancel_reason = reason;
    await updateOrder(orderId, order);
    renderOperatorOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ВЫДАН =====
async function operatorMarkDelivered(orderId) {
  if (!confirm("Подтвердить выдачу заказа #" + orderId + "?")) return;
  try {
    const order = await getOrder(orderId);
    order.status = "Выдан";
    await updateOrder(orderId, order);
    renderOperatorOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ПРОСМОТР ЗАКАЗА =====
async function operatorViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    const point = (await getPickupPoints()).find(function (p) {
      return p.id === order.pickup_point_id;
    });
    alert(
      "📦 Заказ #" +
        order.id +
        "\nКлиент: " +
        order.client_name +
        "\nТелефон: " +
        order.client_phone +
        "\nСумма: " +
        order.total +
        " ₽\nСтатус: " +
        order.status +
        "\nПункт: " +
        (point ? point.name : "Неизвестно") +
        "\nКомментарий: " +
        (order.comment || "Нет"),
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ (ОПЕРАТОР)
// ============================================================

async function renderOperatorTickets() {
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const tickets = await getTickets();
    const users = await getUsers();

    let html = `
      <div class="operator-tickets">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎫 Обращения клиентов</h1>
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
          <td>
            <button class="btn btn--primary btn--small" onclick="operatorViewTicket(${t.id})">👁️</button>
            <button class="btn btn--success btn--small" onclick="operatorResolveTicket(${t.id})">✅ Решить</button>
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

async function operatorViewTicket(id) {
  try {
    const t = await getTicket(id);
    const user = await getUser(t.client_id);
    alert(
      "📩 Тикет #" +
        t.id +
        "\nКлиент: " +
        (user ? user.name : "Неизвестно") +
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

async function operatorResolveTicket(id) {
  const compensation = prompt(
    "Предложить компенсацию?\n1. Промокод\n2. Возврат\n3. Без компенсации",
  );
  if (!compensation) return;
  try {
    const t = await getTicket(id);
    t.status = "Решено";
    t.resolution = compensation;
    await updateTicket(id, t);
    renderOperatorTickets();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ПРОМОКОДЫ (ОПЕРАТОР)
// ============================================================

async function renderOperatorPromocodes() {
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const promocodes = await getPromocodes();
    const users = await getUsers();

    let html = `
      <div class="operator-promocodes">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">🎁 Промокоды</h1>
          <button class="btn btn--primary" onclick="operatorCreatePromocode()">➕ Создать</button>
        </div>
        <div class="admin-table-wrap"><table class="admin-table">
          <thead><tr><th>ID</th><th>Код</th><th>Клиент</th><th>Сумма</th><th>Использован</th><th>Действия</th></tr></thead>
          <tbody>
    `;

    for (const p of promocodes) {
      const user = users.find(function (u) {
        return u.id === p.user_id;
      });
      html += `
        <tr>
          <td>${p.id}</td>
          <td><strong>${p.code}</strong></td>
          <td>${user ? user.name : "Общий"}</td>
          <td>${p.amount} ₽</td>
          <td>${p.is_used ? "✅" : "❌"}</td>
          <td><button class="btn btn--danger btn--small" onclick="operatorDeletePromocode(${p.id})">🗑️</button></td>
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

async function operatorCreatePromocode() {
  const userId = prompt("ID клиента (оставьте пустым для общего промокода):");
  const amount = prompt("Сумма промокода (в рублях):");
  if (!amount) return;

  const code =
    "PIZZA-" +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    new Date().getFullYear();

  try {
    await createPromocode({
      code: code,
      user_id: userId ? parseInt(userId) : null,
      amount: parseInt(amount),
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: getCurrentUser().id,
    });
    renderOperatorPromocodes();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function operatorDeletePromocode(id) {
  if (!confirm("Удалить промокод?")) return;
  try {
    await deletePromocode(id);
    renderOperatorPromocodes();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.renderOperatorOrders = renderOperatorOrders;
window.renderOperatorTickets = renderOperatorTickets;
window.renderOperatorPromocodes = renderOperatorPromocodes;
window.operatorConfirmOrder = operatorConfirmOrder;
window.operatorCancelOrder = operatorCancelOrder;
window.operatorMarkDelivered = operatorMarkDelivered;
window.operatorViewOrder = operatorViewOrder;
window.operatorViewTicket = operatorViewTicket;
window.operatorResolveTicket = operatorResolveTicket;
window.operatorCreatePromocode = operatorCreatePromocode;
window.operatorDeletePromocode = operatorDeletePromocode;
