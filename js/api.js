// ============================================================
//  BERDSK_PIZZA — SUPABASE API
//  Полностью переписанный модуль
// ============================================================

const SUPABASE_URL = "https://nymcnpnoxmpyyztcncvf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bWNucG5veG1weXl6dGNuY3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODczMDYsImV4cCI6MjEwMzY2MzMwNn0.sU0EVcmEDlEvuzBTTmMv9iZRtA8x05FIzGcrvlbICM0";

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Хеширование пароля SHA-256 (на фронтенде)
 * Нужно для совместимости с БД (там тоже SHA-256)
 */
async function hashPasswordFrontend(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Базовый запрос к Supabase REST API
 */
async function supabaseRequest(endpoint, method = "GET", body = null) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const options = {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error [${method} ${endpoint}]:`, errorText);
      throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
    }

    // Для DELETE запросов может не быть тела ответа
    if (response.status === 204 || method === "DELETE") {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Supabase request failed:", error);
    throw error;
  }
}

/**
 * Сериализация JSONB полей для отправки в Supabase
 */
function serializeJsonb(data) {
  const result = { ...data };
  if (result.items && typeof result.items === "object") {
    result.items = JSON.stringify(result.items);
  }
  return result;
}

/**
 * Десериализация JSONB полей из ответа Supabase
 */
function deserializeJsonb(record) {
  if (!record) return null;
  const result = { ...record };
  if (result.items && typeof result.items === "string") {
    try {
      result.items = JSON.parse(result.items);
    } catch (e) {
      result.items = [];
    }
  }
  return result;
}

// ============================================================
//  USERS
// ============================================================

async function getUsers() {
  return supabaseRequest("/users?select=*&order=id");
}

async function getUser(id) {
  const result = await supabaseRequest(`/users?id=eq.${id}&select=*`);
  return result[0] || null;
}

async function getUserByLogin(login) {
  const result = await supabaseRequest(
    `/users?login=eq.${encodeURIComponent(login)}&select=*`
  );
  return result[0] || null;
}

async function createUser(data) {
  const userData = {
    login: data.login,
    password: data.password, // уже хешированный
    role: data.role || "client",
    name: data.name,
    phone: data.phone || null,
    is_blocked: false,
  };
  const result = await supabaseRequest("/users", "POST", userData);
  return result[0] || result;
}

async function updateUser(id, data) {
  const result = await supabaseRequest(`/users?id=eq.${id}`, "PATCH", data);
  return result[0] || result;
}

async function deleteUser(id) {
  return supabaseRequest(`/users?id=eq.${id}`, "DELETE");
}

// ============================================================
//  PRODUCTS
// ============================================================

async function getProducts() {
  const result = await supabaseRequest(
    "/products?select=*&order=sort_order"
  );
  return result || [];
}

async function getProduct(id) {
  const result = await supabaseRequest(`/products?id=eq.${id}&select=*`);
  return result[0] || null;
}

async function createProduct(data) {
  const productData = {
    name: data.name,
    price: data.price,
    category: data.category,
    image: data.image || "🍕",
    description: data.description || "",
    is_stopped: data.is_stopped || false,
    is_active: data.is_active !== undefined ? data.is_active : true,
    sort_order: data.sort_order || 0,
  };
  const result = await supabaseRequest("/products", "POST", productData);
  return result[0] || result;
}

async function updateProduct(id, data) {
  const result = await supabaseRequest(
    `/products?id=eq.${id}`,
    "PATCH",
    data
  );
  return result[0] || result;
}

async function deleteProduct(id) {
  return supabaseRequest(`/products?id=eq.${id}`, "DELETE");
}

// ============================================================
//  PICKUP POINTS
// ============================================================

async function getPickupPoints() {
  const result = await supabaseRequest("/pickup_points?select=*&order=id");
  return result || [];
}

async function getPickupPoint(id) {
  const result = await supabaseRequest(
    `/pickup_points?id=eq.${id}&select=*`
  );
  return result[0] || null;
}

async function createPickupPoint(data) {
  const pointData = {
    name: data.name,
    address: data.address,
    phone: data.phone || null,
    work_hours: data.work_hours || "10:00 - 22:00",
    is_active: data.is_active !== undefined ? data.is_active : true,
  };
  const result = await supabaseRequest("/pickup_points", "POST", pointData);
  return result[0] || result;
}

async function updatePickupPoint(id, data) {
  const result = await supabaseRequest(
    `/pickup_points?id=eq.${id}`,
    "PATCH",
    data
  );
  return result[0] || result;
}

async function deletePickupPoint(id) {
  return supabaseRequest(`/pickup_points?id=eq.${id}`, "DELETE");
}

// ============================================================
//  ORDERS
// ============================================================

async function getOrders() {
  const result = await supabaseRequest("/orders?select=*&order=id.desc");
  return result ? result.map(deserializeJsonb) : [];
}

async function getOrder(id) {
  const result = await supabaseRequest(`/orders?id=eq.${id}&select=*`);
  return result[0] ? deserializeJsonb(result[0]) : null;
}

async function getOrdersByUser(userId) {
  const result = await supabaseRequest(
    `/orders?user_id=eq.${userId}&select=*&order=id.desc`
  );
  return result ? result.map(deserializeJsonb) : [];
}

async function getOrdersByStatus(status) {
  const result = await supabaseRequest(
    `/orders?status=eq.${encodeURIComponent(status)}&select=*&order=id`
  );
  return result ? result.map(deserializeJsonb) : [];
}

async function createOrder(data) {
  const orderData = {
    user_id: data.user_id,
    items: data.items, // будет сериализовано ниже
    total: data.total,
    order_type: data.order_type || "pickup",
    delivery_address: data.delivery_address || null,
    delivery_cost: data.delivery_cost || 0,
    pickup_point_id: data.pickup_point_id || null,
    status: data.status || "Новый",
    client_phone: data.client_phone,
    client_name: data.client_name,
    comment: data.comment || null,
    created_by: data.created_by || data.user_id,
  };

  const serialized = serializeJsonb(orderData);
  const result = await supabaseRequest("/orders", "POST", serialized);
  return result[0] ? deserializeJsonb(result[0]) : result;
}

async function updateOrder(id, data) {
  const serialized = serializeJsonb(data);
  const result = await supabaseRequest(
    `/orders?id=eq.${id}`,
    "PATCH",
    serialized
  );
  return result[0] ? deserializeJsonb(result[0]) : result;
}

async function deleteOrder(id) {
  return supabaseRequest(`/orders?id=eq.${id}`, "DELETE");
}

// ============================================================
//  ORDER HISTORY
// ============================================================

async function getOrderHistory(orderId) {
  const result = await supabaseRequest(
    `/order_history?order_id=eq.${orderId}&select=*&order=changed_at.desc`
  );
  return result || [];
}

async function createOrderHistory(data) {
  const historyData = {
    order_id: data.order_id,
    user_id: data.user_id || null,
    old_status: data.old_status || null,
    new_status: data.new_status,
    comment: data.comment || null,
  };
  const result = await supabaseRequest("/order_history", "POST", historyData);
  return result[0] || result;
}

// ============================================================
//  TICKETS
// ============================================================

async function getTickets() {
  const result = await supabaseRequest("/tickets?select=*&order=id.desc");
  return result || [];
}

async function getTicket(id) {
  const result = await supabaseRequest(`/tickets?id=eq.${id}&select=*`);
  return result[0] || null;
}

async function getTicketsByUser(userId) {
  const result = await supabaseRequest(
    `/tickets?client_id=eq.${userId}&select=*&order=id.desc`
  );
  return result || [];
}

async function createTicket(data) {
  const ticketData = {
    order_id: data.order_id || null,
    client_id: data.client_id,
    subject: data.subject,
    description: data.description,
    status: data.status || "Новое",
  };
  const result = await supabaseRequest("/tickets", "POST", ticketData);
  return result[0] || result;
}

async function updateTicket(id, data) {
  const result = await supabaseRequest(`/tickets?id=eq.${id}`, "PATCH", data);
  return result[0] || result;
}

// ============================================================
//  PROMOCODES
// ============================================================

async function getPromocodes() {
  const result = await supabaseRequest("/promocodes?select=*&order=id.desc");
  return result || [];
}

async function getPromocode(id) {
  const result = await supabaseRequest(`/promocodes?id=eq.${id}&select=*`);
  return result[0] || null;
}

async function getPromocodeByCode(code) {
  const result = await supabaseRequest(
    `/promocodes?code=eq.${encodeURIComponent(code)}&select=*`
  );
  return result[0] || null;
}

async function createPromocode(data) {
  const promoData = {
    code: data.code,
    user_id: data.user_id || null,
    amount: data.amount,
    is_used: false,
    expires_at: data.expires_at || null,
    created_by: data.created_by || null,
  };
  const result = await supabaseRequest("/promocodes", "POST", promoData);
  return result[0] || result;
}

async function updatePromocode(id, data) {
  const result = await supabaseRequest(
    `/promocodes?id=eq.${id}`,
    "PATCH",
    data
  );
  return result[0] || result;
}

async function deletePromocode(id) {
  return supabaseRequest(`/promocodes?id=eq.${id}`, "DELETE");
}

async function usePromocode(code, orderId) {
  const promocode = await getPromocodeByCode(code);
  if (!promocode) {
    throw new Error("Промокод не найден");
  }
  if (promocode.is_used) {
    throw new Error("Промокод уже использован");
  }
  if (promocode.expires_at && new Date(promocode.expires_at) < new Date()) {
    throw new Error("Промокод истёк");
  }

  await updatePromocode(promocode.id, {
    is_used: true,
    used_at: new Date().toISOString(),
    used_order_id: orderId,
  });

  return promocode;
}

// ============================================================
//  BONUS TRANSACTIONS
// ============================================================

async function getBonusTransactions(userId) {
  const result = await supabaseRequest(
    `/bonus_transactions?user_id=eq.${userId}&select=*&order=created_at.desc`
  );
  return result || [];
}

async function createBonusTransaction(data) {
  const bonusData = {
    user_id: data.user_id,
    order_id: data.order_id || null,
    amount: data.amount,
    type: data.type,
    description: data.description || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
    expires_at: data.expires_at || null,
  };
  const result = await supabaseRequest(
    "/bonus_transactions",
    "POST",
    bonusData
  );
  return result[0] || result;
}

async function updateBonusTransaction(id, data) {
  const result = await supabaseRequest(
    `/bonus_transactions?id=eq.${id}`,
    "PATCH",
    data
  );
  return result[0] || result;
}

async function getBonusBalance(userId) {
  const result = await supabaseRequest(
    `/bonus_transactions?user_id=eq.${userId}&is_active=eq.true&type=in.(accrued,refunded)&select=amount`
  );
  if (!result) return 0;
  return result.reduce((sum, tx) => sum + (tx.amount || 0), 0);
}

async function spendBonuses(userId, amount, orderId) {
  const balance = await getBonusBalance(userId);
  if (amount > balance) {
    throw new Error("Недостаточно бонусов");
  }
  return createBonusTransaction({
    user_id: userId,
    order_id: orderId,
    amount: -amount,
    type: "spent",
    description: `Списание бонусов за заказ #${orderId}`,
    is_active: true,
  });
}

// ============================================================
//  ЭКСПОРТ
// ============================================================

window.hashPasswordFrontend = hashPasswordFrontend;
window.supabaseRequest = supabaseRequest;
window.serializeJsonb = serializeJsonb;
window.deserializeJsonb = deserializeJsonb;

window.getUsers = getUsers;
window.getUser = getUser;
window.getUserByLogin = getUserByLogin;
window.createUser = createUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;

window.getProducts = getProducts;
window.getProduct = getProduct;
window.createProduct = createProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;

window.getPickupPoints = getPickupPoints;
window.getPickupPoint = getPickupPoint;
window.createPickupPoint = createPickupPoint;
window.updatePickupPoint = updatePickupPoint;
window.deletePickupPoint = deletePickupPoint;

window.getOrders = getOrders;
window.getOrder = getOrder;
window.getOrdersByUser = getOrdersByUser;
window.getOrdersByStatus = getOrdersByStatus;
window.createOrder = createOrder;
window.updateOrder = updateOrder;
window.deleteOrder = deleteOrder;

window.getOrderHistory = getOrderHistory;
window.createOrderHistory = createOrderHistory;

window.getTickets = getTickets;
window.getTicket = getTicket;
window.getTicketsByUser = getTicketsByUser;
window.createTicket = createTicket;
window.updateTicket = updateTicket;

window.getPromocodes = getPromocodes;
window.getPromocode = getPromocode;
window.getPromocodeByCode = getPromocodeByCode;
window.createPromocode = createPromocode;
window.updatePromocode = updatePromocode;
window.deletePromocode = deletePromocode;
window.usePromocode = usePromocode;

window.getBonusTransactions = getBonusTransactions;
window.createBonusTransaction = createBonusTransaction;
window.updateBonusTransaction = updateBonusTransaction;
window.getBonusBalance = getBonusBalance;
window.spendBonuses = spendBonuses;
