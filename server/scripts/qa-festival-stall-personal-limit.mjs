import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'festival-stall-personal-limit-'))
const storageFile = path.join(tempDir, '.storage.json')

process.env.DB_STORAGE = storageFile
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''
delete process.env.QA_ONLINE_SMOKE_FORCE_LOCAL

const saveRuntime = require('../src/taoyuanSaveRuntime')
const festivalStall = require('../src/taoyuanFestivalStall')

const username = 'festival_limit_guard'
const currentWeekKey = 'game:1:autumn:week-1'

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

const buildOldWeekState = index => ({
  user_usage: {},
  offer_claims: {},
  records: [
    {
      id: `old_record_${index}`,
      username,
      offer_id: `old_offer_${index}`,
      offer_name: `Old Offer ${index}`,
      week_key: `old-week-${String(index).padStart(2, '0')}`,
      save_slot: 0,
      created_at: 1000 + index,
      costs: [{ type: 'money', amount: 1 }],
      rewards: [{ type: 'item', item_id: 'paper', quantity: 1, quality: 'normal' }],
    },
  ],
  transaction_receipts: {},
})

try {
  const oldWeeks = {}
  for (let index = 0; index < 16; index += 1) {
    oldWeeks[`old-week-${String(index).padStart(2, '0')}`] = buildOldWeekState(index)
  }
  await writeFile(path.join(tempDir, 'taoyuan_festival_stall.json'), JSON.stringify({ weeks: oldWeeks }, null, 2), 'utf8')

  const gameplayData = {
    game: { year: 1, season: 'autumn', day: 5 },
    player: { playerName: 'Festival Limit Guard', money: 5000 },
    inventory: { capacity: 24, items: [], tempItems: [] },
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
  assert.equal(overview.week_key, currentWeekKey, 'fixture must open the expected autumn game week')
  const ticketOffer = overview.offers.find(offer => offer.booth_category === 'tickets')
  assert(ticketOffer?.id, 'festival stall must expose a ticket offer')
  assert.equal(ticketOffer.weekly_limit_per_user, 1, 'ticket offer fixture must be personal-limit 1')
  assert.equal(ticketOffer.claimed_by_user, 0, 'ticket offer must start unclaimed')
  assert.equal(ticketOffer.can_exchange, true, 'ticket offer must start exchangeable')

  const ticketReward = ticketOffer.rewards.find(reward => reward?.type === 'ticket')
  assert(ticketReward?.ticket_type, 'ticket offer must grant a wallet ticket')
  const ticketBefore = getTicketQuantity(ticketReward.ticket_type)

  const first = festivalStall.purchaseFestivalStallOffer(username, ticketOffer.id, { idempotency_key: 'first-buy' })
  assert.equal(first.offer.claimed_by_user, 1, 'first purchase must advance personal claim count')
  assert.equal(first.offer.can_exchange, false, 'first purchase response must mark offer exhausted')

  const persisted = await readJsonFile('taoyuan_festival_stall.json', { weeks: {} })
  assert(Object.prototype.hasOwnProperty.call(persisted.weeks || {}, currentWeekKey), 'current week must survive 16-week pruning')
  assert.equal(
    persisted.weeks?.[currentWeekKey]?.user_usage?.[username]?.[ticketOffer.id],
    1,
    'current week personal usage must persist'
  )
  assert.equal(Object.keys(persisted.weeks || {}).length, 16, 'festival store should stay capped at 16 weeks')

  const afterReload = festivalStall.listFestivalStall(username)
  const reloadedOffer = afterReload.offers.find(offer => offer.id === ticketOffer.id)
  assert.equal(reloadedOffer?.claimed_by_user, 1, 'reload must reconstruct personal claim count')
  assert.equal(reloadedOffer?.can_exchange, false, 'reload must keep the offer disabled by personal limit')
  assert.equal(String(reloadedOffer?.disabled_reason || '').includes('1500'), false, 'disabled reason must not fall through to money-volume governance')

  const governanceAfterFirst = await getGovernanceMoneyVolume()
  assert.equal(governanceAfterFirst, ticketOffer.price_money, 'first purchase must record governance money once')

  const replay = festivalStall.purchaseFestivalStallOffer(username, ticketOffer.id, { idempotency_key: 'first-buy' })
  assert.equal(replay.idempotency_replayed, true, 'same idempotency key must replay the receipt')
  assert.equal(getTicketQuantity(ticketReward.ticket_type), ticketBefore + Number(ticketReward.quantity || 0), 'replay must not grant tickets twice')
  assert.equal(await getGovernanceMoneyVolume(), governanceAfterFirst, 'replay must not advance governance money volume')

  let secondError = null
  try {
    festivalStall.purchaseFestivalStallOffer(username, ticketOffer.id, { idempotency_key: 'second-buy' })
  } catch (error) {
    secondError = error
  }
  assert(secondError, 'second purchase with a new key must be rejected by personal limit')
  assert.equal(secondError.status || 400, 400, 'second purchase rejection should be a gameplay validation error')
  assert.equal(await getGovernanceMoneyVolume(), governanceAfterFirst, 'rejected second purchase must not advance governance money volume')

  const finalStore = await readJsonFile('taoyuan_festival_stall.json', { weeks: {} })
  const receipts = finalStore.weeks?.[currentWeekKey]?.transaction_receipts || {}
  assert.equal(
    receipts[`${username}:festival_stall:${ticketOffer.id}:first-buy`]?.status,
    'succeeded',
    'successful receipt must remain in the retained current week'
  )
  assert.equal(
    receipts[`${username}:festival_stall:${ticketOffer.id}:second-buy`],
    undefined,
    'limit rejection must happen before opening a second receipt'
  )

  console.log('qa-festival-stall-personal-limit: ok')
} finally {
  if (fs.existsSync(tempDir)) await rm(tempDir, { recursive: true, force: true })
}
