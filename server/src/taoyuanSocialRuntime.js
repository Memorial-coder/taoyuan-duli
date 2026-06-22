const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanExchangeLedger = require('./taoyuanExchangeLedger');
const taoyuanImageModeration = require('./taoyuanImageModeration');
const { moderateText } = require('./taoyuanTextModeration');
const {
  createError,
  findSaveIdentityById,
  getActiveSaveContext,
  listSaveIdentities,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SOCIAL_PROFILE_FILE = path.join(DATA_DIR, 'taoyuan_social_profiles.json');
const TAOYUAN_PLAYER_CHRONICLE_FILE = path.join(DATA_DIR, 'taoyuan_player_chronicles.json');
const TAOYUAN_MANOR_GUESTBOOK_FILE = path.join(DATA_DIR, 'taoyuan_manor_guestbook.json');
const TAOYUAN_MANOR_VISIT_FILE = path.join(DATA_DIR, 'taoyuan_manor_visits.json');
const TAOYUAN_MANOR_FAVORITES_FILE = path.join(DATA_DIR, 'taoyuan_manor_favorites.json');
const TAOYUAN_COOP_ORDER_FILE = path.join(DATA_DIR, 'taoyuan_coop_orders.json');
const TAOYUAN_SOCIETY_FILE = path.join(DATA_DIR, 'taoyuan_societies.json');
const TAOYUAN_HALL_FILE = path.join(DATA_DIR, 'taoyuan_hall.json');
const TAOYUAN_MAILBOX_FILE = path.join(DATA_DIR, 'taoyuan_mailbox.json');
const TAOYUAN_ACTIVITY_ROOM_FILE = path.join(DATA_DIR, 'taoyuan_activity_rooms.json');
const TAOYUAN_SOCIAL_REPORT_FILE = path.join(DATA_DIR, 'taoyuan_social_reports.json');

const FRIEND_DISCOVERY_ONLINE_WINDOW_SECONDS = 5 * 60;
const FRIEND_DISCOVERY_RECENT_WINDOW_SECONDS = 14 * 24 * 60 * 60;

const SEASON_LABELS = Object.freeze({
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
});

const SKILL_FOCUS_LABELS = Object.freeze({
  farming: '种植经营',
  foraging: '采集探索',
  fishing: '渔业经营',
  mining: '矿洞开拓',
  combat: '护乡守备',
});

const SKILL_TITLE_LABELS = Object.freeze({
  farming: '田庄能手',
  foraging: '山野行客',
  fishing: '清溪渔人',
  mining: '矿洞匠手',
  combat: '护乡勇者',
});

const FARMHOUSE_LEVEL_LABELS = Object.freeze({
  0: '茅屋小院',
  1: '砖房小院',
  2: '宅院庄园',
  3: '酒窖宅院',
});

const DEFAULT_PROFILE = Object.freeze({
  visibility: 'public',
  public_intro: '',
  manor_name: '',
  public_title: '',
  neighborhood_role: '',
  showcase_theme: '',
  avatar_image_url: '',
  avatar_image_alt: '',
  selected_tag_ids: [],
  public_since: 0,
  updated_at: 0,
  last_active_at: 0,
});

const PROFILE_TAG_OPTIONS = Object.freeze([
  { id: 'farming', label: '种植' },
  { id: 'fishing', label: '钓鱼' },
  { id: 'breeding', label: '育种' },
  { id: 'collection', label: '收藏' },
  { id: 'festival', label: '节庆' },
  { id: 'mutual_aid', label: '互助' },
  { id: 'decoration', label: '装饰' },
  { id: 'exploration', label: '探索' },
]);

const PROFILE_TAG_LABELS = Object.freeze(Object.fromEntries(PROFILE_TAG_OPTIONS.map(entry => [entry.id, entry.label])));

const GUESTBOOK_KIND_LABELS = Object.freeze({
  text: '文本留言',
  blessing: '祝福留言',
  advice: '建议留言',
  stamp: '图章留言',
  signature: '签名留言',
});

const VISIT_PURPOSE_LABELS = Object.freeze({
  explore: '参观',
  friend_visit: '好友来访',
  gift: '带礼来访',
  quest: '委托相关来访',
  other: '普通来访',
});

const PLAYER_CHRONICLE_DEFS = Object.freeze([
  {
    id: 'first_public_manor',
    label: '第一次公开庄园',
    summary: '第一次让自己的庄园真正对外留下可回看的公开痕迹。',
  },
  {
    id: 'first_visit_received',
    label: '第一次被访问',
    summary: '第一次有访客真的走进自己的庄园并留下来访记录。',
  },
  {
    id: 'first_guestbook_received',
    label: '第一次收到访客留言',
    summary: '第一次在庄园留言墙里收到来自别人的真实留言。',
  },
  {
    id: 'first_coop_order_completed',
    label: '第一次完成协作委托',
    summary: '第一次把联机委托真正交付、确认并沉成结算凭证。',
  },
  {
    id: 'first_festival_participation',
    label: '第一次参加节会',
    summary: '第一次把同场节会经历写进自己的联机纪念册。',
  },
  {
    id: 'first_society_join',
    label: '第一次加入村社',
    summary: '第一次从邻里互助走到真正加入一个可治理的村社组织。',
  },
  {
    id: 'first_public_project_contribution',
    label: '第一次参与公共建设',
    summary: '第一次为村社公共建设真正提交物资、工钱或图纸。',
  },
  {
    id: 'first_hot_manor',
    label: '第一次被推荐为热门庄园',
    summary: '第一次让庄园进入当前可回看的热门庄园榜单。',
  },
]);

const PLAYER_CHRONICLE_DEF_MAP = Object.freeze(
  Object.fromEntries(PLAYER_CHRONICLE_DEFS.map(entry => [entry.id, entry]))
);

const AWARD_HONOR_DEFS = Object.freeze([
  {
    id: 'mutual_aid',
    label: '热心互助者',
    summary: '在协作委托与好友往来里留下了稳定的互助痕迹。',
    source_type: 'coop_order',
  },
  {
    id: 'manor_designer',
    label: '庄园设计师',
    summary: '把庄园经营成了有辨识度的展示空间。',
    source_type: 'manor',
  },
  {
    id: 'festival_active',
    label: '节会活跃者',
    summary: '持续参加节会并留下了纪念痕迹。',
    source_type: 'festival',
  },
  {
    id: 'construction_contributor',
    label: '建设贡献者',
    summary: '为村社公共建设和公共仓留下了贡献。',
    source_type: 'society',
  },
  {
    id: 'expedition_collaborator',
    label: '远征协作者',
    summary: '在多人远征里留下了协作与结算记录。',
    source_type: 'expedition',
  },
  {
    id: 'market_coordinator',
    label: '集市协调者',
    summary: '在慢交易和交换账本里保持了活跃往来。',
    source_type: 'market',
  },
  {
    id: 'rumor_collector',
    label: '传闻收集者',
    summary: '在交流大厅与信件纪念中持续收集见闻。',
    source_type: 'hall_mail',
  },
  {
    id: 'world_witness',
    label: '世界见证者',
    summary: '见证并参与了世界事件与公共纪年。',
    source_type: 'world_event',
  },
]);

const AWARD_MEMORIAL_DEFS = Object.freeze([
  {
    id: 'festival_memento',
    label: '节庆纪念品',
    summary: '来自节会纪念册与节会结算的留痕。',
    category: 'festival',
  },
  {
    id: 'society_badge',
    label: '村社徽章',
    summary: '来自村社加入、共建和职位流转的组织留痕。',
    category: 'society',
  },
  {
    id: 'world_chronicle',
    label: '世界纪年章',
    summary: '来自世界事件与公共纪年的见证留痕。',
    category: 'world',
  },
]);

const AWARD_TITLE_DEFS = Object.freeze([
  {
    id: 'current_public_title',
    label: '限定称号',
    summary: '当前对外展示的公开称号。',
    category: 'current',
  },
  {
    id: 'festival_title',
    label: '节会称号',
    summary: '来自节会奖励的限定称号。',
    category: 'festival',
  },
  {
    id: 'world_title',
    label: '纪年称号',
    summary: '来自世界事件奖励的纪年称号。',
    category: 'world',
  },
]);

function createEmptySocialStore() {
  return {
    profiles: {},
    friend_requests: [],
    friendships: [],
    blocks: [],
    neighbor_groups: [],
    neighbor_join_requests: [],
    subscriptions: [],
  };
}

function createEmptySocialReportStore() {
  return {
    reports: [],
  };
}

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeAuditContext(auditContext = {}) {
  return auditContext && typeof auditContext === 'object' && !Array.isArray(auditContext)
    ? auditContext
    : {};
}

function buildSocialAuditContext(auditContext = {}, overrides = {}) {
  const base = normalizeAuditContext(auditContext);
  return {
    ...base,
    ...overrides,
    scene: overrides.scene || base.scene || '',
    field: overrides.field || base.field || '',
    username: overrides.username || base.username || '',
    content_type: overrides.content_type || base.content_type || 'social_text',
    content_id: overrides.content_id || base.content_id || '',
  };
}

function normalizeVisibility(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'private') return 'private';
  if (normalized === 'friends_only') return 'friends_only';
  return 'public';
}

function normalizeGuestbookKind(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['text', 'blessing', 'advice', 'stamp', 'signature'].includes(normalized)) return normalized;
  return 'text';
}

function normalizeVisitPurpose(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['explore', 'friend_visit', 'gift', 'quest', 'other'].includes(normalized)) return normalized;
  return 'other';
}

function ensureSocialProfileStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_SOCIAL_PROFILE_FILE), { recursive: true });
}

function loadSocialProfileStore() {
  ensureSocialProfileStore();
  try {
    if (!fs.existsSync(TAOYUAN_SOCIAL_PROFILE_FILE)) return createEmptySocialStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_SOCIAL_PROFILE_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          profiles: raw.profiles && typeof raw.profiles === 'object' ? raw.profiles : {},
          friend_requests: Array.isArray(raw.friend_requests) ? raw.friend_requests : [],
          friendships: Array.isArray(raw.friendships) ? raw.friendships : [],
          blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
          neighbor_groups: Array.isArray(raw.neighbor_groups) ? raw.neighbor_groups : [],
          neighbor_join_requests: Array.isArray(raw.neighbor_join_requests) ? raw.neighbor_join_requests : [],
          subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
        }
      : createEmptySocialStore();
  } catch {
    return createEmptySocialStore();
  }
}

function saveSocialProfileStore(store) {
  ensureSocialProfileStore();
  writeJsonFileAtomic(TAOYUAN_SOCIAL_PROFILE_FILE, {
    profiles: store?.profiles && typeof store.profiles === 'object' ? store.profiles : {},
    friend_requests: Array.isArray(store?.friend_requests) ? store.friend_requests : [],
    friendships: Array.isArray(store?.friendships) ? store.friendships : [],
    blocks: Array.isArray(store?.blocks) ? store.blocks : [],
    neighbor_groups: Array.isArray(store?.neighbor_groups) ? store.neighbor_groups : [],
    neighbor_join_requests: Array.isArray(store?.neighbor_join_requests) ? store.neighbor_join_requests : [],
    subscriptions: Array.isArray(store?.subscriptions) ? store.subscriptions : [],
  });
}

function readJsonStore(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function loadSocialReportStore() {
  const raw = readJsonStore(TAOYUAN_SOCIAL_REPORT_FILE, createEmptySocialReportStore());
  return {
    reports: Array.isArray(raw.reports) ? raw.reports.map(normalizeSocialReport).filter(entry => entry.id) : [],
  };
}

function saveSocialReportStore(store) {
  writeJsonFileAtomic(TAOYUAN_SOCIAL_REPORT_FILE, {
    reports: Array.isArray(store?.reports) ? store.reports.map(normalizeSocialReport).filter(entry => entry.id) : [],
  });
}

function createEmptyPlayerChronicleStore() {
  return {
    players: {},
  };
}

function ensurePlayerChronicleStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_PLAYER_CHRONICLE_FILE), { recursive: true });
}

function normalizeChronicleMilestone(entry) {
  return {
    id: sanitizeText(entry?.id, 60),
    recorded_at: Math.max(0, Math.floor(Number(entry?.recorded_at) || 0)),
    detail: sanitizeText(entry?.detail, 160),
    source_type: sanitizeText(entry?.source_type, 40),
    source_id: sanitizeText(entry?.source_id, 80),
  };
}

function normalizePlayerChronicleEntry(entry) {
  const milestoneEntries = entry?.milestones && typeof entry.milestones === 'object' ? entry.milestones : {};
  return {
    milestones: Object.fromEntries(
      Object.entries(milestoneEntries)
        .map(([key, value]) => [sanitizeText(key, 60), normalizeChronicleMilestone(value)])
        .filter(([, value]) => value.id)
    ),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || 0)),
  };
}

function loadPlayerChronicleStore() {
  ensurePlayerChronicleStore();
  const raw = readJsonStore(TAOYUAN_PLAYER_CHRONICLE_FILE, createEmptyPlayerChronicleStore());
  return {
    players: raw.players && typeof raw.players === 'object' ? raw.players : {},
  };
}

function savePlayerChronicleStore(store) {
  ensurePlayerChronicleStore();
  writeJsonFileAtomic(TAOYUAN_PLAYER_CHRONICLE_FILE, {
    players: store?.players && typeof store.players === 'object' ? store.players : {},
  });
}

function ensurePlayerChronicleEntry(store, username) {
  const key = normalizeUsername(username);
  const current = normalizePlayerChronicleEntry(store.players?.[key] || {});
  if (!store.players || typeof store.players !== 'object') store.players = {};
  store.players[key] = current;
  return current;
}

function buildChronicleCandidate(recordedAt, detail, sourceType, sourceId = '') {
  const normalizedRecordedAt = Math.max(0, Math.floor(Number(recordedAt) || 0));
  if (normalizedRecordedAt <= 0) return null;
  return {
    recorded_at: normalizedRecordedAt,
    detail: sanitizeText(detail, 160),
    source_type: sanitizeText(sourceType, 40),
    source_id: sanitizeText(sourceId, 80),
  };
}

function pickEarliestCandidate(candidates = []) {
  return candidates
    .filter(entry => entry && entry.recorded_at > 0)
    .sort((left, right) => left.recorded_at - right.recorded_at)[0] || null;
}

function readGuestbookEntries() {
  const raw = readJsonStore(TAOYUAN_MANOR_GUESTBOOK_FILE, { entries: [] });
  return Array.isArray(raw.entries) ? raw.entries : [];
}

function readVisitEntries() {
  const raw = readJsonStore(TAOYUAN_MANOR_VISIT_FILE, { entries: [] });
  return Array.isArray(raw.entries) ? raw.entries : [];
}

function readFavoriteEntries() {
  const raw = readJsonStore(TAOYUAN_MANOR_FAVORITES_FILE, { favorites: [] });
  return Array.isArray(raw.favorites) ? raw.favorites : [];
}

function readCoopOrderReceipts() {
  const raw = readJsonStore(TAOYUAN_COOP_ORDER_FILE, { receipts: [] });
  return Array.isArray(raw.receipts) ? raw.receipts : [];
}

function readHallStore() {
  const raw = readJsonStore(TAOYUAN_HALL_FILE, { posts: [], reports: [] });
  return {
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    reports: Array.isArray(raw.reports) ? raw.reports : [],
  };
}

function readMailboxStore() {
  const raw = readJsonStore(TAOYUAN_MAILBOX_FILE, { campaigns: [], deliveries: [], memorial_entries: [] });
  return {
    deliveries: Array.isArray(raw.deliveries) ? raw.deliveries : [],
    memorial_entries: Array.isArray(raw.memorial_entries) ? raw.memorial_entries : [],
  };
}

function readActivityRoomStore() {
  const raw = readJsonStore(TAOYUAN_ACTIVITY_ROOM_FILE, { rooms: [], receipts: [] });
  return {
    receipts: Array.isArray(raw.receipts) ? raw.receipts : [],
  };
}

function readSocietyStore() {
  const raw = readJsonStore(TAOYUAN_SOCIETY_FILE, { societies: [], society_join_requests: [] });
  return {
    societies: Array.isArray(raw.societies) ? raw.societies : [],
    society_join_requests: Array.isArray(raw.society_join_requests) ? raw.society_join_requests : [],
  };
}

function buildPlayerChronicleMilestoneSnapshots(entry) {
  return PLAYER_CHRONICLE_DEFS.map(def => {
    const milestone = normalizeChronicleMilestone(entry?.milestones?.[def.id] || {});
    return {
      id: def.id,
      label: def.label,
      summary: def.summary,
      unlocked: milestone.recorded_at > 0,
      recorded_at: milestone.recorded_at,
      detail: milestone.detail,
      source_type: milestone.source_type,
      source_id: milestone.source_id,
    };
  });
}

function persistPlayerChronicleCandidate(store, username, milestoneId, candidate) {
  if (!candidate || !PLAYER_CHRONICLE_DEF_MAP[milestoneId]) return false;
  const entry = ensurePlayerChronicleEntry(store, username);
  const current = normalizeChronicleMilestone(entry.milestones?.[milestoneId] || {});
  if (current.recorded_at > 0 && current.recorded_at <= candidate.recorded_at) return false;
  entry.milestones[milestoneId] = normalizeChronicleMilestone({
    id: milestoneId,
    recorded_at: candidate.recorded_at,
    detail: candidate.detail,
    source_type: candidate.source_type,
    source_id: candidate.source_id,
  });
  entry.updated_at = Math.floor(Date.now() / 1000);
  store.players[normalizeUsername(username)] = entry;
  return true;
}

function buildAwardCard(payload = {}) {
  return {
    id: sanitizeText(payload.id, 80),
    label: sanitizeText(payload.label, 40),
    summary: sanitizeText(payload.summary, 160),
    category: sanitizeText(payload.category, 24),
    unlocked: payload.unlocked === true,
    recorded_at: Math.max(0, Math.floor(Number(payload.recorded_at) || 0)),
    detail: sanitizeText(payload.detail, 160),
    source_type: sanitizeText(payload.source_type, 40),
    source_id: sanitizeText(payload.source_id, 80),
    active: payload.active === true,
  };
}

function readFestivalMemorialCandidates(username) {
  try {
    const context = getActiveSaveContext(username, null, '当前玩家没有可用存档');
    const memorials = Array.isArray(context?.data?.onlineFestivalRewards?.memorials)
      ? context.data.onlineFestivalRewards.memorials
      : [];
    return memorials
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => normalizeFestivalMemorialCandidate(entry))
      .filter(entry => entry.memorial_id);
  } catch {
    return [];
  }
}

function normalizeFestivalMemorialCandidate(entry) {
  return {
    memorial_id: sanitizeText(entry?.memorial_id, 120),
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
    squadmate_display_names: Array.isArray(entry?.squadmate_display_names)
      ? entry.squadmate_display_names.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    squadmate_friend_display_names: Array.isArray(entry?.squadmate_friend_display_names)
      ? entry.squadmate_friend_display_names.map(item => sanitizeText(item, 40)).filter(Boolean).slice(0, 8)
      : [],
    photo_line: sanitizeText(entry?.photo_line, 120),
    photo_taken: entry?.photo_taken === true,
  };
}

function buildPlayerAwardShowcase(username, storedProfile = DEFAULT_PROFILE, saveContext = null, playerChronicle = null) {
  const normalizedUsername = normalizeUsername(username);
  const coopReceipts = readCoopOrderReceipts();
  const favoriteEntries = readFavoriteEntries();
  const societyStore = readSocietyStore();
  const hallStore = readHallStore();
  const mailboxStore = readMailboxStore();
  const activityRoomStore = readActivityRoomStore();
  const exchangeLedger = taoyuanExchangeLedger.listExchangeLedger(normalizedUsername);
  const festivalMemorials = readFestivalMemorialCandidates(normalizedUsername);
  const worldState = saveContext?.data?.onlineWorldEvents || {};
  const worldRecords = Array.isArray(worldState.contributionRecords) ? worldState.contributionRecords : [];
  const worldBadges = Object.entries(worldState.seasonalBadges || {})
    .map(([eventId, entry]) => ({
      event_id: sanitizeText(eventId, 40),
      label: sanitizeText(entry?.label, 40),
      cycle_key: sanitizeText(entry?.cycle_key, 40),
      rank: Math.max(0, Math.floor(Number(entry?.rank) || 0)),
      awarded_at: Math.max(0, Math.floor(Number(entry?.awarded_at) || 0)),
    }))
    .filter(entry => entry.label)
    .sort((left, right) => right.awarded_at - left.awarded_at);
  const playerChronicleMap = playerChronicle?.milestones
    ? Object.fromEntries(playerChronicle.milestones.map(entry => [String(entry.id || ''), entry]))
    : {};

  const coopCompletedCount = coopReceipts
    .filter(entry => normalizeUsername(entry?.assignee_username) === normalizedUsername && ['confirmed', 'compensation_pending'].includes(String(entry?.status || '')))
    .length;
  const favoriteCount = favoriteEntries.filter(entry => normalizeUsername(entry?.manor_username) === normalizedUsername).length;
  const placedDecorationCount = Object.values(saveContext?.data?.decoration?.placed || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const festivalCount = festivalMemorials.length;
  const societyContributionCount = societyStore.societies
    .flatMap(society => Array.isArray(society?.public_projects) ? society.public_projects : [])
    .flatMap(project => Array.isArray(project?.contributions) ? project.contributions : [])
    .filter(contribution => normalizeUsername(contribution?.username) === normalizedUsername)
    .length;
  const societyRoleCount = societyStore.societies
    .flatMap(society => Array.isArray(society?.role_history) ? society.role_history : [])
    .filter(entry => normalizeUsername(entry?.username) === normalizedUsername)
    .length;
  const expeditionReceiptCount = activityRoomStore.receipts
    .filter(entry => String(entry?.activity_domain || '') === 'expedition' && normalizeUsername(entry?.target_username) === normalizedUsername && ['persisted', 'persist_preview', 'pending_persist'].includes(String(entry?.status || '')))
    .length;
  const exchangeEntryCount = Array.isArray(exchangeLedger?.entries) ? exchangeLedger.entries.length : 0;
  const hallPostCount = hallStore.posts.filter(post => normalizeUsername(post?.author) === normalizedUsername).length;
  const hallReplyCount = hallStore.posts.reduce((sum, post) => sum + (Array.isArray(post?.replies) ? post.replies.filter(reply => normalizeUsername(reply?.author) === normalizedUsername).length : 0), 0);
  const memorialEntryCount = mailboxStore.memorial_entries.filter(entry => normalizeUsername(entry?.username) === normalizedUsername).length;
  const worldContributionPoints = Math.max(0, Math.floor(Number(worldState.totalContribution) || 0));
  const worldBadgeCount = worldBadges.length;

  const honorCards = AWARD_HONOR_DEFS.map(def => {
    const firstRecordedAt = (() => {
      if (def.id === 'mutual_aid') {
        const receipt = coopReceipts
          .filter(entry => normalizeUsername(entry?.assignee_username) === normalizedUsername && ['confirmed', 'compensation_pending'].includes(String(entry?.status || '')))
          .sort((left, right) => (left.confirmed_at || left.created_at || 0) - (right.confirmed_at || right.created_at || 0))[0];
        return Number(receipt?.confirmed_at || receipt?.created_at || 0);
      }
      if (def.id === 'manor_designer') {
        const favorite = favoriteEntries
          .filter(entry => normalizeUsername(entry?.manor_username) === normalizedUsername)
          .sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0))[0];
        return Number(favorite?.created_at || storedProfile.public_since || 0);
      }
      if (def.id === 'festival_active') {
        return Number(festivalMemorials[0]?.awarded_at || 0);
      }
      if (def.id === 'construction_contributor') {
        const contribution = societyStore.societies
          .flatMap(society => Array.isArray(society?.public_projects) ? society.public_projects : [])
          .flatMap(project => Array.isArray(project?.contributions) ? project.contributions.map(contribution => ({
            project,
            contribution,
            society_name: sanitizeText((societyStore.societies.find(society => Array.isArray(society?.public_projects) && society.public_projects.includes(project)) || {})?.name, 40),
          })) : [])
          .filter(entry => normalizeUsername(entry.contribution?.username) === normalizedUsername)
          .sort((left, right) => Number(left.contribution?.created_at || 0) - Number(right.contribution?.created_at || 0))[0];
        return Number(contribution?.contribution?.created_at || 0);
      }
      if (def.id === 'expedition_collaborator') {
        const receipt = activityRoomStore.receipts
          .filter(entry => String(entry?.activity_domain || '') === 'expedition' && normalizeUsername(entry?.target_username) === normalizedUsername)
          .sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0))[0];
        return Number(receipt?.created_at || 0);
      }
      if (def.id === 'market_coordinator') {
        return Number(exchangeLedger?.entries?.[0]?.created_at || 0);
      }
      if (def.id === 'rumor_collector') {
        const firstMail = mailboxStore.memorial_entries
          .filter(entry => normalizeUsername(entry?.username) === normalizedUsername)
          .sort((left, right) => Number(left.saved_at || 0) - Number(right.saved_at || 0))[0];
        const firstPost = hallStore.posts
          .filter(post => normalizeUsername(post?.author) === normalizedUsername)
          .sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0))[0];
        return Number(firstMail?.saved_at || firstPost?.created_at || 0);
      }
      if (def.id === 'world_witness') {
        const record = worldRecords
          .filter(entry => Number(entry?.completed_at) > 0 || Number(entry?.created_at) > 0)
          .sort((left, right) => Number(left.completed_at || left.created_at || 0) - Number(right.completed_at || right.created_at || 0))[0];
        return Number(record?.completed_at || record?.created_at || 0);
      }
      return 0;
    })();
    const unlocked = (() => {
      if (def.id === 'mutual_aid') return coopCompletedCount >= 1;
      if (def.id === 'manor_designer') return favoriteCount >= 1 || placedDecorationCount >= 3 || !!storedProfile.showcase_theme;
      if (def.id === 'festival_active') return festivalCount >= 1;
      if (def.id === 'construction_contributor') return societyContributionCount >= 1 || societyRoleCount >= 1;
      if (def.id === 'expedition_collaborator') return expeditionReceiptCount >= 1;
      if (def.id === 'market_coordinator') return exchangeEntryCount >= 1;
      if (def.id === 'rumor_collector') return hallPostCount + hallReplyCount + memorialEntryCount >= 1;
      if (def.id === 'world_witness') return worldContributionPoints > 0 || worldBadgeCount >= 1;
      return false;
    })();
    const detail = (() => {
      if (def.id === 'mutual_aid') return `协作委托 ${coopCompletedCount} 条，好友互助痕迹 ${countFriendships(loadSocialProfileStore(), normalizedUsername)} 条。`;
      if (def.id === 'manor_designer') return `热门收藏 ${favoriteCount} 次，公开主题 ${storedProfile.showcase_theme || '待定'}。`;
      if (def.id === 'festival_active') return `节会纪念册 ${festivalCount} 条。`;
      if (def.id === 'construction_contributor') return `公共建设贡献 ${societyContributionCount} 条，社内职位流转 ${societyRoleCount} 条。`;
      if (def.id === 'expedition_collaborator') return `远征房间结算 ${expeditionReceiptCount} 次。`;
      if (def.id === 'market_coordinator') return `慢交易账本记录 ${exchangeEntryCount} 条。`;
      if (def.id === 'rumor_collector') return `大厅发帖/回复 ${hallPostCount + hallReplyCount} 条，纪念册 ${memorialEntryCount} 条。`;
      if (def.id === 'world_witness') return `世界贡献 ${worldContributionPoints} 点，世界徽记 ${worldBadgeCount} 枚。`;
      return def.summary;
    })();
    return buildAwardCard({
      id: def.id,
      label: def.label,
      summary: def.summary,
      category: 'honor',
      unlocked,
      recorded_at: firstRecordedAt,
      detail,
      source_type: def.source_type,
      source_id: normalizedUsername,
    });
  });

  const commemorativeCards = [
    festivalMemorials[0]
      ? buildAwardCard({
          id: 'festival_memento',
          label: '节庆纪念品',
          summary: AWARD_MEMORIAL_DEFS[0].summary,
          category: 'festival',
          unlocked: true,
          recorded_at: Number(festivalMemorials[0].awarded_at || 0),
          detail: `${festivalMemorials[0].template_label || festivalMemorials[0].template_id || '节会'} · ${festivalMemorials[0].gameplay_template_label || '玩法'}。`,
          source_type: 'festival_memorial',
          source_id: festivalMemorials[0].memorial_id,
        })
      : buildAwardCard({
          id: 'festival_memento',
          label: '节庆纪念品',
          summary: AWARD_MEMORIAL_DEFS[0].summary,
          category: 'festival',
          unlocked: false,
          detail: '还没有节会纪念册可回看。',
          source_type: 'festival_memorial',
          source_id: normalizedUsername,
        }),
    (societyContributionCount > 0 || societyRoleCount > 0)
      ? buildAwardCard({
          id: 'society_badge',
          label: '村社徽章',
          summary: AWARD_MEMORIAL_DEFS[1].summary,
          category: 'society',
          unlocked: true,
          recorded_at: (() => {
            const firstContribution = societyStore.societies
              .flatMap(society => Array.isArray(society?.public_projects) ? society.public_projects : [])
              .flatMap(project => Array.isArray(project?.contributions) ? project.contributions.map(contribution => contribution) : [])
              .filter(contribution => normalizeUsername(contribution?.username) === normalizedUsername)
              .sort((left, right) => Number(left.created_at || 0) - Number(right.created_at || 0))[0];
            return Number(firstContribution?.created_at || playerChronicleMap.first_society_join?.recorded_at || 0);
          })(),
          detail: playerChronicleMap.first_public_project_contribution?.unlocked
            ? playerChronicleMap.first_public_project_contribution.detail || playerChronicleMap.first_public_project_contribution.summary
            : '村社里已经留下了共建或职位流转的痕迹。',
          source_type: 'society',
          source_id: normalizedUsername,
        })
      : buildAwardCard({
          id: 'society_badge',
          label: '村社徽章',
          summary: AWARD_MEMORIAL_DEFS[1].summary,
          category: 'society',
          unlocked: false,
          detail: '还没有足够的村社参与记录。',
          source_type: 'society',
          source_id: normalizedUsername,
        }),
    (worldContributionPoints > 0 || worldBadgeCount > 0)
      ? buildAwardCard({
          id: 'world_chronicle',
          label: '世界纪年章',
          summary: AWARD_MEMORIAL_DEFS[2].summary,
          category: 'world',
          unlocked: true,
          recorded_at: Number(worldBadges[0]?.awarded_at || worldRecords[0]?.completed_at || worldRecords[0]?.created_at || 0),
          detail: worldBadges[0]
            ? `${sanitizeText(worldBadges[0].label, 40)} · 第${sanitizeText(worldBadges[0].rank, 8)}名。`
            : `世界贡献 ${worldContributionPoints} 点。`,
          source_type: 'world_event',
          source_id: normalizedUsername,
        })
      : buildAwardCard({
          id: 'world_chronicle',
          label: '世界纪年章',
          summary: AWARD_MEMORIAL_DEFS[2].summary,
          category: 'world',
          unlocked: false,
          detail: '还没有世界事件纪年可回看。',
          source_type: 'world_event',
          source_id: normalizedUsername,
        }),
  ];

  const titleCards = [];
  const activeTitle = sanitizeText(storedProfile.public_title, 24) || inferPublicTitle(saveContext?.data?.skill || {});
  titleCards.push(buildAwardCard({
    id: 'current_public_title',
    label: '限定称号',
    summary: AWARD_TITLE_DEFS[0].summary,
    category: 'current',
    unlocked: true,
    active: true,
    recorded_at: Number(storedProfile.updated_at || 0) || Number(storedProfile.public_since || 0),
    detail: activeTitle,
    source_type: 'profile',
    source_id: normalizedUsername,
  }));
  const festivalTitleEntries = Object.entries(saveContext?.data?.onlineFestivalRewards?.titles || {})
    .map(([titleId, entry]) => ({
      title_id: sanitizeText(titleId, 80),
      label: sanitizeText(entry?.label, 40),
      awarded_at: Math.max(0, Math.floor(Number(entry?.awarded_at) || 0)),
      room_id: sanitizeText(entry?.room_id, 40),
      template_id: sanitizeText(entry?.template_id, 40),
    }))
    .filter(entry => entry.label);
  if (festivalTitleEntries.length > 0) {
    const latestFestivalTitle = festivalTitleEntries.sort((left, right) => right.awarded_at - left.awarded_at)[0];
    titleCards.push(buildAwardCard({
      id: 'festival_title',
      label: AWARD_TITLE_DEFS[1].label,
      summary: AWARD_TITLE_DEFS[1].summary,
      category: 'festival',
      unlocked: true,
      recorded_at: latestFestivalTitle.awarded_at,
      detail: latestFestivalTitle.label,
      source_type: 'festival_reward',
      source_id: latestFestivalTitle.title_id,
    }));
  }
  if (worldBadges.length > 0) {
    const latestWorldBadge = [...worldBadges].sort((left, right) => right.awarded_at - left.awarded_at)[0];
    titleCards.push(buildAwardCard({
      id: 'world_title',
      label: AWARD_TITLE_DEFS[2].label,
      summary: AWARD_TITLE_DEFS[2].summary,
      category: 'world',
      unlocked: true,
      recorded_at: latestWorldBadge.awarded_at,
      detail: latestWorldBadge.label,
      source_type: 'world_badge',
      source_id: latestWorldBadge.event_id,
    }));
  } else {
    titleCards.push(buildAwardCard({
      id: 'world_title',
      label: AWARD_TITLE_DEFS[2].label,
      summary: AWARD_TITLE_DEFS[2].summary,
      category: 'world',
      unlocked: false,
      detail: '还没有世界纪年称号。',
      source_type: 'world_badge',
      source_id: normalizedUsername,
    }));
  }

  const achievementCards = (playerChronicle?.milestones || []).map(entry => buildAwardCard({
    id: entry.id,
    label: entry.label,
    summary: entry.summary,
    category: 'achievement',
    unlocked: entry.unlocked === true,
    recorded_at: entry.recorded_at,
    detail: entry.unlocked ? entry.detail || entry.summary : entry.summary,
    source_type: entry.source_type,
    source_id: entry.source_id,
    active: entry.unlocked === true,
  }));

  return {
    honors: honorCards,
    commemoratives: commemorativeCards,
    titles: titleCards,
    achievement_cards: achievementCards,
    summary: {
      honor_count: honorCards.filter(entry => entry.unlocked).length,
      commemorative_count: commemorativeCards.filter(entry => entry.unlocked).length,
      title_count: titleCards.filter(entry => entry.unlocked).length,
      achievement_count: achievementCards.filter(entry => entry.unlocked).length,
    },
  };
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeUsername(value) {
  return String(value || '').normalize('NFKC').trim();
}

function normalizeStoredProfile(profile) {
  const avatarImageUrl = sanitizeText(profile?.avatar_image_url, 500);
  const avatarImageState = avatarImageUrl
    ? taoyuanImageModeration.getUploadedImagePublicState(avatarImageUrl)
    : { visible: true };
  return {
    visibility: normalizeVisibility(profile?.visibility),
    public_intro: sanitizeText(profile?.public_intro, 120),
    manor_name: sanitizeText(profile?.manor_name, 40),
    public_title: sanitizeText(profile?.public_title, 24),
    neighborhood_role: sanitizeText(profile?.neighborhood_role, 24),
    showcase_theme: sanitizeText(profile?.showcase_theme, 24),
    avatar_image_url: avatarImageState.visible ? avatarImageUrl : '',
    avatar_image_alt: sanitizeText(profile?.avatar_image_alt, 120) || '名片头像',
    selected_tag_ids: Array.isArray(profile?.selected_tag_ids)
      ? Array.from(new Set(profile.selected_tag_ids.map(entry => String(entry).trim()).filter(entry => PROFILE_TAG_LABELS[entry]))).slice(0, 3)
      : [],
    public_since: Math.max(0, Math.floor(Number(profile?.public_since) || 0)),
    updated_at: Number(profile?.updated_at) || 0,
    last_active_at: Number(profile?.last_active_at) || 0,
  };
}

function getStoredProfile(username) {
  const store = loadSocialProfileStore();
  const key = String(username || '').trim();
  return normalizeStoredProfile(store.profiles?.[key] || DEFAULT_PROFILE);
}

function updateStoredProfile(username, patch = {}) {
  const store = loadSocialProfileStore();
  const key = String(username || '').trim();
  const current = normalizeStoredProfile(store.profiles?.[key] || DEFAULT_PROFILE);
  const normalizedVisibility = normalizeVisibility(patch?.visibility ?? current.visibility);
  const nextPublicSince = normalizedVisibility === 'public'
    ? (current.public_since > 0 ? current.public_since : Math.floor(Date.now() / 1000))
    : current.public_since;
  const next = normalizeStoredProfile({
    ...current,
    ...patch,
    visibility: normalizedVisibility,
    public_since: nextPublicSince,
    updated_at: Math.floor(Date.now() / 1000),
    last_active_at: Math.floor(Date.now() / 1000),
  });
  store.profiles[key] = next;
  saveSocialProfileStore(store);
  return next;
}

function buildSeasonProgress(game = {}) {
  const season = typeof game.season === 'string' ? game.season : '';
  const day = Number.isFinite(Number(game.day)) ? Number(game.day) : 0;
  const year = Number.isFinite(Number(game.year)) ? Number(game.year) : 0;
  if (!SEASON_LABELS[season] || day <= 0 || year <= 0) return '当前季节未同步';
  return `第${year}年 ${SEASON_LABELS[season]} 第${day}天`;
}

function inferPrimaryFocus(skill = {}) {
  const skills = Array.isArray(skill.skills) ? skill.skills : [];
  if (skills.length === 0) return '田庄经营';
  const highest = [...skills]
    .filter(entry => entry && typeof entry === 'object' && typeof entry.type === 'string')
    .sort((left, right) => (Number(right.level) || 0) - (Number(left.level) || 0))[0];
  return SKILL_FOCUS_LABELS[highest?.type] || '田庄经营';
}

function inferPublicTitle(skill = {}) {
  const skills = Array.isArray(skill.skills) ? skill.skills : [];
  if (skills.length === 0) return '桃源新居民';
  const highest = [...skills]
    .filter(entry => entry && typeof entry === 'object' && typeof entry.type === 'string')
    .sort((left, right) => (Number(right.level) || 0) - (Number(left.level) || 0))[0];
  return SKILL_TITLE_LABELS[highest?.type] || '桃源新居民';
}

function buildHonorific(player = {}) {
  return player?.gender === 'female' ? '姑娘' : '小哥';
}

function buildManorName(player = {}, home = {}, storedProfile = DEFAULT_PROFILE) {
  if (storedProfile.manor_name) return storedProfile.manor_name;
  const playerName = sanitizeText(player?.playerName, 20) || '未命名玩家';
  const farmhouseLevel = Number(home?.farmhouseLevel);
  const farmhouseName = FARMHOUSE_LEVEL_LABELS[farmhouseLevel] || '田庄';
  return `${playerName}的${farmhouseName}`;
}

function buildThemeLabel(goal = {}, game = {}, storedProfile = DEFAULT_PROFILE) {
  if (storedProfile.showcase_theme) return storedProfile.showcase_theme;
  const currentThemeWeekState = goal?.currentThemeWeekState;
  const season = typeof game.season === 'string' ? game.season : '';
  const weekOfSeason = Number(currentThemeWeekState?.weekOfSeason);
  if (SEASON_LABELS[season] && Number.isInteger(weekOfSeason) && weekOfSeason > 0) {
    return `${SEASON_LABELS[season]}季第${weekOfSeason}周`;
  }
  return '本周经营展示';
}

function buildRecentActivityText(saveContext, activeQuestCount) {
  const savedAt = saveContext?.saveContainer?.root?.meta?.savedAt || saveContext?.saveContainer?.root?.savedAt || '';
  if (!savedAt) {
    return activeQuestCount > 0 ? `最近在整理 ${activeQuestCount} 条进行中任务` : '最近在打理田庄';
  }
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return activeQuestCount > 0 ? `最近在整理 ${activeQuestCount} 条进行中任务` : '最近在打理田庄';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `最近同步于 ${month}-${day} ${hour}:${minute}`;
}

function formatShortDateTime(timestamp) {
  const normalized = Math.max(0, Math.floor(Number(timestamp) || 0));
  if (normalized <= 0) return '';
  const date = new Date(normalized * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function derivePlayerChronicleCandidates(username, storedProfile = DEFAULT_PROFILE) {
  const normalizedUsername = normalizeUsername(username);
  const guestbookEntries = readGuestbookEntries();
  const visitEntries = readVisitEntries();
  const favoriteEntries = readFavoriteEntries();
  const coopReceipts = readCoopOrderReceipts();
  const societyStore = readSocietyStore();

  const firstPublicManor = storedProfile.public_since > 0
    ? buildChronicleCandidate(
        storedProfile.public_since,
        `在 ${formatShortDateTime(storedProfile.public_since)} 首次把庄园公开出来。`,
        'profile',
        normalizedUsername
      )
    : null;

  const firstVisitReceived = pickEarliestCandidate(
    visitEntries
      .filter(entry => normalizeUsername(entry?.target_username) === normalizedUsername)
      .map(entry => buildChronicleCandidate(
        entry?.created_at,
        `${sanitizeText(entry?.visitor_display_name, 40) || normalizeUsername(entry?.visitor_username) || '访客'}第一次来访，目的为${VISIT_PURPOSE_LABELS[normalizeVisitPurpose(entry?.purpose)] || '普通来访'}。`,
        'manor_visit',
        String(entry?.id || '')
      ))
  );

  const firstGuestbookReceived = pickEarliestCandidate(
    guestbookEntries
      .filter(entry => normalizeUsername(entry?.target_username) === normalizedUsername)
      .map(entry => {
        const kind = normalizeGuestbookKind(entry?.kind);
        const authorDisplayName = sanitizeText(entry?.author_display_name, 40) || normalizeUsername(entry?.author_username) || '访客';
        return buildChronicleCandidate(
          entry?.created_at,
          `${authorDisplayName}留下了第一条${GUESTBOOK_KIND_LABELS[kind] || '访客留言'}。`,
          'guestbook',
          String(entry?.id || '')
        );
      })
  );

  const firstCoopOrderCompleted = pickEarliestCandidate(
    coopReceipts
      .filter(entry => normalizeUsername(entry?.assignee_username) === normalizedUsername && ['confirmed', 'compensation_pending'].includes(String(entry?.status || '')))
      .map(entry => {
        const orderTitle = sanitizeText(entry?.stage_title || entry?.reward_label || '协作委托', 60);
        return buildChronicleCandidate(
          entry?.confirmed_at || entry?.updated_at || entry?.created_at,
          `完成了第一条协作委托结算：${orderTitle}。`,
          'coop_receipt',
          String(entry?.id || '')
        );
      })
  );

  const firstFestivalParticipation = pickEarliestCandidate(
    (() => {
      try {
        const context = getActiveSaveContext(normalizedUsername, null, '当前玩家没有可用存档');
        const memorials = Array.isArray(context?.data?.onlineFestivalRewards?.memorials)
          ? context.data.onlineFestivalRewards.memorials
          : [];
        return memorials.map(entry => buildChronicleCandidate(
          entry?.awarded_at,
          `参加了第一场节会：${sanitizeText(entry?.template_label, 40) || '节会活动'}。`,
          'festival_memorial',
          String(entry?.memorial_id || '')
        ));
      } catch {
        return [];
      }
    })()
  );

  const firstSocietyJoin = pickEarliestCandidate(
    [
      ...societyStore.societies
        .flatMap(society => Array.isArray(society?.members) ? society.members.map(member => ({
          society_name: sanitizeText(society?.name, 40),
          joined_at: member?.joined_at,
          source_type: 'society_member',
          source_id: sanitizeText(society?.id, 80) || sanitizeText(society?.name, 40),
          username: normalizeUsername(member?.username),
        })) : []),
      ...societyStore.society_join_requests
        .filter(entry => normalizeUsername(entry?.username) === normalizedUsername && String(entry?.status || '') === 'accepted')
        .map(entry => {
          const society = societyStore.societies.find(item => sanitizeText(item?.id, 80) === sanitizeText(entry?.society_id, 80));
          return {
            society_name: sanitizeText(society?.name, 40),
            joined_at: entry?.updated_at || entry?.created_at,
            source_type: 'society_join_request',
            source_id: sanitizeText(entry?.id, 80),
            username: normalizeUsername(entry?.username),
          };
        }),
    ]
      .filter(entry => entry.username === normalizedUsername)
      .map(entry => buildChronicleCandidate(
        entry.joined_at,
        `加入了村社「${entry.society_name || '未命名村社'}」。`,
        entry.source_type,
        entry.source_id
      ))
  );

  const firstPublicProjectContribution = pickEarliestCandidate(
    societyStore.societies
      .flatMap(society => Array.isArray(society?.public_projects) ? society.public_projects.map(project => ({
        society_name: sanitizeText(society?.name, 40),
        project_label: sanitizeText(project?.label, 40) || sanitizeText(project?.id, 40),
        contributions: Array.isArray(project?.contributions) ? project.contributions : [],
      })) : [])
      .flatMap(entry => entry.contributions.map(contribution => ({
        ...entry,
        contribution,
      })))
      .filter(entry => normalizeUsername(entry.contribution?.username) === normalizedUsername)
      .map(entry => buildChronicleCandidate(
        entry.contribution?.created_at,
        `为「${entry.society_name || '村社'}」的公共建设「${entry.project_label || '公共工程'}」提交了第一笔贡献。`,
        'society_public_project',
        String(entry.contribution?.id || '')
      ))
  );

  const hotBoardUsernames = Array.from(
    favoriteEntries.reduce((acc, entry) => {
      const manorUsername = normalizeUsername(entry?.manor_username);
      if (!manorUsername) return acc;
      const current = acc.get(manorUsername) || 0;
      acc.set(manorUsername, current + 1);
      return acc;
    }, new Map())
      .entries()
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([manorUsername]) => manorUsername);
  const favoriteTimestamps = favoriteEntries
    .filter(entry => normalizeUsername(entry?.manor_username) === normalizedUsername)
    .map(entry => Math.max(0, Math.floor(Number(entry?.created_at) || 0)))
    .filter(entry => entry > 0)
    .sort((left, right) => left - right);
  const firstHotManor = hotBoardUsernames.includes(normalizedUsername)
    ? buildChronicleCandidate(
        favoriteTimestamps[0] || storedProfile.public_since || nowSeconds(),
        '庄园第一次进入可回看的热门榜单。',
        'manor_hot_board',
        normalizedUsername
      )
    : null;

  return {
    first_public_manor: firstPublicManor,
    first_visit_received: firstVisitReceived,
    first_guestbook_received: firstGuestbookReceived,
    first_coop_order_completed: firstCoopOrderCompleted,
    first_festival_participation: firstFestivalParticipation,
    first_society_join: firstSocietyJoin,
    first_public_project_contribution: firstPublicProjectContribution,
    first_hot_manor: firstHotManor,
  };
}

function syncPlayerChronicle(username, storedProfile = DEFAULT_PROFILE) {
  const store = loadPlayerChronicleStore();
  const candidates = derivePlayerChronicleCandidates(username, storedProfile);
  let changed = false;
  for (const [milestoneId, candidate] of Object.entries(candidates)) {
    if (persistPlayerChronicleCandidate(store, username, milestoneId, candidate)) {
      changed = true;
    }
  }
  const entry = ensurePlayerChronicleEntry(store, username);
  if (changed) savePlayerChronicleStore(store);
  return {
    milestones: buildPlayerChronicleMilestoneSnapshots(entry),
    updated_at: entry.updated_at,
  };
}

function resolveActiveSaveContext(username, preferredSlot = null) {
  try {
    return getActiveSaveContext(username, preferredSlot, '该玩家当前没有可公开的个人存档');
  } catch {
    return null;
  }
}

function normalizeSocialSaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0;
}

function normalizeSocialSaveSlot(value) {
  if (value === null || value === undefined || value === '') return null;
  const saveSlot = Number(value);
  return Number.isInteger(saveSlot) && saveSlot >= 0 && saveSlot <= 2 ? saveSlot : null;
}

function normalizeSaveFriendSide(username, identity = {}) {
  return {
    username: normalizeUsername(identity?.account_username || username),
    save_id: normalizeSocialSaveId(identity?.save_id),
    save_slot: normalizeSocialSaveSlot(identity?.save_slot),
  };
}

function sortSaveFriendSides(left, right) {
  if (left.save_id && right.save_id && left.save_id !== right.save_id) {
    return left.save_id < right.save_id ? [left, right] : [right, left];
  }
  return left.username.localeCompare(right.username, 'zh-CN') <= 0 ? [left, right] : [right, left];
}

function normalizeFriendRequest(request) {
  return {
    id: String(request?.id || makeId('friend_req')),
    from_username: normalizeUsername(request?.from_username),
    to_username: normalizeUsername(request?.to_username),
    from_save_id: normalizeSocialSaveId(request?.from_save_id),
    to_save_id: normalizeSocialSaveId(request?.to_save_id),
    from_save_slot: normalizeSocialSaveSlot(request?.from_save_slot),
    to_save_slot: normalizeSocialSaveSlot(request?.to_save_slot),
    status: ['pending', 'accepted', 'rejected'].includes(String(request?.status)) ? String(request.status) : 'pending',
    created_at: Number(request?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(request?.updated_at) || Number(request?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeFriendship(friendship) {
  const left = normalizeSaveFriendSide(friendship?.username_a, {
    save_id: friendship?.save_id_a,
    save_slot: friendship?.save_slot_a,
  });
  const right = normalizeSaveFriendSide(friendship?.username_b, {
    save_id: friendship?.save_id_b,
    save_slot: friendship?.save_slot_b,
  });
  const [sideA, sideB] = sortSaveFriendSides(left, right);
  return {
    id: String(friendship?.id || makeId('friendship')),
    username_a: sideA.username,
    username_b: sideB.username,
    save_id_a: sideA.save_id,
    save_id_b: sideB.save_id,
    save_slot_a: sideA.save_slot,
    save_slot_b: sideB.save_slot,
    created_at: Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(friendship?.updated_at) || Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
    last_interaction_at: Number(friendship?.last_interaction_at) || Number(friendship?.updated_at) || Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeBlockRelation(entry) {
  const blockerSide = normalizeSaveFriendSide(entry?.blocker_username, {
    save_id: entry?.blocker_save_id,
    save_slot: entry?.blocker_save_slot,
  });
  const blockedSide = normalizeSaveFriendSide(entry?.blocked_username, {
    save_id: entry?.blocked_save_id,
    save_slot: entry?.blocked_save_slot,
  });
  return {
    id: String(entry?.id || makeId('block')),
    blocker_username: blockerSide.username,
    blocked_username: blockedSide.username,
    blocker_save_id: blockerSide.save_id,
    blocked_save_id: blockedSide.save_id,
    blocker_save_slot: blockerSide.save_slot,
    blocked_save_slot: blockedSide.save_slot,
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeSocialReport(entry) {
  return {
    id: String(entry?.id || makeId('social_report')),
    reporter_username: normalizeUsername(entry?.reporter_username),
    reporter_save_id: normalizeSocialSaveId(entry?.reporter_save_id),
    reporter_save_slot: normalizeSocialSaveSlot(entry?.reporter_save_slot),
    target_username: normalizeUsername(entry?.target_username),
    target_save_id: normalizeSocialSaveId(entry?.target_save_id),
    target_save_slot: normalizeSocialSaveSlot(entry?.target_save_slot),
    reason: sanitizeText(entry?.reason, 80) || '未填写原因',
    detail: sanitizeText(entry?.detail, 300),
    source: sanitizeText(entry?.source, 40) || 'friend_lobby',
    status: ['open', 'reviewed', 'dismissed'].includes(String(entry?.status)) ? String(entry.status) : 'open',
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeNeighborMember(entry) {
  return {
    username: normalizeUsername(entry?.username),
    role: ['leader', 'manager', 'member'].includes(String(entry?.role)) ? String(entry.role) : 'member',
    joined_at: Number(entry?.joined_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeNeighborGroup(entry) {
  const members = Array.isArray(entry?.members) ? entry.members.map(normalizeNeighborMember).filter(member => member.username) : [];
  return {
    id: String(entry?.id || makeId('neighbor_group')),
    name: sanitizeText(entry?.name, 24),
    summary: sanitizeText(entry?.summary, 120),
    notice: sanitizeText(entry?.notice, 160),
    level: Math.max(1, Number(entry?.level) || 1),
    capacity: Math.max(3, Number(entry?.capacity) || 12),
    created_by: normalizeUsername(entry?.created_by),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    members,
    activity_log: Array.isArray(entry?.activity_log)
      ? entry.activity_log
          .filter(log => log && typeof log === 'object')
          .map(log => ({
            id: String(log.id || makeId('neighbor_log')),
            type: sanitizeText(log.type, 24) || 'activity',
            message: sanitizeText(log.message, 120),
            created_at: Number(log.created_at) || Math.floor(Date.now() / 1000),
          }))
      : [],
  };
}

function normalizeNeighborJoinRequest(entry) {
  return {
    id: String(entry?.id || makeId('neighbor_join')),
    group_id: String(entry?.group_id || ''),
    username: normalizeUsername(entry?.username),
    invited_by: normalizeUsername(entry?.invited_by),
    type: entry?.type === 'invite' ? 'invite' : 'apply',
    status: ['pending', 'accepted', 'rejected'].includes(String(entry?.status)) ? String(entry.status) : 'pending',
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeSubscription(entry) {
  return {
    id: String(entry?.id || makeId('subscription')),
    subscriber_username: normalizeUsername(entry?.subscriber_username),
    target_type: ['style', 'expert', 'neighbor_group', 'festival'].includes(String(entry?.target_type)) ? String(entry.target_type) : 'style',
    target_id: sanitizeText(entry?.target_id, 64),
    label: sanitizeText(entry?.label, 40),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function buildPairKey(left, right) {
  return [normalizeUsername(left), normalizeUsername(right)].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('::');
}

function buildSavePairKey(leftSaveId, rightSaveId) {
  const left = normalizeSocialSaveId(leftSaveId);
  const right = normalizeSocialSaveId(rightSaveId);
  if (!left || !right) return '';
  return [left, right].sort((a, b) => a - b).join('::');
}

function getFriendshipSide(friendship, side) {
  const normalized = normalizeFriendship(friendship);
  return side === 'b'
    ? normalizeSaveFriendSide(normalized.username_b, {
        save_id: normalized.save_id_b,
        save_slot: normalized.save_slot_b,
      })
    : normalizeSaveFriendSide(normalized.username_a, {
        save_id: normalized.save_id_a,
        save_slot: normalized.save_slot_a,
      });
}

function buildFriendshipSavePairKey(friendship) {
  const normalized = normalizeFriendship(friendship);
  return buildSavePairKey(normalized.save_id_a, normalized.save_id_b);
}

function buildFriendRequestSavePairKey(request) {
  const normalized = normalizeFriendRequest(request);
  return buildSavePairKey(normalized.from_save_id, normalized.to_save_id);
}

function buildBlockSavePairKey(entry) {
  const normalized = normalizeBlockRelation(entry);
  return buildSavePairKey(normalized.blocker_save_id, normalized.blocked_save_id);
}

function blockRelationMatchesDirection(entry, blocker, blocked, blockerIdentity = null, blockedIdentity = null) {
  const normalized = normalizeBlockRelation(entry);
  const normalizedBlocker = normalizeUsername(blocker);
  const normalizedBlocked = normalizeUsername(blocked);
  if (normalized.blocker_username !== normalizedBlocker || normalized.blocked_username !== normalizedBlocked) {
    return false;
  }

  const blockerSaveId = normalizeSocialSaveId(blockerIdentity?.save_id);
  const blockedSaveId = normalizeSocialSaveId(blockedIdentity?.save_id);
  const requestedSavePairKey = buildSavePairKey(blockerSaveId, blockedSaveId);
  const storedSavePairKey = buildBlockSavePairKey(normalized);
  if (requestedSavePairKey && storedSavePairKey) {
    return normalized.blocker_save_id === blockerSaveId && normalized.blocked_save_id === blockedSaveId;
  }
  if (blockerSaveId && normalized.blocker_save_id && normalized.blocker_save_id !== blockerSaveId) return false;
  if (blockedSaveId && normalized.blocked_save_id && normalized.blocked_save_id !== blockedSaveId) return false;
  return true;
}

function blockRelationBelongsToUser(entry, username, identity = null) {
  const normalized = normalizeBlockRelation(entry);
  const normalizedUsername = normalizeUsername(username);
  const saveId = normalizeSocialSaveId(identity?.save_id);
  if (saveId && normalized.blocker_save_id) {
    return normalized.blocker_save_id === saveId;
  }
  return normalized.blocker_username === normalizedUsername;
}

function isBlocked(store, left, right, leftIdentity = null, rightIdentity = null) {
  return store.blocks
    .map(normalizeBlockRelation)
    .some(entry =>
      blockRelationMatchesDirection(entry, left, right, leftIdentity, rightIdentity) ||
      blockRelationMatchesDirection(entry, right, left, rightIdentity, leftIdentity)
    );
}

function findFriendship(store, left, right, leftIdentity = null, rightIdentity = null) {
  const pairKey = buildPairKey(left, right);
  const savePairKey = buildSavePairKey(leftIdentity?.save_id, rightIdentity?.save_id);
  return store.friendships
    .map(normalizeFriendship)
    .find(entry => {
      const entrySavePairKey = buildFriendshipSavePairKey(entry);
      if (savePairKey && entrySavePairKey) return entrySavePairKey === savePairKey;
      return buildPairKey(entry.username_a, entry.username_b) === pairKey;
    }) || null;
}

function findPendingRequest(store, left, right, leftIdentity = null, rightIdentity = null) {
  const normalizedLeft = normalizeUsername(left);
  const normalizedRight = normalizeUsername(right);
  const savePairKey = buildSavePairKey(leftIdentity?.save_id, rightIdentity?.save_id);
  return store.friend_requests
    .map(normalizeFriendRequest)
    .find(entry =>
      entry.status === 'pending' &&
      (
        savePairKey && buildFriendRequestSavePairKey(entry)
          ? buildFriendRequestSavePairKey(entry) === savePairKey
          : (
              (entry.from_username === normalizedLeft && entry.to_username === normalizedRight) ||
              (entry.from_username === normalizedRight && entry.to_username === normalizedLeft)
            )
      )
    ) || null;
}

function friendshipBelongsToUser(friendship, username, identity = null) {
  const normalized = normalizeFriendship(friendship);
  const normalizedUsername = normalizeUsername(username);
  const saveId = normalizeSocialSaveId(identity?.save_id);
  if (saveId && (normalized.save_id_a || normalized.save_id_b)) {
    return normalized.save_id_a === saveId || normalized.save_id_b === saveId;
  }
  return normalized.username_a === normalizedUsername || normalized.username_b === normalizedUsername;
}

function countFriendships(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return store.friendships
    .map(normalizeFriendship)
    .filter(entry => entry.username_a === normalizedUsername || entry.username_b === normalizedUsername)
    .length;
}

function getGameplayLevel(gameplay = {}) {
  const player = gameplay.player || {};
  const skill = gameplay.skill || {};
  const directLevel = Number(player.level ?? player.playerLevel ?? gameplay.level);
  if (Number.isFinite(directLevel) && directLevel > 0) return Math.floor(directLevel);
  const skills = Array.isArray(skill.skills) ? skill.skills : [];
  const levels = skills
    .map(entry => Number(entry?.level) || 0)
    .filter(level => level > 0);
  if (levels.length === 0) return 1;
  return Math.max(1, Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length));
}

function getFriendSaveIdsForIdentity(store, identity = null) {
  const ownSaveId = normalizeSocialSaveId(identity?.save_id);
  const ownUsername = normalizeUsername(identity?.account_username);
  if (!ownSaveId && !ownUsername) return new Set();

  const result = new Set();
  for (const friendship of store.friendships.map(normalizeFriendship)) {
    const sideA = getFriendshipSide(friendship, 'a');
    const sideB = getFriendshipSide(friendship, 'b');
    const matchesA = ownSaveId ? sideA.save_id === ownSaveId : sideA.username === ownUsername;
    const matchesB = ownSaveId ? sideB.save_id === ownSaveId : sideB.username === ownUsername;
    if (matchesA && sideB.save_id) result.add(sideB.save_id);
    if (matchesB && sideA.save_id) result.add(sideA.save_id);
  }
  return result;
}

function countMutualFriends(store, viewerIdentity = null, targetIdentity = null) {
  const viewerFriends = getFriendSaveIdsForIdentity(store, viewerIdentity);
  const targetFriends = getFriendSaveIdsForIdentity(store, targetIdentity);
  let count = 0;
  for (const saveId of viewerFriends) {
    if (targetFriends.has(saveId)) count += 1;
  }
  return count;
}

function getRelationshipStatus(store, viewerUsername, viewerIdentity = null, targetUsername, targetIdentity = null) {
  if (isBlocked(store, viewerUsername, targetUsername, viewerIdentity, targetIdentity)) return 'blocked';
  if (findFriendship(store, viewerUsername, targetUsername, viewerIdentity, targetIdentity)) return 'friend';
  const pending = findPendingRequest(store, viewerUsername, targetUsername, viewerIdentity, targetIdentity);
  if (!pending) return 'none';
  if (pending.from_username === normalizeUsername(viewerUsername)) return 'pending_outgoing';
  return 'pending_incoming';
}

function normalizeFriendLookupKey(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
}

function pushFriendTargetMatch(matches, match) {
  const username = normalizeUsername(match?.username);
  const identity = match?.identity || null;
  const saveId = normalizeSocialSaveId(identity?.save_id);
  const key = `${username}::${saveId || 0}`;
  const existing = matches.find(item => item.key === key);
  if (existing) {
    existing.aliases = [...new Set([...existing.aliases, ...(match.aliases || [])])];
    return;
  }
  matches.push({
    key,
    username,
    identity,
    aliases: [...new Set(match.aliases || [])],
  });
}

async function resolveFriendTargetByAlias(viewerUsername, rawTarget) {
  const viewer = normalizeUsername(viewerUsername);
  const lookupKey = normalizeFriendLookupKey(rawTarget);
  if (!viewer || !lookupKey) return null;

  const store = loadSocialProfileStore();
  const viewerIdentity = resolveActiveSaveContext(viewer)?.identity || null;
  const matches = [];

  for (const friendship of store.friendships.map(normalizeFriendship)) {
    if (!friendshipBelongsToUser(friendship, viewer, viewerIdentity)) continue;

    const sideA = getFriendshipSide(friendship, 'a');
    const sideB = getFriendshipSide(friendship, 'b');
    const ownSide = viewerIdentity?.save_id && sideB.save_id === viewerIdentity.save_id
      ? sideB
      : sideA.username === viewer
        ? sideA
        : sideB;
    const friendSide = ownSide === sideA ? sideB : sideA;
    if (!friendSide.username) continue;

    const identity = (friendSide.save_id
      ? findSaveIdentityById(friendSide.save_id)
      : resolveActiveSaveContext(friendSide.username, friendSide.save_slot)?.identity) || (
      friendSide.save_id
        ? {
            save_id: friendSide.save_id,
            account_username: friendSide.username,
            save_slot: friendSide.save_slot,
          }
        : null
    );
    let profile = null;
    try {
      profile = await buildRelationCard(friendSide.username, viewer, {
        preferredSlot: friendSide.save_slot,
      });
    } catch {
      profile = null;
    }

    const aliases = [
      friendSide.username,
      friendSide.save_id ? String(friendSide.save_id) : '',
      identity?.nickname_snapshot || '',
      profile?.username || '',
      profile?.display_name || '',
      profile?.player_name || '',
    ].filter(Boolean);

    if (aliases.some(alias => normalizeFriendLookupKey(alias) === lookupKey)) {
      pushFriendTargetMatch(matches, {
        username: friendSide.username,
        identity,
        aliases,
      });
    }
  }

  if (matches.length > 1) {
    throw createError('匹配到多个同名好友，请改用 9 位存档 ID 邀请', 409);
  }

  return matches[0]
    ? {
        username: matches[0].username,
        identity: matches[0].identity,
        aliases: matches[0].aliases,
      }
    : null;
}

function normalizeDiscoveryMode(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'online') return 'online';
  if (normalized === 'recent') return 'recent';
  return 'all';
}

function normalizeDiscoveryQuery(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN').slice(0, 60);
}

function getRandomSeed(value) {
  const text = String(value || '');
  let seed = 0;
  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) >>> 0;
  }
  return seed;
}

function seededJitter(seed, index) {
  let value = (seed + index * 1103515245 + 12345) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) % 1000;
}

function normalizePresenceRecords(records = []) {
  const bySaveId = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const saveId = normalizeSocialSaveId(record?.save_id);
    const username = normalizeUsername(record?.username);
    if (!saveId && !username) continue;
    const key = saveId ? `save:${saveId}` : `user:${username}`;
    const current = bySaveId.get(key);
    const next = {
      save_id: saveId,
      username,
      status: record?.status === 'online' ? 'online' : 'offline',
      last_seen_at: Math.floor((Number(record?.last_seen_at) || 0) / 1000),
    };
    if (!current || next.last_seen_at >= current.last_seen_at) bySaveId.set(key, next);
  }
  return bySaveId;
}

function isProfileDiscoverable(storedProfile = DEFAULT_PROFILE) {
  const profile = normalizeStoredProfile(storedProfile);
  return profile.visibility === 'public';
}

function buildAutoTagIds(store, username, gameplay = {}) {
  const result = new Set();
  const skill = gameplay.skill || {};
  const breeding = gameplay.breeding || {};
  const museum = gameplay.museum || {};
  const goal = gameplay.goal || {};
  const decoration = gameplay.decoration || {};
  const regionMap = gameplay.regionMap || {};

  const skills = Array.isArray(skill.skills) ? skill.skills : [];
  if ((skills.find(entry => entry?.type === 'farming')?.level ?? 0) >= 6) result.add('farming');
  if ((skills.find(entry => entry?.type === 'fishing')?.level ?? 0) >= 6) result.add('fishing');
  if (breeding?.unlocked || (Array.isArray(breeding?.compendium) ? breeding.compendium.length : 0) > 0 || (Array.isArray(breeding?.breedingBox) ? breeding.breedingBox.length : 0) > 0) {
    result.add('breeding');
  }
  if ((Array.isArray(museum?.donatedItems) ? museum.donatedItems.length : 0) >= 5) result.add('collection');
  if (goal?.currentThemeWeekState || goal?.eventOperationsState?.activeCampaignId) result.add('festival');
  if (countFriendships(store, username) > 0 || findMemberGroup(store, username)) result.add('mutual_aid');
  const placedDecorationCount = Object.values(decoration?.placed ?? {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  if (placedDecorationCount >= 3) result.add('decoration');
  if ((Array.isArray(regionMap?.journeyHistory) ? regionMap.journeyHistory.length : 0) > 0) result.add('exploration');
  return PROFILE_TAG_OPTIONS.map(entry => entry.id).filter(id => result.has(id));
}

function buildPublicTags(store, username, gameplay, storedProfile) {
  const autoTagIds = buildAutoTagIds(store, username, gameplay);
  const selectedTagIds = storedProfile.selected_tag_ids || [];
  const orderedIds = [];
  for (const id of selectedTagIds) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }
  for (const id of autoTagIds) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }
  return orderedIds.map(id => ({
    id,
    label: PROFILE_TAG_LABELS[id],
    source: selectedTagIds.includes(id) ? 'selected' : 'auto',
  }));
}

function findNeighborGroupById(store, groupId) {
  return store.neighbor_groups
    .map(normalizeNeighborGroup)
    .find(entry => entry.id === String(groupId || '').trim()) || null;
}

function findMemberGroup(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return store.neighbor_groups
    .map(normalizeNeighborGroup)
    .find(group => group.members.some(member => member.username === normalizedUsername)) || null;
}

function appendNeighborActivity(group, message, type = 'activity') {
  const nextLog = {
    id: makeId('neighbor_log'),
    type,
    message: sanitizeText(message, 120),
    created_at: Math.floor(Date.now() / 1000),
  };
  group.activity_log = [nextLog, ...(group.activity_log || [])].slice(0, 20);
  group.updated_at = Math.floor(Date.now() / 1000);
  return group;
}

function listSubscriptionsForUser(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return store.subscriptions
    .map(normalizeSubscription)
    .filter(entry => entry.subscriber_username === normalizedUsername)
    .sort((left, right) => right.created_at - left.created_at);
}

function isFriendWith(username, targetUsername) {
  if (normalizeUsername(username) === normalizeUsername(targetUsername)) return true;
  const store = loadSocialProfileStore();
  return !!findFriendship(store, username, targetUsername);
}

function isSaveFriendWith(saveId, targetSaveId) {
  const normalizedSaveId = normalizeSocialSaveId(saveId);
  const normalizedTargetSaveId = normalizeSocialSaveId(targetSaveId);
  if (!normalizedSaveId || !normalizedTargetSaveId) return false;
  if (normalizedSaveId === normalizedTargetSaveId) return true;
  const store = loadSocialProfileStore();
  return !!findFriendship(store, '', '', { save_id: normalizedSaveId }, { save_id: normalizedTargetSaveId });
}

function isNeighborWith(username, targetUsername) {
  if (normalizeUsername(username) === normalizeUsername(targetUsername)) return true;
  const store = loadSocialProfileStore();
  const leftGroup = findMemberGroup(store, username);
  const rightGroup = findMemberGroup(store, targetUsername);
  return !!leftGroup && !!rightGroup && leftGroup.id === rightGroup.id;
}

function getNeighborGroupForUser(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;
  const store = loadSocialProfileStore();
  const group = findMemberGroup(store, normalizedUsername);
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    summary: group.summary,
    notice: group.notice,
    level: group.level,
    capacity: group.capacity,
    member_count: Array.isArray(group.members) ? group.members.length : 0,
    role: group.members.find(member => member.username === normalizedUsername)?.role ?? 'member',
  };
}

function listNeighborGroupMemberUsernames(groupId) {
  const normalizedGroupId = String(groupId || '').trim();
  if (!normalizedGroupId) return [];
  const store = loadSocialProfileStore();
  const group = (store.neighbor_groups || [])
    .map(normalizeNeighborGroup)
    .find(entry => entry.id === normalizedGroupId);
  if (!group) return [];
  return [...new Set(
    (group.members || [])
      .map(member => normalizeUsername(member?.username))
      .filter(Boolean)
  )];
}

async function buildProfile(username, viewerUsername = '', options = {}) {
  const user = await db.getUser(username);
  if (!user) throw createError('玩家不存在', 404);

  const store = loadSocialProfileStore();
  const saveContext = resolveActiveSaveContext(username, options.preferredSlot ?? null);
  const gameplay = saveContext?.data || {};
  const storedProfile = normalizeStoredProfile(store.profiles?.[String(username || '').trim()] || DEFAULT_PROFILE);
  const isOwner = viewerUsername && viewerUsername === username;

  if (!isOwner && options.ignoreVisibility !== true && storedProfile.visibility !== 'public') {
    throw createError('该玩家未公开名片', 403);
  }

  const player = gameplay.player || {};
  const home = gameplay.home || {};
  const game = gameplay.game || {};
  const goal = gameplay.goal || {};
  const quest = gameplay.quest || {};
  const skill = gameplay.skill || {};
  const activeQuestCount = Array.isArray(quest.activeQuests) ? quest.activeQuests.length : 0;
  const publicTags = buildPublicTags(store, username, gameplay, storedProfile);
  const playerChronicle = options.includeChronicle === false ? null : syncPlayerChronicle(username, storedProfile);
  const awardShowcase = options.includeAwards === false
    ? {
        honors: [],
        commemoratives: [],
        titles: [],
        achievement_cards: [],
        summary: {
          honor_count: 0,
          commemorative_count: 0,
          title_count: 0,
          achievement_count: 0,
        },
      }
    : buildPlayerAwardShowcase(username, storedProfile, saveContext, playerChronicle);

  return {
    username: user.username,
    display_name: user.display_name || user.username,
    player_name: sanitizeText(player.playerName, 20) || user.display_name || user.username,
    honorific: buildHonorific(player),
    manor_name: buildManorName(player, home, storedProfile),
    season_progress: buildSeasonProgress(game),
    primary_route_label: inferPrimaryFocus(skill),
    recent_activity: buildRecentActivityText(saveContext, activeQuestCount),
    public_title: storedProfile.public_title || inferPublicTitle(skill),
    neighborhood_role: storedProfile.neighborhood_role || '未加入邻里',
    showcase_theme: buildThemeLabel(goal, game, storedProfile),
    public_intro: storedProfile.public_intro,
    avatar_image_url: storedProfile.avatar_image_url,
    avatar_image_alt: storedProfile.avatar_image_alt,
    visibility: storedProfile.visibility,
    active_quest_count: activeQuestCount,
    public_tags: publicTags,
    selected_tag_ids: [...storedProfile.selected_tag_ids],
    available_tag_options: PROFILE_TAG_OPTIONS.map(entry => ({ ...entry })),
    player_chronicle: playerChronicle,
    award_showcase: awardShowcase,
    updated_at: storedProfile.updated_at,
    last_active_at: storedProfile.last_active_at,
  };
}

async function buildRelationCard(username, viewerUsername = '', options = {}) {
  return buildProfile(username, viewerUsername, {
    ignoreVisibility: true,
    includeChronicle: false,
    includeAwards: false,
    preferredSlot: options.preferredSlot ?? null,
  });
}

async function getOwnProfile(username) {
  updateStoredProfile(username, {});
  return buildProfile(username, username);
}

async function getPublicProfile(username, viewerUsername = '') {
  return buildProfile(username, viewerUsername);
}

async function searchPlayerBySaveId(viewerUsername, rawSaveId) {
  const saveId = Number(rawSaveId);
  if (!Number.isInteger(saveId)) throw createError('请填写 9 位数字存档 ID');

  const identity = findSaveIdentityById(saveId);
  if (!identity) throw createError('没有找到对应的存档玩家', 404);

  const profile = await buildProfile(identity.account_username, normalizeUsername(viewerUsername), {
    preferredSlot: identity.save_slot,
    includeChronicle: false,
    includeAwards: false,
  });

  return {
    save_identity: identity,
    profile,
  };
}

async function listFriendDiscovery(viewerUsername, options = {}) {
  const store = loadSocialProfileStore();
  const viewer = normalizeUsername(viewerUsername);
  const viewerContext = resolveActiveSaveContext(viewer);
  const viewerIdentity = viewerContext?.identity || null;
  const viewerLevel = getGameplayLevel(viewerContext?.data || {});
  const mode = normalizeDiscoveryMode(options.mode ?? options.filter);
  const query = normalizeDiscoveryQuery(options.query ?? options.q);
  const limit = Math.max(1, Math.min(30, Math.floor(Number(options.limit) || 12)));
  const now = Math.floor(Date.now() / 1000);
  const randomSeed = getRandomSeed(`${viewer}:${options.seed || now}:${query}:${mode}`);
  const presenceByKey = normalizePresenceRecords(options.presenceRecords || []);
  const identities = listSaveIdentities();
  const cards = [];

  for (let index = 0; index < identities.length; index += 1) {
    const identity = identities[index];
    const targetUsername = normalizeUsername(identity.account_username);
    if (!targetUsername) continue;
    if (viewerIdentity?.save_id && identity.save_id === viewerIdentity.save_id) continue;
    if (!viewerIdentity?.save_id && targetUsername === viewer) continue;
    if (!isProfileDiscoverable(store.profiles?.[targetUsername] || DEFAULT_PROFILE)) continue;

    const presence = presenceByKey.get(`save:${identity.save_id}`) || presenceByKey.get(`user:${targetUsername}`) || null;
    const targetContext = resolveActiveSaveContext(targetUsername, identity.save_slot);
    const storedProfile = normalizeStoredProfile(store.profiles?.[targetUsername] || DEFAULT_PROFILE);
    const lastActiveAt = Math.max(
      Number(storedProfile.last_active_at) || 0,
      Number(identity.updated_at) || 0,
      Math.floor((Number(targetContext?.saveContainer?.root?.meta?.savedAtMs) || 0) / 1000)
    );
    const isOnline = presence?.status === 'online' && presence.last_seen_at >= now - FRIEND_DISCOVERY_ONLINE_WINDOW_SECONDS;
    const isRecentlyActive = isOnline || lastActiveAt >= now - FRIEND_DISCOVERY_RECENT_WINDOW_SECONDS || (presence?.last_seen_at || 0) >= now - FRIEND_DISCOVERY_RECENT_WINDOW_SECONDS;
    if (mode === 'online' && !isOnline) continue;
    if (mode === 'recent' && !isRecentlyActive) continue;

    const relationStatus = getRelationshipStatus(store, viewer, viewerIdentity, targetUsername, identity);
    if (relationStatus === 'blocked') continue;

    let profile = null;
    try {
      profile = await buildRelationCard(targetUsername, viewer, {
        preferredSlot: identity.save_slot,
      });
    } catch {
      continue;
    }
    const searchBlob = [
      String(identity.save_id),
      targetUsername,
      identity.nickname_snapshot,
      profile.display_name,
      profile.player_name,
    ].join(' ').toLocaleLowerCase('zh-CN');
    if (query && !searchBlob.includes(query)) continue;

    const targetLevel = getGameplayLevel(targetContext?.data || {});
    const levelGap = Math.abs(viewerLevel - targetLevel);
    const mutualFriendCount = countMutualFriends(store, viewerIdentity, identity);
    const score =
      (isOnline ? 10000 : 0) +
      (isRecentlyActive ? 3000 : 0) +
      Math.max(0, 2000 - levelGap * 120) +
      mutualFriendCount * 500 +
      Math.min(1800, Math.max(0, lastActiveAt)) / 100000 +
      seededJitter(randomSeed, index);

    cards.push({
      save_identity: identity,
      profile,
      status: isOnline ? 'online' : isRecentlyActive ? 'recent' : 'offline',
      is_online: isOnline,
      is_recently_active: isRecentlyActive,
      last_seen_at: presence?.last_seen_at || 0,
      last_active_at: lastActiveAt,
      mutual_friend_count: mutualFriendCount,
      level: targetLevel,
      level_gap: levelGap,
      relation_status: relationStatus,
      recommendation_reasons: [
        ...(isOnline ? ['当前在线'] : []),
        ...(!isOnline && isRecentlyActive ? ['最近活跃'] : []),
        ...(levelGap <= 3 ? ['等级接近'] : []),
        ...(mutualFriendCount > 0 ? [`${mutualFriendCount} 位共同好友`] : []),
      ].slice(0, 3),
      score,
    });
  }

  const visibleCards = cards
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => entry);

  return {
    players: visibleCards,
    filters: {
      mode,
      query,
      limit,
    },
    summary: {
      total_visible: cards.length,
      returned: visibleCards.length,
      online: cards.filter(entry => entry.is_online).length,
      recent: cards.filter(entry => entry.is_recently_active).length,
    },
  };
}

function resolveOwnSaveIdentity(username) {
  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源乡存档，暂时无法发送好友申请');
  if (!context?.identity?.save_id) throw createError('当前存档缺少数字 ID，请重新打开服务端存档后再试');
  return context.identity;
}

function resolveFriendRequestTarget(payload) {
  if (payload && typeof payload === 'object') {
    const targetSaveId = Number(payload.target_save_id ?? payload.save_id);
    if (Number.isInteger(targetSaveId)) {
      const identity = findSaveIdentityById(targetSaveId);
      if (!identity) throw createError('目标存档 ID 不存在', 404);
      return {
        username: identity.account_username,
        identity,
      };
    }

    return {
      username: normalizeUsername(payload.target_username),
      identity: null,
    };
  }

  return {
    username: normalizeUsername(payload),
    identity: null,
  };
}

function resolveSocialTarget(payload) {
  if (payload && typeof payload === 'object') {
    const targetSaveId = Number(payload.target_save_id ?? payload.save_id);
    if (Number.isInteger(targetSaveId)) {
      const identity = findSaveIdentityById(targetSaveId);
      if (!identity) throw createError('目标存档 ID 不存在', 404);
      return {
        username: identity.account_username,
        identity,
      };
    }

    return {
      username: normalizeUsername(payload.target_username),
      identity: null,
    };
  }

  return {
    username: normalizeUsername(payload),
    identity: null,
  };
}

function resolveChatTargetForUser(username, payload = {}) {
  const viewer = normalizeUsername(username);
  const viewerIdentity = resolveActiveSaveContext(viewer)?.identity || null;
  const target = resolveSocialTarget(payload);
  const targetUsername = normalizeUsername(target.username);
  if (!targetUsername) throw createError('请先选择要私聊的好友');
  if (viewer === targetUsername && !target.identity) throw createError('不能给自己发私聊');
  if (viewerIdentity?.save_id && target.identity?.save_id && viewerIdentity.save_id === target.identity.save_id) {
    throw createError('不能给自己发私聊');
  }

  const store = loadSocialProfileStore();
  const relationStatus = getRelationshipStatus(store, viewer, viewerIdentity, targetUsername, target.identity);
  return {
    username: targetUsername,
    identity: target.identity,
    viewerIdentity,
    relation_status: relationStatus,
  };
}

function getRelationshipStatusForTarget(username, payload = {}) {
  return resolveChatTargetForUser(username, payload).relation_status;
}

async function updateOwnProfile(username, payload = {}, auditContext = {}) {
  const baseAuditContext = buildSocialAuditContext(auditContext, {
    scene: 'online_profile',
    username,
    content_type: 'online_profile',
    content_id: username,
  });
  const publicIntro = moderateText(payload.public_intro, {
    label: '公开介绍',
    field: 'public_intro',
    scene: 'online_profile',
    maxLength: 120,
    storageMaxLength: 120,
    maxLineBreaks: 3,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'public_intro' }),
  });
  const manorName = moderateText(payload.manor_name, {
    label: '庄园名',
    field: 'manor_name',
    scene: 'online_profile',
    maxLength: 40,
    storageMaxLength: 40,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'manor_name' }),
  });
  const publicTitle = moderateText(payload.public_title, {
    label: '公开称号',
    field: 'public_title',
    scene: 'online_profile',
    maxLength: 24,
    storageMaxLength: 24,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'public_title' }),
  });
  const neighborhoodRole = moderateText(payload.neighborhood_role, {
    label: '邻里身份',
    field: 'neighborhood_role',
    scene: 'online_profile',
    maxLength: 24,
    storageMaxLength: 24,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'neighborhood_role' }),
  });
  const showcaseTheme = moderateText(payload.showcase_theme, {
    label: '展示主题',
    field: 'showcase_theme',
    scene: 'online_profile',
    maxLength: 24,
    storageMaxLength: 24,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'showcase_theme' }),
  });
  const avatarImageUrl = sanitizeText(payload.avatar_image_url, 500);
  if (avatarImageUrl) {
    taoyuanImageModeration.ensureUsableUploadedImageUrl(avatarImageUrl, ['profile_avatar']);
  }
  const avatarImageAlt = avatarImageUrl
    ? (moderateText(payload.avatar_image_alt, {
        label: '头像说明',
        field: 'avatar_image_alt',
        scene: 'online_profile',
        maxLength: 120,
        storageMaxLength: 120,
        auditContext: buildSocialAuditContext(baseAuditContext, {
          field: 'avatar_image_alt',
          content_type: 'profile_avatar_alt',
        }),
      }) || '名片头像')
    : '';
  updateStoredProfile(username, {
    visibility: payload.visibility,
    public_intro: publicIntro,
    manor_name: manorName,
    public_title: publicTitle,
    neighborhood_role: neighborhoodRole,
    showcase_theme: showcaseTheme,
    avatar_image_url: avatarImageUrl,
    avatar_image_alt: avatarImageAlt,
    selected_tag_ids: payload.selected_tag_ids,
  });
  return buildProfile(username, username);
}

async function listRelationshipOverview(username) {
  const store = loadSocialProfileStore();
  const normalizedUsername = normalizeUsername(username);
  const ownIdentity = resolveActiveSaveContext(normalizedUsername)?.identity || null;

  const incoming_requests = await Promise.all(
    store.friend_requests
      .map(normalizeFriendRequest)
      .filter(entry => {
        if (entry.status !== 'pending' || entry.to_username !== normalizedUsername) return false;
        return !entry.to_save_id || !ownIdentity?.save_id || entry.to_save_id === ownIdentity.save_id;
      })
      .sort((left, right) => right.created_at - left.created_at)
      .map(async entry => ({
        request_id: entry.id,
        from_username: entry.from_username,
        to_username: entry.to_username,
        from_save_id: entry.from_save_id,
        to_save_id: entry.to_save_id,
        from_save_slot: entry.from_save_slot,
        to_save_slot: entry.to_save_slot,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.from_username, normalizedUsername, {
          preferredSlot: entry.from_save_slot,
        }),
      }))
  );

  const outgoing_requests = await Promise.all(
    store.friend_requests
      .map(normalizeFriendRequest)
      .filter(entry => {
        if (entry.status !== 'pending' || entry.from_username !== normalizedUsername) return false;
        return !entry.from_save_id || !ownIdentity?.save_id || entry.from_save_id === ownIdentity.save_id;
      })
      .sort((left, right) => right.created_at - left.created_at)
      .map(async entry => ({
        request_id: entry.id,
        from_username: entry.from_username,
        to_username: entry.to_username,
        from_save_id: entry.from_save_id,
        to_save_id: entry.to_save_id,
        from_save_slot: entry.from_save_slot,
        to_save_slot: entry.to_save_slot,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.to_username, normalizedUsername, {
          preferredSlot: entry.to_save_slot,
        }),
      }))
  );

  const friends = await Promise.all(
    store.friendships
      .map(normalizeFriendship)
      .filter(entry => friendshipBelongsToUser(entry, normalizedUsername, ownIdentity))
      .sort((left, right) => right.last_interaction_at - left.last_interaction_at)
      .map(async entry => {
        const sideA = getFriendshipSide(entry, 'a');
        const sideB = getFriendshipSide(entry, 'b');
        const ownSide = ownIdentity?.save_id && sideB.save_id === ownIdentity.save_id
          ? sideB
          : sideA.username === normalizedUsername
            ? sideA
            : sideB;
        const friendSide = ownSide === sideA ? sideB : sideA;
        return {
          friendship_id: entry.id,
          own_save_id: ownSide.save_id,
          own_save_slot: ownSide.save_slot,
          friend_save_id: friendSide.save_id,
          friend_save_slot: friendSide.save_slot,
          friends_since: entry.created_at,
          last_interaction_at: entry.last_interaction_at,
          profile: await buildRelationCard(friendSide.username, normalizedUsername, {
            preferredSlot: friendSide.save_slot,
          }),
        };
      })
  );

  const blocked_users = await Promise.all(
    store.blocks
      .map(normalizeBlockRelation)
      .filter(entry => blockRelationBelongsToUser(entry, normalizedUsername, ownIdentity))
      .sort((left, right) => right.updated_at - left.updated_at)
      .map(async entry => ({
        block_id: entry.id,
        own_save_id: entry.blocker_save_id,
        own_save_slot: entry.blocker_save_slot,
        blocked_save_id: entry.blocked_save_id,
        blocked_save_slot: entry.blocked_save_slot,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.blocked_username, normalizedUsername, {
          preferredSlot: entry.blocked_save_slot,
        }),
      }))
  );

  const neighbor_group = (() => {
    const joinedGroup = findMemberGroup(store, normalizedUsername);
    if (!joinedGroup) return null;
    return {
      id: joinedGroup.id,
      name: joinedGroup.name,
      summary: joinedGroup.summary,
      notice: joinedGroup.notice,
      level: joinedGroup.level,
      capacity: joinedGroup.capacity,
      member_count: joinedGroup.members.length,
      role: joinedGroup.members.find(member => member.username === normalizedUsername)?.role ?? 'member',
      activity_log: joinedGroup.activity_log.slice(0, 6),
    };
  })();

  return {
    incoming_requests,
    outgoing_requests,
    friends,
    blocked_users,
    neighbor_group,
  };
}

async function requestFriendship(username, targetPayload) {
  const store = loadSocialProfileStore();
  const requester = normalizeUsername(username);
  const requesterIdentity = resolveOwnSaveIdentity(requester);
  const targetResult = resolveFriendRequestTarget(targetPayload);
  const target = normalizeUsername(targetResult.username);
  const targetIdentity = targetResult.identity;

  if (!target) throw createError('请先填写好友用户名或存档 ID');
  if (
    requesterIdentity.save_id &&
    targetIdentity?.save_id &&
    requesterIdentity.save_id === targetIdentity.save_id
  ) {
    throw createError('不能给当前存档发送好友申请');
  }
  if (requester === target && !targetIdentity) throw createError('不能给自己发送好友申请');
  const targetUser = await db.getUser(target);
  if (!targetUser) throw createError('目标玩家不存在', 404);
  if (isBlocked(store, requester, target, requesterIdentity, targetIdentity)) throw createError('你与该玩家当前存在拉黑关系，无法发送申请');
  if (findFriendship(store, requester, target, requesterIdentity, targetIdentity)) throw createError('你们已经是好友了');
  if (findPendingRequest(store, requester, target, requesterIdentity, targetIdentity)) throw createError('这条好友申请已经在处理中');

  const request = normalizeFriendRequest({
    id: makeId('friend_req'),
    from_username: requester,
    to_username: target,
    from_save_id: requesterIdentity.save_id,
    from_save_slot: requesterIdentity.save_slot,
    to_save_id: targetIdentity?.save_id || 0,
    to_save_slot: targetIdentity?.save_slot ?? null,
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.friend_requests = [...store.friend_requests, request];
  saveSocialProfileStore(store);
  return request;
}

async function acceptFriendRequest(username, requestId) {
  const store = loadSocialProfileStore();
  const receiver = normalizeUsername(username);
  const request = store.friend_requests
    .map(normalizeFriendRequest)
    .find(entry => entry.id === String(requestId || '').trim());

  if (!request || request.status !== 'pending' || request.to_username !== receiver) {
    throw createError('好友申请不存在或已失效', 404);
  }
  const fromIdentity = normalizeSaveFriendSide(request.from_username, {
    save_id: request.from_save_id,
    save_slot: request.from_save_slot,
  });
  const toIdentity = normalizeSaveFriendSide(request.to_username, {
    save_id: request.to_save_id,
    save_slot: request.to_save_slot,
  });
  if (isBlocked(store, request.from_username, request.to_username, fromIdentity, toIdentity)) {
    throw createError('当前存在拉黑关系，无法接受好友申请');
  }

  const now = Math.floor(Date.now() / 1000);
  request.status = 'accepted';
  request.updated_at = now;
  const existingFriendship = findFriendship(store, request.from_username, request.to_username, fromIdentity, toIdentity);
  const nextFriendship = normalizeFriendship({
    id: existingFriendship?.id || makeId('friendship'),
    username_a: request.from_username,
    username_b: request.to_username,
    save_id_a: request.from_save_id,
    save_slot_a: request.from_save_slot,
    save_id_b: request.to_save_id,
    save_slot_b: request.to_save_slot,
    created_at: existingFriendship?.created_at || now,
    updated_at: now,
    last_interaction_at: now,
  });
  if (!existingFriendship) {
    store.friendships = [
      ...store.friendships,
      nextFriendship,
    ];
  } else {
    store.friendships = store.friendships.map(entry => {
      const normalized = normalizeFriendship(entry);
      return normalized.id === existingFriendship.id ? nextFriendship : normalized;
    });
  }
  store.friend_requests = store.friend_requests.map(entry => {
    const normalized = normalizeFriendRequest(entry);
    return normalized.id === request.id ? request : normalized;
  });
  saveSocialProfileStore(store);
  return request;
}

async function rejectFriendRequest(username, requestId) {
  const store = loadSocialProfileStore();
  const receiver = normalizeUsername(username);
  const request = store.friend_requests
    .map(normalizeFriendRequest)
    .find(entry => entry.id === String(requestId || '').trim());

  if (!request || request.status !== 'pending' || request.to_username !== receiver) {
    throw createError('好友申请不存在或已失效', 404);
  }

  request.status = 'rejected';
  request.updated_at = Math.floor(Date.now() / 1000);
  store.friend_requests = store.friend_requests.map(entry => {
    const normalized = normalizeFriendRequest(entry);
    return normalized.id === request.id ? request : normalized;
  });
  saveSocialProfileStore(store);
  return request;
}

async function removeFriendship(username, friendshipId) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const actorIdentity = resolveActiveSaveContext(actor)?.identity || null;
  const targetId = String(friendshipId || '').trim();
  if (!targetId) throw createError('请先选择要删除的好友关系');

  const friendship = store.friendships
    .map(normalizeFriendship)
    .find(entry => entry.id === targetId);
  if (!friendship) throw createError('好友关系不存在', 404);
  if ((friendship.save_id_a || friendship.save_id_b) && !actorIdentity?.save_id) {
    throw createError('当前账号没有可用存档，无法删除存档级好友关系');
  }
  if (!friendshipBelongsToUser(friendship, actor, actorIdentity)) {
    throw createError('你无权删除这条好友关系', 403);
  }

  store.friendships = store.friendships
    .map(normalizeFriendship)
    .filter(entry => entry.id !== friendship.id);
  saveSocialProfileStore(store);

  const sideA = getFriendshipSide(friendship, 'a');
  const sideB = getFriendshipSide(friendship, 'b');
  const ownSide = actorIdentity?.save_id && sideA.save_id === actorIdentity.save_id
    ? sideA
    : actorIdentity?.save_id && sideB.save_id === actorIdentity.save_id
      ? sideB
      : sideA.username === actor
        ? sideA
        : sideB;
  const friendSide = ownSide === sideA ? sideB : sideA;
  return {
    friendship_id: friendship.id,
    own_username: ownSide.username,
    own_save_id: ownSide.save_id,
    own_save_slot: ownSide.save_slot,
    friend_username: friendSide.username,
    friend_save_id: friendSide.save_id,
    friend_save_slot: friendSide.save_slot,
    removed_at: Math.floor(Date.now() / 1000),
  };
}

async function blockPlayer(username, targetPayload) {
  const store = loadSocialProfileStore();
  const blocker = normalizeUsername(username);
  const blockerIdentity = resolveOwnSaveIdentity(blocker);
  const targetResult = resolveSocialTarget(targetPayload);
  const blocked = normalizeUsername(targetResult.username);
  const blockedIdentity = targetResult.identity;

  if (!blocked) throw createError('请先填写要拉黑的玩家或存档 ID');
  if (
    blockerIdentity.save_id &&
    blockedIdentity?.save_id &&
    blockerIdentity.save_id === blockedIdentity.save_id
  ) {
    throw createError('不能拉黑当前存档');
  }
  if (blocker === blocked && !blockedIdentity) throw createError('不能拉黑自己');
  const targetUser = await db.getUser(blocked);
  if (!targetUser) throw createError('目标玩家不存在', 404);

  const existingBlock = store.blocks
    .map(normalizeBlockRelation)
    .find(entry => blockRelationMatchesDirection(entry, blocker, blocked, blockerIdentity, blockedIdentity));
  const blockRelation = existingBlock || normalizeBlockRelation({
    id: makeId('block'),
    blocker_username: blocker,
    blocked_username: blocked,
    blocker_save_id: blockerIdentity.save_id,
    blocker_save_slot: blockerIdentity.save_slot,
    blocked_save_id: blockedIdentity?.save_id || 0,
    blocked_save_slot: blockedIdentity?.save_slot ?? null,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  if (!existingBlock) {
    store.blocks = [
      ...store.blocks,
      blockRelation,
    ];
  }

  store.friendships = store.friendships
    .map(normalizeFriendship)
    .filter(entry => {
      const friendshipSavePairKey = buildFriendshipSavePairKey(entry);
      const blockSavePairKey = buildSavePairKey(blockerIdentity.save_id, blockedIdentity?.save_id);
      if (blockSavePairKey && friendshipSavePairKey) return friendshipSavePairKey !== blockSavePairKey;
      return buildPairKey(entry.username_a, entry.username_b) !== buildPairKey(blocker, blocked);
    });
  store.friend_requests = store.friend_requests
    .map(normalizeFriendRequest)
    .filter(entry => {
      const requestSavePairKey = buildFriendRequestSavePairKey(entry);
      const blockSavePairKey = buildSavePairKey(blockerIdentity.save_id, blockedIdentity?.save_id);
      if (blockSavePairKey && requestSavePairKey) return requestSavePairKey !== blockSavePairKey;
      return buildPairKey(entry.from_username, entry.to_username) !== buildPairKey(blocker, blocked);
    });
  saveSocialProfileStore(store);
  return {
    block_id: blockRelation.id,
    blocker_username: blocker,
    blocked_username: blocked,
    blocker_save_id: blockRelation.blocker_save_id,
    blocker_save_slot: blockRelation.blocker_save_slot,
    blocked_save_id: blockRelation.blocked_save_id,
    blocked_save_slot: blockRelation.blocked_save_slot,
  };
}

async function unblockPlayer(username, targetPayload) {
  const store = loadSocialProfileStore();
  const blocker = normalizeUsername(username);
  const blockerIdentity = resolveActiveSaveContext(blocker)?.identity || null;
  const targetResult = resolveSocialTarget(targetPayload);
  const blocked = normalizeUsername(targetResult.username);
  const blockedIdentity = targetResult.identity;
  if (!blocked) throw createError('请先选择要解除拉黑的玩家或存档 ID');
  const removedBlock = store.blocks
    .map(normalizeBlockRelation)
    .find(entry => blockRelationMatchesDirection(entry, blocker, blocked, blockerIdentity, blockedIdentity));
  if (!removedBlock) {
    throw createError('拉黑记录不存在', 404);
  }
  store.blocks = store.blocks
    .map(normalizeBlockRelation)
    .filter(entry => !blockRelationMatchesDirection(entry, blocker, blocked, blockerIdentity, blockedIdentity));
  saveSocialProfileStore(store);
  return {
    block_id: removedBlock.id,
    blocker_username: blocker,
    blocked_username: blocked,
    blocker_save_id: removedBlock.blocker_save_id,
    blocker_save_slot: removedBlock.blocker_save_slot,
    blocked_save_id: removedBlock.blocked_save_id,
    blocked_save_slot: removedBlock.blocked_save_slot,
  };
}

async function reportPlayer(username, payload = {}) {
  const reporter = normalizeUsername(username);
  const reporterIdentity = resolveActiveSaveContext(reporter)?.identity || null;
  const targetResult = resolveSocialTarget(payload);
  const target = normalizeUsername(targetResult.username);
  const targetIdentity = targetResult.identity;
  if (!target) throw createError('请先选择要举报的玩家或存档 ID');
  if (reporterIdentity?.save_id && targetIdentity?.save_id && reporterIdentity.save_id === targetIdentity.save_id) {
    throw createError('不能举报当前存档');
  }
  if (reporter === target && !targetIdentity) throw createError('不能举报自己');
  const targetUser = await db.getUser(target);
  if (!targetUser) throw createError('目标玩家不存在', 404);

  const reportStore = loadSocialReportStore();
  const now = Math.floor(Date.now() / 1000);
  const report = normalizeSocialReport({
    id: makeId('social_report'),
    reporter_username: reporter,
    reporter_save_id: reporterIdentity?.save_id || 0,
    reporter_save_slot: reporterIdentity?.save_slot ?? null,
    target_username: target,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
    reason: payload.reason,
    detail: payload.detail,
    source: payload.source || 'friend_lobby',
    status: 'open',
    created_at: now,
    updated_at: now,
  });
  reportStore.reports = [report, ...reportStore.reports].slice(0, 500);
  saveSocialReportStore(reportStore);
  return report;
}

async function createNeighborGroup(username, payload = {}, auditContext = {}) {
  const store = loadSocialProfileStore();
  const creator = normalizeUsername(username);
  if (findMemberGroup(store, creator)) throw createError('你已经在一个邻里中了');
  const baseAuditContext = buildSocialAuditContext(auditContext, {
    scene: 'neighbor_group',
    username: creator,
    content_type: 'neighbor_group',
    content_id: creator,
  });
  const name = moderateText(payload.name, {
    label: '邻里名称',
    field: 'name',
    scene: 'neighbor_group',
    maxLength: 24,
    storageMaxLength: 24,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'name' }),
  });
  if (name.length < 2) throw createError('邻里名称至少 2 个字');
  const summary = moderateText(payload.summary, {
    label: '邻里简介',
    field: 'summary',
    scene: 'neighbor_group',
    maxLength: 160,
    storageMaxLength: 160,
    maxLineBreaks: 3,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'summary' }),
  });
  const notice = moderateText(payload.notice, {
    label: '邻里公告',
    field: 'notice',
    scene: 'neighbor_group',
    maxLength: 160,
    storageMaxLength: 160,
    maxLineBreaks: 3,
    auditContext: buildSocialAuditContext(baseAuditContext, { field: 'notice' }),
  });

  const group = normalizeNeighborGroup({
    id: makeId('neighbor_group'),
    name,
    summary,
    notice,
    level: 1,
    capacity: Math.max(3, Math.min(30, Number(payload.capacity) || 12)),
    created_by: creator,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    members: [{ username: creator, role: 'leader', joined_at: Math.floor(Date.now() / 1000) }],
    activity_log: [],
  });
  appendNeighborActivity(group, `${creator}创建了邻里「${group.name}」`, 'create');
  store.neighbor_groups = [...store.neighbor_groups, group];
  updateStoredProfile(creator, { neighborhood_role: '邻里社长' });
  saveSocialProfileStore(store);
  return group;
}

async function applyToNeighborGroup(username, groupId) {
  const store = loadSocialProfileStore();
  const applicant = normalizeUsername(username);
  const group = findNeighborGroupById(store, groupId);
  if (!group) throw createError('邻里不存在', 404);
  if (findMemberGroup(store, applicant)) throw createError('你已经加入其他邻里');
  if (group.members.some(member => member.username === applicant)) throw createError('你已经是该邻里成员');

  const existing = store.neighbor_join_requests
    .map(normalizeNeighborJoinRequest)
    .find(entry => entry.group_id === group.id && entry.username === applicant && entry.status === 'pending');
  if (existing) throw createError('你已经申请过该邻里');

  const request = normalizeNeighborJoinRequest({
    id: makeId('neighbor_join'),
    group_id: group.id,
    username: applicant,
    type: 'apply',
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.neighbor_join_requests = [...store.neighbor_join_requests, request];
  saveSocialProfileStore(store);
  return request;
}

async function inviteToNeighborGroup(username, payload = {}) {
  const store = loadSocialProfileStore();
  const inviter = normalizeUsername(username);
  const group = findMemberGroup(store, inviter);
  if (!group) throw createError('你当前没有邻里');
  const member = group.members.find(entry => entry.username === inviter);
  if (!member || !['leader', 'manager'].includes(member.role)) throw createError('只有社长或管事可以邀请成员', 403);
  if (group.members.length >= group.capacity) throw createError('当前邻里人数已满');
  const target = normalizeUsername(payload.target_username);
  if (!target) throw createError('请先填写要邀请的玩家');
  if (findMemberGroup(store, target)) throw createError('对方已经加入其他邻里');

  const existing = store.neighbor_join_requests
    .map(normalizeNeighborJoinRequest)
    .find(entry => entry.group_id === group.id && entry.username === target && entry.status === 'pending');
  if (existing) throw createError('该邀请或申请已在处理中');

  const request = normalizeNeighborJoinRequest({
    id: makeId('neighbor_join'),
    group_id: group.id,
    username: target,
    invited_by: inviter,
    type: 'invite',
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.neighbor_join_requests = [...store.neighbor_join_requests, request];
  saveSocialProfileStore(store);
  return request;
}

async function respondNeighborRequest(username, requestId, decision) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const request = store.neighbor_join_requests
    .map(normalizeNeighborJoinRequest)
    .find(entry => entry.id === String(requestId || '').trim());
  if (!request || request.status !== 'pending') throw createError('邻里申请不存在或已失效', 404);
  const group = findNeighborGroupById(store, request.group_id);
  if (!group) throw createError('邻里不存在', 404);

  const groupMember = group.members.find(entry => entry.username === actor);
  const canManage = groupMember && ['leader', 'manager'].includes(groupMember.role);
  const canSelfAcceptInvite = request.type === 'invite' && request.username === actor;
  if (!canManage && !canSelfAcceptInvite) throw createError('你无权处理该邻里申请', 403);

  request.status = decision === 'accept' ? 'accepted' : 'rejected';
  request.updated_at = Math.floor(Date.now() / 1000);

  if (decision === 'accept') {
    if (group.members.length >= group.capacity) throw createError('当前邻里人数已满');
    if (findMemberGroup(store, request.username)) throw createError('该玩家已经加入其他邻里');
    group.members = [...group.members, normalizeNeighborMember({ username: request.username, role: 'member', joined_at: Math.floor(Date.now() / 1000) })];
    group.level = Math.min(5, 1 + Math.floor(group.members.length / 4));
    appendNeighborActivity(group, `${request.username}加入了邻里「${group.name}」`, 'join');
    updateStoredProfile(request.username, { neighborhood_role: '邻里成员' });
  }

  store.neighbor_join_requests = store.neighbor_join_requests.map(entry => {
    const normalized = normalizeNeighborJoinRequest(entry);
    return normalized.id === request.id ? request : normalized;
  });
  store.neighbor_groups = store.neighbor_groups.map(entry => {
    const normalized = normalizeNeighborGroup(entry);
    return normalized.id === group.id ? group : normalized;
  });
  saveSocialProfileStore(store);
  return request;
}

async function updateNeighborNotice(username, payload = {}, auditContext = {}) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const group = findMemberGroup(store, actor);
  if (!group) throw createError('你当前没有邻里');
  const member = group.members.find(entry => entry.username === actor);
  if (!member || !['leader', 'manager'].includes(member.role)) throw createError('只有社长或管事可以修改公告', 403);
  group.notice = moderateText(payload.notice, {
    label: '邻里公告',
    field: 'notice',
    scene: 'neighbor_notice',
    maxLength: 160,
    storageMaxLength: 160,
    maxLineBreaks: 3,
    auditContext: buildSocialAuditContext(auditContext, {
      scene: 'neighbor_notice',
      field: 'notice',
      username: actor,
      content_type: 'neighbor_notice',
      content_id: group.id,
    }),
  });
  appendNeighborActivity(group, `${actor}更新了邻里公告`, 'notice');
  store.neighbor_groups = store.neighbor_groups.map(entry => {
    const normalized = normalizeNeighborGroup(entry);
    return normalized.id === group.id ? group : normalized;
  });
  saveSocialProfileStore(store);
  return group;
}

async function updateNeighborMemberRole(username, payload = {}) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const target = normalizeUsername(payload.target_username);
  const nextRole = ['manager', 'member'].includes(String(payload.role)) ? String(payload.role) : null;
  if (!target || !nextRole) throw createError('成员身份参数不完整');
  const group = findMemberGroup(store, actor);
  if (!group) throw createError('你当前没有邻里');
  const actorMember = group.members.find(entry => entry.username === actor);
  if (!actorMember || actorMember.role !== 'leader') throw createError('只有社长可以调整成员身份', 403);
  const targetMember = group.members.find(entry => entry.username === target);
  if (!targetMember) throw createError('目标成员不存在', 404);
  if (targetMember.role === 'leader') throw createError('不能修改社长身份');
  targetMember.role = nextRole;
  appendNeighborActivity(group, `${target}现在是${nextRole === 'manager' ? '邻里管事' : '邻里成员'}`, 'role');
  updateStoredProfile(target, { neighborhood_role: nextRole === 'manager' ? '邻里管事' : '邻里成员' });
  store.neighbor_groups = store.neighbor_groups.map(entry => {
    const normalized = normalizeNeighborGroup(entry);
    return normalized.id === group.id ? group : normalized;
  });
  saveSocialProfileStore(store);
  return group;
}

async function listNeighborRequestOverview(username) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const group = findMemberGroup(store, actor);
  const public_groups = store.neighbor_groups
    .map(normalizeNeighborGroup)
    .sort((left, right) => {
      const levelDiff = right.level - left.level;
      if (levelDiff !== 0) return levelDiff;
      return right.members.length - left.members.length;
    })
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      summary: entry.summary,
      notice: entry.notice,
      level: entry.level,
      capacity: entry.capacity,
      member_count: entry.members.length,
      leader_username: entry.created_by,
      activity_log: entry.activity_log.slice(0, 3),
      can_apply: !entry.members.some(member => member.username === actor) && !findMemberGroup(store, actor),
    }));

  const incoming_invites = store.neighbor_join_requests
    .map(normalizeNeighborJoinRequest)
    .filter(entry => entry.type === 'invite' && entry.username === actor && entry.status === 'pending')
    .sort((left, right) => right.created_at - left.created_at)
    .map(entry => ({
      ...entry,
      group_name: findNeighborGroupById(store, entry.group_id)?.name || '未命名邻里',
    }));

  if (!group) {
    return {
      managed_requests: [],
      my_group: null,
      incoming_invites,
      public_groups,
    };
  }

  const managed_requests = store.neighbor_join_requests
    .map(normalizeNeighborJoinRequest)
    .filter(entry => entry.group_id === group.id && entry.status === 'pending')
    .sort((left, right) => right.created_at - left.created_at)
    .map(entry => ({
      ...entry,
      group_name: group.name,
    }));

  return {
    managed_requests,
    my_group: {
      ...group,
      members: [...group.members].sort((left, right) => {
        const roleRank = { leader: 0, manager: 1, member: 2 };
        const leftRank = roleRank[left.role] ?? 3;
        const rightRank = roleRank[right.role] ?? 3;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return left.username.localeCompare(right.username, 'zh-CN');
      }),
    },
    incoming_invites,
    public_groups,
  };
}

async function listSubscriptionOverview(username) {
  const store = loadSocialProfileStore();
  const subscriptions = listSubscriptionsForUser(store, username);
  return { subscriptions };
}

async function followTarget(username, payload = {}, auditContext = {}) {
  const store = loadSocialProfileStore();
  const subscriber = normalizeUsername(username);
  const targetType = ['style', 'expert', 'neighbor_group', 'festival'].includes(String(payload.target_type)) ? String(payload.target_type) : null;
  const targetId = sanitizeText(payload.target_id, 64);
  const label = moderateText(payload.label, {
    label: '关注标签',
    field: 'label',
    scene: 'social_subscription',
    maxLength: 40,
    storageMaxLength: 40,
    auditContext: buildSocialAuditContext(auditContext, {
      scene: 'social_subscription',
      field: 'label',
      username: subscriber,
      content_type: 'social_subscription_label',
      content_id: targetId,
    }),
  });
  if (!targetType || !targetId) throw createError('订阅参数不完整');

  const existing = store.subscriptions
    .map(normalizeSubscription)
    .find(entry => entry.subscriber_username === subscriber && entry.target_type === targetType && entry.target_id === targetId);
  if (existing) throw createError('你已经关注了这条订阅');

  const subscription = normalizeSubscription({
    id: makeId('subscription'),
    subscriber_username: subscriber,
    target_type: targetType,
    target_id: targetId,
    label: label || targetId,
    created_at: Math.floor(Date.now() / 1000),
  });
  store.subscriptions = [...store.subscriptions, subscription];
  saveSocialProfileStore(store);
  return subscription;
}

async function unfollowTarget(username, subscriptionId) {
  const store = loadSocialProfileStore();
  const subscriber = normalizeUsername(username);
  const before = store.subscriptions.length;
  store.subscriptions = store.subscriptions
    .map(normalizeSubscription)
    .filter(entry => !(entry.id === String(subscriptionId || '').trim() && entry.subscriber_username === subscriber));
  if (store.subscriptions.length === before) throw createError('订阅记录不存在', 404);
  saveSocialProfileStore(store);
  return { subscription_id: String(subscriptionId || '').trim() };
}

module.exports = {
  getOwnProfile,
  getPublicProfile,
  searchPlayerBySaveId,
  listFriendDiscovery,
  resolveFriendTargetByAlias,
  getStoredProfile,
  updateStoredProfile,
  updateOwnProfile,
  listRelationshipOverview,
  requestFriendship,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
  blockPlayer,
  unblockPlayer,
  reportPlayer,
  createNeighborGroup,
  applyToNeighborGroup,
  inviteToNeighborGroup,
  respondNeighborRequest,
  updateNeighborNotice,
  updateNeighborMemberRole,
  listNeighborRequestOverview,
  listSubscriptionOverview,
  buildRelationCard,
  resolveChatTargetForUser,
  getRelationshipStatusForTarget,
  followTarget,
  unfollowTarget,
  isFriendWith,
  isSaveFriendWith,
  isNeighborWith,
  getNeighborGroupForUser,
  listNeighborGroupMemberUsernames,
};
