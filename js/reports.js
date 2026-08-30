// ============================================================
//  BERDSK_PIZZA — ОТЧЁТЫ
//  Полностью переписанный модуль с PDF генерацией
// ============================================================

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ ОТЧЁТОВ
// ============================================================

async function renderReports() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📈 Отчёты</h1>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:28px;">
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('financial')">
          <div style="font-size:32px; margin-bottom:8px;">💰</div>
          <h3 style="margin-bottom:4px;">Финансовый отчёт</h3>
          <p style="font-size:13px; color:#888;">Выручка, средний чек, по периодам</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('statuses')">
          <div style="font-size:32px; margin-bottom:8px;">📊</div>
          <h3 style="margin-bottom:4px;">По статусам</h3>
          <p style="font-size:13px; color:#888;">Количество заказов по статусам</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('points')">
          <div style="font-size:32px; margin-bottom:8px;">📍</div>
          <h3 style="margin-bottom:4px;">По пунктам выдачи</h3>
          <p style="font-size:13px; color:#888;">Загрузка пунктов выдачи</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('products')">
          <div style="font-size:32px; margin-bottom:8px;">🍕</div>
          <h3 style="margin-bottom:4px;">Топ-10 товаров</h3>
          <p style="font-size:13px; color:#888;">Самые популярные товары</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('periods')">
          <div style="font-size:32px; margin-bottom:8px;">📅</div>
          <h3 style="margin-bottom:4px;">По периодам</h3>
          <p style="font-size:13px; color:#888;">День / неделя / месяц</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('bonuses')">
          <div style="font-size:32px; margin-bottom:8px;">🎁</div>
          <h3 style="margin-bottom:4px;">Бонусы</h3>
          <p style="font-size:13px; color:#888;">Начислено / списано / сгорело</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('returns')">
          <div style="font-size:32px; margin-bottom:8px;">🔄</div>
          <h3 style="margin-bottom:4px;">Возвраты</h3>
          <p style="font-size:13px; color:#888;">Отменённые и возвращённые заказы</p>
        </div>
        
        <div class="report-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; cursor:pointer;" onclick="showReportType('delivery')">
          <div style="font-size:32px; margin-bottom:8px;">🛵</div>
          <h3 style="margin-bottom:4px;">Доставка vs Самовывоз</h3>
          <p style="font-size:13px; color:#888;">Сравнение типов заказов</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
//  ПОКАЗ ОТЧЁТА ПО ТИПУ
// ============================================================

async function showReportType(type) {
  const container = document.getElementById("adminContent");
  if (!container) return;

  const period = prompt(
    "Выберите период:\n1. Сегодня\n2. Неделя\n3. Месяц\n4. Всё время",
    "4"
  );

  let dateFrom = null;
  const now = new Date();

  switch (period) {
    case "1":
      dateFrom = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "2":
      dateFrom = new Date(now.setDate(now.getDate() - 7));
      break;
    case "3":
      dateFrom = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      dateFrom = null;
  }

  try {
    switch (type) {
      case "financial":
        await showFinancialReport(container, dateFrom);
        break;
      case "statuses":
        await showStatusReport(container, dateFrom);
        break;
      case "points":
        await showPointsReport(container, dateFrom);
        break;
      case "products":
        await showProductsReport(container, dateFrom);
        break;
      case "periods":
        await showPeriodsReport(container, dateFrom);
        break;
      case "bonuses":
        await showBonusesReport(container, dateFrom);
        break;
      case "returns":
        await showReturnsReport(container, dateFrom);
        break;
      case "delivery":
        await showDeliveryReport(container, dateFrom);
        break;
      default:
        alert("❌ Неизвестный тип отчёта");
    }
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ФИНАНСОВЫЙ ОТЧЁТ
// ============================================================

async function showFinancialReport(container, dateFrom) {
  const orders = await getOrders();
  const filtered = filterByDate(orders, dateFrom);

  const totalOrders = filtered.length;
  const totalRevenue = filtered
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const cancelledCount = filtered.filter((o) => o.status === "Отменен").length;
  const cancelledSum = filtered
    .filter((o) => o.status === "Отменен")
    .reduce((sum, o) => sum + o.total, 0);

  // По дням
  const byDay = {};
  filtered.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString("ru-RU");
    if (!byDay[day]) byDay[day] = { count: 0, sum: 0 };
    byDay[day].count++;
    if (o.status !== "Отменен") byDay[day].sum += o.total;
  });

  const tableHtml = generateTable(
    ["Дата", "Заказов", "Выручка"],
    Object.entries(byDay).map(([day, data]) => [day, data.count, `${data.sum} ₽`])
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">💰 Финансовый отчёт</h1>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="stat-card"><div class="stat-card__label">Всего заказов</div><div class="stat-card__value">${totalOrders}</div></div>
        <div class="stat-card"><div class="stat-card__label">Выручка</div><div class="stat-card__value orange">${totalRevenue} ₽</div></div>
        <div class="stat-card"><div class="stat-card__label">Средний чек</div><div class="stat-card__value">${avgCheck} ₽</div></div>
        <div class="stat-card"><div class="stat-card__label">Отменено</div><div class="stat-card__value" style="color:#dc3545;">${cancelledCount} (${cancelledSum} ₽)</div></div>
      </div>
      
      <div class="reports__section">
        <h3>📊 По дням</h3>
        ${tableHtml}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('financial')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО СТАТУСАМ
// ============================================================

async function showStatusReport(container, dateFrom) {
  const orders = await getOrders();
  const filtered = filterByDate(orders, dateFrom);

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
    return { status, count, sum };
  });

  const tableHtml = generateTable(
    ["Статус", "Количество", "Сумма", "% от всех"],
    statusData.map((s) => [
      s.status,
      s.count,
      `${s.sum} ₽`,
      filtered.length > 0 ? `${Math.round((s.count / filtered.length) * 100)}%` : "0%",
    ])
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📊 Отчёт по статусам</h1>
      <div class="reports__section">
        ${tableHtml}
      </div>
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('statuses')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ПУНКТАМ ВЫДАЧИ
// ============================================================

async function showPointsReport(container, dateFrom) {
  const [orders, points] = await Promise.all([getOrders(), getPickupPoints()]);
  const filtered = filterByDate(orders, dateFrom);

  const pointData = points.map((point) => {
    const pointOrders = filtered.filter((o) => o.pickup_point_id === point.id);
    const revenue = pointOrders
      .filter((o) => o.status !== "Отменен")
      .reduce((sum, o) => sum + o.total, 0);
    return {
      point,
      count: pointOrders.length,
      revenue,
    };
  });

  pointData.sort((a, b) => b.count - a.count);

  const tableHtml = generateTable(
    ["Пункт выдачи", "Адрес", "Заказов", "Выручка"],
    pointData.map((d) => [d.point.name, d.point.address, d.count, `${d.revenue} ₽`])
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📍 Отчёт по пунктам выдачи</h1>
      <div class="reports__section">
        ${tableHtml}
      </div>
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('points')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ТОП-10 ТОВАРОВ
// ============================================================

async function showProductsReport(container, dateFrom) {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const filtered = filterByDate(orders, dateFrom);

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
      return {
        name: product ? product.name : "Товар",
        quantity: stats.quantity,
        revenue: stats.revenue,
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const tableHtml = generateTable(
    ["#", "Товар", "Продано (шт)", "Выручка"],
    sortedProducts.map((p, i) => [i + 1, p.name, p.quantity, `${p.revenue} ₽`])
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🍕 Топ-10 товаров</h1>
      <div class="reports__section">
        ${tableHtml}
      </div>
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('products')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ПЕРИОДАМ
// ============================================================

async function showPeriodsReport(container, dateFrom) {
  const orders = await getOrders();
  const filtered = filterByDate(orders, dateFrom);

  const byDay = {};
  const byWeek = {};
  const byMonth = {};

  filtered.forEach((order) => {
    if (order.status === "Отменен") return;

    const date = new Date(order.created_at);

    // День
    const dayKey = date.toLocaleDateString("ru-RU");
    if (!byDay[dayKey]) byDay[dayKey] = { count: 0, sum: 0 };
    byDay[dayKey].count++;
    byDay[dayKey].sum += order.total;

    // Неделя (номер недели)
    const weekKey = `Неделя ${getWeekNumber(date)}`;
    if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, sum: 0 };
    byWeek[weekKey].count++;
    byWeek[weekKey].sum += order.total;

    // Месяц
    const monthKey = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, sum: 0 };
    byMonth[monthKey].count++;
    byMonth[monthKey].sum += order.total;
  });

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📅 Отчёт по периодам</h1>
      
      <div class="reports__section">
        <h3>По дням</h3>
        ${generateTable(["День", "Заказов", "Выручка"], Object.entries(byDay).map(([k, v]) => [k, v.count, `${v.sum} ₽`]))}
      </div>
      
      <div class="reports__section">
        <h3>По неделям</h3>
        ${generateTable(["Неделя", "Заказов", "Выручка"], Object.entries(byWeek).map(([k, v]) => [k, v.count, `${v.sum} ₽`]))}
      </div>
      
      <div class="reports__section">
        <h3>По месяцам</h3>
        ${generateTable(["Месяц", "Заказов", "Выручка"], Object.entries(byMonth).map(([k, v]) => [k, v.count, `${v.sum} ₽`]))}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('periods')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО БОНУСАМ
// ============================================================

async function showBonusesReport(container, dateFrom) {
  const transactions = await getBonusTransactionsForReport();
  const filtered = filterByDate(transactions, dateFrom);

  const accrued = filtered.filter((t) => t.type === "accrued").reduce((sum, t) => sum + t.amount, 0);
  const spent = filtered.filter((t) => t.type === "spent").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expired = filtered.filter((t) => t.type === "expired").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const refunded = filtered.filter((t) => t.type === "refunded").reduce((sum, t) => sum + t.amount, 0);

  const tableHtml = generateTable(
    ["Тип", "Сумма"],
    [
      ["Начислено", `+${accrued}`],
      ["Списано", `−${spent}`],
      ["Сгорело", `−${expired}`],
      ["Возвращено", `+${refunded}`],
    ]
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🎁 Отчёт по бонусам</h1>
      <div class="reports__section">
        ${tableHtml}
      </div>
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('bonuses')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ПО ВОЗВРАТАМ
// ============================================================

async function showReturnsReport(container, dateFrom) {
  const orders = await getOrders();
  const filtered = filterByDate(orders, dateFrom).filter(
    (o) => o.status === "Отменен" || o.status === "Возврат" || o.is_refunded
  );

  const totalReturns = filtered.length;
  const totalRefundAmount = filtered.reduce(
    (sum, o) => sum + (o.refund_amount || o.total),
    0
  );

  const tableHtml = generateTable(
    ["ID", "Клиент", "Сумма", "Причина", "Дата"],
    filtered.map((o) => [
      `#${o.id}`,
      o.client_name,
      `${o.refund_amount || o.total} ₽`,
      o.cancel_reason || "Не указана",
      new Date(o.created_at).toLocaleString("ru-RU"),
    ])
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🔄 Отчёт по возвратам</h1>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="stat-card"><div class="stat-card__label">Всего возвратов</div><div class="stat-card__value">${totalReturns}</div></div>
        <div class="stat-card"><div class="stat-card__label">Сумма возвратов</div><div class="stat-card__value" style="color:#dc3545;">${totalRefundAmount} ₽</div></div>
      </div>
      
      <div class="reports__section">
        ${tableHtml}
      </div>
      
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('returns')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ОТЧЁТ ДОСТАВКА VS САМОВЫВОЗ
// ============================================================

async function showDeliveryReport(container, dateFrom) {
  const orders = await getOrders();
  const filtered = filterByDate(orders, dateFrom);

  const pickup = filtered.filter((o) => o.order_type === "pickup");
  const delivery = filtered.filter((o) => o.order_type === "delivery");

  const pickupRevenue = pickup
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);
  const deliveryRevenue = delivery
    .filter((o) => o.status !== "Отменен")
    .reduce((sum, o) => sum + o.total, 0);

  const tableHtml = generateTable(
    ["Тип", "Заказов", "Выручка", "% от всех"],
    [
      ["🏪 Самовывоз", pickup.length, `${pickupRevenue} ₽`, filtered.length > 0 ? `${Math.round((pickup.length / filtered.length) * 100)}%` : "0%"],
      ["🛵 Доставка", delivery.length, `${deliveryRevenue} ₽`, filtered.length > 0 ? `${Math.round((delivery.length / filtered.length) * 100)}%` : "0%"],
    ]
  );

  container.innerHTML = `
    <div class="reports">
      <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">🛵 Доставка vs Самовывоз</h1>
      <div class="reports__section">
        ${tableHtml}
      </div>
      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn--primary" onclick="generatePDF('delivery')">📄 Скачать PDF</button>
        <button class="btn btn--secondary" onclick="renderReports()">← Назад</button>
      </div>
    </div>
  `;
}

// ============================================================
//  ГЕНЕРАЦИЯ PDF
// ============================================================

function generatePDF(reportType) {
  const reportTitle = getReportTitle(reportType);
  const content = document.querySelector(".reports");
  
  if (!content) {
    alert("❌ Нет данных для PDF");
    return;
  }

  // Создаём окно для печати
  const printWindow = window.open("", "_blank", "width=800,height=600");
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${reportTitle}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #1a1a1a;
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .report-date {
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
          font-size: 14px;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        tr:hover td {
          background: #fafafa;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>📊 ${reportTitle}</h1>
      <div class="report-date">Сформирован: ${new Date().toLocaleString("ru-RU")}</div>
      ${content.innerHTML}
      <div class="footer">
        © ${new Date().getFullYear()} Бердск_pizza. Отчёт сформирован автоматически.
      </div>
      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 24px; background:#F37321; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:600;">
          🖨️ Печать / Сохранить как PDF
        </button>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}

function getReportTitle(type) {
  const titles = {
    financial: "Финансовый отчёт",
    statuses: "Отчёт по статусам",
    points: "Отчёт по пунктам выдачи",
    products: "Топ-10 товаров",
    periods: "Отчёт по периодам",
    bonuses: "Отчёт по бонусам",
    returns: "Отчёт по возвратам",
    delivery: "Доставка vs Самовывоз",
  };
  return titles[type] || "Отчёт";
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function filterByDate(items, dateFrom) {
  if (!dateFrom) return items;
  return items.filter((item) => {
    const date = new Date(item.created_at);
    return date >= dateFrom;
  });
}

function generateTable(headers, rows) {
  if (rows.length === 0) {
    return '<p style="color:#999;">Нет данных</p>';
  }

  let html = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach((row) => {
    html += `
      <tr>
        ${row.map((cell) => `<td>${cell}</td>`).join("")}
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

async function getBonusTransactionsForReport() {
  const users = await getUsers();
  let allTransactions = [];
  
  for (const user of users) {
    const transactions = await getBonusTransactions(user.id);
    allTransactions = allTransactions.concat(transactions);
  }
  
  return allTransactions;
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.renderReports = renderReports;
window.showReportType = showReportType;
window.generatePDF = generatePDF;
