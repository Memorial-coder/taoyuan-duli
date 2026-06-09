const net = require('net');

function createValidationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeAllowlist(allowlist = []) {
  if (Array.isArray(allowlist)) {
    return allowlist
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }
  return String(allowlist || '')
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeHostname(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isBlockedIpv4(hostname = '') {
  const parts = hostname.split('.').map(item => Number(item));
  if (parts.length !== 4 || parts.some(item => !Number.isInteger(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
  );
}

function parseIpv4MappedIpv6Address(hostname = '') {
  const normalized = normalizeHostname(hostname);
  const match = normalized.match(/^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f:.]+)$/i);
  if (!match) return '';
  const suffix = match[1];
  if (net.isIP(suffix) === 4) return suffix;

  const groups = suffix.split(':');
  if (groups.length !== 2) return '';
  const high = Number.parseInt(groups[0], 16);
  const low = Number.parseInt(groups[1], 16);
  if (
    !Number.isInteger(high)
    || !Number.isInteger(low)
    || high < 0
    || high > 0xffff
    || low < 0
    || low > 0xffff
  ) {
    return '';
  }
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

function isBlockedIpv6(hostname = '') {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  const mappedIpv4 = parseIpv4MappedIpv6Address(normalized);
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab][0-9a-f]?:/i.test(normalized) || normalized.startsWith('fe80:')) return true;
  return false;
}

function isBlockedModelApiHostname(hostname = '') {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isBlockedIpv4(normalized);
  if (ipVersion === 6) return isBlockedIpv6(normalized);
  return false;
}

function modelApiUrlMatchesAllowlist(url, allowlist = []) {
  const normalizedAllowlist = normalizeAllowlist(allowlist);
  if (!normalizedAllowlist.length) return true;
  const href = url.href.replace(/\/+$/, '');
  const hostname = normalizeHostname(url.hostname);

  return normalizedAllowlist.some(pattern => {
    const raw = String(pattern || '').trim();
    if (!raw) return false;
    if (/^https?:\/\//i.test(raw)) {
      const prefix = raw.replace(/\/+$/, '');
      return href === prefix || href.startsWith(`${prefix}/`);
    }
    const normalizedPattern = normalizeHostname(raw);
    if (!normalizedPattern) return false;
    if (normalizedPattern.startsWith('*.')) {
      const suffix = normalizedPattern.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === normalizedPattern;
  });
}

function validateModelApiUrl(apiUrl = '', options = {}) {
  const trimmed = String(apiUrl || '').trim();
  const allowlist = normalizeAllowlist(options.allowlist);
  if (!trimmed) return { ok: true, url: null, allowlist };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw createValidationError('模型 API 地址必须是完整 URL', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createValidationError('模型 API 地址只允许 HTTP(S) 协议', 400);
  }
  if (options.production === true && parsed.protocol !== 'https:') {
    throw createValidationError('生产环境模型 API 地址必须使用 HTTPS', 400);
  }
  if (isBlockedModelApiHostname(parsed.hostname)) {
    throw createValidationError('模型 API 地址禁止指向 localhost、内网、保留地址或 link-local 地址', 400);
  }

  if (!modelApiUrlMatchesAllowlist(parsed, allowlist)) {
    throw createValidationError('模型 API 地址不在允许域名或前缀列表中', 400);
  }

  return { ok: true, url: parsed, allowlist };
}

module.exports = {
  normalizeHostname,
  isBlockedIpv4,
  parseIpv4MappedIpv6Address,
  isBlockedIpv6,
  isBlockedModelApiHostname,
  modelApiUrlMatchesAllowlist,
  validateModelApiUrl,
};
