// ============================================================
//  BERDSK_PIZZA — КЛИЕНТ
//  Каталог, корзина, заказы, бонусы
// ============================================================

// ===== НАВИГАЦИЯ =====
function navigateTo(page) {
  const links = document.querySelectorAll(".header__link[data-page]");
  links.forEach((link) => link.classList.remove("active"));
  const activeLink = document.querySelector(
    `.header__link[data-page="${page}"]`,
  );
  if (activeLink) activeLink.classList.add("active");

  switch (page) {
    case "catalog":
      renderCatalog();
      break;
    case "cart":
      renderCart();
      break;
    case "orders":
      renderOrders();
      break;
    case "bonuses":
      renderBonuses();
      break;
    default:
      renderCatalog();
  }
}

// ===== КАТАЛОГ =====
async function renderCatalog(category = "Все") {
  const container = document.getElementById("content");
  if (!container) return;

  try {
    const products = await getProducts();
    const categories = ["Все", ...new Set(products.map((p) => p.category))];

    let filtered = products;
    if (category !== "Все") {
      filtered = products.filter((p) => p.category === category);
    }

    const user = getCurrentUser();
    let html = `
      <div class="catalog">
        <div class="catalog__greeting">🍕 Привет, ${user ? user.name : "гость"}!</div>
        <div class="catalog__subtitle">Что сегодня закажешь?</div>
        <div class="catalog__categories">
    `;

    categories.forEach((cat) => {
      const active = cat === category ? "active" : "";
      html += `<button class="catalog__category ${active}" onclick="renderCatalog('${cat}')">${cat}</button>`;
    });

    html += `</div><div class="catalog__grid">`;

    filtered.forEach((product) => {
      html += `
        <div class="product-card">
          <div class="product-card__image">${product.image || "🍕"}</div>
          <div class="product-card__body">
            <div class="product-card__name">${product.name}</div>
            <div class="product-card__description">${product.description || ""}</div>
            <div class="product-card__bottom">
              <span class="product-card__price">${product.price} ₽</span>
              <button class="product-card__add" onclick="addToCart(${product.id}); updateCartCount();">+ В корзину</button>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">⚠️ Ошибка: ${error.message}</p>`;
  }
}

// ===== КОРЗИНА =====
let cart = [];

function loadCart() {
  const saved = localStorage.getItem("berdskCart");
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
  localStorage.setItem("berdskCart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = total;
}

function addToCart(productId, quantity = 1) {
  const existing = cart.find((item) => item.productId === productId);
  if (existing) {
    if (existing.quantity + quantity > 30) {
      alert("⚠️ Нельзя заказать больше 30 штук одного товара");
      return;
    }
    existing.quantity += quantity;
  } else {
    if (quantity > 30) {
      alert("⚠️ Нельзя заказать больше 30 штук одного товара");
      return;
    }
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
  if (quantity > 30) {
    alert("⚠️ Нельзя заказать больше 30 штук одного товара");
    return;
  }
  const item = cart.find((item) => item.productId === productId);
  if (item) {
    item.quantity = quantity;
    saveCart();
  }
}

function clearCart() {
  cart = [];
  saveCart();
}

async function getCartDetails() {
  const products = await getProducts();
  const details = [];
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      details.push({
        ...item,
        name: product.name,
        price: product.price,
        image: product.image || "🍕",
        total: item.quantity * product.price,
      });
    }
  }
  return details;
}

function calculateTotal(details) {
  return details.reduce((sum, item) => sum + item.total, 0);
}

async function renderCart() {
  const container = document.getElementById("content");
  if (!container) return;

  const cartItems = await getCartDetails();

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="cart">
        <h1 class="cart__title">🛒 Корзина</h1>
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

  const total = calculateTotal(cartItems);
  let html = `<div class="cart"><h1 class="cart__title">🛒 Корзина</h1>`;
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
        <button class="cart__item-remove" onclick="removeFromCart(${item.productId}); renderCart();">✕</button>
      </div>
    `;
  });

  html += `
      <div class="cart__summary">
        <div class="cart__summary-row"><span>Товаров: ${cartItems.length}</span><span>${total} ₽</span></div>
        <div class="cart__summary-row total"><span>Итого</span><span>${total} ₽</span></div>
        <div class="cart__summary-actions">
          <button class="btn btn--primary" onclick="checkout()">📦 Оформить заказ</button>
          <button class="btn btn--danger" onclick="clearCart(); renderCart();">🧹 Очистить</button>
          <button class="btn btn--secondary" onclick="navigateTo('catalog')">← Продолжить покупки</button>
        </div>
      </div>
    </div>`;
  container.innerHTML = html;
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
async function checkout() {
  const user = getCurrentUser();
  if (!user) {
    alert("⚠️ Для оформления заказа необходимо авторизоваться");
    document.getElementById("authModal").classList.add("active");
    return;
  }

  const points = await getPickupPoints();
  if (points.length === 0) {
    alert("❌ Нет доступных пунктов выдачи");
    return;
  }

  const cartItems = await getCartDetails();
  if (cartItems.length === 0) {
    alert("❌ Корзина пуста");
    return;
  }

  const total = calculateTotal(cartItems);

  let itemsHtml = cartItems
    .map(
      (item) => `
    <div class="item"><span>${item.image} ${item.name} × ${item.quantity}</span><span>${item.total} ₽</span></div>
  `,
    )
    .join("");

  const container = document.getElementById("content");
  container.innerHTML = `
    <div class="checkout">
      <h1>📦 Оформление заказа</h1>
      <div class="checkout__form">
        <div class="checkout__order-summary">
          <h4 style="margin-bottom:8px;">📋 Состав заказа</h4>
          ${itemsHtml}
          <div class="checkout__total">Итого: ${total} ₽</div>
        </div>
        <div class="form-group">
          <label>📍 Выберите пункт выдачи</label>
          <select id="pickupPoint">${points.map((p) => `<option value="${p.id}">${p.name} — ${p.address}</option>`).join("")}</select>
        </div>
        <div class="form-group">
          <label>📞 Ваш номер телефона</label>
          <input type="tel" id="clientPhone" placeholder="+7 (999) 123-45-67" required />
        </div>
        <div class="form-group">
          <label>💬 Комментарий к заказу</label>
          <input type="text" id="orderComment" placeholder="Например: без лука" />
        </div>
        <button class="btn btn--success btn--full" onclick="submitOrder()">✅ Подтвердить заказ и оплатить</button>
        <button class="btn btn--secondary btn--full" style="margin-top:8px;" onclick="renderCart()">← Вернуться</button>
      </div>
    </div>`;
}

async function submitOrder() {
  const user = getCurrentUser();
  const pickupPointId = parseInt(document.getElementById("pickupPoint").value);
  const clientPhone = document.getElementById("clientPhone").value.trim();
  const comment = document.getElementById("orderComment").value.trim() || "";
  const cartItems = await getCartDetails();
  const total = calculateTotal(cartItems);

  if (!clientPhone) {
    alert("⚠️ Введите номер телефона");
    return;
  }
  if (cartItems.length === 0) {
    alert("❌ Корзина пуста");
    return;
  }

  // Проверка на >30 шт
  let isLargeOrder = false;
  for (const item of cartItems) {
    if (item.quantity > 30) isLargeOrder = true;
  }

  const orderData = {
    user_id: user.id,
    items: cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
    total: total,
    pickup_point_id: pickupPointId,
    status: isLargeOrder ? "Ожидает подтверждения" : "Новый",
    client_phone: clientPhone,
    client_name: user.name || user.login,
    comment: comment,
  };

  try {
    await createOrder(orderData);
    clearCart();
    alert("✅ Заказ оформлен!");
    navigateTo("orders");
  } catch (error) {
    alert("❌ Ошибка: " + error.message);
  }
}

// ===== ЗАКАЗЫ =====
async function renderOrders() {
  const container = document.getElementById("content");
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1><p style="color:#999;">Авторизуйтесь для просмотра заказов</p></div>`;
    return;
  }

  try {
    const allOrders = await getOrders();
    const userOrders = allOrders
      .filter((o) => o.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (userOrders.length === 0) {
      container.innerHTML = `<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1><p style="color:#999;">У вас пока нет заказов</p></div>`;
      return;
    }

    const products = await getProducts();
    const points = await getPickupPoints();

    let html = `<div class="orders"><h1 class="orders__title">📋 Мои заказы</h1>`;
    for (const order of userOrders) {
      const point = points.find((p) => p.id === order.pickup_point_id);
      const statusLabels = {
        Новый: "🟡 Новый",
        "Ожидает подтверждения": "🟠 Ожидает",
        Готовится: "🟠 Готовится",
        "Готов к выдаче": "🟢 Готов",
        "В пути": "🔵 В пути",
        Доставлен: "✅ Доставлен",
        Выдан: "✅ Выдан",
        Отменен: "❌ Отменен",
        Возврат: "🔄 Возврат",
      };
      const itemsHtml = order.items
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return `${product ? product.name : "Товар"} × ${item.quantity}`;
        })
        .join("; ");

      html += `
        <div class="order-card" onclick="showOrderTracking(${order.id})">
          <div class="order-card__header">
            <span class="order-card__id">Заказ #${order.id}</span>
            <span class="order-card__status">${statusLabels[order.status] || order.status}</span>
          </div>
          <div class="order-card__items">${itemsHtml}</div>
          <div class="order-card__meta">📍 ${point ? point.name : "Неизвестный пункт"} ${order.comment ? "💬 " + order.comment : ""}</div>
          <div class="order-card__total">${order.total} ₽</div>
          <div class="order-card__meta">📅 ${new Date(order.created_at).toLocaleString()}</div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ===== БОНУСЫ =====
async function renderBonuses() {
  const container = document.getElementById("content");
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="bonuses"><h1>🎁 Мои бонусы</h1><p style="color:#999;">Авторизуйтесь для просмотра бонусов</p></div>`;
    return;
  }

  try {
    const balance = await getBonusBalance(user.id);
    const transactions = await getBonusTransactions(user.id);
    const sorted = transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    let historyHtml = sorted
      .map((tx) => {
        const sign = tx.amount > 0 ? "+" : "";
        const cls = tx.amount > 0 ? "positive" : "negative";
        const typeMap = {
          accrued: "Начисление",
          spent: "Списание",
          expired: "Сгорели",
          refunded: "Возврат",
        };
        return `<div class="item"><span>${typeMap[tx.type] || tx.type}</span><span class="amount ${cls}">${sign}${tx.amount}</span></div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="bonuses">
        <h1>🎁 Мои бонусы</h1>
        <div class="bonuses__balance">
          <div class="label">Текущий баланс</div>
          <div class="amount">${balance}</div>
          <div class="bonuses__expires">Бонусы сгорают через 60 дней</div>
        </div>
        <div class="bonuses__history">
          <h3 style="margin-bottom:12px;">История операций</h3>
          ${historyHtml || '<p style="color:#999;">История пуста</p>'}
        </div>
        <button class="btn btn--secondary" onclick="navigateTo('catalog')" style="margin-top:16px;">← Вернуться</button>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p style="color:#dc3545;">❌ Ошибка: ${error.message}</p>`;
  }
}

// ===== ОТСЛЕЖИВАНИЕ ЗАКАЗА (упрощенно) =====
async function showOrderTracking(orderId) {
  try {
    const order = await getOrder(orderId);
    const products = await getProducts();
    const points = await getPickupPoints();

    const point = points.find((p) => p.id === order.pickup_point_id);
    const itemsHtml = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return `<div class="detail-row"><span>${product ? product.name : "Товар"} × ${item.quantity}</span><span>${item.price * item.quantity} ₽</span></div>`;
      })
      .join("");

    const statusLabels = {
      Новый: "🟡 Новый",
      "Ожидает подтверждения": "🟠 Ожидает подтверждения",
      Готовится: "🟠 Готовится",
      "Готов к выдаче": "🟢 Готов к выдаче",
      "В пути": "🔵 В пути",
      Доставлен: "✅ Доставлен",
      Выдан: "✅ Выдан",
      Отменен: "❌ Отменен",
      Возврат: "🔄 Возврат",
    };

    const container = document.getElementById("content");
    container.innerHTML = `
      <div class="tracking">
        <h1>📦 Заказ #${order.id}</h1>
        <p style="color:#888; margin-bottom:16px;">Отслеживание статуса</p>
        <div style="padding:12px 16px; background:#f8f9fa; border-radius:8px; max-width:500px;">
          <strong>Текущий статус:</strong> ${statusLabels[order.status] || order.status}
        </div>
        <div class="tracking__order-details" style="margin-top:16px; background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; max-width:500px;">
          <h3 style="margin-bottom:8px;">📋 Детали заказа</h3>
          ${itemsHtml}
          <div style="border-top:2px solid #eee; padding-top:8px; margin-top:8px; font-weight:700; font-size:16px;">
            <div class="detail-row"><span>Итого</span><span style="color:#F37321;">${order.total} ₽</span></div>
          </div>
          <div class="detail-row" style="margin-top:8px; font-size:13px; color:#888;">
            <span>📍 ${point ? point.name : "Неизвестный пункт"}</span>
            <span>${point ? point.address : ""}</span>
          </div>
          ${order.comment ? `<div class="detail-row" style="font-size:13px; color:#888;"><span>💬 ${order.comment}</span></div>` : ""}
          <div class="detail-row" style="font-size:12px; color:#999;">📅 ${new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn--secondary" onclick="navigateTo('orders')">← Вернуться к заказам</button>
          <button class="btn btn--primary" onclick="window.print()">🖨️ Распечатать</button>
        </div>
      </div>
    `;
  } catch (error) {
    alert("❌ Ошибка загрузки заказа: " + error.message);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
loadCart();
updateCartCount();

document.addEventListener("DOMContentLoaded", function () {
  document
    .querySelectorAll(".header__link[data-page]")
    .forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        navigateTo(this.dataset.page);
      });
    });
  renderCatalog();
  initAuthUI();
  console.log("🍕 Бердск_pizza загружена");
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
