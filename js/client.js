// ============================================================
//  BERDSK_PIZZA — КЛИЕНТ
//  Версия 3.0 — с PDF чеком, поиском, обратной связью
// ============================================================

let cart = [];
let currentCategory = "Все";
let activePromocode = null;
let activeBonusAmount = 0;

// ============================================================
//  НАВИГАЦИЯ
// ============================================================

function navigateTo(page) {
  document.querySelectorAll('.header__link[data-page]').forEach((link) => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(
    `.header__link[data-page="${page}"]`
  );
  if (activeLink) activeLink.classList.add('active');

  switch (page) {
    case 'catalog':
      renderCatalog(currentCategory);
      break;
    case 'cart':
      renderCart();
      break;
    case 'orders':
      renderOrders();
      break;
    case 'bonuses':
      renderBonuses();
      break;
    case 'support':
      renderSupport();
      break;
    default:
      renderCatalog(currentCategory);
  }
}

// ============================================================
//  КОРЗИНА
// ============================================================

function loadCart() {
  const saved = localStorage.getItem('berdskCart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
    } catch (e) {
      cart = [];
    }
  }
  return cart;
}

function saveCart() {
  localStorage.setItem('berdskCart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = total;
}

function addToCart(productId, quantity = 1) {
  const existing = cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.productId !== productId);
  saveCart();
}

function updateQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = cart.find((i) => i.productId === productId);
  if (item) {
    item.quantity = quantity;
    saveCart();
  }
}

function clearCart() {
  cart = [];
  activePromocode = null;
  activeBonusAmount = 0;
  saveCart();
}

// ============================================================
//  КАТАЛОГ
// ============================================================

async function renderCatalog(category = 'Все') {
  currentCategory = category;
  const container = document.getElementById('content');
  if (!container) return;

  try {
    const products = await getProducts();
    const activeProducts = products.filter((p) => !p.is_stopped && p.is_active !== false);

    const categories = ['Все'];
    activeProducts.forEach((p) => {
      if (!categories.includes(p.category)) {
        categories.push(p.category);
      }
    });

    let filtered = activeProducts;
    if (category !== 'Все') {
      filtered = activeProducts.filter((p) => p.category === category);
    }

    const user = getCurrentUser();
    const greeting = user ? `Привет, ${user.name}!` : 'Привет, гость!';

    let html = `
      <div class="catalog">
        <div class="catalog__greeting">🍕 ${greeting}</div>
        <div class="catalog__subtitle">Что сегодня закажешь?</div>
        <div class="catalog__categories">
    `;

    categories.forEach((cat) => {
      const active = cat === category ? 'active' : '';
      html += `<button class="catalog__category ${active}" onclick="renderCatalog('${cat}')">${cat}</button>`;
    });

    html += `</div><div class="catalog__grid">`;

    if (filtered.length === 0) {
      html += `<p style="color:#999;">Товары не найдены</p>`;
    } else {
      filtered.forEach((p) => {
        html += `
          <div class="product-card">
            <div class="product-card__image">${p.image || '🍕'}</div>
            <div class="product-card__body">
              <div class="product-card__name">${p.name}</div>
              <div class="product-card__description">${p.description || ''}</div>
              <div class="product-card__bottom">
                <span class="product-card__price">${p.price} ₽</span>
                <button class="product-card__add" onclick="addToCart(${p.id})">Добавить</button>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  КОРЗИНА (ОТОБРАЖЕНИЕ)
// ============================================================

async function getCartDetails() {
  const products = await getProducts();
  const details = [];

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (product && !product.is_stopped) {
      details.push({
        productId: item.productId,
        quantity: item.quantity,
        name: product.name,
        price: product.price,
        image: product.image || '🍕',
        total: item.quantity * product.price,
      });
    }
  }
  return details;
}

function calculateSubtotal(details) {
  return details.reduce((sum, item) => sum + item.total, 0);
}

async function renderCart() {
  const container = document.getElementById('content');
  if (!container) return;

  const cartItems = await getCartDetails();

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="cart">
        <h1 class="cart__title">Корзина</h1>
        <div class="cart__empty">
          <span class="cart__empty-icon">🛒</span>
          <h2>Корзина пуста</h2>
          <p>Добавьте товары из каталога</p>
          <button class="btn btn--primary" onclick="navigateTo('catalog')">Перейти в каталог</button>
        </div>
      </div>
    `;
    return;
  }

  const subtotal = calculateSubtotal(cartItems);
  const discount = activeBonusAmount + (activePromocode?.amount || 0);
  const total = Math.max(0, subtotal - discount);

  let html = `<div class="cart"><h1 class="cart__title">Корзина</h1>`;

  cartItems.forEach((item) => {
    html += `
      <div class="cart__item">
        <div class="cart__item-info">
          <span style="font-size:28px;">${item.image}</span>
          <span class="cart__item-name">${item.name}</span>
          <div class="cart__item-quantity">
            <button onclick="updateQuantity(${item.productId}, ${item.quantity - 1}); renderCart();">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateQuantity(${item.productId}, ${item.quantity + 1}); renderCart();">+</button>
          </div>
          <span>${item.price} ₽</span>
        </div>
        <div class="cart__item-total">${item.total} ₽</div>
        <button class="cart__item-remove" onclick="removeFromCart(${item.productId}); renderCart();">×</button>
      </div>
    `;
  });

  html += `
    <div class="cart__summary">
      <div class="cart__summary-row">
        <span>Сумма заказа</span>
        <span>${subtotal} ₽</span>
      </div>
      ${activeBonusAmount > 0 ? `
        <div class="cart__summary-row">
          <span>Бонусы (списание)</span>
          <span style="color:#28a745;">−${activeBonusAmount} ₽</span>
        </div>
      ` : ''}
      ${activePromocode ? `
        <div class="cart__summary-row">
          <span>Промокод ${activePromocode.code}</span>
          <span style="color:#28a745;">−${activePromocode.amount} ₽</span>
        </div>
      ` : ''}
      <div class="cart__summary-row total">
        <span>Итого</span>
        <span>${total} ₽</span>
      </div>
      <div class="cart__summary-actions">
        <button class="btn btn--primary" onclick="checkout()">Оформить заказ</button>
        <button class="btn btn--outline" onclick="applyPromocode()">Промокод</button>
        <button class="btn btn--outline" onclick="applyBonuses()">Бонусы</button>
        <button class="btn btn--danger" onclick="clearCart(); renderCart();">Очистить</button>
        <button class="btn btn--secondary" onclick="navigateTo('catalog')">Продолжить покупки</button>
      </div>
    </div>
  </div>`;

  container.innerHTML = html;
}

// ============================================================
//  ПРИМЕНЕНИЕ ПРОМОКОДА
// ============================================================

async function applyPromocode() {
  const user = getCurrentUser();
  if (!user) {
    alert('Для применения промокода необходимо авторизоваться');
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('active');
    return;
  }

  const code = prompt('Введите промокод:');
  if (!code) return;

  try {
    const promocode = await getPromocodeByCode(code.trim().toUpperCase());
    if (!promocode) {
      alert('Промокод не найден');
      return;
    }
    if (promocode.is_used) {
      alert('Промокод уже использован');
      return;
    }
    if (promocode.is_cancelled) {
      alert('Промокод отменён администратором');
      return;
    }
    if (promocode.approval_status !== 'approved') {
      alert('Промокод ещё не одобрен администратором');
      return;
    }
    if (promocode.expires_at && new Date(promocode.expires_at) < new Date()) {
      alert('Промокод истёк');
      return;
    }
    if (promocode.user_id && promocode.user_id !== user.id) {
      alert('Промокод привязан к другому пользователю');
      return;
    }

    activePromocode = promocode;
    renderCart();
    alert(`Промокод применён: −${promocode.amount} ₽`);
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// ============================================================
//  ПРИМЕНЕНИЕ БОНУСОВ
// ============================================================

async function applyBonuses() {
  const user = getCurrentUser();
  if (!user) {
    alert('Для использования бонусов необходимо авторизоваться');
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('active');
    return;
  }

  const cartItems = await getCartDetails();
  if (cartItems.length === 0) {
    alert('Корзина пуста');
    return;
  }

  const subtotal = calculateSubtotal(cartItems);
  const maxBonus = Math.floor(subtotal * 0.3);

  if (maxBonus <= 0) {
    alert('Недостаточно товаров для списания бонусов');
    return;
  }

  const balance = await getBonusBalance(user.id);
  if (balance <= 0) {
    alert('У вас нет доступных бонусов');
    return;
  }

  const amount = prompt(
    `Доступно бонусов: ${balance}\nМожно списать до: ${maxBonus} (30% от заказа)\nВведите сумму:`
  );

  if (!amount) return;
  const numAmount = parseInt(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    alert('Введите корректную сумму');
    return;
  }
  if (numAmount > balance) {
    alert('Недостаточно бонусов');
    return;
  }
  if (numAmount > maxBonus) {
    alert(`Можно списать не более ${maxBonus} бонусов (30% от заказа)`);
    return;
  }

  activeBonusAmount = numAmount;
  renderCart();
  alert(`Бонусы применены: −${numAmount} ₽`);
}

// ============================================================
//  ОФОРМЛЕНИЕ ЗАКАЗА
// ============================================================

async function checkout() {
  const user = getCurrentUser();
  if (!user) {
    alert('Для оформления заказа необходимо авторизоваться');
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('active');
    return;
  }

  const cartItems = await getCartDetails();
  if (cartItems.length === 0) {
    alert('Корзина пуста');
    return;
  }

  const subtotal = calculateSubtotal(cartItems);
  const discount = activeBonusAmount + (activePromocode?.amount || 0);
  const totalAfterDiscounts = Math.max(0, subtotal - discount);

  const container = document.getElementById('content');

  const points = await getPickupPoints();
  const activePoints = points.filter((p) => p.is_active !== false);

  if (activePoints.length === 0) {
    alert('Нет доступных пунктов выдачи');
    return;
  }

  const pointsHtml = activePoints
    .map((p) => `<option value="${p.id}">${p.name} — ${p.address}</option>`)
    .join('');

  const itemsHtml = cartItems
    .map(
      (item) =>
        `<div class="item"><span>${item.image} ${item.name} × ${item.quantity}</span><span>${item.total} ₽</span></div>`
    )
    .join('');

  container.innerHTML = `
    <div class="checkout">
      <h1>Оформление заказа</h1>
      <div class="checkout__form">
        <div class="checkout__order-summary">
          <h4 style="margin-bottom:8px;">Состав заказа</h4>
          ${itemsHtml}
          <div class="checkout__total">
            Итого: ${totalAfterDiscounts} ₽
            ${activeBonusAmount > 0 ? `<span style="font-size:14px; color:#28a745;"> (бонусы −${activeBonusAmount} ₽)</span>` : ''}
            ${activePromocode ? `<span style="font-size:14px; color:#28a745;"> (промокод −${activePromocode.amount} ₽)</span>` : ''}
          </div>
        </div>

        <div class="form-group">
          <label>Тип заказа</label>
          <select id="orderType" onchange="toggleDeliveryAddress()">
            <option value="pickup">Самовывоз</option>
            <option value="delivery">Доставка (+150 ₽)</option>
          </select>
        </div>

        <div class="form-group" id="pickupPointGroup">
          <label>Выберите пункт выдачи</label>
          <select id="pickupPoint">${pointsHtml}</select>
        </div>

        <div class="form-group" id="deliveryAddressGroup" style="display:none;">
          <label>Адрес доставки</label>
          <input type="text" id="deliveryAddress" placeholder="ул. Ленина, 15, кв. 42" />
        </div>

        <div class="form-group">
          <label>Ваш номер телефона</label>
          <input type="tel" id="clientPhone" placeholder="+7 (999) 123-45-67" required />
        </div>

        <div class="form-group">
          <label>Комментарий</label>
          <input type="text" id="orderComment" placeholder="Например: без лука" />
        </div>

        <button class="btn btn--success btn--full" onclick="submitOrder()">Подтвердить заказ</button>
        <button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderCart()">Вернуться</button>
      </div>
    </div>
  `;
}

function toggleDeliveryAddress() {
  const orderType = document.getElementById('orderType').value;
  const pickupGroup = document.getElementById('pickupPointGroup');
  const deliveryGroup = document.getElementById('deliveryAddressGroup');

  if (orderType === 'delivery') {
    pickupGroup.style.display = 'none';
    deliveryGroup.style.display = 'block';
  } else {
    pickupGroup.style.display = 'block';
    deliveryGroup.style.display = 'none';
  }
}

async function submitOrder() {
  const user = getCurrentUser();
  if (!user) {
    alert('Необходимо авторизоваться');
    return;
  }

  const orderType = document.getElementById('orderType').value;
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const comment = document.getElementById('orderComment').value.trim() || '';

  if (!clientPhone) {
    alert('Введите номер телефона');
    return;
  }

  let pickupPointId = null;
  let deliveryAddress = null;
  let deliveryCost = 0;

  if (orderType === 'pickup') {
    pickupPointId = parseInt(document.getElementById('pickupPoint').value);
    if (!pickupPointId) {
      alert('Выберите пункт выдачи');
      return;
    }
  } else {
    deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    if (!deliveryAddress) {
      alert('Введите адрес доставки');
      return;
    }
    deliveryCost = 150;
  }

  const cartItems = await getCartDetails();
  if (cartItems.length === 0) {
    alert('Корзина пуста');
    return;
  }

  const subtotal = calculateSubtotal(cartItems);
  const discount = activeBonusAmount + (activePromocode?.amount || 0);
  const totalWithDelivery = subtotal + deliveryCost;
  const finalTotal = Math.max(0, totalWithDelivery - discount);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isLargeOrder = totalQuantity > 30;

  const orderData = {
    user_id: user.id,
    items: cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    total: finalTotal,
    order_type: orderType,
    delivery_address: deliveryAddress,
    delivery_cost: deliveryCost,
    pickup_point_id: pickupPointId,
    status: isLargeOrder ? 'Ожидает подтверждения' : 'Новый',
    client_phone: clientPhone,
    client_name: user.name || user.login,
    comment: comment,
    created_by: user.id,
  };

  try {
    const createdOrder = await createOrder(orderData);

    if (activePromocode) {
      await usePromocode(activePromocode.code, createdOrder.id);
    }

    if (activeBonusAmount > 0) {
      await spendBonuses(user.id, activeBonusAmount, createdOrder.id);
    }

    clearCart();
    alert(
      'Заказ оформлен!' +
        (isLargeOrder ? ' Ожидайте подтверждения оператора.' : '')
    );
    navigateTo('orders');
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// ============================================================
//  ЗАКАЗЫ (С ПОИСКОМ)
// ============================================================

async function renderOrders(searchQuery = '') {
  const container = document.getElementById('content');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="orders">
        <h1 class="orders__title">Мои заказы</h1>
        <p style="color:#999;">Авторизуйтесь для просмотра заказов</p>
        <button class="btn btn--primary" onclick="document.getElementById('authModal').classList.add('active')">Войти</button>
      </div>
    `;
    return;
  }

  try {
    let userOrders = await getOrdersByUser(user.id);

    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.trim();
      userOrders = userOrders.filter((o) => String(o.id).includes(query));
    }

    const products = await getProducts();
    const points = await getPickupPoints();

    const statusLabels = {
      'Новый': 'Новый',
      'Ожидает подтверждения': 'Ожидает подтверждения',
      'Готовится': 'Готовится',
      'Готов к выдаче': 'Готов к выдаче',
      'В пути': 'В пути',
      'Доставлен': 'Доставлен',
      'Выдан': 'Выдан',
      'Отменен': 'Отменен',
      'Возврат': 'Возврат',
    };

    let html = `
      <div class="orders">
        <h1 class="orders__title">Мои заказы</h1>
        
        <div style="margin-bottom:20px; display:flex; gap:8px; flex-wrap:wrap;">
          <input 
            type="text" 
            id="orderSearchInput" 
            placeholder="Поиск по номеру заказа..." 
            value="${searchQuery}"
            style="flex:1; max-width:300px; padding:10px 14px; border:1.5px solid #ddd; border-radius:8px; font-size:14px;"
            onkeypress="if(event.key==='Enter') searchOrders()"
          />
          <button class="btn btn--primary" onclick="searchOrders()">Найти</button>
          ${searchQuery ? `<button class="btn btn--secondary" onclick="renderOrders('')">Сбросить</button>` : ''}
        </div>
    `;

    if (userOrders.length === 0) {
      html += `<p style="color:#999;">${searchQuery ? 'Заказы не найдены' : 'У вас пока нет заказов'}</p>`;
      if (!searchQuery) {
        html += `<button class="btn btn--primary" onclick="navigateTo('catalog')">Перейти в каталог</button>`;
      }
    } else {
      userOrders.forEach((order) => {
        const point = points.find((p) => p.id === order.pickup_point_id);
        const itemsHtml = order.items
          .map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return `${product ? product.name : 'Товар'} × ${item.quantity}`;
          })
          .join('; ');

        const typeLabel =
          order.order_type === 'delivery'
            ? `Доставка: ${order.delivery_address}`
            : `${point ? point.name : 'Пункт выдачи'}`;

        const refundLabel = order.is_refunded
          ? '<span style="color:#28a745; font-weight:600;">Деньги возвращены</span>'
          : '';

        html += `
          <div class="order-card" onclick="showOrderTracking(${order.id})">
            <div class="order-card__header">
              <span class="order-card__id">Заказ #${order.id}</span>
              <span class="order-card__status">${statusLabels[order.status] || order.status}</span>
            </div>
            <div class="order-card__items">${itemsHtml}</div>
            <div class="order-card__meta">${typeLabel}</div>
            ${order.comment ? `<div class="order-card__meta">Комментарий: ${order.comment}</div>` : ''}
            <div class="order-card__total">${order.total} ₽</div>
            ${refundLabel}
            <div class="order-card__meta">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
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

function searchOrders() {
  const query = document.getElementById('orderSearchInput')?.value || '';
  renderOrders(query);
}

// ============================================================
//  ОТСЛЕЖИВАНИЕ ЗАКАЗА
// ============================================================

async function showOrderTracking(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert('Заказ не найден');
      return;
    }

    const products = await getProducts();
    const points = await getPickupPoints();
    const point = points.find((p) => p.id === order.pickup_point_id);

    const itemsHtml = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return `
          <div class="detail-row">
            <span>${product ? product.name : 'Товар'} × ${item.quantity}</span>
            <span>${item.price * item.quantity} ₽</span>
          </div>
        `;
      })
      .join('');

    const statusLabels = {
      'Новый': 'Новый',
      'Ожидает подтверждения': 'Ожидает подтверждения',
      'Готовится': 'Готовится',
      'Готов к выдаче': 'Готов к выдаче',
      'В пути': 'В пути',
      'Доставлен': 'Доставлен',
      'Выдан': 'Выдан',
      'Отменен': 'Отменен',
      'Возврат': 'Возврат',
    };

    const typeInfo =
      order.order_type === 'delivery'
        ? `Доставка: ${order.delivery_address}`
        : `${point ? point.name : 'Пункт выдачи'} — ${point ? point.address : ''}`;

    const refundInfo = order.is_refunded
      ? '<div style="padding:12px 16px; background:#d4edda; border-radius:8px; color:#155724; font-weight:600; margin-bottom:16px;">Деньги возвращены</div>'
      : '';

    const container = document.getElementById('content');
    container.innerHTML = `
      <div class="tracking">
        <h1>Заказ #${order.id}</h1>
        <p style="color:#888; margin-bottom:16px;">Отслеживание статуса</p>
        ${refundInfo}
        <div style="padding:12px 16px; background:#f8f9fa; border-radius:8px; max-width:500px; margin-bottom:16px;">
          <strong>Текущий статус:</strong> ${statusLabels[order.status] || order.status}
        </div>
        <div class="tracking__order-details">
          <h3 style="margin-bottom:8px;">Детали заказа</h3>
          ${itemsHtml}
          <div style="border-top:2px solid #eee; padding-top:8px; margin-top:8px; font-weight:700; font-size:16px;">
            <div class="detail-row">
              <span>Итого</span>
              <span style="color:#F37321;">${order.total} ₽</span>
            </div>
          </div>
          <div class="detail-row" style="margin-top:8px; font-size:13px; color:#888;">
            <span>${typeInfo}</span>
          </div>
          ${order.comment ? `<div class="detail-row" style="font-size:13px; color:#888;"><span>Комментарий: ${order.comment}</span></div>` : ''}
          <div class="detail-row" style="font-size:12px; color:#999; margin-top:8px;">
            ${new Date(order.created_at).toLocaleString('ru-RU')}
          </div>
        </div>
        <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn--secondary" onclick="navigateTo('orders')">Вернуться</button>
          <button class="btn btn--primary" onclick="downloadOrderPDF(${order.id})">Скачать чек PDF</button>
          <button class="btn btn--outline" onclick="createSupportTicket(${order.id})">Написать обращение</button>
        </div>
      </div>
    `;
  } catch (error) {
    alert('Ошибка загрузки заказа: ' + error.message);
  }
}

// ============================================================
//  PDF ЧЕК
// ============================================================

async function downloadOrderPDF(orderId) {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      alert('Заказ не найден');
      return;
    }

    const products = await getProducts();
    const points = await getPickupPoints();
    const point = points.find((p) => p.id === order.pickup_point_id);
    const user = getCurrentUser();

    const statusLabels = {
      'Новый': 'Новый',
      'Ожидает подтверждения': 'Ожидает подтверждения',
      'Готовится': 'Готовится',
      'Готов к выдаче': 'Готов к выдаче',
      'В пути': 'В пути',
      'Доставлен': 'Доставлен',
      'Выдан': 'Выдан',
      'Отменен': 'Отменен',
      'Возврат': 'Возврат',
    };

    // Формируем строки товаров
    let itemsRows = '';
    let subtotal = 0;
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId);
      const name = product ? product.name : 'Товар';
      const total = item.price * item.quantity;
      subtotal += total;
      itemsRows += `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">${name}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${item.quantity}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${item.price} ₽</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${total} ₽</td>
        </tr>
      `;
    }

    // Строки с доставкой/скидкой
    let extraRows = '';
    if (order.delivery_cost > 0) {
      extraRows += `
        <tr>
          <td colspan="3" style="padding:8px; text-align:right;">Доставка:</td>
          <td style="padding:8px; text-align:right;">${order.delivery_cost} ₽</td>
        </tr>
      `;
    }

    const orderTypeText =
      order.order_type === 'delivery'
        ? `Доставка: ${order.delivery_address}`
        : `Самовывоз: ${point ? point.name + ', ' + point.address : 'Пункт выдачи'}`;

    // Создаём HTML для PDF
    const pdfHtml = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Чек заказа #${order.id} — Бердск_pizza</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Roboto', Arial, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #f37321;
          }
          .logo {
            font-size: 32px;
            font-weight: 900;
            color: #1a1a1a;
            margin-bottom: 8px;
          }
          .logo span { color: #f37321; }
          .subtitle {
            font-size: 14px;
            color: #888;
          }
          .receipt-title {
            font-size: 22px;
            font-weight: 700;
            margin: 20px 0;
            text-align: center;
          }
          .order-info {
            background: #f8f9fa;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.8;
          }
          .order-info-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .order-info-row strong {
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f5f5f5;
            padding: 10px 8px;
            text-align: left;
            font-size: 13px;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
            border-bottom: 2px solid #ddd;
          }
          th:first-child { text-align: left; }
          th:nth-child(2) { text-align: center; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          .total-block {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 2px solid #ddd;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 15px;
          }
          .total-row.grand-total {
            font-size: 22px;
            font-weight: 700;
            color: #f37321;
            padding-top: 12px;
            border-top: 2px solid #f37321;
            margin-top: 8px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            background: #f37321;
            color: #fff;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍕 <span>БЕРДСК</span>_PIZZA</div>
          <div class="subtitle">Доставка пиццы в Бердске</div>
        </div>

        <div class="receipt-title">Чек заказа #${order.id}</div>

        <div class="order-info">
          <div class="order-info-row"><strong>Дата:</strong> <span>${new Date(order.created_at).toLocaleString('ru-RU')}</span></div>
          <div class="order-info-row"><strong>Клиент:</strong> <span>${order.client_name}</span></div>
          <div class="order-info-row"><strong>Телефон:</strong> <span>${order.client_phone}</span></div>
          <div class="order-info-row"><strong>Тип заказа:</strong> <span>${orderTypeText}</span></div>
          <div class="order-info-row"><strong>Статус:</strong> <span class="status-badge">${statusLabels[order.status] || order.status}</span></div>
          ${order.comment ? `<div class="order-info-row"><strong>Комментарий:</strong> <span>${order.comment}</span></div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="total-block">
          <div class="total-row">
            <span>Подытог:</span>
            <span>${subtotal} ₽</span>
          </div>
          ${order.delivery_cost > 0 ? `
            <div class="total-row">
              <span>Доставка:</span>
              <span>${order.delivery_cost} ₽</span>
            </div>
          ` : ''}
          ${order.is_refunded ? `
            <div class="total-row" style="color:#28a745;">
              <span>Возврат:</span>
              <span>${order.refund_amount} ₽</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Итого:</span>
            <span>${order.total} ₽</span>
          </div>
        </div>

        <div class="footer">
          <p>Спасибо за заказ! 🍕</p>
          <p>© ${new Date().getFullYear()} Бердск_pizza. Все права защищены.</p>
        </div>

        <div class="no-print" style="text-align:center; margin-top:30px;">
          <button onclick="window.print()" style="padding:12px 32px; background:#f37321; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:600;">
            Сохранить как PDF
          </button>
        </div>
      </body>
      </html>
    `;

    // Открываем окно для печати/сохранения
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(pdfHtml);
    printWindow.document.close();
  } catch (error) {
    alert('Ошибка генерации PDF: ' + error.message);
  }
}

// ============================================================
//  БОНУСЫ
// ============================================================

async function renderBonuses() {
  const container = document.getElementById('content');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="bonuses">
        <h1>Мои бонусы</h1>
        <p style="color:#999;">Авторизуйтесь для просмотра бонусов</p>
        <button class="btn btn--primary" onclick="document.getElementById('authModal').classList.add('active')">Войти</button>
      </div>
    `;
    return;
  }

  try {
    const balance = await getBonusBalance(user.id);
    const transactions = await getBonusTransactions(user.id);

    const typeMap = {
      accrued: 'Начисление',
      spent: 'Списание',
      expired: 'Сгорели',
      refunded: 'Возврат',
    };

    const historyHtml = transactions
      .slice(0, 20)
      .map((tx) => {
        const sign = tx.amount > 0 ? '+' : '';
        const cls = tx.amount > 0 ? 'positive' : 'negative';
        return `
          <div class="item">
            <span>${typeMap[tx.type] || tx.type} ${tx.description ? `— ${tx.description}` : ''}</span>
            <span class="amount ${cls}">${sign}${tx.amount}</span>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="bonuses">
        <h1>Мои бонусы</h1>
        <div class="bonuses__balance">
          <div class="label">Текущий баланс</div>
          <div class="amount">${balance}</div>
          <div class="bonuses__expires">Бонусы сгорают через 60 дней</div>
        </div>
        <div class="bonuses__history">
          <h3 style="margin-bottom:12px;">История операций</h3>
          ${historyHtml || '<p style="color:#999;">История пуста</p>'}
        </div>
        <button class="btn btn--secondary" onclick="navigateTo('catalog')" style="margin-top:16px;">Вернуться</button>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">Ошибка: ${error.message}</p>`;
  }
}

// ============================================================
//  ОБРАЩЕНИЯ (ТИКЕТЫ С ОБРАТНОЙ СВЯЗЬЮ)
// ============================================================

async function renderSupport() {
  const container = document.getElementById('content');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="bonuses">
        <h1>Обращения</h1>
        <p style="color:#999;">Авторизуйтесь для просмотра обращений</p>
        <button class="btn btn--primary" onclick="document.getElementById('authModal').classList.add('active')">Войти</button>
      </div>
    `;
    return;
  }

  try {
    const tickets = await getTicketsByUser(user.id);

    const statusLabels = {
      'Новое': 'Новое',
      'В работе': 'В работе',
      'Ожидает клиента': 'Ожидает вашего ответа',
      'Решено': 'Решено',
      'Отклонено': 'Отклонено',
    };

    const statusColors = {
      'Новое': '#fff3cd',
      'В работе': '#ffe0b2',
      'Ожидает клиента': '#bbdefb',
      'Решено': '#c8e6c9',
      'Отклонено': '#ffcdd2',
    };

    const resolutionLabels = {
      'promocode': 'Выдан промокод',
      'refund': 'Возврат средств',
      'partial_refund': 'Частичный возврат',
      'rejection': 'Отказ в компенсации',
      'none': 'Без компенсации',
    };

    let html = `
      <div class="bonuses">
        <h1>Мои обращения</h1>
        <button class="btn btn--primary" onclick="showCreateTicketForm()" style="margin-bottom:20px;">Создать обращение</button>
    `;

    if (tickets.length === 0) {
      html += `<p style="color:#999;">У вас нет обращений</p>`;
    } else {
      tickets.forEach((t) => {
        const statusColor = statusColors[t.status] || '#eee';

        html += `
          <div style="background:#fff; padding:20px; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <strong style="font-size:16px;">${t.subject}</strong>
              <span style="padding:2px 12px; border-radius:20px; font-size:13px; background:${statusColor};">${statusLabels[t.status] || t.status}</span>
            </div>
            <div style="font-size:14px; color:#555; margin-bottom:8px;">${t.description}</div>
            
            ${t.resolution ? `
              <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-top:12px; font-size:14px;">
                <strong>Решение оператора:</strong> ${t.resolution}
                ${t.compensation_amount > 0 ? `<div style="color:#28a745; margin-top:4px;">Компенсация: ${t.compensation_amount} ₽</div>` : ''}
              </div>
            ` : ''}
            
            ${t.promocode_id ? `
              <div style="margin-top:8px;">
                <button class="btn btn--outline btn--small" onclick="viewMyPromocode(${t.promocode_id})">Посмотреть промокод</button>
              </div>
            ` : ''}
            
            <div style="font-size:12px; color:#999; margin-top:8px;">
              ${new Date(t.created_at).toLocaleString('ru-RU')}
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

async function viewMyPromocode(promocodeId) {
  try {
    const promo = await getPromocode(promocodeId);
    if (!promo) {
      alert('Промокод не найден');
      return;
    }
    alert(
      `Ваш промокод: ${promo.code}\n` +
      `Сумма: ${promo.amount} ₽\n` +
      `Действует до: ${promo.expires_at ? new Date(promo.expires_at).toLocaleDateString('ru-RU') : 'бессрочно'}\n` +
      `Использован: ${promo.is_used ? 'Да' : 'Нет'}\n\n` +
      `Скопируйте код и введите его в корзине при оформлении заказа.`
    );
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

function showCreateTicketForm(orderId = null) {
  const container = document.getElementById('content');

  const orderSelect = orderId
    ? `<input type="hidden" id="ticketOrderId" value="${orderId}" />`
    : `<div class="form-group">
        <label>Номер заказа (необязательно)</label>
        <input type="number" id="ticketOrderId" placeholder="Например: 123" />
      </div>`;

  container.innerHTML = `
    <div class="bonuses">
      <h1>Новое обращение</h1>
      <div style="background:#fff; padding:24px; border-radius:16px; max-width:500px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        ${orderSelect}
        <div class="form-group">
          <label>Тема</label>
          <input type="text" id="ticketSubject" placeholder="Например: Проблема с заказом" />
        </div>
        <div class="form-group">
          <label>Описание</label>
          <textarea id="ticketDescription" rows="4" placeholder="Опишите вашу проблему"></textarea>
        </div>
        <button class="btn btn--primary btn--full" onclick="submitTicket()">Отправить</button>
        <button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderSupport()">Назад</button>
      </div>
    </div>
  `;
}

async function createSupportTicket(orderId) {
  showCreateTicketForm(orderId);
}

async function submitTicket() {
  const user = getCurrentUser();
  if (!user) {
    alert('Необходимо авторизоваться');
    return;
  }

  const orderId = document.getElementById('ticketOrderId')?.value;
  const subject = document.getElementById('ticketSubject').value.trim();
  const description = document.getElementById('ticketDescription').value.trim();

  if (!subject || !description) {
    alert('Заполните тему и описание');
    return;
  }

  try {
    await createTicket({
      order_id: orderId ? parseInt(orderId) : null,
      client_id: user.id,
      subject: subject,
      description: description,
      status: 'Новое',
    });
    alert('Обращение отправлено. Ожидайте ответа оператора.');
    renderSupport();
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================

loadCart();
updateCartCount();

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.header__link[data-page]').forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
    });
  });

  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    const user = getCurrentUser();
    if (user) {
      authBtn.textContent = 'Выйти';
      authBtn.className = 'btn btn--secondary';
      authBtn.onclick = logout;
    } else {
      authBtn.textContent = 'Войти';
      authBtn.className = 'btn btn--primary';
      authBtn.onclick = function () {
        document.getElementById('authModal').classList.add('active');
      };
    }
  }

  renderCatalog();
  initAuthUI();
  console.log('Бердск_pizza загружена');
});

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.navigateTo = navigateTo;
window.renderCatalog = renderCatalog;
window.renderCart = renderCart;
window.renderOrders = renderOrders;
window.renderBonuses = renderBonuses;
window.renderSupport = renderSupport;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.checkout = checkout;
window.submitOrder = submitOrder;
window.toggleDeliveryAddress = toggleDeliveryAddress;
window.applyPromocode = applyPromocode;
window.applyBonuses = applyBonuses;
window.showOrderTracking = showOrderTracking;
window.createSupportTicket = createSupportTicket;
window.submitTicket = submitTicket;
window.searchOrders = searchOrders;
window.downloadOrderPDF = downloadOrderPDF;
window.viewMyPromocode = viewMyPromocode;
