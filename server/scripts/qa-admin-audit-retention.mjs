import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-audit-retention-'));
process.env.DB_STORAGE = path.join(tempDir, 'users.json');
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true';
process.env.ADMIN_AUDIT_RETENTION_DAYS = '180';
process.env.ONLINE_AUDIT_RETENTION_DAYS = '180';
process.env.CONTENT_MODERATION_RETENTION_DAYS = '365';
process.env.AUDIT_HASH_SALT = 'qa-audit-retention-salt';

const dbModule = await import('../src/db.js');
const onlineAuditModule = await import('../src/taoyuanOnlineAudit.js');
const contentAuditModule = await import('../src/taoyuanContentModerationAudit.js');
const aiAuditModule = await import('../src/taoyuanAiAssistantAudit.js');

const db = dbModule.default || dbModule;
const onlineAudit = onlineAuditModule.default || onlineAuditModule;
const contentAudit = contentAuditModule.default || contentAuditModule;
const aiAudit = aiAuditModule.default || aiAuditModule;

const now = Math.floor(Date.now() / 1000);
const oldAdminCreatedAt = now - 181 * 86400;
const oldContentCreatedAt = now - 366 * 86400;

for (let index = 0; index < 5010; index += 1) {
  await onlineAudit.recordOnlineAudit({
    id: `qa_online_${index}`,
    username: 'qa_user',
    action: 'qa_online_write',
    route_key: 'qa',
    scope: 'qa',
    request_id: `qa_req_${index}`,
    created_at: now - index,
  });
}

let onlineList = await onlineAudit.listOnlineAudits({ pageSize: 1 });
assert.equal(onlineList.total, 5010, 'online audit should retain more than the previous 5000 row cap');
assert.equal(onlineList.retention_days, 180, 'online audit default retention should be at least 180 days');

const onlineRangeFrom = now - 8;
const onlineRangeTo = now - 3;
const onlineRangeList = await onlineAudit.listOnlineAudits({
  pageSize: 20,
  username: 'qa_user',
  routeKey: 'qa',
  action: 'qa_online_write',
  outcome: 'completed',
  createdFrom: onlineRangeFrom,
  createdTo: onlineRangeTo,
});
assert.equal(onlineRangeList.total, 6, 'online audit should support inclusive createdFrom/createdTo filtering');
assert.ok(
  onlineRangeList.logs.every(entry => entry.created_at >= onlineRangeFrom && entry.created_at <= onlineRangeTo),
  'online audit time-filtered rows should stay inside the requested range',
);
assert.ok(
  !onlineRangeList.logs.some(entry => entry.id === 'qa_online_2'),
  'online audit time filter should exclude rows outside createdFrom/createdTo',
);

const onlineAuditFile = path.join(tempDir, 'taoyuan_online_audits.json');
const onlineStore = JSON.parse(fs.readFileSync(onlineAuditFile, 'utf8'));
onlineStore.logs.unshift(
  {
    id: 'qa_online_old',
    username: 'qa_user',
    action: 'qa_old_action',
    route_key: 'qa',
    scope: 'qa',
    method: 'POST',
    path: '/qa',
    request_id: 'qa_online_old',
    outcome: 'completed',
    status_code: 200,
    created_at: oldAdminCreatedAt,
    detail: {},
  },
  {
    id: 'qa_online_major',
    username: 'qa_user',
    action: 'ban_user_for_image',
    route_key: 'qa',
    scope: 'qa',
    method: 'POST',
    path: '/qa',
    request_id: 'qa_online_major',
    outcome: 'completed',
    status_code: 200,
    created_at: oldAdminCreatedAt,
    detail: { evidence_retention: 'major' },
  },
);
fs.writeFileSync(onlineAuditFile, JSON.stringify(onlineStore, null, 2), 'utf8');
const onlinePrune = await onlineAudit.pruneOnlineAudits({ retentionDays: 180 });
onlineList = await onlineAudit.listOnlineAudits({ pageSize: 100 });
assert.ok(onlinePrune.removed >= 1, 'online prune should remove expired non-major logs');
assert.ok(onlineList.logs.some(entry => entry.id === 'qa_online_major'), 'online prune should preserve major evidence');
assert.ok(!onlineList.logs.some(entry => entry.id === 'qa_online_old'), 'online prune should remove old non-major log');

const adminFilterCreatedAt = now - 120;
const adminFilterOutsideAt = now - 3600;
await db.recordAdminAuditLog({
  id: 'qa_admin_filter_match',
  operator_role: 'super_admin',
  operator_name: 'qa_filter_operator',
  action: 'set_hall_report_status',
  target_username: 'qa_filter_target',
  detail: { target_id: 'qa_report_1', outcome: 'resolved', reason: 'qa range filter' },
  created_at: adminFilterCreatedAt,
});
await db.recordAdminAuditLog({
  id: 'qa_admin_filter_outside',
  operator_role: 'super_admin',
  operator_name: 'qa_other_operator',
  action: 'set_hall_report_status',
  target_username: 'qa_filter_target',
  detail: { target_id: 'qa_report_2', outcome: 'dismissed', reason: 'qa outside range' },
  created_at: adminFilterOutsideAt,
});
await db.recordAdminAuditLog({
  id: 'qa_admin_min_fields',
  operator_role: 'super_admin',
  operator_name: 'qa_min_operator',
  action: 'set_user_quota',
  target_username: 'qa_min_user',
  detail: {
    request_id: 'qa_min_request',
    reason: 'qa minimum field check',
    rule_version: 'qa.audit.rules.1',
    ip_hash: 'qa_ip_hash_min',
    ua_hash: 'qa_ua_hash_min',
  },
  created_at: now - 60,
});
const adminFilteredLogs = await db.listAdminAuditLogs({
  pageSize: 20,
  target_username: 'qa_filter_target',
  operator_name: 'filter_operator',
  action: 'set_hall_report_status',
  outcome: 'resolved',
  created_from: adminFilterCreatedAt - 1,
  created_to: adminFilterCreatedAt + 1,
});
assert.equal(adminFilteredLogs.total, 1, 'admin audit should support time/user/operator/action/outcome filters together');
assert.equal(adminFilteredLogs.logs[0]?.id, 'qa_admin_filter_match', 'admin audit filters should return the expected matching log');
assert.equal(adminFilteredLogs.logs[0]?.detail?.outcome, 'resolved', 'admin audit filter results should keep parsed detail');
const minFieldLogs = await db.listAdminAuditLogs({
  pageSize: 5,
  target_username: 'qa_min_user',
  action: 'set_user_quota',
  outcome: 'completed',
});
assert.equal(minFieldLogs.total, 1, 'admin audit minimum-field fixture should be queryable by default outcome');
const minFieldLog = minFieldLogs.logs[0];
for (const key of [
  'id',
  'request_id',
  'created_at',
  'actor_username',
  'actor_role',
  'target_username',
  'target_type',
  'target_id',
  'action',
  'outcome',
  'reason',
  'rule_version',
  'ip_hash',
  'ua_hash',
  'detail',
]) {
  assert.ok(Object.hasOwn(minFieldLog, key), `admin audit response should include minimum field ${key}`);
}
assert.equal(minFieldLog.request_id, 'qa_min_request', 'admin audit response should expose request_id as a top-level field');
assert.equal(minFieldLog.actor_username, 'qa_min_operator', 'admin audit response should default actor_username from operator_name');
assert.equal(minFieldLog.actor_role, 'super_admin', 'admin audit response should default actor_role from operator_role');
assert.equal(minFieldLog.target_username, 'qa_min_user', 'admin audit response should keep target_username');
assert.equal(minFieldLog.target_id, 'qa_min_user', 'admin audit response should default target_id from target_username');
assert.equal(minFieldLog.outcome, 'completed', 'admin audit response should default missing outcome to completed');
assert.equal(minFieldLog.reason, 'qa minimum field check', 'admin audit response should expose reason as a top-level field');
assert.equal(minFieldLog.rule_version, 'qa.audit.rules.1', 'admin audit response should expose rule_version as a top-level field');
assert.equal(minFieldLog.ip_hash, 'qa_ip_hash_min', 'admin audit response should expose only ip_hash');
assert.equal(minFieldLog.ua_hash, 'qa_ua_hash_min', 'admin audit response should expose only ua_hash');
for (const key of ['request_id', 'actor_username', 'actor_role', 'target_username', 'target_type', 'target_id', 'action', 'outcome', 'reason', 'rule_version', 'ip_hash', 'ua_hash']) {
  assert.ok(Object.hasOwn(minFieldLog.detail, key), `admin audit detail should persist minimum field ${key}`);
}

await db.recordAdminAuditLog({
  id: 'qa_admin_old_ordinary',
  operator_role: 'super_admin',
  operator_name: 'qa_admin',
  action: 'set_user_quota',
  target_username: 'qa_user',
  detail: { created_for: 'qa' },
  created_at: oldAdminCreatedAt,
});
await db.recordAdminAuditLog({
  id: 'qa_admin_old_major',
  operator_role: 'super_admin',
  operator_name: 'qa_admin',
  action: 'ban_user_for_image',
  target_username: 'qa_user',
  detail: { evidence_retention: 'major' },
  created_at: oldAdminCreatedAt,
});
const adminPrune = await db.pruneAdminAuditLogs({ retentionDays: 180 });
const adminLogs = await db.listAdminAuditLogs({ pageSize: 20 });
assert.ok(adminPrune.removed >= 1, 'admin prune should remove expired ordinary audit log');
assert.ok(adminLogs.logs.some(entry => entry.action === 'ban_user_for_image'), 'admin prune should preserve major governance action');
assert.ok(!adminLogs.logs.some(entry => entry.id === 'qa_admin_old_ordinary'), 'admin prune should remove the expired ordinary fixture');

const secretApiKey = 'fixture-ai-secret-key-not-real-123456';
const secretPrompt = 'fixture system prompt must never be logged in full';
const debugQuestion = 'fixture debug question must never be logged in full';
const configAuditDetail = aiAudit.buildAiConfigAuditDetail({
  beforeConfig: {
    enabled: true,
    mode: 'strict',
    sourceReadEnabled: false,
    sourceIngestEnabled: false,
    systemPrompt: 'old prompt',
    blockedTopics: '',
    apiKeyConfigured: false,
  },
  afterConfig: {
    enabled: true,
    mode: 'standard',
    sourceReadEnabled: true,
    sourceIngestEnabled: false,
    systemPrompt: secretPrompt,
    blockedTopics: 'token\nsecret',
    apiKeyConfigured: true,
    apiKeyLast4: '3456',
    apiKeySource: 'runtime',
    providerConfigured: true,
  },
  input: {
    apiKeyAction: 'update',
    apiKey: secretApiKey,
  },
});
const debugAuditDetail = aiAudit.buildAiDebugAskAuditDetail({
  question: debugQuestion,
  routeName: 'farm',
  result: {
    answer: 'debug answer should be summarized by length only',
    mode: 'strict',
    provider: 'local',
    sources: ['内置知识'],
    trace: {
      evidence: [{ evidence_id: 'E1' }],
      model: { used: false },
      timings: { totalMs: 12 },
    },
  },
});
const knowledgeAuditDetail = aiAudit.buildAiKnowledgeAuditDetail({
  beforeEntry: {
    id: 'qa_ai_entry',
    title: 'QA AI Entry',
    routeNames: ['farm'],
    keywords: ['qa'],
    content: 'old content',
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    sourceRefs: [],
    reviewStatus: 'draft',
  },
  afterEntry: {
    id: 'qa_ai_entry',
    title: 'QA AI Entry',
    routeNames: ['farm'],
    keywords: ['qa', 'ai'],
    content: 'updated knowledge body should be hashed only',
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    sourceRefs: [],
    reviewStatus: 'published',
  },
  action: 'publish',
});

for (const [action, detail] of [
  ['update_ai_config', configAuditDetail],
  ['debug_ai_ask', debugAuditDetail],
  ['publish_ai_knowledge', knowledgeAuditDetail],
]) {
  await db.recordAdminAuditLog({
    operator_role: 'super_admin',
    operator_name: 'qa_admin',
    action,
    target_username: '',
    detail: {
      ...detail,
      request_id: `qa_${action}`,
      ip_hash: 'qa_ip_hash',
      ua_hash: 'qa_ua_hash',
    },
  });
}

const aiAuditLogs = await db.listAdminAuditLogs({ pageSize: 20 });
const aiActions = new Set(aiAuditLogs.logs.map(entry => entry.action));
for (const action of ['update_ai_config', 'debug_ai_ask', 'publish_ai_knowledge']) {
  assert.ok(aiActions.has(action), `admin audit should include ${action}`);
}
const aiAuditJson = JSON.stringify(aiAuditLogs.logs.filter(entry => String(entry.action || '').includes('_ai_') || String(entry.action || '').startsWith('debug_ai')));
assert.equal(aiAuditJson.includes(secretApiKey), false, 'AI audit logs must not contain full API keys');
assert.equal(aiAuditJson.includes(secretPrompt), false, 'AI audit logs must not contain full system prompts');
assert.equal(aiAuditJson.includes(debugQuestion), false, 'AI audit logs must not contain full debug questions');
assert.equal(aiAuditJson.includes('updated knowledge body should be hashed only'), false, 'AI audit logs must not contain full knowledge content');
assert.ok(aiAuditJson.includes('"api_key_last4":"3456"'), 'AI config audit should keep safe key last4 metadata');
assert.ok(aiAuditJson.includes('"question_hash"'), 'AI debug audit should store a question hash');
assert.ok(aiAuditJson.includes('"content_hash"'), 'AI knowledge audit should store a content hash');

const contentAuditFile = path.join(tempDir, 'taoyuan_content_moderation_events.json');
fs.writeFileSync(contentAuditFile, JSON.stringify({
  events: [
    {
      id: 'qa_content_old',
      request_id: 'qa_content_old',
      scene: 'qa',
      field: 'body',
      username: 'qa_user',
      content_type: 'text',
      content_id: '',
      action: 'hard_block',
      severity: 'high',
      matched_category: 'hard_block',
      matched_term_hash: 'old_hash',
      rule_version: 'qa',
      content_hash: 'old_content_hash',
      content_excerpt: 'old content',
      outcome: 'rejected',
      created_at: oldContentCreatedAt,
    },
    {
      id: 'qa_content_major',
      request_id: 'qa_content_major',
      scene: 'qa',
      field: 'body',
      username: 'qa_user',
      content_type: 'text',
      content_id: '',
      action: 'hard_block',
      severity: 'critical',
      matched_category: 'hard_block',
      matched_term_hash: 'major_hash',
      rule_version: 'qa',
      content_hash: 'major_content_hash',
      content_excerpt: 'major content',
      outcome: 'rejected',
      created_at: oldContentCreatedAt,
    },
  ],
}, null, 2), 'utf8');
const contentPrune = contentAudit.pruneContentModerationEvents({ retentionDays: 365 });
const contentEvents = contentAudit.listContentModerationEvents({ pageSize: 20 }).events;
assert.ok(contentPrune.removed >= 1, 'content moderation prune should remove expired ordinary event');
assert.ok(contentEvents.some(event => event.id === 'qa_content_major'), 'content moderation prune should preserve critical evidence');
assert.ok(!contentEvents.some(event => event.id === 'qa_content_old'), 'content moderation prune should remove old non-major event');

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('qa-admin-audit-retention passed');
