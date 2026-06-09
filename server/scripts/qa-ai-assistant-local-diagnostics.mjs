import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-local-diagnostics-'));
process.env.DB_STORAGE = path.join(tmpDir, 'db.json');
delete process.env.TAOYUAN_AI_ASSISTANT_API_KEY;
delete process.env.AI_ASSISTANT_API_KEY;
delete process.env.OPENAI_API_KEY;

const require = createRequire(import.meta.url);
const cfg = require('../src/config');
const aiAssistant = require('../src/taoyuanAiAssistant');

cfg.setWithMeta({
  ai_assistant_enabled: true,
  ai_assistant_mode: 'strict',
  ai_assistant_api_url: '',
  ai_assistant_model: '',
  ai_assistant_source_read_enabled: false,
  ai_assistant_source_ingest_enabled: false,
});

const hiddenMarkers = [
  'hiddenDropRateFixture',
  'backend_rule_fixture',
  'process.env',
  'apiKey',
];

const fullSnapshot = {
  contextVersion: 2,
  baseState: {
    currentRouteName: 'quest',
    currentPageLabel: '任务',
    seasonLabel: '夏季',
    day: 27,
    dateLabel: '第1年 夏季 第27天',
    stamina: 20,
    maxStamina: 120,
    money: 300,
    moneyLabel: '300文',
  },
  inventory: {
    slotUsageLabel: '背包23/24格',
    shortageLabels: ['hiddenDropRateFixture=0.99'],
    pendingToolUpgradeLabel: '铜锄升级缺铜矿2和现金300文',
  },
  farming: {
    seasonRiskLabels: ['夏末青菜2块还未收获'],
    waterRiskLabels: ['3块菜地缺水'],
  },
  buildings: {
    villageProjectLabel: '鸡舍升级缺木材10和现金500文',
    availableProjectLabels: ['温室修复'],
  },
  quests: {
    blockerLabels: ['阿石矿料委托缺铜矿2', 'backend_rule_fixture=deny'],
    shortageLabels: [],
    limitedTimeQuestLabel: '',
    claimableLabels: ['主线阶段奖励可领'],
  },
  online: {
    onlineAlertLabels: ['灯会房间剩30分钟待确认'],
  },
};

const riskSnapshot = {
  contextVersion: 2,
  baseState: {
    stamina: 20,
    maxStamina: 120,
    money: 2000,
  },
  inventory: {
    slotUsageLabel: '背包23/24格',
  },
  farming: {
    seasonRiskLabels: ['夏末青菜2块还未收获'],
  },
};

function plan(question, routeName = '') {
  return aiAssistant.__testing.resolveQueryPlanForTests(question, routeName);
}

function diagnostics(question, routeName, snapshot = fullSnapshot) {
  const queryPlan = plan(question, routeName);
  return aiAssistant.__testing.buildLocalDiagnosticsForTests(snapshot, { queryPlan, routeName, question });
}

function assertSortedByScore(items, label) {
  for (let index = 1; index < items.length; index += 1) {
    assert.ok(
      items[index - 1].score >= items[index].score,
      `${label} should be sorted by score: ${items[index - 1].score} before ${items[index].score}`,
    );
  }
}

function assertHasCategory(result, category, label) {
  assert.ok(
    result.signals.some(item => item.category === category),
    `${label} should include diagnostic category ${category}; got ${result.signals.map(item => item.category).join(', ')}`,
  );
}

function assertReasons(item, label) {
  assert.ok(item.reasons.length > 0, `${label} should include ordering reasons`);
  assert.ok(
    item.reasons.some(reason => /紧急|收益|风险|现金|任务|解锁|体力/.test(reason)),
    `${label} should include player-facing scoring reasons; got ${item.reasons.join(' / ')}`,
  );
}

const allSignals = diagnostics('我今天该做什么', 'quest');
assert.equal(allSignals.available, true, 'full snapshot should produce diagnostics');
assertSortedByScore(allSignals.signals, 'all diagnostic signals');
for (const category of [
  'season-risk',
  'water-risk',
  'stamina-low',
  'cash-low',
  'bag-nearly-full',
  'task-shortage',
  'building-bottleneck',
  'tool-bottleneck',
  'claimable-reward',
  'online-alert',
]) {
  assertHasCategory(allSignals, category, 'full snapshot');
}
for (const item of allSignals.suggestions) assertReasons(item, item.title);

const taskSignals = diagnostics('任务卡住了怎么办', 'quest');
assert.equal(taskSignals.suggestions[0].category, 'task-shortage', 'task diagnosis should prioritize task shortage');
assert.match(taskSignals.suggestions[0].title, /任务阻塞|资源缺口/, 'task diagnosis top suggestion should be a direct blocker');
assertReasons(taskSignals.suggestions[0], 'task top suggestion');

const riskSignals = diagnostics('有什么风险要注意', 'farm', riskSnapshot);
assert.deepEqual(
  riskSignals.suggestions.slice(0, 3).map(item => item.category),
  ['season-risk', 'bag-nearly-full', 'stamina-low'],
  'risk reminder should order season, bag, and stamina signals by score',
);
for (const item of riskSignals.suggestions.slice(0, 3)) assertReasons(item, `risk ${item.category}`);

const publicResult = await aiAssistant.askPublic('我今天该做什么', {
  routeName: 'quest',
  contextSnapshot: fullSnapshot,
});
assert.equal(publicResult.provider, 'local', 'public planning answer should use local provider with remote disabled');
assert.equal(publicResult.mode, 'strict', 'public planning answer should keep strict mode');
assert.match(publicResult.answer, /本地诊断/, 'public answer should use local diagnostic wording');
assert.match(publicResult.answer, /评分/, 'public answer should include score');
assert.match(publicResult.answer, /原因/, 'public answer should include reasons');
assert.match(publicResult.answer, /建议/, 'public answer should include recommendation');

const publicText = JSON.stringify(publicResult);
for (const marker of hiddenMarkers) {
  assert.equal(publicText.includes(marker), false, `public answer must not leak ${marker}`);
}
assert.equal(publicText.includes('server/src'), false, 'public answer must not expose source paths');

const debugResult = await aiAssistant.askDebug('任务卡住了怎么办', {
  routeName: 'quest',
  contextSnapshot: fullSnapshot,
  sourceReadEnabled: false,
  sourceIngestEnabled: false,
});
assert.equal(debugResult.trace.diagnostics.available, true, 'debug trace should include diagnostics');
assert.equal(debugResult.trace.diagnostics.suggestions[0].category, 'task-shortage', 'trace diagnostics should preserve ordering');
for (const marker of hiddenMarkers) {
  assert.equal(JSON.stringify(debugResult.trace.diagnostics).includes(marker), false, `diagnostic trace must not leak ${marker}`);
}

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-local-diagnostics passed');
