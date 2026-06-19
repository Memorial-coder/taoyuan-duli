import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-three-step-'));
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

const routeSamples = [
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

const requiredLevels = new Set(['now', 'today', 'week']);
const allowedSignals = new Set([
  'cash-flow',
  'task-progress',
  'season-risk',
  'stamina-use',
  'resource-shortage',
  'growth-unlock',
  'online-deadline',
]);
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
const hiddenMarkers = [
  'hiddenDropRateFixture',
  'backend_rule_fixture',
  'process.env',
  'apiKey',
  'server/src',
];

function buildSnapshot(routeName) {
  return {
    contextVersion: 2,
    baseState: {
      currentRouteName: routeName,
      currentPageLabel: aiAssistant.ROUTE_LABELS[routeName] || routeName,
      seasonLabel: '夏季',
      day: 27,
      dateLabel: '第1年 夏季 第27天',
      stamina: 24,
      maxStamina: 120,
      money: 320,
      moneyLabel: '320文',
    },
    weeklyPlan: {
      primaryRouteLabel: '任务推进',
      claimableNodeLabels: ['周计划采集节点可领取'],
      nextWeekPrepSummary: '下周优先准备换季作物和工具升级材料',
    },
    inventory: {
      slotUsageLabel: '背包23/24格',
      shortageLabels: ['铜矿2', 'hiddenDropRateFixture=0.99'],
      pendingToolUpgradeLabel: '铜锄升级缺铜矿2和现金300文',
    },
    farming: {
      harvestableLabels: ['青菜2块可收获'],
      waterRiskLabels: ['3块菜地缺水'],
      seasonRiskLabels: ['夏末青菜2块还未收获'],
    },
    buildings: {
      villageProjectLabel: '鸡舍升级缺木材10和现金500文',
      availableProjectLabels: ['温室修复'],
    },
    quests: {
      mainQuestLabel: '修复村道',
      blockerLabels: ['阿石矿料委托缺铜矿2', 'backend_rule_fixture=deny'],
      shortageLabels: ['公告板料理委托缺青菜1'],
      limitedTimeQuestLabel: '节会委托剩1天',
      claimableLabels: ['主线阶段奖励可领'],
    },
    lateGame: {
      fishPondLabel: '鱼塘周赛准备中',
      fishPondAlertLabels: ['鱼塘容量9/10待确认', '鱼塘周赛剩2天'],
      breedingLabel: '育种槽1个空闲',
      breedingAlertLabels: ['育种槽空闲待安排'],
      museumLabel: '博物馆展柜可更新',
      museumAlertLabels: ['矿石展品可捐赠'],
      guildLabel: '公会订单待交付',
      guildAlertLabels: ['公会贡献奖励可领', '公会活动剩2天'],
      hanhaiLabel: '瀚海航线待备货',
      hanhaiAlertLabels: ['瀚海补给窗口剩1天'],
    },
    online: {
      mailboxLabel: '邮箱有奖励',
      mailClaimableLabels: ['节会补给可领取'],
      festivalRoomLabel: '灯会房间剩30分钟待确认',
      coopOrderLabel: '协作订单剩2小时',
      onlineAlertLabels: ['在线活动剩30分钟待确认'],
    },
  };
}

function assertSafePayload(payload, label) {
  const text = JSON.stringify(payload);
  for (const marker of hiddenMarkers) {
    assert.equal(text.includes(marker), false, `${label} must not leak ${marker}`);
  }
}

function assertSuggestionSet(suggestions, routeName, label) {
  assert.equal(suggestions.length, 3, `${label} should include exactly three suggestions`);
  assert.deepEqual(new Set(suggestions.map(item => item.level)), requiredLevels, `${label} should include now/today/week`);

  for (const item of suggestions) {
    assert.equal(item.routeName, routeName, `${label} suggestion should stay page-related`);
    assert.ok(item.levelLabel, `${label} suggestion should include player-facing level label`);
    assert.ok(item.title, `${label} suggestion should include title`);
    assert.ok(item.reason, `${label} suggestion should include reason`);
    assert.ok(item.benefit, `${label} suggestion should include benefit`);
    assert.ok(item.signals.length >= 1, `${label} suggestion should bind at least one signal`);
    assert.ok(
      item.signals.every(signal => allowedSignals.has(signal)),
      `${label} suggestion should use allowed signals; got ${item.signals.join(', ')}`,
    );
    assert.ok(item.signalLabels.length >= 1, `${label} suggestion should include signal labels`);
    assert.ok(item.action, `${label} suggestion should include a safe action`);
    assert.ok(safeActionTypes.has(item.action.type), `${label} action type should be safe: ${item.action.type}`);
    assert.equal(String(item.action.target || '').includes('http'), false, `${label} action target should not be external URL`);
  }
}

for (const routeName of routeSamples) {
  const question = '我今天该做什么';
  const queryPlan = aiAssistant.__testing.resolveQueryPlanForTests(question, routeName);
  const snapshot = buildSnapshot(routeName);
  const diagnostics = aiAssistant.__testing.buildLocalDiagnosticsForTests(snapshot, {
    queryPlan,
    routeName,
    question,
  });
  const threeStep = aiAssistant.__testing.buildThreeStepSuggestionsForTests(snapshot, {
    queryPlan,
    routeName,
    question,
    diagnostics,
  });

  assert.equal(threeStep.available, true, `${routeName} should produce three-step suggestions`);
  assert.equal(threeStep.routeName, routeName, `${routeName} should resolve to current page`);
  assertSuggestionSet(threeStep.suggestions, routeName, `${routeName} builder`);
  assertSafePayload(threeStep, `${routeName} builder`);

  const result = await aiAssistant.askPublic(question, {
    routeName,
    contextSnapshot: snapshot,
  });
  assert.equal(result.provider, 'local', `${routeName} public ask should use local provider`);
  assert.match(result.answer, /三步建议/, `${routeName} answer should display three-step section`);
  assert.match(result.answer, /马上做/, `${routeName} answer should display now level`);
  assert.match(result.answer, /今天做/, `${routeName} answer should display today level`);
  assert.match(result.answer, /本周做/, `${routeName} answer should display week level`);
  assert.doesNotMatch(result.answer, /收益：|不会直接改存档/, `${routeName} answer should keep three-step copy compact`);
  assertSuggestionSet(result.suggestions, routeName, `${routeName} public result`);
  assertSafePayload(result, `${routeName} public result`);
}

const debugSnapshot = buildSnapshot('quest');
const debugResult = await aiAssistant.askDebug('任务卡住了怎么办', {
  routeName: 'quest',
  contextSnapshot: debugSnapshot,
  sourceReadEnabled: false,
  sourceIngestEnabled: false,
});
assert.equal(debugResult.trace.suggestions.available, true, 'debug trace should include three-step suggestions');
assertSuggestionSet(debugResult.trace.suggestions.suggestions, 'quest', 'debug trace');
assertSafePayload(debugResult.trace.suggestions, 'debug trace');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-three-step-suggestions passed');
