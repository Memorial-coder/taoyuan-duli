const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const aiAssistantAnswerComposer = require('./taoyuanAi/answerComposer');
const aiAssistantConfigService = require('./taoyuanAi/configService');
const {
  buildContextSnapshotText,
  getContextObject,
  normalizeContextList,
  normalizeContextText,
} = require('./taoyuanAi/contextSnapshotService');
const { summarizeLocalDiagnosticsForTrace } = require('./taoyuanAi/diagnosticsService');
const {
  buildTaskDiagnosis: buildTaskDiagnosisWithService,
  createEmptyTaskDiagnosisResult,
  normalizeTaskDiagnosisText,
} = require('./taoyuanAi/taskDiagnosisService');
const aiAssistantKnowledgeStore = require('./taoyuanAi/knowledgeStore');
const {
  appendBaseStateDiagnosticSignals: appendBaseStateDiagnosticSignalsWithService,
  appendBuildingDiagnosticSignals: appendBuildingDiagnosticSignalsWithService,
  appendFarmingDiagnosticSignals: appendFarmingDiagnosticSignalsWithService,
  appendInventoryDiagnosticSignals: appendInventoryDiagnosticSignalsWithService,
  appendLateGameDiagnosticSignals: appendLateGameDiagnosticSignalsWithService,
  appendOnlineDiagnosticSignals: appendOnlineDiagnosticSignalsWithService,
  appendQuestDiagnosticSignals: appendQuestDiagnosticSignalsWithService,
  appendTaskDiagnosisDiagnosticSignal: appendTaskDiagnosisDiagnosticSignalWithService,
  appendWeeklyPlanDiagnosticSignals: appendWeeklyPlanDiagnosticSignalsWithService,
  buildLocalDiagnosticsResult,
  createEmptyLocalDiagnosticsResult,
} = require('./taoyuanAi/localDiagnosticsService');
const aiAssistantModelClient = require('./taoyuanAi/modelClient');
const { validateModelApiUrl: validateModelApiUrlGuard } = require('./taoyuanAi/modelApiUrlGuard');
const aiAssistantThreeStepSuggestionsService = require('./taoyuanAi/threeStepSuggestionsService');
const {
  buildSourceDirectoryMatches: buildSourceDirectoryMatchesWithService,
  buildSourceIndexMatches: buildSourceIndexMatchesWithService,
  buildSourceKnowledgeMatches: buildSourceKnowledgeMatchesWithService,
  buildSourceSymbolMatches: buildSourceSymbolMatchesWithService,
  buildDirectoryFullFileMatches: buildDirectoryFullFileMatchesWithService,
  buildRecallCandidatePools: buildRecallCandidatePoolsWithService,
  createFullFileMatch: createFullFileMatchWithService,
  dedupeRetrievedMatches: dedupeRetrievedMatchesWithService,
  expandRetrievedMatchesToFullFiles: expandRetrievedMatchesToFullFilesWithService,
  formatFullSourceContentForEvidence: formatFullSourceContentForEvidenceWithService,
  rerankRetrievedMatches: rerankRetrievedMatchesWithService,
  sanitizeFullSourceContent: sanitizeFullSourceContentWithService,
  selectExpandedFullFileMatches: selectExpandedFullFileMatchesWithService,
  shouldSearchSource: shouldSearchSourceWithService,
} = require('./taoyuanAi/retrievalService');
const {
  detectSourceModuleType: detectSourceModuleTypeWithService,
  buildNounLexiconFingerprint: buildNounLexiconFingerprintWithService,
  buildNounLexiconStatus: buildNounLexiconStatusWithService,
  buildSourceIndexEntryFromContent: buildSourceIndexEntryFromContentWithService,
  buildSourceIndexFingerprint: buildSourceIndexFingerprintWithService,
  buildSourceIndexStatus: buildSourceIndexStatusWithService,
  buildSourceIndexStoreFromFiles: buildSourceIndexStoreFromFilesWithService,
  collectSourceSearchHits: collectSourceSearchHitsWithService,
  collectSourceFiles: collectSourceFilesWithService,
  collectSemanticBlocksForText: collectSemanticBlocksForTextWithService,
  createSourceIndexCachePayload: createSourceIndexCachePayloadWithService,
  createNounLexiconCachePayload: createNounLexiconCachePayloadWithService,
  createSourceDirectorySummaryEntry: createSourceDirectorySummaryEntryWithService,
  createSourceSymbolEntriesForText: createSourceSymbolEntriesForTextWithService,
  hasSupportedSourceExtension: hasSupportedSourceExtensionWithService,
  isDirectoryLikeTarget: isDirectoryLikeTargetWithService,
  loadNounLexiconStoreFromFile,
  matchesExplicitPath: matchesExplicitPathWithService,
  loadSourceIndexStoreFromFile,
  moduleHintMatches: moduleHintMatchesWithService,
  normalizePathTarget: normalizePathTargetWithService,
  resolveExplicitDirectoryTarget: resolveExplicitDirectoryTargetWithService,
  resolveWhitelistRelativeFilePath: resolveWhitelistRelativeFilePathWithService,
  resolveSourceIndexEntries: resolveSourceIndexEntriesWithService,
  resolveNounLexiconEntries: resolveNounLexiconEntriesWithService,
  rebuildSourceIndexEntries: rebuildSourceIndexEntriesWithService,
  rebuildNounLexiconEntries: rebuildNounLexiconEntriesWithService,
  scoreExplicitPathMatch: scoreExplicitPathMatchWithService,
  scoreModuleTypePreference: scoreModuleTypePreferenceWithService,
  scorePathPreference: scorePathPreferenceWithService,
  scoreSourceFile: scoreSourceFileWithService,
  searchSourceContext: searchSourceContextWithService,
  searchSourceDirectories: searchSourceDirectoriesWithService,
  searchSourceIndex: searchSourceIndexWithService,
  searchSourceSymbols: searchSourceSymbolsWithService,
  saveNounLexiconStoreToFile,
  saveSourceIndexStoreToFile,
} = require('./taoyuanAi/sourceIndexService');
const remoteModelRuntime = require('./taoyuanAi/remoteModelRuntime');
const {
  detectSensitiveQuestion: detectSensitiveQuestionWithRules,
  isUnsafePublicSummaryText,
  scanAiAssistantOutput,
  sanitizeModelTraceForOutputGuard,
} = require('./taoyuanAi/safetyGuard');
const {
  OFFICIAL_MANAGED_AI_FIELDS,
  migrateLegacyStoredApiKey,
  getEffectiveApiKeySecret,
  buildPublicAiAssistantConfig,
  buildAdminAiAssistantConfig,
  saveAdminAiAssistantConfig,
} = aiAssistantConfigService;
const {
  loadKnowledgeStoreFromFile,
  saveKnowledgeStoreToFile,
  buildBuiltinKnowledgeEntries,
  getManagedKnowledgeEntriesFromStore,
  buildPublishedKnowledgeEntries,
  buildActiveKnowledgeEntries,
  createKnowledgeEntryInStore,
  updateKnowledgeEntryInStore,
  publishKnowledgeEntryInStore,
  deleteKnowledgeEntryInStore,
  draftKnowledgeFromSource: draftKnowledgeFromSourceWithStore,
  upsertAutoKnowledgeFromSourceInStore,
  buildStructuredKnowledgeFingerprint: buildStructuredKnowledgeFingerprintWithStore,
  loadStructuredKnowledgeEntriesFromFiles,
  buildBuiltinSearchRules: buildBuiltinSearchRulesWithStore,
  buildSearchRulesFingerprint: buildSearchRulesFingerprintWithStore,
  mergeSearchRules: mergeSearchRulesWithStore,
  compileSearchRules: compileSearchRulesWithStore,
  buildQuerySlotAliasCatalog: buildQuerySlotAliasCatalogWithStore,
  retrieveStructuredKnowledgeCandidates: retrieveStructuredKnowledgeCandidatesWithStore,
} = aiAssistantKnowledgeStore;
const {
  consumePublicRemoteModelBudget,
  resetPublicRemoteModelBudgetForTests,
  getRemoteModelCircuitStatus,
  recordRemoteModelSuccess,
  recordRemoteModelFailure,
  resetRemoteModelCircuitForTests,
} = remoteModelRuntime;
const {
  appendRemoteModelFallbackNotice,
  buildResourceRecommendedRoute,
  composeLocalAnswerFromMatches,
  sanitizePublicSummaryText,
  buildPublicEvidenceSummary,
  buildAiAssistantTraceSummary,
  getAskStreamPhases,
  buildAskStreamResultEvents,
} = aiAssistantAnswerComposer;
const {
  callRemoteModel,
  callRemoteSemanticPrepass,
} = aiAssistantModelClient;
const {
  appendThreeStepSuggestionsToAnswer,
  buildAiAssistantThreeStepSuggestions: buildAiAssistantThreeStepSuggestionsWithService,
  summarizeThreeStepSuggestionsForTrace,
} = aiAssistantThreeStepSuggestionsService;

remoteModelRuntime.configureRemoteModelRuntime({
  getConfigValue: name => cfg.get(name),
});
aiAssistantConfigService.configureAiAssistantConfigService({ configStore: cfg });
aiAssistantModelClient.configureAiAssistantModelClient({
  getAdminConfig,
  getEffectiveApiKeySecret,
  validateModelApiUrl,
  buildEvidencePayload,
});

const ROUTE_LABELS = {
  menu: '主菜单',
  hall: '交流大厅',
  farm: '农场',
  animal: '畜棚与宠物',
  home: '家园',
  cottage: '小屋与家庭',
  village: '村庄与 NPC',
  'friend-chat': '好友聊天',
  shop: '商店',
  forage: '采集',
  fishing: '钓鱼',
  mining: '矿洞',
  cooking: '烹饪',
  workshop: '作坊加工',
  upgrade: '工具升级',
  inventory: '背包',
  skills: '技能',
  potential: '潜能',
  achievement: '成就',
  goals: '目标',
  wallet: '钱包兑换',
  quest: '任务',
  charinfo: '角色信息',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  fishpond: '鱼塘',
};

const ROUTE_NAME_BY_LABEL = Object.fromEntries(
  Object.entries(ROUTE_LABELS).map(([routeName, label]) => [normalizeText(label), routeName])
);

const SEMANTIC_PREPASS_CONFIDENCE_THRESHOLD = 0.35;
const SEMANTIC_PREPASS_TIMEOUT_MS = 8000;
const SEMANTIC_ALLOWED_INTENTS = new Set([
  'find_source',
  'explain_usage',
  'diagnose_task',
  'plan_today',
  'explain_page',
  'explain_system',
  'remind_risk',
  'suggest_next_step',
  'gameplay_qa',
]);
const SEMANTIC_INTENT_ALIASES = {
  'resource-source': 'find_source',
  resource_source: 'find_source',
  source: 'find_source',
  usage: 'explain_usage',
  resource_use: 'explain_usage',
  'resource-use': 'explain_usage',
  task_diagnosis: 'diagnose_task',
  'task-diagnosis': 'diagnose_task',
  today_planning: 'plan_today',
  'today-planning': 'plan_today',
  page_explanation: 'explain_page',
  'page-explanation': 'explain_page',
  system_mechanic: 'explain_system',
  'system-mechanic': 'explain_system',
  risk_reminder: 'remind_risk',
  'risk-reminder': 'remind_risk',
  next_step_suggestion: 'suggest_next_step',
  'next-step-suggestion': 'suggest_next_step',
};
const SEMANTIC_ALLOWED_QUESTION_TYPES = new Set([
  'resource-source',
  'resource-use',
  'shop-purchase',
  'task-diagnosis',
  'today-planning',
  'page-explanation',
  'system-mechanic',
  'risk-reminder',
  'next-step-suggestion',
  'precondition',
  'recipe',
  'page-feature',
  'fish-condition',
]);
const SEMANTIC_QUESTION_TYPE_ALIASES = {
  resource_source: 'resource-source',
  resource_use: 'resource-use',
  shop_purchase: 'shop-purchase',
  task_diagnosis: 'task-diagnosis',
  today_planning: 'today-planning',
  page_explanation: 'page-explanation',
  system_mechanic: 'system-mechanic',
  risk_reminder: 'risk-reminder',
  next_step_suggestion: 'next-step-suggestion',
  page_feature: 'page-feature',
  fish_condition: 'fish-condition',
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

function validateModelApiUrl(apiUrl = '') {
  return validateModelApiUrlGuard(apiUrl, {
    allowlist: parseModelApiUrlAllowlist(),
    production: isProductionRuntime(),
  });
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
  { type: 'resource-source', test: /在哪里|在哪|去哪|怎么获得|怎么获取|怎么搞|怎么弄|咋搞|咋弄|怎么拿|哪里拿|哪里弄|哪里搞|去哪弄|去哪搞|从哪弄|在哪弄|最快怎么拿|来源|从哪来|哪来|哪里出|哪掉|刷哪|掉落|产出|获取|差.*去|差.*哪|缺.*去|缺.*哪/i },
  { type: 'resource-use', test: /用途|有什么用|用来|拿来|能做什么|需要|消耗|要几个|要多少/i },
  { type: 'shop-purchase', test: /在哪买|哪里买|购买|商店|药铺|渔具铺|铁匠铺|万物铺/i },
  { type: 'task-diagnosis', test: /任务|委托|订单|卡住|卡了|为啥.*卡|为什么.*卡|过不去|交不了|缺什么|缺口|差.*个|差.*条|差.*哪|缺.*哪|帮我看.*任务|看下.*任务|帮我看看.*任务|交付|要的|卡关/i },
  { type: 'today-planning', test: /今天|当前|现在|先做|该做|该干啥|该去哪|现在干啥|今天干啥|干啥|做啥|干什么|做什么|帮我安排|帮我看看|看下现在|安排|规划|要干嘛/i },
  { type: 'page-explanation', test: /页面|界面|入口|在哪看|怎么看|怎么重连|开吗|开放吗/i },
  { type: 'system-mechanic', test: /系统|机制|怎么玩|周赛|育种|鱼塘|博物馆|公会|瀚海|商路|节会|灯会/i },
  { type: 'risk-reminder', test: /风险|提醒|快到期|换季|背包满|体力不足|现金不足|生病|来不及|有没有坑|别踩坑|注意啥|要注意|会不会亏|来得及吗/i },
  { type: 'next-step-suggestion', test: /下一步|下一步干啥|接下来|接下来干啥|接着干啥|路线|往哪走|去哪做|推进|怎么推进|先做|要干嘛|怎么办|咋办|咋整|然后呢/i },
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

aiAssistantAnswerComposer.configureAiAssistantAnswerComposer({
  routeLabels: ROUTE_LABELS,
  sourceModuleLabels: SOURCE_MODULE_LABELS,
  isUnsafePublicSummaryText,
});

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
  return loadKnowledgeStoreFromFile(KNOWLEDGE_FILE);
}

function saveKnowledgeStore(store) {
  saveKnowledgeStoreToFile(KNOWLEDGE_FILE, store);
}

function loadSourceIndexStore() {
  return loadSourceIndexStoreFromFile(SOURCE_INDEX_FILE, {
    version: SOURCE_INDEX_VERSION,
    requireVersion: true,
  });
}

function saveSourceIndexStore(store) {
  saveSourceIndexStoreToFile(SOURCE_INDEX_FILE, store, { version: SOURCE_INDEX_VERSION });
}

function loadNounLexiconStore() {
  return loadNounLexiconStoreFromFile(NOUN_LEXICON_FILE, {
    version: NOUN_LEXICON_VERSION,
    requireVersion: true,
  });
}

function saveNounLexiconStore(store) {
  saveNounLexiconStoreToFile(NOUN_LEXICON_FILE, store, { version: NOUN_LEXICON_VERSION });
}

function buildBuiltinSearchRules() {
  return buildBuiltinSearchRulesWithStore({
    queryHintRules: SOURCE_QUERY_HINT_RULES,
    synonymRules: SOURCE_SYNONYM_RULES,
    conceptExpansionRules: SOURCE_CONCEPT_EXPANSION_RULES,
    routeLabels: ROUTE_LABELS,
  });
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
  return buildSearchRulesFingerprintWithStore(
    buildBuiltinSearchRules(),
    [DEFAULT_SEARCH_RULES_FILE, SEARCH_RULES_FILE]
  );
}

function sanitizeStringArray(value) {
  return unique(
    toArray(value)
      .map(item => String(item || '').trim())
      .filter(Boolean)
  );
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

  const merged = mergeSearchRulesWithStore(
    buildBuiltinSearchRules(),
    safeReadJsonFile(DEFAULT_SEARCH_RULES_FILE, {}),
    safeReadJsonFile(SEARCH_RULES_FILE, {})
  );
  const compiled = compileSearchRulesWithStore(merged, { routeLabels: ROUTE_LABELS });
  searchRulesCache = {
    loadedAt: Date.now(),
    fingerprint,
    compiled,
  };
  return compiled;
}

function getStructuredKnowledgeEntries() {
  const structuredKnowledgeFiles = [DEFAULT_STRUCTURED_KNOWLEDGE_FILE, STRUCTURED_KNOWLEDGE_FILE];
  const fingerprint = buildStructuredKnowledgeFingerprintWithStore(structuredKnowledgeFiles);
  if (
    structuredKnowledgeCache.entries.length
    && structuredKnowledgeCache.fingerprint === fingerprint
    && Date.now() - structuredKnowledgeCache.loadedAt < SEARCH_RULES_CACHE_TTL
  ) {
    return structuredKnowledgeCache.entries;
  }

  const entries = loadStructuredKnowledgeEntriesFromFiles(structuredKnowledgeFiles, {
    routeLabels: ROUTE_LABELS,
    sanitizePublicText: sanitizePublicSummaryText,
    readJsonFile: filePath => safeReadJsonFile(filePath, {}),
  });
  structuredKnowledgeCache = {
    loadedAt: Date.now(),
    fingerprint,
    entries,
  };
  return structuredKnowledgeCache.entries;
}

function retrieveStructuredKnowledge(question, routeName, queryPlan = {}) {
  return retrieveStructuredKnowledgeCandidatesWithStore(
    getStructuredKnowledgeEntries(),
    question,
    routeName,
    queryPlan,
    { normalizeText, limit: 4 }
  );
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

function createEmptyQuerySlots() {
  return QUERY_SLOT_FIELDS.reduce((acc, field) => {
    acc[field] = [];
    return acc;
  }, {});
}

function sanitizeSlotText(value = '', maxLength = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function buildQuerySlotAliasCatalog() {
  return buildQuerySlotAliasCatalogWithStore({
    rules: getSearchRules(),
    structuredEntries: getStructuredKnowledgeEntries(),
    routeLabels: ROUTE_LABELS,
    querySlotFields: QUERY_SLOT_FIELDS,
    querySlotTypeToField: QUERY_SLOT_TYPE_TO_FIELD,
    seasonSlotCandidates: SEASON_SLOT_CANDIDATES,
    structuredItemKinds: STRUCTURED_ITEM_KINDS,
    structuredSystemKinds: STRUCTURED_SYSTEM_KINDS,
    structuredTaskRecordTypes: STRUCTURED_TASK_RECORD_TYPES,
    structuredLocationRecordTypes: STRUCTURED_LOCATION_RECORD_TYPES,
    locationRouteNames: LOCATION_ROUTE_NAMES,
    normalizeText,
  });
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
  return buildNounLexiconFingerprintWithService(filePaths, {
    version: NOUN_LEXICON_VERSION,
    searchRulesFingerprint: buildSearchRulesFingerprint(),
    routeLabels: ROUTE_LABELS,
    toRelativePath: toWhitelistRelative,
  });
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

function buildNounLexiconStore(filePaths = collectSourceFiles(), fingerprint = buildNounLexiconFingerprint(filePaths)) {
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

  // B3: published knowledge entries (builtin + managed) into lexicon.
  for (const entry of getPublishedKnowledgeEntries()) {
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
  const store = {
    version: NOUN_LEXICON_VERSION,
    builtAt: Date.now(),
    fingerprint,
    fileCount: filePaths.length,
    entryCount: entries.length,
    entries,
  };

  saveNounLexiconStore(store);
  nounLexiconCache = createNounLexiconCachePayloadWithService(store, {
    version: NOUN_LEXICON_VERSION,
    loadedAt: Date.now(),
  });
  return store;
}

function buildNounLexiconEntries(filePaths = collectSourceFiles(), fingerprint = buildNounLexiconFingerprint(filePaths)) {
  return buildNounLexiconStore(filePaths, fingerprint).entries;
}

function getNounLexiconEntries() {
  const result = resolveNounLexiconEntriesWithService({
    cache: nounLexiconCache,
    cacheTtlMs: NOUN_LEXICON_CACHE_TTL,
    collectFilePaths: collectSourceFiles,
    buildFingerprint: buildNounLexiconFingerprint,
    loadPersistedStore: loadNounLexiconStore,
    version: NOUN_LEXICON_VERSION,
    buildStore: buildNounLexiconStore,
  });
  nounLexiconCache = result.cache;
  return result.entries;
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
  return buildNounLexiconStatusWithService(loadNounLexiconStore(), { version: NOUN_LEXICON_VERSION });
}

function rebuildNounLexicon() {
  const result = rebuildNounLexiconEntriesWithService({
    collectFilePaths: collectSourceFiles,
    buildFingerprint: buildNounLexiconFingerprint,
    version: NOUN_LEXICON_VERSION,
    buildStore: buildNounLexiconStore,
  });
  nounLexiconCache = result.cache;
  return result.status;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getBuiltinKnowledgeEntries() {
  return buildBuiltinKnowledgeEntries(BUILTIN_KNOWLEDGE_BASE);
}

function getPublishedKnowledgeEntries() {
  return buildPublishedKnowledgeEntries(getBuiltinKnowledgeEntries(), getManagedKnowledgeEntries());
}

function getManagedKnowledgeEntries() {
  return getManagedKnowledgeEntriesFromStore(loadKnowledgeStore());
}

function listKnowledgeEntries() {
  return [...getBuiltinKnowledgeEntries(), ...getManagedKnowledgeEntries()];
}

function getActiveKnowledgeEntries() {
  return buildActiveKnowledgeEntries(getBuiltinKnowledgeEntries(), getManagedKnowledgeEntries());
}

function publishKnowledgeEntry(id) {
  const result = publishKnowledgeEntryInStore(loadKnowledgeStore(), id);
  saveKnowledgeStore(result.store);
  return result.entry;
}

function createKnowledgeEntry(input = {}) {
  const result = createKnowledgeEntryInStore(loadKnowledgeStore(), input);
  saveKnowledgeStore(result.store);
  return result.entry;
}

function updateKnowledgeEntry(id, updates = {}) {
  const result = updateKnowledgeEntryInStore(loadKnowledgeStore(), id, updates);
  saveKnowledgeStore(result.store);
  return result.entry;
}

function deleteKnowledgeEntry(id) {
  const result = deleteKnowledgeEntryInStore(loadKnowledgeStore(), id);
  saveKnowledgeStore(result.store);
  return result.entry;
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
  return normalizePathTargetWithService(value);
}

function hasSupportedSourceExtension(value = '') {
  return hasSupportedSourceExtensionWithService(value);
}

function isDirectoryLikeTarget(value = '') {
  return isDirectoryLikeTargetWithService(value, SOURCE_WHITELIST);
}

function scoreExplicitPathMatch(candidatePath = '', target = '') {
  return scoreExplicitPathMatchWithService(candidatePath, target);
}

function matchesExplicitPath(candidatePath = '', target = '') {
  return matchesExplicitPathWithService(candidatePath, target);
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
  return moduleHintMatchesWithService(moduleHint, moduleType);
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
  if (/哪里买|哪买|买|购买|获得|获取|来源|掉落|产出|怎么来|怎么搞|怎么弄|咋搞|咋弄|怎么拿|哪里拿|哪里弄|哪里搞|去哪弄|去哪搞|从哪弄|在哪弄|最快怎么拿|从哪来|哪来|去哪|在哪里|在哪|哪里|哪里出|哪掉|刷哪|在哪里买|哪里找|去哪找|差.*哪|缺.*哪/.test(raw)) {
    intents.push('find_source');
  }
  if (/用途|有什么用|用来|拿来|能做什么|需要|消耗|要几个|要多少/.test(raw)) {
    intents.push('explain_usage');
  }
  if (/任务|委托|订单|卡住|卡了|为啥.*卡|为什么.*卡|过不去|交不了|缺什么|缺口|卡关|交付|要的|差.*个|差.*条|差.*哪|缺.*哪|帮我看.*任务|看下.*任务|帮我看看.*任务/.test(raw)) {
    intents.push('diagnose_task');
  }
  if (/今天|当前|现在|先做|该做|该干啥|该去哪|现在干啥|今天干啥|干啥|做啥|干什么|做什么|帮我安排|帮我看看|看下现在|安排|规划|要干嘛/.test(raw)) {
    intents.push('plan_today');
  }
  if (/页面|界面|入口|在哪看|怎么看|怎么重连|开吗|开放吗/.test(raw)) {
    intents.push('explain_page');
  }
  if (/系统|机制|怎么玩|周赛|育种|鱼塘|博物馆|公会|瀚海|商路|节会|灯会/.test(raw)) {
    intents.push('explain_system');
  }
  if (/风险|提醒|快到期|换季|背包满|体力不足|现金不足|生病|来不及|有没有坑|别踩坑|注意啥|要注意|会不会亏|来得及吗/.test(raw)) {
    intents.push('remind_risk');
  }
  if (/下一步|下一步干啥|接下来|接下来干啥|接着干啥|路线|往哪走|去哪做|推进|怎么推进|先做|要干嘛|怎么办|咋办|咋整|然后呢/.test(raw)) {
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
  return scoreModuleTypePreferenceWithService(moduleType, queryPlan);
}

function scorePathPreference(candidatePath = '', queryPlan = null) {
  return scorePathPreferenceWithService(candidatePath, queryPlan);
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

function createSourceSymbolEntriesForFile(filePath, text) {
  const relativePath = toWhitelistRelative(filePath);
  const moduleType = detectSourceModuleType(relativePath);
  const routeHints = inferRouteHints(relativePath, text);
  return createSourceSymbolEntriesForTextWithService(relativePath, text, {
    moduleType,
    routeHints,
    sourceModuleLabels: SOURCE_MODULE_LABELS,
    sourceSymbolKindLabels: SOURCE_SYMBOL_KIND_LABELS,
    skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
  });
}

function getSourceSymbolEntries() {
  getSourceIndexEntries();
  return Array.isArray(sourceIndexCache.symbolEntries) ? sourceIndexCache.symbolEntries : [];
}

function searchSourceSymbols(question, routeName) {
  return searchSourceSymbolsWithService(question, routeName, {
    resolveQueryPlan,
    getSourceSymbolEntries,
  }, {
    limit: SOURCE_INDEX_MAX_HITS,
  });
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

function collectSourceFiles() {
  return collectSourceFilesWithService(SOURCE_WHITELIST, {
    allowedExtensions: SOURCE_ALLOWED_EXTENSIONS,
    maxFileSize: SOURCE_MAX_FILE_SIZE,
    blockedPathPattern: SOURCE_BLOCKED_PATH_PATTERN,
  });
}

function buildSourceIndexFingerprint(filePaths = []) {
  return buildSourceIndexFingerprintWithService(filePaths, {
    version: SOURCE_INDEX_VERSION,
    searchRulesFingerprint: buildSearchRulesFingerprint(),
    nounLexiconFingerprint: buildNounLexiconFingerprint(filePaths),
    toRelativePath: toWhitelistRelative,
  });
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
  return detectSourceModuleTypeWithService(relativePath);
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
  return scoreSourceFileWithService(filePath, text, terms, routeName, explicitTargets, queryPlan, {
    toRelativePath: toWhitelistRelative,
    routeLabels: ROUTE_LABELS,
    detectModuleType: detectSourceModuleType,
  });
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
  return buildSourceIndexEntryFromContentWithService(filePath, rawContent, options, {
    toRelativePath: toWhitelistRelative,
    skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
    detectModuleType: detectSourceModuleType,
    inferRouteHints,
    extractQuestionTypes: extractQuestionTypesFromContent,
    inferSynonyms,
    extractChunkKeywords,
    sourceModuleLabels: SOURCE_MODULE_LABELS,
  });
}

function createSourceIndexEntry(filePath, lines, startLine, endLine, semanticMeta = {}) {
  const chunkLines = lines.slice(startLine, endLine);
  return buildSourceIndexEntryFromContent(filePath, chunkLines.join('\n'), {
    ...semanticMeta,
    startLine: startLine + 1,
    endLine,
  });
}

function collectSemanticBlocksForFile(filePath, text) {
  const relativePath = toWhitelistRelative(filePath);
  const ext = path.extname(relativePath).toLowerCase();
  return collectSemanticBlocksForTextWithService(relativePath, text, {
    ext,
    json: ext === '.json' ? safeReadJsonFile(filePath, null) : undefined,
    maxBlockLines: SOURCE_SEMANTIC_MAX_BLOCK_LINES,
    targetBlockLines: SOURCE_SEMANTIC_TARGET_BLOCK_LINES,
    stripInlineMarkup,
  });
}

function createSourceIndexEntriesForFile(filePath, text) {
  const semanticBlocks = collectSemanticBlocksForFile(filePath, text);
  return semanticBlocks
    .map(block => buildSourceIndexEntryFromContent(filePath, block.content, block))
    .filter(Boolean);
}

function buildSourceIndexStore(filePaths = collectSourceFiles(), fingerprint = buildSourceIndexFingerprint(filePaths)) {
  const store = buildSourceIndexStoreFromFilesWithService(filePaths, fingerprint, {
    readFileText: filePath => fs.readFileSync(filePath, 'utf8'),
    createIndexEntriesForFile: createSourceIndexEntriesForFile,
    createSymbolEntriesForFile: createSourceSymbolEntriesForFile,
  }, {
    version: SOURCE_INDEX_VERSION,
    fingerprint,
  });
  saveSourceIndexStore(store);
  sourceIndexCache = createSourceIndexCachePayloadWithService(store, {
    version: SOURCE_INDEX_VERSION,
    builtAt: Date.now(),
  });
  return store;
}

function buildSourceIndexEntries(filePaths = collectSourceFiles(), fingerprint = buildSourceIndexFingerprint(filePaths)) {
  return buildSourceIndexStore(filePaths, fingerprint).entries;
}

function getSourceIndexEntries() {
  const result = resolveSourceIndexEntriesWithService({
    cache: sourceIndexCache,
    cacheTtlMs: SOURCE_INDEX_CACHE_TTL,
    collectFilePaths: collectSourceFiles,
    buildFingerprint: buildSourceIndexFingerprint,
    loadPersistedStore: loadSourceIndexStore,
    version: SOURCE_INDEX_VERSION,
    buildStore: buildSourceIndexStore,
  });
  sourceIndexCache = result.cache;
  return result.entries;
}

function getSourceIndexStatus() {
  const store = loadSourceIndexStore();
  return buildSourceIndexStatusWithService(store, { version: SOURCE_INDEX_VERSION });
}

function rebuildSourceIndex() {
  const result = rebuildSourceIndexEntriesWithService({
    collectFilePaths: collectSourceFiles,
    buildFingerprint: buildSourceIndexFingerprint,
    version: SOURCE_INDEX_VERSION,
    buildStore: buildSourceIndexStore,
  });
  sourceIndexCache = result.cache;
  return result.status;
}

function resolveExplicitDirectoryTarget(target = '') {
  return resolveExplicitDirectoryTargetWithService(target, SOURCE_WHITELIST, {
    existsPath: absPath => fs.existsSync(absPath),
    isDirectoryPath: absPath => fs.statSync(absPath).isDirectory(),
    resolvePath: (basePath, ...parts) => path.resolve(basePath, ...parts),
    relativePath: (fromPath, toPath) => path.relative(fromPath, toPath),
    isAbsolutePath: value => path.isAbsolute(value),
    isBlockedPath: absPath => SOURCE_BLOCKED_PATH_PATTERN.test(absPath),
  });
}

function listDirectoryChildren(absPath = '') {
  try {
    return fs.readdirSync(absPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function createDirectorySummaryEntry(resolvedDir) {
  return createSourceDirectorySummaryEntryWithService(resolvedDir, listDirectoryChildren(resolvedDir?.abs), {
    allowedExtensions: SOURCE_ALLOWED_EXTENSIONS,
    childLimit: SOURCE_DIRECTORY_CHILD_LIMIT,
    getExtension: fileName => path.extname(fileName).toLowerCase(),
    isBlockedChild: entry => SOURCE_BLOCKED_PATH_PATTERN.test(path.join(resolvedDir.abs, entry.name)),
    sourceModuleLabels: SOURCE_MODULE_LABELS,
  });
}

function searchSourceDirectories(question, routeName) {
  return searchSourceDirectoriesWithService(question, routeName, {
    resolveQueryPlan,
    resolveDirectoryTarget: resolveExplicitDirectoryTarget,
    createDirectorySummaryEntry,
  }, {
    whitelist: SOURCE_WHITELIST,
    limit: SOURCE_INDEX_MAX_HITS,
  });
}

function searchSourceIndex(question, routeName) {
  return searchSourceIndexWithService(question, routeName, {
    resolveQueryPlan,
    getSourceIndexEntries,
  }, {
    limit: SOURCE_INDEX_MAX_HITS,
    scoringAdapters: {
      routeLabels: ROUTE_LABELS,
      detectQuestionTypes,
    },
  });
}

function searchSourceContext(question, routeName) {
  return searchSourceContextWithService(question, routeName, {
    resolveQueryPlan,
    collectSourceFiles,
    readFileText: filePath => fs.readFileSync(filePath, 'utf8'),
  }, {
    limit: SOURCE_MAX_HITS,
    contextOptions: {
      toRelativePath: toWhitelistRelative,
      routeLabels: ROUTE_LABELS,
      detectModuleType: detectSourceModuleType,
      skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
      contextLines: SOURCE_SNIPPET_CONTEXT_LINES,
      maxLength: SOURCE_MAX_SNIPPET_LENGTH,
      radius: SOURCE_SNIPPET_RADIUS,
    },
  });
}

function buildSourceIndexMatches(indexHits = []) {
  return buildSourceIndexMatchesWithService(indexHits, {
    sourceModuleLabels: SOURCE_MODULE_LABELS,
  });
}

function buildSourceSymbolMatches(symbolHits = []) {
  return buildSourceSymbolMatchesWithService(symbolHits, {
    sourceSymbolKindLabels: SOURCE_SYMBOL_KIND_LABELS,
  });
}

function buildSourceDirectoryMatches(directoryHits = []) {
  return buildSourceDirectoryMatchesWithService(directoryHits, {
    sourceModuleLabels: SOURCE_MODULE_LABELS,
  });
}

function resolveWhitelistRelativeFilePath(relativePath = '') {
  return resolveWhitelistRelativeFilePathWithService(relativePath, SOURCE_WHITELIST, {
    existsPath: absPath => fs.existsSync(absPath),
    isFilePath: absPath => fs.statSync(absPath).isFile(),
    resolvePath: (basePath, ...parts) => path.resolve(basePath, ...parts),
    relativePath: (fromPath, toPath) => path.relative(fromPath, toPath),
    isAbsolutePath: value => path.isAbsolute(value),
    isBlockedPath: absPath => SOURCE_BLOCKED_PATH_PATTERN.test(absPath),
  });
}

function sanitizeFullSourceContent(text = '') {
  return sanitizeFullSourceContentWithService(text, {
    skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
  });
}

function formatFullSourceContentForEvidence(text = '') {
  return formatFullSourceContentForEvidenceWithService(text, {
    skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
    maxLength: SOURCE_MAX_FULLFILE_CONTENT_LENGTH,
  });
}

function createFullFileMatch(relativePath = '', options = {}) {
  return createFullFileMatchWithService(relativePath, options, {
    resolveFilePath: resolveWhitelistRelativeFilePath,
    readFileText: absPath => fs.readFileSync(absPath, 'utf8'),
    detectModuleType: detectSourceModuleType,
    sourceModuleLabels: SOURCE_MODULE_LABELS,
    skipLinePattern: SOURCE_SKIP_LINE_PATTERN,
    maxLength: SOURCE_MAX_FULLFILE_CONTENT_LENGTH,
  });
}

function buildDirectoryFullFileMatches(directoryMatch = {}, queryPlan = {}) {
  return buildDirectoryFullFileMatchesWithService(directoryMatch, queryPlan, {
    resolveDirectoryTarget: resolveExplicitDirectoryTarget,
    listDirectoryChildren,
    isAllowedFile: fileName => SOURCE_ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase()),
    isBlockedPath: absPath => SOURCE_BLOCKED_PATH_PATTERN.test(absPath),
    joinPath: (basePath, childName) => path.join(basePath, childName),
    readFileText: absPath => fs.readFileSync(absPath, 'utf8'),
    scoreSourceFile,
    createFullFileMatch,
    detectModuleType: detectSourceModuleType,
  });
}

function selectExpandedFullFileMatches(matches = [], limit = SOURCE_FULLFILE_EXPAND_LIMIT) {
  return selectExpandedFullFileMatchesWithService(matches, limit);
}

function expandRetrievedMatchesToFullFiles(matches = [], queryPlan = {}) {
  return expandRetrievedMatchesToFullFilesWithService(matches, queryPlan, {
    buildDirectoryFullFileMatches,
    createFullFileMatch,
    selectExpandedFullFileMatches,
    directoryFullFileLimit: SOURCE_DIRECTORY_FULLFILE_LIMIT,
    fullFileLimit: SOURCE_FULLFILE_EXPAND_LIMIT,
  });
}

function recallSearchCandidates(question, routeName, mode, queryPlan, knowledgeMatches = [], options = {}) {
  const recalledKnowledgeMatches = (knowledgeMatches || []).slice(0, SOURCE_RECALL_KNOWLEDGE_LIMIT);
  const shouldSourceSearch = options.sourceReadEnabled === true && shouldSearchSource(recalledKnowledgeMatches, queryPlan);

  let sourceSymbolHits = [];
  let sourceIndexHits = [];
  let sourceDirectoryHits = [];
  let sourceHits = [];

  if (shouldSourceSearch) {
    const sourceSearchHits = collectSourceSearchHitsWithService(queryPlan, routeName, {
      searchDirectories: searchSourceDirectories,
      searchSymbols: searchSourceSymbols,
      searchIndex: searchSourceIndex,
      searchContext: searchSourceContext,
    }, {
      directoryLimit: SOURCE_RECALL_DIRECTORY_LIMIT,
      symbolLimit: SOURCE_RECALL_SYMBOL_LIMIT,
      indexLimit: SOURCE_RECALL_INDEX_LIMIT,
      contextLimit: SOURCE_RECALL_CONTEXT_LIMIT,
      minSymbolHitsForSkipContext: 4,
      minIndexHitsForSkipContext: 4,
      contextScoreThreshold: 12,
    });
    sourceDirectoryHits = sourceSearchHits.sourceDirectoryHits;
    sourceSymbolHits = sourceSearchHits.sourceSymbolHits;
    sourceIndexHits = sourceSearchHits.sourceIndexHits;
    sourceHits = sourceSearchHits.sourceHits;
  }

  // D1: noun-lexicon occurrence candidates
  const nounLexiconCandidates = buildNounLexiconCandidateMatches(
    (queryPlan.nounLexiconMatches || []).slice(0, SOURCE_RECALL_NOUN_LEXICON_LIMIT)
  );

  const { stage1Pool, finalMatches } = buildRecallCandidatePoolsWithService({
    queryPlan,
    knowledgeMatches: recalledKnowledgeMatches,
    sourceDirectoryHits,
    sourceSymbolHits,
    sourceIndexHits,
    sourceHits,
    nounLexiconCandidates,
  }, {
    buildSourceDirectoryMatches,
    buildSourceSymbolMatches,
    buildSourceIndexMatches,
    buildSourceKnowledgeMatches,
    dedupeRetrievedMatches,
    rerankRetrievedMatches,
    stage1PoolLimit: SOURCE_STAGE1_POOL_LIMIT,
    finalLimit: SOURCE_STAGE1_EXPAND_LIMIT,
  });

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

function rerankRetrievedMatches(matches = [], queryPlan = {}) {
  return rerankRetrievedMatchesWithService(matches, queryPlan, {
    expandMatches: expandRetrievedMatchesToFullFiles,
    internalPathPattern: AI_ASSISTANT_INTERNAL_PATH_PATTERN,
    runtimeDataPathPattern: SOURCE_RUNTIME_DATA_PATH_PATTERN,
    matchesExplicitPath,
  });
}

function dedupeRetrievedMatches(matches = []) {
  return dedupeRetrievedMatchesWithService(matches);
}

function draftKnowledgeFromSource(question, routeName, sourceHits = []) {
  return draftKnowledgeFromSourceWithStore(question, routeName, sourceHits, {
    routeLabels: ROUTE_LABELS,
    extractSearchTerms,
  });
}

function upsertAutoKnowledgeFromSource(question, routeName, sourceHits = []) {
  const result = upsertAutoKnowledgeFromSourceInStore(loadKnowledgeStore(), question, routeName, sourceHits, {
    routeLabels: ROUTE_LABELS,
    extractSearchTerms,
  });
  if (!result.entry) return null;
  saveKnowledgeStore(result.store);
  return result.entry;
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

function normalizeSemanticIntent(value = '') {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  const normalized = SEMANTIC_INTENT_ALIASES[key] || SEMANTIC_INTENT_ALIASES[raw] || raw;
  return SEMANTIC_ALLOWED_INTENTS.has(normalized) ? normalized : '';
}

function normalizeSemanticQuestionType(value = '') {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  const normalized = SEMANTIC_QUESTION_TYPE_ALIASES[key] || SEMANTIC_QUESTION_TYPE_ALIASES[raw] || raw;
  return SEMANTIC_ALLOWED_QUESTION_TYPES.has(normalized) ? normalized : '';
}

function normalizeSemanticRouteHint(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (ROUTE_LABELS[raw]) return raw;
  return ROUTE_NAME_BY_LABEL[normalizeText(raw)] || '';
}

function getSemanticSlotTerms(slots = {}) {
  const source = slots && typeof slots === 'object' && !Array.isArray(slots) ? slots : {};
  return QUERY_SLOT_FIELDS.flatMap(field => sanitizeStringArray(source[field]));
}

function buildSemanticTracePayload(semantic = {}, { applied = false, error = '', reason = '' } = {}) {
  return {
    used: !!semantic,
    applied,
    error: String(error || '').slice(0, 160),
    reason: String(reason || '').slice(0, 80),
    confidence: Number(semantic?.confidence) || 0,
    normalizedQuestion: semantic?.normalizedQuestion || '',
    intents: sanitizeStringArray(semantic?.intents).map(normalizeSemanticIntent).filter(Boolean),
    questionTypes: sanitizeStringArray(semantic?.questionTypes).map(normalizeSemanticQuestionType).filter(Boolean),
    routeHints: sanitizeStringArray(semantic?.routeHints).map(normalizeSemanticRouteHint).filter(Boolean),
    sourceTerms: sanitizeStringArray(semantic?.sourceTerms).slice(0, 16),
    rewriteQueries: sanitizeStringArray(semantic?.rewriteQueries).slice(0, 6),
  };
}

function mergeSemanticQueryPlan(queryPlan = {}, semanticResult = null) {
  const semantic = semanticResult?.structured;
  if (!semantic) {
    return {
      ...queryPlan,
      semanticPrepass: buildSemanticTracePayload(null, { applied: false, reason: 'not_available' }),
    };
  }

  const confidence = Number(semantic.confidence) || 0;
  const semanticIntents = sanitizeStringArray(semantic.intents).map(normalizeSemanticIntent).filter(Boolean);
  const semanticQuestionTypes = sanitizeStringArray(semantic.questionTypes).map(normalizeSemanticQuestionType).filter(Boolean);
  const semanticRouteHints = sanitizeStringArray(semantic.routeHints).map(normalizeSemanticRouteHint).filter(Boolean);
  const semanticTerms = unique([
    semantic.normalizedQuestion,
    ...sanitizeStringArray(semantic.sourceTerms),
    ...sanitizeStringArray(semantic.rewriteQueries),
    ...getSemanticSlotTerms(semantic.slots),
  ]).filter(term => String(term || '').length <= 80);

  if (confidence < SEMANTIC_PREPASS_CONFIDENCE_THRESHOLD) {
    return {
      ...queryPlan,
      expandedTerms: unique([...(queryPlan.expandedTerms || []), ...semanticTerms]).slice(0, 120),
      semanticPrepass: buildSemanticTracePayload(semantic, { applied: false, reason: 'low_confidence' }),
    };
  }

  const mergedIntents = unique([...(queryPlan.intents || []), ...semanticIntents]);
  const preferredSemanticIntent = semanticIntents.find(intent => intent !== 'gameplay_qa');
  const primaryIntent = queryPlan.primaryIntent === 'gameplay_qa' && preferredSemanticIntent
    ? preferredSemanticIntent
    : queryPlan.primaryIntent || mergedIntents[0] || 'gameplay_qa';
  const mergedQuestionTypes = unique([...(queryPlan.questionTypes || []), ...semanticQuestionTypes]);
  const mergedRouteHints = unique([...(queryPlan.routeHints || []), ...semanticRouteHints]);
  const mergedSourceTerms = unique([...semanticTerms, ...semanticQuestionTypes, ...(queryPlan.sourceTerms || [])]).slice(0, 120);
  const mergedExpandedTerms = unique([
    ...(queryPlan.expandedTerms || []),
    ...semanticTerms.filter(term => !mergedSourceTerms.includes(term)),
  ]).slice(0, 120);

  return {
    ...queryPlan,
    intents: mergedIntents.length ? mergedIntents : ['gameplay_qa'],
    primaryIntent,
    sourceTerms: mergedSourceTerms,
    expandedTerms: mergedExpandedTerms,
    questionTypes: mergedQuestionTypes,
    routeHints: mergedRouteHints,
    needsKnowledgeSearch: queryPlan.needsKnowledgeSearch !== false || semanticIntents.length > 0,
    clarification: preferredSemanticIntent || mergedQuestionTypes.length || mergedRouteHints.length
      ? { required: false, reason: '', options: [] }
      : queryPlan.clarification,
    semanticPrepass: buildSemanticTracePayload(semantic, { applied: true }),
  };
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

function detectSensitiveQuestion(question, mode) {
  return detectSensitiveQuestionWithRules(question, mode, {
    blockedTopics: cfg.get('ai_assistant_blocked_topics'),
  });
}

function getPublicConfig() {
  return buildPublicAiAssistantConfig();
}

function getAdminConfig() {
  return buildAdminAiAssistantConfig({
    sourceIndexStatus: getSourceIndexStatus(),
    nounLexiconStatus: getNounLexiconStatus(),
    modelHealth: getRemoteModelCircuitStatus(),
    managedStatus: cfg.getManagedStatus(),
    readonlyManagedFields: OFFICIAL_MANAGED_AI_FIELDS,
  });
}

function setAdminConfig(input = {}) {
  saveAdminAiAssistantConfig(input, { validateModelApiUrl });
  return getAdminConfig();
}

function scoreEntry(entry, question, routeName) {
  const rawQuestion = String(question || '');
  const normalizedQuestion = normalizeText(rawQuestion);
  let score = 0;

  if (routeName && entry.routeNames.includes(routeName)) score += 6;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedQuestion === normalizedKeyword) {
      score += keyword.length >= 3 ? 220 : 120;
    } else if (normalizedQuestion.includes(normalizedKeyword)) {
      score += keyword.length >= 3 ? 4 : 2;
    }
  }

  const normalizedTitle = normalizeText(entry.title);
  if (normalizedTitle && normalizedQuestion === normalizedTitle) score += 240;
  else if (normalizedTitle && normalizedQuestion.includes(normalizedTitle)) score += 5;

  if (routeName && entry.routeNames.includes(routeName) && /这里|当前|这个页面|这页|本页/.test(rawQuestion)) {
    score += 3;
  }

  return score;
}

function shouldSearchSource(matches = [], question = '') {
  const queryPlan = resolveQueryPlan(question);
  return shouldSearchSourceWithService(matches, queryPlan);
}

function isKnowledgeLexiconOccurrence(occ = {}) {
  return /(^|[\\/])taoyuan_ai_knowledge\.json$/i.test(String(occ.path || ''));
}

function buildPublishedKnowledgeLexiconTermSet() {
  return new Set(
    getPublishedKnowledgeEntries()
      .flatMap(entry => [entry.title, ...(entry.keywords || [])])
      .map(item => normalizeText(item))
      .filter(Boolean)
  );
}

function isPublishedKnowledgeLexiconEntry(entry = {}, publishedTerms = buildPublishedKnowledgeLexiconTermSet()) {
  const candidates = [entry.term, ...(entry.aliases || [])]
    .map(item => normalizeText(item))
    .filter(Boolean);
  return candidates.some(item => publishedTerms.has(item));
}

function buildNounLexiconCandidateMatches(nounLexiconMatches = []) {
  const results = [];
  const publishedKnowledgeTerms = buildPublishedKnowledgeLexiconTermSet();
  for (const entry of nounLexiconMatches) {
    for (const occ of (entry.occurrences || []).slice(0, 3)) {
      if (!occ?.path) continue;
      if (isKnowledgeLexiconOccurrence(occ) && !isPublishedKnowledgeLexiconEntry(entry, publishedKnowledgeTerms)) continue;
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
  return buildSourceKnowledgeMatchesWithService(sourceHits);
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
      semanticPrepass: queryPlan?.semanticPrepass || { used: false, applied: false, error: '', reason: '' },
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

function composeLocalAnswer({ question, routeName, contextLabel, matches, mode, queryPlan = null, diagnostics = {}, contextSnapshot = null }) {
  const resolvedQueryPlan = resolveQueryPlan(queryPlan || question, routeName);
  return composeLocalAnswerFromMatches({
    question,
    routeName,
    contextLabel,
    matches,
    mode,
    queryPlan: resolvedQueryPlan,
    diagnostics,
    contextSnapshot,
  });
}

const MAX_QUESTION_LENGTH = 1200;

function buildTaskDiagnosis(snapshot = null, { queryPlan = {}, routeName = '', question = '' } = {}) {
  return buildTaskDiagnosisWithService(snapshot, {
    queryPlan,
    routeName,
    question,
    routeLabels: ROUTE_LABELS,
    resourceEntries: getStructuredKnowledgeEntries(),
    buildResourceRecommendedRoute,
  });
}

function buildAiAssistantLocalDiagnostics(snapshot = null, { queryPlan = {}, routeName = '', question = '' } = {}) {
  const context = getContextObject(snapshot);
  if (!context) {
    return createEmptyLocalDiagnosticsResult({
      taskDiagnosis: createEmptyTaskDiagnosisResult(question),
    });
  }

  const signals = [];
  const baseState = getContextObject(context.baseState) || getContextObject(context.base);
  const weeklyPlan = getContextObject(context.weeklyPlan);
  const inventory = getContextObject(context.inventory);
  const farming = getContextObject(context.farming);
  const buildings = getContextObject(context.buildings);
  const quests = getContextObject(context.quests);
  const lateGame = getContextObject(context.lateGame);
  const online = getContextObject(context.online);

  appendBaseStateDiagnosticSignalsWithService(signals, baseState, { routeLabels: ROUTE_LABELS });
  appendInventoryDiagnosticSignalsWithService(signals, inventory, { routeLabels: ROUTE_LABELS });
  appendFarmingDiagnosticSignalsWithService(signals, farming, { routeLabels: ROUTE_LABELS });
  appendQuestDiagnosticSignalsWithService(signals, quests, { routeLabels: ROUTE_LABELS });
  appendWeeklyPlanDiagnosticSignalsWithService(signals, weeklyPlan, { routeLabels: ROUTE_LABELS });
  appendBuildingDiagnosticSignalsWithService(signals, buildings, { routeLabels: ROUTE_LABELS });
  appendLateGameDiagnosticSignalsWithService(signals, lateGame, { routeLabels: ROUTE_LABELS });
  appendOnlineDiagnosticSignalsWithService(signals, online, { routeLabels: ROUTE_LABELS });

  const taskDiagnosis = buildTaskDiagnosis(snapshot, { queryPlan, routeName, question });
  appendTaskDiagnosisDiagnosticSignalWithService(signals, taskDiagnosis, { routeLabels: ROUTE_LABELS });

  return buildLocalDiagnosticsResult({
    signals,
    taskDiagnosis,
    queryPlan,
    routeName,
    question,
  });
}

function buildAiAssistantThreeStepSuggestions(snapshot = null, {
  queryPlan = {},
  routeName = '',
  question = '',
  diagnostics = {},
} = {}) {
  return buildAiAssistantThreeStepSuggestionsWithService(snapshot, {
    queryPlan,
    routeName,
    question,
    diagnostics,
    routeLabels: ROUTE_LABELS,
  });
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
  let queryPlan = parseCodeQuestion(trimmedQuestion, routeName);
  timings.afterParseMs = Date.now() - timings.startedAt;
  if (publicConfig.providerConfigured && !getRemoteModelCircuitStatus().open) {
    try {
      const semanticResult = await callRemoteSemanticPrepass({
        question: trimmedQuestion,
        contextLabel,
        routeName,
        queryPlan,
      }, {
        timeoutMs: SEMANTIC_PREPASS_TIMEOUT_MS,
      });
      queryPlan = mergeSemanticQueryPlan(queryPlan, semanticResult);
    } catch (error) {
      queryPlan = {
        ...queryPlan,
        semanticPrepass: {
          used: true,
          applied: false,
          error: String(error?.message || '远程语义解析失败').slice(0, 160),
          reason: 'failed',
          confidence: 0,
          normalizedQuestion: '',
          intents: [],
          questionTypes: [],
          routeHints: [],
          sourceTerms: [],
          rewriteQueries: [],
        },
      };
    }
  }
  timings.afterSemanticPrepassMs = Date.now() - timings.startedAt;
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
  const suppressPublicSources = provider === 'model';
  const publicEvidence = outputGuard.blocked || suppressPublicSources ? [] : buildPublicEvidenceSummary(matches);
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
    sources: outputGuard.blocked || suppressPublicSources
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
    mergeSemanticQueryPlanForTests: mergeSemanticQueryPlan,
    extractQuerySlotsForTests: extractQuerySlots,
    buildLocalDiagnosticsForTests: buildAiAssistantLocalDiagnostics,
    buildThreeStepSuggestionsForTests: buildAiAssistantThreeStepSuggestions,
  },
};
