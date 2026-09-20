// ============================================================
//  BERDSK_PIZZA — SUPABASE API
//  Версия 3.0 — с аудитом, защитой промокодов, курьерами
// ============================================================

const SUPABASE_URL = "https://nymcnpnoxmpyyztcncvf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bWNucG5veG1weXl6dGNuY3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODczMDYsImV4cCI6MjEwMzY2MzMwNn0.sU0EVcmEDlEvuzBTTmMv9iZRtA8x05FIzGcrvlbICM0";

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

async function hashPasswordFrontend(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    if (response.status === 204 || method === "DELETE") {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Supabase request failed:", error);
    throw error;
  }
}

function serializeJsonb(data) {
  if (!data) return data;
  const result = { ...data };
  if (result.items && typeof result.items === "object") {
    result.items = JSON.stringify(result.items);
  }
  if (result.old_data && typeof result.old_data === "object") {
    result.old_data = JSON.stringify(result.old_data);
  }
  if (result.new_data && typeof result.new_data === "object") {
    result.new_data = JSON.stringify(result.new_data);
  }
  return result;
}

function deserializeJsonb(record) {
  if (!record) return null;
  const result = { ...record };
  if (result.items && typeof result.items === "string") {
    try {
      result.items = JSON.parse(result.items);
    } catch (e) {
      console.error("Ошибка парсинга items:", e);
      result.items = [];
    }
  }
  if (result.old_data && typeof result.old_data === "string") {
    try {
      result.old_data = JSON.parse(result.old_data);
    } catch (e) {
      result.old_data = null;
    }
  }
  if (result.new_data && typeof result.new_data === "string") {
    try {
      result.new_data = JSON.parse(result.new_data);
    } catch (e) {
      result.new_data = null;
    }
  }
  return result;
}

// ============================================================
//  USERS
// ============================================================

async function getUsers() {
  const result = await supabaseRequest("/users?select=*&order=id");
  return result || [];
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
    password: data.password,
    role: data.role || "client",
    name: data.name,
    phone: data.phone || null,
    is_blocked: data.is_blocked || false,
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
  const result = await supabaseRequest("/products?select=*&order=sort_order");
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
  const result = await supabaseRequest(`/products?id=eq.${id}`, "PATCH", data);
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
  const result = await supabaseRequest(`/pickup_points?id=eq.${id}&select=*`);
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
  const result = await supabaseRequest(`/pickup_points?id=eq.${id}`, "PATCH", data);
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

// ===== НОВЫЕ ФУНКЦИИ ДЛЯ КУРЬЕРОВ =====

/**
 * Получить все свободные заказы на доставку (курьер ещё не взял)
 */
async function getFreeDeliveryOrders() {
  const result = await supabaseRequest(
    `/orders?order_type=eq.delivery&status=eq.${encodeURIComponent("Готов к выдаче")}&courier_id=is.null&select=*&order=created_at.asc`
  );
  return result ? result.map(deserializeJsonb) : [];
}

/**
 * Получить заказы, взятые конкретным курьером
 */
async function getCourierOrders(courierId) {
  const result = await supabaseRequest(
    `/orders?courier_id=eq.${courierId}&select=*&order=id.desc`
  );
  return result ? result.map(deserializeJsonb) : [];
}

/**
 * Взять заказ курьером (аналог "принять заказ" в такси)
 */
async function takeOrderByCourier(orderId, courierId) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Заказ не найден");
  if (order.courier_id) throw new Error("Заказ уже взят другим курьером");
  if (order.status !== "Готов к выдаче")
    throw new Error("Заказ не готов к выдаче");
  if (order.order_type !== "delivery")
    throw new Error("Этот заказ не на доставку");

  const result = await supabaseRequest(`/orders?id=eq.${orderId}`, "PATCH", {
    courier_id: courierId,
    courier_taken_at: new Date().toISOString(),
    status: "В пути",
  });

  await createAuditLog({
    user_id: courierId,
    action: "TAKE_ORDER",
    entity_type: "order",
    entity_id: orderId,
    description: `Курьер взял заказ #${orderId}`,
  });

  return result[0] ? deserializeJsonb(result[0]) : result;
}

/**
 * Курьер завершил доставку
 */
async function completeDeliveryByCourier(orderId, courierId) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Заказ не найден");
  if (order.courier_id !== courierId)
    throw new Error("Этот заказ не закреплён за вами");
  if (order.status !== "В пути") throw new Error("Заказ не в пути");

  const result = await supabaseRequest(`/orders?id=eq.${orderId}`, "PATCH", {
    status: "Доставлен",
    courier_delivered_at: new Date().toISOString(),
  });

  await createAuditLog({
    user_id: courierId,
    action: "DELIVER_ORDER",
    entity_type: "order",
    entity_id: orderId,
    description: `Курьер доставил заказ #${orderId}`,
  });

  return result[0] ? deserializeJsonb(result[0]) : result;
}

/**
 * Поиск заказов по номеру
 */
async function searchOrdersById(query) {
  if (!query) return [];
  const result = await supabaseRequest(
    `/orders?id=eq.${parseInt(query)}&select=*`
  );
  return result ? result.map(deserializeJsonb) : [];
}

// ===== СТАНДАРТНЫЕ ФУНКЦИИ =====

async function createOrder(data) {
  const orderData = {
    user_id: data.user_id,
    items: data.items,
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

  await createAuditLog({
    user_id: data.created_by || data.user_id,
    action: "CREATE_ORDER",
    entity_type: "order",
    entity_id: result[0]?.id,
    description: `Создан заказ #${result[0]?.id} на ${data.total} ₽`,
  });

  return result[0] ? deserializeJsonb(result[0]) : result;
}

async function updateOrder(id, data) {
  const serialized = serializeJsonb(data);
  const result = await supabaseRequest(`/orders?id=eq.${id}`, "PATCH", serialized);
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
    `/order_history?order_id=eq.${orderId}&select=*&order=created_at.desc`
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
//  TICKETS (с обратной связью)
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
//  PROMOCODES (с защитой от абуза)
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

async function getPendingPromocodes() {
  const result = await supabaseRequest(
    `/promocodes?approval_status=eq.pending&select=*&order=created_at.desc`
  );
  return result || [];
}

/**
 * Создать промокод с автоматической проверкой суммы
 * Если сумма >= 1000₽ и создатель не админ — уходит на одобрение
 */
async function createPromocode(data) {
  const creator = getCurrentUser();
  const isAdmin = creator && creator.role === "admin";
  const requiresApproval = data.amount >= 1000 && !isAdmin;

  const promoData = {
    code: data.code,
    user_id: data.user_id || null,
    amount: data.amount,
    is_used: false,
    expires_at: data.expires_at || null,
    created_by: data.created_by || null,
    created_by_role: creator?.role || null,
    requires_admin_approval: requiresApproval,
    approval_status: requiresApproval ? "pending" : "approved",
    approved_by: requiresApproval ? null : data.created_by,
    approved_at: requiresApproval ? null : new Date().toISOString(),
  };

  const result = await supabaseRequest("/promocodes", "POST", promoData);
  return result[0] || result;
}

async function updatePromocode(id, data) {
  const result = await supabaseRequest(`/promocodes?id=eq.${id}`, "PATCH", data);
  return result[0] || result;
}

async function deletePromocode(id) {
  return supabaseRequest(`/promocodes?id=eq.${id}`, "DELETE");
}

/**
 * Одобрить промокод (только админ)
 */
async function approvePromocode(id, adminId) {
  const result = await supabaseRequest(`/promocodes?id=eq.${id}`, "PATCH", {
    approval_status: "approved",
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  });

  await createAuditLog({
    user_id: adminId,
    action: "APPROVE_PROMOCODE",
    entity_type: "promocode",
    entity_id: id,
    description: `Промокод #${id} одобрен`,
  });

  return result[0] || result;
}

/**
 * Отклонить промокод (только админ)
 */
async function rejectPromocode(id, adminId, reason) {
  const result = await supabaseRequest(`/promocodes?id=eq.${id}`, "PATCH", {
    approval_status: "rejected",
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    rejection_reason: reason,
  });

  await createAuditLog({
    user_id: adminId,
    action: "REJECT_PROMOCODE",
    entity_type: "promocode",
    entity_id: id,
    description: `Промокод #${id} отклонён: ${reason}`,
  });

  return result[0] || result;
}

/**
 * Отменить промокод (только админ)
 */
async function cancelPromocode(id, adminId, reason) {
  const result = await supabaseRequest(`/promocodes?id=eq.${id}`, "PATCH", {
    is_cancelled: true,
    cancelled_by: adminId,
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason,
  });

  await createAuditLog({
    user_id: adminId,
    action: "CANCEL_PROMOCODE",
    entity_type: "promocode",
    entity_id: id,
    description: `Промокод #${id} отменён: ${reason}`,
  });

  return result[0] || result;
}

/**
 * Использовать промокод при оформлении заказа
 */
async function usePromocode(code, orderId) {
  const promocode = await getPromocodeByCode(code);
  if (!promocode) throw new Error("Промокод не найден");
  if (promocode.is_used) throw new Error("Промокод уже использован");
  if (promocode.is_cancelled) throw new Error("Промокод отменён администратором");
  if (promocode.approval_status !== "approved")
    throw new Error("Промокод ещё не одобрен");
  if (promocode.expires_at && new Date(promocode.expires_at) < new Date())
    throw new Error("Промокод истёк");

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

async function getAllBonusTransactions() {
  const result = await supabaseRequest(
    "/bonus_transactions?select=*&order=created_at.desc"
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
  const result = await supabaseRequest("/bonus_transactions", "POST", bonusData);
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
  const transactions = await getBonusTransactions(userId);
  const activeTransactions = transactions.filter(
    (tx) =>
      tx.is_active === true &&
      (tx.type === "accrued" || tx.type === "refunded")
  );
  return activeTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
}

async function spendBonuses(userId, amount, orderId) {
  const balance = await getBonusBalance(userId);
  if (amount > balance) throw new Error("Недостаточно бонусов");
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
//  AUDIT LOG (логирование действий персонала)
// ============================================================

/**
 * Записать действие в аудит
 */
async function createAuditLog(data) {
  const user = getCurrentUser();
  const logData = {
    user_id: data.user_id || user?.id || null,
    user_name: data.user_name || user?.name || null,
    user_role: data.user_role || user?.role || null,
    action: data.action,
    entity_type: data.entity_type || null,
    entity_id: data.entity_id || null,
    old_data: data.old_data || null,
    new_data: data.new_data || null,
    description: data.description || null,
  };

  try {
    const serialized = serializeJsonb(logData);
    const result = await supabaseRequest("/audit_log", "POST", serialized);
    return result[0] || result;
  } catch (error) {
    // Аудит не должен ломать основной поток
    console.error("Ошибка записи в аудит:", error);
    return null;
  }
}

/**
 * Получить все логи аудита (только админ)
 */
async function getAuditLog(filters = {}) {
  let query = "/audit_log?select=*&order=created_at.desc&limit=500";

  if (filters.user_id) {
    query += `&user_id=eq.${filters.user_id}`;
  }
  if (filters.action) {
    query += `&action=eq.${filters.action}`;
  }
  if (filters.entity_type) {
    query += `&entity_type=eq.${filters.entity_type}`;
  }

  const result = await supabaseRequest(query);
  return result ? result.map(deserializeJsonb) : [];
}

/**
 * Получить логи по конкретному объекту
 */
async function getAuditLogByEntity(entityType, entityId) {
  const result = await supabaseRequest(
    `/audit_log?entity_type=eq.${entityType}&entity_id=eq.${entityId}&select=*&order=created_at.desc`
  );
  return result ? result.map(deserializeJsonb) : [];
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
window.getFreeDeliveryOrders = getFreeDeliveryOrders;
window.getCourierOrders = getCourierOrders;
window.takeOrderByCourier = takeOrderByCourier;
window.completeDeliveryByCourier = completeDeliveryByCourier;
window.searchOrdersById = searchOrdersById;
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
window.getPendingPromocodes = getPendingPromocodes;
window.createPromocode = createPromocode;
window.updatePromocode = updatePromocode;
window.deletePromocode = deletePromocode;
window.approvePromocode = approvePromocode;
window.rejectPromocode = rejectPromocode;
window.cancelPromocode = cancelPromocode;
window.usePromocode = usePromocode;

window.getBonusTransactions = getBonusTransactions;
window.getAllBonusTransactions = getAllBonusTransactions;
window.createBonusTransaction = createBonusTransaction;
window.updateBonusTransaction = updateBonusTransaction;
window.getBonusBalance = getBonusBalance;
window.spendBonuses = spendBonuses;

window.createAuditLog = createAuditLog;
window.getAuditLog = getAuditLog;
window.getAuditLogByEntity = getAuditLogByEntity;
window.spendBonuses = spendBonuses;
