const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const taoyuanMailbox = require('./taoyuanMailbox');
const { createError } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../data');

const ANNOUNCEMENT_STORE_FILE = path.join(DATA_DIR, 'taoyuan_announcements.json');
const QA_FORCE_LOCAL = String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim().toLowerCase() === 'true';
const MYSQL_ENABLED = !QA_FORCE_LOCAL && Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);

const ANNOUNCEMENT_STATUS = new Set(['draft', 'published', 'offline']);
const ANNOUNCEMENT_EVENT_TYPES = new Set(['impression', 'close', 'suppress', 'cta_click', 'reward_claim']);
const PUBLIC_CACHE_TTL_MS = Math.max(
  1000,
  Math.floor(Number(process.env.TAOYUAN_ANNOUNCEMENT_PUBLIC_CACHE_TTL_MS) || 10000)
);
const publicCache = new Map();
const DEFAULT_BUTTON_TEXTS = Object.freeze({
  close: '知道了',
  suppress: '本条不再提示',
  cta: '查看详情',
});
const SAVE_UPDATE_BUTTON_TEMPLATE_TYPES = new Set(['version_update', 'hotfix']);

const TEMPLATES = Object.freeze([
  {
    id: 'version_update',
    label: '版本更新',
    title: '桃源乡更新公告',
    body: '## 本次更新\n- 新增内容：\n- 调整体验：\n- 修复问题：',
    template_type: 'version_update',
  },
  {
    id: 'maintenance',
    label: '停服维护',
    title: '桃源乡维护通知',
    body: '## 维护安排\n维护时间：\n影响范围：\n维护完成后将恢复正常进入。',
    template_type: 'maintenance',
  },
  {
    id: 'hotfix',
    label: '热修复说明',
    title: '桃源乡热修复说明',
    body: '## 已修复\n- \n\n如仍遇到异常，请保留存档并反馈。',
    template_type: 'hotfix',
  },
  {
    id: 'event_preview',
    label: '活动预告',
    title: '桃源乡活动预告',
    body: '## 活动即将开启\n活动时间：\n参与方式：\n主要奖励：',
    template_type: 'event_preview',
  },
  {
    id: 'compensation',
    label: '补偿说明',
    title: '桃源乡补偿说明',
    body: '## 补偿说明\n补偿原因：\n发放范围：\n领取方式：',
    template_type: 'compensation',
  },
]);

let mysqlPool = null;
let mysqlReadyPromise = null;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clearPublicCache() {
  publicCache.clear();
}

function getPublicCache(key) {
  const entry = publicCache.get(key);
  if (!entry || entry.expires_at <= Date.now()) {
    if (entry) publicCache.delete(key);
    return null;
  }
  return cloneJson(entry.value);
}

function setPublicCache(key, value) {
  publicCache.set(key, {
    expires_at: Date.now() + PUBLIC_CACHE_TTL_MS,
    value: cloneJson(value),
  });
  while (publicCache.size > 100) {
    const firstKey = publicCache.keys().next().value;
    if (!firstKey) break;
    publicCache.delete(firstKey);
  }
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

function loadLocalStore() {
  ensureDir();
  if (!fs.existsSync(ANNOUNCEMENT_STORE_FILE)) return { announcements: [], events: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(ANNOUNCEMENT_STORE_FILE, 'utf8'));
    return {
      announcements: Array.isArray(raw?.announcements) ? raw.announcements : [],
      events: Array.isArray(raw?.events) ? raw.events : [],
    };
  } catch {
    const error = new Error('taoyuan_announcements.json is corrupted');
    error.status = 500;
    throw error;
  }
}

function saveLocalStore(store, options = {}) {
  writeJsonFileAtomic(ANNOUNCEMENT_STORE_FILE, {
    announcements: Array.isArray(store?.announcements) ? store.announcements : [],
    events: Array.isArray(store?.events) ? store.events : [],
  });
  if (options.clearPublicCache !== false) clearPublicCache();
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

async function ensureMysqlColumn(pool, tableName, columnName, definition) {
  if (!/^[a-z0-9_]+$/i.test(tableName) || !/^[a-z0-9_]+$/i.test(columnName)) return;
  const [rows] = await pool.query(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE ?`,
    [columnName],
  );
  if (Array.isArray(rows) && rows.length > 0) return;
  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

async function ensureMysqlReady() {
  if (!MYSQL_ENABLED) return false;
  if (!mysqlReadyPromise) {
    mysqlReadyPromise = (async () => {
      const pool = buildMysqlPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS taoyuan_announcements (
          id VARCHAR(64) NOT NULL,
          title VARCHAR(160) NOT NULL DEFAULT '',
          body LONGTEXT NULL,
          image_url VARCHAR(512) NOT NULL DEFAULT '',
          version VARCHAR(64) NOT NULL DEFAULT '',
          target_versions_json LONGTEXT NULL,
          target_channels_json LONGTEXT NULL,
          start_at BIGINT NULL DEFAULT NULL,
          end_at BIGINT NULL DEFAULT NULL,
          priority INT NOT NULL DEFAULT 0,
          status VARCHAR(24) NOT NULL DEFAULT 'draft',
          cta_text VARCHAR(80) NOT NULL DEFAULT '',
          cta_url VARCHAR(512) NOT NULL DEFAULT '',
          button_texts_json LONGTEXT NULL,
          template_type VARCHAR(64) NOT NULL DEFAULT '',
          show_save_update_button TINYINT NULL DEFAULT NULL,
          is_pinned TINYINT NOT NULL DEFAULT 0,
          rewards_json LONGTEXT NULL,
          duplicate_compensation_money INT NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          published_at BIGINT NULL DEFAULT NULL,
          offline_at BIGINT NULL DEFAULT NULL,
          operator_name VARCHAR(64) NOT NULL DEFAULT '',
          operator_role VARCHAR(32) NOT NULL DEFAULT '',
          PRIMARY KEY (id),
          KEY idx_status_published_at (status, published_at),
          KEY idx_updated_at (updated_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      await ensureMysqlColumn(pool, 'taoyuan_announcements', 'rewards_json', 'LONGTEXT NULL');
      await ensureMysqlColumn(pool, 'taoyuan_announcements', 'duplicate_compensation_money', 'INT NOT NULL DEFAULT 0');
      await ensureMysqlColumn(pool, 'taoyuan_announcements', 'show_save_update_button', 'TINYINT NULL DEFAULT NULL');
      await ensureMysqlColumn(pool, 'taoyuan_announcements', 'is_pinned', 'TINYINT NOT NULL DEFAULT 0');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS taoyuan_announcement_events (
          id VARCHAR(96) NOT NULL,
          announcement_id VARCHAR(64) NOT NULL,
          username VARCHAR(64) NOT NULL DEFAULT '',
          event_type VARCHAR(32) NOT NULL,
          client_version VARCHAR(64) NOT NULL DEFAULT '',
          client_channel VARCHAR(64) NOT NULL DEFAULT '',
          detail_json LONGTEXT NULL,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (id),
          KEY idx_announcement_type (announcement_id, event_type),
          KEY idx_username_announcement (username, announcement_id),
          KEY idx_created_at (created_at)
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

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value || '');
    return parsed === undefined || parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function normalizeText(value, maxLength = 200) {
  return String(value || '').normalize('NFKC').trim().slice(0, maxLength);
}

function normalizeBody(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, 8000);
}

function normalizeList(value, maxItems = 20) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,，]/);
  return [...new Set(raw
    .map(item => normalizeText(item, 64))
    .filter(Boolean))]
    .slice(0, maxItems);
}

function parseTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value > 100000000000 ? value / 1000 : value));
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric > 100000000000 ? numeric / 1000 : numeric)) : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed / 1000)) : null;
}

function normalizePriority(value) {
  const priority = parseInt(value, 10);
  if (!Number.isFinite(priority)) return 0;
  return Math.max(0, Math.min(999, priority));
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function normalizeAnnouncementRewards(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => taoyuanMailbox.normalizeReward(item))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeStatus(value, fallback = 'draft') {
  const status = String(value || fallback).trim().toLowerCase();
  return ANNOUNCEMENT_STATUS.has(status) ? status : fallback;
}

function sanitizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/[\u0000-\u0020\u007f]/.test(raw)) return '';
  if (raw.startsWith('/')) return raw.slice(0, 512);
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw.slice(0, 512);
  } catch {}
  return '';
}

function normalizeButtonTexts(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    close: normalizeText(source.close || source.close_text || DEFAULT_BUTTON_TEXTS.close, 40) || DEFAULT_BUTTON_TEXTS.close,
    suppress: normalizeText(source.suppress || source.suppress_text || DEFAULT_BUTTON_TEXTS.suppress, 40) || DEFAULT_BUTTON_TEXTS.suppress,
    cta: normalizeText(source.cta || source.cta_text || DEFAULT_BUTTON_TEXTS.cta, 40) || DEFAULT_BUTTON_TEXTS.cta,
  };
}

function getDefaultShowSaveUpdateButton(templateType) {
  return SAVE_UPDATE_BUTTON_TEMPLATE_TYPES.has(String(templateType || '').trim());
}

function normalizeShowSaveUpdateButton(value, templateType) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return getDefaultShowSaveUpdateButton(templateType);
}

function normalizeBooleanFlag(value, fallback = false) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback === true;
}

function normalizeAnnouncementInput(input = {}, previous = null, actor = {}) {
  const createdAt = Number(previous?.created_at) || nowSeconds();
  const templateType = normalizeText(input.template_type ?? input.templateType ?? previous?.template_type ?? '', 64);
  const normalized = {
    id: normalizeText(input.id || previous?.id || createId('ann'), 64),
    title: normalizeText(input.title ?? previous?.title ?? '', 120),
    body: normalizeBody(input.body ?? previous?.body ?? ''),
    image_url: sanitizeUrl(input.image_url ?? input.imageUrl ?? previous?.image_url ?? ''),
    version: normalizeText(input.version ?? previous?.version ?? '', 64),
    target_versions: normalizeList(input.target_versions ?? input.targetVersions ?? previous?.target_versions ?? []),
    target_channels: normalizeList(input.target_channels ?? input.targetChannels ?? previous?.target_channels ?? []),
    start_at: parseTimestamp(input.start_at ?? input.startAt ?? previous?.start_at ?? null),
    end_at: parseTimestamp(input.end_at ?? input.endAt ?? previous?.end_at ?? null),
    priority: normalizePriority(input.priority ?? previous?.priority ?? 0),
    status: normalizeStatus(input.status ?? previous?.status ?? 'draft', previous?.status || 'draft'),
    cta_text: normalizeText(input.cta_text ?? input.ctaText ?? previous?.cta_text ?? '', 60),
    cta_url: sanitizeUrl(input.cta_url ?? input.ctaUrl ?? previous?.cta_url ?? ''),
    button_texts: normalizeButtonTexts(input.button_texts ?? input.buttonTexts ?? previous?.button_texts ?? {}),
    template_type: templateType,
    show_save_update_button: normalizeShowSaveUpdateButton(
      input.show_save_update_button ?? input.showSaveUpdateButton ?? previous?.show_save_update_button,
      templateType,
    ),
    is_pinned: normalizeBooleanFlag(input.is_pinned ?? input.isPinned ?? previous?.is_pinned, false),
    rewards: normalizeAnnouncementRewards(input.rewards ?? previous?.rewards ?? []),
    duplicate_compensation_money: clampPositiveInt(
      input.duplicate_compensation_money ?? input.duplicateCompensationMoney ?? previous?.duplicate_compensation_money,
      0,
    ),
    created_at: createdAt,
    updated_at: nowSeconds(),
    published_at: parseTimestamp(input.published_at ?? input.publishedAt ?? previous?.published_at ?? null),
    offline_at: parseTimestamp(input.offline_at ?? input.offlineAt ?? previous?.offline_at ?? null),
    operator_name: normalizeText(actor.operator_name || previous?.operator_name || '', 64),
    operator_role: normalizeText(actor.operator_role || previous?.operator_role || '', 32),
  };
  if (!normalized.title) {
    const error = new Error('公告标题不能为空');
    error.status = 400;
    throw error;
  }
  if (!normalized.body && !normalized.image_url) {
    const error = new Error('公告正文或图片至少填写一项');
    error.status = 400;
    throw error;
  }
  if (normalized.end_at !== null && normalized.start_at !== null && normalized.end_at < normalized.start_at) {
    const error = new Error('公告失效时间不能早于生效时间');
    error.status = 400;
    throw error;
  }
  if (!normalized.cta_url) normalized.cta_text = '';
  return normalized;
}

function mapMysqlAnnouncement(row = {}) {
  return normalizeAnnouncementInput({
    id: row.id,
    title: row.title,
    body: row.body,
    image_url: row.image_url,
    version: row.version,
    target_versions: parseJson(row.target_versions_json, []),
    target_channels: parseJson(row.target_channels_json, []),
    start_at: row.start_at,
    end_at: row.end_at,
    priority: row.priority,
    status: row.status,
    cta_text: row.cta_text,
    cta_url: row.cta_url,
    button_texts: parseJson(row.button_texts_json, DEFAULT_BUTTON_TEXTS),
    template_type: row.template_type,
    show_save_update_button: row.show_save_update_button,
    is_pinned: row.is_pinned,
    rewards: parseJson(row.rewards_json, []),
    duplicate_compensation_money: row.duplicate_compensation_money,
  }, {
    id: row.id,
    created_at: Number(row.created_at) || nowSeconds(),
    updated_at: Number(row.updated_at) || nowSeconds(),
    published_at: row.published_at ? Number(row.published_at) : null,
    offline_at: row.offline_at ? Number(row.offline_at) : null,
    operator_name: row.operator_name,
    operator_role: row.operator_role,
  }, {
    operator_name: row.operator_name,
    operator_role: row.operator_role,
  });
}

function mapLocalAnnouncement(item = {}) {
  return normalizeAnnouncementInput(item, {
    ...item,
    created_at: Number(item.created_at) || nowSeconds(),
    updated_at: Number(item.updated_at) || nowSeconds(),
    published_at: item.published_at ? Number(item.published_at) : null,
    offline_at: item.offline_at ? Number(item.offline_at) : null,
  }, {
    operator_name: item.operator_name || '',
    operator_role: item.operator_role || '',
  });
}

function mapEvent(item = {}) {
  return {
    id: normalizeText(item.id || createId('annevt'), 96),
    announcement_id: normalizeText(item.announcement_id || item.announcementId || '', 64),
    username: normalizeText(item.username || '', 64),
    event_type: ANNOUNCEMENT_EVENT_TYPES.has(String(item.event_type || item.eventType || '').trim())
      ? String(item.event_type || item.eventType).trim()
      : 'impression',
    client_version: normalizeText(item.client_version || item.clientVersion || '', 64),
    client_channel: normalizeText(item.client_channel || item.clientChannel || '', 64),
    detail: item.detail && typeof item.detail === 'object' && !Array.isArray(item.detail) ? item.detail : parseJson(item.detail_json, {}),
    created_at: parseTimestamp(item.created_at) || nowSeconds(),
  };
}

function normalizeAnnouncementEventInput(announcementId, input = {}) {
  const normalizedAnnouncementId = normalizeText(
    announcementId || input.announcement_id || input.announcementId || input.id,
    64,
  );
  const username = normalizeText(input.username, 64);
  const eventType = String(input.event_type || input.eventType || '').trim();
  if (!normalizedAnnouncementId || !username || !ANNOUNCEMENT_EVENT_TYPES.has(eventType)) return null;
  return mapEvent({
    id: createId('annevt'),
    announcement_id: normalizedAnnouncementId,
    username,
    event_type: eventType,
    client_version: input.client_version || input.clientVersion,
    client_channel: input.client_channel || input.clientChannel,
    detail: input.detail || {},
    created_at: nowSeconds(),
  });
}

function toMysqlParams(announcement) {
  return [
    announcement.id,
    announcement.title,
    announcement.body,
    announcement.image_url,
    announcement.version,
    JSON.stringify(announcement.target_versions),
    JSON.stringify(announcement.target_channels),
    announcement.start_at,
    announcement.end_at,
    announcement.priority,
    announcement.status,
    announcement.cta_text,
    announcement.cta_url,
    JSON.stringify(announcement.button_texts),
    announcement.template_type,
    announcement.show_save_update_button === true ? 1 : 0,
    announcement.is_pinned === true ? 1 : 0,
    JSON.stringify(announcement.rewards),
    announcement.duplicate_compensation_money,
    announcement.created_at,
    announcement.updated_at,
    announcement.published_at,
    announcement.offline_at,
    announcement.operator_name,
    announcement.operator_role,
  ];
}

async function insertAnnouncementEventsMysql(events = []) {
  if (!events.length) return;
  const placeholders = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = events.flatMap(event => [
    event.id,
    event.announcement_id,
    event.username,
    event.event_type,
    event.client_version,
    event.client_channel,
    JSON.stringify(event.detail || {}),
    event.created_at,
  ]);
  await buildMysqlPool().execute(
    `INSERT INTO taoyuan_announcement_events
       (id, announcement_id, username, event_type, client_version, client_channel, detail_json, created_at)
       VALUES ${placeholders}`,
    params,
  );
}

async function upsertAnnouncement(input = {}, actor = {}) {
  const previous = input.id ? await getAnnouncement(input.id) : null;
  const announcement = normalizeAnnouncementInput(input, previous, actor);

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    await buildMysqlPool().execute(
      `INSERT INTO taoyuan_announcements
       (id, title, body, image_url, version, target_versions_json, target_channels_json, start_at, end_at, priority, status,
        cta_text, cta_url, button_texts_json, template_type, show_save_update_button, is_pinned, rewards_json, duplicate_compensation_money,
        created_at, updated_at, published_at, offline_at, operator_name, operator_role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        body = VALUES(body),
        image_url = VALUES(image_url),
        version = VALUES(version),
        target_versions_json = VALUES(target_versions_json),
        target_channels_json = VALUES(target_channels_json),
        start_at = VALUES(start_at),
        end_at = VALUES(end_at),
        priority = VALUES(priority),
        status = VALUES(status),
        cta_text = VALUES(cta_text),
        cta_url = VALUES(cta_url),
        button_texts_json = VALUES(button_texts_json),
        template_type = VALUES(template_type),
        show_save_update_button = VALUES(show_save_update_button),
        is_pinned = VALUES(is_pinned),
        rewards_json = VALUES(rewards_json),
        duplicate_compensation_money = VALUES(duplicate_compensation_money),
        updated_at = VALUES(updated_at),
        published_at = VALUES(published_at),
        offline_at = VALUES(offline_at),
        operator_name = VALUES(operator_name),
        operator_role = VALUES(operator_role)`,
      toMysqlParams(announcement),
    );
    if (announcement.status === 'published' && announcement.is_pinned === true) {
      await buildMysqlPool().execute(
        'UPDATE taoyuan_announcements SET is_pinned = 0 WHERE id <> ? AND is_pinned = 1',
        [announcement.id],
      );
    }
    clearPublicCache();
    return announcement;
  }

  const store = loadLocalStore();
  const index = store.announcements.findIndex(item => item.id === announcement.id);
  if (index >= 0) store.announcements[index] = announcement;
  else store.announcements.unshift(announcement);
  if (announcement.status === 'published' && announcement.is_pinned === true) {
    store.announcements = store.announcements.map(item => (
      item.id === announcement.id ? item : { ...item, is_pinned: false }
    ));
  }
  saveLocalStore(store);
  return announcement;
}

async function getAnnouncement(id) {
  const announcementId = normalizeText(id, 64);
  if (!announcementId) return null;
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [rows] = await buildMysqlPool().execute(
      'SELECT * FROM taoyuan_announcements WHERE id = ? LIMIT 1',
      [announcementId],
    );
    return rows[0] ? mapMysqlAnnouncement(rows[0]) : null;
  }
  const store = loadLocalStore();
  const item = store.announcements.find(entry => entry.id === announcementId);
  return item ? mapLocalAnnouncement(item) : null;
}

async function listAdminAnnouncements() {
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [rows] = await buildMysqlPool().query(
      'SELECT * FROM taoyuan_announcements ORDER BY updated_at DESC, created_at DESC, id DESC LIMIT 500',
    );
    return rows.map(mapMysqlAnnouncement);
  }
  const store = loadLocalStore();
  return store.announcements
    .map(mapLocalAnnouncement)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));
}

async function publishAnnouncement(id, actor = {}) {
  const current = await getAnnouncement(id);
  if (!current) {
    const error = new Error('公告不存在');
    error.status = 404;
    throw error;
  }
  return upsertAnnouncement({
    ...current,
    status: 'published',
    published_at: current.published_at || nowSeconds(),
    offline_at: null,
  }, actor);
}

async function offlineAnnouncement(id, actor = {}) {
  const current = await getAnnouncement(id);
  if (!current) {
    const error = new Error('公告不存在');
    error.status = 404;
    throw error;
  }
  return upsertAnnouncement({
    ...current,
    status: 'offline',
    is_pinned: false,
    offline_at: nowSeconds(),
  }, actor);
}

async function deleteAnnouncement(id) {
  const current = await getAnnouncement(id);
  if (!current) {
    const error = new Error('公告不存在');
    error.status = 404;
    throw error;
  }

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const pool = buildMysqlPool();
    const [eventResult] = await pool.execute(
      'DELETE FROM taoyuan_announcement_events WHERE announcement_id = ?',
      [current.id],
    );
    await pool.execute(
      'DELETE FROM taoyuan_announcements WHERE id = ?',
      [current.id],
    );
    clearPublicCache();
    return {
      announcement: current,
      deleted_event_count: Number(eventResult?.affectedRows) || 0,
    };
  }

  const store = loadLocalStore();
  const beforeEventCount = store.events.length;
  store.announcements = store.announcements.filter(item => item.id !== current.id);
  store.events = store.events.filter(item => item.announcement_id !== current.id);
  saveLocalStore(store);
  return {
    announcement: current,
    deleted_event_count: beforeEventCount - store.events.length,
  };
}

function targetMatches(list, value) {
  if (!Array.isArray(list) || list.length === 0) return true;
  const normalized = normalizeText(value, 64);
  if (!normalized) return false;
  return list.includes(normalized);
}

function isAnnouncementStarted(announcement, now = nowSeconds()) {
  return !announcement.start_at || announcement.start_at <= now;
}

function isAnnouncementActive(announcement, now = nowSeconds()) {
  return announcement.status === 'published'
    && isAnnouncementStarted(announcement, now)
    && (!announcement.end_at || announcement.end_at >= now);
}

async function getSuppressedAnnouncementIds(username) {
  const normalizedUsername = normalizeText(username, 64);
  if (!normalizedUsername) return new Set();
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [rows] = await buildMysqlPool().execute(
      'SELECT DISTINCT announcement_id FROM taoyuan_announcement_events WHERE username = ? AND event_type IN (?, ?)',
      [normalizedUsername, 'suppress', 'close'],
    );
    return new Set(rows.map(row => String(row.announcement_id || '')).filter(Boolean));
  }
  const store = loadLocalStore();
  return new Set(store.events
    .map(mapEvent)
    .filter(event => event.username === normalizedUsername && ['suppress', 'close'].includes(event.event_type))
    .map(event => event.announcement_id));
}

async function listActiveAnnouncements(options = {}) {
  const now = nowSeconds();
  const username = normalizeText(options.username, 64);
  const baseCacheKey = `active-base:${normalizeText(options.version, 80)}:${normalizeText(options.channel, 40)}`;
  const cachedBase = getPublicCache(baseCacheKey);
  const base = cachedBase || (await listAdminAnnouncements())
    .filter(item => isAnnouncementActive(item, now))
    .filter(item => targetMatches(item.target_versions, options.version))
    .filter(item => targetMatches(item.target_channels, options.channel))
    .sort((left, right) => (
      Number(right.is_pinned === true) - Number(left.is_pinned === true)
      || (right.priority || 0) - (left.priority || 0)
      || (right.published_at || 0) - (left.published_at || 0)
      || (right.created_at || 0) - (left.created_at || 0)
    ));
  if (!cachedBase) setPublicCache(baseCacheKey, base);
  if (!username) return base;

  const suppressed = await getSuppressedAnnouncementIds(username);
  const result = base
    .map(item => ({
      ...item,
      is_read: suppressed.has(item.id),
    }))
    .filter(item => !item.is_read || item.is_pinned === true);
  return result;
}

async function listPublicHistory(options = {}) {
  const now = nowSeconds();
  const limit = Math.max(1, Math.min(100, parseInt(options.limit || '50', 10) || 50));
  const cacheKey = `history:${normalizeText(options.version, 80)}:${normalizeText(options.channel, 40)}:${limit}`;
  const cached = getPublicCache(cacheKey);
  if (cached) return cached;

  const announcements = await listAdminAnnouncements();
  const result = announcements
    .filter(item => item.status === 'published')
    .filter(item => isAnnouncementStarted(item, now))
    .filter(item => targetMatches(item.target_versions, options.version))
    .filter(item => targetMatches(item.target_channels, options.channel))
    .sort((left, right) => (
      Number(right.is_pinned === true) - Number(left.is_pinned === true)
      || (right.published_at || 0) - (left.published_at || 0)
      || (right.priority || 0) - (left.priority || 0)
      || (right.created_at || 0) - (left.created_at || 0)
    ))
    .slice(0, limit);
  setPublicCache(cacheKey, result);
  return result;
}

async function recordAnnouncementEvent(announcementId, input = {}) {
  const username = normalizeText(input.username, 64);
  if (!username) {
    return { recorded: false, event: null };
  }
  const current = await getAnnouncement(announcementId);
  if (!current) {
    const error = new Error('公告不存在');
    error.status = 404;
    throw error;
  }
  const event = mapEvent({
    id: createId('annevt'),
    announcement_id: current.id,
    username,
    event_type: input.event_type || input.eventType,
    client_version: input.client_version || input.clientVersion,
    client_channel: input.client_channel || input.clientChannel,
    detail: input.detail || {},
    created_at: nowSeconds(),
  });

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    await buildMysqlPool().execute(
      `INSERT INTO taoyuan_announcement_events
       (id, announcement_id, username, event_type, client_version, client_channel, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.announcement_id,
        event.username,
        event.event_type,
        event.client_version,
        event.client_channel,
        JSON.stringify(event.detail || {}),
        event.created_at,
      ],
    );
    return { recorded: true, event };
  }

  const store = loadLocalStore();
  store.events.unshift(event);
  saveLocalStore(store, { clearPublicCache: false });
  return { recorded: true, event };
}

async function recordAnnouncementEventsBatch(inputs = []) {
  const rawInputs = Array.isArray(inputs) ? inputs.slice(0, 200) : [];
  const candidateEvents = rawInputs
    .map(input => normalizeAnnouncementEventInput(input?.announcement_id || input?.announcementId, input))
    .filter(Boolean);
  if (!candidateEvents.length) {
    return {
      recorded: false,
      recorded_count: 0,
      skipped_count: rawInputs.length,
      events: [],
    };
  }

  const announcementIds = [...new Set(candidateEvents.map(event => event.announcement_id).filter(Boolean))];
  let existingIds = new Set();

  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const placeholders = announcementIds.map(() => '?').join(', ');
    const [rows] = await buildMysqlPool().execute(
      `SELECT id FROM taoyuan_announcements WHERE id IN (${placeholders})`,
      announcementIds,
    );
    existingIds = new Set(rows.map(row => normalizeText(row.id, 64)).filter(Boolean));
    const events = candidateEvents.filter(event => existingIds.has(event.announcement_id));
    await insertAnnouncementEventsMysql(events);
    return {
      recorded: events.length > 0,
      recorded_count: events.length,
      skipped_count: rawInputs.length - events.length,
      events,
    };
  }

  const store = loadLocalStore();
  existingIds = new Set(store.announcements.map(item => normalizeText(item.id, 64)).filter(Boolean));
  const events = candidateEvents.filter(event => existingIds.has(event.announcement_id));
  if (events.length) {
    store.events.unshift(...events);
    saveLocalStore(store, { clearPublicCache: false });
  }
  return {
    recorded: events.length > 0,
    recorded_count: events.length,
    skipped_count: rawInputs.length - events.length,
    events,
  };
}

async function listEventsForAnnouncement(announcementId) {
  const id = normalizeText(announcementId, 64);
  if (!id) return [];
  if (MYSQL_ENABLED) {
    await ensureMysqlReady();
    const [rows] = await buildMysqlPool().execute(
      'SELECT * FROM taoyuan_announcement_events WHERE announcement_id = ? ORDER BY created_at DESC LIMIT 20000',
      [id],
    );
    return rows.map(row => mapEvent({
      ...row,
      detail: parseJson(row.detail_json, {}),
    }));
  }
  const store = loadLocalStore();
  return store.events.map(mapEvent).filter(event => event.announcement_id === id);
}

async function getAnnouncementStats(announcementId) {
  const announcement = await getAnnouncement(announcementId);
  if (!announcement) {
    const error = new Error('公告不存在');
    error.status = 404;
    throw error;
  }
  const events = await listEventsForAnnouncement(announcement.id);
  const counts = {
    impression_count: 0,
    close_count: 0,
    suppress_count: 0,
    cta_click_count: 0,
    reward_claim_count: 0,
    read_count: 0,
    exposed_user_count: 0,
    event_count: events.length,
  };
  const readUsers = new Set();
  const exposedUsers = new Set();
  for (const event of events) {
    if (event.event_type === 'impression') {
      counts.impression_count += 1;
      if (event.username) exposedUsers.add(event.username);
    } else if (event.event_type === 'close') {
      counts.close_count += 1;
      if (event.username) readUsers.add(event.username);
    } else if (event.event_type === 'suppress') {
      counts.suppress_count += 1;
      if (event.username) readUsers.add(event.username);
    } else if (event.event_type === 'cta_click') {
      counts.cta_click_count += 1;
      if (event.username) readUsers.add(event.username);
    } else if (event.event_type === 'reward_claim') {
      counts.reward_claim_count += 1;
      if (event.username) readUsers.add(event.username);
    }
  }
  counts.read_count = readUsers.size;
  counts.exposed_user_count = exposedUsers.size;
  return { announcement, stats: counts, recent_events: events.slice(0, 80) };
}

async function claimAnnouncementReward(username, announcementId, options = {}) {
  const normalizedUsername = normalizeText(username, 64);
  if (!normalizedUsername) throw createError('请先登录后再领取公告奖励', 401);

  const announcement = await getAnnouncement(announcementId);
  if (!announcement) throw createError('公告不存在', 404);
  if (!isAnnouncementActive(announcement)) throw createError('这条公告奖励当前不可领取', 400);
  if (!targetMatches(announcement.target_versions, options.version)) {
    throw createError('这条公告奖励不适用于当前版本', 403);
  }
  if (!targetMatches(announcement.target_channels, options.channel)) {
    throw createError('这条公告奖励不适用于当前渠道', 403);
  }
  if (!Array.isArray(announcement.rewards) || announcement.rewards.length === 0) {
    throw createError('这条公告没有可领取奖励', 400);
  }

  const result = taoyuanMailbox.applyRewardsToSave(normalizedUsername, {
    id: `announcement_reward:${announcement.id}`,
    campaign_id: `announcement:${announcement.id}`,
    username: normalizedUsername,
    title: announcement.title,
    content: announcement.body,
    rewards: announcement.rewards.map(item => ({ ...item })),
    target_slot: null,
    duplicate_compensation_money: announcement.duplicate_compensation_money,
  });

  await recordAnnouncementEvent(announcement.id, {
    username: normalizedUsername,
    event_type: 'reward_claim',
    client_version: options.version || '',
    client_channel: options.channel || '',
    detail: {
      reward_count: announcement.rewards.length,
      already_applied: result?.already_applied === true,
    },
  }).catch(() => {});

  return { announcement, result };
}

function toPublicAnnouncement(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    image_url: announcement.image_url,
    version: announcement.version,
    target_versions: announcement.target_versions,
    target_channels: announcement.target_channels,
    start_at: announcement.start_at,
    end_at: announcement.end_at,
    priority: announcement.priority,
    status: announcement.status,
    cta_text: announcement.cta_text,
    cta_url: announcement.cta_url,
    button_texts: announcement.button_texts,
    template_type: announcement.template_type,
    show_save_update_button: announcement.show_save_update_button === true,
    is_pinned: announcement.is_pinned === true,
    is_read: announcement.is_read === true,
    rewards: Array.isArray(announcement.rewards) ? announcement.rewards.map(item => ({ ...item })) : [],
    duplicate_compensation_money: announcement.duplicate_compensation_money,
    published_at: announcement.published_at,
    created_at: announcement.created_at,
  };
}

module.exports = {
  ANNOUNCEMENT_EVENT_TYPES,
  DEFAULT_BUTTON_TEXTS,
  getTemplates: () => TEMPLATES.map(item => ({ ...item })),
  normalizeAnnouncementInput,
  sanitizeUrl,
  upsertAnnouncement,
  getAnnouncement,
  listAdminAnnouncements,
  publishAnnouncement,
  offlineAnnouncement,
  deleteAnnouncement,
  listActiveAnnouncements,
  listPublicHistory,
  recordAnnouncementEvent,
  recordAnnouncementEventsBatch,
  getAnnouncementStats,
  claimAnnouncementReward,
  toPublicAnnouncement,
  ensureMysqlReady,
  MYSQL_ENABLED,
};
