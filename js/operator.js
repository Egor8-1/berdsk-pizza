// ============================================================
//  BERDSK_PIZZA — ОПЕРАТОР
//  Полностью переписанный и исправленный модуль
// ============================================================

let operatorFilterStatus = "Все";

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("operator")) return;

  const user = getCurrentUser();
  const operatorUserEl = document.getElementById("operatorUser");
  if (operatorUserEl) operatorUserEl.textContent = user.name || user.login;

  // Навигация
  document.querySelectorAll(".operator-sidebar__link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.dataset.page;

      document.querySelectorAll(".operator-sidebar__link").forEach((l) => {
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

  // Выход
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderOperatorOrders();
});

// ============================================================
//  ЗАКАЗЫ
// ============================================================

async function renderOperatorOrders(filterStatus) {
  if (filterStatus !== undefined) operatorFilterStatus = filterStatus;
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const [orders, points] = await Promise.all([
      getOrders(),
      getPickupPoints(),
    ]);

    const statuses = [
      "Все",
      "Новый",
      "Ожидает подтверждения",
      "Готовится",
      "Готов к выдаче",
      "В пути",
      "Доставлен",
      "Выдан",
      "Отменен",
    ];

    let filtered = orders;
    if (operatorFilterStatus !== "Все") {
      filtered = orders.filter((o) => o.status === operatorFilterStatus);
    }

    // Сортировка по приоритету
    const priority = {
      "Ожидает подтверждения": 0,
      "Новый": 1,
      "Готовится": 2,
      "Готов к выдаче": 3,
      "В пути": 4,
      "Доставлен": 5,
      "Выдан": 6,
      "Отменен": 7,
    };
    filtered.sort(
      (a, b) => (priority[a.status] || 99) - (priority[b.status] || 99)
    );

    // Подсчёт
    const counts = {};
    statuses.forEach((s) => {
      counts[s] =
        s === "Все"
          ? orders.length
          : orders.filter((o) => o.status === s).length;
    });

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">📋 Заказы</h1>
        <p style="color:#888; margin-bottom:20px;">Подтверждение крупных заказов, отмена, выдача</p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach((s) => {
      const active = s === operatorFilterStatus ? "active" : "";
      html += `
        <button
          class="operator__tab ${active}"
          onclick="renderOperatorOrders('${s}')"
          style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;"
        >
          ${s}
          <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${counts[s] || 0}</span>
        </button>
      `;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `<p style="color:#999; padding:20px 0;">Нет заказов с выбранным статусом</p>`;
    } else {
      filtered.forEach((order) => {
        const point = points.find((p) => p.id === order.pickup_point_id);
        const totalQuantity = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const isLarge = totalQuantity > 30;

        const itemsSummary = order.items
          .map((item) => `${item.quantity}×${item.productId}`)
          .join(", ");

        const location =
          order.order_type === "delivery"
            ? `🛵 ${order.delivery_address}`
            : `📍 ${point ? point.name : "Пункт выдачи"}`;

        html += `
          <div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${order.status === "Ожидает подтверждения" ? "#ffe0b2" : "#eee"};">${order.status}</span>
                ${isLarge ? '<span style="margin-left:8px; background:#ffcc00; padding:2px 10px; border-radius:12px; font-size:12px;">⚠️ Крупный</span>' : ""}
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            <div style="color:#555; font-size:14px; margin:4px 0;">
              ${itemsSummary}
            </div>
            <div style="color:#888; font-size:13px;">
              ${location} | 📞 ${order.client_phone} | 👤 ${order.client_name}
            </div>
            ${order.comment ? `<div style="color:#888; font-size:13px;">💬 ${order.comment}</div>` : ""}
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${
                order.status === "Ожидает подтверждения"
                  ? `<button class="btn btn--success btn--small" onclick="operatorConfirmOrder(${order.id})">✅ Подтвердить</button>`
                  : ""
              }
              ${
                order.status === "Новый" || order.status === "Ожидает подтверждения"
                  ? `<button class="btn btn--danger btn--small" onclick="operatorCancelOrder(${order.id})">❌ Отменить</button>`
                  : ""
              }
              ${
                order.status === "Готов к выдаче" && order.order_type === "pickup"
                  ? `<button class="btn btn--primary btn--small" onclick="operatorMarkDelivered(${order.id})">📦 Выдан</button>`
                  : ""
              }
              <button class="btn btn--secondary btn--small" onclick="operatorViewOrder(${order.id})">👁️</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ===== ПОДТВЕРДИТЬ ЗАКАЗ =====
async function operatorConfirmOrder(orderId) {
  if (!confirm(`Подтвердить заказ #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }
    if (order.status !== "Ожидает подтверждения") {
      alert("❌ Заказ уже не требует подтверждения");
      return;
    }

    await updateOrder(orderId, { status: "Готовится" });
    renderOperatorOrders();
    alert("✅ Заказ подтверждён и отправлен на кухню");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ОТМЕНИТЬ ЗАКАЗ =====
async function operatorCancelOrder(orderId) {
  const reason = prompt(
    "Причина отмены:\n1. Клиент отказался\n2. Нет ингредиентов\n3. Ошибка оператора\n4. Другое"
  );
  if (!reason) return;

  if (!confirm(`Отменить заказ #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    await updateOrder(orderId, {
      status: "Отменен",
      cancel_reason: reason,
      is_refunded: true,
      refund_amount: order.total,
    });
    renderOperatorOrders();
    alert("✅ Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ВЫДАН (только для самовывоза) =====
async function operatorMarkDelivered(orderId) {
  if (!confirm(`Подтвердить выдачу заказа #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }
    if (order.order_type !== "pickup") {
      alert("❌ Этот заказ на доставку, его выдаёт курьер");
      return;
    }

    await updateOrder(orderId, { status: "Выдан" });
    renderOperatorOrders();
    alert("✅ Заказ выдан клиенту");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ПРОСМОТР ЗАКАЗА =====
async function operatorViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    const products = await getProducts();
    const points = await getPickupPoints();
    const point = points.find((p) => p.id === order.pickup_point_id);

    const itemsText = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return `${product ? product.name : "Товар"} × ${item.quantity} = ${
          item.price * item.quantity
        } ₽`;
      })
      .join("\n");

    const location =
      order.order_type === "delivery"
        ? `Адрес: ${order.delivery_address}`
        : `Пункт: ${point ? point.name : "Неизвестно"}`;

    alert(
      `📦 Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Тип: ${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}\n` +
        `${location}\n` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n` +
        `Возврат: ${order.is_refunded ? "✅ Да" : "❌ Нет"}\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}`
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ
// ============================================================

async function renderOperatorTickets() {
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const [tickets, users] = await Promise.all([getTickets(), getUsers()]);

    const statusLabels = {
      "Новое": "🟡 Новое",
      "В работе": "🟠 В работе",
      "Решено": "✅ Решено",
      "Возврат": "🔄 Возврат",
    };

    // Оператор видит только обычные обращения, не запросы отмены от курьеров
    const operatorTickets = tickets.filter(
      (t) => !t.subject.includes("Запрос отмены")
    );

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎫 Обращения клиентов</h1>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Тема</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (operatorTickets.length === 0) {
      html += `<tr><td colspan="6" style="text-align:center; color:#999;">Нет обращений</td></tr>`;
    } else {
      operatorTickets.forEach((t) => {
        const user = users.find((u) => u.id === t.client_id);
        html += `
          <tr>
            <td>#${t.id}</td>
            <td>${user ? user.name : "Неизвестно"}</td>
            <td>${user?.phone || "—"}</td>
            <td>${t.subject}</td>
            <td>${statusLabels[t.status] || t.status}</td>
            <td>
              <button class="btn btn--primary btn--small" onclick="operatorViewTicket(${t.id})">👁️</button>
              ${
                t.status === "Новое"
                  ? `<button class="btn btn--success btn--small" onclick="operatorResolveTicket(${t.id})">✅ Решить</button>`
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

async function operatorViewTicket(id) {
  try {
    const t = await getTicket(id);
    if (!t) {
      alert("❌ Обращение не найдено");
      return;
    }
    const user = await getUser(t.client_id);
    alert(
      `📩 Обращение #${t.id}\n` +
        `Клиент: ${user ? user.name : "Неизвестно"}\n` +
        `Телефон: ${user?.phone || "—"}\n` +
        `Тема: ${t.subject}\n\n` +
        `Описание:\n${t.description}\n\n` +
        `Статус: ${t.status}`
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function operatorResolveTicket(id) {
  const compensation = prompt(
    "Предложить компенсацию?\n1. Промокод\n2. Возврат\n3. Без компенсации"
  );
  if (!compensation) return;

  const compensationType =
    compensation === "1" ? "promocode" : compensation === "2" ? "refund" : "none";

  let amount = 0;
  if (compensationType === "promocode") {
    amount = parseInt(prompt("Сумма промокода:"));
    if (!amount || amount <= 0) {
      alert("❌ Введите корректную сумму");
      return;
    }
    
    // Создаём промокод
    const code =
      "PIZZA-" +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      "-" +
      new Date().getFullYear();
    
    const promo = await createPromocode({
      code: code,
      user_id: (await getTicket(id)).client_id,
      amount: amount,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: getCurrentUser().id,
    });
    
    await updateTicket(id, {
      status: "Решено",
      compensation_type: "promocode",
      compensation_amount: amount,
      promocode_id: promo.id,
      resolution: `Создан промокод ${code} на ${amount} ₽`,
    });
    
    alert(`✅ Обращение решено. Промокод ${code} на ${amount} ₽ создан.`);
  } else if (compensationType === "refund") {
    amount = parseInt(prompt("Сумма возврата:"));
    if (!amount || amount <= 0) {
      alert("❌ Введите корректную сумму");
      return;
    }
    
    const ticket = await getTicket(id);
    if (ticket.order_id) {
      const order = await getOrder(ticket.order_id);
      if (order) {
        await updateOrder(order.id, {
          is_refunded: true,
          refund_amount: amount,
        });
      }
    }
    
    await updateTicket(id, {
      status: "Решено",
      compensation_type: "refund",
      compensation_amount: amount,
      resolution: `Возврат ${amount} ₽`,
    });
    
    alert(`✅ Обращение решено. Возврат ${amount} ₽ выполнен.`);
  } else {
    await updateTicket(id, {
      status: "Решено",
      compensation_type: "none",
      compensation_amount: 0,
      resolution: "Без компенсации",
    });
    alert("✅ Обращение решено без компенсации.");
  }

  renderOperatorTickets();
}

// ============================================================
//  ПРОМОКОДЫ
// ============================================================

async function renderOperatorPromocodes() {
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const [promocodes, users] = await Promise.all([
      getPromocodes(),
      getUsers(),
    ]);

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">🎁 Промокоды</h1>
          <button class="btn btn--primary" onclick="operatorCreatePromocode()">➕ Создать</button>
        </div>
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
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (promocodes.length === 0) {
      html += `<tr><td colspan="7" style="text-align:center; color:#999;">Нет промокодов</td></tr>`;
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
            <td>
              <button class="btn btn--danger btn--small" onclick="operatorDeletePromocode(${p.id})">🗑️</button>
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

async function operatorCreatePromocode() {
  const userId = prompt("ID клиента (оставьте пустым для общего промокода):");
  const amount = prompt("Сумма промокода (в рублях):");
  if (!amount) return;

  const numAmount = parseInt(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    alert("❌ Введите корректную сумму");
    return;
  }

  const code =
    "PIZZA-" +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    new Date().getFullYear();

  try {
    await createPromocode({
      code: code,
      user_id: userId ? parseInt(userId) : null,
      amount: numAmount,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: getCurrentUser().id,
    });
    renderOperatorPromocodes();
    alert(`✅ Промокод создан: ${code}`);
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function operatorDeletePromocode(id) {
  if (!confirm("Удалить промокод?")) return;
  try {
    await deletePromocode(id);
    renderOperatorPromocodes();
    alert("✅ Промокод удалён");
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
