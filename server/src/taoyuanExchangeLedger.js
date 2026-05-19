const fs = require('fs');
const path = require('path');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data');
const TAOYUAN_WEEKLY_EXCHANGE_FILE = path.join(DATA_DIR, 'taoyuan_weekly_exchange_station.json');
const TAOYUAN_FESTIVAL_STALL_FILE = path.join(DATA_DIR, 'taoyuan_festival_stall.json');
const TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE = path.join(DATA_DIR, 'taoyuan_neighbor_consignments.json');
const TAOYUAN_EXCHANGE_LEDGER_FILE = path.join(DATA_DIR, 'taoyuan_exchange_ledger.json');
const MAX_DISPUTES_TO_KEEP = 240;
const MAX_LEDGER_ENTRIES_TO_RETURN = 48;

const DISPUTE_REASON_OPTIONS = Object.freeze([
  { id: 'price_mismatch', label: '价格或金额对不上' },
  { id: 'item_mismatch', label: '物资类型或数量不对' },
  { id: 'delivery_mismatch', label: '到账结果与记录不一致' },
  { id: 'timing_issue', label: '过期、取消或回收时机异常' },
  { id: 'other', label: '其他争议' },
]);

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function normalizeQuality(value) {
  return ['normal', 'fine', 'excellent', 'supreme'].includes(String(value)) ? String(value) : 'normal';
}

function readJsonFileSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sanitizeText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMoneyBundleEntry(entry) {
  if (entry?.type === 'money') {
    const amount = Math.max(0, Math.floor(Number(entry.amount) || 0));
    if (amount <= 0) return null;
    return { type: 'money', amount };
  }
  return null;
}

function normalizeBundleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const type = String(entry.type || '').trim();
  if (type === 'money') return normalizeMoneyBundleEntry(entry);
  if (type === 'ticket') {
    const ticketType = sanitizeText(entry.ticket_type, 40);
    const quantity = clampPositiveInt(entry.quantity, 0);
    if (!ticketType || quantity <= 0) return null;
    return {
      type: 'ticket',
      ticket_type: ticketType,
      quantity,
    };
  }
  const itemId = sanitizeText(entry.item_id, 40);
  const quantity = clampPositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  return {
    type: 'item',
    item_id: itemId,
    quantity,
    quality: normalizeQuality(entry.quality),
  };
}

function normalizeWeeklyRecord(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: sanitizeText(entry.id, 80) || makeId('weekly_exchange_record'),
    username: sanitizeText(entry.username, 80),
    offer_id: sanitizeText(entry.offer_id, 80),
    offer_name: sanitizeText(entry.offer_name, 80),
    week_key: sanitizeText(entry.week_key, 40),
    save_slot: Number.isInteger(Number(entry.save_slot)) ? Number(entry.save_slot) : null,
    created_at: Number(entry.created_at) || nowSeconds(),
    costs: Array.isArray(entry.costs) ? entry.costs.map(normalizeBundleEntry).filter(Boolean) : [],
    rewards: Array.isArray(entry.rewards) ? entry.rewards.map(normalizeBundleEntry).filter(Boolean) : [],
  };
}

function normalizeFestivalRecord(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: sanitizeText(entry.id, 80) || makeId('festival_stall_record'),
    username: sanitizeText(entry.username, 80),
    offer_id: sanitizeText(entry.offer_id, 80),
    offer_name: sanitizeText(entry.offer_name, 80),
    week_key: sanitizeText(entry.week_key, 40),
    save_slot: Number.isInteger(Number(entry.save_slot)) ? Number(entry.save_slot) : null,
    created_at: Number(entry.created_at) || nowSeconds(),
    costs: Array.isArray(entry.costs) ? entry.costs.map(normalizeBundleEntry).filter(Boolean) : [],
    rewards: Array.isArray(entry.rewards) ? entry.rewards.map(normalizeBundleEntry).filter(Boolean) : [],
  };
}

function normalizeNeighborListing(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: sanitizeText(entry.id, 80) || makeId('neighbor_listing'),
    group_id: sanitizeText(entry.group_id, 80),
    group_name: sanitizeText(entry.group_name, 80),
    seller_username: sanitizeText(entry.seller_username, 80),
    seller_save_slot: Number.isInteger(Number(entry.seller_save_slot)) ? Number(entry.seller_save_slot) : 0,
    item_id: sanitizeText(entry.item_id, 40),
    quantity: clampPositiveInt(entry.quantity, 0),
    quality: normalizeQuality(entry.quality),
    price_money: clampPositiveInt(entry.price_money, 0),
    scope: ['neighbors', 'friends'].includes(String(entry.scope)) ? String(entry.scope) : 'neighbors',
    status: ['open', 'sold', 'cancelled', 'expired', 'reclaimed'].includes(String(entry.status)) ? String(entry.status) : 'open',
    buyer_username: sanitizeText(entry.buyer_username, 80),
    created_at: Number(entry.created_at) || nowSeconds(),
    updated_at: Number(entry.updated_at) || Number(entry.created_at) || nowSeconds(),
    expires_at: Number(entry.expires_at) || 0,
    sold_at: Number(entry.sold_at) || 0,
    cancelled_at: Number(entry.cancelled_at) || 0,
    reclaimed_at: Number(entry.reclaimed_at) || 0,
  };
}

function normalizeNeighborRecord(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: sanitizeText(entry.id, 80) || makeId('neighbor_consignment_record'),
    listing_id: sanitizeText(entry.listing_id, 80),
    action: ['listed', 'sold', 'cancelled', 'expired', 'reclaimed'].includes(String(entry.action)) ? String(entry.action) : 'listed',
    group_id: sanitizeText(entry.group_id, 80),
    seller_username: sanitizeText(entry.seller_username, 80),
    buyer_username: sanitizeText(entry.buyer_username, 80),
    item_id: sanitizeText(entry.item_id, 40),
    quantity: clampPositiveInt(entry.quantity, 0),
    quality: normalizeQuality(entry.quality),
    price_money: clampPositiveInt(entry.price_money, 0),
    scope: ['neighbors', 'friends'].includes(String(entry.scope)) ? String(entry.scope) : 'neighbors',
    created_at: Number(entry.created_at) || nowSeconds(),
  };
}

function createEmptyLedgerStore() {
  return {
    disputes: [],
  };
}

function normalizeDispute(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const reasonCode = DISPUTE_REASON_OPTIONS.some(option => option.id === String(entry.reason_code))
    ? String(entry.reason_code)
    : 'other';
  const reasonLabel = DISPUTE_REASON_OPTIONS.find(option => option.id === reasonCode)?.label || '其他争议';
  return {
    id: sanitizeText(entry.id, 80) || makeId('exchange_dispute'),
    entry_id: sanitizeText(entry.entry_id, 120),
    source: sanitizeText(entry.source, 60),
    source_label: sanitizeText(entry.source_label, 40),
    event_label: sanitizeText(entry.event_label, 80),
    reported_by: sanitizeText(entry.reported_by, 80),
    counterparty_username: sanitizeText(entry.counterparty_username, 80),
    counterparty_label: sanitizeText(entry.counterparty_label, 80),
    status: ['open', 'resolved', 'dismissed'].includes(String(entry.status)) ? String(entry.status) : 'open',
    reason_code: reasonCode,
    reason_label: reasonLabel,
    note: sanitizeText(entry.note, 200),
    created_at: Number(entry.created_at) || nowSeconds(),
    updated_at: Number(entry.updated_at) || Number(entry.created_at) || nowSeconds(),
  };
}

function loadLedgerStore() {
  const raw = readJsonFileSafe(TAOYUAN_EXCHANGE_LEDGER_FILE, createEmptyLedgerStore());
  return {
    disputes: Array.isArray(raw?.disputes) ? raw.disputes.map(normalizeDispute).filter(Boolean).slice(0, MAX_DISPUTES_TO_KEEP) : [],
  };
}

function saveLedgerStore(store) {
  fs.mkdirSync(path.dirname(TAOYUAN_EXCHANGE_LEDGER_FILE), { recursive: true });
  writeJsonFileAtomic(TAOYUAN_EXCHANGE_LEDGER_FILE, {
    disputes: Array.isArray(store?.disputes) ? store.disputes.slice(0, MAX_DISPUTES_TO_KEEP) : [],
  });
}

function getNeighborScopeLabel(scope) {
  return scope === 'friends' ? '仅邻里好友' : '本邻里公开';
}

function getNeighborListingEffectiveStatus(listing) {
  const normalized = normalizeNeighborListing(listing);
  if (!normalized) return 'open';
  if (normalized.status !== 'open') return normalized.status;
  if (normalized.expires_at > 0 && normalized.expires_at <= nowSeconds()) return 'expired';
  return 'open';
}

function getMoneyAmount(entries = []) {
  return entries.reduce((sum, entry) => sum + (entry?.type === 'money' ? Math.max(0, Math.floor(Number(entry.amount) || 0)) : 0), 0);
}

function inferEntryCategories(entries = []) {
  const tags = new Set();
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.type === 'ticket') {
      tags.add('票券');
      continue;
    }
    if (entry.type === 'money') {
      tags.add('铜钱');
      continue;
    }
    const itemId = String(entry.item_id || '');
    if (itemId.startsWith('food_')) {
      tags.add('食物');
    } else if (itemId.includes('incense')) {
      tags.add('纪念品');
    } else {
      tags.add('材料');
    }
  }
  return Array.from(tags);
}

function buildPriceLabel(offeredEntries = [], receivedEntries = [], fallbackMoney = 0) {
  const offeredMoney = getMoneyAmount(offeredEntries);
  const receivedMoney = getMoneyAmount(receivedEntries);
  const resolvedFallbackMoney = clampPositiveInt(fallbackMoney, 0);
  if (offeredMoney > 0 && receivedMoney <= 0) return `${offeredMoney}文`;
  if (receivedMoney > 0 && offeredMoney <= 0) return `回款 ${receivedMoney}文`;
  if (offeredMoney > 0 && receivedMoney > 0) return `${offeredMoney}文 / ${receivedMoney}文`;
  if (resolvedFallbackMoney > 0) return `${resolvedFallbackMoney}文`;
  return '以物换物';
}

function buildWeeklyEntries(username) {
  const raw = readJsonFileSafe(TAOYUAN_WEEKLY_EXCHANGE_FILE, { weeks: {} });
  const entries = [];
  const weeks = raw?.weeks && typeof raw.weeks === 'object' ? raw.weeks : {};
  for (const [weekKey, weekState] of Object.entries(weeks)) {
    const records = Array.isArray(weekState?.records) ? weekState.records : [];
    for (const rawRecord of records) {
      const record = normalizeWeeklyRecord(rawRecord);
      if (!record || record.username !== username) continue;
      const categoryLabels = inferEntryCategories([...record.costs, ...record.rewards]);
      const moneyVolume = getMoneyAmount(record.costs) + getMoneyAmount(record.rewards);
      entries.push({
        id: `weekly_exchange_station_${record.id}`,
        source: 'weekly_exchange_station',
        source_label: '每周交换站',
        event_type: 'exchange_completed',
        event_label: '官站换物',
        title: record.offer_name || '每周换物',
        status: 'completed',
        status_label: '已完成',
        viewer_role: 'trader',
        actor_username: record.username,
        counterparty_username: '',
        counterparty_label: '桃源交换站',
        counterparty_type: 'official_station',
        created_at: record.created_at,
        week_key: sanitizeText(weekKey, 40) || record.week_key,
        scope_label: '官定慢交易',
        money_volume: moneyVolume,
        price_label: buildPriceLabel(record.costs, record.rewards, moneyVolume),
        offered_entries: record.costs,
        received_entries: record.rewards,
        category_labels: categoryLabels.length > 0 ? categoryLabels : ['慢交易'],
        reportable: true,
      });
    }
  }
  return entries;
}

function buildFestivalEntries(username) {
  const raw = readJsonFileSafe(TAOYUAN_FESTIVAL_STALL_FILE, { weeks: {} });
  const entries = [];
  const weeks = raw?.weeks && typeof raw.weeks === 'object' ? raw.weeks : {};
  for (const [weekKey, weekState] of Object.entries(weeks)) {
    const records = Array.isArray(weekState?.records) ? weekState.records : [];
    for (const rawRecord of records) {
      const record = normalizeFestivalRecord(rawRecord);
      if (!record || record.username !== username) continue;
      const categoryLabels = inferEntryCategories([...record.costs, ...record.rewards]);
      const moneyVolume = getMoneyAmount(record.costs) + getMoneyAmount(record.rewards);
      entries.push({
        id: `festival_stall_${record.id}`,
        source: 'festival_stall',
        source_label: '节庆摊位',
        event_type: 'purchase_completed',
        event_label: '节庆采购',
        title: record.offer_name || '节庆摊位商品',
        status: 'completed',
        status_label: '已完成',
        viewer_role: 'buyer',
        actor_username: record.username,
        counterparty_username: '',
        counterparty_label: '节庆摊位',
        counterparty_type: 'official_stall',
        created_at: record.created_at,
        week_key: sanitizeText(weekKey, 40) || record.week_key,
        scope_label: '节庆窗口',
        money_volume: moneyVolume,
        price_label: buildPriceLabel(record.costs, record.rewards, moneyVolume),
        offered_entries: record.costs,
        received_entries: record.rewards,
        category_labels: categoryLabels.length > 0 ? categoryLabels : ['节庆货物'],
        reportable: true,
      });
    }
  }
  return entries;
}

function buildNeighborRecordEntry(record, viewerUsername) {
  if (!record) return null;
  const seller = String(record.seller_username || '');
  const buyer = String(record.buyer_username || '');
  const itemEntry = {
    type: 'item',
    item_id: record.item_id,
    quantity: record.quantity,
    quality: record.quality,
  };
  const moneyEntry = {
    type: 'money',
    amount: record.price_money,
  };

  if (record.action === 'listed' && seller === viewerUsername) {
    return {
      id: `neighbor_consignment_${record.action}_${record.id}`,
      source: 'neighbor_consignment',
      source_label: '邻里寄售',
      event_type: 'consignment_listed',
      event_label: '挂出寄售',
      title: `${record.item_id} ×${record.quantity}`,
      status: 'open',
      status_label: '待成交',
      viewer_role: 'seller',
      actor_username: seller,
      counterparty_username: '',
      counterparty_label: getNeighborScopeLabel(record.scope),
      counterparty_type: 'neighbor_market',
      created_at: record.created_at,
      week_key: '',
      scope_label: getNeighborScopeLabel(record.scope),
      money_volume: record.price_money,
      price_label: `${record.price_money}文待售`,
      offered_entries: [itemEntry],
      received_entries: [],
      category_labels: inferEntryCategories([itemEntry]),
      reportable: false,
    };
  }

  if (record.action === 'sold' && (seller === viewerUsername || buyer === viewerUsername)) {
    const viewerIsBuyer = buyer === viewerUsername;
    return {
      id: `neighbor_consignment_${record.action}_${record.id}`,
      source: 'neighbor_consignment',
      source_label: '邻里寄售',
      event_type: 'consignment_sold',
      event_label: viewerIsBuyer ? '买入邻里寄售' : '卖出邻里寄售',
      title: `${record.item_id} ×${record.quantity}`,
      status: 'completed',
      status_label: '已成交',
      viewer_role: viewerIsBuyer ? 'buyer' : 'seller',
      actor_username: viewerUsername,
      counterparty_username: viewerIsBuyer ? seller : buyer,
      counterparty_label: viewerIsBuyer ? seller : buyer,
      counterparty_type: 'player',
      created_at: record.created_at,
      week_key: '',
      scope_label: getNeighborScopeLabel(record.scope),
      money_volume: record.price_money,
      price_label: `${record.price_money}文`,
      offered_entries: viewerIsBuyer ? [moneyEntry] : [itemEntry],
      received_entries: viewerIsBuyer ? [itemEntry] : [moneyEntry],
      category_labels: inferEntryCategories([itemEntry]),
      reportable: true,
    };
  }

  if (record.action === 'cancelled' && seller === viewerUsername) {
    return {
      id: `neighbor_consignment_${record.action}_${record.id}`,
      source: 'neighbor_consignment',
      source_label: '邻里寄售',
      event_type: 'consignment_cancelled',
      event_label: '取消寄售',
      title: `${record.item_id} ×${record.quantity}`,
      status: 'cancelled',
      status_label: '已取消',
      viewer_role: 'seller',
      actor_username: seller,
      counterparty_username: '',
      counterparty_label: getNeighborScopeLabel(record.scope),
      counterparty_type: 'neighbor_market',
      created_at: record.created_at,
      week_key: '',
      scope_label: getNeighborScopeLabel(record.scope),
      money_volume: record.price_money,
      price_label: `${record.price_money}文`,
      offered_entries: [],
      received_entries: [itemEntry],
      category_labels: inferEntryCategories([itemEntry]),
      reportable: true,
    };
  }

  if (record.action === 'reclaimed' && seller === viewerUsername) {
    return {
      id: `neighbor_consignment_${record.action}_${record.id}`,
      source: 'neighbor_consignment',
      source_label: '邻里寄售',
      event_type: 'consignment_reclaimed',
      event_label: '回收过期寄售',
      title: `${record.item_id} ×${record.quantity}`,
      status: 'reclaimed',
      status_label: '已回收',
      viewer_role: 'seller',
      actor_username: seller,
      counterparty_username: '',
      counterparty_label: getNeighborScopeLabel(record.scope),
      counterparty_type: 'neighbor_market',
      created_at: record.created_at,
      week_key: '',
      scope_label: getNeighborScopeLabel(record.scope),
      money_volume: record.price_money,
      price_label: `${record.price_money}文`,
      offered_entries: [],
      received_entries: [itemEntry],
      category_labels: inferEntryCategories([itemEntry]),
      reportable: true,
    };
  }

  return null;
}

function buildNeighborExpiredEntries(username, listings = [], existingEntryIds = new Set()) {
  const entries = [];
  for (const rawListing of listings) {
    const listing = normalizeNeighborListing(rawListing);
    if (!listing || listing.seller_username !== username) continue;
    if (getNeighborListingEffectiveStatus(listing) !== 'expired') continue;
    const expiredEntryId = `neighbor_consignment_expired_${listing.id}`;
    if (existingEntryIds.has(expiredEntryId)) continue;
    const itemEntry = {
      type: 'item',
      item_id: listing.item_id,
      quantity: listing.quantity,
      quality: listing.quality,
    };
    entries.push({
      id: expiredEntryId,
      source: 'neighbor_consignment',
      source_label: '邻里寄售',
      event_type: 'consignment_expired',
      event_label: '寄售过期待回收',
      title: `${listing.item_id} ×${listing.quantity}`,
      status: 'expired',
      status_label: '已过期',
      viewer_role: 'seller',
      actor_username: username,
      counterparty_username: '',
      counterparty_label: getNeighborScopeLabel(listing.scope),
      counterparty_type: 'neighbor_market',
      created_at: listing.expires_at || listing.updated_at || listing.created_at,
      week_key: '',
      scope_label: getNeighborScopeLabel(listing.scope),
      money_volume: listing.price_money,
      price_label: `${listing.price_money}文`,
      offered_entries: [itemEntry],
      received_entries: [],
      category_labels: inferEntryCategories([itemEntry]),
      reportable: true,
    });
  }
  return entries;
}

function buildNeighborEntries(username) {
  const raw = readJsonFileSafe(TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE, { listings: [], records: [] });
  const entries = [];
  const records = Array.isArray(raw?.records) ? raw.records.map(normalizeNeighborRecord).filter(Boolean) : [];
  for (const record of records) {
    const entry = buildNeighborRecordEntry(record, username);
    if (entry) entries.push(entry);
  }
  const existingEntryIds = new Set(entries.map(entry => entry.id));
  const expiredEntries = buildNeighborExpiredEntries(username, Array.isArray(raw?.listings) ? raw.listings : [], existingEntryIds);
  return [...entries, ...expiredEntries];
}

function buildViewerEntries(username) {
  return [
    ...buildWeeklyEntries(username),
    ...buildFestivalEntries(username),
    ...buildNeighborEntries(username),
  ].sort((left, right) => {
    if (right.created_at !== left.created_at) return right.created_at - left.created_at;
    return String(right.id).localeCompare(String(left.id));
  });
}

function buildTrustLevel(completedCount, totalDisputes, anomalyCount) {
  if (totalDisputes >= 3) return { id: 'watch', label: '争议待处理' };
  if (completedCount >= 8 && anomalyCount <= 1) return { id: 'steward', label: '稳健商路' };
  if (completedCount >= 4) return { id: 'steady', label: '常来常往' };
  if (completedCount >= 1) return { id: 'newcomer', label: '初入集市' };
  return { id: 'idle', label: '尚未开张' };
}

function attachDisputes(entry, disputes, viewerUsername) {
  const relatedDisputes = disputes
    .filter(dispute => dispute.entry_id === entry.id)
    .sort((left, right) => right.created_at - left.created_at);
  const openDisputes = relatedDisputes.filter(dispute => dispute.status === 'open');
  const latestDispute = relatedDisputes[0] || null;
  const viewerOpenDispute = openDisputes.find(dispute => dispute.reported_by === viewerUsername) || null;
  return {
    ...entry,
    dispute_count: relatedDisputes.length,
    open_dispute_count: openDisputes.length,
    latest_dispute: latestDispute,
    reportable: entry.reportable === true && !viewerOpenDispute,
  };
}

function buildLedgerSummary(entries, disputes, viewerUsername) {
  const completedEntries = entries.filter(entry => entry.status === 'completed');
  const anomalyEntries = entries.filter(entry => ['cancelled', 'expired', 'reclaimed'].includes(entry.status));
  const myDisputes = disputes.filter(dispute => dispute.reported_by === viewerUsername);
  const openDisputes = myDisputes.filter(dispute => dispute.status === 'open');

  const sourceRanks = Object.entries(
    completedEntries.reduce((acc, entry) => {
      const key = String(entry.source || 'unknown');
      if (!acc[key]) {
        acc[key] = {
          source: key,
          label: entry.source_label || key,
          count: 0,
        };
      }
      acc[key].count += 1;
      return acc;
    }, {})
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const counterpartyRanks = Object.entries(
    completedEntries.reduce((acc, entry) => {
      const key = String(entry.counterparty_username || entry.counterparty_label || entry.source);
      if (!acc[key]) {
        acc[key] = {
          key,
          username: entry.counterparty_username || '',
          label: entry.counterparty_label || entry.counterparty_username || entry.source_label,
          count: 0,
          money_volume: 0,
        };
      }
      acc[key].count += 1;
      acc[key].money_volume += clampPositiveInt(entry.money_volume, 0);
      return acc;
    }, {})
  )
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return right.money_volume - left.money_volume;
    })
    .slice(0, 5);

  const categoryRanks = Object.entries(
    completedEntries.reduce((acc, entry) => {
      const categories = Array.isArray(entry.category_labels) && entry.category_labels.length > 0
        ? entry.category_labels
        : ['未分类'];
      for (const label of categories) {
        acc[label] = (acc[label] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const totalMoneySpent = completedEntries.reduce((sum, entry) => {
    const offeredMoney = getMoneyAmount(entry.offered_entries);
    return sum + offeredMoney;
  }, 0);
  const totalMoneyReceived = completedEntries.reduce((sum, entry) => {
    const receivedMoney = getMoneyAmount(entry.received_entries);
    return sum + receivedMoney;
  }, 0);

  return {
    total_completed_count: completedEntries.length,
    total_entry_count: entries.length,
    anomaly_count: anomalyEntries.length,
    total_dispute_count: myDisputes.length,
    open_dispute_count: openDisputes.length,
    total_money_spent: totalMoneySpent,
    total_money_received: totalMoneyReceived,
    total_money_volume: completedEntries.reduce((sum, entry) => sum + clampPositiveInt(entry.money_volume, 0), 0),
    trust_level: buildTrustLevel(completedEntries.length, myDisputes.length, anomalyEntries.length),
    source_ranks: sourceRanks,
    counterparty_ranks: counterpartyRanks,
    category_ranks: categoryRanks,
  };
}

function buildExchangeLedgerOverview(username) {
  const normalizedUsername = sanitizeText(username, 80);
  const store = loadLedgerStore();
  const viewerEntries = buildViewerEntries(normalizedUsername);
  const enrichedEntries = viewerEntries.map(entry => attachDisputes(entry, store.disputes, normalizedUsername));
  const myDisputes = store.disputes
    .filter(dispute => dispute.reported_by === normalizedUsername)
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 12);

  return {
    bulletin: '这里会把每周交换站、节庆摊位和邻里寄售统一收进一份可回看的慢交易账本，并额外标出取消、过期、回收和争议。',
    reason_options: DISPUTE_REASON_OPTIONS.map(option => ({ ...option })),
    summary: buildLedgerSummary(enrichedEntries, store.disputes, normalizedUsername),
    entries: enrichedEntries.slice(0, MAX_LEDGER_ENTRIES_TO_RETURN),
    my_disputes: myDisputes,
  };
}

function findViewerEntry(username, entryId) {
  return buildViewerEntries(sanitizeText(username, 80)).find(entry => entry.id === String(entryId || '').trim()) || null;
}

function reportExchangeDispute(username, entryId, payload = {}) {
  const normalizedUsername = sanitizeText(username, 80);
  const targetEntry = findViewerEntry(normalizedUsername, entryId);
  if (!targetEntry) throw createError('这条交换记录不存在或当前账号无权查看', 404);
  if (targetEntry.reportable !== true) throw createError('这条交换记录当前不支持提交争议');

  const reasonCode = DISPUTE_REASON_OPTIONS.some(option => option.id === String(payload.reason_code || '').trim())
    ? String(payload.reason_code || '').trim()
    : 'other';
  const reasonLabel = DISPUTE_REASON_OPTIONS.find(option => option.id === reasonCode)?.label || '其他争议';
  const note = sanitizeText(payload.note, 200);

  const store = loadLedgerStore();
  const duplicateOpenDispute = store.disputes
    .map(normalizeDispute)
    .find(dispute => dispute && dispute.entry_id === targetEntry.id && dispute.reported_by === normalizedUsername && dispute.status === 'open');
  if (duplicateOpenDispute) throw createError('你已经为这条交换记录提交过一条待处理争议');

  const dispute = normalizeDispute({
    id: makeId('exchange_dispute'),
    entry_id: targetEntry.id,
    source: targetEntry.source,
    source_label: targetEntry.source_label,
    event_label: targetEntry.title || targetEntry.event_label,
    reported_by: normalizedUsername,
    counterparty_username: targetEntry.counterparty_username || '',
    counterparty_label: targetEntry.counterparty_label || '',
    status: 'open',
    reason_code: reasonCode,
    reason_label: reasonLabel,
    note,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });

  store.disputes = [dispute, ...store.disputes.map(normalizeDispute).filter(Boolean)].slice(0, MAX_DISPUTES_TO_KEEP);
  try {
    saveLedgerStore(store);
  } catch (error) {
    throw createError(`交换争议写入失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    dispute,
    ledger: buildExchangeLedgerOverview(normalizedUsername),
  };
}

module.exports = {
  listExchangeLedger: buildExchangeLedgerOverview,
  reportExchangeDispute,
};
