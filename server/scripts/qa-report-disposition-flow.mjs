import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-report-flow-'));
const storageFile = path.join(tempDir, 'users.json');
const host = '127.0.0.1';
const adminToken = 'qa_report_flow_admin_token_20260605';
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

async function findPort(start = 4373) {
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
      'User-Agent': 'QA_REPORT_RAW_UA_SHOULD_NOT_EXIST',
      'X-Admin-Token': adminToken,
      ...(init.headers || {}),
    },
    body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  return { response, data: await parseJsonSafe(response) };
}

async function register(session, username, displayName = username) {
  const result = await session.request('/api/register', {
    method: 'POST',
    csrf: false,
    body: {
      username,
      display_name: displayName,
      password: 'QaReportFlowPass123!',
    },
  });
  assert.equal(result.response.status, 200, `register ${username} should succeed`);
  assert.equal(result.data?.ok, true, `register ${username} should return ok=true`);
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
  const result = await adminRequest(baseUrl, '/api/admin/audit-logs?page_size=120');
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
      SECRET_KEY: 'qa_report_flow_secret_key_20260605',
      ADMIN_TOKEN: adminToken,
      SUPER_ADMIN_TOKEN: adminToken,
      AUDIT_HASH_SALT: 'qa-report-flow-audit-salt',
      CONTENT_MODERATION_AUDIT_SALT: 'qa-report-flow-content-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const author = new QaSession(baseUrl);
  const reporter = new QaSession(baseUrl);
  const reporterTwo = new QaSession(baseUrl);
  const reporterThree = new QaSession(baseUrl);
  const replyAuthor = new QaSession(baseUrl);
  await register(author, 'qa_report_author', '举报目标');
  await register(reporter, 'qa_reporter', '举报人');
  await register(reporterTwo, 'qa_reporter_two', '举报人二');
  await register(reporterThree, 'qa_reporter_three', '举报人三');
  await register(replyAuthor, 'qa_reply_author', '回复目标');

  const postCreate = await author.request('/api/taoyuan/hall/posts', {
    method: 'POST',
    body: {
      title: 'QA 举报处置测试帖',
      content: '用于验证举报处置审计的普通内容。',
      type: 'discussion',
    },
  });
  assert.equal(postCreate.response.status, 200, 'hall post should be created');
  const postId = postCreate.data?.post?.id;
  assert.ok(postId, 'hall post should return id');

  const reportCreate = await reporter.request(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/report`, {
    method: 'POST',
    body: { reason: 'QA 举报处置原因' },
  });
  assert.equal(reportCreate.response.status, 200, 'hall post report should be created');
  const reportId = reportCreate.data?.report?.id;
  assert.ok(reportId, 'hall report should return id');

  const hidePost = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/hide`, {
    method: 'POST',
    body: {
      hidden: true,
      reason: 'QA 举报处置原因',
      report_id: reportId,
      admin_note: 'QA post disposition',
    },
  });
  assert.equal(hidePost.response.status, 200, 'admin should hide reported post');
  assert.equal(hidePost.data?.hidden, true, 'reported post should be hidden');

  const resolveReport = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'POST',
    body: { status: 'resolved', reason: 'QA 举报处置原因' },
  });
  assert.equal(resolveReport.response.status, 200, 'admin should resolve hall report');
  assert.equal(resolveReport.data?.report?.status, 'resolved', 'hall report should be resolved');

  let overview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/overview');
  assert.equal(overview.response.status, 200, 'hall overview should be readable');
  let adminPost = (overview.data?.posts || []).find(post => post.id === postId);
  let adminReport = (overview.data?.reports || []).find(report => report.id === reportId);
  assert.equal(adminPost?.hidden, true, 'admin overview should expose hidden reported post');
  assert.equal(adminReport?.status, 'resolved', 'admin overview should expose resolved report');

  let logs = await listAuditLogs(baseUrl);
  const hideAudit = findAudit(logs, 'hide_hall_post', detail => detail.post_id === postId && detail.report_id === reportId);
  assert.ok(hideAudit, 'hide post disposition should create admin audit log linked to report');
  assert.equal(auditDetail(hideAudit).before_status, 'active', 'hide audit should include before status');
  assert.equal(auditDetail(hideAudit).after_status, 'hidden', 'hide audit should include after status');
  assert.ok(auditDetail(hideAudit).ip_hash, 'hide audit should contain IP hash');
  assert.ok(auditDetail(hideAudit).ua_hash, 'hide audit should contain UA hash');
  assert.ok(findAudit(logs, 'set_hall_report_status', detail => detail.report_id === reportId && detail.after_status === 'resolved'), 'report resolution should create admin audit log');

  const restorePost = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/hide`, {
    method: 'POST',
    body: { hidden: false, reason: 'QA 误伤恢复', report_id: reportId },
  });
  assert.equal(restorePost.response.status, 200, 'admin should restore hidden post');
  assert.equal(restorePost.data?.hidden, false, 'reported post should be restored');

  overview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/overview');
  adminPost = (overview.data?.posts || []).find(post => post.id === postId);
  assert.equal(adminPost?.hidden, false, 'admin overview should expose restored post');

  const multiReportPostCreate = await author.request('/api/taoyuan/hall/posts', {
    method: 'POST',
    body: {
      title: 'QA 多人举报测试帖',
      content: '用于验证多人举报自动隐藏审计字段的普通内容。',
      type: 'discussion',
    },
  });
  assert.equal(multiReportPostCreate.response.status, 200, 'multi-report hall post should be created');
  const multiReportPostId = multiReportPostCreate.data?.post?.id;
  assert.ok(multiReportPostId, 'multi-report hall post should return id');

  const multiReportIds = [];
  for (const [index, session] of [reporter, reporterTwo, reporterThree].entries()) {
    const multiReportCreate = await session.request(`/api/taoyuan/hall/posts/${encodeURIComponent(multiReportPostId)}/report`, {
      method: 'POST',
      body: { reason: `QA 多人举报原因 ${index + 1}` },
    });
    assert.equal(multiReportCreate.response.status, 200, `multi-report ${index + 1} should be created`);
    multiReportIds.push(multiReportCreate.data?.report?.id);
    if (index === 2) {
      assert.equal(multiReportCreate.data?.report?.auto_action, 'auto_hide_hall_post', 'third report should trigger auto hide');
    }
  }
  assert.equal(multiReportIds.filter(Boolean).length, 3, 'multi-report fixture should create three reports');

  overview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/overview');
  adminPost = (overview.data?.posts || []).find(post => post.id === multiReportPostId);
  assert.equal(adminPost?.hidden, true, 'multi-reported post should be automatically hidden');

  const resolveFirstMultiReport = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/reports/${encodeURIComponent(multiReportIds[0])}/status`, {
    method: 'POST',
    body: { status: 'resolved', reason: 'QA 多人举报复核通过' },
  });
  assert.equal(resolveFirstMultiReport.response.status, 200, 'admin should resolve first multi-report');
  assert.equal(resolveFirstMultiReport.data?.report?.status, 'resolved', 'first multi-report should be resolved');

  logs = await listAuditLogs(baseUrl);
  const multiReportAudit = findAudit(logs, 'set_hall_report_status', detail => detail.report_id === multiReportIds[0]);
  assert.ok(multiReportAudit, 'multi-report resolution should create admin audit log');
  assert.equal(auditDetail(multiReportAudit).multi_report_triggered, true, 'multi-report audit should record automatic multi-report trigger');
  assert.equal(auditDetail(multiReportAudit).auto_action, 'auto_hide_hall_post', 'multi-report audit should record auto action');
  assert.ok(auditDetail(multiReportAudit).auto_action_at, 'multi-report audit should record auto action timestamp');
  assert.equal(auditDetail(multiReportAudit).multi_report_reporter_count, 3, 'multi-report audit should record reporter count');
  assert.ok(
    (auditDetail(multiReportAudit).multi_report_report_ids || []).includes(multiReportIds[0])
      && (auditDetail(multiReportAudit).multi_report_report_ids || []).includes(multiReportIds[2]),
    'multi-report audit should keep related report ids for traceability',
  );

  const replyPostCreate = await author.request('/api/taoyuan/hall/posts', {
    method: 'POST',
    body: {
      title: 'QA 回复举报测试帖',
      content: '用于验证回复删除审计的普通内容。',
      type: 'discussion',
    },
  });
  assert.equal(replyPostCreate.response.status, 200, 'reply parent post should be created');
  const replyPostId = replyPostCreate.data?.post?.id;

  const replyCreate = await replyAuthor.request(`/api/taoyuan/hall/posts/${encodeURIComponent(replyPostId)}/replies`, {
    method: 'POST',
    body: { content: '这是一条会被管理员删除的 QA 回复。' },
  });
  assert.equal(replyCreate.response.status, 200, 'reply should be created');
  const replyId = replyCreate.data?.post?.replies?.[0]?.id;
  assert.ok(replyId, 'reply should return id');

  const replyReportCreate = await reporter.request(`/api/taoyuan/hall/posts/${encodeURIComponent(replyPostId)}/replies/${encodeURIComponent(replyId)}/report`, {
    method: 'POST',
    body: { reason: 'QA 回复举报原因' },
  });
  assert.equal(replyReportCreate.response.status, 200, 'reply report should be created');
  const replyReportId = replyReportCreate.data?.report?.id;

  const deleteReply = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/posts/${encodeURIComponent(replyPostId)}/replies/${encodeURIComponent(replyId)}`, {
    method: 'DELETE',
    body: {
      reason: 'QA 回复举报原因',
      report_id: replyReportId,
      admin_note: 'QA reply disposition',
    },
  });
  assert.equal(deleteReply.response.status, 200, 'admin should delete reported reply');

  await adminRequest(baseUrl, `/api/admin/taoyuan/hall/reports/${encodeURIComponent(replyReportId)}/status`, {
    method: 'POST',
    body: { status: 'resolved', reason: 'QA 回复举报原因' },
  });

  logs = await listAuditLogs(baseUrl);
  assert.ok(findAudit(logs, 'restore_hall_post', detail => detail.post_id === postId && detail.after_status === 'active'), 'post restore should create admin audit log');
  const deleteReplyAudit = findAudit(logs, 'delete_hall_reply', detail => detail.reply_id === replyId && detail.report_id === replyReportId);
  assert.ok(deleteReplyAudit, 'reply deletion should create admin audit log linked to report');
  assert.equal(auditDetail(deleteReplyAudit).before_status, 'active', 'reply deletion audit should include before status');
  assert.equal(auditDetail(deleteReplyAudit).after_status, 'deleted', 'reply deletion audit should include after status');
  assert.ok(String(auditDetail(deleteReplyAudit).content_excerpt || '').length <= 80, 'reply deletion audit should keep short excerpt only');

  const serializedLogs = JSON.stringify(logs);
  assert.ok(!serializedLogs.includes('127.0.0.1'), 'admin audit logs should not expose raw IP');
  assert.ok(!serializedLogs.includes('QA_REPORT_RAW_UA_SHOULD_NOT_EXIST'), 'admin audit logs should not expose raw UA');

  console.log('qa-report-disposition-flow passed');
} catch (error) {
  console.error('[qa-report-disposition-flow] FAILED');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}
