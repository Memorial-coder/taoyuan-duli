import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-coop-order-relay')
const storageFile = path.join(tempDir, '.storage.json')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const orderRuntime = require('../src/taoyuanCoopOrderRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const owner = 'relay_owner_0529'
const helperA = 'relay_helper_a_0529'
const helperB = 'relay_helper_b_0529'
const helperC = 'relay_helper_c_0529'

const actor = username => ({
  username,
  displayName: username,
})

const buildSaveData = username => ({
  player: {
    playerName: username,
    money: 10,
  },
  inventory: {
    items: [],
    tempItems: [],
    capacity: 24,
  },
})

const seedSave = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData(buildSaveData(username)),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

const getMoney = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  const data = decrypted?.data?.player
    ? decrypted.data
    : decrypted?.gameplayData?.player
      ? decrypted.gameplayData
      : decrypted?.player
        ? decrypted
        : {}
  return Number(data?.player?.money || 0)
}

for (const username of [owner, helperA, helperB, helperC]) {
  const registered = await db.registerUser(username, 'SmokePass_0529', username)
  assert.equal(registered.ok, true, `${username} should register for relay QA`)
  seedSave(username)
}

const order = await orderRuntime.createCoopOrder({
  title: '三段公共接力分账证据',
  description: '服务端专项 QA 固定多段公共订单分账和幂等边界',
  order_type: 'village_build',
  scope: 'public',
  deadline_at: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
  reward_type: 'money',
  reward_value: 5,
  reward_label: '铜钱',
  stage_definitions: [
    {
      title: '采集木材',
      description: '先补足木材',
      preferred_order_type: 'material_help',
      target_item_id: 'wood',
      target_quantity: 2,
    },
    {
      title: '加工石料',
      description: '再处理石料',
      preferred_order_type: 'village_build',
      target_item_id: 'stone',
      target_quantity: 3,
    },
    {
      title: '送到灯会',
      description: '最后交到灯会现场',
      preferred_order_type: 'festival_supply',
      target_item_id: 'festival_crate',
      target_quantity: 1,
    },
  ],
}, actor(owner))

assert.equal(order.collaboration_mode, 'multi_stage', 'relay order should use multi-stage mode')
assert.deepEqual(order.stages.map(stage => stage.reward_value), [2, 2, 1], 'reward pool should split as 2/2/1')

const [stageOne, stageTwo, stageThree] = order.stages
await orderRuntime.acceptCoopOrderStage(order.id, stageOne.id, actor(helperA))
await orderRuntime.acceptCoopOrderStage(order.id, stageTwo.id, actor(helperB))
await orderRuntime.acceptCoopOrderStage(order.id, stageThree.id, actor(helperC))

const deliveredOne = await orderRuntime.submitCoopOrderStageDelivery(order.id, stageOne.id, {
  delivered_items: [{ item_id: 'wood', quantity: 2 }],
  result_note: '木材已交付',
}, actor(helperA))
assert.equal(deliveredOne.duplicate_protected, false, 'first stage delivery should create receipt')
assert.equal(deliveredOne.receipt.relay_split_mode, 'stage_pool_weighted', 'stage receipt should expose split mode')
assert.equal(deliveredOne.receipt.relay_pool_reward_value, 5, 'stage receipt should expose full reward pool')
assert.equal(deliveredOne.receipt.relay_participant_count, 3, 'stage receipt should expose all assigned relay participants')
assert.equal(deliveredOne.receipt.relay_share_percent, 40, 'first stage should receive 40 percent of pool')

const duplicateDeliveryOne = await orderRuntime.submitCoopOrderStageDelivery(order.id, stageOne.id, {
  delivered_items: [{ item_id: 'wood', quantity: 2 }],
  result_note: '重复交付应回放',
}, actor(helperA))
assert.equal(duplicateDeliveryOne.duplicate_protected, true, 'duplicate stage delivery should be idempotent')
assert.equal(duplicateDeliveryOne.receipt.id, deliveredOne.receipt.id, 'duplicate delivery should replay original receipt')

const confirmedOne = await orderRuntime.confirmCoopOrderStageDelivery(order.id, stageOne.id, actor(owner))
assert.equal(confirmedOne.receipt.status, 'confirmed', 'stage one receipt should confirm')
assert.equal(confirmedOne.receipt.reward_value, 2, 'stage one reward should be 2')
assert.equal(confirmedOne.receipt.relay_pending_reward_value, 5, 'stage one receipt should preserve pre-confirm pending pool')
assert.equal(getMoney(helperA), 12, 'stage one helper should receive exactly 2 money')

await assert.rejects(
  () => orderRuntime.confirmCoopOrderStageDelivery(order.id, stageOne.id, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('待确认'),
  'duplicate stage confirmation should reject instead of paying twice'
)
assert.equal(getMoney(helperA), 12, 'duplicate confirmation should not pay stage one helper twice')

const deliveredTwo = await orderRuntime.submitCoopOrderStageDelivery(order.id, stageTwo.id, {
  delivered_items: [{ item_id: 'stone', quantity: 3 }],
  result_note: '石料已交付',
}, actor(helperB))
assert.equal(deliveredTwo.receipt.relay_share_percent, 40, 'second stage should receive 40 percent of pool')
const confirmedTwo = await orderRuntime.confirmCoopOrderStageDelivery(order.id, stageTwo.id, actor(owner))
assert.equal(confirmedTwo.receipt.reward_value, 2, 'stage two reward should be 2')
assert.equal(getMoney(helperB), 12, 'stage two helper should receive exactly 2 money')

const deliveredThree = await orderRuntime.submitCoopOrderStageDelivery(order.id, stageThree.id, {
  delivered_items: [{ item_id: 'festival_crate', quantity: 1 }],
  result_note: '灯会物资已送达',
}, actor(helperC))
assert.equal(deliveredThree.receipt.relay_share_percent, 20, 'third stage should receive 20 percent of pool')
const confirmedThree = await orderRuntime.confirmCoopOrderStageDelivery(order.id, stageThree.id, actor(owner))
assert.equal(confirmedThree.receipt.reward_value, 1, 'stage three reward should be 1')
assert.equal(confirmedThree.order.status, 'closed', 'relay order should close after all stages confirm')
assert.equal(getMoney(helperC), 11, 'stage three helper should receive exactly 1 money')
assert.equal(getMoney(owner), 10, 'owner personal money should not change when confirming relay stages')

const overview = await orderRuntime.listVisibleCoopOrders(owner)
const settledOrder = overview.orders.find(entry => entry.id === order.id)
assert.ok(settledOrder, 'owner overview should include settled relay order')
assert.equal(settledOrder.relay_settlement_summary.split_mode, 'stage_pool_weighted', 'overview should expose split mode')
assert.equal(settledOrder.relay_settlement_summary.status, 'settled', 'overview settlement summary should be settled')
assert.equal(settledOrder.relay_settlement_summary.pool_reward_value, 5, 'overview should keep full reward pool')
assert.equal(settledOrder.relay_settlement_summary.confirmed_reward_value, 5, 'overview should sum confirmed payouts')
assert.equal(settledOrder.relay_settlement_summary.pending_reward_value, 0, 'overview should have no pending payout after settlement')
assert.deepEqual(
  settledOrder.relay_settlement_summary.shares.map(share => ({ reward: share.reward_value, percent: share.share_percent, status: share.settlement_status })),
  [
    { reward: 2, percent: 40, status: 'confirmed' },
    { reward: 2, percent: 40, status: 'confirmed' },
    { reward: 1, percent: 20, status: 'confirmed' },
  ],
  'overview shares should preserve 2/2/1 weighted split'
)
assert.ok(
  settledOrder.relay_settlement_summary.shares.every(share => share.settlement_receipt_id),
  'each relay share should retain its settlement receipt id'
)
assert.equal(overview.receipts.filter(entry => entry.order_id === order.id).length, 3, 'overview should persist exactly three receipts')
assert.equal(overview.society_order_board.public_relay_orders, 1, 'society order board should count the public relay')
assert.equal(overview.society_order_board.reward_pool_value, 5, 'society order board should expose reward pool')
assert.equal(overview.society_order_board.confirmed_reward_value, 5, 'society order board should expose confirmed pool')
assert.equal(overview.society_order_board.pending_reward_value, 0, 'society order board should not leave pending pool')
assert.equal(overview.society_order_board.settlement_status_counts.settled, 1, 'society order board should count settled relay')
assert.equal(overview.society_order_board.recent_receipts.length, 3, 'society order board should expose all recent relay receipts')

console.log('[qa-coop-order-relay] OK')
