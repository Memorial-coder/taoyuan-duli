import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(rootDir, 'src', 'utils', 'aiAssistantLocalDraft.ts');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const typesFile = path.join(rootDir, 'src', 'types', 'aiAssistant.ts');
const packageFile = path.join(rootDir, 'package.json');
const serverAssistantFile = path.resolve(rootDir, '..', 'server', 'src', 'taoyuanAiAssistant.js');
const serverAnswerComposerFile = path.resolve(rootDir, '..', 'server', 'src', 'taoyuanAi', 'answerComposer.js');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-local-draft-'));
const bundledFile = path.join(tmpDir, 'aiAssistantLocalDraft.mjs');

await build({
  entryPoints: [sourceFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const { buildAiAssistantLocalDraft } = await import(pathToFileURL(bundledFile).href);

const draft = buildAiAssistantLocalDraft({
  question: '今天先做什么？apiKey=should-not-leak',
  routeName: 'farm',
  contextLabel: '农场',
  contextSnapshot: {
    baseState: {
      currentPageLabel: '农场',
      staminaLabel: '42/80',
      moneyLabel: '1200文',
    },
    inventory: {
      shortageLabels: ['缺铜矿 3 个', 'server/src/hidden.js'],
    },
    quests: {
      blockerLabels: ['主线任务缺野菜 2 个'],
      claimableLabels: ['告示板奖励可领取'],
    },
    farming: {
      seasonRiskLabels: ['小麦还有 1 天换季风险'],
    },
    online: {
      mailClaimableLabels: ['活动邮件可领'],
      onlineAlertLabels: ['协作订单即将到期'],
    },
    weeklyPlan: {
      primaryRouteSummary: '优先补任务材料并领取奖励',
    },
  },
});

assert.match(draft, /\*\*本地草稿（内置知识库）\*\*/, 'draft should clearly label itself as local built-in draft');
assert.doesNotMatch(draft, /远程模型仍在整理|完整回答返回后/, 'draft should avoid low-density waiting copy');
assert.match(draft, /状态：页面：农场；体力：42\/80；金钱：1200文/, 'draft should use only visible player state');
assert.match(draft, /任务卡点：主线任务缺野菜 2 个/, 'draft should surface visible task blockers');
assert.match(draft, /资源缺口：缺铜矿 3 个/, 'draft should surface visible shortages');
assert.doesNotMatch(draft, /apiKey|should-not-leak|server\/src|hidden\.js|后台规则|风控|隐藏掉率|process\.env/i, 'draft should filter sensitive markers');

const fallbackDraft = buildAiAssistantLocalDraft({
  question: '任务卡住了怎么办？',
  contextLabel: '任务',
  contextSnapshot: {},
});
assert.match(fallbackDraft, /先确认任务当前目标/, 'draft should still provide short local guidance without rich context');

const storeSource = fs.readFileSync(storeFile, 'utf8');
assert.match(storeSource, /import \{ buildAiAssistantLocalDraft \} from '@\/utils\/aiAssistantLocalDraft'/, 'store should import local draft builder');
assert.match(storeSource, /const AI_ASSISTANT_LOCAL_DRAFT_DELAY_MS = 900/, 'store should define a short local draft delay');
assert.match(storeSource, /let activeLocalDraftTimer: ReturnType<typeof setTimeout> \| null = null/, 'store should track local draft timer');
assert.match(storeSource, /const clearActiveLocalDraftTimer = \(\) => \{[\s\S]*clearTimeout\(activeLocalDraftTimer\)/, 'store should clear draft timer');
assert.match(storeSource, /const scheduleLocalDraft = /, 'store should schedule local drafts');
assert.match(storeSource, /const removeLocalDraftForPending = /, 'store should remove local draft messages when the final model answer wins');
assert.match(storeSource, /const shouldHideLocalDraftForResult = \(provider\?: string\) => provider === 'model'/, 'store should only hide local draft for successful remote model answers');
assert.match(storeSource, /activeAskRequestId\.value !== requestId[\s\S]*activeAskController !== abortController[\s\S]*abortController\.signal\.aborted/, 'draft timer should guard stale and aborted requests');
assert.match(storeSource, /messages\.value\.findIndex\(message => message\.id === pendingId && message\.pending\)/, 'draft should only insert while pending exists');
assert.match(storeSource, /message\.localDraft && message\.draftForPendingId === pendingId/, 'draft should avoid duplicate insertion per pending message');
assert.match(storeSource, /localDraft: true/, 'draft message should be marked as local draft');
assert.match(storeSource, /draftForPendingId: pendingId/, 'draft message should link to its pending message');
assert.match(storeSource, /provider: 'local'/, 'draft message should be identified as local provider');
assert.match(storeSource, /mode: publicConfig\.value\.mode/, 'draft message should keep current public mode');
assert.match(storeSource, /scheduleLocalDraft\(\{[\s\S]*requestId,[\s\S]*pendingId,[\s\S]*question: trimmed,[\s\S]*abortController,[\s\S]*\}\)/, 'askQuestion should schedule draft after pending message');
assert.match(storeSource, /shouldHideLocalDraftForResult\(event\.provider\)[\s\S]*removeLocalDraftForPending\(pendingId\)/, 'stream evidence should remove local draft after a model answer succeeds');
assert.match(storeSource, /shouldHideLocalDraftForResult\(result\.provider\)[\s\S]*removeLocalDraftForPending\(pendingId\)/, 'final ask result should remove local draft after a model answer succeeds');
assert.match(storeSource, /clearActiveLocalDraftTimer\(\)[\s\S]*const pendingId = activeAskPendingId/, 'cancel should clear draft timer before abort bookkeeping');
assert.match(storeSource, /finally \{[\s\S]*clearActiveLocalDraftTimer\(\)/, 'finally should clear fast-response draft timer');

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /'ai-msg__bubble--draft': message\.localDraft/, 'widget should style local draft bubbles');
assert.match(widgetSource, /data-testid="ai-local-draft-marker"/, 'widget should expose local draft marker');
assert.match(widgetSource, />本地草稿<\/span>/, 'widget should label draft messages visibly');
assert.match(widgetSource, /\.ai-msg__bubble--draft/, 'widget should include local draft bubble style');
assert.match(widgetSource, /\.ai-meta-pill--draft/, 'widget should include local draft meta style');

const typesSource = fs.readFileSync(typesFile, 'utf8');
assert.match(typesSource, /localDraft\?: boolean/, 'message type should include localDraft marker');
assert.match(typesSource, /draftForPendingId\?: string/, 'message type should link draft to pending message');

const serverSource = fs.readFileSync(serverAssistantFile, 'utf8');
const serverAnswerComposerSource = fs.readFileSync(serverAnswerComposerFile, 'utf8');
assert.match(serverAnswerComposerSource, /REMOTE_MODEL_FALLBACK_NOTICE = '远程模型暂不可用，本次使用内置知识库回答。'/, 'server should define transparent remote fallback notice');
assert.match(serverSource, /appendRemoteModelFallbackNotice\(composeLocal\(\), '模型熔断保护'\)/, 'circuit-open fallback should include transparent notice');
assert.match(serverSource, /appendRemoteModelFallbackNotice\(composeLocal\(\), '模型响应失败或超时'\)/, 'remote failure fallback should include transparent notice');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
assert.equal(
  packageJson.scripts['qa:ai-assistant-local-draft'],
  'node scripts/qa-ai-assistant-local-draft.mjs',
  'package script should register local draft QA',
);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-local-draft passed');
