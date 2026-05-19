const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data');
const TAOYUAN_MARKET_GOVERNANCE_FILE = path.join(DATA_DIR, 'taoyuan_market_governance.json');
const MAX_DAYS_TO_KEEP = 21;
const MAX_BLACKLIST_NOTES = 160;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function nowDayKey() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampNonNegativeInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized >= 0 ? normalized : fallback;
}

function clampPositiveInt(value, fallback = 1) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function sanitizeText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function createEmptyStore() {
  return {
    users: {},
    sanctions: {},
  };
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : fallback;
  } catch {
    return fallback;
  }
}

function normalizeUserDayState(rawDay) {
  const actionTimes = Array.isArray(rawDay?.action_times)
    ? rawDay.action_times.map(value => clampNonNegativeInt(value, 0)).filter(value => value > 0)
    : [];
  return {
    action_times: actionTimes,
    total_action_count: clampNonNegativeInt(rawDay?.total_action_count, actionTimes.length),
    total_money_volume: clampNonNegativeInt(rawDay?.total_money_volume, 0),
    consignment_listing_count: clampNonNegativeInt(rawDay?.consignment_listing_count, 0),
    consignment_purchase_count: clampNonNegativeInt(rawDay?.consignment_purchase_count, 0),
    source_counts: rawDay?.source_counts && typeof rawDay.source_counts === 'object'
      ? Object.fromEntries(
          Object.entries(rawDay.source_counts)
            .map(([key, value]) => [String(key), clampNonNegativeInt(value, 0)])
            .filter(([, value]) => value > 0)
        )
      : {},
    open_listing_item_counts: rawDay?.open_listing_item_counts && typeof rawDay.open_listing_item_counts === 'object'
      ? Object.fromEntries(
          Object.entries(rawDay.open_listing_item_counts)
            .map(([key, value]) => [String(key), clampNonNegativeInt(value, 0)])
            .filter(([, value]) => value > 0)
        )
      : {},
  };
}

function normalizeUserState(rawUser) {
  const days = rawUser?.days && typeof rawUser.days === 'object' ? rawUser.days : {};
  const sortedKeys = Object.keys(days).sort().reverse().slice(0, MAX_DAYS_TO_KEEP);
  return {
    days: Object.fromEntries(sortedKeys.map(key => [key, normalizeUserDayState(days[key])])),
  };
}

function normalizeSanction(rawSanction) {
  if (!rawSanction || typeof rawSanction !== 'object') return null;
  return {
    username: sanitizeText(rawSanction.username, 80),
    blocked: rawSanction.blocked === true,
    reason: sanitizeText(rawSanction.reason, MAX_BLACKLIST_NOTES),
    created_at: clampNonNegativeInt(rawSanction.created_at, 0),
    updated_at: clampNonNegativeInt(rawSanction.updated_at, 0),
  };
}

function loadStore() {
  const raw = readJsonSafe(TAOYUAN_MARKET_GOVERNANCE_FILE, createEmptyStore());
  const users = raw?.users && typeof raw.users === 'object' ? raw.users : {};
  const sanctions = raw?.sanctions && typeof raw.sanctions === 'object' ? raw.sanctions : {};
  return {
    users: Object.fromEntries(Object.entries(users).map(([username, value]) => [String(username), normalizeUserState(value)])),
    sanctions: Object.fromEntries(
      Object.entries(sanctions)
        .map(([username, value]) => [String(username), normalizeSanction({ username, ...(value || {}) })])
        .filter(([, value]) => value && value.username)
    ),
  };
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(TAOYUAN_MARKET_GOVERNANCE_FILE), { recursive: true });
  writeJsonFileAtomic(TAOYUAN_MARKET_GOVERNANCE_FILE, store);
}

function getTradeGovernanceConfig() {
  const splitPatterns = String(cfg.get('taoyuan_market_rare_item_blocklist') || '')
    .split(/[,\r\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
  return {
    weekly_exchange_enabled: cfg.get('taoyuan_market_weekly_exchange_enabled') !== false,
    weekly_festival_pool_enabled: cfg.get('taoyuan_market_weekly_festival_pool_enabled') !== false,
    weekly_neighbor_pool_enabled: cfg.get('taoyuan_market_weekly_neighbor_pool_enabled') !== false,
    festival_stall_enabled: cfg.get('taoyuan_market_festival_stall_enabled') !== false,
    festival_ticket_sales_enabled: cfg.get('taoyuan_market_festival_ticket_sales_enabled') !== false,
    neighbor_consignment_enabled: cfg.get('taoyuan_market_neighbor_consignment_enabled') !== false,
    neighbor_friends_scope_enabled: cfg.get('taoyuan_market_neighbor_friends_scope_enabled') !== false,
    consignment_price_min_money: clampNonNegativeInt(cfg.get('taoyuan_market_consignment_price_min_money'), 20),
    consignment_price_max_money: clampPositiveInt(cfg.get('taoyuan_market_consignment_price_max_money'), 280),
    festival_price_min_money: clampNonNegativeInt(cfg.get('taoyuan_market_festival_price_min_money'), 80),
    festival_price_max_money: clampPositiveInt(cfg.get('taoyuan_market_festival_price_max_money'), 260),
    official_money_price_min_money: clampNonNegativeInt(cfg.get('taoyuan_market_official_money_price_min_money'), 80),
    official_money_price_max_money: clampPositiveInt(cfg.get('taoyuan_market_official_money_price_max_money'), 220),
    daily_trade_action_limit: clampPositiveInt(cfg.get('taoyuan_market_daily_trade_action_limit'), 10),
    daily_consignment_listing_limit: clampPositiveInt(cfg.get('taoyuan_market_daily_consignment_listing_limit'), 4),
    daily_consignment_purchase_limit: clampPositiveInt(cfg.get('taoyuan_market_daily_consignment_purchase_limit'), 4),
    min_action_interval_seconds: clampPositiveInt(cfg.get('taoyuan_market_min_action_interval_seconds'), 2),
    daily_money_volume_limit: clampPositiveInt(cfg.get('taoyuan_market_daily_money_volume_limit'), 1500),
    duplicate_open_listing_limit: clampPositiveInt(cfg.get('taoyuan_market_duplicate_open_listing_limit'), 2),
    rare_item_blocklist: splitPatterns,
  };
}

function patternToRegex(pattern) {
  const escaped = String(pattern || '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchesRareBlockedItem(itemId, patterns = []) {
  const normalized = String(itemId || '').trim();
  if (!normalized) return false;
  return patterns.some(pattern => patternToRegex(pattern).test(normalized));
}

function getUserDayState(store, username, dayKey = nowDayKey()) {
  const normalizedUsername = sanitizeText(username, 80);
  if (!store.users[normalizedUsername]) store.users[normalizedUsername] = normalizeUserState({});
  if (!store.users[normalizedUsername].days[dayKey]) {
    store.users[normalizedUsername].days[dayKey] = normalizeUserDayState({});
  }
  return store.users[normalizedUsername].days[dayKey];
}

function getUserDaySnapshot(store, username, dayKey = nowDayKey()) {
  const normalizedUsername = sanitizeText(username, 80);
  const state = store.users?.[normalizedUsername]?.days?.[dayKey];
  return normalizeUserDayState(state || {});
}

function getSanction(store, username) {
  return normalizeSanction(store.sanctions?.[sanitizeText(username, 80)] || null);
}

function ensureNotSanctioned(username, sourceLabel = '当前集市链路') {
  const store = loadStore();
  const sanction = getSanction(store, username);
  if (sanction?.blocked) {
    throw createError(`${sourceLabel}已对当前账号关闭：${sanction.reason || '已列入集市黑名单'}`, 403);
  }
}

function ensureSourceEnabled(source, options = {}) {
  const config = getTradeGovernanceConfig();
  if (source === 'weekly_exchange_station' && config.weekly_exchange_enabled !== true) {
    throw createError('本周官方交换站当前已关闭');
  }
  if (source === 'weekly_exchange_station' && options.category === 'festival' && config.weekly_festival_pool_enabled !== true) {
    throw createError('当前节庆主题池已关闭');
  }
  if (source === 'weekly_exchange_station' && options.category === 'neighbor' && config.weekly_neighbor_pool_enabled !== true) {
    throw createError('当前邻里专属池已关闭');
  }
  if (source === 'festival_stall' && config.festival_stall_enabled !== true) {
    throw createError('当前节庆摊位已关闭');
  }
  if (source === 'festival_stall' && options.category === 'tickets' && config.festival_ticket_sales_enabled !== true) {
    throw createError('当前节庆票券销售已关闭');
  }
  if (source === 'neighbor_consignment' && config.neighbor_consignment_enabled !== true) {
    throw createError('当前邻里寄售已关闭');
  }
  if (source === 'neighbor_consignment' && options.scope === 'friends' && config.neighbor_friends_scope_enabled !== true) {
    throw createError('当前只允许本邻里公开寄售，已暂时关闭“仅邻里好友”范围');
  }
}

function assertPriceWithinBand({ source, category = '', priceMoney = 0 }) {
  const config = getTradeGovernanceConfig();
  const price = clampNonNegativeInt(priceMoney, 0);
  if (source === 'neighbor_consignment') {
    if (price < config.consignment_price_min_money || price > config.consignment_price_max_money) {
      throw createError(`当前官方调控要求邻里寄售价保持在 ${config.consignment_price_min_money}-${config.consignment_price_max_money} 文之间`);
    }
    return;
  }
  if (source === 'festival_stall') {
    if (price < config.festival_price_min_money || price > config.festival_price_max_money) {
      throw createError(`当前官方调控要求节庆摊位价格保持在 ${config.festival_price_min_money}-${config.festival_price_max_money} 文之间`);
    }
    return;
  }
  if (source === 'weekly_exchange_station' && category === 'festival') {
    if (price > 0 && (price < config.official_money_price_min_money || price > config.official_money_price_max_money)) {
      throw createError(`当前官方调控要求官站现金回款保持在 ${config.official_money_price_min_money}-${config.official_money_price_max_money} 文之间`);
    }
  }
}

function ensureRareItemsAllowed(itemIds = [], sourceLabel = '当前交易') {
  const config = getTradeGovernanceConfig();
  const blockedItemId = itemIds.find(itemId => matchesRareBlockedItem(itemId, config.rare_item_blocklist));
  if (blockedItemId) {
    throw createError(`${sourceLabel}当前不允许处理稀有或纪念类条目：${blockedItemId}`);
  }
}

function ensureUserRateLimit(username, options = {}) {
  const config = getTradeGovernanceConfig();
  const store = loadStore();
  const dayState = getUserDaySnapshot(store, username, nowDayKey());
  const sourceLabel = sanitizeText(options.source_label, 40) || '当前交易';
  const nextActionCount = dayState.total_action_count + 1;
  if (nextActionCount > config.daily_trade_action_limit) {
    throw createError(`${sourceLabel}已达到今日操作上限（${config.daily_trade_action_limit} 次）`);
  }
  const lastActionAt = dayState.action_times[0] || 0;
  const interval = clampPositiveInt(config.min_action_interval_seconds, 2);
  if (String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim() === 'true') {
    if (nextActionCount > config.daily_trade_action_limit * 3) {
      throw createError(`${sourceLabel}已达到今日操作上限（${config.daily_trade_action_limit} 次）`);
    }
    return;
  }
  if (lastActionAt > 0 && nowSeconds() - lastActionAt < interval) {
    throw createError(`${sourceLabel}操作过快，请稍候 ${interval} 秒后再试`);
  }
  const nextMoneyVolume = dayState.total_money_volume + clampNonNegativeInt(options.money_volume, 0);
  if (nextMoneyVolume > config.daily_money_volume_limit) {
    throw createError(`${sourceLabel}已超过今日资金波动上限（${config.daily_money_volume_limit} 文）`);
  }
  if (options.counter_type === 'listing' && dayState.consignment_listing_count + 1 > config.daily_consignment_listing_limit) {
    throw createError(`今日挂单次数已达到官方上限（${config.daily_consignment_listing_limit} 次）`);
  }
  if (options.counter_type === 'purchase' && dayState.consignment_purchase_count + 1 > config.daily_consignment_purchase_limit) {
    throw createError(`今日寄售购买次数已达到官方上限（${config.daily_consignment_purchase_limit} 次）`);
  }
}

function ensureDuplicateOpenListingAllowed(username, itemId, openListings = []) {
  const config = getTradeGovernanceConfig();
  const store = loadStore();
  const dayState = getUserDaySnapshot(store, username, nowDayKey());
  const openCount = openListings.filter(listing =>
    String(listing?.seller_username || '') === String(username || '') &&
    String(listing?.item_id || '') === String(itemId || '') &&
    String(listing?.status || '') === 'open'
  ).length;
  const trackedCount = clampNonNegativeInt(dayState.open_listing_item_counts?.[String(itemId || '')], 0);
  const currentCount = Math.max(openCount, trackedCount);
  if (currentCount >= config.duplicate_open_listing_limit) {
    throw createError(`同一种物资今天最多保持 ${config.duplicate_open_listing_limit} 份在架挂单`);
  }
}

function applyGovernanceRecord(username, options = {}) {
  const normalizedUsername = sanitizeText(username, 80);
  if (!normalizedUsername) return null;
  const store = loadStore();
  const dayKey = nowDayKey();
  const dayState = getUserDayState(store, normalizedUsername, dayKey);
  const actionAt = nowSeconds();
  dayState.action_times = [actionAt, ...(dayState.action_times || [])].slice(0, 32);
  dayState.total_action_count = clampNonNegativeInt(dayState.total_action_count, 0) + 1;
  dayState.total_money_volume = clampNonNegativeInt(dayState.total_money_volume, 0) + clampNonNegativeInt(options.money_volume, 0);

  if (options.counter_type === 'listing') {
    dayState.consignment_listing_count = clampNonNegativeInt(dayState.consignment_listing_count, 0) + 1;
  }
  if (options.counter_type === 'purchase') {
    dayState.consignment_purchase_count = clampNonNegativeInt(dayState.consignment_purchase_count, 0) + 1;
  }
  const source = sanitizeText(options.source, 60);
  if (source) {
    dayState.source_counts[source] = clampNonNegativeInt(dayState.source_counts[source], 0) + 1;
  }
  const listingItemId = sanitizeText(options.open_listing_item_id, 40);
  if (listingItemId) {
    dayState.open_listing_item_counts[listingItemId] = clampNonNegativeInt(dayState.open_listing_item_counts[listingItemId], 0) + 1;
  }
  const clearedListingItemId = sanitizeText(options.clear_open_listing_item_id, 40);
  if (clearedListingItemId) {
    const nextCount = Math.max(0, clampNonNegativeInt(dayState.open_listing_item_counts[clearedListingItemId], 0) - 1);
    if (nextCount <= 0) {
      delete dayState.open_listing_item_counts[clearedListingItemId];
    } else {
      dayState.open_listing_item_counts[clearedListingItemId] = nextCount;
    }
  }

  const sortedDayKeys = Object.keys(store.users[normalizedUsername].days).sort().reverse().slice(0, MAX_DAYS_TO_KEEP);
  store.users[normalizedUsername].days = Object.fromEntries(sortedDayKeys.map(key => [key, normalizeUserDayState(store.users[normalizedUsername].days[key])]));
  saveStore(store);
  return normalizeUserDayState(dayState);
}

function updateMarketSanction(username, payload = {}) {
  const normalizedUsername = sanitizeText(username, 80);
  if (!normalizedUsername) throw createError('用户名不能为空');
  const store = loadStore();
  const next = normalizeSanction({
    username: normalizedUsername,
    blocked: payload.blocked === true,
    reason: sanitizeText(payload.reason, MAX_BLACKLIST_NOTES),
    created_at: store.sanctions?.[normalizedUsername]?.created_at || nowSeconds(),
    updated_at: nowSeconds(),
  });
  store.sanctions[normalizedUsername] = next;
  saveStore(store);
  return next;
}

function getMarketGovernanceOverview() {
  const config = getTradeGovernanceConfig();
  const store = loadStore();
  const blockedUsers = Object.values(store.sanctions)
    .map(normalizeSanction)
    .filter(entry => entry?.blocked)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0))
    .slice(0, 20);
  return {
    config,
    blocked_users: blockedUsers,
  };
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined) return fallback;
  return value === true || String(value).trim().toLowerCase() === 'true';
}

function normalizeConfigUpdate(payload = {}) {
  const current = getTradeGovernanceConfig();
  return {
    taoyuan_market_weekly_exchange_enabled: normalizeBoolean(payload.weekly_exchange_enabled, current.weekly_exchange_enabled),
    taoyuan_market_weekly_festival_pool_enabled: normalizeBoolean(payload.weekly_festival_pool_enabled, current.weekly_festival_pool_enabled),
    taoyuan_market_weekly_neighbor_pool_enabled: normalizeBoolean(payload.weekly_neighbor_pool_enabled, current.weekly_neighbor_pool_enabled),
    taoyuan_market_festival_stall_enabled: normalizeBoolean(payload.festival_stall_enabled, current.festival_stall_enabled),
    taoyuan_market_festival_ticket_sales_enabled: normalizeBoolean(payload.festival_ticket_sales_enabled, current.festival_ticket_sales_enabled),
    taoyuan_market_neighbor_consignment_enabled: normalizeBoolean(payload.neighbor_consignment_enabled, current.neighbor_consignment_enabled),
    taoyuan_market_neighbor_friends_scope_enabled: normalizeBoolean(payload.neighbor_friends_scope_enabled, current.neighbor_friends_scope_enabled),
    taoyuan_market_consignment_price_min_money: clampNonNegativeInt(payload.consignment_price_min_money, current.consignment_price_min_money),
    taoyuan_market_consignment_price_max_money: clampPositiveInt(payload.consignment_price_max_money, current.consignment_price_max_money),
    taoyuan_market_festival_price_min_money: clampNonNegativeInt(payload.festival_price_min_money, current.festival_price_min_money),
    taoyuan_market_festival_price_max_money: clampPositiveInt(payload.festival_price_max_money, current.festival_price_max_money),
    taoyuan_market_official_money_price_min_money: clampNonNegativeInt(payload.official_money_price_min_money, current.official_money_price_min_money),
    taoyuan_market_official_money_price_max_money: clampPositiveInt(payload.official_money_price_max_money, current.official_money_price_max_money),
    taoyuan_market_daily_trade_action_limit: clampPositiveInt(payload.daily_trade_action_limit, current.daily_trade_action_limit),
    taoyuan_market_daily_consignment_listing_limit: clampPositiveInt(payload.daily_consignment_listing_limit, current.daily_consignment_listing_limit),
    taoyuan_market_daily_consignment_purchase_limit: clampPositiveInt(payload.daily_consignment_purchase_limit, current.daily_consignment_purchase_limit),
    taoyuan_market_min_action_interval_seconds: clampPositiveInt(payload.min_action_interval_seconds, current.min_action_interval_seconds),
    taoyuan_market_daily_money_volume_limit: clampPositiveInt(payload.daily_money_volume_limit, current.daily_money_volume_limit),
    taoyuan_market_duplicate_open_listing_limit: clampPositiveInt(payload.duplicate_open_listing_limit, current.duplicate_open_listing_limit),
    taoyuan_market_rare_item_blocklist: Array.isArray(payload.rare_item_blocklist)
      ? payload.rare_item_blocklist.map(item => sanitizeText(item, 40)).filter(Boolean).join(',')
      : sanitizeText(payload.rare_item_blocklist, 120) || current.rare_item_blocklist.join(','),
  };
}

function updateMarketGovernanceConfig(payload = {}) {
  const updates = normalizeConfigUpdate(payload);
  if (updates.taoyuan_market_consignment_price_max_money < updates.taoyuan_market_consignment_price_min_money) {
    throw createError('寄售价上限不能小于下限');
  }
  if (updates.taoyuan_market_festival_price_max_money < updates.taoyuan_market_festival_price_min_money) {
    throw createError('节庆摊位价格上限不能小于下限');
  }
  if (updates.taoyuan_market_official_money_price_max_money < updates.taoyuan_market_official_money_price_min_money) {
    throw createError('官站现金回款上限不能小于下限');
  }
  cfg.setWithMeta(updates);
  return getTradeGovernanceConfig();
}

function buildPublicMarketGovernanceSnapshot(username) {
  const config = getTradeGovernanceConfig();
  const store = loadStore();
  const dayState = getUserDaySnapshot(store, username, nowDayKey());
  const sanction = getSanction(store, username);
  return {
    bulletin: '官方调控会统一约束价格区间、稀有品类、开关周期、反刷频率和黑名单制裁，优先保证慢交易不会膨胀成自由市场。',
    sources: [
      { id: 'weekly_exchange_station', label: '每周交换站', enabled: config.weekly_exchange_enabled, detail: config.weekly_exchange_enabled ? '官站慢交易开放中' : '官站慢交易暂停' },
      { id: 'weekly_festival_pool', label: '周站节庆池', enabled: config.weekly_festival_pool_enabled, detail: config.weekly_festival_pool_enabled ? '节庆池按周开放' : '节庆池已关闭' },
      { id: 'weekly_neighbor_pool', label: '周站邻里池', enabled: config.weekly_neighbor_pool_enabled, detail: config.weekly_neighbor_pool_enabled ? '邻里专属池开放' : '邻里专属池已关闭' },
      { id: 'festival_stall', label: '节庆摊位', enabled: config.festival_stall_enabled, detail: config.festival_stall_enabled ? '节庆窗口可售' : '节庆摊位暂停' },
      { id: 'festival_ticket_sales', label: '节庆票券', enabled: config.festival_ticket_sales_enabled, detail: config.festival_ticket_sales_enabled ? '票券投放开放' : '票券投放关闭' },
      { id: 'neighbor_consignment', label: '邻里寄售', enabled: config.neighbor_consignment_enabled, detail: config.neighbor_consignment_enabled ? '固定价寄售开放' : '寄售暂停' },
      { id: 'neighbor_friends_scope', label: '邻里好友范围', enabled: config.neighbor_friends_scope_enabled, detail: config.neighbor_friends_scope_enabled ? '允许仅邻里好友可见' : '仅保留本邻里公开' },
    ],
    price_bands: {
      consignment: { min_money: config.consignment_price_min_money, max_money: config.consignment_price_max_money },
      festival: { min_money: config.festival_price_min_money, max_money: config.festival_price_max_money },
      official_money: { min_money: config.official_money_price_min_money, max_money: config.official_money_price_max_money },
    },
    rare_policy: {
      official_only_categories: ['food', 'souvenir', 'ticket'],
      blocked_rules: [...config.rare_item_blocklist],
      summary: '节日食物、纪念品和票券优先保留给官方投放，邻里寄售只开放更可控的普通物资。',
    },
    anti_abuse: {
      daily_trade_action_limit: config.daily_trade_action_limit,
      daily_consignment_listing_limit: config.daily_consignment_listing_limit,
      daily_consignment_purchase_limit: config.daily_consignment_purchase_limit,
      min_action_interval_seconds: config.min_action_interval_seconds,
      daily_money_volume_limit: config.daily_money_volume_limit,
      duplicate_open_listing_limit: config.duplicate_open_listing_limit,
    },
    my_today: {
      day_key: nowDayKey(),
      total_action_count: dayState.total_action_count,
      total_money_volume: dayState.total_money_volume,
      consignment_listing_count: dayState.consignment_listing_count,
      consignment_purchase_count: dayState.consignment_purchase_count,
      next_action_ready_in_seconds: Math.max(0, config.min_action_interval_seconds - Math.max(0, nowSeconds() - (dayState.action_times[0] || 0))),
    },
    sanction: sanction?.blocked
      ? {
          blocked: true,
          reason: sanction.reason || '已被列入集市黑名单',
          updated_at: sanction.updated_at,
        }
      : {
          blocked: false,
          reason: '',
          updated_at: 0,
        },
  };
}

module.exports = {
  getTradeGovernanceConfig,
  getMarketGovernanceOverview,
  buildPublicMarketGovernanceSnapshot,
  updateMarketGovernanceConfig,
  ensureNotSanctioned,
  ensureSourceEnabled,
  assertPriceWithinBand,
  ensureRareItemsAllowed,
  ensureUserRateLimit,
  ensureDuplicateOpenListingAllowed,
  applyGovernanceRecord,
  updateMarketSanction,
};
