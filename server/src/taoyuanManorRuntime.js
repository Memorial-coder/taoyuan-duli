const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createError, getActiveSaveContext } = require('./taoyuanSaveRuntime');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_MANOR_GUESTBOOK_FILE = path.join(DATA_DIR, 'taoyuan_manor_guestbook.json');
const TAOYUAN_MANOR_VISIT_FILE = path.join(DATA_DIR, 'taoyuan_manor_visits.json');
const TAOYUAN_MANOR_GUIDE_FILE = path.join(DATA_DIR, 'taoyuan_manor_guides.json');
const TAOYUAN_MANOR_FAVORITES_FILE = path.join(DATA_DIR, 'taoyuan_manor_favorites.json');
const TAOYUAN_MANOR_THEME_FILE = path.join(DATA_DIR, 'taoyuan_manor_theme_weeks.json');

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

const SEASON_LABELS = Object.freeze({
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
});

const SEASONAL_THEME_OPTIONS = Object.freeze({
  spring: ['花朝庭院', '春耕小院', '溪畔新绿'],
  summer: ['荷风消暑', '夜灯乘凉', '丰产忙夏'],
  autumn: ['金风收仓', '晒谷人家', '秋市客院'],
  winter: ['围炉小院', '雪灯静夜', '冬藏暖居'],
});

function buildCurrentFocus(gameplay = {}) {
  const quest = gameplay.quest || {};
  const goal = gameplay.goal || {};
  if (Array.isArray(quest.activeQuests) && quest.activeQuests.length > 0) {
    const firstQuest = quest.activeQuests[0];
    return sanitizeText(firstQuest?.description || firstQuest?.title || '正在推进当前任务', 80);
  }
  if (goal?.currentThemeWeekState) {
    const season = typeof gameplay?.game?.season === 'string' ? gameplay.game.season : '';
    const label = SEASON_LABELS[season] ? `${SEASON_LABELS[season]}季第${goal.currentThemeWeekState.weekOfSeason}周` : '本周主题';
    return `${label} · 继续整理田庄陈设`;
  }
  return '正在打理今天的庄园节奏';
}

function buildVisualSummary(gameplay = {}) {
  const home = gameplay.home || {};
  const decoration = gameplay.decoration || {};
  const placedCount = Object.values(decoration?.placed ?? {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const greenhouseUnlocked = Boolean(home?.greenhouseUnlocked);
  const cellarSlots = Array.isArray(home?.cellarSlots) ? home.cellarSlots.length : 0;
  const summary = [];
  if (placedCount > 0) summary.push(`已摆放装饰 ${placedCount} 件`);
  if (greenhouseUnlocked) summary.push('温室已开放');
  if (cellarSlots > 0) summary.push(`酒窖位 ${cellarSlots} 格`);
  return summary.join(' · ') || '以日常经营状态为主';
}

function buildSeasonLabel(game = {}) {
  const season = typeof game.season === 'string' ? game.season : '';
  const day = Number.isFinite(Number(game.day)) ? Number(game.day) : 0;
  const year = Number.isFinite(Number(game.year)) ? Number(game.year) : 0;
  if (!SEASON_LABELS[season] || day <= 0 || year <= 0) return '当前季节未同步';
  return `第${year}年 ${SEASON_LABELS[season]} 第${day}天`;
}

function ensureGuestbookStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_GUESTBOOK_FILE), { recursive: true });
}

function ensureVisitStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_VISIT_FILE), { recursive: true });
}

function ensureGuideStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_GUIDE_FILE), { recursive: true });
}

function ensureFavoriteStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_FAVORITES_FILE), { recursive: true });
}

function ensureThemeStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_THEME_FILE), { recursive: true });
}

function loadGuestbookStore() {
  ensureGuestbookStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_GUESTBOOK_FILE)) return { entries: [] };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_GUESTBOOK_FILE, 'utf8'));
    return raw && typeof raw === 'object' && Array.isArray(raw.entries)
      ? raw
      : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function saveGuestbookStore(store) {
  ensureGuestbookStore();
  fs.writeFileSync(TAOYUAN_MANOR_GUESTBOOK_FILE, JSON.stringify({
    entries: Array.isArray(store?.entries) ? store.entries : [],
  }, null, 2), 'utf8');
}

function loadVisitStore() {
  ensureVisitStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_VISIT_FILE)) return { entries: [] };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_VISIT_FILE, 'utf8'));
    return raw && typeof raw === 'object' && Array.isArray(raw.entries)
      ? raw
      : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function saveVisitStore(store) {
  ensureVisitStore();
  fs.writeFileSync(TAOYUAN_MANOR_VISIT_FILE, JSON.stringify({
    entries: Array.isArray(store?.entries) ? store.entries : [],
  }, null, 2), 'utf8');
}

function loadGuideStore() {
  ensureGuideStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_GUIDE_FILE)) return { guides: {} };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_GUIDE_FILE, 'utf8'));
    return raw && typeof raw === 'object' && raw.guides && typeof raw.guides === 'object'
      ? raw
      : { guides: {} };
  } catch {
    return { guides: {} };
  }
}

function saveGuideStore(store) {
  ensureGuideStore();
  fs.writeFileSync(TAOYUAN_MANOR_GUIDE_FILE, JSON.stringify({
    guides: store?.guides && typeof store.guides === 'object' ? store.guides : {},
  }, null, 2), 'utf8');
}

function loadFavoriteStore() {
  ensureFavoriteStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_FAVORITES_FILE)) return { favorites: [], follows: [] };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_FAVORITES_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
          follows: Array.isArray(raw.follows) ? raw.follows : [],
        }
      : { favorites: [], follows: [] };
  } catch {
    return { favorites: [], follows: [] };
  }
}

function saveFavoriteStore(store) {
  ensureFavoriteStore();
  fs.writeFileSync(TAOYUAN_MANOR_FAVORITES_FILE, JSON.stringify({
    favorites: Array.isArray(store?.favorites) ? store.favorites : [],
    follows: Array.isArray(store?.follows) ? store.follows : [],
  }, null, 2), 'utf8');
}

function loadThemeStore() {
  ensureThemeStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_THEME_FILE)) return { themes: {}, official_picks: {} };
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_THEME_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          themes: raw.themes && typeof raw.themes === 'object' ? raw.themes : {},
          official_picks: raw.official_picks && typeof raw.official_picks === 'object' ? raw.official_picks : {},
        }
      : { themes: {}, official_picks: {} };
  } catch {
    return { themes: {}, official_picks: {} };
  }
}

function saveThemeStore(store) {
  ensureThemeStore();
  fs.writeFileSync(TAOYUAN_MANOR_THEME_FILE, JSON.stringify({
    themes: store?.themes && typeof store.themes === 'object' ? store.themes : {},
    official_picks: store?.official_picks && typeof store.official_picks === 'object' ? store.official_picks : {},
  }, null, 2), 'utf8');
}

const MANOR_TEMPLATE_PRESETS = Object.freeze([
  {
    id: 'showcase',
    label: '展示类布局',
    summary: '突出当前主题、主视觉摘要和经营标签，适合向访客介绍庄园的总体气质。',
  },
  {
    id: 'operational',
    label: '经营类布局',
    summary: '突出当前重点、庄园导览和访客记录，适合展示正在推进的经营节奏。',
  },
  {
    id: 'festival',
    label: '节庆类布局',
    summary: '突出主题周、官方精选与当日来访摘要，适合节庆期间集中展示。',
  },
  {
    id: 'collection',
    label: '收藏类布局',
    summary: '突出收藏庄园、热门庄园榜与同主题收藏，适合展示关联庄园网络。',
  },
  {
    id: 'story',
    label: '故事类布局',
    summary: '突出留言墙、访客记录与主题路线，适合用讲故事的方式介绍庄园。',
  },
]);

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGuestbookKind(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['text', 'blessing', 'advice', 'stamp', 'signature'].includes(normalized)) return normalized;
  return 'text';
}

function normalizeGuestbookEntry(entry) {
  return {
    id: String(entry?.id || makeId('manor_guestbook')),
    target_username: String(entry?.target_username || '').trim(),
    author_username: String(entry?.author_username || '').trim(),
    author_display_name: sanitizeText(entry?.author_display_name, 30) || String(entry?.author_username || '匿名'),
    kind: normalizeGuestbookKind(entry?.kind),
    content: sanitizeText(entry?.content, 160),
    reply_text: sanitizeText(entry?.reply_text, 160),
    reply_author_display_name: sanitizeText(entry?.reply_author_display_name, 30),
    pinned: entry?.pinned === true,
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function getGuestbookEntriesForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadGuestbookStore();
  return store.entries
    .map(normalizeGuestbookEntry)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => {
      if (!!left.pinned !== !!right.pinned) return left.pinned ? -1 : 1;
      return right.created_at - left.created_at;
    });
}

function normalizeVisitPurpose(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['explore', 'friend_visit', 'gift', 'quest', 'other'].includes(normalized)) return normalized;
  return 'other';
}

function normalizeVisitEntry(entry) {
  return {
    id: String(entry?.id || makeId('manor_visit')),
    target_username: String(entry?.target_username || '').trim(),
    visitor_username: String(entry?.visitor_username || '').trim(),
    visitor_display_name: sanitizeText(entry?.visitor_display_name, 30) || String(entry?.visitor_username || '匿名'),
    purpose: normalizeVisitPurpose(entry?.purpose),
    summary: sanitizeText(entry?.summary, 160),
    feedback: sanitizeText(entry?.feedback, 160),
    carried_items: Array.isArray(entry?.carried_items)
      ? entry.carried_items
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            itemId: sanitizeText(item.itemId, 40),
            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          }))
          .filter(item => item.itemId.length > 0)
      : [],
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeGuidePoint(entry) {
  return {
    id: String(entry?.id || makeId('manor_point')),
    title: sanitizeText(entry?.title, 30),
    summary: sanitizeText(entry?.summary, 120),
    order: Math.max(0, Math.floor(Number(entry?.order) || 0)),
  };
}

function normalizeGuideRoute(entry) {
  return {
    id: String(entry?.id || makeId('manor_route')),
    title: sanitizeText(entry?.title, 30),
    summary: sanitizeText(entry?.summary, 120),
    point_ids: Array.isArray(entry?.point_ids) ? entry.point_ids.map(pointId => String(pointId).trim()).filter(Boolean).slice(0, 12) : [],
  };
}

function normalizeGuideConfig(config) {
  return {
    guide_points: Array.isArray(config?.guide_points) ? config.guide_points.map(normalizeGuidePoint).filter(entry => entry.title) : [],
    guide_routes: Array.isArray(config?.guide_routes) ? config.guide_routes.map(normalizeGuideRoute).filter(entry => entry.title) : [],
    updated_at: Number(config?.updated_at) || 0,
  };
}

function normalizeFavoriteEntry(entry) {
  return {
    id: String(entry?.id || makeId('manor_favorite')),
    owner_username: String(entry?.owner_username || '').trim(),
    manor_username: String(entry?.manor_username || '').trim(),
    theme: sanitizeText(entry?.theme, 40),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeFollowEntry(entry) {
  return {
    id: String(entry?.id || makeId('manor_follow')),
    owner_username: String(entry?.owner_username || '').trim(),
    manor_username: String(entry?.manor_username || '').trim(),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeThemeEntry(entry) {
  return {
    label: sanitizeText(entry?.label, 30),
    season: ['spring', 'summer', 'autumn', 'winter'].includes(String(entry?.season)) ? String(entry.season) : '',
    week_tag: sanitizeText(entry?.week_tag, 40),
    template_id: MANOR_TEMPLATE_PRESETS.some(item => item.id === entry?.template_id) ? String(entry.template_id) : 'showcase',
    updated_at: Number(entry?.updated_at) || 0,
  };
}

function getGuideConfig(username) {
  const store = loadGuideStore();
  const key = String(username || '').trim();
  return normalizeGuideConfig(store.guides?.[key] || {});
}

function updateGuideConfig(username, patch = {}) {
  const store = loadGuideStore();
  const key = String(username || '').trim();
  const current = normalizeGuideConfig(store.guides?.[key] || {});
  const next = normalizeGuideConfig({
    ...current,
    ...patch,
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.guides[key] = next;
  saveGuideStore(store);
  return next;
}

function getThemeConfig(username) {
  const store = loadThemeStore();
  const key = String(username || '').trim();
  return normalizeThemeEntry(store.themes?.[key] || {});
}

function updateThemeConfig(username, patch = {}) {
  const store = loadThemeStore();
  const key = String(username || '').trim();
  const current = normalizeThemeEntry(store.themes?.[key] || {});
  const next = normalizeThemeEntry({
    ...current,
    ...patch,
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.themes[key] = next;
  saveThemeStore(store);
  return next;
}

function getVisitsForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadVisitStore();
  return store.entries
    .map(normalizeVisitEntry)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => right.created_at - left.created_at);
}

function buildTodayVisitSummary(entries = []) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const todayEntries = entries.filter(entry => {
    const entryDate = new Date(entry.created_at * 1000);
    return entryDate.getFullYear() === year && entryDate.getMonth() === month && entryDate.getDate() === day;
  });
  if (todayEntries.length === 0) {
    return '今天还没有新的来访记录。';
  }
  const names = Array.from(new Set(todayEntries.map(entry => entry.visitor_display_name))).slice(0, 5);
  return `今天来过的人：${names.join('、')}。`;
}

function buildHotManorBoard() {
  const store = loadFavoriteStore();
  const counts = new Map();
  for (const entry of store.favorites.map(normalizeFavoriteEntry)) {
    const current = counts.get(entry.manor_username) || { count: 0, theme: entry.theme };
    counts.set(entry.manor_username, {
      count: current.count + 1,
      theme: current.theme || entry.theme,
    });
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 10)
    .map(([manor_username, info]) => ({
      manor_username,
      favorite_count: info.count,
      theme: info.theme,
    }));
}

function buildThemeWeekTag(game = {}, goal = {}) {
  const season = typeof game.season === 'string' ? game.season : '';
  const year = Number.isFinite(Number(game.year)) ? Number(game.year) : 0;
  const weekOfSeason = Number(goal?.currentThemeWeekState?.weekOfSeason);
  if (!SEASON_LABELS[season] || year <= 0 || !Number.isInteger(weekOfSeason) || weekOfSeason <= 0) {
    return '';
  }
  return `${year}-${season}-w${weekOfSeason}`;
}

function buildThemeWeekState(username, gameplay = {}, showcaseTheme = '', publicTags = [], favoriteCount = 0, placedDecorationCount = 0) {
  const game = gameplay.game || {};
  const goal = gameplay.goal || {};
  const season = typeof game.season === 'string' ? game.season : 'spring';
  const seasonalOptions = SEASONAL_THEME_OPTIONS[season] || SEASONAL_THEME_OPTIONS.spring;
  const savedTheme = getThemeConfig(username);
  const activeTheme = savedTheme.label || showcaseTheme || seasonalOptions[0];
  const seasonalScore = seasonalOptions.includes(activeTheme) ? 35 : 15;
  const decorationScore = Math.min(30, placedDecorationCount * 3);
  const tagScore = Math.min(20, (Array.isArray(publicTags) ? publicTags.length : 0) * 4);
  const socialScore = Math.min(15, favoriteCount * 5);
  const totalScore = Math.max(10, Math.min(100, seasonalScore + decorationScore + tagScore + socialScore));
  const recommendations = seasonalOptions.filter(option => option !== activeTheme).slice(0, 3);
  const weekTag = buildThemeWeekTag(game, goal);
  const officialPick = totalScore >= 75
    ? {
        label: '本周官方精选',
        reason: `主题分 ${totalScore}，且季节主题与庄园当前陈设匹配度较高。`,
      }
    : null;

  if (officialPick && weekTag) {
    const store = loadThemeStore();
    store.official_picks[weekTag] = {
      manor_username: username,
      label: officialPick.label,
      reason: officialPick.reason,
      updated_at: Math.floor(Date.now() / 1000),
    };
    saveThemeStore(store);
  }

  return {
    season,
    week_tag: weekTag,
    active_theme: activeTheme,
    active_theme_source: savedTheme.label ? 'owner' : showcaseTheme ? 'showcase' : 'seasonal_default',
    score: totalScore,
    recommendations,
    official_pick: officialPick,
    seasonal_options: [...seasonalOptions],
    template_id: savedTheme.template_id || 'showcase',
    template_options: MANOR_TEMPLATE_PRESETS.map(item => ({ ...item })),
  };
}

async function recordManorVisit(payload = {}, actor = {}) {
  const targetUsername = String(payload.target_username || '').trim();
  if (!targetUsername) throw createError('请先指定庄园主人');
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const summary = sanitizeText(payload.summary, 160);
  const feedback = sanitizeText(payload.feedback, 160);
  const carriedItems = Array.isArray(payload.carried_items) ? payload.carried_items : [];
  const entry = normalizeVisitEntry({
    id: makeId('manor_visit'),
    target_username: targetUsername,
    visitor_username: actor.username,
    visitor_display_name: actor.displayName || actor.username || '匿名',
    purpose: payload.purpose,
    summary: summary || '前来拜访',
    feedback,
    carried_items: carriedItems,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  const store = loadVisitStore();
  store.entries = [entry, ...store.entries];
  saveVisitStore(store);
  return entry;
}

async function leaveGuestbookEntry(payload = {}, actor = {}) {
  const targetUsername = String(payload.target_username || '').trim();
  if (!targetUsername) throw createError('请先指定庄园主人');
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const content = sanitizeText(payload.content, 160);
  if (content.length < 1) throw createError('留言内容不能为空');

  const store = loadGuestbookStore();
  const entry = normalizeGuestbookEntry({
    id: makeId('manor_guestbook'),
    target_username: targetUsername,
    author_username: actor.username,
    author_display_name: actor.displayName || actor.username || '匿名',
    kind: payload.kind,
    content,
    reply_text: '',
    reply_author_display_name: '',
    pinned: false,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  });
  store.entries = [entry, ...store.entries];
  saveGuestbookStore(store);
  return entry;
}

async function replyGuestbookEntry(entryId, payload = {}, actor = {}) {
  const store = loadGuestbookStore();
  const entry = store.entries
    .map(normalizeGuestbookEntry)
    .find(item => item.id === String(entryId || '').trim());
  if (!entry) throw createError('留言不存在', 404);
  if (entry.target_username !== actor.username) throw createError('只有庄园主人可以回复留言', 403);
  const replyText = sanitizeText(payload.reply_text, 160);
  if (replyText.length < 1) throw createError('回复内容不能为空');

  entry.reply_text = replyText;
  entry.reply_author_display_name = actor.displayName || actor.username || '庄园主人';
  entry.updated_at = Math.floor(Date.now() / 1000);
  store.entries = store.entries.map(item => {
    const normalized = normalizeGuestbookEntry(item);
    return normalized.id === entry.id ? entry : normalized;
  });
  saveGuestbookStore(store);
  return entry;
}

async function setGuestbookPinned(entryId, payload = {}, actor = {}) {
  const store = loadGuestbookStore();
  const entry = store.entries
    .map(normalizeGuestbookEntry)
    .find(item => item.id === String(entryId || '').trim());
  if (!entry) throw createError('留言不存在', 404);
  if (entry.target_username !== actor.username) throw createError('只有庄园主人可以置顶留言', 403);
  entry.pinned = payload?.pinned !== false;
  entry.updated_at = Math.floor(Date.now() / 1000);
  store.entries = store.entries.map(item => {
    const normalized = normalizeGuestbookEntry(item);
    return normalized.id === entry.id ? entry : normalized;
  });
  saveGuestbookStore(store);
  return entry;
}

async function buildManorSnapshot(username, viewerUsername = '', options = {}) {
  const user = await db.getUser(username);
  if (!user) throw createError('玩家不存在', 404);
  const viewer = viewerUsername || '';
  const profile = await taoyuanSocialRuntime.getPublicProfile(username, viewer || username);
  if (!profile) throw createError('庄园快照不存在', 404);

  const saveContext = (() => {
    try {
      return getActiveSaveContext(username, null, '该玩家当前没有可公开的庄园存档');
    } catch {
      return null;
    }
  })();

  const gameplay = saveContext?.data || {};
  const game = gameplay.game || {};
  const decoration = gameplay.decoration || {};
  const visitEntries = getVisitsForTarget(user.username);
  const guideConfig = getGuideConfig(user.username);
  const favoriteStore = loadFavoriteStore();
  const ownerFavorites = favoriteStore.favorites
    .map(normalizeFavoriteEntry)
    .filter(entry => entry.owner_username === viewer);
  const ownerFollows = favoriteStore.follows
    .map(normalizeFollowEntry)
    .filter(entry => entry.owner_username === viewer);
  const placedDecorationCount = Object.values(decoration?.placed ?? {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const publicTags = Array.isArray(profile.public_tags) ? profile.public_tags : [];
  const favoriteCount = favoriteStore.favorites
    .map(normalizeFavoriteEntry)
    .filter(entry => entry.manor_username === user.username)
    .length;
  const themeWeek = buildThemeWeekState(user.username, gameplay, profile.showcase_theme, publicTags, favoriteCount, placedDecorationCount);

  return {
    username: user.username,
    display_name: user.display_name || user.username,
    visibility: profile.visibility,
    viewer_is_owner: viewer === user.username,
    manor_name: profile.manor_name,
    public_title: profile.public_title,
    showcase_theme: profile.showcase_theme,
    season_progress: buildSeasonLabel(game),
    current_focus: buildCurrentFocus(gameplay),
    weekly_goal: sanitizeText(profile.showcase_theme || profile.primary_route_label || '本周经营展示', 60),
    visual_summary: buildVisualSummary(gameplay),
    placed_decoration_count: placedDecorationCount,
    public_tags: publicTags,
    guestbook_entries: getGuestbookEntriesForTarget(user.username),
    visit_entries: visitEntries,
    guide_points: guideConfig.guide_points.sort((left, right) => left.order - right.order),
    guide_routes: guideConfig.guide_routes,
    today_visit_summary: buildTodayVisitSummary(visitEntries),
    is_favorited_by_viewer: ownerFavorites.some(entry => entry.manor_username === user.username),
    is_followed_by_viewer: ownerFollows.some(entry => entry.manor_username === user.username),
    theme_week: themeWeek,
  };
}

async function getOwnManorSnapshot(username) {
  return buildManorSnapshot(username, username, { ignoreVisibility: true });
}

async function getPublicManorSnapshot(username, viewerUsername = '') {
  return buildManorSnapshot(username, viewerUsername);
}

async function updateManorGuide(username, payload = {}) {
  const guidePoints = Array.isArray(payload.guide_points)
    ? payload.guide_points.map(normalizeGuidePoint).filter(entry => entry.title).slice(0, 12)
    : undefined;
  const guideRoutes = Array.isArray(payload.guide_routes)
    ? payload.guide_routes.map(normalizeGuideRoute).filter(entry => entry.title).slice(0, 6)
    : undefined;
  updateGuideConfig(username, {
    guide_points: guidePoints,
    guide_routes: guideRoutes,
  });
  return buildManorSnapshot(username, username);
}

async function updateManorThemeWeek(username, payload = {}) {
  updateThemeConfig(username, {
    label: payload.label,
    season: payload.season,
    week_tag: payload.week_tag,
    template_id: payload.template_id,
  });
  return buildManorSnapshot(username, username);
}

async function favoriteManor(username, targetUsername, payload = {}) {
  const store = loadFavoriteStore();
  const owner = String(username || '').trim();
  const manor = String(targetUsername || '').trim();
  if (!manor) throw createError('请先指定庄园主人');
  const targetUser = await db.getUser(manor);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const existing = store.favorites
    .map(normalizeFavoriteEntry)
    .find(entry => entry.owner_username === owner && entry.manor_username === manor);
  if (existing) return existing;
  const snapshot = await buildManorSnapshot(manor, owner);
  const entry = normalizeFavoriteEntry({
    id: makeId('manor_favorite'),
    owner_username: owner,
    manor_username: manor,
    theme: payload.theme || snapshot.showcase_theme,
    created_at: Math.floor(Date.now() / 1000),
  });
  store.favorites = [entry, ...store.favorites];
  saveFavoriteStore(store);
  return entry;
}

async function followManor(username, targetUsername) {
  const store = loadFavoriteStore();
  const owner = String(username || '').trim();
  const manor = String(targetUsername || '').trim();
  if (!manor) throw createError('请先指定庄园主人');
  const targetUser = await db.getUser(manor);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const existing = store.follows
    .map(normalizeFollowEntry)
    .find(entry => entry.owner_username === owner && entry.manor_username === manor);
  if (existing) return existing;
  const entry = normalizeFollowEntry({
    id: makeId('manor_follow'),
    owner_username: owner,
    manor_username: manor,
    created_at: Math.floor(Date.now() / 1000),
  });
  store.follows = [entry, ...store.follows];
  saveFavoriteStore(store);
  return entry;
}

async function listFavoriteOverview(username) {
  const owner = String(username || '').trim();
  const store = loadFavoriteStore();
  const favorites = await Promise.all(
    store.favorites
      .map(normalizeFavoriteEntry)
      .filter(entry => entry.owner_username === owner)
      .sort((left, right) => right.created_at - left.created_at)
      .map(async entry => ({
        ...entry,
        snapshot: await buildManorSnapshot(entry.manor_username, owner),
      }))
  );
  const sameThemeFavorites = Object.values(
    favorites.reduce((acc, entry) => {
      const key = entry.theme || entry.snapshot.showcase_theme || '未分类主题';
      acc[key] = acc[key] || [];
      acc[key].push({
        manor_username: entry.manor_username,
        display_name: entry.snapshot.display_name,
      });
      return acc;
    }, {})
  ).filter(entries => entries.length > 1);

  return {
    favorites,
    same_theme_favorites: sameThemeFavorites,
    hot_manors: buildHotManorBoard(),
  };
}

module.exports = {
  getOwnManorSnapshot,
  getPublicManorSnapshot,
  leaveGuestbookEntry,
  replyGuestbookEntry,
  setGuestbookPinned,
  recordManorVisit,
  updateManorGuide,
  updateManorThemeWeek,
  favoriteManor,
  followManor,
  listFavoriteOverview,
};
