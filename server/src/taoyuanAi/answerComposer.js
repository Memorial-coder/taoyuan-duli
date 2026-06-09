let routeLabels = {};
let sourceModuleLabels = {};
let isUnsafePublicSummaryText = () => false;

const RESOURCE_LOOKUP_KINDS = new Set(['resource', 'crop', 'fish', 'mineral', 'quest_item', 'recipe', 'seed', 'material']);
const RESOURCE_SOURCE_TYPE_LABELS = {
  shop: '购买',
  harvest: '种植',
  forage: '采集',
  fishing: '钓鱼',
  mining: '采矿',
  processing: '加工',
  recipe: '配方',
  quest: '任务',
  drop: '掉落',
  fishpond: '鱼塘',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  recycle: '回收',
  travel: '旅行商人',
  ingredient: '材料',
  stamina: '恢复',
  upgrade: '升级',
  building: '建筑',
  unlock: '解锁',
  system: '系统',
};
const RESOURCE_SOURCE_PRIORITY = [
  'shop',
  'harvest',
  'forage',
  'fishing',
  'mining',
  'processing',
  'recycle',
  'fishpond',
  'breeding',
  'quest',
  'drop',
  'recipe',
  'system',
];
const TASK_DIAGNOSIS_KIND_LABELS = {
  accepted: '接取状态',
  objective: '目标',
  inventory: '库存',
  delivery: '交付对象/地点',
  quantity: '数量',
  precondition: '前置',
  time: '时间',
  season: '季节',
  building: '建筑等级',
};
const TASK_DIAGNOSIS_KIND_ORDER = [
  'accepted',
  'objective',
  'inventory',
  'delivery',
  'quantity',
  'precondition',
  'time',
  'season',
  'building',
];

const PUBLIC_AI_SOURCE_TYPE_LABELS = {
  'built-in': '内置知识库',
  'structured-knowledge': '结构化资料',
  manual: '管理知识库',
  source: '知识库整理',
  'source-auto': '知识库整理',
  'source-index': '源码索引',
  'source-symbol': '源码符号',
  'source-directory': '模块目录',
  'source-fullfile': '源码文件',
  'source-noun-lexicon': '名词词典',
};

const AI_PROVIDER_LABELS = {
  local: '内置知识库',
  model: '远程模型',
  fallback: 'fallback',
  guard: '安全保护',
};

const REMOTE_MODEL_FALLBACK_NOTICE = '远程模型暂不可用，本次使用内置知识库回答。';
const AI_ASSISTANT_STREAM_DELTA_MAX_LENGTH = 96;
const AI_ASSISTANT_STREAM_PHASES = Object.freeze([
  { phase: 'understanding', label: '正在理解问题', detail: '正在识别问题意图和安全边界。' },
  { phase: 'reading_context', label: '正在读取当前页面和任务状态', detail: '只会使用玩家可见的只读摘要。' },
  { phase: 'matching_knowledge', label: '正在匹配知识库', detail: '正在查找内置知识库和公开资料。' },
  { phase: 'organizing', label: '正在整理建议', detail: '正在组织结论、依据和安全轻动作。' },
]);
const AI_CONTEXT_EXTRA_SENSITIVE_TEXT_PATTERNS = [
  /(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌)/i,
  /(?:后台规则|后台配置|风控|隐藏掉率|完整源码|源码文件|process\.env)/i,
  /(?:adminCompensationAuditId|internalReceiptIdempotencyKey|hiddenRiskRule|hiddenDropRateFixture|backend_rule_fixture)/i,
];

function configureAiAssistantAnswerComposer(options = {}) {
  if (options.routeLabels && typeof options.routeLabels === 'object') routeLabels = options.routeLabels;
  if (options.sourceModuleLabels && typeof options.sourceModuleLabels === 'object') {
    sourceModuleLabels = options.sourceModuleLabels;
  }
  if (typeof options.isUnsafePublicSummaryText === 'function') {
    isUnsafePublicSummaryText = options.isUnsafePublicSummaryText;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function normalizeTemplateItems(items = [], maxItems = 4) {
  return unique(
    toArray(items)
      .map(item => String(item || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  ).slice(0, maxItems);
}

function formatTemplateItems(items = [], maxItems = 4) {
  return normalizeTemplateItems(items, maxItems)
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');
}

function composePlayerTemplateAnswer({
  intro = '',
  legacyLead = '',
  conclusion = '',
  reasons = [],
  steps = [],
  cautions = [],
  evidence = [],
  related = [],
}) {
  const sections = [];
  if (intro) sections.push(intro);
  if (legacyLead) sections.push(legacyLead);
  sections.push(`结论：${String(conclusion || '我暂时无法确认，需要更具体的问题或页面线索。').trim()}`);

  const reasonText = formatTemplateItems(reasons, 4);
  if (reasonText) sections.push(`原因：\n${reasonText}`);

  const stepText = formatTemplateItems(steps, 5);
  if (stepText) sections.push(`步骤：\n${stepText}`);

  const cautionText = formatTemplateItems(cautions, 4);
  if (cautionText) sections.push(`注意事项：\n${cautionText}`);

  const evidenceText = formatTemplateItems(evidence, 4);
  if (evidenceText) sections.push(`依据：\n${evidenceText}`);

  const relatedText = formatTemplateItems(related, 3);
  if (relatedText) sections.push(`相关：\n${relatedText}`);

  return sections.filter(Boolean).join('\n\n');
}

function getTemplateStrictModeCautions(mode) {
  return mode === 'strict'
    ? ['当前是严格模式：只使用玩家可见的公开资料或公开状态摘要，不提供隐藏数值、不公开规则或敏感信息。']
    : [];
}

function buildClarificationOptions(queryPlan = {}, routeName = '') {
  const options = queryPlan?.clarification?.options?.length
    ? queryPlan.clarification.options
    : [
        '你想查某个物品从哪来吗？',
        '你想看某个任务卡在哪里吗？',
        '你想了解当前页面或系统怎么玩吗？',
      ];
  const relatedRouteLabels = unique([
    routeName,
    ...(queryPlan?.routeHints || []),
  ].map(item => routeLabels[item] || item).filter(Boolean));
  return {
    options: options.slice(0, 3),
    routeLabels: relatedRouteLabels.slice(0, 2),
  };
}

function composeClarificationAnswer({ question, intro, queryPlan, routeName = '' }) {
  const { options, routeLabels: relatedRouteLabels } = buildClarificationOptions(queryPlan, routeName);
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我还没识别出明确的物品、任务、NPC、地点或系统。`,
    conclusion: '我需要一个更具体的对象、系统或目标，才能给出可执行路线。',
    reasons: [
      '本地意图识别没有命中明确对象。',
      '当前问题缺少可匹配的物品、任务、NPC、地点或系统名。',
    ],
    steps: [
      ...options,
      relatedRouteLabels.length ? `也可以先打开这些相关页面再追问：${relatedRouteLabels.join('、')}。` : '',
    ],
    cautions: ['尽量带上物品名、任务名、NPC 名或当前页面，这样可以直接给出步骤。'],
    evidence: ['本地槽位抽取未命中明确对象。'],
  });
}

function composeNoMatchAnswer({ question, intro, queryPlan, routeName, mode }) {
  const { options, routeLabels: relatedRouteLabels } = buildClarificationOptions(queryPlan, routeName);
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我暂时无法从当前整理的公开游戏资料中确认答案。`,
    conclusion: '可以先补充更具体的对象，或换成来源、任务、页面玩法这类问题。',
    reasons: ['当前公开知识库没有找到足够匹配的条目。'],
    steps: [
      ...options,
      relatedRouteLabels.length ? `推荐先查看：${relatedRouteLabels.join('、')}。` : '也可以问“当前页面主要做什么”来获取页面级建议。',
    ],
    cautions: getTemplateStrictModeCautions(mode),
    evidence: ['本地知识检索无可用命中。'],
  });
}

function formatStructuredKnowledgeRecords(records = []) {
  return records.map(item => {
    const parts = [
      item.label,
      item.detail,
      item.quantity ? `数量：${item.quantity}` : '',
      item.conditions?.length ? `条件：${item.conditions.join('、')}` : '',
    ].filter(Boolean);
    return parts.join('，');
  });
}

function getResourceSourceTypeLabel(type = '') {
  const normalized = String(type || '').trim();
  return RESOURCE_SOURCE_TYPE_LABELS[normalized] || normalized || '来源';
}

function formatResourceLookupRecord(record = {}) {
  const typeLabel = getResourceSourceTypeLabel(record.type);
  const detail = formatStructuredKnowledgeRecords([record])[0] || [record.label, record.detail].filter(Boolean).join('，');
  return detail ? `【${typeLabel}】${detail}` : '';
}

function pickFastResourceSourceRecord(entry = {}) {
  const records = (entry.sources || []).filter(item => item?.label || item?.detail);
  if (!records.length) return null;
  return [...records].sort((a, b) => {
    const aIndex = RESOURCE_SOURCE_PRIORITY.includes(a.type) ? RESOURCE_SOURCE_PRIORITY.indexOf(a.type) : 999;
    const bIndex = RESOURCE_SOURCE_PRIORITY.includes(b.type) ? RESOURCE_SOURCE_PRIORITY.indexOf(b.type) : 999;
    return aIndex - bIndex;
  })[0];
}

function shouldUseResourceLookupAnswer(entry = {}, queryPlan = {}, question = '') {
  if (!RESOURCE_LOOKUP_KINDS.has(entry.kind)) return false;
  const types = new Set(queryPlan?.questionTypes || []);
  const intents = new Set(queryPlan?.intents || []);
  return (
    types.has('resource-source')
    || types.has('shop-purchase')
    || types.has('precondition')
    || types.has('recipe')
    || intents.has('find_source')
    || /来源|从哪来|哪来|怎么获得|怎么获取|怎么拿|怎么搞|怎么弄|怎么做|制作|配方|最快|推荐路线|哪里|在哪|去哪|哪买|购买|采集|掉落|产出|解锁/i.test(question)
  );
}

function getContextObjectForAnswer(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function isUnsafeContextText(value = '') {
  const text = String(value || '');
  return isUnsafePublicSummaryText(text) || AI_CONTEXT_EXTRA_SENSITIVE_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

function normalizeContextTextForAnswer(value, maxLength = 80) {
  if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return '';
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (isUnsafeContextText(text)) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildStructuredUnlockStatus(entry = {}, contextSnapshot = null, routeName = '') {
  const context = getContextObjectForAnswer(contextSnapshot);
  const baseState = getContextObjectForAnswer(context?.baseState) || getContextObjectForAnswer(context?.base);
  const currentRouteName = normalizeContextTextForAnswer(baseState?.currentRouteName || context?.currentRouteName || routeName, 40);
  const currentRouteLabel = normalizeContextTextForAnswer(baseState?.currentPageLabel || routeLabels[currentRouteName] || '', 60);
  const relatedToCurrentRoute = currentRouteName && (entry.routeHints || []).includes(currentRouteName);
  const publicCondition = entry.unlock || '公开资料没有给出明确解锁条件。';

  if (relatedToCurrentRoute) {
    return `当前是否已解锁：当前问题来自【${currentRouteLabel || routeLabels[currentRouteName] || currentRouteName}】相关入口，我只能确认它与该资源路线相关；实际资源、商品、建筑或配方是否已满足，以页面可见状态为准。公开条件：${publicCondition}`;
  }

  if (context) {
    return `当前是否已解锁：当前只读摘要里没有该资源的明确解锁标记，我不会臆造。公开条件：${publicCondition}`;
  }

  return `当前是否已解锁：本次没有收到玩家可见的解锁摘要，我不会臆造。公开条件：${publicCondition}`;
}

function buildResourceFastRoute(entry = {}) {
  if (entry.fastRoute) return entry.fastRoute;
  const record = pickFastResourceSourceRecord(entry);
  if (record) return formatResourceLookupRecord(record);
  return '资料不足，暂时不能判断最快路线。';
}

function buildResourceRecommendedRoute(entry = {}) {
  if (entry.recommendedRoute) return entry.recommendedRoute;
  const record = pickFastResourceSourceRecord(entry);
  const relatedRouteLabels = unique((entry.routeHints || []).map(routeName => routeLabels[routeName] || routeName).filter(Boolean));
  if (record) {
    const sourceText = formatResourceLookupRecord(record);
    return relatedRouteLabels.length
      ? `优先走${sourceText}；如果入口未出现，再去${relatedRouteLabels.slice(0, 3).join('、')}核对前置。`
      : `优先走${sourceText}；如果入口未出现，以对应页面的公开前置为准。`;
  }
  return relatedRouteLabels.length
    ? `先查看${relatedRouteLabels.slice(0, 3).join('、')}，目前资料不足以给出更快路线。`
    : '资料不足，暂时只能建议补充物品名、当前页面或任务目标后再查。';
}

function composeResourceLookupAnswer({ question, contextLabel, entry, supplements = [], mode, queryPlan = {}, contextSnapshot = null }) {
  const sources = (entry.sources || []).map(formatResourceLookupRecord).filter(Boolean);
  const uses = formatStructuredKnowledgeRecords(entry.uses || []);
  const sourceTypeLabels = unique((entry.sources || []).map(item => getResourceSourceTypeLabel(item.type)).filter(Boolean));
  const routeHints = unique((entry.routeHints || []).map(routeName => routeLabels[routeName] || routeName).filter(Boolean));
  const fastRoute = buildResourceFastRoute(entry);
  const unlockStatus = buildStructuredUnlockStatus(entry, contextSnapshot, queryPlan.routeName || '');
  const recommendedRoute = buildResourceRecommendedRoute(entry);
  const routeSteps = entry.routeSteps?.length
    ? entry.routeSteps.map(item => `推荐路线：${item}`)
    : [`推荐路线：${recommendedRoute}`];

  return composePlayerTemplateAnswer({
    intro: contextLabel ? `你当前大概率在【${contextLabel}】相关场景。` : '',
    legacyLead: `关于“${question}”，我先按结构化公开资料回答：${entry.title}。`,
    conclusion: `资源反查：${entry.title}。${entry.summary || '可以先按公开资料确认来源、解锁条件和推荐路线。'}`,
    reasons: [
      `命中了结构化资源索引：${entry.title}`,
      sourceTypeLabels.length ? `来源类型：${sourceTypeLabels.join('、')}。` : '当前资料没有足够来源记录。',
      routeHints.length ? `关联页面：${routeHints.slice(0, 3).join('、')}。` : '',
      uses.length ? `用途线索：${uses.slice(0, 2).join('；')}` : '',
    ],
    steps: [
      sources.length ? `来源：\n${sources.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '来源：资料不足，暂时不能确认公开来源。',
      `最快路线：${fastRoute}`,
      unlockStatus,
      ...routeSteps,
    ],
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      '如果当前页面没有出现对应入口、商品或配方，以玩家可见页面为准；我不会根据隐藏进度臆造已解锁。',
    ],
    evidence: [
      `结构化公开资料回答：${entry.title}`,
      sources.length ? `来源：${sources.slice(0, 3).join('；')}` : '来源资料不足。',
      entry.unlock ? `公开解锁条件：${entry.unlock}` : '',
      `最快路线：${fastRoute}`,
      `推荐路线：${recommendedRoute}`,
    ],
    related: supplements.map(item => `${item.structuredEntry?.title || item.title}：${item.structuredEntry?.summary || item.content}`),
  });
}

function getStructuredTemplateSteps(entry = {}, queryPlan = {}, question = '') {
  const types = new Set(queryPlan?.questionTypes || []);
  const intents = new Set(queryPlan?.intents || []);
  const sourceRecords = formatStructuredKnowledgeRecords(entry.sources || []);
  const useRecords = formatStructuredKnowledgeRecords(entry.uses || []);
  const wantsSource = types.has('resource-source') || intents.has('find_source') || /来源|从哪来|怎么获得|怎么获取|哪里|在哪|去哪|哪买|钓|挖|种/.test(question);
  const wantsUse = types.has('resource-use') || intents.has('explain_usage') || /用途|有什么用|用来|需要|消耗|能做什么|任务|要几个|要多少/.test(question);
  const wantsSystem = types.has('system-mechanic') || types.has('page-feature') || intents.has('explain_system') || intents.has('explain_page') || /怎么玩|页面|系统|机制/.test(question);

  const steps = [];
  if (wantsSource && sourceRecords.length) {
    steps.push(...sourceRecords.slice(0, 3).map(item => `获取路径：${item}`));
  }
  if ((wantsUse || wantsSystem) && useRecords.length) {
    steps.push(...useRecords.slice(0, 3).map(item => `使用/推进：${item}`));
  }
  if (!steps.length && sourceRecords.length) {
    steps.push(...sourceRecords.slice(0, 2).map(item => `先确认：${item}`));
  }
  if (!steps.length && useRecords.length) {
    steps.push(...useRecords.slice(0, 2).map(item => `可关注：${item}`));
  }

  const relatedRouteLabels = unique((entry.routeHints || []).map(item => routeLabels[item] || item).filter(Boolean));
  if (relatedRouteLabels.length) steps.push(`建议查看：${relatedRouteLabels.slice(0, 3).join('、')}。`);
  return steps;
}

function composeStructuredKnowledgeAnswer({ question, contextLabel, matches, mode, queryPlan = {}, contextSnapshot = null }) {
  const [first, ...rest] = matches;
  const entry = first?.structuredEntry;
  if (!entry) return '';

  const supplements = rest
    .filter(item => item?.sourceType === 'structured-knowledge')
    .slice(0, 2);
  if (shouldUseResourceLookupAnswer(entry, queryPlan, question)) {
    return composeResourceLookupAnswer({
      question,
      contextLabel,
      entry,
      supplements,
      mode,
      queryPlan,
      contextSnapshot,
    });
  }

  const sources = formatStructuredKnowledgeRecords(entry.sources || []);
  const uses = formatStructuredKnowledgeRecords(entry.uses || []);
  const routeHints = unique((entry.routeHints || []).map(routeName => routeLabels[routeName] || routeName).filter(Boolean));
  const relationLabels = (entry.relations || []).slice(0, 6);

  return composePlayerTemplateAnswer({
    intro: contextLabel ? `你当前大概率在【${contextLabel}】相关场景。` : '',
    legacyLead: `关于“${question}”，我先按结构化公开资料回答：${entry.title}。`,
    conclusion: entry.summary || `可以先按公开资料确认「${entry.title}」的来源、用途和关联页面。`,
    reasons: [
      `命中了结构化公开资料：${entry.title}`,
      sources.length ? `资料中有 ${sources.length} 条来源记录。` : '',
      uses.length ? `资料中有 ${uses.length} 条用途或推进记录。` : '',
      routeHints.length ? `关联页面：${routeHints.slice(0, 3).join('、')}。` : '',
    ],
    steps: getStructuredTemplateSteps(entry, queryPlan, question),
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      relationLabels.length ? `关联对象可作为后续追问线索：${relationLabels.join('、')}。` : '',
    ],
    evidence: [
      `结构化公开资料回答：${entry.title}`,
      sources.length ? `来源：${sources.slice(0, 2).join('；')}` : '',
      uses.length ? `用途：${uses.slice(0, 2).join('；')}` : '',
    ],
    related: supplements.map(item => `${item.structuredEntry?.title || item.title}：${item.structuredEntry?.summary || item.content}`),
  });
}

function shouldUseTaskDiagnosisAnswer(question = '', queryPlan = {}, diagnostics = {}) {
  if (!diagnostics?.taskDiagnosis?.available || queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') return false;
  const raw = String(question || '');
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  const explicitTaskQuestion = /任务|委托|订单|卡住|缺什么|缺口|卡关|交付|要的|差.*个|差.*条/.test(raw);
  const hasTaskSlot = (queryPlan.slots?.tasks || []).length > 0;
  if (!explicitTaskQuestion && !hasTaskSlot) return false;
  return (
    types.has('task-diagnosis')
    || intents.has('diagnose_task')
    || explicitTaskQuestion
    || hasTaskSlot
  );
}

function formatTaskDiagnosisCheckLine(taskDiagnosis = {}, kind = '') {
  const check = (taskDiagnosis.checks || []).find(item => item.kind === kind);
  const label = TASK_DIAGNOSIS_KIND_LABELS[kind] || kind;
  if (!check) return `${label}：当前公开摘要未给出，我不会臆造。`;
  const nextStep = check.nextStep ? ` 下一步：${check.nextStep}` : '';
  return `${label}：${check.statusLabel}。${check.detail}${nextStep}`;
}

function composeTaskDiagnosisAnswer({ question, intro, taskDiagnosis = {}, mode }) {
  const checks = taskDiagnosis.checks || [];
  if (!checks.length) return '';
  const blockedChecks = taskDiagnosis.blockedChecks || [];
  const top = blockedChecks[0] || checks[0];
  const taskTitle = taskDiagnosis.targetTask?.title || '当前任务';
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我先按当前公开任务摘要做任务诊断。`,
    conclusion: blockedChecks.length
      ? `「${taskTitle}」当前主要卡在：${blockedChecks.map(item => item.label).join('、')}。`
      : `「${taskTitle}」当前没有明确阻塞点，但仍需要逐项核对任务条件。`,
    reasons: [
      `诊断对象：${taskTitle}。`,
      taskDiagnosis.summary || '',
      top ? `优先阻塞：${top.label} - ${top.detail}` : '',
    ],
    steps: [
      `任务条件逐项核对：\n${TASK_DIAGNOSIS_KIND_ORDER.map(kind => formatTaskDiagnosisCheckLine(taskDiagnosis, kind)).join('\n')}`,
      `下一步路线：\n${(taskDiagnosis.routeSteps || []).map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    ],
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      '这是只读诊断：我不会自动交任务、消耗背包物品、发奖励或改存档。',
    ],
    evidence: [
      taskDiagnosis.targetTask?.source ? `任务摘要来源：${taskDiagnosis.targetTask.source}` : '任务摘要来源：当前公开任务上下文。',
      `诊断检查项：${checks.map(item => item.label).join('、')}`,
    ],
  });
}

function shouldUseLocalDiagnostics(question = '', queryPlan = {}, diagnostics = {}) {
  if (!diagnostics?.available || queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') return false;
  const raw = String(question || '');
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  return (
    types.has('today-planning')
    || types.has('task-diagnosis')
    || types.has('risk-reminder')
    || types.has('next-step-suggestion')
    || intents.has('plan_today')
    || intents.has('diagnose_task')
    || intents.has('remind_risk')
    || intents.has('suggest_next_step')
    || /今天|任务|卡住|缺口|风险|提醒|下一步|先做|该做|怎么办|要干嘛/.test(raw)
  );
}

function composeLocalDiagnosticsAnswer({ question, intro, diagnostics = {}, mode, queryPlan = {} }) {
  if (shouldUseTaskDiagnosisAnswer(question, queryPlan || {}, diagnostics)) {
    const taskAnswer = composeTaskDiagnosisAnswer({ question, intro, taskDiagnosis: diagnostics.taskDiagnosis, mode });
    if (taskAnswer) return taskAnswer;
  }
  const suggestions = diagnostics.suggestions || [];
  if (!suggestions.length) return '';
  const [top] = suggestions;
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我先按当前公开状态做本地诊断。`,
    conclusion: `优先处理「${top.title}」（评分 ${top.score}）。`,
    reasons: suggestions.slice(0, 4).map(item => `${item.title}：评分 ${item.score}；原因：${item.reasons.join('；')}`),
    steps: suggestions.slice(0, 4).map(item => {
      const route = item.routeLabel ? `；建议查看：${item.routeLabel}` : '';
      return `建议：${item.recommendation}${route}`;
    }),
    cautions: getTemplateStrictModeCautions(mode),
    evidence: [
      diagnostics.summary ? `本地诊断：${diagnostics.summary}` : '',
      `公开状态信号数：${diagnostics.signals?.length || suggestions.length}`,
    ],
  });
}

function composeSourceAnswer({ question, intro = '', matches = [], mode = 'strict' } = {}) {
  const [first, ...rest] = matches;
  if (!first) return '';

  const fullFileMatches = matches.filter(item => item?.sourceType === 'source-fullfile');
  const directoryMatches = matches.filter(item => item?.sourceType === 'source-directory');
  const sections = [];
  if (intro) sections.push(intro);
  sections.push(`关于“${question}”，我优先按命中的源码文件回答。`);

  if (directoryMatches.length) {
    sections.push(
      directoryMatches
        .slice(0, 1)
        .map(item => `${item.title}\n\n${item.content}`)
        .join('\n\n')
    );
  }

  if (fullFileMatches.length) {
    sections.push(
      fullFileMatches
        .slice(0, 2)
        .map((item, index) => [
          `命中文件 ${index + 1}：${item.path}`,
          item.originTitle ? `命中依据：${item.originTitle}` : '',
          item.symbol ? `关联符号：${item.symbol}${item.lineNumber ? `（第 ${item.lineNumber} 行附近）` : ''}` : '',
          item.content,
        ].filter(Boolean).join('\n\n'))
        .join('\n\n')
    );
  } else {
    sections.push(`最相关证据：\n\n${first.content}`);
  }

  const supplementary = rest
    .filter(item => item?.sourceType !== 'source-fullfile' && item?.sourceType !== 'source-directory')
    .slice(0, 2);
  if (supplementary.length) {
    sections.push(
      '补充线索：\n' + supplementary.map((item, index) => `${index + 1}. ${item.title}：${item.content}`).join('\n')
    );
  }

  if (mode === 'strict') {
    sections.push('当前是严格模式：涉及隐藏数值、掉率、风控、后台规则或敏感实现的内容不会提供。');
  }

  return sections.filter(Boolean).join('\n\n');
}

function composeGenericKnowledgeAnswer({ question, intro = '', matches = [], mode = 'strict' } = {}) {
  const [first, ...rest] = matches;
  if (!first) return '';

  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，根据当前可用的桃源乡资料：`,
    conclusion: first.content,
    reasons: [
      `命中公开资料：${first.title}`,
      first.routeHints?.length ? `关联页面：${first.routeHints.map(item => routeLabels[item] || item).filter(Boolean).slice(0, 3).join('、')}。` : '',
    ],
    steps: [
      first.content,
      ...rest.slice(0, 2).map(item => `${item.title}：${item.content}`),
    ],
    cautions: getTemplateStrictModeCautions(mode),
    evidence: [
      first.title,
      ...rest.slice(0, 2).map(item => item.title),
    ],
  });
}

function buildLocalAnswerIntro({ contextLabel = '', routeName = '' } = {}) {
  if (contextLabel) return `你当前大概率在【${contextLabel}】相关场景。`;
  if (routeName && routeLabels[routeName]) return `你当前大概率在【${routeLabels[routeName]}】相关场景。`;
  return '';
}

function shouldPreferDirectKnowledgeMatch(matches = [], structuredMatches = []) {
  const topMatch = matches[0] || null;
  const topMatchScore = Number(topMatch?.responseScore || topMatch?.score || 0) || 0;
  const firstStructuredScore = Number(structuredMatches[0]?.responseScore || structuredMatches[0]?.score || 0) || 0;
  return ['manual', 'built-in'].includes(String(topMatch?.sourceType || '')) && topMatchScore >= firstStructuredScore;
}

function shouldUseGeneralStructuredAnswer(question = '', queryPlan = {}) {
  return (
    queryPlan.primaryIntent === 'find_source'
    || queryPlan.primaryIntent === 'gameplay_qa'
    || (queryPlan.intents || []).some(intent => ['explain_usage', 'diagnose_task', 'explain_page', 'explain_system', 'suggest_next_step'].includes(intent))
    || (queryPlan.questionTypes || []).some(type => ['resource-use', 'task-diagnosis', 'page-explanation', 'system-mechanic', 'page-feature', 'next-step-suggestion'].includes(type))
    || /来源|从哪来|怎么获得|怎么获取|用途|有什么用|配方|料理|任务|需要|哪里|在哪|哪买|怎么玩|页面|系统|机制|下一步/i.test(question)
  );
}

function composeLocalAnswerFromMatches({
  question,
  routeName = '',
  contextLabel = '',
  matches = [],
  mode = 'strict',
  queryPlan = {},
  diagnostics = {},
  contextSnapshot = null,
} = {}) {
  const intro = buildLocalAnswerIntro({ contextLabel, routeName });
  const structuredMatches = matches.filter(item => item?.sourceType === 'structured-knowledge');
  const firstStructuredEntry = structuredMatches[0]?.structuredEntry;
  const preferDirectKnowledgeMatch = shouldPreferDirectKnowledgeMatch(matches, structuredMatches);
  const hasQuestionItemSlot = (queryPlan.slots?.items || []).length > 0;

  if (shouldUseTaskDiagnosisAnswer(question, queryPlan, diagnostics)) {
    const taskAnswer = composeTaskDiagnosisAnswer({
      question,
      intro,
      taskDiagnosis: diagnostics.taskDiagnosis,
      mode,
    });
    if (taskAnswer) return taskAnswer;
  }

  if (
    structuredMatches.length
    && !preferDirectKnowledgeMatch
    && queryPlan.answerMode !== 'code'
    && queryPlan.sourcePreference !== 'strong'
    && firstStructuredEntry
    && hasQuestionItemSlot
    && shouldUseResourceLookupAnswer(firstStructuredEntry, queryPlan, question)
  ) {
    return composeStructuredKnowledgeAnswer({
      question,
      contextLabel,
      matches: structuredMatches,
      mode,
      queryPlan,
      contextSnapshot,
    }) || '';
  }

  if (shouldUseLocalDiagnostics(question, queryPlan, diagnostics)) {
    return composeLocalDiagnosticsAnswer({ question, intro, diagnostics, mode, queryPlan });
  }

  if (
    queryPlan.clarification?.required
    && queryPlan.answerMode !== 'code'
    && queryPlan.sourcePreference !== 'strong'
  ) {
    return composeClarificationAnswer({ question, intro, queryPlan, routeName });
  }

  if (
    structuredMatches.length
    && !preferDirectKnowledgeMatch
    && queryPlan.answerMode !== 'code'
    && queryPlan.sourcePreference !== 'strong'
    && shouldUseGeneralStructuredAnswer(question, queryPlan)
  ) {
    return composeStructuredKnowledgeAnswer({
      question,
      contextLabel,
      matches: structuredMatches,
      mode,
      queryPlan,
      contextSnapshot,
    }) || '';
  }

  if (!matches.length) {
    return composeNoMatchAnswer({ question, intro, queryPlan, routeName, mode });
  }

  if (queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') {
    return composeSourceAnswer({ question, intro, matches, mode });
  }

  return composeGenericKnowledgeAnswer({ question, intro, matches, mode });
}

function sanitizePublicSummaryText(value = '', fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (isUnsafePublicSummaryText(text)) return fallback;
  return text.slice(0, 120);
}

function appendRemoteModelFallbackNotice(answer = '', reason = '') {
  const base = String(answer || '').trim();
  const safeReason = sanitizePublicSummaryText(reason, '').replace(/[()（）]/g, '').trim();
  const notice = safeReason
    ? `（提示：${REMOTE_MODEL_FALLBACK_NOTICE}原因：${safeReason}。）`
    : `（提示：${REMOTE_MODEL_FALLBACK_NOTICE}）`;
  return base ? `${base}\n\n${notice}` : notice;
}

function getPublicSourceTypeLabel(sourceType = '') {
  return PUBLIC_AI_SOURCE_TYPE_LABELS[sourceType] || '知识资料';
}

function getPublicModuleLabel(item = {}) {
  const sourceType = String(item.sourceType || item.kind || '').trim();
  if (sourceType === 'built-in') return '内置知识库';
  if (sourceType === 'structured-knowledge') return '结构化资料';
  if (sourceType === 'manual') return '管理知识库';
  if (sourceType === 'source-auto' || sourceType === 'source') return '知识库整理';
  const moduleType = String(item.moduleType || '').trim();
  if (moduleType && sourceModuleLabels[moduleType]) return sourceModuleLabels[moduleType];
  return getPublicSourceTypeLabel(sourceType);
}

function buildPublicEvidenceSummary(matches = []) {
  return matches
    .slice(0, 4)
    .map((item, index) => {
      const sourceType = String(item.sourceType || item.kind || 'manual').trim() || 'manual';
      const routeHints = unique(toArray(item.routeHints || item.routeNames || [])
        .map(hint => sanitizePublicSummaryText(routeLabels[hint] || hint, ''))
        .filter(Boolean))
        .slice(0, 3);

      return {
        id: String(item.id || `E${index + 1}`),
        title: sanitizePublicSummaryText(item.title || item.originTitle || '知识资料', '知识资料'),
        sourceType,
        sourceTypeLabel: getPublicSourceTypeLabel(sourceType),
        moduleType: String(item.moduleType || ''),
        moduleLabel: getPublicModuleLabel(item),
        routeHints,
        truncated: item.truncated === true,
      };
    });
}

function buildAiAssistantTraceSummary({ provider, mode, evidence = [], modelTrace = {}, outputGuard = null } = {}) {
  const normalizedProvider = AI_PROVIDER_LABELS[provider] ? provider : 'local';
  const uncertainPoints = outputGuard?.blocked
    ? []
    : toArray(modelTrace?.structured?.uncertain_points || [])
        .map(item => sanitizePublicSummaryText(item, ''))
        .filter(Boolean)
        .slice(0, 3);
  const sourceTypes = unique(evidence.map(item => item.sourceTypeLabel || item.sourceType || '').filter(Boolean));

  return {
    provider: normalizedProvider,
    providerLabel: AI_PROVIDER_LABELS[normalizedProvider],
    mode,
    modeLabel: mode === 'standard' ? '标准模式' : '严格模式',
    answerSourceLabel: AI_PROVIDER_LABELS[normalizedProvider],
    fallback: normalizedProvider === 'fallback',
    guarded: normalizedProvider === 'guard',
    uncertain: uncertainPoints.length > 0,
    uncertainPoints,
    evidenceCount: evidence.length,
    sourceTypes,
  };
}

function getAskStreamPhases() {
  return AI_ASSISTANT_STREAM_PHASES.map(item => ({ ...item }));
}

function splitAskStreamAnswer(answer = '', maxLength = AI_ASSISTANT_STREAM_DELTA_MAX_LENGTH) {
  const text = String(answer || '');
  if (!text) return [];

  const chunks = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + maxLength));
    index += maxLength;
  }
  return chunks;
}

function buildAskStreamResultEvents(result = {}) {
  const answer = String(result.answer || '');
  const mode = result.mode === 'standard' ? 'standard' : 'strict';
  const provider = AI_PROVIDER_LABELS[result.provider] ? result.provider : 'local';
  const payload = {
    answer,
    sources: Array.isArray(result.sources) ? result.sources : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    traceSummary: result.traceSummary || buildAiAssistantTraceSummary({
      provider,
      mode,
      evidence: Array.isArray(result.evidence) ? result.evidence : [],
    }),
    mode,
    provider,
  };

  return [
    ...splitAskStreamAnswer(answer).map(delta => ({ event: 'delta', data: { delta } })),
    {
      event: 'evidence',
      data: {
        evidence: payload.evidence,
        sources: payload.sources,
        suggestions: payload.suggestions,
        traceSummary: payload.traceSummary,
        mode: payload.mode,
        provider: payload.provider,
      },
    },
    { event: 'done', data: { done: true, ...payload } },
  ];
}

module.exports = {
  configureAiAssistantAnswerComposer,
  PUBLIC_AI_SOURCE_TYPE_LABELS,
  AI_PROVIDER_LABELS,
  REMOTE_MODEL_FALLBACK_NOTICE,
  normalizeTemplateItems,
  composePlayerTemplateAnswer,
  getTemplateStrictModeCautions,
  composeClarificationAnswer,
  composeNoMatchAnswer,
  formatStructuredKnowledgeRecords,
  getResourceSourceTypeLabel,
  formatResourceLookupRecord,
  pickFastResourceSourceRecord,
  shouldUseResourceLookupAnswer,
  buildStructuredUnlockStatus,
  buildResourceFastRoute,
  buildResourceRecommendedRoute,
  composeResourceLookupAnswer,
  getStructuredTemplateSteps,
  composeStructuredKnowledgeAnswer,
  shouldUseTaskDiagnosisAnswer,
  formatTaskDiagnosisCheckLine,
  composeTaskDiagnosisAnswer,
  shouldUseLocalDiagnostics,
  composeLocalDiagnosticsAnswer,
  composeSourceAnswer,
  composeGenericKnowledgeAnswer,
  buildLocalAnswerIntro,
  shouldPreferDirectKnowledgeMatch,
  shouldUseGeneralStructuredAnswer,
  composeLocalAnswerFromMatches,
  sanitizePublicSummaryText,
  appendRemoteModelFallbackNotice,
  getPublicSourceTypeLabel,
  getPublicModuleLabel,
  buildPublicEvidenceSummary,
  buildAiAssistantTraceSummary,
  getAskStreamPhases,
  splitAskStreamAnswer,
  buildAskStreamResultEvents,
};
