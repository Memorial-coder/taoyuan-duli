import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(rootDir, 'src', 'utils', 'aiAssistantQuickQuestions.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const apiFile = path.join(rootDir, 'src', 'utils', 'taoyuanAiApi.ts');
const routerFile = path.join(rootDir, 'src', 'router', 'index.ts');
const serverConfigFile = path.resolve(rootDir, '..', 'server', 'src', 'taoyuanAi', 'configService.js');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-configured-questions-'));
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
  AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE,
  AI_ASSISTANT_FALLBACK_QUICK_QUESTIONS,
  AI_ASSISTANT_ROUTE_LABELS,
  AI_ASSISTANT_ROUTE_QUICK_QUESTION_CONFIG,
  getAiAssistantRouteLabel,
  getConfiguredAiQuickQuestions,
  buildDynamicAiQuickQuestions,
} = await import(pathToFileURL(bundledFile).href);

const routeLabels = Object.entries(AI_ASSISTANT_ROUTE_LABELS);
assert.ok(routeLabels.length >= 25, 'route labels should cover all major assistant pages');

for (const [routeName, label] of routeLabels) {
  const questions = AI_ASSISTANT_ROUTE_QUICK_QUESTION_CONFIG[routeName];
  assert.equal(getAiAssistantRouteLabel(routeName), label, `${routeName} should resolve its configured label`);
  assert.deepEqual(getConfiguredAiQuickQuestions(routeName), questions, `${routeName} should use configured quick questions`);
  assert.equal(questions.length, 3, `${routeName} should keep exactly three quick questions`);
  assert.match(questions[0], /主要目标/, `${routeName} first question should ask page goal`);
  assert.match(questions[1], /下一步/, `${routeName} second question should ask next step`);
  assert.match(questions[2], /常见卡点/, `${routeName} third question should ask common blocker`);
  for (const question of questions) {
    assert.ok(question.includes(label), `${routeName} question should be route-specific`);
    assert.ok(question.length <= 36, `${routeName} quick question should stay compact`);
  }
}

assert.deepEqual(
  getConfiguredAiQuickQuestions('__unknown__'),
  AI_ASSISTANT_FALLBACK_QUICK_QUESTIONS,
  'unknown routes should use fallback quick questions',
);

assert.deepEqual(
  buildDynamicAiQuickQuestions({
    contextSnapshot: { inventory: { slotUsageLabel: '背包23/24格' } },
    routeName: 'farm',
    defaultQuestions: getConfiguredAiQuickQuestions('farm'),
  }),
  [
    '背包快满了，先整理还是先交任务？',
    '【农场】主要目标是什么？',
    '我在【农场】下一步优先做什么？',
  ],
  'dynamic signals should replace only the highest-priority visible slots and keep configured route questions',
);

const routerSource = fs.readFileSync(routerFile, 'utf8');
const routeNames = [...routerSource.matchAll(/name:\s*'([^']+)'/g)].map(match => match[1]);
const excludedRoutes = new Set(['auth', 'guide', 'guide-book', 'admin', 'admin-users', 'late-game-debug']);
const missingRoutes = routeNames.filter(routeName => !excludedRoutes.has(routeName) && !AI_ASSISTANT_ROUTE_LABELS[routeName]);
assert.deepEqual(missingRoutes, [], `assistant route labels missing router names: ${missingRoutes.join(', ')}`);

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /getAiAssistantRouteLabel/, 'AiAssistantWidget should resolve context labels from config data');
assert.match(widgetSource, /getConfiguredAiQuickQuestions/, 'AiAssistantWidget should resolve quick questions from config data');
assert.match(widgetSource, /store\.loadConfig\(\{\s*appendWelcome:\s*false\s*\}\)/, 'AiAssistantWidget should preload remote config without appending the welcome message before first open');
assert.doesNotMatch(widgetSource, /const\s+routeLabels\s*:/, 'AiAssistantWidget should not keep hardcoded routeLabels');
assert.doesNotMatch(widgetSource, /quickQuestionMap/, 'AiAssistantWidget should not keep hardcoded quickQuestionMap');

const storeSource = fs.readFileSync(storeFile, 'utf8');
const openPanelBlock = storeSource.slice(
  storeSource.indexOf('const openPanel = async () => {'),
  storeSource.indexOf('const clearActiveLocalDraftTimer'),
);
assert.ok(openPanelBlock.includes('await loadConfig()'), 'openPanel should load remote config');
assert.ok(openPanelBlock.indexOf('await loadConfig()') < openPanelBlock.indexOf('appendWelcomeMessage()'), 'openPanel should append welcome only after loadConfig');
assert.match(storeSource, /appendWelcome\s*=\s*true/, 'loadConfig should allow callers to preload config without appending welcome');
assert.match(storeSource, /AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE/, 'store default welcome should use shared frontend constant');

const apiSource = fs.readFileSync(apiFile, 'utf8');
assert.match(apiSource, /AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE/, 'API public config mapper should use shared frontend welcome fallback');

const welcome = AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE;
for (const required of ['当前页面', '玩家可见状态', '现在干啥', '去哪弄', '任务为啥卡了', '严格模式']) {
  assert.ok(welcome.includes(required), `welcome message should mention ${required}`);
}
for (const denied of [/隐藏掉率/, /后台规则/, /密钥/, /刷资源方法/, /改存档|存档修改/, /发奖励|奖励发放/, /扣资源|资源扣除/]) {
  assert.match(welcome, denied, `welcome message should state boundary for ${denied}`);
}
assert.ok(welcome.length <= 130, 'welcome should stay short enough for the compact assistant panel');
assert.doesNotMatch(welcome, /fallback|完整回答|点下方快捷问题/, 'welcome should avoid implementation or tutorial filler');
assert.doesNotMatch(welcome, /我可以.*(改存档|发奖励|扣资源|发放资产|扣除资源)/, 'welcome should not promise high-risk actions');

const serverSource = fs.readFileSync(serverConfigFile, 'utf8');
assert.ok(serverSource.includes(welcome), 'server default welcome should match frontend shared welcome text');
assert.doesNotMatch(serverSource, /你可以问我玩法、系统机制和攻略建议|fallback 来源/, 'server should not keep old verbose welcome fallbacks');

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-configured-quick-questions passed');
