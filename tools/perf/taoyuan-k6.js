import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'https://taoyuanxiang.ymzcc.com').replace(/\/+$/, '');
const DIRECT_URL = (__ENV.DIRECT_URL || '').replace(/\/+$/, '');
const USERS = parseUsers();
const INCLUDE_COLD_STATIC = String(__ENV.COLD_STATIC || 'true').toLowerCase() !== 'false';
const INCLUDE_WRITES = String(__ENV.INCLUDE_WRITES || 'false').toLowerCase() === 'true';
const INCLUDE_WS = String(__ENV.INCLUDE_WS || 'true').toLowerCase() !== 'false';
const INCLUDE_ANNOUNCEMENT_EVENTS = String(__ENV.INCLUDE_ANNOUNCEMENT_EVENTS || 'false').toLowerCase() === 'true';
const ANNOUNCEMENT_EVENT_LIMIT = Number(__ENV.ANNOUNCEMENT_EVENT_LIMIT || 30);
const CLIENT_VERSION = __ENV.CLIENT_VERSION || '3.0.0';
const CLIENT_CHANNEL = __ENV.CLIENT_CHANNEL || 'web';
const THINK_MIN_MS = Number(__ENV.THINK_MIN_MS || 500);
const THINK_MAX_MS = Number(__ENV.THINK_MAX_MS || 1500);
const WS_HOLD_MS = Number(__ENV.WS_HOLD_MS || 30000);
const WS_PING_INTERVAL_MS = Number(__ENV.WS_PING_INTERVAL_MS || 20000);
const TEST_MODE = String(__ENV.TEST_MODE || 'ramp').toLowerCase();
const CONSTANT_VUS = Number(__ENV.VUS || 1);
const CONSTANT_DURATION = __ENV.DURATION || '2m';
const EXTRA_STATIC_PATHS = parsePathList(__ENV.STATIC_ASSET_PATHS || '');

export const options = {
  scenarios: {
    controlled_load: buildScenario(),
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.98'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const apiDuration = new Trend('taoyuan_api_duration', true);
const staticDuration = new Trend('taoyuan_static_duration', true);
const expected401 = new Counter('taoyuan_expected_401');
const unexpectedErrors = new Counter('taoyuan_unexpected_errors');
const websocketFailures = new Rate('taoyuan_ws_failed');

const coreStaticPaths = [
  '/assets/vendor-core-B0RI-M_S.js',
  '/assets/index-BGFulVL_.js',
  '/assets/index-By_6VQ08.js',
  '/assets/useGameStore-CJPN-NFT.js',
  '/assets/zpix-dsbwOBew.woff2',
];

const manifestStaticPaths = [
  '/item/item-icon-manifest.json',
  '/crop/crop-asset-manifest.json',
  '/npc/npc-portrait-manifest.json',
  '/asset_fish_boss/fish-boss-asset-manifest.json',
];

const publicApiPaths = [
  ['/api/health', 200],
  ['/api/public-config', 200],
  ['/api/taoyuan/ai/config', 200],
  ['/api/taoyuan/announcements/active?limit=5', 200],
  ['/api/taoyuan/announcements/history?limit=10', 200],
  ['/api/taoyuan/hall/posts?page=1&page_size=10', 200],
  ['/api/me', USERS.length ? 200 : 401],
];

const loggedInReadPaths = [
  ['/api/taoyuan/save/slots', 200],
  ['/api/taoyuan/save/0', 200],
  ['/api/taoyuan/mail/inbox-status', 200],
  ['/api/taoyuan/mail/list', 200],
  ['/api/taoyuan/online/profile', 200],
  ['/api/taoyuan/online/social/relationships', 200],
  ['/api/taoyuan/online/social/discover?page=1&page_size=10', 200],
  ['/api/taoyuan/online/manor', 200],
  ['/api/taoyuan/online/manor/favorites/overview', 200],
  ['/api/taoyuan/online/festival/rooms', 200],
  ['/api/taoyuan/online/expedition/rooms', 200],
  ['/api/taoyuan/online/world-events', 200],
  ['/api/taoyuan/online/societies', 200],
  ['/api/taoyuan/online/orders', 200],
  ['/api/taoyuan/exchange-station/weekly', 200],
  ['/api/taoyuan/exchange-station/festival-stall', 200],
  ['/api/taoyuan/exchange-station/neighbors/consignments', 200],
  ['/api/taoyuan/exchange-station/ledger', 200],
  ['/api/taoyuan/exchange-station/governance', 200],
];

let loggedIn = false;
let csrfToken = '';
let cookieHeader = '';

function parseStages(raw) {
  return raw.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [target, duration] = part.split(':');
      return { target: Number(target), duration };
    });
}

function buildScenario() {
  if (TEST_MODE === 'constant') {
    return {
      executor: 'constant-vus',
      vus: Math.max(1, CONSTANT_VUS),
      duration: CONSTANT_DURATION,
      gracefulStop: '30s',
    };
  }
  return {
    executor: 'ramping-vus',
    stages: parseStages(__ENV.STAGES || '10:2m,30:2m,50:2m,80:2m,100:3m,0:30s'),
    gracefulRampDown: '30s',
  };
}

function parseUsers() {
  const raw = __ENV.USERS_JSON || (__ENV.USERS_JSON_FILE ? open(__ENV.USERS_JSON_FILE) : '');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && item.username && item.password)
      : [];
  } catch (error) {
    throw new Error(`USERS_JSON is invalid JSON: ${error.message}`);
  }
}

function parsePathList(raw) {
  return String(raw || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(path => path.startsWith('/') ? path : `/${path}`);
}

function url(path, base = BASE_URL) {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function wsUrl(path) {
  const base = BASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function chooseUser() {
  if (!USERS.length) return null;
  return USERS[(__VU - 1) % USERS.length];
}

function tagName(path) {
  return path
    .replace(/\?.*$/, '')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/ann_[a-z0-9_]+(?=\/|$)/gi, '/:id')
    .replace(/[a-f0-9-]{16,}/gi, ':id');
}

function recordResponse(res, expectedStatus, kind, path, method = 'GET') {
  const normalizedPath = tagName(path);
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const ok = check(res, {
    [`${kind} ${normalizedMethod} ${normalizedPath} status ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
  if (!ok && !(expectedStatus === 401 && res.status === 401)) unexpectedErrors.add(1);
  if (expectedStatus === 401 && res.status === 401) expected401.add(1);
  if (kind === 'api') {
    apiDuration.add(res.timings.duration, {
      endpoint: `${normalizedMethod} ${normalizedPath}`,
      method: normalizedMethod,
      path: normalizedPath,
      status: String(res.status),
    });
  }
  if (kind === 'static') {
    staticDuration.add(res.timings.duration, {
      endpoint: `${normalizedMethod} ${normalizedPath}`,
      method: normalizedMethod,
      path: normalizedPath,
      status: String(res.status),
    });
  }
}

function maybeSleep() {
  const spread = Math.max(0, THINK_MAX_MS - THINK_MIN_MS);
  sleep((THINK_MIN_MS + Math.random() * spread) / 1000);
}

function normalizeStaticPath(rawPath) {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed || /^(https?:)?\/\//i.test(trimmed)) return '';
  const withoutHash = trimmed.replace(/[?#].*$/, '');
  if (!withoutHash) return '';
  if (withoutHash.startsWith('./')) return `/${withoutHash.slice(2)}`;
  if (withoutHash.startsWith('/')) return withoutHash;
  return `/${withoutHash}`;
}

function extractStaticPathsFromHtml(html) {
  const paths = [];
  const pattern = /\b(?:src|href|data-src)=["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(String(html || '')))) {
    const path = normalizeStaticPath(match[1]);
    if (
      path.startsWith('/assets/') ||
      path.endsWith('.css') ||
      path.endsWith('.js') ||
      path.endsWith('.woff2')
    ) {
      paths.push(path);
    }
  }
  return paths;
}

function buildCookieHeader() {
  const cookies = http.cookieJar().cookiesForURL(BASE_URL);
  return Object.entries(cookies)
    .map(([key, value]) => {
      const cookieValue = Array.isArray(value) ? value[0] : value;
      return cookieValue ? `${key}=${cookieValue}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function sessionHeaders(extra = {}) {
  return cookieHeader
    ? { ...extra, Cookie: cookieHeader }
    : extra;
}

function loginOnce(force = false) {
  if (loggedIn && !force) return true;
  if (!USERS.length) return false;
  loggedIn = false;
  csrfToken = '';
  cookieHeader = '';
  const user = chooseUser();
  const res = http.post(url('/api/login'), JSON.stringify({
    username: user.username,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/login', kind: 'api' },
  });
  recordResponse(res, 200, 'api', '/api/login', 'POST');
  if (res.status !== 200) return false;

  cookieHeader = buildCookieHeader();
  const me = http.get(url('/api/me'), {
    headers: sessionHeaders(),
    tags: { name: 'GET /api/me', kind: 'api' },
  });
  recordResponse(me, 200, 'api', '/api/me');
  if (me.status === 200) {
    const body = me.json();
    csrfToken = String(body?.csrf_token || '');
    cookieHeader = buildCookieHeader();
    loggedIn = true;
    return true;
  }
  return false;
}

function coldStaticVisit() {
  if (!INCLUDE_COLD_STATIC || __ITER > 0) return;
  group('cold static resources', () => {
    const index = http.get(url('/'), {
      tags: { name: 'GET /', kind: 'static' },
    });
    recordResponse(index, 200, 'static', '/');
    maybeSleep();

    const paths = Array.from(new Set([
      ...extractStaticPathsFromHtml(index.body),
      ...coreStaticPaths,
      ...manifestStaticPaths,
      ...EXTRA_STATIC_PATHS,
    ]));
    for (const path of paths) {
      const res = http.get(url(path), {
        tags: { name: `GET ${tagName(path)}`, kind: 'static' },
      });
      recordResponse(res, 200, 'static', path);
      maybeSleep();
    }
  });
}

function publicApiVisit() {
  group('public and boot APIs', () => {
    for (const [path, expected] of publicApiPaths) {
      const res = http.get(url(path), {
        headers: path === '/api/me' ? sessionHeaders() : {},
        tags: { name: `GET ${tagName(path)}`, kind: 'api' },
      });
      recordResponse(res, expected, 'api', path);
      maybeSleep();
    }
  });
}

function announcementEventVisit() {
  if (!INCLUDE_ANNOUNCEMENT_EVENTS || __ITER > 0) return;
  group('announcement impression events', () => {
    const activePath = `/api/taoyuan/announcements/active?version=${encodeURIComponent(CLIENT_VERSION)}&channel=${encodeURIComponent(CLIENT_CHANNEL)}`;
    const active = http.get(url(activePath), {
      tags: { name: 'GET /api/taoyuan/announcements/active', kind: 'api' },
    });
    recordResponse(active, 200, 'api', '/api/taoyuan/announcements/active');
    if (active.status !== 200) return;

    const body = active.json();
    const announcements = Array.isArray(body?.announcements) ? body.announcements : [];
    for (const announcement of announcements.slice(0, Math.max(0, ANNOUNCEMENT_EVENT_LIMIT))) {
      if (!announcement?.id) continue;
      const eventPath = `/api/taoyuan/announcements/${encodeURIComponent(announcement.id)}/events`;
      const event = http.post(url(eventPath), JSON.stringify({
        event_type: 'impression',
        client_version: CLIENT_VERSION,
        client_channel: CLIENT_CHANNEL,
        detail: {
          source: 'k6',
          vu: __VU,
          iter: __ITER,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/taoyuan/announcements/:id/events', kind: 'api' },
      });
      recordResponse(event, 200, 'api', '/api/taoyuan/announcements/:id/events', 'POST');
      maybeSleep();
    }
  });
}

function loggedInReadVisit() {
  if (!USERS.length) return;
  loginOnce();
  if (!loggedIn) return;
  group('logged-in core read APIs', () => {
    for (const [path, expected] of loggedInReadPaths) {
      let res = http.get(url(path), {
        headers: sessionHeaders(),
        tags: { name: `GET ${tagName(path)}`, kind: 'api' },
      });
      if (res.status === 401 && loginOnce(true)) {
        res = http.get(url(path), {
          headers: sessionHeaders(),
          tags: { name: `GET ${tagName(path)}`, kind: 'api' },
        });
      }
      recordResponse(res, expected, 'api', path);
      maybeSleep();
    }
  });
}

function controlledWrites() {
  if (!INCLUDE_WRITES || !USERS.length || !loggedIn) return;
  group('controlled low-risk writes', () => {
    const headers = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    };
    const activeSlot = http.post(url('/api/taoyuan/save/active-slot'), JSON.stringify({ slot: 0 }), {
      headers: sessionHeaders(headers),
      tags: { name: 'POST /api/taoyuan/save/active-slot', kind: 'api' },
    });
    recordResponse(activeSlot, 200, 'api', '/api/taoyuan/save/active-slot', 'POST');

    const gameplayLog = http.post(url('/api/taoyuan/logs/gameplay/batch'), JSON.stringify({
      events: [{
        type: 'perf_test_ping',
        category: 'qa',
        route: '/perf',
        timestamp: Date.now(),
        meta: { vu: __VU, iter: __ITER },
      }],
    }), {
      headers: sessionHeaders({ 'Content-Type': 'application/json' }),
      tags: { name: 'POST /api/taoyuan/logs/gameplay/batch', kind: 'api' },
    });
    recordResponse(gameplayLog, 200, 'api', '/api/taoyuan/logs/gameplay/batch', 'POST');
  });
}

function websocketVisit() {
  if (!INCLUDE_WS || !USERS.length || !loggedIn || !cookieHeader || __ITER > 0) return;
  group('realtime websocket', () => {
    const res = ws.connect(wsUrl('/api/taoyuan/online/realtime'), {
      headers: { Cookie: cookieHeader },
      tags: { name: 'WS /api/taoyuan/online/realtime', kind: 'ws' },
    }, (socket) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'presence.snapshot', payload: {} }));
        socket.setInterval(() => {
          socket.send(JSON.stringify({ type: 'ping', payload: {} }));
        }, WS_PING_INTERVAL_MS);
        socket.setTimeout(() => socket.close(), WS_HOLD_MS);
      });
      socket.on('error', () => websocketFailures.add(1));
    });
    websocketFailures.add(res && res.status === 101 ? 0 : 1);
  });
}

function directBackendHealth() {
  if (!DIRECT_URL) return;
  const res = http.get(url('/api/health', DIRECT_URL), {
    tags: { name: 'DIRECT GET /api/health', kind: 'api' },
  });
  recordResponse(res, 200, 'api', '/api/health');
}

export default function () {
  if (USERS.length) loginOnce();
  coldStaticVisit();
  publicApiVisit();
  announcementEventVisit();
  loggedInReadVisit();
  controlledWrites();
  websocketVisit();
  directBackendHealth();
  maybeSleep();
}
