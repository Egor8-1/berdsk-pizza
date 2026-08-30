// ============================================================
//  BERDSK_PIZZA — КУХНЯ
//  Режим кухни, статусы, таймер приготовления
// ============================================================

let kitchenFilterStatus = "Все";

// ===== ПРОВЕРКА ДОСТУПА =====
function checkKitchenAccess() {
  const user = getCurrentUser();
  if (!user || user.role !== "kitchen") {
    alert("⛔ Доступ запрещен. Требуются права сотрудника кухни.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkKitchenAccess()) return;

  const user = getCurrentUser();
  const kitchenUserEl = document.getElementById("kitchenUser");
  if (kitchenUserEl) kitchenUserEl.textContent = user.name || user.login;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderKitchenMode();
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
    const products = await getProducts();

    const statuses = [
      "Все",
      "Новый",
      "Ожидает подтверждения",
      "Готовится",
      "Готов к выдаче",
    ];

    let filtered = orders;
    if (kitchenFilterStatus !== "Все") {
      filtered = orders.filter(function (o) {
        return o.status === kitchenFilterStatus;
      });
    }

    // Сортировка: сначала новые, потом готовятся, потом готовые
    const priority = {
      Новый: 0,
      "Ожидает подтверждения": 1,
      Готовится: 2,
      "Готов к выдаче": 3,
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
      <div class="kitchen-mode">
        <h1 style="font-size:24px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">👨‍🍳 Режим кухни</h1>
        <p style="color:#888; margin-bottom:20px;">Управление статусами заказов</p>

        <div class="kitchen__tabs" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach(function (s) {
      const active = s === kitchenFilterStatus ? "active" : "";
      const count = counts[s] || 0;
      html += `<button class="kitchen__tab ${active}" onclick="renderKitchenMode('${s}')" style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;">${s} <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${count}</span></button>`;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `<p style="color:#999; padding:20px 0;">Нет заказов с выбранным статусом</p>`;
    } else {
      for (const order of filtered) {
        const itemsHtml = order.items
          .map(function (item) {
            return item.productId + " × " + item.quantity;
          })
          .join(", ");

        // Таймер приготовления (если статус "Готовится")
        let timerHtml = "";
        let isOverdue = false;
        if (order.status === "Готовится") {
          const created = new Date(order.created_at);
          const now = new Date();
          const diffMinutes = Math.floor((now - created) / 60000);
          if (diffMinutes > 20) {
            isOverdue = true;
            timerHtml = `<span style="color:#dc3545; font-weight:700;">⏱️ ${diffMinutes} мин (ПРОСРОЧЕНО!)</span>`;
          } else {
            timerHtml = `<span style="color:#888;">⏱️ ${diffMinutes} мин</span>`;
          }
        }

        html += `
          <div class="kitchen__order" style="background:#fff; border:1px solid ${isOverdue ? "#dc3545" : "#eee"}; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${order.status === "Новый" ? "#fff3cd" : order.status === "Ожидает подтверждения" ? "#ffe0b2" : order.status === "Готовится" ? "#fff3e0" : "#c8e6c9"};">${order.status}</span>
                ${order.status === "Готовится" ? " " + timerHtml : ""}
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            <div style="color:#555; font-size:14px; margin:4px 0;">${itemsHtml}</div>
            <div style="color:#888; font-size:13px;">📞 ${order.client_phone} | 👤 ${order.client_name}</div>
            ${order.comment ? '<div style="color:#888; font-size:13px;">💬 ' + order.comment + "</div>" : ""}
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${order.status === "Новый" || order.status === "Ожидает подтверждения" ? `<button class="btn btn--warning btn--small" onclick="kitchenStartCooking(${order.id})">👨‍🍳 Взять в работу</button>` : ""}
              ${order.status === "Готовится" ? `<button class="btn btn--success btn--small" onclick="kitchenMarkReady(${order.id})">✅ Приготовлено</button>` : ""}
              ${order.status === "Готов к выдаче" ? `<span style="padding:6px 16px; background:#c8e6c9; border-radius:20px; color:#1e7e34; font-weight:600;">✅ Готов к выдаче</span>` : ""}
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

// ===== ВЗЯТЬ В РАБОТУ =====
async function kitchenStartCooking(orderId) {
  try {
    const order = await getOrder(orderId);
    order.status = "Готовится";
    await updateOrder(orderId, order);
    renderKitchenMode();
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ПРИГОТОВЛЕНО =====
async function kitchenMarkReady(orderId) {
  try {
    const order = await getOrder(orderId);
    order.status = "Готов к выдаче";
    await updateOrder(orderId, order);
    renderKitchenMode();
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
