const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function unique(items = []) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function splitTopics(value) {
  return String(value || '')
    .split(/\r?\n|,|，|;|；/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeKnowledgeStore(raw = {}) {
  return {
    entries: raw && Array.isArray(raw.entries) ? raw.entries : [],
  };
}

function serializeKnowledgeStore(store = {}) {
  const normalized = normalizeKnowledgeStore(store);
  return {
    entries: normalized.entries,
  };
}

function loadKnowledgeStoreFromFile(filePath, options = {}) {
  const fsModule = options.fsModule || fs;
  try {
    if (filePath && fsModule.existsSync(filePath)) {
      const raw = JSON.parse(fsModule.readFileSync(filePath, 'utf8'));
      return normalizeKnowledgeStore(raw);
    }
  } catch {}
  return normalizeKnowledgeStore(null);
}

function saveKnowledgeStoreToFile(filePath, store = {}, options = {}) {
  const fsModule = options.fsModule || fs;
  const pathModule = options.pathModule || path;
  fsModule.mkdirSync(pathModule.dirname(filePath), { recursive: true });
  fsModule.writeFileSync(filePath, JSON.stringify(serializeKnowledgeStore(store), null, 2), 'utf8');
}

function readJsonFile(filePath, fallback = null, options = {}) {
  const fsModule = options.fsModule || fs;
  try {
    if (!filePath || !fsModule.existsSync(filePath)) return fallback;
    return JSON.parse(fsModule.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sanitizeRouteNames(value) {
  return unique(
    toArray(value)
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
}

function sanitizeKeywords(value) {
  const list = Array.isArray(value) ? value : splitTopics(value);
  return unique(
    list
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
}

function sanitizeAccess(value) {
  return value === 'standard' ? 'standard' : 'public';
}

function sanitizeReviewStatus(value) {
  return ['draft', 'published', 'archived'].includes(value) ? value : 'draft';
}

function createKnowledgeId() {
  return `ak_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveTimestamp(options = {}) {
  const value = Number(options.now);
  return Number.isFinite(value) && value > 0 ? value : Date.now();
}

function resolveIdFactory(options = {}) {
  return typeof options.createId === 'function' ? options.createId : createKnowledgeId;
}

function sanitizeKnowledgeEntry(input = {}, fallback = {}, options = {}) {
  const now = resolveTimestamp(options);
  const createId = resolveIdFactory(options);
  const entry = {
    id: String(input.id || fallback.id || createId()),
    title: String(input.title || fallback.title || '').trim() || '未命名知识条目',
    routeNames: sanitizeRouteNames(input.routeNames ?? fallback.routeNames ?? []),
    keywords: sanitizeKeywords(input.keywords ?? fallback.keywords ?? []),
    content: String(input.content ?? fallback.content ?? '').trim(),
    access: sanitizeAccess(input.access ?? fallback.access ?? 'public'),
    enabled: input.enabled !== undefined ? input.enabled !== false : fallback.enabled !== false,
    readonly: false,
    sourceType: String(input.sourceType || fallback.sourceType || 'manual').trim() || 'manual',
    reviewStatus: sanitizeReviewStatus(input.reviewStatus ?? fallback.reviewStatus ?? 'published'),
    sourceRefs: unique(
      toArray(input.sourceRefs ?? fallback.sourceRefs ?? [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ),
    createdAt: Number(input.createdAt ?? fallback.createdAt) || now,
    updatedAt: now,
    metadata: typeof input.metadata === 'object' && input.metadata
      ? input.metadata
      : (typeof fallback.metadata === 'object' && fallback.metadata ? fallback.metadata : {}),
  };

  if (!entry.keywords.length && entry.title) entry.keywords = [entry.title];
  return entry;
}

function buildBuiltinKnowledgeEntries(baseEntries = []) {
  return (Array.isArray(baseEntries) ? baseEntries : []).map(entry => ({
    ...entry,
    enabled: true,
    readonly: true,
    sourceType: 'built-in',
    reviewStatus: 'published',
    sourceRefs: [],
    createdAt: 0,
    updatedAt: 0,
  }));
}

function getManagedKnowledgeEntriesFromStore(store = {}, options = {}) {
  return normalizeKnowledgeStore(store).entries.map(entry => sanitizeKnowledgeEntry(entry, entry, options));
}

function buildPublishedKnowledgeEntries(builtinEntries = [], managedEntries = []) {
  return [
    ...(Array.isArray(builtinEntries) ? builtinEntries : []),
    ...(Array.isArray(managedEntries) ? managedEntries : []).filter(entry => entry.enabled !== false && entry.reviewStatus === 'published'),
  ];
}

function buildActiveKnowledgeEntries(builtinEntries = [], managedEntries = []) {
  return [
    ...(Array.isArray(builtinEntries) ? builtinEntries : []),
    ...(Array.isArray(managedEntries) ? managedEntries : []).filter(entry => entry.enabled !== false && entry.reviewStatus !== 'archived'),
  ];
}

function createKnowledgeNotFoundError() {
  const error = new Error('知识条目不存在');
  error.status = 404;
  return error;
}

function createKnowledgeEntryInStore(store = {}, input = {}, options = {}) {
  const nextStore = normalizeKnowledgeStore(store);
  const entry = sanitizeKnowledgeEntry(input, { reviewStatus: 'published', sourceType: 'manual' }, options);
  nextStore.entries.unshift(entry);
  return { store: nextStore, entry };
}

function updateKnowledgeEntryInStore(store = {}, id, updates = {}, options = {}) {
  const nextStore = normalizeKnowledgeStore(store);
  const index = nextStore.entries.findIndex(entry => String(entry.id) === String(id));
  if (index < 0) throw createKnowledgeNotFoundError();
  const current = sanitizeKnowledgeEntry(nextStore.entries[index], nextStore.entries[index], options);
  const next = sanitizeKnowledgeEntry({ ...current, ...updates, id: current.id, createdAt: current.createdAt }, current, options);
  nextStore.entries[index] = next;
  return { store: nextStore, entry: next };
}

function publishKnowledgeEntryInStore(store = {}, id, options = {}) {
  return updateKnowledgeEntryInStore(store, id, {
    reviewStatus: 'published',
    enabled: true,
  }, options);
}

function deleteKnowledgeEntryInStore(store = {}, id, options = {}) {
  const nextStore = normalizeKnowledgeStore(store);
  const index = nextStore.entries.findIndex(entry => String(entry.id) === String(id));
  if (index < 0) throw createKnowledgeNotFoundError();
  const [removed] = nextStore.entries.splice(index, 1);
  return {
    store: nextStore,
    entry: sanitizeKnowledgeEntry(removed, removed, options),
  };
}

function normalizeSourceKeyText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function createSourceAutoKnowledgeKey(question = '', routeName = '') {
  return `source-auto:${normalizeSourceKeyText(question)}:${routeName || ''}`;
}

function composeSourceKnowledgeContent(question, routeName, sourceHits = [], options = {}) {
  const routeLabels = options.routeLabels || {};
  const intro = routeName && routeLabels[routeName]
    ? `围绕【${routeLabels[routeName]}】相关问题“${question}”，可从源码整理出以下信息：`
    : `围绕问题“${question}”，可从源码整理出以下信息：`;

  const bullets = (Array.isArray(sourceHits) ? sourceHits : [])
    .map((hit, index) => `${index + 1}. ${hit.summary}（来源：${hit.path}）`);
  return [intro, ...bullets, '说明：以上内容由当前项目源码片段整理而来，后续若实现变更，应以最新源码为准。'].join('\n');
}

function resolveSourceDraftKeywords(question, routeName, options = {}) {
  if (typeof options.extractSearchTerms === 'function') {
    return options.extractSearchTerms(question, routeName);
  }
  return sanitizeKeywords(question);
}

function draftKnowledgeFromSource(question, routeName, sourceHits = [], options = {}) {
  if (!Array.isArray(sourceHits) || !sourceHits.length) return null;
  return sanitizeKnowledgeEntry({
    title: String(question || '').trim().slice(0, 80) || '源码整理候选知识',
    routeNames: routeName ? [routeName] : [],
    keywords: resolveSourceDraftKeywords(question, routeName, options),
    content: composeSourceKnowledgeContent(question, routeName, sourceHits, options),
    access: 'public',
    enabled: true,
    sourceType: 'source',
    reviewStatus: 'draft',
    sourceRefs: sourceHits.map(hit => hit.path),
  }, {
    reviewStatus: 'draft',
    sourceType: 'source',
  }, options);
}

function upsertAutoKnowledgeFromSourceInStore(store = {}, question, routeName, sourceHits = [], options = {}) {
  if (!Array.isArray(sourceHits) || !sourceHits.length) {
    return { store: normalizeKnowledgeStore(store), entry: null, created: false, updated: false };
  }

  const nextStore = normalizeKnowledgeStore(store);
  const sourceKey = createSourceAutoKnowledgeKey(question, routeName);
  const draft = sanitizeKnowledgeEntry({
    ...draftKnowledgeFromSource(question, routeName, sourceHits, options),
    metadata: { sourceKey, sourceMode: 'auto' },
  }, {
    reviewStatus: 'draft',
    sourceType: 'source',
  }, options);

  const index = nextStore.entries.findIndex(entry => entry?.metadata?.sourceKey === sourceKey);
  if (index >= 0) {
    const current = sanitizeKnowledgeEntry(nextStore.entries[index], nextStore.entries[index], options);
    nextStore.entries[index] = sanitizeKnowledgeEntry({
      ...current,
      ...draft,
      id: current.id,
      createdAt: current.createdAt,
    }, current, options);
    return { store: nextStore, entry: nextStore.entries[index], created: false, updated: true };
  }

  nextStore.entries.unshift(draft);
  return { store: nextStore, entry: draft, created: true, updated: false };
}

function sanitizeStructuredKnowledgeText(value = '', maxLength = 120, options = {}) {
  const sanitizePublicText = typeof options.sanitizePublicText === 'function'
    ? options.sanitizePublicText
    : (text => String(text ?? '').replace(/\s+/g, ' ').trim());
  return String(sanitizePublicText(value, '') || '').slice(0, maxLength).trim();
}

function sanitizeStructuredKnowledgeRecords(value = [], options = {}) {
  const maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0 ? options.maxItems : 6;
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const type = sanitizeStructuredKnowledgeText(item.type, 40, options);
      const label = sanitizeStructuredKnowledgeText(item.label, 80, options);
      const detail = sanitizeStructuredKnowledgeText(item.detail, 160, options);
      const quantity = sanitizeStructuredKnowledgeText(item.quantity, 40, options);
      const conditions = toArray(item.conditions)
        .map(condition => sanitizeStructuredKnowledgeText(condition, 60, options))
        .filter(Boolean)
        .slice(0, 4);
      if (!label && !detail) return null;
      return { type, label, detail, quantity, conditions };
    })
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeStructuredKnowledgeStringArray(value = [], maxItems = 8, maxLength = 80, options = {}) {
  return unique(
    toArray(value)
      .map(item => sanitizeStructuredKnowledgeText(item, maxLength, options))
      .filter(Boolean)
  ).slice(0, maxItems);
}

function sanitizeStructuredKnowledgeEntry(input = {}, options = {}) {
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object' ? options.routeLabels : {};
  const id = sanitizeStructuredKnowledgeText(input.id, 120, options);
  const title = sanitizeStructuredKnowledgeText(input.title, 80, options);
  if (!id || !title) return null;
  const routeHints = toArray(input.routeHints)
    .map(routeName => String(routeName || '').trim())
    .filter(routeName => routeLabels[routeName])
    .slice(0, 5);

  return {
    id,
    title,
    kind: sanitizeStructuredKnowledgeText(input.kind, 40, options) || 'resource',
    aliases: sanitizeStructuredKnowledgeStringArray(input.aliases, 12, 60, options),
    routeHints,
    questionTypes: sanitizeStructuredKnowledgeStringArray(input.questionTypes, 8, 50, options),
    summary: sanitizeStructuredKnowledgeText(input.summary, 180, options),
    unlock: sanitizeStructuredKnowledgeText(input.unlock || input.unlockStatus, 180, options),
    fastRoute: sanitizeStructuredKnowledgeText(input.fastRoute, 220, options),
    recommendedRoute: sanitizeStructuredKnowledgeText(input.recommendedRoute, 240, options),
    routeSteps: sanitizeStructuredKnowledgeStringArray(input.routeSteps, 5, 140, options),
    sources: sanitizeStructuredKnowledgeRecords(input.sources, { ...options, maxItems: 6 }),
    uses: sanitizeStructuredKnowledgeRecords(input.uses, { ...options, maxItems: 6 }),
    relations: sanitizeStructuredKnowledgeStringArray(input.relations, 8, 60, options),
  };
}

function buildStructuredKnowledgeFingerprint(filePaths = [], options = {}) {
  const fsModule = options.fsModule || fs;
  const hashFactory = typeof options.createHash === 'function' ? options.createHash : algorithm => crypto.createHash(algorithm);
  const hash = hashFactory('sha1');
  for (const filePath of toArray(filePaths)) {
    try {
      if (!filePath || !fsModule.existsSync(filePath)) continue;
      hash.update(String(filePath));
      hash.update(fsModule.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  return hash.digest('hex');
}

function loadStructuredKnowledgeEntriesFromFiles(filePaths = [], options = {}) {
  const readJson = typeof options.readJsonFile === 'function'
    ? options.readJsonFile
    : (filePath => readJsonFile(filePath, {}, options));
  const rawEntries = [];
  for (const filePath of toArray(filePaths)) {
    const data = readJson(filePath, {});
    if (Array.isArray(data?.entries)) rawEntries.push(...data.entries);
  }

  const map = new Map();
  for (const rawEntry of rawEntries) {
    const entry = sanitizeStructuredKnowledgeEntry(rawEntry, options);
    if (entry) map.set(entry.id, entry);
  }
  return Array.from(map.values());
}

function buildBuiltinSearchRules(options = {}) {
  const queryHintRules = Array.isArray(options.queryHintRules) ? options.queryHintRules : [];
  const synonymRules = Array.isArray(options.synonymRules) ? options.synonymRules : [];
  const conceptExpansionRules = Array.isArray(options.conceptExpansionRules) ? options.conceptExpansionRules : [];
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object' ? options.routeLabels : {};

  return {
    queryHints: queryHintRules.map((rule, index) => ({
      id: `builtin-query-${index}`,
      pattern: rule?.test?.source || '',
      flags: rule?.test?.flags || 'i',
      terms: Array.isArray(rule?.terms) ? rule.terms : [],
      routeHints: Array.isArray(rule?.routeHints) ? rule.routeHints : [],
      questionTypes: Array.isArray(rule?.questionTypes) ? rule.questionTypes : [],
    })),
    synonyms: synonymRules.map(rule => ({
      canonical: String(rule?.canonical || '').trim(),
      aliases: Array.isArray(rule?.aliases) ? rule.aliases : [],
    })),
    conceptExpansions: conceptExpansionRules.map((rule, index) => ({
      id: `builtin-concept-${index}`,
      pattern: rule?.test?.source || '',
      flags: rule?.test?.flags || 'i',
      terms: Array.isArray(rule?.terms) ? rule.terms : [],
    })),
    routeAliases: Object.entries(routeLabels).map(([routeName, label]) => ({
      routeName,
      aliases: [label],
    })),
    resourceCatalog: [],
    shopCatalog: [],
  };
}

function buildSearchRulesFingerprint(builtinRules = {}, filePaths = [], options = {}) {
  const fsModule = options.fsModule || fs;
  const hashFactory = typeof options.createHash === 'function' ? options.createHash : algorithm => crypto.createHash(algorithm);
  const hash = hashFactory('sha1');
  hash.update(JSON.stringify(builtinRules || {}));
  for (const filePath of toArray(filePaths)) {
    try {
      if (!filePath || !fsModule.existsSync(filePath)) continue;
      hash.update(String(filePath));
      hash.update(fsModule.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  return hash.digest('hex');
}

function sanitizeSearchRuleStringArray(value) {
  return unique(
    toArray(value)
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
}

function mergeSearchRuleRecords(baseList = [], nextList = [], keyResolver) {
  const map = new Map();
  for (const item of baseList || []) {
    const key = keyResolver(item);
    if (key) map.set(key, { ...item });
  }
  for (const item of nextList || []) {
    const key = keyResolver(item);
    if (!key) continue;
    const current = map.get(key) || {};
    map.set(key, { ...current, ...item });
  }
  return Array.from(map.values());
}

function mergeSearchRules(...sources) {
  return sources.reduce((acc, source) => {
    if (!source || typeof source !== 'object') return acc;
    return {
      queryHints: mergeSearchRuleRecords(acc.queryHints, source.queryHints || [], item => String(item?.id || item?.pattern || '').trim()),
      synonyms: mergeSearchRuleRecords(acc.synonyms, source.synonyms || [], item => String(item?.canonical || '').trim()),
      conceptExpansions: mergeSearchRuleRecords(acc.conceptExpansions, source.conceptExpansions || [], item => String(item?.id || item?.pattern || '').trim()),
      routeAliases: mergeSearchRuleRecords(acc.routeAliases, source.routeAliases || [], item => String(item?.routeName || '').trim()),
      resourceCatalog: mergeSearchRuleRecords(acc.resourceCatalog, source.resourceCatalog || [], item => String(item?.id || item?.title || '').trim()),
      shopCatalog: mergeSearchRuleRecords(acc.shopCatalog, source.shopCatalog || [], item => String(item?.id || item?.title || '').trim()),
    };
  }, {
    queryHints: [],
    synonyms: [],
    conceptExpansions: [],
    routeAliases: [],
    resourceCatalog: [],
    shopCatalog: [],
  });
}

function compileSearchRuleRegExp(pattern = '', flags = 'i') {
  try {
    return new RegExp(String(pattern || ''), String(flags || 'i'));
  } catch {
    return null;
  }
}

function compileSearchRules(raw = {}, options = {}) {
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object' ? options.routeLabels : {};
  const routeAliasLookup = new Map();
  const compiledRouteAliases = (raw.routeAliases || [])
    .map(item => ({
      routeName: String(item?.routeName || '').trim(),
      aliases: sanitizeSearchRuleStringArray(item?.aliases),
    }))
    .filter(item => item.routeName);

  for (const item of compiledRouteAliases) {
    routeAliasLookup.set(item.routeName, unique([
      ...(routeAliasLookup.get(item.routeName) || []),
      ...item.aliases,
      routeLabels[item.routeName] || '',
    ].filter(Boolean)));
  }

  return {
    queryHints: (raw.queryHints || [])
      .map(item => ({
        id: String(item?.id || item?.pattern || '').trim(),
        test: item?.test instanceof RegExp ? item.test : compileSearchRuleRegExp(item?.pattern || item?.test?.source || '', item?.flags || item?.test?.flags || 'i'),
        terms: sanitizeSearchRuleStringArray(item?.terms),
        routeHints: sanitizeSearchRuleStringArray(item?.routeHints),
        questionTypes: sanitizeSearchRuleStringArray(item?.questionTypes),
      }))
      .filter(item => item.test && item.terms.length),
    synonyms: (raw.synonyms || [])
      .map(item => ({
        canonical: String(item?.canonical || '').trim(),
        aliases: sanitizeSearchRuleStringArray(item?.aliases),
        label: String(item?.label || '').trim(),
        slotType: String(item?.slotType || '').trim(),
        officialId: String(item?.officialId || '').trim(),
        routeHints: sanitizeSearchRuleStringArray(item?.routeHints),
        questionTypes: sanitizeSearchRuleStringArray(item?.questionTypes),
      }))
      .filter(item => item.canonical),
    conceptExpansions: (raw.conceptExpansions || [])
      .map(item => ({
        id: String(item?.id || item?.pattern || '').trim(),
        test: item?.test instanceof RegExp ? item.test : compileSearchRuleRegExp(item?.pattern || item?.test?.source || '', item?.flags || item?.test?.flags || 'i'),
        terms: sanitizeSearchRuleStringArray(item?.terms),
      }))
      .filter(item => item.test && item.terms.length),
    routeAliases: compiledRouteAliases,
    routeAliasLookup,
    resourceCatalog: (raw.resourceCatalog || []).map(item => ({
      id: String(item?.id || '').trim(),
      title: String(item?.title || '').trim(),
      aliases: sanitizeSearchRuleStringArray(item?.aliases),
      kind: String(item?.kind || '').trim(),
      slotType: String(item?.slotType || '').trim(),
      terms: sanitizeSearchRuleStringArray(item?.terms),
      sourceTerms: sanitizeSearchRuleStringArray(item?.sourceTerms),
      shopTerms: sanitizeSearchRuleStringArray(item?.shopTerms),
      routeHints: sanitizeSearchRuleStringArray(item?.routeHints),
      questionTypes: sanitizeSearchRuleStringArray(item?.questionTypes),
    })),
    shopCatalog: (raw.shopCatalog || []).map(item => ({
      id: String(item?.id || '').trim(),
      title: String(item?.title || '').trim(),
      aliases: sanitizeSearchRuleStringArray(item?.aliases),
      kind: String(item?.kind || '').trim(),
      slotType: String(item?.slotType || '').trim(),
      terms: sanitizeSearchRuleStringArray(item?.terms),
      routeHints: sanitizeSearchRuleStringArray(item?.routeHints),
      questionTypes: sanitizeSearchRuleStringArray(item?.questionTypes),
    })),
  };
}

function normalizeOptionList(value = []) {
  if (value instanceof Set) return Array.from(value);
  return Array.isArray(value) ? value : [];
}

function createQuerySlotFieldResolver(querySlotTypeToField = {}) {
  const lookup = querySlotTypeToField && typeof querySlotTypeToField === 'object'
    ? querySlotTypeToField
    : {};
  return slotType => {
    const normalized = String(slotType || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
    return lookup[normalized] || '';
  };
}

function sanitizeQuerySlotText(value = '', maxLength = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isUsableQuerySlotAlias(value = '', options = {}) {
  const text = sanitizeQuerySlotText(value);
  if (!text) return false;
  const normalizeText = resolveStructuredKnowledgeNormalizeText(options);
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (/^[a-z0-9_]+$/i.test(text)) return normalized.length >= 2;
  const seasonSlotCandidates = normalizeOptionList(options.seasonSlotCandidates);
  return normalized.length >= 2 || seasonSlotCandidates.some(item => (item.aliases || []).includes(text));
}

function addQuerySlotCandidate(catalog = [], field = '', payload = {}, options = {}) {
  const querySlotFields = normalizeOptionList(options.querySlotFields);
  if (!querySlotFields.includes(field)) return;
  const label = sanitizeQuerySlotText(payload.label || payload.canonical || payload.id);
  const canonical = sanitizeQuerySlotText(payload.canonical || payload.id || label);
  const id = sanitizeQuerySlotText(payload.id || payload.officialId || canonical);
  const aliases = unique([
    id,
    canonical,
    label,
    ...(payload.aliases || []),
    ...(payload.officialIds || []),
  ].map(item => sanitizeQuerySlotText(item)).filter(item => isUsableQuerySlotAlias(item, options)));
  if (!aliases.length) return;

  catalog.push({
    field,
    id,
    canonical,
    label: label || canonical || id,
    aliases,
    officialIds: unique([id, canonical, payload.officialId].map(item => sanitizeQuerySlotText(item)).filter(item => isUsableQuerySlotAlias(item, options))),
    kind: sanitizeQuerySlotText(payload.kind || payload.slotType || '', 40),
    source: sanitizeQuerySlotText(payload.source || 'rules', 40),
    routeHints: sanitizeSearchRuleStringArray(payload.routeHints),
    questionTypes: sanitizeSearchRuleStringArray(payload.questionTypes),
  });
}

function addStructuredRecordSlotCandidates(catalog = [], entry = {}, records = [], fallbackField = '', options = {}) {
  for (const record of records || []) {
    const label = sanitizeQuerySlotText(record?.label);
    if (!label) continue;
    const recordType = sanitizeQuerySlotText(record?.type, 40).toLowerCase();
    if (fallbackField) {
      addQuerySlotCandidate(catalog, fallbackField, {
        id: `${entry.id || 'structured'}:${recordType}:${label}`,
        canonical: label,
        label,
        aliases: [label],
        kind: recordType,
        source: 'structured-knowledge',
        routeHints: entry.routeHints || [],
        questionTypes: entry.questionTypes || [],
      }, options);
    }
  }
}

function buildQuerySlotAliasCatalog(options = {}) {
  const catalog = [];
  const rules = options.rules && typeof options.rules === 'object' ? options.rules : {};
  const routeLabels = options.routeLabels && typeof options.routeLabels === 'object' ? options.routeLabels : {};
  const normalizeText = resolveStructuredKnowledgeNormalizeText(options);
  const normalizeQuerySlotField = createQuerySlotFieldResolver(options.querySlotTypeToField);
  const seasonSlotCandidates = normalizeOptionList(options.seasonSlotCandidates);
  const structuredItemKinds = new Set(normalizeOptionList(options.structuredItemKinds));
  const structuredSystemKinds = new Set(normalizeOptionList(options.structuredSystemKinds));
  const structuredLocationRecordTypes = new Set(normalizeOptionList(options.structuredLocationRecordTypes));
  const structuredTaskRecordTypes = new Set(normalizeOptionList(options.structuredTaskRecordTypes));
  const locationRouteNames = new Set(normalizeOptionList(options.locationRouteNames));
  const sharedOptions = { ...options, seasonSlotCandidates };

  for (const candidate of seasonSlotCandidates) {
    addQuerySlotCandidate(catalog, 'seasons', {
      id: candidate.canonical,
      canonical: candidate.canonical,
      label: candidate.label,
      aliases: candidate.aliases,
      kind: 'season',
      source: 'builtin-season',
    }, sharedOptions);
  }

  for (const rule of rules.synonyms || []) {
    const field = normalizeQuerySlotField(rule.slotType);
    if (!field) continue;
    addQuerySlotCandidate(catalog, field, {
      id: rule.officialId || rule.canonical,
      canonical: rule.canonical,
      label: rule.label || rule.canonical,
      aliases: rule.aliases || [],
      officialId: rule.officialId,
      kind: rule.slotType,
      source: 'search-rule',
      routeHints: rule.routeHints || [],
      questionTypes: rule.questionTypes || [],
    }, sharedOptions);
  }

  for (const item of rules.resourceCatalog || []) {
    addQuerySlotCandidate(catalog, normalizeQuerySlotField(item.slotType || item.kind || 'item'), {
      id: item.id,
      canonical: item.id || item.title,
      label: item.title || item.id,
      aliases: [
        ...(item.aliases || []),
        ...(item.terms || []),
        ...(item.sourceTerms || []),
        ...(item.shopTerms || []),
      ],
      kind: item.kind || item.slotType || 'item',
      source: 'resource-catalog',
      routeHints: item.routeHints || [],
      questionTypes: item.questionTypes || [],
    }, sharedOptions);
  }

  for (const item of rules.shopCatalog || []) {
    addQuerySlotCandidate(catalog, normalizeQuerySlotField(item.slotType || item.kind || 'location'), {
      id: item.id,
      canonical: item.id || item.title,
      label: item.title || item.id,
      aliases: [
        ...(item.aliases || []),
        ...(item.terms || []),
      ],
      kind: item.kind || item.slotType || 'location',
      source: 'shop-catalog',
      routeHints: item.routeHints || ['shop'],
      questionTypes: item.questionTypes || [],
    }, sharedOptions);
  }

  for (const item of rules.routeAliases || []) {
    const routeName = sanitizeQuerySlotText(item.routeName, 40);
    if (!routeName) continue;
    const label = routeLabels[routeName] || (item.aliases || [])[0] || routeName;
    const payload = {
      id: routeName,
      canonical: routeName,
      label,
      aliases: [routeName, label, ...(item.aliases || [])],
      kind: 'system',
      source: 'route-alias',
      routeHints: [routeName],
      questionTypes: ['page-feature'],
    };
    addQuerySlotCandidate(catalog, 'systems', payload, sharedOptions);
    if (locationRouteNames.has(routeName)) {
      addQuerySlotCandidate(catalog, 'locations', { ...payload, kind: 'location' }, sharedOptions);
    }
  }

  for (const entry of options.structuredEntries || []) {
    const kind = sanitizeQuerySlotText(entry.kind, 40);
    const field = structuredItemKinds.has(kind)
      ? 'items'
      : structuredSystemKinds.has(kind)
        ? 'systems'
        : '';
    if (field) {
      addQuerySlotCandidate(catalog, field, {
        id: entry.id,
        canonical: entry.id,
        label: entry.title,
        aliases: [entry.title, kind, ...(entry.aliases || []), ...(entry.relations || [])],
        kind,
        source: 'structured-knowledge',
        routeHints: entry.routeHints || [],
        questionTypes: entry.questionTypes || [],
      }, sharedOptions);
    }

    addStructuredRecordSlotCandidates(
      catalog,
      entry,
      (entry.sources || []).filter(record => structuredLocationRecordTypes.has(String(record?.type || '').toLowerCase())),
      'locations',
      sharedOptions
    );
    addStructuredRecordSlotCandidates(
      catalog,
      entry,
      [...(entry.sources || []), ...(entry.uses || [])].filter(record => {
        const type = String(record?.type || '').toLowerCase();
        const label = String(record?.label || '');
        return structuredTaskRecordTypes.has(type) || /任务|委托|订单|讨伐|周赛|展陈|商路|房间|活动|供货/.test(label);
      }),
      'tasks',
      sharedOptions
    );
  }

  const map = new Map();
  for (const item of catalog) {
    const key = `${item.field}:${normalizeText(item.id || item.label || item.canonical)}`;
    if (!key || key.endsWith(':')) continue;
    const current = map.get(key);
    if (!current) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...current,
      aliases: unique([...(current.aliases || []), ...(item.aliases || [])]),
      officialIds: unique([...(current.officialIds || []), ...(item.officialIds || [])]),
      routeHints: unique([...(current.routeHints || []), ...(item.routeHints || [])]),
      questionTypes: unique([...(current.questionTypes || []), ...(item.questionTypes || [])]),
    });
  }
  return Array.from(map.values());
}

function normalizeStructuredKnowledgeScoreText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function resolveStructuredKnowledgeNormalizeText(options = {}) {
  return typeof options.normalizeText === 'function'
    ? options.normalizeText
    : normalizeStructuredKnowledgeScoreText;
}

function scoreStructuredKnowledgeEntry(entry = {}, question = '', routeName = '', queryPlan = {}, options = {}) {
  const normalizeText = resolveStructuredKnowledgeNormalizeText(options);
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return 0;
  const candidates = unique([
    entry.id,
    entry.title,
    entry.kind,
    ...(entry.aliases || []),
    ...(entry.relations || []),
  ].filter(Boolean));
  const directCandidates = unique([
    entry.id,
    entry.title,
    entry.kind,
    ...(entry.aliases || []),
  ].filter(Boolean));
  let score = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (!normalizedCandidate) continue;
    if (normalizedQuestion.includes(normalizedCandidate)) {
      score += normalizedCandidate.length >= 3 ? 10 : 6;
    }
  }

  if (routeName && (entry.routeHints || []).includes(routeName)) score += 5;
  for (const type of queryPlan.questionTypes || []) {
    if ((entry.questionTypes || []).includes(type)) score += 4;
  }
  for (let index = 0; index < (queryPlan.slots?.items || []).length; index += 1) {
    const item = queryPlan.slots.items[index];
    const slotCandidates = [item.id, item.canonical, item.label, item.match].map(normalizeText).filter(Boolean);
    if (directCandidates.some(candidate => slotCandidates.includes(normalizeText(candidate)))) {
      score += item.matchType === 'official-id' ? 16 : 12;
      if (index === 0) score += 8;
    }
  }
  for (const item of queryPlan.slots?.systems || []) {
    const slotCandidates = [item.id, item.canonical, item.label, item.match, ...(item.routeHints || [])].map(normalizeText).filter(Boolean);
    if (
      slotCandidates.includes(normalizeText(entry.kind))
      || (entry.routeHints || []).some(hint => slotCandidates.includes(normalizeText(hint)))
      || candidates.some(candidate => slotCandidates.includes(normalizeText(candidate)))
    ) {
      score += 8;
    }
  }
  for (const item of queryPlan.slots?.locations || []) {
    const slotCandidates = [item.id, item.canonical, item.label, item.match].map(normalizeText).filter(Boolean);
    const locationMatched = [...(entry.sources || []), ...(entry.uses || [])].some(record => {
      return slotCandidates.includes(normalizeText(record?.label)) || slotCandidates.includes(normalizeText(record?.type));
    });
    if (locationMatched || (entry.routeHints || []).some(hint => slotCandidates.includes(normalizeText(hint)))) score += 6;
  }
  for (const item of queryPlan.slots?.tasks || []) {
    const slotCandidates = [item.id, item.canonical, item.label, item.match].map(normalizeText).filter(Boolean);
    if ([...(entry.sources || []), ...(entry.uses || [])].some(record => slotCandidates.includes(normalizeText(record?.label)))) {
      score += 7;
    }
  }
  if ((queryPlan.intents || []).includes('find_source') && entry.sources?.length) score += 8;
  if (/用途|有什么用|用来|配方|任务|需要|消耗|做什么/i.test(question) && entry.uses?.length) score += 8;
  if (/来源|从哪来|怎么获得|怎么获取|怎么搞|怎么弄|哪里|在哪|去哪|哪买|钓|挖|种/i.test(question) && entry.sources?.length) score += 8;
  if ((entry.kind === 'recipe' || (entry.questionTypes || []).includes('recipe')) && /料理|食谱|配方|怎么做|制作/i.test(question)) score += 8;
  return score;
}

function formatStructuredKnowledgeRecords(records = []) {
  return records.map(item => {
    const parts = [
      item.label,
      item.detail,
      item.quantity ? `数量：${item.quantity}` : '',
      item.conditions?.length ? `条件：${item.conditions.join('、')}` : '',
    ].filter(Boolean);
    return parts.join('，');
  });
}

function buildStructuredKnowledgeContent(entry = {}) {
  const sections = [];
  if (entry.summary) sections.push(`概览：${entry.summary}`);
  if (entry.unlock) sections.push(`解锁：${entry.unlock}`);
  if (entry.fastRoute) sections.push(`最快路线：${entry.fastRoute}`);
  if (entry.recommendedRoute) sections.push(`推荐路线：${entry.recommendedRoute}`);
  if (entry.routeSteps?.length) sections.push(`路线步骤：\n${entry.routeSteps.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  const sources = formatStructuredKnowledgeRecords(entry.sources || []);
  if (sources.length) sections.push(`来源：\n${sources.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  const uses = formatStructuredKnowledgeRecords(entry.uses || []);
  if (uses.length) sections.push(`用途：\n${uses.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  if (entry.relations?.length) sections.push(`关联：${entry.relations.join('、')}`);
  return sections.filter(Boolean).join('\n\n');
}

function buildStructuredKnowledgeCandidate(entry = {}, score = 0) {
  return {
    id: `structured_${entry.id}`,
    title: `结构化资料：${entry.title}`,
    routeNames: entry.routeHints || [],
    keywords: unique([entry.title, entry.kind, ...(entry.aliases || []), ...(entry.relations || [])].filter(Boolean)),
    access: 'public',
    content: buildStructuredKnowledgeContent(entry),
    score,
    sourceType: 'structured-knowledge',
    moduleType: entry.kind,
    routeHints: entry.routeHints || [],
    questionTypes: entry.questionTypes || [],
    structuredEntry: entry,
  };
}

function retrieveStructuredKnowledgeCandidates(entries = [], question = '', routeName = '', queryPlan = {}, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 4;
  return (Array.isArray(entries) ? entries : [])
    .map(entry => ({ entry, score: scoreStructuredKnowledgeEntry(entry, question, routeName, queryPlan, options) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => buildStructuredKnowledgeCandidate(item.entry, item.score));
}

module.exports = {
  toArray,
  unique,
  splitTopics,
  normalizeKnowledgeStore,
  serializeKnowledgeStore,
  readJsonFile,
  loadKnowledgeStoreFromFile,
  saveKnowledgeStoreToFile,
  sanitizeRouteNames,
  sanitizeKeywords,
  sanitizeAccess,
  sanitizeReviewStatus,
  createKnowledgeId,
  sanitizeKnowledgeEntry,
  buildBuiltinKnowledgeEntries,
  getManagedKnowledgeEntriesFromStore,
  buildPublishedKnowledgeEntries,
  buildActiveKnowledgeEntries,
  createKnowledgeEntryInStore,
  updateKnowledgeEntryInStore,
  publishKnowledgeEntryInStore,
  deleteKnowledgeEntryInStore,
  normalizeSourceKeyText,
  createSourceAutoKnowledgeKey,
  composeSourceKnowledgeContent,
  draftKnowledgeFromSource,
  upsertAutoKnowledgeFromSourceInStore,
  sanitizeStructuredKnowledgeText,
  sanitizeStructuredKnowledgeRecords,
  sanitizeStructuredKnowledgeEntry,
  buildStructuredKnowledgeFingerprint,
  loadStructuredKnowledgeEntriesFromFiles,
  buildBuiltinSearchRules,
  buildSearchRulesFingerprint,
  mergeSearchRules,
  compileSearchRules,
  buildQuerySlotAliasCatalog,
  normalizeStructuredKnowledgeScoreText,
  scoreStructuredKnowledgeEntry,
  formatStructuredKnowledgeRecords,
  buildStructuredKnowledgeContent,
  buildStructuredKnowledgeCandidate,
  retrieveStructuredKnowledgeCandidates,
};
