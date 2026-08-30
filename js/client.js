// ============================================================
//  BERDSK_PIZZA — КЛИЕНТ
// ============================================================

let cart = [];

function navigateTo(page) {
  const links = document.querySelectorAll('.header__link[data-page]');
  links.forEach(function(link) { link.classList.remove('active'); });
  const activeLink = document.querySelector('.header__link[data-page="' + page + '"]');
  if (activeLink) activeLink.classList.add('active');
  switch (page) {
    case 'catalog': renderCatalog(); break;
    case 'cart': renderCart(); break;
    case 'orders': renderOrders(); break;
    case 'bonuses': renderBonuses(); break;
    default: renderCatalog();
  }
}

async function renderCatalog(category) {
  if (typeof category === 'undefined') category = 'Все';
  const container = document.getElementById('content');
  if (!container) return;
  try {
    const products = await getProducts();
    const categories = ['Все'];
    for (var i = 0; i < products.length; i++) {
      if (categories.indexOf(products[i].category) === -1) {
        categories.push(products[i].category);
      }
    }
    var filtered = products;
    if (category !== 'Все') {
      filtered = products.filter(function(p) { return p.category === category; });
    }
    var user = getCurrentUser();
    var html = '<div class="catalog"><div class="catalog__greeting">🍕 Привет, ' + (user ? user.name : 'гость') + '!</div><div class="catalog__subtitle">Что сегодня закажешь?</div><div class="catalog__categories">';
    for (var j = 0; j < categories.length; j++) {
      var active = categories[j] === category ? 'active' : '';
      html += '<button class="catalog__category ' + active + '" onclick="renderCatalog(\'' + categories[j] + '\')">' + categories[j] + '</button>';
    }
    html += '</div><div class="catalog__grid">';
    for (var k = 0; k < filtered.length; k++) {
      var p = filtered[k];
      html += '<div class="product-card"><div class="product-card__image">' + (p.image || '🍕') + '</div><div class="product-card__body"><div class="product-card__name">' + p.name + '</div><div class="product-card__description">' + (p.description || '') + '</div><div class="product-card__bottom"><span class="product-card__price">' + p.price + ' ₽</span><button class="product-card__add" onclick="addToCart(' + p.id + '); updateCartCount();">+ В корзину</button></div></div></div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p style="color:#dc3545;">⚠️ Ошибка: ' + error.message + '</p>';
  }
}

function loadCart() {
  var saved = localStorage.getItem('berdskCart');
  if (saved) {
    try { cart = JSON.parse(saved); } catch (e) { cart = []; }
  }
  return cart;
}

function saveCart() {
  localStorage.setItem('berdskCart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  var total = 0;
  for (var i = 0; i < cart.length; i++) {
    total += cart[i].quantity;
  }
  var el = document.getElementById('cartCount');
  if (el) el.textContent = total;
}

function addToCart(productId, quantity) {
  if (typeof quantity === 'undefined') quantity = 1;
  var existing = null;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].productId === productId) { existing = cart[i]; break; }
  }
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId: productId, quantity: quantity });
  }
  saveCart();
}

function removeFromCart(productId) {
  var newCart = [];
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].productId !== productId) newCart.push(cart[i]);
  }
  cart = newCart;
  saveCart();
}

function updateQuantity(productId, quantity) {
  if (quantity <= 0) { removeFromCart(productId); return; }
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].productId === productId) { cart[i].quantity = quantity; break; }
  }
  saveCart();
}

function clearCart() { cart = []; saveCart(); }

async function getCartDetails() {
  var products = await getProducts();
  var details = [];
  for (var i = 0; i < cart.length; i++) {
    var product = null;
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === cart[i].productId) { product = products[j]; break; }
    }
    if (product) {
      details.push({
        productId: cart[i].productId,
        quantity: cart[i].quantity,
        name: product.name,
        price: product.price,
        image: product.image || '🍕',
        total: cart[i].quantity * product.price
      });
    }
  }
  return details;
}

function calculateTotal(details) {
  var sum = 0;
  for (var i = 0; i < details.length; i++) {
    sum += details[i].total;
  }
  return sum;
}

async function renderCart() {
  var container = document.getElementById('content');
  if (!container) return;
  var cartItems = await getCartDetails();
  if (cartItems.length === 0) {
    container.innerHTML = '<div class="cart"><h1 class="cart__title">🛒 Корзина</h1><div class="cart__empty"><span class="cart__empty-icon">🛒</span><h2>Корзина пуста</h2><p>Добавьте товары из каталога</p><button class="btn btn--primary" onclick="navigateTo(\'catalog\')">Перейти в каталог</button></div></div>';
    return;
  }
  var total = calculateTotal(cartItems);
  var html = '<div class="cart"><h1 class="cart__title">🛒 Корзина</h1>';
  for (var i = 0; i < cartItems.length; i++) {
    var item = cartItems[i];
    html += '<div class="cart__item"><div class="cart__item-info"><span style="font-size:28px;">' + item.image + '</span><span class="cart__item-name">' + item.name + '</span><div class="cart__item-quantity"><button onclick="updateQuantity(' + item.productId + ', ' + (item.quantity - 1) + '); renderCart();">−</button><span>' + item.quantity + '</span><button onclick="updateQuantity(' + item.productId + ', ' + (item.quantity + 1) + '); renderCart();">+</button></div><span>' + item.price + ' ₽</span></div><div class="cart__item-total">' + item.total + ' ₽</div><button class="cart__item-remove" onclick="removeFromCart(' + item.productId + '); renderCart();">✕</button></div>';
  }
  html += '<div class="cart__summary"><div class="cart__summary-row"><span>Итого</span><span>' + total + ' ₽</span></div><div class="cart__summary-actions"><button class="btn btn--primary" onclick="checkout()">📦 Оформить заказ</button><button class="btn btn--danger" onclick="clearCart(); renderCart();">🧹 Очистить</button><button class="btn btn--secondary" onclick="navigateTo(\'catalog\')">← Продолжить покупки</button></div></div></div>';
  container.innerHTML = html;
}

async function checkout() {
  var user = getCurrentUser();
  if (!user) {
    alert('⚠️ Для оформления заказа необходимо авторизоваться');
    document.getElementById('authModal').classList.add('active');
    return;
  }
  var points = await getPickupPoints();
  if (points.length === 0) { alert('❌ Нет доступных пунктов выдачи'); return; }
  var cartItems = await getCartDetails();
  if (cartItems.length === 0) { alert('❌ Корзина пуста'); return; }
  var total = calculateTotal(cartItems);
  var itemsHtml = '';
  for (var i = 0; i < cartItems.length; i++) {
    var item = cartItems[i];
    itemsHtml += '<div class="item"><span>' + item.image + ' ' + item.name + ' × ' + item.quantity + '</span><span>' + item.total + ' ₽</span></div>';
  }
  var pointsHtml = '';
  for (var i = 0; i < points.length; i++) {
    pointsHtml += '<option value="' + points[i].id + '">' + points[i].name + ' — ' + points[i].address + '</option>';
  }
  var container = document.getElementById('content');
  container.innerHTML = '<div class="checkout"><h1>📦 Оформление заказа</h1><div class="checkout__form"><div class="checkout__order-summary"><h4 style="margin-bottom:8px;">📋 Состав заказа</h4>' + itemsHtml + '<div class="checkout__total">Итого: ' + total + ' ₽</div></div><div class="form-group"><label>📍 Выберите пункт выдачи</label><select id="pickupPoint">' + pointsHtml + '</select></div><div class="form-group"><label>📞 Ваш номер телефона</label><input type="tel" id="clientPhone" placeholder="+7 (999) 123-45-67" required /></div><div class="form-group"><label>💬 Комментарий</label><input type="text" id="orderComment" placeholder="Например: без лука" /></div><button class="btn btn--success btn--full" onclick="submitOrder()">✅ Подтвердить заказ</button><button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderCart()">← Вернуться</button></div></div>';
}

async function submitOrder() {
  var user = getCurrentUser();
  var pickupPointId = parseInt(document.getElementById('pickupPoint').value);
  var clientPhone = document.getElementById('clientPhone').value.trim();
  var comment = document.getElementById('orderComment').value.trim() || '';
  var cartItems = await getCartDetails();
  var total = calculateTotal(cartItems);
  if (!clientPhone) { alert('⚠️ Введите номер телефона'); return; }
  if (cartItems.length === 0) { alert('❌ Корзина пуста'); return; }
  var isLargeOrder = false;
  for (var i = 0; i < cartItems.length; i++) {
    if (cartItems[i].quantity > 30) isLargeOrder = true;
  }
  var orderData = {
    user_id: user.id,
    items: cartItems.map(function(item) { return { productId: item.productId, quantity: item.quantity, price: item.price }; }),
    total: total,
    pickup_point_id: pickupPointId,
    status: isLargeOrder ? 'Ожидает подтверждения' : 'Новый',
    client_phone: clientPhone,
    client_name: user.name || user.login,
    comment: comment
  };
  try {
    await createOrder(orderData);
    clearCart();
    alert('✅ Заказ оформлен!' + (isLargeOrder ? ' ⚠️ Ожидайте подтверждения оператора.' : ''));
    navigateTo('orders');
  } catch (error) {
    alert('❌ Ошибка: ' + error.message);
  }
}

async function renderOrders() {
  var container = document.getElementById('content');
  if (!container) return;
  var user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1><p style="color:#999;">Авторизуйтесь для просмотра заказов</p></div>';
    return;
  }
  try {
    var allOrders = await getOrders();
    var userOrders = [];
    for (var i = 0; i < allOrders.length; i++) {
      if (allOrders[i].user_id === user.id) userOrders.push(allOrders[i]);
    }
    userOrders.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    if (userOrders.length === 0) {
      container.innerHTML = '<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1><p style="color:#999;">У вас пока нет заказов</p></div>';
      return;
    }
    var products = await getProducts();
    var points = await getPickupPoints();
    var html = '<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1>';
    for (var i = 0; i < userOrders.length; i++) {
      var order = userOrders[i];
      var point = null;
      for (var j = 0; j < points.length; j++) {
        if (points[j].id === order.pickup_point_id) { point = points[j]; break; }
      }
      var itemsHtml = '';
      for (var j = 0; j < order.items.length; j++) {
        var item = order.items[j];
        var product = null;
        for (var k = 0; k < products.length; k++) {
          if (products[k].id === item.productId) { product = products[k]; break; }
        }
        itemsHtml += (product ? product.name : 'Товар') + ' × ' + item.quantity + (j < order.items.length - 1 ? '; ' : '');
      }
      var statusLabels = {
        'Новый': '🟡 Новый',
        'Ожидает подтверждения': '🟠 Ожидает',
        'Готовится': '🟠 Готовится',
        'Готов к выдаче': '🟢 Готов',
        'В пути': '🔵 В пути',
        'Доставлен': '✅ Доставлен',
        'Выдан': '✅ Выдан',
        'Отменен': '❌ Отменен',
        'Возврат': '🔄 Возврат'
      };
      html += '<div class="order-card" onclick="showOrderTracking(' + order.id + ')"><div class="order-card__header"><span class="order-card__id">Заказ #' + order.id + '</span><span class="order-card__status">' + (statusLabels[order.status] || order.status) + '</span></div><div class="order-card__items">' + itemsHtml + '</div><div class="order-card__meta">📍 ' + (point ? point.name : 'Неизвестный пункт') + (order.comment ? ' 💬 ' + order.comment : '') + '</div><div class="order-card__total">' + order.total + ' ₽</div><div class="order-card__meta">📅 ' + new Date(order.created_at).toLocaleString() + '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + '</p>';
  }
}

async function renderBonuses() {
  var container = document.getElementById('content');
  if (!container) return;
  var user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="bonuses"><h1>🎁 Мои бонусы</h1><p style="color:#999;">Авторизуйтесь для просмотра бонусов</p></div>';
    return;
  }
  try {
    var balance = await getBonusBalance(user.id);
    var transactions = await getBonusTransactions(user.id);
    transactions.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var historyHtml = '';
    for (var i = 0; i < Math.min(transactions.length, 20); i++) {
      var tx = transactions[i];
      var sign = tx.amount > 0 ? '+' : '';
      var cls = tx.amount > 0 ? 'positive' : 'negative';
      var typeMap = { 'accrued': 'Начисление', 'spent': 'Списание', 'expired': 'Сгорели', 'refunded': 'Возврат' };
      historyHtml += '<div class="item"><span>' + (typeMap[tx.type] || tx.type) + '</span><span class="amount ' + cls + '">' + sign + tx.amount + '</span></div>';
    }
    container.innerHTML = '<div class="bonuses"><h1>🎁 Мои бонусы</h1><div class="bonuses__balance"><div class="label">Текущий баланс</div><div class="amount">' + balance + '</div><div class="bonuses__expires">Бонусы сгорают через 60 дней</div></div><div class="bonuses__history"><h3 style="margin-bottom:12px;">История операций</h3>' + (historyHtml || '<p style="color:#999;">История пуста</p>') + '</div><button class="btn btn--secondary" onclick="navigateTo(\'catalog\')" style="margin-top:16px;">← Вернуться</button></div>';
  } catch (error) {
    container.innerHTML = '<p style="color:#dc3545;">❌ Ошибка: ' + error.message + '</p>';
  }
}

async function showOrderTracking(orderId) {
  try {
    var order = await getOrder(orderId);
    var products = await getProducts();
    var points = await getPickupPoints();
    var point = null;
    for (var i = 0; i < points.length; i++) {
      if (points[i].id === order.pickup_point_id) { point = points[i]; break; }
    }
    var itemsHtml = '';
    for (var i = 0; i < order.items.length; i++) {
      var item = order.items[i];
      var product = null;
      for (var j = 0; j < products.length; j++) {
        if (products[j].id === item.productId) { product = products[j]; break; }
      }
      itemsHtml += '<div class="detail-row"><span>' + (product ? product.name : 'Товар') + ' × ' + item.quantity + '</span><span>' + (item.price * item.quantity) + ' ₽</span></div>';
    }
    var statusLabels = {
      'Новый': '🟡 Новый',
      'Ожидает подтверждения': '🟠 Ожидает подтверждения',
      'Готовится': '🟠 Готовится',
      'Готов к выдаче': '🟢 Готов к выдаче',
      'В пути': '🔵 В пути',
      'Доставлен': '✅ Доставлен',
      'Выдан': '✅ Выдан',
      'Отменен': '❌ Отменен',
      'Возврат': '🔄 Возврат'
    };
    var container = document.getElementById('content');
    container.innerHTML = '<div class="tracking"><h1>📦 Заказ #' + order.id + '</h1><p style="color:#888; margin-bottom:16px;">Отслеживание статуса</p><div style="padding:12px 16px; background:#f8f9fa; border-radius:8px; max-width:500px;"><strong>Текущий статус:</strong> ' + (statusLabels[order.status] || order.status) + '</div><div class="tracking__order-details" style="margin-top:16px; background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; max-width:500px;"><h3 style="margin-bottom:8px;">📋 Детали заказа</h3>' + itemsHtml + '<div style="border-top:2px solid #eee; padding-top:8px; margin-top:8px; font-weight:700; font-size:16px;"><div class="detail-row"><span>Итого</span><span style="color:#F37321;">' + order.total + ' ₽</span></div></div><div class="detail-row" style="margin-top:8px; font-size:13px; color:#888;"><span>📍 ' + (point ? point.name : 'Неизвестный пункт') + '</span><span>' + (point ? point.address : '') + '</span></div>' + (order.comment ? '<div class="detail-row" style="font-size:13px; color:#888;"><span>💬 ' + order.comment + '</span></div>' : '') + '<div class="detail-row" style="font-size:12px; color:#999;">📅 ' + new Date(order.created_at).toLocaleString() + '</div></div><div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;"><button class="btn btn--secondary" onclick="navigateTo(\'orders\')">← Вернуться</button><button class="btn btn--primary" onclick="window.print()">🖨️ Распечатать</button></div></div>';
  } catch (error) {
    alert('❌ Ошибка загрузки заказа: ' + error.message);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
loadCart();
updateCartCount();

document.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('.header__link[data-page]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
    });
  }
  renderCatalog();
  initAuthUI();
  console.log('🍕 Бердск_pizza загружена');
});

// ===== ЭКСПОРТ =====
window.navigateTo = navigateTo;
window.renderCatalog = renderCatalog;
window.renderCart = renderCart;
window.renderOrders = renderOrders;
window.renderBonuses = renderBonuses;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.checkout = checkout;
window.submitOrder = submitOrder;
window.showOrderTracking = showOrderTracking;
