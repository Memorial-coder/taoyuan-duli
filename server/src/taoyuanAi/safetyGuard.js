function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function splitTopics(value) {
  return String(value || '')
    .split(/\r?\n|,|，|;|；/)
    .map(item => item.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBlockedPatterns(mode, blockedTopics = '') {
  const builtIn = [
    /掉率|爆率|出货率|概率|保底概率/i,
    /风控|反作弊|检测逻辑|后台规则/i,
    /管理员口令|管理员密码|密钥|token|api key/i,
    /漏洞|刷资源|刷钱|绕过限制|注入/i,
  ];

  const custom = splitTopics(blockedTopics).map(topic => new RegExp(escapeRegExp(topic), 'i'));
  if (mode === 'strict') return [...builtIn, ...custom];
  return [...builtIn.slice(1), ...custom];
}

function detectSensitiveQuestion(question, mode, options = {}) {
  const normalized = String(question || '').trim();
  if (!normalized) return false;
  return getBlockedPatterns(mode, options.blockedTopics).some(pattern => pattern.test(normalized));
}

const OUTPUT_GUARD_SAFE_ANSWER =
  '这个回答触发了安全保护，可能包含不适合公开展示的后台规则、密钥形态或过长技术细节。本次改用安全提示：我可以继续回答玩家可见的玩法说明、资源路线和任务建议。';

const OUTPUT_SECRET_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/i,
  /Bearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌)\s*[:=：]\s*['"]?[A-Za-z0-9._~+/\-]{12,}/i,
  /\b[A-Fa-f0-9]{48,}\b/,
];

const OUTPUT_INTERNAL_PATH_PATTERNS = [
  /server[\\/]+src[\\/]+/i,
  /server[\\/]+scripts[\\/]+/i,
  /data[\\/]+sys_config\.json/i,
  /data-defaults[\\/]+sys_config\.json/i,
  /(?:^|[\s"`'])\.env(?:[\s"`']|$)/i,
  /\bprocess\.env\b/,
  /\b(?:TAOYUAN_AI_ASSISTANT_API_KEY|AI_ASSISTANT_API_KEY|OPENAI_API_KEY)\b/,
];

const OUTPUT_PROMPT_LEAK_PATTERNS = [
  /(?:系统提示词|内部提示词|开发者消息|后台规则|风控策略)\s*(?:是|为|如下|内容|[:：])/i,
  /(?:system prompt|developer message|hidden prompt)\s*(?:is|as follows|:)/i,
  /(?:忽略|绕过).{0,24}(?:系统提示词|后台规则|风控策略|安全规则)/i,
];

function hasSafeRefusalLanguage(text = '') {
  return /不会|不能|无法|不提供|不公开|不透露|不展示|拒绝|敏感|安全保护|不适合公开|不可公开/i.test(text);
}

function containsLongCodeSnippet(text = '') {
  const fencedBlocks = String(text || '').match(/```[\s\S]*?```/g) || [];
  if (fencedBlocks.some(block => block.length > 360 || block.split(/\r?\n/).length > 10)) return true;

  let codeLineCount = 0;
  let codeLineLength = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (
      /^\s*(?:const|let|var|function|class|import|export|module\.exports|async\s+function|if\s*\(|for\s*\(|while\s*\(|return\b|try\s*\{|catch\s*\(|def\s+|from\s+\S+\s+import\b|SELECT\b|UPDATE\b|INSERT\b|DELETE\b)/i.test(line)
      || /[{};]{2,}/.test(line)
    ) {
      codeLineCount += 1;
      codeLineLength += line.length;
    }
  }

  return codeLineCount >= 8 || codeLineLength >= 700;
}

function containsBackendRuleLeak(text = '') {
  const normalized = String(text || '');
  if (!/(风控|反作弊|后台规则|管理规则|检测逻辑|隐藏规则|系统提示词|prompt)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized) && !OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(normalized))) return false;
  return /(阈值|策略|逻辑|绕过|命中|配置|条件|公式|概率|权重|如下|是|为|内容|接口|路径)/i.test(normalized);
}

function containsHiddenRateLeak(text = '') {
  const normalized = String(text || '');
  if (!/(掉率|爆率|出货率|概率|保底概率|隐藏数值)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized)) return false;
  return /(?:\d+(?:\.\d+)?%|权重|公式|配置|具体|实际|是|为|表格|档位)/i.test(normalized);
}

function containsAbuseGuidance(text = '') {
  const normalized = String(text || '');
  if (!/(漏洞|刷资源|刷钱|绕过限制|注入|越权|作弊)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized)) return false;
  return /(步骤|方法|可以|先|然后|接口|请求|命令|脚本|参数)/i.test(normalized);
}

function isUnsafePublicSummaryText(text = '') {
  const normalized = String(text || '');
  return (
    OUTPUT_SECRET_PATTERNS.some(pattern => pattern.test(normalized))
    || OUTPUT_INTERNAL_PATH_PATTERNS.some(pattern => pattern.test(normalized))
    || OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(normalized))
    || containsBackendRuleLeak(normalized)
    || containsHiddenRateLeak(normalized)
    || containsAbuseGuidance(normalized)
  );
}

function scanAiAssistantOutput(answer = '', options = {}) {
  const text = String(answer || '').trim();
  const reasons = [];
  if (!text) return { blocked: false, reasons, safeAnswer: OUTPUT_GUARD_SAFE_ANSWER };

  if (OUTPUT_SECRET_PATTERNS.some(pattern => pattern.test(text))) reasons.push('secret_shape');
  if (OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(text))) reasons.push('prompt_or_rule_leak');
  if (containsBackendRuleLeak(text)) reasons.push('backend_rule_leak');
  if (containsHiddenRateLeak(text)) reasons.push('hidden_rate_leak');
  if (containsAbuseGuidance(text)) reasons.push('abuse_guidance');

  const shouldBlockInternalTechnicalDetails =
    options.publicRequest === true || options.provider === 'model' || options.debug !== true;
  if (shouldBlockInternalTechnicalDetails && OUTPUT_INTERNAL_PATH_PATTERNS.some(pattern => pattern.test(text))) {
    reasons.push('internal_path_leak');
  }
  if (shouldBlockInternalTechnicalDetails && containsLongCodeSnippet(text)) {
    reasons.push('long_code_snippet');
  }

  return {
    blocked: reasons.length > 0,
    reasons: unique(reasons),
    safeAnswer: OUTPUT_GUARD_SAFE_ANSWER,
  };
}

function sanitizeModelTraceForOutputGuard(modelTrace = {}) {
  const sanitized = {
    ...modelTrace,
    rawOutput: modelTrace.rawOutput ? '[blocked by output guard]' : '',
    error: modelTrace.error || 'output_guard_blocked',
  };
  if (modelTrace.structured) {
    sanitized.structured = {
      ...modelTrace.structured,
      answer: '[blocked by output guard]',
      evidence_ids: [],
      matched_files: [],
      uncertain_points: [],
      actions: [],
    };
  }
  return sanitized;
}

module.exports = {
  getBlockedPatterns,
  detectSensitiveQuestion,
  OUTPUT_GUARD_SAFE_ANSWER,
  OUTPUT_SECRET_PATTERNS,
  OUTPUT_INTERNAL_PATH_PATTERNS,
  OUTPUT_PROMPT_LEAK_PATTERNS,
  containsBackendRuleLeak,
  containsHiddenRateLeak,
  containsAbuseGuidance,
  isUnsafePublicSummaryText,
  scanAiAssistantOutput,
  sanitizeModelTraceForOutputGuard,
};
