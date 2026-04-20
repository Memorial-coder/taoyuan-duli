const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const CACHE_FILE = path.join(DATA_DIR, 'official_managed_config.json');
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_SEC = 3600;
const REFRESH_MIN_MS = 60 * 1000;
const REFRESH_MAX_MS = 15 * 60 * 1000;
const LOCALHOST_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const MANAGED_KEYS = Object.freeze([
  'ai_assistant_console_credit',
  'ai_assistant_name',
  'ai_assistant_welcome',
  'taoyuan_about_dialog_title',
  'taoyuan_about_dialog_content',
]);

const managedKeySet = new Set(MANAGED_KEYS);

let refreshTimer = null;
let refreshPromise = null;
let started = false;

const state = {
  enabled: false,
  configured: false,
  source: 'local_default',
  profileId: '',
  version: '',
  issuedAt: 0,
  expiresAt: 0,
  lastFetchedAt: 0,
  lastVerifiedAt: 0,
  lastError: '',
  values: {},
};

function parseBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toTimestampMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (parsed >= 1e12) return Math.floor(parsed);
  return Math.floor(parsed * 1000);
}

function normalizeManagedValues(values = {}) {
  const normalized = {};
  for (const key of MANAGED_KEYS) {
    if (values[key] === undefined || values[key] === null) continue;
    if (key === 'ai_assistant_name' || key === 'taoyuan_about_dialog_title') {
      normalized[key] = String(values[key]).trim();
      continue;
    }
    normalized[key] = String(values[key]).replace(/\r\n/g, '\n').trim();
  }
  return normalized;
}

function getRuntimeConfig() {
  const enabled = parseBoolean(process.env.OFFICIAL_CONTROL_ENABLED);
  const cacheTtlSec = parsePositiveInt(process.env.OFFICIAL_CONTROL_CACHE_TTL_SEC, DEFAULT_CACHE_TTL_SEC);
  const baseUrl = String(process.env.OFFICIAL_CONTROL_BASE_URL || '').trim();
  const instanceId = String(process.env.OFFICIAL_INSTANCE_ID || '').trim();
  const licenseKey = String(process.env.OFFICIAL_LICENSE_KEY || '').trim();
  const publicOrigin = String(process.env.OFFICIAL_PUBLIC_ORIGIN || '').trim();
  const publicKey = String(process.env.OFFICIAL_CONTROL_PUBLIC_KEY || '').trim();

  const missing = [];
  if (!baseUrl) missing.push('OFFICIAL_CONTROL_BASE_URL');
  if (!instanceId) missing.push('OFFICIAL_INSTANCE_ID');
  if (!licenseKey) missing.push('OFFICIAL_LICENSE_KEY');
  if (!publicOrigin) missing.push('OFFICIAL_PUBLIC_ORIGIN');
  if (!publicKey) missing.push('OFFICIAL_CONTROL_PUBLIC_KEY');

  return {
    enabled,
    configured: enabled ? missing.length === 0 : false,
    missing,
    cacheTtlSec,
    baseUrl,
    instanceId,
    licenseKey,
    publicOrigin,
    publicKey,
  };
}

function isAllowedInsecureOrigin(url) {
  return LOCALHOST_HOSTS.has(String(url.hostname || '').trim().toLowerCase());
}

function normalizePublicKey(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) throw new Error('缺少 OFFICIAL_CONTROL_PUBLIC_KEY');

  if (value.includes('BEGIN PUBLIC KEY')) {
    return crypto.createPublicKey(value.replace(/\\n/g, '\n'));
  }

  return crypto.createPublicKey({
    key: Buffer.from(value, 'base64'),
    format: 'der',
    type: 'spki',
  });
}

function decodeSignature(signature) {
  const normalized = String(signature || '').trim();
  if (!normalized) throw new Error('官方配置缺少签名');
  const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64');
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

function normalizeEnvelope(input = {}) {
  const raw = input && typeof input === 'object' && input.envelope && typeof input.envelope === 'object'
    ? input.envelope
    : input;
  return {
    profileId: String(raw.profileId || '').trim(),
    version: String(raw.version || '').trim(),
    issuedAt: toTimestampMs(raw.issuedAt),
    expiresAt: toTimestampMs(raw.expiresAt),
    values: normalizeManagedValues(raw.values || {}),
    signature: String(raw.signature || '').trim(),
  };
}

function updateStateFromEnvelope(envelope, source) {
  state.source = source;
  state.profileId = envelope.profileId;
  state.version = envelope.version;
  state.issuedAt = envelope.issuedAt;
  state.expiresAt = envelope.expiresAt;
  state.values = normalizeManagedValues(envelope.values);
}

function clearManagedValues(source = 'local_default') {
  state.source = source;
  state.profileId = '';
  state.version = '';
  state.issuedAt = 0;
  state.expiresAt = 0;
  state.values = {};
}

function readCacheEnvelope() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return {
      envelope: normalizeEnvelope(raw.envelope || raw),
      verifiedAt: toTimestampMs(raw.verifiedAt || raw.lastVerifiedAt),
    };
  } catch {
    return null;
  }
}

function writeCacheEnvelope(envelope) {
  const payload = {
    envelope: {
      profileId: envelope.profileId,
      version: envelope.version,
      issuedAt: envelope.issuedAt,
      expiresAt: envelope.expiresAt,
      values: normalizeManagedValues(envelope.values),
      signature: envelope.signature,
    },
    verifiedAt: state.lastVerifiedAt,
  };
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function isCacheStillValid(cacheEntry, runtimeConfig) {
  if (!cacheEntry?.envelope) return false;
  const verifiedAt = toTimestampMs(cacheEntry.verifiedAt);
  if (!verifiedAt) return false;
  const now = Date.now();
  if (runtimeConfig.cacheTtlSec > 0 && (verifiedAt + runtimeConfig.cacheTtlSec * 1000) <= now) {
    return false;
  }
  if (cacheEntry.envelope.expiresAt && cacheEntry.envelope.expiresAt <= now) {
    return false;
  }
  return true;
}

function restoreCachedEnvelope(runtimeConfig) {
  if (!runtimeConfig.enabled) return false;
  const cacheEntry = readCacheEnvelope();
  if (!isCacheStillValid(cacheEntry, runtimeConfig)) return false;
  state.lastVerifiedAt = toTimestampMs(cacheEntry.verifiedAt);
  updateStateFromEnvelope(cacheEntry.envelope, 'official_cached');
  return true;
}

function scheduleNextRefresh(runtimeConfig) {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (!runtimeConfig.enabled || !runtimeConfig.configured) return;
  const targetMs = Math.floor((runtimeConfig.cacheTtlSec * 1000) / 2);
  const intervalMs = Math.max(REFRESH_MIN_MS, Math.min(REFRESH_MAX_MS, targetMs || REFRESH_MAX_MS));
  refreshTimer = setInterval(() => {
    void refreshFromRemote('timer');
  }, intervalMs);
}

async function fetchRemoteEnvelope(runtimeConfig) {
  const targetUrl = new URL('/v1/instances/config/current', runtimeConfig.baseUrl);
  targetUrl.searchParams.set('public_origin', runtimeConfig.publicOrigin);

  if (targetUrl.protocol !== 'https:' && !isAllowedInsecureOrigin(targetUrl)) {
    throw new Error('OFFICIAL_CONTROL_BASE_URL 必须使用 HTTPS，除非显式指向 localhost/127.0.0.1');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Instance-Id': runtimeConfig.instanceId,
        'X-License-Key': runtimeConfig.licenseKey,
      },
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = String(data?.msg || data?.message || `官方配置中心请求失败（${response.status}）`).trim();
      throw new Error(message);
    }

    if (data?.ok === false) {
      throw new Error(String(data?.msg || data?.message || '官方配置中心拒绝了当前实例').trim());
    }

    return normalizeEnvelope(data?.envelope || data);
  } finally {
    clearTimeout(timeout);
  }
}

function verifyEnvelopeSignature(envelope, runtimeConfig) {
  const publicKey = normalizePublicKey(runtimeConfig.publicKey);
  if (!envelope.signature) throw new Error('官方配置缺少签名');
  if (!envelope.profileId) throw new Error('官方配置缺少 profileId');
  if (!envelope.version) throw new Error('官方配置缺少 version');

  const payload = Buffer.from(buildEnvelopePayload(envelope), 'utf8');
  const signature = decodeSignature(envelope.signature);
  const verified = crypto.verify(null, payload, publicKey, signature);
  if (!verified) {
    throw new Error('官方配置签名校验失败');
  }
}

async function refreshFromRemote(reason = 'manual') {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const runtimeConfig = getRuntimeConfig();
    state.enabled = runtimeConfig.enabled;
    state.configured = runtimeConfig.enabled ? runtimeConfig.configured : false;
    state.lastFetchedAt = Date.now();

    if (!runtimeConfig.enabled) {
      state.lastError = '';
      clearManagedValues('local_default');
      return getStatus();
    }

    if (!runtimeConfig.configured) {
      state.lastError = `官方云控配置不完整：${runtimeConfig.missing.join(', ')}`;
      restoreCachedEnvelope(runtimeConfig);
      if (state.source !== 'official_cached') {
        clearManagedValues('local_default');
      }
      return getStatus();
    }

    try {
      const envelope = await fetchRemoteEnvelope(runtimeConfig);
      verifyEnvelopeSignature(envelope, runtimeConfig);

      state.lastError = '';
      state.lastVerifiedAt = Date.now();
      updateStateFromEnvelope(envelope, 'official_live');
      writeCacheEnvelope(envelope);

      if (reason === 'startup') {
        console.log(`[official-control] 官方配置已启用，profile=${state.profileId} version=${state.version}`);
      }
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : '官方配置同步失败';
      const restored = restoreCachedEnvelope(runtimeConfig);
      if (!restored) {
        clearManagedValues('local_default');
      }
      if (reason === 'startup') {
        console.warn(`[official-control] ${state.lastError}${restored ? '，已回退到本地缓存' : '，已回退到仓库默认值'}`);
      }
    }

    return getStatus();
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function start() {
  if (started) return getStatus();
  started = true;

  const runtimeConfig = getRuntimeConfig();
  state.enabled = runtimeConfig.enabled;
  state.configured = runtimeConfig.enabled ? runtimeConfig.configured : false;
  restoreCachedEnvelope(runtimeConfig);
  scheduleNextRefresh(runtimeConfig);

  if (!runtimeConfig.enabled) return getStatus();
  return refreshFromRemote('startup');
}

function getEffectiveValue(key, fallbackValue) {
  if (!managedKeySet.has(key)) {
    return fallbackValue;
  }
  if (Object.prototype.hasOwnProperty.call(state.values, key)) {
    return state.values[key];
  }
  return fallbackValue;
}

function getStatus() {
  return {
    enabled: state.enabled,
    configured: state.configured,
    source: state.source,
    profileId: state.profileId,
    version: state.version,
    issuedAt: state.issuedAt,
    expiresAt: state.expiresAt,
    lastFetchedAt: state.lastFetchedAt,
    lastVerifiedAt: state.lastVerifiedAt,
    lastError: state.lastError,
    managedKeys: [...MANAGED_KEYS],
  };
}

module.exports = {
  MANAGED_KEYS,
  start,
  refreshFromRemote,
  getEffectiveValue,
  getStatus,
};
