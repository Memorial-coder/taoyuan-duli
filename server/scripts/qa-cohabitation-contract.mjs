import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-cohabitation-contract')
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
const socialRuntime = require('../src/taoyuanSocialRuntime')
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
      items: username === owner
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

const initialFundResult = await runtime.getCohabitationFund(created.contract.id, actor(owner))
assert.equal(initialFundResult.fund.balance, 0, 'fresh shared fund should have zero balance')
assert.equal(initialFundResult.fund.summary.personal_money_merged, false, 'shared fund must not merge personal money')
assert.equal(initialFundResult.fund.summary.contribution_enabled, true, 'active members should be able to contribute to fund')
assert.equal(initialFundResult.fund.summary.spend_enabled, false, 'fund spending should stay disabled in the first pass')
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
assert.equal((await runtime.getCohabitationFund(created.contract.id, actor(owner))).fund.balance, 200, 'failed fund contribution should not change balance')

await assert.rejects(
  () => runtime.contributeCohabitationFund(created.contract.id, {
    amount: 1,
  }, actor(owner)),
  error => error?.status === 400 && String(error.message || '').includes('idempotency_key'),
  'fund contribution should require an idempotency key'
)

const partnerWarehouseRead = await runtime.getCohabitationWarehouse(created.contract.id, actor(partner))
assert.equal(partnerWarehouseRead.warehouse.items.find(item => item.item_id === 'rice')?.quantity, 2, 'partner should read shared warehouse stock')

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
  () => runtime.contributeCohabitationFund(created.contract.id, {
    amount: 1,
    idempotency_key: 'qa-non-member-fund-contribution',
  }, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not contribute to a cohabitation fund'
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
assert.equal(getInventoryItemQuantity(owner, 'rice'), 4, 'failed warehouse deposit should not deduct inventory')

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
  () => runtime.depositCohabitationWarehouseItem(created.contract.id, {
    item_id: 'lotus',
    quantity: 1,
    quality: 'fine',
    idempotency_key: 'qa-high-quality-lotus',
  }, actor(partner)),
  error => error?.status === 403 && String(error.message || '').includes('普通品质'),
  'warehouse deposit should reject high quality items in the first pass'
)

const permissionUpdate = await runtime.updateCohabitationPermissions(created.contract.id, {
  target_username: partner,
  permissions: {
    storage: {
      deposit: false,
      withdraw_rare: true,
    },
    fund: {
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
assert.equal(updatedPartnerPermissions.storage.withdraw_rare, true, 'permissions update should allow explicit storage permission flags')
assert.equal(updatedPartnerPermissions.fund.spend_large, true, 'permissions update should allow explicit fund permission flags')
assert.equal(updatedPartnerPermissions.confirmations.large_fund_spend_requires_both, true, 'permissions safety rail should keep large fund confirmation enabled')
assert.ok(permissionUpdate.changed_fields.some(field => field.group === 'storage' && field.key === 'deposit' && field.after === false), 'permissions update should report changed storage deposit field')
assert.ok(permissionUpdate.contract.audit_log.find(entry => entry.action === 'permissions_updated'), 'permissions update should be audited')

const duplicatePermissionUpdate = await runtime.updateCohabitationPermissions(created.contract.id, {
  target_username: partner,
  permissions: {
    storage: {
      deposit: false,
      withdraw_rare: true,
    },
    fund: {
      spend_large: true,
    },
  },
  idempotency_key: 'qa-permission-update-partner',
}, actor(owner))
assert.equal(duplicatePermissionUpdate.idempotent, true, 'same permissions update idempotency key should be idempotent')

const partnerPermissionsRead = await runtime.getCohabitationPermissions(created.contract.id, actor(partner))
assert.equal(partnerPermissionsRead.permissions_panel.editable_by_actor, false, 'partner should read permissions without edit capability')
assert.equal(partnerPermissionsRead.permissions_panel.members.find(member => member.username === partner)?.permissions.storage.deposit, false, 'partner should see updated own permissions')

const offlineStatus = await runtime.getCohabitationOfflineStatus(created.contract.id, actor(owner))
assert.equal(offlineStatus.offline_status.summary.server_authoritative, true, 'offline status should be server authoritative')
assert.equal(offlineStatus.offline_status.summary.member_online_required, false, 'offline status should not require all members online')
assert.equal(offlineStatus.offline_status.summary.offline_member_blocks_operations, false, 'offline members should not block operations')
assert.equal(offlineStatus.offline_status.summary.independent_operations_enabled, true, 'active members should be able to operate independently')
assert.equal(offlineStatus.offline_status.summary.auto_offline_income_enabled, false, 'first pass should not enable offline auto income')
assert.ok(offlineStatus.offline_status.members.find(member => member.username === owner)?.last_active_at > 0, 'offline status should expose owner last active time')
assert.ok(offlineStatus.offline_status.members.find(member => member.username === partner)?.last_active_at > 0, 'offline status should expose partner last active time')
assert.ok(offlineStatus.offline_status.recent_shared_log.some(entry => entry.action === 'permissions_updated'), 'offline status should expose recent shared log')
assert.equal(offlineStatus.offline_status.actor_capabilities.deposit_warehouse, true, 'owner should still be able to deposit while partner is not required online')
assert.equal(offlineStatus.offline_status.actor_capabilities.manage_permissions, true, 'owner should retain permission management capability')

const partnerOfflineStatus = await runtime.getCohabitationOfflineStatus(created.contract.id, actor(partner))
assert.equal(partnerOfflineStatus.offline_status.actor_capabilities.deposit_warehouse, false, 'offline status should reflect updated partner warehouse permission')
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

const loverFamilyFestivalSeats = await runtime.getCohabitationFamilyFestivalSeats(created.contract.id, actor(owner))
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.festival_seats_enabled, false, 'romance contracts should return a disabled family festival seat panel')
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.write_enabled, false, 'disabled family festival seat panel should not expose writes')
assert.equal(loverFamilyFestivalSeats.family_festival_seats_panel.summary.preview_seat_count, 0, 'disabled family festival seat panel should not expose seats')
assert.match(loverFamilyFestivalSeats.family_festival_seats_panel.summary.disabled_reason, /结拜庄园和合伙庄园/, 'disabled festival seat panel should explain family manor requirement')

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
assert.equal(repeatedFamilyOrdersRead.contract.audit_log.length, familyOrdersRead.contract.audit_log.length, 'family order reads should not append audit entries')
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeFamilyOrders, 'family order panel should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeFamilyOrders, 'family order panel should not rewrite partner save')
assert.equal(saveRuntime.loadUserSaveSlots(extra).slots[0].raw, extraRawBeforeFamilyOrders, 'family order panel should not rewrite extra save')

const partnerTeaBeforeFamilyDeposit = getInventoryItemQuantity(partner, 'tea')
const familyWarehouseBeforeDeposit = await runtime.getCohabitationWarehouse(familyContract.contract.id, actor(partner))
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.family_manor_warehouse, true, 'family warehouse snapshot should mark family manor mode')
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.role_based_storage_permissions, true, 'family warehouse should use role-based storage permissions')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.actor.manor_role, 'storage_keeper', 'family warehouse actor should expose storage keeper role')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.actor.manor_role_label, '管仓', 'family warehouse actor should expose role label')
assert.equal(familyWarehouseBeforeDeposit.warehouse.permissions.can_withdraw_common, true, 'storage keeper should expose common withdrawal permission preview')
assert.equal(familyWarehouseBeforeDeposit.warehouse.summary.withdraw_enabled, false, 'family warehouse should keep real withdrawal disabled')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.members.find(member => member.username === partner)?.storage_permissions.can_withdraw_common_preview, true, 'storage keeper should preview common withdrawal permission')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.members.find(member => member.username === extra)?.storage_permissions.can_withdraw_common_preview, false, 'farm steward should not preview common withdrawal permission')
assert.equal(familyWarehouseBeforeDeposit.warehouse.family_warehouse.governance.withdraw_flow_enabled, false, 'family warehouse should keep withdraw flow disabled in first pass')
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
assert.ok(previewResult.preview.asset_return.plots_by_origin_owner.some(item => item.origin_owner_username === owner && item.plot_count === 16), 'separation preview should include owner plot return group')
assert.ok(previewResult.preview.asset_return.plots_by_origin_owner.some(item => item.origin_owner_username === partner && item.plot_count === 16), 'separation preview should include partner plot return group')
assert.ok(previewResult.preview.asset_return.warehouse_items_by_origin_owner.some(item => item.item_id === 'rice' && item.quantity === 2), 'separation preview should include warehouse item source summary')
assert.equal(previewResult.preview.asset_return.fund_balance, 200, 'separation preview should include current fund balance')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === owner && item.amount === 120), 'separation preview should include owner fund contribution source summary')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === partner && item.amount === 80), 'separation preview should include partner fund contribution source summary')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === owner && item.suggested_refund_amount === 120), 'separation preview should suggest owner fund refund by contribution share')
assert.ok(previewResult.preview.asset_return.fund_contributions_by_origin_owner.some(item => item.origin_owner_username === partner && item.suggested_refund_amount === 80), 'separation preview should suggest partner fund refund by contribution share')
assert.equal(previewResult.preview.asset_return.fund_suggested_refund_total, 200, 'separation preview should balance suggested fund refunds')
assert.ok(previewResult.preview.compensation_plan.some(item => item.id === 'plots_return_by_origin'), 'separation preview should include plot return compensation plan')
assert.ok(previewResult.preview.compensation_plan.some(item => item.id === 'warehouse_manual_return'), 'separation preview should include warehouse manual return plan')
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
assert.equal(saveRuntime.loadUserSaveSlots(owner).slots[0].raw, ownerRawBeforeDuplicatePreview, 'idempotent separation preview should not rewrite owner save')
assert.equal(saveRuntime.loadUserSaveSlots(partner).slots[0].raw, partnerRawBeforeDuplicatePreview, 'idempotent separation preview should not rewrite partner save')

console.log('[qa-cohabitation-contract] OK')
