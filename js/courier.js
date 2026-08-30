// ============================================================
//  BERDSK_PIZZA — КУРЬЕР
//  Доставка, статусы, адрес, телефон, запрос отмены
// ============================================================

let courierFilterStatus = "Все";

// ===== ПРОВЕРКА ДОСТУПА =====
function checkCourierAccess() {
  const user = getCurrentUser();
  if (!user || user.role !== "courier") {
    alert("⛔ Доступ запрещен. Требуются права курьера.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkCourierAccess()) return;

  const user = getCurrentUser();
  const courierUserEl = document.getElementById("courierUser");
  if (courierUserEl) courierUserEl.textContent = user.name || user.login;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderCourierOrders();
});

// ============================================================
//  ДОСТАВКА (КУРЬЕР)
// ============================================================

async function renderCourierOrders(filterStatus) {
  if (filterStatus !== undefined) courierFilterStatus = filterStatus;
  const container = document.getElementById("courierContent");
  if (!container) return;

  try {
    const orders = await getOrders();
    const points = await getPickupPoints();

    const statuses = [
      "Все",
      "Готов к выдаче",
      "В пути",
      "Доставлен",
      "Отменен",
    ];

    let filtered = orders;
    if (courierFilterStatus !== "Все") {
      filtered = orders.filter(function (o) {
        return o.status === courierFilterStatus;
      });
    }

    // Сортировка: сначала готовые к выдаче, потом в пути
    const priority = {
      "Готов к выдаче": 0,
      "В пути": 1,
      Доставлен: 2,
      Отменен: 3,
    };
    filtered.sort(function (a, b) {
      return priority[a.status] - priority[b.status];
    });

    const counts = {};
    statuses.forEach(function (s) {
      if (s === "Все") counts[s] = orders.length;
      else
        counts[s] = orders.filter(function (o) {
          return o.status === s;
        }).length;
    });

    let html = `
      <div class="courier-orders">
        <h1 style="font-size:24px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">🚚 Доставка</h1>
        <p style="color:#888; margin-bottom:20px;">Управление доставкой заказов</p>

        <div class="courier__tabs" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach(function (s) {
      const active = s === courierFilterStatus ? "active" : "";
      const count = counts[s] || 0;
      html += `<button class="courier__tab ${active}" onclick="renderCourierOrders('${s}')" style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">${s} <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${count}</span></button>`;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `<p style="color:#999; padding:20px 0;">Нет заказов с выбранным статусом</p>`;
    } else {
      for (const order of filtered) {
        const point = points.find(function (p) {
          return p.id === order.pickup_point_id;
        });

        const itemsHtml = order.items
          .map(function (item) {
            return item.productId + " × " + item.quantity;
          })
          .join(", ");

        html += `
          <div class="courier__order" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${order.status === "Готов к выдаче" ? "#c8e6c9" : order.status === "В пути" ? "#bbdefb" : "#eee"};">${order.status}</span>
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            <div style="color:#555; font-size:14px; margin:4px 0;">${itemsHtml}</div>
            <div style="color:#888; font-size:13px;">
              📍 ${point ? point.address : "Неизвестный адрес"} | 📞 ${order.client_phone} | 👤 ${order.client_name}
            </div>
            ${order.comment ? '<div style="color:#888; font-size:13px;">💬 ' + order.comment + "</div>" : ""}
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${order.status === "Готов к выдаче" ? `<button class="btn btn--primary btn--small" onclick="courierTakeOrder(${order.id})">📦 Взять заказ</button>` : ""}
              ${order.status === "В пути" ? `<button class="btn btn--success btn--small" onclick="courierDelivered(${order.id})">✅ Доставлен</button>` : ""}
              ${order.status === "Готов к выдаче" || order.status === "В пути" ? `<button class="btn btn--danger btn--small" onclick="courierRequestCancel(${order.id})">❌ Отменить</button>` : ""}
              <button class="btn btn--secondary btn--small" onclick="courierViewOrder(${order.id})">👁️</button>
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

// ===== ВЗЯТЬ ЗАКАЗ =====
async function courierTakeOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    order.status = "В пути";
    await updateOrder(orderId, order);
    renderCourierOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ДОСТАВЛЕН =====
async function courierDelivered(orderId) {
  if (!confirm("Подтвердить доставку заказа #" + orderId + "?")) return;
  try {
    const order = await getOrder(orderId);
    order.status = "Доставлен";
    await updateOrder(orderId, order);
    renderCourierOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ЗАПРОС ОТМЕНЫ (курьер → админ) =====
async function courierRequestCancel(orderId) {
  const reason = prompt(
    "Причина отмены:\n1. Клиент не берет трубку\n2. Неверный адрес\n3. Клиент передумал\n4. Другое",
  );
  if (!reason) return;

  try {
    const order = await getOrder(orderId);
    order.status = "Отменен";
    order.cancel_reason = "Запрос курьера: " + reason;
    await updateOrder(orderId, order);

    // Создаем тикет для админа
    await createTicket({
      order_id: orderId,
      client_id: order.user_id,
      subject: "Запрос отмены заказа #" + orderId,
      description: "Курьер запросил отмену. Причина: " + reason,
      status: "Новое",
    });

    alert("✅ Запрос на отмену отправлен администратору.");
    renderCourierOrders();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ПРОСМОТР ЗАКАЗА =====
async function courierViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    const point = (await getPickupPoints()).find(function (p) {
      return p.id === order.pickup_point_id;
    });
    alert(
      "🚚 Заказ #" +
        order.id +
        "\nКлиент: " +
        order.client_name +
        "\nТелефон: " +
        order.client_phone +
        "\nАдрес: " +
        (point ? point.address : "Неизвестно") +
        "\nСумма: " +
        order.total +
        " ₽\nСтатус: " +
        order.status +
        "\nКомментарий: " +
        (order.comment || "Нет"),
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
