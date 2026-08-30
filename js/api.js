// ============================================================
//  BERDSK_PIZZA — SUPABASE API
// ============================================================

const SUPABASE_URL = "https://nymcnpnoxmpyyztcncvf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bWNucG5veG1weXl6dGNuY3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODczMDYsImV4cCI6MjEwMzY2MzMwNn0.sU0EVcmEDlEvuzBTTmMv9iZRtA8x05FIzGcrvlbICM0";

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

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ошибка API: ${response.status} - ${error}`);
  }
  return response.json();
}

// ===== USERS =====
async function getUsers() {
  return supabaseRequest("/users");
}
async function getUser(id) {
  const r = await supabaseRequest(`/users?id=eq.${id}`);
  return r[0];
}
async function getUserByLogin(login) {
  const r = await supabaseRequest(`/users?login=eq.${login}`);
  return r[0];
}
async function createUser(data) {
  return supabaseRequest("/users", "POST", data);
}
async function updateUser(id, data) {
  return supabaseRequest(`/users?id=eq.${id}`, "PATCH", data);
}
async function deleteUser(id) {
  return supabaseRequest(`/users?id=eq.${id}`, "DELETE");
}

// ===== PRODUCTS =====
async function getProducts() {
  return supabaseRequest("/products");
}
async function getProduct(id) {
  const r = await supabaseRequest(`/products?id=eq.${id}`);
  return r[0];
}
async function createProduct(data) {
  return supabaseRequest("/products", "POST", data);
}
async function updateProduct(id, data) {
  return supabaseRequest(`/products?id=eq.${id}`, "PATCH", data);
}
async function deleteProduct(id) {
  return supabaseRequest(`/products?id=eq.${id}`, "DELETE");
}

// ===== PICKUP POINTS =====
async function getPickupPoints() {
  return supabaseRequest("/pickup_points");
}
async function getPickupPoint(id) {
  const r = await supabaseRequest(`/pickup_points?id=eq.${id}`);
  return r[0];
}
async function createPickupPoint(data) {
  return supabaseRequest("/pickup_points", "POST", data);
}
async function updatePickupPoint(id, data) {
  return supabaseRequest(`/pickup_points?id=eq.${id}`, "PATCH", data);
}
async function deletePickupPoint(id) {
  return supabaseRequest(`/pickup_points?id=eq.${id}`, "DELETE");
}

// ===== ORDERS =====
async function getOrders() {
  return supabaseRequest("/orders");
}
async function getOrder(id) {
  const r = await supabaseRequest(`/orders?id=eq.${id}`);
  return r[0];
}
async function createOrder(data) {
  return supabaseRequest("/orders", "POST", data);
}
async function updateOrder(id, data) {
  return supabaseRequest(`/orders?id=eq.${id}`, "PATCH", data);
}
async function deleteOrder(id) {
  return supabaseRequest(`/orders?id=eq.${id}`, "DELETE");
}

// ===== ORDER HISTORY =====
async function getOrderHistory(orderId) {
  return supabaseRequest(`/order_history?order_id=eq.${orderId}`);
}
async function createOrderHistory(data) {
  return supabaseRequest("/order_history", "POST", data);
}

// ===== TICKETS =====
async function getTickets() {
  return supabaseRequest("/tickets");
}
async function getTicket(id) {
  const r = await supabaseRequest(`/tickets?id=eq.${id}`);
  return r[0];
}
async function createTicket(data) {
  return supabaseRequest("/tickets", "POST", data);
}
async function updateTicket(id, data) {
  return supabaseRequest(`/tickets?id=eq.${id}`, "PATCH", data);
}

// ===== PROMOCODES =====
async function getPromocodes() {
  return supabaseRequest("/promocodes");
}
async function getPromocode(id) {
  const r = await supabaseRequest(`/promocodes?id=eq.${id}`);
  return r[0];
}
async function getPromocodeByCode(code) {
  const r = await supabaseRequest(`/promocodes?code=eq.${code}`);
  return r[0];
}
async function createPromocode(data) {
  return supabaseRequest("/promocodes", "POST", data);
}
async function updatePromocode(id, data) {
  return supabaseRequest(`/promocodes?id=eq.${id}`, "PATCH", data);
}
async function deletePromocode(id) {
  return supabaseRequest(`/promocodes?id=eq.${id}`, "DELETE");
}

// ===== BONUS TRANSACTIONS =====
async function getBonusTransactions(userId) {
  return supabaseRequest(`/bonus_transactions?user_id=eq.${userId}`);
}
async function createBonusTransaction(data) {
  return supabaseRequest("/bonus_transactions", "POST", data);
}
async function getBonusBalance(userId) {
  const result = await supabaseRequest(
    `/bonus_transactions?user_id=eq.${userId}&is_active=eq.true&select=amount`,
  );
  return result.reduce((sum, tx) => sum + tx.amount, 0);
}
