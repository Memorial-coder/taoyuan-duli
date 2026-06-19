const {
  parseModelStructuredPayload,
  validateModelStructuredOutput,
} = require('./modelStructuredOutput');

let getAdminConfig = () => ({});
let getEffectiveApiKeySecret = () => '';
let validateModelApiUrl = apiUrl => ({ url: new URL(String(apiUrl || '').trim()) });
let buildEvidencePayload = snippets => (Array.isArray(snippets) ? snippets : []);
let fetchImpl = (...args) => fetch(...args);

function configureAiAssistantModelClient(options = {}) {
  if (typeof options.getAdminConfig === 'function') getAdminConfig = options.getAdminConfig;
  if (typeof options.getEffectiveApiKeySecret === 'function') {
    getEffectiveApiKeySecret = options.getEffectiveApiKeySecret;
  }
  if (typeof options.validateModelApiUrl === 'function') validateModelApiUrl = options.validateModelApiUrl;
  if (typeof options.buildEvidencePayload === 'function') buildEvidencePayload = options.buildEvidencePayload;
  if (typeof options.fetchImpl === 'function') fetchImpl = options.fetchImpl;
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildChatCompletionsUrl(apiUrl, options = {}) {
  const trimmed = String(apiUrl || '').trim();
  if (!trimmed) return '';
  const validate = typeof options.validateModelApiUrl === 'function'
    ? options.validateModelApiUrl
    : validateModelApiUrl;
  const validation = validate(trimmed);
  const parsedUrl = validation?.url;
  if (!parsedUrl?.href) return '';

  const normalized = parsedUrl.href.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  if (!parsedUrl.pathname || parsedUrl.pathname === '/') return `${parsedUrl.origin}/v1/chat/completions`;
  return `${normalized}/chat/completions`;
}

function extractModelText(data) {
  const choiceContent = data?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string') return choiceContent.trim();
  if (Array.isArray(choiceContent)) {
    return choiceContent
      .map(item => (typeof item?.text === 'string' ? item.text : typeof item === 'string' ? item : ''))
      .join('')
      .trim();
  }
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  if (Array.isArray(data?.content)) {
    return data.content
      .map(item => (typeof item?.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }
  return '';
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeStringList(value, limit = 10, maxLength = 80) {
  return Array.from(new Set(
    toArray(value)
      .map(item => String(item || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map(item => item.slice(0, maxLength))
  )).slice(0, limit);
}

function normalizeSemanticSlots(slots = {}) {
  const source = slots && typeof slots === 'object' && !Array.isArray(slots) ? slots : {};
  return {
    items: normalizeStringList(source.items, 8, 50),
    tasks: normalizeStringList(source.tasks, 6, 70),
    npcs: normalizeStringList(source.npcs, 6, 50),
    locations: normalizeStringList(source.locations, 8, 50),
    quantities: normalizeStringList(source.quantities, 6, 30),
    seasons: normalizeStringList(source.seasons, 4, 20),
    systems: normalizeStringList(source.systems, 8, 50),
  };
}

function normalizeSemanticPrepassPayload(payload = {}) {
  const confidence = Number(payload.confidence);
  return {
    normalizedQuestion: String(payload.normalized_question || payload.normalizedQuestion || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    intents: normalizeStringList(payload.intents, 8, 60),
    questionTypes: normalizeStringList(payload.question_types || payload.questionTypes, 8, 60),
    routeHints: normalizeStringList(payload.route_hints || payload.routeHints, 8, 60),
    sourceTerms: normalizeStringList(payload.source_terms || payload.sourceTerms, 16, 60),
    rewriteQueries: normalizeStringList(payload.rewrite_queries || payload.rewriteQueries, 6, 100),
    slots: normalizeSemanticSlots(payload.slots),
    clarification: {
      required: payload.clarification?.required === true,
      question: String(payload.clarification?.question || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      options: normalizeStringList(payload.clarification?.options, 4, 80),
    },
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

function buildSemanticPrepassPrompt({ question = '', contextLabel = '', routeName = '', queryPlan = null } = {}) {
  return [
    '你只负责把桃源乡玩家的口语问题解析成检索意图，不要回答问题，不要补充事实。',
    `当前页面：${contextLabel || routeName || '未知页面'}`,
    `规则初判意图：${queryPlan?.intents?.join(' / ') || '无'}`,
    `规则初判类型：${queryPlan?.questionTypes?.join(' / ') || '无'}`,
    '',
    '请输出一个 JSON 对象，字段固定如下：',
    '{"normalized_question":"把玩家原话改写成清晰问题","intents":["find_source|explain_usage|diagnose_task|plan_today|explain_page|explain_system|remind_risk|suggest_next_step|gameplay_qa"],"question_types":["resource-source|resource-use|shop-purchase|task-diagnosis|today-planning|page-explanation|system-mechanic|risk-reminder|next-step-suggestion|precondition|recipe|page-feature"],"route_hints":["farm"],"source_terms":["铜矿"],"slots":{"items":[],"tasks":[],"npcs":[],"locations":[],"quantities":[],"seasons":[],"systems":[]},"rewrite_queries":["可用于检索的短查询"],"clarification":{"required":false,"question":"","options":[]},"confidence":0.0}',
    '',
    '约束：',
    '1. 只能做语义理解，不能编造物品、任务、NPC 是否存在。',
    '2. intents 和 question_types 尽量使用上面枚举；不确定就用 gameplay_qa 并降低 confidence。',
    '3. route_hints 优先用页面英文 routeName，例如 farm、quest、mining、shop。',
    '4. confidence 用 0 到 1；低于 0.5 表示只作参考。',
    '',
    '玩家问题：',
    question,
  ].join('\n');
}

function buildModelUserPrompt({ question = '', contextLabel = '', mode = 'strict', queryPlan = null, evidence = [] } = {}) {
  const knowledgeText = evidence.length ? JSON.stringify(evidence, null, 2) : '[]';
  return [
    `回答模式：${mode === 'standard' ? '标准模式' : '严格模式'}`,
    `当前页面：${contextLabel || '未知页面'}`,
    `问题意图：${queryPlan?.intents?.join(' / ') || '未识别'}`,
    `页面提示：${queryPlan?.routeHints?.join(' / ') || '无'}`,
    `需要调用关系检索：${queryPlan?.needsCallGraph ? '是' : '否'}`,
    '请只依据以下资料回答玩家问题，不要补充资料之外的隐藏设定或后台规则。',
    '',
    '【证据片段】',
    knowledgeText,
    '',
    '【玩家问题】',
    question,
    '',
    '【回答要求】',
    '1. 先判断证据是否足够；证据不足时明确说明“我暂时无法确认”。',
    '2. 如果资料不足，请明确说“我暂时无法确认”。',
    '3. 严格模式下，禁止回答掉率、隐藏数值、风控、后台实现、密钥和管理规则。',
    '4. 先把玩家的口语问题归纳成真实意图，再回答；例如“干啥 / 咋办 / 咋弄 / 帮我看看”按今天规划、任务诊断、资源来源或下一步处理。',
    '5. 第一句必须是直接结论，不要解释你是 AI、知识库、fallback 或正在整理。',
    '6. 回答正文最多 260 字；只有资源来源、配方或任务诊断需要列步骤时可以略长。',
    '7. 优先使用“结论 / 为什么 / 下一步 / 注意”的短段落；每段 1-2 句，不堆背景。',
    '8. 正文不要写“证据片段/evidence/评分/诊断报告/本地检索/知识库命中”等内部流程词；把依据留在 evidence_ids 和 matched_files 字段。',
    '9. 如果当前页面、任务、背包、体力、金钱或换季摘要有可见信号，至少引用一个具体信号。',
    '10. 如果问题是找文件、找定义、找实现、找条件、找调用，请优先给出文件路径、符号名或位置，再解释。',
    '11. evidence_ids 只能使用上方证据片段里真实存在的 evidence_id；没有依据时返回空数组。',
    '12. matched_files 只能使用上方证据片段里真实存在的 path；没有文件依据时返回空数组。',
    '13. actions 只允许安全轻动作：navigate、open_page、open_mail、open_activity、open_quest、copy_checklist、expand_page、mark_goal；没有安全动作时返回空数组。',
    '14. 只输出一个 JSON 对象，不要使用 Markdown 代码块，格式如下：',
    '{"intent":"问题意图","answer":"给玩家的最终回答","evidence_ids":["E1"],"matched_files":["路径"],"uncertain_points":["仍不确定的点"],"actions":[]}',
  ].join('\n');
}

function buildModelRequestBody({ adminConfig = {}, systemPrompt = '', userPrompt = '' } = {}) {
  return {
    model: adminConfig.model,
    temperature: adminConfig.temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
}

async function callRemoteModel({ question, contextLabel, mode, snippets, queryPlan = null } = {}, options = {}) {
  const adminConfig = options.adminConfig || getAdminConfig();
  const url = buildChatCompletionsUrl(adminConfig.apiUrl, options);
  if (!url || !adminConfig.model) {
    throw createError('未配置可用的大模型接口', 400);
  }

  const evidenceBuilder = typeof options.buildEvidencePayload === 'function'
    ? options.buildEvidencePayload
    : buildEvidencePayload;
  const evidence = evidenceBuilder(snippets);
  const systemPrompt =
    adminConfig.systemPrompt ||
    '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答；如果资料不足，请明确说不知道，不要编造。';
  const userPrompt = buildModelUserPrompt({ question, contextLabel, mode, queryPlan, evidence });

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = Object.prototype.hasOwnProperty.call(options, 'apiKey')
    ? String(options.apiKey || '').trim()
    : String(getEffectiveApiKeySecret() || '').trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const fetchFn = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetchImpl;
  const AbortControllerImpl = options.AbortControllerImpl || globalThis.AbortController;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : 60000;
  const fetchController = new AbortControllerImpl();
  const fetchTimeout = setTimeout(() => fetchController.abort(), timeoutMs);
  let res;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers,
      signal: fetchController.signal,
      body: JSON.stringify(buildModelRequestBody({ adminConfig, systemPrompt, userPrompt })),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw createError('远程模型响应超时（60s）', 504);
    throw err;
  } finally {
    clearTimeout(fetchTimeout);
  }

  const data = await safeJson(res);
  if (!res.ok) {
    throw createError(data?.error?.message || data?.msg || '调用远程模型失败', 502);
  }

  const rawText = extractModelText(data);
  if (!rawText) throw createError('远程模型未返回有效内容', 502);

  const structured = validateModelStructuredOutput(rawText, evidence);
  return {
    answer: structured.answer,
    rawOutput: rawText,
    structured,
  };
}

async function callRemoteSemanticPrepass({ question, contextLabel, routeName = '', queryPlan = null } = {}, options = {}) {
  const adminConfig = options.adminConfig || getAdminConfig();
  const url = buildChatCompletionsUrl(adminConfig.apiUrl, options);
  if (!url || !adminConfig.model) {
    throw createError('未配置可用的大模型接口', 400);
  }

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = Object.prototype.hasOwnProperty.call(options, 'apiKey')
    ? String(options.apiKey || '').trim()
    : String(getEffectiveApiKeySecret() || '').trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const fetchFn = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetchImpl;
  const AbortControllerImpl = options.AbortControllerImpl || globalThis.AbortController;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : 8000;
  const fetchController = new AbortControllerImpl();
  const fetchTimeout = setTimeout(() => fetchController.abort(), timeoutMs);
  let res;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers,
      signal: fetchController.signal,
      body: JSON.stringify(buildModelRequestBody({
        adminConfig: { ...adminConfig, temperature: 0 },
        systemPrompt: '你是桃源乡 AI 助手的语义解析器。只输出 JSON，不回答玩家问题。',
        userPrompt: buildSemanticPrepassPrompt({ question, contextLabel, routeName, queryPlan }),
      })),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw createError('远程语义解析超时', 504);
    throw err;
  } finally {
    clearTimeout(fetchTimeout);
  }

  const data = await safeJson(res);
  if (!res.ok) {
    throw createError(data?.error?.message || data?.msg || '调用远程语义解析失败', 502);
  }

  const rawText = extractModelText(data);
  const payload = parseModelStructuredPayload(rawText);
  if (!payload) throw createError('远程语义解析未返回结构化 JSON', 502);
  return {
    rawOutput: rawText,
    structured: normalizeSemanticPrepassPayload(payload),
  };
}

module.exports = {
  configureAiAssistantModelClient,
  buildChatCompletionsUrl,
  extractModelText,
  safeJson,
  buildSemanticPrepassPrompt,
  buildModelUserPrompt,
  buildModelRequestBody,
  callRemoteSemanticPrepass,
  callRemoteModel,
};
