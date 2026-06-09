const SAFE_MODEL_ACTION_TYPES = new Set([
  'navigate',
  'open_page',
  'open_mail',
  'open_activity',
  'open_quest',
  'copy_checklist',
  'expand_page',
  'mark_goal',
]);

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function extractJsonBlock(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf('{');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1).trim();
    }
  }

  return '';
}

function parseModelStructuredPayload(rawText = '') {
  const jsonText = extractJsonBlock(rawText);
  if (!jsonText) return null;

  try {
    const payload = JSON.parse(jsonText);
    if (!payload || typeof payload !== 'object') return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizeModelAction(action = {}) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return null;
  const type = String(action.type || action.action || '').trim();
  if (!SAFE_MODEL_ACTION_TYPES.has(type)) return null;
  const label = String(action.label || action.title || '').trim().slice(0, 80);
  if (!label) return null;
  return {
    type,
    label,
    target: String(action.target || action.routeName || action.route_name || action.href || '').trim().slice(0, 160),
    value: String(action.value || action.text || '').trim().slice(0, 1000),
    items: toArray(action.items || action.checklist || [])
      .map(item => String(item || '').trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 20),
  };
}

function normalizeModelStructuredOutputPayload(payload = {}) {
  return {
    intent: String(payload.intent || '').trim().slice(0, 80),
    answer: String(payload.answer || '').trim(),
    evidence_ids: unique(toArray(payload.evidence_ids || payload.evidenceIds || []).map(item => String(item || '').trim()).filter(Boolean)),
    matched_files: unique(toArray(payload.matched_files || payload.matchedFiles || []).map(item => String(item || '').trim()).filter(Boolean)),
    uncertain_points: toArray(payload.uncertain_points || payload.uncertainPoints || []).map(item => String(item || '').trim()).filter(Boolean),
    actions: toArray(payload.actions || []).map(normalizeModelAction).filter(Boolean).slice(0, 5),
  };
}

function parseModelStructuredOutput(rawText = '') {
  const payload = parseModelStructuredPayload(rawText);
  return payload ? normalizeModelStructuredOutputPayload(payload) : null;
}

function hasOwnModelField(payload = {}, snakeName, camelName = snakeName) {
  return Object.prototype.hasOwnProperty.call(payload, snakeName)
    || Object.prototype.hasOwnProperty.call(payload, camelName);
}

function getRawModelArrayField(payload = {}, snakeName, camelName = snakeName) {
  const raw = Object.prototype.hasOwnProperty.call(payload, snakeName)
    ? payload[snakeName]
    : payload[camelName];
  return Array.isArray(raw) ? raw : null;
}

function validateModelStructuredOutput(rawText = '', evidence = []) {
  const payload = parseModelStructuredPayload(rawText);
  if (!payload) throw createError('远程模型必须返回结构化 JSON', 502);

  const missingFields = [];
  if (!hasOwnModelField(payload, 'answer')) missingFields.push('answer');
  if (!hasOwnModelField(payload, 'evidence_ids', 'evidenceIds')) missingFields.push('evidence_ids');
  if (!hasOwnModelField(payload, 'uncertain_points', 'uncertainPoints')) missingFields.push('uncertain_points');
  if (!hasOwnModelField(payload, 'actions')) missingFields.push('actions');
  if (missingFields.length) {
    throw createError(`远程模型结构缺少字段：${missingFields.join(', ')}`, 502);
  }

  const evidenceIdRaw = getRawModelArrayField(payload, 'evidence_ids', 'evidenceIds');
  const matchedFilesRaw = hasOwnModelField(payload, 'matched_files', 'matchedFiles')
    ? getRawModelArrayField(payload, 'matched_files', 'matchedFiles')
    : [];
  const uncertainRaw = getRawModelArrayField(payload, 'uncertain_points', 'uncertainPoints');
  const actionsRaw = getRawModelArrayField(payload, 'actions');
  if (!evidenceIdRaw || !matchedFilesRaw || !uncertainRaw || !actionsRaw) {
    throw createError('远程模型结构字段类型不正确', 502);
  }

  const structured = normalizeModelStructuredOutputPayload(payload);
  if (!structured.answer) throw createError('远程模型结构化回答不能为空', 502);
  if (actionsRaw.length !== structured.actions.length) {
    throw createError('远程模型返回了不允许的动作类型', 502);
  }

  const evidenceIds = new Set(evidence.map(item => String(item.evidence_id || '').trim()).filter(Boolean));
  const invalidEvidenceIds = structured.evidence_ids.filter(id => !evidenceIds.has(id));
  if (invalidEvidenceIds.length) {
    throw createError('远程模型引用了本次证据之外的 evidence', 502);
  }

  const evidencePaths = new Set(evidence.map(item => String(item.path || '').trim()).filter(Boolean));
  const invalidMatchedFiles = structured.matched_files.filter(file => file && !evidencePaths.has(file));
  if (invalidMatchedFiles.length) {
    throw createError('远程模型引用了本次证据之外的文件', 502);
  }

  return structured;
}

module.exports = {
  SAFE_MODEL_ACTION_TYPES,
  extractJsonBlock,
  parseModelStructuredPayload,
  normalizeModelAction,
  normalizeModelStructuredOutputPayload,
  parseModelStructuredOutput,
  validateModelStructuredOutput,
  __testing: {
    getRawModelArrayField,
    hasOwnModelField,
  },
};
