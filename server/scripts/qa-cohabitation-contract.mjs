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

await db.registerUser(owner, 'SmokePass_0524', '同居主人')
await db.registerUser(partner, 'SmokePass_0524', '同居伙伴')
await db.registerUser(extra, 'SmokePass_0524', '同居额外成员')
seedSave(owner)
seedSave(partner)
seedSave(extra)

const partnerRequest = await socialRuntime.requestFriendship(owner, { target_username: partner })
await socialRuntime.acceptFriendRequest(partner, partnerRequest.id)
const extraRequest = await socialRuntime.requestFriendship(owner, { target_username: extra })
await socialRuntime.acceptFriendRequest(extra, extraRequest.id)

const overview = await runtime.listCohabitationContracts(owner)
assert.ok(overview.relation_options.find(option => option.id === 'lover_cohabitation'), 'relation options should expose lover contract type')
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

await assert.rejects(
  () => runtime.getCohabitationSharedMap(created.contract.id, actor(extra)),
  error => error?.status === 403 && String(error.message || '').includes('不在这份契约'),
  'non-members should not read a shared farm map'
)

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

const previewResult = await runtime.createSeparationPreview(created.contract.id, {
  reason: 'qa preview',
}, actor(owner))
assert.equal(previewResult.preview.requires_both_confirm, true, 'separation preview should require both confirmations')
assert.match(previewResult.preview.asset_return.personal_money_policy, /个人铜币/, 'preview should preserve personal money boundary')
assert.equal(previewResult.contract.status, 'active', 'preview should not execute separation')
assert.ok(previewResult.contract.audit_log.find(entry => entry.action === 'separation_preview_created'), 'preview should be audited')

console.log('[qa-cohabitation-contract] OK')
