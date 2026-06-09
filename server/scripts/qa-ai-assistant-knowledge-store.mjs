import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const knowledgeStore = require('../src/taoyuanAi/knowledgeStore');

const fixedOptions = {
  now: 1710000000000,
  createId: () => 'ak_fixture_id',
};

let store = knowledgeStore.normalizeKnowledgeStore(null);
assert.deepEqual(store, { entries: [] }, 'empty knowledge store should normalize to entries array');
assert.deepEqual(
  knowledgeStore.normalizeKnowledgeStore({ entries: [{ id: 'one' }], ignored: true }),
  { entries: [{ id: 'one' }] },
  'knowledge store should only expose entries',
);
assert.deepEqual(
  knowledgeStore.serializeKnowledgeStore({ entries: [{ id: 'one' }] }),
  { entries: [{ id: 'one' }] },
  'serialized knowledge store should preserve entries',
);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-knowledge-store-'));
const knowledgeFile = path.join(tmpDir, 'nested', 'knowledge.json');
assert.deepEqual(
  knowledgeStore.loadKnowledgeStoreFromFile(knowledgeFile),
  { entries: [] },
  'missing knowledge file should load as an empty store',
);
fs.mkdirSync(path.dirname(knowledgeFile), { recursive: true });
fs.writeFileSync(knowledgeFile, '{not json', 'utf8');
assert.deepEqual(
  knowledgeStore.loadKnowledgeStoreFromFile(knowledgeFile),
  { entries: [] },
  'invalid knowledge JSON should fall back to an empty store',
);

let entry = knowledgeStore.sanitizeKnowledgeEntry({
  title: '  春笋  ',
  routeNames: ['forage', 'forage', ''],
  keywords: '春笋，采集\n竹林',
  content: '  春笋可在采集路线获得。  ',
  access: 'standard',
  enabled: false,
  sourceType: 'manual',
  reviewStatus: 'draft',
  sourceRefs: ['data/items.json', 'data/items.json', ''],
  metadata: { owner: 'qa' },
}, {}, fixedOptions);
assert.equal(entry.id, 'ak_fixture_id');
assert.equal(entry.title, '春笋');
assert.deepEqual(entry.routeNames, ['forage']);
assert.deepEqual(entry.keywords, ['春笋', '采集', '竹林']);
assert.equal(entry.content, '春笋可在采集路线获得。');
assert.equal(entry.access, 'standard');
assert.equal(entry.enabled, false);
assert.equal(entry.reviewStatus, 'draft');
assert.deepEqual(entry.sourceRefs, ['data/items.json']);
assert.equal(entry.createdAt, fixedOptions.now);
assert.equal(entry.updatedAt, fixedOptions.now);
assert.deepEqual(entry.metadata, { owner: 'qa' });

entry = knowledgeStore.sanitizeKnowledgeEntry({ title: '无关键词条目' }, {}, fixedOptions);
assert.deepEqual(entry.keywords, ['无关键词条目'], 'title should become fallback keyword');
assert.equal(entry.access, 'public', 'unknown access should default public');
assert.equal(entry.reviewStatus, 'published', 'managed entries default published');

const builtin = knowledgeStore.buildBuiltinKnowledgeEntries([
  { id: 'builtin-one', title: '内置知识', routeNames: ['farm'], keywords: ['农场'], access: 'public', content: '只读内容' },
]);
assert.equal(builtin[0].readonly, true);
assert.equal(builtin[0].sourceType, 'built-in');
assert.equal(builtin[0].reviewStatus, 'published');
assert.equal(builtin[0].enabled, true);

const createResult = knowledgeStore.createKnowledgeEntryInStore(store, {
  title: '人工知识',
  content: '人工正文',
  keywords: ['人工'],
}, fixedOptions);
store = createResult.store;
assert.equal(createResult.entry.id, 'ak_fixture_id');
assert.equal(createResult.entry.sourceType, 'manual');
assert.equal(createResult.entry.reviewStatus, 'published');
assert.equal(store.entries.length, 1);

const updateResult = knowledgeStore.updateKnowledgeEntryInStore(store, 'ak_fixture_id', {
  title: '人工知识更新',
  reviewStatus: 'draft',
  enabled: false,
}, fixedOptions);
store = updateResult.store;
assert.equal(updateResult.entry.id, 'ak_fixture_id');
assert.equal(updateResult.entry.createdAt, fixedOptions.now);
assert.equal(updateResult.entry.title, '人工知识更新');
assert.equal(updateResult.entry.reviewStatus, 'draft');
assert.equal(updateResult.entry.enabled, false);

let managed = knowledgeStore.getManagedKnowledgeEntriesFromStore(store, fixedOptions);
assert.equal(managed.length, 1);
assert.equal(managed[0].title, '人工知识更新');
assert.equal(
  knowledgeStore.buildPublishedKnowledgeEntries(builtin, managed).length,
  1,
  'draft managed entry should not be published',
);
assert.equal(
  knowledgeStore.buildActiveKnowledgeEntries(builtin, managed).length,
  1,
  'disabled draft managed entry should not join active entries',
);

const publishResult = knowledgeStore.publishKnowledgeEntryInStore(store, 'ak_fixture_id', fixedOptions);
store = publishResult.store;
assert.equal(publishResult.entry.reviewStatus, 'published');
assert.equal(publishResult.entry.enabled, true);
managed = knowledgeStore.getManagedKnowledgeEntriesFromStore(store, fixedOptions);
assert.equal(
  knowledgeStore.buildPublishedKnowledgeEntries(builtin, managed).length,
  2,
  'published managed entry should join builtin published entries',
);

const deleteResult = knowledgeStore.deleteKnowledgeEntryInStore(store, 'ak_fixture_id', fixedOptions);
store = deleteResult.store;
assert.equal(deleteResult.entry.id, 'ak_fixture_id');
assert.equal(store.entries.length, 0);

assert.throws(
  () => knowledgeStore.updateKnowledgeEntryInStore(store, 'missing', {}, fixedOptions),
  error => error instanceof Error && error.status === 404 && /知识条目不存在/.test(error.message),
  'missing update should throw 404-compatible error',
);
assert.throws(
  () => knowledgeStore.deleteKnowledgeEntryInStore(store, 'missing', fixedOptions),
  error => error instanceof Error && error.status === 404 && /知识条目不存在/.test(error.message),
  'missing delete should throw 404-compatible error',
);

const sourceHits = [
  { path: 'taoyuan-main/src/views/game/FarmView.vue', summary: '农场页会展示缺水地块。' },
  { path: 'server/src/taoyuanAiAssistant.js', summary: '助手只应整理公开说明。' },
];
const sourceDraft = knowledgeStore.draftKnowledgeFromSource(
  '  农场缺水怎么办？'.repeat(8),
  'farm',
  sourceHits,
  {
    ...fixedOptions,
    routeLabels: { farm: '农场' },
    extractSearchTerms: () => ['农场', '缺水'],
  },
);
assert.ok(sourceDraft.title.length > 0 && sourceDraft.title.length <= 80, 'source draft title should be bounded');
assert.deepEqual(sourceDraft.routeNames, ['farm']);
assert.deepEqual(sourceDraft.keywords, ['农场', '缺水']);
assert.equal(sourceDraft.sourceType, 'source');
assert.equal(sourceDraft.reviewStatus, 'draft');
assert.equal(sourceDraft.enabled, true);
assert.deepEqual(sourceDraft.sourceRefs, [
  'taoyuan-main/src/views/game/FarmView.vue',
  'server/src/taoyuanAiAssistant.js',
]);
assert.match(sourceDraft.content, /围绕【农场】相关问题/, 'source draft content should include the route label');
assert.match(sourceDraft.content, /1\. 农场页会展示缺水地块。/, 'source draft content should list source summaries');
assert.match(sourceDraft.content, /应以最新源码为准/, 'source draft content should include source freshness caution');
assert.equal(
  knowledgeStore.draftKnowledgeFromSource('空命中', 'farm', [], fixedOptions),
  null,
  'source draft should not be created without hits',
);

store = knowledgeStore.normalizeKnowledgeStore(null);
let autoResult = knowledgeStore.upsertAutoKnowledgeFromSourceInStore(
  store,
  '农场缺水怎么办？',
  'farm',
  sourceHits,
  {
    ...fixedOptions,
    routeLabels: { farm: '农场' },
    extractSearchTerms: () => ['农场', '缺水'],
  },
);
store = autoResult.store;
assert.equal(autoResult.created, true);
assert.equal(autoResult.updated, false);
assert.equal(store.entries.length, 1);
assert.equal(autoResult.entry.metadata.sourceKey, 'source-auto:农场缺水怎么办？:farm');
assert.equal(autoResult.entry.metadata.sourceMode, 'auto');

autoResult = knowledgeStore.upsertAutoKnowledgeFromSourceInStore(
  store,
  ' 农场 缺水 怎么办？ ',
  'farm',
  [{ path: 'taoyuan-main/src/views/game/FarmView.vue', summary: '更新后的缺水说明。' }],
  {
    now: 1710000005000,
    routeLabels: { farm: '农场' },
    extractSearchTerms: () => ['缺水'],
  },
);
store = autoResult.store;
assert.equal(autoResult.created, false);
assert.equal(autoResult.updated, true);
assert.equal(store.entries.length, 1, 'same normalized source key should update the existing auto draft');
assert.equal(autoResult.entry.id, 'ak_fixture_id', 'auto draft update should preserve the original id');
assert.equal(autoResult.entry.createdAt, fixedOptions.now, 'auto draft update should preserve createdAt');
assert.equal(autoResult.entry.updatedAt, 1710000005000, 'auto draft update should refresh updatedAt');
assert.match(autoResult.entry.content, /更新后的缺水说明。/);

autoResult = knowledgeStore.upsertAutoKnowledgeFromSourceInStore(store, '无命中', 'farm', [], fixedOptions);
assert.equal(autoResult.entry, null, 'empty auto source hits should not create an entry');
assert.equal(autoResult.store.entries.length, 1, 'empty auto source hits should preserve the store');

knowledgeStore.saveKnowledgeStoreToFile(knowledgeFile, {
  entries: [{
    id: 'ak_saved',
    title: '竹林路线',
    routeNames: ['forage'],
    keywords: ['竹林', '春笋'],
    content: '春笋可以在竹林采集。',
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    reviewStatus: 'published',
    sourceRefs: ['data/items.json'],
    createdAt: fixedOptions.now,
    updatedAt: fixedOptions.now,
  }],
});
const savedText = fs.readFileSync(knowledgeFile, 'utf8');
assert.match(savedText, /竹林路线/, 'saved knowledge file should preserve UTF-8 content');
assert.doesNotMatch(savedText, /apiKey|sk-/i, 'knowledge file fixture should not contain key-like content');
const loadedFromFile = knowledgeStore.loadKnowledgeStoreFromFile(knowledgeFile);
assert.equal(loadedFromFile.entries.length, 1, 'saved knowledge file should load back');
assert.equal(loadedFromFile.entries[0].id, 'ak_saved');
assert.deepEqual(loadedFromFile.entries[0].routeNames, ['forage']);
assert.deepEqual(loadedFromFile.entries[0].sourceRefs, ['data/items.json']);

const searchRuleDefaultFile = path.join(tmpDir, 'search-rules-default.json');
const searchRuleOverrideFile = path.join(tmpDir, 'search-rules-override.json');
const builtinSearchRules = knowledgeStore.buildBuiltinSearchRules({
  queryHintRules: [{ test: /哪里买|购买/i, terms: ['shop'], routeHints: ['shop'], questionTypes: ['shop-purchase'] }],
  synonymRules: [{ canonical: '铜矿', aliases: ['铜矿石'] }],
  conceptExpansionRules: [{ test: /鱼塘/i, terms: ['fishpond'] }],
  routeLabels: { farm: '农场', shop: '商店' },
});
assert.equal(builtinSearchRules.queryHints[0].id, 'builtin-query-0');
assert.equal(builtinSearchRules.queryHints[0].pattern, '哪里买|购买');
assert.equal(builtinSearchRules.synonyms[0].canonical, '铜矿');
assert.equal(builtinSearchRules.conceptExpansions[0].pattern, '鱼塘');
assert.deepEqual(
  builtinSearchRules.routeAliases.find(item => item.routeName === 'farm')?.aliases,
  ['农场'],
  'builtin search rules should include route labels as route aliases',
);

fs.writeFileSync(searchRuleDefaultFile, JSON.stringify({
  queryHints: [
    { id: 'source', pattern: '来源|从哪来', flags: 'i', terms: ['来源'], routeHints: ['farm'], questionTypes: ['resource-source'] },
    { id: 'bad-regexp', pattern: '(', flags: 'i', terms: ['bad'] },
  ],
  synonyms: [
    { canonical: '铜矿', label: '铜矿', aliases: ['铜矿石'], slotType: 'item', officialId: 'copper_ore', routeHints: ['mining'] },
  ],
  routeAliases: [{ routeName: 'farm', aliases: ['田地', '农地'] }],
  resourceCatalog: [
    {
      id: 'turnip',
      title: '白萝卜',
      aliases: ['萝卜'],
      kind: 'crop',
      slotType: 'item',
      terms: ['菜'],
      sourceTerms: ['杂货店'],
      shopTerms: ['种子店'],
      routeHints: ['farm'],
      questionTypes: ['resource-source'],
    },
  ],
}), 'utf8');
fs.writeFileSync(searchRuleOverrideFile, JSON.stringify({
  queryHints: [
    { id: 'source', pattern: '购买|哪里买', flags: 'i', terms: ['购买'], routeHints: ['shop'], questionTypes: ['shop-purchase'] },
  ],
  shopCatalog: [
    { id: 'general_store', title: '杂货店', aliases: ['万物铺'], kind: 'shop', terms: ['种子'], routeHints: ['shop'], questionTypes: ['shop-purchase'] },
  ],
}), 'utf8');
const searchRulesFingerprint = knowledgeStore.buildSearchRulesFingerprint(builtinSearchRules, [
  searchRuleDefaultFile,
  searchRuleOverrideFile,
]);
assert.equal(searchRulesFingerprint.length, 40, 'search rules fingerprint should be sha1-like');
fs.appendFileSync(searchRuleOverrideFile, '\n', 'utf8');
assert.notEqual(
  knowledgeStore.buildSearchRulesFingerprint(builtinSearchRules, [searchRuleDefaultFile, searchRuleOverrideFile]),
  searchRulesFingerprint,
  'search rules fingerprint should change when a rule file changes',
);

const mergedSearchRules = knowledgeStore.mergeSearchRules(
  builtinSearchRules,
  JSON.parse(fs.readFileSync(searchRuleDefaultFile, 'utf8')),
  JSON.parse(fs.readFileSync(searchRuleOverrideFile, 'utf8')),
);
assert.equal(
  mergedSearchRules.queryHints.find(item => item.id === 'source')?.pattern,
  '购买|哪里买',
  'later search rules should override records with the same id',
);
const compiledSearchRules = knowledgeStore.compileSearchRules(mergedSearchRules, {
  routeLabels: { farm: '农场', shop: '商店' },
});
assert.ok(
  compiledSearchRules.queryHints.find(item => item.id === 'source')?.test.test('哪里买种子'),
  'compiled query hint should expose a working RegExp',
);
assert.equal(
  compiledSearchRules.queryHints.some(item => item.id === 'bad-regexp'),
  false,
  'compiled search rules should drop invalid regex records',
);
assert.deepEqual(
  compiledSearchRules.routeAliasLookup.get('farm'),
  ['田地', '农地', '农场'],
  'compiled route alias lookup should merge file aliases and injected route label',
);
assert.equal(compiledSearchRules.synonyms[0].officialId, 'copper_ore');
assert.deepEqual(compiledSearchRules.resourceCatalog[0].sourceTerms, ['杂货店']);
assert.equal(compiledSearchRules.shopCatalog[0].title, '杂货店');

const querySlotCatalog = knowledgeStore.buildQuerySlotAliasCatalog({
  rules: compiledSearchRules,
  structuredEntries: [
    {
      id: 'carrot',
      title: '胡萝卜',
      kind: 'crop',
      aliases: ['红萝卜'],
      routeHints: ['farm'],
      questionTypes: ['resource-source'],
      sources: [
        { type: 'shop', label: '杂货店' },
        { type: 'route', label: '春季订单' },
      ],
      uses: [{ type: 'quest', label: '萝卜汤任务' }],
      relations: ['萝卜汤'],
    },
  ],
  routeLabels: { farm: '农场', shop: '商店' },
  querySlotFields: ['items', 'tasks', 'npcs', 'locations', 'quantities', 'seasons', 'systems'],
  querySlotTypeToField: {
    item: 'items',
    crop: 'items',
    shop: 'locations',
    location: 'locations',
    system: 'systems',
    route: 'systems',
  },
  seasonSlotCandidates: [{ canonical: 'spring', label: '春季', aliases: ['春', '春季', '春天'] }],
  structuredItemKinds: ['resource', 'crop', 'recipe'],
  structuredSystemKinds: ['shop'],
  structuredTaskRecordTypes: ['quest', 'task', 'order', 'route'],
  structuredLocationRecordTypes: ['shop', 'location'],
  locationRouteNames: ['farm', 'shop'],
  normalizeText: value => String(value || '').toLowerCase().replace(/[\s_\-:'"`]+/g, ''),
});
const findCatalogSlot = (field, source, expected) => querySlotCatalog.find(item => {
  return item.field === field
    && item.source === source
    && [item.id, item.canonical, item.label, ...(item.aliases || []), ...(item.officialIds || [])]
      .some(value => String(value || '').includes(expected));
});
assert.ok(findCatalogSlot('seasons', 'builtin-season', '春季'), 'slot catalog should include builtin seasons');
assert.ok(findCatalogSlot('items', 'search-rule', 'copper_ore'), 'slot catalog should preserve synonym official IDs');
assert.ok(findCatalogSlot('items', 'resource-catalog', '白萝卜'), 'slot catalog should include resource catalog entries');
assert.ok(findCatalogSlot('locations', 'shop-catalog', '杂货店'), 'slot catalog should include shop catalog entries');
assert.ok(findCatalogSlot('systems', 'route-alias', 'farm'), 'slot catalog should include route aliases as systems');
assert.ok(findCatalogSlot('locations', 'route-alias', '农场'), 'location route aliases should also become locations');
assert.ok(findCatalogSlot('items', 'structured-knowledge', '胡萝卜'), 'structured item entries should become item slots');
assert.ok(findCatalogSlot('locations', 'structured-knowledge', '杂货店'), 'structured source locations should become location slots');
assert.ok(findCatalogSlot('tasks', 'structured-knowledge', '春季订单'), 'structured task-like records should become task slots');
const turnipSlots = querySlotCatalog.filter(item => item.field === 'items' && item.id === 'turnip');
assert.equal(turnipSlots.length, 1, 'slot catalog should dedupe entries by field and normalized id');
assert.ok(turnipSlots[0].aliases.includes('萝卜'), 'deduped catalog slot should keep aliases');

const structuredDefaultFile = path.join(tmpDir, 'structured-default.json');
const structuredOverrideFile = path.join(tmpDir, 'structured-override.json');
fs.writeFileSync(structuredDefaultFile, JSON.stringify({
  entries: [
    {
      id: 'turnip',
      title: '白萝卜',
      kind: 'crop',
      aliases: ['萝卜', '萝卜', 'server/src/internal.js'],
      routeHints: ['farm', 'hidden-route'],
      questionTypes: ['resource-source'],
      summary: '春季作物，可用于料理。',
      unlockStatus: '春季商店解锁',
      fastRoute: '春季去商店买种子。',
      recommendedRoute: '先确认体力和背包，再安排播种。',
      routeSteps: ['打开农场页', '购买种子', 'server/src/internal.js'],
      sources: [
        { type: 'shop', label: '杂货店', detail: '春季售卖', quantity: '20文', conditions: ['春季', 'private-secret-note'] },
        { type: 'debug', label: 'server/src/internal.js', detail: 'private-secret-note' },
      ],
      uses: [{ type: 'recipe', label: '萝卜汤', detail: '料理材料' }],
      relations: ['料理', '春季', 'private-secret-note'],
    },
    {
      id: 'recipe_soup',
      title: '萝卜汤',
      kind: 'recipe',
      routeHints: ['cooking'],
      summary: '料理。',
    },
  ],
}), 'utf8');
fs.writeFileSync(structuredOverrideFile, JSON.stringify({
  entries: [
    {
      id: 'turnip',
      title: '白萝卜更新',
      kind: 'crop',
      aliases: ['小萝卜'],
      routeHints: ['farm'],
      summary: '覆盖默认条目。',
    },
    { id: '', title: '缺 ID 条目' },
  ],
}), 'utf8');

const structuredFingerprint = knowledgeStore.buildStructuredKnowledgeFingerprint([
  structuredDefaultFile,
  structuredOverrideFile,
]);
assert.equal(structuredFingerprint.length, 40, 'structured knowledge fingerprint should be sha1-like');
fs.appendFileSync(structuredOverrideFile, '\n', 'utf8');
assert.notEqual(
  knowledgeStore.buildStructuredKnowledgeFingerprint([structuredDefaultFile, structuredOverrideFile]),
  structuredFingerprint,
  'structured knowledge fingerprint should change when file content changes',
);

const sanitizePublicText = value => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return /server\/src|private-secret/i.test(text) ? '' : text;
};
const structuredEntries = knowledgeStore.loadStructuredKnowledgeEntriesFromFiles([
  structuredDefaultFile,
  structuredOverrideFile,
], {
  routeLabels: { farm: '农场', cooking: '厨房' },
  sanitizePublicText,
});
assert.equal(structuredEntries.length, 2, 'structured entries should merge valid default and override entries');
const turnipEntry = structuredEntries.find(item => item.id === 'turnip');
assert.equal(turnipEntry.title, '白萝卜更新', 'later structured entry should override the same id');
assert.deepEqual(turnipEntry.routeHints, ['farm'], 'route hints should be restricted to known public routes');
assert.deepEqual(turnipEntry.aliases, ['小萝卜']);
const soupEntry = structuredEntries.find(item => item.id === 'recipe_soup');
assert.equal(soupEntry.title, '萝卜汤');
assert.deepEqual(soupEntry.routeHints, ['cooking']);
assert.equal(
  knowledgeStore.sanitizeStructuredKnowledgeEntry({
    id: 'unsafe-entry',
    title: '安全标题',
    routeHints: ['farm', 'debug'],
    sources: [{ label: '公开来源', detail: 'server/src/internal.js' }],
    relations: ['公开关系', 'private-secret-note'],
  }, {
    routeLabels: { farm: '农场' },
    sanitizePublicText,
  }).sources.length,
  1,
  'structured sanitizer should keep public labels even when private details are removed',
);
assert.equal(
  knowledgeStore.sanitizeStructuredKnowledgeEntry({
    id: 'unsafe-entry',
    title: 'server/src/internal.js',
  }, { sanitizePublicText }),
  null,
  'structured sanitizer should reject entries whose required title becomes unsafe',
);

const scoringEntry = {
  id: 'turnip',
  title: '白萝卜',
  kind: 'crop',
  aliases: ['萝卜'],
  routeHints: ['farm'],
  questionTypes: ['resource-source', 'recipe'],
  summary: '春季作物，可用于料理。',
  unlock: '春季商店解锁',
  fastRoute: '春季去杂货店买种子。',
  recommendedRoute: '先确认体力和背包，再安排播种。',
  routeSteps: ['打开农场', '购买种子'],
  sources: [{ type: 'shop', label: '杂货店', detail: '春季售卖', quantity: '20文', conditions: ['春季'] }],
  uses: [{ type: 'recipe', label: '萝卜汤', detail: '料理材料', quantity: '1个', conditions: ['厨房'] }],
  relations: ['萝卜汤'],
};
const queryPlan = {
  questionTypes: ['resource-source', 'recipe'],
  intents: ['find_source'],
  slots: {
    items: [{ id: 'turnip', canonical: '白萝卜', label: '萝卜', match: '萝卜', matchType: 'official-id' }],
    systems: [{ id: 'crop', canonical: '作物', label: '农作物', match: '作物', routeHints: ['farm'] }],
    locations: [{ id: 'general-store', canonical: '杂货店', label: '杂货店', match: '杂货店' }],
    tasks: [{ id: 'soup-task', canonical: '萝卜汤', label: '萝卜汤', match: '萝卜汤' }],
  },
};
const bareScore = knowledgeStore.scoreStructuredKnowledgeEntry(scoringEntry, '白萝卜', '', {});
const boostedScore = knowledgeStore.scoreStructuredKnowledgeEntry(scoringEntry, '白萝卜从哪来？萝卜汤配方怎么做？', 'farm', queryPlan);
assert.ok(bareScore > 0, 'direct title/alias match should score structured entries');
assert.ok(boostedScore > bareScore + 40, 'route, question type, slots, source/use and recipe boosts should raise the score');
assert.equal(
  knowledgeStore.scoreStructuredKnowledgeEntry(scoringEntry, '', 'farm', queryPlan),
  0,
  'empty question should not retrieve structured entries even when route or slots exist',
);

assert.deepEqual(
  knowledgeStore.formatStructuredKnowledgeRecords(scoringEntry.sources),
  ['杂货店，春季售卖，数量：20文，条件：春季'],
  'structured record formatter should keep detail, quantity and conditions',
);
const structuredContent = knowledgeStore.buildStructuredKnowledgeContent(scoringEntry);
assert.match(structuredContent, /概览：春季作物/, 'structured content should include summary');
assert.match(structuredContent, /路线步骤：\n1\. 打开农场\n2\. 购买种子/, 'structured content should include numbered route steps');
assert.match(structuredContent, /来源：\n1\. 杂货店，春季售卖/, 'structured content should include formatted sources');
assert.match(structuredContent, /用途：\n1\. 萝卜汤，料理材料/, 'structured content should include formatted uses');
assert.match(structuredContent, /关联：萝卜汤/, 'structured content should include relations');

const structuredCandidate = knowledgeStore.buildStructuredKnowledgeCandidate(scoringEntry, boostedScore);
assert.equal(structuredCandidate.id, 'structured_turnip');
assert.equal(structuredCandidate.title, '结构化资料：白萝卜');
assert.deepEqual(structuredCandidate.routeNames, ['farm']);
assert.deepEqual(structuredCandidate.keywords, ['白萝卜', 'crop', '萝卜', '萝卜汤']);
assert.equal(structuredCandidate.access, 'public');
assert.equal(structuredCandidate.sourceType, 'structured-knowledge');
assert.equal(structuredCandidate.moduleType, 'crop');
assert.equal(structuredCandidate.structuredEntry, scoringEntry);

const retrievalResults = knowledgeStore.retrieveStructuredKnowledgeCandidates([
  { id: 'unmatched', title: '蜂蜜', kind: 'resource', summary: '暂不匹配。' },
  scoringEntry,
  {
    id: 'recipe_soup',
    title: '萝卜汤',
    kind: 'recipe',
    aliases: ['汤'],
    routeHints: ['cooking'],
    questionTypes: ['recipe'],
    summary: '基础料理。',
  },
], '白萝卜从哪来？萝卜汤配方怎么做？', 'farm', queryPlan, { limit: 2 });
assert.equal(retrievalResults.length, 2, 'structured retrieval should apply positive-score filtering and limit');
assert.equal(retrievalResults[0].id, 'structured_turnip', 'structured retrieval should sort by score descending');
assert.ok(!retrievalResults.some(item => item.id === 'structured_unmatched'), 'structured retrieval should drop zero-score entries');
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('qa-ai-assistant-knowledge-store passed');
