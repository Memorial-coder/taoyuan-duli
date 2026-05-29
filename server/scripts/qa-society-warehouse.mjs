import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-society-warehouse')
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
const runtime = require('../src/taoyuanSocietyRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const owner = 'society_warehouse_owner_0529'

const actor = username => ({
  username,
  displayName: username,
})

const buildSaveData = username => ({
  player: {
    playerName: username,
    money: 100,
  },
  inventory: {
    items: [
      { itemId: 'rice', quantity: 4, quality: 'normal', locked: false },
      { itemId: 'herb', quantity: 2, quality: 'normal', locked: false },
      { itemId: 'cabbage', quantity: 2, quality: 'normal', locked: false },
      { itemId: 'wood', quantity: 1, quality: 'normal', locked: false },
    ],
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

const getGameplayData = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  if (decrypted?.data?.player) return decrypted.data
  if (decrypted?.gameplayData?.player) return decrypted.gameplayData
  if (decrypted?.player) return decrypted
  return {}
}

const getInventoryQuantity = (data, itemId) => [
  ...(Array.isArray(data?.inventory?.items) ? data.inventory.items : []),
  ...(Array.isArray(data?.inventory?.tempItems) ? data.inventory.tempItems : []),
]
  .filter(entry => entry?.itemId === itemId)
  .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)

const getPlayerWarehouseInputSnapshot = () => {
  const data = getGameplayData(owner)
  return JSON.stringify({
    money: Number(data?.player?.money || 0),
    rice: getInventoryQuantity(data, 'rice'),
    herb: getInventoryQuantity(data, 'herb'),
    cabbage: getInventoryQuantity(data, 'cabbage'),
    wood: getInventoryQuantity(data, 'wood'),
  })
}

const getWarehouseQuantity = (warehouse, itemId) => (warehouse.items || [])
  .filter(entry => entry?.item_id === itemId)
  .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)

await db.registerUser(owner, 'SmokePass_0529', '仓廪主人')
seedSave(owner)

const created = await runtime.createSociety({
  name: '清溪仓廪证据社',
  summary: '公共仓廪边界 QA',
  visibility: 'public',
  capacity: 8,
  join_requirement_id: 'open',
}, actor(owner))
assert.equal(created.society.name, '清溪仓廪证据社', 'society should be created before warehouse QA')

const initialPersonalSnapshot = getPlayerWarehouseInputSnapshot()
assert.match(initialPersonalSnapshot, /"money":100/, 'initial personal money should be seeded')
assert.match(initialPersonalSnapshot, /"rice":4/, 'initial rice should be seeded')
assert.match(initialPersonalSnapshot, /"herb":2/, 'initial herb should be seeded')

const riceDeposit = await runtime.depositSocietyWarehouse({
  deposit_id: 'rice_crate',
}, actor(owner))
assert.equal(getWarehouseQuantity(riceDeposit.warehouse, 'rice'), 2, 'rice deposit should add rice to public warehouse')
assert.equal(riceDeposit.warehouse.logs[0]?.action, 'deposit', 'rice deposit should write warehouse log')
assert.equal(riceDeposit.warehouse.logs[0]?.deposit_id, 'rice_crate', 'rice deposit log should expose deposit id')

const afterRiceDeposit = getGameplayData(owner)
assert.equal(Number(afterRiceDeposit.player.money), 96, 'rice deposit should deduct personal money once')
assert.equal(getInventoryQuantity(afterRiceDeposit, 'rice'), 2, 'rice deposit should deduct personal rice')
assert.equal(getInventoryQuantity(afterRiceDeposit, 'herb'), 2, 'rice deposit should not deduct herb')

const herbDeposit = await runtime.depositSocietyWarehouse({
  deposit_id: 'herb_crate',
}, actor(owner))
assert.equal(getWarehouseQuantity(herbDeposit.warehouse, 'rice'), 2, 'herb deposit should keep public rice')
assert.equal(getWarehouseQuantity(herbDeposit.warehouse, 'herb'), 1, 'herb deposit should add herb to public warehouse')
assert.equal(herbDeposit.warehouse.weekly_settlement.covered_category_count, 2, 'weekly settlement should read two covered categories')
assert.equal(herbDeposit.warehouse.weekly_settlement.total_points, 4, 'weekly settlement should sum rice and herb points')

const personalSnapshotAfterDeposits = getPlayerWarehouseInputSnapshot()
assert.match(personalSnapshotAfterDeposits, /"money":91/, 'two deposits should deduct only configured personal money')
assert.match(personalSnapshotAfterDeposits, /"rice":2/, 'two deposits should keep remaining personal rice')
assert.match(personalSnapshotAfterDeposits, /"herb":1/, 'two deposits should keep remaining personal herb')

const consumed = await runtime.consumeSocietyWarehouse({
  consume_id: 'laba_cookpot_base',
  idempotency_key: 'qa:society-warehouse:laba-cookpot',
}, actor(owner))
assert.equal(consumed.idempotent_replay, false, 'first public warehouse consume should not be idempotent replay')
assert.equal(getWarehouseQuantity(consumed.warehouse, 'rice'), 0, 'consume should deduct rice from public warehouse')
assert.equal(getWarehouseQuantity(consumed.warehouse, 'herb'), 0, 'consume should deduct herb from public warehouse')
assert.equal(consumed.log_entry.action, 'consume', 'consume should write consume log')
assert.equal(consumed.log_entry.settlement_scope, 'public_warehouse_only', 'consume log should expose public-only settlement scope')
assert.equal(consumed.log_entry.personal_asset_effect, 'none_after_deposit', 'consume log should declare no personal asset effect')
assert.match(consumed.log_entry.authority_summary, /只扣公共仓/, 'consume log should expose server authority summary')
assert.deepEqual(consumed.log_entry.warehouse_stock_after, [], 'consume log should include empty public warehouse stock snapshot')
assert.equal(getPlayerWarehouseInputSnapshot(), personalSnapshotAfterDeposits, 'public consume should not mutate personal save after deposits')

const duplicateConsume = await runtime.consumeSocietyWarehouse({
  consume_id: 'laba_cookpot_base',
  idempotency_key: 'qa:society-warehouse:laba-cookpot',
}, actor(owner))
assert.equal(duplicateConsume.idempotent_replay, true, 'duplicate consume should replay idempotently')
assert.equal(duplicateConsume.log_entry.id, consumed.log_entry.id, 'duplicate consume should return original log entry')
assert.equal(duplicateConsume.warehouse.logs.filter(entry => entry.action === 'consume').length, 1, 'duplicate consume should not add another consume log')
assert.equal(getPlayerWarehouseInputSnapshot(), personalSnapshotAfterDeposits, 'duplicate consume should not mutate personal save')

await assert.rejects(
  () => runtime.consumeSocietyWarehouse({
    consume_id: 'laba_cookpot_base',
    idempotency_key: 'qa:society-warehouse:laba-cookpot-second',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('不足'),
  'second unique consume should reject because public warehouse is empty'
)
assert.equal(getPlayerWarehouseInputSnapshot(), personalSnapshotAfterDeposits, 'rejected consume should keep personal save unchanged')

console.log('[qa-society-warehouse] OK')
