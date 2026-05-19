const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SOCIETY_FILE = path.join(DATA_DIR, 'taoyuan_societies.json');

const SOCIETY_ROLE_LABELS = Object.freeze({
  president: '社长',
  steward: '管事',
  buyer: '采办',
  treasurer: '账房',
  scribe: '记录人',
  member: '普通成员',
});

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

function createEmptySocietyStore() {
  return {
    societies: [],
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

function normalizeSociety(entry) {
  return {
    id: sanitizeText(entry?.id || makeId('society'), 80),
    name: sanitizeText(entry?.name, 24),
    summary: sanitizeText(entry?.summary, 120),
    emblem: normalizeSocietyEmblem(entry?.emblem),
    theme: normalizeSocietyTheme(entry?.theme),
    visibility: normalizeSocietyVisibility(entry?.visibility),
    capacity: normalizeSocietyCapacity(entry?.capacity),
    join_requirement_id: normalizeJoinRequirementId(entry?.join_requirement_id),
    join_requirement_note: sanitizeText(entry?.join_requirement_note, 80),
    created_by: normalizeUsername(entry?.created_by),
    created_at: Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds())),
    updated_at: Math.max(0, Math.floor(Number(entry?.updated_at) || Number(entry?.created_at) || nowSeconds())),
    members: Array.isArray(entry?.members)
      ? entry.members.map(normalizeSocietyMember).filter(member => member.username)
      : [],
    activity_log: Array.isArray(entry?.activity_log)
      ? entry.activity_log.map(normalizeActivityEntry).filter(item => item.message).slice(0, 12)
      : [],
  };
}

function loadSocietyStore() {
  ensureSocietyStoreDir();
  try {
    if (!fs.existsSync(TAOYUAN_SOCIETY_FILE)) return createEmptySocietyStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_SOCIETY_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          societies: Array.isArray(raw.societies) ? raw.societies : [],
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
  });
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
  ].slice(0, 12);
  society.updated_at = nowSeconds();
}

function findMemberSociety(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return (store.societies || [])
    .map(normalizeSociety)
    .find(entry => entry.members.some(member => member.username === normalizedUsername)) || null;
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

async function hydrateMembers(members = []) {
  return Promise.all((members || []).map(async entry => {
    const normalized = normalizeSocietyMember(entry);
    return {
      ...normalized,
      display_name: normalized.display_name || await resolveDisplayName(normalized.username),
    };
  }));
}

async function buildSocietySnapshot(society, viewerUsername = '', viewerHasSociety = false) {
  const normalized = normalizeSociety(society);
  const members = await hydrateMembers(normalized.members);
  const leader = members.find(entry => entry.role === 'president') || members[0] || null;
  const viewerMember = members.find(entry => entry.username === normalizeUsername(viewerUsername)) || null;
  const visibilityEntry = SOCIETY_VISIBILITY_OPTIONS.find(entry => entry.id === normalized.visibility) || SOCIETY_VISIBILITY_OPTIONS[0];
  const themeEntry = SOCIETY_THEME_OPTIONS.find(entry => entry.id === normalized.theme) || SOCIETY_THEME_OPTIONS[0];
  const emblemEntry = SOCIETY_EMBLEM_OPTIONS.find(entry => entry.id === normalized.emblem) || SOCIETY_EMBLEM_OPTIONS[0];
  const joinRequirementEntry = SOCIETY_JOIN_REQUIREMENT_OPTIONS.find(entry => entry.id === normalized.join_requirement_id) || SOCIETY_JOIN_REQUIREMENT_OPTIONS[0];
  return {
    id: normalized.id,
    name: normalized.name,
    summary: normalized.summary,
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
    my_role: viewerMember?.role || '',
    my_role_label: viewerMember ? SOCIETY_ROLE_LABELS[viewerMember.role] || viewerMember.role : '',
    can_apply: !viewerMember && !viewerHasSociety && normalized.visibility !== 'private',
    members: members.map(entry => ({
      username: entry.username,
      display_name: entry.display_name,
      role: entry.role,
      role_label: SOCIETY_ROLE_LABELS[entry.role] || entry.role,
      joined_at: entry.joined_at,
    })),
    activity_log: normalized.activity_log.map(normalizeActivityEntry),
  };
}

async function buildOverview(store, username) {
  const viewerUsername = normalizeUsername(username);
  const mySociety = findMemberSociety(store, viewerUsername);
  const viewerHasSociety = !!mySociety;
  const visibleSocieties = (store.societies || [])
    .map(normalizeSociety)
    .filter(entry => entry.id !== mySociety?.id)
    .filter(entry => entry.visibility === 'public' || entry.visibility === 'semi_public')
    .sort((left, right) => {
      const memberDiff = right.members.length - left.members.length;
      if (memberDiff !== 0) return memberDiff;
      return right.updated_at - left.updated_at;
    });

  return {
    bulletin: '村社当前已支持创建、公开展示、徽记主题、容量和入社条件骨架，后续会继续补成员治理、提案、投票与公共建设。',
    my_society: mySociety ? await buildSocietySnapshot(mySociety, viewerUsername, true) : null,
    visible_societies: await Promise.all(visibleSocieties.map(entry => buildSocietySnapshot(entry, viewerUsername, viewerHasSociety))),
    visibility_options: SOCIETY_VISIBILITY_OPTIONS,
    theme_options: SOCIETY_THEME_OPTIONS,
    emblem_options: SOCIETY_EMBLEM_OPTIONS,
    capacity_options: SOCIETY_CAPACITY_OPTIONS,
    join_requirement_options: SOCIETY_JOIN_REQUIREMENT_OPTIONS,
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
  });

  appendSocietyActivity(society, `${displayName}创建了村社「${society.name}」`, 'create');
  store.societies = [...(store.societies || []), society];
  saveSocietyStore(store);

  return {
    society: await buildSocietySnapshot(society, username, true),
    overview: await buildOverview(store, username),
  };
}

module.exports = {
  listSocietyOverview,
  createSociety,
};
