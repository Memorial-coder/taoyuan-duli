const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const ONLINE_AUDIT_FILE = path.join(DATA_DIR, 'taoyuan_online_audits.json');
const ONLINE_AUDIT_LOG_LIMIT = 5000;

let onlineAuditLock = Promise.resolve();

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createStoreCorruptionError(filePath) {
  const error = new Error(`${path.basename(filePath)} 已损坏，拒绝继续写入在线审计日志`);
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

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sanitizeText(value, maxLength = 120) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizePositiveInt(value, fallback) {
  const normalized = parseInt(value, 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function normalizeDetail(detail) {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return {};
  return JSON.parse(JSON.stringify(detail));
}

function normalizeAuditEntry(entry = {}) {
  return {
    id: sanitizeText(entry.id || `online_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 80),
    username: sanitizeText(entry.username, 40),
    display_name: sanitizeText(entry.display_name, 60),
    target_username: sanitizeText(entry.target_username, 40),
    action: sanitizeText(entry.action, 80),
    route_key: sanitizeText(entry.route_key, 80),
    scope: sanitizeText(entry.scope, 60),
    method: sanitizeText(String(entry.method || 'POST').toUpperCase(), 12),
    path: sanitizeText(entry.path, 200),
    request_id: sanitizeText(entry.request_id, 80),
    outcome: sanitizeText(entry.outcome || 'completed', 40),
    status_code: Math.max(0, parseInt(entry.status_code, 10) || 0),
    created_at: Math.max(0, parseInt(entry.created_at, 10) || nowSeconds()),
    detail: normalizeDetail(entry.detail),
  };
}

function loadOnlineAuditStore() {
  const raw = readJsonStoreStrict(ONLINE_AUDIT_FILE);
  if (raw === null) return { logs: [] };
  if (!Array.isArray(raw?.logs)) throw createStoreCorruptionError(ONLINE_AUDIT_FILE);
  return { logs: raw.logs.map(normalizeAuditEntry) };
}

function saveOnlineAuditStore(store) {
  writeJsonFileAtomic(ONLINE_AUDIT_FILE, {
    logs: Array.isArray(store?.logs) ? store.logs.slice(0, ONLINE_AUDIT_LOG_LIMIT) : [],
  });
}

async function withOnlineAuditLock(fn) {
  let release;
  const previous = onlineAuditLock;
  onlineAuditLock = new Promise(resolve => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function recordOnlineAudit(entry = {}) {
  return withOnlineAuditLock(async () => {
    const store = loadOnlineAuditStore();
    const normalized = normalizeAuditEntry({
      ...entry,
      created_at: entry.created_at || nowSeconds(),
    });
    store.logs.unshift(normalized);
    if (store.logs.length > ONLINE_AUDIT_LOG_LIMIT) {
      store.logs = store.logs.slice(0, ONLINE_AUDIT_LOG_LIMIT);
    }
    saveOnlineAuditStore(store);
    return normalized;
  });
}

async function listOnlineAudits(options = {}) {
  return withOnlineAuditLock(async () => {
    const page = normalizePositiveInt(options.page, 1);
    const pageSize = Math.min(100, normalizePositiveInt(options.pageSize, 20));
    const usernameFilter = sanitizeText(options.username, 40).toLocaleLowerCase('zh-CN');
    const routeKeyFilter = sanitizeText(options.routeKey, 80).toLocaleLowerCase('zh-CN');
    const actionFilter = sanitizeText(options.action, 80).toLocaleLowerCase('zh-CN');
    const outcomeFilter = sanitizeText(options.outcome, 40).toLocaleLowerCase('zh-CN');

    const store = loadOnlineAuditStore();
    const filtered = store.logs.filter(entry => {
      const username = String(entry.username || '').toLocaleLowerCase('zh-CN');
      const routeKey = String(entry.route_key || '').toLocaleLowerCase('zh-CN');
      const action = String(entry.action || '').toLocaleLowerCase('zh-CN');
      const outcome = String(entry.outcome || '').toLocaleLowerCase('zh-CN');
      if (usernameFilter && !username.includes(usernameFilter)) return false;
      if (routeKeyFilter && !routeKey.includes(routeKeyFilter)) return false;
      if (actionFilter && !action.includes(actionFilter)) return false;
      if (outcomeFilter && outcome !== outcomeFilter) return false;
      return true;
    });

    const offset = (page - 1) * pageSize;
    return {
      total: filtered.length,
      page,
      pageSize,
      logs: filtered.slice(offset, offset + pageSize),
    };
  });
}

module.exports = {
  recordOnlineAudit,
  listOnlineAudits,
};
