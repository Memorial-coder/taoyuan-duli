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

const getGameplayData = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  return decrypted?.data && decrypted.data.player ? decrypted.data : decrypted?.gameplayData
}

const getOwnerFarmSnapshot = () => JSON.stringify(getGameplayData(owner)?.farm || {})

await db.registerUser(owner, 'SmokePass_0523', '偷菜主人')
await db.registerUser(visitor, 'SmokePass_0523', '偷菜访客')
seedSave(owner)
seedSave(visitor)
const ownerFarmBeforeSteal = getOwnerFarmSnapshot()

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
assert.equal(snapshot.steal_state.audit.whitelist_enforced, true, 'steal audit should expose whitelist enforcement')
assert.match(snapshot.steal_state.audit.reward_cap_summary, /每位访客每日 2 次/, 'steal audit should expose daily reward cap')
assert.equal(snapshot.steal_state.audit.owner_reserved_percent, 100, 'steal audit should preserve owner output')
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
assert.equal(firstSteal.entry.visitor_reward_quantity, 1, 'steal receipt should cap visitor reward quantity')
assert.equal(firstSteal.entry.visitor_reward_quantity_cap, 1, 'steal receipt should expose reward quantity cap')
assert.equal(firstSteal.entry.owner_reserved_percent, 100, 'steal receipt should expose owner reserved percent')
assert.equal(getOwnerFarmSnapshot(), ownerFarmBeforeSteal, 'steal should not mutate owner farm save data')
assert.equal(firstSteal.entry.visitor_daily_count, 1, 'steal receipt should expose visitor daily count after action')
assert.equal(firstSteal.entry.visitor_daily_limit, 2, 'steal receipt should expose visitor daily limit')
assert.equal(firstSteal.entry.visitor_daily_remaining, 1, 'steal receipt should expose visitor daily remaining count')
assert.equal(firstSteal.entry.manor_daily_count, 1, 'steal receipt should expose manor daily count after action')
assert.equal(firstSteal.entry.manor_daily_limit, 6, 'steal receipt should expose manor daily limit')
assert.equal(firstSteal.entry.object_daily_count, 1, 'steal receipt should expose object daily count after action')
assert.equal(firstSteal.entry.object_daily_limit, 1, 'steal receipt should expose object daily limit')
assert.equal(firstSteal.entry.recent_window_seconds, 600, 'steal receipt should expose anti-abuse window seconds')
assert.ok(firstSteal.entry.recent_window_count >= 1, 'steal receipt should count current action in anti-abuse window')
assert.equal(firstSteal.entry.owner_reserved_ratio, 1, 'steal receipt should not deduct owner inventory')
assert.ok(firstSteal.entry.risk_flags.includes('object_daily_limit_reached'), 'steal receipt should flag object daily cap after first action')
assert.match(firstSteal.entry.anti_abuse_summary, /反刷窗口 10 分钟内 1 次/, 'steal receipt should expose anti-abuse summary')
assert.equal(firstSteal.snapshot.steal_entries[0]?.anti_abuse_summary, firstSteal.entry.anti_abuse_summary, 'owner log should keep anti-abuse summary')
assert.ok(firstSteal.entry.settlement_receipt_id, 'steal receipt should expose a settlement id')
assert.ok(firstSteal.entry.use_tags.includes('order'), 'steal entry should record crop use tags')
assert.match(firstSteal.entry.use_summary, /公共订单/, 'steal entry should record crop use summary')
assert.match(firstSteal.entry.owner_compensation, /主人获得/, 'owner compensation should be recorded')
assert.equal(firstSteal.snapshot.steal_entries[0]?.visitor_username, visitor, 'owner log should include visitor')
assert.equal(firstSteal.snapshot.steal_state.remaining_steal_count, 1, 'steal limit should decrement')
const firstStealActivity = firstSteal.snapshot.visitor_activity_entries[0]
assert.equal(firstStealActivity?.kind, 'steal', 'visitor activity audit should surface steal records')
assert.ok(String(firstStealActivity?.audit_note || '').includes(firstSteal.entry.settlement_receipt_id), 'steal activity audit should include settlement receipt')
assert.equal(firstStealActivity?.visitor_daily_progress, '1/2', 'visitor activity audit should expose visitor daily progress')
assert.equal(firstStealActivity?.manor_daily_progress, '1/6', 'visitor activity audit should expose manor daily progress')
assert.equal(firstStealActivity?.object_daily_progress, '1/1', 'visitor activity audit should expose object daily progress')
assert.equal(firstStealActivity?.visitor_daily_remaining, 1, 'visitor activity audit should expose visitor remaining count')
assert.equal(firstStealActivity?.manor_daily_remaining, 5, 'visitor activity audit should expose manor remaining count')
assert.equal(firstStealActivity?.object_daily_remaining, 0, 'visitor activity audit should expose object remaining count')
assert.equal(firstStealActivity?.owner_reserved_percent, 100, 'visitor activity audit should expose owner reserved percent')
assert.equal(firstStealActivity?.settlement_receipt_id, firstSteal.entry.settlement_receipt_id, 'visitor activity audit should expose receipt id')
assert.equal(firstStealActivity?.visitor_reward, firstSteal.entry.visitor_reward, 'visitor activity audit should expose visitor reward label')
assert.equal(firstStealActivity?.visitor_reward_quantity, 1, 'visitor activity audit should expose visitor reward quantity')
assert.equal(firstStealActivity?.visitor_reward_quantity_cap, 1, 'visitor activity audit should expose visitor reward quantity cap')
assert.equal(firstStealActivity?.owner_compensation, firstSteal.entry.owner_compensation, 'visitor activity audit should expose owner compensation')
assert.equal(firstStealActivity?.target_id, 'plot:0', 'visitor activity audit should expose target id')
assert.equal(firstStealActivity?.item_id, 'rice', 'visitor activity audit should expose item id')
assert.deepEqual(firstStealActivity?.use_tags, firstSteal.entry.use_tags, 'visitor activity audit should expose use tags')
assert.equal(firstStealActivity?.use_summary, firstSteal.entry.use_summary, 'visitor activity audit should expose use summary')
assert.equal(firstStealActivity?.recent_window_seconds, firstSteal.entry.recent_window_seconds, 'visitor activity audit should expose anti-abuse window seconds')
assert.equal(firstStealActivity?.recent_window_count, firstSteal.entry.recent_window_count, 'visitor activity audit should expose anti-abuse window count')
assert.equal(firstStealActivity?.anti_abuse_summary, firstSteal.entry.anti_abuse_summary, 'visitor activity audit should expose anti-abuse summary')
assert.ok(firstStealActivity?.risk_flags?.includes('object_daily_limit_reached'), 'visitor activity audit should expose risk flags')

const duplicateSteal = await runtime.submitManorStealAction({
  target_username: owner,
  object_id: 'manor_field',
  action_id: 'steal_plot_sample',
  target_id: 'plot:0',
}, actor(visitor))
assert.equal(duplicateSteal.idempotent, true, 'duplicate steal should be idempotent')
assert.equal(duplicateSteal.entry.id, firstSteal.entry.id, 'duplicate steal should return original entry')
assert.equal(duplicateSteal.snapshot.steal_state.remaining_steal_count, 1, 'duplicate steal should not consume another count')
assert.equal(duplicateSteal.snapshot.visitor_activity_entries.filter(entry => entry.kind === 'steal').length, 1, 'duplicate steal should not duplicate audit activity')
assert.equal(getOwnerFarmSnapshot(), ownerFarmBeforeSteal, 'duplicate steal should keep owner farm save data unchanged')

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
assert.equal(getOwnerFarmSnapshot(), ownerFarmBeforeSteal, 'fruit steal should not mutate owner fruit tree save data')

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
