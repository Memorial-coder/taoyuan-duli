const fs = require('fs')
const path = require('path')
const {
  createError,
  getActiveSaveContext,
  persistGameplayData,
  saveUserSaveSlots,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime')
const {
  getCurrentWeekWindow,
  getFestivalThemeRotation,
} = require('./taoyuanWeeklyExchangeStation')

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data')
const TAOYUAN_FESTIVAL_STALL_FILE = path.join(DATA_DIR, 'taoyuan_festival_stall.json')
const ITEM_MAX_STACK = 999
const TEMP_BAG_CAPACITY = 10
const MAX_RECORDS_TO_KEEP = 240
const FESTIVAL_STALL_OPEN_DAY_START = 4
const FESTIVAL_STALL_OPEN_DAY_END = 6

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0)
  return normalized > 0 ? normalized : fallback
}

function normalizeQuality(value) {
  return ['normal', 'fine', 'excellent', 'supreme'].includes(String(value)) ? String(value) : 'normal'
}

function createEmptyFestivalStore() {
  return { weeks: {} }
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null
  return {
    id: String(record.id || makeId('festival_stall_record')),
    username: String(record.username || ''),
    offer_id: String(record.offer_id || ''),
    offer_name: String(record.offer_name || ''),
    week_key: String(record.week_key || ''),
    save_slot: Number.isInteger(Number(record.save_slot)) ? Number(record.save_slot) : null,
    created_at: Number(record.created_at) || Math.floor(Date.now() / 1000),
    costs: Array.isArray(record.costs) ? record.costs.map(item => ({
      type: 'money',
      amount: Math.max(0, Math.floor(Number(item?.amount) || 0)),
    })).filter(entry => entry.amount > 0) : [],
    rewards: Array.isArray(record.rewards) ? record.rewards.map(item => {
      if (item?.type === 'ticket') {
        return {
          type: 'ticket',
          ticket_type: String(item.ticket_type || ''),
          quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
        }
      }
      return {
        type: 'item',
        item_id: String(item?.item_id || ''),
        quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)),
        quality: normalizeQuality(item?.quality),
      }
    }).filter(entry => (entry.type === 'ticket' ? entry.ticket_type && entry.quantity > 0 : entry.item_id && entry.quantity > 0)) : [],
  }
}

function normalizeWeekState(rawWeek) {
  const userUsage = rawWeek && typeof rawWeek.user_usage === 'object' ? rawWeek.user_usage : {}
  const offerClaims = rawWeek && typeof rawWeek.offer_claims === 'object' ? rawWeek.offer_claims : {}
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
    records: Array.isArray(rawWeek?.records) ? rawWeek.records.map(normalizeRecord).filter(Boolean).slice(0, MAX_RECORDS_TO_KEEP) : [],
  }
}

function loadFestivalStore() {
  try {
    if (!fs.existsSync(TAOYUAN_FESTIVAL_STALL_FILE)) return createEmptyFestivalStore()
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_FESTIVAL_STALL_FILE, 'utf8'))
    const weeks = raw && typeof raw.weeks === 'object' ? raw.weeks : {}
    return {
      weeks: Object.fromEntries(Object.entries(weeks).map(([weekKey, weekState]) => [String(weekKey), normalizeWeekState(weekState)])),
    }
  } catch {
    return createEmptyFestivalStore()
  }
}

function saveFestivalStore(store) {
  fs.mkdirSync(path.dirname(TAOYUAN_FESTIVAL_STALL_FILE), { recursive: true })
  writeJsonFileAtomic(TAOYUAN_FESTIVAL_STALL_FILE, {
    weeks: Object.fromEntries(
      Object.entries(store?.weeks || {}).slice(0, 16).map(([weekKey, weekState]) => [String(weekKey), normalizeWeekState(weekState)])
    ),
  })
}

function getFestivalWeekState(store, weekKey) {
  if (!store.weeks[weekKey]) store.weeks[weekKey] = normalizeWeekState({})
  return store.weeks[weekKey]
}

function getFestivalAvailability() {
  const weekWindow = getCurrentWeekWindow()
  const festivalTheme = getFestivalThemeRotation(weekWindow.week_key)
  const bjNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const weekDay = (bjNow.getUTCDay() + 6) % 7
  const forceOpen = String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim() === 'true'
  const open = forceOpen || (weekDay >= FESTIVAL_STALL_OPEN_DAY_START && weekDay <= FESTIVAL_STALL_OPEN_DAY_END)
  if (!open) {
    return {
      open: false,
      reason: '节庆临时摊位只在每周五到周日开放，当前先展示预告，不开放购买。',
      weekWindow,
      themeWeek: {
        id: festivalTheme.id,
        name: festivalTheme.label,
        startDay: '周五',
        endDay: '周日',
        summary: festivalTheme.bulletin,
      },
    }
  }
  return {
    open: true,
    reason: '',
    weekWindow,
    themeWeek: {
      id: festivalTheme.id,
      name: festivalTheme.label,
      startDay: '周五',
      endDay: '周日',
      summary: festivalTheme.bulletin,
    },
  }
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {}
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = []
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = []
  if (!Number.isInteger(Number(saveData.inventory.capacity))) saveData.inventory.capacity = 24
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {}
  if (!Number.isFinite(Number(saveData.player.money))) saveData.player.money = 0
  if (!saveData.wallet || typeof saveData.wallet !== 'object') saveData.wallet = {}
  if (!saveData.wallet.rewardTickets || typeof saveData.wallet.rewardTickets !== 'object') saveData.wallet.rewardTickets = {}
  if (!saveData.wallet.rewardTicketLifetimeEarned || typeof saveData.wallet.rewardTicketLifetimeEarned !== 'object') {
    saveData.wallet.rewardTicketLifetimeEarned = { ...saveData.wallet.rewardTickets }
  }
}

function cloneInventorySlots(source) {
  return (source || []).map(slot => ({
    itemId: String(slot.itemId || ''),
    quality: normalizeQuality(slot.quality),
    quantity: clampPositiveInt(slot.quantity, 0),
    locked: !!slot.locked,
  })).filter(slot => slot.itemId && slot.quantity > 0)
}

function removeStackableItemFromSlots(slots, itemId, quantity, quality) {
  let remaining = quantity
  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    const slot = slots[index]
    if (!slot || slot.itemId !== itemId || normalizeQuality(slot.quality) !== quality) continue
    const slotQuantity = clampPositiveInt(slot.quantity, 0)
    const take = Math.min(remaining, slotQuantity)
    if (take <= 0) continue
    slot.quantity = slotQuantity - take
    remaining -= take
    if (slot.quantity <= 0) {
      slots.splice(index, 1)
      index -= 1
    }
  }
  return remaining <= 0
}

function countStackableItemAnywhere(saveData, itemId, quality) {
  ensureInventoryState(saveData)
  return [...saveData.inventory.items, ...saveData.inventory.tempItems]
    .filter(slot => slot.itemId === itemId && (!quality || normalizeQuality(slot.quality) === quality))
    .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0)
}

function removeStackableItemAnywhere(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData)
  const normalizedItemId = String(itemId || '').trim()
  const safeQuantity = clampPositiveInt(quantity, 0)
  if (!normalizedItemId || safeQuantity <= 0) return false
  if (countStackableItemAnywhere(saveData, normalizedItemId, quality) < safeQuantity) return false

  let remaining = safeQuantity
  const qualityOrder = quality ? [quality] : ['normal', 'fine', 'excellent', 'supreme']
  for (const currentQuality of qualityOrder) {
    if (remaining <= 0) break
    const tempCount = countStackableItemAnywhere({ inventory: { items: [], tempItems: saveData.inventory.tempItems } }, normalizedItemId, currentQuality)
    const takeFromTemp = Math.min(remaining, tempCount)
    if (takeFromTemp > 0) {
      removeStackableItemFromSlots(saveData.inventory.tempItems, normalizedItemId, takeFromTemp, currentQuality)
      remaining -= takeFromTemp
    }
    const mainCount = countStackableItemAnywhere({ inventory: { items: saveData.inventory.items, tempItems: [] } }, normalizedItemId, currentQuality)
    const takeFromMain = Math.min(remaining, mainCount)
    if (takeFromMain > 0) {
      removeStackableItemFromSlots(saveData.inventory.items, normalizedItemId, takeFromMain, currentQuality)
      remaining -= takeFromMain
    }
  }
  return remaining <= 0
}

function simulateAddToSlots(mainSlots, mainCapacity, tempSlots, tempCapacity, stackableEntries) {
  for (const entry of stackableEntries) {
    let remaining = clampPositiveInt(entry.quantity, 0)
    if (remaining <= 0) continue
    const quality = normalizeQuality(entry.quality)

    for (const slot of mainSlots) {
      if (remaining <= 0) break
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity)
      slot.quantity += canAdd
      remaining -= canAdd
    }

    while (remaining > 0 && mainSlots.length < mainCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK)
      mainSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      })
      remaining -= addQuantity
    }

    for (const slot of tempSlots) {
      if (remaining <= 0) break
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity)
      slot.quantity += canAdd
      remaining -= canAdd
    }

    while (remaining > 0 && tempSlots.length < tempCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK)
      tempSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      })
      remaining -= addQuantity
    }

    if (remaining > 0) return false
  }
  return true
}

function canFitRewardItems(saveData, rewards) {
  ensureInventoryState(saveData)
  const stackableEntries = rewards
    .map(entry => ({
      itemId: String(entry.item_id || '').trim(),
      quantity: clampPositiveInt(entry.quantity, 0),
      quality: normalizeQuality(entry.quality),
    }))
    .filter(entry => entry.itemId && entry.quantity > 0)
  if (stackableEntries.length === 0) return true
  return simulateAddToSlots(
    cloneInventorySlots(saveData.inventory.items),
    clampPositiveInt(saveData.inventory.capacity, 24),
    cloneInventorySlots(saveData.inventory.tempItems),
    TEMP_BAG_CAPACITY,
    stackableEntries
  )
}

function addStackableItemToInventory(saveData, itemId, quantity, quality = 'normal') {
  ensureInventoryState(saveData)
  const items = saveData.inventory.items
  const tempItems = saveData.inventory.tempItems
  const capacity = clampPositiveInt(saveData.inventory.capacity, 24)
  let remaining = clampPositiveInt(quantity, 0)
  const normalizedQuality = normalizeQuality(quality)

  for (const slot of items) {
    if (remaining <= 0) break
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity))
      slot.quantity = Number(slot.quantity) + canAdd
      remaining -= canAdd
    }
  }

  while (remaining > 0 && items.length < capacity) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK)
    items.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false })
    remaining -= addQuantity
  }

  for (const slot of tempItems) {
    if (remaining <= 0) break
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity))
      slot.quantity = Number(slot.quantity) + canAdd
      remaining -= canAdd
    }
  }

  while (remaining > 0 && tempItems.length < TEMP_BAG_CAPACITY) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK)
    tempItems.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false })
    remaining -= addQuantity
  }

  return remaining <= 0
}

function applyCostsToSave(saveData, costs) {
  ensureInventoryState(saveData)
  for (const cost of costs || []) {
    if (!cost) continue
    if (cost.type === 'money') {
      const normalizedAmount = clampPositiveInt(cost.amount, 0)
      const currentMoney = Math.max(0, Math.floor(Number(saveData.player.money) || 0))
      if (currentMoney < normalizedAmount) return false
      saveData.player.money = currentMoney - normalizedAmount
      continue
    }
    if (cost.type !== 'item') continue
    const removed = removeStackableItemAnywhere(saveData, cost.item_id, cost.quantity, cost.quality)
    if (!removed) return false
  }
  return true
}

function applyTicketRewards(saveData, ticketRewards) {
  ensureInventoryState(saveData)
  if (!Array.isArray(ticketRewards) || ticketRewards.length === 0) return true
  for (const reward of ticketRewards) {
    const ticketType = String(reward?.ticket_type || '').trim()
    const quantity = clampPositiveInt(reward?.quantity, 0)
    if (!ticketType || quantity <= 0) continue
    const current = Math.max(0, Math.floor(Number(saveData.wallet.rewardTickets[ticketType]) || 0))
    const lifetime = Math.max(0, Math.floor(Number(saveData.wallet.rewardTicketLifetimeEarned[ticketType]) || 0))
    saveData.wallet.rewardTickets[ticketType] = current + quantity
    saveData.wallet.rewardTicketLifetimeEarned[ticketType] = lifetime + quantity
  }
  return true
}

function applyRewardsToSave(saveData, rewards) {
  ensureInventoryState(saveData)
  const itemRewards = rewards.filter(entry => entry?.type === 'item').map(entry => ({
    item_id: entry.item_id,
    quantity: entry.quantity,
    quality: entry.quality,
  }))
  if (!canFitRewardItems(saveData, itemRewards)) return false
  for (const reward of rewards) {
    if (!reward) continue
    if (reward.type === 'money') {
      saveData.player.money = Math.max(0, Math.floor(Number(saveData.player.money) || 0) + clampPositiveInt(reward.amount, 0))
      continue
    }
    if (reward.type === 'ticket') {
      if (!applyTicketRewards(saveData, [reward])) return false
      continue
    }
    if (!addStackableItemToInventory(saveData, reward.item_id, reward.quantity, reward.quality)) return false
  }
  return true
}

function validateOfferAgainstSave(saveData, offer) {
  if (!saveData) return { can_exchange: false, disabled_reason: '当前没有可用的服务端存档' }
  const cloned = JSON.parse(JSON.stringify(saveData))
  ensureInventoryState(cloned)
  if (!applyCostsToSave(cloned, offer.costs)) {
    return { can_exchange: false, disabled_reason: '物资不足，暂时无法购买节庆摊位商品' }
  }
  if (!applyRewardsToSave(cloned, offer.rewards)) {
    return { can_exchange: false, disabled_reason: '背包空间不足，请先整理背包' }
  }
  return { can_exchange: true, disabled_reason: '' }
}

function finalizeCatalog(entries) {
  return (entries || []).map(entry => ({
    ...entry,
    costs: [{ type: 'money', amount: entry.price_money }],
    rewards: Array.isArray(entry.rewards) ? entry.rewards.map(reward => ({ ...reward })) : [],
    categories: Array.isArray(entry.categories) ? [...entry.categories] : [],
    tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
  }))
}

function getFestivalCatalog(themeId = '') {
  const normalizedThemeId = String(themeId || '').trim()
  if (normalizedThemeId === 'harvest_banquet') {
    return finalizeCatalog([
      {
        id: 'festival_banquet_material_bundle',
        name: '秋宴备料包',
        description: '节庆摊位临时售卖的宴席备料，适合补柴火、纸张和上桌前的小件周转。',
        badge: '限定材料',
        price_money: 140,
        weekly_limit_per_user: 2,
        station_stock: 24,
        rewards: [{ type: 'item', item_id: 'charcoal', quantity: 4 }, { type: 'item', item_id: 'paper', quantity: 4 }],
        categories: ['materials'],
        tags: ['节庆摊位', '秋宴备货'],
      },
      {
        id: 'festival_banquet_souvenir',
        name: '桂香纪念包',
        description: '秋宴主题周临时售卖的桂香纪念品，适合节前走动与留念。',
        badge: '纪念品',
        price_money: 180,
        weekly_limit_per_user: 1,
        station_stock: 16,
        rewards: [{ type: 'item', item_id: 'osmanthus_incense', quantity: 1 }],
        categories: ['souvenir'],
        tags: ['节庆摊位', '桂香纪念'],
      },
      {
        id: 'festival_banquet_food',
        name: '月宴点心盒',
        description: '节庆摊位代做的一批应节小食，适合节前暖场或留作伴手。',
        badge: '节日食物',
        price_money: 160,
        weekly_limit_per_user: 2,
        station_stock: 20,
        rewards: [{ type: 'item', item_id: 'food_yue_bing', quantity: 2 }],
        categories: ['food'],
        tags: ['节庆摊位', '月宴点心'],
      },
      {
        id: 'festival_banquet_ticket_bundle',
        name: '宴集票券包',
        description: '秋宴周摊位放出的活动票券，会直接写入钱包票券账本。',
        badge: '票券/代币',
        price_money: 220,
        weekly_limit_per_user: 1,
        station_stock: 12,
        rewards: [{ type: 'ticket', ticket_type: 'construction', quantity: 1 }, { type: 'ticket', ticket_type: 'caravan', quantity: 1 }],
        categories: ['tickets'],
        tags: ['节庆摊位', '票券'],
      },
    ])
  }

  if (normalizedThemeId === 'winter_hearth') {
    return finalizeCatalog([
      {
        id: 'festival_hearth_material_bundle',
        name: '围炉暖集包',
        description: '围炉暖集周临时开放的摊位材料包，适合补柴火和炭火。',
        badge: '限定材料',
        price_money: 150,
        weekly_limit_per_user: 2,
        station_stock: 24,
        rewards: [{ type: 'item', item_id: 'firewood', quantity: 10 }, { type: 'item', item_id: 'charcoal', quantity: 4 }],
        categories: ['materials'],
        tags: ['节庆摊位', '围炉备货'],
      },
      {
        id: 'festival_hearth_souvenir',
        name: '暖炉香囊',
        description: '节庆摊位临时售卖的暖香纪念品，更偏向围炉夜话的节庆氛围。',
        badge: '纪念品',
        price_money: 160,
        weekly_limit_per_user: 1,
        station_stock: 16,
        rewards: [{ type: 'item', item_id: 'camphor_incense', quantity: 1 }],
        categories: ['souvenir'],
        tags: ['节庆摊位', '冬集纪念'],
      },
      {
        id: 'festival_hearth_food',
        name: '守岁饺暖盒',
        description: '节庆摊位现包的一批节日食物，适合在冬集周直接补一口热乎的。',
        badge: '节日食物',
        price_money: 180,
        weekly_limit_per_user: 2,
        station_stock: 20,
        rewards: [{ type: 'item', item_id: 'food_new_year_dumpling', quantity: 2 }],
        categories: ['food'],
        tags: ['节庆摊位', '守岁热食'],
      },
      {
        id: 'festival_hearth_ticket_bundle',
        name: '暖集票券包',
        description: '冬集周临时放出的票券，会直接写入钱包票券账本。',
        badge: '票券/代币',
        price_money: 220,
        weekly_limit_per_user: 1,
        station_stock: 12,
        rewards: [{ type: 'ticket', ticket_type: 'research', quantity: 1 }, { type: 'ticket', ticket_type: 'exhibit', quantity: 1 }],
        categories: ['tickets'],
        tags: ['节庆摊位', '票券'],
      },
    ])
  }

  return finalizeCatalog([
    {
      id: 'festival_lantern_material_bundle',
      name: '灯会彩纸包',
      description: '节庆摊位临时售卖的灯会用料，适合补彩纸、灯芯和小件布置材料。',
      badge: '限定材料',
      price_money: 120,
      weekly_limit_per_user: 2,
      station_stock: 24,
      rewards: [{ type: 'item', item_id: 'paper', quantity: 8 }, { type: 'item', item_id: 'firewood', quantity: 4 }],
      categories: ['materials'],
      tags: ['节庆摊位', '灯会用料'],
    },
    {
      id: 'festival_lantern_souvenir',
      name: '灯市留香包',
      description: '节庆摊位临时售卖的灯会纪念香包，适合节后留念或送礼。',
      badge: '纪念品',
      price_money: 150,
      weekly_limit_per_user: 1,
      station_stock: 16,
      rewards: [{ type: 'item', item_id: 'pine_incense', quantity: 1 }],
      categories: ['souvenir'],
      tags: ['节庆摊位', '灯市纪念'],
    },
    {
      id: 'festival_lantern_food',
      name: '灯会点心盒',
      description: '灯会临时摊位现做的节日点心，适合边逛边吃，也适合带回家。',
      badge: '节日食物',
      price_money: 140,
      weekly_limit_per_user: 2,
      station_stock: 20,
      rewards: [{ type: 'item', item_id: 'food_qing_tuan', quantity: 2 }],
      categories: ['food'],
      tags: ['节庆摊位', '灯会点心'],
    },
    {
      id: 'festival_lantern_ticket_bundle',
      name: '灯会票券包',
      description: '灯会周临时发放的活动票券，会直接写入钱包票券账本。',
      badge: '票券/代币',
      price_money: 200,
      weekly_limit_per_user: 1,
      station_stock: 12,
      rewards: [{ type: 'ticket', ticket_type: 'caravan', quantity: 1 }, { type: 'ticket', ticket_type: 'exhibit', quantity: 1 }],
      categories: ['tickets'],
      tags: ['节庆摊位', '票券'],
    },
  ])
}

function buildOfferSummary(offer, weekState, username, saveData, saveMessage = '') {
  const claimedByUser = clampPositiveInt(weekState.user_usage?.[username]?.[offer.id], 0)
  const claimedGlobal = clampPositiveInt(weekState.offer_claims?.[offer.id], 0)
  const remainingGlobal = Math.max(0, clampPositiveInt(offer.station_stock, 0) - claimedGlobal)
  let canExchange = true
  let disabledReason = ''
  const availability = getFestivalAvailability()

  if (!availability.open) {
    canExchange = false
    disabledReason = availability.reason
  } else if (!saveData) {
    canExchange = false
    disabledReason = saveMessage || '当前没有可用的服务端存档'
  } else if (claimedByUser >= clampPositiveInt(offer.weekly_limit_per_user, 1)) {
    canExchange = false
    disabledReason = '本周该摊位已达到个人购买上限'
  } else if (offer.station_stock > 0 && remainingGlobal <= 0) {
    canExchange = false
    disabledReason = '这项节庆商品本周已经售罄'
  } else {
    const validation = validateOfferAgainstSave(saveData, offer)
    canExchange = validation.can_exchange
    disabledReason = validation.disabled_reason
  }

  return {
    id: offer.id,
    name: offer.name,
    description: offer.description,
    badge: offer.badge,
    price_money: clampPositiveInt(offer.price_money, 0),
    category: 'festival',
    category_label: '节庆摊位',
    costs: offer.costs.map(entry => ({ ...entry })),
    rewards: offer.rewards.map(entry => ({ ...entry })),
    tags: [...offer.tags],
    booth_category: Array.isArray(offer.categories) ? offer.categories[0] || 'festival' : 'festival',
    weekly_limit_per_user: clampPositiveInt(offer.weekly_limit_per_user, 1),
    station_stock: clampPositiveInt(offer.station_stock, 0),
    claimed_by_user: claimedByUser,
    claimed_global: claimedGlobal,
    remaining_global: remainingGlobal,
    can_exchange: canExchange,
    disabled_reason: disabledReason,
  }
}

function listFestivalStall(username) {
  const availability = getFestivalAvailability()
  const store = loadFestivalStore()
  const weekKey = availability.weekWindow?.week_key || 'festival_closed'
  const weekState = getFestivalWeekState(store, weekKey)

  let saveData = null
  let saveMessage = ''
  try {
    const saveContext = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法使用节庆摊位')
    ensureInventoryState(saveContext.data)
    saveData = saveContext.data
  } catch (error) {
    saveMessage = error?.message || '当前账号没有可用的桃源服务端存档'
  }

  const offers = getFestivalCatalog(availability.themeWeek?.id || '')
  const myRecords = weekState.records
    .filter(record => record.username === username)
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 8)
    .map(record => ({
      ...record,
      costs: record.costs.map(entry => ({ ...entry })),
      rewards: record.rewards.map(entry => ({ ...entry })),
    }))

  return {
    week_key: weekKey,
    week_label: availability.weekWindow?.week_label || '节庆未开放',
    refresh_hint: availability.themeWeek ? `节庆窗口 · ${availability.themeWeek.startDay}到${availability.themeWeek.endDay}` : '节庆未开放时摊位隐藏',
    bulletin: availability.themeWeek
      ? `节庆摊位会在主题周内临时开放，卖完就收摊。${availability.themeWeek.summary || ''}`
      : availability.reason,
    save_available: !!saveData && availability.open,
    save_message: availability.open ? saveMessage : availability.reason,
    festival_theme: availability.themeWeek
      ? {
          id: availability.themeWeek.id,
          label: availability.themeWeek.name,
          bulletin: availability.themeWeek.summary || '',
        }
      : null,
    categories: [
      { id: 'materials', label: '限定材料', offer_count: offers.filter(offer => offer.categories.includes('materials')).length },
      { id: 'souvenir', label: '纪念品', offer_count: offers.filter(offer => offer.categories.includes('souvenir')).length },
      { id: 'food', label: '节日食物', offer_count: offers.filter(offer => offer.categories.includes('food')).length },
      { id: 'tickets', label: '票券/代币', offer_count: offers.filter(offer => offer.categories.includes('tickets')).length },
    ],
    offers: offers.map(offer => buildOfferSummary(offer, weekState, username, saveData, saveMessage)),
    my_records: myRecords,
  }
}

function purchaseFestivalStallOffer(username, offerId) {
  const availability = getFestivalAvailability()
  if (!availability.open) throw createError(availability.reason || '当前节庆摊位未开放')

  const store = loadFestivalStore()
  const weekKey = availability.weekWindow.week_key
  const weekState = getFestivalWeekState(store, weekKey)
  const offer = getFestivalCatalog(availability.themeWeek.id).find(entry => entry.id === String(offerId || '').trim())
  if (!offer) throw createError('节庆摊位没有这项商品', 404)

  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法购买节庆摊位商品')
  context.username = username
  ensureInventoryState(context.data)

  const userUsage = weekState.user_usage[username] && typeof weekState.user_usage[username] === 'object'
    ? weekState.user_usage[username]
    : {}
  const claimedByUser = clampPositiveInt(userUsage[offer.id], 0)
  const claimedGlobal = clampPositiveInt(weekState.offer_claims[offer.id], 0)
  if (claimedByUser >= clampPositiveInt(offer.weekly_limit_per_user, 1)) {
    throw createError('本周该摊位已达到个人购买上限')
  }
  if (offer.station_stock > 0 && claimedGlobal >= offer.station_stock) {
    throw createError('这项节庆商品本周已经售罄')
  }

  if (Math.max(0, Math.floor(Number(context.data.player.money) || 0)) < offer.price_money) {
    throw createError('铜钱不足，无法购买节庆摊位商品')
  }
  if (!validateOfferAgainstSave(context.data, offer).can_exchange) {
    throw createError('当前条件下无法购买这项节庆商品')
  }

  const slot = context.slot
  const previousSlotEntry = context.saves.slots[slot] ? { ...context.saves.slots[slot] } : null
  const previousMainMoney = Math.max(0, Math.floor(Number(context.data.player.money) || 0))
  context.data.player.money = previousMainMoney - offer.price_money

  if (!applyRewardsToSave(context.data, offer.rewards)) {
    throw createError('背包空间不足，请先整理背包')
  }

  const record = normalizeRecord({
    id: makeId('festival_stall_record'),
    username,
    offer_id: offer.id,
    offer_name: offer.name,
    week_key: weekKey,
    save_slot: slot,
    created_at: Math.floor(Date.now() / 1000),
    costs: [{ type: 'money', amount: offer.price_money }],
    rewards: offer.rewards,
  })

  weekState.user_usage[username] = { ...userUsage, [offer.id]: clampPositiveInt(userUsage[offer.id], 0) + 1 }
  weekState.offer_claims[offer.id] = clampPositiveInt(weekState.offer_claims[offer.id], 0) + 1
  weekState.records = [record, ...weekState.records].slice(0, MAX_RECORDS_TO_KEEP)

  try {
    persistGameplayData(context)
    saveFestivalStore(store)
  } catch (error) {
    if (previousSlotEntry) {
      context.saves.slots[slot] = previousSlotEntry
      try {
        saveUserSaveSlots(username, context.saves)
      } catch {}
    }
    throw createError(`节庆摊位购买失败：${error?.message || '未知错误'}`, 500)
  }

  return {
    week_key: weekKey,
    week_label: availability.weekWindow.week_label,
    refresh_hint: `节庆窗口 · ${availability.themeWeek.startDay}到${availability.themeWeek.endDay}`,
    save_slot: slot,
    money: Math.max(0, Math.floor(Number(context.data.player.money) || 0)),
    offer: buildOfferSummary(offer, weekState, username, context.data),
    record: {
      ...record,
      costs: record.costs.map(entry => ({ ...entry })),
      rewards: record.rewards.map(entry => ({ ...entry })),
    },
  }
}

module.exports = {
  listFestivalStall,
  purchaseFestivalStallOffer,
}
