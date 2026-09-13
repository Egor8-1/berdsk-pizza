// ============================================================
//  BERDSK_PIZZA — ОПЕРАТОР
//  Версия 3.0 — защита промо, обратная связь, диалог решения
// ============================================================

let operatorFilterStatus = "Все";
let operatorSearchQuery = "";

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAccess("operator")) return;

  const user = getCurrentUser();
  const operatorUserEl = document.getElementById("operatorUser");
  if (operatorUserEl) operatorUserEl.textContent = user.name || user.login;

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

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  renderOperatorOrders();
});

// ============================================================
//  ЗАКАЗЫ
// ============================================================

async function renderOperatorOrders(filterStatus, searchQuery = "") {
  if (filterStatus !== undefined) operatorFilterStatus = filterStatus;
  if (typeof searchQuery === "string") operatorSearchQuery = searchQuery;
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const [orders, points, users] = await Promise.all([
      getOrders(),
      getPickupPoints(),
      getUsers(),
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
      filtered = filtered.filter((o) => o.status === operatorFilterStatus);
    }
    if (operatorSearchQuery) {
      filtered = filtered.filter((o) =>
        String(o.id).includes(operatorSearchQuery.trim())
      );
    }

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

    const counts = {};
    statuses.forEach((s) => {
      counts[s] =
        s === "Все"
          ? orders.length
          : orders.filter((o) => o.status === s).length;
    });

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Заказы</h1>
        <p style="color:#888; margin-bottom:20px;">Подтверждение крупных заказов, отмена, выдача</p>

        <div style="margin-bottom:20px; display:flex; gap:8px; flex-wrap:wrap;">
          <input 
            type="text" 
            id="operatorOrderSearchInput" 
            placeholder="Поиск по номеру заказа..." 
            value="${operatorSearchQuery}"
            style="flex:1; max-width:300px; padding:10px 14px; border:1.5px solid #ddd; border-radius:8px; font-size:14px;"
            onkeypress="if(event.key==='Enter') operatorSearchOrders()"
          />
          <button class="btn btn--primary" onclick="operatorSearchOrders()">Найти</button>
          ${operatorSearchQuery ? `<button class="btn btn--secondary" onclick="renderOperatorOrders(operatorFilterStatus, '')">Сбросить</button>` : ''}
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    `;

    statuses.forEach((s) => {
      const active = s === operatorFilterStatus ? "active" : "";
      html += `
        <button
          class="operator__tab ${active}"
          onclick="renderOperatorOrders('${s}', '${operatorSearchQuery}')"
          style="padding:8px 20px; background:${active ? "#F37321" : "#f0f0f0"}; color:${active ? "#fff" : "#1a1a1a"}; border:none; border-radius:30px; cursor:pointer; font-weight:500;"
        >
          ${s}
          <span style="background:${active ? "rgba(255,255,255,0.2)" : "#ddd"}; padding:1px 10px; border-radius:20px; font-size:12px;">${counts[s] || 0}</span>
        </button>
      `;
    });

    html += `</div>`;

    if (filtered.length === 0) {
      html += `<p style="color:#999; padding:20px 0;">Заказы не найдены</p>`;
    } else {
      filtered.forEach((order) => {
        const point = points.find((p) => p.id === order.pickup_point_id);
        const courier = users.find((u) => u.id === order.courier_id);
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
            ? `Доставка: ${order.delivery_address}`
            : `Самовывоз: ${point ? point.name : "Пункт выдачи"}`;

        html += `
          <div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">Заказ #${order.id}</strong>
                <span style="margin-left:12px; padding:2px 12px; border-radius:20px; font-size:13px; background:${order.status === "Ожидает подтверждения" ? "#ffe0b2" : "#eee"};">${order.status}</span>
                ${isLarge ? '<span style="margin-left:8px; background:#ffcc00; padding:2px 10px; border-radius:12px; font-size:12px;">Крупный заказ</span>' : ""}
                ${order.is_refunded ? '<span style="margin-left:8px; background:#d4edda; padding:2px 10px; border-radius:12px; font-size:12px; color:#155724;">Возврат выполнен</span>' : ""}
              </div>
              <div style="font-weight:700; color:#F37321;">${order.total} ₽</div>
            </div>
            <div style="color:#555; font-size:14px; margin:4px 0;">
              ${itemsSummary}
            </div>
            <div style="color:#888; font-size:13px;">
              ${location} | ${order.client_phone} | ${order.client_name}
              ${courier ? ` | Курьер: ${courier.name}` : ""}
            </div>
            ${order.comment ? `<div style="color:#888; font-size:13px;">Комментарий: ${order.comment}</div>` : ""}
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              ${
                order.status === "Ожидает подтверждения"
                  ? `<button class="btn btn--success btn--small" onclick="operatorConfirmOrder(${order.id})">Подтвердить</button>`
                  : ""
              }
              ${
                order.status === "Новый" || order.status === "Ожидает подтверждения"
                  ? `<button class="btn btn--danger btn--small" onclick="operatorCancelOrder(${order.id})">Отменить</button>`
                  : ""
              }
              ${
                order.status === "Готов к выдаче" && order.order_type === "pickup"
                  ? `<button class="btn btn--primary btn--small" onclick="operatorMarkDelivered(${order.id})">Выдать клиенту</button>`
                  : ""
              }
              <button class="btn btn--secondary btn--small" onclick="operatorViewOrder(${order.id})">Открыть</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

function operatorSearchOrders() {
  const query = document.getElementById("operatorOrderSearchInput")?.value || "";
  renderOperatorOrders(operatorFilterStatus, query);
}

async function operatorConfirmOrder(orderId) {
  if (!confirm(`Подтвердить заказ #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("Заказ не найден");
      return;
    }
    if (order.status !== "Ожидает подтверждения") {
      alert("Заказ уже не требует подтверждения");
      return;
    }

    await updateOrder(orderId, { status: "Готовится" });

    await createAuditLog({
      action: "CONFIRM_ORDER",
      entity_type: "order",
      entity_id: orderId,
      description: `Заказ #${orderId} подтверждён оператором`,
    });

    renderOperatorOrders();
    alert("Заказ подтверждён и отправлен на кухню");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function operatorCancelOrder(orderId) {
  const reason = prompt(
    "Причина отмены:\n1. Клиент отказался\n2. Нет ингредиентов\n3. Ошибка оператора\n4. Другое"
  );
  if (!reason) return;

  if (!confirm(`Отменить заказ #${orderId}? Средства будут возвращены.`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("Заказ не найден");
      return;
    }

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

    renderOperatorOrders();
    alert("Заказ отменён. Деньги возвращены клиенту.");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function operatorMarkDelivered(orderId) {
  if (!confirm(`Подтвердить выдачу заказа #${orderId}?`)) return;

  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("Заказ не найден");
      return;
    }
    if (order.order_type !== "pickup") {
      alert("Этот заказ на доставку, его выдаёт курьер");
      return;
    }

    await updateOrder(orderId, { status: "Выдан" });

    await createAuditLog({
      action: "MARK_DELIVERED",
      entity_type: "order",
      entity_id: orderId,
      description: `Заказ #${orderId} выдан клиенту`,
    });

    renderOperatorOrders();
    alert("Заказ выдан клиенту");
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

async function operatorViewOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert("Заказ не найден");
      return;
    }

    const products = await getProducts();
    const points = await getPickupPoints();
    const point = points.find((p) => p.id === order.pickup_point_id);
    const courier = order.courier_id ? await getUser(order.courier_id) : null;

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
      `Заказ #${order.id}\n` +
        `Клиент: ${order.client_name}\n` +
        `Телефон: ${order.client_phone}\n` +
        `Тип: ${order.order_type === "delivery" ? "Доставка" : "Самовывоз"}\n` +
        `${location}\n` +
        `Статус: ${order.status}\n` +
        `Сумма: ${order.total} ₽\n` +
        `Курьер: ${courier ? courier.name : "Не назначен"}\n` +
        `Возврат: ${order.is_refunded ? `Да (${order.refund_amount} ₽)` : "Нет"}\n\n` +
        `Состав:\n${itemsText}\n\n` +
        `Комментарий: ${order.comment || "Нет"}`
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ============================================================
//  ТИКЕТЫ (с обратной связью через диалог)
// ============================================================

async function renderOperatorTickets() {
  const container = document.getElementById("operatorContent");
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

    // Оператор видит только обычные обращения, не запросы отмены от курьеров
    const operatorTickets = tickets.filter(
      (t) => !t.subject.includes("Запрос отмены")
    );

    let html = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Обращения клиентов</h1>
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
              <button class="btn btn--primary btn--small" onclick="operatorViewTicket(${t.id})">Открыть</button>
              ${
                t.status === "Новое" || t.status === "В работе"
                  ? `<button class="btn btn--success btn--small" onclick="operatorResolveTicketDialog(${t.id})">Решить</button>`
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

async function operatorViewTicket(id) {
  try {
    const t = await getTicket(id);
    if (!t) {
      alert("Обращение не найдено");
      return;
    }
    const user = await getUser(t.client_id);
    const order = t.order_id ? await getOrder(t.order_id) : null;

    alert(
      `Обращение #${t.id}\n` +
        `Клиент: ${user ? user.name : "Неизвестно"}\n` +
        `Телефон: ${user?.phone || "—"}\n` +
        `Тема: ${t.subject}\n\n` +
        `Описание:\n${t.description}\n\n` +
        `Статус: ${t.status}` +
        (order ? `\n\nЗаказ: #${order.id} (${order.status}) — ${order.total} ₽` : "") +
        (t.resolution ? `\n\nРешение: ${t.resolution}` : "")
    );
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ===== ДИАЛОГ РЕШЕНИЯ ТИКЕТА (ОБРАТНАЯ СВЯЗЬ) =====
async function operatorResolveTicketDialog(ticketId) {
  try {
    const t = await getTicket(ticketId);
    if (!t) {
      alert("Тикет не найден");
      return;
    }
    const user = await getUser(t.client_id);
    const order = t.order_id ? await getOrder(t.order_id) : null;

    const container = document.getElementById("operatorContent");

    container.innerHTML = `
      <div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Решение обращения #${ticketId}</h1>

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
            <small style="color:#888; font-size:12px;">Если сумма ≥ 1000 ₽ — уйдёт на одобрение админу</small>
          </div>

          <div class="form-group" id="refundAmountGroup" style="display:none;">
            <label>Сумма возврата (₽)</label>
            <input type="number" id="refundAmount" value="0" min="0" />
          </div>

          <div class="form-group">
            <label>Комментарий для клиента</label>
            <textarea id="resolutionComment" rows="3" placeholder="Например: Приносим извинения за доставленные неудобства..."></textarea>
          </div>

          <button class="btn btn--success btn--full" onclick="submitOperatorResolution(${ticketId})">Применить решение</button>
          <button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderOperatorTickets()">Отмена</button>
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

async function submitOperatorResolution(ticketId) {
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
      
      // Создаём промокод — если сумма ≥ 1000 и создатель не админ, уйдёт на одобрение
      const promo = await createPromocode({
        code: code,
        user_id: t.client_id,
        amount: amount,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: getCurrentUser().id,
      });

      const needsApproval = promo.approval_status === "pending";

      await updateTicket(ticketId, {
        status: needsApproval ? "В работе" : "Решено",
        resolution_type: "promocode",
        compensation_type: "promocode",
        compensation_amount: amount,
        promocode_id: promo.id,
        resolution: comment || (needsApproval 
          ? `Создан промокод ${code} на ${amount} ₽ (ожидает одобрения админа)`
          : `Выдан промокод ${code} на ${amount} ₽`),
      });

      await createAuditLog({
        action: "RESOLVE_TICKET_PROMO",
        entity_type: "ticket",
        entity_id: ticketId,
        description: `Тикет #${ticketId} решён оператором: промокод ${code} на ${amount} ₽${needsApproval ? " (ожидает одобрения)" : ""}`,
      });

      if (needsApproval) {
        alert(`Промокод ${code} на ${amount} ₽ создан.\nСумма ≥ 1000 ₽ — требуется одобрение администратора.`);
      } else {
        alert(`Тикет решён. Промокод: ${code} на ${amount} ₽`);
      }
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
        description: `Тикет #${ticketId} отклонён оператором`,
      });

      alert("Тикет отклонён без компенсации.");
    }

    renderOperatorTickets();
  } catch (error) {
    alert("Ошибка: " + error.message);
  }
}

// ============================================================
//  ПРОМОКОДЫ (защита — только до 1000 ₽ без одобрения)
// ============================================================

async function renderOperatorPromocodes() {
  const container = document.getElementById("operatorContent");
  if (!container) return;

  try {
    const [promocodes, users] = await Promise.all([
      getPromocodes(),
      getUsers(),
    ]);

    const statusLabels = {
      approved: "Одобрен",
      pending: "На проверке",
      rejected: "Отклонён",
      cancelled: "Отменён",
    };

    let html = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="font-size:24px; font-weight:700;">Промокоды</h1>
          <button class="btn btn--primary" onclick="operatorCreatePromocode()">Создать промокод</button>
        </div>

        <div style="background:#e7f3ff; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:14px; color:#0066cc;">
          Внимание: промокоды на сумму 1000 ₽ и выше требуют одобрения администратора.
        </div>

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

    if (promocodes.length === 0) {
      html += `<tr><td colspan="8" style="text-align:center; color:#999;">Нет промокодов</td></tr>`;
    } else {
      promocodes.forEach((p) => {
        const user = users.find((u) => u.id === p.user_id);
        const canCancel = !p.is_cancelled && !p.is_used && p.approval_status === "approved";
        
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
              ${canCancel ? `<span style="color:#888; font-size:12px;">Только админ может отменить</span>` : ""}
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

async function operatorCreatePromocode() {
  const userId = prompt("ID клиента (оставьте пустым для общего промокода):");
  const amount = prompt("Сумма промокода (в рублях):");
  if (!amount) return;

  const numAmount = parseInt(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    alert("Введите корректную сумму");
    return;
  }

  const code = "PIZZA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + new Date().getFullYear();

  try {
    const created = await createPromocode({
      code: code,
      user_id: userId ? parseInt(userId) : null,
      amount: numAmount,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: getCurrentUser().id,
    });

    await createAuditLog({
      action: "CREATE_PROMOCODE",
      entity_type: "promocode",
      entity_id: created.id,
      description: `Создан промокод ${code} на ${numAmount} ₽${created.approval_status === "pending" ? " (ожидает одобрения)" : ""}`,
    });

    renderOperatorPromocodes();

    if (created.approval_status === "pending") {
      alert(`Промокод ${code} создан.\nСумма ≥ 1000 ₽ — требуется одобрение администратора.`);
    } else {
      alert(`Промокод создан: ${code}`);
    }
  } catch (error) {
    alert("Ошибка: " + error.message);
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
window.operatorResolveTicketDialog = operatorResolveTicketDialog;
window.submitOperatorResolution = submitOperatorResolution;
window.toggleResolutionFields = toggleResolutionFields;
window.operatorCreatePromocode = operatorCreatePromocode;
window.operatorSearchOrders = operatorSearchOrders;
