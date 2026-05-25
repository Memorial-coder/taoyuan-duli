const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const {
  createError,
  findSaveIdentityById,
  getActiveSaveContext,
  getActiveSaveSlot,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_ACTIVITY_ROOM_FILE = path.join(DATA_DIR, 'taoyuan_activity_rooms.json');

const ROOM_STATES = Object.freeze(['created', 'inviting', 'ready_check', 'countdown', 'running', 'paused', 'settling', 'closed', 'aborted']);
const MEMBER_STATES = Object.freeze(['invited', 'joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting', 'finished', 'settled', 'left', 'kicked']);
const INVITATION_STATES = Object.freeze(['pending', 'accepted', 'rejected']);
const RECEIPT_STATES = Object.freeze(['created', 'persist_preview', 'pending_persist', 'persisted', 'compensation_pending']);
const EVENT_LIMIT = 40;
const RECEIPT_LIMIT = 60;
const DEFAULT_COUNTDOWN_SECONDS = 6;
const DEFAULT_RECONNECT_WINDOW_SECONDS = 90;
const GAMEPLAY_PHASES = Object.freeze(['prep', 'active', 'completed']);
const ACTIVITY_DOMAINS = Object.freeze(['festival', 'expedition']);
const DEFAULT_ACTIVITY_DOMAIN = 'festival';
const FESTIVAL_REWARD_TICKET_TYPE = 'festival';
const ONLINE_VISUAL_BOARD_TYPES = Object.freeze(['map', 'scene', 'track', 'async']);
const ONLINE_VISUAL_HIGHLIGHT_TYPES = Object.freeze(['info', 'success', 'warning', 'danger', 'reward']);
const ONLINE_VISUAL_NODE_STATES = Object.freeze(['hidden', 'locked', 'available', 'active', 'resolved', 'danger', 'reward', 'exit']);
const ONLINE_VISUAL_OBJECT_STATES = Object.freeze(['idle', 'needs_action', 'busy', 'complete', 'overheated', 'blocked']);
const ONLINE_VISUAL_TRACK_CELL_KINDS = Object.freeze(['normal', 'boost', 'risk', 'turn', 'finish']);
const ONLINE_VISUAL_TRACK_TEAM_STATES = Object.freeze(['idle', 'advancing', 'retreating', 'boosted', 'blocked', 'protected', 'finished']);
const ONLINE_VISUAL_TRACK_EFFECTS = Object.freeze(['advance', 'retreat', 'boost', 'blocked', 'protect']);
const ONLINE_VISUAL_ASYNC_STAGE_STATES = Object.freeze(['locked', 'pending', 'active', 'complete']);
const ONLINE_VISUAL_ASYNC_HISTORY_TYPES = Object.freeze(['contribution', 'milestone', 'stage_complete', 'celebration']);

function resolveTargetBySaveIdOrUsername(payload = {}, emptyMessage = '请输入要邀请的玩家用户名') {
  const rawTargetSaveId = payload?.target_save_id ?? payload?.save_id;
  const hasTargetSaveId = rawTargetSaveId !== undefined && rawTargetSaveId !== null && `${rawTargetSaveId}`.trim() !== '';
  if (hasTargetSaveId) {
    const targetSaveId = Number(rawTargetSaveId);
    if (!Number.isInteger(targetSaveId)) throw createError('存档 ID 格式不正确', 400);
    const identity = findSaveIdentityById(targetSaveId);
    if (!identity) throw createError('目标存档 ID 不存在', 404);
    return {
      username: sanitizeText(identity.account_username, 40),
      identity,
    };
  }
  const username = sanitizeText(payload?.target_username, 40);
  if (!username) throw createError(emptyMessage);
  return {
    username,
    identity: null,
  };
}

const FESTIVAL_DECORATION_REWARD_MAP = Object.freeze({
  yuanri_vigil: { decoration_id: 'catalog_brazier', label: '暖炭火盆' },
  lantern_fair: { decoration_id: 'catalog_festival_lantern', label: '彩绢灯笼' },
  dragon_boat: { decoration_id: 'catalog_lotus_lamp', label: '荷灯摆台' },
  qixi_stroll: { decoration_id: 'catalog_flower_cart', label: '花市巡游车' },
  mid_autumn_moonwatch: { decoration_id: 'catalog_moon_set', label: '望月案设' },
  laba_cookpot: { decoration_id: 'catalog_incense_stand', label: '梅雪香座' },
});

const FESTIVAL_TITLE_REWARD_MAP = Object.freeze({
  yuanri_vigil: { title_id: 'festival_title_yuanri_vigil', label: '守岁同心人' },
  lantern_fair: { title_id: 'festival_title_lantern_fair', label: '灯会答魁' },
  dragon_boat: { title_id: 'festival_title_dragon_boat', label: '赛舟领桨手' },
  qixi_stroll: { title_id: 'festival_title_qixi_stroll', label: '星桥同游人' },
  mid_autumn_moonwatch: { title_id: 'festival_title_mid_autumn', label: '望月留影客' },
  laba_cookpot: { title_id: 'festival_title_laba_cookpot', label: '腊八共灶人' },
});

const ACTIVITY_DOMAIN_LABELS = Object.freeze({
  festival: 'Festival',
  expedition: 'Expedition',
});

const ACTIVITY_ROOM_BULLETINS = Object.freeze({
  festival: 'Festival rooms support create, invite, join, ready, countdown, reconnect, and per-member settlement.',
  expedition: 'Expedition rooms support squad setup, role split, supply relay, withdrawal handling, reconnect, and per-member settlement.',
});

const ACTIVITY_ROOM_ID_PREFIX = Object.freeze({
  festival: 'festival_room',
  expedition: 'expedition_room',
});

const ACTIVITY_RECEIPT_ID_PREFIX = Object.freeze({
  festival: 'festival_room_receipt',
  expedition: 'expedition_room_receipt',
});

const EXPEDITION_REWARD_ITEM_MAP = Object.freeze({
  expedition_outpost: {
    base_items: [{ item_id: 'wood', quantity: 2 }, { item_id: 'paper', quantity: 1 }],
    bonus_items: [{ item_id: 'ancient_waybill', quantity: 1 }],
  },
  cavern_duo: {
    base_items: [{ item_id: 'stone', quantity: 2 }],
    bonus_items: [{ item_id: 'ancient_waybill', quantity: 1 }],
  },
  cavern_trio: {
    base_items: [{ item_id: 'stone', quantity: 2 }, { item_id: 'paper', quantity: 1 }],
    bonus_items: [{ item_id: 'archive_rubbing', quantity: 1 }],
  },
  cavern_quartet: {
    base_items: [{ item_id: 'stone', quantity: 3 }],
    bonus_items: [{ item_id: 'ley_crystal_shard', quantity: 1 }],
  },
  gathering_line: {
    base_items: [{ item_id: 'wood', quantity: 2 }, { item_id: 'herb', quantity: 2 }],
    bonus_items: [{ item_id: 'marsh_spore_sample', quantity: 1 }],
  },
  escort_convoy: {
    base_items: [{ item_id: 'paper', quantity: 2 }, { item_id: 'wood', quantity: 1 }],
    bonus_items: [{ item_id: 'ancient_waybill', quantity: 1 }],
  },
  sea_probe: {
    base_items: [{ item_id: 'luminous_algae', quantity: 1 }],
    bonus_items: [{ item_id: 'wind_etched_core', quantity: 1 }],
  },
});

const EXPEDITION_CAVERN_RISK_MAX = 12;
const EXPEDITION_CAVERN_INITIAL_RISK = 3;
const EXPEDITION_CAVERN_ROUND_LOG_LIMIT = 24;
const EXPEDITION_CAVERN_ROUND_ACTION_TARGET = 2;

const FESTIVAL_ROUND_PRESSURE_MAX = 10;
const FESTIVAL_INITIAL_PRESSURE = 2;
const FESTIVAL_ROUND_LOG_LIMIT = 24;
const FESTIVAL_ROUND_ACTION_TARGET = 2;

const EXPEDITION_CAVERN_RESOURCE_DEFS = Object.freeze([
  { id: 'supplies', label: '补给', initial_value: 5, max_value: 8 },
  { id: 'lanterns', label: '灯火', initial_value: 3, max_value: 5 },
  { id: 'rope', label: '绳索', initial_value: 2, max_value: 4 },
  { id: 'markers', label: '路标', initial_value: 0, max_value: 6 },
]);

const EXPEDITION_CAVERN_ROLE_DEFS = Object.freeze([
  { id: 'lead', label: '领队', summary: '统筹矿点推进，可以兜底处理采集、标记和危机动作。' },
  { id: 'scout', label: '探路', summary: '负责读路、判脉和标记，优先压低未知风险。' },
  { id: 'support', label: '支护', summary: '负责绳索、支架和坍塌处理，维持队伍安全余量。' },
  { id: 'miner', label: '采集', summary: '负责矿点采样和分工采集，拉高本局采集值。' },
]);

const EXPEDITION_CAVERN_VISUAL_NODE_IDS = Object.freeze({
  entrance: 'cavern_entrance',
  crossroad: 'cavern_crossroad',
  ore: 'cavern_ore_vein',
  support: 'cavern_collapse_support',
  marker: 'cavern_route_marker',
  exit: 'cavern_exit',
});

const EXPEDITION_CAVERN_ACTION_NODE_MAP = Object.freeze({
  split_mine: EXPEDITION_CAVERN_VISUAL_NODE_IDS.ore,
  chalk_route: EXPEDITION_CAVERN_VISUAL_NODE_IDS.marker,
  stabilize_collapse: EXPEDITION_CAVERN_VISUAL_NODE_IDS.support,
});

const LANTERN_FAIR_VISUAL_OBJECT_IDS = Object.freeze({
  mainLantern: 'lantern_main_lantern',
  riddleRack: 'lantern_riddle_rack',
  colorRope: 'lantern_color_rope',
  festivalStall: 'lantern_festival_stall',
  crowd: 'lantern_crowd',
  photoSpot: 'lantern_photo_spot',
});

const LANTERN_FAIR_ACTION_OBJECT_MAP = Object.freeze({
  buzz_correct: LANTERN_FAIR_VISUAL_OBJECT_IDS.riddleRack,
  review_hint: LANTERN_FAIR_VISUAL_OBJECT_IDS.riddleRack,
  lock_piece: LANTERN_FAIR_VISUAL_OBJECT_IDS.mainLantern,
  tighten_frame: LANTERN_FAIR_VISUAL_OBJECT_IDS.colorRope,
  offer_progress: LANTERN_FAIR_VISUAL_OBJECT_IDS.festivalStall,
  raise_banner: LANTERN_FAIR_VISUAL_OBJECT_IDS.colorRope,
  sync_oar: LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd,
  steady_rudder: LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd,
  keep_beat: LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd,
  lift_applause: LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd,
  deliver_bundle: LANTERN_FAIR_VISUAL_OBJECT_IDS.festivalStall,
  sort_bundle: LANTERN_FAIR_VISUAL_OBJECT_IDS.festivalStall,
  lock_pose: LANTERN_FAIR_VISUAL_OBJECT_IDS.photoSpot,
});

const LANTERN_FAIR_EVENT_OBJECT_MAP = Object.freeze({
  riddle_wave: LANTERN_FAIR_VISUAL_OBJECT_IDS.riddleRack,
  lantern_tangle: LANTERN_FAIR_VISUAL_OBJECT_IDS.colorRope,
});

const LANTERN_FAIR_VISUAL_OBJECT_DEFS = Object.freeze([
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.mainLantern,
    label: '主灯',
    kind: 'lantern_main',
    x: 50,
    y: 18,
    progress_target: 4,
    requires_cooperation: true,
    cooperation_required_count: 2,
  },
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.riddleRack,
    label: '灯谜架',
    kind: 'riddle_rack',
    x: 24,
    y: 44,
    progress_target: 3,
  },
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.colorRope,
    label: '彩绳灯线',
    kind: 'lantern_rope',
    x: 67,
    y: 36,
    progress_target: 3,
    requires_cooperation: true,
    cooperation_required_count: 2,
  },
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.festivalStall,
    label: '节会摊位',
    kind: 'stall',
    x: 30,
    y: 72,
    progress_target: 3,
  },
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd,
    label: '人群秩序',
    kind: 'crowd',
    x: 77,
    y: 64,
    progress_target: 0,
  },
  {
    id: LANTERN_FAIR_VISUAL_OBJECT_IDS.photoSpot,
    label: '留影点',
    kind: 'photo_spot',
    x: 53,
    y: 84,
    progress_target: 2,
  },
]);

const DRAGON_BOAT_VISUAL_TRACK_ID = 'dragon_boat_river';
const DRAGON_BOAT_VISUAL_TEAM_ID = 'team_dragon_boat';
const ESCORT_CONVOY_VISUAL_TRACK_ID = 'escort_convoy_route';
const ESCORT_CONVOY_VISUAL_TEAM_ID = 'team_escort_convoy';

const DRAGON_BOAT_ACTION_EFFECT_MAP = Object.freeze({
  sync_oar: 'advance',
  steady_rudder: 'protect',
  keep_beat: 'boost',
  lift_applause: 'boost',
  lock_piece: 'advance',
  tighten_frame: 'protect',
  deliver_bundle: 'advance',
  sort_bundle: 'protect',
});

const DRAGON_BOAT_VISUAL_TRACK_CELLS = Object.freeze([
  {
    id: 'dragon_boat_start',
    label: '起点水面',
    kind: 'normal',
    event_id: 'dragon_boat_start',
    effect_ids: ['advance'],
    action_ids: ['sync_oar', 'steady_rudder', 'lock_piece', 'deliver_bundle'],
    reward_preview: '全船从起点压住第一拍，安全推进。',
  },
  {
    id: 'dragon_boat_drum_window',
    label: '鼓点窗口',
    kind: 'boost',
    event_id: 'drum_shift',
    effect_ids: ['advance', 'boost'],
    action_ids: ['sync_oar', 'keep_beat', 'lift_applause'],
    reward_preview: '命中鼓点会带来额外喝彩和更快推进。',
  },
  {
    id: 'dragon_boat_cross_current',
    label: '横流水口',
    kind: 'risk',
    event_id: 'cross_current',
    effect_ids: ['blocked', 'protect'],
    action_ids: ['steady_rudder', 'sort_bundle'],
    risk_preview: '横流会抬高压力，稳舵可以保护下一拍。',
  },
  {
    id: 'dragon_boat_first_turn',
    label: '入弯水道',
    kind: 'turn',
    event_id: 'cross_current',
    effect_ids: ['protect'],
    action_ids: ['steady_rudder', 'tighten_frame'],
    risk_preview: '弯道需要先稳住船头，避免乱桨。',
  },
  {
    id: 'dragon_boat_calm_lane',
    label: '平水直道',
    kind: 'normal',
    event_id: 'dragon_boat_calm_lane',
    effect_ids: ['advance'],
    action_ids: ['sync_oar', 'deliver_bundle', 'lock_piece'],
    reward_preview: '平水段适合把队伍节奏重新拉齐。',
  },
  {
    id: 'dragon_boat_sprint_lane',
    label: '冲刺水道',
    kind: 'boost',
    event_id: 'drum_shift',
    effect_ids: ['advance', 'boost'],
    action_ids: ['sync_oar', 'keep_beat', 'lift_applause', 'raise_banner'],
    risk_preview: '连续冲刺会让压力升高。',
    reward_preview: '冲刺段会明显提高赛舟表现。',
  },
  {
    id: 'dragon_boat_return_wave',
    label: '回浪夹道',
    kind: 'risk',
    event_id: 'cross_current',
    effect_ids: ['blocked', 'protect'],
    action_ids: ['steady_rudder', 'sort_bundle'],
    risk_preview: '回浪会干扰船身，稳住节奏能避免受阻。',
  },
  {
    id: 'dragon_boat_finish',
    label: '终点线',
    kind: 'finish',
    event_id: 'dragon_boat_finish',
    effect_ids: ['advance'],
    action_ids: [],
    reward_preview: '抵达终点后仍由服务端结算凭证发放奖励。',
  },
]);

const ESCORT_CONVOY_ACTION_EFFECT_MAP = Object.freeze({
  escort_step: 'advance',
  stabilize_cargo: 'protect',
  answer_incident: 'blocked',
});

const ESCORT_CONVOY_VISUAL_TRACK_CELLS = Object.freeze([
  {
    id: 'escort_convoy_gate',
    label: '村口整队',
    kind: 'normal',
    event_id: 'escort_gate',
    effect_ids: ['advance'],
    action_ids: ['escort_step', 'stabilize_cargo'],
    reward_preview: '从村口稳稳出发，护送里程开始计入结算凭证。',
  },
  {
    id: 'escort_convoy_forest_road',
    label: '林道转弯',
    kind: 'turn',
    event_id: 'escort_forest_road',
    effect_ids: ['advance', 'protect'],
    action_ids: ['escort_step', 'stabilize_cargo'],
    risk_preview: '林道转弯容易颠散货物，稳固货物能保护完整度。',
  },
  {
    id: 'escort_convoy_broken_cart',
    label: '车轴异响',
    kind: 'risk',
    event_id: 'escort_broken_cart',
    effect_ids: ['blocked', 'protect'],
    action_ids: ['answer_incident', 'stabilize_cargo'],
    risk_preview: '途中事件若无人处理，车队会被迫停顿。',
    reward_preview: '及时应对能把危机压成可回看的护送节点。',
  },
  {
    id: 'escort_convoy_waystation',
    label: '驿站补给',
    kind: 'boost',
    event_id: 'escort_waystation',
    effect_ids: ['advance', 'boost'],
    action_ids: ['escort_step', 'answer_incident'],
    reward_preview: '驿站适合重新整队，让后半段推进更稳。',
  },
  {
    id: 'escort_convoy_night_watch',
    label: '夜宿巡看',
    kind: 'risk',
    event_id: 'escort_night_watch',
    effect_ids: ['blocked', 'protect'],
    action_ids: ['answer_incident', 'stabilize_cargo'],
    risk_preview: '夜宿段需要有人巡看，避免货箱被雨水和小贼影响。',
  },
  {
    id: 'escort_convoy_delivery',
    label: '抵达交付',
    kind: 'finish',
    event_id: 'escort_delivery',
    effect_ids: ['advance'],
    action_ids: [],
    reward_preview: '抵达后仍由服务端结算凭证发放远征奖励，前端只做回看。',
  },
]);

const FESTIVAL_RESOURCE_DEFS = Object.freeze([
  { id: 'cheer', label: '喝彩', initial_value: 2, max_value: 8 },
  { id: 'order', label: '秩序', initial_value: 4, max_value: 8 },
  { id: 'supplies', label: '物资', initial_value: 4, max_value: 8 },
  { id: 'memory', label: '留影', initial_value: 0, max_value: 6 },
]);

const FESTIVAL_ROLE_DEFS = Object.freeze([
  { id: 'caller', label: '领场', summary: '负责把本回合节奏讲清楚，可以兜底处理其它职责动作。' },
  { id: 'rhythm', label: '合拍', summary: '负责同步动作、鼓点和队伍节奏，让多人选择落在同一拍上。' },
  { id: 'craft', label: '筹备', summary: '负责材料、布景和临场布置，把节会进度稳稳推进。' },
  { id: 'scribe', label: '记录', summary: '负责题签、留影和收尾记录，让本局高光能被回看。' },
]);

const EXPEDITION_CAVERN_ROUND_EVENTS = Object.freeze([
  {
    id: 'fork_echo',
    label: '回声岔路',
    summary: '前方出现三条回音相近的岔路，队伍需要先确认哪条路能安全返回。',
    risk_hint: '路线误判会抬高后续风险，探路或标记动作更容易命中。',
    resource_hint: '路标越多，后续撤离越稳。',
    combo_tags: ['survey', 'route'],
    combo_bonus: {
      score_delta: 1,
      risk_delta: -1,
      resource_delta: { markers: 1 },
      summary: '路线判断命中，额外留下 1 个路标并压低风险。',
    },
  },
  {
    id: 'loose_ceiling',
    label: '松顶回落',
    summary: '头顶碎石开始松动，支护位需要判断是先稳住顶板还是继续采样。',
    risk_hint: '忽视支护会让风险更快堆高。',
    resource_hint: '绳索和补给会被消耗，但可以换来安全窗口。',
    combo_tags: ['support', 'collapse'],
    combo_bonus: {
      score_delta: 1,
      risk_delta: -2,
      summary: '支护正中塌落点，风险额外下降。',
    },
  },
  {
    id: 'dark_lode',
    label: '暗脉显影',
    summary: '灯火扫过岩壁时露出一条暗色矿脉，采集动作能带来更高收益。',
    risk_hint: '贪采会带来噪音和震动，采集后最好有人收稳局面。',
    resource_hint: '补给会被消耗，路标可以避免绕路。',
    combo_tags: ['mine', 'ore'],
    combo_bonus: {
      score_delta: 2,
      resource_delta: { supplies: 1 },
      summary: '暗脉采样完整，队伍回收了 1 份可用补给。',
    },
  },
  {
    id: 'flooded_rut',
    label: '积水旧轨',
    summary: '旧矿轨被积水截断，继续深入前要决定绕路、搭绳还是强行推进。',
    risk_hint: '强推会更危险，路线和支护组合收益更高。',
    resource_hint: '绳索回收得当可以支撑下一轮危机。',
    combo_tags: ['route', 'support'],
    combo_bonus: {
      risk_delta: -1,
      resource_delta: { rope: 1 },
      summary: '绳路绕开积水，回收 1 段可复用绳索。',
    },
  },
  {
    id: 'thin_air',
    label: '闷风薄氧',
    summary: '深处空气变闷，队伍需要分清是通风口还是封闭死路。',
    risk_hint: '提前探路和支护都能降低突发风险。',
    resource_hint: '灯火越低，后续判断会越吃力。',
    combo_tags: ['survey', 'support'],
    combo_bonus: {
      risk_delta: -1,
      score_delta: 1,
      summary: '提前判断出通风方向，队伍行动更稳。',
    },
  },
]);

const FESTIVAL_ROUND_EVENTS_BY_TEMPLATE = Object.freeze({
  yuanri_vigil: [
    {
      id: 'vigil_flame',
      label: '守岁灯火',
      summary: '长桌灯火忽明忽暗，队伍要决定先稳住秩序还是把节饰挂上去。',
      pressure_hint: '抢推进会抬高场面压力，领场和筹备动作更容易把局面收稳。',
      resource_hint: '秩序越高，后续守岁回合越不容易乱。',
      combo_tags: ['ceremony', 'setup'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { order: 1 }, summary: '开场布置命中节奏，守岁席位稳了下来。' },
    },
    {
      id: 'guest_arrival',
      label: '宾客入席',
      summary: '几位迟到的乡民挤进席间，需要有人接住问候，也要有人继续推进筹备。',
      pressure_hint: '忽视人群会让场面压力上升。',
      resource_hint: '喝彩和秩序可以把临场小插曲变成热闹场面。',
      combo_tags: ['crowd', 'order'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { cheer: 1 }, summary: '人群被顺利带入节奏，反而多了一阵喝彩。' },
    },
  ],
  lantern_fair: [
    {
      id: 'riddle_wave',
      label: '灯谜连发',
      summary: '灯谜摊前忽然聚起一圈人，抢答和整理题签需要有人分头处理。',
      pressure_hint: '连续抢答会让场面更热，也更容易乱。',
      resource_hint: '秩序能让灯谜节奏不被打断。',
      combo_tags: ['quiz', 'hint'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { order: 1 }, summary: '题签整理得当，下一轮抢答更顺。' },
    },
    {
      id: 'lantern_tangle',
      label: '花灯缠线',
      summary: '一排花灯被风吹乱，拼装和加固动作会直接影响灯会观感。',
      pressure_hint: '强行加速会消耗物资，也可能让压力上升。',
      resource_hint: '物资和秩序决定这一轮能不能漂亮收尾。',
      combo_tags: ['craft', 'setup'],
      combo_bonus: { score_delta: 1, resource_delta: { memory: 1 }, summary: '花灯重新排齐，留下了一处好看的留影点。' },
    },
  ],
  dragon_boat: [
    {
      id: 'drum_shift',
      label: '鼓点换拍',
      summary: '鼓手突然切换节奏，桨手要同步动作，领场也要稳住船头判断。',
      pressure_hint: '同步越快越能冲刺，但压力也会被鼓点推高。',
      resource_hint: '喝彩能推高赛舟气势，秩序能避免乱桨。',
      combo_tags: ['rhythm', 'sprint'],
      combo_bonus: { score_delta: 2, resource_delta: { cheer: 1 }, summary: '全船正好踩中换拍，岸边喝彩声压了上来。' },
    },
    {
      id: 'cross_current',
      label: '横流水口',
      summary: '船身经过一段横流，稳舵和同步动作会互相影响本轮推进。',
      pressure_hint: '没人稳节奏时，连续冲刺会让场面压力更高。',
      resource_hint: '秩序能保护下一轮冲刺窗口。',
      combo_tags: ['order', 'rhythm'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { order: 1 }, summary: '稳舵接住横流，下一拍更容易同步。' },
    },
  ],
  qixi_stroll: [
    {
      id: 'bridge_queue',
      label: '桥头排队',
      summary: '桥头人流突然变密，同游队伍要先决定是整理队形还是抓住留影窗口。',
      pressure_hint: '抢留影会带来高光，也可能让人流压力上升。',
      resource_hint: '留影值代表本局可回看的纪念瞬间。',
      combo_tags: ['order', 'memory'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { memory: 1 }, summary: '队形没有散，刚好留下一张桥头合影。' },
    },
  ],
  mid_autumn_moonwatch: [
    {
      id: 'cloud_pass',
      label: '浮云遮月',
      summary: '月光被云层遮住，队伍要判断先稳住赏月席，还是趁云开时完成留影。',
      pressure_hint: '错过窗口会让压力上升，记录动作能把高光留下来。',
      resource_hint: '留影和喝彩会影响这一局的纪念感。',
      combo_tags: ['memory', 'performance'],
      combo_bonus: { score_delta: 1, resource_delta: { memory: 1, cheer: 1 }, summary: '云开的一刻被完整记录，席间响起喝彩。' },
    },
    {
      id: 'poem_turn',
      label: '轮诗接句',
      summary: '赏月席开始轮诗接句，表演节拍和公共筹备要配合起来。',
      pressure_hint: '连续带气氛会热闹，但需要有人把节奏压稳。',
      resource_hint: '秩序和喝彩一起决定接句是否顺畅。',
      combo_tags: ['ceremony', 'performance'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, summary: '接句顺着月色落下，席间节奏稳定。' },
    },
  ],
  laba_cookpot: [
    {
      id: 'fire_control',
      label: '灶火起伏',
      summary: '锅边火势忽大忽小，筹备和分拣动作会决定这锅粥能不能顺利出香。',
      pressure_hint: '只顾推进会消耗物资，先稳火能降低压力。',
      resource_hint: '物资越足，后续出锅越稳。',
      combo_tags: ['supply', 'craft'],
      combo_bonus: { score_delta: 1, resource_delta: { supplies: 1 }, summary: '火候接住了，锅边又腾出一份可用物资。' },
    },
    {
      id: 'serving_wave',
      label: '分粥高峰',
      summary: '乡民开始排队领粥，队伍需要把物资、秩序和喝彩一起照看住。',
      pressure_hint: '人群越热，压力越高，整理动作能把队伍重新拉齐。',
      resource_hint: '秩序决定这一轮是否会被队伍挤乱。',
      combo_tags: ['order', 'crowd'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { cheer: 1 }, summary: '分粥队伍排顺了，热闹没有变成混乱。' },
    },
  ],
  default: [
    {
      id: 'festival_opening',
      label: '节会开场',
      summary: '房间进入节会现场，队伍需要先确认分工，再决定本回合推进方式。',
      pressure_hint: '开场选择会影响后续节奏。',
      resource_hint: '喝彩、秩序、物资和留影会共同影响这局体感。',
      combo_tags: ['setup', 'ceremony'],
      combo_bonus: { score_delta: 1, pressure_delta: -1, resource_delta: { order: 1 }, summary: '开场分工清楚，队伍行动更稳。' },
    },
  ],
});

const REWARD_INVENTORY_MAIN_CAPACITY = 24;
const REWARD_INVENTORY_TEMP_CAPACITY = 10;
const REWARD_INVENTORY_MAX_STACK = 999;
const REWARD_INVENTORY_QUALITIES = Object.freeze(['normal', 'fine', 'excellent', 'supreme']);

const ROOM_TEMPLATE_MAP = Object.freeze({
  yuanri_vigil: {
    id: 'yuanri_vigil',
    label: '元日守岁',
    summary: '适合用来承接跨年守岁、公共进度和轻协作开场。',
    default_member_limit: 4,
    opening_title: '守岁开场',
    opening_lines: ['灯火已点，众人入席。', '先确认成员到齐，再一起迎接节会开场。'],
    recommended_gameplay_template_ids: ['public_progress', 'performance'],
  },
  lantern_fair: {
    id: 'lantern_fair',
    label: '上元灯会',
    summary: '适合灯谜、点灯、巡游这类短时节会房间。',
    default_member_limit: 4,
    opening_title: '灯会点灯',
    opening_lines: ['彩灯排起，街口开始清场。', '等倒计时结束后，全员会一起进入灯会现场。'],
    recommended_gameplay_template_ids: ['quiz_buzz', 'assembly'],
  },
  dragon_boat: {
    id: 'dragon_boat',
    label: '端午赛舟',
    summary: '适合双人或多人小队的同步准备、开场倒计时与结算。',
    default_member_limit: 4,
    opening_title: '赛舟鸣鼓',
    opening_lines: ['鼓点已经就位。', '所有队员锁定后，会统一进入赛舟开场。'],
    recommended_gameplay_template_ids: ['squad_coop', 'gathering'],
  },
  qixi_stroll: {
    id: 'qixi_stroll',
    label: '七夕同游',
    summary: '适合同游、合照、轻互动和关系承接型节会房间。',
    default_member_limit: 2,
    opening_title: '同游开场',
    opening_lines: ['桥头已经挂起灯串。', '确认同行人已接入后，再一起进入夜游环节。'],
    recommended_gameplay_template_ids: ['group_photo', 'performance'],
  },
  mid_autumn_moonwatch: {
    id: 'mid_autumn_moonwatch',
    label: '中秋赏月',
    summary: '适合公共展示、共同进度和合照结算这类房间。',
    default_member_limit: 4,
    opening_title: '赏月入场',
    opening_lines: ['赏月席位已摆好。', '房间开始后，全员会统一进入赏月场景。'],
    recommended_gameplay_template_ids: ['public_progress', 'group_photo'],
  },
  laba_cookpot: {
    id: 'laba_cookpot',
    label: '腊八共煮',
    summary: '适合协作筹备、进度共享和多成员收尾结算。',
    default_member_limit: 4,
    opening_title: '共煮开灶',
    opening_lines: ['灶火已经点燃。', '待成员锁定后，就能开始统一推进节会流程。'],
    recommended_gameplay_template_ids: ['assembly', 'gathering'],
  },
  expedition_outpost: {
    domain: 'expedition',
    id: 'expedition_outpost',
    label: '远征筹备站',
    summary: '用于承接 L80 远征房间的最小闭环，先把组队、分工、补给和撤离做成可验证的活动房间。',
    default_member_limit: 4,
    opening_title: '列队出发',
    opening_lines: ['先把成员与补给锁定，再统一进入远征运行阶段。', '这一版优先跑通房间底座，不把单人远征逻辑直接硬塞进多人同步。'],
    recommended_gameplay_template_ids: ['expedition_roles', 'expedition_supply'],
  },
  cavern_duo: {
    domain: 'expedition',
    id: 'cavern_duo',
    label: '双人矿洞',
    summary: '对应 L81 的双人矿洞模板，先支持分工采集、路线标记和危机处理。',
    default_member_limit: 2,
    opening_title: '双人入洞',
    opening_lines: ['一人探路，一人记录，先把双人协作结构跑通。', '矿洞事件先按房间动作回合承接，不直接复用单人矿洞模拟。'],
    recommended_gameplay_template_ids: ['expedition_cavern'],
  },
  cavern_trio: {
    domain: 'expedition',
    id: 'cavern_trio',
    label: '三人矿洞',
    summary: '对应 L81 的三人矿洞模板，先支持三人分工和共享节点推进。',
    default_member_limit: 3,
    opening_title: '三人合围',
    opening_lines: ['前队、侧队和记录位可以通过玩法动作先锁定。', '这轮先保守落地共享进度，再决定是否深接单人矿洞逻辑。'],
    recommended_gameplay_template_ids: ['expedition_cavern'],
  },
  cavern_quartet: {
    domain: 'expedition',
    id: 'cavern_quartet',
    label: '四人矿洞',
    summary: '对应 L81 四人矿洞和 L83 护送协作之间的过渡模板。',
    default_member_limit: 4,
    opening_title: '四人扩张',
    opening_lines: ['四名成员先确认各自负责的入口、采集或危机处理位。', '玩法先用统一动作模板承接，降低回归风险。'],
    recommended_gameplay_template_ids: ['expedition_cavern', 'expedition_escort'],
  },
  gathering_line: {
    domain: 'expedition',
    id: 'gathering_line',
    label: '协作采集线',
    summary: '对应 L82 第一轮组队采集线，先接共享进度、采集结算和稀有材料协作事件。',
    default_member_limit: 4,
    opening_title: '采集组队',
    opening_lines: ['前队推进，后队整理，把共享采集回合先稳定下来。', '稀有材料事件先通过玩法动作触发，不直接改动单人采集逻辑。'],
    recommended_gameplay_template_ids: ['expedition_gathering', 'expedition_supply'],
  },
  escort_convoy: {
    domain: 'expedition',
    id: 'escort_convoy',
    label: '护送抵运',
    summary: '对应 L83 护送任务、货物完整度、途中事件与护送评分的最小闭环。',
    default_member_limit: 4,
    opening_title: '整理车队',
    opening_lines: ['先确认谁护送、谁稳货、谁应对途中突发。', '货物完整度先挂在共享得分里，确保结算链路先可用。'],
    recommended_gameplay_template_ids: ['expedition_escort'],
  },
  sea_probe: {
    domain: 'expedition',
    id: 'sea_probe',
    label: '海域共探',
    summary: '对应 L84 海域共探的第一轮房间模板，先接航线分工、海况变化和海货结算。',
    default_member_limit: 4,
    opening_title: '抛缆出海',
    opening_lines: ['先把航线和海况应对的队内分工定好。', '海域玩法先复用活动房间底座，避免直接拆单人航海逻辑。'],
    recommended_gameplay_template_ids: ['expedition_sea', 'expedition_escort'],
  },
});

const GAMEPLAY_TEMPLATE_MAP = Object.freeze({
  public_progress: {
    id: 'public_progress',
    label: '公共进度',
    kind: 'shared_progress',
    summary: '所有成员共推一条节会目标，适合守岁、赏月和共煮这类共享推进型房间。',
    objective_label: '公共进度',
    score_label: '同心值',
    default_target: 6,
    recommended_room_template_ids: ['yuanri_vigil', 'mid_autumn_moonwatch', 'laba_cookpot'],
    action_options: [
      {
        id: 'offer_progress',
        label: '提交一份筹备',
        summary: '推进公共目标 1 格，并补一点团队同心值。',
        progress_delta: 1,
        score_delta: 1,
        required_role: 'craft',
        once_per_round: true,
        pressure_delta: -1,
        resource_delta: { supplies: -1, order: 1 },
        combo_tags: ['setup', 'ceremony', 'craft'],
        round_effect: '把本回合的物资投入转成稳定进度，适合先把节会局面压稳。',
      },
      {
        id: 'raise_banner',
        label: '补挂节饰',
        summary: '一次推进 2 格，适合冲刺收尾。',
        progress_delta: 2,
        score_delta: 1,
        required_role: 'caller',
        once_per_round: true,
        pressure_delta: 1,
        resource_delta: { cheer: 1, supplies: -1 },
        combo_tags: ['ceremony', 'crowd'],
        round_effect: '用领场动作把场面拉热，推进更快，但会抬高一点临场压力。',
      },
    ],
  },
  squad_coop: {
    id: 'squad_coop',
    label: '小队协作',
    kind: 'team_combo',
    summary: '强调多人分工与节奏配合，适合赛舟、巡游护送和多人接力场景。',
    objective_label: '协作节点',
    score_label: '默契值',
    default_target: 6,
    recommended_room_template_ids: ['dragon_boat', 'yuanri_vigil', 'laba_cookpot'],
    action_options: [
      {
        id: 'sync_oar',
        label: '同步动作',
        summary: '推进 1 个协作节点，并提升 2 点默契值。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'rhythm',
        once_per_round: true,
        pressure_delta: 1,
        resource_delta: { cheer: 1, order: -1 },
        combo_tags: ['rhythm', 'sprint'],
        round_effect: '把多人动作锁到同一拍，能拉高默契和喝彩，但需要队友后续稳住秩序。',
      },
      {
        id: 'steady_rudder',
        label: '补稳节奏',
        summary: '推进 1 个协作节点，并补 1 点稳态分。',
        progress_delta: 1,
        score_delta: 1,
        required_role: 'caller',
        once_per_round: true,
        pressure_delta: -1,
        resource_delta: { order: 1 },
        combo_tags: ['order', 'rhythm'],
        round_effect: '把上一轮的热度收回队伍节奏，降低压力并保护下一次冲刺窗口。',
      },
    ],
  },
  quiz_buzz: {
    id: 'quiz_buzz',
    label: '抢答',
    kind: 'quiz',
    summary: '用短轮次的抢答推进节会气氛，适合灯谜、问答和节气小知识房间。',
    objective_label: '答对题目',
    score_label: '答题分',
    default_target: 3,
    recommended_room_template_ids: ['lantern_fair', 'yuanri_vigil'],
    action_options: [
      {
        id: 'buzz_correct',
        label: '抢答得分',
        summary: '答对当前题目，推进 1 轮并拿到 2 点答题分。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'caller',
        once_per_round: true,
        pressure_delta: 1,
        resource_delta: { cheer: 1, order: -1 },
        combo_tags: ['quiz', 'crowd'],
        round_effect: '抢下本轮高光并带动观众，适合需要快速推进时使用。',
      },
      {
        id: 'review_hint',
        label: '整理题签',
        summary: '不推进轮次，但可以先补 1 点场面分。',
        progress_delta: 0,
        score_delta: 1,
        required_role: 'scribe',
        once_per_round: true,
        pressure_delta: -1,
        resource_delta: { order: 1 },
        combo_tags: ['hint', 'order'],
        round_effect: '把题签和提示整理清楚，让队友下一次抢答更稳。',
      },
    ],
  },
  assembly: {
    id: 'assembly',
    label: '拼装',
    kind: 'assembly',
    summary: '把多人贡献收成部件拼装进度，适合花灯、灶台、龙舟和布景搭建。',
    objective_label: '拼装部件',
    score_label: '工整度',
    default_target: 4,
    recommended_room_template_ids: ['lantern_fair', 'laba_cookpot', 'dragon_boat'],
    action_options: [
      {
        id: 'lock_piece',
        label: '拼上一块',
        summary: '推进 1 个拼装部件，并增加 1 点工整度。',
        progress_delta: 1,
        score_delta: 1,
        required_role: 'craft',
        once_per_round: true,
        pressure_delta: 0,
        resource_delta: { supplies: -1, memory: 1 },
        combo_tags: ['craft', 'setup'],
        round_effect: '把材料落到可见部件上，稳定推进并留下可回看的布景节点。',
      },
      {
        id: 'tighten_frame',
        label: '加固结构',
        summary: '推进 2 个部件，但只增加 1 点工整度。',
        progress_delta: 2,
        score_delta: 1,
        required_role: 'caller',
        once_per_round: true,
        pressure_delta: -1,
        resource_delta: { order: 1, supplies: -1 },
        combo_tags: ['craft', 'order'],
        round_effect: '牺牲一点物资换来结构稳定，适合队伍准备冲刺前使用。',
      },
    ],
  },
  gathering: {
    id: 'gathering',
    label: '采集',
    kind: 'gathering',
    summary: '让房间在短时间内积累采集回合，适合备料、巡游补给和节前收集。',
    objective_label: '采集回合',
    score_label: '丰收值',
    default_target: 5,
    recommended_room_template_ids: ['dragon_boat', 'laba_cookpot', 'mid_autumn_moonwatch'],
    action_options: [
      {
        id: 'deliver_bundle',
        label: '送回一篮',
        summary: '推进 1 个采集回合，并带回 1 点丰收值。',
        progress_delta: 1,
        score_delta: 1,
        required_role: 'craft',
        once_per_round: true,
        pressure_delta: 0,
        resource_delta: { supplies: 1 },
        combo_tags: ['supply', 'craft'],
        round_effect: '把本回合需要的材料送回现场，给后续动作补足物资余量。',
      },
      {
        id: 'sort_bundle',
        label: '快速分拣',
        summary: '推进 1 个采集回合，并额外补 2 点整理分。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'scribe',
        once_per_round: true,
        pressure_delta: -1,
        resource_delta: { order: 1 },
        combo_tags: ['order', 'supply'],
        round_effect: '把采集物资分清用途，降低队友下一步选择成本。',
      },
    ],
  },
  performance: {
    id: 'performance',
    label: '表演',
    kind: 'performance',
    summary: '把成员动作收成一段节奏或演出条，适合守岁、巡游、同游和赏月演出。',
    objective_label: '表演节拍',
    score_label: '喝彩值',
    default_target: 6,
    recommended_room_template_ids: ['yuanri_vigil', 'qixi_stroll', 'mid_autumn_moonwatch'],
    action_options: [
      {
        id: 'keep_beat',
        label: '稳住节拍',
        summary: '推进 1 个表演节拍，并累积 2 点喝彩值。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'rhythm',
        once_per_round: true,
        pressure_delta: 0,
        resource_delta: { cheer: 1 },
        combo_tags: ['performance', 'rhythm'],
        round_effect: '把本回合演出落在稳定节拍上，让喝彩转成可持续推进。',
      },
      {
        id: 'lift_applause',
        label: '带动气氛',
        summary: '不推进节拍，但能把喝彩值抬高 1 点。',
        progress_delta: 0,
        score_delta: 1,
        required_role: 'caller',
        once_per_round: true,
        pressure_delta: 1,
        resource_delta: { cheer: 2, order: -1 },
        combo_tags: ['performance', 'crowd'],
        round_effect: '把观众情绪抬起来，能制造高光，但需要队友把场面接稳。',
      },
    ],
  },
  group_photo: {
    id: 'group_photo',
    label: '合照',
    kind: 'group_photo',
    summary: '让每位成员各自锁定站位，适合七夕同游、中秋赏月和节会纪念收尾。',
    objective_label: '锁定站位',
    score_label: '留影值',
    default_target: 2,
    recommended_room_template_ids: ['qixi_stroll', 'mid_autumn_moonwatch', 'lantern_fair'],
    action_options: [
      {
        id: 'lock_pose',
        label: '锁定站位',
        summary: '每位成员各自完成一次站位锁定，站齐后即可完成合照模板。',
        progress_delta: 1,
        score_delta: 1,
        unique_per_member: true,
        required_role: 'scribe',
        pressure_delta: -1,
        resource_delta: { memory: 2 },
        combo_tags: ['memory', 'order'],
        round_effect: '把个人站位锁进合照记录，队友后续动作会看到这次留影余量。',
      },
    ],
  },
  expedition_roles: {
    domain: 'expedition',
    id: 'expedition_roles',
    label: '分工探路',
    kind: 'role_assignment',
    summary: '先把 L80 里的组队、分工、路线标记和撤离节点挂到同一套运行模板上。',
    objective_label: '分工节点',
    score_label: '协同值',
    default_target: 6,
    recommended_room_template_ids: ['expedition_outpost', 'cavern_duo', 'cavern_trio', 'cavern_quartet'],
    action_options: [
      { id: 'assign_scout', label: '前出探路', summary: '先把前队位置和风险面定下来，推进 1 格分工并增加 2 点协同值。', progress_delta: 1, score_delta: 2 },
      { id: 'mark_route', label: '路线标记', summary: '在同场信号上确认返程路线，推进 1 格结构和 1 点协同值。', progress_delta: 1, score_delta: 1 },
      { id: 'confirm_withdrawal', label: '锁定撤离点', summary: '先把撤离节点和后退路线固定，为后续收尾结算留下 1 格安全节点。', progress_delta: 1, score_delta: 1, unique_per_member: true },
    ],
  },
  expedition_supply: {
    domain: 'expedition',
    id: 'expedition_supply',
    label: '补给接力',
    kind: 'supply_chain',
    summary: '把 L80 的补给和 L82 的组队采集连成同一条行前整理链，先保证物资与收纳回包的基础闭环。',
    objective_label: '补给批次',
    score_label: '补给度',
    default_target: 5,
    recommended_room_template_ids: ['expedition_outpost', 'gathering_line'],
    action_options: [
      { id: 'deliver_rations', label: '补给到达', summary: '把房间物资推到同一个站点，推进 1 格批次和 1 点补给值。', progress_delta: 1, score_delta: 1 },
      { id: 'sort_pack', label: '整理负载', summary: '统一一次重量和包裹，推进 1 格批次和 2 点补给值。', progress_delta: 1, score_delta: 2 },
      { id: 'seal_findings', label: '封存收获', summary: '把同场收获整合回包，既是补给动作也是结算前的收稳步骤。', progress_delta: 1, score_delta: 1 },
    ],
  },
  expedition_cavern: {
    domain: 'expedition',
    id: 'expedition_cavern',
    label: '协作矿洞',
    kind: 'cavern',
    summary: '对应 L81 的双人、三人、四人矿洞模板，先做到分工采集、路线标记和危机处理的共享回合。',
    objective_label: '矿洞节点',
    score_label: '采集值',
    default_target: 6,
    recommended_room_template_ids: ['cavern_duo', 'cavern_trio', 'cavern_quartet'],
    action_options: [
      {
        id: 'split_mine',
        label: '分工采集',
        summary: '采集位切入矿脉，推进节点和采集值，但会消耗补给并抬高一点风险。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'miner',
        once_per_round: true,
        risk_delta: 1,
        resource_delta: { supplies: -1 },
        combo_tags: ['mine', 'ore'],
        round_effect: '推进矿点并制造震动，最好由标记或支护动作收稳。',
      },
      {
        id: 'chalk_route',
        label: '白路标记',
        summary: '探路位在岔口留下可回看的记号，推进路线并降低后续迷失风险。',
        progress_delta: 1,
        score_delta: 1,
        required_role: 'scout',
        once_per_round: true,
        risk_delta: -1,
        resource_delta: { lanterns: -1, markers: 1 },
        combo_tags: ['survey', 'route'],
        round_effect: '把当前路线写进队伍共享记录，让后续动作更容易触发组合收益。',
      },
      {
        id: 'stabilize_collapse',
        label: '处理危机',
        summary: '支护位处理卡坍、缝隙或坠落风险，消耗绳索换取安全窗口。',
        progress_delta: 1,
        score_delta: 2,
        required_role: 'support',
        once_per_round: true,
        risk_delta: -2,
        resource_delta: { rope: -1 },
        combo_tags: ['support', 'collapse'],
        round_effect: '压住当前风险，并为采集位创造继续深入的空间。',
      },
    ],
  },
  expedition_gathering: {
    domain: 'expedition',
    id: 'expedition_gathering',
    label: '协作采集',
    kind: 'gathering',
    summary: '对应 L82 的组队采集线，先在同一房间里接通共享进度、采集结算和稀有材料协作事件。',
    objective_label: '采集回合',
    score_label: '丰收值',
    default_target: 6,
    recommended_room_template_ids: ['gathering_line'],
    action_options: [
      { id: 'line_gather', label: '组队采集', summary: '把整条采集线同步推进 1 格，并积累 1 点丰收值。', progress_delta: 1, score_delta: 1, required_role: 'miner', combo_tags: ['gathering', 'supply'], round_effect: '采集位把队伍推进压成可结算节点，适合先把材料线跑起来。' },
      { id: 'sync_bundle', label: '共享进度', summary: '把采集记录和包裹同步到房间快照，推进 1 格并拉高 2 点丰收值。', progress_delta: 1, score_delta: 2, required_role: 'scout', combo_tags: ['route', 'order'], round_effect: '探路位把本轮路线和包裹状态同步，降低队友后续判断成本。' },
      { id: 'rare_find', label: '稀有材料', summary: '把稀有样本的协作事件变成标准回合，推进 1 格并增加 2 点结算值。', progress_delta: 1, score_delta: 2, required_role: 'support', combo_tags: ['rare', 'support'], round_effect: '支护位把稀有发现先收稳，避免高价值样本在协作中掉链。' },
    ],
  },
  expedition_escort: {
    domain: 'expedition',
    id: 'expedition_escort',
    label: '护送抵运',
    kind: 'escort',
    summary: '对应 L83 的护送任务，先把货物完整度、途中事件和护送评分统一挂在共享运行态里。',
    objective_label: '护送里程',
    score_label: '完整度',
    default_target: 5,
    recommended_room_template_ids: ['escort_convoy', 'cavern_quartet', 'sea_probe'],
    action_options: [
      { id: 'escort_step', label: '护送推进', summary: '车队同步前压 1 段护送里程，并记录 1 点货物完整度。', progress_delta: 1, score_delta: 1, required_role: 'miner', combo_tags: ['escort', 'route'], round_effect: '执行位把车队真正往前推，给后续稳货和应急留下空间。' },
      { id: 'stabilize_cargo', label: '稳固货物', summary: '把货物完整度留在看得见的房间共享分上，推进 1 格并增加 2 点完整度。', progress_delta: 1, score_delta: 2, required_role: 'support', combo_tags: ['cargo', 'support'], round_effect: '支护位把货物固定住，让护送推进不只涨里程，也保住评分。' },
      { id: 'answer_incident', label: '途中事件', summary: '先用标准动作接住队伍遇到的小危机，变成可结算的 1 格节点。', progress_delta: 1, score_delta: 1, required_role: 'scout', combo_tags: ['incident', 'survey'], round_effect: '探路位先读出途中小危机，把突发事件压成队伍可以处理的节点。' },
    ],
  },
  expedition_sea: {
    domain: 'expedition',
    id: 'expedition_sea',
    label: '海域共探',
    kind: 'sea',
    summary: '对应 L84 的海域协作远征，先把航线分工、海况变化和海货结算压进房间共享运行态里。',
    objective_label: '海探段落',
    score_label: '海货值',
    default_target: 6,
    recommended_room_template_ids: ['sea_probe'],
    action_options: [
      { id: 'chart_course', label: '航线分工', summary: '先把航线和前后队位同步定好，推进 1 段海探节点。', progress_delta: 1, score_delta: 1, required_role: 'scout', combo_tags: ['sea', 'route'], round_effect: '探路位把航线和回海点讲清楚，队伍后续选择会更稳。' },
      { id: 'watch_weather', label: '应对海况', summary: '把海况、风向和回海点变成可回看的同步动作，推进 1 格并增加 2 点安全值。', progress_delta: 1, score_delta: 2, required_role: 'support', combo_tags: ['weather', 'support'], round_effect: '支护位把海况风险收进队伍记录，避免海探只剩单纯加分。' },
      { id: 'haul_sea_goods', label: '海货结算', summary: '把同场海货收束成可回写的后续收益，推进 1 格并增加 2 点海货值。', progress_delta: 1, score_delta: 2, required_role: 'miner', combo_tags: ['sea_goods', 'gathering'], round_effect: '采集位把海货从发现变成可回写收益，给本局收尾留下明确贡献。' },
    ],
  },
});

const ROOM_STATUS_LABELS = Object.freeze({
  created: '已创建',
  inviting: '邀请中',
  ready_check: '准备确认',
  countdown: '倒计时',
  running: '进行中',
  paused: '已暂停',
  settling: '结算中',
  closed: '已关闭',
  aborted: '已中止',
});

const MEMBER_STATUS_LABELS = Object.freeze({
  invited: '已邀请',
  joined: '已加入',
  ready: '已准备',
  countdown_locked: '倒计时锁定',
  active: '活动中',
  disconnected: '暂时断线',
  reconnecting: '恢复中',
  finished: '待结算确认',
  settled: '已完成结算',
  left: '已离开',
  kicked: '已移出',
});

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sanitizeText(value, maxLength = 80) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeActivitySaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0;
}

function normalizeActivitySaveSlot(value) {
  if (value === null || value === undefined || value === '') return null;
  const slot = Number(value);
  return Number.isInteger(slot) && slot >= 0 && slot <= 2 ? slot : null;
}

function clampNumber(value, minValue, maxValue) {
  const numeric = Math.floor(Number(value) || 0);
  return Math.min(maxValue, Math.max(minValue, numeric));
}

function normalizeActivityDomain(value) {
  const normalized = sanitizeText(value, 24).toLowerCase();
  return ACTIVITY_DOMAINS.includes(normalized) ? normalized : DEFAULT_ACTIVITY_DOMAIN;
}

function getTemplateDomain(template) {
  return normalizeActivityDomain(template?.domain || DEFAULT_ACTIVITY_DOMAIN);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_ACTIVITY_ROOM_FILE), { recursive: true });
}

function createEmptyStore() {
  return {
    rooms: [],
    receipts: [],
  };
}

function loadStore() {
  ensureStoreDir();
  try {
    if (!fs.existsSync(TAOYUAN_ACTIVITY_ROOM_FILE)) return createEmptyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_ACTIVITY_ROOM_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
          receipts: Array.isArray(raw.receipts) ? raw.receipts : [],
        }
      : createEmptyStore();
  } catch {
    return createEmptyStore();
  }
}

function saveStore(store) {
  ensureStoreDir();
  writeJsonFileAtomic(TAOYUAN_ACTIVITY_ROOM_FILE, {
    rooms: Array.isArray(store?.rooms) ? store.rooms : [],
    receipts: Array.isArray(store?.receipts) ? store.receipts : [],
  });
}

function normalizeRoomState(value) {
  const normalized = String(value || '').trim();
  return ROOM_STATES.includes(normalized) ? normalized : 'created';
}

function normalizeMemberState(value) {
  const normalized = String(value || '').trim();
  return MEMBER_STATES.includes(normalized) ? normalized : 'invited';
}

function normalizeInvitationState(value) {
  const normalized = String(value || '').trim();
  return INVITATION_STATES.includes(normalized) ? normalized : 'pending';
}

function normalizeReceiptState(value) {
  const normalized = String(value || '').trim();
  return RECEIPT_STATES.includes(normalized) ? normalized : 'created';
}

function normalizeGameplayPhase(value) {
  const normalized = String(value || '').trim();
  return GAMEPLAY_PHASES.includes(normalized) ? normalized : 'prep';
}

function getRoomTemplate(templateId) {
  const normalized = sanitizeText(templateId, 40);
  return ROOM_TEMPLATE_MAP[normalized] || ROOM_TEMPLATE_MAP.yuanri_vigil;
}

function getRoomTemplateByDomain(domain, templateId = '') {
  const normalizedDomain = normalizeActivityDomain(domain);
  const requested = sanitizeText(templateId, 40);
  if (requested && ROOM_TEMPLATE_MAP[requested] && getTemplateDomain(ROOM_TEMPLATE_MAP[requested]) === normalizedDomain) {
    return ROOM_TEMPLATE_MAP[requested];
  }
  const fallback = Object.values(ROOM_TEMPLATE_MAP).find(template => getTemplateDomain(template) === normalizedDomain);
  return fallback || ROOM_TEMPLATE_MAP.yuanri_vigil;
}

function getDefaultGameplayTemplateId(roomTemplateId) {
  const requestedTemplate = ROOM_TEMPLATE_MAP[sanitizeText(roomTemplateId, 40)];
  const domain = getTemplateDomain(requestedTemplate);
  return getDefaultGameplayTemplateIdByDomain(domain, roomTemplateId);
}

function getGameplayTemplateDomain(template) {
  return normalizeActivityDomain(template?.domain || getTemplateDomain(getRoomTemplateByDomain(DEFAULT_ACTIVITY_DOMAIN)));
}

function getDefaultGameplayTemplateIdByDomain(domain, roomTemplateId) {
  const roomTemplate = getRoomTemplateByDomain(domain, roomTemplateId);
  const normalizedDomain = getTemplateDomain(roomTemplate);
  const recommendedId = Array.isArray(roomTemplate.recommended_gameplay_template_ids)
    ? roomTemplate.recommended_gameplay_template_ids.find(candidate => GAMEPLAY_TEMPLATE_MAP[candidate] && normalizeActivityDomain(GAMEPLAY_TEMPLATE_MAP[candidate].domain || DEFAULT_ACTIVITY_DOMAIN) === normalizedDomain)
    : '';
  if (recommendedId) return recommendedId;
  const fallback = Object.values(GAMEPLAY_TEMPLATE_MAP).find(template => normalizeActivityDomain(template.domain || DEFAULT_ACTIVITY_DOMAIN) === normalizedDomain);
  return fallback?.id || 'public_progress';
}

function getGameplayTemplate(gameplayTemplateId, roomTemplateId = '') {
  const normalized = sanitizeText(gameplayTemplateId, 40);
  if (normalized && GAMEPLAY_TEMPLATE_MAP[normalized]) return GAMEPLAY_TEMPLATE_MAP[normalized];
  return GAMEPLAY_TEMPLATE_MAP[getDefaultGameplayTemplateId(roomTemplateId)] || GAMEPLAY_TEMPLATE_MAP.public_progress;
}

function getGameplayTemplateByDomain(domain, gameplayTemplateId, roomTemplateId = '') {
  const normalizedDomain = normalizeActivityDomain(domain);
  const normalized = sanitizeText(gameplayTemplateId, 40);
  if (normalized && GAMEPLAY_TEMPLATE_MAP[normalized] && normalizeActivityDomain(GAMEPLAY_TEMPLATE_MAP[normalized].domain || DEFAULT_ACTIVITY_DOMAIN) === normalizedDomain) {
    return GAMEPLAY_TEMPLATE_MAP[normalized];
  }
  const fallbackId = getDefaultGameplayTemplateIdByDomain(normalizedDomain, roomTemplateId);
  return GAMEPLAY_TEMPLATE_MAP[fallbackId] || GAMEPLAY_TEMPLATE_MAP.public_progress;
}

function listRoomTemplates(domain = DEFAULT_ACTIVITY_DOMAIN) {
  const normalizedDomain = normalizeActivityDomain(domain);
  return Object.values(ROOM_TEMPLATE_MAP)
    .filter(template => getTemplateDomain(template) === normalizedDomain)
    .map(template => ({
    activity_domain: getTemplateDomain(template),
    id: template.id,
    label: template.label,
    summary: template.summary,
    default_member_limit: template.default_member_limit,
    opening_title: template.opening_title,
    recommended_gameplay_template_ids: Array.isArray(template.recommended_gameplay_template_ids)
      ? [...template.recommended_gameplay_template_ids]
      : [],
    }));
}

function listGameplayTemplates(domain = DEFAULT_ACTIVITY_DOMAIN) {
  const normalizedDomain = normalizeActivityDomain(domain);
  return Object.values(GAMEPLAY_TEMPLATE_MAP)
    .filter(template => normalizeActivityDomain(template.domain || DEFAULT_ACTIVITY_DOMAIN) === normalizedDomain)
    .map(template => ({
    activity_domain: normalizeActivityDomain(template.domain || DEFAULT_ACTIVITY_DOMAIN),
    id: template.id,
    label: template.label,
    kind: template.kind,
    summary: template.summary,
    objective_label: template.objective_label,
    score_label: template.score_label,
    default_target: template.default_target,
    recommended_room_template_ids: Array.isArray(template.recommended_room_template_ids)
      ? [...template.recommended_room_template_ids]
      : [],
    action_options: Array.isArray(template.action_options)
      ? template.action_options.map(action => ({
          id: action.id,
          label: action.label,
          summary: action.summary,
          unique_per_member: action.unique_per_member === true,
          required_role: sanitizeText(action.required_role, 24),
          once_per_round: action.once_per_round === true,
          pressure_delta: Math.floor(Number(action.pressure_delta) || 0),
          risk_delta: Math.floor(Number(action.risk_delta) || 0),
          resource_delta: normalizedDomain === 'festival'
            ? normalizeFestivalResourceDelta(action.resource_delta)
            : normalizeExpeditionCavernResourceDelta(action.resource_delta),
          combo_tags: Array.isArray(action.combo_tags) ? action.combo_tags.map(item => sanitizeText(item, 24)).filter(Boolean).slice(0, 8) : [],
          round_effect: sanitizeText(action.round_effect, 160),
        }))
      : [],
    }));
}

function normalizeRoomEvent(entry) {
  return {
    id: String(entry?.id || makeId('activity_room_event')),
    event: sanitizeText(entry?.event, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    actor_display_name: sanitizeText(entry?.actor_display_name, 40),
    summary: sanitizeText(entry?.summary, 160),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeRoomInvitation(entry) {
  return {
    id: String(entry?.id || makeId('activity_room_invite')),
    room_id: sanitizeText(entry?.room_id, 40),
    inviter_username: sanitizeText(entry?.inviter_username, 40),
    inviter_display_name: sanitizeText(entry?.inviter_display_name, 40),
    target_username: sanitizeText(entry?.target_username, 40),
    target_display_name: sanitizeText(entry?.target_display_name, 40),
    target_save_id: normalizeActivitySaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeActivitySaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
    status: normalizeInvitationState(entry?.status),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
    responded_at: Math.max(0, Math.floor(Number(entry?.responded_at) || 0)),
  };
}

function normalizeRoomMember(entry) {
  return {
    username: sanitizeText(entry?.username, 40),
    display_name: sanitizeText(entry?.display_name, 40),
    role: sanitizeText(entry?.role, 20) || 'member',
    status: normalizeMemberState(entry?.status),
    resume_status: sanitizeText(entry?.resume_status, 24) || '',
    invited_at: Math.max(0, Math.floor(Number(entry?.invited_at) || 0)),
    joined_at: Math.max(0, Math.floor(Number(entry?.joined_at) || 0)),
    ready_at: Math.max(0, Math.floor(Number(entry?.ready_at) || 0)),
    disconnected_at: Math.max(0, Math.floor(Number(entry?.disconnected_at) || 0)),
    reconnected_at: Math.max(0, Math.floor(Number(entry?.reconnected_at) || 0)),
    left_at: Math.max(0, Math.floor(Number(entry?.left_at) || 0)),
    last_seen_at: Math.max(0, Math.floor(Number(entry?.last_seen_at) || nowSeconds())),
    active_receipt_id: sanitizeText(entry?.active_receipt_id, 60),
  };
}

function normalizeReceiptRouteReplayNode(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    state: sanitizeText(entry?.state, 24),
    order: Math.max(0, Math.floor(Number(entry?.order) || 0)),
  };
}

function normalizeReceiptRouteReplayHighlight(entry) {
  const nodeId = sanitizeText(entry?.node_id || entry?.visual_id, 80);
  if (!nodeId) return null;
  return {
    node_id: nodeId,
    label: sanitizeText(entry?.label, 40),
    summary: sanitizeText(entry?.summary, 120),
    type: sanitizeText(entry?.type, 24) || 'info',
  };
}

function normalizeReceiptRouteReplayContribution(entry) {
  const username = sanitizeText(entry?.username, 40);
  if (!username) return null;
  return {
    username,
    display_name: sanitizeText(entry?.display_name, 40) || username,
    role_label: sanitizeText(entry?.role_label, 24),
    progress_value: Math.max(0, Math.floor(Number(entry?.progress_value) || 0)),
    score_value: Math.max(0, Math.floor(Number(entry?.score_value) || 0)),
    action_count: Math.max(0, Math.floor(Number(entry?.action_count) || 0)),
    summary: sanitizeText(entry?.summary, 120),
  };
}

function normalizeReceiptRouteReplayRaceResult(entry) {
  const source = entry && typeof entry === 'object' ? entry : {};
  return {
    mode: sanitizeText(source.mode, 24),
    rank: Math.max(0, Math.floor(Number(source.rank) || 0)),
    rank_label: sanitizeText(source.rank_label, 40),
    team_count: Math.max(0, Math.floor(Number(source.team_count) || 0)),
    title_label: sanitizeText(source.title_label, 40),
    popularity_bonus: Math.max(0, Math.floor(Number(source.popularity_bonus) || 0)),
    popularity_label: sanitizeText(source.popularity_label, 60),
    reached_finish: source.reached_finish === true,
  };
}

function normalizeReceiptRouteReplayRaceRanking(entry) {
  const teamId = sanitizeText(entry?.team_id, 80);
  if (!teamId) return null;
  return {
    team_id: teamId,
    label: sanitizeText(entry?.label, 40) || teamId,
    rank: Math.max(0, Math.floor(Number(entry?.rank) || 0)),
    rank_label: sanitizeText(entry?.rank_label, 40),
    position_index: Math.max(0, Math.floor(Number(entry?.position_index) || 0)),
    score_value: Math.max(0, Math.floor(Number(entry?.score_value) || 0)),
    finished: entry?.finished === true,
    summary: sanitizeText(entry?.summary, 120),
  };
}

function normalizeReceiptRouteReplay(value) {
  const source = value && typeof value === 'object' ? value : {};
  const kind = sanitizeText(source.kind, 40);
  if (!kind) {
    return {
      kind: '',
      title: '',
      summary: '',
      route_nodes: [],
      highlight_nodes: [],
      risk_peak: {
        value: 0,
        round_number: 0,
        action_label: '',
        actor_display_name: '',
        summary: '',
      },
      member_contributions: [],
      race_result: normalizeReceiptRouteReplayRaceResult(null),
      race_rankings: [],
    };
  }
  return {
    kind,
    title: sanitizeText(source.title, 60),
    summary: sanitizeText(source.summary, 180),
    route_nodes: Array.isArray(source.route_nodes)
      ? source.route_nodes.map(normalizeReceiptRouteReplayNode).filter(Boolean).slice(0, 24)
      : [],
    highlight_nodes: Array.isArray(source.highlight_nodes)
      ? source.highlight_nodes.map(normalizeReceiptRouteReplayHighlight).filter(Boolean).slice(0, 12)
      : [],
    risk_peak: source.risk_peak && typeof source.risk_peak === 'object'
      ? {
          value: Math.max(0, Math.floor(Number(source.risk_peak.value) || 0)),
          round_number: Math.max(0, Math.floor(Number(source.risk_peak.round_number) || 0)),
          action_label: sanitizeText(source.risk_peak.action_label, 40),
          actor_display_name: sanitizeText(source.risk_peak.actor_display_name, 40),
          summary: sanitizeText(source.risk_peak.summary, 140),
        }
      : {
          value: 0,
          round_number: 0,
          action_label: '',
          actor_display_name: '',
          summary: '',
        },
    member_contributions: Array.isArray(source.member_contributions)
      ? source.member_contributions.map(normalizeReceiptRouteReplayContribution).filter(Boolean).slice(0, 8)
      : [],
    race_result: normalizeReceiptRouteReplayRaceResult(source.race_result),
    race_rankings: Array.isArray(source.race_rankings)
      ? source.race_rankings.map(normalizeReceiptRouteReplayRaceRanking).filter(Boolean).slice(0, 8)
      : [],
  };
}

function normalizeRoomReceipt(entry) {
  const activityDomain = normalizeActivityDomain(entry?.activity_domain || entry?.domain || getTemplateDomain(ROOM_TEMPLATE_MAP[sanitizeText(entry?.template_id, 40)]));
  return {
    id: String(entry?.id || makeId(ACTIVITY_RECEIPT_ID_PREFIX[activityDomain] || ACTIVITY_RECEIPT_ID_PREFIX.festival)),
    activity_domain: activityDomain,
    room_id: sanitizeText(entry?.room_id, 40),
    room_title: sanitizeText(entry?.room_title, 60),
    template_id: sanitizeText(entry?.template_id, 40),
    template_label: sanitizeText(entry?.template_label, 40),
    target_username: sanitizeText(entry?.target_username, 40),
    target_display_name: sanitizeText(entry?.target_display_name, 40),
    target_slot: Number.isInteger(Number(entry?.target_slot)) ? Number(entry.target_slot) : 0,
    status: normalizeReceiptState(entry?.status),
    idempotency_key: sanitizeText(entry?.idempotency_key, 120),
    reward_payload: entry?.reward_payload && typeof entry.reward_payload === 'object'
      ? {
          money: Math.max(0, Math.floor(Number(entry.reward_payload.money) || 0)),
          reward_tickets: Math.max(0, Math.floor(Number(entry.reward_payload.reward_tickets) || 0)),
          items: Array.isArray(entry.reward_payload.items)
            ? entry.reward_payload.items.map(item => ({
                item_id: sanitizeText(item?.item_id, 40),
                quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
              })).filter(item => item.item_id)
            : [],
        }
      : { money: 0, reward_tickets: 0, items: [] },
    reward_breakdown: entry?.reward_breakdown && typeof entry.reward_breakdown === 'object'
      ? {
          participation_money: Math.max(0, Math.floor(Number(entry.reward_breakdown.participation_money) || 0)),
          cooperation_bonus_money: Math.max(0, Math.floor(Number(entry.reward_breakdown.cooperation_bonus_money) || 0)),
          ranking_bonus_money: Math.max(0, Math.floor(Number(entry.reward_breakdown.ranking_bonus_money) || 0)),
          memorial_ticket_quantity: Math.max(0, Math.floor(Number(entry.reward_breakdown.memorial_ticket_quantity) || 0)),
          decoration_reward: entry.reward_breakdown.decoration_reward && typeof entry.reward_breakdown.decoration_reward === 'object'
            ? {
                decoration_id: sanitizeText(entry.reward_breakdown.decoration_reward.decoration_id, 80),
                label: sanitizeText(entry.reward_breakdown.decoration_reward.label, 40),
                quantity: Math.max(0, Math.floor(Number(entry.reward_breakdown.decoration_reward.quantity) || 0)),
              }
            : { decoration_id: '', label: '', quantity: 0 },
          title_reward: entry.reward_breakdown.title_reward && typeof entry.reward_breakdown.title_reward === 'object'
            ? {
                title_id: sanitizeText(entry.reward_breakdown.title_reward.title_id, 80),
                label: sanitizeText(entry.reward_breakdown.title_reward.label, 40),
                granted: entry.reward_breakdown.title_reward.granted === true,
              }
            : { title_id: '', label: '', granted: false },
        }
      : {
          participation_money: 0,
          cooperation_bonus_money: 0,
          ranking_bonus_money: 0,
          memorial_ticket_quantity: 0,
          decoration_reward: { decoration_id: '', label: '', quantity: 0 },
          title_reward: { title_id: '', label: '', granted: false },
        },
    summary: sanitizeText(entry?.summary, 160),
    route_replay: normalizeReceiptRouteReplay(entry?.route_replay),
    reward_result: sanitizeText(entry?.reward_result, 160),
    last_error: sanitizeText(entry?.last_error, 160),
    settlement_version: Math.max(1, Math.floor(Number(entry?.settlement_version) || 1)),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    persisted_at: Math.max(0, Math.floor(Number(entry?.persisted_at) || 0)),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
  };
}

function normalizeGameplayContribution(entry) {
  return {
    username: sanitizeText(entry?.username, 40),
    display_name: sanitizeText(entry?.display_name, 40),
    progress_value: Math.max(0, Math.floor(Number(entry?.progress_value) || 0)),
    score_value: Math.max(0, Math.floor(Number(entry?.score_value) || 0)),
    action_count: Math.max(0, Math.floor(Number(entry?.action_count) || 0)),
    locked: entry?.locked === true,
    last_action_id: sanitizeText(entry?.last_action_id, 40),
    last_action_label: sanitizeText(entry?.last_action_label, 40),
    last_action_at: Math.max(0, Math.floor(Number(entry?.last_action_at) || 0)),
  };
}

function normalizeOnlineVisualHighlight(entry) {
  return {
    id: String(entry?.id || makeId('visual_highlight')),
    visual_id: sanitizeText(entry?.visual_id, 60),
    type: ONLINE_VISUAL_HIGHLIGHT_TYPES.includes(String(entry?.type || '').trim()) ? String(entry.type).trim() : 'info',
    label: sanitizeText(entry?.label, 40),
    summary: sanitizeText(entry?.summary, 160),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeVisualResourcePreview(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.entries(source).reduce((preview, [key, rawValue]) => {
    const id = sanitizeText(key, 40);
    const amount = Math.max(0, Math.floor(Number(rawValue) || 0));
    if (id && amount > 0) preview[id] = amount;
    return preview;
  }, {});
}

function normalizeOnlineVisualNode(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  const state = String(entry?.state || '').trim();
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    x: clampNumber(entry?.x, 0, 100),
    y: clampNumber(entry?.y, 0, 100),
    state: ONLINE_VISUAL_NODE_STATES.includes(state) ? state : 'hidden',
    connected_node_ids: Array.isArray(entry?.connected_node_ids)
      ? entry.connected_node_ids.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 12)
      : [],
    event_id: sanitizeText(entry?.event_id, 60),
    available_action_ids: Array.isArray(entry?.available_action_ids)
      ? entry.available_action_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, 12)
      : [],
    owner_username: sanitizeText(entry?.owner_username, 40),
    claimed_by: sanitizeText(entry?.claimed_by, 40),
    risk_preview: sanitizeText(entry?.risk_preview, 120),
    reward_preview: sanitizeText(entry?.reward_preview, 120),
    resource_cost_preview: normalizeVisualResourcePreview(entry?.resource_cost_preview),
    resource_reward_preview: normalizeVisualResourcePreview(entry?.resource_reward_preview),
  };
}

function normalizeOnlineVisualObject(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  const state = String(entry?.state || '').trim();
  const progressTarget = Math.max(0, Math.floor(Number(entry?.progress_target) || 0));
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    x: clampNumber(entry?.x, 0, 100),
    y: clampNumber(entry?.y, 0, 100),
    state: ONLINE_VISUAL_OBJECT_STATES.includes(state) ? state : 'idle',
    available_action_ids: Array.isArray(entry?.available_action_ids)
      ? entry.available_action_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, 12)
      : [],
    progress_value: progressTarget > 0
      ? clampNumber(entry?.progress_value, 0, progressTarget)
      : Math.max(0, Math.floor(Number(entry?.progress_value) || 0)),
    progress_target: progressTarget,
    handled_by: sanitizeText(entry?.handled_by, 40),
    handled_at: Math.max(0, Math.floor(Number(entry?.handled_at) || 0)),
    requires_cooperation: entry?.requires_cooperation === true,
    cooperation_required_count: Math.max(0, Math.floor(Number(entry?.cooperation_required_count) || 0)),
    cooperation_current_count: Math.max(0, Math.floor(Number(entry?.cooperation_current_count) || 0)),
  };
}

function normalizeOnlineVisualTrackCell(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  const kind = String(entry?.kind || '').trim();
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    index: Math.max(0, Math.floor(Number(entry?.index) || 0)),
    kind: ONLINE_VISUAL_TRACK_CELL_KINDS.includes(kind) ? kind : 'normal',
    occupant_team_ids: Array.isArray(entry?.occupant_team_ids)
      ? entry.occupant_team_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, 8)
      : [],
    event_id: sanitizeText(entry?.event_id, 60),
    effect_ids: Array.isArray(entry?.effect_ids)
      ? entry.effect_ids
        .map(item => String(item || '').trim())
        .filter(item => ONLINE_VISUAL_TRACK_EFFECTS.includes(item))
        .slice(0, 8)
      : [],
    available_action_ids: Array.isArray(entry?.available_action_ids)
      ? entry.available_action_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, 12)
      : [],
    risk_preview: sanitizeText(entry?.risk_preview, 120),
    reward_preview: sanitizeText(entry?.reward_preview, 120),
  };
}

function normalizeOnlineVisualTrackTeam(entry) {
  const teamId = sanitizeText(entry?.team_id, 60);
  if (!teamId) return null;
  const state = String(entry?.state || '').trim();
  return {
    team_id: teamId,
    label: sanitizeText(entry?.label, 40),
    marker: sanitizeText(entry?.marker, 40),
    position_index: Math.max(0, Math.floor(Number(entry?.position_index) || 0)),
    state: ONLINE_VISUAL_TRACK_TEAM_STATES.includes(state) ? state : 'idle',
    last_action_id: sanitizeText(entry?.last_action_id, 60),
  };
}

function normalizeOnlineVisualTrack(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    length: Math.max(0, Math.floor(Number(entry?.length) || 0)),
    current_round: Math.max(0, Math.floor(Number(entry?.current_round) || 0)),
    cells: Array.isArray(entry?.cells)
      ? entry.cells.map(normalizeOnlineVisualTrackCell).filter(Boolean).slice(0, 96)
      : [],
    teams: Array.isArray(entry?.teams)
      ? entry.teams.map(normalizeOnlineVisualTrackTeam).filter(Boolean).slice(0, 12)
      : [],
  };
}

function normalizeOnlineVisualAsyncContributionOption(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    available_action_id: sanitizeText(entry?.available_action_id, 60),
    daily_limit: Math.max(0, Math.floor(Number(entry?.daily_limit) || 0)),
    weekly_limit: Math.max(0, Math.floor(Number(entry?.weekly_limit) || 0)),
    resource_cost_preview: normalizeVisualResourcePreview(entry?.resource_cost_preview),
    progress_delta: Math.max(0, Math.floor(Number(entry?.progress_delta) || 0)),
    reward_preview: sanitizeText(entry?.reward_preview, 120),
  };
}

function normalizeOnlineVisualAsyncMilestone(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    progress_required: Math.max(0, Math.floor(Number(entry?.progress_required) || 0)),
    reached: entry?.reached === true,
    reward_preview: sanitizeText(entry?.reward_preview, 120),
  };
}

function normalizeOnlineVisualAsyncStage(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  const state = String(entry?.state || '').trim();
  const progressTarget = Math.max(0, Math.floor(Number(entry?.progress_target) || 0));
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    state: ONLINE_VISUAL_ASYNC_STAGE_STATES.includes(state) ? state : 'pending',
    progress_value: progressTarget > 0
      ? clampNumber(entry?.progress_value, 0, progressTarget)
      : Math.max(0, Math.floor(Number(entry?.progress_value) || 0)),
    progress_target: progressTarget,
    object_ids: Array.isArray(entry?.object_ids)
      ? entry.object_ids.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 16)
      : [],
    contribution_options: Array.isArray(entry?.contribution_options)
      ? entry.contribution_options.map(normalizeOnlineVisualAsyncContributionOption).filter(Boolean).slice(0, 12)
      : [],
    milestones: Array.isArray(entry?.milestones)
      ? entry.milestones.map(normalizeOnlineVisualAsyncMilestone).filter(Boolean).slice(0, 12)
      : [],
  };
}

function normalizeOnlineVisualAsyncContributor(entry) {
  const username = sanitizeText(entry?.username, 40);
  if (!username) return null;
  return {
    username,
    display_name: sanitizeText(entry?.display_name, 40),
    contribution_value: Math.max(0, Math.floor(Number(entry?.contribution_value) || 0)),
    rank: Math.max(0, Math.floor(Number(entry?.rank) || 0)),
  };
}

function normalizeOnlineVisualAsyncHistoryEntry(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  const type = String(entry?.type || '').trim();
  return {
    id,
    type: ONLINE_VISUAL_ASYNC_HISTORY_TYPES.includes(type) ? type : 'contribution',
    actor_username: sanitizeText(entry?.actor_username, 40),
    actor_display_name: sanitizeText(entry?.actor_display_name, 40),
    summary: sanitizeText(entry?.summary, 140),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || 0)),
  };
}

function normalizeOnlineVisualAsyncProject(entry) {
  const id = sanitizeText(entry?.id, 80);
  if (!id) return null;
  return {
    id,
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    day_tag: sanitizeText(entry?.day_tag, 20),
    week_tag: sanitizeText(entry?.week_tag, 20),
    starts_at: Math.max(0, Math.floor(Number(entry?.starts_at) || 0)),
    ends_at: Math.max(0, Math.floor(Number(entry?.ends_at) || 0)),
    current_stage_id: sanitizeText(entry?.current_stage_id, 80),
    stages: Array.isArray(entry?.stages)
      ? entry.stages.map(normalizeOnlineVisualAsyncStage).filter(Boolean).slice(0, 24)
      : [],
    contributors: Array.isArray(entry?.contributors)
      ? entry.contributors.map(normalizeOnlineVisualAsyncContributor).filter(Boolean).slice(0, 24)
      : [],
    history: Array.isArray(entry?.history)
      ? entry.history.map(normalizeOnlineVisualAsyncHistoryEntry).filter(Boolean).slice(0, 40)
      : [],
    completion_room_template_id: sanitizeText(entry?.completion_room_template_id, 60),
    completion_event_id: sanitizeText(entry?.completion_event_id, 60),
  };
}

function resolveDefaultVisualBoardType(room) {
  const gameplayTemplateId = sanitizeText(room?.gameplay_template_id, 40);
  const roomTemplateId = sanitizeText(room?.template_id, 40);
  if (gameplayTemplateId === 'expedition_cavern') return 'map';
  if (roomTemplateId === 'dragon_boat') return 'track';
  return normalizeActivityDomain(room?.activity_domain) === 'expedition' ? 'map' : 'scene';
}

function buildDefaultVisualBoardId(room) {
  const domain = normalizeActivityDomain(room?.activity_domain);
  const templateId = sanitizeText(room?.template_id, 40) || 'default';
  const gameplayTemplateId = sanitizeText(room?.gameplay_template_id, 40) || 'default';
  return `${domain}:${templateId}:${gameplayTemplateId}`;
}

function normalizeOnlineVisualState(value, room) {
  const source = value && typeof value === 'object' ? value : {};
  const boardType = String(source.board_type || '').trim();
  const normalizedBoardType = ONLINE_VISUAL_BOARD_TYPES.includes(boardType)
    ? boardType
    : resolveDefaultVisualBoardType(room);
  return {
    board_type: normalizedBoardType,
    board_id: sanitizeText(source.board_id, 80) || buildDefaultVisualBoardId(room),
    revision: Math.max(0, Math.floor(Number(source.revision) || 0)),
    selected_visual_id: sanitizeText(source.selected_visual_id, 80),
    nodes: Array.isArray(source.nodes)
      ? source.nodes.map(normalizeOnlineVisualNode).filter(Boolean).slice(0, 48)
      : [],
    objects: Array.isArray(source.objects)
      ? source.objects.map(normalizeOnlineVisualObject).filter(Boolean).slice(0, 64)
      : [],
    tracks: Array.isArray(source.tracks)
      ? source.tracks.map(normalizeOnlineVisualTrack).filter(Boolean).slice(0, 8)
      : [],
    async_projects: Array.isArray(source.async_projects)
      ? source.async_projects.map(normalizeOnlineVisualAsyncProject).filter(Boolean).slice(0, 8)
      : [],
    highlights: Array.isArray(source.highlights)
      ? source.highlights.map(normalizeOnlineVisualHighlight).slice(0, 16)
      : [],
    recent_feedback: sanitizeText(source.recent_feedback, 180),
  };
}

function getExpeditionCavernEventByRound(roundNumber) {
  const normalizedRound = Math.max(1, Math.floor(Number(roundNumber) || 1));
  const eventIndex = (normalizedRound - 1) % EXPEDITION_CAVERN_ROUND_EVENTS.length;
  return EXPEDITION_CAVERN_ROUND_EVENTS[eventIndex] || EXPEDITION_CAVERN_ROUND_EVENTS[0];
}

function normalizeExpeditionCavernResources(value) {
  const source = value && typeof value === 'object' ? value : {};
  return EXPEDITION_CAVERN_RESOURCE_DEFS.reduce((resources, definition) => {
    resources[definition.id] = clampNumber(source[definition.id], 0, definition.max_value);
    return resources;
  }, {});
}

function createInitialExpeditionCavernResources() {
  return EXPEDITION_CAVERN_RESOURCE_DEFS.reduce((resources, definition) => {
    resources[definition.id] = definition.initial_value;
    return resources;
  }, {});
}

function normalizeExpeditionCavernRoundLogEntry(entry) {
  return {
    id: String(entry?.id || makeId('cavern_round_log')),
    round_number: Math.max(1, Math.floor(Number(entry?.round_number) || 1)),
    event_id: sanitizeText(entry?.event_id, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    actor_display_name: sanitizeText(entry?.actor_display_name, 40),
    action_id: sanitizeText(entry?.action_id, 40),
    action_label: sanitizeText(entry?.action_label, 40),
    role_id: sanitizeText(entry?.role_id, 24),
    role_label: sanitizeText(entry?.role_label, 24),
    summary: sanitizeText(entry?.summary, 180),
    progress_delta: Math.max(0, Math.floor(Number(entry?.progress_delta) || 0)),
    score_delta: Math.max(0, Math.floor(Number(entry?.score_delta) || 0)),
    risk_delta: Math.floor(Number(entry?.risk_delta) || 0),
    resource_delta: normalizeExpeditionCavernResourceDelta(entry?.resource_delta),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeExpeditionCavernResourceDelta(value) {
  const source = value && typeof value === 'object' ? value : {};
  return EXPEDITION_CAVERN_RESOURCE_DEFS.reduce((delta, definition) => {
    const nextValue = Math.floor(Number(source[definition.id]) || 0);
    if (nextValue !== 0) delta[definition.id] = nextValue;
    return delta;
  }, {});
}

function createInitialExpeditionCavernState() {
  const initialRound = 1;
  const event = getExpeditionCavernEventByRound(initialRound);
  return {
    round_number: initialRound,
    current_event_id: event.id,
    risk_value: EXPEDITION_CAVERN_INITIAL_RISK,
    risk_max: EXPEDITION_CAVERN_RISK_MAX,
    team_resources: createInitialExpeditionCavernResources(),
    role_assignments: [],
    round_actions: [],
    round_log: [],
    recent_feedback: `第 ${initialRound} 回合遇到「${event.label}」：${event.summary}`,
  };
}

function normalizeExpeditionCavernRoleAssignment(entry) {
  const roleId = sanitizeText(entry?.role_id, 24);
  const roleDefinition = EXPEDITION_CAVERN_ROLE_DEFS.find(item => item.id === roleId) || EXPEDITION_CAVERN_ROLE_DEFS[0];
  return {
    username: sanitizeText(entry?.username, 40),
    display_name: sanitizeText(entry?.display_name, 40),
    role_id: roleDefinition.id,
    role_label: roleDefinition.label,
    role_summary: roleDefinition.summary,
  };
}

function normalizeExpeditionCavernRoundAction(entry) {
  return {
    round_number: Math.max(1, Math.floor(Number(entry?.round_number) || 1)),
    action_id: sanitizeText(entry?.action_id, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeExpeditionCavernState(value) {
  const initial = createInitialExpeditionCavernState();
  const source = value && typeof value === 'object' ? value : {};
  const roundNumber = Math.max(1, Math.floor(Number(source.round_number) || initial.round_number));
  const event = EXPEDITION_CAVERN_ROUND_EVENTS.find(item => item.id === sanitizeText(source.current_event_id, 40))
    || getExpeditionCavernEventByRound(roundNumber);
  return {
    round_number: roundNumber,
    current_event_id: event.id,
    risk_value: clampNumber(source.risk_value ?? initial.risk_value, 0, EXPEDITION_CAVERN_RISK_MAX),
    risk_max: EXPEDITION_CAVERN_RISK_MAX,
    team_resources: normalizeExpeditionCavernResources(source.team_resources ?? initial.team_resources),
    role_assignments: Array.isArray(source.role_assignments)
      ? source.role_assignments.map(normalizeExpeditionCavernRoleAssignment).filter(item => item.username)
      : [],
    round_actions: Array.isArray(source.round_actions)
      ? source.round_actions.map(normalizeExpeditionCavernRoundAction).filter(item => item.actor_username && item.action_id)
      : [],
    round_log: Array.isArray(source.round_log)
      ? source.round_log.map(normalizeExpeditionCavernRoundLogEntry).slice(0, EXPEDITION_CAVERN_ROUND_LOG_LIMIT)
      : [],
    recent_feedback: sanitizeText(source.recent_feedback || initial.recent_feedback, 180),
  };
}

function getExpeditionCavernRoleForMember(room, member) {
  const joinedMembers = getJoinedMembers(room);
  const memberIndex = Math.max(0, joinedMembers.findIndex(item => item.username === member.username));
  const roleDefinition = EXPEDITION_CAVERN_ROLE_DEFS[memberIndex % EXPEDITION_CAVERN_ROLE_DEFS.length] || EXPEDITION_CAVERN_ROLE_DEFS[0];
  return {
    username: member.username,
    display_name: member.display_name,
    role_id: roleDefinition.id,
    role_label: roleDefinition.label,
    role_summary: roleDefinition.summary,
  };
}

function syncExpeditionCavernRoleAssignments(room, cavernState) {
  const joinedMembers = getJoinedMembers(room);
  cavernState.role_assignments = joinedMembers.map(member => getExpeditionCavernRoleForMember(room, member));
  return cavernState.role_assignments;
}

function getExpeditionCavernRoleLabel(roleId) {
  const role = EXPEDITION_CAVERN_ROLE_DEFS.find(item => item.id === sanitizeText(roleId, 24));
  return role?.label || '';
}

function getExpeditionCavernActionRoleStatus(room, member, actionOption) {
  const requiredRole = sanitizeText(actionOption?.required_role, 24);
  if (!requiredRole || !member) return { can_use: true, disabled_reason: '' };
  const assignment = getExpeditionCavernRoleForMember(room, member);
  if (assignment.role_id === requiredRole || assignment.role_id === 'lead') return { can_use: true, disabled_reason: '' };
  return {
    can_use: false,
    disabled_reason: `当前动作建议由${getExpeditionCavernRoleLabel(requiredRole) || '对应职责'}执行；领队可以兜底。`,
  };
}

function getExpeditionCavernRoundActionStatus(gameplayState, member, actionOption) {
  const cavernState = normalizeExpeditionCavernState(gameplayState?.cavern_state);
  if (!actionOption?.once_per_round || !member) return { can_use: true, disabled_reason: '' };
  const alreadyUsed = (cavernState.round_actions || []).some(entry =>
    entry.round_number === cavernState.round_number &&
    entry.actor_username === member.username &&
    entry.action_id === actionOption.id
  );
  if (!alreadyUsed) return { can_use: true, disabled_reason: '' };
  return {
    can_use: false,
    disabled_reason: '这个动作每位成员每回合只能执行一次',
  };
}

function applyExpeditionCavernResourceDelta(cavernState, resourceDelta) {
  const delta = normalizeExpeditionCavernResourceDelta(resourceDelta);
  const nextResources = normalizeExpeditionCavernResources(cavernState.team_resources);
  for (const definition of EXPEDITION_CAVERN_RESOURCE_DEFS) {
    const nextValue = (nextResources[definition.id] || 0) + (delta[definition.id] || 0);
    nextResources[definition.id] = clampNumber(nextValue, 0, definition.max_value);
  }
  cavernState.team_resources = nextResources;
  return delta;
}

function formatSignedDelta(value) {
  const numeric = Math.floor(Number(value) || 0);
  if (numeric > 0) return `+${numeric}`;
  return String(numeric);
}

function summarizeExpeditionCavernResourceDelta(resourceDelta) {
  const delta = normalizeExpeditionCavernResourceDelta(resourceDelta);
  return EXPEDITION_CAVERN_RESOURCE_DEFS
    .filter(definition => delta[definition.id])
    .map(definition => `${definition.label}${formatSignedDelta(delta[definition.id])}`)
    .join('，');
}

function mergeExpeditionCavernResourceDelta(baseDelta, extraDelta) {
  const base = normalizeExpeditionCavernResourceDelta(baseDelta);
  const extra = normalizeExpeditionCavernResourceDelta(extraDelta);
  return EXPEDITION_CAVERN_RESOURCE_DEFS.reduce((merged, definition) => {
    const nextValue = (base[definition.id] || 0) + (extra[definition.id] || 0);
    if (nextValue !== 0) merged[definition.id] = nextValue;
    return merged;
  }, {});
}

function getExpeditionCavernCurrentEvent(cavernState) {
  return EXPEDITION_CAVERN_ROUND_EVENTS.find(item => item.id === sanitizeText(cavernState?.current_event_id, 40))
    || getExpeditionCavernEventByRound(cavernState?.round_number);
}

function buildExpeditionCavernEventSnapshot(event) {
  return {
    id: event.id,
    label: event.label,
    summary: event.summary,
    risk_hint: event.risk_hint,
    resource_hint: event.resource_hint,
    combo_tags: Array.isArray(event.combo_tags) ? [...event.combo_tags] : [],
  };
}

function getExpeditionCavernActionOption(actionId) {
  const template = GAMEPLAY_TEMPLATE_MAP.expedition_cavern;
  return (template.action_options || []).find(item => item.id === sanitizeText(actionId, 40)) || null;
}

function splitExpeditionCavernResourcePreview(resourceDelta) {
  const delta = normalizeExpeditionCavernResourceDelta(resourceDelta);
  return EXPEDITION_CAVERN_RESOURCE_DEFS.reduce((preview, definition) => {
    const value = Math.floor(Number(delta[definition.id]) || 0);
    if (value < 0) preview.cost[definition.id] = Math.abs(value);
    if (value > 0) preview.reward[definition.id] = value;
    return preview;
  }, { cost: {}, reward: {} });
}

function hasExpeditionCavernActionResolved(cavernState, actionId) {
  const normalizedActionId = sanitizeText(actionId, 40);
  return (cavernState.round_log || []).some(entry => entry.action_id === normalizedActionId);
}

function getExpeditionCavernCurrentVisualNodeId(cavernState) {
  const event = getExpeditionCavernCurrentEvent(cavernState);
  const tags = new Set(Array.isArray(event.combo_tags) ? event.combo_tags : []);
  if (tags.has('mine') || tags.has('ore')) return EXPEDITION_CAVERN_VISUAL_NODE_IDS.ore;
  if (tags.has('support') || tags.has('collapse')) return EXPEDITION_CAVERN_VISUAL_NODE_IDS.support;
  if (tags.has('survey') || tags.has('route')) return EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad;
  return EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad;
}

function buildExpeditionCavernVisualActionPreview(actionId) {
  const action = getExpeditionCavernActionOption(actionId);
  if (!action) return { available_action_ids: [], resource_cost_preview: {}, resource_reward_preview: {}, risk_preview: '', reward_preview: '' };
  const resourcePreview = splitExpeditionCavernResourcePreview(action.resource_delta);
  const riskDelta = Math.floor(Number(action.risk_delta) || 0);
  return {
    available_action_ids: [action.id],
    resource_cost_preview: resourcePreview.cost,
    resource_reward_preview: resourcePreview.reward,
    risk_preview: riskDelta ? `风险${formatSignedDelta(riskDelta)}。${action.round_effect || action.summary}` : action.round_effect || action.summary,
    reward_preview: `${action.progress_delta || 0} 点节点进度，${action.score_delta || 0} 点采集值。`,
  };
}

function buildExpeditionCavernVisualNodes(cavernState, existingNodes = []) {
  const normalizedCavernState = normalizeExpeditionCavernState(cavernState);
  const existingById = new Map((Array.isArray(existingNodes) ? existingNodes : [])
    .map(normalizeOnlineVisualNode)
    .filter(Boolean)
    .map(node => [node.id, node]));
  const event = getExpeditionCavernCurrentEvent(normalizedCavernState);
  const currentNodeId = getExpeditionCavernCurrentVisualNodeId(normalizedCavernState);
  const splitPreview = buildExpeditionCavernVisualActionPreview('split_mine');
  const routePreview = buildExpeditionCavernVisualActionPreview('chalk_route');
  const supportPreview = buildExpeditionCavernVisualActionPreview('stabilize_collapse');
  const mineResolved = hasExpeditionCavernActionResolved(normalizedCavernState, 'split_mine');
  const routeResolved = hasExpeditionCavernActionResolved(normalizedCavernState, 'chalk_route');
  const supportResolved = hasExpeditionCavernActionResolved(normalizedCavernState, 'stabilize_collapse');
  const activeRoundActions = new Set((normalizedCavernState.round_actions || [])
    .filter(entry => entry.round_number === normalizedCavernState.round_number)
    .map(entry => entry.action_id));

  const makeNode = (node) => normalizeOnlineVisualNode({
    ...existingById.get(node.id),
    ...node,
    state: node.id === currentNodeId && !['resolved', 'reward', 'exit'].includes(node.state) ? 'active' : node.state,
  });

  return [
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.entrance,
      label: '洞口',
      kind: 'entrance',
      x: 10,
      y: 52,
      state: 'resolved',
      connected_node_ids: [EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad],
      event_id: 'cavern_entrance',
      available_action_ids: [],
      risk_preview: '撤离路线已确认。',
      reward_preview: '保留当前探索成果。',
      resource_cost_preview: {},
      resource_reward_preview: {},
    }),
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad,
      label: '回声岔路',
      kind: 'crossroad',
      x: 28,
      y: 42,
      state: routeResolved ? 'resolved' : 'available',
      connected_node_ids: [
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.entrance,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.ore,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.support,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.marker,
      ],
      event_id: event.id,
      available_action_ids: routePreview.available_action_ids,
      risk_preview: event.risk_hint,
      reward_preview: event.resource_hint,
      resource_cost_preview: routePreview.resource_cost_preview,
      resource_reward_preview: routePreview.resource_reward_preview,
    }),
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.ore,
      label: '暗色矿脉',
      kind: 'ore_vein',
      x: 52,
      y: 30,
      state: mineResolved ? 'reward' : activeRoundActions.has('split_mine') ? 'active' : 'available',
      connected_node_ids: [EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad, EXPEDITION_CAVERN_VISUAL_NODE_IDS.exit],
      event_id: event.id,
      available_action_ids: splitPreview.available_action_ids,
      risk_preview: splitPreview.risk_preview,
      reward_preview: splitPreview.reward_preview,
      resource_cost_preview: splitPreview.resource_cost_preview,
      resource_reward_preview: splitPreview.resource_reward_preview,
    }),
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.support,
      label: '松顶塌方',
      kind: 'collapse',
      x: 48,
      y: 62,
      state: supportResolved ? 'resolved' : normalizedCavernState.risk_value >= EXPEDITION_CAVERN_INITIAL_RISK ? 'danger' : 'available',
      connected_node_ids: [EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad, EXPEDITION_CAVERN_VISUAL_NODE_IDS.exit],
      event_id: event.id,
      available_action_ids: supportPreview.available_action_ids,
      risk_preview: supportPreview.risk_preview,
      reward_preview: supportPreview.reward_preview,
      resource_cost_preview: supportPreview.resource_cost_preview,
      resource_reward_preview: supportPreview.resource_reward_preview,
    }),
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.marker,
      label: '白路标记',
      kind: 'route_marker',
      x: 70,
      y: 44,
      state: routeResolved ? 'reward' : 'available',
      connected_node_ids: [
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.crossroad,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.exit,
      ],
      event_id: event.id,
      available_action_ids: routePreview.available_action_ids,
      risk_preview: routePreview.risk_preview,
      reward_preview: routePreview.reward_preview,
      resource_cost_preview: routePreview.resource_cost_preview,
      resource_reward_preview: routePreview.resource_reward_preview,
    }),
    makeNode({
      id: EXPEDITION_CAVERN_VISUAL_NODE_IDS.exit,
      label: '撤离点',
      kind: 'exit',
      x: 90,
      y: 54,
      state: 'exit',
      connected_node_ids: [
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.ore,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.support,
        EXPEDITION_CAVERN_VISUAL_NODE_IDS.marker,
      ],
      event_id: 'cavern_exit',
      available_action_ids: [],
      risk_preview: '保留当前探索成果并进入结算。',
      reward_preview: '路线回看将在后续结算任务中承接。',
      resource_cost_preview: {},
      resource_reward_preview: {},
    }),
  ].filter(Boolean);
}

function syncExpeditionCavernVisualState(room, cavernState, options = {}) {
  if (room?.gameplay_template_id !== 'expedition_cavern') return null;
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const previousNodes = visualState.nodes || [];
  let nodes = buildExpeditionCavernVisualNodes(cavernState, previousNodes);
  const recentFeedback = sanitizeText(options.recentFeedback || cavernState?.recent_feedback || visualState.recent_feedback, 180);
  const selectedVisualId = sanitizeText(options.selectedVisualId, 80) || visualState.selected_visual_id || getExpeditionCavernCurrentVisualNodeId(cavernState);
  const claimedBy = sanitizeText(options.claimedBy, 40);
  if (claimedBy && selectedVisualId) {
    nodes = nodes.map(node => node.id === selectedVisualId
      ? normalizeOnlineVisualNode({ ...node, owner_username: claimedBy, claimed_by: claimedBy })
      : node);
  }
  room.visual_state = normalizeOnlineVisualState({
    ...visualState,
    board_type: 'map',
    board_id: visualState.board_id || buildDefaultVisualBoardId(room),
    revision: visualState.revision + (options.incrementRevision ? 1 : 0),
    selected_visual_id: selectedVisualId,
    nodes,
    recent_feedback: recentFeedback,
  }, room);
  return room.visual_state;
}

function getLanternFairCurrentVisualObjectId(room, festivalState) {
  const event = getFestivalCurrentEvent(room, festivalState);
  return LANTERN_FAIR_EVENT_OBJECT_MAP[event?.id] || LANTERN_FAIR_VISUAL_OBJECT_IDS.mainLantern;
}

function buildLanternFairVisualActionMap(room) {
  const template = getGameplayTemplateByDomain(room?.activity_domain, room?.gameplay_template_id, room?.template_id);
  const actionIds = new Set((template.action_options || []).map(action => sanitizeText(action.id, 60)).filter(Boolean));
  return Object.entries(LANTERN_FAIR_ACTION_OBJECT_MAP).reduce((actionMap, [actionId, objectId]) => {
    if (!actionIds.has(actionId)) return actionMap;
    if (!actionMap.has(objectId)) actionMap.set(objectId, []);
    actionMap.get(objectId).push(actionId);
    return actionMap;
  }, new Map());
}

function resolveLanternFairVisualObjectState(definition, context) {
  const {
    actionIds,
    eventObjectId,
    festivalState,
    isCompleted,
    isTarget,
    progressTarget,
    progressValue,
    resources,
  } = context;
  if (isCompleted || (progressTarget > 0 && progressValue >= progressTarget)) return 'complete';
  if (definition.id === LANTERN_FAIR_VISUAL_OBJECT_IDS.crowd && festivalState.pressure_value >= festivalState.pressure_max - 1) return 'overheated';
  if (definition.id === LANTERN_FAIR_VISUAL_OBJECT_IDS.festivalStall && (resources.supplies || 0) <= 0) return 'blocked';
  if (definition.id === LANTERN_FAIR_VISUAL_OBJECT_IDS.photoSpot && (resources.memory || 0) <= 0 && actionIds.length === 0) return 'blocked';
  if (isTarget || progressValue > 0 || definition.id === eventObjectId) return 'busy';
  if (actionIds.length > 0) return 'needs_action';
  return 'idle';
}

function buildLanternFairVisualObjects(room, festivalState, existingObjects = [], options = {}) {
  const normalizedFestivalState = normalizeFestivalState(festivalState, room?.template_id);
  const existingById = new Map((existingObjects || []).map(normalizeOnlineVisualObject).filter(Boolean).map(object => [object.id, object]));
  const actionMap = buildLanternFairVisualActionMap(room);
  const targetObjectId = sanitizeText(options.targetObjectId, 80);
  const handledBy = sanitizeText(options.handledBy || options.claimedBy, 40);
  const handledAt = Math.max(0, Math.floor(Number(options.handledAt) || 0));
  const progressDelta = Math.max(0, Math.floor(Number(options.progressDelta) || 0));
  const eventObjectId = getLanternFairCurrentVisualObjectId(room, normalizedFestivalState);
  const resources = normalizeFestivalResources(normalizedFestivalState.team_resources);
  const isCompleted = room?.gameplay_state?.phase === 'completed';

  return LANTERN_FAIR_VISUAL_OBJECT_DEFS.map(definition => {
    const existing = existingById.get(definition.id);
    const actionIds = actionMap.get(definition.id) || [];
    const progressTarget = Math.max(0, Math.floor(Number(definition.progress_target) || 0));
    const baseProgress = progressTarget > 0
      ? clampNumber(existing?.progress_value, 0, progressTarget)
      : Math.max(0, Math.floor(Number(existing?.progress_value) || 0));
    const isTarget = definition.id === targetObjectId;
    const shouldAdvanceProgress = isTarget && (handledBy || progressDelta > 0 || options.advanceProgress === true);
    const nextProgress = progressTarget > 0 && shouldAdvanceProgress
      ? clampNumber(baseProgress + Math.max(1, progressDelta), 0, progressTarget)
      : baseProgress;
    const cooperationCurrentCount = definition.requires_cooperation
      ? Math.min(
        Math.max(0, Math.floor(Number(definition.cooperation_required_count) || 0)),
        Math.max(existing?.cooperation_current_count || 0, isTarget && handledBy ? 1 : 0)
      )
      : 0;

    return normalizeOnlineVisualObject({
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      x: definition.x,
      y: definition.y,
      state: resolveLanternFairVisualObjectState(definition, {
        actionIds,
        eventObjectId,
        festivalState: normalizedFestivalState,
        isCompleted,
        isTarget,
        progressTarget,
        progressValue: nextProgress,
        resources,
      }),
      available_action_ids: actionIds,
      progress_value: nextProgress,
      progress_target: progressTarget,
      handled_by: isTarget && handledBy ? handledBy : existing?.handled_by,
      handled_at: isTarget && handledAt ? handledAt : existing?.handled_at,
      requires_cooperation: definition.requires_cooperation === true,
      cooperation_required_count: definition.cooperation_required_count || 0,
      cooperation_current_count: cooperationCurrentCount,
    });
  });
}

function syncLanternFairVisualState(room, festivalState, options = {}) {
  if (room?.activity_domain !== 'festival' || room?.template_id !== 'lantern_fair') return null;
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const targetObjectId = sanitizeText(options.selectedVisualId || options.targetObjectId, 80)
    || visualState.selected_visual_id
    || getLanternFairCurrentVisualObjectId(room, festivalState);
  const objects = buildLanternFairVisualObjects(room, festivalState, visualState.objects, {
    ...options,
    targetObjectId,
  });
  const recentFeedback = sanitizeText(options.recentFeedback || festivalState?.recent_feedback || visualState.recent_feedback, 180);
  const highlights = options.appendHighlight && targetObjectId && recentFeedback
    ? [
      normalizeOnlineVisualHighlight({
        id: makeId('lantern_highlight'),
        visual_id: targetObjectId,
        type: 'success',
        label: sanitizeText(options.highlightLabel, 40) || '灯会行动',
        summary: recentFeedback,
        created_at: nowSeconds(),
      }),
      ...(visualState.highlights || []),
    ].slice(0, 16)
    : visualState.highlights;
  room.visual_state = normalizeOnlineVisualState({
    ...visualState,
    board_type: 'scene',
    board_id: visualState.board_id || buildDefaultVisualBoardId(room),
    revision: visualState.revision + (options.incrementRevision ? 1 : 0),
    selected_visual_id: targetObjectId,
    objects,
    highlights,
    recent_feedback: recentFeedback,
  }, room);
  return room.visual_state;
}

function isDragonBoatRoom(room) {
  return room?.activity_domain === 'festival' && room?.template_id === 'dragon_boat';
}

function isEscortConvoyRoom(room) {
  return room?.activity_domain === 'expedition' && room?.gameplay_template_id === 'expedition_escort';
}

function getDragonBoatRoomActionIds(room) {
  const template = getGameplayTemplateByDomain(room?.activity_domain, room?.gameplay_template_id, room?.template_id);
  return (template.action_options || [])
    .map(action => sanitizeText(action.id, 60))
    .filter(Boolean);
}

function getDragonBoatPositionIndex(room, trackLength) {
  const progressValue = Math.max(0, Math.floor(Number(room?.gameplay_state?.progress_value) || 0));
  const progressTarget = Math.max(1, Math.floor(Number(room?.gameplay_state?.progress_target) || trackLength - 1 || 1));
  if (progressValue >= progressTarget) return Math.max(0, trackLength - 1);
  const scaledPosition = Math.round((progressValue / progressTarget) * Math.max(1, trackLength - 1));
  return clampNumber(scaledPosition, 0, Math.max(0, trackLength - 2));
}

function getDragonBoatTeamState(room, actionId, positionIndex, trackLength) {
  if (positionIndex >= trackLength - 1 || room?.gameplay_state?.phase === 'completed') return 'finished';
  const effect = DRAGON_BOAT_ACTION_EFFECT_MAP[sanitizeText(actionId, 60)];
  if (effect === 'boost') return 'boosted';
  if (effect === 'protect') return 'protected';
  if (effect === 'blocked') return 'blocked';
  if (effect === 'retreat') return 'retreating';
  if (effect === 'advance') return 'advancing';
  return 'idle';
}

function getEscortConvoyRoomActionIds(room) {
  const template = getGameplayTemplateByDomain(room?.activity_domain, room?.gameplay_template_id, room?.template_id);
  return (template.action_options || [])
    .map(action => sanitizeText(action.id, 60))
    .filter(Boolean);
}

function getEscortConvoyPositionIndex(room, trackLength) {
  const progressValue = Math.max(0, Math.floor(Number(room?.gameplay_state?.progress_value) || 0));
  const progressTarget = Math.max(1, Math.floor(Number(room?.gameplay_state?.progress_target) || trackLength - 1 || 1));
  if (progressValue >= progressTarget) return Math.max(0, trackLength - 1);
  const scaledPosition = Math.round((progressValue / progressTarget) * Math.max(1, trackLength - 1));
  return clampNumber(scaledPosition, 0, Math.max(0, trackLength - 2));
}

function getEscortConvoyTeamState(room, actionId, positionIndex, trackLength) {
  if (positionIndex >= trackLength - 1 || room?.gameplay_state?.phase === 'completed') return 'finished';
  const effect = ESCORT_CONVOY_ACTION_EFFECT_MAP[sanitizeText(actionId, 60)];
  if (effect === 'protect') return 'protected';
  if (effect === 'blocked') return 'blocked';
  if (effect === 'advance') return 'advancing';
  return 'idle';
}

function buildEscortConvoyVisualTrack(room, existingTracks = [], options = {}) {
  const trackLength = ESCORT_CONVOY_VISUAL_TRACK_CELLS.length;
  const positionIndex = getEscortConvoyPositionIndex(room, trackLength);
  const actionIds = getEscortConvoyRoomActionIds(room);
  const actionIdSet = new Set(actionIds);
  const existingTrack = (Array.isArray(existingTracks) ? existingTracks : [])
    .map(normalizeOnlineVisualTrack)
    .filter(Boolean)
    .find(track => track.id === ESCORT_CONVOY_VISUAL_TRACK_ID);
  const lastActionId = sanitizeText(options.actionId || room?.gameplay_state?.last_action_id, 60);
  const teamState = getEscortConvoyTeamState(room, lastActionId, positionIndex, trackLength);
  const isCompleted = room?.gameplay_state?.phase === 'completed';

  const cells = ESCORT_CONVOY_VISUAL_TRACK_CELLS.map((definition, index) => {
    const existingCell = (existingTrack?.cells || []).find(cell => cell.id === definition.id);
    const cellActionIds = (definition.action_ids || []).filter(actionId => actionIdSet.has(actionId));
    const currentCellActionIds = !isCompleted && index === positionIndex ? actionIds : [];
    const availableActionIds = [...new Set([...cellActionIds, ...currentCellActionIds])].slice(0, 12);
    return normalizeOnlineVisualTrackCell({
      ...existingCell,
      id: definition.id,
      label: definition.label,
      index,
      kind: definition.kind,
      occupant_team_ids: index === positionIndex ? [ESCORT_CONVOY_VISUAL_TEAM_ID] : [],
      event_id: definition.event_id,
      effect_ids: definition.effect_ids,
      available_action_ids: availableActionIds,
      risk_preview: definition.risk_preview,
      reward_preview: definition.reward_preview,
    });
  });

  return normalizeOnlineVisualTrack({
    ...existingTrack,
    id: ESCORT_CONVOY_VISUAL_TRACK_ID,
    label: '商队护送路线',
    kind: 'escort_convoy',
    length: trackLength,
    current_round: positionIndex,
    cells,
    teams: [
      {
        team_id: ESCORT_CONVOY_VISUAL_TEAM_ID,
        label: '护送车队',
        marker: '车',
        position_index: positionIndex,
        state: teamState,
        last_action_id: lastActionId,
      },
    ],
  });
}

function syncEscortConvoyVisualState(room, options = {}) {
  if (!isEscortConvoyRoom(room)) return null;
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const track = buildEscortConvoyVisualTrack(room, visualState.tracks, options);
  const positionCell = (track.cells || []).find(cell => (cell.occupant_team_ids || []).includes(ESCORT_CONVOY_VISUAL_TEAM_ID))
    || track.cells?.[0];
  const selectedVisualId = sanitizeText(options.selectedVisualId, 80) || positionCell?.id || visualState.selected_visual_id;
  const recentFeedback = sanitizeText(options.recentFeedback || room?.gameplay_state?.last_action_summary || visualState.recent_feedback, 180);
  const highlights = options.appendHighlight && selectedVisualId && recentFeedback
    ? [
      normalizeOnlineVisualHighlight({
        id: makeId('escort_convoy_highlight'),
        visual_id: selectedVisualId,
        type: 'success',
        label: sanitizeText(options.highlightLabel, 40) || '护送行动',
        summary: recentFeedback,
        created_at: nowSeconds(),
      }),
      ...(visualState.highlights || []),
    ].slice(0, 16)
    : visualState.highlights;
  room.visual_state = normalizeOnlineVisualState({
    ...visualState,
    board_type: 'track',
    board_id: visualState.board_id || buildDefaultVisualBoardId(room),
    revision: visualState.revision + (options.incrementRevision ? 1 : 0),
    selected_visual_id: selectedVisualId,
    tracks: [track],
    highlights,
    recent_feedback: recentFeedback,
  }, room);
  return room.visual_state;
}

function buildDragonBoatVisualTrack(room, festivalState, existingTracks = [], options = {}) {
  const normalizedFestivalState = normalizeFestivalState(festivalState, room?.template_id);
  const trackLength = DRAGON_BOAT_VISUAL_TRACK_CELLS.length;
  const positionIndex = getDragonBoatPositionIndex(room, trackLength);
  const actionIds = getDragonBoatRoomActionIds(room);
  const actionIdSet = new Set(actionIds);
  const existingTrack = (Array.isArray(existingTracks) ? existingTracks : [])
    .map(normalizeOnlineVisualTrack)
    .filter(Boolean)
    .find(track => track.id === DRAGON_BOAT_VISUAL_TRACK_ID);
  const lastActionId = sanitizeText(options.actionId || room?.gameplay_state?.last_action_id, 60);
  const teamState = getDragonBoatTeamState(room, lastActionId, positionIndex, trackLength);
  const isCompleted = room?.gameplay_state?.phase === 'completed';
  const currentEvent = getFestivalCurrentEvent(room, normalizedFestivalState);

  const cells = DRAGON_BOAT_VISUAL_TRACK_CELLS.map((definition, index) => {
    const existingCell = (existingTrack?.cells || []).find(cell => cell.id === definition.id);
    const cellActionIds = (definition.action_ids || []).filter(actionId => actionIdSet.has(actionId));
    const currentCellActionIds = !isCompleted && index === positionIndex ? actionIds : [];
    const availableActionIds = [...new Set([...cellActionIds, ...currentCellActionIds])].slice(0, 12);
    const isCurrentEventCell = definition.event_id && definition.event_id === currentEvent?.id;
    return normalizeOnlineVisualTrackCell({
      ...existingCell,
      id: definition.id,
      label: definition.label,
      index,
      kind: definition.kind,
      occupant_team_ids: index === positionIndex ? [DRAGON_BOAT_VISUAL_TEAM_ID] : [],
      event_id: definition.event_id,
      effect_ids: definition.effect_ids,
      available_action_ids: availableActionIds,
      risk_preview: definition.risk_preview || (isCurrentEventCell ? currentEvent?.pressure_hint : ''),
      reward_preview: definition.reward_preview || (isCurrentEventCell ? currentEvent?.resource_hint : ''),
    });
  });

  return normalizeOnlineVisualTrack({
    ...existingTrack,
    id: DRAGON_BOAT_VISUAL_TRACK_ID,
    label: '端午龙舟河道',
    kind: 'dragon_boat',
    length: trackLength,
    current_round: Math.max(0, Math.floor(Number(normalizedFestivalState.round_number) || 1) - 1),
    cells,
    teams: [
      {
        team_id: DRAGON_BOAT_VISUAL_TEAM_ID,
        label: '同心龙舟',
        marker: '舟',
        position_index: positionIndex,
        state: teamState,
        last_action_id: lastActionId,
      },
    ],
  });
}

function syncDragonBoatVisualState(room, festivalState, options = {}) {
  if (!isDragonBoatRoom(room)) return null;
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const track = buildDragonBoatVisualTrack(room, festivalState, visualState.tracks, options);
  const positionCell = (track.cells || []).find(cell => (cell.occupant_team_ids || []).includes(DRAGON_BOAT_VISUAL_TEAM_ID))
    || track.cells?.[0];
  const selectedVisualId = sanitizeText(options.selectedVisualId, 80) || positionCell?.id || visualState.selected_visual_id;
  const recentFeedback = sanitizeText(options.recentFeedback || festivalState?.recent_feedback || visualState.recent_feedback, 180);
  const highlights = options.appendHighlight && selectedVisualId && recentFeedback
    ? [
      normalizeOnlineVisualHighlight({
        id: makeId('dragon_boat_highlight'),
        visual_id: selectedVisualId,
        type: 'success',
        label: sanitizeText(options.highlightLabel, 40) || '赛舟行动',
        summary: recentFeedback,
        created_at: nowSeconds(),
      }),
      ...(visualState.highlights || []),
    ].slice(0, 16)
    : visualState.highlights;
  room.visual_state = normalizeOnlineVisualState({
    ...visualState,
    board_type: 'track',
    board_id: visualState.board_id || buildDefaultVisualBoardId(room),
    revision: visualState.revision + (options.incrementRevision ? 1 : 0),
    selected_visual_id: selectedVisualId,
    tracks: [track],
    highlights,
    recent_feedback: recentFeedback,
  }, room);
  return room.visual_state;
}

function getFestivalEventsForRoomTemplate(roomTemplateId) {
  const normalizedTemplateId = sanitizeText(roomTemplateId, 40);
  const events = FESTIVAL_ROUND_EVENTS_BY_TEMPLATE[normalizedTemplateId] || FESTIVAL_ROUND_EVENTS_BY_TEMPLATE.default;
  return Array.isArray(events) && events.length > 0 ? events : FESTIVAL_ROUND_EVENTS_BY_TEMPLATE.default;
}

function getFestivalEventByRound(roomTemplateId, roundNumber) {
  const events = getFestivalEventsForRoomTemplate(roomTemplateId);
  const normalizedRound = Math.max(1, Math.floor(Number(roundNumber) || 1));
  const eventIndex = (normalizedRound - 1) % events.length;
  return events[eventIndex] || events[0];
}

function normalizeFestivalResources(value) {
  const source = value && typeof value === 'object' ? value : {};
  return FESTIVAL_RESOURCE_DEFS.reduce((resources, definition) => {
    resources[definition.id] = clampNumber(source[definition.id], 0, definition.max_value);
    return resources;
  }, {});
}

function createInitialFestivalResources() {
  return FESTIVAL_RESOURCE_DEFS.reduce((resources, definition) => {
    resources[definition.id] = definition.initial_value;
    return resources;
  }, {});
}

function normalizeFestivalResourceDelta(value) {
  const source = value && typeof value === 'object' ? value : {};
  return FESTIVAL_RESOURCE_DEFS.reduce((delta, definition) => {
    const nextValue = Math.floor(Number(source[definition.id]) || 0);
    if (nextValue !== 0) delta[definition.id] = nextValue;
    return delta;
  }, {});
}

function normalizeFestivalRoundLogEntry(entry) {
  return {
    id: String(entry?.id || makeId('festival_round_log')),
    round_number: Math.max(1, Math.floor(Number(entry?.round_number) || 1)),
    event_id: sanitizeText(entry?.event_id, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    actor_display_name: sanitizeText(entry?.actor_display_name, 40),
    action_id: sanitizeText(entry?.action_id, 40),
    action_label: sanitizeText(entry?.action_label, 40),
    role_id: sanitizeText(entry?.role_id, 24),
    role_label: sanitizeText(entry?.role_label, 24),
    summary: sanitizeText(entry?.summary, 180),
    progress_delta: Math.max(0, Math.floor(Number(entry?.progress_delta) || 0)),
    score_delta: Math.max(0, Math.floor(Number(entry?.score_delta) || 0)),
    pressure_delta: Math.floor(Number(entry?.pressure_delta) || 0),
    resource_delta: normalizeFestivalResourceDelta(entry?.resource_delta),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function createInitialFestivalState(roomTemplateId = '') {
  const initialRound = 1;
  const event = getFestivalEventByRound(roomTemplateId, initialRound);
  return {
    round_number: initialRound,
    current_event_id: event.id,
    pressure_value: FESTIVAL_INITIAL_PRESSURE,
    pressure_max: FESTIVAL_ROUND_PRESSURE_MAX,
    team_resources: createInitialFestivalResources(),
    role_assignments: [],
    round_actions: [],
    round_log: [],
    recent_feedback: `第 ${initialRound} 回合进入「${event.label}」：${event.summary}`,
  };
}

function normalizeFestivalRoleAssignment(entry) {
  const roleId = sanitizeText(entry?.role_id, 24);
  const roleDefinition = FESTIVAL_ROLE_DEFS.find(item => item.id === roleId) || FESTIVAL_ROLE_DEFS[0];
  return {
    username: sanitizeText(entry?.username, 40),
    display_name: sanitizeText(entry?.display_name, 40),
    role_id: roleDefinition.id,
    role_label: roleDefinition.label,
    role_summary: roleDefinition.summary,
  };
}

function normalizeFestivalRoundAction(entry) {
  return {
    round_number: Math.max(1, Math.floor(Number(entry?.round_number) || 1)),
    action_id: sanitizeText(entry?.action_id, 40),
    actor_username: sanitizeText(entry?.actor_username, 40),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeFestivalState(value, roomTemplateId = '') {
  const initial = createInitialFestivalState(roomTemplateId);
  const source = value && typeof value === 'object' ? value : {};
  const roundNumber = Math.max(1, Math.floor(Number(source.round_number) || initial.round_number));
  const event = getFestivalEventsForRoomTemplate(roomTemplateId).find(item => item.id === sanitizeText(source.current_event_id, 40))
    || getFestivalEventByRound(roomTemplateId, roundNumber);
  return {
    round_number: roundNumber,
    current_event_id: event.id,
    pressure_value: clampNumber(source.pressure_value ?? initial.pressure_value, 0, FESTIVAL_ROUND_PRESSURE_MAX),
    pressure_max: FESTIVAL_ROUND_PRESSURE_MAX,
    team_resources: normalizeFestivalResources(source.team_resources ?? initial.team_resources),
    role_assignments: Array.isArray(source.role_assignments)
      ? source.role_assignments.map(normalizeFestivalRoleAssignment).filter(item => item.username)
      : [],
    round_actions: Array.isArray(source.round_actions)
      ? source.round_actions.map(normalizeFestivalRoundAction).filter(item => item.actor_username && item.action_id)
      : [],
    round_log: Array.isArray(source.round_log)
      ? source.round_log.map(normalizeFestivalRoundLogEntry).slice(0, FESTIVAL_ROUND_LOG_LIMIT)
      : [],
    recent_feedback: sanitizeText(source.recent_feedback || initial.recent_feedback, 180),
  };
}

function getFestivalRoleForMember(room, member) {
  const joinedMembers = getJoinedMembers(room);
  const memberIndex = Math.max(0, joinedMembers.findIndex(item => item.username === member.username));
  const roleDefinition = FESTIVAL_ROLE_DEFS[memberIndex % FESTIVAL_ROLE_DEFS.length] || FESTIVAL_ROLE_DEFS[0];
  return {
    username: member.username,
    display_name: member.display_name,
    role_id: roleDefinition.id,
    role_label: roleDefinition.label,
    role_summary: roleDefinition.summary,
  };
}

function syncFestivalRoleAssignments(room, festivalState) {
  const joinedMembers = getJoinedMembers(room);
  festivalState.role_assignments = joinedMembers.map(member => getFestivalRoleForMember(room, member));
  return festivalState.role_assignments;
}

function getFestivalRoleLabel(roleId) {
  const role = FESTIVAL_ROLE_DEFS.find(item => item.id === sanitizeText(roleId, 24));
  return role?.label || '';
}

function getFestivalActionRoleStatus(room, member, actionOption) {
  const requiredRole = sanitizeText(actionOption?.required_role, 24);
  if (!requiredRole || !member) return { can_use: true, disabled_reason: '' };
  return { can_use: true, disabled_reason: '' };
}

function getFestivalRoundActionStatus(gameplayState, member, actionOption) {
  const festivalState = normalizeFestivalState(gameplayState?.festival_state);
  if (!actionOption?.once_per_round || !member) return { can_use: true, disabled_reason: '' };
  const alreadyUsed = (festivalState.round_actions || []).some(entry =>
    entry.round_number === festivalState.round_number &&
    entry.actor_username === member.username &&
    entry.action_id === actionOption.id
  );
  if (!alreadyUsed) return { can_use: true, disabled_reason: '' };
  return {
    can_use: false,
    disabled_reason: '这个动作每位成员每回合只能执行一次',
  };
}

function applyFestivalResourceDelta(festivalState, resourceDelta) {
  const delta = normalizeFestivalResourceDelta(resourceDelta);
  const nextResources = normalizeFestivalResources(festivalState.team_resources);
  for (const definition of FESTIVAL_RESOURCE_DEFS) {
    const nextValue = (nextResources[definition.id] || 0) + (delta[definition.id] || 0);
    nextResources[definition.id] = clampNumber(nextValue, 0, definition.max_value);
  }
  festivalState.team_resources = nextResources;
  return delta;
}

function summarizeFestivalResourceDelta(resourceDelta) {
  const delta = normalizeFestivalResourceDelta(resourceDelta);
  return FESTIVAL_RESOURCE_DEFS
    .filter(definition => delta[definition.id])
    .map(definition => `${definition.label}${formatSignedDelta(delta[definition.id])}`)
    .join('，');
}

function mergeFestivalResourceDelta(baseDelta, extraDelta) {
  const base = normalizeFestivalResourceDelta(baseDelta);
  const extra = normalizeFestivalResourceDelta(extraDelta);
  return FESTIVAL_RESOURCE_DEFS.reduce((merged, definition) => {
    const nextValue = (base[definition.id] || 0) + (extra[definition.id] || 0);
    if (nextValue !== 0) merged[definition.id] = nextValue;
    return merged;
  }, {});
}

function getFestivalCurrentEvent(room, festivalState) {
  return getFestivalEventsForRoomTemplate(room?.template_id).find(item => item.id === sanitizeText(festivalState?.current_event_id, 40))
    || getFestivalEventByRound(room?.template_id, festivalState?.round_number);
}

function buildFestivalEventSnapshot(event) {
  return {
    id: event.id,
    label: event.label,
    summary: event.summary,
    pressure_hint: event.pressure_hint,
    resource_hint: event.resource_hint,
    combo_tags: Array.isArray(event.combo_tags) ? [...event.combo_tags] : [],
  };
}

function createInitialGameplayState(gameplayTemplateId, roomTemplateId = '') {
  const roomTemplate = getRoomTemplate(roomTemplateId);
  const template = getGameplayTemplateByDomain(getTemplateDomain(roomTemplate), gameplayTemplateId, roomTemplateId);
  const state = {
    template_id: template.id,
    phase: 'prep',
    progress_value: 0,
    progress_target: Math.max(1, Math.floor(Number(template.default_target) || 1)),
    score_value: 0,
    last_action_id: '',
    last_action_summary: '',
    last_actor_username: '',
    last_actor_display_name: '',
    completed_at: 0,
    contributions: [],
  };
  if (getTemplateDomain(roomTemplate) === 'festival') {
    state.festival_state = createInitialFestivalState(roomTemplate.id);
  }
  if (template.id === 'expedition_cavern') {
    state.cavern_state = createInitialExpeditionCavernState();
  }
  return state;
}

function normalizeGameplayState(entry, gameplayTemplateId, roomTemplateId = '', activityDomain = DEFAULT_ACTIVITY_DOMAIN) {
  const template = getGameplayTemplateByDomain(activityDomain, gameplayTemplateId, roomTemplateId);
  const currentTemplateId = sanitizeText(entry?.template_id, 40);
  if (!entry || typeof entry !== 'object' || (currentTemplateId && currentTemplateId !== template.id)) {
    return createInitialGameplayState(template.id, roomTemplateId);
  }
  const state = {
    template_id: template.id,
    phase: normalizeGameplayPhase(entry?.phase),
    progress_value: Math.max(0, Math.floor(Number(entry?.progress_value) || 0)),
    progress_target: Math.max(1, Math.floor(Number(entry?.progress_target) || template.default_target || 1)),
    score_value: Math.max(0, Math.floor(Number(entry?.score_value) || 0)),
    last_action_id: sanitizeText(entry?.last_action_id, 40),
    last_action_summary: sanitizeText(entry?.last_action_summary, 160),
    last_actor_username: sanitizeText(entry?.last_actor_username, 40),
    last_actor_display_name: sanitizeText(entry?.last_actor_display_name, 40),
    completed_at: Math.max(0, Math.floor(Number(entry?.completed_at) || 0)),
    contributions: Array.isArray(entry?.contributions)
      ? entry.contributions.map(normalizeGameplayContribution).filter(item => item.username)
      : [],
  };
  if (activityDomain === 'festival') {
    state.festival_state = normalizeFestivalState(entry?.festival_state, roomTemplateId);
  }
  if (template.id === 'expedition_cavern') {
    state.cavern_state = normalizeExpeditionCavernState(entry?.cavern_state);
  }
  return state;
}

function normalizeRoom(entry) {
  const requestedTemplate = ROOM_TEMPLATE_MAP[sanitizeText(entry?.template_id, 40)];
  const activityDomain = normalizeActivityDomain(entry?.activity_domain || entry?.domain || getTemplateDomain(requestedTemplate));
  const template = getRoomTemplateByDomain(activityDomain, entry?.template_id);
  const gameplayTemplate = getGameplayTemplateByDomain(activityDomain, entry?.gameplay_template_id, template.id);
  return {
    id: String(entry?.id || makeId(ACTIVITY_ROOM_ID_PREFIX[activityDomain] || ACTIVITY_ROOM_ID_PREFIX.festival)),
    activity_domain: activityDomain,
    template_id: template.id,
    gameplay_template_id: gameplayTemplate.id,
    title: sanitizeText(entry?.title, 60) || template.label,
    host_username: sanitizeText(entry?.host_username, 40),
    host_display_name: sanitizeText(entry?.host_display_name, 40) || sanitizeText(entry?.host_username, 40),
    member_limit: Math.min(4, Math.max(2, Math.floor(Number(entry?.member_limit) || template.default_member_limit || 4))),
    countdown_seconds: Math.min(30, Math.max(1, Math.floor(Number(entry?.countdown_seconds) || DEFAULT_COUNTDOWN_SECONDS))),
    reconnect_window_seconds: Math.min(600, Math.max(10, Math.floor(Number(entry?.reconnect_window_seconds) || DEFAULT_RECONNECT_WINDOW_SECONDS))),
    state: normalizeRoomState(entry?.state),
    state_reason: sanitizeText(entry?.state_reason, 120),
    paused_from_state: sanitizeText(entry?.paused_from_state, 24),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || nowSeconds())),
    ready_check_started_at: Math.max(0, Math.floor(Number(entry?.ready_check_started_at) || 0)),
    countdown_started_at: Math.max(0, Math.floor(Number(entry?.countdown_started_at) || 0)),
    countdown_ends_at: Math.max(0, Math.floor(Number(entry?.countdown_ends_at) || 0)),
    running_started_at: Math.max(0, Math.floor(Number(entry?.running_started_at) || 0)),
    settled_at: Math.max(0, Math.floor(Number(entry?.settled_at) || 0)),
    closed_at: Math.max(0, Math.floor(Number(entry?.closed_at) || 0)),
    aborted_at: Math.max(0, Math.floor(Number(entry?.aborted_at) || 0)),
    settlement_version: Math.max(0, Math.floor(Number(entry?.settlement_version) || 0)),
    members: Array.isArray(entry?.members) ? entry.members.map(normalizeRoomMember).filter(member => member.username) : [],
    invitations: Array.isArray(entry?.invitations) ? entry.invitations.map(normalizeRoomInvitation).filter(invite => invite.target_username) : [],
    events: Array.isArray(entry?.events) ? entry.events.map(normalizeRoomEvent).slice(0, EVENT_LIMIT) : [],
    gameplay_state: normalizeGameplayState(entry?.gameplay_state, gameplayTemplate.id, template.id, activityDomain),
    visual_state: normalizeOnlineVisualState(entry?.visual_state, {
      activity_domain: activityDomain,
      template_id: template.id,
      gameplay_template_id: gameplayTemplate.id,
    }),
    settlement_receipt_ids: Array.isArray(entry?.settlement_receipt_ids)
      ? entry.settlement_receipt_ids.map(item => sanitizeText(item, 60)).filter(Boolean).slice(0, RECEIPT_LIMIT)
      : [],
  };
}

function getReceiptListForRoom(store, room) {
  const allowedIds = new Set(room.settlement_receipt_ids || []);
  return (store.receipts || [])
    .map(normalizeRoomReceipt)
    .filter(receipt => allowedIds.has(receipt.id))
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0));
}

function recordRoomEvent(room, event, actor, summary) {
  room.events = [normalizeRoomEvent({
    event,
    actor_username: actor?.username,
    actor_display_name: actor?.displayName || actor?.username,
    summary,
    created_at: nowSeconds(),
  }), ...(room.events || []).map(normalizeRoomEvent)].slice(0, EVENT_LIMIT);
}

function getRoomMember(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  return (room.members || []).find(member => member.username === normalizedUsername) || null;
}

function getRoomInvitation(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  return (room.invitations || []).find(invite => invite.target_username === normalizedUsername && invite.status === 'pending') || null;
}

function getActiveRoomSaveIdentity(username) {
  try {
    const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源乡存档');
    return context?.identity || null;
  } catch {
    return null;
  }
}

function ensureInvitationMatchesActiveSave(invitation, username) {
  const targetSaveId = normalizeActivitySaveId(invitation?.target_save_id);
  if (!targetSaveId) return;
  const identity = getActiveRoomSaveIdentity(username);
  if (!identity || normalizeActivitySaveId(identity.save_id) !== targetSaveId) {
    throw createError('当前活动存档与房间邀请不匹配，请先切换到受邀存档再加入', 403);
  }
}

function isMemberParticipating(member) {
  return ['joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting', 'finished', 'settled'].includes(member?.status);
}

function getJoinedMembers(room) {
  return (room.members || []).filter(isMemberParticipating);
}

function ensureRoomExists(store, roomId) {
  const room = (store.rooms || []).map(normalizeRoom).find(entry => entry.id === String(roomId || '').trim());
  if (!room) throw createError('节会房间不存在', 404);
  return room;
}

function replaceRoom(store, room) {
  store.rooms = (store.rooms || [])
    .map(normalizeRoom)
    .filter(entry => entry.id !== room.id);
  store.rooms.unshift(normalizeRoom(room));
}

function touchRoom(room) {
  room.updated_at = nowSeconds();
}

function updateRoomState(room, nextState, reason = '') {
  room.state = normalizeRoomState(nextState);
  room.state_reason = sanitizeText(reason, 120);
  touchRoom(room);
}

function ensureRoomGameplayState(room) {
  const gameplayTemplate = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  room.gameplay_template_id = gameplayTemplate.id;
  room.gameplay_state = normalizeGameplayState(room.gameplay_state, room.gameplay_template_id, room.template_id, room.activity_domain);
  if (gameplayTemplate.id === 'group_photo') {
    const targetValue = Math.max(2, Math.min(room.member_limit, getJoinedMembers(room).length || 2));
    if (room.gameplay_state.progress_target !== targetValue) {
      room.gameplay_state.progress_target = targetValue;
      touchRoom(room);
    }
  }
  if (room.activity_domain === 'festival') {
    room.gameplay_state.festival_state = normalizeFestivalState(room.gameplay_state.festival_state, room.template_id);
    syncFestivalRoleAssignments(room, room.gameplay_state.festival_state);
    syncLanternFairVisualState(room, room.gameplay_state.festival_state);
    syncDragonBoatVisualState(room, room.gameplay_state.festival_state);
  }
  if (gameplayTemplate.id === 'expedition_cavern') {
    room.gameplay_state.cavern_state = normalizeExpeditionCavernState(room.gameplay_state.cavern_state);
    syncExpeditionCavernRoleAssignments(room, room.gameplay_state.cavern_state);
    syncExpeditionCavernVisualState(room, room.gameplay_state.cavern_state);
  }
  if (gameplayTemplate.id === 'expedition_escort') {
    syncEscortConvoyVisualState(room);
  }
  return room.gameplay_state;
}

function materializeGameplayPhase(room) {
  const gameplayState = ensureRoomGameplayState(room);
  if (gameplayState.completed_at > 0 && gameplayState.phase !== 'completed') {
    gameplayState.phase = 'completed';
    touchRoom(room);
    return true;
  }
  if (room.state === 'running' && gameplayState.phase === 'prep') {
    gameplayState.phase = 'active';
    touchRoom(room);
    return true;
  }
  return false;
}

function materializeCountdownState(room) {
  if (room.state !== 'countdown') return false;
  if ((room.countdown_ends_at || 0) > nowSeconds()) return false;
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (normalized.status === 'countdown_locked') {
      normalized.status = 'active';
      normalized.last_seen_at = nowSeconds();
    }
    return normalized;
  });
  room.running_started_at = room.countdown_ends_at || nowSeconds();
  room.countdown_ends_at = 0;
  updateRoomState(room, 'running', '');
  materializeGameplayPhase(room);
  recordRoomEvent(room, 'room.start', {
    username: room.host_username,
    displayName: room.host_display_name,
  }, `${getRoomTemplate(room.template_id).label} 已正式开场`);
  return true;
}

function ensureRoomNotFinished(room) {
  if (['settling', 'closed', 'aborted'].includes(room.state)) {
    throw createError('当前房间已经进入收尾状态，不能继续修改成员流程');
  }
}

function ensureHost(room, username) {
  if (room.host_username !== sanitizeText(username, 40)) {
    throw createError('只有房主可以执行这个节会房间操作', 403);
  }
}

function ensureViewerCanSeeRoom(room, username) {
  const normalizedUsername = sanitizeText(username, 40);
  if (room.host_username === normalizedUsername) return;
  if (getRoomMember(room, normalizedUsername)) return;
  if (getRoomInvitation(room, normalizedUsername)) return;
  throw createError('你当前无权查看这个节会房间', 403);
}

function ensureNoOtherActiveRoom(store, username) {
  const normalizedUsername = sanitizeText(username, 40);
  const activeRoom = (store.rooms || [])
    .map(normalizeRoom)
    .find(room => {
      if (['closed', 'aborted'].includes(room.state)) return false;
      const member = getRoomMember(room, normalizedUsername);
      return Boolean(member && isMemberParticipating(member));
    });
  if (activeRoom) {
    throw createError('当前账号还有未结束的节会房间，请先回到原房间收尾');
  }
}

function getViewerSaveSlot(username) {
  const slot = getActiveSaveSlot(username);
  return Number.isInteger(Number(slot)) && Number(slot) >= 0 ? Number(slot) : 0;
}

function canStartReadyCheck(room) {
  const joinedMembers = getJoinedMembers(room).filter(member => ['joined', 'ready'].includes(member.status));
  return ['created', 'inviting', 'ready_check'].includes(room.state) && joinedMembers.length >= 2;
}

function canStartCountdown(room) {
  if (room.state !== 'ready_check') return false;
  const joinedMembers = getJoinedMembers(room).filter(member => ['joined', 'ready'].includes(member.status));
  return joinedMembers.length >= 2 && joinedMembers.every(member => member.status === 'ready');
}

function buildOpeningCeremony(room) {
  const template = getRoomTemplateByDomain(room.activity_domain, room.template_id);
  if (room.state === 'countdown') {
    return {
      stage: 'countdown',
      title: template.opening_title,
      subtitle: `倒计时还剩 ${Math.max(0, room.countdown_ends_at - nowSeconds())} 秒`,
      lines: [...template.opening_lines],
      countdown_remaining_seconds: Math.max(0, room.countdown_ends_at - nowSeconds()),
    };
  }
  if (room.state === 'running' && room.running_started_at > 0 && nowSeconds() - room.running_started_at <= 6) {
    return {
      stage: 'running_intro',
      title: template.opening_title,
      subtitle: '开场已完成，全员进入节会房间',
      lines: [...template.opening_lines],
      countdown_remaining_seconds: 0,
    };
  }
  return null;
}

function findGameplayContribution(gameplayState, username) {
  const normalizedUsername = sanitizeText(username, 40);
  return (gameplayState?.contributions || []).find(item => item.username === normalizedUsername) || null;
}

function ensureGameplayContribution(gameplayState, member) {
  let contribution = findGameplayContribution(gameplayState, member.username);
  if (contribution) {
    contribution.display_name = member.display_name;
    return contribution;
  }
  contribution = normalizeGameplayContribution({
    username: member.username,
    display_name: member.display_name,
  });
  gameplayState.contributions = [...(gameplayState.contributions || []), contribution];
  return contribution;
}

function buildGameplayProgressText(template, gameplayState) {
  return `${template.objective_label} ${Math.min(gameplayState.progress_value, gameplayState.progress_target)} / ${gameplayState.progress_target}`;
}

function buildExpeditionCavernRoundText(cavernState) {
  const event = getExpeditionCavernCurrentEvent(cavernState);
  return `第 ${Math.max(1, cavernState?.round_number || 1)} 回合 · ${event.label}`;
}

function buildFestivalRoundText(room, festivalState) {
  const event = getFestivalCurrentEvent(room, festivalState);
  return `第 ${Math.max(1, festivalState?.round_number || 1)} 回合 · ${event.label}`;
}

function buildExpeditionCavernResourceSummary(cavernState) {
  const resources = normalizeExpeditionCavernResources(cavernState?.team_resources);
  return EXPEDITION_CAVERN_RESOURCE_DEFS.map(definition => `${definition.label}${resources[definition.id] || 0}`).join(' / ');
}

function buildFestivalResourceSummary(festivalState) {
  const resources = normalizeFestivalResources(festivalState?.team_resources);
  return FESTIVAL_RESOURCE_DEFS.map(definition => `${definition.label}${resources[definition.id] || 0}`).join(' / ');
}

function buildExpeditionCavernTeamRoles(room, cavernState) {
  const joinedMembers = getJoinedMembers(room);
  const assignments = Array.isArray(cavernState?.role_assignments) && cavernState.role_assignments.length > 0
    ? cavernState.role_assignments
    : joinedMembers.map(member => getExpeditionCavernRoleForMember(room, member));
  return joinedMembers.map(member => {
    const assignment = assignments.find(item => item.username === member.username) || getExpeditionCavernRoleForMember(room, member);
    return {
      username: member.username,
      display_name: member.display_name,
      role_id: assignment.role_id,
      role_label: assignment.role_label,
      role_summary: assignment.role_summary,
    };
  });
}

function buildExpeditionCavernRoundLog(room, cavernState) {
  const joinedMembers = getJoinedMembers(room);
  const roleAssignments = buildExpeditionCavernTeamRoles(room, cavernState);
  const roleByUsername = new Map(roleAssignments.map(item => [item.username, item]));
  const memberByUsername = new Map(joinedMembers.map(member => [member.username, member]));
  return (cavernState?.round_log || [])
    .slice(0, EXPEDITION_CAVERN_ROUND_LOG_LIMIT)
    .map(entry => {
      const member = memberByUsername.get(entry.actor_username);
      const role = roleByUsername.get(entry.actor_username);
      return {
        id: entry.id,
        round_number: entry.round_number,
        event_id: entry.event_id,
        actor_username: entry.actor_username,
        actor_display_name: entry.actor_display_name || member?.display_name || entry.actor_username,
        action_id: entry.action_id,
        action_label: entry.action_label,
        role_id: entry.role_id || role?.role_id || '',
        role_label: entry.role_label || role?.role_label || '',
        summary: entry.summary,
        progress_delta: entry.progress_delta,
        score_delta: entry.score_delta,
        risk_delta: entry.risk_delta,
        resource_delta: entry.resource_delta,
        resource_delta_text: summarizeExpeditionCavernResourceDelta(entry.resource_delta),
        created_at: entry.created_at,
      };
    });
}

function getExpeditionCavernRouteNodeForAction(actionId, cavernState) {
  const normalizedActionId = sanitizeText(actionId, 40);
  if (EXPEDITION_CAVERN_ACTION_NODE_MAP[normalizedActionId]) {
    return EXPEDITION_CAVERN_ACTION_NODE_MAP[normalizedActionId];
  }
  if (normalizedActionId === 'round_advance') {
    return getExpeditionCavernCurrentVisualNodeId(cavernState);
  }
  return '';
}

function buildExpeditionCavernRouteReplay(room) {
  if (room?.gameplay_template_id !== 'expedition_cavern') return normalizeReceiptRouteReplay(null);
  const gameplayState = ensureRoomGameplayState(room);
  const cavernState = normalizeExpeditionCavernState(gameplayState.cavern_state);
  syncExpeditionCavernRoleAssignments(room, cavernState);
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const nodes = visualState.nodes.length > 0
    ? visualState.nodes
    : buildExpeditionCavernVisualNodes(cavernState);
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const orderedLog = buildExpeditionCavernRoundLog(room, cavernState)
    .filter(entry => entry.action_id && entry.action_id !== 'round_advance')
    .reverse();
  const seenRouteNodeIds = new Set();
  const routeNodes = [];
  const appendRouteNode = (nodeId) => {
    const normalizedNodeId = sanitizeText(nodeId, 80);
    if (!normalizedNodeId || seenRouteNodeIds.has(normalizedNodeId)) return;
    const node = nodeById.get(normalizedNodeId);
    if (!node) return;
    seenRouteNodeIds.add(normalizedNodeId);
    routeNodes.push({
      id: node.id,
      label: node.label,
      kind: node.kind,
      state: node.state,
      order: routeNodes.length + 1,
    });
  };
  appendRouteNode(EXPEDITION_CAVERN_VISUAL_NODE_IDS.entrance);
  for (const entry of orderedLog) {
    appendRouteNode(getExpeditionCavernRouteNodeForAction(entry.action_id, cavernState));
  }
  appendRouteNode(EXPEDITION_CAVERN_VISUAL_NODE_IDS.exit);

  const highlightNodes = orderedLog
    .filter(entry => entry.score_delta > 0 || entry.risk_delta < 0 || entry.resource_delta_text)
    .slice(-4)
    .map(entry => {
      const nodeId = getExpeditionCavernRouteNodeForAction(entry.action_id, cavernState);
      const node = nodeById.get(nodeId);
      return normalizeReceiptRouteReplayHighlight({
        node_id: nodeId,
        label: node?.label || entry.action_label,
        summary: entry.summary,
        type: entry.score_delta > 0 ? 'reward' : entry.risk_delta < 0 ? 'success' : 'info',
      });
    })
    .filter(Boolean);

  let runningRisk = EXPEDITION_CAVERN_INITIAL_RISK;
  let riskPeak = {
    value: runningRisk,
    round_number: 1,
    action_label: '',
    actor_display_name: '',
    summary: '入洞时的基础风险。',
  };
  for (const entry of orderedLog) {
    runningRisk = clampNumber(runningRisk + entry.risk_delta, 0, EXPEDITION_CAVERN_RISK_MAX);
    if (runningRisk >= riskPeak.value) {
      riskPeak = {
        value: runningRisk,
        round_number: entry.round_number,
        action_label: entry.action_label,
        actor_display_name: entry.actor_display_name,
        summary: entry.summary,
      };
    }
  }

  const roleByUsername = new Map(buildExpeditionCavernTeamRoles(room, cavernState).map(role => [role.username, role]));
  const memberContributions = getSortedGameplayContributions(room).map(entry => {
    const role = roleByUsername.get(entry.username);
    return normalizeReceiptRouteReplayContribution({
      ...entry,
      role_label: role?.role_label || '',
      summary: `${entry.display_name} 推进 ${entry.progress_value}，采集值 ${entry.score_value}，行动 ${entry.action_count} 次。`,
    });
  }).filter(Boolean);

  const summary = routeNodes.length > 0
    ? `路线 ${routeNodes.map(node => node.label).join(' -> ')}；风险峰值 ${riskPeak.value}/${EXPEDITION_CAVERN_RISK_MAX}。`
    : `矿洞探索记录已生成；风险峰值 ${riskPeak.value}/${EXPEDITION_CAVERN_RISK_MAX}。`;
  return normalizeReceiptRouteReplay({
    kind: 'expedition_cavern',
    title: '矿洞探索记录',
    summary,
    route_nodes: routeNodes,
    highlight_nodes: highlightNodes,
    risk_peak: riskPeak,
    member_contributions: memberContributions,
  });
}

function buildFestivalTeamRoles(room, festivalState) {
  const joinedMembers = getJoinedMembers(room);
  const assignments = Array.isArray(festivalState?.role_assignments) && festivalState.role_assignments.length > 0
    ? festivalState.role_assignments
    : joinedMembers.map(member => getFestivalRoleForMember(room, member));
  return joinedMembers.map(member => {
    const assignment = assignments.find(item => item.username === member.username) || getFestivalRoleForMember(room, member);
    return {
      username: member.username,
      display_name: member.display_name,
      role_id: assignment.role_id,
      role_label: assignment.role_label,
      role_summary: assignment.role_summary,
    };
  });
}

function buildFestivalRoundLog(room, festivalState) {
  const joinedMembers = getJoinedMembers(room);
  const roleAssignments = buildFestivalTeamRoles(room, festivalState);
  const roleByUsername = new Map(roleAssignments.map(item => [item.username, item]));
  const memberByUsername = new Map(joinedMembers.map(member => [member.username, member]));
  return (festivalState?.round_log || [])
    .slice(0, FESTIVAL_ROUND_LOG_LIMIT)
    .map(entry => {
      const member = memberByUsername.get(entry.actor_username);
      const role = roleByUsername.get(entry.actor_username);
      return {
        id: entry.id,
        round_number: entry.round_number,
        event_id: entry.event_id,
        actor_username: entry.actor_username,
        actor_display_name: entry.actor_display_name || member?.display_name || entry.actor_username,
        action_id: entry.action_id,
        action_label: entry.action_label,
        role_id: entry.role_id || role?.role_id || '',
        role_label: entry.role_label || role?.role_label || '',
        summary: entry.summary,
        progress_delta: entry.progress_delta,
        score_delta: entry.score_delta,
        pressure_delta: entry.pressure_delta,
        resource_delta: entry.resource_delta,
        resource_delta_text: summarizeFestivalResourceDelta(entry.resource_delta),
        created_at: entry.created_at,
      };
    });
}

function buildDragonBoatRouteReplay(room) {
  if (!isDragonBoatRoom(room)) return normalizeReceiptRouteReplay(null);
  const gameplayState = ensureRoomGameplayState(room);
  const festivalState = normalizeFestivalState(gameplayState.festival_state, room.template_id);
  syncFestivalRoleAssignments(room, festivalState);
  syncDragonBoatVisualState(room, festivalState);
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const track = visualState.tracks.find(entry => entry.id === DRAGON_BOAT_VISUAL_TRACK_ID)
    || buildDragonBoatVisualTrack(room, festivalState, visualState.tracks);
  const team = (track.teams || []).find(entry => entry.team_id === DRAGON_BOAT_VISUAL_TEAM_ID) || track.teams?.[0] || null;
  const positionIndex = Math.max(0, Math.floor(Number(team?.position_index) || 0));
  const routeNodes = (track.cells || [])
    .slice()
    .sort((left, right) => left.index - right.index)
    .map(cell => normalizeReceiptRouteReplayNode({
      id: cell.id,
      label: cell.label,
      kind: cell.kind,
      state: cell.index < positionIndex
        ? 'resolved'
        : cell.index === positionIndex
          ? (cell.kind === 'finish' ? 'finish' : 'active')
          : 'available',
      order: cell.index + 1,
    }))
    .filter(Boolean);

  const orderedLog = buildFestivalRoundLog(room, festivalState)
    .filter(entry => entry.action_id && entry.action_id !== 'round_advance')
    .reverse();
  const highlightNodes = (visualState.highlights || [])
    .slice(0, 4)
    .map(highlight => {
      const cell = (track.cells || []).find(entry => entry.id === highlight.visual_id);
      return normalizeReceiptRouteReplayHighlight({
        node_id: highlight.visual_id,
        label: cell?.label || highlight.label,
        summary: highlight.summary,
        type: highlight.type || 'success',
      });
    })
    .filter(Boolean);

  let runningPressure = FESTIVAL_INITIAL_PRESSURE;
  let pressurePeak = {
    value: runningPressure,
    round_number: 1,
    action_label: '',
    actor_display_name: '',
    summary: '开船时的基础压力。',
  };
  for (const entry of orderedLog) {
    runningPressure = clampNumber(runningPressure + entry.pressure_delta, 0, FESTIVAL_ROUND_PRESSURE_MAX);
    if (runningPressure >= pressurePeak.value) {
      pressurePeak = {
        value: runningPressure,
        round_number: entry.round_number,
        action_label: entry.action_label,
        actor_display_name: entry.actor_display_name,
        summary: entry.summary,
      };
    }
  }

  const roleByUsername = new Map(buildFestivalTeamRoles(room, festivalState).map(role => [role.username, role]));
  const memberContributions = getSortedGameplayContributions(room).map(entry => {
    const role = roleByUsername.get(entry.username);
    return normalizeReceiptRouteReplayContribution({
      ...entry,
      role_label: role?.role_label || '',
      summary: `${entry.display_name} 推进 ${entry.progress_value}，默契值 ${entry.score_value}，行动 ${entry.action_count} 次。`,
    });
  }).filter(Boolean);

  const finishCell = routeNodes.find(node => node.kind === 'finish');
  const reachedFinish = Boolean(finishCell && positionIndex + 1 >= finishCell.order);
  const trackLength = Math.max(1, Math.floor(Number(track.length) || routeNodes.length || 1));
  const rankedTeams = [...(track.teams || [])]
    .filter(entry => sanitizeText(entry?.team_id, 80))
    .sort((left, right) => {
      const leftFinished = left.state === 'finished' || left.position_index >= trackLength - 1 ? 1 : 0;
      const rightFinished = right.state === 'finished' || right.position_index >= trackLength - 1 ? 1 : 0;
      if (rightFinished !== leftFinished) return rightFinished - leftFinished;
      if (right.position_index !== left.position_index) return right.position_index - left.position_index;
      const rightBoosted = right.state === 'boosted' || right.state === 'advancing' ? 1 : 0;
      const leftBoosted = left.state === 'boosted' || left.state === 'advancing' ? 1 : 0;
      return rightBoosted - leftBoosted;
    });
  const raceRankings = rankedTeams.map((entry, index) => {
    const finished = entry.state === 'finished' || entry.position_index >= trackLength - 1;
    const rank = index + 1;
    const rankLabel = rankedTeams.length > 1 ? `第 ${rank} / ${rankedTeams.length} 名` : '合作队';
    return normalizeReceiptRouteReplayRaceRanking({
      team_id: entry.team_id,
      label: entry.label,
      rank,
      rank_label: rankLabel,
      position_index: entry.position_index,
      score_value: gameplayState.score_value,
      finished,
      summary: `${entry.label || entry.team_id} 推进到第 ${Math.min(entry.position_index + 1, trackLength)} / ${trackLength} 格，${finished ? '已冲线' : '仍在赛道中'}。`,
    });
  }).filter(Boolean);
  const roomTeamRace = raceRankings.find(entry => entry.team_id === team?.team_id) || raceRankings[0] || null;
  const raceMode = raceRankings.length > 1 ? 'race' : 'cooperation';
  const rankLabel = raceMode === 'race'
    ? (roomTeamRace?.rank_label || '未记录名次')
    : (reachedFinish ? '合作完赛' : '合作演练');
  const popularityBonus = clampNumber(
    Math.floor(Math.max(0, gameplayState.score_value) / 2)
      + (reachedFinish ? 2 : 0)
      + Math.max(0, raceRankings.length - 1)
      - Math.floor(pressurePeak.value / 5),
    0,
    12
  );
  const popularityLabel = popularityBonus > 0 ? `节会人气 +${popularityBonus}` : '节会人气持平';
  const titleLabel = FESTIVAL_TITLE_REWARD_MAP[room.template_id]?.label || '';
  const summary = `赛道推进 ${Math.min(positionIndex + 1, trackLength)}/${trackLength} 格，${reachedFinish ? '已经冲过终点' : '尚未冲线'}；默契值 ${gameplayState.score_value}，压力峰值 ${pressurePeak.value}/${FESTIVAL_ROUND_PRESSURE_MAX}；${rankLabel}，${popularityLabel}${titleLabel ? `，称号「${titleLabel}」` : ''}。`;
  return normalizeReceiptRouteReplay({
    kind: 'dragon_boat',
    title: '端午赛舟成绩单',
    summary,
    route_nodes: routeNodes,
    highlight_nodes: highlightNodes,
    risk_peak: pressurePeak,
    member_contributions: memberContributions,
    race_result: {
      mode: raceMode,
      rank: roomTeamRace?.rank || 1,
      rank_label: rankLabel,
      team_count: raceRankings.length || 1,
      title_label: titleLabel,
      popularity_bonus: popularityBonus,
      popularity_label: popularityLabel,
      reached_finish: reachedFinish,
    },
    race_rankings: raceRankings,
  });
}

function buildEscortConvoyRouteReplay(room) {
  if (!isEscortConvoyRoom(room)) return normalizeReceiptRouteReplay(null);
  const gameplayState = ensureRoomGameplayState(room);
  syncEscortConvoyVisualState(room);
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  const track = visualState.tracks.find(entry => entry.id === ESCORT_CONVOY_VISUAL_TRACK_ID)
    || buildEscortConvoyVisualTrack(room, visualState.tracks);
  const team = (track.teams || []).find(entry => entry.team_id === ESCORT_CONVOY_VISUAL_TEAM_ID) || track.teams?.[0] || null;
  const positionIndex = Math.max(0, Math.floor(Number(team?.position_index) || 0));
  const routeNodes = (track.cells || [])
    .slice()
    .sort((left, right) => left.index - right.index)
    .map(cell => normalizeReceiptRouteReplayNode({
      id: cell.id,
      label: cell.label,
      kind: cell.kind,
      state: cell.index < positionIndex
        ? 'resolved'
        : cell.index === positionIndex
          ? (cell.kind === 'finish' ? 'finish' : 'active')
          : 'available',
      order: cell.index + 1,
    }))
    .filter(Boolean);

  const highlightNodes = (visualState.highlights || [])
    .slice(0, 4)
    .map(highlight => {
      const cell = (track.cells || []).find(entry => entry.id === highlight.visual_id);
      return normalizeReceiptRouteReplayHighlight({
        node_id: highlight.visual_id,
        label: cell?.label || highlight.label,
        summary: highlight.summary,
        type: highlight.type || 'success',
      });
    })
    .filter(Boolean);

  const incidentWeight = gameplayState.last_action_id === 'answer_incident' ? 2 : gameplayState.last_action_id === 'stabilize_cargo' ? 0 : 1;
  const escortRisk = clampNumber(
    2 + Math.max(0, gameplayState.progress_value - Math.floor(gameplayState.score_value / 2)) + incidentWeight,
    0,
    10
  );
  const riskPeak = {
    value: escortRisk,
    round_number: Math.max(1, positionIndex + 1),
    action_label: sanitizeText(gameplayState.last_action_id, 40),
    actor_display_name: sanitizeText(gameplayState.last_actor_display_name, 40),
    summary: gameplayState.last_action_summary || '护送途中风险由里程、完整度和最近行动共同估算。',
  };

  const memberContributions = getSortedGameplayContributions(room).map(entry => normalizeReceiptRouteReplayContribution({
    ...entry,
    role_label: entry.role_label || '',
    summary: `${entry.display_name} 推进 ${entry.progress_value}，货物完整度 ${entry.score_value}，行动 ${entry.action_count} 次。`,
  })).filter(Boolean);

  const trackLength = Math.max(1, Math.floor(Number(track.length) || routeNodes.length || 1));
  const reachedFinish = routeNodes.some(node => node.kind === 'finish' && positionIndex + 1 >= node.order);
  const summary = `护送路线 ${routeNodes.map(node => node.label).join(' -> ')}；车队推进 ${Math.min(positionIndex + 1, trackLength)}/${trackLength} 格，${reachedFinish ? '已抵达交付点' : '仍在护送途中'}；货物完整度 ${gameplayState.score_value}，途中风险 ${riskPeak.value}/10。`;
  return normalizeReceiptRouteReplay({
    kind: 'escort_convoy',
    title: '商队护送记录',
    summary,
    route_nodes: routeNodes,
    highlight_nodes: highlightNodes,
    risk_peak: riskPeak,
    member_contributions: memberContributions,
  });
}

function createExpeditionCavernRoundSummary(room, cavernState, actor, actionOption, contribution, resourceDelta, riskDelta, extraSummary = '') {
  const event = getExpeditionCavernCurrentEvent(cavernState);
  const resourceText = summarizeExpeditionCavernResourceDelta(resourceDelta);
  const riskText = riskDelta ? `风险${formatSignedDelta(riskDelta)}` : '风险持平';
  const progressText = `${room.gameplay_state.progress_value}/${room.gameplay_state.progress_target}`;
  const scoreText = `${room.gameplay_state.score_value}`;
  const parts = [
    `${actor.displayName || actor.username} 执行「${actionOption.label}」`,
    `回合 ${Math.max(1, cavernState.round_number)}`,
    `事件「${event.label}」`,
    `进度 ${progressText}`,
    `采集值 ${scoreText}`,
    riskText,
  ];
  if (resourceText) parts.push(`资源 ${resourceText}`);
  if (extraSummary) parts.push(extraSummary);
  if (contribution?.locked) parts.push('本角色已锁定');
  return parts.join('，');
}

function createFestivalRoundSummary(room, festivalState, actor, actionOption, contribution, resourceDelta, pressureDelta, extraSummary = '') {
  const event = getFestivalCurrentEvent(room, festivalState);
  const resourceText = summarizeFestivalResourceDelta(resourceDelta);
  const pressureText = pressureDelta ? `场面压力${formatSignedDelta(pressureDelta)}` : '场面压力持平';
  const progressText = `${room.gameplay_state.progress_value}/${room.gameplay_state.progress_target}`;
  const scoreText = `${room.gameplay_state.score_value}`;
  const template = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const parts = [
    `${actor.displayName || actor.username} 执行「${actionOption.label}」`,
    `回合 ${Math.max(1, festivalState.round_number)}`,
    `事件「${event.label}」`,
    `进度 ${progressText}`,
    `${template.score_label}${scoreText}`,
    pressureText,
  ];
  if (resourceText) parts.push(`资源 ${resourceText}`);
  if (extraSummary) parts.push(extraSummary);
  if (contribution?.locked) parts.push('本成员动作已锁定');
  return parts.join('，');
}

function advanceExpeditionCavernRound(room, cavernState, actor) {
  const nextRound = Math.max(1, cavernState.round_number + 1);
  cavernState.round_number = nextRound;
  const event = getExpeditionCavernEventByRound(nextRound);
  cavernState.current_event_id = event.id;
  const currentResources = normalizeExpeditionCavernResources(cavernState.team_resources);
  const nextResources = {};
  for (const definition of EXPEDITION_CAVERN_RESOURCE_DEFS) {
    const restored = currentResources[definition.id] + (definition.id === 'lanterns' ? 1 : 0);
    nextResources[definition.id] = clampNumber(restored, 0, definition.max_value);
  }
  cavernState.team_resources = nextResources;
  cavernState.risk_value = clampNumber(cavernState.risk_value + 1, 0, EXPEDITION_CAVERN_RISK_MAX);
  cavernState.round_actions = [];
  syncExpeditionCavernRoleAssignments(room, cavernState);
  cavernState.recent_feedback = `第 ${nextRound} 回合进入「${event.label}」：${event.summary}`;
  cavernState.round_log = [
    normalizeExpeditionCavernRoundLogEntry({
      round_number: nextRound,
      event_id: event.id,
      actor_username: actor?.username,
      actor_display_name: actor?.displayName || actor?.username,
      action_id: 'round_advance',
      action_label: '回合推进',
      role_id: '',
      role_label: '',
      summary: cavernState.recent_feedback,
      progress_delta: 0,
      score_delta: 0,
      risk_delta: 1,
      resource_delta: {},
      created_at: nowSeconds(),
    }),
    ...(cavernState.round_log || []).slice(0, EXPEDITION_CAVERN_ROUND_LOG_LIMIT - 1),
  ];
  syncExpeditionCavernVisualState(room, cavernState, {
    incrementRevision: true,
    selectedVisualId: getExpeditionCavernCurrentVisualNodeId(cavernState),
    recentFeedback: cavernState.recent_feedback,
  });
  touchRoom(room);
}

function advanceFestivalRound(room, festivalState, actor) {
  const nextRound = Math.max(1, festivalState.round_number + 1);
  festivalState.round_number = nextRound;
  const event = getFestivalEventByRound(room.template_id, nextRound);
  festivalState.current_event_id = event.id;
  const currentResources = normalizeFestivalResources(festivalState.team_resources);
  const nextResources = {};
  for (const definition of FESTIVAL_RESOURCE_DEFS) {
    const restored = currentResources[definition.id] + (definition.id === 'order' ? 1 : 0);
    nextResources[definition.id] = clampNumber(restored, 0, definition.max_value);
  }
  festivalState.team_resources = nextResources;
  festivalState.pressure_value = clampNumber(festivalState.pressure_value + 1, 0, FESTIVAL_ROUND_PRESSURE_MAX);
  festivalState.round_actions = [];
  syncFestivalRoleAssignments(room, festivalState);
  festivalState.recent_feedback = `第 ${nextRound} 回合进入「${event.label}」：${event.summary}`;
  festivalState.round_log = [
    normalizeFestivalRoundLogEntry({
      round_number: nextRound,
      event_id: event.id,
      actor_username: actor?.username,
      actor_display_name: actor?.displayName || actor?.username,
      action_id: 'round_advance',
      action_label: '回合推进',
      role_id: '',
      role_label: '',
      summary: festivalState.recent_feedback,
      progress_delta: 0,
      score_delta: 0,
      pressure_delta: 1,
      resource_delta: { order: 1 },
      created_at: nowSeconds(),
    }),
    ...(festivalState.round_log || []).slice(0, FESTIVAL_ROUND_LOG_LIMIT - 1),
  ];
  syncLanternFairVisualState(room, festivalState, {
    incrementRevision: true,
    selectedVisualId: getLanternFairCurrentVisualObjectId(room, festivalState),
    recentFeedback: festivalState.recent_feedback,
  });
  syncDragonBoatVisualState(room, festivalState, {
    incrementRevision: true,
    recentFeedback: festivalState.recent_feedback,
  });
  touchRoom(room);
}

function applyExpeditionCavernRoundEffects(room, cavernState, actor, actionOption, contribution) {
  const event = getExpeditionCavernCurrentEvent(cavernState);
  const baseRiskDelta = Math.floor(Number(actionOption.risk_delta) || 0);
  const baseResourceDelta = normalizeExpeditionCavernResourceDelta(actionOption.resource_delta);
  const eventResourceDelta = {};
  let extraScoreDelta = 0;
  let extraRiskDelta = 0;
  let extraSummary = '';
  const actionTags = new Set(Array.isArray(actionOption.combo_tags) ? actionOption.combo_tags : []);

  if (event.combo_bonus && Array.isArray(event.combo_tags)) {
    const matched = event.combo_tags.some(tag => actionTags.has(tag));
    if (matched) {
      extraScoreDelta += Math.max(0, Math.floor(Number(event.combo_bonus.score_delta) || 0));
      extraRiskDelta += Math.floor(Number(event.combo_bonus.risk_delta) || 0);
      Object.assign(eventResourceDelta, normalizeExpeditionCavernResourceDelta(event.combo_bonus.resource_delta));
      extraSummary = sanitizeText(event.combo_bonus.summary, 120);
    }
  }

  if (baseRiskDelta !== 0) {
    cavernState.risk_value = clampNumber(cavernState.risk_value + baseRiskDelta, 0, cavernState.risk_max);
  }
  if (extraRiskDelta !== 0) {
    cavernState.risk_value = clampNumber(cavernState.risk_value + extraRiskDelta, 0, cavernState.risk_max);
  }

  const mergedResourceDelta = mergeExpeditionCavernResourceDelta(baseResourceDelta, eventResourceDelta);
  applyExpeditionCavernResourceDelta(cavernState, mergedResourceDelta);

  if (cavernState.risk_value >= cavernState.risk_max - 1) {
    cavernState.team_resources.supplies = clampNumber(cavernState.team_resources.supplies - 1, 0, 8);
  }
  if (extraScoreDelta > 0) {
    room.gameplay_state.score_value += extraScoreDelta;
    contribution.score_value += extraScoreDelta;
  }

  const roundLogEntry = normalizeExpeditionCavernRoundLogEntry({
    round_number: cavernState.round_number,
    event_id: event.id,
    actor_username: actor.username,
    actor_display_name: actor.displayName,
    action_id: actionOption.id,
    action_label: actionOption.label,
    role_id: contribution?.role_id || '',
    role_label: contribution?.role_label || '',
    summary: createExpeditionCavernRoundSummary(room, cavernState, actor, actionOption, contribution, mergedResourceDelta, baseRiskDelta + extraRiskDelta, extraSummary),
    progress_delta: Math.max(0, Math.floor(Number(actionOption.progress_delta) || 0)),
    score_delta: Math.max(0, Math.floor(Number(actionOption.score_delta) || 0)) + extraScoreDelta,
    risk_delta: baseRiskDelta + extraRiskDelta,
    resource_delta: mergedResourceDelta,
    created_at: nowSeconds(),
  });
  cavernState.round_log = [roundLogEntry, ...(cavernState.round_log || [])].slice(0, EXPEDITION_CAVERN_ROUND_LOG_LIMIT);
  cavernState.round_actions = [
    ...(cavernState.round_actions || []),
    {
      round_number: cavernState.round_number,
      action_id: actionOption.id,
      actor_username: actor.username,
      created_at: nowSeconds(),
    },
  ].slice(-12);
  cavernState.recent_feedback = roundLogEntry.summary;
  syncExpeditionCavernVisualState(room, cavernState, {
    incrementRevision: true,
    selectedVisualId: EXPEDITION_CAVERN_ACTION_NODE_MAP[actionOption.id] || getExpeditionCavernCurrentVisualNodeId(cavernState),
    claimedBy: actor.username,
    recentFeedback: roundLogEntry.summary,
  });
  if (cavernState.round_actions.filter(entry => entry.round_number === cavernState.round_number).length >= EXPEDITION_CAVERN_ROUND_ACTION_TARGET) {
    advanceExpeditionCavernRound(room, cavernState, actor);
  } else {
    touchRoom(room);
  }
  return roundLogEntry;
}

function applyFestivalRoundEffects(room, festivalState, actor, actionOption, contribution) {
  const event = getFestivalCurrentEvent(room, festivalState);
  const basePressureDelta = Math.floor(Number(actionOption.pressure_delta) || 0);
  const baseResourceDelta = normalizeFestivalResourceDelta(actionOption.resource_delta);
  const eventResourceDelta = {};
  let extraScoreDelta = 0;
  let extraPressureDelta = 0;
  let extraSummary = '';
  const actionTags = new Set(Array.isArray(actionOption.combo_tags) ? actionOption.combo_tags : []);

  if (event.combo_bonus && Array.isArray(event.combo_tags)) {
    const matched = event.combo_tags.some(tag => actionTags.has(tag));
    if (matched) {
      extraScoreDelta += Math.max(0, Math.floor(Number(event.combo_bonus.score_delta) || 0));
      extraPressureDelta += Math.floor(Number(event.combo_bonus.pressure_delta) || 0);
      Object.assign(eventResourceDelta, normalizeFestivalResourceDelta(event.combo_bonus.resource_delta));
      extraSummary = sanitizeText(event.combo_bonus.summary, 120);
    }
  }

  if (basePressureDelta !== 0) {
    festivalState.pressure_value = clampNumber(festivalState.pressure_value + basePressureDelta, 0, festivalState.pressure_max);
  }
  if (extraPressureDelta !== 0) {
    festivalState.pressure_value = clampNumber(festivalState.pressure_value + extraPressureDelta, 0, festivalState.pressure_max);
  }

  const mergedResourceDelta = mergeFestivalResourceDelta(baseResourceDelta, eventResourceDelta);
  applyFestivalResourceDelta(festivalState, mergedResourceDelta);

  if (festivalState.pressure_value >= festivalState.pressure_max - 1) {
    festivalState.team_resources.order = clampNumber(festivalState.team_resources.order - 1, 0, 8);
  }
  if (extraScoreDelta > 0) {
    room.gameplay_state.score_value += extraScoreDelta;
    contribution.score_value += extraScoreDelta;
  }

  const roundLogEntry = normalizeFestivalRoundLogEntry({
    round_number: festivalState.round_number,
    event_id: event.id,
    actor_username: actor.username,
    actor_display_name: actor.displayName,
    action_id: actionOption.id,
    action_label: actionOption.label,
    role_id: contribution?.role_id || '',
    role_label: contribution?.role_label || '',
    summary: createFestivalRoundSummary(room, festivalState, actor, actionOption, contribution, mergedResourceDelta, basePressureDelta + extraPressureDelta, extraSummary),
    progress_delta: Math.max(0, Math.floor(Number(actionOption.progress_delta) || 0)),
    score_delta: Math.max(0, Math.floor(Number(actionOption.score_delta) || 0)) + extraScoreDelta,
    pressure_delta: basePressureDelta + extraPressureDelta,
    resource_delta: mergedResourceDelta,
    created_at: nowSeconds(),
  });
  festivalState.round_log = [roundLogEntry, ...(festivalState.round_log || [])].slice(0, FESTIVAL_ROUND_LOG_LIMIT);
  festivalState.round_actions = [
    ...(festivalState.round_actions || []),
    {
      round_number: festivalState.round_number,
      action_id: actionOption.id,
      actor_username: actor.username,
      created_at: nowSeconds(),
    },
  ].slice(-12);
  festivalState.recent_feedback = roundLogEntry.summary;
  syncLanternFairVisualState(room, festivalState, {
    incrementRevision: true,
    selectedVisualId: LANTERN_FAIR_ACTION_OBJECT_MAP[actionOption.id] || getLanternFairCurrentVisualObjectId(room, festivalState),
    handledBy: actor.username,
    handledAt: roundLogEntry.created_at,
    progressDelta: Math.max(0, Math.floor(Number(actionOption.progress_delta) || 0)),
    recentFeedback: roundLogEntry.summary,
    appendHighlight: true,
    highlightLabel: actionOption.label,
  });
  syncDragonBoatVisualState(room, festivalState, {
    incrementRevision: true,
    actionId: actionOption.id,
    recentFeedback: roundLogEntry.summary,
    appendHighlight: true,
    highlightLabel: actionOption.label,
  });
  if (festivalState.round_actions.filter(entry => entry.round_number === festivalState.round_number).length >= FESTIVAL_ROUND_ACTION_TARGET) {
    advanceFestivalRound(room, festivalState, actor);
  } else {
    touchRoom(room);
  }
  return roundLogEntry;
}

function buildExpeditionCavernSnapshot(room, viewerMember, gameplayState) {
  const cavernState = normalizeExpeditionCavernState(gameplayState?.cavern_state);
  syncExpeditionCavernRoleAssignments(room, cavernState);
  const event = getExpeditionCavernCurrentEvent(cavernState);
  const roleAssignments = buildExpeditionCavernTeamRoles(room, cavernState);
  const viewerAssignment = viewerMember ? roleAssignments.find(item => item.username === viewerMember.username) || null : null;
  const roundLog = buildExpeditionCavernRoundLog(room, cavernState);
  return {
    round_number: cavernState.round_number,
    round_text: buildExpeditionCavernRoundText(cavernState),
    current_event: buildExpeditionCavernEventSnapshot(event),
    risk_value: cavernState.risk_value,
    risk_max: cavernState.risk_max,
    risk_text: `${cavernState.risk_value} / ${cavernState.risk_max}`,
    team_resources: EXPEDITION_CAVERN_RESOURCE_DEFS.map(definition => ({
      id: definition.id,
      label: definition.label,
      value: cavernState.team_resources[definition.id] || 0,
      max_value: definition.max_value,
      text: `${definition.label} ${cavernState.team_resources[definition.id] || 0} / ${definition.max_value}`,
    })),
    role_assignments: roleAssignments,
    my_role: viewerAssignment,
    round_actions: cavernState.round_actions.slice(-12).map(entry => ({
      round_number: entry.round_number,
      action_id: entry.action_id,
      actor_username: entry.actor_username,
      created_at: entry.created_at,
    })),
    round_log: roundLog,
    recent_feedback: cavernState.recent_feedback,
  };
}

function buildFestivalSnapshot(room, viewerMember, gameplayState) {
  const festivalState = normalizeFestivalState(gameplayState?.festival_state, room.template_id);
  syncFestivalRoleAssignments(room, festivalState);
  const event = getFestivalCurrentEvent(room, festivalState);
  const roleAssignments = buildFestivalTeamRoles(room, festivalState);
  const viewerAssignment = viewerMember ? roleAssignments.find(item => item.username === viewerMember.username) || null : null;
  const roundLog = buildFestivalRoundLog(room, festivalState);
  return {
    round_number: festivalState.round_number,
    round_text: buildFestivalRoundText(room, festivalState),
    current_event: buildFestivalEventSnapshot(event),
    pressure_value: festivalState.pressure_value,
    pressure_max: festivalState.pressure_max,
    pressure_text: `${festivalState.pressure_value} / ${festivalState.pressure_max}`,
    team_resources: FESTIVAL_RESOURCE_DEFS.map(definition => ({
      id: definition.id,
      label: definition.label,
      value: festivalState.team_resources[definition.id] || 0,
      max_value: definition.max_value,
      text: `${definition.label} ${festivalState.team_resources[definition.id] || 0} / ${definition.max_value}`,
    })),
    role_assignments: roleAssignments,
    my_role: viewerAssignment,
    round_actions: festivalState.round_actions.slice(-12).map(entry => ({
      round_number: entry.round_number,
      action_id: entry.action_id,
      actor_username: entry.actor_username,
      created_at: entry.created_at,
    })),
    round_log: roundLog,
    recent_feedback: festivalState.recent_feedback,
    resource_summary: buildFestivalResourceSummary(festivalState),
  };
}

function canUseGameplayAction(room, gameplayState, viewerMember, actionOption) {
  if (!viewerMember) return { can_use: false, disabled_reason: '你当前不在这个节会房间里' };
  if (room.state !== 'running') return { can_use: false, disabled_reason: '只有房间进入进行中后，才能提交玩法动作' };
  if (viewerMember.status !== 'active') return { can_use: false, disabled_reason: '当前成员状态还不能执行玩法动作' };
  if (gameplayState.phase === 'completed') return { can_use: false, disabled_reason: '当前玩法模板已经完成' };
  const contribution = findGameplayContribution(gameplayState, viewerMember.username);
  if (actionOption.unique_per_member && contribution?.locked) {
    return { can_use: false, disabled_reason: '这个动作每位成员只能执行一次' };
  }
  if (room.activity_domain === 'expedition' && actionOption.required_role) {
    const roleStatus = getExpeditionCavernActionRoleStatus(room, viewerMember, actionOption);
    if (!roleStatus.can_use) return roleStatus;
  }
  if (gameplayState.template_id === 'expedition_cavern') {
    const roundStatus = getExpeditionCavernRoundActionStatus(gameplayState, viewerMember, actionOption);
    if (!roundStatus.can_use) return roundStatus;
  }
  if (room.activity_domain === 'festival') {
    const roleStatus = getFestivalActionRoleStatus(room, viewerMember, actionOption);
    if (!roleStatus.can_use) return roleStatus;
    const roundStatus = getFestivalRoundActionStatus(gameplayState, viewerMember, actionOption);
    if (!roundStatus.can_use) return roundStatus;
  }
  return { can_use: true, disabled_reason: '' };
}

function buildGameplaySnapshot(room, viewerUsername) {
  const template = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const gameplayState = ensureRoomGameplayState(room);
  const joinedMembers = getJoinedMembers(room);
  const viewerMember = getRoomMember(room, viewerUsername);
  const targetValue = template.id === 'group_photo'
    ? Math.max(2, Math.min(room.member_limit, joinedMembers.length || 2))
    : gameplayState.progress_target;
  if (template.id === 'group_photo' && gameplayState.progress_target !== targetValue) {
    gameplayState.progress_target = targetValue;
  }
  return {
    template_id: template.id,
    template_label: template.label,
    template_kind: template.kind,
    template_summary: template.summary,
    objective_label: template.objective_label,
    progress_value: Math.min(gameplayState.progress_value, gameplayState.progress_target),
    progress_target: gameplayState.progress_target,
    progress_percent: Math.min(100, Math.round((Math.min(gameplayState.progress_value, gameplayState.progress_target) / Math.max(1, gameplayState.progress_target)) * 100)),
    progress_text: buildGameplayProgressText(template, gameplayState),
    score_label: template.score_label,
    score_value: gameplayState.score_value,
    phase: gameplayState.phase,
    phase_label: gameplayState.phase === 'completed' ? '已完成' : room.state === 'running' ? '进行中' : room.state === 'paused' ? '已暂停' : '待开场',
    last_action_id: gameplayState.last_action_id,
    last_action_summary: gameplayState.last_action_summary,
    last_actor_username: gameplayState.last_actor_username,
    last_actor_display_name: gameplayState.last_actor_display_name,
    is_completed: gameplayState.phase === 'completed',
    completed_at: gameplayState.completed_at,
    contributions: joinedMembers.map(member => {
      const contribution = findGameplayContribution(gameplayState, member.username);
      return {
        username: member.username,
        display_name: member.display_name,
        progress_value: contribution?.progress_value || 0,
        score_value: contribution?.score_value || 0,
        action_count: contribution?.action_count || 0,
        locked: contribution?.locked === true,
        last_action_id: contribution?.last_action_id || '',
        last_action_label: contribution?.last_action_label || '',
        last_action_at: contribution?.last_action_at || 0,
      };
    }),
    cavern_state: template.id === 'expedition_cavern'
      ? buildExpeditionCavernSnapshot(room, viewerMember, gameplayState)
      : null,
    festival_state: room.activity_domain === 'festival'
      ? buildFestivalSnapshot(room, viewerMember, gameplayState)
      : null,
    available_actions: (template.action_options || []).map(actionOption => {
      const status = canUseGameplayAction(room, gameplayState, viewerMember, actionOption);
      const isFestivalRoom = room.activity_domain === 'festival';
      const pressureDelta = Math.floor(Number(actionOption.pressure_delta) || 0);
      const riskDelta = Math.floor(Number(actionOption.risk_delta) || 0);
      return {
        id: actionOption.id,
        label: actionOption.label,
        summary: actionOption.summary,
        unique_per_member: actionOption.unique_per_member === true,
        required_role: sanitizeText(actionOption.required_role, 24),
        required_role_label: isFestivalRoom ? getFestivalRoleLabel(actionOption.required_role) : getExpeditionCavernRoleLabel(actionOption.required_role),
        once_per_round: actionOption.once_per_round === true,
        pressure_delta: pressureDelta,
        pressure_delta_text: pressureDelta ? `场面压力${formatSignedDelta(pressureDelta)}` : '',
        risk_delta: riskDelta,
        risk_delta_text: riskDelta ? `风险${formatSignedDelta(riskDelta)}` : '',
        resource_delta: isFestivalRoom ? normalizeFestivalResourceDelta(actionOption.resource_delta) : normalizeExpeditionCavernResourceDelta(actionOption.resource_delta),
        resource_delta_text: isFestivalRoom ? summarizeFestivalResourceDelta(actionOption.resource_delta) : summarizeExpeditionCavernResourceDelta(actionOption.resource_delta),
        combo_tags: Array.isArray(actionOption.combo_tags) ? actionOption.combo_tags.map(item => sanitizeText(item, 24)).filter(Boolean).slice(0, 8) : [],
        round_effect: sanitizeText(actionOption.round_effect, 160),
        can_use: status.can_use,
        disabled_reason: status.disabled_reason,
      };
    }),
  };
}

function finalizeGameplayIfCompleted(room, actor) {
  const template = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const gameplayState = ensureRoomGameplayState(room);
  if (gameplayState.phase === 'completed') return false;
  if (gameplayState.progress_value < gameplayState.progress_target) return false;
  gameplayState.phase = 'completed';
  gameplayState.completed_at = nowSeconds();
  gameplayState.last_action_summary = `${buildGameplayProgressText(template, gameplayState)}，${template.score_label}${gameplayState.score_value}`;
  recordRoomEvent(room, 'room.objective.complete', actor, `${template.label} 模板已完成：${gameplayState.last_action_summary}`);
  touchRoom(room);
  return true;
}

function applyGameplayAction(room, actionId, actor) {
  const template = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  materializeGameplayPhase(room);
  const gameplayState = ensureRoomGameplayState(room);
  const member = getRoomMember(room, actor.username);
  if (!member) throw createError('你当前不在这个节会房间里');
  const actionOption = (template.action_options || []).find(item => item.id === actionId);
  if (!actionOption) throw createError('当前玩法模板不支持这个动作');
  const status = canUseGameplayAction(room, gameplayState, member, actionOption);
  if (!status.can_use) throw createError(status.disabled_reason || '当前玩法动作不能执行');

  const contribution = ensureGameplayContribution(gameplayState, member);
  contribution.action_count += 1;
  contribution.last_action_id = actionOption.id;
  contribution.last_action_label = actionOption.label;
  contribution.last_action_at = nowSeconds();
  const progressDelta = Math.max(0, Math.floor(Number(actionOption.progress_delta) || 0));
  const scoreDelta = Math.max(0, Math.floor(Number(actionOption.score_delta) || 0));
  contribution.progress_value += progressDelta;
  contribution.score_value += scoreDelta;
  if (actionOption.unique_per_member) contribution.locked = true;

  gameplayState.phase = 'active';
  gameplayState.progress_value = Math.min(gameplayState.progress_target, gameplayState.progress_value + progressDelta);
  gameplayState.score_value += scoreDelta;
  gameplayState.last_action_id = actionOption.id;
  gameplayState.last_actor_username = sanitizeText(actor.username, 40);
  gameplayState.last_actor_display_name = sanitizeText(actor.displayName, 40) || sanitizeText(actor.username, 40);
  if (template.id === 'expedition_cavern') {
    gameplayState.cavern_state = normalizeExpeditionCavernState(gameplayState.cavern_state);
    syncExpeditionCavernRoleAssignments(room, gameplayState.cavern_state);
    const roleAssignment = getExpeditionCavernRoleForMember(room, member);
    contribution.role_id = roleAssignment.role_id;
    contribution.role_label = roleAssignment.role_label;
    const roundLogEntry = applyExpeditionCavernRoundEffects(room, gameplayState.cavern_state, {
      username: gameplayState.last_actor_username,
      displayName: gameplayState.last_actor_display_name,
    }, actionOption, contribution);
    gameplayState.last_action_summary = roundLogEntry.summary;
  } else if (room.activity_domain === 'festival') {
    gameplayState.festival_state = normalizeFestivalState(gameplayState.festival_state, room.template_id);
    syncFestivalRoleAssignments(room, gameplayState.festival_state);
    const roleAssignment = getFestivalRoleForMember(room, member);
    contribution.role_id = roleAssignment.role_id;
    contribution.role_label = roleAssignment.role_label;
    const roundLogEntry = applyFestivalRoundEffects(room, gameplayState.festival_state, {
      username: gameplayState.last_actor_username,
      displayName: gameplayState.last_actor_display_name,
    }, actionOption, contribution);
    gameplayState.last_action_summary = roundLogEntry.summary;
  } else {
    gameplayState.last_action_summary = `${gameplayState.last_actor_display_name} 执行了「${actionOption.label}」；${buildGameplayProgressText(template, gameplayState)}，${template.score_label}${gameplayState.score_value}`;
    if (template.id === 'expedition_escort') {
      syncEscortConvoyVisualState(room, {
        incrementRevision: true,
        appendHighlight: true,
        actionId: actionOption.id,
        recentFeedback: gameplayState.last_action_summary,
        highlightLabel: actionOption.label,
      });
    }
  }
  touchRoom(room);
  recordRoomEvent(room, 'room.action', actor, gameplayState.last_action_summary);
  finalizeGameplayIfCompleted(room, actor);
}

function buildSettlementSummary(room) {
  const roomTemplate = getRoomTemplateByDomain(room.activity_domain, room.template_id);
  const gameplayTemplate = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const gameplayState = ensureRoomGameplayState(room);
  return `已为 ${roomTemplate.label} · ${gameplayTemplate.label} 生成第一轮节会结算凭证；当前${buildGameplayProgressText(gameplayTemplate, gameplayState)}，${gameplayTemplate.score_label}${gameplayState.score_value}。`;
}

function getReceiptStatusLabel(status) {
  if (status === 'persist_preview') return '已生成回写预览';
  if (status === 'pending_persist') return '待写回个人存档';
  if (status === 'persisted') return '已写回个人存档';
  if (status === 'compensation_pending') return '待补偿处理';
  return '已生成凭证';
}

function ensureRewardInventorySlotList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(entry => ({
      itemId: sanitizeText(entry?.itemId || entry?.item_id, 60),
      quality: REWARD_INVENTORY_QUALITIES.includes(sanitizeText(entry?.quality, 20)) ? sanitizeText(entry?.quality, 20) : 'normal',
      quantity: Math.max(1, Math.floor(Number(entry?.quantity) || 1)),
    }))
    .filter(entry => entry.itemId);
}

function addInventoryRewardItems(mainSlots, mainCapacity, tempSlots, tempCapacity, rewardItems) {
  const normalizedRewardItems = Array.isArray(rewardItems)
    ? rewardItems.map(item => ({
        itemId: sanitizeText(item?.item_id || item?.itemId, 60),
        quality: REWARD_INVENTORY_QUALITIES.includes(sanitizeText(item?.quality, 20)) ? sanitizeText(item?.quality, 20) : 'normal',
        quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)),
      })).filter(item => item.itemId && item.quantity > 0)
    : [];

  const placeIntoSlots = (slots, slotCapacity, itemId, quality, quantity) => {
    let remaining = quantity;
    for (const slot of slots) {
      if (remaining <= 0) break;
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < REWARD_INVENTORY_MAX_STACK) {
        const canAdd = Math.min(remaining, REWARD_INVENTORY_MAX_STACK - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }
    while (remaining > 0 && slots.length < slotCapacity) {
      const batch = Math.min(remaining, REWARD_INVENTORY_MAX_STACK);
      slots.push({ itemId, quality, quantity: batch });
      remaining -= batch;
    }
    return remaining;
  };

  const overflowItems = [];
  for (const item of normalizedRewardItems) {
    let remaining = placeIntoSlots(mainSlots, mainCapacity, item.itemId, item.quality, item.quantity);
    if (remaining > 0) {
      remaining = placeIntoSlots(tempSlots, tempCapacity, item.itemId, item.quality, remaining);
    }
    if (remaining > 0) {
      overflowItems.push({
        item_id: item.itemId,
        quality: item.quality,
        quantity: remaining,
      });
    }
  }

  return {
    mainSlots,
    tempSlots,
    overflowItems,
  };
}

function buildFestivalMemorialOverview(username) {
  try {
    const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源乡存档，暂时无法读取节会纪念册');
    const festivalRewardState = ensureFestivalRewardState(context.data);
    return (festivalRewardState.memorials || [])
      .map(normalizeFestivalMemorialEntry)
      .sort((left, right) => (right.awarded_at || 0) - (left.awarded_at || 0))
      .slice(0, 8)
      .map(entry => ({
        memorial_id: entry.memorial_id,
        label: entry.label,
        room_id: entry.room_id,
        template_id: entry.template_id,
        template_label: entry.template_label,
        gameplay_template_id: entry.gameplay_template_id,
        gameplay_template_label: entry.gameplay_template_label,
        awarded_at: entry.awarded_at,
        reward_summary: entry.reward_summary,
        reward_money: entry.reward_money,
        reward_ticket_quantity: entry.reward_ticket_quantity,
        decoration_label: entry.decoration_label,
        title_label: entry.title_label,
        squadmate_display_names: [...entry.squadmate_display_names],
        squadmate_friend_display_names: [...entry.squadmate_friend_display_names],
        photo_moment_label: entry.photo_moment_label,
        photo_line: entry.photo_line,
        photo_taken: entry.photo_taken,
      }));
  } catch {
    return [];
  }
}

function ensureFestivalRewardWallet(saveData) {
  if (!saveData.wallet || typeof saveData.wallet !== 'object') saveData.wallet = {};
  if (!saveData.wallet.rewardTickets || typeof saveData.wallet.rewardTickets !== 'object') saveData.wallet.rewardTickets = {};
  if (!saveData.wallet.rewardTicketLifetimeEarned || typeof saveData.wallet.rewardTicketLifetimeEarned !== 'object') {
    saveData.wallet.rewardTicketLifetimeEarned = { ...saveData.wallet.rewardTickets };
  }
}

function ensureFestivalDecorationState(saveData) {
  if (!saveData.decoration || typeof saveData.decoration !== 'object') saveData.decoration = {};
  if (!saveData.decoration.owned || typeof saveData.decoration.owned !== 'object') saveData.decoration.owned = {};
  if (!saveData.decoration.placed || typeof saveData.decoration.placed !== 'object') saveData.decoration.placed = {};
}

function ensureFestivalRewardState(saveData) {
  if (!saveData.onlineFestivalRewards || typeof saveData.onlineFestivalRewards !== 'object') {
    saveData.onlineFestivalRewards = {};
  }
  if (!saveData.onlineFestivalRewards.appliedReceipts || typeof saveData.onlineFestivalRewards.appliedReceipts !== 'object') {
    saveData.onlineFestivalRewards.appliedReceipts = {};
  }
  if (!saveData.onlineFestivalRewards.titles || typeof saveData.onlineFestivalRewards.titles !== 'object') {
    saveData.onlineFestivalRewards.titles = {};
  }
  if (!Array.isArray(saveData.onlineFestivalRewards.memorials)) {
    saveData.onlineFestivalRewards.memorials = [];
  }
  return saveData.onlineFestivalRewards;
}

function normalizeFestivalMemorialEntry(entry) {
  return {
    memorial_id: sanitizeText(entry?.memorial_id, 120),
    label: sanitizeText(entry?.label, 40),
    room_id: sanitizeText(entry?.room_id, 40),
    template_id: sanitizeText(entry?.template_id, 40),
    template_label: sanitizeText(entry?.template_label, 40),
    gameplay_template_id: sanitizeText(entry?.gameplay_template_id, 40),
    gameplay_template_label: sanitizeText(entry?.gameplay_template_label, 40),
    awarded_at: Math.max(0, Math.floor(Number(entry?.awarded_at) || 0)),
    reward_summary: sanitizeText(entry?.reward_summary, 160),
    reward_money: Math.max(0, Math.floor(Number(entry?.reward_money) || 0)),
    reward_ticket_quantity: Math.max(0, Math.floor(Number(entry?.reward_ticket_quantity) || 0)),
    decoration_label: sanitizeText(entry?.decoration_label, 40),
    title_label: sanitizeText(entry?.title_label, 40),
    squadmate_usernames: Array.isArray(entry?.squadmate_usernames)
      ? entry.squadmate_usernames.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    squadmate_display_names: Array.isArray(entry?.squadmate_display_names)
      ? entry.squadmate_display_names.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    squadmate_friend_usernames: Array.isArray(entry?.squadmate_friend_usernames)
      ? entry.squadmate_friend_usernames.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    squadmate_friend_display_names: Array.isArray(entry?.squadmate_friend_display_names)
      ? entry.squadmate_friend_display_names.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    photo_moment_label: sanitizeText(entry?.photo_moment_label, 40),
    photo_line: sanitizeText(entry?.photo_line, 120),
    photo_taken: entry?.photo_taken === true,
  };
}

function getSortedGameplayContributions(room) {
  const gameplayState = ensureRoomGameplayState(room);
  const joinedMembers = getJoinedMembers(room);
  return joinedMembers
    .map(member => {
      const contribution = findGameplayContribution(gameplayState, member.username);
      return {
        username: member.username,
        display_name: member.display_name,
        progress_value: contribution?.progress_value || 0,
        score_value: contribution?.score_value || 0,
        action_count: contribution?.action_count || 0,
      };
    })
    .sort((left, right) => {
      if (right.progress_value !== left.progress_value) return right.progress_value - left.progress_value;
      if (right.score_value !== left.score_value) return right.score_value - left.score_value;
      if (right.action_count !== left.action_count) return right.action_count - left.action_count;
      return left.username.localeCompare(right.username, 'zh-CN');
    });
}

function buildFestivalReceiptReward(room, member, rankingIndex) {
  const gameplayTemplate = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const gameplayState = ensureRoomGameplayState(room);
  const contributions = getSortedGameplayContributions(room);
  const contribution = contributions.find(entry => entry.username === member.username) || {
    progress_value: 0,
    score_value: 0,
    action_count: 0,
  };

  if (room.activity_domain === 'expedition') {
    const participationMoney = 52;
    const cooperationBonusMoney = Math.max(0, Math.min(80, gameplayState.progress_value * 6 + contribution.action_count * 3));
    const rankingBonusMoney = rankingIndex === 0 ? 28 : rankingIndex === 1 ? 16 : 8;
    const templateReward = EXPEDITION_REWARD_ITEM_MAP[room.template_id] || EXPEDITION_REWARD_ITEM_MAP.expedition_outpost;
    const baseItems = Array.isArray(templateReward?.base_items) ? templateReward.base_items : [];
    const bonusItems = rankingIndex <= 1 && Array.isArray(templateReward?.bonus_items) ? templateReward.bonus_items : [];
    const mergedItems = [...baseItems, ...bonusItems].map(item => ({
      item_id: sanitizeText(item.item_id, 40),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    })).filter(item => item.item_id);
    const itemSummary = mergedItems.length > 0
      ? mergedItems.map(item => `${item.item_id}x${item.quantity}`).join(', ')
      : 'none';
    return {
      reward_payload: {
        money: participationMoney + cooperationBonusMoney + rankingBonusMoney,
        reward_tickets: 0,
        items: mergedItems,
      },
      reward_breakdown: {
        participation_money: participationMoney,
        cooperation_bonus_money: cooperationBonusMoney,
        ranking_bonus_money: rankingBonusMoney,
        memorial_ticket_quantity: 0,
        decoration_reward: { decoration_id: '', label: '', quantity: 0 },
        title_reward: { title_id: '', label: '', granted: false },
      },
      summary: `Expedition reward: money ${participationMoney + cooperationBonusMoney + rankingBonusMoney}, items ${itemSummary}.`,
      contribution,
      gameplay_template_label: gameplayTemplate.label,
    };
  }

  const participationMoney = 40;
  const cooperationBonusMoney = Math.max(0, Math.min(60, gameplayState.progress_value * 5 + contribution.action_count * 2));
  const rankingBonusMoney = rankingIndex === 0 ? 36 : rankingIndex === 1 ? 18 : 8;
  const memorialTicketQuantity = gameplayState.phase === 'completed' ? 2 : 1;
  const decorationReward = rankingIndex === 0
    ? {
        decoration_id: FESTIVAL_DECORATION_REWARD_MAP[room.template_id]?.decoration_id || '',
        label: FESTIVAL_DECORATION_REWARD_MAP[room.template_id]?.label || '',
        quantity: FESTIVAL_DECORATION_REWARD_MAP[room.template_id]?.decoration_id ? 1 : 0,
      }
    : {
        decoration_id: '',
        label: '',
        quantity: 0,
      };
  const titleReward = rankingIndex === 0
    ? {
        title_id: FESTIVAL_TITLE_REWARD_MAP[room.template_id]?.title_id || '',
        label: FESTIVAL_TITLE_REWARD_MAP[room.template_id]?.label || '',
        granted: Boolean(FESTIVAL_TITLE_REWARD_MAP[room.template_id]?.title_id),
      }
    : {
        title_id: '',
        label: '',
        granted: false,
      };
  const totalMoney = participationMoney + cooperationBonusMoney + rankingBonusMoney;
  return {
    reward_payload: {
      money: totalMoney,
      reward_tickets: memorialTicketQuantity,
      items: [],
    },
    reward_breakdown: {
      participation_money: participationMoney,
      cooperation_bonus_money: cooperationBonusMoney,
      ranking_bonus_money: rankingBonusMoney,
      memorial_ticket_quantity: memorialTicketQuantity,
      decoration_reward: decorationReward,
      title_reward: titleReward,
    },
    summary: `节会参与 ${participationMoney} 铜钱、协作 ${cooperationBonusMoney} 铜钱、排名 ${rankingBonusMoney} 铜钱；另附 ${memorialTicketQuantity} 张节会纪念券${decorationReward.decoration_id ? `、限定装饰「${decorationReward.label}」` : ''}${titleReward.granted ? ` 与称号「${titleReward.label}」` : ''}。`,
    contribution,
    gameplay_template_label: gameplayTemplate.label,
  };
}

function buildFestivalMemorialEntry(room, receipt) {
  const template = getRoomTemplateByDomain(room.activity_domain, room.template_id);
  const gameplayTemplate = getGameplayTemplateByDomain(room.activity_domain, room.gameplay_template_id, room.template_id);
  const squadmates = getJoinedMembers(room)
    .filter(member => member.username !== receipt.target_username)
    .map(member => ({
      username: member.username,
      display_name: member.display_name,
      is_friend: taoyuanSocialRuntime.isFriendWith(receipt.target_username, member.username),
    }));
  const friendSquadmates = squadmates.filter(member => member.is_friend);
  const friendDisplayLine = friendSquadmates.length > 0
    ? `同场好友：${friendSquadmates.map(member => member.display_name).join('、')}`
    : '本场暂无已登记好友同游';
  const squadmateDisplayLine = squadmates.length > 0
    ? squadmates.map(member => member.display_name).join('、')
    : '独自留档';
  const titleLabel = sanitizeText(receipt.reward_breakdown?.title_reward?.label, 40);
  const decorationLabel = sanitizeText(receipt.reward_breakdown?.decoration_reward?.label, 40);
  return normalizeFestivalMemorialEntry({
    memorial_id: `festival_memorial:${receipt.room_id}:${receipt.target_username}:v${receipt.settlement_version}`,
    label: `${template.label}纪念`,
    room_id: receipt.room_id,
    template_id: template.id,
    template_label: template.label,
    gameplay_template_id: gameplayTemplate.id,
    gameplay_template_label: gameplayTemplate.label,
    awarded_at: nowSeconds(),
    reward_summary: receipt.summary,
    reward_money: receipt.reward_payload?.money || 0,
    reward_ticket_quantity: receipt.reward_breakdown?.memorial_ticket_quantity || 0,
    decoration_label: decorationLabel,
    title_label: titleLabel,
    squadmate_usernames: squadmates.map(member => member.username),
    squadmate_display_names: squadmates.map(member => member.display_name),
    squadmate_friend_usernames: friendSquadmates.map(member => member.username),
    squadmate_friend_display_names: friendSquadmates.map(member => member.display_name),
    photo_moment_label: `${template.label}合影`,
    photo_line: `${receipt.target_display_name} 与 ${squadmateDisplayLine} 在 ${template.label} 留下了一张${gameplayTemplate.label}留影。${friendDisplayLine}`,
    photo_taken: true,
  });
}

function applyFestivalReceiptReward(receipt, room) {
  const context = getActiveSaveContext(receipt.target_username, receipt.target_slot, '当前账号没有可用的桃源乡存档，暂时无法写入节会奖励');
  context.username = receipt.target_username;
  ensureFestivalRewardWallet(context.data);
  ensureFestivalDecorationState(context.data);
  const festivalRewardState = ensureFestivalRewardState(context.data);
  if (festivalRewardState.appliedReceipts[receipt.idempotency_key]) {
    return {
      slot: context.slot,
      revision: context.saves.slots[context.slot]?.revision ?? 0,
      reward_result: `节会奖励此前已写入槽位 ${Number(context.slot) + 1}`,
    };
  }

  const currentMoney = Math.max(0, Math.floor(Number(context.data?.player?.money) || 0));
  context.data.player.money = currentMoney + Math.max(0, Math.floor(Number(receipt.reward_payload?.money) || 0));

  const ticketQuantity = Math.max(0, Math.floor(Number(receipt.reward_breakdown?.memorial_ticket_quantity) || 0));
  if (ticketQuantity > 0) {
    const currentTicket = Math.max(0, Math.floor(Number(context.data.wallet.rewardTickets[FESTIVAL_REWARD_TICKET_TYPE]) || 0));
    const lifetimeTicket = Math.max(0, Math.floor(Number(context.data.wallet.rewardTicketLifetimeEarned[FESTIVAL_REWARD_TICKET_TYPE]) || 0));
    context.data.wallet.rewardTickets[FESTIVAL_REWARD_TICKET_TYPE] = currentTicket + ticketQuantity;
    context.data.wallet.rewardTicketLifetimeEarned[FESTIVAL_REWARD_TICKET_TYPE] = lifetimeTicket + ticketQuantity;
  }

  const decorationReward = receipt.reward_breakdown?.decoration_reward || {};
  const decorationId = sanitizeText(decorationReward.decoration_id, 80);
  const decorationQuantity = Math.max(0, Math.floor(Number(decorationReward.quantity) || 0));
  if (decorationId && decorationQuantity > 0) {
    const currentOwned = Math.max(0, Math.floor(Number(context.data.decoration.owned[decorationId]) || 0));
    context.data.decoration.owned[decorationId] = currentOwned + decorationQuantity;
  }

  const titleReward = receipt.reward_breakdown?.title_reward || {};
  const titleLabel = sanitizeText(titleReward.label, 40);
  if (titleReward.granted === true && titleLabel) {
    taoyuanSocialRuntime.updateStoredProfile(receipt.target_username, {
      public_title: titleLabel,
    });
    festivalRewardState.titles[titleReward.title_id] = {
      label: titleLabel,
      room_id: receipt.room_id,
      template_id: receipt.template_id,
      awarded_at: nowSeconds(),
    };
  }

  const memorialEntry = buildFestivalMemorialEntry(room, receipt);
  festivalRewardState.memorials = [
    memorialEntry,
    ...(festivalRewardState.memorials || [])
      .map(normalizeFestivalMemorialEntry)
      .filter(entry => entry.memorial_id !== memorialEntry.memorial_id),
  ].slice(0, 40);
  festivalRewardState.appliedReceipts[receipt.idempotency_key] = {
    receipt_id: receipt.id,
    persisted_at: nowSeconds(),
  };

  const revision = persistGameplayData(context);
  return {
    slot: context.slot,
    revision,
    reward_result: `节会奖励已写入槽位 ${Number(context.slot) + 1}`,
  };
}

function buildRoomSnapshot(store, room, viewerUsername) {
  materializeCountdownState(room);
  materializeGameplayPhase(room);
  const template = getRoomTemplateByDomain(room.activity_domain, room.template_id);
  const viewerMember = getRoomMember(room, viewerUsername);
  const viewerInvitation = getRoomInvitation(room, viewerUsername);
  const joinedMembers = getJoinedMembers(room);
  const participatingCount = joinedMembers.length;
  const readyCount = joinedMembers.filter(member => member.status === 'ready').length;
  const settlementReceipts = getReceiptListForRoom(store, room);
  const gameplaySnapshot = buildGameplaySnapshot(room, viewerUsername);
  const visualState = normalizeOnlineVisualState(room.visual_state, room);
  return {
    id: room.id,
    activity_domain: room.activity_domain,
    title: room.title,
    template_id: template.id,
    template_label: template.label,
    template_summary: template.summary,
    gameplay_template_id: room.gameplay_template_id,
    host_username: room.host_username,
    host_display_name: room.host_display_name,
    state: room.state,
    state_label: ROOM_STATUS_LABELS[room.state] || room.state,
    state_reason: room.state_reason,
    member_limit: room.member_limit,
    countdown_seconds: room.countdown_seconds,
    reconnect_window_seconds: room.reconnect_window_seconds,
    created_at: room.created_at,
    updated_at: room.updated_at,
    ready_check_started_at: room.ready_check_started_at,
    countdown_started_at: room.countdown_started_at,
    countdown_ends_at: room.countdown_ends_at,
    running_started_at: room.running_started_at,
    settled_at: room.settled_at,
    closed_at: room.closed_at,
    aborted_at: room.aborted_at,
    settlement_version: room.settlement_version,
    members: (room.members || []).map(member => ({
      username: member.username,
      display_name: member.display_name,
      role: member.role,
      status: member.status,
      status_label: MEMBER_STATUS_LABELS[member.status] || member.status,
      invited_at: member.invited_at,
      joined_at: member.joined_at,
      ready_at: member.ready_at,
      disconnected_at: member.disconnected_at,
      reconnected_at: member.reconnected_at,
      left_at: member.left_at,
      active_receipt_id: member.active_receipt_id,
    })),
    invitations: (room.invitations || []).map(invite => ({
      id: invite.id,
      target_username: invite.target_username,
      target_display_name: invite.target_display_name,
      target_save_id: invite.target_save_id,
      target_save_slot: invite.target_save_slot,
      status: invite.status,
      created_at: invite.created_at,
      responded_at: invite.responded_at,
    })),
    recent_events: (room.events || []).map(normalizeRoomEvent).slice(0, 8),
    settlement_receipts: settlementReceipts.map(receipt => ({
      id: receipt.id,
      target_username: receipt.target_username,
      target_display_name: receipt.target_display_name,
      target_slot: receipt.target_slot,
      status: receipt.status,
      status_label: getReceiptStatusLabel(receipt.status),
      reward_payload: receipt.reward_payload,
      summary: receipt.summary,
      route_replay: receipt.route_replay,
      created_at: receipt.created_at,
    })),
    visual_state: visualState,
    gameplay: gameplaySnapshot,
    opening_ceremony: buildOpeningCeremony(room),
    joined_member_count: participatingCount,
    ready_member_count: readyCount,
    my_member_status: viewerMember?.status || '',
    invitation_id: viewerInvitation?.id || '',
    can_join: Boolean(
      viewerInvitation &&
      (!viewerMember || ['invited', 'left'].includes(viewerMember.status)) &&
      ['created', 'inviting', 'ready_check'].includes(room.state) &&
      participatingCount < room.member_limit
    ),
    can_leave: Boolean(viewerMember && ['joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting'].includes(viewerMember.status) && !['settling', 'closed', 'aborted'].includes(room.state)),
    can_ready: Boolean(viewerMember && room.state === 'ready_check' && viewerMember.status === 'joined'),
    can_unready: Boolean(viewerMember && room.state === 'ready_check' && viewerMember.status === 'ready'),
    can_disconnect: Boolean(viewerMember && ['countdown', 'running', 'paused'].includes(room.state) && ['countdown_locked', 'active', 'reconnecting'].includes(viewerMember.status)),
    can_reconnect: Boolean(viewerMember && viewerMember.status === 'disconnected' && room.state === 'paused'),
    can_host_ready_check: room.host_username === sanitizeText(viewerUsername, 40) && canStartReadyCheck(room),
    can_host_start_countdown: room.host_username === sanitizeText(viewerUsername, 40) && canStartCountdown(room),
    can_host_settle: room.host_username === sanitizeText(viewerUsername, 40) && ['running', 'paused'].includes(room.state),
    can_host_close: room.host_username === sanitizeText(viewerUsername, 40) && !['closed'].includes(room.state),
  };
}

function buildOverview(store, viewerUsername, domain = DEFAULT_ACTIVITY_DOMAIN) {
  const normalizedViewer = sanitizeText(viewerUsername, 40);
  const normalizedDomain = normalizeActivityDomain(domain);
  let changed = false;
  const rooms = (store.rooms || []).map(room => {
    const normalized = normalizeRoom(room);
    if (materializeCountdownState(normalized)) changed = true;
    if (materializeGameplayPhase(normalized)) changed = true;
    return normalized;
  });
  if (changed) {
    store.rooms = rooms;
    saveStore(store);
  }

  const visibleRooms = rooms
    .filter(room => room.activity_domain === normalizedDomain)
    .filter(room => room.host_username === normalizedViewer || getRoomMember(room, normalizedViewer) || getRoomInvitation(room, normalizedViewer))
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));

  const currentRoom = visibleRooms.find(room => {
    if (['closed', 'aborted'].includes(room.state)) return false;
    const member = getRoomMember(room, normalizedViewer);
    return Boolean(member && isMemberParticipating(member));
  }) || null;

  const invitedRooms = visibleRooms
    .filter(room => room.id !== currentRoom?.id && Boolean(getRoomInvitation(room, normalizedViewer)))
    .map(room => buildRoomSnapshot(store, room, normalizedViewer));

  const recentReceipts = (store.receipts || [])
    .map(normalizeRoomReceipt)
    .filter(receipt => receipt.activity_domain === normalizedDomain)
    .filter(receipt => receipt.target_username === normalizedViewer)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .slice(0, 8)
    .map(receipt => ({
      id: receipt.id,
      room_id: receipt.room_id,
      room_title: receipt.room_title,
      template_id: receipt.template_id,
      template_label: receipt.template_label,
      target_slot: receipt.target_slot,
      status: receipt.status,
      status_label: getReceiptStatusLabel(receipt.status),
      reward_payload: receipt.reward_payload,
      summary: receipt.summary,
      route_replay: receipt.route_replay,
      created_at: receipt.created_at,
    }));
  const recentMemorials = normalizedDomain === 'festival' ? buildFestivalMemorialOverview(normalizedViewer) : [];

  return {
    bulletin: '节会房间现已支持开房、邀请、加入、准备、倒计时、断线重连和逐成员结算，并补入公共进度、小队协作、抢答、拼装、采集、表演、合照七类玩法模板骨架。',
    templates: listRoomTemplates(normalizedDomain),
    gameplay_templates: listGameplayTemplates(normalizedDomain),
    my_room: currentRoom ? buildRoomSnapshot(store, currentRoom, normalizedViewer) : null,
    invited_rooms: invitedRooms,
    visible_rooms: visibleRooms.map(room => buildRoomSnapshot(store, room, normalizedViewer)),
    recent_receipts: recentReceipts,
    recent_memorials: recentMemorials,
  };
}

async function createFestivalRoom(payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能创建节会房间', 401);
  const store = loadStore();
  ensureNoOtherActiveRoom(store, username);
  const template = getRoomTemplate(payload.template_id);
  const gameplayTemplate = getGameplayTemplate(payload.gameplay_template_id, template.id);
  const room = normalizeRoom({
    id: makeId('festival_room'),
    template_id: template.id,
    gameplay_template_id: gameplayTemplate.id,
    title: sanitizeText(payload.title, 60) || template.label,
    host_username: username,
    host_display_name: displayName,
    member_limit: payload.member_limit || template.default_member_limit,
    countdown_seconds: payload.countdown_seconds || DEFAULT_COUNTDOWN_SECONDS,
    reconnect_window_seconds: DEFAULT_RECONNECT_WINDOW_SECONDS,
    state: 'created',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    members: [{
      username,
      display_name: displayName,
      role: 'host',
      status: 'joined',
      joined_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    }],
    invitations: [],
    gameplay_state: createInitialGameplayState(gameplayTemplate.id, template.id),
    visual_state: normalizeOnlineVisualState(null, {
      activity_domain: normalizedDomain,
      template_id: template.id,
      gameplay_template_id: gameplayTemplate.id,
    }),
    settlement_receipt_ids: [],
    events: [],
  });
  if (gameplayTemplate.id === 'expedition_cavern') {
    syncExpeditionCavernVisualState(room, room.gameplay_state.cavern_state);
  }
  if (gameplayTemplate.id === 'expedition_escort') {
    syncEscortConvoyVisualState(room);
  }
  recordRoomEvent(room, 'room.create', actor, `创建了 ${template.label} 房间《${room.title}》，玩法模板为 ${gameplayTemplate.label}`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function inviteFestivalRoomMember(roomId, payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const { username: targetUsername, identity: targetIdentity } = resolveTargetBySaveIdOrUsername(payload, '请输入要邀请的玩家用户名或存档 ID');
  if (targetUsername === username) throw createError('不能邀请自己加入节会房间');
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标玩家不存在或已失效');
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!['created', 'inviting', 'ready_check'].includes(room.state)) {
    throw createError('当前房间阶段不再允许发送新邀请');
  }
  if ((room.members || []).some(member => member.username === targetUsername && !['left', 'kicked'].includes(member.status))) {
    throw createError('该玩家已经在房间成员列表里了');
  }
  if (getJoinedMembers(room).length >= room.member_limit) {
    throw createError(`房间人数已满，当前最多支持 ${room.member_limit} 人`);
  }
  room.invitations = [normalizeRoomInvitation({
    id: makeId('activity_room_invite'),
    room_id: room.id,
    inviter_username: username,
    inviter_display_name: displayName,
    target_username: targetUser.username,
    target_display_name: targetUser.display_name || targetUser.username,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  }), ...(room.invitations || [])
    .map(normalizeRoomInvitation)
    .filter(invite => !(invite.status === 'pending' && (
      invite.target_username === targetUser.username ||
      (targetIdentity?.save_id && invite.target_save_id === targetIdentity.save_id)
    )))];
  const existingMember = getRoomMember(room, targetUser.username);
  if (existingMember) {
    existingMember.status = 'invited';
    existingMember.role = existingMember.role || 'member';
    existingMember.display_name = targetUser.display_name || targetUser.username;
    existingMember.invited_at = nowSeconds();
    existingMember.last_seen_at = nowSeconds();
  } else {
    room.members = [...(room.members || []).map(normalizeRoomMember), normalizeRoomMember({
      username: targetUser.username,
      display_name: targetUser.display_name || targetUser.username,
      role: 'member',
      status: 'invited',
      invited_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    })];
  }
  updateRoomState(room, 'inviting', '');
  recordRoomEvent(room, 'room.invite', actor, `邀请了 ${targetUser.display_name || targetUser.username} 进入房间`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function joinFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能加入节会房间', 401);
  const store = loadStore();
  ensureNoOtherActiveRoom(store, username);
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const invitation = getRoomInvitation(room, username);
  if (!invitation && room.host_username !== username) {
    throw createError('当前房间仅支持受邀成员加入', 403);
  }
  if (invitation) ensureInvitationMatchesActiveSave(invitation, username);
  if (getJoinedMembers(room).length >= room.member_limit && !getRoomMember(room, username)) {
    throw createError('当前节会房间已满，稍后再试');
  }
  const member = getRoomMember(room, username);
  if (member && !['invited', 'left'].includes(member.status)) {
    throw createError('你已经在这个节会房间里了');
  }
  if (member) {
    member.status = 'joined';
    member.joined_at = nowSeconds();
    member.last_seen_at = nowSeconds();
    member.left_at = 0;
  } else {
    room.members = [...(room.members || []).map(normalizeRoomMember), normalizeRoomMember({
      username,
      display_name: displayName,
      role: room.host_username === username ? 'host' : 'member',
      status: 'joined',
      joined_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    })];
  }
  if (invitation) {
    invitation.status = 'accepted';
    invitation.responded_at = nowSeconds();
    invitation.updated_at = nowSeconds();
  }
  updateRoomState(room, 'inviting', '');
  recordRoomEvent(room, 'room.join', actor, `${displayName} 已加入房间`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function leaveFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureViewerCanSeeRoom(room, username);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (member.role === 'host' && !['settling', 'closed', 'aborted'].includes(room.state)) {
    throw createError('房主不能直接离开房间，请先取消房间或完成结算');
  }
  if (['joined', 'ready'].includes(member.status)) {
    member.status = 'left';
    member.left_at = nowSeconds();
    member.last_seen_at = nowSeconds();
    recordRoomEvent(room, 'room.leave', actor, `${member.display_name} 已离开房间`);
  } else if (member.status === 'disconnected') {
    member.status = 'left';
    member.left_at = nowSeconds();
    recordRoomEvent(room, 'room.leave', actor, `${member.display_name} 放弃了这场节会房间`);
  } else {
    throw createError('当前状态不能直接离开节会房间');
  }
  if (getJoinedMembers(room).filter(entry => entry.role !== 'host').length <= 0 && ['inviting', 'ready_check'].includes(room.state)) {
    updateRoomState(room, 'created', '其余成员已离开，房间回到待邀请状态');
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function startFestivalRoomReadyCheck(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!canStartReadyCheck(room)) {
    throw createError('至少要有 2 名已加入成员后，才能进入准备确认');
  }
  room.ready_check_started_at = nowSeconds();
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (normalized.status === 'ready') normalized.status = 'joined';
    return normalized;
  });
  updateRoomState(room, 'ready_check', '');
  recordRoomEvent(room, 'room.ready_check', actor, '房主发起了准备确认');
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function setFestivalRoomReady(roomId, ready, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureViewerCanSeeRoom(room, username);
  if (room.state !== 'ready_check') {
    throw createError('当前房间还没有进入准备确认阶段');
  }
  const member = getRoomMember(room, username);
  if (!member || !['joined', 'ready'].includes(member.status)) {
    throw createError('当前成员状态不能切换准备');
  }
  member.status = ready ? 'ready' : 'joined';
  member.ready_at = ready ? nowSeconds() : 0;
  member.last_seen_at = nowSeconds();
  recordRoomEvent(room, ready ? 'room.ready' : 'room.unready', actor, `${displayName}${ready ? ' 已准备完毕' : ' 取消了准备状态'}`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function startFestivalRoomCountdown(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  ensureRoomNotFinished(room);
  if (!canStartCountdown(room)) {
    throw createError('所有已加入成员都完成准备后，才能进入倒计时');
  }
  room.countdown_started_at = nowSeconds();
  room.countdown_ends_at = room.countdown_started_at + room.countdown_seconds;
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (['joined', 'ready'].includes(normalized.status)) {
      normalized.status = 'countdown_locked';
      normalized.last_seen_at = nowSeconds();
    }
    return normalized;
  });
  updateRoomState(room, 'countdown', '');
  recordRoomEvent(room, 'room.countdown.start', actor, `房间进入 ${room.countdown_seconds} 秒倒计时`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function disconnectFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (!['countdown', 'running', 'paused'].includes(room.state) || !['countdown_locked', 'active', 'reconnecting'].includes(member.status)) {
    throw createError('当前阶段不能触发断线恢复流程');
  }
  const previousRoomState = room.state === 'paused' ? (room.paused_from_state || 'running') : room.state;
  member.resume_status = member.status;
  member.status = 'disconnected';
  member.disconnected_at = nowSeconds();
  member.last_seen_at = nowSeconds();
  room.paused_from_state = previousRoomState;
  updateRoomState(room, 'paused', '有成员断线，等待恢复');
  recordRoomEvent(room, 'room.pause', actor, `${displayName} 暂时断线，房间进入暂停保护`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function reconnectFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  const member = getRoomMember(room, username);
  if (!member) throw createError('你当前不在这个节会房间里');
  if (member.status !== 'disconnected') {
    throw createError('当前成员不在断线恢复状态里');
  }
  member.status = member.resume_status === 'countdown_locked' ? 'countdown_locked' : 'active';
  member.reconnected_at = nowSeconds();
  member.last_seen_at = nowSeconds();
  member.resume_status = '';
  const hasDisconnectedMembers = (room.members || []).some(entry => normalizeRoomMember(entry).status === 'disconnected');
  if (!hasDisconnectedMembers && room.state === 'paused') {
    updateRoomState(room, room.paused_from_state || 'running', '');
    room.paused_from_state = '';
    recordRoomEvent(room, 'room.resume', actor, `${displayName} 已恢复连接，房间继续推进`);
  } else {
    touchRoom(room);
    recordRoomEvent(room, 'room.reconnect', actor, `${displayName} 已恢复连接`);
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function settleFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  materializeGameplayPhase(room);
  ensureHost(room, username);
  if (!['running', 'paused'].includes(room.state)) {
    throw createError('只有进行中的节会房间才能进入结算');
  }
  if ((room.settlement_receipt_ids || []).length > 0) {
    throw createError('当前房间已经生成过结算凭证了');
  }
  room.settlement_version = Math.max(1, room.settlement_version + 1);
  const joinedMembers = getJoinedMembers(room);
  const rankedContributions = getSortedGameplayContributions(room);
  const nextReceipts = joinedMembers.map(member => {
    const rankingIndex = Math.max(0, rankedContributions.findIndex(entry => entry.username === member.username));
    const rewardPreview = buildFestivalReceiptReward(room, member, rankingIndex);
    return normalizeRoomReceipt({
    id: makeId('festival_room_receipt'),
    room_id: room.id,
    room_title: room.title,
    template_id: room.template_id,
    template_label: getRoomTemplate(room.template_id).label,
    target_username: member.username,
    target_display_name: member.display_name,
    target_slot: getViewerSaveSlot(member.username),
    status: 'pending_persist',
    idempotency_key: `festival_room:${room.id}:${room.settlement_version}:${member.username}:slot${getViewerSaveSlot(member.username)}`,
    reward_payload: rewardPreview.reward_payload,
    reward_breakdown: rewardPreview.reward_breakdown,
    summary: rewardPreview.summary,
    reward_result: '',
    last_error: '',
    settlement_version: room.settlement_version,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    persisted_at: 0,
  });
  });
  store.receipts = [...nextReceipts, ...(store.receipts || []).map(normalizeRoomReceipt)].slice(0, 400);
  room.settlement_receipt_ids = nextReceipts.map(receipt => receipt.id);
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (isMemberParticipating(normalized)) {
      normalized.status = 'finished';
      normalized.active_receipt_id = nextReceipts.find(receipt => receipt.target_username === normalized.username)?.id || '';
    }
    return normalized;
  });
  room.settled_at = nowSeconds();
  updateRoomState(room, 'settling', '');
  recordRoomEvent(room, 'room.settle', actor, `已为 ${nextReceipts.length} 名成员生成待写回的节会奖励凭证`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function submitFestivalRoomGameplayAction(roomId, payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  if (!username) throw createError('未登录账号不能提交节会玩法动作', 401);
  const actionId = sanitizeText(payload.action_id, 40);
  if (!actionId) throw createError('请先指定要执行的玩法动作');
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  materializeGameplayPhase(room);
  ensureViewerCanSeeRoom(room, username);
  applyGameplayAction(room, actionId, {
    username,
    displayName: sanitizeText(actor.displayName, 40) || username,
  });
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

function persistFestivalReceipts(store, room) {
  const receiptIds = new Set(room.settlement_receipt_ids || []);
  const nextReceipts = [];
  let pendingCompensationCount = 0;
  for (const entry of store.receipts || []) {
    const receipt = normalizeRoomReceipt(entry);
    if (!receiptIds.has(receipt.id)) {
      nextReceipts.push(receipt);
      continue;
    }
    if (receipt.status === 'persisted') {
      nextReceipts.push(receipt);
      continue;
    }
    try {
      const rewardOutcome = applyFestivalReceiptReward(receipt, room);
      nextReceipts.push(normalizeRoomReceipt({
        ...receipt,
        status: 'persisted',
        reward_result: rewardOutcome.reward_result,
        persisted_at: nowSeconds(),
        updated_at: nowSeconds(),
        last_error: '',
      }));
      room.members = (room.members || []).map(member => {
        const normalized = normalizeRoomMember(member);
        if (normalized.username !== receipt.target_username) return normalized;
        normalized.status = 'settled';
        normalized.active_receipt_id = receipt.id;
        return normalized;
      });
    } catch (error) {
      pendingCompensationCount += 1;
      nextReceipts.push(normalizeRoomReceipt({
        ...receipt,
        status: 'compensation_pending',
        reward_result: '奖励写回失败，已进入补偿队列',
        last_error: sanitizeText(error?.message || '节会奖励写回失败', 160),
        updated_at: nowSeconds(),
      }));
    }
  }
  store.receipts = nextReceipts;
  return {
    pending_compensation_count: pendingCompensationCount,
  };
}

async function closeFestivalRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  if (room.state === 'closed') {
    throw createError('当前房间已经关闭了');
  }
  if (room.state === 'settling') {
    const persistSummary = persistFestivalReceipts(store, room);
    if (persistSummary.pending_compensation_count > 0) {
      updateRoomState(room, 'settling', `仍有 ${persistSummary.pending_compensation_count} 名成员奖励待补偿`);
      recordRoomEvent(room, 'room.settle', actor, `仍有 ${persistSummary.pending_compensation_count} 名成员奖励待补偿，房间暂不关闭`);
      replaceRoom(store, room);
      saveStore(store);
      return {
        room: buildRoomSnapshot(store, room, username),
        overview: buildOverview(store, username, room.activity_domain),
      };
    }
    room.members = (room.members || []).map(member => {
      const normalized = normalizeRoomMember(member);
      if (normalized.status === 'finished') normalized.status = 'settled';
      return normalized;
    });
    room.closed_at = nowSeconds();
    updateRoomState(room, 'closed', '');
    recordRoomEvent(room, 'room.close', actor, '房间结算已完成，正式关闭');
  } else {
    room.aborted_at = nowSeconds();
    updateRoomState(room, 'aborted', '房主主动取消了当前节会房间');
    recordRoomEvent(room, 'room.abort', actor, '房主取消了当前节会房间');
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildOverview(store, username, room.activity_domain),
  };
}

async function listFestivalRoomOverview(username, domain = DEFAULT_ACTIVITY_DOMAIN) {
  const normalizedUsername = sanitizeText(username, 40);
  if (!normalizedUsername) throw createError('请先登录后再查看节会房间', 401);
  const store = loadStore();
  return buildOverview(store, normalizedUsername, domain);
}

function buildActivityBulletin(domain) {
  const normalizedDomain = normalizeActivityDomain(domain);
  return ACTIVITY_ROOM_BULLETINS[normalizedDomain] || ACTIVITY_ROOM_BULLETINS.festival;
}

function buildActivityOverview(store, viewerUsername, domain = DEFAULT_ACTIVITY_DOMAIN) {
  const overview = buildOverview(store, viewerUsername, domain);
  return {
    ...overview,
    bulletin: buildActivityBulletin(domain),
  };
}

function applyActivityReceiptReward(receipt, room) {
  const context = getActiveSaveContext(receipt.target_username, receipt.target_slot, '当前账号没有可用的桃源乡存档，暂时无法写入活动奖励');
  context.username = receipt.target_username;
  ensureFestivalRewardWallet(context.data);
  ensureFestivalDecorationState(context.data);
  const festivalRewardState = ensureFestivalRewardState(context.data);
  if (festivalRewardState.appliedReceipts[receipt.idempotency_key]) {
    return {
      slot: context.slot,
      revision: context.saves.slots[context.slot]?.revision ?? 0,
      reward_result: `${ACTIVITY_DOMAIN_LABELS[room.activity_domain] || ACTIVITY_DOMAIN_LABELS.festival} reward already persisted to slot ${Number(context.slot) + 1}`,
    };
  }

  const currentMoney = Math.max(0, Math.floor(Number(context.data?.player?.money) || 0));
  context.data.player.money = currentMoney + Math.max(0, Math.floor(Number(receipt.reward_payload?.money) || 0));

  if (room.activity_domain === 'festival') {
    const ticketQuantity = Math.max(0, Math.floor(Number(receipt.reward_breakdown?.memorial_ticket_quantity) || 0));
    if (ticketQuantity > 0) {
      const currentTicket = Math.max(0, Math.floor(Number(context.data.wallet.rewardTickets[FESTIVAL_REWARD_TICKET_TYPE]) || 0));
      const lifetimeTicket = Math.max(0, Math.floor(Number(context.data.wallet.rewardTicketLifetimeEarned[FESTIVAL_REWARD_TICKET_TYPE]) || 0));
      context.data.wallet.rewardTickets[FESTIVAL_REWARD_TICKET_TYPE] = currentTicket + ticketQuantity;
      context.data.wallet.rewardTicketLifetimeEarned[FESTIVAL_REWARD_TICKET_TYPE] = lifetimeTicket + ticketQuantity;
    }

    const decorationReward = receipt.reward_breakdown?.decoration_reward || {};
    const decorationId = sanitizeText(decorationReward.decoration_id, 80);
    const decorationQuantity = Math.max(0, Math.floor(Number(decorationReward.quantity) || 0));
    if (decorationId && decorationQuantity > 0) {
      const currentOwned = Math.max(0, Math.floor(Number(context.data.decoration.owned[decorationId]) || 0));
      context.data.decoration.owned[decorationId] = currentOwned + decorationQuantity;
    }

    const titleReward = receipt.reward_breakdown?.title_reward || {};
    const titleLabel = sanitizeText(titleReward.label, 40);
    if (titleReward.granted === true && titleLabel) {
      taoyuanSocialRuntime.updateStoredProfile(receipt.target_username, {
        public_title: titleLabel,
      });
      festivalRewardState.titles[titleReward.title_id] = {
        label: titleLabel,
        room_id: receipt.room_id,
        template_id: receipt.template_id,
        awarded_at: nowSeconds(),
      };
    }

    const memorialEntry = buildFestivalMemorialEntry(room, receipt);
    festivalRewardState.memorials = [
      memorialEntry,
      ...(festivalRewardState.memorials || [])
        .map(normalizeFestivalMemorialEntry)
        .filter(entry => entry.memorial_id !== memorialEntry.memorial_id),
    ].slice(0, 40);
  } else {
    context.data.items = ensureRewardInventorySlotList(context.data.items);
    context.data.tempItems = ensureRewardInventorySlotList(context.data.tempItems);
    const inventoryCapacity = Math.max(1, Math.floor(Number(context.data.capacity) || REWARD_INVENTORY_MAIN_CAPACITY));
    const inventoryResult = addInventoryRewardItems(
      context.data.items,
      inventoryCapacity,
      context.data.tempItems,
      REWARD_INVENTORY_TEMP_CAPACITY,
      receipt.reward_payload?.items || []
    );
    context.data.items = inventoryResult.mainSlots;
    context.data.tempItems = inventoryResult.tempSlots;
  }

  festivalRewardState.appliedReceipts[receipt.idempotency_key] = {
    receipt_id: receipt.id,
    persisted_at: nowSeconds(),
  };

  const revision = persistGameplayData(context);
  return {
    slot: context.slot,
    revision,
    reward_result: `${ACTIVITY_DOMAIN_LABELS[room.activity_domain] || ACTIVITY_DOMAIN_LABELS.festival} reward persisted to slot ${Number(context.slot) + 1}`,
  };
}

function persistActivityReceipts(store, room) {
  const receiptIds = new Set(room.settlement_receipt_ids || []);
  const nextReceipts = [];
  let pendingCompensationCount = 0;
  for (const entry of store.receipts || []) {
    const receipt = normalizeRoomReceipt(entry);
    if (!receiptIds.has(receipt.id)) {
      nextReceipts.push(receipt);
      continue;
    }
    if (receipt.status === 'persisted') {
      nextReceipts.push(receipt);
      continue;
    }
    try {
      const rewardOutcome = applyActivityReceiptReward(receipt, room);
      nextReceipts.push(normalizeRoomReceipt({
        ...receipt,
        status: 'persisted',
        reward_result: rewardOutcome.reward_result,
        persisted_at: nowSeconds(),
        updated_at: nowSeconds(),
        last_error: '',
      }));
      room.members = (room.members || []).map(member => {
        const normalized = normalizeRoomMember(member);
        if (normalized.username !== receipt.target_username) return normalized;
        normalized.status = 'settled';
        normalized.active_receipt_id = receipt.id;
        return normalized;
      });
    } catch (error) {
      pendingCompensationCount += 1;
      nextReceipts.push(normalizeRoomReceipt({
        ...receipt,
        status: 'compensation_pending',
        reward_result: '奖励写回失败，已进入补偿队列',
        last_error: sanitizeText(error?.message || '活动奖励写回失败', 160),
        updated_at: nowSeconds(),
      }));
    }
  }
  store.receipts = nextReceipts;
  return {
    pending_compensation_count: pendingCompensationCount,
  };
}

async function createActivityRoom(domain = DEFAULT_ACTIVITY_DOMAIN, payload = {}, actor = {}) {
  const normalizedDomain = normalizeActivityDomain(domain);
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能创建活动房间', 401);
  const store = loadStore();
  ensureNoOtherActiveRoom(store, username);
  const template = getRoomTemplateByDomain(normalizedDomain, payload.template_id);
  const gameplayTemplate = getGameplayTemplateByDomain(normalizedDomain, payload.gameplay_template_id, template.id);
  const room = normalizeRoom({
    id: makeId(ACTIVITY_ROOM_ID_PREFIX[normalizedDomain] || ACTIVITY_ROOM_ID_PREFIX.festival),
    activity_domain: normalizedDomain,
    template_id: template.id,
    gameplay_template_id: gameplayTemplate.id,
    title: sanitizeText(payload.title, 60) || template.label,
    host_username: username,
    host_display_name: displayName,
    member_limit: payload.member_limit || template.default_member_limit,
    countdown_seconds: payload.countdown_seconds || DEFAULT_COUNTDOWN_SECONDS,
    reconnect_window_seconds: DEFAULT_RECONNECT_WINDOW_SECONDS,
    state: 'created',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    members: [{
      username,
      display_name: displayName,
      role: 'host',
      status: 'joined',
      joined_at: nowSeconds(),
      last_seen_at: nowSeconds(),
    }],
    invitations: [],
    gameplay_state: createInitialGameplayState(gameplayTemplate.id, template.id),
    settlement_receipt_ids: [],
    events: [],
  });
  if (room.activity_domain === 'festival') {
    syncLanternFairVisualState(room, room.gameplay_state.festival_state);
    syncDragonBoatVisualState(room, room.gameplay_state.festival_state);
  }
  if (gameplayTemplate.id === 'expedition_cavern') {
    syncExpeditionCavernVisualState(room, room.gameplay_state.cavern_state);
  }
  if (gameplayTemplate.id === 'expedition_escort') {
    syncEscortConvoyVisualState(room);
  }
  recordRoomEvent(room, 'room.create', actor, `创建了 ${template.label} 房间《${room.title}》，玩法模板为 ${gameplayTemplate.label}`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildActivityOverview(store, username, normalizedDomain),
  };
}

async function settleActivityRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  materializeGameplayPhase(room);
  ensureHost(room, username);
  if (!['running', 'paused'].includes(room.state)) {
    throw createError('只有进行中的活动房间才能进入结算');
  }
  if ((room.settlement_receipt_ids || []).length > 0) {
    throw createError('当前房间已经生成过结算凭证了');
  }
  room.settlement_version = Math.max(1, room.settlement_version + 1);
  const joinedMembers = getJoinedMembers(room);
  const rankedContributions = getSortedGameplayContributions(room);
  const routeReplay = room.gameplay_template_id === 'expedition_cavern'
    ? buildExpeditionCavernRouteReplay(room)
    : isDragonBoatRoom(room)
      ? buildDragonBoatRouteReplay(room)
      : isEscortConvoyRoom(room)
        ? buildEscortConvoyRouteReplay(room)
    : normalizeReceiptRouteReplay(null);
  const nextReceipts = joinedMembers.map(member => {
    const rankingIndex = Math.max(0, rankedContributions.findIndex(entry => entry.username === member.username));
    const rewardPreview = buildFestivalReceiptReward(room, member, rankingIndex);
    return normalizeRoomReceipt({
      id: makeId(ACTIVITY_RECEIPT_ID_PREFIX[room.activity_domain] || ACTIVITY_RECEIPT_ID_PREFIX.festival),
      activity_domain: room.activity_domain,
      room_id: room.id,
      room_title: room.title,
      template_id: room.template_id,
      template_label: getRoomTemplateByDomain(room.activity_domain, room.template_id).label,
      target_username: member.username,
      target_display_name: member.display_name,
      target_slot: getViewerSaveSlot(member.username),
      status: 'pending_persist',
      idempotency_key: `${room.activity_domain}_room:${room.id}:${room.settlement_version}:${member.username}:slot${getViewerSaveSlot(member.username)}`,
      reward_payload: rewardPreview.reward_payload,
      reward_breakdown: rewardPreview.reward_breakdown,
      summary: rewardPreview.summary,
      route_replay: routeReplay,
      reward_result: '',
      last_error: '',
      settlement_version: room.settlement_version,
      created_at: nowSeconds(),
      updated_at: nowSeconds(),
      persisted_at: 0,
    });
  });
  store.receipts = [...nextReceipts, ...(store.receipts || []).map(normalizeRoomReceipt)].slice(0, 400);
  room.settlement_receipt_ids = nextReceipts.map(receipt => receipt.id);
  room.members = (room.members || []).map(member => {
    const normalized = normalizeRoomMember(member);
    if (isMemberParticipating(normalized)) {
      normalized.status = 'finished';
      normalized.active_receipt_id = nextReceipts.find(receipt => receipt.target_username === normalized.username)?.id || '';
    }
    return normalized;
  });
  room.settled_at = nowSeconds();
  updateRoomState(room, 'settling', '');
  recordRoomEvent(room, 'room.settle', actor, `已为 ${nextReceipts.length} 名成员生成待写回的活动奖励凭证`);
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildActivityOverview(store, username, room.activity_domain),
  };
}

async function closeActivityRoom(roomId, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  materializeCountdownState(room);
  ensureHost(room, username);
  if (room.state === 'closed') {
    throw createError('当前房间已经关闭');
  }
  if (room.state === 'settling') {
    const persistSummary = persistActivityReceipts(store, room);
    if (persistSummary.pending_compensation_count > 0) {
      updateRoomState(room, 'settling', `仍有 ${persistSummary.pending_compensation_count} 名成员奖励待补偿`);
      recordRoomEvent(room, 'room.settle', actor, `仍有 ${persistSummary.pending_compensation_count} 名成员奖励待补偿，房间暂不关闭`);
      replaceRoom(store, room);
      saveStore(store);
      return {
        room: buildRoomSnapshot(store, room, username),
        overview: buildActivityOverview(store, username, room.activity_domain),
      };
    }
    room.members = (room.members || []).map(member => {
      const normalized = normalizeRoomMember(member);
      if (normalized.status === 'finished') normalized.status = 'settled';
      return normalized;
    });
    room.closed_at = nowSeconds();
    updateRoomState(room, 'closed', '');
    recordRoomEvent(room, 'room.close', actor, '房间结算已完成，正式关闭');
  } else {
    room.aborted_at = nowSeconds();
    updateRoomState(room, 'aborted', '房主主动取消了当前活动房间');
    recordRoomEvent(room, 'room.abort', actor, '房主取消了当前活动房间');
  }
  replaceRoom(store, room);
  saveStore(store);
  return {
    room: buildRoomSnapshot(store, room, username),
    overview: buildActivityOverview(store, username, room.activity_domain),
  };
}

async function listActivityRoomOverview(username, domain = DEFAULT_ACTIVITY_DOMAIN) {
  const normalizedUsername = sanitizeText(username, 40);
  if (!normalizedUsername) throw createError('请先登录后再查看活动房间', 401);
  const store = loadStore();
  return buildActivityOverview(store, normalizedUsername, domain);
}

async function listFestivalRoomOverview(username, domain = DEFAULT_ACTIVITY_DOMAIN) {
  return listActivityRoomOverview(username, domain);
}

async function createFestivalRoom(payload = {}, actor = {}) {
  return createActivityRoom('festival', payload, actor);
}

async function settleFestivalRoom(roomId, actor = {}) {
  return settleActivityRoom(roomId, actor);
}

async function closeFestivalRoom(roomId, actor = {}) {
  return closeActivityRoom(roomId, actor);
}

async function listExpeditionRoomOverview(username) {
  return listActivityRoomOverview(username, 'expedition');
}

async function createExpeditionRoom(payload = {}, actor = {}) {
  return createActivityRoom('expedition', payload, actor);
}

async function inviteExpeditionRoomMember(roomId, payload = {}, actor = {}) {
  const result = await inviteFestivalRoomMember(roomId, payload, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function joinExpeditionRoom(roomId, actor = {}) {
  const result = await joinFestivalRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function leaveExpeditionRoom(roomId, actor = {}) {
  const result = await leaveFestivalRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function startExpeditionRoomReadyCheck(roomId, actor = {}) {
  const result = await startFestivalRoomReadyCheck(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function setExpeditionRoomReady(roomId, ready, actor = {}) {
  const result = await setFestivalRoomReady(roomId, ready, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function startExpeditionRoomCountdown(roomId, actor = {}) {
  const result = await startFestivalRoomCountdown(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function disconnectExpeditionRoom(roomId, actor = {}) {
  const result = await disconnectFestivalRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function reconnectExpeditionRoom(roomId, actor = {}) {
  const result = await reconnectFestivalRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function submitExpeditionRoomGameplayAction(roomId, payload = {}, actor = {}) {
  const result = await submitFestivalRoomGameplayAction(roomId, payload, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function settleExpeditionRoom(roomId, actor = {}) {
  const result = await settleActivityRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

async function closeExpeditionRoom(roomId, actor = {}) {
  const result = await closeActivityRoom(roomId, actor);
  result.overview = await listExpeditionRoomOverview(actor.username);
  return result;
}

function listAdminActivityRooms(domain = '') {
  const normalizedDomain = domain ? normalizeActivityDomain(domain) : '';
  const store = loadStore();
  const rooms = (store.rooms || [])
    .map(normalizeRoom)
    .filter(room => !normalizedDomain || room.activity_domain === normalizedDomain)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));
  return {
    rooms,
    receipts: (store.receipts || [])
      .map(normalizeRoomReceipt)
      .filter(receipt => !normalizedDomain || receipt.activity_domain === normalizedDomain)
      .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0)),
  };
}

async function retryAdminActivityRoomSettlement(roomId) {
  const store = loadStore();
  const room = ensureRoomExists(store, roomId);
  if (room.state !== 'settling') {
    throw createError('只有结算中的活动房间可以重放结算');
  }
  const actor = {
    username: room.host_username,
    displayName: room.host_display_name || room.host_username,
  };
  return room.activity_domain === 'expedition'
    ? closeExpeditionRoom(roomId, actor)
    : closeFestivalRoom(roomId, actor);
}

module.exports = {
  listFestivalRoomOverview,
  createFestivalRoom,
  inviteFestivalRoomMember,
  joinFestivalRoom,
  leaveFestivalRoom,
  startFestivalRoomReadyCheck,
  setFestivalRoomReady,
  startFestivalRoomCountdown,
  disconnectFestivalRoom,
  reconnectFestivalRoom,
  submitFestivalRoomGameplayAction,
  settleFestivalRoom,
  closeFestivalRoom,
  listExpeditionRoomOverview,
  createExpeditionRoom,
  inviteExpeditionRoomMember,
  joinExpeditionRoom,
  leaveExpeditionRoom,
  startExpeditionRoomReadyCheck,
  setExpeditionRoomReady,
  startExpeditionRoomCountdown,
  disconnectExpeditionRoom,
  reconnectExpeditionRoom,
  submitExpeditionRoomGameplayAction,
  settleExpeditionRoom,
  closeExpeditionRoom,
  listAdminActivityRooms,
  retryAdminActivityRoomSettlement,
};
