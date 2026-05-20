const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const taoyuanSocietyRuntime = require('./taoyuanSocietyRuntime');
const {
  createError,
  getActiveSaveContext,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_WORLD_EVENT_FILE = path.join(DATA_DIR, 'taoyuan_world_events.json');
const SEASON_ORDER = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
const SEASON_LABELS = Object.freeze({
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
});
const EVENT_STATE_LABELS = Object.freeze({
  upcoming: '待开启',
  active: '进行中',
  completed: '已完成',
  archived: '已归档',
  locked: '已锁定',
});
const RECEIPT_STATE_LABELS = Object.freeze({
  pending_persist: '待写回',
  persisted: '已写回',
  compensation_pending: '待补偿',
});
const WORLD_SCOPE_LABELS = Object.freeze({
  global: '全服事件',
  division: '分区事件',
  neighbor: '邻里事件',
  society: '村社事件',
  limited_time: '限时事件',
  anomaly: '随机异象事件',
});

const WORLD_SCOPE_ACTIONS = Object.freeze([
  {
    id: 'steady_support',
    label: '稳步支援',
    summary: '交 20 铜钱推进 1 点进度。',
    cost_money: 20,
    progress_delta: 1,
  },
  {
    id: 'joint_push',
    label: '合力冲刺',
    summary: '交 60 铜钱推进 3 点进度。',
    cost_money: 60,
    progress_delta: 3,
  },
]);

const SEASONAL_EVENT_DEFS = Object.freeze({
  spring_plowing: {
    id: 'spring_plowing',
    season: 'spring',
    label: '春耕大典',
    summary: '春耕期先把田垄、人手和播种节奏统一起来，让联机世界在本季正式开犁。',
    objective_label: '春耕进度',
    target_progress: 6,
    scope: 'global',
    base_reward_money: 72,
    reward_summary: '完成后按贡献发放春耕回礼、铜钱和节令记事。',
    completion_text: '春耕大典已经收口，田垄与播种节奏都已被众人稳住。',
    annal_summary: '这一年的春耕在众人合力下顺利开犁。',
    badge_label: '春耕见证者',
    contribution_actions: [
      {
        id: 'field_support',
        label: '整备田垄',
        summary: '交 20 铜钱工钱，推进 1 格春耕进度。',
        cost_money: 20,
        progress_delta: 1,
      },
      {
        id: 'seed_drive',
        label: '联保催耕',
        summary: '交 60 铜钱统筹物资与人手，推进 3 格春耕进度。',
        cost_money: 60,
        progress_delta: 3,
      },
    ],
  },
  summer_flood: {
    id: 'summer_flood',
    season: 'summer',
    label: '夏汛防洪',
    summary: '汛期来临时，需要玩家共同稳住堤岸、排水与巡河节奏，避免全服节庆与经营线被洪水拖慢。',
    objective_label: '防洪进度',
    target_progress: 6,
    scope: 'global',
    base_reward_money: 80,
    reward_summary: '完成后按贡献发放防汛回礼、铜钱和巡河记事。',
    completion_text: '夏汛已经压住，河道与堤岸本季暂时稳住了。',
    annal_summary: '这一年的夏汛在联机协作下没有冲垮公共节奏。',
    badge_label: '防汛守望者',
    contribution_actions: [
      {
        id: 'inspect_embankment',
        label: '巡看堤岸',
        summary: '交 20 铜钱巡河工钱，推进 1 格防洪进度。',
        cost_money: 20,
        progress_delta: 1,
      },
      {
        id: 'rush_relief',
        label: '抢修排险',
        summary: '交 60 铜钱调度人手与物资，推进 3 格防洪进度。',
        cost_money: 60,
        progress_delta: 3,
      },
    ],
  },
  autumn_harvest: {
    id: 'autumn_harvest',
    season: 'autumn',
    label: '秋收会盟',
    summary: '秋收季把收成调度、会盟备货与公共盘点合并到同一条世界目标上，先让全服收成有共同落点。',
    objective_label: '秋收进度',
    target_progress: 6,
    scope: 'global',
    base_reward_money: 88,
    reward_summary: '完成后按贡献发放秋收回礼、铜钱和会盟记事。',
    completion_text: '秋收会盟已经落定，本季公共收成与会盟筹备都已归拢。',
    annal_summary: '这一年的秋收在众人协作下顺利归仓会盟。',
    badge_label: '秋收会盟人',
    contribution_actions: [
      {
        id: 'sort_granary',
        label: '整理粮垛',
        summary: '交 20 铜钱雇工与搬运费，推进 1 格秋收进度。',
        cost_money: 20,
        progress_delta: 1,
      },
      {
        id: 'harvest_convoy',
        label: '会盟调度',
        summary: '交 60 铜钱统一调度秋收与会盟物资，推进 3 格秋收进度。',
        cost_money: 60,
        progress_delta: 3,
      },
    ],
  },
  winter_store: {
    id: 'winter_store',
    season: 'winter',
    label: '冬藏祭礼',
    summary: '冬藏期把越冬备货、祠堂祭礼和公共仓守备先推进成同一条世界目标，给下一轮开春留底。',
    objective_label: '冬藏进度',
    target_progress: 6,
    scope: 'global',
    base_reward_money: 96,
    reward_summary: '完成后按贡献发放冬藏回礼、铜钱和祭礼记事。',
    completion_text: '冬藏祭礼已经收束，越冬备货和祭礼秩序都已安稳落地。',
    annal_summary: '这一年的冬藏在众人接力下平稳封仓。',
    badge_label: '冬藏祭礼客',
    contribution_actions: [
      {
        id: 'store_watch',
        label: '守备封仓',
        summary: '交 20 铜钱守备工钱，推进 1 格冬藏进度。',
        cost_money: 20,
        progress_delta: 1,
      },
      {
        id: 'ritual_drive',
        label: '统筹祭礼',
        summary: '交 60 铜钱统一封仓与祭礼安排，推进 3 格冬藏进度。',
        cost_money: 60,
        progress_delta: 3,
      },
    ],
  },
});

const DIVISION_PARTITIONS = Object.freeze([
  { id: 'north', label: '北区' },
  { id: 'east', label: '东区' },
  { id: 'south', label: '南区' },
  { id: 'west', label: '西区' },
]);

const SCOPE_EVENT_DEFS = Object.freeze({
  global: {
    id: 'global_confluence',
    scope: 'global',
    scope_key_mode: 'cycle',
    label: '全服共振',
    summary: '全服玩家一起推动的公共事件，重点留下世界共同记忆。',
    objective_label: '全服进度',
    target_progress: 12,
    scope_label: WORLD_SCOPE_LABELS.global,
    base_reward_money: 120,
    reward_summary: '完成后按贡献发放全服回礼、铜钱和世界纪年。',
    completion_text: '全服共振已经收口，公共目标完成。',
    annal_summary: '这一段世界在全服协作下留下了共同记忆。',
    badge_label: '全服见证者',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
  division: {
    id: 'division_drive',
    scope: 'division',
    scope_key_mode: 'partition',
    label: '分区会盟',
    summary: '按照玩家归属分区推进的事件，同一分区的玩家会共享这条进度。',
    objective_label: '分区进度',
    target_progress: 8,
    scope_label: WORLD_SCOPE_LABELS.division,
    base_reward_money: 96,
    reward_summary: '完成后按分区贡献发放会盟回礼、铜钱和分区徽记。',
    completion_text: '分区会盟已经推进完毕，这个分区留下了自己的节奏。',
    annal_summary: '这一年的分区会盟让同一片区域形成了共同步调。',
    badge_label: '分区会盟人',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
  neighbor: {
    id: 'neighbor_unity',
    scope: 'neighbor',
    scope_key_mode: 'neighbor',
    label: '邻里同心',
    summary: '围绕邻里小组推进的事件，强调熟人协作和近邻互助。',
    objective_label: '邻里进度',
    target_progress: 6,
    scope_label: WORLD_SCOPE_LABELS.neighbor,
    base_reward_money: 72,
    reward_summary: '完成后按邻里贡献发放互助回礼、铜钱和邻里纪念。',
    completion_text: '邻里同心已经完成，这个邻里留下了互助回响。',
    annal_summary: '这一年的邻里同心让周边协作留下了新的回忆。',
    badge_label: '邻里同心人',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
  society: {
    id: 'society_convention',
    scope: 'society',
    scope_key_mode: 'society',
    label: '村社共策',
    summary: '围绕村社组织推进的事件，强调治理、公共议题和组织协作。',
    objective_label: '村社进度',
    target_progress: 6,
    scope_label: WORLD_SCOPE_LABELS.society,
    base_reward_money: 84,
    reward_summary: '完成后按村社贡献发放共策回礼、铜钱和村社纪事。',
    completion_text: '村社共策已经收束，这个组织有了新的公共记忆。',
    annal_summary: '这一年的村社共策让组织协作留下了纪事。',
    badge_label: '村社共策人',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
  limited_time: {
    id: 'limited_window',
    scope: 'limited_time',
    scope_key_mode: 'cycle',
    label: '限时试炼',
    summary: '只在当前节奏窗口内开放的短周期事件，过窗后会回归归档。',
    objective_label: '试炼进度',
    target_progress: 5,
    scope_label: WORLD_SCOPE_LABELS.limited_time,
    base_reward_money: 88,
    reward_summary: '完成后按贡献发放试炼回礼、铜钱和限时纪念。',
    completion_text: '限时试炼已经完成，窗口期内的协作被记录下来。',
    annal_summary: '这一轮限时试炼在有效窗口里完成了。',
    badge_label: '限时试炼客',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
  anomaly: {
    id: 'random_anomaly',
    scope: 'anomaly',
    scope_key_mode: 'day',
    label: '随机异象',
    summary: '每日都会变化的随机世界异象，给世界留下一点不可预测的痕迹。',
    objective_label: '异象进度',
    target_progress: 4,
    scope_label: WORLD_SCOPE_LABELS.anomaly,
    base_reward_money: 108,
    reward_summary: '完成后按贡献发放异象回礼、铜钱和异象纪念。',
    completion_text: '随机异象已经收束，变化被世界记录了下来。',
    annal_summary: '这一轮随机异象留下了不可重复的世界痕迹。',
    badge_label: '异象见证者',
    contribution_actions: WORLD_SCOPE_ACTIONS,
  },
});

const SCOPE_EVENT_DEFS_BY_ID = Object.freeze(
  Object.fromEntries(Object.values(SCOPE_EVENT_DEFS).map(definition => [definition.id, definition]))
);

const SEASON_TO_EVENT_ID = Object.freeze(
  Object.fromEntries(Object.values(SEASONAL_EVENT_DEFS).map(def => [def.season, def.id]))
);

const WORLD_EVENT_ANOMALY_LABELS = Object.freeze([
  '晨雾异象',
  '回声异象',
  '灵潮异象',
  '风语异象',
]);

function getCurrentDayKey() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function getScopeEventDefinition(definitionId) {
  const normalized = sanitizeText(definitionId, 40);
  return SCOPE_EVENT_DEFS[normalized] || SCOPE_EVENT_DEFS_BY_ID[normalized] || null;
}

function getEventDefinitionById(definitionId) {
  const normalized = sanitizeText(definitionId, 40);
  return SEASONAL_EVENT_DEFS[normalized] || getScopeEventDefinition(normalized) || null;
}

function resolveDivisionPartition(username) {
  const hash = crypto.createHash('sha1').update(String(username || '').trim() || 'guest').digest();
  return DIVISION_PARTITIONS[hash[0] % DIVISION_PARTITIONS.length];
}

function resolveAnomalyLabel(dayKey) {
  const hash = crypto.createHash('sha1').update(String(dayKey || '').trim() || '0000-00-00').digest();
  return WORLD_EVENT_ANOMALY_LABELS[hash[1] % WORLD_EVENT_ANOMALY_LABELS.length];
}

function resolveWorldEventContext(definition, viewerUsername) {
  const seasonContext = getCurrentSeasonContext();
  const normalizedUsername = sanitizeText(viewerUsername, 40);
  const dayKey = getCurrentDayKey();

  if (!definition) {
    return {
      scope_key: `unknown:${normalizedUsername || 'guest'}`,
      scope_label: '未识别事件',
      scope_value: 'unknown',
      label: '未识别事件',
      summary: '未识别的世界事件。',
      cycle_key: seasonContext.cycle_key,
      state: 'locked',
      can_contribute: false,
      locked_reason: '事件定义缺失',
    };
  }

  if (definition.scope === 'global') {
    return {
      scope_key: seasonContext.cycle_key,
      scope_label: definition.scope_label || WORLD_SCOPE_LABELS.global,
      scope_value: seasonContext.cycle_key,
      label: definition.label,
      summary: definition.summary,
      cycle_key: seasonContext.cycle_key,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  if (definition.scope === 'division') {
    const partition = resolveDivisionPartition(normalizedUsername);
    return {
      scope_key: `${seasonContext.year}:${partition.id}`,
      scope_label: `${definition.scope_label || WORLD_SCOPE_LABELS.division} · ${partition.label}`,
      scope_value: partition.label,
      label: `${partition.label}${definition.label}`,
      summary: `${partition.label}玩家共同推进的分区事件。`,
      cycle_key: `${seasonContext.year}-${partition.id}`,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  if (definition.scope === 'neighbor') {
    const neighbor = taoyuanSocialRuntime.getNeighborGroupForUser(normalizedUsername);
    if (!neighbor) {
      return {
        scope_key: `neighbor:none:${normalizedUsername || 'guest'}`,
        scope_label: definition.scope_label || WORLD_SCOPE_LABELS.neighbor,
        scope_value: '未加入邻里',
        label: definition.label,
        summary: '需要先加入邻里，才能推进这条世界事件。',
        cycle_key: `neighbor:none:${normalizedUsername || 'guest'}`,
        state: 'locked',
        can_contribute: false,
        locked_reason: '请先加入一个邻里再参与这条事件。',
      };
    }
    return {
      scope_key: `${neighbor.id}`,
      scope_label: `${definition.scope_label || WORLD_SCOPE_LABELS.neighbor} · ${neighbor.name}`,
      scope_value: neighbor.name,
      label: `${neighbor.name}${definition.label}`,
      summary: `围绕邻里「${neighbor.name}」推进的共同事件。`,
      cycle_key: `neighbor:${neighbor.id}`,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  if (definition.scope === 'society') {
    const society = taoyuanSocietyRuntime.getSocietySummaryForUser(normalizedUsername);
    if (!society) {
      return {
        scope_key: `society:none:${normalizedUsername || 'guest'}`,
        scope_label: definition.scope_label || WORLD_SCOPE_LABELS.society,
        scope_value: '未加入村社',
        label: definition.label,
        summary: '需要先加入村社，才能推进这条世界事件。',
        cycle_key: `society:none:${normalizedUsername || 'guest'}`,
        state: 'locked',
        can_contribute: false,
        locked_reason: '请先加入一个村社再参与这条事件。',
      };
    }
    return {
      scope_key: `${society.id}`,
      scope_label: `${definition.scope_label || WORLD_SCOPE_LABELS.society} · ${society.name}`,
      scope_value: society.name,
      label: `${society.name}${definition.label}`,
      summary: `围绕村社「${society.name}」推进的共策事件。`,
      cycle_key: `society:${society.id}`,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  if (definition.scope === 'limited_time') {
    return {
      scope_key: dayKey,
      scope_label: definition.scope_label || WORLD_SCOPE_LABELS.limited_time,
      scope_value: dayKey,
      label: `${definition.label}（${dayKey.slice(5).replace('-', '/')}）`,
      summary: definition.summary,
      cycle_key: dayKey,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  if (definition.scope === 'anomaly') {
    const anomalyLabel = resolveAnomalyLabel(dayKey);
    return {
      scope_key: `${dayKey}:${anomalyLabel}`,
      scope_label: definition.scope_label || WORLD_SCOPE_LABELS.anomaly,
      scope_value: dayKey,
      label: anomalyLabel,
      summary: `${anomalyLabel}在今天的世界里短暂显现。`,
      cycle_key: dayKey,
      state: 'active',
      can_contribute: true,
      locked_reason: '',
    };
  }

  return {
    scope_key: seasonContext.cycle_key,
    scope_label: definition.scope_label || WORLD_SCOPE_LABELS.global,
    scope_value: seasonContext.cycle_key,
    label: definition.label,
    summary: definition.summary,
    cycle_key: seasonContext.cycle_key,
    state: 'active',
    can_contribute: true,
    locked_reason: '',
  };
}

function createEmptyStore() {
  return {
    current_year: 0,
    current_season: 'spring',
    current_cycle_key: '',
    seasonal_events: [],
    scope_events: [],
    receipts: [],
    annals: [],
    updated_at: 0,
  };
}

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCycleKey(year, season) {
  return `${year}-${season}`;
}

function getCurrentSeasonContext() {
  const bjNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = bjNow.getUTCFullYear();
  const month = bjNow.getUTCMonth() + 1;
  let season = 'spring';
  if (month >= 6 && month <= 8) season = 'summer';
  else if (month >= 9 && month <= 11) season = 'autumn';
  else if (month === 12 || month <= 2) season = 'winter';
  return {
    year,
    month,
    season,
    season_label: SEASON_LABELS[season] || season,
    season_index: SEASON_ORDER.indexOf(season),
    cycle_key: buildCycleKey(year, season),
  };
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_WORLD_EVENT_FILE), { recursive: true });
}

function loadStore() {
  ensureStoreDir();
  if (!fs.existsSync(TAOYUAN_WORLD_EVENT_FILE)) return createEmptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(TAOYUAN_WORLD_EVENT_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : createEmptyStore();
  } catch {
    return createEmptyStore();
  }
}

function saveStore(store) {
  ensureStoreDir();
  writeJsonFileAtomic(TAOYUAN_WORLD_EVENT_FILE, store);
}

function normalizeContribution(raw = {}) {
  return {
    username: sanitizeText(raw.username, 40),
    display_name: sanitizeText(raw.display_name, 40),
    progress_value: clampPositiveInt(raw.progress_value, 0),
    action_count: clampPositiveInt(raw.action_count, 0),
    last_action_id: sanitizeText(raw.last_action_id, 40),
    last_action_label: sanitizeText(raw.last_action_label, 40),
    last_action_at: clampPositiveInt(raw.last_action_at, 0),
    settled_at: clampPositiveInt(raw.settled_at, 0),
    receipt_id: sanitizeText(raw.receipt_id, 80),
  };
}

function normalizeEventLog(raw = {}) {
  return {
    id: sanitizeText(raw.id || makeId('world_event_log'), 80),
    username: sanitizeText(raw.username, 40),
    display_name: sanitizeText(raw.display_name, 40),
    action_id: sanitizeText(raw.action_id, 40),
    action_label: sanitizeText(raw.action_label, 40),
    progress_delta: clampPositiveInt(raw.progress_delta, 0),
    summary: sanitizeText(raw.summary, 160),
    created_at: clampPositiveInt(raw.created_at, 0),
  };
}

function normalizeReceipt(raw = {}) {
  return {
    id: sanitizeText(raw.id || makeId('world_event_receipt'), 80),
    event_id: sanitizeText(raw.event_id, 40),
    event_label: sanitizeText(raw.event_label, 40),
    season: sanitizeText(raw.season, 20),
    cycle_key: sanitizeText(raw.cycle_key, 40),
    target_username: sanitizeText(raw.target_username, 40),
    target_display_name: sanitizeText(raw.target_display_name, 40),
    target_slot: Number.isInteger(Number(raw.target_slot)) ? Number(raw.target_slot) : null,
    contribution_value: clampPositiveInt(raw.contribution_value, 0),
    reward_payload: {
      money: clampPositiveInt(raw.reward_payload?.money, 0),
    },
    reward_summary: sanitizeText(raw.reward_summary, 160),
    badge_label: sanitizeText(raw.badge_label, 40),
    rank: clampPositiveInt(raw.rank, 0),
    status: RECEIPT_STATE_LABELS[String(raw.status || '').trim()] ? String(raw.status).trim() : 'pending_persist',
    status_label: RECEIPT_STATE_LABELS[String(raw.status || '').trim()] || RECEIPT_STATE_LABELS.pending_persist,
    idempotency_key: sanitizeText(raw.idempotency_key, 120),
    reward_result: sanitizeText(raw.reward_result, 160),
    last_error: sanitizeText(raw.last_error, 160),
    created_at: clampPositiveInt(raw.created_at, 0),
    persisted_at: clampPositiveInt(raw.persisted_at, 0),
    updated_at: clampPositiveInt(raw.updated_at, 0),
  };
}

function normalizeAnnal(raw = {}) {
  return {
    id: sanitizeText(raw.id || makeId('world_event_annal'), 80),
    event_id: sanitizeText(raw.event_id, 40),
    event_label: sanitizeText(raw.event_label, 40),
    season: sanitizeText(raw.season, 20),
    season_label: sanitizeText(raw.season_label, 20),
    cycle_key: sanitizeText(raw.cycle_key, 40),
    summary: sanitizeText(raw.summary, 160),
    completed_at: clampPositiveInt(raw.completed_at, 0),
    contributor_count: clampPositiveInt(raw.contributor_count, 0),
    top_contributor_username: sanitizeText(raw.top_contributor_username, 40),
    top_contributor_display_name: sanitizeText(raw.top_contributor_display_name, 40),
  };
}

function createEventInstance(eventId, cycleYear) {
  const definition = SEASONAL_EVENT_DEFS[eventId];
  return {
    id: definition.id,
    season: definition.season,
    cycle_year: cycleYear,
    cycle_key: buildCycleKey(cycleYear, definition.season),
    progress: 0,
    completed_at: 0,
    settled_at: 0,
    state: 'upcoming',
    updated_at: nowSeconds(),
    participants: [],
    recent_logs: [],
    receipt_ids: [],
    annal_id: '',
  };
}

function createScopeEventInstance(definitionId, viewerUsername) {
  const definition = getScopeEventDefinition(definitionId);
  const context = resolveWorldEventContext(definition, viewerUsername);
  return {
    id: `${definition.id}::${context.scope_key}`,
    definition_id: definition.id,
    scope: definition.scope,
    scope_key: context.scope_key,
    scope_label: context.scope_label,
    scope_value: context.scope_value,
    cycle_key: context.cycle_key,
    label: context.label,
    summary: context.summary,
    locked_reason: context.locked_reason,
    progress: 0,
    completed_at: 0,
    settled_at: 0,
    state: context.state,
    updated_at: nowSeconds(),
    participants: [],
    recent_logs: [],
    receipt_ids: [],
    annal_id: '',
  };
}

function normalizeEvent(raw = {}) {
  const definition = SEASONAL_EVENT_DEFS[raw.id] || SEASONAL_EVENT_DEFS.spring_plowing;
  return {
    id: definition.id,
    season: definition.season,
    cycle_year: clampPositiveInt(raw.cycle_year, 0),
    cycle_key: sanitizeText(raw.cycle_key || buildCycleKey(raw.cycle_year, definition.season), 40),
    progress: clampPositiveInt(raw.progress, 0),
    completed_at: clampPositiveInt(raw.completed_at, 0),
    settled_at: clampPositiveInt(raw.settled_at, 0),
    state: EVENT_STATE_LABELS[String(raw.state || '').trim()] ? String(raw.state).trim() : 'upcoming',
    updated_at: clampPositiveInt(raw.updated_at, 0),
    participants: Array.isArray(raw.participants) ? raw.participants.map(normalizeContribution).filter(item => item.username) : [],
    recent_logs: Array.isArray(raw.recent_logs) ? raw.recent_logs.map(normalizeEventLog).slice(0, 20) : [],
    receipt_ids: Array.isArray(raw.receipt_ids) ? raw.receipt_ids.map(item => sanitizeText(item, 80)).filter(Boolean) : [],
    annal_id: sanitizeText(raw.annal_id, 80),
  };
}

function normalizeScopeEvent(raw = {}) {
  const definitionId = sanitizeText(raw.definition_id || String(raw.id || '').split('::')[0], 40);
  const definition = getScopeEventDefinition(definitionId) || SCOPE_EVENT_DEFS.global;
  return {
    id: sanitizeText(raw.id || `${definition.id}::${sanitizeText(raw.scope_key, 120)}`, 180),
    definition_id: definition.id,
    scope: definition.scope,
    scope_key: sanitizeText(raw.scope_key, 120),
    scope_label: sanitizeText(raw.scope_label, 60),
    scope_value: sanitizeText(raw.scope_value, 60),
    cycle_key: sanitizeText(raw.cycle_key, 60),
    label: sanitizeText(raw.label, 60) || definition.label,
    summary: sanitizeText(raw.summary, 160) || definition.summary,
    locked_reason: sanitizeText(raw.locked_reason, 160),
    progress: clampPositiveInt(raw.progress, 0),
    completed_at: clampPositiveInt(raw.completed_at, 0),
    settled_at: clampPositiveInt(raw.settled_at, 0),
    state: EVENT_STATE_LABELS[String(raw.state || '').trim()] ? String(raw.state).trim() : 'upcoming',
    updated_at: clampPositiveInt(raw.updated_at, 0),
    participants: Array.isArray(raw.participants) ? raw.participants.map(normalizeContribution).filter(item => item.username) : [],
    recent_logs: Array.isArray(raw.recent_logs) ? raw.recent_logs.map(normalizeEventLog).slice(0, 20) : [],
    receipt_ids: Array.isArray(raw.receipt_ids) ? raw.receipt_ids.map(item => sanitizeText(item, 80)).filter(Boolean) : [],
    annal_id: sanitizeText(raw.annal_id, 80),
  };
}

function ensureScopedEventsForViewer(store, viewerUsername) {
  const scopedEvents = [];
  for (const definitionId of Object.keys(SCOPE_EVENT_DEFS)) {
    const definition = SCOPE_EVENT_DEFS[definitionId];
    const context = resolveWorldEventContext(definition, viewerUsername);
    const instanceId = `${definition.id}::${context.scope_key}`;
    const existing = (store.scope_events || [])
      .map(normalizeScopeEvent)
      .find(event => event.id === instanceId);
    const nextEvent = existing || createScopeEventInstance(definitionId, viewerUsername);
    nextEvent.id = instanceId;
    nextEvent.definition_id = definition.id;
    nextEvent.scope = definition.scope;
    nextEvent.scope_key = context.scope_key;
    nextEvent.scope_label = context.scope_label;
    nextEvent.scope_value = context.scope_value;
    nextEvent.cycle_key = context.cycle_key;
    nextEvent.label = context.label;
    nextEvent.summary = context.summary;
    nextEvent.locked_reason = context.locked_reason;
    nextEvent.state = nextEvent.completed_at > 0 ? 'completed' : context.state;
    nextEvent.updated_at = Math.max(nextEvent.updated_at, nowSeconds());
    replaceScopeEvent(store, nextEvent);
    scopedEvents.push(normalizeScopeEvent(nextEvent));
  }
  return scopedEvents;
}

function ensureWorldEventStore(store) {
  const seasonContext = getCurrentSeasonContext();
  if (!store || typeof store !== 'object') store = createEmptyStore();
  if (!Array.isArray(store.annals)) store.annals = [];
  if (!Array.isArray(store.receipts)) store.receipts = [];

  const shouldRebuildSeasonal =
    !Array.isArray(store.seasonal_events)
    || store.seasonal_events.length !== SEASON_ORDER.length
    || Number(store.current_year) !== seasonContext.year;

  if (shouldRebuildSeasonal) {
    store.seasonal_events = SEASON_ORDER.map(season => createEventInstance(SEASON_TO_EVENT_ID[season], seasonContext.year));
    store.receipts = [];
  }

  store.seasonal_events = SEASON_ORDER.map(season => {
    const eventId = SEASON_TO_EVENT_ID[season];
    const existing = (store.seasonal_events || []).map(normalizeEvent).find(event => event.id === eventId && event.cycle_year === seasonContext.year);
    return existing || createEventInstance(eventId, seasonContext.year);
  });

  store.seasonal_events = store.seasonal_events.map(normalizeEvent).map(event => {
    const eventIndex = SEASON_ORDER.indexOf(event.season);
    if (eventIndex === seasonContext.season_index) {
      event.state = event.completed_at > 0 ? 'completed' : 'active';
    } else if (eventIndex < seasonContext.season_index) {
      event.state = event.completed_at > 0 ? 'completed' : 'archived';
    } else {
      event.state = 'upcoming';
    }
    event.updated_at = Math.max(event.updated_at, nowSeconds());
    return event;
  });

  if (!Array.isArray(store.scope_events)) store.scope_events = [];
  store.scope_events = (store.scope_events || []).map(normalizeScopeEvent).map(event => {
    event.updated_at = Math.max(event.updated_at, nowSeconds());
    return event;
  });

  store.receipts = (store.receipts || []).map(normalizeReceipt).slice(0, 240);
  store.annals = (store.annals || []).map(normalizeAnnal).slice(0, 80);
  store.current_year = seasonContext.year;
  store.current_season = seasonContext.season;
  store.current_cycle_key = seasonContext.cycle_key;
  store.updated_at = nowSeconds();
  return seasonContext;
}

function getEventDefinition(eventId) {
  const normalizedId = sanitizeText(eventId, 120);
  const definition = getEventDefinitionById(normalizedId) || getEventDefinitionById(normalizedId.split(':')[0]);
  if (!definition) throw createError('四季大事件不存在', 404);
  return definition;
}

function getEventAction(eventId, actionId) {
  const definition = getEventDefinition(eventId);
  const normalizedActionId = sanitizeText(actionId, 40) || definition.contribution_actions[0]?.id;
  return definition.contribution_actions.find(action => action.id === normalizedActionId) || null;
}

function getSortedContributors(event) {
  return (event.participants || [])
    .map(normalizeContribution)
    .sort((left, right) => {
      if (right.progress_value !== left.progress_value) return right.progress_value - left.progress_value;
      if (right.action_count !== left.action_count) return right.action_count - left.action_count;
      return left.last_action_at - right.last_action_at;
    });
}

function ensureParticipant(event, username, displayName) {
  const normalizedUsername = sanitizeText(username, 40);
  const normalizedDisplayName = sanitizeText(displayName, 40) || normalizedUsername;
  const existing = (event.participants || []).map(normalizeContribution).find(item => item.username === normalizedUsername);
  if (existing) {
    existing.display_name = normalizedDisplayName;
    event.participants = (event.participants || []).map(entry => {
      const normalized = normalizeContribution(entry);
      return normalized.username === normalizedUsername ? existing : normalized;
    });
    return existing;
  }
  const next = normalizeContribution({
    username: normalizedUsername,
    display_name: normalizedDisplayName,
  });
  event.participants = [...(event.participants || []).map(normalizeContribution), next];
  return next;
}

function pushEventLog(event, payload) {
  event.recent_logs = [
    normalizeEventLog(payload),
    ...(event.recent_logs || []).map(normalizeEventLog),
  ].slice(0, 12);
}

function replaceEvent(store, nextEvent) {
  store.seasonal_events = (store.seasonal_events || []).map(normalizeEvent).map(event => event.id === nextEvent.id ? normalizeEvent(nextEvent) : event);
}

function replaceScopeEvent(store, nextEvent) {
  const normalizedNext = normalizeScopeEvent(nextEvent);
  const existing = (store.scope_events || []).map(normalizeScopeEvent);
  const index = existing.findIndex(event => event.id === normalizedNext.id);
  if (index >= 0) {
    existing[index] = normalizedNext;
  } else {
    existing.push(normalizedNext);
  }
  store.scope_events = existing;
}

function buildContributionLockedReason(event) {
  if (event.state === 'completed') return '当前季节事件已经结算完毕，等待下一季轮换。';
  if (event.state === 'archived') return '这场季节事件已经归档，只保留进度与史册回看。';
  if (event.state === 'upcoming') return '这场季节事件尚未到开放季节，暂时只能先看预告。';
  if (event.state === 'locked') return sanitizeText(event.locked_reason, 160) || '当前暂不满足参与条件。';
  return '';
}

function ensurePlayerWorldEventState(saveData) {
  if (!saveData.onlineWorldEvents || typeof saveData.onlineWorldEvents !== 'object') {
    saveData.onlineWorldEvents = {};
  }
  const state = saveData.onlineWorldEvents;
  if (!state.appliedReceipts || typeof state.appliedReceipts !== 'object') state.appliedReceipts = {};
  if (!Array.isArray(state.contributionRecords)) state.contributionRecords = [];
  if (!state.seasonalBadges || typeof state.seasonalBadges !== 'object') state.seasonalBadges = {};
  if (!Number.isFinite(Number(state.totalContribution))) state.totalContribution = 0;
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  if (!Number.isFinite(Number(saveData.player.money))) saveData.player.money = 0;
  return state;
}

function resolveTargetSlot(username) {
  try {
    return getActiveSaveContext(username, null, '').slot;
  } catch {
    return null;
  }
}

function buildReceiptRewardMoney(eventDefinition, contributor, rankIndex) {
  const rankBonus = rankIndex === 0 ? 18 : rankIndex === 1 ? 10 : 4;
  return eventDefinition.base_reward_money + contributor.progress_value * 6 + rankBonus;
}

function createReceiptForContributor(event, contributor, rankIndex) {
  const definition = getEventDefinition(event.definition_id || event.id);
  const rewardMoney = buildReceiptRewardMoney(definition, contributor, rankIndex);
  return normalizeReceipt({
    id: makeId('world_event_receipt'),
    event_id: event.id,
    event_label: definition.label,
    season: definition.season,
    cycle_key: event.cycle_key,
    target_username: contributor.username,
    target_display_name: contributor.display_name,
    target_slot: resolveTargetSlot(contributor.username),
    contribution_value: contributor.progress_value,
    reward_payload: {
      money: rewardMoney,
    },
    reward_summary: `${definition.label}结算：贡献 ${contributor.progress_value} 点，结算 ${rewardMoney} 铜钱。`,
    badge_label: definition.badge_label,
    rank: rankIndex + 1,
    status: 'pending_persist',
    idempotency_key: `world_event:${event.id}:${event.cycle_key}:${contributor.username}`,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });
}

function createAnnalEntry(event, contributors) {
  const definition = getEventDefinition(event.definition_id || event.id);
  const topContributor = contributors[0] || {};
  return normalizeAnnal({
    id: `world_event_annal_${event.cycle_key}_${event.id}`,
    event_id: event.id,
    event_label: definition.label,
    season: definition.season,
    season_label: SEASON_LABELS[definition.season] || definition.season,
    cycle_key: event.cycle_key,
    summary: definition.annal_summary,
    completed_at: event.completed_at,
    contributor_count: contributors.length,
    top_contributor_username: sanitizeText(topContributor.username, 40),
    top_contributor_display_name: sanitizeText(topContributor.display_name, 40),
  });
}

function applyWorldEventReceiptReward(receipt, event) {
  const context = getActiveSaveContext(
    receipt.target_username,
    receipt.target_slot,
    '当前贡献者没有可用的桃源服务端存档，暂时无法写入四季大事件奖励'
  );
  context.username = receipt.target_username;
  const playerState = ensurePlayerWorldEventState(context.data);
  if (playerState.appliedReceipts[receipt.idempotency_key]) {
    return {
      slot: context.slot,
      revision: context.saves.slots[context.slot]?.revision ?? 0,
      reward_result: `世界事件奖励已存在于槽位 ${Number(context.slot) + 1}`,
    };
  }

  const currentMoney = Math.max(0, Math.floor(Number(context.data.player.money) || 0));
  context.data.player.money = currentMoney + clampPositiveInt(receipt.reward_payload?.money, 0);
  playerState.totalContribution = clampPositiveInt(playerState.totalContribution, 0) + clampPositiveInt(receipt.contribution_value, 0);
  playerState.seasonalBadges[receipt.event_id] = {
    label: sanitizeText(receipt.badge_label, 40),
    cycle_key: sanitizeText(receipt.cycle_key, 40),
    rank: clampPositiveInt(receipt.rank, 0),
    awarded_at: nowSeconds(),
  };
  playerState.contributionRecords = [
    {
      record_id: `world_event_record_${receipt.event_id}_${receipt.cycle_key}_${receipt.target_username}`,
      event_id: receipt.event_id,
      event_label: receipt.event_label,
      season: sanitizeText(receipt.season, 20),
      season_label: SEASON_LABELS[receipt.season] || receipt.season,
      cycle_key: receipt.cycle_key,
      contribution_value: clampPositiveInt(receipt.contribution_value, 0),
      reward_money: clampPositiveInt(receipt.reward_payload?.money, 0),
      reward_summary: sanitizeText(receipt.reward_summary, 160),
      badge_label: sanitizeText(receipt.badge_label, 40),
      rank: clampPositiveInt(receipt.rank, 0),
      completed_at: clampPositiveInt(event.completed_at, 0),
    },
    ...(playerState.contributionRecords || []).filter(entry => String(entry?.record_id || '') !== `world_event_record_${receipt.event_id}_${receipt.cycle_key}_${receipt.target_username}`),
  ].slice(0, 20);
  playerState.appliedReceipts[receipt.idempotency_key] = {
    receipt_id: receipt.id,
    persisted_at: nowSeconds(),
  };

  const revision = persistGameplayData(context);
  return {
    slot: context.slot,
    revision,
    reward_result: `世界事件奖励已写入槽位 ${Number(context.slot) + 1}`,
  };
}

function persistEventReceipts(store, event) {
  const receiptIds = new Set((event.receipt_ids || []).map(item => sanitizeText(item, 80)).filter(Boolean));
  if (!receiptIds.size) return { pending_compensation_count: 0 };
  const nextReceipts = [];
  let pendingCompensationCount = 0;
  for (const raw of store.receipts || []) {
    const receipt = normalizeReceipt(raw);
    if (!receiptIds.has(receipt.id)) {
      nextReceipts.push(receipt);
      continue;
    }
    if (receipt.status === 'persisted') {
      nextReceipts.push(receipt);
      continue;
    }
    try {
      const rewardOutcome = applyWorldEventReceiptReward(receipt, event);
      nextReceipts.push(normalizeReceipt({
        ...receipt,
        status: 'persisted',
        reward_result: rewardOutcome.reward_result,
        persisted_at: nowSeconds(),
        updated_at: nowSeconds(),
        last_error: '',
      }));
      event.participants = (event.participants || []).map(entry => {
        const contributor = normalizeContribution(entry);
        if (contributor.username !== receipt.target_username) return contributor;
        contributor.settled_at = nowSeconds();
        contributor.receipt_id = receipt.id;
        return contributor;
      });
    } catch (error) {
      pendingCompensationCount += 1;
      nextReceipts.push(normalizeReceipt({
        ...receipt,
        status: 'compensation_pending',
        reward_result: '世界事件奖励写回失败，已进入补偿队列',
        last_error: sanitizeText(error?.message || '世界事件奖励写回失败', 160),
        updated_at: nowSeconds(),
      }));
    }
  }
  store.receipts = nextReceipts.slice(0, 240);
  event.settled_at = pendingCompensationCount === 0 ? nowSeconds() : 0;
  return {
    pending_compensation_count: pendingCompensationCount,
  };
}

function finalizeEventIfNeeded(store, event) {
  const definition = getEventDefinition(event.definition_id || event.id);
  if (event.completed_at > 0 || event.progress < definition.target_progress) return;

  event.completed_at = nowSeconds();
  event.state = 'completed';
  event.updated_at = nowSeconds();

  const sortedContributors = getSortedContributors(event);
  const annal = createAnnalEntry(event, sortedContributors);
  store.annals = [
    annal,
    ...(store.annals || []).map(normalizeAnnal).filter(entry => entry.id !== annal.id),
  ].slice(0, 40);
  event.annal_id = annal.id;

  if (!Array.isArray(event.receipt_ids) || event.receipt_ids.length === 0) {
    const createdReceipts = sortedContributors.map((contributor, index) => createReceiptForContributor(event, contributor, index));
    store.receipts = [...createdReceipts, ...(store.receipts || []).map(normalizeReceipt)].slice(0, 240);
    event.receipt_ids = createdReceipts.map(receipt => receipt.id);
  }

  persistEventReceipts(store, event);
}

function buildActionSnapshot(event, action) {
  return {
    id: action.id,
    label: action.label,
    summary: action.summary,
    cost_money: action.cost_money,
    progress_delta: action.progress_delta,
    can_use: event.state === 'active',
    disabled_reason: event.state === 'active' ? '' : buildContributionLockedReason(event),
  };
}

function buildReceiptSnapshot(receipt) {
  const normalized = normalizeReceipt(receipt);
  return {
    id: normalized.id,
    target_username: normalized.target_username,
    target_display_name: normalized.target_display_name,
    target_slot: normalized.target_slot,
    contribution_value: normalized.contribution_value,
    reward_payload: normalized.reward_payload,
    reward_summary: normalized.reward_summary,
    badge_label: normalized.badge_label,
    rank: normalized.rank,
    status: normalized.status,
    status_label: RECEIPT_STATE_LABELS[normalized.status] || RECEIPT_STATE_LABELS.pending_persist,
    reward_result: normalized.reward_result,
    last_error: normalized.last_error,
    created_at: normalized.created_at,
  };
}

function buildContributorSnapshot(contributor, rankIndex) {
  const normalized = normalizeContribution(contributor);
  return {
    username: normalized.username,
    display_name: normalized.display_name,
    progress_value: normalized.progress_value,
    action_count: normalized.action_count,
    last_action_id: normalized.last_action_id,
    last_action_label: normalized.last_action_label,
    last_action_at: normalized.last_action_at,
    settled_at: normalized.settled_at,
    rank: rankIndex + 1,
  };
}

function buildEventSnapshot(store, event, viewerUsername) {
  const definition = getEventDefinition(event.definition_id || event.id);
  const contributors = getSortedContributors(event);
  const myContribution = contributors.find(item => item.username === sanitizeText(viewerUsername, 40)) || null;
  const receiptIds = new Set((event.receipt_ids || []).map(item => sanitizeText(item, 80)).filter(Boolean));
  const recentReceipts = (store.receipts || [])
    .map(normalizeReceipt)
    .filter(receipt => receiptIds.has(receipt.id))
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 4)
    .map(buildReceiptSnapshot);
  return {
    id: event.id || definition.id,
    definition_id: definition.id,
    label: event.label || definition.label,
    season: definition.season || sanitizeText(store.current_season, 20),
    season_label: SEASON_LABELS[definition.season] || SEASON_LABELS[store.current_season] || definition.season || sanitizeText(store.current_season, 20),
    scope: event.scope || definition.scope || 'global',
    scope_label: event.scope_label || definition.scope_label || WORLD_SCOPE_LABELS[event.scope || definition.scope || 'global'] || definition.scope || 'global',
    scope_value: event.scope_value || '',
    scope_key: event.scope_key || '',
    state: event.state,
    state_label: EVENT_STATE_LABELS[event.state] || EVENT_STATE_LABELS.upcoming,
    summary: event.summary || definition.summary,
    objective_label: definition.objective_label,
    progress_value: Math.min(event.progress, definition.target_progress),
    target_progress: definition.target_progress,
    progress_percent: Math.min(100, Math.round((Math.min(event.progress, definition.target_progress) / Math.max(1, definition.target_progress)) * 100)),
    progress_text: `${Math.min(event.progress, definition.target_progress)} / ${definition.target_progress}`,
    cycle_key: event.cycle_key,
    is_current_season: !!definition.season && sanitizeText(store.current_season, 20) === definition.season,
    can_contribute: event.state === 'active',
    locked_reason: buildContributionLockedReason(event),
    reward_money_hint: definition.base_reward_money,
    reward_summary: definition.reward_summary,
    completion_text: definition.completion_text,
    completed_at: event.completed_at,
    settled_at: event.settled_at,
    contribution_actions: definition.contribution_actions.map(action => buildActionSnapshot(event, action)),
    contributors: contributors.slice(0, 5).map((contributor, index) => buildContributorSnapshot(contributor, index)),
    recent_logs: (event.recent_logs || []).map(normalizeEventLog).slice(0, 4),
    settlement_receipts: recentReceipts,
    my_contribution: myContribution
      ? {
          progress_value: myContribution.progress_value,
          action_count: myContribution.action_count,
          last_action_label: myContribution.last_action_label,
          last_action_at: myContribution.last_action_at,
          settled_at: myContribution.settled_at,
          rank: contributors.findIndex(item => item.username === myContribution.username) + 1,
        }
      : null,
  };
}

function loadViewerWorldEventRecords(username) {
  const normalizedUsername = sanitizeText(username, 40);
  if (!normalizedUsername) {
    return {
      total_contribution_points: 0,
      my_records: [],
      seasonal_badges: [],
    };
  }
  try {
    const context = getActiveSaveContext(normalizedUsername, null, '');
    const state = ensurePlayerWorldEventState(context.data);
    return {
      total_contribution_points: clampPositiveInt(state.totalContribution, 0),
      my_records: (state.contributionRecords || []).slice(0, 8).map(entry => ({
        record_id: sanitizeText(entry.record_id, 120),
        event_id: sanitizeText(entry.event_id, 40),
        event_label: sanitizeText(entry.event_label, 40),
        season: sanitizeText(entry.season, 20),
        season_label: sanitizeText(entry.season_label, 20),
        cycle_key: sanitizeText(entry.cycle_key, 40),
        contribution_value: clampPositiveInt(entry.contribution_value, 0),
        reward_money: clampPositiveInt(entry.reward_money, 0),
        reward_summary: sanitizeText(entry.reward_summary, 160),
        badge_label: sanitizeText(entry.badge_label, 40),
        rank: clampPositiveInt(entry.rank, 0),
        completed_at: clampPositiveInt(entry.completed_at, 0),
      })),
      seasonal_badges: Object.entries(state.seasonalBadges || {}).map(([eventId, value]) => ({
        event_id: sanitizeText(eventId, 40),
        label: sanitizeText(value?.label, 40),
        cycle_key: sanitizeText(value?.cycle_key, 40),
        rank: clampPositiveInt(value?.rank, 0),
        awarded_at: clampPositiveInt(value?.awarded_at, 0),
      })).sort((left, right) => right.awarded_at - left.awarded_at),
    };
  } catch {
    return {
      total_contribution_points: 0,
      my_records: [],
      seasonal_badges: [],
    };
  }
}

function buildOverview(store, viewerUsername) {
  ensureWorldEventStore(store);
  const viewerRecords = loadViewerWorldEventRecords(viewerUsername);
  const scopedEvents = ensureScopedEventsForViewer(store, viewerUsername);
  const eventSnapshots = (store.seasonal_events || []).map(normalizeEvent).map(event => buildEventSnapshot(store, event, viewerUsername));
  const scopedSnapshots = scopedEvents.map(event => buildEventSnapshot(store, event, viewerUsername));
  const currentEvent = eventSnapshots.find(event => event.is_current_season) || null;
  const currentScopedEvents = scopedSnapshots.filter(event => event.can_contribute);
  return {
    bulletin: '四季大事件与世界事件当前统一运行在 world-event runtime：季节大事件继续负责年度主线，L91 再补全全服、分区、邻里、村社、限时与异象事件。',
    current_season: sanitizeText(store.current_season, 20),
    current_season_label: SEASON_LABELS[store.current_season] || store.current_season,
    current_cycle_key: sanitizeText(store.current_cycle_key, 40),
    current_event: currentEvent,
    events: eventSnapshots,
    world_events: scopedSnapshots,
    current_world_events: currentScopedEvents,
    recent_annals: (store.annals || []).map(normalizeAnnal).sort((left, right) => right.completed_at - left.completed_at).slice(0, 6),
    total_contribution_points: viewerRecords.total_contribution_points,
    my_records: viewerRecords.my_records,
    seasonal_badges: viewerRecords.seasonal_badges,
  };
}

function ensureEventForContribution(store, eventId, viewerUsername) {
  ensureScopedEventsForViewer(store, viewerUsername);
  const normalizedEventId = sanitizeText(eventId, 80);
  const event = (store.seasonal_events || []).map(normalizeEvent).find(entry => entry.id === normalizedEventId)
    || (store.scope_events || []).map(normalizeScopeEvent).find(entry => entry.id === normalizedEventId);
  if (!event) throw createError('四季大事件不存在', 404);
  if (event.state !== 'active') throw createError(buildContributionLockedReason(event) || '当前四季大事件暂不可推进');
  return event;
}

async function listWorldEventOverview(username) {
  const normalizedUsername = sanitizeText(username, 40);
  if (!normalizedUsername) throw createError('请先登录后再查看四季大事件', 401);
  const store = loadStore();
  const overview = buildOverview(store, normalizedUsername);
  saveStore(store);
  return overview;
}

async function contributeWorldEvent(eventId, payload = {}, actor = {}) {
  const username = sanitizeText(actor.username, 40);
  const displayName = sanitizeText(actor.displayName, 40) || username;
  if (!username) throw createError('未登录账号不能参与四季大事件', 401);

  const store = loadStore();
  ensureWorldEventStore(store);
  const event = ensureEventForContribution(store, eventId, username);
  const action = getEventAction(event.id, payload.action_id);
  if (!action) throw createError('当前贡献动作不存在');

  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，暂时无法参与四季大事件');
  context.username = username;
  const currentMoney = Math.max(0, Math.floor(Number(context.data?.player?.money) || 0));
  if (currentMoney < action.cost_money) {
    throw createError('当前存档里的铜钱不足，暂时无法提交这份季节贡献');
  }
  context.data.player.money = currentMoney - action.cost_money;
  persistGameplayData(context);

  const contributor = ensureParticipant(event, username, displayName);
  contributor.progress_value += action.progress_delta;
  contributor.action_count += 1;
  contributor.last_action_id = action.id;
  contributor.last_action_label = action.label;
  contributor.last_action_at = nowSeconds();
  event.progress = Math.min(getEventDefinition(event.definition_id || event.id).target_progress, event.progress + action.progress_delta);
  event.updated_at = nowSeconds();
  pushEventLog(event, {
    id: makeId('world_event_log'),
    username,
    display_name: displayName,
    action_id: action.id,
    action_label: action.label,
    progress_delta: action.progress_delta,
    summary: `${displayName}提交了「${action.label}」，推进 ${action.progress_delta} 点${getEventDefinition(event.definition_id || event.id).objective_label}。`,
    created_at: nowSeconds(),
  });

  finalizeEventIfNeeded(store, event);
  if (event.scope) replaceScopeEvent(store, event);
  else replaceEvent(store, event);
  saveStore(store);

  return {
    event: buildEventSnapshot(store, event, username),
    overview: buildOverview(store, username),
  };
}

module.exports = {
  listWorldEventOverview,
  contributeWorldEvent,
};
