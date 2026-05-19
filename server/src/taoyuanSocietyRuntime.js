const fs = require('fs');
const path = require('path');
const db = require('./db');
const {
  createError,
  getActiveSaveContext,
  persistGameplayData,
  saveUserSaveSlots,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SOCIETY_FILE = path.join(DATA_DIR, 'taoyuan_societies.json');
const ITEM_MAX_STACK = 999;
const TEMP_BAG_CAPACITY = 10;

const SOCIETY_ROLE_LABELS = Object.freeze({
  president: '社长',
  steward: '管事',
  buyer: '采办',
  treasurer: '账房',
  scribe: '记录人',
  member: '普通成员',
});

const SOCIETY_ASSIGNABLE_ROLES = Object.freeze(['steward', 'buyer', 'treasurer', 'scribe', 'member']);
const SOCIETY_MANAGER_ROLES = Object.freeze(['president', 'steward']);
const SOCIETY_NOTICE_EDITOR_ROLES = Object.freeze(['president', 'steward', 'scribe']);
const SOCIETY_PROPOSAL_CLOSER_ROLES = Object.freeze(['president', 'steward', 'scribe']);

const SOCIETY_VISIBILITY_OPTIONS = Object.freeze([
  { id: 'public', label: '公开', summary: '任何玩家都能看到村社卡片与基础信息。' },
  { id: 'semi_public', label: '半公开', summary: '公开展示基础信息，但后续入社仍需要进一步审核。' },
  { id: 'private', label: '私密', summary: '只对内部成员可见，暂不进入公开村社列表。' },
]);

const SOCIETY_THEME_OPTIONS = Object.freeze([
  { id: 'harvest_union', label: '农桑共耕', summary: '偏向种植、仓储与季节备货。' },
  { id: 'festival_hosts', label: '节会主办', summary: '偏向节庆组织、礼仪布置与活动承接。' },
  { id: 'craft_collective', label: '匠作共坊', summary: '偏向工坊、加工与物资周转。' },
  { id: 'trade_circle', label: '行商互济', summary: '偏向交换、慢交易与后勤调度。' },
  { id: 'expedition_camp', label: '远行筹备', summary: '偏向探索、远征与协作补给。' },
  { id: 'archive_hall', label: '史册同修', summary: '偏向纪念、典藏与世界记录。' },
]);

const SOCIETY_EMBLEM_OPTIONS = Object.freeze([
  { id: 'plum_seal', label: '梅印' },
  { id: 'crane_banner', label: '鹤旗' },
  { id: 'grain_knot', label: '禾结' },
  { id: 'brook_mark', label: '溪纹' },
  { id: 'mountain_badge', label: '山徽' },
  { id: 'lantern_medallion', label: '灯章' },
]);

const SOCIETY_CAPACITY_OPTIONS = Object.freeze([
  { value: 12, label: '小型村社（6-12 人）' },
  { value: 24, label: '中型村社（12-24 人）' },
  { value: 48, label: '大型村社（24-48 人）' },
]);

const SOCIETY_JOIN_REQUIREMENT_OPTIONS = Object.freeze([
  { id: 'open', label: '来者皆可', summary: '当前先按公开招募口径展示，后续可进一步审核。' },
  { id: 'friends_recommended', label: '好友推荐优先', summary: '优先欢迎已有好友链或熟人推荐的玩家。' },
  { id: 'neighbor_recommended', label: '邻里互荐优先', summary: '优先吸收已有邻里协作痕迹的玩家。' },
  { id: 'invite_only', label: '仅邀请加入', summary: '当前只接受社内主动发出的邀请。' },
  { id: 'seasoned_farmer', label: '经营进度达标', summary: '建议申请者已经有稳定经营进度与公开档案。' },
]);

const SOCIETY_PROPOSAL_KIND_OPTIONS = Object.freeze([
  { id: 'governance', label: '社务治理', summary: '围绕社内规则、角色安排和治理方式发起提案。' },
  { id: 'festival', label: '节会安排', summary: '围绕节会房间、排班和节庆筹备发起提案。' },
  { id: 'construction', label: '共建筹备', summary: '围绕公共建设、集体物资和工程优先级发起提案。' },
  { id: 'welfare', label: '成员福利', summary: '围绕社内奖励、补给和共享权益发起提案。' },
  { id: 'notice', label: '日常议题', summary: '围绕日常运营、协作节奏和临时决策发起提案。' },
]);

const SOCIETY_PROPOSAL_CHOICE_OPTIONS = Object.freeze([
  { id: 'support', label: '赞成' },
  { id: 'reject', label: '反对' },
  { id: 'abstain', label: '暂缓' },
]);

const SOCIETY_PROPOSAL_RESULT_LABELS = Object.freeze({
  support: '已通过',
  reject: '未通过',
  abstain: '暂缓处理',
  tie: '票数相持',
  pending: '待结论',
});

const SOCIETY_RESOURCE_LABELS = Object.freeze({
  wood: '木材',
  stone: '石料',
  paper: '纸张',
  herb: '草药',
  firewood: '柴火',
  bamboo: '竹材',
  wintersweet: '腊梅',
});

const SOCIETY_LEVEL_TITLES = Object.freeze([
  '初立社',
  '共建社',
  '互济社',
  '兴盛社',
  '匠作社',
  '书院社',
  '祠堂社',
  '荣誉社',
]);

const SOCIETY_WELFARE_DEFS = Object.freeze([
  { id: 'notice_boost', label: '公告栏常驻', summary: '村社公告与提案在成员页里更醒目。', unlock_level: 1 },
  { id: 'public_warehouse', label: '公共仓库', summary: '开放公共仓库，用于储备共建与节会物资。', unlock_level: 1 },
  { id: 'festival_priority', label: '专属节会优先', summary: '后续专属节会会优先向高等级村社开放。', unlock_level: 3 },
  { id: 'decor_slot', label: '专属装饰位', summary: '后续可挂载村社专属装饰和徽记展示位。', unlock_level: 4 },
  { id: 'task_board', label: '专属任务板', summary: '后续会开放更聚焦村社目标的专属任务。', unlock_level: 5 },
  { id: 'archive_hall', label: '村社史册', summary: '后续可沉淀村社里程碑与公共记忆。', unlock_level: 6 },
]);

const SOCIETY_PUBLIC_WAREHOUSE_DEPOSIT_OPTIONS = Object.freeze([
  {
    id: 'wood_crate',
    label: '木料入仓',
    summary: '交 1 份木材和少量工钱，补入公共仓。',
    costs: [
      { type: 'item', item_id: 'wood', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 5 },
    ],
    rewards: [{ type: 'item', item_id: 'wood', quantity: 1, quality: 'normal' }],
  },
  {
    id: 'stone_crate',
    label: '石料入仓',
    summary: '交 1 份石料和少量工钱，补入公共仓。',
    costs: [
      { type: 'item', item_id: 'stone', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 5 },
    ],
    rewards: [{ type: 'item', item_id: 'stone', quantity: 1, quality: 'normal' }],
  },
  {
    id: 'paper_crate',
    label: '纸张入仓',
    summary: '交 1 份纸张和少量工钱，补入公共仓。',
    costs: [
      { type: 'item', item_id: 'paper', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 5 },
    ],
    rewards: [{ type: 'item', item_id: 'paper', quantity: 1, quality: 'normal' }],
  },
  {
    id: 'herb_crate',
    label: '草药入仓',
    summary: '交 1 份草药和少量工钱，补入公共仓。',
    costs: [
      { type: 'item', item_id: 'herb', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 5 },
    ],
    rewards: [{ type: 'item', item_id: 'herb', quantity: 1, quality: 'normal' }],
  },
  {
    id: 'fund_crate',
    label: '公用经费',
    summary: '直接补入公共仓经费，不占物资格位。',
    costs: [{ type: 'money', amount: 20 }],
    rewards: [{ type: 'money', amount: 20 }],
  },
]);

const SOCIETY_PUBLIC_WAREHOUSE_DEPOSIT_MAP = Object.freeze(
  Object.fromEntries(SOCIETY_PUBLIC_WAREHOUSE_DEPOSIT_OPTIONS.map(entry => [entry.id, entry]))
);

const SOCIETY_THEME_FESTIVAL_DEFS = Object.freeze({
  harvest_union: {
    id: 'harvest_society_fair',
    label: '丰收社宴',
    summary: '围绕收成、仓储与互济展开的村社专属节会，适合在秋收与备货阶段召集成员。 ',
    perk_summary: '更偏向收成展示、备货协作和村社公共仓联动。',
    unlock_level: 1,
  },
  festival_hosts: {
    id: 'lantern_hosts_night',
    label: '灯街主办夜',
    summary: '由节会主办型村社承接的夜间灯会，强调布置、接待和巡游秩序。',
    perk_summary: '更偏向灯街、公告、值守与节庆组织协作。',
    unlock_level: 1,
  },
  craft_collective: {
    id: 'craft_trials',
    label: '百工试艺会',
    summary: '以工坊与手作展示为主的村社节会，适合串联加工、搭建与公共工程展示。',
    perk_summary: '更偏向工坊产出、建设展示与集体协作。',
    unlock_level: 1,
  },
  trade_circle: {
    id: 'market_caravan_day',
    label: '行商集市日',
    summary: '以慢交易、摊位轮换和补给接驳为核心的村社节会，适合围绕集市展开。',
    perk_summary: '更偏向集市、寄售、补给与公共仓调度。',
    unlock_level: 1,
  },
  expedition_camp: {
    id: 'expedition_oath',
    label: '远行誓师会',
    summary: '为远行筹备型村社准备的出发仪式与补给集会，强调人员协同与物资整备。',
    perk_summary: '更偏向补给、分工、仓位与协作节奏。',
    unlock_level: 1,
  },
  archive_hall: {
    id: 'archive_memorial',
    label: '祠堂记事会',
    summary: '围绕纪念、史册与典礼展开的村社节会，适合把长期贡献沉成公共记忆。',
    perk_summary: '更偏向史册、祠堂、纪念与展示。',
    unlock_level: 1,
  },
});

const SOCIETY_THEME_DECOR_DEFS = Object.freeze({
  harvest_union: [
    { id: 'harvest_banner', label: '谷纹旗幡', summary: '把村社主题定在仓储、丰收与互济的入口旗幡。', unlock_level: 1 },
    { id: 'granary_screen', label: '谷仓屏风', summary: '适合放在公共仓或议事区的仓储主题屏风。', unlock_level: 3 },
  ],
  festival_hosts: [
    { id: 'lantern_canopy', label: '灯幕门匾', summary: '为节会主办型村社准备的夜灯门匾与迎客灯幕。', unlock_level: 1 },
    { id: 'procession_arch', label: '巡游拱门', summary: '完成灯街与夜间活动后可承接的节会拱门。', unlock_level: 3 },
  ],
  craft_collective: [
    { id: 'craft_rack', label: '百工置物架', summary: '展示工坊成品和共建样品的公共置物架。', unlock_level: 1 },
    { id: 'forge_plaque', label: '匠作铭牌', summary: '为工坊与公共工程完成后准备的匠作铭牌。', unlock_level: 3 },
  ],
  trade_circle: [
    { id: 'market_sign', label: '行商招牌', summary: '适合挂在集市与慢交易入口的行商招牌。', unlock_level: 1 },
    { id: 'ledger_wall', label: '账簿展墙', summary: '把交易流水和供货关系沉成可展示的账簿展墙。', unlock_level: 3 },
  ],
  expedition_camp: [
    { id: 'route_banner', label: '远行路旗', summary: '适合挂在补给点与誓师区的路线旗标。', unlock_level: 1 },
    { id: 'supply_crate_set', label: '补给木箱组', summary: '为远行整备和多人成行准备的木箱装饰组。', unlock_level: 3 },
  ],
  archive_hall: [
    { id: 'memorial_scroll', label: '史册卷轴', summary: '用来展示村社纪事与公共记忆的卷轴。', unlock_level: 1 },
    { id: 'ancestral_tablet', label: '祠堂铭牌', summary: '为祠堂与纪念空间准备的长期展示铭牌。', unlock_level: 3 },
  ],
});

const SOCIETY_PUBLIC_PROJECT_DEFS = Object.freeze([
  {
    id: 'bridge',
    label: '修桥',
    summary: '先把溪桥修稳，让成员、访客和运货路线都能安全过河。',
    target_progress: 100,
    completion_feedback: '溪桥已经修稳，村社往来不再总被河道绊住脚。',
    world_feedback: '公共讨论里会更频繁提到桥头会面、过河送货和联机往来更顺。',
  },
  {
    id: 'dock',
    label: '修码头',
    summary: '整修旧码头，给后续慢交易、远行补给和访客接待留出落点。',
    target_progress: 100,
    completion_feedback: '码头修缮完成，搬运、交接和远行筹备终于有了稳定落脚处。',
    world_feedback: '活动和物流描述会更多提到船只、栈板、装货与临水往返的场景。',
  },
  {
    id: 'market',
    label: '建集市',
    summary: '把分散摊点整理成稳定集市，给村社慢交易和节会摆摊留出中心区域。',
    target_progress: 100,
    completion_feedback: '集市已经立起来，村社终于有了对外展示和内部周转的公共舞台。',
    world_feedback: '村社公告、交易与节会筹备文案会更自然地出现“集市”这层空间反馈。',
  },
  {
    id: 'academy',
    label: '建书院',
    summary: '整理文书、账册和讲学空间，让提案、记录与知识传承有一处固定落点。',
    target_progress: 100,
    completion_feedback: '书院建成后，村社的公告、记录和议事终于不再像临时拼桌。',
    world_feedback: '更多治理、学舍和典藏语境会被写进村社共治层的叙述里。',
  },
  {
    id: 'lantern_street',
    label: '修灯街',
    summary: '把夜路照亮，给节会巡游、夜间互访和公共展示留出更体面的街面。',
    target_progress: 100,
    completion_feedback: '灯街亮起来后，夜间节会和访客动线终于有了明显的公共氛围。',
    world_feedback: '节会、公告和公开村社描述会更常提到夜灯、街景和巡游路径。',
  },
  {
    id: 'warehouse',
    label: '扩仓库',
    summary: '把公共备货空间扩出来，让后续共建、节会和物资周转有稳定缓冲。',
    target_progress: 100,
    completion_feedback: '仓库扩建完成后，村社在备货、调度和临时周转上终于没那么捉襟见肘。',
    world_feedback: '更多共建和筹备反馈会出现“仓位更稳”“备货更从容”的公共感知。',
  },
  {
    id: 'hot_spring',
    label: '修温泉',
    summary: '把旧泉重新引流修缮，给高强度联机协作之后留一处真正能歇口气的地方。',
    target_progress: 100,
    completion_feedback: '温泉修复后，村社终于不只是忙着干活，也开始拥有真正可回去歇息的公共角落。',
    world_feedback: '更多生活层和节奏型反馈会提到恢复、休养与温泉一带的放松氛围。',
  },
  {
    id: 'ancestral_hall',
    label: '建祠堂',
    summary: '把村社纪念、典礼和长期记忆沉下来，给后续史册与荣誉系统留出承接位。',
    target_progress: 100,
    completion_feedback: '祠堂立起来后，村社终于开始像一个会记事、会传承、会纪念彼此的共同体。',
    world_feedback: '后续历史、纪念和荣誉叙述会更自然地围绕祠堂与典礼空间展开。',
  },
]);

const SOCIETY_PUBLIC_PROJECT_DEF_MAP = Object.freeze(
  Object.fromEntries(SOCIETY_PUBLIC_PROJECT_DEFS.map(entry => [entry.id, entry]))
);

const SOCIETY_PROJECT_PACKAGE_OPTIONS = Object.freeze([
  {
    id: 'survey_fund',
    label: '筹备工钱',
    summary: '先垫一笔工钱，让工程队和杂项采买继续往前走。',
    progress_gain: 10,
    costs: [{ type: 'money', amount: 30 }],
  },
  {
    id: 'wood_bundle',
    label: '木料捐献',
    summary: '交 1 份木材和少量工钱，推进主体搭建与围挡修补。',
    progress_gain: 30,
    costs: [
      { type: 'item', item_id: 'wood', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 20 },
    ],
  },
  {
    id: 'stone_bundle',
    label: '石料捐献',
    summary: '交 2 份石料和少量工钱，推进地基、铺面和稳固部分。',
    progress_gain: 35,
    costs: [
      { type: 'item', item_id: 'stone', quantity: 2, quality: 'normal' },
      { type: 'money', amount: 20 },
    ],
  },
  {
    id: 'planning_bundle',
    label: '图纸文书',
    summary: '交 1 份纸张和少量工钱，推进图纸、账册和公共规划。',
    progress_gain: 15,
    costs: [
      { type: 'item', item_id: 'paper', quantity: 1, quality: 'normal' },
      { type: 'money', amount: 15 },
    ],
  },
]);

const SOCIETY_PROJECT_PACKAGE_MAP = Object.freeze(
  Object.fromEntries(SOCIETY_PROJECT_PACKAGE_OPTIONS.map(entry => [entry.id, entry]))
);

function createEmptySocietyStore() {
  return {
    societies: [],
    society_join_requests: [],
  };
}

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeUsername(value) {
  return String(value || '').normalize('NFKC').trim();
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSocietyStoreDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_SOCIETY_FILE), { recursive: true });
}

function normalizeSocietyVisibility(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'private') return 'private';
  if (normalized === 'semi_public') return 'semi_public';
  return 'public';
}

function normalizeSocietyRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return SOCIETY_ROLE_LABELS[normalized] ? normalized : 'member';
}

function normalizeSocietyTheme(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_THEME_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_THEME_OPTIONS[0].id;
}

function normalizeSocietyEmblem(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_EMBLEM_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_EMBLEM_OPTIONS[0].id;
}

function normalizeSocietyCapacity(value) {
  const numeric = Math.max(6, Math.floor(Number(value) || SOCIETY_CAPACITY_OPTIONS[1].value));
  return SOCIETY_CAPACITY_OPTIONS.find(entry => entry.value === numeric)?.value || SOCIETY_CAPACITY_OPTIONS[1].value;
}

function normalizeJoinRequirementId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_JOIN_REQUIREMENT_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_JOIN_REQUIREMENT_OPTIONS[0].id;
}

function normalizeProposalKindId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_PROPOSAL_KIND_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_PROPOSAL_KIND_OPTIONS[0].id;
}

function normalizeProposalChoiceId(value) {
  const normalized = String(value || '').trim();
  return SOCIETY_PROPOSAL_CHOICE_OPTIONS.find(entry => entry.id === normalized)?.id || SOCIETY_PROPOSAL_CHOICE_OPTIONS[0].id;
}

function normalizeProposalResultChoice(value) {
  const normalized = String(value || '').trim();
  return ['support', 'reject', 'abstain', 'tie', 'pending'].includes(normalized) ? normalized : 'pending';
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function normalizeQuality(value) {
  return ['normal', 'fine', 'excellent', 'supreme'].includes(String(value)) ? String(value) : 'normal';
}

function normalizeBundleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const type = String(entry.type || '').trim();
  if (type === 'money') {
    const amount = clampPositiveInt(entry.amount, 0);
    if (amount <= 0) return null;
    return { type: 'money', amount };
  }
  if (type === 'item') {
    const itemId = String(entry.item_id || '').trim();
    const quantity = clampPositiveInt(entry.quantity, 0);
    if (!itemId || quantity <= 0) return null;
    return {
      type: 'item',
      item_id: itemId,
      quantity,
      quality: normalizeQuality(entry.quality),
    };
  }
  return null;
}

function normalizeActivityEntry(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_log'), 80),
    type: sanitizeText(entry?.type, 24) || 'activity',
    message: sanitizeText(entry?.message, 120),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyMember(entry) {
  return {
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    role: normalizeSocietyRole(entry?.role),
    joined_at: Math.max(0, Math.floor(Number(entry?.joined_at) || nowSeconds())),
  };
}

function normalizeSocietyJoinRequest(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_join'), 80),
    society_id: sanitizeText(entry?.society_id, 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    invited_by: normalizeUsername(entry?.invited_by),
    invited_by_display_name: sanitizeText(entry?.invited_by_display_name, 40),
    type: entry?.type === 'invite' ? 'invite' : 'apply',
    status: ['pending', 'accepted', 'rejected'].includes(String(entry?.status)) ? String(entry.status) : 'pending',
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyProposalVote(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_vote'), 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    choice: normalizeProposalChoiceId(entry?.choice),
    voted_at: Math.max(0, Math.floor(Number(entry?.voted_at) || nowSeconds())),
  };
}

function normalizeSocietyProposal(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_proposal'), 80),
    title: sanitizeText(entry?.title, 40),
    summary: sanitizeText(entry?.summary, 160),
    kind: normalizeProposalKindId(entry?.kind),
    status: entry?.status === 'closed' ? 'closed' : 'open',
    created_by: normalizeUsername(entry?.created_by),
    created_by_display_name: sanitizeText(entry?.created_by_display_name, 40),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
    closed_at: Math.max(0, Math.floor(Number(entry?.closed_at) || 0)),
    result_choice: normalizeProposalResultChoice(entry?.result_choice),
    resolution_note: sanitizeText(entry?.resolution_note, 120),
    votes: Array.isArray(entry?.votes)
      ? entry.votes.map(normalizeSocietyProposalVote).filter(vote => vote.username).slice(0, 200)
      : [],
  };
}

function normalizeSocietyPublicProjectContribution(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_project_contribution'), 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    package_id: sanitizeText(entry?.package_id, 40),
    package_label: sanitizeText(entry?.package_label, 40),
    progress_gain: Math.max(0, Math.floor(Number(entry?.progress_gain) || 0)),
    costs: Array.isArray(entry?.costs) ? entry.costs.map(normalizeBundleEntry).filter(Boolean).slice(0, 8) : [],
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyPublicProject(entry) {
  const def = SOCIETY_PUBLIC_PROJECT_DEF_MAP[String(entry?.id || '').trim()] || SOCIETY_PUBLIC_PROJECT_DEFS[0];
  return {
    id: def.id,
    status: entry?.status === 'completed' ? 'completed' : 'active',
    progress: Math.max(0, Math.floor(Number(entry?.progress) || 0)),
    target_progress: Math.max(1, Math.floor(Number(entry?.target_progress) || def.target_progress || 100)),
    completed_at: Math.max(0, Math.floor(Number(entry?.completed_at) || 0)),
    completed_by: normalizeUsername(entry?.completed_by),
    completed_by_display_name: sanitizeText(entry?.completed_by_display_name, 40),
    progress_note: sanitizeText(entry?.progress_note, 120),
    world_feedback: sanitizeText(entry?.world_feedback, 160) || def.world_feedback,
    completion_feedback: sanitizeText(entry?.completion_feedback, 160) || def.completion_feedback,
    contributions: Array.isArray(entry?.contributions)
      ? entry.contributions.map(normalizeSocietyPublicProjectContribution).filter(item => item.id).slice(0, 60)
      : [],
  };
}

function normalizeSocietyWarehouseEntry(entry) {
  const normalized = normalizeBundleEntry(entry);
  if (!normalized) return null;
  if (normalized.type === 'money') {
    return {
      type: 'money',
      amount: normalized.amount,
      label: `${normalized.amount} 铜钱`,
    };
  }
  return {
    type: 'item',
    item_id: normalized.item_id,
    quantity: normalized.quantity,
    quality: normalized.quality,
    label: `${normalized.quantity} 份${SOCIETY_RESOURCE_LABELS[normalized.item_id] || normalized.item_id}`,
  };
}

function normalizeSocietyWarehouseLogEntry(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society_warehouse_log'), 80),
    username: normalizeUsername(entry?.username),
    display_name: sanitizeText(entry?.display_name, 40),
    deposit_id: sanitizeText(entry?.deposit_id, 40),
    deposit_label: sanitizeText(entry?.deposit_label, 40),
    entries: Array.isArray(entry?.entries)
      ? entry.entries.map(normalizeSocietyWarehouseEntry).filter(Boolean).slice(0, 8)
      : [],
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
  };
}

function normalizeSocietyWarehouseState(entry) {
  const rawItems = entry?.items && typeof entry.items === 'object' ? entry.items : {};
  const normalizedItems = {};
  for (const [itemId, quantity] of Object.entries(rawItems)) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    if (safeQuantity > 0) normalizedItems[String(itemId)] = safeQuantity;
  }
  return {
    funds: Math.max(0, Math.floor(Number(entry?.funds) || 0)),
    items: normalizedItems,
    logs: Array.isArray(entry?.logs)
      ? entry.logs.map(normalizeSocietyWarehouseLogEntry).filter(item => item.id).slice(0, 40)
      : [],
  };
}

function normalizeSociety(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society'), 80),
    name: sanitizeText(entry?.name, 24),
    summary: sanitizeText(entry?.summary, 120),
    notice: sanitizeText(entry?.notice, 160),
    emblem: normalizeSocietyEmblem(entry?.emblem),
    theme: normalizeSocietyTheme(entry?.theme),
    visibility: normalizeSocietyVisibility(entry?.visibility),
    capacity: normalizeSocietyCapacity(entry?.capacity),
    join_requirement_id: normalizeJoinRequirementId(entry?.join_requirement_id),
    join_requirement_note: sanitizeText(entry?.join_requirement_note, 80),
    created_by: normalizeUsername(entry?.created_by),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
    level: Math.max(1, Math.floor(Number(entry?.level) || 1)),
    welfare_xp: Math.max(0, Math.floor(Number(entry?.welfare_xp) || 0)),
    members: Array.isArray(entry?.members)
      ? entry.members.map(normalizeSocietyMember).filter(member => member.username)
      : [],
    activity_log: Array.isArray(entry?.activity_log)
      ? entry.activity_log.map(normalizeActivityEntry).filter(item => item.message).slice(0, 20)
      : [],
    proposals: Array.isArray(entry?.proposals)
      ? entry.proposals.map(normalizeSocietyProposal).filter(proposal => proposal.title).slice(0, 60)
      : [],
    public_projects: Array.isArray(entry?.public_projects)
      ? entry.public_projects.map(normalizeSocietyPublicProject).filter(project => project.id).slice(0, SOCIETY_PUBLIC_PROJECT_DEFS.length)
      : [],
    public_warehouse: normalizeSocietyWarehouseState(entry?.public_warehouse),
  };
}

function createDefaultPublicProjectState(projectId) {
  const def = SOCIETY_PUBLIC_PROJECT_DEF_MAP[projectId] || SOCIETY_PUBLIC_PROJECT_DEFS[0];
  return normalizeSocietyPublicProject({
    id: def.id,
    status: 'active',
    progress: 0,
    target_progress: def.target_progress,
    completed_at: 0,
    completed_by: '',
    completed_by_display_name: '',
    progress_note: '',
    world_feedback: def.world_feedback,
    completion_feedback: def.completion_feedback,
    contributions: [],
  });
}

function ensureSocietyPublicProjects(society) {
  const existing = new Map((society.public_projects || []).map(project => [normalizeSocietyPublicProject(project).id, normalizeSocietyPublicProject(project)]));
  society.public_projects = SOCIETY_PUBLIC_PROJECT_DEFS.map(def => existing.get(def.id) || createDefaultPublicProjectState(def.id));
  return society.public_projects;
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
  if (!Number.isInteger(Number(saveData.inventory.capacity))) saveData.inventory.capacity = 24;
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  if (!Number.isFinite(Number(saveData.player.money))) saveData.player.money = 0;
}

function cloneInventorySlots(source) {
  return (source || []).map(slot => ({
    itemId: String(slot.itemId || ''),
    quality: normalizeQuality(slot.quality),
    quantity: clampPositiveInt(slot.quantity, 0),
    locked: !!slot.locked,
  })).filter(slot => slot.itemId && slot.quantity > 0);
}

function removeStackableItemFromSlots(slots, itemId, quantity, quality) {
  let remaining = quantity;
  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    const slot = slots[index];
    if (!slot || slot.itemId !== itemId || normalizeQuality(slot.quality) !== quality) continue;
    const slotQuantity = clampPositiveInt(slot.quantity, 0);
    const take = Math.min(remaining, slotQuantity);
    if (take <= 0) continue;
    slot.quantity = slotQuantity - take;
    remaining -= take;
    if (slot.quantity <= 0) {
      slots.splice(index, 1);
      index -= 1;
    }
  }
  return remaining <= 0;
}

function countStackableItemAnywhere(saveData, itemId, quality) {
  ensureInventoryState(saveData);
  return [...saveData.inventory.items, ...saveData.inventory.tempItems]
    .filter(slot => slot.itemId === itemId && (!quality || normalizeQuality(slot.quality) === quality))
    .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0);
}

function removeStackableItemAnywhere(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const normalizedItemId = String(itemId || '').trim();
  const safeQuantity = clampPositiveInt(quantity, 0);
  if (!normalizedItemId || safeQuantity <= 0) return false;
  if (countStackableItemAnywhere(saveData, normalizedItemId, quality) < safeQuantity) return false;

  let remaining = safeQuantity;
  const qualityOrder = quality ? [quality] : ['normal', 'fine', 'excellent', 'supreme'];
  for (const currentQuality of qualityOrder) {
    if (remaining <= 0) break;
    const tempCount = countStackableItemAnywhere({ inventory: { items: [], tempItems: saveData.inventory.tempItems } }, normalizedItemId, currentQuality);
    const takeFromTemp = Math.min(remaining, tempCount);
    if (takeFromTemp > 0) {
      removeStackableItemFromSlots(saveData.inventory.tempItems, normalizedItemId, takeFromTemp, currentQuality);
      remaining -= takeFromTemp;
    }
    const mainCount = countStackableItemAnywhere({ inventory: { items: saveData.inventory.items, tempItems: [] } }, normalizedItemId, currentQuality);
    const takeFromMain = Math.min(remaining, mainCount);
    if (takeFromMain > 0) {
      removeStackableItemFromSlots(saveData.inventory.items, normalizedItemId, takeFromMain, currentQuality);
      remaining -= takeFromMain;
    }
  }
  return remaining <= 0;
}

function simulateAddToSlots(mainSlots, mainCapacity, tempSlots, tempCapacity, stackableEntries) {
  for (const entry of stackableEntries) {
    let remaining = clampPositiveInt(entry.quantity, 0);
    if (remaining <= 0) continue;
    const quality = normalizeQuality(entry.quality);

    for (const slot of mainSlots) {
      if (remaining <= 0) break;
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue;
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity);
      slot.quantity += canAdd;
      remaining -= canAdd;
    }

    while (remaining > 0 && mainSlots.length < mainCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
      mainSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      });
      remaining -= addQuantity;
    }

    for (const slot of tempSlots) {
      if (remaining <= 0) break;
      if (slot.itemId !== entry.itemId || normalizeQuality(slot.quality) !== quality || slot.quantity >= ITEM_MAX_STACK) continue;
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity);
      slot.quantity += canAdd;
      remaining -= canAdd;
    }

    while (remaining > 0 && tempSlots.length < tempCapacity) {
      const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
      tempSlots.push({
        itemId: entry.itemId,
        quality,
        quantity: addQuantity,
        locked: false,
      });
      remaining -= addQuantity;
    }

    if (remaining > 0) return false;
  }
  return true;
}

function canFitRewardItems(saveData, rewards) {
  ensureInventoryState(saveData);
  const stackableEntries = rewards
    .map(normalizeBundleEntry)
    .filter(entry => entry && entry.type === 'item')
    .map(entry => ({
      itemId: entry.item_id,
      quantity: entry.quantity,
      quality: entry.quality,
    }));
  if (stackableEntries.length === 0) return true;
  return simulateAddToSlots(
    cloneInventorySlots(saveData.inventory.items),
    clampPositiveInt(saveData.inventory.capacity, 24),
    cloneInventorySlots(saveData.inventory.tempItems),
    TEMP_BAG_CAPACITY,
    stackableEntries
  );
}

function addStackableItemToInventory(saveData, itemId, quantity, quality = 'normal') {
  ensureInventoryState(saveData);
  const items = saveData.inventory.items;
  const tempItems = saveData.inventory.tempItems;
  const capacity = clampPositiveInt(saveData.inventory.capacity, 24);
  let remaining = clampPositiveInt(quantity, 0);
  const normalizedQuality = normalizeQuality(quality);

  for (const slot of items) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && items.length < capacity) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
    items.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false });
    remaining -= addQuantity;
  }

  for (const slot of tempItems) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === normalizedQuality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && tempItems.length < TEMP_BAG_CAPACITY) {
    const addQuantity = Math.min(remaining, ITEM_MAX_STACK);
    tempItems.push({ itemId, quantity: addQuantity, quality: normalizedQuality, locked: false });
    remaining -= addQuantity;
  }

  return remaining <= 0;
}

function applyCostsToSave(saveData, costs) {
  ensureInventoryState(saveData);
  for (const rawCost of costs) {
    const cost = normalizeBundleEntry(rawCost);
    if (!cost) continue;
    if (cost.type === 'money') {
      const currentMoney = Math.max(0, Math.floor(Number(saveData.player.money) || 0));
      if (currentMoney < cost.amount) return false;
      saveData.player.money = currentMoney - cost.amount;
      continue;
    }
    const removed = removeStackableItemAnywhere(saveData, cost.item_id, cost.quantity, cost.quality);
    if (!removed) return false;
  }
  return true;
}

function applyRewardsToSave(saveData, rewards) {
  ensureInventoryState(saveData);
  if (!canFitRewardItems(saveData, rewards)) return false;
  for (const rawReward of rewards) {
    const reward = normalizeBundleEntry(rawReward);
    if (!reward) continue;
    if (reward.type === 'money') {
      saveData.player.money = Math.max(0, Math.floor(Number(saveData.player.money) || 0) + reward.amount);
      continue;
    }
    if (!addStackableItemToInventory(saveData, reward.item_id, reward.quantity, reward.quality)) return false;
  }
  return true;
}

function getSocietyLevelThreshold(level) {
  return 100 + Math.max(0, level - 1) * 60;
}

function recalculateSocietyWelfareProgress(society) {
  const completedProjectCount = ensureSocietyPublicProjects(society).filter(entry => normalizeSocietyPublicProject(entry).status === 'completed').length;
  const contributionCount = ensureSocietyPublicProjects(society).reduce((sum, entry) => sum + (normalizeSocietyPublicProject(entry).contributions || []).length, 0);
  const warehouseContributionCount = (getNormalizedSocietyWarehouseState(society).logs || []).length;
  const totalXp = completedProjectCount * 120 + contributionCount * 12 + warehouseContributionCount * 8;
  let level = 1;
  let spentXp = 0;
  while (level < SOCIETY_LEVEL_TITLES.length) {
    const threshold = getSocietyLevelThreshold(level);
    if (totalXp < spentXp + threshold) break;
    spentXp += threshold;
    level += 1;
  }
  society.level = Math.max(1, level);
  society.welfare_xp = Math.max(0, totalXp - spentXp);
  return {
    level: society.level,
    xp: society.welfare_xp,
    xp_to_next_level: society.level >= SOCIETY_LEVEL_TITLES.length ? 0 : Math.max(0, getSocietyLevelThreshold(society.level) - society.welfare_xp),
    total_xp: totalXp,
  };
}

function buildWarehouseLogSnapshot(entry) {
  const normalized = normalizeSocietyWarehouseLogEntry(entry);
  return {
    id: normalized.id,
    username: normalized.username,
    display_name: normalized.display_name || normalized.username,
    deposit_id: normalized.deposit_id,
    deposit_label: normalized.deposit_label,
    entries: normalized.entries.map(cost => ({
      ...cost,
      label: cost.label || (cost.type === 'money'
        ? `${cost.amount} 铜钱`
        : `${cost.quantity} 份${SOCIETY_RESOURCE_LABELS[cost.item_id] || cost.item_id}`),
    })),
    created_at: normalized.created_at,
  };
}

function buildWelfareUnlockSnapshot(level) {
  return SOCIETY_WELFARE_DEFS.map(entry => ({
    id: entry.id,
    label: entry.label,
    summary: entry.summary,
    unlock_level: entry.unlock_level,
    unlocked: level >= entry.unlock_level,
  }));
}

function getNormalizedSocietyWarehouseState(society) {
  return normalizeSocietyWarehouseState(society?.public_warehouse);
}

function buildExclusiveFestivalSnapshot(themeId, level) {
  const def = SOCIETY_THEME_FESTIVAL_DEFS[themeId] || SOCIETY_THEME_FESTIVAL_DEFS.harvest_union;
  return {
    id: def.id,
    label: def.label,
    summary: def.summary.trim(),
    perk_summary: def.perk_summary,
    unlock_level: def.unlock_level,
    unlocked: level >= def.unlock_level,
  };
}

function buildExclusiveDecorSnapshots(themeId, level) {
  const defs = SOCIETY_THEME_DECOR_DEFS[themeId] || SOCIETY_THEME_DECOR_DEFS.harvest_union;
  return defs.map(entry => ({
    id: entry.id,
    label: entry.label,
    summary: entry.summary,
    unlock_level: entry.unlock_level,
    unlocked: level >= entry.unlock_level,
  }));
}

function buildExclusiveTaskSnapshots(society) {
  const themeFestival = SOCIETY_THEME_FESTIVAL_DEFS[society.theme] || SOCIETY_THEME_FESTIVAL_DEFS.harvest_union;
  const completedProjectCount = ensureSocietyPublicProjects(society).filter(entry => normalizeSocietyPublicProject(entry).status === 'completed').length;
  return [
    {
      id: 'weekly_public_stock',
      label: '本周补齐公共仓',
      summary: '继续围绕公共仓补货，让后续共建与节会筹备有稳定缓冲。',
      unlock_level: 2,
      unlocked: society.level >= 2,
      status_label: getNormalizedSocietyWarehouseState(society).logs.length >= 1 ? '进行中' : '待开启',
    },
    {
      id: 'theme_festival_prep',
      label: `筹备「${themeFestival.label}」`,
      summary: '围绕当前村社主题预热专属节会，把公告、物资和参与节奏先收起来。',
      unlock_level: themeFestival.unlock_level,
      unlocked: society.level >= themeFestival.unlock_level,
      status_label: completedProjectCount >= 1 ? '已具备前置' : '先完成一项公共建设',
    },
    {
      id: 'community_relief',
      label: '扶持本周互助产业',
      summary: '结合当前村社主题与共建进度，优先支持一条更适合本社气质的协作线。',
      unlock_level: 3,
      unlocked: society.level >= 3,
      status_label: society.level >= 3 ? '可规划' : '等级不足',
    },
  ];
}

function depositToPublicWarehouse(society, actorUsername, actorDisplayName, depositId) {
  const deposit = SOCIETY_PUBLIC_WAREHOUSE_DEPOSIT_MAP[depositId];
  if (!deposit) throw createError('公共仓入仓方案不存在');
  const context = getActiveSaveContext(actorUsername, null, '当前账号没有可用的桃源服务端存档，暂时无法使用公共仓');
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  ensureInventoryState(projectedData);
  if (!applyCostsToSave(projectedData, deposit.costs)) {
    throw createError('当前存档里的铜钱或材料不足，暂时无法补入公共仓');
  }
  context.data = projectedData;
  if (context.saveContainer && typeof context.saveContainer === 'object') {
    context.saveContainer.gameplayData = projectedData;
    if (context.saveContainer.wrapped && context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root.data = projectedData;
    } else if (context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root = projectedData;
    }
  }
  const warehouse = getNormalizedSocietyWarehouseState(society);
  const logEntry = normalizeSocietyWarehouseLogEntry({
    id: makeId('society_warehouse_log'),
    username: actorUsername,
    display_name: actorDisplayName,
    deposit_id: deposit.id,
    deposit_label: deposit.label,
    entries: deposit.costs,
    created_at: nowSeconds(),
  });
  warehouse.logs = [logEntry, ...warehouse.logs].slice(0, 40);
  for (const rawEntry of deposit.rewards) {
    const entry = normalizeBundleEntry(rawEntry);
    if (!entry) continue;
    if (entry.type === 'money') {
      warehouse.funds += entry.amount;
      continue;
    }
    warehouse.items[entry.item_id] = Math.max(0, Math.floor(Number(warehouse.items[entry.item_id]) || 0)) + entry.quantity;
  }
  society.public_warehouse = warehouse;
  appendSocietyActivity(society, `${actorDisplayName}补入了公共仓「${deposit.label}」`, 'warehouse');
  updateSocietyInStore({ societies: [society], society_join_requests: [] }, society);
  persistGameplayData(context);
  return { deposit, warehouse };
}

function loadSocietyStore() {
  ensureSocietyStoreDir();
  try {
    if (!fs.existsSync(TAOYUAN_SOCIETY_FILE)) return createEmptySocietyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_SOCIETY_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          societies: Array.isArray(raw.societies) ? raw.societies : [],
          society_join_requests: Array.isArray(raw.society_join_requests) ? raw.society_join_requests : [],
        }
      : createEmptySocietyStore();
  } catch {
    return createEmptySocietyStore();
  }
}

function saveSocietyStore(store) {
  ensureSocietyStoreDir();
  writeJsonFileAtomic(TAOYUAN_SOCIETY_FILE, {
    societies: Array.isArray(store?.societies) ? store.societies.map(normalizeSociety) : [],
    society_join_requests: Array.isArray(store?.society_join_requests)
      ? store.society_join_requests.map(normalizeSocietyJoinRequest)
      : [],
  });
}

function findSocietyById(store, societyId) {
  const normalizedId = sanitizeText(societyId, 80);
  return (store.societies || [])
    .map(normalizeSociety)
    .find(entry => entry.id === normalizedId) || null;
}

function findMemberSociety(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return (store.societies || [])
    .map(normalizeSociety)
    .find(entry => entry.members.some(member => member.username === normalizedUsername)) || null;
}

function findPendingSocietyRequest(store, societyId, username) {
  const normalizedSocietyId = sanitizeText(societyId, 80);
  const normalizedUsername = normalizeUsername(username);
  return (store.society_join_requests || [])
    .map(normalizeSocietyJoinRequest)
    .find(entry =>
      entry.society_id === normalizedSocietyId &&
      entry.username === normalizedUsername &&
      entry.status === 'pending'
    ) || null;
}

function hasPendingSocietyRequest(store, societyId, username) {
  return !!findPendingSocietyRequest(store, societyId, username);
}

function appendSocietyActivity(society, message, type = 'activity') {
  society.activity_log = [
    normalizeActivityEntry({
      id: makeId('society_log'),
      type,
      message,
      created_at: nowSeconds(),
    }),
    ...(society.activity_log || []).map(normalizeActivityEntry),
  ].slice(0, 20);
  society.updated_at = nowSeconds();
}

function updateSocietyInStore(store, society) {
  store.societies = (store.societies || []).map(entry => {
    const normalized = normalizeSociety(entry);
    return normalized.id === society.id ? society : normalized;
  });
}

function getSocietyMember(society, username) {
  const normalizedUsername = normalizeUsername(username);
  return (society.members || []).find(entry => entry.username === normalizedUsername) || null;
}

function ensureSocietyMemberRole(society, username, allowedRoles, failureMessage, status = 403) {
  const member = getSocietyMember(society, username);
  if (!member || !allowedRoles.includes(member.role)) {
    throw createError(failureMessage, status);
  }
  return member;
}

function computeProposalResultChoice(proposal) {
  const tally = {
    support: 0,
    reject: 0,
    abstain: 0,
  };
  for (const vote of proposal.votes || []) {
    const choice = normalizeProposalChoiceId(vote.choice);
    tally[choice] += 1;
  }
  if (tally.support > tally.reject) return 'support';
  if (tally.reject > tally.support) return 'reject';
  if (tally.support === 0 && tally.reject === 0) return 'abstain';
  return 'tie';
}

function getProposalStatusLabel(status) {
  return status === 'closed' ? '已归档' : '投票中';
}

function getProposalResultLabel(resultChoice) {
  return SOCIETY_PROPOSAL_RESULT_LABELS[resultChoice] || SOCIETY_PROPOSAL_RESULT_LABELS.pending;
}

async function resolveDisplayName(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return '';
  try {
    const user = await db.getUser(normalizedUsername);
    return sanitizeText(user?.display_name || user?.displayName || normalizedUsername, 40) || normalizedUsername;
  } catch {
    return normalizedUsername;
  }
}

async function ensureTargetUserExists(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) throw createError('目标玩家不存在', 404);
  const user = await db.getUser(normalizedUsername);
  if (!user) throw createError('目标玩家不存在', 404);
  return user;
}

async function hydrateMembers(members = []) {
  return Promise.all((members || []).map(async entry => {
    const normalized = normalizeSocietyMember(entry);
    return {
      ...normalized,
      display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    };
  }));
}

async function buildProposalSnapshot(proposal, viewerUsername, viewerIsMember, viewerCanClose) {
  const normalized = normalizeSocietyProposal(proposal);
  const kindEntry = SOCIETY_PROPOSAL_KIND_OPTIONS.find(entry => entry.id === normalized.kind) || SOCIETY_PROPOSAL_KIND_OPTIONS[0];
  const votes = (normalized.votes || []).map(normalizeSocietyProposalVote);
  const vote_counts = {
    support: votes.filter(entry => entry.choice === 'support').length,
    reject: votes.filter(entry => entry.choice === 'reject').length,
    abstain: votes.filter(entry => entry.choice === 'abstain').length,
  };
  const myVote = votes.find(entry => entry.username === normalizeUsername(viewerUsername)) || null;
  const resultChoice = normalized.status === 'closed' ? normalizeProposalResultChoice(normalized.result_choice || computeProposalResultChoice(normalized)) : 'pending';
  return {
    id: normalized.id,
    title: normalized.title,
    summary: normalized.summary,
    kind: normalized.kind,
    kind_label: kindEntry.label,
    status: normalized.status,
    status_label: getProposalStatusLabel(normalized.status),
    created_by: normalized.created_by,
    created_by_display_name: normalized.created_by_display_name || await resolveDisplayName(normalized.created_by),
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    closed_at: normalized.closed_at,
    vote_counts,
    total_vote_count: vote_counts.support + vote_counts.reject + vote_counts.abstain,
    my_vote_choice: myVote?.choice || '',
    can_vote: viewerIsMember && normalized.status === 'open',
    can_close: viewerCanClose && normalized.status === 'open',
    result_choice: resultChoice,
    result_label: getProposalResultLabel(resultChoice),
    resolution_note: normalized.resolution_note,
    choice_options: SOCIETY_PROPOSAL_CHOICE_OPTIONS,
    votes: votes.map(entry => ({
      username: entry.username,
      display_name: entry.display_name || entry.username,
      choice: entry.choice,
      choice_label: SOCIETY_PROPOSAL_CHOICE_OPTIONS.find(option => option.id === entry.choice)?.label || entry.choice,
      voted_at: entry.voted_at,
    })),
  };
}

function buildPublicProjectPackageSnapshot(entry) {
  return {
    id: entry.id,
    label: entry.label,
    summary: entry.summary,
    progress_gain: entry.progress_gain,
    costs: entry.costs.map(normalizeBundleEntry).filter(Boolean).map(cost => ({
      ...cost,
      label: cost.type === 'money'
        ? `${cost.amount} 铜钱`
        : `${cost.quantity} 份${SOCIETY_RESOURCE_LABELS[cost.item_id] || cost.item_id}`,
    })),
  };
}

async function buildPublicProjectContributionSnapshot(entry) {
  const normalized = normalizeSocietyPublicProjectContribution(entry);
  return {
    id: normalized.id,
    username: normalized.username,
    display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    package_id: normalized.package_id,
    package_label: normalized.package_label,
    progress_gain: normalized.progress_gain,
    costs: normalized.costs.map(cost => ({
      ...cost,
      label: cost.type === 'money'
        ? `${cost.amount} 铜钱`
        : `${cost.quantity} 份${SOCIETY_RESOURCE_LABELS[cost.item_id] || cost.item_id}`,
    })),
    created_at: normalized.created_at,
  };
}

async function buildPublicProjectSnapshot(project, viewerUsername, viewerCanContribute) {
  const normalized = normalizeSocietyPublicProject(project);
  const def = SOCIETY_PUBLIC_PROJECT_DEF_MAP[normalized.id] || SOCIETY_PUBLIC_PROJECT_DEFS[0];
  const contributions = (normalized.contributions || [])
    .map(normalizeSocietyPublicProjectContribution)
    .sort((left, right) => right.created_at - left.created_at);
  const myContributionCount = contributions.filter(entry => entry.username === normalizeUsername(viewerUsername)).length;
  return {
    id: def.id,
    label: def.label,
    summary: def.summary,
    status: normalized.status,
    status_label: normalized.status === 'completed' ? '已完工' : '建设中',
    progress: normalized.progress,
    target_progress: normalized.target_progress,
    progress_percent: Math.max(0, Math.min(100, Math.floor((normalized.progress / Math.max(1, normalized.target_progress)) * 100))),
    remaining_progress: Math.max(0, normalized.target_progress - normalized.progress),
    completed_at: normalized.completed_at,
    completed_by: normalized.completed_by,
    completed_by_display_name: normalized.completed_by_display_name || await resolveDisplayName(normalized.completed_by),
    progress_note: normalized.progress_note || (normalized.status === 'completed' ? normalized.completion_feedback : `距离完工还差 ${Math.max(0, normalized.target_progress - normalized.progress)} 点进度。`),
    completion_feedback: normalized.completion_feedback || def.completion_feedback,
    world_feedback: normalized.world_feedback || def.world_feedback,
    can_contribute: viewerCanContribute && normalized.status !== 'completed',
    my_contribution_count: myContributionCount,
    contribution_packages: SOCIETY_PROJECT_PACKAGE_OPTIONS.map(buildPublicProjectPackageSnapshot),
    recent_contributions: await Promise.all(contributions.slice(0, 8).map(buildPublicProjectContributionSnapshot)),
  };
}

async function buildSocietyJoinRequestSnapshot(request, store) {
  const normalized = normalizeSocietyJoinRequest(request);
  const society = findSocietyById(store, normalized.society_id);
  return {
    ...normalized,
    type_label: normalized.type === 'invite' ? '邀请加入' : '申请加入',
    society_name: society?.name || '未命名村社',
    display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    invited_by_display_name: normalized.invited_by_display_name || await resolveDisplayName(normalized.invited_by),
  };
}

async function buildSocietySnapshot(society, viewerUsername = '', viewerHasSociety = false, store = null) {
  const normalized = normalizeSociety(society);
  ensureSocietyPublicProjects(normalized);
  const welfareState = recalculateSocietyWelfareProgress(normalized);
  const members = await hydrateMembers(normalized.members);
  const leader = members.find(entry => entry.role === 'president') || members[0] || null;
  const viewerMember = members.find(entry => entry.username === normalizeUsername(viewerUsername)) || null;
  const viewerRole = viewerMember?.role || '';
  const visibilityEntry = SOCIETY_VISIBILITY_OPTIONS.find(entry => entry.id === normalized.visibility) || SOCIETY_VISIBILITY_OPTIONS[0];
  const themeEntry = SOCIETY_THEME_OPTIONS.find(entry => entry.id === normalized.theme) || SOCIETY_THEME_OPTIONS[0];
  const emblemEntry = SOCIETY_EMBLEM_OPTIONS.find(entry => entry.id === normalized.emblem) || SOCIETY_EMBLEM_OPTIONS[0];
  const joinRequirementEntry = SOCIETY_JOIN_REQUIREMENT_OPTIONS.find(entry => entry.id === normalized.join_requirement_id) || SOCIETY_JOIN_REQUIREMENT_OPTIONS[0];
  const canReviewRequests = SOCIETY_MANAGER_ROLES.includes(viewerRole);
  const canCloseProposal = SOCIETY_PROPOSAL_CLOSER_ROLES.includes(viewerRole);
  const canApply = !viewerMember &&
    !viewerHasSociety &&
    normalized.visibility !== 'private' &&
    normalized.join_requirement_id !== 'invite_only' &&
    !(store && hasPendingSocietyRequest(store, normalized.id, viewerUsername));
  const activeProposals = normalized.proposals
    .map(normalizeSocietyProposal)
    .filter(entry => entry.status === 'open')
    .sort((left, right) => right.updated_at - left.updated_at);
  const proposalHistory = normalized.proposals
    .map(normalizeSocietyProposal)
    .filter(entry => entry.status === 'closed')
    .sort((left, right) => right.closed_at - left.closed_at)
    .slice(0, 12);

  return {
    id: normalized.id,
    name: normalized.name,
    summary: normalized.summary,
    notice: normalized.notice,
    emblem: normalized.emblem,
    emblem_label: emblemEntry.label,
    theme: normalized.theme,
    theme_label: themeEntry.label,
    visibility: normalized.visibility,
    visibility_label: visibilityEntry.label,
    capacity: normalized.capacity,
    member_count: members.length,
    leader_username: leader?.username || normalized.created_by,
    leader_display_name: leader?.display_name || await resolveDisplayName(normalized.created_by),
    join_requirement_id: normalized.join_requirement_id,
    join_requirement_label: joinRequirementEntry.label,
    join_requirement_summary: joinRequirementEntry.summary,
    join_requirement_note: normalized.join_requirement_note,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    level: normalized.level,
    level_title: SOCIETY_LEVEL_TITLES[Math.max(0, normalized.level - 1)] || SOCIETY_LEVEL_TITLES[SOCIETY_LEVEL_TITLES.length - 1],
    welfare_xp: welfareState.xp,
    welfare_total_xp: welfareState.total_xp,
    welfare_xp_to_next_level: welfareState.xp_to_next_level,
    my_role: viewerRole,
    my_role_label: viewerRole ? SOCIETY_ROLE_LABELS[viewerRole] || viewerRole : '',
    can_apply: canApply,
    can_invite: SOCIETY_MANAGER_ROLES.includes(viewerRole),
    can_review_requests: canReviewRequests,
    can_manage_roles: viewerRole === 'president',
    can_manage_notice: SOCIETY_NOTICE_EDITOR_ROLES.includes(viewerRole),
    can_create_proposal: !!viewerMember,
    can_close_proposal: canCloseProposal,
    members: members.map(entry => ({
      username: entry.username,
      display_name: entry.display_name,
      role: entry.role,
      role_label: SOCIETY_ROLE_LABELS[entry.role] || entry.role,
      joined_at: entry.joined_at,
    })),
    activity_log: normalized.activity_log.map(normalizeActivityEntry),
    active_proposals: await Promise.all(activeProposals.map(entry => buildProposalSnapshot(entry, viewerUsername, !!viewerMember, canCloseProposal))),
    proposal_history: await Promise.all(proposalHistory.map(entry => buildProposalSnapshot(entry, viewerUsername, !!viewerMember, false))),
    public_projects: await Promise.all(
      normalized.public_projects.map(entry => buildPublicProjectSnapshot(entry, viewerUsername, !!viewerMember))
    ),
    welfare_unlocks: buildWelfareUnlockSnapshot(normalized.level),
    exclusive_festival: buildExclusiveFestivalSnapshot(normalized.theme, normalized.level),
    exclusive_decors: buildExclusiveDecorSnapshots(normalized.theme, normalized.level),
    exclusive_tasks: buildExclusiveTaskSnapshots(normalized),
    public_warehouse: {
      funds: normalized.public_warehouse.funds,
      items: Object.entries(normalized.public_warehouse.items).map(([itemId, quantity]) => ({
        item_id: itemId,
        quantity: Number(quantity) || 0,
        label: `${Number(quantity) || 0} 份${SOCIETY_RESOURCE_LABELS[itemId] || itemId}`,
      })),
      logs: normalized.public_warehouse.logs.map(buildWarehouseLogSnapshot).filter(Boolean),
      deposit_options: SOCIETY_PUBLIC_WAREHOUSE_DEPOSIT_OPTIONS.map(entry => ({
        id: entry.id,
        label: entry.label,
        summary: entry.summary,
        costs: entry.costs.map(normalizeSocietyWarehouseEntry).filter(Boolean),
      })),
    },
  };
}

async function buildOverview(store, username) {
  const viewerUsername = normalizeUsername(username);
  const mySociety = findMemberSociety(store, viewerUsername);
  const viewerHasSociety = !!mySociety;
  const myRole = mySociety ? getSocietyMember(mySociety, viewerUsername)?.role || '' : '';
  const canReviewRequests = SOCIETY_MANAGER_ROLES.includes(myRole);

  const visibleSocieties = (store.societies || [])
    .map(normalizeSociety)
    .filter(entry => entry.id !== mySociety?.id)
    .filter(entry => entry.visibility === 'public' || entry.visibility === 'semi_public')
    .sort((left, right) => {
      const memberDiff = right.members.length - left.members.length;
      if (memberDiff !== 0) return memberDiff;
      return right.updated_at - left.updated_at;
    });

  const incomingInvites = await Promise.all(
    (store.society_join_requests || [])
      .map(normalizeSocietyJoinRequest)
      .filter(entry => entry.type === 'invite' && entry.username === viewerUsername && entry.status === 'pending')
      .sort((left, right) => right.created_at - left.created_at)
      .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
  );

  const myPendingRequests = await Promise.all(
    (store.society_join_requests || [])
      .map(normalizeSocietyJoinRequest)
      .filter(entry => entry.type === 'apply' && entry.username === viewerUsername && entry.status === 'pending')
      .sort((left, right) => right.created_at - left.created_at)
      .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
  );

  const managedRequests = mySociety && canReviewRequests
    ? await Promise.all(
        (store.society_join_requests || [])
          .map(normalizeSocietyJoinRequest)
          .filter(entry => entry.society_id === mySociety.id && entry.status === 'pending')
          .sort((left, right) => right.created_at - left.created_at)
          .map(entry => buildSocietyJoinRequestSnapshot(entry, store))
      )
    : [];

  return {
    bulletin: '村社当前已支持创建、申请、邀请、职位治理、公告更新、提案投票与第一轮公共建设；后续会继续补福利、专属节会与更深层世界反馈。',
    my_society: mySociety ? await buildSocietySnapshot(mySociety, viewerUsername, true, store) : null,
    visible_societies: await Promise.all(visibleSocieties.map(entry => buildSocietySnapshot(entry, viewerUsername, viewerHasSociety, store))),
    incoming_invites: incomingInvites,
    my_pending_requests: myPendingRequests,
    managed_requests: managedRequests,
    visibility_options: SOCIETY_VISIBILITY_OPTIONS,
    theme_options: SOCIETY_THEME_OPTIONS,
    emblem_options: SOCIETY_EMBLEM_OPTIONS,
    capacity_options: SOCIETY_CAPACITY_OPTIONS,
    join_requirement_options: SOCIETY_JOIN_REQUIREMENT_OPTIONS,
    role_options: Object.entries(SOCIETY_ROLE_LABELS).map(([id, label]) => ({ id, label })),
    proposal_kind_options: SOCIETY_PROPOSAL_KIND_OPTIONS,
    public_project_defs: SOCIETY_PUBLIC_PROJECT_DEFS.map(entry => ({
      id: entry.id,
      label: entry.label,
      summary: entry.summary,
      target_progress: entry.target_progress,
    })),
    public_project_package_options: SOCIETY_PROJECT_PACKAGE_OPTIONS.map(buildPublicProjectPackageSnapshot),
  };
}

async function listSocietyOverview(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) throw createError('请先登录后再查看村社', 401);
  const store = loadSocietyStore();
  return buildOverview(store, normalizedUsername);
}

async function createSociety(payload = {}, actor = {}) {
  const username = normalizeUsername(actor.username);
  const displayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(username) || username;
  if (!username) throw createError('未登录账号不能创建村社', 401);
  const store = loadSocietyStore();
  if (findMemberSociety(store, username)) throw createError('你已经加入一个村社了');

  const name = sanitizeText(payload.name, 24);
  if (name.length < 2) throw createError('村社名称至少 2 个字');
  const duplicated = (store.societies || [])
    .map(normalizeSociety)
    .some(entry => entry.name === name);
  if (duplicated) throw createError('这个村社名称已经被占用了');

  const society = normalizeSociety({
    id: makeId('society'),
    name,
    summary: payload.summary,
    notice: payload.notice,
    emblem: payload.emblem,
    theme: payload.theme,
    visibility: payload.visibility,
    capacity: payload.capacity,
    join_requirement_id: payload.join_requirement_id,
    join_requirement_note: payload.join_requirement_note,
    created_by: username,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    members: [
      {
        username,
        display_name: displayName,
        role: 'president',
        joined_at: nowSeconds(),
      },
    ],
    activity_log: [],
    proposals: [],
  });

  appendSocietyActivity(society, `${displayName}创建了村社「${society.name}」`, 'create');
  store.societies = [...(store.societies || []), society];
  saveSocietyStore(store);

  return {
    society: await buildSocietySnapshot(society, username, true, store),
    overview: await buildOverview(store, username),
  };
}

async function applyToSociety(username, societyId) {
  const store = loadSocietyStore();
  const applicant = normalizeUsername(username);
  const society = findSocietyById(store, societyId);
  if (!society) throw createError('村社不存在', 404);
  if (findMemberSociety(store, applicant)) throw createError('你已经加入其他村社了');
  if (society.visibility === 'private') throw createError('当前村社暂不开放公开申请', 403);
  if (society.join_requirement_id === 'invite_only') throw createError('当前村社仅接受邀请加入', 403);
  if (getSocietyMember(society, applicant)) throw createError('你已经是这个村社的成员了');
  if (hasPendingSocietyRequest(store, society.id, applicant)) throw createError('你已经提交过申请或收到邀请了');

  const request = normalizeSocietyJoinRequest({
    id: makeId('society_join'),
    society_id: society.id,
    username: applicant,
    display_name: await resolveDisplayName(applicant),
    type: 'apply',
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });
  store.society_join_requests = [...(store.society_join_requests || []), request];
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, applicant),
  };
}

async function inviteToSociety(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const inviter = normalizeUsername(actor.username);
  const inviterDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(inviter) || inviter;
  const society = findMemberSociety(store, inviter);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, inviter, SOCIETY_MANAGER_ROLES, '只有社长或管事可以邀请成员');
  if ((society.members || []).length >= society.capacity) throw createError('当前村社人数已满');

  const targetUsername = normalizeUsername(payload.target_username);
  if (!targetUsername) throw createError('请先填写要邀请的玩家');
  if (targetUsername === inviter) throw createError('不能邀请自己');
  await ensureTargetUserExists(targetUsername);
  if (findMemberSociety(store, targetUsername)) throw createError('对方已经加入其他村社');
  if (hasPendingSocietyRequest(store, society.id, targetUsername)) throw createError('该玩家已有待处理的申请或邀请');

  const request = normalizeSocietyJoinRequest({
    id: makeId('society_join'),
    society_id: society.id,
    username: targetUsername,
    display_name: await resolveDisplayName(targetUsername),
    invited_by: inviter,
    invited_by_display_name: inviterDisplayName,
    type: 'invite',
    status: 'pending',
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
  });
  store.society_join_requests = [...(store.society_join_requests || []), request];
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, inviter),
  };
}

async function respondSocietyRequest(requestId, decision, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const normalizedDecision = decision === 'accept' ? 'accept' : 'reject';
  const request = (store.society_join_requests || [])
    .map(normalizeSocietyJoinRequest)
    .find(entry => entry.id === sanitizeText(requestId, 80));
  if (!request || request.status !== 'pending') throw createError('村社申请不存在或已失效', 404);

  const society = findSocietyById(store, request.society_id);
  if (!society) throw createError('村社不存在', 404);

  const actorMember = getSocietyMember(society, actorUsername);
  const canManage = actorMember && SOCIETY_MANAGER_ROLES.includes(actorMember.role);
  const canSelfRespondInvite = request.type === 'invite' && request.username === actorUsername;
  if (!canManage && !canSelfRespondInvite) throw createError('你无权处理这条村社申请', 403);

  request.status = normalizedDecision === 'accept' ? 'accepted' : 'rejected';
  request.updated_at = nowSeconds();

  if (normalizedDecision === 'accept') {
    if ((society.members || []).length >= society.capacity) throw createError('当前村社人数已满');
    if (findMemberSociety(store, request.username)) throw createError('该玩家已经加入其他村社');
    const targetDisplayName = request.display_name || await resolveDisplayName(request.username);
    society.members = [
      ...(society.members || []),
      normalizeSocietyMember({
        username: request.username,
        display_name: targetDisplayName,
        role: 'member',
        joined_at: nowSeconds(),
      }),
    ];
    appendSocietyActivity(society, `${targetDisplayName}加入了村社「${society.name}」`, 'join');
    updateSocietyInStore(store, society);
  }

  store.society_join_requests = (store.society_join_requests || []).map(entry => {
    const normalized = normalizeSocietyJoinRequest(entry);
    return normalized.id === request.id ? request : normalized;
  });
  saveSocietyStore(store);
  return {
    request: await buildSocietyJoinRequestSnapshot(request, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function updateSocietyMemberRole(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const targetUsername = normalizeUsername(payload.target_username);
  const nextRole = normalizeSocietyRole(payload.role);
  if (!targetUsername) throw createError('请先指定要调整的成员');
  if (!SOCIETY_ASSIGNABLE_ROLES.includes(nextRole)) throw createError('当前职位暂不支持直接分配');

  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, ['president'], '只有社长可以调整职位');

  const targetMember = getSocietyMember(society, targetUsername);
  if (!targetMember) throw createError('目标成员不存在', 404);
  if (targetMember.role === 'president') throw createError('不能修改社长职位');

  targetMember.role = nextRole;
  const targetDisplayName = targetMember.display_name || await resolveDisplayName(targetUsername);
  appendSocietyActivity(society, `${targetDisplayName}现在担任${SOCIETY_ROLE_LABELS[nextRole]}`, 'role');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function updateSocietyNotice(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, SOCIETY_NOTICE_EDITOR_ROLES, '只有社长、管事或记录人可以更新公告');
  society.notice = sanitizeText(payload.notice, 160);
  appendSocietyActivity(society, `${actorDisplayName}更新了村社公告`, 'notice');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function createSocietyProposal(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以发起提案');

  const title = sanitizeText(payload.title, 40);
  if (title.length < 2) throw createError('提案标题至少 2 个字');

  const proposal = normalizeSocietyProposal({
    id: makeId('society_proposal'),
    title,
    summary: payload.summary,
    kind: payload.kind,
    status: 'open',
    created_by: actorUsername,
    created_by_display_name: actorDisplayName,
    created_at: nowSeconds(),
    updated_at: nowSeconds(),
    closed_at: 0,
    result_choice: 'pending',
    resolution_note: '',
    votes: [],
  });
  society.proposals = [proposal, ...(society.proposals || []).map(normalizeSocietyProposal)].slice(0, 60);
  appendSocietyActivity(society, `${actorDisplayName}发起了提案「${proposal.title}」`, 'proposal');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, SOCIETY_PROPOSAL_CLOSER_ROLES.includes(getSocietyMember(society, actorUsername)?.role || '')),
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function voteSocietyProposal(proposalId, payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const choice = normalizeProposalChoiceId(payload.choice);
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以参与投票');

  const proposal = (society.proposals || []).map(normalizeSocietyProposal).find(entry => entry.id === sanitizeText(proposalId, 80));
  if (!proposal) throw createError('提案不存在', 404);
  if (proposal.status !== 'open') throw createError('这条提案已经归档，不能继续投票');

  const existingVote = (proposal.votes || []).map(normalizeSocietyProposalVote).find(entry => entry.username === actorUsername);
  if (existingVote) {
    existingVote.choice = choice;
    existingVote.display_name = actorDisplayName;
    existingVote.voted_at = nowSeconds();
    proposal.votes = (proposal.votes || []).map(entry => {
      const normalized = normalizeSocietyProposalVote(entry);
      return normalized.username === actorUsername ? existingVote : normalized;
    });
  } else {
    proposal.votes = [
      ...(proposal.votes || []).map(normalizeSocietyProposalVote),
      normalizeSocietyProposalVote({
        id: makeId('society_vote'),
        username: actorUsername,
        display_name: actorDisplayName,
        choice,
        voted_at: nowSeconds(),
      }),
    ];
  }
  proposal.updated_at = nowSeconds();
  society.proposals = (society.proposals || []).map(entry => {
    const normalized = normalizeSocietyProposal(entry);
    return normalized.id === proposal.id ? proposal : normalized;
  });
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, SOCIETY_PROPOSAL_CLOSER_ROLES.includes(getSocietyMember(society, actorUsername)?.role || '')),
    overview: await buildOverview(store, actorUsername),
  };
}

async function closeSocietyProposal(proposalId, payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, SOCIETY_PROPOSAL_CLOSER_ROLES, '只有社长、管事或记录人可以归档提案');

  const proposal = (society.proposals || []).map(normalizeSocietyProposal).find(entry => entry.id === sanitizeText(proposalId, 80));
  if (!proposal) throw createError('提案不存在', 404);
  if (proposal.status !== 'open') throw createError('这条提案已经归档了');

  proposal.status = 'closed';
  proposal.closed_at = nowSeconds();
  proposal.updated_at = nowSeconds();
  proposal.result_choice = computeProposalResultChoice(proposal);
  proposal.resolution_note = sanitizeText(payload.resolution_note, 120);
  society.proposals = (society.proposals || []).map(entry => {
    const normalized = normalizeSocietyProposal(entry);
    return normalized.id === proposal.id ? proposal : normalized;
  });
  appendSocietyActivity(society, `${actorDisplayName}归档了提案「${proposal.title}」`, 'proposal_close');
  updateSocietyInStore(store, society);
  saveSocietyStore(store);
  return {
    proposal: await buildProposalSnapshot(proposal, actorUsername, true, true),
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

async function contributeSocietyPublicProject(projectId, payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以参与公共建设');
  ensureSocietyPublicProjects(society);

  const normalizedProjectId = sanitizeText(projectId, 40);
  const project = (society.public_projects || [])
    .map(normalizeSocietyPublicProject)
    .find(entry => entry.id === normalizedProjectId);
  if (!project) throw createError('公共工程不存在', 404);
  if (project.status === 'completed') throw createError('这项公共工程已经完工了');

  const packageId = sanitizeText(payload.package_id, 40);
  const contributionPackage = SOCIETY_PROJECT_PACKAGE_MAP[packageId];
  if (!contributionPackage) throw createError('当前捐献方案不存在');

  const context = getActiveSaveContext(actorUsername, null, '当前账号没有可用的桃源服务端存档，暂时无法参与公共建设');
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  ensureInventoryState(projectedData);
  if (!applyCostsToSave(projectedData, contributionPackage.costs)) {
    throw createError('当前存档里的铜钱或材料不足，暂时无法提交这份公共建设捐献');
  }
  context.data = projectedData;
  if (context.saveContainer && typeof context.saveContainer === 'object') {
    context.saveContainer.gameplayData = projectedData;
    if (context.saveContainer.wrapped && context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root.data = projectedData;
    } else if (context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root = projectedData;
    }
  }

  const nextProgress = Math.min(project.target_progress, project.progress + contributionPackage.progress_gain);
  const contribution = normalizeSocietyPublicProjectContribution({
    id: makeId('society_project_contribution'),
    username: actorUsername,
    display_name: actorDisplayName,
    package_id: contributionPackage.id,
    package_label: contributionPackage.label,
    progress_gain: contributionPackage.progress_gain,
    costs: contributionPackage.costs,
    created_at: nowSeconds(),
  });

  project.progress = nextProgress;
  project.progress_note = `${actorDisplayName}提交了「${contributionPackage.label}」，工程推进 ${contributionPackage.progress_gain} 点。`;
  project.contributions = [contribution, ...(project.contributions || []).map(normalizeSocietyPublicProjectContribution)].slice(0, 60);
  if (nextProgress >= project.target_progress) {
    project.status = 'completed';
    project.completed_at = nowSeconds();
    project.completed_by = actorUsername;
    project.completed_by_display_name = actorDisplayName;
    project.progress_note = project.completion_feedback;
    appendSocietyActivity(society, `${actorDisplayName}带队完成了公共建设「${(SOCIETY_PUBLIC_PROJECT_DEF_MAP[project.id] || {}).label || project.id}」`, 'public_project_complete');
  } else {
    appendSocietyActivity(society, `${actorDisplayName}为公共建设「${(SOCIETY_PUBLIC_PROJECT_DEF_MAP[project.id] || {}).label || project.id}」捐献了${contributionPackage.label}`, 'public_project');
  }

  society.public_projects = (society.public_projects || []).map(entry => {
    const normalized = normalizeSocietyPublicProject(entry);
    return normalized.id === project.id ? project : normalized;
  });
  updateSocietyInStore(store, society);
  persistGameplayData(context);
  saveSocietyStore(store);

  return {
    project: await buildPublicProjectSnapshot(project, actorUsername, true),
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
    player_money: Math.max(0, Math.floor(Number(context.data?.player?.money) || 0)),
  };
}

async function depositSocietyWarehouse(payload = {}, actor = {}) {
  const store = loadSocietyStore();
  const actorUsername = normalizeUsername(actor.username);
  const actorDisplayName = sanitizeText(actor.displayName, 40) || await resolveDisplayName(actorUsername) || actorUsername;
  const society = findMemberSociety(store, actorUsername);
  if (!society) throw createError('你当前没有加入村社');
  ensureSocietyMemberRole(society, actorUsername, Object.keys(SOCIETY_ROLE_LABELS), '只有成员可以使用公共仓');

  const depositId = sanitizeText(payload.deposit_id, 40);
  const { warehouse } = depositToPublicWarehouse(society, actorUsername, actorDisplayName, depositId);
  updateSocietyInStore(store, society);
  saveSocietyStore(store);

  return {
    warehouse: {
      funds: warehouse.funds,
      items: Object.entries(warehouse.items).map(([itemId, quantity]) => ({
        item_id: itemId,
        quantity: Number(quantity) || 0,
        label: `${Number(quantity) || 0} 份${SOCIETY_RESOURCE_LABELS[itemId] || itemId}`,
      })),
      logs: warehouse.logs.map(buildWarehouseLogSnapshot).filter(Boolean),
    },
    society: await buildSocietySnapshot(society, actorUsername, true, store),
    overview: await buildOverview(store, actorUsername),
  };
}

module.exports = {
  listSocietyOverview,
  createSociety,
  applyToSociety,
  inviteToSociety,
  respondSocietyRequest,
  updateSocietyMemberRole,
  updateSocietyNotice,
  createSocietyProposal,
  voteSocietyProposal,
  closeSocietyProposal,
  contributeSocietyPublicProject,
  depositSocietyWarehouse,
};
