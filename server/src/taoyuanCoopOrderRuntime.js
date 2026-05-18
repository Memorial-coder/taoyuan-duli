const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_COOP_ORDER_FILE = path.join(DATA_DIR, 'taoyuan_coop_orders.json');

const ORDER_TYPES = Object.freeze([
  'material_help',
  'festival_supply',
  'museum_support',
  'fishpond_borrow',
  'breeding_cert',
  'village_build',
  'expedition_supply',
  'npc_request',
  'emergency_response',
]);

const ORDER_SCOPES = Object.freeze(['public', 'neighbors', 'friends']);
const ORDER_REWARD_TYPES = Object.freeze(['money', 'reputation', 'gift']);

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureCoopOrderStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_COOP_ORDER_FILE), { recursive: true });
}

function loadCoopOrderStore() {
  ensureCoopOrderStore();
  try {
    if (!fs.existsSync(TAOYUAN_COOP_ORDER_FILE)) return { orders: [] };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_COOP_ORDER_FILE, 'utf8'));
    return raw && typeof raw === 'object' && Array.isArray(raw.orders)
      ? raw
      : { orders: [] };
  } catch {
    return { orders: [] };
  }
}

function saveCoopOrderStore(store) {
  ensureCoopOrderStore();
  writeJsonFileAtomic(TAOYUAN_COOP_ORDER_FILE, {
    orders: Array.isArray(store?.orders) ? store.orders : [],
  });
}

function normalizeOrderType(value) {
  const normalized = String(value || '').trim();
  return ORDER_TYPES.includes(normalized) ? normalized : 'material_help';
}

function normalizeOrderScope(value) {
  const normalized = String(value || '').trim();
  return ORDER_SCOPES.includes(normalized) ? normalized : 'public';
}

function normalizeRewardType(value) {
  const normalized = String(value || '').trim();
  return ORDER_REWARD_TYPES.includes(normalized) ? normalized : 'money';
}

function normalizeTimestamp(value) {
  const next = Math.floor(Number(value) || 0);
  return next > 0 ? next : Math.floor(Date.now() / 1000);
}

function normalizeOrder(order) {
  return {
    id: String(order?.id || makeId('coop_order')),
    owner_username: String(order?.owner_username || '').trim(),
    owner_display_name: sanitizeText(order?.owner_display_name, 30) || String(order?.owner_username || '匿名'),
    title: sanitizeText(order?.title, 40),
    description: sanitizeText(order?.description, 160),
    order_type: normalizeOrderType(order?.order_type),
    scope: normalizeOrderScope(order?.scope),
    deadline_at: Math.max(0, Math.floor(Number(order?.deadline_at) || 0)),
    reward_type: normalizeRewardType(order?.reward_type),
    reward_value: Math.max(0, Math.floor(Number(order?.reward_value) || 0)),
    reward_label: sanitizeText(order?.reward_label, 40),
    status: ['open', 'closed', 'expired'].includes(String(order?.status)) ? String(order.status) : 'open',
    created_at: normalizeTimestamp(order?.created_at),
    updated_at: normalizeTimestamp(order?.updated_at),
  };
}

function isOrderVisibleToViewer(order, viewerUsername) {
  const viewer = String(viewerUsername || '').trim();
  if (!viewer) return order.scope === 'public';
  if (viewer === order.owner_username) return true;
  if (order.scope === 'public') return true;
  if (order.scope === 'friends') {
    return taoyuanSocialRuntime.isFriendWith(viewer, order.owner_username);
  }
  if (order.scope === 'neighbors') {
    return taoyuanSocialRuntime.isNeighborWith(viewer, order.owner_username);
  }
  return false;
}

function markExpiredOrders(store) {
  const now = Math.floor(Date.now() / 1000);
  let changed = false;
  const nextOrders = store.orders.map(entry => {
    const order = normalizeOrder(entry);
    if (order.status === 'open' && order.deadline_at > 0 && order.deadline_at <= now) {
      changed = true;
      return {
        ...order,
        status: 'expired',
        updated_at: now,
      };
    }
    return order;
  });
  if (changed) {
    store.orders = nextOrders;
    saveCoopOrderStore(store);
  }
  return nextOrders;
}

async function createCoopOrder(payload = {}, actor = {}) {
  const ownerUsername = String(actor.username || '').trim();
  if (!ownerUsername) throw createError('请先登录后再发布求助单', 401);
  const ownerUser = await db.getUser(ownerUsername);
  if (!ownerUser) throw createError('当前玩家不存在', 404);

  const title = sanitizeText(payload.title, 40);
  const description = sanitizeText(payload.description, 160);
  if (title.length < 2) throw createError('求助单标题至少需要 2 个字');
  if (description.length < 4) throw createError('求助内容至少需要 4 个字');

  const deadlineAt = Math.floor(Number(payload.deadline_at) || 0);
  const now = Math.floor(Date.now() / 1000);
  if (deadlineAt <= now) throw createError('截止时间必须晚于当前时间');

  const rewardValue = Math.max(0, Math.floor(Number(payload.reward_value) || 0));
  if (rewardValue <= 0) throw createError('回报数值至少为 1');

  const store = loadCoopOrderStore();
  markExpiredOrders(store);
  const order = normalizeOrder({
    id: makeId('coop_order'),
    owner_username: ownerUsername,
    owner_display_name: actor.displayName || ownerUser.display_name || ownerUsername,
    title,
    description,
    order_type: payload.order_type,
    scope: payload.scope,
    deadline_at: deadlineAt,
    reward_type: payload.reward_type,
    reward_value: rewardValue,
    reward_label: payload.reward_label,
    status: 'open',
    created_at: now,
    updated_at: now,
  });

  store.orders = [order, ...store.orders.map(normalizeOrder)];
  saveCoopOrderStore(store);
  return order;
}

async function listVisibleCoopOrders(viewerUsername = '') {
  const store = loadCoopOrderStore();
  const orders = markExpiredOrders(store)
    .filter(order => isOrderVisibleToViewer(order, viewerUsername))
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === 'open' ? -1 : 1;
      return right.created_at - left.created_at;
    });

  return {
    orders,
    order_type_options: [...ORDER_TYPES],
    scope_options: [...ORDER_SCOPES],
    reward_type_options: [...ORDER_REWARD_TYPES],
  };
}

module.exports = {
  createCoopOrder,
  listVisibleCoopOrders,
};
