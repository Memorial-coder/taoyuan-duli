import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildNounLexiconFingerprint,
  buildNounLexiconStatus,
  buildSourceFilesFingerprint,
  buildSourceIndexEntryFromContent,
  buildSourceIndexFingerprint,
  buildSourceIndexStatus,
  buildSourceIndexStoreFromFiles,
  buildSourceContextCandidate,
  buildSourceContextCandidatesFromFiles,
  collectSourceFiles,
  collectSourceSearchHits,
  collectSemanticBlocksForText,
  collectImportNames,
  createSourceIndexCachePayload,
  createNounLexiconCachePayload,
  createNounLexiconLookup,
  createSourceDirectorySummaryEntry,
  createSemanticBlock,
  createSourceSymbolEntry,
  createSourceSymbolEntriesForText,
  detectSourceDirectoryModuleType,
  detectSourceModuleType,
  extractConfigSignals,
  extractDefinitionName,
  extractInterestingLines,
  extractKeyFunctions,
  extractSourceSnippet,
  findLineNumberByPattern,
  hasSupportedSourceExtension,
  isDirectoryLikeTarget,
  loadNounLexiconStoreFromFile,
  loadSourceIndexStoreFromFile,
  matchesExplicitPath,
  moduleHintMatches,
  normalizeNounLexiconStore,
  normalizeSourceIndexStore,
  normalizePathTarget,
  rankSourceDirectoryEntries,
  rankSourceIndexEntries,
  rankSourceSymbolEntries,
  rebuildNounLexiconEntries,
  rebuildSourceIndexEntries,
  resolveExplicitDirectoryTarget,
  resolveSourceSearchQueryPlan,
  resolveSourceIndexEntries,
  resolveNounLexiconEntries,
  resolveWhitelistRelativeFilePath,
  scoreExplicitPathMatch,
  scoreModuleTypePreference,
  scorePathPreference,
  scoreSourceDirectoryEntry,
  scoreSourceFile,
  scoreSourceIndexEntry,
  scoreSourceSymbolEntry,
  serializeNounLexiconStore,
  serializeSourceIndexStore,
  saveNounLexiconStoreToFile,
  saveSourceIndexStoreToFile,
  searchSourceContext,
  searchSourceDirectories,
  searchSourceIndex,
  searchSourceSymbols,
  splitSemanticContentBlock,
  summarizeSourceSnippet,
  sanitizeStringArray,
  splitIdentifierTerms,
} = require('../src/taoyuanAi/sourceIndexService');

assert.equal(normalizePathTarget('.\\taoyuan-main\\src//views/game/FarmView.vue/'), 'taoyuan-main/src/views/game/farmview.vue');
assert.equal(normalizePathTarget(''), '');

assert.equal(hasSupportedSourceExtension('FarmView.vue'), true);
assert.equal(hasSupportedSourceExtension('server/src/index.js'), true);
assert.equal(hasSupportedSourceExtension('package-lock.json'), true);
assert.equal(hasSupportedSourceExtension('image.png'), false);

const sourceScanTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-source-scan-'));
const sourceScanRoot = path.join(sourceScanTmpDir, 'src');
const sourceScanReadme = path.join(sourceScanTmpDir, 'README.md');
fs.mkdirSync(path.join(sourceScanRoot, 'nested'), { recursive: true });
fs.mkdirSync(path.join(sourceScanRoot, 'node_modules'), { recursive: true });
fs.writeFileSync(path.join(sourceScanRoot, 'Farm.ts'), 'export const farmRoute = "farm";', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, 'nested', 'View.vue'), '<template>农场</template>', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, 'node_modules', 'skip.js'), 'export const skipped = true;', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, 'package-lock.json'), '{}', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, '.env.local'), 'SHOULD_NOT_SCAN=1', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, 'image.png'), 'not-source', 'utf8');
fs.writeFileSync(path.join(sourceScanRoot, 'too-large.ts'), 'x'.repeat(120), 'utf8');
fs.writeFileSync(sourceScanReadme, '# 桃源指南', 'utf8');
const sourceScanFiles = collectSourceFiles([
  { key: 'src', abs: sourceScanRoot },
  { key: 'README.md', abs: sourceScanReadme },
], {
  allowedExtensions: new Set(['.js', '.ts', '.vue', '.json', '.md', '.html']),
  maxFileSize: 80,
  blockedPathPattern: /(^|[\\/])(node_modules|dist|build|coverage|\.git)([\\/]|$)|(^|[\\/])\.env(\.|$)|package-lock\.json$/i,
});
const sourceScanRelative = sourceScanFiles
  .map(filePath => path.relative(sourceScanTmpDir, filePath).replace(/\\/g, '/'))
  .sort();
assert.deepEqual(sourceScanRelative, ['README.md', 'src/Farm.ts', 'src/nested/View.vue']);
const toSourceScanRelative = filePath => path.relative(sourceScanTmpDir, filePath).replace(/\\/g, '/');
const sourceFilesFingerprint = buildSourceFilesFingerprint(sourceScanFiles, {
  seeds: ['scan-v1'],
  toRelativePath: toSourceScanRelative,
});
assert.match(sourceFilesFingerprint, /^[0-9a-f]{40}$/);
assert.equal(
  buildSourceFilesFingerprint([...sourceScanFiles, path.join(sourceScanTmpDir, 'missing.ts')], {
    seeds: ['scan-v1'],
    toRelativePath: toSourceScanRelative,
  }),
  sourceFilesFingerprint,
  'missing files should be skipped in source fingerprint',
);
assert.notEqual(
  buildSourceFilesFingerprint(sourceScanFiles, {
    seeds: ['scan-v2'],
    toRelativePath: toSourceScanRelative,
  }),
  sourceFilesFingerprint,
  'source fingerprint should include caller seeds',
);
const nounLexiconFingerprint = buildNounLexiconFingerprint(sourceScanFiles, {
  version: 5,
  searchRulesFingerprint: 'rules-a',
  routeLabels: { farm: '农场' },
  toRelativePath: toSourceScanRelative,
});
assert.match(nounLexiconFingerprint, /^[0-9a-f]{40}$/);
assert.notEqual(
  buildNounLexiconFingerprint(sourceScanFiles, {
    version: 5,
    searchRulesFingerprint: 'rules-a',
    routeLabels: { farm: '田地' },
    toRelativePath: toSourceScanRelative,
  }),
  nounLexiconFingerprint,
  'noun lexicon fingerprint should include route labels',
);
const sourceIndexFingerprint = buildSourceIndexFingerprint(sourceScanFiles, {
  version: 11,
  searchRulesFingerprint: 'rules-a',
  nounLexiconFingerprint,
  toRelativePath: toSourceScanRelative,
});
assert.match(sourceIndexFingerprint, /^[0-9a-f]{40}$/);
assert.notEqual(
  buildSourceIndexFingerprint(sourceScanFiles, {
    version: 11,
    searchRulesFingerprint: 'rules-a',
    nounLexiconFingerprint: 'noun-fp-b',
    toRelativePath: toSourceScanRelative,
  }),
  sourceIndexFingerprint,
  'source index fingerprint should include noun lexicon fingerprint',
);
fs.rmSync(sourceScanTmpDir, { recursive: true, force: true });

assert.equal(scoreExplicitPathMatch('taoyuan-main/src/views/game/FarmView.vue', 'taoyuan-main/src/views/game/FarmView.vue'), 240);
assert.equal(scoreExplicitPathMatch('taoyuan-main/src/views/game/FarmView.vue', 'taoyuan-main/src/views'), 190);
assert.equal(scoreExplicitPathMatch('taoyuan-main/src/views/game/FarmView.vue', 'views/game'), 130);
assert.equal(scoreExplicitPathMatch('FarmView.vue', 'FarmView'), 130);
assert.equal(matchesExplicitPath('FarmView.vue', 'FarmView'), true);
assert.equal(matchesExplicitPath('FarmView.vue', 'InventoryView'), false);

assert.equal(moduleHintMatches('data', 'runtime-data'), true);
assert.equal(moduleHintMatches('data', 'default-data'), true);
assert.equal(moduleHintMatches('view', 'view'), true);
assert.equal(moduleHintMatches('view', 'component'), false);

assert.equal(detectSourceModuleType('taoyuan-main/src/views/game/FarmView.vue'), 'view');
assert.equal(detectSourceModuleType('taoyuan-main/src/stores/useAiAssistantStore.ts'), 'store');
assert.equal(detectSourceModuleType('taoyuan-main/src/data/items.ts'), 'data');
assert.equal(detectSourceModuleType('taoyuan-main/src/router/index.ts'), 'router');
assert.equal(detectSourceModuleType('taoyuan-main/electron/main.js'), 'electron');
assert.equal(detectSourceModuleType('taoyuan-main/docs/guide.md'), 'docs');
assert.equal(detectSourceModuleType('README.md'), 'docs');
assert.equal(detectSourceModuleType('data-defaults/taoyuan_ai_structured_knowledge.json'), 'default-data');
assert.equal(detectSourceModuleType('data/runtime.json'), 'runtime-data');
assert.equal(detectSourceModuleType('taoyuan-main/src/utils/safeMarkdown.ts'), 'utils');
assert.equal(detectSourceModuleType('taoyuan-main/src/components/game/AiAssistantWidget.vue'), 'component');
assert.equal(detectSourceModuleType('server/src/routes/api.js'), 'routes');
assert.equal(detectSourceModuleType('server/src/taoyuanAiAssistant.js'), 'module');
assert.equal(detectSourceDirectoryModuleType('data-defaults'), 'default-data');
assert.equal(detectSourceDirectoryModuleType('data/checkins'), 'runtime-data');
assert.equal(detectSourceDirectoryModuleType('taoyuan-main/electron'), 'electron');
assert.equal(detectSourceDirectoryModuleType('server/src/routes'), 'routes');
assert.equal(detectSourceDirectoryModuleType('taoyuan-main/src/views'), 'directory');

assert.deepEqual(splitIdentifierTerms('useFarmStore.vue'), ['use', 'Farm', 'Store', 'vue']);
assert.deepEqual(collectImportNames('harvestCopperOre as harvestAlias, shopPrice'), ['harvestCopperOre', 'shopPrice']);

assert.equal(createSourceSymbolEntry({ relativePath: 'FarmView.vue', name: '' }), null);
const directSymbolEntry = createSourceSymbolEntry({
  relativePath: 'taoyuan-main/src/stores/useFarmStore.ts',
  moduleType: 'store',
  routeHints: ['farm'],
  name: 'useFarmStore',
  kind: 'store',
  lineNumber: 7,
  content: 'export const useFarmStore = defineStore("farm", () => ({}))',
  importSource: 'farm',
  exported: true,
});
assert.equal(directSymbolEntry.id, 'symbol:taoyuan-main/src/stores/useFarmStore.ts:store:useFarmStore:7');
assert.equal(directSymbolEntry.kindLabel, '状态仓库');
assert.equal(directSymbolEntry.moduleLabel, '前端状态');
assert.equal(directSymbolEntry.exported, true);
assert.equal(directSymbolEntry.routeHints[0], 'farm');
assert.equal(directSymbolEntry.keywords.includes('useFarmStore'), true);
assert.equal(directSymbolEntry.keywords.includes('Farm'), true);

const extractedSymbols = createSourceSymbolEntriesForText(
  'taoyuan-main/src/stores/useFarmStore.ts',
  [
    'import { harvestCopperOre as harvestAlias, shopPrice } from "./farmLogic";',
    'import defaultFarm from "./defaultFarm";',
    'import * as farmApi from "./api";',
    'export async function harvestCopperOre() { return true; }',
    'export const useFarmStore = defineStore("farmStore", () => ({}));',
    'export class FarmPanel {}',
    'export interface FarmState {}',
    'export type FarmMode = "plant";',
    'router.get("/api/farm", handleFarm);',
    'export * from "./farmShared";',
    'const secretProbe = "api_key_should_not_be_indexed";',
  ].join('\n'),
  {
    moduleType: 'store',
    routeHints: ['farm'],
    skipLinePattern: /(api[_ -]?key|secret)/i,
  }
);
assert.deepEqual(
  extractedSymbols.map(entry => entry.name),
  [
    'harvestCopperOre',
    'shopPrice',
    'defaultFarm',
    'farmApi',
    'harvestCopperOre',
    'useFarmStore',
    'useFarmStore',
    'farmStore',
    'FarmPanel',
    'FarmState',
    'FarmMode',
    'GET /api/farm',
    './farmShared',
  ]
);
assert.equal(extractedSymbols.every(entry => entry.path === 'taoyuan-main/src/stores/useFarmStore.ts'), true);
assert.equal(extractedSymbols.some(entry => entry.name === 'secretProbe'), false);
assert.equal(extractedSymbols.find(entry => entry.name === 'GET /api/farm').kind, 'route');

assert.deepEqual(sanitizeStringArray(['farm', '', null, 'farm', 'shop']), ['farm', 'shop']);
assert.deepEqual(
  extractInterestingLines([
    '  if (locked) return false;  ',
    'const fakeSecret = "api_key_should_not_be_indexed";',
    'throw new Error("missing")',
  ], /if\s*\(|throw\s+/, 3, { skipLinePattern: /(api[_ -]?key|secret)/i }),
  ['if (locked) return false;', 'throw new Error("missing")']
);
assert.equal(extractDefinitionName('export async function harvestCopperOre() {}'), 'harvestCopperOre');
assert.deepEqual(extractKeyFunctions(['export function harvestCopperOre() {}', 'const FARM_ROUTE = "farm";', 'class FarmPanel {}']), ['harvestCopperOre', 'FARM_ROUTE', 'FarmPanel']);
assert.deepEqual(
  extractConfigSignals(['const FARM_ROUTE = "farm";', 'cfg.get("farm")', 'routeNames: ["farm"]']),
  ['const FARM_ROUTE = "farm";', 'cfg.get("farm")', 'routeNames: ["farm"]', 'FARM_ROUTE']
);
assert.equal(summarizeSourceSnippet('function demo() {\n  return <FarmView />;\n}'), 'function demo()   return  FarmView / ;');

const builtIndexEntry = buildSourceIndexEntryFromContent(
  'D:/repo/taoyuan-main/src/views/game/FarmView.vue',
  [
    'export function renderFarm() {',
    '  if (locked) return false;',
    '  const FARM_ROUTE = "farm";',
    '  const fakeSecret = "api_key_should_not_be_indexed";',
    '  itemId: "copper_ore", price: 12, shop: true',
    '}',
  ].join('\n'),
  {
    title: '农场铜矿逻辑',
    startLine: 5,
    endLine: 10,
    keywords: ['铜矿'],
    routeHints: ['farm'],
    questionTypes: ['resource-source'],
    keyFunctions: ['manualKey'],
    semanticKind: 'function',
  },
  {
    toRelativePath: filePath => String(filePath).replace('D:/repo/', ''),
    skipLinePattern: /(api[_ -]?key|secret)/i,
    detectModuleType: detectSourceModuleType,
    inferRouteHints: () => ['farm'],
    extractQuestionTypes: () => ['precondition'],
    inferSynonyms: () => ['铜矿石'],
    extractChunkKeywords: () => ['FarmView', 'copper_ore', '农场'],
    sourceModuleLabels: { view: '前端页面', module: '源码模块' },
  }
);
assert.equal(builtIndexEntry.id, 'taoyuan-main/src/views/game/FarmView.vue:5:农场铜矿逻辑');
assert.equal(builtIndexEntry.path, 'taoyuan-main/src/views/game/FarmView.vue');
assert.equal(builtIndexEntry.title, '农场铜矿逻辑');
assert.equal(builtIndexEntry.moduleType, 'view');
assert.equal(builtIndexEntry.moduleLabel, '前端页面');
assert.equal(builtIndexEntry.startLine, 5);
assert.equal(builtIndexEntry.endLine, 10);
assert.equal(builtIndexEntry.semanticKind, 'function');
assert.equal(builtIndexEntry.content.includes('fakeSecret'), false);
assert.deepEqual(builtIndexEntry.routeHints, ['farm']);
assert.deepEqual(builtIndexEntry.questionTypes, ['precondition', 'resource-source']);
assert.deepEqual(builtIndexEntry.keyFunctions, ['renderFarm', 'FARM_ROUTE', 'manualKey']);
assert.equal(builtIndexEntry.conditionHints.includes('if (locked) return false;'), true);
assert.equal(builtIndexEntry.shopSignals.includes('itemId: "copper_ore", price: 12, shop: true'), true);
assert.equal(builtIndexEntry.configSignals.includes('FARM_ROUTE'), true);
assert.equal(builtIndexEntry.aliases.includes('铜矿石'), true);
assert.equal(builtIndexEntry.keywords.includes('铜矿'), true);
assert.equal(builtIndexEntry.keywords.includes('FarmView'), true);

assert.equal(findLineNumberByPattern(['intro', '# 春季种植'], '# 春季种植'), 2);
assert.equal(findLineNumberByPattern(['intro', 'router.post("/api/farm")'], /router\.post/), 2);

const longSemanticBlockParts = splitSemanticContentBlock(
  createSemanticBlock('长语义块', Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n'), {
    semanticKind: 'module',
    startLine: 10,
    endLine: 21,
  }),
  { maxBlockLines: 5, targetBlockLines: 4 }
);
assert.deepEqual(longSemanticBlockParts.map(item => item.title), ['长语义块', '长语义块（续 2）', '长语义块（续 3）']);
assert.deepEqual(longSemanticBlockParts.map(item => [item.startLine, item.endLine]), [[10, 13], [14, 17], [18, 21]]);
assert.equal(longSemanticBlockParts.every(item => item.content.length > 0), true);

const markdownBlocks = collectSemanticBlocksForText(
  'taoyuan-main/docs/guide.md',
  ['# 春季种植', '播种说明', '## 铜矿来源', '去矿洞查看铜矿。'].join('\n')
);
assert.deepEqual(markdownBlocks.map(item => item.title), ['春季种植', '铜矿来源']);
assert.deepEqual(markdownBlocks.map(item => item.semanticKind), ['markdown-heading', 'markdown-heading']);
assert.deepEqual(markdownBlocks.map(item => item.startLine), [1, 3]);
assert.equal(markdownBlocks[1].keywords.includes('铜矿来源'), true);

const htmlBlocks = collectSemanticBlocksForText(
  'taoyuan-main/docs/index.html',
  ['<html>', '<title>桃源&nbsp;指南</title>', '<h1>农场入口</h1>', '</html>'].join('\n')
);
assert.deepEqual(htmlBlocks.map(item => item.title), ['桃源 指南', '农场入口']);
assert.deepEqual(htmlBlocks.map(item => item.semanticKind), ['html-heading', 'html-heading']);
assert.deepEqual(htmlBlocks.map(item => item.startLine), [2, 3]);

const jsonText = ['{', '  "items": [{"id": "copper_ore"}],', '  "shops": {"yaopu": true}', '}'].join('\n');
const jsonBlocks = collectSemanticBlocksForText('data-defaults/items.json', jsonText, {
  json: {
    items: [{ id: 'copper_ore' }],
    shops: { yaopu: true },
  },
});
assert.deepEqual(jsonBlocks.map(item => item.title), ['items · data-defaults/items.json', 'shops · data-defaults/items.json']);
assert.deepEqual(jsonBlocks.map(item => item.semanticKind), ['json-top-key', 'json-top-key']);
assert.deepEqual(jsonBlocks.map(item => item.startLine), [2, 3]);
assert.equal(jsonBlocks[0].keywords.includes('items'), true);

const vueBlocks = collectSemanticBlocksForText(
  'taoyuan-main/src/components/game/FarmPanel.vue',
  [
    '<template>',
    '<div>农场</div>',
    '</template>',
    '<script setup>',
    'const count = 1;',
    '</script>',
    '<style>',
    '.panel { color: green; }',
    '</style>',
  ].join('\n')
);
assert.deepEqual(vueBlocks.map(item => item.semanticKind), ['vue-template', 'vue-script', 'vue-style']);
assert.deepEqual(vueBlocks.map(item => item.startLine), [1, 4, 7]);
assert.equal(vueBlocks[0].title, 'template · taoyuan-main/src/components/game/FarmPanel.vue');

const codeBlocks = collectSemanticBlocksForText(
  'server/src/routes/api.js',
  [
    'export async function askPublic() {',
    '  return true;',
    '}',
    'export class AiPanel {}',
    'router.post("/api/taoyuan/ai/ask", handleAsk);',
  ].join('\n')
);
assert.deepEqual(codeBlocks.map(item => item.semanticKind), ['function', 'class', 'route-handler']);
assert.deepEqual(codeBlocks.map(item => item.startLine), [1, 4, 5]);
assert.equal(codeBlocks[0].keyFunctions.includes('askPublic'), true);
assert.equal(codeBlocks[2].keywords.includes('/api/taoyuan/ai/ask'), true);

const genericBlocks = collectSemanticBlocksForText('notes/source.txt', 'plain source note');
assert.equal(genericBlocks.length, 1);
assert.equal(genericBlocks[0].title, 'notes/source.txt · 语义块');
assert.equal(genericBlocks[0].semanticKind, 'generic');

const normalizedStore = normalizeSourceIndexStore({
  version: 8,
  builtAt: 100,
  fingerprint: 'fp-a',
  entries: [{ id: 'entry-a' }],
  symbolEntries: [{ id: 'symbol-a' }],
}, { version: 8, requireVersion: true });
assert.equal(normalizedStore.version, 8);
assert.equal(normalizedStore.entryCount, 1);
assert.equal(normalizedStore.symbolCount, 1);
assert.deepEqual(normalizeSourceIndexStore({ version: 7, entries: [{ id: 'old' }] }, { version: 8, requireVersion: true }).entries, []);
assert.deepEqual(normalizeSourceIndexStore({ version: 8, entries: 'bad' }, { version: 8, requireVersion: true }).entries, []);

const serializedStore = serializeSourceIndexStore({
  fingerprint: 'fp-b',
  entries: [{ id: 'entry-b' }, { id: 'entry-c' }],
  symbolEntries: [{ id: 'symbol-b' }],
}, { version: 9, now: 456 });
assert.equal(serializedStore.version, 9);
assert.equal(serializedStore.builtAt, 456);
assert.equal(serializedStore.entryCount, 2);
assert.equal(serializedStore.symbolCount, 1);
assert.deepEqual(buildSourceIndexStatus(serializedStore, { version: 9 }), {
  version: 9,
  builtAt: 456,
  fileCount: 0,
  entryCount: 2,
  symbolCount: 1,
  ready: true,
});
assert.deepEqual(createSourceIndexCachePayload(serializedStore, { version: 9, builtAt: 789 }), {
  builtAt: 789,
  entries: serializedStore.entries,
  symbolEntries: serializedStore.symbolEntries,
});
const freshSourceIndexCacheResult = resolveSourceIndexEntries({
  cache: {
    builtAt: 1000,
    entries: [{ id: 'cache-entry' }],
    symbolEntries: [{ id: 'cache-symbol' }],
  },
  cacheTtlMs: 500,
  now: 1200,
  version: 9,
  collectFilePaths() {
    throw new Error('fresh memory cache should not scan source files');
  },
  loadPersistedStore() {
    throw new Error('fresh memory cache should not read persisted store');
  },
  buildStore() {
    throw new Error('fresh memory cache should not rebuild source index');
  },
});
assert.equal(freshSourceIndexCacheResult.source, 'memory-cache');
assert.deepEqual(freshSourceIndexCacheResult.entries.map(entry => entry.id), ['cache-entry']);
assert.deepEqual(freshSourceIndexCacheResult.symbolEntries.map(entry => entry.id), ['cache-symbol']);

let persistedCollectCount = 0;
let persistedFingerprintCount = 0;
let persistedLoadCount = 0;
let persistedBuildCount = 0;
const persistedSourceIndexResult = resolveSourceIndexEntries({
  cache: {
    builtAt: 1000,
    entries: [{ id: 'stale-cache-entry' }],
    symbolEntries: [{ id: 'stale-cache-symbol' }],
  },
  cacheTtlMs: 100,
  now: 1200,
  version: 9,
  collectFilePaths() {
    persistedCollectCount += 1;
    return ['farm.ts'];
  },
  buildFingerprint(filePaths) {
    persistedFingerprintCount += 1;
    assert.deepEqual(filePaths, ['farm.ts']);
    return 'fp-current';
  },
  loadPersistedStore() {
    persistedLoadCount += 1;
    return {
      version: 9,
      builtAt: 900,
      fingerprint: 'fp-current',
      entries: [{ id: 'persisted-entry' }],
      symbolEntries: [{ id: 'persisted-symbol' }],
    };
  },
  buildStore() {
    persistedBuildCount += 1;
    return { entries: [{ id: 'should-not-rebuild' }] };
  },
});
assert.equal(persistedSourceIndexResult.source, 'persisted-store');
assert.equal(persistedCollectCount, 1);
assert.equal(persistedFingerprintCount, 1);
assert.equal(persistedLoadCount, 1);
assert.equal(persistedBuildCount, 0);
assert.equal(persistedSourceIndexResult.cache.builtAt, 1200);
assert.deepEqual(persistedSourceIndexResult.entries.map(entry => entry.id), ['persisted-entry']);
assert.deepEqual(persistedSourceIndexResult.symbolEntries.map(entry => entry.id), ['persisted-symbol']);

let rebuildCount = 0;
const rebuiltSourceIndexResult = resolveSourceIndexEntries({
  cache: { builtAt: 1000, entries: [{ id: 'stale-cache-entry' }] },
  cacheTtlMs: 100,
  now: 1500,
  version: 9,
  filePaths: ['farm.ts', 'shop.ts'],
  fingerprint: 'fp-new',
  persistedStore: {
    version: 9,
    fingerprint: 'fp-old',
    entries: [{ id: 'old-persisted-entry' }],
  },
  buildStore(filePaths, fingerprint) {
    rebuildCount += 1;
    assert.deepEqual(filePaths, ['farm.ts', 'shop.ts']);
    assert.equal(fingerprint, 'fp-new');
    return {
      version: 9,
      builtAt: 1490,
      fingerprint,
      fileCount: filePaths.length,
      entries: [{ id: 'rebuilt-entry' }],
      symbolEntries: [{ id: 'rebuilt-symbol' }],
    };
  },
});
assert.equal(rebuiltSourceIndexResult.source, 'rebuilt');
assert.equal(rebuildCount, 1);
assert.equal(rebuiltSourceIndexResult.store.fingerprint, 'fp-new');
assert.equal(rebuiltSourceIndexResult.cache.builtAt, 1500);
assert.deepEqual(rebuiltSourceIndexResult.entries.map(entry => entry.id), ['rebuilt-entry']);
assert.deepEqual(rebuiltSourceIndexResult.symbolEntries.map(entry => entry.id), ['rebuilt-symbol']);

const sourceIndexTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-source-index-'));
const sourceIndexFile = path.join(sourceIndexTmpDir, 'nested', 'source-index.json');
assert.deepEqual(
  loadSourceIndexStoreFromFile(sourceIndexFile, { version: 11, requireVersion: true }).entries,
  [],
  'missing source index file should load as empty store',
);
fs.mkdirSync(path.dirname(sourceIndexFile), { recursive: true });
fs.writeFileSync(sourceIndexFile, '{not json', 'utf8');
assert.deepEqual(
  loadSourceIndexStoreFromFile(sourceIndexFile, { version: 11, requireVersion: true }).entries,
  [],
  'invalid source index JSON should fall back to empty store',
);
fs.writeFileSync(sourceIndexFile, JSON.stringify({
  version: 10,
  entries: [{ id: 'old-entry' }],
  symbolEntries: [{ id: 'old-symbol' }],
}), 'utf8');
assert.deepEqual(
  loadSourceIndexStoreFromFile(sourceIndexFile, { version: 11, requireVersion: true }).entries,
  [],
  'version mismatch should fall back to empty store',
);
saveSourceIndexStoreToFile(sourceIndexFile, {
  fingerprint: 'fp-file',
  fileCount: 2,
  entries: [{ id: 'entry-file', path: 'taoyuan-main/src/views/game/FarmView.vue', content: '农场视图索引' }],
  symbolEntries: [{ id: 'symbol-file', name: 'FarmView' }],
}, { version: 12, now: 1234 });
const savedSourceIndexText = fs.readFileSync(sourceIndexFile, 'utf8');
assert.match(savedSourceIndexText, /农场视图索引/, 'saved source index should preserve UTF-8 content');
assert.doesNotMatch(savedSourceIndexText, /apiKey|sk-/i, 'source index fixture should not contain key-like content');
const loadedSourceIndexFromFile = loadSourceIndexStoreFromFile(sourceIndexFile, { version: 12, requireVersion: true });
assert.equal(loadedSourceIndexFromFile.version, 12);
assert.equal(loadedSourceIndexFromFile.builtAt, 1234);
assert.equal(loadedSourceIndexFromFile.fileCount, 2);
assert.deepEqual(loadedSourceIndexFromFile.entries.map(entry => entry.id), ['entry-file']);
assert.deepEqual(loadedSourceIndexFromFile.symbolEntries.map(entry => entry.id), ['symbol-file']);
fs.rmSync(sourceIndexTmpDir, { recursive: true, force: true });

assert.deepEqual(
  normalizeNounLexiconStore(null, { version: 5 }),
  { version: 5, builtAt: 0, fingerprint: '', fileCount: 0, entryCount: 0, entries: [] },
  'empty noun lexicon store should normalize to versioned empty store',
);
assert.deepEqual(
  normalizeNounLexiconStore({ version: 4, entries: [{ term: '旧词' }] }, { version: 5, requireVersion: true }).entries,
  [],
  'noun lexicon version mismatch should normalize to empty entries',
);
assert.deepEqual(
  buildNounLexiconStatus({
    version: 5,
    builtAt: 1234,
    fileCount: 2,
    entries: [{ term: '春笋' }],
  }, { version: 5 }),
  { version: 5, builtAt: 1234, fileCount: 2, entryCount: 1, ready: true },
  'noun lexicon status should derive readiness and entry count from normalized store',
);
const serializedNounLexicon = serializeNounLexiconStore({
  fingerprint: 'noun-fp',
  fileCount: 3,
  entryCount: 1,
  entries: [{ term: '春笋', aliases: ['竹笋'] }],
}, { version: 5, now: 5678 });
assert.equal(serializedNounLexicon.version, 5);
assert.equal(serializedNounLexicon.builtAt, 5678);
assert.deepEqual(serializedNounLexicon.entries.map(entry => entry.term), ['春笋']);

const nounLexiconTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-noun-lexicon-'));
const nounLexiconFile = path.join(nounLexiconTmpDir, 'nested', 'noun-lexicon.json');
assert.deepEqual(
  loadNounLexiconStoreFromFile(nounLexiconFile, { version: 5, requireVersion: true }).entries,
  [],
  'missing noun lexicon file should load as empty store',
);
fs.mkdirSync(path.dirname(nounLexiconFile), { recursive: true });
fs.writeFileSync(nounLexiconFile, '{not json', 'utf8');
assert.deepEqual(
  loadNounLexiconStoreFromFile(nounLexiconFile, { version: 5, requireVersion: true }).entries,
  [],
  'invalid noun lexicon JSON should fall back to empty store',
);
fs.writeFileSync(nounLexiconFile, JSON.stringify({ version: 4, entries: [{ term: '旧词' }] }), 'utf8');
assert.deepEqual(
  loadNounLexiconStoreFromFile(nounLexiconFile, { version: 5, requireVersion: true }).entries,
  [],
  'old noun lexicon version should fall back to empty store',
);
saveNounLexiconStoreToFile(nounLexiconFile, {
  builtAt: 6789,
  fingerprint: 'noun-file-fp',
  fileCount: 2,
  entryCount: 1,
  entries: [{
    term: '春笋',
    normalized: '春笋',
    aliases: ['竹笋'],
    routeHints: ['forage'],
    occurrences: [{ path: 'data/items.json', preview: '春笋可以在竹林采集。' }],
  }],
}, { version: 5 });
const savedNounLexiconText = fs.readFileSync(nounLexiconFile, 'utf8');
assert.match(savedNounLexiconText, /春笋/, 'saved noun lexicon should preserve UTF-8 content');
assert.doesNotMatch(savedNounLexiconText, /apiKey|sk-/i, 'noun lexicon fixture should not contain key-like content');
const loadedNounLexiconFromFile = loadNounLexiconStoreFromFile(nounLexiconFile, { version: 5, requireVersion: true });
assert.equal(loadedNounLexiconFromFile.version, 5);
assert.equal(loadedNounLexiconFromFile.builtAt, 6789);
assert.equal(loadedNounLexiconFromFile.fileCount, 2);
assert.equal(loadedNounLexiconFromFile.entryCount, 1);
assert.deepEqual(loadedNounLexiconFromFile.entries[0].aliases, ['竹笋']);
assert.deepEqual(loadedNounLexiconFromFile.entries[0].routeHints, ['forage']);
fs.rmSync(nounLexiconTmpDir, { recursive: true, force: true });

const nounCacheEntry = { term: '春笋', normalized: '春笋', aliases: ['竹笋'] };
const nounLookup = createNounLexiconLookup([nounCacheEntry]);
assert.equal(nounLookup.get('春笋').term, '春笋');
assert.equal(nounLookup.get('竹笋').term, '春笋');
const nounCachePayload = createNounLexiconCachePayload({
  version: 5,
  fingerprint: 'noun-cache-fp',
  entries: [nounCacheEntry],
}, { version: 5, loadedAt: 2222 });
assert.equal(nounCachePayload.loadedAt, 2222);
assert.equal(nounCachePayload.fingerprint, 'noun-cache-fp');
assert.equal(nounCachePayload.lookup.get('竹笋').term, '春笋');

const freshNounLexiconResult = resolveNounLexiconEntries({
  cache: nounCachePayload,
  cacheTtlMs: 500,
  now: 2300,
  version: 5,
  collectFilePaths() {
    throw new Error('fresh noun lexicon cache should not scan source files');
  },
  loadPersistedStore() {
    throw new Error('fresh noun lexicon cache should not read persisted store');
  },
  buildStore() {
    throw new Error('fresh noun lexicon cache should not rebuild');
  },
});
assert.equal(freshNounLexiconResult.source, 'memory-cache');
assert.deepEqual(freshNounLexiconResult.entries.map(entry => entry.term), ['春笋']);
assert.equal(freshNounLexiconResult.lookup.get('竹笋').term, '春笋');

let persistedNounCollectCount = 0;
let persistedNounFingerprintCount = 0;
let persistedNounLoadCount = 0;
let persistedNounBuildCount = 0;
const persistedNounLexiconResult = resolveNounLexiconEntries({
  cache: { loadedAt: 1000, entries: [{ term: '旧缓存' }] },
  cacheTtlMs: 100,
  now: 2500,
  version: 5,
  collectFilePaths() {
    persistedNounCollectCount += 1;
    return ['items.json'];
  },
  buildFingerprint(filePaths) {
    persistedNounFingerprintCount += 1;
    assert.deepEqual(filePaths, ['items.json']);
    return 'noun-current-fp';
  },
  loadPersistedStore() {
    persistedNounLoadCount += 1;
    return {
      version: 5,
      fingerprint: 'noun-current-fp',
      entries: [{ term: '铜矿', normalized: '铜矿', aliases: ['copper_ore'] }],
    };
  },
  buildStore() {
    persistedNounBuildCount += 1;
    return { entries: [{ term: 'should-not-rebuild' }] };
  },
});
assert.equal(persistedNounLexiconResult.source, 'persisted-store');
assert.equal(persistedNounCollectCount, 1);
assert.equal(persistedNounFingerprintCount, 1);
assert.equal(persistedNounLoadCount, 1);
assert.equal(persistedNounBuildCount, 0);
assert.deepEqual(persistedNounLexiconResult.entries.map(entry => entry.term), ['铜矿']);
assert.equal(persistedNounLexiconResult.lookup.get('copperore').term, '铜矿');

let rebuiltNounCount = 0;
const rebuiltNounLexiconResult = resolveNounLexiconEntries({
  cache: { loadedAt: 1000, entries: [{ term: '旧缓存' }] },
  cacheTtlMs: 100,
  now: 2600,
  version: 5,
  filePaths: ['items.json', 'quests.json'],
  fingerprint: 'noun-new-fp',
  persistedStore: { version: 5, fingerprint: 'noun-old-fp', entries: [{ term: '旧词' }] },
  buildStore(filePaths, fingerprint) {
    rebuiltNounCount += 1;
    assert.deepEqual(filePaths, ['items.json', 'quests.json']);
    assert.equal(fingerprint, 'noun-new-fp');
    return {
      version: 5,
      fingerprint,
      fileCount: filePaths.length,
      entries: [{ term: '金鲤', normalized: '金鲤', aliases: ['golden_carp'] }],
    };
  },
});
assert.equal(rebuiltNounLexiconResult.source, 'rebuilt');
assert.equal(rebuiltNounCount, 1);
assert.deepEqual(rebuiltNounLexiconResult.entries.map(entry => entry.term), ['金鲤']);
assert.equal(rebuiltNounLexiconResult.cache.lookup.get('goldencarp').term, '金鲤');

const builtStoreFromFiles = buildSourceIndexStoreFromFiles(
  ['farm.ts', 'broken.ts', 'shop.ts'],
  'fp-built',
  {
    readFileText(filePath) {
      if (filePath === 'broken.ts') throw new Error('read failed');
      return `export function ${filePath.replace(/\W+/g, '_')}() {}`;
    },
    createIndexEntriesForFile(filePath, text) {
      return [{ id: `index:${filePath}`, content: text }];
    },
    createSymbolEntriesForFile(filePath, text) {
      return [{ id: `symbol:${filePath}`, content: text }];
    },
  },
  { version: 10, now: 999 }
);
assert.equal(builtStoreFromFiles.version, 10);
assert.equal(builtStoreFromFiles.builtAt, 999);
assert.equal(builtStoreFromFiles.fingerprint, 'fp-built');
assert.equal(builtStoreFromFiles.fileCount, 3);
assert.deepEqual(builtStoreFromFiles.entries.map(entry => entry.id), ['index:farm.ts', 'index:shop.ts']);
assert.deepEqual(builtStoreFromFiles.symbolEntries.map(entry => entry.id), ['symbol:farm.ts', 'symbol:shop.ts']);

let explicitSourceRebuildCount = 0;
const explicitSourceRebuildResult = rebuildSourceIndexEntries({
  version: 11,
  now: 3100,
  filePaths: ['farm.ts', 'shop.ts'],
  fingerprint: 'source-rebuild-fp',
  buildStore(filePaths, fingerprint) {
    explicitSourceRebuildCount += 1;
    assert.deepEqual(filePaths, ['farm.ts', 'shop.ts']);
    assert.equal(fingerprint, 'source-rebuild-fp');
    return {
      version: 11,
      builtAt: 3090,
      fingerprint,
      fileCount: filePaths.length,
      entries: [{ id: 'source-entry' }],
      symbolEntries: [{ id: 'source-symbol' }],
    };
  },
});
assert.equal(explicitSourceRebuildResult.source, 'rebuilt');
assert.equal(explicitSourceRebuildCount, 1);
assert.equal(explicitSourceRebuildResult.cache.builtAt, 3100);
assert.deepEqual(explicitSourceRebuildResult.entries.map(entry => entry.id), ['source-entry']);
assert.deepEqual(explicitSourceRebuildResult.symbolEntries.map(entry => entry.id), ['source-symbol']);
assert.deepEqual(explicitSourceRebuildResult.status, {
  version: 11,
  builtAt: 3090,
  fileCount: 2,
  entryCount: 1,
  symbolCount: 1,
  ready: true,
});

let explicitNounRebuildCount = 0;
const explicitNounRebuildResult = rebuildNounLexiconEntries({
  version: 6,
  now: 3200,
  filePaths: ['items.json'],
  fingerprint: 'noun-rebuild-fp',
  buildStore(filePaths, fingerprint) {
    explicitNounRebuildCount += 1;
    assert.deepEqual(filePaths, ['items.json']);
    assert.equal(fingerprint, 'noun-rebuild-fp');
    return {
      version: 6,
      builtAt: 3190,
      fingerprint,
      fileCount: filePaths.length,
      entries: [{ term: '灵芝', normalized: '灵芝', aliases: ['lingzhi'] }],
    };
  },
});
assert.equal(explicitNounRebuildResult.source, 'rebuilt');
assert.equal(explicitNounRebuildCount, 1);
assert.deepEqual(explicitNounRebuildResult.entries.map(entry => entry.term), ['灵芝']);
assert.equal(explicitNounRebuildResult.lookup.get('lingzhi').term, '灵芝');
assert.deepEqual(explicitNounRebuildResult.status, {
  version: 6,
  builtAt: 3190,
  fileCount: 1,
  entryCount: 1,
  ready: true,
});

const directorySummaryEntry = createSourceDirectorySummaryEntry(
  { path: 'server/src/routes', abs: 'D:/repo/server/src/routes' },
  [
    { name: 'admin', isDirectory: () => true, isFile: () => false },
    { name: 'api.js', isDirectory: () => false, isFile: () => true },
    { name: 'debug.tmp', isDirectory: () => false, isFile: () => true },
    { name: 'blocked', isDirectory: () => true, isFile: () => false },
    { name: 'health.ts', isDirectory: () => false, isFile: () => true },
    { name: 'zeta.vue', isDirectory: () => false, isFile: () => true },
  ],
  {
    allowedExtensions: new Set(['.js', '.ts', '.vue']),
    childLimit: 2,
    getExtension: name => name.slice(name.lastIndexOf('.')).toLowerCase(),
    isBlockedChild: entry => entry.name === 'blocked',
    sourceModuleLabels: { routes: '服务端接口', directory: '目录' },
  }
);
assert.equal(directorySummaryEntry.id, 'source_directory:server/src/routes');
assert.equal(directorySummaryEntry.title, '目录概览：server/src/routes');
assert.equal(directorySummaryEntry.moduleType, 'routes');
assert.equal(directorySummaryEntry.moduleLabel, '服务端接口');
assert.deepEqual(directorySummaryEntry.childDirs, ['admin']);
assert.deepEqual(directorySummaryEntry.childFiles, ['api.js', 'health.ts', 'zeta.vue']);
assert.equal(directorySummaryEntry.content.includes('子目录（1）：admin'), true);
assert.equal(directorySummaryEntry.content.includes('源码/数据文件（3）：api.js、health.ts 等'), true);
assert.equal(directorySummaryEntry.keywords.includes('api.js'), true);
assert.equal(directorySummaryEntry.keywords.includes('blocked'), false);
assert.equal(createSourceDirectorySummaryEntry(null, []), null);

const winPath = path.win32;
const whitelistServerRoot = winPath.resolve('D:\\repo\\server');
const whitelistMainRoot = winPath.resolve('D:\\repo\\taoyuan-main');
const whitelistedRoutesDir = winPath.resolve(whitelistServerRoot, 'src', 'routes');
const whitelistedApiFile = winPath.resolve(whitelistServerRoot, 'src', 'routes', 'api.js');
const whitelistedBlockedFile = winPath.resolve(whitelistServerRoot, '.env');
const pathWhitelist = [
  { key: 'server', abs: whitelistServerRoot },
  { key: 'taoyuan-main', abs: whitelistMainRoot },
];
const fakePathKinds = new Map([
  [whitelistServerRoot, 'dir'],
  [whitelistMainRoot, 'dir'],
  [whitelistedRoutesDir, 'dir'],
  [whitelistedApiFile, 'file'],
  [whitelistedBlockedFile, 'file'],
]);
const pathResolutionAdapters = {
  existsPath: absPath => fakePathKinds.has(absPath),
  isFilePath: absPath => fakePathKinds.get(absPath) === 'file',
  isDirectoryPath: absPath => fakePathKinds.get(absPath) === 'dir',
  resolvePath: (basePath, ...parts) => winPath.resolve(basePath, ...parts),
  relativePath: (fromPath, toPath) => winPath.relative(fromPath, toPath),
  isAbsolutePath: value => winPath.isAbsolute(value),
  isBlockedPath: absPath => /(?:^|[\\/])(?:\.env|node_modules)(?:[\\/]|$)/i.test(absPath),
};

assert.equal(isDirectoryLikeTarget('server', pathWhitelist), true);
assert.equal(isDirectoryLikeTarget('server/src/routes', pathWhitelist), true);
assert.equal(isDirectoryLikeTarget('server/src/routes/api.js', pathWhitelist), false);
assert.deepEqual(
  resolveExplicitDirectoryTarget('server/src/routes', pathWhitelist, pathResolutionAdapters),
  { path: 'server/src/routes', abs: whitelistedRoutesDir }
);
assert.equal(resolveExplicitDirectoryTarget('server/src/routes/api.js', pathWhitelist, pathResolutionAdapters), null);
assert.equal(resolveExplicitDirectoryTarget('server/../outside', pathWhitelist, pathResolutionAdapters), null);
assert.equal(
  resolveWhitelistRelativeFilePath('./server/src/routes/api.js', pathWhitelist, pathResolutionAdapters),
  whitelistedApiFile
);
assert.equal(resolveWhitelistRelativeFilePath('server/../secret.js', pathWhitelist, pathResolutionAdapters), '');
assert.equal(resolveWhitelistRelativeFilePath('server/.env', pathWhitelist, pathResolutionAdapters), '');

const sourceSnippet = extractSourceSnippet(
  [
    'const helper = true;',
    'const fakeSecret = "api_key_should_not_be_indexed";',
    'export function renderFarmView() {',
    '  return { itemId: "copper_ore", name: "铜矿" };',
    '}',
  ].join('\n'),
  ['copper_ore', 'FarmView'],
  {
    skipLinePattern: /(api[_ -]?key|secret)/i,
    contextLines: 2,
    maxLength: 220,
    radius: 60,
  }
);
assert.equal(sourceSnippet.includes('renderFarmView'), true);
assert.equal(sourceSnippet.includes('copper_ore'), true);
assert.equal(sourceSnippet.includes('fakeSecret'), false);

const truncatedSnippet = extractSourceSnippet(
  [
    'intro '.repeat(20),
    'export function renderCopperOreFarmView() { return "copper_ore"; }',
    'outro '.repeat(20),
  ].join('\n'),
  ['copper_ore'],
  {
    contextLines: 1,
    maxLength: 80,
    radius: 20,
  }
);
assert.equal(truncatedSnippet.length <= 80, true);
assert.equal(truncatedSnippet.includes('copper_ore') || truncatedSnippet.includes('Copper'), true);

const sourceContextCandidate = buildSourceContextCandidate(
  'D:/repo/taoyuan-main/src/views/game/FarmView.vue',
  'export function FarmView() { return { itemId: "copper_ore" }; }',
  {
    terms: ['FarmView', 'copper_ore'],
    routeName: 'farm',
    explicitTargets: ['taoyuan-main/src/views/game/FarmView.vue'],
    queryPlan: { moduleHints: ['view'], routeHints: ['farm'] },
    toRelativePath: filePath => String(filePath).replace('D:/repo/', ''),
    routeLabels: { farm: '农场' },
    detectModuleType: detectSourceModuleType,
    contextLines: 1,
    maxLength: 180,
    radius: 60,
  }
);
assert.equal(sourceContextCandidate.path, 'taoyuan-main/src/views/game/FarmView.vue');
assert.equal(sourceContextCandidate.score > 0, true);
assert.equal(sourceContextCandidate.summary.includes('FarmView'), true);
assert.equal(
  buildSourceContextCandidate('empty.ts', 'no matching terms', { terms: ['missing'] }),
  null
);

const rankedContextCandidates = buildSourceContextCandidatesFromFiles(
  ['farm.ts', 'broken.ts', 'shop.ts', 'empty.ts'],
  {
    readFileText(filePath) {
      if (filePath === 'broken.ts') throw new Error('read failed');
      if (filePath === 'farm.ts') return 'export function FarmView() { return { itemId: "copper_ore", page: "farm" }; }';
      if (filePath === 'shop.ts') return 'const shop = { itemId: "copper_ore" };';
      return 'unrelated module';
    },
  },
  {
    terms: ['FarmView', 'copper_ore'],
    routeName: 'farm',
    explicitTargets: ['farm.ts'],
    queryPlan: { moduleHints: ['view'], routeHints: ['farm'] },
    toRelativePath: filePath => filePath,
    routeLabels: { farm: '农场' },
    detectModuleType: () => 'view',
    contextLines: 1,
    maxLength: 220,
    radius: 80,
    limit: 1,
  }
);
assert.deepEqual(rankedContextCandidates.map(item => item.path), ['farm.ts']);
assert.equal(rankedContextCandidates[0].snippet.includes('copper_ore'), true);

const score = scoreSourceFile(
  'D:/repo/taoyuan-main/src/views/game/FarmView.vue',
  '农场页面展示铜矿来源。',
  ['FarmView', '铜矿'],
  'farm',
  ['taoyuan-main/src/views/game/FarmView.vue'],
  {
    moduleHints: ['view'],
    routeHints: ['farm'],
  },
  {
    toRelativePath: filePath => String(filePath).replace('D:/repo/', ''),
    routeLabels: { farm: '农场' },
  }
);
assert.equal(
  score,
  283,
  'source file scoring should preserve explicit path, route, module hint, route hint and term scoring semantics'
);

assert.equal(scoreModuleTypePreference('view', { preferredModuleTypes: ['view', 'store'] }), 34);
assert.equal(scoreModuleTypePreference('store', { preferredModuleTypes: ['view', 'store'] }), 29);
assert.equal(scoreModuleTypePreference('routes', { preferredModuleTypes: ['view', 'store'] }), 0);
assert.equal(scorePathPreference('taoyuan-main/src/views/game/FarmView.vue', { preferredPathPrefixes: ['taoyuan-main/src/views'] }), 34);
assert.equal(scorePathPreference('server/src/routes/api.js', { preferredPathPrefixes: ['taoyuan-main/src/views'] }), 0);

const symbolQueryPlan = {
  explicitTargets: ['taoyuan-main/src/stores/useFarmStore.ts'],
  identifierTargets: ['useFarmStore'],
  sourceTerms: ['farm', 'copperOre'],
  expandedTerms: ['useFarmStore'],
  intents: ['locate_symbol', 'find_implementation', 'inspect_directory'],
  moduleHints: ['store'],
  routeHints: ['farm'],
};
const symbolEntry = {
  path: 'taoyuan-main/src/stores/useFarmStore.ts',
  name: 'useFarmStore',
  content: 'export const useFarmStore = defineStore("farm", () => ({ copperOre }))',
  keywords: ['useFarmStore', 'farm', 'copperOre'],
  kind: 'store',
  moduleType: 'store',
  routeHints: ['farm'],
};
assert.equal(scoreSourceSymbolEntry(symbolEntry, symbolQueryPlan, 'farm'), 620);
assert.deepEqual(
  rankSourceSymbolEntries([
    { path: 'server/src/routes/api.js', name: 'registerApiRoutes', content: '', keywords: [], kind: 'function', moduleType: 'routes' },
    symbolEntry,
  ], symbolQueryPlan, 'farm', { limit: 1 }).map(entry => entry.name),
  ['useFarmStore']
);

const indexQueryPlan = {
  sourceTerms: ['FarmView', '铜矿', '农场页'],
  explicitTargets: ['taoyuan-main/src/views/game/FarmView.vue'],
  preferredModuleTypes: ['view', 'store'],
  preferredPathPrefixes: ['taoyuan-main/src/views', 'server/src'],
  moduleHints: ['view'],
  routeHints: ['farm'],
  expandedTerms: ['铜矿'],
  intents: ['locate_symbol', 'find_condition', 'find_source'],
};
const indexEntry = {
  path: 'taoyuan-main/src/views/game/FarmView.vue',
  title: 'FarmView 农场页面',
  content: '农场页面显示铜矿来源、成熟条件和商店入口。',
  keywords: ['FarmView', '铜矿'],
  aliases: ['农场页'],
  routeHints: ['farm'],
  questionTypes: ['resource-use'],
  moduleType: 'view',
  keyFunctions: ['renderFarm'],
  conditionHints: ['成熟条件'],
  shopSignals: ['shop'],
};
assert.equal(
  scoreSourceIndexEntry(
    indexEntry,
    ['FarmView', '铜矿', '农场页'],
    'farm',
    ['taoyuan-main/src/views/game/FarmView.vue'],
    indexQueryPlan,
    {
      routeLabels: { farm: '农场' },
      detectQuestionTypes: () => ['resource-use'],
    }
  ),
  426
);
assert.deepEqual(
  rankSourceIndexEntries([
    { path: 'server/src/taoyuanAiAssistant.js', title: 'AI 助手', content: '', moduleType: 'module' },
    indexEntry,
  ], ['FarmView', '铜矿', '农场页'], 'farm', ['taoyuan-main/src/views/game/FarmView.vue'], indexQueryPlan, {
    limit: 1,
    adapters: {
      routeLabels: { farm: '农场' },
      detectQuestionTypes: () => ['resource-use'],
    },
  }).map(entry => entry.title),
  ['FarmView 农场页面']
);

const directoryQueryPlan = {
  preferredModuleTypes: ['directory'],
  preferredPathPrefixes: ['taoyuan-main/src/views'],
  explicitTargets: ['taoyuan-main/src/views/game'],
  sourceTerms: ['FarmView', 'game'],
  intents: ['inspect_directory', 'locate_file'],
};
const directoryEntry = {
  path: 'taoyuan-main/src/views/game',
  moduleType: 'directory',
  keywords: ['game', 'FarmView'],
};
assert.equal(scoreSourceDirectoryEntry(directoryEntry, directoryQueryPlan, 'game'), 484);
assert.deepEqual(
  rankSourceDirectoryEntries([
    { path: 'server/src/routes', moduleType: 'routes', keywords: ['routes'] },
    directoryEntry,
  ], directoryQueryPlan, 'game', { limit: 1 }).map(entry => entry.path),
  ['taoyuan-main/src/views/game']
);

const resolvedPlanObject = resolveSourceSearchQueryPlan(symbolQueryPlan, 'farm', {
  resolveQueryPlan() {
    throw new Error('object query plans should not be reparsed');
  },
});
assert.equal(resolvedPlanObject, symbolQueryPlan);
let resolveQueryPlanCallCount = 0;
assert.deepEqual(
  resolveSourceSearchQueryPlan('FarmView 铜矿', 'farm', {
    resolveQueryPlan(question, routeName) {
      resolveQueryPlanCallCount += 1;
      assert.equal(question, 'FarmView 铜矿');
      assert.equal(routeName, 'farm');
      return indexQueryPlan;
    },
  }),
  indexQueryPlan
);
assert.equal(resolveQueryPlanCallCount, 1);

const serviceSymbolHits = searchSourceSymbols('FarmStore 在哪', 'farm', {
  resolveQueryPlan(question, routeName) {
    assert.equal(routeName, 'farm');
    assert.equal(question.includes('FarmStore'), true);
    return symbolQueryPlan;
  },
  getSourceSymbolEntries(queryPlan, routeName) {
    assert.equal(queryPlan, symbolQueryPlan);
    assert.equal(routeName, 'farm');
    return [
      { path: 'server/src/routes/api.js', name: 'registerApiRoutes', content: '', keywords: [], kind: 'function', moduleType: 'routes' },
      symbolEntry,
    ];
  },
}, { limit: 1 });
assert.deepEqual(serviceSymbolHits.map(item => item.name), ['useFarmStore']);

const serviceDirectoryHits = searchSourceDirectories(directoryQueryPlan, 'game', {
  resolveDirectoryTarget(target, queryPlan, routeName) {
    assert.equal(target, 'taoyuan-main/src/views/game');
    assert.equal(queryPlan, directoryQueryPlan);
    assert.equal(routeName, 'game');
    return { path: target, abs: '/repo/views/game' };
  },
  createDirectorySummaryEntry(resolvedDir, queryPlan, routeName) {
    assert.deepEqual(resolvedDir, { path: 'taoyuan-main/src/views/game', abs: '/repo/views/game' });
    assert.equal(queryPlan, directoryQueryPlan);
    assert.equal(routeName, 'game');
    return directoryEntry;
  },
}, {
  whitelist: [{ key: 'taoyuan-main/src/views', abs: '/repo/views' }],
  limit: 1,
});
assert.deepEqual(serviceDirectoryHits.map(item => item.path), ['taoyuan-main/src/views/game']);

const serviceIndexHits = searchSourceIndex(indexQueryPlan, 'farm', {
  getSourceIndexEntries(queryPlan, routeName) {
    assert.equal(queryPlan, indexQueryPlan);
    assert.equal(routeName, 'farm');
    return [
      { path: 'server/src/taoyuanAiAssistant.js', title: 'AI 助手', content: '', moduleType: 'module' },
      indexEntry,
    ];
  },
}, {
  limit: 1,
  scoringAdapters: {
    routeLabels: { farm: '农场' },
    detectQuestionTypes: () => ['resource-use'],
  },
});
assert.deepEqual(serviceIndexHits.map(item => item.title), ['FarmView 农场页面']);

const serviceContextHits = searchSourceContext(indexQueryPlan, 'farm', {
  collectSourceFiles(queryPlan, routeName) {
    assert.equal(queryPlan, indexQueryPlan);
    assert.equal(routeName, 'farm');
    return ['farm.ts', 'empty.ts'];
  },
  readFileText(filePath) {
    if (filePath === 'farm.ts') return 'export function FarmView() { return { itemId: "copper_ore", page: "farm" }; }';
    return 'unrelated module';
  },
}, {
  limit: 1,
  contextOptions: {
    toRelativePath: filePath => filePath,
    routeLabels: { farm: '农场' },
    detectModuleType: () => 'view',
    contextLines: 1,
    maxLength: 220,
    radius: 80,
  },
});
assert.deepEqual(serviceContextHits.map(item => item.path), ['farm.ts']);

let contextSearchCalls = 0;
const completeSourceSearchHits = collectSourceSearchHits(
  { sourceTerms: ['farm'] },
  'farm',
  {
    searchDirectories: () => [{ id: 'dir-a', score: 20 }, { id: 'dir-b', score: 19 }, { id: 'dir-extra', score: 1 }],
    searchSymbols: () => [
      { id: 'symbol-a', score: 30 },
      { id: 'symbol-b', score: 29 },
      { id: 'symbol-c', score: 28 },
      { id: 'symbol-d', score: 27 },
      { id: 'symbol-extra', score: 1 },
    ],
    searchIndex: () => [
      { id: 'index-a', score: 26 },
      { id: 'index-b', score: 25 },
      { id: 'index-c', score: 24 },
      { id: 'index-d', score: 23 },
      { id: 'index-extra', score: 1 },
    ],
    searchContext: () => {
      contextSearchCalls += 1;
      return [{ id: 'context-a', score: 10 }];
    },
  },
  {
    directoryLimit: 2,
    symbolLimit: 4,
    indexLimit: 4,
    contextLimit: 2,
    contextScoreThreshold: 12,
  }
);
assert.deepEqual(completeSourceSearchHits.sourceDirectoryHits.map(item => item.id), ['dir-a', 'dir-b']);
assert.deepEqual(completeSourceSearchHits.sourceSymbolHits.map(item => item.id), ['symbol-a', 'symbol-b', 'symbol-c', 'symbol-d']);
assert.deepEqual(completeSourceSearchHits.sourceIndexHits.map(item => item.id), ['index-a', 'index-b', 'index-c', 'index-d']);
assert.deepEqual(completeSourceSearchHits.sourceHits, []);
assert.equal(contextSearchCalls, 0);

const sparseSourceSearchHits = collectSourceSearchHits(
  { sourceTerms: ['farm'] },
  'farm',
  {
    searchDirectories: () => [{ id: 'dir-a', score: 20 }, { id: 'dir-b', score: 19 }],
    searchSymbols: () => [{ id: 'symbol-a', score: 8 }],
    searchIndex: () => [{ id: 'index-a', score: 18 }, { id: 'index-b', score: 17 }],
    searchContext: () => [{ id: 'context-a', score: 16 }, { id: 'context-b', score: 15 }, { id: 'context-extra', score: 1 }],
  },
  {
    directoryLimit: 2,
    symbolLimit: 4,
    indexLimit: 4,
    contextLimit: 2,
    contextScoreThreshold: 12,
  }
);
assert.deepEqual(sparseSourceSearchHits.sourceHits.map(item => item.id), ['context-a', 'context-b']);

const lowScoreSourceSearchHits = collectSourceSearchHits(
  { sourceTerms: ['farm'] },
  'farm',
  {
    searchDirectories: () => [{ id: 'dir-a', score: 20 }, { id: 'dir-b', score: 19 }],
    searchSymbols: () => [
      { id: 'symbol-a', score: 10 },
      { id: 'symbol-b', score: 9 },
      { id: 'symbol-c', score: 8 },
      { id: 'symbol-d', score: 7 },
    ],
    searchIndex: () => [
      { id: 'index-a', score: 11 },
      { id: 'index-b', score: 10 },
      { id: 'index-c', score: 9 },
      { id: 'index-d', score: 8 },
    ],
    searchContext: () => [{ id: 'context-low-score', score: 16 }],
  },
  {
    directoryLimit: 2,
    symbolLimit: 4,
    indexLimit: 4,
    contextLimit: 2,
    contextScoreThreshold: 12,
  }
);
assert.deepEqual(lowScoreSourceSearchHits.sourceHits.map(item => item.id), ['context-low-score']);

console.log('qa-ai-assistant-source-index-service passed');
