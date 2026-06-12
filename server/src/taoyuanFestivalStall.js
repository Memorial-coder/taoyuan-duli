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
  getFestivalThemeRotation,
} = require('./taoyuanWeeklyExchangeStation')
const marketGovernance = require('./taoyuanMarketGovernance')

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data')
const TAOYUAN_FESTIVAL_STALL_FILE = path.join(DATA_DIR, 'taoyuan_festival_stall.json')
const ITEM_MAX_STACK = 999
const TEMP_BAG_CAPACITY = 10
const MAX_RECORDS_TO_KEEP = 240
const MAX_TRANSACTION_RECEIPTS_PER_WEEK = 400
const FESTIVAL_STALL_OPEN_DAY_START = 4
const FESTIVAL_STALL_OPEN_DAY_END = 6
const DAYS_PER_WEEK = 7
const DAYS_PER_SEASON = 28
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter']
const SEASON_LABELS = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

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

function sanitizeIdempotencyKey(value) {
  const normalized = String(value || '').trim()
  if (!normalized || normalized.length > 120) return ''
  return /^[a-zA-Z0-9._:-]+$/.test(normalized) ? normalized : ''
}

function buildTransactionReceiptKey(username, offerId, idempotencyKey) {
  return `${String(username || '')}:festival_stall:${String(offerId || '')}:${String(idempotencyKey || '')}`
}

function normalizeTransactionReceipt(raw, fallbackKey = '') {
  if (!raw || typeof raw !== 'object') return null
  const status = ['pending', 'succeeded', 'failed_rolled_back', 'compensation_pending'].includes(String(raw.status))
    ? String(raw.status)
    : 'pending'
  return {
    id: String(raw.id || fallbackKey || ''),
    username: String(raw.username || ''),
    source: 'festival_stall',
    offer_id: String(raw.offer_id || ''),
    idempotency_key: String(raw.idempotency_key || ''),
    status,
    created_at: Number(raw.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(raw.updated_at) || Number(raw.created_at) || Math.floor(Date.now() / 1000),
    error_message: String(raw.error_message || '').slice(0, 240),
    response: raw.response && typeof raw.response === 'object' ? JSON.parse(JSON.stringify(raw.response)) : null,
  }
}

function normalizeTransactionReceipts(rawReceipts) {
  const receipts = rawReceipts && typeof rawReceipts === 'object' ? rawReceipts : {}
  const normalized = Object.entries(receipts)
    .map(([key, value]) => [String(key), normalizeTransactionReceipt(value, key)])
    .filter(([, value]) => value)
    .sort(([, left], [, right]) => (Number(right.updated_at) || 0) - (Number(left.updated_at) || 0))
    .slice(0, MAX_TRANSACTION_RECEIPTS_PER_WEEK)
  return Object.fromEntries(normalized)
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
    transaction_receipts: normalizeTransactionReceipts(rawWeek?.transaction_receipts),
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
  if (!store.weeks[weekKey].transaction_receipts || typeof store.weeks[weekKey].transaction_receipts !== 'object') {
    store.weeks[weekKey].transaction_receipts = {}
  }
  return store.weeks[weekKey]
}

function getExistingTransactionReceipt(weekState, username, offerId, idempotencyKey) {
  const receiptKey = buildTransactionReceiptKey(username, offerId, idempotencyKey)
  return normalizeTransactionReceipt(weekState.transaction_receipts?.[receiptKey], receiptKey)
}

function beginTransactionReceipt(store, weekKey, weekState, username, offerId, idempotencyKey) {
  const receiptKey = buildTransactionReceiptKey(username, offerId, idempotencyKey)
  const existing = normalizeTransactionReceipt(weekState.transaction_receipts?.[receiptKey], receiptKey)
  if (existing) return existing
  const now = Math.floor(Date.now() / 1000)
  const receipt = normalizeTransactionReceipt({
    id: receiptKey,
    username,
    source: 'festival_stall',
    offer_id: offerId,
    idempotency_key: idempotencyKey,
    status: 'pending',
    created_at: now,
    updated_at: now,
    error_message: '',
    response: null,
  }, receiptKey)
  weekState.transaction_receipts[receiptKey] = receipt
  store.weeks[weekKey] = normalizeWeekState(weekState)
  saveFestivalStore(store)
  return receipt
}

function updateTransactionReceipt(store, weekKey, weekState, username, offerId, idempotencyKey, updates = {}) {
  const receiptKey = buildTransactionReceiptKey(username, offerId, idempotencyKey)
  const previous = normalizeTransactionReceipt(weekState.transaction_receipts?.[receiptKey], receiptKey) || {}
  weekState.transaction_receipts[receiptKey] = normalizeTransactionReceipt({
    ...previous,
    ...updates,
    id: receiptKey,
    username,
    source: 'festival_stall',
    offer_id: offerId,
    idempotency_key: idempotencyKey,
    updated_at: Math.floor(Date.now() / 1000),
  }, receiptKey)
  store.weeks[weekKey] = normalizeWeekState(weekState)
}

function throwTransactionReceiptReplay(receipt) {
  if (!receipt || receipt.status === 'succeeded') return
  const error = createError(
    receipt.error_message || '上一笔节庆摊位交易状态未完成，请刷新后确认资产状态',
    receipt.status === 'failed_rolled_back' ? 400 : 409,
    receipt.status === 'failed_rolled_back'
      ? 'FESTIVAL_STALL_RECEIPT_FAILED_ROLLED_BACK'
      : 'FESTIVAL_STALL_RECEIPT_COMPENSATION_PENDING'
  )
  error.transaction_receipt_status = receipt.status
  throw error
}

function normalizeGameCalendar(saveData) {
  const game = saveData && typeof saveData === 'object' && saveData.game && typeof saveData.game === 'object'
    ? saveData.game
    : null
  if (!game) return null
  const year = Math.max(1, Math.floor(Number(game.year) || 1))
  const rawSeason = String(game.season || 'spring')
  const season = rawSeason === 'fall'
    ? 'autumn'
    : SEASON_ORDER.includes(rawSeason)
      ? rawSeason
      : 'spring'
  const day = Math.min(DAYS_PER_SEASON, Math.max(1, Math.floor(Number(game.day) || 1)))
  return { year, season, day }
}

function getNextGameWeekStart(calendar) {
  const weekOfSeason = Math.floor((calendar.day - 1) / DAYS_PER_WEEK) + 1
  const nextDay = weekOfSeason * DAYS_PER_WEEK + 1
  if (nextDay <= DAYS_PER_SEASON) {
    return { year: calendar.year, season: calendar.season, day: nextDay }
  }
  const seasonIndex = SEASON_ORDER.indexOf(calendar.season)
  const nextSeasonIndex = seasonIndex >= 0 ? seasonIndex + 1 : 1
  if (nextSeasonIndex < SEASON_ORDER.length) {
    return { year: calendar.year, season: SEASON_ORDER[nextSeasonIndex], day: 1 }
  }
  return { year: calendar.year + 1, season: SEASON_ORDER[0], day: 1 }
}

function formatGameDayLabel(calendar) {
  return `第${calendar.year}年 ${SEASON_LABELS[calendar.season] || calendar.season} 第${calendar.day}天`
}

function buildGameWeekWindow(saveData) {
  const calendar = normalizeGameCalendar(saveData)
  if (!calendar) {
    return {
      week_key: 'game-calendar-unavailable',
      week_label: '游戏内节庆周待同步',
      refresh_hint: '同步服务端存档后按游戏内周轮换',
      game_calendar: null,
    }
  }

  const weekOfSeason = Math.floor((calendar.day - 1) / DAYS_PER_WEEK) + 1
  const weekdayIndex = (calendar.day - 1) % DAYS_PER_WEEK
  const weekStartDay = (weekOfSeason - 1) * DAYS_PER_WEEK + 1
  const weekEndDay = Math.min(DAYS_PER_SEASON, weekStartDay + DAYS_PER_WEEK - 1)
  const nextRefresh = getNextGameWeekStart(calendar)
  const seasonLabel = SEASON_LABELS[calendar.season] || calendar.season
  return {
    week_key: `game:${calendar.year}:${calendar.season}:week-${weekOfSeason}`,
    week_label: `第${calendar.year}年 ${seasonLabel} 第${weekOfSeason}周（第${weekStartDay}-${weekEndDay}天）`,
    refresh_hint: `按游戏内周轮换 · ${formatGameDayLabel(nextRefresh)}刷新`,
    game_calendar: {
      year: calendar.year,
      season: calendar.season,
      day: calendar.day,
      week_of_season: weekOfSeason,
      week_start_day: weekStartDay,
      week_end_day: weekEndDay,
      weekday_index: weekdayIndex,
      weekday_label: WEEKDAY_LABELS[weekdayIndex],
    },
  }
}

function buildFestivalThemeWeek(festivalTheme) {
  return {
    id: festivalTheme.id,
    name: festivalTheme.label,
    startDay: '周五',
    endDay: '周日',
    summary: festivalTheme.bulletin,
  }
}

function getFestivalAvailability(saveData = null) {
  const weekWindow = buildGameWeekWindow(saveData)
  const festivalTheme = getFestivalThemeRotation(weekWindow.week_key)
  const themeWeek = buildFestivalThemeWeek(festivalTheme)
  const forceOpen = String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim() === 'true'
  const gameWeekday = Number(weekWindow.game_calendar?.weekday_index)
  const hasGameCalendar = Number.isInteger(gameWeekday)

  if (!hasGameCalendar) {
    return {
      open: false,
      reason: '当前没有可用的服务端存档，无法判断游戏内节庆摊位开放日。',
      weekWindow,
      themeWeek,
    }
  }

  const open = forceOpen || (gameWeekday >= FESTIVAL_STALL_OPEN_DAY_START && gameWeekday <= FESTIVAL_STALL_OPEN_DAY_END)
  if (!open) {
    return {
      open: false,
      reason: `节庆临时摊位只在游戏内每周五到周日开放，今天是${weekWindow.game_calendar.weekday_label}，当前先展示预告，不开放购买。`,
      weekWindow,
      themeWeek,
    }
  }
  return {
    open: true,
    reason: '',
    weekWindow,
    themeWeek,
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

function buildOfferSummary(offer, weekState, username, saveData, saveMessage = '', availability = getFestivalAvailability(saveData)) {
  const claimedByUser = clampPositiveInt(weekState.user_usage?.[username]?.[offer.id], 0)
  const claimedGlobal = clampPositiveInt(weekState.offer_claims?.[offer.id], 0)
  const remainingGlobal = Math.max(0, clampPositiveInt(offer.station_stock, 0) - claimedGlobal)
  let canExchange = true
  let disabledReason = ''
  const boothCategory = Array.isArray(offer.categories) ? offer.categories[0] || 'festival' : 'festival'

  if (!availability.open) {
    canExchange = false
    disabledReason = availability.reason
  } else {
    try {
      marketGovernance.ensureNotSanctioned(username, '节庆摊位')
      marketGovernance.ensureSourceEnabled('festival_stall', { category: boothCategory })
      marketGovernance.assertPriceWithinBand({
        source: 'festival_stall',
        category: boothCategory,
        priceMoney: clampPositiveInt(offer.price_money, 0),
      })
      marketGovernance.ensureUserRateLimit(username, {
        source: 'festival_stall',
        source_label: '节庆摊位',
        money_volume: clampPositiveInt(offer.price_money, 0),
      })
    } catch (error) {
      canExchange = false
      disabledReason = error?.message || '当前官方调控暂不允许这项节庆商品'
    }
  }
  if (canExchange && !saveData) {
    canExchange = false
    disabledReason = saveMessage || '当前没有可用的服务端存档'
  } else if (canExchange && claimedByUser >= clampPositiveInt(offer.weekly_limit_per_user, 1)) {
    canExchange = false
    disabledReason = '本周该摊位已达到个人购买上限'
  } else if (canExchange && offer.station_stock > 0 && remainingGlobal <= 0) {
    canExchange = false
    disabledReason = '这项节庆商品本周已经售罄'
  } else if (canExchange) {
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
    booth_category: boothCategory,
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
  let saveData = null
  let saveMessage = ''
  try {
    const saveContext = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法使用节庆摊位')
    ensureInventoryState(saveContext.data)
    saveData = saveContext.data
  } catch (error) {
    saveMessage = error?.message || '当前账号没有可用的桃源服务端存档'
  }

  const availability = getFestivalAvailability(saveData)
  const store = loadFestivalStore()
  const weekKey = availability.weekWindow?.week_key || 'festival_closed'
  const weekState = getFestivalWeekState(store, weekKey)
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
    refresh_hint: availability.themeWeek
      ? `节庆窗口 · 游戏内${availability.themeWeek.startDay}到${availability.themeWeek.endDay} · ${availability.weekWindow?.refresh_hint || '按游戏内周轮换'}`
      : '节庆未开放时摊位隐藏',
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
    offers: offers.map(offer => buildOfferSummary(offer, weekState, username, saveData, saveMessage, availability)),
    my_records: myRecords,
  }
}

function purchaseFestivalStallOffer(username, offerId, options = {}) {
  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法购买节庆摊位商品')
  context.username = username
  ensureInventoryState(context.data)
  const availability = getFestivalAvailability(context.data)
  if (!availability.open) throw createError(availability.reason || '当前节庆摊位未开放')

  const store = loadFestivalStore()
  const weekKey = availability.weekWindow.week_key
  const weekState = getFestivalWeekState(store, weekKey)
  const offer = getFestivalCatalog(availability.themeWeek.id).find(entry => entry.id === String(offerId || '').trim())
  if (!offer) throw createError('节庆摊位没有这项商品', 404)
  const idempotencyKey = sanitizeIdempotencyKey(options.idempotency_key || options.idempotencyKey)
  if (!idempotencyKey) throw createError('节庆摊位请求缺少幂等键', 400, 'FESTIVAL_STALL_IDEMPOTENCY_REQUIRED')
  const existingReceipt = getExistingTransactionReceipt(weekState, username, offer.id, idempotencyKey)
  if (existingReceipt?.status === 'succeeded' && existingReceipt.response) {
    const responseRevision = Number.isFinite(Number(existingReceipt.response.save_revision))
      ? Math.max(0, Math.floor(Number(existingReceipt.response.save_revision)))
      : Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0))
    return {
      ...existingReceipt.response,
      save_revision: responseRevision,
      idempotency_replayed: true,
      transaction_receipt_status: existingReceipt.status,
    }
  }
  throwTransactionReceiptReplay(existingReceipt)
  const boothCategory = Array.isArray(offer.categories) ? offer.categories[0] || 'festival' : 'festival'
  marketGovernance.ensureNotSanctioned(username, '节庆摊位')
  marketGovernance.ensureSourceEnabled('festival_stall', { category: boothCategory })
  marketGovernance.assertPriceWithinBand({
    source: 'festival_stall',
    category: boothCategory,
    priceMoney: clampPositiveInt(offer.price_money, 0),
  })
  marketGovernance.ensureUserRateLimit(username, {
    source: 'festival_stall',
    source_label: '节庆摊位',
    money_volume: clampPositiveInt(offer.price_money, 0),
  })

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
  beginTransactionReceipt(store, weekKey, weekState, username, offer.id, idempotencyKey)
  context.data.player.money = previousMainMoney - offer.price_money

  if (!applyRewardsToSave(context.data, offer.rewards)) {
    updateTransactionReceipt(store, weekKey, weekState, username, offer.id, idempotencyKey, {
      status: 'failed_rolled_back',
      error_message: '背包空间不足，请先整理背包',
    })
    try {
      saveFestivalStore(store)
    } catch {}
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

  const responsePayload = {
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
    idempotency_key: idempotencyKey,
    transaction_receipt_status: 'succeeded',
  }
  let playerSavePersisted = false
  let saveRevision = 0
  try {
    saveRevision = persistGameplayData(context)
    playerSavePersisted = true
    updateTransactionReceipt(store, weekKey, weekState, username, offer.id, idempotencyKey, {
      status: 'succeeded',
      error_message: '',
      response: {
        ...responsePayload,
        save_revision: saveRevision,
      },
    })
    saveFestivalStore(store)
  } catch (error) {
    let rolledBack = !playerSavePersisted
    if (playerSavePersisted && previousSlotEntry) {
      context.saves.slots[slot] = previousSlotEntry
      try {
        saveUserSaveSlots(username, context.saves)
        rolledBack = true
      } catch {}
    }
    try {
      const rollbackStore = loadFestivalStore()
      const rollbackWeekState = getFestivalWeekState(rollbackStore, weekKey)
      updateTransactionReceipt(rollbackStore, weekKey, rollbackWeekState, username, offer.id, idempotencyKey, {
        status: rolledBack ? 'failed_rolled_back' : 'compensation_pending',
        error_message: rolledBack
          ? `节庆摊位购买失败，玩家存档已回退：${error?.message || '未知错误'}`
          : `节庆摊位购买失败，玩家存档回退待补偿：${error?.message || '未知错误'}`,
      })
      saveFestivalStore(rollbackStore)
    } catch {}
    throw createError(`节庆摊位购买失败：${error?.message || '未知错误'}`, 500)
  }
  try {
    marketGovernance.applyGovernanceRecord(username, {
      source: 'festival_stall',
      money_volume: clampPositiveInt(offer.price_money, 0),
    })
  } catch {}

  return {
    ...responsePayload,
    save_revision: saveRevision,
  }
}

module.exports = {
  listFestivalStall,
  purchaseFestivalStallOffer,
  __testing: {
    buildGameWeekWindow,
    getFestivalAvailability,
  },
}
