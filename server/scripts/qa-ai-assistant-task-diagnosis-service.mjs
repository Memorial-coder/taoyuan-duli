import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  TASK_DIAGNOSIS_MAX_CHECKS,
  TASK_DIAGNOSIS_MAX_TASKS,
  buildTaskDiagnosis,
  buildTaskDiagnosisCheckForLabel,
  classifyTaskDiagnosisKinds,
  collectTaskDiagnosisCandidates,
  createEmptyTaskDiagnosisResult,
  createTaskDiagnosisCheck,
  extractTaskDiagnosisQuantityText,
  findStructuredTaskResourceEntry,
  getTaskDiagnosisTargetTerms,
  inferTaskDiagnosisTitle,
  parseChineseNumber,
  taskDiagnosisStatusRank,
} = require('../src/taoyuanAi/taskDiagnosisService');

const routeLabels = {
  quest: '任务',
  mining: '矿洞',
  breeding: '育种',
};

const resourceEntries = [
  {
    id: 'copper-ore',
    kind: 'mineral',
    title: '铜矿',
    aliases: ['铜矿石'],
    fastRoute: '矿洞 1-20 层采矿，或去铁匠铺查看是否可购买。',
    routeHints: ['mining'],
    questionTypes: ['task-diagnosis'],
  },
  {
    id: 'breeding-cert',
    kind: 'quest_item',
    title: '谱系认证签',
    aliases: ['认证签'],
    recommendedRoute: '打开育种页确认认证材料。',
    routeHints: ['breeding'],
  },
  {
    id: 'internal-note',
    kind: 'system',
    title: '后台规则样例',
    aliases: ['backend_rule_fixture'],
    fastRoute: '不应被任务诊断选中。',
  },
];

const queryPlan = {
  questionTypes: ['task-diagnosis'],
  slots: {
    tasks: [{ label: '阿石矿料委托', canonical: '阿石矿料委托', match: '阿石矿料委托' }],
    items: [{ label: '铜矿石', canonical: '铜矿', match: '铜矿石' }],
  },
  quotedTerms: [],
};

assert.equal(TASK_DIAGNOSIS_MAX_TASKS, 8);
assert.equal(TASK_DIAGNOSIS_MAX_CHECKS, 8);
assert.equal(parseChineseNumber('十'), 10);
assert.equal(parseChineseNumber('十二'), 12);
assert.equal(parseChineseNumber('二十'), 20);
assert.equal(parseChineseNumber('21'), 21);
assert.equal(parseChineseNumber('未知'), null);
assert.equal(extractTaskDiagnosisQuantityText('还差十二个铜矿和300文'), '12个、300文');
assert.equal(inferTaskDiagnosisTitle('任务阻塞：阿石矿料委托缺铜矿2个'), '阿石矿料委托');
assert.deepEqual(getTaskDiagnosisTargetTerms(queryPlan), ['阿石矿料委托', '铜矿石', '铜矿']);

const classifiedKinds = classifyTaskDiagnosisKinds('夜钓委托时间不符：需要夜晚，现在是上午，交付鲫鱼1条给阿宁', 'active');
for (const kind of ['accepted', 'time', 'quantity', 'delivery']) {
  assert.equal(classifiedKinds.includes(kind), true, `classification should include ${kind}`);
}
assert.equal(taskDiagnosisStatusRank('blocked') > taskDiagnosisStatusRank('unknown'), true);
assert.equal(taskDiagnosisStatusRank('unknown') > taskDiagnosisStatusRank('ready'), true);

const check = createTaskDiagnosisCheck({
  kind: 'inventory',
  status: 'blocked',
  detail: '库存缺铜矿2个',
  nextStep: '去矿洞补齐铜矿。',
  routeName: 'mining',
}, { routeLabels });
assert.equal(check.label, '库存');
assert.equal(check.statusLabel, '阻塞');
assert.equal(check.routeLabel, '矿洞');

const sensitiveDetailCheck = createTaskDiagnosisCheck({
  kind: 'inventory',
  detail: 'apiKey=fixture-secret-not-real',
  nextStep: '去矿洞。',
}, { routeLabels });
assert.equal(sensitiveDetailCheck.detail, '', 'sensitive check detail should be filtered');
assert.equal(JSON.stringify(sensitiveDetailCheck).includes('apiKey'), false);

const copperEntry = findStructuredTaskResourceEntry('阿石矿料委托缺铜矿2个', queryPlan, resourceEntries);
assert.equal(copperEntry.title, '铜矿');
assert.equal(
  findStructuredTaskResourceEntry('backend_rule_fixture', { slots: { items: [] } }, resourceEntries),
  null,
  'non-player item kinds should not be used as task resources',
);

const labelChecks = buildTaskDiagnosisCheckForLabel(
  '阿石矿料委托缺铜矿2个，交付铜矿3个给阿石',
  'blocker',
  queryPlan,
  {
    routeLabels,
    resourceEntries,
    buildResourceRecommendedRoute: entry => `推荐路线：${entry.title}`,
  },
);
assert.equal(labelChecks.some(item => item.kind === 'inventory' && item.itemName === '铜矿'), true);
assert.equal(labelChecks.some(item => item.kind === 'quantity' && item.quantityText.includes('2个')), true);
assert.equal(labelChecks.find(item => item.kind === 'inventory').routeName, 'mining');
assert.match(labelChecks.find(item => item.kind === 'inventory').nextStep, /补齐铜矿/);

const snapshot = {
  contextVersion: 2,
  inventory: {
    shortageLabels: ['铜矿缺2个', 'process.env.HIDDEN_FIXTURE'],
  },
  quests: {
    activeQuestLabels: ['阿石矿料委托：交付铜矿3个给阿石'],
    boardQuestLabels: ['谱系认证订单：交付谱系认证签1张'],
    blockerLabels: ['阿石矿料委托缺铜矿2个'],
    shortageLabels: ['apiKey=fixture-secret-not-real'],
  },
};

const candidates = collectTaskDiagnosisCandidates(
  snapshot.quests,
  snapshot.inventory,
  queryPlan,
  '阿石矿料委托卡住了',
  { routeLabels, resourceEntries },
);
assert.equal(candidates.some(item => item.title === '阿石矿料委托'), true);
assert.equal(candidates.some(item => item.title.includes('谱系认证')), false, 'target terms should filter unrelated board tasks');
assert.equal(candidates.some(item => item.title.includes('铜矿')), true, 'target item terms should keep matching resource shortage candidates');
assert.equal(candidates.some(item => item.checks.some(check => check.detail.includes('process.env'))), false);
assert.equal(candidates.some(item => item.checks.some(check => check.detail.includes('apiKey'))), false);

const diagnosis = buildTaskDiagnosis(snapshot, {
  queryPlan,
  routeName: 'quest',
  question: '阿石矿料委托卡住了',
  routeLabels,
  resourceEntries,
  buildResourceRecommendedRoute: entry => `推荐路线：${entry.title}`,
});
assert.equal(diagnosis.available, true);
assert.equal(diagnosis.targetTask.title, '阿石矿料委托');
assert.equal(diagnosis.checks[0].status, 'blocked', 'blocked checks should sort before ready checks');
assert.equal(diagnosis.blockedChecks.some(item => item.kind === 'inventory'), true);
assert.equal(diagnosis.checks.some(item => item.kind === 'accepted' && item.status === 'ready'), true);
assert.equal(diagnosis.checks.some(item => item.routeLabel === '矿洞'), true);
assert.match(diagnosis.summary, /明确阻塞点/);
assert.match(diagnosis.routeSteps.join('\n'), /不会自动提交任务或消耗物品/);
assert.equal(JSON.stringify(diagnosis).includes('apiKey'), false);
assert.equal(JSON.stringify(diagnosis).includes('process.env'), false);

const noContext = buildTaskDiagnosis(null, { question: '任务卡住了' });
assert.deepEqual(noContext, createEmptyTaskDiagnosisResult('任务卡住了'));

const noCandidate = buildTaskDiagnosis({
  quests: { activeQuestLabels: ['普通任务说明'] },
  inventory: { shortageLabels: [] },
}, {
  queryPlan: { slots: { tasks: [{ label: '不存在任务' }], items: [] }, quotedTerms: [] },
  question: '不存在任务卡住了',
  routeLabels,
});
assert.equal(noCandidate.available, false);
assert.match(noCandidate.routeSteps[0], /补充任务名/);

console.log('qa-ai-assistant-task-diagnosis-service passed');
