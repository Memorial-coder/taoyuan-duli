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
      plots: [],
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

const previewResult = await runtime.createSeparationPreview(created.contract.id, {
  reason: 'qa preview',
}, actor(owner))
assert.equal(previewResult.preview.requires_both_confirm, true, 'separation preview should require both confirmations')
assert.match(previewResult.preview.asset_return.personal_money_policy, /个人铜币/, 'preview should preserve personal money boundary')
assert.equal(previewResult.contract.status, 'active', 'preview should not execute separation')
assert.ok(previewResult.contract.audit_log.find(entry => entry.action === 'separation_preview_created'), 'preview should be audited')

console.log('[qa-cohabitation-contract] OK')
