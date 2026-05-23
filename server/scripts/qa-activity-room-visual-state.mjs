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
  assert.deepEqual(visualState.tracks, [], 'new compatible visual_state tracks should be empty')
  assert.deepEqual(visualState.async_projects, [], 'new compatible visual_state async projects should be empty')
  assert.deepEqual(visualState.highlights, [], 'new compatible visual_state highlights should be empty')
  assert.equal(visualState.recent_feedback, '', 'new compatible visual_state recent_feedback should be empty')
}

const assertCavernVisualNodes = (room, expectedRevision = 0) => {
  const visualState = room?.visual_state
  const nodes = visualState?.nodes || []
  const actionIds = new Set((room?.gameplay?.available_actions || []).map(action => action.id))
  assert.equal(visualState?.board_type, 'map', 'cavern visual_state should use map board')
  assert.equal(visualState?.revision, expectedRevision, 'cavern visual_state revision mismatch')
  assert.equal(nodes.length, 6, 'cavern visual_state should expose 6 map nodes')
  assert.deepEqual(nodes.map(node => node.id), [
    'cavern_entrance',
    'cavern_crossroad',
    'cavern_ore_vein',
    'cavern_collapse_support',
    'cavern_route_marker',
    'cavern_exit',
  ], 'cavern visual nodes should keep a stable route')
  assert.ok(nodes.every(node => Array.isArray(node.connected_node_ids)), 'cavern nodes should expose route links')
  assert.ok(nodes.find(node => node.id === 'cavern_crossroad')?.available_action_ids.includes('chalk_route'), 'crossroad should map chalk route action')
  assert.ok(nodes.find(node => node.id === 'cavern_ore_vein')?.available_action_ids.includes('split_mine'), 'ore node should map mine action')
  assert.ok(nodes.find(node => node.id === 'cavern_collapse_support')?.available_action_ids.includes('stabilize_collapse'), 'collapse node should map support action')
  assert.equal(nodes.find(node => node.id === 'cavern_exit')?.state, 'exit', 'exit node should be marked as exit')
  const nodeActionIds = nodes.flatMap(node => node.available_action_ids || [])
  assert.ok(nodeActionIds.every(actionId => actionIds.has(actionId)), 'visual node actions should exist in gameplay actions')
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
assertCavernVisualNodes(expedition.room, 0)

const dragonBoat = await runtime.createFestivalRoom({
  template_id: 'dragon_boat',
  gameplay_template_id: 'squad_coop',
  title: 'visual dragon boat smoke',
}, actor('visual_host_dragon'))
assertVisualStateShape(dragonBoat.room.visual_state, 'track', 'festival:dragon_boat:squad_coop')

const overview = await runtime.listExpeditionRoomOverview('visual_host_expedition')
assertCavernVisualNodes(overview.my_room, 0)

const actionExpedition = await runtime.createExpeditionRoom({
  template_id: 'cavern_duo',
  gameplay_template_id: 'expedition_cavern',
  title: 'visual expedition action smoke',
}, actor('visual_action_host'))
assertCavernVisualNodes(actionExpedition.room, 0)

const roomStoreFile = path.join(tempDir, 'taoyuan_activity_rooms.json')
const actionStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
actionStore.rooms = actionStore.rooms.map(room => {
  if (room.id !== actionExpedition.room.id) return room
  return {
    ...room,
    state: 'running',
    running_started_at: 12345,
    members: room.members.map(member => ({ ...member, status: 'active' })),
  }
})
await writeFile(roomStoreFile, JSON.stringify(actionStore, null, 2), 'utf8')

const minedResult = await runtime.submitExpeditionRoomGameplayAction(actionExpedition.room.id, {
  action_id: 'split_mine',
}, actor('visual_action_host'))
assert.equal(minedResult.room.gameplay.last_action_id, 'split_mine', 'cavern gameplay should record last action')
assert.ok(minedResult.room.gameplay.last_action_summary, 'cavern gameplay should summarize node action')
assert.equal(minedResult.room.gameplay.cavern_state.round_log[0].action_id, 'split_mine', 'cavern round log should record node action')
assert.equal(minedResult.room.visual_state.revision, 1, 'cavern visual revision should advance after node action')
assert.equal(minedResult.room.visual_state.recent_feedback, minedResult.room.gameplay.cavern_state.recent_feedback, 'cavern visual feedback should mirror gameplay feedback')
const minedNode = minedResult.room.visual_state.nodes.find(node => node.id === 'cavern_ore_vein')
assert.equal(minedNode?.state, 'reward', 'mine action should change ore node state')
assert.equal(minedNode?.claimed_by, 'visual_action_host', 'mine action should mark the acting player on the node')

const advancedResult = await runtime.submitExpeditionRoomGameplayAction(actionExpedition.room.id, {
  action_id: 'chalk_route',
}, actor('visual_action_host'))
assert.equal(advancedResult.room.gameplay.cavern_state.round_number, 2, 'two cavern actions should advance the round')
assert.equal(advancedResult.room.gameplay.cavern_state.round_log[0].action_id, 'round_advance', 'round advance should be logged')
assert.ok(advancedResult.room.visual_state.revision >= 2, 'cavern visual revision should keep advancing after round transition')
assert.equal(advancedResult.room.visual_state.recent_feedback, advancedResult.room.gameplay.cavern_state.recent_feedback, 'round transition should sync visual feedback')
const currentEventId = advancedResult.room.gameplay.cavern_state.current_event.id
const currentEventNodes = advancedResult.room.visual_state.nodes.filter(node => node.event_id === currentEventId)
assert.ok(currentEventNodes.length > 0, 'round transition should remap visual nodes to the current cavern event')

const stored = JSON.parse(await readFile(roomStoreFile, 'utf8'))
stored.rooms = stored.rooms.map(room => {
  const nextRoom = { ...room }
  delete nextRoom.visual_state
  return nextRoom
})
await writeFile(roomStoreFile, JSON.stringify(stored, null, 2), 'utf8')

const legacyOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
assertVisualStateShape(legacyOverview.my_room?.visual_state, 'scene', 'festival:lantern_fair:assembly')

const legacyExpeditionOverview = await runtime.listExpeditionRoomOverview('visual_host_expedition')
assertCavernVisualNodes(legacyExpeditionOverview.my_room, 0)

const nodeStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
nodeStore.rooms = nodeStore.rooms.map(room => {
  if (room.id !== festival.room.id) return room
  return {
    ...room,
    visual_state: {
      board_type: 'map',
      board_id: 'festival:lantern_fair:visual_node_fixture',
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

const nodeOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
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

const trackStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
trackStore.rooms = trackStore.rooms.map(room => {
  if (room.id !== dragonBoat.room.id) return room
  return {
    ...room,
    visual_state: {
      board_type: 'track',
      board_id: 'festival:dragon_boat:squad_coop',
      revision: 5,
      selected_visual_id: 'cell_finish',
      nodes: [],
      objects: [],
      tracks: [
        {
          id: 'track_dragon_boat_river',
          label: '龙舟河道',
          kind: 'dragon_boat',
          length: 6,
          current_round: 2,
          cells: [
            {
              id: 'cell_start',
              label: '起点水面',
              index: -1,
              kind: 'normal',
              occupant_team_ids: ['team_red'],
              event_id: 'dragon_boat_start',
              effect_ids: ['advance'],
              available_action_ids: ['paddle'],
            },
            {
              id: 'cell_cross_current',
              label: '横流',
              index: 2,
              kind: 'risk',
              occupant_team_ids: ['team_blue'],
              event_id: 'dragon_boat_cross_current',
              effect_ids: ['blocked', 'retreat'],
              available_action_ids: ['steady_rudder'],
              risk_preview: '横流会让船只后退。',
            },
            {
              id: 'cell_sprint',
              label: '冲刺水道',
              index: 4,
              kind: 'boost',
              occupant_team_ids: [],
              effect_ids: ['boost', 'protect', 'unknown_effect'],
              available_action_ids: ['sprint'],
              reward_preview: '命中鼓点可额外推进。',
            },
            {
              id: 'cell_finish',
              label: '终点',
              index: 99,
              kind: 'finish',
              occupant_team_ids: ['team_gold'],
              event_id: 'dragon_boat_finish',
              effect_ids: ['advance'],
            },
            {
              label: '缺少 ID 的坏格子会被过滤',
              index: 3,
              kind: 'turn',
            },
          ],
          teams: [
            {
              team_id: 'team_red',
              label: '红船',
              marker: 'dragon_red',
              position_index: 0,
              state: 'advancing',
              last_action_id: 'paddle',
            },
            {
              team_id: 'team_blue',
              label: '蓝船',
              marker: 'dragon_blue',
              position_index: 2,
              state: 'blocked',
              last_action_id: 'steady_rudder',
            },
            {
              team_id: 'team_gold',
              label: '金船',
              marker: 'dragon_gold',
              position_index: 99,
              state: 'finished',
              last_action_id: 'sprint',
            },
            {
              label: '缺少 team_id 的坏队伍会被过滤',
              position_index: 1,
            },
          ],
        },
        {
          label: '缺少 ID 的坏轨道会被过滤',
        },
      ],
      highlights: [],
      recent_feedback: '红船正在加速。',
    },
  }
})
await writeFile(roomStoreFile, JSON.stringify(trackStore, null, 2), 'utf8')

const trackOverview = await runtime.listFestivalRoomOverview('visual_host_dragon')
const tracks = trackOverview.my_room?.visual_state?.tracks || []
assert.equal(tracks.length, 1, 'visual_state tracks should keep valid tracks and filter invalid entries')
assert.equal(tracks[0].id, 'track_dragon_boat_river', 'track id should round-trip')
assert.equal(tracks[0].length, 6, 'track length should round-trip')
assert.equal(tracks[0].current_round, 2, 'track current round should round-trip')
assert.equal(tracks[0].cells.length, 4, 'track cells should keep valid cells and filter invalid entries')
assert.deepEqual(tracks[0].cells.map(cell => cell.id), ['cell_start', 'cell_cross_current', 'cell_sprint', 'cell_finish'])
assert.equal(tracks[0].cells[0].index, 0, 'track cell index should clamp below zero')
assert.equal(tracks[0].cells[1].kind, 'risk', 'track cell kind should preserve allowed kind')
assert.deepEqual(tracks[0].cells[1].occupant_team_ids, ['team_blue'], 'track cell occupants should round-trip')
assert.deepEqual(tracks[0].cells[1].effect_ids, ['blocked', 'retreat'], 'track cell effects should round-trip')
assert.deepEqual(tracks[0].cells[2].effect_ids, ['boost', 'protect'], 'track cell effects should filter unknown values')
assert.deepEqual(tracks[0].cells[2].available_action_ids, ['sprint'], 'track cell action ids should round-trip')
assert.equal(tracks[0].cells[2].reward_preview, '命中鼓点可额外推进。', 'track cell reward preview should round-trip')
assert.equal(tracks[0].teams.length, 3, 'track teams should keep valid teams and filter invalid entries')
assert.deepEqual(tracks[0].teams.map(team => team.team_id), ['team_red', 'team_blue', 'team_gold'])
assert.equal(tracks[0].teams[0].state, 'advancing', 'track team state should preserve advancing')
assert.equal(tracks[0].teams[1].state, 'blocked', 'track team state should preserve blocked')
assert.equal(tracks[0].teams[2].state, 'finished', 'track team state should preserve finished')

const asyncStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
asyncStore.rooms = asyncStore.rooms.map(room => {
  if (room.id !== festival.room.id) return room
  return {
    ...room,
    visual_state: {
      board_type: 'async',
      board_id: 'community:bridge:weekly',
      revision: 6,
      selected_visual_id: 'stage_bridge_deck',
      nodes: [],
      objects: [
        {
          id: 'object_bridge_frame',
          label: '桥架',
          kind: 'bridge_frame',
          x: 50,
          y: 44,
          state: 'busy',
          progress_value: 4,
          progress_target: 8,
        },
      ],
      tracks: [],
      async_projects: [
        {
          id: 'project_village_bridge',
          label: '村社修桥',
          kind: 'bridge_repair',
          day_tag: 'year1-spring-12',
          week_tag: 'year1-spring-w2',
          starts_at: 1000,
          ends_at: 2000,
          current_stage_id: 'stage_bridge_deck',
          stages: [
            {
              id: 'stage_scaffold',
              label: '搭脚手架',
              state: 'complete',
              progress_value: 5,
              progress_target: 5,
              object_ids: ['object_bridge_frame'],
              contribution_options: [
                {
                  id: 'option_wood',
                  label: '捐木材',
                  kind: 'resource',
                  available_action_id: 'contribute_wood',
                  daily_limit: 3,
                  weekly_limit: 12,
                  resource_cost_preview: { wood: 5 },
                  progress_delta: 1,
                  reward_preview: '贡献榜增加 1 点。',
                },
              ],
              milestones: [
                {
                  id: 'milestone_scaffold_done',
                  label: '脚手架完工',
                  progress_required: 5,
                  reached: true,
                  reward_preview: '开放桥面阶段。',
                },
              ],
            },
            {
              id: 'stage_bridge_deck',
              label: '铺桥面',
              state: 'active',
              progress_value: 9,
              progress_target: 6,
              object_ids: ['object_bridge_frame'],
              contribution_options: [
                {
                  id: 'option_stone',
                  label: '捐石料',
                  kind: 'resource',
                  available_action_id: 'contribute_stone',
                  daily_limit: 2,
                  weekly_limit: 8,
                  resource_cost_preview: { stone: 4 },
                  progress_delta: 2,
                  reward_preview: '桥面进度增加。',
                },
                {
                  label: '缺少 ID 的坏贡献入口会被过滤',
                },
              ],
              milestones: [
                {
                  id: 'milestone_half_deck',
                  label: '桥面过半',
                  progress_required: 3,
                  reached: true,
                  reward_preview: '村民开始通行试走。',
                },
              ],
            },
            {
              label: '缺少 ID 的坏阶段会被过滤',
            },
          ],
          contributors: [
            {
              username: 'visual_host_festival',
              display_name: '修桥甲',
              contribution_value: 12,
              rank: 1,
            },
            {
              username: 'visual_friend',
              display_name: '修桥乙',
              contribution_value: 8,
              rank: 2,
            },
            {
              display_name: '缺少用户名的坏贡献者会被过滤',
            },
          ],
          history: [
            {
              id: 'history_wood',
              type: 'contribution',
              actor_username: 'visual_host_festival',
              actor_display_name: '修桥甲',
              summary: '捐了 5 份木材。',
              created_at: 1100,
            },
            {
              id: 'history_stage',
              type: 'stage_complete',
              actor_username: '',
              actor_display_name: '',
              summary: '脚手架阶段完成。',
              created_at: 1500,
            },
            {
              id: 'history_bad_type',
              type: 'unknown',
              summary: '未知类型会回退为贡献记录。',
              created_at: 1600,
            },
            {
              summary: '缺少 ID 的坏历史会被过滤',
            },
          ],
          completion_room_template_id: 'lantern_fair',
          completion_event_id: 'bridge_opening_ceremony',
        },
        {
          label: '缺少 ID 的坏工程会被过滤',
        },
      ],
      highlights: [],
      recent_feedback: '桥面阶段正在推进。',
    },
  }
})
await writeFile(roomStoreFile, JSON.stringify(asyncStore, null, 2), 'utf8')

const asyncOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
const asyncProjects = asyncOverview.my_room?.visual_state?.async_projects || []
assert.equal(asyncProjects.length, 1, 'visual_state async projects should keep valid projects and filter invalid entries')
assert.equal(asyncProjects[0].id, 'project_village_bridge', 'async project id should round-trip')
assert.equal(asyncProjects[0].current_stage_id, 'stage_bridge_deck', 'async project current stage should round-trip')
assert.equal(asyncProjects[0].day_tag, 'year1-spring-12', 'async project day tag should round-trip')
assert.equal(asyncProjects[0].week_tag, 'year1-spring-w2', 'async project week tag should round-trip')
assert.equal(asyncProjects[0].stages.length, 2, 'async stages should keep valid stages and filter invalid entries')
assert.equal(asyncProjects[0].stages[1].progress_value, 6, 'async stage progress should clamp to target')
assert.deepEqual(asyncProjects[0].stages[1].object_ids, ['object_bridge_frame'], 'async stage object ids should round-trip')
assert.equal(asyncProjects[0].stages[1].contribution_options.length, 1, 'async contribution options should filter invalid entries')
assert.deepEqual(asyncProjects[0].stages[1].contribution_options[0].resource_cost_preview, { stone: 4 }, 'async contribution resource cost should round-trip')
assert.equal(asyncProjects[0].stages[1].contribution_options[0].progress_delta, 2, 'async contribution progress delta should round-trip')
assert.equal(asyncProjects[0].stages[1].milestones[0].reached, true, 'async milestones should round-trip reached flag')
assert.deepEqual(asyncProjects[0].contributors.map(item => item.username), ['visual_host_festival', 'visual_friend'])
assert.equal(asyncProjects[0].history.length, 3, 'async history should keep valid entries and filter invalid entries')
assert.equal(asyncProjects[0].history[2].type, 'contribution', 'async history should fallback unknown types')
assert.equal(asyncProjects[0].completion_room_template_id, 'lantern_fair', 'async completion room template should round-trip')
assert.equal(asyncProjects[0].completion_event_id, 'bridge_opening_ceremony', 'async completion event should round-trip')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-activity-room-visual-state] passed')
