function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function uniqueItems(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

const DEFAULT_SOURCE_MODULE_LABELS = {
  directory: '目录 / 模块概览',
  module: '源码模块',
};

const DEFAULT_SOURCE_SYMBOL_KIND_LABELS = {
  module: '模块符号',
};

const DEFAULT_SOURCE_MAX_FULLFILE_CONTENT_LENGTH = 120000;
const DEFAULT_SOURCE_SKIP_LINE_PATTERN = /(authorization|bearer\s+|api[_ -]?key|secret|password|admin[_ -]?token)/i;

function scoreRetrievedMatchForAnswer(item, queryPlan = {}, options = {}) {
  let score = Number(item?.score) || 0;
  const sourceType = String(item?.sourceType || 'manual');
  const sourceRefs = Array.isArray(item?.sourceRefs) ? item.sourceRefs : [];
  const explicitTargets = queryPlan.explicitTargets || [];
  const primaryIntent = queryPlan.primaryIntent || '';
  const itemPath = String(item?.path || sourceRefs[0] || '');
  const normalizedQuestion = normalizeText(queryPlan.raw || '');
  const matchesExplicitPath = typeof options.matchesExplicitPath === 'function'
    ? options.matchesExplicitPath
    : () => false;
  const internalPathPattern = options.internalPathPattern instanceof RegExp
    ? options.internalPathPattern
    : null;
  const runtimeDataPathPattern = options.runtimeDataPathPattern instanceof RegExp
    ? options.runtimeDataPathPattern
    : null;

  if (queryPlan.sourcePreference === 'strong') {
    if (/^source-/.test(sourceType) || sourceType === 'source') score += 120;
    else score -= 30;
  } else if (queryPlan.sourcePreference === 'high') {
    if (/^source-/.test(sourceType) || sourceType === 'source') score += 60;
  }

  if ((queryPlan.intents || []).includes('locate_symbol') && sourceType === 'source-symbol') score += 80;
  if ((queryPlan.intents || []).includes('find_call_relation') && sourceType === 'source-symbol') score += 60;
  if ((queryPlan.intents || []).includes('find_condition') && sourceType === 'source-index') score += 40;
  if ((queryPlan.intents || []).includes('inspect_directory') && sourceType === 'source-directory') score += 160;
  if (sourceType === 'source-fullfile') score += 120;
  if ((queryPlan.intents || []).includes('find_source') && ['source-index', 'source', 'manual', 'built-in', 'structured-knowledge'].includes(sourceType)) score += 20;

  if (primaryIntent === 'find_source') {
    if (sourceType === 'structured-knowledge') score += 120;
    if (sourceType === 'built-in') score += 90;
    if (sourceType === 'manual') score += 36;
    if (sourceType === 'source-index') score -= 12;
    if (sourceType === 'source-symbol') score -= 24;
  }

  if (primaryIntent === 'gameplay_qa') {
    if (sourceType === 'structured-knowledge') score += 90;
    if (sourceType === 'built-in') score += 70;
    if (sourceType === 'manual') score += 30;
    if (/^source-/.test(sourceType)) score -= 16;
  }

  if (['manual', 'built-in'].includes(sourceType) && normalizedQuestion) {
    const normalizedTitle = normalizeText(item?.title || '');
    const normalizedKeywords = toArray(item?.keywords || []).map(keyword => normalizeText(keyword)).filter(Boolean);
    if (normalizedTitle && normalizedQuestion === normalizedTitle) score += 140;
    else if (normalizedTitle && normalizedQuestion.includes(normalizedTitle)) score += 36;
    if (normalizedKeywords.some(keyword => keyword && normalizedQuestion === keyword)) score += 120;
    else if (normalizedKeywords.some(keyword => keyword && normalizedQuestion.includes(keyword))) score += 28;
  }

  if ((primaryIntent === 'find_source' || primaryIntent === 'gameplay_qa') && internalPathPattern?.test(itemPath)) {
    score -= 220;
  }
  if ((primaryIntent === 'find_source' || primaryIntent === 'gameplay_qa') && runtimeDataPathPattern?.test(itemPath)) {
    score -= 140;
  }

  for (const target of explicitTargets) {
    if (!target) continue;
    if (sourceRefs.some(ref => matchesExplicitPath(ref, target))) score += 70;
    if (matchesExplicitPath(item?.title || '', target) || normalizeText(item?.title || '').includes(normalizeText(target))) score += 30;
  }

  return score;
}

function createRetrievedMatchScorer(options = {}) {
  return (item, queryPlan = {}) => scoreRetrievedMatchForAnswer(item, queryPlan, options);
}

function getRetrievedMatchDedupeKey(item = {}) {
  if (item.sourceType === 'source-fullfile') {
    return `${item.sourceType || ''}|${item.path || item.sourceRefs?.[0] || ''}`;
  }

  return [
    item.sourceType || '',
    item.path || item.sourceRefs?.[0] || '',
    item.symbol || item.name || item.title || '',
    item.startLine || item.lineNumber || '',
    item.endLine || '',
  ].join('|');
}

function dedupeRetrievedMatches(matches = []) {
  const seen = new Set();
  const result = [];

  for (const item of matches) {
    if (!item || typeof item !== 'object') continue;
    const key = getRetrievedMatchDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function isRuntimeSensitiveSourceItem(item = {}, options = {}) {
  const runtimeDataPathPattern = options.runtimeDataPathPattern instanceof RegExp
    ? options.runtimeDataPathPattern
    : null;
  const itemPath = String(item?.path || item?.sourceRefs?.[0] || '');
  return Boolean(runtimeDataPathPattern?.test(itemPath)) || item?.moduleType === 'runtime-data';
}

function filterRetrievedMatchesForAudience(matches = [], queryPlan = {}, options = {}) {
  if (queryPlan.sourcePreference === 'strong') return matches;
  if (!['find_source', 'gameplay_qa'].includes(queryPlan.primaryIntent || '')) return matches;

  const safeMatches = matches.filter(item => !isRuntimeSensitiveSourceItem(item, options));
  return safeMatches.length ? safeMatches : matches;
}

function buildSourceIndexMatches(indexHits = [], options = {}) {
  const sourceModuleLabels = options.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;
  return indexHits.map((hit, index) => ({
    id: `source_index_${index}_${normalizeText(hit.path)}_${hit.startLine}`,
    title: `源码索引：${hit.title}`,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      hit.summary,
      `模块类型：${hit.moduleLabel || sourceModuleLabels.module || DEFAULT_SOURCE_MODULE_LABELS.module}`,
      hit.routeHints?.length ? `关联页面：${hit.routeHints.join(' / ')}` : '',
      hit.questionTypes?.length ? `适合问题：${hit.questionTypes.join(' / ')}` : '',
      hit.keyFunctions?.length ? `关键函数：${hit.keyFunctions.join('、')}` : '',
      hit.shopSignals?.length ? `商店/资源线索：${hit.shopSignals.join('；')}` : '',
      hit.conditionHints?.length ? `条件线索：${hit.conditionHints.join('；')}` : '',
      `来源文件：${hit.path}（约 ${hit.startLine}-${hit.endLine} 行）`,
      `相关片段：\n${hit.content}`,
    ].filter(Boolean).join('\n\n'),
    score: Math.max(1, hit.score || 1),
    sourceType: 'source-index',
    sourceRefs: [hit.path],
    path: hit.path,
    startLine: hit.startLine,
    endLine: hit.endLine,
    moduleType: hit.moduleType,
    moduleLabel: hit.moduleLabel,
    symbol: hit.keyFunctions?.[0] || '',
  }));
}

function buildSourceSymbolMatches(symbolHits = [], options = {}) {
  const sourceSymbolKindLabels = options.sourceSymbolKindLabels || DEFAULT_SOURCE_SYMBOL_KIND_LABELS;
  return symbolHits.map((hit, index) => ({
    id: `source_symbol_${index}_${normalizeText(hit.path)}_${normalizeText(hit.name)}`,
    title: `源码符号：${hit.name}`,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      `符号类型：${hit.kindLabel || sourceSymbolKindLabels.module || DEFAULT_SOURCE_SYMBOL_KIND_LABELS.module}`,
      `来源文件：${hit.path}${hit.lineNumber ? `（第 ${hit.lineNumber} 行附近）` : ''}`,
      hit.importSource ? `关联来源：${hit.importSource}` : '',
      hit.routeHints?.length ? `关联页面：${hit.routeHints.join(' / ')}` : '',
      `相关片段：\n${hit.content}`,
    ].filter(Boolean).join('\n\n'),
    score: Math.max(1, hit.score || 1),
    sourceType: 'source-symbol',
    sourceRefs: [hit.path],
    path: hit.path,
    symbol: hit.name,
    symbolKind: hit.kind,
    lineNumber: hit.lineNumber,
    moduleType: hit.moduleType,
    moduleLabel: hit.moduleLabel,
  }));
}

function buildSourceDirectoryMatches(directoryHits = [], options = {}) {
  const sourceModuleLabels = options.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;
  return directoryHits.map((hit, index) => ({
    id: `source_directory_${index}_${normalizeText(hit.path)}`,
    title: hit.title,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      hit.content,
      `模块类型：${hit.moduleLabel || sourceModuleLabels.directory || DEFAULT_SOURCE_MODULE_LABELS.directory}`,
    ].filter(Boolean).join('\n\n'),
    score: Math.max(1, hit.score || 1),
    sourceType: 'source-directory',
    sourceRefs: [hit.path],
    path: hit.path,
    moduleType: hit.moduleType,
    moduleLabel: hit.moduleLabel,
  }));
}

function buildSourceKnowledgeMatches(sourceHits = []) {
  return sourceHits.map((hit, index) => ({
    id: `source_${index}_${normalizeText(hit.path)}`,
    title: `源码补充：${hit.path}`,
    routeNames: [],
    keywords: [],
    access: 'public',
    content: `${hit.summary}\n\n来源文件：${hit.path}`,
    score: Math.max(1, hit.score || 1),
    sourceType: 'source',
    sourceRefs: [hit.path],
    path: hit.path,
    snippet: hit.snippet,
  }));
}

function sanitizeFullSourceContent(text = '', options = {}) {
  const skipLinePattern = options.skipLinePattern instanceof RegExp
    ? options.skipLinePattern
    : DEFAULT_SOURCE_SKIP_LINE_PATTERN;
  return String(text || '')
    .split(/\r?\n/)
    .map(line => (skipLinePattern.test(line) ? '[已过滤敏感行]' : line))
    .join('\n')
    .trim();
}

function formatFullSourceContentForEvidence(text = '', options = {}) {
  const maxLength = Math.max(
    1,
    Number(options.maxLength || DEFAULT_SOURCE_MAX_FULLFILE_CONTENT_LENGTH) || DEFAULT_SOURCE_MAX_FULLFILE_CONTENT_LENGTH
  );
  const safeText = sanitizeFullSourceContent(text, options);
  if (!safeText) {
    return {
      content: '',
      truncated: false,
      originalLength: 0,
    };
  }

  if (safeText.length <= maxLength) {
    return {
      content: safeText,
      truncated: false,
      originalLength: safeText.length,
    };
  }

  return {
    content: [
      safeText.slice(0, maxLength),
      '',
      `[文件过大，已截断展示。原始长度 ${safeText.length} 字符；当前仅展示前 ${maxLength} 字符。]`,
    ].join('\n'),
    truncated: true,
    originalLength: safeText.length,
  };
}

function selectExpandedFullFileMatches(matches = [], limit = 4) {
  const deduped = new Map();

  for (const item of matches) {
    const filePath = String(item?.path || item?.sourceRefs?.[0] || '');
    if (!filePath) continue;
    const current = deduped.get(filePath);
    if (!current || (Number(item.score) || 0) > (Number(current.score) || 0)) {
      deduped.set(filePath, item);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, Math.max(1, Number(limit) || 1));
}

function createFullFileMatch(relativePath = '', options = {}, adapters = {}) {
  const resolveFilePath = typeof adapters.resolveFilePath === 'function'
    ? adapters.resolveFilePath
    : () => '';
  const readFileText = typeof adapters.readFileText === 'function'
    ? adapters.readFileText
    : () => '';
  const detectModuleType = typeof adapters.detectModuleType === 'function'
    ? adapters.detectModuleType
    : () => 'module';
  const sourceModuleLabels = adapters.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;

  const absPath = resolveFilePath(relativePath);
  if (!absPath) return null;

  const moduleType = String(options.moduleType || detectModuleType(relativePath) || 'module');
  const moduleLabel = sourceModuleLabels[moduleType] || sourceModuleLabels.module || DEFAULT_SOURCE_MODULE_LABELS.module;

  try {
    const rawText = readFileText(absPath, relativePath);
    const fullFile = formatFullSourceContentForEvidence(rawText, adapters);
    if (!fullFile.content) return null;

    return {
      id: `source_fullfile_${normalizeText(relativePath)}`,
      title: `完整文件：${relativePath}`,
      routeNames: [],
      keywords: uniqueItems([
        relativePath,
        ...String(relativePath || '').split(/[\\/._-]/).filter(Boolean),
        ...(options.keywords || []),
      ]),
      access: 'public',
      content: [
        options.originTitle ? `命中来源：${options.originTitle}` : '',
        `模块类型：${moduleLabel}`,
        `来源文件：${relativePath}`,
        options.lineNumber ? `命中位置：第 ${options.lineNumber} 行附近` : '',
        `完整文件内容：\n${fullFile.content}`,
      ].filter(Boolean).join('\n\n'),
      score: Math.max(1, Number(options.score) || 1),
      sourceType: 'source-fullfile',
      sourceRefs: [relativePath],
      path: relativePath,
      symbol: options.symbol || '',
      symbolKind: options.symbolKind || '',
      lineNumber: Number(options.lineNumber || 0) || undefined,
      moduleType,
      moduleLabel,
      contentMode: 'full-file',
      originTitle: String(options.originTitle || '').trim(),
      originSourceType: String(options.originSourceType || '').trim(),
      truncated: fullFile.truncated === true,
      originalLength: fullFile.originalLength,
    };
  } catch {
    return null;
  }
}

function isDirectoryChildFile(entry = {}) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.isFile === 'function') return entry.isFile();
  return entry.isFile === true;
}

function defaultJoinPath(basePath = '', childName = '') {
  const base = String(basePath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const child = String(childName || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return [base, child].filter(Boolean).join('/');
}

function buildDirectoryFullFileMatches(directoryMatch = {}, queryPlan = {}, adapters = {}) {
  if (!directoryMatch?.path) return [];

  const resolveDirectoryTarget = typeof adapters.resolveDirectoryTarget === 'function'
    ? adapters.resolveDirectoryTarget
    : () => null;
  const listDirectoryChildren = typeof adapters.listDirectoryChildren === 'function'
    ? adapters.listDirectoryChildren
    : () => [];
  const isAllowedFile = typeof adapters.isAllowedFile === 'function'
    ? adapters.isAllowedFile
    : () => true;
  const isBlockedPath = typeof adapters.isBlockedPath === 'function'
    ? adapters.isBlockedPath
    : () => false;
  const joinPath = typeof adapters.joinPath === 'function'
    ? adapters.joinPath
    : defaultJoinPath;
  const readFileText = typeof adapters.readFileText === 'function'
    ? adapters.readFileText
    : () => '';
  const scoreSourceFile = typeof adapters.scoreSourceFile === 'function'
    ? adapters.scoreSourceFile
    : () => 0;
  const detectModuleType = typeof adapters.detectModuleType === 'function'
    ? adapters.detectModuleType
    : () => 'module';
  const createFullFileMatchForDirectory = typeof adapters.createFullFileMatch === 'function'
    ? adapters.createFullFileMatch
    : (relativePath, options) => createFullFileMatch(relativePath, options, adapters);

  const resolvedDir = resolveDirectoryTarget(directoryMatch.path);
  if (!resolvedDir?.abs) return [];

  return listDirectoryChildren(resolvedDir.abs)
    .filter(entry => isDirectoryChildFile(entry))
    .filter(entry => isAllowedFile(entry.name, entry, resolvedDir))
    .filter(entry => !isBlockedPath(joinPath(resolvedDir.abs, entry.name), entry, resolvedDir))
    .map(entry => {
      const childRelativePath = `${resolvedDir.path}/${entry.name}`.replace(/\\/g, '/');
      const childAbsPath = joinPath(resolvedDir.abs, entry.name);
      let score = Math.max(1, Number(directoryMatch.score) || 1) - 12;

      try {
        const text = readFileText(childAbsPath, childRelativePath);
        score += scoreSourceFile(
          childAbsPath,
          text,
          queryPlan.sourceTerms || [],
          queryPlan.routeName || '',
          queryPlan.explicitTargets || [],
          queryPlan
        );
      } catch {}

      return createFullFileMatchForDirectory(childRelativePath, {
        moduleType: detectModuleType(childRelativePath),
        originTitle: directoryMatch.title,
        originSourceType: directoryMatch.sourceType || 'source-directory',
        score,
        keywords: directoryMatch.keywords || [],
      });
    })
    .filter(Boolean);
}

function expandRetrievedMatchesToFullFiles(matches = [], queryPlan = {}, options = {}) {
  const buildDirectoryMatches = typeof options.buildDirectoryFullFileMatches === 'function'
    ? options.buildDirectoryFullFileMatches
    : (directoryMatch, plan) => buildDirectoryFullFileMatches(directoryMatch, plan, options);
  const createFullFileMatchForSource = typeof options.createFullFileMatch === 'function'
    ? options.createFullFileMatch
    : (relativePath, matchOptions) => createFullFileMatch(relativePath, matchOptions, options);
  const selectFullFileMatches = typeof options.selectExpandedFullFileMatches === 'function'
    ? options.selectExpandedFullFileMatches
    : selectExpandedFullFileMatches;
  const directoryFullFileLimit = Math.max(1, Number(options.directoryFullFileLimit) || 4);
  const fullFileLimit = Math.max(1, Number(options.fullFileLimit) || 4);

  const passthrough = [];
  const fullFileCandidates = [];

  for (const item of matches) {
    if (!item || typeof item !== 'object') continue;

    if (item.sourceType === 'source-directory') {
      passthrough.push(item);
      if (queryPlan.sourcePreference === 'strong' || (queryPlan.intents || []).includes('inspect_directory')) {
        fullFileCandidates.push(...buildDirectoryMatches(item, queryPlan).slice(0, directoryFullFileLimit));
      }
      continue;
    }

    if (item.sourceType === 'source-fullfile') {
      fullFileCandidates.push(item);
      continue;
    }

    if (['source-index', 'source-symbol', 'source'].includes(item.sourceType) && item.path) {
      const fullFileMatch = createFullFileMatchForSource(item.path, {
        moduleType: item.moduleType,
        originTitle: item.title,
        originSourceType: item.sourceType,
        score: item.score,
        symbol: item.symbol || item.name || '',
        symbolKind: item.symbolKind || item.kind || '',
        lineNumber: item.lineNumber || item.startLine || 0,
        keywords: item.keywords || [],
      });
      if (fullFileMatch) {
        fullFileCandidates.push(fullFileMatch);
        continue;
      }
    }

    passthrough.push(item);
  }

  return [...passthrough, ...selectFullFileMatches(fullFileCandidates, fullFileLimit)];
}

function buildRecallCandidatePools(payload = {}, options = {}) {
  const queryPlan = payload.queryPlan || {};
  const buildDirectoryMatches = typeof options.buildSourceDirectoryMatches === 'function'
    ? options.buildSourceDirectoryMatches
    : buildSourceDirectoryMatches;
  const buildSymbolMatches = typeof options.buildSourceSymbolMatches === 'function'
    ? options.buildSourceSymbolMatches
    : buildSourceSymbolMatches;
  const buildIndexMatches = typeof options.buildSourceIndexMatches === 'function'
    ? options.buildSourceIndexMatches
    : buildSourceIndexMatches;
  const buildKnowledgeMatches = typeof options.buildSourceKnowledgeMatches === 'function'
    ? options.buildSourceKnowledgeMatches
    : buildSourceKnowledgeMatches;
  const dedupeMatches = typeof options.dedupeRetrievedMatches === 'function'
    ? options.dedupeRetrievedMatches
    : dedupeRetrievedMatches;
  const rerankMatches = typeof options.rerankRetrievedMatches === 'function'
    ? options.rerankRetrievedMatches
    : (matches, plan) => rerankRetrievedMatches(matches, plan, options.rerankOptions || options);
  const stage1PoolLimit = Math.max(0, Number(options.stage1PoolLimit) || 0);
  const finalLimit = Math.max(0, Number(options.finalLimit) || 0);

  const stage1Pool = dedupeMatches([
    ...(Array.isArray(payload.knowledgeMatches) ? payload.knowledgeMatches : []),
    ...buildDirectoryMatches(Array.isArray(payload.sourceDirectoryHits) ? payload.sourceDirectoryHits : []),
    ...buildSymbolMatches(Array.isArray(payload.sourceSymbolHits) ? payload.sourceSymbolHits : []),
    ...buildIndexMatches(Array.isArray(payload.sourceIndexHits) ? payload.sourceIndexHits : []),
    ...buildKnowledgeMatches(Array.isArray(payload.sourceHits) ? payload.sourceHits : []),
    ...(Array.isArray(payload.nounLexiconCandidates) ? payload.nounLexiconCandidates : []),
  ])
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, stage1PoolLimit);

  const finalMatches = dedupeMatches(rerankMatches(stage1Pool, queryPlan)).slice(0, finalLimit);
  return { stage1Pool, finalMatches };
}

function shouldSearchSource(matches = [], queryPlan = {}) {
  const plan = queryPlan && typeof queryPlan === 'object'
    ? queryPlan
    : { raw: queryPlan };
  const rawQuestion = String(plan?.raw || '');
  const topScore = Number(matches?.[0]?.score || 0) || 0;

  if (plan?.needsSourceSearch) return true;

  if ((plan?.primaryIntent === 'find_source' || plan?.primaryIntent === 'gameplay_qa') && matches.length >= 1 && topScore >= 10) {
    return false;
  }

  if (/在哪里|在哪|哪买|购买|获得|获取|材料|来源|喂|配方|条件|前置|怎么做/i.test(rawQuestion)) {
    return true;
  }
  if (!matches.length) return true;
  return matches.length < 2 || topScore < 8;
}

function rerankRetrievedMatches(matches = [], queryPlan = {}, options = {}) {
  const expandMatches = typeof options.expandMatches === 'function'
    ? options.expandMatches
    : value => value;
  const expandedMatches = expandMatches(matches, queryPlan);
  return filterRetrievedMatchesForAudience(expandedMatches, queryPlan, options)
    .map(item => ({
      ...item,
      responseScore: scoreRetrievedMatchForAnswer(item, queryPlan, options),
    }))
    .sort((a, b) => b.responseScore - a.responseScore);
}

module.exports = {
  normalizeText,
  scoreRetrievedMatchForAnswer,
  createRetrievedMatchScorer,
  getRetrievedMatchDedupeKey,
  dedupeRetrievedMatches,
  isRuntimeSensitiveSourceItem,
  filterRetrievedMatchesForAudience,
  buildSourceIndexMatches,
  buildSourceSymbolMatches,
  buildSourceDirectoryMatches,
  buildSourceKnowledgeMatches,
  sanitizeFullSourceContent,
  formatFullSourceContentForEvidence,
  selectExpandedFullFileMatches,
  createFullFileMatch,
  buildDirectoryFullFileMatches,
  expandRetrievedMatchesToFullFiles,
  buildRecallCandidatePools,
  shouldSearchSource,
  rerankRetrievedMatches,
};
