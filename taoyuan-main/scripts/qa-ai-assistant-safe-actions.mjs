import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(rootDir, 'src', 'utils', 'aiAssistantActions.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const packageFile = path.join(rootDir, 'package.json');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-safe-actions-'));
const bundledFile = path.join(tmpDir, 'aiAssistantActions.mjs');

await build({
  entryPoints: [sourceFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const {
  buildAiAssistantCopyText,
  getAiAssistantActionButtonLabel,
  isAiAssistantExecutableAction,
  normalizeAiAssistantActionType,
  resolveAiAssistantActionRouteName,
} = await import(pathToFileURL(bundledFile).href);

const makeSuggestion = action => ({
  id: `case-${action.type}`,
  title: '马上做',
  level: 'now',
  levelLabel: '马上做',
  reason: '',
  benefit: '',
  signals: [],
  signalLabels: [],
  routeName: '',
  routeLabel: '',
  action: {
    label: '',
    target: '',
    value: '',
    items: [],
    ...action,
  },
});

assert.equal(normalizeAiAssistantActionType('grant_reward'), '', 'reward action must not be allowed');
assert.equal(normalizeAiAssistantActionType('consume_item'), '', 'item consuming action must not be allowed');
assert.equal(normalizeAiAssistantActionType('copy_checklist'), 'copy_checklist', 'copy checklist should be allowed');

assert.equal(
  resolveAiAssistantActionRouteName({ type: 'open_mail', label: '打开邮箱', target: '', value: '', items: [] }),
  'mail',
  'open_mail should resolve to mail route',
);
assert.equal(
  resolveAiAssistantActionRouteName({ type: 'open_activity', label: '打开活动', target: '', value: '', items: [] }),
  'festival',
  'open_activity should resolve to festival route',
);
assert.equal(
  resolveAiAssistantActionRouteName({ type: 'open_page', label: '打开外链', target: 'https://example.invalid', value: '', items: [] }),
  'quest',
  'external targets should not be used as routes and should fall back to a safe route',
);

const copySuggestion = makeSuggestion({
  type: 'copy_checklist',
  label: '复制采购清单',
  items: ['铜矿×2', '木材×10'],
});
assert.equal(isAiAssistantExecutableAction(copySuggestion), true, 'copy checklist with items should be executable');
assert.equal(buildAiAssistantCopyText(copySuggestion), '1. 铜矿×2\n2. 木材×10', 'copy checklist should format numbered items');
assert.equal(getAiAssistantActionButtonLabel(copySuggestion), '复制采购清单', 'button label should use public action label');

assert.equal(
  isAiAssistantExecutableAction(makeSuggestion({ type: 'copy_checklist', label: '空清单' })),
  false,
  'empty copy action should not be executable',
);
assert.equal(
  isAiAssistantExecutableAction(makeSuggestion({ type: 'mark_goal', label: '标记今日目标', value: '今天先交任务' })),
  true,
  'mark_goal with local value should be executable',
);
assert.equal(
  isAiAssistantExecutableAction(makeSuggestion({ type: 'grant_reward', label: '发奖励', value: '100文' })),
  false,
  'dangerous reward action should not be executable',
);

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /data-testid="ai-answer-actions"/, 'widget should render action button container');
assert.match(widgetSource, /handleSuggestionAction/, 'widget should wire action click handler');
assert.match(widgetSource, /router\.push\(\{ name: routeName \}\)/, 'widget should navigate through named internal routes only');
assert.match(widgetSource, /navigator\.clipboard\.writeText/, 'widget should use clipboard API for copy action');
assert.match(widgetSource, /markedSuggestionIds/, 'widget should keep mark_goal local to the component');
assert.doesNotMatch(widgetSource, /grant_reward|consume_item|removeItem|addItem|claimReward|发奖|扣资源/, 'widget action handler must not expose high-risk action paths');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
assert.equal(
  packageJson.scripts['qa:ai-assistant-safe-actions'],
  'node scripts/qa-ai-assistant-safe-actions.mjs',
  'package script should register safe action QA',
);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-safe-actions passed');
