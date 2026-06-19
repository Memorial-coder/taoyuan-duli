import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-resource-lookup-'));
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

const cases = [
  { question: '青菜从哪来？最快怎么拿？', routeName: 'farm', title: '青菜', expected: /万物铺|种植收获/ },
  { question: '鲫鱼在哪里钓？推荐路线是什么？', routeName: 'fishing', title: '鲫鱼', expected: /溪流|四季/ },
  { question: '铜矿怎么获得？当前是否解锁？', routeName: 'mining', title: '铜矿', expected: /矿洞|铁匠铺/ },
  { question: '谱系认证签从哪来？最快怎么拿？', routeName: 'breeding', title: '谱系认证签', expected: /育种系统|活动\/商会任务/ },
  { question: '炒青菜怎么做？青菜不够怎么办？', routeName: 'cooking', title: '炒青菜', expected: /初始自带|需要青菜/ },
  { question: '木材从哪来？建筑缺木材怎么办？', routeName: 'forage', title: '木材', expected: /砍树|浮木处理/ },
  { question: '石材去哪弄最快？', routeName: 'mining', title: '石材', expected: /矿洞|采石/ },
  { question: '草药从哪采？现在解锁了吗？', routeName: 'forage', title: '草药', expected: /山间采集|药铺/ },
  { question: '野蘑菇从哪来？非秋季怎么办？', routeName: 'forage', title: '野蘑菇', expected: /秋季觅食|矿洞蘑菇层/ },
  { question: '蜂蜜最快怎么拿？', routeName: 'workshop', title: '蜂蜜', expected: /蜂箱|任务\/活动奖励/ },
  { question: '鱼饲料哪里买？还能怎么加工？', routeName: 'fishpond', title: '鱼饲料', expected: /商店\/旅行商人|磨坊加工|回收站/ },
  { question: '水质改良剂从哪来？鱼塘怎么备？', routeName: 'fishpond', title: '水质改良剂', expected: /商店\/旅行商人|任务奖励/ },
];

assert.ok(cases.length >= 10, 'resource lookup QA should cover at least 10 resources');

function buildSnapshot(routeName) {
  return {
    contextVersion: 2,
    baseState: {
      currentRouteName: routeName,
      currentPageLabel: aiAssistant.ROUTE_LABELS[routeName] || routeName,
      seasonLabel: '秋季',
      day: 12,
      stamina: 80,
      maxStamina: 120,
      money: 600,
    },
  };
}

function assertSafePayload(payload, label) {
  const text = JSON.stringify(payload);
  for (const marker of hiddenMarkers) {
    assert.equal(text.includes(marker), false, `${label} must not leak ${marker}`);
  }
}

for (const item of cases) {
  const result = await aiAssistant.askPublic(item.question, {
    routeName: item.routeName,
    contextSnapshot: buildSnapshot(item.routeName),
  });
  assert.equal(result.provider, 'local', `${item.title} should be answered locally`);
  assert.equal(result.mode, 'strict', `${item.title} should keep strict mode`);
  assert.ok(
    (result.evidence || []).some(evidence => evidence.sourceType === 'structured-knowledge'),
    `${item.title} should expose structured knowledge evidence`,
  );
  assert.match(result.answer, new RegExp(`我能确认的对象是「${item.title}」|结论：${item.title}`), `${item.title} should match structured entry`);
  assert.doesNotMatch(result.answer, /结构化公开资料回答|资源索引|资源反查|依据：|证据|命中公开资料/, `${item.title} should avoid report-like evidence wording`);
  assert.match(result.answer, /来源：/, `${item.title} should include sources`);
  assert.match(result.answer, /最快路线：/, `${item.title} should include fastest route`);
  assert.match(result.answer, /当前是否已解锁：/, `${item.title} should include unlock status`);
  assert.match(result.answer, /推荐路线：/, `${item.title} should include recommended route`);
  assert.match(result.answer, item.expected, `${item.title} should include expected public source`);
  assertSafePayload(result, item.title);
}

const unknown = await aiAssistant.askPublic('月影虹晶从哪来？最快怎么拿？', {
  routeName: 'inventory',
  contextSnapshot: buildSnapshot('inventory'),
});
assert.equal(unknown.provider, 'local', 'unknown resource should still be answered locally');
assert.doesNotMatch(unknown.answer, /月影虹晶.*来源：.*矿洞/, 'unknown resource must not fabricate a source');
assert.match(unknown.answer, /暂时无法|资料不足|更具体|补充/, 'unknown resource should state uncertainty or ask for clarification');
assertSafePayload(unknown, 'unknown resource');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-resource-lookup passed');
