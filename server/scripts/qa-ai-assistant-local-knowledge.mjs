import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-local-knowledge-'));
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

async function ask(question, routeName = '') {
  const result = await aiAssistant.askPublic(question, { routeName });
  assert.equal(result.provider, 'local', `${question} should be answered locally`);
  assert.equal(result.mode, 'strict', `${question} should keep strict mode`);
  assert.ok(
    (result.evidence || []).some(item => item.sourceType === 'structured-knowledge'),
    `${question} should expose structured knowledge evidence`
  );
  assert.equal(JSON.stringify(result).includes('server/src'), false, `${question} must not expose source paths`);
  assert.equal(JSON.stringify(result).includes('process.env'), false, `${question} must not expose env internals`);
  assert.doesNotMatch(result.answer, /结构化公开资料回答|资源索引|依据：|证据|命中公开资料/, `${question} should avoid report-like evidence wording`);
  return result.answer;
}

let answer = await ask('青菜从哪来？有什么用？', 'farm');
assert.match(answer, /我能确认的对象是「青菜」|结论：青菜/, 'crop query should match cabbage structured entry');
assert.match(answer, /万物铺/, 'crop query should include shop source');
assert.match(answer, /春季/, 'crop query should include season condition');
assert.match(answer, /炒青菜/, 'crop query should include recipe usage');

answer = await ask('鲫鱼在哪里钓？能拿来做什么？', 'fishing');
assert.match(answer, /我能确认的对象是「鲫鱼」|结论：鲫鱼/, 'fish query should match crucian structured entry');
assert.match(answer, /溪流/, 'fish query should include fishing location');
assert.match(answer, /四季/, 'fish query should include season availability');
assert.match(answer, /委托|烟熏鲫鱼/, 'fish query should include use cases');

answer = await ask('铜矿怎么获得？后面有什么用？', 'mining');
assert.match(answer, /我能确认的对象是「铜矿」|结论：铜矿/, 'mineral query should match copper ore structured entry');
assert.match(answer, /矿洞/, 'mineral query should include mining source');
assert.match(answer, /工具升级/, 'mineral query should include upgrade usage');
assert.match(answer, /委托/, 'mineral query should include quest usage');

answer = await ask('谱系认证签是从哪来的？哪些任务要用？', 'breeding');
assert.match(answer, /我能确认的对象是「谱系认证签」|结论：谱系认证签/, 'quest item query should match lineage cert entry');
assert.match(answer, /育种系统/, 'quest item query should include breeding source');
assert.match(answer, /精品供货|专题茶席|节庆宴席|陈列复核/, 'quest item query should include quest/museum usage');

answer = await ask('炒青菜怎么做？有什么作用？', 'cooking');
assert.match(answer, /我能确认的对象是「炒青菜」|结论：炒青菜/, 'recipe query should match recipe structured entry');
assert.match(answer, /初始自带/, 'recipe query should include unlock source');
assert.match(answer, /需要青菜/, 'recipe query should include ingredient relation');
assert.match(answer, /恢复体力/, 'recipe query should include food usage');

console.log('qa-ai-assistant-local-knowledge passed');
