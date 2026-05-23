import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-activity-room-visual-state')
const storageFile = path.join(tempDir, '.storage.json')

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const runtime = require('../src/taoyuanActivityRoomRuntime')

const actor = username => ({
  username,
  displayName: username,
})

const assertVisualStateShape = (visualState, expectedBoardType, expectedBoardIdPrefix) => {
  assert.equal(visualState?.board_type, expectedBoardType, 'visual_state board_type mismatch')
  assert.equal(typeof visualState.board_id, 'string', 'visual_state board_id should be string')
  assert.ok(visualState.board_id.startsWith(expectedBoardIdPrefix), `visual_state board_id should start with ${expectedBoardIdPrefix}`)
  assert.equal(visualState.revision, 0, 'new compatible visual_state revision should start at 0')
  assert.equal(visualState.selected_visual_id, '', 'new compatible visual_state should not select a visual id')
  assert.deepEqual(visualState.nodes, [], 'new compatible visual_state nodes should be empty')
  assert.deepEqual(visualState.objects, [], 'new compatible visual_state objects should be empty')
  assert.deepEqual(visualState.highlights, [], 'new compatible visual_state highlights should be empty')
  assert.equal(visualState.recent_feedback, '', 'new compatible visual_state recent_feedback should be empty')
}

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const festival = await runtime.createFestivalRoom({
  template_id: 'lantern_fair',
  gameplay_template_id: 'assembly',
  title: 'visual festival smoke',
}, actor('visual_host_festival'))
assertVisualStateShape(festival.room.visual_state, 'scene', 'festival:lantern_fair:assembly')

const expedition = await runtime.createExpeditionRoom({
  template_id: 'cavern_duo',
  gameplay_template_id: 'expedition_cavern',
  title: 'visual expedition smoke',
}, actor('visual_host_expedition'))
assertVisualStateShape(expedition.room.visual_state, 'map', 'expedition:cavern_duo:expedition_cavern')

const overview = await runtime.listExpeditionRoomOverview('visual_host_expedition')
assertVisualStateShape(overview.my_room?.visual_state, 'map', 'expedition:cavern_duo:expedition_cavern')

const roomStoreFile = path.join(tempDir, 'taoyuan_activity_rooms.json')
const stored = JSON.parse(await readFile(roomStoreFile, 'utf8'))
stored.rooms = stored.rooms.map(room => {
  const nextRoom = { ...room }
  delete nextRoom.visual_state
  return nextRoom
})
await writeFile(roomStoreFile, JSON.stringify(stored, null, 2), 'utf8')

const legacyOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
assertVisualStateShape(legacyOverview.my_room?.visual_state, 'scene', 'festival:lantern_fair:assembly')

const nodeStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
nodeStore.rooms = nodeStore.rooms.map(room => {
  if (room.id !== expedition.room.id) return room
  return {
    ...room,
    visual_state: {
      board_type: 'map',
      board_id: 'expedition:cavern_duo:expedition_cavern',
      revision: 3,
      selected_visual_id: 'node_mine_vein',
      nodes: [
        {
          id: 'node_entrance',
          label: '洞口',
          kind: 'entrance',
          x: -10,
          y: 45,
          state: 'resolved',
          connected_node_ids: ['node_mine_vein'],
          event_id: 'cavern_loose_rocks',
          available_action_ids: ['scout_path', 'shore_support'],
          owner_username: '',
          claimed_by: '',
          risk_preview: '入口已确认，可安全折返。',
          reward_preview: '保留撤离路线。',
          resource_cost_preview: { torch: 0, rope: 1 },
          resource_reward_preview: { marker: 1 },
        },
        {
          id: 'node_mine_vein',
          label: '矿脉岔道',
          kind: 'ore_vein',
          x: 52,
          y: 42,
          state: 'available',
          connected_node_ids: ['node_entrance', 'node_exit'],
          event_id: 'cavern_glimmering_vein',
          available_action_ids: ['collect_ore'],
          owner_username: 'visual_host_expedition',
          claimed_by: 'visual_friend',
          risk_preview: '采集会提高塌方风险。',
          reward_preview: '可能获得矿石和拓片。',
          resource_cost_preview: { torch: 1 },
          resource_reward_preview: { ore: 2, rubbing: 1 },
        },
        {
          id: 'node_exit',
          label: '撤离点',
          kind: 'exit',
          x: 120,
          y: 44,
          state: 'exit',
          connected_node_ids: ['node_mine_vein'],
          event_id: 'cavern_exit',
          available_action_ids: ['withdraw'],
          risk_preview: '可提前收尾。',
          reward_preview: '保住已采集收益。',
        },
        {
          label: '缺少 ID 的坏节点会被过滤',
          x: 50,
          y: 50,
        },
      ],
      highlights: [],
      recent_feedback: '矿脉岔道已开放。',
    },
  }
})
await writeFile(roomStoreFile, JSON.stringify(nodeStore, null, 2), 'utf8')

const nodeOverview = await runtime.listExpeditionRoomOverview('visual_host_expedition')
const nodes = nodeOverview.my_room?.visual_state?.nodes || []
assert.equal(nodes.length, 3, 'visual_state nodes should keep valid nodes and filter invalid entries')
assert.deepEqual(nodes.map(node => node.id), ['node_entrance', 'node_mine_vein', 'node_exit'])
assert.equal(nodes[0].x, 0, 'node x should be clamped to board percent range')
assert.equal(nodes[2].x, 100, 'node x should clamp values above board range')
assert.equal(nodes[1].state, 'available', 'node state should preserve allowed states')
assert.deepEqual(nodes[1].connected_node_ids, ['node_entrance', 'node_exit'], 'node links should round-trip')
assert.deepEqual(nodes[1].available_action_ids, ['collect_ore'], 'node action ids should round-trip')
assert.equal(nodes[1].event_id, 'cavern_glimmering_vein', 'node event id should round-trip')
assert.equal(nodes[1].owner_username, 'visual_host_expedition', 'node owner should round-trip')
assert.equal(nodes[1].claimed_by, 'visual_friend', 'node claimed_by should round-trip')
assert.equal(nodes[1].risk_preview, '采集会提高塌方风险。', 'node risk preview should round-trip')
assert.equal(nodes[1].reward_preview, '可能获得矿石和拓片。', 'node reward preview should round-trip')
assert.deepEqual(nodes[1].resource_cost_preview, { torch: 1 }, 'node resource cost preview should round-trip')
assert.deepEqual(nodes[1].resource_reward_preview, { ore: 2, rubbing: 1 }, 'node resource reward preview should round-trip')

const objectStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
objectStore.rooms = objectStore.rooms.map(room => {
  if (room.id !== festival.room.id) return room
  return {
    ...room,
    visual_state: {
      board_type: 'scene',
      board_id: 'festival:lantern_fair:assembly',
      revision: 4,
      selected_visual_id: 'object_main_lantern',
      nodes: [],
      objects: [
        {
          id: 'object_main_lantern',
          label: '主灯',
          kind: 'lantern',
          x: 48,
          y: 18,
          state: 'needs_action',
          available_action_ids: ['hang_lantern', 'repair_cord'],
          progress_value: 3,
          progress_target: 6,
          handled_by: 'visual_host_festival',
          handled_at: 12345,
          requires_cooperation: true,
          cooperation_required_count: 2,
          cooperation_current_count: 1,
        },
        {
          id: 'object_riddle_rack',
          label: '灯谜架',
          kind: 'riddle_rack',
          x: 22,
          y: 50,
          state: 'busy',
          available_action_ids: ['write_riddle'],
          progress_value: 10,
          progress_target: 4,
          handled_by: 'visual_friend',
          handled_at: 12346,
        },
        {
          id: 'object_crowd',
          label: '人群',
          kind: 'crowd',
          x: 110,
          y: -5,
          state: 'overheated',
          available_action_ids: ['keep_order'],
          progress_value: 0,
          progress_target: 0,
        },
        {
          label: '缺少 ID 的坏物件会被过滤',
          kind: 'stall',
        },
      ],
      highlights: [],
      recent_feedback: '主灯等待协作点亮。',
    },
  }
})
await writeFile(roomStoreFile, JSON.stringify(objectStore, null, 2), 'utf8')

const objectOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
const objects = objectOverview.my_room?.visual_state?.objects || []
assert.equal(objects.length, 3, 'visual_state objects should keep valid objects and filter invalid entries')
assert.deepEqual(objects.map(item => item.id), ['object_main_lantern', 'object_riddle_rack', 'object_crowd'])
assert.equal(objects[0].state, 'needs_action', 'object state should preserve allowed states')
assert.deepEqual(objects[0].available_action_ids, ['hang_lantern', 'repair_cord'], 'object action ids should round-trip')
assert.equal(objects[0].progress_value, 3, 'object progress should round-trip')
assert.equal(objects[0].progress_target, 6, 'object progress target should round-trip')
assert.equal(objects[0].handled_by, 'visual_host_festival', 'object handler should round-trip')
assert.equal(objects[0].handled_at, 12345, 'object handled_at should round-trip')
assert.equal(objects[0].requires_cooperation, true, 'object cooperation flag should round-trip')
assert.equal(objects[0].cooperation_required_count, 2, 'object cooperation required count should round-trip')
assert.equal(objects[0].cooperation_current_count, 1, 'object cooperation current count should round-trip')
assert.equal(objects[1].progress_value, 4, 'object progress should clamp to target')
assert.equal(objects[2].x, 100, 'object x should clamp values above board range')
assert.equal(objects[2].y, 0, 'object y should clamp values below board range')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-activity-room-visual-state] passed')
