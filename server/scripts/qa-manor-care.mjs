import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-manor-care')
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

const owner = 'manor_owner_0523'
const visitor = 'manor_visit_0523'

const actor = username => ({
  username,
  displayName: username,
})

const buildSaveData = username => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-05-23T00:00:00.000Z',
  },
  savedAt: '2026-05-23T00:00:00.000Z',
  data: {
    player: {
      playerName: username,
      money: 1000,
    },
    game: {
      year: 1,
      season: 'spring',
      day: 8,
    },
    farm: {
      farmSize: 4,
      plots: [
        {
          id: 0,
          state: 'growing',
          cropId: 'rice',
          growthDays: 2,
          watered: false,
          unwateredDays: 1,
          fertilizer: null,
          harvestCount: 0,
          giantCropGroup: null,
          seedGenetics: null,
          infested: true,
          infestedDays: 1,
          weedy: true,
          weedyDays: 1,
        },
      ],
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
    },
    animal: {
      animals: [
        {
          id: 'cow_1',
          type: 'cow',
          name: '阿牛',
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
          name: '阿黄',
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

await db.registerUser(owner, 'SmokePass_0523', '庄园主人')
await db.registerUser(visitor, 'SmokePass_0523', '照料访客')
seedSave(owner)
seedSave(visitor)

await runtime.updateManorAccessPolicy(owner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'closed',
})

const snapshot = await runtime.getPublicManorSnapshot(owner, visitor)
assert.equal(snapshot.visual_state.board_type, 'scene', 'manor care should use scene visual state')
assert.equal(snapshot.visual_state.objects.length, 6, 'manor care should expose six care objects')
assert.ok(snapshot.visual_state.objects.find(object => object.id === 'manor_field')?.available_action_ids.includes('water_field'), 'field should expose watering action')
assert.ok(snapshot.visual_state.objects.find(object => object.id === 'manor_field')?.available_action_ids.includes('cure_pests'), 'field should expose pest action')
assert.ok(snapshot.visual_state.objects.find(object => object.id === 'manor_animal_shed')?.available_action_ids.includes('feed_animals'), 'animal shed should expose feeding action')
assert.equal(snapshot.care_state.remaining_care_count, 4, 'visitor should start with four care actions')

const firstCare = await runtime.submitManorCareAction({
  target_username: owner,
  object_id: 'manor_field',
  action_id: 'water_field',
}, actor(visitor))
assert.equal(firstCare.entry.action_id, 'water_field', 'care action should be recorded')
assert.equal(firstCare.snapshot.visual_state.revision, 1, 'visual revision should advance after care')
assert.equal(firstCare.snapshot.care_entries[0]?.visitor_username, visitor, 'owner log should include visitor')
assert.equal(firstCare.snapshot.care_state.remaining_care_count, 3, 'care limit should decrement')

const duplicateCare = await runtime.submitManorCareAction({
  target_username: owner,
  object_id: 'manor_field',
  action_id: 'water_field',
}, actor(visitor))
assert.equal(duplicateCare.idempotent, true, 'duplicate care should be idempotent')
assert.equal(duplicateCare.entry.id, firstCare.entry.id, 'duplicate care should return original entry')
assert.equal(duplicateCare.snapshot.care_state.remaining_care_count, 3, 'duplicate care should not consume another count')

await runtime.submitManorCareAction({ target_username: owner, object_id: 'manor_field', action_id: 'cure_pests' }, actor(visitor))
await runtime.submitManorCareAction({ target_username: owner, object_id: 'manor_field', action_id: 'clear_weeds' }, actor(visitor))
await runtime.submitManorCareAction({ target_username: owner, object_id: 'manor_animal_shed', action_id: 'feed_animals' }, actor(visitor))

await assert.rejects(
  () => runtime.submitManorCareAction({ target_username: owner, object_id: 'manor_animal_shed', action_id: 'soothe_animals' }, actor(visitor)),
  error => error?.status === 429 && String(error.message || '').includes('次数'),
  'visitor daily care limit should reject the fifth action'
)

await runtime.updateManorAccessPolicy(owner, {
  visit_mode: 'public',
  care_mode: 'closed',
  steal_mode: 'closed',
})
await assert.rejects(
  () => runtime.submitManorCareAction({ target_username: owner, object_id: 'manor_fish_pond', action_id: 'clean_pond' }, actor(visitor)),
  error => error?.status === 403 && String(error.message || '').includes('关闭'),
  'closed care policy should reject care writes'
)

console.log('[qa-manor-care] OK')
