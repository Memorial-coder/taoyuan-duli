/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { deleteUserSaveData } = require('./taoyuanSaveRuntime');
const { moderateText } = require('./taoyuanTextModeration');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_META_FILE = path.join(DATA_DIR, 'user_admin_meta.json');
const ADMIN_AUDIT_LOG_FILE = path.join(DATA_DIR, 'admin_audit_logs.json');
const CONTENT_REVISION_LOG_FILE = path.join(DATA_DIR, 'admin_content_revisions.json');
const GAMEPLAY_EVENT_LOG_FILE = path.join(DATA_DIR, 'taoyuan_gameplay_event_logs.json');
const USER_IP_PROFILE_FILE = path.join(DATA_DIR, 'user_ip_profiles.json');
const EXCHANGE_RATE = parseInt(process.env.EXCHANGE_RATE || '500000', 10);
const DEFAULT_USER_QUOTA = parseInt(process.env.DEFAULT_USER_QUOTA || '2000000', 10);
const QA_ONLINE_SMOKE_FORCE_LOCAL = String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim().toLowerCase() === 'true';
const GAMEPLAY_EVENT_LOG_MAX_TOTAL = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_MAX_TOTAL || '1000000', 10) || 1000000);
const GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT || '24000', 10) || 24000);
const GAMEPLAY_EVENT_LOG_RETENTION_DAYS = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_RETENTION_DAYS || '30', 10) || 30);
const DEFAULT_ADMIN_AUDIT_RETENTION_DAYS = 180;
const DEFAULT_USER_IP_PROFILE_RETENTION_DAYS = 180;
const MAJOR_ADMIN_AUDIT_ACTIONS = new Set([
  'ban_user_for_image',
  'unban_user',
  'delete_user',
  'remove_image_blacklist',
  'hide_hall_image_asset',
  'restore_hall_image_asset',
  'set_hall_report_status',
  'set_image_report_status',
  'hide_image_from_report',
  'hide_hall_post',
  'restore_hall_post',
  'delete_hall_reply',
  'update_content_moderation_rules',
]);

const MYSQL_ENABLED = !QA_ONLINE_SMOKE_FORCE_LOCAL && Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);

let mysqlPool = null;
let mysqlReadyPromise = null;
let lastMysqlFallbackLogAt = 0;
let localUserStoreCache = null;
const AUTH_SUCCESS_CACHE_TTL_MS = Math.max(
  0,
  parseInt(process.env.AUTH_SUCCESS_CACHE_TTL_MS || '300000', 10) || 0
);
const AUTH_SUCCESS_CACHE_LIMIT = Math.max(
  100,
  parseInt(process.env.AUTH_SUCCESS_CACHE_LIMIT || '1000', 10) || 1000
);
const authSuccessCache = new Map();

function logMysqlFallback(scope, error) {
  const now = Date.now();
  if (now - lastMysqlFallbackLogAt < 15000) return;
  lastMysqlFallbackLogAt = now;
  const code = String(error?.code || '').trim();
  const message = String(error?.message || error || '').trim();
  console.warn(`[db] MySQL unavailable during ${scope}, falling back to local store. ${code || message}`);
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createStoreCorruptionError(filePath) {
  const error = new Error(`${path.basename(filePath)} 已损坏，拒绝以空状态继续运行`);
  error.status = 500;
  error.code = 'STORE_CORRUPTED';
  return error;
}

function readJsonStoreStrict(filePath) {
  ensureDir();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw createStoreCorruptionError(filePath);
  }
}

function writeJsonFileAtomic(filePath, data) {
  ensureDir();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    throw error;
  }
}

function cloneLocalUserStore(store) {
  return {
    users: Array.isArray(store?.users) ? store.users.map(user => ({ ...user })) : [],
  };
}

function setLocalUserStoreCache(stat, store) {
  localUserStoreCache = {
    mtimeMs: Number(stat?.mtimeMs) || 0,
    size: Number(stat?.size) || 0,
    store: cloneLocalUserStore(store),
  };
}

function buildAuthSuccessCacheKey(usernameKey, passwordHash, password) {
  return crypto
    .createHash('sha256')
    .update([
      normalizeUsernameKey(usernameKey),
      String(passwordHash || ''),
      String(password || ''),
    ].join('\0'))
    .digest('hex');
}

function hasCachedSuccessfulAuth(usernameKey, passwordHash, password) {
  if (!AUTH_SUCCESS_CACHE_TTL_MS) return false;
  const key = buildAuthSuccessCacheKey(usernameKey, passwordHash, password);
  const entry = authSuccessCache.get(key);
  if (!entry || entry.expires_at <= Date.now()) {
    if (entry) authSuccessCache.delete(key);
    return false;
  }
  entry.expires_at = Date.now() + AUTH_SUCCESS_CACHE_TTL_MS;
  return true;
}

function rememberSuccessfulAuth(usernameKey, passwordHash, password) {
  if (!AUTH_SUCCESS_CACHE_TTL_MS) return;
  const key = buildAuthSuccessCacheKey(usernameKey, passwordHash, password);
  authSuccessCache.set(key, {
    expires_at: Date.now() + AUTH_SUCCESS_CACHE_TTL_MS,
  });
  while (authSuccessCache.size > AUTH_SUCCESS_CACHE_LIMIT) {
    const firstKey = authSuccessCache.keys().next().value;
    if (!firstKey) break;
    authSuccessCache.delete(firstKey);
  }
}

function loadStore() {
  ensureDir();
  if (!fs.existsSync(USERS_FILE)) return { users: [] };
  const stat = fs.statSync(USERS_FILE);
  if (
    localUserStoreCache &&
    localUserStoreCache.mtimeMs === Number(stat.mtimeMs) &&
    localUserStoreCache.size === Number(stat.size)
  ) {
    return cloneLocalUserStore(localUserStoreCache.store);
  }
  const raw = readJsonStoreStrict(USERS_FILE);
  if (raw === null) return { users: [] };
  if (!Array.isArray(raw?.users)) throw createStoreCorruptionError(USERS_FILE);
  setLocalUserStoreCache(stat, raw);
  return cloneLocalUserStore(raw);
}

function saveStore(store) {
  writeJsonFileAtomic(USERS_FILE, store);
  try {
    setLocalUserStoreCache(fs.statSync(USERS_FILE), store);
  } catch {
    localUserStoreCache = null;
  }
}

function normalizeUsername(username) {
  return String(username || '').normalize('NFKC').trim();
}

function normalizeUsernameKey(username) {
  return normalizeUsername(username).toLocaleLowerCase('zh-CN');
}

function validateUsername(username) {
  const normalized = normalizeUsername(username);
  const length = Array.from(normalized).length;
  if (!normalized || length < 2) return '用户名至少 2 位';
  if (length > 20) return '用户名最多 20 位';
  if (/\s/.test(normalized)) return '用户名不能包含空格';
  if (!/^[\p{L}\p{N}._-]+$/u.test(normalized)) {
    return '用户名仅支持中文、字母、数字、点、下划线和短横线';
  }
  return '';
}

function sanitizeDisplayName(displayName, username) {
  const fallback = normalizeUsername(username) || '玩家';
  const normalized = normalizeUsername(displayName || fallback);
  const sliced = Array.from(normalized).slice(0, 30).join('');
  return sliced || fallback;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizePositiveInt(value, fallback) {
  const normalized = parseInt(value, 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function getConfigValue(key) {
  try {
    return require('./config').get(key);
  } catch {
    return undefined;
  }
}

function getAdminAuditRetentionDays() {
  return Math.max(
    DEFAULT_ADMIN_AUDIT_RETENTION_DAYS,
    normalizePositiveInt(
      process.env.ADMIN_AUDIT_RETENTION_DAYS || getConfigValue('admin_audit_retention_days'),
      DEFAULT_ADMIN_AUDIT_RETENTION_DAYS,
    ),
  );
}

function getUserIpProfileRetentionDays() {
  return Math.max(
    DEFAULT_USER_IP_PROFILE_RETENTION_DAYS,
    normalizePositiveInt(
      process.env.USER_IP_PROFILE_RETENTION_DAYS || getConfigValue('user_ip_profile_retention_days'),
      DEFAULT_USER_IP_PROFILE_RETENTION_DAYS,
    ),
  );
}

function normalizeIpAddress(value) {
  let raw = String(value || '').normalize('NFKC').trim();
  if (!raw) return '';
  const bracketMatch = raw.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) raw = bracketMatch[1].trim();
  if (!net.isIP(raw) && /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.test(raw)) {
    raw = raw.replace(/:\d+$/, '');
  }
  if (raw.toLowerCase().startsWith('::ffff:')) {
    const mapped = raw.slice(7);
    if (net.isIP(mapped) === 4) raw = mapped;
  }
  const version = net.isIP(raw);
  if (!version) return '';
  return version === 6 ? raw.toLowerCase() : raw;
}

function expandIpv6Address(ipAddress) {
  const raw = normalizeIpAddress(ipAddress);
  if (net.isIP(raw) !== 6) return [];
  const [leftRaw, rightRaw = ''] = raw.split('::');
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
  const right = rightRaw ? rightRaw.split(':').filter(Boolean) : [];
  const missing = Math.max(0, 8 - left.length - right.length);
  return [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right,
  ].slice(0, 8).map(part => {
    const normalized = part.replace(/^0+/, '');
    return normalized || '0';
  });
}

function maskIpAddress(value) {
  const ipAddress = normalizeIpAddress(value);
  const version = net.isIP(ipAddress);
  if (version === 4) {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  if (version === 6) {
    const groups = expandIpv6Address(ipAddress);
    return groups.length ? `${groups.slice(0, 4).join(':')}::/64` : '';
  }
  return '';
}

function hashUserIpAddress(value) {
  const ipAddress = normalizeIpAddress(value);
  if (!ipAddress) return '';
  return crypto
    .createHash('sha256')
    .update(`${process.env.USER_IP_HASH_SALT || process.env.AUDIT_HASH_SALT || 'taoyuan-user-ip-profile'}:${ipAddress}`)
    .digest('hex');
}

function normalizeUserIpSource(value) {
  const normalized = String(value || 'session_check')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return normalized || 'session_check';
}

function parseJsonObjectSafe(value) {
  if (!value) return {};
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeUserIpSourceCounts(value, fallbackSource = '', fallbackCount = 1) {
  const counts = {};
  const add = (source, count = 1) => {
    const normalized = normalizeUserIpSource(source);
    const amount = Math.max(0, Math.floor(Number(count) || 0));
    if (!amount) return;
    counts[normalized] = (counts[normalized] || 0) + amount;
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') add(item, 1);
      else if (item && typeof item === 'object') add(item.source || item.name, item.count);
    }
  } else {
    const objectValue = parseJsonObjectSafe(value);
    for (const [source, count] of Object.entries(objectValue)) add(source, count);
  }

  if (!Object.keys(counts).length) add(fallbackSource, fallbackCount);
  return counts;
}

function mapUserIpSourcesForResponse(sourceCounts = {}) {
  return Object.entries(normalizeUserIpSourceCounts(sourceCounts))
    .map(([source, count]) => ({ source, count: Math.max(0, Number(count) || 0) }))
    .filter(item => item.count > 0)
    .sort((a, b) => (b.count - a.count) || a.source.localeCompare(b.source));
}

function normalizeUserIpProfileEntry(entry = {}) {
  const username = normalizeUsername(entry.username || '');
  const usernameKey = normalizeUsernameKey(entry.username_key || username);
  const ipAddress = normalizeIpAddress(entry.ip_address || entry.ip || '');
  const ipHash = String(entry.ip_hash || hashUserIpAddress(ipAddress)).trim();
  if (!usernameKey || !ipHash || !ipAddress) return null;
  const source = normalizeUserIpSource(entry.source);
  const count = Math.max(1, Math.floor(Number(entry.count) || 1));
  const firstSeenAt = Number(entry.first_seen_at || entry.created_at || entry.last_seen_at) || nowSeconds();
  const lastSeenAt = Number(entry.last_seen_at || entry.updated_at || entry.first_seen_at) || firstSeenAt;
  return {
    username,
    username_key: usernameKey,
    display_name: String(entry.display_name || username || '').trim(),
    ip_address: ipAddress,
    ip_hash: ipHash,
    ip_masked: String(entry.ip_masked || entry.ip_display || maskIpAddress(ipAddress)).trim() || maskIpAddress(ipAddress),
    first_seen_at: Math.min(firstSeenAt, lastSeenAt),
    last_seen_at: Math.max(firstSeenAt, lastSeenAt),
    source,
    count,
    sources: normalizeUserIpSourceCounts(entry.sources || entry.source_counts || entry.sources_json, source, count),
  };
}

function serializeUserIpProfileEntry(entry = {}) {
  const normalized = normalizeUserIpProfileEntry(entry);
  if (!normalized) return null;
  return {
    username: normalized.username,
    username_key: normalized.username_key,
    ip_address: normalized.ip_address,
    ip_hash: normalized.ip_hash,
    ip_masked: normalized.ip_masked,
    first_seen_at: normalized.first_seen_at,
    last_seen_at: normalized.last_seen_at,
    source: normalized.source,
    count: normalized.count,
    sources: normalized.sources,
  };
}

function mapUserIpProfileForResponse(entry = {}, extras = {}) {
  const normalized = normalizeUserIpProfileEntry(entry);
  if (!normalized) return null;
  return {
    username: normalized.username,
    display_name: extras.display_name || normalized.display_name || normalized.username,
    ip_address: normalized.ip_address,
    ip_hash: normalized.ip_hash,
    ip_masked: normalized.ip_masked,
    ip_display: normalized.ip_address,
    first_seen_at: normalized.first_seen_at,
    last_seen_at: normalized.last_seen_at,
    source: normalized.source,
    sources: mapUserIpSourcesForResponse(normalized.sources),
    count: normalized.count,
    same_user_count: Math.max(0, Number(extras.same_user_count) || 0),
  };
}

function loadUserIpProfileStore() {
  const raw = readJsonStoreStrict(USER_IP_PROFILE_FILE);
  if (raw === null) return { profiles: [] };
  if (!raw || !Array.isArray(raw.profiles)) throw createStoreCorruptionError(USER_IP_PROFILE_FILE);
  return raw;
}

function saveUserIpProfileStore(store) {
  const profiles = (store?.profiles || [])
    .map(serializeUserIpProfileEntry)
    .filter(Boolean)
    .sort((a, b) => (b.last_seen_at - a.last_seen_at) || a.username.localeCompare(b.username, 'zh-CN'));
  writeJsonFileAtomic(USER_IP_PROFILE_FILE, { profiles });
}

function getUserIpProfileCutoff() {
  return nowSeconds() - getUserIpProfileRetentionDays() * 86400;
}

function loadActiveUserIpProfiles({ prune = false } = {}) {
  const cutoff = getUserIpProfileCutoff();
  const store = loadUserIpProfileStore();
  const before = store.profiles.length;
  const profiles = store.profiles
    .map(normalizeUserIpProfileEntry)
    .filter(entry => entry && entry.last_seen_at >= cutoff);
  const nextStore = { profiles };
  if (prune && profiles.length !== before) saveUserIpProfileStore(nextStore);
  return nextStore;
}

function attachLocalUserDisplayNames(profiles = []) {
  const store = loadStore();
  const names = new Map();
  for (const user of store.users || []) {
    const usernameKey = user.username_key || normalizeUsernameKey(user.username);
    if (usernameKey) {
      names.set(usernameKey, {
        username: user.username,
        display_name: user.display_name || user.username,
        deleted_at: user.deleted_at ? Number(user.deleted_at) || null : null,
      });
    }
  }
  return profiles.map(profile => {
    const user = names.get(profile.username_key);
    return {
      ...profile,
      username: user?.username || profile.username,
      display_name: user?.display_name || profile.display_name || profile.username,
      deleted_at: user?.deleted_at || null,
    };
  });
}

function buildUserIpSameUserCounts(profiles = []) {
  const buckets = new Map();
  for (const profile of profiles) {
    if (!profile.ip_hash || !profile.username_key) continue;
    if (!buckets.has(profile.ip_hash)) buckets.set(profile.ip_hash, new Set());
    buckets.get(profile.ip_hash).add(profile.username_key);
  }
  const counts = new Map();
  for (const [ipHash, usernames] of buckets.entries()) counts.set(ipHash, usernames.size);
  return counts;
}

function normalizeAdminStatus(status) {
  const normalized = String(status || 'active').trim().toLowerCase();
  return ['active', 'banned', 'deleted'].includes(normalized) ? normalized : 'active';
}

function loadUserMetaStore() {
  const raw = readJsonStoreStrict(USER_META_FILE);
  if (raw === null) return { users: {} };
  if (!raw || !raw.users || typeof raw.users !== 'object') throw createStoreCorruptionError(USER_META_FILE);
  return raw;
}

function saveUserMetaStore(store) {
  writeJsonFileAtomic(USER_META_FILE, { users: store?.users || {} });
}

function getLocalUserMeta(usernameKey) {
  const store = loadUserMetaStore();
  const entry = store.users?.[usernameKey];
  return {
    status: normalizeAdminStatus(entry?.status),
    banned_at: entry?.banned_at ? Number(entry.banned_at) || null : null,
    updated_at: Number(entry?.updated_at) || 0,
  };
}

function setLocalUserMeta(usernameKey, patch = {}) {
  const store = loadUserMetaStore();
  const now = nowSeconds();
  const next = {
    ...getLocalUserMeta(usernameKey),
    ...patch,
    status: normalizeAdminStatus(patch.status),
    updated_at: now,
  };
  next.banned_at = next.status === 'banned'
    ? (Number(patch.banned_at) || next.banned_at || now)
    : null;
  if (!store.users || typeof store.users !== 'object') store.users = {};
  store.users[usernameKey] = next;
  saveUserMetaStore(store);
  return next;
}

function clearLocalUserMeta(usernameKey) {
  const store = loadUserMetaStore();
  if (!store.users || typeof store.users !== 'object' || !Object.prototype.hasOwnProperty.call(store.users, usernameKey)) {
    return false;
  }
  delete store.users[usernameKey];
  saveUserMetaStore(store);
  return true;
}

function loadAdminAuditLogStore() {
  ensureDir();
  try {
    if (!fs.existsSync(ADMIN_AUDIT_LOG_FILE)) return { logs: [] };
    const raw = JSON.parse(fs.readFileSync(ADMIN_AUDIT_LOG_FILE, 'utf8'));
    return Array.isArray(raw?.logs) ? raw : { logs: [] };
  } catch {
    return { logs: [] };
  }
}

function saveAdminAuditLogStore(store) {
  ensureDir();
  fs.writeFileSync(ADMIN_AUDIT_LOG_FILE, JSON.stringify({ logs: store?.logs || [] }, null, 2), 'utf8');
}

function normalizeAuditLogEntry(entry = {}) {
  return {
    id: String(entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    operator_role: String(entry.operator_role || ''),
    operator_name: String(entry.operator_name || ''),
    action: String(entry.action || ''),
    target_username: String(entry.target_username || ''),
    detail_json: entry.detail_json || '{}',
    created_at: Number(entry.created_at) || nowSeconds(),
  };
}

function loadContentRevisionStore() {
  ensureDir();
  try {
    if (!fs.existsSync(CONTENT_REVISION_LOG_FILE)) return { revisions: [] };
    const raw = JSON.parse(fs.readFileSync(CONTENT_REVISION_LOG_FILE, 'utf8'));
    return Array.isArray(raw?.revisions) ? raw : { revisions: [] };
  } catch {
    return { revisions: [] };
  }
}

function saveContentRevisionStore(store) {
  ensureDir();
  fs.writeFileSync(CONTENT_REVISION_LOG_FILE, JSON.stringify({ revisions: store?.revisions || [] }, null, 2), 'utf8');
}

function normalizeContentRevisionEntry(entry = {}) {
  return {
    id: String(entry.id || `content_rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    content_key: String(entry.content_key || ''),
    title: String(entry.title || ''),
    summary: String(entry.summary || ''),
    action: String(entry.action || 'draft'),
    published: entry.published === true,
    operator_role: String(entry.operator_role || ''),
    operator_name: String(entry.operator_name || ''),
    payload_json: entry.payload_json || '{}',
    created_at: Number(entry.created_at) || nowSeconds(),
  };
}

function loadGameplayEventLogStore() {
  ensureDir();
  try {
    if (!fs.existsSync(GAMEPLAY_EVENT_LOG_FILE)) return { logs: [] };
    const raw = JSON.parse(fs.readFileSync(GAMEPLAY_EVENT_LOG_FILE, 'utf8'));
    return Array.isArray(raw?.logs) ? raw : { logs: [] };
  } catch {
    return { logs: [] };
  }
}

function saveGameplayEventLogStore(store) {
  writeJsonFileAtomic(GAMEPLAY_EVENT_LOG_FILE, { logs: store?.logs || [] });
}

function normalizeGameplayEventLogEntry(entry = {}) {
  return {
    id: String(entry.id || `gameplay_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    username: String(entry.username || ''),
    day_label: String(entry.day_label || ''),
    category: String(entry.category || 'system'),
    message: String(entry.message || ''),
    route_name: String(entry.route_name || ''),
    tags_json: entry.tags_json || '[]',
    meta_json: entry.meta_json || '{}',
    created_at: Number(entry.created_at) || nowSeconds(),
  };
}

function getGameplayEventLogSaveSlot(entry = {}) {
  try {
    const meta = JSON.parse(entry.meta_json || '{}');
    return Number.isInteger(Number(meta?.save_slot)) ? Number(meta.save_slot) : null;
  } catch {
    return null;
  }
}

function mapGameplayEventLogForResponse(item = {}) {
  const meta = (() => {
    try {
      const parsed = JSON.parse(item.meta_json || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })();
  return {
    id: String(item.id || ''),
    username: String(item.username || ''),
    day_label: String(item.day_label || ''),
    category: String(item.category || 'system'),
    message: String(item.message || ''),
    route_name: String(item.route_name || ''),
    tags: (() => {
      try {
        const parsed = JSON.parse(item.tags_json || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    meta,
    save_slot: Number.isInteger(Number(meta?.save_slot)) ? Number(meta.save_slot) : null,
    created_at: Number(item.created_at) || 0,
  };
}

function pruneGameplayEventLogEntries(entries = [], now = nowSeconds()) {
  const cutoff = now - GAMEPLAY_EVENT_LOG_RETENTION_DAYS * 86400;
  const perUserSlotCounts = new Map();
  const normalized = entries
    .map(normalizeGameplayEventLogEntry)
    .filter(entry => (Number(entry.created_at) || 0) >= cutoff)
    .sort((left, right) => {
      const byCreatedAt = (Number(right.created_at) || 0) - (Number(left.created_at) || 0);
      return byCreatedAt !== 0 ? byCreatedAt : String(right.id).localeCompare(String(left.id));
    });
  const kept = [];
  for (const entry of normalized) {
    if (kept.length >= GAMEPLAY_EVENT_LOG_MAX_TOTAL) break;
    const username = entry.username || 'guest';
    const saveSlot = getGameplayEventLogSaveSlot(entry);
    const key = `${username}|${saveSlot ?? 'none'}`;
    const count = perUserSlotCounts.get(key) || 0;
    if (count >= GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT) continue;
    perUserSlotCounts.set(key, count + 1);
    kept.push(entry);
  }
  return kept;
}

function getGameplayEventLogRetentionPolicy() {
  return {
    retention_days: GAMEPLAY_EVENT_LOG_RETENTION_DAYS,
    max_total: GAMEPLAY_EVENT_LOG_MAX_TOTAL,
    max_per_user_slot: GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT,
  };
}

function localUserToPublic(user) {
  if (!user || user.deleted_at) return null;
  const quota = Number(user.quota) || 0;
  return {
    username: user.username,
    display_name: user.display_name || user.username,
    quota,
    dollars: parseFloat((quota / EXCHANGE_RATE).toFixed(4)),
  };
}

function buildMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return mysqlPool;
}

async function ensureMysqlReady() {
  if (!MYSQL_ENABLED) return false;
  if (!mysqlReadyPromise) {
    mysqlReadyPromise = (async () => {
      const pool = buildMysqlPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          username VARCHAR(64) NOT NULL,
          username_key VARCHAR(191) NOT NULL,
          display_name VARCHAR(64) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          quota INT NOT NULL DEFAULT ${DEFAULT_USER_QUOTA},
          created_at BIGINT NOT NULL,
          deleted_at BIGINT NULL DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_username_key (username_key),
          KEY idx_username (username),
          KEY idx_deleted_at (deleted_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_admin_meta (
          username_key VARCHAR(191) NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          banned_at BIGINT NULL DEFAULT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (username_key)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_ip_profiles (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          username VARCHAR(64) NOT NULL,
          username_key VARCHAR(191) NOT NULL,
          ip_address VARCHAR(120) NOT NULL,
          ip_hash CHAR(64) NOT NULL,
          ip_masked VARCHAR(120) NOT NULL,
          first_seen_at BIGINT NOT NULL,
          last_seen_at BIGINT NOT NULL,
          source VARCHAR(32) NOT NULL DEFAULT 'session_check',
          count INT NOT NULL DEFAULT 1,
          sources_json LONGTEXT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_username_ip_hash (username_key, ip_hash),
          KEY idx_ip_hash_last_seen (ip_hash, last_seen_at),
          KEY idx_username_last_seen (username_key, last_seen_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          operator_role VARCHAR(32) NOT NULL,
          operator_name VARCHAR(64) NOT NULL,
          action VARCHAR(64) NOT NULL,
          target_username VARCHAR(64) NOT NULL DEFAULT '',
          detail_json LONGTEXT NULL,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (id),
          KEY idx_action_created_at (action, created_at),
          KEY idx_target_username (target_username)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_content_revisions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          content_key VARCHAR(64) NOT NULL,
          title VARCHAR(191) NOT NULL DEFAULT '',
          summary VARCHAR(255) NOT NULL DEFAULT '',
          action VARCHAR(32) NOT NULL DEFAULT 'draft',
          published TINYINT(1) NOT NULL DEFAULT 0,
          operator_role VARCHAR(32) NOT NULL DEFAULT '',
          operator_name VARCHAR(64) NOT NULL DEFAULT '',
          payload_json LONGTEXT NULL,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (id),
          KEY idx_content_key_created_at (content_key, created_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS gameplay_event_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          username VARCHAR(64) NOT NULL DEFAULT '',
          day_label VARCHAR(64) NOT NULL DEFAULT '',
          category VARCHAR(32) NOT NULL DEFAULT 'system',
          message VARCHAR(512) NOT NULL,
          route_name VARCHAR(128) NOT NULL DEFAULT '',
          tags_json LONGTEXT NULL,
          meta_json LONGTEXT NULL,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (id),
          KEY idx_username_created_at (username, created_at),
          KEY idx_category_created_at (category, created_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    })().catch(error => {
      mysqlReadyPromise = null;
      throw error;
    });
  }
  await mysqlReadyPromise;
  return true;
}

async function getMysqlUserByKey(username) {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;
  await ensureMysqlReady();
  const [rows] = await buildMysqlPool().execute(
    'SELECT username, username_key, display_name, password_hash, quota, created_at, deleted_at FROM users WHERE username_key = ? LIMIT 1',
    [usernameKey]
  );
  return rows[0] || null;
}

function mapAdminUserRecord(record) {
  if (!record) return null;
  const deletedAt = record.deleted_at ? Number(record.deleted_at) || null : null;
  const rawStatus = normalizeAdminStatus(record.meta_status || record.status || 'active');
  return {
    username: record.username,
    username_key: record.username_key,
    display_name: record.display_name || record.username,
    password_hash: record.password_hash,
    quota: Number(record.quota) || 0,
    created_at: Number(record.created_at) || 0,
    deleted_at: deletedAt,
    banned_at: record.banned_at ? Number(record.banned_at) || null : null,
    status: deletedAt ? 'deleted' : rawStatus,
  };
}

async function getMysqlAdminUserByKey(username) {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;
  await ensureMysqlReady();
  const [rows] = await buildMysqlPool().execute(
    `SELECT
      u.username,
      u.username_key,
      u.display_name,
      u.password_hash,
      u.quota,
      u.created_at,
      u.deleted_at,
      COALESCE(m.status, 'active') AS meta_status,
      m.banned_at
    FROM users u
    LEFT JOIN user_admin_meta m ON m.username_key = u.username_key
    WHERE u.username_key = ?
    LIMIT 1`,
    [usernameKey]
  );
  return mapAdminUserRecord(rows[0] || null);
}

function getLocalAdminUserRecord(username) {
  const { store, user, usernameKey } = findLocalUser(username);
  if (!user) return { store, user: null, usernameKey, meta: getLocalUserMeta(usernameKey) };
  const meta = getLocalUserMeta(usernameKey);
  return {
    store,
    usernameKey,
    meta,
    user: {
      username: user.username,
      username_key: user.username_key || usernameKey,
      display_name: user.display_name || user.username,
      password_hash: user.password_hash,
      quota: Number(user.quota) || 0,
      created_at: Number(user.created_at) || 0,
      deleted_at: user.deleted_at ? Number(user.deleted_at) || null : null,
      banned_at: meta.banned_at,
      status: user.deleted_at ? 'deleted' : meta.status,
    },
  };
}

function findLocalUser(username) {
  const usernameKey = normalizeUsernameKey(username);
  const store = loadStore();
  const user = store.users.find(item => (item.username_key || normalizeUsernameKey(item.username)) === usernameKey) || null;
  return { store, user, usernameKey };
}

function listLocalUsers() {
  const store = loadStore();
  return store.users
    .filter(item => !item.deleted_at)
    .map(item => ({
      username: item.username,
      username_key: item.username_key || normalizeUsernameKey(item.username),
      display_name: item.display_name || item.username,
      quota: Number(item.quota) || 0,
    }))
    .sort((a, b) => a.username.localeCompare(b.username, 'zh-CN'));
}

function likeMatch(value, pattern) {
  const keyword = String(pattern || '').replace(/%/g, '').toLocaleLowerCase('zh-CN');
  return String(value || '').toLocaleLowerCase('zh-CN').includes(keyword);
}

function buildLocalPool() {
  return {
    async execute(sql, params = []) {
      const statement = String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const users = listLocalUsers();

      if (statement.includes('where deleted_at is null and (username like ? or display_name like ?)')) {
        const like = params[0];
        const rows = users
          .filter(item => likeMatch(item.username, like) || likeMatch(item.display_name, like))
          .slice(0, 500)
          .map(item => ({ username: item.username, display_name: item.display_name }));
        return [rows];
      }

      if (statement.includes('where deleted_at is null order by username asc')) {
        return [[...users.map(item => ({ username: item.username, display_name: item.display_name }))]];
      }

      if (statement.includes('where deleted_at is null and username in')) {
        const wanted = new Set((params || []).map(item => normalizeUsernameKey(item)).filter(Boolean));
        const rows = users
          .filter(item => wanted.has(item.username_key))
          .map(item => ({ username: item.username, display_name: item.display_name }));
        return [rows];
      }

      throw new Error(`Unsupported local DB query: ${sql}`);
    },
  };
}

function getPool() {
  if (!MYSQL_ENABLED) return buildLocalPool();
  const localPool = buildLocalPool();
  return {
    async execute(sql, params = []) {
      try {
        await ensureMysqlReady();
        return await buildMysqlPool().execute(sql, params);
      } catch (error) {
        logMysqlFallback('pooled read query', error);
        return localPool.execute(sql, params);
      }
    },
  };
}

async function registerUser(username, password, displayName, auditContext = {}) {
  const normalized = normalizeUsername(username);
  const usernameKey = normalizeUsernameKey(username);
  const usernameError = validateUsername(username);
  const pwd = String(password || '');
  const baseAuditContext = auditContext && typeof auditContext === 'object' ? auditContext : {};

  if (usernameError) return { ok: false, msg: usernameError };
  if (pwd.length < 6) return { ok: false, msg: '密码至少 6 位' };

  const finalUsername = moderateText(normalized, {
    label: '用户名',
    field: 'username',
    scene: 'register',
    minLength: 2,
    maxLength: 20,
    storageMaxLength: 20,
    auditContext: {
      ...baseAuditContext,
      scene: baseAuditContext.scene || 'register',
      field: 'username',
      username: baseAuditContext.username || normalized,
      content_type: 'register_username',
    },
  });
  const passwordHash = await bcrypt.hash(pwd, 10);
  const createdAt = Math.floor(Date.now() / 1000);
  const finalDisplayName = moderateText(sanitizeDisplayName(displayName, finalUsername), {
    label: '玩家昵称',
    field: 'display_name',
    scene: 'register',
    minLength: 1,
    maxLength: 30,
    storageMaxLength: 30,
    auditContext: {
      ...baseAuditContext,
      scene: baseAuditContext.scene || 'register',
      field: 'display_name',
      username: baseAuditContext.username || finalUsername,
      content_type: 'register_display_name',
    },
  });

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const pool = buildMysqlPool();
    const [existsRows] = await pool.execute(
      'SELECT id FROM users WHERE username_key = ? AND deleted_at IS NULL LIMIT 1',
      [usernameKey]
    );
    if (existsRows.length > 0) return { ok: false, msg: '用户名已存在' };

    await pool.execute(
      'INSERT INTO users (username, username_key, display_name, password_hash, quota, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL)',
      [finalUsername, usernameKey, finalDisplayName, passwordHash, DEFAULT_USER_QUOTA, createdAt]
    );

    return {
      ok: true,
      user: {
        username: finalUsername,
        display_name: finalDisplayName,
        quota: DEFAULT_USER_QUOTA,
        dollars: parseFloat((DEFAULT_USER_QUOTA / EXCHANGE_RATE).toFixed(4)),
      },
    };
  }

  const store = loadStore();
  if (store.users.some(item => (item.username_key || normalizeUsernameKey(item.username)) === usernameKey && !item.deleted_at)) {
    return { ok: false, msg: '用户名已存在' };
  }

  const nextUser = {
    username: finalUsername,
    username_key: usernameKey,
    display_name: finalDisplayName,
    password_hash: passwordHash,
    quota: DEFAULT_USER_QUOTA,
    created_at: createdAt,
    deleted_at: null,
  };
  store.users.push(nextUser);
  store.users.sort((a, b) => a.username.localeCompare(b.username, 'zh-CN'));
  saveStore(store);
  return { ok: true, user: localUserToPublic(nextUser) };
}

async function verifyUser(username, password) {
  const normalized = normalizeUsername(username);
  if (!normalized) return { ok: false, msg: '请填写用户名' };

  if (MYSQL_ENABLED) {
    const user = await getMysqlAdminUserByKey(username);
    if (!user || user.deleted_at || user.status === 'deleted') return { ok: false, msg: '用户不存在' };
    if (user.status === 'banned') return { ok: false, msg: '用户已被封禁' };
    const ok = hasCachedSuccessfulAuth(user.username_key || user.username, user.password_hash, password) ||
      await bcrypt.compare(String(password || ''), String(user.password_hash || ''));
    if (ok) rememberSuccessfulAuth(user.username_key || user.username, user.password_hash, password);
    if (!ok) return { ok: false, msg: '密码错误' };
    return {
      ok: true,
      user: {
        username: user.username,
        display_name: user.display_name || user.username,
        quota: Number(user.quota) || 0,
        dollars: parseFloat(((Number(user.quota) || 0) / EXCHANGE_RATE).toFixed(4)),
      },
    };
  }

  const { user } = getLocalAdminUserRecord(username);
  if (!user || user.deleted_at) return { ok: false, msg: '用户不存在' };
  if (user.status === 'banned') return { ok: false, msg: '用户已被封禁' };
  const ok = hasCachedSuccessfulAuth(user.username_key || user.username, user.password_hash, password) ||
    await bcrypt.compare(String(password || ''), String(user.password_hash || ''));
  if (ok) rememberSuccessfulAuth(user.username_key || user.username, user.password_hash, password);
  if (!ok) return { ok: false, msg: '密码错误' };
  return { ok: true, user: localUserToPublic(user) };
}

async function getUserAccessState(username) {
  if (MYSQL_ENABLED) {
    try {
      const user = await getMysqlAdminUserByKey(username);
      return user ? user.status : null;
    } catch (error) {
      logMysqlFallback('getUserAccessState', error);
      const { user } = getLocalAdminUserRecord(username);
      return user ? user.status : 'active';
    }
  }
  const { user } = getLocalAdminUserRecord(username);
  return user ? user.status : null;
}

async function getUser(username) {
  if (MYSQL_ENABLED) {
    try {
      const user = await getMysqlUserByKey(username);
      if (!user || user.deleted_at) return null;
      return {
        username: user.username,
        display_name: user.display_name || user.username,
        quota: Number(user.quota) || 0,
        dollars: parseFloat(((Number(user.quota) || 0) / EXCHANGE_RATE).toFixed(4)),
      };
    } catch (error) {
      logMysqlFallback('getUser', error);
      const { user } = findLocalUser(username);
      return localUserToPublic(user);
    }
  }
  const { user } = findLocalUser(username);
  return localUserToPublic(user);
}

async function getQuota(username) {
  const user = await getUser(username);
  return user ? user.quota : null;
}

async function pruneExpiredUserIpProfiles() {
  const cutoff = getUserIpProfileCutoff();
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [result] = await buildMysqlPool().execute(
      'DELETE FROM user_ip_profiles WHERE last_seen_at < ?',
      [cutoff],
    );
    return { removed: Number(result?.affectedRows) || 0, retention_days: getUserIpProfileRetentionDays() };
  }

  const store = loadUserIpProfileStore();
  const before = store.profiles.length;
  const profiles = store.profiles
    .map(normalizeUserIpProfileEntry)
    .filter(entry => entry && entry.last_seen_at >= cutoff);
  saveUserIpProfileStore({ profiles });
  return { removed: Math.max(0, before - profiles.length), retention_days: getUserIpProfileRetentionDays() };
}

function recordLocalUserIpProfile(username, ipAddress, source) {
  const canonicalUsername = normalizeUsername(username);
  const usernameKey = normalizeUsernameKey(canonicalUsername);
  const normalizedIp = normalizeIpAddress(ipAddress);
  const ipHash = hashUserIpAddress(normalizedIp);
  if (!usernameKey || !normalizedIp || !ipHash) return null;

  const now = nowSeconds();
  const normalizedSource = normalizeUserIpSource(source);
  const store = loadActiveUserIpProfiles({ prune: true });
  const index = store.profiles.findIndex(item => item.username_key === usernameKey && item.ip_hash === ipHash);
  if (index >= 0) {
    const current = normalizeUserIpProfileEntry(store.profiles[index]);
    const sources = { ...(current.sources || {}) };
    sources[normalizedSource] = (Number(sources[normalizedSource]) || 0) + 1;
    const next = {
      ...current,
      username: canonicalUsername || current.username,
      ip_address: normalizedIp,
      ip_masked: maskIpAddress(normalizedIp),
      last_seen_at: now,
      source: normalizedSource,
      count: Math.max(1, Number(current.count) || 1) + 1,
      sources,
    };
    store.profiles[index] = next;
    saveUserIpProfileStore(store);
    return mapUserIpProfileForResponse(next);
  }

  const next = {
    username: canonicalUsername,
    username_key: usernameKey,
    ip_address: normalizedIp,
    ip_hash: ipHash,
    ip_masked: maskIpAddress(normalizedIp),
    first_seen_at: now,
    last_seen_at: now,
    source: normalizedSource,
    count: 1,
    sources: { [normalizedSource]: 1 },
  };
  store.profiles.unshift(next);
  saveUserIpProfileStore(store);
  return mapUserIpProfileForResponse(next);
}

async function recordUserIpProfile(username, ipAddress, source = 'session_check') {
  const canonicalUsername = normalizeUsername(username);
  const usernameKey = normalizeUsernameKey(canonicalUsername);
  const normalizedIp = normalizeIpAddress(ipAddress);
  const ipHash = hashUserIpAddress(normalizedIp);
  if (!usernameKey || !normalizedIp || !ipHash) return null;

  const normalizedSource = normalizeUserIpSource(source);
  const now = nowSeconds();

  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      await pruneExpiredUserIpProfiles();
      const pool = buildMysqlPool();
      const [rows] = await pool.execute(
        `SELECT username, username_key, ip_address, ip_hash, ip_masked, first_seen_at, last_seen_at, source, count, sources_json
         FROM user_ip_profiles
         WHERE username_key = ? AND ip_hash = ?
         LIMIT 1`,
        [usernameKey, ipHash],
      );
      const existing = rows[0] ? mapMysqlUserIpProfileRow(rows[0]) : null;
      if (existing) {
        const sources = { ...(existing.sources || {}) };
        sources[normalizedSource] = (Number(sources[normalizedSource]) || 0) + 1;
        const nextCount = Math.max(1, Number(existing.count) || 1) + 1;
        await pool.execute(
          `UPDATE user_ip_profiles
           SET username = ?, ip_address = ?, ip_masked = ?, last_seen_at = ?, source = ?, count = ?, sources_json = ?
           WHERE username_key = ? AND ip_hash = ?`,
          [
            canonicalUsername || existing.username,
            normalizedIp,
            maskIpAddress(normalizedIp),
            now,
            normalizedSource,
            nextCount,
            JSON.stringify(sources),
            usernameKey,
            ipHash,
          ],
        );
        return mapUserIpProfileForResponse({
          ...existing,
          username: canonicalUsername || existing.username,
          ip_address: normalizedIp,
          ip_masked: maskIpAddress(normalizedIp),
          last_seen_at: now,
          source: normalizedSource,
          count: nextCount,
          sources,
        });
      }

      const sources = { [normalizedSource]: 1 };
      await pool.execute(
        `INSERT INTO user_ip_profiles
         (username, username_key, ip_address, ip_hash, ip_masked, first_seen_at, last_seen_at, source, count, sources_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canonicalUsername,
          usernameKey,
          normalizedIp,
          ipHash,
          maskIpAddress(normalizedIp),
          now,
          now,
          normalizedSource,
          1,
          JSON.stringify(sources),
        ],
      );
      return mapUserIpProfileForResponse({
        username: canonicalUsername,
        username_key: usernameKey,
        ip_address: normalizedIp,
        ip_hash: ipHash,
        ip_masked: maskIpAddress(normalizedIp),
        first_seen_at: now,
        last_seen_at: now,
        source: normalizedSource,
        count: 1,
        sources,
      });
    } catch (error) {
      logMysqlFallback('recordUserIpProfile', error);
    }
  }

  return recordLocalUserIpProfile(canonicalUsername, normalizedIp, normalizedSource);
}

function mapMysqlUserIpProfileRow(row = {}) {
  const entry = normalizeUserIpProfileEntry({
    username: row.username,
    username_key: row.username_key,
    display_name: row.display_name,
    ip_address: row.ip_address,
    ip_hash: row.ip_hash,
    ip_masked: row.ip_masked,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    source: row.source,
    count: row.count,
    sources_json: row.sources_json,
  });
  if (!entry) return null;
  entry.display_name = String(row.display_name || entry.display_name || entry.username || '').trim();
  entry.deleted_at = row.deleted_at ? Number(row.deleted_at) || null : null;
  return entry;
}

async function listMysqlUserIpProfiles(whereSql = '', params = []) {
  await ensureMysqlReady();
  const [rows] = await buildMysqlPool().execute(
    `SELECT
       p.username,
       p.username_key,
       COALESCE(u.display_name, p.username) AS display_name,
       u.deleted_at,
       p.ip_address,
       p.ip_hash,
       p.ip_masked,
       p.first_seen_at,
       p.last_seen_at,
       p.source,
       p.count,
       p.sources_json
     FROM user_ip_profiles p
     LEFT JOIN users u ON u.username_key = p.username_key
     ${whereSql}
     ORDER BY p.last_seen_at DESC, p.username COLLATE utf8mb4_unicode_ci ASC`,
    params,
  );
  return rows.map(mapMysqlUserIpProfileRow).filter(Boolean);
}

async function getActiveUserIpProfiles() {
  const cutoff = getUserIpProfileCutoff();
  if (MYSQL_ENABLED) {
    try {
      await pruneExpiredUserIpProfiles();
      return await listMysqlUserIpProfiles('WHERE p.last_seen_at >= ?', [cutoff]);
    } catch (error) {
      logMysqlFallback('getActiveUserIpProfiles', error);
    }
  }
  return attachLocalUserDisplayNames(loadActiveUserIpProfiles({ prune: true }).profiles);
}

async function getUsersLastIpSummary(usernames = []) {
  const usernameKeys = [...new Set((usernames || []).map(normalizeUsernameKey).filter(Boolean))];
  if (!usernameKeys.length) return {};
  const usernameByKey = new Map();
  for (const username of usernames || []) {
    const usernameKey = normalizeUsernameKey(username);
    if (usernameKey && !usernameByKey.has(usernameKey)) usernameByKey.set(usernameKey, normalizeUsername(username));
  }

  const allProfiles = await getActiveUserIpProfiles();
  const profiles = allProfiles
    .filter(profile => usernameKeys.includes(profile.username_key))
    .sort((a, b) => (b.last_seen_at - a.last_seen_at) || a.username.localeCompare(b.username, 'zh-CN'));
  const sameCounts = buildUserIpSameUserCounts(allProfiles);
  const summaries = {};
  for (const usernameKey of usernameKeys) {
    const latest = profiles.find(profile => profile.username_key === usernameKey);
    const originalUsername = usernameByKey.get(usernameKey);
    if (!latest || !originalUsername) {
      summaries[originalUsername || usernameKey] = null;
      continue;
    }
    summaries[originalUsername] = mapUserIpProfileForResponse(latest, {
      same_user_count: sameCounts.get(latest.ip_hash) || 0,
      display_name: latest.display_name,
    });
  }
  return summaries;
}

async function getUserIpProfile(username) {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;
  const allProfiles = await getActiveUserIpProfiles();
  const sameCounts = buildUserIpSameUserCounts(allProfiles);
  const history = allProfiles
    .filter(profile => profile.username_key === usernameKey)
    .sort((a, b) => (b.last_seen_at - a.last_seen_at) || a.ip_hash.localeCompare(b.ip_hash))
    .map(profile => mapUserIpProfileForResponse(profile, {
      same_user_count: sameCounts.get(profile.ip_hash) || 0,
      display_name: profile.display_name,
    }))
    .filter(Boolean);
  const ipHashes = new Set(history.map(item => item.ip_hash));
  const sameIpUsers = allProfiles
    .filter(profile => ipHashes.has(profile.ip_hash) && profile.username_key !== usernameKey)
    .sort((a, b) => (b.last_seen_at - a.last_seen_at) || a.username.localeCompare(b.username, 'zh-CN'))
    .map(profile => mapUserIpProfileForResponse(profile, {
      same_user_count: sameCounts.get(profile.ip_hash) || 0,
      display_name: profile.display_name,
    }))
    .filter(Boolean);
  return {
    username: normalizeUsername(username),
    latest_ip: history[0] || null,
    history,
    same_ip_users: sameIpUsers,
    retention_days: getUserIpProfileRetentionDays(),
  };
}

async function findUsersByIpAddress(ipAddress) {
  const normalizedIp = normalizeIpAddress(ipAddress);
  const ipHash = hashUserIpAddress(normalizedIp);
  if (!normalizedIp || !ipHash) return null;
  const allProfiles = await getActiveUserIpProfiles();
  const sameCounts = buildUserIpSameUserCounts(allProfiles);
  const users = allProfiles
    .filter(profile => profile.ip_hash === ipHash)
    .sort((a, b) => (b.last_seen_at - a.last_seen_at) || a.username.localeCompare(b.username, 'zh-CN'))
    .map(profile => mapUserIpProfileForResponse(profile, {
      same_user_count: sameCounts.get(profile.ip_hash) || 0,
      display_name: profile.display_name,
    }))
    .filter(Boolean);
  return {
    ip_address: normalizedIp,
    ip_hash: ipHash,
    ip_masked: maskIpAddress(normalizedIp),
    ip_display: normalizedIp,
    users,
    total: users.length,
    retention_days: getUserIpProfileRetentionDays(),
  };
}

async function deleteUserIpProfiles(username) {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return 0;
  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      const [result] = await buildMysqlPool().execute(
        'DELETE FROM user_ip_profiles WHERE username_key = ?',
        [usernameKey],
      );
      return Number(result?.affectedRows) || 0;
    } catch (error) {
      logMysqlFallback('deleteUserIpProfiles', error);
    }
  }
  const store = loadUserIpProfileStore();
  const before = store.profiles.length;
  store.profiles = store.profiles
    .map(normalizeUserIpProfileEntry)
    .filter(entry => entry && entry.username_key !== usernameKey);
  saveUserIpProfileStore(store);
  return Math.max(0, before - store.profiles.length);
}

async function addQuota(username, amount) {
  const delta = Math.round(Number(amount) || 0);
  if (!delta) return false;

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const usernameKey = normalizeUsernameKey(username);
    const [result] = await buildMysqlPool().execute(
      'UPDATE users SET quota = GREATEST(0, quota + ?) WHERE username_key = ? AND deleted_at IS NULL',
      [delta, usernameKey]
    );
    return result.affectedRows > 0;
  }

  const { store, user } = findLocalUser(username);
  if (!user || user.deleted_at) return false;
  user.quota = Math.max(0, (Number(user.quota) || 0) + delta);
  saveStore(store);
  return true;
}

async function consumeQuota(username, amount) {
  const delta = Math.round(Number(amount) || 0);
  if (delta <= 0) return false;

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const usernameKey = normalizeUsernameKey(username);
    const [result] = await buildMysqlPool().execute(
      'UPDATE users SET quota = quota - ? WHERE username_key = ? AND deleted_at IS NULL AND quota >= ?',
      [delta, usernameKey, delta]
    );
    return result.affectedRows > 0;
  }

  const { store, user } = findLocalUser(username);
  if (!user || user.deleted_at) return false;
  const current = Number(user.quota) || 0;
  if (current < delta) return false;
  user.quota = current - delta;
  saveStore(store);
  return true;
}

async function listUsers() {
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [rows] = await buildMysqlPool().execute(
      'SELECT username, display_name, quota FROM users WHERE deleted_at IS NULL ORDER BY username COLLATE utf8mb4_unicode_ci ASC',
      []
    );
    return rows.map(item => ({
      username: item.username,
      display_name: item.display_name || item.username,
      quota: Number(item.quota) || 0,
    }));
  }
  return listLocalUsers().map(item => ({
    username: item.username,
    display_name: item.display_name,
    quota: item.quota,
  }));
}

async function listUsersAdmin(options = {}) {
  const keyword = normalizeUsername(options.keyword || '');
  const status = String(options.status || 'all').trim().toLowerCase();
  const page = Math.max(1, parseInt(options.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.pageSize || '20', 10) || 20));

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const pool = buildMysqlPool();
    const where = [];
    const params = [];

    if (keyword) {
      where.push('(u.username LIKE ? OR u.display_name LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status === 'deleted') {
      where.push('u.deleted_at IS NOT NULL');
    } else {
      where.push('u.deleted_at IS NULL');
    }

    if (status === 'active') {
      where.push("u.deleted_at IS NULL AND COALESCE(m.status, 'active') = 'active'");
    } else if (status === 'banned') {
      where.push("u.deleted_at IS NULL AND COALESCE(m.status, 'active') = 'banned'");
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN user_admin_meta m ON m.username_key = u.username_key
       ${whereSql}`,
      params
    );

    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT
        u.username,
        u.username_key,
        u.display_name,
        u.quota,
        u.created_at,
        u.deleted_at,
        COALESCE(m.status, 'active') AS meta_status,
        m.banned_at
      FROM users u
      LEFT JOIN user_admin_meta m ON m.username_key = u.username_key
      ${whereSql}
      ORDER BY u.created_at DESC, u.username COLLATE utf8mb4_unicode_ci ASC
      LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return {
      total: Number(countRow?.total) || 0,
      page,
      pageSize,
      users: rows.map(row => mapAdminUserRecord(row)).map(user => ({
        username: user.username,
        display_name: user.display_name,
        quota: user.quota,
        created_at: user.created_at,
        status: user.status,
        banned_at: user.banned_at,
        deleted_at: user.deleted_at,
      })),
    };
  }

  const store = loadStore();
  const users = store.users
    .map(item => {
      const usernameKey = item.username_key || normalizeUsernameKey(item.username);
      const meta = getLocalUserMeta(usernameKey);
      const deletedAt = item.deleted_at ? Number(item.deleted_at) || null : null;
      const userStatus = deletedAt ? 'deleted' : meta.status;
      return {
        username: item.username,
        display_name: item.display_name || item.username,
        quota: Number(item.quota) || 0,
        created_at: Number(item.created_at) || 0,
        status: userStatus,
        banned_at: meta.banned_at,
        deleted_at: deletedAt,
      };
    })
    .filter(item => {
      if (keyword && !(`${item.username} ${item.display_name}`.toLocaleLowerCase('zh-CN').includes(keyword.toLocaleLowerCase('zh-CN')))) {
        return false;
      }
      if (status === 'deleted') return item.status === 'deleted';
      if (item.status === 'deleted') return false;
      if (status !== 'all' && item.status !== status) return false;
      return true;
    })
    .sort((a, b) => (b.created_at - a.created_at) || a.username.localeCompare(b.username, 'zh-CN'));

  const offset = (page - 1) * pageSize;
  return {
    total: users.length,
    page,
    pageSize,
    users: users.slice(offset, offset + pageSize),
  };
}

async function getUserAdmin(username) {
  if (MYSQL_ENABLED) {
    const user = await getMysqlAdminUserByKey(username);
    if (!user) return null;
    return {
      username: user.username,
      display_name: user.display_name,
      quota: user.quota,
      created_at: user.created_at,
      status: user.status,
      banned_at: user.banned_at,
      deleted_at: user.deleted_at,
    };
  }

  const { user } = getLocalAdminUserRecord(username);
  if (!user) return null;
  return {
    username: user.username,
    display_name: user.display_name,
    quota: user.quota,
    created_at: user.created_at,
    status: user.status,
    banned_at: user.banned_at,
    deleted_at: user.deleted_at,
  };
}

async function setUserQuota(username, quota) {
  const nextQuota = Math.max(0, Math.round(Number(quota) || 0));

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const usernameKey = normalizeUsernameKey(username);
    const [result] = await buildMysqlPool().execute(
      'UPDATE users SET quota = ? WHERE username_key = ? AND deleted_at IS NULL',
      [nextQuota, usernameKey]
    );
    if (result.affectedRows <= 0) return null;
    return getUserAdmin(username);
  }

  const { store, user } = getLocalAdminUserRecord(username);
  if (!user || user.deleted_at) return null;
  const target = store.users.find(item => (item.username_key || normalizeUsernameKey(item.username)) === user.username_key);
  if (!target) return null;
  target.quota = nextQuota;
  saveStore(store);
  return getUserAdmin(username);
}

async function resetUserPassword(username, password) {
  const pwd = String(password || '');
  if (pwd.length < 6) return { ok: false, msg: '密码至少 6 位' };

  const passwordHash = await bcrypt.hash(pwd, 10);

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const usernameKey = normalizeUsernameKey(username);
    const [result] = await buildMysqlPool().execute(
      'UPDATE users SET password_hash = ? WHERE username_key = ? AND deleted_at IS NULL',
      [passwordHash, usernameKey]
    );
    if (result.affectedRows <= 0) return { ok: false, msg: '用户不存在' };
    return { ok: true };
  }

  const { store, user } = getLocalAdminUserRecord(username);
  if (!user || user.deleted_at) return { ok: false, msg: '用户不存在' };
  const target = store.users.find(item => (item.username_key || normalizeUsernameKey(item.username)) === user.username_key);
  if (!target) return { ok: false, msg: '用户不存在' };
  target.password_hash = passwordHash;
  saveStore(store);
  return { ok: true };
}

async function setUserStatus(username, status) {
  const nextStatus = normalizeAdminStatus(status);
  const now = nowSeconds();

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const usernameKey = normalizeUsernameKey(username);
    const current = await getMysqlAdminUserByKey(username);
    if (!current) return null;

    if (nextStatus === 'deleted') {
      const [result] = await buildMysqlPool().execute(
        'UPDATE users SET deleted_at = ? WHERE username_key = ? AND deleted_at IS NULL',
        [now, usernameKey]
      );
      if (result.affectedRows <= 0 && current.status !== 'deleted') return null;
      await buildMysqlPool().execute(
        `INSERT INTO user_admin_meta (username_key, status, banned_at, updated_at)
         VALUES (?, 'deleted', NULL, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), banned_at = NULL, updated_at = VALUES(updated_at)`,
        [usernameKey, now]
      );
      return getUserAdmin(username);
    }

    if (current.deleted_at) return null;

    await buildMysqlPool().execute(
      `INSERT INTO user_admin_meta (username_key, status, banned_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), banned_at = VALUES(banned_at), updated_at = VALUES(updated_at)`,
      [usernameKey, nextStatus, nextStatus === 'banned' ? now : null, now]
    );
    return getUserAdmin(username);
  }

  const record = getLocalAdminUserRecord(username);
  if (!record.user) return null;

  if (nextStatus === 'deleted') {
    const target = record.store.users.find(item => (item.username_key || normalizeUsernameKey(item.username)) === record.usernameKey);
    if (!target) return null;
    target.deleted_at = now;
    saveStore(record.store);
    setLocalUserMeta(record.usernameKey, { status: 'deleted', banned_at: null });
    return getUserAdmin(username);
  }

  if (record.user.deleted_at) return null;
  setLocalUserMeta(record.usernameKey, { status: nextStatus, banned_at: nextStatus === 'banned' ? now : null });
  return getUserAdmin(username);
}

async function deleteUserPermanently(username) {
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const pool = buildMysqlPool();
    const current = await getMysqlAdminUserByKey(username);
    if (!current) return null;

    await pool.execute('DELETE FROM user_admin_meta WHERE username_key = ?', [usernameKey]);
    const [result] = await pool.execute('DELETE FROM users WHERE username_key = ?', [usernameKey]);
    if (result.affectedRows <= 0) return null;

    await deleteUserIpProfiles(current.username);
    deleteUserSaveData(current.username);
    return current;
  }

  const record = getLocalAdminUserRecord(username);
  if (!record.user) return null;

  const nextUsers = record.store.users.filter(item => (item.username_key || normalizeUsernameKey(item.username)) !== record.usernameKey);
  if (nextUsers.length === record.store.users.length) return null;

  record.store.users = nextUsers;
  saveStore(record.store);
  clearLocalUserMeta(record.usernameKey);
  await deleteUserIpProfiles(record.user.username);
  deleteUserSaveData(record.user.username);
  return record.user;
}

async function recordAdminAuditLog(entry = {}) {
  const now = nowSeconds();
  const detail = normalizeAdminAuditDetailForEntry(
    entry,
    entry.detail !== undefined ? entry.detail : parseAuditDetail(entry.detail_json),
  );
  const normalized = normalizeAuditLogEntry({
    ...entry,
    detail_json: JSON.stringify(detail),
    created_at: Number(entry.created_at) || now,
  });

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    await buildMysqlPool().execute(
      'INSERT INTO admin_audit_logs (operator_role, operator_name, action, target_username, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        normalized.operator_role,
        normalized.operator_name,
        normalized.action,
        normalized.target_username,
        normalized.detail_json,
        normalized.created_at,
      ]
    );
    return normalized;
  }

  const store = loadAdminAuditLogStore();
  store.logs.unshift(normalized);
  saveAdminAuditLogStore(store);
  return normalized;
}

function parseAuditDetail(detailJson) {
  try {
    const detail = JSON.parse(detailJson || '{}');
    return detail && typeof detail === 'object' ? detail : {};
  } catch {
    return {};
  }
}

function auditValueMatchesUsername(value, usernameKey) {
  if (!usernameKey) return true;
  if (typeof value === 'string') return normalizeUsernameKey(value) === usernameKey;
  if (Array.isArray(value)) return value.some(item => auditValueMatchesUsername(item, usernameKey));
  if (value && typeof value === 'object') {
    return [
      value.username,
      value.target_username,
      value.target_id,
      value.source_username,
    ].some(item => auditValueMatchesUsername(item, usernameKey));
  }
  return false;
}

function auditLogMatchesTargetUsername(entry, usernameKey) {
  if (!usernameKey) return true;
  if (normalizeUsernameKey(entry.target_username) === usernameKey) return true;
  const detail = parseAuditDetail(entry.detail_json);
  return [
    detail.target_username,
    detail.target_id,
    detail.username,
    detail.source_username,
    detail.usernames,
    detail.deleted_users,
  ].some(value => auditValueMatchesUsername(value, usernameKey));
}

function normalizeAdminAuditDetailForEntry(entry = {}, detailInput = {}) {
  const detail = detailInput && typeof detailInput === 'object' && !Array.isArray(detailInput)
    ? { ...detailInput }
    : {};
  const action = String(entry.action || detail.action || '');
  const operatorName = String(entry.operator_name || detail.actor_username || detail.operator_name || '');
  const operatorRole = String(entry.operator_role || detail.actor_role || detail.operator_role || '');
  const targetUsername = String(entry.target_username || detail.target_username || '');
  return {
    ...detail,
    request_id: String(detail.request_id || entry.request_id || ''),
    actor_username: String(detail.actor_username || operatorName),
    actor_role: String(detail.actor_role || operatorRole),
    target_username: String(detail.target_username || targetUsername),
    target_type: String(detail.target_type || ''),
    target_id: String(detail.target_id || targetUsername),
    action: String(detail.action || action),
    outcome: String(detail.outcome || entry.outcome || 'completed'),
    reason: String(detail.reason || ''),
    rule_version: String(detail.rule_version || ''),
    ip_hash: String(detail.ip_hash || ''),
    ua_hash: String(detail.ua_hash || ''),
  };
}

function mapAdminAuditLogForResponse(item = {}) {
  const detail = normalizeAdminAuditDetailForEntry(item, parseAuditDetail(item.detail_json));
  return {
    id: String(item.id || ''),
    operator_role: item.operator_role,
    operator_name: item.operator_name,
    action: item.action,
    target_username: item.target_username,
    request_id: detail.request_id,
    created_at: Number(item.created_at) || 0,
    actor_username: detail.actor_username,
    actor_role: detail.actor_role,
    target_type: detail.target_type,
    target_id: detail.target_id,
    outcome: detail.outcome,
    reason: detail.reason,
    rule_version: detail.rule_version,
    ip_hash: detail.ip_hash,
    ua_hash: detail.ua_hash,
    detail,
  };
}

function normalizeAuditFilter(value, maxLength = 120) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').trim().slice(0, maxLength);
}

function parseAuditTimestampFilter(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw > 100000000000 ? raw / 1000 : raw));
  }
  const text = String(raw).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    return Number.isFinite(numeric)
      ? Math.max(0, Math.floor(numeric > 100000000000 ? numeric / 1000 : numeric))
      : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed / 1000)) : null;
}

function getAuditTimestampRange(options = {}) {
  return {
    createdFrom: parseAuditTimestampFilter(options.createdFrom ?? options.created_from ?? options.from),
    createdTo: parseAuditTimestampFilter(options.createdTo ?? options.created_to ?? options.to),
  };
}

function getAdminAuditRetentionPolicy() {
  return {
    retention_days: getAdminAuditRetentionDays(),
    preserves_major_evidence: true,
  };
}

function auditLogMatchesAdminFilters(entry, filters = {}) {
  const detail = parseAuditDetail(entry.detail_json);
  const createdAt = Number(entry.created_at) || 0;
  const action = String(entry.action || '').toLocaleLowerCase('zh-CN');
  const operatorName = String(entry.operator_name || '').toLocaleLowerCase('zh-CN');
  const outcome = String(detail.outcome || '').toLocaleLowerCase('zh-CN');
  const haystack = `${entry.action || ''} ${entry.operator_name || ''} ${entry.target_username || ''} ${entry.detail_json || ''}`.toLocaleLowerCase('zh-CN');

  if (filters.targetUsernameKey && !auditLogMatchesTargetUsername(entry, filters.targetUsernameKey)) return false;
  if (filters.actionFilter && action !== filters.actionFilter) return false;
  if (filters.operatorNameFilter && !operatorName.includes(filters.operatorNameFilter)) return false;
  if (filters.outcomeFilter && outcome !== filters.outcomeFilter) return false;
  if (filters.keywordFilter && !haystack.includes(filters.keywordFilter)) return false;
  if (filters.createdFrom !== null && createdAt < filters.createdFrom) return false;
  if (filters.createdTo !== null && createdAt > filters.createdTo) return false;
  return true;
}

async function listAdminAuditLogs(options = {}) {
  const page = Math.max(1, parseInt(options.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.pageSize || '20', 10) || 20));
  const targetUsername = normalizeAuditFilter(options.targetUsername || options.target_username || options.username, 64);
  const targetUsernameKey = normalizeUsernameKey(targetUsername);
  const actionFilter = normalizeAuditFilter(options.action, 80).toLocaleLowerCase('zh-CN');
  const operatorNameFilter = normalizeAuditFilter(options.operatorName || options.operator_name, 64).toLocaleLowerCase('zh-CN');
  const outcomeFilter = normalizeAuditFilter(options.outcome, 40).toLocaleLowerCase('zh-CN');
  const keywordFilter = normalizeAuditFilter(options.keyword, 120).toLocaleLowerCase('zh-CN');
  const { createdFrom, createdTo } = getAuditTimestampRange(options);

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const where = [];
    const params = [];
    if (targetUsernameKey) {
      where.push(`(
        LOWER(target_username) = ?
        OR detail_json LIKE ?
        OR detail_json LIKE ?
        OR detail_json LIKE ?
        OR detail_json LIKE ?
      )`);
      params.push(
        targetUsernameKey,
        `%"target_username":"${targetUsername}"%`,
        `%"target_id":"${targetUsername}"%`,
        `%"source_username":"${targetUsername}"%`,
        `%"username":"${targetUsername}"%`,
      );
    }
    if (actionFilter) {
      where.push('LOWER(action) = ?');
      params.push(actionFilter);
    }
    if (operatorNameFilter) {
      where.push('LOWER(operator_name) LIKE ?');
      params.push(`%${operatorNameFilter}%`);
    }
    if (outcomeFilter) {
      where.push('(detail_json LIKE ? OR detail_json LIKE ?)');
      params.push(`%"outcome":"${outcomeFilter}"%`, `%"outcome": "${outcomeFilter}"%`);
    }
    if (keywordFilter) {
      where.push('(LOWER(action) LIKE ? OR LOWER(operator_name) LIKE ? OR LOWER(target_username) LIKE ? OR LOWER(detail_json) LIKE ?)');
      params.push(`%${keywordFilter}%`, `%${keywordFilter}%`, `%${keywordFilter}%`, `%${keywordFilter}%`);
    }
    if (createdFrom !== null) {
      where.push('created_at >= ?');
      params.push(createdFrom);
    }
    if (createdTo !== null) {
      where.push('created_at <= ?');
      params.push(createdTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[countRow]] = await buildMysqlPool().execute(`SELECT COUNT(*) AS total FROM admin_audit_logs ${whereSql}`, params);
    const offset = (page - 1) * pageSize;
    const [rows] = await buildMysqlPool().query(
      `SELECT id, operator_role, operator_name, action, target_username, detail_json, created_at
       FROM admin_audit_logs
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    return {
      total: Number(countRow?.total) || 0,
      page,
      pageSize,
      logs: rows.map(mapAdminAuditLogForResponse),
    };
  }

  const store = loadAdminAuditLogStore();
  const filteredLogs = store.logs.filter(item => auditLogMatchesAdminFilters(item, {
    targetUsernameKey,
    actionFilter,
    operatorNameFilter,
    outcomeFilter,
    keywordFilter,
    createdFrom,
    createdTo,
  }));
  const offset = (page - 1) * pageSize;
  return {
    total: filteredLogs.length,
    page,
    pageSize,
    logs: filteredLogs.slice(offset, offset + pageSize).map(mapAdminAuditLogForResponse),
  };
}

function isMajorAdminAuditLog(entry = {}) {
  const action = String(entry.action || '');
  if (MAJOR_ADMIN_AUDIT_ACTIONS.has(action)) return true;
  try {
    const detail = JSON.parse(entry.detail_json || '{}');
    return detail?.evidence_retention === 'major' || detail?.major_evidence === true;
  } catch {
    return false;
  }
}

async function pruneAdminAuditLogs(options = {}) {
  const retentionDays = Math.max(
    DEFAULT_ADMIN_AUDIT_RETENTION_DAYS,
    normalizePositiveInt(options.retentionDays, getAdminAuditRetentionDays()),
  );
  const cutoff = nowSeconds() - retentionDays * 86400;

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const preservedActions = [...MAJOR_ADMIN_AUDIT_ACTIONS];
    const placeholders = preservedActions.map(() => '?').join(',');
    const [result] = await buildMysqlPool().execute(
      `DELETE FROM admin_audit_logs
       WHERE created_at < ?
         AND action NOT IN (${placeholders})
         AND (detail_json IS NULL OR (detail_json NOT LIKE '%"evidence_retention":"major"%' AND detail_json NOT LIKE '%"major_evidence":true%'))`,
      [cutoff, ...preservedActions],
    );
    return {
      removed: Number(result?.affectedRows) || 0,
      retention_days: retentionDays,
    };
  }

  const store = loadAdminAuditLogStore();
  const before = store.logs.length;
  store.logs = store.logs
    .map(normalizeAuditLogEntry)
    .filter(entry => (entry.created_at || 0) >= cutoff || isMajorAdminAuditLog(entry));
  saveAdminAuditLogStore(store);
  return {
    removed: Math.max(0, before - store.logs.length),
    retention_days: retentionDays,
  };
}

async function recordContentRevision(entry = {}) {
  const now = nowSeconds();
  const normalized = normalizeContentRevisionEntry({
    ...entry,
    payload_json: JSON.stringify(entry.payload || entry.payload_json || {}),
    created_at: now,
  });

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    await buildMysqlPool().execute(
      `INSERT INTO admin_content_revisions
       (content_key, title, summary, action, published, operator_role, operator_name, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalized.content_key,
        normalized.title,
        normalized.summary,
        normalized.action,
        normalized.published ? 1 : 0,
        normalized.operator_role,
        normalized.operator_name,
        normalized.payload_json,
        normalized.created_at,
      ]
    );
    return normalized;
  }

  const store = loadContentRevisionStore();
  store.revisions.unshift(normalized);
  saveContentRevisionStore(store);
  return normalized;
}

async function listContentRevisions(options = {}) {
  const page = Math.max(1, parseInt(options.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.pageSize || '20', 10) || 20));
  const contentKey = String(options.contentKey || '').trim();
  const actionFilter = normalizeAuditFilter(options.action, 80).toLocaleLowerCase('zh-CN');
  const operatorNameFilter = normalizeAuditFilter(options.operatorName || options.operator_name || options.username, 64).toLocaleLowerCase('zh-CN');
  const keywordFilter = normalizeAuditFilter(options.keyword, 120).toLocaleLowerCase('zh-CN');
  const { createdFrom, createdTo } = getAuditTimestampRange(options);

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const params = [];
    const where = [];
    if (contentKey) {
      where.push('content_key = ?');
      params.push(contentKey);
    }
    if (actionFilter) {
      where.push('LOWER(action) = ?');
      params.push(actionFilter);
    }
    if (operatorNameFilter) {
      where.push('LOWER(operator_name) LIKE ?');
      params.push(`%${operatorNameFilter}%`);
    }
    if (keywordFilter) {
      where.push('(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(content_key) LIKE ? OR LOWER(action) LIKE ?)');
      params.push(`%${keywordFilter}%`, `%${keywordFilter}%`, `%${keywordFilter}%`, `%${keywordFilter}%`);
    }
    if (createdFrom !== null) {
      where.push('created_at >= ?');
      params.push(createdFrom);
    }
    if (createdTo !== null) {
      where.push('created_at <= ?');
      params.push(createdTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[countRow]] = await buildMysqlPool().execute(
      `SELECT COUNT(*) AS total FROM admin_content_revisions ${whereSql}`,
      params
    );
    const offset = (page - 1) * pageSize;
    const [rows] = await buildMysqlPool().query(
      `SELECT id, content_key, title, summary, action, published, operator_role, operator_name, payload_json, created_at
       FROM admin_content_revisions
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    return {
      total: Number(countRow?.total) || 0,
      page,
      pageSize,
      revisions: rows.map(item => ({
        id: String(item.id),
        content_key: item.content_key,
        title: item.title,
        summary: item.summary,
        action: item.action,
        published: item.published === 1,
        operator_role: item.operator_role,
        operator_name: item.operator_name,
        payload: (() => {
          try {
            return JSON.parse(item.payload_json || '{}');
          } catch {
            return {};
          }
        })(),
        created_at: Number(item.created_at) || 0,
      })),
    };
  }

  const store = loadContentRevisionStore();
  const filtered = store.revisions.filter(item => {
    const haystack = `${item.title || ''} ${item.summary || ''} ${item.content_key || ''} ${item.action || ''}`.toLocaleLowerCase('zh-CN');
    const createdAt = Number(item.created_at) || 0;
    if (contentKey && item.content_key !== contentKey) return false;
    if (actionFilter && String(item.action || '').toLocaleLowerCase('zh-CN') !== actionFilter) return false;
    if (operatorNameFilter && !String(item.operator_name || '').toLocaleLowerCase('zh-CN').includes(operatorNameFilter)) return false;
    if (keywordFilter && !haystack.includes(keywordFilter)) return false;
    if (createdFrom !== null && createdAt < createdFrom) return false;
    if (createdTo !== null && createdAt > createdTo) return false;
    return true;
  });
  const offset = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    revisions: filtered.slice(offset, offset + pageSize).map(item => ({
      ...item,
      payload: (() => {
        try {
          return JSON.parse(item.payload_json || '{}');
        } catch {
          return {};
        }
      })(),
    })),
  };
}

async function getContentRevision(id) {
  const revisionId = String(id || '').trim();
  if (!revisionId) return null;

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const numericId = parseInt(revisionId, 10);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;
    const [rows] = await buildMysqlPool().execute(
      `SELECT id, content_key, title, summary, action, published, operator_role, operator_name, payload_json, created_at
       FROM admin_content_revisions WHERE id = ? LIMIT 1`,
      [numericId]
    );
    const item = rows[0];
    if (!item) return null;
    return {
      id: String(item.id),
      content_key: item.content_key,
      title: item.title,
      summary: item.summary,
      action: item.action,
      published: item.published === 1,
      operator_role: item.operator_role,
      operator_name: item.operator_name,
      payload: (() => {
        try {
          return JSON.parse(item.payload_json || '{}');
        } catch {
          return {};
        }
      })(),
      created_at: Number(item.created_at) || 0,
    };
  }

  const store = loadContentRevisionStore();
  const item = store.revisions.find(entry => entry.id === revisionId);
  if (!item) return null;
  return {
    ...item,
    payload: (() => {
      try {
        return JSON.parse(item.payload_json || '{}');
      } catch {
        return {};
      }
    })(),
  };
}

async function pruneGameplayEventLogs() {
  const cutoff = nowSeconds() - GAMEPLAY_EVENT_LOG_RETENTION_DAYS * 86400;
  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      await buildMysqlPool().execute('DELETE FROM gameplay_event_logs WHERE created_at < ?', [cutoff]);
      const [[countRow]] = await buildMysqlPool().execute('SELECT COUNT(*) AS total FROM gameplay_event_logs', []);
      const overflow = (Number(countRow?.total) || 0) - GAMEPLAY_EVENT_LOG_MAX_TOTAL;
      if (overflow > 0) {
        await buildMysqlPool().execute(
          `DELETE FROM gameplay_event_logs
           WHERE id NOT IN (
             SELECT id FROM (
               SELECT id FROM gameplay_event_logs
               ORDER BY created_at DESC, id DESC
               LIMIT ${GAMEPLAY_EVENT_LOG_MAX_TOTAL}
             ) retained_gameplay_logs
           )`,
          []
        );
      }
      const saveSlotExpr = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(meta_json), meta_json, '{}'), '$.save_slot')), 'none')";
      const [overflowGroups] = await buildMysqlPool().query(
        `SELECT username, ${saveSlotExpr} AS save_slot_key, COUNT(*) AS total
         FROM gameplay_event_logs
         GROUP BY username, save_slot_key
         HAVING total > ?`,
        [GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT],
      );
      for (const group of overflowGroups) {
        const groupOverflow = (Number(group.total) || 0) - GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT;
        if (groupOverflow <= 0) continue;
        await buildMysqlPool().query(
          `DELETE FROM gameplay_event_logs
           WHERE username = ?
             AND ${saveSlotExpr} = ?
           ORDER BY created_at ASC, id ASC
           LIMIT ${groupOverflow}`,
          [group.username, group.save_slot_key || 'none'],
        );
      }
      return;
    } catch (error) {
      logMysqlFallback('pruneGameplayEventLogs', error);
    }
  }

  const store = loadGameplayEventLogStore();
  store.logs = pruneGameplayEventLogEntries(store.logs);
  saveGameplayEventLogStore(store);
}

async function recordGameplayEventLogsBatch(entries = []) {
  const now = nowSeconds();
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map(entry => normalizeGameplayEventLogEntry({
      ...entry,
      tags_json: JSON.stringify(Array.isArray(entry.tags) ? entry.tags : entry.tags_json || []),
      meta_json: JSON.stringify(entry.meta || entry.meta_json || {}),
      created_at: Number(entry.created_at) || now,
    }))
    .filter(entry => entry.message);

  if (normalizedEntries.length === 0) return [];

  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      const placeholders = normalizedEntries.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params = normalizedEntries.flatMap(entry => [
        entry.username,
        entry.day_label,
        entry.category,
        entry.message,
        entry.route_name,
        entry.tags_json,
        entry.meta_json,
        entry.created_at,
      ]);
      await buildMysqlPool().execute(
        `INSERT INTO gameplay_event_logs
         (username, day_label, category, message, route_name, tags_json, meta_json, created_at)
         VALUES ${placeholders}`,
        params
      );
      await pruneGameplayEventLogs();
      return normalizedEntries;
    } catch (error) {
      logMysqlFallback('recordGameplayEventLogsBatch', error);
    }
  }

  const store = loadGameplayEventLogStore();
  store.logs.unshift(...normalizedEntries.slice().reverse());
  store.logs = pruneGameplayEventLogEntries(store.logs, now);
  saveGameplayEventLogStore(store);
  return normalizedEntries;
}

async function recordGameplayEventLog(entry = {}) {
  const [recorded] = await recordGameplayEventLogsBatch([entry]);
  return recorded || null;
}

async function listGameplayEventLogs(options = {}) {
  const page = Math.max(1, parseInt(options.page || '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(options.pageSize || '50', 10) || 50));
  const username = normalizeUsername(options.username || '');
  const category = String(options.category || '').trim();
  const keyword = String(options.keyword || '').trim();
  const actionFilter = String(options.action || '').trim();
  const outcomeFilter = String(options.outcome || '').trim();
  const { createdFrom, createdTo } = getAuditTimestampRange(options);
  const saveSlot = Number.isInteger(Number(options.saveSlot)) && Number(options.saveSlot) >= 0
    ? Number(options.saveSlot)
    : null;

  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      const params = [];
      const where = [];
      if (username) {
        where.push('username = ?');
        params.push(username);
      }
      if (category) {
        where.push('category = ?');
        params.push(category);
      }
      if (keyword) {
        where.push('(message LIKE ? OR meta_json LIKE ? OR day_label LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      if (actionFilter) {
        where.push('JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(meta_json), meta_json, \'{}\'), \'$.action\')) = ?');
        params.push(actionFilter);
      }
      if (outcomeFilter) {
        where.push('JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(meta_json), meta_json, \'{}\'), \'$.outcome\')) = ?');
        params.push(outcomeFilter);
      }
      if (saveSlot !== null) {
        where.push('meta_json LIKE ?');
        params.push(`%"save_slot":${saveSlot}%`);
      }
      if (createdFrom !== null) {
        where.push('created_at >= ?');
        params.push(createdFrom);
      }
      if (createdTo !== null) {
        where.push('created_at <= ?');
        params.push(createdTo);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [[countRow]] = await buildMysqlPool().execute(
        `SELECT COUNT(*) AS total FROM gameplay_event_logs ${whereSql}`,
        params
      );
      const offset = (page - 1) * pageSize;
      const [rows] = await buildMysqlPool().query(
        `SELECT id, username, day_label, category, message, route_name, tags_json, meta_json, created_at
         FROM gameplay_event_logs
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        params
      );
      return {
        total: Number(countRow?.total) || 0,
        page,
        pageSize,
        logs: rows.map(mapGameplayEventLogForResponse),
        retention: getGameplayEventLogRetentionPolicy(),
      };
    } catch (error) {
      logMysqlFallback('listGameplayEventLogs', error);
    }
  }

  const store = loadGameplayEventLogStore();
  const filtered = store.logs.filter(item => {
    if (username && item.username !== username) return false;
    if (category && item.category !== category) return false;
    if (createdFrom !== null && (Number(item.created_at) || 0) < createdFrom) return false;
    if (createdTo !== null && (Number(item.created_at) || 0) > createdTo) return false;
    if (saveSlot !== null) {
      try {
        const meta = JSON.parse(item.meta_json || '{}');
        if (Number(meta?.save_slot) !== saveSlot) return false;
      } catch {
        return false;
      }
    }
    if (actionFilter || outcomeFilter) {
      try {
        const meta = JSON.parse(item.meta_json || '{}');
        if (actionFilter && String(meta?.action || '') !== actionFilter) return false;
        if (outcomeFilter && String(meta?.outcome || '') !== outcomeFilter) return false;
      } catch {
        return false;
      }
    }
    if (keyword) {
      const haystack = `${item.message} ${item.meta_json || ''} ${item.day_label || ''}`.toLocaleLowerCase('zh-CN');
      if (!haystack.includes(keyword.toLocaleLowerCase('zh-CN'))) return false;
    }
    return true;
  });
  const offset = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    logs: filtered.slice(offset, offset + pageSize).map(mapGameplayEventLogForResponse),
    retention: getGameplayEventLogRetentionPolicy(),
  };
}

async function getGameplayEventLogOverview() {
  if (MYSQL_ENABLED) {
    try {
      await ensureMysqlReady();
      const [[row]] = await buildMysqlPool().execute(
        'SELECT COUNT(*) AS total, MAX(created_at) AS latest_created_at FROM gameplay_event_logs',
        []
      );
      return {
        total: Number(row?.total) || 0,
        latest_created_at: Number(row?.latest_created_at) || 0,
        retention: getGameplayEventLogRetentionPolicy(),
      };
    } catch (error) {
      logMysqlFallback('getGameplayEventLogOverview', error);
    }
  }

  const store = loadGameplayEventLogStore();
  return {
    total: store.logs.length,
    latest_created_at: store.logs.reduce((latest, item) => Math.max(latest, Number(item.created_at) || 0), 0),
    retention: getGameplayEventLogRetentionPolicy(),
  };
}

module.exports = {
  getPool,
  registerUser,
  verifyUser,
  getUser,
  getQuota,
  addQuota,
  consumeQuota,
  listUsers,
  listUsersAdmin,
  getUserAdmin,
  setUserQuota,
  resetUserPassword,
  setUserStatus,
  deleteUserPermanently,
  recordAdminAuditLog,
  listAdminAuditLogs,
  pruneAdminAuditLogs,
  getAdminAuditRetentionPolicy,
  recordUserIpProfile,
  getUsersLastIpSummary,
  getUserIpProfile,
  findUsersByIpAddress,
  hashUserIpAddress,
  normalizeIpAddress,
  maskIpAddress,
  pruneExpiredUserIpProfiles,
  getUserIpProfileRetentionDays,
  recordContentRevision,
  listContentRevisions,
  getContentRevision,
  recordGameplayEventLog,
  recordGameplayEventLogsBatch,
  listGameplayEventLogs,
  pruneGameplayEventLogs,
  getGameplayEventLogOverview,
  getGameplayEventLogRetentionPolicy,
  getUserAccessState,
  EXCHANGE_RATE,
  MYSQL_ENABLED,
  ensureMysqlReady,
};
