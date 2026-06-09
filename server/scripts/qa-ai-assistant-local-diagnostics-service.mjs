import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
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
  createEmptyLocalDiagnosticsResult,
  createLocalDiagnosticSignal,
  getLocalDiagnosticQueryBoost,
  normalizeDiagnosticDimensions,
  normalizeDiagnosticKey,
  parseContextRatioLabel,
  pushLocalDiagnosticSignal,
  sanitizeDiagnosticSignals,
  scoreLocalDiagnostic,
} = require('../src/taoyuanAi/localDiagnosticsService');

assert.equal(LOCAL_DIAGNOSTIC_MAX_SIGNALS, 12);
assert.equal(LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS, 5);

const emptyLocalDiagnostics = createEmptyLocalDiagnosticsResult({
  taskDiagnosis: { available: false, summary: '', question: '任务卡住了' },
});
assert.deepEqual(emptyLocalDiagnostics, {
  available: false,
  signals: [],
  suggestions: [],
  summary: '',
  taskDiagnosis: { available: false, summary: '', question: '任务卡住了' },
});
assert.equal(
  Object.prototype.hasOwnProperty.call(emptyLocalDiagnostics, 'question'),
  false,
  'empty diagnostics should preserve the existing no-context response shape',
);

assert.equal(clampDiagnosticDimension(-1), 0);
assert.equal(clampDiagnosticDimension(2.49), 2);
assert.equal(clampDiagnosticDimension(2.5), 3);
assert.equal(clampDiagnosticDimension(99), 5);
assert.equal(clampDiagnosticDimension('not-a-number'), 0);

const dimensions = normalizeDiagnosticDimensions({
  urgency: 4.7,
  benefit: 2.2,
  unlockValue: 5.9,
  risk: 3.4,
  staminaCost: 4.8,
  moneyPressure: -2,
  taskValue: '3',
});
assert.deepEqual(dimensions, {
  urgency: 5,
  benefit: 2,
  unlockValue: 5,
  risk: 3,
  staminaCost: 5,
  moneyPressure: 0,
  taskValue: 3,
});
assert.equal(scoreLocalDiagnostic(dimensions), 243, 'score formula should stay stable');
assert.deepEqual(
  buildLocalDiagnosticReasons(dimensions),
  ['紧急度高', '收益稳定', '解锁价值高', '可降低风险', '有任务推进价值', '体力成本高，需先控体力'],
);
assert.deepEqual(buildLocalDiagnosticReasons({}), ['当前状态有可处理信号']);
assert.equal(normalizeDiagnosticKey('  任务   缺口  '), '任务 缺口');

const signal = createLocalDiagnosticSignal({
  category: 'task-shortage',
  title: '  阿石矿料委托缺铜矿2  ',
  detail: '当前资源缺口会影响任务交付。',
  recommendation: '先去矿洞补齐铜矿。',
  routeName: 'mining',
  dimensions,
}, {
  routeLabels: { mining: '矿洞' },
});
assert.ok(signal);
assert.equal(signal.categoryLabel, '任务缺口');
assert.equal(signal.routeLabel, '矿洞');
assert.equal(signal.source, '当前状态摘要');
assert.equal(signal.score, 243);
assert.ok(signal.reasons.includes('解锁价值高'));
assert.equal(
  createLocalDiagnosticSignal({
    category: 'task-shortage',
    title: 'apiKey=fixture-secret-not-real',
    detail: '当前资源缺口会影响任务交付。',
    recommendation: '先去矿洞补齐铜矿。',
  }),
  null,
  'sensitive title should prevent signal creation',
);
assert.equal(
  createLocalDiagnosticSignal({
    category: 'task-shortage',
    title: '任务缺口',
    detail: 'server/src/taoyuanAiAssistant.js',
    recommendation: '先去矿洞补齐铜矿。',
  }),
  null,
  'sensitive detail should prevent signal creation',
);

const signals = [];
assert.ok(pushLocalDiagnosticSignal(signals, {
  category: 'water-risk',
  title: '缺水提醒',
  detail: '3块菜地缺水。',
  recommendation: '先完成浇水。',
  routeName: 'farm',
}, { routeLabels: { farm: '农田' } }));
assert.equal(signals[0].routeLabel, '农田');
assert.equal(pushLocalDiagnosticSignal(signals, {
  category: 'water-risk',
  title: '  缺水提醒  ',
  detail: '重复信号。',
  recommendation: '先完成浇水。',
  routeName: 'farm',
}, { routeLabels: { farm: '农田' } }), null, 'duplicate title should be ignored');
assert.equal(signals.length, 1);
assert.equal(pushLocalDiagnosticSignal(null, {}), null, 'non-array target should be ignored');

const baseStateSignals = [];
const addedBaseStateSignals = appendBaseStateDiagnosticSignals(baseStateSignals, {
  stamina: 20,
  maxStamina: 120,
  money: 300,
  moneyLabel: '300文',
}, {
  routeLabels: { inventory: '背包', wallet: '钱袋' },
});
assert.deepEqual(addedBaseStateSignals.map(item => item.category), ['stamina-low', 'cash-low']);
assert.equal(baseStateSignals[0].routeLabel, '背包');
assert.equal(baseStateSignals[1].routeLabel, '钱袋');
assert.equal(appendBaseStateDiagnosticSignals(null, {}, {}).length, 0, 'non-array base state target should be ignored');

const safeInventorySignals = [];
const addedInventorySignals = appendInventoryDiagnosticSignals(safeInventorySignals, {
  slotUsageLabel: '背包23/24格',
  shortageLabels: ['铜矿缺2个', 'apiKey=fixture-secret-not-real'],
  pendingToolUpgradeLabel: '铜锄升级缺铜矿2和现金300文',
}, {
  routeLabels: { inventory: '背包', quest: '任务', upgrade: '升级' },
});
assert.deepEqual(
  addedInventorySignals.map(item => item.category),
  ['bag-nearly-full', 'task-shortage', 'tool-bottleneck'],
  'inventory helper should emit bag, safe shortage and tool signals while filtering sensitive shortage',
);
assert.equal(safeInventorySignals.some(item => item.title.includes('apiKey')), false);
assert.equal(safeInventorySignals.find(item => item.category === 'bag-nearly-full').routeLabel, '背包');
assert.equal(safeInventorySignals.find(item => item.category === 'tool-bottleneck').routeLabel, '升级');
assert.equal(
  appendInventoryDiagnosticSignals([], { slotUsageLabel: '背包1/24格' }).length,
  0,
  'low slot usage should not emit bag warning',
);

const farmingSignals = [];
const addedFarmingSignals = appendFarmingDiagnosticSignals(farmingSignals, {
  seasonRiskLabels: ['夏末青菜2块还未收获', 'process.env.HIDDEN_FIXTURE'],
  waterRiskLabels: ['3块菜地缺水', 'server/src/taoyuanAiAssistant.js'],
}, {
  routeLabels: { farm: '农田' },
});
assert.deepEqual(
  addedFarmingSignals.map(item => item.category),
  ['season-risk', 'water-risk'],
  'farming helper should emit safe season and water signals while filtering sensitive labels',
);
assert.equal(farmingSignals.every(item => item.routeLabel === '农田'), true);
assert.equal(farmingSignals.some(item => /process\.env|server\/src/.test(item.title)), false);
assert.equal(appendFarmingDiagnosticSignals(null, {}, {}).length, 0, 'non-array farming target should be ignored');
assert.equal(
  appendFarmingDiagnosticSignals([], {
    seasonRiskLabels: ['apiKey=fixture-secret-not-real'],
    waterRiskLabels: ['backend_rule_fixture=deny'],
  }).length,
  0,
  'farming helper should not emit sensitive-only labels',
);

const questSignals = [];
const addedQuestSignals = appendQuestDiagnosticSignals(questSignals, {
  blockerLabels: ['阿石矿料委托缺铜矿2', 'backend_rule_fixture=deny'],
  shortageLabels: ['现金缺300文', 'apiKey=fixture-secret-not-real'],
  limitedTimeQuestLabel: '灯会委托剩30分钟待确认',
  claimableLabels: ['主线阶段奖励可领', 'process.env.HIDDEN_FIXTURE'],
}, {
  routeLabels: { quest: '任务' },
});
assert.deepEqual(
  addedQuestSignals.map(item => item.category),
  ['task-shortage', 'task-shortage', 'online-alert', 'claimable-reward'],
  'quest helper should emit safe blockers, urgent limited quest and claimable rewards',
);
assert.equal(questSignals.every(item => item.routeLabel === '任务'), true);
assert.equal(questSignals.some(item => /backend_rule|apiKey|process\.env/.test(item.title)), false);
assert.equal(
  questSignals.find(item => item.title.includes('现金缺300文')).dimensions.moneyPressure,
  4,
  'cash-like task shortage should carry money pressure',
);
assert.equal(
  appendQuestDiagnosticSignals([], { limitedTimeQuestLabel: '普通任务说明' }).length,
  0,
  'non-urgent limited quest label should not emit an online alert',
);
assert.equal(appendQuestDiagnosticSignals(null, {}, {}).length, 0, 'non-array quest target should be ignored');

const weeklySignals = [];
const addedWeeklySignals = appendWeeklyPlanDiagnosticSignals(weeklySignals, {
  claimableNodeLabels: ['本周主线节点可领', 'server/src/taoyuanAiAssistant.js'],
}, {
  routeLabels: { quest: '任务' },
});
assert.deepEqual(addedWeeklySignals.map(item => item.category), ['claimable-reward']);
assert.equal(weeklySignals[0].title, '周计划奖励：本周主线节点可领');
assert.equal(weeklySignals[0].routeLabel, '任务');
assert.equal(appendWeeklyPlanDiagnosticSignals(null, {}, {}).length, 0, 'non-array weekly plan target should be ignored');

const buildingSignals = [];
const addedBuildingSignals = appendBuildingDiagnosticSignals(buildingSignals, {
  villageProjectLabel: '鸡舍升级缺木材10和现金500文',
  availableProjectLabels: ['温室修复', 'apiKey=fixture-secret-not-real'],
}, {
  routeLabels: { home: '家园' },
});
assert.deepEqual(addedBuildingSignals.map(item => item.category), ['building-bottleneck']);
assert.equal(buildingSignals[0].title, '建筑推进：温室修复');
assert.equal(buildingSignals[0].routeLabel, '家园');
assert.equal(buildingSignals[0].detail.includes('apiKey'), false);
assert.equal(
  appendBuildingDiagnosticSignals([], {
    villageProjectLabel: 'process.env.HIDDEN_FIXTURE',
    availableProjectLabels: ['server/src/taoyuanAiAssistant.js'],
  }).length,
  0,
  'building helper should not emit sensitive-only project labels',
);

const lateGameSignals = [];
const addedLateGameSignals = appendLateGameDiagnosticSignals(lateGameSignals, {
  fishPondAlertLabels: ['鱼塘容量已满', 'apiKey=fixture-secret-not-real'],
  breedingAlertLabels: ['育种奖励可领'],
  museumAlertLabels: ['server/src/taoyuanAiAssistant.js'],
  guildAlertLabels: ['公会供货倒计时2小时'],
  hanhaiAlertLabels: ['瀚海航线普通提示'],
}, {
  routeLabels: { fishpond: '鱼塘', breeding: '育种', guild: '公会', hanhai: '瀚海' },
});
assert.deepEqual(
  addedLateGameSignals.map(item => item.category),
  ['late-game-alert', 'claimable-reward', 'late-game-alert', 'late-game-alert'],
  'late-game helper should emit safe alerts and classify claimable rewards',
);
assert.equal(lateGameSignals.find(item => item.routeName === 'fishpond').routeLabel, '鱼塘');
assert.equal(
  lateGameSignals.find(item => item.title.includes('鱼塘容量已满')).dimensions.risk,
  4,
  'full late-game alerts should carry higher risk',
);
assert.equal(
  lateGameSignals.find(item => item.routeName === 'breeding').category,
  'claimable-reward',
  'reward-like late-game labels should become claimable rewards',
);
assert.equal(lateGameSignals.some(item => /apiKey|server\/src/.test(item.title)), false);
assert.equal(appendLateGameDiagnosticSignals(null, {}, {}).length, 0, 'non-array late-game target should be ignored');

const onlineSignals = [];
const addedOnlineSignals = appendOnlineDiagnosticSignals(onlineSignals, {
  mailClaimableLabels: ['运营补给可领', 'process.env.HIDDEN_FIXTURE'],
  onlineAlertLabels: ['灯会房间剩30分钟待确认', '普通在线说明'],
  festivalRoomLabel: '节会房间待确认',
  coopOrderLabel: '委托交付普通说明',
  coopCompensationLabel: '委托补偿可领',
}, {
  routeLabels: { hall: '大厅' },
});
assert.deepEqual(
  addedOnlineSignals.map(item => item.category),
  ['claimable-reward', 'online-alert', 'online-alert', 'online-alert'],
  'online helper should emit mail rewards and urgent online alerts only',
);
assert.equal(onlineSignals.every(item => item.routeLabel === '大厅'), true);
assert.equal(onlineSignals.some(item => /process\.env|普通在线说明|普通说明/.test(item.title)), false);
assert.equal(
  appendOnlineDiagnosticSignals([], {
    mailClaimableLabels: ['apiKey=fixture-secret-not-real'],
    onlineAlertLabels: ['普通在线说明'],
    festivalRoomLabel: 'server/src/taoyuanAiAssistant.js',
  }).length,
  0,
  'online helper should not emit sensitive or non-urgent labels',
);

const taskDiagnosisSignals = [];
const addedTaskDiagnosisSignals = appendTaskDiagnosisDiagnosticSignal(taskDiagnosisSignals, {
  available: true,
  targetTask: { title: '阿石矿料委托' },
  blockedChecks: [{
    detail: '阿石矿料委托缺现金300文和铜矿2个',
    nextStep: '先补齐铜矿并准备现金，再回任务页确认交付。',
    routeName: 'mining',
    source: '任务诊断',
  }],
}, {
  routeLabels: { mining: '矿洞' },
});
assert.deepEqual(addedTaskDiagnosisSignals.map(item => item.category), ['task-shortage']);
assert.equal(taskDiagnosisSignals[0].title, '任务诊断：阿石矿料委托');
assert.equal(taskDiagnosisSignals[0].routeLabel, '矿洞');
assert.equal(taskDiagnosisSignals[0].source, '任务诊断');
assert.equal(taskDiagnosisSignals[0].dimensions.moneyPressure, 4);
assert.equal(taskDiagnosisSignals[0].score > 0, true);
assert.equal(appendTaskDiagnosisDiagnosticSignal(null, {}, {}).length, 0, 'non-array task diagnosis target should be ignored');
assert.equal(
  appendTaskDiagnosisDiagnosticSignal([], { available: false, blockedChecks: [{ detail: '缺铜矿', nextStep: '去矿洞' }] }).length,
  0,
  'unavailable task diagnosis should not emit signal',
);
assert.equal(
  appendTaskDiagnosisDiagnosticSignal([], {
    available: true,
    targetTask: { title: 'apiKey=fixture-secret-not-real' },
    blockedChecks: [{ detail: '缺铜矿2个', nextStep: '去矿洞' }],
  }).length,
  0,
  'sensitive task diagnosis title should prevent signal creation',
);

assert.deepEqual(parseContextRatioLabel('背包 21 / 24 格'), { current: 21, total: 24, ratio: 21 / 24 });
assert.equal(parseContextRatioLabel('背包无数字'), null);
assert.equal(parseContextRatioLabel('背包 1/0'), null);
assert.equal(contextTextLooksUrgent('灯会房间剩30分钟待确认'), true);
assert.equal(contextTextLooksUrgent('普通说明'), false);

assert.equal(
  getLocalDiagnosticQueryBoost({ category: 'task-shortage', routeName: 'quest' }, { questionTypes: ['task-diagnosis'] }, 'quest'),
  32,
);
assert.equal(
  getLocalDiagnosticQueryBoost({ category: 'season-risk', routeName: 'farm' }, { intents: ['remind_risk'] }, 'farm'),
  26,
);
assert.equal(
  getLocalDiagnosticQueryBoost({ category: 'tool-bottleneck', routeName: 'upgrade' }, { questionTypes: ['next-step-suggestion'] }, 'quest'),
  12,
);
assert.equal(
  getLocalDiagnosticQueryBoost({ category: 'claimable-reward' }, { intents: ['plan_today'] }, ''),
  12,
);

const manySignals = Array.from({ length: 13 }, (_, index) => createLocalDiagnosticSignal({
  category: index === 12 ? 'task-shortage' : 'late-game-alert',
  title: `信号 ${index}`,
  detail: `公开状态信号 ${index}`,
  recommendation: `处理公开状态信号 ${index}`,
  routeName: index === 12 ? 'quest' : 'guild',
  dimensions: {
    urgency: index % 5,
    benefit: 2,
    risk: 1,
    taskValue: index === 12 ? 5 : 1,
  },
}));
const sorted = sanitizeDiagnosticSignals(manySignals, { questionTypes: ['task-diagnosis'] }, 'quest');
assert.equal(sorted.length, LOCAL_DIAGNOSTIC_MAX_SIGNALS, 'diagnostic signals should be capped');
assert.equal(sorted[0].category, 'task-shortage', 'task diagnosis query should boost task shortage to the top');
for (let index = 1; index < sorted.length; index += 1) {
  const prev = sorted[index - 1];
  const current = sorted[index];
  assert.ok(
    prev.score > current.score
      || (prev.score === current.score && prev.dimensions.urgency >= current.dimensions.urgency)
      || (prev.score === current.score && prev.dimensions.urgency === current.dimensions.urgency && prev.dimensions.taskValue >= current.dimensions.taskValue),
    'signals should be sorted by score, urgency, and task value',
  );
}

const localDiagnosticsResult = buildLocalDiagnosticsResult({
  signals: manySignals,
  taskDiagnosis: { available: true, summary: '任务诊断兜底摘要' },
  queryPlan: { questionTypes: ['task-diagnosis'] },
  routeName: 'quest',
  question: '  任务卡住了，帮我看一下  ',
});
assert.equal(localDiagnosticsResult.available, true);
assert.equal(localDiagnosticsResult.signals.length, LOCAL_DIAGNOSTIC_MAX_SIGNALS);
assert.equal(localDiagnosticsResult.suggestions.length, LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS);
assert.equal(localDiagnosticsResult.suggestions[0].category, 'task-shortage');
assert.match(localDiagnosticsResult.summary, /^识别到 12 条本地诊断信号，优先处理：/);
assert.equal(localDiagnosticsResult.summary.includes('任务诊断兜底摘要'), false);
assert.equal(localDiagnosticsResult.question, '任务卡住了，帮我看一下');

const taskOnlyDiagnosticsResult = buildLocalDiagnosticsResult({
  signals: [],
  taskDiagnosis: { available: true, summary: '任务诊断可用，但没有额外本地信号' },
  question: '  今天该做什么  ',
});
assert.equal(taskOnlyDiagnosticsResult.available, true);
assert.equal(taskOnlyDiagnosticsResult.signals.length, 0);
assert.equal(taskOnlyDiagnosticsResult.suggestions.length, 0);
assert.equal(taskOnlyDiagnosticsResult.summary, '任务诊断可用，但没有额外本地信号');
assert.equal(taskOnlyDiagnosticsResult.question, '今天该做什么');

const fullyEmptyDiagnosticsResult = buildLocalDiagnosticsResult({
  signals: [],
  taskDiagnosis: { available: false, summary: '没有任务诊断' },
  question: '普通问题',
});
assert.equal(fullyEmptyDiagnosticsResult.available, false);
assert.equal(fullyEmptyDiagnosticsResult.summary, '没有任务诊断');

const repaired = sanitizeDiagnosticSignals([
  { category: 'water-risk', title: 'raw', score: 'bad', dimensions: { urgency: 2, benefit: 2 } },
]);
assert.equal(repaired[0].score, scoreLocalDiagnostic({ urgency: 2, benefit: 2 }));
assert.deepEqual(repaired[0].dimensions, normalizeDiagnosticDimensions({ urgency: 2, benefit: 2 }));

console.log('qa-ai-assistant-local-diagnostics-service passed');
