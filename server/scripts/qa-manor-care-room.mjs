import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-manor-care-room')
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
const runtime = require('../src/taoyuanManorRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const owner = 'care_room_owner_0526'
const visitor = 'care_room_visit_0526'
const overflowVisitor = 'care_room_overflow_0526'

const actor = username => ({
  username,
  displayName: username,
})

const buildSaveData = username => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-05-26T00:00:00.000Z',
  },
  savedAt: '2026-05-26T00:00:00.000Z',
  data: {
    player: {
      playerName: username,
      money: 1000,
    },
    game: {
      year: 1,
      season: 'spring',
      day: 11,
    },
    farm: {
      farmSize: 4,
      plots: [
        {
          id: 0,
          state: 'growing',
          cropId: 'rice',
          watered: false,
          infested: true,
        },
      ],
      fruitTrees: [
        {
          id: 1,
          type: 'peach_tree',
          mature: true,
          todayFruit: true,
        },
      ],
      greenhousePlots: [],
    },
    animal: {
      animals: [
        {
          id: 'cow_1',
          type: 'cow',
          name: '阿牛',
          wasFed: false,
          wasPetted: false,
        },
      ],
      pets: [],
    },
    fishPond: {
      pond: {
        waterQuality: 70,
        fish: [{ id: 'fish_1', itemId: 'carp' }],
      },
    },
    decoration: {
      placed: {
        flower_box: 2,
      },
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

const getGameplayData = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  return decrypted?.data && decrypted.data.player ? decrypted.data : decrypted?.gameplayData
}

const getOwnerManorSaveSnapshot = () => {
  const data = getGameplayData(owner) || {}
  return JSON.stringify({
    farm: data.farm || {},
    animal: data.animal || {},
    fishPond: data.fishPond || {},
    decoration: data.decoration || {},
  })
}

await db.registerUser(owner, 'SmokePass_0526', '护理主人')
await db.registerUser(visitor, 'SmokePass_0526', '护理访客')
await db.registerUser(overflowVisitor, 'SmokePass_0526', '满员访客')
seedSave(owner)
seedSave(visitor)
seedSave(overflowVisitor)
const ownerManorSaveBeforeCareRoom = getOwnerManorSaveSnapshot()

await runtime.updateManorAccessPolicy(owner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'closed',
})

const created = await runtime.createManorCareRoom({
  target_username: owner,
  member_limit: 2,
}, actor(owner))
assert.equal(created.room.member_limit, 2, 'care room should clamp and persist member limit')
assert.equal(created.room.participants.length, 1, 'creator should become first participant')
assert.equal(created.snapshot.care_room_state.active_rooms.length, 1, 'snapshot should expose active care room')
assert.equal(created.snapshot.care_room_state.limits.min_members, 2, 'snapshot should expose min member limit')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'care room creation should not mutate owner manor save data')

await assert.rejects(
  () => runtime.submitManorCareRoomAction(created.room.id, { action_id: 'room_irrigate' }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('至少需要 2 人'),
  'care room action should require at least two members'
)

const joined = await runtime.joinManorCareRoom(created.room.id, actor(visitor))
assert.equal(joined.room.participants.length, 2, 'visitor should join care room')
assert.equal(joined.room.status, 'in_progress', 'care room should enter progress after two members')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'joining care room should not mutate owner manor save data')

await assert.rejects(
  () => runtime.joinManorCareRoom(created.room.id, actor(overflowVisitor)),
  error => error?.status === 409 && String(error.message || '').includes('人数已满'),
  'care room should enforce 2-4 member limit'
)

const outOfOrder = await runtime.submitManorCareRoomAction(joined.room.id, {
  action_id: 'room_feed',
}, actor(visitor))
assert.equal(outOfOrder.action.order_risk, true, 'out-of-order room care action should record risk')
assert.ok(outOfOrder.action.risk_delta > 0, 'out-of-order action should add risk')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'out-of-order care room action should not mutate owner manor save data')

const irrigated = await runtime.submitManorCareRoomAction(joined.room.id, {
  action_id: 'room_irrigate',
}, actor(owner))
assert.equal(irrigated.action.order_risk, false, 'missing first step can still be recovered without extra risk')
assert.equal(irrigated.room.available_action_ids.includes('room_feed'), false, 'completed care room action should not remain available')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'care room action should not mutate owner manor save data')

const settled = await runtime.settleManorCareRoom(joined.room.id, {}, actor(owner))
assert.equal(settled.room.status, 'completed', 'care room should settle to completed')
assert.ok(settled.room.health_score > 0, 'care room settlement should produce health score')
assert.ok(settled.room.settlement_receipt_id, 'care room settlement should expose receipt id')
assert.equal(settled.snapshot.care_room_records[0]?.id, settled.room.id, 'snapshot should expose care room record')
const careRoomActivity = settled.snapshot.visitor_activity_entries[0]
assert.equal(careRoomActivity?.kind, 'care_room', 'visitor activity audit should include care room record')
assert.equal(careRoomActivity?.settlement_receipt_id, settled.room.settlement_receipt_id, 'care room activity should expose receipt id')
assert.equal(careRoomActivity?.health_score, settled.room.health_score, 'care room activity should expose health score')
assert.equal(careRoomActivity?.health_delta, settled.room.health_delta, 'care room activity should expose health delta')
assert.equal(careRoomActivity?.risk_score, settled.room.risk_score, 'care room activity should expose risk score')
assert.equal(careRoomActivity?.order_risk_count, 1, 'care room activity should expose order risk count')
assert.equal(careRoomActivity?.role_mismatch_count, 0, 'care room activity should expose role mismatch count')
assert.equal(careRoomActivity?.participant_count, settled.room.participants.length, 'care room activity should expose participant count')
assert.deepEqual(careRoomActivity?.participant_usernames, settled.room.participants.map(participant => participant.username), 'care room activity should expose participant usernames')
assert.equal(careRoomActivity?.action_count, settled.room.actions.length, 'care room activity should expose action count')
assert.equal(careRoomActivity?.action_progress, '2/4', 'care room activity should expose action progress')
assert.deepEqual(careRoomActivity?.completed_action_ids, settled.room.actions.map(action => action.action_id), 'care room activity should expose completed actions')
assert.equal(careRoomActivity?.action_details?.[0]?.action_id, 'room_feed', 'care room activity should expose action detail order')
assert.equal(careRoomActivity?.action_details?.[0]?.order_risk, true, 'care room activity should expose action risk detail')
assert.equal(careRoomActivity?.action_details?.[1]?.action_id, 'room_irrigate', 'care room activity should expose recovered action detail')
assert.equal(careRoomActivity?.window_started_at, settled.room.window_started_at, 'care room activity should expose window start')
assert.equal(careRoomActivity?.window_ends_at, settled.room.window_ends_at, 'care room activity should expose window end')
assert.equal(careRoomActivity?.window_seconds, 1800, 'care room activity should expose care room window seconds')
assert.equal(careRoomActivity?.settled_by, owner, 'care room activity should expose settlement actor')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'care room settlement should not mutate owner manor save data')

const duplicateSettle = await runtime.settleManorCareRoom(joined.room.id, {}, actor(owner))
assert.equal(duplicateSettle.idempotent, true, 'completed care room settlement should be idempotent')
assert.equal(duplicateSettle.room.settlement_receipt_id, settled.room.settlement_receipt_id, 'duplicate settlement should keep receipt id')
assert.equal(getOwnerManorSaveSnapshot(), ownerManorSaveBeforeCareRoom, 'duplicate care room settlement should keep owner manor save data unchanged')

console.log('[qa-manor-care-room] OK')
