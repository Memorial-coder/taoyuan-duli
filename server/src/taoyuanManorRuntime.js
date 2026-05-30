const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanImageModeration = require('./taoyuanImageModeration');
const { moderateText } = require('./taoyuanTextModeration');
const { createError, findSaveIdentityById, getActiveSaveContext, persistGameplayData, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');
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
    steals: [],
    care_rooms: [],
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
          steals: Array.isArray(raw.steals) ? raw.steals : [],
          care_rooms: Array.isArray(raw.care_rooms) ? raw.care_rooms : [],
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
    steals: Array.isArray(store?.steals) ? store.steals : [],
    care_rooms: Array.isArray(store?.care_rooms) ? store.care_rooms : [],
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
const MANOR_CARE_REWARD_MAX_STACK = 999;
const MANOR_STEAL_DAILY_VISITOR_LIMIT = 2;
const MANOR_STEAL_DAILY_MANOR_LIMIT = 6;
const MANOR_STEAL_OBJECT_DAILY_LIMIT = 1;
const MANOR_STEAL_REWARD_QUANTITY_CAP = 1;
const MANOR_STEAL_RECENT_LOG_LIMIT = 24;
const MANOR_ACTIVITY_RECENT_WINDOW_SECONDS = 10 * 60;
const MANOR_CARE_ROOM_MIN_MEMBERS = 2;
const MANOR_CARE_ROOM_MAX_MEMBERS = 4;
const MANOR_CARE_ROOM_WINDOW_SECONDS = 30 * 60;
const MANOR_CARE_ROOM_RECENT_LOG_LIMIT = 12;

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
    reward_item: { item_id: 'manor_edge_bundle', quantity: 1, quality: 'normal' },
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

const MANOR_CARE_ROOM_ACTION_DEFS = Object.freeze([
  {
    id: 'room_irrigate',
    label: '协作灌溉',
    role_id: 'irrigation',
    role_label: '灌溉手',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    object_label: '田地',
    expected_order: 1,
    health_delta: 12,
    risk_delta: 8,
    summary: '先稳住田区水分，为后续护理留出安全窗口。',
  },
  {
    id: 'room_feed',
    label: '协作喂食',
    role_id: 'feeding',
    role_label: '喂食手',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.animalShed,
    object_label: '畜棚',
    expected_order: 2,
    health_delta: 11,
    risk_delta: 7,
    summary: '补足动物饲喂，降低护理窗口内的躁动风险。',
  },
  {
    id: 'room_pest_control',
    label: '协作除虫',
    role_id: 'pest_control',
    role_label: '除虫手',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    object_label: '田地',
    expected_order: 3,
    health_delta: 10,
    risk_delta: 9,
    summary: '集中处理虫害，把田区风险压到可控范围。',
  },
  {
    id: 'room_tidy',
    label: '协作收拾',
    role_id: 'tidy',
    role_label: '收拾手',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove,
    object_label: '果树',
    expected_order: 4,
    health_delta: 9,
    risk_delta: 6,
    summary: '收拾掉落物与边角产物，完成护理收尾。',
  },
]);

const MANOR_CARE_ROOM_ACTION_BY_ID = Object.freeze(
  Object.fromEntries(MANOR_CARE_ROOM_ACTION_DEFS.map(action => [action.id, action]))
);

const MANOR_STEAL_ACTION_DEFS = Object.freeze([
  {
    id: 'steal_plot_sample',
    label: '摘一点普通作物',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
    target_metric: 'stealable_plot_count',
    owner_compensation: '主人获得友情点 +1 与次日产量保护记录',
    visitor_reward: '普通作物小样 +1',
  },
  {
    id: 'steal_fruit_sample',
    label: '顺手采一把普通果实',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove,
    target_metric: 'stealable_fruit_count',
    owner_compensation: '主人获得幸运种子线索与果树保护记录',
    visitor_reward: '普通果实小篮 +1',
  },
  {
    id: 'steal_edge_bundle',
    label: '捡一份边角产物',
    object_id: MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed,
    target_metric: 'stealable_edge_count',
    owner_compensation: '主人获得留言奖励与整洁保护记录',
    visitor_reward: '边角材料包 +1',
  },
]);

const MANOR_STEAL_ACTION_BY_ID = Object.freeze(
  Object.fromEntries(MANOR_STEAL_ACTION_DEFS.map(action => [action.id, action]))
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
    reward_item_id: sanitizeText(entry?.reward_item_id, 80),
    reward_quantity: Math.max(0, Math.floor(Number(entry?.reward_quantity) || 0)),
    reward_quality: sanitizeText(entry?.reward_quality, 20) || 'normal',
    reward_save_revision: Math.max(0, Math.floor(Number(entry?.reward_save_revision) || 0)),
    summary: sanitizeText(entry?.summary, 180),
    created_at: Number(entry?.created_at) || nowSeconds(),
  };
}

function normalizeManorStealEntry(entry) {
  const id = String(entry?.id || makeId('manor_steal'));
  const idempotencyKey = sanitizeText(entry?.idempotency_key, 160);
  const visitorRewardQuantity = Math.min(MANOR_STEAL_REWARD_QUANTITY_CAP, Math.max(0, Math.floor(Number(entry?.visitor_reward_quantity ?? entry?.quantity) || 0)));
  const ownerReservedRatio = clampNumber(entry?.owner_reserved_ratio ?? 1, 0, 1);
  const ownerReservedPercent = Math.round(ownerReservedRatio * 100);
  const visitorDailyLimit = Math.max(1, Math.floor(Number(entry?.visitor_daily_limit ?? entry?.reward_daily_cap) || MANOR_STEAL_DAILY_VISITOR_LIMIT));
  const visitorDailyCount = Math.max(0, Math.floor(Number(entry?.visitor_daily_count) || 0));
  const manorDailyLimit = Math.max(1, Math.floor(Number(entry?.manor_daily_limit) || MANOR_STEAL_DAILY_MANOR_LIMIT));
  const manorDailyCount = Math.max(0, Math.floor(Number(entry?.manor_daily_count) || 0));
  const objectDailyLimit = Math.max(1, Math.floor(Number(entry?.object_daily_limit) || MANOR_STEAL_OBJECT_DAILY_LIMIT));
  const objectDailyCount = Math.max(0, Math.floor(Number(entry?.object_daily_count) || 0));
  const recentWindowSeconds = Math.max(1, Math.floor(Number(entry?.recent_window_seconds) || MANOR_ACTIVITY_RECENT_WINDOW_SECONDS));
  const recentWindowCount = Math.max(0, Math.floor(Number(entry?.recent_window_count) || 0));
  const riskFlags = Array.isArray(entry?.risk_flags)
    ? entry.risk_flags.map(flag => sanitizeText(flag, 40)).filter(Boolean).slice(0, 8)
    : [];
  const antiAbuseSummary = sanitizeText(entry?.anti_abuse_summary, 180)
    || `反刷窗口 ${Math.max(1, Math.floor(recentWindowSeconds / 60))} 分钟内 ${recentWindowCount} 次；访客 ${visitorDailyCount}/${visitorDailyLimit}，庄园 ${manorDailyCount}/${manorDailyLimit}，物件 ${objectDailyCount}/${objectDailyLimit}。`;
  return {
    id,
    target_username: String(entry?.target_username || '').trim(),
    target_save_id: normalizeManorSaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeManorSaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
    visitor_username: String(entry?.visitor_username || '').trim(),
    visitor_display_name: sanitizeText(entry?.visitor_display_name, 30) || String(entry?.visitor_username || '匿名'),
    action_id: sanitizeText(entry?.action_id, 60),
    action_label: sanitizeText(entry?.action_label, 40),
    object_id: sanitizeText(entry?.object_id, 80),
    object_label: sanitizeText(entry?.object_label, 40),
    target_id: sanitizeText(entry?.target_id, 100),
    target_label: sanitizeText(entry?.target_label, 60),
    item_id: sanitizeText(entry?.item_id, 80),
    item_label: sanitizeText(entry?.item_label, 60),
    quantity: Math.max(0, Math.floor(Number(entry?.quantity) || 0)),
    use_tags: Array.isArray(entry?.use_tags)
      ? entry.use_tags.map(tag => sanitizeText(tag, 30)).filter(Boolean).slice(0, 8)
      : [],
    use_summary: sanitizeText(entry?.use_summary, 120),
    day_tag: sanitizeText(entry?.day_tag, 20),
    idempotency_key: idempotencyKey,
    owner_compensation: sanitizeText(entry?.owner_compensation, 140),
    visitor_reward: sanitizeText(entry?.visitor_reward, 80),
    visitor_reward_quantity: visitorRewardQuantity,
    visitor_reward_quantity_cap: MANOR_STEAL_REWARD_QUANTITY_CAP,
    reward_daily_cap: visitorDailyLimit,
    visitor_daily_count: visitorDailyCount,
    visitor_daily_limit: visitorDailyLimit,
    visitor_daily_remaining: Math.max(0, visitorDailyLimit - visitorDailyCount),
    manor_daily_count: manorDailyCount,
    manor_daily_limit: manorDailyLimit,
    manor_daily_remaining: Math.max(0, manorDailyLimit - manorDailyCount),
    object_daily_count: objectDailyCount,
    object_daily_limit: objectDailyLimit,
    object_daily_remaining: Math.max(0, objectDailyLimit - objectDailyCount),
    owner_reserved_ratio: ownerReservedRatio,
    owner_reserved_percent: ownerReservedPercent,
    recent_window_seconds: recentWindowSeconds,
    recent_window_count: recentWindowCount,
    risk_flags: riskFlags,
    anti_abuse_summary: antiAbuseSummary,
    settlement_receipt_id: sanitizeText(entry?.settlement_receipt_id, 120) || idempotencyKey || id,
    note: sanitizeText(entry?.note, 80),
    summary: sanitizeText(entry?.summary, 200),
    created_at: Number(entry?.created_at) || nowSeconds(),
  };
}

function normalizeManorCareRoomParticipant(entry) {
  const username = String(entry?.username || entry?.visitor_username || '').trim();
  return {
    username,
    display_name: sanitizeText(entry?.display_name || entry?.visitor_display_name, 30) || username || '匿名',
    role_id: sanitizeText(entry?.role_id, 40),
    role_label: sanitizeText(entry?.role_label, 40),
    joined_at: Number(entry?.joined_at) || nowSeconds(),
  };
}

function normalizeManorCareRoomAction(entry) {
  const actionId = sanitizeText(entry?.action_id, 60);
  const actionDef = MANOR_CARE_ROOM_ACTION_BY_ID[actionId] || {};
  const idempotencyKey = sanitizeText(entry?.idempotency_key, 160);
  return {
    id: String(entry?.id || makeId('manor_care_room_action')),
    action_id: actionId,
    action_label: sanitizeText(entry?.action_label, 40) || actionDef.label || actionId,
    role_id: sanitizeText(entry?.role_id, 40) || actionDef.role_id || '',
    role_label: sanitizeText(entry?.role_label, 40) || actionDef.role_label || '',
    object_id: sanitizeText(entry?.object_id, 80) || actionDef.object_id || '',
    object_label: sanitizeText(entry?.object_label, 40) || actionDef.object_label || '',
    actor_username: String(entry?.actor_username || '').trim(),
    actor_display_name: sanitizeText(entry?.actor_display_name, 30) || String(entry?.actor_username || '匿名'),
    expected_order: Math.max(1, Math.floor(Number(entry?.expected_order ?? actionDef.expected_order) || 1)),
    actual_order: Math.max(1, Math.floor(Number(entry?.actual_order) || 1)),
    order_risk: Boolean(entry?.order_risk),
    role_matched: Boolean(entry?.role_matched),
    risk_delta: Math.max(0, Math.floor(Number(entry?.risk_delta) || 0)),
    health_delta: Math.max(0, Math.floor(Number(entry?.health_delta) || 0)),
    idempotency_key: idempotencyKey,
    summary: sanitizeText(entry?.summary, 180),
    created_at: Number(entry?.created_at) || nowSeconds(),
  };
}

function normalizeManorCareRoom(entry) {
  const now = nowSeconds();
  const createdAt = Number(entry?.created_at) || now;
  const windowStartedAt = Number(entry?.window_started_at) || createdAt;
  const windowEndsAt = Number(entry?.window_ends_at) || (windowStartedAt + MANOR_CARE_ROOM_WINDOW_SECONDS);
  const rawStatus = sanitizeText(entry?.status, 30);
  const actions = Array.isArray(entry?.actions)
    ? entry.actions.map(normalizeManorCareRoomAction).sort((left, right) => left.created_at - right.created_at)
    : [];
  const participants = Array.isArray(entry?.participants)
    ? entry.participants.map(normalizeManorCareRoomParticipant).filter(item => item.username)
    : [];
  const settledAt = Number(entry?.settled_at) || 0;
  const status = rawStatus === 'completed'
    ? 'completed'
    : windowEndsAt > 0 && now > windowEndsAt
      ? 'expired'
      : rawStatus === 'in_progress' || actions.length > 0 || participants.length >= MANOR_CARE_ROOM_MIN_MEMBERS
        ? 'in_progress'
        : 'open';
  return {
    id: String(entry?.id || makeId('manor_care_room')),
    target_username: String(entry?.target_username || '').trim(),
    target_save_id: normalizeManorSaveId(entry?.target_save_id ?? entry?.targetSaveId),
    target_save_slot: normalizeManorSaveSlot(entry?.target_save_slot ?? entry?.targetSaveSlot),
    creator_username: String(entry?.creator_username || '').trim(),
    creator_display_name: sanitizeText(entry?.creator_display_name, 30) || String(entry?.creator_username || '匿名'),
    member_limit: Math.max(MANOR_CARE_ROOM_MIN_MEMBERS, Math.min(MANOR_CARE_ROOM_MAX_MEMBERS, Math.floor(Number(entry?.member_limit) || MANOR_CARE_ROOM_MAX_MEMBERS))),
    day_tag: sanitizeText(entry?.day_tag, 20),
    idempotency_key: sanitizeText(entry?.idempotency_key, 160),
    status,
    window_started_at: windowStartedAt,
    window_ends_at: windowEndsAt,
    participants,
    actions,
    risk_score: Math.max(0, Math.floor(Number(entry?.risk_score) || actions.reduce((sum, action) => sum + action.risk_delta, 0))),
    health_score: Math.max(0, Math.min(100, Math.floor(Number(entry?.health_score) || 0))),
    health_delta: Math.floor(Number(entry?.health_delta) || 0),
    settlement_receipt_id: sanitizeText(entry?.settlement_receipt_id, 120),
    settled_by: String(entry?.settled_by || '').trim(),
    settled_at: settledAt,
    summary: sanitizeText(entry?.summary, 220),
    created_at: createdAt,
    updated_at: Number(entry?.updated_at) || createdAt,
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

function getStealEntriesForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadCareStore();
  return store.steals
    .map(normalizeManorStealEntry)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => right.created_at - left.created_at);
}

function getCareRoomsForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadCareStore();
  return (store.care_rooms || [])
    .map(normalizeManorCareRoom)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => right.updated_at - left.updated_at);
}

function countCareEntries(entries, predicate) {
  return entries.reduce((sum, entry) => sum + (predicate(entry) ? 1 : 0), 0);
}

function buildManorCareRoomIdempotencyKey(targetUsername, actorUsername, dayTag, rawKey = '') {
  return [
    'manor_care_room',
    sanitizeText(targetUsername, 60),
    sanitizeText(actorUsername, 60),
    sanitizeText(dayTag, 20),
    sanitizeText(rawKey, 80) || 'create',
  ].join(':');
}

function buildManorCareRoomActionIdempotencyKey(roomId, actorUsername, actionId, dayTag, rawKey = '') {
  return [
    'manor_care_room_action',
    sanitizeText(roomId, 80),
    sanitizeText(actorUsername, 60),
    sanitizeText(actionId, 60),
    sanitizeText(dayTag, 20),
    sanitizeText(rawKey, 80) || 'default',
  ].join(':');
}

function getManorCareRoomRoleForIndex(index) {
  const definition = MANOR_CARE_ROOM_ACTION_DEFS[index % MANOR_CARE_ROOM_ACTION_DEFS.length] || MANOR_CARE_ROOM_ACTION_DEFS[0];
  return {
    role_id: definition.role_id,
    role_label: definition.role_label,
  };
}

function isManorCareRoomActive(room) {
  return room && !['completed', 'expired'].includes(room.status);
}

function serializeManorCareRoom(room, viewerUsername = '') {
  const normalized = normalizeManorCareRoom(room);
  const completedActionIds = new Set(normalized.actions.map(action => action.action_id));
  const viewerIsMember = normalized.participants.some(participant => participant.username === viewerUsername);
  const canAct = viewerIsMember
    && isManorCareRoomActive(normalized)
    && normalized.participants.length >= MANOR_CARE_ROOM_MIN_MEMBERS;
  const canSettle = viewerIsMember
    && normalized.status !== 'completed'
    && normalized.participants.length >= MANOR_CARE_ROOM_MIN_MEMBERS
    && (normalized.actions.length >= MANOR_CARE_ROOM_MIN_MEMBERS || normalized.status === 'expired');
  return {
    ...normalized,
    viewer_is_member: viewerIsMember,
    remaining_seconds: Math.max(0, normalized.window_ends_at - nowSeconds()),
    available_action_ids: canAct
      ? MANOR_CARE_ROOM_ACTION_DEFS
          .filter(action => !completedActionIds.has(action.id))
          .map(action => action.id)
      : [],
    can_join: Boolean(
      viewerUsername
      && isManorCareRoomActive(normalized)
      && normalized.participants.length < normalized.member_limit
      && !viewerIsMember
    ),
    can_act: canAct,
    can_settle: canSettle,
  };
}

function calculateManorCareRoomSettlement(room) {
  const normalized = normalizeManorCareRoom(room);
  const uniqueActionCount = new Set(normalized.actions.map(action => action.action_id)).size;
  const roleMatchCount = normalized.actions.filter(action => action.role_matched).length;
  const riskScore = normalized.actions.reduce((sum, action) => sum + action.risk_delta, 0);
  const healthScore = Math.max(0, Math.min(100, 50 + uniqueActionCount * 10 + normalized.participants.length * 4 + roleMatchCount * 3 - riskScore));
  const healthDelta = healthScore - 50;
  return {
    riskScore,
    healthScore,
    healthDelta,
    summary: `协作护理完成 ${uniqueActionCount}/4 项，参与 ${normalized.participants.length} 人，顺序风险 ${riskScore}，庄园健康度 ${healthScore}。`,
  };
}

function buildManorCareRoomState(username, viewerUsername, relationContext, accessPolicy, careRooms = []) {
  const activeRooms = careRooms
    .filter(room => room.status !== 'completed')
    .map(room => serializeManorCareRoom(room, viewerUsername))
    .slice(0, 6);
  const completedRooms = careRooms
    .filter(room => room.status === 'completed')
    .map(room => serializeManorCareRoom(room, viewerUsername))
    .slice(0, MANOR_CARE_ROOM_RECENT_LOG_LIMIT);
  const canCareByPolicy = relationContext.viewer_is_owner || canAccessByMode(accessPolicy.care_mode, relationContext);
  return {
    viewer_username: viewerUsername,
    day_tag: getLocalDayTag(),
    limits: {
      min_members: MANOR_CARE_ROOM_MIN_MEMBERS,
      max_members: MANOR_CARE_ROOM_MAX_MEMBERS,
      window_seconds: MANOR_CARE_ROOM_WINDOW_SECONDS,
    },
    action_labels: Object.fromEntries(MANOR_CARE_ROOM_ACTION_DEFS.map(action => [action.id, action.label])),
    role_labels: Object.fromEntries(MANOR_CARE_ROOM_ACTION_DEFS.map(action => [action.role_id, action.role_label])),
    action_effects: Object.fromEntries(MANOR_CARE_ROOM_ACTION_DEFS.map(action => [action.id, {
      role_id: action.role_id,
      role_label: action.role_label,
      object_id: action.object_id,
      object_label: action.object_label,
      expected_order: action.expected_order,
      health_delta: action.health_delta,
      risk_delta: action.risk_delta,
      summary: action.summary,
    }])),
    can_create_room: Boolean(viewerUsername && canCareByPolicy),
    create_denied_reason: canCareByPolicy
      ? ''
      : buildAccessDenyMessage(accessPolicy.care_mode, '建立庄园护理房间'),
    active_rooms: activeRooms,
    recent_records: completedRooms,
    record_summary: completedRooms.length > 0
      ? `最近 ${completedRooms.length} 条协作护理记录可回看。`
      : '暂无协作护理记录。',
  };
}

function buildDailyVisitorCountEntries(entries = [], visitorLimit = 1) {
  const counts = new Map();
  for (const entry of entries) {
    const username = String(entry?.visitor_username || '').trim();
    if (!username) continue;
    const current = counts.get(username) || {
      visitor_username: username,
      visitor_display_name: entry.visitor_display_name || username,
      count: 0,
    };
    current.count += 1;
    current.visitor_display_name = entry.visitor_display_name || current.visitor_display_name || username;
    counts.set(username, current);
  }
  return Array.from(counts.values())
    .map(item => ({
      visitor_username: item.visitor_username,
      visitor_display_name: sanitizeText(item.visitor_display_name, 30) || item.visitor_username,
      count: Math.max(0, Math.floor(Number(item.count) || 0)),
      limit: Math.max(1, Math.floor(Number(visitorLimit) || 1)),
      remaining: Math.max(0, Math.max(1, Math.floor(Number(visitorLimit) || 1)) - Math.max(0, Math.floor(Number(item.count) || 0))),
    }))
    .sort((left, right) => right.count - left.count || left.visitor_username.localeCompare(right.visitor_username));
}

function countRecentWindowEntries(entries = []) {
  const startsAt = nowSeconds() - MANOR_ACTIVITY_RECENT_WINDOW_SECONDS;
  return entries.filter(entry => Number(entry?.created_at || 0) >= startsAt).length;
}

function buildInteractionRiskFlags(entries = [], visitorCounts = [], visitorLimit = 1, manorLimit = 1, burstThreshold = 3) {
  const flags = [];
  if (visitorCounts.some(entry => entry.count >= visitorLimit)) flags.push('same_visitor_limit_reached');
  if (entries.length >= manorLimit) flags.push('manor_daily_limit_reached');
  const startsAt = nowSeconds() - MANOR_ACTIVITY_RECENT_WINDOW_SECONDS;
  const recentEntries = entries.filter(entry => Number(entry?.created_at || 0) >= startsAt);
  if (recentEntries.length >= burstThreshold) flags.push('short_window_cluster');
  return flags;
}

function buildManorVisitorActivityEntries(visitEntries = [], careEntries = [], stealEntries = [], careRoomRecords = []) {
  const visitRecords = visitEntries.map(entry => ({
    id: `visit:${entry.id}`,
    source_id: entry.id,
    kind: 'visit',
    kind_label: '来访',
    visitor_username: entry.visitor_username,
    visitor_display_name: entry.visitor_display_name,
    title: entry.summary || '前来参观庄园',
    summary: entry.feedback || entry.summary || '前来参观庄园',
    object_label: '',
    action_label: '',
    audit_note: entry.carried_items?.length > 0
      ? `携带记录 ${entry.carried_items.length} 项`
      : '普通来访记录',
    created_at: entry.created_at,
  }));
  const careRecords = careEntries.map(entry => ({
    id: `care:${entry.id}`,
    source_id: entry.id,
    kind: 'care',
    kind_label: '照料',
    visitor_username: entry.visitor_username,
    visitor_display_name: entry.visitor_display_name,
    title: `${entry.object_label || '庄园物件'} · ${entry.action_label || '照料'}`,
    summary: entry.summary || `${entry.object_label || '庄园物件'} 已被照料`,
    object_label: entry.object_label,
    action_label: entry.action_label,
    audit_note: `${entry.visitor_reward || '访客奖励'} · ${entry.idempotency_key ? '幂等凭证已记录' : '服务端照料记录'}`,
    created_at: entry.created_at,
  }));
  const stealRecords = stealEntries.map(entry => ({
    id: `steal:${entry.id}`,
    source_id: entry.id,
    kind: 'steal',
    kind_label: '轻采',
    visitor_username: entry.visitor_username,
    visitor_display_name: entry.visitor_display_name,
    title: `${entry.object_label || '庄园物件'} · ${entry.target_label || entry.action_label || '轻采'}`,
    summary: entry.summary || `${entry.object_label || '庄园物件'} 有轻采记录`,
    object_label: entry.object_label,
    action_label: entry.action_label,
    target_id: entry.target_id,
    target_label: entry.target_label,
    item_id: entry.item_id,
    item_label: entry.item_label,
    visitor_reward: entry.visitor_reward,
    visitor_reward_quantity: entry.visitor_reward_quantity || entry.quantity || 0,
    owner_compensation: entry.owner_compensation,
    use_tags: Array.isArray(entry.use_tags) ? entry.use_tags : [],
    use_summary: entry.use_summary || '',
    settlement_receipt_id: entry.settlement_receipt_id || entry.id,
    visitor_daily_progress: `${entry.visitor_daily_count || 0}/${entry.visitor_daily_limit || entry.reward_daily_cap || MANOR_STEAL_DAILY_VISITOR_LIMIT}`,
    manor_daily_progress: `${entry.manor_daily_count || 0}/${entry.manor_daily_limit || MANOR_STEAL_DAILY_MANOR_LIMIT}`,
    object_daily_progress: `${entry.object_daily_count || 0}/${entry.object_daily_limit || MANOR_STEAL_OBJECT_DAILY_LIMIT}`,
    visitor_daily_remaining: entry.visitor_daily_remaining ?? Math.max(0, (entry.visitor_daily_limit || entry.reward_daily_cap || MANOR_STEAL_DAILY_VISITOR_LIMIT) - (entry.visitor_daily_count || 0)),
    manor_daily_remaining: entry.manor_daily_remaining ?? Math.max(0, (entry.manor_daily_limit || MANOR_STEAL_DAILY_MANOR_LIMIT) - (entry.manor_daily_count || 0)),
    object_daily_remaining: entry.object_daily_remaining ?? Math.max(0, (entry.object_daily_limit || MANOR_STEAL_OBJECT_DAILY_LIMIT) - (entry.object_daily_count || 0)),
    owner_reserved_percent: entry.owner_reserved_percent ?? Math.round((entry.owner_reserved_ratio || 1) * 100),
    visitor_reward_quantity_cap: entry.visitor_reward_quantity_cap || MANOR_STEAL_REWARD_QUANTITY_CAP,
    recent_window_seconds: entry.recent_window_seconds || MANOR_ACTIVITY_RECENT_WINDOW_SECONDS,
    recent_window_count: entry.recent_window_count || 0,
    risk_flags: Array.isArray(entry.risk_flags) ? entry.risk_flags : [],
    anti_abuse_summary: entry.anti_abuse_summary || '',
    audit_note: `凭证 ${entry.settlement_receipt_id || entry.id} · 访客 ${entry.visitor_daily_count || 0}/${entry.visitor_daily_limit || entry.reward_daily_cap || MANOR_STEAL_DAILY_VISITOR_LIMIT} · 庄园 ${entry.manor_daily_count || 0}/${entry.manor_daily_limit || MANOR_STEAL_DAILY_MANOR_LIMIT} · 反刷 ${entry.recent_window_count || 0}/${entry.recent_window_seconds || MANOR_ACTIVITY_RECENT_WINDOW_SECONDS}s`,
    created_at: entry.created_at,
  }));
  const roomRecords = careRoomRecords.map(room => {
    const actions = Array.isArray(room.actions) ? room.actions : [];
    const participants = Array.isArray(room.participants) ? room.participants : [];
    const windowSeconds = Math.max(0, Math.floor((room.window_ends_at || 0) - (room.window_started_at || 0)));
    const orderRiskCount = actions.filter(action => action.order_risk).length;
    const roleMismatchCount = actions.filter(action => action.role_matched === false).length;
    return {
      id: `care_room:${room.id}`,
      source_id: room.id,
      kind: 'care_room',
      kind_label: '协作护理',
      visitor_username: room.settled_by || room.creator_username,
      visitor_display_name: participants.map(participant => participant.display_name).slice(0, 4).join('、') || room.creator_display_name,
      title: `协作护理 · ${room.health_score || 0}`,
      summary: room.summary || '协作护理已完成',
      object_label: '庄园整体',
      action_label: '协作护理',
      settlement_receipt_id: room.settlement_receipt_id || room.id,
      health_score: room.health_score || 0,
      health_delta: room.health_delta || 0,
      risk_score: room.risk_score || 0,
      order_risk_count: orderRiskCount,
      role_mismatch_count: roleMismatchCount,
      participant_count: participants.length,
      member_limit: room.member_limit || MANOR_CARE_ROOM_MAX_MEMBERS,
      participant_usernames: participants.map(participant => participant.username).filter(Boolean),
      participant_roles: participants.map(participant => ({
        username: participant.username,
        role_id: participant.role_id,
        role_label: participant.role_label,
      })),
      action_count: actions.length,
      action_progress: `${actions.length}/${MANOR_CARE_ROOM_ACTION_DEFS.length}`,
      completed_action_ids: actions.map(action => action.action_id).filter(Boolean),
      action_details: actions.map(action => ({
        action_id: action.action_id,
        action_label: action.action_label,
        actor_username: action.actor_username,
        expected_order: action.expected_order,
        actual_order: action.actual_order,
        order_risk: Boolean(action.order_risk),
        role_matched: Boolean(action.role_matched),
        risk_delta: action.risk_delta || 0,
        health_delta: action.health_delta || 0,
      })),
      window_started_at: room.window_started_at || 0,
      window_ends_at: room.window_ends_at || 0,
      window_seconds: windowSeconds,
      settled_by: room.settled_by || '',
      settled_at: room.settled_at || 0,
      audit_note: `凭证 ${room.settlement_receipt_id || room.id} · 健康度 ${room.health_score || 0} · 顺序风险 ${room.risk_score || 0}`,
      created_at: room.settled_at || room.updated_at || room.created_at,
    };
  });
  return [...visitRecords, ...careRecords, ...stealRecords, ...roomRecords]
    .sort((left, right) => right.created_at - left.created_at)
    .slice(0, 40);
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
  if (!Number.isInteger(Number(saveData.inventory.capacity))) saveData.inventory.capacity = 24;
}

function addCareRewardItemToInventory(saveData, itemId, quantity, quality = 'normal') {
  ensureInventoryState(saveData);
  const normalizedItemId = sanitizeText(itemId, 80);
  const normalizedQuality = sanitizeText(quality, 20) || 'normal';
  let remaining = Math.max(0, Math.floor(Number(quantity) || 0));
  if (!normalizedItemId || remaining <= 0) return { ok: true, added: 0 };
  let added = 0;
  for (const slot of saveData.inventory.items) {
    if (remaining <= 0) break;
    if (slot?.itemId === normalizedItemId && (slot.quality || 'normal') === normalizedQuality && Number(slot.quantity || 0) < MANOR_CARE_REWARD_MAX_STACK) {
      const canAdd = Math.min(remaining, MANOR_CARE_REWARD_MAX_STACK - Math.max(0, Math.floor(Number(slot.quantity) || 0)));
      slot.quantity = Math.max(0, Math.floor(Number(slot.quantity) || 0)) + canAdd;
      remaining -= canAdd;
      added += canAdd;
    }
  }
  const capacity = Math.max(1, Math.floor(Number(saveData.inventory.capacity) || 24));
  while (remaining > 0 && saveData.inventory.items.length < capacity) {
    const canAdd = Math.min(remaining, MANOR_CARE_REWARD_MAX_STACK);
    saveData.inventory.items.push({
      itemId: normalizedItemId,
      quantity: canAdd,
      quality: normalizedQuality,
      locked: false,
    });
    remaining -= canAdd;
    added += canAdd;
  }
  return {
    ok: remaining <= 0,
    added,
  };
}

function grantManorCareVisitorReward(visitorUsername, rewardItem) {
  const itemId = sanitizeText(rewardItem?.item_id || rewardItem?.itemId, 80);
  const quantity = Math.max(0, Math.floor(Number(rewardItem?.quantity) || 0));
  if (!itemId || quantity <= 0) return { item_id: '', quantity: 0, quality: 'normal', save_revision: 0 };
  const quality = sanitizeText(rewardItem?.quality, 20) || 'normal';
  const context = getActiveSaveContext(visitorUsername, null, '当前账号没有可用的桃源服务端存档，暂时无法领取庄园照料伴手礼');
  context.username = visitorUsername;
  const result = addCareRewardItemToInventory(context.data, itemId, quantity, quality);
  if (!result.ok) throw createError('个人背包空间不足，暂时无法领取庄园照料边角作物');
  const saveRevision = persistGameplayData(context);
  return {
    item_id: itemId,
    quantity,
    quality,
    save_revision: saveRevision,
  };
}

function isSafeStealableItemId(itemId) {
  const normalized = String(itemId || '').trim().toLowerCase();
  if (!normalized) return false;
  if (/(rare|legend|unique|quest|task|event|festival|bound|epic|myth|artifact|极品|任务|唯一|绑定|活动|稀有)/i.test(normalized)) {
    return false;
  }
  return true;
}

function buildStealTargetLabel(itemId, fallback = '普通产物') {
  return sanitizeText(itemId, 40) || fallback;
}

function buildManorStealUseProfile(itemId, fallbackKind = 'crop') {
  const normalized = String(itemId || '').trim().toLowerCase();
  if (normalized === 'manor_edge_bundle') {
    return {
      use_tags: ['order', 'pet_feed', 'festival'],
      use_summary: '边角作物可留作公共订单、宠物点心或节会备料。',
    };
  }
  if (/(peach|plum|apricot|pear|apple|fruit|tree)/i.test(normalized) || fallbackKind === 'fruit') {
    return {
      use_tags: ['food', 'gift', 'festival'],
      use_summary: '普通果实适合料理、赠礼或节会轻食。',
    };
  }
  if (normalized === 'rice') {
    return {
      use_tags: ['food', 'order', 'festival', 'pet_feed'],
      use_summary: '稻米适合料理、公共订单、节会备料和宠物温饱饲料。',
    };
  }
  if (/(herb|lotus|tea|ginseng|mint|medic|药|莲|茶)/i.test(normalized)) {
    return {
      use_tags: ['alchemy', 'medicine', 'gift'],
      use_summary: '草本作物适合炼丹、药材准备或偏好赠礼。',
    };
  }
  return {
    use_tags: fallbackKind === 'fruit' ? ['food', 'gift'] : ['food', 'order'],
    use_summary: fallbackKind === 'fruit'
      ? '普通果实适合料理或赠礼。'
      : '普通作物适合料理或公共订单。',
  };
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
  const stealablePlots = croppedPlots
    .filter(plot => String(plot?.state || '') === 'harvestable')
    .filter(plot => isSafeStealableItemId(plot?.cropId))
    .filter(plot => plot?.questItem !== true && plot?.bound !== true && plot?.unique !== true && plot?.quality !== 'legendary');
  const stealableFruitTrees = fruitTrees
    .filter(tree => tree?.mature === true && tree?.todayFruit === true)
    .filter(tree => isSafeStealableItemId(tree?.type || tree?.fruitId || tree?.itemId || 'fruit'));
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
    stealable_plot_count: stealablePlots.length,
    stealable_fruit_count: stealableFruitTrees.length,
    stealable_edge_count: placedDecorationCount > 0 || croppedPlots.length > 0 ? 1 : 0,
    steal_targets: {
      plot: stealablePlots.slice(0, 8).map(plot => ({
        id: `plot:${sanitizeText(String(plot.id ?? plot.plotId ?? plot.cropId), 60)}`,
        label: buildStealTargetLabel(plot.cropId, '普通作物'),
        item_id: sanitizeText(plot.cropId, 80),
        object_id: MANOR_CARE_VISUAL_OBJECT_IDS.field,
        ...buildManorStealUseProfile(plot.cropId, 'crop'),
      })),
      fruit: stealableFruitTrees.slice(0, 8).map(tree => {
        const itemId = tree.fruitId || tree.itemId || tree.type || 'fruit';
        return {
          id: `fruit:${sanitizeText(String(tree.id ?? itemId), 60)}`,
          label: buildStealTargetLabel(itemId, '普通果实'),
          item_id: sanitizeText(itemId, 80),
          object_id: MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove,
          ...buildManorStealUseProfile(itemId, 'fruit'),
        };
      }),
      edge: [
        {
          id: 'edge:manor_bundle',
          label: '庄园边角产物',
          item_id: 'manor_edge_bundle',
          object_id: MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed,
          ...buildManorStealUseProfile('manor_edge_bundle', 'edge'),
        },
      ],
    },
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

function buildManorStealActionIds(objectId, metrics, context) {
  if (!context.canSteal || context.remainingStealCount <= 0 || context.manorRemainingStealCount <= 0) return [];
  if ((context.stealObjectCounts.get(objectId) || 0) >= 1) return [];
  return MANOR_STEAL_ACTION_DEFS
    .filter(action => action.object_id === objectId)
    .filter(action => Math.max(0, Number(metrics[action.target_metric]) || 0) > 0)
    .map(action => action.id);
}

function buildManorCareVisualObjects(gameplay, careEntries, stealEntries, context) {
  const metrics = buildManorCareMetrics(gameplay);
  return MANOR_CARE_VISUAL_OBJECT_DEFS.map(definition => {
    const progressTarget = Math.max(0, Math.floor(Number(definition.progress_target) || 0));
    const progressValue = Math.min(progressTarget, context.objectCounts.get(definition.id) || 0);
    const recentCareEntry = careEntries.find(entry => entry.object_id === definition.id);
    const recentStealEntry = stealEntries.find(entry => entry.object_id === definition.id);
    const stealActionIds = buildManorStealActionIds(definition.id, metrics, context);
    const careActionIds = buildManorCareActionIds(definition.id, metrics, context);
    const baseState = getManorCareObjectState(definition, metrics, progressValue, progressTarget);
    return normalizeOnlineVisualObject({
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      x: definition.x,
      y: definition.y,
      state: stealActionIds.length > 0 && baseState === 'idle' ? 'needs_action' : baseState,
      available_action_ids: [...careActionIds, ...stealActionIds],
      progress_value: progressValue,
      progress_target: progressTarget,
      handled_by: recentCareEntry?.visitor_username || recentStealEntry?.visitor_username || '',
      handled_at: recentCareEntry?.created_at || recentStealEntry?.created_at || 0,
      requires_cooperation: false,
      cooperation_required_count: 0,
      cooperation_current_count: 0,
    });
  });
}

function buildManorCareSnapshot(username, viewerUsername, gameplay, relationContext, accessPolicy, careEntries, stealEntries) {
  const dayTag = getLocalDayTag();
  const todayEntries = careEntries.filter(entry => entry.day_tag === dayTag);
  const viewerEntries = todayEntries.filter(entry => entry.visitor_username === viewerUsername);
  const todayStealEntries = stealEntries.filter(entry => entry.day_tag === dayTag);
  const viewerStealEntries = todayStealEntries.filter(entry => entry.visitor_username === viewerUsername);
  const careVisitorCounts = buildDailyVisitorCountEntries(todayEntries, MANOR_CARE_DAILY_VISITOR_LIMIT);
  const stealVisitorCounts = buildDailyVisitorCountEntries(todayStealEntries, MANOR_STEAL_DAILY_VISITOR_LIMIT);
  const careRiskFlags = buildInteractionRiskFlags(
    todayEntries,
    careVisitorCounts,
    MANOR_CARE_DAILY_VISITOR_LIMIT,
    MANOR_CARE_DAILY_MANOR_LIMIT,
    3
  );
  const stealRiskFlags = buildInteractionRiskFlags(
    todayStealEntries,
    stealVisitorCounts,
    MANOR_STEAL_DAILY_VISITOR_LIMIT,
    MANOR_STEAL_DAILY_MANOR_LIMIT,
    2
  );
  const objectCounts = new Map();
  for (const entry of todayEntries) {
    objectCounts.set(entry.object_id, (objectCounts.get(entry.object_id) || 0) + 1);
  }
  const stealObjectCounts = new Map();
  for (const entry of todayStealEntries) {
    stealObjectCounts.set(entry.object_id, (stealObjectCounts.get(entry.object_id) || 0) + 1);
  }
  const objectLimitById = new Map(MANOR_CARE_VISUAL_OBJECT_DEFS.map(definition => [definition.id, Math.max(1, definition.progress_target || 1)]));
  const canCareByPolicy = canAccessByMode(accessPolicy.care_mode, relationContext);
  const canStealByPolicy = canAccessByMode(accessPolicy.steal_mode, relationContext);
  const remainingCareCount = Math.max(0, MANOR_CARE_DAILY_VISITOR_LIMIT - viewerEntries.length);
  const manorRemainingCareCount = Math.max(0, MANOR_CARE_DAILY_MANOR_LIMIT - todayEntries.length);
  const remainingStealCount = Math.max(0, MANOR_STEAL_DAILY_VISITOR_LIMIT - viewerStealEntries.length);
  const manorRemainingStealCount = Math.max(0, MANOR_STEAL_DAILY_MANOR_LIMIT - todayStealEntries.length);
  const canCare = Boolean(
    viewerUsername
    && !relationContext.viewer_is_owner
    && canCareByPolicy
    && remainingCareCount > 0
    && manorRemainingCareCount > 0
  );
  const canSteal = Boolean(
    viewerUsername
    && !relationContext.viewer_is_owner
    && canStealByPolicy
    && remainingStealCount > 0
    && manorRemainingStealCount > 0
  );
  const context = {
    canCare,
    remainingCareCount,
    canSteal,
    remainingStealCount,
    manorRemainingStealCount,
    objectCounts,
    stealObjectCounts,
    objectLimitById,
  };
  const objects = buildManorCareVisualObjects(gameplay, careEntries, stealEntries, context);
  const metrics = buildManorCareMetrics(gameplay);
  const stealTargetUseHints = Object.fromEntries(
    Object.values(metrics.steal_targets || {})
      .flat()
      .map(target => [target.id, {
        item_id: target.item_id,
        label: target.label,
        use_tags: Array.isArray(target.use_tags) ? target.use_tags : [],
        use_summary: target.use_summary || '',
      }])
  );
  const recentEntry = [careEntries[0], stealEntries[0]]
    .filter(Boolean)
    .sort((left, right) => right.created_at - left.created_at)[0] || null;
  const recentFeedback = recentEntry
    ? recentEntry.summary
    : canCare || canSteal
      ? '好友可以处理今日庄园互动。'
      : buildAccessDenyMessage(accessPolicy.care_mode, '照料这座庄园');
  const stealDeniedReason = canSteal
    ? ''
    : remainingStealCount <= 0
      ? '今天在这座庄园的偷菜次数已用完'
      : manorRemainingStealCount <= 0
        ? '这座庄园今天已经被轻采得足够多了'
        : buildAccessDenyMessage(accessPolicy.steal_mode, '偷菜');
  return {
    visual_state: normalizeManorCareVisualState({
      board_id: `manor:${username}:care`,
      revision: careEntries.length + stealEntries.length,
      selected_visual_id: objects.find(object => object.available_action_ids.length > 0)?.id || objects[0]?.id || '',
      objects,
      recent_feedback: recentFeedback,
    }, username),
    care_state: {
      day_tag: dayTag,
      action_labels: Object.fromEntries(MANOR_CARE_ACTION_DEFS.map(action => [action.id, action.label])),
      scene_action_labels: Object.fromEntries([...MANOR_CARE_ACTION_DEFS, ...MANOR_STEAL_ACTION_DEFS].map(action => [action.id, action.label])),
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
      audit: {
        visitor_limit_enforced: true,
        manor_limit_enforced: true,
        object_limit_enforced: true,
        reward_cap_summary: `每位访客每日 ${MANOR_CARE_DAILY_VISITOR_LIMIT} 次，每座庄园每日 ${MANOR_CARE_DAILY_MANOR_LIMIT} 次；同一物件按场景进度封顶。`,
        settlement_summary: '照料动作由服务端记录幂等凭证；收拾掉落物的伴手礼写入访客存档并回写存档 revision。',
        recent_window_seconds: MANOR_ACTIVITY_RECENT_WINDOW_SECONDS,
        recent_window_count: countRecentWindowEntries(todayEntries),
        daily_visitor_counts: careVisitorCounts,
        risk_flags: careRiskFlags,
        dispute_log_available: true,
      },
      care_denied_reason: canCare
        ? ''
        : remainingCareCount <= 0
          ? '今天在这座庄园的照料次数已用完'
          : manorRemainingCareCount <= 0
            ? '这座庄园今天已经被照料得足够多了'
            : buildAccessDenyMessage(accessPolicy.care_mode, '照料这座庄园'),
    },
    steal_state: {
      day_tag: dayTag,
      action_labels: Object.fromEntries(MANOR_STEAL_ACTION_DEFS.map(action => [action.id, action.label])),
      action_effects: Object.fromEntries(MANOR_STEAL_ACTION_DEFS.map(action => [action.id, {
        owner_compensation: action.owner_compensation,
        visitor_reward: action.visitor_reward,
      }])),
      limits: {
        visitor_daily_limit: MANOR_STEAL_DAILY_VISITOR_LIMIT,
        manor_daily_limit: MANOR_STEAL_DAILY_MANOR_LIMIT,
        object_daily_limit: MANOR_STEAL_OBJECT_DAILY_LIMIT,
      },
      visitor_daily_count: viewerStealEntries.length,
      manor_daily_count: todayStealEntries.length,
      remaining_steal_count: remainingStealCount,
      manor_remaining_steal_count: manorRemainingStealCount,
      can_steal: canSteal,
      steal_denied_reason: stealDeniedReason,
      audit: {
        visitor_limit_enforced: true,
        manor_limit_enforced: true,
        object_limit_enforced: true,
        whitelist_enforced: true,
        reward_cap_summary: `每位访客每日 ${MANOR_STEAL_DAILY_VISITOR_LIMIT} 次，每座庄园每日 ${MANOR_STEAL_DAILY_MANOR_LIMIT} 次，每个物件每日 ${MANOR_STEAL_OBJECT_DAILY_LIMIT} 次；单次只生成 ${MANOR_STEAL_REWARD_QUANTITY_CAP} 份轻采凭证。`,
        settlement_summary: '偷菜不扣主人库存，只记录服务端轻采凭证、用途标签、主人补偿和留言，争议可按最近访客行为回看。',
        owner_reserved_percent: 100,
        visitor_reward_quantity_cap: MANOR_STEAL_REWARD_QUANTITY_CAP,
        recent_window_seconds: MANOR_ACTIVITY_RECENT_WINDOW_SECONDS,
        recent_window_count: countRecentWindowEntries(todayStealEntries),
        daily_visitor_counts: stealVisitorCounts,
        risk_flags: stealRiskFlags,
        dispute_log_available: true,
      },
      whitelist_summary: '仅普通成熟作物、普通果实和边角产物可轻采；任务物、稀有物、唯一物、绑定物和活动核心物被排除；可偷目标会显示料理、订单、节会、宠物或赠礼用途标签。',
      target_use_hints: stealTargetUseHints,
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
  const stealEntries = getStealEntriesForTarget(user.username);
  const careRooms = getCareRoomsForTarget(user.username);
  const careRoomRecords = careRooms.filter(room => room.status === 'completed');
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
  const careSnapshot = buildManorCareSnapshot(user.username, viewer, gameplay, relationContext, accessPolicy, careEntries, stealEntries);
  const careRoomState = buildManorCareRoomState(user.username, viewer, relationContext, accessPolicy, careRooms);

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
    visitor_activity_entries: buildManorVisitorActivityEntries(visitEntries, careEntries, stealEntries, careRoomRecords),
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
      can_steal: careSnapshot.steal_state.can_steal,
    },
    visual_state: careSnapshot.visual_state,
    care_state: careSnapshot.care_state,
    care_entries: careEntries.slice(0, MANOR_CARE_RECENT_LOG_LIMIT),
    steal_state: careSnapshot.steal_state,
    steal_entries: stealEntries.slice(0, MANOR_STEAL_RECENT_LOG_LIMIT),
    care_room_state: careRoomState,
    care_room_records: careRoomRecords.map(room => serializeManorCareRoom(room, viewer)).slice(0, MANOR_CARE_ROOM_RECENT_LOG_LIMIT),
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

function buildManorStealIdempotencyKey(targetUsername, visitorUsername, dayTag, targetId, rawKey = '') {
  const explicitKey = sanitizeText(rawKey, 160);
  if (explicitKey) return explicitKey;
  return [
    'steal',
    sanitizeText(targetUsername, 60),
    sanitizeText(visitorUsername, 60),
    sanitizeText(dayTag, 20),
    sanitizeText(targetId, 100),
  ].join(':');
}

function pickManorStealTarget(metrics, actionDef, requestedTargetId = '') {
  const bucket = actionDef.id === 'steal_plot_sample'
    ? metrics.steal_targets?.plot
    : actionDef.id === 'steal_fruit_sample'
      ? metrics.steal_targets?.fruit
      : metrics.steal_targets?.edge;
  const targets = Array.isArray(bucket) ? bucket : [];
  if (targets.length === 0) return null;
  const normalizedTargetId = sanitizeText(requestedTargetId, 100);
  if (normalizedTargetId) return targets.find(target => target.id === normalizedTargetId) || null;
  return targets[0];
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
  const visitorRewardResult = grantManorCareVisitorReward(visitorUsername, actionDef.reward_item);
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
    reward_item_id: visitorRewardResult.item_id,
    reward_quantity: visitorRewardResult.quantity,
    reward_quality: visitorRewardResult.quality,
    reward_save_revision: visitorRewardResult.save_revision,
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

async function submitManorStealAction(payload = {}, actor = {}) {
  const visitorUsername = String(actor.username || '').trim();
  if (!visitorUsername) throw createError('请先登录');
  const { username: targetUsername, identity: targetIdentity } = resolveManorTarget(payload);
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  if (targetUsername === visitorUsername) throw createError('不能偷自己的庄园', 400);

  const actionId = sanitizeText(payload.action_id, 60);
  const actionDef = MANOR_STEAL_ACTION_BY_ID[actionId];
  if (!actionDef) throw createError('未知的庄园偷菜动作', 400);
  const requestedObjectId = sanitizeText(payload.object_id, 80);
  if (requestedObjectId && requestedObjectId !== actionDef.object_id) {
    throw createError('偷菜动作与目标物件不匹配', 400);
  }

  const profile = await taoyuanSocialRuntime.getPublicProfile(targetUsername, targetUsername);
  const relationContext = buildManorRelationContext(targetUsername, visitorUsername);
  const accessPolicy = getManorAccessPolicy(targetUsername, profile);
  if (!canAccessByMode(accessPolicy.visit_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.visit_mode, '访问这座庄园'), 403);
  }
  if (!canAccessByMode(accessPolicy.steal_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.steal_mode, '偷菜'), 403);
  }

  const saveContext = (() => {
    try {
      return getActiveSaveContext(targetUsername, targetIdentity?.save_slot ?? null, '该玩家当前没有可偷菜的庄园存档');
    } catch {
      return null;
    }
  })();
  const metrics = buildManorCareMetrics(saveContext?.data || {});
  if (Math.max(0, Number(metrics[actionDef.target_metric]) || 0) <= 0) {
    throw createError('当前没有可轻采的安全目标', 409);
  }
  const stealTarget = pickManorStealTarget(metrics, actionDef, payload.target_id);
  if (!stealTarget || !isSafeStealableItemId(stealTarget.item_id)) {
    throw createError('目标不在可偷白名单内', 409);
  }
  const stealUseProfile = buildManorStealUseProfile(
    stealTarget.item_id,
    actionDef.object_id === MANOR_CARE_VISUAL_OBJECT_IDS.fruitGrove
      ? 'fruit'
      : actionDef.object_id === MANOR_CARE_VISUAL_OBJECT_IDS.flowerBed
        ? 'edge'
        : 'crop'
  );

  const dayTag = getLocalDayTag();
  const idempotencyKey = buildManorStealIdempotencyKey(targetUsername, visitorUsername, dayTag, stealTarget.id, payload.idempotency_key);
  const store = loadCareStore();
  const steals = (store.steals || []).map(normalizeManorStealEntry);
  const existing = steals.find(entry => entry.idempotency_key === idempotencyKey);
  if (existing) {
    return {
      entry: existing,
      snapshot: await buildManorSnapshot(targetUsername, visitorUsername),
      idempotent: true,
    };
  }

  const todaySteals = steals.filter(entry => entry.target_username === targetUsername && entry.day_tag === dayTag);
  const visitorDailyCount = countCareEntries(todaySteals, entry => entry.visitor_username === visitorUsername);
  if (visitorDailyCount >= MANOR_STEAL_DAILY_VISITOR_LIMIT) {
    throw createError('今天在这座庄园的偷菜次数已用完', 429);
  }
  if (todaySteals.length >= MANOR_STEAL_DAILY_MANOR_LIMIT) {
    throw createError('这座庄园今天已经被轻采得足够多了', 429);
  }
  const objectDailyCount = countCareEntries(todaySteals, entry => entry.object_id === actionDef.object_id);
  if (objectDailyCount >= MANOR_STEAL_OBJECT_DAILY_LIMIT) {
    throw createError('这个庄园物件今天已经被轻采过了', 409);
  }

  const note = payload.note
    ? moderateText(payload.note, {
        label: '偷菜留言',
        field: 'note',
        scene: 'manor_steal',
        maxLength: 80,
        storageMaxLength: 80,
        maxLineBreaks: 1,
      })
    : '';
  const objectDef = MANOR_CARE_VISUAL_OBJECT_DEFS.find(definition => definition.id === actionDef.object_id);
  const objectLabel = objectDef?.label || actionDef.object_id;
  const createdAt = nowSeconds();
  const projectedSteals = [
    {
      visitor_username: visitorUsername,
      visitor_display_name: actor.displayName || visitorUsername,
      created_at: createdAt,
    },
    ...todaySteals,
  ];
  const projectedVisitorCounts = buildDailyVisitorCountEntries(projectedSteals, MANOR_STEAL_DAILY_VISITOR_LIMIT);
  const projectedRiskFlags = new Set(buildInteractionRiskFlags(projectedSteals, projectedVisitorCounts, MANOR_STEAL_DAILY_VISITOR_LIMIT, MANOR_STEAL_DAILY_MANOR_LIMIT, 2));
  if (objectDailyCount + 1 >= MANOR_STEAL_OBJECT_DAILY_LIMIT) projectedRiskFlags.add('object_daily_limit_reached');
  const entry = normalizeManorStealEntry({
    id: makeId('manor_steal'),
    target_username: targetUsername,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
    visitor_username: visitorUsername,
    visitor_display_name: actor.displayName || visitorUsername,
    action_id: actionDef.id,
    action_label: actionDef.label,
    object_id: actionDef.object_id,
    object_label: objectLabel,
    target_id: stealTarget.id,
    target_label: stealTarget.label,
    item_id: stealTarget.item_id,
    item_label: stealTarget.label,
    quantity: 1,
    use_tags: stealUseProfile.use_tags,
    use_summary: stealUseProfile.use_summary,
    day_tag: dayTag,
    idempotency_key: idempotencyKey,
    owner_compensation: actionDef.owner_compensation,
    visitor_reward: actionDef.visitor_reward,
    visitor_reward_quantity: MANOR_STEAL_REWARD_QUANTITY_CAP,
    visitor_reward_quantity_cap: MANOR_STEAL_REWARD_QUANTITY_CAP,
    reward_daily_cap: MANOR_STEAL_DAILY_VISITOR_LIMIT,
    visitor_daily_count: visitorDailyCount + 1,
    visitor_daily_limit: MANOR_STEAL_DAILY_VISITOR_LIMIT,
    visitor_daily_remaining: Math.max(0, MANOR_STEAL_DAILY_VISITOR_LIMIT - visitorDailyCount - 1),
    manor_daily_count: todaySteals.length + 1,
    manor_daily_limit: MANOR_STEAL_DAILY_MANOR_LIMIT,
    manor_daily_remaining: Math.max(0, MANOR_STEAL_DAILY_MANOR_LIMIT - todaySteals.length - 1),
    object_daily_count: objectDailyCount + 1,
    object_daily_limit: MANOR_STEAL_OBJECT_DAILY_LIMIT,
    object_daily_remaining: Math.max(0, MANOR_STEAL_OBJECT_DAILY_LIMIT - objectDailyCount - 1),
    owner_reserved_ratio: 1,
    owner_reserved_percent: 100,
    recent_window_seconds: MANOR_ACTIVITY_RECENT_WINDOW_SECONDS,
    recent_window_count: countRecentWindowEntries(projectedSteals),
    risk_flags: Array.from(projectedRiskFlags),
    anti_abuse_summary: `反刷窗口 ${Math.floor(MANOR_ACTIVITY_RECENT_WINDOW_SECONDS / 60)} 分钟内 ${countRecentWindowEntries(projectedSteals)} 次；访客 ${visitorDailyCount + 1}/${MANOR_STEAL_DAILY_VISITOR_LIMIT}，庄园 ${todaySteals.length + 1}/${MANOR_STEAL_DAILY_MANOR_LIMIT}，物件 ${objectDailyCount + 1}/${MANOR_STEAL_OBJECT_DAILY_LIMIT}。`,
    settlement_receipt_id: idempotencyKey,
    note,
    summary: `${actor.displayName || visitorUsername} 在${objectLabel}轻采「${stealTarget.label}」：${actionDef.owner_compensation}，主人库存不扣减。`,
    created_at: createdAt,
  });
  store.steals = [entry, ...steals].slice(0, 1000);
  saveCareStore(store);
  return {
    entry,
    snapshot: await buildManorSnapshot(targetUsername, visitorUsername),
    idempotent: false,
  };
}

async function resolveManorCareRoomTarget(payload = {}, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录');
  const { username: targetUsername, identity: targetIdentity } = resolveManorTarget(payload);
  const targetUser = await db.getUser(targetUsername);
  if (!targetUser) throw createError('目标庄园不存在', 404);
  const profile = await taoyuanSocialRuntime.getPublicProfile(targetUsername, targetUsername);
  const relationContext = buildManorRelationContext(targetUsername, actorUsername);
  const accessPolicy = getManorAccessPolicy(targetUsername, profile);
  if (!relationContext.viewer_is_owner && !canAccessByMode(accessPolicy.visit_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.visit_mode, '访问这座庄园'), 403);
  }
  if (!relationContext.viewer_is_owner && !canAccessByMode(accessPolicy.care_mode, relationContext)) {
    throw createError(buildAccessDenyMessage(accessPolicy.care_mode, '建立庄园护理房间'), 403);
  }
  return {
    targetUsername,
    targetIdentity,
    relationContext,
    accessPolicy,
  };
}

async function createManorCareRoom(payload = {}, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录');
  const { targetUsername, targetIdentity } = await resolveManorCareRoomTarget(payload, actor);
  const dayTag = getLocalDayTag();
  const idempotencyKey = buildManorCareRoomIdempotencyKey(targetUsername, actorUsername, dayTag, payload.idempotency_key);
  const store = loadCareStore();
  const rooms = (store.care_rooms || []).map(normalizeManorCareRoom);
  const existing = rooms.find(room => room.idempotency_key === idempotencyKey);
  if (existing) {
    return {
      room: serializeManorCareRoom(existing, actorUsername),
      snapshot: await buildManorSnapshot(targetUsername, actorUsername),
      idempotent: true,
    };
  }
  const activeOwnRoom = rooms.find(room =>
    room.target_username === targetUsername
    && room.creator_username === actorUsername
    && isManorCareRoomActive(room)
  );
  if (activeOwnRoom) {
    return {
      room: serializeManorCareRoom(activeOwnRoom, actorUsername),
      snapshot: await buildManorSnapshot(targetUsername, actorUsername),
      idempotent: true,
    };
  }
  const memberLimit = Math.max(
    MANOR_CARE_ROOM_MIN_MEMBERS,
    Math.min(MANOR_CARE_ROOM_MAX_MEMBERS, Math.floor(Number(payload.member_limit) || MANOR_CARE_ROOM_MAX_MEMBERS))
  );
  const role = getManorCareRoomRoleForIndex(0);
  const createdAt = nowSeconds();
  const room = normalizeManorCareRoom({
    id: makeId('manor_care_room'),
    target_username: targetUsername,
    target_save_id: targetIdentity?.save_id || 0,
    target_save_slot: targetIdentity?.save_slot ?? null,
    creator_username: actorUsername,
    creator_display_name: actor.displayName || actorUsername,
    member_limit: memberLimit,
    day_tag: dayTag,
    idempotency_key: idempotencyKey,
    status: 'open',
    window_started_at: createdAt,
    window_ends_at: createdAt + MANOR_CARE_ROOM_WINDOW_SECONDS,
    participants: [{
      username: actorUsername,
      display_name: actor.displayName || actorUsername,
      ...role,
      joined_at: createdAt,
    }],
    actions: [],
    summary: '护理房间已建立，等待好友加入分工。',
    created_at: createdAt,
    updated_at: createdAt,
  });
  store.care_rooms = [room, ...rooms].slice(0, 500);
  saveCareStore(store);
  return {
    room: serializeManorCareRoom(room, actorUsername),
    snapshot: await buildManorSnapshot(targetUsername, actorUsername),
    idempotent: false,
  };
}

async function joinManorCareRoom(roomId, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录');
  const normalizedRoomId = sanitizeText(roomId, 100);
  const store = loadCareStore();
  const rooms = (store.care_rooms || []).map(normalizeManorCareRoom);
  const room = rooms.find(entry => entry.id === normalizedRoomId);
  if (!room) throw createError('护理房间不存在', 404);
  await resolveManorCareRoomTarget({ target_username: room.target_username }, actor);
  if (!isManorCareRoomActive(room)) throw createError('护理房间已经结束', 409);
  const existingParticipant = room.participants.find(participant => participant.username === actorUsername);
  if (existingParticipant) {
    return {
      room: serializeManorCareRoom(room, actorUsername),
      snapshot: await buildManorSnapshot(room.target_username, actorUsername),
      idempotent: true,
    };
  }
  if (room.participants.length >= room.member_limit) throw createError('护理房间人数已满', 409);
  const role = getManorCareRoomRoleForIndex(room.participants.length);
  const now = nowSeconds();
  const nextRoom = normalizeManorCareRoom({
    ...room,
    status: room.participants.length + 1 >= MANOR_CARE_ROOM_MIN_MEMBERS ? 'in_progress' : room.status,
    participants: [
      ...room.participants,
      {
        username: actorUsername,
        display_name: actor.displayName || actorUsername,
        ...role,
        joined_at: now,
      },
    ],
    summary: room.participants.length + 1 >= MANOR_CARE_ROOM_MIN_MEMBERS
      ? '护理房间人数已就绪，可以开始协作护理。'
      : room.summary,
    updated_at: now,
  });
  store.care_rooms = [nextRoom, ...rooms.filter(entry => entry.id !== room.id)].slice(0, 500);
  saveCareStore(store);
  return {
    room: serializeManorCareRoom(nextRoom, actorUsername),
    snapshot: await buildManorSnapshot(nextRoom.target_username, actorUsername),
    idempotent: false,
  };
}

async function submitManorCareRoomAction(roomId, payload = {}, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录');
  const normalizedRoomId = sanitizeText(roomId, 100);
  const actionId = sanitizeText(payload.action_id, 60);
  const actionDef = MANOR_CARE_ROOM_ACTION_BY_ID[actionId];
  if (!actionDef) throw createError('未知的护理房间动作', 400);
  const store = loadCareStore();
  const rooms = (store.care_rooms || []).map(normalizeManorCareRoom);
  const room = rooms.find(entry => entry.id === normalizedRoomId);
  if (!room) throw createError('护理房间不存在', 404);
  if (!isManorCareRoomActive(room)) throw createError('护理房间已经结束', 409);
  if (nowSeconds() > room.window_ends_at) throw createError('护理窗口已经结束', 410);
  const participant = room.participants.find(entry => entry.username === actorUsername);
  if (!participant) throw createError('请先加入护理房间', 403);
  if (room.participants.length < MANOR_CARE_ROOM_MIN_MEMBERS) throw createError('护理房间至少需要 2 人加入后才能开始', 409);
  const dayTag = room.day_tag || getLocalDayTag();
  const idempotencyKey = buildManorCareRoomActionIdempotencyKey(room.id, actorUsername, actionDef.id, dayTag, payload.idempotency_key);
  const existing = room.actions.find(entry => entry.idempotency_key === idempotencyKey);
  if (existing) {
    return {
      action: existing,
      room: serializeManorCareRoom(room, actorUsername),
      snapshot: await buildManorSnapshot(room.target_username, actorUsername),
      idempotent: true,
    };
  }
  if (room.actions.some(entry => entry.action_id === actionDef.id)) {
    throw createError('这个护理分工已经完成', 409);
  }
  const completedOrders = new Set(room.actions.map(action => action.expected_order));
  const nextExpectedAction = MANOR_CARE_ROOM_ACTION_DEFS.find(action => !completedOrders.has(action.expected_order));
  const expectedOrder = nextExpectedAction?.expected_order || actionDef.expected_order;
  const orderRisk = actionDef.expected_order !== expectedOrder;
  const roleMatched = participant.role_id === actionDef.role_id;
  const riskDelta = orderRisk ? actionDef.risk_delta : 0;
  const healthDelta = Math.max(1, actionDef.health_delta + (roleMatched ? 3 : 0) - riskDelta);
  const now = nowSeconds();
  const action = normalizeManorCareRoomAction({
    id: makeId('manor_care_room_action'),
    action_id: actionDef.id,
    action_label: actionDef.label,
    role_id: actionDef.role_id,
    role_label: actionDef.role_label,
    object_id: actionDef.object_id,
    object_label: actionDef.object_label,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actorUsername,
    expected_order: actionDef.expected_order,
    actual_order: room.actions.length + 1,
    order_risk: orderRisk,
    role_matched: roleMatched,
    risk_delta: riskDelta,
    health_delta: healthDelta,
    idempotency_key: idempotencyKey,
    summary: `${actor.displayName || actorUsername} 完成「${actionDef.label}」：${actionDef.summary}${orderRisk ? '（顺序提前，产生护理风险）' : ''}`,
    created_at: now,
  });
  const nextRoom = normalizeManorCareRoom({
    ...room,
    status: 'in_progress',
    actions: [...room.actions, action],
    risk_score: room.risk_score + riskDelta,
    summary: action.summary,
    updated_at: now,
  });
  store.care_rooms = [nextRoom, ...rooms.filter(entry => entry.id !== room.id)].slice(0, 500);
  saveCareStore(store);
  return {
    action,
    room: serializeManorCareRoom(nextRoom, actorUsername),
    snapshot: await buildManorSnapshot(nextRoom.target_username, actorUsername),
    idempotent: false,
  };
}

async function settleManorCareRoom(roomId, payload = {}, actor = {}) {
  const actorUsername = String(actor.username || '').trim();
  if (!actorUsername) throw createError('请先登录');
  const normalizedRoomId = sanitizeText(roomId, 100);
  const store = loadCareStore();
  const rooms = (store.care_rooms || []).map(normalizeManorCareRoom);
  const room = rooms.find(entry => entry.id === normalizedRoomId);
  if (!room) throw createError('护理房间不存在', 404);
  const isParticipant = room.participants.some(entry => entry.username === actorUsername);
  const isOwner = room.target_username === actorUsername;
  if (!isParticipant && !isOwner) throw createError('只有房间成员或庄园主人可以结算护理房间', 403);
  if (room.status === 'completed') {
    return {
      room: serializeManorCareRoom(room, actorUsername),
      snapshot: await buildManorSnapshot(room.target_username, actorUsername),
      idempotent: true,
    };
  }
  if (room.participants.length < MANOR_CARE_ROOM_MIN_MEMBERS) throw createError('护理房间至少需要 2 人才能结算', 409);
  if (room.actions.length < MANOR_CARE_ROOM_MIN_MEMBERS && room.status !== 'expired') {
    throw createError('至少完成 2 个护理分工后才能结算', 409);
  }
  const settlement = calculateManorCareRoomSettlement(room);
  const now = nowSeconds();
  const receiptId = sanitizeText(payload.idempotency_key, 100)
    || `manor_care_room_settle:${room.id}:${room.day_tag || getLocalDayTag()}`;
  const nextRoom = normalizeManorCareRoom({
    ...room,
    status: 'completed',
    risk_score: settlement.riskScore,
    health_score: settlement.healthScore,
    health_delta: settlement.healthDelta,
    settlement_receipt_id: receiptId,
    settled_by: actorUsername,
    settled_at: now,
    summary: settlement.summary,
    updated_at: now,
  });
  store.care_rooms = [nextRoom, ...rooms.filter(entry => entry.id !== room.id)].slice(0, 500);
  saveCareStore(store);
  return {
    room: serializeManorCareRoom(nextRoom, actorUsername),
    snapshot: await buildManorSnapshot(nextRoom.target_username, actorUsername),
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
  submitManorStealAction,
  createManorCareRoom,
  joinManorCareRoom,
  submitManorCareRoomAction,
  settleManorCareRoom,
  favoriteManor,
  followManor,
  listFavoriteOverview,
  listHotManorBoard,
};
