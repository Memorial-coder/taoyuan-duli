import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-user-ip-profile-'));
const storageFile = path.join(tempDir, 'users.json');
const host = '127.0.0.1';
const childAdminToken = 'qa_user_ip_admin_token_20260706';
const childSuperAdminToken = 'qa_user_ip_super_token_20260706';
dotenv.config({ path: path.join(serverRoot, '.env') });
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true });
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true });
const adminToken = String(process.env.ADMIN_TOKEN || childAdminToken).trim();
const superAdminToken = String(process.env.SUPER_ADMIN_TOKEN || childSuperAdminToken).trim();
const sharedIp = '198.51.100.77';
const sessionCheckIp = '203.0.113.88';
let serverProcess = null;

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findPort(start = 4491) {
  for (let port = start; port < start + 50; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error('no available QA port');
}

async function waitForServer(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) return;
  const child = serverProcess;
  await new Promise(resolve => {
    child.once('exit', () => resolve());
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      killer.once('exit', () => resolve());
      killer.once('error', () => {
        try {
          child.kill();
        } catch {}
        resolve();
      });
      return;
    }
    try {
      child.kill('SIGTERM');
    } catch {
      resolve();
    }
  });
}

function readSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

function mergeCookie(previousCookie, response) {
  const parts = new Map();
  for (const item of String(previousCookie || '').split(/;\s*/)) {
    const index = item.indexOf('=');
    if (index > 0) parts.set(item.slice(0, index), item.slice(index + 1));
  }
  for (const item of readSetCookie(response)) {
    const cookie = String(item || '').split(';')[0];
    const index = cookie.indexOf('=');
    if (index > 0) parts.set(cookie.slice(0, index), cookie.slice(index + 1));
  }
  return Array.from(parts.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

class QaSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
    this.csrfToken = '';
  }

  async request(pathname, init = {}) {
    const headers = {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...(init.csrf === false ? {} : (this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {})),
      ...(init.headers || {}),
    };
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...init,
      headers,
      body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
    });
    this.cookie = mergeCookie(this.cookie, response);
    const data = await parseJsonSafe(response);
    if (data?.csrf_token) this.csrfToken = data.csrf_token;
    return { response, data };
  }
}

async function adminRequest(baseUrl, token, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Admin-Token': token,
      'User-Agent': 'qa-user-ip-profile',
      ...(init.headers || {}),
    },
    body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  return { response, data: await parseJsonSafe(response) };
}

async function registerAndLogin(baseUrl, username) {
  const session = new QaSession(baseUrl);
  const register = await session.request('/api/register', {
    method: 'POST',
    csrf: false,
    headers: { 'X-Forwarded-For': `${sharedIp}, 10.0.0.1` },
    body: {
      username,
      display_name: username,
      password: 'QaUserIpPass123!',
    },
  });
  assert.equal(register.response.status, 200, `register ${username} should succeed`);
  assert.equal(register.data?.ok, true, `register ${username} should return ok=true`);

  const logout = await session.request('/api/logout', { method: 'POST' });
  assert.equal(logout.response.status, 200, `logout ${username} should succeed`);

  const login = await session.request('/api/login', {
    method: 'POST',
    csrf: false,
    headers: { 'X-Forwarded-For': `${sharedIp}, 10.0.0.2` },
    body: {
      username,
      password: 'QaUserIpPass123!',
    },
  });
  assert.equal(login.response.status, 200, `login ${username} should succeed`);
  assert.equal(login.data?.ok, true, `login ${username} should return ok=true`);
  return session;
}

function containsKey(value, key) {
  if (Array.isArray(value)) return value.some(item => containsKey(item, key));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([entryKey, entryValue]) => entryKey === key || containsKey(entryValue, key));
}

function auditDetail(log) {
  if (log?.detail && typeof log.detail === 'object') return log.detail;
  try {
    return JSON.parse(log?.detail || '{}');
  } catch {
    return {};
  }
}

try {
  const port = await findPort();
  const baseUrl = `http://${host}:${port}`;
  serverProcess = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_STORAGE: storageFile,
      QA_ONLINE_SMOKE_FORCE_LOCAL: 'true',
      MYSQL_HOST: '',
      MYSQL_USER: '',
      MYSQL_DATABASE: '',
      SECRET_KEY: 'qa_user_ip_secret_key_20260706',
      ADMIN_TOKEN: childAdminToken,
      SUPER_ADMIN_TOKEN: childSuperAdminToken,
      AUDIT_HASH_SALT: 'qa-user-ip-audit-salt',
      USER_IP_HASH_SALT: 'qa-user-ip-profile-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const sessionA = await registerAndLogin(baseUrl, 'qa_ip_user_a');
  await registerAndLogin(baseUrl, 'qa_ip_user_b');
  const sessionCheck = await sessionA.request('/api/me', {
    headers: { 'X-Forwarded-For': sessionCheckIp },
  });
  assert.equal(sessionCheck.response.status, 200, 'GET /api/me should succeed with session-check IP');

  const superDetail = await adminRequest(baseUrl, superAdminToken, '/api/admin/users/qa_ip_user_a');
  assert.equal(superDetail.response.status, 200, 'super admin user detail should be readable');
  assert.equal(superDetail.data?.user?.last_ip?.ip_address, sessionCheckIp, 'super admin last_ip should expose the latest full IP');

  const superProfile = await adminRequest(baseUrl, superAdminToken, '/api/admin/users/qa_ip_user_a/ip-profile');
  assert.equal(superProfile.response.status, 200, 'super admin IP profile should be readable');
  assert.ok(
    superProfile.data?.profile?.history?.some(entry => entry.ip_address === sharedIp),
    'super admin IP profile should include shared full IP history',
  );
  assert.ok(
    superProfile.data?.profile?.history?.some(entry => entry.sources?.some(source => source.source === 'register')),
    'IP profile should record register source',
  );
  assert.ok(
    superProfile.data?.profile?.history?.some(entry => entry.sources?.some(source => source.source === 'login')),
    'IP profile should record login source',
  );
  assert.ok(
    superProfile.data?.profile?.same_ip_users?.some(entry => entry.username === 'qa_ip_user_b' && entry.ip_address === sharedIp),
    'super admin profile should include same-IP user with full IP',
  );

  const superLookup = await adminRequest(baseUrl, superAdminToken, `/api/admin/user-ips?ip=${encodeURIComponent(sharedIp)}`);
  assert.equal(superLookup.response.status, 200, 'super admin reverse IP lookup should succeed');
  assert.equal(superLookup.data?.lookup?.ip_address, sharedIp, 'super admin lookup should expose full queried IP');
  assert.ok(
    superLookup.data?.lookup?.users?.some(entry => entry.username === 'qa_ip_user_a'),
    'reverse lookup should include first user',
  );
  assert.ok(
    superLookup.data?.lookup?.users?.some(entry => entry.username === 'qa_ip_user_b'),
    'reverse lookup should include second user',
  );

  const adminProfile = await adminRequest(baseUrl, adminToken, '/api/admin/users/qa_ip_user_a/ip-profile');
  assert.equal(adminProfile.response.status, 200, 'regular admin IP profile should be readable');
  assert.equal(containsKey(adminProfile.data?.profile, 'ip_address'), false, 'regular admin profile must not include ip_address fields');
  assert.equal(JSON.stringify(adminProfile.data).includes(sharedIp), false, 'regular admin profile must not include full shared IP');
  assert.ok(
    adminProfile.data?.profile?.history?.some(entry => entry.ip_display === '198.51.100.*'),
    'regular admin profile should include masked IP display',
  );

  const adminLookup = await adminRequest(baseUrl, adminToken, `/api/admin/user-ips?ip=${encodeURIComponent(sharedIp)}`);
  assert.equal(adminLookup.response.status, 200, 'regular admin reverse IP lookup should succeed');
  assert.equal(containsKey(adminLookup.data?.lookup, 'ip_address'), false, 'regular admin lookup must not include ip_address fields');
  assert.equal(JSON.stringify(adminLookup.data).includes(sharedIp), false, 'regular admin lookup must not include full queried IP');
  assert.equal(adminLookup.data?.lookup?.ip_display, '198.51.100.*', 'regular admin lookup should echo masked IP');

  const listResult = await adminRequest(baseUrl, adminToken, '/api/admin/users?page_size=20');
  assert.equal(listResult.response.status, 200, 'regular admin user list should be readable');
  assert.equal(containsKey(listResult.data?.users, 'ip_address'), false, 'regular admin user list must not include raw IP fields');
  assert.ok(
    listResult.data?.users?.some(user => user.username === 'qa_ip_user_a' && user.last_ip?.ip_display === '203.0.113.*'),
    'regular admin user list should show masked recent IP',
  );

  const auditLogs = await adminRequest(baseUrl, superAdminToken, '/api/admin/audit-logs?page_size=200');
  assert.equal(auditLogs.response.status, 200, 'super admin audit logs should be readable');
  const logs = Array.isArray(auditLogs.data?.logs) ? auditLogs.data.logs : [];
  const profileAudit = logs.find(log => log.action === 'view_user_ip_profile');
  const lookupAudit = logs.find(log => log.action === 'reverse_lookup_user_ip');
  assert.ok(profileAudit, 'view_user_ip_profile should write admin audit');
  assert.ok(lookupAudit, 'reverse_lookup_user_ip should write admin audit');
  assert.ok(auditDetail(profileAudit).target_ip_hashes?.length >= 1, 'profile audit should include target IP hashes');
  assert.ok(auditDetail(lookupAudit).target_ip_hash, 'reverse lookup audit should include target IP hash');
  assert.equal(JSON.stringify(logs).includes(sharedIp), false, 'admin audit logs must not include queried raw IP');

  const profileStore = JSON.parse(await fs.readFile(path.join(tempDir, 'user_ip_profiles.json'), 'utf8'));
  const sharedEntries = profileStore.profiles.filter(entry => entry.ip_address === sharedIp);
  assert.equal(sharedEntries.length, 2, 'local user_ip_profiles.json should store both users on shared IP');
  assert.ok(
    sharedEntries.every(entry => Number(entry.count) >= 2),
    'local user_ip_profiles.json should update counts for repeated register/login use',
  );

  console.log('qa-user-ip-profile passed');
} catch (error) {
  console.error('[qa-user-ip-profile] FAILED');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}
