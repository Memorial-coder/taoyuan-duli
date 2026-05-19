const fs = require('fs');
const path = require('path');
const {
  createError,
  decryptTaoyuanRaw,
  encryptTaoyuanData,
  getActiveSaveContext,
  loadUserSaveSlots,
  nextSlotRevision,
  normalizeGameplaySaveContainer,
  saveUserSaveSlots,
  serializeGameplaySaveContainer,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');
const { getNeighborGroupForUser, isFriendWith } = require('./taoyuanSocialRuntime');
const marketGovernance = require('./taoyuanMarketGovernance');

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data');
const TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE = path.join(DATA_DIR, 'taoyuan_neighbor_consignments.json');
const ITEM_MAX_STACK = 999;
const TEMP_BAG_CAPACITY = 10;
const MAX_OPEN_LISTINGS_PER_USER = 8;
const MAX_LISTINGS_TO_KEEP = 240;
const MAX_RECORDS_TO_KEEP = 480;
const MAX_LISTING_QUANTITY = 99;
const MAX_PRICE_MONEY = 50000;
const MAX_DURATION_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_DURATION_SECONDS = 3 * 24 * 60 * 60;
const CONSIGNMENT_SCOPE_LABELS = Object.freeze({
  neighbors: '本邻里公开',
  friends: '仅邻里好友',
});

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

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createEmptyConsignmentStore() {
  return {
    listings: [],
    records: [],
  };
}

function normalizeListing(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: String(entry.id || makeId('neighbor_listing')),
    group_id: String(entry.group_id || ''),
    group_name: String(entry.group_name || '').trim(),
    seller_username: String(entry.seller_username || '').trim(),
    seller_save_slot: Number.isInteger(Number(entry.seller_save_slot)) ? Number(entry.seller_save_slot) : 0,
    item_id: String(entry.item_id || '').trim(),
    quantity: clampPositiveInt(entry.quantity, 0),
    quality: normalizeQuality(entry.quality),
    price_money: clampPositiveInt(entry.price_money, 0),
    scope: ['neighbors', 'friends'].includes(String(entry.scope)) ? String(entry.scope) : 'neighbors',
    status: ['open', 'sold', 'cancelled', 'expired', 'reclaimed'].includes(String(entry.status)) ? String(entry.status) : 'open',
    buyer_username: String(entry.buyer_username || '').trim(),
    created_at: Number(entry.created_at) || nowSeconds(),
    updated_at: Number(entry.updated_at) || Number(entry.created_at) || nowSeconds(),
    expires_at: Number(entry.expires_at) || 0,
    sold_at: Number(entry.sold_at) || 0,
    cancelled_at: Number(entry.cancelled_at) || 0,
    reclaimed_at: Number(entry.reclaimed_at) || 0,
  };
}

function normalizeRecord(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    id: String(entry.id || makeId('neighbor_consignment_record')),
    listing_id: String(entry.listing_id || ''),
    action: ['listed', 'sold', 'cancelled', 'expired', 'reclaimed'].includes(String(entry.action)) ? String(entry.action) : 'listed',
    group_id: String(entry.group_id || '').trim(),
    seller_username: String(entry.seller_username || '').trim(),
    buyer_username: String(entry.buyer_username || '').trim(),
    item_id: String(entry.item_id || '').trim(),
    quantity: clampPositiveInt(entry.quantity, 0),
    quality: normalizeQuality(entry.quality),
    price_money: clampPositiveInt(entry.price_money, 0),
    scope: ['neighbors', 'friends'].includes(String(entry.scope)) ? String(entry.scope) : 'neighbors',
    created_at: Number(entry.created_at) || nowSeconds(),
  };
}

function loadConsignmentStore() {
  try {
    if (!fs.existsSync(TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE)) return createEmptyConsignmentStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE, 'utf8'));
    return {
      listings: Array.isArray(raw?.listings) ? raw.listings.map(normalizeListing).filter(Boolean).slice(0, MAX_LISTINGS_TO_KEEP) : [],
      records: Array.isArray(raw?.records) ? raw.records.map(normalizeRecord).filter(Boolean).slice(0, MAX_RECORDS_TO_KEEP) : [],
    };
  } catch {
    return createEmptyConsignmentStore();
  }
}

function saveConsignmentStore(store) {
  fs.mkdirSync(path.dirname(TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE), { recursive: true });
  writeJsonFileAtomic(TAOYUAN_NEIGHBOR_CONSIGNMENT_FILE, {
    listings: Array.isArray(store?.listings) ? store.listings.slice(0, MAX_LISTINGS_TO_KEEP) : [],
    records: Array.isArray(store?.records) ? store.records.slice(0, MAX_RECORDS_TO_KEEP) : [],
  });
}

function appendRecord(store, patch) {
  const record = normalizeRecord({
    id: makeId('neighbor_consignment_record'),
    created_at: nowSeconds(),
    ...patch,
  });
  store.records = [record, ...(store.records || [])].slice(0, MAX_RECORDS_TO_KEEP);
  return record;
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
  if (!Number.isInteger(Number(saveData.inventory.capacity))) saveData.inventory.capacity = 24;
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  if (!Number.isFinite(Number(saveData.player.money))) saveData.player.money = 0;
}

function cloneInventorySlots(source) {
  return (source || []).map(slot => ({
    itemId: String(slot.itemId || ''),
    quality: normalizeQuality(slot.quality),
    quantity: clampPositiveInt(slot.quantity, 0),
    locked: !!slot.locked,
  })).filter(slot => slot.itemId && slot.quantity > 0);
}

function removeStackableItemFromSlots(slots, itemId, quantity, quality) {
  let remaining = quantity;
  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    const slot = slots[index];
    if (!slot || slot.itemId !== itemId || normalizeQuality(slot.quality) !== quality) continue;
    const slotQuantity = clampPositiveInt(slot.quantity, 0);
    const take = Math.min(remaining, slotQuantity);
    if (take <= 0) continue;
    slot.quantity = slotQuantity - take;
    remaining -= take;
    if (slot.quantity <= 0) {
      slots.splice(index, 1);
      index -= 1;
    }
  }
  return remaining <= 0;
}

function countStackableItemAnywhere(saveData, itemId, quality) {
  ensureInventoryState(saveData);
  return [...saveData.inventory.items, ...saveData.inventory.tempItems]
    .filter(slot => slot.itemId === itemId && (!quality || normalizeQuality(slot.quality) === quality))
    .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0);
}

function removeStackableItemAnywhere(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const normalizedItemId = String(itemId || '').trim();
  const safeQuantity = clampPositiveInt(quantity, 0);
  if (!normalizedItemId || safeQuantity <= 0) return false;
  if (countStackableItemAnywhere(saveData, normalizedItemId, quality) < safeQuantity) return false;

  let remaining = safeQuantity;
  const qualityOrder = quality ? [quality] : ['normal', 'fine', 'excellent', 'supreme'];
  for (const currentQuality of qualityOrder) {
    if (remaining <= 0) break;
    const tempCount = countStackableItemAnywhere({ inventory: { items: [], tempItems: saveData.inventory.tempItems } }, normalizedItemId, currentQuality);
    const takeFromTemp = Math.min(remaining, tempCount);
    if (takeFromTemp > 0) {
      removeStackableItemFromSlots(saveData.inventory.tempItems, normalizedItemId, takeFromTemp, currentQuality);
      remaining -= takeFromTemp;
    }
    const mainCount = countStackableItemAnywhere({ inventory: { items: saveData.inventory.items, tempItems: [] } }, normalizedItemId, currentQuality);
    const takeFromMain = Math.min(remaining, mainCount);
    if (takeFromMain > 0) {
      removeStackableItemFromSlots(saveData.inventory.items, normalizedItemId, takeFromMain, currentQuality);
      remaining -= takeFromMain;
    }
  }
  return remaining <= 0;
}

function simulateAddToSlots(mainSlots, mainCapacity, tempSlots, tempCapacity, stackableEntries) {
  for (const entry of stackableEntries) {
    let remaining = clampPositiveInt(entry.quantity, 0);
    if (remaining <= 0) continue;
    const quality = normalizeQuality(entry.quality);

    for (const slot of mainSlots) {
      if (remaining <= 0) break;
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue;
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity);
      slot.quantity += canAdd;
      remaining -= canAdd;
    }

    while (remaining > 0 && mainSlots.length < mainCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
      mainSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      });
      remaining -= addQuantity;
    }

    for (const slot of tempSlots) {
      if (remaining <= 0) break;
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue;
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity);
      slot.quantity += canAdd;
      remaining -= canAdd;
    }

    while (remaining > 0 && tempSlots.length < tempCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
      tempSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      });
      remaining -= addQuantity;
    }

    if (remaining > 0) return false;
  }
  return true;
}

function canFitRewardItems(saveData, rewards) {
  ensureInventoryState(saveData);
  const stackableEntries = rewards
    .map(entry => ({
      itemId: String(entry.item_id || '').trim(),
      quantity: clampPositiveInt(entry.quantity, 0),
      quality: normalizeQuality(entry.quality),
    }))
    .filter(entry => entry.itemId && entry.quantity > 0);
  if (stackableEntries.length === 0) return true;
  return simulateAddToSlots(
    cloneInventorySlots(saveData.inventory.items),
    clampPositiveInt(saveData.inventory.capacity, 24),
    cloneInventorySlots(saveData.inventory.tempItems),
    TEMP_BAG_CAPACITY,
    stackableEntries
  );
}

function addStackableItemToInventory(saveData, itemId, quantity, quality = 'normal') {
  ensureInventoryState(saveData);
  const items = saveData.inventory.items;
  const tempItems = saveData.inventory.tempItems;
  const capacity = clampPositiveInt(saveData.inventory.capacity, 24);
  let remaining = clampPositiveInt(quantity, 0);
  const normalizedQuality = normalizeQuality(quality);

  for (const slot of items) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && items.length < capacity) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
    items.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false });
    remaining -= addQuantity;
  }

  for (const slot of tempItems) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && tempItems.length < TEMP_BAG_CAPACITY) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
    tempItems.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false });
    remaining -= addQuantity;
  }

  return remaining <= 0;
}

function loadSlotContext(username, slot, missingMessage) {
  const normalizedUsername = String(username || '').trim();
  const normalizedSlot = Number.isInteger(Number(slot)) ? Number(slot) : null;
  if (!normalizedUsername || normalizedSlot === null) throw createError(missingMessage || '存档参数无效');
  const saves = loadUserSaveSlots(normalizedUsername);
  const raw = saves.slots[normalizedSlot]?.raw;
  if (!raw) throw createError(missingMessage || '对应服务端存档不存在');
  const decrypted = decryptTaoyuanRaw(raw);
  const saveContainer = normalizeGameplaySaveContainer(decrypted);
  const data = saveContainer?.gameplayData;
  if (!data?.player) throw createError('桃源乡存档解析失败，无法继续当前联机寄售操作');
  return {
    username: normalizedUsername,
    slot: normalizedSlot,
    saves,
    saveContainer,
    data,
  };
}

function persistSlotContext(context) {
  const currentRevision = context.saves.slots[context.slot]?.revision ?? 0;
  context.saves.slots[context.slot] = {
    raw: encryptTaoyuanData(serializeGameplaySaveContainer(context.saveContainer)),
    revision: nextSlotRevision(currentRevision),
  };
  saveUserSaveSlots(context.username, context.saves);
  return context.saves.slots[context.slot].revision;
}

function restoreSlotEntry(username, saves, slot, previousEntry) {
  if (!previousEntry) return;
  saves.slots[slot] = previousEntry;
  saveUserSaveSlots(username, saves);
}

function resolveExpiresAt(payload = {}) {
  const now = nowSeconds();
  const absolute = Number(payload.expires_at);
  if (Number.isFinite(absolute) && absolute > now) {
    if (absolute - now > MAX_DURATION_SECONDS) {
      throw createError('邻里寄售最长只能挂到 7 天后');
    }
    return Math.floor(absolute);
  }
  const durationHours = Math.floor(Number(payload.duration_hours) || 0);
  if (durationHours > 0) {
    const durationSeconds = durationHours * 60 * 60;
    if (durationSeconds > MAX_DURATION_SECONDS) throw createError('邻里寄售最长只能挂到 7 天后');
    return now + durationSeconds;
  }
  return now + DEFAULT_DURATION_SECONDS;
}

function getListingEffectiveStatus(listing, now = nowSeconds()) {
  if (listing.status === 'open' && listing.expires_at > 0 && listing.expires_at <= now) return 'expired';
  return listing.status;
}

function canViewerAccessListing(listing, viewerUsername, viewerGroup) {
  if (!viewerGroup || viewerGroup.id !== listing.group_id) return false;
  if (String(viewerUsername || '') === listing.seller_username) return true;
  if (listing.scope === 'friends') return isFriendWith(viewerUsername, listing.seller_username);
  return true;
}

function buildListingSummary(listing, viewerUsername, viewerGroup) {
  const effectiveStatus = getListingEffectiveStatus(listing);
  const sellerSelf = String(viewerUsername || '') === listing.seller_username;
  const canSee = effectiveStatus === 'open'
    ? canViewerAccessListing(listing, viewerUsername, viewerGroup)
    : sellerSelf;
  let canBuy = effectiveStatus === 'open' && canViewerAccessListing(listing, viewerUsername, viewerGroup) && !sellerSelf;
  let governanceReason = '';
  if (canBuy) {
    try {
      marketGovernance.ensureNotSanctioned(viewerUsername, '邻里寄售');
      marketGovernance.ensureSourceEnabled('neighbor_consignment', { scope: listing.scope });
      marketGovernance.ensureUserRateLimit(viewerUsername, {
        source: 'neighbor_consignment',
        source_label: '邻里寄售',
        counter_type: 'purchase',
        money_volume: listing.price_money,
      });
    } catch (error) {
      canBuy = false;
      governanceReason = error?.message || '当前官方调控暂不允许购买这份寄售';
    }
  }
  return {
    id: listing.id,
    group_id: listing.group_id,
    group_name: listing.group_name,
    seller_username: listing.seller_username,
    item_id: listing.item_id,
    quantity: listing.quantity,
    quality: listing.quality,
    price_money: listing.price_money,
    scope: listing.scope,
    scope_label: CONSIGNMENT_SCOPE_LABELS[listing.scope] || CONSIGNMENT_SCOPE_LABELS.neighbors,
    status: effectiveStatus,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
    expires_at: listing.expires_at,
    sold_at: listing.sold_at || null,
    cancelled_at: listing.cancelled_at || null,
    reclaimed_at: listing.reclaimed_at || null,
    buyer_username: listing.buyer_username || '',
    visible_to_viewer: canSee,
    can_buy: canBuy,
    can_cancel: effectiveStatus === 'open' && sellerSelf,
    can_reclaim: effectiveStatus === 'expired' && sellerSelf,
    governance_reason: governanceReason,
  };
}

function buildOverview(username) {
  const neighborGroup = getNeighborGroupForUser(username);
  const store = loadConsignmentStore();
  const normalizedUsername = String(username || '').trim();
  const governanceConfig = marketGovernance.getTradeGovernanceConfig();
  const openListings = store.listings
    .map(normalizeListing)
    .filter(Boolean)
    .map(listing => buildListingSummary(listing, normalizedUsername, neighborGroup))
    .filter(listing => listing.status === 'open' && listing.visible_to_viewer)
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 20);
  const myListings = store.listings
    .map(normalizeListing)
    .filter(listing => listing && listing.seller_username === normalizedUsername)
    .map(listing => buildListingSummary(listing, normalizedUsername, neighborGroup))
    .sort((left, right) => {
      const statusRank = { open: 0, expired: 1, sold: 2, cancelled: 3, reclaimed: 4 };
      const leftRank = statusRank[left.status] ?? 9;
      const rightRank = statusRank[right.status] ?? 9;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return right.updated_at - left.updated_at;
    })
    .slice(0, 12);
  return {
    bulletin: '邻里寄售只在本邻里内部流转，支持固定价、范围限制、主动取消和到期回收，不会变成全服自由拍卖。当前还会额外受官方价格区间、稀有品类限制和反刷规则约束。',
    neighbor_group: neighborGroup
      ? {
          id: neighborGroup.id,
          name: neighborGroup.name,
          role: neighborGroup.role,
          member_count: neighborGroup.member_count,
        }
      : null,
    scope_options: [
      { id: 'neighbors', label: CONSIGNMENT_SCOPE_LABELS.neighbors },
      ...(governanceConfig.neighbor_friends_scope_enabled ? [{ id: 'friends', label: CONSIGNMENT_SCOPE_LABELS.friends }] : []),
    ],
    open_listings: openListings,
    my_listings: myListings,
  };
}

function listNeighborConsignments(username) {
  return buildOverview(username);
}

function createNeighborConsignment(username, payload = {}) {
  const neighborGroup = getNeighborGroupForUser(username);
  if (!neighborGroup) throw createError('加入邻里后才能使用邻里寄售', 403);
  marketGovernance.ensureNotSanctioned(username, '邻里寄售');

  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法挂出寄售');
  context.username = username;
  ensureInventoryState(context.data);

  const itemId = String(payload.item_id || '').trim();
  const quantity = clampPositiveInt(payload.quantity, 0);
  const priceMoney = clampPositiveInt(payload.price_money, 0);
  const scope = ['neighbors', 'friends'].includes(String(payload.scope)) ? String(payload.scope) : 'neighbors';
  const expiresAt = resolveExpiresAt(payload);
  const availableNormalQuantity = countStackableItemAnywhere(context.data, itemId, 'normal');
  if (!itemId) throw createError('请先选择要寄售的物资');
  if (quantity <= 0 || quantity > MAX_LISTING_QUANTITY) throw createError(`寄售数量需要在 1-${MAX_LISTING_QUANTITY} 之间`);
  if (priceMoney <= 0 || priceMoney > MAX_PRICE_MONEY) throw createError(`固定价需要在 1-${MAX_PRICE_MONEY} 文之间`);
  if (availableNormalQuantity < quantity) {
    throw createError('当前邻里寄售只支持挂出普通品质物资，请先确认服务端存档中的普通品质库存');
  }
  marketGovernance.ensureSourceEnabled('neighbor_consignment', { scope });
  marketGovernance.assertPriceWithinBand({
    source: 'neighbor_consignment',
    priceMoney,
  });
  marketGovernance.ensureRareItemsAllowed([itemId], '邻里寄售');

  const store = loadConsignmentStore();
  const currentOpenCount = store.listings
    .map(normalizeListing)
    .filter(listing => listing && listing.seller_username === String(username) && getListingEffectiveStatus(listing) === 'open')
    .length;
  if (currentOpenCount >= MAX_OPEN_LISTINGS_PER_USER) {
    throw createError(`每位玩家最多同时挂出 ${MAX_OPEN_LISTINGS_PER_USER} 个邻里寄售`);
  }
  marketGovernance.ensureDuplicateOpenListingAllowed(username, itemId, store.listings.map(normalizeListing).filter(Boolean));
  marketGovernance.ensureUserRateLimit(username, {
    source: 'neighbor_consignment',
    source_label: '邻里寄售',
    counter_type: 'listing',
    open_listing_item_id: itemId,
  });

  if (!removeStackableItemAnywhere(context.data, itemId, quantity, 'normal')) {
    throw createError('服务端存档中的物资不足，无法挂出这份寄售');
  }

  const previousSlotEntry = context.saves.slots[context.slot] ? { ...context.saves.slots[context.slot] } : null;
  const listing = normalizeListing({
    id: makeId('neighbor_listing'),
    group_id: neighborGroup.id,
    group_name: neighborGroup.name,
    seller_username: String(username),
    seller_save_slot: context.slot,
    item_id: itemId,
    quantity,
    quality: 'normal',
    price_money: priceMoney,
    scope,
    status: 'open',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    expires_at: expiresAt,
  });
  store.listings = [listing, ...store.listings].slice(0, MAX_LISTINGS_TO_KEEP);
  appendRecord(store, {
    listing_id: listing.id,
    action: 'listed',
    group_id: listing.group_id,
    seller_username: listing.seller_username,
    item_id: listing.item_id,
    quantity: listing.quantity,
    quality: listing.quality,
    price_money: listing.price_money,
    scope: listing.scope,
  });

  try {
    persistSlotContext(context);
    saveConsignmentStore(store);
    marketGovernance.applyGovernanceRecord(username, {
      source: 'neighbor_consignment',
      counter_type: 'listing',
      open_listing_item_id: itemId,
    });
  } catch (error) {
    restoreSlotEntry(username, context.saves, context.slot, previousSlotEntry);
    throw createError(`邻里寄售挂单失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    actor_save_slot: context.slot,
    listing: buildListingSummary(listing, username, neighborGroup),
    overview: buildOverview(username),
  };
}

function buyNeighborConsignment(username, listingId) {
  const buyerGroup = getNeighborGroupForUser(username);
  if (!buyerGroup) throw createError('加入邻里后才能使用邻里寄售', 403);
  marketGovernance.ensureNotSanctioned(username, '邻里寄售');

  const store = loadConsignmentStore();
  const listing = store.listings
    .map(normalizeListing)
    .find(entry => entry && entry.id === String(listingId || '').trim());
  if (!listing) throw createError('寄售单不存在', 404);
  if (listing.seller_username === String(username)) throw createError('不能购买自己挂出的寄售');
  const effectiveStatus = getListingEffectiveStatus(listing);
  if (effectiveStatus === 'expired') throw createError('这份寄售已经过期，请等待卖家回收');
  if (effectiveStatus !== 'open') throw createError('这份寄售已经结束');
  if (!canViewerAccessListing(listing, username, buyerGroup)) throw createError('你当前无权查看或购买这份寄售', 403);
  marketGovernance.ensureSourceEnabled('neighbor_consignment', { scope: listing.scope });
  marketGovernance.ensureUserRateLimit(username, {
    source: 'neighbor_consignment',
    source_label: '邻里寄售',
    counter_type: 'purchase',
    money_volume: listing.price_money,
  });

  const buyerContext = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法购买邻里寄售');
  buyerContext.username = username;
  ensureInventoryState(buyerContext.data);
  const currentMoney = Math.max(0, Math.floor(Number(buyerContext.data.player.money) || 0));
  if (currentMoney < listing.price_money) throw createError('铜钱不足，无法买下这份寄售');
  if (!canFitRewardItems(buyerContext.data, [{ item_id: listing.item_id, quantity: listing.quantity, quality: listing.quality }])) {
    throw createError('背包空间不足，请先整理背包');
  }

  const sellerContext = loadSlotContext(listing.seller_username, listing.seller_save_slot, '卖家的服务端存档不存在，无法完成这次邻里寄售结算');
  ensureInventoryState(sellerContext.data);
  const previousBuyerSlotEntry = buyerContext.saves.slots[buyerContext.slot] ? { ...buyerContext.saves.slots[buyerContext.slot] } : null;
  const previousSellerSlotEntry = sellerContext.saves.slots[sellerContext.slot] ? { ...sellerContext.saves.slots[sellerContext.slot] } : null;

  buyerContext.data.player.money = currentMoney - listing.price_money;
  if (!addStackableItemToInventory(buyerContext.data, listing.item_id, listing.quantity, listing.quality)) {
    throw createError('背包空间不足，请先整理背包');
  }
  sellerContext.data.player.money = Math.max(0, Math.floor(Number(sellerContext.data.player.money) || 0) + listing.price_money);

  const soldAt = nowSeconds();
  listing.status = 'sold';
  listing.buyer_username = String(username);
  listing.sold_at = soldAt;
  listing.updated_at = soldAt;
  store.listings = store.listings.map(entry => {
    const normalized = normalizeListing(entry);
    return normalized && normalized.id === listing.id ? listing : normalized;
  });
  appendRecord(store, {
    listing_id: listing.id,
    action: 'sold',
    group_id: listing.group_id,
    seller_username: listing.seller_username,
    buyer_username: String(username),
    item_id: listing.item_id,
    quantity: listing.quantity,
    quality: listing.quality,
    price_money: listing.price_money,
    scope: listing.scope,
  });

  try {
    persistSlotContext(buyerContext);
    persistSlotContext(sellerContext);
    saveConsignmentStore(store);
    marketGovernance.applyGovernanceRecord(username, {
      source: 'neighbor_consignment',
      counter_type: 'purchase',
      money_volume: listing.price_money,
    });
    marketGovernance.applyGovernanceRecord(listing.seller_username, {
      source: 'neighbor_consignment',
      money_volume: listing.price_money,
      clear_open_listing_item_id: listing.item_id,
    });
  } catch (error) {
    restoreSlotEntry(username, buyerContext.saves, buyerContext.slot, previousBuyerSlotEntry);
    restoreSlotEntry(sellerContext.username, sellerContext.saves, sellerContext.slot, previousSellerSlotEntry);
    throw createError(`邻里寄售结算失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    actor_save_slot: buyerContext.slot,
    listing: buildListingSummary(listing, username, buyerGroup),
    overview: buildOverview(username),
  };
}

function cancelNeighborConsignment(username, listingId) {
  const neighborGroup = getNeighborGroupForUser(username);
  if (!neighborGroup) throw createError('加入邻里后才能使用邻里寄售', 403);

  const store = loadConsignmentStore();
  const listing = store.listings
    .map(normalizeListing)
    .find(entry => entry && entry.id === String(listingId || '').trim());
  if (!listing) throw createError('寄售单不存在', 404);
  if (listing.seller_username !== String(username)) throw createError('只有寄售发起人可以取消这份挂单', 403);
  if (getListingEffectiveStatus(listing) !== 'open') throw createError('只有进行中的寄售才能取消');

  const sellerContext = loadSlotContext(listing.seller_username, listing.seller_save_slot, '寄售发起人的服务端存档不存在，无法回收这份物资');
  ensureInventoryState(sellerContext.data);
  if (!canFitRewardItems(sellerContext.data, [{ item_id: listing.item_id, quantity: listing.quantity, quality: listing.quality }])) {
    throw createError('背包空间不足，无法取消寄售并回收物资');
  }

  const previousSellerSlotEntry = sellerContext.saves.slots[sellerContext.slot] ? { ...sellerContext.saves.slots[sellerContext.slot] } : null;
  if (!addStackableItemToInventory(sellerContext.data, listing.item_id, listing.quantity, listing.quality)) {
    throw createError('背包空间不足，无法取消寄售并回收物资');
  }

  const cancelledAt = nowSeconds();
  listing.status = 'cancelled';
  listing.cancelled_at = cancelledAt;
  listing.updated_at = cancelledAt;
  store.listings = store.listings.map(entry => {
    const normalized = normalizeListing(entry);
    return normalized && normalized.id === listing.id ? listing : normalized;
  });
  appendRecord(store, {
    listing_id: listing.id,
    action: 'cancelled',
    group_id: listing.group_id,
    seller_username: listing.seller_username,
    item_id: listing.item_id,
    quantity: listing.quantity,
    quality: listing.quality,
    price_money: listing.price_money,
    scope: listing.scope,
  });

  try {
    persistSlotContext(sellerContext);
    saveConsignmentStore(store);
    marketGovernance.applyGovernanceRecord(sellerContext.username, {
      source: 'neighbor_consignment',
      clear_open_listing_item_id: listing.item_id,
    });
  } catch (error) {
    restoreSlotEntry(sellerContext.username, sellerContext.saves, sellerContext.slot, previousSellerSlotEntry);
    throw createError(`取消邻里寄售失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    actor_save_slot: sellerContext.slot,
    listing: buildListingSummary(listing, username, neighborGroup),
    overview: buildOverview(username),
  };
}

function reclaimExpiredNeighborConsignment(username, listingId) {
  const neighborGroup = getNeighborGroupForUser(username);
  if (!neighborGroup) throw createError('加入邻里后才能使用邻里寄售', 403);

  const store = loadConsignmentStore();
  const listing = store.listings
    .map(normalizeListing)
    .find(entry => entry && entry.id === String(listingId || '').trim());
  if (!listing) throw createError('寄售单不存在', 404);
  if (listing.seller_username !== String(username)) throw createError('只有寄售发起人可以回收这份过期挂单', 403);
  if (getListingEffectiveStatus(listing) !== 'expired') throw createError('只有过期挂单才需要回收');

  const sellerContext = loadSlotContext(listing.seller_username, listing.seller_save_slot, '寄售发起人的服务端存档不存在，无法回收这份物资');
  ensureInventoryState(sellerContext.data);
  if (!canFitRewardItems(sellerContext.data, [{ item_id: listing.item_id, quantity: listing.quantity, quality: listing.quality }])) {
    throw createError('背包空间不足，无法回收这份过期物资');
  }

  const previousSellerSlotEntry = sellerContext.saves.slots[sellerContext.slot] ? { ...sellerContext.saves.slots[sellerContext.slot] } : null;
  if (!addStackableItemToInventory(sellerContext.data, listing.item_id, listing.quantity, listing.quality)) {
    throw createError('背包空间不足，无法回收这份过期物资');
  }

  const reclaimedAt = nowSeconds();
  listing.status = 'reclaimed';
  listing.reclaimed_at = reclaimedAt;
  listing.updated_at = reclaimedAt;
  store.listings = store.listings.map(entry => {
    const normalized = normalizeListing(entry);
    return normalized && normalized.id === listing.id ? listing : normalized;
  });
  appendRecord(store, {
    listing_id: listing.id,
    action: 'reclaimed',
    group_id: listing.group_id,
    seller_username: listing.seller_username,
    item_id: listing.item_id,
    quantity: listing.quantity,
    quality: listing.quality,
    price_money: listing.price_money,
    scope: listing.scope,
  });

  try {
    persistSlotContext(sellerContext);
    saveConsignmentStore(store);
    marketGovernance.applyGovernanceRecord(sellerContext.username, {
      source: 'neighbor_consignment',
      clear_open_listing_item_id: listing.item_id,
    });
  } catch (error) {
    restoreSlotEntry(sellerContext.username, sellerContext.saves, sellerContext.slot, previousSellerSlotEntry);
    throw createError(`回收过期寄售失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    actor_save_slot: sellerContext.slot,
    listing: buildListingSummary(listing, username, neighborGroup),
    overview: buildOverview(username),
  };
}

module.exports = {
  listNeighborConsignments,
  createNeighborConsignment,
  buyNeighborConsignment,
  cancelNeighborConsignment,
  reclaimExpiredNeighborConsignment,
};
