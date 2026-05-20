const fs = require('fs');
const path = require('path');
const db = require('./db');
const {
  createError,
  getActiveSaveContext,
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

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
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
  return {
    visibility: normalizeVisibility(profile?.visibility),
    public_intro: sanitizeText(profile?.public_intro, 120),
    manor_name: sanitizeText(profile?.manor_name, 40),
    public_title: sanitizeText(profile?.public_title, 24),
    neighborhood_role: sanitizeText(profile?.neighborhood_role, 24),
    showcase_theme: sanitizeText(profile?.showcase_theme, 24),
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

function resolveActiveSaveContext(username) {
  try {
    return getActiveSaveContext(username, null, '该玩家当前没有可公开的个人存档');
  } catch {
    return null;
  }
}

function normalizeFriendRequest(request) {
  return {
    id: String(request?.id || makeId('friend_req')),
    from_username: normalizeUsername(request?.from_username),
    to_username: normalizeUsername(request?.to_username),
    status: ['pending', 'accepted', 'rejected'].includes(String(request?.status)) ? String(request.status) : 'pending',
    created_at: Number(request?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(request?.updated_at) || Number(request?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeFriendship(friendship) {
  const left = normalizeUsername(friendship?.username_a);
  const right = normalizeUsername(friendship?.username_b);
  const [username_a, username_b] = [left, right].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  return {
    id: String(friendship?.id || makeId('friendship')),
    username_a,
    username_b,
    created_at: Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(friendship?.updated_at) || Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
    last_interaction_at: Number(friendship?.last_interaction_at) || Number(friendship?.updated_at) || Number(friendship?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeBlockRelation(entry) {
  return {
    id: String(entry?.id || makeId('block')),
    blocker_username: normalizeUsername(entry?.blocker_username),
    blocked_username: normalizeUsername(entry?.blocked_username),
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

function isBlocked(store, left, right) {
  const normalizedLeft = normalizeUsername(left);
  const normalizedRight = normalizeUsername(right);
  return store.blocks
    .map(normalizeBlockRelation)
    .some(entry =>
      (entry.blocker_username === normalizedLeft && entry.blocked_username === normalizedRight) ||
      (entry.blocker_username === normalizedRight && entry.blocked_username === normalizedLeft)
    );
}

function findFriendship(store, left, right) {
  const pairKey = buildPairKey(left, right);
  return store.friendships
    .map(normalizeFriendship)
    .find(entry => buildPairKey(entry.username_a, entry.username_b) === pairKey) || null;
}

function findPendingRequest(store, left, right) {
  const normalizedLeft = normalizeUsername(left);
  const normalizedRight = normalizeUsername(right);
  return store.friend_requests
    .map(normalizeFriendRequest)
    .find(entry =>
      entry.status === 'pending' &&
      (
        (entry.from_username === normalizedLeft && entry.to_username === normalizedRight) ||
        (entry.from_username === normalizedRight && entry.to_username === normalizedLeft)
      )
    ) || null;
}

function countFriendships(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return store.friendships
    .map(normalizeFriendship)
    .filter(entry => entry.username_a === normalizedUsername || entry.username_b === normalizedUsername)
    .length;
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

async function buildProfile(username, viewerUsername = '', options = {}) {
  const user = await db.getUser(username);
  if (!user) throw createError('玩家不存在', 404);

  const store = loadSocialProfileStore();
  const saveContext = resolveActiveSaveContext(username);
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
    visibility: storedProfile.visibility,
    active_quest_count: activeQuestCount,
    public_tags: publicTags,
    selected_tag_ids: [...storedProfile.selected_tag_ids],
    available_tag_options: PROFILE_TAG_OPTIONS.map(entry => ({ ...entry })),
    player_chronicle: playerChronicle,
    updated_at: storedProfile.updated_at,
    last_active_at: storedProfile.last_active_at,
  };
}

async function buildRelationCard(username, viewerUsername = '') {
  return buildProfile(username, viewerUsername, { ignoreVisibility: true, includeChronicle: false });
}

async function getOwnProfile(username) {
  updateStoredProfile(username, {});
  return buildProfile(username, username);
}

async function getPublicProfile(username, viewerUsername = '') {
  return buildProfile(username, viewerUsername);
}

async function updateOwnProfile(username, payload = {}) {
  updateStoredProfile(username, {
    visibility: payload.visibility,
    public_intro: payload.public_intro,
    manor_name: payload.manor_name,
    public_title: payload.public_title,
    neighborhood_role: payload.neighborhood_role,
    showcase_theme: payload.showcase_theme,
    selected_tag_ids: payload.selected_tag_ids,
  });
  return buildProfile(username, username);
}

async function listRelationshipOverview(username) {
  const store = loadSocialProfileStore();
  const normalizedUsername = normalizeUsername(username);

  const incoming_requests = await Promise.all(
    store.friend_requests
      .map(normalizeFriendRequest)
      .filter(entry => entry.status === 'pending' && entry.to_username === normalizedUsername)
      .sort((left, right) => right.created_at - left.created_at)
      .map(async entry => ({
        request_id: entry.id,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.from_username, normalizedUsername),
      }))
  );

  const outgoing_requests = await Promise.all(
    store.friend_requests
      .map(normalizeFriendRequest)
      .filter(entry => entry.status === 'pending' && entry.from_username === normalizedUsername)
      .sort((left, right) => right.created_at - left.created_at)
      .map(async entry => ({
        request_id: entry.id,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.to_username, normalizedUsername),
      }))
  );

  const friends = await Promise.all(
    store.friendships
      .map(normalizeFriendship)
      .filter(entry => entry.username_a === normalizedUsername || entry.username_b === normalizedUsername)
      .sort((left, right) => right.last_interaction_at - left.last_interaction_at)
      .map(async entry => {
        const otherUsername = entry.username_a === normalizedUsername ? entry.username_b : entry.username_a;
        return {
          friendship_id: entry.id,
          friends_since: entry.created_at,
          last_interaction_at: entry.last_interaction_at,
          profile: await buildRelationCard(otherUsername, normalizedUsername),
        };
      })
  );

  const blocked_users = await Promise.all(
    store.blocks
      .map(normalizeBlockRelation)
      .filter(entry => entry.blocker_username === normalizedUsername)
      .sort((left, right) => right.updated_at - left.updated_at)
      .map(async entry => ({
        block_id: entry.id,
        created_at: entry.created_at,
        profile: await buildRelationCard(entry.blocked_username, normalizedUsername),
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

async function requestFriendship(username, targetUsername) {
  const store = loadSocialProfileStore();
  const requester = normalizeUsername(username);
  const target = normalizeUsername(targetUsername);

  if (!target) throw createError('请先填写好友用户名');
  if (requester === target) throw createError('不能给自己发送好友申请');
  const targetUser = await db.getUser(target);
  if (!targetUser) throw createError('目标玩家不存在', 404);
  if (isBlocked(store, requester, target)) throw createError('你与该玩家当前存在拉黑关系，无法发送申请');
  if (findFriendship(store, requester, target)) throw createError('你们已经是好友了');
  if (findPendingRequest(store, requester, target)) throw createError('这条好友申请已经在处理中');

  const request = normalizeFriendRequest({
    id: makeId('friend_req'),
    from_username: requester,
    to_username: target,
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
  if (isBlocked(store, request.from_username, request.to_username)) {
    throw createError('当前存在拉黑关系，无法接受好友申请');
  }

  const now = Math.floor(Date.now() / 1000);
  request.status = 'accepted';
  request.updated_at = now;
  const existingFriendship = findFriendship(store, request.from_username, request.to_username);
  if (!existingFriendship) {
    store.friendships = [
      ...store.friendships,
      normalizeFriendship({
        id: makeId('friendship'),
        username_a: request.from_username,
        username_b: request.to_username,
        created_at: now,
        updated_at: now,
        last_interaction_at: now,
      }),
    ];
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

async function blockPlayer(username, targetUsername) {
  const store = loadSocialProfileStore();
  const blocker = normalizeUsername(username);
  const blocked = normalizeUsername(targetUsername);

  if (!blocked) throw createError('请先填写要拉黑的玩家');
  if (blocker === blocked) throw createError('不能拉黑自己');
  const targetUser = await db.getUser(blocked);
  if (!targetUser) throw createError('目标玩家不存在', 404);

  const existingBlock = store.blocks
    .map(normalizeBlockRelation)
    .find(entry => entry.blocker_username === blocker && entry.blocked_username === blocked);
  if (!existingBlock) {
    store.blocks = [
      ...store.blocks,
      normalizeBlockRelation({
        id: makeId('block'),
        blocker_username: blocker,
        blocked_username: blocked,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      }),
    ];
  }

  store.friendships = store.friendships
    .map(normalizeFriendship)
    .filter(entry => buildPairKey(entry.username_a, entry.username_b) !== buildPairKey(blocker, blocked));
  store.friend_requests = store.friend_requests
    .map(normalizeFriendRequest)
    .filter(entry => buildPairKey(entry.from_username, entry.to_username) !== buildPairKey(blocker, blocked));
  saveSocialProfileStore(store);
  return { blocker_username: blocker, blocked_username: blocked };
}

async function unblockPlayer(username, targetUsername) {
  const store = loadSocialProfileStore();
  const blocker = normalizeUsername(username);
  const blocked = normalizeUsername(targetUsername);
  const before = store.blocks.length;
  store.blocks = store.blocks
    .map(normalizeBlockRelation)
    .filter(entry => !(entry.blocker_username === blocker && entry.blocked_username === blocked));
  if (store.blocks.length === before) {
    throw createError('拉黑记录不存在', 404);
  }
  saveSocialProfileStore(store);
  return { blocker_username: blocker, blocked_username: blocked };
}

async function createNeighborGroup(username, payload = {}) {
  const store = loadSocialProfileStore();
  const creator = normalizeUsername(username);
  if (findMemberGroup(store, creator)) throw createError('你已经在一个邻里中了');
  const name = sanitizeText(payload.name, 24);
  if (name.length < 2) throw createError('邻里名称至少 2 个字');

  const group = normalizeNeighborGroup({
    id: makeId('neighbor_group'),
    name,
    summary: payload.summary,
    notice: payload.notice,
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

async function updateNeighborNotice(username, payload = {}) {
  const store = loadSocialProfileStore();
  const actor = normalizeUsername(username);
  const group = findMemberGroup(store, actor);
  if (!group) throw createError('你当前没有邻里');
  const member = group.members.find(entry => entry.username === actor);
  if (!member || !['leader', 'manager'].includes(member.role)) throw createError('只有社长或管事可以修改公告', 403);
  group.notice = sanitizeText(payload.notice, 160);
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

async function followTarget(username, payload = {}) {
  const store = loadSocialProfileStore();
  const subscriber = normalizeUsername(username);
  const targetType = ['style', 'expert', 'neighbor_group', 'festival'].includes(String(payload.target_type)) ? String(payload.target_type) : null;
  const targetId = sanitizeText(payload.target_id, 64);
  const label = sanitizeText(payload.label, 40);
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
  getStoredProfile,
  updateStoredProfile,
  updateOwnProfile,
  listRelationshipOverview,
  requestFriendship,
  acceptFriendRequest,
  rejectFriendRequest,
  blockPlayer,
  unblockPlayer,
  createNeighborGroup,
  applyToNeighborGroup,
  inviteToNeighborGroup,
  respondNeighborRequest,
  updateNeighborNotice,
  updateNeighborMemberRole,
  listNeighborRequestOverview,
  listSubscriptionOverview,
  followTarget,
  unfollowTarget,
  isFriendWith,
  isNeighborWith,
  getNeighborGroupForUser,
};
