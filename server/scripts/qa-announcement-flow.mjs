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
      soft_block: [{ category: 'qa_soft_review', terms: ['QA_SOFT_REVIEW_TERM'] }],
      scene_policy: {
        admin_announcement: 'reject_hard_allow_soft',
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
  assert.equal(createResult.data.announcement.show_save_update_button, true, 'version update announcements should default to save-update button');
  assert.equal(createResult.data.announcement.is_pinned, false, 'new announcements should not be pinned by default');

  const defaultMaintenance = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA maintenance announcement',
      body: 'Maintenance announcement should not show save-update by default.',
      template_type: 'maintenance',
    },
  });
  assert.equal(defaultMaintenance.response.status, 200, 'maintenance announcement draft should be created');
  assert.equal(defaultMaintenance.data?.announcement?.show_save_update_button, false, 'maintenance announcements should not default to save-update button');

  const defaultHotfix = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA hotfix announcement',
      body: 'Hotfix announcement should show save-update by default.',
      template_type: 'hotfix',
    },
  });
  assert.equal(defaultHotfix.response.status, 200, 'hotfix announcement draft should be created');
  assert.equal(defaultHotfix.data?.announcement?.show_save_update_button, true, 'hotfix announcements should default to save-update button');

  const manualHidden = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA manually hidden update button',
      body: 'Version update can manually hide save-update.',
      template_type: 'version_update',
      show_save_update_button: false,
    },
  });
  assert.equal(manualHidden.response.status, 200, 'manual hidden announcement draft should be created');
  assert.equal(manualHidden.data?.announcement?.show_save_update_button, false, 'manual false should override version update default');

  const manualShown = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA manually shown update button',
      body: 'Compensation can manually show save-update.',
      template_type: 'compensation',
      show_save_update_button: true,
    },
  });
  assert.equal(manualShown.response.status, 200, 'manual shown announcement draft should be created');
  assert.equal(manualShown.data?.announcement?.show_save_update_button, true, 'manual true should override non-update defaults');

  const longMarkdownBody = Array.from({ length: 360 }, (_, index) => `- L${index + 1}`).join('\n');
  const multilineDraft = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA multiline announcement',
      body: longMarkdownBody,
    },
  });
  assert.equal(multilineDraft.response.status, 200, 'announcement body should not reject Markdown with many line breaks');
  assert.equal(multilineDraft.data?.ok, true, 'multiline announcement draft should return ok=true');
  assert.match(
    multilineDraft.data?.announcement?.body || '',
    /- L360/,
    'multiline announcement draft should retain the full Markdown body',
  );

  const templateResult = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements');
  assert.equal(templateResult.response.status, 200, 'announcement list should load');
  assert.ok(Array.isArray(templateResult.data?.templates) && templateResult.data.templates.length >= 5, 'templates should be returned');

  const firstPinned = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA pinned announcement one',
      body: 'Pinned announcement should sort before normal announcements.',
      version: 'qa-pin-sort',
      target_versions: ['qa-pin-sort'],
      target_channels: ['web'],
      start_at: now - 60,
      end_at: now + 3600,
      priority: 1,
      is_pinned: true,
    },
  });
  assert.equal(firstPinned.response.status, 200, 'first pinned draft should be created');
  assert.equal(firstPinned.data?.announcement?.is_pinned, true, 'first pinned draft should retain pin flag');
  const firstPinnedId = firstPinned.data?.announcement?.id;
  const firstPinnedPublish = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${firstPinnedId}/publish`, { method: 'POST' });
  assert.equal(firstPinnedPublish.response.status, 200, 'first pinned announcement should publish');
  assert.equal(firstPinnedPublish.data?.announcement?.is_pinned, true, 'first pinned announcement should publish as pinned');

  const secondPinned = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA pinned announcement two',
      body: 'New pinned announcement should replace the previous pinned announcement.',
      version: 'qa-pin-sort',
      target_versions: ['qa-pin-sort'],
      target_channels: ['web'],
      start_at: now - 60,
      end_at: now + 3600,
      priority: 0,
      is_pinned: true,
    },
  });
  const secondPinnedId = secondPinned.data?.announcement?.id;
  const secondPinnedPublish = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${secondPinnedId}/publish`, { method: 'POST' });
  assert.equal(secondPinnedPublish.response.status, 200, 'second pinned announcement should publish');
  assert.equal(secondPinnedPublish.data?.announcement?.is_pinned, true, 'second pinned announcement should publish as pinned');

  const pinnedList = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements');
  assert.equal(findAnnouncement(pinnedList.data, firstPinnedId)?.is_pinned, false, 'publishing a new pinned announcement should clear the old pinned flag');
  assert.equal(findAnnouncement(pinnedList.data, secondPinnedId)?.is_pinned, true, 'new pinned announcement should remain pinned');
  assert.equal(
    (pinnedList.data?.announcements || []).filter(item => item.is_pinned).length,
    1,
    'admin announcement list should contain only one pinned announcement',
  );

  const pinnedActive = await publicRequest(baseUrl, '/api/taoyuan/announcements/active?version=qa-pin-sort&channel=web');
  assert.equal(pinnedActive.response.status, 200, 'pinned active announcements should load');
  assert.equal(pinnedActive.data?.announcements?.[0]?.id, secondPinnedId, 'pinned active announcement should sort first');
  assert.equal(pinnedActive.data?.announcements?.[0]?.is_pinned, true, 'active announcement should expose pinned flag');

  const pinnedHistory = await publicRequest(baseUrl, '/api/taoyuan/announcements/history?version=qa-pin-sort&channel=web');
  assert.equal(pinnedHistory.data?.announcements?.[0]?.id, secondPinnedId, 'pinned history announcement should sort first');

  const pinnedOffline = await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${secondPinnedId}/offline`, { method: 'POST' });
  assert.equal(pinnedOffline.response.status, 200, 'pinned announcement should offline');
  assert.equal(pinnedOffline.data?.announcement?.is_pinned, false, 'offline announcement should clear pinned flag');

  const pinnedReader = new QaSession(baseUrl);
  await register(pinnedReader, 'qa_pin_reader');
  const readPinned = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA read pinned announcement',
      body: 'Pinned announcements should follow unread announcements after they are read.',
      version: 'qa-pin-read',
      target_versions: ['qa-pin-read'],
      target_channels: ['web'],
      start_at: now - 60,
      end_at: now + 3600,
      priority: 0,
      is_pinned: true,
    },
  });
  const readPinnedId = readPinned.data?.announcement?.id;
  await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${readPinnedId}/publish`, { method: 'POST' });
  const unreadNormal = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'QA unread normal announcement',
      body: 'Unread normal announcement should trigger the popup batch.',
      version: 'qa-pin-read',
      target_versions: ['qa-pin-read'],
      target_channels: ['web'],
      start_at: now - 60,
      end_at: now + 3600,
      priority: 99,
    },
  });
  const unreadNormalId = unreadNormal.data?.announcement?.id;
  await adminRequest(baseUrl, `/api/admin/taoyuan/announcements/${unreadNormalId}/publish`, { method: 'POST' });
  await pinnedReader.request(`/api/taoyuan/announcements/${readPinnedId}/events`, {
    method: 'POST',
    body: { event_type: 'close', client_version: 'qa-pin-read', client_channel: 'web' },
  });
  const readPinnedActive = await pinnedReader.request('/api/taoyuan/announcements/active?version=qa-pin-read&channel=web');
  assert.equal(readPinnedActive.response.status, 200, 'active announcements should load for read pinned scenario');
  assert.equal(readPinnedActive.data?.announcements?.[0]?.id, readPinnedId, 'read pinned announcement should still sort first when unread announcements exist');
  assert.equal(readPinnedActive.data?.announcements?.[0]?.is_read, true, 'read pinned announcement should expose read state');
  assert.equal(readPinnedActive.data?.announcements?.[1]?.id, unreadNormalId, 'unread normal announcement should remain in the popup batch');
  assert.equal(readPinnedActive.data?.announcements?.[1]?.is_read, false, 'unread normal announcement should expose unread state');

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
  assert.equal(activeAnnouncement.show_save_update_button, true, 'active announcement should expose save-update button flag');

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

  const softReviewText = await adminRequest(baseUrl, '/api/admin/taoyuan/announcements', {
    method: 'POST',
    body: {
      title: 'Soft review announcement',
      body: 'This official announcement mentions QA_SOFT_REVIEW_TERM and should be saved for admin review.',
    },
  });
  assert.equal(softReviewText.response.status, 200, 'admin announcement should allow soft-review text');
  assert.equal(softReviewText.data?.ok, true, 'soft-review announcement should return ok=true');
  assert.match(
    softReviewText.data?.announcement?.body || '',
    /QA_SOFT_REVIEW_TERM/,
    'soft-review announcement should retain original admin body text',
  );
  const moderationEventsRaw = JSON.parse(await fs.readFile(
    path.join(tempDir, 'taoyuan_content_moderation_events.json'),
    'utf8',
  ));
  assert.ok((moderationEventsRaw.events || []).some(event => (
    event.scene === 'admin_announcement'
    && event.field === 'body'
    && event.action === 'soft_review'
    && event.outcome === 'allowed_with_review'
    && event.matched_category === 'qa_soft_review'
    && event.matched_term_hash
    && !event.matched_term
  )), 'soft-review admin announcement should create a sanitized moderation audit event');

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
