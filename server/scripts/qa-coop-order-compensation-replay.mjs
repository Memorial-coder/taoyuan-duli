import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDirName = process.env.QA_COOP_ORDER_COMPENSATION_TEMP_DIR || `.tmp-coop-order-compensation-${process.pid}`
const tempDir = path.isAbsolute(tempDirName) ? tempDirName : path.resolve(serverRoot, tempDirName)
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

const owner = 'replay_o31'
const helper = 'replay_h31'

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

for (const username of [owner, helper]) {
  const registered = await db.registerUser(username, 'ReplayPass_0531', username)
  assert.equal(registered.ok, true, `${username} should register for compensation replay QA`)
}

seedSave(owner)

const order = await orderRuntime.createCoopOrder({
  title: 'compensation replay order',
  description: 'verify failed settlement can stay pending and replay later',
  order_type: 'material_help',
  scope: 'public',
  target_username: helper,
  deadline_at: Math.floor(Date.now() / 1000) + 3600,
  reward_type: 'money',
  reward_value: 7,
  reward_label: 'money',
}, actor(owner))

await orderRuntime.acceptCoopOrder(order.id, actor(helper))
await orderRuntime.submitCoopOrderDelivery(order.id, {
  result_note: 'helper completed the order before a server save existed',
}, actor(helper))

const pending = await orderRuntime.confirmCoopOrderDelivery(order.id, actor(owner))
assert.equal(pending.receipt.status, 'compensation_pending', 'failed settlement should keep receipt pending')
assert.equal(pending.order.delivery_status, 'compensation_pending', 'failed settlement should keep order pending')
assert.equal(pending.compensation.status, 'pending', 'failed settlement should create a pending compensation')
assert.equal(pending.compensation.attempt_count, 1, 'initial settlement failure should count as first attempt')

await assert.rejects(
  () => orderRuntime.replayCoopOrderCompensation(pending.compensation.id, actor(owner)),
  error => String(error?.message || '').includes('补偿重试失败') || String(error?.message || '').includes('compensation'),
  'replay should stay retryable when the underlying save is still unavailable'
)

const failedRetryOverview = await orderRuntime.listAdminCoopOrders()
const failedRetryCompensation = failedRetryOverview.compensations.find(entry => entry.id === pending.compensation.id)
assert.equal(failedRetryCompensation.status, 'pending', 'failed replay should leave compensation pending')
assert.equal(failedRetryCompensation.attempt_count, 2, 'failed replay should record another attempt for audit')
assert.ok(failedRetryCompensation.last_error, 'failed replay should retain last error for tracing')

seedSave(helper)

const resolved = await orderRuntime.replayCoopOrderCompensation(pending.compensation.id, actor(owner))
assert.equal(resolved.compensation.status, 'resolved', 'second replay should resolve compensation after save recovery')
assert.equal(resolved.compensation.attempt_count, 3, 'successful replay should preserve total attempt count')
assert.equal(resolved.receipt.status, 'confirmed', 'successful replay should confirm receipt')
assert.equal(resolved.receipt.compensation_id, '', 'successful replay should clear receipt compensation pointer')
assert.equal(resolved.order.delivery_status, 'confirmed', 'successful replay should confirm order delivery')
assert.equal(getMoney(helper), 17, 'successful replay should pay helper exactly once')

await assert.rejects(
  () => orderRuntime.replayCoopOrderCompensation(pending.compensation.id, actor(owner)),
  error => String(error?.message || '').includes('已经处理完成'),
  'resolved compensation should not replay again'
)
assert.equal(getMoney(helper), 17, 'resolved compensation retry rejection should not pay helper twice')

console.log('[qa-coop-order-compensation-replay] OK')
