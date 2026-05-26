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
    home: {
      farmhouseLevel: username === 'qa_lg_pet_f' ? 2 : 3,
      caveChoice: username === 'cohabit_lg_cave25' || username === 'qa_lg_cvch26' ? 'mushroom' : 'none',
      caveUnlocked: username === 'cohabit_lg_cave25' || username === 'qa_lg_cvch26' || username === 'qa_lg_cvun26',
      greenhouseUnlocked: username === 'cohabit_lg_gh25',
      cellarSlots: username === 'cohabit_lg_cellar25'
        ? [
            { itemId: 'peach_wine', quality: 'fine', daysAging: 3 },
            { itemId: 'rice_vinegar', quality: 'normal', daysAging: 1 },
          ]
        : username === 'qa_lg_cel_f'
          ? [
              { itemId: 'peach_wine', quality: 'fine', daysAging: 2 },
            ]
        : [],
      homeRenovationStates: username === 'cohabit_lg_owner25'
        ? { scholar_room: true, tea_corner: true }
        : username === 'cohabit_lg_partner25'
          ? { scholar_room: true, ancestral_display_wall: true }
          : username === 'qa_lg_ren_f'
            ? { ancestral_display_wall: true }
            : /^qa_lg_[a-z]+_s$/.test(username)
              ? { scholar_room: true }
              : {},
    },
    decoration: {
      owned: username.includes('_lg_') ? { bamboo_lamp: 2 } : {},
      placed: username.includes('_lg_') ? { bamboo_lamp: 1 } : {},
    },
    animal: {
      pets: username === 'cohabit_lg_fh25' || username === 'qa_lg_pet_f'
        ? [
            { type: 'cat', name: 'Mimi' },
            { type: 'dog', name: 'Wang' },
          ]
        : [],
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

const mutateStoredContract = async (contractId, mutate) => {
  const raw = JSON.parse(await readFile(contractStoreFile, 'utf8'))
  const contract = raw.contracts.find(entry => entry.id === contractId)
  assert.ok(contract, 'contract should exist in cohabitation store')
  mutate(contract)
  await writeFile(contractStoreFile, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
}

const injectReadyFamilyBuildingMainStateLedger = async (contractId, {
  actorUsername,
  ledgerId,
  realBuildRef,
}) => mutateStoredContract(contractId, contract => {
  contract.family_building_ledger = [
    {
      id: ledgerId,
      contract_id: contract.id,
      action: 'compensated',
      status: 'compensated',
      purpose: 'family_building',
      target_ref: 'family_building:shared_granary:build',
      building_id: 'shared_granary',
      project_id: 'shared_granary',
      actor_username: actorUsername,
      amount: 0,
      shared_fund_balance_before: 0,
      shared_fund_balance_after: 0,
      shared_fund_deducted: false,
      shared_warehouse_materials_consumed: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      real_build_applied: true,
      real_build_ref: realBuildRef,
      compensation_required: false,
      real_build_demolished: true,
      real_build_demolition_review_state: 'executed',
      real_build_demolition_execution_state: 'executed',
      real_build_demolition_personal_save_write_idempotency_key: `${ledgerId}-personal-save-write`,
      deferred_operations: [],
      at: 1771950000,
      created_at: 1771950000,
    },
  ]
})

const getInventoryItemQuantity = (username, itemId, quality = 'normal') => {
  const data = readGameplayData(username)
  return (data?.inventory?.items || [])
    .filter(entry => entry?.itemId === itemId && String(entry?.quality || 'normal') === quality)
    .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
}

const pickPersonalStoryBoundaryState = username => {
  const data = readGameplayData(username) || {}
  return JSON.parse(JSON.stringify({
    player: data.player || null,
    inventory: data.inventory || null,
    farm: data.farm || null,
    npcs: data.npcs || null,
    npc: data.npc || null,
    hiddenNpcs: data.hiddenNpcs || null,
    hiddenNpc: data.hiddenNpc || null,
    home: data.home || null,
    family: data.family || null,
    children: data.children || null,
  }))
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

await mutateStoredContract(created.contract.id, contract => {
  contract.origin_assets = contract.origin_assets || {}
  contract.origin_assets.decorations = [
    {
      id: 'qa-owner-lantern',
      decoration_id: 'qa-owner-lantern',
      decoration_label: 'QA owner lantern',
      origin_owner_id: `save:${owner}`,
      origin_owner_username: owner,
      origin_owner_key: owner.toLowerCase(),
      ledger_id: 'qa-decoration-ledger-owner',
    },
    {
      id: 'qa-partner-bench',
      decoration_id: 'qa-partner-bench',
      decoration_label: 'QA partner bench',
      origin_owner_id: `save:${partner}`,
      origin_owner_username: partner,
      origin_owner_key: partner.toLowerCase(),
      ledger_id: 'qa-decoration-ledger-partner',
    },
  ]
  contract.family_building_ledger = [
    {
      id: 'qa-separation-building-ledger',
      contract_id: contract.id,
      action: 'real_build_applied',
      purpose: 'family_building',
      purpose_label: 'QA family building',
      target_ref: 'family_building:shared_granary:build',
      building_id: 'shared_granary',
      project_id: 'shared_granary',
      draft_id: 'qa-separation-building-draft',
      fund_ledger_id: 'qa-separation-building-fund-ledger',
      actor_username: owner,
      amount: 300,
      shared_fund_deducted: true,
      real_build_applied: true,
      shared_warehouse_materials_consumed: true,
      at: Math.floor(Date.now() / 1000),
      idempotency_key: 'qa-separation-building-ledger',
    },
    ...(contract.family_building_ledger || []),
  ]
})

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
assert.match(previewResult.preview.asset_return.decoration_split_manifest_hash, /^[a-f0-9]{64}$/, 'separation preview should expose decoration split manifest hash')
assert.match(previewResult.preview.asset_return.family_building_split_manifest_hash, /^[a-f0-9]{64}$/, 'separation preview should expose family building split manifest hash')
assert.equal(previewResult.preview.asset_return.decoration_split_manifest.length, 2, 'separation preview should include traceable decoration split rows')
assert.equal(previewResult.preview.asset_return.family_building_split_manifest.length, 1, 'separation preview should include traceable family building split rows')
assert.ok(previewResult.preview.asset_return.decorations_by_origin_owner.some(item => item.origin_owner_username === owner && item.decoration_count === 1), 'separation preview should summarize owner decorations')
assert.ok(previewResult.preview.asset_return.family_buildings_by_origin_owner.some(item => item.building_ledger_id === 'qa-separation-building-ledger'), 'separation preview should summarize family building ledger splits')
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
  () => runtime.splitSeparationDecorationsAndBuildings(created.contract.id, previewResult.preview.id, {
    memo: 'wrong decoration split hash',
    plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
    decoration_split_manifest_hash: 'c'.repeat(64),
    building_split_manifest_hash: previewResult.preview.asset_return.family_building_split_manifest_hash,
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-decoration-building-split-wrong-hash',
  }, actor(owner)),
  /hash 不匹配|hash 涓嶅尮閰?/,
  'decoration building split should reject mismatched manifest hash'
)

const ownerBoundaryBeforeDecorationSplit = pickPersonalStoryBoundaryState(owner)
const partnerBoundaryBeforeDecorationSplit = pickPersonalStoryBoundaryState(partner)
const decorationBuildingSplit = await runtime.splitSeparationDecorationsAndBuildings(created.contract.id, previewResult.preview.id, {
  memo: 'record decoration and building split only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  decoration_split_manifest_hash: previewResult.preview.asset_return.decoration_split_manifest_hash,
  building_split_manifest_hash: previewResult.preview.asset_return.family_building_split_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-decoration-building-split',
}, actor(owner))
assert.equal(decorationBuildingSplit.idempotent, false, 'first decoration building split should not be idempotent')
assert.equal(decorationBuildingSplit.execution_ledger.status, 'decorations_buildings_split', 'decoration building split should advance execution ledger status')
assert.equal(decorationBuildingSplit.execution_ledger.decorations_buildings_split, true, 'decoration building split should mark ledger split')
assert.equal(decorationBuildingSplit.preview.confirmation_state.execution_request.status, 'decorations_buildings_split', 'execution request should advance to decorations-buildings-split')
assert.equal(decorationBuildingSplit.execution_ledger.decoration_splits_by_origin_owner.reduce((sum, item) => sum + item.decoration_count, 0), 2, 'decoration split should summarize all decorations')
assert.equal(decorationBuildingSplit.execution_ledger.building_splits_by_origin_owner.length, 1, 'building split should summarize family building ledger')
assert.ok(!decorationBuildingSplit.execution_ledger.next_required_operations.includes('split_decorations'), 'decoration building split should close split_decorations follow-up')
assert.ok(decorationBuildingSplit.execution_ledger.next_required_operations.includes('resolve_family_story'), 'decoration building split should keep family story follow-up')
assert.equal(decorationBuildingSplit.receipts.length, 2, 'decoration building split should create decoration and building receipts')
assert.ok(decorationBuildingSplit.contract.audit_log.find(entry => entry.action === 'separation_decorations_buildings_split' && entry.idempotency_key === 'qa-separation-decoration-building-split'), 'decoration building split should be audited')
assert.deepEqual(pickPersonalStoryBoundaryState(owner), ownerBoundaryBeforeDecorationSplit, 'decoration building split should not change owner money inventory farm npc home family or children state')
assert.deepEqual(pickPersonalStoryBoundaryState(partner), partnerBoundaryBeforeDecorationSplit, 'decoration building split should not change partner money inventory farm npc home family or children state')

const ownerRawAfterDecorationSplit = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterDecorationSplit = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicateDecorationBuildingSplit = await runtime.splitSeparationDecorationsAndBuildings(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate decoration and building split only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  decoration_split_manifest_hash: previewResult.preview.asset_return.decoration_split_manifest_hash,
  building_split_manifest_hash: previewResult.preview.asset_return.family_building_split_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-decoration-building-split',
}, actor(owner))
assert.equal(duplicateDecorationBuildingSplit.idempotent, true, 'same decoration building split idempotency key should return existing split')
assert.equal(duplicateDecorationBuildingSplit.execution_ledger.id, decorationBuildingSplit.execution_ledger.id, 'idempotent decoration building split should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterDecorationSplit, 'idempotent decoration building split should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterDecorationSplit, 'idempotent decoration building split should not rewrite partner save')

const alreadyDecorationBuildingSplit = await runtime.splitSeparationDecorationsAndBuildings(created.contract.id, previewResult.preview.id, {
  memo: 'already split with another key',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  decoration_split_manifest_hash: previewResult.preview.asset_return.decoration_split_manifest_hash,
  building_split_manifest_hash: previewResult.preview.asset_return.family_building_split_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-decoration-building-split-again',
}, actor(partner))
assert.equal(alreadyDecorationBuildingSplit.idempotent, true, 'already split decoration building request should be idempotent with new key')
assert.equal(alreadyDecorationBuildingSplit.already_split, true, 'already split decoration building response should be explicit')
assert.equal(alreadyDecorationBuildingSplit.execution_ledger.id, decorationBuildingSplit.execution_ledger.id, 'already split decoration building should return original ledger')

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
assert.ok(!familyStoryResolution.execution_ledger.next_required_operations.includes('split_decorations'), 'family story resolution should keep decoration split closed after split record')
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

await assert.rejects(
  () => runtime.writeSeparationPersonalStoryReceipts(created.contract.id, previewResult.preview.id, {
    memo: 'wrong personal story receipt hash',
    plot_return_manifest_hash: 'd'.repeat(64),
    execution_ledger_id: assetReturnRecord.execution_ledger.id,
    idempotency_key: 'qa-separation-personal-story-receipts-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'personal story receipts should reject mismatched manifest hash'
)

const ownerBoundaryBeforeStoryReceipts = pickPersonalStoryBoundaryState(owner)
const partnerBoundaryBeforeStoryReceipts = pickPersonalStoryBoundaryState(partner)
const personalStoryReceipts = await runtime.writeSeparationPersonalStoryReceipts(created.contract.id, previewResult.preview.id, {
  memo: 'write personal story receipt only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-story-receipts',
}, actor(owner))
assert.equal(personalStoryReceipts.idempotent, false, 'first personal story receipt write should not be idempotent')
assert.equal(personalStoryReceipts.execution_ledger.status, 'personal_story_receipts_written', 'personal story receipts should advance execution ledger status')
assert.equal(personalStoryReceipts.execution_ledger.personal_story_receipts_written, true, 'personal story receipts should mark ledger written')
assert.equal(personalStoryReceipts.preview.confirmation_state.execution_request.status, 'personal_story_receipts_written', 'execution request should advance to personal-story-receipts-written')
assert.equal(personalStoryReceipts.receipts.length, 2, 'personal story receipt write should create one receipt per accepted member')
assert.ok(personalStoryReceipts.receipts.every(receipt => receipt.personal_story_state === 'receipt_recorded_only'), 'personal story receipts should stay receipt-only')
assert.ok(!personalStoryReceipts.execution_ledger.next_required_operations.includes('split_decorations'), 'personal story receipt write should keep decoration split closed')
assert.ok(!personalStoryReceipts.execution_ledger.next_required_operations.includes('write_personal_story_receipts'), 'personal story receipt write should close receipt follow-up')
assert.ok(personalStoryReceipts.contract.audit_log.find(entry => entry.action === 'separation_personal_story_receipts_written' && entry.idempotency_key === 'qa-separation-personal-story-receipts'), 'personal story receipt write should be audited')
assert.deepEqual(pickPersonalStoryBoundaryState(owner), ownerBoundaryBeforeStoryReceipts, 'personal story receipt write should not change owner money inventory farm npc home family or children state')
assert.deepEqual(pickPersonalStoryBoundaryState(partner), partnerBoundaryBeforeStoryReceipts, 'personal story receipt write should not change partner money inventory farm npc home family or children state')
assert.ok((readGameplayData(owner)?.onlineCohabitation?.story_receipts || []).some(receipt => receipt.execution_ledger_id === assetReturnRecord.execution_ledger.id), 'owner save should receive personal story receipt')
assert.ok((readGameplayData(partner)?.onlineCohabitation?.story_receipts || []).some(receipt => receipt.execution_ledger_id === assetReturnRecord.execution_ledger.id), 'partner save should receive personal story receipt')

const ownerRawAfterPersonalStoryReceipts = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterPersonalStoryReceipts = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicatePersonalStoryReceipts = await runtime.writeSeparationPersonalStoryReceipts(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate personal story receipt only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: assetReturnRecord.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-story-receipts',
}, actor(owner))
assert.equal(duplicatePersonalStoryReceipts.idempotent, true, 'same personal story receipt idempotency key should return existing receipts')
assert.equal(duplicatePersonalStoryReceipts.execution_ledger.id, personalStoryReceipts.execution_ledger.id, 'idempotent personal story receipt write should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterPersonalStoryReceipts, 'idempotent personal story receipt write should not rewrite owner save again')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterPersonalStoryReceipts, 'idempotent personal story receipt write should not rewrite partner save again')

await mutateStoredContract(created.contract.id, contract => {
  contract.type = 'marriage_home'
  contract.family_state = {
    ...(contract.family_state || {}),
    has_children: true,
    child_count: 1,
  }
  const ledger = (contract.separation_execution_ledger || []).find(entry => entry.id === personalStoryReceipts.execution_ledger.id)
  assert.ok(ledger, 'personal story ledger should exist before child arrangement mutation')
  ledger.family_story_resolution = {
    ...(ledger.family_story_resolution || {}),
    child_arrangement_required: true,
  }
  ledger.next_required_operations = Array.from(new Set([...(ledger.next_required_operations || []), 'resolve_child_arrangement']))
  const preview = (contract.separation_previews || []).find(entry => entry.id === previewResult.preview.id)
  assert.ok(preview, 'separation preview should exist before child arrangement mutation')
  preview.confirmation_state = preview.confirmation_state || {}
  preview.confirmation_state.execution_request = {
    ...(preview.confirmation_state.execution_request || {}),
    status: 'personal_story_receipts_written',
    execution_ledger_id: personalStoryReceipts.execution_ledger.id,
    family_story_resolution: ledger.family_story_resolution,
    next_required_operations: ledger.next_required_operations,
  }
  preview.deferred_operations = ledger.next_required_operations
})

await assert.rejects(
  () => runtime.resolveSeparationChildArrangement(created.contract.id, previewResult.preview.id, {
    memo: 'wrong child arrangement hash',
    plot_return_manifest_hash: 'e'.repeat(64),
    execution_ledger_id: personalStoryReceipts.execution_ledger.id,
    arrangement_choice: 'shared_care_pending_personal_saves',
    idempotency_key: 'qa-separation-child-arrangement-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'child arrangement should reject mismatched manifest hash'
)

const ownerBoundaryBeforeChildArrangement = pickPersonalStoryBoundaryState(owner)
const partnerBoundaryBeforeChildArrangement = pickPersonalStoryBoundaryState(partner)
const childArrangement = await runtime.resolveSeparationChildArrangement(created.contract.id, previewResult.preview.id, {
  memo: 'record child arrangement only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: personalStoryReceipts.execution_ledger.id,
  arrangement_choice: 'shared_care_pending_personal_saves',
  idempotency_key: 'qa-separation-child-arrangement',
}, actor(owner))
assert.equal(childArrangement.idempotent, false, 'first child arrangement resolution should not be idempotent')
assert.equal(childArrangement.execution_ledger.status, 'child_arrangement_resolved', 'child arrangement should advance execution ledger status')
assert.equal(childArrangement.execution_ledger.child_arrangement_resolved, true, 'child arrangement should mark ledger resolved')
assert.equal(childArrangement.preview.confirmation_state.execution_request.status, 'child_arrangement_resolved', 'execution request should advance to child-arrangement-resolved')
assert.equal(childArrangement.child_arrangement.child_count, 1, 'child arrangement should record child count')
assert.equal(childArrangement.child_arrangement.personal_family_save_write_required, true, 'child arrangement should leave personal family save receipt pending')
assert.equal(childArrangement.child_arrangement.children_private, true, 'child arrangement should keep children private')
assert.ok(!childArrangement.execution_ledger.next_required_operations.includes('resolve_child_arrangement'), 'child arrangement should close child arrangement follow-up')
assert.ok(!childArrangement.execution_ledger.next_required_operations.includes('split_decorations'), 'child arrangement should keep decoration split closed')
assert.ok(childArrangement.contract.audit_log.find(entry => entry.action === 'separation_child_arrangement_resolved' && entry.idempotency_key === 'qa-separation-child-arrangement'), 'child arrangement should be audited')
assert.deepEqual(pickPersonalStoryBoundaryState(owner), ownerBoundaryBeforeChildArrangement, 'child arrangement should not change owner money inventory farm npc home family or children state')
assert.deepEqual(pickPersonalStoryBoundaryState(partner), partnerBoundaryBeforeChildArrangement, 'child arrangement should not change partner money inventory farm npc home family or children state')

const ownerRawAfterChildArrangement = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterChildArrangement = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicateChildArrangement = await runtime.resolveSeparationChildArrangement(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate child arrangement only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: personalStoryReceipts.execution_ledger.id,
  arrangement_choice: 'shared_care_pending_personal_saves',
  idempotency_key: 'qa-separation-child-arrangement',
}, actor(owner))
assert.equal(duplicateChildArrangement.idempotent, true, 'same child arrangement idempotency key should return existing record')
assert.equal(duplicateChildArrangement.execution_ledger.id, childArrangement.execution_ledger.id, 'idempotent child arrangement should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterChildArrangement, 'idempotent child arrangement should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterChildArrangement, 'idempotent child arrangement should not rewrite partner save')

await assert.rejects(
  () => runtime.writeSeparationPersonalFamilyReceipts(created.contract.id, previewResult.preview.id, {
    memo: 'wrong personal family receipt hash',
    plot_return_manifest_hash: 'f'.repeat(64),
    execution_ledger_id: childArrangement.execution_ledger.id,
    idempotency_key: 'qa-separation-personal-family-receipts-wrong-hash',
  }, actor(owner)),
  /hash 不匹配/,
  'personal family receipts should reject mismatched manifest hash'
)

const ownerBoundaryBeforeFamilyReceipts = pickPersonalStoryBoundaryState(owner)
const partnerBoundaryBeforeFamilyReceipts = pickPersonalStoryBoundaryState(partner)
const personalFamilyReceipts = await runtime.writeSeparationPersonalFamilyReceipts(created.contract.id, previewResult.preview.id, {
  memo: 'write personal family receipt only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: childArrangement.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-family-receipts',
}, actor(owner))
assert.equal(personalFamilyReceipts.idempotent, false, 'first personal family receipt write should not be idempotent')
assert.equal(personalFamilyReceipts.execution_ledger.status, 'personal_family_receipts_written', 'personal family receipts should advance execution ledger status')
assert.equal(personalFamilyReceipts.execution_ledger.personal_family_receipts_written, true, 'personal family receipts should mark ledger written')
assert.equal(personalFamilyReceipts.preview.confirmation_state.execution_request.status, 'personal_family_receipts_written', 'execution request should advance to personal-family-receipts-written')
assert.equal(personalFamilyReceipts.receipts.length, 2, 'personal family receipt write should create one receipt per accepted member')
assert.ok(personalFamilyReceipts.receipts.every(receipt => receipt.arrangement_state === 'personal_family_receipt_recorded_only'), 'personal family receipts should stay receipt-only')
assert.ok(!personalFamilyReceipts.execution_ledger.next_required_operations.includes('write_personal_family_receipts'), 'personal family receipt write should close family receipt follow-up')
assert.ok(!personalFamilyReceipts.execution_ledger.next_required_operations.includes('split_decorations'), 'personal family receipt write should keep decoration split closed')
assert.ok(personalFamilyReceipts.contract.audit_log.find(entry => entry.action === 'separation_personal_family_receipts_written' && entry.idempotency_key === 'qa-separation-personal-family-receipts'), 'personal family receipt write should be audited')
assert.deepEqual(pickPersonalStoryBoundaryState(owner), ownerBoundaryBeforeFamilyReceipts, 'personal family receipt write should not change owner money inventory farm npc home family or children state')
assert.deepEqual(pickPersonalStoryBoundaryState(partner), partnerBoundaryBeforeFamilyReceipts, 'personal family receipt write should not change partner money inventory farm npc home family or children state')
assert.ok((readGameplayData(owner)?.onlineCohabitation?.family_receipts || []).some(receipt => receipt.execution_ledger_id === childArrangement.execution_ledger.id), 'owner save should receive personal family receipt')
assert.ok((readGameplayData(partner)?.onlineCohabitation?.family_receipts || []).some(receipt => receipt.execution_ledger_id === childArrangement.execution_ledger.id), 'partner save should receive personal family receipt')

const ownerRawAfterFamilyReceipts = saveRuntime.loadUserSaveSlots(owner).slots[0].raw
const partnerRawAfterFamilyReceipts = saveRuntime.loadUserSaveSlots(partner).slots[0].raw
const duplicateFamilyReceipts = await runtime.writeSeparationPersonalFamilyReceipts(created.contract.id, previewResult.preview.id, {
  memo: 'duplicate personal family receipt only',
  plot_return_manifest_hash: previewResult.preview.asset_return.plot_return_manifest_hash,
  execution_ledger_id: childArrangement.execution_ledger.id,
  idempotency_key: 'qa-separation-personal-family-receipts',
}, actor(owner))
assert.equal(duplicateFamilyReceipts.idempotent, true, 'same personal family receipt idempotency key should return existing receipts')
assert.equal(duplicateFamilyReceipts.execution_ledger.id, personalFamilyReceipts.execution_ledger.id, 'idempotent personal family receipt write should keep ledger id')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawAfterFamilyReceipts, 'idempotent personal family receipt write should not rewrite owner save again')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawAfterFamilyReceipts, 'idempotent personal family receipt write should not rewrite partner save again')

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
const largeCavePartner = 'cohabit_lg_cave25'
const largeCellarPartner = 'cohabit_lg_cellar25'
const largeOwnerRegister = await db.registerUser(largeOwner, 'SmokePass_0525', 'large fund owner')
const largePartnerRegister = await db.registerUser(largePartner, 'SmokePass_0525', 'large fund partner')
const largeCavePartnerRegister = await db.registerUser(largeCavePartner, 'SmokePass_0525', 'large cave partner')
const largeCellarPartnerRegister = await db.registerUser(largeCellarPartner, 'SmokePass_0525', 'large cellar partner')
assert.equal(largeOwnerRegister.ok, true, 'large fund owner QA user should register')
assert.equal(largePartnerRegister.ok, true, 'large fund partner QA user should register')
assert.equal(largeCavePartnerRegister.ok, true, 'large cave partner QA user should register')
assert.equal(largeCellarPartnerRegister.ok, true, 'large cellar partner QA user should register')
seedSave(largeOwner)
seedSave(largePartner)
seedSave(largeCavePartner)
seedSave(largeCellarPartner)
const largeFriendRequest = await socialRuntime.requestFriendship(largeOwner, { target_username: largePartner })
await socialRuntime.acceptFriendRequest(largePartner, largeFriendRequest.id)
const largeCaveFriendRequest = await socialRuntime.requestFriendship(largeOwner, { target_username: largeCavePartner })
await socialRuntime.acceptFriendRequest(largeCavePartner, largeCaveFriendRequest.id)
const largeCellarFriendRequest = await socialRuntime.requestFriendship(largeOwner, { target_username: largeCellarPartner })
await socialRuntime.acceptFriendRequest(largeCellarPartner, largeCellarFriendRequest.id)
const largeContract = await runtime.createCohabitationContract({
  type: 'business_partner',
  target_usernames: [largePartner, largeCavePartner, largeCellarPartner],
  idempotency_key: 'qa-large-fund-contract',
}, actor(largeOwner))
await runtime.acceptCohabitationContract(largeContract.contract.id, actor(largePartner))
await runtime.acceptCohabitationContract(largeContract.contract.id, actor(largeCavePartner))
await runtime.acceptCohabitationContract(largeContract.contract.id, actor(largeCellarPartner))

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
assert.deepEqual(largeDraft.draft.required_member_usernames.sort(), [largeOwner, largePartner, largeCavePartner, largeCellarPartner].sort(), 'large fund draft should require all accepted members')
assert.deepEqual(largeDraft.draft.confirmed_member_usernames, [largeOwner], 'large fund draft should auto-confirm requester only')
assert.deepEqual(largeDraft.draft.pending_member_usernames.sort(), [largePartner, largeCavePartner, largeCellarPartner].sort(), 'large fund draft should keep the other members pending')
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
const largeCavePartnerMoneyBeforeConfirm = readGameplayData(largeCavePartner)?.player?.money
const largeCellarPartnerMoneyBeforeConfirm = readGameplayData(largeCellarPartner)?.player?.money
const largeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  memo: 'qa partner confirms large family building draft',
  idempotency_key: 'qa-fund-large-building-draft-partner-confirm',
}, actor(largePartner))
assert.equal(largeConfirm.idempotent, false, 'first large fund draft confirmation should not be idempotent')
assert.equal(largeConfirm.draft.id, largeDraft.draft.id, 'large fund confirmation should return the same draft')
assert.equal(largeConfirm.draft.state, 'pending_confirmation', 'large fund draft should stay pending until every accepted member confirms')
assert.equal(largeConfirm.draft.confirmation_status, 'pending', 'large fund draft should stay pending after the second member confirms')
assert.deepEqual(largeConfirm.draft.confirmed_member_usernames.sort(), [largeOwner, largePartner].sort(), 'large fund draft should record the first two confirmed members')
assert.deepEqual(largeConfirm.draft.pending_member_usernames.sort(), [largeCavePartner, largeCellarPartner].sort(), 'large fund draft should keep cave and cellar partners pending')
assert.equal(largeConfirm.draft.confirmation_state.all_members_confirmed, false, 'large fund confirmation state should not complete before cave and cellar partners confirm')
assert.equal(largeConfirm.draft.confirmation_state.ready_for_execution_request, false, 'large fund confirmation state should not allow execution while cave and cellar partners are pending')
assert.equal(largeConfirm.draft.confirmation_state.can_execute_now, false, 'confirmed large fund draft should not execute immediately')
assert.equal(largeConfirm.draft.execution_enabled, false, 'large fund execution should stay disabled after confirmation')
assert.equal(largeConfirm.shared_fund.deducted_amount, 0, 'large fund confirmation should not deduct shared fund')
assert.equal(largeConfirm.fund.balance, balanceBeforeLargeDraft, 'large fund confirmation should leave shared balance unchanged')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'large fund confirmation should not touch partner personal money')
assert.ok(largeConfirm.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_confirmed'), 'large fund confirmation should be audited')
assert.equal(largeConfirm.fund.summary.pending_large_spend_draft_count, 1, 'fund snapshot should keep partially confirmed large drafts pending')
assert.equal(largeConfirm.fund.summary.ready_large_spend_draft_count, 0, 'fund snapshot should not count partially confirmed large drafts as ready')
assert.equal(largeConfirm.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should not enable execution for a member without spend_large permission')

await assert.rejects(
  () => runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
    idempotency_key: 'qa-fund-large-building-draft-execute-before-cave-confirm',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'large fund drafts should not execute before cave partner confirms'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft, 'rejected pre-cave-confirm large execution should not change shared balance')

const largeCaveConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  memo: 'qa cave partner confirms large family building draft',
  idempotency_key: 'qa-fund-large-building-draft-cave-confirm',
}, actor(largeCavePartner))
assert.equal(largeCaveConfirm.idempotent, false, 'first cave partner large fund draft confirmation should not be idempotent')
assert.equal(largeCaveConfirm.draft.id, largeDraft.draft.id, 'cave partner large fund confirmation should return the same draft')
assert.equal(largeCaveConfirm.draft.state, 'pending_confirmation', 'large fund draft should stay pending until cellar partner confirms')
assert.equal(largeCaveConfirm.draft.confirmation_status, 'pending', 'large fund draft should stay pending after cave partner confirms')
assert.deepEqual(largeCaveConfirm.draft.confirmed_member_usernames.sort(), [largeOwner, largePartner, largeCavePartner].sort(), 'large fund draft should record cave partner confirmation')
assert.deepEqual(largeCaveConfirm.draft.pending_member_usernames, [largeCellarPartner], 'large fund draft should keep cellar partner pending')
assert.equal(largeCaveConfirm.draft.confirmation_state.all_members_confirmed, false, 'large fund confirmation state should not complete before cellar partner confirms')
assert.equal(largeCaveConfirm.draft.confirmation_state.ready_for_execution_request, false, 'large fund confirmation state should not allow execution while cellar partner is pending')
assert.equal(largeCaveConfirm.draft.confirmation_state.can_execute_now, false, 'partially confirmed large fund draft should not execute immediately')
assert.equal(largeCaveConfirm.draft.execution_enabled, false, 'large fund execution should stay disabled until cellar partner confirms')
assert.equal(largeCaveConfirm.shared_fund.deducted_amount, 0, 'cave partner large fund confirmation should not deduct shared fund')
assert.equal(largeCaveConfirm.fund.balance, balanceBeforeLargeDraft, 'cave partner large fund confirmation should leave shared balance unchanged')
assert.equal(readGameplayData(largeCavePartner)?.player?.money, largeCavePartnerMoneyBeforeConfirm, 'large fund confirmation should not touch cave partner personal money')
assert.ok(largeCaveConfirm.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_confirmed'), 'cave partner large fund confirmation should be audited')
assert.equal(largeCaveConfirm.fund.summary.pending_large_spend_draft_count, 1, 'fund snapshot should keep cellar-pending large drafts pending')
assert.equal(largeCaveConfirm.fund.summary.ready_large_spend_draft_count, 0, 'fund snapshot should not count cellar-pending large drafts as ready')
assert.equal(largeCaveConfirm.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should not enable execution for a member without spend_large permission')

await assert.rejects(
  () => runtime.executeCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
    idempotency_key: 'qa-fund-large-building-draft-execute-before-cellar-confirm',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'large fund drafts should not execute before cellar partner confirms'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft, 'rejected pre-cellar-confirm large execution should not change shared balance')

const largeCellarConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  memo: 'qa cellar partner confirms large family building draft',
  idempotency_key: 'qa-fund-large-building-draft-cellar-confirm',
}, actor(largeCellarPartner))
assert.equal(largeCellarConfirm.idempotent, false, 'first cellar partner large fund draft confirmation should not be idempotent')
assert.equal(largeCellarConfirm.draft.id, largeDraft.draft.id, 'cellar partner large fund confirmation should return the same draft')
assert.equal(largeCellarConfirm.draft.state, 'ready_to_execute', 'large fund draft should become ready after all members confirm')
assert.equal(largeCellarConfirm.draft.confirmation_status, 'confirmed', 'large fund draft should mark confirmation as complete')
assert.deepEqual(largeCellarConfirm.draft.confirmed_member_usernames.sort(), [largeOwner, largePartner, largeCavePartner, largeCellarPartner].sort(), 'large fund draft should record all confirmed members')
assert.equal(largeCellarConfirm.draft.pending_member_usernames.length, 0, 'large fund draft should have no pending members after all confirmations')
assert.equal(largeCellarConfirm.draft.confirmation_state.all_members_confirmed, true, 'large fund confirmation state should mark all members confirmed')
assert.equal(largeCellarConfirm.draft.confirmation_state.ready_for_execution_request, true, 'large fund confirmation state should allow a later execution request')
assert.equal(largeCellarConfirm.draft.confirmation_state.can_execute_now, false, 'confirmed large fund draft should not execute immediately')
assert.equal(largeCellarConfirm.draft.execution_enabled, false, 'large fund execution should stay disabled after all confirmations')
assert.equal(largeCellarConfirm.shared_fund.deducted_amount, 0, 'cellar partner large fund confirmation should not deduct shared fund')
assert.equal(largeCellarConfirm.fund.balance, balanceBeforeLargeDraft, 'cellar partner large fund confirmation should leave shared balance unchanged')
assert.equal(readGameplayData(largeCellarPartner)?.player?.money, largeCellarPartnerMoneyBeforeConfirm, 'large fund confirmation should not touch cellar partner personal money')
assert.ok(largeCellarConfirm.contract.audit_log.find(entry => entry.action === 'fund_large_spend_draft_confirmed'), 'cellar partner large fund confirmation should be audited')
assert.equal(largeCellarConfirm.fund.summary.pending_large_spend_draft_count, 0, 'fund snapshot should move confirmed large drafts out of pending count')
assert.equal(largeCellarConfirm.fund.summary.ready_large_spend_draft_count, 1, 'fund snapshot should count ready large drafts')
assert.equal(largeCellarConfirm.fund.summary.large_spend_execution_enabled, false, 'fund snapshot should not enable execution for a member without spend_large permission')
const largeOwnerReadyFund = await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))
assert.equal(largeOwnerReadyFund.fund.summary.large_spend_execution_enabled, true, 'fund snapshot should enable large execution for a permitted actor after all members confirm')

const duplicateLargeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-partner-confirm',
}, actor(largePartner))
assert.equal(duplicateLargeConfirm.idempotent, true, 'same large fund confirmation idempotency key should be idempotent')
assert.equal(duplicateLargeConfirm.draft.id, largeDraft.draft.id, 'idempotent large confirmation should return the original draft')
assert.equal(duplicateLargeConfirm.fund.balance, balanceBeforeLargeDraft, 'idempotent large confirmation should not deduct balance')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'idempotent large confirmation should not touch personal money')

const duplicateCaveLargeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-cave-confirm',
}, actor(largeCavePartner))
assert.equal(duplicateCaveLargeConfirm.idempotent, true, 'same cave partner large fund confirmation idempotency key should be idempotent')
assert.equal(duplicateCaveLargeConfirm.draft.id, largeDraft.draft.id, 'idempotent cave confirmation should return the original draft')
assert.equal(duplicateCaveLargeConfirm.fund.balance, balanceBeforeLargeDraft, 'idempotent cave confirmation should not deduct balance')
assert.equal(readGameplayData(largeCavePartner)?.player?.money, largeCavePartnerMoneyBeforeConfirm, 'idempotent cave confirmation should not touch personal money')

const duplicateCellarLargeConfirm = await runtime.confirmCohabitationFundLargeSpendDraft(largeContract.contract.id, largeDraft.draft.id, {
  idempotency_key: 'qa-fund-large-building-draft-cellar-confirm',
}, actor(largeCellarPartner))
assert.equal(duplicateCellarLargeConfirm.idempotent, true, 'same cellar partner large fund confirmation idempotency key should be idempotent')
assert.equal(duplicateCellarLargeConfirm.draft.id, largeDraft.draft.id, 'idempotent cellar confirmation should return the original draft')
assert.equal(duplicateCellarLargeConfirm.fund.balance, balanceBeforeLargeDraft, 'idempotent cellar confirmation should not deduct balance')
assert.equal(readGameplayData(largeCellarPartner)?.player?.money, largeCellarPartnerMoneyBeforeConfirm, 'idempotent cellar confirmation should not touch personal money')

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

await assert.rejects(
  () => runtime.rollbackCohabitationFamilyBuilding(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-rollback-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not record family building rollback'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft - 1300, 'rejected building rollback should not change shared balance')

const familyBuildingRollback = await runtime.rollbackCohabitationFamilyBuilding(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa record-only family building rollback',
  idempotency_key: 'qa-family-building-rollback-record',
}, actor(largeOwner))
assert.equal(familyBuildingRollback.idempotent, false, 'first family building rollback should not be idempotent')
assert.equal(familyBuildingRollback.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'building rollback should update original building ledger')
assert.equal(familyBuildingRollback.building_ledger_entry.status, 'reverted', 'building rollback should move ledger status to reverted')
assert.equal(familyBuildingRollback.building_ledger_entry.action, 'reverted', 'building rollback should record reverted action')
assert.equal(familyBuildingRollback.building_ledger_entry.rollback_idempotency_key, 'qa-family-building-rollback-record', 'building rollback should store rollback idempotency key')
assert.equal(familyBuildingRollback.building_ledger_entry.rollback_reason, 'qa record-only family building rollback', 'building rollback should store rollback reason')
assert.equal(familyBuildingRollback.rollback.shared_fund_refunded, false, 'building rollback should not refund shared fund automatically')
assert.equal(familyBuildingRollback.rollback.shared_warehouse_restored, false, 'building rollback should not restore shared warehouse automatically')
assert.equal(familyBuildingRollback.rollback.personal_money_merged, false, 'building rollback should keep personal money separate')
assert.equal(familyBuildingRollback.rollback.personal_inventory_merged, false, 'building rollback should keep personal inventory separate')
assert.equal(familyBuildingRollback.family_buildings_panel.summary.real_build_applied_count, 0, 'rollback should remove reverted building from active applied count')
assert.equal(familyBuildingRollback.family_buildings_panel.summary.warehouse_material_consumed_count, 0, 'rollback should remove reverted building from active material-consumed count')
assert.equal(familyBuildingRollback.family_buildings_panel.construction_ledger[0].status, 'reverted', 'family building panel should read back reverted ledger')
assert.ok(familyBuildingRollback.contract.audit_log.find(entry => entry.action === 'family_building_rollback_recorded'), 'building rollback should be audited')
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft - 1300, 'building rollback should not refund shared fund in record-only step')
assert.equal((await runtime.getCohabitationWarehouse(largeContract.contract.id, actor(largeOwner))).warehouse.ledger.filter(entry => entry.action === 'consume').length, 2, 'building rollback should not duplicate or restore material ledgers in record-only step')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'building rollback should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'building rollback should not touch partner personal money')

const duplicateFamilyBuildingRollback = await runtime.rollbackCohabitationFamilyBuilding(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-rollback-record',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRollback.idempotent, true, 'same building rollback idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRollback.already_reverted, true, 'idempotent building rollback should report already reverted')
assert.equal(duplicateFamilyBuildingRollback.building_ledger_entry.status, 'reverted', 'idempotent building rollback should keep reverted status')

const alreadyFamilyBuildingRollback = await runtime.rollbackCohabitationFamilyBuilding(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-rollback-record-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRollback.idempotent, true, 'already reverted building should return idempotent response')
assert.equal(alreadyFamilyBuildingRollback.already_reverted, true, 'already reverted building response should be explicit')
assert.equal(alreadyFamilyBuildingRollback.building_ledger_entry.status, 'reverted', 'already reverted building should stay reverted')

await assert.rejects(
  () => runtime.restoreCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-material-restore-before-fund-refund',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'building material restore should require shared fund refund first'
)
assert.equal((await runtime.getCohabitationWarehouse(largeContract.contract.id, actor(largeOwner))).warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 0, 'material restore before fund refund should not restore wood')

await assert.rejects(
  () => runtime.refundCohabitationFamilyBuildingFund(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-fund-refund-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not refund family building fund'
)
assert.equal((await runtime.getCohabitationFund(largeContract.contract.id, actor(largeOwner))).fund.balance, balanceBeforeLargeDraft - 1300, 'rejected building fund refund should not change shared balance')

const familyBuildingFundRefund = await runtime.refundCohabitationFamilyBuildingFund(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa refund family building fund after rollback',
  idempotency_key: 'qa-family-building-fund-refund',
}, actor(largeOwner))
assert.equal(familyBuildingFundRefund.idempotent, false, 'first family building fund refund should not be idempotent')
assert.equal(familyBuildingFundRefund.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'building fund refund should update original building ledger')
assert.equal(familyBuildingFundRefund.building_ledger_entry.status, 'reverted', 'building fund refund should keep reverted status')
assert.equal(familyBuildingFundRefund.building_ledger_entry.shared_fund_refunded, true, 'building fund refund should mark shared fund refunded')
assert.equal(familyBuildingFundRefund.building_ledger_entry.fund_refund_idempotency_key, 'qa-family-building-fund-refund', 'building fund refund should store refund idempotency key')
assert.equal(familyBuildingFundRefund.fund_ledger_entry.action, 'family_building_fund_refund', 'building fund refund should write refund fund ledger')
assert.equal(familyBuildingFundRefund.fund_ledger_entry.amount, 1300, 'building fund refund ledger should keep original deducted amount')
assert.equal(familyBuildingFundRefund.shared_fund.refund_amount, 1300, 'building fund refund should report refund amount')
assert.equal(familyBuildingFundRefund.fund.balance, balanceBeforeLargeDraft, 'building fund refund should restore shared fund balance')
assert.equal(familyBuildingFundRefund.shared_fund.personal_money_merged, false, 'building fund refund should not merge personal money')
assert.ok(familyBuildingFundRefund.contract.audit_log.find(entry => entry.action === 'family_building_fund_refunded'), 'building fund refund should be audited')
assert.equal((await runtime.getCohabitationWarehouse(largeContract.contract.id, actor(largeOwner))).warehouse.ledger.filter(entry => entry.action === 'consume').length, 2, 'building fund refund should not restore shared warehouse materials')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'building fund refund should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'building fund refund should not touch partner personal money')

const duplicateFamilyBuildingFundRefund = await runtime.refundCohabitationFamilyBuildingFund(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-fund-refund',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingFundRefund.idempotent, true, 'same building fund refund idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingFundRefund.already_refunded, true, 'idempotent building fund refund should report already refunded')
assert.equal(duplicateFamilyBuildingFundRefund.fund.balance, balanceBeforeLargeDraft, 'idempotent building fund refund should not double credit shared fund')

const alreadyFamilyBuildingFundRefund = await runtime.refundCohabitationFamilyBuildingFund(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-fund-refund-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingFundRefund.idempotent, true, 'already refunded building should return idempotent response')
assert.equal(alreadyFamilyBuildingFundRefund.already_refunded, true, 'already refunded building response should be explicit')
assert.equal(alreadyFamilyBuildingFundRefund.fund.balance, balanceBeforeLargeDraft, 'already refunded building should not double credit shared fund')

await assert.rejects(
  () => runtime.restoreCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-material-restore-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not restore family building materials'
)
assert.equal((await runtime.getCohabitationWarehouse(largeContract.contract.id, actor(largeOwner))).warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 0, 'rejected building material restore should not restore wood')

await assert.rejects(
  () => runtime.replayCohabitationFamilyBuildingCompensation(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-compensation-before-materials',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'building compensation replay should require material restore before final closeout'
)

const familyBuildingMaterialRestore = await runtime.restoreCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa restore family building materials after fund refund',
  idempotency_key: 'qa-family-building-material-restore',
}, actor(largeOwner))
assert.equal(familyBuildingMaterialRestore.idempotent, false, 'first family building material restore should not be idempotent')
assert.equal(familyBuildingMaterialRestore.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'building material restore should update original building ledger')
assert.equal(familyBuildingMaterialRestore.building_ledger_entry.status, 'reverted', 'building material restore should keep reverted status')
assert.equal(familyBuildingMaterialRestore.building_ledger_entry.shared_warehouse_materials_restored, true, 'building material restore should mark shared warehouse restored')
assert.equal(familyBuildingMaterialRestore.building_ledger_entry.material_restore_idempotency_key, 'qa-family-building-material-restore', 'building material restore should store restore idempotency key')
assert.equal(familyBuildingMaterialRestore.material_restore_ledger_entries.length, 2, 'building material restore should write compensate ledgers')
assert.ok(familyBuildingMaterialRestore.material_restore_ledger_entries.every(entry => entry.action === 'compensate'), 'building material restore should use compensate ledger action')
assert.ok(familyBuildingMaterialRestore.material_restore_ledger_entries.some(entry => entry.item_id === 'wood' && entry.source_ledger_ids.some(id => materialConsume.material_ledger_entries.some(source => source.id === id))), 'wood restore ledger should reference original consume ledger')
assert.ok(familyBuildingMaterialRestore.material_restore_ledger_entries.some(entry => entry.item_id === 'rice' && entry.source_ledger_ids.some(id => materialConsume.material_ledger_entries.some(source => source.id === id))), 'rice restore ledger should reference original consume ledger')
assert.equal(familyBuildingMaterialRestore.shared_warehouse.restored_quantity, 40, 'building material restore should report restored quantity')
assert.equal(familyBuildingMaterialRestore.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'building material restore should restore wood to shared warehouse')
assert.equal(familyBuildingMaterialRestore.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'building material restore should restore rice to shared warehouse')
assert.equal(familyBuildingMaterialRestore.fund.balance, balanceBeforeLargeDraft, 'building material restore should not change shared fund balance')
assert.equal(familyBuildingMaterialRestore.shared_fund.refund_amount, 0, 'building material restore should not refund shared fund again')
assert.equal(familyBuildingMaterialRestore.shared_fund.personal_money_merged, false, 'building material restore should not merge personal money')
assert.equal(familyBuildingMaterialRestore.shared_warehouse.personal_inventory_merged, false, 'building material restore should not merge personal inventory')
assert.ok(familyBuildingMaterialRestore.contract.audit_log.find(entry => entry.action === 'family_building_materials_restored'), 'building material restore should be audited')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'building material restore should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'building material restore should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'building material restore should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'building material restore should not write owner rice back to personal inventory')

const duplicateFamilyBuildingMaterialRestore = await runtime.restoreCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-material-restore',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingMaterialRestore.idempotent, true, 'same building material restore idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingMaterialRestore.already_restored, true, 'idempotent building material restore should report already restored')
assert.equal(duplicateFamilyBuildingMaterialRestore.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'idempotent building material restore should not double restore wood')

const alreadyFamilyBuildingMaterialRestore = await runtime.restoreCohabitationFamilyBuildingMaterials(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-material-restore-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingMaterialRestore.idempotent, true, 'already restored building materials should return idempotent response')
assert.equal(alreadyFamilyBuildingMaterialRestore.already_restored, true, 'already restored building material response should be explicit')
assert.equal(alreadyFamilyBuildingMaterialRestore.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'already restored building materials should not double restore rice')

await assert.rejects(
  () => runtime.replayCohabitationFamilyBuildingCompensation(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-compensation-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not close family building compensation replay'
)

const familyBuildingCompensationReplay = await runtime.replayCohabitationFamilyBuildingCompensation(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa close family building compensation replay',
  idempotency_key: 'qa-family-building-compensation-replay',
}, actor(largeOwner))
assert.equal(familyBuildingCompensationReplay.idempotent, false, 'first family building compensation replay should not be idempotent')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'building compensation replay should update original ledger')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.status, 'compensated', 'building compensation replay should mark ledger compensated')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.action, 'compensated', 'building compensation replay should record compensated action')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.compensation_required, false, 'building compensation replay should clear compensation required')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.compensation_replay_idempotency_key, 'qa-family-building-compensation-replay', 'building compensation replay should store idempotency key')
assert.equal(familyBuildingCompensationReplay.building_ledger_entry.real_build_demolished, false, 'building compensation replay should not demolish real building')
assert.ok(familyBuildingCompensationReplay.building_ledger_entry.deferred_operations.includes('real_build_demolition_manual_review'), 'building compensation replay should keep real demolition manual review deferred')
assert.ok(!familyBuildingCompensationReplay.building_ledger_entry.deferred_operations.includes('family_building_compensation_replay'), 'building compensation replay should clear compensation replay deferred op')
assert.equal(familyBuildingCompensationReplay.compensation_replay.shared_fund_refunded, true, 'building compensation replay should confirm fund refunded')
assert.equal(familyBuildingCompensationReplay.compensation_replay.shared_warehouse_restored, true, 'building compensation replay should confirm warehouse restored')
assert.equal(familyBuildingCompensationReplay.compensation_replay.personal_money_merged, false, 'building compensation replay should not merge personal money')
assert.equal(familyBuildingCompensationReplay.compensation_replay.personal_inventory_merged, false, 'building compensation replay should not merge personal inventory')
assert.ok(familyBuildingCompensationReplay.contract.audit_log.find(entry => entry.action === 'family_building_compensation_replayed'), 'building compensation replay should be audited')
assert.equal(familyBuildingCompensationReplay.fund.balance, balanceBeforeLargeDraft, 'building compensation replay should not change shared fund balance')
assert.equal(familyBuildingCompensationReplay.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'building compensation replay should not double restore wood')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'building compensation replay should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'building compensation replay should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'building compensation replay should not write owner wood back to personal inventory')

const duplicateFamilyBuildingCompensationReplay = await runtime.replayCohabitationFamilyBuildingCompensation(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-compensation-replay',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingCompensationReplay.idempotent, true, 'same building compensation replay idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingCompensationReplay.already_compensated, true, 'idempotent building compensation replay should report already compensated')
assert.equal(duplicateFamilyBuildingCompensationReplay.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'idempotent building compensation replay should not double restore rice')

const alreadyFamilyBuildingCompensationReplay = await runtime.replayCohabitationFamilyBuildingCompensation(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-compensation-replay-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingCompensationReplay.idempotent, true, 'already compensated building should return idempotent response')
assert.equal(alreadyFamilyBuildingCompensationReplay.already_compensated, true, 'already compensated building response should be explicit')
assert.equal(alreadyFamilyBuildingCompensationReplay.building_ledger_entry.status, 'compensated', 'already compensated building should stay compensated')

await assert.rejects(
  () => runtime.requestCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not request real demolition review'
)

const familyBuildingRealDemolitionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa request manual review before any real demolition',
  idempotency_key: 'qa-family-building-real-demolition-request',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionRequest.idempotent, false, 'first real demolition review request should not be idempotent')
assert.equal(familyBuildingRealDemolitionRequest.already_requested, false, 'first real demolition review request should not be already requested')
assert.equal(familyBuildingRealDemolitionRequest.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real demolition review request should update original ledger')
assert.equal(familyBuildingRealDemolitionRequest.building_ledger_entry.status, 'compensated', 'real demolition review request should keep compensated ledger status')
assert.equal(familyBuildingRealDemolitionRequest.building_ledger_entry.real_build_demolition_request_idempotency_key, 'qa-family-building-real-demolition-request', 'real demolition review request should store idempotency key')
assert.equal(familyBuildingRealDemolitionRequest.building_ledger_entry.real_build_demolition_review_state, 'pending_manual_review', 'real demolition review request should mark pending manual review')
assert.equal(familyBuildingRealDemolitionRequest.building_ledger_entry.real_build_demolished, false, 'real demolition review request should not demolish real building')
assert.ok(familyBuildingRealDemolitionRequest.building_ledger_entry.deferred_operations.includes('real_build_demolition_manual_review'), 'real demolition review request should keep manual review deferred op')
assert.ok(familyBuildingRealDemolitionRequest.building_ledger_entry.deferred_operations.includes('real_build_demolition_execute'), 'real demolition review request should defer actual execution')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.requested, true, 'real demolition review response should report requested')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.execution_enabled, false, 'real demolition review request should not enable execution')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.requires_manual_review, true, 'real demolition review request should require manual review')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.personal_save_changed, false, 'real demolition review request should not change personal saves')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.shared_fund_changed, false, 'real demolition review request should not change shared fund')
assert.equal(familyBuildingRealDemolitionRequest.demolition_review.shared_warehouse_changed, false, 'real demolition review request should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionRequest.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_requested'), 'real demolition review request should be audited')
assert.equal(familyBuildingRealDemolitionRequest.fund.balance, balanceBeforeLargeDraft, 'real demolition review request should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionRequest.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'real demolition review request should not change restored wood')
assert.equal(familyBuildingRealDemolitionRequest.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'real demolition review request should not change restored rice')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real demolition review request should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real demolition review request should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'real demolition review request should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'real demolition review request should not write owner rice back to personal inventory')

const duplicateFamilyBuildingRealDemolitionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-request',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionRequest.idempotent, true, 'same real demolition review idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionRequest.already_requested, true, 'duplicate real demolition review should report already requested')
assert.equal(duplicateFamilyBuildingRealDemolitionRequest.demolition_review.execution_enabled, false, 'duplicate real demolition review should keep execution disabled')

const alreadyFamilyBuildingRealDemolitionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-request-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRealDemolitionRequest.idempotent, true, 'pending real demolition review should return idempotent response')
assert.equal(alreadyFamilyBuildingRealDemolitionRequest.already_requested, true, 'pending real demolition review response should be explicit')
assert.equal(alreadyFamilyBuildingRealDemolitionRequest.building_ledger_entry.real_build_demolition_review_state, 'pending_manual_review', 'pending real demolition review should stay pending')

await assert.rejects(
  () => runtime.rejectCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-reject-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not reject real demolition review'
)

const familyBuildingRealDemolitionReject = await runtime.rejectCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa reject real demolition review without asset mutation',
  idempotency_key: 'qa-family-building-real-demolition-reject',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionReject.idempotent, false, 'first real demolition review reject should not be idempotent')
assert.equal(familyBuildingRealDemolitionReject.already_rejected, false, 'first real demolition review reject should not be already rejected')
assert.equal(familyBuildingRealDemolitionReject.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real demolition review reject should update original ledger')
assert.equal(familyBuildingRealDemolitionReject.building_ledger_entry.status, 'compensated', 'real demolition review reject should keep compensated ledger status')
assert.equal(familyBuildingRealDemolitionReject.building_ledger_entry.real_build_demolition_review_idempotency_key, 'qa-family-building-real-demolition-reject', 'real demolition review reject should store review idempotency key')
assert.equal(familyBuildingRealDemolitionReject.building_ledger_entry.real_build_demolition_review_state, 'rejected', 'real demolition review reject should mark rejected')
assert.equal(familyBuildingRealDemolitionReject.building_ledger_entry.real_build_demolished, false, 'real demolition review reject should not demolish real building')
assert.ok(!familyBuildingRealDemolitionReject.building_ledger_entry.deferred_operations.includes('real_build_demolition_manual_review'), 'real demolition review reject should clear manual review deferred op')
assert.ok(!familyBuildingRealDemolitionReject.building_ledger_entry.deferred_operations.includes('real_build_demolition_execute'), 'real demolition review reject should clear execution deferred op')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.rejected, true, 'real demolition review reject response should report rejected')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.execution_enabled, false, 'real demolition review reject should not enable execution')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.requires_manual_review, false, 'real demolition review reject should close manual review')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.personal_save_changed, false, 'real demolition review reject should not change personal saves')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.shared_fund_changed, false, 'real demolition review reject should not change shared fund')
assert.equal(familyBuildingRealDemolitionReject.demolition_review.shared_warehouse_changed, false, 'real demolition review reject should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionReject.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_rejected'), 'real demolition review reject should be audited')
assert.equal(familyBuildingRealDemolitionReject.fund.balance, balanceBeforeLargeDraft, 'real demolition review reject should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionReject.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'real demolition review reject should not change restored wood')
assert.equal(familyBuildingRealDemolitionReject.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'real demolition review reject should not change restored rice')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real demolition review reject should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real demolition review reject should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'real demolition review reject should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'real demolition review reject should not write owner rice back to personal inventory')

const duplicateFamilyBuildingRealDemolitionReject = await runtime.rejectCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-reject',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionReject.idempotent, true, 'same real demolition review reject idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionReject.already_rejected, true, 'duplicate real demolition review reject should report already rejected')

const alreadyFamilyBuildingRealDemolitionReject = await runtime.rejectCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-reject-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRealDemolitionReject.idempotent, true, 'already rejected real demolition review should return idempotent response')
assert.equal(alreadyFamilyBuildingRealDemolitionReject.already_rejected, true, 'already rejected real demolition review response should be explicit')
assert.equal(alreadyFamilyBuildingRealDemolitionReject.building_ledger_entry.real_build_demolition_review_state, 'rejected', 'rejected real demolition review should stay rejected')

const familyBuildingRealDemolitionApproveRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa request another manual review for approval',
  idempotency_key: 'qa-family-building-real-demolition-approve-request',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionApproveRequest.building_ledger_entry.real_build_demolition_review_state, 'pending_manual_review', 'approval setup should return ledger to pending manual review')

await assert.rejects(
  () => runtime.approveCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-approve-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not approve real demolition review'
)

const familyBuildingRealDemolitionApprove = await runtime.approveCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa approve real demolition review without executing deletion',
  idempotency_key: 'qa-family-building-real-demolition-approve',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionApprove.idempotent, false, 'first real demolition review approve should not be idempotent')
assert.equal(familyBuildingRealDemolitionApprove.already_approved, false, 'first real demolition review approve should not be already approved')
assert.equal(familyBuildingRealDemolitionApprove.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real demolition review approve should update original ledger')
assert.equal(familyBuildingRealDemolitionApprove.building_ledger_entry.status, 'compensated', 'real demolition review approve should keep compensated ledger status')
assert.equal(familyBuildingRealDemolitionApprove.building_ledger_entry.real_build_demolition_review_idempotency_key, 'qa-family-building-real-demolition-approve', 'real demolition review approve should store review idempotency key')
assert.equal(familyBuildingRealDemolitionApprove.building_ledger_entry.real_build_demolition_review_state, 'approved_for_execute', 'real demolition review approve should mark approved for execute')
assert.equal(familyBuildingRealDemolitionApprove.building_ledger_entry.real_build_demolished, false, 'real demolition review approve should not demolish real building')
assert.ok(!familyBuildingRealDemolitionApprove.building_ledger_entry.deferred_operations.includes('real_build_demolition_manual_review'), 'real demolition review approve should clear manual review deferred op')
assert.ok(familyBuildingRealDemolitionApprove.building_ledger_entry.deferred_operations.includes('real_build_demolition_execute'), 'real demolition review approve should keep execution deferred op')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.approved_for_execute, true, 'real demolition review approve response should report approval')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.execution_enabled, false, 'real demolition review approve should not execute deletion')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.requires_manual_review, false, 'real demolition review approve should close manual review')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.personal_save_changed, false, 'real demolition review approve should not change personal saves')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.shared_fund_changed, false, 'real demolition review approve should not change shared fund')
assert.equal(familyBuildingRealDemolitionApprove.demolition_review.shared_warehouse_changed, false, 'real demolition review approve should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionApprove.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_approved'), 'real demolition review approve should be audited')
assert.equal(familyBuildingRealDemolitionApprove.fund.balance, balanceBeforeLargeDraft, 'real demolition review approve should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionApprove.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'real demolition review approve should not change restored wood')
assert.equal(familyBuildingRealDemolitionApprove.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'real demolition review approve should not change restored rice')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real demolition review approve should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real demolition review approve should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'real demolition review approve should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'real demolition review approve should not write owner rice back to personal inventory')

const duplicateFamilyBuildingRealDemolitionApprove = await runtime.approveCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-approve',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionApprove.idempotent, true, 'same real demolition review approve idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionApprove.already_approved, true, 'duplicate real demolition review approve should report already approved')

const alreadyFamilyBuildingRealDemolitionApprove = await runtime.approveCohabitationFamilyBuildingRealDemolitionReview(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-approve-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRealDemolitionApprove.idempotent, true, 'already approved real demolition review should return idempotent response')
assert.equal(alreadyFamilyBuildingRealDemolitionApprove.already_approved, true, 'already approved real demolition review response should be explicit')
assert.equal(alreadyFamilyBuildingRealDemolitionApprove.building_ledger_entry.real_build_demolition_review_state, 'approved_for_execute', 'approved real demolition review should stay approved')

await assert.rejects(
  () => runtime.requestCohabitationFamilyBuildingRealDemolitionExecution(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-execution-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not request real demolition execution'
)

const familyBuildingRealDemolitionExecutionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionExecution(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa request real demolition execution without personal save write',
  idempotency_key: 'qa-family-building-real-demolition-execution-request',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionExecutionRequest.idempotent, false, 'first real demolition execution request should not be idempotent')
assert.equal(familyBuildingRealDemolitionExecutionRequest.already_execution_requested, false, 'first real demolition execution request should not be already requested')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real demolition execution request should update original ledger')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.status, 'compensated', 'real demolition execution request should keep compensated ledger status')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.real_build_demolition_review_state, 'approved_for_execute', 'real demolition execution request should keep approved review state')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.real_build_demolition_execution_request_idempotency_key, 'qa-family-building-real-demolition-execution-request', 'real demolition execution request should store execution idempotency key')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.real_build_demolition_execution_state, 'pending_personal_save_write', 'real demolition execution request should wait for personal save write')
assert.equal(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.real_build_demolished, false, 'real demolition execution request should not demolish real building yet')
assert.ok(!familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.deferred_operations.includes('real_build_demolition_execute'), 'real demolition execution request should clear generic execution deferred op')
assert.ok(familyBuildingRealDemolitionExecutionRequest.building_ledger_entry.deferred_operations.includes('real_build_demolition_personal_save_write'), 'real demolition execution request should defer personal save write')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.requested, true, 'real demolition execution response should report requested')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.execution_state, 'pending_personal_save_write', 'real demolition execution response should report pending personal save write')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.deferred_personal_save_write, true, 'real demolition execution response should keep write deferred')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.personal_save_changed, false, 'real demolition execution request should not change personal saves')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.shared_fund_changed, false, 'real demolition execution request should not change shared fund')
assert.equal(familyBuildingRealDemolitionExecutionRequest.demolition_execution.shared_warehouse_changed, false, 'real demolition execution request should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionExecutionRequest.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_execution_requested'), 'real demolition execution request should be audited')
assert.equal(familyBuildingRealDemolitionExecutionRequest.fund.balance, balanceBeforeLargeDraft, 'real demolition execution request should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionExecutionRequest.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'real demolition execution request should not change restored wood')
assert.equal(familyBuildingRealDemolitionExecutionRequest.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'real demolition execution request should not change restored rice')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real demolition execution request should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real demolition execution request should not touch partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'real demolition execution request should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'real demolition execution request should not write owner rice back to personal inventory')

const duplicateFamilyBuildingRealDemolitionExecutionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionExecution(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-execution-request',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionExecutionRequest.idempotent, true, 'same real demolition execution request idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionExecutionRequest.already_execution_requested, true, 'duplicate real demolition execution request should report already requested')

const alreadyFamilyBuildingRealDemolitionExecutionRequest = await runtime.requestCohabitationFamilyBuildingRealDemolitionExecution(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-execution-request-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRealDemolitionExecutionRequest.idempotent, true, 'already requested real demolition execution should return idempotent response')
assert.equal(alreadyFamilyBuildingRealDemolitionExecutionRequest.already_execution_requested, true, 'already requested real demolition execution response should be explicit')
assert.equal(alreadyFamilyBuildingRealDemolitionExecutionRequest.building_ledger_entry.real_build_demolition_execution_state, 'pending_personal_save_write', 'already requested real demolition execution should stay pending personal save write')

const ownerDemolitionReceiptCountBeforeWrite = readGameplayData(largeOwner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0
const partnerDemolitionReceiptCountBeforeWrite = readGameplayData(largePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0
const cavePartnerDemolitionReceiptCountBeforeWrite = readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0
const cellarPartnerDemolitionReceiptCountBeforeWrite = readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0
await assert.rejects(
  () => runtime.writeCohabitationFamilyBuildingRealDemolitionPersonalSave(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-personal-save-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not write real demolition personal save receipts'
)

const familyBuildingRealDemolitionPersonalSaveWrite = await runtime.writeCohabitationFamilyBuildingRealDemolitionPersonalSave(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa write real demolition receipt into personal saves',
  idempotency_key: 'qa-family-building-real-demolition-personal-save-write',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.idempotent, false, 'first real demolition personal save write should not be idempotent')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.already_written, false, 'first real demolition personal save write should not be already written')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'real demolition personal save write should update original ledger')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.status, 'compensated', 'real demolition personal save write should keep compensated ledger status')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.real_build_demolition_review_state, 'executed', 'real demolition personal save write should mark review executed')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.real_build_demolition_execution_state, 'executed', 'real demolition personal save write should mark execution executed')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.real_build_demolished, true, 'real demolition personal save write should mark building demolished')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.real_build_demolition_personal_save_write_idempotency_key, 'qa-family-building-real-demolition-personal-save-write', 'real demolition personal save write should store idempotency key')
assert.ok(!familyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.deferred_operations.includes('real_build_demolition_personal_save_write'), 'real demolition personal save write should clear deferred personal save op')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.receipts.length, 4, 'real demolition personal save write should write one receipt per accepted member')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.personal_save_written, true, 'real demolition personal save write response should report personal save write')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.receipt_count, 4, 'real demolition personal save write response should count receipts')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.real_build_demolished, true, 'real demolition personal save write response should report demolished marker')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.shared_fund_changed, false, 'real demolition personal save write should not change shared fund')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.shared_warehouse_changed, false, 'real demolition personal save write should not change shared warehouse')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.personal_money_changed, false, 'real demolition personal save write should not change personal money')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.demolition_execution.personal_inventory_changed, false, 'real demolition personal save write should not change personal inventory')
assert.ok(familyBuildingRealDemolitionPersonalSaveWrite.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_personal_save_written'), 'real demolition personal save write should be audited')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.fund.balance, balanceBeforeLargeDraft, 'real demolition personal save write should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'real demolition personal save write should not change restored wood')
assert.equal(familyBuildingRealDemolitionPersonalSaveWrite.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'real demolition personal save write should not change restored rice')
assert.equal(readGameplayData(largeOwner)?.player?.money, largeOwnerMoneyBeforeDraft, 'real demolition personal save write should not touch owner personal money')
assert.equal(readGameplayData(largePartner)?.player?.money, largePartnerMoneyBeforeConfirm, 'real demolition personal save write should not touch partner personal money')
assert.equal(readGameplayData(largeCavePartner)?.player?.money, largeCavePartnerMoneyBeforeConfirm, 'real demolition personal save write should not touch cave partner personal money')
assert.equal(readGameplayData(largeCellarPartner)?.player?.money, largeCellarPartnerMoneyBeforeConfirm, 'real demolition personal save write should not touch cellar partner personal money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), largeOwnerWoodBeforeMaterialDeposit - 28, 'real demolition personal save write should not write owner wood back to personal inventory')
assert.equal(getInventoryItemQuantity(largeOwner, 'rice'), largeOwnerRiceBeforeMaterialDeposit - 12, 'real demolition personal save write should not write owner rice back to personal inventory')
assert.equal(readGameplayData(largeOwner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, ownerDemolitionReceiptCountBeforeWrite + 1, 'owner personal save should receive one real demolition receipt')
assert.equal(readGameplayData(largePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, partnerDemolitionReceiptCountBeforeWrite + 1, 'partner personal save should receive one real demolition receipt')
assert.equal(readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cavePartnerDemolitionReceiptCountBeforeWrite + 1, 'cave partner personal save should receive one real demolition receipt')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cellarPartnerDemolitionReceiptCountBeforeWrite + 1, 'cellar partner personal save should receive one real demolition receipt')
assert.equal(readGameplayData(largeOwner)?.onlineCohabitation?.real_build_demolition_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'owner real demolition receipt should reference building ledger')
assert.equal(readGameplayData(largePartner)?.onlineCohabitation?.real_build_demolition_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'partner real demolition receipt should reference building ledger')
assert.equal(readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_demolition_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'cave partner real demolition receipt should reference building ledger')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_demolition_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'cellar partner real demolition receipt should reference building ledger')

const duplicateFamilyBuildingRealDemolitionPersonalSaveWrite = await runtime.writeCohabitationFamilyBuildingRealDemolitionPersonalSave(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-personal-save-write',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionPersonalSaveWrite.idempotent, true, 'same real demolition personal save write idempotency key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionPersonalSaveWrite.already_written, true, 'duplicate real demolition personal save write should report already written')
assert.equal(duplicateFamilyBuildingRealDemolitionPersonalSaveWrite.receipts.length, 4, 'duplicate real demolition personal save write should return existing receipts')
assert.equal(readGameplayData(largeOwner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, ownerDemolitionReceiptCountBeforeWrite + 1, 'duplicate personal save write should not duplicate owner receipt')
assert.equal(readGameplayData(largePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, partnerDemolitionReceiptCountBeforeWrite + 1, 'duplicate personal save write should not duplicate partner receipt')
assert.equal(readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cavePartnerDemolitionReceiptCountBeforeWrite + 1, 'duplicate personal save write should not duplicate cave partner receipt')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cellarPartnerDemolitionReceiptCountBeforeWrite + 1, 'duplicate personal save write should not duplicate cellar partner receipt')

const alreadyFamilyBuildingRealDemolitionPersonalSaveWrite = await runtime.writeCohabitationFamilyBuildingRealDemolitionPersonalSave(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-personal-save-write-again',
}, actor(largeOwner))
assert.equal(alreadyFamilyBuildingRealDemolitionPersonalSaveWrite.idempotent, true, 'already written real demolition personal save should return idempotent response')
assert.equal(alreadyFamilyBuildingRealDemolitionPersonalSaveWrite.already_written, true, 'already written real demolition personal save response should be explicit')
assert.equal(alreadyFamilyBuildingRealDemolitionPersonalSaveWrite.building_ledger_entry.real_build_demolition_execution_state, 'executed', 'already written real demolition personal save should stay executed')
assert.equal(readGameplayData(largeOwner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, ownerDemolitionReceiptCountBeforeWrite + 1, 'already written personal save should not duplicate owner receipt')
assert.equal(readGameplayData(largePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, partnerDemolitionReceiptCountBeforeWrite + 1, 'already written personal save should not duplicate partner receipt')
assert.equal(readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cavePartnerDemolitionReceiptCountBeforeWrite + 1, 'already written personal save should not duplicate cave partner receipt')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_demolition_receipts?.length ?? 0, cellarPartnerDemolitionReceiptCountBeforeWrite + 1, 'already written personal save should not duplicate cellar partner receipt')

const ownerRawBeforeMainStatePreview = saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw
const partnerRawBeforeMainStatePreview = saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw
const cavePartnerRawBeforeMainStatePreview = saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw
const cellarPartnerRawBeforeMainStatePreview = saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw
await assert.rejects(
  () => runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(largeContract.contract.id, {
    building_ledger_id: largeExecute.building_ledger_entry.id,
    idempotency_key: 'qa-family-building-real-demolition-main-state-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not preview real demolition personal main state'
)

const familyBuildingRealDemolitionMainStatePreview = await runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  reason: 'qa preview blocked main state mapping',
  idempotency_key: 'qa-family-building-real-demolition-main-state-preview',
}, actor(largeOwner))
assert.equal(familyBuildingRealDemolitionMainStatePreview.idempotent, false, 'first real demolition main state preview should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStatePreview.already_previewed, false, 'first real demolition main state preview should not be already previewed')
assert.equal(familyBuildingRealDemolitionMainStatePreview.building_ledger_entry.id, largeExecute.building_ledger_entry.id, 'main state preview should update original building ledger')
assert.equal(familyBuildingRealDemolitionMainStatePreview.building_ledger_entry.real_build_demolition_main_state_preview_idempotency_key, 'qa-family-building-real-demolition-main-state-preview', 'main state preview should store idempotency key')
assert.ok(/^[a-f0-9]{64}$/.test(familyBuildingRealDemolitionMainStatePreview.building_ledger_entry.real_build_demolition_main_state_manifest_hash), 'main state preview should store manifest hash')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest.length, 4, 'main state preview should include one manifest row per accepted member')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.mutation_enabled, false, 'main state preview should keep mutation disabled')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.blocked, true, 'main state preview should be explicitly blocked without direct mapping')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.personal_save_changed, false, 'main state preview should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.shared_fund_changed, false, 'main state preview should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStatePreview.main_state_preview.shared_warehouse_changed, false, 'main state preview should not change shared warehouse')
assert.equal(
  familyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest.every(item =>
    item.mapping_status === 'blocked_missing_personal_building_binding'
    && item.mutation_enabled === false
    && item.candidate_paths.includes('home.homeRenovationStates')
    && item.candidate_paths.includes('decoration.placed')
  ),
  true,
  'main state preview should list blocked home and decoration candidate paths'
)
assert.ok(familyBuildingRealDemolitionMainStatePreview.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_previewed'), 'main state preview should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state preview should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state preview should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state preview should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state preview should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStatePreview.fund.balance, balanceBeforeLargeDraft, 'main state preview should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStatePreview.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state preview should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStatePreview.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state preview should not change restored rice')

const mainStateMappingPayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  manifest_hash: familyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest_hash,
  reason: 'qa verify personal main state mapping without mutation',
  idempotency_key: 'qa-family-building-real-demolition-main-state-mapping',
  mappings: familyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest.map(item => {
    const useDecorationOwned = item.username === largePartner
    const useCaveChoice = item.username === largeCavePartner
    const useCellarSlot = item.username === largeCellarPartner
    const candidatePath = useDecorationOwned
      ? 'decoration.owned'
      : useCaveChoice
        ? 'home.caveChoice'
        : useCellarSlot
          ? 'home.cellarSlots'
          : 'home.homeRenovationStates'
    const bindingPrefix = useDecorationOwned
      ? 'manual-decoration-owned'
      : useCaveChoice
        ? 'manual-cave-choice'
        : useCellarSlot
          ? 'manual-cellar-slot'
          : 'manual-home-renovation'
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: candidatePath,
      binding_ref: `${bindingPrefix}:${item.building_ledger_id}:${item.username_key}`,
      snapshot_hash: item.snapshot_hash,
    }
  }),
}

await assert.rejects(
  () => runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(largeContract.contract.id, {
    ...mainStateMappingPayload,
    manifest_hash: 'bad-preview-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-mapping-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state mapping should reject preview manifest hash drift'
)

const familyBuildingRealDemolitionMainStateMapping = await runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(
  largeContract.contract.id,
  mainStateMappingPayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateMapping.idempotent, false, 'first main state mapping should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateMapping.already_mapped, false, 'first main state mapping should not report already mapped')
assert.equal(familyBuildingRealDemolitionMainStateMapping.building_ledger_entry.real_build_demolition_main_state_mapping_idempotency_key, 'qa-family-building-real-demolition-main-state-mapping', 'main state mapping should store idempotency key')
assert.ok(/^[a-f0-9]{64}$/.test(familyBuildingRealDemolitionMainStateMapping.building_ledger_entry.real_build_demolition_main_state_mapping_manifest_hash), 'main state mapping should store mapping manifest hash')
assert.equal(familyBuildingRealDemolitionMainStateMapping.main_state_mapping.manifest.length, 4, 'main state mapping should include one mapping per accepted member')
assert.equal(familyBuildingRealDemolitionMainStateMapping.main_state_mapping.mutation_enabled, false, 'main state mapping should keep mutation disabled')
assert.equal(familyBuildingRealDemolitionMainStateMapping.main_state_mapping.personal_save_changed, false, 'main state mapping should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateMapping.main_state_mapping.shared_fund_changed, false, 'main state mapping should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateMapping.main_state_mapping.shared_warehouse_changed, false, 'main state mapping should not change shared warehouse')
assert.ok(!familyBuildingRealDemolitionMainStateMapping.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_mapping'), 'main state mapping should clear mapping deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateMapping.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_mutation_guard'), 'main state mapping should defer real mutation guard')
assert.equal(
  familyBuildingRealDemolitionMainStateMapping.main_state_mapping.manifest.every(item =>
    item.mapping_status === 'verified_personal_binding_pending_mutation'
    && item.mutation_enabled === false
    && (
      (item.username === largePartner && item.candidate_path === 'decoration.owned' && item.binding_ref.startsWith('manual-decoration-owned:'))
      || (item.username === largeCavePartner && item.candidate_path === 'home.caveChoice' && item.binding_ref.startsWith('manual-cave-choice:'))
      || (item.username === largeCellarPartner && item.candidate_path === 'home.cellarSlots' && item.binding_ref.startsWith('manual-cellar-slot:'))
      || (item.username !== largePartner && item.candidate_path === 'home.homeRenovationStates' && item.binding_ref.startsWith('manual-home-renovation:'))
    )
  ),
  true,
  'main state mapping should record verified home and decoration binding refs without enabling mutation'
)
assert.ok(familyBuildingRealDemolitionMainStateMapping.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_mapping_verified'), 'main state mapping should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state mapping should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state mapping should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state mapping should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state mapping should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateMapping.fund.balance, balanceBeforeLargeDraft, 'main state mapping should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateMapping.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state mapping should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateMapping.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state mapping should not change restored rice')

const mainStateMutationGuardPayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  mapping_manifest_hash: familyBuildingRealDemolitionMainStateMapping.main_state_mapping.manifest_hash,
  confirmation_text: '确认主状态变更安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa guard personal main state mutation without deleting state',
  idempotency_key: 'qa-family-building-real-demolition-main-state-mutation-guard',
}

await assert.rejects(
  () => runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(largeContract.contract.id, {
    ...mainStateMutationGuardPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-mutation-guard-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not guard real demolition personal main state mutation'
)

await assert.rejects(
  () => runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(largeContract.contract.id, {
    ...mainStateMutationGuardPayload,
    confirmation_text: 'wrong confirmation',
    idempotency_key: 'qa-family-building-real-demolition-main-state-mutation-guard-bad-confirm',
  }, actor(largeOwner)),
  error => error?.status === 400,
  'main state mutation guard should require explicit confirmation text'
)

await assert.rejects(
  () => runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(largeContract.contract.id, {
    ...mainStateMutationGuardPayload,
    mapping_manifest_hash: 'bad-mapping-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-mutation-guard-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state mutation guard should reject mapping manifest hash drift'
)

const familyBuildingRealDemolitionMainStateMutationGuard = await runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  largeContract.contract.id,
  mainStateMutationGuardPayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.idempotent, false, 'first main state mutation guard should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.already_guarded, false, 'first main state mutation guard should not report already guarded')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.building_ledger_entry.real_build_demolition_main_state_guard_idempotency_key, 'qa-family-building-real-demolition-main-state-mutation-guard', 'main state mutation guard should store idempotency key')
assert.ok(/^[a-f0-9]{64}$/.test(familyBuildingRealDemolitionMainStateMutationGuard.building_ledger_entry.real_build_demolition_main_state_guard_manifest_hash), 'main state mutation guard should store guard manifest hash')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.manifest.length, 4, 'main state mutation guard should include one guard row per accepted member')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.mutation_enabled, false, 'main state mutation guard should keep mutation disabled')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.execution_enabled, false, 'main state mutation guard should keep execution disabled')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.personal_save_changed, false, 'main state mutation guard should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.shared_fund_changed, false, 'main state mutation guard should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.shared_warehouse_changed, false, 'main state mutation guard should not change shared warehouse')
assert.ok(!familyBuildingRealDemolitionMainStateMutationGuard.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_mutation_guard'), 'main state mutation guard should clear guard deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateMutationGuard.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_execute'), 'main state mutation guard should defer actual main state execution')
assert.equal(
  familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.manifest.every(item =>
    item.guard_status === 'confirmed_pending_personal_main_state_mutation'
    && item.compensation_required === true
    && item.rollback_required === true
    && item.mutation_enabled === false
  ),
  true,
  'main state mutation guard should require compensation and rollback for every row'
)
assert.ok(familyBuildingRealDemolitionMainStateMutationGuard.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_mutation_guarded'), 'main state mutation guard should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state mutation guard should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state mutation guard should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state mutation guard should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state mutation guard should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.fund.balance, balanceBeforeLargeDraft, 'main state mutation guard should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state mutation guard should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateMutationGuard.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state mutation guard should not change restored rice')

const duplicateFamilyBuildingRealDemolitionMainStateMutationGuard = await runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  largeContract.contract.id,
  mainStateMutationGuardPayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMutationGuard.idempotent, true, 'same main state mutation guard key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMutationGuard.already_guarded, true, 'duplicate main state mutation guard should report already guarded')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.manifest_hash, familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.manifest_hash, 'duplicate main state mutation guard should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'duplicate main state mutation guard should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'duplicate main state mutation guard should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'duplicate main state mutation guard should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'duplicate main state mutation guard should not rewrite cellar partner save')

const mainStateExecutePayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  guard_manifest_hash: familyBuildingRealDemolitionMainStateMutationGuard.main_state_mutation_guard.manifest_hash,
  reason: 'qa attempt main state execute but block without exact target',
  idempotency_key: 'qa-family-building-real-demolition-main-state-execute',
}

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(largeContract.contract.id, {
    ...mainStateExecutePayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-execute-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not execute real demolition personal main state mutation'
)

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(largeContract.contract.id, {
    ...mainStateExecutePayload,
    guard_manifest_hash: 'bad-guard-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-execute-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state execute should reject guard manifest hash drift'
)

const familyBuildingRealDemolitionMainStateExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  largeContract.contract.id,
  mainStateExecutePayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateExecute.idempotent, false, 'first main state execute should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateExecute.already_executed, false, 'first main state execute should not report already executed')
assert.equal(familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.real_build_demolition_main_state_execute_idempotency_key, 'qa-family-building-real-demolition-main-state-execute', 'main state execute should store idempotency key')
assert.equal(familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.real_build_demolition_main_state_execution_state, 'blocked_missing_exact_personal_target', 'main state execute should block without exact target selector')
assert.equal(familyBuildingRealDemolitionMainStateExecute.main_state_execution.blocked, true, 'main state execute response should be blocked')
assert.equal(familyBuildingRealDemolitionMainStateExecute.main_state_execution.mutation_enabled, false, 'main state execute should keep mutation disabled')
assert.equal(familyBuildingRealDemolitionMainStateExecute.main_state_execution.personal_save_changed, false, 'main state execute should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateExecute.main_state_execution.shared_fund_changed, false, 'main state execute should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateExecute.main_state_execution.shared_warehouse_changed, false, 'main state execute should not change shared warehouse')
assert.ok(!familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_execute'), 'main state execute should clear generic execute deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_target_required'), 'main state execute should defer exact target binding')
assert.ok(familyBuildingRealDemolitionMainStateExecute.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_execution_blocked'), 'main state execute block should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'blocked main state execute should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'blocked main state execute should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'blocked main state execute should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'blocked main state execute should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateExecute.fund.balance, balanceBeforeLargeDraft, 'blocked main state execute should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateExecute.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'blocked main state execute should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateExecute.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'blocked main state execute should not change restored rice')

const duplicateFamilyBuildingRealDemolitionMainStateExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(
  largeContract.contract.id,
  mainStateExecutePayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExecute.idempotent, true, 'same main state execute key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExecute.already_executed, true, 'duplicate blocked main state execute should report already executed')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExecute.main_state_execution.execution_state, 'blocked_missing_exact_personal_target', 'duplicate blocked main state execute should keep state')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'duplicate blocked main state execute should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'duplicate blocked main state execute should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'duplicate blocked main state execute should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'duplicate blocked main state execute should not rewrite cellar partner save')

const mainStateExactTargets = familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest.map((row, index) => ({
  username: row.username,
  username_key: row.username_key,
  save_slot: row.save_slot,
  save_id: row.save_id,
  real_build_ref: row.real_build_ref,
  candidate_path: row.candidate_path,
  binding_ref: row.binding_ref,
  snapshot_hash: row.snapshot_hash,
  exact_target_ref: `${row.candidate_path}.qa_exact_target_${index}`,
  delete_selector: `${row.candidate_path}.qa_exact_target_${index}`,
  target_kind: row.candidate_path.startsWith('decoration.') ? 'decoration' : 'home',
}))

const mainStateExactTargetPayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  guard_manifest_hash: familyBuildingRealDemolitionMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest_hash,
  expected_execution_state: 'blocked_missing_exact_personal_target',
  targets: mainStateExactTargets,
  reason: 'qa bind exact main state targets but do not mutate personal save',
  idempotency_key: 'qa-family-building-real-demolition-main-state-exact-targets',
}

await assert.rejects(
  () => runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-targets-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not bind real demolition personal main state exact targets'
)

await assert.rejects(
  () => runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetPayload,
    guard_manifest_hash: 'bad-guard-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-targets-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact targets should reject guard manifest hash drift'
)

await assert.rejects(
  () => runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetPayload,
    targets: mainStateExactTargets.map((row, index) => index === 0
      ? { ...row, exact_target_ref: row.candidate_path, delete_selector: row.candidate_path }
      : row),
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-targets-broad-path',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact targets should reject broad candidate path as delete target'
)

const familyBuildingRealDemolitionMainStateExactTargets = await runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactTargetPayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.idempotent, false, 'first main state exact target bind should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.already_bound, false, 'first main state exact target bind should not report already bound')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_idempotency_key, 'qa-family-building-real-demolition-main-state-exact-targets', 'main state exact target bind should store idempotency key')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.length, mainStateExactTargets.length, 'main state exact target bind should store all exact targets')
assert.match(familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash, /^[a-f0-9]{64}$/i, 'main state exact target bind should store manifest hash')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.real_build_demolition_main_state_execution_state, 'exact_target_bound_pending_execute', 'main state exact target bind should move execution state to pending exact execute')
assert.ok(!familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_target_required'), 'main state exact target bind should clear exact target required deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_execute'), 'main state exact target bind should defer exact execute')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.mutation_enabled, false, 'main state exact target bind should not enable mutation in this step')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.personal_save_changed, false, 'main state exact target bind should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.shared_fund_changed, false, 'main state exact target bind should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.shared_warehouse_changed, false, 'main state exact target bind should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionMainStateExactTargets.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_exact_targets_bound'), 'main state exact target bind should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state exact target bind should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state exact target bind should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state exact target bind should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state exact target bind should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.fund.balance, balanceBeforeLargeDraft, 'main state exact target bind should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state exact target bind should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateExactTargets.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state exact target bind should not change restored rice')

const duplicateFamilyBuildingRealDemolitionMainStateExactTargets = await runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactTargetPayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargets.idempotent, true, 'same main state exact target key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargets.already_bound, true, 'duplicate main state exact target bind should report already bound')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.manifest_hash, familyBuildingRealDemolitionMainStateExactTargets.main_state_exact_targets.manifest_hash, 'duplicate main state exact target bind should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'duplicate main state exact target bind should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'duplicate main state exact target bind should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'duplicate main state exact target bind should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'duplicate main state exact target bind should not rewrite cellar partner save')

const mainStateExactExecutePayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  exact_target_manifest_hash: familyBuildingRealDemolitionMainStateExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'exact_target_bound_pending_execute',
  confirmation_text: '确认精确执行安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute exact main state target but keep mutation blocked',
  idempotency_key: 'qa-family-building-real-demolition-main-state-exact-execute',
}

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactExecutePayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-execute-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not execute real demolition personal main state exact targets'
)

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactExecutePayload,
    confirmation_text: 'bad confirm',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-execute-bad-confirm',
  }, actor(largeOwner)),
  error => error?.status === 400,
  'main state exact execute should require confirmation text'
)

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactExecutePayload,
    exact_target_manifest_hash: 'bad-exact-target-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-execute-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact execute should reject exact target manifest hash drift'
)

const familyBuildingRealDemolitionMainStateExactExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactExecutePayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.idempotent, false, 'first main state exact execute should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.already_executed, false, 'first main state exact execute should not report already executed')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_execute_idempotency_key, 'qa-family-building-real-demolition-main-state-exact-execute', 'main state exact execute should store idempotency key')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_unresolved_exact_target_selector', 'main state exact execute should block unresolved placeholder selectors')
assert.ok(!familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_execute'), 'main state exact execute should clear exact execute deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_target_manual_resolution'), 'main state exact execute should defer manual exact target resolution')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.mutation_enabled, false, 'main state exact execute should not enable mutation while blocked')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.personal_save_changed, false, 'main state exact execute should not write personal saves while blocked')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.shared_fund_changed, false, 'main state exact execute should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.shared_warehouse_changed, false, 'main state exact execute should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionMainStateExactExecute.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_exact_execution_blocked'), 'main state exact execute block should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state exact execute block should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state exact execute block should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state exact execute block should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state exact execute block should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.fund.balance, balanceBeforeLargeDraft, 'main state exact execute block should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state exact execute block should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateExactExecute.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state exact execute block should not change restored rice')

const duplicateFamilyBuildingRealDemolitionMainStateExactExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactExecutePayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactExecute.idempotent, true, 'same main state exact execute key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactExecute.already_executed, true, 'duplicate main state exact execute should report already executed')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.execution_state, familyBuildingRealDemolitionMainStateExactExecute.main_state_exact_execution.execution_state, 'duplicate main state exact execute should keep execution state')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'duplicate main state exact execute block should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'duplicate main state exact execute block should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'duplicate main state exact execute block should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'duplicate main state exact execute block should not rewrite cellar partner save')

const mainStateExactTargetResolutionPayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  exact_target_manifest_hash: familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_unresolved_exact_target_selector',
  confirmation_text: '确认人工解析精确目标',
  reason: 'qa resolve placeholder exact target but keep mutation adapter blocked',
  idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution',
  targets: familyBuildingRealDemolitionMainStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.map((item, index) => {
    let resolvedId = 'ancestral_display_wall'
    if (item.candidate_path === 'decoration.owned') {
      resolvedId = 'bamboo_lamp'
    } else if (item.candidate_path === 'home.caveChoice') {
      resolvedId = 'mushroom'
    } else if (item.candidate_path === 'home.cellarSlots') {
      resolvedId = '0'
    } else if (item.username === largeOwner) {
      resolvedId = 'scholar_room'
    }
    const resolvedTargetRef = `${item.candidate_path}.${resolvedId}`
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: item.candidate_path,
      binding_ref: item.binding_ref,
      snapshot_hash: item.snapshot_hash,
      exact_target_ref: resolvedTargetRef,
      delete_selector: resolvedTargetRef,
      target_kind: item.target_kind,
      resolution_proof: `qa-proof-${index}`,
    }
  }),
}

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not resolve real demolition personal main state exact targets'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    confirmation_text: 'bad confirm',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-bad-confirm',
  }, actor(largeOwner)),
  error => error?.status === 400,
  'main state exact target resolution should require confirmation text'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    exact_target_manifest_hash: 'bad-exact-target-resolution-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact target resolution should reject exact target manifest hash drift'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-placeholder',
    targets: mainStateExactTargetResolutionPayload.targets.map((item, index) => ({
      ...item,
      exact_target_ref: `${item.candidate_path}.qa_exact_target_still_${index}`,
      delete_selector: `${item.candidate_path}.qa_exact_target_still_${index}`,
    })),
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact target resolution should reject placeholder selectors'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-mismatched-selector',
    targets: mainStateExactTargetResolutionPayload.targets.map((item, index) => ({
      ...item,
      exact_target_ref: `${item.candidate_path}.safe_target_${index}`,
      delete_selector: `${item.candidate_path}.different_target_${index}`,
    })),
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact target resolution should reject mismatched exact target and delete selector'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-kind-mismatch',
    targets: mainStateExactTargetResolutionPayload.targets.map(item => ({
      ...item,
      target_kind: item.candidate_path.startsWith('decoration.') ? 'home' : 'decoration',
    })),
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact target resolution should reject target kind spoofing'
)

await assert.rejects(
  () => runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(largeContract.contract.id, {
    ...mainStateExactTargetResolutionPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-target-resolution-unsafe-child',
    targets: mainStateExactTargetResolutionPayload.targets.map(item => ({
      ...item,
      exact_target_ref: `${item.candidate_path}.bad/child`,
      delete_selector: `${item.candidate_path}.bad/child`,
    })),
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact target resolution should reject unsafe child selector ids'
)

const familyBuildingRealDemolitionMainStateExactTargetResolution = await runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactTargetResolutionPayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.idempotent, false, 'first main state exact target resolution should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.already_resolved, false, 'first main state exact target resolution should not report already resolved')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key, 'qa-family-building-real-demolition-main-state-exact-target-resolution', 'main state exact target resolution should store idempotency key')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_personal_main_state_mutation_adapter_missing', 'main state exact target resolution should advance to adapter missing block')
assert.ok(!familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_target_manual_resolution'), 'main state exact target resolution should clear manual resolution deferred operation')
assert.ok(familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_mutation_adapter_required'), 'main state exact target resolution should defer mutation adapter work')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.mutation_enabled, false, 'main state exact target resolution should not enable mutation')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.personal_save_changed, false, 'main state exact target resolution should not write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.shared_fund_changed, false, 'main state exact target resolution should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.shared_warehouse_changed, false, 'main state exact target resolution should not change shared warehouse')
assert.ok(familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.every(item => !item.exact_target_ref.includes('.qa_exact_target_') && !item.exact_target_ref.includes('.ui_exact_target_')), 'main state exact target resolution should replace placeholder target refs')
assert.ok(familyBuildingRealDemolitionMainStateExactTargetResolution.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_exact_targets_resolved'), 'main state exact target resolution should be audited')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'main state exact target resolution should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'main state exact target resolution should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'main state exact target resolution should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'main state exact target resolution should not rewrite cellar partner save')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.fund.balance, balanceBeforeLargeDraft, 'main state exact target resolution should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state exact target resolution should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateExactTargetResolution.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state exact target resolution should not change restored rice')

const duplicateFamilyBuildingRealDemolitionMainStateExactTargetResolution = await runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  largeContract.contract.id,
  mainStateExactTargetResolutionPayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargetResolution.idempotent, true, 'same main state exact target resolution key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargetResolution.already_resolved, true, 'duplicate main state exact target resolution should report already resolved')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.manifest_hash, familyBuildingRealDemolitionMainStateExactTargetResolution.main_state_exact_target_resolution.manifest_hash, 'duplicate main state exact target resolution should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawBeforeMainStatePreview, 'duplicate main state exact target resolution should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawBeforeMainStatePreview, 'duplicate main state exact target resolution should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawBeforeMainStatePreview, 'duplicate main state exact target resolution should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawBeforeMainStatePreview, 'duplicate main state exact target resolution should not rewrite cellar partner save')

const mainStateExactMutationPayload = {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  exact_target_manifest_hash: familyBuildingRealDemolitionMainStateExactTargetResolution.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
  confirmation_text: '确认执行个人主状态变更',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute exact main state mutation adapter against home renovation states',
  idempotency_key: 'qa-family-building-real-demolition-main-state-exact-mutation',
}

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(largeContract.contract.id, {
    ...mainStateExactMutationPayload,
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-mutation-extra-denied',
  }, actor(extra)),
  error => error?.status === 403,
  'non-members should not execute real demolition personal main state exact mutation adapter'
)

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(largeContract.contract.id, {
    ...mainStateExactMutationPayload,
    confirmation_text: 'bad confirm',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-mutation-bad-confirm',
  }, actor(largeOwner)),
  error => error?.status === 400,
  'main state exact mutation adapter should require confirmation text'
)

await assert.rejects(
  () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(largeContract.contract.id, {
    ...mainStateExactMutationPayload,
    exact_target_manifest_hash: 'bad-exact-mutation-hash',
    idempotency_key: 'qa-family-building-real-demolition-main-state-exact-mutation-bad-hash',
  }, actor(largeOwner)),
  error => error?.status === 409,
  'main state exact mutation adapter should reject exact target manifest hash drift'
)

const ownerHomeBeforeExactMutation = readGameplayData(largeOwner)?.home?.homeRenovationStates || {}
const partnerHomeBeforeExactMutation = readGameplayData(largePartner)?.home?.homeRenovationStates || {}
const partnerDecorationBeforeExactMutation = readGameplayData(largePartner)?.decoration || {}
const caveHomeBeforeExactMutation = readGameplayData(largeCavePartner)?.home || {}
const cellarHomeBeforeExactMutation = readGameplayData(largeCellarPartner)?.home || {}
assert.equal(ownerHomeBeforeExactMutation.scholar_room, true, 'owner should start with resolved home renovation target')
assert.equal(partnerDecorationBeforeExactMutation.owned?.bamboo_lamp, 2, 'partner should start with removable decoration owned target')
assert.equal(partnerDecorationBeforeExactMutation.placed?.bamboo_lamp, 1, 'partner should start with one placed decoration protected from owned-only removal')
assert.equal(caveHomeBeforeExactMutation.caveUnlocked, true, 'cave partner should keep cave unlocked before exact mutation')
assert.equal(caveHomeBeforeExactMutation.caveChoice, 'mushroom', 'cave partner should start with resolved cave choice target')
assert.equal(cellarHomeBeforeExactMutation.cellarSlots?.length, 2, 'cellar partner should start with two cellar aging slots')
assert.equal(cellarHomeBeforeExactMutation.cellarSlots?.[0]?.itemId, 'peach_wine', 'cellar partner first aging slot item should be peach wine')
assert.equal(cellarHomeBeforeExactMutation.cellarSlots?.[0]?.quality, 'fine', 'cellar partner first aging slot quality should be fine')
assert.equal(cellarHomeBeforeExactMutation.cellarSlots?.[0]?.daysAging, 3, 'cellar partner first aging slot days should be preserved before mutation')
const ownerMoneyBeforeExactMutation = readGameplayData(largeOwner)?.player?.money
const partnerMoneyBeforeExactMutation = readGameplayData(largePartner)?.player?.money
const cavePartnerMoneyBeforeExactMutation = readGameplayData(largeCavePartner)?.player?.money
const cellarPartnerMoneyBeforeExactMutation = readGameplayData(largeCellarPartner)?.player?.money
const ownerInventoryBeforeExactMutation = getInventoryItemQuantity(largeOwner, 'wood')
const partnerInventoryBeforeExactMutation = getInventoryItemQuantity(largePartner, 'wood')
const cavePartnerInventoryBeforeExactMutation = getInventoryItemQuantity(largeCavePartner, 'wood')
const cellarPartnerInventoryBeforeExactMutation = getInventoryItemQuantity(largeCellarPartner, 'wood')
const cellarPartnerWineBeforeExactMutation = getInventoryItemQuantity(largeCellarPartner, 'peach_wine', 'fine')

const familyBuildingRealDemolitionMainStateExactMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  largeContract.contract.id,
  mainStateExactMutationPayload,
  actor(largeOwner)
)
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.idempotent, false, 'first main state exact mutation adapter should not be idempotent')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.already_mutated, false, 'first main state exact mutation adapter should not report already mutated')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.building_ledger_entry.real_build_demolition_main_state_exact_mutation_idempotency_key, 'qa-family-building-real-demolition-main-state-exact-mutation', 'main state exact mutation adapter should store idempotency key')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'personal_main_state_mutated', 'main state exact mutation adapter should advance execution state')
assert.ok(!familyBuildingRealDemolitionMainStateExactMutation.building_ledger_entry.deferred_operations.includes('real_build_demolition_main_state_exact_mutation_adapter_required'), 'main state exact mutation adapter should clear adapter deferred operation')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.main_state_exact_mutation.mutation_enabled, true, 'main state exact mutation adapter should enable mutation')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.main_state_exact_mutation.personal_save_changed, true, 'main state exact mutation adapter should write personal saves')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.main_state_exact_mutation.shared_fund_changed, false, 'main state exact mutation adapter should not change shared fund')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.main_state_exact_mutation.shared_warehouse_changed, false, 'main state exact mutation adapter should not change shared warehouse')
assert.equal(readGameplayData(largeOwner)?.home?.homeRenovationStates?.scholar_room, undefined, 'owner resolved home renovation target should be removed from personal main state')
assert.equal(readGameplayData(largePartner)?.decoration?.owned?.bamboo_lamp, 1, 'partner resolved unplaced decoration owned target should be decremented')
assert.equal(readGameplayData(largePartner)?.decoration?.placed?.bamboo_lamp, 1, 'partner placed decoration should remain when only owned surplus is removed')
assert.equal(readGameplayData(largeCavePartner)?.home?.caveChoice, 'none', 'cave partner resolved cave choice should be reset from personal main state')
assert.equal(readGameplayData(largeCavePartner)?.home?.caveUnlocked, true, 'cave partner cave unlock flag should remain after cave choice reset')
assert.equal(readGameplayData(largeCellarPartner)?.home?.cellarSlots?.length, 1, 'cellar partner resolved cellar slot should remove exactly one aging slot')
assert.equal(readGameplayData(largeCellarPartner)?.home?.cellarSlots?.[0]?.itemId, 'rice_vinegar', 'cellar partner remaining aging slot item should shift without loss')
assert.equal(readGameplayData(largeCellarPartner)?.home?.cellarSlots?.[0]?.quality, 'normal', 'cellar partner remaining aging slot quality should be preserved')
assert.equal(readGameplayData(largeCellarPartner)?.home?.cellarSlots?.[0]?.daysAging, 1, 'cellar partner remaining aging slot days should be preserved')
assert.equal(readGameplayData(largeCellarPartner)?.home?.farmhouseLevel, 3, 'cellar partner farmhouse level should remain after cellar slot removal')
assert.equal(readGameplayData(largeOwner)?.home?.homeRenovationStates?.tea_corner, true, 'owner unrelated home renovation should remain')
assert.equal(readGameplayData(largePartner)?.home?.homeRenovationStates?.scholar_room, true, 'partner unrelated home renovation should remain')
assert.equal(readGameplayData(largeOwner)?.player?.money, ownerMoneyBeforeExactMutation, 'main state exact mutation adapter should not touch owner money')
assert.equal(readGameplayData(largePartner)?.player?.money, partnerMoneyBeforeExactMutation, 'main state exact mutation adapter should not touch partner money')
assert.equal(readGameplayData(largeCavePartner)?.player?.money, cavePartnerMoneyBeforeExactMutation, 'main state exact mutation adapter should not touch cave partner money')
assert.equal(readGameplayData(largeCellarPartner)?.player?.money, cellarPartnerMoneyBeforeExactMutation, 'main state exact mutation adapter should not touch cellar partner money')
assert.equal(getInventoryItemQuantity(largeOwner, 'wood'), ownerInventoryBeforeExactMutation, 'main state exact mutation adapter should not touch owner inventory')
assert.equal(getInventoryItemQuantity(largePartner, 'wood'), partnerInventoryBeforeExactMutation, 'main state exact mutation adapter should not touch partner inventory')
assert.equal(getInventoryItemQuantity(largeCavePartner, 'wood'), cavePartnerInventoryBeforeExactMutation, 'main state exact mutation adapter should not touch cave partner inventory')
assert.equal(getInventoryItemQuantity(largeCellarPartner, 'wood'), cellarPartnerInventoryBeforeExactMutation, 'main state exact mutation adapter should not touch cellar partner inventory')
assert.equal(getInventoryItemQuantity(largeCellarPartner, 'peach_wine', 'fine'), cellarPartnerWineBeforeExactMutation, 'cellar slot removal should not return removed wine to personal inventory')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.fund.balance, balanceBeforeLargeDraft, 'main state exact mutation adapter should not change shared fund balance')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.warehouse.items.find(item => item.item_id === 'wood')?.quantity ?? 0, 28, 'main state exact mutation adapter should not change restored wood')
assert.equal(familyBuildingRealDemolitionMainStateExactMutation.warehouse.items.find(item => item.item_id === 'rice')?.quantity ?? 0, 12, 'main state exact mutation adapter should not change restored rice')
assert.ok(familyBuildingRealDemolitionMainStateExactMutation.contract.audit_log.find(entry => entry.action === 'family_building_real_demolition_main_state_exact_mutation_applied'), 'main state exact mutation adapter should be audited')
assert.equal(readGameplayData(largeOwner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'owner main state mutation receipt should reference building ledger')
assert.equal(readGameplayData(largePartner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'partner main state mutation receipt should reference building ledger')
assert.equal(readGameplayData(largeCavePartner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'cave partner main state mutation receipt should reference building ledger')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.building_ledger_id, largeExecute.building_ledger_entry.id, 'cellar partner main state mutation receipt should reference building ledger')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.target_kind, 'home_cellar_slot', 'cellar partner main state mutation receipt should record cellar slot target kind')
assert.equal(readGameplayData(largeCellarPartner)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.mutation_result, 'home_cellar_slot_removed', 'cellar partner main state mutation receipt should record cellar slot removal result')
assert.ok(familyBuildingRealDemolitionMainStateExactMutation.main_state_exact_mutation.receipts.find(receipt => receipt.username === largeCellarPartner && receipt.target_kind === 'home_cellar_slot' && receipt.mutation_result === 'home_cellar_slot_removed'), 'main state exact mutation response should include cellar slot receipt summary')

const greenhouseMember = 'cohabit_lg_gh25'
const farmhouseMember = 'cohabit_lg_fh25'
assert.equal((await db.registerUser(greenhouseMember, 'SmokePass_0525', 'large greenhouse member')).ok, true, 'greenhouse exact mutation QA user should register')
assert.equal((await db.registerUser(farmhouseMember, 'SmokePass_0525', 'large farmhouse member')).ok, true, 'farmhouse exact mutation QA user should register')
seedSave(greenhouseMember)
seedSave(farmhouseMember)
const greenhouseFarmhouseFriendRequest = await socialRuntime.requestFriendship(greenhouseMember, { target_username: farmhouseMember })
await socialRuntime.acceptFriendRequest(farmhouseMember, greenhouseFarmhouseFriendRequest.id)
const greenhouseFarmhouseContract = await runtime.createCohabitationContract({
  type: 'business_partner',
  target_usernames: [farmhouseMember],
  idempotency_key: 'qa-greenhouse-farmhouse-contract',
}, actor(greenhouseMember))
await runtime.acceptCohabitationContract(greenhouseFarmhouseContract.contract.id, actor(farmhouseMember))
await runtime.updateCohabitationPermissions(greenhouseFarmhouseContract.contract.id, {
  target_username: greenhouseMember,
  permissions: {
    fund: {
      spend_large: true,
    },
  },
  idempotency_key: 'qa-greenhouse-farmhouse-owner-spend-large-permission',
}, actor(greenhouseMember))

const greenhouseFarmhouseLedgerId = 'qa_greenhouse_farmhouse_building_ledger'
const greenhouseFarmhouseRealBuildRef = 'family_building:shared_granary:qa_greenhouse_farmhouse'
await mutateStoredContract(greenhouseFarmhouseContract.contract.id, contract => {
  contract.family_building_ledger = [
    {
      id: greenhouseFarmhouseLedgerId,
      contract_id: contract.id,
      action: 'compensated',
      status: 'compensated',
      purpose: 'family_building',
      target_ref: 'family_building:shared_granary:build',
      building_id: 'shared_granary',
      project_id: 'shared_granary',
      actor_username: greenhouseMember,
      amount: 0,
      shared_fund_balance_before: 0,
      shared_fund_balance_after: 0,
      shared_fund_deducted: false,
      shared_warehouse_materials_consumed: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      real_build_applied: true,
      real_build_ref: greenhouseFarmhouseRealBuildRef,
      compensation_required: false,
      real_build_demolished: true,
      real_build_demolition_review_state: 'executed',
      real_build_demolition_execution_state: 'executed',
      real_build_demolition_personal_save_write_idempotency_key: 'qa-greenhouse-farmhouse-personal-save-write',
      deferred_operations: [],
      at: 1771950000,
      created_at: 1771950000,
    },
  ]
})

const greenhouseHomeBeforeExactChain = readGameplayData(greenhouseMember)?.home || {}
const farmhouseHomeBeforeExactChain = readGameplayData(farmhouseMember)?.home || {}
const greenhouseMoneyBeforeExactChain = readGameplayData(greenhouseMember)?.player?.money
const farmhouseMoneyBeforeExactChain = readGameplayData(farmhouseMember)?.player?.money
const greenhouseWoodBeforeExactChain = getInventoryItemQuantity(greenhouseMember, 'wood')
const farmhouseWoodBeforeExactChain = getInventoryItemQuantity(farmhouseMember, 'wood')
assert.equal(greenhouseHomeBeforeExactChain.greenhouseUnlocked, true, 'greenhouse member should start with unlocked greenhouse')
assert.equal(farmhouseHomeBeforeExactChain.farmhouseLevel, 3, 'farmhouse member should start at level 3 farmhouse')
assert.equal(farmhouseHomeBeforeExactChain.cellarSlots?.length ?? 0, 0, 'farmhouse member should start without cellar slots so downgrade is safe')

const greenhouseFarmhousePreview = await runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(greenhouseFarmhouseContract.contract.id, {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  reason: 'qa preview greenhouse and farmhouse exact mutation chain',
  idempotency_key: 'qa-greenhouse-farmhouse-main-state-preview',
}, actor(greenhouseMember))
assert.equal(greenhouseFarmhousePreview.idempotent, false, 'greenhouse farmhouse preview should be first-run')
assert.equal(greenhouseFarmhousePreview.main_state_preview.manifest.length, 2, 'greenhouse farmhouse preview should include two accepted members')
assert.equal(greenhouseFarmhousePreview.main_state_preview.personal_save_changed, false, 'greenhouse farmhouse preview should not write personal saves')

const greenhouseFarmhouseMappingPayload = {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  manifest_hash: greenhouseFarmhousePreview.main_state_preview.manifest_hash,
  reason: 'qa verify greenhouse and farmhouse main state mapping',
  idempotency_key: 'qa-greenhouse-farmhouse-main-state-mapping',
  mappings: greenhouseFarmhousePreview.main_state_preview.manifest.map(item => {
    const useGreenhouse = item.username === greenhouseMember
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: useGreenhouse ? 'home.greenhouseUnlocked' : 'home.farmhouseLevel',
      binding_ref: `${useGreenhouse ? 'manual-greenhouse' : 'manual-farmhouse'}:${item.building_ledger_id}:${item.username_key}`,
      snapshot_hash: item.snapshot_hash,
    }
  }),
}
const greenhouseFarmhouseMapping = await runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseMappingPayload,
  actor(greenhouseMember)
)
assert.equal(greenhouseFarmhouseMapping.idempotent, false, 'greenhouse farmhouse mapping should be first-run')
assert.equal(greenhouseFarmhouseMapping.main_state_mapping.manifest.length, 2, 'greenhouse farmhouse mapping should cover both members')
assert.ok(greenhouseFarmhouseMapping.main_state_mapping.manifest.some(item => item.username === greenhouseMember && item.candidate_path === 'home.greenhouseUnlocked'), 'greenhouse mapping should target greenhouse unlock state')
assert.ok(greenhouseFarmhouseMapping.main_state_mapping.manifest.some(item => item.username === farmhouseMember && item.candidate_path === 'home.farmhouseLevel'), 'farmhouse mapping should target farmhouse level')

const greenhouseFarmhouseGuard = await runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(greenhouseFarmhouseContract.contract.id, {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  mapping_manifest_hash: greenhouseFarmhouseMapping.main_state_mapping.manifest_hash,
  confirmation_text: '确认主状态变更安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa guard greenhouse and farmhouse exact mutation',
  idempotency_key: 'qa-greenhouse-farmhouse-main-state-guard',
}, actor(greenhouseMember))
assert.equal(greenhouseFarmhouseGuard.idempotent, false, 'greenhouse farmhouse guard should be first-run')
assert.equal(greenhouseFarmhouseGuard.main_state_mutation_guard.manifest.length, 2, 'greenhouse farmhouse guard should cover both members')

const greenhouseFarmhouseMainStateExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(greenhouseFarmhouseContract.contract.id, {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  guard_manifest_hash: greenhouseFarmhouseGuard.main_state_mutation_guard.manifest_hash,
  reason: 'qa block greenhouse and farmhouse before exact target binding',
  idempotency_key: 'qa-greenhouse-farmhouse-main-state-execute',
}, actor(greenhouseMember))
assert.equal(greenhouseFarmhouseMainStateExecute.main_state_execution.execution_state, 'blocked_missing_exact_personal_target', 'greenhouse farmhouse generic execute should require exact target binding')

const greenhouseFarmhouseExactTargetPayload = {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  guard_manifest_hash: greenhouseFarmhouseMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest_hash,
  expected_execution_state: 'blocked_missing_exact_personal_target',
  reason: 'qa bind placeholder exact targets for greenhouse and farmhouse',
  idempotency_key: 'qa-greenhouse-farmhouse-exact-targets',
  targets: greenhouseFarmhouseMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest.map((row, index) => ({
    username: row.username,
    username_key: row.username_key,
    save_slot: row.save_slot,
    save_id: row.save_id,
    real_build_ref: row.real_build_ref,
    candidate_path: row.candidate_path,
    binding_ref: row.binding_ref,
    snapshot_hash: row.snapshot_hash,
    exact_target_ref: `${row.candidate_path}.qa_exact_target_greenhouse_farmhouse_${index}`,
    delete_selector: `${row.candidate_path}.qa_exact_target_greenhouse_farmhouse_${index}`,
    target_kind: 'home',
  })),
}
const greenhouseFarmhouseExactTargets = await runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseExactTargetPayload,
  actor(greenhouseMember)
)
assert.equal(greenhouseFarmhouseExactTargets.idempotent, false, 'greenhouse farmhouse exact target bind should be first-run')
assert.equal(greenhouseFarmhouseExactTargets.building_ledger_entry.real_build_demolition_main_state_execution_state, 'exact_target_bound_pending_execute', 'greenhouse farmhouse exact targets should wait for exact execute')

const greenhouseFarmhouseExactExecutePayload = {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  exact_target_manifest_hash: greenhouseFarmhouseExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'exact_target_bound_pending_execute',
  confirmation_text: '确认精确执行安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute placeholder greenhouse and farmhouse exact targets',
  idempotency_key: 'qa-greenhouse-farmhouse-exact-execute',
}
const greenhouseFarmhouseExactExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseExactExecutePayload,
  actor(greenhouseMember)
)
assert.equal(greenhouseFarmhouseExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_unresolved_exact_target_selector', 'greenhouse farmhouse exact execute should block unresolved placeholders')

const greenhouseFarmhouseResolutionPayload = {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  exact_target_manifest_hash: greenhouseFarmhouseExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_unresolved_exact_target_selector',
  confirmation_text: '确认人工解析精确目标',
  reason: 'qa resolve greenhouse and farmhouse exact targets',
  idempotency_key: 'qa-greenhouse-farmhouse-exact-resolution',
  targets: greenhouseFarmhouseExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.map((item, index) => {
    const resolvedTargetRef = item.username === greenhouseMember
      ? 'home.greenhouseUnlocked.true'
      : 'home.farmhouseLevel.3'
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: item.candidate_path,
      binding_ref: item.binding_ref,
      snapshot_hash: item.snapshot_hash,
      exact_target_ref: resolvedTargetRef,
      delete_selector: resolvedTargetRef,
      target_kind: item.target_kind,
      resolution_proof: `qa-greenhouse-farmhouse-proof-${index}`,
    }
  }),
}
const greenhouseFarmhouseResolution = await runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseResolutionPayload,
  actor(greenhouseMember)
)
assert.equal(greenhouseFarmhouseResolution.idempotent, false, 'greenhouse farmhouse exact resolution should be first-run')
assert.equal(greenhouseFarmhouseResolution.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_personal_main_state_mutation_adapter_missing', 'greenhouse farmhouse resolution should advance to mutation adapter')

const greenhouseFarmhouseMutationPayload = {
  building_ledger_id: greenhouseFarmhouseLedgerId,
  exact_target_manifest_hash: greenhouseFarmhouseResolution.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
  confirmation_text: '确认执行个人主状态变更',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute greenhouse and farmhouse exact mutation through real chain',
  idempotency_key: 'qa-greenhouse-farmhouse-exact-mutation',
}
const greenhouseFarmhouseMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseMutationPayload,
  actor(greenhouseMember)
)
assert.equal(greenhouseFarmhouseMutation.idempotent, false, 'greenhouse farmhouse exact mutation should be first-run')
assert.equal(greenhouseFarmhouseMutation.main_state_exact_mutation.receipts.length, 2, 'greenhouse farmhouse exact mutation should write two receipts')
assert.equal(greenhouseFarmhouseMutation.main_state_exact_mutation.shared_fund_changed, false, 'greenhouse farmhouse exact mutation should not change shared fund')
assert.equal(greenhouseFarmhouseMutation.main_state_exact_mutation.shared_warehouse_changed, false, 'greenhouse farmhouse exact mutation should not change shared warehouse')
assert.equal(readGameplayData(greenhouseMember)?.home?.greenhouseUnlocked, false, 'greenhouse exact chain should reset greenhouse unlock flag')
assert.equal(readGameplayData(farmhouseMember)?.home?.farmhouseLevel, 2, 'farmhouse exact chain should downgrade farmhouse one level')
assert.equal(readGameplayData(farmhouseMember)?.animal?.pets?.length, 2, 'farmhouse exact chain should preserve pets within downgraded capacity')
assert.equal(readGameplayData(greenhouseMember)?.player?.money, greenhouseMoneyBeforeExactChain, 'greenhouse exact chain should not touch personal money')
assert.equal(readGameplayData(farmhouseMember)?.player?.money, farmhouseMoneyBeforeExactChain, 'farmhouse exact chain should not touch personal money')
assert.equal(getInventoryItemQuantity(greenhouseMember, 'wood'), greenhouseWoodBeforeExactChain, 'greenhouse exact chain should not touch personal inventory')
assert.equal(getInventoryItemQuantity(farmhouseMember, 'wood'), farmhouseWoodBeforeExactChain, 'farmhouse exact chain should not touch personal inventory')
assert.ok(greenhouseFarmhouseMutation.main_state_exact_mutation.receipts.find(receipt => receipt.username === greenhouseMember && receipt.target_kind === 'home_greenhouse_unlocked' && receipt.mutation_result === 'home_greenhouse_unlocked_reset'), 'greenhouse exact mutation response should include greenhouse receipt')
assert.ok(greenhouseFarmhouseMutation.main_state_exact_mutation.receipts.find(receipt => receipt.username === farmhouseMember && receipt.target_kind === 'home_farmhouse_level' && receipt.mutation_result === 'home_farmhouse_level_downgraded'), 'farmhouse exact mutation response should include farmhouse receipt')
assert.equal(readGameplayData(greenhouseMember)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.target_kind, 'home_greenhouse_unlocked', 'greenhouse personal receipt should record greenhouse target kind')
assert.equal(readGameplayData(farmhouseMember)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.target_kind, 'home_farmhouse_level', 'farmhouse personal receipt should record farmhouse target kind')
const greenhouseRawAfterExactChain = saveRuntime.loadUserSaveSlots(greenhouseMember).slots[0].raw
const farmhouseRawAfterExactChain = saveRuntime.loadUserSaveSlots(farmhouseMember).slots[0].raw
const duplicateGreenhouseFarmhouseMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  greenhouseFarmhouseContract.contract.id,
  greenhouseFarmhouseMutationPayload,
  actor(greenhouseMember)
)
assert.equal(duplicateGreenhouseFarmhouseMutation.idempotent, true, 'greenhouse farmhouse exact mutation should be idempotent')
assert.equal(duplicateGreenhouseFarmhouseMutation.already_mutated, true, 'duplicate greenhouse farmhouse exact mutation should report already mutated')
assert.equal(saveRuntime.loadUserSaveSlots(greenhouseMember).slots[0].raw, greenhouseRawAfterExactChain, 'duplicate greenhouse exact mutation should not rewrite save')
assert.equal(saveRuntime.loadUserSaveSlots(farmhouseMember).slots[0].raw, farmhouseRawAfterExactChain, 'duplicate farmhouse exact mutation should not rewrite save')

const caveChoiceMember = 'qa_lg_cvch26'
const caveUnlockMember = 'qa_lg_cvun26'
assert.equal((await db.registerUser(caveChoiceMember, 'SmokePass_0525', 'large cave choice member')).ok, true, 'cave choice exact mutation QA user should register')
assert.equal((await db.registerUser(caveUnlockMember, 'SmokePass_0525', 'large cave unlock member')).ok, true, 'cave unlock exact mutation QA user should register')
seedSave(caveChoiceMember)
seedSave(caveUnlockMember)
const caveStateFriendRequest = await socialRuntime.requestFriendship(caveChoiceMember, { target_username: caveUnlockMember })
await socialRuntime.acceptFriendRequest(caveUnlockMember, caveStateFriendRequest.id)
const caveStateContract = await runtime.createCohabitationContract({
  type: 'business_partner',
  target_usernames: [caveUnlockMember],
  idempotency_key: 'qa-cave-state-contract',
}, actor(caveChoiceMember))
await runtime.acceptCohabitationContract(caveStateContract.contract.id, actor(caveUnlockMember))
await runtime.updateCohabitationPermissions(caveStateContract.contract.id, {
  target_username: caveChoiceMember,
  permissions: {
    fund: {
      spend_large: true,
    },
  },
  idempotency_key: 'qa-cave-state-owner-spend-large-permission',
}, actor(caveChoiceMember))

const caveStateLedgerId = 'qa_cave_state_building_ledger'
await injectReadyFamilyBuildingMainStateLedger(caveStateContract.contract.id, {
  actorUsername: caveChoiceMember,
  ledgerId: caveStateLedgerId,
  realBuildRef: 'family_building:shared_granary:qa_cave_state',
})

const caveChoiceHomeBeforeExactChain = readGameplayData(caveChoiceMember)?.home || {}
const caveUnlockHomeBeforeExactChain = readGameplayData(caveUnlockMember)?.home || {}
const caveChoiceMoneyBeforeExactChain = readGameplayData(caveChoiceMember)?.player?.money
const caveUnlockMoneyBeforeExactChain = readGameplayData(caveUnlockMember)?.player?.money
const caveChoiceWoodBeforeExactChain = getInventoryItemQuantity(caveChoiceMember, 'wood')
const caveUnlockWoodBeforeExactChain = getInventoryItemQuantity(caveUnlockMember, 'wood')
assert.equal(caveChoiceHomeBeforeExactChain.caveUnlocked, true, 'cave choice member should start with cave unlocked')
assert.equal(caveChoiceHomeBeforeExactChain.caveChoice, 'mushroom', 'cave choice member should start with mushroom cave choice')
assert.equal(caveUnlockHomeBeforeExactChain.caveUnlocked, true, 'cave unlock member should start with cave unlocked')
assert.equal(caveUnlockHomeBeforeExactChain.caveChoice, 'none', 'cave unlock member should start with no cave choice so cave can close safely')

const caveStatePreview = await runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  reason: 'qa preview cave choice and cave unlock exact mutation chain',
  idempotency_key: 'qa-cave-state-main-state-preview',
}, actor(caveChoiceMember))
assert.equal(caveStatePreview.idempotent, false, 'cave state preview should be first-run')
assert.equal(caveStatePreview.main_state_preview.manifest.length, 2, 'cave state preview should include two accepted members')
assert.equal(caveStatePreview.main_state_preview.personal_save_changed, false, 'cave state preview should not write personal saves')

const caveStateMapping = await runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  manifest_hash: caveStatePreview.main_state_preview.manifest_hash,
  reason: 'qa verify cave choice and cave unlock main state mapping',
  idempotency_key: 'qa-cave-state-main-state-mapping',
  mappings: caveStatePreview.main_state_preview.manifest.map(item => {
    const useCaveChoice = item.username === caveChoiceMember
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: useCaveChoice ? 'home.caveChoice' : 'home.caveUnlocked',
      binding_ref: `${useCaveChoice ? 'manual-cave-choice' : 'manual-cave-unlocked'}:${item.building_ledger_id}:${item.username_key}`,
      snapshot_hash: item.snapshot_hash,
    }
  }),
}, actor(caveChoiceMember))
assert.equal(caveStateMapping.idempotent, false, 'cave state mapping should be first-run')
assert.ok(caveStateMapping.main_state_mapping.manifest.some(item => item.username === caveChoiceMember && item.candidate_path === 'home.caveChoice'), 'cave choice mapping should target cave choice')
assert.ok(caveStateMapping.main_state_mapping.manifest.some(item => item.username === caveUnlockMember && item.candidate_path === 'home.caveUnlocked'), 'cave unlock mapping should target cave unlock flag')

const caveStateGuard = await runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  mapping_manifest_hash: caveStateMapping.main_state_mapping.manifest_hash,
  confirmation_text: '确认主状态变更安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa guard cave choice and cave unlock exact mutation',
  idempotency_key: 'qa-cave-state-main-state-guard',
}, actor(caveChoiceMember))
assert.equal(caveStateGuard.idempotent, false, 'cave state guard should be first-run')
assert.equal(caveStateGuard.main_state_mutation_guard.manifest.length, 2, 'cave state guard should cover both members')

const caveStateMainStateExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  guard_manifest_hash: caveStateGuard.main_state_mutation_guard.manifest_hash,
  reason: 'qa block cave choice and cave unlock before exact target binding',
  idempotency_key: 'qa-cave-state-main-state-execute',
}, actor(caveChoiceMember))
assert.equal(caveStateMainStateExecute.main_state_execution.execution_state, 'blocked_missing_exact_personal_target', 'cave state generic execute should require exact target binding')

const caveStateExactTargets = await runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  guard_manifest_hash: caveStateMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest_hash,
  expected_execution_state: 'blocked_missing_exact_personal_target',
  reason: 'qa bind placeholder exact targets for cave state',
  idempotency_key: 'qa-cave-state-exact-targets',
  targets: caveStateMainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest.map((row, index) => ({
    username: row.username,
    username_key: row.username_key,
    save_slot: row.save_slot,
    save_id: row.save_id,
    real_build_ref: row.real_build_ref,
    candidate_path: row.candidate_path,
    binding_ref: row.binding_ref,
    snapshot_hash: row.snapshot_hash,
    exact_target_ref: `${row.candidate_path}.qa_exact_target_cave_state_${index}`,
    delete_selector: `${row.candidate_path}.qa_exact_target_cave_state_${index}`,
    target_kind: 'home',
  })),
}, actor(caveChoiceMember))
assert.equal(caveStateExactTargets.idempotent, false, 'cave state exact target bind should be first-run')

const caveStateExactExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  exact_target_manifest_hash: caveStateExactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'exact_target_bound_pending_execute',
  confirmation_text: '确认精确执行安全阀',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute placeholder cave state exact targets',
  idempotency_key: 'qa-cave-state-exact-execute',
}, actor(caveChoiceMember))
assert.equal(caveStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_unresolved_exact_target_selector', 'cave state exact execute should block unresolved placeholders')

const caveStateResolution = await runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(caveStateContract.contract.id, {
  building_ledger_id: caveStateLedgerId,
  exact_target_manifest_hash: caveStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_unresolved_exact_target_selector',
  confirmation_text: '确认人工解析精确目标',
  reason: 'qa resolve cave state exact targets',
  idempotency_key: 'qa-cave-state-exact-resolution',
  targets: caveStateExactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.map((item, index) => {
    const resolvedTargetRef = item.username === caveChoiceMember
      ? 'home.caveChoice.mushroom'
      : 'home.caveUnlocked.true'
    return {
      username: item.username,
      username_key: item.username_key,
      save_slot: item.save_slot,
      save_id: item.save_id,
      real_build_ref: item.real_build_ref,
      candidate_path: item.candidate_path,
      binding_ref: item.binding_ref,
      snapshot_hash: item.snapshot_hash,
      exact_target_ref: resolvedTargetRef,
      delete_selector: resolvedTargetRef,
      target_kind: item.target_kind,
      resolution_proof: `qa-cave-state-proof-${index}`,
    }
  }),
}, actor(caveChoiceMember))
assert.equal(caveStateResolution.idempotent, false, 'cave state exact resolution should be first-run')
assert.equal(caveStateResolution.building_ledger_entry.real_build_demolition_main_state_exact_execution_state, 'blocked_personal_main_state_mutation_adapter_missing', 'cave state resolution should advance to mutation adapter')

const caveStateMutationPayload = {
  building_ledger_id: caveStateLedgerId,
  exact_target_manifest_hash: caveStateResolution.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
  expected_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
  confirmation_text: '确认执行个人主状态变更',
  compensation_plan_acknowledged: true,
  rollback_plan_acknowledged: true,
  reason: 'qa execute cave state exact mutation through real chain',
  idempotency_key: 'qa-cave-state-exact-mutation',
}
const caveStateMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  caveStateContract.contract.id,
  caveStateMutationPayload,
  actor(caveChoiceMember)
)
assert.equal(caveStateMutation.idempotent, false, 'cave state exact mutation should be first-run')
assert.equal(caveStateMutation.main_state_exact_mutation.receipts.length, 2, 'cave state exact mutation should write two receipts')
assert.equal(caveStateMutation.main_state_exact_mutation.shared_fund_changed, false, 'cave state exact mutation should not change shared fund')
assert.equal(caveStateMutation.main_state_exact_mutation.shared_warehouse_changed, false, 'cave state exact mutation should not change shared warehouse')
assert.equal(readGameplayData(caveChoiceMember)?.home?.caveChoice, 'none', 'cave choice exact chain should reset cave choice')
assert.equal(readGameplayData(caveChoiceMember)?.home?.caveUnlocked, true, 'cave choice exact chain should keep cave unlocked')
assert.equal(readGameplayData(caveUnlockMember)?.home?.caveUnlocked, false, 'cave unlock exact chain should close cave unlock flag')
assert.equal(readGameplayData(caveUnlockMember)?.home?.caveChoice, 'none', 'cave unlock exact chain should keep cave choice none')
assert.equal(readGameplayData(caveChoiceMember)?.player?.money, caveChoiceMoneyBeforeExactChain, 'cave choice exact chain should not touch personal money')
assert.equal(readGameplayData(caveUnlockMember)?.player?.money, caveUnlockMoneyBeforeExactChain, 'cave unlock exact chain should not touch personal money')
assert.equal(getInventoryItemQuantity(caveChoiceMember, 'wood'), caveChoiceWoodBeforeExactChain, 'cave choice exact chain should not touch personal inventory')
assert.equal(getInventoryItemQuantity(caveUnlockMember, 'wood'), caveUnlockWoodBeforeExactChain, 'cave unlock exact chain should not touch personal inventory')
assert.ok(caveStateMutation.main_state_exact_mutation.receipts.find(receipt => receipt.username === caveChoiceMember && receipt.target_kind === 'home_cave_choice' && receipt.mutation_result === 'home_cave_choice_reset'), 'cave state exact mutation response should include cave choice receipt')
assert.ok(caveStateMutation.main_state_exact_mutation.receipts.find(receipt => receipt.username === caveUnlockMember && receipt.target_kind === 'home_cave_unlocked' && receipt.mutation_result === 'home_cave_unlocked_reset'), 'cave state exact mutation response should include cave unlock receipt')
assert.equal(readGameplayData(caveChoiceMember)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.target_kind, 'home_cave_choice', 'cave choice personal receipt should record cave choice target kind')
assert.equal(readGameplayData(caveUnlockMember)?.onlineCohabitation?.real_build_main_state_mutation_receipts?.[0]?.target_kind, 'home_cave_unlocked', 'cave unlock personal receipt should record cave unlock target kind')
const caveChoiceRawAfterExactChain = saveRuntime.loadUserSaveSlots(caveChoiceMember).slots[0].raw
const caveUnlockRawAfterExactChain = saveRuntime.loadUserSaveSlots(caveUnlockMember).slots[0].raw
const duplicateCaveStateMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  caveStateContract.contract.id,
  caveStateMutationPayload,
  actor(caveChoiceMember)
)
assert.equal(duplicateCaveStateMutation.idempotent, true, 'cave state exact mutation should be idempotent')
assert.equal(duplicateCaveStateMutation.already_mutated, true, 'duplicate cave state exact mutation should report already mutated')
assert.equal(saveRuntime.loadUserSaveSlots(caveChoiceMember).slots[0].raw, caveChoiceRawAfterExactChain, 'duplicate cave choice exact mutation should not rewrite save')
assert.equal(saveRuntime.loadUserSaveSlots(caveUnlockMember).slots[0].raw, caveUnlockRawAfterExactChain, 'duplicate cave unlock exact mutation should not rewrite save')

const runFarmhouseLevelExactMutationRejectionCase = async ({
  caseId,
  failingUsername,
  deleteSelector,
  expectedMessage,
}) => {
  const safeUsername = `qa_lg_${caseId}_s`
  assert.equal((await db.registerUser(failingUsername, 'SmokePass_0525', `${caseId} failing farmhouse member`)).ok, true, `${caseId} failing member should register`)
  assert.equal((await db.registerUser(safeUsername, 'SmokePass_0525', `${caseId} safe farmhouse member`)).ok, true, `${caseId} safe member should register`)
  seedSave(failingUsername)
  seedSave(safeUsername)
  const friendRequest = await socialRuntime.requestFriendship(failingUsername, { target_username: safeUsername })
  await socialRuntime.acceptFriendRequest(safeUsername, friendRequest.id)
  const contractResult = await runtime.createCohabitationContract({
    type: 'business_partner',
    target_usernames: [safeUsername],
    idempotency_key: `qa-${caseId}-farmhouse-reject-contract`,
  }, actor(failingUsername))
  await runtime.acceptCohabitationContract(contractResult.contract.id, actor(safeUsername))
  await runtime.updateCohabitationPermissions(contractResult.contract.id, {
    target_username: failingUsername,
    permissions: {
      fund: {
        spend_large: true,
      },
    },
    idempotency_key: `qa-${caseId}-farmhouse-reject-permission`,
  }, actor(failingUsername))

  const ledgerId = `qa_${caseId}_farmhouse_reject_ledger`
  await injectReadyFamilyBuildingMainStateLedger(contractResult.contract.id, {
    actorUsername: failingUsername,
    ledgerId,
    realBuildRef: `family_building:shared_granary:qa_${caseId}_farmhouse_reject`,
  })

  const preview = await runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    reason: `qa preview ${caseId} farmhouse rejection`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-preview`,
  }, actor(failingUsername))
  const mapping = await runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    manifest_hash: preview.main_state_preview.manifest_hash,
    reason: `qa map ${caseId} farmhouse rejection`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-mapping`,
    mappings: preview.main_state_preview.manifest.map(item => {
      const failing = item.username === failingUsername
      return {
        username: item.username,
        username_key: item.username_key,
        save_slot: item.save_slot,
        save_id: item.save_id,
        real_build_ref: item.real_build_ref,
        candidate_path: failing ? 'home.farmhouseLevel' : 'home.homeRenovationStates',
        binding_ref: `${failing ? 'manual-farmhouse-reject' : 'manual-safe-renovation'}:${item.building_ledger_id}:${item.username_key}`,
        snapshot_hash: item.snapshot_hash,
      }
    }),
  }, actor(failingUsername))
  const guard = await runtime.guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    mapping_manifest_hash: mapping.main_state_mapping.manifest_hash,
    confirmation_text: '确认主状态变更安全阀',
    compensation_plan_acknowledged: true,
    rollback_plan_acknowledged: true,
    reason: `qa guard ${caseId} farmhouse rejection`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-guard`,
  }, actor(failingUsername))
  const mainStateExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    guard_manifest_hash: guard.main_state_mutation_guard.manifest_hash,
    reason: `qa block ${caseId} before exact target`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-main-execute`,
  }, actor(failingUsername))
  const exactTargets = await runtime.bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    guard_manifest_hash: mainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest_hash,
    expected_execution_state: 'blocked_missing_exact_personal_target',
    reason: `qa bind ${caseId} farmhouse reject placeholders`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-exact-targets`,
    targets: mainStateExecute.building_ledger_entry.real_build_demolition_main_state_guard_manifest.map((row, index) => ({
      username: row.username,
      username_key: row.username_key,
      save_slot: row.save_slot,
      save_id: row.save_id,
      real_build_ref: row.real_build_ref,
      candidate_path: row.candidate_path,
      binding_ref: row.binding_ref,
      snapshot_hash: row.snapshot_hash,
      exact_target_ref: `${row.candidate_path}.qa_exact_target_${caseId}_${index}`,
      delete_selector: `${row.candidate_path}.qa_exact_target_${caseId}_${index}`,
      target_kind: row.candidate_path.startsWith('home.') ? 'home' : 'decoration',
    })),
  }, actor(failingUsername))
  const exactExecute = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    exact_target_manifest_hash: exactTargets.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
    expected_execution_state: 'exact_target_bound_pending_execute',
    confirmation_text: '确认精确执行安全阀',
    compensation_plan_acknowledged: true,
    rollback_plan_acknowledged: true,
    reason: `qa execute ${caseId} farmhouse reject placeholders`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-exact-execute`,
  }, actor(failingUsername))
  const resolution = await runtime.resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractResult.contract.id, {
    building_ledger_id: ledgerId,
    exact_target_manifest_hash: exactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
    expected_execution_state: 'blocked_unresolved_exact_target_selector',
    confirmation_text: '确认人工解析精确目标',
    reason: `qa resolve ${caseId} farmhouse rejection`,
    idempotency_key: `qa-${caseId}-farmhouse-reject-resolution`,
    targets: exactExecute.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest.map((item, index) => {
      const failing = item.username === failingUsername
      const resolvedTargetRef = failing ? deleteSelector : 'home.homeRenovationStates.scholar_room'
      return {
        username: item.username,
        username_key: item.username_key,
        save_slot: item.save_slot,
        save_id: item.save_id,
        real_build_ref: item.real_build_ref,
        candidate_path: item.candidate_path,
        binding_ref: item.binding_ref,
        snapshot_hash: item.snapshot_hash,
        exact_target_ref: resolvedTargetRef,
        delete_selector: resolvedTargetRef,
        target_kind: item.target_kind,
        resolution_proof: `qa-${caseId}-farmhouse-reject-proof-${index}`,
      }
    }),
  }, actor(failingUsername))
  const failingRawBeforeMutation = saveRuntime.loadUserSaveSlots(failingUsername).slots[0].raw
  const safeRawBeforeMutation = saveRuntime.loadUserSaveSlots(safeUsername).slots[0].raw
  await assert.rejects(
    () => runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(contractResult.contract.id, {
      building_ledger_id: ledgerId,
      exact_target_manifest_hash: resolution.building_ledger_entry.real_build_demolition_main_state_exact_target_manifest_hash,
      expected_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
      confirmation_text: '确认执行个人主状态变更',
      compensation_plan_acknowledged: true,
      rollback_plan_acknowledged: true,
      reason: `qa reject ${caseId} farmhouse exact mutation`,
      idempotency_key: `qa-${caseId}-farmhouse-reject-mutation`,
    }, actor(failingUsername)),
    error => error?.status === 409 && String(error.message || '').includes(expectedMessage),
    `${caseId} farmhouse exact mutation should reject through real adapter chain`
  )
  assert.equal(saveRuntime.loadUserSaveSlots(failingUsername).slots[0].raw, failingRawBeforeMutation, `${caseId} rejected farmhouse mutation should not rewrite failing save`)
  assert.equal(saveRuntime.loadUserSaveSlots(safeUsername).slots[0].raw, safeRawBeforeMutation, `${caseId} rejected farmhouse mutation should not rewrite safe save`)
  const fundSnapshot = await runtime.getCohabitationFund(contractResult.contract.id, actor(failingUsername))
  const warehouseSnapshot = await runtime.getCohabitationWarehouse(contractResult.contract.id, actor(failingUsername))
  assert.equal(fundSnapshot.fund.balance, 0, `${caseId} rejected farmhouse mutation should not change shared fund`)
  assert.equal(warehouseSnapshot.warehouse.summary.total_quantity, 0, `${caseId} rejected farmhouse mutation should not change shared warehouse`)
}

await runFarmhouseLevelExactMutationRejectionCase({
  caseId: 'cel',
  failingUsername: 'qa_lg_cel_f',
  deleteSelector: 'home.farmhouseLevel.3',
  expectedMessage: '陈酿槽',
})
await runFarmhouseLevelExactMutationRejectionCase({
  caseId: 'ren',
  failingUsername: 'qa_lg_ren_f',
  deleteSelector: 'home.farmhouseLevel.3',
  expectedMessage: '高等级宅院改造',
})
await runFarmhouseLevelExactMutationRejectionCase({
  caseId: 'pet',
  failingUsername: 'qa_lg_pet_f',
  deleteSelector: 'home.farmhouseLevel.2',
  expectedMessage: '宠物数量',
})

const ownerRawAfterExactMutation = saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw
const partnerRawAfterExactMutation = saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw
const cavePartnerRawAfterExactMutation = saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw
const cellarPartnerRawAfterExactMutation = saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw
const duplicateFamilyBuildingRealDemolitionMainStateExactMutation = await runtime.executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(
  largeContract.contract.id,
  mainStateExactMutationPayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactMutation.idempotent, true, 'same main state exact mutation adapter key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateExactMutation.already_mutated, true, 'duplicate main state exact mutation adapter should report already mutated')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawAfterExactMutation, 'duplicate main state exact mutation adapter should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawAfterExactMutation, 'duplicate main state exact mutation adapter should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawAfterExactMutation, 'duplicate main state exact mutation adapter should not rewrite cave partner save')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawAfterExactMutation, 'duplicate main state exact mutation adapter should not rewrite cellar partner save')

const duplicateFamilyBuildingRealDemolitionMainStateMapping = await runtime.verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(
  largeContract.contract.id,
  mainStateMappingPayload,
  actor(largeOwner)
)
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMapping.idempotent, true, 'same main state mapping key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMapping.already_mapped, true, 'duplicate main state mapping should report already mapped')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStateMapping.main_state_mapping.manifest_hash, familyBuildingRealDemolitionMainStateMapping.main_state_mapping.manifest_hash, 'duplicate main state mapping should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawAfterExactMutation, 'duplicate main state mapping should not rewrite owner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawAfterExactMutation, 'duplicate main state mapping should not rewrite partner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawAfterExactMutation, 'duplicate main state mapping should not rewrite cave partner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawAfterExactMutation, 'duplicate main state mapping should not rewrite cellar partner save after exact mutation')

const duplicateFamilyBuildingRealDemolitionMainStatePreview = await runtime.previewCohabitationFamilyBuildingRealDemolitionMainState(largeContract.contract.id, {
  building_ledger_id: largeExecute.building_ledger_entry.id,
  idempotency_key: 'qa-family-building-real-demolition-main-state-preview',
}, actor(largeOwner))
assert.equal(duplicateFamilyBuildingRealDemolitionMainStatePreview.idempotent, true, 'same real demolition main state preview key should be idempotent')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStatePreview.already_previewed, true, 'duplicate main state preview should report already previewed')
assert.equal(duplicateFamilyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest_hash, familyBuildingRealDemolitionMainStatePreview.main_state_preview.manifest_hash, 'duplicate main state preview should keep manifest hash')
assert.equal(saveRuntime.loadUserSaveSlots(largeOwner).slots[0].raw, ownerRawAfterExactMutation, 'duplicate main state preview should not rewrite owner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largePartner).slots[0].raw, partnerRawAfterExactMutation, 'duplicate main state preview should not rewrite partner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largeCavePartner).slots[0].raw, cavePartnerRawAfterExactMutation, 'duplicate main state preview should not rewrite cave partner save after exact mutation')
assert.equal(saveRuntime.loadUserSaveSlots(largeCellarPartner).slots[0].raw, cellarPartnerRawAfterExactMutation, 'duplicate main state preview should not rewrite cellar partner save after exact mutation')

console.log('[qa-cohabitation-contract] OK')
