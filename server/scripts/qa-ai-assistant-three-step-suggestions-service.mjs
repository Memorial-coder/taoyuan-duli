import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('../src/taoyuanAi/threeStepSuggestionsService');

const routeLabels = {
  farm: '农场',
  quest: '任务',
  shop: '商店',
};

const builtInRouteLabels = {
  farm: '农场',
  quest: '任务',
  shop: '商店',
  inventory: '背包',
  mining: '矿洞',
  fishpond: '鱼塘',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
};

const expectedBuiltInRoutes = [
  'farm',
  'quest',
  'shop',
  'inventory',
  'mining',
  'fishpond',
  'breeding',
  'museum',
  'guild',
  'hanhai',
];
const requiredLevels = ['now', 'today', 'week'];
const safeActionTypes = new Set([
  'navigate',
  'open_page',
  'open_mail',
  'open_activity',
  'open_quest',
  'copy_checklist',
  'expand_page',
  'mark_goal',
]);

const routeTemplates = {
  farm: {
    routeName: 'farm',
    steps: {
      now: {
        title: '先处理农场即时事项',
        reason: '先看成熟作物和缺水地块。',
        benefit: '稳住当日收益。',
        signals: ['season-risk', 'stamina-use', 'unknown-signal'],
        action: { type: 'open_page', label: '打开农场', target: 'farm', secret: 'must-not-copy' },
      },
      today: {
        title: '安排今日农场路线',
        reason: '把浇水、收获和任务作物放在同一趟。',
        benefit: '减少往返。',
        signals: ['task-progress', 'stamina-use'],
        action: { type: 'mark_goal', label: '标记农场目标', target: 'farm', value: '收获并浇水' },
      },
      week: {
        title: '准备换季和升级材料',
        reason: '本周提前预留材料。',
        benefit: '降低成长线卡住概率。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制农场清单', target: 'farm', items: ['确认换季作物', '预留升级材料'] },
      },
    },
  },
  quest: {
    routeName: 'quest',
    steps: {
      now: {
        title: '先看可交付任务',
        reason: '任务页能直接确认缺口。',
        benefit: '快速推进任务。',
        signals: ['task-progress', 'cash-flow'],
        action: { type: 'open_quest', label: '打开任务页', target: 'quest' },
      },
      today: {
        title: '锁定一条今日任务线',
        reason: '避免分散材料。',
        benefit: '提高完成率。',
        signals: ['task-progress'],
        action: { type: 'mark_goal', label: '标记任务目标', target: 'quest', value: '完成一条任务线' },
      },
      week: {
        title: '整理前置和材料',
        reason: '提前确认共享缺口。',
        benefit: '减少下周阻塞。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制任务清单', target: 'quest', items: ['确认缺口', '预留交付材料'] },
      },
    },
  },
};

assert.deepEqual(
  service.normalizeThreeStepSignals(['cash-flow', 'cash-flow', 'bad', 'task-progress', 'season-risk', 'stamina-use', 'resource-shortage']),
  ['cash-flow', 'task-progress', 'season-risk', 'stamina-use'],
  'signals should dedupe, allowlist, and cap to four',
);
assert.deepEqual(service.getSignalsForDiagnostic({ category: 'tool-bottleneck' }), ['growth-unlock', 'resource-shortage', 'cash-flow']);
assert.deepEqual(service.getSignalsForDiagnostic({ category: 'not-known' }), []);

const snapshot = {
  contextVersion: 2,
  baseState: {
    currentRouteName: 'farm',
    currentPageLabel: '农场',
  },
};
assert.equal(
  service.getThreeStepRouteName('quest', {}, {}, snapshot, { routeTemplates }),
  'quest',
  'explicit route should win',
);
assert.equal(
  service.getThreeStepRouteName('', {}, {}, snapshot, { routeTemplates }),
  'farm',
  'snapshot base route should be used',
);
assert.equal(
  service.getThreeStepRouteName('', { routeHints: ['shop', 'quest'] }, {}, null, { routeTemplates }),
  'quest',
  'query route hint should resolve to the first route with a template',
);
assert.equal(
  service.getThreeStepRouteName('', {}, { signals: [{ routeName: 'farm' }] }, null, { routeTemplates }),
  'farm',
  'diagnostic route should resolve when no route or snapshot is available',
);

const diagnostics = {
  signals: [
    { id: 'farm-1', routeName: 'farm', category: 'water-risk', title: '缺水提醒' },
    { id: 'quest-1', routeName: 'quest', category: 'task-shortage', title: '任务缺口' },
    { id: 'tool-1', routeName: 'upgrade', category: 'tool-bottleneck', title: '工具瓶颈' },
  ],
};
const usedIds = new Set();
assert.equal(
  service.pickThreeStepDiagnosticSignal('farm', diagnostics, ['task-progress'], usedIds)?.id,
  'farm-1',
  'route-related signal should be preferred before template signal',
);
assert.equal(
  service.pickThreeStepDiagnosticSignal('farm', diagnostics, ['task-progress'], usedIds)?.id,
  'quest-1',
  'used diagnostic ids should not be reused',
);

assert.equal(
  service.createThreeStepAction('farm', { type: 'grant_reward', label: '发奖励', target: 'farm' }, { routeLabels }),
  null,
  'unsafe action type should be rejected',
);
assert.deepEqual(
  service.createThreeStepAction('shop', {}, { routeLabels }),
  { type: 'open_page', label: '打开商店页', target: 'shop', value: '', items: [] },
  'empty action should fall back to a safe page action',
);

assert.deepEqual(
  Object.keys(service.THREE_STEP_ROUTE_TEMPLATES).sort(),
  expectedBuiltInRoutes.slice().sort(),
  'built-in templates should cover all expected route pages',
);

for (const routeName of expectedBuiltInRoutes) {
  const template = service.THREE_STEP_ROUTE_TEMPLATES[routeName];
  assert.equal(template.routeName, routeName, `${routeName} built-in template should carry its routeName`);
  assert.deepEqual(
    Object.keys(template.steps || {}).sort(),
    requiredLevels.slice().sort(),
    `${routeName} built-in template should include now/today/week`,
  );

  for (const level of requiredLevels) {
    const step = template.steps[level];
    assert.ok(step.title, `${routeName}:${level} should include title`);
    assert.ok(step.reason, `${routeName}:${level} should include reason`);
    assert.ok(step.benefit, `${routeName}:${level} should include benefit`);
    assert.ok(step.signals?.length, `${routeName}:${level} should include signals`);
    assert.ok(
      step.signals.every(signal => service.THREE_STEP_ALLOWED_SIGNALS.has(signal)),
      `${routeName}:${level} should only use allowlisted signals`,
    );

    const action = service.createThreeStepAction(routeName, step.action, { routeLabels: builtInRouteLabels });
    assert.ok(action, `${routeName}:${level} should normalize to a safe action`);
    assert.ok(safeActionTypes.has(action.type), `${routeName}:${level} action should be safe: ${action.type}`);
    assert.equal(String(action.target || '').includes('http'), false, `${routeName}:${level} action target should not be external`);
  }

  const defaultBuilt = service.buildAiAssistantThreeStepSuggestions({
    contextVersion: 2,
    baseState: {
      currentRouteName: routeName,
      currentPageLabel: builtInRouteLabels[routeName],
    },
  }, {
    question: '我今天该做什么',
    routeLabels: builtInRouteLabels,
  });
  assert.equal(defaultBuilt.available, true, `${routeName} should build with built-in templates by default`);
  assert.equal(defaultBuilt.routeName, routeName, `${routeName} default build should resolve snapshot route`);
  assert.deepEqual(
    new Set(defaultBuilt.suggestions.map(item => item.level)),
    new Set(requiredLevels),
    `${routeName} default build should include all required levels`,
  );
}

const built = service.buildAiAssistantThreeStepSuggestions(snapshot, {
  queryPlan: { routeHints: ['quest'] },
  routeName: '',
  question: '我今天该做什么 process.env',
  diagnostics: {
    signals: [
      { id: 'a', routeName: 'farm', category: 'water-risk', title: '3块菜地缺水' },
      { id: 'b', routeName: 'farm', category: 'task-shortage', title: 'server/src/hidden.js' },
      { id: 'c', routeName: 'farm', category: 'season-risk', title: '换季风险' },
    ],
  },
  routeTemplates,
  routeLabels,
});
assert.equal(built.available, true);
assert.equal(built.routeName, 'farm');
assert.equal(built.routeLabel, '农场');
assert.equal(built.contextAvailable, true);
assert.equal(built.question, '', 'sensitive question text should be removed from metadata');
assert.deepEqual(new Set(built.suggestions.map(item => item.level)), new Set(['now', 'today', 'week']));
assert.ok(built.suggestions.every(item => item.action && ['open_page', 'mark_goal', 'copy_checklist'].includes(item.action.type)));
assert.equal(JSON.stringify(built).includes('server/src'), false, 'sensitive diagnostic title should not leak');
assert.equal(JSON.stringify(built).includes('must-not-copy'), false, 'extra action fields should not leak');

const codeMode = service.buildAiAssistantThreeStepSuggestions(snapshot, {
  queryPlan: { answerMode: 'code' },
  question: '看源码',
  routeTemplates,
  routeLabels,
});
assert.equal(codeMode.available, false, 'code mode should not create player suggestions');
assert.deepEqual(codeMode.suggestions, []);

const block = service.formatThreeStepSuggestionsBlock(built);
assert.match(block, /三步建议/);
assert.doesNotMatch(block, /收益：|安全轻动作/, 'three-step answer block should stay compact; actions are already returned as structured buttons');
assert.equal(service.appendThreeStepSuggestionsToAnswer('原回答', built).startsWith('原回答\n\n三步建议'), true);
assert.equal(service.appendThreeStepSuggestionsToAnswer('原回答', { suggestions: [] }), '原回答');

const trace = service.summarizeThreeStepSuggestionsForTrace(built);
assert.equal(trace.available, true);
assert.equal(trace.suggestions.length, 3);
assert.equal(JSON.stringify(trace).includes('must-not-copy'), false);
assert.ok(trace.suggestions.every(item => item.action && !Object.prototype.hasOwnProperty.call(item.action, 'secret')));

console.log('qa-ai-assistant-three-step-suggestions-service passed');
