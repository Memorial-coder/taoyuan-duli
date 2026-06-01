import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-anomaly-detection-20-2-${process.pid}`)

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = path.join(tempDir, '.storage.json')
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const socialRuntime = require('../src/taoyuanSocialRuntime')
const runtime = require('../src/taoyuanCohabitationRuntime')
const manorRuntime = require('../src/taoyuanManorRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const actor = (username, meta = {}) => ({
  username,
  displayName: username,
  ...meta,
})

const riskActor = (username, group) => actor(username, {
  ipAddress: `198.51.100.${group}`,
  deviceId: `qa-risk-device-${group}`,
  userAgent: `qa-anomaly-detection-${group}`,
})

const buildSaveData = (username, items, money = 5000) => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-06-01T00:00:00.000Z',
  },
  savedAt: '2026-06-01T00:00:00.000Z',
  data: {
    player: {
      playerName: username,
      money,
    },
    game: {
      year: 1,
      season: 'spring',
      day: 12,
    },
    farm: {
      farmSize: 4,
      plots: Array.from({ length: 16 }, (_, id) => ({
        id,
        state: 'wasteland',
        cropId: null,
        growthDays: 0,
        watered: false,
        unwateredDays: 0,
        fertilizer: null,
        harvestCount: 0,
        giantCropGroup: null,
        seedGenetics: null,
        infested: false,
        infestedDays: 0,
        weedy: false,
        weedyDays: 0,
      })),
      fruitTrees: [],
      greenhousePlots: [],
      nextFruitTreeId: 0,
    },
    inventory: {
      items,
      tempItems: [],
      capacity: 24,
    },
  },
})

const seedSave = (username, items, money = 5000) => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const preparedSlot = saveRuntime.prepareSlotEntryForSave(
    username,
    0,
    saveRuntime.encryptTaoyuanData(buildSaveData(username, items, money)),
    1,
  )
  slots.slots[0] = {
    raw: preparedSlot.raw,
    revision: preparedSlot.revision,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

const readGameplayData = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const current = slots.slots[0]
  if (!current?.raw) return null
  return saveRuntime.normalizeGameplaySaveContainer(saveRuntime.decryptTaoyuanRaw(current.raw)).gameplayData
}

const inventoryQuantity = (username, itemId, quality = 'normal') =>
  (readGameplayData(username)?.inventory?.items || [])
    .filter(item => item?.itemId === itemId && String(item?.quality || 'normal') === quality)
    .reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item?.quantity) || 0)), 0)

const setupContract = async ({ key, owner, partner, ownerItems, partnerItems, fundTopUp = 0 }) => {
  assert.equal((await db.registerUser(owner, 'SmokePass_0601', `${key} owner`)).ok, true, `${key} owner should register`)
  assert.equal((await db.registerUser(partner, 'SmokePass_0601', `${key} partner`)).ok, true, `${key} partner should register`)
  seedSave(owner, ownerItems)
  seedSave(partner, partnerItems)
  const request = await socialRuntime.requestFriendship(owner, { target_username: partner })
  await socialRuntime.acceptFriendRequest(partner, request.id)
  const contractResult = await runtime.createCohabitationContract({
    type: 'lover_cohabitation',
    target_username: partner,
    idempotency_key: `qa-20-2-${key}-contract`,
  }, actor(owner))
  await runtime.acceptCohabitationContract(contractResult.contract.id, actor(partner))
  for (const username of [owner, partner]) {
    await runtime.updateCohabitationPermissions(contractResult.contract.id, {
      target_username: username,
      permissions: {
        storage: {
          deposit: true,
          withdraw_common: true,
          sell_items: true,
        },
        fund: {
          spend_small: true,
          auto_buy_seeds_feed: true,
        },
      },
      idempotency_key: `qa-20-2-${key}-${username}-permissions`,
    }, actor(owner))
  }
  if (fundTopUp > 0) {
    await runtime.contributeCohabitationFund(contractResult.contract.id, {
      amount: fundTopUp,
      purpose: `${key} owner fund top up`,
      idempotency_key: `qa-20-2-${key}-owner-top-up`,
    }, actor(owner))
    await runtime.contributeCohabitationFund(contractResult.contract.id, {
      amount: fundTopUp,
      purpose: `${key} partner fund top up`,
      idempotency_key: `qa-20-2-${key}-partner-top-up`,
    }, actor(partner))
  }
  return contractResult.contract.id
}

const getWarehouseQuantity = async (contractId, username, itemId) => {
  const snapshot = await runtime.getCohabitationWarehouse(contractId, actor(username))
  return snapshot.warehouse.items.find(item => item.item_id === itemId && item.quality === 'normal')?.quantity ?? 0
}

const getFundBalance = async (contractId, username) => {
  const snapshot = await runtime.getCohabitationFund(contractId, actor(username))
  return snapshot.fund.balance
}

const commonItems = quantity => [
  { itemId: 'rice', quantity, quality: 'normal', locked: false },
]

const buildManorSaveData = (username, mode = 'care') => {
  const basePlots = Array.from({ length: 16 }, (_, id) => ({
    id,
    state: 'wasteland',
    cropId: null,
    growthDays: 0,
    watered: false,
    unwateredDays: 0,
    fertilizer: null,
    harvestCount: 0,
    giantCropGroup: null,
    seedGenetics: null,
    infested: false,
    infestedDays: 0,
    weedy: false,
    weedyDays: 0,
  }))
  basePlots[0] = mode === 'steal'
    ? {
        ...basePlots[0],
        state: 'harvestable',
        cropId: 'rice',
        watered: true,
      }
    : {
        ...basePlots[0],
        state: 'growing',
        cropId: 'rice',
        growthDays: 2,
        watered: false,
        unwateredDays: 1,
        infested: true,
        infestedDays: 1,
        weedy: true,
        weedyDays: 1,
      }
  if (mode === 'steal') {
    basePlots[1] = {
      ...basePlots[1],
      state: 'harvestable',
      cropId: 'quest_lotus',
      questItem: true,
      watered: true,
    }
  }
  return {
    meta: {
      saveVersion: 1,
      savedAt: '2026-06-01T00:00:00.000Z',
    },
    savedAt: '2026-06-01T00:00:00.000Z',
    data: {
      player: {
        playerName: username,
        money: 1000,
      },
      game: {
        year: 1,
        season: 'spring',
        day: 12,
      },
      farm: {
        farmSize: 4,
        plots: basePlots,
        fruitTrees: [
          {
            id: 1,
            type: 'peach_tree',
            growthDays: 28,
            mature: true,
            yearAge: 1,
            todayFruit: true,
          },
        ],
        greenhousePlots: [],
        nextFruitTreeId: 2,
      },
      animal: {
        animals: [
          {
            id: 'cow_1',
            type: 'cow',
            name: 'qa cow',
            friendship: 120,
            mood: 80,
            daysOwned: 12,
            daysSinceProduct: 1,
            wasFed: false,
            fedWith: null,
            wasPetted: false,
            hunger: 1,
            sick: true,
            sickDays: 1,
          },
        ],
        pets: [
          {
            id: 'pet_1',
            type: 'dog',
            name: 'qa dog',
            friendship: 80,
            wasPetted: false,
          },
        ],
      },
      fishPond: {
        pond: {
          waterQuality: 45,
          fish: [{ id: 'fish_1', itemId: 'carp' }],
        },
      },
      decoration: {
        placed: {
          flower_box: 3,
        },
      },
      inventory: {
        items: [],
        tempItems: [],
        capacity: 24,
      },
    },
  }
}

const seedManorSave = (username, mode = 'care') => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const preparedSlot = saveRuntime.prepareSlotEntryForSave(
    username,
    0,
    saveRuntime.encryptTaoyuanData(buildManorSaveData(username, mode)),
    1,
  )
  slots.slots[0] = {
    raw: preparedSlot.raw,
    revision: preparedSlot.revision,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

const registerManorUser = async (username, mode = 'care') => {
  assert.equal((await db.registerUser(username, 'SmokePass_0601', username)).ok, true, `${username} should register`)
  seedManorSave(username, mode)
}

const warehouseOutboundOwner = 'qa_20_2_wndo_owner'
const warehouseOutboundPartner = 'qa_20_2_wndo_partner'
const warehouseOutboundContractId = await setupContract({
  key: 'warehouse-outbound-network',
  owner: warehouseOutboundOwner,
  partner: warehouseOutboundPartner,
  ownerItems: commonItems(20),
  partnerItems: commonItems(1),
})
await runtime.depositCohabitationWarehouseItem(warehouseOutboundContractId, {
  item_id: 'rice',
  quantity: 10,
  save_slot: 0,
  idempotency_key: 'qa-20-2-warehouse-outbound-seed',
}, actor(warehouseOutboundOwner))
for (const [index, username] of [warehouseOutboundOwner, warehouseOutboundPartner, warehouseOutboundOwner, warehouseOutboundPartner].entries()) {
  await runtime.withdrawCohabitationWarehouseItem(warehouseOutboundContractId, {
    item_id: 'rice',
    quantity: 1,
    save_slot: 0,
    idempotency_key: `qa-20-2-warehouse-outbound-${index}`,
  }, riskActor(username, 21))
}
const outboundStockBeforeBlock = await getWarehouseQuantity(warehouseOutboundContractId, warehouseOutboundOwner, 'rice')
const outboundOwnerRiceBeforeBlock = inventoryQuantity(warehouseOutboundOwner, 'rice')
await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(warehouseOutboundContractId, {
    item_id: 'rice',
    quantity: 1,
    save_slot: 0,
    idempotency_key: 'qa-20-2-warehouse-outbound-blocked',
  }, riskActor(warehouseOutboundOwner, 21)),
  error => error?.status === 429,
  'cross-device warehouse outbound burst should be rate limited'
)
const outboundWarehouseAfterBlock = await runtime.getCohabitationWarehouse(warehouseOutboundContractId, riskActor(warehouseOutboundOwner, 21))
assert.equal(outboundWarehouseAfterBlock.warehouse.items.find(item => item.item_id === 'rice')?.quantity, outboundStockBeforeBlock, 'blocked cross-device warehouse withdraw should not change shared stock')
assert.equal(inventoryQuantity(warehouseOutboundOwner, 'rice'), outboundOwnerRiceBeforeBlock, 'blocked cross-device warehouse withdraw should not change personal inventory')
assert.ok(outboundWarehouseAfterBlock.warehouse.governance.recent_audits.some(entry => entry.action === 'warehouse_cross_device_brush_blocked'), 'blocked cross-device warehouse withdraw should audit governance')

const warehouseInboundOwner = 'qa_20_2_wndi_owner'
const warehouseInboundPartner = 'qa_20_2_wndi_partner'
const warehouseInboundContractId = await setupContract({
  key: 'warehouse-inbound-network',
  owner: warehouseInboundOwner,
  partner: warehouseInboundPartner,
  ownerItems: commonItems(20),
  partnerItems: commonItems(20),
})
for (const [index, username] of [warehouseInboundOwner, warehouseInboundPartner, warehouseInboundOwner, warehouseInboundPartner].entries()) {
  await runtime.depositCohabitationWarehouseItem(warehouseInboundContractId, {
    item_id: 'rice',
    quantity: 1,
    save_slot: 0,
    idempotency_key: `qa-20-2-warehouse-inbound-${index}`,
  }, riskActor(username, 22))
}
const inboundStockBeforeBlock = await getWarehouseQuantity(warehouseInboundContractId, warehouseInboundOwner, 'rice')
const inboundOwnerRiceBeforeBlock = inventoryQuantity(warehouseInboundOwner, 'rice')
await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(warehouseInboundContractId, {
    item_id: 'rice',
    quantity: 1,
    save_slot: 0,
    idempotency_key: 'qa-20-2-warehouse-inbound-blocked',
  }, riskActor(warehouseInboundOwner, 22)),
  error => error?.status === 429,
  'cross-device warehouse inbound burst should be rate limited'
)
const inboundWarehouseAfterBlock = await runtime.getCohabitationWarehouse(warehouseInboundContractId, riskActor(warehouseInboundOwner, 22))
assert.equal(inboundWarehouseAfterBlock.warehouse.items.find(item => item.item_id === 'rice')?.quantity, inboundStockBeforeBlock, 'blocked cross-device warehouse deposit should not change shared stock')
assert.equal(inventoryQuantity(warehouseInboundOwner, 'rice'), inboundOwnerRiceBeforeBlock, 'blocked cross-device warehouse deposit should not change personal inventory')
assert.ok(inboundWarehouseAfterBlock.warehouse.governance.recent_audits.some(entry => entry.action === 'warehouse_cross_device_brush_blocked'), 'blocked cross-device warehouse deposit should audit governance')

const fundHighFrequencyOwner = 'qa_20_2_fhf_owner'
const fundHighFrequencyPartner = 'qa_20_2_fhf_partner'
const fundHighFrequencyContractId = await setupContract({
  key: 'fund-high-frequency',
  owner: fundHighFrequencyOwner,
  partner: fundHighFrequencyPartner,
  ownerItems: commonItems(1),
  partnerItems: commonItems(1),
  fundTopUp: 1000,
})
for (let index = 0; index < 6; index += 1) {
  await runtime.spendCohabitationFund(fundHighFrequencyContractId, {
    amount: 10,
    purpose: 'seed_budget',
    target_ref: `qa-20-2-fhf:${index}`,
    idempotency_key: `qa-20-2-fhf-spend-${index}`,
  }, riskActor(fundHighFrequencyOwner, 23))
}
const highFrequencyBalanceBeforeBlock = await getFundBalance(fundHighFrequencyContractId, fundHighFrequencyOwner)
await assert.rejects(
  () => runtime.spendCohabitationFund(fundHighFrequencyContractId, {
    amount: 10,
    purpose: 'seed_budget',
    target_ref: 'qa-20-2-fhf:block',
    idempotency_key: 'qa-20-2-fhf-spend-blocked',
  }, riskActor(fundHighFrequencyOwner, 23)),
  error => error?.status === 429,
  'high-frequency shared fund budget spend should be rate limited'
)
const highFrequencyFundAfterBlock = await runtime.getCohabitationFund(fundHighFrequencyContractId, riskActor(fundHighFrequencyOwner, 23))
assert.equal(highFrequencyFundAfterBlock.fund.balance, highFrequencyBalanceBeforeBlock, 'blocked high-frequency fund spend should not change shared balance')
assert.ok(highFrequencyFundAfterBlock.fund.governance.recent_audits.some(entry => entry.action === 'fund_high_frequency_spend_blocked'), 'blocked high-frequency fund spend should audit governance')

const fundNetworkOwner = 'qa_20_2_fnet_owner'
const fundNetworkPartner = 'qa_20_2_fnet_partner'
const fundNetworkContractId = await setupContract({
  key: 'fund-network',
  owner: fundNetworkOwner,
  partner: fundNetworkPartner,
  ownerItems: commonItems(1),
  partnerItems: commonItems(1),
  fundTopUp: 1000,
})
for (const [index, username] of [fundNetworkOwner, fundNetworkPartner, fundNetworkOwner, fundNetworkPartner].entries()) {
  await runtime.spendCohabitationFund(fundNetworkContractId, {
    amount: 10,
    purpose: 'seed_budget',
    target_ref: `qa-20-2-fnet:${index}`,
    idempotency_key: `qa-20-2-fnet-spend-${index}`,
  }, riskActor(username, 24))
}
const networkBalanceBeforeBlock = await getFundBalance(fundNetworkContractId, fundNetworkOwner)
await assert.rejects(
  () => runtime.spendCohabitationFund(fundNetworkContractId, {
    amount: 10,
    purpose: 'seed_budget',
    target_ref: 'qa-20-2-fnet:block',
    idempotency_key: 'qa-20-2-fnet-spend-blocked',
  }, riskActor(fundNetworkOwner, 24)),
  error => error?.status === 429,
  'cross-device shared fund budget spend should be rate limited'
)
const networkFundAfterBlock = await runtime.getCohabitationFund(fundNetworkContractId, riskActor(fundNetworkOwner, 24))
assert.equal(networkFundAfterBlock.fund.balance, networkBalanceBeforeBlock, 'blocked cross-device fund spend should not change shared balance')
assert.ok(networkFundAfterBlock.fund.governance.recent_audits.some(entry => entry.action === 'fund_cross_device_brush_blocked'), 'blocked cross-device fund spend should audit governance')

const manorCareOwner = 'qa_20_2_mcare_owner'
const manorCareVisitors = ['qa_20_2_mcare_a', 'qa_20_2_mcare_b', 'qa_20_2_mcare_c']
await registerManorUser(manorCareOwner, 'care')
for (const username of manorCareVisitors) await registerManorUser(username, 'care')
await manorRuntime.updateManorAccessPolicy(manorCareOwner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'closed',
})
const manorCareSeedActions = [
  [manorCareVisitors[0], 'manor_field', 'water_field'],
  [manorCareVisitors[1], 'manor_field', 'cure_pests'],
  [manorCareVisitors[0], 'manor_field', 'clear_weeds'],
  [manorCareVisitors[1], 'manor_animal_shed', 'feed_animals'],
]
for (const [index, [username, objectId, actionId]] of manorCareSeedActions.entries()) {
  await manorRuntime.submitManorCareAction({
    target_username: manorCareOwner,
    object_id: objectId,
    action_id: actionId,
    idempotency_key: `qa-20-2-manor-care-${index}`,
  }, riskActor(username, 31))
}
const manorCareSnapshotBeforeBlock = await manorRuntime.getPublicManorSnapshot(manorCareOwner, manorCareVisitors[2])
const manorCareEntryCountBeforeBlock = manorCareSnapshotBeforeBlock.care_entries.length
const manorCareRewardBeforeBlock = inventoryQuantity(manorCareVisitors[2], 'manor_edge_bundle')
assert.ok(
  manorCareSnapshotBeforeBlock.care_state.audit.suspicious_networks.some(entry => entry.interaction_kind === 'care'),
  'manor care snapshot should expose suspicious same IP/device clusters'
)
await assert.rejects(
  () => manorRuntime.submitManorCareAction({
    target_username: manorCareOwner,
    object_id: 'manor_fruit_grove',
    action_id: 'collect_drops',
    idempotency_key: 'qa-20-2-manor-care-blocked',
  }, riskActor(manorCareVisitors[2], 31)),
  error => error?.status === 429,
  'cross-device manor care burst should be rate limited'
)
const manorCareSnapshotAfterBlock = await manorRuntime.getPublicManorSnapshot(manorCareOwner, manorCareVisitors[2])
assert.equal(manorCareSnapshotAfterBlock.care_entries.length, manorCareEntryCountBeforeBlock, 'blocked manor care should not add care entries')
assert.equal(inventoryQuantity(manorCareVisitors[2], 'manor_edge_bundle'), manorCareRewardBeforeBlock, 'blocked manor care should not grant visitor reward items')
assert.ok(
  manorCareSnapshotAfterBlock.care_state.audit.recent_governance_events.some(entry => entry.action === 'manor_cross_device_brush_blocked'),
  'blocked cross-device manor care should audit governance'
)

const manorStealOwner = 'qa_20_2_msteal_owner'
const manorStealVisitors = ['qa_20_2_msteal_a', 'qa_20_2_msteal_b', 'qa_20_2_msteal_c']
await registerManorUser(manorStealOwner, 'steal')
for (const username of manorStealVisitors) await registerManorUser(username, 'steal')
await manorRuntime.updateManorAccessPolicy(manorStealOwner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'public',
})
const manorStealFarmBeforeBlock = JSON.stringify(readGameplayData(manorStealOwner)?.farm || {})
const manorStealSeedActions = [
  [manorStealVisitors[0], 'manor_field', 'steal_plot_sample', 'plot:0'],
  [manorStealVisitors[1], 'manor_fruit_grove', 'steal_fruit_sample', 'fruit:1'],
  [manorStealVisitors[0], 'manor_flower_bed', 'steal_edge_bundle', ''],
]
for (const [index, [username, objectId, actionId, targetId]] of manorStealSeedActions.entries()) {
  await manorRuntime.submitManorStealAction({
    target_username: manorStealOwner,
    object_id: objectId,
    action_id: actionId,
    target_id: targetId,
    idempotency_key: `qa-20-2-manor-steal-${index}`,
  }, riskActor(username, 32))
}
const manorStealSnapshotBeforeBlock = await manorRuntime.getPublicManorSnapshot(manorStealOwner, manorStealVisitors[2])
const manorStealEntryCountBeforeBlock = manorStealSnapshotBeforeBlock.steal_entries.length
assert.ok(
  manorStealSnapshotBeforeBlock.steal_state.audit.suspicious_networks.some(entry => entry.interaction_kind === 'steal'),
  'manor steal snapshot should expose suspicious same IP/device clusters'
)
await assert.rejects(
  () => manorRuntime.submitManorStealAction({
    target_username: manorStealOwner,
    object_id: 'manor_field',
    action_id: 'steal_plot_sample',
    target_id: 'plot:0',
    idempotency_key: 'qa-20-2-manor-steal-blocked',
  }, riskActor(manorStealVisitors[2], 32)),
  error => error?.status === 429,
  'cross-device manor steal burst should be rate limited before object caps'
)
const manorStealSnapshotAfterBlock = await manorRuntime.getPublicManorSnapshot(manorStealOwner, manorStealVisitors[2])
assert.equal(manorStealSnapshotAfterBlock.steal_entries.length, manorStealEntryCountBeforeBlock, 'blocked manor steal should not add steal entries')
assert.equal(JSON.stringify(readGameplayData(manorStealOwner)?.farm || {}), manorStealFarmBeforeBlock, 'blocked manor steal should not mutate owner farm data')
assert.ok(
  manorStealSnapshotAfterBlock.steal_state.audit.recent_governance_events.some(entry => entry.action === 'manor_cross_device_brush_blocked'),
  'blocked cross-device manor steal should audit governance'
)

console.log('[qa-anomaly-detection-20-2] OK')
