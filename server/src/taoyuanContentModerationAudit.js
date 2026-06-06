const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const STORE_FILE = path.join(DATA_DIR, 'taoyuan_content_moderation_events.json');
const RISK_QUEUE_FILE = path.join(DATA_DIR, 'taoyuan_content_risk_queue.json');
const DEFAULT_RETENTION_DAYS = 365;
const REPEAT_HARD_BLOCK_WINDOW_SECONDS = 10 * 60;
const REPEAT_HARD_BLOCK_THRESHOLD = 3;
const IP_HASH_MULTI_ACCOUNT_WINDOW_SECONDS = 10 * 60;
const IP_HASH_MULTI_ACCOUNT_USERNAME_THRESHOLD = 3;
const IP_HASH_MULTI_ACCOUNT_EVENT_THRESHOLD = 6;
const IP_PUBLISH_OBSERVATION_LIMIT = 2000;
const RISK_QUEUE_LIMIT = 1000;
const HASH_SALT = String(
  process.env.CONTENT_MODERATION_AUDIT_SALT
    || process.env.AUDIT_HASH_SALT
    || 'taoyuan-content-moderation-audit',
);

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

function getContentModerationRetentionDays() {
  return Math.max(
    DEFAULT_RETENTION_DAYS,
    normalizePositiveInt(
      process.env.CONTENT_MODERATION_RETENTION_DAYS || getConfigValue('content_moderation_retention_days'),
      DEFAULT_RETENTION_DAYS,
    ),
  );
}

function sanitizeText(value, maxLength = 120) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function sanitizeExcerpt(value, maxLength = 80) {
  return sanitizeText(value, maxLength)
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function hashAuditValue(value) {
  const raw = String(value || '');
  if (!raw) return '';
  return crypto
    .createHash('sha256')
    .update(`${HASH_SALT}:${raw}`)
    .digest('hex')
    .slice(0, 32);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

function normalizeEvent(entry = {}) {
  return {
    id: sanitizeText(entry.id || makeId('content_mod'), 80),
    request_id: sanitizeText(entry.request_id, 80),
    scene: sanitizeText(entry.scene, 80),
    field: sanitizeText(entry.field, 80),
    username: sanitizeText(entry.username, 60),
    content_type: sanitizeText(entry.content_type || 'text', 40),
    content_id: sanitizeText(entry.content_id, 100),
    action: sanitizeText(entry.action || 'reject', 40),
    severity: sanitizeText(entry.severity || 'medium', 30),
    matched_category: sanitizeText(entry.matched_category, 80),
    matched_term_hash: sanitizeText(entry.matched_term_hash, 80),
    rule_version: sanitizeText(entry.rule_version, 80),
    content_hash: sanitizeText(entry.content_hash, 80),
    content_excerpt: sanitizeExcerpt(entry.content_excerpt, 80),
    outcome: sanitizeText(entry.outcome || 'rejected', 40),
    created_at: Math.max(0, parseInt(entry.created_at, 10) || nowSeconds()),
  };
}

function sanitizeList(values = [], maxLength = 80, limit = 20) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const item = sanitizeText(value, maxLength);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizeRiskScore(value) {
  return Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
}

function normalizeRiskSignal(entry = {}) {
  const now = nowSeconds();
  const status = sanitizeText(entry.status || 'pending', 40);
  return {
    id: sanitizeText(entry.id || makeId('content_risk'), 80),
    signal_type: sanitizeText(entry.signal_type || 'content_risk', 80),
    status: ['pending', 'reviewing', 'resolved', 'dismissed'].includes(status) ? status : 'pending',
    username: sanitizeText(entry.username, 60),
    target_type: sanitizeText(entry.target_type || 'user', 60),
    target_id: sanitizeText(entry.target_id, 120),
    content_type: sanitizeText(entry.content_type || '', 60),
    content_id: sanitizeText(entry.content_id || '', 120),
    request_id: sanitizeText(entry.request_id || '', 80),
    scene: sanitizeText(entry.scene || '', 80),
    reason_code: sanitizeText(entry.reason_code || '', 80),
    outcome: sanitizeText(entry.outcome || 'pending_review', 60),
    risk_score: normalizeRiskScore(entry.risk_score),
    event_count: Math.max(0, Math.floor(Number(entry.event_count) || 0)),
    report_count: Math.max(0, Math.floor(Number(entry.report_count) || 0)),
    reporter_count: Math.max(0, Math.floor(Number(entry.reporter_count) || 0)),
    event_ids: sanitizeList(entry.event_ids, 80, 30),
    report_ids: sanitizeList(entry.report_ids, 80, 30),
    request_ids: sanitizeList(entry.request_ids, 80, 30),
    matched_categories: sanitizeList(entry.matched_categories, 80, 20),
    rule_versions: sanitizeList(entry.rule_versions, 80, 10),
    content_hashes: sanitizeList(entry.content_hashes, 80, 20),
    image_hash_prefix: sanitizeText(entry.image_hash_prefix || '', 32),
    ip_hash: sanitizeText(entry.ip_hash || '', 80),
    usernames: sanitizeList(entry.usernames, 60, 20),
    route_keys: sanitizeList(entry.route_keys, 80, 20),
    created_at: Math.max(0, parseInt(entry.created_at, 10) || now),
    updated_at: Math.max(0, parseInt(entry.updated_at, 10) || now),
  };
}

function normalizeIpPublishObservation(entry = {}) {
  return {
    id: sanitizeText(entry.id || makeId('ip_publish'), 80),
    ip_hash: sanitizeText(entry.ip_hash || '', 80),
    username: sanitizeText(entry.username || '', 60),
    route_key: sanitizeText(entry.route_key || '', 80),
    scene: sanitizeText(entry.scene || entry.route_key || '', 80),
    request_id: sanitizeText(entry.request_id || '', 80),
    created_at: Math.max(0, parseInt(entry.created_at, 10) || nowSeconds()),
  };
}

function loadStore() {
  ensureDir();
  try {
    if (!fs.existsSync(STORE_FILE)) return { events: [] };
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    return Array.isArray(raw?.events) ? { events: raw.events.map(normalizeEvent) } : { events: [] };
  } catch {
    return { events: [] };
  }
}

function loadRiskStore() {
  ensureDir();
  try {
    if (!fs.existsSync(RISK_QUEUE_FILE)) return { signals: [], ip_publish_events: [] };
    const raw = JSON.parse(fs.readFileSync(RISK_QUEUE_FILE, 'utf8'));
    return {
      signals: Array.isArray(raw?.signals) ? raw.signals.map(normalizeRiskSignal) : [],
      ip_publish_events: Array.isArray(raw?.ip_publish_events)
        ? raw.ip_publish_events.map(normalizeIpPublishObservation).filter(entry => entry.ip_hash && entry.username)
        : [],
    };
  } catch {
    return { signals: [], ip_publish_events: [] };
  }
}

function saveRiskStore(store) {
  const signals = Array.isArray(store?.signals)
    ? store.signals
        .map(normalizeRiskSignal)
        .sort((left, right) => {
          const scoreGap = (right.risk_score || 0) - (left.risk_score || 0);
          if (scoreGap !== 0) return scoreGap;
          return (right.updated_at || 0) - (left.updated_at || 0);
        })
        .slice(0, RISK_QUEUE_LIMIT)
    : [];
  const ipPublishEvents = Array.isArray(store?.ip_publish_events)
    ? store.ip_publish_events
        .map(normalizeIpPublishObservation)
        .filter(entry => entry.ip_hash && entry.username)
        .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
        .slice(0, IP_PUBLISH_OBSERVATION_LIMIT)
    : [];
  writeJsonFileAtomic(RISK_QUEUE_FILE, { signals, ip_publish_events: ipPublishEvents });
}

function buildRiskSignalKey(entry = {}) {
  return [
    sanitizeText(entry.signal_type, 80),
    sanitizeText(entry.target_type, 60),
    sanitizeText(entry.target_id, 120),
    sanitizeText(entry.username, 60),
  ].join('|');
}

function recordContentModerationRiskSignal(entry = {}) {
  const incoming = normalizeRiskSignal({
    ...entry,
    updated_at: entry.updated_at || nowSeconds(),
  });
  const store = loadRiskStore();
  const incomingKey = buildRiskSignalKey(incoming);
  const index = store.signals.findIndex(signal => (
    signal.status === 'pending'
    && buildRiskSignalKey(signal) === incomingKey
  ));
  if (index >= 0) {
    const previous = normalizeRiskSignal(store.signals[index]);
    store.signals[index] = normalizeRiskSignal({
      ...previous,
      ...incoming,
      id: previous.id,
      created_at: previous.created_at,
      event_count: Math.max(previous.event_count, incoming.event_count),
      report_count: Math.max(previous.report_count, incoming.report_count),
      reporter_count: Math.max(previous.reporter_count, incoming.reporter_count),
      risk_score: Math.max(previous.risk_score, incoming.risk_score),
      event_ids: sanitizeList([...previous.event_ids, ...incoming.event_ids], 80, 30),
      report_ids: sanitizeList([...previous.report_ids, ...incoming.report_ids], 80, 30),
      request_ids: sanitizeList([...previous.request_ids, ...incoming.request_ids], 80, 30),
      scene: incoming.scene || previous.scene,
      matched_categories: sanitizeList([...previous.matched_categories, ...incoming.matched_categories], 80, 20),
      rule_versions: sanitizeList([...previous.rule_versions, ...incoming.rule_versions], 80, 10),
      content_hashes: sanitizeList([...previous.content_hashes, ...incoming.content_hashes], 80, 20),
      usernames: sanitizeList([...previous.usernames, ...incoming.usernames], 60, 20),
      route_keys: sanitizeList([...previous.route_keys, ...incoming.route_keys], 80, 20),
      updated_at: incoming.updated_at,
    });
  } else {
    store.signals.unshift(incoming);
  }
  saveRiskStore(store);
  return index >= 0 ? store.signals[index] : incoming;
}

function recordIpHashPublishObservation(entry = {}) {
  const observation = normalizeIpPublishObservation(entry);
  if (!observation.ip_hash || !observation.username) return null;
  const store = loadRiskStore();
  const cutoff = observation.created_at - IP_HASH_MULTI_ACCOUNT_WINDOW_SECONDS;
  store.ip_publish_events = [
    observation,
    ...(Array.isArray(store.ip_publish_events) ? store.ip_publish_events : []),
  ]
    .map(normalizeIpPublishObservation)
    .filter(item => item.created_at >= cutoff)
    .slice(0, IP_PUBLISH_OBSERVATION_LIMIT);
  saveRiskStore(store);

  const related = store.ip_publish_events.filter(item => (
    item.ip_hash === observation.ip_hash
    && item.created_at >= cutoff
    && item.created_at <= observation.created_at
  ));
  const usernames = sanitizeList(related.map(item => item.username), 60, 20);
  if (
    usernames.length < IP_HASH_MULTI_ACCOUNT_USERNAME_THRESHOLD
    || related.length < IP_HASH_MULTI_ACCOUNT_EVENT_THRESHOLD
  ) {
    return null;
  }

  return recordContentModerationRiskSignal({
    signal_type: 'multi_account_ip_publish',
    username: '',
    target_type: 'ip_hash',
    target_id: observation.ip_hash,
    request_id: observation.request_id,
    reason_code: 'multi_account_ip_hash_high_frequency',
    outcome: 'anomaly_recorded',
    event_count: related.length,
    risk_score: Math.min(100, 40 + usernames.length * 10 + related.length),
    ip_hash: observation.ip_hash,
    scene: observation.scene || observation.route_key,
    usernames,
    route_keys: related.map(item => item.route_key),
    request_ids: related.map(item => item.request_id),
    created_at: related[related.length - 1]?.created_at || observation.created_at,
    updated_at: observation.created_at,
  });
}

function evaluateRepeatHardBlockRisk(event, events = []) {
  if (!event || event.action !== 'hard_block' || !event.username) return null;
  const cutoff = (event.created_at || nowSeconds()) - REPEAT_HARD_BLOCK_WINDOW_SECONDS;
  const related = events
    .map(normalizeEvent)
    .filter(item => (
      item.username === event.username
      && item.action === 'hard_block'
      && item.created_at >= cutoff
      && item.created_at <= event.created_at
    ));
  if (related.length < REPEAT_HARD_BLOCK_THRESHOLD) return null;
  return recordContentModerationRiskSignal({
    signal_type: 'repeat_hard_block',
    username: event.username,
    target_type: 'user',
    target_id: event.username,
    content_type: event.content_type,
    content_id: event.content_id,
    request_id: event.request_id,
    scene: event.scene,
    reason_code: 'repeat_hard_block_10m',
    outcome: 'queued_for_review',
    event_count: related.length,
    risk_score: Math.min(100, 50 + related.length * 10),
    event_ids: related.map(item => item.id),
    matched_categories: related.map(item => item.matched_category),
    rule_versions: related.map(item => item.rule_version),
    content_hashes: related.map(item => item.content_hash),
    created_at: related[related.length - 1]?.created_at || event.created_at,
    updated_at: event.created_at,
  });
}

function shouldRetainEvent(event, cutoffSeconds) {
  if (!event || !event.created_at) return false;
  if (event.created_at >= cutoffSeconds) return true;
  return event.severity === 'critical' || event.outcome === 'major_evidence';
}

function pruneEvents(events = [], options = {}) {
  const retentionDays = Math.max(
    DEFAULT_RETENTION_DAYS,
    normalizePositiveInt(options.retentionDays, getContentModerationRetentionDays()),
  );
  const cutoffSeconds = nowSeconds() - retentionDays * 86400;
  return events.map(normalizeEvent).filter(event => shouldRetainEvent(event, cutoffSeconds));
}

function saveStore(store, options = {}) {
  const events = Array.isArray(store?.events) ? store.events.map(normalizeEvent) : [];
  writeJsonFileAtomic(STORE_FILE, {
    events: options.prune === true ? pruneEvents(events, options) : events,
  });
}

function recordContentModerationEvent(entry = {}) {
  const content = String(entry.content || '');
  const matchedTerm = String(entry.matched_term || '');
  const normalized = normalizeEvent({
    ...entry,
    id: entry.id || makeId('content_mod'),
    matched_term_hash: entry.matched_term_hash || hashAuditValue(matchedTerm),
    content_hash: entry.content_hash || hashAuditValue(content),
    content_excerpt: entry.content_excerpt || sanitizeExcerpt(content, 80),
    created_at: entry.created_at || nowSeconds(),
  });
  const store = loadStore();
  store.events.unshift(normalized);
  saveStore(store);
  try {
    evaluateRepeatHardBlockRisk(normalized, store.events);
  } catch {}
  return normalized;
}

function listContentModerationEvents(options = {}) {
  const page = normalizePositiveInt(options.page, 1);
  const pageSize = Math.min(100, normalizePositiveInt(options.pageSize || options.page_size, 20));
  const usernameFilter = sanitizeText(options.username, 60).toLocaleLowerCase('zh-CN');
  const sceneFilter = sanitizeText(options.scene, 80).toLocaleLowerCase('zh-CN');
  const actionFilter = sanitizeText(options.action, 40).toLocaleLowerCase('zh-CN');
  const outcomeFilter = sanitizeText(options.outcome, 40).toLocaleLowerCase('zh-CN');
  const store = loadStore();
  const filtered = pruneEvents(store.events).filter(event => {
    if (usernameFilter && !String(event.username || '').toLocaleLowerCase('zh-CN').includes(usernameFilter)) return false;
    if (sceneFilter && String(event.scene || '').toLocaleLowerCase('zh-CN') !== sceneFilter) return false;
    if (actionFilter && String(event.action || '').toLocaleLowerCase('zh-CN') !== actionFilter) return false;
    if (outcomeFilter && String(event.outcome || '').toLocaleLowerCase('zh-CN') !== outcomeFilter) return false;
    return true;
  });
  const offset = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    events: filtered.slice(offset, offset + pageSize),
  };
}

function pruneContentModerationEvents(options = {}) {
  const store = loadStore();
  const before = store.events.length;
  store.events = pruneEvents(store.events, options);
  saveStore(store);
  return {
    before,
    after: store.events.length,
    removed: Math.max(0, before - store.events.length),
    retention_days: Math.max(
      DEFAULT_RETENTION_DAYS,
      normalizePositiveInt(options.retentionDays, getContentModerationRetentionDays()),
    ),
  };
}

function listContentModerationRiskSignals(options = {}) {
  const page = normalizePositiveInt(options.page, 1);
  const pageSize = Math.min(100, normalizePositiveInt(options.pageSize || options.page_size, 20));
  const usernameFilter = sanitizeText(options.username, 60).toLocaleLowerCase('zh-CN');
  const signalTypeFilter = sanitizeText(options.signal_type || options.signalType, 80).toLocaleLowerCase('zh-CN');
  const sceneFilter = sanitizeText(options.scene, 80).toLocaleLowerCase('zh-CN');
  const statusFilter = sanitizeText(options.status || 'pending', 40).toLocaleLowerCase('zh-CN');
  const createdFrom = Math.max(0, parseInt(options.created_from || options.createdFrom, 10) || 0);
  const createdTo = Math.max(0, parseInt(options.created_to || options.createdTo, 10) || 0);
  const store = loadRiskStore();
  const filtered = store.signals
    .map(normalizeRiskSignal)
    .filter(signal => {
      const signalTime = Math.max(0, Number(signal.updated_at || signal.created_at) || 0);
      if (usernameFilter && !String(signal.username || '').toLocaleLowerCase('zh-CN').includes(usernameFilter)) return false;
      if (signalTypeFilter && String(signal.signal_type || '').toLocaleLowerCase('zh-CN') !== signalTypeFilter) return false;
      if (sceneFilter && String(signal.scene || '').toLocaleLowerCase('zh-CN') !== sceneFilter) return false;
      if (statusFilter !== 'all' && String(signal.status || '').toLocaleLowerCase('zh-CN') !== statusFilter) return false;
      if (createdFrom && signalTime < createdFrom) return false;
      if (createdTo && signalTime > createdTo) return false;
      return true;
    })
    .sort((left, right) => {
      const scoreGap = (right.risk_score || 0) - (left.risk_score || 0);
      if (scoreGap !== 0) return scoreGap;
      return (right.updated_at || 0) - (left.updated_at || 0);
    });
  const offset = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    signals: filtered.slice(offset, offset + pageSize),
  };
}

function updateContentModerationRiskSignalStatus(signalId, status) {
  const id = sanitizeText(signalId, 80);
  const normalizedStatus = sanitizeText(status || 'reviewing', 40);
  if (!id) {
    const error = new Error('风险信号 ID 不能为空');
    error.status = 400;
    throw error;
  }
  if (!['pending', 'reviewing', 'resolved', 'dismissed'].includes(normalizedStatus)) {
    const error = new Error('风险信号状态无效');
    error.status = 400;
    throw error;
  }
  const store = loadRiskStore();
  const index = store.signals.findIndex(signal => String(signal?.id || '') === id);
  if (index < 0) {
    const error = new Error('风险信号不存在');
    error.status = 404;
    throw error;
  }
  const before = normalizeRiskSignal(store.signals[index]);
  const outcomeByStatus = {
    pending: 'pending_review',
    reviewing: 'under_observation',
    resolved: 'handled_by_admin',
    dismissed: 'dismissed_by_admin',
  };
  store.signals[index] = normalizeRiskSignal({
    ...before,
    status: normalizedStatus,
    outcome: outcomeByStatus[normalizedStatus],
    updated_at: nowSeconds(),
  });
  saveRiskStore(store);
  return {
    before,
    signal: normalizeRiskSignal(store.signals[index]),
  };
}

module.exports = {
  STORE_FILE,
  RISK_QUEUE_FILE,
  hashAuditValue,
  recordContentModerationEvent,
  recordContentModerationRiskSignal,
  recordIpHashPublishObservation,
  listContentModerationEvents,
  listContentModerationRiskSignals,
  updateContentModerationRiskSignalStatus,
  pruneContentModerationEvents,
};
