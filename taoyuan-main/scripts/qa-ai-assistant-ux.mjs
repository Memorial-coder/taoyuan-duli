/* global console */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const packageFile = path.join(rootDir, 'package.json');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const quickQuestionsFile = path.join(rootDir, 'src', 'utils', 'aiAssistantQuickQuestions.ts');
const actionsFile = path.join(rootDir, 'src', 'utils', 'aiAssistantActions.ts');
const pendingStagesFile = path.join(rootDir, 'src', 'utils', 'aiAssistantPendingStages.ts');
const safeMarkdownFile = path.join(rootDir, 'src', 'utils', 'safeMarkdown.ts');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const widgetSource = fs.readFileSync(widgetFile, 'utf8');
const quickQuestionsSource = fs.readFileSync(quickQuestionsFile, 'utf8');
const actionsSource = fs.readFileSync(actionsFile, 'utf8');
const pendingStagesSource = fs.readFileSync(pendingStagesFile, 'utf8');
const safeMarkdownSource = fs.readFileSync(safeMarkdownFile, 'utf8');

function assertScript(name) {
  assert.equal(
    packageJson.scripts?.[name],
    `node scripts/${name.replace(/^qa:/, 'qa-')}.mjs`,
    `package.json should register ${name}`,
  );
}

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = widgetSource.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  assert.ok(match?.[1], `missing CSS block for ${selector}`);
  return match[1];
}

function lastCssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = Array.from(widgetSource.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'g')));
  const match = matches.at(-1);
  assert.ok(match?.[1], `missing CSS block for ${selector}`);
  return match[1];
}

function assertContains(source, pattern, label) {
  assert.match(source, pattern, label);
}

assertScript('qa:ai-assistant-ux');
for (const scriptName of [
  'qa:ai-assistant-mobile-accessibility',
  'qa:ai-assistant-dynamic-quick-questions',
  'qa:ai-assistant-answer-blocks',
  'qa:ai-assistant-markdown-safety',
  'qa:ai-assistant-cancel-retry',
  'qa:ai-assistant-safe-actions',
  'qa:ai-assistant-stream',
]) {
  assertScript(scriptName);
}

assertContains(widgetSource, /id="ai-assistant-panel"/, 'assistant panel should expose a stable id');
assertContains(widgetSource, /role="dialog"/, 'assistant panel should use dialog semantics');
assertContains(widgetSource, /data-testid="ai-assistant-input"/, 'input area should expose a stable test id');
assertContains(widgetSource, /aria-label="向桃源小助理提问"/, 'textarea should keep an accessible label');
assertContains(widgetSource, /aria-label="发送问题给桃源小助理"/, 'send button should keep an accessible label');
assertContains(widgetSource, /@keydown\.esc\.stop\.prevent="handlePanelEscape"/, 'panel should support Escape close');

const panelWrapCss = cssBlock('.ai-panel-wrap');
assertContains(panelWrapCss, /position:\s*fixed/, 'assistant panel wrapper should be fixed');
assertContains(panelWrapCss, /env\(safe-area-inset-bottom/, 'panel wrapper should respect bottom safe area');

const panelCss = cssBlock('.ai-panel');
assertContains(panelCss, /display:\s*flex/, 'assistant panel should use a flex column layout');
assertContains(panelCss, /flex-direction:\s*column/, 'assistant panel should stack header, messages, quick questions, and input');
assertContains(panelCss, /max-height:\s*min\(78dvh,\s*760px\)/, 'desktop panel should use dynamic viewport height');
assertContains(panelCss, /overflow-y:\s*auto/, 'panel should scroll vertically instead of covering input');
assertContains(panelCss, /overscroll-behavior:\s*contain/, 'panel scroll should be contained');

const messagesCss = cssBlock('.ai-panel__messages');
assertContains(messagesCss, /min-height:\s*0/, 'message viewport should be shrinkable in flex layout');
assertContains(messagesCss, /flex:\s*1 1 auto/, 'message viewport should take remaining panel space');
assertContains(messagesCss, /overflow-y:\s*auto/, 'message viewport should scroll independently');

const inputCss = cssBlock('.ai-panel__input');
assertContains(inputCss, /env\(safe-area-inset-bottom/, 'input area should reserve bottom safe area');
assertContains(inputCss, /scroll-margin-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom/, 'input area should have scroll margin for soft keyboard');

const textareaCss = cssBlock('.ai-textarea');
assertContains(textareaCss, /max-height:\s*28dvh/, 'textarea height should be capped on small screens');

assertContains(widgetSource, /@media \(max-width:\s*768px\)[\s\S]*\.ai-panel\s*\{[\s\S]*max-height:\s*min\(100%,\s*calc\(100dvh - 76px - env\(safe-area-inset-bottom/, 'mobile panel should stay inside dynamic viewport');
assertContains(widgetSource, /@media \(max-width:\s*768px\)[\s\S]*\.ai-panel-wrap\s*\{[\s\S]*right:\s*calc\(var\(--ai-assistant-mobile-edge,\s*8px\) \+ var\(--ai-assistant-mobile-control-rail,\s*64px\)\)/, 'mobile panel should leave the map/fullscreen control rail uncovered');
assertContains(widgetSource, /@media \(max-width:\s*768px\)[\s\S]*\.ai-panel__messages\s*\{[\s\S]*min-height:\s*120px/, 'mobile message viewport should keep enough readable space');
assertContains(widgetSource, /@media \(max-width:\s*768px\)[\s\S]*\.ai-panel__send\s*\{[\s\S]*min-height:\s*var\(--ai-assistant-touch-target/, 'mobile send button should keep touch target height');

assertContains(widgetSource, /data-testid="ai-quick-question-list"/, 'quick question list should expose a stable test id');
assertContains(widgetSource, /data-testid="ai-quick-question"/, 'quick question buttons should expose a stable test id');
assertContains(widgetSource, /buildDynamicAiQuickQuestions/, 'widget should use dynamic quick questions');

const quickCss = cssBlock('.ai-panel__quick');
assertContains(quickCss, /max-height:\s*56px/, 'quick questions should have capped height');
assertContains(quickCss, /overflow-x:\s*auto/, 'quick questions should remain horizontally scrollable');
assertContains(quickCss, /overflow-y:\s*hidden/, 'quick questions should not create vertical scrollbars');
assertContains(quickCss, /scrollbar-width:\s*none/, 'quick question scrollbar should be hidden in Firefox');
assertContains(quickCss, /-ms-overflow-style:\s*none/, 'quick question scrollbar should be hidden in legacy Edge');
assertContains(widgetSource, /\.ai-panel__quick::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/, 'quick question scrollbar should be hidden in WebKit');

const quickButtonCss = lastCssBlock('.ai-quick-btn');
assertContains(quickButtonCss, /flex:\s*0 0 auto/, 'quick buttons should not shrink into unreadable pills');
assertContains(quickButtonCss, /max-width:\s*min\(78vw,\s*260px\)/, 'quick buttons should fit mobile width');

const quickTextCss = cssBlock('.ai-quick-btn__text');
assertContains(quickTextCss, /-webkit-line-clamp:\s*2/, 'quick question labels should clamp to two lines');
assertContains(quickQuestionsSource, /export const AI_DYNAMIC_QUICK_QUESTION_MAX = 3/, 'quick question helper should cap visible questions');
assertContains(quickQuestionsSource, /Object\.entries\(AI_ASSISTANT_ROUTE_LABELS\)/, 'route quick question config should cover every route label');

assertContains(widgetSource, /data-testid="ai-answer-source-summary"/, 'answer metadata should expose a stable source summary test id');
assertContains(widgetSource, /data-testid="ai-answer-evidence-details"/, 'evidence details should expose a stable test id');
assertContains(widgetSource, /<details v-if="hasEvidenceDetails\(message\)" class="ai-msg__evidence"/, 'evidence should stay folded behind details');
assertContains(widgetSource, /<summary>[\s\S]*getEvidenceCountLabel\(message\)/, 'evidence summary should show compact count information');
assertContains(widgetSource, /data-testid="ai-answer-debug-trace"/, 'debug trace should expose a stable admin-only test id');
assertContains(widgetSource, /store\.isAdmin && message\.trace/, 'full trace should remain admin-only');
assert.doesNotMatch(widgetSource, /item\.path/, 'player-facing evidence should not render raw source paths');

assertContains(widgetSource, /data-testid="ai-cancel-generation"/, 'pending answer should expose cancel generation control');
assertContains(widgetSource, /data-testid="ai-cancel-streaming"/, 'streaming answer should expose cancel streaming control');
assertContains(widgetSource, /store\.cancelActiveQuestion\(\)/, 'cancel buttons should call the shared cancel path');
assertContains(widgetSource, /data-testid="ai-retry-question"/, 'failed answer should expose retry control');
assertContains(widgetSource, /retryAssistantMessage/, 'retry button should call retry handler');
assertContains(widgetSource, /data-testid="ai-copy-answer-block"/, 'answer blocks should expose copy controls');
assertContains(widgetSource, /copyAnswerBlock/, 'answer block copy handler should exist');
assertContains(widgetSource, /data-ai-action-type="suggestion\.action\.type"/, 'safe action buttons should expose stable action type metadata');
assertContains(actionsSource, /copy_checklist/, 'safe actions should include copy checklist');
assertContains(actionsSource, /buildAiAssistantCopyText/, 'safe actions should build copyable checklist text');

assertContains(pendingStagesSource, /minMs/, 'pending stages should use elapsed thresholds');
assertContains(safeMarkdownSource, /data-ai-copy-code/, 'safe markdown code blocks should expose copy controls');
assertContains(safeMarkdownSource, /javascript:/i, 'safe markdown should keep javascript URL protection');

console.log('qa-ai-assistant-ux passed');
