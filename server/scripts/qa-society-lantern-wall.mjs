import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-society-lantern-wall')
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

const owner = 'lantern_owner_0529'
const friend = 'lantern_friend_0529'

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

const getGameplayData = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  if (decrypted?.data?.player) return decrypted.data
  if (decrypted?.gameplayData?.player) return decrypted.gameplayData
  if (decrypted?.player) return decrypted
  return {}
}

const getMoney = username => Number(getGameplayData(username)?.player?.money || 0)

const getInventorySnapshot = username => {
  const inventory = getGameplayData(username)?.inventory || {}
  return JSON.stringify({
    items: Array.isArray(inventory.items) ? inventory.items : [],
    tempItems: Array.isArray(inventory.tempItems) ? inventory.tempItems : [],
  })
}

const findLanternProject = society => (society.public_projects || [])
  .find(entry => entry.id === 'lantern_wall')

const findLanternVisual = society => (society.visual_state?.async_projects || [])
  .find(entry => entry.id === 'lantern_wall')

const assertIncludes = (values, expected, message) => {
  assert.ok(values.includes(expected), `${message}: missing ${expected}`)
}

for (const username of [owner, friend]) {
  const registered = await db.registerUser(username, 'SmokePass_0529', username)
  assert.equal(registered.ok, true, `${username} should register for lantern wall QA`)
  seedSave(username)
}

const created = await runtime.createSociety({
  name: 'Lantern Wall QA',
  summary: 'Lantern wall completion QA',
  visibility: 'public',
  capacity: 8,
  join_requirement_id: 'open',
}, actor(owner))
assert.equal(created.society.name, 'Lantern Wall QA', 'society should be created before lantern wall QA')

const join = await runtime.applyToSociety(friend, created.society.id)
assert.equal(join.request.status, 'pending', 'friend application should be pending before owner accepts')
const accepted = await runtime.respondSocietyRequest(join.request.id, 'accept', actor(owner))
assert.equal(accepted.request.status, 'accepted', 'owner should accept friend into society')

const ownerInitialInventory = getInventorySnapshot(owner)
const friendInitialInventory = getInventorySnapshot(friend)
assert.equal(getMoney(owner), 100, 'owner should start with seeded money')
assert.equal(getMoney(friend), 100, 'friend should start with seeded money')

await runtime.contributeSocietyPublicProject('lantern_wall', {
  package_id: 'lantern_wall_wish',
}, actor(owner))
await runtime.contributeSocietyPublicProject('lantern_wall', {
  package_id: 'lantern_wall_message',
}, actor(friend))
await runtime.contributeSocietyPublicProject('lantern_wall', {
  package_id: 'lantern_wall_hang',
}, actor(owner))
await runtime.contributeSocietyPublicProject('lantern_wall', {
  package_id: 'lantern_wall_repair',
}, actor(friend))
const completed = await runtime.contributeSocietyPublicProject('lantern_wall', {
  package_id: 'lantern_wall_gift',
}, actor(owner))

assert.equal(completed.player_money, 79, 'completion contribution should deduct only owner configured money costs')
assert.equal(getMoney(owner), 79, 'owner should pay only wish, hang and gift costs')
assert.equal(getMoney(friend), 100, 'friend no-cost message and repair should not alter personal money')
assert.equal(getInventorySnapshot(owner), ownerInitialInventory, 'owner should not receive personal inventory reward')
assert.equal(getInventorySnapshot(friend), friendInitialInventory, 'friend should not receive personal inventory reward')

const completedProject = completed.project
assert.equal(completedProject.status, 'completed', 'lantern wall project should complete at 100 progress')
assert.equal(completedProject.progress, 100, 'lantern wall should clamp progress to target')
assert.equal(completedProject.can_contribute, false, 'completed lantern wall should close contribution options')
assert.ok(completedProject.progress_note, 'completion note should expose readable completion feedback')
assert.ok(Number(completedProject.completed_at) > 0, 'completed project should expose completion timestamp')

const rewardIds = completedProject.completion_rewards.map(entry => entry.id)
assertIncludes(rewardIds, 'lantern_wall_memorial', 'completion rewards should include memorial')
assertIncludes(rewardIds, 'lantern_wall_blessing_book', 'completion rewards should include blessing book')
assert.ok(
  completedProject.completion_rewards.every(entry => entry.active === true && entry.kind === 'memorial'),
  'lantern wall completion rewards should be active memorial-only readback'
)
assert.deepEqual(
  completedProject.recent_contributions.map(entry => entry.package_id).sort(),
  [
    'lantern_wall_gift',
    'lantern_wall_hang',
    'lantern_wall_message',
    'lantern_wall_repair',
    'lantern_wall_wish',
  ].sort(),
  'all five lantern wall contribution packages should be retained in project history'
)

assert.equal(completed.society.visual_state.board_type, 'async', 'society visual state should stay on async board')
const lanternVisual = findLanternVisual(completed.society)
assert.ok(lanternVisual, 'visual state should include lantern wall async project')
assert.equal(lanternVisual.kind, 'lantern_wall', 'lantern wall visual project should expose dedicated kind')
assert.equal(lanternVisual.current_stage_id, 'lantern_wall_memorial', 'completed lantern wall should settle on memorial stage')
assert.ok(lanternVisual.stages.every(stage => stage.state === 'complete'), 'all lantern wall stages should be complete')

const memorialStage = lanternVisual.stages.find(stage => stage.id === 'lantern_wall_memorial')
assert.ok(memorialStage, 'memorial stage should be present in visual readback')
for (const objectId of [
  'lantern_wall_friend_notes',
  'lantern_wall_memorial_spot',
  'lantern_wall_friend_messages',
  'lantern_wall_wish_archive',
]) {
  assertIncludes(memorialStage.object_ids, objectId, 'memorial stage should expose friend blessing objects')
}

const contributorNames = lanternVisual.contributors.map(entry => entry.username)
assertIncludes(contributorNames, owner, 'visual contributors should include owner')
assertIncludes(contributorNames, friend, 'visual contributors should include friend')
assert.equal(
  lanternVisual.contributors.reduce((sum, entry) => sum + entry.contribution_value, 0),
  100,
  'visual contributors should sum to completed progress'
)
assert.ok(
  lanternVisual.history.some(entry => entry.type === 'stage_complete' && entry.summary),
  'visual history should include a readable completion event'
)
assert.ok(
  completed.society.visual_state.highlights.some(entry => entry.visual_id === 'lantern_wall' && entry.type === 'success' && entry.label),
  'visual highlights should include lantern wall completion success readback'
)

const chronicleProject = findLanternProject(completed.society.chronicle)
assert.ok(chronicleProject, 'chronicle should include lantern wall project')
assert.equal(chronicleProject.status, 'completed', 'chronicle should mark lantern wall completed')
assertIncludes(
  chronicleProject.completion_rewards.map(entry => entry.id),
  'lantern_wall_blessing_book',
  'chronicle should retain blessing book reward'
)
assert.ok(
  completed.society.chronicle.timeline.some(entry => entry.id === 'project_complete:lantern_wall' && entry.summary),
  'chronicle timeline should retain lantern wall completion event'
)
assert.ok(
  completed.society.activity_log.some(entry => entry.type === 'public_project_complete' && entry.message),
  'society activity log should include public project completion'
)

const readback = await runtime.listSocietyOverview(owner)
const readbackProject = findLanternProject(readback.my_society || {})
assert.equal(readbackProject?.status, 'completed', 'overview readback should persist completed lantern wall')
assertIncludes(
  (readbackProject?.completion_rewards || []).map(entry => entry.id),
  'lantern_wall_memorial',
  'overview readback should persist memorial reward'
)
assert.ok(
  findLanternVisual(readback.my_society || {})?.history.some(entry => entry.type === 'stage_complete'),
  'overview readback should persist completion history'
)

const ownerMoneyBeforeRejectedContribution = getMoney(owner)
await assert.rejects(
  () => runtime.contributeSocietyPublicProject('lantern_wall', {
    package_id: 'lantern_wall_wish',
  }, actor(owner)),
  error => error?.status === 400,
  'completed lantern wall should reject further contribution'
)
assert.equal(
  getMoney(owner),
  ownerMoneyBeforeRejectedContribution,
  'rejected completed contribution should not deduct money'
)
assert.equal(getInventorySnapshot(owner), ownerInitialInventory, 'rejected completed contribution should not mutate inventory')

console.log('[qa-society-lantern-wall] OK')
