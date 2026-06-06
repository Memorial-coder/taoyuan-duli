/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
const fs = require('fs');
const path = require('path');
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
const EXCHANGE_RATE = parseInt(process.env.EXCHANGE_RATE || '500000', 10);
const DEFAULT_USER_QUOTA = parseInt(process.env.DEFAULT_USER_QUOTA || '2000000', 10);
const QA_ONLINE_SMOKE_FORCE_LOCAL = String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim().toLowerCase() === 'true';
const GAMEPLAY_EVENT_LOG_MAX_TOTAL = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_MAX_TOTAL || '5000', 10) || 5000);
const GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT || '1200', 10) || 1200);
const GAMEPLAY_EVENT_LOG_RETENTION_DAYS = Math.max(1, parseInt(process.env.GAMEPLAY_EVENT_LOG_RETENTION_DAYS || '30', 10) || 30);
const DEFAULT_ADMIN_AUDIT_RETENTION_DAYS = 180;
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

function loadStore() {
  const raw = readJsonStoreStrict(USERS_FILE);
  if (raw === null) return { users: [] };
  if (!Array.isArray(raw?.users)) throw createStoreCorruptionError(USERS_FILE);
  return raw;
}

function saveStore(store) {
  writeJsonFileAtomic(USERS_FILE, store);
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
    const ok = await bcrypt.compare(String(password || ''), String(user.password_hash || ''));
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
  const ok = await bcrypt.compare(String(password || ''), String(user.password_hash || ''));
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

function auditLogMatchesAdminFilters(entry, filters = {}) {
  const detail = parseAuditDetail(entry.detail_json);
  const createdAt = Number(entry.created_at) || 0;
  const action = String(entry.action || '').toLocaleLowerCase('zh-CN');
  const operatorName = String(entry.operator_name || '').toLocaleLowerCase('zh-CN');
  const outcome = String(detail.outcome || '').toLocaleLowerCase('zh-CN');

  if (filters.targetUsernameKey && !auditLogMatchesTargetUsername(entry, filters.targetUsernameKey)) return false;
  if (filters.actionFilter && action !== filters.actionFilter) return false;
  if (filters.operatorNameFilter && !operatorName.includes(filters.operatorNameFilter)) return false;
  if (filters.outcomeFilter && outcome !== filters.outcomeFilter) return false;
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

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const params = [];
    const where = [];
    if (contentKey) {
      where.push('content_key = ?');
      params.push(contentKey);
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
  const filtered = store.revisions.filter(item => !contentKey || item.content_key === contentKey);
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
      if (saveSlot !== null) {
        where.push('meta_json LIKE ?');
        params.push(`%"save_slot":${saveSlot}%`);
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
        logs: rows.map(item => ({
          id: String(item.id),
          username: item.username,
          day_label: item.day_label,
          category: item.category,
          message: item.message,
          route_name: item.route_name,
          tags: (() => {
            try {
              return JSON.parse(item.tags_json || '[]');
            } catch {
              return [];
            }
          })(),
          meta: (() => {
            try {
              return JSON.parse(item.meta_json || '{}');
            } catch {
              return {};
            }
          })(),
          save_slot: (() => {
            try {
              const meta = JSON.parse(item.meta_json || '{}');
              return Number.isInteger(Number(meta?.save_slot)) ? Number(meta.save_slot) : null;
            } catch {
              return null;
            }
          })(),
          created_at: Number(item.created_at) || 0,
        })),
      };
    } catch (error) {
      logMysqlFallback('listGameplayEventLogs', error);
    }
  }

  const store = loadGameplayEventLogStore();
  const filtered = store.logs.filter(item => {
    if (username && item.username !== username) return false;
    if (category && item.category !== category) return false;
    if (saveSlot !== null) {
      try {
        const meta = JSON.parse(item.meta_json || '{}');
        if (Number(meta?.save_slot) !== saveSlot) return false;
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
    logs: filtered.slice(offset, offset + pageSize).map(item => ({
      ...item,
      tags: (() => {
        try {
          return JSON.parse(item.tags_json || '[]');
        } catch {
          return [];
        }
      })(),
      meta: (() => {
        try {
          return JSON.parse(item.meta_json || '{}');
        } catch {
          return {};
        }
      })(),
      save_slot: (() => {
        try {
          const meta = JSON.parse(item.meta_json || '{}');
          return Number.isInteger(Number(meta?.save_slot)) ? Number(meta.save_slot) : null;
        } catch {
          return null;
        }
      })(),
    })),
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
  recordContentRevision,
  listContentRevisions,
  getContentRevision,
  recordGameplayEventLog,
  recordGameplayEventLogsBatch,
  listGameplayEventLogs,
  pruneGameplayEventLogs,
  getUserAccessState,
  EXCHANGE_RATE,
  MYSQL_ENABLED,
  ensureMysqlReady,
};
