// ============================================================
//  BERDSK_PIZZA — КУРЬЕР
//  Полностью переписанный и исправленный модуль
// ============================================================

let courierFilterStatus = "Все";
let courierTimerInterval = null;

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("courier")) return;

  const user = getCurrentUser();
  const courierUserEl = document.getElementById("courierUser");
  if (courierUserEl) courierUserEl.textContent = user.name || user.login;

  // Выход
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderCourierOrders();

  // Автообновление каждые 30 секунд
  courierTimerInterval = setInterval(() => {
    if (document.getElementById("courierContent")) {
      renderCourierOrders(courierFilterStatus);
    }
  }, 30000);
});

// Очистка таймера
window.addEventListener("beforeunload", function () {
  if (courierTimerInterval) {
    clearInterval(courierTimerInterval);
  }
});

// ============================================================
//  ДОСТАВКА
// ============================================================

async function renderCourierOrders(filterStatus) {
  if (filterStatus !== undefined) courierFilterStatus = filterStatus;
  const container = document.getElementById("courierContent");
  if (!container) return;

  try {
    const orders = await getOrders();

    // Курьер видит ТОЛЬКО доставку
    const deliveryOrders = orders.filter((o) => o.order_type === "delivery");

    // Статусы для курьера
    const courierStatuses = ["Готов к выдаче", "В пути", "Доставлен"];
    const courierRelevant = deliveryOrders.filter((o) =>
      courierStatuses.includes(o.status)
    );

    const statuses = ["Все", "Готов к выдаче", "В пути", "Доставлен"];

    let filtered = courierRelevant;
    if (courierFilterStatus !== "Все") {
      filtered = courierRelevant.filter(
        (o) => o.status === courierFilterStatus
      );
    }

    // Сортировка
    const priority = {
      "Готов к выдаче": 0,
      "В пути": 1,
      "Доставлен": 2,
    };
    filtered.sort(
      (a, b) => (priority[a.status] || 99) - (priority[b.status] || 99)
    );

    // Подсчёт
    const counts = {};
    statuses.forEach((s) => {
      counts[s] =
        s === "Все"
          ? courierRelevant.length
          : courierRelevant.filter((o) => o.status === s).length;
    });

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">🛵 Доставка</h1>
        <p style="color:#888; margin-bottom:20px;">Управление доставкой заказов</p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach((s) => {
      const active = s === courierFilterStatus ? "active" : "";
      html += `
        <button
          class="courier__tab ${active}"
          onclick="renderCourierOrders('${s}')"
          style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;"
        >
          ${s}
          <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${counts[s] || 0}</span>
        </button>
      `;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `
        <div style="text-align:center; padding:40px 0;">
          <div style="font-size:64px; margin-bottom:12px;">🛵</div>
          <p style="color:#999;">Нет заказов на доставку</p>
        </div>
      `;
    } else {
      filtered.forEach((order) => {
        const itemsSummary = order.items
          .map((item) => `${item.quantity}×${item.productId}`)
          .join(", ");

        const statusColor =
          order.status === "Готов к выдаче"
            ? "#c8e6c9"
            : order.status === "В пути"
            ? "#bbdefb"
            : "#e0e0e0";

        const statusTextColor =
          order.status === "Готов к выдаче"
            ? "#1e7e34"
            : order.status === "В пути"
            ? "#0d47a1"
            : "#555";

        html += `
          <div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${statusColor}; color:${statusTextColor};">
                  ${order.status}
                </span>
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            
            <div style="color:#555; font-size:14px; margin:4px 0;">
              ${itemsSummary}
            </div>
            
            <div style="background:#f8f9fa; padding:10px 14px; border-radius:8px; margin:8px 0;">
              <div style="color:#333; font-size:14px; font-weight:600;">
                🏠 ${order.delivery_address || "Адрес не указан"}
              </div>
              <div style="color:#888; font-size:13px; margin-top:4px;">
                📞 ${order.client_phone} | 👤 ${order.client_name}
              </div>
            </div>
            
            ${order.comment ? `<div style="color:#888; font-size:13px;">💬 ${order.comment}</div>` : ""}
            
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${
                order.status === "Готов к выдаче"
                  ? `<button class="btn btn--primary" onclick="courierTakeOrder(${order.id})">📦 Взять заказ</button>`
                  : ""
              }
              ${
                order.status === "В пути"
                  ? `<button class="btn btn--success" onclick="courierDelivered(${order.id})">✅ Доставлен</button>`
                  : ""
              }
              ${
                order.status === "Готов к выдаче" || order.status === "В пути"
                  ? `<button class="btn btn--danger btn--small" onclick="courierRequestCancel(${order.id})">❌ Запросить отмену</button>`
                  : ""
              }
              <button class="btn btn--secondary btn--small" onclick="courierViewOrder(${order.id})">👁️</button>
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
//  ДЕЙСТВИЯ
// ============================================================

async function courierTakeOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    if (order.status !== "Готов к выдаче") {
      alert("❌ Заказ не готов к выдаче");
      return;
    }

    if (!confirm(`Взять заказ #${orderId} в доставку?`)) return;

    await updateOrder(orderId, { status: "В пути" });
    renderCourierOrders();
    alert("✅ Заказ взят в доставку");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function courierDelivered(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    if (order.status !== "В пути") {
      alert("❌ Заказ не в пути");
      return;
    }

    if (!confirm(`Подтвердить доставку заказа #${orderId}?`)) return;

    await updateOrder(orderId, { status: "Доставлен" });
    renderCourierOrders();
    alert("✅ Заказ доставлен");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function courierRequestCancel(orderId) {
  const reason = prompt(
    "Причина отмены:\n" +
      "1. Клиент не берёт трубку\n" +
      "2. Неверный адрес\n" +
      "3. Клиент передумал\n" +
      "4. Другое"
  );

  if (!reason) return;

  if (!confirm(`Отправить запрос на отмену заказа #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("❌ Заказ не найден");
      return;
    }

    // Создаём тикет для администратора с полной информацией
    await createTicket({
      order_id: orderId,
      client_id: order.user_id,
      subject: `🚨 Запрос отмены заказа #${orderId}`,
      description: [
        `Заказ: #${orderId}`,
        `Клиент: ${order.client_name}`,
        `Телефон клиента: ${order.client_phone}`,
        `Адрес доставки: ${order.delivery_address || "Не указан"}`,
        `Сумма заказа: ${order.total} ₽`,
        ``,
        `Причина отмены: ${reason}`,
        ``,
        `Комментарий курьера: Курьер запросил отмену заказа.`,
        `Пожалуйста, свяжитесь с клиентом по телефону ${order.client_phone} для уточнения.`,
      ].join("\n"),
      status: "Новое",
    });

    alert(
      "✅ Запрос на отмену отправлен администратору.\n" +
        "Администратор свяжется с клиентом и примет решение."
    );
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

async function courierViewOrder(orderId) {
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
      `🛵 Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Адрес: ${order.delivery_address || "Не указан"}\n` +
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

window.renderCourierOrders = renderCourierOrders;
window.courierTakeOrder = courierTakeOrder;
window.courierDelivered = courierDelivered;
window.courierRequestCancel = courierRequestCancel;
window.courierViewOrder = courierViewOrder;
