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
  updated_at: 0,
  last_active_at: 0,
});

function createEmptySocialStore() {
  return {
    profiles: {},
    friend_requests: [],
    friendships: [],
    blocks: [],
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
  });
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  const next = normalizeStoredProfile({
    ...current,
    ...patch,
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

async function buildProfile(username, viewerUsername = '', options = {}) {
  const user = await db.getUser(username);
  if (!user) throw createError('玩家不存在', 404);

  const saveContext = resolveActiveSaveContext(username);
  const gameplay = saveContext?.data || {};
  const storedProfile = getStoredProfile(username);
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
    updated_at: storedProfile.updated_at,
    last_active_at: storedProfile.last_active_at,
  };
}

async function buildRelationCard(username, viewerUsername = '') {
  return buildProfile(username, viewerUsername, { ignoreVisibility: true });
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

  return {
    incoming_requests,
    outgoing_requests,
    friends,
    blocked_users,
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

module.exports = {
  getOwnProfile,
  getPublicProfile,
  updateOwnProfile,
  listRelationshipOverview,
  requestFriendship,
  acceptFriendRequest,
  rejectFriendRequest,
  blockPlayer,
  unblockPlayer,
};
