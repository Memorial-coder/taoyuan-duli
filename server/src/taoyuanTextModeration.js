const fs = require('fs');
const path = require('path');

const {
  hashAuditValue,
  recordContentModerationEvent,
} = require('./taoyuanContentModerationAudit');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(PROJECT_ROOT, 'data');
const DEFAULT_RULES_FILE = path.join(PROJECT_ROOT, 'data-defaults', 'taoyuan_content_moderation_rules.json');
const RUNTIME_RULES_FILE = path.join(DATA_DIR, 'taoyuan_content_moderation_rules.json');
const DEFAULT_RULE_VERSION = String(process.env.CONTENT_MODERATION_RULE_VERSION || '2026.0603.1');
const DEFAULT_SCENE_POLICY = 'reject_hard_reject_soft';
const ADMIN_WARNING_POLICY = 'warn_hard_review_soft';
const ALLOW_REVIEW_SCENES = new Set(['admin_mail_campaign']);
let rulesCache = null;

const DEFAULT_BANNED_TERMS = Object.freeze([
  '傻逼',
  '煞笔',
  '妈的',
  '操你',
  '去死',
  '死全家',
  '法轮功',
  '台独',
  '港独',
  '藏独',
  '恐怖袭击',
  '炸弹制作',
  '枪支代购',
  '黄色网站',
  '约炮',
  '卖淫',
  '嫖娼',
  '赌博网站',
  '洗钱',
  '毒品交易',
  '冰毒',
  '海洛因',
]);

const DEFAULT_SOFT_BLOCK_TERMS = Object.freeze([
  '加微信',
  'vx',
  'vx:',
  'qq群',
  'q群',
  '代练',
  '刷金',
  '外挂',
  '开挂',
  '脚本',
  '黑产',
  '私服',
]);

function sanitizeText(value, maxLength = 2000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function normalizeForMatch(value) {
  return sanitizeText(value, 20000)
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '');
}

function countLineBreaks(value) {
  return (String(value || '').match(/\n/g) || []).length;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createRulesError(message, status = 400, code = 'CONTENT_MODERATION_RULES_INVALID') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeRuleCategory(value, fallback = 'uncategorized') {
  return sanitizeText(value || fallback, 80)
    .toLocaleLowerCase('zh-CN')
    .replace(/[^a-z0-9_\u4e00-\u9fa5-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    || fallback;
}

function uniqueSanitizedTerms(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const term = sanitizeText(value, 80);
    const key = normalizeForMatch(term);
    if (!term || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(term);
  }
  return result;
}

function normalizeRuleGroups(groups = [], fallbackCategory = 'uncategorized') {
  return (Array.isArray(groups) ? groups : [])
    .map((group, index) => ({
      category: normalizeRuleCategory(group?.category, `${fallbackCategory}_${index + 1}`),
      terms: uniqueSanitizedTerms(group?.terms),
    }))
    .filter(group => group.terms.length > 0);
}

function normalizeScenePolicy(scenePolicy = {}) {
  const fallback = {
    hall_post: 'reject_hard_review_soft',
    hall_reply: 'reject_hard_review_soft',
    admin_content: ADMIN_WARNING_POLICY,
    admin_mail_campaign: ADMIN_WARNING_POLICY,
  };
  const source = scenePolicy && typeof scenePolicy === 'object' && !Array.isArray(scenePolicy)
    ? scenePolicy
    : {};
  const normalized = {};
  for (const [key, value] of Object.entries({ ...fallback, ...source })) {
    const scene = sanitizeText(key, 80);
    const policy = sanitizeText(value, 80);
    if (scene && policy) normalized[scene] = policy;
  }
  return normalized;
}

function countRuleTerms(groups = []) {
  return groups.reduce((total, group) => total + (Array.isArray(group.terms) ? group.terms.length : 0), 0);
}

function buildInlineFallbackRules() {
  return {
    version: DEFAULT_RULE_VERSION,
    updated_at: 0,
    hard_block: [
      {
        category: 'harassment_abuse',
        terms: DEFAULT_BANNED_TERMS.slice(0, 6),
      },
      {
        category: 'illegal_harmful',
        terms: DEFAULT_BANNED_TERMS.slice(6, 10),
      },
      {
        category: 'terror_extremism',
        terms: DEFAULT_BANNED_TERMS.slice(10, 12),
      },
      {
        category: 'fraud_black_market',
        terms: DEFAULT_BANNED_TERMS.slice(12, 13).concat(DEFAULT_BANNED_TERMS.slice(18, 19)),
      },
      {
        category: 'pornography',
        terms: DEFAULT_BANNED_TERMS.slice(13, 17),
      },
      {
        category: 'gambling_drugs',
        terms: DEFAULT_BANNED_TERMS.slice(17, 18).concat(DEFAULT_BANNED_TERMS.slice(19)),
      },
    ],
    soft_block: [
      {
        category: 'spam_promotion',
        terms: DEFAULT_SOFT_BLOCK_TERMS.slice(),
      },
    ],
    scene_policy: normalizeScenePolicy(),
    source: 'inline_fallback',
  };
}

function normalizeContentModerationRules(rawRules = {}, options = {}) {
  const fallback = buildInlineFallbackRules();
  const raw = rawRules && typeof rawRules === 'object' && !Array.isArray(rawRules) ? rawRules : {};
  const hardBlock = normalizeRuleGroups(raw.hard_block, 'hard_block');
  const softBlock = normalizeRuleGroups(raw.soft_block, 'soft_block');
  const normalized = {
    version: sanitizeText(raw.version || DEFAULT_RULE_VERSION, 80),
    updated_at: Math.max(0, parseInt(raw.updated_at, 10) || Math.floor(Number(options.updatedAt) || 0)),
    hard_block: hardBlock.length ? hardBlock : fallback.hard_block,
    soft_block: softBlock.length ? softBlock : fallback.soft_block,
    scene_policy: normalizeScenePolicy(raw.scene_policy),
    source: sanitizeText(options.source || raw.source || 'runtime', 40),
  };
  if (!normalized.version) normalized.version = DEFAULT_RULE_VERSION;
  return normalized;
}

function getSelectedRulesFile() {
  for (const filePath of [RUNTIME_RULES_FILE, DEFAULT_RULES_FILE]) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        return {
          filePath,
          mtimeMs: stat.mtimeMs,
          updatedAt: Math.floor(stat.mtimeMs / 1000),
          source: filePath === RUNTIME_RULES_FILE ? 'runtime' : 'defaults',
        };
      }
    } catch {}
  }
  return { filePath: '', mtimeMs: 0, updatedAt: 0, source: 'inline_fallback' };
}

function loadContentModerationRules(options = {}) {
  const selected = getSelectedRulesFile();
  const cacheKey = `${selected.filePath || 'inline'}:${selected.mtimeMs}`;
  if (options.force !== true && rulesCache?.cacheKey === cacheKey) {
    return rulesCache.rules;
  }

  let rules = null;
  if (selected.filePath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(selected.filePath, 'utf8'));
      rules = normalizeContentModerationRules(parsed, {
        source: selected.source,
        updatedAt: parsed?.updated_at || selected.updatedAt,
      });
    } catch {}
  }
  if (!rules) {
    rules = normalizeContentModerationRules(buildInlineFallbackRules(), {
      source: 'inline_fallback',
      updatedAt: 0,
    });
  }

  rulesCache = { cacheKey, rules };
  return rules;
}

function flattenRuleTerms(groups = []) {
  const flattened = [];
  for (const group of groups) {
    for (const term of Array.isArray(group.terms) ? group.terms : []) {
      const normalized = normalizeForMatch(term);
      if (!normalized) continue;
      flattened.push({
        term,
        normalized,
        category: group.category || 'uncategorized',
      });
    }
  }
  return flattened;
}

function buildRulesMetadata(rules = loadContentModerationRules()) {
  return {
    version: rules.version,
    updated_at: rules.updated_at,
    source: rules.source,
    hard_block_category_count: rules.hard_block.length,
    hard_block_term_count: countRuleTerms(rules.hard_block),
    soft_block_category_count: rules.soft_block.length,
    soft_block_term_count: countRuleTerms(rules.soft_block),
    hard_block_categories: rules.hard_block.map(group => ({
      category: group.category,
      term_count: group.terms.length,
    })),
    soft_block_categories: rules.soft_block.map(group => ({
      category: group.category,
      term_count: group.terms.length,
    })),
    scene_policy: { ...rules.scene_policy },
  };
}

function getContentModerationRulesMetadata(options = {}) {
  return buildRulesMetadata(loadContentModerationRules(options));
}

function writeJsonFileAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    throw error;
  }
}

function buildRulesChangeSummary(oldRules, nextRules) {
  const oldHard = countRuleTerms(oldRules.hard_block);
  const oldSoft = countRuleTerms(oldRules.soft_block);
  const nextHard = countRuleTerms(nextRules.hard_block);
  const nextSoft = countRuleTerms(nextRules.soft_block);
  return `content moderation rules ${oldRules.version} -> ${nextRules.version}; hard ${oldHard}->${nextHard}; soft ${oldSoft}->${nextSoft}`;
}

async function saveContentModerationRules(rawRules = {}, actor = {}, options = {}) {
  const source = rawRules && typeof rawRules === 'object' && !Array.isArray(rawRules) ? rawRules : {};
  if (!sanitizeText(source.version, 80)) {
    throw createRulesError('内容审核规则需要显式 version');
  }
  const nextRules = normalizeContentModerationRules(source, {
    source: 'runtime',
    updatedAt: nowSeconds(),
  });
  if (countRuleTerms(nextRules.hard_block) <= 0) {
    throw createRulesError('内容审核规则至少需要一个硬拦截规则');
  }

  const oldRules = loadContentModerationRules({ force: true });
  const persisted = {
    version: nextRules.version,
    updated_at: nowSeconds(),
    updated_by: sanitizeText(actor.operator_name || actor.username || actor.displayName || 'admin', 60),
    hard_block: nextRules.hard_block,
    soft_block: nextRules.soft_block,
    scene_policy: nextRules.scene_policy,
  };
  writeJsonFileAtomic(RUNTIME_RULES_FILE, persisted);
  rulesCache = null;
  const reloadedRules = loadContentModerationRules({ force: true });
  const metadata = buildRulesMetadata(reloadedRules);

  let auditLog = null;
  if (options.audit !== false) {
    const operatorName = sanitizeText(actor.operator_name || actor.username || 'admin', 60);
    const operatorRole = sanitizeText(actor.operator_role || actor.role || '', 40);
    const summary = buildRulesChangeSummary(oldRules, reloadedRules);
    const db = require('./db');
    auditLog = await db.recordAdminAuditLog({
      operator_role: operatorRole,
      operator_name: operatorName,
      action: 'update_content_moderation_rules',
      target_username: '',
      detail: {
        request_id: sanitizeText(options.request_id, 80),
        actor_username: operatorName,
        actor_role: operatorRole,
        target_type: 'content_moderation_rules',
        target_id: reloadedRules.version,
        action: 'update_content_moderation_rules',
        outcome: 'completed',
        old_version: oldRules.version,
        new_version: reloadedRules.version,
        rule_version: reloadedRules.version,
        summary,
        hard_block_category_count: metadata.hard_block_category_count,
        hard_block_term_count: metadata.hard_block_term_count,
        soft_block_category_count: metadata.soft_block_category_count,
        soft_block_term_count: metadata.soft_block_term_count,
      },
    });
  }

  return {
    metadata,
    audit_log: auditLog,
  };
}

function normalizeAuditContext(options = {}) {
  if (!options.auditContext || typeof options.auditContext !== 'object' || Array.isArray(options.auditContext)) {
    return {};
  }
  return options.auditContext;
}

function recordModerationViolation(text, hitTerm, options = {}) {
  try {
    const auditContext = normalizeAuditContext(options);
    recordContentModerationEvent({
      request_id: auditContext.request_id,
      scene: auditContext.scene || options.scene || '',
      field: auditContext.field || options.field || '',
      username: auditContext.username || '',
      content_type: auditContext.content_type || 'text',
      content_id: auditContext.content_id || '',
      action: options.action || 'hard_block',
      severity: options.severity || 'high',
      matched_category: options.matchedCategory || options.action || 'text_violation',
      matched_term_hash: hitTerm ? hashAuditValue(hitTerm) : '',
      rule_version: auditContext.rule_version || options.ruleVersion || DEFAULT_RULE_VERSION,
      content: text,
      outcome: auditContext.outcome || options.outcome || 'rejected',
    });
  } catch {}
}

function resolveScenePolicy(rules, scene) {
  const sceneKey = sanitizeText(scene, 80);
  return sanitizeText(rules?.scene_policy?.[sceneKey] || DEFAULT_SCENE_POLICY, 80)
    .toLocaleLowerCase('zh-CN');
}

function shouldAllowModerationHit(policy, kind, scene) {
  if (!ALLOW_REVIEW_SCENES.has(sanitizeText(scene, 80))) return false;
  if (kind === 'hard') {
    return policy.includes('allow_hard') || policy.includes('warn_hard');
  }
  if (kind === 'soft') {
    return policy.startsWith('warn_') || policy.includes('allow_soft') || policy.includes('warn_soft');
  }
  return false;
}

function recordAllowedModerationHit(text, hitTerm, options = {}) {
  recordModerationViolation(text, hitTerm, {
    ...options,
    action: options.action || 'moderation_notice',
    outcome: options.outcome || 'allowed_with_review',
  });
}

function buildViolationResult(reason, hitTerm, options = {}) {
  recordModerationViolation(options.text || '', hitTerm, options);
  const error = new Error(reason);
  error.status = Number(options.status) || 400;
  error.code = options.code || 'TEXT_MODERATION_REJECTED';
  error.moderation = {
    ok: false,
    hit_term_hash: hitTerm ? hashAuditValue(hitTerm) : '',
    code: error.code,
    field: options.field || '',
    scene: options.scene || '',
    action: options.action || 'hard_block',
    matched_category: options.matchedCategory || options.action || 'text_violation',
    rule_version: options.ruleVersion || DEFAULT_RULE_VERSION,
  };
  throw error;
}

function checkCommonShape(text, options = {}) {
  const maxLength = Number(options.maxLength) || 0;
  const minLength = Number(options.minLength) || 0;
  const maxLineBreaks = Number(options.maxLineBreaks) || 0;
  const label = options.label || '文本';

  if (minLength > 0 && Array.from(text).length < minLength) {
    buildViolationResult(`${label}至少需要 ${minLength} 个字`, '', {
      code: 'TEXT_TOO_SHORT',
      field: options.field,
      scene: options.scene,
      text,
      action: 'shape_reject',
      severity: 'low',
      matchedCategory: 'length',
      auditContext: options.auditContext,
    });
  }
  if (maxLength > 0 && Array.from(text).length > maxLength) {
    buildViolationResult(`${label}最多支持 ${maxLength} 个字`, '', {
      code: 'TEXT_TOO_LONG',
      field: options.field,
      scene: options.scene,
      text,
      action: 'shape_reject',
      severity: 'low',
      matchedCategory: 'length',
      auditContext: options.auditContext,
    });
  }
  if (maxLineBreaks > 0 && countLineBreaks(text) > maxLineBreaks) {
    buildViolationResult(`${label}换行过多，请精简后再提交`, '', {
      code: 'TEXT_TOO_MANY_LINES',
      field: options.field,
      scene: options.scene,
      text,
      action: 'shape_reject',
      severity: 'low',
      matchedCategory: 'format',
      auditContext: options.auditContext,
    });
  }
}

function checkTerms(text, options = {}) {
  const rules = options.rules || loadContentModerationRules();
  const policy = resolveScenePolicy(rules, options.scene);
  const normalized = normalizeForMatch(text);
  for (const entry of flattenRuleTerms(rules.hard_block)) {
    if (normalized.includes(entry.normalized)) {
      if (shouldAllowModerationHit(policy, 'hard', options.scene)) {
        recordAllowedModerationHit(text, entry.term, {
          field: options.field,
          scene: options.scene,
          action: 'hard_warning',
          severity: 'high',
          matchedCategory: entry.category || 'hard_block',
          ruleVersion: rules.version,
          auditContext: options.auditContext,
          outcome: 'allowed_with_warning',
        });
        return;
      }
      buildViolationResult(`${options.label || '文本'}包含不允许发布的内容`, entry.term, {
        code: 'TEXT_BANNED_TERM',
        field: options.field,
        scene: options.scene,
        text,
        action: 'hard_block',
        severity: 'high',
        matchedCategory: entry.category || 'hard_block',
        ruleVersion: rules.version,
        auditContext: options.auditContext,
      });
    }
  }
  for (const entry of flattenRuleTerms(rules.soft_block)) {
    if (normalized.includes(entry.normalized)) {
      if (shouldAllowModerationHit(policy, 'soft', options.scene)) {
        recordAllowedModerationHit(text, entry.term, {
          field: options.field,
          scene: options.scene,
          action: 'soft_review',
          severity: 'medium',
          matchedCategory: entry.category || 'soft_block',
          ruleVersion: rules.version,
          auditContext: options.auditContext,
          outcome: 'allowed_with_review',
        });
        return;
      }
      buildViolationResult(`${options.label || '文本'}包含疑似广告或外挂引流内容`, entry.term, {
        code: 'TEXT_SUSPICIOUS_PROMOTION',
        field: options.field,
        scene: options.scene,
        text,
        action: 'soft_block',
        severity: 'medium',
        matchedCategory: entry.category || 'soft_block',
        ruleVersion: rules.version,
        auditContext: options.auditContext,
      });
    }
  }
}

function moderateText(rawValue, options = {}) {
  const text = sanitizeText(rawValue, Number(options.storageMaxLength) || Number(options.maxLength) || 2000);
  const rules = loadContentModerationRules();
  const moderationOptions = {
    ...options,
    ruleVersion: options.ruleVersion || rules.version,
    rules,
  };
  checkCommonShape(text, moderationOptions);
  if (text) checkTerms(text, moderationOptions);
  return text;
}

function moderateCompositeText(fields = [], scene = '') {
  for (const field of fields) {
    moderateText(field?.value, {
      ...field,
      scene: field?.scene || scene,
    });
  }
}

module.exports = {
  moderateText,
  moderateCompositeText,
  loadContentModerationRules,
  getContentModerationRulesMetadata,
  saveContentModerationRules,
  DEFAULT_RULES_FILE,
  RUNTIME_RULES_FILE,
};
