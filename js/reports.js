// ============================================================
//  BERDSK_PIZZA — ОТЧЁТЫ
//  Версия 3.0 — с датами, фильтрами и PDF
// ============================================================

// ============================================================
//  ГЛАВНАЯ СТРАНИЦА ОТЧЁТОВ
// ============================================================

async function renderReports() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">Отчёты</h1>
      
      <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #eee; margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">Фильтр по датам</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
          <div class="form-group" style="margin:0; flex:1; min-width:180px;">
            <label>С даты</label>
            <input type="date" id="reportDateFrom" />
          </div>
          <div class="form-group" style="margin:0; flex:1; min-width:180px;">
            <label>По дату</label>
            <input type="date" id="reportDateTo" />
          </div>
          <button class="btn btn--primary" onclick="applyReportDateFilter()">Применить</button>
          <button class="btn btn--secondary" onclick="resetReportDateFilter()">Сбросить</button>
        </div>
        <div id="reportPeriodInfo" style="margin-top:12px; font-size:13px; color:#666;"></div>
      </div>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('financial')">
          <h3 style="margin-bottom:4px;">Финансовый отчёт</h3>
          <p style="font-size:13px; color:#888;">Выручка, средний чек, по дням</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('statuses')">
          <h3 style="margin-bottom:4px;">По статусам</h3>
          <p style="font-size:13px; color:#888;">Количество заказов по статусам</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('points')">
          <h3 style="margin-bottom:4px;">По пунктам выдачи</h3>
          <p style="font-size:13px; color:#888;">Загрузка пунктов выдачи</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('products')">
          <h3 style="margin-bottom:4px;">Топ-10 товаров</h3>
          <p style="font-size:13px; color:#888;">Самые популярные товары</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('periods')">
          <h3 style="margin-bottom:4px;">По периодам</h3>
          <p style="font-size:13px; color:#888;">День / неделя / месяц</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('bonuses')">
          <h3 style="margin-bottom:4px;">Бонусы</h3>
          <p style="font-size:13px; color:#888;">Начислено / списано / сгорело</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('returns')">
          <h3 style="margin-bottom:4px;">Возвраты</h3>
          <p style="font-size:13px; color:#888;">Отменённые и возвращённые заказы</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('delivery')">
          <h3 style="margin-bottom:4px;">Доставка и самовывоз</h3>
          <p style="font-size:13px; color:#888;">Сравнение типов заказов</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('couriers')">
          <h3 style="margin-bottom:4px;">Курьеры</h3>
          <p style="font-size:13px; color:#888;">Эффективность доставки</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
//  ФИЛЬТР ПО ДАТАМ
// ============================================================

function getReportDateRange() {
  const from = document.getElementById("reportDateFrom")?.value;
  const to = document.getElementById("reportDateTo")?.value;
  return { from, to };
}

function applyReportDateFilter() {
  const { from, to } = getReportDateRange();
  const info = document.getElementById("reportPeriodInfo");
  if (info) {
    if (from || to) {
      info.textContent = `Период: ${from ? new Date(from).toLocaleDateString("ru-RU") : "начало"} — ${to ? new Date(to).toLocaleDateString("ru-RU") : "сегодня"}`;
    } else {
      info.textContent = "Период: всё время";
    }
  }
  alert("Фильтр применён. Откройте отчёт заново для пересчёта.");
}

function resetReportDateFilter() {
  const fromEl = document.getElementById("reportDateFrom");
  const toEl = document.getElementById("reportDateTo");
  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  const info = document.getElementById("reportPeriodInfo");
  if (info) info.textContent = "Период: всё время";
}

function filterByDateRange(items, from, to) {
  if (!from && !to) return items;
  return items.filter((item) => {
    const date = new Date(item.created_at);
    if (from && date < new Date(from)) return false;
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }
    return true;
  });
}

function getDateRangeText() {
  const { from, to } = getReportDateRange();
  if (!from && !to) return "за всё время";
  if (from && to) {
    return `с ${new Date(from).toLocaleDateString("ru-RU")} по ${new Date(to).toLocaleDateString("ru-RU")}`;
  }
  if (from) return `с ${new Date(from).toLocaleDateString("ru-RU")}`;
  return `по ${new Date(to).toLocaleDateString("ru-RU")}`;
}

// ============================================================
//  ОТКРЫТИЕ ОТЧЁТА
// ============================================================

async function showReportType(type) {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const { from, to } = getReportDateRange();

    switch (type) {
      case "financial":
        await showFinancialReport(container, from, to);
        break;
      case "statuses":
        await showStatusReport(container, from, to);
        break;
      case "points":
        await showPointsReport(container, from, to);
        break;
      case "products":
        await showProductsReport(container, from, to);
        break;
      case "periods":
        await showPeriodsReport(container, from, to);
        break;
      case "bonuses":
        await showBonusesReport(container, from, to);
        break;
      case "returns":
        await showReturnsReport(container, from, to);
        break;
      case "delivery":
        await showDeliveryReport(container, from, to);
        break;
      case "couriers":
        await showCouriersReport(container, from, to);
        break;
      default:
        alert("Неизвестный тип отчёта");
    }
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ФИНАНСОВЫЙ ОТЧЁТ
// ============================================================

async function showFinancialReport(container, from, to) {
  const orders = await getOrders();
  const filtered = filterByDateRange(orders, from, to);

  const totalOrders = filtered.length;
  const totalRevenue = filtered
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const cancelledCount = filtered.filter((o) => o.status === "Отменен").length;
  const cancelledSum = filtered
    .filter((o) => o.status === "Отменен")
    .reduce((sum, o) => sum + o.total, 0);

  const byDay = {};
  filtered.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString("ru-RU");
    if (!byDay[day]) byDay[day] = { count: 0, sum: 0 };
    byDay[day].count++;
    if (o.status !== "Отменен") byDay[day].sum += o.total;
  });

  const sortedDays = Object.entries(byDay).sort(
    (a, b) => new Date(b[0].split(".").reverse().join("-")) - new Date(a[0].split(".").reverse().join("-"))
  );

  const tableRows = sortedDays.map(([day, data]) => [day, data.count, `${data.sum} ₽`]);

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Финансовый отчёт</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="stat-card"><div class="stat-card__label">Всего заказов</div><div class="stat-card__value">${totalOrders}</div></div>
        <div class="stat-card"><div class="stat-card__label">Выручка</div><div class="stat-card__value orange">${totalRevenue} ₽</div></div>
        <div class="stat-card"><div class="stat-card__label">Средний чек</div><div class="stat-card__value">${avgCheck} ₽</div></div>
        <div class="stat-card"><div class="stat-card__label">Отменено</div><div class="stat-card__value" style="color:#dc3545;">${cancelledCount} (${cancelledSum} ₽)</div></div>
      </div>
      
      <div class="reports__section">
        <h3>По дням</h3>
        ${generateTable(["Дата", "Заказов", "Выручка"], tableRows)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('financial', ${JSON.stringify(tableRows)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО СТАТУСАМ
// ============================================================

async function showStatusReport(container, from, to) {
  const orders = await getOrders();
  const filtered = filterByDateRange(orders, from, to);

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

  const statusData = statuses.map((status) => {
    const count = filtered.filter((o) => o.status === status).length;
    const sum = filtered
      .filter((o) => o.status === status)
      .reduce((acc, o) => acc + o.total, 0);
    return [status, count, `${sum} ₽`, filtered.length > 0 ? `${Math.round((count / filtered.length) * 100)}%` : "0%"];
  });

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по статусам</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        ${generateTable(["Статус", "Количество", "Сумма", "% от всех"], statusData)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('statuses', ${JSON.stringify(statusData)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ПУНКТАМ ВЫДАЧИ
// ============================================================

async function showPointsReport(container, from, to) {
  const [orders, points] = await Promise.all([getOrders(), getPickupPoints()]);
  const filtered = filterByDateRange(orders, from, to);

  const pointData = points
    .map((point) => {
      const pointOrders = filtered.filter((o) => o.pickup_point_id === point.id);
      const revenue = pointOrders
        .filter((o) => o.status !== "Отменен")
        .reduce((sum, o) => sum + o.total, 0);
      return [point.name, point.address, pointOrders.length, `${revenue} ₽`];
    })
    .sort((a, b) => b[2] - a[2]);

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по пунктам выдачи</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        ${generateTable(["Пункт", "Адрес", "Заказов", "Выручка"], pointData)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('points', ${JSON.stringify(pointData)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ТОП-10 ТОВАРОВ
// ============================================================

async function showProductsReport(container, from, to) {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const filtered = filterByDateRange(orders, from, to);

  const productStats = {};

  filtered.forEach((order) => {
    if (order.status === "Отменен") return;
    order.items.forEach((item) => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { quantity: 0, revenue: 0 };
      }
      productStats[item.productId].quantity += item.quantity;
      productStats[item.productId].revenue += item.price * item.quantity;
    });
  });

  const sortedProducts = Object.entries(productStats)
    .map(([productId, stats]) => {
      const product = products.find((p) => p.id === parseInt(productId));
      return [
        product ? product.name : "Товар",
        stats.quantity,
        `${stats.revenue} ₽`,
      ];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((row, i) => [i + 1, ...row]);

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Топ-10 товаров</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        ${generateTable(["#", "Товар", "Продано (шт)", "Выручка"], sortedProducts)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('products', ${JSON.stringify(sortedProducts)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ПЕРИОДАМ
// ============================================================

async function showPeriodsReport(container, from, to) {
  const orders = await getOrders();
  const filtered = filterByDateRange(orders, from, to);

  const byDay = {};
  const byWeek = {};
  const byMonth = {};

  filtered.forEach((order) => {
    if (order.status === "Отменен") return;
    const date = new Date(order.created_at);

    const dayKey = date.toLocaleDateString("ru-RU");
    if (!byDay[dayKey]) byDay[dayKey] = { count: 0, sum: 0 };
    byDay[dayKey].count++;
    byDay[dayKey].sum += order.total;

    const weekKey = `Неделя ${getWeekNumber(date)}`;
    if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, sum: 0 };
    byWeek[weekKey].count++;
    byWeek[weekKey].sum += order.total;

    const monthKey = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, sum: 0 };
    byMonth[monthKey].count++;
    byMonth[monthKey].sum += order.total;
  });

  const dayRows = Object.entries(byDay).map(([k, v]) => [k, v.count, `${v.sum} ₽`]);
  const weekRows = Object.entries(byWeek).map(([k, v]) => [k, v.count, `${v.sum} ₽`]);
  const monthRows = Object.entries(byMonth).map(([k, v]) => [k, v.count, `${v.sum} ₽`]);

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по периодам</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        <h3>По дням</h3>
        ${generateTable(["День", "Заказов", "Выручка"], dayRows)}
      </div>
      
      <div class="reports__section">
        <h3>По неделям</h3>
        ${generateTable(["Неделя", "Заказов", "Выручка"], weekRows)}
      </div>
      
      <div class="reports__section">
        <h3>По месяцам</h3>
        ${generateTable(["Месяц", "Заказов", "Выручка"], monthRows)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('periods', ${JSON.stringify(dayRows)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО БОНУСАМ
// ============================================================

async function showBonusesReport(container, from, to) {
  const allTx = await getAllBonusTransactions();
  const filtered = filterByDateRange(allTx, from, to);

  const accrued = filtered.filter((t) => t.type === "accrued").reduce((sum, t) => sum + t.amount, 0);
  const spent = filtered.filter((t) => t.type === "spent").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expired = filtered.filter((t) => t.type === "expired").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const refunded = filtered.filter((t) => t.type === "refunded").reduce((sum, t) => sum + t.amount, 0);

  const tableRows = [
    ["Начислено", `+${accrued}`, `${filtered.filter((t) => t.type === "accrued").length} операций`],
    ["Списано", `−${spent}`, `${filtered.filter((t) => t.type === "spent").length} операций`],
    ["Сгорело", `−${expired}`, `${filtered.filter((t) => t.type === "expired").length} операций`],
    ["Возвращено", `+${refunded}`, `${filtered.filter((t) => t.type === "refunded").length} операций`],
  ];

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по бонусам</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        <h3>Движение бонусов</h3>
        ${generateTable(["Операция", "Сумма", "Количество"], tableRows)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('bonuses', ${JSON.stringify(tableRows)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ВОЗВРАТАМ
// ============================================================

async function showReturnsReport(container, from, to) {
  const orders = await getOrders();
  const filtered = filterByDateRange(orders, from, to).filter(
    (o) => o.status === "Отменен" || o.status === "Возврат" || o.is_refunded
  );

  const totalReturns = filtered.length;
  const totalRefundAmount = filtered.reduce(
    (sum, o) => sum + (o.refund_amount || o.total),
    0
  );

  const tableRows = filtered.map((o) => [
    `#${o.id}`,
    o.client_name,
    `${o.refund_amount || o.total} ₽`,
    o.cancel_reason || "Не указана",
    new Date(o.created_at).toLocaleString("ru-RU"),
  ]);

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по возвратам</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="stat-card"><div class="stat-card__label">Всего возвратов</div><div class="stat-card__value">${totalReturns}</div></div>
        <div class="stat-card"><div class="stat-card__label">Сумма возвратов</div><div class="stat-card__value" style="color:#dc3545;">${totalRefundAmount} ₽</div></div>
      </div>
      
      <div class="reports__section">
        ${generateTable(["ID", "Клиент", "Сумма", "Причина", "Дата"], tableRows)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('returns', ${JSON.stringify(tableRows)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ДОСТАВКА VS САМОВЫВОЗ
// ============================================================

async function showDeliveryReport(container, from, to) {
  const orders = await getOrders();
  const filtered = filterByDateRange(orders, from, to);

  const pickup = filtered.filter((o) => o.order_type === "pickup");
  const delivery = filtered.filter((o) => o.order_type === "delivery");

  const pickupRevenue = pickup
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);
  const deliveryRevenue = delivery
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);

  const tableRows = [
    ["Самовывоз", pickup.length, `${pickupRevenue} ₽`, filtered.length > 0 ? `${Math.round((pickup.length / filtered.length) * 100)}%` : "0%"],
    ["Доставка", delivery.length, `${deliveryRevenue} ₽`, filtered.length > 0 ? `${Math.round((delivery.length / filtered.length) * 100)}%` : "0%"],
  ];

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Доставка и самовывоз</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        ${generateTable(["Тип", "Заказов", "Выручка", "% от всех"], tableRows)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('delivery', ${JSON.stringify(tableRows)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО КУРЬЕРАМ
// ============================================================

async function showCouriersReport(container, from, to) {
  const [orders, users] = await Promise.all([getOrders(), getUsers()]);
  const filtered = filterByDateRange(orders, from, to);

  const couriers = users.filter((u) => u.role === "courier");

  const courierData = couriers.map((courier) => {
    const courierOrders = filtered.filter((o) => o.courier_id === courier.id);
    const delivered = courierOrders.filter((o) => o.status === "Доставлен").length;
    const inProgress = courierOrders.filter((o) => o.status === "В пути").length;
    const revenue = courierOrders
      .filter((o) => o.status === "Доставлен")
      .reduce((sum, o) => sum + o.total, 0);

    return [courier.name, courier.phone || "—", delivered, inProgress, `${revenue} ₽`];
  });

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Отчёт по курьерам</h1>
      <p style="color:#888; margin-bottom:20px;">Период: ${getDateRangeText()}</p>
      
      <div class="reports__section">
        ${generateTable(["Курьер", "Телефон", "Доставлено", "В пути", "Выручка"], courierData)}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generateReportPDF('couriers', ${JSON.stringify(courierData)})">Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function generateTable(headers, rows) {
  if (!rows || rows.length === 0) {
    return '<p style="color:#999;">Нет данных</p>';
  }

  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ============================================================
//  PDF ГЕНЕРАЦИЯ
// ============================================================

function generateReportPDF(reportType, rows) {
  const titles = {
    financial: "Финансовый отчёт",
    statuses: "Отчёт по статусам",
    points: "Отчёт по пунктам выдачи",
    products: "Топ-10 товаров",
    periods: "Отчёт по периодам",
    bonuses: "Отчёт по бонусам",
    returns: "Отчёт по возвратам",
    delivery: "Доставка и самовывоз",
    couriers: "Отчёт по курьерам",
  };

  const headersMap = {
    financial: ["Дата", "Заказов", "Выручка"],
    statuses: ["Статус", "Количество", "Сумма", "% от всех"],
    points: ["Пункт", "Адрес", "Заказов", "Выручка"],
    products: ["#", "Товар", "Продано (шт)", "Выручка"],
    periods: ["Период", "Заказов", "Выручка"],
    bonuses: ["Операция", "Сумма", "Количество"],
    returns: ["ID", "Клиент", "Сумма", "Причина", "Дата"],
    delivery: ["Тип", "Заказов", "Выручка", "% от всех"],
    couriers: ["Курьер", "Телефон", "Доставлено", "В пути", "Выручка"],
  };

  const title = titles[reportType] || "Отчёт";
  const headers = headersMap[reportType] || [];
  const period = getDateRangeText();
  const now = new Date().toLocaleString("ru-RU");

  const printWindow = window.open("", "_blank", "width=900,height=700");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>${title} — Бердск_pizza</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #1a1a1a;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #f37321;
        }
        .logo {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .logo span { color: #f37321; }
        .report-title {
          font-size: 22px;
          font-weight: 700;
          margin: 20px 0 8px;
        }
        .meta {
          font-size: 13px;
          color: #666;
          margin-bottom: 24px;
        }
        .meta div { padding: 2px 0; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        th {
          background: #f5f5f5;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
          color: #555;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        .no-print {
          text-align: center;
          margin-top: 30px;
        }
        .no-print button {
          padding: 12px 32px;
          background: #f37321;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo"><span>БЕРДСК</span>_PIZZA</div>
      </div>

      <div class="report-title">${title}</div>
      <div class="meta">
        <div><strong>Период:</strong> ${period}</div>
        <div><strong>Сформирован:</strong> ${now}</div>
      </div>

      ${
        rows && rows.length > 0
          ? `
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      `
          : '<p style="text-align:center; color:#999; margin-top:40px;">Нет данных за выбранный период</p>'
      }

      <div class="footer">
        <p>© ${new Date().getFullYear()} Бердск_pizza. Отчёт сформирован автоматически.</p>
      </div>

      <div class="no-print">
        <button onclick="window.print()">Сохранить как PDF</button>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.renderReports = renderReports;
window.showReportType = showReportType;
window.generateReportPDF = generateReportPDF;
window.applyReportDateFilter = applyReportDateFilter;
window.resetReportDateFilter = resetReportDateFilter;
