import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-manor-steal')
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

const owner = 'steal_owner_0523'
const visitor = 'steal_visit_0523'

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
          state: 'harvestable',
          cropId: 'rice',
          watered: true,
          harvestCount: 0,
        },
        {
          id: 1,
          state: 'harvestable',
          cropId: 'quest_lotus',
          questItem: true,
          watered: true,
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
      animals: [],
      pets: [],
    },
    fishPond: {
      pond: {
        waterQuality: 100,
        fish: [],
      },
    },
    decoration: {
      placed: {
        flower_box: 1,
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

await db.registerUser(owner, 'SmokePass_0523', '偷菜主人')
await db.registerUser(visitor, 'SmokePass_0523', '偷菜访客')
seedSave(owner)
seedSave(visitor)

await runtime.updateManorAccessPolicy(owner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'public',
})

const snapshot = await runtime.getPublicManorSnapshot(owner, visitor)
assert.equal(snapshot.steal_state.can_steal, true, 'public steal policy should allow visitor')
assert.equal(snapshot.steal_state.remaining_steal_count, 2, 'visitor should start with two steal actions')
assert.ok(snapshot.visual_state.objects.find(object => object.id === 'manor_field')?.available_action_ids.includes('steal_plot_sample'), 'field should expose safe plot steal')
assert.ok(snapshot.visual_state.objects.find(object => object.id === 'manor_fruit_grove')?.available_action_ids.includes('steal_fruit_sample'), 'fruit grove should expose fruit steal')
assert.ok(snapshot.steal_state.whitelist_summary.includes('用途标签'), 'steal whitelist should mention use tags')
assert.ok(snapshot.steal_state.target_use_hints?.['plot:0']?.use_tags?.includes('festival'), 'rice steal target should expose festival use tag')
assert.match(snapshot.steal_state.target_use_hints?.['edge:manor_bundle']?.use_summary || '', /公共订单/, 'edge steal target should expose secondary use summary')

const firstSteal = await runtime.submitManorStealAction({
  target_username: owner,
  object_id: 'manor_field',
  action_id: 'steal_plot_sample',
  target_id: 'plot:0',
  note: '留个字条',
}, actor(visitor))
assert.equal(firstSteal.entry.item_id, 'rice', 'safe ordinary crop should be recorded')
assert.equal(firstSteal.entry.quantity, 1, 'steal should only grant a small quantity record')
assert.ok(firstSteal.entry.use_tags.includes('order'), 'steal entry should record crop use tags')
assert.match(firstSteal.entry.use_summary, /公共订单/, 'steal entry should record crop use summary')
assert.match(firstSteal.entry.owner_compensation, /主人获得/, 'owner compensation should be recorded')
assert.equal(firstSteal.snapshot.steal_entries[0]?.visitor_username, visitor, 'owner log should include visitor')
assert.equal(firstSteal.snapshot.steal_state.remaining_steal_count, 1, 'steal limit should decrement')

const duplicateSteal = await runtime.submitManorStealAction({
  target_username: owner,
  object_id: 'manor_field',
  action_id: 'steal_plot_sample',
  target_id: 'plot:0',
}, actor(visitor))
assert.equal(duplicateSteal.idempotent, true, 'duplicate steal should be idempotent')
assert.equal(duplicateSteal.entry.id, firstSteal.entry.id, 'duplicate steal should return original entry')
assert.equal(duplicateSteal.snapshot.steal_state.remaining_steal_count, 1, 'duplicate steal should not consume another count')

await assert.rejects(
  () => runtime.submitManorStealAction({
    target_username: owner,
    object_id: 'manor_field',
    action_id: 'steal_plot_sample',
    target_id: 'plot:1',
  }, actor(visitor)),
  error => error?.status === 409 && String(error.message || '').includes('白名单'),
  'quest or unsafe crop should not be stealable'
)

await runtime.submitManorStealAction({
  target_username: owner,
  object_id: 'manor_fruit_grove',
  action_id: 'steal_fruit_sample',
  target_id: 'fruit:1',
}, actor(visitor))

await assert.rejects(
  () => runtime.submitManorStealAction({
    target_username: owner,
    object_id: 'manor_flower_bed',
    action_id: 'steal_edge_bundle',
  }, actor(visitor)),
  error => error?.status === 429 && String(error.message || '').includes('次数'),
  'visitor daily steal limit should reject the third action'
)

await runtime.updateManorAccessPolicy(owner, {
  visit_mode: 'public',
  care_mode: 'public',
  steal_mode: 'closed',
})
await assert.rejects(
  () => runtime.submitManorStealAction({
    target_username: owner,
    object_id: 'manor_flower_bed',
    action_id: 'steal_edge_bundle',
  }, actor(visitor)),
  error => error?.status === 403 && String(error.message || '').includes('关闭'),
  'closed steal policy should reject steal writes'
)

console.log('[qa-manor-steal] OK')
