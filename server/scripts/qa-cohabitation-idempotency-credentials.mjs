import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-cohabitation-idempotency-credentials')
const storageFile = path.join(tempDir, '.storage.json')
const contractStoreFile = path.join(tempDir, 'taoyuan_cohabitation_contracts.json')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const socialRuntime = require('../src/taoyuanSocialRuntime')
const runtime = require('../src/taoyuanCohabitationRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const actor = username => ({ username, displayName: username })

const createFarmPlots = () => {
  const plots = Array.from({ length: 16 }, (_, id) => ({
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
  plots[0] = { ...plots[0], state: 'tilled' }
  plots[1] = {
    ...plots[1],
    state: 'planted',
    cropId: 'cabbage',
    growthDays: 1,
    watered: true,
  }
  plots[2] = {
    ...plots[2],
    state: 'harvestable',
    cropId: 'cabbage',
    growthDays: 3,
    watered: true,
  }
  return plots
}

const buildSaveData = username => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-05-31T00:00:00.000Z',
  },
  savedAt: '2026-05-31T00:00:00.000Z',
  data: {
    player: {
      playerName: username,
      money: 5000,
    },
    game: {
      year: 1,
      season: 'spring',
      day: 12,
    },
    farm: {
      farmSize: 4,
      plots: createFarmPlots(),
      greenhousePlots: [],
      fruitTrees: [],
      nextFruitTreeId: 0,
    },
    inventory: {
      items: [
        { itemId: 'rice', quantity: 20, quality: 'normal', locked: false },
        { itemId: 'seed_cabbage', quantity: 5, quality: 'normal', locked: false },
        { itemId: 'basic_fertilizer', quantity: 5, quality: 'normal', locked: false },
      ],
      tempItems: [],
      capacity: 40,
    },
    home: {
      farmhouseLevel: 3,
      caveChoice: 'none',
      caveUnlocked: false,
      greenhouseUnlocked: false,
      cellarSlots: [],
      homeRenovationStates: {},
    },
    decoration: {
      owned: {},
      placed: {},
    },
    animal: {
      animals: [],
      pets: [],
    },
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

const readGameplayData = username => {
  const raw = saveRuntime.loadUserSaveSlots(username).slots[0].raw
  return saveRuntime.normalizeGameplaySaveContainer(saveRuntime.decryptTaoyuanRaw(raw))?.gameplayData
}

const getInventoryItemQuantity = (username, itemId, quality = 'normal') =>
  (readGameplayData(username)?.inventory?.items || [])
    .filter(entry => entry?.itemId === itemId && String(entry?.quality || 'normal') === quality)
    .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)

const warehouseItemQuantity = (warehouse, itemId, quality = 'normal') =>
  (warehouse?.items || [])
    .filter(entry => entry?.item_id === itemId && String(entry?.quality || 'normal') === quality)
    .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)

const mutateStoredContract = async (contractId, mutate) => {
  const raw = JSON.parse(await readFile(contractStoreFile, 'utf8'))
  const contract = raw.contracts.find(entry => entry.id === contractId)
  assert.ok(contract, `contract ${contractId} should exist in store`)
  mutate(contract)
  await writeFile(contractStoreFile, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
}

const mutateStoredSeparationPreview = async (contractId, previewId, mutate) => {
  await mutateStoredContract(contractId, contract => {
    const preview = contract.separation_previews.find(entry => entry.id === previewId)
    assert.ok(preview, `preview ${previewId} should exist in store`)
    mutate(preview)
  })
}

const createActiveContract = async (prefix, { type = 'lover_cohabitation' } = {}) => {
  const owner = `qa_idem_${prefix}_o`
  const partner = `qa_idem_${prefix}_p`
  assert.equal((await db.registerUser(owner, 'SmokePass_123', owner)).ok, true, `${owner} should register`)
  assert.equal((await db.registerUser(partner, 'SmokePass_123', partner)).ok, true, `${partner} should register`)
  seedSave(owner)
  seedSave(partner)
  const request = await socialRuntime.requestFriendship(owner, { target_username: partner })
  await socialRuntime.acceptFriendRequest(partner, request.id)
  const created = await runtime.createCohabitationContract({
    type,
    target_username: partner,
    idempotency_key: `qa-${prefix}-contract`,
  }, actor(owner))
  await runtime.acceptCohabitationContract(created.contract.id, actor(partner))
  return { contractId: created.contract.id, owner, partner }
}

const injectSharedWarehouseDepositLedger = async (contractId, {
  itemId,
  quantity,
  quality = 'normal',
  sourceUsername,
  ledgerId,
  idempotencyKey,
}) => mutateStoredContract(contractId, contract => {
  const sourceOwnerKey = sourceUsername.toLowerCase()
  const sourceSaveId = 123450000 + Math.floor(Math.random() * 10000)
  contract.shared_warehouse = contract.shared_warehouse || {}
  const ledger = Array.isArray(contract.shared_warehouse.ledger)
    ? contract.shared_warehouse.ledger.filter(entry => entry?.id !== ledgerId)
    : []
  contract.shared_warehouse.ledger = [
    {
      id: ledgerId,
      action: 'deposit',
      item_id: itemId,
      quantity,
      quality,
      actor_username: sourceUsername,
      actor_display_name: sourceUsername,
      source_owner_id: `save:${sourceSaveId}`,
      source_owner_username: sourceUsername,
      source_owner_display_name: sourceUsername,
      source_owner_key: sourceOwnerKey,
      source_save_id: sourceSaveId,
      source_save_slot: 0,
      source_save_revision: 1,
      source_inventory: 'inventory.items',
      source_slots: [{ index: 0, quantity }],
      target_inventory: 'shared_warehouse.items',
      at: 1772400000,
      idempotency_key: idempotencyKey,
      operation_id: idempotencyKey,
      reversible: true,
      compensation_hint: 'QA injected shared warehouse stock',
      status: 'committed',
    },
    ...ledger,
  ]
  contract.origin_assets = contract.origin_assets || {}
  contract.origin_assets.warehouse_items = [
    {
      ledger_id: ledgerId,
      action: 'deposit',
      item_id: itemId,
      quantity,
      quality,
      origin_owner_id: `save:${sourceSaveId}`,
      origin_owner_username: sourceUsername,
      origin_owner_key: sourceOwnerKey,
      source_save_id: sourceSaveId,
      source_save_slot: 0,
      source_inventory: 'inventory.items',
      deposited_at: 1772400000,
      idempotency_key: idempotencyKey,
    },
    ...(Array.isArray(contract.origin_assets.warehouse_items)
      ? contract.origin_assets.warehouse_items.filter(entry => entry?.ledger_id !== ledgerId)
      : []),
  ]
})

const testWarehouseOperationIds = async () => {
  const { contractId, owner } = await createActiveContract('wh')
  await runtime.updateCohabitationPermissions(contractId, {
    target_username: owner,
    permissions: {
      storage: { sell_items: true },
    },
    idempotency_key: 'qa-wh-enable-sell',
  }, actor(owner))

  const ownerRiceBeforeDeposit = getInventoryItemQuantity(owner, 'rice')
  const deposit = await runtime.depositCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 3,
    quality: 'normal',
    idempotency_key: 'qa-wh-deposit-request-a',
    operation_id: 'qa-wh-deposit-operation',
  }, actor(owner))
  const depositReplay = await runtime.depositCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 3,
    quality: 'normal',
    idempotency_key: 'qa-wh-deposit-request-b',
    operation_id: 'qa-wh-deposit-operation',
  }, actor(owner))
  assert.equal(depositReplay.idempotent, true, 'warehouse deposit should replay by operation_id')
  assert.equal(depositReplay.ledger_entry.id, deposit.ledger_entry.id, 'deposit replay should return original ledger')
  assert.equal(getInventoryItemQuantity(owner, 'rice'), ownerRiceBeforeDeposit - 3, 'deposit replay should not deduct personal inventory twice')
  assert.equal(warehouseItemQuantity(depositReplay.warehouse, 'rice'), 3, 'deposit replay should not duplicate warehouse stock')

  const withdraw = await runtime.withdrawCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-wh-withdraw-request-a',
    operation_id: 'qa-wh-withdraw-operation',
  }, actor(owner))
  const ownerRiceAfterWithdraw = getInventoryItemQuantity(owner, 'rice')
  const withdrawReplay = await runtime.withdrawCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-wh-withdraw-request-b',
    operation_id: 'qa-wh-withdraw-operation',
  }, actor(owner))
  assert.equal(withdrawReplay.idempotent, true, 'warehouse withdraw should replay by operation_id')
  assert.equal(withdrawReplay.ledger_entry.id, withdraw.ledger_entry.id, 'withdraw replay should return original ledger')
  assert.equal(getInventoryItemQuantity(owner, 'rice'), ownerRiceAfterWithdraw, 'withdraw replay should not add personal inventory twice')
  assert.equal(warehouseItemQuantity(withdrawReplay.warehouse, 'rice'), 2, 'withdraw replay should not deduct warehouse stock twice')

  const fundBeforeSell = (await runtime.getCohabitationFund(contractId, actor(owner))).fund.balance
  const sell = await runtime.sellCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-wh-sell-request-a',
    operation_id: 'qa-wh-sell-operation',
  }, actor(owner))
  const sellReplay = await runtime.sellCohabitationWarehouseItem(contractId, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-wh-sell-request-b',
    operation_id: 'qa-wh-sell-operation',
  }, actor(owner))
  assert.equal(sellReplay.idempotent, true, 'warehouse sell should replay by operation_id')
  assert.equal(sellReplay.ledger_entry.id, sell.ledger_entry.id, 'sell replay should return original warehouse ledger')
  assert.equal(sellReplay.fund_ledger_entry.id, sell.fund_ledger_entry.id, 'sell replay should return original fund ledger')
  assert.equal(sellReplay.fund.balance, fundBeforeSell + sell.sale.total_amount, 'sell replay should not credit fund twice')
  assert.equal(warehouseItemQuantity(sellReplay.warehouse, 'rice'), 1, 'sell replay should not deduct warehouse stock twice')
}

const testSharedFarmOperationIds = async () => {
  const { contractId, owner } = await createActiveContract('farm')
  await runtime.depositCohabitationWarehouseItem(contractId, {
    item_id: 'seed_cabbage',
    quantity: 2,
    idempotency_key: 'qa-farm-seed-deposit',
    operation_id: 'qa-farm-seed-deposit-op',
  }, actor(owner))
  await runtime.depositCohabitationWarehouseItem(contractId, {
    item_id: 'basic_fertilizer',
    quantity: 2,
    idempotency_key: 'qa-farm-fertilizer-deposit',
    operation_id: 'qa-farm-fertilizer-deposit-op',
  }, actor(owner))

  const sharedMap = (await runtime.getCohabitationSharedMap(contractId, actor(owner))).shared_map
  const tilledPlot = sharedMap.plots.find(plot =>
    plot.origin_owner_username === owner && Number(plot.source_plot_id) === 0
  )
  const plantedPlot = sharedMap.plots.find(plot =>
    plot.origin_owner_username === owner && Number(plot.source_plot_id) === 1
  )
  const harvestablePlot = sharedMap.plots.find(plot =>
    plot.origin_owner_username === owner && Number(plot.source_plot_id) === 2
  )
  assert.ok(tilledPlot?.id, 'tilled shared plot should exist')
  assert.ok(plantedPlot?.id, 'planted shared plot should exist')
  assert.ok(harvestablePlot?.id, 'harvestable shared plot should exist')

  const plant = await runtime.plantCohabitationSharedFarmPlot(contractId, {
    plot_id: tilledPlot.id,
    seed_item_id: 'seed_cabbage',
    idempotency_key: 'qa-farm-plant-request-a',
    operation_id: 'qa-farm-plant-operation',
  }, actor(owner))
  const plantReplay = await runtime.plantCohabitationSharedFarmPlot(contractId, {
    plot_id: tilledPlot.id,
    seed_item_id: 'seed_cabbage',
    idempotency_key: 'qa-farm-plant-request-b',
    operation_id: 'qa-farm-plant-operation',
  }, actor(owner))
  assert.equal(plantReplay.idempotent, true, 'shared farm plant should replay by operation_id')
  assert.equal(plantReplay.ledger_entry.id, plant.ledger_entry.id, 'plant replay should return original farm ledger')
  assert.equal(warehouseItemQuantity(plantReplay.warehouse, 'seed_cabbage'), 1, 'plant replay should not consume seed twice')

  const fertilize = await runtime.fertilizeCohabitationSharedFarmPlot(contractId, {
    plot_id: plantedPlot.id,
    fertilizer_item_id: 'basic_fertilizer',
    idempotency_key: 'qa-farm-fertilize-request-a',
    operation_id: 'qa-farm-fertilize-operation',
  }, actor(owner))
  const fertilizeReplay = await runtime.fertilizeCohabitationSharedFarmPlot(contractId, {
    plot_id: plantedPlot.id,
    fertilizer_item_id: 'basic_fertilizer',
    idempotency_key: 'qa-farm-fertilize-request-b',
    operation_id: 'qa-farm-fertilize-operation',
  }, actor(owner))
  assert.equal(fertilizeReplay.idempotent, true, 'shared farm fertilize should replay by operation_id')
  assert.equal(fertilizeReplay.ledger_entry.id, fertilize.ledger_entry.id, 'fertilize replay should return original farm ledger')
  assert.equal(warehouseItemQuantity(fertilizeReplay.warehouse, 'basic_fertilizer'), 1, 'fertilize replay should not consume fertilizer twice')

  const cabbageBeforeHarvest = warehouseItemQuantity(fertilizeReplay.warehouse, 'cabbage')
  const harvest = await runtime.harvestCohabitationSharedFarmPlot(contractId, {
    plot_id: harvestablePlot.id,
    idempotency_key: 'qa-farm-harvest-request-a',
    operation_id: 'qa-farm-harvest-operation',
  }, actor(owner))
  const harvestReplay = await runtime.harvestCohabitationSharedFarmPlot(contractId, {
    plot_id: harvestablePlot.id,
    idempotency_key: 'qa-farm-harvest-request-b',
    operation_id: 'qa-farm-harvest-operation',
  }, actor(owner))
  assert.equal(harvestReplay.idempotent, true, 'shared farm harvest should replay by operation_id')
  assert.equal(harvestReplay.ledger_entry.id, harvest.ledger_entry.id, 'harvest replay should return original farm ledger')
  assert.equal(
    warehouseItemQuantity(harvestReplay.warehouse, 'cabbage'),
    cabbageBeforeHarvest + harvest.warehouse_ledger_entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
    'harvest replay should not deposit crop output twice'
  )
}

const testHighValueWarehouseOperationIds = async () => {
  const { contractId, owner, partner } = await createActiveContract('hv')
  await injectSharedWarehouseDepositLedger(contractId, {
    itemId: 'lotus',
    quantity: 2,
    quality: 'fine',
    sourceUsername: partner,
    ledgerId: 'qa_hv_lotus_deposit',
    idempotencyKey: 'qa-hv-lotus-deposit',
  })
  await runtime.updateCohabitationPermissions(contractId, {
    target_username: owner,
    permissions: {
      storage: { withdraw_high_quality: true, withdraw_rare: true },
    },
    idempotency_key: 'qa-hv-owner-permission',
  }, actor(owner))
  await runtime.updateCohabitationPermissions(contractId, {
    target_username: partner,
    permissions: {
      storage: { withdraw_high_quality: true, withdraw_rare: true },
    },
    idempotency_key: 'qa-hv-partner-permission',
  }, actor(owner))

  const draft = await runtime.createCohabitationWarehouseHighValueWithdrawalDraft(contractId, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    reason: 'qa high value draft',
    idempotency_key: 'qa-hv-draft-request-a',
    operation_id: 'qa-hv-draft-operation',
  }, actor(owner))
  const draftReplay = await runtime.createCohabitationWarehouseHighValueWithdrawalDraft(contractId, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    reason: 'qa high value draft replay',
    idempotency_key: 'qa-hv-draft-request-b',
    operation_id: 'qa-hv-draft-operation',
  }, actor(owner))
  assert.equal(draftReplay.idempotent, true, 'high-value draft should replay by operation_id')
  assert.equal(draftReplay.draft.id, draft.draft.id, 'draft replay should return original draft')
  assert.equal(draftReplay.warehouse.summary.frozen_quantity, 1, 'draft replay should not freeze stock twice')

  const confirm = await runtime.confirmCohabitationWarehouseHighValueWithdrawalDraft(contractId, draft.draft.id, {
    confirmation_text: 'qa confirm high value draft',
    freeze_acknowledged: true,
    rollback_plan_acknowledged: true,
    idempotency_key: 'qa-hv-confirm-request-a',
    operation_id: 'qa-hv-confirm-operation',
  }, actor(partner))
  const confirmReplay = await runtime.confirmCohabitationWarehouseHighValueWithdrawalDraft(contractId, draft.draft.id, {
    confirmation_text: 'qa confirm high value draft replay',
    freeze_acknowledged: true,
    rollback_plan_acknowledged: true,
    idempotency_key: 'qa-hv-confirm-request-b',
    operation_id: 'qa-hv-confirm-operation',
  }, actor(partner))
  assert.equal(confirmReplay.idempotent, true, 'high-value confirm should replay by operation_id')
  assert.equal(confirmReplay.draft.id, confirm.draft.id, 'confirm replay should return original draft')
  assert.equal(confirmReplay.draft.state, 'ready_to_execute', 'confirm replay should keep draft ready')

  const ownerLotusBeforeExecute = getInventoryItemQuantity(owner, 'lotus', 'fine')
  const execute = await runtime.executeCohabitationWarehouseHighValueWithdrawalDraft(contractId, draft.draft.id, {
    expected_state: 'ready_to_execute',
    idempotency_key: 'qa-hv-execute-request-a',
    operation_id: 'qa-hv-execute-operation',
  }, actor(owner))
  const executeReplay = await runtime.executeCohabitationWarehouseHighValueWithdrawalDraft(contractId, draft.draft.id, {
    expected_state: 'ready_to_execute',
    idempotency_key: 'qa-hv-execute-request-b',
    operation_id: 'qa-hv-execute-operation',
  }, actor(owner))
  assert.equal(executeReplay.idempotent, true, 'high-value execute should replay by operation_id')
  assert.equal(executeReplay.ledger_entries[0].id, execute.ledger_entries[0].id, 'execute replay should return original withdraw ledger')
  assert.equal(getInventoryItemQuantity(owner, 'lotus', 'fine'), ownerLotusBeforeExecute + 1, 'execute replay should not add high-value stock twice')
  assert.equal(warehouseItemQuantity(executeReplay.warehouse, 'lotus', 'fine'), 1, 'execute replay should not deduct high-value warehouse stock twice')

  const rollbackDraft = await runtime.createCohabitationWarehouseHighValueWithdrawalDraft(contractId, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    reason: 'qa rollback high value draft',
    idempotency_key: 'qa-hv-rollback-draft-request-a',
    operation_id: 'qa-hv-rollback-draft-operation',
  }, actor(owner))
  const rollback = await runtime.rollbackCohabitationWarehouseHighValueWithdrawalDraft(contractId, rollbackDraft.draft.id, {
    reason: 'qa rollback before execute',
    idempotency_key: 'qa-hv-rollback-request-a',
    operation_id: 'qa-hv-rollback-operation',
  }, actor(owner))
  const rollbackReplay = await runtime.rollbackCohabitationWarehouseHighValueWithdrawalDraft(contractId, rollbackDraft.draft.id, {
    reason: 'qa rollback replay before execute',
    idempotency_key: 'qa-hv-rollback-request-b',
    operation_id: 'qa-hv-rollback-operation',
  }, actor(owner))
  assert.equal(rollbackReplay.idempotent, true, 'high-value rollback should replay by operation_id')
  assert.equal(rollbackReplay.draft.id, rollback.draft.id, 'rollback replay should return original draft')
  assert.equal(rollbackReplay.warehouse.summary.frozen_quantity, 0, 'rollback replay should not change frozen stock twice')
  assert.equal(warehouseItemQuantity(rollbackReplay.warehouse, 'lotus', 'fine'), 1, 'rollback replay should not consume high-value warehouse stock')
}

const testFundConsumptionIds = async () => {
  const { contractId, owner, partner } = await createActiveContract('fund')
  await runtime.updateCohabitationPermissions(contractId, {
    target_username: owner,
    permissions: {
      fund: { spend_large: true },
    },
    idempotency_key: 'qa-fund-owner-large-permission',
  }, actor(owner))
  await runtime.contributeCohabitationFund(contractId, {
    amount: 2000,
    purpose: 'qa fund seed',
    idempotency_key: 'qa-fund-owner-contribution',
  }, actor(owner))

  const balanceBeforeSpend = (await runtime.getCohabitationFund(contractId, actor(owner))).fund.balance
  const spend = await runtime.spendCohabitationFund(contractId, {
    amount: 40,
    purpose: 'tool_repair',
    target_ref: 'tool:hoe',
    idempotency_key: 'qa-fund-spend-request-a',
    consumption_id: 'qa-fund-spend-consumption',
  }, actor(owner))
  const spendReplay = await runtime.spendCohabitationFund(contractId, {
    amount: 40,
    purpose: 'tool_repair',
    target_ref: 'tool:hoe',
    idempotency_key: 'qa-fund-spend-request-b',
    consumption_id: 'qa-fund-spend-consumption',
  }, actor(owner))
  assert.equal(spendReplay.idempotent, true, 'fund spend should replay by consumption_id')
  assert.equal(spendReplay.ledger_entry.id, spend.ledger_entry.id, 'fund spend replay should return original ledger')
  assert.equal(spendReplay.fund.balance, balanceBeforeSpend - 40, 'fund spend replay should not deduct balance twice')

  const warehouseBeforeShop = await runtime.getCohabitationWarehouse(contractId, actor(owner))
  const seedBeforeShop = warehouseItemQuantity(warehouseBeforeShop.warehouse, 'seed_cabbage')
  const shop = await runtime.purchaseCohabitationSharedFundShopItem(contractId, {
    target_ref: 'shop:seed_cabbage',
    quantity: 2,
    amount: 20,
    purpose: 'seed_budget',
    idempotency_key: 'qa-fund-shop-request-a',
    consumption_id: 'qa-fund-shop-consumption',
  }, actor(owner))
  const shopReplay = await runtime.purchaseCohabitationSharedFundShopItem(contractId, {
    target_ref: 'shop:seed_cabbage',
    quantity: 2,
    amount: 20,
    purpose: 'seed_budget',
    idempotency_key: 'qa-fund-shop-request-b',
    consumption_id: 'qa-fund-shop-consumption',
  }, actor(owner))
  assert.equal(shopReplay.idempotent, true, 'shared fund shop purchase should replay by consumption_id')
  assert.equal(shopReplay.fund_ledger_entry.id, shop.fund_ledger_entry.id, 'shop replay should return original fund ledger')
  assert.equal(shopReplay.warehouse_ledger_entry.id, shop.warehouse_ledger_entry.id, 'shop replay should return original warehouse ledger')
  assert.equal(warehouseItemQuantity(shopReplay.warehouse, 'seed_cabbage'), seedBeforeShop + 2, 'shop replay should not duplicate warehouse stock')

  const balanceBeforeLarge = (await runtime.getCohabitationFund(contractId, actor(owner))).fund.balance
  const largeDraft = await runtime.createCohabitationFundLargeSpendDraft(contractId, {
    amount: 1300,
    purpose: 'family_building',
    target_ref: 'family_building:shared_granary:qa-idempotency',
    memo: 'qa large fund idempotency draft',
    idempotency_key: 'qa-fund-large-draft',
  }, actor(owner))
  await runtime.confirmCohabitationFundLargeSpendDraft(contractId, largeDraft.draft.id, {
    memo: 'qa partner confirms large draft',
    idempotency_key: 'qa-fund-large-partner-confirm',
  }, actor(partner))
  const largeExecute = await runtime.executeCohabitationFundLargeSpendDraft(contractId, largeDraft.draft.id, {
    memo: 'qa execute large draft',
    idempotency_key: 'qa-fund-large-execute-request-a',
    consumption_id: 'qa-fund-large-consumption',
  }, actor(owner))
  const largeExecuteReplay = await runtime.executeCohabitationFundLargeSpendDraft(contractId, largeDraft.draft.id, {
    memo: 'qa execute large draft replay',
    idempotency_key: 'qa-fund-large-execute-request-b',
    consumption_id: 'qa-fund-large-consumption',
  }, actor(owner))
  assert.equal(largeExecuteReplay.idempotent, true, 'large fund execute should replay by consumption_id')
  assert.equal(largeExecuteReplay.ledger_entry.id, largeExecute.ledger_entry.id, 'large execute replay should return original fund ledger')
  assert.equal(largeExecuteReplay.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'large execute replay should return original building ledger')
  assert.equal(largeExecuteReplay.fund.balance, balanceBeforeLarge - 1300, 'large execute replay should not deduct balance twice')
}

const testSeparationVersionKeys = async () => {
  const { contractId, owner, partner } = await createActiveContract('sep')
  const preview = await runtime.createSeparationPreview(contractId, {
    reason: 'qa separation version idempotency',
    idempotency_key: 'qa-sep-preview',
  }, actor(owner))

  const ownerConfirm = await runtime.confirmSeparationPreview(contractId, preview.preview.id, {
    memo: 'owner confirms',
    idempotency_key: 'qa-sep-owner-confirm-request-a',
  }, actor(owner))
  const ownerConfirmReplay = await runtime.confirmSeparationPreview(contractId, preview.preview.id, {
    memo: 'owner confirms replay',
    idempotency_key: 'qa-sep-owner-confirm-request-b',
  }, actor(owner))
  assert.equal(ownerConfirmReplay.idempotent, true, 'separation confirm should replay by contract/version/member')
  assert.equal(
    ownerConfirmReplay.preview.confirmation_state.confirmation_events.length,
    ownerConfirm.preview.confirmation_state.confirmation_events.length,
    'separation confirm replay should not append confirmation events'
  )

  await runtime.confirmSeparationPreview(contractId, preview.preview.id, {
    memo: 'partner confirms',
    idempotency_key: 'qa-sep-partner-confirm',
  }, actor(partner))

  await mutateStoredSeparationPreview(contractId, preview.preview.id, entry => {
    const now = Math.floor(Date.now() / 1000)
    entry.confirm_after_at = now - 60
    entry.expires_at = now + 3600
    entry.confirmation_state = {
      ...(entry.confirmation_state || {}),
      confirm_after_at: now - 60,
      expires_at: now + 3600,
      can_execute_now: false,
      execution_enabled: false,
    }
  })

  const request = await runtime.requestSeparationExecution(contractId, preview.preview.id, {
    memo: 'request execution',
    idempotency_key: 'qa-sep-request-exec-request-a',
  }, actor(owner))
  const requestReplay = await runtime.requestSeparationExecution(contractId, preview.preview.id, {
    memo: 'request execution replay',
    idempotency_key: 'qa-sep-request-exec-request-b',
  }, actor(owner))
  assert.equal(requestReplay.idempotent, true, 'separation execution request should replay by contract/version/phase')
  assert.equal(requestReplay.execution_request.id, request.execution_request.id, 'execution request replay should return original request')

  const execute = await runtime.executeSeparationAssetReturn(contractId, preview.preview.id, {
    execution_request_id: request.execution_request.id,
    plot_return_manifest_hash: request.preview.asset_return.plot_return_manifest_hash,
    memo: 'record asset return',
    idempotency_key: 'qa-sep-asset-return-request-a',
  }, actor(owner))
  const executeReplay = await runtime.executeSeparationAssetReturn(contractId, preview.preview.id, {
    execution_request_id: request.execution_request.id,
    plot_return_manifest_hash: request.preview.asset_return.plot_return_manifest_hash,
    memo: 'record asset return replay',
    idempotency_key: 'qa-sep-asset-return-request-b',
  }, actor(owner))
  assert.equal(executeReplay.idempotent, true, 'separation asset return should replay by contract/version/phase')
  assert.equal(executeReplay.execution_ledger.id, execute.execution_ledger.id, 'asset return replay should return original ledger')
}

await testWarehouseOperationIds()
await testSharedFarmOperationIds()
await testHighValueWarehouseOperationIds()
await testFundConsumptionIds()
await testSeparationVersionKeys()

console.log('[qa-cohabitation-idempotency-credentials] OK')
