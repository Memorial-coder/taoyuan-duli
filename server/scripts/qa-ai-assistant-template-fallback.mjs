import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-template-fallback-'));
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
  'server/src',
];

const planningSnapshot = {
  contextVersion: 2,
  baseState: {
    currentRouteName: 'quest',
    currentPageLabel: '任务',
    seasonLabel: '夏季',
    day: 27,
    stamina: 20,
    maxStamina: 120,
    money: 300,
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
  quests: {
    blockerLabels: ['阿石矿料委托缺铜矿2', 'backend_rule_fixture=deny'],
    claimableLabels: ['主线阶段奖励可领'],
  },
  online: {
    onlineAlertLabels: ['灯会房间剩30分钟待确认'],
  },
};

function assertTemplateSections(answer, label) {
  for (const section of ['结论：', '为什么：', '下一步：']) {
    assert.match(answer, new RegExp(section), `${label} should include ${section}`);
  }
}

function assertSafePayload(result, label) {
  const text = JSON.stringify(result);
  for (const marker of hiddenMarkers) {
    assert.equal(text.includes(marker), false, `${label} must not leak ${marker}`);
  }
}

async function ask(question, options = {}) {
  const result = await aiAssistant.askPublic(question, options);
  assert.equal(result.provider, 'local', `${question} should use local provider`);
  assert.equal(result.mode, 'strict', `${question} should keep strict mode`);
  assertTemplateSections(result.answer, question);
  assertSafePayload(result, question);
  return result;
}

let result = await ask('青菜从哪来？有什么用？', { routeName: 'farm' });
assert.match(result.answer, /我能确认的对象是「青菜」|结论：青菜/, 'resource source should keep a player-facing structured lead');
assert.match(result.answer, /万物铺/, 'resource source should include source path');
assert.match(result.answer, /炒青菜/, 'resource source should include usage path');
assert.doesNotMatch(result.answer, /结构化公开资料回答|资源索引|依据：|证据|命中公开资料/, 'resource source body should avoid report-like evidence wording');
assert.ok(
  (result.evidence || []).some(item => item.sourceType === 'structured-knowledge'),
  'resource source should expose structured evidence summary',
);

result = await ask('任务卡住了怎么办', {
  routeName: 'quest',
  contextSnapshot: planningSnapshot,
});
assert.match(result.answer, /卡在|先/, 'task diagnosis should give direct task conclusion');
assert.match(result.answer, /库存|铜矿|资源缺口/, 'task diagnosis should include blocker');
assert.match(result.answer, /去矿洞|回任务页|补齐/, 'task diagnosis should include actionable route');
assert.doesNotMatch(result.answer, /任务诊断|下一步路线|评分/, 'task answer should avoid report-like wording');

result = await ask('我今天该做什么', {
  routeName: 'farm',
  contextSnapshot: planningSnapshot,
});
assert.match(result.answer, /现在先做|结论：/, 'today planning should give a direct recommendation');
assert.match(result.answer, /换季风险|背包将满|任务阻塞/, 'today planning should include current-state signal');
assert.doesNotMatch(result.answer, /本地诊断|评分/, 'today planning should avoid internal diagnostics wording');

result = await ask('鱼塘怎么玩', { routeName: 'fishpond' });
assert.match(result.answer, /我能确认的对象是「鱼塘|结论：/, 'system explanation should use structured system entry');
assert.match(result.answer, /鱼塘页面|容量|水质|周赛/, 'system explanation should include page mechanics');
assert.doesNotMatch(result.answer, /结构化公开资料回答|依据：|证据|命中公开资料/, 'system answer should avoid report-like source wording');

result = await ask('月影彩虹兔怎么转职？');
assert.match(result.answer, /还没识别出明确的物品、任务、NPC、地点或系统/, 'unknown query should explain missing target');
assert.match(result.answer, /你想查某个物品从哪来吗/, 'unknown query should include clarification option');
assert.match(result.answer, /你想看某个任务卡在哪里吗/, 'unknown query should include task clarification option');
assert.match(result.answer, /你想了解当前页面或系统怎么玩吗/, 'unknown query should include system clarification option');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-template-fallback passed');
