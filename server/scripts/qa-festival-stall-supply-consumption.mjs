import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'festival-stall-supply-'))
const storageFile = path.join(tempDir, '.storage.json')

process.env.DB_STORAGE = storageFile
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''
delete process.env.QA_ONLINE_SMOKE_FORCE_LOCAL

const saveRuntime = require('../src/taoyuanSaveRuntime')
const festivalStall = require('../src/taoyuanFestivalStall')

const username = 'festival_supply_guard'
const expectedWeekKey = 'game:1:autumn:week-1'

const readJsonFile = async (fileName, fallback = {}) => {
  try {
    return JSON.parse(await readFile(path.join(tempDir, fileName), 'utf8'))
  } catch {
    return fallback
  }
}

const readGameplayData = () => {
  const saves = saveRuntime.loadUserSaveSlots(username)
  const raw = saves.slots[0]?.raw || ''
  const decrypted = saveRuntime.decryptTaoyuanRaw(raw)
  return saveRuntime.normalizeGameplaySaveContainer(decrypted)?.gameplayData || {}
}

const getTotalItemCount = itemId => {
  const inventory = readGameplayData()?.inventory || {}
  return [...(inventory.items || []), ...(inventory.tempItems || [])]
    .filter(slot => slot?.itemId === itemId)
    .reduce((sum, slot) => sum + Math.max(0, Math.floor(Number(slot.quantity) || 0)), 0)
}

const getTicketQuantity = ticketType =>
  Math.max(0, Math.floor(Number(readGameplayData()?.wallet?.rewardTickets?.[ticketType]) || 0))

const getGovernanceMoneyVolume = async () => {
  const store = await readJsonFile('taoyuan_market_governance.json', { users: {} })
  const days = store.users?.[username]?.days || {}
  return Object.values(days).reduce(
    (sum, dayState) => sum + Math.max(0, Math.floor(Number(dayState?.total_money_volume) || 0)),
    0
  )
}

try {
  const gameplayData = {
    game: { year: 1, season: 'autumn', day: 5 },
    player: { playerName: 'Festival Supply Guard', money: 5000 },
    inventory: {
      capacity: 24,
      items: [{ itemId: 'rice_flour', quantity: 5, quality: 'normal', locked: false }],
      tempItems: [],
    },
    wallet: { rewardTickets: {}, rewardTicketLifetimeEarned: {} },
  }
  saveRuntime.saveUserSaveSlots(username, {
    slots: {
      0: {
        raw: saveRuntime.encryptTaoyuanData({ data: gameplayData, savedAt: new Date().toISOString() }),
        revision: 0,
      },
      1: null,
      2: null,
    },
  })
  saveRuntime.setActiveSaveSlot(username, 0)

  const overview = festivalStall.listFestivalStall(username)
  assert.equal(overview.week_key, expectedWeekKey, 'fixture must open the expected autumn game week')
  const supplyOffer = overview.offers.find(offer => offer.id === 'festival_banquet_flour_supply')
  assert(supplyOffer, 'autumn festival stall must expose the flour supply offer')
  assert.equal(supplyOffer.booth_category, 'supply', 'supply offer must use the supply booth category')
  assert.equal(supplyOffer.price_money, 0, 'supply offer must not be represented as a money purchase')
  assert.equal(supplyOffer.can_exchange, true, 'supply offer must start exchangeable when items are present')

  const itemCost = supplyOffer.costs.find(cost => cost?.type === 'item')
  assert.equal(itemCost?.item_id, 'rice_flour', 'supply offer must require a processed item cost')
  const ticketReward = supplyOffer.rewards.find(reward => reward?.type === 'ticket')
  assert(ticketReward?.ticket_type, 'supply offer must grant a wallet ticket reward')

  const itemBefore = getTotalItemCount(itemCost.item_id)
  const moneyBefore = readGameplayData().player.money
  const ticketBefore = getTicketQuantity(ticketReward.ticket_type)

  const first = festivalStall.purchaseFestivalStallOffer(username, supplyOffer.id, { idempotency_key: 'submit-flour' })
  assert.equal(first.offer.claimed_by_user, 1, 'first supply submission must advance personal claim count')
  assert.equal(first.offer.can_exchange, false, 'first supply submission must exhaust the personal limit')
  assert.equal(first.record.costs[0]?.type, 'item', 'supply record must preserve item costs')
  assert.equal(first.record.costs[0]?.item_id, itemCost.item_id, 'supply record must name the consumed item')
  assert.equal(getTotalItemCount(itemCost.item_id), itemBefore - Number(itemCost.quantity || 0), 'supply submission must consume processed items')
  assert.equal(readGameplayData().player.money, moneyBefore, 'supply submission must not deduct money')
  assert.equal(
    getTicketQuantity(ticketReward.ticket_type),
    ticketBefore + Number(ticketReward.quantity || 0),
    'supply submission must grant the configured ticket reward'
  )
  assert.equal(await getGovernanceMoneyVolume(), 0, 'item-only supply submissions must not add money volume')

  const replay = festivalStall.purchaseFestivalStallOffer(username, supplyOffer.id, { idempotency_key: 'submit-flour' })
  assert.equal(replay.idempotency_replayed, true, 'same supply idempotency key must replay the receipt')
  assert.equal(getTotalItemCount(itemCost.item_id), itemBefore - Number(itemCost.quantity || 0), 'replay must not consume processed items twice')
  assert.equal(
    getTicketQuantity(ticketReward.ticket_type),
    ticketBefore + Number(ticketReward.quantity || 0),
    'replay must not grant tickets twice'
  )

  const persisted = await readJsonFile('taoyuan_festival_stall.json', { weeks: {} })
  const currentWeek = persisted.weeks?.[expectedWeekKey]
  assert(currentWeek, 'festival supply submission must persist the current week')
  assert.equal(currentWeek.records?.[0]?.costs?.[0]?.type, 'item', 'persisted supply record must keep item costs')
  assert.equal(currentWeek.records?.[0]?.costs?.[0]?.item_id, itemCost.item_id, 'persisted supply record must keep the processed item id')

  console.log('qa-festival-stall-supply-consumption: ok')
} finally {
  if (fs.existsSync(tempDir)) await rm(tempDir, { recursive: true, force: true })
}
