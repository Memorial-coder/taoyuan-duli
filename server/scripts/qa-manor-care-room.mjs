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

await db.registerUser(owner, 'SmokePass_0526', '护理主人')
await db.registerUser(visitor, 'SmokePass_0526', '护理访客')
await db.registerUser(overflowVisitor, 'SmokePass_0526', '满员访客')
seedSave(owner)
seedSave(visitor)
seedSave(overflowVisitor)

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

await assert.rejects(
  () => runtime.submitManorCareRoomAction(created.room.id, { action_id: 'room_irrigate' }, actor(owner)),
  error => error?.status === 409 && String(error.message || '').includes('至少需要 2 人'),
  'care room action should require at least two members'
)

const joined = await runtime.joinManorCareRoom(created.room.id, actor(visitor))
assert.equal(joined.room.participants.length, 2, 'visitor should join care room')
assert.equal(joined.room.status, 'in_progress', 'care room should enter progress after two members')

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

const irrigated = await runtime.submitManorCareRoomAction(joined.room.id, {
  action_id: 'room_irrigate',
}, actor(owner))
assert.equal(irrigated.action.order_risk, false, 'missing first step can still be recovered without extra risk')
assert.equal(irrigated.room.available_action_ids.includes('room_feed'), false, 'completed care room action should not remain available')

const settled = await runtime.settleManorCareRoom(joined.room.id, {}, actor(owner))
assert.equal(settled.room.status, 'completed', 'care room should settle to completed')
assert.ok(settled.room.health_score > 0, 'care room settlement should produce health score')
assert.ok(settled.room.settlement_receipt_id, 'care room settlement should expose receipt id')
assert.equal(settled.snapshot.care_room_records[0]?.id, settled.room.id, 'snapshot should expose care room record')
assert.equal(settled.snapshot.visitor_activity_entries[0]?.kind, 'care_room', 'visitor activity audit should include care room record')

const duplicateSettle = await runtime.settleManorCareRoom(joined.room.id, {}, actor(owner))
assert.equal(duplicateSettle.idempotent, true, 'completed care room settlement should be idempotent')
assert.equal(duplicateSettle.room.settlement_receipt_id, settled.room.settlement_receipt_id, 'duplicate settlement should keep receipt id')

console.log('[qa-manor-care-room] OK')
