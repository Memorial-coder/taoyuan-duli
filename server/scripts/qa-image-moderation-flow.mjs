import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-image-flow-'));
const storageFile = path.join(tempDir, 'users.json');
const host = '127.0.0.1';
const adminToken = 'qa_image_flow_admin_token_20260605';
const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const otherPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
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

async function findPort(start = 4423) {
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
      'User-Agent': 'QA_IMAGE_RAW_UA_SHOULD_NOT_EXIST',
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
      password: 'QaImageFlowPass123!',
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
  const result = await adminRequest(baseUrl, '/api/admin/audit-logs?page_size=160');
  assert.equal(result.response.status, 200, 'admin audit logs should be readable');
  return Array.isArray(result.data?.logs) ? result.data.logs : [];
}

function findAudit(logs, action, predicate = () => true) {
  return logs.find(log => log.action === action && predicate(auditDetail(log)));
}

async function uploadHallImage(session, dataUrl, filename) {
  return session.request('/api/taoyuan/hall/upload-image', {
    method: 'POST',
    body: {
      data_url: dataUrl,
      filename,
      usage: 'hall_post',
    },
  });
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
      SECRET_KEY: 'qa_image_flow_secret_key_20260605',
      ADMIN_TOKEN: adminToken,
      SUPER_ADMIN_TOKEN: adminToken,
      AUDIT_HASH_SALT: 'qa-image-flow-audit-salt',
      CONTENT_MODERATION_AUDIT_SALT: 'qa-image-flow-content-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const uploader = new QaSession(baseUrl);
  const reporter = new QaSession(baseUrl);
  const reporterTwo = new QaSession(baseUrl);
  const reporterThree = new QaSession(baseUrl);
  await register(uploader, 'qa_image_uploader', '图片上传者');
  await register(reporter, 'qa_image_reporter', '图片举报人');
  await register(reporterTwo, 'qa_img_reporter2', '图片举报人二');
  await register(reporterThree, 'qa_img_reporter3', '图片举报人三');

  const upload = await uploadHallImage(uploader, pngDataUrl, 'qa-image-flow.png');
  assert.equal(upload.response.status, 200, 'image upload should be registered');
  assert.equal(upload.data?.ok, true, 'image upload should return ok=true');
  const imageUrl = upload.data?.url;
  assert.ok(imageUrl, 'image upload should return public url');

  const blockId = 'qa_image_flow_block';
  const postCreate = await uploader.request('/api/taoyuan/hall/posts', {
    method: 'POST',
    body: {
      title: 'QA 图片审核测试帖',
      content: '用于验证图片审核链路的普通内容。',
      type: 'discussion',
      blocks: [
        { id: 'qa_image_flow_text', type: 'text', text: '用于验证图片审核链路的普通内容。' },
        { id: blockId, type: 'image', url: imageUrl, alt: 'QA 图片审核样例' },
      ],
    },
  });
  assert.equal(postCreate.response.status, 200, 'post with uploaded image should be created');
  const postId = postCreate.data?.post?.id;
  assert.ok(postId, 'post with image should return id');

  const imageReport = await reporter.request(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/blocks/${encodeURIComponent(blockId)}/report-image`, {
    method: 'POST',
    body: { reason: 'QA 图片举报原因' },
  });
  assert.equal(imageReport.response.status, 200, 'image report should be created');
  const reportId = imageReport.data?.report?.id;
  assert.ok(reportId, 'image report should return id');

  const hideImage = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/image-reports/${encodeURIComponent(reportId)}/hide`, {
    method: 'POST',
    body: {
      reason: 'QA 图片举报处置',
      admin_note: 'QA image disposition',
    },
  });
  assert.equal(hideImage.response.status, 200, 'admin should hide image from report');
  assert.equal(hideImage.data?.asset?.status, 'hidden', 'reported image asset should be hidden');
  assert.equal(hideImage.data?.report?.status, 'resolved', 'image report should be resolved by hide action');
  const imageHashPrefix = String(hideImage.data?.asset?.sha256 || '').slice(0, 16);
  assert.equal(imageHashPrefix.length, 16, 'hidden image should keep sha256 prefix for audit correlation');

  let imageOverview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/image-reports');
  assert.equal(imageOverview.response.status, 200, 'image moderation overview should be readable');
  let overviewAsset = (imageOverview.data?.assets || []).find(asset => asset.url === imageUrl);
  let overviewReport = (imageOverview.data?.reports || []).find(report => report.id === reportId);
  assert.equal(overviewAsset?.status, 'hidden', 'overview should expose hidden asset status');
  assert.equal(overviewReport?.status, 'resolved', 'overview should expose resolved image report');

  let logs = await listAuditLogs(baseUrl);
  const hideAudit = findAudit(logs, 'hide_image_from_report', detail => detail.report_id === reportId && detail.image_url === imageUrl);
  assert.ok(hideAudit, 'image hide action should create admin audit linked to report');
  assert.equal(auditDetail(hideAudit).before_status, 'active', 'image hide audit should include before status');
  assert.equal(auditDetail(hideAudit).after_status, 'hidden', 'image hide audit should include after status');
  assert.equal(auditDetail(hideAudit).report_before_status, 'pending', 'image hide audit should include report before status');
  assert.equal(auditDetail(hideAudit).report_after_status, 'resolved', 'image hide audit should include report after status');
  assert.equal(auditDetail(hideAudit).image_sha256_prefix, imageHashPrefix, 'image hide audit should include hash prefix only');
  assert.ok(auditDetail(hideAudit).ip_hash, 'image hide audit should contain IP hash');
  assert.ok(auditDetail(hideAudit).ua_hash, 'image hide audit should contain UA hash');

  const duplicateUpload = await uploadHallImage(uploader, pngDataUrl, 'qa-image-flow-duplicate.png');
  assert.equal(duplicateUpload.response.status, 409, 'same hash as disposed image should be rejected');
  assert.equal(duplicateUpload.data?.ok, false, 'duplicate disposed image upload should return ok=false');
  assert.match(String(duplicateUpload.data?.msg || ''), /已处置图片记录匹配|拒绝上传/, 'duplicate hash rejection should use generic safety message');

  const riskSignals = await adminRequest(baseUrl, '/api/admin/taoyuan/content-moderation/risk-signals?status=all&signal_type=duplicate_image_hash_reuse&page_size=20');
  assert.equal(riskSignals.response.status, 200, 'risk signals should be readable');
  const duplicateSignal = (riskSignals.data?.signals || []).find(signal => (
    signal.signal_type === 'duplicate_image_hash_reuse'
    && signal.username === 'qa_image_uploader'
    && signal.image_hash_prefix === imageHashPrefix
  ));
  assert.ok(duplicateSignal, 'duplicate disposed hash upload should create risk signal');
  assert.equal(duplicateSignal.outcome, 'upload_rejected', 'duplicate hash risk signal should record rejection outcome');
  assert.ok(Number(duplicateSignal.risk_score) > 0 && Number(duplicateSignal.risk_score) <= 100, 'duplicate hash risk score should be bounded');

  const restoreImage = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/image-assets/hide', {
    method: 'POST',
    body: {
      image_url: imageUrl,
      hidden: false,
      reason: 'QA 图片误伤恢复',
      admin_note: 'QA image restore',
    },
  });
  assert.equal(restoreImage.response.status, 200, 'admin should restore hidden image asset');
  assert.equal(restoreImage.data?.asset?.status, 'active', 'restored image asset should be active');

  const multiReportUpload = await uploadHallImage(uploader, otherPngDataUrl, 'qa-image-multi-report.png');
  assert.equal(multiReportUpload.response.status, 200, 'multi-report image upload should be registered');
  const multiReportImageUrl = multiReportUpload.data?.url;
  assert.ok(multiReportImageUrl, 'multi-report image upload should return url');
  const multiReportBlockId = 'qa_image_multi_report_block';
  const multiReportPostCreate = await uploader.request('/api/taoyuan/hall/posts', {
    method: 'POST',
    body: {
      title: 'QA 图片多人举报测试帖',
      content: '用于验证图片多人举报自动隐藏审计字段的普通内容。',
      type: 'discussion',
      blocks: [
        { id: 'qa_image_multi_report_text', type: 'text', text: '用于验证图片多人举报自动隐藏审计字段。' },
        { id: multiReportBlockId, type: 'image', url: multiReportImageUrl, alt: 'QA 图片多人举报样例' },
      ],
    },
  });
  assert.equal(multiReportPostCreate.response.status, 200, 'multi-report image post should be created');
  const multiReportPostId = multiReportPostCreate.data?.post?.id;
  assert.ok(multiReportPostId, 'multi-report image post should return id');

  const multiImageReportIds = [];
  for (const [index, session] of [reporter, reporterTwo, reporterThree].entries()) {
    const multiImageReport = await session.request(`/api/taoyuan/hall/posts/${encodeURIComponent(multiReportPostId)}/blocks/${encodeURIComponent(multiReportBlockId)}/report-image`, {
      method: 'POST',
      body: { reason: `QA 图片多人举报原因 ${index + 1}` },
    });
    assert.equal(multiImageReport.response.status, 200, `multi image report ${index + 1} should be created`);
    multiImageReportIds.push(multiImageReport.data?.report?.id);
    if (index === 2) {
      assert.equal(multiImageReport.data?.report?.auto_action, 'auto_hide_image_asset', 'third image report should trigger auto hide');
    }
  }
  assert.equal(multiImageReportIds.filter(Boolean).length, 3, 'multi image report fixture should create three reports');

  imageOverview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/image-reports');
  overviewAsset = (imageOverview.data?.assets || []).find(asset => asset.url === multiReportImageUrl);
  assert.equal(overviewAsset?.status, 'hidden', 'multi-reported image should be automatically hidden');

  const hideFirstMultiImageReport = await adminRequest(baseUrl, `/api/admin/taoyuan/hall/image-reports/${encodeURIComponent(multiImageReportIds[0])}/hide`, {
    method: 'POST',
    body: {
      reason: 'QA 图片多人举报复核隐藏',
      admin_note: 'QA multi image disposition',
    },
  });
  assert.equal(hideFirstMultiImageReport.response.status, 200, 'admin should hide image from first multi-report');
  assert.equal(hideFirstMultiImageReport.data?.report?.status, 'resolved', 'first multi image report should be resolved');

  logs = await listAuditLogs(baseUrl);
  const multiImageAudit = findAudit(logs, 'hide_image_from_report', detail => detail.report_id === multiImageReportIds[0]);
  assert.ok(multiImageAudit, 'multi image disposition should create admin audit log');
  assert.equal(auditDetail(multiImageAudit).multi_report_triggered, true, 'multi image audit should record automatic multi-report trigger');
  assert.equal(auditDetail(multiImageAudit).auto_action, 'auto_hide_image_asset', 'multi image audit should record auto action');
  assert.ok(auditDetail(multiImageAudit).auto_action_at, 'multi image audit should record auto action timestamp');
  assert.equal(auditDetail(multiImageAudit).multi_report_reporter_count, 3, 'multi image audit should record reporter count');
  assert.ok(
    (auditDetail(multiImageAudit).multi_report_report_ids || []).includes(multiImageReportIds[0])
      && (auditDetail(multiImageAudit).multi_report_report_ids || []).includes(multiImageReportIds[2]),
    'multi image audit should keep related report ids for traceability',
  );

  const blacklistUser = await adminRequest(baseUrl, '/api/admin/taoyuan/image-blacklist/qa_image_uploader', {
    method: 'POST',
    body: {
      blocked: true,
      reason: 'QA 图片上传限制',
      admin_note: 'QA image blacklist',
    },
  });
  assert.equal(blacklistUser.response.status, 200, 'admin should add image uploader to blacklist');
  assert.equal(blacklistUser.data?.entry?.username, 'qa_image_uploader', 'blacklist response should include target username');

  const blockedUpload = await uploadHallImage(uploader, otherPngDataUrl, 'qa-image-flow-blocked.png');
  assert.equal(blockedUpload.response.status, 403, 'blacklisted uploader should be blocked from uploading images');
  assert.equal(blockedUpload.data?.ok, false, 'blacklisted upload should return ok=false');

  const removeBlacklist = await adminRequest(baseUrl, '/api/admin/taoyuan/image-blacklist/qa_image_uploader', {
    method: 'POST',
    body: {
      blocked: false,
      reason: 'QA 图片上传限制解除',
      admin_note: 'QA image blacklist restore',
    },
  });
  assert.equal(removeBlacklist.response.status, 200, 'admin should remove image uploader blacklist entry');
  assert.ok(!(removeBlacklist.data?.blacklist || []).some(entry => entry.username === 'qa_image_uploader'), 'blacklist response should no longer include target username');

  imageOverview = await adminRequest(baseUrl, '/api/admin/taoyuan/hall/image-reports');
  overviewAsset = (imageOverview.data?.assets || []).find(asset => asset.url === imageUrl);
  assert.equal(overviewAsset?.status, 'active', 'overview should expose restored image asset');

  logs = await listAuditLogs(baseUrl);
  assert.ok(findAudit(logs, 'restore_hall_image_asset', detail => detail.image_url === imageUrl && detail.after_status === 'active'), 'image restore should create admin audit log');
  assert.ok(findAudit(logs, 'ban_user_for_image', detail => detail.target_id === 'qa_image_uploader' && detail.after_blacklist_status === 'blocked'), 'image blacklist should create ban audit log');
  assert.ok(findAudit(logs, 'remove_image_blacklist', detail => detail.target_id === 'qa_image_uploader' && detail.after_blacklist_status === 'active'), 'image blacklist removal should create audit log');

  const serializedLogs = JSON.stringify(logs);
  const serializedSignals = JSON.stringify(riskSignals.data?.signals || []);
  assert.ok(!serializedLogs.includes('127.0.0.1'), 'admin audit logs should not expose raw IP');
  assert.ok(!serializedLogs.includes('QA_IMAGE_RAW_UA_SHOULD_NOT_EXIST'), 'admin audit logs should not expose raw UA');
  assert.ok(!serializedSignals.includes('QA 图片举报原因'), 'risk signals should not include raw report reason');

  console.log('qa-image-moderation-flow passed');
} catch (error) {
  console.error('[qa-image-moderation-flow] FAILED');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}
