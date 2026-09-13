// ============================================================
//  BERDSK_PIZZA — КУРЬЕР
//  Версия 3.0 — система "взять заказ" как в такси
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

window.addEventListener("beforeunload", function () {
  if (courierTimerInterval) {
    clearInterval(courierTimerInterval);
  }
});

// ============================================================
//  ГЛАВНАЯ СТРАНИЦА КУРЬЕРА
// ============================================================

async function renderCourierOrders(filterStatus) {
  if (filterStatus !== undefined) courierFilterStatus = filterStatus;
  const container = document.getElementById("courierContent");
  if (!container) return;

  try {
    const user = getCurrentUser();
    const [freeOrders, myOrders, users] = await Promise.all([
      getFreeDeliveryOrders(),
      getCourierOrders(user.id),
      getUsers(),
    ]);

    // Мои активные заказы (В пути)
    const myActive = myOrders.filter((o) => o.status === "В пути");
    // Мои завершённые
    const myCompleted = myOrders.filter((o) => o.status === "Доставлен");

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Доставка</h1>
        <p style="color:#888; margin-bottom:24px;">Свободные заказы и ваши текущие доставки</p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:24px;">
          <button class="courier__tab ${courierFilterStatus === "Все" ? "active" : ""}" onclick="renderCourierOrders('Все')" style="padding:8px 20px; background:${courierFilterStatus === "Все" ? "#F37321" : "#f0f0f0"}; color:${courierFilterStatus === "Все" ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">
            Все <span style="background:${courierFilterStatus === "Все" ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${freeOrders.length + myActive.length + myCompleted.length}</span>
          </button>
          <button class="courier__tab ${courierFilterStatus === "Свободные" ? "active" : ""}" onclick="renderCourierOrders('Свободные')" style="padding:8px 20px; background:${courierFilterStatus === "Свободные" ? "#F37321" : "#f0f0f0"}; color:${courierFilterStatus === "Свободные" ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">
            Свободные <span style="background:${courierFilterStatus === "Свободные" ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${freeOrders.length}</span>
          </button>
          <button class="courier__tab ${courierFilterStatus === "Мои" ? "active" : ""}" onclick="renderCourierOrders('Мои')" style="padding:8px 20px; background:${courierFilterStatus === "Мои" ? "#F37321" : "#f0f0f0"}; color:${courierFilterStatus === "Мои" ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">
            Мои в пути <span style="background:${courierFilterStatus === "Мои" ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${myActive.length}</span>
          </button>
          <button class="courier__tab ${courierFilterStatus === "Завершённые" ? "active" : ""}" onclick="renderCourierOrders('Завершённые')" style="padding:8px 20px; background:${courierFilterStatus === "Завершённые" ? "#F37321" : "#f0f0f0"}; color:${courierFilterStatus === "Завершённые" ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">
            Завершённые <span style="background:${courierFilterStatus === "Завершённые" ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${myCompleted.length}</span>
          </button>
        </div>
    `;

    // Свободные заказы
    if (courierFilterStatus === "Все" || courierFilterStatus === "Свободные") {
      html += `
        <h2 style="font-size:18px; font-weight:700; margin-bottom:12px;">Свободные заказы (${freeOrders.length})</h2>
      `;

      if (freeOrders.length === 0) {
        html += `
          <div style="text-align:center; padding:30px 0; background:#f8f9fa; border-radius:12px; margin-bottom:24px;">
            <p style="color:#999;">Свободных заказов нет</p>
          </div>
        `;
      } else {
        freeOrders.forEach((order) => {
          html += renderOrderCard(order, "free", users);
        });
      }
    }

    // Мои в пути
    if (courierFilterStatus === "Все" || courierFilterStatus === "Мои") {
      html += `
        <h2 style="font-size:18px; font-weight:700; margin:24px 0 12px;">Мои активные доставки (${myActive.length})</h2>
      `;

      if (myActive.length === 0) {
        html += `
          <div style="text-align:center; padding:30px 0; background:#f8f9fa; border-radius:12px; margin-bottom:24px;">
            <p style="color:#999;">У вас нет активных доставок</p>
          </div>
        `;
      } else {
        myActive.forEach((order) => {
          html += renderOrderCard(order, "mine", users);
        });
      }
    }

    // Завершённые
    if (courierFilterStatus === "Все" || courierFilterStatus === "Завершённые") {
      html += `
        <h2 style="font-size:18px; font-weight:700; margin:24px 0 12px;">Завершённые доставки (${myCompleted.length})</h2>
      `;

      if (myCompleted.length === 0) {
        html += `
          <div style="text-align:center; padding:30px 0; background:#f8f9fa; border-radius:12px;">
            <p style="color:#999;">Нет завершённых доставок</p>
          </div>
        `;
      } else {
        myCompleted.slice(0, 20).forEach((order) => {
          html += renderOrderCard(order, "completed", users);
        });
      }
    }

    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  КАРТОЧКА ЗАКАЗА
// ============================================================

function renderOrderCard(order, mode, users) {
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

  const timeSince = getTimeSince(order.courier_taken_at || order.created_at);

  return `
    <div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <strong style="font-size:16px;">Заказ #${order.id}</strong>
          <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${statusColor}; color:${statusTextColor};">
            ${order.status}
          </span>
          ${mode === "mine" ? `<span style="margin-left:8px; color:#888; font-size:13px;">${timeSince}</span>` : ""}
        </div>
        <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
      </div>
      
      <div style="color:#555; font-size:14px; margin:6px 0;">
        ${itemsSummary}
      </div>
      
      <div style="background:#f8f9fa; padding:10px 14px; border-radius:8px; margin:8px 0;">
        <div style="color:#333; font-size:14px; font-weight:600;">
          ${order.delivery_address || "Адрес не указан"}
        </div>
        <div style="color:#888; font-size:13px; margin-top:4px;">
          ${order.client_phone} | ${order.client_name}
        </div>
      </div>
      
      ${order.comment ? `<div style="color:#888; font-size:13px;">Комментарий: ${order.comment}</div>` : ""}
      
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        ${
          mode === "free"
            ? `<button class="btn btn--primary" onclick="courierTakeOrder(${order.id})">Взять заказ</button>`
            : ""
        }
        ${
          mode === "mine"
            ? `<button class="btn btn--success" onclick="courierDelivered(${order.id})">Доставлено</button>
               <button class="btn btn--danger btn--small" onclick="courierRequestCancel(${order.id})">Запросить отмену</button>`
            : ""
        }
        <button class="btn btn--secondary btn--small" onclick="courierViewOrder(${order.id})">Подробнее</button>
        ${mode === "mine" ? `<button class="btn btn--outline btn--small" onclick="courierCallClient('${order.client_phone}')">Позвонить</button>` : ""}
      </div>
    </div>
  `;
}

function getTimeSince(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} ч ${diffMinutes % 60} мин назад`;
}

function courierCallClient(phone) {
  window.location.href = `tel:${phone}`;
}

// ============================================================
//  ДЕЙСТВИЯ КУРЬЕРА
// ============================================================

async function courierTakeOrder(orderId) {
  const user = getCurrentUser();
  if (!user) {
    alert("Необходимо авторизоваться");
    return;
  }

  if (!confirm(`Взять заказ #${orderId} в доставку?`)) return;

  try {
    await takeOrderByCourier(orderId, user.id);
    renderCourierOrders();
    alert("Заказ взят в доставку");
  } catch (error) {
    alert("Ошибка: " + error.message);
    renderCourierOrders();
  }
}

async function courierDelivered(orderId) {
  const user = getCurrentUser();
  if (!user) return;

  if (!confirm(`Подтвердить доставку заказа #${orderId}?`)) return;

  try {
    await completeDeliveryByCourier(orderId, user.id);
    renderCourierOrders();
    alert("Заказ доставлен");
  } catch (error) {
    alert("Ошибка: " + error.message);
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
      alert("Заказ не найден");
      return;
    }

    await createTicket({
      order_id: orderId,
      client_id: order.user_id,
      subject: `Запрос отмены заказа #${orderId}`,
      description: [
        `Заказ: #${orderId}`,
        `Клиент: ${order.client_name}`,
        `Телефон клиента: ${order.client_phone}`,
        `Адрес доставки: ${order.delivery_address || "Не указан"}`,
        `Сумма заказа: ${order.total} ₽`,
        ``,
        `Причина отмены: ${reason}`,
        ``,
        `Курьер запросил отмену. Свяжитесь с клиентом по телефону ${order.client_phone}.`,
      ].join("\n"),
      status: "Новое",
    });

    await createAuditLog({
      action: "REQUEST_CANCEL",
      entity_type: "order",
      entity_id: orderId,
      description: `Курьер запросил отмену заказа #${orderId}: ${reason}`,
    });

    alert(
      "Запрос на отмену отправлен администратору.\n" +
        "Администратор свяжется с клиентом и примет решение."
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function courierViewOrder(orderId) {
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
        return `${product ? product.name : "Товар"} × ${item.quantity}`;
      })
      .join("\n");

    alert(
      `Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Адрес: ${order.delivery_address || "Не указан"}\n` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n` +
        `Курьер: ${courier ? courier.name : "Не назначен"}\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}`
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
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
window.courierCallClient = courierCallClient;
