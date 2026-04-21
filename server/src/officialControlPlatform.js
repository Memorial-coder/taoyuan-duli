const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const CURRENT_FILE = path.join(DATA_DIR, 'official_control_current.json');
const RELEASES_FILE = path.join(DATA_DIR, 'official_control_releases.json');
const INSTANCES_FILE = path.join(DATA_DIR, 'official_control_instances.json');
const DEFAULT_ALLOWED_HOSTS = ['taoyuan.ymzcc.com', 'localhost', '127.0.0.1'];
const DEFAULT_RELEASE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MANAGED_KEYS = Object.freeze([
  'ai_assistant_console_credit',
  'ai_assistant_name',
  'ai_assistant_welcome',
  'taoyuan_about_dialog_title',
  'taoyuan_about_dialog_content',
]);

const DEFAULT_VALUES = Object.freeze({
  ai_assistant_console_credit:
    '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186',
  ai_assistant_name: '桃源小助理',
  ai_assistant_welcome:
    '你好，我是桃源小助理。你可以问我玩法、系统机制、资源获取和攻略建议；如果是严格模式，我不会回答敏感数值、隐藏掉率或后台规则。',
  taoyuan_about_dialog_title: '关于桃源乡',
  taoyuan_about_dialog_content: '欢迎来到桃源乡独立版。这是一款以种田、采集、养殖、钓鱼和经营为核心的文字田园模拟游戏。',
});

function parseBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseAllowedHosts() {
  const raw = String(process.env.OFFICIAL_CONTROL_UI_ALLOWED_HOSTS || '').trim();
  const values = (raw ? raw.split(',') : DEFAULT_ALLOWED_HOSTS)
    .map(item => String(item || '').trim().toLowerCase())
    .filter(Boolean);
  return values.length ? Array.from(new Set(values)) : [...DEFAULT_ALLOWED_HOSTS];
}

function getRuntimeConfig() {
  const enabled = parseBoolean(process.env.OFFICIAL_CONTROL_PLATFORM_ENABLED);
  const allowedHosts = parseAllowedHosts();
  const adminPassword = String(process.env.OFFICIAL_CONTROL_ADMIN_PASSWORD || '').trim();
  const privateKeyPem = String(process.env.OFFICIAL_CONTROL_PRIVATE_KEY || '').trim();
  const primaryHost = allowedHosts.find(host => !['localhost', '127.0.0.1', '::1'].includes(host)) || allowedHosts[0] || 'taoyuan.ymzcc.com';
  return {
    enabled,
    allowedHosts,
    adminPassword,
    privateKeyPem,
    profileId: `official:${primaryHost}`,
  };
}

function isPlatformEnabled() {
  return getRuntimeConfig().enabled;
}

function normalizeHost(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isHostAllowed(hostname) {
  const host = normalizeHost(hostname);
  if (!host) return false;
  return getRuntimeConfig().allowedHosts.includes(host);
}

function normalizeOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    throw createError('public_origin 格式无效', 400);
  }
}

function normalizeOriginList(values) {
  const input = Array.isArray(values)
    ? values
    : String(values || '')
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  const normalized = input
    .map(item => normalizeOrigin(item))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function normalizeManagedValues(values = {}) {
  const normalized = {};
  for (const key of MANAGED_KEYS) {
    const value = values?.[key];
    if (value === undefined || value === null) {
      normalized[key] = DEFAULT_VALUES[key];
      continue;
    }
    if (key === 'ai_assistant_name' || key === 'taoyuan_about_dialog_title') {
      normalized[key] = String(value).trim() || DEFAULT_VALUES[key];
      continue;
    }
    normalized[key] = String(value).replace(/\r\n/g, '\n').trim() || DEFAULT_VALUES[key];
  }
  return normalized;
}

function readCurrentStore() {
  return readJson(CURRENT_FILE, { release: null });
}

function writeCurrentStore(release) {
  writeJson(CURRENT_FILE, { release });
}

function readReleaseStore() {
  const raw = readJson(RELEASES_FILE, { releases: [] });
  return Array.isArray(raw.releases) ? raw.releases : [];
}

function writeReleaseStore(releases) {
  writeJson(RELEASES_FILE, { releases });
}

function readInstanceStore() {
  const raw = readJson(INSTANCES_FILE, { instances: [] });
  return Array.isArray(raw.instances) ? raw.instances : [];
}

function writeInstanceStore(instances) {
  writeJson(INSTANCES_FILE, { instances });
}

function createInternalId(prefix) {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildVersion() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getPrivateKey() {
  const runtime = getRuntimeConfig();
  if (!runtime.privateKeyPem) {
    throw createError('OFFICIAL_CONTROL_PRIVATE_KEY 未配置', 500);
  }
  return crypto.createPrivateKey(runtime.privateKeyPem.replace(/\\n/g, '\n'));
}

function buildEnvelopePayload(envelope) {
  return JSON.stringify({
    profileId: String(envelope.profileId || '').trim(),
    version: String(envelope.version || '').trim(),
    issuedAt: Number(envelope.issuedAt) || 0,
    expiresAt: Number(envelope.expiresAt) || 0,
    values: normalizeManagedValues(envelope.values || {}),
  });
}

function sanitizeReleaseRecord(record) {
  if (!record || typeof record !== 'object') return null;
  return {
    id: String(record.id || ''),
    profileId: String(record.profileId || ''),
    version: String(record.version || ''),
    issuedAt: Number(record.issuedAt) || 0,
    expiresAt: Number(record.expiresAt) || 0,
    createdAt: Number(record.createdAt) || 0,
    operatorName: String(record.operatorName || ''),
    operatorRole: String(record.operatorRole || ''),
    values: normalizeManagedValues(record.values || {}),
    signature: String(record.signature || ''),
  };
}

function getCurrentRelease() {
  const store = readCurrentStore();
  const release = sanitizeReleaseRecord(store.release);
  return release?.id ? release : null;
}

function getCurrentEnvelope() {
  const release = getCurrentRelease();
  if (!release) return null;
  return {
    profileId: release.profileId,
    version: release.version,
    issuedAt: release.issuedAt,
    expiresAt: release.expiresAt,
    values: normalizeManagedValues(release.values),
    signature: release.signature,
  };
}

function listReleaseRecords(limit = 20) {
  return readReleaseStore()
    .map(sanitizeReleaseRecord)
    .filter(item => item && item.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 20)));
}

function makeLicenseSecret() {
  return `oc_${crypto.randomBytes(18).toString('base64url')}`;
}

function hashLicense(plainText, salt) {
  return crypto.scryptSync(String(plainText || ''), String(salt || ''), 32).toString('base64');
}

function sanitizeInstanceRecord(record) {
  if (!record || typeof record !== 'object') return null;
  return {
    id: String(record.id || ''),
    instanceId: String(record.instanceId || ''),
    label: String(record.label || ''),
    enabled: record.enabled !== false,
    allowedOrigins: normalizeOriginList(record.allowedOrigins || []),
    createdAt: Number(record.createdAt) || 0,
    updatedAt: Number(record.updatedAt) || 0,
    lastResetAt: Number(record.lastResetAt) || 0,
  };
}

function listInstances() {
  return readInstanceStore()
    .map(item => ({
      raw: item,
      safe: sanitizeInstanceRecord(item),
    }))
    .filter(item => item.safe && item.safe.id)
    .map(item => item.safe)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function assertPlatformEnabled() {
  const runtime = getRuntimeConfig();
  if (!runtime.enabled) {
    throw createError('官方云控平台未启用', 404);
  }
  if (!runtime.adminPassword) {
    throw createError('OFFICIAL_CONTROL_ADMIN_PASSWORD 未配置', 500);
  }
  if (!runtime.privateKeyPem) {
    throw createError('OFFICIAL_CONTROL_PRIVATE_KEY 未配置', 500);
  }
  return runtime;
}

function publishRelease(input = {}, operator = {}) {
  const runtime = assertPlatformEnabled();
  const values = normalizeManagedValues(input.values || input);
  const issuedAt = Date.now();
  const release = {
    id: createInternalId('oc_release'),
    profileId: runtime.profileId,
    version: buildVersion(),
    issuedAt,
    expiresAt: issuedAt + DEFAULT_RELEASE_TTL_MS,
    createdAt: issuedAt,
    operatorName: String(operator.operatorName || operator.operator_name || ''),
    operatorRole: String(operator.operatorRole || operator.operator_role || ''),
    values,
  };
  const signature = crypto.sign(null, Buffer.from(buildEnvelopePayload(release), 'utf8'), getPrivateKey()).toString('base64url');
  release.signature = signature;

  const releases = readReleaseStore();
  releases.unshift(release);
  writeReleaseStore(releases.slice(0, 200));
  writeCurrentStore(release);
  return sanitizeReleaseRecord(release);
}

function createInstance(input = {}) {
  assertPlatformEnabled();
  const label = String(input.label || '').trim();
  const instanceId = String(input.instanceId || '').trim();
  if (!instanceId) throw createError('实例 ID 不能为空');
  if (!/^[a-zA-Z0-9._:-]{3,80}$/.test(instanceId)) {
    throw createError('实例 ID 仅支持字母、数字、点、下划线、冒号和短横线，长度 3-80');
  }

  const instances = readInstanceStore();
  if (instances.some(item => String(item.instanceId || '').trim() === instanceId)) {
    throw createError('实例 ID 已存在');
  }

  const allowedOrigins = normalizeOriginList(input.allowedOrigins || []);
  if (!allowedOrigins.length) {
    throw createError('至少需要配置一个允许的 public_origin');
  }
  const plainLicenseKey = makeLicenseSecret();
  const salt = crypto.randomBytes(16).toString('base64');
  const now = Date.now();
  const record = {
    id: createInternalId('oc_instance'),
    instanceId,
    label: label || instanceId,
    enabled: input.enabled !== false,
    allowedOrigins,
    createdAt: now,
    updatedAt: now,
    lastResetAt: now,
    licenseSalt: salt,
    licenseHash: hashLicense(plainLicenseKey, salt),
  };
  instances.push(record);
  writeInstanceStore(instances);

  return {
    instance: sanitizeInstanceRecord(record),
    licenseKey: plainLicenseKey,
  };
}

function updateInstanceStatus(id, input = {}) {
  assertPlatformEnabled();
  const instances = readInstanceStore();
  const target = instances.find(item => String(item.id || '') === String(id || '').trim());
  if (!target) throw createError('实例不存在', 404);

  if (input.enabled !== undefined) {
    target.enabled = input.enabled === true;
  }
  if (input.allowedOrigins !== undefined) {
    const allowedOrigins = normalizeOriginList(input.allowedOrigins);
    if (!allowedOrigins.length) {
      throw createError('至少需要保留一个允许的 public_origin');
    }
    target.allowedOrigins = allowedOrigins;
  }
  target.updatedAt = Date.now();
  writeInstanceStore(instances);
  return sanitizeInstanceRecord(target);
}

function resetInstanceLicense(id) {
  assertPlatformEnabled();
  const instances = readInstanceStore();
  const target = instances.find(item => String(item.id || '') === String(id || '').trim());
  if (!target) throw createError('实例不存在', 404);

  const plainLicenseKey = makeLicenseSecret();
  const salt = crypto.randomBytes(16).toString('base64');
  const now = Date.now();
  target.licenseSalt = salt;
  target.licenseHash = hashLicense(plainLicenseKey, salt);
  target.lastResetAt = now;
  target.updatedAt = now;
  writeInstanceStore(instances);

  return {
    instance: sanitizeInstanceRecord(target),
    licenseKey: plainLicenseKey,
  };
}

function verifyAdminPassword(password) {
  const runtime = assertPlatformEnabled();
  const expected = Buffer.from(runtime.adminPassword, 'utf8');
  const actual = Buffer.from(String(password || ''), 'utf8');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function getPlatformStatus(options = {}) {
  const runtime = getRuntimeConfig();
  const current = getCurrentRelease();
  return {
    enabled: runtime.enabled,
    hostAllowed: isHostAllowed(options.hostname),
    requiresSecondAuth: true,
    secondAuthVerified: options.secondAuthVerified === true,
    allowedHosts: [...runtime.allowedHosts],
    profileId: current?.profileId || runtime.profileId,
    currentVersion: current?.version || '',
    currentIssuedAt: current?.issuedAt || 0,
    currentExpiresAt: current?.expiresAt || 0,
    releaseCount: readReleaseStore().length,
    instanceCount: readInstanceStore().length,
  };
}

function resolveDistributionConfig(input = {}) {
  assertPlatformEnabled();
  const instanceId = String(input.instanceId || '').trim();
  const licenseKey = String(input.licenseKey || '').trim();
  const publicOrigin = normalizeOrigin(input.publicOrigin);
  if (!instanceId) throw createError('缺少 X-Instance-Id', 400);
  if (!licenseKey) throw createError('缺少 X-License-Key', 400);
  if (!publicOrigin) throw createError('缺少 public_origin', 400);

  const instances = readInstanceStore();
  const target = instances.find(item => String(item.instanceId || '').trim() === instanceId);
  if (!target) throw createError('实例未授权', 403);
  if (target.enabled === false) throw createError('实例已被禁用', 403);
  const allowedOrigins = normalizeOriginList(target.allowedOrigins || []);
  if (!allowedOrigins.includes(publicOrigin)) {
    throw createError('public_origin 不在白名单内', 403);
  }

  const expectedHash = String(target.licenseHash || '');
  const nextHash = hashLicense(licenseKey, String(target.licenseSalt || ''));
  const expected = Buffer.from(expectedHash, 'base64');
  const actual = Buffer.from(nextHash, 'base64');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw createError('实例密钥无效', 403);
  }

  const envelope = getCurrentEnvelope();
  if (!envelope) {
    throw createError('官方配置尚未发布', 404);
  }
  return envelope;
}

module.exports = {
  MANAGED_KEYS,
  DEFAULT_VALUES,
  isPlatformEnabled,
  isHostAllowed,
  getPlatformStatus,
  getCurrentEnvelope,
  getCurrentRelease,
  listReleaseRecords,
  listInstances,
  publishRelease,
  createInstance,
  updateInstanceStatus,
  resetInstanceLicense,
  verifyAdminPassword,
  resolveDistributionConfig,
};
