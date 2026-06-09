import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(rootDir, 'src', 'utils', 'aiAssistantQuickQuestions.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-quick-questions-'));
const bundledFile = path.join(tmpDir, 'aiAssistantQuickQuestions.mjs');

await build({
  entryPoints: [sourceFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const {
  AI_DYNAMIC_QUICK_QUESTION_MAX,
  buildDynamicAiQuickQuestions,
} = await import(pathToFileURL(bundledFile).href);

const defaultQuestions = ['默认问题一', '默认问题二', '默认问题三'];

function quickQuestions(contextSnapshot) {
  const result = buildDynamicAiQuickQuestions({ contextSnapshot, routeName: 'quest', defaultQuestions });
  assert.ok(result.length <= AI_DYNAMIC_QUICK_QUESTION_MAX, 'dynamic questions must not exceed max visible quick buttons');
  assert.ok(result.length > 0, 'dynamic questions should always provide at least one question');
  return result;
}

assert.equal(
  quickQuestions({ inventory: { slotUsageLabel: '背包24/24格，已满' } })[0],
  '背包快满了，先整理还是先交任务？',
  'bag-full state should replace the first quick question',
);

assert.equal(
  quickQuestions({ farming: { seasonRiskLabels: ['夏末青菜×2'] } })[0],
  '换季前哪些作物要先处理？',
  'season-risk state should replace the first quick question',
);

assert.equal(
  quickQuestions({ quests: { shortageLabels: ['铜矿缺2（1/3）'] } })[0],
  '任务缺口先补什么？',
  'task-shortage state should replace the first quick question',
);

assert.equal(
  quickQuestions({ online: { mailClaimableLabels: ['可领邮件：节会补给'] } })[0],
  '邮箱有可领内容，先领哪些？',
  'claimable-mail state should replace the first quick question',
);

assert.equal(
  quickQuestions({ online: { onlineAlertLabels: ['灯会房间剩30分钟待确认'] } })[0],
  '活动快结束了，先处理什么？',
  'ending-event state should replace the first quick question',
);

assert.equal(
  quickQuestions({ baseState: { stamina: 20, maxStamina: 100 } })[0],
  '体力不多了，接下来做什么最稳？',
  'low-stamina state should replace the first quick question',
);

assert.deepEqual(
  quickQuestions({}),
  defaultQuestions,
  'no dynamic signal should keep route defaults',
);

const combined = quickQuestions({
  inventory: { slotUsageLabel: '背包23/24格' },
  quests: { blockerLabels: ['阿石矿料委托缺铜矿2'] },
  online: { mailClaimableLabels: ['可领邮件：补偿'] },
  farming: { seasonRiskLabels: ['夏末青菜×2'] },
});
assert.deepEqual(
  combined,
  [
    '背包快满了，先整理还是先交任务？',
    '任务缺口先补什么？',
    '邮箱有可领内容，先领哪些？',
  ],
  'multiple signals should be priority-sorted and capped to three',
);

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /buildDynamicAiQuickQuestions/, 'AiAssistantWidget should use dynamic quick question helper');
assert.match(widgetSource, /max-height:\s*56px/, 'quick question container should cap height to protect mobile input area');
assert.match(widgetSource, /overflow-x:\s*auto/, 'quick questions should scroll horizontally on narrow screens');
assert.match(widgetSource, /-webkit-line-clamp:\s*2/, 'quick question text should clamp to two lines');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-dynamic-quick-questions passed');
