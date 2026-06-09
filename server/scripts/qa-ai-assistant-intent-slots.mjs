import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-intent-slots-'));
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

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/[\s_\-:'"`]+/g, '');
}

function slotValues(plan, field) {
  return (plan.slots?.[field] || []).flatMap(item => [
    item.id,
    item.canonical,
    item.label,
    item.match,
  ]).filter(Boolean);
}

function assertSlot(plan, field, expected, label) {
  const normalizedExpected = normalize(expected);
  assert.ok(
    slotValues(plan, field).some(value => {
      const normalizedValue = normalize(value);
      return normalizedValue.includes(normalizedExpected) || normalizedExpected.includes(normalizedValue);
    }),
    `${label} should extract ${field} slot ${expected}; got ${JSON.stringify(plan.slots?.[field] || [])}`,
  );
}

function assertQuestionType(plan, expected, label) {
  assert.ok(
    (plan.questionTypes || []).includes(expected),
    `${label} should include question type ${expected}; got ${JSON.stringify(plan.questionTypes || [])}`,
  );
}

function assertIntent(plan, expected, label) {
  assert.ok(
    (plan.intents || []).includes(expected),
    `${label} should include intent ${expected}; got ${JSON.stringify(plan.intents || [])}`,
  );
}

const cases = [
  { question: '小青菜哪里买', routeName: 'farm', types: ['resource-source', 'shop-purchase'], slots: { items: ['青菜'] }, intents: ['find_source'] },
  { question: '菜苗从哪来', routeName: 'farm', types: ['resource-source'], slots: { items: ['青菜'] }, intents: ['find_source'] },
  { question: '铜矿石差两个去哪弄', routeName: 'mining', types: ['resource-source', 'task-diagnosis'], slots: { items: ['铜矿'], quantities: ['2个'] }, intents: ['find_source', 'diagnose_task'] },
  { question: '小鲫在哪钓', routeName: 'fishing', types: ['resource-source', 'fish-condition'], slots: { items: ['鲫鱼'] }, intents: ['find_source'] },
  { question: '溪流鱼有什么用', routeName: 'fishing', types: ['resource-use'], slots: { items: ['鲫鱼'], locations: ['溪流'] }, intents: ['explain_usage'] },
  { question: '认证签怎么搞', routeName: 'breeding', types: ['resource-source'], slots: { items: ['谱系认证签'] }, intents: ['find_source'] },
  { question: '育种凭证任务要几个', routeName: 'breeding', types: ['task-diagnosis', 'resource-use'], slots: { items: ['谱系认证签'], systems: ['育种'] }, intents: ['diagnose_task'] },
  { question: '青菜料理怎么做', routeName: 'cooking', types: ['recipe'], slots: { items: ['炒青菜'] }, intents: ['gameplay_qa'] },
  { question: '陈伯店买种子吗', routeName: 'shop', types: ['shop-purchase'], slots: { items: ['作物种子'], locations: ['万物铺'], npcs: ['陈伯'] }, intents: ['find_source'] },
  { question: '孙铁匠那能补铜吗', routeName: 'shop', types: ['resource-source'], slots: { items: ['铜矿'], locations: ['铁匠铺'], npcs: ['孙铁匠'] }, intents: ['gameplay_qa'] },
  { question: '春天能种什么', routeName: 'farm', types: ['resource-source'], slots: { seasons: ['春季'] }, intents: ['gameplay_qa'] },
  { question: '夏天鱼塘要干嘛', routeName: 'fishpond', types: ['today-planning', 'system-mechanic'], slots: { seasons: ['夏季'], systems: ['鱼塘'] }, intents: ['plan_today', 'explain_system'] },
  { question: '秋季矿洞路线', routeName: 'mining', types: ['next-step-suggestion'], slots: { seasons: ['秋季'], locations: ['矿洞'] }, intents: ['suggest_next_step'] },
  { question: '冬天药铺开吗', routeName: 'shop', types: ['page-explanation'], slots: { seasons: ['冬季'], locations: ['药铺'] }, intents: ['explain_page'] },
  { question: '阿石的矿料任务卡住', routeName: 'quest', types: ['task-diagnosis'], slots: { npcs: ['阿石'], items: ['铜矿'] }, intents: ['diagnose_task'] },
  { question: '秋月要的鱼去哪找', routeName: 'quest', types: ['resource-source', 'task-diagnosis'], slots: { npcs: ['秋月'] }, intents: ['find_source', 'diagnose_task'] },
  { question: '博物馆展陈缺什么', routeName: 'museum', types: ['task-diagnosis'], slots: { systems: ['博物馆'] }, intents: ['diagnose_task'] },
  { question: '公会讨伐奖励在哪看', routeName: 'guild', types: ['page-explanation', 'system-mechanic'], slots: { systems: ['公会'] }, intents: ['find_source', 'explain_page'] },
  { question: '瀚海商路下一步', routeName: 'hanhai', types: ['next-step-suggestion'], slots: { systems: ['瀚海'] }, intents: ['suggest_next_step'] },
  { question: '灯会房间怎么重连', routeName: 'festival', types: ['page-explanation', 'task-diagnosis'], slots: { systems: ['节会'], tasks: ['节会房间重连'] }, intents: ['explain_page'] },
];

assert.equal(cases.length, 20, 'QA should cover 20 synonym phrasings');

for (const item of cases) {
  const plan = aiAssistant.__testing.resolveQueryPlanForTests(item.question, item.routeName);
  for (const type of item.types || []) assertQuestionType(plan, type, item.question);
  for (const intent of item.intents || []) assertIntent(plan, intent, item.question);
  for (const [field, expectedList] of Object.entries(item.slots || {})) {
    for (const expected of expectedList) assertSlot(plan, field, expected, item.question);
  }
  assert.equal(plan.clarification?.required, false, `${item.question} should not require clarification`);
}

const officialIdPlan = aiAssistant.__testing.resolveQueryPlanForTests('copper_ore 去哪弄', 'mining');
assertSlot(officialIdPlan, 'items', '铜矿', 'official ID copper_ore');
assert.ok(
  officialIdPlan.slots.items.some(item => item.matchType === 'official-id' && normalize(item.canonical) === 'copperore'),
  'official ID match should be preserved as official-id, not overwritten by aliases',
);

async function assertLocalStructuredAnswer(question, routeName, expectedTitle) {
  const result = await aiAssistant.askPublic(question, { routeName });
  assert.equal(result.provider, 'local', `${question} should be answered locally`);
  assert.equal(result.mode, 'strict', `${question} should keep strict mode`);
  assert.ok(
    (result.evidence || []).some(item => item.sourceType === 'structured-knowledge'),
    `${question} should expose structured knowledge evidence`,
  );
  assert.match(result.answer, new RegExp(`结构化公开资料回答：${expectedTitle}`), `${question} should match ${expectedTitle}`);
  assert.equal(JSON.stringify(result).includes('server/src'), false, `${question} must not expose source paths`);
  assert.equal(JSON.stringify(result).includes('process.env'), false, `${question} must not expose env internals`);
}

await assertLocalStructuredAnswer('小青菜哪里买', 'farm', '青菜');
await assertLocalStructuredAnswer('菜苗从哪来', 'farm', '青菜');
await assertLocalStructuredAnswer('铜矿石差两个去哪弄', 'mining', '铜矿');
await assertLocalStructuredAnswer('小鲫在哪钓', 'fishing', '鲫鱼');
await assertLocalStructuredAnswer('认证签怎么搞', 'breeding', '谱系认证签');
await assertLocalStructuredAnswer('青菜料理怎么做', 'cooking', '炒青菜');

const unknownPlan = aiAssistant.__testing.resolveQueryPlanForTests('月影彩虹兔怎么转职？');
assert.equal(unknownPlan.clarification?.required, true, 'unknown query should require clarification');
const unknown = await aiAssistant.askPublic('月影彩虹兔怎么转职？');
assert.equal(unknown.provider, 'local', 'unknown query should still be handled locally');
assert.match(unknown.answer, /还没识别出明确的物品、任务、NPC、地点或系统/, 'unknown query should ask for clarification');
assert.match(unknown.answer, /你想查某个物品从哪来吗/, 'unknown query should include clarification options');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-intent-slots passed');
