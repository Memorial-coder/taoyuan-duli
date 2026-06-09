import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-content-route-'));
const storageFile = path.join(tempDir, '.storage.json');
const eventFile = path.join(tempDir, 'taoyuan_content_moderation_events.json');
const host = '127.0.0.1';
const fallbackAdminToken = 'qa_content_route_admin_token_20260605';
const fallbackOfficialControlPassword = 'qa_official_control_password_20260605';
const officialControlHost = 'taoyuanxiang.ymzcc.com';
let serverProcess = null;

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

async function resolveEffectiveAdminToken() {
  const effective = {
    ADMIN_TOKEN: fallbackAdminToken,
    SUPER_ADMIN_TOKEN: '',
  };
  for (const filePath of [
    path.join(serverRoot, '.env'),
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.offical'),
  ]) {
    Object.assign(effective, await loadEnvFile(filePath));
  }
  return String(effective.SUPER_ADMIN_TOKEN || effective.ADMIN_TOKEN || fallbackAdminToken).trim();
}

async function resolveEffectiveOfficialControlPassword() {
  const effective = {
    OFFICIAL_CONTROL_ADMIN_PASSWORD: fallbackOfficialControlPassword,
  };
  for (const filePath of [
    path.join(serverRoot, '.env'),
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.offical'),
  ]) {
    Object.assign(effective, await loadEnvFile(filePath));
  }
  return String(effective.OFFICIAL_CONTROL_ADMIN_PASSWORD || fallbackOfficialControlPassword).trim();
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

async function findPort(start = 4313) {
  for (let port = start; port < start + 40; port += 1) {
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
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function fetchJson(baseUrl, pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  let data = null;
  try {
    data = await response.json();
  } catch {}
  return { response, data };
}

function extractCookie(response) {
  const raw = String(response?.headers?.get('set-cookie') || '');
  return raw.split(';')[0] || '';
}

function fetchJsonWithRawHost(baseUrl, pathname, init = {}) {
  const target = new URL(`${baseUrl}${pathname}`);
  const body = init.body ? String(init.body) : '';
  const headers = {
    ...(init.headers || {}),
    Host: officialControlHost,
  };
  if (body && !headers['Content-Length']) headers['Content-Length'] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: init.method || 'GET',
      headers,
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {}
        resolve({
          response: {
            status: response.statusCode || 0,
            headers: {
              get(name) {
                const value = response.headers[String(name || '').toLowerCase()];
                if (Array.isArray(value)) return value[0] || '';
                return value || '';
              },
            },
          },
          data,
        });
      });
    });
    request.once('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function readEvents() {
  const raw = await fs.readFile(eventFile, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed?.events) ? parsed.events : [];
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

try {
  const port = await findPort();
  const baseUrl = `http://${host}:${port}`;
  const adminToken = await resolveEffectiveAdminToken();
  const officialControlPassword = await resolveEffectiveOfficialControlPassword();
  const { privateKey: officialControlPrivateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
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
      SECRET_KEY: 'qa_content_route_secret_key_20260605',
      ADMIN_TOKEN: fallbackAdminToken,
      SUPER_ADMIN_TOKEN: '',
      CONTENT_MODERATION_AUDIT_SALT: 'qa-content-route-salt',
      OFFICIAL_CONTROL_PLATFORM_ENABLED: 'true',
      OFFICIAL_CONTROL_ADMIN_PASSWORD: fallbackOfficialControlPassword,
      OFFICIAL_CONTROL_PRIVATE_KEY: officialControlPrivateKey.export({ type: 'pkcs8', format: 'pem' }),
      OFFICIAL_CONTROL_UI_ALLOWED_HOSTS: '127.0.0.1,localhost,::1,::ffff:127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on('data', chunk => { serverOutput += String(chunk); });

  await waitForServer(baseUrl);

  const rulesMetadata = await fetchJson(baseUrl, '/api/admin/taoyuan/content-moderation/rules', {
    headers: { 'X-Admin-Token': adminToken },
  });
  assert.equal(rulesMetadata.response.status, 200, 'rules metadata route should be readable by admin');
  assert.equal(rulesMetadata.data?.ok, true, 'rules metadata route should return ok=true');
  assert.equal(typeof rulesMetadata.data?.rules?.version, 'string', 'rules metadata should include version');
  assert.ok(rulesMetadata.data.rules.hard_block_term_count > 0, 'rules metadata should include hard term count');
  assert.ok(!JSON.stringify(rulesMetadata.data.rules).includes('恐怖袭击'), 'rules metadata should not expose raw terms');

  const aiRejected = await fetchJson(baseUrl, '/api/taoyuan/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '这里包含恐怖袭击内容',
      route_name: 'qa_ai_route',
    }),
  });
  assert.equal(aiRejected.response.status, 400, 'AI route should reject hard-block text');
  assert.equal(aiRejected.data?.ok, false, 'AI route should return ok=false');

  const adminRejected = await fetchJson(baseUrl, '/api/admin/content/homepage-about', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
      Host: officialControlHost,
      'X-Forwarded-Host': officialControlHost,
    },
    body: JSON.stringify({
      action: 'draft',
      aboutButtonText: '关于游戏',
      aboutDialogTitle: '关于桃源乡',
      aboutDialogContent: '这里包含恐怖袭击内容',
    }),
  });
  assert.equal(adminRejected.response.status, 400, 'admin content route should reject hard-block text');
  assert.equal(adminRejected.data?.ok, false, 'admin content route should return ok=false');

  const aiConfigRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/ai/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      enabled: true,
      mode: 'strict',
      assistantName: '桃源小助理',
      welcomeMessage: '这里包含恐怖袭击内容',
      consoleCreditMessage: '正常署名',
      systemPrompt: '你是桃源乡游戏内 AI 助手。',
      blockedTopics: '正常拦截主题',
    }),
  });
  assert.equal(aiConfigRejected.response.status, 400, 'admin AI config route should reject hard-block welcome text');
  assert.equal(aiConfigRejected.data?.ok, false, 'admin AI config route should return ok=false');

  const knowledgeRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/ai/knowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      title: 'QA 知识条目',
      content: '这里包含恐怖袭击内容',
      keywords: ['正常关键词'],
      routeNames: ['menu'],
    }),
  });
  assert.equal(knowledgeRejected.response.status, 400, 'admin AI knowledge route should reject hard-block content');
  assert.equal(knowledgeRejected.data?.ok, false, 'admin AI knowledge route should return ok=false');

  const longKnowledgeRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/ai/knowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      title: 'QA 长正文知识条目',
      content: `${'正常内容'.repeat(1100)}恐怖袭击`,
      keywords: ['长正文'],
      routeNames: ['menu'],
    }),
  });
  assert.equal(longKnowledgeRejected.response.status, 400, 'admin AI knowledge route should reject hard-block text after 4000 chars');
  assert.equal(longKnowledgeRejected.data?.ok, false, 'long admin AI knowledge route should return ok=false');

  const sourceDraftRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/ai/knowledge/source-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      question: '这里包含恐怖袭击内容',
      route_name: 'menu',
    }),
  });
  assert.equal(sourceDraftRejected.response.status, 400, 'AI knowledge source draft route should reject hard-block question');
  assert.equal(sourceDraftRejected.data?.ok, false, 'AI knowledge source draft route should return ok=false');

  const androidReleaseRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/android/release-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      enabled: true,
      latestVersionName: '1.0.0',
      latestVersionCode: 1,
      minSupportedVersionCode: 1,
      releaseNotes: '这里包含恐怖袭击内容',
      forceUpdateMessage: '请更新后继续游玩',
    }),
  });
  assert.equal(androidReleaseRejected.response.status, 400, 'android release config should reject hard-block release notes');
  assert.equal(androidReleaseRejected.data?.ok, false, 'android release config should return ok=false');

  const onlineReleaseRejected = await fetchJson(baseUrl, '/api/admin/taoyuan/online-release-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      enabled: true,
      betaTemplates: {
        manor: '庄园灰度开放中',
        society: '社团灰度开放中',
        festival: '节会灰度开放中',
        expedition: '远征灰度开放中',
      },
      releaseNotes: {
        features: '本轮开放联机灰度功能',
        visibleChanges: '大厅展示联机入口',
        playerNotice: '这里包含恐怖袭击内容',
        knownIssues: '暂无',
        rollbackPlan: '如异常将回滚到稳定入口',
      },
    }),
  });
  assert.equal(onlineReleaseRejected.response.status, 400, 'online release config should reject hard-block player notice');
  assert.equal(onlineReleaseRejected.data?.ok, false, 'online release config should return ok=false');

  const hallAdminRegister = await fetchJson(baseUrl, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'qa_route_hall_admin',
      password: 'secret123',
      display_name: 'QA 路由管理员',
    }),
  });
  assert.equal(hallAdminRegister.response.status, 200, 'hall admin QA account should register');
  assert.equal(hallAdminRegister.data?.ok, true, 'hall admin QA account register should return ok=true');
  const hallAdminCookie = extractCookie(hallAdminRegister.response);
  const hallAdminCsrfToken = String(hallAdminRegister.data?.csrf_token || '');
  assert.ok(hallAdminCookie, 'hall admin QA account should return a session cookie');
  assert.ok(hallAdminCsrfToken, 'hall admin QA account should return a csrf token');

  const officialHallPostRejected = await fetchJson(baseUrl, '/api/taoyuan/hall/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
      'X-CSRF-Token': hallAdminCsrfToken,
      Cookie: hallAdminCookie,
    },
    body: JSON.stringify({
      title: '桃源活动公告',
      blocks: [{ type: 'text', text: '这里包含恐怖袭击内容' }],
      is_official: true,
      official_template_type: 'event_announcement',
    }),
  });
  assert.equal(officialHallPostRejected.response.status, 400, 'official hall announcement should reject hard-block post text');
  assert.equal(officialHallPostRejected.data?.ok, false, 'official hall announcement should return ok=false');

  const officialLogin = await fetchJsonWithRawHost(baseUrl, '/api/admin/official-control/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({ password: officialControlPassword }),
  });
  assert.equal(
    officialLogin.response.status,
    200,
    `official control second auth should accept QA password: ${JSON.stringify(officialLogin.data)}`,
  );
  assert.equal(officialLogin.data?.ok, true, 'official control second auth should return ok=true');
  const officialCookie = String(officialLogin.response.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(officialCookie, 'official control second auth should return a session cookie');

  const officialControlRejected = await fetchJsonWithRawHost(baseUrl, '/api/admin/official-control/config/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
      Cookie: officialCookie,
    },
    body: JSON.stringify({
      values: {
        ai_assistant_console_credit: '正常署名',
        ai_assistant_name: '桃源小助理',
        ai_assistant_welcome: '欢迎来桃源乡',
        taoyuan_about_dialog_title: '关于桃源乡',
        taoyuan_about_dialog_content: '这里包含恐怖袭击内容',
      },
    }),
  });
  assert.equal(officialControlRejected.response.status, 400, 'official control publish should reject hard-block managed text');
  assert.equal(officialControlRejected.data?.ok, false, 'official control publish should return ok=false');

  const events = await readEvents();
  assert.ok(events.some(event => (
    event.scene === 'ai_question'
    && event.field === 'question'
    && event.content_type === 'ai_question'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'AI route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_content'
    && event.field === 'about_dialog_content'
    && event.content_type === 'homepage_about'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'admin content route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_ai_config'
    && event.field === 'welcome_message'
    && event.content_type === 'ai_config'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'admin AI config route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_ai_knowledge'
    && event.field === 'content'
    && event.content_type === 'ai_knowledge_entry'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'AI knowledge route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_ai_knowledge_source_draft'
    && event.field === 'source_question'
    && event.content_type === 'ai_knowledge_source_draft'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'AI knowledge source draft route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_android_release_config'
    && event.field === 'release_notes'
    && event.content_type === 'android_release_config'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'android release config route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_online_release_config'
    && event.field === 'release_notes_player_notice'
    && event.content_type === 'online_release_config'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'online release config route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'admin_hall_post'
    && event.field === 'blocks.text'
    && event.content_type === 'hall_post'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'official hall announcement route should create a sanitized moderation event');
  assert.ok(events.some(event => (
    event.scene === 'official_control_config'
    && event.field === 'taoyuan_about_dialog_content'
    && event.content_type === 'official_control_managed_config'
    && event.action === 'hard_block'
    && event.matched_term_hash
    && !event.matched_term
  )), 'official control publish route should create a sanitized moderation event');
  assert.ok(events.every(event => String(event.content_excerpt || '').length <= 80), 'events should keep short excerpts only');

  const updatedRules = await fetchJson(baseUrl, '/api/admin/taoyuan/content-moderation/rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify({
      rules: {
        version: 'qa.route.rules.2',
        hard_block: [
          {
            category: 'qa_route_hard',
            terms: ['星爆路由禁词'],
          },
        ],
        soft_block: [
          {
            category: 'qa_route_soft',
            terms: ['星爆路由软词'],
          },
        ],
        scene_policy: {
          ai_question: 'reject_hard_review_soft',
          admin_content: 'warn_hard_review_soft',
        },
      },
    }),
  });
  assert.equal(updatedRules.response.status, 200, 'rules update route should accept admin update');
  assert.equal(updatedRules.data?.ok, true, 'rules update route should return ok=true');
  assert.equal(updatedRules.data?.rules?.version, 'qa.route.rules.2', 'rules update should return new version metadata');
  assert.ok(!JSON.stringify(updatedRules.data.rules).includes('星爆路由禁词'), 'rules update response should not expose raw terms');

  const dynamicRejected = await fetchJson(baseUrl, '/api/taoyuan/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '星爆路由禁词',
      route_name: 'qa_ai_route_rules',
    }),
  });
  assert.equal(dynamicRejected.response.status, 400, 'AI route should reject dynamically updated hard-block text');
  assert.equal(dynamicRejected.data?.ok, false, 'dynamic AI rejection should return ok=false');

  const dynamicSoftRejected = await fetchJson(baseUrl, '/api/taoyuan/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '星爆路由软词',
      route_name: 'qa_ai_route_soft_rules',
    }),
  });
  assert.equal(dynamicSoftRejected.response.status, 400, 'AI route should reject dynamically updated soft-risk text');
  assert.equal(dynamicSoftRejected.data?.ok, false, 'dynamic soft AI rejection should return ok=false');
  assert.ok(!JSON.stringify(dynamicSoftRejected.data).includes('星爆路由软词'), 'dynamic soft response should not expose raw soft term');

  const softEventQuery = await fetchJson(baseUrl, '/api/admin/taoyuan/content-moderation/events?action=soft_block&page_size=10', {
    headers: { 'X-Admin-Token': adminToken },
  });
  assert.equal(softEventQuery.response.status, 200, 'soft-block moderation events should be queryable by admin');
  assert.equal(softEventQuery.data?.ok, true, 'soft-block moderation event query should return ok=true');
  assert.ok((softEventQuery.data?.events || []).some(event => (
    event.scene === 'ai_question'
    && event.field === 'question'
    && event.action === 'soft_block'
    && event.matched_category === 'qa_route_soft'
    && event.rule_version === 'qa.route.rules.2'
    && event.matched_term_hash
    && !event.matched_term
  )), 'dynamic soft rule should create a sanitized queryable moderation event');

  const auditLogs = await fetchJson(baseUrl, '/api/admin/audit-logs?page_size=10', {
    headers: { 'X-Admin-Token': adminToken },
  });
  assert.equal(auditLogs.response.status, 200, 'admin audit logs should be readable');
  const ruleAudit = (auditLogs.data?.logs || []).find(log => log.action === 'update_content_moderation_rules');
  assert.ok(ruleAudit, 'rules update should create admin audit log');
  assert.equal(ruleAudit.detail?.old_version, rulesMetadata.data.rules.version, 'rules audit should include old version');
  assert.equal(ruleAudit.detail?.new_version, 'qa.route.rules.2', 'rules audit should include new version');
  assert.ok(ruleAudit.detail?.summary, 'rules audit should include summary');
  assert.ok(!JSON.stringify(ruleAudit.detail).includes('星爆路由禁词'), 'rules audit should not expose raw terms');

  const updatedEvents = await readEvents();
  assert.ok(updatedEvents.some(event => (
    event.scene === 'ai_question'
    && event.field === 'question'
    && event.action === 'hard_block'
    && event.matched_category === 'qa_route_hard'
    && event.rule_version === 'qa.route.rules.2'
    && event.matched_term_hash
    && !event.matched_term
  )), 'dynamic rules should create sanitized event with new rule version');
  assert.ok(updatedEvents.some(event => (
    event.scene === 'ai_question'
    && event.field === 'question'
    && event.action === 'soft_block'
    && event.matched_category === 'qa_route_soft'
    && event.rule_version === 'qa.route.rules.2'
    && event.outcome === 'rejected'
    && event.matched_term_hash
    && !event.matched_term
  )), 'dynamic soft rules should create sanitized event with new rule version');

  console.log('qa-content-moderation-route-guard passed');
} catch (error) {
  console.error('[qa-content-moderation-route-guard] FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer();
  await fs.rm(tempDir, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}
