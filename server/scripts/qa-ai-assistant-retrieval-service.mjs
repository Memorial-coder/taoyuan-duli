import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildDirectoryFullFileMatches,
  buildRecallCandidatePools,
  buildSourceDirectoryMatches,
  buildSourceIndexMatches,
  buildSourceKnowledgeMatches,
  buildSourceSymbolMatches,
  createFullFileMatch,
  createRetrievedMatchScorer,
  dedupeRetrievedMatches,
  expandRetrievedMatchesToFullFiles,
  filterRetrievedMatchesForAudience,
  formatFullSourceContentForEvidence,
  getRetrievedMatchDedupeKey,
  isRuntimeSensitiveSourceItem,
  normalizeText,
  rerankRetrievedMatches,
  sanitizeFullSourceContent,
  scoreRetrievedMatchForAnswer,
  selectExpandedFullFileMatches,
  shouldSearchSource,
} = require('../src/taoyuanAi/retrievalService');

assert.equal(normalizeText(' Crop_Image: Render '), 'cropimagerender');

const [sourceIndexMatch] = buildSourceIndexMatches(
  [{
    path: 'taoyuan-main/src/views/game/FarmView.vue',
    title: 'FarmView',
    summary: '农场页面入口',
    keywords: ['farm'],
    routeHints: ['farm'],
    questionTypes: ['page-explanation'],
    keyFunctions: ['useFarmActions'],
    shopSignals: ['种子商店'],
    conditionHints: ['春季'],
    content: 'function useFarmActions() {}',
    score: 0,
    startLine: 12,
    endLine: 34,
    moduleType: 'view',
  }],
  { sourceModuleLabels: { module: '源码模块' } }
);
assert.equal(sourceIndexMatch.id, 'source_index_0_taoyuanmain/src/views/game/farmview.vue_12');
assert.equal(sourceIndexMatch.title, '源码索引：FarmView');
assert.equal(sourceIndexMatch.score, 1);
assert.equal(sourceIndexMatch.sourceType, 'source-index');
assert.equal(sourceIndexMatch.symbol, 'useFarmActions');
assert.ok(sourceIndexMatch.content.includes('模块类型：源码模块'));
assert.ok(sourceIndexMatch.content.includes('来源文件：taoyuan-main/src/views/game/FarmView.vue（约 12-34 行）'));
assert.ok(sourceIndexMatch.content.includes('商店/资源线索：种子商店'));

const [sourceSymbolMatch] = buildSourceSymbolMatches(
  [{
    path: 'server/src/routes/api.js',
    name: 'askPublic',
    kind: 'function',
    keywords: ['ask'],
    importSource: './taoyuanAiAssistant',
    routeHints: ['assistant'],
    content: 'async function askPublic() {}',
    lineNumber: 88,
    score: 6,
  }],
  { sourceSymbolKindLabels: { module: '模块符号' } }
);
assert.equal(sourceSymbolMatch.id, 'source_symbol_0_server/src/routes/api.js_askpublic');
assert.equal(sourceSymbolMatch.title, '源码符号：askPublic');
assert.equal(sourceSymbolMatch.sourceType, 'source-symbol');
assert.equal(sourceSymbolMatch.symbolKind, 'function');
assert.equal(sourceSymbolMatch.lineNumber, 88);
assert.ok(sourceSymbolMatch.content.includes('符号类型：模块符号'));
assert.ok(sourceSymbolMatch.content.includes('关联来源：./taoyuanAiAssistant'));

const [sourceDirectoryMatch] = buildSourceDirectoryMatches(
  [{
    path: 'server/src/taoyuanAi',
    title: 'AI 模块目录',
    keywords: ['assistant'],
    content: '包含拆分后的 AI 服务模块。',
    score: 4,
    moduleType: 'directory',
  }],
  { sourceModuleLabels: { directory: '目录 / 模块概览' } }
);
assert.equal(sourceDirectoryMatch.id, 'source_directory_0_server/src/taoyuanai');
assert.equal(sourceDirectoryMatch.sourceType, 'source-directory');
assert.equal(sourceDirectoryMatch.path, 'server/src/taoyuanAi');
assert.ok(sourceDirectoryMatch.content.includes('模块类型：目录 / 模块概览'));

const [sourceKnowledgeMatch] = buildSourceKnowledgeMatches([
  {
    path: 'taoyuan-main/src/data/items.ts',
    summary: '铜矿来自矿洞。',
    snippet: '铜矿',
    score: 0,
  },
]);
assert.equal(sourceKnowledgeMatch.id, 'source_0_taoyuanmain/src/data/items.ts');
assert.equal(sourceKnowledgeMatch.title, '源码补充：taoyuan-main/src/data/items.ts');
assert.equal(sourceKnowledgeMatch.sourceType, 'source');
assert.equal(sourceKnowledgeMatch.score, 1);
assert.equal(sourceKnowledgeMatch.snippet, '铜矿');
assert.ok(sourceKnowledgeMatch.content.includes('来源文件：taoyuan-main/src/data/items.ts'));

const recallPools = buildRecallCandidatePools(
  {
    queryPlan: { raw: 'FarmView 铜矿', sourcePreference: 'high' },
    knowledgeMatches: [{ id: 'manual_farm', title: '农场资料', content: '公开资料', score: 12, sourceType: 'manual' }],
    sourceDirectoryHits: [{
      path: 'taoyuan-main/src/views/game',
      title: '游戏页面目录',
      content: '包含 FarmView。',
      score: 30,
      moduleType: 'directory',
    }],
    sourceSymbolHits: [{
      path: 'taoyuan-main/src/views/game/FarmView.vue',
      name: 'renderFarm',
      kind: 'function',
      content: 'function renderFarm() {}',
      score: 25,
    }],
    sourceIndexHits: [{
      path: 'taoyuan-main/src/views/game/FarmView.vue',
      title: 'FarmView',
      summary: '农场页面入口',
      content: 'FarmView content',
      score: 20,
      startLine: 1,
      endLine: 8,
      moduleType: 'view',
    }],
    sourceHits: [{ path: 'taoyuan-main/src/data/items.ts', summary: '铜矿来源', score: 15 }],
    nounLexiconCandidates: [{ id: 'noun_copper_ore', title: '铜矿词典', content: '铜矿', score: 28, sourceType: 'noun-lexicon' }],
  },
  {
    stage1PoolLimit: 4,
    finalLimit: 2,
    rerankRetrievedMatches: matches => [...matches].reverse(),
  }
);
assert.deepEqual(
  recallPools.stage1Pool.map(item => item.sourceType),
  ['source-directory', 'noun-lexicon', 'source-symbol', 'source-index'],
  'stage1 pool should merge source matches and noun candidates, dedupe, sort by score, and apply pool limit'
);
assert.deepEqual(
  recallPools.finalMatches.map(item => item.sourceType),
  ['source-index', 'source-symbol'],
  'final matches should use the injected rerank result and final limit'
);

assert.equal(
  sanitizeFullSourceContent('const a = 1;\nAuthorization: Bearer test\nconst b = 2;'),
  'const a = 1;\n[已过滤敏感行]\nconst b = 2;',
  'full-file content sanitizer should replace sensitive auth/key lines'
);

assert.deepEqual(
  formatFullSourceContentForEvidence(''),
  { content: '', truncated: false, originalLength: 0 },
  'empty full-file content should keep an empty non-truncated evidence payload'
);

const shortFullFile = formatFullSourceContentForEvidence('line 1\nsecret = hidden\nline 3', { maxLength: 80 });
assert.equal(shortFullFile.truncated, false);
assert.equal(shortFullFile.originalLength, 'line 1\n[已过滤敏感行]\nline 3'.length);
assert.equal(shortFullFile.content, 'line 1\n[已过滤敏感行]\nline 3');

const truncatedFullFile = formatFullSourceContentForEvidence('abcdef', { maxLength: 3 });
assert.equal(truncatedFullFile.truncated, true);
assert.equal(truncatedFullFile.originalLength, 6);
assert.ok(
  truncatedFullFile.content.includes('[文件过大，已截断展示。原始长度 6 字符；当前仅展示前 3 字符。]'),
  'truncated full-file content should include the existing public truncation notice'
);

assert.deepEqual(
  selectExpandedFullFileMatches(
    [
      { path: 'a.ts', score: 1, title: 'low a' },
      { sourceRefs: ['b.ts'], score: 8, title: 'b' },
      { path: 'a.ts', score: 10, title: 'high a' },
      { path: '', score: 99, title: 'missing path' },
      { path: 'c.ts', score: 5, title: 'c' },
    ],
    2
  ).map(item => item.title),
  ['high a', 'b'],
  'expanded full-file selection should dedupe by file path, keep higher score and apply limit'
);

assert.equal(
  createFullFileMatch(
    'server/src/taoyuanAi/retrievalService.js',
    {},
    { resolveFilePath: () => '' }
  ),
  null,
  'full-file match creation should return null when the whitelist resolver rejects the path'
);
assert.equal(
  createFullFileMatch(
    'server/src/taoyuanAi/retrievalService.js',
    {},
    {
      resolveFilePath: () => 'D:/repo/server/src/taoyuanAi/retrievalService.js',
      readFileText: () => { throw new Error('read failed'); },
    }
  ),
  null,
  'full-file match creation should return null when file reading fails'
);
assert.equal(
  createFullFileMatch(
    'server/src/taoyuanAi/retrievalService.js',
    {},
    {
      resolveFilePath: () => 'D:/repo/server/src/taoyuanAi/retrievalService.js',
      readFileText: () => '',
    }
  ),
  null,
  'full-file match creation should return null when sanitized file content is empty'
);

const fullFileMatch = createFullFileMatch(
  'server/src/taoyuanAi/retrievalService.js',
  {
    originTitle: '源码索引：retrievalService',
    originSourceType: 'source-index',
    score: 0,
    symbol: 'createFullFileMatch',
    symbolKind: 'function',
    lineNumber: 55,
    keywords: ['retrieval', 'server'],
  },
  {
    resolveFilePath: relativePath => `D:/repo/${relativePath}`,
    readFileText: () => 'export function createFullFileMatch() {}\nsecret = hidden',
    detectModuleType: () => 'utils',
    sourceModuleLabels: { utils: '工具逻辑', module: '源码模块' },
    maxLength: 200,
  }
);
assert.equal(fullFileMatch.id, 'source_fullfile_server/src/taoyuanai/retrievalservice.js');
assert.equal(fullFileMatch.title, '完整文件：server/src/taoyuanAi/retrievalService.js');
assert.equal(fullFileMatch.score, 1);
assert.equal(fullFileMatch.sourceType, 'source-fullfile');
assert.equal(fullFileMatch.path, 'server/src/taoyuanAi/retrievalService.js');
assert.equal(fullFileMatch.symbol, 'createFullFileMatch');
assert.equal(fullFileMatch.symbolKind, 'function');
assert.equal(fullFileMatch.lineNumber, 55);
assert.equal(fullFileMatch.moduleType, 'utils');
assert.equal(fullFileMatch.moduleLabel, '工具逻辑');
assert.equal(fullFileMatch.contentMode, 'full-file');
assert.equal(fullFileMatch.originTitle, '源码索引：retrievalService');
assert.equal(fullFileMatch.originSourceType, 'source-index');
assert.equal(fullFileMatch.truncated, false);
assert.deepEqual(
  fullFileMatch.keywords,
  ['server/src/taoyuanAi/retrievalService.js', 'server', 'src', 'taoyuanAi', 'retrievalService', 'js', 'retrieval'],
  'full-file match keywords should preserve path-derived terms and de-duplicate explicit keywords'
);
assert.ok(fullFileMatch.content.includes('命中来源：源码索引：retrievalService'));
assert.ok(fullFileMatch.content.includes('模块类型：工具逻辑'));
assert.ok(fullFileMatch.content.includes('命中位置：第 55 行附近'));
assert.ok(fullFileMatch.content.includes('[已过滤敏感行]'));

const directoryFullFileMatches = buildDirectoryFullFileMatches(
  {
    path: 'server/src/taoyuanAi',
    title: 'AI 模块目录',
    sourceType: 'source-directory',
    score: 20,
    keywords: ['assistant', 'retrieval'],
  },
  {
    sourceTerms: ['retrieval'],
    routeName: 'farm',
    explicitTargets: ['retrievalService'],
    sourcePreference: 'strong',
  },
  {
    resolveDirectoryTarget: relativePath => (
      relativePath === 'server/src/taoyuanAi'
        ? { abs: 'D:/repo/server/src/taoyuanAi', path: 'server/src/taoyuanAi' }
        : null
    ),
    listDirectoryChildren: () => [
      { name: 'retrievalService.js', isFile: () => true },
      { name: 'notes.md', isFile: () => true },
      { name: 'secret.js', isFile: () => true },
      { name: 'nested', isFile: () => false },
    ],
    isAllowedFile: fileName => fileName.endsWith('.js'),
    isBlockedPath: absPath => absPath.includes('secret.js'),
    joinPath: (basePath, childName) => `${basePath}/${childName}`,
    readFileText: (absPath, relativePath) => {
      assert.equal(absPath, 'D:/repo/server/src/taoyuanAi/retrievalService.js');
      assert.equal(relativePath, 'server/src/taoyuanAi/retrievalService.js');
      return 'function retrievalService() {}';
    },
    scoreSourceFile: (absPath, text, sourceTerms, routeName, explicitTargets, queryPlan) => {
      assert.equal(absPath, 'D:/repo/server/src/taoyuanAi/retrievalService.js');
      assert.equal(text, 'function retrievalService() {}');
      assert.deepEqual(sourceTerms, ['retrieval']);
      assert.equal(routeName, 'farm');
      assert.deepEqual(explicitTargets, ['retrievalService']);
      assert.equal(queryPlan.sourcePreference, 'strong');
      return 7;
    },
    detectModuleType: relativePath => (relativePath.endsWith('.js') ? 'service' : 'module'),
    createFullFileMatch: (relativePath, options) => ({
      title: relativePath,
      path: relativePath,
      score: options.score,
      moduleType: options.moduleType,
      originTitle: options.originTitle,
      originSourceType: options.originSourceType,
      keywords: options.keywords,
    }),
  }
);
assert.deepEqual(
  directoryFullFileMatches,
  [{
    title: 'server/src/taoyuanAi/retrievalService.js',
    path: 'server/src/taoyuanAi/retrievalService.js',
    score: 15,
    moduleType: 'service',
    originTitle: 'AI 模块目录',
    originSourceType: 'source-directory',
    keywords: ['assistant', 'retrieval'],
  }],
  'directory expansion should filter entries, score child files and forward origin metadata'
);
assert.deepEqual(
  buildDirectoryFullFileMatches({ path: 'missing' }, {}, { resolveDirectoryTarget: () => null }),
  [],
  'directory expansion should return no matches when the directory resolver rejects the target'
);

let directoryExpansionCallCount = 0;
const expandedFullFileMatches = expandRetrievedMatchesToFullFiles(
  [
    { title: 'manual', sourceType: 'manual', score: 3 },
    { title: 'directory', sourceType: 'source-directory', path: 'server/src/taoyuanAi', score: 9 },
    {
      title: 'source index',
      sourceType: 'source-index',
      path: 'server/src/taoyuanAi/retrievalService.js',
      score: 7,
      moduleType: 'service',
      symbol: 'expandRetrievedMatchesToFullFiles',
      startLine: 321,
      keywords: ['expand'],
    },
    { title: 'existing full', sourceType: 'source-fullfile', path: 'existing.js', score: 50 },
    { title: 'missing source', sourceType: 'source', path: 'missing.js', score: 99 },
  ],
  { sourcePreference: 'strong', intents: ['inspect_directory'] },
  {
    directoryFullFileLimit: 1,
    fullFileLimit: 3,
    buildDirectoryFullFileMatches: (directoryMatch, queryPlan) => {
      directoryExpansionCallCount += 1;
      assert.equal(directoryMatch.title, 'directory');
      assert.equal(queryPlan.sourcePreference, 'strong');
      return [
        { title: 'directory full', sourceType: 'source-fullfile', path: 'directory-a.js', score: 20 },
        { title: 'directory full ignored by limit', sourceType: 'source-fullfile', path: 'directory-b.js', score: 19 },
      ];
    },
    createFullFileMatch: (relativePath, options) => {
      if (relativePath === 'missing.js') return null;
      return {
        title: `full ${relativePath}`,
        sourceType: 'source-fullfile',
        path: relativePath,
        score: options.score,
        originTitle: options.originTitle,
        originSourceType: options.originSourceType,
        moduleType: options.moduleType,
        symbol: options.symbol,
        lineNumber: options.lineNumber,
        keywords: options.keywords,
      };
    },
  }
);
assert.equal(directoryExpansionCallCount, 1);
assert.deepEqual(
  expandedFullFileMatches.map(item => item.title),
  ['manual', 'directory', 'missing source', 'existing full', 'directory full', 'full server/src/taoyuanAi/retrievalService.js'],
  'full-file expansion should preserve passthrough matches and append selected full-file candidates'
);
const expandedSourceIndexFullFile = expandedFullFileMatches.find(item => item.originSourceType === 'source-index');
assert.equal(expandedSourceIndexFullFile.originTitle, 'source index');
assert.equal(expandedSourceIndexFullFile.moduleType, 'service');
assert.equal(expandedSourceIndexFullFile.symbol, 'expandRetrievedMatchesToFullFiles');
assert.equal(expandedSourceIndexFullFile.lineNumber, 321);
assert.deepEqual(expandedSourceIndexFullFile.keywords, ['expand']);

assert.deepEqual(
  expandRetrievedMatchesToFullFiles(
    [{ title: 'directory only', sourceType: 'source-directory', path: 'server/src/taoyuanAi', score: 9 }],
    { sourcePreference: 'high', intents: [] },
    {
      buildDirectoryFullFileMatches: () => {
        throw new Error('directory expansion should not run without strong source preference or inspect_directory intent');
      },
    }
  ).map(item => item.title),
  ['directory only'],
  'directory matches should not expand unless strong source preference or inspect_directory is active'
);

const matchesExplicitPath = (candidate, target) => {
  const left = String(candidate || '').toLowerCase().replace(/\\/g, '/');
  const right = String(target || '').toLowerCase().replace(/\\/g, '/');
  return Boolean(left && right && (left === right || left.includes(right)));
};

const scorer = createRetrievedMatchScorer({
  internalPathPattern: /server\/src\/taoyuanAiAssistant\.js/i,
  runtimeDataPathPattern: /data\/runtime/i,
  matchesExplicitPath,
});

assert.equal(
  scorer(
    { sourceType: 'source-index', score: 10, path: 'taoyuan-main/src/views/game/FarmView.vue' },
    { sourcePreference: 'strong' }
  ),
  130,
  'strong source preference should boost source matches'
);

assert.equal(
  scorer(
    { sourceType: 'manual', score: 10 },
    { sourcePreference: 'strong' }
  ),
  -20,
  'strong source preference should demote manual matches'
);

assert.equal(
  scorer(
    { sourceType: 'source-symbol', score: 5 },
    { intents: ['locate_symbol', 'find_call_relation'] }
  ),
  145,
  'symbol lookup intents should boost source symbols'
);

assert.equal(
  scorer(
    { sourceType: 'structured-knowledge', score: 3 },
    { primaryIntent: 'find_source' }
  ),
  123,
  'find_source should prefer structured public knowledge before raw source snippets'
);

assert.equal(
  scorer(
    { sourceType: 'source-index', score: 100, path: 'server/src/taoyuanAiAssistant.js' },
    { primaryIntent: 'find_source' }
  ),
  -132,
  'find_source should heavily demote internal AI implementation paths'
);

assert.equal(
  scorer(
    { sourceType: 'source-index', score: 100, path: 'data/runtime/secret.json' },
    { primaryIntent: 'gameplay_qa' }
  ),
  -56,
  'gameplay_qa should demote runtime data source paths'
);

assert.equal(
  scorer(
    {
      sourceType: 'manual',
      score: 4,
      title: '铜矿',
      keywords: ['铜矿石', '矿洞'],
    },
    { raw: '铜矿' }
  ),
  144,
  'exact manual title matches should stay ahead of vague structured hits'
);

assert.equal(
  scorer(
    {
      sourceType: 'manual',
      score: 4,
      title: '矿洞手册',
      keywords: ['铜矿石', '矿洞'],
    },
    { raw: '铜矿石' }
  ),
  124,
  'exact manual keyword matches should be boosted'
);

assert.equal(
  scorer(
    {
      sourceType: 'source-index',
      score: 1,
      title: 'CropImage.vue',
      sourceRefs: ['taoyuan-main/src/components/game/CropImage.vue'],
    },
    { explicitTargets: ['CropImage.vue'] }
  ),
  101,
  'explicit path targets should boost source refs and titles'
);

assert.equal(
  scoreRetrievedMatchForAnswer(
    { sourceType: 'source-fullfile', score: 2 },
    { sourcePreference: 'high' }
  ),
  182,
  'direct scorer should support high source preference and full file boost'
);

assert.equal(
  getRetrievedMatchDedupeKey({ sourceType: 'source-fullfile', path: 'a.js', symbol: 'ignored' }),
  'source-fullfile|a.js',
  'full-file matches should dedupe by file path only'
);
assert.deepEqual(
  dedupeRetrievedMatches([
    { sourceType: 'source-index', path: 'a.js', symbol: 'foo', startLine: 1 },
    { sourceType: 'source-index', path: 'a.js', symbol: 'foo', startLine: 1 },
    { sourceType: 'source-index', path: 'a.js', symbol: 'bar', startLine: 1 },
    { sourceType: 'source-fullfile', path: 'b.js', symbol: 'x' },
    { sourceType: 'source-fullfile', path: 'b.js', symbol: 'y' },
    null,
  ]).map(item => item.symbol || item.path),
  ['foo', 'bar', 'x'],
  'retrieved matches should preserve first occurrence and drop duplicate keys'
);

assert.equal(
  isRuntimeSensitiveSourceItem(
    { sourceType: 'source-index', path: 'data/runtime/private.json' },
    { runtimeDataPathPattern: /data\/runtime/i }
  ),
  true,
  'runtime data path should be considered sensitive for public audience filtering'
);
assert.equal(
  isRuntimeSensitiveSourceItem({ sourceType: 'manual', moduleType: 'runtime-data' }),
  true,
  'runtime-data module type should be considered sensitive'
);

assert.deepEqual(
  filterRetrievedMatchesForAudience(
    [
      { title: 'runtime', path: 'data/runtime/private.json' },
      { title: 'public', path: 'taoyuan-main/src/data/crops.ts' },
    ],
    { primaryIntent: 'gameplay_qa' },
    { runtimeDataPathPattern: /data\/runtime/i }
  ).map(item => item.title),
  ['public'],
  'gameplay QA should filter runtime-sensitive matches when safe alternatives exist'
);
assert.deepEqual(
  filterRetrievedMatchesForAudience(
    [{ title: 'runtime', path: 'data/runtime/private.json' }],
    { primaryIntent: 'gameplay_qa' },
    { runtimeDataPathPattern: /data\/runtime/i }
  ).map(item => item.title),
  ['runtime'],
  'audience filtering should fall back to original matches when every match is filtered'
);
assert.deepEqual(
  filterRetrievedMatchesForAudience(
    [{ title: 'runtime', path: 'data/runtime/private.json' }],
    { primaryIntent: 'gameplay_qa', sourcePreference: 'strong' },
    { runtimeDataPathPattern: /data\/runtime/i }
  ).map(item => item.title),
  ['runtime'],
  'strong source preference should keep source matches for admin/debug paths'
);

const reranked = rerankRetrievedMatches(
  [
    { sourceType: 'manual', score: 5, title: '手册' },
    { sourceType: 'source-index', score: 80, path: 'data/runtime/private.json', title: 'runtime' },
    { sourceType: 'source-index', score: 20, path: 'farm.ts', title: 'farm source' },
  ],
  { primaryIntent: 'gameplay_qa', raw: '手册' },
  {
    runtimeDataPathPattern: /data\/runtime/i,
    matchesExplicitPath,
    expandMatches: matches => [
      ...matches,
      { sourceType: 'source-fullfile', score: 1, path: 'farm.ts', title: 'expanded full file' },
    ],
  }
);
assert.deepEqual(
  reranked.map(item => item.title),
  ['手册', 'expanded full file', 'farm source'],
  'rerank should expand matches, filter runtime data and order by responseScore'
);
assert.ok(
  reranked.every(item => Number.isFinite(item.responseScore)),
  'reranked matches should include numeric responseScore values'
);

assert.equal(
  shouldSearchSource([{ score: 30 }], { needsSourceSearch: true, primaryIntent: 'gameplay_qa', raw: '铜矿在哪里' }),
  true,
  'explicit source-search plans should force source search even with strong knowledge matches'
);
assert.equal(
  shouldSearchSource([{ score: 14 }], { primaryIntent: 'find_source', raw: '铜矿来源' }),
  false,
  'find_source should skip source search when public knowledge already has a useful match'
);
assert.equal(
  shouldSearchSource([{ score: 14 }], { primaryIntent: 'gameplay_qa', raw: '铜矿有什么用' }),
  false,
  'gameplay QA should skip source search when public knowledge already has a useful match'
);
assert.equal(
  shouldSearchSource([{ score: 9 }], { primaryIntent: 'gameplay_qa', raw: '铜矿在哪里买' }),
  true,
  'resource/source wording should still search source when the public match is weak'
);
assert.equal(
  shouldSearchSource([], { primaryIntent: 'general', raw: '这个页面怎么做' }),
  true,
  'questions with no knowledge matches should search source when source reading is enabled'
);
assert.equal(
  shouldSearchSource([{ score: 9 }, { score: 8 }], { primaryIntent: 'general', raw: '普通问题' }),
  false,
  'multiple adequate knowledge matches should avoid source search by default'
);
assert.equal(
  shouldSearchSource([{ score: 7 }, { score: 9 }], { primaryIntent: 'general', raw: '普通问题' }),
  true,
  'low top-score knowledge matches should still allow source search'
);

console.log('qa-ai-assistant-retrieval-service passed');
