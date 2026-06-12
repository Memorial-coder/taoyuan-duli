import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-announcement-'));
const storageFile = path.join(tempDir, 'users.json');
const host = '127.0.0.1';
const fallbackAdminToken = 'qa_announcement_admin_token_20260611';
const fallbackSuperAdminToken = 'qa_announcement_super_token_20260611';
let adminToken = fallbackAdminToken;
let serverProcess = null;

process.env.DB_STORAGE = storageFile;
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true';
process.env.MYSQL_HOST = '';
process.env.MYSQL_USER = '';
process.env.MYSQL_DATABASE = '';

const require = createRequire(import.meta.url);
const saveRuntime = require('../src/taoyuanSaveRuntime');

function parseEnvContent(content) {
  const parsed = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

async function loadEnvFile(filePath) {
  try {
    return parseEnvContent(await fs.readFile(filePath, 'utf8'));
  } catch {
    return {};
  }
}

async function resolveEffectiveOrdinaryAdminToken() {
  const effective = {
    ADMIN_TOKEN: fallbackAdminToken,
    SUPER_ADMIN_TOKEN: fallbackSuperAdminToken,
  };
  for (const filePath of [
    path.join(serverRoot, '.env'),
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.offical'),
  ]) {
    Object.assign(effective, await loadEnvFile(filePath));
  }
  return String(effective.ADMIN_TOKEN || effective.SUPER_ADMIN_TOKEN || fallbackAdminToken).trim();
}

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

async function findPort(start = 4521) {
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

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
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

class QaSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
    this.csrfToken = '';
  }

  async request(pathname, init = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(init.headers || {}),
      },
      body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
    });
    this.cookie = mergeCookie(this.cookie, response);
    return { response, data: await parseJsonSafe(response) };
  }
}

async function adminRequest(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Admin-Token': adminToken,
      ...(init.headers || {}),
    },
    body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  return { response, data: await parseJsonSafe(response) };
}

async function publicRequest(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    body: init.body && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  return { response, data: await parseJsonSafe(response) };
}

async function register(session, username) {
  const result = await session.request('/api/register', {
    method: 'POST',
    body: {
      username,
      display_name: username,
      password: 'QaAnnouncementPass123!',
    },
  });
  assert.equal(result.response.status, 200, `register ${username} should succeed`);
  assert.equal(result.data?.ok, true, `register ${username} should return ok=true`);
  session.csrfToken = String(result.data?.csrf_token || '');
}

function findAnnouncement(data, id) {
  return (Array.isArray(data?.announcements) ? data.announcements : []).find(item => item.id === id) || null;
}

function seedRewardSave(username, money = 100) {
  const saves = saveRuntime.loadUserSaveSlots(username);
  saves.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: username,
        money,
      },
      inventory: {
        items: [],
        tempItems: [],
        capacity: 24,
      },
    }),
    revision: 1,
  };
  saveRuntime.saveUserSaveSlots(username, saves);
  saveRuntime.setActiveSaveSlot(username, 0);
}

function readRewardSave(username) {
  const saves = saveRuntime.loadUserSaveSlots(username);
  const decrypted = saveRuntime.decryptTaoyuanRaw(saves.slots[0]?.raw || '');
  const data = decrypted?.data?.player
    ? decrypted.data
    : decrypted?.gameplayData?.player
      ? decrypted.gameplayData
      : decrypted?.player
        ? decrypted
        : {};
  const items = Array.isArray(data?.inventory?.items) ? data.inventory.items : [];
  return {
    money: Number(data?.player?.money || 0),
    wood: items
      .filter(item => String(item?.itemId || item?.id || '') === 'wood')
      .reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    appliedDeliveries: data?.onlineMailRewards?.appliedDeliveries || {},
  };
}

try {
  const port = await findPort();
  const baseUrl = `http://${host}:${port}`;
  adminToken = await resolveEffectiveOrdinaryAdminToken();
  await fs.writeFile(
    path.join(tempDir, 'taoyuan_content_moderation_rules.json'),
    JSON.stringify({
      version: 'qa-announcement-rules',
      updated_at: 0,
      hard_block: [{ category: 'qa_block', terms: ['QA_BLOCKED_TERM'] }],
      soft_block: [],
      scene_policy: {
        admin_announcement: 'reject_hard_reject_soft',
      },
    }, null, 2),
    'utf8',
  );
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
      SECRET_KEY: 'qa_announcement_secret_key_20260611',
      ADMIN_TOKEN: fallbackAdminToken,
      SUPER_ADMIN_TOKEN: fallbackSuperAdminToken,
      AUDIT_HASH_SALT: 'qa-announcement-audit-salt',
      CONTENT_MODERATION_AUDIT_SALT: 'qa-announcement-content-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const now = Math.floor(Date.now() / 1000);
  const createResult = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA announcement',
      body: '## Update\n- route flow',
      version: '3.0.0',
      target_versions: ['3.0.0'],
      target_channels: ['web'],
      start_at: now - 60,
      end_at: now + 3600,
      priority: 7,
      cta_text: 'Details',
      cta_url: '/game/farm',
      button_texts: {
        close: 'OK',
        suppress: 'Do not show again',
        cta: 'Details',
      },
      template_type: 'version_update',
      rewards: [
        { type: 'money', amount: 31 },
        { type: 'item', id: 'wood', quantity: 2 },
      ],
      duplicate_compensation_money: 9,
    },
  });
  assert.equal(createResult.response.status, 200, 'ordinary admin token should create announcement draft');
  assert.equal(createResult.data?.ok, true, 'create announcement should return ok=true');
  const announcementId = createResult.data?.announcement?.id;
  assert.ok(announcementId, 'created announcement should have id');
  assert.equal(createResult.data.announcement.status, 'draft', 'new announcement should be draft');
  assert.equal(createResult.data.announcement.rewards?.length, 2, 'created announcement should retain rewards');

  const templateResult = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements');
  assert.equal(templateResult.response.status, 200, 'announcement list should load');
  assert.ok(Array.isArray(templateResult.data?.templates) && templateResult.data.templates.length >= 5, 'templates should be returned');

  let activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=3.0.0&channel=web');
  assert.equal(activeResult.response.status, 200, 'active announcements should load');
  assert.equal(findAnnouncement(activeResult.data, announcementId), null, 'draft announcement should not be visible');

  const publishResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/publish`, { method: 'POST' });
  assert.equal(publishResult.response.status, 200, 'publish should succeed');
  assert.equal(publishResult.data?.announcement?.status, 'published', 'published status should be set');
  assert.ok(Number(publishResult.data?.announcement?.published_at) > 0, 'published_at should be set');
  assert.equal(typeof publishResult.data?.realtime_emitted, 'number', 'publish should return realtime emitted count');

  activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=2.9.0&channel=web');
  assert.equal(findAnnouncement(activeResult.data, announcementId), null, 'version filter should hide non-targeted announcements');

  activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=3.0.0&channel=android');
  assert.equal(findAnnouncement(activeResult.data, announcementId), null, 'channel filter should hide non-targeted announcements');

  activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=3.0.0&channel=web');
  const activeAnnouncement = findAnnouncement(activeResult.data, announcementId);
  assert.ok(activeAnnouncement, 'published targeted announcement should be active');
  assert.equal(activeAnnouncement.rewards?.length, 2, 'active announcement should expose reward preview');

  const historyResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/history?version=3.0.0&channel=web');
  assert.ok(findAnnouncement(historyResult.data, announcementId), 'published announcement should appear in history');

  const unauthClaim = await publicRequest(baseUrl, `/api/taoyuan/announcements/${announcementId}/claim-reward`, {
    method: 'POST',
    body: { client_version: '3.0.0', client_channel: 'web' },
  });
  assert.equal(unauthClaim.response.status, 401, 'guest claim should require login');

  const guestEvent = await publicRequest(baseUrl, `/api/taoyuan/announcements/${announcementId}/events`, {
    method: 'POST',
    body: { event_type: 'impression', client_version: '3.0.0', client_channel: 'web' },
  });
  assert.equal(guestEvent.response.status, 200, 'guest event should not error');
  assert.equal(guestEvent.data?.recorded, false, 'guest event should not be recorded');

  const session = new QaSession(baseUrl);
  await register(session, 'qa_announcement_user');
  seedRewardSave('qa_announcement_user', 100);
  const firstClaim = await session.request(`/api/taoyuan/announcements/${announcementId}/claim-reward`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': session.csrfToken },
    body: { client_version: '3.0.0', client_channel: 'web' },
  });
  assert.equal(firstClaim.response.status, 200, 'logged-in claim should succeed');
  assert.equal(firstClaim.data?.result?.money_added, 31, 'first claim should grant announcement money');
  assert.equal(readRewardSave('qa_announcement_user').money, 131, 'first claim should persist announcement money');
  assert.equal(readRewardSave('qa_announcement_user').wood, 2, 'first claim should persist announcement item reward');
  assert.ok(readRewardSave('qa_announcement_user').appliedDeliveries[`announcement_reward:${announcementId}`], 'announcement reward should write save-side idempotency ledger');

  const replayClaim = await session.request(`/api/taoyuan/announcements/${announcementId}/claim-reward`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': session.csrfToken },
    body: { client_version: '3.0.0', client_channel: 'web' },
  });
  assert.equal(replayClaim.response.status, 200, 'replayed claim should be accepted idempotently');
  assert.equal(replayClaim.data?.result?.already_applied, true, 'replayed claim should expose already_applied');
  assert.equal(readRewardSave('qa_announcement_user').money, 131, 'replayed claim must not grant money twice');
  assert.equal(readRewardSave('qa_announcement_user').wood, 2, 'replayed claim must not grant item twice');

  for (const event_type of ['impression', 'close', 'cta_click']) {
    const eventResult = await session.request(`/api/taoyuan/announcements/${announcementId}/events`, {
      method: 'POST',
      body: { event_type, client_version: '3.0.0', client_channel: 'web' },
    });
    assert.equal(eventResult.response.status, 200, `${event_type} event should succeed`);
    assert.equal(eventResult.data?.recorded, true, `${event_type} event should be recorded for logged-in user`);
  }

  const statsResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/stats`);
  assert.equal(statsResult.response.status, 200, 'stats should load');
  assert.equal(statsResult.data?.stats?.impression_count, 1, 'stats should count logged-in impressions only');
  assert.equal(statsResult.data?.stats?.close_count, 1, 'stats should count closes');
  assert.equal(statsResult.data?.stats?.cta_click_count, 1, 'stats should count cta clicks');
  assert.equal(statsResult.data?.stats?.reward_claim_count, 2, 'stats should count reward claim attempts');
  assert.equal(statsResult.data?.stats?.suppress_count, 0, 'stats should not require a separate suppress event');
  assert.equal(statsResult.data?.stats?.read_count, 1, 'stats should count distinct read users');

  const suppressedActive = await session.request('/api/taoyuan/announcements/active?version=3.0.0&channel=web');
  assert.equal(findAnnouncement(suppressedActive.data, announcementId), null, 'closed announcement should not auto-display to same user');

  const offlineResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/offline`, { method: 'POST' });
  assert.equal(offlineResult.response.status, 200, 'offline should succeed');
  assert.equal(offlineResult.data?.announcement?.status, 'offline', 'offline status should be set');
  assert.ok(Number(offlineResult.data?.announcement?.offline_at) > 0, 'offline_at should be set');
  assert.equal(typeof offlineResult.data?.realtime_emitted, 'number', 'offline should return realtime emitted count');

  activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=3.0.0&channel=web');
  assert.equal(findAnnouncement(activeResult.data, announcementId), null, 'offline announcement should not be active');

  const offlineHistory = await publicRequest(baseUrl, '/api/taoyuan/announcements/history?version=3.0.0&channel=web');
  assert.equal(findAnnouncement(offlineHistory.data, announcementId), null, 'offline announcement should not appear in history');

  const auditResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/audit-logs`);
  assert.equal(auditResult.response.status, 200, 'announcement audit logs should load for ordinary admin');
  const auditActions = new Set((auditResult.data?.logs || []).map(log => log.action));
  assert.ok(auditActions.has('create_taoyuan_announcement'), 'create audit should be present');
  assert.ok(auditActions.has('publish_taoyuan_announcement'), 'publish audit should be present');
  assert.ok(auditActions.has('offline_taoyuan_announcement'), 'offline audit should be present');

  const deleteResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}`, { method: 'DELETE' });
  assert.equal(deleteResult.response.status, 200, 'delete should succeed');
  assert.equal(deleteResult.data?.announcement?.id, announcementId, 'delete should return deleted announcement');
  assert.ok(Number(deleteResult.data?.deleted_event_count) >= 3, 'delete should remove announcement events');
  assert.equal(typeof deleteResult.data?.realtime_emitted, 'number', 'delete should return realtime emitted count');

  const deletedList = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements');
  assert.equal(findAnnouncement(deletedList.data, announcementId), null, 'deleted announcement should be removed from admin list');

  activeResult = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=3.0.0&channel=web');
  assert.equal(findAnnouncement(activeResult.data, announcementId), null, 'deleted announcement should not be active');

  const deletedHistory = await publicRequest(baseUrl, '/api/taoyuan/announcements/history?version=3.0.0&channel=web');
  assert.equal(findAnnouncement(deletedHistory.data, announcementId), null, 'deleted announcement should not appear in history');

  const deletedStats = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/stats`);
  assert.equal(deletedStats.response.status, 404, 'deleted announcement stats should return 404');

  const deleteAuditResult = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${announcementId}/audit-logs`);
  assert.equal(deleteAuditResult.response.status, 200, 'deleted announcement audit logs should still load');
  const deleteAuditActions = new Set((deleteAuditResult.data?.logs || []).map(log => log.action));
  assert.ok(deleteAuditActions.has('delete_taoyuan_announcement'), 'delete audit should be present');

  const invalidCta = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'Invalid CTA',
      body: 'Bad CTA',
      cta_text: 'Open',
      cta_url: 'javascript:alert(1)',
    },
  });
  assert.equal(invalidCta.response.status, 400, 'invalid CTA URL should be rejected');

  const blockedText = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'Blocked announcement',
      body: 'This body contains QA_BLOCKED_TERM and must be rejected.',
    },
  });
  assert.equal(blockedText.response.status, 400, 'moderation should reject blocked text');

  console.log('qa-announcement-flow passed');
} catch (error) {
  console.error('[qa-announcement-flow] FAILED');
  if (serverProcess) {
    console.error(String(serverProcess.exitCode));
  }
  throw error;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}
