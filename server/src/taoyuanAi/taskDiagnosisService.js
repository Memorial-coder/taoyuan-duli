const {
  getContextObject,
  normalizeContextList,
  normalizeContextText,
} = require('./contextSnapshotService');

const TASK_DIAGNOSIS_MAX_TASKS = 8;
const TASK_DIAGNOSIS_MAX_CHECKS = 8;

const STRUCTURED_ITEM_KINDS = new Set(['resource', 'crop', 'fish', 'mineral', 'quest_item', 'recipe', 'seed', 'material']);

const CHINESE_NUMBER_VALUES = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const TASK_DIAGNOSIS_KIND_LABELS = Object.freeze({
  accepted: '接取状态',
  objective: '目标',
  inventory: '库存',
  delivery: '交付对象/地点',
  quantity: '数量',
  precondition: '前置',
  time: '时间',
  season: '季节',
  building: '建筑等级',
});

const TASK_DIAGNOSIS_KIND_ORDER = Object.freeze([
  'accepted',
  'objective',
  'inventory',
  'delivery',
  'quantity',
  'precondition',
  'time',
  'season',
  'building',
]);

const TASK_DIAGNOSIS_STATUS_LABELS = Object.freeze({
  blocked: '阻塞',
  ready: '已满足',
  unknown: '未确认',
});

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function unique(items) {
  return Array.from(new Set((Array.isArray(items) ? items : []).filter(Boolean)));
}

function parseChineseNumber(value = '') {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  if (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_VALUES, text)) return CHINESE_NUMBER_VALUES[text];
  const tenIndex = text.indexOf('十');
  if (tenIndex >= 0) {
    const left = text.slice(0, tenIndex);
    const right = text.slice(tenIndex + 1);
    const tens = left ? CHINESE_NUMBER_VALUES[left] : 1;
    const ones = right ? CHINESE_NUMBER_VALUES[right] : 0;
    if (Number.isFinite(tens) && Number.isFinite(ones)) return tens * 10 + ones;
  }
  return null;
}

function normalizeTaskDiagnosisText(value, maxLength = 120) {
  return normalizeContextText(value, maxLength);
}

function createEmptyTaskDiagnosisResult(question = '') {
  return {
    available: false,
    summary: '',
    targetTask: null,
    checks: [],
    blockedChecks: [],
    routeSteps: [],
    question: normalizeTaskDiagnosisText(question, 80),
  };
}

function taskDiagnosisStatusRank(status = '') {
  if (status === 'blocked') return 3;
  if (status === 'unknown') return 2;
  if (status === 'ready') return 1;
  return 0;
}

function getTaskDiagnosisKindRank(kind = '') {
  const index = TASK_DIAGNOSIS_KIND_ORDER.indexOf(kind);
  return index >= 0 ? index : TASK_DIAGNOSIS_KIND_ORDER.length;
}

function createTaskDiagnosisCheck(input = {}, options = {}) {
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object' ? options.routeLabels : {};
  const kind = String(input.kind || '').trim();
  if (!TASK_DIAGNOSIS_KIND_LABELS[kind]) return null;
  const status = ['blocked', 'ready', 'unknown'].includes(input.status) ? input.status : 'unknown';
  const detail = normalizeTaskDiagnosisText(input.detail, 180);
  const nextStep = normalizeTaskDiagnosisText(input.nextStep, 220);
  if (!detail && !nextStep) return null;
  const routeName = String(input.routeName || 'quest').trim();
  return {
    id: String(input.id || `${kind}:${normalizeText(detail || nextStep)}`).slice(0, 120),
    kind,
    label: TASK_DIAGNOSIS_KIND_LABELS[kind],
    status,
    statusLabel: TASK_DIAGNOSIS_STATUS_LABELS[status] || '未确认',
    detail,
    nextStep,
    routeName,
    routeLabel: normalizeTaskDiagnosisText(input.routeLabel || routeLabels[routeName] || routeName, 40),
    source: normalizeTaskDiagnosisText(input.source || '当前任务摘要', 40),
    itemName: normalizeTaskDiagnosisText(input.itemName, 60),
    quantityText: normalizeTaskDiagnosisText(input.quantityText, 40),
  };
}

function pushTaskDiagnosisCheck(checks, input = {}, options = {}) {
  if (!Array.isArray(checks)) return null;
  const check = createTaskDiagnosisCheck(input, options);
  if (!check) return null;
  if (checks.some(item => item.id === check.id || (item.kind === check.kind && normalizeText(item.detail) === normalizeText(check.detail)))) return null;
  checks.push(check);
  return check;
}

function inferTaskDiagnosisTitle(value = '', fallback = '当前任务') {
  const text = normalizeTaskDiagnosisText(value, 120);
  if (!text) return fallback;
  const stripped = text
    .replace(/^(当前任务|告示板任务|主线任务|主线目标|特殊订单|限时任务|任务阻塞|任务缺口|资源缺口)[:：]\s*/u, '')
    .trim();
  const titleMatch = stripped.match(/^(.{2,28}?(?:任务|委托|订单|采购|交付|请求|主线|支线))/u);
  if (titleMatch) return normalizeTaskDiagnosisText(titleMatch[1], 80);
  const colonIndex = stripped.search(/[:：]/u);
  if (colonIndex > 0) return normalizeTaskDiagnosisText(stripped.slice(0, colonIndex), 80);
  return normalizeTaskDiagnosisText(stripped.split(/[，。；;]/u)[0], 80) || fallback;
}

function getTaskDiagnosisTargetTerms(queryPlan = {}) {
  const slots = queryPlan?.slots || {};
  return unique([
    ...((slots.tasks || []).flatMap(item => [item.label, item.canonical, item.match])),
    ...((slots.items || []).flatMap(item => [item.label, item.canonical, item.match])),
    ...(queryPlan.quotedTerms || []),
  ])
    .map(item => normalizeTaskDiagnosisText(item, 80))
    .filter(item => item && normalizeText(item).length >= 2)
    .slice(0, 8);
}

function taskDiagnosisTextMatchesTargets(text = '', targetTerms = []) {
  const normalizedText = normalizeText(text);
  if (!normalizedText || !targetTerms.length) return true;
  return targetTerms.some(term => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm && (normalizedText.includes(normalizedTerm) || normalizedTerm.includes(normalizedText));
  });
}

function extractTaskDiagnosisQuantityText(text = '') {
  const raw = String(text || '');
  const matches = [];
  const pattern = /(?:缺|差|还差|需要|要|交付|提交|收集|拥有|库存)?\s*(\d+|[一二两三四五六七八九十]{1,3})\s*(个|条|份|颗|块|封|单|只|棵|朵|张|组|次|点|文)?/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const value = parseChineseNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    matches.push(`${value}${match[2] || ''}`);
  }
  return unique(matches).slice(0, 3).join('、');
}

function findStructuredTaskResourceEntry(text = '', queryPlan = {}, resourceEntries = []) {
  const normalizedText = normalizeText(text);
  const slotTerms = [
    ...((queryPlan?.slots?.items || []).flatMap(item => [item.label, item.canonical, item.match])),
  ].map(item => normalizeText(item)).filter(Boolean);
  let best = null;
  for (const entry of Array.isArray(resourceEntries) ? resourceEntries : []) {
    if (!STRUCTURED_ITEM_KINDS.has(entry?.kind)) continue;
    const terms = unique([entry.title, ...(entry.aliases || [])]).filter(Boolean);
    const matchedTerm = terms.find(term => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm && (
        normalizedText.includes(normalizedTerm)
        || slotTerms.some(slotTerm => slotTerm.includes(normalizedTerm) || normalizedTerm.includes(slotTerm))
      );
    });
    if (!matchedTerm) continue;
    const score = normalizeText(matchedTerm).length + ((entry.questionTypes || []).includes('task-diagnosis') ? 8 : 0);
    if (!best || score > best.score) best = { entry, score };
  }
  return best?.entry || null;
}

function buildTaskDiagnosisAcquisitionRoute({ kind = '', text = '', queryPlan = {}, resourceEntries = [], buildResourceRecommendedRoute = null } = {}) {
  const entry = findStructuredTaskResourceEntry(text, queryPlan, resourceEntries);
  if (entry && (kind === 'inventory' || kind === 'quantity')) {
    const fallbackRoute = typeof buildResourceRecommendedRoute === 'function' ? buildResourceRecommendedRoute(entry) : '';
    const route = entry.fastRoute || entry.recommendedRoute || fallbackRoute;
    return normalizeTaskDiagnosisText(`补齐${entry.title}：${route || '先查看对应来源页面'}`, 220);
  }

  if (kind === 'accepted') return '先打开任务/告示板页面接取或追踪该任务，再回到当前任务列表确认目标。';
  if (kind === 'precondition') return '先打开任务关联的系统或前置页面，完成公开前置后再回任务页确认。';
  if (kind === 'season') return '先确认当前季节和任务要求；季节不符时改做不受季节限制的补材、采购或其他任务。';
  if (kind === 'time') return '先确认剩余时间、时段或截止日；时间不满足时改排可立即完成的目标。';
  if (kind === 'building') return '先打开建筑/家园/对应系统页面核对等级和材料，补齐升级条件后再回任务页。';
  if (kind === 'delivery') return '先确认交付对象或地点，再带齐物品去任务页、NPC 或对应建筑完成交付。';
  if (kind === 'objective') return '先在任务页核对目标描述，再按目标关联页面逐项完成。';
  return '先在任务页核对公开目标，再按缺口补资源或完成前置。';
}

function classifyTaskDiagnosisKinds(text = '', sourceKind = '') {
  const raw = String(text || '');
  const kinds = [];
  if (sourceKind === 'board') kinds.push('accepted');
  if (sourceKind === 'active' || sourceKind === 'main' || sourceKind === 'special' || sourceKind === 'limited') kinds.push('accepted');
  if (/未接取|未接|未领取|未接受|待接取|尚未接|告示板/.test(raw)) kinds.push('accepted');
  if (/前置|未解锁|解锁|入口未开|条件不足|需完成|需要完成|先完成/.test(raw)) kinds.push('precondition');
  if (/建筑|等级|鸡舍|牛棚|农舍|温室|鱼塘|育种棚|工坊|作坊|矿洞.*层|铁匠铺.*级/.test(raw)) kinds.push('building');
  if (/季节|春季|夏季|秋季|冬季|非.*季|不符|错过当季/.test(raw)) kinds.push('season');
  if (/时间|时段|上午|下午|傍晚|晚上|夜晚|剩|倒计时|截止|限时|过期|今天内|明天前/.test(raw)) kinds.push('time');
  if (/库存|背包|缺|差|还差|不足|物品|材料|资源/.test(raw)) kinds.push('inventory');
  if (/(\d+|[一二两三四五六七八九十]{1,3})\s*(个|条|份|颗|块|封|单|只|棵|朵|张|组|次|点|文)?/.test(raw)) kinds.push('quantity');
  if (/交付|提交|送给|给.*交|交给|地点|对象|NPC/.test(raw)) kinds.push('delivery');
  if (/目标|进度|完成|采集|收获|钓|挖|种植|加工|制作|料理|升级/.test(raw) || sourceKind === 'objective') kinds.push('objective');
  return unique(kinds).slice(0, TASK_DIAGNOSIS_MAX_CHECKS);
}

function getTaskDiagnosisStatus(kind = '', text = '', sourceKind = '') {
  const raw = String(text || '');
  if (sourceKind === 'board' && kind === 'accepted') return 'blocked';
  if (kind === 'accepted' && (sourceKind === 'active' || sourceKind === 'main' || sourceKind === 'special' || sourceKind === 'limited')) return 'ready';
  if (/未接取|未接|未领取|未接受|待接取|尚未接|不符|不足|缺|差|未解锁|入口未开|条件不足|过期|无法|不能/.test(raw)) return 'blocked';
  if (/已接取|当前|可交付|已满足|可完成|可领取|已完成/.test(raw)) return 'ready';
  return kind === 'objective' || kind === 'delivery' || kind === 'quantity' ? 'unknown' : 'unknown';
}

function buildTaskDiagnosisCheckForLabel(label = '', sourceKind = '', queryPlan = {}, options = {}) {
  const text = normalizeTaskDiagnosisText(label, 180);
  if (!text) return [];
  const resourceEntries = Array.isArray(options.resourceEntries) ? options.resourceEntries : [];
  const checks = [];
  const kinds = classifyTaskDiagnosisKinds(text, sourceKind);
  for (const kind of kinds) {
    const status = getTaskDiagnosisStatus(kind, text, sourceKind);
    const quantityText = kind === 'quantity' ? extractTaskDiagnosisQuantityText(text) : '';
    const resourceEntry = (kind === 'inventory' || kind === 'quantity') ? findStructuredTaskResourceEntry(text, queryPlan, resourceEntries) : null;
    let detail = text;
    if (kind === 'accepted' && sourceKind === 'board') detail = `任务在告示板/可接列表中，当前摘要未显示已接取：${text}`;
    else if (kind === 'accepted' && status === 'ready') detail = `任务已在当前任务列表或专题摘要中出现：${text}`;
    else if (kind === 'inventory') detail = resourceEntry ? `库存缺口指向「${resourceEntry.title}」：${text}` : `库存或资源缺口：${text}`;
    else if (kind === 'quantity' && quantityText) detail = `数量要求/缺口：${quantityText}（${text}）`;
    else if (kind === 'precondition') detail = `前置条件未满足或需要确认：${text}`;
    else if (kind === 'season') detail = `季节条件需要处理：${text}`;
    else if (kind === 'time') detail = `时间/限时条件需要确认：${text}`;
    else if (kind === 'building') detail = `建筑或等级条件需要确认：${text}`;
    else if (kind === 'delivery') detail = `交付对象或地点线索：${text}`;
    else if (kind === 'objective') detail = `任务目标线索：${text}`;

    pushTaskDiagnosisCheck(checks, {
      kind,
      status,
      detail,
      nextStep: buildTaskDiagnosisAcquisitionRoute({
        kind,
        text,
        queryPlan,
        resourceEntries,
        buildResourceRecommendedRoute: options.buildResourceRecommendedRoute,
      }),
      routeName: kind === 'inventory' && resourceEntry?.routeHints?.[0] ? resourceEntry.routeHints[0] : 'quest',
      source: sourceKind === 'board' ? '告示板任务摘要' : sourceKind === 'objective' ? '任务目标摘要' : '当前任务摘要',
      itemName: resourceEntry?.title || '',
      quantityText,
    }, options);
  }
  return checks;
}

function createTaskDiagnosisCandidate({ title, acceptedStatus = 'unknown', source = '当前任务摘要', sourceKind = 'active', label = '', queryPlan = {} } = {}, options = {}) {
  const safeLabel = normalizeTaskDiagnosisText(label || title, 180);
  const safeTitle = normalizeTaskDiagnosisText(title || inferTaskDiagnosisTitle(safeLabel), 80);
  if (!safeTitle && !safeLabel) return null;
  const checks = [];
  if (acceptedStatus !== 'unknown') {
    pushTaskDiagnosisCheck(checks, {
      kind: 'accepted',
      status: acceptedStatus === 'accepted' ? 'ready' : 'blocked',
      detail: acceptedStatus === 'accepted'
        ? `已在当前任务摘要中出现：${safeTitle || safeLabel}`
        : `当前只在可接/告示板摘要中出现，尚未确认已接取：${safeTitle || safeLabel}`,
      nextStep: acceptedStatus === 'accepted'
        ? '继续核对目标、库存和交付条件。'
        : buildTaskDiagnosisAcquisitionRoute({
          kind: 'accepted',
          text: safeLabel,
          queryPlan,
          resourceEntries: options.resourceEntries,
          buildResourceRecommendedRoute: options.buildResourceRecommendedRoute,
        }),
      routeName: 'quest',
      source,
    }, options);
  }
  for (const check of buildTaskDiagnosisCheckForLabel(safeLabel, sourceKind, queryPlan, options)) {
    if (check.kind === 'accepted' && acceptedStatus !== 'unknown') continue;
    pushTaskDiagnosisCheck(checks, check, options);
  }
  return {
    id: normalizeText(safeTitle || safeLabel).slice(0, 80) || `task:${checks.length}`,
    title: safeTitle || safeLabel || '当前任务',
    acceptedStatus,
    source,
    sourceKind,
    labels: safeLabel ? [safeLabel] : [],
    checks,
  };
}

function mergeTaskDiagnosisCandidate(candidates, candidate, options = {}) {
  if (!Array.isArray(candidates) || !candidate) return;
  const key = normalizeText(candidate.title || candidate.labels?.[0] || candidate.id);
  const existing = candidates.find(item => normalizeText(item.title || item.id) === key);
  if (!existing) {
    candidates.push(candidate);
    return;
  }
  existing.labels = unique([...(existing.labels || []), ...(candidate.labels || [])]).slice(0, 6);
  if (existing.acceptedStatus === 'unknown' && candidate.acceptedStatus !== 'unknown') existing.acceptedStatus = candidate.acceptedStatus;
  for (const check of candidate.checks || []) pushTaskDiagnosisCheck(existing.checks, check, options);
}

function collectTaskDiagnosisCandidates(quests = {}, inventory = {}, queryPlan = {}, question = '', options = {}) {
  const candidates = [];
  const targetTerms = getTaskDiagnosisTargetTerms(queryPlan);
  const addLabelCandidate = (label, sourceKind, acceptedStatus, source, title = '') => {
    const text = normalizeTaskDiagnosisText(label, 180);
    if (!text || !taskDiagnosisTextMatchesTargets(`${title} ${text}`, targetTerms)) return;
    mergeTaskDiagnosisCandidate(candidates, createTaskDiagnosisCandidate({
      title: title || inferTaskDiagnosisTitle(text),
      acceptedStatus,
      source,
      sourceKind,
      label: text,
      queryPlan,
    }, options), options);
  };

  addLabelCandidate(quests.mainQuestLabel, 'main', 'accepted', '主线任务摘要');
  for (const label of normalizeContextList(quests.mainQuestObjectiveLabels, 6, 100)) {
    addLabelCandidate(label, 'objective', 'unknown', '主线目标摘要', inferTaskDiagnosisTitle(quests.mainQuestLabel || label));
  }
  for (const label of normalizeContextList(quests.activeQuestLabels, TASK_DIAGNOSIS_MAX_TASKS, 120)) {
    addLabelCandidate(label, 'active', 'accepted', '当前任务摘要');
  }
  for (const label of normalizeContextList(quests.boardQuestLabels, TASK_DIAGNOSIS_MAX_TASKS, 120)) {
    addLabelCandidate(label, 'board', 'not-accepted', '告示板任务摘要');
  }
  addLabelCandidate(quests.specialOrderLabel, 'special', 'accepted', '特殊订单摘要');
  addLabelCandidate(quests.limitedTimeQuestLabel, 'limited', 'accepted', '限时任务摘要');

  const blockerLabels = [
    ...normalizeContextList(quests.blockerLabels, TASK_DIAGNOSIS_MAX_TASKS, 140),
    ...normalizeContextList(quests.shortageLabels, TASK_DIAGNOSIS_MAX_TASKS, 120),
    ...normalizeContextList(inventory.shortageLabels, TASK_DIAGNOSIS_MAX_TASKS, 120),
  ];
  for (const label of blockerLabels) {
    addLabelCandidate(label, 'blocker', 'unknown', '任务阻塞/资源缺口摘要');
  }

  return candidates.slice(0, TASK_DIAGNOSIS_MAX_TASKS);
}

function buildTaskDiagnosis(snapshot = null, { queryPlan = {}, routeName = '', question = '', routeLabels = {}, resourceEntries = [], buildResourceRecommendedRoute = null } = {}) {
  const context = getContextObject(snapshot);
  if (!context) return createEmptyTaskDiagnosisResult(question);

  const options = { routeLabels, resourceEntries, buildResourceRecommendedRoute };
  const quests = getContextObject(context.quests) || {};
  const inventory = getContextObject(context.inventory) || {};
  const candidates = collectTaskDiagnosisCandidates(quests, inventory, queryPlan, question, options)
    .map(candidate => ({
      ...candidate,
      checks: (candidate.checks || [])
        .sort((a, b) => taskDiagnosisStatusRank(b.status) - taskDiagnosisStatusRank(a.status) || getTaskDiagnosisKindRank(a.kind) - getTaskDiagnosisKindRank(b.kind))
        .slice(0, TASK_DIAGNOSIS_MAX_CHECKS),
    }))
    .filter(candidate => candidate.checks.length);

  if (!candidates.length) {
    return {
      available: false,
      summary: '当前公开任务摘要不足，无法定位具体任务阻塞点。',
      targetTask: null,
      checks: [],
      blockedChecks: [],
      routeSteps: ['请补充任务名、任务 ID、交付物或当前任务页可见目标后再诊断。'],
      question: normalizeTaskDiagnosisText(question, 80),
    };
  }

  const sortedCandidates = candidates.sort((a, b) => {
    const aBlocked = a.checks.filter(item => item.status === 'blocked').length;
    const bBlocked = b.checks.filter(item => item.status === 'blocked').length;
    const aAccepted = a.acceptedStatus === 'accepted' ? 1 : 0;
    const bAccepted = b.acceptedStatus === 'accepted' ? 1 : 0;
    return bBlocked - aBlocked || bAccepted - aAccepted || b.checks.length - a.checks.length;
  });
  const targetTask = sortedCandidates[0];
  const checks = targetTask.checks.slice(0, TASK_DIAGNOSIS_MAX_CHECKS);
  const blockedChecks = checks.filter(item => item.status === 'blocked');
  const routeSteps = unique([
    ...(blockedChecks.length ? blockedChecks : checks)
      .map(item => item.nextStep)
      .filter(Boolean),
    blockedChecks.length ? '处理完阻塞点后，回任务页核对是否可交付；我不会自动提交任务或消耗物品。' : '当前摘要没有明确阻塞点，回任务页逐项核对目标、数量和交付对象。',
  ]).slice(0, 5);

  return {
    available: true,
    summary: blockedChecks.length
      ? `定位到「${targetTask.title}」的 ${blockedChecks.length} 个明确阻塞点：${blockedChecks.map(item => item.label).join('、')}`
      : `定位到「${targetTask.title}」，但当前公开摘要未显示明确阻塞点。`,
    targetTask: {
      id: targetTask.id,
      title: targetTask.title,
      acceptedStatus: targetTask.acceptedStatus,
      source: targetTask.source,
      labels: targetTask.labels || [],
    },
    checks,
    blockedChecks,
    routeSteps,
    routeName: routeName || 'quest',
    question: normalizeTaskDiagnosisText(question, 80),
  };
}

module.exports = {
  TASK_DIAGNOSIS_KIND_LABELS,
  TASK_DIAGNOSIS_KIND_ORDER,
  TASK_DIAGNOSIS_MAX_CHECKS,
  TASK_DIAGNOSIS_MAX_TASKS,
  TASK_DIAGNOSIS_STATUS_LABELS,
  buildTaskDiagnosis,
  buildTaskDiagnosisAcquisitionRoute,
  buildTaskDiagnosisCheckForLabel,
  classifyTaskDiagnosisKinds,
  collectTaskDiagnosisCandidates,
  createEmptyTaskDiagnosisResult,
  createTaskDiagnosisCandidate,
  createTaskDiagnosisCheck,
  extractTaskDiagnosisQuantityText,
  findStructuredTaskResourceEntry,
  getTaskDiagnosisKindRank,
  getTaskDiagnosisStatus,
  getTaskDiagnosisTargetTerms,
  inferTaskDiagnosisTitle,
  mergeTaskDiagnosisCandidate,
  normalizeTaskDiagnosisText,
  parseChineseNumber,
  pushTaskDiagnosisCheck,
  taskDiagnosisStatusRank,
  taskDiagnosisTextMatchesTargets,
};
