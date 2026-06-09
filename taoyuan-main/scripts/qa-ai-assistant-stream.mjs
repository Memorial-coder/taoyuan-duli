import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const apiFile = path.join(rootDir, 'src', 'utils', 'taoyuanAiApi.ts');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const typesFile = path.join(rootDir, 'src', 'types', 'aiAssistant.ts');
const packageFile = path.join(rootDir, 'package.json');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-stream-'));
const bundledFile = path.join(tmpDir, 'taoyuanAiApi.mjs');

await build({
  entryPoints: [apiFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const ssePayload = [
  'event: phase',
  'data: {"phase":"understanding","label":"正在理解问题","detail":"识别意图"}',
  '',
  'event: delta',
  'data: {"delta":"结论："}',
  '',
  'event: delta',
  'data: {"delta":"先打开任务页。"}',
  '',
  'event: evidence',
  'data: {"provider":"local","mode":"strict","sources":["内置知识库"],"evidence":[{"id":"E1","title":"任务资料","sourceType":"built-in","sourceTypeLabel":"内置知识库","moduleType":"","moduleLabel":"内置知识库","routeHints":["任务"],"truncated":false}],"suggestions":[{"id":"s1","level":"now","levelLabel":"马上做","title":"打开任务页","reason":"确认缺口","benefit":"减少来回切换","signals":["task-progress"],"signalLabels":["任务进度"],"routeName":"quest","routeLabel":"任务","action":{"type":"open_quest","label":"打开任务页","target":"quest","value":"","items":[]}}],"traceSummary":{"provider":"local","providerLabel":"内置知识库","mode":"strict","modeLabel":"严格模式","answerSourceLabel":"内置知识库","fallback":false,"guarded":false,"uncertain":false,"uncertainPoints":[],"evidenceCount":1,"sourceTypes":["内置知识库"]}}',
  '',
  'event: done',
  'data: {"done":true,"answer":"结论：先打开任务页。","provider":"local","mode":"strict","sources":["内置知识库"],"evidence":[{"id":"E1","title":"任务资料","sourceType":"built-in","sourceTypeLabel":"内置知识库","moduleType":"","moduleLabel":"内置知识库","routeHints":["任务"],"truncated":false}],"suggestions":[{"id":"s1","level":"now","levelLabel":"马上做","title":"打开任务页","reason":"确认缺口","benefit":"减少来回切换","signals":["task-progress"],"signalLabels":["任务进度"],"routeName":"quest","routeLabel":"任务","action":{"type":"open_quest","label":"打开任务页","target":"quest","value":"","items":[]}}],"traceSummary":{"provider":"local","providerLabel":"内置知识库","mode":"strict","modeLabel":"严格模式","answerSourceLabel":"内置知识库","fallback":false,"guarded":false,"uncertain":false,"uncertainPoints":[],"evidenceCount":1,"sourceTypes":["内置知识库"]}}',
  '',
].join('\n');

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  assert.equal(url, '/api/taoyuan/ai/ask-stream', 'stream ask should call the stream endpoint');
  assert.equal(init.method, 'POST', 'stream ask should use POST');
  assert.equal(init.credentials, 'include', 'stream ask should include credentials');
  assert.ok(init.signal, 'stream ask should pass AbortSignal');
  const body = JSON.parse(String(init.body || '{}'));
  assert.equal(body.question, '任务卡住了怎么办？', 'stream ask should send question');
  assert.equal(body.route_name, 'quest', 'stream ask should send route');
  return new Response(ssePayload, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  });
};

const { askAiAssistantStream } = await import(pathToFileURL(bundledFile).href);
const events = [];
const result = await askAiAssistantStream(
  {
    question: '任务卡住了怎么办？',
    routeName: 'quest',
    contextLabel: '任务',
    signal: new AbortController().signal,
  },
  {
    onEvent: event => events.push(event),
  },
);
globalThis.fetch = originalFetch;

assert.deepEqual(events.map(event => event.event), ['phase', 'delta', 'delta', 'evidence', 'done'], 'stream parser should emit ordered events');
assert.equal(events.filter(event => event.event === 'delta').map(event => event.delta).join(''), '结论：先打开任务页。', 'delta events should incrementally reconstruct answer');
assert.equal(result.answer, '结论：先打开任务页。', 'stream done should return full answer');
assert.equal(result.provider, 'local', 'stream done should preserve provider');
assert.equal(result.mode, 'strict', 'stream done should preserve mode');
assert.equal(result.evidence.length, 1, 'stream done should preserve evidence');
assert.equal(result.suggestions.length, 1, 'stream done should preserve suggestions');

const apiSource = fs.readFileSync(apiFile, 'utf8');
assert.match(apiSource, /export const askAiAssistantStream/, 'API should export askAiAssistantStream');
assert.match(apiSource, /fetch\('\/api\/taoyuan\/ai\/ask-stream'/, 'API should call stream endpoint');
assert.match(apiSource, /parseAiAssistantSseBlock/, 'API should parse SSE blocks');
assert.match(apiSource, /event === 'delta'/, 'API should support delta events');
assert.match(apiSource, /event === 'evidence'/, 'API should support evidence events');
assert.match(apiSource, /event === 'done'/, 'API should support done events');
assert.match(apiSource, /event === 'error'/, 'API should support error events');

const storeSource = fs.readFileSync(storeFile, 'utf8');
assert.match(storeSource, /askAiAssistantStream/, 'store should use stream ask for public questions');
assert.match(storeSource, /const applyAskStreamEvent = /, 'store should apply stream events');
assert.match(storeSource, /event\.event === 'delta'[\s\S]*content: `\$\{message\.content \|\| ''\}\$\{delta\}`/, 'store should append delta text');
assert.match(storeSource, /event\.event === 'evidence'[\s\S]*traceSummary: event\.traceSummary/, 'store should preserve stream evidence metadata');
assert.match(storeSource, /pending: false,[\s\S]*streaming: true/, 'store should render partial text while streaming');
assert.match(storeSource, /streaming: false/, 'store should clear streaming when done or failed');

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /data-testid="ai-streaming-indicator"/, 'widget should render streaming indicator');
assert.match(widgetSource, /data-testid="ai-cancel-streaming"/, 'widget should allow cancelling streaming response');
assert.match(widgetSource, /message\.streaming/, 'widget should read streaming state');
assert.match(widgetSource, /message\.streaming \|\| message\.error/, 'metadata should wait until streaming finishes');
assert.match(widgetSource, /\.ai-msg__streaming/, 'widget should style streaming indicator');

const typesSource = fs.readFileSync(typesFile, 'utf8');
assert.match(typesSource, /export interface AiAssistantStreamEvent/, 'types should define stream event contract');
assert.match(typesSource, /streaming\?: boolean/, 'message type should include streaming marker');
assert.match(typesSource, /streamPhaseLabel\?: string/, 'message type should include stream phase label');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
assert.equal(
  packageJson.scripts['qa:ai-assistant-stream'],
  'node scripts/qa-ai-assistant-stream.mjs',
  'frontend package should register stream QA',
);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-stream passed');
