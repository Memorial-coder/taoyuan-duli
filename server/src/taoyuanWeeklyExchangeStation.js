const fs = require('fs');
const path = require('path');
const {
  createError,
  getActiveSaveContext,
  persistGameplayData,
  saveUserSaveSlots,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');
const { getNeighborGroupForUser } = require('./taoyuanSocialRuntime');

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data');
const TAOYUAN_WEEKLY_EXCHANGE_FILE = path.join(DATA_DIR, 'taoyuan_weekly_exchange_station.json');
const ITEM_MAX_STACK = 999;
const TEMP_BAG_CAPACITY = 10;
const MAX_RECORDS_PER_WEEK = 200;
const MAX_WEEKS_TO_KEEP = 16;

const FIXED_WEEKLY_OFFER_IDS = ['wintersweet_for_herb', 'wood_for_stone'];
const OFFER_CATEGORIES = Object.freeze({
  slow_trade: '慢交易',
  festival: '节庆主题池',
  neighbor: '邻里专属池',
});
const FESTIVAL_THEME_ROTATIONS = Object.freeze([
  {
    id: 'lantern_fair',
    label: '灯会筹备周',
    bulletin: '本周节庆主题池偏向灯会与摊位布置物资，适合补齐彩纸、竹材与节庆燃料。',
    preferred_offer_ids: ['bamboo_for_paper', 'bamboo_for_herb'],
  },
  {
    id: 'harvest_banquet',
    label: '秋宴备货周',
    bulletin: '本周节庆主题池偏向宴席与集市备货，适合把柴火和草药换成更容易消化的节庆物资。',
    preferred_offer_ids: ['firewood_for_money', 'bamboo_for_herb'],
  },
  {
    id: 'winter_hearth',
    label: '围炉暖集周',
    bulletin: '本周节庆主题池偏向围炉与冬集补给，适合在节前先准备彩纸、柴火和常备草药。',
    preferred_offer_ids: ['firewood_for_money', 'bamboo_for_paper'],
  },
]);

const WEEKLY_EXCHANGE_OFFERS = Object.freeze([
  {
    id: 'wintersweet_for_herb',
    name: '节气草药换',
    description: '把一枝腊梅交给交换站，换回两份常用草药。',
    badge: '慢交易',
    costs: [{ type: 'item', item_id: 'wintersweet', quantity: 1 }],
    rewards: [{ type: 'item', item_id: 'herb', quantity: 2 }],
    weekly_limit_per_user: 2,
    station_stock: 80,
    tags: ['节气互换', '官方控价'],
    category: 'slow_trade',
  },
  {
    id: 'wood_for_stone',
    name: '修缮建材换',
    description: '站里按官定比价收木料，换一批村社修缮石材。',
    badge: '官定价',
    costs: [{ type: 'item', item_id: 'wood', quantity: 4 }],
    rewards: [{ type: 'item', item_id: 'stone', quantity: 10 }],
    weekly_limit_per_user: 1,
    station_stock: 60,
    tags: ['村社修缮', '限量换物'],
    category: 'slow_trade',
  },
  {
    id: 'herb_for_firewood',
    name: '药铺换柴',
    description: '把多余草药交给站里，可换一批常用柴火。',
    badge: '补给',
    costs: [{ type: 'item', item_id: 'herb', quantity: 3 }],
    rewards: [{ type: 'item', item_id: 'firewood', quantity: 8 }],
    weekly_limit_per_user: 2,
    station_stock: 72,
    tags: ['日常补给', '指定品类'],
    category: 'slow_trade',
  },
  {
    id: 'stone_for_paper',
    name: '石料换文书',
    description: '石料交由站里统筹，可换回一批记账和公告用纸。',
    badge: '村务',
    costs: [{ type: 'item', item_id: 'stone', quantity: 8 }],
    rewards: [{ type: 'item', item_id: 'paper', quantity: 3 }],
    weekly_limit_per_user: 1,
    station_stock: 48,
    tags: ['村社治理', '官方控价'],
    category: 'slow_trade',
  },
  {
    id: 'firewood_for_money',
    name: '集市燃料回收',
    description: '节会前统一回收柴火，按官定价折成现钱返还。',
    badge: '节会备货',
    costs: [{ type: 'item', item_id: 'firewood', quantity: 6 }],
    rewards: [{ type: 'money', amount: 120 }],
    weekly_limit_per_user: 1,
    station_stock: 40,
    tags: ['节庆物资', '官方控价'],
    category: 'festival',
  },
  {
    id: 'bamboo_for_herb',
    name: '竹材换药草',
    description: '竹材进站后会优先用于节会摊位，换回一批应急草药。',
    badge: '节庆互换',
    costs: [{ type: 'item', item_id: 'bamboo', quantity: 4 }],
    rewards: [{ type: 'item', item_id: 'herb', quantity: 3 }],
    weekly_limit_per_user: 1,
    station_stock: 36,
    tags: ['节庆物资', '指定品类'],
    category: 'festival',
  },
  {
    id: 'bamboo_for_paper',
    name: '竹灯彩纸换',
    description: '节庆灯会用纸缺口时，可以拿竹材换来几张彩纸。只在节气灯会周开放。',
    badge: '灯会主题',
    costs: [{ type: 'item', item_id: 'bamboo', quantity: 3 }],
    rewards: [{ type: 'item', item_id: 'paper', quantity: 4 }],
    weekly_limit_per_user: 1,
    station_stock: 28,
    tags: ['灯会', '节庆主题池'],
    category: 'festival',
  },
  {
    id: 'wintersweet_for_firewood',
    name: '邻里炉火换',
    description: '邻里互访时把一枝腊梅交到共用物资台，可换回一批邻里共备的柴火。',
    badge: '邻里专属',
    costs: [{ type: 'item', item_id: 'wintersweet', quantity: 1 }],
    rewards: [{ type: 'item', item_id: 'firewood', quantity: 9 }],
    weekly_limit_per_user: 1,
    station_stock: 20,
    tags: ['邻里补给', '邻里专属池'],
    category: 'neighbor',
  },
]);

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

function createEmptyExchangeStore() {
  return {
    weeks: {},
  };
}

function normalizeBundleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const type = String(entry.type || '').trim();
  if (type === 'money') {
    const amount = clampPositiveInt(entry.amount, 0);
    if (amount <= 0) return null;
    return { type: 'money', amount };
  }
  if (type === 'item') {
    const itemId = String(entry.item_id || '').trim();
    const quantity = clampPositiveInt(entry.quantity, 0);
    if (!itemId || quantity <= 0) return null;
    return {
      type: 'item',
      item_id: itemId,
      quantity,
      quality: normalizeQuality(entry.quality),
    };
  }
  return null;
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null;
  return {
    id: String(record.id || makeId('weekly_exchange_record')),
    username: String(record.username || ''),
    offer_id: String(record.offer_id || ''),
    offer_name: String(record.offer_name || ''),
    week_key: String(record.week_key || ''),
    save_slot: Number.isInteger(Number(record.save_slot)) ? Number(record.save_slot) : null,
    created_at: Number(record.created_at) || Math.floor(Date.now() / 1000),
    costs: Array.isArray(record.costs) ? record.costs.map(normalizeBundleEntry).filter(Boolean) : [],
    rewards: Array.isArray(record.rewards) ? record.rewards.map(normalizeBundleEntry).filter(Boolean) : [],
  };
}

function normalizeWeekState(rawWeek) {
  const userUsage = rawWeek && typeof rawWeek.user_usage === 'object' ? rawWeek.user_usage : {};
  const offerClaims = rawWeek && typeof rawWeek.offer_claims === 'object' ? rawWeek.offer_claims : {};
  return {
    user_usage: Object.fromEntries(
      Object.entries(userUsage).map(([username, usage]) => [
        String(username),
        usage && typeof usage === 'object'
          ? Object.fromEntries(
              Object.entries(usage)
                .map(([offerId, count]) => [String(offerId), clampPositiveInt(count, 0)])
                .filter(([, count]) => count > 0)
            )
          : {},
      ])
    ),
    offer_claims: Object.fromEntries(
      Object.entries(offerClaims)
        .map(([offerId, count]) => [String(offerId), clampPositiveInt(count, 0)])
        .filter(([, count]) => count > 0)
    ),
    records: Array.isArray(rawWeek?.records)
      ? rawWeek.records.map(normalizeRecord).filter(Boolean).slice(0, MAX_RECORDS_PER_WEEK)
      : [],
  };
}

function pruneWeeks(weeks) {
  const keys = Object.keys(weeks).sort().reverse();
  return Object.fromEntries(keys.slice(0, MAX_WEEKS_TO_KEEP).map(key => [key, weeks[key]]));
}

function loadExchangeStore() {
  try {
    if (!fs.existsSync(TAOYUAN_WEEKLY_EXCHANGE_FILE)) return createEmptyExchangeStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_WEEKLY_EXCHANGE_FILE, 'utf8'));
    const weeks = raw && typeof raw.weeks === 'object' ? raw.weeks : {};
    return {
      weeks: Object.fromEntries(
        Object.entries(weeks).map(([weekKey, weekState]) => [String(weekKey), normalizeWeekState(weekState)])
      ),
    };
  } catch {
    return createEmptyExchangeStore();
  }
}

function saveExchangeStore(store) {
  fs.mkdirSync(path.dirname(TAOYUAN_WEEKLY_EXCHANGE_FILE), { recursive: true });
  writeJsonFileAtomic(TAOYUAN_WEEKLY_EXCHANGE_FILE, {
    weeks: pruneWeeks(store?.weeks && typeof store.weeks === 'object' ? store.weeks : {}),
  });
}

function hashSeed(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function formatBjDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekWindow() {
  const bjNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dayIndex = (bjNow.getUTCDay() + 6) % 7;
  const weekStart = new Date(Date.UTC(
    bjNow.getUTCFullYear(),
    bjNow.getUTCMonth(),
    bjNow.getUTCDate() - dayIndex
  ));
  const weekEnd = new Date(Date.UTC(
    bjNow.getUTCFullYear(),
    bjNow.getUTCMonth(),
    bjNow.getUTCDate() - dayIndex + 6
  ));
  const nextRefresh = new Date(Date.UTC(
    bjNow.getUTCFullYear(),
    bjNow.getUTCMonth(),
    bjNow.getUTCDate() - dayIndex + 7
  ));
  const weekKey = formatBjDate(weekStart);
  return {
    week_key: weekKey,
    week_label: `${formatBjDate(weekStart)} ~ ${formatBjDate(weekEnd)}`,
    refresh_hint: `按现实周轮换 · ${formatBjDate(nextRefresh)} 刷新`,
  };
}

function getFestivalThemeRotation(weekKey) {
  const themes = FESTIVAL_THEME_ROTATIONS;
  if (!Array.isArray(themes) || themes.length === 0) {
    return {
      id: 'default_festival',
      label: '节庆备货周',
      bulletin: '本周节庆主题池会轮换出节庆筹备常用物资。',
      preferred_offer_ids: [],
    };
  }
  const index = hashSeed(`weekly_exchange_theme:${weekKey}`) % themes.length;
  return themes[index];
}

function shuffleWithSeed(entries, seedPrefix) {
  const rng = createSeededRandom(hashSeed(seedPrefix));
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function pickSeededOffers(entries, count, seedPrefix) {
  return shuffleWithSeed(entries, seedPrefix).slice(0, Math.max(0, count));
}

function getWeeklyOffers(weekKey) {
  const fixedOffers = WEEKLY_EXCHANGE_OFFERS.filter(offer => FIXED_WEEKLY_OFFER_IDS.includes(offer.id));
  const rotatingSlowPool = WEEKLY_EXCHANGE_OFFERS.filter(
    offer => offer.category === 'slow_trade' && !FIXED_WEEKLY_OFFER_IDS.includes(offer.id)
  );
  const festivalTheme = getFestivalThemeRotation(weekKey);
  const festivalOfferIds = new Set(festivalTheme.preferred_offer_ids || []);
  const preferredFestivalPool = WEEKLY_EXCHANGE_OFFERS.filter(
    offer => offer.category === 'festival' && festivalOfferIds.has(offer.id)
  );
  const fallbackFestivalPool = WEEKLY_EXCHANGE_OFFERS.filter(
    offer => offer.category === 'festival' && !festivalOfferIds.has(offer.id)
  );
  const neighborPool = WEEKLY_EXCHANGE_OFFERS.filter(offer => offer.category === 'neighbor');
  const selectedFestivalOffers = [
    ...pickSeededOffers(preferredFestivalPool, 2, `weekly_exchange_festival_preferred:${weekKey}`),
    ...pickSeededOffers(fallbackFestivalPool, 2, `weekly_exchange_festival_fallback:${weekKey}`),
  ].slice(0, 2);

  return [
    ...fixedOffers,
    ...pickSeededOffers(rotatingSlowPool, 1, `weekly_exchange_slow_trade:${weekKey}`),
    ...selectedFestivalOffers,
    ...pickSeededOffers(neighborPool, 1, `weekly_exchange_neighbor:${weekKey}`),
  ].map(offer => ({
    ...offer,
    costs: offer.costs.map(entry => ({ ...entry })),
    rewards: offer.rewards.map(entry => ({ ...entry })),
    tags: [...offer.tags],
    category: offer.category || 'slow_trade',
  }));
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
    .map(normalizeBundleEntry)
    .filter(entry => entry && entry.type === 'item')
    .map(entry => ({
      itemId: entry.item_id,
      quantity: entry.quantity,
      quality: entry.quality,
    }));
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

function applyCostsToSave(saveData, costs) {
  ensureInventoryState(saveData);
  for (const rawCost of costs) {
    const cost = normalizeBundleEntry(rawCost);
    if (!cost) continue;
    if (cost.type === 'money') {
      const currentMoney = Math.max(0, Math.floor(Number(saveData.player.money) || 0));
      if (currentMoney < cost.amount) return false;
      saveData.player.money = currentMoney - cost.amount;
      continue;
    }
    const removed = removeStackableItemAnywhere(saveData, cost.item_id, cost.quantity, cost.quality);
    if (!removed) return false;
  }
  return true;
}

function applyRewardsToSave(saveData, rewards) {
  ensureInventoryState(saveData);
  if (!canFitRewardItems(saveData, rewards)) return false;
  for (const rawReward of rewards) {
    const reward = normalizeBundleEntry(rawReward);
    if (!reward) continue;
    if (reward.type === 'money') {
      saveData.player.money = Math.max(0, Math.floor(Number(saveData.player.money) || 0) + reward.amount);
      continue;
    }
    if (!addStackableItemToInventory(saveData, reward.item_id, reward.quantity, reward.quality)) return false;
  }
  return true;
}

function validateOfferAgainstSave(saveData, offer) {
  if (!saveData) return { can_exchange: false, disabled_reason: '当前没有可用的服务端存档' };
  const cloned = JSON.parse(JSON.stringify(saveData));
  ensureInventoryState(cloned);
  if (!applyCostsToSave(cloned, offer.costs)) {
    return { can_exchange: false, disabled_reason: '物资不足，暂时无法换物' };
  }
  if (!applyRewardsToSave(cloned, offer.rewards)) {
    return { can_exchange: false, disabled_reason: '背包空间不足，请先整理背包' };
  }
  return { can_exchange: true, disabled_reason: '' };
}

function getOfferAvailabilityScope(offer, username) {
  if (offer.category === 'neighbor') {
    const neighborGroup = getNeighborGroupForUser(username);
    return {
      visible: true,
      enabled: !!neighborGroup,
      reason: neighborGroup ? '' : '邻里专属池只对已加入邻里的玩家开放',
    };
  }
  return {
    visible: true,
    enabled: true,
    reason: '',
  };
}

function getWeekState(store, weekKey) {
  if (!store.weeks[weekKey]) {
    store.weeks[weekKey] = normalizeWeekState({});
  }
  return store.weeks[weekKey];
}

function buildOfferSummary(offer, weekState, username, saveData, saveMessage = '') {
  const claimedByUser = clampPositiveInt(weekState.user_usage?.[username]?.[offer.id], 0);
  const claimedGlobal = clampPositiveInt(weekState.offer_claims?.[offer.id], 0);
  const remainingGlobal = Math.max(0, clampPositiveInt(offer.station_stock, 0) - claimedGlobal);
  let canExchange = true;
  let disabledReason = '';
  const availability = getOfferAvailabilityScope(offer, username);

  if (!saveData) {
    canExchange = false;
    disabledReason = saveMessage || '当前没有可用的服务端存档';
  } else if (!availability.enabled) {
    canExchange = false;
    disabledReason = availability.reason;
  } else if (claimedByUser >= offer.weekly_limit_per_user) {
    canExchange = false;
    disabledReason = '本周该摊位已达到个人兑换上限';
  } else if (offer.station_stock > 0 && remainingGlobal <= 0) {
    canExchange = false;
    disabledReason = '这项换物本周已兑完';
  } else {
    const validation = validateOfferAgainstSave(saveData, offer);
    canExchange = validation.can_exchange;
    disabledReason = validation.disabled_reason;
  }

  return {
    id: offer.id,
    name: offer.name,
    description: offer.description,
    badge: offer.badge,
    category: offer.category || 'slow_trade',
    category_label: OFFER_CATEGORIES[offer.category] || OFFER_CATEGORIES.slow_trade,
    costs: offer.costs.map(entry => ({ ...entry })),
    rewards: offer.rewards.map(entry => ({ ...entry })),
    tags: [...offer.tags],
    weekly_limit_per_user: offer.weekly_limit_per_user,
    station_stock: offer.station_stock,
    claimed_by_user: claimedByUser,
    claimed_global: claimedGlobal,
    remaining_global: remainingGlobal,
    can_exchange: canExchange,
    disabled_reason: disabledReason,
  };
}

function listWeeklyExchangeStation(username) {
  const store = loadExchangeStore();
  const weekWindow = getCurrentWeekWindow();
  const weekState = getWeekState(store, weekWindow.week_key);
  const offers = getWeeklyOffers(weekWindow.week_key);
  const festivalTheme = getFestivalThemeRotation(weekWindow.week_key);
  const neighborGroup = getNeighborGroupForUser(username);

  let saveData = null;
  let saveMessage = '';
  try {
    const saveContext = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法使用每周交换站');
    ensureInventoryState(saveContext.data);
    saveData = saveContext.data;
  } catch (error) {
    saveMessage = error?.message || '当前账号没有可用的桃源服务端存档';
  }

  const myRecords = weekState.records
    .filter(record => record.username === username)
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 8)
    .map(record => ({
      ...record,
      costs: record.costs.map(entry => ({ ...entry })),
      rewards: record.rewards.map(entry => ({ ...entry })),
    }));

  return {
    week_key: weekWindow.week_key,
    week_label: weekWindow.week_label,
    refresh_hint: weekWindow.refresh_hint,
    bulletin: `按现实周轮换的官方控价摊位，只做限量换物，不开放自由拍卖与无限挂单。${festivalTheme.bulletin}`,
    save_available: !!saveData,
    save_message: saveMessage,
    festival_theme: {
      id: festivalTheme.id,
      label: festivalTheme.label,
      bulletin: festivalTheme.bulletin,
    },
    neighbor_context: neighborGroup
      ? {
          group_id: neighborGroup.id,
          group_name: neighborGroup.name,
          role: neighborGroup.role,
        }
      : null,
    offers: offers.map(offer => buildOfferSummary(offer, weekState, username, saveData, saveMessage)),
    my_records: myRecords,
    categories: [
      { id: 'slow_trade', label: OFFER_CATEGORIES.slow_trade, offer_count: offers.filter(offer => offer.category === 'slow_trade').length },
      { id: 'festival', label: OFFER_CATEGORIES.festival, offer_count: offers.filter(offer => offer.category === 'festival').length },
      { id: 'neighbor', label: OFFER_CATEGORIES.neighbor, offer_count: offers.filter(offer => offer.category === 'neighbor').length },
    ],
  };
}

function exchangeWeeklyOffer(username, offerId) {
  const store = loadExchangeStore();
  const weekWindow = getCurrentWeekWindow();
  const weekState = getWeekState(store, weekWindow.week_key);
  const offer = getWeeklyOffers(weekWindow.week_key).find(entry => entry.id === String(offerId || '').trim());
  if (!offer) throw createError('本周交换站没有这项换物', 404);
  const availability = getOfferAvailabilityScope(offer, username);
  if (!availability.enabled) {
    throw createError(availability.reason || '当前无法兑换这项换物');
  }

  const userUsage = weekState.user_usage[username] && typeof weekState.user_usage[username] === 'object'
    ? weekState.user_usage[username]
    : {};
  const claimedByUser = clampPositiveInt(userUsage[offer.id], 0);
  if (claimedByUser >= offer.weekly_limit_per_user) {
    throw createError('本周该摊位已达到个人兑换上限');
  }

  const claimedGlobal = clampPositiveInt(weekState.offer_claims[offer.id], 0);
  if (offer.station_stock > 0 && claimedGlobal >= offer.station_stock) {
    throw createError('这项换物本周已兑完');
  }

  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法进行每周交换');
  context.username = username;
  ensureInventoryState(context.data);

  if (!validateOfferAgainstSave(context.data, offer).can_exchange) {
    const summary = buildOfferSummary(offer, weekState, username, context.data);
    throw createError(summary.disabled_reason || '当前条件下无法进行换物');
  }

  const slot = context.slot;
  const previousSlotEntry = context.saves.slots[slot]
    ? { ...context.saves.slots[slot] }
    : null;

  if (!applyCostsToSave(context.data, offer.costs)) {
    throw createError('物资不足，暂时无法换物');
  }
  if (!applyRewardsToSave(context.data, offer.rewards)) {
    throw createError('背包空间不足，请先整理背包');
  }

  const record = normalizeRecord({
    id: makeId('weekly_exchange_record'),
    username,
    offer_id: offer.id,
    offer_name: offer.name,
    week_key: weekWindow.week_key,
    save_slot: slot,
    created_at: Math.floor(Date.now() / 1000),
    costs: offer.costs,
    rewards: offer.rewards,
  });

  weekState.user_usage[username] = {
    ...userUsage,
    [offer.id]: claimedByUser + 1,
  };
  weekState.offer_claims[offer.id] = claimedGlobal + 1;
  weekState.records = [record, ...weekState.records]
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, MAX_RECORDS_PER_WEEK);

  persistGameplayData(context);
  try {
    saveExchangeStore(store);
  } catch (error) {
    if (previousSlotEntry) {
      context.saves.slots[slot] = previousSlotEntry;
      try {
        saveUserSaveSlots(username, context.saves);
      } catch {}
    }
    throw createError(`交换站记录写入失败：${error?.message || '未知错误'}`, 500);
  }

  return {
    week_key: weekWindow.week_key,
    week_label: weekWindow.week_label,
    refresh_hint: weekWindow.refresh_hint,
    save_slot: slot,
    money: Math.max(0, Math.floor(Number(context.data.player.money) || 0)),
    offer: buildOfferSummary(offer, weekState, username, context.data),
    record: {
      ...record,
      costs: record.costs.map(entry => ({ ...entry })),
      rewards: record.rewards.map(entry => ({ ...entry })),
    },
  };
}

module.exports = {
  getCurrentWeekWindow,
  getFestivalThemeRotation,
  listWeeklyExchangeStation,
  exchangeWeeklyOffer,
};
