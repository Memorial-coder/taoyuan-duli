import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  summarizeTaskDiagnosisTargetTask,
  summarizeTaskDiagnosisForTrace,
  summarizeLocalDiagnosticsForTrace,
} = require('../src/taoyuanAi/diagnosticsService');

const taskDiagnosis = {
  available: true,
  summary: '定位到任务阻塞点。',
  targetTask: {
    id: 'task_ash_mining',
    title: '阿石矿料委托',
    acceptedStatus: 'accepted',
    source: '当前任务摘要',
    labels: ['阿石矿料委托缺铜矿2'],
    apiKey: 'should-not-be-copied',
  },
  checks: [
    {
      id: 'inventory:copper',
      kind: 'inventory',
      label: '库存',
      status: 'blocked',
      statusLabel: '阻塞',
      detail: '还缺铜矿2个。',
      nextStep: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      source: '任务阻塞摘要',
      itemName: '铜矿',
      quantityText: '2个',
      rawOutput: 'should-not-be-copied',
    },
    {
      id: 'delivery:target',
      kind: 'delivery',
      label: '交付对象/地点',
      status: 'unknown',
      statusLabel: '未确认',
      detail: '需要回任务页确认交付对象。',
      nextStep: '',
      routeName: 'quest',
      routeLabel: '任务',
      source: '当前任务摘要',
      backendRule: 'should-not-be-copied',
    },
  ],
  blockedChecks: [
    {
      id: 'inventory:copper',
      kind: 'inventory',
      label: '库存',
      status: 'blocked',
      detail: '还缺铜矿2个。',
      nextStep: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      source: '任务阻塞摘要',
      internalReceiptIdempotencyKey: 'should-not-be-copied',
    },
  ],
  routeSteps: ['去矿洞补齐铜矿。', '回任务页交付。'],
  secretTrace: 'should-not-be-copied',
};

const taskSummary = summarizeTaskDiagnosisForTrace(taskDiagnosis);
assert.deepEqual(taskSummary, {
  available: true,
  summary: '定位到任务阻塞点。',
  targetTask: {
    id: 'task_ash_mining',
    title: '阿石矿料委托',
    acceptedStatus: 'accepted',
    source: '当前任务摘要',
    labels: ['阿石矿料委托缺铜矿2'],
  },
  checks: [
    {
      id: 'inventory:copper',
      kind: 'inventory',
      label: '库存',
      status: 'blocked',
      statusLabel: '阻塞',
      detail: '还缺铜矿2个。',
      nextStep: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      source: '任务阻塞摘要',
      itemName: '铜矿',
      quantityText: '2个',
    },
    {
      id: 'delivery:target',
      kind: 'delivery',
      label: '交付对象/地点',
      status: 'unknown',
      statusLabel: '未确认',
      detail: '需要回任务页确认交付对象。',
      nextStep: '',
      routeName: 'quest',
      routeLabel: '任务',
      source: '当前任务摘要',
      itemName: '',
      quantityText: '',
    },
  ],
  blockedChecks: [
    {
      id: 'inventory:copper',
      kind: 'inventory',
      label: '库存',
      status: 'blocked',
      detail: '还缺铜矿2个。',
      nextStep: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      source: '任务阻塞摘要',
    },
  ],
  routeSteps: ['去矿洞补齐铜矿。', '回任务页交付。'],
});
assert.equal(JSON.stringify(taskSummary).includes('should-not-be-copied'), false, 'task trace summary should not copy extra fields');
assert.deepEqual(summarizeTaskDiagnosisTargetTask(null), null);
assert.deepEqual(summarizeTaskDiagnosisTargetTask({ title: '只给标题' }), {
  id: undefined,
  title: '只给标题',
  acceptedStatus: undefined,
  source: undefined,
  labels: [],
});

const diagnostics = {
  available: true,
  summary: '识别到 2 条本地诊断信号。',
  taskDiagnosis,
  signals: [
    {
      id: 'task-shortage:copper',
      category: 'task-shortage',
      categoryLabel: '任务缺口',
      title: '任务阻塞：铜矿',
      detail: '还缺铜矿2个。',
      recommendation: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      score: 96,
      reasons: ['任务推进价值高'],
      dimensions: { urgency: 5, taskValue: 5 },
      source: '任务诊断',
      apiKey: 'should-not-be-copied',
    },
  ],
  suggestions: [
    {
      id: 'task-shortage:copper',
      category: 'task-shortage',
      categoryLabel: '任务缺口',
      title: '任务阻塞：铜矿',
      detail: 'suggestion detail should not be copied',
      recommendation: '先补齐铜矿。',
      routeName: 'mining',
      routeLabel: '矿洞',
      score: 96,
      reasons: ['任务推进价值高'],
      dimensions: { urgency: 5, taskValue: 5 },
      source: 'suggestion source should not be copied',
    },
  ],
};

const diagnosticsSummary = summarizeLocalDiagnosticsForTrace(diagnostics);
assert.equal(diagnosticsSummary.available, true);
assert.equal(diagnosticsSummary.summary, diagnostics.summary);
assert.equal(diagnosticsSummary.taskDiagnosis.summary, taskDiagnosis.summary);
assert.deepEqual(diagnosticsSummary.signals[0], {
  id: 'task-shortage:copper',
  category: 'task-shortage',
  categoryLabel: '任务缺口',
  title: '任务阻塞：铜矿',
  detail: '还缺铜矿2个。',
  recommendation: '先补齐铜矿。',
  routeName: 'mining',
  routeLabel: '矿洞',
  score: 96,
  reasons: ['任务推进价值高'],
  dimensions: { urgency: 5, taskValue: 5 },
  source: '任务诊断',
});
assert.deepEqual(diagnosticsSummary.suggestions[0], {
  id: 'task-shortage:copper',
  category: 'task-shortage',
  categoryLabel: '任务缺口',
  title: '任务阻塞：铜矿',
  recommendation: '先补齐铜矿。',
  routeName: 'mining',
  routeLabel: '矿洞',
  score: 96,
  reasons: ['任务推进价值高'],
  dimensions: { urgency: 5, taskValue: 5 },
});
assert.equal(JSON.stringify(diagnosticsSummary).includes('should-not-be-copied'), false, 'diagnostics trace summary should not copy extra fields');
assert.equal(JSON.stringify(diagnosticsSummary).includes('suggestion detail should not be copied'), false, 'suggestion trace summary should stay compact');

assert.deepEqual(summarizeTaskDiagnosisForTrace(null), {
  available: false,
  summary: '',
  targetTask: null,
  checks: [],
  blockedChecks: [],
  routeSteps: [],
});
assert.deepEqual(summarizeLocalDiagnosticsForTrace(null), {
  available: false,
  summary: '',
  taskDiagnosis: {
    available: false,
    summary: '',
    targetTask: null,
    checks: [],
    blockedChecks: [],
    routeSteps: [],
  },
  signals: [],
  suggestions: [],
});

console.log('qa-ai-assistant-diagnostics-service passed');
