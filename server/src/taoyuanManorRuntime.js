const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanImageModeration = require('./taoyuanImageModeration');
const { moderateText } = require('./taoyuanTextModeration');
const { createError, findSaveIdentityById, getActiveSaveContext, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_MANOR_GUESTBOOK_FILE = path.join(DATA_DIR, 'taoyuan_manor_guestbook.json');
const TAOYUAN_MANOR_VISIT_FILE = path.join(DATA_DIR, 'taoyuan_manor_visits.json');
const TAOYUAN_MANOR_GUIDE_FILE = path.join(DATA_DIR, 'taoyuan_manor_guides.json');
const TAOYUAN_MANOR_FAVORITES_FILE = path.join(DATA_DIR, 'taoyuan_manor_favorites.json');
const TAOYUAN_MANOR_THEME_FILE = path.join(DATA_DIR, 'taoyuan_manor_theme_weeks.json');
const TAOYUAN_MANOR_CARE_FILE = path.join(DATA_DIR, 'taoyuan_manor_care.json');

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeManorSaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0;
}

function normalizeManorSaveSlot(value) {
  if (value === null || value === undefined || value === '') return null;
  const slot = Number(value);
  return Number.isInteger(slot) && slot >= 0 && slot <= 2 ? slot : null;
}

function resolveManorTarget(payload = {}, emptyMessage = '请先指定庄园主人') {
  const rawTargetSaveId = payload?.target_save_id ?? payload?.save_id;
  const hasTargetSaveId = rawTargetSaveId !== undefined && rawTargetSaveId !== null && `${rawTargetSaveId}`.trim() !== '';
  if (hasTargetSaveId) {
    const targetSaveId = Number(rawTargetSaveId);
    if (!Number.isInteger(targetSaveId)) throw createError('存档 ID 格式不正确', 400);
    const identity = findSaveIdentityById(targetSaveId);
    if (!identity?.account_username) throw createError('目标存档 ID 不存在', 404);
    return {
      username: sanitizeText(identity.account_username, 60),
      identity,
    };
  }
  const targetUsername = sanitizeText(payload?.target_username, 60);
  if (!targetUsername) throw createError(emptyMessage);
  return {
    username: targetUsername,
    identity: null,
  };
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

function ensureCareStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_MANOR_CARE_FILE), { recursive: true });
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

function createEmptyCareStore() {
  return {
    policies: {},
    entries: [],
  };
}

function loadCareStore() {
  ensureCareStore();
  try {
    if (!fs.existsSync(TAOYUAN_MANOR_CARE_FILE)) return createEmptyCareStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MANOR_CARE_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          policies: raw.policies && typeof raw.policies === 'object' ? raw.policies : {},
          entries: Array.isArray(raw.entries) ? raw.entries : [],
        }
      : createEmptyCareStore();
  } catch {
    return createEmptyCareStore();
  }
}

function saveCareStore(store) {
  ensureCareStore();
  writeJsonFileAtomic(TAOYUAN_MANOR_CARE_FILE, {
    policies: store?.policies && typeof store.policies === 'object' ? store.policies : {},
    entries: Array.isArray(store?.entries) ? store.entries : [],
  });
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

const MANOR_ACCESS_MODES = Object.freeze(['public', 'friends', 'mutual', 'closed']);
const MANOR_ACCESS_MODE_LABELS = Object.freeze({
  public: '公开',
  friends: '好友',
  mutual: '互关',
  closed: '关闭',
});

const MANOR_CARE_DAILY_VISITOR_LIMIT = 4;
const MANOR_CARE_DAILY_MANOR_LIMIT = 12;
const MANOR_CARE_RECENT_LOG_LIMIT = 24;

const MANOR_CARE_VISUAL_OBJECT_IDS = Object.freeze({
  field: 'manor_field',
  fruitGrove: 'manor_fruit_grove',
  animalShed: 'manor_animal_shed',
  fishPond: 'manor_fish_pond',
  beehive: 'manor_beehive',
  flowerBed: 'manor_flower_bed',
});

const MANOR_CARE_ACTION_DEFS = Object.freeze([
  {
    id: 'water_field',
    label: '帮忙浇水',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    required_metric: 'waterable_count',
    owner_benefit: '作物获得今日灌溉保护',
    visitor_reward: '友情点 +1',
  },
  {
    id: 'cure_pests',
    label: '帮忙除虫',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    required_metric: 'pest_count',
    owner_benefit: '虫害风险被压低',
    visitor_reward: '友情点 +1',
  },
  {
    id: 'clear_weeds',
    label: '清理杂草',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    required_metric: 'weed_count',
    owner_benefit: '田区获得整洁保护',
    visitor_reward: '友情点 +1',
  },
  {
    id: 'feed_animals',
    label: '帮忙喂食',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.animalShed,
    required_metric: 'unfed_count',
    owner_benefit: '动物获得今日饱食保护',
    visitor_reward: '伴手草料 +1',
  },
  {
    id: 'soothe_animals',
    label: '安抚动物',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.animalShed,
    required_metric: 'animal_care_count',
    owner_benefit: '动物心情获得轻量安抚',
    visitor_reward: '友情点 +1',
  },
  {
    id: 'collect_drops',
    label: '收拾掉落物',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove,
    required_metric: 'drop_count',
    owner_benefit: '掉落果实被整理成保护记录',
    visitor_reward: '边角果篮 +1',
  },
  {
    id: 'clean_pond',
    label: '整理鱼塘',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.fishPond,
    required_metric: 'pond_care_count',
    owner_benefit: '鱼塘水质获得短时保护',
    visitor_reward: '友情点 +1',
  },
  {
    id: 'check_beehive',
    label: '巡护蜂箱',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.beehive,
    required_metric: 'beehive_care_count',
    owner_benefit: '蜂箱获得巡护记录',
    visitor_reward: '蜂蜡碎片 +1',
  },
  {
    id: 'water_flowers',
    label: '照看花圃',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed,
    required_metric: 'flower_care_count',
    owner_benefit: '花圃获得今日照看记录',
    visitor_reward: '友情点 +1',
  },
]);

const MANOR_CARE_ACTION_BY_ID = Object.freeze(
  Object.fromEntries(MANOR_CARE_ACTION_DEFS.map(action => [action.id, action]))
);

const MANOR_CARE_VISUAL_OBJECT_DEFS = Object.freeze([
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    label: '田地',
    kind: 'field',
    x: 24,
    y: 58,
    progress_target: 3,
    metric_key: 'field_care_count',
  },
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove,
    label: '果树',
    kind: 'fruit_tree',
    x: 20,
    y: 24,
    progress_target: 1,
    metric_key: 'drop_count',
  },
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.animalShed,
    label: '畜棚',
    kind: 'animal_shed',
    x: 67,
    y: 53,
    progress_target: 2,
    metric_key: 'animal_care_count',
  },
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.fishPond,
    label: '鱼塘',
    kind: 'fish_pond',
    x: 78,
    y: 28,
    progress_target: 1,
    metric_key: 'pond_care_count',
  },
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.beehive,
    label: '蜂箱',
    kind: 'beehive',
    x: 45,
    y: 22,
    progress_target: 1,
    metric_key: 'beehive_care_count',
  },
  {
    id: MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed,
    label: '花圃',
    kind: 'garden',
    x: 52,
    y: 76,
    progress_target: 1,
    metric_key: 'flower_care_count',
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
    target_save_id: normalizeManorSaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeManorSaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
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
    target_save_id: normalizeManorSaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeManorSaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
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
  const coverImageUrl = sanitizeText(entry?.cover_image_url, 500);
  const coverImageState = coverImageUrl
    ? taoyuanImageModeration.getUploadedImagePublicState(coverImageUrl)
    : { visible: true };
  return {
    label: sanitizeText(entry?.label, 30),
    season: ['spring', 'summer', 'autumn', 'winter'].includes(String(entry?.season)) ? String(entry.season) : '',
    week_tag: sanitizeText(entry?.week_tag, 40),
    template_id: MANOR_TEMPLATE_PRESETS.some(item => item.id === entry?.template_id) ? String(entry.template_id) : 'showcase',
    cover_image_url: coverImageState.visible ? coverImageUrl : '',
    cover_image_alt: sanitizeText(entry?.cover_image_alt, 120) || '庄园主图',
    updated_at: Number(entry?.updated_at) || 0,
  };
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function getLocalDayTag(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeManorAccessMode(value, fallback = 'public') {
  const normalized = String(value || '').trim().toLowerCase();
  if (MANOR_ACCESS_MODES.includes(normalized)) return normalized;
  return MANOR_ACCESS_MODES.includes(fallback) ? fallback : 'public';
}

function getDefaultManorVisitMode(profile = {}) {
  if (profile.visibility === 'private') return 'closed';
  if (profile.visibility === 'friends_only') return 'friends';
  return 'public';
}

function normalizeManorAccessPolicy(policy = {}, profile = {}) {
  const visitFallback = getDefaultManorVisitMode(profile);
  const visitMode = normalizeManorAccessMode(policy?.visit_mode, visitFallback);
  return {
    visit_mode: visitMode,
    care_mode: normalizeManorAccessMode(policy?.care_mode, visitMode === 'closed' ? 'closed' : 'friends'),
    steal_mode: normalizeManorAccessMode(policy?.steal_mode, 'closed'),
    updated_at: Math.max(0, Math.floor(Number(policy?.updated_at) || 0)),
    options: MANOR_ACCESS_MODES.map(id => ({
      id,
      label: MANOR_ACCESS_MODE_LABELS[id],
    })),
  };
}

function normalizeManorCareEntry(entry) {
  return {
    id: String(entry?.id || makeId('manor_care')),
    target_username: String(entry?.target_username || '').trim(),
    target_save_id: normalizeManorSaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeManorSaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
    visitor_username: String(entry?.visitor_username || '').trim(),
    visitor_display_name: sanitizeText(entry?.visitor_display_name, 30) || String(entry?.visitor_username || '匿名'),
    action_id: sanitizeText(entry?.action_id, 60),
    action_label: sanitizeText(entry?.action_label, 40),
    object_id: sanitizeText(entry?.object_id, 80),
    object_label: sanitizeText(entry?.object_label, 40),
    day_tag: sanitizeText(entry?.day_tag, 20),
    idempotency_key: sanitizeText(entry?.idempotency_key, 160),
    owner_benefit: sanitizeText(entry?.owner_benefit, 120),
    visitor_reward: sanitizeText(entry?.visitor_reward, 80),
    summary: sanitizeText(entry?.summary, 180),
    created_at: Number(entry?.created_at) || nowSeconds(),
  };
}

function normalizeOnlineVisualObject(entry) {
  const progressTarget = Math.max(0, Math.floor(Number(entry?.progress_target) || 0));
  return {
    id: sanitizeText(entry?.id, 80),
    label: sanitizeText(entry?.label, 40),
    kind: sanitizeText(entry?.kind, 40),
    x: clampNumber(entry?.x, 0, 100),
    y: clampNumber(entry?.y, 0, 100),
    state: ['idle', 'needs_action', 'busy', 'complete', 'overheated', 'blocked'].includes(String(entry?.state || ''))
      ? String(entry.state)
      : 'idle',
    available_action_ids: Array.isArray(entry?.available_action_ids)
      ? entry.available_action_ids.map(actionId => sanitizeText(actionId, 60)).filter(Boolean).slice(0, 8)
      : [],
    progress_value: clampNumber(entry?.progress_value, 0, Math.max(progressTarget, 999)),
    progress_target: progressTarget,
    handled_by: sanitizeText(entry?.handled_by, 40),
    handled_at: Math.max(0, Math.floor(Number(entry?.handled_at) || 0)),
    requires_cooperation: entry?.requires_cooperation === true,
    cooperation_required_count: Math.max(0, Math.floor(Number(entry?.cooperation_required_count) || 0)),
    cooperation_current_count: Math.max(0, Math.floor(Number(entry?.cooperation_current_count) || 0)),
  };
}

function normalizeManorCareVisualState(payload = {}, username = '') {
  return {
    board_type: 'scene',
    board_id: sanitizeText(payload?.board_id, 120) || `manor:${sanitizeText(username, 60)}:care`,
    revision: Math.max(0, Math.floor(Number(payload?.revision) || 0)),
    selected_visual_id: sanitizeText(payload?.selected_visual_id, 80),
    nodes: [],
    objects: Array.isArray(payload?.objects)
      ? payload.objects.map(normalizeOnlineVisualObject).filter(object => object.id).slice(0, 24)
      : [],
    tracks: [],
    async_projects: [],
    highlights: Array.isArray(payload?.highlights) ? payload.highlights.slice(0, 16) : [],
    recent_feedback: sanitizeText(payload?.recent_feedback, 180),
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

function getManorAccessPolicy(username, profile = {}) {
  const store = loadCareStore();
  const key = String(username || '').trim();
  return normalizeManorAccessPolicy(store.policies?.[key] || {}, profile);
}

function updateManorAccessPolicyConfig(username, patch = {}, profile = {}) {
  const store = loadCareStore();
  const key = String(username || '').trim();
  const current = normalizeManorAccessPolicy(store.policies?.[key] || {}, profile);
  const next = normalizeManorAccessPolicy({
    ...current,
    visit_mode: patch.visit_mode,
    care_mode: patch.care_mode,
    steal_mode: patch.steal_mode ?? current.steal_mode,
    updated_at: nowSeconds(),
  }, profile);
  store.policies[key] = next;
  saveCareStore(store);
  return next;
}

function getManorFollowRelation(ownerUsername, viewerUsername) {
  const owner = String(ownerUsername || '').trim();
  const viewer = String(viewerUsername || '').trim();
  if (!owner || !viewer || owner === viewer) {
    return {
      viewer_follows_owner: owner === viewer,
      owner_follows_viewer: owner === viewer,
      mutual_follow: owner === viewer,
    };
  }
  const store = loadFavoriteStore();
  const follows = (store.follows || []).map(normalizeFollowEntry);
  const viewerFollowsOwner = follows.some(entry => entry.owner_username === viewer && entry.manor_username === owner);
  const ownerFollowsViewer = follows.some(entry => entry.owner_username === owner && entry.manor_username === viewer);
  return {
    viewer_follows_owner: viewerFollowsOwner,
    owner_follows_viewer: ownerFollowsViewer,
    mutual_follow: viewerFollowsOwner && ownerFollowsViewer,
  };
}

function buildManorRelationContext(ownerUsername, viewerUsername = '') {
  const owner = String(ownerUsername || '').trim();
  const viewer = String(viewerUsername || '').trim();
  const viewerIsOwner = !!viewer && viewer === owner;
  const isFriend = viewerIsOwner || (!!viewer && taoyuanSocialRuntime.isFriendWith(viewer, owner));
  const followRelation = getManorFollowRelation(owner, viewer);
  return {
    viewer_is_owner: viewerIsOwner,
    viewer_is_friend: isFriend,
    viewer_is_mutual: viewerIsOwner || isFriend || followRelation.mutual_follow,
    ...followRelation,
  };
}

function canAccessByMode(mode, relationContext) {
  if (relationContext?.viewer_is_owner) return true;
  if (mode === 'public') return true;
  if (mode === 'friends') return relationContext?.viewer_is_friend === true;
  if (mode === 'mutual') return relationContext?.viewer_is_mutual === true;
  return false;
}

function buildAccessDenyMessage(mode, actionLabel = '访问') {
  if (mode === 'closed') return `庄园主人已关闭${actionLabel}`;
  if (mode === 'mutual') return `只有互关好友可以${actionLabel}`;
  if (mode === 'friends') return `只有好友可以${actionLabel}`;
  return `当前无法${actionLabel}`;
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

function getCareEntriesForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadCareStore();
  return store.entries
    .map(normalizeManorCareEntry)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => right.created_at - left.created_at);
}

function countCareEntries(entries, predicate) {
  return entries.reduce((sum, entry) => sum + (predicate(entry) ? 1 : 0), 0);
}

function buildManorCareMetrics(gameplay = {}) {
  const farm = gameplay.farm || {};
  const animal = gameplay.animal || {};
  const fishPond = gameplay.fishPond || {};
  const decoration = gameplay.decoration || {};
  const plots = [
    ...(Array.isArray(farm.plots) ? farm.plots : []),
    ...(Array.isArray(farm.greenhousePlots) ? farm.greenhousePlots : []),
  ];
  const croppedPlots = plots.filter(plot => ['planted', 'growing', 'harvestable'].includes(String(plot?.state || '')) && plot?.cropId);
  const fruitTrees = Array.isArray(farm.fruitTrees) ? farm.fruitTrees : [];
  const animals = Array.isArray(animal.animals) ? animal.animals : [];
  const pets = Array.isArray(animal.pets) ? animal.pets : [];
  const pond = fishPond.pond && typeof fishPond.pond === 'object' ? fishPond.pond : {};
  const pondFish = Array.isArray(pond.fish) ? pond.fish : [];
  const placedDecorationCount = Object.values(decoration?.placed ?? {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const waterableCount = croppedPlots.filter(plot => ['planted', 'growing'].includes(String(plot?.state || '')) && plot.watered !== true).length;
  const pestCount = croppedPlots.filter(plot => plot?.infested === true).length;
  const weedCount = croppedPlots.filter(plot => plot?.weedy === true).length;
  const unfedCount = animals.filter(entry => entry?.wasFed !== true).length;
  const sickAnimalCount = animals.filter(entry => entry?.sick === true).length;
  const unpettedCount = [
    ...animals.filter(entry => entry?.wasPetted !== true),
    ...pets.filter(entry => entry?.wasPetted !== true),
  ].length;
  const matureFruitCount = fruitTrees.filter(tree => tree?.mature === true && tree?.todayFruit === true).length;
  const pondWaterQuality = clampNumber(pond.waterQuality ?? pond.water_quality ?? 100, 0, 100);

  return {
    active_plot_count: croppedPlots.length,
    waterable_count: waterableCount,
    pest_count: pestCount,
    weed_count: weedCount,
    field_care_count: waterableCount + pestCount + weedCount,
    fruit_tree_count: fruitTrees.length,
    drop_count: matureFruitCount,
    animal_count: animals.length,
    pet_count: pets.length,
    unfed_count: unfedCount,
    sick_animal_count: sickAnimalCount,
    unpetted_count: unpettedCount,
    animal_care_count: unfedCount + sickAnimalCount + unpettedCount,
    pond_fish_count: pondFish.length,
    pond_water_quality: pondWaterQuality,
    pond_care_count: pondFish.length > 0 || pondWaterQuality < 80 ? 1 : 0,
    beehive_care_count: Math.max(1, Math.min(3, Math.floor(placedDecorationCount / 3) || 1)),
    flower_care_count: Math.max(1, Math.min(3, placedDecorationCount || croppedPlots.length || 1)),
  };
}

function getManorCareObjectState(definition, metrics, progressValue, progressTarget) {
  if (progressTarget > 0 && progressValue >= progressTarget) return 'complete';
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.field) {
    if (metrics.pest_count > 0) return 'overheated';
    if (metrics.weed_count > 0) return 'blocked';
    if (metrics.waterable_count > 0) return 'needs_action';
    return metrics.active_plot_count > 0 ? 'idle' : 'blocked';
  }
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.animalShed) {
    if (metrics.sick_animal_count > 0) return 'overheated';
    if (metrics.unfed_count > 0 || metrics.unpetted_count > 0) return 'needs_action';
    return metrics.animal_count > 0 || metrics.pet_count > 0 ? 'idle' : 'blocked';
  }
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove) {
    if (metrics.drop_count > 0) return 'needs_action';
    return metrics.fruit_tree_count > 0 ? 'idle' : 'blocked';
  }
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.fishPond) {
    if (metrics.pond_water_quality < 50) return 'overheated';
    if (metrics.pond_water_quality < 80 || metrics.pond_fish_count > 0) return 'needs_action';
    return 'idle';
  }
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.beehive) return 'needs_action';
  if (definition.id === MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed) return 'needs_action';
  return 'idle';
}

function buildManorCareActionIds(objectId, metrics, context) {
  if (!context.canCare || context.remainingCareCount <= 0) return [];
  if ((context.objectCounts.get(objectId) || 0) >= context.objectLimitById.get(objectId)) return [];
  return MANOR_CARE_ACTION_DEFS
    .filter(action => action.object_id === objectId)
    .filter(action => Math.max(0, Number(metrics[action.required_metric]) || 0) > 0)
    .map(action => action.id);
}

function buildManorCareVisualObjects(gameplay, careEntries, context) {
  const metrics = buildManorCareMetrics(gameplay);
  return MANOR_CARE_VISUAL_OBJECT_DEFS.map(definition => {
    const progressTarget = Math.max(0, Math.floor(Number(definition.progress_target) || 0));
    const progressValue = Math.min(progressTarget, context.objectCounts.get(definition.id) || 0);
    const recentEntry = careEntries.find(entry => entry.object_id === definition.id);
    return normalizeOnlineVisualObject({
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      x: definition.x,
      y: definition.y,
      state: getManorCareObjectState(definition, metrics, progressValue, progressTarget),
      available_action_ids: buildManorCareActionIds(definition.id, metrics, context),
      progress_value: progressValue,
      progress_target: progressTarget,
      handled_by: recentEntry?.visitor_username || '',
      handled_at: recentEntry?.created_at || 0,
      requires_cooperation: false,
      cooperation_required_count: 0,
      cooperation_current_count: 0,
    });
  });
}

function buildManorCareSnapshot(username, viewerUsername, gameplay, relationContext, accessPolicy, careEntries) {
  const dayTag = getLocalDayTag();
  const todayEntries = careEntries.filter(entry => entry.day_tag === dayTag);
  const viewerEntries = todayEntries.filter(entry => entry.visitor_username === viewerUsername);
  const objectCounts = new Map();
  for (const entry of todayEntries) {
    objectCounts.set(entry.object_id, (objectCounts.get(entry.object_id) || 0) + 1);
  }
  const objectLimitById = new Map(MANOR_CARE_VISUAL_OBJECT_DEFS.map(definition => [definition.id, Math.max(1, definition.progress_target || 1)]));
  const canCareByPolicy = canAccessByMode(accessPolicy.care_mode, relationContext);
  const remainingCareCount = Math.max(0, MANOR_CARE_DAILY_VISITOR_LIMIT - viewerEntries.length);
  const manorRemainingCareCount = Math.max(0, MANOR_CARE_DAILY_MANOR_LIMIT - todayEntries.length);
  const canCare = Boolean(
    viewerUsername
    && !relationContext.viewer_is_owner
    && canCareByPolicy
    && remainingCareCount > 0
    && manorRemainingCareCount > 0
  );
  const context = {
    canCare,
    remainingCareCount,
    objectCounts,
    objectLimitById,
  };
  const objects = buildManorCareVisualObjects(gameplay, careEntries, context);
  const recentEntry = careEntries[0] || null;
  const recentFeedback = recentEntry
    ? recentEntry.summary
    : canCare
      ? '好友可以帮忙处理今日庄园照料。'
      : buildAccessDenyMessage(accessPolicy.care_mode, '照料这座庄园');
  return {
    visual_state: normalizeManorCareVisualState({
      board_id: `manor:${username}:care`,
      revision: careEntries.length,
      selected_visual_id: objects.find(object => object.available_action_ids.length > 0)?.id || objects[0]?.id || '',
      objects,
      recent_feedback: recentFeedback,
    }, username),
    care_state: {
      day_tag: dayTag,
      action_labels: Object.fromEntries(MANOR_CARE_ACTION_DEFS.map(action => [action.id, action.label])),
      action_effects: Object.fromEntries(MANOR_CARE_ACTION_DEFS.map(action => [action.id, {
        owner_benefit: action.owner_benefit,
        visitor_reward: action.visitor_reward,
      }])),
      limits: {
        visitor_daily_limit: MANOR_CARE_DAILY_VISITOR_LIMIT,
        manor_daily_limit: MANOR_CARE_DAILY_MANOR_LIMIT,
      },
      visitor_daily_count: viewerEntries.length,
      manor_daily_count: todayEntries.length,
      remaining_care_count: remainingCareCount,
      manor_remaining_care_count: manorRemainingCareCount,
      can_care: canCare,
      care_denied_reason: canCare
        ? ''
        : remainingCareCount <= 0
          ? '今天在这座庄园的照料次数已用完'
          : manorRemainingCareCount <= 0
            ? '这座庄园今天已经被照料得足够多了'
            : buildAccessDenyMessage(accessPolicy.care_mode, '照料这座庄园'),
    },
  };
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
    cover_image_url: savedTheme.cover_image_url || '',
    cover_image_alt: savedTheme.cover_image_alt || '',
    template_options: MANOR_TEMPLATE_PRESETS.map(item => ({ ...item })),
  };
}

async function recordManorVisit(payload = {}, actor = {}) {
  const { username: targetUsername, identity: targetIdentity } = resolveManorTarget(payload);
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const summary = sanitizeText(payload.summary, 160);
  const feedback = sanitizeText(payload.feedback, 160);
  const carriedItems = Array.isArray(payload.carried_items) ? payload.carried_items : [];
  const entry = normalizeVisitEntry({
    id: makeId('manor_visit'),
    target_username: targetUsername,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
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
  const { username: targetUsername, identity: targetIdentity } = resolveManorTarget(payload);
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const content = moderateText(payload.content, {
    label: '庄园留言',
    field: 'content',
    scene: 'manor_guestbook',
    minLength: 1,
    maxLength: 160,
    storageMaxLength: 160,
    maxLineBreaks: 3,
  });
  if (content.length < 1) throw createError('留言内容不能为空');

  const store = loadGuestbookStore();
  const entry = normalizeGuestbookEntry({
    id: makeId('manor_guestbook'),
    target_username: targetUsername,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
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
  const replyText = moderateText(payload.reply_text, {
    label: '留言回复',
    field: 'reply_text',
    scene: 'manor_guestbook_reply',
    minLength: 1,
    maxLength: 160,
    storageMaxLength: 160,
    maxLineBreaks: 3,
  });
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
  const profile = await taoyuanSocialRuntime.getPublicProfile(username, username);
  if (!profile) throw createError('庄园快照不存在', 404);
  const relationContext = buildManorRelationContext(user.username, viewer);
  const accessPolicy = getManorAccessPolicy(user.username, profile);
  if (!canAccessByMode(accessPolicy.visit_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.visit_mode, '访问这座庄园'), 403);
  }

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
  const careEntries = getCareEntriesForTarget(user.username);
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
  const careSnapshot = buildManorCareSnapshot(user.username, viewer, gameplay, relationContext, accessPolicy, careEntries);

  return {
    username: user.username,
    display_name: user.display_name || user.username,
    visibility: profile.visibility,
    viewer_is_owner: relationContext.viewer_is_owner,
    manor_name: profile.manor_name,
    avatar_image_url: profile.avatar_image_url || '',
    avatar_image_alt: profile.avatar_image_alt || '',
    cover_image_url: themeWeek.cover_image_url || '',
    cover_image_alt: themeWeek.cover_image_alt || '',
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
    access_policy: accessPolicy,
    relation_context: {
      ...relationContext,
      can_visit: true,
      can_care: careSnapshot.care_state.can_care,
    },
    visual_state: careSnapshot.visual_state,
    care_state: careSnapshot.care_state,
    care_entries: careEntries.slice(0, MANOR_CARE_RECENT_LOG_LIMIT),
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
  const coverImageUrl = sanitizeText(payload.cover_image_url, 500);
  if (coverImageUrl) {
    taoyuanImageModeration.ensureUsableUploadedImageUrl(coverImageUrl, ['manor_cover']);
  }
  updateThemeConfig(username, {
    label: moderateText(payload.label, {
      label: '庄园主题周标题',
      field: 'label',
      scene: 'manor_theme_week',
      maxLength: 30,
      storageMaxLength: 30,
    }),
    season: payload.season,
    week_tag: payload.week_tag,
    template_id: payload.template_id,
    cover_image_url: coverImageUrl,
    cover_image_alt: coverImageUrl ? (sanitizeText(payload.cover_image_alt, 120) || '庄园主图') : '',
  });
  return buildManorSnapshot(username, username);
}

async function updateManorAccessPolicy(username, payload = {}) {
  const owner = String(username || '').trim();
  if (!owner) throw createError('请先登录');
  const profile = await taoyuanSocialRuntime.getPublicProfile(owner, owner);
  const policy = updateManorAccessPolicyConfig(owner, {
    visit_mode: payload.visit_mode,
    care_mode: payload.care_mode,
    steal_mode: payload.steal_mode,
  }, profile);
  const snapshot = await buildManorSnapshot(owner, owner);
  return {
    policy,
    snapshot,
  };
}

function buildManorCareIdempotencyKey(targetUsername, visitorUsername, dayTag, objectId, actionId, rawKey = '') {
  const explicitKey = sanitizeText(rawKey, 160);
  if (explicitKey) return explicitKey;
  return [
    'care',
    sanitizeText(targetUsername, 60),
    sanitizeText(visitorUsername, 60),
    sanitizeText(dayTag, 20),
    sanitizeText(objectId, 80),
    sanitizeText(actionId, 60),
  ].join(':');
}

async function submitManorCareAction(payload = {}, actor = {}) {
  const visitorUsername = String(actor.username || '').trim();
  if (!visitorUsername) throw createError('请先登录');
  const { username: targetUsername, identity: targetIdentity } = resolveManorTarget(payload);
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  if (targetUsername === visitorUsername) throw createError('不能照料自己的庄园', 400);

  const actionId = sanitizeText(payload.action_id, 60);
  const actionDef = MANOR_CARE_ACTION_BY_ID[actionId];
  if (!actionDef) throw createError('未知的庄园照料动作', 400);
  const requestedObjectId = sanitizeText(payload.object_id, 80);
  if (requestedObjectId && requestedObjectId !== actionDef.object_id) {
    throw createError('照料动作与目标物件不匹配', 400);
  }

  const profile = await taoyuanSocialRuntime.getPublicProfile(targetUsername, targetUsername);
  const relationContext = buildManorRelationContext(targetUsername, visitorUsername);
  const accessPolicy = getManorAccessPolicy(targetUsername, profile);
  if (!canAccessByMode(accessPolicy.visit_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.visit_mode, '访问这座庄园'), 403);
  }
  if (!canAccessByMode(accessPolicy.care_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.care_mode, '照料这座庄园'), 403);
  }

  const dayTag = getLocalDayTag();
  const idempotencyKey = buildManorCareIdempotencyKey(targetUsername, visitorUsername, dayTag, actionDef.object_id, actionDef.id, payload.idempotency_key);
  const store = loadCareStore();
  const entries = store.entries.map(normalizeManorCareEntry);
  const existing = entries.find(entry => entry.idempotency_key === idempotencyKey);
  if (existing) {
    return {
      entry: existing,
      snapshot: await buildManorSnapshot(targetUsername, visitorUsername),
      idempotent: true,
    };
  }

  const todayEntries = entries.filter(entry => entry.target_username === targetUsername && entry.day_tag === dayTag);
  const visitorDailyCount = countCareEntries(todayEntries, entry => entry.visitor_username === visitorUsername);
  if (visitorDailyCount >= MANOR_CARE_DAILY_VISITOR_LIMIT) {
    throw createError('今天在这座庄园的照料次数已用完', 429);
  }
  if (todayEntries.length >= MANOR_CARE_DAILY_MANOR_LIMIT) {
    throw createError('这座庄园今天已经被照料得足够多了', 429);
  }

  const objectDef = MANOR_CARE_VISUAL_OBJECT_DEFS.find(definition => definition.id === actionDef.object_id);
  const objectDailyLimit = Math.max(1, objectDef?.progress_target || 1);
  const objectDailyCount = countCareEntries(todayEntries, entry => entry.object_id === actionDef.object_id);
  if (objectDailyCount >= objectDailyLimit) {
    throw createError('这个庄园物件今天已经照料完成', 409);
  }

  const saveContext = (() => {
    try {
      return getActiveSaveContext(targetUsername, targetIdentity?.save_slot ?? null, '该玩家当前没有可照料的庄园存档');
    } catch {
      return null;
    }
  })();
  const metrics = buildManorCareMetrics(saveContext?.data || {});
  if (Math.max(0, Number(metrics[actionDef.required_metric]) || 0) <= 0) {
    throw createError('当前物件没有可执行的照料事项', 409);
  }

  const objectLabel = objectDef?.label || actionDef.object_id;
  const entry = normalizeManorCareEntry({
    id: makeId('manor_care'),
    target_username: targetUsername,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
    visitor_username: visitorUsername,
    visitor_display_name: actor.displayName || visitorUsername,
    action_id: actionDef.id,
    action_label: actionDef.label,
    object_id: actionDef.object_id,
    object_label: objectLabel,
    day_tag: dayTag,
    idempotency_key: idempotencyKey,
    owner_benefit: actionDef.owner_benefit,
    visitor_reward: actionDef.visitor_reward,
    summary: `${actor.displayName || visitorUsername} 在${objectLabel}完成「${actionDef.label}」：${actionDef.owner_benefit}。`,
    created_at: nowSeconds(),
  });
  store.entries = [entry, ...entries].slice(0, 1000);
  saveCareStore(store);
  return {
    entry,
    snapshot: await buildManorSnapshot(targetUsername, visitorUsername),
    idempotent: false,
  };
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

async function listHotManorBoard(limit = 5) {
  const safeLimit = Math.max(1, Math.min(10, Math.floor(Number(limit) || 5)));
  const board = buildHotManorBoard().slice(0, safeLimit);
  const snapshots = await Promise.all(
    board.map(async entry => {
      try {
        const snapshot = await buildManorSnapshot(entry.manor_username, '');
        return {
          manor_username: entry.manor_username,
          display_name: snapshot.display_name,
          showcase_theme: snapshot.showcase_theme,
          favorite_count: entry.favorite_count,
          theme: entry.theme || snapshot.showcase_theme,
          visual_summary: snapshot.visual_summary,
          today_visit_summary: snapshot.today_visit_summary,
        };
      } catch {
        return null;
      }
    })
  );
  return snapshots.filter(Boolean);
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
  updateManorAccessPolicy,
  submitManorCareAction,
  favoriteManor,
  followManor,
  listFavoriteOverview,
  listHotManorBoard,
};
