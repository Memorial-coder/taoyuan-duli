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
const saveRuntime = require('../src/taoyuanSaveRuntime')

const actor = username => ({
  username,
  displayName: username,
})

const buildRewardSaveData = username => ({
  meta: {
    saveVersion: 1,
    savedAt: '2026-05-25T00:00:00.000Z',
  },
  savedAt: '2026-05-25T00:00:00.000Z',
  data: {
    player: {
      playerName: username,
      money: 500,
    },
    game: {
      year: 1,
      season: 'summer',
      day: 5,
    },
    inventory: {
      items: [],
      tempItems: [],
      capacity: 24,
    },
  },
})

const seedRewardSave = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData(buildRewardSaveData(username)),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

const readRewardSave = username => {
  const raw = saveRuntime.loadUserSaveSlots(username).slots[0]?.raw
  return saveRuntime.normalizeGameplaySaveContainer(saveRuntime.decryptTaoyuanRaw(raw))?.gameplayData
}

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

const assertLanternFairVisualObjects = (room, expectedRevision = 0, options = {}) => {
  const visualState = room?.visual_state
  const objects = visualState?.objects || []
  const actionIds = new Set((room?.gameplay?.available_actions || []).map(action => action.id))
  assert.equal(visualState?.board_type, 'scene', 'lantern fair visual_state should use scene board')
  assert.equal(visualState?.revision, expectedRevision, 'lantern fair visual_state revision mismatch')
  assert.equal(objects.length, 6, 'lantern fair should expose 6 scene objects')
  assert.deepEqual(objects.map(object => object.id), [
    'lantern_main_lantern',
    'lantern_riddle_rack',
    'lantern_color_rope',
    'lantern_festival_stall',
    'lantern_crowd',
    'lantern_photo_spot',
  ], 'lantern fair objects should keep a stable scene layout')
  assert.ok(objects.find(object => object.id === 'lantern_main_lantern')?.requires_cooperation, 'main lantern should require cooperation')
  assert.ok(objects.find(object => object.id === 'lantern_main_lantern')?.available_action_ids.includes('lock_piece'), 'main lantern should map assembly action')
  assert.ok(objects.find(object => object.id === 'lantern_color_rope')?.available_action_ids.includes('tighten_frame'), 'color rope should map frame action')
  if (options.expectInitialStates !== false) {
    assert.ok(objects.find(object => object.id === 'lantern_photo_spot')?.state === 'blocked', 'photo spot should start blocked before memory is earned')
    assert.ok(new Set(objects.map(object => object.state)).size >= 4, 'lantern fair scene should expose at least 4 object states')
  }
  const objectActionIds = objects.flatMap(object => object.available_action_ids || [])
  assert.ok(objectActionIds.every(actionId => actionIds.has(actionId)), 'visual object actions should exist in gameplay actions')
}

const assertLabaCookpotVisualObjects = (room, expectedRevision = 0, options = {}) => {
  const visualState = room?.visual_state
  const objects = visualState?.objects || []
  const actionIds = new Set((room?.gameplay?.available_actions || []).map(action => action.id))
  assert.equal(visualState?.board_type, 'scene', 'laba cookpot visual_state should use scene board')
  assert.equal(visualState?.revision, expectedRevision, 'laba cookpot visual_state revision mismatch')
  assert.equal(objects.length, 6, 'laba cookpot should expose 6 scene objects')
  assert.deepEqual(objects.map(object => object.id), [
    'laba_cookpot_big_pot',
    'laba_cookpot_stove',
    'laba_cookpot_rice_tub',
    'laba_cookpot_ingredient_basket',
    'laba_cookpot_serving_queue',
    'laba_cookpot_aroma_table',
  ], 'laba cookpot visual objects should keep stable order')
  assert.ok(objects.some(object => object.kind === 'cookpot'), 'laba cookpot should expose the big pot object')
  assert.ok(objects.some(object => object.kind === 'stove'), 'laba cookpot should expose the stove object')
  assert.ok(objects.some(object => object.kind === 'serving_queue'), 'laba cookpot should expose the serving queue object')
  const objectActionIds = objects.flatMap(object => object.available_action_ids || [])
  assert.ok(objectActionIds.every(actionId => actionIds.has(actionId)), 'laba cookpot visual actions should exist in gameplay actions')
  if (options.expectedHandledObjectId) {
    const target = objects.find(object => object.id === options.expectedHandledObjectId)
    assert.equal(target?.handled_by, options.expectedHandledBy, 'laba cookpot action should mark handling player')
    assert.ok(target?.progress_value > 0, 'laba cookpot action should advance target object progress')
  }
}

const assertDragonBoatVisualTrack = (room, expectedRevision = 0, options = {}) => {
  const visualState = room?.visual_state
  const tracks = visualState?.tracks || []
  const track = tracks[0]
  const actionIds = new Set((room?.gameplay?.available_actions || []).map(action => action.id))
  assert.equal(visualState?.board_type, 'track', 'dragon boat visual_state should use track board')
  if (Number.isInteger(expectedRevision)) {
    assert.equal(visualState?.revision, expectedRevision, 'dragon boat visual_state revision mismatch')
  }
  if (Number.isInteger(options.minRevision)) {
    assert.ok(visualState?.revision >= options.minRevision, 'dragon boat visual_state revision should keep advancing')
  }
  assert.equal(tracks.length, 1, 'dragon boat should expose one river track')
  assert.equal(track?.id, 'dragon_boat_river', 'dragon boat track should keep stable id')
  assert.equal(track?.kind, 'dragon_boat', 'dragon boat track kind should be dragon_boat')
  assert.equal(track?.length, 8, 'dragon boat river should define 8 cells')
  assert.equal(track?.cells.length, 8, 'dragon boat should expose 8 river cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('normal'), 'dragon boat should include normal cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('risk'), 'dragon boat should include risk cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('turn'), 'dragon boat should include turn cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('boost'), 'dragon boat should include boost cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('finish'), 'dragon boat should include finish cell')
  const expectedTeamCount = Number.isInteger(options.expectedTeamCount) ? options.expectedTeamCount : 3
  assert.equal(track.teams.length, expectedTeamCount, 'dragon boat should expose race lane teams')
  const team = track.teams.find(entry => entry.team_id === 'team_dragon_boat')
  assert.ok(team, 'dragon boat should expose the room team')
  assert.equal(team.team_id, 'team_dragon_boat', 'dragon boat team should keep stable id')
  if (expectedTeamCount > 1) {
    assert.ok(track.teams.some(entry => entry.team_id !== 'team_dragon_boat'), 'dragon boat should expose rival race teams')
  }
  const occupiedCell = track.cells.find(cell => (cell.occupant_team_ids || []).includes(team.team_id))
  assert.ok(occupiedCell, 'dragon boat team should occupy a visible cell')
  assert.equal(occupiedCell.index, team.position_index, 'dragon boat team position should match occupied cell')
  if (Number.isInteger(options.minPosition)) {
    assert.ok(team.position_index >= options.minPosition, 'dragon boat team should advance on action')
  }
  if (options.expectedLastAction) {
    assert.equal(team.last_action_id, options.expectedLastAction, 'dragon boat team should remember last action')
  }
  if (options.expectSelectedOccupied) {
    assert.equal(visualState.selected_visual_id, occupiedCell.id, 'dragon boat selected cell should follow the boat')
  }
  const cellActionIds = track.cells.flatMap(cell => cell.available_action_ids || [])
  assert.ok(cellActionIds.every(actionId => actionIds.has(actionId)), 'visual track actions should exist in gameplay actions')
  return { track, team, occupiedCell }
}

const assertEscortConvoyVisualTrack = (room, expectedRevision = 0, options = {}) => {
  const visualState = room?.visual_state
  const tracks = visualState?.tracks || []
  const track = tracks[0]
  const actionIds = new Set((room?.gameplay?.available_actions || []).map(action => action.id))
  assert.equal(visualState?.board_type, 'track', 'escort convoy visual_state should use track board')
  assert.equal(visualState?.revision, expectedRevision, 'escort convoy visual_state revision mismatch')
  assert.equal(tracks.length, 1, 'escort convoy should expose one route track')
  assert.equal(track?.id, 'escort_convoy_route', 'escort convoy track should keep stable id')
  assert.equal(track?.kind, 'escort_convoy', 'escort convoy track kind should be escort_convoy')
  assert.equal(track?.length, 6, 'escort convoy route should define 6 cells')
  assert.equal(track?.cells.length, 6, 'escort convoy should expose 6 route cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('turn'), 'escort convoy should include turn cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('risk'), 'escort convoy should include risk cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('boost'), 'escort convoy should include boost cells')
  assert.ok(new Set(track.cells.map(cell => cell.kind)).has('finish'), 'escort convoy should include finish cell')
  assert.equal(track.teams.length, 1, 'escort convoy should expose the convoy team')
  const team = track.teams[0]
  assert.equal(team.team_id, 'team_escort_convoy', 'escort convoy team should keep stable id')
  const occupiedCell = track.cells.find(cell => (cell.occupant_team_ids || []).includes(team.team_id))
  assert.ok(occupiedCell, 'escort convoy team should occupy a visible cell')
  assert.equal(occupiedCell.index, team.position_index, 'escort convoy team position should match occupied cell')
  if (Number.isInteger(options.minPosition)) {
    assert.ok(team.position_index >= options.minPosition, 'escort convoy team should advance on action')
  }
  if (options.expectedLastAction) {
    assert.equal(team.last_action_id, options.expectedLastAction, 'escort convoy team should remember last action')
  }
  assert.ok(track.cells.some(cell => cell.available_action_ids.includes('answer_incident')), 'escort convoy should expose incident action on route cells')
  const cellActionIds = track.cells.flatMap(cell => cell.available_action_ids || [])
  assert.ok(cellActionIds.every(actionId => actionIds.has(actionId)), 'escort convoy visual track actions should exist in gameplay actions')
  return { track, team, occupiedCell }
}

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const festival = await runtime.createFestivalRoom({
  template_id: 'lantern_fair',
  gameplay_template_id: 'assembly',
  title: 'visual festival smoke',
}, actor('visual_host_festival'))
assertLanternFairVisualObjects(festival.room, 0)

const labaCookpot = await runtime.createFestivalRoom({
  template_id: 'laba_cookpot',
  gameplay_template_id: 'gathering',
  title: 'visual laba cookpot smoke',
}, actor('visual_host_laba'))
assertLabaCookpotVisualObjects(labaCookpot.room, 0)

const expedition = await runtime.createExpeditionRoom({
  template_id: 'cavern_duo',
  gameplay_template_id: 'expedition_cavern',
  title: 'visual expedition smoke',
}, actor('visual_host_expedition'))
assertCavernVisualNodes(expedition.room, 0)

const escortConvoy = await runtime.createExpeditionRoom({
  template_id: 'escort_convoy',
  gameplay_template_id: 'expedition_escort',
  title: 'visual escort convoy smoke',
}, actor('visual_host_escort'))
assertEscortConvoyVisualTrack(escortConvoy.room, 0)

const dragonBoat = await runtime.createFestivalRoom({
  template_id: 'dragon_boat',
  gameplay_template_id: 'squad_coop',
  title: 'visual dragon boat smoke',
}, actor('visual_host_dragon'))
assertDragonBoatVisualTrack(dragonBoat.room, 0, { expectSelectedOccupied: true })
assert.deepEqual(
  dragonBoat.room.gameplay.available_actions.map(action => action.label),
  ['划桨', '稳舵', '击鼓', '冲刺'],
  'dragon boat squad coop should expose boat-specific action labels'
)
const dragonStartCell = dragonBoat.room.visual_state.tracks[0]?.cells.find(cell => cell.id === 'dragon_boat_start')
assert.ok(dragonStartCell?.available_action_ids.includes('keep_beat'), 'dragon boat current cell should offer drum action')
assert.ok(dragonStartCell?.available_action_ids.includes('lift_applause'), 'dragon boat current cell should offer sprint action')

const dragonBoatDuo = await runtime.createFestivalRoom({
  template_id: 'dragon_boat',
  gameplay_template_id: 'squad_coop',
  title: 'visual dragon boat duo smoke',
  member_limit: 2,
}, actor('visual_host_dragon_duo'))
assert.equal(dragonBoatDuo.room.member_limit, 2, 'dragon boat should allow 2 player room capacity')
assertDragonBoatVisualTrack(dragonBoatDuo.room, 0, { expectedTeamCount: 2, expectSelectedOccupied: true })

const dragonBoatEight = await runtime.createFestivalRoom({
  template_id: 'dragon_boat',
  gameplay_template_id: 'squad_coop',
  title: 'visual dragon boat eight smoke',
  member_limit: 8,
}, actor('visual_host_dragon_eight'))
assert.equal(dragonBoatEight.room.member_limit, 8, 'dragon boat should allow 8 player room capacity')
assertDragonBoatVisualTrack(dragonBoatEight.room, 0, { expectedTeamCount: 4, expectSelectedOccupied: true })

const trackFixtureRoom = await runtime.createFestivalRoom({
  template_id: 'yuanri_vigil',
  gameplay_template_id: 'public_progress',
  title: 'visual track fixture smoke',
}, actor('visual_host_track_fixture'))

const roomStoreFile = path.join(tempDir, 'taoyuan_activity_rooms.json')
const socialStoreFile = path.join(tempDir, 'taoyuan_social_profiles.json')
const seedFriendship = (usernameA, usernameB) => writeFile(socialStoreFile, JSON.stringify({
  profiles: {},
  friend_requests: [],
  friendships: [
    {
      id: `friendship:${usernameA}:${usernameB}`,
      username_a: usernameA,
      username_b: usernameB,
      save_id_a: 0,
      save_id_b: 0,
      save_slot_a: null,
      save_slot_b: null,
      created_at: 12345,
      updated_at: 12345,
      last_interaction_at: 12345,
    },
  ],
  blocks: [],
  neighbor_groups: [],
  neighbor_join_requests: [],
  subscriptions: [],
}, null, 2), 'utf8')
const festivalActionStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
festivalActionStore.rooms = festivalActionStore.rooms.map(room => {
  if (room.id === festival.room.id) return {
    ...room,
    state: 'running',
    running_started_at: 12340,
    members: room.members.map(member => ({ ...member, status: 'active' })),
  }
  if (room.id === labaCookpot.room.id) return {
    ...room,
    state: 'running',
    running_started_at: 12339,
    members: room.members.map(member => ({ ...member, status: 'active' })),
  }
  if (room.id === dragonBoat.room.id) return {
    ...room,
    state: 'running',
    running_started_at: 12341,
    members: room.members.map(member => ({ ...member, status: 'active' })),
  }
  if (room.id === escortConvoy.room.id) return {
    ...room,
    state: 'running',
    running_started_at: 12342,
    members: room.members.map(member => ({ ...member, status: 'active' })),
  }
  return room
})
await writeFile(roomStoreFile, JSON.stringify(festivalActionStore, null, 2), 'utf8')

const lanternActionResult = await runtime.submitFestivalRoomGameplayAction(festival.room.id, {
  action_id: 'lock_piece',
}, actor('visual_host_festival'))
assert.equal(lanternActionResult.room.gameplay.last_action_id, 'lock_piece', 'lantern fair gameplay should record object action')
assert.equal(lanternActionResult.room.visual_state.revision, 1, 'lantern fair visual revision should advance after object action')
assert.equal(lanternActionResult.room.visual_state.recent_feedback, lanternActionResult.room.gameplay.festival_state.recent_feedback, 'lantern fair visual feedback should mirror gameplay feedback')
assert.equal(lanternActionResult.room.visual_state.highlights[0]?.visual_id, 'lantern_main_lantern', 'lantern fair action should append visual highlight')
const mainLantern = lanternActionResult.room.visual_state.objects.find(object => object.id === 'lantern_main_lantern')
assert.equal(mainLantern?.state, 'busy', 'main lantern should become busy after assembly action')
assert.equal(mainLantern?.progress_value, 1, 'main lantern progress should advance after assembly action')
assert.equal(mainLantern?.handled_by, 'visual_host_festival', 'main lantern should mark the acting player')

const lanternOrderResult = await runtime.submitFestivalRoomGameplayAction(festival.room.id, {
  action_id: 'tighten_frame',
}, actor('visual_host_festival'))
assert.equal(lanternOrderResult.room.gameplay.festival_state.round_number, 2, 'two lantern fair actions should advance the festival round')
assert.equal(lanternOrderResult.room.gameplay.festival_state.round_log[0].action_id, 'round_advance', 'lantern fair round advance should be logged')

seedRewardSave('visual_host_festival')
const lanternSettledResult = await runtime.settleFestivalRoom(festival.room.id, actor('visual_host_festival'))
const lanternReceiptReplay = lanternSettledResult.overview.recent_receipts.find(receipt => receipt.room_id === festival.room.id)?.route_replay
assert.equal(lanternReceiptReplay?.kind, 'lantern_fair', 'lantern fair settlement receipt should expose memory replay')
assert.equal(lanternReceiptReplay.title, '灯会留影记录', 'lantern fair replay should use readable title')
assert.equal(lanternReceiptReplay.route_nodes.length, 6, 'lantern fair replay should preserve scene objects')
assert.ok(lanternReceiptReplay.summary.includes('灯会留影记录'), 'lantern fair replay summary should mention photo record')
assert.ok(lanternReceiptReplay.memory_records.some(record => record.type === 'main_lantern' && record.actor_username === 'visual_host_festival'), 'lantern fair replay should save who lit the main lantern')
assert.ok(lanternReceiptReplay.memory_records.some(record => record.type === 'order' && record.actor_username === 'visual_host_festival'), 'lantern fair replay should save who maintained order')
assert.ok(lanternReceiptReplay.memory_records.some(record => record.type === 'riddle' && record.summary.includes('灯谜')), 'lantern fair replay should reserve riddle memory slot')
assert.ok(lanternReceiptReplay.highlight_nodes.some(node => node.label === '点亮主灯'), 'lantern fair replay should expose main lantern highlight')

const lanternMemorialRoom = await runtime.createFestivalRoom({
  template_id: 'lantern_fair',
  gameplay_template_id: 'assembly',
  title: 'visual lantern memorial smoke',
}, actor('visual_host_lantern_memorial'))
const lanternMemorialStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
lanternMemorialStore.rooms = lanternMemorialStore.rooms.map(room => room.id === lanternMemorialRoom.room.id
  ? {
      ...room,
      state: 'running',
      running_started_at: 12343,
      members: room.members.map(member => ({ ...member, status: 'active' })),
    }
  : room
)
await writeFile(roomStoreFile, JSON.stringify(lanternMemorialStore, null, 2), 'utf8')
await runtime.submitFestivalRoomGameplayAction(lanternMemorialRoom.room.id, {
  action_id: 'lock_piece',
}, actor('visual_host_lantern_memorial'))
await runtime.submitFestivalRoomGameplayAction(lanternMemorialRoom.room.id, {
  action_id: 'tighten_frame',
}, actor('visual_host_lantern_memorial'))
seedRewardSave('visual_host_lantern_memorial')
await runtime.settleFestivalRoom(lanternMemorialRoom.room.id, actor('visual_host_lantern_memorial'))
const lanternMemorialClosedResult = await runtime.closeFestivalRoom(lanternMemorialRoom.room.id, actor('visual_host_lantern_memorial'))
assert.equal(lanternMemorialClosedResult.room.state, 'closed', 'lantern fair room should close after receipt persistence')
const lanternRewardAfterClose = readRewardSave('visual_host_lantern_memorial')
assert.equal(lanternRewardAfterClose.onlineFestivalRewards.memorials.length, 1, 'lantern fair receipt persistence should add one memorial')
assert.ok(lanternRewardAfterClose.onlineFestivalRewards.memorials[0].memory_records.some(record => record.type === 'main_lantern'), 'lantern fair memorial should retain main lantern memory')
assert.ok(lanternRewardAfterClose.onlineFestivalRewards.memorials[0].memory_records.some(record => record.type === 'order'), 'lantern fair memorial should retain order memory')
await seedFriendship('visual_host_festival', 'visual_host_lantern_memorial')
const friendMemorialOverview = runtime.listFestivalFriendMemorialOverview('visual_host_festival', {
  target_username: 'visual_host_lantern_memorial',
})
assert.equal(friendMemorialOverview.is_friend, true, 'friend memorial overview should require and report friendship')
assert.equal(friendMemorialOverview.memorials.length, 1, 'friend memorial overview should read target festival memorials')
assert.ok(friendMemorialOverview.memorials[0].memory_records.some(record => record.type === 'main_lantern'), 'friend memorial overview should expose lantern memories')
assert.throws(
  () => runtime.listFestivalFriendMemorialOverview('visual_host_expedition', { target_username: 'visual_host_lantern_memorial' }),
  /只能查看已互为好友/,
  'non-friend should not read festival memorials'
)

const lanternRiddleRoom = await runtime.createFestivalRoom({
  template_id: 'lantern_fair',
  gameplay_template_id: 'quiz_buzz',
  title: 'visual lantern riddle smoke',
}, actor('visual_host_lantern_riddle'))
const lanternRiddleStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
lanternRiddleStore.rooms = lanternRiddleStore.rooms.map(room => room.id === lanternRiddleRoom.room.id
  ? {
      ...room,
      state: 'running',
      running_started_at: 12344,
      members: room.members.map(member => ({ ...member, status: 'active' })),
    }
  : room
)
await writeFile(roomStoreFile, JSON.stringify(lanternRiddleStore, null, 2), 'utf8')
await runtime.submitFestivalRoomGameplayAction(lanternRiddleRoom.room.id, {
  action_id: 'buzz_correct',
}, actor('visual_host_lantern_riddle'))
seedRewardSave('visual_host_lantern_riddle')
const lanternRiddleSettledResult = await runtime.settleFestivalRoom(lanternRiddleRoom.room.id, actor('visual_host_lantern_riddle'))
const lanternRiddleReplay = lanternRiddleSettledResult.overview.recent_receipts.find(receipt => receipt.room_id === lanternRiddleRoom.room.id)?.route_replay
assert.ok(lanternRiddleReplay.memory_records.some(record => record.type === 'riddle' && record.actor_username === 'visual_host_lantern_riddle'), 'lantern fair replay should save who solved riddles')

const labaActionResult = await runtime.submitFestivalRoomGameplayAction(labaCookpot.room.id, {
  action_id: 'deliver_bundle',
}, actor('visual_host_laba'))
assert.equal(labaActionResult.room.gameplay.last_action_id, 'deliver_bundle', 'laba cookpot gameplay should record object action')
assert.equal(labaActionResult.room.visual_state.revision, 1, 'laba cookpot visual revision should advance after object action')
assert.equal(labaActionResult.room.visual_state.recent_feedback, labaActionResult.room.gameplay.festival_state.recent_feedback, 'laba cookpot visual feedback should mirror gameplay feedback')
assert.equal(labaActionResult.room.visual_state.highlights[0]?.visual_id, 'laba_cookpot_ingredient_basket', 'laba cookpot action should append visual highlight')
assertLabaCookpotVisualObjects(labaActionResult.room, 1, {
  expectedHandledObjectId: 'laba_cookpot_ingredient_basket',
  expectedHandledBy: 'visual_host_laba',
})

const dragonActionResult = await runtime.submitFestivalRoomGameplayAction(dragonBoat.room.id, {
  action_id: 'sync_oar',
}, actor('visual_host_dragon'))
assert.equal(dragonActionResult.room.gameplay.last_action_id, 'sync_oar', 'dragon boat gameplay should record track action')
assert.ok(dragonActionResult.room.gameplay.last_action_summary.includes('划桨'), 'dragon boat action summary should use paddle label')
assert.equal(dragonActionResult.room.visual_state.revision, 1, 'dragon boat visual revision should advance after track action')
assert.equal(dragonActionResult.room.visual_state.recent_feedback, dragonActionResult.room.gameplay.festival_state.recent_feedback, 'dragon boat visual feedback should mirror gameplay feedback')
assert.equal(dragonActionResult.room.visual_state.highlights[0]?.visual_id, dragonActionResult.room.visual_state.selected_visual_id, 'dragon boat action should append highlight on the selected cell')
assertDragonBoatVisualTrack(dragonActionResult.room, 1, {
  minPosition: 1,
  expectedLastAction: 'sync_oar',
  expectSelectedOccupied: true,
})

const dragonAdvancedResult = await runtime.submitFestivalRoomGameplayAction(dragonBoat.room.id, {
  action_id: 'steady_rudder',
}, actor('visual_host_dragon'))
assert.equal(dragonAdvancedResult.room.gameplay.festival_state.round_number, 2, 'two dragon boat actions should advance the festival round')
assert.equal(dragonAdvancedResult.room.gameplay.festival_state.round_log[0].action_id, 'round_advance', 'dragon boat round advance should be logged')
assert.ok(
  dragonAdvancedResult.room.gameplay.contributions.find(item => item.username === 'visual_host_dragon')?.last_action_label.includes('稳舵'),
  'dragon boat contribution should use rudder label'
)
assertDragonBoatVisualTrack(dragonAdvancedResult.room, null, {
  minRevision: 2,
  minPosition: 2,
  expectedLastAction: 'steady_rudder',
  expectSelectedOccupied: true,
})

seedRewardSave('visual_host_dragon')
const dragonRewardBeforeClose = readRewardSave('visual_host_dragon')
const dragonSettledResult = await runtime.settleFestivalRoom(dragonBoat.room.id, actor('visual_host_dragon'))
const dragonReceiptReplay = dragonSettledResult.overview.recent_receipts.find(receipt => receipt.room_id === dragonBoat.room.id)?.route_replay
assert.equal(dragonReceiptReplay?.kind, 'dragon_boat', 'dragon boat settlement receipt should expose route replay')
assert.equal(dragonReceiptReplay.title, '端午赛舟成绩单', 'dragon boat route replay should use readable title')
assert.equal(dragonReceiptReplay.route_nodes.length, 8, 'dragon boat replay should preserve the whole river track')
assert.deepEqual(dragonReceiptReplay.route_nodes.map(node => node.id), [
  'dragon_boat_start',
  'dragon_boat_drum_window',
  'dragon_boat_cross_current',
  'dragon_boat_first_turn',
  'dragon_boat_calm_lane',
  'dragon_boat_sprint_lane',
  'dragon_boat_return_wave',
  'dragon_boat_finish',
], 'dragon boat replay should keep stable river order')
assert.ok(dragonReceiptReplay.highlight_nodes.length > 0, 'dragon boat replay should keep action highlights')
assert.ok(dragonReceiptReplay.risk_peak.value >= 2, 'dragon boat replay should record pressure peak')
assert.ok(dragonReceiptReplay.member_contributions.some(item => item.username === 'visual_host_dragon'), 'dragon boat replay should include member contribution')
assert.equal(dragonReceiptReplay.race_result.mode, 'race', 'dragon boat should settle as multi-team race mode')
assert.equal(dragonReceiptReplay.race_result.rank, 1, 'dragon boat replay should record a rank')
assert.equal(dragonReceiptReplay.race_result.title_label, '赛舟领桨手', 'dragon boat replay should record title target')
assert.ok(dragonReceiptReplay.race_result.popularity_bonus > 0, 'dragon boat replay should generate festival popularity bonus')
assert.equal(dragonReceiptReplay.race_result.team_count, 3, 'default dragon boat should settle three race lane teams')
assert.equal(dragonReceiptReplay.race_rankings.length, 3, 'dragon boat replay should include race lane ranking rows')
assert.ok(dragonReceiptReplay.race_rankings.some(item => item.team_id === 'team_dragon_boat'), 'dragon boat ranking should include the room team')
const dragonSettledSnapshotReceipt = dragonSettledResult.room.settlement_receipts.find(receipt => receipt.target_username === 'visual_host_dragon')
assert.equal(dragonSettledSnapshotReceipt?.route_replay?.kind, 'dragon_boat', 'room snapshot dragon boat receipt should include route replay')
const dragonSettlementStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
const dragonStoredReceipt = dragonSettlementStore.receipts.find(receipt => receipt.room_id === dragonBoat.room.id && receipt.target_username === 'visual_host_dragon')
assert.ok(dragonStoredReceipt?.idempotency_key, 'dragon boat stored receipt should keep idempotency key')
const dragonRewardMoney = Math.max(0, Math.floor(Number(dragonStoredReceipt.reward_payload?.money) || 0))
const dragonRewardTickets = Math.max(0, Math.floor(Number(dragonStoredReceipt.reward_breakdown?.memorial_ticket_quantity) || 0))
const dragonRewardDecoration = dragonStoredReceipt.reward_breakdown?.decoration_reward || {}

const dragonClosedResult = await runtime.closeFestivalRoom(dragonBoat.room.id, actor('visual_host_dragon'))
assert.equal(dragonClosedResult.room.state, 'closed', 'dragon boat room should close after receipt persistence')
const dragonRewardAfterClose = readRewardSave('visual_host_dragon')
assert.equal(dragonRewardAfterClose.player.money, dragonRewardBeforeClose.player.money + dragonRewardMoney, 'first receipt persistence should add dragon boat money once')
assert.equal(dragonRewardAfterClose.wallet.rewardTickets.festival, dragonRewardTickets, 'first receipt persistence should add festival tickets once')
assert.equal(dragonRewardAfterClose.wallet.rewardTicketLifetimeEarned.festival, dragonRewardTickets, 'first receipt persistence should add lifetime festival tickets once')
assert.equal(Object.keys(dragonRewardAfterClose.onlineFestivalRewards.appliedReceipts).length, 1, 'first receipt persistence should record one applied receipt key')
assert.ok(dragonRewardAfterClose.onlineFestivalRewards.appliedReceipts[dragonStoredReceipt.idempotency_key], 'applied receipt key should match settlement idempotency key')
assert.equal(dragonRewardAfterClose.onlineFestivalRewards.memorials.length, 1, 'first receipt persistence should add one memorial')
if (dragonRewardDecoration.decoration_id) {
  assert.equal(
    dragonRewardAfterClose.decoration.owned[dragonRewardDecoration.decoration_id],
    Math.max(0, Math.floor(Number(dragonRewardDecoration.quantity) || 0)),
    'first receipt persistence should add decoration once'
  )
}

const replayStore = JSON.parse(await readFile(roomStoreFile, 'utf8'))
replayStore.rooms = replayStore.rooms.map(room => room.id === dragonBoat.room.id
  ? {
      ...room,
      state: 'settling',
      state_message: 'QA replaying the same persisted receipt',
      closed_at: 0,
    }
  : room
)
replayStore.receipts = replayStore.receipts.map(receipt => receipt.id === dragonStoredReceipt.id
  ? {
      ...receipt,
      status: 'pending_persist',
      reward_result: '',
      persisted_at: 0,
    }
  : receipt
)
await writeFile(roomStoreFile, JSON.stringify(replayStore, null, 2), 'utf8')

const dragonReplayResult = await runtime.retryAdminActivityRoomSettlement(dragonBoat.room.id)
assert.equal(dragonReplayResult.room.state, 'closed', 'admin settlement retry should close replayed dragon boat room')
const dragonRewardAfterReplay = readRewardSave('visual_host_dragon')
assert.equal(dragonRewardAfterReplay.player.money, dragonRewardAfterClose.player.money, 'replayed receipt should not add money twice')
assert.equal(dragonRewardAfterReplay.wallet.rewardTickets.festival, dragonRewardAfterClose.wallet.rewardTickets.festival, 'replayed receipt should not add festival tickets twice')
assert.equal(dragonRewardAfterReplay.wallet.rewardTicketLifetimeEarned.festival, dragonRewardAfterClose.wallet.rewardTicketLifetimeEarned.festival, 'replayed receipt should not add lifetime festival tickets twice')
assert.equal(Object.keys(dragonRewardAfterReplay.onlineFestivalRewards.appliedReceipts).length, 1, 'replayed receipt should not create duplicate applied receipt keys')
assert.equal(dragonRewardAfterReplay.onlineFestivalRewards.memorials.length, 1, 'replayed receipt should not duplicate memorials')
if (dragonRewardDecoration.decoration_id) {
  assert.equal(
    dragonRewardAfterReplay.decoration.owned[dragonRewardDecoration.decoration_id],
    dragonRewardAfterClose.decoration.owned[dragonRewardDecoration.decoration_id],
    'replayed receipt should not duplicate decoration rewards'
  )
}

const overview = await runtime.listExpeditionRoomOverview('visual_host_expedition')
assertCavernVisualNodes(overview.my_room, 0)

const actionExpedition = await runtime.createExpeditionRoom({
  template_id: 'cavern_duo',
  gameplay_template_id: 'expedition_cavern',
  title: 'visual expedition action smoke',
}, actor('visual_action_host'))
assertCavernVisualNodes(actionExpedition.room, 0)

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
assert.ok(advancedResult.room.gameplay.cavern_state.combo_records.some(record => record.combo_id === 'route_then_mine'), 'cavern should record node combo benefits after route and mine actions')
assert.ok(advancedResult.room.gameplay.cavern_state.combo_records[0]?.summary.includes('补给'), 'cavern combo record should explain resource benefit')

const withdrawalResult = await runtime.submitExpeditionRoomGameplayAction(actionExpedition.room.id, {
  action_id: 'confirm_withdrawal',
}, actor('visual_action_host'))
assert.equal(withdrawalResult.room.gameplay.phase, 'completed', 'cavern withdrawal should complete the gameplay phase early')
assert.equal(withdrawalResult.room.gameplay.cavern_state.withdrawal_state, 'confirmed', 'cavern should record confirmed withdrawal state')
assert.ok(withdrawalResult.room.gameplay.cavern_state.withdrawal_summary.includes('提前撤离'), 'cavern withdrawal should expose readable summary')
const withdrawalNode = withdrawalResult.room.visual_state.nodes.find(node => node.id === 'cavern_exit')
assert.equal(withdrawalNode?.state, 'resolved', 'withdrawal action should resolve the exit node')
assert.deepEqual(withdrawalNode?.available_action_ids, [], 'resolved exit node should stop offering withdrawal action')

const settledResult = await runtime.settleExpeditionRoom(actionExpedition.room.id, actor('visual_action_host'))
const receiptReplay = settledResult.overview.recent_receipts.find(receipt => receipt.room_id === actionExpedition.room.id)?.route_replay
assert.equal(receiptReplay?.kind, 'expedition_cavern', 'cavern settlement receipt should expose route replay')
assert.equal(receiptReplay.title, '矿洞探索记录', 'cavern route replay should use readable title')
assert.deepEqual(receiptReplay.route_nodes.map(node => node.id), [
  'cavern_entrance',
  'cavern_ore_vein',
  'cavern_route_marker',
  'cavern_exit',
], 'cavern route replay should preserve explored route order')
assert.ok(receiptReplay.highlight_nodes.length > 0, 'cavern route replay should keep highlight nodes')
assert.ok(receiptReplay.risk_peak.value >= 3, 'cavern route replay should record risk peak')
assert.ok(receiptReplay.summary.includes('组合收益'), 'cavern route replay should mention node combo benefits')
assert.ok(receiptReplay.summary.includes('提前撤离'), 'cavern route replay should mention early withdrawal closure')
assert.ok(receiptReplay.combo_records.some(record => record.combo_id === 'route_then_mine'), 'cavern route replay should expose structured node combo records')
assert.ok(receiptReplay.combo_records[0]?.resource_delta_text, 'cavern route replay combo records should include readable resource deltas')
assert.equal(receiptReplay.withdrawal_state, 'confirmed', 'cavern route replay should expose structured withdrawal state')
assert.equal(receiptReplay.withdrawal_actor_username, 'visual_action_host', 'cavern route replay should preserve withdrawal actor')
assert.ok(receiptReplay.member_contributions.some(item => item.username === 'visual_action_host'), 'cavern route replay should include member contribution')
const settledSnapshotReceipt = settledResult.room.settlement_receipts.find(receipt => receipt.target_username === 'visual_action_host')
assert.equal(settledSnapshotReceipt?.route_replay?.kind, 'expedition_cavern', 'room snapshot settlement receipt should include route replay')

const escortActionResult = await runtime.submitExpeditionRoomGameplayAction(escortConvoy.room.id, {
  action_id: 'escort_step',
}, actor('visual_host_escort'))
assert.equal(escortActionResult.room.gameplay.last_action_id, 'escort_step', 'escort convoy gameplay should record track action')
assert.equal(escortActionResult.room.visual_state.revision, 1, 'escort convoy visual revision should advance after track action')
assert.equal(escortActionResult.room.visual_state.recent_feedback, escortActionResult.room.gameplay.last_action_summary, 'escort convoy visual feedback should mirror gameplay feedback')
assert.equal(escortActionResult.room.visual_state.highlights[0]?.visual_id, escortActionResult.room.visual_state.selected_visual_id, 'escort convoy action should append highlight on the selected cell')
assertEscortConvoyVisualTrack(escortActionResult.room, 1, {
  minPosition: 1,
  expectedLastAction: 'escort_step',
})

const escortSettledResult = await runtime.settleExpeditionRoom(escortConvoy.room.id, actor('visual_host_escort'))
const escortReceiptReplay = escortSettledResult.overview.recent_receipts.find(receipt => receipt.room_id === escortConvoy.room.id)?.route_replay
assert.equal(escortReceiptReplay?.kind, 'escort_convoy', 'escort convoy settlement receipt should expose route replay')
assert.equal(escortReceiptReplay.title, '商队护送记录', 'escort convoy route replay should use readable title')
assert.equal(escortReceiptReplay.route_nodes.length, 6, 'escort convoy replay should preserve the whole route')
assert.deepEqual(escortReceiptReplay.route_nodes.map(node => node.id), [
  'escort_convoy_gate',
  'escort_convoy_forest_road',
  'escort_convoy_broken_cart',
  'escort_convoy_waystation',
  'escort_convoy_night_watch',
  'escort_convoy_delivery',
], 'escort convoy replay should keep stable route order')
assert.ok(escortReceiptReplay.highlight_nodes.length > 0, 'escort convoy replay should keep action highlights')
assert.ok(escortReceiptReplay.risk_peak.value >= 0, 'escort convoy replay should record route risk')
assert.ok(escortReceiptReplay.member_contributions.some(item => item.username === 'visual_host_escort'), 'escort convoy replay should include member contribution')
const escortSettledSnapshotReceipt = escortSettledResult.room.settlement_receipts.find(receipt => receipt.target_username === 'visual_host_escort')
assert.equal(escortSettledSnapshotReceipt?.route_replay?.kind, 'escort_convoy', 'room snapshot escort convoy receipt should include route replay')

const stored = JSON.parse(await readFile(roomStoreFile, 'utf8'))
stored.rooms = stored.rooms.map(room => {
  const nextRoom = { ...room }
  delete nextRoom.visual_state
  return nextRoom
})
await writeFile(roomStoreFile, JSON.stringify(stored, null, 2), 'utf8')

const legacyOverview = await runtime.listFestivalRoomOverview('visual_host_festival')
assertLanternFairVisualObjects(legacyOverview.my_room, 0, { expectInitialStates: false })

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
  if (room.id !== trackFixtureRoom.room.id) return room
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

const objectOverview = await runtime.listFestivalRoomOverview('visual_host_track_fixture')
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
  if (room.id !== trackFixtureRoom.room.id) return room
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

const trackOverview = await runtime.listFestivalRoomOverview('visual_host_track_fixture')
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
