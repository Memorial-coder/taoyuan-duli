import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(rootDir, 'src', 'utils', 'aiAssistantPendingStages.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const typesFile = path.join(rootDir, 'src', 'types', 'aiAssistant.ts');
const packageFile = path.join(rootDir, 'package.json');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-pending-stages-'));
const bundledFile = path.join(tmpDir, 'aiAssistantPendingStages.mjs');

await build({
  entryPoints: [sourceFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const {
  AI_ASSISTANT_PENDING_STAGE_SEQUENCE,
  getAiAssistantPendingStage,
} = await import(pathToFileURL(bundledFile).href);

assert.equal(AI_ASSISTANT_PENDING_STAGE_SEQUENCE.length, 7, 'remote pending sequence should include business stages');
assert.deepEqual(
  AI_ASSISTANT_PENDING_STAGE_SEQUENCE.slice(0, 5).map(stage => stage.id),
  ['understanding', 'reading_context', 'matching_knowledge', 'retrieving', 'organizing'],
  'first five stages should cover understanding, context, knowledge, retrieval and suggestion organization',
);
assert.equal(getAiAssistantPendingStage(0, { providerConfigured: true }).label, '正在理解问题');
assert.equal(getAiAssistantPendingStage(1500, { providerConfigured: true }).label, '正在读取当前页面和任务状态');
assert.equal(getAiAssistantPendingStage(2600, { providerConfigured: true }).label, '正在匹配知识库');
assert.equal(getAiAssistantPendingStage(3200, { providerConfigured: true }).label, '正在检索相关资料');
assert.equal(getAiAssistantPendingStage(5400, { providerConfigured: true }).label, '正在整理建议');
assert.equal(getAiAssistantPendingStage(8200, { providerConfigured: true }).label, '远程模型响应较慢');
assert.match(
  getAiAssistantPendingStage(12100, { providerConfigured: true }).detail,
  /fallback/,
  'remote timeout threshold should prepare fallback messaging',
);
assert.equal(
  getAiAssistantPendingStage(8200, { providerConfigured: false }).id,
  'local_slow',
  'local-only mode should not claim remote model slowness',
);
assert.equal(
  getAiAssistantPendingStage(12100, { providerConfigured: false }).id,
  'local_fallback',
  'local-only mode should continue local answer messaging after long waits',
);

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
assert.match(widgetSource, /data-testid="ai-pending-stage"/, 'widget should render pending stage block');
assert.match(widgetSource, /data-stage-id="getPendingStage\(message\)\.id"/, 'widget should expose pending stage id');
assert.match(widgetSource, /pendingStageNow/, 'widget should keep a ticking pending clock');
assert.match(widgetSource, /setInterval\(\(\) => \{[\s\S]*pendingStageNow\.value = Date\.now\(\)/, 'widget should refresh pending stage over time');
assert.match(widgetSource, /onUnmounted\(\(\) => \{[\s\S]*clearInterval\(pendingStageTimer\)/, 'widget should clear pending timer');
assert.match(widgetSource, /providerConfigured: store\.publicConfig\.providerConfigured/, 'widget should distinguish model and local-only waits');

const storeSource = fs.readFileSync(storeFile, 'utf8');
assert.match(storeSource, /const pendingStartedAt = Date\.now\(\)/, 'store should capture pending start time');
assert.match(storeSource, /pendingStartedAt,/, 'store should attach pending start time to pending message');

const typesSource = fs.readFileSync(typesFile, 'utf8');
assert.match(typesSource, /pendingStartedAt\?: number/, 'message type should include pendingStartedAt');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
assert.equal(
  packageJson.scripts['qa:ai-assistant-pending-stages'],
  'node scripts/qa-ai-assistant-pending-stages.mjs',
  'package script should register pending stage QA',
);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('qa-ai-assistant-pending-stages passed');
