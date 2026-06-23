const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const ONLINE_AUDIT_FILE = path.join(DATA_DIR, 'taoyuan_online_audits.json');
const DEFAULT_ONLINE_AUDIT_RETENTION_DAYS = 180;

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

function getConfigValue(key) {
  try {
    return require('./config').get(key);
  } catch {
    return undefined;
  }
}

function getOnlineAuditRetentionDays() {
  return Math.max(
    DEFAULT_ONLINE_AUDIT_RETENTION_DAYS,
    normalizePositiveInt(
      process.env.ONLINE_AUDIT_RETENTION_DAYS || getConfigValue('online_audit_retention_days'),
      DEFAULT_ONLINE_AUDIT_RETENTION_DAYS,
    ),
  );
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

function isMajorEvidenceLog(entry = {}) {
  const action = String(entry.action || '').toLocaleLowerCase('zh-CN');
  const outcome = String(entry.outcome || '').toLocaleLowerCase('zh-CN');
  const detail = entry.detail && typeof entry.detail === 'object' ? entry.detail : {};
  if (detail.evidence_retention === 'major' || detail.major_evidence === true) return true;
  if (outcome === 'major_evidence') return true;
  return action.includes('ban') || action.includes('blacklist') || action.includes('appeal_restore');
}

function pruneOnlineAuditLogs(logs = [], options = {}) {
  const retentionDays = Math.max(
    DEFAULT_ONLINE_AUDIT_RETENTION_DAYS,
    normalizePositiveInt(options.retentionDays, getOnlineAuditRetentionDays()),
  );
  const cutoffSeconds = nowSeconds() - retentionDays * 86400;
  return logs.map(normalizeAuditEntry).filter(entry => {
    if ((entry.created_at || 0) >= cutoffSeconds) return true;
    return isMajorEvidenceLog(entry);
  });
}

function saveOnlineAuditStore(store, options = {}) {
  const logs = Array.isArray(store?.logs) ? store.logs.map(normalizeAuditEntry) : [];
  writeJsonFileAtomic(ONLINE_AUDIT_FILE, {
    logs: options.prune === true ? pruneOnlineAuditLogs(logs, options) : logs,
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
    const { createdFrom, createdTo } = getAuditTimestampRange(options);

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
      if (createdFrom !== null && (Number(entry.created_at) || 0) < createdFrom) return false;
      if (createdTo !== null && (Number(entry.created_at) || 0) > createdTo) return false;
      return true;
    });

    const offset = (page - 1) * pageSize;
    return {
      total: filtered.length,
      page,
      pageSize,
      logs: filtered.slice(offset, offset + pageSize),
      retention_days: getOnlineAuditRetentionDays(),
    };
  });
}

async function pruneOnlineAudits(options = {}) {
  return withOnlineAuditLock(async () => {
    const store = loadOnlineAuditStore();
    const before = store.logs.length;
    store.logs = pruneOnlineAuditLogs(store.logs, options);
    saveOnlineAuditStore(store);
    return {
      before,
      after: store.logs.length,
      removed: Math.max(0, before - store.logs.length),
      retention_days: Math.max(
        DEFAULT_ONLINE_AUDIT_RETENTION_DAYS,
        normalizePositiveInt(options.retentionDays, getOnlineAuditRetentionDays()),
      ),
    };
  });
}

async function getOnlineAuditOverview() {
  return withOnlineAuditLock(async () => {
    const store = loadOnlineAuditStore();
    return {
      total: store.logs.length,
      latest_created_at: store.logs.reduce((latest, entry) => Math.max(latest, Number(entry.created_at) || 0), 0),
      retention_days: getOnlineAuditRetentionDays(),
      preserves_major_evidence: true,
    };
  });
}

module.exports = {
  recordOnlineAudit,
  listOnlineAudits,
  pruneOnlineAudits,
  getOnlineAuditOverview,
  getOnlineAuditRetentionDays,
};
