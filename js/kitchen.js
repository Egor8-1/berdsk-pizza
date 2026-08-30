// ============================================================
//  BERDSK_PIZZA — КУХНЯ
//  Полностью переписанный модуль
// ============================================================

let kitchenFilterStatus = "Все";
let kitchenTimerInterval = null;

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("kitchen")) return;

  const user = getCurrentUser();
  const kitchenUserEl = document.getElementById("kitchenUser");
  if (kitchenUserEl) kitchenUserEl.textContent = user.name || user.login;

  // Выход
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderKitchenMode();
  
  // Обновление каждые 30 секунд для таймеров
  kitchenTimerInterval = setInterval(() => {
    if (document.getElementById("kitchenContent")) {
      renderKitchenMode(kitchenFilterStatus);
    }
  }, 30000);
});

// Очистка таймера при уходе со страницы
window.addEventListener("beforeunload", function () {
  if (kitchenTimerInterval) {
    clearInterval(kitchenTimerInterval);
  }
});

// ============================================================
//  РЕЖИМ КУХНИ
// ============================================================

async function renderKitchenMode(filterStatus) {
  if (filterStatus !== undefined) kitchenFilterStatus = filterStatus;
  const container = document.getElementById("kitchenContent");
  if (!container) return;

  try {
    const orders = await getOrders();

    // Кухня видит только заказы на приготовление
    const kitchenStatuses = [
      "Новый",
      "Ожидает подтверждения",
      "Готовится",
      "Готов к выдаче",
    ];

    const kitchenOrders = orders.filter((o) =>
      kitchenStatuses.includes(o.status)
    );

    const statuses = [
      "Все",
      "Новый",
      "Ожидает подтверждения",
      "Готовится",
      "Готов к выдаче",
    ];

    let filtered = kitchenOrders;
    if (kitchenFilterStatus !== "Все") {
      filtered = kitchenOrders.filter((o) => o.status === kitchenFilterStatus);
    }

    // Сортировка по приоритету
    const priority = {
      "Ожидает подтверждения": 0,
      "Новый": 1,
      "Готовится": 2,
      "Готов к выдаче": 3,
    };
    filtered.sort(
      (a, b) => (priority[a.status] || 99) - (priority[b.status] || 99)
    );

    // Подсчёт для вкладок
    const counts = {};
    statuses.forEach((s) => {
      counts[s] =
        s === "Все"
          ? kitchenOrders.length
          : kitchenOrders.filter((o) => o.status === s).length;
    });

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">👨‍🍳 Режим кухни</h1>
        <p style="color:#888; margin-bottom:20px;">Управление приготовлением заказов</p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach((s) => {
      const active = s === kitchenFilterStatus ? "active" : "";
      html += `
        <button
          class="kitchen__tab ${active}"
          onclick="renderKitchenMode('${s}')"
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
        const isOverdue = checkIfOverdue(order);
        const timerInfo = getTimerInfo(order);

        // Состав заказа
        const itemsSummary = order.items
          .map((item) => `${item.quantity}×${item.productId}`)
          .join(", ");

        // Цвет рамки в зависимости от статуса
        const borderColor = isOverdue
          ? "#dc3545"
          : order.status === "Готовится"
          ? "#fff3e0"
          : order.status === "Готов к выдаче"
          ? "#c8e6c9"
          : "#eee";

        html += `
          <div style="background:#fff; border:2px solid ${borderColor}; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${getStatusColor(order.status)}; color:${getStatusTextColor(order.status)};">
                  ${order.status}
                </span>
                ${timerInfo ? `<span style="margin-left:8px; font-size:13px; color:${isOverdue ? "#dc3545" : "#888"}; font-weight:${isOverdue ? "700" : "400"};">${timerInfo}</span>` : ""}
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            
            <div style="color:#555; font-size:14px; margin:4px 0;">
              ${itemsSummary}
            </div>
            
            <div style="color:#888; font-size:13px;">
              📞 ${order.client_phone} | 👤 ${order.client_name}
              ${order.order_type === "delivery" ? " | 🛵 Доставка" : " | 🏪 Самовывоз"}
            </div>
            
            ${order.comment ? `<div style="color:#888; font-size:13px; margin-top:4px;">💬 ${order.comment}</div>` : ""}
            
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${
                order.status === "Новый" || order.status === "Ожидает подтверждения"
                  ? `<button class="btn btn--warning" onclick="kitchenStartCooking(${order.id})">👨‍🍳 Взять в работу</button>`
                  : ""
              }
              ${
                order.status === "Готовится"
                  ? `<button class="btn btn--success" onclick="kitchenMarkReady(${order.id})">✅ Приготовлено</button>`
                  : ""
              }
              ${
                order.status === "Готов к выдаче"
                  ? `<span style="padding:6px 16px; background:#c8e6c9; border-radius:20px; color:#1e7e34; font-weight:600;">✅ Готов к выдаче</span>`
                  : ""
              }
              <button class="btn btn--secondary btn--small" onclick="kitchenViewOrder(${order.id})">👁️</button>
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

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getStatusColor(status) {
  const colors = {
    "Новый": "#fff3cd",
    "Ожидает подтверждения": "#ffe0b2",
    "Готовится": "#fff3e0",
    "Готов к выдаче": "#c8e6c9",
  };
  return colors[status] || "#eee";
}

function getStatusTextColor(status) {
  const colors = {
    "Новый": "#856404",
    "Ожидает подтверждения": "#e65100",
    "Готовится": "#e65100",
    "Готов к выдаче": "#1e7e34",
  };
  return colors[status] || "#555";
}

function checkIfOverdue(order) {
  if (order.status !== "Готовится") return false;
  const created = new Date(order.created_at);
  const now = new Date();
  const diffMinutes = Math.floor((now - created) / 60000);
  return diffMinutes > 20;
}

function getTimerInfo(order) {
  if (order.status !== "Готовится") return "";
  
  const created = new Date(order.created_at);
  const now = new Date();
  const diffMinutes = Math.floor((now - created) / 60000);
  
  if (diffMinutes > 20) {
    return `⏱️ ${diffMinutes} мин (ПРОСРОЧЕНО!)`;
  } else {
    const remaining = 20 - diffMinutes;
    return `⏱️ ${diffMinutes} мин (осталось ${remaining} мин)`;
  }
}

// ============================================================
//  ДЕЙСТВИЯ
// ============================================================

async function kitchenStartCooking(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    if (order.status !== "Новый" && order.status !== "Ожидает подтверждения") {
      alert("❌ Заказ уже в работе");
      return;
    }

    if (order.status === "Ожидает подтверждения") {
      if (!confirm("⚠️ Заказ крупный. Взять в работу без подтверждения оператора?")) {
        return;
      }
    }

    await updateOrder(orderId, { status: "Готовится" });
    renderKitchenMode();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function kitchenMarkReady(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    if (order.status !== "Готовится") {
      alert("❌ Заказ не в процессе приготовления");
      return;
    }

    await updateOrder(orderId, { status: "Готов к выдаче" });
    renderKitchenMode();
    alert(`✅ Заказ #${orderId} готов к выдаче`);
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function kitchenViewOrder(orderId) {
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
        return `${product ? product.name : "Товар"} × ${item.quantity}`;
      })
      .join("\n");

    alert(
      `📦 Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Тип: ${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}\n` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}`
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.renderKitchenMode = renderKitchenMode;
window.kitchenStartCooking = kitchenStartCooking;
window.kitchenMarkReady = kitchenMarkReady;
window.kitchenViewOrder = kitchenViewOrder;
