const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_META_FILE = path.join(DATA_DIR, 'user_admin_meta.json');
const ADMIN_AUDIT_LOG_FILE = path.join(DATA_DIR, 'admin_audit_logs.json');
const EXCHANGE_RATE = parseInt(process.env.EXCHANGE_RATE || '500000', 10);
const DEFAULT_USER_QUOTA = parseInt(process.env.DEFAULT_USER_QUOTA || '2000000', 10);

const MYSQL_ENABLED = Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);

let mysqlPool = null;
let mysqlReadyPromise = null;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore() {
  ensureDir();
  try {
    if (!fs.existsSync(USERS_FILE)) return { users: [] };
    const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(raw?.users) ? raw : { users: [] };
  } catch {
    return { users: [] };
  }
}

function saveStore(store) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), 'utf8');
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

function normalizeAdminStatus(status) {
  const normalized = String(status || 'active').trim().toLowerCase();
  return ['active', 'banned', 'deleted'].includes(normalized) ? normalized : 'active';
}

function loadUserMetaStore() {
  ensureDir();
  try {
    if (!fs.existsSync(USER_META_FILE)) return { users: {} };
    const raw = JSON.parse(fs.readFileSync(USER_META_FILE, 'utf8'));
    return raw && raw.users && typeof raw.users === 'object' ? raw : { users: {} };
  } catch {
    return { users: {} };
  }
}

function saveUserMetaStore(store) {
  ensureDir();
  fs.writeFileSync(USER_META_FILE, JSON.stringify({ users: store?.users || {} }, null, 2), 'utf8');
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
  return {
    async execute(sql, params = []) {
      await ensureMysqlReady();
      return buildMysqlPool().execute(sql, params);
    },
  };
}

async function registerUser(username, password, displayName) {
  const normalized = normalizeUsername(username);
  const usernameKey = normalizeUsernameKey(username);
  const usernameError = validateUsername(username);
  const pwd = String(password || '');

  if (usernameError) return { ok: false, msg: usernameError };
  if (pwd.length < 6) return { ok: false, msg: '密码至少 6 位' };

  const passwordHash = await bcrypt.hash(pwd, 10);
  const createdAt = Math.floor(Date.now() / 1000);
  const finalDisplayName = sanitizeDisplayName(displayName, normalized);

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
      [normalized, usernameKey, finalDisplayName, passwordHash, DEFAULT_USER_QUOTA, createdAt]
    );

    return {
      ok: true,
      user: {
        username: normalized,
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
    username: normalized,
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
    const user = await getMysqlAdminUserByKey(username);
    return user ? user.status : null;
  }
  const { user } = getLocalAdminUserRecord(username);
  return user ? user.status : null;
}

async function getUser(username) {
  if (MYSQL_ENABLED) {
    const user = await getMysqlUserByKey(username);
    if (!user || user.deleted_at) return null;
    return {
      username: user.username,
      display_name: user.display_name || user.username,
      quota: Number(user.quota) || 0,
      dollars: parseFloat(((Number(user.quota) || 0) / EXCHANGE_RATE).toFixed(4)),
    };
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

    if (status === 'active') {
      where.push("u.deleted_at IS NULL AND COALESCE(m.status, 'active') = 'active'");
    } else if (status === 'banned') {
      where.push("u.deleted_at IS NULL AND COALESCE(m.status, 'active') = 'banned'");
    } else if (status === 'deleted') {
      where.push('u.deleted_at IS NOT NULL');
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

async function recordAdminAuditLog(entry = {}) {
  const now = nowSeconds();
  const normalized = normalizeAuditLogEntry({
    ...entry,
    detail_json: JSON.stringify(entry.detail || entry.detail_json || {}),
    created_at: now,
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
  store.logs = store.logs.slice(0, 2000);
  saveAdminAuditLogStore(store);
  return normalized;
}

async function listAdminAuditLogs(options = {}) {
  const page = Math.max(1, parseInt(options.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(options.pageSize || '20', 10) || 20));

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [[countRow]] = await buildMysqlPool().execute('SELECT COUNT(*) AS total FROM admin_audit_logs', []);
    const offset = (page - 1) * pageSize;
    const [rows] = await buildMysqlPool().query(
      `SELECT id, operator_role, operator_name, action, target_username, detail_json, created_at
       FROM admin_audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      []
    );
    return {
      total: Number(countRow?.total) || 0,
      page,
      pageSize,
      logs: rows.map(item => ({
        id: String(item.id),
        operator_role: item.operator_role,
        operator_name: item.operator_name,
        action: item.action,
        target_username: item.target_username,
        detail: (() => {
          try {
            return JSON.parse(item.detail_json || '{}');
          } catch {
            return {};
          }
        })(),
        created_at: Number(item.created_at) || 0,
      })),
    };
  }

  const store = loadAdminAuditLogStore();
  const offset = (page - 1) * pageSize;
  return {
    total: store.logs.length,
    page,
    pageSize,
    logs: store.logs.slice(offset, offset + pageSize).map(item => ({
      ...item,
      detail: (() => {
        try {
          return JSON.parse(item.detail_json || '{}');
        } catch {
          return {};
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
  recordAdminAuditLog,
  listAdminAuditLogs,
  getUserAccessState,
  EXCHANGE_RATE,
  MYSQL_ENABLED,
  ensureMysqlReady,
};