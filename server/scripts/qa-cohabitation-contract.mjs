import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-cohabitation-contract')
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
const coopOrderRuntime = require('../src/taoyuanCoopOrderRuntime')
const runtime = require('../src/taoyuanCohabitationRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const owner = 'cohabit_owner_0524'
const partner = 'cohabit_partner_0524'
const extra = 'cohabit_extra_0524'
const fourth = 'cohabit_fourth_0524'

const actor = username => ({
  username,
  displayName: username,
})

const createFarmPlots = username => {
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
  if (username === owner) {
    plots[0] = {
      ...plots[0],
      state: 'growing',
      cropId: 'rice',
      growthDays: 2,
      watered: false,
      unwateredDays: 1,
      infested: true,
      infestedDays: 1,
    }
    plots[1] = {
      ...plots[1],
      state: 'tilled',
    }
  }
  if (username === partner) {
    plots[5] = {
      ...plots[5],
      state: 'harvestable',
      cropId: 'tea',
      growthDays: 6,
      watered: true,
      harvestCount: 1,
    }
    plots[6] = {
      ...plots[6],
      state: 'growing',
      cropId: 'lotus',
      growthDays: 3,
      watered: false,
      weedy: true,
      weedyDays: 1,
    }
  }
  return plots
}

const buildSaveData = username => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-05-24T00:00:00.000Z',
  },
  savedAt: '2026-05-24T00:00:00.000Z',
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
      plots: createFarmPlots(username),
      fruitTrees: [],
      greenhousePlots: [],
    },
    inventory: {
      items: username.includes('_lg_')
        ? [
            { itemId: 'wood', quantity: 40, quality: 'normal', locked: false },
            { itemId: 'rice', quantity: 20, quality: 'normal', locked: false },
          ]
        : username === owner
        ? [
            { itemId: 'rice', quantity: 6, quality: 'normal', locked: false },
            { itemId: 'ancient_waybill', quantity: 1, quality: 'normal', locked: false },
          ]
        : username === partner
          ? [
              { itemId: 'tea', quantity: 4, quality: 'normal', locked: false },
              { itemId: 'lotus', quantity: 1, quality: 'fine', locked: false },
            ]
          : [
              { itemId: 'rice', quantity: 1, quality: 'normal', locked: false },
            ],
      tempItems: [],
      capacity: 24,
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

const mutateStoredSeparationPreview = async (contractId, previewId, mutate) => {
  const raw = JSON.parse(await readFile(contractStoreFile, 'utf8'))
  const contract = raw.contracts.find(entry => entry.id === contractId)
  assert.ok(contract, 'contract should exist in cohabitation store')
  const preview = contract.separation_previews.find(entry => entry.id === previewId)
  assert.ok(preview, 'separation preview should exist in cohabitation store')
  mutate(preview)
  await writeFile(contractStoreFile, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
}

const getInventoryItemQuantity = (username, itemId, quality = 'normal') => {
  const data = readGameplayData(username)
  return (data?.inventory?.items || [])
    .filter(entry => entry?.itemId === itemId && String(entry?.quality || 'normal') === quality)
    .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
}

await db.registerUser(owner, 'SmokePass_0524', '同居主人')
await db.registerUser(partner, 'SmokePass_0524', '同居伙伴')
await db.registerUser(extra, 'SmokePass_0524', '同居额外成员')
await db.registerUser(fourth, 'SmokePass_0524', '同居第四成员')
seedSave(owner)
seedSave(partner)
seedSave(extra)
seedSave(fourth)

const partnerRequest = await socialRuntime.requestFriendship(owner, { target_username: partner })
await socialRuntime.acceptFriendRequest(partner, partnerRequest.id)
const extraRequest = await socialRuntime.requestFriendship(owner, { target_username: extra })
await socialRuntime.acceptFriendRequest(extra, extraRequest.id)
const fourthRequest = await socialRuntime.requestFriendship(owner, { target_username: fourth })
await socialRuntime.acceptFriendRequest(fourth, fourthRequest.id)

const overview = await runtime.listCohabitationContracts(owner)
assert.ok(overview.relation_options.find(option => option.id === 'lover_cohabitation'), 'relation options should expose lover contract type')
assert.equal(overview.relation_options.find(option => option.id === 'oath_manor')?.family_role_management, true, 'oath manor should expose family role management capability')
assert.equal(overview.summary.total, 0, 'fresh store should have no contracts')

const created = await runtime.createCohabitationContract({
  type: 'lover_cohabitation',
  target_username: partner,
  idempotency_key: 'qa-lover-contract',
}, actor(owner))
assert.equal(created.idempotent, false, 'first create should not be idempotent')
assert.equal(created.contract.status, 'pending_acceptance', 'new contract should wait for partner acceptance')
assert.equal(created.contract.members.length, 2, 'lover cohabitation must be dual')
assert.equal(created.contract.members.find(member => member.username === owner)?.status, 'accepted', 'creator should accept immediately')
assert.equal(created.contract.members.find(member => member.username === partner)?.status, 'pending', 'partner should remain pending')
assert.equal(created.contract.shared_fund.balance, 0, 'shared fund should start empty')
assert.equal(created.contract.permissions[owner].storage.withdraw_rare, false, 'rare withdrawal should be protected by default')
assert.equal(created.contract.permissions[owner].confirmations.large_fund_spend_requires_both, true, 'large fund spend should require both confirmations')
assert.equal(created.contract.audit_log[0].action, 'contract_created', 'creation should be audited')

const duplicated = await runtime.createCohabitationContract({
  type: 'lover_cohabitation',
  target_username: partner,
  idempotency_key: 'qa-lover-contract',
}, actor(owner))
assert.equal(duplicated.idempotent, true, 'same idempotency key should not create a second contract')
assert.equal(duplicated.contract.id, created.contract.id, 'idempotent response should return original contract')

await assert.rejects(
  () => runtime.createCohabitationContract({
    type: 'marriage_home',
    target_usernames: [partner, extra],
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('2-2'),
  'romance or marriage contracts must reject more than two members'
)

const accepted = await runtime.acceptCohabitationContract(created.contract.id, actor(partner))
assert.equal(accepted.contract.status, 'active', 'contract should activate after all members accept')
assert.ok(accepted.contract.shared_manor_id.startsWith('shared_manor_'), 'activation should allocate shared manor id')
assert.equal(accepted.contract.shared_fund.ledger[0].action, 'contract_activated', 'activation should create shared fund ledger marker')
assert.ok(accepted.contract.audit_log.find(entry => entry.action === 'contract_activated'), 'activation should be audited')

const activeOverview = await runtime.listCohabitationContracts(partner)
assert.equal(activeOverview.summary.active, 1, 'partner should see the active contract')

const initialPermissionsResult = await runtime.getCohabitationPermissions(created.contract.id, actor(owner))
assert.equal(initialPermissionsResult.permissions_panel.editable_by_actor, true, 'contract owner should be able to edit permissions')
assert.ok(initialPermissionsResult.permissions_panel.groups.some(group => group.id === 'storage'), 'permissions panel should expose storage group')
assert.ok(initialPermissionsResult.permissions_panel.groups.some(group => group.id === 'fund'), 'permissions panel should expose fund group')
assert.equal(initialPermissionsResult.permissions_panel.safety_rails.large_fund_spend_requires_both, true, 'permissions panel should expose locked fund confirmation rail')
assert.equal(initialPermissionsResult.permissions_panel.members.find(member => member.username === partner)?.permissions.storage.deposit, true, 'partner should initially be allowed to deposit')
assert.equal(initialPermissionsResult.permissions_panel.members.find(member => member.username === owner)?.can_manage_permissions, true, 'owner member should be marked as permission manager')
assert.equal(initialPermissionsResult.permissions_panel.members.find(member => member.username === partner)?.can_manage_permissions, false, 'partner member should not manage permissions in first pass')

await assert.rejects(
  () => runtime.updateCohabitationPermissions(created.contract.id, {
    target_username: owner,
    permissions: {
      storage: { deposit: false },
    },
    idempotency_key: 'qa-partner-permission-update-denied',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('契约发起者'),
  'non-owner partners should not update cohabitation permissions in first pass'
)

const ownerRawBeforeSharedMap = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeSharedMap = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const sharedMapResult = await runtime.getCohabitationSharedMap(created.contract.id, actor(owner))
const sharedMap = sharedMapResult.shared_map
assert.equal(sharedMap.readonly, true, 'shared farm map should be read-only in the first pass')
assert.equal(sharedMap.writes_enabled, false, 'shared farm map should not expose write operations yet')
assert.equal(sharedMap.summary.total_plots, 32, 'two 4x4 farms should be stitched into one map')
assert.equal(sharedMap.layout.columns, 8, 'dual farms should be placed side by side')
assert.equal(sharedMap.layout.rows, 4, 'dual farms should keep the tallest member farm height')
assert.equal(sharedMap.summary.origin_owner_count, 2, 'shared map should preserve both origin owners')
assert.equal(sharedMap.summary.personal_money_merged, false, 'shared map must not merge personal money')
assert.deepEqual(sharedMap.summary.included_sources, ['farm.plots'], 'first pass should only include main farm plots')
const ownerPlot = sharedMap.plots.find(plot => plot.origin_owner_username === owner && plot.source_plot_id === 0)
assert.match(ownerPlot?.origin_owner_id || '', /^(save:\d{9}|account:cohabit_owner_0524)$/, 'owner plot should keep traceable origin owner id')
assert.equal(ownerPlot?.origin_owner_id, sharedMap.members.find(member => member.username === owner)?.save_id
  ? `save:${sharedMap.members.find(member => member.username === owner)?.save_id}`
  : `account:${owner}`, 'owner plot origin id should match member save identity or account fallback')
assert.equal(ownerPlot?.current_steward_username, owner, 'owner plot should default steward to original owner')
assert.equal(ownerPlot?.permission_mode, 'shared', 'lover contract should default farm care to shared')
assert.equal(ownerPlot?.plot_state.crop_id, 'rice', 'owner crop state should be visible')
const partnerPlot = sharedMap.plots.find(plot => plot.origin_owner_username === partner && plot.source_plot_id === 5)
assert.match(partnerPlot?.origin_owner_id || '', /^(save:\d{9}|account:cohabit_partner_0524)$/, 'partner plot should keep traceable origin owner id')
assert.equal(partnerPlot?.origin_owner_id, sharedMap.members.find(member => member.username === partner)?.save_id
  ? `save:${sharedMap.members.find(member => member.username === partner)?.save_id}`
  : `account:${partner}`, 'partner plot origin id should match member save identity or account fallback')
assert.equal(partnerPlot?.col, 5, 'partner plot should be offset into the second farm region')
assert.equal(partnerPlot?.plot_state.state, 'harvestable', 'partner crop state should be visible')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeSharedMap, 'shared map should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeSharedMap, 'shared map should not rewrite partner save')

const initialWarehouseResult = await runtime.getCohabitationWarehouse(created.contract.id, actor(owner))
assert.equal(initialWarehouseResult.warehouse.summary.item_count, 0, 'fresh cohabitation warehouse should be empty')
assert.equal(initialWarehouseResult.warehouse.summary.personal_money_merged, false, 'warehouse must not merge personal money')
assert.equal(initialWarehouseResult.warehouse.permissions.can_deposit, true, 'default storage permissions should allow deposits')

const ownerRiceBeforeDeposit = getInventoryItemQuantity(owner, 'rice')
assert.equal(ownerRiceBeforeDeposit, 6, 'owner seed save should include rice before warehouse deposit')
const ownerMoneyBeforeDeposit = readGameplayData(owner)?.player?.money
const depositResult = await runtime.depositCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 2,
  quality: 'normal',
  idempotency_key: 'qa-warehouse-rice-deposit',
}, actor(owner))
assert.equal(depositResult.idempotent, false, 'first warehouse deposit should not be idempotent')
assert.equal(depositResult.warehouse.summary.total_quantity, 2, 'warehouse deposit should increase shared stock')
assert.ok(depositResult.warehouse.items.some(item => item.item_id === 'rice' && item.quantity === 2), 'warehouse should expose deposited rice stock')
assert.equal(depositResult.ledger_entry.source_owner_username, owner, 'ledger should keep source owner username')
assert.equal(depositResult.ledger_entry.source_inventory, 'inventory.items', 'ledger should keep source inventory path')
assert.equal(depositResult.ledger_entry.source_save_slot, 0, 'ledger should keep source save slot')
assert.match(String(depositResult.ledger_entry.source_owner_id || ''), /^save:\d{9}$/, 'ledger should keep traceable save owner id')
assert.equal(depositResult.ledger_entry.idempotency_key, 'qa-warehouse-rice-deposit', 'ledger should keep idempotency key')
assert.equal(getInventoryItemQuantity(owner, 'rice'), 4, 'warehouse deposit should deduct owner rice once')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeDeposit, 'warehouse deposit should not touch personal money')
assert.ok(depositResult.contract.origin_assets.warehouse_items.some(item => item.ledger_id === depositResult.ledger_entry.id), 'origin assets should reference warehouse ledger')
assert.ok(depositResult.contract.audit_log.find(entry => entry.action === 'warehouse_deposited'), 'warehouse deposit should be audited')

const duplicateDeposit = await runtime.depositCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 2,
  quality: 'normal',
  idempotency_key: 'qa-warehouse-rice-deposit',
}, actor(owner))
assert.equal(duplicateDeposit.idempotent, true, 'same warehouse deposit idempotency key should be idempotent')
assert.equal(getInventoryItemQuantity(owner, 'rice'), 4, 'idempotent warehouse deposit should not deduct rice twice')
assert.equal(duplicateDeposit.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 2, 'idempotent warehouse deposit should not duplicate stock')

const withdrawResult = await runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 1,
  quality: 'normal',
  idempotency_key: 'qa-warehouse-rice-withdraw',
}, actor(owner))
assert.equal(withdrawResult.idempotent, false, 'first warehouse withdrawal should not be idempotent')
assert.equal(withdrawResult.warehouse.summary.total_quantity, 1, 'warehouse withdrawal should reduce shared stock')
assert.equal(withdrawResult.ledger_entry.action, 'withdraw', 'warehouse ledger should record withdrawal action')
assert.equal(withdrawResult.ledger_entry.source_owner_username, owner, 'withdraw ledger should keep original source owner')
assert.equal(withdrawResult.ledger_entry.target_owner_username, owner, 'withdraw ledger should keep target owner')
assert.equal(withdrawResult.ledger_entry.target_save_slot, 0, 'withdraw ledger should keep target save slot')
assert.match(String(withdrawResult.ledger_entry.target_owner_id || ''), /^save:\d{9}$/, 'withdraw ledger should keep traceable target save id')
assert.ok(withdrawResult.ledger_entry.source_ledger_ids.includes(depositResult.ledger_entry.id), 'withdraw ledger should reference source deposit ledger')
assert.equal(getInventoryItemQuantity(owner, 'rice'), 5, 'warehouse withdrawal should add rice to owner personal inventory once')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeDeposit, 'warehouse withdrawal should not touch personal money')
assert.ok(withdrawResult.contract.origin_assets.warehouse_items.some(item => item.ledger_id === withdrawResult.ledger_entry.id && item.action === 'withdraw'), 'origin assets should reference withdrawal ledger')
assert.ok(withdrawResult.contract.audit_log.find(entry => entry.action === 'warehouse_withdrawn'), 'warehouse withdrawal should be audited')

const duplicateWithdraw = await runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 1,
  quality: 'normal',
  idempotency_key: 'qa-warehouse-rice-withdraw',
}, actor(owner))
assert.equal(duplicateWithdraw.idempotent, true, 'same warehouse withdrawal idempotency key should be idempotent')
assert.equal(getInventoryItemQuantity(owner, 'rice'), 5, 'idempotent warehouse withdrawal should not add rice twice')
assert.equal(duplicateWithdraw.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 1, 'idempotent warehouse withdrawal should not duplicate stock changes')

const initialFundResult = await runtime.getCohabitationFund(created.contract.id, actor(owner))
assert.equal(initialFundResult.fund.balance, 0, 'fresh shared fund should have zero balance')
assert.equal(initialFundResult.fund.summary.personal_money_merged, false, 'shared fund must not merge personal money')
assert.equal(initialFundResult.fund.summary.contribution_enabled, true, 'active members should be able to contribute to fund')
assert.equal(initialFundResult.fund.summary.spend_enabled, true, 'fund small spending should follow actor permission')
assert.equal(initialFundResult.fund.summary.medium_spend_enabled, true, 'fund medium spending should follow actor permission')
assert.ok(initialFundResult.fund.summary.allowed_small_spend_purposes.some(purpose => purpose.id === 'seed_budget'), 'fund snapshot should expose small seed budget spend purpose')
assert.ok(initialFundResult.fund.summary.allowed_medium_spend_purposes.some(purpose => purpose.id === 'building_materials'), 'fund snapshot should expose medium building materials spend purpose')
assert.ok(initialFundResult.fund.summary.allowed_medium_spend_purposes.some(purpose => purpose.id === 'processing_materials'), 'fund snapshot should expose medium processing spend purpose')
assert.equal(initialFundResult.fund.summary.idempotency_required, true, 'fund contribution should require idempotency key')

const ownerFundBefore = readGameplayData(owner)?.player?.money
assert.equal(ownerFundBefore, 1000, 'owner money should still be untouched before fund contribution')
const ownerFundContribution = await runtime.contributeCohabitationFund(created.contract.id, {
  amount: 120,
  purpose: 'seed_budget',
  memo: 'qa owner fund contribution',
  idempotency_key: 'qa-fund-contribution-owner',
}, actor(owner))
assert.equal(ownerFundContribution.idempotent, false, 'first fund contribution should not be idempotent')
assert.equal(ownerFundContribution.fund.balance, 120, 'owner contribution should increase shared fund balance')
assert.equal(ownerFundContribution.personal_money.remaining_money, 880, 'fund contribution should deduct owner personal money once')
assert.equal(readGameplayData(owner)?.player?.money, 880, 'owner save should persist deducted money')
assert.equal(ownerFundContribution.ledger_entry.action, 'contribution', 'fund ledger should record contribution action')
assert.equal(ownerFundContribution.ledger_entry.amount, 120, 'fund ledger should keep contribution amount')
assert.equal(ownerFundContribution.ledger_entry.purpose, 'seed_budget', 'fund ledger should keep purpose')
assert.equal(ownerFundContribution.ledger_entry.source_owner_username, owner, 'fund ledger should keep source owner username')
assert.equal(ownerFundContribution.ledger_entry.source_save_slot, 0, 'fund ledger should keep source save slot')
assert.match(String(ownerFundContribution.ledger_entry.source_owner_id || ''), /^save:\d{9}$/, 'fund ledger should keep traceable save owner id')
assert.equal(ownerFundContribution.ledger_entry.idempotency_key, 'qa-fund-contribution-owner', 'fund ledger should keep idempotency key')
assert.ok(ownerFundContribution.contract.origin_assets.fund_contributions.some(item => item.ledger_id === ownerFundContribution.ledger_entry.id), 'origin assets should reference fund contribution ledger')
assert.ok(ownerFundContribution.contract.audit_log.find(entry => entry.action === 'fund_contributed'), 'fund contribution should be audited')

const duplicateFundContribution = await runtime.contributeCohabitationFund(created.contract.id, {
  amount: 120,
  purpose: 'seed_budget',
  memo: 'qa duplicate owner fund contribution',
  idempotency_key: 'qa-fund-contribution-owner',
}, actor(owner))
assert.equal(duplicateFundContribution.idempotent, true, 'same fund contribution idempotency key should be idempotent')
assert.equal(duplicateFundContribution.fund.balance, 120, 'idempotent fund contribution should not duplicate balance')
assert.equal(readGameplayData(owner)?.player?.money, 880, 'idempotent fund contribution should not deduct money twice')

const partnerFundContribution = await runtime.contributeCohabitationFund(created.contract.id, {
  amount: 80,
  purpose: 'bridge_materials',
  idempotency_key: 'qa-fund-contribution-partner',
}, actor(partner))
assert.equal(partnerFundContribution.fund.balance, 200, 'partner contribution should add to shared fund balance')
assert.equal(partnerFundContribution.personal_money.remaining_money, 920, 'partner personal money should be deducted once')
assert.equal(readGameplayData(partner)?.player?.money, 920, 'partner save should persist deducted money')

const ownerMoneyBeforeFundSpend = readGameplayData(owner)?.player?.money
const fundSpendResult = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 30,
  purpose: 'seed_budget',
  target_ref: 'shop:turnip_seed',
  memo: 'qa shared seed budget',
  idempotency_key: 'qa-fund-spend-seed-budget',
}, actor(owner))
assert.equal(fundSpendResult.idempotent, false, 'first fund spend should not be idempotent')
assert.equal(fundSpendResult.fund.balance, 170, 'fund spend should reduce shared fund balance')
assert.equal(fundSpendResult.shared_fund.balance_before, 200, 'fund spend should report previous balance')
assert.equal(fundSpendResult.shared_fund.balance_after, 170, 'fund spend should report new balance')
assert.equal(fundSpendResult.shared_fund.personal_money_merged, false, 'fund spend should not merge personal money')
assert.equal(fundSpendResult.ledger_entry.action, 'spend', 'fund ledger should record spend action')
assert.equal(fundSpendResult.ledger_entry.amount, 30, 'fund spend ledger should keep spend amount')
assert.equal(fundSpendResult.ledger_entry.purpose, 'seed_budget', 'fund spend ledger should keep purpose')
assert.equal(fundSpendResult.ledger_entry.spend_purpose_label, '小额种子预算', 'fund spend ledger should keep purpose label')
assert.equal(fundSpendResult.ledger_entry.target_ref, 'shop:turnip_seed', 'fund spend ledger should keep target reference')
assert.equal(fundSpendResult.ledger_entry.confirmation_required, false, 'small fund spend should not require large-spend confirmation')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFundSpend, 'fund spend should not touch owner personal money')
assert.ok(fundSpendResult.contract.audit_log.find(entry => entry.action === 'fund_spent'), 'fund spend should be audited')

const duplicateFundSpend = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 30,
  purpose: 'seed_budget',
  target_ref: 'shop:turnip_seed',
  idempotency_key: 'qa-fund-spend-seed-budget',
}, actor(owner))
assert.equal(duplicateFundSpend.idempotent, true, 'same fund spend idempotency key should be idempotent')
assert.equal(duplicateFundSpend.fund.balance, 170, 'idempotent fund spend should not duplicate balance changes')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFundSpend, 'idempotent fund spend should still not touch personal money')

const ownerSeedBeforeFundPurchase = getInventoryItemQuantity(owner, 'seed_cabbage')
const ownerMoneyBeforeFundPurchase = readGameplayData(owner)?.player?.money
const fundPurchaseResult = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 20,
  purpose: 'seed_budget',
  target_ref: 'shop:seed_cabbage',
  auto_pay: true,
  memo: 'qa shared seed auto purchase',
  idempotency_key: 'qa-fund-purchase-seed-cabbage',
}, actor(owner))
assert.equal(fundPurchaseResult.idempotent, false, 'first fund purchase should not be idempotent')
assert.equal(fundPurchaseResult.fund.balance, 150, 'fund purchase should reduce shared fund balance')
assert.equal(fundPurchaseResult.ledger_entry.action, 'spend', 'fund purchase should still use spend ledger')
assert.equal(fundPurchaseResult.ledger_entry.auto_pay, true, 'fund purchase ledger should mark auto pay')
assert.equal(fundPurchaseResult.ledger_entry.target_item_id, 'seed_cabbage', 'fund purchase ledger should keep delivered item id')
assert.equal(fundPurchaseResult.ledger_entry.target_quantity, 2, 'fund purchase ledger should keep delivered quantity')
assert.equal(fundPurchaseResult.purchase.item_id, 'seed_cabbage', 'fund purchase should report delivered item')
assert.equal(fundPurchaseResult.purchase.quantity, 2, 'fund purchase should report delivered quantity')
assert.equal(getInventoryItemQuantity(owner, 'seed_cabbage'), ownerSeedBeforeFundPurchase + 2, 'fund purchase should add seeds to owner inventory once')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFundPurchase, 'fund purchase should not touch owner personal money')
assert.ok(fundPurchaseResult.contract.audit_log.find(entry => entry.action === 'fund_spent' && entry.detail?.purchase_delivered === true), 'fund purchase should be audited as delivered')

const duplicateFundPurchase = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 20,
  purpose: 'seed_budget',
  target_ref: 'shop:seed_cabbage',
  auto_pay: true,
  idempotency_key: 'qa-fund-purchase-seed-cabbage',
}, actor(owner))
assert.equal(duplicateFundPurchase.idempotent, true, 'same fund purchase idempotency key should be idempotent')
assert.equal(duplicateFundPurchase.fund.balance, 150, 'idempotent fund purchase should not deduct balance twice')
assert.equal(getInventoryItemQuantity(owner, 'seed_cabbage'), ownerSeedBeforeFundPurchase + 2, 'idempotent fund purchase should not add seeds twice')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFundPurchase, 'idempotent fund purchase should still not touch personal money')

const ownerFishFeedBeforeFundPurchase = getInventoryItemQuantity(owner, 'fish_feed')
const ownerMoneyBeforeFeedPurchase = readGameplayData(owner)?.player?.money
const fundFeedPurchaseResult = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 30,
  purpose: 'feed_budget',
  target_ref: 'shop:fish_feed',
  auto_pay: true,
  memo: 'qa shared fish feed auto purchase',
  idempotency_key: 'qa-fund-purchase-fish-feed',
}, actor(owner))
assert.equal(fundFeedPurchaseResult.idempotent, false, 'first fund feed purchase should not be idempotent')
assert.equal(fundFeedPurchaseResult.fund.balance, 120, 'fund feed purchase should reduce shared fund balance')
assert.equal(fundFeedPurchaseResult.ledger_entry.target_item_id, 'fish_feed', 'fund feed purchase ledger should keep delivered item id')
assert.equal(fundFeedPurchaseResult.ledger_entry.target_quantity, 1, 'fund feed purchase ledger should keep delivered quantity')
assert.equal(fundFeedPurchaseResult.purchase.item_id, 'fish_feed', 'fund feed purchase should report delivered item')
assert.equal(fundFeedPurchaseResult.purchase.quantity, 1, 'fund feed purchase should report delivered quantity')
assert.equal(getInventoryItemQuantity(owner, 'fish_feed'), ownerFishFeedBeforeFundPurchase + 1, 'fund feed purchase should add fish feed to owner inventory once')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFeedPurchase, 'fund feed purchase should not touch owner personal money')

const duplicateFundFeedPurchase = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 30,
  purpose: 'feed_budget',
  target_ref: 'shop:fish_feed',
  auto_pay: true,
  idempotency_key: 'qa-fund-purchase-fish-feed',
}, actor(owner))
assert.equal(duplicateFundFeedPurchase.idempotent, true, 'same fund feed purchase idempotency key should be idempotent')
assert.equal(duplicateFundFeedPurchase.fund.balance, 120, 'idempotent fund feed purchase should not deduct balance twice')
assert.equal(getInventoryItemQuantity(owner, 'fish_feed'), ownerFishFeedBeforeFundPurchase + 1, 'idempotent fund feed purchase should not add feed twice')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFeedPurchase, 'idempotent fund feed purchase should still not touch personal money')

const feedTopUpResult = await runtime.contributeCohabitationFund(created.contract.id, {
  amount: 750,
  purpose: 'feed_budget',
  memo: 'qa shared animal feed top up',
  idempotency_key: 'qa-fund-contribution-animal-feed-top-up',
}, actor(owner))
assert.equal(feedTopUpResult.idempotent, false, 'animal feed top up should not be idempotent first time')
assert.equal(feedTopUpResult.fund.balance, 870, 'animal feed top up should restore enough shared fund balance for feed catalog')

const animalFeedCatalogCases = [
  { targetRef: 'shop:premium_feed', itemId: 'premium_feed', amount: 200, balanceAfter: 670 },
  { targetRef: 'shop:nourishing_feed', itemId: 'nourishing_feed', amount: 250, balanceAfter: 420 },
  { targetRef: 'shop:vitality_feed', itemId: 'vitality_feed', amount: 300, balanceAfter: 120 },
]
for (const feedCase of animalFeedCatalogCases) {
  const beforeQuantity = getInventoryItemQuantity(owner, feedCase.itemId)
  const beforeMoney = readGameplayData(owner)?.player?.money
  const feedResult = await runtime.spendCohabitationFund(created.contract.id, {
    amount: feedCase.amount,
    purpose: 'feed_budget',
    target_ref: feedCase.targetRef,
    auto_pay: true,
    memo: `qa shared animal feed auto purchase ${feedCase.itemId}`,
    idempotency_key: `qa-fund-purchase-${feedCase.itemId}`,
  }, actor(owner))
  assert.equal(feedResult.idempotent, false, `${feedCase.itemId} purchase should not be idempotent first time`)
  assert.equal(feedResult.fund.balance, feedCase.balanceAfter, `${feedCase.itemId} purchase should reduce shared fund balance`)
  assert.equal(feedResult.ledger_entry.target_item_id, feedCase.itemId, `${feedCase.itemId} ledger should keep delivered item id`)
  assert.equal(feedResult.ledger_entry.target_quantity, 1, `${feedCase.itemId} ledger should keep delivered quantity`)
  assert.equal(feedResult.purchase.item_id, feedCase.itemId, `${feedCase.itemId} purchase should report delivered item`)
  assert.equal(getInventoryItemQuantity(owner, feedCase.itemId), beforeQuantity + 1, `${feedCase.itemId} purchase should add feed once`)
  assert.equal(readGameplayData(owner)?.player?.money, beforeMoney, `${feedCase.itemId} purchase should not touch owner personal money`)

  const duplicateFeedResult = await runtime.spendCohabitationFund(created.contract.id, {
    amount: feedCase.amount,
    purpose: 'feed_budget',
    target_ref: feedCase.targetRef,
    auto_pay: true,
    idempotency_key: `qa-fund-purchase-${feedCase.itemId}`,
  }, actor(owner))
  assert.equal(duplicateFeedResult.idempotent, true, `${feedCase.itemId} duplicate purchase should be idempotent`)
  assert.equal(duplicateFeedResult.fund.balance, feedCase.balanceAfter, `${feedCase.itemId} duplicate purchase should not deduct balance twice`)
  assert.equal(getInventoryItemQuantity(owner, feedCase.itemId), beforeQuantity + 1, `${feedCase.itemId} duplicate purchase should not add feed twice`)
}

const ownerMoneyBeforeFailedFund = readGameplayData(owner)?.player?.money
await assert.rejects(
  () => runtime.contributeCohabitationFund(created.contract.id, {
    amount: 999999,
    idempotency_key: 'qa-fund-insufficient-money',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('个人铜币不足'),
  'fund contribution should reject insufficient personal money'
)
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeFailedFund, 'failed fund contribution should not deduct money')
assert.equal((await runtime.getCohabitationFund(created.contract.id, actor(owner))).fund.balance, 120, 'failed fund contribution should not change balance')

await assert.rejects(
  () => runtime.contributeCohabitationFund(created.contract.id, {
    amount: 1,
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('idempotency_key'),
  'fund contribution should require an idempotency key'
)

const partnerWarehouseRead = await runtime.getCohabitationWarehouse(created.contract.id, actor(partner))
assert.equal(partnerWarehouseRead.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 1, 'partner should read shared warehouse stock after withdrawal')

await assert.rejects(
  () => runtime.sellCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-warehouse-rice-sell-denied',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('卖出共同仓库'),
  'warehouse sale should reject members without sell permission'
)

const ownerSellPermissionUpdate = await runtime.updateCohabitationPermissions(created.contract.id, {
  target_username: owner,
  permissions: {
    storage: {
      sell_items: true,
    },
  },
  note: 'qa enable owner warehouse sale',
  idempotency_key: 'qa-permission-update-owner-sell',
}, actor(owner))
assert.equal(ownerSellPermissionUpdate.idempotent, false, 'first owner sell permission update should not be idempotent')
assert.equal(ownerSellPermissionUpdate.permissions_panel.members.find(member => member.username === owner)?.permissions.storage.sell_items, true, 'owner sell permission should be enabled explicitly')
assert.ok(ownerSellPermissionUpdate.changed_fields.some(field => field.group === 'storage' && field.key === 'sell_items' && field.after === true), 'owner sell permission update should report sell_items change')

const ownerWarehouseBeforeSell = await runtime.getCohabitationWarehouse(created.contract.id, actor(owner))
assert.equal(ownerWarehouseBeforeSell.warehouse.summary.sell_enabled, true, 'warehouse snapshot should expose sell capability after permission update')
assert.equal(ownerWarehouseBeforeSell.warehouse.permissions.can_sell_items, true, 'warehouse permissions should expose sell flag after permission update')
const ownerMoneyBeforeWarehouseSale = readGameplayData(owner)?.player?.money
const ownerRiceBeforeWarehouseSale = getInventoryItemQuantity(owner, 'rice')
const warehouseSaleResult = await runtime.sellCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 1,
  quality: 'normal',
  memo: 'qa sell remaining rice into shared fund',
  idempotency_key: 'qa-warehouse-rice-sell',
}, actor(owner))
assert.equal(warehouseSaleResult.idempotent, false, 'first warehouse sale should not be idempotent')
assert.equal(warehouseSaleResult.warehouse.summary.total_quantity, 0, 'warehouse sale should reduce shared stock')
assert.equal(warehouseSaleResult.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 0, 'sold rice should no longer remain in shared stock')
assert.equal(warehouseSaleResult.ledger_entry.action, 'sell', 'warehouse ledger should record sell action')
assert.equal(warehouseSaleResult.ledger_entry.unit_price, 35, 'warehouse sale should use server-side rice price')
assert.equal(warehouseSaleResult.ledger_entry.total_amount, 35, 'warehouse sale ledger should keep sale amount')
assert.ok(warehouseSaleResult.ledger_entry.source_ledger_ids.includes(depositResult.ledger_entry.id), 'warehouse sale ledger should reference source deposit ledger')
assert.equal(warehouseSaleResult.fund.balance, 155, 'warehouse sale should credit shared fund balance')
assert.equal(warehouseSaleResult.fund_ledger_entry.action, 'warehouse_sale_income', 'fund ledger should record warehouse sale income')
assert.equal(warehouseSaleResult.fund_ledger_entry.amount, 35, 'fund sale ledger should keep credited amount')
assert.equal(warehouseSaleResult.fund_ledger_entry.balance_after, 155, 'fund sale ledger should expose balance after credit')
assert.equal(warehouseSaleResult.sale.balance_before, 120, 'warehouse sale should expose previous fund balance')
assert.equal(warehouseSaleResult.sale.balance_after, 155, 'warehouse sale should expose credited fund balance')
assert.equal(warehouseSaleResult.sale.personal_money_merged, false, 'warehouse sale should not merge personal money')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeWarehouseSale, 'warehouse sale should not touch owner personal money')
assert.equal(getInventoryItemQuantity(owner, 'rice'), ownerRiceBeforeWarehouseSale, 'warehouse sale should not touch owner personal inventory')
assert.ok(warehouseSaleResult.contract.origin_assets.warehouse_items.some(item => item.ledger_id === warehouseSaleResult.ledger_entry.id && item.action === 'sell'), 'origin assets should reference sale ledger')
assert.ok(warehouseSaleResult.contract.audit_log.find(entry => entry.action === 'warehouse_sold'), 'warehouse sale should be audited')

const duplicateWarehouseSale = await runtime.sellCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 1,
  quality: 'normal',
  idempotency_key: 'qa-warehouse-rice-sell',
}, actor(owner))
assert.equal(duplicateWarehouseSale.idempotent, true, 'same warehouse sale idempotency key should be idempotent')
assert.equal(duplicateWarehouseSale.fund.balance, 155, 'idempotent warehouse sale should not credit fund twice')
assert.equal(duplicateWarehouseSale.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 0, 'idempotent warehouse sale should not restore or duplicate stock')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeWarehouseSale, 'idempotent warehouse sale should still not touch personal money')

await assert.rejects(
  () => runtime.getCohabitationSharedMap(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a shared farm map'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyOrders(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family order panel'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyReputation(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family reputation panel'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyBuildings(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family building panel'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyRelations(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family relation panel'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyVisibility(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family visibility panel'
)

await assert.rejects(
  () => runtime.getCohabitationFamilyFestivalSeats(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a family festival seat panel'
)

await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-non-member-deposit',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not deposit into a cohabitation warehouse'
)

await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-non-member-withdraw',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not withdraw from a cohabitation warehouse'
)

await assert.rejects(
  () => runtime.sellCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-non-member-sell',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not sell from a cohabitation warehouse'
)

await assert.rejects(
  () => runtime.contributeCohabitationFund(created.contract.id, {
    amount: 1,
    idempotency_key: 'qa-non-member-fund-contribution',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not contribute to a cohabitation fund'
)

await assert.rejects(
  () => runtime.spendCohabitationFund(created.contract.id, {
    amount: 1,
    purpose: 'seed_budget',
    idempotency_key: 'qa-non-member-fund-spend',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not spend from a cohabitation fund'
)

await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 99,
    quality: 'normal',
    idempotency_key: 'qa-insufficient-rice',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('数量不足'),
  'warehouse deposit should reject insufficient personal inventory without changing stock'
)
assert.equal(getInventoryItemQuantity(owner, 'rice'), 5, 'failed warehouse deposit should not deduct inventory')

await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'ancient_waybill',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-protected-waybill',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('暂不允许'),
  'warehouse deposit should reject protected or rare-looking items'
)

await assert.rejects(
  () => runtime.sellCohabitationWarehouseItem(created.contract.id, {
    item_id: 'ancient_waybill',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-protected-waybill-sell',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('暂不允许'),
  'warehouse sale should reject protected or rare-looking items'
)

await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    idempotency_key: 'qa-high-quality-lotus',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('普通品质'),
  'warehouse deposit should reject high quality items in the first pass'
)

await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    idempotency_key: 'qa-high-quality-lotus-withdraw',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('普通品质'),
  'warehouse withdrawal should reject high quality items in the first pass'
)

await assert.rejects(
  () => runtime.sellCohabitationWarehouseItem(created.contract.id, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    idempotency_key: 'qa-high-quality-lotus-sell',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('普通品质'),
  'warehouse sale should reject high quality items in the first pass'
)

await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 99,
    quality: 'normal',
    idempotency_key: 'qa-withdraw-insufficient-rice',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('数量不足'),
  'warehouse withdrawal should reject insufficient shared stock without changing personal inventory'
)
assert.equal(getInventoryItemQuantity(owner, 'rice'), 5, 'failed warehouse withdrawal should not add inventory')

await assert.rejects(
  () => runtime.sellCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 99,
    quality: 'normal',
    idempotency_key: 'qa-sell-insufficient-rice',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('数量不足'),
  'warehouse sale should reject insufficient shared stock without changing fund balance'
)
assert.equal((await runtime.getCohabitationFund(created.contract.id, actor(owner))).fund.balance, 155, 'failed warehouse sale should not credit shared fund')

const permissionUpdate = await runtime.updateCohabitationPermissions(created.contract.id, {
  target_username: partner,
  permissions: {
    storage: {
      deposit: false,
      withdraw_common: false,
      withdraw_rare: true,
    },
    fund: {
      spend_small: false,
      spend_medium: false,
      spend_large: true,
    },
    confirmations: {
      large_fund_spend_requires_both: false,
    },
  },
  note: 'qa restrict partner deposit',
  idempotency_key: 'qa-permission-update-partner',
}, actor(owner))
assert.equal(permissionUpdate.idempotent, false, 'first permissions update should not be idempotent')
const updatedPartnerPermissions = permissionUpdate.permissions_panel.members.find(member => member.username === partner)?.permissions
assert.equal(updatedPartnerPermissions.storage.deposit, false, 'permissions update should disable partner warehouse deposit')
assert.equal(updatedPartnerPermissions.storage.withdraw_common, false, 'permissions update should disable partner common warehouse withdrawal')
assert.equal(updatedPartnerPermissions.storage.withdraw_rare, true, 'permissions update should allow explicit storage permission flags')
assert.equal(updatedPartnerPermissions.fund.spend_small, false, 'permissions update should disable partner small fund spending')
assert.equal(updatedPartnerPermissions.fund.spend_medium, false, 'permissions update should disable partner medium fund spending')
assert.equal(updatedPartnerPermissions.fund.spend_large, true, 'permissions update should allow explicit fund permission flags')
assert.equal(updatedPartnerPermissions.confirmations.large_fund_spend_requires_both, true, 'permissions safety rail should keep large fund confirmation enabled')
assert.ok(permissionUpdate.changed_fields.some(field => field.group === 'storage' && field.key === 'deposit' && field.after === false), 'permissions update should report changed storage deposit field')
assert.ok(permissionUpdate.changed_fields.some(field => field.group === 'fund' && field.key === 'spend_medium' && field.after === false), 'permissions update should report changed medium fund spend field')
assert.ok(permissionUpdate.contract.audit_log.find(entry => entry.action === 'permissions_updated'), 'permissions update should be audited')

const duplicatePermissionUpdate = await runtime.updateCohabitationPermissions(created.contract.id, {
  target_username: partner,
  permissions: {
    storage: {
      deposit: false,
      withdraw_common: false,
      withdraw_rare: true,
    },
    fund: {
      spend_small: false,
      spend_medium: false,
      spend_large: true,
    },
  },
  idempotency_key: 'qa-permission-update-partner',
}, actor(owner))
assert.equal(duplicatePermissionUpdate.idempotent, true, 'same permissions update idempotency key should be idempotent')

const partnerPermissionsRead = await runtime.getCohabitationPermissions(created.contract.id, actor(partner))
assert.equal(partnerPermissionsRead.permissions_panel.editable_by_actor, false, 'partner should read permissions without edit capability')
assert.equal(partnerPermissionsRead.permissions_panel.members.find(member => member.username === partner)?.permissions.storage.deposit, false, 'partner should see updated own permissions')
assert.equal(partnerPermissionsRead.permissions_panel.members.find(member => member.username === partner)?.permissions.storage.withdraw_common, false, 'partner should see updated withdrawal permission')
assert.equal(partnerPermissionsRead.permissions_panel.members.find(member => member.username === partner)?.permissions.fund.spend_small, false, 'partner should see updated small fund spend permission')
assert.equal(partnerPermissionsRead.permissions_panel.members.find(member => member.username === partner)?.permissions.fund.spend_medium, false, 'partner should see updated medium fund spend permission')

const offlineStatus = await runtime.getCohabitationOfflineStatus(created.contract.id, actor(owner))
assert.equal(offlineStatus.offline_status.summary.server_authoritative, true, 'offline status should be server authoritative')
assert.equal(offlineStatus.offline_status.summary.member_online_required, false, 'offline status should not require all members online')
assert.equal(offlineStatus.offline_status.summary.offline_member_blocks_operations, false, 'offline members should not block operations')
assert.equal(offlineStatus.offline_status.summary.independent_operations_enabled, true, 'active members should be able to operate independently')
assert.equal(offlineStatus.offline_status.summary.auto_offline_income_enabled, false, 'first pass should not enable offline auto income')
assert.ok(offlineStatus.offline_status.members.find(member => member.username === owner)?.last_active_at > 0, 'offline status should expose owner last active time')
assert.ok(offlineStatus.offline_status.members.find(member => member.username === partner)?.last_active_at > 0, 'offline status should expose partner last active time')
assert.ok(offlineStatus.offline_status.recent_shared_log.some(entry => entry.action === 'permissions_updated'), 'offline status should expose recent shared log')
assert.ok(!offlineStatus.offline_status.deferred_operations.includes('frontend_shared_log'), 'frontend shared log should no longer be marked deferred')
assert.equal(offlineStatus.offline_status.actor_capabilities.deposit_warehouse, true, 'owner should still be able to deposit while partner is not required online')
assert.equal(offlineStatus.offline_status.actor_capabilities.withdraw_warehouse_common, true, 'owner should be able to withdraw ordinary warehouse items while partner is not required online')
assert.equal(offlineStatus.offline_status.actor_capabilities.spend_fund_small, true, 'owner should be able to spend small shared fund budgets while partner is not required online')
assert.equal(offlineStatus.offline_status.actor_capabilities.spend_fund_medium, true, 'owner should be able to spend medium shared fund budgets while partner is not required online')
assert.equal(offlineStatus.offline_status.actor_capabilities.manage_permissions, true, 'owner should retain permission management capability')

const partnerOfflineStatus = await runtime.getCohabitationOfflineStatus(created.contract.id, actor(partner))
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.deposit_warehouse, false, 'offline status should reflect updated partner warehouse permission')
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.withdraw_warehouse_common, false, 'offline status should reflect updated partner warehouse withdrawal permission')
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.spend_fund_small, false, 'offline status should reflect updated partner fund spend permission')
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.spend_fund_medium, false, 'offline status should reflect updated partner medium fund spend permission')
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.manage_permissions, false, 'partner should not manage permissions in offline status')

await assert.rejects(
  () => runtime.getCohabitationOfflineStatus(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read offline operation status'
)

const partnerTeaBeforePermissionDenied = getInventoryItemQuantity(partner, 'tea')
await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'tea',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-partner-deposit-denied-by-permission',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('没有向共同仓库放入物品的权限'),
  'updated storage permission should block partner warehouse deposit'
)
assert.equal(getInventoryItemQuantity(partner, 'tea'), partnerTeaBeforePermissionDenied, 'permission-denied warehouse deposit should not deduct partner inventory')

await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(created.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-partner-withdraw-denied-by-permission',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('没有从共同仓库取出普通物品的权限'),
  'updated storage permission should block partner warehouse withdrawal'
)
assert.equal(getInventoryItemQuantity(partner, 'rice'), 0, 'permission-denied warehouse withdrawal should not add partner inventory')

await assert.rejects(
  () => runtime.spendCohabitationFund(created.contract.id, {
    amount: 1,
    purpose: 'feed_budget',
    idempotency_key: 'qa-partner-fund-spend-denied-by-permission',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('共同基金小额支出'),
  'updated fund permission should block partner small shared fund spending'
)
assert.equal((await runtime.getCohabitationFund(created.contract.id, actor(owner))).fund.balance, 155, 'permission-denied fund spend should not change shared balance after warehouse sale')
assert.equal(readGameplayData(partner)?.player?.money, 920, 'permission-denied fund spend should not touch partner money')

await assert.rejects(
  () => runtime.spendCohabitationFund(created.contract.id, {
    amount: 100,
    purpose: 'processing_materials',
    target_ref: 'workshop:tea_drying',
    idempotency_key: 'qa-partner-medium-fund-spend-denied-by-permission',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('共同基金中额'),
  'updated fund permission should block partner medium shared fund spending'
)
assert.equal((await runtime.getCohabitationFund(created.contract.id, actor(owner))).fund.balance, 155, 'permission-denied medium fund spend should not change shared balance')
assert.equal(readGameplayData(partner)?.player?.money, 920, 'permission-denied medium fund spend should not touch partner money')

const pendingContract = await runtime.createCohabitationContract({
  type: 'seasonal_cofarm',
  target_username: extra,
  idempotency_key: 'qa-pending-cofarm-contract',
}, actor(owner))
await assert.rejects(
  () => runtime.getCohabitationSharedMap(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose shared farm map'
)
await assert.rejects(
  () => runtime.getCohabitationWarehouse(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose shared warehouse'
)
await assert.rejects(
  () => runtime.withdrawCohabitationWarehouseItem(pendingContract.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-pending-withdraw',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not allow shared warehouse withdrawal'
)
await assert.rejects(
  () => runtime.getCohabitationFund(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose shared fund'
)
await assert.rejects(
  () => runtime.getCohabitationPermissions(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose permissions panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyRoles(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family role panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyOrders(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family order panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyReputation(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family reputation panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyBuildings(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family building panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyRelations(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family relation panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyVisibility(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family visibility panel'
)
await assert.rejects(
  () => runtime.getCohabitationFamilyFestivalSeats(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose family festival seat panel'
)
await assert.rejects(
  () => runtime.getCohabitationOfflineStatus(pendingContract.contract.id, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not expose offline operation status'
)
await assert.rejects(
  () => runtime.depositCohabitationWarehouseItem(pendingContract.contract.id, {
    item_id: 'rice',
    quantity: 1,
    quality: 'normal',
    idempotency_key: 'qa-pending-warehouse-deposit',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not accept warehouse deposits'
)
await assert.rejects(
  () => runtime.contributeCohabitationFund(pendingContract.contract.id, {
    amount: 1,
    idempotency_key: 'qa-pending-fund-contribution',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not accept fund contributions'
)
await assert.rejects(
  () => runtime.spendCohabitationFund(pendingContract.contract.id, {
    amount: 1,
    purpose: 'seed_budget',
    idempotency_key: 'qa-pending-fund-spend',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not accept fund spending'
)
await assert.rejects(
  () => runtime.createCohabitationFundLargeSpendDraft(pendingContract.contract.id, {
    amount: 1300,
    purpose: 'family_building',
    target_ref: 'family_building:pending_shared_granary:build',
    idempotency_key: 'qa-pending-large-fund-draft',
  }, actor(owner)),
  error => error?.status === 409,
  'pending contracts should not accept large fund spend drafts'
)
await assert.rejects(
  () => runtime.updateCohabitationPermissions(pendingContract.contract.id, {
    target_username: extra,
    permissions: {
      storage: { deposit: false },
    },
    idempotency_key: 'qa-pending-permission-update',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not accept permission updates'
)
await assert.rejects(
  () => runtime.updateCohabitationFamilyRole(pendingContract.contract.id, {
    target_username: extra,
    manor_role: 'storage_keeper',
    idempotency_key: 'qa-pending-family-role-update',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not accept family role updates'
)
await assert.rejects(
  () => runtime.createSeparationPreview(pendingContract.contract.id, {
    reason: 'pending preview should be rejected',
    idempotency_key: 'qa-pending-separation-preview',
  }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('已生效'),
  'pending contracts should not create separation previews'
)

const familyContract = await runtime.createCohabitationContract({
  type: 'oath_manor',
  target_usernames: [partner, extra],
  idempotency_key: 'qa-oath-manor-family-roles',
}, actor(owner))
assert.equal(familyContract.contract.members.length, 3, 'oath manor should support three members in first pass')
assert.equal(familyContract.contract.members.find(member => member.username === owner)?.manor_role, 'family_head', 'oath manor creator should default to family head')
assert.equal(familyContract.contract.members.find(member => member.username === partner)?.manor_role, 'farm_steward', 'oath manor invitees should default to farm steward')
assert.equal(familyContract.contract.permissions[partner].farm.harvest, true, 'default farm steward should receive farm harvest permission')
assert.equal(familyContract.contract.permissions[partner].fund.spend_small, false, 'default farm steward should not receive fund spending permission')

await runtime.acceptCohabitationContract(familyContract.contract.id, actor(partner))
const activeFamilyContract = await runtime.acceptCohabitationContract(familyContract.contract.id, actor(extra))
assert.equal(activeFamilyContract.contract.status, 'active', 'family manor should activate after all members accept')

const familyRoleRead = await runtime.getCohabitationFamilyRoles(familyContract.contract.id, actor(owner))
assert.equal(familyRoleRead.role_panel.role_management_enabled, true, 'family manor should enable role management')
assert.equal(familyRoleRead.role_panel.editable_by_actor, true, 'family head should edit family roles')
assert.equal(familyRoleRead.role_panel.role_options.length, 6, 'family role panel should expose six role options')
assert.equal(familyRoleRead.role_panel.constraints.family_head_locked_to_owner, true, 'family head should stay locked to owner in first pass')
assert.ok(familyRoleRead.role_panel.members.find(member => member.username === owner)?.can_manage_roles, 'owner family head should manage roles')

const partnerFamilyRoleRead = await runtime.getCohabitationFamilyRoles(familyContract.contract.id, actor(partner))
assert.equal(partnerFamilyRoleRead.role_panel.editable_by_actor, false, 'non-head family member should read roles without edit capability')

await assert.rejects(
  () => runtime.updateCohabitationFamilyRole(created.contract.id, {
    target_username: partner,
    manor_role: 'storage_keeper',
    idempotency_key: 'qa-lover-family-role-rejected',
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('结拜庄园或合伙庄园'),
  'romance cohabitation should not accept family role updates'
)

await assert.rejects(
  () => runtime.updateCohabitationFamilyRole(familyContract.contract.id, {
    target_username: partner,
    manor_role: 'storage_keeper',
    idempotency_key: 'qa-partner-family-role-denied',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('家主'),
  'non-head family member should not update family roles'
)

await assert.rejects(
  () => runtime.updateCohabitationFamilyRole(familyContract.contract.id, {
    target_username: owner,
    manor_role: 'treasurer',
    idempotency_key: 'qa-owner-head-remove-denied',
  }, actor(owner)),
  error => error?.status === 403 && String(error.message || '').includes('不能移除'),
  'family role update should not remove owner family head in first pass'
)

const familyRoleUpdate = await runtime.updateCohabitationFamilyRole(familyContract.contract.id, {
  target_username: partner,
  manor_role: 'storage_keeper',
  note: 'qa set partner as storage keeper',
  idempotency_key: 'qa-family-role-storage-keeper',
}, actor(owner))
assert.equal(familyRoleUpdate.idempotent, false, 'first family role update should not be idempotent')
const updatedFamilyPartner = familyRoleUpdate.role_panel.members.find(member => member.username === partner)
assert.equal(updatedFamilyPartner?.manor_role, 'storage_keeper', 'family role update should change member role')
assert.equal(updatedFamilyPartner?.manor_role_label, '管仓', 'family role panel should expose Chinese role label')
assert.equal(updatedFamilyPartner?.permissions.storage.withdraw_common, true, 'storage keeper should get common withdrawal permission preview')
assert.equal(updatedFamilyPartner?.permissions.farm.harvest, false, 'storage keeper should not retain farm steward harvest permission')
assert.equal(updatedFamilyPartner?.permissions.fund.spend_small, false, 'storage keeper should not get treasurer fund permission')
assert.ok(familyRoleUpdate.changed_fields.some(field => field.group === 'farm' && field.key === 'harvest' && field.after === false), 'family role update should report permission changes')
assert.ok(familyRoleUpdate.contract.audit_log.find(entry => entry.action === 'family_role_updated'), 'family role update should be audited')

const duplicateFamilyRoleUpdate = await runtime.updateCohabitationFamilyRole(familyContract.contract.id, {
  target_username: partner,
  manor_role: 'storage_keeper',
  idempotency_key: 'qa-family-role-storage-keeper',
}, actor(owner))
assert.equal(duplicateFamilyRoleUpdate.idempotent, true, 'same family role idempotency key should be idempotent')
assert.equal(duplicateFamilyRoleUpdate.audit_entry.id, familyRoleUpdate.audit_entry.id, 'idempotent family role update should return original audit entry')

const loverFamilyOrders = await runtime.getCohabitationFamilyOrders(created.contract.id, actor(owner))
assert.equal(loverFamilyOrders.family_orders_panel.family_orders_enabled, false, 'romance contracts should return a disabled family order panel')
assert.equal(loverFamilyOrders.family_orders_panel.write_enabled, false, 'disabled family order panel should not expose writes')
assert.equal(loverFamilyOrders.family_orders_panel.summary.preview_order_count, 0, 'disabled family order panel should not expose draft orders')
assert.match(loverFamilyOrders.family_orders_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled panel should explain family manor requirement')

const loverFamilyReputation = await runtime.getCohabitationFamilyReputation(created.contract.id, actor(owner))
assert.equal(loverFamilyReputation.family_reputation_panel.reputation_enabled, false, 'romance contracts should return a disabled family reputation panel')
assert.equal(loverFamilyReputation.family_reputation_panel.write_enabled, false, 'disabled family reputation panel should not expose writes')
assert.equal(loverFamilyReputation.family_reputation_panel.summary.current_points, 0, 'disabled family reputation panel should not expose points')
assert.match(loverFamilyReputation.family_reputation_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled reputation panel should explain family manor requirement')

const loverFamilyBuildings = await runtime.getCohabitationFamilyBuildings(created.contract.id, actor(owner))
assert.equal(loverFamilyBuildings.family_buildings_panel.family_buildings_enabled, false, 'romance contracts should return a disabled family building panel')
assert.equal(loverFamilyBuildings.family_buildings_panel.write_enabled, false, 'disabled family building panel should not expose writes')
assert.equal(loverFamilyBuildings.family_buildings_panel.summary.preview_building_count, 0, 'disabled family building panel should not expose building drafts')
assert.match(loverFamilyBuildings.family_buildings_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled building panel should explain family manor requirement')

const loverFamilyRelations = await runtime.getCohabitationFamilyRelations(created.contract.id, actor(owner))
assert.equal(loverFamilyRelations.family_relations_panel.family_relations_enabled, false, 'romance contracts should return a disabled family relation panel')
assert.equal(loverFamilyRelations.family_relations_panel.write_enabled, false, 'disabled family relation panel should not expose writes')
assert.equal(loverFamilyRelations.family_relations_panel.summary.graph_node_count, 0, 'disabled family relation panel should not expose graph nodes')
assert.equal(loverFamilyRelations.family_relations_panel.privacy.local_npc_nodes_exposed, false, 'disabled family relation panel should keep local NPC graph private')
assert.match(loverFamilyRelations.family_relations_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled relation panel should explain family manor requirement')

const loverFamilyVisibility = await runtime.getCohabitationFamilyVisibility(created.contract.id, actor(owner))
assert.equal(loverFamilyVisibility.family_visibility_panel.visibility_settings_enabled, false, 'romance contracts should return a disabled family visibility panel')
assert.equal(loverFamilyVisibility.family_visibility_panel.write_enabled, false, 'disabled family visibility panel should not expose writes')
assert.equal(loverFamilyVisibility.family_visibility_panel.summary.public_profile_enabled, false, 'disabled family visibility panel should not publish profile')
assert.equal(loverFamilyVisibility.family_visibility_panel.privacy_guards.local_graph_import_enabled, false, 'disabled family visibility panel should not import local graph')
assert.match(loverFamilyVisibility.family_visibility_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled visibility panel should explain family manor requirement')

const loverFamilyFestivalSeats = await runtime.getCohabitationFamilyFestivalSeats(created.contract.id, actor(owner))
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.festival_seats_enabled, false, 'romance contracts should return a disabled family festival seat panel')
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.write_enabled, false, 'disabled family festival seat panel should not expose writes')
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.summary.preview_seat_count, 0, 'disabled family festival seat panel should not expose seats')
assert.match(loverFamilyFestivalSeats.family_festival_seats_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled festival seat panel should explain family manor requirement')

const partnerMoneyBeforeOrderIncome = readGameplayData(partner)?.player?.money
const fundIncomeOrder = await coopOrderRuntime.createCoopOrder({
  title: '家族基金候选',
  description: '用于验证公共订单收入只读预览',
  order_type: 'material_help',
  scope: 'public',
  deadline_at: Math.floor(Date.now() / 1000) + 3600,
  reward_type: 'money',
  reward_value: 45,
  reward_label: '共同基金候选',
}, actor(owner))
await coopOrderRuntime.acceptCoopOrder(fundIncomeOrder.id, actor(partner))
await coopOrderRuntime.submitCoopOrderDelivery(fundIncomeOrder.id, {
  result_note: '伙伴完成了共同基金候选订单',
}, actor(partner))
const fundIncomeConfirm = await coopOrderRuntime.confirmCoopOrderDelivery(fundIncomeOrder.id, actor(owner))
assert.equal(fundIncomeConfirm.receipt.status, 'confirmed', 'public order income setup should confirm receipt')
assert.equal(fundIncomeConfirm.receipt.reward_value, 45, 'public order income setup should keep reward amount')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeOrderIncome + 45, 'existing public order reward should still pay partner personal save')

const ownerRawBeforeFamilyOrders = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyOrders = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyOrders = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyOrdersRead = await runtime.getCohabitationFamilyOrders(familyContract.contract.id, actor(owner))
const familyOrdersPanel = familyOrdersRead.family_orders_panel
assert.equal(familyOrdersPanel.family_orders_enabled, true, 'family manor should expose family order panel')
assert.equal(familyOrdersPanel.readonly, true, 'family order panel should be read-only in first pass')
assert.equal(familyOrdersPanel.write_enabled, false, 'family order panel should not enable writes in first pass')
assert.equal(familyOrdersPanel.settlement_enabled, false, 'family order panel should not enable settlement in first pass')
assert.equal(familyOrdersPanel.summary.personal_money_merged, false, 'family order panel must not merge personal money')
assert.equal(familyOrdersPanel.summary.shared_fund_spend_enabled, false, 'family order panel should keep shared fund spending disabled')
assert.equal(familyOrdersPanel.summary.warehouse_withdraw_enabled, false, 'family order panel should keep warehouse withdrawal disabled')
assert.equal(familyOrdersPanel.settlement.reward_to_shared_fund_enabled, false, 'family order rewards should not enter shared fund yet')
assert.equal(familyOrdersPanel.settlement.reward_to_shared_warehouse_enabled, false, 'family order rewards should not enter shared warehouse yet')
assert.equal(familyOrdersPanel.summary.reward_to_shared_fund_candidate_count, 1, 'family order panel should preview confirmed public order income candidates')
assert.equal(familyOrdersPanel.summary.reward_to_shared_fund_preview_amount, 45, 'family order panel should sum public order income preview amount')
assert.equal(familyOrdersPanel.income_preview.income_credit_enabled, false, 'family order income preview should remain read-only')
assert.equal(familyOrdersPanel.income_preview.current_fund_balance, 0, 'income preview should read current shared fund balance without changing it')
assert.equal(familyOrdersPanel.income_preview.preview_balance_after_candidates, 45, 'income preview should calculate hypothetical fund balance')
assert.equal(familyOrdersPanel.income_preview.credit_helper.mode, 'draft_only', 'income preview credit helper should stay draft-only')
assert.equal(familyOrdersPanel.income_preview.credit_helper.requires_exchange_lock, true, 'income preview credit helper should require exchange lock')
assert.equal(familyOrdersPanel.income_preview.credit_helper.requires_personal_reward_not_paid, true, 'income preview credit helper should guard against double reward')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.receipt_id, fundIncomeConfirm.receipt.id, 'income preview should reference the confirmed order receipt')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.amount, 45, 'income preview candidate should keep receipt reward amount')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.assignee_username, partner, 'income preview should link candidate to contract member assignee')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_enabled, false, 'income preview candidate should not enable writes')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.personal_reward_already_paid, true, 'income preview should disclose current personal reward behavior')
assert.match(familyOrdersPanel.income_preview.candidates[0]?.proposed_idempotency_key || '', /^fund-order-income:/, 'income preview should propose a future idempotency key')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.mode, 'draft_only', 'income preview candidate should expose draft credit plan')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.can_credit, false, 'income preview credit plan should not allow credit after personal payout')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.ledger_draft?.action, 'order_income', 'income preview credit plan should draft order income ledger')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.ledger_draft?.amount, 45, 'income preview credit plan should keep ledger amount')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.ledger_draft?.balance_after, 45, 'income preview credit plan should calculate balance after draft')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.lock_requirements?.requires_duplicate_target_ref_check, true, 'income preview credit plan should require duplicate target guard')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.audit_draft?.action, 'fund_order_income_credited', 'income preview credit plan should draft audit action')
assert.equal(familyOrdersPanel.income_preview.candidates[0]?.credit_plan?.compensation_plan?.requires_replay_queue, true, 'income preview credit plan should require replay compensation')
assert.equal(familyOrdersPanel.settlement.idempotency_required, true, 'future family order writes should require idempotency')
assert.equal(familyOrdersPanel.settlement.audit_required, true, 'future family order writes should require audit')
assert.equal(familyOrdersPanel.settlement.compensation_required, true, 'future family order writes should require compensation')
assert.equal(familyOrdersPanel.governance.reuse_public_order_relay, true, 'family order panel should reuse public relay visual model')
assert.equal(familyOrdersPanel.order_sources.find(source => source.id === 'coop_order_relay')?.binding_enabled, false, 'family order panel should not bind public orders to contract yet')
assert.equal(familyOrdersPanel.actor.manor_role, 'family_head', 'family order actor should expose family head role')
assert.equal(familyOrdersPanel.actor.order_permissions.can_manage_order_rules_preview, true, 'family head should preview order rule management')
assert.equal(familyOrdersPanel.members.find(member => member.username === partner)?.manor_role, 'storage_keeper', 'family order members should reflect updated storage keeper role')
assert.equal(familyOrdersPanel.members.find(member => member.username === partner)?.order_permissions.can_prepare_warehouse_reward_preview, true, 'storage keeper should preview warehouse reward preparation only')
assert.equal(familyOrdersPanel.members.find(member => member.username === extra)?.manor_role, 'farm_steward', 'family order members should keep farm steward role')
assert.ok(familyOrdersPanel.candidate_order_types.some(stage => stage.id === 'gather_materials'), 'family order panel should expose gathering stage draft')
assert.ok(familyOrdersPanel.visual_state_preview.async_projects[0]?.stages.some(stage => stage.id === 'handoff_confirm'), 'family order visual preview should expose handoff stage')
assert.ok(familyOrdersPanel.deferred_operations.includes('settle_to_shared_fund'), 'family order panel should defer shared fund settlement')
assert.ok(familyOrdersPanel.deferred_operations.includes('family_order_rollback'), 'family order panel should defer rollback tooling')
const repeatedFamilyOrdersRead = await runtime.getCohabitationFamilyOrders(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyOrdersRead.family_orders_panel.visual_state_preview.board_id, familyOrdersPanel.visual_state_preview.board_id, 'family order preview board id should stay stable across reads')
assert.equal(repeatedFamilyOrdersRead.family_orders_panel.revision, familyOrdersPanel.revision, 'family order preview revision should stay stable across reads')
assert.equal(repeatedFamilyOrdersRead.family_orders_panel.income_preview.candidates[0]?.receipt_id, fundIncomeConfirm.receipt.id, 'family order income preview should stay stable across reads')
assert.equal(repeatedFamilyOrdersRead.contract.audit_log.length, familyOrdersRead.contract.audit_log.length, 'family order reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyOrders, 'family order panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyOrders, 'family order panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyOrders, 'family order panel should not rewrite extra save')

const partnerMoneyBeforeSharedFundOrderIncome = readGameplayData(partner)?.player?.money
const sharedFundIncomeOrder = await coopOrderRuntime.createCoopOrder({
  title: '家族基金入账',
  description: '用于验证公共订单收入真实写入共同基金',
  order_type: 'material_help',
  scope: 'public',
  target_username: partner,
  deadline_at: Math.floor(Date.now() / 1000) + 3600,
  reward_type: 'money',
  reward_value: 65,
  reward_label: '共同基金入账',
}, actor(owner))
await coopOrderRuntime.acceptCoopOrder(sharedFundIncomeOrder.id, actor(partner))
await coopOrderRuntime.submitCoopOrderDelivery(sharedFundIncomeOrder.id, {
  result_note: '伙伴完成了共同基金入账订单',
}, actor(partner))
const sharedFundIncomeConfirm = await coopOrderRuntime.confirmCoopOrderDelivery(sharedFundIncomeOrder.id, actor(owner), {
  reward_route: 'shared_fund',
  cohabitation_contract_id: familyContract.contract.id,
  sharedFundCreditHandler: ({ receipt, contract_id: contractId }) =>
    runtime.creditCohabitationOrderIncome(contractId, receipt, actor(owner)),
})
assert.equal(sharedFundIncomeConfirm.receipt.status, 'confirmed', 'shared fund order income should confirm receipt')
assert.equal(sharedFundIncomeConfirm.receipt.reward_route, 'shared_fund', 'shared fund order income should mark receipt route')
assert.equal(sharedFundIncomeConfirm.receipt.cohabitation_contract_id, familyContract.contract.id, 'shared fund order income should keep target contract id')
assert.ok(sharedFundIncomeConfirm.receipt.shared_fund_ledger_id, 'shared fund order income should keep fund ledger id on receipt')
assert.equal(sharedFundIncomeConfirm.shared_fund_credit.fund_ledger_entry.action, 'order_income', 'shared fund order income should write order_income ledger')
assert.equal(sharedFundIncomeConfirm.shared_fund_credit.fund_ledger_entry.amount, 65, 'shared fund order income ledger should keep reward amount')
assert.equal(sharedFundIncomeConfirm.shared_fund_credit.shared_fund.balance_before, 0, 'shared fund order income should report previous fund balance')
assert.equal(sharedFundIncomeConfirm.shared_fund_credit.shared_fund.balance_after, 65, 'shared fund order income should increase fund balance')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeSharedFundOrderIncome, 'shared fund order income should not pay partner personal save')
const repeatedSharedFundOrderIncome = await runtime.creditCohabitationOrderIncome(
  familyContract.contract.id,
  sharedFundIncomeConfirm.receipt,
  actor(owner)
)
assert.equal(repeatedSharedFundOrderIncome.idempotent, true, 'shared fund order income helper should be idempotent')
assert.equal(repeatedSharedFundOrderIncome.fund.balance, 65, 'shared fund order income helper should not credit balance twice')
assert.ok(repeatedSharedFundOrderIncome.contract.audit_log.find(entry => entry.action === 'fund_order_income_credited'), 'shared fund order income should be audited')

const partnerMoneyBeforeSharedFundCompensationReplay = readGameplayData(partner)?.player?.money
const sharedFundReplayOrder = await coopOrderRuntime.createCoopOrder({
  title: '家族基金补偿',
  description: '用于验证公共订单共同基金补偿重放',
  order_type: 'material_help',
  scope: 'public',
  target_username: partner,
  deadline_at: Math.floor(Date.now() / 1000) + 3600,
  reward_type: 'money',
  reward_value: 35,
  reward_label: '共同基金补偿',
}, actor(owner))
await coopOrderRuntime.acceptCoopOrder(sharedFundReplayOrder.id, actor(partner))
await coopOrderRuntime.submitCoopOrderDelivery(sharedFundReplayOrder.id, {
  result_note: '伙伴完成了共同基金补偿订单',
}, actor(partner))
const sharedFundReplayPending = await coopOrderRuntime.confirmCoopOrderDelivery(sharedFundReplayOrder.id, actor(owner), {
  reward_route: 'shared_fund',
  cohabitation_contract_id: familyContract.contract.id,
  sharedFundCreditHandler: () => {
    throw new Error('qa forced shared fund credit failure')
  },
})
assert.equal(sharedFundReplayPending.receipt.status, 'compensation_pending', 'failed shared fund order income should enter compensation queue')
assert.equal(sharedFundReplayPending.receipt.reward_route, 'shared_fund', 'failed shared fund order income should preserve receipt route')
assert.equal(sharedFundReplayPending.receipt.cohabitation_contract_id, familyContract.contract.id, 'failed shared fund order income should preserve contract id')
assert.equal(sharedFundReplayPending.compensation.status, 'pending', 'failed shared fund order income should create pending compensation')
assert.equal((await runtime.getCohabitationFund(familyContract.contract.id, actor(owner))).fund.balance, 65, 'failed shared fund order income should not credit fund before replay')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeSharedFundCompensationReplay, 'failed shared fund order income should not pay partner personal save')
const sharedFundReplayResolved = await coopOrderRuntime.replayCoopOrderCompensation(sharedFundReplayPending.compensation.id, actor(owner), {
  sharedFundCreditHandler: ({ receipt, contract_id: contractId }) =>
    runtime.creditCohabitationOrderIncome(contractId, receipt, actor(owner)),
})
assert.equal(sharedFundReplayResolved.compensation.status, 'resolved', 'shared fund order income compensation replay should resolve compensation')
assert.equal(sharedFundReplayResolved.receipt.status, 'confirmed', 'shared fund order income compensation replay should confirm receipt')
assert.equal(sharedFundReplayResolved.receipt.reward_route, 'shared_fund', 'shared fund order income compensation replay should keep shared fund route')
assert.equal(sharedFundReplayResolved.receipt.cohabitation_contract_id, familyContract.contract.id, 'shared fund order income compensation replay should keep target contract')
assert.ok(sharedFundReplayResolved.receipt.shared_fund_ledger_id, 'shared fund order income compensation replay should store fund ledger id')
assert.equal(sharedFundReplayResolved.shared_fund_credit.fund_ledger_entry.action, 'order_income', 'shared fund replay should write order_income ledger')
assert.equal(sharedFundReplayResolved.shared_fund_credit.fund_ledger_entry.amount, 35, 'shared fund replay ledger should keep compensation amount')
assert.equal(sharedFundReplayResolved.shared_fund_credit.shared_fund.balance_before, 65, 'shared fund replay should read balance before replay')
assert.equal(sharedFundReplayResolved.shared_fund_credit.shared_fund.balance_after, 100, 'shared fund replay should credit balance once')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeSharedFundCompensationReplay, 'shared fund replay should still not pay partner personal save')
const repeatedSharedFundReplayCredit = await runtime.creditCohabitationOrderIncome(
  familyContract.contract.id,
  sharedFundReplayResolved.receipt,
  actor(owner)
)
assert.equal(repeatedSharedFundReplayCredit.idempotent, true, 'shared fund replay credit should remain idempotent')
assert.equal(repeatedSharedFundReplayCredit.fund.balance, 100, 'shared fund replay credit should not double credit after replay')

const partnerMoneyBeforeAdminSharedFundCompensationReplay = readGameplayData(partner)?.player?.money
const adminSharedFundReplayOrder = await coopOrderRuntime.createCoopOrder({
  title: 'admin shared fund replay',
  description: 'verify admin retry keeps shared fund settlement actor',
  order_type: 'material_help',
  scope: 'public',
  target_username: partner,
  deadline_at: Math.floor(Date.now() / 1000) + 3600,
  reward_type: 'money',
  reward_value: 15,
  reward_label: 'admin shared fund compensation',
}, actor(owner))
await coopOrderRuntime.acceptCoopOrder(adminSharedFundReplayOrder.id, actor(partner))
await coopOrderRuntime.submitCoopOrderDelivery(adminSharedFundReplayOrder.id, {
  result_note: 'partner completed admin shared fund compensation order',
}, actor(partner))
const adminSharedFundReplayPending = await coopOrderRuntime.confirmCoopOrderDelivery(adminSharedFundReplayOrder.id, actor(owner), {
  reward_route: 'shared_fund',
  cohabitation_contract_id: familyContract.contract.id,
  sharedFundCreditHandler: () => {
    throw new Error('qa forced admin shared fund credit failure')
  },
})
assert.equal(adminSharedFundReplayPending.receipt.status, 'compensation_pending', 'admin shared fund replay setup should enter compensation queue')
assert.equal((await runtime.getCohabitationFund(familyContract.contract.id, actor(owner))).fund.balance, 100, 'admin shared fund replay setup should not credit fund before retry')
const adminSharedFundReplayResolved = await coopOrderRuntime.replayCoopOrderCompensation(
  adminSharedFundReplayPending.compensation.id,
  {
    ...actor('qa_admin'),
    role: 'admin',
  },
  {
    sharedFundCreditHandler: ({ receipt, contract_id: contractId }) =>
      runtime.creditCohabitationOrderIncome(contractId, receipt, actor(receipt.owner_username)),
  }
)
assert.equal(adminSharedFundReplayResolved.compensation.status, 'resolved', 'admin shared fund compensation replay should resolve compensation')
assert.equal(adminSharedFundReplayResolved.receipt.status, 'confirmed', 'admin shared fund compensation replay should confirm receipt')
assert.equal(adminSharedFundReplayResolved.receipt.reward_route, 'shared_fund', 'admin shared fund compensation replay should keep shared fund route')
assert.equal(adminSharedFundReplayResolved.shared_fund_credit.fund_ledger_entry.action, 'order_income', 'admin shared fund replay should write order_income ledger')
assert.equal(adminSharedFundReplayResolved.shared_fund_credit.fund_ledger_entry.actor_username, owner, 'admin shared fund replay should credit as receipt owner for member validation')
assert.equal(adminSharedFundReplayResolved.shared_fund_credit.shared_fund.balance_before, 100, 'admin shared fund replay should read balance before admin retry')
assert.equal(adminSharedFundReplayResolved.shared_fund_credit.shared_fund.balance_after, 115, 'admin shared fund replay should credit balance once')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeAdminSharedFundCompensationReplay, 'admin shared fund replay should not pay partner personal save')

const partnerTeaBeforeFamilyDeposit = getInventoryItemQuantity(partner, 'tea')
const familyWarehouseBeforeDeposit = await runtime.getCohabitationWarehouse(familyContract.contract.id, actor(partner))
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.family_manor_warehouse, true, 'family warehouse snapshot should mark family manor mode')
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.role_based_storage_permissions, true, 'family warehouse should use role-based storage permissions')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.actor.manor_role, 'storage_keeper', 'family warehouse actor should expose storage keeper role')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.actor.manor_role_label, '管仓', 'family warehouse actor should expose role label')
assert.equal(familyWarehouseBeforeDeposit.warehouse.permissions.can_withdraw_common, true, 'storage keeper should expose common withdrawal permission preview')
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.withdraw_enabled, true, 'family warehouse should allow common withdrawal for storage keeper')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.members.find(member => member.username === partner)?.storage_permissions.can_withdraw_common_preview, true, 'storage keeper should preview common withdrawal permission')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.members.find(member => member.username === partner)?.storage_permissions.withdraw_enabled, true, 'storage keeper should get real common withdrawal flag')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.members.find(member => member.username === extra)?.storage_permissions.can_withdraw_common_preview, false, 'farm steward should not preview common withdrawal permission')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.governance.withdraw_flow_enabled, true, 'family warehouse should expose common withdraw governance for storage keeper')
assert.ok(familyWarehouseBeforeDeposit.warehouse.family_warehouse.deferred_operations.includes('warehouse_freeze_and_revert'), 'family warehouse should defer freeze and revert tooling')
const familyWarehouseDeposit = await runtime.depositCohabitationWarehouseItem(familyContract.contract.id, {
  item_id: 'tea',
  quantity: 1,
  quality: 'normal',
  idempotency_key: 'qa-family-warehouse-tea-deposit',
}, actor(partner))
assert.equal(familyWarehouseDeposit.warehouse.summary.total_quantity, 1, 'family warehouse deposit should add shared stock')
assert.equal(familyWarehouseDeposit.ledger_entry.actor_manor_role, 'storage_keeper', 'family warehouse ledger should capture actor family role')
assert.equal(familyWarehouseDeposit.ledger_entry.actor_manor_role_label, '管仓', 'family warehouse ledger should capture actor role label')
assert.equal(familyWarehouseDeposit.ledger_entry.source_owner_manor_role, 'storage_keeper', 'family warehouse ledger should capture source owner role')
assert.equal(familyWarehouseDeposit.warehouse.family_warehouse.source_owner_summary.find(entry => entry.origin_owner_username === partner)?.total_quantity, 1, 'family warehouse should summarize source owner quantities')
assert.equal(getInventoryItemQuantity(partner, 'tea'), partnerTeaBeforeFamilyDeposit - 1, 'family warehouse deposit should deduct partner personal inventory once')
assert.ok(familyWarehouseDeposit.contract.origin_assets.warehouse_items.some(item => item.origin_owner_manor_role === 'storage_keeper'), 'family warehouse origin assets should retain family role at deposit time')

const ownerRawBeforeFamilyReputation = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyReputation = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyReputation = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyReputationRead = await runtime.getCohabitationFamilyReputation(familyContract.contract.id, actor(owner))
const familyReputationPanel = familyReputationRead.family_reputation_panel
assert.equal(familyReputationPanel.reputation_enabled, true, 'family manor should expose reputation panel')
assert.equal(familyReputationPanel.readonly, true, 'family reputation panel should be read-only in first pass')
assert.equal(familyReputationPanel.write_enabled, false, 'family reputation panel should not enable writes')
assert.equal(familyReputationPanel.summary.reputation_award_enabled, false, 'family reputation should not award persistent points yet')
assert.equal(familyReputationPanel.summary.leaderboard_enabled, false, 'family reputation should not expose leaderboard yet')
assert.equal(familyReputationPanel.summary.personal_reward_enabled, false, 'family reputation should not grant personal rewards yet')
assert.equal(familyReputationPanel.summary.personal_money_merged, false, 'family reputation must not merge personal money')
assert.ok(familyReputationPanel.summary.current_points > 0, 'family reputation preview should count existing audited activity')
assert.equal(familyReputationPanel.summary.level.id, 'seed', 'small audited activity should remain in first reputation tier')
assert.equal(familyReputationPanel.actor.manor_role, 'family_head', 'family reputation actor should expose family head role')
assert.equal(familyReputationPanel.actor.can_manage_reputation_rules_preview, true, 'family head should preview reputation rule management')
assert.equal(familyReputationPanel.source_breakdown.find(source => source.id === 'family_governance')?.evidence.role_update_count, 1, 'reputation should count role update audit evidence')
assert.equal(familyReputationPanel.source_breakdown.find(source => source.id === 'shared_warehouse_stewardship')?.evidence.deposit_count, 1, 'reputation should count committed warehouse deposit evidence')
assert.equal(familyReputationPanel.source_breakdown.find(source => source.id === 'family_orders')?.enabled, false, 'family orders should not grant reputation before real settlement')
assert.equal(familyReputationPanel.governance.idempotency_required_for_future_writes, true, 'future reputation writes should require idempotency')
assert.equal(familyReputationPanel.governance.compensation_required_for_future_rewards, true, 'future reputation rewards should require compensation path')
assert.ok(familyReputationPanel.deferred_operations.includes('family_reputation_weekly_cap'), 'family reputation should defer weekly cap implementation')
assert.ok(familyReputationPanel.deferred_operations.includes('family_reputation_compensation_replay'), 'family reputation should defer compensation replay')
assert.equal(familyReputationPanel.members.find(member => member.username === partner)?.warehouse_deposit_count, 1, 'reputation member stats should count partner warehouse deposit')
assert.equal(familyReputationPanel.members.find(member => member.username === partner)?.manor_role, 'storage_keeper', 'reputation member stats should reflect family role')
const repeatedFamilyReputationRead = await runtime.getCohabitationFamilyReputation(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyReputationRead.family_reputation_panel.revision, familyReputationPanel.revision, 'family reputation preview revision should stay stable across reads')
assert.equal(repeatedFamilyReputationRead.family_reputation_panel.summary.current_points, familyReputationPanel.summary.current_points, 'family reputation preview points should stay stable across reads')
assert.equal(repeatedFamilyReputationRead.contract.audit_log.length, familyReputationRead.contract.audit_log.length, 'family reputation reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyReputation, 'family reputation panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyReputation, 'family reputation panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyReputation, 'family reputation panel should not rewrite extra save')

const ownerRawBeforeFamilyBuildings = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyBuildings = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyBuildings = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyBuildingsRead = await runtime.getCohabitationFamilyBuildings(familyContract.contract.id, actor(owner))
const familyBuildingsPanel = familyBuildingsRead.family_buildings_panel
assert.equal(familyBuildingsPanel.family_buildings_enabled, true, 'family manor should expose building panel')
assert.equal(familyBuildingsPanel.readonly, true, 'family building panel should be read-only in first pass')
assert.equal(familyBuildingsPanel.write_enabled, false, 'family building panel should not enable writes')
assert.equal(familyBuildingsPanel.build_enabled, false, 'family building panel should not build yet')
assert.equal(familyBuildingsPanel.demolish_enabled, false, 'family building panel should not demolish yet')
assert.equal(familyBuildingsPanel.summary.preview_building_count, 4, 'family building panel should expose four building drafts')
assert.equal(familyBuildingsPanel.summary.shared_fund_spend_enabled, false, 'family building panel should not spend shared fund')
assert.equal(familyBuildingsPanel.summary.material_consume_enabled, false, 'family building panel should not consume warehouse materials')
assert.equal(familyBuildingsPanel.summary.demolition_enabled, false, 'family building panel should not enable demolition')
assert.equal(familyBuildingsPanel.summary.construction_ledger_enabled, true, 'family building panel should expose construction ledger reads')
assert.equal(familyBuildingsPanel.summary.construction_ledger_count, 0, 'family building panel should start without construction ledger entries')
assert.equal(familyBuildingsPanel.construction_ledger.length, 0, 'family building panel should return an empty construction ledger before large execution')
assert.equal(familyBuildingsPanel.actor.manor_role, 'family_head', 'family building actor should expose family head role')
assert.equal(familyBuildingsPanel.actor.building_permissions.can_manage_building_rules_preview, true, 'family head should preview building rule management')
assert.equal(familyBuildingsPanel.members.find(member => member.username === partner)?.manor_role, 'storage_keeper', 'family building members should reflect updated storage keeper role')
assert.equal(familyBuildingsPanel.members.find(member => member.username === partner)?.building_permissions.can_prepare_materials_preview, true, 'storage keeper should preview material preparation')
assert.equal(familyBuildingsPanel.candidate_buildings.find(building => building.id === 'shared_granary')?.role_ready, true, 'shared granary should be role-ready with storage keeper and farm steward')
assert.ok(familyBuildingsPanel.candidate_buildings.find(building => building.id === 'family_hall')?.missing_roles.includes('workshop_keeper'), 'family hall should report missing workshop keeper')
assert.equal(familyBuildingsPanel.candidate_buildings.find(building => building.id === 'shared_granary')?.material_consume_enabled, false, 'building draft should not consume materials')
assert.equal(familyBuildingsPanel.candidate_buildings.find(building => building.id === 'shared_granary')?.shared_fund_spend_enabled, false, 'building draft should not spend shared fund')
assert.equal(familyBuildingsPanel.visual_state_preview.board_type, 'scene', 'family building preview should use scene visual state')
assert.ok(familyBuildingsPanel.visual_state_preview.scene_objects.some(object => object.id === 'family_building_blueprint_table'), 'family building preview should expose blueprint table')
assert.equal(familyBuildingsPanel.visual_state_preview.scene_objects.find(object => object.id === 'family_building_granary_ghost')?.state, 'ready_for_blueprint', 'family building preview should mark granary as role-ready')
assert.equal(familyBuildingsPanel.governance.building_write_requires_idempotency, true, 'future building writes should require idempotency')
assert.equal(familyBuildingsPanel.governance.demolition_requires_both_confirmation, true, 'future building demolition should require confirmation')
assert.equal(familyBuildingsPanel.asset_boundaries.shared_fund_consume_enabled, false, 'family buildings should not consume shared fund in first pass')
assert.ok(familyBuildingsPanel.deferred_operations.includes('spend_shared_fund_for_building'), 'family building panel should defer shared fund spending')
assert.ok(familyBuildingsPanel.deferred_operations.includes('family_building_compensation_replay'), 'family building panel should defer compensation replay')
const repeatedFamilyBuildingsRead = await runtime.getCohabitationFamilyBuildings(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyBuildingsRead.family_buildings_panel.visual_state_preview.board_id, familyBuildingsPanel.visual_state_preview.board_id, 'family building preview board id should stay stable across reads')
assert.equal(repeatedFamilyBuildingsRead.family_buildings_panel.revision, familyBuildingsPanel.revision, 'family building preview revision should stay stable across reads')
assert.equal(repeatedFamilyBuildingsRead.contract.audit_log.length, familyBuildingsRead.contract.audit_log.length, 'family building reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyBuildings, 'family building panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyBuildings, 'family building panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyBuildings, 'family building panel should not rewrite extra save')

const ownerRawBeforeFamilyRelations = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyRelations = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyRelations = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyRelationsRead = await runtime.getCohabitationFamilyRelations(familyContract.contract.id, actor(owner))
const familyRelationsPanel = familyRelationsRead.family_relations_panel
assert.equal(familyRelationsPanel.family_relations_enabled, true, 'family manor should expose relation graph panel')
assert.equal(familyRelationsPanel.readonly, true, 'family relation panel should be read-only in first pass')
assert.equal(familyRelationsPanel.write_enabled, false, 'family relation panel should not enable writes')
assert.equal(familyRelationsPanel.summary.accepted_member_count, 3, 'family relation panel should count accepted members')
assert.equal(familyRelationsPanel.summary.pending_member_count, 0, 'family relation panel should count pending members')
assert.equal(familyRelationsPanel.summary.role_management_enabled, true, 'family relation panel should mark role management for family manor')
assert.equal(familyRelationsPanel.summary.local_save_family_graph_included, false, 'family relation panel should not include local family graph')
assert.equal(familyRelationsPanel.summary.private_single_player_graph_exposed, false, 'family relation panel should not expose private single-player graph')
assert.equal(familyRelationsPanel.summary.random_npc_nodes_exposed, false, 'family relation panel should not expose random NPC nodes')
assert.equal(familyRelationsPanel.summary.children_nodes_exposed, false, 'family relation panel should not expose children nodes')
assert.equal(familyRelationsPanel.summary.pets_exposed, false, 'family relation panel should not expose pet nodes')
assert.equal(familyRelationsPanel.summary.personal_money_merged, false, 'family relation panel should not merge personal money')
assert.equal(familyRelationsPanel.actor.manor_role, 'family_head', 'family relation actor should expose family head role')
assert.equal(familyRelationsPanel.actor.permissions_summary.can_manage_roles_preview, true, 'family head should preview role management from relation graph')
assert.ok(familyRelationsPanel.members.find(member => member.username === partner)?.permissions_summary.can_prepare_materials_preview, 'storage keeper should preview material preparation relation')
assert.ok(familyRelationsPanel.graph.nodes.some(node => node.id === `member:${owner}`), 'family relation graph should expose owner member node')
assert.ok(familyRelationsPanel.graph.nodes.some(node => node.id === 'role:storage_keeper'), 'family relation graph should expose storage keeper role node')
assert.ok(familyRelationsPanel.graph.nodes.some(node => node.id === 'capability:family_buildings'), 'family relation graph should expose family building capability node')
assert.ok(familyRelationsPanel.graph.links.some(link => link.from === `member:${partner}` && link.to === 'role:storage_keeper'), 'family relation graph should link member to current manor role')
assert.ok(familyRelationsPanel.graph.links.some(link => link.kind === 'family_capability' && link.to === 'capability:family_festival_seats'), 'family relation graph should link family festival seats as a capability')
assert.equal(familyRelationsPanel.visual_state_preview.board_type, 'map', 'family relation preview should use map visual state for graph layout')
assert.equal(familyRelationsPanel.visual_state_preview.nodes.length, familyRelationsPanel.graph.nodes.length, 'family relation visual preview should mirror graph nodes')
assert.equal(familyRelationsPanel.constraints.personal_relationships_private, true, 'family relation panel should keep personal relationships private in constraints')
assert.ok(familyRelationsPanel.recent_role_audits.some(entry => entry.action === 'family_role_updated'), 'family relation panel should expose recent role audits without writing new audit')
const forbiddenFamilyRelationNodePrefixes = ['fixed:', 'child:', 'pet:', 'visitor:', 'acquaintance:', 'resident:', 'spirit:']
assert.equal(
  familyRelationsPanel.graph.nodes.some(node => forbiddenFamilyRelationNodePrefixes.some(prefix => String(node.id || '').startsWith(prefix))),
  false,
  'family relation graph should not leak local NPC, child, pet, visitor, resident, or spirit nodes'
)
assert.equal(familyRelationsPanel.privacy.personal_save_read_enabled, false, 'family relation panel should not read personal save relationship data')
assert.equal(familyRelationsPanel.privacy.local_npc_nodes_exposed, false, 'family relation panel should keep fixed NPC nodes private')
assert.equal(familyRelationsPanel.privacy.random_npc_nodes_exposed, false, 'family relation panel should keep random NPC nodes private')
assert.equal(familyRelationsPanel.privacy.children_nodes_exposed, false, 'family relation panel should keep child nodes private')
assert.equal(familyRelationsPanel.privacy.pets_exposed, false, 'family relation panel should keep pet nodes private')
assert.equal(familyRelationsPanel.local_graph_compatibility.direct_local_state_reuse_enabled, false, 'online family relation graph should not directly reuse local FamilyRelationGraph state')
assert.equal(familyRelationsPanel.governance.future_publication_requires_consent, true, 'future relation graph publication should require consent')
assert.equal(familyRelationsPanel.governance.idempotency_required_for_future_writes, true, 'future relation graph writes should require idempotency')
assert.ok(familyRelationsPanel.deferred_operations.includes('publish_family_relation_graph_to_profile'), 'family relation panel should defer public profile publication')
assert.ok(familyRelationsPanel.deferred_operations.includes('relationship_visibility_audit'), 'family relation panel should defer visibility audit')
const repeatedFamilyRelationsRead = await runtime.getCohabitationFamilyRelations(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyRelationsRead.family_relations_panel.visual_state_preview.board_id, familyRelationsPanel.visual_state_preview.board_id, 'family relation preview board id should stay stable across reads')
assert.equal(repeatedFamilyRelationsRead.family_relations_panel.revision, familyRelationsPanel.revision, 'family relation preview revision should stay stable across reads')
assert.equal(repeatedFamilyRelationsRead.contract.audit_log.length, familyRelationsRead.contract.audit_log.length, 'family relation reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyRelations, 'family relation panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyRelations, 'family relation panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyRelations, 'family relation panel should not rewrite extra save')

const ownerRawBeforeFamilyVisibility = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyVisibility = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyVisibility = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyVisibilityRead = await runtime.getCohabitationFamilyVisibility(familyContract.contract.id, actor(owner))
const familyVisibilityPanel = familyVisibilityRead.family_visibility_panel
assert.equal(familyVisibilityPanel.visibility_settings_enabled, true, 'family manor should expose visibility policy panel')
assert.equal(familyVisibilityPanel.readonly, true, 'family visibility panel should be read-only in first pass')
assert.equal(familyVisibilityPanel.write_enabled, false, 'family visibility panel should not enable writes')
assert.equal(familyVisibilityPanel.summary.default_scope, 'contract_members_only', 'family visibility should default to contract members only')
assert.equal(familyVisibilityPanel.summary.public_profile_enabled, false, 'family visibility should not publish profile')
assert.equal(familyVisibilityPanel.summary.festival_room_binding_enabled, false, 'family visibility should not bind festival room')
assert.equal(familyVisibilityPanel.summary.local_graph_publication_enabled, false, 'family visibility should not publish local graph')
assert.equal(familyVisibilityPanel.summary.personal_graph_auto_publish_enabled, false, 'family visibility should not auto publish personal graph')
assert.equal(familyVisibilityPanel.summary.consent_required, true, 'family visibility publication should require consent')
assert.equal(familyVisibilityPanel.summary.visibility_audit_enabled, false, 'family visibility should not write audit in first pass')
assert.equal(familyVisibilityPanel.actor.manor_role, 'family_head', 'family visibility actor should expose family head role')
assert.equal(familyVisibilityPanel.actor.visibility_permissions.can_manage_visibility_preview, true, 'family head should preview visibility management')
assert.equal(familyVisibilityPanel.members.find(member => member.username === partner)?.visibility_permissions.can_publish_personal_graph_preview, false, 'members should not publish personal graph in first pass')
assert.equal(familyVisibilityPanel.visibility_scopes.find(scope => scope.id === 'contract_members')?.enabled, true, 'contract members scope should be enabled')
assert.equal(familyVisibilityPanel.visibility_scopes.find(scope => scope.id === 'public_profile')?.enabled, false, 'public profile scope should be disabled')
assert.equal(familyVisibilityPanel.data_categories.find(category => category.id === 'contract_members')?.online_visible, true, 'contract member nodes should be visible to contract members')
assert.equal(familyVisibilityPanel.data_categories.find(category => category.id === 'fixed_npcs')?.online_visible, false, 'fixed NPC relationships should stay private')
assert.equal(familyVisibilityPanel.data_categories.find(category => category.id === 'children')?.publication_allowed, false, 'children should not be publishable')
assert.equal(familyVisibilityPanel.data_categories.find(category => category.id === 'pets')?.publication_allowed, false, 'pets should not be publishable')
assert.equal(familyVisibilityPanel.data_categories.find(category => category.id === 'romance_state')?.publication_allowed, false, 'romance state should not be publishable')
assert.equal(familyVisibilityPanel.default_policy.non_members_can_read, false, 'non-members should not read family visibility')
assert.equal(familyVisibilityPanel.default_policy.owner_cannot_publish_others_private_graph, true, 'owner should not publish other members private graph')
assert.equal(familyVisibilityPanel.privacy_guards.personal_save_read_enabled, false, 'visibility panel should not read personal save')
assert.equal(familyVisibilityPanel.privacy_guards.random_npcs_private, true, 'visibility panel should keep random NPCs private')
assert.equal(familyVisibilityPanel.governance.future_writes_require_idempotency, true, 'future visibility writes should require idempotency')
assert.equal(familyVisibilityPanel.governance.future_publication_requires_all_visible_member_consent, true, 'future visibility publication should require consent')
assert.ok(familyVisibilityPanel.deferred_operations.includes('visibility_audit_log'), 'visibility panel should defer visibility audit')
assert.ok(familyVisibilityPanel.deferred_operations.includes('visibility_rollback'), 'visibility panel should defer visibility rollback')
const repeatedFamilyVisibilityRead = await runtime.getCohabitationFamilyVisibility(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyVisibilityRead.family_visibility_panel.revision, familyVisibilityPanel.revision, 'family visibility revision should stay stable across reads')
assert.equal(repeatedFamilyVisibilityRead.family_visibility_panel.summary.default_scope, familyVisibilityPanel.summary.default_scope, 'family visibility default scope should stay stable across reads')
assert.equal(repeatedFamilyVisibilityRead.contract.audit_log.length, familyVisibilityRead.contract.audit_log.length, 'family visibility reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyVisibility, 'family visibility panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyVisibility, 'family visibility panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyVisibility, 'family visibility panel should not rewrite extra save')

const ownerRawBeforeFamilyFestivalSeats = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyFestivalSeats = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyFestivalSeats = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familyFestivalSeatsRead = await runtime.getCohabitationFamilyFestivalSeats(familyContract.contract.id, actor(owner))
const familyFestivalSeatsPanel = familyFestivalSeatsRead.family_festival_seats_panel
assert.equal(familyFestivalSeatsPanel.festival_seats_enabled, true, 'family manor should expose festival seat panel')
assert.equal(familyFestivalSeatsPanel.readonly, true, 'family festival seat panel should be read-only in first pass')
assert.equal(familyFestivalSeatsPanel.write_enabled, false, 'family festival seat panel should not enable writes')
assert.equal(familyFestivalSeatsPanel.seat_reservation_enabled, false, 'family festival seat panel should not reserve seats yet')
assert.equal(familyFestivalSeatsPanel.festival_room_binding_enabled, false, 'family festival seat panel should not bind rooms yet')
assert.equal(familyFestivalSeatsPanel.summary.preview_seat_count, 3, 'three-member family manor should expose three preview seats')
assert.equal(familyFestivalSeatsPanel.summary.festival_room_create_enabled, false, 'family festival seat panel should not create festival rooms')
assert.equal(familyFestivalSeatsPanel.summary.shared_fund_spend_enabled, false, 'family festival seat panel should not spend shared fund')
assert.equal(familyFestivalSeatsPanel.summary.festival_ticket_spend_enabled, false, 'family festival seat panel should not spend festival tickets')
assert.equal(familyFestivalSeatsPanel.summary.reward_enabled, false, 'family festival seat panel should not grant rewards')
assert.equal(familyFestivalSeatsPanel.actor.manor_role, 'family_head', 'family festival actor should expose family head role')
assert.equal(familyFestivalSeatsPanel.actor.seat_permissions.can_manage_seat_rules_preview, true, 'family head should preview seat rule management')
assert.equal(familyFestivalSeatsPanel.actor.seat_permissions.can_open_festival_room, false, 'family festival seats should not open rooms directly')
assert.equal(familyFestivalSeatsPanel.members.find(member => member.username === partner)?.manor_role, 'storage_keeper', 'family festival members should reflect updated storage keeper role')
assert.equal(familyFestivalSeatsPanel.members.find(member => member.username === partner)?.seat_label, '供给席', 'storage keeper should map to supply festival seat')
assert.equal(familyFestivalSeatsPanel.members.find(member => member.username === extra)?.seat_label, '备料席', 'farm steward should map to material festival seat')
assert.equal(familyFestivalSeatsPanel.candidate_templates.find(template => template.id === 'dragon_boat')?.visual_type, 'track', 'family festival seats should expose dragon boat track template')
assert.equal(familyFestivalSeatsPanel.candidate_templates.find(template => template.id === 'lantern_fair')?.available, true, 'family festival seats should expose lantern fair as compatible')
assert.equal(familyFestivalSeatsPanel.candidate_templates.find(template => template.id === 'qixi_stroll')?.available, false, 'family festival seats should keep qixi as non-family default')
assert.equal(familyFestivalSeatsPanel.visual_state_preview.board_type, 'scene', 'family festival seat preview should use scene visual state')
assert.equal(familyFestivalSeatsPanel.visual_state_preview.seats.length, 3, 'family festival seat preview should expose member seats')
assert.ok(familyFestivalSeatsPanel.visual_state_preview.scene_objects.some(object => object.id === 'family_festival_banner'), 'family festival scene preview should expose family banner')
assert.equal(familyFestivalSeatsPanel.visual_state_preview.scene_objects.find(object => object.id === 'family_festival_guest_seats')?.seat_count, 3, 'family festival scene preview should count seats')
assert.equal(familyFestivalSeatsPanel.governance.seat_reservation_requires_idempotency, true, 'future seat reservations should require idempotency')
assert.equal(familyFestivalSeatsPanel.governance.compensation_required_for_future_rewards, true, 'future festival rewards should require compensation path')
assert.equal(familyFestivalSeatsPanel.governance.public_festival_room_scope_unchanged, true, 'family festival seats should not change public festival room scope')
assert.equal(familyFestivalSeatsPanel.settlement.reward_to_shared_fund_enabled, false, 'family festival rewards should not enter shared fund yet')
assert.ok(familyFestivalSeatsPanel.deferred_operations.includes('bind_family_seat_to_festival_room'), 'family festival seats should defer room binding')
assert.ok(familyFestivalSeatsPanel.deferred_operations.includes('family_festival_compensation_replay'), 'family festival seats should defer compensation replay')
const repeatedFamilyFestivalSeatsRead = await runtime.getCohabitationFamilyFestivalSeats(familyContract.contract.id, actor(owner))
assert.equal(repeatedFamilyFestivalSeatsRead.family_festival_seats_panel.visual_state_preview.board_id, familyFestivalSeatsPanel.visual_state_preview.board_id, 'family festival seat preview board id should stay stable across reads')
assert.equal(repeatedFamilyFestivalSeatsRead.family_festival_seats_panel.revision, familyFestivalSeatsPanel.revision, 'family festival seat preview revision should stay stable across reads')
assert.equal(repeatedFamilyFestivalSeatsRead.contract.audit_log.length, familyFestivalSeatsRead.contract.audit_log.length, 'family festival seat reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyFestivalSeats, 'family festival seat panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyFestivalSeats, 'family festival seat panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyFestivalSeats, 'family festival seat panel should not rewrite extra save')

const ownerRawBeforeFamilyMap = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyMap = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const extraRawBeforeFamilyMap = saveRuntime.loadUserSaveSlots(extra).slots[0].raw
const familySharedMapResult = await runtime.getCohabitationSharedMap(familyContract.contract.id, actor(extra))
const familySharedMap = familySharedMapResult.shared_map
assert.equal(familySharedMap.readonly, true, 'family shared map should stay read-only')
assert.equal(familySharedMap.writes_enabled, false, 'family shared map should not expose write operations')
assert.equal(familySharedMap.summary.member_count, 3, 'three-member family manor should expose all members in map summary')
assert.equal(familySharedMap.summary.multi_member_layout, true, 'family shared map should mark multi-member layout')
assert.equal(familySharedMap.summary.max_members, 4, 'family shared map should expose family max member cap')
assert.equal(familySharedMap.summary.total_plots, 48, 'three 4x4 farms should be stitched into one family map')
assert.equal(familySharedMap.summary.origin_owner_count, 3, 'family shared map should preserve three origin owners')
assert.equal(familySharedMap.summary.origin_trace_enabled, true, 'family shared map should declare origin traceability')
assert.equal(familySharedMap.summary.personal_money_merged, false, 'family shared map must not merge personal money')
assert.equal(familySharedMap.layout.columns, 12, 'three family farms should be placed side by side')
assert.equal(familySharedMap.layout.rows, 4, 'family shared map should keep member farm height')
assert.equal(familySharedMap.layout.regions.length, 3, 'family shared map should expose one region per member')
assert.equal(familySharedMap.layout.summary.family_manor_layout, true, 'layout summary should mark family manor layout')
assert.equal(familySharedMap.layout.summary.region_count, 3, 'layout summary should count family regions')
assert.equal(familySharedMap.layout.summary.stitch_axis, 'x', 'layout summary should expose horizontal stitch axis')
assert.deepEqual(familySharedMap.layout.summary.region_order.map(region => region.member_username), [owner, partner, extra], 'family region order should follow contract members')
assert.equal(familySharedMap.layout.regions.find(region => region.member_username === partner)?.manor_role, 'storage_keeper', 'family map regions should expose updated member role')
assert.equal(familySharedMap.members.find(member => member.username === partner)?.manor_role_label, '管仓', 'family map members should expose role labels')
assert.ok(familySharedMap.plots.some(plot => plot.origin_owner_username === extra && plot.origin_owner_id), 'family map plots should keep extra member origin owner id')
assert.ok(familySharedMap.summary.deferred_writes.includes('persistent_shared_manor_map'), 'family shared map should defer persistent map writes')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyMap, 'family shared map should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyMap, 'family shared map should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyMap, 'family shared map should not rewrite extra member save')

const fourMemberFamilyContract = await runtime.createCohabitationContract({
  type: 'business_partner',
  target_usernames: [partner, extra, fourth],
  idempotency_key: 'qa-business-family-four-member-map',
}, actor(owner))
await runtime.acceptCohabitationContract(fourMemberFamilyContract.contract.id, actor(partner))
await runtime.acceptCohabitationContract(fourMemberFamilyContract.contract.id, actor(extra))
const activeFourMemberFamily = await runtime.acceptCohabitationContract(fourMemberFamilyContract.contract.id, actor(fourth))
assert.equal(activeFourMemberFamily.contract.status, 'active', 'four-member business manor should activate after all members accept')
const fourRawBeforeFamilyMap = saveRuntime.loadUserSaveSlots(fourth).slots[0].raw
const fourMemberSharedMapResult = await runtime.getCohabitationSharedMap(fourMemberFamilyContract.contract.id, actor(fourth))
const fourMemberSharedMap = fourMemberSharedMapResult.shared_map
assert.equal(fourMemberSharedMap.summary.member_count, 4, 'four-member family map should expose all members')
assert.equal(fourMemberSharedMap.summary.total_plots, 64, 'four 4x4 farms should be stitched into one map')
assert.equal(fourMemberSharedMap.summary.origin_owner_count, 4, 'four-member map should preserve all origin owners')
assert.equal(fourMemberSharedMap.layout.columns, 16, 'four family farms should stitch horizontally')
assert.equal(fourMemberSharedMap.layout.regions.length, 4, 'four-member map should expose four regions')
assert.equal(fourMemberSharedMap.layout.summary.max_members, 4, 'layout summary should expose four-member cap')
assert.equal(fourMemberSharedMap.layout.summary.region_order[fourMemberSharedMap.layout.summary.region_order.length - 1]?.member_username, fourth, 'fourth member should receive the final region')
assert.equal(saveRuntime.loadUserSaveSlots(fourth).slots[0].raw, fourRawBeforeFamilyMap, 'four-member shared map should not rewrite fourth member save')

const ownerRiceBeforeSeparationWarehouseDeposit = getInventoryItemQuantity(owner, 'rice')
const separationWarehouseDeposit = await runtime.depositCohabitationWarehouseItem(created.contract.id, {
  item_id: 'rice',
  quantity: 1,
  quality: 'normal',
  idempotency_key: 'qa-separation-warehouse-rice-deposit',
}, actor(owner))
assert.equal(separationWarehouseDeposit.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 1, 'separation preview setup should leave traceable rice in shared warehouse')
assert.equal(getInventoryItemQuantity(owner, 'rice'), ownerRiceBeforeSeparationWarehouseDeposit - 1, 'separation warehouse setup should deduct owner rice once')

const ownerRawBeforePreview = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforePreview = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const previewResult = await runtime.createSeparationPreview(created.contract.id, {
  reason: 'qa preview',
  idempotency_key: 'qa-separation-preview',
}, actor(owner))
assert.equal(previewResult.idempotent, false, 'first separation preview should not be idempotent')
assert.equal(previewResult.preview.version, 1, 'separation preview should expose return checklist version')
assert.equal(previewResult.preview.requires_both_confirm, true, 'separation preview should require both confirmations')
assert.equal(previewResult.preview.manual_execution_required, true, 'separation preview should not execute asset return directly')
assert.ok(previewResult.preview.confirm_after_at > previewResult.preview.created_at, 'separation preview should enforce a cooldown window')
assert.equal(previewResult.preview.confirmation_state.can_execute_now, false, 'separation preview should not be executable immediately')
assert.equal(previewResult.preview.confirmation_state.execution_enabled, false, 'separation execution should stay disabled in first pass')
assert.deepEqual(previewResult.preview.confirmation_state.required_member_usernames.sort(), [owner, partner].sort(), 'separation preview should require accepted member confirmation')
assert.match(previewResult.preview.asset_return.personal_money_policy, /个人铜币/, 'preview should preserve personal money boundary')
assert.equal(previewResult.preview.asset_return.plot_return_summary.total_plots, 32, 'separation preview should include shared farm plot summary')
assert.equal(previewResult.preview.asset_return.plot_return_summary.manifest_plot_count, 32, 'separation preview should include every plot in the return manifest')
assert.equal(previewResult.preview.asset_return.plot_return_summary.manifest_complete, true, 'separation preview should mark the plot return manifest complete')
assert.match(previewResult.preview.asset_return.plot_return_manifest_hash, /^[a-f0-9]{64}$/, 'separation preview should expose a stable plot return manifest hash')
assert.equal(previewResult.preview.asset_return.plot_return_manifest.length, 32, 'separation preview should expose one manifest row per source plot')
const ownerReturnManifest = previewResult.preview.asset_return.plot_return_manifest.filter(item => item.origin_owner_username === owner)
const partnerReturnManifest = previewResult.preview.asset_return.plot_return_manifest.filter(item => item.origin_owner_username === partner)
assert.deepEqual(ownerReturnManifest.map(item => item.source_plot_id), Array.from({ length: 16 }, (_, index) => index), 'owner return manifest should preserve all owner source plot ids')
assert.deepEqual(partnerReturnManifest.map(item => item.source_plot_id), Array.from({ length: 16 }, (_, index) => index), 'partner return manifest should preserve all partner source plot ids')
assert.equal(ownerReturnManifest.find(item => item.source_plot_id === 0)?.plot_state_snapshot.crop_id, 'rice', 'owner return manifest should preserve plot state snapshot')
assert.equal(partnerReturnManifest.find(item => item.source_plot_id === 5)?.plot_state_snapshot.crop_id, 'tea', 'partner return manifest should preserve plot state snapshot')
assert.ok(previewResult.preview.safety_checks.find(item => item.id === 'plot_return_manifest_complete')?.passed, 'separation preview should pass complete plot manifest safety check')
assert.ok(previewResult.preview.asset_return.plots_by_origin_owner.some(item => item.origin_owner_username === owner && item.plot_count === 16), 'separation preview should include owner plot return group')
assert.ok(previewResult.preview.asset_return.plots_by_origin_owner.some(item => item.origin_owner_username === partner && item.plot_count === 16), 'separation preview should include partner plot return group')
assert.ok(previewResult.preview.asset_return.warehouse_items_by_origin_owner.some(item => item.item_id === 'rice' && item.origin_owner_username === owner && item.quantity === 1), 'separation preview should return remaining unsold warehouse rice by origin owner')
assert.equal(previewResult.preview.asset_return.fund_balance, 155, 'separation preview should include current fund balance after warehouse sale income')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === owner && item.amount === 870), 'separation preview should include owner fund contribution source summary')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === partner && item.amount === 80), 'separation preview should include partner fund contribution source summary')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === owner && item.suggested_refund_amount === 141), 'separation preview should suggest owner fund refund by contribution share after warehouse sale')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === partner && item.suggested_refund_amount === 14), 'separation preview should suggest partner fund refund by contribution share after warehouse sale')
assert.equal(previewResult.preview.asset_return.fund_suggested_refund_total, 155, 'separation preview should balance suggested fund refunds after warehouse sale')
assert.ok(previewResult.preview.compensation_plan.some(item => item.id === 'plots_return_by_origin'), 'separation preview should include plot return compensation plan')
assert.ok(previewResult.preview.compensation_plan.some(item => item.id === 'warehouse_manual_return'), 'separation preview should include warehouse return plan when shared stock remains')
assert.ok(previewResult.preview.compensation_plan.some(item => item.id === 'fund_proportional_refund'), 'separation preview should include fund proportional refund plan')
assert.ok(previewResult.preview.safety_checks.find(item => item.id === 'preview_only')?.passed, 'separation preview should declare preview-only safety check')
assert.ok(previewResult.preview.safety_checks.find(item => item.id === 'fund_preview_balanced')?.passed, 'separation preview should balance fund safety check')
assert.ok(previewResult.preview.deferred_operations.includes('execute_asset_return'), 'separation preview should keep execution deferred')
assert.equal(previewResult.contract.status, 'active', 'preview should not execute separation')
assert.ok(previewResult.contract.audit_log.find(entry => entry.action === 'separation_preview_created'), 'preview should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforePreview, 'separation preview should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforePreview, 'separation preview should not rewrite partner save')

const ownerRawBeforeDuplicatePreview = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeDuplicatePreview = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicatePreviewResult = await runtime.createSeparationPreview(created.contract.id, {
  reason: 'qa preview duplicate',
  idempotency_key: 'qa-separation-preview',
}, actor(owner))
assert.equal(duplicatePreviewResult.idempotent, true, 'same separation preview idempotency key should return existing preview')
assert.equal(duplicatePreviewResult.preview.id, previewResult.preview.id, 'idempotent separation preview should keep original preview id')
assert.equal(duplicatePreviewResult.preview.asset_return.plot_return_manifest_hash, previewResult.preview.asset_return.plot_return_manifest_hash, 'idempotent separation preview should keep the plot return manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeDuplicatePreview, 'idempotent separation preview should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeDuplicatePreview, 'idempotent separation preview should not rewrite partner save')

const ownerRawBeforePreviewConfirm = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforePreviewConfirm = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const ownerPreviewConfirm = await runtime.confirmSeparationPreview(created.contract.id, previewResult.preview.id, {
  memo: 'owner confirms preview only',
  idempotency_key: 'qa-separation-preview-confirm-owner',
}, actor(owner))
assert.equal(ownerPreviewConfirm.idempotent, false, 'first separation preview confirmation should not be idempotent')
assert.equal(ownerPreviewConfirm.preview.id, previewResult.preview.id, 'separation preview confirmation should keep preview id')
assert.equal(ownerPreviewConfirm.preview.state, 'draft', 'single separation preview confirmation should keep preview draft until all members confirm')
assert.deepEqual(ownerPreviewConfirm.preview.confirmation_state.confirmed_by, [owner], 'owner confirmation should be recorded once')
assert.deepEqual(ownerPreviewConfirm.preview.confirmation_state.pending_member_usernames, [partner], 'partner should remain pending after owner confirms')
assert.equal(ownerPreviewConfirm.preview.confirmation_state.execution_enabled, false, 'separation preview confirmation should not enable execution')
assert.equal(ownerPreviewConfirm.preview.confirmation_state.can_execute_now, false, 'separation preview confirmation should not execute immediately')
assert.equal(ownerPreviewConfirm.preview.asset_return.plot_return_manifest_hash, previewResult.preview.asset_return.plot_return_manifest_hash, 'separation preview confirmation should preserve manifest hash')
assert.ok(ownerPreviewConfirm.contract.audit_log.find(entry => entry.action === 'separation_preview_confirmed' && entry.idempotency_key === 'qa-separation-preview-confirm-owner'), 'owner separation preview confirmation should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforePreviewConfirm, 'owner separation preview confirmation should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforePreviewConfirm, 'owner separation preview confirmation should not rewrite partner save')

const duplicateOwnerPreviewConfirm = await runtime.confirmSeparationPreview(created.contract.id, previewResult.preview.id, {
  memo: 'owner duplicate confirm preview only',
  idempotency_key: 'qa-separation-preview-confirm-owner',
}, actor(owner))
assert.equal(duplicateOwnerPreviewConfirm.idempotent, true, 'same separation preview confirmation idempotency key should return existing confirmation')
assert.equal(duplicateOwnerPreviewConfirm.preview.confirmation_state.confirmation_events.length, 1, 'idempotent separation preview confirmation should not append duplicate events')

const alreadyConfirmedOwnerPreview = await runtime.confirmSeparationPreview(created.contract.id, previewResult.preview.id, {
  memo: 'owner already confirmed with another key',
  idempotency_key: 'qa-separation-preview-confirm-owner-again',
}, actor(owner))
assert.equal(alreadyConfirmedOwnerPreview.idempotent, true, 'already confirmed separation preview member should be treated idempotently')
assert.equal(alreadyConfirmedOwnerPreview.already_confirmed, true, 'already confirmed separation preview member should be flagged')
assert.equal(alreadyConfirmedOwnerPreview.preview.confirmation_state.confirmation_events.length, 1, 'already confirmed separation preview member should not append events')

const partnerPreviewConfirm = await runtime.confirmSeparationPreview(created.contract.id, previewResult.preview.id, {
  memo: 'partner confirms preview only',
  idempotency_key: 'qa-separation-preview-confirm-partner',
}, actor(partner))
assert.equal(partnerPreviewConfirm.idempotent, false, 'partner separation preview confirmation should not be idempotent first time')
assert.equal(partnerPreviewConfirm.preview.state, 'confirmed', 'separation preview should become confirmed after all members confirm')
assert.deepEqual(partnerPreviewConfirm.preview.confirmation_state.confirmed_by.sort(), [owner, partner].sort(), 'all required separation preview confirmations should be recorded')
assert.deepEqual(partnerPreviewConfirm.preview.confirmation_state.pending_member_usernames, [], 'no separation preview member should remain pending after both confirm')
assert.equal(partnerPreviewConfirm.preview.confirmation_state.all_members_confirmed, true, 'separation preview should expose all-members-confirmed flag')
assert.equal(partnerPreviewConfirm.preview.confirmation_state.execution_enabled, false, 'confirmed separation preview should still not execute asset return')
assert.equal(partnerPreviewConfirm.preview.manual_execution_required, true, 'confirmed separation preview should still require manual execution path')
assert.equal(partnerPreviewConfirm.preview.asset_return.plot_return_manifest_hash, previewResult.preview.asset_return.plot_return_manifest_hash, 'confirmed separation preview should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforePreviewConfirm, 'partner separation preview confirmation should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforePreviewConfirm, 'partner separation preview confirmation should not rewrite partner save')

await assert.rejects(
  () => runtime.requestSeparationExecution(created.contract.id, previewResult.preview.id, {
    memo: 'too early execution request',
    idempotency_key: 'qa-separation-execution-too-early',
  }, actor(owner)),
  /冷静期/,
  'separation execution request should reject before cooldown ends'
)

await mutateStoredSeparationPreview(created.contract.id, previewResult.preview.id, preview => {
  const now = Math.floor(Date.now() / 1000)
  preview.confirm_after_at = now - 60
  preview.expires_at = now + 3600
  preview.confirmation_state = {
    ...(preview.confirmation_state || {}),
    confirm_after_at: now - 60,
    expires_at: now + 3600,
    can_execute_now: false,
    execution_enabled: false,
  }
})
const ownerRawBeforeExecutionRequest = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeExecutionRequest = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const executionRequest = await runtime.requestSeparationExecution(created.contract.id, previewResult.preview.id, {
  memo: 'cooldown passed request only',
  idempotency_key: 'qa-separation-execution-request',
}, actor(owner))
assert.equal(executionRequest.idempotent, false, 'first separation execution request should not be idempotent')
assert.equal(executionRequest.preview.id, previewResult.preview.id, 'separation execution request should keep preview id')
assert.equal(executionRequest.preview.state, 'confirmed', 'separation execution request should keep confirmed preview state')
assert.equal(executionRequest.preview.confirmation_state.can_execute_now, true, 'separation execution request should mark cooldown and confirmations satisfied')
assert.equal(executionRequest.preview.confirmation_state.execution_enabled, false, 'separation execution request should not enable asset return execution')
assert.equal(executionRequest.execution_request.status, 'pending_manual_execution', 'separation execution request should remain pending manual execution')
assert.equal(executionRequest.execution_request.asset_return_executed, false, 'separation execution request should not execute asset return')
assert.equal(executionRequest.execution_request.personal_save_written, false, 'separation execution request should not write personal saves')
assert.ok(executionRequest.execution_request.next_required_operations.includes('execute_asset_return'), 'separation execution request should list remaining asset return operation')
assert.equal(executionRequest.preview.asset_return.plot_return_manifest_hash, previewResult.preview.asset_return.plot_return_manifest_hash, 'separation execution request should preserve manifest hash')
assert.ok(executionRequest.contract.audit_log.find(entry => entry.action === 'separation_execution_requested' && entry.idempotency_key === 'qa-separation-execution-request'), 'separation execution request should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeExecutionRequest, 'separation execution request should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeExecutionRequest, 'separation execution request should not rewrite partner save')

const duplicateExecutionRequest = await runtime.requestSeparationExecution(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate cooldown passed request only',
  idempotency_key: 'qa-separation-execution-request',
}, actor(owner))
assert.equal(duplicateExecutionRequest.idempotent, true, 'same separation execution request idempotency key should return existing request')
assert.equal(duplicateExecutionRequest.preview.confirmation_state.execution_request.id, executionRequest.execution_request.id, 'idempotent separation execution request should keep request id')

const alreadyRequestedExecution = await runtime.requestSeparationExecution(created.contract.id, previewResult.preview.id, {
  memo: 'already requested by partner with another key',
  idempotency_key: 'qa-separation-execution-request-partner-again',
}, actor(partner))
assert.equal(alreadyRequestedExecution.idempotent, true, 'existing separation execution request should prevent duplicate request with new key')
assert.equal(alreadyRequestedExecution.already_requested, true, 'existing separation execution request should be flagged')
assert.equal(alreadyRequestedExecution.execution_request.id, executionRequest.execution_request.id, 'existing separation execution request should return original request id')

await assert.rejects(
  () => runtime.executeSeparationAssetReturn(created.contract.id, previewResult.preview.id, {
    memo: 'wrong manifest hash should be rejected',
    plot_return_manifest_hash: '0'.repeat(64),
    execution_request_id: executionRequest.execution_request.id,
    idempotency_key: 'qa-separation-asset-return-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'separation asset return execution should reject mismatched plot manifest hash'
)

const ownerRawBeforeAssetReturnRecord = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeAssetReturnRecord = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const assetReturnRecord = await runtime.executeSeparationAssetReturn(created.contract.id, previewResult.preview.id, {
  memo: 'record asset return without personal save writes',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_request_id: executionRequest.execution_request.id,
  idempotency_key: 'qa-separation-asset-return-record',
}, actor(owner))
assert.equal(assetReturnRecord.idempotent, false, 'first separation asset return record should not be idempotent')
assert.equal(assetReturnRecord.execution_ledger.status, 'asset_return_recorded', 'asset return should be recorded in execution ledger')
assert.equal(assetReturnRecord.execution_ledger.plot_return_count, 32, 'asset return ledger should keep every source plot')
assert.equal(assetReturnRecord.execution_ledger.plot_return_manifest_hash, previewResult.preview.asset_return.plot_return_manifest_hash, 'asset return ledger should lock preview manifest hash')
assert.equal(assetReturnRecord.execution_ledger.personal_save_written, false, 'asset return record should not write personal saves yet')
assert.equal(assetReturnRecord.execution_ledger.shared_assets_mutated, false, 'asset return record should not mutate shared assets yet')
assert.equal(assetReturnRecord.preview.confirmation_state.execution_request.status, 'asset_return_recorded', 'execution request should advance to asset-return-recorded')
assert.equal(assetReturnRecord.preview.confirmation_state.execution_request.personal_save_written, false, 'execution request should keep personal save write pending')
assert.equal(assetReturnRecord.preview.asset_return.plot_return_manifest.every(item => item.execution_status === 'recorded_waiting_personal_save_write'), true, 'plot manifest rows should be marked as recorded but waiting for personal save write')
assert.ok(assetReturnRecord.contract.audit_log.find(entry => entry.action === 'separation_asset_return_recorded' && entry.idempotency_key === 'qa-separation-asset-return-record'), 'asset return record should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeAssetReturnRecord, 'asset return record should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeAssetReturnRecord, 'asset return record should not rewrite partner save')

const duplicateAssetReturnRecord = await runtime.executeSeparationAssetReturn(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate asset return record',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_request_id: executionRequest.execution_request.id,
  idempotency_key: 'qa-separation-asset-return-record',
}, actor(owner))
assert.equal(duplicateAssetReturnRecord.idempotent, true, 'same asset return execution key should return existing ledger')
assert.equal(duplicateAssetReturnRecord.execution_ledger.id, assetReturnRecord.execution_ledger.id, 'idempotent asset return record should keep ledger id')

const alreadyAssetReturnRecorded = await runtime.executeSeparationAssetReturn(created.contract.id, previewResult.preview.id, {
  memo: 'already recorded by partner with another key',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_request_id: executionRequest.execution_request.id,
  idempotency_key: 'qa-separation-asset-return-record-partner-again',
}, actor(partner))
assert.equal(alreadyAssetReturnRecorded.idempotent, true, 'already recorded asset return should be treated idempotently with a new key')
assert.equal(alreadyAssetReturnRecorded.already_executed, true, 'already recorded asset return response should be explicit')
assert.equal(alreadyAssetReturnRecorded.execution_ledger.id, assetReturnRecord.execution_ledger.id, 'already recorded asset return should return original ledger')

await assert.rejects(
  () => runtime.writeSeparationPersonalFarmReturns(created.contract.id, previewResult.preview.id, {
    memo: 'wrong personal farm write hash',
    plot_return_manifest_hash: 'f'.repeat(64),
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-personal-farm-write-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'personal farm return write should reject mismatched manifest hash'
)

const personalFarmWrite = await runtime.writeSeparationPersonalFarmReturns(created.contract.id, previewResult.preview.id, {
  memo: 'write source plots back to personal farm saves',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-farm-write',
}, actor(owner))
assert.equal(personalFarmWrite.idempotent, false, 'first personal farm return write should not be idempotent')
assert.equal(personalFarmWrite.execution_ledger.status, 'personal_save_written', 'personal farm write should advance ledger status')
assert.equal(personalFarmWrite.execution_ledger.personal_save_written, true, 'personal farm write should mark ledger as written')
assert.equal(personalFarmWrite.receipts.length, 2, 'personal farm write should create one receipt per member save')
assert.equal(personalFarmWrite.receipts.reduce((sum, receipt) => sum + receipt.restored_plot_count, 0), 32, 'personal farm write should restore all source plots')
assert.equal(personalFarmWrite.preview.confirmation_state.execution_request.status, 'personal_save_written', 'execution request should advance to personal-save-written')
assert.equal(personalFarmWrite.preview.asset_return.plot_return_manifest.every(item => item.execution_status === 'personal_save_written'), true, 'plot manifest rows should mark personal save write')
assert.ok(personalFarmWrite.receipts.every(receipt => receipt.after_revision >= receipt.before_revision), 'personal farm write receipts should include save revisions')
assert.equal(readGameplayData(owner)?.farm?.plots?.[0]?.cropId, 'rice', 'owner farm plot should keep returned rice state')
assert.equal(readGameplayData(partner)?.farm?.plots?.[5]?.cropId, 'tea', 'partner farm plot should keep returned tea state')
assert.ok(personalFarmWrite.contract.audit_log.find(entry => entry.action === 'separation_personal_farm_written' && entry.idempotency_key === 'qa-separation-personal-farm-write'), 'personal farm write should be audited')

const ownerRawAfterPersonalFarmWrite = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterPersonalFarmWrite = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicatePersonalFarmWrite = await runtime.writeSeparationPersonalFarmReturns(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate personal farm write',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-farm-write',
}, actor(owner))
assert.equal(duplicatePersonalFarmWrite.idempotent, true, 'same personal farm write idempotency key should return existing receipts')
assert.equal(duplicatePersonalFarmWrite.execution_ledger.id, personalFarmWrite.execution_ledger.id, 'idempotent personal farm write should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterPersonalFarmWrite, 'idempotent personal farm write should not rewrite owner save again')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterPersonalFarmWrite, 'idempotent personal farm write should not rewrite partner save again')

await assert.rejects(
  () => runtime.refundSeparationSharedFund(created.contract.id, previewResult.preview.id, {
    memo: 'wrong shared fund refund hash',
    plot_return_manifest_hash: 'a'.repeat(64),
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-shared-fund-refund-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'shared fund refund should reject mismatched manifest hash'
)

const fundBeforeSeparationRefund = await runtime.getCohabitationFund(created.contract.id, actor(owner))
const ownerMoneyBeforeSeparationFundRefund = readGameplayData(owner)?.player?.money
const partnerMoneyBeforeSeparationFundRefund = readGameplayData(partner)?.player?.money
const sharedFundRefund = await runtime.refundSeparationSharedFund(created.contract.id, previewResult.preview.id, {
  memo: 'refund shared fund to personal money',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-shared-fund-refund',
}, actor(owner))
const refundTotal = sharedFundRefund.receipts.reduce((sum, receipt) => sum + receipt.refund_amount, 0)
assert.equal(sharedFundRefund.idempotent, false, 'first shared fund refund should not be idempotent')
assert.equal(sharedFundRefund.execution_ledger.status, 'shared_fund_refunded', 'shared fund refund should advance execution ledger status')
assert.equal(sharedFundRefund.execution_ledger.shared_fund_refunded, true, 'shared fund refund should mark ledger refunded')
assert.equal(sharedFundRefund.preview.confirmation_state.execution_request.status, 'shared_fund_refunded', 'execution request should advance to shared-fund-refunded')
assert.equal(sharedFundRefund.shared_fund.refund_total, refundTotal, 'shared fund refund should report receipt total')
assert.equal(sharedFundRefund.shared_fund.balance_before, fundBeforeSeparationRefund.fund.balance, 'shared fund refund should report previous balance')
assert.equal(sharedFundRefund.fund.balance, fundBeforeSeparationRefund.fund.balance - refundTotal, 'shared fund refund should deduct shared balance once')
assert.equal(sharedFundRefund.fund_ledger_entries.length, sharedFundRefund.receipts.length, 'shared fund refund should write one fund ledger per receipt')
assert.ok(sharedFundRefund.receipts.length > 0, 'shared fund refund should produce personal money receipts when fund balance has contributions')
assert.ok(sharedFundRefund.receipts.every(receipt => receipt.after_money === receipt.before_money + receipt.refund_amount), 'shared fund refund receipts should add personal money')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeSeparationFundRefund + (sharedFundRefund.receipts.find(receipt => receipt.username === owner)?.refund_amount || 0), 'owner should receive personal money refund once')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeSeparationFundRefund + (sharedFundRefund.receipts.find(receipt => receipt.username === partner)?.refund_amount || 0), 'partner should receive personal money refund once')
assert.ok(sharedFundRefund.contract.audit_log.find(entry => entry.action === 'separation_shared_fund_refunded' && entry.idempotency_key === 'qa-separation-shared-fund-refund'), 'shared fund refund should be audited')

const ownerRawAfterSharedFundRefund = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterSharedFundRefund = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicateSharedFundRefund = await runtime.refundSeparationSharedFund(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate shared fund refund',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-shared-fund-refund',
}, actor(owner))
assert.equal(duplicateSharedFundRefund.idempotent, true, 'same shared fund refund idempotency key should return existing receipts')
assert.equal(duplicateSharedFundRefund.execution_ledger.id, sharedFundRefund.execution_ledger.id, 'idempotent shared fund refund should keep ledger id')
assert.equal(duplicateSharedFundRefund.fund.balance, sharedFundRefund.fund.balance, 'idempotent shared fund refund should not deduct balance twice')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterSharedFundRefund, 'idempotent shared fund refund should not rewrite owner save again')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterSharedFundRefund, 'idempotent shared fund refund should not rewrite partner save again')

await assert.rejects(
  () => runtime.returnSeparationSharedWarehouse(created.contract.id, previewResult.preview.id, {
    memo: 'wrong shared warehouse return hash',
    plot_return_manifest_hash: 'b'.repeat(64),
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-shared-warehouse-return-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'shared warehouse return should reject mismatched manifest hash'
)

const warehouseBeforeSeparationReturn = await runtime.getCohabitationWarehouse(created.contract.id, actor(owner))
const ownerRiceBeforeSharedWarehouseReturn = getInventoryItemQuantity(owner, 'rice')
const partnerRiceBeforeSharedWarehouseReturn = getInventoryItemQuantity(partner, 'rice')
const sharedWarehouseReturn = await runtime.returnSeparationSharedWarehouse(created.contract.id, previewResult.preview.id, {
  memo: 'return shared warehouse stock to personal inventories',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-shared-warehouse-return',
}, actor(owner))
assert.equal(sharedWarehouseReturn.idempotent, false, 'first shared warehouse return should not be idempotent')
assert.equal(sharedWarehouseReturn.execution_ledger.status, 'shared_warehouse_returned', 'shared warehouse return should advance execution ledger status')
assert.equal(sharedWarehouseReturn.execution_ledger.shared_warehouse_returned, true, 'shared warehouse return should mark ledger returned')
assert.equal(sharedWarehouseReturn.preview.confirmation_state.execution_request.status, 'shared_warehouse_returned', 'execution request should advance to shared-warehouse-returned')
assert.equal(sharedWarehouseReturn.shared_warehouse.returned_quantity, 1, 'shared warehouse return should report returned quantity')
assert.equal(sharedWarehouseReturn.receipts.length, 1, 'shared warehouse return should create one receipt for the remaining owner rice')
assert.equal(sharedWarehouseReturn.receipts[0].username, owner, 'shared warehouse return should write rice back to origin owner')
assert.equal(sharedWarehouseReturn.receipts[0].item_id, 'rice', 'shared warehouse return receipt should keep item id')
assert.equal(sharedWarehouseReturn.receipts[0].returned_quantity, 1, 'shared warehouse return receipt should keep quantity')
assert.equal(sharedWarehouseReturn.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 0, 'returned shared warehouse rice should be removed from stock')
assert.equal(warehouseBeforeSeparationReturn.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 1, 'warehouse before return should include remaining rice')
assert.equal(getInventoryItemQuantity(owner, 'rice'), ownerRiceBeforeSharedWarehouseReturn + 1, 'shared warehouse return should add rice to origin owner inventory once')
assert.equal(getInventoryItemQuantity(partner, 'rice'), partnerRiceBeforeSharedWarehouseReturn, 'shared warehouse return should not add rice to non-origin partner')
assert.ok(sharedWarehouseReturn.warehouse_ledger_entries.every(entry => entry.action === 'separation_return'), 'shared warehouse return should write separation_return warehouse ledgers')
assert.ok(sharedWarehouseReturn.contract.audit_log.find(entry => entry.action === 'separation_shared_warehouse_returned' && entry.idempotency_key === 'qa-separation-shared-warehouse-return'), 'shared warehouse return should be audited')

const ownerRawAfterSharedWarehouseReturn = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterSharedWarehouseReturn = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicateSharedWarehouseReturn = await runtime.returnSeparationSharedWarehouse(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate shared warehouse return',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-shared-warehouse-return',
}, actor(owner))
assert.equal(duplicateSharedWarehouseReturn.idempotent, true, 'same shared warehouse return idempotency key should return existing receipts')
assert.equal(duplicateSharedWarehouseReturn.execution_ledger.id, sharedWarehouseReturn.execution_ledger.id, 'idempotent shared warehouse return should keep ledger id')
assert.equal(duplicateSharedWarehouseReturn.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 0, 'idempotent shared warehouse return should not duplicate stock changes')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterSharedWarehouseReturn, 'idempotent shared warehouse return should not rewrite owner save again')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterSharedWarehouseReturn, 'idempotent shared warehouse return should not rewrite partner save again')

await assert.rejects(
  () => runtime.resolveSeparationFamilyStory(created.contract.id, previewResult.preview.id, {
    memo: 'wrong family story hash',
    plot_return_manifest_hash: 'c'.repeat(64),
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-family-story-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'family story resolution should reject mismatched manifest hash'
)

const ownerRawBeforeFamilyStoryResolution = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawBeforeFamilyStoryResolution = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const familyStoryResolution = await runtime.resolveSeparationFamilyStory(created.contract.id, previewResult.preview.id, {
  memo: 'record family story split placeholder',
  resolution_choice: 'peaceful_separation',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-family-story-resolution',
}, actor(owner))
assert.equal(familyStoryResolution.idempotent, false, 'first family story resolution should not be idempotent')
assert.equal(familyStoryResolution.execution_ledger.status, 'family_story_resolved', 'family story resolution should advance execution ledger status')
assert.equal(familyStoryResolution.execution_ledger.family_story_resolved, true, 'family story resolution should mark ledger resolved')
assert.equal(familyStoryResolution.preview.confirmation_state.execution_request.status, 'family_story_resolved', 'execution request should advance to family-story-resolved')
assert.equal(familyStoryResolution.story_resolution.relation_type, 'lover_cohabitation', 'family story resolution should keep relation type')
assert.equal(familyStoryResolution.story_resolution.personal_story_write_required, true, 'lover cohabitation should keep personal story write boundary')
assert.equal(familyStoryResolution.story_resolution.child_arrangement_required, false, 'lover cohabitation should not require child arrangement in contract store')
assert.ok(familyStoryResolution.execution_ledger.next_required_operations.includes('split_decorations'), 'family story resolution should keep decoration split as next operation')
assert.ok(familyStoryResolution.execution_ledger.next_required_operations.includes('write_personal_story_receipts'), 'family story resolution should keep personal story receipt follow-up')
assert.ok(familyStoryResolution.contract.audit_log.find(entry => entry.action === 'separation_family_story_resolved' && entry.idempotency_key === 'qa-separation-family-story-resolution'), 'family story resolution should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyStoryResolution, 'family story resolution should not rewrite owner personal save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyStoryResolution, 'family story resolution should not rewrite partner personal save')

const duplicateFamilyStoryResolution = await runtime.resolveSeparationFamilyStory(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate family story split placeholder',
  resolution_choice: 'peaceful_separation',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-family-story-resolution',
}, actor(owner))
assert.equal(duplicateFamilyStoryResolution.idempotent, true, 'same family story resolution idempotency key should return existing record')
assert.equal(duplicateFamilyStoryResolution.execution_ledger.id, familyStoryResolution.execution_ledger.id, 'idempotent family story resolution should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyStoryResolution, 'idempotent family story resolution should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyStoryResolution, 'idempotent family story resolution should not rewrite partner save')

const partnerMoneyBeforeMediumFundTopUp = readGameplayData(partner)?.player?.money
const fundBeforeMediumFundTopUp = await runtime.getCohabitationFund(created.contract.id, actor(owner))
const mediumFundTopUp = await runtime.contributeCohabitationFund(created.contract.id, {
  amount: 400,
  purpose: 'building_materials',
  memo: 'qa medium fund top up for building materials',
  idempotency_key: 'qa-fund-contribution-medium-building-top-up',
}, actor(partner))
assert.equal(mediumFundTopUp.fund.balance, fundBeforeMediumFundTopUp.fund.balance + 400, 'medium fund top up should prepare enough shared balance')
assert.equal(readGameplayData(partner)?.player?.money, partnerMoneyBeforeMediumFundTopUp - 400, 'medium fund top up should deduct partner personal money once')
const ownerMoneyBeforeMediumFundSpend = readGameplayData(owner)?.player?.money
const mediumFundSpend = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 400,
  purpose: 'building_materials',
  target_ref: 'family_building:shared_granary:materials',
  memo: 'qa shared building material budget',
  idempotency_key: 'qa-fund-spend-building-materials',
}, actor(owner))
assert.equal(mediumFundSpend.idempotent, false, 'first medium fund spend should not be idempotent')
assert.equal(mediumFundSpend.fund.balance, fundBeforeMediumFundTopUp.fund.balance, 'medium fund spend should reduce shared fund balance')
assert.equal(mediumFundSpend.shared_fund.balance_before, fundBeforeMediumFundTopUp.fund.balance + 400, 'medium fund spend should report previous balance')
assert.equal(mediumFundSpend.shared_fund.balance_after, fundBeforeMediumFundTopUp.fund.balance, 'medium fund spend should report new balance')
assert.equal(mediumFundSpend.ledger_entry.purpose, 'building_materials', 'medium fund spend ledger should keep purpose')
assert.equal(mediumFundSpend.ledger_entry.spend_tier, 'medium', 'medium fund spend ledger should mark medium tier')
assert.equal(mediumFundSpend.ledger_entry.spend_purpose_label, '中额建材预算', 'medium fund spend ledger should keep purpose label')
assert.equal(mediumFundSpend.ledger_entry.spend_category, 'construction_material', 'medium fund spend ledger should keep construction category')
assert.equal(mediumFundSpend.ledger_entry.target_ref, 'family_building:shared_granary:materials', 'medium fund spend should keep target reference')
assert.equal(mediumFundSpend.ledger_entry.confirmation_required, false, 'medium fund spend should not require large-spend confirmation')
assert.equal(mediumFundSpend.purchase, null, 'medium fund spend should not auto deliver shop items')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeMediumFundSpend, 'medium fund spend should not touch owner personal money')
assert.ok(mediumFundSpend.contract.audit_log.find(entry => entry.action === 'fund_spent' && entry.detail?.spend_tier === 'medium'), 'medium fund spend should be audited')

const duplicateMediumFundSpend = await runtime.spendCohabitationFund(created.contract.id, {
  amount: 400,
  purpose: 'building_materials',
  target_ref: 'family_building:shared_granary:materials',
  idempotency_key: 'qa-fund-spend-building-materials',
}, actor(owner))
assert.equal(duplicateMediumFundSpend.idempotent, true, 'same medium fund spend idempotency key should be idempotent')
assert.equal(duplicateMediumFundSpend.fund.balance, fundBeforeMediumFundTopUp.fund.balance, 'idempotent medium fund spend should not deduct balance twice')
assert.equal(readGameplayData(owner)?.player?.money, ownerMoneyBeforeMediumFundSpend, 'idempotent medium fund spend should still not touch personal money')

const largeOwner = 'cohabit_lg_owner25'
const largePartner = 'cohabit_lg_partner25'
const largeOwnerRegister = await db.registerUser(largeOwner, 'SmokePass_0525', 'large fund owner')
const largePartnerRegister = await db.registerUser(largePartner, 'SmokePass_0525', 'large fund partner')
assert.equal(largeOwnerRegister.ok, true, 'large fund owner QA user should register')
assert.equal(largePartnerRegister.ok, true, 'large fund partner QA user should register')
seedSave(largeOwner)
seedSave(largePartner)
const largeFriendRequest = await socialRuntime.requestFriendship(largeOwner, { target_username: largePartner })
await socialRuntime.acceptFriendRequest(largePartner, largeFriendRequest.id)
const largeContract = await runtime.createCohabitationContract({
  type: 'business_partner',
  target_username: largePartner,
  idempotency_key: 'qa-large-fund-contract',
}, actor(largeOwner))
await runtime.acceptCohabitationContract(largeContract.contract.id, actor(largePartner))

const largeFundBeforePermission = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeFundBeforePermission.fund.summary.large_spend_draft_enabled, false, 'large fund draft should require explicit spend_large permission')
assert.equal(largeFundBeforePermission.fund.summary.large_spend_execution_enabled, false, 'large fund execution should stay disabled')
assert.ok(largeFundBeforePermission.fund.summary.allowed_large_spend_purposes.some(purpose => purpose.id === 'family_building'), 'fund snapshot should expose family building large draft purpose')
assert.ok(largeFundBeforePermission.fund.summary.allowed_large_spend_purposes.some(purpose => purpose.id === 'manor_expansion'), 'fund snapshot should expose manor expansion large draft purpose')

const largeOwnerPermissionUpdate = await runtime.updateCohabitationPermissions(largeContract.contract.id, {
  target_username: largeOwner,
  permissions: {
    fund: {
      spend_large: true,
    },
  },
  idempotency_key: 'qa-large-owner-spend-large-permission',
}, actor(largeOwner))
assert.equal(largeOwnerPermissionUpdate.permissions_panel.members.find(member => member.username === largeOwner)?.permissions.fund.spend_large, true, 'owner should be able to receive large fund draft permission')

const largeOwnerMoneyBeforeTopUp = readGameplayData(largeOwner)?.player?.money
const largeOwnerTopUp = await runtime.contributeCohabitationFund(largeContract.contract.id, {
  amount: 700,
  purpose: 'large building draft top up',
  idempotency_key: 'qa-large-owner-fund-top-up',
}, actor(largeOwner))
assert.equal(largeOwnerTopUp.fund.balance, 700, 'owner large draft top up should increase shared balance')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeTopUp - 700, 'owner large draft top up should deduct personal money once')
const largePartnerMoneyBeforeTopUp = readGameplayData(largePartner)?.player?.money
const largePartnerTopUp = await runtime.contributeCohabitationFund(largeContract.contract.id, {
  amount: 700,
  purpose: 'large building draft top up',
  idempotency_key: 'qa-large-partner-fund-top-up',
}, actor(largePartner))
assert.equal(largePartnerTopUp.fund.balance, 1400, 'partner large draft top up should prepare enough shared balance')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeTopUp - 700, 'partner large draft top up should deduct personal money once')

await assert.rejects(
  () => runtime.createCohabitationFundLargeSpendDraft(largeContract.contract.id, {
    amount: 1300,
    purpose: 'family_building',
    target_ref: 'family_building:shared_granary:permission-denied',
    idempotency_key: 'qa-large-partner-draft-denied',
  }, actor(largePartner)),
  error => error?.status === 403,
  'members without spend_large should not create large fund drafts'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, 1400, 'permission-denied large draft should not change shared balance')

await assert.rejects(
  () => runtime.spendCohabitationFund(largeContract.contract.id, {
    amount: 1300,
    purpose: 'family_building',
    target_ref: 'family_building:shared_granary:direct-spend',
    idempotency_key: 'qa-large-direct-spend-denied',
  }, actor(largeOwner)),
  error => error?.status === 403,
  'large building spend should not bypass the draft endpoint through direct fund spending'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, 1400, 'direct large spend rejection should not change shared balance')

const balanceBeforeLargeDraft = (await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance
const largeOwnerMoneyBeforeDraft = readGameplayData(largeOwner)?.player?.money
const largeDraft = await runtime.createCohabitationFundLargeSpendDraft(largeContract.contract.id, {
  amount: 1300,
  purpose: 'family_building',
  target_ref: 'family_building:shared_granary:build',
  memo: 'qa large family building draft',
  idempotency_key: 'qa-fund-large-building-draft',
}, actor(largeOwner))
assert.equal(largeDraft.idempotent, false, 'first large fund spend draft should not be idempotent')
assert.equal(largeDraft.draft.confirmation_required, true, 'large fund draft should require confirmation')
assert.equal(largeDraft.draft.confirmation_status, 'pending', 'large fund draft should wait for member confirmation')
assert.equal(largeDraft.draft.state, 'pending_confirmation', 'large fund draft should stay in pending confirmation state')
assert.deepEqual(largeDraft.draft.required_member_usernames.sort(), [largeOwner, largePartner].sort(), 'large fund draft should require both accepted members')
assert.deepEqual(largeDraft.draft.confirmed_member_usernames, [largeOwner], 'large fund draft should auto-confirm requester only')
assert.deepEqual(largeDraft.draft.pending_member_usernames, [largePartner], 'large fund draft should keep the other member pending')
assert.equal(largeDraft.draft.confirmation_state.can_execute_now, false, 'large fund draft should not be executable immediately')
assert.equal(largeDraft.draft.execution_enabled, false, 'large fund draft execution should stay disabled')
assert.equal(largeDraft.shared_fund.deducted_amount, 0, 'large fund draft should not deduct shared fund')
assert.equal(largeDraft.fund.balance, balanceBeforeLargeDraft, 'large fund draft should leave shared balance unchanged')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'large fund draft should not touch personal money')
assert.ok(largeDraft.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_created'), 'large fund draft should be audited')
assert.equal(largeDraft.fund.summary.pending_large_spend_draft_count, 1, 'fund snapshot should count pending large drafts')
assert.equal(largeDraft.fund.summary.large_spend_draft_enabled, true, 'fund snapshot should mark large draft creation as enabled for permitted actor')
assert.equal(largeDraft.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should keep large execution disabled after draft creation')
assert.ok(largeDraft.fund.summary.allowed_large_spend_purposes.some(purpose => purpose.id === 'family_building'), 'fund snapshot should keep family building large draft purpose')

const duplicateLargeDraft = await runtime.createCohabitationFundLargeSpendDraft(largeContract.contract.id, {
  amount: 1300,
  purpose: 'family_building',
  target_ref: 'family_building:shared_granary:build',
  idempotency_key: 'qa-fund-large-building-draft',
}, actor(largeOwner))
assert.equal(duplicateLargeDraft.idempotent, true, 'same large fund draft idempotency key should be idempotent')
assert.equal(duplicateLargeDraft.draft.id, largeDraft.draft.id, 'idempotent large fund draft should return the original draft')
assert.equal(duplicateLargeDraft.fund.balance, balanceBeforeLargeDraft, 'idempotent large fund draft should not deduct balance')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'idempotent large fund draft should not touch personal money')

await assert.rejects(
  () => runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
    idempotency_key: 'qa-fund-large-building-draft-execute-before-confirm',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'large fund drafts should not execute before all required members confirm'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft, 'rejected early large execution should not change shared balance')

const largePartnerMoneyBeforeConfirm = readGameplayData(largePartner)?.player?.money
const largeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  memo: 'qa partner confirms large family building draft',
  idempotency_key: 'qa-fund-large-building-draft-partner-confirm',
}, actor(largePartner))
assert.equal(largeConfirm.idempotent, false, 'first large fund draft confirmation should not be idempotent')
assert.equal(largeConfirm.draft.id, largeDraft.draft.id, 'large fund confirmation should return the same draft')
assert.equal(largeConfirm.draft.state, 'ready_to_execute', 'large fund draft should become ready after all members confirm')
assert.equal(largeConfirm.draft.confirmation_status, 'confirmed', 'large fund draft should mark confirmation as complete')
assert.deepEqual(largeConfirm.draft.confirmed_member_usernames.sort(), [largeOwner, largePartner].sort(), 'large fund draft should record all confirmed members')
assert.equal(largeConfirm.draft.pending_member_usernames.length, 0, 'large fund draft should have no pending members after confirmation')
assert.equal(largeConfirm.draft.confirmation_state.all_members_confirmed, true, 'large fund confirmation state should mark all members confirmed')
assert.equal(largeConfirm.draft.confirmation_state.ready_for_execution_request, true, 'large fund confirmation state should allow a later execution request')
assert.equal(largeConfirm.draft.confirmation_state.can_execute_now, false, 'confirmed large fund draft should not execute immediately')
assert.equal(largeConfirm.draft.execution_enabled, false, 'large fund execution should stay disabled after confirmation')
assert.equal(largeConfirm.shared_fund.deducted_amount, 0, 'large fund confirmation should not deduct shared fund')
assert.equal(largeConfirm.fund.balance, balanceBeforeLargeDraft, 'large fund confirmation should leave shared balance unchanged')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'large fund confirmation should not touch partner personal money')
assert.ok(largeConfirm.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_confirmed'), 'large fund confirmation should be audited')
assert.equal(largeConfirm.fund.summary.pending_large_spend_draft_count, 0, 'fund snapshot should move confirmed large drafts out of pending count')
assert.equal(largeConfirm.fund.summary.ready_large_spend_draft_count, 1, 'fund snapshot should count ready large drafts')
assert.equal(largeConfirm.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should not enable execution for a member without spend_large permission')
const largeOwnerReadyFund = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeOwnerReadyFund.fund.summary.large_spend_execution_enabled, true, 'fund snapshot should enable large execution for a permitted actor after all members confirm')

const duplicateLargeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-partner-confirm',
}, actor(largePartner))
assert.equal(duplicateLargeConfirm.idempotent, true, 'same large fund confirmation idempotency key should be idempotent')
assert.equal(duplicateLargeConfirm.draft.id, largeDraft.draft.id, 'idempotent large confirmation should return the original draft')
assert.equal(duplicateLargeConfirm.fund.balance, balanceBeforeLargeDraft, 'idempotent large confirmation should not deduct balance')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'idempotent large confirmation should not touch personal money')

const alreadyConfirmedOwner = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-owner-confirm-again',
}, actor(largeOwner))
assert.equal(alreadyConfirmedOwner.idempotent, true, 'already confirmed members should get an idempotent confirmation response')
assert.equal(alreadyConfirmedOwner.already_confirmed, true, 'already confirmed response should be explicit')
assert.equal(alreadyConfirmedOwner.fund.balance, balanceBeforeLargeDraft, 'already confirmed response should not deduct balance')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'already confirmed response should not touch personal money')

await assert.rejects(
  () => runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
    idempotency_key: 'qa-fund-large-building-draft-extra-confirm-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not confirm large fund drafts'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft, 'rejected large confirmation should not change shared balance')

await assert.rejects(
  () => runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
    idempotency_key: 'qa-fund-large-building-draft-extra-execute-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not execute large fund draft spends'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft, 'rejected non-member large execution should not change shared balance')

const largeExecute = await runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  memo: 'qa execute large family building draft',
  idempotency_key: 'qa-fund-large-building-draft-execute',
}, actor(largeOwner))
assert.equal(largeExecute.idempotent, false, 'first large fund draft execution should not be idempotent')
assert.equal(largeExecute.draft.id, largeDraft.draft.id, 'large fund execution should return the same draft')
assert.equal(largeExecute.draft.state, 'executed', 'large fund draft should move to executed after execution')
assert.equal(largeExecute.draft.execution_enabled, false, 'executed large fund draft should not remain executable')
assert.equal(largeExecute.draft.confirmation_status, 'confirmed', 'executed large fund draft should keep confirmed status')
assert.equal(largeExecute.draft.final_spend_ledger_id, largeExecute.ledger_entry.id, 'executed draft should point at final fund ledger')
assert.equal(largeExecute.ledger_entry.action, 'spend', 'large execution should write spend ledger')
assert.equal(largeExecute.ledger_entry.spend_tier, 'large', 'large execution ledger should be marked large tier')
assert.equal(largeExecute.ledger_entry.confirmation_required, true, 'large execution ledger should require confirmation')
assert.equal(largeExecute.ledger_entry.confirmation_status, 'confirmed', 'large execution ledger should record confirmed status')
assert.equal(largeExecute.ledger_entry.purpose, 'family_building', 'large execution ledger should keep draft purpose')
assert.equal(largeExecute.ledger_entry.target_ref, 'family_building:shared_granary:build', 'large execution ledger should keep draft target')
assert.equal(largeExecute.shared_fund.balance_before, balanceBeforeLargeDraft, 'large execution should report balance before deduction')
assert.equal(largeExecute.shared_fund.balance_after, balanceBeforeLargeDraft - 1300, 'large execution should report balance after deduction')
assert.equal(largeExecute.shared_fund.deducted_amount, 1300, 'large execution should deduct draft amount')
assert.equal(largeExecute.shared_fund.personal_money_merged, false, 'large execution should keep personal money separate')
assert.equal(largeExecute.shared_fund.building_ledger_written, true, 'large execution should write the building ledger')
assert.equal(largeExecute.shared_fund.building_ledger_id, largeExecute.building_ledger_entry.id, 'large execution should return the building ledger id')
assert.equal(largeExecute.draft.final_building_ledger_id, largeExecute.building_ledger_entry.id, 'executed draft should point at final building ledger')
assert.equal(largeExecute.building_ledger_entry.action, 'fund_large_spend_executed', 'building ledger should record large spend execution')
assert.equal(largeExecute.building_ledger_entry.draft_id, largeDraft.draft.id, 'building ledger should reference draft id')
assert.equal(largeExecute.building_ledger_entry.fund_ledger_id, largeExecute.ledger_entry.id, 'building ledger should reference fund ledger')
assert.equal(largeExecute.building_ledger_entry.target_ref, 'family_building:shared_granary:build', 'building ledger should keep draft target')
assert.equal(largeExecute.building_ledger_entry.building_id, 'shared_granary', 'building ledger should infer building id from target')
assert.equal(largeExecute.building_ledger_entry.amount, 1300, 'building ledger should keep executed amount')
assert.equal(largeExecute.building_ledger_entry.shared_fund_balance_before, balanceBeforeLargeDraft, 'building ledger should record balance before deduction')
assert.equal(largeExecute.building_ledger_entry.shared_fund_balance_after, balanceBeforeLargeDraft - 1300, 'building ledger should record balance after deduction')
assert.equal(largeExecute.building_ledger_entry.shared_fund_deducted, true, 'building ledger should mark shared fund deduction')
assert.equal(largeExecute.building_ledger_entry.shared_warehouse_materials_consumed, false, 'building ledger should not consume warehouse materials')
assert.equal(largeExecute.building_ledger_entry.personal_money_merged, false, 'building ledger should keep personal money separate')
assert.equal(largeExecute.building_ledger_entry.real_build_applied, false, 'building ledger should not apply real building yet')
assert.equal(largeExecute.building_ledger_entry.status, 'fund_spend_recorded', 'building ledger should stay in fund-spend-recorded status')
assert.equal(largeExecute.fund.balance, balanceBeforeLargeDraft - 1300, 'large execution should deduct shared fund once')
assert.equal(largeExecute.fund.summary.ready_large_spend_draft_count, 0, 'fund snapshot should move executed drafts out of ready count')
assert.equal(largeExecute.fund.summary.executed_large_spend_draft_count, 1, 'fund snapshot should count executed large drafts')
assert.equal(largeExecute.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should disable execution when no ready drafts remain')
assert.ok(largeExecute.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_executed'), 'large fund execution should be audited')
assert.equal(largeExecute.contract.family_building_ledger[0].id, largeExecute.building_ledger_entry.id, 'public contract should expose the building ledger entry')
const largeFundAfterBuildingLedger = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeFundAfterBuildingLedger.contract.family_building_ledger[0].id, largeExecute.building_ledger_entry.id, 'fund readback should expose the execution building ledger')
assert.equal(largeFundAfterBuildingLedger.contract.family_building_ledger[0].fund_ledger_id, largeExecute.ledger_entry.id, 'fund readback building ledger should keep fund ledger link')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'large fund execution should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'large fund execution should not touch partner personal money')

const duplicateLargeExecute = await runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-execute',
}, actor(largeOwner))
assert.equal(duplicateLargeExecute.idempotent, true, 'same large execution idempotency key should be idempotent')
assert.equal(duplicateLargeExecute.ledger_entry.id, largeExecute.ledger_entry.id, 'idempotent large execution should return original ledger')
assert.equal(duplicateLargeExecute.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'idempotent large execution should return original building ledger')
assert.equal(duplicateLargeExecute.shared_fund.building_ledger_written, true, 'idempotent large execution should still report building ledger written')
assert.equal(duplicateLargeExecute.fund.balance, balanceBeforeLargeDraft - 1300, 'idempotent large execution should not deduct balance twice')
const largeFundAfterDuplicateExecute = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeFundAfterDuplicateExecute.contract.family_building_ledger.length, 1, 'idempotent large execution should not duplicate building ledger')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'idempotent large execution should not touch owner personal money')

const alreadyExecutedLarge = await runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-execute-again',
}, actor(largeOwner))
assert.equal(alreadyExecutedLarge.idempotent, true, 'already executed large draft should return idempotent response')
assert.equal(alreadyExecutedLarge.already_executed, true, 'already executed large draft response should be explicit')
assert.equal(alreadyExecutedLarge.ledger_entry.id, largeExecute.ledger_entry.id, 'already executed large draft should return final ledger')
assert.equal(alreadyExecutedLarge.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'already executed large draft should return final building ledger')
assert.equal(alreadyExecutedLarge.shared_fund.building_ledger_written, true, 'already executed large draft should report building ledger written')
assert.equal(alreadyExecutedLarge.fund.balance, balanceBeforeLargeDraft - 1300, 'already executed large draft should not deduct balance again')
const largeFundAfterAlreadyExecuted = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeFundAfterAlreadyExecuted.contract.family_building_ledger.length, 1, 'already executed large draft should not duplicate building ledger')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'already executed large draft should not touch owner personal money')

await assert.rejects(
  () => runtime.applyCohabitationFamilyBuildingRealBuild(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-build-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not apply real family building writes'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft - 1300, 'rejected real build apply should not change shared balance')

const realBuildApply = await runtime.applyCohabitationFamilyBuildingRealBuild(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  memo: 'qa apply real family building',
  idempotency_key: 'qa-family-building-real-build-apply',
}, actor(largeOwner))
assert.equal(realBuildApply.idempotent, false, 'first real build apply should not be idempotent')
assert.equal(realBuildApply.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real build apply should update original building ledger')
assert.equal(realBuildApply.building_ledger_entry.real_build_applied, true, 'real build apply should mark real build applied')
assert.equal(realBuildApply.building_ledger_entry.status, 'build_applied', 'real build apply should move ledger status to build_applied')
assert.equal(realBuildApply.building_ledger_entry.apply_idempotency_key, 'qa-family-building-real-build-apply', 'real build apply should store apply idempotency key')
assert.equal(realBuildApply.building_ledger_entry.shared_warehouse_materials_consumed, false, 'real build apply should not consume warehouse materials yet')
assert.equal(realBuildApply.building_ledger_entry.personal_money_merged, false, 'real build apply should keep personal money separate')
assert.equal(realBuildApply.shared_fund.deducted_amount, 0, 'real build apply should not deduct shared fund again')
assert.equal(realBuildApply.shared_fund.balance_after, balanceBeforeLargeDraft - 1300, 'real build apply should preserve shared fund balance')
assert.ok(realBuildApply.contract.audit_log.find(entry => entry.action === 'family_building_real_build_applied'), 'real build apply should be audited')
assert.equal(realBuildApply.family_buildings_panel.summary.real_build_applied_count, 1, 'family building panel should count applied real buildings')
assert.equal(
  realBuildApply.family_buildings_panel.candidate_buildings.find(entry => entry.id === 'shared_granary')?.planning_state,
  'build_applied',
  'family building panel should mark applied building as built'
)
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real build apply should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real build apply should not touch partner personal money')

await assert.rejects(
  () => runtime.consumeCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-materials-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not consume family building materials'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft - 1300, 'rejected material consume should not change shared balance')

const largeOwnerWoodBeforeMaterialDeposit = getInventoryItemQuantity(largeOwner, 'wood')
const largeOwnerRiceBeforeMaterialDeposit = getInventoryItemQuantity(largeOwner, 'rice')
const materialWoodDeposit = await runtime.depositCohabitationWarehouseItem(largeContract.contract.id, {
  item_id: 'wood',
  quantity: 28,
  quality: 'normal',
  idempotency_key: 'qa-family-building-material-wood-deposit',
}, actor(largeOwner))
const materialRiceDeposit = await runtime.depositCohabitationWarehouseItem(largeContract.contract.id, {
  item_id: 'rice',
  quantity: 12,
  quality: 'normal',
  idempotency_key: 'qa-family-building-material-rice-deposit',
}, actor(largeOwner))
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'material deposit should deduct owner wood once')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'material deposit should deduct owner rice once')
assert.equal(materialWoodDeposit.warehouse.items.find(item => item.item_id === 'wood')?.quantity, 28, 'building material warehouse should expose deposited wood')
assert.equal(materialRiceDeposit.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 12, 'building material warehouse should expose deposited rice')
const materialConsume = await runtime.consumeCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  memo: 'qa consume family building materials',
  idempotency_key: 'qa-family-building-materials-consume',
}, actor(largeOwner))
assert.equal(materialConsume.idempotent, false, 'first family building material consume should not be idempotent')
assert.equal(materialConsume.building_ledger_entry.id, realBuildApply.building_ledger_entry.id, 'material consume should update original building ledger')
assert.equal(materialConsume.building_ledger_entry.shared_warehouse_materials_consumed, true, 'material consume should mark warehouse materials consumed')
assert.equal(materialConsume.building_ledger_entry.materials_idempotency_key, 'qa-family-building-materials-consume', 'material consume should store idempotency key')
assert.equal(materialConsume.building_ledger_entry.material_consumptions.length, 2, 'material consume should store material consumption summary')
assert.equal(materialConsume.material_ledger_entries.length, 2, 'material consume should write warehouse consume ledgers')
assert.ok(materialConsume.material_ledger_entries.every(entry => entry.action === 'consume'), 'material consume should use warehouse consume action')
assert.ok(materialConsume.material_ledger_entries.some(entry => entry.item_id === 'wood' && entry.source_ledger_ids.includes(materialWoodDeposit.ledger_entry.id)), 'wood consume ledger should reference wood deposit ledger')
assert.ok(materialConsume.material_ledger_entries.some(entry => entry.item_id === 'rice' && entry.source_ledger_ids.includes(materialRiceDeposit.ledger_entry.id)), 'rice consume ledger should reference rice deposit ledger')
assert.equal(materialConsume.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 0, 'material consume should remove required wood from shared warehouse')
assert.equal(materialConsume.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 0, 'material consume should remove required rice from shared warehouse')
assert.equal(materialConsume.shared_warehouse.consumed_quantity, 40, 'material consume should report consumed quantity')
assert.equal(materialConsume.shared_fund.deducted_amount, 0, 'material consume should not deduct shared fund again')
assert.equal(materialConsume.shared_fund.balance_after, balanceBeforeLargeDraft - 1300, 'material consume should preserve shared fund balance')
assert.equal(materialConsume.family_buildings_panel.summary.warehouse_material_consumed_count, 1, 'family building panel should count material-consumed buildings')
assert.equal(
  materialConsume.family_buildings_panel.candidate_buildings.find(entry => entry.id === 'shared_granary')?.planning_state,
  'materials_consumed',
  'family building panel should mark material-consumed building state'
)
assert.ok(materialConsume.contract.audit_log.find(entry => entry.action === 'family_building_materials_consumed'), 'material consume should be audited')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'material consume should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'material consume should not touch partner personal money')

const duplicateMaterialConsume = await runtime.consumeCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-materials-consume',
}, actor(largeOwner))
assert.equal(duplicateMaterialConsume.idempotent, true, 'same material consume idempotency key should be idempotent')
assert.equal(duplicateMaterialConsume.building_ledger_entry.shared_warehouse_materials_consumed, true, 'idempotent material consume should keep consumed flag')
assert.equal(duplicateMaterialConsume.material_ledger_entries.length, 2, 'idempotent material consume should return original consume ledgers')
assert.equal(duplicateMaterialConsume.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 0, 'idempotent material consume should not restore or double-consume wood')

const alreadyConsumedMaterials = await runtime.consumeCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-materials-consume-again',
}, actor(largeOwner))
assert.equal(alreadyConsumedMaterials.idempotent, true, 'already consumed materials should return idempotent response')
assert.equal(alreadyConsumedMaterials.already_consumed, true, 'already consumed materials response should be explicit')
assert.equal(alreadyConsumedMaterials.material_ledger_entries.length, 2, 'already consumed response should return original material ledgers')
assert.equal((await runtime.getCohabitationWarehouse(largeContract.contract.id, actor(largeOwner))).warehouse.ledger.filter(entry => entry.action === 'consume').length, 2, 'already consumed materials should not duplicate warehouse consume ledgers')

const duplicateRealBuildApply = await runtime.applyCohabitationFamilyBuildingRealBuild(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-build-apply',
}, actor(largeOwner))
assert.equal(duplicateRealBuildApply.idempotent, true, 'same real build apply idempotency key should be idempotent')
assert.equal(duplicateRealBuildApply.building_ledger_entry.id, realBuildApply.building_ledger_entry.id, 'idempotent real build apply should return original building ledger')
assert.equal(duplicateRealBuildApply.building_ledger_entry.status, 'build_applied', 'idempotent real build apply should keep build_applied status')
assert.equal(duplicateRealBuildApply.shared_fund.balance_after, balanceBeforeLargeDraft - 1300, 'idempotent real build apply should not change shared fund balance')

const alreadyAppliedRealBuild = await runtime.applyCohabitationFamilyBuildingRealBuild(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-build-apply-again',
}, actor(largeOwner))
assert.equal(alreadyAppliedRealBuild.idempotent, true, 'already applied real build should return idempotent response')
assert.equal(alreadyAppliedRealBuild.already_applied, true, 'already applied real build response should be explicit')
assert.equal(alreadyAppliedRealBuild.building_ledger_entry.status, 'build_applied', 'already applied real build should stay applied')
const familyBuildingsAfterRealApply = await runtime.getCohabitationFamilyBuildings(largeContract.contract.id, actor(largeOwner))
assert.equal(familyBuildingsAfterRealApply.family_buildings_panel.summary.real_build_applied_count, 1, 'family buildings readback should expose applied count')
assert.equal(familyBuildingsAfterRealApply.family_buildings_panel.construction_ledger[0].real_build_applied, true, 'family buildings readback should expose applied ledger')
assert.equal(familyBuildingsAfterRealApply.family_buildings_panel.summary.warehouse_material_consumed_count, 1, 'family buildings readback should expose material consumed count')
assert.equal(familyBuildingsAfterRealApply.family_buildings_panel.construction_ledger[0].shared_warehouse_materials_consumed, true, 'family buildings readback should expose consumed material ledger')
assert.equal(familyBuildingsAfterRealApply.family_buildings_panel.construction_ledger.length, 1, 'real build apply should not duplicate construction ledger')

console.log('[qa-cohabitation-contract] OK')
