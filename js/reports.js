// ============================================================
//  BERDSK_PIZZA — ОТЧЕТЫ
//  Финансовый, по статусам, по пунктам, по товарам, по периодам, по сотрудникам, по бонусам, по возвратам
// ============================================================

// ===== ОСНОВНОЙ ОТЧЕТ =====
async function renderReports() {
  const container = document.getElementById("adminContent");
  if (!container) return;

  try {
    const orders = await getOrders();
    const products = await getProducts();
    const points = await getPickupPoints();
    const users = await getUsers();
    const tickets = await getTickets();
    const promocodes = await getPromocodes();
    let bonusTx = [];
try {
  const allBonus = await supabaseRequest('/bonus_transactions');
  bonusTx = allBonus || [];
} catch (e) {
  console.warn('Бонусы не загружены:', e);
  bonusTx = [];
}

    // ===== ФИНАНСЫ =====
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(function (sum, o) {
      return sum + o.total;
    }, 0);
    const avgCheck =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // ===== СТАТУСЫ =====
    const statusStats = {};
    orders.forEach(function (o) {
      statusStats[o.status] = (statusStats[o.status] || 0) + 1;
    });

    // ===== ПУНКТЫ =====
    const pointStats = {};
    orders.forEach(function (o) {
      const point = points.find(function (p) {
        return p.id === o.pickup_point_id;
      });
      const name = point ? point.name : "Неизвестно";
      if (!pointStats[name]) {
        pointStats[name] = { orders: 0, revenue: 0 };
      }
      pointStats[name].orders += 1;
      pointStats[name].revenue += o.total;
    });
    const pointEntries = Object.entries(pointStats).sort(function (a, b) {
      return b[1].orders - a[1].orders;
    });

    // ===== ТОП-10 ТОВАРОВ =====
    const productStats = {};
    orders.forEach(function (o) {
      o.items.forEach(function (item) {
        const product = products.find(function (p) {
          return p.id === item.productId;
        });
        const name = product ? product.name : "Товар #" + item.productId;
        if (!productStats[name]) {
          productStats[name] = { quantity: 0, revenue: 0 };
        }
        productStats[name].quantity += item.quantity;
        productStats[name].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.entries(productStats)
      .sort(function (a, b) {
        return b[1].quantity - a[1].quantity;
      })
      .slice(0, 10);

    // ===== ПЕРИОДЫ =====
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let revenueToday = 0,
      revenueWeek = 0,
      revenueMonth = 0;
    let ordersToday = 0,
      ordersWeek = 0,
      ordersMonth = 0;

    orders.forEach(function (o) {
      const date = new Date(o.created_at);
      if (date >= today) {
        revenueToday += o.total;
        ordersToday++;
      }
      if (date >= weekAgo) {
        revenueWeek += o.total;
        ordersWeek++;
      }
      if (date >= monthAgo) {
        revenueMonth += o.total;
        ordersMonth++;
      }
    });

    // ===== СОТРУДНИКИ =====
    const userStats = {};
    orders.forEach(function (o) {
      const user = users.find(function (u) {
        return u.id === o.user_id;
      });
      const name = user ? user.name : "Неизвестно";
      if (!userStats[name]) {
        userStats[name] = { orders: 0, revenue: 0 };
      }
      userStats[name].orders += 1;
      userStats[name].revenue += o.total;
    });
    const userEntries = Object.entries(userStats).sort(function (a, b) {
      return b[1].orders - a[1].orders;
    });

   // ===== БОНУСЫ =====
let bonusTx = [];
let totalBonusAccrued = 0, totalBonusSpent = 0, totalBonusExpired = 0;
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bonus_transactions`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (response.ok) {
    bonusTx = await response.json();
    bonusTx.forEach(function(tx) {
      if (tx.type === 'accrued') totalBonusAccrued += tx.amount;
      else if (tx.type === 'spent') totalBonusSpent += Math.abs(tx.amount);
      else if (tx.type === 'expired') totalBonusExpired += Math.abs(tx.amount);
    });
  }
} catch (e) {
  console.warn('Бонусы не загружены:', e);
}

    // ===== ВОЗВРАТЫ =====
    const refundOrders = orders.filter(function (o) {
      return o.status === "Возврат";
    });
    const totalRefunds = refundOrders.reduce(function (sum, o) {
      return sum + o.total;
    }, 0);

    // ===== СТРОИМ HTML =====
    let html = `
      <div class="reports">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <h1 style="color:#1a1a1a; font-size:24px; font-weight:700;">📈 Отчеты</h1>
          <button class="btn btn--outline" onclick="window.print()">🖨️ Печать</button>
        </div>

        <!-- 1. ФИНАНСОВЫЙ ОТЧЕТ -->
        <div class="reports__section" id="report-finance" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">💰 Финансовый отчет</h3>
          <table style="width:100%; border-collapse:collapse; color:#333;">
            <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Показатель</th><th style="text-align:right; padding:8px 0;">Значение</th></tr></thead>
            <tbody>
              <tr><td style="padding:8px 0;">Всего заказов</td><td style="text-align:right;">${totalOrders}</td></tr>
              <tr><td style="padding:8px 0;">Общая выручка</td><td style="text-align:right; font-weight:700; color:#F37321;">${totalRevenue} ₽</td></tr>
              <tr><td style="padding:8px 0;">Средний чек</td><td style="text-align:right;">${avgCheck} ₽</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 2. ПО СТАТУСАМ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">📊 Заказы по статусам</h3>
          <table style="width:100%; border-collapse:collapse; color:#333;">
            <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Статус</th><th style="text-align:right; padding:8px 0;">Количество</th></tr></thead>
            <tbody>
              ${Object.entries(statusStats)
                .map(function ([status, count]) {
                  return (
                    '<tr><td style="padding:8px 0;">' +
                    status +
                    '</td><td style="text-align:right;">' +
                    count +
                    "</td></tr>"
                  );
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- 3. ПО ПУНКТАМ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">📍 Заказы по пунктам выдачи</h3>
          ${
            pointEntries.length === 0
              ? '<p style="color:#999;">Нет данных</p>'
              : `
            <table style="width:100%; border-collapse:collapse; color:#333;">
              <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Пункт</th><th style="text-align:right; padding:8px 0;">Заказов</th><th style="text-align:right; padding:8px 0;">Выручка</th></tr></thead>
              <tbody>
                ${pointEntries
                  .map(function ([name, stats]) {
                    return (
                      '<tr><td style="padding:8px 0;">' +
                      name +
                      '</td><td style="text-align:right;">' +
                      stats.orders +
                      '</td><td style="text-align:right; font-weight:600; color:#F37321;">' +
                      stats.revenue +
                      " ₽</td></tr>"
                    );
                  })
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>

        <!-- 4. ТОП-10 ТОВАРОВ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">🏆 Топ-10 популярных товаров</h3>
          ${
            topProducts.length === 0
              ? '<p style="color:#999;">Нет данных</p>'
              : `
            <table style="width:100%; border-collapse:collapse; color:#333;">
              <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">#</th><th style="text-align:left; padding:8px 0;">Товар</th><th style="text-align:right; padding:8px 0;">Кол-во</th><th style="text-align:right; padding:8px 0;">Выручка</th></tr></thead>
              <tbody>
                ${topProducts
                  .map(function ([name, stats], index) {
                    return (
                      '<tr><td style="padding:8px 0;">' +
                      (index + 1) +
                      '</td><td style="padding:8px 0;">' +
                      name +
                      '</td><td style="text-align:right;">' +
                      stats.quantity +
                      '</td><td style="text-align:right; font-weight:600; color:#F37321;">' +
                      stats.revenue +
                      " ₽</td></tr>"
                    );
                  })
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>

        <!-- 5. ПО ПЕРИОДАМ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">📅 Выручка по периодам</h3>
          <table style="width:100%; border-collapse:collapse; color:#333;">
            <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Период</th><th style="text-align:right; padding:8px 0;">Заказов</th><th style="text-align:right; padding:8px 0;">Выручка</th></tr></thead>
            <tbody>
              <tr><td style="padding:8px 0;">Сегодня</td><td style="text-align:right;">${ordersToday}</td><td style="text-align:right; font-weight:600; color:#F37321;">${revenueToday} ₽</td></tr>
              <tr><td style="padding:8px 0;">Неделя</td><td style="text-align:right;">${ordersWeek}</td><td style="text-align:right; font-weight:600; color:#F37321;">${revenueWeek} ₽</td></tr>
              <tr><td style="padding:8px 0;">Месяц</td><td style="text-align:right;">${ordersMonth}</td><td style="text-align:right; font-weight:600; color:#F37321;">${revenueMonth} ₽</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 6. ПО СОТРУДНИКАМ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">👥 Заказы по сотрудникам</h3>
          ${
            userEntries.length === 0
              ? '<p style="color:#999;">Нет данных</p>'
              : `
            <table style="width:100%; border-collapse:collapse; color:#333;">
              <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Сотрудник</th><th style="text-align:right; padding:8px 0;">Заказов</th><th style="text-align:right; padding:8px 0;">Выручка</th></tr></thead>
              <tbody>
                ${userEntries
                  .map(function ([name, stats]) {
                    return (
                      '<tr><td style="padding:8px 0;">' +
                      name +
                      '</td><td style="text-align:right;">' +
                      stats.orders +
                      '</td><td style="text-align:right; font-weight:600; color:#F37321;">' +
                      stats.revenue +
                      " ₽</td></tr>"
                    );
                  })
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>

        <!-- 7. БОНУСЫ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">🎁 Бонусы</h3>
          <table style="width:100%; border-collapse:collapse; color:#333;">
            <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Показатель</th><th style="text-align:right; padding:8px 0;">Значение</th></tr></thead>
            <tbody>
              <tr><td style="padding:8px 0;">Начислено</td><td style="text-align:right; color:#28a745;">${totalBonusAccrued}</td></tr>
              <tr><td style="padding:8px 0;">Списано</td><td style="text-align:right; color:#dc3545;">${totalBonusSpent}</td></tr>
              <tr><td style="padding:8px 0;">Сгорело</td><td style="text-align:right; color:#888;">${totalBonusExpired}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 8. ВОЗВРАТЫ -->
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px; margin-bottom:16px;">
          <h3 style="color:#1a1a1a; margin-bottom:12px;">🔄 Возвраты</h3>
          <table style="width:100%; border-collapse:collapse; color:#333;">
            <thead><tr style="border-bottom:2px solid #eee;"><th style="text-align:left; padding:8px 0;">Показатель</th><th style="text-align:right; padding:8px 0;">Значение</th></tr></thead>
            <tbody>
              <tr><td style="padding:8px 0;">Количество возвратов</td><td style="text-align:right;">${refundOrders.length}</td></tr>
              <tr><td style="padding:8px 0;">Сумма возвратов</td><td style="text-align:right; font-weight:600; color:#dc3545;">${totalRefunds} ₽</td></tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top:16px;">
          <button class="btn btn--secondary" onclick="renderDashboard()">← На главную</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + "</p>";
  }
}

// ===== ЭКСПОРТ =====
window.renderReports = renderReports;
