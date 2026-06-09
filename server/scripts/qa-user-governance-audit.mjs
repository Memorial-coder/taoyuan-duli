import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-user-audit-'));
const storageFile = path.join(tempDir, 'users.json');
const savesDir = path.join(tempDir, 'taoyuan_saves');
const host = '127.0.0.1';
const adminToken = 'qa_user_audit_admin_token_20260605';
const rawUaSentinel = 'QA_USER_AUDIT_RAW_UA_SHOULD_NOT_EXIST';
const rawPasswordSentinel = 'QA_SECRET_PASSWORD_SHOULD_NOT_EXIST_123!';
const rawSaveSentinel = 'QA_SECRET_SAVE_RAW_SHOULD_NOT_APPEAR';
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

async function findPort(start = 4473) {
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

async function adminRequest(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'User-Agent': rawUaSentinel,
      'X-Admin-Token': adminToken,
      ...(init.headers || {}),
    },
    body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  return { response, data: await parseJsonSafe(response) };
}

async function adminTextRequest(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      'User-Agent': rawUaSentinel,
      'X-Admin-Token': adminToken,
      ...(init.headers || {}),
    },
  });
  return { response, text: await response.text() };
}

async function register(session, username, displayName = username) {
  const result = await session.request('/api/register', {
    method: 'POST',
    csrf: false,
    body: {
      username,
      display_name: displayName,
      password: 'QaUserAuditPass123!',
    },
  });
  assert.equal(result.response.status, 200, `register ${username} should succeed`);
  assert.equal(result.data?.ok, true, `register ${username} should return ok=true`);
}

async function writeSave(username, rawSuffix = '') {
  await fs.mkdir(savesDir, { recursive: true });
  const raw = `${rawSaveSentinel}:${username}:${rawSuffix}`;
  await fs.writeFile(
    path.join(savesDir, `${username}.json`),
    JSON.stringify({ slots: { 0: { raw, revision: 1 }, 1: null, 2: null } }, null, 2),
    'utf8',
  );
}

function auditDetail(log) {
  if (log?.detail && typeof log.detail === 'object') return log.detail;
  try {
    return JSON.parse(log?.detail || '{}');
  } catch {
    return {};
  }
}

async function listAuditLogs(baseUrl) {
  const result = await adminRequest(baseUrl, '/api/admin/audit-logs?page_size=200');
  assert.equal(result.response.status, 200, 'admin audit logs should be readable');
  return Array.isArray(result.data?.logs) ? result.data.logs : [];
}

function findAudit(logs, action, predicate = () => true) {
  return logs.find(log => log.action === action && predicate(auditDetail(log)));
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
      SECRET_KEY: 'qa_user_audit_secret_key_20260605',
      ADMIN_TOKEN: adminToken,
      SUPER_ADMIN_TOKEN: adminToken,
      AUDIT_HASH_SALT: 'qa-user-audit-salt',
      CONTENT_MODERATION_AUDIT_SALT: 'qa-user-audit-content-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const usernames = [
    'qa_quota_user',
    'qa_password_user',
    'qa_status_user',
    'qa_save_source',
    'qa_save_target',
    'qa_delete_user',
    'qa_batch_user_a',
    'qa_batch_user_b',
  ];
  for (const username of usernames) {
    await register(new QaSession(baseUrl), username, username);
  }
  await writeSave('qa_save_source', 'source');
  await writeSave('qa_delete_user', 'delete');
  await writeSave('qa_batch_user_a', 'batch-a');
  await writeSave('qa_batch_user_b', 'batch-b');

  const quotaResult = await adminRequest(baseUrl, '/api/admin/users/qa_quota_user/quota', {
    method: 'POST',
    body: { quota: 12345, reason: 'QA quota reason', admin_note: 'QA quota note' },
  });
  assert.equal(quotaResult.response.status, 200, 'quota update should succeed');

  const resetResult = await adminRequest(baseUrl, '/api/admin/users/qa_password_user/reset-password', {
    method: 'POST',
    body: { new_password: rawPasswordSentinel, reason: 'QA reset reason', admin_note: 'QA reset note' },
  });
  assert.equal(resetResult.response.status, 200, 'password reset should succeed');

  const banResult = await adminRequest(baseUrl, '/api/admin/users/qa_status_user/status', {
    method: 'POST',
    body: { status: 'banned', reason: 'QA ban reason', admin_note: 'QA ban note' },
  });
  assert.equal(banResult.response.status, 200, 'status ban should succeed');
  assert.equal(banResult.data?.user?.status, 'banned', 'status route should ban user');

  const unbanResult = await adminRequest(baseUrl, '/api/admin/taoyuan/users/qa_status_user/unban', {
    method: 'POST',
    body: { reason: 'QA unban reason', admin_note: 'QA unban note' },
  });
  assert.equal(unbanResult.response.status, 200, 'content governance unban should succeed');
  assert.equal(unbanResult.data?.user?.status, 'active', 'unban route should restore user');

  const exportResult = await adminTextRequest(baseUrl, '/api/admin/users/qa_save_source/save/export?reason=QA%20export%20reason&admin_note=QA%20export%20note');
  assert.equal(exportResult.response.status, 200, 'save export should succeed');
  assert.ok(exportResult.text.includes(rawSaveSentinel), 'export response should contain save content for admin download');

  const migrateResult = await adminRequest(baseUrl, '/api/admin/users/qa_save_source/save/migrate', {
    method: 'POST',
    body: {
      target_username: 'qa_save_target',
      overwrite: false,
      reason: 'QA migrate reason',
      admin_note: 'QA migrate note',
    },
  });
  assert.equal(migrateResult.response.status, 200, 'save migration should succeed');
  assert.equal(migrateResult.data?.target, 'qa_save_target', 'save migration should return target user');

  const deleteResult = await adminRequest(baseUrl, '/api/admin/users/qa_delete_user', {
    method: 'DELETE',
    body: { reason: 'QA delete reason', admin_note: 'QA delete note' },
  });
  assert.equal(deleteResult.response.status, 200, 'single user delete should succeed');

  const batchDeleteResult = await adminRequest(baseUrl, '/api/admin/users/batch-delete', {
    method: 'POST',
    body: {
      usernames: ['qa_batch_user_a', 'qa_batch_user_b', 'qa_missing_batch_user'],
      reason: 'QA batch delete reason',
      admin_note: 'QA batch delete note',
    },
  });
  assert.equal(batchDeleteResult.response.status, 200, 'batch user delete should succeed');
  assert.equal(batchDeleteResult.data?.deleted_usernames?.length, 2, 'batch delete should remove two users');
  assert.ok(batchDeleteResult.data?.missing_usernames?.includes('qa_missing_batch_user'), 'batch delete should report missing users');

  const logs = await listAuditLogs(baseUrl);
  const quotaAudit = findAudit(logs, 'set_user_quota', detail => detail.target_id === 'qa_quota_user');
  assert.ok(quotaAudit, 'quota update should create admin audit');
  assert.equal(auditDetail(quotaAudit).target_type, 'user', 'quota audit should include target type');
  assert.equal(auditDetail(quotaAudit).before_quota, 2000000, 'quota audit should include before quota');
  assert.equal(auditDetail(quotaAudit).after_quota, 12345, 'quota audit should include after quota');
  assert.ok(auditDetail(quotaAudit).ip_hash, 'quota audit should contain IP hash');
  assert.ok(auditDetail(quotaAudit).ua_hash, 'quota audit should contain UA hash');

  const resetAudit = findAudit(logs, 'reset_user_password', detail => detail.target_id === 'qa_password_user');
  assert.ok(resetAudit, 'password reset should create admin audit');
  assert.equal(auditDetail(resetAudit).target_type, 'user_credential', 'password reset audit should include credential target type');
  assert.equal(auditDetail(resetAudit).credential_changed, true, 'password reset audit should record credential rotation');

  const banAudit = findAudit(logs, 'set_user_status', detail => detail.target_id === 'qa_status_user' && detail.after_status === 'banned');
  assert.ok(banAudit, 'user ban should create status audit');
  assert.equal(auditDetail(banAudit).before_status, 'active', 'ban audit should include before status');
  assert.equal(auditDetail(banAudit).evidence_retention, 'major', 'ban audit should be major evidence');

  const unbanAudit = findAudit(logs, 'unban_user', detail => detail.target_id === 'qa_status_user');
  assert.ok(unbanAudit, 'content governance unban should create audit');
  assert.equal(auditDetail(unbanAudit).before_status, 'banned', 'unban audit should include before status');
  assert.equal(auditDetail(unbanAudit).after_status, 'active', 'unban audit should include after status');

  const userDetail = await adminRequest(baseUrl, '/api/admin/users/qa_status_user');
  assert.equal(userDetail.response.status, 200, 'admin user detail should be readable');
  const recentGovernanceLogs = userDetail.data?.user?.recent_governance_logs || [];
  assert.ok(
    recentGovernanceLogs.some(log => log.action === 'unban_user' && auditDetail(log).target_id === 'qa_status_user'),
    'user detail should include recent unban governance audit',
  );
  assert.ok(
    recentGovernanceLogs.some(log => log.action === 'set_user_status' && auditDetail(log).after_status === 'banned'),
    'user detail should include recent ban governance audit',
  );

  const exportAudit = findAudit(logs, 'export_user_save', detail => detail.target_id === 'qa_save_source');
  assert.ok(exportAudit, 'save export should create admin audit');
  assert.equal(auditDetail(exportAudit).target_type, 'user_save', 'save export audit should include save target type');
  assert.equal(auditDetail(exportAudit).save_summary?.slot_count, 1, 'save export audit should include save summary');
  assert.equal(auditDetail(exportAudit).save_summary?.slots?.[0]?.raw_length > 0, true, 'save export audit should include slot raw length only');

  const migrateAudit = findAudit(logs, 'migrate_user_save', detail => detail.target_id === 'qa_save_source->qa_save_target');
  assert.ok(migrateAudit, 'save migration should create admin audit');
  assert.equal(auditDetail(migrateAudit).target_type, 'user_save_migration', 'migration audit should include target type');
  assert.equal(auditDetail(migrateAudit).before_status, 'target_save_missing', 'migration audit should include target before status');
  assert.equal(auditDetail(migrateAudit).after_status, 'target_save_exists', 'migration audit should include target after status');
  assert.equal(auditDetail(migrateAudit).source_save?.slot_count, 1, 'migration audit should include source save summary');

  const deleteAudit = findAudit(logs, 'delete_user', detail => detail.target_type === 'user' && detail.target_id === 'qa_delete_user');
  assert.ok(deleteAudit, 'single user delete should create admin audit');
  assert.equal(auditDetail(deleteAudit).before_status, 'active', 'delete audit should include before status');
  assert.equal(auditDetail(deleteAudit).after_status, 'deleted', 'delete audit should include after status');
  assert.equal(auditDetail(deleteAudit).deleted_save?.slot_count, 1, 'delete audit should include deleted save summary');
  assert.equal(auditDetail(deleteAudit).evidence_retention, 'major', 'delete audit should be major evidence');

  const batchAudit = findAudit(logs, 'delete_user', detail => detail.target_type === 'user_batch');
  assert.ok(batchAudit, 'batch user delete should create admin audit');
  assert.equal(auditDetail(batchAudit).count, 2, 'batch delete audit should include count');
  assert.equal(auditDetail(batchAudit).deleted_users?.length, 2, 'batch delete audit should include deleted user summaries');
  assert.ok(auditDetail(batchAudit).missing_usernames?.includes('qa_missing_batch_user'), 'batch delete audit should include missing usernames');

  const serializedLogs = JSON.stringify(logs);
  assert.ok(!serializedLogs.includes('127.0.0.1'), 'admin audit logs should not expose raw IP');
  assert.ok(!serializedLogs.includes(rawUaSentinel), 'admin audit logs should not expose raw UA');
  assert.ok(!serializedLogs.includes(rawPasswordSentinel), 'admin audit logs should not expose raw password');
  assert.ok(!serializedLogs.includes(rawSaveSentinel), 'admin audit logs should not expose raw save content');
  assert.ok(!serializedLogs.includes(`${tempDir}`), 'admin audit logs should not expose local temp paths');

  console.log('qa-user-governance-audit passed');
} catch (error) {
  console.error('[qa-user-governance-audit] FAILED');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}
