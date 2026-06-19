import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-task-diagnosis-'));
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
  'process.env',
  'apiKey',
  'server/src',
  'hiddenDropRateFixture',
  'backend_rule_fixture',
];

function assertSafePayload(payload, label) {
  const text = JSON.stringify(payload);
  for (const marker of hiddenMarkers) {
    assert.equal(text.includes(marker), false, `${label} must not leak ${marker}`);
  }
}

function baseSnapshot(overrides = {}) {
  return {
    contextVersion: 2,
    baseState: {
      currentRouteName: 'quest',
      currentPageLabel: '任务',
      seasonLabel: '夏季',
      day: 12,
      stamina: 80,
      maxStamina: 120,
      money: 900,
      ...overrides.baseState,
    },
    inventory: {
      slotUsageLabel: '背包12/24格',
      shortageLabels: [],
      ...overrides.inventory,
    },
    quests: {
      activeQuestLabels: [],
      boardQuestLabels: [],
      blockerLabels: [],
      shortageLabels: [],
      mainQuestObjectiveLabels: [],
      ...overrides.quests,
    },
  };
}

const cases = [
  {
    label: 'inventory shortage',
    question: '阿石矿料委托任务卡住了，缺什么？',
    snapshot: baseSnapshot({
      inventory: { shortageLabels: ['铜矿缺2个'] },
      quests: {
        activeQuestLabels: ['阿石矿料委托：交付铜矿3个给阿石'],
        blockerLabels: ['阿石矿料委托缺铜矿2个'],
      },
    }),
    expected: [/库存：.*铜矿|铜矿缺2/, /矿洞|铁匠铺|补齐铜矿/],
  },
  {
    label: 'precondition shortage',
    question: '谱系认证订单为什么卡住？',
    snapshot: baseSnapshot({
      quests: {
        activeQuestLabels: ['谱系认证订单：交付谱系认证签1张'],
        blockerLabels: ['谱系认证订单前置不足：需要完成育种入门并解锁育种棚'],
      },
    }),
    expected: [/前置：.*育种入门|育种棚/, /先打开任务关联的系统|建筑\/家园/],
  },
  {
    label: 'season mismatch',
    question: '草药采集委托为什么卡住？',
    snapshot: baseSnapshot({
      baseState: { seasonLabel: '冬季', dateLabel: '第1年 冬季 第3天' },
      quests: {
        activeQuestLabels: ['草药采集委托：采集草药3份并交给药铺'],
        blockerLabels: ['草药采集委托季节不符：当前冬季，春季/夏季/秋季可采集草药'],
      },
    }),
    expected: [/季节：.*冬季|季节不符/, /草药/, /改做不受季节限制/],
  },
  {
    label: 'time mismatch',
    question: '夜钓委托为什么卡住？',
    snapshot: baseSnapshot({
      baseState: { timePeriodLabel: '上午', timeLabel: '09:00' },
      quests: {
        activeQuestLabels: ['夜钓委托：夜晚钓到鲫鱼1条后交给阿宁'],
        blockerLabels: ['夜钓委托时间不符：需要夜晚，现在是上午'],
      },
    }),
    expected: [/时间：.*夜晚|上午|时间不符/, /确认剩余时间|时段|截止日/, /鲫鱼|溪流|补齐鲫鱼/],
  },
  {
    label: 'not accepted',
    question: '阿石矿料委托怎么开始？',
    snapshot: baseSnapshot({
      quests: {
        boardQuestLabels: ['阿石矿料委托：交付铜矿3个给阿石'],
      },
    }),
    expected: [/接取状态：.*尚未确认已接取|可接\/告示板/, /打开任务\/告示板页面接取/],
  },
];

for (const item of cases) {
  const result = await aiAssistant.askPublic(item.question, {
    routeName: 'quest',
    contextSnapshot: item.snapshot,
  });
  assert.equal(result.provider, 'local', `${item.label} should be answered locally`);
  assert.equal(result.mode, 'strict', `${item.label} should keep strict mode`);
  assert.match(result.answer, /结论：/, `${item.label} should give a direct conclusion`);
  assert.match(result.answer, /卡在|没有明显卡点/, `${item.label} should describe task state`);
  assert.match(result.answer, /为什么：/, `${item.label} should include concise reasons`);
  assert.match(result.answer, /下一步：/, `${item.label} should include next actions`);
  for (const pattern of item.expected) {
    assert.match(result.answer, pattern, `${item.label} should match ${pattern}`);
  }
  assert.match(result.answer, /只按玩家可见信息判断/, `${item.label} should keep a compact strict-mode boundary`);
  assert.doesNotMatch(result.answer, /任务诊断|下一步路线|评分|只读诊断|自动交任务|改存档/, `${item.label} should avoid report-like wording`);
  assert.doesNotMatch(result.answer, /已自动|将自动|正在自动|直接发放|已经扣除|已扣除/, `${item.label} must not claim automatic execution`);
  assertSafePayload(result, item.label);

  const debugResult = await aiAssistant.askDebug(item.question, {
    routeName: 'quest',
    contextSnapshot: item.snapshot,
    sourceReadEnabled: false,
    sourceIngestEnabled: false,
  });
  assert.equal(debugResult.trace.diagnostics.taskDiagnosis.available, true, `${item.label} trace should include task diagnosis`);
  assert.ok(debugResult.trace.diagnostics.taskDiagnosis.checks.length > 0, `${item.label} trace should include checks`);
  assertSafePayload(debugResult.trace.diagnostics.taskDiagnosis, `${item.label} trace`);
}

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-task-diagnosis passed');
