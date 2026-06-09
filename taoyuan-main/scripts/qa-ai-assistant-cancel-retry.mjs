import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const apiFile = path.join(rootDir, 'src', 'utils', 'taoyuanAiApi.ts');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const typesFile = path.join(rootDir, 'src', 'types', 'aiAssistant.ts');
const packageFile = path.join(rootDir, 'package.json');

const apiSource = fs.readFileSync(apiFile, 'utf8');
const storeSource = fs.readFileSync(storeFile, 'utf8');
const widgetSource = fs.readFileSync(widgetFile, 'utf8');
const typesSource = fs.readFileSync(typesFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

assert.match(apiSource, /signal\?: AbortSignal/, 'ask payloads should accept AbortSignal');
assert.match(apiSource, /export const isAiAssistantAbortError/, 'API should expose abort error classifier');
assert.match(apiSource, /signal: payload\.signal/, 'fetch calls should receive payload.signal');
assert.match(apiSource, /isAiAssistantAbortError\(error\)[\s\S]*throw error/, 'public ask should preserve AbortError instead of rewriting it');

assert.match(storeSource, /let activeAskController: AbortController \| null = null/, 'store should keep active AbortController');
assert.match(storeSource, /const cancelActiveQuestion = /, 'store should expose cancelActiveQuestion');
assert.match(storeSource, /controller\.abort\(\)/, 'cancelActiveQuestion should abort the active request');
assert.match(storeSource, /cancelActiveQuestion\(\{ keepMessage: true \}\)[\s\S]*isOpen\.value = false/, 'closePanel should cancel pending request');
assert.match(storeSource, /cancelActiveQuestion\(\{ keepMessage: false \}\)[\s\S]*messages\.value = \[\]/, 'resetConversation should cancel and clear pending request');
assert.match(storeSource, /const abortController = new AbortController\(\)/, 'askQuestion should create a controller per request');
assert.match(storeSource, /signal: abortController\.signal/, 'askQuestion should pass AbortSignal to API');
assert.match(storeSource, /activeAskRequestId\.value !== requestId \|\| abortController\.signal\.aborted/, 'store should ignore stale or aborted successful responses');
assert.match(storeSource, /isAiAssistantAbortError\(error\) \|\| abortController\.signal\.aborted/, 'store should ignore aborted errors');
assert.match(storeSource, /retryQuestion: trimmed/, 'failed answer should retain retry question');
assert.match(storeSource, /retryQuestion,/, 'cancelled answer should retain retry question');
assert.match(storeSource, /cancelled: true/, 'cancelled message should be marked explicitly');
assert.match(storeSource, /cancelActiveQuestion,/, 'store should return cancelActiveQuestion');

assert.match(widgetSource, /data-testid="ai-cancel-generation"/, 'widget should render cancel generation button');
assert.match(widgetSource, /store\.cancelActiveQuestion\(\)/, 'cancel button should call store.cancelActiveQuestion');
assert.match(widgetSource, /data-testid="ai-retry-question"/, 'widget should render retry button for failed messages');
assert.match(widgetSource, /retryAssistantMessage/, 'widget should wire retry handler');
assert.match(widgetSource, /message\.retryQuestion/, 'retry button should depend on retained retry question');
assert.match(widgetSource, /:disabled="store\.isAsking"/, 'retry button should be disabled while another answer is pending');

assert.match(typesSource, /retryQuestion\?: string/, 'message type should include retryQuestion');
assert.match(typesSource, /cancelled\?: boolean/, 'message type should include cancelled marker');

assert.equal(
  packageJson.scripts['qa:ai-assistant-cancel-retry'],
  'node scripts/qa-ai-assistant-cancel-retry.mjs',
  'package script should register cancel/retry QA',
);

console.log('qa-ai-assistant-cancel-retry passed');
