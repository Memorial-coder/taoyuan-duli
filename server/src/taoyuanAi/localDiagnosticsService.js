const {
  normalizeContextList,
  normalizeContextNumber,
  normalizeContextText,
} = require('./contextSnapshotService');

const LOCAL_DIAGNOSTIC_MAX_SIGNALS = 12;
const LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS = 5;

const LOCAL_DIAGNOSTIC_CATEGORY_LABELS = Object.freeze({
  'season-risk': '换季风险',
  'water-risk': '缺水风险',
  'stamina-low': '体力压力',
  'cash-low': '现金压力',
  'bag-nearly-full': '背包压力',
  'task-shortage': '任务缺口',
  'building-bottleneck': '建筑瓶颈',
  'tool-bottleneck': '工具瓶颈',
  'claimable-reward': '可领奖励',
  'online-alert': '在线提醒',
  'late-game-alert': '中后期提醒',
});

function normalizeDiagnosticKey(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function clampDiagnosticDimension(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(5, Math.round(numberValue)));
}

function normalizeDiagnosticDimensions(dimensions = {}) {
  return {
    urgency: clampDiagnosticDimension(dimensions.urgency),
    benefit: clampDiagnosticDimension(dimensions.benefit),
    unlockValue: clampDiagnosticDimension(dimensions.unlockValue),
    risk: clampDiagnosticDimension(dimensions.risk),
    staminaCost: clampDiagnosticDimension(dimensions.staminaCost),
    moneyPressure: clampDiagnosticDimension(dimensions.moneyPressure),
    taskValue: clampDiagnosticDimension(dimensions.taskValue),
  };
}

function scoreLocalDiagnostic(dimensions = {}) {
  const d = normalizeDiagnosticDimensions(dimensions);
  return Math.max(1, Math.round(
    d.urgency * 18
    + d.benefit * 10
    + d.unlockValue * 12
    + d.risk * 15
    + d.moneyPressure * 9
    + d.taskValue * 16
    - d.staminaCost * 4
  ));
}

function buildLocalDiagnosticReasons(dimensions = {}) {
  const d = normalizeDiagnosticDimensions(dimensions);
  const reasons = [];
  if (d.urgency >= 4) reasons.push('紧急度高');
  else if (d.urgency >= 2) reasons.push('有时间价值');
  if (d.benefit >= 4) reasons.push('收益明确');
  else if (d.benefit >= 2) reasons.push('收益稳定');
  if (d.unlockValue >= 4) reasons.push('解锁价值高');
  else if (d.unlockValue >= 2) reasons.push('有解锁价值');
  if (d.risk >= 4) reasons.push('风险高');
  else if (d.risk >= 2) reasons.push('可降低风险');
  if (d.moneyPressure >= 4) reasons.push('现金压力大');
  else if (d.moneyPressure >= 2) reasons.push('会影响现金流');
  if (d.taskValue >= 4) reasons.push('任务推进价值高');
  else if (d.taskValue >= 2) reasons.push('有任务推进价值');
  if (d.staminaCost >= 4) reasons.push('体力成本高，需先控体力');
  return reasons.length ? reasons : ['当前状态有可处理信号'];
}

function createLocalDiagnosticSignal(input = {}, options = {}) {
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object'
    ? options.routeLabels
    : {};
  const category = String(input.category || '').trim();
  const title = normalizeContextText(input.title, 80);
  const detail = normalizeContextText(input.detail, 160);
  const recommendation = normalizeContextText(input.recommendation, 160);
  if (!category || !title || !detail || !recommendation) return null;

  const dimensions = normalizeDiagnosticDimensions(input.dimensions || {});
  const score = scoreLocalDiagnostic(dimensions) + Math.max(0, Number(input.boost) || 0);
  const routeName = String(input.routeName || '').trim();
  return {
    id: String(input.id || `${category}:${normalizeDiagnosticKey(title)}`).slice(0, 120),
    category,
    categoryLabel: LOCAL_DIAGNOSTIC_CATEGORY_LABELS[category] || category,
    title,
    detail,
    recommendation,
    routeName,
    routeLabel: normalizeContextText(input.routeLabel || routeLabels[routeName] || routeName, 40),
    source: normalizeContextText(input.source || '当前状态摘要', 40),
    dimensions,
    score,
    reasons: buildLocalDiagnosticReasons(dimensions),
  };
}

function pushLocalDiagnosticSignal(signals, input = {}, options = {}) {
  if (!Array.isArray(signals)) return null;
  const signal = createLocalDiagnosticSignal(input, options);
  if (!signal) return null;
  if (signals.some(item => item.id === signal.id || normalizeDiagnosticKey(item.title) === normalizeDiagnosticKey(signal.title))) return null;
  signals.push(signal);
  return signal;
}

function appendBaseStateDiagnosticSignals(signals, baseState = {}, options = {}) {
  if (!Array.isArray(signals) || !baseState || typeof baseState !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  const stamina = normalizeContextNumber(baseState.stamina);
  const maxStamina = normalizeContextNumber(baseState.maxStamina);
  const staminaLabel = normalizeContextText(baseState.staminaLabel, 40)
    || (stamina !== null && maxStamina !== null ? `${stamina}/${maxStamina}` : '');
  if (stamina !== null && maxStamina !== null && maxStamina > 0 && stamina / maxStamina <= 0.3) {
    push({
      category: 'stamina-low',
      title: `体力偏低：${staminaLabel}`,
      detail: '当前体力已经接近低位，继续下矿、钓鱼或长线采集容易中断当天计划。',
      recommendation: '先做交付、领取、整理背包或短路径采购，把高体力消耗动作放到补给后。',
      routeName: 'inventory',
      dimensions: { urgency: 4, benefit: 3, risk: 3, staminaCost: 5, taskValue: 2 },
    });
  }

  const money = normalizeContextNumber(baseState.money);
  const moneyLabel = normalizeContextText(baseState.moneyLabel, 40) || (money !== null ? `${money}文` : '');
  if (money !== null && money <= 500) {
    push({
      category: 'cash-low',
      title: `现金偏紧：${moneyLabel}`,
      detail: '当前现金不足以支撑连续采购或工具升级，容易卡住种子、材料和建筑推进。',
      recommendation: '优先完成可交付任务、出售低风险产物或选择短周期收益动作，再安排采购。',
      routeName: 'wallet',
      dimensions: { urgency: 4, benefit: 3, risk: 3, moneyPressure: 5, taskValue: 2 },
    });
  }

  return added;
}

function appendInventoryDiagnosticSignals(signals, inventory = {}, options = {}) {
  if (!Array.isArray(signals) || !inventory || typeof inventory !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  const slotUsageLabel = normalizeContextText(inventory.slotUsageLabel, 100);
  const ratio = parseContextRatioLabel(slotUsageLabel);
  if (ratio && ratio.ratio >= 0.8) {
    push({
      category: 'bag-nearly-full',
      title: `背包将满：${slotUsageLabel}`,
      detail: '背包容量接近上限，继续采集、下矿或钓鱼会降低收益并增加往返成本。',
      recommendation: '先交付任务、整理仓库或出售低优先级物品，再执行采集和下矿路线。',
      routeName: 'inventory',
      dimensions: { urgency: ratio.ratio >= 0.9 ? 5 : 4, benefit: 4, risk: 4, taskValue: 3 },
    });
  }
  for (const label of normalizeContextList(inventory.shortageLabels, 5, 80)) {
    push({
      category: 'task-shortage',
      title: `资源缺口：${label}`,
      detail: '当前资源缺口会影响任务交付、建筑或工具路线推进。',
      recommendation: '按缺口对应来源先补齐关键资源，再回到任务或升级页面确认进度。',
      routeName: 'quest',
      dimensions: { urgency: 4, benefit: 4, risk: 3, taskValue: 4, moneyPressure: /钱|现金|文/.test(label) ? 4 : 1 },
    });
  }
  const pendingToolUpgradeLabel = normalizeContextText(inventory.pendingToolUpgradeLabel, 80);
  if (pendingToolUpgradeLabel) {
    push({
      category: 'tool-bottleneck',
      title: `工具升级：${pendingToolUpgradeLabel}`,
      detail: '工具升级会影响采集、下矿、浇水或加工效率，是中长期收益瓶颈。',
      recommendation: '确认升级材料和现金后，再安排铁匠铺或工具升级路线。',
      routeName: 'upgrade',
      dimensions: { urgency: 3, benefit: 4, unlockValue: 4, moneyPressure: 3, taskValue: 3 },
    });
  }

  return added;
}

function appendFarmingDiagnosticSignals(signals, farming = {}, options = {}) {
  if (!Array.isArray(signals) || !farming || typeof farming !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  for (const label of normalizeContextList(farming.seasonRiskLabels, 4, 80)) {
    push({
      category: 'season-risk',
      title: `换季风险：${label}`,
      detail: '换季风险会直接影响作物收益，临近换季时优先级高于多数常规采集。',
      recommendation: '先收获或处理会受换季影响的作物，再安排低时限任务。',
      routeName: 'farm',
      dimensions: { urgency: 5, benefit: 4, risk: 5, taskValue: 2, staminaCost: 1 },
    });
  }
  for (const label of normalizeContextList(farming.waterRiskLabels, 4, 60)) {
    push({
      category: 'water-risk',
      title: `缺水提醒：${label}`,
      detail: '缺水地块会拖慢成长节奏，影响当季收益和后续交付。',
      recommendation: '先完成浇水，再安排离开农场的路线。',
      routeName: 'farm',
      dimensions: { urgency: 4, benefit: 3, risk: 3, taskValue: 2, staminaCost: 2 },
    });
  }

  return added;
}

function appendQuestDiagnosticSignals(signals, quests = {}, options = {}) {
  if (!Array.isArray(signals) || !quests || typeof quests !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  for (const label of [
    ...normalizeContextList(quests.blockerLabels, 5, 90),
    ...normalizeContextList(quests.shortageLabels, 5, 80),
  ]) {
    push({
      category: 'task-shortage',
      title: `任务阻塞：${label}`,
      detail: '这是当前任务推进的直接阻塞点，优先处理通常能立刻改变任务状态。',
      recommendation: '先按缺口补资源或完成前置，再回任务页确认交付条件。',
      routeName: 'quest',
      dimensions: { urgency: 5, benefit: 4, risk: 4, taskValue: 5, moneyPressure: /钱|现金|文/.test(label) ? 4 : 1 },
    });
  }
  const limitedTimeQuestLabel = normalizeContextText(quests.limitedTimeQuestLabel, 100);
  if (limitedTimeQuestLabel && contextTextLooksUrgent(limitedTimeQuestLabel)) {
    push({
      category: 'online-alert',
      title: `限时任务：${limitedTimeQuestLabel}`,
      detail: '限时内容有过期风险，需要在常规经营前确认剩余时间和奖励价值。',
      recommendation: '先打开任务页确认限时目标，再决定是否压缩采集或下矿时间。',
      routeName: 'quest',
      dimensions: { urgency: 5, benefit: 4, risk: 4, taskValue: 4 },
    });
  }
  for (const label of normalizeContextList(quests.claimableLabels, 5, 80)) {
    push({
      category: 'claimable-reward',
      title: `可领奖励：${label}`,
      detail: '可领奖励通常成本低、收益立即到账，可以先处理以改善资源或现金状态。',
      recommendation: '先领取或交付可完成节点，再继续高成本路线。',
      routeName: 'quest',
      dimensions: { urgency: 4, benefit: 5, risk: 1, taskValue: 4, staminaCost: 0 },
    });
  }

  return added;
}

function appendWeeklyPlanDiagnosticSignals(signals, weeklyPlan = {}, options = {}) {
  if (!Array.isArray(signals) || !weeklyPlan || typeof weeklyPlan !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  for (const label of normalizeContextList(weeklyPlan.claimableNodeLabels, 4, 80)) {
    push({
      category: 'claimable-reward',
      title: `周计划奖励：${label}`,
      detail: '周计划节点已可领取时，先领取能补充资源并更新后续计划判断。',
      recommendation: '先处理周计划可领奖点，再按新资源状态安排下一步。',
      routeName: 'quest',
      dimensions: { urgency: 3, benefit: 5, unlockValue: 2, taskValue: 3 },
    });
  }

  return added;
}

function appendBuildingDiagnosticSignals(signals, buildings = {}, options = {}) {
  if (!Array.isArray(signals) || !buildings || typeof buildings !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  const villageProjectLabel = normalizeContextText(buildings.villageProjectLabel, 100);
  const availableProjects = normalizeContextList(buildings.availableProjectLabels, 4, 60);
  if (villageProjectLabel || availableProjects.length) {
    push({
      category: 'building-bottleneck',
      title: `建筑推进：${availableProjects[0] || villageProjectLabel}`,
      detail: [villageProjectLabel, availableProjects.length ? `可推进：${availableProjects.join('、')}` : ''].filter(Boolean).join('；'),
      recommendation: '先确认建筑材料、现金和前置，再推进能解锁功能的工程。',
      routeName: 'home',
      dimensions: { urgency: 3, benefit: 4, unlockValue: 5, moneyPressure: 3, taskValue: 3 },
    });
  }

  return added;
}

function appendLateGameDiagnosticSignals(signals, lateGame = {}, options = {}) {
  if (!Array.isArray(signals) || !lateGame || typeof lateGame !== 'object') return [];
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object'
    ? options.routeLabels
    : {};
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  for (const [categoryLabel, labels, route] of [
    ['鱼塘提醒', normalizeContextList(lateGame.fishPondAlertLabels, 4, 80), 'fishpond'],
    ['育种提醒', normalizeContextList(lateGame.breedingAlertLabels, 4, 80), 'breeding'],
    ['博物馆提醒', normalizeContextList(lateGame.museumAlertLabels, 4, 80), 'museum'],
    ['公会提醒', normalizeContextList(lateGame.guildAlertLabels, 4, 80), 'guild'],
    ['瀚海提醒', normalizeContextList(lateGame.hanhaiAlertLabels, 4, 80), 'hanhai'],
  ]) {
    const routeLabel = normalizeContextText(routeLabels[route] || categoryLabel, 40) || categoryLabel;
    for (const label of labels) {
      push({
        category: /奖励|可领|待领/.test(label) ? 'claimable-reward' : 'late-game-alert',
        title: `${categoryLabel}：${label}`,
        detail: '中后期系统提醒会影响奖励、展陈、供货或成长路线。',
        recommendation: `打开${routeLabel}页确认状态，再决定是否插入今日路线。`,
        routeName: route,
        dimensions: { urgency: contextTextLooksUrgent(label) ? 4 : 3, benefit: 4, unlockValue: 3, risk: /病|满|倒计时/.test(label) ? 4 : 2, taskValue: 3 },
      });
    }
  }

  return added;
}

function appendOnlineDiagnosticSignals(signals, online = {}, options = {}) {
  if (!Array.isArray(signals) || !online || typeof online !== 'object') return [];
  const added = [];
  const push = input => {
    const signal = pushLocalDiagnosticSignal(signals, input, options);
    if (signal) added.push(signal);
  };

  for (const label of normalizeContextList(online.mailClaimableLabels, 4, 70)) {
    push({
      category: 'claimable-reward',
      title: `邮箱可领取：${label}`,
      detail: '邮箱奖励领取成本低，可能补齐资源、活动道具或现金。',
      recommendation: '先打开邮箱领取，再根据新增资源更新今日计划。',
      routeName: 'hall',
      dimensions: { urgency: 4, benefit: 5, risk: 1, taskValue: 3 },
    });
  }
  const onlineLabels = [
    ...normalizeContextList(online.onlineAlertLabels, 5, 80),
    normalizeContextText(online.festivalRoomLabel, 120),
    normalizeContextText(online.coopOrderLabel, 120),
    normalizeContextText(online.coopCompensationLabel, 100),
  ].filter(Boolean);
  for (const label of onlineLabels) {
    if (!contextTextLooksUrgent(label)) continue;
    push({
      category: 'online-alert',
      title: `在线提醒：${label}`,
      detail: '在线状态提醒通常有确认、领取、上传或活动时限，适合先做低成本处理。',
      recommendation: '先处理在线提醒，再进入长时间的农场、下矿或钓鱼路线。',
      routeName: 'hall',
      dimensions: { urgency: 4, benefit: 4, risk: 3, taskValue: 3, staminaCost: 0 },
    });
  }

  return added;
}

function appendTaskDiagnosisDiagnosticSignal(signals, taskDiagnosis = {}, options = {}) {
  if (!Array.isArray(signals) || !taskDiagnosis || typeof taskDiagnosis !== 'object') return [];
  const topTaskBlocker = Array.isArray(taskDiagnosis.blockedChecks) ? taskDiagnosis.blockedChecks[0] : null;
  if (taskDiagnosis.available !== true || !topTaskBlocker || typeof topTaskBlocker !== 'object') return [];

  const signal = pushLocalDiagnosticSignal(signals, {
    category: 'task-shortage',
    title: `任务诊断：${taskDiagnosis.targetTask?.title || topTaskBlocker.detail}`,
    detail: topTaskBlocker.detail,
    recommendation: topTaskBlocker.nextStep,
    routeName: topTaskBlocker.routeName || 'quest',
    source: topTaskBlocker.source || '任务诊断',
    dimensions: {
      urgency: 5,
      benefit: 4,
      risk: 4,
      taskValue: 5,
      moneyPressure: /钱|现金|文/.test(String(topTaskBlocker.detail || '')) ? 4 : 1,
    },
    boost: 8,
  }, options);

  return signal ? [signal] : [];
}

function createEmptyLocalDiagnosticsResult({ taskDiagnosis = null } = {}) {
  return {
    available: false,
    signals: [],
    suggestions: [],
    summary: '',
    taskDiagnosis: taskDiagnosis && typeof taskDiagnosis === 'object' ? taskDiagnosis : null,
  };
}

function buildLocalDiagnosticsResult({
  signals = [],
  taskDiagnosis = null,
  queryPlan = {},
  routeName = '',
  question = '',
} = {}) {
  const sorted = sanitizeDiagnosticSignals(signals, queryPlan, routeName);
  const suggestions = sorted.slice(0, LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS);
  const safeTaskDiagnosis = taskDiagnosis && typeof taskDiagnosis === 'object'
    ? taskDiagnosis
    : { available: false, summary: '' };

  return {
    available: suggestions.length > 0 || safeTaskDiagnosis.available === true,
    signals: sorted,
    suggestions,
    summary: suggestions.length
      ? `识别到 ${sorted.length} 条本地诊断信号，优先处理：${suggestions.slice(0, 3).map(item => item.title).join('、')}`
      : normalizeContextText(safeTaskDiagnosis.summary, 180),
    taskDiagnosis: safeTaskDiagnosis,
    question: normalizeContextText(question, 80),
  };
}

function parseContextRatioLabel(value = '') {
  const text = String(value || '');
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const current = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
  return { current, total, ratio: current / total };
}

function contextTextLooksUrgent(value = '') {
  return /剩|倒计时|快到期|待确认|待处理|可领|待领|缺|不足|风险|病|满|临近/.test(String(value || ''));
}

function getLocalDiagnosticQueryBoost(signal = {}, queryPlan = {}, routeName = '') {
  let boost = 0;
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  if ((types.has('task-diagnosis') || intents.has('diagnose_task')) && signal.category === 'task-shortage') boost += 24;
  if ((types.has('today-planning') || intents.has('plan_today')) && ['season-risk', 'task-shortage', 'claimable-reward', 'online-alert', 'bag-nearly-full'].includes(signal.category)) boost += 12;
  if ((types.has('risk-reminder') || intents.has('remind_risk')) && ['season-risk', 'water-risk', 'bag-nearly-full', 'stamina-low', 'cash-low', 'online-alert'].includes(signal.category)) boost += 18;
  if ((types.has('next-step-suggestion') || intents.has('suggest_next_step')) && ['building-bottleneck', 'tool-bottleneck', 'task-shortage', 'late-game-alert'].includes(signal.category)) boost += 12;
  if (routeName && signal.routeName === routeName) boost += 8;
  return boost;
}

function sanitizeDiagnosticSignals(signals = [], queryPlan = {}, routeName = '') {
  return (Array.isArray(signals) ? signals : [])
    .filter(Boolean)
    .map(signal => {
      const dimensions = normalizeDiagnosticDimensions(signal.dimensions || {});
      const baseScore = Number.isFinite(Number(signal.score)) ? Number(signal.score) : scoreLocalDiagnostic(dimensions);
      return {
        ...signal,
        dimensions,
        score: baseScore + getLocalDiagnosticQueryBoost(signal, queryPlan, routeName),
      };
    })
    .sort((a, b) => b.score - a.score || b.dimensions.urgency - a.dimensions.urgency || b.dimensions.taskValue - a.dimensions.taskValue)
    .slice(0, LOCAL_DIAGNOSTIC_MAX_SIGNALS);
}

module.exports = {
  LOCAL_DIAGNOSTIC_CATEGORY_LABELS,
  LOCAL_DIAGNOSTIC_MAX_SIGNALS,
  LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS,
  appendBaseStateDiagnosticSignals,
  appendBuildingDiagnosticSignals,
  appendFarmingDiagnosticSignals,
  appendInventoryDiagnosticSignals,
  appendLateGameDiagnosticSignals,
  appendOnlineDiagnosticSignals,
  appendQuestDiagnosticSignals,
  appendTaskDiagnosisDiagnosticSignal,
  appendWeeklyPlanDiagnosticSignals,
  buildLocalDiagnosticReasons,
  buildLocalDiagnosticsResult,
  clampDiagnosticDimension,
  contextTextLooksUrgent,
  createLocalDiagnosticSignal,
  createEmptyLocalDiagnosticsResult,
  getLocalDiagnosticQueryBoost,
  normalizeDiagnosticDimensions,
  normalizeDiagnosticKey,
  parseContextRatioLabel,
  pushLocalDiagnosticSignal,
  sanitizeDiagnosticSignals,
  scoreLocalDiagnostic,
};
