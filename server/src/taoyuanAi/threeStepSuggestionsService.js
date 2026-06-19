const { getContextObject, normalizeContextText } = require('./contextSnapshotService');
const { normalizeModelAction } = require('./modelStructuredOutput');

const THREE_STEP_LEVELS = Object.freeze([
  { level: 'now', label: '马上做' },
  { level: 'today', label: '今天做' },
  { level: 'week', label: '本周做' },
]);

const THREE_STEP_SIGNAL_LABELS = Object.freeze({
  'cash-flow': '现金流',
  'task-progress': '任务推进',
  'season-risk': '换季风险',
  'stamina-use': '体力利用',
  'resource-shortage': '资源缺口',
  'growth-unlock': '成长线解锁',
  'online-deadline': '在线活动截止',
});

const THREE_STEP_ALLOWED_SIGNALS = new Set(Object.keys(THREE_STEP_SIGNAL_LABELS));

const THREE_STEP_DIAGNOSTIC_SIGNAL_MAP = Object.freeze({
  'season-risk': ['season-risk'],
  'water-risk': ['season-risk', 'stamina-use'],
  'stamina-low': ['stamina-use'],
  'cash-low': ['cash-flow'],
  'bag-nearly-full': ['resource-shortage', 'stamina-use'],
  'task-shortage': ['task-progress', 'resource-shortage'],
  'building-bottleneck': ['growth-unlock', 'resource-shortage'],
  'tool-bottleneck': ['growth-unlock', 'resource-shortage', 'cash-flow'],
  'claimable-reward': ['cash-flow', 'task-progress'],
  'online-alert': ['online-deadline'],
  'late-game-alert': ['growth-unlock', 'online-deadline'],
});

const THREE_STEP_ROUTE_TEMPLATES = Object.freeze({
  farm: {
    routeName: 'farm',
    steps: {
      now: {
        title: '先处理农场里的即时风险',
        reason: '农场页最容易被缺水、成熟作物和换季节点影响，先确认不会错过当日收益。',
        benefit: '减少换季损失，稳住当天现金流。',
        signals: ['season-risk', 'stamina-use', 'cash-flow'],
        action: { type: 'open_page', label: '打开农场', target: 'farm' },
      },
      today: {
        title: '把收获、浇水和短周期种植排成一趟',
        reason: '把体力集中花在能当天改变收益或任务进度的地块上。',
        benefit: '降低往返成本，给任务和采购留出时间。',
        signals: ['stamina-use', 'task-progress'],
        action: { type: 'mark_goal', label: '标记农场今日目标', target: 'farm', value: '完成收获、浇水和短周期种植检查' },
      },
      week: {
        title: '为换季、温室或工具路线预留材料',
        reason: '农场中长期效率通常被工具、建筑和季节节奏限制。',
        benefit: '提前减少下周卡材料或现金的概率。',
        signals: ['growth-unlock', 'resource-shortage', 'season-risk'],
        action: { type: 'copy_checklist', label: '复制农场周目标', target: 'farm', items: ['确认换季作物', '预留种子预算', '检查工具升级材料'] },
      },
    },
  },
  quest: {
    routeName: 'quest',
    steps: {
      now: {
        title: '先看可交付和直接阻塞的任务',
        reason: '任务页的可领奖励、缺口和限时目标通常能最快改变当前资源状态。',
        benefit: '用低体力动作推进任务并补充现金或材料。',
        signals: ['task-progress', 'resource-shortage', 'cash-flow'],
        action: { type: 'open_quest', label: '打开任务页', target: 'quest' },
      },
      today: {
        title: '选择一条能在今天完成的任务线',
        reason: '把目标收窄到一个主线、委托或公告板任务，避免同时追多个缺口。',
        benefit: '更容易完成交付，减少资源分散。',
        signals: ['task-progress', 'stamina-use'],
        action: { type: 'mark_goal', label: '标记今日任务目标', target: 'quest', value: '今天优先推进一条可完成任务线' },
      },
      week: {
        title: '整理下周会卡住的前置和材料',
        reason: '主线、建筑和特殊委托经常共享材料或前置条件。',
        benefit: '提前规避资源短缺和成长线断点。',
        signals: ['growth-unlock', 'resource-shortage', 'task-progress'],
        action: { type: 'copy_checklist', label: '复制任务准备清单', target: 'quest', items: ['确认任务缺口', '预留交付材料', '记录前置建筑或工具'] },
      },
    },
  },
  shop: {
    routeName: 'shop',
    steps: {
      now: {
        title: '先按缺口列采购清单',
        reason: '商店页最容易因为现金紧张买多或漏买关键物品。',
        benefit: '减少无效采购，把现金用在任务或产出上。',
        signals: ['cash-flow', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制采购清单', target: 'shop', items: ['任务缺口物品', '当季种子', '工具或建筑材料'] },
      },
      today: {
        title: '只买能当天转化为收益或任务进度的物品',
        reason: '现金不足时，优先买能立刻种植、交付或解锁的物品。',
        benefit: '降低资金占用，避免卡住后续路线。',
        signals: ['cash-flow', 'task-progress'],
        action: { type: 'mark_goal', label: '标记今日采购原则', target: 'shop', value: '只买能当天使用的关键物品' },
      },
      week: {
        title: '给工具升级、换季和建筑预留预算',
        reason: '商店采购会挤占升级和建筑现金。',
        benefit: '保证本周不会因为冲动采购中断成长线。',
        signals: ['cash-flow', 'growth-unlock', 'season-risk'],
        action: { type: 'copy_checklist', label: '复制预算清单', target: 'shop', items: ['种子预算', '工具升级预算', '建筑材料预算'] },
      },
    },
  },
  inventory: {
    routeName: 'inventory',
    steps: {
      now: {
        title: '先清理背包和可交付物',
        reason: '背包接近上限会拖慢采集、下矿和钓鱼收益。',
        benefit: '释放格子并减少往返成本。',
        signals: ['resource-shortage', 'stamina-use', 'task-progress'],
        action: { type: 'open_page', label: '打开背包', target: 'inventory' },
      },
      today: {
        title: '把关键材料留给任务或升级',
        reason: '材料如果被随手出售，后续任务、工具和建筑会再次形成缺口。',
        benefit: '提高今日任务和成长线的成功率。',
        signals: ['resource-shortage', 'growth-unlock', 'task-progress'],
        action: { type: 'mark_goal', label: '标记背包整理目标', target: 'inventory', value: '保留任务和升级关键材料' },
      },
      week: {
        title: '建立常用材料安全线',
        reason: '一周内重复使用的种子、矿石、木材和任务物品需要提前留量。',
        benefit: '减少临时补材料导致的节奏中断。',
        signals: ['resource-shortage', 'growth-unlock'],
        action: { type: 'copy_checklist', label: '复制库存安全线', target: 'inventory', items: ['任务物品', '工具升级材料', '建筑材料', '当季作物'] },
      },
    },
  },
  mining: {
    routeName: 'mining',
    steps: {
      now: {
        title: '先确认体力、背包和缺矿目标',
        reason: '下矿是高体力路线，缺体力或背包满时收益会明显下降。',
        benefit: '避免半途中断，把矿洞收益对准任务或升级缺口。',
        signals: ['stamina-use', 'resource-shortage'],
        action: { type: 'open_page', label: '打开矿洞', target: 'mining' },
      },
      today: {
        title: '只打一条明确的矿石或任务材料路线',
        reason: '把矿洞目标绑定到工具升级、建筑或任务缺口，减少无目的消耗。',
        benefit: '用有限体力换到能推进的材料。',
        signals: ['task-progress', 'resource-shortage', 'stamina-use'],
        action: { type: 'mark_goal', label: '标记下矿目标', target: 'mining', value: '今天只追一个关键矿石或任务缺口' },
      },
      week: {
        title: '围绕工具升级规划矿石储备',
        reason: '矿石储备决定工具、建筑和部分中后期系统的推进速度。',
        benefit: '提升本周成长线解锁效率。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制矿洞周目标', target: 'mining', items: ['确认升级矿石', '预留补给', '安排低风险下矿日'] },
      },
    },
  },
  fishpond: {
    routeName: 'fishpond',
    steps: {
      now: {
        title: '先检查鱼塘容量、水质和可领奖',
        reason: '鱼塘提醒通常和产出、周赛或容量上限有关，处理成本低。',
        benefit: '减少溢出风险并及时拿到产出。',
        signals: ['cash-flow', 'growth-unlock', 'resource-shortage'],
        action: { type: 'open_page', label: '打开鱼塘', target: 'fishpond' },
      },
      today: {
        title: '选择一条投喂、换水或参赛路线',
        reason: '鱼塘的日内动作要围绕当前鱼种和奖励目标安排。',
        benefit: '提高产出稳定性和活动收益。',
        signals: ['stamina-use', 'task-progress', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记鱼塘今日目标', target: 'fishpond', value: '确认鱼塘容量、水质和今日收益路线' },
      },
      week: {
        title: '为周赛和稀有鱼储备做准备',
        reason: '鱼塘中长期价值来自稀有鱼、周赛和稳定产出。',
        benefit: '提前布局成长线和现金流。',
        signals: ['growth-unlock', 'cash-flow', 'online-deadline'],
        action: { type: 'copy_checklist', label: '复制鱼塘周目标', target: 'fishpond', items: ['保留参赛鱼', '检查水质', '确认周赛时间'] },
      },
    },
  },
  breeding: {
    routeName: 'breeding',
    steps: {
      now: {
        title: '先确认育种槽和父母代条件',
        reason: '育种页的槽位、材料和等待时间会影响整周成长节奏。',
        benefit: '避免空槽和错误组合浪费周期。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'open_page', label: '打开育种', target: 'breeding' },
      },
      today: {
        title: '补齐一组最接近完成的育种材料',
        reason: '优先推进接近完成的组合，比同时铺开多个组合更稳。',
        benefit: '更快获得成长线反馈。',
        signals: ['task-progress', 'resource-shortage', 'growth-unlock'],
        action: { type: 'mark_goal', label: '标记育种今日目标', target: 'breeding', value: '补齐一组最接近完成的育种材料' },
      },
      week: {
        title: '规划本周育种路线和保底资源',
        reason: '育种路线需要提前分配材料、槽位和等待时间。',
        benefit: '提高成长线解锁稳定性。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制育种周目标', target: 'breeding', items: ['确认目标品系', '预留材料', '安排槽位节奏'] },
      },
    },
  },
  museum: {
    routeName: 'museum',
    steps: {
      now: {
        title: '先检查可捐赠和可领奖项目',
        reason: '博物馆页常有低成本捐赠和阶段奖励，适合先处理。',
        benefit: '快速推进收集进度并领取奖励。',
        signals: ['task-progress', 'growth-unlock', 'cash-flow'],
        action: { type: 'open_page', label: '打开博物馆', target: 'museum' },
      },
      today: {
        title: '补一批最容易完成的展品',
        reason: '优先处理已有或接近完成的展品，减少长线收集压力。',
        benefit: '提高当天收集完成度。',
        signals: ['resource-shortage', 'task-progress'],
        action: { type: 'mark_goal', label: '标记博物馆今日目标', target: 'museum', value: '补齐一批最容易完成的展品' },
      },
      week: {
        title: '按系列规划缺失藏品来源',
        reason: '博物馆周目标更适合按系列和来源拆分。',
        benefit: '减少重复采集，提高收集路线效率。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制博物馆周目标', target: 'museum', items: ['列出缺失展品', '标记来源页面', '安排采集或钓鱼路线'] },
      },
    },
  },
  guild: {
    routeName: 'guild',
    steps: {
      now: {
        title: '先检查公会订单、贡献和期限',
        reason: '公会页的订单或活动提醒可能带有截止时间。',
        benefit: '避免错过奖励并稳定贡献进度。',
        signals: ['online-deadline', 'task-progress', 'cash-flow'],
        action: { type: 'open_page', label: '打开公会', target: 'guild' },
      },
      today: {
        title: '补一条能完成的供货或贡献链',
        reason: '公会任务适合绑定库存缺口和当天产出安排。',
        benefit: '提升贡献，同时带动现金流或材料周转。',
        signals: ['task-progress', 'resource-shortage', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记公会今日目标', target: 'guild', value: '今天完成一条可交付公会目标' },
      },
      week: {
        title: '规划本周贡献和活动截止点',
        reason: '公会成长依赖持续贡献和活动节奏。',
        benefit: '避免月底或活动末期集中补进度。',
        signals: ['growth-unlock', 'online-deadline', 'task-progress'],
        action: { type: 'copy_checklist', label: '复制公会周目标', target: 'guild', items: ['确认贡献目标', '检查活动截止', '预留交付材料'] },
      },
    },
  },
  hanhai: {
    routeName: 'hanhai',
    steps: {
      now: {
        title: '先确认瀚海航线、物资和倒计时',
        reason: '瀚海页通常牵涉物资准备、航线窗口和活动期限。',
        benefit: '减少错过窗口或缺材料返工。',
        signals: ['online-deadline', 'resource-shortage', 'growth-unlock'],
        action: { type: 'open_page', label: '打开瀚海', target: 'hanhai' },
      },
      today: {
        title: '只准备一条可完成航线',
        reason: '瀚海准备成本较高，优先确认能完成的一条路线更稳。',
        benefit: '控制资源消耗并保证今日推进。',
        signals: ['resource-shortage', 'task-progress', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记瀚海今日目标', target: 'hanhai', value: '今天只准备一条可完成航线' },
      },
      week: {
        title: '规划远航解锁和补给安全线',
        reason: '瀚海中长期推进需要稳定物资、声望和活动窗口。',
        benefit: '提升成长线解锁效率，降低资源临时缺口。',
        signals: ['growth-unlock', 'resource-shortage', 'online-deadline'],
        action: { type: 'copy_checklist', label: '复制瀚海周目标', target: 'hanhai', items: ['确认航线窗口', '预留补给物资', '检查解锁条件'] },
      },
    },
  },
});

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function normalizeThreeStepSignals(signals = []) {
  return unique(toArray(signals)
    .map(item => String(item || '').trim())
    .filter(item => THREE_STEP_ALLOWED_SIGNALS.has(item)))
    .slice(0, 4);
}

function getSignalsForDiagnostic(signal = {}) {
  return normalizeThreeStepSignals(THREE_STEP_DIAGNOSTIC_SIGNAL_MAP[signal.category] || []);
}

function getThreeStepRouteName(routeName = '', queryPlan = {}, diagnostics = {}, snapshot = null, options = {}) {
  const routeTemplates = options.routeTemplates || THREE_STEP_ROUTE_TEMPLATES;
  const context = getContextObject(snapshot);
  const baseState = context ? getContextObject(context.baseState) || getContextObject(context.base) : null;
  const candidates = unique([
    routeName,
    baseState?.currentRouteName,
    ...(queryPlan?.routeHints || []),
    ...((diagnostics?.suggestions || []).map(item => item.routeName)),
    ...((diagnostics?.signals || []).map(item => item.routeName)),
  ].map(item => String(item || '').trim()).filter(Boolean));

  for (const candidate of candidates) {
    if (routeTemplates[candidate]) return candidate;
  }
  return '';
}

function pickThreeStepDiagnosticSignal(routeName = '', diagnostics = {}, templateSignals = [], usedIds = new Set()) {
  const signals = toArray(diagnostics?.signals).filter(item => item && typeof item === 'object');
  if (!signals.length) return null;
  const preferred = signals.filter(item => item.routeName === routeName);
  const templateSignalSet = new Set(templateSignals);
  const bySignal = signals.filter(item => getSignalsForDiagnostic(item).some(signal => templateSignalSet.has(signal)));
  const pools = [preferred, bySignal, signals];

  for (const pool of pools) {
    const found = pool.find(item => !usedIds.has(item.id));
    if (found) {
      usedIds.add(found.id);
      return found;
    }
  }
  return signals[0] || null;
}

function createThreeStepAction(routeName = '', action = {}, options = {}) {
  const routeLabels = options.routeLabels || {};
  return normalizeModelAction({
    type: action.type || 'open_page',
    label: action.label || `打开${routeLabels[routeName] || routeName || '相关'}页`,
    target: action.target || routeName,
    value: action.value || '',
    items: action.items || [],
  });
}

function buildThreeStepSuggestion({ routeName, level, template, diagnosticSignal, routeLabels = {} }) {
  if (!template) return null;
  const routeLabel = routeLabels[routeName] || routeName;
  const signals = normalizeThreeStepSignals([
    ...(template.signals || []),
    ...getSignalsForDiagnostic(diagnosticSignal || {}),
  ]);
  if (!signals.length) return null;

  const action = createThreeStepAction(routeName, template.action, { routeLabels });
  if (!action) return null;

  const levelMeta = THREE_STEP_LEVELS.find(item => item.level === level) || { level, label: level };
  const diagnosticTitle = normalizeContextText(diagnosticSignal?.title, 80);
  const diagnosticReason = diagnosticTitle ? `当前命中信号：${diagnosticTitle}。` : '';
  return {
    id: `${routeName}:${level}`,
    level,
    levelLabel: levelMeta.label,
    title: normalizeContextText(template.title, 80),
    reason: normalizeContextText([template.reason, diagnosticReason].filter(Boolean).join(' '), 180),
    benefit: normalizeContextText(template.benefit, 120),
    signals,
    signalLabels: signals.map(signal => THREE_STEP_SIGNAL_LABELS[signal] || signal),
    routeName,
    routeLabel,
    action,
  };
}

function createUnavailableThreeStepSuggestions(question = '') {
  return {
    available: false,
    routeName: '',
    routeLabel: '',
    summary: '',
    suggestions: [],
    question: normalizeContextText(question, 80),
  };
}

function buildAiAssistantThreeStepSuggestions(snapshot = null, {
  queryPlan = {},
  routeName = '',
  question = '',
  diagnostics = {},
  routeTemplates = THREE_STEP_ROUTE_TEMPLATES,
  routeLabels = {},
} = {}) {
  if (queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') {
    return createUnavailableThreeStepSuggestions(question);
  }

  const resolvedRouteName = getThreeStepRouteName(routeName, queryPlan, diagnostics, snapshot, { routeTemplates });
  const routeTemplate = routeTemplates[resolvedRouteName];
  if (!routeTemplate) {
    return createUnavailableThreeStepSuggestions(question);
  }

  const usedDiagnosticIds = new Set();
  const suggestions = THREE_STEP_LEVELS
    .map(({ level }) => {
      const template = routeTemplate.steps[level];
      const diagnosticSignal = pickThreeStepDiagnosticSignal(
        resolvedRouteName,
        diagnostics,
        template?.signals || [],
        usedDiagnosticIds
      );
      return buildThreeStepSuggestion({
        routeName: resolvedRouteName,
        level,
        template,
        diagnosticSignal,
        routeLabels,
      });
    })
    .filter(Boolean);

  const context = getContextObject(snapshot);
  const routeLabel = routeLabels[resolvedRouteName] || resolvedRouteName;
  return {
    available: suggestions.length === THREE_STEP_LEVELS.length,
    routeName: resolvedRouteName,
    routeLabel,
    summary: suggestions.length
      ? `${routeLabel}已生成${suggestions.length}条三步行动建议，覆盖${suggestions.map(item => item.levelLabel).join('、')}。`
      : '',
    suggestions,
    question: normalizeContextText(question, 80),
    contextAvailable: !!context,
  };
}

function formatThreeStepSuggestionsBlock(threeStepSuggestions = {}) {
  const suggestions = threeStepSuggestions?.suggestions || [];
  if (!suggestions.length) return '';
  const lines = ['三步建议：'];
  for (const item of suggestions) {
    const signalText = item.signalLabels?.length ? `（${item.signalLabels.slice(0, 2).join('、')}）` : '';
    const actionText = item.action?.label ? `；${item.action.label}` : '';
    lines.push(`${item.levelLabel}：${item.title}${signalText}${actionText}`);
  }
  return lines.join('\n');
}

function appendThreeStepSuggestionsToAnswer(answer = '', threeStepSuggestions = {}) {
  const block = formatThreeStepSuggestionsBlock(threeStepSuggestions);
  if (!block) return answer;
  const text = String(answer || '').trim();
  return text ? `${text}\n\n${block}` : block;
}

function summarizeThreeStepSuggestionsForTrace(threeStepSuggestions = {}) {
  return {
    available: threeStepSuggestions?.available === true,
    routeName: threeStepSuggestions?.routeName || '',
    routeLabel: threeStepSuggestions?.routeLabel || '',
    summary: threeStepSuggestions?.summary || '',
    suggestions: (threeStepSuggestions?.suggestions || []).map(item => ({
      id: item.id,
      level: item.level,
      levelLabel: item.levelLabel,
      title: item.title,
      reason: item.reason,
      benefit: item.benefit,
      signals: item.signals || [],
      signalLabels: item.signalLabels || [],
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      action: item.action,
    })),
  };
}

module.exports = {
  THREE_STEP_LEVELS,
  THREE_STEP_SIGNAL_LABELS,
  THREE_STEP_ALLOWED_SIGNALS,
  THREE_STEP_DIAGNOSTIC_SIGNAL_MAP,
  THREE_STEP_ROUTE_TEMPLATES,
  normalizeThreeStepSignals,
  getSignalsForDiagnostic,
  getThreeStepRouteName,
  pickThreeStepDiagnosticSignal,
  createThreeStepAction,
  buildThreeStepSuggestion,
  buildAiAssistantThreeStepSuggestions,
  formatThreeStepSuggestionsBlock,
  appendThreeStepSuggestionsToAnswer,
  summarizeThreeStepSuggestionsForTrace,
};
