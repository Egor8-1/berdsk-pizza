// ============================================================
//  BERDSK_PIZZA — ОТЧЕТЫ (МИНИМАЛЬНАЯ ВЕРСИЯ)
// ============================================================

async function renderReports() {
  const container = document.getElementById('adminContent');
  if (!container) return;

  try {
    const orders = await getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    container.innerHTML = `
      <div class="reports">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:20px;">📈 Отчеты</h1>
        <div class="reports__section" style="background:#fff; border:1px solid #eee; padding:20px; border-radius:12px;">
          <h3>💰 Финансовый отчет</h3>
          <table style="width:100%; border-collapse:collapse; margin-top:12px;">
            <tr><td style="padding:8px 0;">Всего заказов</td><td style="text-align:right;">${totalOrders}</td></tr>
            <tr><td style="padding:8px 0;">Общая выручка</td><td style="text-align:right; font-weight:700; color:#F37321;">${totalRevenue} ₽</td></tr>
          </table>
        </div>
        <p style="color:#999; margin-top:16px;">Остальные отчеты в разработке</p>
        <button class="btn btn--secondary" onclick="renderDashboard()" style="margin-top:16px;">← На главную</button>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + '</p>';
  }
}

window.renderReports = renderReports;
