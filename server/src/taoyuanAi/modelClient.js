const { validateModelStructuredOutput } = require('./modelStructuredOutput');

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
    '4. 回答尽量简洁、面向玩家、可执行。',
    '5. 如果问题是找文件、找定义、找实现、找条件、找调用，请优先给出文件路径、符号名或位置，再解释。',
    '6. evidence_ids 只能使用上方证据片段里真实存在的 evidence_id；没有依据时返回空数组。',
    '7. matched_files 只能使用上方证据片段里真实存在的 path；没有文件依据时返回空数组。',
    '8. actions 只允许安全轻动作：navigate、open_page、open_mail、open_activity、open_quest、copy_checklist、expand_page、mark_goal；没有安全动作时返回空数组。',
    '9. 只输出一个 JSON 对象，不要使用 Markdown 代码块，格式如下：',
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

module.exports = {
  configureAiAssistantModelClient,
  buildChatCompletionsUrl,
  extractModelText,
  safeJson,
  buildModelUserPrompt,
  buildModelRequestBody,
  callRemoteModel,
};
