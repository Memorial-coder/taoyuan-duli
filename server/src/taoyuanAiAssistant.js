const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const cfg = require('./config');

const ROUTE_LABELS = {
  menu: '主菜单',
  hall: '交流大厅',
  farm: '农场',
  animal: '畜棚与宠物',
  home: '家园',
  cottage: '小屋与家庭',
  village: '村庄与 NPC',
  shop: '商店',
  forage: '采集',
  fishing: '钓鱼',
  mining: '矿洞',
  cooking: '烹饪',
  workshop: '作坊加工',
  upgrade: '工具升级',
  inventory: '背包',
  skills: '技能',
  achievement: '成就',
  wallet: '钱包兑换',
  quest: '任务',
  charinfo: '角色信息',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  fishpond: '鱼塘',
};

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const KNOWLEDGE_FILE = path.join(DATA_DIR, 'taoyuan_ai_knowledge.json');
const SOURCE_INDEX_FILE = path.join(DATA_DIR, 'taoyuan_ai_source_index.json');
const SOURCE_INDEX_VERSION = 8;
const NOUN_LEXICON_VERSION = 5;
const SEARCH_RULES_FILE = path.join(DATA_DIR, 'taoyuan_ai_search_rules.json');
const DEFAULT_SEARCH_RULES_FILE = resolveExistingPath([
  '../../data-defaults/taoyuan_ai_search_rules.json',
  '../data-defaults/taoyuan_ai_search_rules.json',
]);
const STRUCTURED_KNOWLEDGE_FILE = path.join(DATA_DIR, 'taoyuan_ai_structured_knowledge.json');
const DEFAULT_STRUCTURED_KNOWLEDGE_FILE = resolveExistingPath([
  '../../data-defaults/taoyuan_ai_structured_knowledge.json',
  '../data-defaults/taoyuan_ai_structured_knowledge.json',
]);
const NOUN_LEXICON_FILE = path.join(DATA_DIR, 'taoyuan_ai_noun_lexicon.json');
const API_KEY_ENV_NAMES = ['TAOYUAN_AI_ASSISTANT_API_KEY', 'AI_ASSISTANT_API_KEY', 'OPENAI_API_KEY'];

let runtimeApiKeyOverride = '';
let legacyApiKeyMigrated = false;
let publicRemoteModelBudgetState = { dayKey: '', usedUnits: 0, requestCount: 0 };
let remoteModelCircuitState = {
  openedUntil: 0,
  consecutiveFailures: 0,
  lastError: '',
  lastErrorAt: 0,
  events: [],
};

function getApiKeyLast4(value = '') {
  const text = String(value || '').trim();
  return text ? text.slice(-4) : '';
}

function maskApiKeyLast4(last4 = '') {
  const normalized = String(last4 || '').trim();
  return normalized ? `****${normalized.slice(-4)}` : '';
}

function readEnvApiKey() {
  for (const name of API_KEY_ENV_NAMES) {
    const value = String(process.env[name] || '').trim();
    if (value) return { value, source: name };
  }
  return { value: '', source: '' };
}

function migrateLegacyStoredApiKey() {
  if (legacyApiKeyMigrated) return;
  legacyApiKeyMigrated = true;

  const legacyKey = String(cfg.get('ai_assistant_api_key') || '').trim();
  if (!legacyKey) return;

  const envKey = readEnvApiKey();
  if (!envKey.value && !runtimeApiKeyOverride) {
    runtimeApiKeyOverride = legacyKey;
  }

  const updates = {
    ai_assistant_api_key: '',
    ai_assistant_api_key_configured: true,
    ai_assistant_api_key_last4: getApiKeyLast4(legacyKey),
  };
  if (typeof cfg.setWithMeta === 'function') {
    cfg.setWithMeta(updates);
  } else {
    cfg.set(updates);
  }
}

function getEffectiveApiKeySecret() {
  migrateLegacyStoredApiKey();
  const envKey = readEnvApiKey();
  if (envKey.value) return envKey.value;
  return runtimeApiKeyOverride;
}

function getApiKeyStatus() {
  migrateLegacyStoredApiKey();
  const envKey = readEnvApiKey();
  if (envKey.value) {
    const last4 = getApiKeyLast4(envKey.value);
    return { configured: true, last4, masked: maskApiKeyLast4(last4), source: 'env' };
  }
  if (runtimeApiKeyOverride) {
    const last4 = getApiKeyLast4(runtimeApiKeyOverride);
    return { configured: true, last4, masked: maskApiKeyLast4(last4), source: 'runtime' };
  }

  const configured = cfg.get('ai_assistant_api_key_configured') === true;
  const last4 = getApiKeyLast4(cfg.get('ai_assistant_api_key_last4'));
  return {
    configured,
    last4: configured ? last4 : '',
    masked: configured ? maskApiKeyLast4(last4) : '',
    source: configured ? 'metadata' : 'none',
  };
}

function isProductionRuntime() {
  return ['production', 'prod'].includes(String(process.env.NODE_ENV || process.env.APP_ENV || '').trim().toLowerCase());
}

function parseModelApiUrlAllowlist() {
  const raw = String(
    process.env.TAOYUAN_AI_ASSISTANT_API_URL_ALLOWLIST
    || process.env.AI_ASSISTANT_API_URL_ALLOWLIST
    || cfg.get('ai_assistant_api_url_allowlist')
    || ''
  );
  return raw
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeHostname(hostname = '') {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isBlockedIpv4(hostname = '') {
  const parts = hostname.split('.').map(item => Number(item));
  if (parts.length !== 4 || parts.some(item => !Number.isInteger(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
  );
}

function parseIpv4MappedIpv6Address(hostname = '') {
  const normalized = normalizeHostname(hostname);
  const match = normalized.match(/^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f:.]+)$/i);
  if (!match) return '';
  const suffix = match[1];
  if (net.isIP(suffix) === 4) return suffix;

  const groups = suffix.split(':');
  if (groups.length !== 2) return '';
  const high = Number.parseInt(groups[0], 16);
  const low = Number.parseInt(groups[1], 16);
  if (
    !Number.isInteger(high)
    || !Number.isInteger(low)
    || high < 0
    || high > 0xffff
    || low < 0
    || low > 0xffff
  ) {
    return '';
  }
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

function isBlockedIpv6(hostname = '') {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  const mappedIpv4 = parseIpv4MappedIpv6Address(normalized);
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab][0-9a-f]?:/i.test(normalized) || normalized.startsWith('fe80:')) return true;
  return false;
}

function isBlockedModelApiHostname(hostname = '') {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isBlockedIpv4(normalized);
  if (ipVersion === 6) return isBlockedIpv6(normalized);
  return false;
}

function modelApiUrlMatchesAllowlist(url, allowlist = []) {
  if (!allowlist.length) return true;
  const href = url.href.replace(/\/+$/, '');
  const hostname = normalizeHostname(url.hostname);

  return allowlist.some(pattern => {
    const raw = String(pattern || '').trim();
    if (!raw) return false;
    if (/^https?:\/\//i.test(raw)) {
      const prefix = raw.replace(/\/+$/, '');
      return href === prefix || href.startsWith(`${prefix}/`);
    }
    const normalizedPattern = normalizeHostname(raw);
    if (!normalizedPattern) return false;
    if (normalizedPattern.startsWith('*.')) {
      const suffix = normalizedPattern.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === normalizedPattern;
  });
}

function validateModelApiUrl(apiUrl = '') {
  const trimmed = String(apiUrl || '').trim();
  if (!trimmed) return { ok: true, url: null, allowlist: parseModelApiUrlAllowlist() };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw createError('模型 API 地址必须是完整 URL', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError('模型 API 地址只允许 HTTP(S) 协议', 400);
  }
  if (isProductionRuntime() && parsed.protocol !== 'https:') {
    throw createError('生产环境模型 API 地址必须使用 HTTPS', 400);
  }
  if (isBlockedModelApiHostname(parsed.hostname)) {
    throw createError('模型 API 地址禁止指向 localhost、内网、保留地址或 link-local 地址', 400);
  }

  const allowlist = parseModelApiUrlAllowlist();
  if (!modelApiUrlMatchesAllowlist(parsed, allowlist)) {
    throw createError('模型 API 地址不在允许域名或前缀列表中', 400);
  }

  return { ok: true, url: parsed, allowlist };
}

function parsePositiveIntegerConfig(name, fallback) {
  const value = Number.parseInt(cfg.get(name), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getPublicRemoteModelBudgetConfig() {
  return {
    dailyBudgetUnits: parsePositiveIntegerConfig('ai_assistant_public_remote_daily_budget_units', 200000),
    dailyRequestLimit: parsePositiveIntegerConfig('ai_assistant_public_remote_daily_request_limit', 200),
  };
}

function getPublicRemoteModelBudgetDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function normalizePublicRemoteModelBudgetState(now = Date.now()) {
  const dayKey = getPublicRemoteModelBudgetDayKey(now);
  if (publicRemoteModelBudgetState.dayKey !== dayKey) {
    publicRemoteModelBudgetState = { dayKey, usedUnits: 0, requestCount: 0 };
  }
  return publicRemoteModelBudgetState;
}

function estimatePublicRemoteModelCostUnits({ question = '', contextLabel = '', snippets = [] } = {}) {
  const evidenceLength = Array.isArray(snippets)
    ? snippets.reduce((sum, item) => {
        return sum
          + String(item?.title || '').length
          + String(item?.content || '').length
          + String(item?.path || '').length;
      }, 0)
    : 0;
  const totalLength = String(question || '').length + String(contextLabel || '').length + evidenceLength;
  return Math.max(1, Math.ceil(totalLength / 4));
}

function consumePublicRemoteModelBudget(payload = {}) {
  const config = getPublicRemoteModelBudgetConfig();
  const state = normalizePublicRemoteModelBudgetState();
  const estimatedUnits = estimatePublicRemoteModelCostUnits(payload);

  if (state.requestCount >= config.dailyRequestLimit) {
    return {
      ok: false,
      reason: 'daily_request_limit',
      estimatedUnits,
      usedUnits: state.usedUnits,
      dailyBudgetUnits: config.dailyBudgetUnits,
      requestCount: state.requestCount,
      dailyRequestLimit: config.dailyRequestLimit,
    };
  }

  if (state.usedUnits + estimatedUnits > config.dailyBudgetUnits) {
    return {
      ok: false,
      reason: 'daily_cost_budget',
      estimatedUnits,
      usedUnits: state.usedUnits,
      dailyBudgetUnits: config.dailyBudgetUnits,
      requestCount: state.requestCount,
      dailyRequestLimit: config.dailyRequestLimit,
    };
  }

  state.usedUnits += estimatedUnits;
  state.requestCount += 1;
  return {
    ok: true,
    reason: '',
    estimatedUnits,
    usedUnits: state.usedUnits,
    dailyBudgetUnits: config.dailyBudgetUnits,
    requestCount: state.requestCount,
    dailyRequestLimit: config.dailyRequestLimit,
  };
}

function resetPublicRemoteModelBudgetForTests() {
  publicRemoteModelBudgetState = { dayKey: '', usedUnits: 0, requestCount: 0 };
}

function getRemoteModelCircuitConfig() {
  return {
    windowMs: parsePositiveIntegerConfig('ai_assistant_model_circuit_window_ms', 300000),
    openMs: parsePositiveIntegerConfig('ai_assistant_model_circuit_open_ms', 120000),
    failureThreshold: parsePositiveIntegerConfig('ai_assistant_model_circuit_failure_threshold', 3),
    timeoutThreshold: parsePositiveIntegerConfig('ai_assistant_model_circuit_timeout_threshold', 2),
  };
}

function summarizeRemoteModelError(error = {}) {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || '远程模型调用失败').trim().slice(0, 160);
  const type = error?.name === 'AbortError' || status === 504 || /超时|timeout/i.test(message)
    ? 'timeout'
    : 'failure';
  return { type, status, message };
}

function pruneRemoteModelCircuitEvents(now = Date.now(), config = getRemoteModelCircuitConfig()) {
  remoteModelCircuitState.events = remoteModelCircuitState.events
    .filter(event => now - event.at < config.windowMs)
    .slice(-50);
  return remoteModelCircuitState.events;
}

function getRemoteModelCircuitStatus(now = Date.now()) {
  const config = getRemoteModelCircuitConfig();
  const events = pruneRemoteModelCircuitEvents(now, config);
  const failureCount = events.length;
  const timeoutCount = events.filter(event => event.type === 'timeout').length;
  const openedUntil = Math.max(0, Number(remoteModelCircuitState.openedUntil) || 0);
  const open = openedUntil > now;
  return {
    state: open ? 'open' : 'closed',
    open,
    openedUntil: open ? openedUntil : 0,
    retryAfterMs: open ? Math.max(1, openedUntil - now) : 0,
    consecutiveFailures: Math.max(0, Number(remoteModelCircuitState.consecutiveFailures) || 0),
    windowMs: config.windowMs,
    failureCount,
    timeoutCount,
    failureThreshold: config.failureThreshold,
    timeoutThreshold: config.timeoutThreshold,
    lastError: remoteModelCircuitState.lastError,
    lastErrorAt: remoteModelCircuitState.lastErrorAt || 0,
  };
}

function recordRemoteModelSuccess() {
  remoteModelCircuitState.consecutiveFailures = 0;
  remoteModelCircuitState.openedUntil = 0;
  pruneRemoteModelCircuitEvents();
}

function recordRemoteModelFailure(error = {}) {
  const now = Date.now();
  const config = getRemoteModelCircuitConfig();
  const summary = summarizeRemoteModelError(error);
  remoteModelCircuitState.consecutiveFailures += 1;
  remoteModelCircuitState.lastError = `${summary.type}:${summary.status || 'unknown'}:${summary.message}`;
  remoteModelCircuitState.lastErrorAt = now;
  remoteModelCircuitState.events.push({ at: now, type: summary.type, status: summary.status });

  const events = pruneRemoteModelCircuitEvents(now, config);
  const timeoutCount = events.filter(event => event.type === 'timeout').length;
  if (
    remoteModelCircuitState.consecutiveFailures >= config.failureThreshold
    || timeoutCount >= config.timeoutThreshold
  ) {
    remoteModelCircuitState.openedUntil = now + config.openMs;
  }

  return getRemoteModelCircuitStatus(now);
}

function resetRemoteModelCircuitForTests() {
  remoteModelCircuitState = {
    openedUntil: 0,
    consecutiveFailures: 0,
    lastError: '',
    lastErrorAt: 0,
    events: [],
  };
}

function resolveExistingPath(candidates = []) {
  for (const candidate of candidates) {
    const abs = path.resolve(__dirname, candidate);
    try {
      if (fs.existsSync(abs)) return abs;
    } catch {}
  }
  return path.resolve(__dirname, candidates[0] || '.');
}

const SOURCE_WHITELIST = [
  {
    key: 'taoyuan-main/src',
    abs: resolveExistingPath([
      '../../taoyuan-main/src',
      '../taoyuan-main/src',
    ]),
  },
  {
    key: 'taoyuan-main/electron',
    abs: resolveExistingPath([
      '../../taoyuan-main/electron',
      '../taoyuan-main/electron',
    ]),
  },
  {
    key: 'taoyuan-main/README.md',
    abs: resolveExistingPath([
      '../../taoyuan-main/README.md',
      '../taoyuan-main/README.md',
    ]),
  },
  {
    key: 'taoyuan-main/docs/guide-book.html',
    abs: resolveExistingPath([
      '../../taoyuan-main/docs/guide-book.html',
      '../taoyuan-main/docs/guide-book.html',
    ]),
  },
  {
    key: 'taoyuan-main/docs/guide.html',
    abs: resolveExistingPath([
      '../../taoyuan-main/docs/guide.html',
      '../taoyuan-main/docs/guide.html',
    ]),
  },
  {
    key: 'taoyuan-main/docs/index.html',
    abs: resolveExistingPath([
      '../../taoyuan-main/docs/index.html',
      '../taoyuan-main/docs/index.html',
    ]),
  },
  {
    key: 'README.md',
    abs: resolveExistingPath([
      '../../README.md',
      '../README.md',
    ]),
  },
  {
    key: 'guide.md',
    abs: resolveExistingPath([
      '../../guide.md',
      '../guide.md',
    ]),
  },
  {
    key: 'server/src',
    abs: resolveExistingPath(['.']),
  },
  {
    key: 'data-defaults',
    abs: resolveExistingPath([
      '../../data-defaults',
      '../data-defaults',
    ]),
  },
];

const SOURCE_ALLOWED_EXTENSIONS = new Set(['.js', '.ts', '.vue', '.json', '.md', '.html']);
const SOURCE_MAX_FILE_SIZE = 2 * 1024 * 1024;
const SOURCE_MAX_HITS = 4;
const SOURCE_FULLFILE_EXPAND_LIMIT = 4;
const SOURCE_DIRECTORY_FULLFILE_LIMIT = 4;
const SOURCE_MAX_FULLFILE_CONTENT_LENGTH = 120000;
const SOURCE_SNIPPET_RADIUS = 220;
const SOURCE_MAX_SNIPPET_LENGTH = 480;
const SOURCE_SNIPPET_CONTEXT_LINES = 6;
const SOURCE_DIRECTORY_CHILD_LIMIT = 8;
const SOURCE_SKIP_LINE_PATTERN = /(authorization|bearer\s+|api[_ -]?key|secret|password|admin[_ -]?token)/i;
const SOURCE_BLOCKED_PATH_PATTERN = /(^|[\\/])(node_modules|dist|build|coverage|\.git|taoyuan_hall_uploads|taoyuan_saves)([\\/]|$)|(^|[\\/])\.env(\.|$)|package-lock\.json$|(^|[\\/])(taoyuan_ai_source_index|taoyuan_ai_knowledge|taoyuan_ai_noun_lexicon)\.json$/i;
const SOURCE_INDEX_MAX_HITS = 6;
const SOURCE_INDEX_CACHE_TTL = 5 * 60 * 1000;
const SOURCE_INDEX_CHUNK_SIZE = 28;
const SOURCE_INDEX_CHUNK_OVERLAP = 6;
const SOURCE_SEMANTIC_MAX_BLOCK_LINES = 72;
const SOURCE_SEMANTIC_TARGET_BLOCK_LINES = 44;
const SOURCE_STAGE1_POOL_LIMIT = 12;
const SOURCE_STAGE1_EXPAND_LIMIT = 6;
const SOURCE_RECALL_KNOWLEDGE_LIMIT = 4;
const SOURCE_RECALL_DIRECTORY_LIMIT = 4;
const SOURCE_RECALL_SYMBOL_LIMIT = 12;
const SOURCE_RECALL_INDEX_LIMIT = 12;
const SOURCE_RECALL_CONTEXT_LIMIT = 8;
const SOURCE_RECALL_NOUN_LEXICON_LIMIT = 8;

const DATA_FILE_ROUTE_HINTS = {
  'fish.ts': ['fishing'],
  'fishPond.ts': ['fishpond'],
  'fishpond.ts': ['fishpond'],
  'crops.ts': ['farm'],
  'animals.ts': ['animal'],
  'buildings.ts': ['home', 'cottage'],
  'npcs.ts': ['village'],
  'shops.ts': ['shop'],
  'market.ts': ['shop'],
  'forage.ts': ['forage'],
  'mine.ts': ['mining'],
  'recipes.ts': ['cooking'],
  'cooking.ts': ['cooking'],
  'breeding.ts': ['breeding'],
  'museum.ts': ['museum'],
  'guild.ts': ['guild'],
  'hanhai.ts': ['hanhai'],
  'achievements.ts': ['achievement'],
  'quests.ts': ['quest'],
  'equipmentSets.ts': ['upgrade', 'inventory'],
};

const SEARCH_RULES_CACHE_TTL = 60 * 1000;
const NOUN_LEXICON_CACHE_TTL = 5 * 60 * 1000;
const NOUN_LEXICON_MAX_RELATED = 12;
const NOUN_LEXICON_QUERY_MATCH_LIMIT = 12;
const NOUN_LEXICON_KEYWORD_LIMIT = 16;
const GENERIC_NOUN_STOPWORDS = new Set([
  '当前', '页面', '功能', '操作', '系统', '内容', '说明', '提示', '数据', '配置', '代码', '源码', '接口', '模块', '文件',
  'logic', 'value', 'values', 'label', 'labels', 'title', 'content', 'message', 'messages', 'button', 'buttons', 'dialog', 'modal',
  'item', 'items', 'list', 'lists', 'index', 'route', 'routes', 'view', 'views', 'store', 'stores', 'state', 'helper', 'utils',
]);
const NOUN_TEXT_FIELD_KEYS = new Set([
  'name', 'title', 'label', 'description', 'placeholder', 'subtitle', 'caption', 'hint', 'action', 'bonus', 'message', 'toast',
  'displayName', 'display_name', 'npcName', 'role', 'term', 'itemName', 'shopName', 'skillName', 'questName', 'buildingName',
  'locationName', 'materialName', 'cropName', 'fishName', 'recipeName', 'shortLabel', 'alt', 'summary',
]);
const NOUN_IDENTIFIER_FIELD_KEYS = new Set([
  'id', 'itemId', 'npcId', 'questId', 'shopId', 'skillId', 'recipeId', 'buildingId', 'locationId', 'materialId', 'cropId', 'fishId',
  'seedId', 'saplingId', 'perkId', 'toolId', 'machineId',
]);
const NOUN_SOURCE_TYPE_WEIGHTS = {
  'ui-text': 4,
  'route-label': 4,
  'game-data': 5,
  docs: 3,
  identifier: 2,
  backend: 3,
};
const SOURCE_QUERY_HINT_RULES = [
  {
    test: /鱼饲料|喂鱼|鱼塘饲料|鱼食|fish[_ -]?feed|feedfish/i,
    terms: ['fish_feed', 'feedFish', '鱼饲料', '鱼塘', '喂食', '药铺', 'yaopu'],
  },
  {
    test: /鱼塘|养鱼|鱼苗|繁殖鱼|病鱼|水质|fishpond/i,
    terms: ['fishpond', 'FishPond', 'useFishPondStore', '鱼塘', 'feedFish', 'cleanPond'],
  },
  {
    test: /药铺|在哪里买|哪买|购买|商店|店里/i,
    terms: ['shop', 'Shop', 'yaopu', '药铺', 'itemId', 'price'],
  },
  {
    test: /水质改良剂|净水|净化|清理鱼塘/i,
    terms: ['water_purifier', 'cleanPond', '水质改良剂', '鱼塘', 'yaopu'],
  },
  {
    test: /喂食|喂养|饲料/i,
    terms: ['feed', 'wasFed', '喂食', '饲料'],
  },
];

const SOURCE_SYNONYM_RULES = [
  {
    canonical: 'fish_feed',
    aliases: ['鱼饲料', '喂鱼饲料', '鱼塘饲料', '鱼食'],
  },
  {
    canonical: 'feedFish',
    aliases: ['喂鱼', '喂食鱼', '给鱼喂食', '鱼塘喂食'],
  },
  {
    canonical: 'yaopu',
    aliases: ['药铺', '药店', '药房'],
  },
  {
    canonical: 'fishpond',
    aliases: ['鱼塘', '养鱼', '养殖鱼', '鱼池'],
  },
  {
    canonical: 'bait',
    aliases: ['鱼饵', '饵料', '钓鱼饵'],
  },
  {
    canonical: 'recipe',
    aliases: ['配方', '食谱', '公式', '合成表'],
  },
  {
    canonical: 'condition',
    aliases: ['条件', '前置', '限制', '要求', '解锁'],
  },
  {
    canonical: 'shop',
    aliases: ['商店', '商铺', '店里', '购买', '在哪里买', '哪里买'],
  },
  {
    canonical: 'source',
    aliases: ['来源', '获得', '获取', '产出', '怎么来'],
  },
];

const SOURCE_QUESTION_TYPE_RULES = [
  { type: 'resource-source', test: /在哪里|在哪|去哪|怎么获得|怎么获取|怎么搞|怎么弄|来源|从哪来|哪来|掉落|产出|获取|差.*去|缺.*去/i },
  { type: 'resource-use', test: /用途|有什么用|用来|拿来|能做什么|需要|消耗|要几个|要多少/i },
  { type: 'shop-purchase', test: /在哪买|哪里买|购买|商店|药铺|渔具铺|铁匠铺|万物铺/i },
  { type: 'task-diagnosis', test: /任务|委托|订单|卡住|缺什么|缺口|差.*个|差.*条|交付|要的|卡关/i },
  { type: 'today-planning', test: /今天|当前|现在|先做|该做|安排|规划|要干嘛/i },
  { type: 'page-explanation', test: /页面|界面|入口|在哪看|怎么看|怎么重连|开吗|开放吗/i },
  { type: 'system-mechanic', test: /系统|机制|怎么玩|周赛|育种|鱼塘|博物馆|公会|瀚海|商路|节会|灯会/i },
  { type: 'risk-reminder', test: /风险|提醒|快到期|换季|背包满|体力不足|现金不足|生病|来不及/i },
  { type: 'next-step-suggestion', test: /下一步|接下来|路线|推进|先做|要干嘛|怎么办/i },
  { type: 'precondition', test: /条件|前置|要求|限制|为什么不能|解锁/i },
  { type: 'recipe', test: /配方|食谱|合成|制作|加工/i },
  { type: 'page-feature', test: /页面|系统|功能|有什么用|做什么|怎么玩/i },
];

const QUERY_SLOT_FIELDS = ['items', 'tasks', 'npcs', 'locations', 'quantities', 'seasons', 'systems'];
const QUERY_SLOT_FIELD_LIMITS = {
  items: 8,
  tasks: 6,
  npcs: 6,
  locations: 8,
  quantities: 6,
  seasons: 4,
  systems: 8,
};
const QUERY_SLOT_TYPE_TO_FIELD = {
  item: 'items',
  items: 'items',
  resource: 'items',
  crop: 'items',
  fish: 'items',
  mineral: 'items',
  quest_item: 'items',
  recipe: 'items',
  seed: 'items',
  material: 'items',
  task: 'tasks',
  quest: 'tasks',
  order: 'tasks',
  npc: 'npcs',
  person: 'npcs',
  villager: 'npcs',
  location: 'locations',
  place: 'locations',
  shop: 'locations',
  building: 'locations',
  season: 'seasons',
  system: 'systems',
  mechanic: 'systems',
  route: 'systems',
  page: 'systems',
};
const STRUCTURED_ITEM_KINDS = new Set(['resource', 'crop', 'fish', 'mineral', 'quest_item', 'recipe', 'seed', 'material']);
const STRUCTURED_SYSTEM_KINDS = new Set(['shop', 'fishpond', 'breeding', 'museum', 'guild', 'hanhai', 'festival', 'npc', 'building']);
const STRUCTURED_TASK_RECORD_TYPES = new Set(['quest', 'task', 'order', 'planning', 'route', 'unlock']);
const STRUCTURED_LOCATION_RECORD_TYPES = new Set(['shop', 'fishing', 'mining', 'harvest', 'system', 'fishpond', 'breeding', 'museum', 'guild', 'hanhai', 'festival', 'location']);
const LOCATION_ROUTE_NAMES = new Set(['farm', 'shop', 'forage', 'fishing', 'mining', 'cooking', 'workshop', 'upgrade', 'village', 'home', 'breeding', 'museum', 'guild', 'hanhai', 'fishpond', 'festival']);
const RESOURCE_LOOKUP_KINDS = new Set(['resource', 'crop', 'fish', 'mineral', 'quest_item', 'recipe', 'seed', 'material']);
const RESOURCE_SOURCE_TYPE_LABELS = {
  shop: '购买',
  harvest: '种植',
  forage: '采集',
  fishing: '钓鱼',
  mining: '采矿',
  processing: '加工',
  recipe: '配方',
  quest: '任务',
  drop: '掉落',
  fishpond: '鱼塘',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  recycle: '回收',
  travel: '旅行商人',
  ingredient: '材料',
  stamina: '恢复',
  upgrade: '升级',
  building: '建筑',
  unlock: '解锁',
  system: '系统',
};
const RESOURCE_SOURCE_PRIORITY = [
  'shop',
  'harvest',
  'forage',
  'fishing',
  'mining',
  'processing',
  'recycle',
  'fishpond',
  'breeding',
  'quest',
  'drop',
  'recipe',
  'system',
];
const SEASON_SLOT_CANDIDATES = [
  { canonical: 'spring', label: '春季', aliases: ['春', '春季', '春天', '春日'] },
  { canonical: 'summer', label: '夏季', aliases: ['夏', '夏季', '夏天', '夏日'] },
  { canonical: 'autumn', label: '秋季', aliases: ['秋', '秋季', '秋天', '秋日'] },
  { canonical: 'winter', label: '冬季', aliases: ['冬', '冬季', '冬天', '冬日'] },
];
const CHINESE_NUMBER_VALUES = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const SOURCE_MODULE_LABELS = {
  view: '页面视图',
  store: '状态存储',
  data: '数据配置',
  'default-data': '默认配置/默认数据',
  'runtime-data': '运行时数据',
  utils: '工具逻辑',
  routes: '路由接口',
  router: '前端路由',
  component: '界面组件',
  electron: '桌面端 / Electron',
  docs: '项目文档',
  directory: '目录 / 模块概览',
  module: '源码模块',
};

const SOURCE_QUESTION_CATEGORIES = {
  static: 'static-content',
  logic: 'runtime-logic',
  ui: 'ui-operation',
  mixed: 'hybrid',
  general: 'general',
};

const SOURCE_CATEGORY_MODULE_PRIORITIES = {
  [SOURCE_QUESTION_CATEGORIES.static]: ['data', 'default-data', 'docs', 'store', 'view', 'component', 'module'],
  [SOURCE_QUESTION_CATEGORIES.logic]: ['store', 'utils', 'routes', 'module', 'data', 'view', 'component', 'docs'],
  [SOURCE_QUESTION_CATEGORIES.ui]: ['view', 'component', 'router', 'store', 'docs', 'data', 'module'],
  [SOURCE_QUESTION_CATEGORIES.mixed]: ['store', 'data', 'view', 'component', 'docs', 'routes', 'module'],
  [SOURCE_QUESTION_CATEGORIES.general]: ['docs', 'view', 'store', 'data', 'component', 'module'],
};

const SOURCE_CONCEPT_EXPANSION_RULES = [
  {
    test: /柴火|firewood/i,
    terms: ['firewood', '柴火'],
  },
  {
    test: /套装|set bonus|equipment set/i,
    terms: ['equipmentSets', 'setBonus', 'set', '套装'],
  },
  {
    test: /丰收套装|harvest set/i,
    terms: ['harvest_set', 'harvestSet', '丰收套装', 'equipmentSets'],
  },
  {
    test: /果树|fruit tree/i,
    terms: ['fruitTree', 'fruitTrees', 'removeFruitTree', 'wildTrees', '果树'],
  },
  {
    test: /鱼饲料|fish[_ -]?feed/i,
    terms: ['fish_feed', 'fishFeed', '鱼饲料', 'feedFish', 'useFishPondStore'],
  },
  {
    test: /按钮|入口|怎么点|点击|界面|页面|显示|弹窗/i,
    terms: ['button', 'dialog', 'modal', 'view', 'component', '页面', '按钮', '入口'],
  },
  {
    test: /喜好|偏好|送礼|好感/i,
    terms: ['gift', 'favorite', 'preferences', '喜好', '好感', 'npc'],
  },
  {
    test: /鱼出现条件|鱼在哪|鱼什么时候出现|钓鱼条件/i,
    terms: ['fish', 'season', 'weather', 'location', 'timeRequirement', '钓鱼', '鱼类'],
  },
  {
    test: /默认配置|README|玩法说明|游戏说明/i,
    terms: ['README', 'readme', '默认配置', 'sys_config', '说明文档'],
  },
];

const CODE_SEARCH_INTENTS = new Set([
  'locate_file',
  'locate_symbol',
  'find_implementation',
  'find_condition',
  'find_call_relation',
  'inspect_directory',
]);

const CODE_IDENTIFIER_STOPWORDS = new Set([
  'this', 'that', 'these', 'those', 'what', 'where', 'which', 'when', 'why', 'how',
  'file', 'files', 'code', 'source', 'logic', 'data', 'page', 'pages', 'route', 'routes',
  'question', 'answer', 'content', 'model', 'local', 'false', 'true', 'null', 'undefined',
]);

const SOURCE_SYMBOL_KIND_LABELS = {
  function: '函数',
  const: '常量/变量',
  class: '类',
  interface: '接口',
  type: '类型',
  store: '状态存储',
  route: '接口路由',
  import: '引用',
  're-export': '转导出',
  module: '模块符号',
};

const AI_ASSISTANT_INTERNAL_PATH_PATTERN = /(?:^|[\/])(server\/src\/taoyuanAiAssistant\.js|taoyuan-main\/src\/components\/game\/AiAssistantAdminPanel\.vue|taoyuan-main\/src\/utils\/taoyuanAiApi\.ts|taoyuan-main\/src\/types\/aiAssistant\.ts)(?:$|[\/])/i;
const SOURCE_RUNTIME_DATA_PATH_PATTERN = /(^|[\/])data[\/](checkins|lotteries|pat|pity|quota_requests|rob_history|rob_stats|taoyuan_active_slots|taoyuan_exchange_limits|taoyuan_hall|winners)\.json$/i;

let sourceIndexCache = {
  builtAt: 0,
  entries: [],
  symbolEntries: [],
};

let searchRulesCache = {
  loadedAt: 0,
  fingerprint: '',
  compiled: null,
};

let structuredKnowledgeCache = {
  loadedAt: 0,
  fingerprint: '',
  entries: [],
};

let nounLexiconCache = {
  loadedAt: 0,
  fingerprint: '',
  entries: [],
  lookup: new Map(),
};

const BUILTIN_KNOWLEDGE_BASE = [
  {
    id: 'overview',
    title: '桃源乡整体玩法',
    routeNames: ['menu'],
    keywords: ['桃源乡', '这游戏', '玩法', '新手', '开局', '做什么', '怎么玩'],
    access: 'public',
    content:
      '桃源乡是一款以四季经营为核心的文字田园模拟游戏。主线内容覆盖种地、采集、钓鱼、矿洞、养殖、烹饪、加工、社交、任务、成就、公会、博物馆、瀚海和鱼塘等系统。新手通常先从农场播种、完成任务、熟悉商店和村庄功能开始，再逐步扩展到钓鱼、挖矿、养殖和长期养成。',
  },
  {
    id: 'menu-save',
    title: '开始游戏与存档方式',
    routeNames: ['menu'],
    keywords: ['存档', '本地存储', '服务端', '导入', '导出', '新旅程', '开始游戏'],
    access: 'public',
    content:
      '主菜单支持新开存档、读取已有存档、导入导出存档，以及在本地存储和服务端持久化之间切换。默认是本地存储；如果切换到服务端持久化，则会按当前登录账号读取对应存档。开始新游戏时需要先同意隐私协议、创建角色，再选择田庄类型。',
  },
  {
    id: 'menu-save-difference',
    title: '本地存档和服务端存档的区别',
    routeNames: ['menu'],
    keywords: ['本地存档和服务端存档有什么区别', '存档会不会丢', '本地存档', '服务端存档', '换设备', '清缓存'],
    access: 'public',
    content:
      '本地存档主要保存在当前浏览器环境里，适合单设备快速游玩；如果清理浏览器缓存、换设备或更换环境，本地存档可能不会自动跟过去。服务端存档则绑定当前登录账号，更适合跨设备继续玩。稳妥做法是定期导出存档备份，尤其是在切换模式、换设备或做大改动前。',
  },
  {
    id: 'farm',
    title: '农场与种植',
    routeNames: ['farm'],
    keywords: ['农场', '种地', '播种', '浇水', '收获', '作物', '土地', '种子'],
    access: 'public',
    content:
      '农场页面是开荒与赚钱的重要起点。常见流程是：开垦土地 -> 播种 -> 浇水 -> 等待成熟 -> 收获并出售。换季前要留意作物是否适应下一季，不适应的作物会在换季时枯萎。新手前期适合先稳定播种、保证每天浇水，并通过出售收获物积累铜钱。',
  },
  {
    id: 'seed-source',
    title: '种子在哪里买，怎么获得',
    routeNames: ['farm', 'shop'],
    keywords: ['种子在哪里买', '哪里买种子', '种子来源', '怎么买种子', '种子怎么获得', '种子哪里有', '买种子'],
    access: 'public',
    content:
      '所有普通作物的种子都在商圈的万物铺（陈伯）购买，价格因作物而异。万物铺的种子按季节动态更新，只出售当前季节可种植的种子——春季只卖春季作物种子，夏季只卖夏季作物种子，以此类推。想提前囤货跨季种子是无法在万物铺买到的，需要在对应季节内购买。部分高级作物（如翡翠茶、月光稻等）的种子也在万物铺，但价格更高。购买种子后在农场界面点击已开垦的土地即可播种。',
  },
  {
    id: 'season-crops',
    title: '各季节可以种哪些作物',
    routeNames: ['farm'],
    keywords: ['春季种什么', '夏季种什么', '秋季种什么', '冬季种什么', '当季作物', '这季能种什么', '哪些作物是春天的', '季节作物'],
    access: 'public',
    content:
      '春季作物：青菜、萝卜、土豆、茶苗、油菜、蚕豆、春笋、水蜜桃、豆角等。夏季作物：西瓜、稻谷、莲藕、芝麻、辣椒、莲子、玉米、丝瓜、茄子等。秋季作物：南瓜、红薯、菊花、桂花、生姜、白菜、菠菜、芥菜、韭菜等。冬季作物：冬小麦、大蒜、雪莲等。各季种子只在万物铺当季出售，换季前确认好库存以免错过播种窗口。多茬作物可在同一季节内多次收获，性价比较高。',
  },
  {
    id: 'crop-regrowth',
    title: '什么作物可以多次收获（多茬作物）',
    routeNames: ['farm'],
    keywords: ['多茬', '多次收获', '反复收获', '不用重新播种', '多次采收', '茶苗', '蚕豆', '韭菜'],
    access: 'public',
    content:
      '多茬作物首次成熟后无需重新播种，可在固定天数内再次生长并收获，地块会显示「多茬 X/Y」标记。春季多茬作物：茶苗（多茬3次，4天再生）、蚕豆（多茬3次，3天再生）、春笋（多茬）等。秋季多茬：韭菜等。这类作物前期投入少、收益稳定，特别适合新手早期主力种植。',
  },
  {
    id: 'animal',
    title: '养殖、畜棚与宠物',
    routeNames: ['animal'],
    keywords: ['动物', '养殖', '鸡舍', '牛棚', '宠物', '喂食', '抚摸', '产物'],
    access: 'public',
    content:
      '养殖系统包含畜棚建筑、动物照料与宠物互动。动物通常需要喂食、保持心情和健康，才更稳定地产出物品。部分开局田庄会提供额外养殖优势，例如特定农场会更早拥有鸡舍或初始动物。宠物则偏向陪伴与氛围养成。',
  },
  {
    id: 'home-family',
    title: '家园、小屋与家庭',
    routeNames: ['home', 'cottage'],
    keywords: ['家', '小屋', '休息', '睡觉', '家庭', '孩子', '配偶', '同性', '领养', '婚姻'],
    access: 'public',
    content:
      '家园和小屋相关页面会影响每日休息、家庭互动与部分恢复效果。休息会推进到第二天；太晚睡或体力见底时，恢复效果可能会下降，还可能伴随额外损失。与配偶和家庭相关的互动会逐步解锁，包括孩子相关事件。当前可婚 NPC 已支持同性婚姻；若是同性伴侣，后续家庭扩展会走“迎一个孩子回家”的专线，而不是沿用孕期设定。',
  },
  {
    id: 'npc-village',
    title: '村庄、NPC 与社交',
    routeNames: ['village'],
    keywords: ['村庄', 'npc', '好感', '社交', '村民', '恋爱', '结婚', '同性', '知己', '婚姻', '领养'],
    access: 'public',
    content:
      '村庄区域主要承载 NPC 互动、好感度成长和关系推进。提升好感通常有助于解锁更多对话、事件或奖励。部分剧情与心事件会随着关系推进触发，因此日常交流、送礼和按任务指引推进都很重要。当前可婚 NPC 已支持同性婚姻；同性之间也保留知己线，作为非恋爱关系路线。',
  },
  {
    id: 'shop',
    title: '商店与采购',
    routeNames: ['shop'],
    keywords: ['商店', '买', '购买', '种子店', '商人', '补给'],
    access: 'public',
    content:
      '商店页面用于购买种子、材料和部分成长资源。前期建议优先购买能快速形成收益闭环的物品，例如稳定回本的种子、基础工具或任务所需资源。购买前要兼顾铜钱、体力与季节天数。',
  },
  {
    id: 'shop-categories',
    title: '商圈里各商铺卖什么',
    routeNames: ['shop'],
    keywords: ['药铺卖什么', '渔具铺卖什么', '铁匠铺卖什么', '万物铺卖什么', '商圈', '商店有哪些', '在哪里买', '哪里买'],
    access: 'public',
    content:
      '商圈内不同商铺分工明确：万物铺偏种子、杂货、扩容与农场相关物资；铁匠铺偏矿石锭、部分饰品和装备合成；镖局偏武器；渔具铺偏鱼饵、浮漂、蟹笼等钓鱼物资；药铺偏肥料、草药、兽药和鱼塘相关消耗品；绸缎庄偏布料、礼物、香类与部分穿戴物。找资源时，先确认自己要的是种植、钓鱼、养殖还是战斗系物资，再去对应商铺。',
  },
  {
    id: 'shop-hours',
    title: '商店不开门时怎么排查',
    routeNames: ['shop'],
    keywords: ['商店不开门', '商圈为什么进不去', '店铺没开', '营业时间', '为什么不能买'],
    access: 'public',
    content:
      '商店是否可用通常要检查两层：先看商圈总入口是否在开放时段；进入商圈后，再看具体子商铺是否因为星期、天气或季节条件而休息。也就是说，“能进商圈”不等于“每一家店都营业”。遇到买不了东西时，先确认当前时间，再留意当天条件是否满足。',
  },
  {
    id: 'forage',
    title: '采集玩法',
    routeNames: ['forage'],
    keywords: ['采集', '野外', '蘑菇', '草药', '捡东西', '探索'],
    access: 'public',
    content:
      '采集系统适合在前中期补充资源、食材和任务材料。它的优势是门槛较低，通常不需要大量前置投入。若手头紧张或暂时不想高强度下矿、钓鱼，采集是比较稳妥的补给方式。',
  },
  {
    id: 'fishing',
    title: '钓鱼玩法',
    routeNames: ['fishing'],
    keywords: ['钓鱼', '鱼', '钓竿', '鱼饵', '浮漂', '鱼点'],
    access: 'public',
    content:
      '钓鱼系统支持不同地点、鱼种和配套道具。随着钓竿、鱼饵或浮漂配置提升，钓鱼效率和收益会更稳定。想靠钓鱼赚钱时，建议优先熟悉可进入的钓点、体力消耗与背包空间，再逐步升级相关装备。',
  },
  {
    id: 'fishing-basics',
    title: '钓鱼前要准备什么',
    routeNames: ['fishing'],
    keywords: ['钓鱼前要准备什么', '怎么开始钓鱼', '钓鱼怎么玩', '钓鱼前置', '鱼饵在哪里买', '浮漂'],
    access: 'public',
    content:
      '开始钓鱼前，通常要先选择钓点，再确认自己有合适的鱼竿、鱼饵和背包空间。鱼饵、浮漂这类物资一般优先看渔具铺；部分道具也可能通过加工制造获得。若当前时间太晚、条件不满足，或当前地点没有可钓目标，页面通常会直接提示。',
  },
  {
    id: 'mining',
    title: '矿洞探索',
    routeNames: ['mining'],
    keywords: ['矿洞', '挖矿', '矿石', '楼层', '怪物', '炸弹'],
    access: 'public',
    content:
      '矿洞玩法结合采矿、战斗、寻宝和楼层推进。进入矿洞前应留意体力、回复道具、背包空位和武器状况。矿洞是获取矿石、宝石和部分材料的重要来源，也是后续工具升级和高级制作的基础。',
  },
  {
    id: 'cooking',
    title: '烹饪与料理',
    routeNames: ['cooking'],
    keywords: ['烹饪', '料理', '食谱', '做饭', '恢复'],
    access: 'public',
    content:
      '烹饪系统通常依赖食谱和食材。料理既可以用于恢复，也可能成为礼物、任务材料或收益品。前期适合优先做容易获取材料的基础料理，兼顾恢复与收益。',
  },
  {
    id: 'processing',
    title: '作坊加工',
    routeNames: ['workshop'],
    keywords: ['作坊', '加工', '机器', '原料', '成品', '工坊'],
    access: 'public',
    content:
      '作坊会把原料进一步加工成更高价值的成品，是中后期提高利润的重要方式。要高效使用作坊，通常需要提前准备原料、机器与仓储空间，并安排稳定的产线节奏。',
  },
  {
    id: 'upgrade',
    title: '工具升级',
    routeNames: ['upgrade'],
    keywords: ['工具', '升级', '水壶', '锄头', '镐子', '钓竿升级'],
    access: 'public',
    content:
      '工具升级能显著改善日常效率，例如降低重复劳动成本、提升处理范围或强化部分玩法手感。若你感觉体力总是不够、日常循环太慢，优先考虑升级常用工具通常很划算。',
  },
  {
    id: 'inventory',
    title: '背包与仓储',
    routeNames: ['inventory'],
    keywords: ['背包', '仓库', '格子', '物品', '整理', '容量'],
    access: 'public',
    content:
      '背包页面负责查看和管理道具。背包空间有限，外出前最好先整理物品、清出格子。游戏里也有储物箱、虚空箱等仓储概念，方便把材料分类存放，减少来回搬运。',
  },
  {
    id: 'inventory-where-to-check',
    title: '资源不知道去哪看时怎么找',
    routeNames: ['inventory', 'shop', 'quest', 'workshop', 'cooking'],
    keywords: ['材料在哪看', '资源从哪里来', '不知道去哪找', '缺材料', '物品来源', '去哪里看'],
    access: 'public',
    content:
      '如果你不知道某种资源从哪里来，推荐先按这个顺序排查：先看任务页面有没有前置要求，再看商店能不能直接买，再看背包里的物品描述与来源提示，最后去烹饪或作坊页面确认是否能制作或加工。很多“找不到材料”的情况，不一定是没开放，而是还没去对的页面检查。',
  },
  {
    id: 'skills',
    title: '技能成长',
    routeNames: ['skills'],
    keywords: ['技能', '等级', '专精', '熟练度', 'perk'],
    access: 'public',
    content:
      '技能会随着相关行为逐步成长，例如种植、采集、钓鱼、挖矿或战斗。技能提升后通常会带来效率提升、特殊加成或专精选择。规划长期流派时，可以优先投入自己最常用的玩法。',
  },
  {
    id: 'achievement',
    title: '成就系统',
    routeNames: ['achievement'],
    keywords: ['成就', '奖励', '完成度', '目标'],
    access: 'public',
    content:
      '成就系统会记录你在多个维度的进度，例如生产、探索、收集或经营成果。达成成就通常能获得奖励，同时也能帮助你判断当前阶段还有哪些玩法尚未深入。',
  },
  {
    id: 'wallet',
    title: '钱包与额度兑换',
    routeNames: ['wallet'],
    keywords: ['钱包', '铜钱', '兑换', '额度', '导入', '导出'],
    access: 'public',
    content:
      '钱包页面支持桃源铜钱与外部额度的双向兑换，具体汇率和每日限制由管理员统一配置。玩家侧更需要关注的是：当前是否允许兑换、今天是否达到限额，以及兑换后自己的余额变化。若页面提示超出限制，通常说明已经触发当日上限。',
  },
  {
    id: 'wallet-limit',
    title: '为什么提示超出当日限制',
    routeNames: ['wallet'],
    keywords: ['为什么提示超出当日限制', '超出限制', '今日上限', '兑换失败', '转入上限', '提现上限'],
    access: 'public',
    content:
      '钱包的“超出当日限制”一般表示你已经触发了当天的转入或提现额度上限。要注意：转入和提现通常是两套独立统计，不是共用一个数字。出现这个提示时，先看当前是转入还是提现，再看今日累计值和页面显示的上限。',
  },
  {
    id: 'quest',
    title: '任务与推进路线',
    routeNames: ['quest'],
    keywords: ['任务', '主线', '委托', '目标', '卡住', '怎么推进'],
    access: 'public',
    content:
      '任务系统负责给出阶段目标和成长方向。若你不知道下一步做什么，优先查看任务页面通常最有效。很多新手卡点并不是数值不够，而是还没有去完成前置任务、解锁某个场景或准备指定材料。',
  },
  {
    id: 'charinfo',
    title: '角色信息',
    routeNames: ['charinfo'],
    keywords: ['角色', '属性', '信息', '人物面板', '状态'],
    access: 'public',
    content:
      '角色信息页会集中展示人物当前状态，例如基础信息、部分成长结果或长期养成记录。若想判断自己的阶段成长是否均衡，可以先从角色信息和技能、任务页面一起查看。',
  },
  {
    id: 'breeding',
    title: '育种系统',
    routeNames: ['breeding'],
    keywords: ['育种', '杂交', '种子基因', '培育'],
    access: 'public',
    content:
      '育种系统偏中后期玩法，用于通过种子或基因属性组合出更有目标性的新品种。它适合喜欢长期培养和收集的玩家。第一阶段不用急着深挖，先把基础生产链稳定下来会更轻松。',
  },
  {
    id: 'museum',
    title: '博物馆捐赠',
    routeNames: ['museum'],
    keywords: ['博物馆', '捐赠', '图鉴', '收藏', '文物'],
    access: 'public',
    content:
      '博物馆系统鼓励你把矿石、化石、文物或特殊藏品逐步收集并捐赠。它更偏长期收集目标，适合在日常挖矿、钓鱼和探索中顺手推进。',
  },
  {
    id: 'guild',
    title: '公会系统',
    routeNames: ['guild'],
    keywords: ['公会', '捐献', '公会等级', '商店'],
    access: 'public',
    content:
      '公会系统通常会围绕捐献、等级提升和公会商店展开。若你已经有较稳定的资源来源，可以把部分富余资源投入公会，从而换取新的成长路线或奖励。',
  },
  {
    id: 'hanhai',
    title: '瀚海与扩展玩法',
    routeNames: ['hanhai'],
    keywords: ['瀚海', '赌场', '特殊区域', '扩展玩法'],
    access: 'public',
    content:
      '瀚海区域属于扩展玩法的一部分，通常包含更偏娱乐或特殊资源逻辑的内容。建议在主线经营已经稳定后再深入体验，这样资源压力会更小。',
  },
  {
    id: 'fishpond',
    title: '鱼塘养殖',
    routeNames: ['fishpond'],
    keywords: ['鱼塘', '养鱼', '繁殖', '水产'],
    access: 'public',
    content:
      '鱼塘系统提供了鱼类养殖、繁殖和持续产出的路线，适合与钓鱼系统联动推进。鱼塘需要先建造；日常管理通常包括放鱼、喂食、维持水质、治疗病鱼和收获产出。想稳定出货时，重点留意是否已喂食、鱼是否成熟、是否生病，以及鱼塘容量是否还有空间。',
  },
  {
    id: 'fish-feed',
    title: '鱼饲料在哪里获得',
    routeNames: ['fishpond', 'shop'],
    keywords: ['鱼饲料', '鱼塘饲料', '喂鱼', '鱼吃什么', '鱼饲料在哪买', '鱼饲料怎么获得', '鱼饲料在哪里获得'],
    access: 'public',
    content:
      '鱼饲料是鱼塘养殖专用道具，不是钓鱼时用的鱼饵。当前整理到的玩法信息里，鱼饲料可在药铺直接购买，价格通常是 30 文。使用鱼饲料前，要先建好鱼塘、鱼塘里至少有鱼、当天还没喂过，并且背包里要有鱼饲料。喂食时会消耗 1 个鱼饲料，并提升鱼塘状态。',
  },
  {
    id: 'fish-feed-vs-bait',
    title: '鱼饲料和鱼饵的区别',
    routeNames: ['fishing', 'fishpond', 'shop'],
    keywords: ['鱼饵', '鱼饲料', '区别', '钓鱼饵料', '钓鱼用什么', '鱼塘用什么'],
    access: 'public',
    content:
      '鱼饵和鱼饲料不是同一种东西。钓鱼页面常用的是鱼饵，用来在钓点抛竿；鱼塘页面使用的是鱼饲料，用来给已经放进鱼塘的鱼喂食、维持养殖节奏。简单记：钓鱼看渔具铺和钓鱼页，养鱼看鱼塘和药铺。',
  },
  {
    id: 'fishpond-breeding',
    title: '鱼塘繁殖需要什么条件',
    routeNames: ['fishpond'],
    keywords: ['鱼塘繁殖', '鱼怎么繁殖', '怎么繁殖鱼', '鱼塘配对', '繁殖条件'],
    access: 'public',
    content:
      '鱼塘繁殖通常要求两条同种、成熟且未生病的鱼，同时鱼塘还要有空余容量。不同种不能直接配对；如果鱼塘已满、鱼还是幼鱼，或其中一条生病，就很难顺利繁殖。想配种时，优先看鱼的成熟状态、健康状态和当前容量。',
  },
  {
    id: 'hall',
    title: '交流大厅',
    routeNames: ['hall'],
    keywords: ['交流大厅', '发帖', '回复', '求助', '悬赏', '举报'],
    access: 'public',
    content:
      '交流大厅支持发帖、回复、求助、举报和管理员处理等功能。玩家可以在这里交流玩法、提问或查看别人留下的经验。如果你遇到不清楚的机制，也可以先看看大厅里是否已有类似讨论。',
  },
  {
    id: 'hall-posting',
    title: '交流大厅怎么发帖和回复',
    routeNames: ['hall'],
    keywords: ['怎么发帖', '怎么回复', '游客能不能发帖', '大厅怎么用', '求助帖', '悬赏有什么用'],
    access: 'public',
    content:
      '交流大厅支持浏览、搜索、发帖、回复、求助和举报。通常任何人都能浏览内容，但发帖、回复、举报这类互动一般需要先登录账号。求助帖还能结合悬赏与最佳回复机制使用：如果你是发帖人，通常可以在问题解决后标记最佳回复，并把悬赏发给对应回答。',
  },
  {
    id: 'strategy-money',
    title: '前期赚钱建议',
    routeNames: ['farm', 'forage', 'fishing', 'shop'],
    keywords: ['赚钱', '铜钱', '前期怎么赚', '收益', '缺钱'],
    access: 'public',
    content:
      '前期赚钱建议以稳定为主：优先保证农场有持续产出，其次利用采集和钓鱼补充现金流。不要一开始就把钱全压在高门槛系统上；先保证每日能有收获和出售循环，再逐步把利润投入工具升级、作坊和养殖。',
  },
  {
    id: 'strategy-stuck',
    title: '卡关时的通用排查',
    routeNames: ['quest', 'menu', 'hall'],
    keywords: ['卡住', '为什么不行', '打不开', '没反应', '下一步', '不会玩'],
    access: 'public',
    content:
      '如果你感觉流程卡住，建议优先检查四件事：一是任务页面是否有未完成的前置目标；二是背包或仓库里是否缺少关键材料；三是时间、季节、体力或金钱是否满足当前操作；四是目标功能是否需要先去对应页面或建筑解锁。',
  },
];

function loadKnowledgeStore() {
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
      if (raw && Array.isArray(raw.entries)) return raw;
    }
  } catch {}
  return { entries: [] };
}

function saveKnowledgeStore(store) {
  fs.mkdirSync(path.dirname(KNOWLEDGE_FILE), { recursive: true });
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify({ entries: store.entries || [] }, null, 2), 'utf8');
}

function loadSourceIndexStore() {
  try {
    if (fs.existsSync(SOURCE_INDEX_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SOURCE_INDEX_FILE, 'utf8'));
      if (raw && raw.version === SOURCE_INDEX_VERSION && Array.isArray(raw.entries)) {
        return {
          ...raw,
          symbolEntries: Array.isArray(raw.symbolEntries) ? raw.symbolEntries : [],
          symbolCount: Number(raw.symbolCount) || (Array.isArray(raw.symbolEntries) ? raw.symbolEntries.length : 0),
        };
      }
    }
  } catch {}
  return {
    version: SOURCE_INDEX_VERSION,
    builtAt: 0,
    fingerprint: '',
    fileCount: 0,
    entryCount: 0,
    entries: [],
    symbolCount: 0,
    symbolEntries: [],
  };
}

function saveSourceIndexStore(store) {
  fs.mkdirSync(path.dirname(SOURCE_INDEX_FILE), { recursive: true });
  fs.writeFileSync(
    SOURCE_INDEX_FILE,
    JSON.stringify(
      {
        version: SOURCE_INDEX_VERSION,
        builtAt: Number(store?.builtAt) || Date.now(),
        fingerprint: String(store?.fingerprint || ''),
        fileCount: Number(store?.fileCount) || 0,
        entryCount: Number(store?.entryCount) || 0,
        entries: Array.isArray(store?.entries) ? store.entries : [],
        symbolCount: Number(store?.symbolCount) || 0,
        symbolEntries: Array.isArray(store?.symbolEntries) ? store.symbolEntries : [],
      },
      null,
      2
    ),
    'utf8'
  );
}

function loadNounLexiconStore() {
  try {
    if (fs.existsSync(NOUN_LEXICON_FILE)) {
      const raw = JSON.parse(fs.readFileSync(NOUN_LEXICON_FILE, 'utf8'));
      if (raw && raw.version === NOUN_LEXICON_VERSION && Array.isArray(raw.entries)) {
        return raw;
      }
    }
  } catch {}
  return {
    version: NOUN_LEXICON_VERSION,
    builtAt: 0,
    fingerprint: '',
    fileCount: 0,
    entryCount: 0,
    entries: [],
  };
}

function saveNounLexiconStore(store) {
  fs.mkdirSync(path.dirname(NOUN_LEXICON_FILE), { recursive: true });
  fs.writeFileSync(
    NOUN_LEXICON_FILE,
    JSON.stringify(
      {
        version: NOUN_LEXICON_VERSION,
        builtAt: Number(store?.builtAt) || Date.now(),
        fingerprint: String(store?.fingerprint || ''),
        fileCount: Number(store?.fileCount) || 0,
        entryCount: Number(store?.entryCount) || 0,
        entries: Array.isArray(store?.entries) ? store.entries : [],
      },
      null,
      2
    ),
    'utf8'
  );
}

function buildBuiltinSearchRules() {
  return {
    queryHints: SOURCE_QUERY_HINT_RULES.map((rule, index) => ({
      id: `builtin-query-${index}`,
      pattern: rule?.test?.source || '',
      flags: rule?.test?.flags || 'i',
      terms: Array.isArray(rule?.terms) ? rule.terms : [],
      routeHints: Array.isArray(rule?.routeHints) ? rule.routeHints : [],
      questionTypes: Array.isArray(rule?.questionTypes) ? rule.questionTypes : [],
    })),
    synonyms: SOURCE_SYNONYM_RULES.map(rule => ({
      canonical: String(rule?.canonical || '').trim(),
      aliases: Array.isArray(rule?.aliases) ? rule.aliases : [],
    })),
    conceptExpansions: SOURCE_CONCEPT_EXPANSION_RULES.map((rule, index) => ({
      id: `builtin-concept-${index}`,
      pattern: rule?.test?.source || '',
      flags: rule?.test?.flags || 'i',
      terms: Array.isArray(rule?.terms) ? rule.terms : [],
    })),
    routeAliases: Object.entries(ROUTE_LABELS).map(([routeName, label]) => ({
      routeName,
      aliases: [label],
    })),
    resourceCatalog: [],
    shopCatalog: [],
  };
}

function safeReadJsonFile(filePath, fallback = null) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function buildSearchRulesFingerprint() {
  const hash = crypto.createHash('sha1');
  hash.update(JSON.stringify(buildBuiltinSearchRules()));
  for (const filePath of [DEFAULT_SEARCH_RULES_FILE, SEARCH_RULES_FILE]) {
    try {
      if (!filePath || !fs.existsSync(filePath)) continue;
      hash.update(filePath);
      hash.update(fs.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  return hash.digest('hex');
}

function sanitizeStringArray(value) {
  return unique(
    toArray(value)
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
}

function mergeSearchRuleRecords(baseList = [], nextList = [], keyResolver) {
  const map = new Map();
  for (const item of baseList) {
    const key = keyResolver(item);
    if (key) map.set(key, { ...item });
  }
  for (const item of nextList) {
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

function compileRuleRegExp(pattern = '', flags = 'i') {
  try {
    return new RegExp(String(pattern || ''), String(flags || 'i'));
  } catch {
    return null;
  }
}

function compileSearchRules(raw = {}) {
  const routeAliasLookup = new Map();
  const compiledRouteAliases = (raw.routeAliases || [])
    .map(item => ({
      routeName: String(item?.routeName || '').trim(),
      aliases: sanitizeStringArray(item?.aliases),
    }))
    .filter(item => item.routeName);

  for (const item of compiledRouteAliases) {
    routeAliasLookup.set(item.routeName, unique([
      ...(routeAliasLookup.get(item.routeName) || []),
      ...item.aliases,
      ROUTE_LABELS[item.routeName] || '',
    ].filter(Boolean)));
  }

  return {
    queryHints: (raw.queryHints || [])
      .map(item => ({
        id: String(item?.id || item?.pattern || '').trim(),
        test: item?.test instanceof RegExp ? item.test : compileRuleRegExp(item?.pattern || item?.test?.source || '', item?.flags || item?.test?.flags || 'i'),
        terms: sanitizeStringArray(item?.terms),
        routeHints: sanitizeStringArray(item?.routeHints),
        questionTypes: sanitizeStringArray(item?.questionTypes),
      }))
      .filter(item => item.test && item.terms.length),
    synonyms: (raw.synonyms || [])
      .map(item => ({
        canonical: String(item?.canonical || '').trim(),
        aliases: sanitizeStringArray(item?.aliases),
        label: String(item?.label || '').trim(),
        slotType: String(item?.slotType || '').trim(),
        officialId: String(item?.officialId || '').trim(),
        routeHints: sanitizeStringArray(item?.routeHints),
        questionTypes: sanitizeStringArray(item?.questionTypes),
      }))
      .filter(item => item.canonical),
    conceptExpansions: (raw.conceptExpansions || [])
      .map(item => ({
        id: String(item?.id || item?.pattern || '').trim(),
        test: item?.test instanceof RegExp ? item.test : compileRuleRegExp(item?.pattern || item?.test?.source || '', item?.flags || item?.test?.flags || 'i'),
        terms: sanitizeStringArray(item?.terms),
      }))
      .filter(item => item.test && item.terms.length),
    routeAliases: compiledRouteAliases,
    routeAliasLookup,
    resourceCatalog: (raw.resourceCatalog || []).map(item => ({
      id: String(item?.id || '').trim(),
      title: String(item?.title || '').trim(),
      aliases: sanitizeStringArray(item?.aliases),
      kind: String(item?.kind || '').trim(),
      slotType: String(item?.slotType || '').trim(),
      terms: sanitizeStringArray(item?.terms),
      sourceTerms: sanitizeStringArray(item?.sourceTerms),
      shopTerms: sanitizeStringArray(item?.shopTerms),
      routeHints: sanitizeStringArray(item?.routeHints),
      questionTypes: sanitizeStringArray(item?.questionTypes),
    })),
    shopCatalog: (raw.shopCatalog || []).map(item => ({
      id: String(item?.id || '').trim(),
      title: String(item?.title || '').trim(),
      aliases: sanitizeStringArray(item?.aliases),
      kind: String(item?.kind || '').trim(),
      slotType: String(item?.slotType || '').trim(),
      terms: sanitizeStringArray(item?.terms),
      routeHints: sanitizeStringArray(item?.routeHints),
      questionTypes: sanitizeStringArray(item?.questionTypes),
    })),
  };
}

function getSearchRules() {
  const fingerprint = buildSearchRulesFingerprint();
  if (
    searchRulesCache.compiled
    && searchRulesCache.fingerprint === fingerprint
    && Date.now() - searchRulesCache.loadedAt < SEARCH_RULES_CACHE_TTL
  ) {
    return searchRulesCache.compiled;
  }

  const merged = mergeSearchRules(
    buildBuiltinSearchRules(),
    safeReadJsonFile(DEFAULT_SEARCH_RULES_FILE, {}),
    safeReadJsonFile(SEARCH_RULES_FILE, {})
  );
  const compiled = compileSearchRules(merged);
  searchRulesCache = {
    loadedAt: Date.now(),
    fingerprint,
    compiled,
  };
  return compiled;
}

function buildStructuredKnowledgeFingerprint() {
  const hash = crypto.createHash('sha1');
  for (const filePath of [DEFAULT_STRUCTURED_KNOWLEDGE_FILE, STRUCTURED_KNOWLEDGE_FILE]) {
    try {
      if (!filePath || !fs.existsSync(filePath)) continue;
      hash.update(filePath);
      hash.update(fs.readFileSync(filePath, 'utf8'));
    } catch {}
  }
  return hash.digest('hex');
}

function sanitizeStructuredKnowledgeText(value = '', maxLength = 120) {
  return sanitizePublicSummaryText(value, '').slice(0, maxLength).trim();
}

function sanitizeStructuredKnowledgeRecords(value = [], maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const type = sanitizeStructuredKnowledgeText(item.type, 40);
      const label = sanitizeStructuredKnowledgeText(item.label, 80);
      const detail = sanitizeStructuredKnowledgeText(item.detail, 160);
      const quantity = sanitizeStructuredKnowledgeText(item.quantity, 40);
      const conditions = sanitizeStringArray(item.conditions)
        .map(condition => sanitizeStructuredKnowledgeText(condition, 60))
        .filter(Boolean)
        .slice(0, 4);
      if (!label && !detail) return null;
      return { type, label, detail, quantity, conditions };
    })
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeStructuredKnowledgeEntry(input = {}) {
  const id = sanitizeStructuredKnowledgeText(input.id, 120);
  const title = sanitizeStructuredKnowledgeText(input.title, 80);
  if (!id || !title) return null;
  const routeHints = sanitizeStringArray(input.routeHints)
    .filter(routeName => ROUTE_LABELS[routeName])
    .slice(0, 5);
  const aliases = sanitizeStringArray(input.aliases)
    .map(alias => sanitizeStructuredKnowledgeText(alias, 60))
    .filter(Boolean)
    .slice(0, 12);
  const questionTypes = sanitizeStringArray(input.questionTypes)
    .map(type => sanitizeStructuredKnowledgeText(type, 50))
    .filter(Boolean)
    .slice(0, 8);
  const relations = sanitizeStringArray(input.relations)
    .map(item => sanitizeStructuredKnowledgeText(item, 60))
    .filter(Boolean)
    .slice(0, 8);

  return {
    id,
    title,
    kind: sanitizeStructuredKnowledgeText(input.kind, 40) || 'resource',
    aliases,
    routeHints,
    questionTypes,
    summary: sanitizeStructuredKnowledgeText(input.summary, 180),
    unlock: sanitizeStructuredKnowledgeText(input.unlock || input.unlockStatus, 180),
    fastRoute: sanitizeStructuredKnowledgeText(input.fastRoute, 220),
    recommendedRoute: sanitizeStructuredKnowledgeText(input.recommendedRoute, 240),
    routeSteps: sanitizeStringArray(input.routeSteps)
      .map(item => sanitizeStructuredKnowledgeText(item, 140))
      .filter(Boolean)
      .slice(0, 5),
    sources: sanitizeStructuredKnowledgeRecords(input.sources, 6),
    uses: sanitizeStructuredKnowledgeRecords(input.uses, 6),
    relations,
  };
}

function getStructuredKnowledgeEntries() {
  const fingerprint = buildStructuredKnowledgeFingerprint();
  if (
    structuredKnowledgeCache.entries.length
    && structuredKnowledgeCache.fingerprint === fingerprint
    && Date.now() - structuredKnowledgeCache.loadedAt < SEARCH_RULES_CACHE_TTL
  ) {
    return structuredKnowledgeCache.entries;
  }

  const rawEntries = [
    ...(safeReadJsonFile(DEFAULT_STRUCTURED_KNOWLEDGE_FILE, {})?.entries || []),
    ...(safeReadJsonFile(STRUCTURED_KNOWLEDGE_FILE, {})?.entries || []),
  ];
  const map = new Map();
  for (const rawEntry of rawEntries) {
    const entry = sanitizeStructuredKnowledgeEntry(rawEntry);
    if (entry) map.set(entry.id, entry);
  }
  structuredKnowledgeCache = {
    loadedAt: Date.now(),
    fingerprint,
    entries: Array.from(map.values()),
  };
  return structuredKnowledgeCache.entries;
}

function scoreStructuredKnowledgeEntry(entry = {}, question = '', routeName = '', queryPlan = {}) {
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

function retrieveStructuredKnowledge(question, routeName, queryPlan = {}) {
  return getStructuredKnowledgeEntries()
    .map(entry => ({ entry, score: scoreStructuredKnowledgeEntry(entry, question, routeName, queryPlan) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => buildStructuredKnowledgeCandidate(item.entry, item.score));
}

function getMatchedSearchRuleQueryHints(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const normalized = normalizeText(raw);
  const rules = getSearchRules();
  return (rules.queryHints || []).filter(rule => {
    if (!rule?.test) return false;
    return rule.test.test(raw) || rule.test.test(normalized);
  });
}

function getMatchedCatalogEntries(text = '', seedTerms = []) {
  const rules = getSearchRules();
  const normalizedQuestion = normalizeText(text);
  const normalizedSeeds = unique((seedTerms || []).map(item => normalizeText(item)).filter(Boolean));
  return [...(rules.resourceCatalog || []), ...(rules.shopCatalog || [])].filter(item => {
    const candidates = [
      item.id,
      item.title,
      ...(item.aliases || []),
      ...(item.terms || []),
      ...(item.sourceTerms || []),
      ...(item.shopTerms || []),
    ].filter(Boolean);

    return candidates.some(candidate => {
      const normalizedCandidate = normalizeText(candidate);
      return normalizedCandidate && (
        normalizedQuestion.includes(normalizedCandidate)
        || normalizedSeeds.includes(normalizedCandidate)
      );
    });
  });
}

function getMatchedQuestionTypes(text = '', seedTerms = []) {
  const matchedTypes = [
    ...detectQuestionTypes(text),
    ...getMatchedSearchRuleQueryHints(text).flatMap(rule => rule.questionTypes || []),
    ...getMatchedCatalogEntries(text, seedTerms).flatMap(item => item.questionTypes || []),
  ];
  return unique(matchedTypes.filter(Boolean));
}

function normalizeQuerySlotField(slotType = '') {
  const normalized = String(slotType || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  return QUERY_SLOT_TYPE_TO_FIELD[normalized] || '';
}

function createEmptyQuerySlots() {
  return QUERY_SLOT_FIELDS.reduce((acc, field) => {
    acc[field] = [];
    return acc;
  }, {});
}

function sanitizeSlotText(value = '', maxLength = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isUsableSlotAlias(value = '') {
  const text = sanitizeSlotText(value);
  if (!text) return false;
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (/^[a-z0-9_]+$/i.test(text)) return normalized.length >= 2;
  return normalized.length >= 2 || SEASON_SLOT_CANDIDATES.some(item => item.aliases.includes(text));
}

function addQuerySlotCandidate(catalog, field, payload = {}) {
  if (!QUERY_SLOT_FIELDS.includes(field)) return;
  const label = sanitizeSlotText(payload.label || payload.canonical || payload.id);
  const canonical = sanitizeSlotText(payload.canonical || payload.id || label);
  const id = sanitizeSlotText(payload.id || payload.officialId || canonical);
  const aliases = unique([
    id,
    canonical,
    label,
    ...(payload.aliases || []),
    ...(payload.officialIds || []),
  ].map(item => sanitizeSlotText(item)).filter(isUsableSlotAlias));
  if (!aliases.length) return;

  catalog.push({
    field,
    id,
    canonical,
    label: label || canonical || id,
    aliases,
    officialIds: unique([id, canonical, payload.officialId].map(item => sanitizeSlotText(item)).filter(isUsableSlotAlias)),
    kind: sanitizeSlotText(payload.kind || payload.slotType || '', 40),
    source: sanitizeSlotText(payload.source || 'rules', 40),
    routeHints: sanitizeStringArray(payload.routeHints),
    questionTypes: sanitizeStringArray(payload.questionTypes),
  });
}

function addStructuredRecordSlotCandidates(catalog, entry = {}, records = [], fallbackField = '') {
  for (const record of records || []) {
    const label = sanitizeSlotText(record?.label);
    if (!label) continue;
    const recordType = sanitizeSlotText(record?.type, 40).toLowerCase();
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
      });
    }
  }
}

function buildQuerySlotAliasCatalog() {
  const catalog = [];
  const rules = getSearchRules();

  for (const candidate of SEASON_SLOT_CANDIDATES) {
    addQuerySlotCandidate(catalog, 'seasons', {
      id: candidate.canonical,
      canonical: candidate.canonical,
      label: candidate.label,
      aliases: candidate.aliases,
      kind: 'season',
      source: 'builtin-season',
    });
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
    });
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
    });
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
    });
  }

  for (const item of rules.routeAliases || []) {
    const routeName = sanitizeSlotText(item.routeName, 40);
    if (!routeName) continue;
    const label = ROUTE_LABELS[routeName] || (item.aliases || [])[0] || routeName;
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
    addQuerySlotCandidate(catalog, 'systems', payload);
    if (LOCATION_ROUTE_NAMES.has(routeName)) {
      addQuerySlotCandidate(catalog, 'locations', { ...payload, kind: 'location' });
    }
  }

  for (const entry of getStructuredKnowledgeEntries()) {
    const kind = sanitizeSlotText(entry.kind, 40);
    const field = STRUCTURED_ITEM_KINDS.has(kind)
      ? 'items'
      : STRUCTURED_SYSTEM_KINDS.has(kind)
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
      });
    }

    addStructuredRecordSlotCandidates(
      catalog,
      entry,
      (entry.sources || []).filter(record => STRUCTURED_LOCATION_RECORD_TYPES.has(String(record?.type || '').toLowerCase())),
      'locations'
    );
    addStructuredRecordSlotCandidates(
      catalog,
      entry,
      [...(entry.sources || []), ...(entry.uses || [])].filter(record => {
        const type = String(record?.type || '').toLowerCase();
        const label = String(record?.label || '');
        return STRUCTURED_TASK_RECORD_TYPES.has(type) || /任务|委托|订单|讨伐|周赛|展陈|商路|房间|活动|供货/.test(label);
      }),
      'tasks'
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

function findQuerySlotAliasMatch(normalizedQuestion = '', candidate = {}) {
  const officialIds = candidate.officialIds || [];
  for (const officialId of officialIds) {
    const normalized = normalizeText(officialId);
    if (normalized && normalizedQuestion.includes(normalized)) {
      return { match: officialId, matchType: 'official-id', length: normalized.length };
    }
  }
  let best = null;
  for (const alias of candidate.aliases || []) {
    const normalized = normalizeText(alias);
    if (!normalized || normalized.length < 2 || !normalizedQuestion.includes(normalized)) continue;
    const matchType = normalizeText(alias) === normalizeText(candidate.label) ? 'canonical' : 'alias';
    if (!best || normalized.length > best.length || (best.matchType !== 'official-id' && matchType === 'canonical')) {
      best = { match: alias, matchType, length: normalized.length };
    }
  }
  return best;
}

function pushQuerySlot(slots, field, payload = {}) {
  if (!QUERY_SLOT_FIELDS.includes(field)) return;
  const label = sanitizeSlotText(payload.label || payload.canonical || payload.id || payload.match);
  const canonical = sanitizeSlotText(payload.canonical || payload.id || label);
  const id = sanitizeSlotText(payload.id || canonical || label);
  const match = sanitizeSlotText(payload.match || label);
  if (!label && !canonical && !id && !match) return;
  const normalizedKey = normalizeText(id || canonical || label || match);
  if (!normalizedKey) return;
  if ((slots[field] || []).some(item => normalizeText(item.id || item.canonical || item.label || item.match) === normalizedKey)) return;
  slots[field].push({
    id,
    canonical,
    label: label || canonical || id,
    match,
    matchType: sanitizeSlotText(payload.matchType || 'alias', 32),
    kind: sanitizeSlotText(payload.kind || '', 40),
    source: sanitizeSlotText(payload.source || 'query', 40),
    routeHints: sanitizeStringArray(payload.routeHints),
    questionTypes: sanitizeStringArray(payload.questionTypes),
  });
}

function parseChineseNumber(value = '') {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  if (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_VALUES, text)) return CHINESE_NUMBER_VALUES[text];
  const tenIndex = text.indexOf('十');
  if (tenIndex >= 0) {
    const left = text.slice(0, tenIndex);
    const right = text.slice(tenIndex + 1);
    const tens = left ? CHINESE_NUMBER_VALUES[left] : 1;
    const ones = right ? CHINESE_NUMBER_VALUES[right] : 0;
    if (Number.isFinite(tens) && Number.isFinite(ones)) return tens * 10 + ones;
  }
  return null;
}

function extractQuantitySlots(question = '') {
  const raw = String(question || '');
  const quantities = [];
  const pattern = /(?:差|缺|还差|需要|要|补)?\s*(\d+|[一二两三四五六七八九十]{1,3})\s*(个|条|份|颗|块|封|单|只|棵|朵|张|组|次|点|文)?/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const value = parseChineseNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    quantities.push({
      value,
      unit: sanitizeSlotText(match[2] || '', 12),
      match: sanitizeSlotText(match[0], 32),
    });
  }
  return quantities.slice(0, QUERY_SLOT_FIELD_LIMITS.quantities);
}

function extractQuerySlots(question = '') {
  const slots = createEmptyQuerySlots();
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return slots;

  for (const candidate of buildQuerySlotAliasCatalog()) {
    const match = findQuerySlotAliasMatch(normalizedQuestion, candidate);
    if (!match) continue;
    pushQuerySlot(slots, candidate.field, {
      ...candidate,
      match: match.match,
      matchType: match.matchType,
    });
  }

  for (const quantity of extractQuantitySlots(question)) {
    pushQuerySlot(slots, 'quantities', {
      id: `qty:${quantity.value}:${quantity.unit || 'unit'}`,
      canonical: String(quantity.value),
      label: quantity.unit ? `${quantity.value}${quantity.unit}` : String(quantity.value),
      match: quantity.match,
      matchType: 'quantity',
      kind: 'quantity',
      source: 'quantity-regex',
    });
    const last = slots.quantities[slots.quantities.length - 1];
    if (last) {
      last.value = quantity.value;
      last.unit = quantity.unit;
    }
  }

  for (const field of QUERY_SLOT_FIELDS) {
    const limit = QUERY_SLOT_FIELD_LIMITS[field] || 6;
    slots[field] = (slots[field] || [])
      .sort((a, b) => {
        const aOfficial = a.matchType === 'official-id' ? 1 : 0;
        const bOfficial = b.matchType === 'official-id' ? 1 : 0;
        return bOfficial - aOfficial || String(b.match || '').length - String(a.match || '').length;
      })
      .slice(0, limit);
  }
  return slots;
}

function getQuerySlotTerms(slots = {}) {
  const terms = [];
  for (const field of QUERY_SLOT_FIELDS) {
    for (const item of slots[field] || []) {
      terms.push(
        item.id,
        item.canonical,
        item.label,
        item.match,
        ...(item.routeHints || []),
        ...(item.questionTypes || [])
      );
    }
  }
  return unique(terms.filter(Boolean));
}

function getQuestionTypesFromSlots(slots = {}) {
  return unique(QUERY_SLOT_FIELDS.flatMap(field => (slots[field] || []).flatMap(item => item.questionTypes || [])).filter(Boolean));
}

function getRouteHintsFromSlots(slots = {}) {
  return unique(QUERY_SLOT_FIELDS.flatMap(field => (slots[field] || []).flatMap(item => item.routeHints || [])).filter(Boolean));
}

function querySlotsHaveNamedObject(slots = {}) {
  return ['items', 'tasks', 'npcs', 'locations', 'seasons', 'systems'].some(field => (slots[field] || []).length > 0);
}

function buildQueryClarification(question = '', { slots = {}, questionTypes = [], intents = [], routeName = '' } = {}) {
  const hasKnownIntent = (intents || []).some(intent => intent && intent !== 'gameplay_qa');
  if (routeName || querySlotsHaveNamedObject(slots) || questionTypes.length || hasKnownIntent) {
    return { required: false, reason: '', options: [] };
  }
  return {
    required: true,
    reason: 'unrecognized-query',
    options: [
      '你想查某个物品从哪来吗？',
      '你想看某个任务卡在哪里吗？',
      '你想了解当前页面或系统怎么玩吗？',
    ],
  };
}

function summarizeQuerySlotsForTrace(slots = {}) {
  const result = createEmptyQuerySlots();
  for (const field of QUERY_SLOT_FIELDS) {
    result[field] = (slots[field] || []).map(item => ({
      id: item.id || '',
      label: item.label || '',
      canonical: item.canonical || '',
      match: item.match || '',
      matchType: item.matchType || '',
      kind: item.kind || '',
      source: item.source || '',
      value: item.value,
      unit: item.unit,
      routeHints: Array.isArray(item.routeHints) ? item.routeHints : [],
      questionTypes: Array.isArray(item.questionTypes) ? item.questionTypes : [],
    }));
  }
  return result;
}

function pickPreferredDisplayTerm(current = '', candidate = '') {
  const currentValue = String(current || '').trim();
  const nextValue = String(candidate || '').trim();
  if (!currentValue) return nextValue;
  if (!nextValue) return currentValue;

  const currentHasChinese = /[\u4e00-\u9fa5]/.test(currentValue);
  const nextHasChinese = /[\u4e00-\u9fa5]/.test(nextValue);
  if (nextHasChinese && !currentHasChinese) return nextValue;
  if (currentHasChinese && !nextHasChinese) return currentValue;
  if (nextValue.length < currentValue.length) return nextValue;
  return currentValue;
}

function isLikelyNounTerm(value = '') {
  const term = String(value || '').trim();
  if (!term || term.length < 2 || term.length > 48) return false;
  if (/^(?:https?:|\.\/|\.\.|\/)/i.test(term)) return false;
  if (/^[0-9_\-]+$/.test(term)) return false;
  if (/^[A-F0-9]{16,}$/i.test(term)) return false;
  if (/^(true|false|null|undefined|return|const|let|var|function|class)$/i.test(term)) return false;

  const lower = term.toLowerCase();
  if (GENERIC_NOUN_STOPWORDS.has(term) || GENERIC_NOUN_STOPWORDS.has(lower)) return false;

  return /[\u4e00-\u9fa5]/.test(term) || /[A-Za-z]/.test(term);
}

function inferNounSourceType(relativePath = '', moduleType = '') {
  if (moduleType === 'router') return 'route-label';
  if (['view', 'component'].includes(moduleType)) return 'ui-text';
  if (['data', 'default-data', 'runtime-data'].includes(moduleType)) return 'game-data';
  if (moduleType === 'docs') return 'docs';
  if (['routes', 'utils'].includes(moduleType) || /^server\//.test(relativePath)) return 'backend';
  return 'identifier';
}

function buildAliasHintsFromRules(term = '') {
  const rules = getSearchRules();
  const normalizedTerm = normalizeText(term);
  const aliases = [];
  const routeHints = [];
  const relatedTerms = [];

  for (const rule of rules.synonyms || []) {
    const candidates = [rule.canonical, ...(rule.aliases || [])].filter(Boolean);
    if (!candidates.some(item => normalizeText(item) === normalizedTerm)) continue;
    aliases.push(...candidates);
    relatedTerms.push(...candidates);
  }

  for (const item of [...(rules.resourceCatalog || []), ...(rules.shopCatalog || [])]) {
    const candidates = [
      item.id,
      item.title,
      ...(item.aliases || []),
      ...(item.terms || []),
      ...(item.sourceTerms || []),
      ...(item.shopTerms || []),
    ].filter(Boolean);
    if (!candidates.some(candidate => normalizeText(candidate) === normalizedTerm)) continue;
    aliases.push(...candidates);
    relatedTerms.push(...candidates);
    routeHints.push(...(item.routeHints || []));
  }

  for (const item of rules.routeAliases || []) {
    const candidates = [item.routeName, ...(item.aliases || []), ROUTE_LABELS[item.routeName] || ''].filter(Boolean);
    if (!candidates.some(candidate => normalizeText(candidate) === normalizedTerm)) continue;
    aliases.push(...candidates);
    routeHints.push(item.routeName, ...(item.aliases || []));
  }

  return {
    aliases: unique(aliases.filter(isLikelyNounTerm)),
    routeHints: unique(routeHints.filter(Boolean)),
    relatedTerms: unique(relatedTerms.filter(isLikelyNounTerm)),
  };
}

function addNounLexiconCandidate(bucket, payload = {}) {
  const term = String(payload.term || '').trim();
  if (!isLikelyNounTerm(term)) return;

  const normalized = normalizeText(term);
  if (!normalized) return;

  const ruleHints = buildAliasHintsFromRules(term);
  const sourceType = String(payload.sourceType || 'identifier').trim() || 'identifier';
  const aliases = unique([
    ...sanitizeStringArray(payload.aliases),
    ...splitIdentifierTerms(term),
    ...ruleHints.aliases,
  ].filter(isLikelyNounTerm));
  const routeHints = unique([
    ...sanitizeStringArray(payload.routeHints),
    ...ruleHints.routeHints,
  ]);
  const relatedTerms = unique([
    ...sanitizeStringArray(payload.relatedTerms),
    ...aliases,
    ...ruleHints.relatedTerms,
  ].filter(isLikelyNounTerm)).filter(item => normalizeText(item) !== normalized);

  const existing = bucket.get(normalized) || {
    term,
    normalized,
    aliases: [],
    sourceTypes: [],
    routeHints: [],
    weight: 0,
    occurrences: [],
    relatedTerms: [],
  };

  existing.term = pickPreferredDisplayTerm(existing.term, term);
  existing.aliases = unique([...existing.aliases, ...aliases].filter(item => normalizeText(item) !== normalized));
  existing.sourceTypes = unique([...existing.sourceTypes, sourceType]);
  existing.routeHints = unique([...existing.routeHints, ...routeHints]);
  existing.weight += Number(payload.weight) || NOUN_SOURCE_TYPE_WEIGHTS[sourceType] || 1;
  existing.relatedTerms = unique([...existing.relatedTerms, ...relatedTerms])
    .filter(item => normalizeText(item) !== normalized)
    .slice(0, NOUN_LEXICON_MAX_RELATED);

  const occurrence = payload.occurrence && typeof payload.occurrence === 'object'
    ? {
        path: String(payload.occurrence.path || '').trim(),
        lineNumber: Number(payload.occurrence.lineNumber || 0) || undefined,
        moduleType: String(payload.occurrence.moduleType || '').trim(),
        sourceType,
        preview: String(payload.occurrence.preview || '').trim().slice(0, 200),
      }
    : null;

  if (occurrence && occurrence.path) {
    const key = `${occurrence.path}|${occurrence.lineNumber || 0}|${sourceType}|${occurrence.preview}`;
    const seen = new Set(existing.occurrences.map(item => `${item.path}|${item.lineNumber || 0}|${item.sourceType}|${item.preview || ''}`));
    if (!seen.has(key)) existing.occurrences.push(occurrence);
    if (existing.occurrences.length > 24) existing.occurrences = existing.occurrences.slice(0, 24);
  }

  bucket.set(normalized, existing);
}

function extractQuotedTextCandidates(text = '') {
  return Array.from(String(text || '').matchAll(/['"`]([^'"`\n]{1,80})['"`]/g))
    .map(match => String(match[1] || '').trim())
    .filter(Boolean);
}

function extractTemplateTextCandidates(text = '') {
  const values = [];
  for (const match of String(text || '').matchAll(/>([^<>\n]{2,60})</g)) {
    values.push(String(match[1] || '').trim());
  }
  for (const match of String(text || '').matchAll(/(?:placeholder|title|label|alt)\s*[:=]\s*['"`]([^'"`]{2,80})['"`]/g)) {
    values.push(String(match[1] || '').trim());
  }
  return values.filter(Boolean);
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

function stripInlineMarkup(text = '') {
  return decodeHtmlEntities(String(text || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractHtmlTextCandidates(text = '') {
  const raw = String(text || '');
  const values = [];

  for (const match of raw.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    values.push(stripInlineMarkup(match[1] || ''));
  }
  for (const match of raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    values.push(stripInlineMarkup(match[1] || ''));
  }
  for (const match of raw.matchAll(/<(?:button|label|option|a|span|p|li|strong|em|summary)[^>]*>\s*([\s\S]{2,120}?)\s*<\/(?:button|label|option|a|span|p|li|strong|em|summary)>/gi)) {
    values.push(stripInlineMarkup(match[1] || ''));
  }

  return unique([...values, ...extractTemplateTextCandidates(raw)]).filter(Boolean);
}

function traverseJsonLike(value, visitor, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverseJsonLike(item, visitor, [...trail, String(index)]));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      visitor({ key, value: child, trail });
      traverseJsonLike(child, visitor, [...trail, key]);
    }
  }
}

function collectFileNounCandidates(filePath, text, bucket) {
  const relativePath = toWhitelistRelative(filePath);
  const moduleType = detectSourceModuleType(relativePath);
  const sourceType = inferNounSourceType(relativePath, moduleType);
  const routeHints = inferRouteHints(relativePath, text);
  const ext = path.extname(relativePath).toLowerCase();

  // B1: augment routeHints for data files using filename-based mapping
  if (/taoyuan-main\/src\/data\//i.test(relativePath)) {
    const baseName = path.basename(relativePath);
    const dataRouteHints = DATA_FILE_ROUTE_HINTS[baseName];
    if (dataRouteHints) {
      routeHints.push(...dataRouteHints.filter(h => !routeHints.includes(h)));
    }
  }
  const lines = String(text || '').split(/\r?\n/);

  for (const [routeName, label] of Object.entries(ROUTE_LABELS)) {
    if (normalizeText(relativePath).includes(normalizeText(routeName))) {
      addNounLexiconCandidate(bucket, {
        term: label,
        aliases: [routeName],
        sourceType: 'route-label',
        routeHints: [routeName, label],
        occurrence: { path: relativePath, moduleType, preview: relativePath },
      });
    }
  }

  lines.forEach((line, index) => {
    const preview = line.replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!preview || SOURCE_SKIP_LINE_PATTERN.test(preview)) return;

    const occurrence = {
      path: relativePath,
      lineNumber: index + 1,
      moduleType,
      preview,
    };

    for (const match of preview.matchAll(/(?:name|title|label|npcName|role|description|placeholder|subtitle|caption|hint|action|bonus|message|toast|displayName|display_name|itemName|shopName|skillName|questName|buildingName|locationName|materialName|cropName|fishName|recipeName|shortLabel|alt|summary)\s*[:=]\s*['"`]([^'"`]{2,120})['"`]/g)) {
      addNounLexiconCandidate(bucket, {
        term: match[1],
        sourceType,
        routeHints,
        occurrence,
      });
    }

    for (const match of preview.matchAll(/(?:id|itemId|npcId|questId|shopId|skillId|recipeId|buildingId|locationId|materialId|cropId|fishId|seedId|saplingId|perkId|toolId|machineId)\s*[:=]\s*['"`]([A-Za-z][A-Za-z0-9_-]{1,64})['"`]/g)) {
      addNounLexiconCandidate(bucket, {
        term: match[1],
        aliases: splitIdentifierTerms(match[1]),
        sourceType: 'identifier',
        routeHints,
        occurrence,
      });
    }

    for (const match of preview.matchAll(/(?:const|function|class|interface|type)\s+([A-Za-z_][A-Za-z0-9_]{2,48})/g)) {
      addNounLexiconCandidate(bucket, {
        term: match[1],
        aliases: splitIdentifierTerms(match[1]),
        sourceType: 'identifier',
        routeHints,
        occurrence,
      });
    }

    for (const phrase of extractQuotedTextCandidates(preview)) {
      addNounLexiconCandidate(bucket, {
        term: phrase,
        sourceType,
        routeHints,
        occurrence,
      });
    }

    if (moduleType === 'view' || moduleType === 'component') {
      for (const phrase of extractTemplateTextCandidates(preview)) {
        addNounLexiconCandidate(bucket, {
          term: phrase,
          sourceType: 'ui-text',
          routeHints,
          occurrence,
        });
      }
    }
  });

  if (moduleType === 'view' || moduleType === 'component' || ext === '.html') {
    const fileLevelPhrases = ext === '.html'
      ? extractHtmlTextCandidates(text)
      : extractTemplateTextCandidates(text);
    for (const phrase of fileLevelPhrases) {
      addNounLexiconCandidate(bucket, {
        term: phrase,
        sourceType: moduleType === 'view' || moduleType === 'component' ? 'ui-text' : sourceType,
        routeHints,
        occurrence: { path: relativePath, moduleType, preview: phrase.slice(0, 180) },
      });
    }
  }

  if (ext === '.md') {
    for (const match of String(text || '').matchAll(/^#{1,6}\s+(.+)$/gm)) {
      addNounLexiconCandidate(bucket, {
        term: match[1],
        sourceType: 'docs',
        routeHints,
        occurrence: { path: relativePath, moduleType, preview: match[1] },
      });
    }
  }

  if (ext === '.html') {
    for (const phrase of extractHtmlTextCandidates(text)) {
      addNounLexiconCandidate(bucket, {
        term: phrase,
        sourceType: 'docs',
        routeHints,
        occurrence: { path: relativePath, moduleType, preview: phrase.slice(0, 180) },
      });
    }
  }

  if (ext === '.json') {
    const json = safeReadJsonFile(filePath, null);
    if (json && typeof json === 'object') {
      traverseJsonLike(json, ({ key, value, trail }) => {
        if (NOUN_TEXT_FIELD_KEYS.has(key) && typeof value === 'string') {
          addNounLexiconCandidate(bucket, {
            term: value,
            sourceType: 'game-data',
            routeHints,
            relatedTerms: trail.slice(-3),
            occurrence: { path: relativePath, moduleType, preview: `${key}: ${value}` },
          });
        }
        if (NOUN_IDENTIFIER_FIELD_KEYS.has(key) && typeof value === 'string') {
          addNounLexiconCandidate(bucket, {
            term: value,
            aliases: splitIdentifierTerms(value),
            sourceType: 'identifier',
            routeHints,
            relatedTerms: trail.slice(-3),
            occurrence: { path: relativePath, moduleType, preview: `${key}: ${value}` },
          });
        }
      });
    }
  }
}

function buildNounLexiconFingerprint(filePaths = collectSourceFiles()) {
  const hash = crypto.createHash('sha1');
  hash.update(String(NOUN_LEXICON_VERSION));
  hash.update(buildSearchRulesFingerprint());
  hash.update(JSON.stringify(ROUTE_LABELS));
  for (const filePath of filePaths) {
    try {
      const stat = fs.statSync(filePath);
      hash.update(`${toWhitelistRelative(filePath)}|${stat.size}|${Math.floor(stat.mtimeMs)}\n`);
    } catch {}
  }
  return hash.digest('hex');
}

function finalizeNounLexiconEntries(bucket = new Map()) {
  return Array.from(bucket.values())
    .map(entry => ({
      term: entry.term,
      normalized: entry.normalized,
      aliases: unique((entry.aliases || []).filter(item => normalizeText(item) !== entry.normalized)),
      sourceTypes: unique(entry.sourceTypes || []),
      routeHints: unique(entry.routeHints || []),
      weight: Math.max(1, Math.round(Number(entry.weight) || 1)),
      occurrences: Array.isArray(entry.occurrences) ? entry.occurrences : [],
      relatedTerms: unique(entry.relatedTerms || []).slice(0, NOUN_LEXICON_MAX_RELATED),
    }))
    .filter(entry => isLikelyNounTerm(entry.term))
    .sort((a, b) => (b.weight - a.weight) || (b.occurrences.length - a.occurrences.length) || a.term.localeCompare(b.term, 'zh-CN'));
}

function buildNounLexiconEntries(filePaths = collectSourceFiles(), fingerprint = buildNounLexiconFingerprint(filePaths)) {
  const bucket = new Map();
  const rules = getSearchRules();

  for (const [routeName, label] of Object.entries(ROUTE_LABELS)) {
    addNounLexiconCandidate(bucket, {
      term: label,
      aliases: [routeName, ...((rules.routeAliasLookup && rules.routeAliasLookup.get(routeName)) || [])],
      sourceType: 'route-label',
      routeHints: [routeName, label],
      occurrence: { path: 'taoyuan-main/src/router/index.ts', moduleType: 'router', preview: `${routeName}: ${label}` },
    });
  }

  for (const item of [...(rules.resourceCatalog || []), ...(rules.shopCatalog || [])]) {
    addNounLexiconCandidate(bucket, {
      term: item.title || item.id,
      aliases: [item.id, ...(item.aliases || []), ...(item.terms || []), ...(item.sourceTerms || []), ...(item.shopTerms || [])],
      sourceType: 'game-data',
      routeHints: item.routeHints || [],
      relatedTerms: [...(item.questionTypes || []), ...(item.sourceTerms || []), ...(item.shopTerms || [])],
      occurrence: { path: 'data-defaults/taoyuan_ai_search_rules.json', moduleType: 'default-data', preview: item.title || item.id },
    });
  }

  // B3: knowledge entries (builtin + managed) into lexicon
  for (const entry of listKnowledgeEntries()) {
    if (!entry.title) continue;
    addNounLexiconCandidate(bucket, {
      term: entry.title,
      aliases: entry.keywords || [],
      sourceType: 'knowledge',
      routeHints: entry.routeNames || [],
      relatedTerms: entry.keywords || [],
      occurrence: { path: 'data/taoyuan_ai_knowledge.json', moduleType: 'default-data', preview: entry.title },
    });
  }

  for (const filePath of filePaths) {
    try {
      collectFileNounCandidates(filePath, fs.readFileSync(filePath, 'utf8'), bucket);
    } catch {}
  }

  const entries = finalizeNounLexiconEntries(bucket);
  saveNounLexiconStore({
    version: NOUN_LEXICON_VERSION,
    builtAt: Date.now(),
    fingerprint,
    fileCount: filePaths.length,
    entryCount: entries.length,
    entries,
  });

  nounLexiconCache = {
    loadedAt: Date.now(),
    fingerprint,
    entries,
    lookup: new Map(entries.flatMap(entry => [
      [entry.normalized, entry],
      ...entry.aliases.map(alias => [normalizeText(alias), entry]),
    ])),
  };
  return entries;
}

function getNounLexiconEntries() {
  if (nounLexiconCache.entries.length && Date.now() - nounLexiconCache.loadedAt < NOUN_LEXICON_CACHE_TTL) {
    return nounLexiconCache.entries;
  }

  const filePaths = collectSourceFiles();
  const fingerprint = buildNounLexiconFingerprint(filePaths);
  const persisted = loadNounLexiconStore();
  if (persisted.entries.length && persisted.fingerprint === fingerprint) {
    nounLexiconCache = {
      loadedAt: Date.now(),
      fingerprint,
      entries: persisted.entries,
      lookup: new Map((persisted.entries || []).flatMap(entry => [
        [entry.normalized, entry],
        ...((entry.aliases || []).map(alias => [normalizeText(alias), entry])),
      ])),
    };
    return persisted.entries;
  }

  return buildNounLexiconEntries(filePaths, fingerprint);
}

function getNounLexiconLookup() {
  getNounLexiconEntries();
  return nounLexiconCache.lookup || new Map();
}

function collectNounLexiconCandidateKeys(text = '', seedTerms = []) {
  const raw = String(text || '').trim();
  const candidates = [
    ...sanitizeStringArray(seedTerms),
    ...extractQuotedTextCandidates(raw),
    ...((raw.match(/[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fa5]{2,12}/g) || []).slice(0, 64)),
  ];

  if (raw && raw.length <= 48) {
    candidates.push(raw);
    if (/^[\u4e00-\u9fa5]+$/.test(raw)) {
      const maxWindow = Math.min(12, raw.length);
      for (let size = 2; size <= maxWindow && candidates.length < 240; size += 1) {
        for (let index = 0; index + size <= raw.length && candidates.length < 240; index += 1) {
          candidates.push(raw.slice(index, index + size));
        }
      }
    }
  }

  return unique(
    candidates
      .flatMap(item => [item, ...splitIdentifierTerms(item)])
      .map(item => normalizeText(item))
      .filter(Boolean)
  );
}

function getNounLexiconStatus() {
  const store = loadNounLexiconStore();
  return {
    version: NOUN_LEXICON_VERSION,
    builtAt: Number(store.builtAt) || 0,
    fileCount: Number(store.fileCount) || 0,
    entryCount: Number(store.entryCount) || (Array.isArray(store.entries) ? store.entries.length : 0),
    ready: Array.isArray(store.entries) && store.entries.length > 0,
  };
}

function rebuildNounLexicon() {
  const filePaths = collectSourceFiles();
  const fingerprint = buildNounLexiconFingerprint(filePaths);
  const entries = buildNounLexiconEntries(filePaths, fingerprint);
  return {
    ...getNounLexiconStatus(),
    fileCount: filePaths.length,
    entryCount: entries.length,
    ready: entries.length > 0,
  };
}

function matchNounLexiconEntries(text = '', seedTerms = []) {
  const normalizedQuestion = normalizeText(text);
  const lookup = getNounLexiconLookup();
  if (!normalizedQuestion && !seedTerms.length) return [];

  const normalizedSeeds = unique(seedTerms.map(item => normalizeText(item)).filter(Boolean));
  const candidateKeys = collectNounLexiconCandidateKeys(text, seedTerms);
  const entries = unique(candidateKeys.map(key => lookup.get(key)).filter(Boolean));

  return entries
    .map(entry => {
      let score = 0;
      if (normalizedQuestion.includes(entry.normalized)) score += 8;
      for (const alias of entry.aliases || []) {
        const normalizedAlias = normalizeText(alias);
        if (!normalizedAlias) continue;
        if (normalizedQuestion.includes(normalizedAlias)) score += 6;
      }
      for (const seed of normalizedSeeds) {
        if (!seed) continue;
        if (seed === entry.normalized) score += 8;
        else if (seed.includes(entry.normalized) || entry.normalized.includes(seed)) score += 4;
        if ((entry.aliases || []).some(alias => normalizeText(alias) === seed)) score += 5;
      }
      return { ...entry, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.weight - a.weight)
    .slice(0, NOUN_LEXICON_QUERY_MATCH_LIMIT);
}

function expandTermsWithNounLexicon(text = '', seedTerms = []) {
  const matches = matchNounLexiconEntries(text, seedTerms);
  const terms = [];
  for (const entry of matches) {
    terms.push(entry.term, ...(entry.aliases || []), ...(entry.routeHints || []), ...(entry.relatedTerms || []));
  }
  return unique(terms.filter(isLikelyNounTerm));
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getBuiltinKnowledgeEntries() {
  return BUILTIN_KNOWLEDGE_BASE.map(entry => ({
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

function getPublishedKnowledgeEntries() {
  return [
    ...getBuiltinKnowledgeEntries(),
    ...getManagedKnowledgeEntries().filter(entry => entry.enabled !== false && entry.reviewStatus === 'published'),
  ];
}

function sanitizeKnowledgeEntry(input = {}, fallback = {}) {
  const now = Date.now();
  const entry = {
    id: String(input.id || fallback.id || createKnowledgeId()),
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

function getManagedKnowledgeEntries() {
  const store = loadKnowledgeStore();
  return (store.entries || []).map(entry => sanitizeKnowledgeEntry(entry, entry));
}

function listKnowledgeEntries() {
  return [...getBuiltinKnowledgeEntries(), ...getManagedKnowledgeEntries()];
}

function getActiveKnowledgeEntries() {
  return [...getBuiltinKnowledgeEntries(), ...getManagedKnowledgeEntries().filter(entry => entry.enabled !== false && entry.reviewStatus !== 'archived')];
}

function publishKnowledgeEntry(id) {
  return updateKnowledgeEntry(id, {
    reviewStatus: 'published',
    enabled: true,
  });
}

function createKnowledgeEntry(input = {}) {
  const store = loadKnowledgeStore();
  const entry = sanitizeKnowledgeEntry(input, { reviewStatus: 'published', sourceType: 'manual' });
  store.entries.unshift(entry);
  saveKnowledgeStore(store);
  return entry;
}

function updateKnowledgeEntry(id, updates = {}) {
  const store = loadKnowledgeStore();
  const index = store.entries.findIndex(entry => String(entry.id) === String(id));
  if (index < 0) throw createError('知识条目不存在', 404);
  const current = sanitizeKnowledgeEntry(store.entries[index], store.entries[index]);
  const next = sanitizeKnowledgeEntry({ ...current, ...updates, id: current.id, createdAt: current.createdAt }, current);
  store.entries[index] = next;
  saveKnowledgeStore(store);
  return next;
}

function deleteKnowledgeEntry(id) {
  const store = loadKnowledgeStore();
  const index = store.entries.findIndex(entry => String(entry.id) === String(id));
  if (index < 0) throw createError('知识条目不存在', 404);
  const [removed] = store.entries.splice(index, 1);
  saveKnowledgeStore(store);
  return sanitizeKnowledgeEntry(removed, removed);
}

function extractSearchTerms(question, routeName) {
  const raw = String(question || '').trim();
  const cleaned = raw
    .replace(/[？?！!，,。.;；:：]/g, ' ')
    .replace(/在哪里|在哪|怎么|如何|为什么|是什么|什么意思|获得|获取|买到|购买|作用|区别|条件|前置|准备|能做什么|有什么用/g, ' ');

  const terms = [];
  const wordMatches = cleaned.match(/[\u4e00-\u9fa5A-Za-z0-9_]+/g) || [];
  for (const item of wordMatches) {
    const term = item.trim();
    if (!term) continue;
    if (/^[\u4e00-\u9fa5]+$/.test(term) && term.length > 12) {
      terms.push(term.slice(0, 6));
      continue;
    }
    terms.push(term);
  }

  const rules = getSearchRules();

  if (routeName) {
    terms.push(routeName);
    if (ROUTE_LABELS[routeName]) terms.push(ROUTE_LABELS[routeName]);
    if (rules.routeAliasLookup?.has(routeName)) {
      terms.push(...(rules.routeAliasLookup.get(routeName) || []));
    }
  }

  const matchedQueryHints = getMatchedSearchRuleQueryHints(raw);
  for (const rule of matchedQueryHints) {
    terms.push(...(rule.terms || []), ...(rule.routeHints || []), ...(rule.questionTypes || []));
  }

  const matchedCatalogEntries = getMatchedCatalogEntries(raw, terms);
  for (const item of matchedCatalogEntries) {
    terms.push(
      item.id,
      item.title,
      ...(item.aliases || []),
      ...(item.terms || []),
      ...(item.sourceTerms || []),
      ...(item.shopTerms || []),
      ...(item.routeHints || []),
      ...(item.questionTypes || [])
    );
  }

  const normalizedRaw = normalizeText(raw);
  for (const rule of rules.synonyms || []) {
    const candidates = [rule.canonical, ...(rule.aliases || [])];
    const matched = candidates.some(item => {
      const normalizedItem = normalizeText(item);
      return normalizedRaw.includes(normalizedItem) || terms.some(term => normalizeText(term) === normalizedItem);
    });
    if (matched) terms.push(...candidates);
  }

  const expandedIdentifierTerms = unique(terms.flatMap(item => splitIdentifierTerms(item)));
  const nounLexiconTerms = expandTermsWithNounLexicon(raw, [...terms, ...expandedIdentifierTerms]);

  return unique([...terms, ...expandedIdentifierTerms, ...nounLexiconTerms].filter(term => term.length >= 2 && term.length <= 32));
}

function expandConceptTerms(question = '') {
  const raw = String(question || '').trim();
  if (!raw) return [];

  const normalizedRaw = normalizeText(raw);
  const rules = getSearchRules();
  const terms = [];
  for (const rule of rules.conceptExpansions || []) {
    if (!rule?.test) continue;
    if (rule.test.test(raw) || rule.test.test(normalizedRaw)) {
      terms.push(...(rule.terms || []));
    }
  }

  return unique([...terms, ...expandTermsWithNounLexicon(raw, terms)].filter(Boolean));
}

function splitIdentifierTerms(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const expanded = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\\/._-]+/g, ' ');

  return unique(
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

function isDirectoryLikeTarget(value = '') {
  const normalized = normalizePathTarget(value);
  if (!normalized) return false;
  if (SOURCE_WHITELIST.some(root => normalizePathTarget(root.key) === normalized)) return true;
  if (!normalized.includes('/')) return false;
  const basename = normalized.split('/').pop() || '';
  return !hasSupportedSourceExtension(basename);
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

function extractExplicitSourceTargets(question = '') {
  const raw = String(question || '').trim();
  if (!raw) return [];

  const targets = [];
  const normalizedRawPath = normalizePathTarget(raw);
  const rawPathishTokens = raw.match(/[A-Za-z0-9@._/-]+/g) || [];
  const pathMatches = raw.match(/(?:[A-Za-z0-9@_-]+[\\/])+[A-Za-z0-9_.-]+\.(?:js|ts|vue|json)/g) || [];

  for (const match of pathMatches) {
    const normalizedPath = normalizePathTarget(match);
    if (normalizedPath) targets.push(normalizedPath);

    const basename = match.split(/[\\/]/).pop() || '';
    const basenameNoExt = basename.replace(/\.(js|ts|vue|json)$/i, '');
    if (basename) targets.push(normalizeText(basename));
    if (basenameNoExt) targets.push(normalizeText(basenameNoExt));

    for (const term of splitIdentifierTerms(match)) {
      targets.push(normalizeText(term));
    }
  }

  const pathLikeMatches = raw.match(/[A-Za-z0-9@._-]+(?:[\\/][A-Za-z0-9@._-]+)+/g) || [];
  for (const match of pathLikeMatches) {
    if (hasSupportedSourceExtension(match)) continue;
    const normalizedPath = normalizePathTarget(match);
    if (normalizedPath) targets.push(normalizedPath);
  }

  for (const root of SOURCE_WHITELIST) {
    const normalizedRootPath = normalizePathTarget(root.key);
    if (!normalizedRootPath) continue;
    if (
      normalizedRawPath === normalizedRootPath
      || rawPathishTokens.some(token => normalizePathTarget(token) === normalizedRootPath)
    ) {
      targets.push(normalizedRootPath);
    }
  }

  return unique(targets.filter(Boolean));
}

function moduleHintMatches(moduleHint = '', moduleType = '') {
  if (!moduleHint || !moduleType) return false;
  if (moduleHint === moduleType) return true;
  if (moduleHint === 'data' && ['data', 'default-data', 'runtime-data'].includes(moduleType)) return true;
  return false;
}

function extractQuotedTerms(question = '') {
  const raw = String(question || '').trim();
  if (!raw) return [];
  const matches = Array.from(raw.matchAll(/[`“"']([^`“"']{2,80})[`”"']/g));
  return unique(
    matches
      .map(match => String(match[1] || '').trim())
      .filter(Boolean)
      .flatMap(item => [item, ...splitIdentifierTerms(item)])
  );
}

function extractCodeIdentifiers(question = '') {
  const raw = String(question || '').trim();
  if (!raw) return [];
  return unique(
    (raw.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || [])
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .filter(item => !CODE_IDENTIFIER_STOPWORDS.has(item.toLowerCase()))
  );
}

function detectQueryIntents(question = '', explicitTargets = []) {
  const raw = String(question || '').trim();
  const intents = [];

  if (explicitTargets.length || /哪个文件|哪一个文件|文件里|在哪个文件|路径|模块里|页面里|源码里/.test(raw)) {
    intents.push('locate_file');
  }
  if (/定义|声明|导出|常量|变量|函数|接口|type|store|组件|symbol|枚举|是不是在.*定义|哪里定义/.test(raw)) {
    intents.push('locate_symbol');
  }
  if (/实现|逻辑在哪|哪里处理|在哪写|谁控制|入口在哪|实现位置|怎么实现|谁负责|由谁处理/.test(raw)) {
    intents.push('find_implementation');
  }
  if (/为什么不能|条件|前置|限制|要求|解锁|判断|检查|拦截|校验/.test(raw)) {
    intents.push('find_condition');
  }
  if (/谁调用|哪里调用|调用链|调用位置|哪里引用|谁用了|引用位置|从哪进来|调用它|谁触发/.test(raw)) {
    intents.push('find_call_relation');
  }
  if (
    /目录|文件夹|模块范围|模块下|目录下|下面有哪些|主要文件|主要模块|包含哪些文件|包含哪些模块/.test(raw)
    || explicitTargets.some(target => isDirectoryLikeTarget(target))
  ) {
    intents.push('inspect_directory');
  }
  if (/哪里买|哪买|买|购买|获得|获取|来源|掉落|产出|怎么来|怎么搞|怎么弄|从哪来|哪来|去哪|在哪里|在哪|哪里|在哪里买|哪里找|去哪找/.test(raw)) {
    intents.push('find_source');
  }
  if (/用途|有什么用|用来|拿来|能做什么|需要|消耗|要几个|要多少/.test(raw)) {
    intents.push('explain_usage');
  }
  if (/任务|委托|订单|卡住|缺什么|缺口|卡关|交付|要的|差.*个|差.*条/.test(raw)) {
    intents.push('diagnose_task');
  }
  if (/今天|当前|现在|先做|该做|安排|规划|要干嘛/.test(raw)) {
    intents.push('plan_today');
  }
  if (/页面|界面|入口|在哪看|怎么看|怎么重连|开吗|开放吗/.test(raw)) {
    intents.push('explain_page');
  }
  if (/系统|机制|怎么玩|周赛|育种|鱼塘|博物馆|公会|瀚海|商路|节会|灯会/.test(raw)) {
    intents.push('explain_system');
  }
  if (/风险|提醒|快到期|换季|背包满|体力不足|现金不足|生病|来不及/.test(raw)) {
    intents.push('remind_risk');
  }
  if (/下一步|接下来|路线|推进|先做|要干嘛|怎么办/.test(raw)) {
    intents.push('suggest_next_step');
  }

  if (!intents.length) intents.push('gameplay_qa');
  return unique(intents);
}

function detectModuleHints(question = '') {
  const raw = String(question || '').trim();
  const hints = [];
  if (/页面|view|界面/.test(raw)) hints.push('view');
  if (/store|仓库|状态/.test(raw)) hints.push('store');
  if (/数据|配置|表|常量|定义/.test(raw)) hints.push('data', 'default-data', 'runtime-data');
  if (/默认配置|默认数据|初始配置|defaults|sys_config|json/.test(raw)) hints.push('default-data', 'runtime-data');
  if (/组件|弹窗|按钮|widget/.test(raw)) hints.push('component');
  if (/接口|api|路由|后端/.test(raw)) hints.push('routes');
  if (/工具|util|helper/.test(raw)) hints.push('utils');
  if (/electron|桌面端|客户端壳|主进程|preload/.test(raw)) hints.push('electron');
  return unique(hints);
}

function detectRouteHints(question = '', routeName = '') {
  const raw = String(question || '').trim();
  const hints = [];

  if (routeName) {
    hints.push(routeName);
    if (ROUTE_LABELS[routeName]) hints.push(ROUTE_LABELS[routeName]);
  }

  const normalizedQuestion = normalizeText(raw);
  for (const [name, label] of Object.entries(ROUTE_LABELS)) {
    if (
      normalizedQuestion.includes(normalizeText(name))
      || normalizedQuestion.includes(normalizeText(label))
    ) {
      hints.push(name, label);
    }
  }

  const rules = getSearchRules();
  for (const item of rules.routeAliases || []) {
    const candidates = [item.routeName, ...(item.aliases || []), ROUTE_LABELS[item.routeName] || ''].filter(Boolean);
    if (candidates.some(candidate => {
      const normalizedCandidate = normalizeText(candidate);
      return normalizedCandidate && normalizedQuestion.includes(normalizedCandidate);
    })) {
      hints.push(item.routeName, ROUTE_LABELS[item.routeName] || '', ...(item.aliases || []));
    }
  }

  return unique(hints);
}

function detectQuestionCategory(question = '', intents = [], moduleHints = []) {
  const raw = String(question || '').trim();
  const staticMatched = /喜好|偏好|出现条件|组成|套装|季节|价格|列表|有哪些|默认配置|数据|定义|图鉴|说明|文档|README|鱼类|作物|NPC|物品/i.test(raw)
    || moduleHints.some(item => ['data', 'default-data', 'runtime-data', 'docs'].includes(item));
  const logicMatched = intents.some(intent => ['find_implementation', 'find_condition', 'find_call_relation'].includes(intent))
    || /能不能|会不会|刷新|删除|获得|消耗|触发|结算|判断|逻辑|检查|更新|重置|解锁|怎么处理/i.test(raw);
  const uiMatched = /按钮|入口|怎么点|点击|界面|页面|显示|看到|弹窗|菜单|面板|操作/i.test(raw)
    || moduleHints.some(item => ['view', 'component', 'router'].includes(item));

  if ((staticMatched && logicMatched) || (staticMatched && uiMatched) || (logicMatched && uiMatched)) {
    return SOURCE_QUESTION_CATEGORIES.mixed;
  }
  if (logicMatched) return SOURCE_QUESTION_CATEGORIES.logic;
  if (uiMatched) return SOURCE_QUESTION_CATEGORIES.ui;
  if (staticMatched) return SOURCE_QUESTION_CATEGORIES.static;
  return SOURCE_QUESTION_CATEGORIES.general;
}

function buildQuestionLayerHints(questionCategory = SOURCE_QUESTION_CATEGORIES.general) {
  switch (questionCategory) {
    case SOURCE_QUESTION_CATEGORIES.static:
      return {
        preferredModuleTypes: SOURCE_CATEGORY_MODULE_PRIORITIES[SOURCE_QUESTION_CATEGORIES.static] || [],
        preferredPathPrefixes: ['taoyuan-main/src/data', 'data-defaults', 'taoyuan-main/README.md', 'taoyuan-main/src/stores', 'taoyuan-main/src/views/game'],
      };
    case SOURCE_QUESTION_CATEGORIES.logic:
      return {
        preferredModuleTypes: SOURCE_CATEGORY_MODULE_PRIORITIES[SOURCE_QUESTION_CATEGORIES.logic] || [],
        preferredPathPrefixes: ['taoyuan-main/src/stores', 'server/src', 'taoyuan-main/src/utils', 'taoyuan-main/src/data', 'taoyuan-main/src/views/game'],
      };
    case SOURCE_QUESTION_CATEGORIES.ui:
      return {
        preferredModuleTypes: SOURCE_CATEGORY_MODULE_PRIORITIES[SOURCE_QUESTION_CATEGORIES.ui] || [],
        preferredPathPrefixes: ['taoyuan-main/src/views/game', 'taoyuan-main/src/views', 'taoyuan-main/src/components', 'taoyuan-main/src/router', 'taoyuan-main/README.md'],
      };
    case SOURCE_QUESTION_CATEGORIES.mixed:
      return {
        preferredModuleTypes: SOURCE_CATEGORY_MODULE_PRIORITIES[SOURCE_QUESTION_CATEGORIES.mixed] || [],
        preferredPathPrefixes: ['taoyuan-main/src/stores', 'taoyuan-main/src/data', 'taoyuan-main/src/views/game', 'taoyuan-main/README.md', 'server/src'],
      };
    default:
      return {
        preferredModuleTypes: SOURCE_CATEGORY_MODULE_PRIORITIES[SOURCE_QUESTION_CATEGORIES.general] || [],
        preferredPathPrefixes: ['taoyuan-main/README.md', 'taoyuan-main/src/views/game', 'taoyuan-main/src/stores', 'taoyuan-main/src/data'],
      };
  }
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

function parseCodeQuestion(question, routeName = '') {
  const raw = String(question || '').trim();
  const explicitTargets = extractExplicitSourceTargets(raw);
  const quotedTerms = extractQuotedTerms(raw);
  const identifierTargets = extractCodeIdentifiers(raw);
  const intents = detectQueryIntents(raw, explicitTargets);
  const moduleHints = detectModuleHints(raw);
  const baseTerms = extractSearchTerms(raw, routeName);
  const conceptTerms = expandConceptTerms(raw);
  const slots = extractQuerySlots(raw);
  const slotTerms = getQuerySlotTerms(slots);
  const slotRouteHints = getRouteHintsFromSlots(slots);
  const nounLexiconMatches = matchNounLexiconEntries(raw, [
    ...baseTerms,
    ...conceptTerms,
    ...slotTerms,
    ...quotedTerms,
    ...identifierTargets,
  ]).slice(0, 8);
  const nounLexiconTerms = nounLexiconMatches.flatMap(entry => [
    entry.term,
    ...(entry.aliases || []),
    ...(entry.relatedTerms || []),
  ]);
  const routeHints = unique([
    ...detectRouteHints(raw, routeName),
    ...slotRouteHints,
    ...nounLexiconMatches.flatMap(entry => entry.routeHints || []),
  ]);
  const questionTypes = unique([
    ...getMatchedQuestionTypes(raw, [
      ...baseTerms,
      ...conceptTerms,
      ...slotTerms,
      ...quotedTerms,
      ...identifierTargets,
      ...nounLexiconTerms,
    ]),
    ...getQuestionTypesFromSlots(slots),
  ]);
  const questionCategory = detectQuestionCategory(raw, intents, moduleHints);
  const layerHints = buildQuestionLayerHints(questionCategory);
  const sourceTerms = unique([
    ...baseTerms,
    ...conceptTerms,
    ...slotTerms,
    ...nounLexiconTerms,
    ...quotedTerms,
    ...identifierTargets,
    ...quotedTerms.flatMap(item => splitIdentifierTerms(item)),
    ...identifierTargets.flatMap(item => splitIdentifierTerms(item)),
    ...questionTypes,
  ]).filter(Boolean);

  const hasNamedGameplayTarget = querySlotsHaveNamedObject(slots)
    && questionTypes.some(type => [
      'resource-source',
      'resource-use',
      'shop-purchase',
      'precondition',
      'recipe',
      'task-diagnosis',
      'page-explanation',
      'system-mechanic',
      'page-feature',
      'next-step-suggestion',
    ].includes(type));
  const hasCodeSearchIntent = intents.some(intent => CODE_SEARCH_INTENTS.has(intent) && !(intent === 'find_condition' && hasNamedGameplayTarget));
  const needsSourceSearch = explicitTargets.length > 0
    || hasCodeSearchIntent
    || /源码|代码|文件|定义|实现|函数|变量|组件|store|路由|接口|调用/.test(raw);

  const needsKnowledgeSearch = intents.includes('find_source') || intents.includes('gameplay_qa') || !needsSourceSearch;
  const needsCallGraph = intents.includes('find_call_relation');

  let answerMode = 'gameplay';
  if (needsSourceSearch && needsKnowledgeSearch) answerMode = 'hybrid';
  else if (needsSourceSearch) answerMode = 'code';

  let sourcePreference = 'normal';
  if (explicitTargets.length || intents.includes('locate_file') || intents.includes('locate_symbol')) sourcePreference = 'strong';
  else if (needsSourceSearch) sourcePreference = 'high';

  const expandedTerms = unique([
    ...expandTermsWithNounLexicon(raw, sourceTerms),
    ...slotTerms,
    ...nounLexiconTerms,
  ]).filter(t => !sourceTerms.includes(t));
  const clarification = buildQueryClarification(raw, { slots, questionTypes, intents, routeName });

  return {
    raw,
    routeName,
    intents,
    primaryIntent: intents[0] || 'gameplay_qa',
    explicitTargets,
    quotedTerms,
    identifierTargets,
    sourceTerms,
    expandedTerms,
    questionTypes,
    slots,
    clarification,
    moduleHints,
    routeHints,
    needsSourceSearch,
    needsKnowledgeSearch,
    needsCallGraph,
    answerMode,
    sourcePreference,
    questionCategory,
    conceptTerms,
    nounLexiconMatches,
    preferredModuleTypes: layerHints.preferredModuleTypes || [],
    preferredPathPrefixes: layerHints.preferredPathPrefixes || [],
  };
}

function resolveQueryPlan(questionOrPlan, routeName = '') {
  if (questionOrPlan && typeof questionOrPlan === 'object' && Array.isArray(questionOrPlan.sourceTerms)) {
    return questionOrPlan;
  }
  return parseCodeQuestion(String(questionOrPlan || ''), routeName);
}

function createSymbolEntry({
  relativePath,
  moduleType,
  routeHints,
  name,
  kind,
  lineNumber,
  content,
  importSource = '',
  exported = false,
}) {
  const safeName = String(name || '').trim();
  if (!safeName) return null;

  const safeContent = String(content || '').trim();
  const moduleLabel = SOURCE_MODULE_LABELS[moduleType] || SOURCE_MODULE_LABELS.module;
  const keywords = unique([
    safeName,
    ...splitIdentifierTerms(safeName),
    ...String(relativePath || '').split(/[\\/._-]/).filter(Boolean),
    ...splitIdentifierTerms(importSource),
    ...((safeContent.match(/[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fa5]{2,12}/g) || []).slice(0, 20)),
  ]);

  return {
    id: `symbol:${relativePath}:${kind}:${safeName}:${lineNumber}`,
    path: relativePath,
    name: safeName,
    kind,
    kindLabel: SOURCE_SYMBOL_KIND_LABELS[kind] || SOURCE_SYMBOL_KIND_LABELS.module,
    title: `${safeName} · ${relativePath}`,
    moduleType,
    moduleLabel,
    routeHints,
    lineNumber,
    importSource: String(importSource || ''),
    exported: exported === true,
    content: safeContent.slice(0, 320),
    keywords,
  };
}

function collectImportNames(raw = '') {
  return unique(
    String(raw || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => item.replace(/\bas\b.+$/i, '').trim())
      .filter(Boolean)
  );
}

function createSourceSymbolEntriesForFile(filePath, text) {
  const relativePath = toWhitelistRelative(filePath);
  const moduleType = detectSourceModuleType(relativePath);
  const lines = String(text || '').split(/\r?\n/);
  const entries = [];
  const routeHints = inferRouteHints(relativePath, text);

  const pushEntry = (payload) => {
    const entry = createSymbolEntry({
      relativePath,
      moduleType,
      routeHints,
      ...payload,
    });
    if (entry) entries.push(entry);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    if (!line || SOURCE_SKIP_LINE_PATTERN.test(line)) continue;

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

function getSourceSymbolEntries() {
  getSourceIndexEntries();
  return Array.isArray(sourceIndexCache.symbolEntries) ? sourceIndexCache.symbolEntries : [];
}

function scoreSourceSymbolEntry(entry, queryPlan, routeName) {
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

function searchSourceSymbols(question, routeName) {
  const queryPlan = resolveQueryPlan(question, routeName);
  const symbolEntries = getSourceSymbolEntries();
  if (!symbolEntries.length) return [];

  return symbolEntries
    .map(entry => ({ ...entry, score: scoreSourceSymbolEntry(entry, queryPlan, routeName) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_INDEX_MAX_HITS);
}

function detectQuestionTypes(question) {
  const raw = String(question || '').trim();
  if (!raw) return [];
  return unique([
    ...SOURCE_QUESTION_TYPE_RULES.filter(rule => rule.test.test(raw)).map(rule => rule.type),
    ...getMatchedSearchRuleQueryHints(raw).flatMap(rule => rule.questionTypes || []),
    ...getMatchedCatalogEntries(raw).flatMap(item => item.questionTypes || []),
  ]);
}

function walkSourceFiles(dir, bucket) {
  if (!fs.existsSync(dir)) return;
  try {
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
      if (SOURCE_BLOCKED_PATH_PATTERN.test(dir)) return;
      const ext = path.extname(dir).toLowerCase();
      if (SOURCE_ALLOWED_EXTENSIONS.has(ext) && stat.size <= SOURCE_MAX_FILE_SIZE) bucket.push(dir);
      return;
    }
  } catch {
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SOURCE_BLOCKED_PATH_PATTERN.test(full)) continue;
      walkSourceFiles(full, bucket);
      continue;
    }
    if (SOURCE_BLOCKED_PATH_PATTERN.test(full)) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SOURCE_ALLOWED_EXTENSIONS.has(ext)) continue;
    try {
      const stat = fs.statSync(full);
      if (stat.size <= SOURCE_MAX_FILE_SIZE) bucket.push(full);
    } catch {}
  }
}

function collectSourceFiles() {
  const bucket = [];
  for (const root of SOURCE_WHITELIST) walkSourceFiles(root.abs, bucket);
  return unique(bucket).sort();
}

function buildSourceIndexFingerprint(filePaths = []) {
  const hash = crypto.createHash('sha1');
  hash.update(String(SOURCE_INDEX_VERSION));
  hash.update(buildSearchRulesFingerprint());
  hash.update(buildNounLexiconFingerprint(filePaths));
  for (const filePath of filePaths) {
    try {
      const stat = fs.statSync(filePath);
      hash.update(`${toWhitelistRelative(filePath)}|${stat.size}|${Math.floor(stat.mtimeMs)}\n`);
    } catch {}
  }
  return hash.digest('hex');
}

function toWhitelistRelative(filePath) {
  for (const root of SOURCE_WHITELIST) {
    if (filePath === root.abs) return root.key;
    if (filePath.startsWith(root.abs + path.sep)) {
      return `${root.key}/${path.relative(root.abs, filePath).replace(/\\/g, '/')}`;
    }
  }
  return filePath.replace(/\\/g, '/');
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

function inferRouteHints(relativePath = '', text = '') {
  const normalizedPath = normalizeText(relativePath);
  const normalizedText = normalizeText(text);
  const routeNames = [];
  const rules = getSearchRules();

  for (const item of rules.routeAliases || []) {
    const candidates = [item.routeName, ...(item.aliases || []), ROUTE_LABELS[item.routeName] || ''].filter(Boolean);
    if (candidates.some(candidate => {
      const normalizedCandidate = normalizeText(candidate);
      return normalizedPath.includes(normalizedCandidate) || normalizedText.includes(normalizedCandidate);
    })) {
      routeNames.push(...candidates);
    }
  }

  return unique(routeNames);
}

function inferSynonyms(text = '', relativePath = '') {
  const normalizedContent = normalizeText(`${relativePath}\n${text}`);
  const values = [];
  const rules = getSearchRules();
  for (const rule of rules.synonyms || []) {
    const candidates = [rule.canonical, ...(rule.aliases || [])];
    const matched = candidates.some(item => normalizedContent.includes(normalizeText(item)));
    if (matched) values.push(...candidates);
  }

  const lexicalSeeds = unique([
    ...splitIdentifierTerms(relativePath),
    ...((String(text || '').match(/[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fa5]{2,12}/g) || []).slice(0, 28)),
  ]);
  const nounMatches = matchNounLexiconEntries(text, lexicalSeeds).slice(0, 8);
  for (const entry of nounMatches) {
    values.push(entry.term, ...(entry.aliases || []), ...(entry.relatedTerms || []).slice(0, 4));
  }

  return unique(values).slice(0, NOUN_LEXICON_KEYWORD_LIMIT);
}

function extractInterestingLines(lines = [], pattern, limit = 3) {
  return unique(
    lines
      .map(line => String(line || '').trim())
      .filter(line => line && pattern.test(line) && !SOURCE_SKIP_LINE_PATTERN.test(line))
      .map(line => line.replace(/\s+/g, ' ').slice(0, 140))
      .slice(0, limit)
  );
}

function extractKeyFunctions(lines = []) {
  return unique(
    lines
      .map(line => extractDefinitionName(line))
      .filter(Boolean)
      .slice(0, 8)
  );
}

function extractConfigSignals(lines = []) {
  return unique([
    ...extractInterestingLines(lines, /(?:const|let|var)\s+[A-Z0-9_]{3,}\s*=|cfg\.get\(|routeNames\s*:|keywords\s*:|title\s*:/, 4),
    ...lines
      .map(line => String(line || '').match(/(?:const|let|var)\s+([A-Z0-9_]{3,})\s*=/))
      .filter(Boolean)
      .map(match => match[1])
      .slice(0, 4),
  ]);
}

function extractQuestionTypesFromContent(text = '', relativePath = '') {
  const raw = `${relativePath}\n${text}`;
  const types = detectQuestionTypes(raw);
  if (/itemId\s*:|price\s*:|shop|yaopu|药铺|渔具铺/.test(raw)) types.push('shop-purchase', 'resource-source');
  if (/if\s*\(|need|require|unlock|条件|限制|不足|未解锁/.test(raw)) types.push('precondition');
  if (/recipe|ingredient|配方|食谱|材料|加工|制作/.test(raw)) types.push('recipe');
  if (/<template>|defineStore\(|createRouter\(|router\.|View\.vue/.test(raw) || detectSourceModuleType(relativePath) === 'view') types.push('page-feature');
  return unique(types);
}

function scoreSourceFile(filePath, text, terms, routeName, explicitTargets = [], queryPlan = null) {
  const normalizedPath = normalizeText(toWhitelistRelative(filePath));
  const normalizedText = normalizeText(text);
  let score = 0;

  for (const target of explicitTargets) {
    if (!target) continue;
    score += scoreExplicitPathMatch(toWhitelistRelative(filePath), target);
  }

  if (routeName && normalizedPath.includes(normalizeText(routeName))) score += 6;
  if (routeName && ROUTE_LABELS[routeName] && normalizedText.includes(normalizeText(ROUTE_LABELS[routeName]))) score += 4;

  for (const moduleHint of queryPlan?.moduleHints || []) {
    if (moduleHintMatches(moduleHint, detectSourceModuleType(toWhitelistRelative(filePath)))) score += 18;
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

function extractSourceSnippet(text, terms) {
  const lines = String(text || '').split(/\r?\n/);
  const normalizedTerms = unique(terms.map(normalizeText).filter(Boolean));
  if (!normalizedTerms.length || !lines.length) return '';

  let bestIndex = -1;
  let bestScore = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || SOURCE_SKIP_LINE_PATTERN.test(line)) continue;
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

  const startLine = Math.max(0, bestIndex - SOURCE_SNIPPET_CONTEXT_LINES);
  const endLine = Math.min(lines.length, bestIndex + SOURCE_SNIPPET_CONTEXT_LINES + 1);
  const snippet = lines
    .slice(startLine, endLine)
    .filter(line => !SOURCE_SKIP_LINE_PATTERN.test(line))
    .join('\n')
    .trim();

  if (!snippet) return '';
  if (snippet.length <= SOURCE_MAX_SNIPPET_LENGTH) return snippet;

  const normalizedSnippet = normalizeText(snippet);
  let hitIndex = 0;
  for (const term of normalizedTerms) {
    const idx = normalizedSnippet.indexOf(term);
    if (idx >= 0) {
      hitIndex = idx;
      break;
    }
  }

  const start = Math.max(0, hitIndex - SOURCE_SNIPPET_RADIUS);
  const end = Math.min(snippet.length, start + SOURCE_MAX_SNIPPET_LENGTH);
  return snippet.slice(start, end).trim();
}

function summarizeSourceSnippet(snippet) {
  return snippet
    .replace(/\s+/g, ' ')
    .replace(/[{}<>]/g, ' ')
    .trim()
    .slice(0, 160);
}

function extractDefinitionName(line = '') {
  const match = String(line).match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|(?:export\s+)?(?:const|let|var|class)\s+([A-Za-z0-9_]+)/);
  return match ? match[1] || match[2] || '' : '';
}

function extractChunkKeywords(text, relativePath) {
  const lexicalMatches = String(text || '').match(/[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fa5]{2,12}/g) || [];
  const pathTerms = String(relativePath || '')
    .split(/[\\/._-]/)
    .map(item => item.trim())
    .filter(item => item.length >= 2 && item.length <= 24);
  const routeHints = inferRouteHints(relativePath, text);
  const synonyms = inferSynonyms(text, relativePath);
  const questionTypes = extractQuestionTypesFromContent(text, relativePath);
  const catalogTerms = getMatchedCatalogEntries(text, [...pathTerms, ...lexicalMatches.slice(0, 16)]).flatMap(item => [
    item.id,
    item.title,
    ...(item.aliases || []),
    ...(item.terms || []),
    ...(item.sourceTerms || []),
    ...(item.shopTerms || []),
    ...(item.routeHints || []),
  ]);
  const nounTerms = expandTermsWithNounLexicon(text, [
    ...pathTerms,
    ...routeHints,
    ...synonyms,
    ...lexicalMatches.slice(0, 24),
  ]).slice(0, NOUN_LEXICON_KEYWORD_LIMIT);

  return unique([...pathTerms, ...lexicalMatches, ...routeHints, ...synonyms, ...catalogTerms, ...nounTerms, ...questionTypes].slice(0, 120));
}

function buildSourceIndexEntryFromContent(filePath, rawContent = '', options = {}) {
  const relativePath = toWhitelistRelative(filePath);
  const content = String(rawContent || '')
    .split(/\r?\n/)
    .filter(line => !SOURCE_SKIP_LINE_PATTERN.test(line))
    .join('\n')
    .trim();
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const definitionLine = lines.find(line => extractDefinitionName(line)) || '';
  const definitionName = extractDefinitionName(definitionLine);
  const moduleType = detectSourceModuleType(relativePath);
  const routeHints = unique([
    ...inferRouteHints(relativePath, content),
    ...(options.routeHints || []),
  ]);
  const questionTypes = unique([
    ...extractQuestionTypesFromContent(content, relativePath),
    ...(options.questionTypes || []),
  ]);
  const keyFunctions = unique([
    ...extractKeyFunctions(lines),
    ...(options.keyFunctions || []),
  ]);
  const conditionHints = extractInterestingLines(lines, /if\s*\(|条件|限制|不足|未解锁|return\s+false|throw\s+/i, 4);
  const shopSignals = extractInterestingLines(lines, /itemId\s*:|price\s*:|shop|yaopu|药铺|渔具铺|购买/i, 4);
  const configSignals = extractConfigSignals(lines);
  const aliases = inferSynonyms(content, relativePath);
  const semanticTitle = String(options.title || '').trim();
  const semanticKeywords = sanitizeStringArray(options.keywords || []);
  const keywords = unique([
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
    moduleLabel: SOURCE_MODULE_LABELS[moduleType] || SOURCE_MODULE_LABELS.module,
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

function createSourceIndexEntry(filePath, lines, startLine, endLine, semanticMeta = {}) {
  const chunkLines = lines.slice(startLine, endLine);
  return buildSourceIndexEntryFromContent(filePath, chunkLines.join('\n'), {
    ...semanticMeta,
    startLine: startLine + 1,
    endLine,
  });
}

function findLineNumberByPattern(lines = [], pattern) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || '');
    if (typeof pattern === 'string') {
      if (line.includes(pattern)) return index + 1;
    } else if (pattern?.test?.(line)) {
      return index + 1;
    }
  }
  return 1;
}

function splitSemanticContentBlock(block = {}) {
  const lines = String(block.content || '').split(/\r?\n/);
  if (lines.length <= SOURCE_SEMANTIC_MAX_BLOCK_LINES) return [block];

  const parts = [];
  let cursor = 0;
  let partIndex = 1;
  const baseStart = Number(block.startLine || 1) || 1;

  while (cursor < lines.length) {
    let end = Math.min(lines.length, cursor + SOURCE_SEMANTIC_TARGET_BLOCK_LINES);
    if (lines.length - cursor > SOURCE_SEMANTIC_MAX_BLOCK_LINES) {
      let splitAt = -1;
      for (let index = Math.min(lines.length - 1, cursor + SOURCE_SEMANTIC_MAX_BLOCK_LINES - 1); index > cursor + 12; index -= 1) {
        if (!String(lines[index] || '').trim()) {
          splitAt = index + 1;
          break;
        }
      }
      if (splitAt > 0) end = splitAt;
      else end = Math.min(lines.length, cursor + SOURCE_SEMANTIC_TARGET_BLOCK_LINES);
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

function collectMarkdownSemanticBlocks(filePath, text, lines) {
  const matches = Array.from(String(text || '').matchAll(/^#{1,6}\s+(.+)$/gm));
  if (!matches.length) {
    return splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · 文档`, text, {
      semanticKind: 'markdown',
      startLine: 1,
      endLine: lines.length,
    }));
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
    })));
  }
  return blocks;
}

function collectHtmlSemanticBlocks(filePath, text, lines) {
  const titleBlocks = [];
  for (const match of String(text || '').matchAll(/<(title|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const rawBlock = String(match[0] || '').trim();
    const title = stripInlineMarkup(match[2] || '') || `${toWhitelistRelative(filePath)} · HTML`;
    const startLine = findLineNumberByPattern(lines, rawBlock.slice(0, 80));
    titleBlocks.push(...splitSemanticContentBlock(createSemanticBlock(title, rawBlock, {
      semanticKind: 'html-heading',
      startLine,
      endLine: startLine + Math.max(0, rawBlock.split(/\r?\n/).length - 1),
      keywords: splitIdentifierTerms(title),
    })));
  }

  if (titleBlocks.length) return titleBlocks;

  const genericText = stripInlineMarkup(text);
  return splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · HTML`, genericText || text, {
    semanticKind: 'html',
    startLine: 1,
    endLine: lines.length,
  }));
}

function collectJsonSemanticBlocks(filePath, text, lines) {
  const json = safeReadJsonFile(filePath, null);
  if (!json || typeof json !== 'object') {
    return splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · JSON`, text, {
      semanticKind: 'json',
      startLine: 1,
      endLine: lines.length,
    }));
  }

  if (Array.isArray(json)) {
    return splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · 顶层数组`, JSON.stringify(json, null, 2), {
      semanticKind: 'json-array',
      startLine: 1,
      endLine: lines.length,
    }));
  }

  const blocks = [];
  for (const [key, value] of Object.entries(json)) {
    const lineNumber = findLineNumberByPattern(lines, new RegExp(`"${escapeRegExp(key)}"\\s*:`));
    const content = JSON.stringify({ [key]: value }, null, 2);
    blocks.push(...splitSemanticContentBlock(createSemanticBlock(`${key} · ${toWhitelistRelative(filePath)}`, content, {
      semanticKind: 'json-top-key',
      startLine: lineNumber,
      endLine: lineNumber + Math.max(0, String(content).split(/\r?\n/).length - 1),
      keywords: [key, ...splitIdentifierTerms(key)],
    })));
  }
  return blocks;
}

function collectVueSemanticBlocks(filePath, text, lines) {
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
    sections.push(...splitSemanticContentBlock(createSemanticBlock(`${item.tag} · ${toWhitelistRelative(filePath)}`, match[0], {
      semanticKind: `vue-${item.tag}`,
      startLine,
      endLine: startLine + Math.max(0, match[0].split(/\r?\n/).length - 1),
      keywords: [item.tag],
    })));
  }

  if (!sections.length) {
    sections.push(...splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · Vue SFC`, text, {
      semanticKind: 'vue-sfc',
      startLine: 1,
      endLine: lines.length,
    })));
  }

  return sections;
}

function collectCodeSemanticBlocks(filePath, text, lines) {
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
    return splitSemanticContentBlock(createSemanticBlock(`${toWhitelistRelative(filePath)} · 模块`, text, {
      semanticKind: 'module',
      startLine: 1,
      endLine: lines.length,
    }));
  }

  const blocks = [];
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts[index + 1];
    const startLine = current.line;
    const endLine = next ? next.line - 1 : lines.length;
    const content = lines.slice(startLine - 1, endLine).join('\n').trim();
    if (!content) continue;
    blocks.push(...splitSemanticContentBlock(createSemanticBlock(`${current.title} · ${toWhitelistRelative(filePath)}`, content, {
      semanticKind: current.semanticKind,
      startLine,
      endLine,
      keywords: current.keywords,
      keyFunctions: current.semanticKind === 'function' ? [current.title] : [],
    })));
  }
  return blocks;
}

function collectSemanticBlocksForFile(filePath, text) {
  const relativePath = toWhitelistRelative(filePath);
  const ext = path.extname(relativePath).toLowerCase();
  const lines = String(text || '').split(/\r?\n/);

  if (ext === '.md') return collectMarkdownSemanticBlocks(filePath, text, lines);
  if (ext === '.html') return collectHtmlSemanticBlocks(filePath, text, lines);
  if (ext === '.json') return collectJsonSemanticBlocks(filePath, text, lines);
  if (ext === '.vue') return collectVueSemanticBlocks(filePath, text, lines);
  if (ext === '.js' || ext === '.ts') return collectCodeSemanticBlocks(filePath, text, lines);

  return splitSemanticContentBlock(createSemanticBlock(`${relativePath} · 语义块`, text, {
    semanticKind: 'generic',
    startLine: 1,
    endLine: lines.length,
  }));
}

function createSourceIndexEntriesForFile(filePath, text) {
  const semanticBlocks = collectSemanticBlocksForFile(filePath, text);
  return semanticBlocks
    .map(block => buildSourceIndexEntryFromContent(filePath, block.content, block))
    .filter(Boolean);
}

function buildSourceIndexEntries(filePaths = collectSourceFiles(), fingerprint = buildSourceIndexFingerprint(filePaths)) {
  const entries = [];
  const symbolEntries = [];
  for (const filePath of filePaths) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      entries.push(...createSourceIndexEntriesForFile(filePath, text));
      symbolEntries.push(...createSourceSymbolEntriesForFile(filePath, text));
    } catch {}
  }
  saveSourceIndexStore({
    builtAt: Date.now(),
    fingerprint,
    fileCount: filePaths.length,
    entryCount: entries.length,
    entries,
    symbolCount: symbolEntries.length,
    symbolEntries,
  });
  sourceIndexCache = {
    builtAt: Date.now(),
    entries,
    symbolEntries,
  };
  return entries;
}

function getSourceIndexEntries() {
  if (sourceIndexCache.entries.length && Date.now() - sourceIndexCache.builtAt < SOURCE_INDEX_CACHE_TTL) {
    return sourceIndexCache.entries;
  }
  const filePaths = collectSourceFiles();
  const fingerprint = buildSourceIndexFingerprint(filePaths);
  const persisted = loadSourceIndexStore();
  if (persisted.entries.length && persisted.fingerprint === fingerprint) {
    sourceIndexCache = {
      builtAt: Date.now(),
      entries: persisted.entries,
      symbolEntries: Array.isArray(persisted.symbolEntries) ? persisted.symbolEntries : [],
    };
    return persisted.entries;
  }
  return buildSourceIndexEntries(filePaths, fingerprint);
}

function getSourceIndexStatus() {
  const store = loadSourceIndexStore();
  return {
    version: SOURCE_INDEX_VERSION,
    builtAt: Number(store.builtAt) || 0,
    fileCount: Number(store.fileCount) || 0,
    entryCount: Number(store.entryCount) || (Array.isArray(store.entries) ? store.entries.length : 0),
    symbolCount: Number(store.symbolCount) || (Array.isArray(store.symbolEntries) ? store.symbolEntries.length : 0),
    ready: Array.isArray(store.entries) && store.entries.length > 0,
  };
}

function rebuildSourceIndex() {
  const filePaths = collectSourceFiles();
  const fingerprint = buildSourceIndexFingerprint(filePaths);
  const entries = buildSourceIndexEntries(filePaths, fingerprint);
  return {
    ...getSourceIndexStatus(),
    fileCount: filePaths.length,
    entryCount: entries.length,
    symbolCount: getSourceSymbolEntries().length,
    ready: entries.length > 0,
  };
}

function scoreSourceIndexEntry(entry, terms, routeName, explicitTargets = [], queryPlan = null) {
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
  if (routeName && ROUTE_LABELS[routeName] && normalizedContent.includes(normalizeText(ROUTE_LABELS[routeName]))) score += 4;

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

function resolveExplicitDirectoryTarget(target = '') {
  const normalizedTarget = normalizePathTarget(target);
  if (!normalizedTarget || !isDirectoryLikeTarget(normalizedTarget)) return null;

  for (const root of SOURCE_WHITELIST) {
    const rootKey = normalizePathTarget(root.key);
    if (normalizedTarget === rootKey) {
      if (fs.existsSync(root.abs) && fs.statSync(root.abs).isDirectory()) {
        return { path: root.key, abs: root.abs };
      }
      continue;
    }

    if (!normalizedTarget.startsWith(`${rootKey}/`)) continue;
    const subPath = normalizedTarget.slice(rootKey.length + 1);
    const absPath = path.resolve(root.abs, ...subPath.split('/'));
    try {
      const relativeToRoot = path.relative(root.abs, absPath);
      if (
        relativeToRoot.startsWith('..')
        || path.isAbsolute(relativeToRoot)
        || SOURCE_BLOCKED_PATH_PATTERN.test(absPath)
      ) {
        continue;
      }
      if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
        return {
          path: `${root.key}/${subPath}`.replace(/\\/g, '/'),
          abs: absPath,
        };
      }
    } catch {}
  }

  return null;
}

function listDirectoryChildren(absPath = '') {
  try {
    return fs.readdirSync(absPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function createDirectorySummaryEntry(resolvedDir) {
  if (!resolvedDir?.abs || !resolvedDir?.path) return null;
  const children = listDirectoryChildren(resolvedDir.abs)
    .filter(entry => !SOURCE_BLOCKED_PATH_PATTERN.test(path.join(resolvedDir.abs, entry.name)));

  const childDirs = children
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const childFiles = children
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => SOURCE_ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort();

  const moduleType = (() => {
    if (/^data-defaults(\/|$)/i.test(resolvedDir.path)) return 'default-data';
    if (/^data(\/|$)/i.test(resolvedDir.path)) return 'runtime-data';
    if (/^taoyuan-main\/electron(\/|$)/i.test(resolvedDir.path)) return 'electron';
    if (/^server\/src\/routes(\/|$)/i.test(resolvedDir.path)) return 'routes';
    return 'directory';
  })();

  const previewDirs = childDirs.slice(0, SOURCE_DIRECTORY_CHILD_LIMIT);
  const previewFiles = childFiles.slice(0, SOURCE_DIRECTORY_CHILD_LIMIT);
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
    path: resolvedDir.path,
    sourceRefs: [resolvedDir.path],
    sourceType: 'source-directory',
    moduleType,
    moduleLabel: SOURCE_MODULE_LABELS[moduleType] || SOURCE_MODULE_LABELS.directory,
    keywords: unique([
      resolvedDir.path,
      ...resolvedDir.path.split(/[\/._-]/),
      ...childDirs,
      ...childFiles,
    ].filter(Boolean)),
    childDirs,
    childFiles,
  };
}

function scoreSourceDirectoryEntry(entry, queryPlan = {}, routeName = '') {
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

function searchSourceDirectories(question, routeName) {
  const queryPlan = resolveQueryPlan(question, routeName);
  const directoryTargets = unique((queryPlan.explicitTargets || []).filter(isDirectoryLikeTarget));
  if (!directoryTargets.length) return [];

  return directoryTargets
    .map(resolveExplicitDirectoryTarget)
    .filter(Boolean)
    .map(createDirectorySummaryEntry)
    .filter(Boolean)
    .map(entry => ({ ...entry, score: scoreSourceDirectoryEntry(entry, queryPlan, routeName) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_INDEX_MAX_HITS);
}

function searchSourceIndex(question, routeName) {
  const queryPlan = resolveQueryPlan(question, routeName);
  const terms = queryPlan.sourceTerms || [];
  const explicitTargets = queryPlan.explicitTargets || [];
  if (!terms.length) return [];

  return getSourceIndexEntries()
    .map(entry => ({ ...entry, score: scoreSourceIndexEntry(entry, terms, routeName, explicitTargets, queryPlan) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_INDEX_MAX_HITS);
}

function searchSourceContext(question, routeName) {
  const queryPlan = resolveQueryPlan(question, routeName);
  const terms = queryPlan.sourceTerms || [];
  const explicitTargets = queryPlan.explicitTargets || [];
  if (!terms.length) return [];

  const candidates = [];
  for (const filePath of collectSourceFiles()) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const score = scoreSourceFile(filePath, text, terms, routeName, explicitTargets, queryPlan);
      if (score <= 0) continue;
      const snippet = extractSourceSnippet(text, terms);
      if (!snippet) continue;
      candidates.push({
        path: toWhitelistRelative(filePath),
        snippet,
        summary: summarizeSourceSnippet(snippet),
        score,
      });
    } catch {}
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_MAX_HITS);
}

function composeSourceKnowledgeContent(question, routeName, sourceHits = []) {
  const intro = routeName && ROUTE_LABELS[routeName]
    ? `围绕【${ROUTE_LABELS[routeName]}】相关问题“${question}”，可从源码整理出以下信息：`
    : `围绕问题“${question}”，可从源码整理出以下信息：`;

  const bullets = sourceHits.map((hit, index) => `${index + 1}. ${hit.summary}（来源：${hit.path}）`);
  return [intro, ...bullets, '说明：以上内容由当前项目源码片段整理而来，后续若实现变更，应以最新源码为准。'].join('\n');
}

function buildSourceIndexMatches(indexHits = []) {
  return indexHits.map((hit, index) => ({
    id: `source_index_${index}_${normalizeText(hit.path)}_${hit.startLine}`,
    title: `源码索引：${hit.title}`,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      hit.summary,
      `模块类型：${hit.moduleLabel || SOURCE_MODULE_LABELS.module}`,
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

function buildSourceSymbolMatches(symbolHits = []) {
  return symbolHits.map((hit, index) => ({
    id: `source_symbol_${index}_${normalizeText(hit.path)}_${normalizeText(hit.name)}`,
    title: `源码符号：${hit.name}`,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      `符号类型：${hit.kindLabel || SOURCE_SYMBOL_KIND_LABELS.module}`,
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

function buildSourceDirectoryMatches(directoryHits = []) {
  return directoryHits.map((hit, index) => ({
    id: `source_directory_${index}_${normalizeText(hit.path)}`,
    title: hit.title,
    routeNames: [],
    keywords: hit.keywords || [],
    access: 'public',
    content: [
      hit.content,
      `模块类型：${hit.moduleLabel || SOURCE_MODULE_LABELS.directory}`,
    ].filter(Boolean).join('\n\n'),
    score: Math.max(1, hit.score || 1),
    sourceType: 'source-directory',
    sourceRefs: [hit.path],
    path: hit.path,
    moduleType: hit.moduleType,
    moduleLabel: hit.moduleLabel,
  }));
}

function resolveWhitelistRelativeFilePath(relativePath = '') {
  const rawRelativePath = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
  const normalizedRelativePath = normalizePathTarget(rawRelativePath);
  if (!rawRelativePath || !normalizedRelativePath) return '';

  for (const root of SOURCE_WHITELIST) {
    const normalizedRootPath = normalizePathTarget(root.key);
    if (normalizedRelativePath === normalizedRootPath) {
      try {
        if (fs.existsSync(root.abs) && fs.statSync(root.abs).isFile()) return root.abs;
      } catch {}
      continue;
    }

    if (!normalizedRelativePath.startsWith(`${normalizedRootPath}/`)) continue;
    const subPath = rawRelativePath.slice(root.key.length + 1);
    const absPath = path.resolve(root.abs, ...subPath.split('/'));
    try {
      const relativeToRoot = path.relative(root.abs, absPath);
      if (
        relativeToRoot.startsWith('..')
        || path.isAbsolute(relativeToRoot)
        || SOURCE_BLOCKED_PATH_PATTERN.test(absPath)
      ) {
        continue;
      }
      if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) return absPath;
    } catch {}
  }

  return '';
}

function sanitizeFullSourceContent(text = '') {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => (SOURCE_SKIP_LINE_PATTERN.test(line) ? '[已过滤敏感行]' : line))
    .join('\n')
    .trim();
}

function formatFullSourceContentForEvidence(text = '') {
  const safeText = sanitizeFullSourceContent(text);
  if (!safeText) {
    return {
      content: '',
      truncated: false,
      originalLength: 0,
    };
  }

  if (safeText.length <= SOURCE_MAX_FULLFILE_CONTENT_LENGTH) {
    return {
      content: safeText,
      truncated: false,
      originalLength: safeText.length,
    };
  }

  return {
    content: [
      safeText.slice(0, SOURCE_MAX_FULLFILE_CONTENT_LENGTH),
      '',
      `[文件过大，已截断展示。原始长度 ${safeText.length} 字符；当前仅展示前 ${SOURCE_MAX_FULLFILE_CONTENT_LENGTH} 字符。]`,
    ].join('\n'),
    truncated: true,
    originalLength: safeText.length,
  };
}

function createFullFileMatch(relativePath = '', options = {}) {
  const absPath = resolveWhitelistRelativeFilePath(relativePath);
  if (!absPath) return null;

  const moduleType = String(options.moduleType || detectSourceModuleType(relativePath) || 'module');
  const moduleLabel = SOURCE_MODULE_LABELS[moduleType] || SOURCE_MODULE_LABELS.module;

  try {
    const rawText = fs.readFileSync(absPath, 'utf8');
    const fullFile = formatFullSourceContentForEvidence(rawText);
    if (!fullFile.content) return null;

    return {
      id: `source_fullfile_${normalizeText(relativePath)}`,
      title: `完整文件：${relativePath}`,
      routeNames: [],
      keywords: unique([
        relativePath,
        ...relativePath.split(/[\\/._-]/).filter(Boolean),
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

function buildDirectoryFullFileMatches(directoryMatch = {}, queryPlan = {}) {
  if (!directoryMatch?.path) return [];
  const resolvedDir = resolveExplicitDirectoryTarget(directoryMatch.path);
  if (!resolvedDir?.abs) return [];

  return listDirectoryChildren(resolvedDir.abs)
    .filter(entry => entry.isFile())
    .filter(entry => SOURCE_ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .filter(entry => !SOURCE_BLOCKED_PATH_PATTERN.test(path.join(resolvedDir.abs, entry.name)))
    .map(entry => {
      const childRelativePath = `${resolvedDir.path}/${entry.name}`.replace(/\\/g, '/');
      const childAbsPath = path.join(resolvedDir.abs, entry.name);
      let score = Math.max(1, Number(directoryMatch.score) || 1) - 12;

      try {
        const text = fs.readFileSync(childAbsPath, 'utf8');
        score += scoreSourceFile(
          childAbsPath,
          text,
          queryPlan.sourceTerms || [],
          queryPlan.routeName || '',
          queryPlan.explicitTargets || [],
          queryPlan
        );
      } catch {}

      return createFullFileMatch(childRelativePath, {
        moduleType: detectSourceModuleType(childRelativePath),
        originTitle: directoryMatch.title,
        originSourceType: directoryMatch.sourceType || 'source-directory',
        score,
        keywords: directoryMatch.keywords || [],
      });
    })
    .filter(Boolean);
}

function selectExpandedFullFileMatches(matches = [], limit = SOURCE_FULLFILE_EXPAND_LIMIT) {
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
    .slice(0, Math.max(1, limit));
}

function expandRetrievedMatchesToFullFiles(matches = [], queryPlan = {}) {
  const passthrough = [];
  const fullFileCandidates = [];

  for (const item of matches) {
    if (!item || typeof item !== 'object') continue;

    if (item.sourceType === 'source-directory') {
      passthrough.push(item);
      if (queryPlan.sourcePreference === 'strong' || (queryPlan.intents || []).includes('inspect_directory')) {
        fullFileCandidates.push(...buildDirectoryFullFileMatches(item, queryPlan).slice(0, SOURCE_DIRECTORY_FULLFILE_LIMIT));
      }
      continue;
    }

    if (item.sourceType === 'source-fullfile') {
      fullFileCandidates.push(item);
      continue;
    }

    if (['source-index', 'source-symbol', 'source'].includes(item.sourceType) && item.path) {
      const fullFileMatch = createFullFileMatch(item.path, {
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

  return [...passthrough, ...selectExpandedFullFileMatches(fullFileCandidates, SOURCE_FULLFILE_EXPAND_LIMIT)];
}

function isRuntimeSensitiveSourceItem(item = {}) {
  const itemPath = String(item?.path || item?.sourceRefs?.[0] || '');
  return SOURCE_RUNTIME_DATA_PATH_PATTERN.test(itemPath) || item?.moduleType === 'runtime-data';
}

function scoreRetrievedMatchForAnswer(item, queryPlan = {}) {
  let score = Number(item?.score) || 0;
  const sourceType = String(item?.sourceType || 'manual');
  const sourceRefs = Array.isArray(item?.sourceRefs) ? item.sourceRefs : [];
  const explicitTargets = queryPlan.explicitTargets || [];
  const primaryIntent = queryPlan.primaryIntent || '';
  const itemPath = String(item?.path || sourceRefs[0] || '');

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

  if ((primaryIntent === 'find_source' || primaryIntent === 'gameplay_qa') && AI_ASSISTANT_INTERNAL_PATH_PATTERN.test(itemPath)) {
    score -= 220;
  }
  if ((primaryIntent === 'find_source' || primaryIntent === 'gameplay_qa') && SOURCE_RUNTIME_DATA_PATH_PATTERN.test(itemPath)) {
    score -= 140;
  }

  for (const target of explicitTargets) {
    if (!target) continue;
    if (sourceRefs.some(ref => matchesExplicitPath(ref, target))) score += 70;
    if (matchesExplicitPath(item?.title || '', target) || normalizeText(item?.title || '').includes(normalizeText(target))) score += 30;
  }

  return score;
}

function recallSearchCandidates(question, routeName, mode, queryPlan, knowledgeMatches = [], options = {}) {
  const recalledKnowledgeMatches = (knowledgeMatches || []).slice(0, SOURCE_RECALL_KNOWLEDGE_LIMIT);
  const shouldSourceSearch = options.sourceReadEnabled === true && shouldSearchSource(recalledKnowledgeMatches, queryPlan);

  let sourceSymbolHits = [];
  let sourceIndexHits = [];
  let sourceDirectoryHits = [];
  let sourceHits = [];

  if (shouldSourceSearch) {
    sourceDirectoryHits = searchSourceDirectories(queryPlan, routeName).slice(0, SOURCE_RECALL_DIRECTORY_LIMIT);
    sourceSymbolHits = searchSourceSymbols(queryPlan, routeName).slice(0, SOURCE_RECALL_SYMBOL_LIMIT);
    sourceIndexHits = searchSourceIndex(queryPlan, routeName).slice(0, SOURCE_RECALL_INDEX_LIMIT);

    if (
      sourceDirectoryHits.length < SOURCE_RECALL_DIRECTORY_LIMIT
      || sourceSymbolHits.length < Math.min(4, SOURCE_RECALL_SYMBOL_LIMIT)
      || sourceIndexHits.length < Math.min(4, SOURCE_RECALL_INDEX_LIMIT)
      || ((sourceIndexHits[0]?.score || 0) < 12 && (sourceSymbolHits[0]?.score || 0) < 12)
    ) {
      sourceHits = searchSourceContext(queryPlan, routeName).slice(0, SOURCE_RECALL_CONTEXT_LIMIT);
    }
  }

  // D1: noun-lexicon occurrence candidates
  const nounLexiconCandidates = buildNounLexiconCandidateMatches(
    (queryPlan.nounLexiconMatches || []).slice(0, SOURCE_RECALL_NOUN_LEXICON_LIMIT)
  );

  const stage1Pool = dedupeRetrievedMatches([
    ...recalledKnowledgeMatches,
    ...buildSourceDirectoryMatches(sourceDirectoryHits),
    ...buildSourceSymbolMatches(sourceSymbolHits),
    ...buildSourceIndexMatches(sourceIndexHits),
    ...buildSourceKnowledgeMatches(sourceHits),
    ...nounLexiconCandidates,
  ])
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, SOURCE_STAGE1_POOL_LIMIT);

  const finalMatches = dedupeRetrievedMatches(rerankRetrievedMatches(stage1Pool, queryPlan)).slice(0, SOURCE_STAGE1_EXPAND_LIMIT);

  return {
    shouldSourceSearch,
    knowledgeMatches: recalledKnowledgeMatches,
    sourceDirectoryHits,
    sourceSymbolHits,
    sourceIndexHits,
    sourceHits,
    nounLexiconCandidates,
    stage1Pool,
    finalMatches,
  };
}

function filterRetrievedMatchesForAudience(matches = [], queryPlan = {}) {
  if (queryPlan.sourcePreference === 'strong') return matches;
  if (!['find_source', 'gameplay_qa'].includes(queryPlan.primaryIntent || '')) return matches;

  const safeMatches = matches.filter(item => !isRuntimeSensitiveSourceItem(item));
  return safeMatches.length ? safeMatches : matches;
}

function rerankRetrievedMatches(matches = [], queryPlan = {}) {
  return filterRetrievedMatchesForAudience(expandRetrievedMatchesToFullFiles(matches, queryPlan), queryPlan)
    .map(item => ({ ...item, responseScore: scoreRetrievedMatchForAnswer(item, queryPlan) }))
    .sort((a, b) => b.responseScore - a.responseScore);
}

function dedupeRetrievedMatches(matches = []) {
  const seen = new Set();
  const result = [];

  for (const item of matches) {
    if (item.sourceType === 'source-fullfile') {
      const key = `${item.sourceType || ''}|${item.path || item.sourceRefs?.[0] || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
      continue;
    }

    const key = [
      item.sourceType || '',
      item.path || item.sourceRefs?.[0] || '',
      item.symbol || item.name || item.title || '',
      item.startLine || item.lineNumber || '',
      item.endLine || '',
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function draftKnowledgeFromSource(question, routeName, sourceHits = []) {
  if (!sourceHits.length) return null;
  return sanitizeKnowledgeEntry({
    title: String(question || '').trim().slice(0, 80) || '源码整理候选知识',
    routeNames: routeName ? [routeName] : [],
    keywords: extractSearchTerms(question, routeName),
    content: composeSourceKnowledgeContent(question, routeName, sourceHits),
    access: 'public',
    enabled: true,
    sourceType: 'source',
    reviewStatus: 'draft',
    sourceRefs: sourceHits.map(hit => hit.path),
  }, {
    reviewStatus: 'draft',
    sourceType: 'source',
  });
}

function upsertAutoKnowledgeFromSource(question, routeName, sourceHits = []) {
  if (!sourceHits.length) return null;

  const store = loadKnowledgeStore();
  const sourceKey = `source-auto:${normalizeText(question)}:${routeName || ''}`;
  const draft = sanitizeKnowledgeEntry({
    ...draftKnowledgeFromSource(question, routeName, sourceHits),
    metadata: { sourceKey, sourceMode: 'auto' },
  }, {
    reviewStatus: 'draft',
    sourceType: 'source',
  });

  const index = store.entries.findIndex(entry => entry?.metadata?.sourceKey === sourceKey);
  if (index >= 0) {
    const current = sanitizeKnowledgeEntry(store.entries[index], store.entries[index]);
    store.entries[index] = sanitizeKnowledgeEntry({ ...current, ...draft, id: current.id, createdAt: current.createdAt }, current);
  } else {
    store.entries.unshift(draft);
  }

  saveKnowledgeStore(store);
  return index >= 0
    ? sanitizeKnowledgeEntry(store.entries[index], store.entries[index])
    : draft;
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_\-:'"`]+/g, '');
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function splitTopics(value) {
  return String(value || '')
    .split(/\r?\n|,|，|;|；/)
    .map(item => item.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBlockedPatterns(mode) {
  const builtIn = [
    /掉率|爆率|出货率|概率|保底概率/i,
    /风控|反作弊|检测逻辑|后台规则/i,
    /管理员口令|管理员密码|密钥|token|api key/i,
    /漏洞|刷资源|刷钱|绕过限制|注入/i,
  ];

  const custom = splitTopics(cfg.get('ai_assistant_blocked_topics')).map(topic => new RegExp(escapeRegExp(topic), 'i'));
  if (mode === 'strict') return [...builtIn, ...custom];
  return [...builtIn.slice(1), ...custom];
}

function getMode() {
  return cfg.get('ai_assistant_mode') === 'standard' ? 'standard' : 'strict';
}

const DEFAULT_CONSOLE_CREDIT_MESSAGE =
  '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186';
const DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE =
  '你好，我是桃源小助理。我可以结合当前页面和玩家可见状态，回答玩法目标、资源来源、任务卡点和下一步建议；回答会标明内置知识库、远程模型或 fallback 来源。严格模式下，我不会提供隐藏掉率、后台规则、密钥或刷资源方法，也不会执行存档修改、奖励发放或资源扣除。可以先点下方快捷问题开始。';

const OFFICIAL_MANAGED_AI_FIELDS = Object.freeze([
  'ai_assistant_name',
  'ai_assistant_welcome',
  'ai_assistant_console_credit',
]);

function getPublicConfig() {
  migrateLegacyStoredApiKey();
  const enabled = cfg.get('ai_assistant_enabled') !== false;
  const assistantName = String(cfg.get('ai_assistant_name') || '桃源小助理').trim() || '桃源小助理';
  const welcomeMessage =
    String(cfg.get('ai_assistant_welcome') || '').trim() ||
    DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE;
  const consoleCreditMessage =
    String(cfg.get('ai_assistant_console_credit') || '').trim() || DEFAULT_CONSOLE_CREDIT_MESSAGE;
  const apiUrl = String(cfg.get('ai_assistant_api_url') || '').trim();
  const model = String(cfg.get('ai_assistant_model') || '').trim();
  return {
    enabled,
    mode: getMode(),
    assistantName,
    welcomeMessage,
    consoleCreditMessage,
    providerConfigured: !!(apiUrl && model),
  };
}

function getAdminConfig() {
  const apiKeyStatus = getApiKeyStatus();
  const publicConfig = getPublicConfig();
  return {
    ...publicConfig,
    sourceReadEnabled: cfg.get('ai_assistant_source_read_enabled') === true,
    sourceIngestEnabled: cfg.get('ai_assistant_source_ingest_enabled') === true,
    sourceIndexStatus: getSourceIndexStatus(),
    nounLexiconStatus: getNounLexiconStatus(),
    modelHealth: getRemoteModelCircuitStatus(),
    apiUrl: String(cfg.get('ai_assistant_api_url') || '').trim(),
    apiKeyConfigured: apiKeyStatus.configured,
    apiKeyLast4: apiKeyStatus.last4,
    apiKeyMasked: apiKeyStatus.masked,
    apiKeySource: apiKeyStatus.source,
    model: String(cfg.get('ai_assistant_model') || '').trim(),
    temperature: sanitizeTemperature(cfg.get('ai_assistant_temperature')),
    systemPrompt:
      String(cfg.get('ai_assistant_system_prompt') || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    blockedTopics: String(cfg.get('ai_assistant_blocked_topics') || '').trim(),
    officialManagedStatus: cfg.getManagedStatus(),
    readonlyManagedFields: [...OFFICIAL_MANAGED_AI_FIELDS],
  };
}

function sanitizeTemperature(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.2;
  return Math.max(0, Math.min(1.5, parsed));
}

function setAdminConfig(input = {}) {
  migrateLegacyStoredApiKey();
  const apiKeyAction = String(input.apiKeyAction || input.api_key_action || '').trim();
  const nextApiKey = String(input.apiKey || input.api_key || '').trim();
  const shouldClearApiKey = input.clearApiKey === true || input.clear_api_key === true || apiKeyAction === 'clear';
  const shouldUpdateApiKey = !shouldClearApiKey && nextApiKey.length > 0;
  const apiUrl = String(input.apiUrl || '').trim();
  validateModelApiUrl(apiUrl);

  const updates = {
    ai_assistant_enabled: input.enabled !== false,
    ai_assistant_mode: input.mode === 'standard' ? 'standard' : 'strict',
    ai_assistant_source_read_enabled: input.sourceReadEnabled === true,
    ai_assistant_source_ingest_enabled: input.sourceIngestEnabled === true,
    ai_assistant_name: String(input.assistantName || '桃源小助理').trim() || '桃源小助理',
    ai_assistant_welcome:
      String(input.welcomeMessage || '').trim() ||
      DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE,
    ai_assistant_console_credit:
      String(input.consoleCreditMessage || '').trim() || DEFAULT_CONSOLE_CREDIT_MESSAGE,
    ai_assistant_api_url: apiUrl,
    ai_assistant_api_key: '',
    ai_assistant_model: String(input.model || '').trim(),
    ai_assistant_temperature: sanitizeTemperature(input.temperature),
    ai_assistant_system_prompt:
      String(input.systemPrompt || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    ai_assistant_blocked_topics: String(input.blockedTopics || '').trim(),
  };

  if (shouldClearApiKey) {
    runtimeApiKeyOverride = '';
    updates.ai_assistant_api_key_configured = false;
    updates.ai_assistant_api_key_last4 = '';
  } else if (shouldUpdateApiKey) {
    runtimeApiKeyOverride = nextApiKey;
    updates.ai_assistant_api_key_configured = true;
    updates.ai_assistant_api_key_last4 = getApiKeyLast4(nextApiKey);
  }

  if (typeof cfg.setWithMeta === 'function') {
    cfg.setWithMeta(updates);
  } else {
    cfg.set(updates);
  }
  return getAdminConfig();
}

function detectSensitiveQuestion(question, mode) {
  const normalized = String(question || '').trim();
  if (!normalized) return false;
  return getBlockedPatterns(mode).some(pattern => pattern.test(normalized));
}

const OUTPUT_GUARD_SAFE_ANSWER =
  '这个回答触发了安全保护，可能包含不适合公开展示的后台规则、密钥形态或过长技术细节。本次改用安全提示：我可以继续回答玩家可见的玩法说明、资源路线和任务建议。';

const OUTPUT_SECRET_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/i,
  /Bearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌)\s*[:=：]\s*['"]?[A-Za-z0-9._~+/\-]{12,}/i,
  /\b[A-Fa-f0-9]{48,}\b/,
];

const OUTPUT_INTERNAL_PATH_PATTERNS = [
  /server[\\/]+src[\\/]+/i,
  /server[\\/]+scripts[\\/]+/i,
  /data[\\/]+sys_config\.json/i,
  /data-defaults[\\/]+sys_config\.json/i,
  /(?:^|[\s"`'])\.env(?:[\s"`']|$)/i,
  /\bprocess\.env\b/,
  /\b(?:TAOYUAN_AI_ASSISTANT_API_KEY|AI_ASSISTANT_API_KEY|OPENAI_API_KEY)\b/,
];

const OUTPUT_PROMPT_LEAK_PATTERNS = [
  /(?:系统提示词|内部提示词|开发者消息|后台规则|风控策略)\s*(?:是|为|如下|内容|[:：])/i,
  /(?:system prompt|developer message|hidden prompt)\s*(?:is|as follows|:)/i,
  /(?:忽略|绕过).{0,24}(?:系统提示词|后台规则|风控策略|安全规则)/i,
];

function hasSafeRefusalLanguage(text = '') {
  return /不会|不能|无法|不提供|不公开|不透露|不展示|拒绝|敏感|安全保护|不适合公开|不可公开/i.test(text);
}

function containsLongCodeSnippet(text = '') {
  const fencedBlocks = String(text || '').match(/```[\s\S]*?```/g) || [];
  if (fencedBlocks.some(block => block.length > 360 || block.split(/\r?\n/).length > 10)) return true;

  let codeLineCount = 0;
  let codeLineLength = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (
      /^\s*(?:const|let|var|function|class|import|export|module\.exports|async\s+function|if\s*\(|for\s*\(|while\s*\(|return\b|try\s*\{|catch\s*\(|def\s+|from\s+\S+\s+import\b|SELECT\b|UPDATE\b|INSERT\b|DELETE\b)/i.test(line)
      || /[{};]{2,}/.test(line)
    ) {
      codeLineCount += 1;
      codeLineLength += line.length;
    }
  }

  return codeLineCount >= 8 || codeLineLength >= 700;
}

function containsBackendRuleLeak(text = '') {
  const normalized = String(text || '');
  if (!/(风控|反作弊|后台规则|管理规则|检测逻辑|隐藏规则|系统提示词|prompt)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized) && !OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(normalized))) return false;
  return /(阈值|策略|逻辑|绕过|命中|配置|条件|公式|概率|权重|如下|是|为|内容|接口|路径)/i.test(normalized);
}

function containsHiddenRateLeak(text = '') {
  const normalized = String(text || '');
  if (!/(掉率|爆率|出货率|概率|保底概率|隐藏数值)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized)) return false;
  return /(?:\d+(?:\.\d+)?%|权重|公式|配置|具体|实际|是|为|表格|档位)/i.test(normalized);
}

function containsAbuseGuidance(text = '') {
  const normalized = String(text || '');
  if (!/(漏洞|刷资源|刷钱|绕过限制|注入|越权|作弊)/i.test(normalized)) return false;
  if (hasSafeRefusalLanguage(normalized)) return false;
  return /(步骤|方法|可以|先|然后|接口|请求|命令|脚本|参数)/i.test(normalized);
}

function scanAiAssistantOutput(answer = '', options = {}) {
  const text = String(answer || '').trim();
  const reasons = [];
  if (!text) return { blocked: false, reasons, safeAnswer: OUTPUT_GUARD_SAFE_ANSWER };

  if (OUTPUT_SECRET_PATTERNS.some(pattern => pattern.test(text))) reasons.push('secret_shape');
  if (OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(text))) reasons.push('prompt_or_rule_leak');
  if (containsBackendRuleLeak(text)) reasons.push('backend_rule_leak');
  if (containsHiddenRateLeak(text)) reasons.push('hidden_rate_leak');
  if (containsAbuseGuidance(text)) reasons.push('abuse_guidance');

  const shouldBlockInternalTechnicalDetails =
    options.publicRequest === true || options.provider === 'model' || options.debug !== true;
  if (shouldBlockInternalTechnicalDetails && OUTPUT_INTERNAL_PATH_PATTERNS.some(pattern => pattern.test(text))) {
    reasons.push('internal_path_leak');
  }
  if (shouldBlockInternalTechnicalDetails && containsLongCodeSnippet(text)) {
    reasons.push('long_code_snippet');
  }

  return {
    blocked: reasons.length > 0,
    reasons: unique(reasons),
    safeAnswer: OUTPUT_GUARD_SAFE_ANSWER,
  };
}

function sanitizeModelTraceForOutputGuard(modelTrace = {}) {
  const sanitized = {
    ...modelTrace,
    rawOutput: modelTrace.rawOutput ? '[blocked by output guard]' : '',
    error: modelTrace.error || 'output_guard_blocked',
  };
  if (modelTrace.structured) {
    sanitized.structured = {
      ...modelTrace.structured,
      answer: '[blocked by output guard]',
      evidence_ids: [],
      matched_files: [],
      uncertain_points: [],
      actions: [],
    };
  }
  return sanitized;
}

function scoreEntry(entry, question, routeName) {
  const rawQuestion = String(question || '');
  const normalizedQuestion = normalizeText(rawQuestion);
  let score = 0;

  if (routeName && entry.routeNames.includes(routeName)) score += 6;

  for (const keyword of entry.keywords) {
    if (normalizedQuestion.includes(normalizeText(keyword))) {
      score += keyword.length >= 3 ? 4 : 2;
    }
  }

  if (normalizedQuestion.includes(normalizeText(entry.title))) score += 5;

  if (routeName && entry.routeNames.includes(routeName) && /这里|当前|这个页面|这页|本页/.test(rawQuestion)) {
    score += 3;
  }

  return score;
}

function shouldSearchSource(matches = [], question = '') {
  const queryPlan = resolveQueryPlan(question);
  const rawQuestion = String(queryPlan?.raw || question || '');
  const topScore = Number(matches?.[0]?.score || 0) || 0;

  if (queryPlan?.needsSourceSearch) return true;

  if ((queryPlan?.primaryIntent === 'find_source' || queryPlan?.primaryIntent === 'gameplay_qa') && matches.length >= 1 && topScore >= 10) {
    return false;
  }

  if (/在哪里|在哪|哪买|购买|获得|获取|材料|来源|喂|配方|条件|前置|怎么做/i.test(rawQuestion)) {
    return true;
  }
  if (!matches.length) return true;
  return matches.length < 2 || (matches[0]?.score || 0) < 8;
}

function buildNounLexiconCandidateMatches(nounLexiconMatches = []) {
  const results = [];
  for (const entry of nounLexiconMatches) {
    for (const occ of (entry.occurrences || []).slice(0, 3)) {
      if (!occ?.path) continue;
      results.push({
        id: `noun_lexicon_${normalizeText(entry.term)}_${normalizeText(occ.path)}`,
        title: `词典线索：${entry.term}`,
        routeNames: entry.routeHints || [],
        keywords: [entry.term, ...(entry.aliases || [])],
        access: 'public',
        content: [
          entry.routeHints?.length ? `关联页面：${entry.routeHints.join(' / ')}` : '',
          entry.relatedTerms?.length ? `关联词：${entry.relatedTerms.slice(0, 6).join('、')}` : '',
          `来源文件：${occ.path}${occ.lineNumber ? `（第 ${occ.lineNumber} 行附近）` : ''}`,
          occ.preview ? `片段：${occ.preview}` : '',
        ].filter(Boolean).join('\n\n'),
        score: 4,
        sourceType: 'source-noun-lexicon',
        sourceRefs: [occ.path],
        path: occ.path,
        lineNumber: occ.lineNumber,
        moduleType: occ.moduleType,
      });
    }
  }
  return results;
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

function buildEvidencePayload(snippets = []) {
  return snippets.map((item, index) => ({
    evidence_id: `E${index + 1}`,
    type: String(item.sourceType || 'manual'),
    title: String(item.title || '未命名片段'),
    path: String(item.path || item.sourceRefs?.[0] || ''),
    symbol: String(item.symbol || ''),
    startLine: Number(item.startLine || item.lineNumber || 0) || undefined,
    endLine: Number(item.endLine || item.lineNumber || 0) || undefined,
    score: Number(item.responseScore || item.score || 0) || 0,
    content: String(item.content || item.snippet || '').trim(),
    contentMode: String(item.contentMode || (item.sourceType === 'source-fullfile' ? 'full-file' : 'snippet')),
    originTitle: String(item.originTitle || ''),
    originSourceType: String(item.originSourceType || ''),
    truncated: item.truncated === true,
    originalLength: Number(item.originalLength || 0) || undefined,
  }));
}

function buildEvidenceText(snippets = []) {
  const evidence = buildEvidencePayload(snippets);
  if (!evidence.length) return '[]';
  return JSON.stringify(evidence, null, 2);
}

function extractJsonBlock(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf('{');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1).trim();
    }
  }

  return '';
}

const SAFE_MODEL_ACTION_TYPES = new Set([
  'navigate',
  'open_page',
  'open_mail',
  'open_activity',
  'open_quest',
  'copy_checklist',
  'expand_page',
  'mark_goal',
]);

function parseModelStructuredPayload(rawText = '') {
  const jsonText = extractJsonBlock(rawText);
  if (!jsonText) return null;

  try {
    const payload = JSON.parse(jsonText);
    if (!payload || typeof payload !== 'object') return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizeModelAction(action = {}) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return null;
  const type = String(action.type || action.action || '').trim();
  if (!SAFE_MODEL_ACTION_TYPES.has(type)) return null;
  const label = String(action.label || action.title || '').trim().slice(0, 80);
  if (!label) return null;
  const normalized = {
    type,
    label,
    target: String(action.target || action.routeName || action.route_name || action.href || '').trim().slice(0, 160),
    value: String(action.value || action.text || '').trim().slice(0, 1000),
    items: toArray(action.items || action.checklist || [])
      .map(item => String(item || '').trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 20),
  };
  return normalized;
}

function normalizeModelStructuredOutputPayload(payload = {}) {
  return {
    intent: String(payload.intent || '').trim().slice(0, 80),
    answer: String(payload.answer || '').trim(),
    evidence_ids: unique(toArray(payload.evidence_ids || payload.evidenceIds || []).map(item => String(item || '').trim()).filter(Boolean)),
    matched_files: unique(toArray(payload.matched_files || payload.matchedFiles || []).map(item => String(item || '').trim()).filter(Boolean)),
    uncertain_points: toArray(payload.uncertain_points || payload.uncertainPoints || []).map(item => String(item || '').trim()).filter(Boolean),
    actions: toArray(payload.actions || []).map(normalizeModelAction).filter(Boolean).slice(0, 5),
  };
}

function parseModelStructuredOutput(rawText = '') {
  const payload = parseModelStructuredPayload(rawText);
  return payload ? normalizeModelStructuredOutputPayload(payload) : null;
}

function hasOwnModelField(payload = {}, snakeName, camelName = snakeName) {
  return Object.prototype.hasOwnProperty.call(payload, snakeName)
    || Object.prototype.hasOwnProperty.call(payload, camelName);
}

function getRawModelArrayField(payload = {}, snakeName, camelName = snakeName) {
  const raw = Object.prototype.hasOwnProperty.call(payload, snakeName)
    ? payload[snakeName]
    : payload[camelName];
  return Array.isArray(raw) ? raw : null;
}

function validateModelStructuredOutput(rawText = '', evidence = []) {
  const payload = parseModelStructuredPayload(rawText);
  if (!payload) throw createError('远程模型必须返回结构化 JSON', 502);

  const missingFields = [];
  if (!hasOwnModelField(payload, 'answer')) missingFields.push('answer');
  if (!hasOwnModelField(payload, 'evidence_ids', 'evidenceIds')) missingFields.push('evidence_ids');
  if (!hasOwnModelField(payload, 'uncertain_points', 'uncertainPoints')) missingFields.push('uncertain_points');
  if (!hasOwnModelField(payload, 'actions')) missingFields.push('actions');
  if (missingFields.length) {
    throw createError(`远程模型结构缺少字段：${missingFields.join(', ')}`, 502);
  }

  const evidenceIdRaw = getRawModelArrayField(payload, 'evidence_ids', 'evidenceIds');
  const matchedFilesRaw = hasOwnModelField(payload, 'matched_files', 'matchedFiles')
    ? getRawModelArrayField(payload, 'matched_files', 'matchedFiles')
    : [];
  const uncertainRaw = getRawModelArrayField(payload, 'uncertain_points', 'uncertainPoints');
  const actionsRaw = getRawModelArrayField(payload, 'actions');
  if (!evidenceIdRaw || !matchedFilesRaw || !uncertainRaw || !actionsRaw) {
    throw createError('远程模型结构字段类型不正确', 502);
  }

  const structured = normalizeModelStructuredOutputPayload(payload);
  if (!structured.answer) throw createError('远程模型结构化回答不能为空', 502);
  if (actionsRaw.length !== structured.actions.length) {
    throw createError('远程模型返回了不允许的动作类型', 502);
  }

  const evidenceIds = new Set(evidence.map(item => String(item.evidence_id || '').trim()).filter(Boolean));
  const invalidEvidenceIds = structured.evidence_ids.filter(id => !evidenceIds.has(id));
  if (invalidEvidenceIds.length) {
    throw createError('远程模型引用了本次证据之外的 evidence', 502);
  }

  const evidencePaths = new Set(evidence.map(item => String(item.path || '').trim()).filter(Boolean));
  const invalidMatchedFiles = structured.matched_files.filter(file => file && !evidencePaths.has(file));
  if (invalidMatchedFiles.length) {
    throw createError('远程模型引用了本次证据之外的文件', 502);
  }

  return structured;
}

function trimPreview(value, limit = 260) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function toTraceCandidate(item = {}) {
  return {
    id: item.id || '',
    title: item.title || '',
    sourceType: item.sourceType || item.kind || '',
    score: Number(item.score || 0) || 0,
    responseScore: Number(item.responseScore || 0) || 0,
    path: item.path || item.sourceRefs?.[0] || '',
    symbol: item.symbol || item.name || '',
    symbolKind: item.symbolKind || item.kind || '',
    lineNumber: Number(item.lineNumber || 0) || undefined,
    startLine: Number(item.startLine || 0) || undefined,
    endLine: Number(item.endLine || 0) || undefined,
    sourceRefs: Array.isArray(item.sourceRefs) ? item.sourceRefs : [],
    routeHints: Array.isArray(item.routeHints) ? item.routeHints : [],
    preview: trimPreview(item.content || item.snippet || item.summary || ''),
    contentMode: item.contentMode || (item.sourceType === 'source-fullfile' ? 'full-file' : 'snippet'),
    originTitle: item.originTitle || '',
    originSourceType: item.originSourceType || '',
    truncated: item.truncated === true,
  };
}

const PUBLIC_AI_SOURCE_TYPE_LABELS = {
  'built-in': '内置知识库',
  'structured-knowledge': '结构化资料',
  manual: '管理知识库',
  source: '知识库整理',
  'source-auto': '知识库整理',
  'source-index': '源码索引',
  'source-symbol': '源码符号',
  'source-directory': '模块目录',
  'source-fullfile': '源码文件',
  'source-noun-lexicon': '名词词典',
};

const AI_PROVIDER_LABELS = {
  local: '内置知识库',
  model: '远程模型',
  fallback: 'fallback',
  guard: '安全保护',
};

const REMOTE_MODEL_FALLBACK_NOTICE = '远程模型暂不可用，本次使用内置知识库回答。';

function appendRemoteModelFallbackNotice(answer = '', reason = '') {
  const base = String(answer || '').trim();
  const safeReason = sanitizePublicSummaryText(reason, '').replace(/[()（）]/g, '').trim();
  const notice = safeReason
    ? `（提示：${REMOTE_MODEL_FALLBACK_NOTICE}原因：${safeReason}。）`
    : `（提示：${REMOTE_MODEL_FALLBACK_NOTICE}）`;
  return base ? `${base}\n\n${notice}` : notice;
}

function sanitizePublicSummaryText(value = '', fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (OUTPUT_SECRET_PATTERNS.some(pattern => pattern.test(text))) return fallback;
  if (OUTPUT_INTERNAL_PATH_PATTERNS.some(pattern => pattern.test(text))) return fallback;
  if (OUTPUT_PROMPT_LEAK_PATTERNS.some(pattern => pattern.test(text))) return fallback;
  if (containsBackendRuleLeak(text) || containsHiddenRateLeak(text) || containsAbuseGuidance(text)) return fallback;
  return text.slice(0, 120);
}

function getPublicSourceTypeLabel(sourceType = '') {
  return PUBLIC_AI_SOURCE_TYPE_LABELS[sourceType] || '知识资料';
}

function getPublicModuleLabel(item = {}) {
  const sourceType = String(item.sourceType || item.kind || '').trim();
  if (sourceType === 'built-in') return '内置知识库';
  if (sourceType === 'structured-knowledge') return '结构化资料';
  if (sourceType === 'manual') return '管理知识库';
  if (sourceType === 'source-auto' || sourceType === 'source') return '知识库整理';
  const moduleType = String(item.moduleType || '').trim();
  if (moduleType && SOURCE_MODULE_LABELS[moduleType]) return SOURCE_MODULE_LABELS[moduleType];
  return getPublicSourceTypeLabel(sourceType);
}

function buildPublicEvidenceSummary(matches = []) {
  return matches
    .slice(0, 4)
    .map((item, index) => {
      const sourceType = String(item.sourceType || item.kind || 'manual').trim() || 'manual';
      const routeHints = unique(toArray(item.routeHints || item.routeNames || [])
        .map(hint => sanitizePublicSummaryText(ROUTE_LABELS[hint] || hint, ''))
        .filter(Boolean))
        .slice(0, 3);

      return {
        id: String(item.id || `E${index + 1}`),
        title: sanitizePublicSummaryText(item.title || item.originTitle || '知识资料', '知识资料'),
        sourceType,
        sourceTypeLabel: getPublicSourceTypeLabel(sourceType),
        moduleType: String(item.moduleType || ''),
        moduleLabel: getPublicModuleLabel(item),
        routeHints,
        truncated: item.truncated === true,
      };
    });
}

function buildAiAssistantTraceSummary({ provider, mode, evidence = [], modelTrace = {}, outputGuard = null } = {}) {
  const normalizedProvider = AI_PROVIDER_LABELS[provider] ? provider : 'local';
  const uncertainPoints = outputGuard?.blocked
    ? []
    : toArray(modelTrace?.structured?.uncertain_points || [])
        .map(item => sanitizePublicSummaryText(item, ''))
        .filter(Boolean)
        .slice(0, 3);
  const sourceTypes = unique(evidence.map(item => item.sourceTypeLabel || item.sourceType || '').filter(Boolean));

  return {
    provider: normalizedProvider,
    providerLabel: AI_PROVIDER_LABELS[normalizedProvider],
    mode,
    modeLabel: mode === 'standard' ? '标准模式' : '严格模式',
    answerSourceLabel: AI_PROVIDER_LABELS[normalizedProvider],
    fallback: normalizedProvider === 'fallback',
    guarded: normalizedProvider === 'guard',
    uncertain: uncertainPoints.length > 0,
    uncertainPoints,
    evidenceCount: evidence.length,
    sourceTypes,
  };
}

const AI_ASSISTANT_STREAM_DELTA_MAX_LENGTH = 96;
const AI_ASSISTANT_STREAM_PHASES = Object.freeze([
  { phase: 'understanding', label: '正在理解问题', detail: '正在识别问题意图和安全边界。' },
  { phase: 'reading_context', label: '正在读取当前页面和任务状态', detail: '只会使用玩家可见的只读摘要。' },
  { phase: 'matching_knowledge', label: '正在匹配知识库', detail: '正在查找内置知识库和公开资料。' },
  { phase: 'organizing', label: '正在整理建议', detail: '正在组织结论、依据和安全轻动作。' },
]);

function getAskStreamPhases() {
  return AI_ASSISTANT_STREAM_PHASES.map(item => ({ ...item }));
}

function splitAskStreamAnswer(answer = '', maxLength = AI_ASSISTANT_STREAM_DELTA_MAX_LENGTH) {
  const text = String(answer || '');
  if (!text) return [];

  const chunks = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + maxLength));
    index += maxLength;
  }
  return chunks;
}

function buildAskStreamResultEvents(result = {}) {
  const answer = String(result.answer || '');
  const mode = result.mode === 'standard' ? 'standard' : 'strict';
  const provider = AI_PROVIDER_LABELS[result.provider] ? result.provider : 'local';
  const payload = {
    answer,
    sources: Array.isArray(result.sources) ? result.sources : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    traceSummary: result.traceSummary || buildAiAssistantTraceSummary({
      provider,
      mode,
      evidence: Array.isArray(result.evidence) ? result.evidence : [],
    }),
    mode,
    provider,
  };

  return [
    ...splitAskStreamAnswer(answer).map(delta => ({ event: 'delta', data: { delta } })),
    {
      event: 'evidence',
      data: {
        evidence: payload.evidence,
        sources: payload.sources,
        suggestions: payload.suggestions,
        traceSummary: payload.traceSummary,
        mode: payload.mode,
        provider: payload.provider,
      },
    },
    { event: 'done', data: { done: true, ...payload } },
  ];
}

function buildAskTrace({
  question,
  routeName,
  contextLabel,
  mode,
  provider,
  queryPlan,
  knowledgeMatches,
  sourceDirectoryHits,
  sourceSymbolHits,
  sourceIndexHits,
  sourceHits,
  matches,
  evidence,
  shouldSourceSearch,
  sourceReadEnabled,
  sourceIngestEnabled,
  modelTrace,
  outputGuard,
  diagnostics,
  threeStepSuggestions,
  timings,
  answer,
}) {
  return {
    question,
    routeName,
    contextLabel,
    mode,
    provider,
    queryPlan: {
      primaryIntent: queryPlan?.primaryIntent || '',
      intents: queryPlan?.intents || [],
      questionCategory: queryPlan?.questionCategory || '',
      explicitTargets: queryPlan?.explicitTargets || [],
      quotedTerms: queryPlan?.quotedTerms || [],
      conceptTerms: queryPlan?.conceptTerms || [],
      identifierTargets: queryPlan?.identifierTargets || [],
      sourceTerms: queryPlan?.sourceTerms || [],
      questionTypes: queryPlan?.questionTypes || [],
      slots: summarizeQuerySlotsForTrace(queryPlan?.slots || {}),
      clarification: queryPlan?.clarification || { required: false, reason: '', options: [] },
      moduleHints: queryPlan?.moduleHints || [],
      routeHints: queryPlan?.routeHints || [],
      nounLexiconMatches: (queryPlan?.nounLexiconMatches || []).map(entry => ({
        term: entry.term,
        normalized: entry.normalized,
        weight: Number(entry.weight) || 0,
        routeHints: Array.isArray(entry.routeHints) ? entry.routeHints : [],
      })),
      preferredModuleTypes: queryPlan?.preferredModuleTypes || [],
      preferredPathPrefixes: queryPlan?.preferredPathPrefixes || [],
      needsSourceSearch: queryPlan?.needsSourceSearch === true,
      needsKnowledgeSearch: queryPlan?.needsKnowledgeSearch !== false,
      needsCallGraph: queryPlan?.needsCallGraph === true,
      answerMode: queryPlan?.answerMode || '',
      sourcePreference: queryPlan?.sourcePreference || '',
    },
    sourceSearch: {
      enabled: sourceReadEnabled === true,
      executed: shouldSourceSearch === true,
      ingestEnabled: sourceIngestEnabled === true,
    },
    candidates: {
      knowledgeMatches: knowledgeMatches.map(toTraceCandidate),
      sourceDirectoryHits: sourceDirectoryHits.map(toTraceCandidate),
      sourceSymbolHits: sourceSymbolHits.map(toTraceCandidate),
      sourceIndexHits: sourceIndexHits.map(toTraceCandidate),
      sourceContextHits: sourceHits.map(toTraceCandidate),
      finalMatches: matches.map(toTraceCandidate),
    },
    evidence,
    diagnostics: summarizeLocalDiagnosticsForTrace(diagnostics),
    suggestions: summarizeThreeStepSuggestionsForTrace(threeStepSuggestions),
    model: modelTrace,
    outputGuard: outputGuard
      ? {
          blocked: outputGuard.blocked === true,
          reasons: Array.isArray(outputGuard.reasons) ? outputGuard.reasons : [],
          originalProvider: outputGuard.originalProvider || '',
        }
      : undefined,
    timings,
    finalAnswer: answer,
  };
}

function retrieveKnowledge(question, routeName, mode, queryPlan = null) {
  if (queryPlan && queryPlan.needsKnowledgeSearch === false) return [];

  const list = getPublishedKnowledgeEntries().filter(entry => !(mode === 'strict' && entry.access === 'standard'));
  const structuredMatches = retrieveStructuredKnowledge(question, routeName, queryPlan || {});
  const scored = [...structuredMatches, ...list]
    .map(entry => ({ ...entry, score: Number(entry.score) || scoreEntry(entry, question, routeName) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, queryPlan?.answerMode === 'code' ? 2 : 4);

  if (scored.length > 0) return scored;

  if (routeName) {
    const fallbackEntry = list.find(entry => entry.routeNames.includes(routeName));
    if (fallbackEntry) return [{ ...fallbackEntry, score: 1 }];
  }

  const overview = list.find(entry => entry.id === 'overview');
  return overview ? [{ ...overview, score: 1 }] : [];
}

function normalizeTemplateItems(items = [], maxItems = 4) {
  return unique(
    toArray(items)
      .map(item => String(item || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  ).slice(0, maxItems);
}

function formatTemplateItems(items = [], maxItems = 4) {
  return normalizeTemplateItems(items, maxItems)
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');
}

function composePlayerTemplateAnswer({
  intro = '',
  legacyLead = '',
  conclusion = '',
  reasons = [],
  steps = [],
  cautions = [],
  evidence = [],
  related = [],
}) {
  const sections = [];
  if (intro) sections.push(intro);
  if (legacyLead) sections.push(legacyLead);
  sections.push(`结论：${String(conclusion || '我暂时无法确认，需要更具体的问题或页面线索。').trim()}`);

  const reasonText = formatTemplateItems(reasons, 4);
  if (reasonText) sections.push(`原因：\n${reasonText}`);

  const stepText = formatTemplateItems(steps, 5);
  if (stepText) sections.push(`步骤：\n${stepText}`);

  const cautionText = formatTemplateItems(cautions, 4);
  if (cautionText) sections.push(`注意事项：\n${cautionText}`);

  const evidenceText = formatTemplateItems(evidence, 4);
  if (evidenceText) sections.push(`依据：\n${evidenceText}`);

  const relatedText = formatTemplateItems(related, 3);
  if (relatedText) sections.push(`相关：\n${relatedText}`);

  return sections.filter(Boolean).join('\n\n');
}

function getTemplateStrictModeCautions(mode) {
  return mode === 'strict'
    ? ['当前是严格模式：只使用玩家可见的公开资料或公开状态摘要，不提供隐藏数值、不公开规则或敏感信息。']
    : [];
}

function getResourceSourceTypeLabel(type = '') {
  const normalized = String(type || '').trim();
  return RESOURCE_SOURCE_TYPE_LABELS[normalized] || normalized || '来源';
}

function formatResourceLookupRecord(record = {}) {
  const typeLabel = getResourceSourceTypeLabel(record.type);
  const detail = formatStructuredKnowledgeRecords([record])[0] || [record.label, record.detail].filter(Boolean).join('，');
  return detail ? `【${typeLabel}】${detail}` : '';
}

function pickFastResourceSourceRecord(entry = {}) {
  const records = (entry.sources || []).filter(item => item?.label || item?.detail);
  if (!records.length) return null;
  return [...records].sort((a, b) => {
    const aIndex = RESOURCE_SOURCE_PRIORITY.includes(a.type) ? RESOURCE_SOURCE_PRIORITY.indexOf(a.type) : 999;
    const bIndex = RESOURCE_SOURCE_PRIORITY.includes(b.type) ? RESOURCE_SOURCE_PRIORITY.indexOf(b.type) : 999;
    return aIndex - bIndex;
  })[0];
}

function shouldUseResourceLookupAnswer(entry = {}, queryPlan = {}, question = '') {
  if (!RESOURCE_LOOKUP_KINDS.has(entry.kind)) return false;
  const types = new Set(queryPlan?.questionTypes || []);
  const intents = new Set(queryPlan?.intents || []);
  return (
    types.has('resource-source')
    || types.has('shop-purchase')
    || types.has('precondition')
    || types.has('recipe')
    || intents.has('find_source')
    || /来源|从哪来|哪来|怎么获得|怎么获取|怎么拿|怎么搞|怎么弄|怎么做|制作|配方|最快|推荐路线|哪里|在哪|去哪|哪买|购买|采集|掉落|产出|解锁/i.test(question)
  );
}

function buildStructuredUnlockStatus(entry = {}, contextSnapshot = null, routeName = '') {
  const context = getContextObject(contextSnapshot);
  const baseState = getContextObject(context?.baseState) || getContextObject(context?.base);
  const currentRouteName = normalizeContextText(baseState?.currentRouteName || context?.currentRouteName || routeName, 40);
  const currentRouteLabel = normalizeContextText(baseState?.currentPageLabel || ROUTE_LABELS[currentRouteName] || '', 60);
  const relatedToCurrentRoute = currentRouteName && (entry.routeHints || []).includes(currentRouteName);
  const publicCondition = entry.unlock || '公开资料没有给出明确解锁条件。';

  if (relatedToCurrentRoute) {
    return `当前是否已解锁：当前问题来自【${currentRouteLabel || ROUTE_LABELS[currentRouteName] || currentRouteName}】相关入口，我只能确认它与该资源路线相关；实际资源、商品、建筑或配方是否已满足，以页面可见状态为准。公开条件：${publicCondition}`;
  }

  if (context) {
    return `当前是否已解锁：当前只读摘要里没有该资源的明确解锁标记，我不会臆造。公开条件：${publicCondition}`;
  }

  return `当前是否已解锁：本次没有收到玩家可见的解锁摘要，我不会臆造。公开条件：${publicCondition}`;
}

function buildResourceFastRoute(entry = {}) {
  if (entry.fastRoute) return entry.fastRoute;
  const record = pickFastResourceSourceRecord(entry);
  if (record) return formatResourceLookupRecord(record);
  return '资料不足，暂时不能判断最快路线。';
}

function buildResourceRecommendedRoute(entry = {}) {
  if (entry.recommendedRoute) return entry.recommendedRoute;
  const record = pickFastResourceSourceRecord(entry);
  const routeLabels = unique((entry.routeHints || []).map(routeName => ROUTE_LABELS[routeName] || routeName).filter(Boolean));
  if (record) {
    const sourceText = formatResourceLookupRecord(record);
    return routeLabels.length
      ? `优先走${sourceText}；如果入口未出现，再去${routeLabels.slice(0, 3).join('、')}核对前置。`
      : `优先走${sourceText}；如果入口未出现，以对应页面的公开前置为准。`;
  }
  return routeLabels.length
    ? `先查看${routeLabels.slice(0, 3).join('、')}，目前资料不足以给出更快路线。`
    : '资料不足，暂时只能建议补充物品名、当前页面或任务目标后再查。';
}

function composeResourceLookupAnswer({ question, contextLabel, entry, supplements = [], mode, queryPlan = {}, contextSnapshot = null }) {
  const sources = (entry.sources || []).map(formatResourceLookupRecord).filter(Boolean);
  const uses = formatStructuredKnowledgeRecords(entry.uses || []);
  const sourceTypeLabels = unique((entry.sources || []).map(item => getResourceSourceTypeLabel(item.type)).filter(Boolean));
  const routeHints = unique((entry.routeHints || []).map(routeName => ROUTE_LABELS[routeName] || routeName).filter(Boolean));
  const fastRoute = buildResourceFastRoute(entry);
  const unlockStatus = buildStructuredUnlockStatus(entry, contextSnapshot, queryPlan.routeName || '');
  const recommendedRoute = buildResourceRecommendedRoute(entry);
  const routeSteps = entry.routeSteps?.length
    ? entry.routeSteps.map(item => `推荐路线：${item}`)
    : [`推荐路线：${recommendedRoute}`];

  return composePlayerTemplateAnswer({
    intro: contextLabel ? `你当前大概率在【${contextLabel}】相关场景。` : '',
    legacyLead: `关于“${question}”，我先按结构化公开资料回答：${entry.title}。`,
    conclusion: `资源反查：${entry.title}。${entry.summary || '可以先按公开资料确认来源、解锁条件和推荐路线。'}`,
    reasons: [
      `命中了结构化资源索引：${entry.title}`,
      sourceTypeLabels.length ? `来源类型：${sourceTypeLabels.join('、')}。` : '当前资料没有足够来源记录。',
      routeHints.length ? `关联页面：${routeHints.slice(0, 3).join('、')}。` : '',
      uses.length ? `用途线索：${uses.slice(0, 2).join('；')}` : '',
    ],
    steps: [
      sources.length ? `来源：\n${sources.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '来源：资料不足，暂时不能确认公开来源。',
      `最快路线：${fastRoute}`,
      unlockStatus,
      ...routeSteps,
    ],
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      '如果当前页面没有出现对应入口、商品或配方，以玩家可见页面为准；我不会根据隐藏进度臆造已解锁。',
    ],
    evidence: [
      `结构化公开资料回答：${entry.title}`,
      sources.length ? `来源：${sources.slice(0, 3).join('；')}` : '来源资料不足。',
      entry.unlock ? `公开解锁条件：${entry.unlock}` : '',
      `最快路线：${fastRoute}`,
      `推荐路线：${recommendedRoute}`,
    ],
    related: supplements.map(item => `${item.structuredEntry?.title || item.title}：${item.structuredEntry?.summary || item.content}`),
  });
}

function getStructuredTemplateSteps(entry = {}, queryPlan = {}, question = '') {
  const types = new Set(queryPlan?.questionTypes || []);
  const intents = new Set(queryPlan?.intents || []);
  const sourceRecords = formatStructuredKnowledgeRecords(entry.sources || []);
  const useRecords = formatStructuredKnowledgeRecords(entry.uses || []);
  const wantsSource = types.has('resource-source') || intents.has('find_source') || /来源|从哪来|怎么获得|怎么获取|哪里|在哪|去哪|哪买|钓|挖|种/.test(question);
  const wantsUse = types.has('resource-use') || intents.has('explain_usage') || /用途|有什么用|用来|需要|消耗|能做什么|任务|要几个|要多少/.test(question);
  const wantsSystem = types.has('system-mechanic') || types.has('page-feature') || intents.has('explain_system') || intents.has('explain_page') || /怎么玩|页面|系统|机制/.test(question);

  const steps = [];
  if (wantsSource && sourceRecords.length) {
    steps.push(...sourceRecords.slice(0, 3).map(item => `获取路径：${item}`));
  }
  if ((wantsUse || wantsSystem) && useRecords.length) {
    steps.push(...useRecords.slice(0, 3).map(item => `使用/推进：${item}`));
  }
  if (!steps.length && sourceRecords.length) {
    steps.push(...sourceRecords.slice(0, 2).map(item => `先确认：${item}`));
  }
  if (!steps.length && useRecords.length) {
    steps.push(...useRecords.slice(0, 2).map(item => `可关注：${item}`));
  }

  const routeHints = unique((entry.routeHints || []).map(item => ROUTE_LABELS[item] || item).filter(Boolean));
  if (routeHints.length) steps.push(`建议查看：${routeHints.slice(0, 3).join('、')}。`);
  return steps;
}

function composeStructuredKnowledgeAnswer({ question, contextLabel, matches, mode, queryPlan = {}, contextSnapshot = null }) {
  const [first, ...rest] = matches;
  const entry = first?.structuredEntry;
  if (!entry) return '';

  const supplements = rest
    .filter(item => item?.sourceType === 'structured-knowledge')
    .slice(0, 2);
  if (shouldUseResourceLookupAnswer(entry, queryPlan, question)) {
    return composeResourceLookupAnswer({
      question,
      contextLabel,
      entry,
      supplements,
      mode,
      queryPlan,
      contextSnapshot,
    });
  }

  const sources = formatStructuredKnowledgeRecords(entry.sources || []);
  const uses = formatStructuredKnowledgeRecords(entry.uses || []);
  const routeHints = unique((entry.routeHints || []).map(routeName => ROUTE_LABELS[routeName] || routeName).filter(Boolean));
  const relationLabels = (entry.relations || []).slice(0, 6);

  return composePlayerTemplateAnswer({
    intro: contextLabel ? `你当前大概率在【${contextLabel}】相关场景。` : '',
    legacyLead: `关于“${question}”，我先按结构化公开资料回答：${entry.title}。`,
    conclusion: entry.summary || `可以先按公开资料确认「${entry.title}」的来源、用途和关联页面。`,
    reasons: [
      `命中了结构化公开资料：${entry.title}`,
      sources.length ? `资料中有 ${sources.length} 条来源记录。` : '',
      uses.length ? `资料中有 ${uses.length} 条用途或推进记录。` : '',
      routeHints.length ? `关联页面：${routeHints.slice(0, 3).join('、')}。` : '',
    ],
    steps: getStructuredTemplateSteps(entry, queryPlan, question),
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      relationLabels.length ? `关联对象可作为后续追问线索：${relationLabels.join('、')}。` : '',
    ],
    evidence: [
      `结构化公开资料回答：${entry.title}`,
      sources.length ? `来源：${sources.slice(0, 2).join('；')}` : '',
      uses.length ? `用途：${uses.slice(0, 2).join('；')}` : '',
    ],
    related: supplements.map(item => `${item.structuredEntry?.title || item.title}：${item.structuredEntry?.summary || item.content}`),
  });
}

function buildClarificationOptions(queryPlan = {}, routeName = '') {
  const options = queryPlan?.clarification?.options?.length
    ? queryPlan.clarification.options
    : [
        '你想查某个物品从哪来吗？',
        '你想看某个任务卡在哪里吗？',
        '你想了解当前页面或系统怎么玩吗？',
      ];
  const routeLabels = unique([
    routeName,
    ...(queryPlan?.routeHints || []),
  ].map(item => ROUTE_LABELS[item] || item).filter(Boolean));
  return {
    options: options.slice(0, 3),
    routeLabels: routeLabels.slice(0, 2),
  };
}

function composeClarificationAnswer({ question, intro, queryPlan, routeName = '' }) {
  const { options, routeLabels } = buildClarificationOptions(queryPlan, routeName);
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我还没识别出明确的物品、任务、NPC、地点或系统。`,
    conclusion: '我需要一个更具体的对象、系统或目标，才能给出可执行路线。',
    reasons: [
      '本地意图识别没有命中明确对象。',
      '当前问题缺少可匹配的物品、任务、NPC、地点或系统名。',
    ],
    steps: [
      ...options,
      routeLabels.length ? `也可以先打开这些相关页面再追问：${routeLabels.join('、')}。` : '',
    ],
    cautions: ['尽量带上物品名、任务名、NPC 名或当前页面，这样可以直接给出步骤。'],
    evidence: ['本地槽位抽取未命中明确对象。'],
  });
}

function composeNoMatchAnswer({ question, intro, queryPlan, routeName, mode }) {
  const { options, routeLabels } = buildClarificationOptions(queryPlan, routeName);
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我暂时无法从当前整理的公开游戏资料中确认答案。`,
    conclusion: '可以先补充更具体的对象，或换成来源、任务、页面玩法这类问题。',
    reasons: ['当前公开知识库没有找到足够匹配的条目。'],
    steps: [
      ...options,
      routeLabels.length ? `推荐先查看：${routeLabels.join('、')}。` : '也可以问“当前页面主要做什么”来获取页面级建议。',
    ],
    cautions: getTemplateStrictModeCautions(mode),
    evidence: ['本地知识检索无可用命中。'],
  });
}

function composeLocalAnswer({ question, routeName, contextLabel, matches, mode, queryPlan = null, diagnostics = {}, contextSnapshot = null }) {
  const intro = contextLabel
    ? `你当前大概率在【${contextLabel}】相关场景。`
    : routeName && ROUTE_LABELS[routeName]
      ? `你当前大概率在【${ROUTE_LABELS[routeName]}】相关场景。`
      : '';

  const resolvedQueryPlan = resolveQueryPlan(queryPlan || question, routeName);
  const structuredMatches = matches.filter(item => item?.sourceType === 'structured-knowledge');
  const firstStructuredEntry = structuredMatches[0]?.structuredEntry;
  const hasQuestionItemSlot = (resolvedQueryPlan.slots?.items || []).length > 0;
  if (shouldUseTaskDiagnosisAnswer(question, resolvedQueryPlan, diagnostics)) {
    const taskAnswer = composeTaskDiagnosisAnswer({
      question,
      intro,
      taskDiagnosis: diagnostics.taskDiagnosis,
      mode,
    });
    if (taskAnswer) return taskAnswer;
  }
  if (
    structuredMatches.length
    && resolvedQueryPlan.answerMode !== 'code'
    && resolvedQueryPlan.sourcePreference !== 'strong'
    && firstStructuredEntry
    && hasQuestionItemSlot
    && shouldUseResourceLookupAnswer(firstStructuredEntry, resolvedQueryPlan, question)
  ) {
    return composeStructuredKnowledgeAnswer({
      question,
      contextLabel,
      matches: structuredMatches,
      mode,
      queryPlan: resolvedQueryPlan,
      contextSnapshot,
    }) || '';
  }

  if (shouldUseLocalDiagnostics(question, resolvedQueryPlan, diagnostics)) {
    return composeLocalDiagnosticsAnswer({ question, intro, diagnostics, mode, queryPlan: resolvedQueryPlan });
  }

  if (
    resolvedQueryPlan.clarification?.required
    && resolvedQueryPlan.answerMode !== 'code'
    && resolvedQueryPlan.sourcePreference !== 'strong'
  ) {
    return composeClarificationAnswer({ question, intro, queryPlan: resolvedQueryPlan, routeName });
  }

  const fullFileMatches = matches.filter(item => item?.sourceType === 'source-fullfile');
  const directoryMatches = matches.filter(item => item?.sourceType === 'source-directory');

  if (
    structuredMatches.length
    && resolvedQueryPlan.answerMode !== 'code'
    && resolvedQueryPlan.sourcePreference !== 'strong'
    && (
      resolvedQueryPlan.primaryIntent === 'find_source'
      || resolvedQueryPlan.primaryIntent === 'gameplay_qa'
      || (resolvedQueryPlan.intents || []).some(intent => ['explain_usage', 'diagnose_task', 'explain_page', 'explain_system', 'suggest_next_step'].includes(intent))
      || (resolvedQueryPlan.questionTypes || []).some(type => ['resource-use', 'task-diagnosis', 'page-explanation', 'system-mechanic', 'page-feature', 'next-step-suggestion'].includes(type))
      || /来源|从哪来|怎么获得|怎么获取|用途|有什么用|配方|料理|任务|需要|哪里|在哪|哪买|怎么玩|页面|系统|机制|下一步/i.test(question)
    )
  ) {
    return composeStructuredKnowledgeAnswer({
      question,
      contextLabel,
      matches: structuredMatches,
      mode,
      queryPlan: resolvedQueryPlan,
      contextSnapshot,
    }) || '';
  }

  if (!matches.length) {
    return composeNoMatchAnswer({ question, intro, queryPlan: resolvedQueryPlan, routeName, mode });
  }

  const [first, ...rest] = matches;

  if (resolvedQueryPlan.answerMode === 'code' || resolvedQueryPlan.sourcePreference === 'strong') {
    const sections = [];
    if (intro) sections.push(intro);
    sections.push(`关于“${question}”，我优先按命中的源码文件回答。`);

    if (directoryMatches.length) {
      sections.push(
        directoryMatches
          .slice(0, 1)
          .map(item => `${item.title}\n\n${item.content}`)
          .join('\n\n')
      );
    }

    if (fullFileMatches.length) {
      sections.push(
        fullFileMatches
          .slice(0, 2)
          .map((item, index) => [
            `命中文件 ${index + 1}：${item.path}`,
            item.originTitle ? `命中依据：${item.originTitle}` : '',
            item.symbol ? `关联符号：${item.symbol}${item.lineNumber ? `（第 ${item.lineNumber} 行附近）` : ''}` : '',
            item.content,
          ].filter(Boolean).join('\n\n'))
          .join('\n\n')
      );
    } else {
      sections.push(`最相关证据：\n\n${first.content}`);
    }

    const supplementary = rest
      .filter(item => item?.sourceType !== 'source-fullfile' && item?.sourceType !== 'source-directory')
      .slice(0, 2);
    if (supplementary.length) {
      sections.push(
        '补充线索：\n' + supplementary.map((item, index) => `${index + 1}. ${item.title}：${item.content}`).join('\n')
      );
    }

    if (mode === 'strict') {
      sections.push('当前是严格模式：涉及隐藏数值、掉率、风控、后台规则或敏感实现的内容不会提供。');
    }

    return sections.filter(Boolean).join('\n\n');
  }

  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，根据当前可用的桃源乡资料：`,
    conclusion: first.content,
    reasons: [
      `命中公开资料：${first.title}`,
      first.routeHints?.length ? `关联页面：${first.routeHints.map(item => ROUTE_LABELS[item] || item).filter(Boolean).slice(0, 3).join('、')}。` : '',
    ],
    steps: [
      first.content,
      ...rest.slice(0, 2).map(item => `${item.title}：${item.content}`),
    ],
    cautions: getTemplateStrictModeCautions(mode),
    evidence: [
      first.title,
      ...rest.slice(0, 2).map(item => item.title),
    ],
  });
}

function buildChatCompletionsUrl(apiUrl) {
  const trimmed = String(apiUrl || '').trim();
  if (!trimmed) return '';
  const validation = validateModelApiUrl(trimmed);
  const normalized = validation.url.href.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  return `${normalized}/chat/completions`;
}

function extractModelText(data) {
  const choiceContent = data?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string') return choiceContent.trim();
  if (Array.isArray(choiceContent)) {
    return choiceContent
      .map(item => (typeof item?.text === 'string' ? item.text : typeof item === 'string' ? item : ''))
      .join('')
      .trim();
  }
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  if (Array.isArray(data?.content)) {
    return data.content
      .map(item => (typeof item?.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }
  return '';
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function callRemoteModel({ question, contextLabel, mode, snippets, queryPlan = null }) {
  const adminConfig = getAdminConfig();
  const url = buildChatCompletionsUrl(adminConfig.apiUrl);
  if (!url || !adminConfig.model) {
    throw createError('未配置可用的大模型接口', 400);
  }

  const evidence = buildEvidencePayload(snippets);
  const knowledgeText = evidence.length ? JSON.stringify(evidence, null, 2) : '[]';

  const systemPrompt =
    adminConfig.systemPrompt ||
    '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答；如果资料不足，请明确说不知道，不要编造。';

  const userPrompt = [
    `回答模式：${mode === 'standard' ? '标准模式' : '严格模式'}`,
    `当前页面：${contextLabel || '未知页面'}`,
    `问题意图：${queryPlan?.intents?.join(' / ') || '未识别'}`,
    `页面提示：${queryPlan?.routeHints?.join(' / ') || '无'}`,
    `需要调用关系检索：${queryPlan?.needsCallGraph ? '是' : '否'}`,
    '请只依据以下资料回答玩家问题，不要补充资料之外的隐藏设定或后台规则。',
    '',
    '【证据片段】',
    knowledgeText,
    '',
    '【玩家问题】',
    question,
    '',
    '【回答要求】',
    '1. 先判断证据是否足够；证据不足时明确说明“我暂时无法确认”。',
    '2. 如果资料不足，请明确说“我暂时无法确认”。',
    '3. 严格模式下，禁止回答掉率、隐藏数值、风控、后台实现、密钥和管理规则。',
    '4. 回答尽量简洁、面向玩家、可执行。',
    '5. 如果问题是找文件、找定义、找实现、找条件、找调用，请优先给出文件路径、符号名或位置，再解释。',
    '6. evidence_ids 只能使用上方证据片段里真实存在的 evidence_id；没有依据时返回空数组。',
    '7. matched_files 只能使用上方证据片段里真实存在的 path；没有文件依据时返回空数组。',
    '8. actions 只允许安全轻动作：navigate、open_page、open_mail、open_activity、open_quest、copy_checklist、expand_page、mark_goal；没有安全动作时返回空数组。',
    '9. 只输出一个 JSON 对象，不要使用 Markdown 代码块，格式如下：',
    '{"intent":"问题意图","answer":"给玩家的最终回答","evidence_ids":["E1"],"matched_files":["路径"],"uncertain_points":["仍不确定的点"],"actions":[]}',
  ].join('\n');

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = getEffectiveApiKeySecret();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const fetchController = new AbortController();
  const fetchTimeout = setTimeout(() => fetchController.abort(), 60000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      signal: fetchController.signal,
      body: JSON.stringify({
        model: adminConfig.model,
        temperature: adminConfig.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw createError('远程模型响应超时（60s）', 504);
    throw err;
  } finally {
    clearTimeout(fetchTimeout);
  }

  const data = await safeJson(res);
  if (!res.ok) {
    throw createError(data?.error?.message || data?.msg || '调用远程模型失败', 502);
  }

  const rawText = extractModelText(data);
  if (!rawText) throw createError('远程模型未返回有效内容', 502);

  const structured = validateModelStructuredOutput(rawText, evidence);
  return {
    answer: structured.answer,
    rawOutput: rawText,
    structured,
  };
}

const MAX_QUESTION_LENGTH = 1200;
const AI_CONTEXT_MAX_LINES = 64;
const AI_CONTEXT_MAX_TEXT_LENGTH = 3600;

const AI_CONTEXT_TIME_PERIOD_LABELS = Object.freeze({
  morning: '上午',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜晚',
  late_night: '深夜',
});

function getContextObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

const AI_CONTEXT_SENSITIVE_TEXT_PATTERNS = [
  ...OUTPUT_SECRET_PATTERNS,
  ...OUTPUT_INTERNAL_PATH_PATTERNS,
  /(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌)/i,
  /(?:后台规则|后台配置|风控|隐藏掉率|完整源码|源码文件|process\.env)/i,
  /(?:adminCompensationAuditId|internalReceiptIdempotencyKey|hiddenRiskRule|hiddenDropRateFixture|backend_rule_fixture)/i,
];

function containsSensitiveContextText(value = '') {
  const text = String(value || '');
  if (!text) return false;
  return AI_CONTEXT_SENSITIVE_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

function normalizeContextText(value, maxLength = 80) {
  if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return '';
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (containsSensitiveContextText(text)) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeContextNumber(value, integer = true) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return integer ? Math.floor(numberValue) : numberValue;
}

function normalizeContextList(value, maxItems = 4, maxLength = 60) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => normalizeContextText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function pushContextLine(lines, label, value, maxLength = 80) {
  const text = normalizeContextText(value, maxLength);
  if (text) lines.push(`${label}：${text}`);
}

function pushContextList(lines, label, value, maxItems = 4, maxLength = 60) {
  const items = normalizeContextList(value, maxItems, maxLength);
  if (items.length > 0) lines.push(`${label}：${items.join('、')}`);
}

function finalizeContextSnapshotText(lines = []) {
  const safeLines = [];
  let usedLength = 0;
  for (const line of lines) {
    const text = normalizeContextText(line, 240);
    if (!text) continue;
    const projectedLength = usedLength + text.length + (safeLines.length > 0 ? 3 : 0);
    if (safeLines.length >= AI_CONTEXT_MAX_LINES || projectedLength > AI_CONTEXT_MAX_TEXT_LENGTH) {
      safeLines.push('上下文已按公开字段白名单截断');
      break;
    }
    safeLines.push(text);
    usedLength = projectedLength;
  }
  return safeLines.join(' / ');
}

const LOCAL_DIAGNOSTIC_MAX_SIGNALS = 12;
const LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS = 5;
const TASK_DIAGNOSIS_MAX_TASKS = 8;
const TASK_DIAGNOSIS_MAX_CHECKS = 8;
const LOCAL_DIAGNOSTIC_CATEGORY_LABELS = {
  'season-risk': '换季风险',
  'water-risk': '缺水风险',
  'stamina-low': '体力压力',
  'cash-low': '现金压力',
  'bag-nearly-full': '背包压力',
  'task-shortage': '任务缺口',
  'building-bottleneck': '建筑瓶颈',
  'tool-bottleneck': '工具瓶颈',
  'claimable-reward': '可领奖励',
  'online-alert': '在线提醒',
  'late-game-alert': '中后期提醒',
};

function clampDiagnosticDimension(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(5, Math.round(numberValue)));
}

function normalizeDiagnosticDimensions(dimensions = {}) {
  return {
    urgency: clampDiagnosticDimension(dimensions.urgency),
    benefit: clampDiagnosticDimension(dimensions.benefit),
    unlockValue: clampDiagnosticDimension(dimensions.unlockValue),
    risk: clampDiagnosticDimension(dimensions.risk),
    staminaCost: clampDiagnosticDimension(dimensions.staminaCost),
    moneyPressure: clampDiagnosticDimension(dimensions.moneyPressure),
    taskValue: clampDiagnosticDimension(dimensions.taskValue),
  };
}

function scoreLocalDiagnostic(dimensions = {}) {
  const d = normalizeDiagnosticDimensions(dimensions);
  return Math.max(1, Math.round(
    d.urgency * 18
    + d.benefit * 10
    + d.unlockValue * 12
    + d.risk * 15
    + d.moneyPressure * 9
    + d.taskValue * 16
    - d.staminaCost * 4
  ));
}

function buildLocalDiagnosticReasons(dimensions = {}) {
  const d = normalizeDiagnosticDimensions(dimensions);
  const reasons = [];
  if (d.urgency >= 4) reasons.push('紧急度高');
  else if (d.urgency >= 2) reasons.push('有时间价值');
  if (d.benefit >= 4) reasons.push('收益明确');
  else if (d.benefit >= 2) reasons.push('收益稳定');
  if (d.unlockValue >= 4) reasons.push('解锁价值高');
  else if (d.unlockValue >= 2) reasons.push('有解锁价值');
  if (d.risk >= 4) reasons.push('风险高');
  else if (d.risk >= 2) reasons.push('可降低风险');
  if (d.moneyPressure >= 4) reasons.push('现金压力大');
  else if (d.moneyPressure >= 2) reasons.push('会影响现金流');
  if (d.taskValue >= 4) reasons.push('任务推进价值高');
  else if (d.taskValue >= 2) reasons.push('有任务推进价值');
  if (d.staminaCost >= 4) reasons.push('体力成本高，需先控体力');
  return reasons.length ? reasons : ['当前状态有可处理信号'];
}

function createLocalDiagnosticSignal(input = {}) {
  const category = String(input.category || '').trim();
  const title = normalizeContextText(input.title, 80);
  const detail = normalizeContextText(input.detail, 160);
  const recommendation = normalizeContextText(input.recommendation, 160);
  if (!category || !title || !detail || !recommendation) return null;
  const dimensions = normalizeDiagnosticDimensions(input.dimensions || {});
  const score = scoreLocalDiagnostic(dimensions) + Math.max(0, Number(input.boost) || 0);
  const routeName = String(input.routeName || '').trim();
  return {
    id: String(input.id || `${category}:${normalizeText(title)}`).slice(0, 120),
    category,
    categoryLabel: LOCAL_DIAGNOSTIC_CATEGORY_LABELS[category] || category,
    title,
    detail,
    recommendation,
    routeName,
    routeLabel: normalizeContextText(input.routeLabel || ROUTE_LABELS[routeName] || routeName, 40),
    source: normalizeContextText(input.source || '当前状态摘要', 40),
    dimensions,
    score,
    reasons: buildLocalDiagnosticReasons(dimensions),
  };
}

function pushLocalDiagnosticSignal(signals, input = {}) {
  const signal = createLocalDiagnosticSignal(input);
  if (!signal) return;
  if (signals.some(item => item.id === signal.id || normalizeText(item.title) === normalizeText(signal.title))) return;
  signals.push(signal);
}

function parseContextRatioLabel(value = '') {
  const text = String(value || '');
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const current = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
  return { current, total, ratio: current / total };
}

function contextTextLooksUrgent(value = '') {
  return /剩|倒计时|快到期|待确认|待处理|可领|待领|缺|不足|风险|病|满|临近/.test(String(value || ''));
}

function getLocalDiagnosticQueryBoost(signal = {}, queryPlan = {}, routeName = '') {
  let boost = 0;
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  if ((types.has('task-diagnosis') || intents.has('diagnose_task')) && signal.category === 'task-shortage') boost += 24;
  if ((types.has('today-planning') || intents.has('plan_today')) && ['season-risk', 'task-shortage', 'claimable-reward', 'online-alert', 'bag-nearly-full'].includes(signal.category)) boost += 12;
  if ((types.has('risk-reminder') || intents.has('remind_risk')) && ['season-risk', 'water-risk', 'bag-nearly-full', 'stamina-low', 'cash-low', 'online-alert'].includes(signal.category)) boost += 18;
  if ((types.has('next-step-suggestion') || intents.has('suggest_next_step')) && ['building-bottleneck', 'tool-bottleneck', 'task-shortage', 'late-game-alert'].includes(signal.category)) boost += 12;
  if (routeName && signal.routeName === routeName) boost += 8;
  return boost;
}

function sanitizeDiagnosticSignals(signals = [], queryPlan = {}, routeName = '') {
  return signals
    .map(signal => ({ ...signal, score: signal.score + getLocalDiagnosticQueryBoost(signal, queryPlan, routeName) }))
    .sort((a, b) => b.score - a.score || b.dimensions.urgency - a.dimensions.urgency || b.dimensions.taskValue - a.dimensions.taskValue)
    .slice(0, LOCAL_DIAGNOSTIC_MAX_SIGNALS);
}

const TASK_DIAGNOSIS_KIND_LABELS = {
  accepted: '接取状态',
  objective: '目标',
  inventory: '库存',
  delivery: '交付对象/地点',
  quantity: '数量',
  precondition: '前置',
  time: '时间',
  season: '季节',
  building: '建筑等级',
};

const TASK_DIAGNOSIS_KIND_ORDER = [
  'accepted',
  'objective',
  'inventory',
  'delivery',
  'quantity',
  'precondition',
  'time',
  'season',
  'building',
];

const TASK_DIAGNOSIS_STATUS_LABELS = {
  blocked: '阻塞',
  ready: '已满足',
  unknown: '未确认',
};

function normalizeTaskDiagnosisText(value, maxLength = 120) {
  return normalizeContextText(value, maxLength);
}

function taskDiagnosisStatusRank(status = '') {
  if (status === 'blocked') return 3;
  if (status === 'unknown') return 2;
  if (status === 'ready') return 1;
  return 0;
}

function getTaskDiagnosisKindRank(kind = '') {
  const index = TASK_DIAGNOSIS_KIND_ORDER.indexOf(kind);
  return index >= 0 ? index : TASK_DIAGNOSIS_KIND_ORDER.length;
}

function createTaskDiagnosisCheck(input = {}) {
  const kind = String(input.kind || '').trim();
  if (!TASK_DIAGNOSIS_KIND_LABELS[kind]) return null;
  const status = ['blocked', 'ready', 'unknown'].includes(input.status) ? input.status : 'unknown';
  const detail = normalizeTaskDiagnosisText(input.detail, 180);
  const nextStep = normalizeTaskDiagnosisText(input.nextStep, 220);
  if (!detail && !nextStep) return null;
  const routeName = String(input.routeName || 'quest').trim();
  return {
    id: String(input.id || `${kind}:${normalizeText(detail || nextStep)}`).slice(0, 120),
    kind,
    label: TASK_DIAGNOSIS_KIND_LABELS[kind],
    status,
    statusLabel: TASK_DIAGNOSIS_STATUS_LABELS[status] || '未确认',
    detail,
    nextStep,
    routeName,
    routeLabel: normalizeTaskDiagnosisText(input.routeLabel || ROUTE_LABELS[routeName] || routeName, 40),
    source: normalizeTaskDiagnosisText(input.source || '当前任务摘要', 40),
    itemName: normalizeTaskDiagnosisText(input.itemName, 60),
    quantityText: normalizeTaskDiagnosisText(input.quantityText, 40),
  };
}

function pushTaskDiagnosisCheck(checks, input = {}) {
  const check = createTaskDiagnosisCheck(input);
  if (!check) return;
  if (checks.some(item => item.id === check.id || (item.kind === check.kind && normalizeText(item.detail) === normalizeText(check.detail)))) return;
  checks.push(check);
}

function inferTaskDiagnosisTitle(value = '', fallback = '当前任务') {
  const text = normalizeTaskDiagnosisText(value, 120);
  if (!text) return fallback;
  const stripped = text
    .replace(/^(当前任务|告示板任务|主线任务|主线目标|特殊订单|限时任务|任务阻塞|任务缺口|资源缺口)[:：]\s*/u, '')
    .trim();
  const titleMatch = stripped.match(/^(.{2,28}?(?:任务|委托|订单|采购|交付|请求|主线|支线))/u);
  if (titleMatch) return normalizeTaskDiagnosisText(titleMatch[1], 80);
  const colonIndex = stripped.search(/[:：]/u);
  if (colonIndex > 0) return normalizeTaskDiagnosisText(stripped.slice(0, colonIndex), 80);
  return normalizeTaskDiagnosisText(stripped.split(/[，。；;]/u)[0], 80) || fallback;
}

function getTaskDiagnosisTargetTerms(queryPlan = {}) {
  const slots = queryPlan?.slots || {};
  return unique([
    ...(slots.tasks || []).flatMap(item => [item.label, item.canonical, item.match]),
    ...(slots.items || []).flatMap(item => [item.label, item.canonical, item.match]),
    ...(queryPlan.quotedTerms || []),
  ])
    .map(item => normalizeTaskDiagnosisText(item, 80))
    .filter(item => item && normalizeText(item).length >= 2)
    .slice(0, 8);
}

function taskDiagnosisTextMatchesTargets(text = '', targetTerms = []) {
  const normalizedText = normalizeText(text);
  if (!normalizedText || !targetTerms.length) return true;
  return targetTerms.some(term => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm && (normalizedText.includes(normalizedTerm) || normalizedTerm.includes(normalizedText));
  });
}

function extractTaskDiagnosisQuantityText(text = '') {
  const raw = String(text || '');
  const matches = [];
  const pattern = /(?:缺|差|还差|需要|要|交付|提交|收集|拥有|库存)?\s*(\d+|[一二两三四五六七八九十]{1,3})\s*(个|条|份|颗|块|封|单|只|棵|朵|张|组|次|点|文)?/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const value = parseChineseNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    matches.push(`${value}${match[2] || ''}`);
  }
  return unique(matches).slice(0, 3).join('、');
}

function findStructuredTaskResourceEntry(text = '', queryPlan = {}) {
  const normalizedText = normalizeText(text);
  const slotTerms = [
    ...(queryPlan?.slots?.items || []).flatMap(item => [item.label, item.canonical, item.match]),
  ].map(item => normalizeText(item)).filter(Boolean);
  const entries = getStructuredKnowledgeEntries();
  let best = null;
  for (const entry of entries) {
    if (!STRUCTURED_ITEM_KINDS.has(entry.kind)) continue;
    const terms = unique([entry.title, ...(entry.aliases || [])]).filter(Boolean);
    const matchedTerm = terms.find(term => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm && (
        normalizedText.includes(normalizedTerm)
        || slotTerms.some(slotTerm => slotTerm.includes(normalizedTerm) || normalizedTerm.includes(slotTerm))
      );
    });
    if (!matchedTerm) continue;
    const score = normalizeText(matchedTerm).length + ((entry.questionTypes || []).includes('task-diagnosis') ? 8 : 0);
    if (!best || score > best.score) best = { entry, score };
  }
  return best?.entry || null;
}

function buildTaskDiagnosisAcquisitionRoute({ kind = '', text = '', queryPlan = {} } = {}) {
  const entry = findStructuredTaskResourceEntry(text, queryPlan);
  if (entry && (kind === 'inventory' || kind === 'quantity')) {
    const route = entry.fastRoute || entry.recommendedRoute || buildResourceRecommendedRoute(entry);
    return normalizeTaskDiagnosisText(`补齐${entry.title}：${route}`, 220);
  }

  if (kind === 'accepted') return '先打开任务/告示板页面接取或追踪该任务，再回到当前任务列表确认目标。';
  if (kind === 'precondition') return '先打开任务关联的系统或前置页面，完成公开前置后再回任务页确认。';
  if (kind === 'season') return '先确认当前季节和任务要求；季节不符时改做不受季节限制的补材、采购或其他任务。';
  if (kind === 'time') return '先确认剩余时间、时段或截止日；时间不满足时改排可立即完成的目标。';
  if (kind === 'building') return '先打开建筑/家园/对应系统页面核对等级和材料，补齐升级条件后再回任务页。';
  if (kind === 'delivery') return '先确认交付对象或地点，再带齐物品去任务页、NPC 或对应建筑完成交付。';
  if (kind === 'objective') return '先在任务页核对目标描述，再按目标关联页面逐项完成。';
  return '先在任务页核对公开目标，再按缺口补资源或完成前置。';
}

function classifyTaskDiagnosisKinds(text = '', sourceKind = '') {
  const raw = String(text || '');
  const kinds = [];
  if (sourceKind === 'board') kinds.push('accepted');
  if (sourceKind === 'active' || sourceKind === 'main' || sourceKind === 'special' || sourceKind === 'limited') kinds.push('accepted');
  if (/未接取|未接|未领取|未接受|待接取|尚未接|告示板/.test(raw)) kinds.push('accepted');
  if (/前置|未解锁|解锁|入口未开|条件不足|需完成|需要完成|先完成/.test(raw)) kinds.push('precondition');
  if (/建筑|等级|鸡舍|牛棚|农舍|温室|鱼塘|育种棚|工坊|作坊|矿洞.*层|铁匠铺.*级/.test(raw)) kinds.push('building');
  if (/季节|春季|夏季|秋季|冬季|非.*季|不符|错过当季/.test(raw)) kinds.push('season');
  if (/时间|时段|上午|下午|傍晚|晚上|夜晚|剩|倒计时|截止|限时|过期|今天内|明天前/.test(raw)) kinds.push('time');
  if (/库存|背包|缺|差|还差|不足|物品|材料|资源/.test(raw)) kinds.push('inventory');
  if (/(\d+|[一二两三四五六七八九十]{1,3})\s*(个|条|份|颗|块|封|单|只|棵|朵|张|组|次|点|文)?/.test(raw)) kinds.push('quantity');
  if (/交付|提交|送给|给.*交|交给|地点|对象|NPC/.test(raw)) kinds.push('delivery');
  if (/目标|进度|完成|采集|收获|钓|挖|种植|加工|制作|料理|升级/.test(raw) || sourceKind === 'objective') kinds.push('objective');
  return unique(kinds).slice(0, TASK_DIAGNOSIS_MAX_CHECKS);
}

function getTaskDiagnosisStatus(kind = '', text = '', sourceKind = '') {
  const raw = String(text || '');
  if (sourceKind === 'board' && kind === 'accepted') return 'blocked';
  if (kind === 'accepted' && (sourceKind === 'active' || sourceKind === 'main' || sourceKind === 'special' || sourceKind === 'limited')) return 'ready';
  if (/未接取|未接|未领取|未接受|待接取|尚未接|不符|不足|缺|差|未解锁|入口未开|条件不足|过期|无法|不能/.test(raw)) return 'blocked';
  if (/已接取|当前|可交付|已满足|可完成|可领取|已完成/.test(raw)) return 'ready';
  return kind === 'objective' || kind === 'delivery' || kind === 'quantity' ? 'unknown' : 'unknown';
}

function buildTaskDiagnosisCheckForLabel(label = '', sourceKind = '', queryPlan = {}) {
  const text = normalizeTaskDiagnosisText(label, 180);
  if (!text) return [];
  const checks = [];
  const kinds = classifyTaskDiagnosisKinds(text, sourceKind);
  for (const kind of kinds) {
    const status = getTaskDiagnosisStatus(kind, text, sourceKind);
    const quantityText = kind === 'quantity' ? extractTaskDiagnosisQuantityText(text) : '';
    const resourceEntry = (kind === 'inventory' || kind === 'quantity') ? findStructuredTaskResourceEntry(text, queryPlan) : null;
    let detail = text;
    if (kind === 'accepted' && sourceKind === 'board') detail = `任务在告示板/可接列表中，当前摘要未显示已接取：${text}`;
    else if (kind === 'accepted' && status === 'ready') detail = `任务已在当前任务列表或专题摘要中出现：${text}`;
    else if (kind === 'inventory') detail = resourceEntry ? `库存缺口指向「${resourceEntry.title}」：${text}` : `库存或资源缺口：${text}`;
    else if (kind === 'quantity' && quantityText) detail = `数量要求/缺口：${quantityText}（${text}）`;
    else if (kind === 'precondition') detail = `前置条件未满足或需要确认：${text}`;
    else if (kind === 'season') detail = `季节条件需要处理：${text}`;
    else if (kind === 'time') detail = `时间/限时条件需要确认：${text}`;
    else if (kind === 'building') detail = `建筑或等级条件需要确认：${text}`;
    else if (kind === 'delivery') detail = `交付对象或地点线索：${text}`;
    else if (kind === 'objective') detail = `任务目标线索：${text}`;

    pushTaskDiagnosisCheck(checks, {
      kind,
      status,
      detail,
      nextStep: buildTaskDiagnosisAcquisitionRoute({ kind, text, queryPlan }),
      routeName: kind === 'inventory' && resourceEntry?.routeHints?.[0] ? resourceEntry.routeHints[0] : 'quest',
      source: sourceKind === 'board' ? '告示板任务摘要' : sourceKind === 'objective' ? '任务目标摘要' : '当前任务摘要',
      itemName: resourceEntry?.title || '',
      quantityText,
    });
  }
  return checks;
}

function createTaskDiagnosisCandidate({ title, acceptedStatus = 'unknown', source = '当前任务摘要', sourceKind = 'active', label = '', queryPlan = {} } = {}) {
  const safeLabel = normalizeTaskDiagnosisText(label || title, 180);
  const safeTitle = normalizeTaskDiagnosisText(title || inferTaskDiagnosisTitle(safeLabel), 80);
  if (!safeTitle && !safeLabel) return null;
  const checks = [];
  if (acceptedStatus !== 'unknown') {
    pushTaskDiagnosisCheck(checks, {
      kind: 'accepted',
      status: acceptedStatus === 'accepted' ? 'ready' : 'blocked',
      detail: acceptedStatus === 'accepted'
        ? `已在当前任务摘要中出现：${safeTitle || safeLabel}`
        : `当前只在可接/告示板摘要中出现，尚未确认已接取：${safeTitle || safeLabel}`,
      nextStep: acceptedStatus === 'accepted'
        ? '继续核对目标、库存和交付条件。'
        : buildTaskDiagnosisAcquisitionRoute({ kind: 'accepted', text: safeLabel, queryPlan }),
      routeName: 'quest',
      source,
    });
  }
  for (const check of buildTaskDiagnosisCheckForLabel(safeLabel, sourceKind, queryPlan)) {
    if (check.kind === 'accepted' && acceptedStatus !== 'unknown') continue;
    pushTaskDiagnosisCheck(checks, check);
  }
  return {
    id: normalizeText(safeTitle || safeLabel).slice(0, 80) || `task:${checks.length}`,
    title: safeTitle || safeLabel || '当前任务',
    acceptedStatus,
    source,
    sourceKind,
    labels: safeLabel ? [safeLabel] : [],
    checks,
  };
}

function mergeTaskDiagnosisCandidate(candidates, candidate) {
  if (!candidate) return;
  const key = normalizeText(candidate.title || candidate.labels?.[0] || candidate.id);
  const existing = candidates.find(item => normalizeText(item.title || item.id) === key);
  if (!existing) {
    candidates.push(candidate);
    return;
  }
  existing.labels = unique([...(existing.labels || []), ...(candidate.labels || [])]).slice(0, 6);
  if (existing.acceptedStatus === 'unknown' && candidate.acceptedStatus !== 'unknown') existing.acceptedStatus = candidate.acceptedStatus;
  for (const check of candidate.checks || []) pushTaskDiagnosisCheck(existing.checks, check);
}

function collectTaskDiagnosisCandidates(quests = {}, inventory = {}, queryPlan = {}, question = '') {
  const candidates = [];
  const targetTerms = getTaskDiagnosisTargetTerms(queryPlan);
  const addLabelCandidate = (label, sourceKind, acceptedStatus, source, title = '') => {
    const text = normalizeTaskDiagnosisText(label, 180);
    if (!text || !taskDiagnosisTextMatchesTargets(`${title} ${text}`, targetTerms)) return;
    mergeTaskDiagnosisCandidate(candidates, createTaskDiagnosisCandidate({
      title: title || inferTaskDiagnosisTitle(text),
      acceptedStatus,
      source,
      sourceKind,
      label: text,
      queryPlan,
    }));
  };

  addLabelCandidate(quests.mainQuestLabel, 'main', 'accepted', '主线任务摘要');
  for (const label of normalizeContextList(quests.mainQuestObjectiveLabels, 6, 100)) {
    addLabelCandidate(label, 'objective', 'unknown', '主线目标摘要', inferTaskDiagnosisTitle(quests.mainQuestLabel || label));
  }
  for (const label of normalizeContextList(quests.activeQuestLabels, TASK_DIAGNOSIS_MAX_TASKS, 120)) {
    addLabelCandidate(label, 'active', 'accepted', '当前任务摘要');
  }
  for (const label of normalizeContextList(quests.boardQuestLabels, TASK_DIAGNOSIS_MAX_TASKS, 120)) {
    addLabelCandidate(label, 'board', 'not-accepted', '告示板任务摘要');
  }
  addLabelCandidate(quests.specialOrderLabel, 'special', 'accepted', '特殊订单摘要');
  addLabelCandidate(quests.limitedTimeQuestLabel, 'limited', 'accepted', '限时任务摘要');

  const blockerLabels = [
    ...normalizeContextList(quests.blockerLabels, TASK_DIAGNOSIS_MAX_TASKS, 140),
    ...normalizeContextList(quests.shortageLabels, TASK_DIAGNOSIS_MAX_TASKS, 120),
    ...normalizeContextList(inventory.shortageLabels, TASK_DIAGNOSIS_MAX_TASKS, 120),
  ];
  for (const label of blockerLabels) {
    addLabelCandidate(label, 'blocker', 'unknown', '任务阻塞/资源缺口摘要');
  }

  return candidates.slice(0, TASK_DIAGNOSIS_MAX_TASKS);
}

function buildTaskDiagnosis(snapshot = null, { queryPlan = {}, routeName = '', question = '' } = {}) {
  const context = getContextObject(snapshot);
  if (!context) {
    return { available: false, summary: '', targetTask: null, checks: [], blockedChecks: [], routeSteps: [], question: normalizeTaskDiagnosisText(question, 80) };
  }
  const quests = getContextObject(context.quests) || {};
  const inventory = getContextObject(context.inventory) || {};
  const candidates = collectTaskDiagnosisCandidates(quests, inventory, queryPlan, question)
    .map(candidate => ({
      ...candidate,
      checks: (candidate.checks || [])
        .sort((a, b) => taskDiagnosisStatusRank(b.status) - taskDiagnosisStatusRank(a.status) || getTaskDiagnosisKindRank(a.kind) - getTaskDiagnosisKindRank(b.kind))
        .slice(0, TASK_DIAGNOSIS_MAX_CHECKS),
    }))
    .filter(candidate => candidate.checks.length);

  if (!candidates.length) {
    return {
      available: false,
      summary: '当前公开任务摘要不足，无法定位具体任务阻塞点。',
      targetTask: null,
      checks: [],
      blockedChecks: [],
      routeSteps: ['请补充任务名、任务 ID、交付物或当前任务页可见目标后再诊断。'],
      question: normalizeTaskDiagnosisText(question, 80),
    };
  }

  const sortedCandidates = candidates.sort((a, b) => {
    const aBlocked = a.checks.filter(item => item.status === 'blocked').length;
    const bBlocked = b.checks.filter(item => item.status === 'blocked').length;
    const aAccepted = a.acceptedStatus === 'accepted' ? 1 : 0;
    const bAccepted = b.acceptedStatus === 'accepted' ? 1 : 0;
    return bBlocked - aBlocked || bAccepted - aAccepted || b.checks.length - a.checks.length;
  });
  const targetTask = sortedCandidates[0];
  const checks = targetTask.checks.slice(0, TASK_DIAGNOSIS_MAX_CHECKS);
  const blockedChecks = checks.filter(item => item.status === 'blocked');
  const routeSteps = unique([
    ...(blockedChecks.length ? blockedChecks : checks)
      .map(item => item.nextStep)
      .filter(Boolean),
    blockedChecks.length ? '处理完阻塞点后，回任务页核对是否可交付；我不会自动提交任务或消耗物品。' : '当前摘要没有明确阻塞点，回任务页逐项核对目标、数量和交付对象。',
  ]).slice(0, 5);

  return {
    available: true,
    summary: blockedChecks.length
      ? `定位到「${targetTask.title}」的 ${blockedChecks.length} 个明确阻塞点：${blockedChecks.map(item => item.label).join('、')}`
      : `定位到「${targetTask.title}」，但当前公开摘要未显示明确阻塞点。`,
    targetTask: {
      id: targetTask.id,
      title: targetTask.title,
      acceptedStatus: targetTask.acceptedStatus,
      source: targetTask.source,
      labels: targetTask.labels || [],
    },
    checks,
    blockedChecks,
    routeSteps,
    routeName: routeName || 'quest',
    question: normalizeTaskDiagnosisText(question, 80),
  };
}

function buildAiAssistantLocalDiagnostics(snapshot = null, { queryPlan = {}, routeName = '', question = '' } = {}) {
  const context = getContextObject(snapshot);
  const emptyTaskDiagnosis = { available: false, summary: '', targetTask: null, checks: [], blockedChecks: [], routeSteps: [], question: normalizeTaskDiagnosisText(question, 80) };
  const empty = { available: false, signals: [], suggestions: [], summary: '', taskDiagnosis: emptyTaskDiagnosis };
  if (!context) return empty;

  const signals = [];
  const baseState = getContextObject(context.baseState) || getContextObject(context.base);
  const weeklyPlan = getContextObject(context.weeklyPlan);
  const inventory = getContextObject(context.inventory);
  const farming = getContextObject(context.farming);
  const buildings = getContextObject(context.buildings);
  const quests = getContextObject(context.quests);
  const lateGame = getContextObject(context.lateGame);
  const online = getContextObject(context.online);

  if (baseState) {
    const stamina = normalizeContextNumber(baseState.stamina);
    const maxStamina = normalizeContextNumber(baseState.maxStamina);
    const staminaLabel = normalizeContextText(baseState.staminaLabel, 40)
      || (stamina !== null && maxStamina !== null ? `${stamina}/${maxStamina}` : '');
    if (stamina !== null && maxStamina !== null && maxStamina > 0 && stamina / maxStamina <= 0.3) {
      pushLocalDiagnosticSignal(signals, {
        category: 'stamina-low',
        title: `体力偏低：${staminaLabel}`,
        detail: '当前体力已经接近低位，继续下矿、钓鱼或长线采集容易中断当天计划。',
        recommendation: '先做交付、领取、整理背包或短路径采购，把高体力消耗动作放到补给后。',
        routeName: 'inventory',
        dimensions: { urgency: 4, benefit: 3, risk: 3, staminaCost: 5, taskValue: 2 },
      });
    }

    const money = normalizeContextNumber(baseState.money);
    const moneyLabel = normalizeContextText(baseState.moneyLabel, 40) || (money !== null ? `${money}文` : '');
    if (money !== null && money <= 500) {
      pushLocalDiagnosticSignal(signals, {
        category: 'cash-low',
        title: `现金偏紧：${moneyLabel}`,
        detail: '当前现金不足以支撑连续采购或工具升级，容易卡住种子、材料和建筑推进。',
        recommendation: '优先完成可交付任务、出售低风险产物或选择短周期收益动作，再安排采购。',
        routeName: 'wallet',
        dimensions: { urgency: 4, benefit: 3, risk: 3, moneyPressure: 5, taskValue: 2 },
      });
    }
  }

  if (inventory) {
    const slotUsageLabel = normalizeContextText(inventory.slotUsageLabel, 100);
    const ratio = parseContextRatioLabel(slotUsageLabel);
    if (ratio && ratio.ratio >= 0.8) {
      pushLocalDiagnosticSignal(signals, {
        category: 'bag-nearly-full',
        title: `背包将满：${slotUsageLabel}`,
        detail: '背包容量接近上限，继续采集、下矿或钓鱼会降低收益并增加往返成本。',
        recommendation: '先交付任务、整理仓库或出售低优先级物品，再执行采集和下矿路线。',
        routeName: 'inventory',
        dimensions: { urgency: ratio.ratio >= 0.9 ? 5 : 4, benefit: 4, risk: 4, taskValue: 3 },
      });
    }
    for (const label of normalizeContextList(inventory.shortageLabels, 5, 80)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'task-shortage',
        title: `资源缺口：${label}`,
        detail: '当前资源缺口会影响任务交付、建筑或工具路线推进。',
        recommendation: '按缺口对应来源先补齐关键资源，再回到任务或升级页面确认进度。',
        routeName: 'quest',
        dimensions: { urgency: 4, benefit: 4, risk: 3, taskValue: 4, moneyPressure: /钱|现金|文/.test(label) ? 4 : 1 },
      });
    }
    const pendingToolUpgradeLabel = normalizeContextText(inventory.pendingToolUpgradeLabel, 80);
    if (pendingToolUpgradeLabel) {
      pushLocalDiagnosticSignal(signals, {
        category: 'tool-bottleneck',
        title: `工具升级：${pendingToolUpgradeLabel}`,
        detail: '工具升级会影响采集、下矿、浇水或加工效率，是中长期收益瓶颈。',
        recommendation: '确认升级材料和现金后，再安排铁匠铺或工具升级路线。',
        routeName: 'upgrade',
        dimensions: { urgency: 3, benefit: 4, unlockValue: 4, moneyPressure: 3, taskValue: 3 },
      });
    }
  }

  if (farming) {
    for (const label of normalizeContextList(farming.seasonRiskLabels, 4, 80)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'season-risk',
        title: `换季风险：${label}`,
        detail: '换季风险会直接影响作物收益，临近换季时优先级高于多数常规采集。',
        recommendation: '先收获或处理会受换季影响的作物，再安排低时限任务。',
        routeName: 'farm',
        dimensions: { urgency: 5, benefit: 4, risk: 5, taskValue: 2, staminaCost: 1 },
      });
    }
    for (const label of normalizeContextList(farming.waterRiskLabels, 4, 60)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'water-risk',
        title: `缺水提醒：${label}`,
        detail: '缺水地块会拖慢成长节奏，影响当季收益和后续交付。',
        recommendation: '先完成浇水，再安排离开农场的路线。',
        routeName: 'farm',
        dimensions: { urgency: 4, benefit: 3, risk: 3, taskValue: 2, staminaCost: 2 },
      });
    }
  }

  if (quests) {
    for (const label of [
      ...normalizeContextList(quests.blockerLabels, 5, 90),
      ...normalizeContextList(quests.shortageLabels, 5, 80),
    ]) {
      pushLocalDiagnosticSignal(signals, {
        category: 'task-shortage',
        title: `任务阻塞：${label}`,
        detail: '这是当前任务推进的直接阻塞点，优先处理通常能立刻改变任务状态。',
        recommendation: '先按缺口补资源或完成前置，再回任务页确认交付条件。',
        routeName: 'quest',
        dimensions: { urgency: 5, benefit: 4, risk: 4, taskValue: 5, moneyPressure: /钱|现金|文/.test(label) ? 4 : 1 },
      });
    }
    const limitedTimeQuestLabel = normalizeContextText(quests.limitedTimeQuestLabel, 100);
    if (limitedTimeQuestLabel && contextTextLooksUrgent(limitedTimeQuestLabel)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'online-alert',
        title: `限时任务：${limitedTimeQuestLabel}`,
        detail: '限时内容有过期风险，需要在常规经营前确认剩余时间和奖励价值。',
        recommendation: '先打开任务页确认限时目标，再决定是否压缩采集或下矿时间。',
        routeName: 'quest',
        dimensions: { urgency: 5, benefit: 4, risk: 4, taskValue: 4 },
      });
    }
    for (const label of normalizeContextList(quests.claimableLabels, 5, 80)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'claimable-reward',
        title: `可领奖励：${label}`,
        detail: '可领奖励通常成本低、收益立即到账，可以先处理以改善资源或现金状态。',
        recommendation: '先领取或交付可完成节点，再继续高成本路线。',
        routeName: 'quest',
        dimensions: { urgency: 4, benefit: 5, risk: 1, taskValue: 4, staminaCost: 0 },
      });
    }
  }

  if (weeklyPlan) {
    for (const label of normalizeContextList(weeklyPlan.claimableNodeLabels, 4, 80)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'claimable-reward',
        title: `周计划奖励：${label}`,
        detail: '周计划节点已可领取时，先领取能补充资源并更新后续计划判断。',
        recommendation: '先处理周计划可领奖点，再按新资源状态安排下一步。',
        routeName: 'quest',
        dimensions: { urgency: 3, benefit: 5, unlockValue: 2, taskValue: 3 },
      });
    }
  }

  if (buildings) {
    const villageProjectLabel = normalizeContextText(buildings.villageProjectLabel, 100);
    const availableProjects = normalizeContextList(buildings.availableProjectLabels, 4, 60);
    if (villageProjectLabel || availableProjects.length) {
      pushLocalDiagnosticSignal(signals, {
        category: 'building-bottleneck',
        title: `建筑推进：${availableProjects[0] || villageProjectLabel}`,
        detail: [villageProjectLabel, availableProjects.length ? `可推进：${availableProjects.join('、')}` : ''].filter(Boolean).join('；'),
        recommendation: '先确认建筑材料、现金和前置，再推进能解锁功能的工程。',
        routeName: 'home',
        dimensions: { urgency: 3, benefit: 4, unlockValue: 5, moneyPressure: 3, taskValue: 3 },
      });
    }
  }

  if (lateGame) {
    for (const [categoryLabel, labels, route] of [
      ['鱼塘提醒', normalizeContextList(lateGame.fishPondAlertLabels, 4, 80), 'fishpond'],
      ['育种提醒', normalizeContextList(lateGame.breedingAlertLabels, 4, 80), 'breeding'],
      ['博物馆提醒', normalizeContextList(lateGame.museumAlertLabels, 4, 80), 'museum'],
      ['公会提醒', normalizeContextList(lateGame.guildAlertLabels, 4, 80), 'guild'],
      ['瀚海提醒', normalizeContextList(lateGame.hanhaiAlertLabels, 4, 80), 'hanhai'],
    ]) {
      for (const label of labels) {
        pushLocalDiagnosticSignal(signals, {
          category: /奖励|可领|待领/.test(label) ? 'claimable-reward' : 'late-game-alert',
          title: `${categoryLabel}：${label}`,
          detail: '中后期系统提醒会影响奖励、展陈、供货或成长路线。',
          recommendation: `打开${ROUTE_LABELS[route] || categoryLabel}页确认状态，再决定是否插入今日路线。`,
          routeName: route,
          dimensions: { urgency: contextTextLooksUrgent(label) ? 4 : 3, benefit: 4, unlockValue: 3, risk: /病|满|倒计时/.test(label) ? 4 : 2, taskValue: 3 },
        });
      }
    }
  }

  if (online) {
    for (const label of normalizeContextList(online.mailClaimableLabels, 4, 70)) {
      pushLocalDiagnosticSignal(signals, {
        category: 'claimable-reward',
        title: `邮箱可领取：${label}`,
        detail: '邮箱奖励领取成本低，可能补齐资源、活动道具或现金。',
        recommendation: '先打开邮箱领取，再根据新增资源更新今日计划。',
        routeName: 'hall',
        dimensions: { urgency: 4, benefit: 5, risk: 1, taskValue: 3 },
      });
    }
    const onlineLabels = [
      ...normalizeContextList(online.onlineAlertLabels, 5, 80),
      normalizeContextText(online.festivalRoomLabel, 120),
      normalizeContextText(online.coopOrderLabel, 120),
      normalizeContextText(online.coopCompensationLabel, 100),
    ].filter(Boolean);
    for (const label of onlineLabels) {
      if (!contextTextLooksUrgent(label)) continue;
      pushLocalDiagnosticSignal(signals, {
        category: 'online-alert',
        title: `在线提醒：${label}`,
        detail: '在线状态提醒通常有确认、领取、上传或活动时限，适合先做低成本处理。',
        recommendation: '先处理在线提醒，再进入长时间的农场、下矿或钓鱼路线。',
        routeName: 'hall',
        dimensions: { urgency: 4, benefit: 4, risk: 3, taskValue: 3, staminaCost: 0 },
      });
    }
  }

  const taskDiagnosis = buildTaskDiagnosis(snapshot, { queryPlan, routeName, question });
  const topTaskBlocker = taskDiagnosis.blockedChecks?.[0] || null;
  if (taskDiagnosis.available && topTaskBlocker) {
    pushLocalDiagnosticSignal(signals, {
      category: 'task-shortage',
      title: `任务诊断：${taskDiagnosis.targetTask?.title || topTaskBlocker.detail}`,
      detail: topTaskBlocker.detail,
      recommendation: topTaskBlocker.nextStep,
      routeName: topTaskBlocker.routeName || 'quest',
      source: topTaskBlocker.source || '任务诊断',
      dimensions: { urgency: 5, benefit: 4, risk: 4, taskValue: 5, moneyPressure: /钱|现金|文/.test(topTaskBlocker.detail) ? 4 : 1 },
      boost: 8,
    });
  }

  const sorted = sanitizeDiagnosticSignals(signals, queryPlan, routeName);
  const suggestions = sorted.slice(0, LOCAL_DIAGNOSTIC_TOP_SUGGESTIONS);
  return {
    available: suggestions.length > 0 || taskDiagnosis.available,
    signals: sorted,
    suggestions,
    summary: suggestions.length
      ? `识别到 ${sorted.length} 条本地诊断信号，优先处理：${suggestions.slice(0, 3).map(item => item.title).join('、')}`
      : taskDiagnosis.summary,
    taskDiagnosis,
    question: normalizeContextText(question, 80),
  };
}

function shouldUseTaskDiagnosisAnswer(question = '', queryPlan = {}, diagnostics = {}) {
  if (!diagnostics?.taskDiagnosis?.available || queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') return false;
  const raw = String(question || '');
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  const explicitTaskQuestion = /任务|委托|订单|卡住|缺什么|缺口|卡关|交付|要的|差.*个|差.*条/.test(raw);
  const hasTaskSlot = (queryPlan.slots?.tasks || []).length > 0;
  if (!explicitTaskQuestion && !hasTaskSlot) return false;
  return (
    types.has('task-diagnosis')
    || intents.has('diagnose_task')
    || explicitTaskQuestion
    || hasTaskSlot
  );
}

function formatTaskDiagnosisCheckLine(taskDiagnosis = {}, kind = '') {
  const check = (taskDiagnosis.checks || []).find(item => item.kind === kind);
  const label = TASK_DIAGNOSIS_KIND_LABELS[kind] || kind;
  if (!check) return `${label}：当前公开摘要未给出，我不会臆造。`;
  const nextStep = check.nextStep ? ` 下一步：${check.nextStep}` : '';
  return `${label}：${check.statusLabel}。${check.detail}${nextStep}`;
}

function composeTaskDiagnosisAnswer({ question, intro, taskDiagnosis = {}, mode }) {
  const checks = taskDiagnosis.checks || [];
  if (!checks.length) return '';
  const blockedChecks = taskDiagnosis.blockedChecks || [];
  const top = blockedChecks[0] || checks[0];
  const taskTitle = taskDiagnosis.targetTask?.title || '当前任务';
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我先按当前公开任务摘要做任务诊断。`,
    conclusion: blockedChecks.length
      ? `「${taskTitle}」当前主要卡在：${blockedChecks.map(item => item.label).join('、')}。`
      : `「${taskTitle}」当前没有明确阻塞点，但仍需要逐项核对任务条件。`,
    reasons: [
      `诊断对象：${taskTitle}。`,
      taskDiagnosis.summary || '',
      top ? `优先阻塞：${top.label} - ${top.detail}` : '',
    ],
    steps: [
      `任务条件逐项核对：\n${TASK_DIAGNOSIS_KIND_ORDER.map(kind => formatTaskDiagnosisCheckLine(taskDiagnosis, kind)).join('\n')}`,
      `下一步路线：\n${(taskDiagnosis.routeSteps || []).map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    ],
    cautions: [
      ...getTemplateStrictModeCautions(mode),
      '这是只读诊断：我不会自动交任务、消耗背包物品、发奖励或改存档。',
    ],
    evidence: [
      taskDiagnosis.targetTask?.source ? `任务摘要来源：${taskDiagnosis.targetTask.source}` : '任务摘要来源：当前公开任务上下文。',
      `诊断检查项：${checks.map(item => item.label).join('、')}`,
    ],
  });
}

function shouldUseLocalDiagnostics(question = '', queryPlan = {}, diagnostics = {}) {
  if (!diagnostics?.available || queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') return false;
  const raw = String(question || '');
  const types = new Set(queryPlan.questionTypes || []);
  const intents = new Set(queryPlan.intents || []);
  return (
    types.has('today-planning')
    || types.has('task-diagnosis')
    || types.has('risk-reminder')
    || types.has('next-step-suggestion')
    || intents.has('plan_today')
    || intents.has('diagnose_task')
    || intents.has('remind_risk')
    || intents.has('suggest_next_step')
    || /今天|任务|卡住|缺口|风险|提醒|下一步|先做|该做|怎么办|要干嘛/.test(raw)
  );
}

function composeLocalDiagnosticsAnswer({ question, intro, diagnostics = {}, mode, queryPlan = null }) {
  if (shouldUseTaskDiagnosisAnswer(question, queryPlan || resolveQueryPlan(question), diagnostics)) {
    const taskAnswer = composeTaskDiagnosisAnswer({ question, intro, taskDiagnosis: diagnostics.taskDiagnosis, mode });
    if (taskAnswer) return taskAnswer;
  }
  const suggestions = diagnostics.suggestions || [];
  if (!suggestions.length) return '';
  const [top] = suggestions;
  return composePlayerTemplateAnswer({
    intro,
    legacyLead: `关于“${question}”，我先按当前公开状态做本地诊断。`,
    conclusion: `优先处理「${top.title}」（评分 ${top.score}）。`,
    reasons: suggestions.slice(0, 4).map(item => `${item.title}：评分 ${item.score}；原因：${item.reasons.join('；')}`),
    steps: suggestions.slice(0, 4).map(item => {
      const route = item.routeLabel ? `；建议查看：${item.routeLabel}` : '';
      return `建议：${item.recommendation}${route}`;
    }),
    cautions: getTemplateStrictModeCautions(mode),
    evidence: [
      diagnostics.summary ? `本地诊断：${diagnostics.summary}` : '',
      `公开状态信号数：${diagnostics.signals?.length || suggestions.length}`,
    ],
  });
}

function summarizeTaskDiagnosisForTrace(taskDiagnosis = {}) {
  return {
    available: taskDiagnosis?.available === true,
    summary: taskDiagnosis?.summary || '',
    targetTask: taskDiagnosis?.targetTask || null,
    checks: (taskDiagnosis?.checks || []).map(item => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      statusLabel: item.statusLabel,
      detail: item.detail,
      nextStep: item.nextStep,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      source: item.source,
      itemName: item.itemName || '',
      quantityText: item.quantityText || '',
    })),
    blockedChecks: (taskDiagnosis?.blockedChecks || []).map(item => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      detail: item.detail,
      nextStep: item.nextStep,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      source: item.source,
    })),
    routeSteps: taskDiagnosis?.routeSteps || [],
  };
}

function summarizeLocalDiagnosticsForTrace(diagnostics = {}) {
  return {
    available: diagnostics?.available === true,
    summary: diagnostics?.summary || '',
    taskDiagnosis: summarizeTaskDiagnosisForTrace(diagnostics?.taskDiagnosis || {}),
    signals: (diagnostics?.signals || []).map(item => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.categoryLabel,
      title: item.title,
      detail: item.detail,
      recommendation: item.recommendation,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      score: item.score,
      reasons: item.reasons || [],
      dimensions: item.dimensions || {},
      source: item.source || '',
    })),
    suggestions: (diagnostics?.suggestions || []).map(item => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.categoryLabel,
      title: item.title,
      recommendation: item.recommendation,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      score: item.score,
      reasons: item.reasons || [],
      dimensions: item.dimensions || {},
    })),
  };
}

const THREE_STEP_LEVELS = [
  { level: 'now', label: '马上做' },
  { level: 'today', label: '今天做' },
  { level: 'week', label: '本周做' },
];

const THREE_STEP_SIGNAL_LABELS = {
  'cash-flow': '现金流',
  'task-progress': '任务推进',
  'season-risk': '换季风险',
  'stamina-use': '体力利用',
  'resource-shortage': '资源缺口',
  'growth-unlock': '成长线解锁',
  'online-deadline': '在线活动截止',
};

const THREE_STEP_ALLOWED_SIGNALS = new Set(Object.keys(THREE_STEP_SIGNAL_LABELS));

const THREE_STEP_DIAGNOSTIC_SIGNAL_MAP = {
  'season-risk': ['season-risk'],
  'water-risk': ['season-risk', 'stamina-use'],
  'stamina-low': ['stamina-use'],
  'cash-low': ['cash-flow'],
  'bag-nearly-full': ['resource-shortage', 'stamina-use'],
  'task-shortage': ['task-progress', 'resource-shortage'],
  'building-bottleneck': ['growth-unlock', 'resource-shortage'],
  'tool-bottleneck': ['growth-unlock', 'resource-shortage', 'cash-flow'],
  'claimable-reward': ['cash-flow', 'task-progress'],
  'online-alert': ['online-deadline'],
  'late-game-alert': ['growth-unlock', 'online-deadline'],
};

const THREE_STEP_ROUTE_TEMPLATES = {
  farm: {
    routeName: 'farm',
    steps: {
      now: {
        title: '先处理农场里的即时风险',
        reason: '农场页最容易被缺水、成熟作物和换季节点影响，先确认不会错过当日收益。',
        benefit: '减少换季损失，稳住当天现金流。',
        signals: ['season-risk', 'stamina-use', 'cash-flow'],
        action: { type: 'open_page', label: '打开农场', target: 'farm' },
      },
      today: {
        title: '把收获、浇水和短周期种植排成一趟',
        reason: '把体力集中花在能当天改变收益或任务进度的地块上。',
        benefit: '降低往返成本，给任务和采购留出时间。',
        signals: ['stamina-use', 'task-progress'],
        action: { type: 'mark_goal', label: '标记农场今日目标', target: 'farm', value: '完成收获、浇水和短周期种植检查' },
      },
      week: {
        title: '为换季、温室或工具路线预留材料',
        reason: '农场中长期效率通常被工具、建筑和季节节奏限制。',
        benefit: '提前减少下周卡材料或现金的概率。',
        signals: ['growth-unlock', 'resource-shortage', 'season-risk'],
        action: { type: 'copy_checklist', label: '复制农场周目标', target: 'farm', items: ['确认换季作物', '预留种子预算', '检查工具升级材料'] },
      },
    },
  },
  quest: {
    routeName: 'quest',
    steps: {
      now: {
        title: '先看可交付和直接阻塞的任务',
        reason: '任务页的可领奖励、缺口和限时目标通常能最快改变当前资源状态。',
        benefit: '用低体力动作推进任务并补充现金或材料。',
        signals: ['task-progress', 'resource-shortage', 'cash-flow'],
        action: { type: 'open_quest', label: '打开任务页', target: 'quest' },
      },
      today: {
        title: '选择一条能在今天完成的任务线',
        reason: '把目标收窄到一个主线、委托或公告板任务，避免同时追多个缺口。',
        benefit: '更容易完成交付，减少资源分散。',
        signals: ['task-progress', 'stamina-use'],
        action: { type: 'mark_goal', label: '标记今日任务目标', target: 'quest', value: '今天优先推进一条可完成任务线' },
      },
      week: {
        title: '整理下周会卡住的前置和材料',
        reason: '主线、建筑和特殊委托经常共享材料或前置条件。',
        benefit: '提前规避资源短缺和成长线断点。',
        signals: ['growth-unlock', 'resource-shortage', 'task-progress'],
        action: { type: 'copy_checklist', label: '复制任务准备清单', target: 'quest', items: ['确认任务缺口', '预留交付材料', '记录前置建筑或工具'] },
      },
    },
  },
  shop: {
    routeName: 'shop',
    steps: {
      now: {
        title: '先按缺口列采购清单',
        reason: '商店页最容易因为现金紧张买多或漏买关键物品。',
        benefit: '减少无效采购，把现金用在任务或产出上。',
        signals: ['cash-flow', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制采购清单', target: 'shop', items: ['任务缺口物品', '当季种子', '工具或建筑材料'] },
      },
      today: {
        title: '只买能当天转化为收益或任务进度的物品',
        reason: '现金不足时，优先买能立刻种植、交付或解锁的物品。',
        benefit: '降低资金占用，避免卡住后续路线。',
        signals: ['cash-flow', 'task-progress'],
        action: { type: 'mark_goal', label: '标记今日采购原则', target: 'shop', value: '只买能当天使用的关键物品' },
      },
      week: {
        title: '给工具升级、换季和建筑预留预算',
        reason: '商店采购会挤占升级和建筑现金。',
        benefit: '保证本周不会因为冲动采购中断成长线。',
        signals: ['cash-flow', 'growth-unlock', 'season-risk'],
        action: { type: 'copy_checklist', label: '复制预算清单', target: 'shop', items: ['种子预算', '工具升级预算', '建筑材料预算'] },
      },
    },
  },
  inventory: {
    routeName: 'inventory',
    steps: {
      now: {
        title: '先清理背包和可交付物',
        reason: '背包接近上限会拖慢采集、下矿和钓鱼收益。',
        benefit: '释放格子并减少往返成本。',
        signals: ['resource-shortage', 'stamina-use', 'task-progress'],
        action: { type: 'open_page', label: '打开背包', target: 'inventory' },
      },
      today: {
        title: '把关键材料留给任务或升级',
        reason: '材料如果被随手出售，后续任务、工具和建筑会再次形成缺口。',
        benefit: '提高今日任务和成长线的成功率。',
        signals: ['resource-shortage', 'growth-unlock', 'task-progress'],
        action: { type: 'mark_goal', label: '标记背包整理目标', target: 'inventory', value: '保留任务和升级关键材料' },
      },
      week: {
        title: '建立常用材料安全线',
        reason: '一周内重复使用的种子、矿石、木材和任务物品需要提前留量。',
        benefit: '减少临时补材料导致的节奏中断。',
        signals: ['resource-shortage', 'growth-unlock'],
        action: { type: 'copy_checklist', label: '复制库存安全线', target: 'inventory', items: ['任务物品', '工具升级材料', '建筑材料', '当季作物'] },
      },
    },
  },
  mining: {
    routeName: 'mining',
    steps: {
      now: {
        title: '先确认体力、背包和缺矿目标',
        reason: '下矿是高体力路线，缺体力或背包满时收益会明显下降。',
        benefit: '避免半途中断，把矿洞收益对准任务或升级缺口。',
        signals: ['stamina-use', 'resource-shortage'],
        action: { type: 'open_page', label: '打开矿洞', target: 'mining' },
      },
      today: {
        title: '只打一条明确的矿石或任务材料路线',
        reason: '把矿洞目标绑定到工具升级、建筑或任务缺口，减少无目的消耗。',
        benefit: '用有限体力换到能推进的材料。',
        signals: ['task-progress', 'resource-shortage', 'stamina-use'],
        action: { type: 'mark_goal', label: '标记下矿目标', target: 'mining', value: '今天只追一个关键矿石或任务缺口' },
      },
      week: {
        title: '围绕工具升级规划矿石储备',
        reason: '矿石储备决定工具、建筑和部分中后期系统的推进速度。',
        benefit: '提升本周成长线解锁效率。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制矿洞周目标', target: 'mining', items: ['确认升级矿石', '预留补给', '安排低风险下矿日'] },
      },
    },
  },
  fishpond: {
    routeName: 'fishpond',
    steps: {
      now: {
        title: '先检查鱼塘容量、水质和可领奖',
        reason: '鱼塘提醒通常和产出、周赛或容量上限有关，处理成本低。',
        benefit: '减少溢出风险并及时拿到产出。',
        signals: ['cash-flow', 'growth-unlock', 'resource-shortage'],
        action: { type: 'open_page', label: '打开鱼塘', target: 'fishpond' },
      },
      today: {
        title: '选择一条投喂、换水或参赛路线',
        reason: '鱼塘的日内动作要围绕当前鱼种和奖励目标安排。',
        benefit: '提高产出稳定性和活动收益。',
        signals: ['stamina-use', 'task-progress', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记鱼塘今日目标', target: 'fishpond', value: '确认鱼塘容量、水质和今日收益路线' },
      },
      week: {
        title: '为周赛和稀有鱼储备做准备',
        reason: '鱼塘中长期价值来自稀有鱼、周赛和稳定产出。',
        benefit: '提前布局成长线和现金流。',
        signals: ['growth-unlock', 'cash-flow', 'online-deadline'],
        action: { type: 'copy_checklist', label: '复制鱼塘周目标', target: 'fishpond', items: ['保留参赛鱼', '检查水质', '确认周赛时间'] },
      },
    },
  },
  breeding: {
    routeName: 'breeding',
    steps: {
      now: {
        title: '先确认育种槽和父母代条件',
        reason: '育种页的槽位、材料和等待时间会影响整周成长节奏。',
        benefit: '避免空槽和错误组合浪费周期。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'open_page', label: '打开育种', target: 'breeding' },
      },
      today: {
        title: '补齐一组最接近完成的育种材料',
        reason: '优先推进接近完成的组合，比同时铺开多个组合更稳。',
        benefit: '更快获得成长线反馈。',
        signals: ['task-progress', 'resource-shortage', 'growth-unlock'],
        action: { type: 'mark_goal', label: '标记育种今日目标', target: 'breeding', value: '补齐一组最接近完成的育种材料' },
      },
      week: {
        title: '规划本周育种路线和保底资源',
        reason: '育种路线需要提前分配材料、槽位和等待时间。',
        benefit: '提高成长线解锁稳定性。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制育种周目标', target: 'breeding', items: ['确认目标品系', '预留材料', '安排槽位节奏'] },
      },
    },
  },
  museum: {
    routeName: 'museum',
    steps: {
      now: {
        title: '先检查可捐赠和可领奖项目',
        reason: '博物馆页常有低成本捐赠和阶段奖励，适合先处理。',
        benefit: '快速推进收集进度并领取奖励。',
        signals: ['task-progress', 'growth-unlock', 'cash-flow'],
        action: { type: 'open_page', label: '打开博物馆', target: 'museum' },
      },
      today: {
        title: '补一批最容易完成的展品',
        reason: '优先处理已有或接近完成的展品，减少长线收集压力。',
        benefit: '提高当天收集完成度。',
        signals: ['resource-shortage', 'task-progress'],
        action: { type: 'mark_goal', label: '标记博物馆今日目标', target: 'museum', value: '补齐一批最容易完成的展品' },
      },
      week: {
        title: '按系列规划缺失藏品来源',
        reason: '博物馆周目标更适合按系列和来源拆分。',
        benefit: '减少重复采集，提高收集路线效率。',
        signals: ['growth-unlock', 'resource-shortage'],
        action: { type: 'copy_checklist', label: '复制博物馆周目标', target: 'museum', items: ['列出缺失展品', '标记来源页面', '安排采集或钓鱼路线'] },
      },
    },
  },
  guild: {
    routeName: 'guild',
    steps: {
      now: {
        title: '先检查公会订单、贡献和期限',
        reason: '公会页的订单或活动提醒可能带有截止时间。',
        benefit: '避免错过奖励并稳定贡献进度。',
        signals: ['online-deadline', 'task-progress', 'cash-flow'],
        action: { type: 'open_page', label: '打开公会', target: 'guild' },
      },
      today: {
        title: '补一条能完成的供货或贡献链',
        reason: '公会任务适合绑定库存缺口和当天产出安排。',
        benefit: '提升贡献，同时带动现金流或材料周转。',
        signals: ['task-progress', 'resource-shortage', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记公会今日目标', target: 'guild', value: '今天完成一条可交付公会目标' },
      },
      week: {
        title: '规划本周贡献和活动截止点',
        reason: '公会成长依赖持续贡献和活动节奏。',
        benefit: '避免月底或活动末期集中补进度。',
        signals: ['growth-unlock', 'online-deadline', 'task-progress'],
        action: { type: 'copy_checklist', label: '复制公会周目标', target: 'guild', items: ['确认贡献目标', '检查活动截止', '预留交付材料'] },
      },
    },
  },
  hanhai: {
    routeName: 'hanhai',
    steps: {
      now: {
        title: '先确认瀚海航线、物资和倒计时',
        reason: '瀚海页通常牵涉物资准备、航线窗口和活动期限。',
        benefit: '减少错过窗口或缺材料返工。',
        signals: ['online-deadline', 'resource-shortage', 'growth-unlock'],
        action: { type: 'open_page', label: '打开瀚海', target: 'hanhai' },
      },
      today: {
        title: '只准备一条可完成航线',
        reason: '瀚海准备成本较高，优先确认能完成的一条路线更稳。',
        benefit: '控制资源消耗并保证今日推进。',
        signals: ['resource-shortage', 'task-progress', 'cash-flow'],
        action: { type: 'mark_goal', label: '标记瀚海今日目标', target: 'hanhai', value: '今天只准备一条可完成航线' },
      },
      week: {
        title: '规划远航解锁和补给安全线',
        reason: '瀚海中长期推进需要稳定物资、声望和活动窗口。',
        benefit: '提升成长线解锁效率，降低资源临时缺口。',
        signals: ['growth-unlock', 'resource-shortage', 'online-deadline'],
        action: { type: 'copy_checklist', label: '复制瀚海周目标', target: 'hanhai', items: ['确认航线窗口', '预留补给物资', '检查解锁条件'] },
      },
    },
  },
};

function normalizeThreeStepSignals(signals = []) {
  return unique(toArray(signals)
    .map(item => String(item || '').trim())
    .filter(item => THREE_STEP_ALLOWED_SIGNALS.has(item)))
    .slice(0, 4);
}

function getSignalsForDiagnostic(signal = {}) {
  return normalizeThreeStepSignals(THREE_STEP_DIAGNOSTIC_SIGNAL_MAP[signal.category] || []);
}

function getThreeStepRouteName(routeName = '', queryPlan = {}, diagnostics = {}, snapshot = null) {
  const context = getContextObject(snapshot);
  const baseState = context ? getContextObject(context.baseState) || getContextObject(context.base) : null;
  const candidates = unique([
    routeName,
    baseState?.currentRouteName,
    ...(queryPlan?.routeHints || []),
    ...((diagnostics?.suggestions || []).map(item => item.routeName)),
    ...((diagnostics?.signals || []).map(item => item.routeName)),
  ].map(item => String(item || '').trim()).filter(Boolean));

  for (const candidate of candidates) {
    if (THREE_STEP_ROUTE_TEMPLATES[candidate]) return candidate;
  }
  return '';
}

function pickThreeStepDiagnosticSignal(routeName = '', diagnostics = {}, templateSignals = [], usedIds = new Set()) {
  const signals = toArray(diagnostics?.signals).filter(item => item && typeof item === 'object');
  if (!signals.length) return null;
  const preferred = signals.filter(item => item.routeName === routeName);
  const templateSignalSet = new Set(templateSignals);
  const bySignal = signals.filter(item => getSignalsForDiagnostic(item).some(signal => templateSignalSet.has(signal)));
  const pools = [preferred, bySignal, signals];

  for (const pool of pools) {
    const found = pool.find(item => !usedIds.has(item.id));
    if (found) {
      usedIds.add(found.id);
      return found;
    }
  }
  return signals[0] || null;
}

function createThreeStepAction(routeName = '', action = {}) {
  return normalizeModelAction({
    type: action.type || 'open_page',
    label: action.label || `打开${ROUTE_LABELS[routeName] || routeName || '相关'}页`,
    target: action.target || routeName,
    value: action.value || '',
    items: action.items || [],
  });
}

function buildThreeStepSuggestion({ routeName, level, template, diagnosticSignal }) {
  if (!template) return null;
  const routeLabel = ROUTE_LABELS[routeName] || routeName;
  const signals = normalizeThreeStepSignals([
    ...(template.signals || []),
    ...getSignalsForDiagnostic(diagnosticSignal || {}),
  ]);
  if (!signals.length) return null;

  const action = createThreeStepAction(routeName, template.action);
  if (!action) return null;

  const levelMeta = THREE_STEP_LEVELS.find(item => item.level === level) || { level, label: level };
  const diagnosticTitle = normalizeContextText(diagnosticSignal?.title, 80);
  const diagnosticReason = diagnosticTitle ? `当前命中信号：${diagnosticTitle}。` : '';
  return {
    id: `${routeName}:${level}`,
    level,
    levelLabel: levelMeta.label,
    title: normalizeContextText(template.title, 80),
    reason: normalizeContextText([template.reason, diagnosticReason].filter(Boolean).join(' '), 180),
    benefit: normalizeContextText(template.benefit, 120),
    signals,
    signalLabels: signals.map(signal => THREE_STEP_SIGNAL_LABELS[signal] || signal),
    routeName,
    routeLabel,
    action,
  };
}

function buildAiAssistantThreeStepSuggestions(snapshot = null, {
  queryPlan = {},
  routeName = '',
  question = '',
  diagnostics = {},
} = {}) {
  if (queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') {
    return { available: false, routeName: '', routeLabel: '', summary: '', suggestions: [], question: normalizeContextText(question, 80) };
  }

  const resolvedRouteName = getThreeStepRouteName(routeName, queryPlan, diagnostics, snapshot);
  const routeTemplate = THREE_STEP_ROUTE_TEMPLATES[resolvedRouteName];
  if (!routeTemplate) {
    return { available: false, routeName: '', routeLabel: '', summary: '', suggestions: [], question: normalizeContextText(question, 80) };
  }

  const usedDiagnosticIds = new Set();
  const suggestions = THREE_STEP_LEVELS
    .map(({ level }) => {
      const template = routeTemplate.steps[level];
      const diagnosticSignal = pickThreeStepDiagnosticSignal(
        resolvedRouteName,
        diagnostics,
        template?.signals || [],
        usedDiagnosticIds
      );
      return buildThreeStepSuggestion({
        routeName: resolvedRouteName,
        level,
        template,
        diagnosticSignal,
      });
    })
    .filter(Boolean);

  const context = getContextObject(snapshot);
  const routeLabel = ROUTE_LABELS[resolvedRouteName] || resolvedRouteName;
  return {
    available: suggestions.length === THREE_STEP_LEVELS.length,
    routeName: resolvedRouteName,
    routeLabel,
    summary: suggestions.length
      ? `${routeLabel}已生成${suggestions.length}条三步行动建议，覆盖${suggestions.map(item => item.levelLabel).join('、')}。`
      : '',
    suggestions,
    question: normalizeContextText(question, 80),
    contextAvailable: !!context,
  };
}

function formatThreeStepSuggestionsBlock(threeStepSuggestions = {}) {
  const suggestions = threeStepSuggestions?.suggestions || [];
  if (!suggestions.length) return '';
  const lines = ['三步建议：'];
  for (const item of suggestions) {
    const signalText = item.signalLabels?.length ? `信号：${item.signalLabels.join('、')}` : '';
    const actionText = item.action?.label ? `轻动作：${item.action.label}` : '';
    lines.push(`${item.levelLabel}：${item.title}。${item.reason}收益：${item.benefit}。${[signalText, actionText].filter(Boolean).join('；')}。`);
  }
  lines.push('这些建议只提供跳转、复制清单或标记目标等安全轻动作，不会直接改存档、发奖励或扣资源。');
  return lines.join('\n');
}

function appendThreeStepSuggestionsToAnswer(answer = '', threeStepSuggestions = {}) {
  const block = formatThreeStepSuggestionsBlock(threeStepSuggestions);
  if (!block) return answer;
  const text = String(answer || '').trim();
  return text ? `${text}\n\n${block}` : block;
}

function summarizeThreeStepSuggestionsForTrace(threeStepSuggestions = {}) {
  return {
    available: threeStepSuggestions?.available === true,
    routeName: threeStepSuggestions?.routeName || '',
    routeLabel: threeStepSuggestions?.routeLabel || '',
    summary: threeStepSuggestions?.summary || '',
    suggestions: (threeStepSuggestions?.suggestions || []).map(item => ({
      id: item.id,
      level: item.level,
      levelLabel: item.levelLabel,
      title: item.title,
      reason: item.reason,
      benefit: item.benefit,
      signals: item.signals || [],
      signalLabels: item.signalLabels || [],
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      action: item.action,
    })),
  };
}

function buildContextSnapshotText(snapshot = null) {
  const context = getContextObject(snapshot);
  if (!context) return '';
  const lines = [];
  const contextVersion = normalizeContextNumber(context.contextVersion ?? context.version);
  const baseState = getContextObject(context.baseState) || getContextObject(context.base);
  const weeklyPlan = getContextObject(context.weeklyPlan);
  const inventory = getContextObject(context.inventory);
  const farming = getContextObject(context.farming);
  const animals = getContextObject(context.animals);
  const buildings = getContextObject(context.buildings);
  const quests = getContextObject(context.quests);
  const lateGame = getContextObject(context.lateGame);
  const online = getContextObject(context.online);

  if (contextVersion) lines.push(`上下文版本：v${contextVersion}`);
  if (baseState) {
    const year = normalizeContextNumber(baseState.year);
    const day = normalizeContextNumber(baseState.day);
    const seasonLabel = normalizeContextText(baseState.seasonLabel || baseState.season, 40);
    const dateLabel = normalizeContextText(baseState.dateLabel, 80)
      || (year && day && seasonLabel ? `第${year}年 ${seasonLabel} 第${day}天` : '');
    const timePeriod = normalizeContextText(baseState.timePeriod, 40);
    const timePeriodLabel = normalizeContextText(baseState.timePeriodLabel, 40)
      || (timePeriod ? AI_CONTEXT_TIME_PERIOD_LABELS[timePeriod] || '' : '');
    const timeLabel = [normalizeContextText(baseState.timeLabel, 40), timePeriodLabel].filter(Boolean).join(' ');
    const stamina = normalizeContextNumber(baseState.stamina);
    const maxStamina = normalizeContextNumber(baseState.maxStamina);
    const staminaLabel = normalizeContextText(baseState.staminaLabel, 40)
      || (stamina !== null && maxStamina !== null ? `${stamina}/${maxStamina}` : '');
    const money = normalizeContextNumber(baseState.money);
    const moneyLabel = normalizeContextText(baseState.moneyLabel, 40)
      || (money !== null ? `${money}文` : '');

    pushContextLine(lines, '当前页面', baseState.currentPageLabel || baseState.currentRouteName, 80);
    pushContextLine(lines, '当前日期', dateLabel, 80);
    pushContextLine(lines, '当前天气', baseState.weatherLabel || baseState.weather, 40);
    pushContextLine(lines, '当前时段', timeLabel, 80);
    pushContextLine(lines, '当前体力', staminaLabel, 40);
    pushContextLine(lines, '当前金钱', moneyLabel, 40);
  }
  if (weeklyPlan) {
    pushContextLine(lines, '本周路线摘要', weeklyPlan.primaryRouteSummary, 160);
    pushContextList(lines, '本周计划来源', weeklyPlan.sourceLabels, 4, 60);
  }
  if (inventory) {
    pushContextLine(lines, '背包摘要', inventory.slotUsageLabel, 100);
    pushContextList(lines, '关键资源', inventory.keyResourceLabels, 5, 60);
    pushContextList(lines, '资源缺口', inventory.shortageLabels, 5, 80);
    pushContextList(lines, '工具等级', inventory.toolLevelLabels, 7, 40);
    pushContextLine(lines, '工具升级', inventory.pendingToolUpgradeLabel, 80);
  }
  if (farming) {
    pushContextLine(lines, '农田摘要', farming.plotStatusLabel, 120);
    pushContextList(lines, '可收获', farming.harvestableLabels, 4, 60);
    pushContextList(lines, '缺水提醒', farming.waterRiskLabels, 4, 60);
    pushContextList(lines, '换季风险', farming.seasonRiskLabels, 4, 80);
    pushContextLine(lines, '温室摘要', farming.greenhouseLabel, 80);
  }
  if (animals) {
    pushContextList(lines, '动物建筑', animals.buildingLabels, 4, 50);
    pushContextLine(lines, '动物摘要', animals.animalStatusLabel, 100);
    pushContextList(lines, '动物产出', animals.productLabels, 4, 80);
    pushContextList(lines, '照料提醒', animals.careAlertLabels, 4, 80);
  }
  if (buildings) {
    pushContextLine(lines, '农舍等级', buildings.farmhouseLabel, 80);
    pushContextLine(lines, '建筑温室', buildings.greenhouseLabel, 80);
    pushContextList(lines, '建筑等级', buildings.animalBuildingLabels, 4, 50);
    pushContextLine(lines, '村庄工程', buildings.villageProjectLabel, 100);
    pushContextList(lines, '可推进工程', buildings.availableProjectLabels, 4, 60);
  }
  if (quests) {
    pushContextLine(lines, '主线任务', quests.mainQuestLabel, 100);
    pushContextList(lines, '主线目标', quests.mainQuestObjectiveLabels, 4, 90);
    pushContextList(lines, '当前任务', quests.activeQuestLabels, 4, 90);
    pushContextList(lines, '告示板任务', quests.boardQuestLabels, 3, 90);
    pushContextLine(lines, '特殊订单', quests.specialOrderLabel, 100);
    pushContextLine(lines, '限时任务摘要', quests.limitedTimeQuestLabel, 100);
    pushContextList(lines, '可领奖励', quests.claimableLabels, 5, 80);
    pushContextList(lines, '阻塞条件', quests.blockerLabels, 5, 90);
    pushContextList(lines, '任务缺口', quests.shortageLabels, 5, 80);
  }
  if (lateGame) {
    pushContextLine(lines, '鱼塘摘要', lateGame.fishPondLabel, 120);
    pushContextList(lines, '鱼塘提醒', lateGame.fishPondAlertLabels, 4, 80);
    pushContextLine(lines, '育种摘要', lateGame.breedingLabel, 120);
    pushContextList(lines, '育种提醒', lateGame.breedingAlertLabels, 4, 80);
    pushContextLine(lines, '博物馆摘要', lateGame.museumLabel, 120);
    pushContextList(lines, '博物馆提醒', lateGame.museumAlertLabels, 4, 80);
    pushContextLine(lines, '公会摘要', lateGame.guildLabel, 120);
    pushContextList(lines, '公会提醒', lateGame.guildAlertLabels, 4, 80);
    pushContextLine(lines, '瀚海摘要', lateGame.hanhaiLabel, 120);
    pushContextList(lines, '瀚海提醒', lateGame.hanhaiAlertLabels, 4, 80);
  }
  if (online) {
    pushContextLine(lines, '云存档摘要', online.saveSyncLabel, 120);
    pushContextLine(lines, '邮箱摘要', online.mailboxLabel, 100);
    pushContextList(lines, '邮箱可领取', online.mailClaimableLabels, 4, 70);
    pushContextLine(lines, '交流大厅提示', online.hallLabel, 120);
    pushContextLine(lines, '节会房间', online.festivalRoomLabel, 120);
    pushContextLine(lines, '委托交付', online.coopOrderLabel, 120);
    pushContextLine(lines, '委托补偿', online.coopCompensationLabel, 100);
    pushContextLine(lines, '同住摘要', online.cohabitationLabel, 120);
    pushContextLine(lines, '村社摘要', online.societyLabel, 120);
    pushContextList(lines, '在线提醒', online.onlineAlertLabels, 5, 80);
  }
  pushContextLine(lines, '本周主题', context.currentThemeWeekLabel);
  pushContextLine(lines, '当前活动', context.currentEventCampaignLabel);
  pushContextLine(lines, '限时任务', context.currentLimitedQuestLabel);
  pushContextLine(lines, '本周主线', context.primaryRouteLabel);
  pushContextList(lines, '辅助路线', context.secondaryRouteLabels, 3, 60);
  pushContextList(lines, '可领奖点', context.claimableNodeLabels, 4, 80);
  pushContextLine(lines, '下周准备', context.nextWeekPrepSummary, 180);
  pushContextLine(lines, '家庭焦点', context.activeFamilyWishTitle);
  pushContextLine(lines, '仙缘焦点', context.bondedSpiritName);
  pushContextList(lines, '推荐路线', context.highlightedRouteLabels, 4, 60);
  pushContextList(lines, '邮件节奏', context.previewMailTitles, 4, 60);
  return finalizeContextSnapshotText(lines);
}

async function askInternal(question, options = {}, debug = false) {
  const trimmedQuestion = String(question || '').trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) throw createError('问题不能为空');

  const timings = { startedAt: Date.now() };
  const sourceReadEnabled = options.sourceReadEnabled === true
    ? true
    : options.sourceReadEnabled === false
      ? false
      : cfg.get('ai_assistant_source_read_enabled') === true;
  const sourceIngestEnabled = options.sourceIngestEnabled === true
    ? true
    : options.sourceIngestEnabled === false
      ? false
      : cfg.get('ai_assistant_source_ingest_enabled') === true;

  const publicConfig = getPublicConfig();
  if (!publicConfig.enabled) throw createError('AI 助手当前已关闭', 403);

  const mode = publicConfig.mode;
  if (detectSensitiveQuestion(trimmedQuestion, mode)) {
    const outputGuard = { blocked: true, reasons: ['input_sensitive'], originalProvider: 'guard' };
    const guardResult = {
      answer:
        '这个问题涉及敏感或不对玩家公开的内容。当前 AI 助手不会提供隐藏数值、掉率、后台规则、风控逻辑、密钥或可能影响公平性的实现细节。',
      sources: [],
      evidence: [],
      traceSummary: buildAiAssistantTraceSummary({
        provider: 'guard',
        mode,
        evidence: [],
        outputGuard,
      }),
      mode,
      provider: 'guard',
      suggestions: [],
    };

    if (!debug) return guardResult;
    return {
      ...guardResult,
      trace: {
        question: trimmedQuestion,
        routeName: String(options.routeName || '').trim(),
        contextLabel: String(options.contextLabel || '').trim(),
        mode,
        provider: 'guard',
        queryPlan: parseCodeQuestion(trimmedQuestion, String(options.routeName || '').trim()),
        sourceSearch: { enabled: sourceReadEnabled, executed: false, ingestEnabled: sourceIngestEnabled },
        candidates: {
          knowledgeMatches: [],
          sourceDirectoryHits: [],
          sourceSymbolHits: [],
          sourceIndexHits: [],
          sourceContextHits: [],
          finalMatches: [],
        },
        evidence: [],
        model: { used: false, blocked: true, rawOutput: '', structured: null, error: '' },
        outputGuard,
        timings: { totalMs: Date.now() - timings.startedAt },
        finalAnswer: guardResult.answer,
      },
    };
  }

  const routeName = String(options.routeName || '').trim();
  const baseContextLabel = normalizeContextText(
    options.publicRequest === true
      ? ROUTE_LABELS[routeName] || ''
      : options.contextLabel || ROUTE_LABELS[routeName] || '',
    80
  );
  const contextSnapshotText = buildContextSnapshotText(options.contextSnapshot);
  const contextLabel = [baseContextLabel, contextSnapshotText].filter(Boolean).join(' / ');
  const queryPlan = parseCodeQuestion(trimmedQuestion, routeName);
  timings.afterParseMs = Date.now() - timings.startedAt;
  const diagnostics = buildAiAssistantLocalDiagnostics(options.contextSnapshot, {
    queryPlan,
    routeName,
    question: trimmedQuestion,
  });
  timings.afterDiagnosticsMs = Date.now() - timings.startedAt;
  const threeStepSuggestions = buildAiAssistantThreeStepSuggestions(options.contextSnapshot, {
    queryPlan,
    routeName,
    question: trimmedQuestion,
    diagnostics,
  });
  timings.afterSuggestionsMs = Date.now() - timings.startedAt;
  const knowledgeMatches = retrieveKnowledge(trimmedQuestion, routeName, mode, queryPlan);
  timings.afterKnowledgeMs = Date.now() - timings.startedAt;
  const recallResult = recallSearchCandidates(trimmedQuestion, routeName, mode, queryPlan, knowledgeMatches, {
    sourceReadEnabled,
  });
  const {
    shouldSourceSearch,
    sourceDirectoryHits,
    sourceSymbolHits,
    sourceIndexHits,
    sourceHits,
    finalMatches: matches,
  } = recallResult;
  timings.afterSourceMs = Date.now() - timings.startedAt;
  const evidence = buildEvidencePayload(matches);
  timings.afterRerankMs = Date.now() - timings.startedAt;

  if (sourceHits.length && sourceIngestEnabled) {
    try { upsertAutoKnowledgeFromSource(trimmedQuestion, routeName, sourceHits); } catch {}
  }

  let answer = '';
  let provider = 'local';
  let modelTrace = { used: false, rawOutput: '', structured: null, error: '' };
  const composeLocal = () => composeLocalAnswer({
    question: trimmedQuestion,
    routeName,
    contextLabel,
    matches,
    mode,
    queryPlan,
    diagnostics,
    contextSnapshot: options.contextSnapshot,
  });

  try {
    if (publicConfig.providerConfigured) {
      const circuitStatus = getRemoteModelCircuitStatus();
      const budgetResult = options.publicRequest === true && !circuitStatus.open
        ? consumePublicRemoteModelBudget({ question: trimmedQuestion, contextLabel, snippets: matches })
        : { ok: true };

      if (circuitStatus.open) {
        answer = appendRemoteModelFallbackNotice(composeLocal(), '模型熔断保护');
        provider = 'fallback';
        modelTrace = {
          used: false,
          rawOutput: '',
          structured: null,
          error: 'model_circuit_open',
          circuit: circuitStatus,
        };
      } else if (!budgetResult.ok) {
        answer = `${composeLocal()}\n\n（提示：公开问答已达到今日远程模型预算，本次使用内置知识库回答。）`;
        provider = 'local';
        modelTrace = {
          used: false,
          rawOutput: '',
          structured: null,
          error: `public_remote_budget:${budgetResult.reason}`,
        };
      } else {
        let modelResult;
        try {
          modelResult = await callRemoteModel({
            question: trimmedQuestion,
            contextLabel,
            mode,
            snippets: matches,
            queryPlan,
          });
          recordRemoteModelSuccess();
        } catch (error) {
          recordRemoteModelFailure(error);
          throw error;
        }
        answer = modelResult.answer;
        provider = 'model';
        modelTrace = {
          used: true,
          rawOutput: modelResult.rawOutput,
          structured: modelResult.structured,
          error: '',
        };
      }
    } else {
      answer = composeLocal();
    }
  } catch (error) {
    answer = appendRemoteModelFallbackNotice(composeLocal(), '模型响应失败或超时');
    provider = 'fallback';
    modelTrace = {
      used: publicConfig.providerConfigured,
      rawOutput: '',
      structured: null,
      error: error?.message || '远程模型调用失败',
      circuit: getRemoteModelCircuitStatus(),
    };
  }

  answer = appendThreeStepSuggestionsToAnswer(answer, threeStepSuggestions);

  let outputGuard = scanAiAssistantOutput(answer, {
    provider,
    mode,
    publicRequest: options.publicRequest === true,
    debug,
  });
  if (outputGuard.blocked) {
    outputGuard = { ...outputGuard, originalProvider: provider };
    answer = outputGuard.safeAnswer;
    provider = 'guard';
    modelTrace = sanitizeModelTraceForOutputGuard(modelTrace);
  }

  timings.totalMs = Date.now() - timings.startedAt;
  const publicEvidence = outputGuard.blocked ? [] : buildPublicEvidenceSummary(matches);
  const publicSuggestions = outputGuard.blocked ? [] : threeStepSuggestions.suggestions;
  const traceSummary = buildAiAssistantTraceSummary({
    provider,
    mode,
    evidence: publicEvidence,
    modelTrace,
    outputGuard,
  });

  const result = {
    answer,
    sources: outputGuard.blocked
      ? []
      : unique([
          ...knowledgeMatches.map(item => item.title),
          ...sourceDirectoryHits.map(item => item.path),
          ...sourceSymbolHits.map(item => item.path),
          ...sourceIndexHits.map(item => item.path),
          ...sourceHits.map(item => item.path),
    ]),
    evidence: publicEvidence,
    suggestions: publicSuggestions,
    traceSummary,
    mode,
    provider,
  };

  if (!debug) return result;

  return {
    ...result,
    trace: buildAskTrace({
      question: trimmedQuestion,
      routeName,
      contextLabel,
      mode,
      provider,
      queryPlan,
      knowledgeMatches,
      sourceDirectoryHits,
      sourceSymbolHits,
      sourceIndexHits,
      sourceHits,
      matches,
      evidence,
      shouldSourceSearch,
      sourceReadEnabled,
      sourceIngestEnabled,
      modelTrace,
      outputGuard,
      diagnostics,
      threeStepSuggestions: outputGuard.blocked
        ? { available: false, routeName: '', routeLabel: '', summary: '', suggestions: [] }
        : threeStepSuggestions,
      timings,
      answer,
    }),
  };
}

async function ask(question, options = {}) {
  return askInternal(question, options, false);
}

async function askPublic(question, options = {}) {
  return askInternal(question, {
    ...options,
    sourceReadEnabled: false,
    sourceIngestEnabled: false,
    publicRequest: true,
  }, false);
}

async function askDebug(question, options = {}) {
  return askInternal(question, options, true);
}

module.exports = {
  ROUTE_LABELS,
  OFFICIAL_MANAGED_AI_FIELDS,
  getPublicConfig,
  getAdminConfig,
  getSourceIndexStatus,
  rebuildSourceIndex,
  getNounLexiconStatus,
  rebuildNounLexicon,
  setAdminConfig,
  listKnowledgeEntries,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  publishKnowledgeEntry,
  searchSourceSymbols,
  searchSourceIndex,
  searchSourceContext,
  draftKnowledgeFromSource,
  askDebug,
  ask,
  askPublic,
  getAskStreamPhases,
  buildAskStreamResultEvents,
  __testing: {
    resetPublicRemoteModelBudgetForTests,
    resetRemoteModelCircuitForTests,
    getRemoteModelCircuitStatus,
    scanAiAssistantOutputForTests: scanAiAssistantOutput,
    resolveQueryPlanForTests: resolveQueryPlan,
    extractQuerySlotsForTests: extractQuerySlots,
    buildLocalDiagnosticsForTests: buildAiAssistantLocalDiagnostics,
    buildThreeStepSuggestionsForTests: buildAiAssistantThreeStepSuggestions,
  },
};
