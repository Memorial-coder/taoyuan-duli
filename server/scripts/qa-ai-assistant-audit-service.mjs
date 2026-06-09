import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const auditService = require('../src/taoyuanAi/auditService');
const legacyAuditEntry = require('../src/taoyuanAiAssistantAudit');

assert.equal(
  legacyAuditEntry.buildAiConfigAuditDetail,
  auditService.buildAiConfigAuditDetail,
  'legacy AI audit entry should re-export auditService functions',
);

const fakeApiKey = 'QA_FAKE_AI_KEY_VALUE_123456';
const secretPrompt = 'qa internal prompt with backend rule marker';
const secretQuestion = '请解释 process.env 和后台规则';
const secretKnowledgeContent = 'updated knowledge body should be hashed only';

const configDetail = auditService.buildAiConfigAuditDetail({
  beforeConfig: {
    enabled: true,
    mode: 'standard',
    sourceReadEnabled: false,
    sourceIngestEnabled: false,
    systemPrompt: 'old prompt',
    blockedTopics: 'old topic',
  },
  afterConfig: {
    enabled: true,
    mode: 'strict',
    providerConfigured: true,
    sourceReadEnabled: true,
    sourceIngestEnabled: false,
    apiKeyConfigured: true,
    apiKeyLast4: '3456',
    apiKeySource: 'runtime',
    systemPrompt: secretPrompt,
    blockedTopics: 'apiKey\n后台规则',
  },
  input: {
    apiKey: fakeApiKey,
  },
});

assert.equal(configDetail.target_type, 'ai_config');
assert.equal(configDetail.api_key_action, 'update');
assert.equal(configDetail.api_key_changed, true);
assert.equal(configDetail.api_key_last4, '3456');
assert.equal(configDetail.prompt_changed, true);
assert.equal(configDetail.prompt_length, secretPrompt.length);
assert.equal(configDetail.prompt_hash.length, 32);
assert.equal(configDetail.blocked_topics_changed, true);
assert.equal(JSON.stringify(configDetail).includes(fakeApiKey), false, 'config audit must not include full API key');
assert.equal(JSON.stringify(configDetail).includes(secretPrompt), false, 'config audit must not include full prompt text');
assert.equal(JSON.stringify(configDetail).includes('apiKey\n后台规则'), false, 'config audit must not include full blocked topics text');
assert.ok(configDetail.changed_fields.includes('mode'), 'config audit should record changed safe field names');

assert.equal(
  auditService.resolveApiKeyAction({ clear_api_key: true }),
  'clear',
  'snake_case clear action should be supported',
);
assert.equal(
  auditService.resolveApiKeyAction({ api_key_action: 'clear', api_key: fakeApiKey }),
  'clear',
  'explicit clear action should win over key-like input',
);

const debugDetail = auditService.buildAiDebugAskAuditDetail({
  question: secretQuestion,
  routeName: 'quest',
  result: {
    answer: '公开回答摘要',
    provider: 'local',
    mode: 'strict',
    sources: [{ id: 'source-1' }, { id: 'source-2' }],
    trace: {
      routeName: 'quest',
      evidence: [{ id: 'ev-1' }],
      model: { used: false, blocked: true },
      timings: { totalMs: 42 },
    },
  },
});
assert.equal(debugDetail.question_length, secretQuestion.length);
assert.equal(debugDetail.question_hash.length, 32);
assert.equal(debugDetail.source_count, 2);
assert.equal(debugDetail.evidence_count, 1);
assert.equal(debugDetail.guard_blocked, true);
assert.equal(JSON.stringify(debugDetail).includes(secretQuestion), false, 'debug audit must not include full question');

const knowledgeDetail = auditService.buildAiKnowledgeAuditDetail({
  beforeEntry: {
    id: 'k1',
    title: '旧标题',
    routeNames: ['farm'],
    keywords: ['旧词'],
    content: 'old content',
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    sourceRefs: [],
    reviewStatus: 'draft',
  },
  afterEntry: {
    id: 'k1',
    title: '新标题',
    routeNames: ['farm', 'quest'],
    keywords: ['青菜', '任务'],
    content: secretKnowledgeContent,
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    sourceRefs: [{ path: 'docs/guide.md' }],
    reviewStatus: 'published',
  },
  action: 'publish',
});
assert.equal(knowledgeDetail.target_type, 'ai_knowledge');
assert.equal(knowledgeDetail.content_length, secretKnowledgeContent.length);
assert.equal(knowledgeDetail.content_hash.length, 32);
assert.equal(knowledgeDetail.route_count, 2);
assert.equal(knowledgeDetail.keyword_count, 2);
assert.equal(knowledgeDetail.source_ref_count, 1);
assert.equal(knowledgeDetail.review_status, 'published');
assert.equal(JSON.stringify(knowledgeDetail).includes(secretKnowledgeContent), false, 'knowledge audit must not include full content');
assert.ok(knowledgeDetail.changed_fields.includes('content'), 'knowledge audit should record content field changed without content body');

const indexDetail = auditService.buildAiIndexAuditDetail({
  targetType: 'ai_source_index',
  action: 'rebuild',
  status: {
    version: 3,
    ready: true,
    fileCount: 12,
    entryCount: 34,
    symbolCount: 56,
    builtAt: 789,
  },
});
assert.deepEqual(indexDetail, {
  target_type: 'ai_source_index',
  target_id: 'rebuild',
  version: 3,
  ready: true,
  file_count: 12,
  entry_count: 34,
  symbol_count: 56,
  built_at: 789,
});

const sourceDraftDetail = auditService.buildAiSourceDraftAuditDetail({
  question: secretQuestion,
  routeName: 'farm',
  snippets: [
    { path: 'server/src/visible-public-path.js', content: 'should not copy snippet content' },
    { path: 'server/src/another.js' },
  ],
  draft: { id: 'draft-1', title: '源码草稿标题', content: 'draft body should not copy' },
});
assert.equal(sourceDraftDetail.question_hash.length, 32);
assert.deepEqual(sourceDraftDetail.snippet_paths, ['server/src/visible-public-path.js', 'server/src/another.js']);
assert.equal(sourceDraftDetail.draft_id, 'draft-1');
assert.equal(sourceDraftDetail.draft_title, '源码草稿标题');
assert.equal(JSON.stringify(sourceDraftDetail).includes(secretQuestion), false, 'source draft audit must not include full question');
assert.equal(JSON.stringify(sourceDraftDetail).includes('should not copy snippet content'), false, 'source draft audit must not include snippet content');
assert.equal(JSON.stringify(sourceDraftDetail).includes('draft body should not copy'), false, 'source draft audit must not include draft body');

assert.equal(auditService.hashAuditValue(''), '', 'empty audit hash should stay empty');
assert.equal(auditService.hashAuditValue({ b: 2, a: 1 }), auditService.hashAuditValue({ a: 1, b: 2 }), 'object audit hashes should be stable');

console.log('qa-ai-assistant-audit-service passed');
