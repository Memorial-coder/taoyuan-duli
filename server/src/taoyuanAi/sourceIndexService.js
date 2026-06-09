const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function uniqueItems(items = []) {
  return Array.from(new Set((Array.isArray(items) ? items : []).filter(Boolean)));
}

function splitIdentifierTerms(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const expanded = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\\/._-]+/g, ' ');

  return uniqueItems(
    (expanded.match(/[A-Za-z0-9_\u4e00-\u9fa5]+/g) || [])
      .map(item => item.trim())
      .filter(item => item.length >= 2 && item.length <= 40)
  );
}

function normalizePathTarget(value = '') {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function hasSupportedSourceExtension(value = '') {
  return /\.(?:js|ts|vue|json|md|html)$/i.test(String(value || ''));
}

const DEFAULT_SOURCE_ALLOWED_EXTENSIONS = new Set(['.js', '.ts', '.vue', '.json', '.md', '.html']);
const DEFAULT_SOURCE_MAX_FILE_SIZE = 2 * 1024 * 1024;
const DEFAULT_SOURCE_BLOCKED_PATH_PATTERN = /(^|[\\/])(node_modules|dist|build|coverage|\.git|taoyuan_hall_uploads|taoyuan_saves)([\\/]|$)|(^|[\\/])\.env(\.|$)|package-lock\.json$|(^|[\\/])(taoyuan_ai_source_index|taoyuan_ai_knowledge|taoyuan_ai_noun_lexicon)\.json$/i;

function isBlockedSourcePath(filePath = '', blockedPathPattern = DEFAULT_SOURCE_BLOCKED_PATH_PATTERN) {
  if (!blockedPathPattern) return false;
  if (typeof blockedPathPattern === 'function') return blockedPathPattern(filePath) === true;
  if (blockedPathPattern instanceof RegExp) {
    blockedPathPattern.lastIndex = 0;
    return blockedPathPattern.test(String(filePath || ''));
  }
  return false;
}

function walkSourceFiles(dir = '', bucket = [], options = {}) {
  const fsModule = options.fsModule || fs;
  const pathModule = options.pathModule || path;
  const allowedExtensions = options.allowedExtensions instanceof Set
    ? options.allowedExtensions
    : DEFAULT_SOURCE_ALLOWED_EXTENSIONS;
  const maxFileSize = Math.max(1, Number(options.maxFileSize) || DEFAULT_SOURCE_MAX_FILE_SIZE);
  const blockedPathPattern = options.blockedPathPattern || DEFAULT_SOURCE_BLOCKED_PATH_PATTERN;

  if (!dir || !fsModule.existsSync(dir)) return;
  try {
    const stat = fsModule.statSync(dir);
    if (stat.isFile()) {
      if (isBlockedSourcePath(dir, blockedPathPattern)) return;
      const ext = pathModule.extname(dir).toLowerCase();
      if (allowedExtensions.has(ext) && stat.size <= maxFileSize) bucket.push(dir);
      return;
    }
  } catch {
    return;
  }

  let entries = [];
  try {
    entries = fsModule.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = pathModule.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isBlockedSourcePath(full, blockedPathPattern)) continue;
      walkSourceFiles(full, bucket, options);
      continue;
    }
    if (isBlockedSourcePath(full, blockedPathPattern)) continue;
    const ext = pathModule.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    try {
      const stat = fsModule.statSync(full);
      if (stat.size <= maxFileSize) bucket.push(full);
    } catch {}
  }
}

function collectSourceFiles(sourceRoots = [], options = {}) {
  const roots = (Array.isArray(sourceRoots) ? sourceRoots : [])
    .map(root => (typeof root === 'string' ? { abs: root } : root))
    .filter(root => root && root.abs);
  const bucket = [];
  for (const root of roots) walkSourceFiles(root.abs, bucket, options);
  return uniqueItems(bucket).sort();
}

function buildSourceFilesFingerprint(filePaths = [], options = {}) {
  const fsModule = options.fsModule || fs;
  const cryptoModule = options.cryptoModule || crypto;
  const hash = cryptoModule.createHash(options.algorithm || 'sha1');
  const toRelativePath = typeof options.toRelativePath === 'function'
    ? options.toRelativePath
    : filePath => String(filePath || '').replace(/\\/g, '/');
  for (const seed of (Array.isArray(options.seeds) ? options.seeds : [])) {
    hash.update(String(seed ?? ''));
  }
  for (const filePath of (Array.isArray(filePaths) ? filePaths : [])) {
    try {
      const stat = fsModule.statSync(filePath);
      hash.update(`${toRelativePath(filePath)}|${stat.size}|${Math.floor(stat.mtimeMs)}\n`);
    } catch {}
  }
  return hash.digest('hex');
}

function buildNounLexiconFingerprint(filePaths = [], options = {}) {
  return buildSourceFilesFingerprint(filePaths, {
    ...options,
    seeds: [
      Number(options.version) || 0,
      options.searchRulesFingerprint || '',
      typeof options.routeLabelsSeed === 'string'
        ? options.routeLabelsSeed
        : JSON.stringify(options.routeLabels || {}),
      ...(Array.isArray(options.seeds) ? options.seeds : []),
    ],
  });
}

function buildSourceIndexFingerprint(filePaths = [], options = {}) {
  return buildSourceFilesFingerprint(filePaths, {
    ...options,
    seeds: [
      Number(options.version) || 0,
      options.searchRulesFingerprint || '',
      options.nounLexiconFingerprint || '',
      ...(Array.isArray(options.seeds) ? options.seeds : []),
    ],
  });
}

function scoreExplicitPathMatch(candidatePath = '', target = '') {
  const normalizedCandidatePath = normalizePathTarget(candidatePath);
  const normalizedTargetPath = normalizePathTarget(target);
  const normalizedCandidateText = normalizeText(candidatePath);
  const normalizedTargetText = normalizeText(target);
  let score = 0;

  if (normalizedCandidatePath && normalizedTargetPath) {
    if (normalizedCandidatePath === normalizedTargetPath) score = Math.max(score, 240);
    else if (normalizedCandidatePath.startsWith(`${normalizedTargetPath}/`)) score = Math.max(score, 190);
    else if (normalizedCandidatePath.includes(normalizedTargetPath)) score = Math.max(score, 130);
  }

  if (normalizedCandidateText && normalizedTargetText) {
    if (normalizedCandidateText === normalizedTargetText) score = Math.max(score, 150);
    else if (normalizedCandidateText.includes(normalizedTargetText)) score = Math.max(score, 95);
  }

  return score;
}

function matchesExplicitPath(candidatePath = '', target = '') {
  return scoreExplicitPathMatch(candidatePath, target) > 0;
}

function moduleHintMatches(moduleHint = '', moduleType = '') {
  if (!moduleHint || !moduleType) return false;
  if (moduleHint === moduleType) return true;
  if (moduleHint === 'data' && ['data', 'default-data', 'runtime-data'].includes(moduleType)) return true;
  return false;
}

function detectSourceModuleType(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  if (/^taoyuan-main\/src\/views\//.test(normalized)) return 'view';
  if (/^taoyuan-main\/src\/stores\//.test(normalized)) return 'store';
  if (/^taoyuan-main\/src\/data\//.test(normalized)) return 'data';
  if (/^taoyuan-main\/src\/router\//.test(normalized)) return 'router';
  if (/^taoyuan-main\/electron\//.test(normalized)) return 'electron';
  if (/^taoyuan-main\/docs\//.test(normalized)) return 'docs';
  if (/^taoyuan-main\/readme\.md$/.test(normalized) || /(?:^|\/)readme\.md$/.test(normalized)) return 'docs';
  if (/(?:^|\/)(guide|guide-book|index)\.(md|html)$/.test(normalized)) return 'docs';
  if (/^data-defaults\//.test(normalized)) return 'default-data';
  if (/^data\//.test(normalized)) return 'runtime-data';
  if (/^taoyuan-main\/src\/utils\//.test(normalized)) return 'utils';
  if (/^taoyuan-main\/src\/components\//.test(normalized)) return 'component';
  if (/^server\/src\/routes\//.test(normalized)) return 'routes';
  return 'module';
}

const DEFAULT_SOURCE_MODULE_LABELS = {
  view: '前端页面',
  store: '前端状态',
  data: '前端数据',
  router: '前端路由',
  component: '前端组件',
  utils: '前端工具',
  routes: '服务端接口',
  docs: '文档',
  directory: '目录',
  module: '源码模块',
};

const DEFAULT_SOURCE_DIRECTORY_CHILD_LIMIT = 8;

const DEFAULT_SOURCE_SYMBOL_KIND_LABELS = {
  function: '函数',
  const: '常量/变量',
  class: '类',
  interface: '接口',
  type: '类型',
  store: '状态仓库',
  route: '接口路由',
  import: '导入',
  're-export': '再导出',
  module: '模块',
};

const DEFAULT_SKIP_LINE_PATTERN = /(authorization|bearer\s+|api[_ -]?key|secret|password|admin[_ -]?token)/i;
const DEFAULT_SOURCE_SEMANTIC_MAX_BLOCK_LINES = 72;
const DEFAULT_SOURCE_SEMANTIC_TARGET_BLOCK_LINES = 44;

function createSourceSymbolEntry({
  relativePath,
  moduleType,
  routeHints,
  name,
  kind,
  lineNumber,
  content,
  importSource = '',
  exported = false,
} = {}, adapters = {}) {
  const safeName = String(name || '').trim();
  if (!safeName) return null;

  const sourceModuleLabels = adapters.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;
  const sourceSymbolKindLabels = adapters.sourceSymbolKindLabels || DEFAULT_SOURCE_SYMBOL_KIND_LABELS;
  const safeContent = String(content || '').trim();
  const safeRelativePath = String(relativePath || '').replace(/\\/g, '/');
  const safeModuleType = moduleType || detectSourceModuleType(safeRelativePath);
  const safeKind = String(kind || 'module').trim() || 'module';
  const safeLineNumber = Math.max(1, Number(lineNumber) || 1);
  const moduleLabel = sourceModuleLabels[safeModuleType] || sourceModuleLabels.module || DEFAULT_SOURCE_MODULE_LABELS.module;
  const keywords = uniqueItems([
    safeName,
    ...splitIdentifierTerms(safeName),
    ...safeRelativePath.split(/[\\/._-]/).filter(Boolean),
    ...splitIdentifierTerms(importSource),
    ...((safeContent.match(/[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fa5]{2,12}/g) || []).slice(0, 20)),
  ]);

  return {
    id: `symbol:${safeRelativePath}:${safeKind}:${safeName}:${safeLineNumber}`,
    path: safeRelativePath,
    name: safeName,
    kind: safeKind,
    kindLabel: sourceSymbolKindLabels[safeKind] || sourceSymbolKindLabels.module || DEFAULT_SOURCE_SYMBOL_KIND_LABELS.module,
    title: `${safeName} · ${safeRelativePath}`,
    moduleType: safeModuleType,
    moduleLabel,
    routeHints: uniqueItems(routeHints || []),
    lineNumber: safeLineNumber,
    importSource: String(importSource || ''),
    exported: exported === true,
    content: safeContent.slice(0, 320),
    keywords,
  };
}

function collectImportNames(raw = '') {
  return uniqueItems(
    String(raw || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => item.replace(/\bas\b.+$/i, '').trim())
      .filter(Boolean)
  );
}

function createSourceSymbolEntriesForText(relativePath = '', text = '', options = {}) {
  const safeRelativePath = String(relativePath || '').replace(/\\/g, '/');
  const moduleType = options.moduleType || detectSourceModuleType(safeRelativePath);
  const routeHints = uniqueItems(options.routeHints || []);
  const skipLinePattern = options.skipLinePattern || DEFAULT_SKIP_LINE_PATTERN;
  const lines = String(text || '').split(/\r?\n/);
  const entries = [];
  const adapters = {
    sourceModuleLabels: options.sourceModuleLabels,
    sourceSymbolKindLabels: options.sourceSymbolKindLabels,
  };

  const pushEntry = (payload) => {
    const entry = createSourceSymbolEntry({
      relativePath: safeRelativePath,
      moduleType,
      routeHints,
      ...payload,
    }, adapters);
    if (entry) entries.push(entry);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    if (!line || skipLinePattern.test(line)) continue;

    let match = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (match) {
      pushEntry({ name: match[1], kind: 'function', lineNumber: index + 1, content: line, exported: /export\s+/.test(line) });
    }

    match = line.match(/(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)/);
    if (match) {
      const kind = /defineStore\(/.test(line) ? 'store' : 'const';
      pushEntry({ name: match[1], kind, lineNumber: index + 1, content: line, exported: /export\s+/.test(line) });
    }

    match = line.match(/(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
    if (match) {
      pushEntry({ name: match[1], kind: 'class', lineNumber: index + 1, content: line, exported: /export\s+/.test(line) });
    }

    match = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
    if (match) {
      pushEntry({ name: match[1], kind: 'interface', lineNumber: index + 1, content: line, exported: /export\s+/.test(line) });
    }

    match = line.match(/(?:export\s+)?type\s+([A-Za-z0-9_]+)/);
    if (match) {
      pushEntry({ name: match[1], kind: 'type', lineNumber: index + 1, content: line, exported: /export\s+/.test(line) });
    }

    match = line.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*defineStore\((['"`])([^'"`]+)\2/);
    if (match) {
      pushEntry({ name: match[1], kind: 'store', lineNumber: index + 1, content: line, importSource: match[3], exported: /export\s+/.test(line) });
      pushEntry({ name: match[3], kind: 'store', lineNumber: index + 1, content: line, importSource: match[3], exported: /export\s+/.test(line) });
    }

    match = line.match(/router\.(get|post|put|delete|patch)\((['"`])([^'"`]+)\2/);
    if (match) {
      pushEntry({ name: `${match[1].toUpperCase()} ${match[3]}`, kind: 'route', lineNumber: index + 1, content: line, importSource: match[3], exported: true });
    }

    match = line.match(/import\s+\{([^}]+)\}\s+from\s+(['"`])([^'"`]+)\2/);
    if (match) {
      for (const name of collectImportNames(match[1])) {
        pushEntry({ name, kind: 'import', lineNumber: index + 1, content: line, importSource: match[3] });
      }
    }

    match = line.match(/import\s+([A-Za-z0-9_]+)\s+from\s+(['"`])([^'"`]+)\2/);
    if (match) {
      pushEntry({ name: match[1], kind: 'import', lineNumber: index + 1, content: line, importSource: match[3] });
    }

    match = line.match(/import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+(['"`])([^'"`]+)\2/);
    if (match) {
      pushEntry({ name: match[1], kind: 'import', lineNumber: index + 1, content: line, importSource: match[3] });
    }

    match = line.match(/export\s+\*\s+from\s+(['"`])([^'"`]+)\1/);
    if (match) {
      pushEntry({ name: match[2], kind: 're-export', lineNumber: index + 1, content: line, importSource: match[2], exported: true });
    }
  }

  return entries;
}

function sanitizeStringArray(value) {
  const items = Array.isArray(value) ? value : [value];
  return uniqueItems(
    items
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
}

function extractInterestingLines(lines = [], pattern, limit = 3, options = {}) {
  const skipLinePattern = options.skipLinePattern || DEFAULT_SKIP_LINE_PATTERN;
  return uniqueItems(
    (Array.isArray(lines) ? lines : [])
      .map(line => String(line || '').trim())
      .filter(line => line && pattern.test(line) && !skipLinePattern.test(line))
      .map(line => line.replace(/\s+/g, ' ').slice(0, 140))
      .slice(0, limit)
  );
}

function extractDefinitionName(line = '') {
  const match = String(line).match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|(?:export\s+)?(?:const|let|var|class)\s+([A-Za-z0-9_]+)/);
  return match ? match[1] || match[2] || '' : '';
}

function extractKeyFunctions(lines = []) {
  return uniqueItems(
    (Array.isArray(lines) ? lines : [])
      .map(line => extractDefinitionName(line))
      .filter(Boolean)
      .slice(0, 8)
  );
}

function extractConfigSignals(lines = [], options = {}) {
  return uniqueItems([
    ...extractInterestingLines(lines, /(?:const|let|var)\s+[A-Z0-9_]{3,}\s*=|cfg\.get\(|routeNames\s*:|keywords\s*:|title\s*:/, 4, options),
    ...(Array.isArray(lines) ? lines : [])
      .map(line => String(line || '').match(/(?:const|let|var)\s+([A-Z0-9_]{3,})\s*=/))
      .filter(Boolean)
      .map(match => match[1])
      .slice(0, 4),
  ]);
}

function summarizeSourceSnippet(snippet = '') {
  return String(snippet || '')
    .replace(/\s+/g, ' ')
    .replace(/[{}<>]/g, ' ')
    .trim()
    .slice(0, 160);
}

function buildSourceIndexEntryFromContent(filePath, rawContent = '', options = {}, adapters = {}) {
  const toRelativePath = typeof adapters.toRelativePath === 'function'
    ? adapters.toRelativePath
    : value => String(value || '').replace(/\\/g, '/');
  const skipLinePattern = adapters.skipLinePattern || DEFAULT_SKIP_LINE_PATTERN;
  const detectModuleType = typeof adapters.detectModuleType === 'function'
    ? adapters.detectModuleType
    : detectSourceModuleType;
  const inferRouteHints = typeof adapters.inferRouteHints === 'function'
    ? adapters.inferRouteHints
    : () => [];
  const extractQuestionTypes = typeof adapters.extractQuestionTypes === 'function'
    ? adapters.extractQuestionTypes
    : () => [];
  const inferSynonyms = typeof adapters.inferSynonyms === 'function'
    ? adapters.inferSynonyms
    : () => [];
  const extractChunkKeywords = typeof adapters.extractChunkKeywords === 'function'
    ? adapters.extractChunkKeywords
    : () => [];
  const sourceModuleLabels = adapters.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;

  const relativePath = toRelativePath(filePath);
  const content = String(rawContent || '')
    .split(/\r?\n/)
    .filter(line => !skipLinePattern.test(line))
    .join('\n')
    .trim();
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const definitionLine = lines.find(line => extractDefinitionName(line)) || '';
  const definitionName = extractDefinitionName(definitionLine);
  const moduleType = detectModuleType(relativePath);
  const routeHints = uniqueItems([
    ...inferRouteHints(relativePath, content),
    ...sanitizeStringArray(options.routeHints || []),
  ]);
  const questionTypes = uniqueItems([
    ...extractQuestionTypes(content, relativePath),
    ...sanitizeStringArray(options.questionTypes || []),
  ]);
  const keyFunctions = uniqueItems([
    ...extractKeyFunctions(lines),
    ...sanitizeStringArray(options.keyFunctions || []),
  ]);
  const conditionHints = extractInterestingLines(lines, /if\s*\(|条件|限制|不足|未解锁|return\s+false|throw\s+/i, 4, { skipLinePattern });
  const shopSignals = extractInterestingLines(lines, /itemId\s*:|price\s*:|shop|yaopu|药铺|渔具铺|购买/i, 4, { skipLinePattern });
  const configSignals = extractConfigSignals(lines, { skipLinePattern });
  const aliases = inferSynonyms(content, relativePath);
  const semanticTitle = String(options.title || '').trim();
  const semanticKeywords = sanitizeStringArray(options.keywords || []);
  const keywords = uniqueItems([
    ...extractChunkKeywords(content, relativePath),
    ...keyFunctions,
    ...conditionHints,
    ...shopSignals,
    ...configSignals,
    ...splitIdentifierTerms(semanticTitle),
    ...semanticKeywords,
  ]);

  return {
    id: `${relativePath}:${options.startLine || 1}:${normalizeText(semanticTitle || definitionName || relativePath)}`,
    path: relativePath,
    title: semanticTitle || (definitionName ? `${definitionName} · ${relativePath}` : `${relativePath} · L${options.startLine || 1}`),
    summary: summarizeSourceSnippet(content),
    content: content.slice(0, 900),
    keywords,
    startLine: Number(options.startLine || 1),
    endLine: Number(options.endLine || lines.length),
    moduleType,
    moduleLabel: sourceModuleLabels[moduleType] || sourceModuleLabels.module || DEFAULT_SOURCE_MODULE_LABELS.module,
    routeHints,
    questionTypes,
    keyFunctions,
    conditionHints,
    shopSignals,
    configSignals,
    aliases,
    semanticKind: String(options.semanticKind || '').trim(),
  };
}

function getSemanticLineLimits(options = {}) {
  const maxBlockLines = Number(options.maxBlockLines);
  const targetBlockLines = Number(options.targetBlockLines);
  const safeMaxBlockLines = Number.isFinite(maxBlockLines) && maxBlockLines > 0
    ? Math.floor(maxBlockLines)
    : DEFAULT_SOURCE_SEMANTIC_MAX_BLOCK_LINES;
  const safeTargetBlockLines = Number.isFinite(targetBlockLines) && targetBlockLines > 0
    ? Math.floor(targetBlockLines)
    : DEFAULT_SOURCE_SEMANTIC_TARGET_BLOCK_LINES;

  return {
    maxBlockLines: safeMaxBlockLines,
    targetBlockLines: Math.min(safeMaxBlockLines, safeTargetBlockLines),
  };
}

function normalizeSemanticRelativePath(relativePath = '') {
  return String(relativePath || '').replace(/\\/g, '/');
}

function getSemanticLines(text = '', options = {}) {
  if (Array.isArray(options.lines)) return options.lines.map(line => String(line || ''));
  return String(text || '').split(/\r?\n/);
}

function findLineNumberByPattern(lines = [], pattern) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    if (typeof pattern === 'string') {
      if (line.includes(pattern)) return index + 1;
    } else if (pattern?.test) {
      if (pattern.global || pattern.sticky) pattern.lastIndex = 0;
      if (pattern.test(line)) return index + 1;
    }
  }
  return 1;
}

function splitSemanticContentBlock(block = {}, options = {}) {
  const { maxBlockLines, targetBlockLines } = getSemanticLineLimits(options);
  const lines = String(block.content || '').split(/\r?\n/);
  if (lines.length <= maxBlockLines) return [block];

  const parts = [];
  let cursor = 0;
  let partIndex = 1;
  const baseStart = Number(block.startLine || 1) || 1;

  while (cursor < lines.length) {
    let end = Math.min(lines.length, cursor + targetBlockLines);
    if (lines.length - cursor > maxBlockLines) {
      let splitAt = -1;
      for (let index = Math.min(lines.length - 1, cursor + maxBlockLines - 1); index > cursor + 12; index -= 1) {
        if (!String(lines[index] || '').trim()) {
          splitAt = index + 1;
          break;
        }
      }
      if (splitAt > 0) end = splitAt;
      else end = Math.min(lines.length, cursor + targetBlockLines);
    }

    const pieceLines = lines.slice(cursor, end);
    parts.push({
      ...block,
      title: `${block.title || '语义块'}${partIndex > 1 ? `（续 ${partIndex}）` : ''}`,
      content: pieceLines.join('\n').trim(),
      startLine: baseStart + cursor,
      endLine: baseStart + end - 1,
    });

    cursor = end;
    partIndex += 1;
  }

  return parts.filter(item => item.content);
}

function createSemanticBlock(title, content, options = {}) {
  return {
    title: String(title || '').trim(),
    content: String(content || '').trim(),
    semanticKind: String(options.semanticKind || '').trim(),
    startLine: Number(options.startLine || 1) || 1,
    endLine: Number(options.endLine || 1) || 1,
    keywords: sanitizeStringArray(options.keywords || []),
    routeHints: sanitizeStringArray(options.routeHints || []),
    questionTypes: sanitizeStringArray(options.questionTypes || []),
    keyFunctions: sanitizeStringArray(options.keyFunctions || []),
  };
}

function decodeHtmlEntities(text = '') {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

function stripInlineMarkupText(text = '') {
  return decodeHtmlEntities(String(text || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function escapeRegExpValue(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectMarkdownSemanticBlocks(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const lines = getSemanticLines(text, options);
  const matches = Array.from(String(text || '').matchAll(/^#{1,6}\s+(.+)$/gm));
  if (!matches.length) {
    return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · 文档`, text, {
      semanticKind: 'markdown',
      startLine: 1,
      endLine: lines.length,
    }), options);
  }

  const blocks = [];
  const lineStarts = matches.map(match => findLineNumberByPattern(lines, String(match[0] || '').trim()));
  for (let index = 0; index < matches.length; index += 1) {
    const startLine = lineStarts[index] || 1;
    const endLine = (lineStarts[index + 1] || (lines.length + 1)) - 1;
    const content = lines.slice(startLine - 1, endLine).join('\n').trim();
    if (!content) continue;
    blocks.push(...splitSemanticContentBlock(createSemanticBlock(matches[index][1], content, {
      semanticKind: 'markdown-heading',
      startLine,
      endLine,
      keywords: splitIdentifierTerms(matches[index][1]),
    }), options));
  }
  return blocks;
}

function collectHtmlSemanticBlocks(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const lines = getSemanticLines(text, options);
  const stripInline = typeof options.stripInlineMarkup === 'function'
    ? options.stripInlineMarkup
    : stripInlineMarkupText;
  const titleBlocks = [];

  for (const match of String(text || '').matchAll(/<(title|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const rawBlock = String(match[0] || '').trim();
    const title = stripInline(match[2] || '') || `${safeRelativePath} · HTML`;
    const startLine = findLineNumberByPattern(lines, rawBlock.slice(0, 80));
    titleBlocks.push(...splitSemanticContentBlock(createSemanticBlock(title, rawBlock, {
      semanticKind: 'html-heading',
      startLine,
      endLine: startLine + Math.max(0, rawBlock.split(/\r?\n/).length - 1),
      keywords: splitIdentifierTerms(title),
    }), options));
  }

  if (titleBlocks.length) return titleBlocks;

  const genericText = stripInline(text);
  return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · HTML`, genericText || text, {
    semanticKind: 'html',
    startLine: 1,
    endLine: lines.length,
  }), options);
}

function parseJsonForSemanticBlocks(text = '', options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, 'json')) return options.json;
  try {
    return JSON.parse(String(text || ''));
  } catch {
    return null;
  }
}

function collectJsonSemanticBlocks(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const lines = getSemanticLines(text, options);
  const json = parseJsonForSemanticBlocks(text, options);
  if (!json || typeof json !== 'object') {
    return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · JSON`, text, {
      semanticKind: 'json',
      startLine: 1,
      endLine: lines.length,
    }), options);
  }

  if (Array.isArray(json)) {
    return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · 顶层数组`, JSON.stringify(json, null, 2), {
      semanticKind: 'json-array',
      startLine: 1,
      endLine: lines.length,
    }), options);
  }

  const blocks = [];
  for (const [key, value] of Object.entries(json)) {
    const lineNumber = findLineNumberByPattern(lines, new RegExp(`"${escapeRegExpValue(key)}"\\s*:`));
    const content = JSON.stringify({ [key]: value }, null, 2);
    blocks.push(...splitSemanticContentBlock(createSemanticBlock(`${key} · ${safeRelativePath}`, content, {
      semanticKind: 'json-top-key',
      startLine: lineNumber,
      endLine: lineNumber + Math.max(0, String(content).split(/\r?\n/).length - 1),
      keywords: [key, ...splitIdentifierTerms(key)],
    }), options));
  }
  return blocks;
}

function collectVueSemanticBlocks(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const lines = getSemanticLines(text, options);
  const sections = [];
  const patterns = [
    { tag: 'template', regex: /<template[^>]*>([\s\S]*?)<\/template>/i },
    { tag: 'script', regex: /<script[^>]*>([\s\S]*?)<\/script>/i },
    { tag: 'style', regex: /<style[^>]*>([\s\S]*?)<\/style>/i },
  ];

  for (const item of patterns) {
    const match = String(text || '').match(item.regex);
    if (!match?.[0]) continue;
    const startLine = findLineNumberByPattern(lines, new RegExp(`<${item.tag}\\b`, 'i'));
    sections.push(...splitSemanticContentBlock(createSemanticBlock(`${item.tag} · ${safeRelativePath}`, match[0], {
      semanticKind: `vue-${item.tag}`,
      startLine,
      endLine: startLine + Math.max(0, match[0].split(/\r?\n/).length - 1),
      keywords: [item.tag],
    }), options));
  }

  if (!sections.length) {
    sections.push(...splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · Vue SFC`, text, {
      semanticKind: 'vue-sfc',
      startLine: 1,
      endLine: lines.length,
    }), options));
  }

  return sections;
}

function collectCodeSemanticBlocks(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const lines = getSemanticLines(text, options);
  const starts = [];
  const captureTitle = (line = '') => {
    const trimmed = String(line || '').trim();
    let match = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (match) return { title: match[1], semanticKind: 'function', keywords: splitIdentifierTerms(match[1]) };
    match = trimmed.match(/^(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
    if (match) return { title: match[1], semanticKind: 'class', keywords: splitIdentifierTerms(match[1]) };
    match = trimmed.match(/^(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
    if (match) return { title: match[1], semanticKind: 'interface', keywords: splitIdentifierTerms(match[1]) };
    match = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z0-9_]+)/);
    if (match) return { title: match[1], semanticKind: 'type', keywords: splitIdentifierTerms(match[1]) };
    match = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=/);
    if (match) return { title: match[1], semanticKind: 'object', keywords: splitIdentifierTerms(match[1]) };
    match = trimmed.match(/^router\.(get|post|put|delete|patch)\((['"`])([^'"`]+)\2/);
    if (match) return { title: `${match[1].toUpperCase()} ${match[3]}`, semanticKind: 'route-handler', keywords: [match[1], match[3], ...splitIdentifierTerms(match[3])] };
    return null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = String(lines[index] || '');
    if (!rawLine.trim()) continue;
    if (/^\s/.test(rawLine)) continue;
    const meta = captureTitle(rawLine);
    if (!meta) continue;
    starts.push({ line: index + 1, ...meta });
  }

  if (!starts.length) {
    return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · 模块`, text, {
      semanticKind: 'module',
      startLine: 1,
      endLine: lines.length,
    }), options);
  }

  const blocks = [];
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const startLine = current.line;
    const endLine = next ? next.line - 1 : lines.length;
    const content = lines.slice(startLine - 1, endLine).join('\n').trim();
    if (!content) continue;
    blocks.push(...splitSemanticContentBlock(createSemanticBlock(`${current.title} · ${safeRelativePath}`, content, {
      semanticKind: current.semanticKind,
      startLine,
      endLine,
      keywords: current.keywords,
      keyFunctions: current.semanticKind === 'function' ? [current.title] : [],
    }), options));
  }
  return blocks;
}

function getExtensionFromRelativePath(relativePath = '') {
  const match = String(relativePath || '').match(/(\.[^./\\]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function collectSemanticBlocksForText(relativePath = '', text = '', options = {}) {
  const safeRelativePath = normalizeSemanticRelativePath(relativePath);
  const ext = String(options.ext || getExtensionFromRelativePath(safeRelativePath)).toLowerCase();
  const lines = getSemanticLines(text, options);
  const blockOptions = { ...options, lines };

  if (ext === '.md') return collectMarkdownSemanticBlocks(safeRelativePath, text, blockOptions);
  if (ext === '.html') return collectHtmlSemanticBlocks(safeRelativePath, text, blockOptions);
  if (ext === '.json') return collectJsonSemanticBlocks(safeRelativePath, text, blockOptions);
  if (ext === '.vue') return collectVueSemanticBlocks(safeRelativePath, text, blockOptions);
  if (ext === '.js' || ext === '.ts') return collectCodeSemanticBlocks(safeRelativePath, text, blockOptions);

  return splitSemanticContentBlock(createSemanticBlock(`${safeRelativePath} · 语义块`, text, {
    semanticKind: 'generic',
    startLine: 1,
    endLine: lines.length,
  }), blockOptions);
}

function createEmptySourceIndexStore(version = 0) {
  return {
    version,
    builtAt: 0,
    fingerprint: '',
    fileCount: 0,
    entryCount: 0,
    entries: [],
    symbolCount: 0,
    symbolEntries: [],
  };
}

function normalizeSourceIndexStore(raw = null, options = {}) {
  const version = Number(options.version) || 0;
  const requireVersion = options.requireVersion === true;
  if (!raw || typeof raw !== 'object') return createEmptySourceIndexStore(version);
  if (requireVersion && Number(raw.version) !== version) return createEmptySourceIndexStore(version);
  if (!Array.isArray(raw.entries)) return createEmptySourceIndexStore(version);

  const entries = raw.entries;
  const symbolEntries = Array.isArray(raw.symbolEntries) ? raw.symbolEntries : [];
  return {
    version: Number(raw.version) || version,
    builtAt: Number(raw.builtAt) || 0,
    fingerprint: String(raw.fingerprint || ''),
    fileCount: Number(raw.fileCount) || 0,
    entryCount: Number(raw.entryCount) || entries.length,
    entries,
    symbolCount: Number(raw.symbolCount) || symbolEntries.length,
    symbolEntries,
  };
}

function serializeSourceIndexStore(store = {}, options = {}) {
  const version = Number(options.version) || Number(store?.version) || 0;
  const now = Number(options.now) || Date.now();
  const entries = Array.isArray(store?.entries) ? store.entries : [];
  const symbolEntries = Array.isArray(store?.symbolEntries) ? store.symbolEntries : [];

  return {
    version,
    builtAt: Number(store?.builtAt) || now,
    fingerprint: String(store?.fingerprint || ''),
    fileCount: Number(store?.fileCount) || 0,
    entryCount: Number(store?.entryCount) || entries.length,
    entries,
    symbolCount: Number(store?.symbolCount) || symbolEntries.length,
    symbolEntries,
  };
}

function loadSourceIndexStoreFromFile(filePath, options = {}) {
  const fsModule = options.fsModule || fs;
  const version = Number(options.version) || 0;
  try {
    if (filePath && fsModule.existsSync(filePath)) {
      const raw = JSON.parse(fsModule.readFileSync(filePath, 'utf8'));
      return normalizeSourceIndexStore(raw, {
        version,
        requireVersion: options.requireVersion === true,
      });
    }
  } catch {}
  return normalizeSourceIndexStore(null, { version });
}

function saveSourceIndexStoreToFile(filePath, store = {}, options = {}) {
  const fsModule = options.fsModule || fs;
  const pathModule = options.pathModule || path;
  fsModule.mkdirSync(pathModule.dirname(filePath), { recursive: true });
  fsModule.writeFileSync(filePath, JSON.stringify(serializeSourceIndexStore(store, options), null, 2), 'utf8');
}

function createEmptyNounLexiconStore(version = 0) {
  return {
    version,
    builtAt: 0,
    fingerprint: '',
    fileCount: 0,
    entryCount: 0,
    entries: [],
  };
}

function normalizeNounLexiconStore(raw = null, options = {}) {
  const version = Number(options.version) || 0;
  const requireVersion = options.requireVersion === true;
  if (!raw || typeof raw !== 'object') return createEmptyNounLexiconStore(version);
  if (requireVersion && raw.version !== version) return createEmptyNounLexiconStore(version);
  if (!Array.isArray(raw.entries)) return createEmptyNounLexiconStore(version);

  return {
    version: Number(raw.version) || version,
    builtAt: Number(raw.builtAt) || 0,
    fingerprint: String(raw.fingerprint || ''),
    fileCount: Number(raw.fileCount) || 0,
    entryCount: Number(raw.entryCount) || 0,
    entries: raw.entries,
  };
}

function serializeNounLexiconStore(store = {}, options = {}) {
  const version = Number(options.version) || Number(store?.version) || 0;
  const builtAt = Number(store?.builtAt) || Number(options.now) || Date.now();
  return {
    version,
    builtAt,
    fingerprint: String(store?.fingerprint || ''),
    fileCount: Number(store?.fileCount) || 0,
    entryCount: Number(store?.entryCount) || 0,
    entries: Array.isArray(store?.entries) ? store.entries : [],
  };
}

function loadNounLexiconStoreFromFile(filePath, options = {}) {
  const fsModule = options.fsModule || fs;
  const version = Number(options.version) || 0;
  try {
    if (filePath && fsModule.existsSync(filePath)) {
      const raw = JSON.parse(fsModule.readFileSync(filePath, 'utf8'));
      return normalizeNounLexiconStore(raw, {
        version,
        requireVersion: options.requireVersion === true,
      });
    }
  } catch {}
  return createEmptyNounLexiconStore(version);
}

function saveNounLexiconStoreToFile(filePath, store = {}, options = {}) {
  const fsModule = options.fsModule || fs;
  const pathModule = options.pathModule || path;
  fsModule.mkdirSync(pathModule.dirname(filePath), { recursive: true });
  fsModule.writeFileSync(filePath, JSON.stringify(serializeNounLexiconStore(store, options), null, 2), 'utf8');
}

function buildSourceIndexStatus(store = {}, options = {}) {
  const normalized = normalizeSourceIndexStore(store, {
    version: Number(options.version) || Number(store?.version) || 0,
  });

  return {
    version: Number(options.version) || normalized.version,
    builtAt: Number(normalized.builtAt) || 0,
    fileCount: Number(normalized.fileCount) || 0,
    entryCount: Number(normalized.entryCount) || (Array.isArray(normalized.entries) ? normalized.entries.length : 0),
    symbolCount: Number(normalized.symbolCount) || (Array.isArray(normalized.symbolEntries) ? normalized.symbolEntries.length : 0),
    ready: Array.isArray(normalized.entries) && normalized.entries.length > 0,
  };
}

function buildNounLexiconStatus(store = {}, options = {}) {
  const normalized = normalizeNounLexiconStore(store, {
    version: Number(options.version) || Number(store?.version) || 0,
  });

  return {
    version: Number(options.version) || normalized.version,
    builtAt: Number(normalized.builtAt) || 0,
    fileCount: Number(normalized.fileCount) || 0,
    entryCount: Number(normalized.entryCount) || (Array.isArray(normalized.entries) ? normalized.entries.length : 0),
    ready: Array.isArray(normalized.entries) && normalized.entries.length > 0,
  };
}

function createSourceIndexCachePayload(store = {}, options = {}) {
  const normalized = normalizeSourceIndexStore(store, {
    version: Number(options.version) || Number(store?.version) || 0,
  });

  return {
    builtAt: Number(options.builtAt) || Date.now(),
    entries: normalized.entries,
    symbolEntries: normalized.symbolEntries,
  };
}

function normalizeSourceIndexCache(cache = {}) {
  return {
    builtAt: Number(cache?.builtAt) || 0,
    entries: Array.isArray(cache?.entries) ? cache.entries : [],
    symbolEntries: Array.isArray(cache?.symbolEntries) ? cache.symbolEntries : [],
  };
}

function createNounLexiconLookup(entries = []) {
  const lookup = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = normalizeText(entry?.normalized || entry?.term);
    if (normalized) lookup.set(normalized, entry);
    for (const alias of Array.isArray(entry?.aliases) ? entry.aliases : []) {
      const normalizedAlias = normalizeText(alias);
      if (normalizedAlias) lookup.set(normalizedAlias, entry);
    }
  }
  return lookup;
}

function createNounLexiconCachePayload(store = {}, options = {}) {
  const normalized = normalizeNounLexiconStore(store, {
    version: Number(options.version) || Number(store?.version) || 0,
  });

  return {
    loadedAt: Number(options.loadedAt) || Date.now(),
    fingerprint: normalized.fingerprint,
    entries: normalized.entries,
    lookup: createNounLexiconLookup(normalized.entries),
  };
}

function normalizeNounLexiconCache(cache = {}) {
  const entries = Array.isArray(cache?.entries) ? cache.entries : [];
  return {
    loadedAt: Number(cache?.loadedAt) || 0,
    fingerprint: String(cache?.fingerprint || ''),
    entries,
    lookup: cache?.lookup instanceof Map ? cache.lookup : createNounLexiconLookup(entries),
  };
}

function resolveSourceIndexEntries(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const cacheTtlMs = Math.max(0, Number(options.cacheTtlMs) || 0);
  const cache = normalizeSourceIndexCache(options.cache);
  if (cache.entries.length && cacheTtlMs > 0 && now - cache.builtAt < cacheTtlMs) {
    return {
      source: 'memory-cache',
      entries: cache.entries,
      symbolEntries: cache.symbolEntries,
      cache,
      store: null,
    };
  }

  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths
    : (typeof options.collectFilePaths === 'function' ? options.collectFilePaths() : []);
  const version = Number(options.version) || 0;
  const fingerprint = String(options.fingerprint || (
    typeof options.buildFingerprint === 'function'
      ? options.buildFingerprint(filePaths)
      : ''
  ));
  const persistedStore = typeof options.loadPersistedStore === 'function'
    ? options.loadPersistedStore()
    : options.persistedStore;
  const persisted = normalizeSourceIndexStore(persistedStore, { version });
  if (persisted.entries.length && persisted.fingerprint === fingerprint) {
    const nextCache = createSourceIndexCachePayload(persisted, { version, builtAt: now });
    return {
      source: 'persisted-store',
      entries: persisted.entries,
      symbolEntries: nextCache.symbolEntries,
      cache: nextCache,
      store: persisted,
      filePaths,
      fingerprint,
    };
  }

  const buildStore = typeof options.buildStore === 'function' ? options.buildStore : null;
  const builtStore = normalizeSourceIndexStore(
    buildStore ? buildStore(filePaths, fingerprint) : null,
    { version }
  );
  const nextCache = createSourceIndexCachePayload(builtStore, { version, builtAt: now });
  return {
    source: 'rebuilt',
    entries: builtStore.entries,
    symbolEntries: nextCache.symbolEntries,
    cache: nextCache,
    store: builtStore,
    filePaths,
    fingerprint,
  };
}

function resolveNounLexiconEntries(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const cacheTtlMs = Math.max(0, Number(options.cacheTtlMs) || 0);
  const cache = normalizeNounLexiconCache(options.cache);
  if (cache.entries.length && cacheTtlMs > 0 && now - cache.loadedAt < cacheTtlMs) {
    return {
      source: 'memory-cache',
      entries: cache.entries,
      lookup: cache.lookup,
      cache,
      store: null,
    };
  }

  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths
    : (typeof options.collectFilePaths === 'function' ? options.collectFilePaths() : []);
  const version = Number(options.version) || 0;
  const fingerprint = String(options.fingerprint || (
    typeof options.buildFingerprint === 'function'
      ? options.buildFingerprint(filePaths)
      : ''
  ));
  const persistedStore = typeof options.loadPersistedStore === 'function'
    ? options.loadPersistedStore()
    : options.persistedStore;
  const persisted = normalizeNounLexiconStore(persistedStore, { version });
  if (persisted.entries.length && persisted.fingerprint === fingerprint) {
    const nextCache = createNounLexiconCachePayload(persisted, { version, loadedAt: now });
    return {
      source: 'persisted-store',
      entries: persisted.entries,
      lookup: nextCache.lookup,
      cache: nextCache,
      store: persisted,
      filePaths,
      fingerprint,
    };
  }

  const buildStore = typeof options.buildStore === 'function' ? options.buildStore : null;
  const builtStore = normalizeNounLexiconStore(
    buildStore ? buildStore(filePaths, fingerprint) : null,
    { version }
  );
  const nextCache = createNounLexiconCachePayload(builtStore, { version, loadedAt: now });
  return {
    source: 'rebuilt',
    entries: builtStore.entries,
    lookup: nextCache.lookup,
    cache: nextCache,
    store: builtStore,
    filePaths,
    fingerprint,
  };
}

function rebuildSourceIndexEntries(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const version = Number(options.version) || 0;
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths
    : (typeof options.collectFilePaths === 'function' ? options.collectFilePaths() : []);
  const fingerprint = String(options.fingerprint || (
    typeof options.buildFingerprint === 'function' ? options.buildFingerprint(filePaths) : ''
  ));
  const buildStore = typeof options.buildStore === 'function' ? options.buildStore : null;
  const store = normalizeSourceIndexStore(
    buildStore ? buildStore(filePaths, fingerprint) : null,
    { version }
  );
  const cache = createSourceIndexCachePayload(store, { version, builtAt: now });
  const status = {
    ...buildSourceIndexStatus(store, { version }),
    fileCount: filePaths.length,
    entryCount: store.entries.length,
    symbolCount: store.symbolEntries.length,
    ready: store.entries.length > 0,
  };
  return {
    source: 'rebuilt',
    filePaths,
    fingerprint,
    store,
    cache,
    entries: store.entries,
    symbolEntries: store.symbolEntries,
    status,
  };
}

function rebuildNounLexiconEntries(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const version = Number(options.version) || 0;
  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths
    : (typeof options.collectFilePaths === 'function' ? options.collectFilePaths() : []);
  const fingerprint = String(options.fingerprint || (
    typeof options.buildFingerprint === 'function' ? options.buildFingerprint(filePaths) : ''
  ));
  const buildStore = typeof options.buildStore === 'function' ? options.buildStore : null;
  const store = normalizeNounLexiconStore(
    buildStore ? buildStore(filePaths, fingerprint) : null,
    { version }
  );
  const cache = createNounLexiconCachePayload(store, { version, loadedAt: now });
  const status = {
    ...buildNounLexiconStatus(store, { version }),
    fileCount: filePaths.length,
    entryCount: store.entries.length,
    ready: store.entries.length > 0,
  };
  return {
    source: 'rebuilt',
    filePaths,
    fingerprint,
    store,
    cache,
    entries: store.entries,
    lookup: cache.lookup,
    status,
  };
}

function buildSourceIndexStoreFromFiles(filePaths = [], fingerprint = '', adapters = {}, options = {}) {
  const safeFilePaths = Array.isArray(filePaths) ? filePaths : [];
  const readFileText = typeof adapters.readFileText === 'function' ? adapters.readFileText : null;
  const createIndexEntriesForFile = typeof adapters.createIndexEntriesForFile === 'function'
    ? adapters.createIndexEntriesForFile
    : () => [];
  const createSymbolEntriesForFile = typeof adapters.createSymbolEntriesForFile === 'function'
    ? adapters.createSymbolEntriesForFile
    : () => [];
  const entries = [];
  const symbolEntries = [];

  for (const filePath of safeFilePaths) {
    try {
      const text = readFileText ? readFileText(filePath) : '';
      entries.push(...(createIndexEntriesForFile(filePath, text) || []));
      symbolEntries.push(...(createSymbolEntriesForFile(filePath, text) || []));
    } catch {}
  }

  return serializeSourceIndexStore({
    version: Number(options.version) || 0,
    builtAt: Number(options.now) || Date.now(),
    fingerprint,
    fileCount: safeFilePaths.length,
    entryCount: entries.length,
    entries,
    symbolCount: symbolEntries.length,
    symbolEntries,
  }, {
    version: Number(options.version) || 0,
    now: Number(options.now) || Date.now(),
  });
}

function extractSourceSnippet(text = '', terms = [], options = {}) {
  const skipLinePattern = options.skipLinePattern || DEFAULT_SKIP_LINE_PATTERN;
  const contextLines = Math.max(0, Number(options.contextLines) || 0);
  const maxLength = Math.max(1, Number(options.maxLength) || 480);
  const radius = Math.max(0, Number(options.radius) || 220);
  const lines = String(text || '').split(/\r?\n/);
  const normalizedTerms = uniqueItems((Array.isArray(terms) ? terms : []).map(normalizeText).filter(Boolean));
  if (!normalizedTerms.length || !lines.length) return '';

  let bestIndex = -1;
  let bestScore = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || skipLinePattern.test(line)) continue;
    const normalizedLine = normalizeText(line);
    if (!normalizedLine) continue;

    let lineScore = 0;
    for (const term of normalizedTerms) {
      if (!term) continue;
      if (normalizedLine.includes(term)) {
        lineScore += term.length >= 4 ? 5 : 2;
      }
    }

    if (/itemId|name:|description:|function |const |export /.test(line)) {
      lineScore += 1;
    }

    if (lineScore > bestScore) {
      bestScore = lineScore;
      bestIndex = index;
    }
  }

  if (bestIndex < 0) return '';

  const startLine = Math.max(0, bestIndex - contextLines);
  const endLine = Math.min(lines.length, bestIndex + contextLines + 1);
  const snippet = lines
    .slice(startLine, endLine)
    .filter(line => !skipLinePattern.test(line))
    .join('\n')
    .trim();

  if (!snippet) return '';
  if (snippet.length <= maxLength) return snippet;

  const normalizedSnippet = normalizeText(snippet);
  let hitIndex = 0;
  for (const term of normalizedTerms) {
    const idx = normalizedSnippet.indexOf(term);
    if (idx >= 0) {
      hitIndex = idx;
      break;
    }
  }

  const start = Math.max(0, hitIndex - radius);
  const end = Math.min(snippet.length, start + maxLength);
  return snippet.slice(start, end).trim();
}

function buildSourceContextCandidate(filePath = '', text = '', options = {}) {
  const terms = Array.isArray(options.terms) ? options.terms : [];
  const routeName = options.routeName || '';
  const explicitTargets = Array.isArray(options.explicitTargets) ? options.explicitTargets : [];
  const queryPlan = options.queryPlan || null;
  const toRelativePath = typeof options.toRelativePath === 'function'
    ? options.toRelativePath
    : value => String(value || '').replace(/\\/g, '/');
  const score = scoreSourceFile(filePath, text, terms, routeName, explicitTargets, queryPlan, {
    toRelativePath,
    routeLabels: options.routeLabels || {},
    detectModuleType: typeof options.detectModuleType === 'function' ? options.detectModuleType : detectSourceModuleType,
  });
  if (score <= 0) return null;

  const snippet = extractSourceSnippet(text, terms, {
    skipLinePattern: options.skipLinePattern,
    contextLines: options.contextLines,
    maxLength: options.maxLength,
    radius: options.radius,
  });
  if (!snippet) return null;

  return {
    path: toRelativePath(filePath),
    snippet,
    summary: summarizeSourceSnippet(snippet),
    score,
  };
}

function buildSourceContextCandidatesFromFiles(filePaths = [], adapters = {}, options = {}) {
  const readFileText = typeof adapters.readFileText === 'function' ? adapters.readFileText : null;
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 4;
  const candidates = [];

  for (const filePath of Array.isArray(filePaths) ? filePaths : []) {
    try {
      const text = readFileText ? readFileText(filePath) : '';
      const candidate = buildSourceContextCandidate(filePath, text, options);
      if (candidate) candidates.push(candidate);
    } catch {}
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

function normalizeSourceRelativePath(value = '') {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

function isDirectoryLikeTarget(value = '', whitelist = []) {
  const normalized = normalizePathTarget(value);
  if (!normalized) return false;
  if ((Array.isArray(whitelist) ? whitelist : []).some(root => normalizePathTarget(root?.key) === normalized)) return true;
  if (!normalized.includes('/')) return false;
  const basename = normalized.split('/').pop() || '';
  return !hasSupportedSourceExtension(basename);
}

function getPathResolutionAdapters(adapters = {}) {
  return {
    existsPath: typeof adapters.existsPath === 'function' ? adapters.existsPath : () => false,
    isFilePath: typeof adapters.isFilePath === 'function' ? adapters.isFilePath : () => false,
    isDirectoryPath: typeof adapters.isDirectoryPath === 'function' ? adapters.isDirectoryPath : () => false,
    isBlockedPath: typeof adapters.isBlockedPath === 'function' ? adapters.isBlockedPath : () => false,
    resolvePath: typeof adapters.resolvePath === 'function'
      ? adapters.resolvePath
      : (basePath, ...parts) => [basePath, ...parts].filter(Boolean).join('/'),
    relativePath: typeof adapters.relativePath === 'function'
      ? adapters.relativePath
      : () => '',
    isAbsolutePath: typeof adapters.isAbsolutePath === 'function' ? adapters.isAbsolutePath : () => false,
  };
}

function isResolvedPathInsideRoot(rootAbs = '', absPath = '', pathAdapters = {}) {
  const relativeToRoot = pathAdapters.relativePath(rootAbs, absPath);
  return !String(relativeToRoot || '').startsWith('..') && !pathAdapters.isAbsolutePath(relativeToRoot);
}

function resolveExplicitDirectoryTarget(target = '', whitelist = [], adapters = {}) {
  const safeWhitelist = Array.isArray(whitelist) ? whitelist : [];
  const rawTarget = normalizeSourceRelativePath(target);
  const normalizedTarget = normalizePathTarget(rawTarget);
  if (!normalizedTarget || !isDirectoryLikeTarget(normalizedTarget, safeWhitelist)) return null;

  const pathAdapters = getPathResolutionAdapters(adapters);
  for (const root of safeWhitelist) {
    const rawRootKey = normalizeSourceRelativePath(root?.key);
    const normalizedRootKey = normalizePathTarget(rawRootKey);
    if (!rawRootKey || !normalizedRootKey || !root?.abs) continue;

    if (normalizedTarget === normalizedRootKey) {
      try {
        if (pathAdapters.existsPath(root.abs) && pathAdapters.isDirectoryPath(root.abs)) {
          return { path: root.key, abs: root.abs };
        }
      } catch {}
      continue;
    }

    if (!normalizedTarget.startsWith(`${normalizedRootKey}/`)) continue;
    const subPath = rawTarget.slice(rawRootKey.length + 1);
    const absPath = pathAdapters.resolvePath(root.abs, ...subPath.split('/'));
    try {
      if (
        !isResolvedPathInsideRoot(root.abs, absPath, pathAdapters)
        || pathAdapters.isBlockedPath(absPath)
      ) {
        continue;
      }
      if (pathAdapters.existsPath(absPath) && pathAdapters.isDirectoryPath(absPath)) {
        return {
          path: `${root.key}/${subPath}`.replace(/\\/g, '/'),
          abs: absPath,
        };
      }
    } catch {}
  }

  return null;
}

function resolveWhitelistRelativeFilePath(relativePath = '', whitelist = [], adapters = {}) {
  const safeWhitelist = Array.isArray(whitelist) ? whitelist : [];
  const rawRelativePath = normalizeSourceRelativePath(relativePath);
  const normalizedRelativePath = normalizePathTarget(rawRelativePath);
  if (!rawRelativePath || !normalizedRelativePath) return '';

  const pathAdapters = getPathResolutionAdapters(adapters);
  for (const root of safeWhitelist) {
    const rawRootKey = normalizeSourceRelativePath(root?.key);
    const normalizedRootKey = normalizePathTarget(rawRootKey);
    if (!rawRootKey || !normalizedRootKey || !root?.abs) continue;

    if (normalizedRelativePath === normalizedRootKey) {
      try {
        if (pathAdapters.existsPath(root.abs) && pathAdapters.isFilePath(root.abs)) return root.abs;
      } catch {}
      continue;
    }

    if (!normalizedRelativePath.startsWith(`${normalizedRootKey}/`)) continue;
    const subPath = rawRelativePath.slice(rawRootKey.length + 1);
    const absPath = pathAdapters.resolvePath(root.abs, ...subPath.split('/'));
    try {
      if (
        !isResolvedPathInsideRoot(root.abs, absPath, pathAdapters)
        || pathAdapters.isBlockedPath(absPath)
      ) {
        continue;
      }
      if (pathAdapters.existsPath(absPath) && pathAdapters.isFilePath(absPath)) return absPath;
    } catch {}
  }

  return '';
}

function isDirentDirectory(entry = {}) {
  return typeof entry?.isDirectory === 'function' ? entry.isDirectory() : entry?.isDirectory === true;
}

function isDirentFile(entry = {}) {
  return typeof entry?.isFile === 'function' ? entry.isFile() : entry?.isFile === true;
}

function detectSourceDirectoryModuleType(directoryPath = '') {
  const normalized = String(directoryPath || '').replace(/\\/g, '/');
  if (/^data-defaults(\/|$)/i.test(normalized)) return 'default-data';
  if (/^data(\/|$)/i.test(normalized)) return 'runtime-data';
  if (/^taoyuan-main\/electron(\/|$)/i.test(normalized)) return 'electron';
  if (/^server\/src\/routes(\/|$)/i.test(normalized)) return 'routes';
  return 'directory';
}

function createSourceDirectorySummaryEntry(resolvedDir = {}, children = [], options = {}) {
  if (!resolvedDir?.abs || !resolvedDir?.path) return null;
  const childLimit = Math.max(1, Number(options.childLimit) || DEFAULT_SOURCE_DIRECTORY_CHILD_LIMIT);
  const sourceModuleLabels = options.sourceModuleLabels || DEFAULT_SOURCE_MODULE_LABELS;
  const allowedExtensions = options.allowedExtensions instanceof Set
    ? options.allowedExtensions
    : new Set(Array.isArray(options.allowedExtensions) ? options.allowedExtensions : []);
  const getExtension = typeof options.getExtension === 'function'
    ? options.getExtension
    : name => {
        const match = String(name || '').match(/(\.[^./\\]+)$/);
        return match ? match[1].toLowerCase() : '';
      };
  const isBlockedChild = typeof options.isBlockedChild === 'function'
    ? options.isBlockedChild
    : () => false;

  const safeChildren = (Array.isArray(children) ? children : [])
    .filter(entry => entry?.name && !isBlockedChild(entry));

  const childDirs = safeChildren
    .filter(isDirentDirectory)
    .map(entry => entry.name)
    .sort();
  const childFiles = safeChildren
    .filter(isDirentFile)
    .map(entry => entry.name)
    .filter(name => allowedExtensions.size ? allowedExtensions.has(getExtension(name)) : true)
    .sort();
  const moduleType = detectSourceDirectoryModuleType(resolvedDir.path);
  const previewDirs = childDirs.slice(0, childLimit);
  const previewFiles = childFiles.slice(0, childLimit);
  const summaryParts = [
    `目录 ${resolvedDir.path} 存在。`,
    childDirs.length ? `子目录（${childDirs.length}）：${previewDirs.join('、')}${childDirs.length > previewDirs.length ? ' 等' : ''}` : '子目录：无',
    childFiles.length ? `源码/数据文件（${childFiles.length}）：${previewFiles.join('、')}${childFiles.length > previewFiles.length ? ' 等' : ''}` : '源码/数据文件：无',
  ];

  return {
    id: `source_directory:${normalizePathTarget(resolvedDir.path)}`,
    title: `目录概览：${resolvedDir.path}`,
    content: summaryParts.join('\n'),
    summary: summaryParts.join(' '),
    path: String(resolvedDir.path || '').replace(/\\/g, '/'),
    sourceRefs: [String(resolvedDir.path || '').replace(/\\/g, '/')],
    sourceType: 'source-directory',
    moduleType,
    moduleLabel: sourceModuleLabels[moduleType] || sourceModuleLabels.directory || DEFAULT_SOURCE_MODULE_LABELS.directory,
    keywords: uniqueItems([
      resolvedDir.path,
      ...String(resolvedDir.path || '').split(/[\/._-]/),
      ...childDirs,
      ...childFiles,
    ].filter(Boolean)),
    childDirs,
    childFiles,
  };
}

function scoreSourceFile(filePath, text, terms, routeName, explicitTargets = [], queryPlan = null, adapters = {}) {
  const toRelativePath = typeof adapters.toRelativePath === 'function'
    ? adapters.toRelativePath
    : value => String(value || '').replace(/\\/g, '/');
  const routeLabels = adapters.routeLabels || {};
  const detectModuleType = typeof adapters.detectModuleType === 'function'
    ? adapters.detectModuleType
    : detectSourceModuleType;

  const relativePath = toRelativePath(filePath);
  const normalizedPath = normalizeText(relativePath);
  const normalizedText = normalizeText(text);
  let score = 0;

  for (const target of explicitTargets) {
    if (!target) continue;
    score += scoreExplicitPathMatch(relativePath, target);
  }

  if (routeName && normalizedPath.includes(normalizeText(routeName))) score += 6;
  if (routeName && routeLabels[routeName] && normalizedText.includes(normalizeText(routeLabels[routeName]))) score += 4;

  for (const moduleHint of queryPlan?.moduleHints || []) {
    if (moduleHintMatches(moduleHint, detectModuleType(relativePath))) score += 18;
  }

  for (const routeHint of queryPlan?.routeHints || []) {
    const normalizedRouteHint = normalizeText(routeHint);
    if (!normalizedRouteHint) continue;
    if (normalizedPath.includes(normalizedRouteHint)) score += 8;
    if (normalizedText.includes(normalizedRouteHint)) score += 4;
  }

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 5;
    if (normalizedText.includes(normalizedTerm)) score += term.length >= 4 ? 4 : 2;
  }

  return score;
}

function scoreModuleTypePreference(moduleType = '', queryPlan = null) {
  const preferred = Array.isArray(queryPlan?.preferredModuleTypes) ? queryPlan.preferredModuleTypes : [];
  if (!preferred.length || !moduleType) return 0;
  const index = preferred.indexOf(moduleType);
  if (index < 0) return 0;
  return Math.max(6, 34 - index * 5);
}

function scorePathPreference(candidatePath = '', queryPlan = null) {
  const preferred = Array.isArray(queryPlan?.preferredPathPrefixes) ? queryPlan.preferredPathPrefixes : [];
  const normalizedCandidate = normalizePathTarget(candidatePath);
  if (!preferred.length || !normalizedCandidate) return 0;

  let score = 0;
  for (let index = 0; index < preferred.length; index += 1) {
    const prefix = normalizePathTarget(preferred[index]);
    if (!prefix) continue;
    if (normalizedCandidate === prefix) score = Math.max(score, Math.max(8, 40 - index * 5));
    else if (normalizedCandidate.startsWith(`${prefix}/`)) score = Math.max(score, Math.max(6, 34 - index * 4));
    else if (normalizedCandidate.includes(prefix)) score = Math.max(score, Math.max(4, 24 - index * 3));
  }

  return score;
}

function scoreSourceSymbolEntry(entry = {}, queryPlan = {}, routeName = '') {
  const normalizedPath = normalizeText(entry.path);
  const normalizedName = normalizeText(entry.name);
  const normalizedContent = normalizeText(entry.content);
  let score = 0;

  for (const target of queryPlan.explicitTargets || []) {
    if (!target) continue;
    score += scoreExplicitPathMatch(entry.path, target);
    if (normalizedName === target || normalizedName.includes(target)) score += 120;
  }

  for (const identifier of queryPlan.identifierTargets || []) {
    const normalizedIdentifier = normalizeText(identifier);
    if (!normalizedIdentifier) continue;
    if (normalizedName === normalizedIdentifier) score += 160;
    else if (normalizedName.includes(normalizedIdentifier)) score += 80;
    if (normalizedContent.includes(normalizedIdentifier)) score += 36;
  }

  for (const term of queryPlan.sourceTerms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 10;
    if (normalizedName.includes(normalizedTerm)) score += 18;
    if ((entry.keywords || []).some(keyword => normalizeText(keyword) === normalizedTerm)) score += 12;
  }

  for (const term of queryPlan.expandedTerms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 8;
    if (normalizedName.includes(normalizedTerm)) score += 8;
    if ((entry.keywords || []).some(keyword => normalizeText(keyword) === normalizedTerm)) score += 8;
  }

  if ((queryPlan.intents || []).includes('locate_symbol')) {
    if (['function', 'const', 'class', 'interface', 'type', 'store'].includes(entry.kind)) score += 24;
  }
  if ((queryPlan.intents || []).includes('find_call_relation')) {
    if (['import', 're-export', 'route'].includes(entry.kind)) score += 20;
  }
  if ((queryPlan.intents || []).includes('find_implementation')) {
    if (['function', 'store', 'route', 'const'].includes(entry.kind)) score += 14;
  }
  if ((queryPlan.intents || []).includes('inspect_directory')) {
    if (matchesExplicitPath(entry.path, (queryPlan.explicitTargets || [])[0] || '')) score += 24;
  }

  for (const moduleHint of queryPlan.moduleHints || []) {
    if (moduleHintMatches(moduleHint, entry.moduleType)) score += 18;
  }

  for (const routeHint of queryPlan.routeHints || []) {
    const normalizedRouteHint = normalizeText(routeHint);
    if ((entry.routeHints || []).some(hint => normalizeText(hint) === normalizedRouteHint)) score += 12;
    if (normalizedPath.includes(normalizedRouteHint)) score += 6;
  }

  if (routeName && (entry.routeHints || []).some(hint => normalizeText(hint) === normalizeText(routeName))) score += 10;
  return score;
}

function limitRankedEntries(entries = [], limit = entries.length) {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) return entries;
  return entries.slice(0, numericLimit);
}

function rankSourceSymbolEntries(entries = [], queryPlan = {}, routeName = '', options = {}) {
  const limit = options.limit ?? entries.length;
  return limitRankedEntries(
    (Array.isArray(entries) ? entries : [])
      .map(entry => ({ ...entry, score: scoreSourceSymbolEntry(entry, queryPlan, routeName) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score),
    limit
  );
}

function scoreSourceIndexEntry(entry = {}, terms = [], routeName = '', explicitTargets = [], queryPlan = null, adapters = {}) {
  const routeLabels = adapters.routeLabels || {};
  const detectQuestionTypes = typeof adapters.detectQuestionTypes === 'function'
    ? adapters.detectQuestionTypes
    : () => [];
  const normalizedPath = normalizeText(entry.path);
  const normalizedTitle = normalizeText(entry.title);
  const normalizedContent = normalizeText(entry.content);
  let score = 0;

  score += scoreModuleTypePreference(entry.moduleType, queryPlan);
  score += scorePathPreference(entry.path, queryPlan);

  for (const target of explicitTargets) {
    if (!target) continue;
    score += scoreExplicitPathMatch(entry.path, target);
    if (normalizedTitle.includes(target)) score += 24;
  }

  if (routeName && normalizedPath.includes(normalizeText(routeName))) score += 6;
  if (routeName && routeLabels[routeName] && normalizedContent.includes(normalizeText(routeLabels[routeName]))) score += 4;

  for (const moduleHint of queryPlan?.moduleHints || []) {
    if (moduleHintMatches(moduleHint, entry.moduleType)) score += 16;
  }

  for (const routeHint of queryPlan?.routeHints || []) {
    const normalizedRouteHint = normalizeText(routeHint);
    if (!normalizedRouteHint) continue;
    if (normalizedPath.includes(normalizedRouteHint)) score += 8;
    if ((entry.routeHints || []).some(hint => normalizeText(hint) === normalizedRouteHint)) score += 8;
    if (normalizedContent.includes(normalizedRouteHint)) score += 3;
  }

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 5;
    if (normalizedTitle.includes(normalizedTerm)) score += 5;
    if (normalizedContent.includes(normalizedTerm)) score += term.length >= 4 ? 4 : 2;
    if ((entry.keywords || []).some(keyword => normalizeText(keyword) === normalizedTerm)) score += 3;
    if ((entry.aliases || []).some(alias => normalizeText(alias) === normalizedTerm)) score += 4;
    if ((entry.routeHints || []).some(hint => normalizeText(hint) === normalizedTerm)) score += 3;
  }

  for (const term of queryPlan?.expandedTerms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 8;
    if (normalizedTitle.includes(normalizedTerm)) score += 8;
    if (normalizedContent.includes(normalizedTerm)) score += term.length >= 4 ? 6 : 3;
    if ((entry.keywords || []).some(keyword => normalizeText(keyword) === normalizedTerm)) score += 5;
    if ((entry.aliases || []).some(alias => normalizeText(alias) === normalizedTerm)) score += 6;
  }

  if (Array.isArray(entry.questionTypes) && entry.questionTypes.length) {
    const queryTypes = detectQuestionTypes(terms.join(' '));
    for (const type of queryTypes) {
      if (entry.questionTypes.includes(type)) score += 4;
    }
  }

  if (entry.moduleType === 'store') score += 1;
  if (entry.moduleType === 'view' && routeName) score += 1;
  if ((queryPlan?.intents || []).includes('locate_symbol') && entry.keyFunctions?.length) score += 8;
  if ((queryPlan?.intents || []).includes('find_condition') && entry.conditionHints?.length) score += 14;
  if ((queryPlan?.intents || []).includes('find_source') && entry.shopSignals?.length) score += 12;

  return score;
}

function rankSourceIndexEntries(entries = [], terms = [], routeName = '', explicitTargets = [], queryPlan = null, options = {}) {
  const limit = options.limit ?? entries.length;
  return limitRankedEntries(
    (Array.isArray(entries) ? entries : [])
      .map(entry => ({
        ...entry,
        score: scoreSourceIndexEntry(entry, terms, routeName, explicitTargets, queryPlan, options.adapters || {}),
      }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score),
    limit
  );
}

function scoreSourceDirectoryEntry(entry = {}, queryPlan = {}, routeName = '') {
  const normalizedPath = normalizeText(entry.path);
  let score = 0;

  score += scoreModuleTypePreference(entry.moduleType, queryPlan);
  score += scorePathPreference(entry.path, queryPlan);

  for (const target of queryPlan.explicitTargets || []) {
    score += scoreExplicitPathMatch(entry.path, target);
  }

  for (const term of queryPlan.sourceTerms || []) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizedPath.includes(normalizedTerm)) score += 8;
    if ((entry.keywords || []).some(keyword => normalizeText(keyword) === normalizedTerm)) score += 6;
  }

  if ((queryPlan.intents || []).includes('inspect_directory')) score += 120;
  if ((queryPlan.intents || []).includes('locate_file')) score += 30;
  if (routeName && normalizedPath.includes(normalizeText(routeName))) score += 6;

  return score;
}

function rankSourceDirectoryEntries(entries = [], queryPlan = {}, routeName = '', options = {}) {
  const limit = options.limit ?? entries.length;
  return limitRankedEntries(
    (Array.isArray(entries) ? entries : [])
      .map(entry => ({ ...entry, score: scoreSourceDirectoryEntry(entry, queryPlan, routeName) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score),
    limit
  );
}

function resolveSourceSearchQueryPlan(questionOrPlan = '', routeName = '', adapters = {}) {
  if (questionOrPlan && typeof questionOrPlan === 'object' && Array.isArray(questionOrPlan.sourceTerms)) {
    return questionOrPlan;
  }
  if (typeof adapters.resolveQueryPlan === 'function') {
    return adapters.resolveQueryPlan(questionOrPlan, routeName) || {};
  }
  return { sourceTerms: splitIdentifierTerms(questionOrPlan), explicitTargets: [] };
}

function searchSourceSymbols(questionOrPlan = '', routeName = '', adapters = {}, options = {}) {
  const queryPlan = resolveSourceSearchQueryPlan(questionOrPlan, routeName, adapters);
  const symbolEntries = Array.isArray(options.symbolEntries)
    ? options.symbolEntries
    : (typeof adapters.getSourceSymbolEntries === 'function' ? adapters.getSourceSymbolEntries(queryPlan, routeName) : []);
  if (!symbolEntries.length) return [];

  return rankSourceSymbolEntries(symbolEntries, queryPlan, routeName, { limit: options.limit ?? symbolEntries.length });
}

function searchSourceDirectories(questionOrPlan = '', routeName = '', adapters = {}, options = {}) {
  const queryPlan = resolveSourceSearchQueryPlan(questionOrPlan, routeName, adapters);
  const whitelist = Array.isArray(options.whitelist) ? options.whitelist : [];
  const directoryTargets = uniqueItems(
    (queryPlan.explicitTargets || []).filter(target => isDirectoryLikeTarget(target, whitelist))
  );
  if (!directoryTargets.length) return [];

  const resolveDirectoryTarget = typeof adapters.resolveDirectoryTarget === 'function'
    ? adapters.resolveDirectoryTarget
    : () => null;
  const createDirectorySummaryEntry = typeof adapters.createDirectorySummaryEntry === 'function'
    ? adapters.createDirectorySummaryEntry
    : () => null;
  const directoryEntries = directoryTargets
    .map(target => resolveDirectoryTarget(target, queryPlan, routeName))
    .filter(Boolean)
    .map(resolvedDir => createDirectorySummaryEntry(resolvedDir, queryPlan, routeName))
    .filter(Boolean);

  return rankSourceDirectoryEntries(directoryEntries, queryPlan, routeName, { limit: options.limit ?? directoryEntries.length });
}

function searchSourceIndex(questionOrPlan = '', routeName = '', adapters = {}, options = {}) {
  const queryPlan = resolveSourceSearchQueryPlan(questionOrPlan, routeName, adapters);
  const terms = Array.isArray(queryPlan.sourceTerms) ? queryPlan.sourceTerms : [];
  if (!terms.length) return [];

  const sourceIndexEntries = Array.isArray(options.sourceIndexEntries)
    ? options.sourceIndexEntries
    : (typeof adapters.getSourceIndexEntries === 'function' ? adapters.getSourceIndexEntries(queryPlan, routeName) : []);
  return rankSourceIndexEntries(
    sourceIndexEntries,
    terms,
    routeName,
    queryPlan.explicitTargets || [],
    queryPlan,
    {
      limit: options.limit ?? sourceIndexEntries.length,
      adapters: options.scoringAdapters || {},
    }
  );
}

function searchSourceContext(questionOrPlan = '', routeName = '', adapters = {}, options = {}) {
  const queryPlan = resolveSourceSearchQueryPlan(questionOrPlan, routeName, adapters);
  const terms = Array.isArray(queryPlan.sourceTerms) ? queryPlan.sourceTerms : [];
  if (!terms.length) return [];

  const filePaths = Array.isArray(options.filePaths)
    ? options.filePaths
    : (typeof adapters.collectSourceFiles === 'function' ? adapters.collectSourceFiles(queryPlan, routeName) : []);
  return buildSourceContextCandidatesFromFiles(filePaths, {
    readFileText: typeof adapters.readFileText === 'function' ? adapters.readFileText : () => '',
  }, {
    ...options.contextOptions,
    terms,
    routeName,
    explicitTargets: queryPlan.explicitTargets || [],
    queryPlan,
    limit: options.limit ?? options.contextOptions?.limit ?? filePaths.length,
  });
}

function collectSourceSearchHits(queryPlan = {}, routeName = '', adapters = {}, options = {}) {
  const searchDirectories = typeof adapters.searchDirectories === 'function' ? adapters.searchDirectories : () => [];
  const searchSymbols = typeof adapters.searchSymbols === 'function' ? adapters.searchSymbols : () => [];
  const searchIndex = typeof adapters.searchIndex === 'function' ? adapters.searchIndex : () => [];
  const searchContext = typeof adapters.searchContext === 'function' ? adapters.searchContext : () => [];
  const directoryLimit = Math.max(0, Number(options.directoryLimit) || 0);
  const symbolLimit = Math.max(0, Number(options.symbolLimit) || 0);
  const indexLimit = Math.max(0, Number(options.indexLimit) || 0);
  const contextLimit = Math.max(0, Number(options.contextLimit) || 0);
  const minSymbolHitsForSkipContext = Math.min(
    Number.isFinite(Number(options.minSymbolHitsForSkipContext)) ? Number(options.minSymbolHitsForSkipContext) : 4,
    symbolLimit
  );
  const minIndexHitsForSkipContext = Math.min(
    Number.isFinite(Number(options.minIndexHitsForSkipContext)) ? Number(options.minIndexHitsForSkipContext) : 4,
    indexLimit
  );
  const contextScoreThreshold = Number.isFinite(Number(options.contextScoreThreshold))
    ? Number(options.contextScoreThreshold)
    : 12;

  const sourceDirectoryHits = searchDirectories(queryPlan, routeName).slice(0, directoryLimit);
  const sourceSymbolHits = searchSymbols(queryPlan, routeName).slice(0, symbolLimit);
  const sourceIndexHits = searchIndex(queryPlan, routeName).slice(0, indexLimit);
  let sourceHits = [];

  if (
    sourceDirectoryHits.length < directoryLimit
    || sourceSymbolHits.length < minSymbolHitsForSkipContext
    || sourceIndexHits.length < minIndexHitsForSkipContext
    || ((sourceIndexHits[0]?.score || 0) < contextScoreThreshold && (sourceSymbolHits[0]?.score || 0) < contextScoreThreshold)
  ) {
    sourceHits = searchContext(queryPlan, routeName).slice(0, contextLimit);
  }

  return {
    sourceDirectoryHits,
    sourceSymbolHits,
    sourceIndexHits,
    sourceHits,
  };
}

module.exports = {
  normalizeText,
  splitIdentifierTerms,
  normalizePathTarget,
  hasSupportedSourceExtension,
  collectSourceFiles,
  buildSourceFilesFingerprint,
  buildNounLexiconFingerprint,
  buildSourceIndexFingerprint,
  scoreExplicitPathMatch,
  matchesExplicitPath,
  moduleHintMatches,
  detectSourceModuleType,
  createSourceSymbolEntry,
  collectImportNames,
  createSourceSymbolEntriesForText,
  sanitizeStringArray,
  extractInterestingLines,
  extractDefinitionName,
  extractKeyFunctions,
  extractConfigSignals,
  summarizeSourceSnippet,
  buildSourceIndexEntryFromContent,
  findLineNumberByPattern,
  splitSemanticContentBlock,
  createSemanticBlock,
  collectMarkdownSemanticBlocks,
  collectHtmlSemanticBlocks,
  collectJsonSemanticBlocks,
  collectVueSemanticBlocks,
  collectCodeSemanticBlocks,
  collectSemanticBlocksForText,
  normalizeSourceIndexStore,
  serializeSourceIndexStore,
  loadSourceIndexStoreFromFile,
  saveSourceIndexStoreToFile,
  normalizeNounLexiconStore,
  serializeNounLexiconStore,
  loadNounLexiconStoreFromFile,
  saveNounLexiconStoreToFile,
  buildSourceIndexStatus,
  buildNounLexiconStatus,
  createSourceIndexCachePayload,
  createNounLexiconLookup,
  createNounLexiconCachePayload,
  resolveSourceIndexEntries,
  resolveNounLexiconEntries,
  rebuildSourceIndexEntries,
  rebuildNounLexiconEntries,
  buildSourceIndexStoreFromFiles,
  extractSourceSnippet,
  buildSourceContextCandidate,
  buildSourceContextCandidatesFromFiles,
  isDirectoryLikeTarget,
  resolveExplicitDirectoryTarget,
  resolveWhitelistRelativeFilePath,
  detectSourceDirectoryModuleType,
  createSourceDirectorySummaryEntry,
  scoreSourceFile,
  scoreModuleTypePreference,
  scorePathPreference,
  scoreSourceSymbolEntry,
  rankSourceSymbolEntries,
  scoreSourceIndexEntry,
  rankSourceIndexEntries,
  scoreSourceDirectoryEntry,
  rankSourceDirectoryEntries,
  resolveSourceSearchQueryPlan,
  searchSourceSymbols,
  searchSourceDirectories,
  searchSourceIndex,
  searchSourceContext,
  collectSourceSearchHits,
};
