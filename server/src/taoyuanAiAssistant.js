const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
const NOUN_LEXICON_FILE = path.join(DATA_DIR, 'taoyuan_ai_noun_lexicon.json');

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
  {
    key: 'data',
    abs: resolveExistingPath([
      '../../data',
      '../data',
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
  { type: 'resource-source', test: /在哪里|在哪|怎么获得|怎么获取|来源|从哪来|掉落|产出|获取/i },
  { type: 'shop-purchase', test: /在哪买|哪里买|购买|商店|药铺|渔具铺|铁匠铺|万物铺/i },
  { type: 'precondition', test: /条件|前置|要求|限制|为什么不能|解锁/i },
  { type: 'recipe', test: /配方|食谱|合成|制作|加工/i },
  { type: 'page-feature', test: /页面|系统|功能|有什么用|做什么|怎么玩/i },
];

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

const AI_ASSISTANT_INTERNAL_PATH_PATTERN = /(?:^|[\/])(server\/src\/taoyuanAiAssistant\.js|taoyuan-main\/src\/views\/admin\/AiKnowledgeAdminView\.vue|taoyuan-main\/src\/utils\/taoyuanAiApi\.ts|taoyuan-main\/src\/types\/aiAssistant\.ts)(?:$|[\/])/i;
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
    keywords: ['家', '小屋', '休息', '睡觉', '家庭', '孩子', '配偶'],
    access: 'public',
    content:
      '家园和小屋相关页面会影响每日休息、家庭互动与部分恢复效果。休息会推进到第二天；太晚睡或体力见底时，恢复效果可能会下降，还可能伴随额外损失。与配偶和家庭相关的互动会逐步解锁，包括孩子相关事件。当前可婚 NPC 已支持同性婚姻；若是同性伴侣，后续家庭扩展会走“迎一个孩子回家”的专线，而不是沿用孕期设定。',
  },
  {
    id: 'npc-village',
    title: '村庄、NPC 与社交',
    routeNames: ['village'],
    keywords: ['村庄', 'npc', '好感', '社交', '村民', '恋爱', '结婚'],
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
  if (/哪里买|哪买|购买|获得|获取|来源|掉落|产出|怎么来|在哪里买/.test(raw)) {
    intents.push('find_source');
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
  const nounLexiconMatches = matchNounLexiconEntries(raw, [
    ...baseTerms,
    ...conceptTerms,
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
    ...nounLexiconMatches.flatMap(entry => entry.routeHints || []),
  ]);
  const questionCategory = detectQuestionCategory(raw, intents, moduleHints);
  const layerHints = buildQuestionLayerHints(questionCategory);
  const sourceTerms = unique([
    ...baseTerms,
    ...conceptTerms,
    ...nounLexiconTerms,
    ...quotedTerms,
    ...identifierTargets,
    ...quotedTerms.flatMap(item => splitIdentifierTerms(item)),
    ...identifierTargets.flatMap(item => splitIdentifierTerms(item)),
  ]).filter(Boolean);

  const needsSourceSearch = explicitTargets.length > 0
    || intents.some(intent => CODE_SEARCH_INTENTS.has(intent))
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
    ...nounLexiconTerms,
  ]).filter(t => !sourceTerms.includes(t));

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
    const absPath = path.join(root.abs, ...subPath.split('/'));
    try {
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
    const absPath = path.join(root.abs, ...subPath.split('/'));
    try {
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
  if ((queryPlan.intents || []).includes('find_source') && ['source-index', 'source', 'manual', 'built-in'].includes(sourceType)) score += 20;

  if (primaryIntent === 'find_source') {
    if (sourceType === 'built-in') score += 90;
    if (sourceType === 'manual') score += 36;
    if (sourceType === 'source-index') score -= 12;
    if (sourceType === 'source-symbol') score -= 24;
  }

  if (primaryIntent === 'gameplay_qa') {
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

function recallSearchCandidates(question, routeName, mode, queryPlan, knowledgeMatches = []) {
  const recalledKnowledgeMatches = (knowledgeMatches || []).slice(0, SOURCE_RECALL_KNOWLEDGE_LIMIT);
  const shouldSourceSearch = cfg.get('ai_assistant_source_read_enabled') === true && shouldSearchSource(recalledKnowledgeMatches, queryPlan);

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

function getPublicConfig() {
  const enabled = cfg.get('ai_assistant_enabled') !== false;
  const assistantName = String(cfg.get('ai_assistant_name') || '桃源小助理').trim() || '桃源小助理';
  const welcomeMessage =
    String(cfg.get('ai_assistant_welcome') || '').trim() ||
    '你好，我是桃源小助理。你可以问我玩法、系统机制和攻略建议。';
  const apiUrl = String(cfg.get('ai_assistant_api_url') || '').trim();
  const model = String(cfg.get('ai_assistant_model') || '').trim();
  return {
    enabled,
    mode: getMode(),
    assistantName,
    welcomeMessage,
    providerConfigured: !!(apiUrl && model),
  };
}

function getAdminConfig() {
  const publicConfig = getPublicConfig();
  return {
    ...publicConfig,
    sourceReadEnabled: cfg.get('ai_assistant_source_read_enabled') === true,
    sourceIngestEnabled: cfg.get('ai_assistant_source_ingest_enabled') === true,
    sourceIndexStatus: getSourceIndexStatus(),
    nounLexiconStatus: getNounLexiconStatus(),
    apiUrl: String(cfg.get('ai_assistant_api_url') || '').trim(),
    apiKey: String(cfg.get('ai_assistant_api_key') || '').trim(),
    model: String(cfg.get('ai_assistant_model') || '').trim(),
    temperature: sanitizeTemperature(cfg.get('ai_assistant_temperature')),
    systemPrompt:
      String(cfg.get('ai_assistant_system_prompt') || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    blockedTopics: String(cfg.get('ai_assistant_blocked_topics') || '').trim(),
  };
}

function sanitizeTemperature(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.2;
  return Math.max(0, Math.min(1.5, parsed));
}

function setAdminConfig(input = {}) {
  const updates = {
    ai_assistant_enabled: input.enabled !== false,
    ai_assistant_mode: input.mode === 'standard' ? 'standard' : 'strict',
    ai_assistant_source_read_enabled: input.sourceReadEnabled === true,
    ai_assistant_source_ingest_enabled: input.sourceIngestEnabled === true,
    ai_assistant_name: String(input.assistantName || '桃源小助理').trim() || '桃源小助理',
    ai_assistant_welcome:
      String(input.welcomeMessage || '').trim() ||
      '你好，我是桃源小助理。你可以问我玩法、系统机制和攻略建议。',
    ai_assistant_api_url: String(input.apiUrl || '').trim(),
    ai_assistant_api_key: String(input.apiKey || '').trim(),
    ai_assistant_model: String(input.model || '').trim(),
    ai_assistant_temperature: sanitizeTemperature(input.temperature),
    ai_assistant_system_prompt:
      String(input.systemPrompt || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    ai_assistant_blocked_topics: String(input.blockedTopics || '').trim(),
  };

  cfg.set(updates);
  return getAdminConfig();
}

function detectSensitiveQuestion(question, mode) {
  const normalized = String(question || '').trim();
  if (!normalized) return false;
  return getBlockedPatterns(mode).some(pattern => pattern.test(normalized));
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

function parseModelStructuredOutput(rawText = '') {
  const jsonText = extractJsonBlock(rawText);
  if (!jsonText) return null;

  try {
    const payload = JSON.parse(jsonText);
    if (!payload || typeof payload !== 'object') return null;
    return {
      intent: String(payload.intent || '').trim(),
      answer: String(payload.answer || '').trim(),
      evidence_ids: unique(toArray(payload.evidence_ids || payload.evidenceIds || []).map(item => String(item || '').trim()).filter(Boolean)),
      matched_files: unique(toArray(payload.matched_files || payload.matchedFiles || []).map(item => String(item || '').trim()).filter(Boolean)),
      uncertain_points: toArray(payload.uncertain_points || payload.uncertainPoints || []).map(item => String(item || '').trim()).filter(Boolean),
    };
  } catch {
    return null;
  }
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
  modelTrace,
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
      enabled: cfg.get('ai_assistant_source_read_enabled') === true,
      executed: shouldSourceSearch === true,
      ingestEnabled: cfg.get('ai_assistant_source_ingest_enabled') === true,
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
    model: modelTrace,
    timings,
    finalAnswer: answer,
  };
}

function retrieveKnowledge(question, routeName, mode, queryPlan = null) {
  if (queryPlan && queryPlan.needsKnowledgeSearch === false) return [];

  const list = getPublishedKnowledgeEntries().filter(entry => !(mode === 'strict' && entry.access === 'standard'));
  const scored = list
    .map(entry => ({ ...entry, score: scoreEntry(entry, question, routeName) }))
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

function composeLocalAnswer({ question, routeName, contextLabel, matches, mode }) {
  const intro = contextLabel
    ? `你当前大概率在【${contextLabel}】相关场景。`
    : routeName && ROUTE_LABELS[routeName]
      ? `你当前大概率在【${ROUTE_LABELS[routeName]}】相关场景。`
      : '';

  const queryPlan = resolveQueryPlan(question, routeName);
  const fullFileMatches = matches.filter(item => item?.sourceType === 'source-fullfile');
  const directoryMatches = matches.filter(item => item?.sourceType === 'source-directory');

  if (!matches.length) {
    return [
      intro,
      `关于“${question}”，我暂时无法从当前整理的公开游戏资料中确认答案。`,
      '你可以换个问法，例如：',
      '1. 农场前期怎么赚钱',
      '2. 当前页面主要做什么',
      '3. 任务卡住了怎么办',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const [first, ...rest] = matches;

  if (queryPlan.answerMode === 'code' || queryPlan.sourcePreference === 'strong') {
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

  const sections = [];
  if (intro) sections.push(intro);
  sections.push(`关于“${question}”，根据当前可用的桃源乡资料：\n\n${first.content}`);

  if (rest.length > 0) {
    sections.push(
      '你还可以顺带关注：\n' +
        rest
          .slice(0, 2)
          .map((item, index) => `${index + 1}. ${item.title}：${item.content}`)
          .join('\n')
    );
  }

  if (mode === 'strict') {
    sections.push('当前是严格模式：涉及隐藏数值、掉率、风控、后台规则或敏感实现的内容不会提供。');
  }

  return sections.join('\n\n');
}

function buildChatCompletionsUrl(apiUrl) {
  const trimmed = String(apiUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
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

  const knowledgeText = buildEvidenceText(snippets);

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
    '6. 关键结论后尽量附上证据编号，如 [E1][E2]。',
    '7. 只输出一个 JSON 对象，不要使用 Markdown 代码块，格式如下：',
    '{"intent":"问题意图","answer":"给玩家的最终回答","evidence_ids":["E1"],"matched_files":["路径"],"uncertain_points":["仍不确定的点"]}',
  ].join('\n');

  const headers = { 'Content-Type': 'application/json' };
  if (adminConfig.apiKey) headers.Authorization = `Bearer ${adminConfig.apiKey}`;

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

  const structured = parseModelStructuredOutput(rawText);
  return {
    answer: structured?.answer || rawText,
    rawOutput: rawText,
    structured,
  };
}

const MAX_QUESTION_LENGTH = 1200;

async function askInternal(question, options = {}, debug = false) {
  const trimmedQuestion = String(question || '').trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) throw createError('问题不能为空');

  const timings = { startedAt: Date.now() };

  const publicConfig = getPublicConfig();
  if (!publicConfig.enabled) throw createError('AI 助手当前已关闭', 403);

  const mode = publicConfig.mode;
  if (detectSensitiveQuestion(trimmedQuestion, mode)) {
    const guardResult = {
      answer:
        '这个问题涉及敏感或不对玩家公开的内容。当前 AI 助手不会提供隐藏数值、掉率、后台规则、风控逻辑、密钥或可能影响公平性的实现细节。',
      sources: [],
      mode,
      provider: 'guard',
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
        sourceSearch: { enabled: false, executed: false, ingestEnabled: false },
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
        timings: { totalMs: Date.now() - timings.startedAt },
        finalAnswer: guardResult.answer,
      },
    };
  }

  const routeName = String(options.routeName || '').trim();
  const contextLabel = String(options.contextLabel || ROUTE_LABELS[routeName] || '').trim();
  const queryPlan = parseCodeQuestion(trimmedQuestion, routeName);
  timings.afterParseMs = Date.now() - timings.startedAt;
  const knowledgeMatches = retrieveKnowledge(trimmedQuestion, routeName, mode, queryPlan);
  timings.afterKnowledgeMs = Date.now() - timings.startedAt;
  const recallResult = recallSearchCandidates(trimmedQuestion, routeName, mode, queryPlan, knowledgeMatches);
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

  if (sourceHits.length && cfg.get('ai_assistant_source_ingest_enabled') === true) {
    try { upsertAutoKnowledgeFromSource(trimmedQuestion, routeName, sourceHits); } catch {}
  }

  let answer = '';
  let provider = 'local';
  let modelTrace = { used: false, rawOutput: '', structured: null, error: '' };

  try {
    if (publicConfig.providerConfigured) {
      const modelResult = await callRemoteModel({
        question: trimmedQuestion,
        contextLabel,
        mode,
        snippets: matches,
        queryPlan,
      });
      answer = modelResult.answer;
      provider = 'model';
      modelTrace = {
        used: true,
        rawOutput: modelResult.rawOutput,
        structured: modelResult.structured,
        error: '',
      };
    } else {
      answer = composeLocalAnswer({
        question: trimmedQuestion,
        routeName,
        contextLabel,
        matches,
        mode,
      });
    }
  } catch (error) {
    answer =
      composeLocalAnswer({
        question: trimmedQuestion,
        routeName,
        contextLabel,
        matches,
        mode,
      }) + '\n\n（提示：远程模型暂时不可用，因此这次改用内置知识库回答。）';
    provider = 'fallback';
    modelTrace = {
      used: publicConfig.providerConfigured,
      rawOutput: '',
      structured: null,
      error: error?.message || '远程模型调用失败',
    };
  }

  timings.totalMs = Date.now() - timings.startedAt;

  const result = {
    answer,
    sources: unique([
      ...knowledgeMatches.map(item => item.title),
      ...sourceDirectoryHits.map(item => item.path),
      ...sourceSymbolHits.map(item => item.path),
      ...sourceIndexHits.map(item => item.path),
      ...sourceHits.map(item => item.path),
    ]),
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
      modelTrace,
      timings,
      answer,
    }),
  };
}

async function ask(question, options = {}) {
  return askInternal(question, options, false);
}

async function askDebug(question, options = {}) {
  return askInternal(question, options, true);
}

module.exports = {
  ROUTE_LABELS,
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
};