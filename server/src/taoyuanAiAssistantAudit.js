const crypto = require('crypto');

const CONFIG_AUDIT_FIELDS = [
  'enabled',
  'mode',
  'sourceReadEnabled',
  'sourceIngestEnabled',
  'assistantName',
  'welcomeMessage',
  'consoleCreditMessage',
  'apiUrl',
  'model',
  'temperature',
  'systemPrompt',
  'blockedTopics',
];

const KNOWLEDGE_AUDIT_FIELDS = [
  'title',
  'routeNames',
  'keywords',
  'content',
  'access',
  'enabled',
  'sourceType',
  'sourceRefs',
  'reviewStatus',
];

function sanitizeAuditValue(value, limit = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashAuditValue(value) {
  const raw = typeof value === 'string' ? value : stableStringify(value);
  if (!String(raw || '').trim()) return '';
  return crypto
    .createHash('sha256')
    .update(`taoyuan-ai-audit:${raw}`)
    .digest('hex')
    .slice(0, 32);
}

function normalizeComparable(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean).sort();
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return String(value ?? '').trim();
}

function getChangedFields(before = {}, after = {}, fields = []) {
  return fields.filter(field => stableStringify(normalizeComparable(before?.[field])) !== stableStringify(normalizeComparable(after?.[field])));
}

function resolveApiKeyAction(input = {}) {
  const action = String(input.apiKeyAction || input.api_key_action || '').trim();
  if (input.clearApiKey === true || input.clear_api_key === true || action === 'clear') return 'clear';
  if (String(input.apiKey || input.api_key || '').trim()) return 'update';
  return 'keep';
}

function buildAiConfigAuditDetail({ beforeConfig = {}, afterConfig = {}, input = {} } = {}) {
  const changedFields = getChangedFields(beforeConfig, afterConfig, CONFIG_AUDIT_FIELDS);
  const apiKeyAction = resolveApiKeyAction(input);
  const promptChanged = changedFields.includes('systemPrompt');
  const blockedTopicsChanged = changedFields.includes('blockedTopics');

  return {
    target_type: 'ai_config',
    target_id: 'taoyuan_ai_assistant',
    changed_fields: changedFields,
    mode: sanitizeAuditValue(afterConfig.mode, 40),
    enabled: afterConfig.enabled !== false,
    provider_configured: afterConfig.providerConfigured === true,
    source_read_enabled: afterConfig.sourceReadEnabled === true,
    source_ingest_enabled: afterConfig.sourceIngestEnabled === true,
    api_key_action: apiKeyAction,
    api_key_changed: apiKeyAction !== 'keep',
    api_key_configured: afterConfig.apiKeyConfigured === true,
    api_key_last4: sanitizeAuditValue(afterConfig.apiKeyLast4, 8),
    api_key_source: sanitizeAuditValue(afterConfig.apiKeySource, 40),
    prompt_changed: promptChanged,
    prompt_length: promptChanged ? String(afterConfig.systemPrompt || '').length : undefined,
    prompt_hash: promptChanged ? hashAuditValue(afterConfig.systemPrompt) : undefined,
    blocked_topics_changed: blockedTopicsChanged,
    blocked_topics_length: blockedTopicsChanged ? String(afterConfig.blockedTopics || '').length : undefined,
    blocked_topics_hash: blockedTopicsChanged ? hashAuditValue(afterConfig.blockedTopics) : undefined,
  };
}

function pickKnowledgeEntry(beforeEntry = null, afterEntry = null, fallbackId = '') {
  return afterEntry || beforeEntry || { id: fallbackId };
}

function buildAiKnowledgeAuditDetail({ beforeEntry = null, afterEntry = null, entry = null, id = '', action = '' } = {}) {
  const current = pickKnowledgeEntry(beforeEntry || entry, afterEntry || entry, id);
  const changedFields = beforeEntry && afterEntry
    ? getChangedFields(beforeEntry, afterEntry, KNOWLEDGE_AUDIT_FIELDS)
    : [];
  const content = String(current.content || '');

  return {
    target_type: 'ai_knowledge',
    target_id: sanitizeAuditValue(current.id || id, 120),
    action_scope: sanitizeAuditValue(action, 80),
    title: sanitizeAuditValue(current.title || '', 120),
    changed_fields: changedFields,
    route_count: Array.isArray(current.routeNames) ? current.routeNames.length : 0,
    keyword_count: Array.isArray(current.keywords) ? current.keywords.length : 0,
    source_ref_count: Array.isArray(current.sourceRefs) ? current.sourceRefs.length : 0,
    access: sanitizeAuditValue(current.access || '', 40),
    enabled: current.enabled !== false,
    source_type: sanitizeAuditValue(current.sourceType || '', 80),
    review_status: sanitizeAuditValue(current.reviewStatus || '', 40),
    content_length: content.length,
    content_hash: hashAuditValue(content),
  };
}

function buildAiIndexAuditDetail({ targetType = 'ai_source_index', status = {}, action = 'rebuild' } = {}) {
  return {
    target_type: sanitizeAuditValue(targetType, 80),
    target_id: sanitizeAuditValue(action, 80),
    version: Number(status.version || 0) || 0,
    ready: status.ready === true,
    file_count: Number(status.fileCount || status.file_count || 0) || 0,
    entry_count: Number(status.entryCount || status.entry_count || 0) || 0,
    symbol_count: Number(status.symbolCount || status.symbol_count || 0) || 0,
    built_at: Number(status.builtAt || status.built_at || 0) || 0,
  };
}

function buildAiDebugAskAuditDetail({ question = '', routeName = '', result = {} } = {}) {
  const trace = result.trace || {};
  const evidence = Array.isArray(trace.evidence) ? trace.evidence : [];
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const answer = String(result.answer || '');

  return {
    target_type: 'ai_debug_ask',
    target_id: sanitizeAuditValue(routeName || trace.routeName || 'unknown', 80),
    question_length: String(question || '').length,
    question_hash: hashAuditValue(question),
    route_name: sanitizeAuditValue(routeName || trace.routeName || '', 80),
    mode: sanitizeAuditValue(result.mode || trace.mode || '', 40),
    provider: sanitizeAuditValue(result.provider || trace.provider || '', 40),
    answer_length: answer.length,
    source_count: sources.length,
    evidence_count: evidence.length,
    model_used: trace.model?.used === true,
    guard_blocked: trace.model?.blocked === true || result.provider === 'guard',
    total_ms: Number(trace.timings?.totalMs || 0) || 0,
  };
}

function buildAiSourceDraftAuditDetail({ question = '', routeName = '', snippets = [], draft = null } = {}) {
  return {
    target_type: 'ai_knowledge_source_draft',
    target_id: sanitizeAuditValue(routeName || 'unknown', 80),
    question_length: String(question || '').length,
    question_hash: hashAuditValue(question),
    route_name: sanitizeAuditValue(routeName, 80),
    snippet_count: Array.isArray(snippets) ? snippets.length : 0,
    snippet_paths: Array.isArray(snippets)
      ? snippets.slice(0, 6).map(item => sanitizeAuditValue(item?.path || '', 160)).filter(Boolean)
      : [],
    draft_id: sanitizeAuditValue(draft?.id || '', 120),
    draft_title: sanitizeAuditValue(draft?.title || '', 120),
  };
}

module.exports = {
  buildAiConfigAuditDetail,
  buildAiKnowledgeAuditDetail,
  buildAiIndexAuditDetail,
  buildAiDebugAskAuditDetail,
  buildAiSourceDraftAuditDetail,
  hashAuditValue,
};
