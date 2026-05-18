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

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

const SEASON_LABELS = Object.freeze({
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
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

function getVisitsForTarget(targetUsername) {
  const normalizedTarget = String(targetUsername || '').trim();
  const store = loadVisitStore();
  return store.entries
    .map(normalizeVisitEntry)
    .filter(entry => entry.target_username === normalizedTarget)
    .sort((left, right) => right.created_at - left.created_at);
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
    placed_decoration_count: Object.values(decoration?.placed ?? {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0),
    public_tags: Array.isArray(profile.public_tags) ? profile.public_tags : [],
    guestbook_entries: getGuestbookEntriesForTarget(user.username),
    visit_entries: getVisitsForTarget(user.username),
  };
}

async function getOwnManorSnapshot(username) {
  return buildManorSnapshot(username, username, { ignoreVisibility: true });
}

async function getPublicManorSnapshot(username, viewerUsername = '') {
  return buildManorSnapshot(username, viewerUsername);
}

module.exports = {
  getOwnManorSnapshot,
  getPublicManorSnapshot,
  leaveGuestbookEntry,
  replyGuestbookEntry,
  setGuestbookPinned,
  recordManorVisit,
};
