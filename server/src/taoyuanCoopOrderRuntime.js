const fs = require('fs');
const path = require('path');
const db = require('./db');
const {
  createError,
  getActiveSaveContext,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');
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
const ORDER_STATUSES = Object.freeze(['open', 'closed', 'expired']);
const DELIVERY_STATUSES = Object.freeze(['none', 'submitted', 'confirmed', 'compensation_pending']);
const RECEIPT_STATUSES = Object.freeze(['pending_owner_confirm', 'confirmed', 'compensation_pending']);
const COMPENSATION_STATUSES = Object.freeze(['pending', 'resolved']);

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTimestamp(value) {
  const next = Math.floor(Number(value) || 0);
  return next > 0 ? next : Math.floor(Date.now() / 1000);
}

function ensureCoopOrderStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_COOP_ORDER_FILE), { recursive: true });
}

function createEmptyStore() {
  return {
    orders: [],
    receipts: [],
    compensations: [],
    reputations: {},
  };
}

function loadCoopOrderStore() {
  ensureCoopOrderStore();
  try {
    if (!fs.existsSync(TAOYUAN_COOP_ORDER_FILE)) return createEmptyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_COOP_ORDER_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          orders: Array.isArray(raw.orders) ? raw.orders : [],
          receipts: Array.isArray(raw.receipts) ? raw.receipts : [],
          compensations: Array.isArray(raw.compensations) ? raw.compensations : [],
          reputations: raw.reputations && typeof raw.reputations === 'object' ? raw.reputations : {},
        }
      : createEmptyStore();
  } catch {
    return createEmptyStore();
  }
}

function saveCoopOrderStore(store) {
  ensureCoopOrderStore();
  writeJsonFileAtomic(TAOYUAN_COOP_ORDER_FILE, {
    orders: Array.isArray(store?.orders) ? store.orders : [],
    receipts: Array.isArray(store?.receipts) ? store.receipts : [],
    compensations: Array.isArray(store?.compensations) ? store.compensations : [],
    reputations: store?.reputations && typeof store.reputations === 'object' ? store.reputations : {},
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

function normalizeOrderStatus(value) {
  const normalized = String(value || '').trim();
  return ORDER_STATUSES.includes(normalized) ? normalized : 'open';
}

function normalizeDeliveryStatus(value) {
  const normalized = String(value || '').trim();
  return DELIVERY_STATUSES.includes(normalized) ? normalized : 'none';
}

function normalizeReceiptStatus(value) {
  const normalized = String(value || '').trim();
  return RECEIPT_STATUSES.includes(normalized) ? normalized : 'pending_owner_confirm';
}

function normalizeCompensationStatus(value) {
  const normalized = String(value || '').trim();
  return COMPENSATION_STATUSES.includes(normalized) ? normalized : 'pending';
}

function normalizeDeliveredItem(entry) {
  return {
    item_id: sanitizeText(entry?.item_id, 40),
    quantity: Math.max(1, Math.floor(Number(entry?.quantity) || 1)),
  };
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
    status: normalizeOrderStatus(order?.status),
    assignee_username: String(order?.assignee_username || '').trim(),
    assignee_display_name: sanitizeText(order?.assignee_display_name, 30) || String(order?.assignee_username || ''),
    accepted_at: Math.max(0, Math.floor(Number(order?.accepted_at) || 0)),
    canceled_at: Math.max(0, Math.floor(Number(order?.canceled_at) || 0)),
    active_receipt_id: String(order?.active_receipt_id || '').trim(),
    delivery_status: normalizeDeliveryStatus(order?.delivery_status),
    delivery_note: sanitizeText(order?.delivery_note, 160),
    delivered_items: Array.isArray(order?.delivered_items)
      ? order.delivered_items.map(normalizeDeliveredItem).filter(entry => entry.item_id)
      : [],
    settlement_confirmed_at: Math.max(0, Math.floor(Number(order?.settlement_confirmed_at) || 0)),
    compensation_id: String(order?.compensation_id || '').trim(),
    created_at: normalizeTimestamp(order?.created_at),
    updated_at: normalizeTimestamp(order?.updated_at),
  };
}

function normalizeSettlementReceipt(entry) {
  return {
    id: String(entry?.id || makeId('coop_receipt')),
    order_id: String(entry?.order_id || '').trim(),
    owner_username: String(entry?.owner_username || '').trim(),
    owner_display_name: sanitizeText(entry?.owner_display_name, 30) || String(entry?.owner_username || ''),
    assignee_username: String(entry?.assignee_username || '').trim(),
    assignee_display_name: sanitizeText(entry?.assignee_display_name, 30) || String(entry?.assignee_username || ''),
    reward_type: normalizeRewardType(entry?.reward_type),
    reward_value: Math.max(0, Math.floor(Number(entry?.reward_value) || 0)),
    reward_label: sanitizeText(entry?.reward_label, 40),
    delivered_items: Array.isArray(entry?.delivered_items)
      ? entry.delivered_items.map(normalizeDeliveredItem).filter(item => item.item_id)
      : [],
    result_note: sanitizeText(entry?.result_note, 160),
    idempotency_key: sanitizeText(entry?.idempotency_key, 120),
    status: normalizeReceiptStatus(entry?.status),
    reward_result: sanitizeText(entry?.reward_result, 80),
    compensation_id: String(entry?.compensation_id || '').trim(),
    help_reputation_delta: Math.max(0, Math.floor(Number(entry?.help_reputation_delta) || 0)),
    specialty_reputation_delta: Math.max(0, Math.floor(Number(entry?.specialty_reputation_delta) || 0)),
    trust_level_label: sanitizeText(entry?.trust_level_label, 20),
    created_at: normalizeTimestamp(entry?.created_at),
    confirmed_at: Math.max(0, Math.floor(Number(entry?.confirmed_at) || 0)),
    updated_at: normalizeTimestamp(entry?.updated_at),
  };
}

function normalizeCompensationRecord(entry) {
  return {
    id: String(entry?.id || makeId('coop_compensation')),
    receipt_id: String(entry?.receipt_id || '').trim(),
    order_id: String(entry?.order_id || '').trim(),
    owner_username: String(entry?.owner_username || '').trim(),
    assignee_username: String(entry?.assignee_username || '').trim(),
    reward_type: normalizeRewardType(entry?.reward_type),
    reward_value: Math.max(0, Math.floor(Number(entry?.reward_value) || 0)),
    reward_label: sanitizeText(entry?.reward_label, 40),
    reason: sanitizeText(entry?.reason, 160),
    last_error: sanitizeText(entry?.last_error, 160),
    status: normalizeCompensationStatus(entry?.status),
    attempt_count: Math.max(0, Math.floor(Number(entry?.attempt_count) || 0)),
    created_at: normalizeTimestamp(entry?.created_at),
    updated_at: normalizeTimestamp(entry?.updated_at),
    resolved_at: Math.max(0, Math.floor(Number(entry?.resolved_at) || 0)),
  };
}

function normalizeReputationProfile(entry) {
  return {
    total: Math.max(0, Math.floor(Number(entry?.total) || 0)),
    by_order_type: entry?.by_order_type && typeof entry.by_order_type === 'object'
      ? Object.fromEntries(
          Object.entries(entry.by_order_type)
            .map(([key, value]) => [String(key), Math.max(0, Math.floor(Number(value) || 0))])
        )
      : {},
    completed_count: Math.max(0, Math.floor(Number(entry?.completed_count) || 0)),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || 0)),
  };
}

function buildTrustLevel(profile) {
  const total = Math.max(0, Math.floor(Number(profile?.total) || 0));
  const completedCount = Math.max(0, Math.floor(Number(profile?.completed_count) || 0));
  if (total >= 24 || completedCount >= 8) return { id: 'backbone', label: '骨干互助' };
  if (total >= 12 || completedCount >= 4) return { id: 'reliable', label: '稳固信赖' };
  if (total >= 4 || completedCount >= 2) return { id: 'familiar', label: '可靠协作' };
  return { id: 'new', label: '初识互助' };
}

function buildTrustGraphIndex(receipts = []) {
  const helperToOwner = new Map();
  const ownerToHelper = new Map();

  for (const entry of receipts) {
    const receipt = normalizeSettlementReceipt(entry);
    if (!['confirmed', 'compensation_pending'].includes(receipt.status)) continue;
    const helpKey = `${receipt.assignee_username}=>${receipt.owner_username}`;
    const ownerKey = `${receipt.owner_username}=>${receipt.assignee_username}`;
    const helperCount = helperToOwner.get(helpKey) || {
      username: receipt.owner_username,
      display_name: receipt.owner_display_name || receipt.owner_username,
      help_count: 0,
      total_points: 0,
    };
    helperToOwner.set(helpKey, {
      ...helperCount,
      help_count: helperCount.help_count + 1,
      total_points: helperCount.total_points + Math.max(1, receipt.help_reputation_delta || 0),
    });

    const ownerCount = ownerToHelper.get(ownerKey) || {
      username: receipt.assignee_username,
      display_name: receipt.assignee_display_name || receipt.assignee_username,
      help_count: 0,
      total_points: 0,
    };
    ownerToHelper.set(ownerKey, {
      ...ownerCount,
      help_count: ownerCount.help_count + 1,
      total_points: ownerCount.total_points + Math.max(1, receipt.help_reputation_delta || 0),
    });
  }

  return { helperToOwner, ownerToHelper };
}

function buildViewerTrustSummary(store, viewerUsername) {
  const profile = normalizeReputationProfile(store.reputations?.[viewerUsername] || {});
  const trustLevel = buildTrustLevel(profile);
  const specialty_ranks = Object.entries(profile.by_order_type)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([order_type, score]) => ({ order_type, score }));

  const trustGraph = buildTrustGraphIndex(store.receipts);
  const top_helped_targets = Array.from(trustGraph.helperToOwner.entries())
    .filter(([key]) => key.startsWith(`${viewerUsername}=>`))
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.help_count !== left.help_count) return right.help_count - left.help_count;
      return right.total_points - left.total_points;
    })
    .slice(0, 5);

  const top_helpers = Array.from(trustGraph.ownerToHelper.entries())
    .filter(([key]) => key.startsWith(`${viewerUsername}=>`))
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.help_count !== left.help_count) return right.help_count - left.help_count;
      return right.total_points - left.total_points;
    })
    .slice(0, 5);

  return {
    total: profile.total,
    by_order_type: profile.by_order_type,
    completed_count: profile.completed_count,
    updated_at: profile.updated_at,
    trust_level: trustLevel,
    specialty_ranks,
    top_helped_targets,
    top_helpers,
  };
}

function buildOrderPriority(order, viewerSummary) {
  const specialtyScore = Math.max(0, Math.floor(Number(viewerSummary?.by_order_type?.[order.order_type]) || 0));
  const trustTarget = Array.isArray(viewerSummary?.top_helped_targets)
    ? viewerSummary.top_helped_targets.find(entry => entry.username === order.owner_username)
    : null;
  const helperScore = trustTarget ? Math.max(0, trustTarget.help_count * 3 + trustTarget.total_points) : 0;
  const priorityScore = specialtyScore * 4 + helperScore;
  const priorityReasons = [];
  if (specialtyScore > 0) {
    priorityReasons.push(`你在 ${order.order_type} 方向已有 ${specialtyScore} 点互助积累`);
  }
  if (trustTarget) {
    priorityReasons.push(`你曾帮助 ${trustTarget.display_name || trustTarget.username} ${trustTarget.help_count} 次`);
  }
  return {
    priority_score: priorityScore,
    priority_reasons: priorityReasons,
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

function findOrderById(store, orderId) {
  return store.orders
    .map(normalizeOrder)
    .find(order => order.id === String(orderId || '').trim()) || null;
}

function findReceiptById(store, receiptId) {
  return store.receipts
    .map(normalizeSettlementReceipt)
    .find(receipt => receipt.id === String(receiptId || '').trim()) || null;
}

function findCompensationById(store, compensationId) {
  return store.compensations
    .map(normalizeCompensationRecord)
    .find(record => record.id === String(compensationId || '').trim()) || null;
}

function findReceiptByIdempotencyKey(store, idempotencyKey) {
  return store.receipts
    .map(normalizeSettlementReceipt)
    .find(receipt => receipt.idempotency_key === String(idempotencyKey || '').trim()) || null;
}

function buildReceiptIdempotencyKey(order) {
  return `coop-order:${order.id}:assignee:${order.assignee_username}:accepted:${order.accepted_at || 0}`;
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
        assignee_username: '',
        assignee_display_name: '',
        accepted_at: 0,
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

function applyMoneyReward(username, amount) {
  const rewardAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (rewardAmount <= 0) {
    return { money: 0, slot: null };
  }
  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，无法写入协作委托奖励');
  context.username = username;
  const currentMoney = Math.max(0, Math.floor(Number(context.data?.player?.money) || 0));
  context.data.player.money = currentMoney + rewardAmount;
  persistGameplayData(context);
  return {
    money: context.data.player.money,
    slot: context.slot,
  };
}

function applyReputationReward(store, receipt, order) {
  const username = receipt.assignee_username;
  const current = normalizeReputationProfile(store.reputations?.[username] || {});
  const next = normalizeReputationProfile({
    total: current.total + receipt.reward_value,
    by_order_type: {
      ...current.by_order_type,
      [order.order_type]: (current.by_order_type[order.order_type] || 0) + receipt.reward_value,
    },
    completed_count: current.completed_count,
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.reputations[username] = next;
  return next;
}

function applyMutualAidReputation(store, order, receipt) {
  const username = receipt.assignee_username;
  const current = normalizeReputationProfile(store.reputations?.[username] || {});
  const deliveredQuantity = Array.isArray(receipt.delivered_items)
    ? receipt.delivered_items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0)
    : 0;
  const helpReputationDelta = Math.max(
    1,
    Math.min(
      12,
      Math.ceil(Math.max(1, receipt.reward_value) / 40) + Math.floor(deliveredQuantity / 3)
    )
  );
  const next = normalizeReputationProfile({
    total: current.total + helpReputationDelta,
    by_order_type: {
      ...current.by_order_type,
      [order.order_type]: (current.by_order_type[order.order_type] || 0) + helpReputationDelta,
    },
    completed_count: current.completed_count + 1,
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.reputations[username] = next;
  return {
    helpReputationDelta,
    specialtyReputationDelta: helpReputationDelta,
    trustLevel: buildTrustLevel(next),
  };
}

function buildCompensationReason(error) {
  const fallback = '写入结算奖励失败，已转入补偿队列';
  return sanitizeText(error?.message || fallback, 160) || fallback;
}

function buildCompensationRecord(order, receipt, error) {
  const now = Math.floor(Date.now() / 1000);
  return normalizeCompensationRecord({
    id: makeId('coop_compensation'),
    receipt_id: receipt.id,
    order_id: order.id,
    owner_username: order.owner_username,
    assignee_username: order.assignee_username,
    reward_type: receipt.reward_type,
    reward_value: receipt.reward_value,
    reward_label: receipt.reward_label,
    reason: buildCompensationReason(error),
    last_error: sanitizeText(error?.message, 160),
    status: 'pending',
    attempt_count: 1,
    created_at: now,
    updated_at: now,
    resolved_at: 0,
  });
}

function applyRewardByReceipt(store, order, receipt) {
  if (receipt.reward_type === 'money') {
    const rewardState = applyMoneyReward(receipt.assignee_username, receipt.reward_value);
    return {
      reward_result: `铜钱已写入槽位 ${Number(rewardState.slot) + 1}`,
      compensationNeeded: false,
    };
  }
  if (receipt.reward_type === 'reputation') {
    applyReputationReward(store, receipt, order);
    return {
      reward_result: '互助声望已记录',
      compensationNeeded: false,
    };
  }
  return {
    reward_result: '礼物回报已记录，后续可按回包条目继续补发',
    compensationNeeded: false,
  };
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
    assignee_username: '',
    assignee_display_name: '',
    accepted_at: 0,
    canceled_at: 0,
    active_receipt_id: '',
    delivery_status: 'none',
    delivery_note: '',
    delivered_items: [],
    settlement_confirmed_at: 0,
    compensation_id: '',
    created_at: now,
    updated_at: now,
  });

  store.orders = [order, ...store.orders.map(normalizeOrder)];
  saveCoopOrderStore(store);
  return order;
}

async function acceptCoopOrder(orderId, actor = {}) {
  const assigneeUsername = String(actor.username || '').trim();
  if (!assigneeUsername) throw createError('请先登录后再接单', 401);
  const assigneeUser = await db.getUser(assigneeUsername);
  if (!assigneeUser) throw createError('当前玩家不存在', 404);

  const store = loadCoopOrderStore();
  markExpiredOrders(store);
  const order = findOrderById(store, orderId);
  if (!order) throw createError('求助单不存在', 404);
  if (order.owner_username === assigneeUsername) throw createError('不能接自己发布的求助单');
  if (!isOrderVisibleToViewer(order, assigneeUsername)) throw createError('当前无权接这张求助单', 403);
  if (order.status !== 'open') throw createError(order.status === 'expired' ? '求助单已过期' : '求助单当前不可接');
  if (order.assignee_username) throw createError('这张求助单已经有人接下了');

  const now = Math.floor(Date.now() / 1000);
  const nextOrder = normalizeOrder({
    ...order,
    assignee_username: assigneeUsername,
    assignee_display_name: actor.displayName || assigneeUser.display_name || assigneeUsername,
    accepted_at: now,
    updated_at: now,
  });
  store.orders = store.orders.map(entry => {
    const normalized = normalizeOrder(entry);
    return normalized.id === nextOrder.id ? nextOrder : normalized;
  });
  saveCoopOrderStore(store);
  return nextOrder;
}

async function cancelAcceptedCoopOrder(orderId, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录后再取消接单', 401);

  const store = loadCoopOrderStore();
  markExpiredOrders(store);
  const order = findOrderById(store, orderId);
  if (!order) throw createError('求助单不存在', 404);
  if (order.status !== 'open') throw createError(order.status === 'expired' ? '求助单已过期，不能取消接单' : '求助单当前不可取消');
  if (!order.assignee_username) throw createError('当前还没有人接这张求助单');
  if (order.assignee_username !== actorUsername) throw createError('只有当前接单人可以取消接单', 403);
  if (order.delivery_status !== 'none') throw createError('这张求助单已经进入交付流程，不能再取消接单');

  const now = Math.floor(Date.now() / 1000);
  const nextOrder = normalizeOrder({
    ...order,
    assignee_username: '',
    assignee_display_name: '',
    accepted_at: 0,
    canceled_at: now,
    updated_at: now,
  });
  store.orders = store.orders.map(entry => {
    const normalized = normalizeOrder(entry);
    return normalized.id === nextOrder.id ? nextOrder : normalized;
  });
  saveCoopOrderStore(store);
  return nextOrder;
}

async function submitCoopOrderDelivery(orderId, payload = {}, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录后再提交交付', 401);

  const store = loadCoopOrderStore();
  markExpiredOrders(store);
  const order = findOrderById(store, orderId);
  if (!order) throw createError('求助单不存在', 404);
  if (order.assignee_username !== actorUsername) throw createError('只有当前接单人可以提交交付', 403);
  if (order.delivery_status !== 'none') {
    const existingReceipt = order.active_receipt_id ? findReceiptById(store, order.active_receipt_id) : null;
    if (existingReceipt && existingReceipt.assignee_username === actorUsername) {
      return {
        order,
        receipt: existingReceipt,
        duplicate_protected: true,
      };
    }
    throw createError('这张求助单已经提交过交付记录');
  }
  if (order.status !== 'open') throw createError(order.status === 'expired' ? '求助单已过期，不能提交交付' : '求助单当前不可提交');

  const deliveredItems = Array.isArray(payload.delivered_items)
    ? payload.delivered_items.map(normalizeDeliveredItem).filter(item => item.item_id)
    : [];
  const resultNote = sanitizeText(payload.result_note, 160);
  if (deliveredItems.length === 0 && resultNote.length < 2) {
    throw createError('请至少填写一条资源记录或交付说明');
  }

  const idempotencyKey = buildReceiptIdempotencyKey(order);
  const existingReceipt = findReceiptByIdempotencyKey(store, idempotencyKey);
  if (existingReceipt) {
    return {
      order,
      receipt: existingReceipt,
      duplicate_protected: true,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const receipt = normalizeSettlementReceipt({
    id: makeId('coop_receipt'),
    order_id: order.id,
    owner_username: order.owner_username,
    owner_display_name: order.owner_display_name,
    assignee_username: order.assignee_username,
    assignee_display_name: order.assignee_display_name,
    reward_type: order.reward_type,
    reward_value: order.reward_value,
    reward_label: order.reward_label,
    delivered_items: deliveredItems,
    result_note: resultNote,
    idempotency_key: idempotencyKey,
    status: 'pending_owner_confirm',
    reward_result: '',
    compensation_id: '',
    help_reputation_delta: 0,
    specialty_reputation_delta: 0,
    trust_level_label: '',
    created_at: now,
    confirmed_at: 0,
    updated_at: now,
  });

  const nextOrder = normalizeOrder({
    ...order,
    status: 'closed',
    active_receipt_id: receipt.id,
    delivery_status: 'submitted',
    delivery_note: resultNote,
    delivered_items: deliveredItems,
    updated_at: now,
  });

  store.receipts = [receipt, ...store.receipts.map(normalizeSettlementReceipt)];
  store.orders = store.orders.map(entry => {
    const normalized = normalizeOrder(entry);
    return normalized.id === nextOrder.id ? nextOrder : normalized;
  });
  saveCoopOrderStore(store);
  return {
    order: nextOrder,
    receipt,
    duplicate_protected: false,
  };
}

async function confirmCoopOrderDelivery(orderId, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录后再确认交付', 401);

  const store = loadCoopOrderStore();
  const order = findOrderById(store, orderId);
  if (!order) throw createError('求助单不存在', 404);
  if (order.owner_username !== actorUsername) throw createError('只有发布人可以确认交付', 403);
  if (order.delivery_status !== 'submitted') throw createError('当前没有待确认的交付记录');
  if (!order.active_receipt_id) throw createError('当前求助单缺少结算凭证');

  const receipt = findReceiptById(store, order.active_receipt_id);
  if (!receipt) throw createError('结算凭证不存在', 404);
  if (receipt.status !== 'pending_owner_confirm') throw createError('这张结算凭证已经处理过了');

  const now = Math.floor(Date.now() / 1000);
  let nextReceipt = normalizeSettlementReceipt({
    ...receipt,
    updated_at: now,
    confirmed_at: now,
  });
  let nextOrder = normalizeOrder({
    ...order,
    settlement_confirmed_at: now,
    updated_at: now,
  });
  const reputationOutcome = applyMutualAidReputation(store, order, receipt);
  nextReceipt = normalizeSettlementReceipt({
    ...nextReceipt,
    help_reputation_delta: reputationOutcome.helpReputationDelta,
    specialty_reputation_delta: reputationOutcome.specialtyReputationDelta,
    trust_level_label: reputationOutcome.trustLevel.label,
  });

  try {
    const rewardOutcome = applyRewardByReceipt(store, order, receipt);
    nextReceipt = normalizeSettlementReceipt({
      ...nextReceipt,
      status: 'confirmed',
      reward_result: rewardOutcome.reward_result,
      compensation_id: '',
    });
    nextOrder = normalizeOrder({
      ...nextOrder,
      delivery_status: 'confirmed',
      compensation_id: '',
    });
  } catch (error) {
    const compensation = buildCompensationRecord(order, receipt, error);
    nextReceipt = normalizeSettlementReceipt({
      ...nextReceipt,
      status: 'compensation_pending',
      reward_result: '奖励写入失败，已转入补偿队列',
      compensation_id: compensation.id,
    });
    nextOrder = normalizeOrder({
      ...nextOrder,
      delivery_status: 'compensation_pending',
      compensation_id: compensation.id,
    });
    store.compensations = [compensation, ...store.compensations.map(normalizeCompensationRecord)];
  }

  store.receipts = store.receipts.map(entry => {
    const normalized = normalizeSettlementReceipt(entry);
    return normalized.id === nextReceipt.id ? nextReceipt : normalized;
  });
  store.orders = store.orders.map(entry => {
    const normalized = normalizeOrder(entry);
    return normalized.id === nextOrder.id ? nextOrder : normalized;
  });
  saveCoopOrderStore(store);
  return {
    order: nextOrder,
    receipt: nextReceipt,
    compensation: nextOrder.compensation_id ? findCompensationById(store, nextOrder.compensation_id) : null,
  };
}

async function replayCoopOrderCompensation(compensationId, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录后再重试补偿', 401);

  const store = loadCoopOrderStore();
  const compensation = findCompensationById(store, compensationId);
  if (!compensation) throw createError('补偿记录不存在', 404);
  const order = findOrderById(store, compensation.order_id);
  if (!order) throw createError('关联求助单不存在', 404);
  if (order.owner_username !== actorUsername) throw createError('只有发布人可以重试补偿', 403);
  if (compensation.status !== 'pending') throw createError('这条补偿记录已经处理完成');
  const receipt = findReceiptById(store, compensation.receipt_id);
  if (!receipt) throw createError('关联结算凭证不存在', 404);

  const now = Math.floor(Date.now() / 1000);
  let nextCompensation = normalizeCompensationRecord({
    ...compensation,
    attempt_count: compensation.attempt_count + 1,
    updated_at: now,
  });

  try {
    const rewardOutcome = applyRewardByReceipt(store, order, receipt);
    nextCompensation = normalizeCompensationRecord({
      ...nextCompensation,
      status: 'resolved',
      resolved_at: now,
      last_error: '',
    });
    const nextReceipt = normalizeSettlementReceipt({
      ...receipt,
      status: 'confirmed',
      reward_result: rewardOutcome.reward_result,
      updated_at: now,
    });
    const nextOrder = normalizeOrder({
      ...order,
      delivery_status: 'confirmed',
      settlement_confirmed_at: now,
      updated_at: now,
    });
    store.compensations = store.compensations.map(entry => {
      const normalized = normalizeCompensationRecord(entry);
      return normalized.id === nextCompensation.id ? nextCompensation : normalized;
    });
    store.receipts = store.receipts.map(entry => {
      const normalized = normalizeSettlementReceipt(entry);
      return normalized.id === nextReceipt.id ? nextReceipt : normalized;
    });
    store.orders = store.orders.map(entry => {
      const normalized = normalizeOrder(entry);
      return normalized.id === nextOrder.id ? nextOrder : normalized;
    });
    saveCoopOrderStore(store);
    return {
      compensation: nextCompensation,
      receipt: nextReceipt,
      order: nextOrder,
    };
  } catch (error) {
    nextCompensation = normalizeCompensationRecord({
      ...nextCompensation,
      last_error: sanitizeText(error?.message, 160),
    });
    store.compensations = store.compensations.map(entry => {
      const normalized = normalizeCompensationRecord(entry);
      return normalized.id === nextCompensation.id ? nextCompensation : normalized;
    });
    saveCoopOrderStore(store);
    throw createError(`补偿重试失败：${sanitizeText(error?.message, 120) || '未知错误'}`);
  }
}

async function listVisibleCoopOrders(viewerUsername = '') {
  const store = loadCoopOrderStore();
  const normalizedViewer = String(viewerUsername || '').trim();
  const viewerSummary = buildViewerTrustSummary(store, normalizedViewer);
  const orders = markExpiredOrders(store)
    .filter(order => isOrderVisibleToViewer(order, normalizedViewer))
    .map(order => ({
      ...order,
      ...buildOrderPriority(order, viewerSummary),
    }))
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === 'open' ? -1 : 1;
      const priorityDiff = Math.max(0, Number(right.priority_score) || 0) - Math.max(0, Number(left.priority_score) || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return right.created_at - left.created_at;
    });

  const receipts = store.receipts
    .map(normalizeSettlementReceipt)
    .filter(receipt => receipt.owner_username === normalizedViewer || receipt.assignee_username === normalizedViewer)
    .sort((left, right) => right.created_at - left.created_at);

  const compensations = store.compensations
    .map(normalizeCompensationRecord)
    .filter(record => record.owner_username === normalizedViewer || record.assignee_username === normalizedViewer)
    .sort((left, right) => right.created_at - left.created_at);

  return {
    orders,
    receipts,
    compensations,
    reputation_summary: viewerSummary,
    order_type_options: [...ORDER_TYPES],
    scope_options: [...ORDER_SCOPES],
    reward_type_options: [...ORDER_REWARD_TYPES],
  };
}

module.exports = {
  createCoopOrder,
  acceptCoopOrder,
  cancelAcceptedCoopOrder,
  submitCoopOrderDelivery,
  confirmCoopOrderDelivery,
  replayCoopOrderCompensation,
  listVisibleCoopOrders,
};
