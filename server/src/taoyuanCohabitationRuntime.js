const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const taoyuanCoopOrderRuntime = require('./taoyuanCoopOrderRuntime');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const {
  createError,
  decryptTaoyuanRaw,
  findSaveIdentityById,
  getActiveSaveContext,
  getActiveSaveSlot,
  loadUserSaveSlots,
  normalizeGameplaySaveContainer,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_COHABITATION_FILE = path.join(DATA_DIR, 'taoyuan_cohabitation_contracts.json');

const CONTRACT_STORE_VERSION = 1;
const OPEN_CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending']);
const CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending', 'closed', 'declined']);
const MEMBER_STATUSES = new Set(['accepted', 'pending', 'declined', 'left']);
const FUND_LEDGER_LIMIT = 160;
const FUND_ORIGIN_LIMIT = 160;
const FUND_MAX_CONTRIBUTION_AMOUNT = 999999;
const FUND_MAX_SMALL_SPEND_AMOUNT = 300;
const FUND_MAX_MEDIUM_SPEND_AMOUNT = 1200;
const FUND_MAX_LARGE_SPEND_AMOUNT = 999999;
const FUND_LARGE_SPEND_DRAFT_LIMIT = 30;
const FAMILY_BUILDING_LEDGER_LIMIT = 80;
const WAREHOUSE_LEDGER_LIMIT = 160;
const WAREHOUSE_ORIGIN_LIMIT = 160;
const WAREHOUSE_MAX_DEPOSIT_QUANTITY = 99;
const WAREHOUSE_MAX_WITHDRAW_QUANTITY = 99;
const WAREHOUSE_MAX_SELL_QUANTITY = 99;
const WAREHOUSE_ITEM_MAX_STACK = 999;
const WAREHOUSE_TEMP_BAG_CAPACITY = 10;
const WAREHOUSE_QUALITIES = new Set(['normal', 'fine', 'excellent', 'supreme']);
const WAREHOUSE_SELL_PRICE_BY_ITEM_ID = Object.freeze({
  rice: 35,
  wheat: 55,
  corn: 80,
  tea: 160,
  lotus: 130,
  turnip: 75,
  carrot: 50,
  radish: 75,
  sweet_potato: 70,
  pumpkin: 120,
  sesame: 95,
  peach: 140,
  chili: 90,
  wood: 15,
  stone: 10,
  clay: 12,
  coal: 25,
  copper_ore: 45,
  iron_ore: 70,
});
const PERMISSION_GROUPS = Object.freeze(['farm', 'animal', 'storage', 'construction', 'fund', 'family', 'confirmations']);
const SEPARATION_PREVIEW_VERSION = 1;
const FAMILY_MANOR_TYPES = new Set(['oath_manor', 'business_partner']);
const SMALL_FUND_SPEND_PURPOSES = Object.freeze({
  seed_budget: {
    label: '小额种子预算',
    category: 'seed_feed',
    max_amount: 120,
    auto_pay_eligible: true,
  },
  feed_budget: {
    label: '小额饲料预算',
    category: 'seed_feed',
    max_amount: 300,
    auto_pay_eligible: true,
  },
  tool_repair: {
    label: '小额工具修缮',
    category: 'maintenance',
    max_amount: 150,
    auto_pay_eligible: false,
  },
  order_postage: {
    label: '小额订单跑腿费',
    category: 'order_support',
    max_amount: 160,
    auto_pay_eligible: false,
  },
});
const MEDIUM_FUND_SPEND_PURPOSES = Object.freeze({
  processing_materials: {
    label: '中额加工材料',
    category: 'processing',
    max_amount: 600,
    auto_pay_eligible: false,
  },
  building_materials: {
    label: '中额建材预算',
    category: 'construction_material',
    max_amount: 1200,
    auto_pay_eligible: false,
  },
});
const LARGE_FUND_SPEND_PURPOSES = Object.freeze({
  family_building: {
    label: '大额家族建筑',
    category: 'family_building',
    max_amount: 50000,
  },
  manor_expansion: {
    label: '大额庄园扩建',
    category: 'manor_expansion',
    max_amount: 80000,
  },
});
const SHARED_FUND_AUTO_PURCHASE_CATALOG = Object.freeze({
  'shop:seed_cabbage': {
    item_id: 'seed_cabbage',
    label: '白菜种子',
    unit_price: 10,
    allowed_purposes: ['seed_budget'],
    category: 'seed',
  },
  'shop:seed_radish': {
    item_id: 'seed_radish',
    label: '萝卜种子',
    unit_price: 15,
    allowed_purposes: ['seed_budget'],
    category: 'seed',
  },
  'shop:seed_rice': {
    item_id: 'seed_rice',
    label: '稻米种子',
    unit_price: 20,
    allowed_purposes: ['seed_budget'],
    category: 'seed',
  },
  'shop:fish_feed': {
    item_id: 'fish_feed',
    label: '鱼饲料',
    unit_price: 30,
    allowed_purposes: ['feed_budget'],
    category: 'feed',
  },
  'shop:premium_feed': {
    item_id: 'premium_feed',
    label: '精饲料',
    unit_price: 200,
    allowed_purposes: ['feed_budget'],
    category: 'feed',
  },
  'shop:nourishing_feed': {
    item_id: 'nourishing_feed',
    label: '滋补饲料',
    unit_price: 250,
    allowed_purposes: ['feed_budget'],
    category: 'feed',
  },
  'shop:vitality_feed': {
    item_id: 'vitality_feed',
    label: '活力饲料',
    unit_price: 300,
    allowed_purposes: ['feed_budget'],
    category: 'feed',
  },
});

const RELATION_TYPE_DEFS = Object.freeze({
  lover_cohabitation: {
    id: 'lover_cohabitation',
    label: '恋人同居',
    title: '同居伴侣',
    min_members: 2,
    max_members: 2,
    permission_template: 'lover',
    romance_only: true,
  },
  marriage_home: {
    id: 'marriage_home',
    label: '婚姻同居',
    title: '配偶家庭',
    min_members: 2,
    max_members: 2,
    permission_template: 'marriage',
    romance_only: true,
  },
  bosom_partner: {
    id: 'bosom_partner',
    label: '知己合住',
    title: '知己搭档',
    min_members: 2,
    max_members: 2,
    permission_template: 'bosom',
    romance_only: false,
  },
  oath_manor: {
    id: 'oath_manor',
    label: '结拜庄园',
    title: '义亲庄园',
    min_members: 2,
    max_members: 4,
    permission_template: 'kinship',
    romance_only: false,
  },
  business_partner: {
    id: 'business_partner',
    label: '合伙庄园',
    title: '合伙人',
    min_members: 2,
    max_members: 4,
    permission_template: 'business',
    romance_only: false,
  },
  seasonal_cofarm: {
    id: 'seasonal_cofarm',
    label: '临时共耕',
    title: '共耕伙伴',
    min_members: 2,
    max_members: 2,
    permission_template: 'temporary',
    romance_only: false,
  },
});

const FAMILY_MANOR_ROLE_DEFS = Object.freeze({
  family_head: {
    id: 'family_head',
    label: '家主',
    description: '管理家族庄园职位与高风险确认，第一版仅保留给契约发起者。',
    management: true,
    permission_focus: ['permissions', 'fund', 'construction'],
  },
  storage_keeper: {
    id: 'storage_keeper',
    label: '管仓',
    description: '负责共同仓库普通物品放入与普通取用预览，高价值物仍需确认。',
    permission_focus: ['storage'],
  },
  farm_steward: {
    id: 'farm_steward',
    label: '农务',
    description: '负责田区浇水、除虫、种植和收获等农务操作。',
    permission_focus: ['farm'],
  },
  animal_keeper: {
    id: 'animal_keeper',
    label: '牧养',
    description: '负责动物喂食、抚摸和普通产物收取。',
    permission_focus: ['animal'],
  },
  workshop_keeper: {
    id: 'workshop_keeper',
    label: '工坊',
    description: '负责普通家具移动、工坊建材与加工相关协作。',
    permission_focus: ['construction'],
  },
  treasurer: {
    id: 'treasurer',
    label: '账房',
    description: '负责小额 / 中额共同基金预算预览，大额仍需双方确认。',
    permission_focus: ['fund'],
  },
});

const FAMILY_ORDER_STAGE_DEFS = Object.freeze([
  {
    id: 'gather_materials',
    label: '采集备料',
    description: '由农务、牧养或普通成员提交作物、动物产物、木石等基础材料。',
    preferred_roles: ['farm_steward', 'animal_keeper'],
    compatible_order_types: ['material_help', 'festival_supply', 'village_build'],
  },
  {
    id: 'process_or_build',
    label: '加工建造',
    description: '由工坊成员把材料加工、修缮或组装为家族订单中段成果。',
    preferred_roles: ['workshop_keeper'],
    compatible_order_types: ['village_build', 'expedition_supply', 'museum_support'],
  },
  {
    id: 'fund_and_dispatch',
    label: '预算派送',
    description: '由账房或家主预览预算、运输与派送安排；真实共同基金支出暂不开放。',
    preferred_roles: ['treasurer', 'family_head'],
    compatible_order_types: ['festival_supply', 'emergency_response', 'npc_request'],
  },
  {
    id: 'handoff_confirm',
    label: '交付确认',
    description: '复用公共订单接力的交付与确认凭证，后续再接家族声望和共同资产入账。',
    preferred_roles: ['family_head', 'storage_keeper'],
    compatible_order_types: ['material_help', 'village_build', 'npc_request'],
  },
]);

const FAMILY_REPUTATION_LEVELS = Object.freeze([
  { id: 'seed', label: '初立门户', min_points: 0, next_points: 20 },
  { id: 'trusted', label: '乡邻信赖', min_points: 20, next_points: 60 },
  { id: 'known', label: '一方名望', min_points: 60, next_points: 120 },
  { id: 'renowned', label: '桃源名门', min_points: 120, next_points: null },
]);

const FAMILY_BUILDING_PROJECT_DEFS = Object.freeze([
  {
    id: 'family_hall',
    label: '家族议事厅',
    category: 'governance',
    visual_kind: 'hall',
    required_roles: ['family_head', 'workshop_keeper'],
    material_plan: [
      { item_id: 'wood', label: '木材', quantity: 40 },
      { item_id: 'stone', label: '石料', quantity: 30 },
    ],
    shared_fund_cost: 360,
    stage_count: 3,
    summary: '作为家族职位、订单、声望和分居会议的总入口预览。',
  },
  {
    id: 'shared_granary',
    label: '共仓粮廪',
    category: 'storage',
    visual_kind: 'granary',
    required_roles: ['storage_keeper', 'farm_steward'],
    material_plan: [
      { item_id: 'wood', label: '木材', quantity: 28 },
      { item_id: 'rice', label: '稻米', quantity: 12 },
    ],
    shared_fund_cost: 220,
    stage_count: 2,
    summary: '用于预览共同仓库扩容、灾备和分居返还清单，不开放真实取出。',
  },
  {
    id: 'workshop_yard',
    label: '家族工坊院',
    category: 'crafting',
    visual_kind: 'workshop',
    required_roles: ['workshop_keeper', 'treasurer'],
    material_plan: [
      { item_id: 'wood', label: '木材', quantity: 32 },
      { item_id: 'copper_ore', label: '铜矿石', quantity: 8 },
    ],
    shared_fund_cost: 300,
    stage_count: 3,
    summary: '为后续加工、料理、炼丹和家族订单接力提供建筑预览。',
  },
  {
    id: 'festival_courtyard',
    label: '节会前庭',
    category: 'festival',
    visual_kind: 'courtyard',
    required_roles: ['family_head', 'storage_keeper', 'animal_keeper'],
    material_plan: [
      { item_id: 'wood', label: '木材', quantity: 24 },
      { item_id: 'lantern', label: '灯笼', quantity: 6 },
    ],
    shared_fund_cost: 260,
    stage_count: 2,
    summary: '承接家族节会席位、灯会留影和公共祝福，不直接创建节会房间。',
  },
]);

const FAMILY_RELATION_CAPABILITY_DEFS = Object.freeze([
  {
    id: 'shared_map',
    label: '多人土地',
    kind: 'shared_asset',
    state: 'readonly',
    summary: '只读展示成员田区来源、区域顺序和拼接边界；真实种植 / 浇水 / 收获仍由后续共同庄园写链承接。',
  },
  {
    id: 'shared_warehouse',
    label: '家族共同仓库',
    kind: 'shared_asset',
    state: 'partial_write',
    summary: '当前开放普通物品放入、取出和卖出入共同基金；高品质、稀有、冻结回滚与自动入仓仍暂缓。',
  },
  {
    id: 'shared_fund',
    label: '家族共同基金',
    kind: 'shared_asset',
    state: 'partial_write',
    summary: '当前开放自愿注资、小额白名单支出、共同仓库普通卖出收入和来源 / 支出 ledger；中大额预算确认、订单收入自动入账、返还执行仍暂缓。',
  },
  {
    id: 'family_orders',
    label: '家族订单',
    kind: 'cooperation',
    state: 'planning',
    summary: '复用公共订单接力的多阶段思路，但真实发布、接单、结算和声望写入未开放。',
  },
  {
    id: 'family_reputation',
    label: '家族声望',
    kind: 'progression',
    state: 'planning',
    summary: '只读汇总职位审计、共同仓库和共同基金证据；不持久化声望、不发奖励。',
  },
  {
    id: 'family_buildings',
    label: '家族建筑',
    kind: 'construction',
    state: 'planning',
    summary: '只读展示建筑蓝图、职位缺口、材料和基金预览；不建造、不拆除、不消费共同资产。',
  },
  {
    id: 'family_festival_seats',
    label: '家族节会席位',
    kind: 'festival',
    state: 'planning',
    summary: '只读展示节会席位、候选模板和场景预览；不锁席、不开房、不发奖励。',
  },
]);

const FAMILY_VISIBILITY_SCOPE_DEFS = Object.freeze([
  {
    id: 'contract_members',
    label: '契约成员',
    enabled: true,
    summary: '已接受契约成员可读取家族契约成员、职位和共同经营能力节点。',
  },
  {
    id: 'mutual_friends',
    label: '互关好友',
    enabled: false,
    summary: '未来可选择向双方互关好友展示精简关系图，但必须先有成员同意和可见性审计。',
  },
  {
    id: 'society_members',
    label: '同村社成员',
    enabled: false,
    summary: '未来可选择向同村社成员展示家族庄园组织节点；当前不公开。',
  },
  {
    id: 'public_profile',
    label: '公开档案',
    enabled: false,
    summary: '未来可选择展示公开家族名片；当前不写入玩家公开档案。',
  },
  {
    id: 'festival_room',
    label: '节会房间',
    enabled: false,
    summary: '未来家族节会席位绑定后，可把席位与公开称呼带入节会房间；当前不绑定。',
  },
]);

const FAMILY_VISIBILITY_DATA_CATEGORY_DEFS = Object.freeze([
  { id: 'contract_members', label: '契约成员节点', online_visible: true, publication_allowed: true, source: 'cohabitation_contract' },
  { id: 'family_roles', label: '家族职位节点', online_visible: true, publication_allowed: true, source: 'cohabitation_contract' },
  { id: 'shared_capabilities', label: '共同经营能力节点', online_visible: true, publication_allowed: true, source: 'derived_contract_capabilities' },
  { id: 'fixed_npcs', label: '固定 NPC 关系', online_visible: false, publication_allowed: false, source: 'single_player_save' },
  { id: 'random_npcs', label: '随机 NPC / 熟人 / 长住', online_visible: false, publication_allowed: false, source: 'single_player_save' },
  { id: 'children', label: '孩子与家庭心愿', online_visible: false, publication_allowed: false, source: 'single_player_save' },
  { id: 'pets', label: '宠物与喂食记录', online_visible: false, publication_allowed: false, source: 'single_player_save' },
  { id: 'hidden_spirits', label: '仙灵 / 隐藏 NPC', online_visible: false, publication_allowed: false, source: 'single_player_save' },
  { id: 'romance_state', label: '恋爱 / 婚姻 / 知己状态', online_visible: false, publication_allowed: false, source: 'single_player_save' },
]);

const FAMILY_FESTIVAL_SEAT_ROLE_DEFS = Object.freeze({
  family_head: { id: 'host_caller', label: '主事席', festival_role: 'caller', summary: '负责开场、确认席位和高风险节会决策预览。' },
  storage_keeper: { id: 'supply_keeper', label: '供给席', festival_role: 'support', summary: '负责节会物资、共同仓库供给和补偿清单预览。' },
  farm_steward: { id: 'material_provider', label: '备料席', festival_role: 'member', summary: '负责作物、食材和节会供品预览。' },
  animal_keeper: { id: 'hospitality_keeper', label: '迎客席', festival_role: 'member', summary: '负责动物产物、来客照料和秩序协作预览。' },
  workshop_keeper: { id: 'stage_builder', label: '搭场席', festival_role: 'builder', summary: '负责灯架、赛道、摊位和舞台搭建预览。' },
  treasurer: { id: 'budget_scribe', label: '账房席', festival_role: 'scribe', summary: '负责预算、礼券和结算凭证预览。' },
});

const FAMILY_FESTIVAL_SEAT_TEMPLATE_DEFS = Object.freeze([
  {
    id: 'lantern_fair',
    label: '上元灯会',
    visual_type: 'scene',
    member_limit: 4,
    recommended_roles: ['family_head', 'workshop_keeper', 'farm_steward', 'storage_keeper'],
    unlock_source: 'festival_room',
    summary: '适合家族成员预排主灯、灯谜架、彩绳和摊位分工。',
  },
  {
    id: 'dragon_boat',
    label: '端午赛舟',
    visual_type: 'track',
    member_limit: 4,
    recommended_roles: ['family_head', 'farm_steward', 'animal_keeper', 'workshop_keeper'],
    unlock_source: 'festival_room',
    summary: '适合家族成员预排鼓点、稳舵、划桨和喝彩席位。',
  },
  {
    id: 'laba_cookpot',
    label: '腊八共煮',
    visual_type: 'scene',
    member_limit: 4,
    recommended_roles: ['storage_keeper', 'farm_steward', 'treasurer', 'family_head'],
    unlock_source: 'festival_room',
    summary: '适合预排食材、灶火、预算和收尾纪念分工。',
  },
  {
    id: 'mid_autumn_moonwatch',
    label: '中秋赏月',
    visual_type: 'scene',
    member_limit: 4,
    recommended_roles: ['family_head', 'workshop_keeper', 'treasurer', 'farm_steward'],
    unlock_source: 'festival_room',
    summary: '适合预排赏月席、供品、留影和纪念凭证。',
  },
  {
    id: 'yuanri_vigil',
    label: '元日守岁',
    visual_type: 'scene',
    member_limit: 4,
    recommended_roles: ['family_head', 'storage_keeper', 'treasurer', 'animal_keeper'],
    unlock_source: 'festival_room',
    summary: '适合预排守岁、火盆、迎客和公共进度席位。',
  },
  {
    id: 'qixi_stroll',
    label: '七夕同游',
    visual_type: 'scene',
    member_limit: 2,
    recommended_roles: ['family_head', 'treasurer'],
    unlock_source: 'festival_room',
    family_compatible: false,
    summary: '七夕同游偏双人关系，不作为家族多人席位默认入口。',
  },
]);

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sanitizeText(value, maxLength = 120) {
  return String(value || '').normalize('NFKC').trim().slice(0, maxLength);
}

function normalizeUsername(value) {
  return sanitizeText(value, 40);
}

function normalizeUsernameKey(value) {
  return normalizeUsername(value).toLocaleLowerCase('zh-CN');
}

function normalizeSaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0;
}

function normalizeSaveSlot(value) {
  if (value === null || value === undefined || value === '') return null;
  const slot = Number(value);
  return Number.isInteger(slot) && slot >= 0 && slot <= 2 ? slot : null;
}

function normalizeRelationType(value) {
  const id = sanitizeText(value, 60) || 'lover_cohabitation';
  return RELATION_TYPE_DEFS[id] ? id : 'lover_cohabitation';
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureContractStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_COHABITATION_FILE), { recursive: true });
}

function loadContractStore() {
  ensureContractStore();
  try {
    if (!fs.existsSync(TAOYUAN_COHABITATION_FILE)) {
      return { version: CONTRACT_STORE_VERSION, contracts: [] };
    }
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_COHABITATION_FILE, 'utf8'));
    return {
      version: Number(raw?.version) || CONTRACT_STORE_VERSION,
      contracts: Array.isArray(raw?.contracts) ? raw.contracts.map(normalizeContract).filter(Boolean) : [],
    };
  } catch {
    return { version: CONTRACT_STORE_VERSION, contracts: [] };
  }
}

function saveContractStore(store) {
  ensureContractStore();
  writeJsonFileAtomic(TAOYUAN_COHABITATION_FILE, {
    version: CONTRACT_STORE_VERSION,
    contracts: Array.isArray(store?.contracts) ? store.contracts.map(normalizeContract).filter(Boolean) : [],
  });
}

function createDefaultPermissionSet(type) {
  const def = RELATION_TYPE_DEFS[type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const template = def.permission_template;
  const isMarriage = template === 'marriage';
  const isHighTrust = ['marriage', 'lover', 'bosom'].includes(template);
  const isMediumTrust = ['marriage', 'lover', 'bosom', 'kinship', 'business'].includes(template);
  return {
    template,
    farm: {
      water: true,
      cure_pests: true,
      plant: isMediumTrust,
      harvest: isMediumTrust,
      remove_crop: false,
      use_premium_fertilizer: false,
    },
    animal: {
      feed: true,
      pet: true,
      collect_product: isMediumTrust,
      buy_animal: false,
      sell_animal: false,
    },
    storage: {
      deposit: true,
      withdraw_common: isMediumTrust,
      withdraw_high_quality: isMarriage,
      withdraw_rare: false,
      sell_items: false,
    },
    construction: {
      move_common_furniture: isMediumTrust,
      move_memorial_furniture: isMarriage,
      buy_furniture: isHighTrust,
      demolish_building: false,
      expand_manor: false,
    },
    fund: {
      spend_small: isMediumTrust,
      spend_medium: isHighTrust,
      spend_large: false,
      auto_buy_seeds_feed: isHighTrust,
    },
    family: {
      child_daily_care: isHighTrust,
      family_wish_submit: isHighTrust,
      major_family_choice: false,
    },
    confirmations: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true,
    },
  };
}

function isFamilyRoleContractType(type) {
  return FAMILY_MANOR_TYPES.has(normalizeRelationType(type));
}

function normalizeFamilyManorRole(value, type, memberRole = 'partner') {
  if (!isFamilyRoleContractType(type)) return '';
  const role = sanitizeText(value, 40);
  if (FAMILY_MANOR_ROLE_DEFS[role]) return role;
  return memberRole === 'owner' ? 'family_head' : 'farm_steward';
}

function getFamilyManorRoleDef(roleId) {
  return FAMILY_MANOR_ROLE_DEFS[roleId] || FAMILY_MANOR_ROLE_DEFS.farm_steward;
}

function createEmptyPermissionSet(template) {
  return {
    template,
    farm: {
      water: false,
      cure_pests: false,
      plant: false,
      harvest: false,
      remove_crop: false,
      use_premium_fertilizer: false,
    },
    animal: {
      feed: false,
      pet: false,
      collect_product: false,
      buy_animal: false,
      sell_animal: false,
    },
    storage: {
      deposit: true,
      withdraw_common: false,
      withdraw_high_quality: false,
      withdraw_rare: false,
      sell_items: false,
    },
    construction: {
      move_common_furniture: false,
      move_memorial_furniture: false,
      buy_furniture: false,
      demolish_building: false,
      expand_manor: false,
    },
    fund: {
      spend_small: false,
      spend_medium: false,
      spend_large: false,
      auto_buy_seeds_feed: false,
    },
    family: {
      child_daily_care: false,
      family_wish_submit: false,
      major_family_choice: false,
    },
    confirmations: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true,
    },
  };
}

function createPermissionSetForFamilyRole(type, roleId) {
  const normalizedRole = normalizeFamilyManorRole(roleId, type);
  const permissionSet = createEmptyPermissionSet(`family_role:${normalizedRole}`);
  if (normalizedRole === 'family_head') {
    permissionSet.farm.water = true;
    permissionSet.farm.cure_pests = true;
    permissionSet.farm.plant = true;
    permissionSet.farm.harvest = true;
    permissionSet.animal.feed = true;
    permissionSet.animal.pet = true;
    permissionSet.animal.collect_product = true;
    permissionSet.storage.withdraw_common = true;
    permissionSet.storage.withdraw_high_quality = true;
    permissionSet.storage.sell_items = true;
    permissionSet.construction.move_common_furniture = true;
    permissionSet.construction.move_memorial_furniture = true;
    permissionSet.construction.buy_furniture = true;
    permissionSet.fund.spend_small = true;
    permissionSet.fund.spend_medium = true;
    permissionSet.fund.auto_buy_seeds_feed = true;
    return enforcePermissionSafetyRails(permissionSet, type);
  }
  if (normalizedRole === 'storage_keeper') {
    permissionSet.storage.withdraw_common = true;
  } else if (normalizedRole === 'farm_steward') {
    permissionSet.farm.water = true;
    permissionSet.farm.cure_pests = true;
    permissionSet.farm.plant = true;
    permissionSet.farm.harvest = true;
  } else if (normalizedRole === 'animal_keeper') {
    permissionSet.animal.feed = true;
    permissionSet.animal.pet = true;
    permissionSet.animal.collect_product = true;
  } else if (normalizedRole === 'workshop_keeper') {
    permissionSet.construction.move_common_furniture = true;
    permissionSet.construction.buy_furniture = true;
  } else if (normalizedRole === 'treasurer') {
    permissionSet.fund.spend_small = true;
    permissionSet.fund.spend_medium = true;
    permissionSet.fund.auto_buy_seeds_feed = true;
  }
  return enforcePermissionSafetyRails(permissionSet, type);
}

function normalizePermissionSet(value, type) {
  const defaults = createDefaultPermissionSet(type);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const mergeGroup = groupName => {
    const group = { ...defaults[groupName] };
    const rawGroup = value[groupName] && typeof value[groupName] === 'object' && !Array.isArray(value[groupName])
      ? value[groupName]
      : {};
    for (const key of Object.keys(defaults[groupName])) {
      if (Object.prototype.hasOwnProperty.call(rawGroup, key)) group[key] = rawGroup[key] === true;
    }
    return group;
  };
  return {
    template: sanitizeText(value.template, 40) || defaults.template,
    farm: mergeGroup('farm'),
    animal: mergeGroup('animal'),
    storage: mergeGroup('storage'),
    construction: mergeGroup('construction'),
    fund: mergeGroup('fund'),
    family: mergeGroup('family'),
    confirmations: mergeGroup('confirmations'),
  };
}

function enforcePermissionSafetyRails(permissionSet, type) {
  const normalized = normalizePermissionSet(permissionSet, type);
  normalized.confirmations.rare_withdraw_requires_both = true;
  normalized.confirmations.large_fund_spend_requires_both = true;
  normalized.confirmations.demolish_requires_both = true;
  normalized.confirmations.separation_requires_preview = true;
  return normalized;
}

function normalizePermissionPatch(value = {}, type) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError('请提交有效的权限变更');
  }
  const defaults = createDefaultPermissionSet(type);
  const patch = {};
  let changedFieldCount = 0;
  for (const groupName of PERMISSION_GROUPS) {
    const rawGroup = value[groupName] && typeof value[groupName] === 'object' && !Array.isArray(value[groupName])
      ? value[groupName]
      : null;
    if (!rawGroup) continue;
    const groupPatch = {};
    for (const key of Object.keys(defaults[groupName])) {
      if (!Object.prototype.hasOwnProperty.call(rawGroup, key)) continue;
      groupPatch[key] = rawGroup[key] === true;
      changedFieldCount += 1;
    }
    if (Object.keys(groupPatch).length > 0) patch[groupName] = groupPatch;
  }
  if (changedFieldCount <= 0) throw createError('没有可更新的权限字段');
  return { patch, changed_field_count: changedFieldCount };
}

function applyPermissionPatch(currentPermissions, patch = {}, type) {
  const next = normalizePermissionSet(currentPermissions, type);
  for (const groupName of PERMISSION_GROUPS) {
    if (!patch[groupName]) continue;
    next[groupName] = {
      ...next[groupName],
      ...patch[groupName],
    };
  }
  return enforcePermissionSafetyRails(next, type);
}

function diffPermissionSets(before = {}, after = {}, type) {
  const defaults = createDefaultPermissionSet(type);
  const previous = normalizePermissionSet(before, type);
  const next = normalizePermissionSet(after, type);
  const changes = [];
  for (const groupName of PERMISSION_GROUPS) {
    for (const key of Object.keys(defaults[groupName])) {
      if (previous[groupName][key] === next[groupName][key]) continue;
      changes.push({
        group: groupName,
        key,
        before: previous[groupName][key] === true,
        after: next[groupName][key] === true,
      });
    }
  }
  return changes;
}

function getPlayerMoney(saveData = {}) {
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  return Math.max(0, Math.floor(Number(saveData.player.money) || 0));
}

function normalizeMember(entry = {}) {
  const username = normalizeUsername(entry.username);
  if (!username) return null;
  const status = MEMBER_STATUSES.has(entry.status) ? entry.status : 'pending';
  return {
    username,
    username_key: normalizeUsernameKey(username),
    display_name: sanitizeText(entry.display_name || username, 60),
    role: sanitizeText(entry.role, 30) || 'partner',
    manor_role: sanitizeText(entry.manor_role || entry.family_role || entry.manorRole, 40),
    status,
    save_id: normalizeSaveId(entry.save_id),
    save_slot: normalizeSaveSlot(entry.save_slot),
    last_active_at: Number(entry.last_active_at) || Number(entry.accepted_at) || Number(entry.invited_at) || 0,
    last_action: sanitizeText(entry.last_action, 80),
    invited_at: Number(entry.invited_at) || Number(entry.created_at) || nowSeconds(),
    accepted_at: status === 'accepted' ? Number(entry.accepted_at) || Number(entry.invited_at) || nowSeconds() : 0,
  };
}

function normalizeAuditEntry(entry = {}) {
  return {
    id: sanitizeText(entry.id, 80) || makeId('cohabit_audit'),
    action: sanitizeText(entry.action, 80),
    actor_username: normalizeUsername(entry.actor_username),
    actor_display_name: sanitizeText(entry.actor_display_name || entry.actor_username, 60),
    at: Number(entry.at) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    detail: entry.detail && typeof entry.detail === 'object' && !Array.isArray(entry.detail) ? entry.detail : {},
  };
}

function normalizeFundLedgerEntry(entry = {}) {
  return {
    id: sanitizeText(entry?.id, 80) || makeId('shared_fund_ledger'),
    action: sanitizeText(entry?.action, 80) || 'contribution',
    actor_username: normalizeUsername(entry?.actor_username),
    actor_display_name: sanitizeText(entry?.actor_display_name || entry?.actor_username, 60),
    amount: Math.max(0, Math.floor(Number(entry?.amount) || 0)),
    at: Number(entry?.at) || nowSeconds(),
    memo: sanitizeText(entry?.memo, 160),
    purpose: sanitizeText(entry?.purpose, 80) || 'shared_fund',
    source_owner_id: sanitizeText(entry?.source_owner_id, 100),
    source_owner_username: normalizeUsername(entry?.source_owner_username || entry?.actor_username),
    source_owner_display_name: sanitizeText(entry?.source_owner_display_name || entry?.source_owner_username || entry?.actor_username, 60),
    source_owner_key: normalizeUsernameKey(entry?.source_owner_key || entry?.source_owner_username || entry?.actor_username),
    source_save_id: normalizeSaveId(entry?.source_save_id),
    source_save_slot: normalizeSaveSlot(entry?.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry?.source_save_revision) || 0)),
    target_ref: sanitizeText(entry?.target_ref || entry?.target, 120),
    spend_category: sanitizeText(entry?.spend_category || entry?.category, 80),
    spend_tier: ['small', 'medium', 'large'].includes(entry?.spend_tier) ? entry.spend_tier : '',
    spend_purpose_label: sanitizeText(entry?.spend_purpose_label || entry?.purpose_label, 80),
    balance_after: Math.max(0, Math.floor(Number(entry?.balance_after) || 0)),
    target_item_id: normalizeWarehouseItemId(entry?.target_item_id ?? entry?.targetItemId),
    target_quantity: Math.max(0, Math.floor(Number(entry?.target_quantity ?? entry?.targetQuantity) || 0)),
    target_unit_price: Math.max(0, Math.floor(Number(entry?.target_unit_price ?? entry?.targetUnitPrice) || 0)),
    target_owner_id: sanitizeText(entry?.target_owner_id, 100),
    target_owner_username: normalizeUsername(entry?.target_owner_username),
    target_owner_display_name: sanitizeText(entry?.target_owner_display_name || entry?.target_owner_username, 60),
    target_owner_key: normalizeUsernameKey(entry?.target_owner_key || entry?.target_owner_username),
    target_save_id: normalizeSaveId(entry?.target_save_id),
    target_save_slot: normalizeSaveSlot(entry?.target_save_slot),
    target_save_revision: Math.max(0, Math.floor(Number(entry?.target_save_revision) || 0)),
    target_inventory: sanitizeText(entry?.target_inventory, 40),
    target_slots: Array.isArray(entry?.target_slots)
      ? entry.target_slots.map(slot => ({
          bag: sanitizeText(slot?.bag, 24) || 'inventory.items',
          index: Math.max(0, Math.floor(Number(slot?.index) || 0)),
          quantity: normalizePositiveInt(slot?.quantity, 0),
        })).filter(slot => slot.quantity > 0).slice(0, 12)
      : [],
    auto_pay: entry?.auto_pay === true,
    confirmation_required: entry?.confirmation_required === true,
    confirmation_status: sanitizeText(entry?.confirmation_status, 40) || (entry?.confirmation_required === true ? 'pending' : 'not_required'),
    idempotency_key: sanitizeText(entry?.idempotency_key, 120),
    reversible: entry?.reversible !== false,
    compensation_hint: sanitizeText(entry?.compensation_hint, 180),
    status: ['committed', 'compensated', 'reverted'].includes(entry?.status) ? entry.status : 'committed',
  };
}

function normalizeSharedFund(value = {}) {
  return {
    balance: Math.max(0, Math.floor(Number(value.balance) || 0)),
    ledger: Array.isArray(value.ledger)
      ? value.ledger.map(normalizeFundLedgerEntry).filter(Boolean).slice(0, FUND_LEDGER_LIMIT)
      : [],
  };
}

function normalizeQuality(value) {
  const quality = String(value || 'normal').trim().toLowerCase();
  return WAREHOUSE_QUALITIES.has(quality) ? quality : 'normal';
}

function normalizePositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function normalizeWarehouseItemId(value) {
  const itemId = sanitizeText(value, 80);
  return /^[a-z0-9_:-]{1,80}$/i.test(itemId) ? itemId : '';
}

function isProtectedWarehouseItemId(itemId) {
  const normalized = String(itemId || '').toLowerCase();
  if (!normalized) return true;
  return [
    'quest',
    'unique',
    'bound',
    'memorial',
    'token',
    'ticket',
    'permit',
    'deed',
    'contract',
    'receipt',
    'certificate',
    'rare',
    'legend',
    'ancient',
    'luminous',
    'wind_etched',
    'family',
    'child',
  ].some(fragment => normalized.includes(fragment))
    || normalized.startsWith('key_')
    || normalized.endsWith('_key')
    || normalized.endsWith('_core');
}

function normalizeWarehouseItem(entry = {}) {
  const itemId = normalizeWarehouseItemId(entry.item_id ?? entry.itemId);
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  const quality = normalizeQuality(entry.quality);
  const sourceOwnerKeys = Array.isArray(entry.source_owner_keys)
    ? [...new Set(entry.source_owner_keys.map(normalizeUsernameKey).filter(Boolean))]
    : [];
  return {
    id: sanitizeText(entry.id, 100) || `${itemId}:${quality}`,
    item_id: itemId,
    quality,
    quantity,
    first_deposit_at: Number(entry.first_deposit_at) || Number(entry.last_deposit_at) || nowSeconds(),
    last_deposit_at: Number(entry.last_deposit_at) || Number(entry.first_deposit_at) || nowSeconds(),
    source_owner_keys: sourceOwnerKeys,
  };
}

function normalizeWarehouseLedgerEntry(entry = {}) {
  const itemId = normalizeWarehouseItemId(entry.item_id ?? entry.itemId);
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  const action = ['deposit', 'withdraw', 'sell', 'consume', 'compensate', 'revert'].includes(entry.action) ? entry.action : 'deposit';
  const actorUsername = normalizeUsername(entry.actor_username);
  const sourceOwnerUsername = normalizeUsername(entry.source_owner_username || actorUsername);
  const sourceSlots = Array.isArray(entry.source_slots)
    ? entry.source_slots.map(slot => ({
        index: Math.max(0, Math.floor(Number(slot?.index) || 0)),
        quantity: normalizePositiveInt(slot?.quantity, 0),
      })).filter(slot => slot.quantity > 0).slice(0, 8)
    : [];
  const sourceLedgerIds = Array.isArray(entry.source_ledger_ids)
    ? entry.source_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
    : [];
  const targetSlots = Array.isArray(entry.target_slots)
    ? entry.target_slots.map(slot => ({
        bag: sanitizeText(slot?.bag, 24) || 'inventory.items',
        index: Math.max(0, Math.floor(Number(slot?.index) || 0)),
        quantity: normalizePositiveInt(slot?.quantity, 0),
      })).filter(slot => slot.quantity > 0).slice(0, 12)
    : [];
  const targetOwnerUsername = normalizeUsername(entry.target_owner_username || actorUsername);
  return {
    id: sanitizeText(entry.id, 100) || makeId('shared_warehouse_ledger'),
    action,
    item_id: itemId,
    quality: normalizeQuality(entry.quality),
    quantity,
    actor_username: actorUsername,
    actor_display_name: sanitizeText(entry.actor_display_name || actorUsername, 60),
    actor_manor_role: sanitizeText(entry.actor_manor_role, 40),
    actor_manor_role_label: sanitizeText(entry.actor_manor_role_label, 40),
    source_owner_id: sanitizeText(entry.source_owner_id, 100),
    source_owner_username: sourceOwnerUsername,
    source_owner_display_name: sanitizeText(entry.source_owner_display_name || sourceOwnerUsername, 60),
    source_owner_key: normalizeUsernameKey(entry.source_owner_key || sourceOwnerUsername),
    source_owner_manor_role: sanitizeText(entry.source_owner_manor_role, 40),
    source_owner_manor_role_label: sanitizeText(entry.source_owner_manor_role_label, 40),
    source_save_id: normalizeSaveId(entry.source_save_id),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    source_inventory: sanitizeText(entry.source_inventory, 40) || 'inventory.items',
    source_slots: sourceSlots,
    source_ledger_ids: sourceLedgerIds,
    target_owner_id: sanitizeText(entry.target_owner_id, 100),
    target_owner_username: targetOwnerUsername,
    target_owner_display_name: sanitizeText(entry.target_owner_display_name || targetOwnerUsername, 60),
    target_owner_key: normalizeUsernameKey(entry.target_owner_key || targetOwnerUsername),
    target_save_id: normalizeSaveId(entry.target_save_id),
    target_save_slot: normalizeSaveSlot(entry.target_save_slot),
    target_save_revision: Math.max(0, Math.floor(Number(entry.target_save_revision) || 0)),
    target_inventory: sanitizeText(entry.target_inventory, 40),
    target_slots: targetSlots,
    target_ref: sanitizeText(entry.target_ref || entry.target, 120),
    unit_price: Math.max(0, Math.floor(Number(entry.unit_price ?? entry.unitPrice) || 0)),
    total_amount: Math.max(0, Math.floor(Number(entry.total_amount ?? entry.totalAmount) || 0)),
    fund_ledger_id: sanitizeText(entry.fund_ledger_id, 100),
    at: Number(entry.at) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    reversible: entry.reversible !== false,
    compensation_hint: sanitizeText(entry.compensation_hint, 180),
    status: ['committed', 'compensated', 'reverted'].includes(entry.status) ? entry.status : 'committed',
  };
}

function buildWarehouseItemsFromLedger(ledger = []) {
  const aggregate = new Map();
  for (const entry of ledger.slice().reverse()) {
    const normalized = normalizeWarehouseLedgerEntry(entry);
    if (!normalized || normalized.status !== 'committed') continue;
    const key = `${normalized.item_id}:${normalized.quality}`;
    const current = aggregate.get(key) || {
      id: key,
      item_id: normalized.item_id,
      quality: normalized.quality,
      quantity: 0,
      first_deposit_at: normalized.at,
      last_deposit_at: normalized.at,
      source_owner_keys: [],
    };
    const delta = normalized.action === 'deposit' || normalized.action === 'compensate'
      ? normalized.quantity
      : -normalized.quantity;
    current.quantity = Math.max(0, current.quantity + delta);
    current.first_deposit_at = Math.min(current.first_deposit_at || normalized.at, normalized.at);
    current.last_deposit_at = Math.max(current.last_deposit_at || normalized.at, normalized.at);
    if (normalized.source_owner_key && !current.source_owner_keys.includes(normalized.source_owner_key)) {
      current.source_owner_keys.push(normalized.source_owner_key);
    }
    aggregate.set(key, current);
  }
  return [...aggregate.values()]
    .map(normalizeWarehouseItem)
    .filter(Boolean)
    .filter(item => item.quantity > 0)
    .slice(0, WAREHOUSE_ORIGIN_LIMIT);
}

function normalizeSharedWarehouse(value = {}) {
  const ledger = Array.isArray(value.ledger)
    ? value.ledger.map(normalizeWarehouseLedgerEntry).filter(Boolean).slice(0, WAREHOUSE_LEDGER_LIMIT)
    : [];
  return {
    items: buildWarehouseItemsFromLedger(ledger),
    ledger,
  };
}

function normalizeOriginAssets(value = {}) {
  return {
    plots: Array.isArray(value.plots) ? value.plots : [],
    warehouse_items: Array.isArray(value.warehouse_items) ? value.warehouse_items : [],
    decorations: Array.isArray(value.decorations) ? value.decorations : [],
    fund_contributions: Array.isArray(value.fund_contributions) ? value.fund_contributions : [],
  };
}

function normalizeFarmSize(value, plotCount = 0) {
  const size = Number(value);
  if ([4, 6, 8].includes(size)) return size;
  const inferred = Math.sqrt(Number(plotCount) || 0);
  if ([4, 6, 8].includes(inferred)) return inferred;
  return 4;
}

function normalizePlotId(value, fallback) {
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : fallback;
}

function normalizePlotState(value) {
  const state = String(value || '').trim();
  if (['wasteland', 'tilled', 'planted', 'growing', 'harvestable'].includes(state)) return state;
  return 'wasteland';
}

function summarizeFarmPlot(plot = {}) {
  const cropId = sanitizeText(plot.cropId ?? plot.crop_id, 80);
  const fertilizer = sanitizeText(plot.fertilizer, 80);
  const giantCropGroup = plot.giantCropGroup ?? plot.giant_crop_group;
  return {
    state: normalizePlotState(plot.state),
    crop_id: cropId || null,
    growth_days: Math.max(0, Math.floor(Number(plot.growthDays ?? plot.growth_days) || 0)),
    watered: plot.watered === true,
    unwatered_days: Math.max(0, Math.floor(Number(plot.unwateredDays ?? plot.unwatered_days) || 0)),
    fertilizer: fertilizer || null,
    harvest_count: Math.max(0, Math.floor(Number(plot.harvestCount ?? plot.harvest_count) || 0)),
    giant_crop_group: giantCropGroup === null || giantCropGroup === undefined || giantCropGroup === ''
      ? null
      : Math.max(0, Math.floor(Number(giantCropGroup) || 0)),
    infested: plot.infested === true,
    infested_days: Math.max(0, Math.floor(Number(plot.infestedDays ?? plot.infested_days) || 0)),
    weedy: plot.weedy === true,
    weedy_days: Math.max(0, Math.floor(Number(plot.weedyDays ?? plot.weedy_days) || 0)),
  };
}

function countPlotStates(plots = []) {
  return plots.reduce((summary, plot) => {
    const state = plot?.plot_state?.state || 'wasteland';
    summary.total += 1;
    if (state !== 'wasteland') summary.active += 1;
    if (state === 'harvestable') summary.harvestable += 1;
    if (['planted', 'growing'].includes(state) && plot?.plot_state?.watered !== true) summary.waterable += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    harvestable: 0,
    waterable: 0,
  });
}

function getContainerIdentity(saveContainer = {}) {
  return saveContainer?.gameplayData?.onlineIdentity
    || saveContainer?.gameplayData?.saveIdentity
    || saveContainer?.root?.meta?.onlineIdentity
    || saveContainer?.root?.meta?.saveIdentity
    || null;
}

function resolveMemberIdentity(member = {}) {
  const memberSaveId = normalizeSaveId(member.save_id);
  if (!memberSaveId) return null;
  try {
    const identity = findSaveIdentityById(memberSaveId);
    if (!identity) return null;
    if (normalizeUsernameKey(identity.account_username) !== member.username_key) return null;
    return identity;
  } catch {
    return null;
  }
}

function resolveMemberSaveSlot(member = {}, saves = {}, identity = null) {
  const preferredSlot = normalizeSaveSlot(member.save_slot ?? identity?.save_slot);
  if (preferredSlot !== null && saves?.slots?.[preferredSlot]?.raw) return preferredSlot;
  const activeSlot = getActiveSaveSlot(member.username);
  if (activeSlot !== null && saves?.slots?.[activeSlot]?.raw) return activeSlot;
  const fallbackSlot = [0, 1, 2].find(slot => typeof saves?.slots?.[slot]?.raw === 'string' && saves.slots[slot].raw);
  return fallbackSlot === undefined ? null : fallbackSlot;
}

function readMemberFarmSnapshot(member = {}) {
  const identity = resolveMemberIdentity(member);
  try {
    const saves = loadUserSaveSlots(member.username);
    const slot = resolveMemberSaveSlot(member, saves, identity);
    if (slot === null) {
      return {
        available: false,
        unavailable_reason: '成员没有可读取的服务端存档',
        member,
        save_slot: null,
        save_revision: 0,
        save_id: normalizeSaveId(member.save_id || identity?.save_id),
        farm_size: 0,
        plots: [],
      };
    }
    const entry = saves.slots[slot];
    const decrypted = decryptTaoyuanRaw(entry.raw);
    const saveContainer = normalizeGameplaySaveContainer(decrypted);
    const gameplay = saveContainer?.gameplayData;
    const farm = gameplay?.farm && typeof gameplay.farm === 'object' ? gameplay.farm : null;
    if (!farm) {
      return {
        available: false,
        unavailable_reason: '成员存档缺少农田数据',
        member,
        save_slot: slot,
        save_revision: Number(entry.revision) || 0,
        save_id: normalizeSaveId(member.save_id || identity?.save_id),
        farm_size: 0,
        plots: [],
      };
    }
    const onlineIdentity = getContainerIdentity(saveContainer);
    const plots = Array.isArray(farm.plots) ? farm.plots : [];
    const saveId = normalizeSaveId(member.save_id || identity?.save_id || onlineIdentity?.save_id || onlineIdentity?.saveId);
    return {
      available: true,
      unavailable_reason: '',
      member,
      save_slot: slot,
      save_revision: Number(entry.revision) || 0,
      save_id: saveId,
      farm_size: normalizeFarmSize(farm.farmSize ?? farm.farm_size, plots.length),
      plots,
      greenhouse_plot_count: Array.isArray(farm.greenhousePlots) ? farm.greenhousePlots.length : 0,
      fruit_tree_count: Array.isArray(farm.fruitTrees) ? farm.fruitTrees.length : 0,
    };
  } catch {
    return {
      available: false,
      unavailable_reason: '成员存档读取失败',
      member,
      save_slot: null,
      save_revision: 0,
      save_id: normalizeSaveId(member.save_id || identity?.save_id),
      farm_size: 0,
      plots: [],
    };
  }
}

function getPlotPermissionMode(contract = {}, ownerKey = '') {
  const acceptedMembers = (contract.members || []).filter(member => member.status === 'accepted');
  const sharedOperators = acceptedMembers.filter(member => {
    if (member.username_key === ownerKey) return true;
    const farmPermissions = contract.permissions?.[member.username_key]?.farm || {};
    return farmPermissions.water === true || farmPermissions.plant === true || farmPermissions.harvest === true;
  });
  return sharedOperators.length > 1 ? 'shared' : 'owner_only';
}

function buildSharedFarmPlots(contract, farmSnapshots) {
  const plots = [];
  const regions = [];
  let columnOffset = 0;
  let maxRows = 0;

  farmSnapshots.forEach((farmSnapshot, regionIndex) => {
    const member = farmSnapshot.member;
    const width = farmSnapshot.available ? farmSnapshot.farm_size : 0;
    const height = farmSnapshot.available ? farmSnapshot.farm_size : 0;
    const originOwnerId = farmSnapshot.save_id
      ? `save:${farmSnapshot.save_id}`
      : `account:${member.username_key}`;
    const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    const roleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole) : null;
    const permissionMode = getPlotPermissionMode(contract, member.username_key);
    const region = {
      region_index: regionIndex,
      member_username: member.username,
      member_username_key: member.username_key,
      member_display_name: member.display_name,
      member_role: member.role,
      manor_role: manorRole,
      manor_role_label: roleDef?.label || '',
      origin_owner_id: originOwnerId,
      origin_save_id: farmSnapshot.save_id,
      x: columnOffset,
      y: 0,
      width,
      height,
      available: farmSnapshot.available,
      unavailable_reason: farmSnapshot.unavailable_reason,
      source_area: 'field',
      field_plot_count: Array.isArray(farmSnapshot.plots) ? farmSnapshot.plots.length : 0,
      permission_mode: permissionMode,
    };
    regions.push(region);
    if (farmSnapshot.available) {
      farmSnapshot.plots.forEach((plot, index) => {
        const sourcePlotId = normalizePlotId(plot?.id ?? plot?.plotId ?? plot?.plot_id, index);
        const localColumn = sourcePlotId % farmSnapshot.farm_size;
        const localRow = Math.floor(sourcePlotId / farmSnapshot.farm_size);
        plots.push({
          id: `${member.username_key}:field:${sourcePlotId}`,
          source_area: 'field',
          source_plot_id: sourcePlotId,
          origin_owner_id: originOwnerId,
          origin_save_id: farmSnapshot.save_id,
          origin_owner_username: member.username,
          origin_owner_display_name: member.display_name,
          origin_owner_key: member.username_key,
          origin_owner_manor_role: manorRole,
          origin_owner_manor_role_label: roleDef?.label || '',
          current_steward_username: member.username,
          current_steward_display_name: member.display_name,
          current_steward_manor_role: manorRole,
          current_steward_manor_role_label: roleDef?.label || '',
          permission_mode: permissionMode,
          x: columnOffset + localColumn,
          y: localRow,
          row: localRow,
          col: columnOffset + localColumn,
          local_row: localRow,
          local_col: localColumn,
          plot_state: summarizeFarmPlot(plot),
          readonly: true,
        });
      });
    }
    columnOffset += width;
    maxRows = Math.max(maxRows, height);
  });

  return {
    plots,
    regions,
    columns: columnOffset,
    rows: maxRows,
    arrangement: 'side_by_side',
    strategy: 'member_region_x_axis',
    stitch_axis: 'x',
  };
}

function buildSharedMapLayoutSummary(contract = {}, farmSnapshots = [], layout = {}) {
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const regions = Array.isArray(layout.regions) ? layout.regions : [];
  return {
    type: contract.type,
    type_label: contract.type_label,
    max_members: typeDef.max_members,
    member_count: (contract.members || []).length,
    accepted_member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
    available_member_count: farmSnapshots.filter(snapshot => snapshot.available).length,
    region_count: regions.length,
    available_region_count: regions.filter(region => region.available).length,
    unavailable_region_count: regions.filter(region => region.available !== true).length,
    supports_multi_member: typeDef.max_members > 2,
    family_manor_layout: isFamilyRoleContractType(contract.type),
    romance_contracts_dual_only: typeDef.romance_only === true,
    arrangement: layout.arrangement || 'side_by_side',
    strategy: layout.strategy || 'member_region_x_axis',
    stitch_axis: layout.stitch_axis || 'x',
    personal_money_merged: false,
    writes_enabled: false,
    origin_trace_enabled: true,
    split_policy: 'return_plots_by_origin_owner_id',
    region_order: regions.map(region => ({
      region_index: region.region_index,
      member_username: region.member_username,
      member_username_key: region.member_username_key,
      member_display_name: region.member_display_name,
      member_role: region.member_role,
      manor_role: region.manor_role,
      manor_role_label: region.manor_role_label,
      origin_owner_id: region.origin_owner_id,
      origin_save_id: region.origin_save_id,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      available: region.available,
      field_plot_count: region.field_plot_count,
      permission_mode: region.permission_mode,
    })),
    deferred_writes: [
      'plant',
      'water',
      'harvest',
      'shared_warehouse_auto_deposit',
      'persistent_shared_manor_map',
    ],
  };
}

function normalizeSeparationPreview(entry = {}) {
  return {
    version: Math.max(SEPARATION_PREVIEW_VERSION, Math.floor(Number(entry.version) || SEPARATION_PREVIEW_VERSION)),
    id: sanitizeText(entry.id, 80) || makeId('separation_preview'),
    contract_id: sanitizeText(entry.contract_id, 80),
    requested_by: normalizeUsername(entry.requested_by),
    state: ['draft', 'confirmed', 'expired'].includes(entry.state) ? entry.state : 'draft',
    created_at: Number(entry.created_at) || nowSeconds(),
    expires_at: Number(entry.expires_at) || (nowSeconds() + 72 * 60 * 60),
    confirm_after_at: Math.max(0, Math.floor(Number(entry.confirm_after_at) || 0)),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    summary: sanitizeText(entry.summary, 300),
    asset_return: entry.asset_return && typeof entry.asset_return === 'object' ? entry.asset_return : {},
    compensation_plan: Array.isArray(entry.compensation_plan) ? entry.compensation_plan : [],
    narrative_hooks: Array.isArray(entry.narrative_hooks) ? entry.narrative_hooks.map(item => sanitizeText(item, 120)).filter(Boolean) : [],
    confirmation_state: entry.confirmation_state && typeof entry.confirmation_state === 'object' && !Array.isArray(entry.confirmation_state)
      ? entry.confirmation_state
      : {},
    safety_checks: Array.isArray(entry.safety_checks) ? entry.safety_checks : [],
    deferred_operations: Array.isArray(entry.deferred_operations)
      ? entry.deferred_operations.map(item => sanitizeText(item, 80)).filter(Boolean)
      : [],
    manual_execution_required: entry.manual_execution_required !== false,
    requires_both_confirm: entry.requires_both_confirm !== false,
  };
}

function normalizeFundLargeSpendDraft(entry = {}) {
  const requiredMemberUsernames = Array.isArray(entry.required_member_usernames)
    ? entry.required_member_usernames.map(normalizeUsername).filter(Boolean)
    : [];
  const confirmedMemberUsernames = Array.isArray(entry.confirmed_member_usernames)
    ? entry.confirmed_member_usernames.map(normalizeUsername).filter(Boolean)
    : [];
  const pendingMemberUsernames = Array.isArray(entry.pending_member_usernames)
    ? entry.pending_member_usernames.map(normalizeUsername).filter(Boolean)
    : requiredMemberUsernames.filter(username => !confirmedMemberUsernames.includes(username));
  const allMembersConfirmed = requiredMemberUsernames.length > 0
    && requiredMemberUsernames.every(username => confirmedMemberUsernames.includes(username));
  const confirmationEvents = Array.isArray(entry.confirmation_events)
    ? entry.confirmation_events.map(event => ({
      actor_username: normalizeUsername(event.actor_username || event.username),
      actor_display_name: sanitizeText(event.actor_display_name || event.display_name, 80),
      confirmed_at: Number(event.confirmed_at || event.at) || 0,
      idempotency_key: sanitizeText(event.idempotency_key, 120),
      memo: sanitizeText(event.memo || event.note, 160),
    })).filter(event => event.actor_username).slice(-FUND_LARGE_SPEND_DRAFT_LIMIT)
    : [];
  const rawConfirmationState = entry.confirmation_state && typeof entry.confirmation_state === 'object' && !Array.isArray(entry.confirmation_state)
    ? entry.confirmation_state
    : {};
  return {
    id: sanitizeText(entry.id, 80) || makeId('fund_large_spend_draft'),
    contract_id: sanitizeText(entry.contract_id, 80),
    state: ['pending_confirmation', 'ready_to_execute', 'executed', 'expired', 'cancelled'].includes(entry.state)
      ? entry.state
      : 'pending_confirmation',
    requested_by: normalizeUsername(entry.requested_by || entry.actor_username),
    requested_by_key: normalizeUsernameKey(entry.requested_by_key || entry.requested_by || entry.actor_username),
    amount: Math.max(0, Math.floor(Number(entry.amount) || 0)),
    purpose: sanitizeText(entry.purpose, 80) || 'family_building',
    purpose_label: sanitizeText(entry.purpose_label, 80),
    spend_category: sanitizeText(entry.spend_category || entry.category, 80),
    target_ref: sanitizeText(entry.target_ref || entry.target, 120),
    memo: sanitizeText(entry.memo || entry.note, 160),
    balance_snapshot: Math.max(0, Math.floor(Number(entry.balance_snapshot) || 0)),
    projected_balance_after: Math.max(0, Math.floor(Number(entry.projected_balance_after) || 0)),
    current_balance_snapshot: Math.max(0, Math.floor(Number(entry.current_balance_snapshot) || Number(entry.balance_snapshot) || 0)),
    projected_current_balance_after: Math.max(0, Math.floor(Number(entry.projected_current_balance_after) || Number(entry.projected_balance_after) || 0)),
    balance_sufficient: entry.balance_sufficient === true,
    required_member_usernames: requiredMemberUsernames,
    confirmed_member_usernames: confirmedMemberUsernames,
    pending_member_usernames: pendingMemberUsernames,
    confirmation_events: confirmationEvents,
    confirmation_state: {
      required_member_usernames: Array.isArray(rawConfirmationState.required_member_usernames)
        ? rawConfirmationState.required_member_usernames.map(normalizeUsername).filter(Boolean)
        : requiredMemberUsernames,
      confirmed_member_usernames: Array.isArray(rawConfirmationState.confirmed_member_usernames)
        ? rawConfirmationState.confirmed_member_usernames.map(normalizeUsername).filter(Boolean)
        : confirmedMemberUsernames,
      pending_member_usernames: Array.isArray(rawConfirmationState.pending_member_usernames)
        ? rawConfirmationState.pending_member_usernames.map(normalizeUsername).filter(Boolean)
        : pendingMemberUsernames,
      requester_auto_confirmed: rawConfirmationState.requester_auto_confirmed !== false,
      requires_all_members: rawConfirmationState.requires_all_members !== false,
      all_members_confirmed: rawConfirmationState.all_members_confirmed === true || allMembersConfirmed,
      ready_for_execution_request: rawConfirmationState.ready_for_execution_request === true || allMembersConfirmed,
      last_confirmed_by: normalizeUsername(rawConfirmationState.last_confirmed_by),
      last_confirmed_at: Math.max(0, Math.floor(Number(rawConfirmationState.last_confirmed_at) || 0)),
      can_execute_now: false,
      execution_enabled: false,
      policy: sanitizeText(rawConfirmationState.policy, 180) || '大额建筑 / 扩建支出必须先完成全部成员确认，执行扣款另走后续专用接口。',
    },
    created_at: Number(entry.created_at) || nowSeconds(),
    expires_at: Number(entry.expires_at) || (nowSeconds() + 72 * 60 * 60),
    ready_at: Math.max(0, Math.floor(Number(entry.ready_at) || 0)),
    confirmed_at: Math.max(0, Math.floor(Number(entry.confirmed_at) || 0)),
    executed_at: Math.max(0, Math.floor(Number(entry.executed_at) || 0)),
    executed_by: normalizeUsername(entry.executed_by),
    last_confirmed_by: normalizeUsername(entry.last_confirmed_by),
    last_confirmed_at: Math.max(0, Math.floor(Number(entry.last_confirmed_at) || 0)),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    confirmation_required: true,
    confirmation_status: sanitizeText(entry.confirmation_status, 40) || 'pending',
    execution_enabled: false,
    final_spend_ledger_id: sanitizeText(entry.final_spend_ledger_id, 80),
    final_building_ledger_id: sanitizeText(entry.final_building_ledger_id, 100),
    compensation_policy: sanitizeText(entry.compensation_policy, 180) || '草案阶段不扣基金；后续执行若失败必须按确认草案、基金 ledger 和建筑 ledger 重放或回滚。',
    deferred_operations: Array.isArray(entry.deferred_operations)
      ? entry.deferred_operations.map(item => sanitizeText(item, 80)).filter(Boolean)
      : ['confirm_large_fund_spend', 'execute_large_fund_spend', 'building_ledger_write', 'fund_compensation_replay'],
  };
}

function normalizeFamilyBuildingLedgerEntry(entry = {}) {
  const at = Number(entry.at || entry.created_at) || nowSeconds();
  const targetRef = sanitizeText(entry.target_ref || entry.target, 120);
  const targetParts = targetRef.split(':').map(part => sanitizeText(part, 40)).filter(Boolean);
  const inferredTargetId = targetParts[0] === 'family_building' && targetParts[1]
    ? targetParts[1]
    : (targetParts[0] === 'manor_expansion' && targetParts[1] ? targetParts[1] : '');
  const action = [
    'fund_large_spend_executed',
    'real_build_applied',
    'manor_expansion_recorded',
    'compensated',
    'reverted',
  ].includes(entry.action) ? entry.action : 'fund_large_spend_executed';
  return {
    id: sanitizeText(entry.id, 100) || makeId('family_building_ledger'),
    contract_id: sanitizeText(entry.contract_id, 80),
    action,
    purpose: sanitizeText(entry.purpose, 80) || 'family_building',
    purpose_label: sanitizeText(entry.purpose_label, 80),
    spend_category: sanitizeText(entry.spend_category || entry.category, 80),
    target_ref: targetRef,
    building_id: sanitizeText(entry.building_id || entry.project_id || inferredTargetId, 80),
    project_id: sanitizeText(entry.project_id || entry.building_id || inferredTargetId, 80),
    draft_id: sanitizeText(entry.draft_id, 100),
    fund_ledger_id: sanitizeText(entry.fund_ledger_id, 100),
    actor_username: normalizeUsername(entry.actor_username),
    actor_display_name: sanitizeText(entry.actor_display_name || entry.actor_username, 60),
    actor_manor_role: sanitizeText(entry.actor_manor_role, 40),
    actor_manor_role_label: sanitizeText(entry.actor_manor_role_label, 40),
    amount: Math.max(0, Math.floor(Number(entry.amount) || 0)),
    shared_fund_balance_before: Math.max(0, Math.floor(Number(entry.shared_fund_balance_before) || 0)),
    shared_fund_balance_after: Math.max(0, Math.floor(Number(entry.shared_fund_balance_after) || 0)),
    shared_fund_deducted: entry.shared_fund_deducted === true,
    shared_warehouse_materials_consumed: entry.shared_warehouse_materials_consumed === true,
    personal_money_merged: entry.personal_money_merged === true,
    personal_inventory_merged: entry.personal_inventory_merged === true,
    real_build_applied: entry.real_build_applied === true,
    compensation_required: entry.compensation_required !== false,
    compensation_hint: sanitizeText(entry.compensation_hint, 180),
    deferred_operations: Array.isArray(entry.deferred_operations)
      ? entry.deferred_operations.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 12)
      : ['real_build_apply', 'fund_compensation_replay'],
    at,
    created_at: Number(entry.created_at || entry.at) || at,
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    apply_idempotency_key: sanitizeText(entry.apply_idempotency_key, 120),
    applied_at: Math.max(0, Math.floor(Number(entry.applied_at) || 0)),
    applied_by_username: normalizeUsername(entry.applied_by_username),
    applied_by_display_name: sanitizeText(entry.applied_by_display_name || entry.applied_by_username, 60),
    real_build_ref: sanitizeText(entry.real_build_ref, 120),
    materials_idempotency_key: sanitizeText(entry.materials_idempotency_key, 120),
    materials_consumed_at: Math.max(0, Math.floor(Number(entry.materials_consumed_at) || 0)),
    materials_consumed_by_username: normalizeUsername(entry.materials_consumed_by_username),
    materials_consumed_by_display_name: sanitizeText(entry.materials_consumed_by_display_name || entry.materials_consumed_by_username, 60),
    material_ledger_ids: Array.isArray(entry.material_ledger_ids)
      ? entry.material_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 20)
      : [],
    material_consumptions: Array.isArray(entry.material_consumptions)
      ? entry.material_consumptions.map(item => ({
          item_id: normalizeWarehouseItemId(item?.item_id ?? item?.itemId),
          label: sanitizeText(item?.label, 40),
          quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)),
          quality: normalizeQuality(item?.quality),
          warehouse_ledger_ids: Array.isArray(item?.warehouse_ledger_ids)
            ? item.warehouse_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
            : [],
        })).filter(item => item.item_id && item.quantity > 0).slice(0, 12)
      : [],
    reversible: entry.reversible !== false,
    status: ['fund_spend_recorded', 'build_applied', 'compensated', 'reverted'].includes(entry.status)
      ? entry.status
      : 'fund_spend_recorded',
  };
}

function normalizeContract(entry = {}) {
  const type = normalizeRelationType(entry.type);
  const status = CONTRACT_STATUSES.has(entry.status) ? entry.status : 'pending_acceptance';
  const members = (Array.isArray(entry.members) ? entry.members : [])
    .map(normalizeMember)
    .filter(Boolean);
  if (members.length < 2) return null;
  const uniqueMembers = [];
  const seen = new Set();
  for (const member of members) {
    if (seen.has(member.username_key)) continue;
    seen.add(member.username_key);
    member.manor_role = normalizeFamilyManorRole(member.manor_role, type, member.role);
    uniqueMembers.push(member);
  }
  const permissions = {};
  const rawPermissions = entry.permissions && typeof entry.permissions === 'object' ? entry.permissions : {};
  for (const member of uniqueMembers) {
    permissions[member.username_key] = normalizePermissionSet(rawPermissions[member.username_key] || rawPermissions[member.username], type);
  }
  return {
    id: sanitizeText(entry.id, 80) || makeId('cohabitation_contract'),
    type,
    type_label: RELATION_TYPE_DEFS[type].label,
    title: sanitizeText(entry.title, 80) || RELATION_TYPE_DEFS[type].title,
    status,
    members: uniqueMembers,
    shared_manor_id: sanitizeText(entry.shared_manor_id, 80),
    shared_fund: normalizeSharedFund(entry.shared_fund),
    shared_warehouse: normalizeSharedWarehouse(entry.shared_warehouse),
    origin_assets: normalizeOriginAssets(entry.origin_assets),
    permissions,
    separation_policy: {
      cooldown_hours: Math.max(24, Number(entry.separation_policy?.cooldown_hours) || 72),
      requires_preview: entry.separation_policy?.requires_preview !== false,
      requires_both_confirm_for_high_value: entry.separation_policy?.requires_both_confirm_for_high_value !== false,
      keep_memorial: entry.separation_policy?.keep_memorial !== false,
    },
    separation_previews: Array.isArray(entry.separation_previews)
      ? entry.separation_previews.map(normalizeSeparationPreview).slice(-10)
      : [],
    separation_execution_ledger: Array.isArray(entry.separation_execution_ledger)
      ? entry.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry).slice(0, 20)
      : [],
    separation_state: sanitizeText(entry.separation_state, 100),
    fund_large_spend_drafts: Array.isArray(entry.fund_large_spend_drafts)
      ? entry.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft).slice(0, FUND_LARGE_SPEND_DRAFT_LIMIT)
      : [],
    family_building_ledger: Array.isArray(entry.family_building_ledger)
      ? entry.family_building_ledger.map(normalizeFamilyBuildingLedgerEntry).slice(0, FAMILY_BUILDING_LEDGER_LIMIT)
      : [],
    created_by: normalizeUsername(entry.created_by),
    created_at: Number(entry.created_at) || nowSeconds(),
    updated_at: Number(entry.updated_at) || Number(entry.created_at) || nowSeconds(),
    activated_at: Number(entry.activated_at) || 0,
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    audit_log: Array.isArray(entry.audit_log) ? entry.audit_log.map(normalizeAuditEntry).slice(-80) : [],
  };
}

function contractBelongsToUser(contract, username) {
  const key = normalizeUsernameKey(username);
  return !!key && contract.members.some(member => member.username_key === key);
}

function buildMembersKey(members) {
  return members.map(member => member.username_key).sort().join('|');
}

function findOpenContract(store, members) {
  const targetKey = buildMembersKey(members);
  return store.contracts.find(contract =>
    OPEN_CONTRACT_STATUSES.has(contract.status)
    && buildMembersKey(contract.members) === targetKey
  ) || null;
}

function appendAudit(contract, action, actor = {}, detail = {}, idempotencyKey = '') {
  const actorKey = normalizeUsernameKey(actor.username);
  const actorMember = actorKey ? getContractMember(contract, actorKey) : null;
  if (actorMember) {
    actorMember.last_active_at = nowSeconds();
    actorMember.last_action = sanitizeText(action, 80);
  }
  contract.audit_log = [
    normalizeAuditEntry({
      action,
      actor_username: actor.username,
      actor_display_name: actor.displayName || actor.display_name || actor.username,
      detail,
      idempotency_key: idempotencyKey,
    }),
    ...(Array.isArray(contract.audit_log) ? contract.audit_log : []),
  ].slice(0, 80);
  contract.updated_at = nowSeconds();
  return contract;
}

function toPublicContract(contract) {
  return {
    ...contract,
    members: contract.members.map(member => ({ ...member })),
    shared_fund: normalizeSharedFund(contract.shared_fund),
    shared_warehouse: normalizeSharedWarehouse(contract.shared_warehouse),
    fund_large_spend_drafts: Array.isArray(contract.fund_large_spend_drafts)
      ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft).slice(0, FUND_LARGE_SPEND_DRAFT_LIMIT)
      : [],
    family_building_ledger: Array.isArray(contract.family_building_ledger)
      ? contract.family_building_ledger.map(normalizeFamilyBuildingLedgerEntry).slice(0, FAMILY_BUILDING_LEDGER_LIMIT)
      : [],
    permissions: Object.fromEntries(Object.entries(contract.permissions || {}).map(([key, value]) => [key, normalizePermissionSet(value, contract.type)])),
    audit_log: (contract.audit_log || []).map(entry => ({ ...entry })).slice(0, 20),
  };
}

function getContractMember(contract, username) {
  const key = normalizeUsernameKey(username);
  return (contract.members || []).find(member => member.username_key === key) || null;
}

function assertActiveContractForActor(contract, actorUsername, actionLabel) {
  if (!contract) throw createError('同居契约不存在', 404);
  const member = getContractMember(contract, actorUsername);
  if (!member) throw createError('你不在这份契约中', 403);
  if (contract.status !== 'active') throw createError(`只有已生效契约可以${actionLabel}`, 409);
  if (member.status !== 'accepted') throw createError('只有已接受契约的成员可以操作共同庄园', 403);
  return member;
}

function canManageCohabitationPermissions(member = {}) {
  return member.status === 'accepted' && member.role === 'owner';
}

function canManageFamilyRoles(member = {}, contract = {}) {
  return isFamilyRoleContractType(contract.type)
    && member.status === 'accepted'
    && member.role === 'owner'
    && normalizeFamilyManorRole(member.manor_role, contract.type, member.role) === 'family_head';
}

function buildFamilyRoleOptions() {
  return Object.values(FAMILY_MANOR_ROLE_DEFS).map(def => ({
    id: def.id,
    label: def.label,
    description: def.description,
    management: def.management === true,
    permission_focus: [...def.permission_focus],
  }));
}

function buildFamilyRoleSnapshot(contract, actorUsername = '') {
  const actorMember = getContractMember(contract, actorUsername);
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    role_management_enabled: enabled,
    editable_by_actor: enabled && canManageFamilyRoles(actorMember, contract),
    idempotency_required: true,
    max_members: typeDef.max_members,
    member_count: (contract.members || []).length,
    role_options: enabled ? buildFamilyRoleOptions() : [],
    constraints: {
      romance_contracts_dual_only: true,
      family_manor_max_members: typeDef.max_members,
      family_head_locked_to_owner: true,
      high_risk_confirmations_locked: true,
      personal_money_merged: false,
    },
    members: (contract.members || []).map(member => {
      const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
      const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
      return {
        username: member.username,
        username_key: member.username_key,
        display_name: member.display_name,
        role: member.role,
        manor_role: manorRole,
        manor_role_label: roleDef?.label || '',
        status: member.status,
        can_manage_roles: enabled && canManageFamilyRoles(member, contract),
        permissions: enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type),
        permission_focus: roleDef ? [...roleDef.permission_focus] : [],
      };
    }),
    recent_role_audits: (contract.audit_log || [])
      .filter(entry => entry.action === 'family_role_updated')
      .slice(0, 10),
    deferred_operations: [
      'family_orders',
      'family_reputation',
      'family_buildings',
      'family_relation_graph',
      'family_festival_seats',
    ],
  };
}

function buildFamilyOrderMemberSnapshot(contract, member, enabled = isFamilyRoleContractType(contract.type)) {
  const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
  const permissions = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  const canPrepareMaterials = permissions.storage.deposit === true
    || permissions.farm.harvest === true
    || permissions.animal.collect_product === true;
  return {
    username: member.username,
    username_key: member.username_key,
    display_name: member.display_name,
    role: member.role,
    status: member.status,
    manor_role: manorRole,
    manor_role_label: roleDef?.label || '',
    permission_focus: roleDef ? [...roleDef.permission_focus] : [],
    order_permissions: {
      can_view_family_orders: enabled && member.status === 'accepted',
      can_accept_stage_preview: enabled && member.status === 'accepted',
      can_prepare_materials_preview: enabled && canPrepareMaterials,
      can_manage_order_rules_preview: enabled && manorRole === 'family_head',
      can_review_budget_preview: enabled && ['family_head', 'treasurer'].includes(manorRole),
      can_prepare_warehouse_reward_preview: enabled && ['family_head', 'storage_keeper'].includes(manorRole),
      create_family_order_enabled: false,
      settle_to_shared_fund_enabled: false,
      deposit_reward_to_shared_warehouse_enabled: false,
    },
  };
}

function buildSharedFundOrderIncomeCreditPlan(contract, receipt, member, options = {}) {
  const fund = normalizeSharedFund(contract.shared_fund);
  const balanceBefore = Math.max(0, Math.floor(Number(options.balance_before) || fund.balance));
  const amount = Math.max(0, Math.floor(Number(receipt.reward_value || receipt.amount) || 0));
  const manorRole = normalizeFamilyManorRole(member?.manor_role, contract.type, member?.role);
  const proposedIdempotencyKey = sanitizeText(
    options.idempotency_key || `fund-order-income:${contract.id}:${receipt.receipt_id}`,
    120
  );
  const targetRef = sanitizeText(receipt.target_ref, 120)
    || sanitizeText(`coop_order:${receipt.order_id}:receipt:${receipt.receipt_id}`, 120);
  const alreadyRecorded = options.already_recorded === true;
  const personalRewardAlreadyPaid = options.personal_reward_already_paid !== false;
  const canCredit = options.credit_enabled === true && !alreadyRecorded && !personalRewardAlreadyPaid;
  const blockedReason = alreadyRecorded
    ? '该公共订单收入已经存在共同基金 ledger 或目标引用，本次只返回幂等草案。'
    : personalRewardAlreadyPaid
      ? '该公共订单凭证已按现有规则写入接单人个人存档；真实入共同基金前需在确认交付时选择共同基金结算，或建立冲正 / 补偿流程，避免双发。'
      : '真实写入入口尚未开放；需要订单确认链路显式传入共同基金结算选择并持有交换锁。';
  return {
    helper_version: 1,
    mode: 'draft_only',
    can_credit: canCredit,
    write_enabled: false,
    blocked_reason: canCredit ? '' : blockedReason,
    source: {
      receipt_id: receipt.receipt_id,
      order_id: receipt.order_id,
      stage_id: receipt.stage_id,
      target_ref: targetRef,
      reward_route: 'shared_fund',
      personal_reward_already_paid: personalRewardAlreadyPaid,
      assignee_username: receipt.assignee_username,
      assignee_member_role: manorRole,
      assignee_member_role_label: getFamilyManorRoleDef(manorRole).label,
    },
    ledger_draft: {
      action: 'order_income',
      amount,
      purpose: 'family_order_income',
      target_ref: targetRef,
      source_owner_id: `coop_order:${receipt.order_id}`,
      source_owner_username: receipt.assignee_username,
      source_owner_display_name: receipt.assignee_display_name,
      source_owner_key: member?.username_key || normalizeUsernameKey(receipt.assignee_username),
      source_receipt_id: receipt.receipt_id,
      source_order_id: receipt.order_id,
      source_stage_id: receipt.stage_id,
      idempotency_key: proposedIdempotencyKey,
      balance_before: balanceBefore,
      balance_after: alreadyRecorded ? fund.balance : balanceBefore + amount,
      status: canCredit ? 'ready_for_locked_write' : 'draft_blocked',
      reversible: true,
      compensation_hint: '真实订单收入入共同基金后，若基金写入、订单确认或存档落账任一失败，必须按该 idempotency_key 重放或进入补偿队列。',
    },
    lock_requirements: {
      requires_exchange_lock: true,
      requires_contract_reload_before_commit: true,
      requires_receipt_status_confirmed: true,
      requires_order_reward_route_shared_fund: true,
      requires_personal_reward_not_paid: true,
      requires_duplicate_target_ref_check: true,
      requires_idempotency_key: true,
    },
    audit_draft: {
      action: 'fund_order_income_credited',
      actor_username: receipt.owner_username || '',
      amount,
      target_ref: targetRef,
      idempotency_key: proposedIdempotencyKey,
      contract_id: contract.id,
      receipt_id: receipt.receipt_id,
      order_id: receipt.order_id,
      stage_id: receipt.stage_id,
    },
    compensation_plan: {
      requires_replay_queue: true,
      rollback_supported_by_ledger: true,
      duplicate_personal_reward_guard: true,
      manual_review_required_if_personal_reward_paid: personalRewardAlreadyPaid,
    },
  };
}

async function creditCohabitationOrderIncome(contractId, receipt = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const receiptId = sanitizeText(receipt.receipt_id || receipt.id, 80);
  const orderId = sanitizeText(receipt.order_id, 80);
  const stageId = sanitizeText(receipt.stage_id, 80);
  const amount = Math.max(0, Math.floor(Number(receipt.reward_value || receipt.amount) || 0));
  if (!receiptId || !orderId) throw createError('公共订单收入缺少结算凭证');
  if ((receipt.reward_type || 'money') !== 'money') throw createError('只有铜钱公共订单收入可以写入共同基金', 400);
  if (amount <= 0) throw createError('公共订单收入金额必须大于 0');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '确认公共订单收入入共同基金');
  if (!isFamilyRoleContractType(contract.type)) throw createError('公共订单收入入共同基金第一版只开放给结拜 / 合伙庄园', 403);

  const assigneeMember = getContractMember(contract, receipt.assignee_username);
  if (!assigneeMember || assigneeMember.status !== 'accepted') {
    throw createError('公共订单接单人不是该家族庄园的已激活成员，不能写入共同基金', 403);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const stageSegment = stageId ? `:stage:${stageId}` : '';
  const targetRef = sanitizeText(
    receipt.target_ref || `coop_order:${orderId}${stageSegment}:receipt:${receiptId}`,
    120
  );
  const idempotencyKey = sanitizeText(`fund-order-income:${contract.id}:${receiptId}`, 120);
  const previousEntry = contract.shared_fund.ledger.find(entry =>
    (entry.idempotency_key && entry.idempotency_key === idempotencyKey)
    || (entry.action === 'order_income' && entry.target_ref === targetRef)
  );
  if (previousEntry) {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      fund_ledger_entry: previousEntry,
      idempotent: true,
      credit_plan: buildSharedFundOrderIncomeCreditPlan(contract, {
        ...receipt,
        receipt_id: receiptId,
        order_id: orderId,
        stage_id: stageId,
        target_ref: targetRef,
      }, assigneeMember, {
        idempotency_key: idempotencyKey,
        already_recorded: true,
        personal_reward_already_paid: false,
        credit_enabled: true,
      }),
    };
  }

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  const afterBalance = beforeBalance + amount;
  const operatedAt = nowSeconds();
  const creditPlan = buildSharedFundOrderIncomeCreditPlan(contract, {
    ...receipt,
    receipt_id: receiptId,
    order_id: orderId,
    stage_id: stageId,
    target_ref: targetRef,
  }, assigneeMember, {
    balance_before: beforeBalance,
    idempotency_key: idempotencyKey,
    already_recorded: false,
    personal_reward_already_paid: false,
    credit_enabled: true,
  });
  const fundLedgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'order_income',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount,
    at: operatedAt,
    memo: sanitizeText(receipt.result_note || receipt.reward_label || '公共订单收入', 160),
    purpose: 'family_order_income',
    source_owner_id: `coop_order:${orderId}`,
    source_owner_username: receipt.assignee_username,
    source_owner_display_name: receipt.assignee_display_name || receipt.assignee_username,
    source_owner_key: assigneeMember.username_key,
    target_ref: targetRef,
    spend_category: 'order_income',
    spend_purpose_label: '公共订单收入',
    balance_after: afterBalance,
    idempotency_key: idempotencyKey,
    reversible: true,
    compensation_hint: '公共订单收入已写入共同基金；若订单确认、基金写入或通知链路失败，应按该幂等键重放或进入补偿队列，避免个人奖励与共同基金双发。',
    status: 'committed',
  });

  contract.shared_fund.balance = afterBalance;
  contract.shared_fund.ledger = [fundLedgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  appendAudit(contract, 'fund_order_income_credited', actor, {
    ledger_id: fundLedgerEntry.id,
    amount,
    order_id: orderId,
    stage_id: stageId,
    receipt_id: receiptId,
    target_ref: targetRef,
    balance_before: beforeBalance,
    balance_after: afterBalance,
    assignee_username: assigneeMember.username,
    personal_reward_paid: false,
    duplicate_personal_reward_guard: true,
    reversible: true,
  }, idempotencyKey);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    fund_ledger_entry: fundLedgerEntry,
    idempotent: false,
    credit_plan: creditPlan,
    shared_fund: {
      balance_before: beforeBalance,
      balance_after: afterBalance,
      personal_money_merged: false,
    },
  };
}

function buildFamilyOrderIncomePreview(contract, enabled = isFamilyRoleContractType(contract.type)) {
  const acceptedMembers = (contract.members || []).filter(member => member.status === 'accepted');
  const fund = normalizeSharedFund(contract.shared_fund);
  if (!enabled) {
    return {
      enabled: false,
      readonly: true,
      income_credit_enabled: false,
      candidate_count: 0,
      open_candidate_count: 0,
      total_candidate_amount: 0,
      current_fund_balance: fund.balance,
      preview_balance_after_candidates: fund.balance,
      latest_receipt_at: 0,
      candidates: [],
      disabled_reason: '当前契约不是结拜庄园或合伙庄园，公共订单收入预览未启用。',
    };
  }
  const membersByKey = new Map(acceptedMembers.map(member => [member.username_key, member]));
  let receipts = [];
  let sourceError = '';
  try {
    receipts = taoyuanCoopOrderRuntime.listConfirmedMoneyReceiptsForUsers(
      acceptedMembers.map(member => member.username),
      12
    );
  } catch (error) {
    sourceError = sanitizeText(error?.message, 120);
  }
  const existingIdempotencyKeys = new Set(
    fund.ledger.map(entry => entry.idempotency_key).filter(Boolean)
  );
  const existingOrderTargets = new Set(
    fund.ledger
      .filter(entry => entry.action === 'order_income' && entry.target_ref)
      .map(entry => entry.target_ref)
  );
  let runningPreviewBalance = fund.balance;
  const candidates = receipts
    .map(receipt => {
      const member = membersByKey.get(normalizeUsernameKey(receipt.assignee_username));
      if (!member) return null;
      const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
      const proposedIdempotencyKey = sanitizeText(`fund-order-income:${contract.id}:${receipt.receipt_id}`, 120);
      const alreadyRecorded = existingIdempotencyKeys.has(proposedIdempotencyKey) || existingOrderTargets.has(receipt.target_ref);
      const personalRewardAlreadyPaid = receipt.reward_route !== 'shared_fund';
      const creditPlan = buildSharedFundOrderIncomeCreditPlan(contract, receipt, member, {
        balance_before: runningPreviewBalance,
        idempotency_key: proposedIdempotencyKey,
        already_recorded: alreadyRecorded,
        personal_reward_already_paid: personalRewardAlreadyPaid,
      });
      if (!alreadyRecorded) runningPreviewBalance = creditPlan.ledger_draft.balance_after;
      return {
        receipt_id: receipt.receipt_id,
        order_id: receipt.order_id,
        stage_id: receipt.stage_id,
        stage_title: receipt.stage_title,
        order_title: receipt.order_title,
        order_type: receipt.order_type,
        collaboration_mode: receipt.collaboration_mode,
        assignee_username: receipt.assignee_username,
        assignee_display_name: receipt.assignee_display_name,
        assignee_member_role: manorRole,
        assignee_member_role_label: getFamilyManorRoleDef(manorRole).label,
        owner_username: receipt.owner_username,
        owner_display_name: receipt.owner_display_name,
        amount: receipt.reward_value,
        reward_label: receipt.reward_label,
        reward_route: receipt.reward_route || 'personal',
        cohabitation_contract_id: receipt.cohabitation_contract_id || '',
        shared_fund_ledger_id: receipt.shared_fund_ledger_id || '',
        confirmed_at: receipt.confirmed_at,
        target_ref: receipt.target_ref,
        proposed_ledger_action: 'order_income',
        proposed_idempotency_key: proposedIdempotencyKey,
        proposed_balance_after: alreadyRecorded ? fund.balance : runningPreviewBalance,
        status: alreadyRecorded ? 'already_recorded_preview' : 'candidate',
        credit_enabled: false,
        personal_reward_already_paid: personalRewardAlreadyPaid,
        requires_reward_reroute_before_confirm: personalRewardAlreadyPaid,
        credit_plan: creditPlan,
        audit_required: true,
        compensation_required: true,
        rollback_required: true,
        write_blocked_reason: creditPlan.blocked_reason,
      };
    })
    .filter(Boolean);
  const openCandidates = candidates.filter(candidate => candidate.status === 'candidate');
  return {
    enabled: true,
    readonly: true,
    income_credit_enabled: false,
    source_available: !sourceError,
    source_error: sourceError,
    candidate_count: candidates.length,
    open_candidate_count: openCandidates.length,
    total_candidate_amount: openCandidates.reduce((sum, candidate) => sum + candidate.amount, 0),
    current_fund_balance: fund.balance,
    preview_balance_after_candidates: runningPreviewBalance,
    latest_receipt_at: candidates.reduce((max, candidate) => Math.max(max, candidate.confirmed_at || 0), 0),
    candidates,
    credit_helper: {
      version: 1,
      mode: 'draft_only',
      credit_enabled: false,
      writes_enabled: false,
      ledger_action: 'order_income',
      requires_exchange_lock: true,
      requires_order_confirmation_choice: true,
      requires_personal_reward_not_paid: true,
      requires_duplicate_target_ref_check: true,
      audit_action: 'fund_order_income_credited',
      compensation_replay_required: true,
    },
    policy: {
      personal_money_merged: false,
      current_orders_still_pay_personal_save: true,
      reward_to_shared_fund_enabled: false,
      requires_dedicated_credit_helper: true,
      requires_order_confirmation_choice: true,
      requires_idempotency: true,
      requires_audit: true,
      requires_compensation_replay: true,
    },
  };
}

function buildFamilyOrderSnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorMember = getContractMember(contract, actorUsername);
  const actorOrderMember = actorMember ? buildFamilyOrderMemberSnapshot(contract, actorMember, enabled) : null;
  const incomePreview = buildFamilyOrderIncomePreview(contract, enabled);
  const revision = Math.max(
    Number(contract.updated_at) || 0,
    Number(contract.activated_at) || 0,
    Number(contract.created_at) || 0,
    Number(incomePreview.latest_receipt_at) || 0
  );
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    settlement_enabled: false,
    family_orders_enabled: enabled,
    generated_at: nowSeconds(),
    revision,
    member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
    max_members: typeDef.max_members,
    summary: {
      preview_order_count: enabled ? 1 : 0,
      open_order_count: 0,
      pending_settlement_count: 0,
      personal_money_merged: false,
      personal_inventory_merged: false,
      shared_fund_spend_enabled: false,
      warehouse_withdraw_enabled: false,
      reward_to_shared_fund_enabled: false,
      reward_to_shared_warehouse_enabled: false,
      reward_to_shared_fund_candidate_count: incomePreview.candidate_count,
      reward_to_shared_fund_preview_amount: incomePreview.total_candidate_amount,
      disabled_reason: enabled ? '' : '家族订单第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorOrderMember,
    members: (contract.members || []).map(member => buildFamilyOrderMemberSnapshot(contract, member, enabled)),
    order_sources: [
      {
        id: 'coop_order_relay',
        label: '公共订单接力',
        available: enabled,
        binding_enabled: false,
        visual_board_type: 'async',
        description: '第一版只声明可复用公共订单接力的多阶段路线、交付凭证、补偿队列与声望读回，不把公共订单直接绑定到家族契约。',
      },
      {
        id: 'manual_family_order',
        label: '家族订单',
        available: false,
        binding_enabled: false,
        deferred_operation: 'create_family_order',
        description: '真实家族订单创建、接单、交付、确认和撤回需要独立幂等键、审计日志和资产补偿流程后再开放。',
      },
    ],
    candidate_order_types: enabled ? FAMILY_ORDER_STAGE_DEFS.map(stage => ({ ...stage })) : [],
    visual_state_preview: {
      board_type: 'async',
      board_id: `family_orders:${contract.id}`,
      revision,
      selected_visual_id: 'family_order_prepare',
      recent_feedback: enabled
        ? '家族订单第一版为只读预备面板，真实接单、共同基金入账和共同仓库入仓暂缓。'
        : '当前契约不是结拜庄园或合伙庄园，家族订单未启用。',
      async_projects: enabled ? [
        {
          id: 'family_order_prepare',
          title: '家族订单预备路线',
          status: 'planning',
          progress_value: 0,
          progress_target: FAMILY_ORDER_STAGE_DEFS.length,
          stages: FAMILY_ORDER_STAGE_DEFS.map((stage, index) => ({
            id: stage.id,
            sequence: index + 1,
            title: stage.label,
            description: stage.description,
            state: index === 0 ? 'available' : 'locked',
            progress_value: 0,
            progress_target: 1,
            preferred_roles: [...stage.preferred_roles],
            compatible_order_types: [...stage.compatible_order_types],
          })),
          milestones: [
            {
              id: 'receipt_required',
              label: '服务端凭证',
              reached: false,
              description: '家族订单结算必须先生成可重放凭证，防止重复发奖。',
            },
            {
              id: 'asset_compensation_required',
              label: '资产补偿',
              reached: false,
              description: '共同基金或仓库写入失败时必须进入补偿队列或冻结回滚。',
            },
            {
              id: 'shared_fund_income_preview',
              label: '共同基金入账预览',
              reached: incomePreview.open_candidate_count > 0,
              description: incomePreview.open_candidate_count > 0
                ? `已发现 ${incomePreview.open_candidate_count} 条公共订单铜钱凭证可用于未来共同基金结算设计。`
                : '暂未发现可预览的公共订单铜钱凭证。',
            },
          ],
          history: [],
        },
      ] : [],
    },
    income_preview: incomePreview,
    settlement: {
      reward_to_shared_fund_enabled: false,
      reward_to_shared_warehouse_enabled: false,
      reward_to_shared_fund_candidate_count: incomePreview.candidate_count,
      reward_to_shared_fund_preview_amount: incomePreview.total_candidate_amount,
      personal_money_merged: false,
      personal_inventory_merged: false,
      requires_server_receipt: true,
      idempotency_required: true,
      audit_required: true,
      compensation_required: true,
      rollback_required: true,
      disconnect_recovery_required: true,
      current_policy: '第一版仅开放家族订单预备面板；奖励仍不得直接写入共同基金或共同仓库。',
    },
    governance: {
      permission_boundary: '职位只提供订单阶段预览能力，不授予真实共同资产结算权限。',
      audit_log_source: '后续真实家族订单需写入 contract.audit_log 与订单自身 ledger。',
      compensation_policy: '订单阶段、共同基金、共同仓库任一写入失败都必须可按凭证重放或人工补偿。',
      reuse_public_order_relay: true,
      public_order_scope_unchanged: true,
    },
    recommended_flow: [
      '用公共订单接力 visual_state 先展示采集、加工、派送、交付路线。',
      '家族成员按职位领取阶段，但领取和交付必须带幂等键。',
      '发布人确认后先生成服务端结算凭证，再决定是否进入共同基金或共同仓库。',
      '共同资产写入失败时进入补偿队列，禁止静默吞奖励或重复发放。',
    ],
    deferred_operations: [
      'create_family_order',
      'accept_family_order_stage',
      'submit_family_order_delivery',
      'confirm_family_order_delivery',
      'settle_to_shared_fund',
      'deposit_reward_to_shared_warehouse',
      'family_reputation',
      'family_order_rollback',
      'family_order_compensation_replay',
    ],
  };
}

function clampReputationPoints(value, maxValue) {
  return Math.min(maxValue, Math.max(0, Math.floor(Number(value) || 0)));
}

function resolveFamilyReputationLevel(points) {
  const score = Math.max(0, Math.floor(Number(points) || 0));
  let current = FAMILY_REPUTATION_LEVELS[0];
  for (const level of FAMILY_REPUTATION_LEVELS) {
    if (score >= level.min_points) current = level;
  }
  return {
    id: current.id,
    label: current.label,
    min_points: current.min_points,
    next_points: current.next_points,
    progress_to_next: current.next_points === null
      ? 1
      : Math.max(0, Math.min(1, (score - current.min_points) / Math.max(1, current.next_points - current.min_points))),
  };
}

function buildFamilyReputationMemberStats(contract = {}) {
  const stats = new Map();
  const ensureMember = member => {
    const key = member.username_key || normalizeUsernameKey(member.username);
    if (!stats.has(key)) {
      const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
      const roleDef = getFamilyManorRoleDef(manorRole);
      stats.set(key, {
        username: member.username,
        username_key: key,
        display_name: member.display_name,
        role: member.role,
        status: member.status,
        manor_role: manorRole,
        manor_role_label: roleDef.label,
        warehouse_deposit_count: 0,
        warehouse_deposit_quantity: 0,
        fund_contribution_count: 0,
        fund_contribution_amount: 0,
        governance_action_count: 0,
        preview_points: 0,
      });
    }
    return stats.get(key);
  };

  for (const member of contract.members || []) ensureMember(member);
  for (const entry of normalizeSharedWarehouse(contract.shared_warehouse).ledger) {
    if (entry.action !== 'deposit' || entry.status !== 'committed') continue;
    const key = normalizeUsernameKey(entry.actor_username || entry.source_owner_username);
    const memberStat = stats.get(key);
    if (!memberStat) continue;
    memberStat.warehouse_deposit_count += 1;
    memberStat.warehouse_deposit_quantity += Math.max(0, Math.floor(Number(entry.quantity) || 0));
    memberStat.preview_points += clampReputationPoints(3 + Math.floor((Number(entry.quantity) || 0) / 2), 8);
  }
  for (const entry of normalizeSharedFund(contract.shared_fund).ledger) {
    if (entry.action !== 'contribution' || entry.status !== 'committed') continue;
    const key = normalizeUsernameKey(entry.actor_username || entry.source_owner_username);
    const memberStat = stats.get(key);
    if (!memberStat) continue;
    memberStat.fund_contribution_count += 1;
    memberStat.fund_contribution_amount += Math.max(0, Math.floor(Number(entry.amount) || 0));
    memberStat.preview_points += clampReputationPoints(2 + Math.floor((Number(entry.amount) || 0) / 100), 8);
  }
  for (const entry of contract.audit_log || []) {
    if (!['family_role_updated', 'permissions_updated'].includes(entry.action)) continue;
    const key = normalizeUsernameKey(entry.actor_username);
    const memberStat = stats.get(key);
    if (!memberStat) continue;
    memberStat.governance_action_count += 1;
    memberStat.preview_points += 2;
  }
  return [...stats.values()];
}

function buildFamilyReputationSourceBreakdown(contract = {}, enabled = isFamilyRoleContractType(contract.type)) {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const fund = normalizeSharedFund(contract.shared_fund);
  const warehouseDeposits = warehouse.ledger.filter(entry => entry.action === 'deposit' && entry.status === 'committed');
  const warehouseQuantity = warehouseDeposits.reduce((sum, entry) => sum + Math.max(0, Math.floor(Number(entry.quantity) || 0)), 0);
  const fundContributions = fund.ledger.filter(entry => entry.action === 'contribution' && entry.status === 'committed');
  const fundAmount = fundContributions.reduce((sum, entry) => sum + Math.max(0, Math.floor(Number(entry.amount) || 0)), 0);
  const roleAudits = (contract.audit_log || []).filter(entry => entry.action === 'family_role_updated');
  const permissionAudits = (contract.audit_log || []).filter(entry => entry.action === 'permissions_updated');
  return [
    {
      id: 'family_governance',
      label: '家族治理',
      enabled,
      preview_points: enabled ? clampReputationPoints(roleAudits.length * 4 + permissionAudits.length * 2, 16) : 0,
      evidence_count: roleAudits.length + permissionAudits.length,
      audit_required: true,
      write_enabled: false,
      evidence: {
        role_update_count: roleAudits.length,
        permission_update_count: permissionAudits.length,
      },
    },
    {
      id: 'shared_warehouse_stewardship',
      label: '共同仓库照管',
      enabled,
      preview_points: enabled ? clampReputationPoints(warehouseDeposits.length * 4 + Math.floor(warehouseQuantity / 2), 24) : 0,
      evidence_count: warehouseDeposits.length,
      audit_required: true,
      write_enabled: false,
      evidence: {
        deposit_count: warehouseDeposits.length,
        total_quantity: warehouseQuantity,
        withdraw_enabled: false,
        sell_enabled: false,
      },
    },
    {
      id: 'shared_fund_support',
      label: '共同基金支持',
      enabled,
      preview_points: enabled ? clampReputationPoints(fundContributions.length * 3 + Math.floor(fundAmount / 100), 20) : 0,
      evidence_count: fundContributions.length,
      audit_required: true,
      write_enabled: false,
      evidence: {
        contribution_count: fundContributions.length,
        total_amount: fundAmount,
        spend_enabled: false,
      },
    },
    {
      id: 'family_orders',
      label: '家族订单',
      enabled: false,
      preview_points: 0,
      evidence_count: 0,
      audit_required: true,
      write_enabled: false,
      deferred_operation: 'family_order_reputation',
      evidence: {
        reason: '真实家族订单发布、交付和结算尚未开放，不能产生声望。',
      },
    },
    {
      id: 'family_buildings',
      label: '家族建筑',
      enabled: false,
      preview_points: 0,
      evidence_count: 0,
      audit_required: true,
      write_enabled: false,
      deferred_operation: 'family_building_reputation',
      evidence: {
        reason: '家族建筑尚未接入真实建造与审计，不能产生声望。',
      },
    },
    {
      id: 'family_festival_seats',
      label: '家族节会席位',
      enabled: false,
      preview_points: 0,
      evidence_count: 0,
      audit_required: true,
      write_enabled: false,
      deferred_operation: 'family_festival_seat_reputation',
      evidence: {
        reason: '家族节会席位尚未接入，不能产生声望。',
      },
    },
  ];
}

function buildFamilyReputationSnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const actorMember = getContractMember(contract, actorUsername);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const sourceBreakdown = buildFamilyReputationSourceBreakdown(contract, enabled);
  const currentPoints = enabled
    ? sourceBreakdown.reduce((sum, source) => sum + Math.max(0, Math.floor(Number(source.preview_points) || 0)), 0)
    : 0;
  const level = resolveFamilyReputationLevel(currentPoints);
  const actorRole = normalizeFamilyManorRole(actorMember?.manor_role, contract.type, actorMember?.role);
  const actorRoleDef = enabled ? getFamilyManorRoleDef(actorRole) : null;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    reputation_enabled: enabled,
    generated_at: nowSeconds(),
    revision: Math.max(Number(contract.updated_at) || 0, Number(contract.activated_at) || 0, Number(contract.created_at) || 0),
    summary: {
      current_points: currentPoints,
      level,
      source_count: sourceBreakdown.filter(source => source.preview_points > 0).length,
      member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
      max_members: typeDef.max_members,
      reputation_award_enabled: false,
      leaderboard_enabled: false,
      personal_reward_enabled: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      disabled_reason: enabled ? '' : '家族声望第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorMember ? {
      username: actorMember.username,
      username_key: actorMember.username_key,
      display_name: actorMember.display_name,
      role: actorMember.role,
      manor_role: actorRole,
      manor_role_label: actorRoleDef?.label || '',
      can_view_reputation: enabled && actorMember.status === 'accepted',
      can_manage_reputation_rules_preview: enabled && actorRole === 'family_head',
      can_claim_reputation_reward: false,
    } : null,
    members: enabled ? buildFamilyReputationMemberStats(contract) : [],
    source_breakdown: sourceBreakdown,
    governance: {
      server_authoritative: true,
      idempotency_required_for_future_writes: true,
      audit_required_for_future_writes: true,
      compensation_required_for_future_rewards: true,
      weekly_cap_required: true,
      anti_farm_policy: '声望写入开放前必须按契约、成员、来源类型和周周期做封顶，防止仓库 / 基金小额互刷。',
      public_leaderboard_enabled: false,
      reputation_decay_enabled: false,
      current_policy: '第一版只根据已存在审计与流水生成预览分，不持久化声望，也不发放称号、建筑或奖励。',
    },
    deferred_operations: [
      'award_family_reputation',
      'family_reputation_ledger',
      'family_order_reputation',
      'family_building_reputation',
      'family_festival_seat_reputation',
      'family_reputation_weekly_cap',
      'family_reputation_compensation_replay',
      'family_reputation_leaderboard',
      'family_reputation_rewards',
    ],
  };
}

function getWarehousePreviewQuantity(warehouse = {}, itemId = '') {
  const normalizedItemId = normalizeWarehouseItemId(itemId);
  if (!normalizedItemId) return 0;
  return (warehouse.items || [])
    .filter(item => item.item_id === normalizedItemId)
    .reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.quantity) || 0)), 0);
}

function buildFamilyBuildingMemberSnapshot(contract, member, enabled = isFamilyRoleContractType(contract.type)) {
  const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
  const permissions = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  const canPlanConstruction = ['family_head', 'workshop_keeper'].includes(manorRole)
    || permissions.construction.move_common_furniture === true
    || permissions.construction.buy_furniture === true;
  const canPrepareMaterials = permissions.storage.deposit === true
    || permissions.storage.withdraw_common === true
    || permissions.farm.harvest === true
    || permissions.animal.collect_product === true;
  return {
    username: member.username,
    username_key: member.username_key,
    display_name: member.display_name,
    role: member.role,
    status: member.status,
    manor_role: manorRole,
    manor_role_label: roleDef?.label || '',
    permission_focus: roleDef ? [...roleDef.permission_focus] : [],
    building_permissions: {
      can_view_family_buildings: enabled && member.status === 'accepted',
      can_plan_building_preview: enabled && member.status === 'accepted' && canPlanConstruction,
      can_prepare_materials_preview: enabled && canPrepareMaterials,
      can_review_budget_preview: enabled && ['family_head', 'treasurer'].includes(manorRole),
      can_manage_building_rules_preview: enabled && manorRole === 'family_head',
      build_enabled: false,
      demolish_enabled: false,
      shared_fund_spend_enabled: false,
      warehouse_material_consume_enabled: false,
    },
  };
}

function buildFamilyBuildingCandidates(contract, enabled, appliedBuildingIds = new Set(), materialConsumedBuildingIds = new Set()) {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const fund = normalizeSharedFund(contract.shared_fund);
  const acceptedRoles = new Set((contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => normalizeFamilyManorRole(member.manor_role, contract.type, member.role))
    .filter(Boolean));
  return FAMILY_BUILDING_PROJECT_DEFS.map(definition => {
    const missingRoles = definition.required_roles.filter(role => !acceptedRoles.has(role));
    const materialPlan = definition.material_plan.map(item => {
      const availableQuantity = getWarehousePreviewQuantity(warehouse, item.item_id);
      return {
        item_id: item.item_id,
        label: item.label,
        required_quantity: item.quantity,
        available_quantity: availableQuantity,
        enough: availableQuantity >= item.quantity,
        consume_enabled: false,
      };
    });
    const applied = appliedBuildingIds.has(definition.id);
    const materialsConsumed = materialConsumedBuildingIds.has(definition.id);
    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      visual_kind: definition.visual_kind,
      summary: definition.summary,
      available: enabled,
      role_ready: enabled && missingRoles.length === 0,
      missing_roles: missingRoles,
      required_roles: [...definition.required_roles],
      material_plan: materialPlan.map(item => ({
        ...item,
        consume_enabled: enabled && applied && !materialsConsumed && item.enough,
      })),
      shared_fund_cost: definition.shared_fund_cost,
      shared_fund_balance_preview: fund.balance,
      fund_ready_preview: fund.balance >= definition.shared_fund_cost,
      stage_count: definition.stage_count,
      planning_state: enabled
        ? (materialsConsumed ? 'materials_consumed' : (applied ? 'build_applied' : (missingRoles.length > 0 ? 'needs_role' : 'ready_for_blueprint')))
        : 'disabled',
      build_enabled: false,
      demolish_enabled: false,
      material_consume_enabled: enabled && applied && !materialsConsumed && materialPlan.every(item => item.enough),
      shared_fund_spend_enabled: false,
      real_build_applied: applied,
      shared_warehouse_materials_consumed: materialsConsumed,
      disabled_reason: enabled
        ? (materialsConsumed
            ? '已从共同仓库扣减建材并写入建筑流水，后续扩建 / 拆除仍需专用流程。'
            : (applied ? '已通过共同基金大额确认落账，可由有权限成员扣减共同仓库建材。' : ''))
        : '当前契约不是结拜庄园或合伙庄园。',
    };
  });
}

function buildFamilyBuildingScenePreview(contract, buildings, members, enabled, revision) {
  const acceptedMembers = members.filter(member => member.status === 'accepted');
  const granary = buildings.find(building => building.id === 'shared_granary');
  const workshop = buildings.find(building => building.id === 'workshop_yard');
  return {
    board_type: 'scene',
    board_id: `family_buildings:${contract.id}`,
    revision,
    selected_visual_id: 'family_building_blueprint_table',
    recent_feedback: enabled
      ? '家族建筑第一版已支持建筑流水、真实落账标记和共同仓库建材消耗落账；拆除与扩建仍暂缓。'
      : '当前契约不是结拜庄园或合伙庄园，家族建筑未启用。',
    scene: enabled ? {
      id: 'family_building_yard',
      label: '家族庄园建筑规划',
      kind: 'building_planning',
      member_capacity: Math.max(4, acceptedMembers.length),
      object_count: 5,
    } : null,
    scene_objects: enabled ? [
      {
        id: 'family_building_gate',
        label: '庄园门牌',
        kind: 'gate',
        state: acceptedMembers.length >= 2 ? 'preview_ready' : 'locked',
        x: 50,
        y: 14,
        linked_building_ids: ['family_hall'],
        available_action_ids: [],
      },
      {
        id: 'family_building_blueprint_table',
        label: '建筑蓝图桌',
        kind: 'blueprint',
        state: members.some(member => member.manor_role === 'family_head' || member.manor_role === 'workshop_keeper') ? 'staffed' : 'needs_role',
        x: 34,
        y: 42,
        linked_role_ids: ['family_head', 'workshop_keeper'],
        available_action_ids: [],
      },
      {
        id: 'family_building_granary_ghost',
        label: '粮廪预留地',
        kind: 'granary',
        state: granary?.role_ready ? 'ready_for_blueprint' : 'needs_role',
        x: 24,
        y: 72,
        linked_building_ids: ['shared_granary'],
        available_action_ids: [],
      },
      {
        id: 'family_building_workshop_ghost',
        label: '工坊预留地',
        kind: 'workshop',
        state: workshop?.role_ready ? 'ready_for_blueprint' : 'needs_role',
        x: 70,
        y: 66,
        linked_building_ids: ['workshop_yard'],
        available_action_ids: [],
      },
      {
        id: 'family_building_demolition_notice',
        label: '拆除确认牌',
        kind: 'safety_notice',
        state: 'locked',
        x: 76,
        y: 28,
        required_confirmations: ['demolish_requires_both', 'origin_asset_return_preview'],
        available_action_ids: [],
      },
    ] : [],
  };
}

function buildFamilyBuildingSnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorMember = getContractMember(contract, actorUsername);
  const revision = Math.max(Number(contract.updated_at) || 0, Number(contract.activated_at) || 0, Number(contract.created_at) || 0);
  const members = enabled
    ? (contract.members || []).map(member => buildFamilyBuildingMemberSnapshot(contract, member, enabled))
    : [];
  const constructionLedger = enabled && Array.isArray(contract.family_building_ledger)
    ? contract.family_building_ledger.map(normalizeFamilyBuildingLedgerEntry).slice(0, FAMILY_BUILDING_LEDGER_LIMIT)
    : [];
  const appliedBuildingIds = new Set(constructionLedger
    .filter(entry => entry.real_build_applied === true || entry.status === 'build_applied')
    .map(entry => entry.building_id || entry.project_id)
    .filter(Boolean));
  const materialConsumedBuildingIds = new Set(constructionLedger
    .filter(entry => entry.shared_warehouse_materials_consumed === true)
    .map(entry => entry.building_id || entry.project_id)
    .filter(Boolean));
  const buildings = buildFamilyBuildingCandidates(contract, enabled, appliedBuildingIds, materialConsumedBuildingIds);
  const actorBuildingMember = actorMember ? buildFamilyBuildingMemberSnapshot(contract, actorMember, enabled) : null;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    family_buildings_enabled: enabled,
    build_enabled: false,
    demolish_enabled: false,
    generated_at: nowSeconds(),
    revision,
    summary: {
      member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
      max_members: typeDef.max_members,
      preview_building_count: enabled ? buildings.length : 0,
      role_ready_building_count: enabled ? buildings.filter(building => building.role_ready).length : 0,
      material_consume_enabled: enabled && buildings.some(building => building.material_consume_enabled),
      shared_fund_spend_enabled: false,
      warehouse_withdraw_enabled: false,
      demolition_enabled: false,
      construction_ledger_enabled: enabled,
      construction_ledger_count: constructionLedger.length,
      latest_construction_ledger_id: constructionLedger[0]?.id || '',
      real_build_applied_count: appliedBuildingIds.size,
      warehouse_material_consumed_count: materialConsumedBuildingIds.size,
      reputation_award_enabled: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      disabled_reason: enabled ? '' : '家族建筑第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorBuildingMember,
    members,
    candidate_buildings: buildings,
    construction_ledger: constructionLedger.slice(0, 20),
    visual_state_preview: buildFamilyBuildingScenePreview(contract, buildings, members, enabled, revision),
    governance: {
      server_authoritative: true,
      building_write_requires_idempotency: true,
      building_write_requires_audit: true,
      shared_fund_spend_requires_permission: true,
      shared_fund_spend_requires_confirmation: true,
      warehouse_material_consume_requires_origin_trace: true,
      demolition_requires_preview: true,
      demolition_requires_both_confirmation: true,
      compensation_required_for_asset_writes: true,
      rollback_required_for_building_writes: true,
      current_policy: '第一版支持共同基金大额执行后的建筑流水真实落账标记与共同仓库建材消耗落账；仍不拆除、不扩建。',
    },
    asset_boundaries: {
      personal_money_merged: false,
      personal_inventory_merged: false,
      shared_fund_consume_enabled: false,
      shared_warehouse_consume_enabled: false,
      origin_assets_required_for_return: true,
      separation_preview_must_include_buildings: true,
    },
    recommended_flow: [
      '先由家主读取建筑预览，确认议事厅、粮廪、工坊和节会前庭的职位缺口。',
      '真实建造落账只允许引用已扣款建筑流水，并在同一条建筑流水上保留幂等、审计和补偿线索。',
      '共同仓库材料消耗必须引用同一条建筑流水，按来源仓库 ledger 扣减并写回材料 ledger ids。',
      '拆除或迁移建筑必须先生成分居 / 返还预览，并要求双方或家族规则确认。',
      '任一建造、拆除或材料扣减失败时，必须能按建筑 ledger 回滚或进入补偿重放。',
    ],
    deferred_operations: [
      'plan_family_building',
      'reserve_family_building_site',
      'consume_shared_building_materials',
      'spend_shared_fund_for_building',
      'real_build_apply',
      'demolish_family_building',
      'family_building_reputation',
      'family_building_compensation_replay',
      'family_building_rollback',
    ],
  };
}

function resolveFamilyRelationLabel(contractType) {
  const normalizedType = normalizeRelationType(contractType);
  if (normalizedType === 'oath_manor') return '结拜成员';
  if (normalizedType === 'business_partner') return '合伙成员';
  return '共同成员';
}

function buildFamilyRelationMemberSnapshot(contract, member, enabled = isFamilyRoleContractType(contract.type), index = 0, total = 1) {
  const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
  const permissions = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  const angle = ((-90 + (360 / Math.max(1, total)) * index) * Math.PI) / 180;
  return {
    id: `member:${member.username_key}`,
    username: member.username,
    username_key: member.username_key,
    display_name: member.display_name,
    role: member.role,
    status: member.status,
    manor_role: manorRole,
    manor_role_label: roleDef?.label || '',
    relation_label: member.role === 'owner' ? '契约发起者' : resolveFamilyRelationLabel(contract.type),
    node_group: 'member',
    x: Math.round((50 + Math.cos(angle) * 26) * 10) / 10,
    y: Math.round((38 + Math.sin(angle) * 18) * 10) / 10,
    permissions_summary: {
      can_manage_roles_preview: enabled && canManageFamilyRoles(member, contract),
      can_deposit_warehouse_preview: enabled && permissions.storage.deposit === true,
      can_prepare_materials_preview: enabled && (
        permissions.storage.deposit === true
        || permissions.farm.harvest === true
        || permissions.animal.collect_product === true
      ),
      can_review_budget_preview: enabled && ['family_head', 'treasurer'].includes(manorRole),
      relationship_write_enabled: false,
      publish_personal_graph_enabled: false,
    },
    privacy: {
      exposes_personal_npc_graph: false,
      exposes_children: false,
      exposes_pets: false,
      exposes_random_npcs: false,
      display_name_only: true,
    },
  };
}

function buildFamilyRelationRoleNodes(enabled) {
  const coordinates = {
    family_head: [50, 11],
    storage_keeper: [73, 25],
    farm_steward: [72, 53],
    animal_keeper: [50, 66],
    workshop_keeper: [28, 53],
    treasurer: [27, 25],
  };
  return Object.values(FAMILY_MANOR_ROLE_DEFS).map(def => {
    const [x, y] = coordinates[def.id] || [50, 38];
    return {
      id: `role:${def.id}`,
      node_type: 'role',
      label: def.label,
      role_id: def.id,
      state: enabled ? 'available' : 'disabled',
      kind: 'family_role',
      x,
      y,
      description: def.description,
      permission_focus: [...def.permission_focus],
      write_enabled: false,
    };
  });
}

function buildFamilyRelationCapabilityNodes(enabled) {
  return FAMILY_RELATION_CAPABILITY_DEFS.map((definition, index) => ({
    id: `capability:${definition.id}`,
    node_type: 'capability',
    label: definition.label,
    capability_id: definition.id,
    state: enabled ? definition.state : 'disabled',
    kind: definition.kind,
    x: 12 + (index % 4) * 25,
    y: index < 4 ? 72 : 4,
    summary: definition.summary,
    write_enabled: false,
  }));
}

function buildFamilyRelationGraphPreview(contract, members, enabled, revision) {
  if (!enabled) {
    return {
      root_node_id: 'family_relation_root',
      layout: 'radial_contract_graph',
      nodes: [],
      links: [],
    };
  }
  const relationLabel = resolveFamilyRelationLabel(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const memberNodes = members.map((member, index) => ({
    id: member.id,
    node_type: 'member',
    label: member.display_name || member.username,
    username: member.username,
    username_key: member.username_key,
    relation_label: member.relation_label,
    manor_role: member.manor_role,
    manor_role_label: member.manor_role_label,
    state: member.status === 'accepted' ? 'active' : 'pending',
    kind: 'contract_member',
    x: member.x,
    y: member.y,
    write_enabled: false,
    privacy: member.privacy,
  }));
  const roleNodes = buildFamilyRelationRoleNodes(enabled);
  const capabilityNodes = buildFamilyRelationCapabilityNodes(enabled);
  const rootNode = {
    id: 'family_relation_root',
    node_type: 'root',
    label: `${typeDef.label}关系网`,
    state: 'active',
    kind: 'family_manor_contract',
    x: 50,
    y: 38,
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    write_enabled: false,
  };
  const links = [
    ...memberNodes.map(node => ({
      id: `link:root:${node.id}`,
      from: 'family_relation_root',
      to: node.id,
      label: node.relation_label || relationLabel,
      kind: 'membership',
      state: 'active',
      write_enabled: false,
    })),
    ...memberNodes
      .filter(node => node.manor_role)
      .map(node => ({
        id: `link:${node.id}:role:${node.manor_role}`,
        from: node.id,
        to: `role:${node.manor_role}`,
        label: node.manor_role_label,
        kind: 'role_assignment',
        state: 'active',
        write_enabled: false,
      })),
    ...capabilityNodes.map(node => ({
      id: `link:root:${node.id}`,
      from: 'family_relation_root',
      to: node.id,
      label: '共同能力',
      kind: 'family_capability',
      state: node.state,
      write_enabled: false,
    })),
  ];
  return {
    root_node_id: 'family_relation_root',
    layout: 'radial_contract_graph',
    revision,
    nodes: [rootNode, ...memberNodes, ...roleNodes, ...capabilityNodes],
    links,
  };
}

function buildFamilyRelationVisualStatePreview(contract, graph, enabled, revision) {
  return {
    board_type: 'map',
    board_id: `family_relations:${contract.id}`,
    revision,
    selected_visual_id: 'family_relation_root',
    recent_feedback: enabled
      ? '家族关系图第一版只展示契约成员、家族职位和共同经营能力节点；单机 NPC、孩子、宠物和随机 NPC 关系不公开。'
      : '当前契约不是结拜庄园或合伙庄园，家族关系图未启用。',
    nodes: enabled ? graph.nodes.map(node => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      x: node.x,
      y: node.y,
      state: node.state === 'disabled' ? 'locked' : (node.state === 'active' ? 'active' : 'available'),
      connected_node_ids: graph.links
        .filter(link => link.from === node.id)
        .map(link => link.to),
      available_action_ids: [],
    })) : [],
    highlights: [],
  };
}

function buildFamilyRelationSnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorMember = getContractMember(contract, actorUsername);
  const revision = Math.max(Number(contract.updated_at) || 0, Number(contract.activated_at) || 0, Number(contract.created_at) || 0);
  const acceptedMembers = (contract.members || []).filter(member => member.status === 'accepted');
  const pendingMembers = (contract.members || []).filter(member => member.status !== 'accepted');
  const memberCount = (contract.members || []).length;
  const members = enabled
    ? (contract.members || []).map((member, index) => buildFamilyRelationMemberSnapshot(contract, member, enabled, index, memberCount || 1))
    : [];
  const graph = buildFamilyRelationGraphPreview(contract, members, enabled, revision);
  const actorRelationMember = actorMember
    ? buildFamilyRelationMemberSnapshot(contract, actorMember, enabled, Math.max(0, (contract.members || []).findIndex(member => member.username_key === actorMember.username_key)), memberCount || 1)
    : null;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    family_relations_enabled: enabled,
    generated_at: nowSeconds(),
    revision,
    summary: {
      member_count: memberCount,
      accepted_member_count: acceptedMembers.length,
      pending_member_count: pendingMembers.length,
      max_members: typeDef.max_members,
      role_management_enabled: enabled,
      local_save_family_graph_included: false,
      graph_node_count: enabled ? graph.nodes.length : 0,
      graph_link_count: enabled ? graph.links.length : 0,
      private_single_player_graph_exposed: false,
      local_npc_nodes_exposed: false,
      random_npc_nodes_exposed: false,
      children_nodes_exposed: false,
      pets_exposed: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      relationship_write_enabled: false,
      disabled_reason: enabled ? '' : '家族关系图第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorRelationMember,
    members,
    graph,
    visual_state_preview: buildFamilyRelationVisualStatePreview(contract, graph, enabled, revision),
    constraints: {
      romance_contracts_dual_only: true,
      family_manor_max_members: typeDef.max_members,
      family_head_locked_to_owner: true,
      high_risk_confirmations_locked: true,
      personal_money_merged: false,
      personal_relationships_private: true,
      relationship_publication_requires_member_consent: true,
    },
    recent_role_audits: (contract.audit_log || [])
      .filter(entry => entry.action === 'family_role_updated')
      .slice(0, 10),
    privacy: {
      local_single_player_graph_scope: 'single_player_save_only',
      online_contract_graph_scope: 'contract_members_and_shared_manor_only',
      local_npc_nodes_exposed: false,
      random_npc_nodes_exposed: false,
      children_nodes_exposed: false,
      pets_exposed: false,
      spouse_or_romance_nodes_exposed: false,
      hidden_npc_nodes_exposed: false,
      personal_save_read_enabled: false,
      publication_requires_member_consent: true,
    },
    governance: {
      server_authoritative: true,
      readonly_first_pass: true,
      idempotency_required_for_future_writes: true,
      audit_required_for_future_writes: true,
      member_visibility_requires_contract_membership: true,
      future_publication_requires_consent: true,
      role_change_must_use_family_roles_endpoint: true,
      relationship_story_write_enabled: false,
      compensation_required_for_publication_errors: true,
      rollback_required_for_visibility_changes: true,
      current_policy: '第一版只读展示家族契约成员、职位和共同经营能力节点，不公开玩家本地 NPC / 家庭 / 宠物 / 随机 NPC 关系，不写审计，不改个人存档。',
    },
    asset_boundaries: {
      personal_money_merged: false,
      personal_inventory_merged: false,
      personal_relationships_private: true,
      contract_membership_is_not_family_story_state: true,
      separation_preview_must_include_relationship_visibility: true,
    },
    local_graph_compatibility: {
      local_component_name: 'FamilyRelationGraph',
      local_component_scope: 'single_player_npc_family_pet_graph',
      server_panel_scope: 'online_family_manor_contract_graph',
      reusable_ui_concept: true,
      direct_local_state_reuse_enabled: false,
    },
    deferred_operations: [
      'publish_family_relation_graph_to_profile',
      'member_visibility_settings',
      'family_relation_story_events',
      'invite_random_npc_family_public_node',
      'family_relation_graph_frontend_panel',
      'relationship_visibility_audit',
      'family_relation_graph_compensation_replay',
      'family_relation_graph_rollback',
    ],
  };
}

function buildFamilyVisibilityMemberSnapshot(contract, member, enabled = isFamilyRoleContractType(contract.type)) {
  const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
  return {
    username: member.username,
    username_key: member.username_key,
    display_name: member.display_name,
    role: member.role,
    status: member.status,
    manor_role: manorRole,
    manor_role_label: roleDef?.label || '',
    visibility_permissions: {
      can_view_contract_graph: enabled && member.status === 'accepted',
      can_publish_contract_graph_preview: false,
      can_publish_personal_graph_preview: false,
      can_manage_visibility_preview: enabled && canManageFamilyRoles(member, contract),
      consent_required_for_publication: true,
      consent_status: 'not_requested',
      write_enabled: false,
    },
  };
}

function buildFamilyVisibilitySnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorMember = getContractMember(contract, actorUsername);
  const revision = Math.max(Number(contract.updated_at) || 0, Number(contract.activated_at) || 0, Number(contract.created_at) || 0);
  const members = enabled
    ? (contract.members || []).map(member => buildFamilyVisibilityMemberSnapshot(contract, member, enabled))
    : [];
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    visibility_settings_enabled: enabled,
    generated_at: nowSeconds(),
    revision,
    summary: {
      default_scope: enabled ? 'contract_members_only' : 'disabled',
      member_count: (contract.members || []).length,
      accepted_member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
      max_members: typeDef.max_members,
      public_profile_enabled: false,
      festival_room_binding_enabled: false,
      local_graph_publication_enabled: false,
      personal_graph_auto_publish_enabled: false,
      consent_required: true,
      visibility_audit_enabled: false,
      rollback_enabled: false,
      disabled_reason: enabled ? '' : '家族关系公开设置第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorMember ? buildFamilyVisibilityMemberSnapshot(contract, actorMember, enabled) : null,
    members,
    visibility_scopes: FAMILY_VISIBILITY_SCOPE_DEFS.map(scope => ({
      ...scope,
      enabled: enabled && scope.enabled === true,
      write_enabled: false,
    })),
    data_categories: FAMILY_VISIBILITY_DATA_CATEGORY_DEFS.map(category => ({
      ...category,
      online_visible: enabled && category.online_visible === true,
      publication_allowed: enabled && category.publication_allowed === true,
      write_enabled: false,
    })),
    default_policy: {
      current_scope: enabled ? 'contract_members' : 'disabled',
      contract_members_can_read: enabled,
      non_members_can_read: false,
      public_profile_can_read: false,
      friends_can_read: false,
      society_members_can_read: false,
      local_single_player_graph_never_auto_published: true,
      member_consent_required_before_publication: true,
      owner_cannot_publish_others_private_graph: true,
    },
    privacy_guards: {
      fixed_npcs_private: true,
      random_npcs_private: true,
      children_private: true,
      pets_private: true,
      hidden_spirits_private: true,
      romance_state_private: true,
      personal_save_read_enabled: false,
      local_graph_import_enabled: false,
    },
    governance: {
      server_authoritative: true,
      readonly_first_pass: true,
      future_writes_require_idempotency: true,
      future_writes_require_audit: true,
      future_publication_requires_all_visible_member_consent: true,
      future_visibility_changes_require_rollback: true,
      compensation_required_for_wrong_visibility: true,
      separation_preview_must_include_visibility_reset: true,
      current_policy: '第一版只读展示家族关系图公开策略：仅契约成员可见，公开档案、好友、村社和节会房间均不开放；本地 NPC / 家庭 / 宠物 / 随机 NPC 关系不会自动公开。',
    },
    deferred_operations: [
      'update_family_visibility_settings',
      'collect_family_visibility_consent',
      'publish_contract_graph_to_profile',
      'bind_family_relation_graph_to_festival_room',
      'visibility_audit_log',
      'visibility_rollback',
      'visibility_compensation_replay',
    ],
  };
}

function resolveFamilyFestivalSeatRole(manorRole) {
  return FAMILY_FESTIVAL_SEAT_ROLE_DEFS[manorRole] || FAMILY_FESTIVAL_SEAT_ROLE_DEFS.farm_steward;
}

function buildFamilyFestivalSeatMemberSnapshot(contract, member, enabled = isFamilyRoleContractType(contract.type), index = 0) {
  const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const roleDef = enabled ? getFamilyManorRoleDef(manorRole) : null;
  const seatRole = resolveFamilyFestivalSeatRole(manorRole);
  const permissions = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  const canPrepareSupplies = permissions.storage.deposit === true
    || permissions.farm.harvest === true
    || permissions.animal.collect_product === true
    || permissions.construction.move_common === true;
  return {
    username: member.username,
    username_key: member.username_key,
    display_name: member.display_name,
    role: member.role,
    status: member.status,
    manor_role: manorRole,
    manor_role_label: roleDef?.label || '',
    seat_id: enabled ? `family_seat_${index + 1}` : '',
    seat_index: enabled ? index + 1 : 0,
    seat_label: enabled ? seatRole.label : '',
    festival_role: enabled ? seatRole.festival_role : '',
    seat_summary: enabled ? seatRole.summary : '',
    seat_state: enabled && member.status === 'accepted' ? 'preview_ready' : 'disabled',
    seat_permissions: {
      can_view_festival_seats: enabled && member.status === 'accepted',
      can_manage_seat_rules_preview: enabled && manorRole === 'family_head',
      can_prepare_supplies_preview: enabled && canPrepareSupplies,
      can_review_budget_preview: enabled && ['family_head', 'treasurer'].includes(manorRole),
      can_open_festival_room: false,
      can_reserve_family_seat: false,
      can_spend_shared_fund_for_festival: false,
      can_claim_festival_reward: false,
    },
  };
}

function buildFamilyFestivalSeatTemplates(enabled) {
  return FAMILY_FESTIVAL_SEAT_TEMPLATE_DEFS.map(template => {
    const familyCompatible = template.family_compatible !== false && template.member_limit >= 4;
    return {
      id: template.id,
      label: template.label,
      visual_type: template.visual_type,
      member_limit: template.member_limit,
      family_compatible: familyCompatible,
      available: enabled && familyCompatible,
      binding_enabled: false,
      room_create_enabled: false,
      reward_enabled: false,
      unlock_source: template.unlock_source,
      recommended_roles: [...template.recommended_roles],
      summary: template.summary,
      disabled_reason: enabled
        ? (familyCompatible ? '' : '该模板偏双人关系，不纳入家族多人席位默认入口。')
        : '当前契约不是结拜庄园或合伙庄园。',
    };
  });
}

function buildFamilyFestivalSeatScenePreview(contract, members, enabled, revision) {
  const acceptedMembers = members.filter(member => member.status === 'accepted');
  return {
    board_type: 'scene',
    board_id: `family_festival_seats:${contract.id}`,
    revision,
    selected_visual_id: 'family_festival_banner',
    recent_feedback: enabled
      ? '家族节会席位第一版仅生成席位与模板预览；真实开房、报名锁位和奖励写入暂缓。'
      : '当前契约不是结拜庄园或合伙庄园，家族节会席位未启用。',
    scene: enabled ? {
      id: 'family_festival_courtyard',
      label: '家族节会席位预排',
      kind: 'festival_seating',
      member_capacity: Math.max(4, acceptedMembers.length),
      object_count: 5,
    } : null,
    scene_objects: enabled ? [
      {
        id: 'family_festival_banner',
        label: '家族席旗',
        kind: 'banner',
        state: 'planning',
        x: 50,
        y: 14,
        linked_template_ids: ['lantern_fair', 'dragon_boat', 'laba_cookpot'],
        available_action_ids: [],
      },
      {
        id: 'family_festival_supply_cart',
        label: '供给车',
        kind: 'supply',
        state: members.some(member => member.manor_role === 'storage_keeper') ? 'staffed' : 'needs_role',
        x: 24,
        y: 58,
        linked_role_ids: ['storage_keeper', 'farm_steward'],
        available_action_ids: [],
      },
      {
        id: 'family_festival_stage',
        label: '搭场位',
        kind: 'stage',
        state: members.some(member => member.manor_role === 'workshop_keeper') ? 'staffed' : 'needs_role',
        x: 72,
        y: 54,
        linked_role_ids: ['workshop_keeper'],
        available_action_ids: [],
      },
      {
        id: 'family_festival_budget_table',
        label: '账房桌',
        kind: 'budget',
        state: members.some(member => member.manor_role === 'treasurer' || member.manor_role === 'family_head') ? 'staffed' : 'needs_role',
        x: 35,
        y: 80,
        linked_role_ids: ['treasurer', 'family_head'],
        available_action_ids: [],
      },
      {
        id: 'family_festival_guest_seats',
        label: '家族成员席',
        kind: 'seats',
        state: acceptedMembers.length >= 2 ? 'preview_ready' : 'locked',
        x: 66,
        y: 80,
        seat_count: acceptedMembers.length,
        available_action_ids: [],
      },
    ] : [],
    seats: enabled ? members.map(member => ({
      seat_id: member.seat_id,
      seat_index: member.seat_index,
      seat_label: member.seat_label,
      username: member.username,
      display_name: member.display_name,
      manor_role: member.manor_role,
      manor_role_label: member.manor_role_label,
      festival_role: member.festival_role,
      state: member.seat_state,
    })) : [],
  };
}

function buildFamilyFestivalSeatSnapshot(contract, actorUsername = '') {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorMember = getContractMember(contract, actorUsername);
  const revision = Math.max(Number(contract.updated_at) || 0, Number(contract.activated_at) || 0, Number(contract.created_at) || 0);
  const members = enabled
    ? (contract.members || []).map((member, index) => buildFamilyFestivalSeatMemberSnapshot(contract, member, enabled, index))
    : [];
  const templates = buildFamilyFestivalSeatTemplates(enabled);
  const actorSeat = actorMember
    ? buildFamilyFestivalSeatMemberSnapshot(contract, actorMember, enabled, Math.max(0, (contract.members || []).findIndex(member => member.username_key === actorMember.username_key)))
    : null;

  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: contract.status,
    readonly: true,
    write_enabled: false,
    writes_enabled: false,
    festival_seats_enabled: enabled,
    seat_reservation_enabled: false,
    festival_room_binding_enabled: false,
    generated_at: nowSeconds(),
    revision,
    summary: {
      member_count: (contract.members || []).filter(member => member.status === 'accepted').length,
      max_members: typeDef.max_members,
      preview_seat_count: enabled ? members.filter(member => member.status === 'accepted').length : 0,
      available_template_count: templates.filter(template => template.available).length,
      festival_room_create_enabled: false,
      festival_room_invite_enabled: false,
      settlement_enabled: false,
      reward_enabled: false,
      reputation_award_enabled: false,
      shared_fund_spend_enabled: false,
      shared_warehouse_consume_enabled: false,
      festival_ticket_spend_enabled: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      disabled_reason: enabled ? '' : '家族节会席位第一版仅面向结拜庄园和合伙庄园。',
    },
    actor: actorSeat,
    members,
    candidate_templates: templates,
    visual_state_preview: buildFamilyFestivalSeatScenePreview(contract, members, enabled, revision),
    governance: {
      server_authoritative: true,
      seat_reservation_requires_idempotency: true,
      seat_reservation_requires_audit: true,
      room_creation_requires_actor_permission: true,
      room_binding_requires_recovery_plan: true,
      disconnect_recovery_required: true,
      compensation_required_for_future_rewards: true,
      public_festival_room_scope_unchanged: true,
      current_policy: '第一版只读预排家族席位和可承接节会模板，不创建房间、不锁席、不消费共同资产、不发个人或家族奖励。',
    },
    settlement: {
      festival_receipt_required: true,
      reward_to_personal_save_enabled: false,
      reward_to_shared_fund_enabled: false,
      reward_to_shared_warehouse_enabled: false,
      family_reputation_enabled: false,
      rollback_required: true,
      compensation_replay_required: true,
    },
    recommended_flow: [
      '先由家主读取席位预览，确认哪些成员承担主事、供给、搭场和账房席。',
      '后续真实开放时，席位锁定必须带幂等键并写入契约审计。',
      '节会房间创建仍走现有 festival room 状态机，家族席位只作为邀请和分工来源。',
      '结算必须先生成节会凭证，再决定个人奖励、家族声望或共同资产入账，任一写入失败进入补偿重放。',
    ],
    deferred_operations: [
      'reserve_family_festival_seat',
      'bind_family_seat_to_festival_room',
      'create_festival_room_from_family_seats',
      'consume_shared_festival_supplies',
      'award_family_festival_reputation',
      'settle_family_festival_rewards',
      'family_festival_compensation_replay',
      'family_festival_seat_rollback',
    ],
  };
}

function buildPermissionSnapshot(contract, actorUsername = '') {
  const actorMember = getContractMember(contract, actorUsername);
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    editable_by_actor: canManageCohabitationPermissions(actorMember),
    idempotency_required: true,
    safety_rails: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true,
      confirmations_readonly: true,
    },
    groups: PERMISSION_GROUPS.map(group => ({
      id: group,
      keys: Object.keys(createDefaultPermissionSet(contract.type)[group] || {}),
    })),
    members: (contract.members || []).map(member => ({
      username: member.username,
      username_key: member.username_key,
      display_name: member.display_name,
      role: member.role,
      manor_role: normalizeFamilyManorRole(member.manor_role, contract.type, member.role),
      status: member.status,
      can_manage_permissions: canManageCohabitationPermissions(member),
      permissions: enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type),
    })),
    recent_permission_audits: (contract.audit_log || [])
      .filter(entry => entry.action === 'permissions_updated')
      .slice(0, 10),
  };
}

function resolveMemberLastActive(contract = {}, member = {}) {
  const auditTimes = (contract.audit_log || [])
    .filter(entry => normalizeUsernameKey(entry.actor_username) === member.username_key)
    .map(entry => Number(entry.at) || 0)
    .filter(Boolean);
  return Math.max(
    Number(member.last_active_at) || 0,
    Number(member.accepted_at) || 0,
    Number(member.invited_at) || 0,
    ...auditTimes
  );
}

function buildOfflineOperationSnapshot(contract, actorUsername = '') {
  const actorMember = getContractMember(contract, actorUsername);
  const actorPermissions = enforcePermissionSafetyRails(contract.permissions?.[actorMember?.username_key], contract.type);
  const now = nowSeconds();
  const members = (contract.members || []).map(member => {
    const lastActiveAt = resolveMemberLastActive(contract, member);
    const offlineSeconds = lastActiveAt > 0 ? Math.max(0, now - lastActiveAt) : null;
    return {
      username: member.username,
      username_key: member.username_key,
      display_name: member.display_name,
      role: member.role,
      status: member.status,
      last_active_at: lastActiveAt,
      last_action: sanitizeText(member.last_action, 80),
      online_state: offlineSeconds !== null && offlineSeconds <= 15 * 60 ? 'recently_active' : 'offline_or_idle',
      offline_seconds: offlineSeconds,
      can_operate_independently: member.status === 'accepted' && contract.status === 'active',
    };
  });
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    summary: {
      server_authoritative: true,
      member_online_required: false,
      offline_member_blocks_operations: false,
      independent_operations_enabled: contract.status === 'active' && actorMember?.status === 'accepted',
      personal_money_merged: false,
      shared_log_available: true,
      auto_offline_income_enabled: false,
      conflict_policy: '共同庄园第一版以服务端契约、仓库、基金和审计日志为准；离线自动收益与客户端本地合并暂不开放。',
    },
    members,
    actor_capabilities: {
      read_shared_map: true,
      read_warehouse: true,
      deposit_warehouse: actorPermissions.storage.deposit === true,
      withdraw_warehouse_common: actorPermissions.storage.withdraw_common === true,
      read_fund: true,
      contribute_fund: true,
      spend_fund_small: actorPermissions.fund.spend_small === true,
      spend_fund_medium: actorPermissions.fund.spend_medium === true,
      auto_pay_seeds_feed: actorPermissions.fund.auto_buy_seeds_feed === true,
      read_permissions: true,
      manage_permissions: canManageCohabitationPermissions(actorMember),
      create_separation_preview: true,
    },
    recent_shared_log: (contract.audit_log || []).slice(0, 30),
    deferred_operations: [
      'offline_auto_income',
      'offline_worker_queue',
      'simultaneous_online_bonus',
      'conflict_merge_tool',
    ],
  };
}

function buildSharedWarehouseSnapshot(contract, actorUsername = '') {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const actorKey = normalizeUsernameKey(actorUsername);
  const actorMember = getContractMember(contract, actorUsername);
  const actorPermissions = enforcePermissionSafetyRails(contract.permissions?.[actorKey], contract.type);
  const familyWarehouse = buildFamilyWarehouseSummary(contract, warehouse, actorMember);
  const totalQuantity = warehouse.items.reduce((sum, item) => sum + item.quantity, 0);
  const sellEnabled = contract.status === 'active' && actorPermissions.storage.sell_items === true;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    items: warehouse.items,
    ledger: warehouse.ledger.slice(0, 50),
    summary: {
      item_count: warehouse.items.length,
      total_quantity: totalQuantity,
      ledger_count: warehouse.ledger.length,
      personal_money_merged: false,
      deposit_enabled: contract.status === 'active' && actorPermissions.storage.deposit === true,
      withdraw_enabled: contract.status === 'active' && actorPermissions.storage.withdraw_common === true,
      sell_enabled: sellEnabled,
      family_manor_warehouse: familyWarehouse.enabled,
      role_based_storage_permissions: familyWarehouse.role_based_storage_permissions,
      source_owner_count: familyWarehouse.source_owner_summary.length,
      idempotency_required: true,
      protected_qualities: ['fine', 'excellent', 'supreme'],
      protected_operations: ['withdraw_high_quality', 'withdraw_rare', 'sell_high_quality', 'sell_rare'],
      compensation_policy: '第一版开放普通物品放入、取出与卖出，均写 ledger 与审计；误操作可按流水、个人背包落点和共同基金入账追溯，自动冻结 / 回滚待后续接入。',
    },
    permissions: {
      can_deposit: actorPermissions.storage.deposit === true,
      can_withdraw_common: actorPermissions.storage.withdraw_common === true,
      can_withdraw_high_quality: actorPermissions.storage.withdraw_high_quality === true,
      can_withdraw_rare: actorPermissions.storage.withdraw_rare === true,
      can_sell_items: actorPermissions.storage.sell_items === true,
    },
    family_warehouse: familyWarehouse,
  };
}

function buildFamilyWarehouseSummary(contract = {}, warehouse = {}, actorMember = null) {
  const enabled = isFamilyRoleContractType(contract.type);
  const typeDef = RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const actorRole = normalizeFamilyManorRole(actorMember?.manor_role, contract.type, actorMember?.role);
  const actorRoleDef = enabled ? getFamilyManorRoleDef(actorRole) : null;
  const actorPermissions = enforcePermissionSafetyRails(contract.permissions?.[actorMember?.username_key], contract.type);
  const members = enabled
    ? (contract.members || []).map(member => {
        const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
        const roleDef = getFamilyManorRoleDef(manorRole);
        const permissions = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
        return {
          username: member.username,
          username_key: member.username_key,
          display_name: member.display_name,
          role: member.role,
          status: member.status,
          manor_role: manorRole,
          manor_role_label: roleDef.label,
          permission_focus: [...roleDef.permission_focus],
          storage_permissions: {
            can_deposit: permissions.storage.deposit === true,
            can_withdraw_common_preview: permissions.storage.withdraw_common === true,
            can_withdraw_high_quality_preview: permissions.storage.withdraw_high_quality === true,
            can_withdraw_rare_preview: permissions.storage.withdraw_rare === true,
            can_sell_items_preview: permissions.storage.sell_items === true,
            withdraw_enabled: permissions.storage.withdraw_common === true,
            sell_enabled: contract.status === 'active' && permissions.storage.sell_items === true,
          },
        };
      })
    : [];
  return {
    enabled,
    role_based_storage_permissions: enabled,
    max_members: typeDef.max_members,
    member_count: (contract.members || []).length,
    actor: enabled && actorMember ? {
      username: actorMember.username,
      username_key: actorMember.username_key,
      display_name: actorMember.display_name,
      role: actorMember.role,
      manor_role: actorRole,
      manor_role_label: actorRoleDef?.label || '',
    } : null,
    members,
    source_owner_summary: buildWarehouseSourceOwnerSummary(warehouse),
    governance: {
      personal_inventory_merged: false,
      personal_money_merged: false,
      deposit_uses_personal_inventory: true,
      deposit_requires_idempotency_key: true,
      withdraw_flow_enabled: enabled && actorPermissions.storage.withdraw_common === true,
      withdraw_common_requires_idempotency_key: true,
      sell_flow_enabled: enabled && contract.status === 'active' && actorPermissions.storage.sell_items === true,
      high_value_withdraw_requires_both: true,
      rare_withdraw_requires_both: true,
      ledger_required_for_asset_return: true,
      separation_return_policy: 'return_warehouse_items_by_ledger_origin_owner',
      compensation_policy: '家族共同仓库第一版开放普通物品取出与卖出入共同基金；高品质、稀有、冻结和自动返还仍暂缓，争议先按 ledger、共同基金 ledger 与 origin_assets 人工补偿。',
    },
    deferred_operations: [
      'withdraw_high_quality',
      'withdraw_rare',
      'sell_high_quality',
      'sell_rare',
      'shared_harvest_auto_deposit',
      'warehouse_freeze_and_revert',
    ],
  };
}

function buildWarehouseSourceOwnerSummary(warehouse = {}) {
  const groups = new Map();
  const ledger = Array.isArray(warehouse.ledger) ? warehouse.ledger : [];
  for (const entry of ledger) {
    if (entry.status !== 'committed') continue;
    const key = entry.source_owner_id || entry.source_owner_key || entry.source_owner_username;
    if (!key) continue;
    const current = groups.get(key) || {
      origin_owner_id: entry.source_owner_id,
      origin_owner_username: entry.source_owner_username,
      origin_owner_key: entry.source_owner_key,
      origin_owner_manor_role: entry.source_owner_manor_role,
      origin_owner_manor_role_label: entry.source_owner_manor_role_label,
      total_quantity: 0,
      ledger_count: 0,
      item_ids: [],
      manual_return_required: true,
    };
    const delta = entry.action === 'deposit' || entry.action === 'compensate'
      ? entry.quantity
      : -entry.quantity;
    current.total_quantity = Math.max(0, current.total_quantity + delta);
    current.ledger_count += 1;
    if (entry.item_id && !current.item_ids.includes(entry.item_id)) current.item_ids.push(entry.item_id);
    groups.set(key, current);
  }
  return [...groups.values()]
    .filter(entry => entry.total_quantity > 0)
    .slice(0, 80);
}

function buildSharedFundSnapshot(contract, actorUsername = '') {
  const fund = normalizeSharedFund(contract.shared_fund);
  const actorKey = normalizeUsernameKey(actorUsername);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[actorKey], contract.type);
  const allowedSmallSpendPurposes = Object.entries(SMALL_FUND_SPEND_PURPOSES).map(([id, def]) => ({
    id,
    label: def.label,
    category: def.category,
    max_amount: Math.min(FUND_MAX_SMALL_SPEND_AMOUNT, def.max_amount),
    auto_pay_eligible: def.auto_pay_eligible === true,
  }));
  const allowedMediumSpendPurposes = Object.entries(MEDIUM_FUND_SPEND_PURPOSES).map(([id, def]) => ({
    id,
    label: def.label,
    category: def.category,
    max_amount: Math.min(FUND_MAX_MEDIUM_SPEND_AMOUNT, def.max_amount),
    auto_pay_eligible: def.auto_pay_eligible === true,
  }));
  const allowedLargeSpendPurposes = Object.entries(LARGE_FUND_SPEND_PURPOSES).map(([id, def]) => ({
    id,
    label: def.label,
    category: def.category,
    max_amount: Math.min(FUND_MAX_LARGE_SPEND_AMOUNT, def.max_amount),
    confirmation_required: true,
  }));
  const largeSpendDrafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft).slice(0, FUND_LARGE_SPEND_DRAFT_LIMIT)
    : [];
  const pendingLargeSpendDrafts = largeSpendDrafts.filter(draft => draft.state === 'pending_confirmation');
  const readyLargeSpendDrafts = largeSpendDrafts.filter(draft => draft.state === 'ready_to_execute');
  const executedLargeSpendDrafts = largeSpendDrafts.filter(draft => draft.state === 'executed');
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    balance: fund.balance,
    ledger: fund.ledger.slice(0, 50),
    large_spend_drafts: largeSpendDrafts.slice(0, 20),
    summary: {
      balance: fund.balance,
      ledger_count: fund.ledger.length,
      personal_money_merged: false,
      contribution_enabled: contract.status === 'active',
      spend_enabled: contract.status === 'active' && actorPermissions.fund.spend_small === true,
      small_spend_enabled: contract.status === 'active' && actorPermissions.fund.spend_small === true,
      medium_spend_enabled: contract.status === 'active' && actorPermissions.fund.spend_medium === true,
      large_spend_enabled: false,
      large_spend_draft_enabled: contract.status === 'active' && actorPermissions.fund.spend_large === true,
      large_spend_execution_enabled: contract.status === 'active' && actorPermissions.fund.spend_large === true && readyLargeSpendDrafts.length > 0,
      idempotency_required: true,
      large_spend_requires_both: actorPermissions.confirmations.large_fund_spend_requires_both === true,
      small_spend_max_amount: FUND_MAX_SMALL_SPEND_AMOUNT,
      medium_spend_max_amount: FUND_MAX_MEDIUM_SPEND_AMOUNT,
      large_spend_max_amount: FUND_MAX_LARGE_SPEND_AMOUNT,
      allowed_small_spend_purposes: allowedSmallSpendPurposes,
      allowed_medium_spend_purposes: allowedMediumSpendPurposes,
      allowed_large_spend_purposes: allowedLargeSpendPurposes,
      pending_large_spend_draft_count: pendingLargeSpendDrafts.length,
      ready_large_spend_draft_count: readyLargeSpendDrafts.length,
      executed_large_spend_draft_count: executedLargeSpendDrafts.length,
      compensation_policy: '第一版支持成员自愿注资、小额白名单支出、中额加工 / 建材预算、大额确认草案和已确认草案扣款；大额执行会写建筑流水，真实建造、自动返还和补偿重放待后续接入。',
    },
    permissions: {
      can_spend_small: actorPermissions.fund.spend_small === true,
      can_spend_medium: actorPermissions.fund.spend_medium === true,
      can_spend_large: actorPermissions.fund.spend_large === true,
      can_auto_buy_seeds_feed: actorPermissions.fund.auto_buy_seeds_feed === true,
    },
  };
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
}

function hasProtectedInventoryFlag(slot = {}) {
  if (slot.locked === true || slot.bound === true || slot.bind === true || slot.unique === true) return true;
  if (slot.questItem === true || slot.quest_item === true || slot.taskItem === true || slot.task_item === true) return true;
  const rarity = sanitizeText(slot.rarity, 40).toLowerCase();
  if (['rare', 'epic', 'legendary', 'unique'].includes(rarity)) return true;
  const category = sanitizeText(slot.category || slot.type, 40).toLowerCase();
  return category.includes('quest') || category.includes('key') || category.includes('memorial');
}

function countDepositableMainInventoryItem(saveData, itemId, quality) {
  ensureInventoryState(saveData);
  return saveData.inventory.items
    .filter(slot => normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) === itemId)
    .filter(slot => normalizeQuality(slot?.quality) === quality)
    .filter(slot => !hasProtectedInventoryFlag(slot))
    .reduce((sum, slot) => sum + normalizePositiveInt(slot.quantity, 0), 0);
}

function deductDepositableMainInventoryItem(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const available = countDepositableMainInventoryItem(saveData, itemId, quality);
  if (available < quantity) {
    return {
      ok: false,
      reason: '个人背包中可放入的普通物品数量不足，已锁定、稀有或临时背包物品不会被扣除',
      available,
      source_slots: [],
    };
  }

  let remaining = quantity;
  const sourceSlots = [];
  for (let index = 0; index < saveData.inventory.items.length && remaining > 0; index += 1) {
    const slot = saveData.inventory.items[index];
    if (normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) !== itemId) continue;
    if (normalizeQuality(slot?.quality) !== quality) continue;
    if (hasProtectedInventoryFlag(slot)) continue;
    const slotQuantity = normalizePositiveInt(slot.quantity, 0);
    const take = Math.min(remaining, slotQuantity);
    if (take <= 0) continue;
    slot.quantity = slotQuantity - take;
    remaining -= take;
    sourceSlots.push({ index, quantity: take });
  }
  saveData.inventory.items = saveData.inventory.items.filter(slot => normalizePositiveInt(slot.quantity, 0) > 0);
  return {
    ok: remaining <= 0,
    available,
    source_slots: sourceSlots,
  };
}

function addWithdrawnWarehouseItemToInventory(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const capacity = Math.max(1, Math.floor(Number(saveData.inventory.capacity) || 24));
  const normalizedQuality = normalizeQuality(quality);
  let remaining = normalizePositiveInt(quantity, 0);
  const targetSlots = [];

  for (let index = 0; index < saveData.inventory.items.length && remaining > 0; index += 1) {
    const slot = saveData.inventory.items[index];
    if (normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) !== itemId) continue;
    if (normalizeQuality(slot?.quality) !== normalizedQuality) continue;
    const slotQuantity = normalizePositiveInt(slot.quantity, 0);
    if (slotQuantity >= WAREHOUSE_ITEM_MAX_STACK) continue;
    const add = Math.min(remaining, WAREHOUSE_ITEM_MAX_STACK - slotQuantity);
    slot.quantity = slotQuantity + add;
    remaining -= add;
    targetSlots.push({ bag: 'inventory.items', index, quantity: add });
  }

  while (remaining > 0 && saveData.inventory.items.length < capacity) {
    const add = Math.min(remaining, WAREHOUSE_ITEM_MAX_STACK);
    const index = saveData.inventory.items.length;
    saveData.inventory.items.push({
      itemId,
      quantity: add,
      quality: normalizedQuality,
      locked: false,
    });
    remaining -= add;
    targetSlots.push({ bag: 'inventory.items', index, quantity: add });
  }

  for (let index = 0; index < saveData.inventory.tempItems.length && remaining > 0; index += 1) {
    const slot = saveData.inventory.tempItems[index];
    if (normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) !== itemId) continue;
    if (normalizeQuality(slot?.quality) !== normalizedQuality) continue;
    const slotQuantity = normalizePositiveInt(slot.quantity, 0);
    if (slotQuantity >= WAREHOUSE_ITEM_MAX_STACK) continue;
    const add = Math.min(remaining, WAREHOUSE_ITEM_MAX_STACK - slotQuantity);
    slot.quantity = slotQuantity + add;
    remaining -= add;
    targetSlots.push({ bag: 'inventory.tempItems', index, quantity: add });
  }

  while (remaining > 0 && saveData.inventory.tempItems.length < WAREHOUSE_TEMP_BAG_CAPACITY) {
    const add = Math.min(remaining, WAREHOUSE_ITEM_MAX_STACK);
    const index = saveData.inventory.tempItems.length;
    saveData.inventory.tempItems.push({
      itemId,
      quantity: add,
      quality: normalizedQuality,
      locked: false,
    });
    remaining -= add;
    targetSlots.push({ bag: 'inventory.tempItems', index, quantity: add });
  }

  return {
    ok: remaining <= 0,
    remaining,
    target_slots: targetSlots,
  };
}

function assignGameplayDataToContext(context, data) {
  context.data = data;
  if (context.saveContainer && typeof context.saveContainer === 'object') {
    context.saveContainer.gameplayData = data;
    if (context.saveContainer.wrapped && context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root.data = data;
    } else if (context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root = data;
    }
  }
}

function normalizeWarehouseDepositPayload(payload = {}) {
  const itemId = normalizeWarehouseItemId(payload.item_id ?? payload.itemId);
  const rawQuantity = Math.floor(Number(payload.quantity) || 0);
  const requestedQuality = String(payload.quality || 'normal').trim().toLowerCase();
  if (!itemId) throw createError('请指定有效的入仓物品');
  if (rawQuantity <= 0) throw createError('入仓数量必须大于 0');
  if (rawQuantity > WAREHOUSE_MAX_DEPOSIT_QUANTITY) throw createError(`单次入仓数量不能超过 ${WAREHOUSE_MAX_DEPOSIT_QUANTITY}`);
  if (!WAREHOUSE_QUALITIES.has(requestedQuality)) throw createError('入仓物品品质参数无效');
  if (requestedQuality !== 'normal') throw createError('共同仓库第一版只允许放入普通品质物品', 403);
  if (isProtectedWarehouseItemId(itemId)) throw createError('该物品疑似关键、稀有或绑定物品，暂不允许放入共同仓库', 403);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同仓库放入需要 idempotency_key，以防断线或重试时重复扣物');
  return {
    item_id: itemId,
    quantity: rawQuantity,
    quality: requestedQuality,
    idempotency_key: idempotencyKey,
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function normalizeWarehouseWithdrawPayload(payload = {}) {
  const itemId = normalizeWarehouseItemId(payload.item_id ?? payload.itemId);
  const rawQuantity = Math.floor(Number(payload.quantity) || 0);
  const requestedQuality = String(payload.quality || 'normal').trim().toLowerCase();
  if (!itemId) throw createError('请指定有效的取出物品');
  if (rawQuantity <= 0) throw createError('取出数量必须大于 0');
  if (rawQuantity > WAREHOUSE_MAX_WITHDRAW_QUANTITY) throw createError(`单次取出数量不能超过 ${WAREHOUSE_MAX_WITHDRAW_QUANTITY}`);
  if (!WAREHOUSE_QUALITIES.has(requestedQuality)) throw createError('取出物品品质参数无效');
  if (requestedQuality !== 'normal') throw createError('共同仓库第一版只允许取出普通品质物品', 403);
  if (isProtectedWarehouseItemId(itemId)) throw createError('该物品疑似关键、稀有或绑定物品，暂不允许从共同仓库取出', 403);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同仓库取出需要 idempotency_key，以防断线或重试时重复取物');
  return {
    item_id: itemId,
    quantity: rawQuantity,
    quality: requestedQuality,
    idempotency_key: idempotencyKey,
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function getWarehouseSellUnitPrice(itemId) {
  const normalized = normalizeWarehouseItemId(itemId).toLowerCase();
  return Math.max(0, Math.floor(Number(WAREHOUSE_SELL_PRICE_BY_ITEM_ID[normalized]) || 0));
}

function normalizeWarehouseSellPayload(payload = {}) {
  const itemId = normalizeWarehouseItemId(payload.item_id ?? payload.itemId);
  const rawQuantity = Math.floor(Number(payload.quantity) || 0);
  const requestedQuality = String(payload.quality || 'normal').trim().toLowerCase();
  if (!itemId) throw createError('请指定有效的卖出物品');
  if (rawQuantity <= 0) throw createError('卖出数量必须大于 0');
  if (rawQuantity > WAREHOUSE_MAX_SELL_QUANTITY) throw createError(`单次卖出数量不能超过 ${WAREHOUSE_MAX_SELL_QUANTITY}`);
  if (!WAREHOUSE_QUALITIES.has(requestedQuality)) throw createError('卖出物品品质参数无效');
  if (requestedQuality !== 'normal') throw createError('共同仓库第一版只允许卖出普通品质物品', 403);
  if (isProtectedWarehouseItemId(itemId)) throw createError('该物品疑似关键、稀有或绑定物品，暂不允许从共同仓库卖出', 403);
  const unitPrice = getWarehouseSellUnitPrice(itemId);
  if (unitPrice <= 0) throw createError('该物品暂未配置共同仓库卖出价格，不能卖出入共同基金', 403);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同仓库卖出需要 idempotency_key，以防断线或重试时重复扣仓和入账');
  return {
    item_id: itemId,
    quantity: rawQuantity,
    quality: requestedQuality,
    unit_price: unitPrice,
    total_amount: rawQuantity * unitPrice,
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeFundContributionPayload(payload = {}) {
  const amount = Math.floor(Number(payload.amount) || 0);
  if (amount <= 0) throw createError('共同基金注资金额必须大于 0');
  if (amount > FUND_MAX_CONTRIBUTION_AMOUNT) throw createError(`单次共同基金注资不能超过 ${FUND_MAX_CONTRIBUTION_AMOUNT}`);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金注资需要 idempotency_key，以防断线或重试时重复扣铜币');
  return {
    amount,
    idempotency_key: idempotencyKey,
    purpose: sanitizeText(payload.purpose, 80) || 'shared_fund',
    memo: sanitizeText(payload.memo, 160),
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function resolveFundSpendPurpose(purpose) {
  if (SMALL_FUND_SPEND_PURPOSES[purpose]) {
    return {
      ...SMALL_FUND_SPEND_PURPOSES[purpose],
      tier: 'small',
      max_amount: Math.min(FUND_MAX_SMALL_SPEND_AMOUNT, SMALL_FUND_SPEND_PURPOSES[purpose].max_amount),
      permission_key: 'spend_small',
    };
  }
  if (MEDIUM_FUND_SPEND_PURPOSES[purpose]) {
    return {
      ...MEDIUM_FUND_SPEND_PURPOSES[purpose],
      tier: 'medium',
      max_amount: Math.min(FUND_MAX_MEDIUM_SPEND_AMOUNT, MEDIUM_FUND_SPEND_PURPOSES[purpose].max_amount),
      permission_key: 'spend_medium',
    };
  }
  return null;
}

function resolveLargeFundSpendPurpose(purpose) {
  if (!LARGE_FUND_SPEND_PURPOSES[purpose]) return null;
  return {
    ...LARGE_FUND_SPEND_PURPOSES[purpose],
    tier: 'large',
    max_amount: Math.min(FUND_MAX_LARGE_SPEND_AMOUNT, LARGE_FUND_SPEND_PURPOSES[purpose].max_amount),
    permission_key: 'spend_large',
  };
}

function normalizeFundSpendPayload(payload = {}) {
  const amount = Math.floor(Number(payload.amount) || 0);
  const purpose = sanitizeText(payload.purpose || payload.spend_purpose || payload.budget_type, 80) || 'seed_budget';
  const purposeDef = resolveFundSpendPurpose(purpose);
  if (!purposeDef) throw createError('共同基金当前只允许小额种子 / 饲料 / 工具 / 跑腿，或中额加工 / 建材用途', 403);
  if (amount <= 0) throw createError('共同基金支出金额必须大于 0');
  const maxAmount = purposeDef.max_amount;
  if (amount > maxAmount) {
    const tierLabel = purposeDef.tier === 'medium' ? '中额' : '小额';
    throw createError(`该共同基金${tierLabel}用途单次支出不能超过 ${maxAmount}`);
  }
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金支出需要 idempotency_key，以防断线或重试时重复扣款');
  const autoPay = payload.auto_pay === true || payload.auto === true;
  if (autoPay && purposeDef.auto_pay_eligible !== true) throw createError('该共同基金用途暂不支持自动支付', 403);
  return {
    amount,
    idempotency_key: idempotencyKey,
    purpose,
    purpose_label: purposeDef.label,
    spend_category: purposeDef.category,
    spend_tier: purposeDef.tier,
    permission_key: purposeDef.permission_key,
    auto_pay: autoPay,
    target_ref: sanitizeText(payload.target_ref || payload.target_id || payload.order_id || payload.shop_item_id, 120),
    memo: sanitizeText(payload.memo, 160),
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function normalizeLargeFundSpendDraftPayload(payload = {}) {
  const amount = Math.floor(Number(payload.amount) || 0);
  const purpose = sanitizeText(payload.purpose || payload.spend_purpose || payload.budget_type, 80) || 'family_building';
  const purposeDef = resolveLargeFundSpendPurpose(purpose);
  if (!purposeDef) throw createError('共同基金大额确认草案当前只支持家族建筑或庄园扩建用途', 403);
  if (amount <= FUND_MAX_MEDIUM_SPEND_AMOUNT) throw createError(`大额共同基金确认草案金额必须超过 ${FUND_MAX_MEDIUM_SPEND_AMOUNT}`);
  if (amount > purposeDef.max_amount) throw createError(`该大额共同基金用途单次确认不能超过 ${purposeDef.max_amount}`);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金大额确认草案需要 idempotency_key，以防断线或重试时重复生成');
  const targetRef = sanitizeText(payload.target_ref || payload.target_id || payload.building_id || payload.expansion_id, 120);
  if (!targetRef) throw createError('共同基金大额确认草案需要 target_ref 记录建筑或扩建目标');
  return {
    amount,
    idempotency_key: idempotencyKey,
    purpose,
    purpose_label: purposeDef.label,
    spend_category: purposeDef.category,
    spend_tier: purposeDef.tier,
    permission_key: purposeDef.permission_key,
    target_ref: targetRef,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeLargeFundSpendConfirmPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金大额确认需要 idempotency_key，以防断线或重试时重复确认');
  return {
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationPreviewConfirmPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居预览确认需要 idempotency_key，以防断线或重试时重复确认');
  return {
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationExecutionRequestPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居执行请求需要 idempotency_key，以防断线或重试时重复创建执行请求');
  return {
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationAssetReturnExecutePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居资产返还执行需要 idempotency_key，以防断线或重试时重复记录返还');
  return {
    idempotency_key: idempotencyKey,
    execution_request_id: sanitizeText(payload.execution_request_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeLargeFundSpendExecutePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金大额草案执行扣款需要 idempotency_key，以防断线或重试时重复扣基金');
  return {
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealBuildApplyPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实落账需要 idempotency_key，以防断线或重试时重复落账');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingMaterialsConsumePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑材料消耗需要 idempotency_key，以防断线或重试时重复扣共同仓库');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function resolveSharedFundAutoPurchase(spend) {
  if (spend.auto_pay !== true) return null;
  const targetRef = sanitizeText(spend.target_ref, 120);
  const catalogItem = SHARED_FUND_AUTO_PURCHASE_CATALOG[targetRef];
  if (!catalogItem) throw createError('共同基金自动购买第一版只支持服务端白名单种子 / 饲料目标', 403);
  if (!catalogItem.allowed_purposes.includes(spend.purpose)) throw createError('该共同基金购买目标不匹配当前支出用途', 403);
  const quantity = Math.floor(spend.amount / catalogItem.unit_price);
  if (quantity <= 0 || quantity * catalogItem.unit_price !== spend.amount) {
    throw createError('共同基金自动购买金额必须等于服务端单价乘以整数数量', 400);
  }
  return {
    ...catalogItem,
    target_ref: targetRef,
    quantity,
    total_amount: spend.amount,
    quality: 'normal',
  };
}

function buildWarehouseOriginAsset(entry) {
  return {
    ledger_id: entry.id,
    action: entry.action,
    item_id: entry.item_id,
    quantity: entry.quantity,
    quality: entry.quality,
    origin_owner_id: entry.source_owner_id,
    origin_owner_username: entry.source_owner_username,
    origin_owner_key: entry.source_owner_key,
    origin_owner_manor_role: entry.source_owner_manor_role,
    origin_owner_manor_role_label: entry.source_owner_manor_role_label,
    source_save_id: entry.source_save_id,
    source_save_slot: entry.source_save_slot,
    source_inventory: entry.source_inventory,
    deposited_at: ['deposit', 'compensate'].includes(entry.action) ? entry.at : 0,
    withdrawn_at: entry.action === 'withdraw' ? entry.at : 0,
    withdrawn_by_username: entry.action === 'withdraw' ? entry.actor_username : '',
    sold_at: entry.action === 'sell' ? entry.at : 0,
    sold_by_username: entry.action === 'sell' ? entry.actor_username : '',
    consumed_at: entry.action === 'consume' ? entry.at : 0,
    consumed_by_username: entry.action === 'consume' ? entry.actor_username : '',
    target_ref: entry.target_ref || '',
    unit_price: entry.unit_price || 0,
    total_amount: entry.total_amount || 0,
    fund_ledger_id: entry.fund_ledger_id || '',
    target_save_id: entry.target_save_id,
    target_save_slot: entry.target_save_slot,
    target_inventory: entry.target_inventory,
    idempotency_key: entry.idempotency_key,
  };
}

function consumeWarehouseLots(lots, quantity, preferredOwnerKey = '') {
  let remaining = quantity;
  const allocations = [];
  const passes = preferredOwnerKey
    ? [
        lot => lot.source_owner_key === preferredOwnerKey,
        lot => lot.source_owner_key !== preferredOwnerKey,
      ]
    : [() => true];
  for (const predicate of passes) {
    for (const lot of lots) {
      if (remaining <= 0) break;
      if (!predicate(lot) || lot.remaining <= 0) continue;
      const take = Math.min(remaining, lot.remaining);
      lot.remaining -= take;
      remaining -= take;
      allocations.push({
        ...lot,
        quantity: take,
      });
    }
  }
  return {
    ok: remaining <= 0,
    remaining,
    allocations,
  };
}

function buildWarehouseWithdrawalAllocations(warehouse = {}, itemId, quantity, quality) {
  const normalizedQuality = normalizeQuality(quality);
  const lots = [];
  const ledger = Array.isArray(warehouse.ledger) ? warehouse.ledger.slice().reverse() : [];
  for (const rawEntry of ledger) {
    const entry = normalizeWarehouseLedgerEntry(rawEntry);
    if (!entry || entry.status !== 'committed') continue;
    if (entry.item_id !== itemId || entry.quality !== normalizedQuality) continue;
    if (entry.action === 'deposit' || entry.action === 'compensate') {
      lots.push({
        source_ledger_id: entry.id,
        source_owner_id: entry.source_owner_id,
        source_owner_username: entry.source_owner_username,
        source_owner_display_name: entry.source_owner_display_name,
        source_owner_key: entry.source_owner_key,
        source_owner_manor_role: entry.source_owner_manor_role,
        source_owner_manor_role_label: entry.source_owner_manor_role_label,
        source_save_id: entry.source_save_id,
        source_save_slot: entry.source_save_slot,
        source_inventory: entry.source_inventory,
        remaining: entry.quantity,
      });
    } else if (['withdraw', 'sell', 'consume', 'revert'].includes(entry.action)) {
      consumeWarehouseLots(lots, entry.quantity, entry.source_owner_key);
    }
  }
  const result = consumeWarehouseLots(lots, quantity);
  if (!result.ok) return result;
  const grouped = new Map();
  for (const allocation of result.allocations) {
    const key = allocation.source_owner_id || allocation.source_owner_key || allocation.source_owner_username || 'unknown';
    const current = grouped.get(key) || {
      ...allocation,
      quantity: 0,
      source_ledger_ids: [],
    };
    current.quantity += allocation.quantity;
    if (allocation.source_ledger_id && !current.source_ledger_ids.includes(allocation.source_ledger_id)) {
      current.source_ledger_ids.push(allocation.source_ledger_id);
    }
    grouped.set(key, current);
  }
  return {
    ok: true,
    remaining: 0,
    allocations: [...grouped.values()],
  };
}

function buildFundOriginAsset(entry) {
  return {
    ledger_id: entry.id,
    amount: entry.amount,
    origin_owner_id: entry.source_owner_id,
    origin_owner_username: entry.source_owner_username,
    origin_owner_key: entry.source_owner_key,
    source_save_id: entry.source_save_id,
    source_save_slot: entry.source_save_slot,
    purpose: entry.purpose,
    contributed_at: entry.at,
    idempotency_key: entry.idempotency_key,
  };
}

function buildWarehouseReturnPreview(contract = {}) {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const groups = new Map();
  for (const entry of warehouse.ledger.slice().reverse()) {
    if (entry.status !== 'committed' || !['deposit', 'compensate', 'withdraw', 'sell', 'consume', 'revert'].includes(entry.action)) continue;
    const key = `${entry.source_owner_id || entry.source_owner_key}:${entry.item_id}:${entry.quality}`;
    const current = groups.get(key) || {
      origin_owner_id: entry.source_owner_id,
      origin_owner_username: entry.source_owner_username,
      origin_owner_key: entry.source_owner_key,
      item_id: entry.item_id,
      quality: entry.quality,
      quantity: 0,
      ledger_ids: [],
      source_ledger_count: 0,
      return_policy: '按共同仓库放入流水归还给来源玩家；第一版只生成预览，不自动改写个人背包。',
      manual_return_required: true,
    };
    const delta = ['deposit', 'compensate'].includes(entry.action) ? entry.quantity : -entry.quantity;
    current.quantity = Math.max(0, current.quantity + delta);
    current.ledger_ids.push(entry.id);
    current.source_ledger_count += 1;
    groups.set(key, current);
  }
  return [...groups.values()].filter(entry => entry.quantity > 0).slice(0, 80);
}

function buildFundReturnPreview(contract = {}) {
  const fund = normalizeSharedFund(contract.shared_fund);
  const groups = new Map();
  for (const entry of fund.ledger) {
    if (entry.status !== 'committed' || entry.action !== 'contribution' || entry.amount <= 0) continue;
    const key = entry.source_owner_id || entry.source_owner_key || entry.source_owner_username;
    if (!key) continue;
    const current = groups.get(key) || {
      origin_owner_id: entry.source_owner_id,
      origin_owner_username: entry.source_owner_username,
      origin_owner_key: entry.source_owner_key,
      amount: 0,
      ledger_ids: [],
      source_ledger_count: 0,
    };
    current.amount += entry.amount;
    current.ledger_ids.push(entry.id);
    current.source_ledger_count += 1;
    groups.set(key, current);
  }
  const entries = [...groups.values()].filter(entry => entry.amount > 0).slice(0, 80);
  const totalContributed = entries.reduce((sum, entry) => sum + entry.amount, 0);
  let allocated = 0;
  return entries.map((entry, index) => {
    const suggestedRefundAmount = totalContributed > 0
      ? (index === entries.length - 1
          ? Math.max(0, fund.balance - allocated)
          : Math.floor((fund.balance * entry.amount) / totalContributed))
      : 0;
    allocated += suggestedRefundAmount;
    return {
      ...entry,
      contribution_share_basis_points: totalContributed > 0 ? Math.round((entry.amount * 10000) / totalContributed) : 0,
      suggested_refund_amount: suggestedRefundAmount,
      return_policy: '按注资 ledger 比例预览共同基金余额返还；真实返还需双方确认后由后续执行流程落账。',
      manual_return_required: true,
    };
  });
}

function buildPlotReturnPreview(contract = {}) {
  const farmSnapshots = (contract.members || []).map(readMemberFarmSnapshot);
  const layout = buildSharedFarmPlots(contract, farmSnapshots);
  const groups = new Map();
  for (const plot of layout.plots) {
    const key = plot.origin_owner_id || plot.origin_owner_key || plot.origin_owner_username;
    if (!key) continue;
    const current = groups.get(key) || {
      origin_owner_id: plot.origin_owner_id,
      origin_owner_username: plot.origin_owner_username,
      origin_owner_key: plot.origin_owner_key,
      plot_count: 0,
      active_plot_count: 0,
      harvestable_plot_count: 0,
      waterable_plot_count: 0,
      source_plot_ids: [],
      crop_ids: [],
      return_policy: '按 origin_owner_id 归还原田区；第一版只生成预览，不写回双方个人农田。',
      manual_return_required: true,
    };
    current.plot_count += 1;
    const state = plot.plot_state?.state || 'wasteland';
    if (state !== 'wasteland') current.active_plot_count += 1;
    if (state === 'harvestable') current.harvestable_plot_count += 1;
    if (['planted', 'growing'].includes(state) && plot.plot_state?.watered !== true) current.waterable_plot_count += 1;
    if (current.source_plot_ids.length < 24) current.source_plot_ids.push(plot.source_plot_id);
    if (plot.plot_state?.crop_id && !current.crop_ids.includes(plot.plot_state.crop_id)) {
      current.crop_ids.push(plot.plot_state.crop_id);
    }
    groups.set(key, current);
  }
  const stateCounts = countPlotStates(layout.plots);
  const plotReturnManifest = buildPlotReturnManifest(layout.plots);
  return {
    plots_by_origin_owner: [...groups.values()].slice(0, 80),
    plot_return_manifest: plotReturnManifest,
    plot_return_manifest_hash: hashPlotReturnManifest(plotReturnManifest),
    plot_return_summary: {
      total_plots: stateCounts.total,
      active_plots: stateCounts.active,
      harvestable_plots: stateCounts.harvestable,
      waterable_plots: stateCounts.waterable,
      origin_owner_count: groups.size,
      manifest_plot_count: plotReturnManifest.length,
      manifest_complete: plotReturnManifest.length === stateCounts.total,
      arrangement: 'side_by_side',
      readonly: true,
      writes_enabled: false,
      included_sources: ['farm.plots'],
      deferred_sources: ['farm.greenhousePlots', 'farm.fruitTrees', 'animal', 'warehouse', 'decoration'],
    },
    unavailable_plot_sources: farmSnapshots
      .filter(snapshot => snapshot.available !== true)
      .map(snapshot => ({
        username: snapshot.member.username,
        username_key: snapshot.member.username_key,
        display_name: snapshot.member.display_name,
        reason: snapshot.unavailable_reason || '成员农田暂不可读',
      })),
  };
}

function buildPlotReturnManifest(plots = []) {
  return (Array.isArray(plots) ? plots : [])
    .map(plot => ({
      manifest_id: `${plot.origin_owner_key || plot.origin_owner_username}:field:${plot.source_plot_id}`,
      source_area: plot.source_area || 'field',
      source_plot_id: normalizePlotId(plot.source_plot_id, 0),
      origin_owner_id: sanitizeText(plot.origin_owner_id, 80),
      origin_save_id: normalizeSaveId(plot.origin_save_id),
      origin_owner_username: normalizeUsername(plot.origin_owner_username),
      origin_owner_key: normalizeUsernameKey(plot.origin_owner_key || plot.origin_owner_username),
      return_target_username: normalizeUsername(plot.origin_owner_username),
      return_target_save_id: normalizeSaveId(plot.origin_save_id),
      shared_map_plot_id: sanitizeText(plot.id, 120),
      shared_map_row: Math.max(0, Math.floor(Number(plot.row) || 0)),
      shared_map_col: Math.max(0, Math.floor(Number(plot.col) || 0)),
      local_row: Math.max(0, Math.floor(Number(plot.local_row) || 0)),
      local_col: Math.max(0, Math.floor(Number(plot.local_col) || 0)),
      plot_state_snapshot: summarizeFarmPlot(plot.plot_state || {}),
      return_policy: 'restore_to_origin_owner_source_plot',
      execution_status: 'preview_only',
    }))
    .filter(entry => entry.origin_owner_username && entry.origin_owner_id && Number.isInteger(entry.source_plot_id))
    .sort((left, right) => {
      const ownerCompare = left.origin_owner_key.localeCompare(right.origin_owner_key);
      return ownerCompare !== 0 ? ownerCompare : left.source_plot_id - right.source_plot_id;
    })
    .slice(0, 320);
}

function hashPlotReturnManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    manifest_id: entry.manifest_id,
    source_area: entry.source_area,
    source_plot_id: entry.source_plot_id,
    origin_owner_id: entry.origin_owner_id,
    return_target_username: entry.return_target_username,
    return_target_save_id: entry.return_target_save_id,
    plot_state_snapshot: entry.plot_state_snapshot,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(stableRows)).digest('hex');
}

function buildSeparationAssetReturnLedger(preview = {}, actorMember = {}, payload = {}) {
  const assetReturn = preview.asset_return && typeof preview.asset_return === 'object' ? preview.asset_return : {};
  const plotManifest = Array.isArray(assetReturn.plot_return_manifest) ? assetReturn.plot_return_manifest : [];
  const plotsByOwner = Array.isArray(assetReturn.plots_by_origin_owner) ? assetReturn.plots_by_origin_owner : [];
  const warehouseReturns = Array.isArray(assetReturn.warehouse_items_by_origin_owner) ? assetReturn.warehouse_items_by_origin_owner : [];
  const fundReturns = Array.isArray(assetReturn.fund_contributions_by_origin_owner) ? assetReturn.fund_contributions_by_origin_owner : [];
  const plotReturnManifestHash = sanitizeText(assetReturn.plot_return_manifest_hash, 100) || hashPlotReturnManifest(plotManifest);
  return {
    id: makeId('separation_asset_return'),
    preview_id: preview.id,
    preview_version: preview.version,
    execution_request_id: sanitizeText(preview.confirmation_state?.execution_request?.id, 100),
    executed_by: actorMember.username,
    executed_at: nowSeconds(),
    idempotency_key: payload.idempotency_key,
    memo: payload.memo,
    status: 'asset_return_recorded',
    plot_return_manifest_hash: plotReturnManifestHash,
    plot_return_count: plotManifest.length,
    plot_returns_by_origin_owner: plotsByOwner.map(entry => ({
      origin_owner_id: sanitizeText(entry.origin_owner_id, 80),
      origin_owner_username: normalizeUsername(entry.origin_owner_username),
      origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
      plot_count: Math.max(0, Math.floor(Number(entry.plot_count) || 0)),
      source_plot_ids: Array.isArray(entry.source_plot_ids) ? entry.source_plot_ids.map(id => normalizePlotId(id, 0)).slice(0, 80) : [],
      return_status: 'recorded_waiting_personal_save_write',
    })),
    warehouse_returns_by_origin_owner: warehouseReturns.map(entry => ({
      origin_owner_id: sanitizeText(entry.origin_owner_id, 80),
      origin_owner_username: normalizeUsername(entry.origin_owner_username),
      origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
      item_id: sanitizeText(entry.item_id, 80),
      quantity: Math.max(0, Math.floor(Number(entry.quantity) || 0)),
      return_status: 'manual_personal_inventory_write_required',
    })).filter(entry => entry.origin_owner_username && entry.item_id && entry.quantity > 0),
    fund_refunds_by_origin_owner: fundReturns.map(entry => ({
      origin_owner_id: sanitizeText(entry.origin_owner_id, 80),
      origin_owner_username: normalizeUsername(entry.origin_owner_username),
      origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
      suggested_refund_amount: Math.max(0, Math.floor(Number(entry.suggested_refund_amount) || 0)),
      return_status: 'manual_personal_money_write_required',
    })).filter(entry => entry.origin_owner_username && entry.suggested_refund_amount > 0),
    personal_money_merged: false,
    personal_save_written: false,
    shared_assets_mutated: false,
    next_required_operations: [
      'write_personal_save_refunds',
      'verify_personal_save_receipts',
      'split_decorations',
      'resolve_family_story',
    ],
  };
}

function normalizeSeparationExecutionLedgerEntry(entry = {}) {
  return {
    id: sanitizeText(entry.id, 100) || makeId('separation_asset_return'),
    preview_id: sanitizeText(entry.preview_id, 100),
    preview_version: Math.max(1, Math.floor(Number(entry.preview_version) || SEPARATION_PREVIEW_VERSION)),
    execution_request_id: sanitizeText(entry.execution_request_id, 100),
    executed_by: normalizeUsername(entry.executed_by),
    executed_at: Math.max(0, Math.floor(Number(entry.executed_at) || 0)),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    memo: sanitizeText(entry.memo, 160),
    status: ['asset_return_recorded', 'personal_save_written', 'compensated', 'reverted'].includes(entry.status)
      ? entry.status
      : 'asset_return_recorded',
    plot_return_manifest_hash: sanitizeText(entry.plot_return_manifest_hash, 100),
    plot_return_count: Math.max(0, Math.floor(Number(entry.plot_return_count) || 0)),
    plot_returns_by_origin_owner: Array.isArray(entry.plot_returns_by_origin_owner)
      ? entry.plot_returns_by_origin_owner.map(item => ({
          origin_owner_id: sanitizeText(item.origin_owner_id, 80),
          origin_owner_username: normalizeUsername(item.origin_owner_username),
          origin_owner_key: normalizeUsernameKey(item.origin_owner_key || item.origin_owner_username),
          plot_count: Math.max(0, Math.floor(Number(item.plot_count) || 0)),
          source_plot_ids: Array.isArray(item.source_plot_ids) ? item.source_plot_ids.map(id => normalizePlotId(id, 0)).slice(0, 80) : [],
          return_status: sanitizeText(item.return_status, 80) || 'recorded_waiting_personal_save_write',
        })).filter(item => item.origin_owner_username && item.plot_count > 0).slice(0, 80)
      : [],
    warehouse_returns_by_origin_owner: Array.isArray(entry.warehouse_returns_by_origin_owner)
      ? entry.warehouse_returns_by_origin_owner.map(item => ({
          origin_owner_id: sanitizeText(item.origin_owner_id, 80),
          origin_owner_username: normalizeUsername(item.origin_owner_username),
          origin_owner_key: normalizeUsernameKey(item.origin_owner_key || item.origin_owner_username),
          item_id: normalizeWarehouseItemId(item.item_id),
          quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
          return_status: sanitizeText(item.return_status, 80) || 'manual_personal_inventory_write_required',
        })).filter(item => item.origin_owner_username && item.item_id && item.quantity > 0).slice(0, 120)
      : [],
    fund_refunds_by_origin_owner: Array.isArray(entry.fund_refunds_by_origin_owner)
      ? entry.fund_refunds_by_origin_owner.map(item => ({
          origin_owner_id: sanitizeText(item.origin_owner_id, 80),
          origin_owner_username: normalizeUsername(item.origin_owner_username),
          origin_owner_key: normalizeUsernameKey(item.origin_owner_key || item.origin_owner_username),
          suggested_refund_amount: Math.max(0, Math.floor(Number(item.suggested_refund_amount) || 0)),
          return_status: sanitizeText(item.return_status, 80) || 'manual_personal_money_write_required',
        })).filter(item => item.origin_owner_username && item.suggested_refund_amount > 0).slice(0, 80)
      : [],
    personal_money_merged: entry.personal_money_merged === true,
    personal_save_written: entry.personal_save_written === true,
    shared_assets_mutated: entry.shared_assets_mutated === true,
    next_required_operations: Array.isArray(entry.next_required_operations)
      ? entry.next_required_operations.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 12)
      : ['write_personal_save_refunds', 'verify_personal_save_receipts'],
  };
}

function buildSeparationSafetyChecks({ plotReturnPreview, warehouseReturns, fundReturns, fundBalance }) {
  const totalSuggestedFundRefund = fundReturns.reduce((sum, entry) => sum + entry.suggested_refund_amount, 0);
  return [
    {
      id: 'preview_only',
      passed: true,
      detail: '本次只生成分居预览，不写回个人存档、不扣物、不转账。',
    },
    {
      id: 'personal_money_preserved',
      passed: true,
      detail: '个人铜币从未合并，预览只读取共同基金 ledger。',
    },
    {
      id: 'plot_origin_traceable',
      passed: plotReturnPreview.plot_return_summary.total_plots === 0
        || plotReturnPreview.plot_return_summary.origin_owner_count > 0,
      detail: '农田按 origin_owner_id / save_id 归属预览拆回。',
    },
    {
      id: 'plot_return_manifest_complete',
      passed: plotReturnPreview.plot_return_summary.total_plots === plotReturnPreview.plot_return_manifest.length
        && plotReturnPreview.plot_return_manifest.every(entry => entry.origin_owner_id && entry.return_target_username && Number.isInteger(entry.source_plot_id)),
      detail: '每块来源田区都有可校验返还清单、原存档目标和地块状态快照。',
    },
    {
      id: 'warehouse_origin_traceable',
      passed: warehouseReturns.every(entry => entry.origin_owner_id || entry.origin_owner_key),
      detail: '共同仓库按放入流水归属预览拆回。',
    },
    {
      id: 'fund_preview_balanced',
      passed: totalSuggestedFundRefund === fundBalance,
      detail: '共同基金余额按注资比例生成建议返还额。',
    },
  ];
}

function buildSeparationCompensationPlan({ plotReturnPreview, warehouseReturns, fundReturns, contract }) {
  const plan = [];
  if (plotReturnPreview.plot_return_summary.total_plots > 0) {
    plan.push({
      id: 'plots_return_by_origin',
      target: 'farm.plots',
      action: 'return_to_origin_owner',
      status: 'preview_only',
      detail: '按来源田区归还；无法读取的成员存档先进入人工复核。',
    });
  }
  if (warehouseReturns.length > 0) {
    plan.push({
      id: 'warehouse_manual_return',
      target: 'shared_warehouse',
      action: 'return_items_by_ledger',
      status: 'manual_execution_required',
      detail: '共同仓库物品按放入 ledger 返还，真实背包写回待双方确认后执行。',
    });
  }
  if (fundReturns.length > 0) {
    plan.push({
      id: 'fund_proportional_refund',
      target: 'shared_fund',
      action: 'refund_by_contribution_share',
      status: 'manual_execution_required',
      detail: '共同基金余额按注资比例预览返还；若后续出现经营收入或消费差额，需要双方确认补偿。',
    });
  }
  if (contract.separation_policy?.keep_memorial !== false) {
    plan.push({
      id: 'relationship_memorial',
      target: 'relationship_memory',
      action: 'keep_memorial_record',
      status: 'deferred',
      detail: '保留关系回忆、称号或纪念物的剧情规则待后续接入。',
    });
  }
  return plan;
}

function buildRelationOptions() {
  return Object.values(RELATION_TYPE_DEFS).map(def => ({
    id: def.id,
    label: def.label,
    title: def.title,
    min_members: def.min_members,
    max_members: def.max_members,
    permission_template: def.permission_template,
    romance_only: def.romance_only,
    family_role_management: isFamilyRoleContractType(def.id),
  }));
}

async function resolveMemberFromUsername(username, role, status, createdAt) {
  const normalized = normalizeUsername(username);
  if (!normalized) throw createError('请先指定同居成员');
  const user = await db.getUser(normalized);
  if (!user) throw createError(`目标玩家不存在：${normalized}`, 404);
  return normalizeMember({
    username: user.username,
    display_name: user.display_name || user.username,
    role,
    status,
    invited_at: createdAt,
    accepted_at: status === 'accepted' ? createdAt : 0,
  });
}

function collectTargetUsernames(payload = {}) {
  const values = [];
  if (Array.isArray(payload.target_usernames)) values.push(...payload.target_usernames);
  if (Array.isArray(payload.member_usernames)) values.push(...payload.member_usernames);
  if (payload.target_username) values.push(payload.target_username);
  if (payload.username) values.push(payload.username);
  return [...new Set(values.map(normalizeUsername).filter(Boolean))];
}

async function listCohabitationContracts(username) {
  const actor = normalizeUsername(username);
  if (!actor) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contracts = store.contracts
    .filter(contract => contractBelongsToUser(contract, actor))
    .sort((left, right) => right.updated_at - left.updated_at)
    .map(toPublicContract);
  return {
    relation_options: buildRelationOptions(),
    contracts,
    summary: {
      total: contracts.length,
      pending: contracts.filter(contract => contract.status === 'pending_acceptance').length,
      active: contracts.filter(contract => contract.status === 'active').length,
      separation_previews: contracts.reduce((sum, contract) => sum + (contract.separation_previews?.length || 0), 0),
    },
  };
}

async function getCohabitationSharedMap(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (contract.status !== 'active') throw createError('只有已生效契约可以查看共同农田地图', 409);

  const farmSnapshots = contract.members.map(readMemberFarmSnapshot);
  const layout = buildSharedFarmPlots(contract, farmSnapshots);
  const stateCounts = countPlotStates(layout.plots);
  const sharedMap = {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: true,
    writes_enabled: false,
    generated_at: nowSeconds(),
    revision: Math.max(contract.updated_at || 0, ...farmSnapshots.map(snapshot => Number(snapshot.save_revision) || 0)),
    layout: {
      columns: layout.columns,
      rows: layout.rows,
      regions: layout.regions,
      arrangement: layout.arrangement,
      strategy: layout.strategy,
      stitch_axis: layout.stitch_axis,
      summary: buildSharedMapLayoutSummary(contract, farmSnapshots, layout),
    },
    members: farmSnapshots.map(snapshot => ({
      username: snapshot.member.username,
      username_key: snapshot.member.username_key,
      display_name: snapshot.member.display_name,
      role: snapshot.member.role,
      manor_role: normalizeFamilyManorRole(snapshot.member.manor_role, contract.type, snapshot.member.role),
      manor_role_label: isFamilyRoleContractType(contract.type)
        ? getFamilyManorRoleDef(normalizeFamilyManorRole(snapshot.member.manor_role, contract.type, snapshot.member.role)).label
        : '',
      status: snapshot.member.status,
      available: snapshot.available,
      unavailable_reason: snapshot.unavailable_reason,
      save_slot: snapshot.save_slot,
      save_revision: snapshot.save_revision,
      save_id: snapshot.save_id,
      farm_size: snapshot.farm_size,
      field_plot_count: Array.isArray(snapshot.plots) ? snapshot.plots.length : 0,
      greenhouse_plot_count: snapshot.greenhouse_plot_count || 0,
      fruit_tree_count: snapshot.fruit_tree_count || 0,
    })),
    plots: layout.plots,
    summary: {
      member_count: contract.members.length,
      available_member_count: farmSnapshots.filter(snapshot => snapshot.available).length,
      total_plots: stateCounts.total,
      active_plots: stateCounts.active,
      harvestable_plots: stateCounts.harvestable,
      waterable_plots: stateCounts.waterable,
      origin_owner_count: new Set(layout.plots.map(plot => plot.origin_owner_id)).size,
      layout_region_count: layout.regions.length,
      multi_member_layout: isFamilyRoleContractType(contract.type) && contract.members.length > 2,
      max_members: (RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation).max_members,
      arrangement: layout.arrangement,
      stitch_axis: layout.stitch_axis,
      personal_money_merged: false,
      origin_trace_enabled: true,
      shared_fund_balance: contract.shared_fund.balance,
      included_sources: ['farm.plots'],
      deferred_sources: ['farm.greenhousePlots', 'farm.fruitTrees', 'animal', 'warehouse', 'decoration'],
      deferred_writes: [
        'plant',
        'water',
        'harvest',
        'shared_warehouse_auto_deposit',
        'persistent_shared_manor_map',
      ],
    },
  };

  return {
    contract: toPublicContract(contract),
    shared_map: sharedMap,
  };
}

async function getCohabitationWarehouse(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看共同仓库');
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFund(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看共同基金');
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
  };
}

async function getCohabitationPermissions(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看同居权限');
  for (const member of contract.members || []) {
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    permissions_panel: buildPermissionSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyRoles(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族庄园职位');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    role_panel: buildFamilyRoleSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyOrders(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族订单预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    family_orders_panel: buildFamilyOrderSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyReputation(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族声望预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    family_reputation_panel: buildFamilyReputationSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyBuildings(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族建筑预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyRelations(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族关系图预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    family_relations_panel: buildFamilyRelationSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyVisibility(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族关系公开设置预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    family_visibility_panel: buildFamilyVisibilitySnapshot(contract, actorUsername),
  };
}

async function getCohabitationFamilyFestivalSeats(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看家族节会席位预备面板');
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    family_festival_seats_panel: buildFamilyFestivalSeatSnapshot(contract, actorUsername),
  };
}

async function getCohabitationOfflineStatus(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看离线经营状态');
  return {
    contract: toPublicContract(contract),
    offline_status: buildOfflineOperationSnapshot(contract, actorUsername),
  };
}

async function depositCohabitationWarehouseItem(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const deposit = normalizeWarehouseDepositPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '向共同仓库放入物品');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.storage.deposit !== true) throw createError('你没有向共同仓库放入物品的权限', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const previousEntry = contract.shared_warehouse.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === deposit.idempotency_key && entry.action === 'deposit'
  );
  if (previousEntry) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      ledger_entry: previousEntry,
      idempotent: true,
    };
  }

  const context = getActiveSaveContext(
    actorUsername,
    deposit.save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法向共同仓库放入物品'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  const deduction = deductDepositableMainInventoryItem(projectedData, deposit.item_id, deposit.quantity, deposit.quality);
  if (!deduction.ok) throw createError(deduction.reason);
  const afterMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  if (afterMoney !== beforeMoney) throw createError('共同仓库放入不会处理个人铜币，已中止本次操作', 500);

  assignGameplayDataToContext(context, projectedData);
  const saveRevision = persistGameplayData(context);
  const sourceSaveId = normalizeSaveId(context.identity?.save_id);
  const sourceSaveSlot = normalizeSaveSlot(context.slot);
  const sourceOwnerId = sourceSaveId ? `save:${sourceSaveId}` : `account:${member.username_key}`;
  if (sourceSaveId) member.save_id = sourceSaveId;
  if (sourceSaveSlot !== null) member.save_slot = sourceSaveSlot;
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;

  const ledgerEntry = normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'deposit',
    item_id: deposit.item_id,
    quantity: deposit.quantity,
    quality: deposit.quality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: sourceOwnerId,
    source_owner_username: member.username,
    source_owner_display_name: member.display_name || member.username,
    source_owner_key: member.username_key,
    source_owner_manor_role: actorManorRole,
    source_owner_manor_role_label: actorManorRoleDef?.label || '',
    source_save_id: sourceSaveId,
    source_save_slot: sourceSaveSlot,
    source_save_revision: saveRevision,
    source_inventory: 'inventory.items',
    source_slots: deduction.source_slots,
    at: nowSeconds(),
    idempotency_key: deposit.idempotency_key,
    reversible: true,
    compensation_hint: '第一版仅支持放入与追溯；若误放入，需要后续取出 / 返还流程或人工按 ledger 补偿。',
    status: 'committed',
  });
  contract.shared_warehouse.ledger = [ledgerEntry, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    buildWarehouseOriginAsset(ledgerEntry),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'warehouse_deposited', actor, {
    ledger_id: ledgerEntry.id,
    item_id: ledgerEntry.item_id,
    quantity: ledgerEntry.quantity,
    quality: ledgerEntry.quality,
    source_owner_id: ledgerEntry.source_owner_id,
    source_save_id: ledgerEntry.source_save_id,
    source_save_slot: ledgerEntry.source_save_slot,
    source_inventory: ledgerEntry.source_inventory,
    save_revision: saveRevision,
    reversible: ledgerEntry.reversible,
    withdraw_enabled: false,
    sell_enabled: actorPermissions.storage.sell_items === true,
  }, deposit.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntry,
    idempotent: false,
    personal_inventory: {
      item_id: deposit.item_id,
      quality: deposit.quality,
      remaining_quantity: countDepositableMainInventoryItem(projectedData, deposit.item_id, deposit.quality),
      personal_money_merged: false,
    },
  };
}

async function withdrawCohabitationWarehouseItem(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const withdraw = normalizeWarehouseWithdrawPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '从共同仓库取出物品');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.storage.withdraw_common !== true) throw createError('你没有从共同仓库取出普通物品的权限', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const previousEntries = contract.shared_warehouse.ledger.filter(entry =>
    entry.idempotency_key && entry.idempotency_key === withdraw.idempotency_key && entry.action === 'withdraw'
  );
  if (previousEntries.length > 0) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      ledger_entry: previousEntries[0],
      ledger_entries: previousEntries,
      idempotent: true,
      personal_inventory: {
        personal_money_merged: false,
      },
    };
  }

  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    withdraw.item_id,
    withdraw.quantity,
    withdraw.quality
  );
  if (!allocationResult.ok) throw createError('共同仓库中可取出的普通物品数量不足');

  const context = getActiveSaveContext(
    actorUsername,
    withdraw.save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法从共同仓库取出物品'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  const addResult = addWithdrawnWarehouseItemToInventory(projectedData, withdraw.item_id, withdraw.quantity, withdraw.quality);
  if (!addResult.ok) throw createError('个人背包和临时背包空间不足，已中止本次共同仓库取出');
  const afterMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  if (afterMoney !== beforeMoney) throw createError('共同仓库取出不会处理个人铜币，已中止本次操作', 500);

  assignGameplayDataToContext(context, projectedData);
  const saveRevision = persistGameplayData(context);
  const targetSaveId = normalizeSaveId(context.identity?.save_id);
  const targetSaveSlot = normalizeSaveSlot(context.slot);
  const targetOwnerId = targetSaveId ? `save:${targetSaveId}` : `account:${member.username_key}`;
  if (targetSaveId) member.save_id = targetSaveId;
  if (targetSaveSlot !== null) member.save_slot = targetSaveSlot;
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const operatedAt = nowSeconds();

  const ledgerEntries = allocationResult.allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'withdraw',
    item_id: withdraw.item_id,
    quantity: allocation.quantity,
    quality: withdraw.quality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: allocation.source_owner_id,
    source_owner_username: allocation.source_owner_username,
    source_owner_display_name: allocation.source_owner_display_name,
    source_owner_key: allocation.source_owner_key,
    source_owner_manor_role: allocation.source_owner_manor_role,
    source_owner_manor_role_label: allocation.source_owner_manor_role_label,
    source_save_id: allocation.source_save_id,
    source_save_slot: allocation.source_save_slot,
    source_inventory: allocation.source_inventory || 'shared_warehouse.items',
    source_ledger_ids: allocation.source_ledger_ids,
    target_owner_id: targetOwnerId,
    target_owner_username: member.username,
    target_owner_display_name: member.display_name || member.username,
    target_owner_key: member.username_key,
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    target_save_revision: saveRevision,
    target_inventory: 'inventory.items',
    target_slots: addResult.target_slots,
    at: operatedAt,
    idempotency_key: withdraw.idempotency_key,
    reversible: true,
    compensation_hint: '普通物品取出已写个人背包落点；若误取，需要按本流水从取出者背包补回或走后续冻结 / 回滚流程。',
    status: 'committed',
  })).filter(Boolean);
  contract.shared_warehouse.ledger = [...ledgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...ledgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'warehouse_withdrawn', actor, {
    ledger_ids: ledgerEntries.map(entry => entry.id),
    item_id: withdraw.item_id,
    quantity: withdraw.quantity,
    quality: withdraw.quality,
    target_owner_id: targetOwnerId,
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    save_revision: saveRevision,
    source_owner_count: new Set(ledgerEntries.map(entry => entry.source_owner_id || entry.source_owner_key)).size,
    high_quality_withdraw_enabled: false,
    rare_withdraw_enabled: false,
    sell_enabled: actorPermissions.storage.sell_items === true,
  }, withdraw.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntries[0],
    ledger_entries: ledgerEntries,
    idempotent: false,
    personal_inventory: {
      item_id: withdraw.item_id,
      quality: withdraw.quality,
      added_quantity: withdraw.quantity,
      total_quantity: countDepositableMainInventoryItem(projectedData, withdraw.item_id, withdraw.quality),
      target_slots: addResult.target_slots,
      personal_money_merged: false,
    },
  };
}

async function sellCohabitationWarehouseItem(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const sale = normalizeWarehouseSellPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '卖出共同仓库物品');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.storage.sell_items !== true) throw createError('你没有卖出共同仓库普通物品的权限', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const previousEntries = contract.shared_warehouse.ledger.filter(entry =>
    entry.idempotency_key && entry.idempotency_key === sale.idempotency_key && entry.action === 'sell'
  );
  const previousFundEntry = contract.shared_fund.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === sale.idempotency_key && entry.action === 'warehouse_sale_income'
  ) || null;
  if (previousEntries.length > 0 || previousFundEntry) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      ledger_entry: previousEntries[0] || null,
      ledger_entries: previousEntries,
      fund_ledger_entry: previousFundEntry,
      idempotent: true,
      sale: {
        item_id: sale.item_id,
        quality: sale.quality,
        quantity: previousEntries.reduce((sum, entry) => sum + entry.quantity, 0) || sale.quantity,
        unit_price: sale.unit_price,
        total_amount: previousFundEntry?.amount || previousEntries.reduce((sum, entry) => sum + entry.total_amount, 0),
        personal_money_merged: false,
      },
    };
  }

  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    sale.item_id,
    sale.quantity,
    sale.quality
  );
  if (!allocationResult.ok) throw createError('共同仓库中可卖出的普通物品数量不足');

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  const afterBalance = beforeBalance + sale.total_amount;
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const operatedAt = nowSeconds();
  const fundLedgerId = makeId('shared_fund_ledger');
  const saleTargetRef = `shared_warehouse:sell:${sale.idempotency_key}`;

  const ledgerEntries = allocationResult.allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'sell',
    item_id: sale.item_id,
    quantity: allocation.quantity,
    quality: sale.quality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: allocation.source_owner_id,
    source_owner_username: allocation.source_owner_username,
    source_owner_display_name: allocation.source_owner_display_name,
    source_owner_key: allocation.source_owner_key,
    source_owner_manor_role: allocation.source_owner_manor_role,
    source_owner_manor_role_label: allocation.source_owner_manor_role_label,
    source_save_id: allocation.source_save_id,
    source_save_slot: allocation.source_save_slot,
    source_inventory: allocation.source_inventory || 'shared_warehouse.items',
    source_ledger_ids: allocation.source_ledger_ids,
    target_ref: saleTargetRef,
    unit_price: sale.unit_price,
    total_amount: allocation.quantity * sale.unit_price,
    fund_ledger_id: fundLedgerId,
    at: operatedAt,
    idempotency_key: sale.idempotency_key,
    reversible: true,
    compensation_hint: '普通物品卖出已扣减共同仓库并入共同基金；若误卖，需要按仓库流水和共同基金流水补偿或后续冻结 / 回滚流程处理。',
    status: 'committed',
  })).filter(Boolean);

  const fundLedgerEntry = normalizeFundLedgerEntry({
    id: fundLedgerId,
    action: 'warehouse_sale_income',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount: sale.total_amount,
    at: operatedAt,
    memo: sale.memo,
    purpose: 'warehouse_sale',
    source_owner_id: `shared_warehouse:${contract.id}`,
    source_owner_username: 'shared_warehouse',
    source_owner_display_name: '共同仓库',
    source_owner_key: 'shared_warehouse',
    target_ref: saleTargetRef,
    spend_category: 'warehouse_sale',
    spend_purpose_label: '共同仓库普通物品卖出收入',
    balance_after: afterBalance,
    idempotency_key: sale.idempotency_key,
    reversible: true,
    compensation_hint: '共同仓库普通物品卖出收入已入共同基金；若误卖，需要按仓库 sell ledger 和本基金 ledger 进行补偿或回滚。',
    status: 'committed',
  });

  contract.shared_warehouse.ledger = [...ledgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_fund.balance = afterBalance;
  contract.shared_fund.ledger = [fundLedgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...ledgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'warehouse_sold', actor, {
    ledger_ids: ledgerEntries.map(entry => entry.id),
    fund_ledger_id: fundLedgerEntry.id,
    item_id: sale.item_id,
    quantity: sale.quantity,
    quality: sale.quality,
    unit_price: sale.unit_price,
    total_amount: sale.total_amount,
    balance_before: beforeBalance,
    balance_after: afterBalance,
    source_owner_count: new Set(ledgerEntries.map(entry => entry.source_owner_id || entry.source_owner_key)).size,
    target_ref: saleTargetRef,
    personal_money_merged: false,
    reversible: true,
  }, sale.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntries[0],
    ledger_entries: ledgerEntries,
    fund_ledger_entry: fundLedgerEntry,
    idempotent: false,
    sale: {
      item_id: sale.item_id,
      quality: sale.quality,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      total_amount: sale.total_amount,
      balance_before: beforeBalance,
      balance_after: afterBalance,
      target_ref: saleTargetRef,
      personal_money_merged: false,
    },
  };
}

async function updateCohabitationPermissions(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('同居权限变更需要 idempotency_key，以防断线或重试时重复写入审计');
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const actorMember = assertActiveContractForActor(contract, actorUsername, '调整同居权限');
  if (!canManageCohabitationPermissions(actorMember)) throw createError('只有契约发起者可以调整同居权限第一版', 403);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'permissions_updated' && entry.idempotency_key === idempotencyKey
  );
  if (previousAudit) {
    return {
      contract: toPublicContract(contract),
      permissions_panel: buildPermissionSnapshot(contract, actorUsername),
      idempotent: true,
      audit_entry: previousAudit,
    };
  }

  const targetUsername = normalizeUsername(payload.target_username || payload.member_username || payload.username);
  const targetMember = getContractMember(contract, targetUsername);
  if (!targetMember) throw createError('要调整权限的成员不在这份契约中', 404);
  if (targetMember.status !== 'accepted') throw createError('只能调整已接受契约成员的权限', 409);

  const { patch } = normalizePermissionPatch(payload.permissions || payload.patch, contract.type);
  const beforePermissions = enforcePermissionSafetyRails(contract.permissions?.[targetMember.username_key], contract.type);
  const nextPermissions = applyPermissionPatch(beforePermissions, patch, contract.type);
  const changes = diffPermissionSets(beforePermissions, nextPermissions, contract.type);
  if (changes.length <= 0) throw createError('权限变更没有产生实际变化');

  contract.permissions[targetMember.username_key] = nextPermissions;
  appendAudit(contract, 'permissions_updated', actor, {
    target_username: targetMember.username,
    target_display_name: targetMember.display_name,
    changed_fields: changes,
    changed_field_count: changes.length,
    confirmations_locked: true,
    note: sanitizeText(payload.note || payload.memo, 160),
  }, idempotencyKey);
  saveContractStore(store);
  const auditEntry = contract.audit_log.find(entry => entry.idempotency_key === idempotencyKey && entry.action === 'permissions_updated');
  return {
    contract: toPublicContract(contract),
    permissions_panel: buildPermissionSnapshot(contract, actorUsername),
    changed_fields: changes,
    idempotent: false,
    audit_entry: auditEntry,
  };
}

async function updateCohabitationFamilyRole(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族庄园职位变更需要 idempotency_key，以防断线或重试时重复写入审计');
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const actorMember = assertActiveContractForActor(contract, actorUsername, '调整家族庄园职位');
  if (!isFamilyRoleContractType(contract.type)) throw createError('只有结拜庄园或合伙庄园支持家族职位第一版', 400);
  for (const member of contract.members || []) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  }
  if (!canManageFamilyRoles(actorMember, contract)) throw createError('只有家主可以调整家族庄园职位第一版', 403);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'family_role_updated' && entry.idempotency_key === idempotencyKey
  );
  if (previousAudit) {
    return {
      contract: toPublicContract(contract),
      role_panel: buildFamilyRoleSnapshot(contract, actorUsername),
      idempotent: true,
      audit_entry: previousAudit,
    };
  }

  const targetUsername = normalizeUsername(payload.target_username || payload.username);
  if (!targetUsername) throw createError('请指定要调整职位的成员');
  const targetMember = getContractMember(contract, targetUsername);
  if (!targetMember) throw createError('要调整职位的成员不在这份契约中', 404);
  if (targetMember.status !== 'accepted') throw createError('只能调整已接受契约成员的职位', 409);
  const requestedRole = sanitizeText(payload.manor_role || payload.family_role || payload.role_id, 40);
  if (!FAMILY_MANOR_ROLE_DEFS[requestedRole]) throw createError('请提交有效的家族庄园职位');
  if (requestedRole === 'family_head' && targetMember.role !== 'owner') throw createError('家主职位第一版只能保留给契约发起者', 403);
  if (targetMember.role === 'owner' && requestedRole !== 'family_head') throw createError('第一版不能移除契约发起者的家主职位', 403);

  const beforeRole = normalizeFamilyManorRole(targetMember.manor_role, contract.type, targetMember.role);
  if (beforeRole === requestedRole) throw createError('家族庄园职位没有变化');
  const beforePermissions = enforcePermissionSafetyRails(contract.permissions?.[targetMember.username_key], contract.type);
  const nextPermissions = createPermissionSetForFamilyRole(contract.type, requestedRole);
  const permissionChanges = diffPermissionSets(beforePermissions, nextPermissions, contract.type);
  targetMember.manor_role = requestedRole;
  contract.permissions[targetMember.username_key] = nextPermissions;
  appendAudit(contract, 'family_role_updated', actor, {
    target_username: targetMember.username,
    target_display_name: targetMember.display_name,
    before_role: beforeRole,
    after_role: requestedRole,
    before_role_label: getFamilyManorRoleDef(beforeRole).label,
    after_role_label: getFamilyManorRoleDef(requestedRole).label,
    changed_fields: permissionChanges,
    changed_field_count: permissionChanges.length,
    confirmations_locked: true,
    note: sanitizeText(payload.note || payload.memo, 160),
  }, idempotencyKey);
  saveContractStore(store);
  const auditEntry = contract.audit_log.find(entry => entry.idempotency_key === idempotencyKey && entry.action === 'family_role_updated');
  return {
    contract: toPublicContract(contract),
    role_panel: buildFamilyRoleSnapshot(contract, actorUsername),
    changed_fields: permissionChanges,
    idempotent: false,
    audit_entry: auditEntry,
  };
}

async function contributeCohabitationFund(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const contribution = normalizeFundContributionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '向共同基金注资');

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const previousEntry = contract.shared_fund.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === contribution.idempotency_key && entry.action === 'contribution'
  );
  if (previousEntry) {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      ledger_entry: previousEntry,
      idempotent: true,
      personal_money: {
        personal_money_merged: false,
      },
    };
  }

  const context = getActiveSaveContext(
    actorUsername,
    contribution.save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法向共同基金注资'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = getPlayerMoney(projectedData);
  if (beforeMoney < contribution.amount) throw createError('个人铜币不足，暂时无法向共同基金注资');
  projectedData.player.money = beforeMoney - contribution.amount;
  const afterMoney = getPlayerMoney(projectedData);
  if (afterMoney !== beforeMoney - contribution.amount) throw createError('个人铜币扣减校验失败，已中止本次共同基金注资', 500);

  assignGameplayDataToContext(context, projectedData);
  const saveRevision = persistGameplayData(context);
  const sourceSaveId = normalizeSaveId(context.identity?.save_id);
  const sourceSaveSlot = normalizeSaveSlot(context.slot);
  const sourceOwnerId = sourceSaveId ? `save:${sourceSaveId}` : `account:${member.username_key}`;
  if (sourceSaveId) member.save_id = sourceSaveId;
  if (sourceSaveSlot !== null) member.save_slot = sourceSaveSlot;

  const ledgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'contribution',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount: contribution.amount,
    at: nowSeconds(),
    memo: contribution.memo,
    purpose: contribution.purpose,
    source_owner_id: sourceOwnerId,
    source_owner_username: member.username,
    source_owner_display_name: member.display_name || member.username,
    source_owner_key: member.username_key,
    source_save_id: sourceSaveId,
    source_save_slot: sourceSaveSlot,
    source_save_revision: saveRevision,
    idempotency_key: contribution.idempotency_key,
    reversible: true,
    compensation_hint: '第一版仅支持注资与追溯；若误注资，需要后续返还流程或人工按 ledger 补偿。',
    status: 'committed',
  });
  contract.shared_fund.balance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0)) + contribution.amount;
  contract.shared_fund.ledger = [ledgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.fund_contributions = [
    buildFundOriginAsset(ledgerEntry),
    ...contract.origin_assets.fund_contributions,
  ].slice(0, FUND_ORIGIN_LIMIT);
  appendAudit(contract, 'fund_contributed', actor, {
    ledger_id: ledgerEntry.id,
    amount: ledgerEntry.amount,
    purpose: ledgerEntry.purpose,
    source_owner_id: ledgerEntry.source_owner_id,
    source_save_id: ledgerEntry.source_save_id,
    source_save_slot: ledgerEntry.source_save_slot,
    save_revision: saveRevision,
    reversible: ledgerEntry.reversible,
    spend_enabled: false,
    remaining_money: afterMoney,
  }, contribution.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntry,
    idempotent: false,
    personal_money: {
      remaining_money: afterMoney,
      deducted_amount: contribution.amount,
      personal_money_merged: false,
    },
  };
}

async function spendCohabitationFund(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const spend = normalizeFundSpendPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '使用共同基金');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (spend.spend_tier === 'medium') {
    if (actorPermissions.fund.spend_medium !== true) throw createError('你没有使用共同基金中额加工或建材支出的权限', 403);
  } else if (actorPermissions.fund.spend_small !== true) {
    throw createError('你没有使用共同基金小额支出的权限', 403);
  }
  if (spend.auto_pay === true && actorPermissions.fund.auto_buy_seeds_feed !== true) {
    throw createError('你没有使用共同基金自动购买种子或饲料的权限', 403);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const previousEntry = contract.shared_fund.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === spend.idempotency_key && entry.action === 'spend'
  );
  if (previousEntry) {
    const previousPurchaseResult = previousEntry.target_item_id ? {
      item_id: previousEntry.target_item_id,
      quantity: previousEntry.target_quantity,
      quality: 'normal',
      unit_price: previousEntry.target_unit_price,
      total_amount: previousEntry.amount,
      target_owner_id: previousEntry.target_owner_id,
      target_save_id: previousEntry.target_save_id,
      target_save_slot: previousEntry.target_save_slot,
      target_save_revision: previousEntry.target_save_revision,
      target_slots: previousEntry.target_slots,
      personal_money_merged: false,
    } : null;
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      ledger_entry: previousEntry,
      idempotent: true,
      shared_fund: {
        deducted_amount: previousEntry.amount,
        balance_after: previousEntry.balance_after,
        personal_money_merged: false,
        confirmation_required: previousEntry.confirmation_required === true,
      },
      purchase: previousPurchaseResult,
    };
  }

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  if (beforeBalance < spend.amount) throw createError('共同基金余额不足，暂时无法完成本次支出');
  const purchase = resolveSharedFundAutoPurchase(spend);
  let purchaseResult = null;
  let targetSaveId = 0;
  let targetSaveSlot = null;
  let targetSaveRevision = 0;
  let targetOwnerId = '';
  if (purchase) {
    const context = getActiveSaveContext(
      actorUsername,
      normalizeSaveSlot(spend.save_slot),
      '当前账号没有可用的桃源乡服务端存档，暂时无法接收共同基金购买物品'
    );
    context.username = actorUsername;
    const projectedData = JSON.parse(JSON.stringify(context.data));
    const beforeMoney = getPlayerMoney(projectedData);
    const addResult = addWithdrawnWarehouseItemToInventory(projectedData, purchase.item_id, purchase.quantity, purchase.quality);
    if (!addResult.ok) throw createError('个人背包和临时背包空间不足，已中止本次共同基金购买到账');
    const afterMoney = getPlayerMoney(projectedData);
    if (afterMoney !== beforeMoney) throw createError('共同基金购买到账不应改动个人铜币，已中止本次操作', 500);
    assignGameplayDataToContext(context, projectedData);
    targetSaveRevision = persistGameplayData(context);
    targetSaveId = normalizeSaveId(context.identity?.save_id);
    targetSaveSlot = normalizeSaveSlot(context.slot);
    targetOwnerId = targetSaveId ? `save:${targetSaveId}` : `account:${member.username_key}`;
    if (targetSaveId) member.save_id = targetSaveId;
    if (targetSaveSlot !== null) member.save_slot = targetSaveSlot;
    purchaseResult = {
      item_id: purchase.item_id,
      label: purchase.label,
      quantity: purchase.quantity,
      quality: purchase.quality,
      unit_price: purchase.unit_price,
      total_amount: purchase.total_amount,
      target_owner_id: targetOwnerId,
      target_save_id: targetSaveId,
      target_save_slot: targetSaveSlot,
      target_save_revision: targetSaveRevision,
      target_slots: addResult.target_slots,
      total_quantity: countDepositableMainInventoryItem(projectedData, purchase.item_id, purchase.quality),
      personal_money_merged: false,
    };
  }
  const afterBalance = beforeBalance - spend.amount;
  const ledgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'spend',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount: spend.amount,
    at: nowSeconds(),
    memo: spend.memo,
    purpose: spend.purpose,
    spend_purpose_label: spend.purpose_label,
    spend_category: spend.spend_category,
    spend_tier: spend.spend_tier,
    target_ref: spend.target_ref,
    target_item_id: purchase?.item_id || '',
    target_quantity: purchase?.quantity || 0,
    target_unit_price: purchase?.unit_price || 0,
    target_owner_id: targetOwnerId,
    target_owner_username: purchase ? member.username : '',
    target_owner_display_name: purchase ? (member.display_name || member.username) : '',
    target_owner_key: purchase ? member.username_key : '',
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    target_save_revision: targetSaveRevision,
    target_inventory: purchase ? 'inventory.items' : '',
    target_slots: purchaseResult?.target_slots || [],
    source_owner_id: `shared_fund:${contract.id}`,
    source_owner_username: '',
    source_owner_display_name: '共同基金',
    source_owner_key: 'shared_fund',
    balance_after: afterBalance,
    auto_pay: spend.auto_pay,
    confirmation_required: false,
    confirmation_status: 'not_required',
    idempotency_key: spend.idempotency_key,
    reversible: true,
    compensation_hint: purchase
      ? '共同基金购买已扣减余额并写入成员个人背包；若误操作，需要按基金 ledger 与目标背包落点人工补偿或后续回滚。'
      : '共同基金小额支出已扣减余额；若误操作，需要按 ledger 人工补偿或后续返还流程回滚。',
    status: 'committed',
  });
  contract.shared_fund.balance = afterBalance;
  contract.shared_fund.ledger = [ledgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  appendAudit(contract, 'fund_spent', actor, {
    ledger_id: ledgerEntry.id,
    amount: ledgerEntry.amount,
    purpose: ledgerEntry.purpose,
    purpose_label: ledgerEntry.spend_purpose_label,
    spend_category: ledgerEntry.spend_category,
    spend_tier: ledgerEntry.spend_tier,
    target_ref: ledgerEntry.target_ref,
    balance_before: beforeBalance,
    balance_after: afterBalance,
    auto_pay: ledgerEntry.auto_pay,
    confirmation_required: false,
    personal_money_merged: false,
    purchase_delivered: Boolean(purchaseResult),
    target_item_id: purchase?.item_id || '',
    target_quantity: purchase?.quantity || 0,
    target_owner_id: targetOwnerId,
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    target_slots: purchaseResult?.target_slots || [],
    reversible: ledgerEntry.reversible,
  }, spend.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntry,
    idempotent: false,
    shared_fund: {
      balance_before: beforeBalance,
      balance_after: afterBalance,
      deducted_amount: spend.amount,
      personal_money_merged: false,
      confirmation_required: false,
    },
    purchase: purchaseResult,
  };
}

function buildLargeFundSpendConfirmationState(contract, actorUsername) {
  const requiredMemberUsernames = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => member.username);
  const requesterUsername = normalizeUsername(actorUsername);
  const confirmedMemberUsernames = requiredMemberUsernames.includes(requesterUsername)
    ? [requesterUsername]
    : [];
  const pendingMemberUsernames = requiredMemberUsernames.filter(username => !confirmedMemberUsernames.includes(username));
  return {
    required_member_usernames: requiredMemberUsernames,
    confirmed_member_usernames: confirmedMemberUsernames,
    pending_member_usernames: pendingMemberUsernames,
    requester_auto_confirmed: confirmedMemberUsernames.length > 0,
    requires_all_members: true,
    can_execute_now: false,
    execution_enabled: false,
    policy: '大额建筑 / 扩建支出必须先完成全部成员确认，执行扣款另走后续专用接口。',
  };
}

function resolveFamilyBuildingLedgerTargetId(purpose, targetRef) {
  const parts = sanitizeText(targetRef, 120).split(':').map(part => sanitizeText(part, 40)).filter(Boolean);
  if (parts[0] === 'family_building' && parts[1]) return parts[1];
  if (parts[0] === 'manor_expansion' && parts[1]) return parts[1];
  return sanitizeText(purpose, 80) || 'family_building';
}

function normalizeFamilyBuildingLedger(contract) {
  contract.family_building_ledger = Array.isArray(contract.family_building_ledger)
    ? contract.family_building_ledger.map(normalizeFamilyBuildingLedgerEntry).slice(0, FAMILY_BUILDING_LEDGER_LIMIT)
    : [];
  return contract.family_building_ledger;
}

function findFamilyBuildingLedgerEntry(contract, draft = {}, fundLedgerEntry = {}) {
  const ledger = normalizeFamilyBuildingLedger(contract);
  return ledger.find(entry =>
    (draft.final_building_ledger_id && entry.id === draft.final_building_ledger_id)
    || (fundLedgerEntry.id && entry.fund_ledger_id === fundLedgerEntry.id)
    || (draft.id && entry.draft_id === draft.id && entry.action === 'fund_large_spend_executed')
  ) || null;
}

function buildFamilyBuildingLedgerEntry(contract, draft, fundLedgerEntry, actor = {}, member = {}, balanceBefore = 0, balanceAfter = 0, operatedAt = nowSeconds(), idempotencyKey = '') {
  const roleDef = getFamilyManorRoleDef(member.manor_role);
  const targetId = resolveFamilyBuildingLedgerTargetId(draft.purpose, draft.target_ref);
  return normalizeFamilyBuildingLedgerEntry({
    id: makeId('family_building_ledger'),
    contract_id: contract.id,
    action: 'fund_large_spend_executed',
    purpose: draft.purpose,
    purpose_label: draft.purpose_label,
    spend_category: draft.spend_category,
    target_ref: draft.target_ref,
    building_id: targetId,
    project_id: targetId,
    draft_id: draft.id,
    fund_ledger_id: fundLedgerEntry.id,
    actor_username: member.username || actor.username,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || member.username || actor.username,
    actor_manor_role: member.manor_role,
    actor_manor_role_label: roleDef?.label || '',
    amount: draft.amount,
    shared_fund_balance_before: balanceBefore,
    shared_fund_balance_after: balanceAfter,
    shared_fund_deducted: true,
    shared_warehouse_materials_consumed: false,
    personal_money_merged: false,
    personal_inventory_merged: false,
    real_build_applied: false,
    compensation_required: true,
    compensation_hint: '共同基金大额扣款已写入建筑流水；真实建造或扩建仍需后续专用接口落账，失败时按基金 ledger 与建筑流水补偿重放。',
    deferred_operations: ['real_build_apply', 'fund_compensation_replay'],
    at: operatedAt,
    created_at: operatedAt,
    idempotency_key: idempotencyKey,
    reversible: true,
    status: 'fund_spend_recorded',
  });
}

async function createCohabitationFundLargeSpendDraft(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const draftRequest = normalizeLargeFundSpendDraftPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '发起共同基金大额确认草案');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.fund.spend_large !== true) throw createError('你没有发起共同基金大额建筑或扩建确认草案的权限', 403);
  if (actorPermissions.confirmations.large_fund_spend_requires_both !== true) {
    throw createError('共同基金大额支出必须保持双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const existingDraft = contract.fund_large_spend_drafts.find(entry => entry.idempotency_key === draftRequest.idempotency_key);
  if (existingDraft) {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft: existingDraft,
      idempotent: true,
      shared_fund: {
        balance_before: existingDraft.balance_snapshot,
        projected_balance_after: existingDraft.projected_balance_after,
        deducted_amount: 0,
        personal_money_merged: false,
        confirmation_required: true,
        execution_enabled: false,
      },
    };
  }

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  if (beforeBalance < draftRequest.amount) throw createError('共同基金余额不足，暂时不能发起大额建筑或扩建确认草案');
  const confirmationState = buildLargeFundSpendConfirmationState(contract, actorUsername);
  if (confirmationState.required_member_usernames.length < 2) throw createError('大额共同基金支出至少需要两名已接受成员确认', 409);
  const createdAt = nowSeconds();
  const draft = normalizeFundLargeSpendDraft({
    id: makeId('fund_large_spend_draft'),
    contract_id: contract.id,
    state: 'pending_confirmation',
    requested_by: actorUsername,
    requested_by_key: member.username_key,
    amount: draftRequest.amount,
    purpose: draftRequest.purpose,
    purpose_label: draftRequest.purpose_label,
    spend_category: draftRequest.spend_category,
    target_ref: draftRequest.target_ref,
    memo: draftRequest.memo,
    balance_snapshot: beforeBalance,
    projected_balance_after: beforeBalance - draftRequest.amount,
    balance_sufficient: true,
    required_member_usernames: confirmationState.required_member_usernames,
    confirmed_member_usernames: confirmationState.confirmed_member_usernames,
    pending_member_usernames: confirmationState.pending_member_usernames,
    confirmation_state: confirmationState,
    created_at: createdAt,
    expires_at: createdAt + 72 * 60 * 60,
    idempotency_key: draftRequest.idempotency_key,
    confirmation_required: true,
    confirmation_status: 'pending',
    execution_enabled: false,
  });

  contract.fund_large_spend_drafts = [draft, ...contract.fund_large_spend_drafts].slice(0, FUND_LARGE_SPEND_DRAFT_LIMIT);
  appendAudit(contract, 'fund_large_spend_draft_created', actor, {
    draft_id: draft.id,
    amount: draft.amount,
    purpose: draft.purpose,
    purpose_label: draft.purpose_label,
    spend_category: draft.spend_category,
    target_ref: draft.target_ref,
    balance_snapshot: draft.balance_snapshot,
    projected_balance_after: draft.projected_balance_after,
    required_member_usernames: draft.required_member_usernames,
    confirmed_member_usernames: draft.confirmed_member_usernames,
    pending_member_usernames: draft.pending_member_usernames,
    confirmation_required: true,
    execution_enabled: false,
    personal_money_merged: false,
    fund_ledger_written: false,
  }, draftRequest.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    draft,
    idempotent: false,
    shared_fund: {
      balance_before: beforeBalance,
      projected_balance_after: draft.projected_balance_after,
      deducted_amount: 0,
      personal_money_merged: false,
      confirmation_required: true,
      execution_enabled: false,
    },
  };
}

async function confirmCohabitationFundLargeSpendDraft(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const confirmRequest = normalizeLargeFundSpendConfirmPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '确认共同基金大额草案');
  const normalizedDraftId = sanitizeText(draftId || payload.draft_id || payload.id, 80);
  if (!normalizedDraftId) throw createError('请指定要确认的共同基金大额草案');

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  normalizeFamilyBuildingLedger(contract);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同基金大额确认草案不存在', 404);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'fund_large_spend_draft_confirmed' && entry.idempotency_key === confirmRequest.idempotency_key
  );
  if (previousAudit) {
    const existingDraft = normalizeFundLargeSpendDraft(contract.fund_large_spend_drafts[draftIndex]);
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft: existingDraft,
      idempotent: true,
      audit_entry: previousAudit,
      shared_fund: {
        balance_before: contract.shared_fund.balance,
        projected_balance_after: Math.max(0, contract.shared_fund.balance - existingDraft.amount),
        deducted_amount: 0,
        personal_money_merged: false,
        confirmation_required: true,
        confirmation_status: existingDraft.confirmation_status,
        execution_enabled: false,
      },
    };
  }

  const draft = normalizeFundLargeSpendDraft(contract.fund_large_spend_drafts[draftIndex]);
  const now = nowSeconds();
  if (draft.expires_at > 0 && draft.expires_at <= now && draft.state === 'pending_confirmation') {
    const expiredDraft = normalizeFundLargeSpendDraft({
      ...draft,
      state: 'expired',
      confirmation_status: 'expired',
      execution_enabled: false,
    });
    contract.fund_large_spend_drafts[draftIndex] = expiredDraft;
    appendAudit(contract, 'fund_large_spend_draft_expired', actor, {
      draft_id: expiredDraft.id,
      amount: expiredDraft.amount,
      purpose: expiredDraft.purpose,
      target_ref: expiredDraft.target_ref,
      confirmation_required: true,
      execution_enabled: false,
    }, confirmRequest.idempotency_key);
    saveContractStore(store);
    throw createError('共同基金大额确认草案已过期，请重新发起草案', 409);
  }
  if (draft.state === 'expired' || draft.state === 'cancelled') {
    throw createError('该共同基金大额确认草案已结束，不能继续确认', 409);
  }
  if (!['pending_confirmation', 'ready_to_execute'].includes(draft.state)) {
    throw createError('该共同基金大额确认草案当前不能确认', 409);
  }

  const requiredKeys = new Set(draft.required_member_usernames.map(normalizeUsernameKey).filter(Boolean));
  if (!requiredKeys.has(member.username_key)) throw createError('你不是该共同基金大额确认草案的必需确认成员', 403);
  const confirmedKeys = new Set(draft.confirmed_member_usernames.map(normalizeUsernameKey).filter(Boolean));
  if (confirmedKeys.has(member.username_key)) {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft,
      idempotent: true,
      already_confirmed: true,
      shared_fund: {
        balance_before: contract.shared_fund.balance,
        projected_balance_after: Math.max(0, contract.shared_fund.balance - draft.amount),
        deducted_amount: 0,
        personal_money_merged: false,
        confirmation_required: true,
        confirmation_status: draft.confirmation_status,
        execution_enabled: false,
      },
    };
  }

  confirmedKeys.add(member.username_key);
  const confirmedMemberUsernames = draft.required_member_usernames
    .filter(username => confirmedKeys.has(normalizeUsernameKey(username)));
  const pendingMemberUsernames = draft.required_member_usernames
    .filter(username => !confirmedKeys.has(normalizeUsernameKey(username)));
  const allMembersConfirmed = pendingMemberUsernames.length === 0;
  const currentBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  const nextState = allMembersConfirmed ? 'ready_to_execute' : 'pending_confirmation';
  const nextConfirmationStatus = allMembersConfirmed ? 'confirmed' : 'pending';
  const confirmationEvent = {
    actor_username: member.username,
    actor_display_name: member.display_name || member.username,
    confirmed_at: now,
    idempotency_key: confirmRequest.idempotency_key,
    memo: confirmRequest.memo,
  };
  const nextDraft = normalizeFundLargeSpendDraft({
    ...draft,
    state: nextState,
    confirmed_member_usernames: confirmedMemberUsernames,
    pending_member_usernames: pendingMemberUsernames,
    confirmation_events: [...draft.confirmation_events, confirmationEvent],
    confirmation_state: {
      ...draft.confirmation_state,
      required_member_usernames: draft.required_member_usernames,
      confirmed_member_usernames: confirmedMemberUsernames,
      pending_member_usernames: pendingMemberUsernames,
      all_members_confirmed: allMembersConfirmed,
      ready_for_execution_request: allMembersConfirmed,
      last_confirmed_by: member.username,
      last_confirmed_at: now,
      can_execute_now: false,
      execution_enabled: false,
    },
    current_balance_snapshot: currentBalance,
    projected_current_balance_after: Math.max(0, currentBalance - draft.amount),
    balance_sufficient: currentBalance >= draft.amount,
    confirmation_status: nextConfirmationStatus,
    ready_at: allMembersConfirmed ? now : draft.ready_at,
    confirmed_at: allMembersConfirmed ? now : draft.confirmed_at,
    last_confirmed_by: member.username,
    last_confirmed_at: now,
    execution_enabled: false,
  });

  contract.fund_large_spend_drafts[draftIndex] = nextDraft;
  appendAudit(contract, 'fund_large_spend_draft_confirmed', actor, {
    draft_id: nextDraft.id,
    amount: nextDraft.amount,
    purpose: nextDraft.purpose,
    purpose_label: nextDraft.purpose_label,
    spend_category: nextDraft.spend_category,
    target_ref: nextDraft.target_ref,
    confirmation_status: nextDraft.confirmation_status,
    state: nextDraft.state,
    confirmed_member_usernames: nextDraft.confirmed_member_usernames,
    pending_member_usernames: nextDraft.pending_member_usernames,
    all_members_confirmed: allMembersConfirmed,
    current_balance_snapshot: currentBalance,
    projected_current_balance_after: nextDraft.projected_current_balance_after,
    balance_sufficient: nextDraft.balance_sufficient,
    deducted_amount: 0,
    personal_money_merged: false,
    execution_enabled: false,
    fund_ledger_written: false,
  }, confirmRequest.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    draft: nextDraft,
    idempotent: false,
    already_confirmed: false,
    shared_fund: {
      balance_before: currentBalance,
      projected_balance_after: nextDraft.projected_current_balance_after,
      deducted_amount: 0,
      personal_money_merged: false,
      confirmation_required: true,
      confirmation_status: nextDraft.confirmation_status,
      execution_enabled: false,
    },
    confirmation: {
      confirmed_by: member.username,
      confirmed_at: now,
      all_members_confirmed: allMembersConfirmed,
      pending_member_usernames: nextDraft.pending_member_usernames,
      ready_for_execution_request: allMembersConfirmed,
      execution_enabled: false,
    },
  };
}

async function executeCohabitationFundLargeSpendDraft(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const executeRequest = normalizeLargeFundSpendExecutePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '执行共同基金大额草案扣款');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.fund.spend_large !== true) throw createError('你没有执行共同基金大额建筑或扩建扣款的权限', 403);
  if (actorPermissions.confirmations.large_fund_spend_requires_both !== true) {
    throw createError('共同基金大额支出必须保持双方确认安全阀', 409);
  }

  const normalizedDraftId = sanitizeText(draftId || payload.draft_id || payload.id, 80);
  if (!normalizedDraftId) throw createError('请指定要执行扣款的共同基金大额草案');
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  normalizeFamilyBuildingLedger(contract);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同基金大额确认草案不存在', 404);
  const draft = normalizeFundLargeSpendDraft(contract.fund_large_spend_drafts[draftIndex]);

  const previousKeyEntry = (contract.shared_fund.ledger || []).find(entry =>
    entry.action === 'spend'
    && entry.spend_tier === 'large'
    && entry.idempotency_key === executeRequest.idempotency_key
  );
  if (
    previousKeyEntry
    && (
      previousKeyEntry.amount !== draft.amount
      || previousKeyEntry.purpose !== draft.purpose
      || previousKeyEntry.target_ref !== draft.target_ref
    )
  ) {
    throw createError('该共同基金大额执行幂等键已用于其他扣款目标，请更换 idempotency_key', 409);
  }
  const previousEntry = previousKeyEntry || null;
  if (previousEntry) {
    const existingDraft = normalizeFundLargeSpendDraft(contract.fund_large_spend_drafts[draftIndex]);
    const buildingLedgerEntry = findFamilyBuildingLedgerEntry(contract, existingDraft, previousEntry);
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft: existingDraft,
      ledger_entry: previousEntry,
      building_ledger_entry: buildingLedgerEntry,
      idempotent: true,
      already_executed: existingDraft.state === 'executed',
      shared_fund: {
        balance_after: contract.shared_fund.balance,
        deducted_amount: previousEntry.amount,
        personal_money_merged: false,
        confirmation_required: true,
        confirmation_status: previousEntry.confirmation_status,
        building_ledger_written: Boolean(buildingLedgerEntry),
        building_ledger_id: buildingLedgerEntry?.id || '',
      },
    };
  }

  if (draft.state === 'executed') {
    const finalEntry = (contract.shared_fund.ledger || []).find(entry => entry.id === draft.final_spend_ledger_id);
    if (!finalEntry) throw createError('该共同基金大额草案已标记执行，但缺少基金扣款流水，已中止避免重复扣款', 409);
    const buildingLedgerEntry = findFamilyBuildingLedgerEntry(contract, draft, finalEntry);
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft,
      ledger_entry: finalEntry,
      building_ledger_entry: buildingLedgerEntry,
      idempotent: true,
      already_executed: true,
      shared_fund: {
        balance_after: contract.shared_fund.balance,
        deducted_amount: finalEntry.amount,
        personal_money_merged: false,
        confirmation_required: true,
        confirmation_status: finalEntry.confirmation_status,
        building_ledger_written: Boolean(buildingLedgerEntry),
        building_ledger_id: buildingLedgerEntry?.id || '',
      },
    };
  }
  if (draft.state !== 'ready_to_execute') throw createError('该共同基金大额草案尚未完成全部成员确认，不能执行扣款', 409);
  const requiredKeys = new Set(draft.required_member_usernames.map(normalizeUsernameKey).filter(Boolean));
  const confirmedKeys = new Set(draft.confirmed_member_usernames.map(normalizeUsernameKey).filter(Boolean));
  if (draft.confirmation_status !== 'confirmed' || draft.pending_member_usernames.length > 0) {
    throw createError('共同基金大额草案确认状态不完整，不能执行扣款', 409);
  }
  for (const key of requiredKeys) {
    if (!confirmedKeys.has(key)) throw createError('共同基金大额草案仍有成员未确认，不能执行扣款', 409);
  }

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  if (beforeBalance < draft.amount) throw createError('共同基金余额不足，暂时不能执行该大额草案扣款');
  const operatedAt = nowSeconds();
  const afterBalance = beforeBalance - draft.amount;
  const ledgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'spend',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount: draft.amount,
    at: operatedAt,
    memo: executeRequest.memo || draft.memo,
    purpose: draft.purpose,
    spend_purpose_label: draft.purpose_label,
    spend_category: draft.spend_category,
    spend_tier: 'large',
    target_ref: draft.target_ref,
    source_owner_id: `shared_fund:${contract.id}`,
    source_owner_username: '',
    source_owner_display_name: '共同基金',
    source_owner_key: 'shared_fund',
    balance_after: afterBalance,
    confirmation_required: true,
    confirmation_status: 'confirmed',
    idempotency_key: executeRequest.idempotency_key,
    reversible: true,
    compensation_hint: '大额共同基金已扣款并写入建筑流水；真实建造或扩建仍需后续专用接口落账，失败时按基金 ledger 与建筑流水补偿或重放。',
    status: 'committed',
  });
  contract.shared_fund.balance = afterBalance;
  contract.shared_fund.ledger = [ledgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  let buildingLedgerEntry = findFamilyBuildingLedgerEntry(contract, draft, ledgerEntry);
  if (!buildingLedgerEntry) {
    buildingLedgerEntry = buildFamilyBuildingLedgerEntry(
      contract,
      draft,
      ledgerEntry,
      actor,
      member,
      beforeBalance,
      afterBalance,
      operatedAt,
      executeRequest.idempotency_key
    );
    contract.family_building_ledger = [buildingLedgerEntry, ...contract.family_building_ledger].slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  }
  const nextDraft = normalizeFundLargeSpendDraft({
    ...draft,
    state: 'executed',
    current_balance_snapshot: beforeBalance,
    projected_current_balance_after: afterBalance,
    balance_sufficient: true,
    confirmation_status: 'confirmed',
    confirmation_state: {
      ...draft.confirmation_state,
      required_member_usernames: draft.required_member_usernames,
      confirmed_member_usernames: draft.confirmed_member_usernames,
      pending_member_usernames: [],
      all_members_confirmed: true,
      ready_for_execution_request: false,
      executed: true,
      executed_at: operatedAt,
      executed_by: member.username,
      can_execute_now: false,
      execution_enabled: false,
      policy: '大额建筑 / 扩建支出已完成成员确认、扣减共同基金并写入建筑流水；真实建造仍待后续接入。',
    },
    executed_at: operatedAt,
    executed_by: member.username,
    execution_enabled: false,
    final_spend_ledger_id: ledgerEntry.id,
    final_building_ledger_id: buildingLedgerEntry.id,
    compensation_policy: '大额共同基金已扣款并写入建筑流水；若后续真实建造或扩建失败，按草案、基金 ledger 和建筑流水补偿或重放。',
    deferred_operations: ['real_build_apply', 'fund_compensation_replay'],
  });
  contract.fund_large_spend_drafts[draftIndex] = nextDraft;
  appendAudit(contract, 'fund_large_spend_draft_executed', actor, {
    draft_id: nextDraft.id,
    ledger_id: ledgerEntry.id,
    amount: ledgerEntry.amount,
    purpose: ledgerEntry.purpose,
    purpose_label: ledgerEntry.spend_purpose_label,
    spend_category: ledgerEntry.spend_category,
    spend_tier: ledgerEntry.spend_tier,
    target_ref: ledgerEntry.target_ref,
    balance_before: beforeBalance,
    balance_after: afterBalance,
    confirmed_member_usernames: nextDraft.confirmed_member_usernames,
    pending_member_usernames: nextDraft.pending_member_usernames,
    confirmation_required: true,
    confirmation_status: 'confirmed',
    personal_money_merged: false,
    building_ledger_written: true,
    building_ledger_id: buildingLedgerEntry.id,
    compensation_required: true,
    reversible: ledgerEntry.reversible,
  }, executeRequest.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    draft: nextDraft,
    ledger_entry: ledgerEntry,
    building_ledger_entry: buildingLedgerEntry,
    idempotent: false,
    already_executed: false,
    shared_fund: {
      balance_before: beforeBalance,
      balance_after: afterBalance,
      deducted_amount: draft.amount,
      personal_money_merged: false,
      confirmation_required: true,
      confirmation_status: 'confirmed',
      building_ledger_written: true,
      building_ledger_id: buildingLedgerEntry.id,
    },
  };
}

function findFamilyBuildingLedgerForRealBuildApply(contract, request = {}) {
  const ledger = normalizeFamilyBuildingLedger(contract);
  if (request.building_ledger_id) {
    return ledger.find(entry => entry.id === request.building_ledger_id) || null;
  }
  if (request.draft_id) {
    return ledger.find(entry => entry.draft_id === request.draft_id) || null;
  }
  if (request.fund_ledger_id) {
    return ledger.find(entry => entry.fund_ledger_id === request.fund_ledger_id) || null;
  }
  if (request.target_ref) {
    return ledger.find(entry => entry.target_ref === request.target_ref && entry.status === 'fund_spend_recorded') || null;
  }
  return null;
}

async function applyCohabitationFamilyBuildingRealBuild(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const applyRequest = normalizeFamilyBuildingRealBuildApplyPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '落账家族建筑');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实落账只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const canApplyRealBuild = actorPermissions.fund.spend_large === true
    || actorPermissions.construction.buy_furniture === true
    || ['family_head', 'workshop_keeper', 'treasurer'].includes(normalizeFamilyManorRole(member.manor_role, contract.type, member.role));
  if (!canApplyRealBuild) throw createError('你没有落账家族建筑的权限', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const previousApplyEntry = normalizeFamilyBuildingLedger(contract).find(entry => entry.apply_idempotency_key === applyRequest.idempotency_key);
  if (previousApplyEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, applyRequest);
    if (requestedEntry && requestedEntry.id !== previousApplyEntry.id) {
      throw createError('该家族建筑落账幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      building_ledger_entry: previousApplyEntry,
      idempotent: true,
      already_applied: previousApplyEntry.real_build_applied === true || previousApplyEntry.status === 'build_applied',
      shared_fund: {
        deducted_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, applyRequest);
  if (!targetEntry) throw createError('找不到可落账的家族建筑流水，请先执行已确认的大额共同基金草案', 404);
  if (targetEntry.status === 'compensated' || targetEntry.status === 'reverted') {
    throw createError('该家族建筑流水已进入补偿或回滚状态，不能真实落账', 409);
  }
  if (targetEntry.shared_fund_deducted !== true || !targetEntry.fund_ledger_id) {
    throw createError('该家族建筑流水没有已扣款共同基金凭证，不能真实落账', 409);
  }
  const fundEntry = (contract.shared_fund.ledger || []).find(entry => entry.id === targetEntry.fund_ledger_id);
  if (!fundEntry || fundEntry.action !== 'spend' || fundEntry.spend_tier !== 'large') {
    throw createError('该家族建筑流水缺少匹配的大额共同基金支出流水，不能真实落账', 409);
  }
  if (targetEntry.real_build_applied === true || targetEntry.status === 'build_applied') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_applied: true,
      shared_fund: {
        deducted_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const appliedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(member.manor_role);
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_applied: true,
    status: 'build_applied',
    apply_idempotency_key: applyRequest.idempotency_key,
    applied_at: appliedAt,
    applied_by_username: member.username,
    applied_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    actor_manor_role: member.manor_role,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    real_build_ref: `${targetEntry.purpose}:${targetEntry.building_id || targetEntry.project_id || resolveFamilyBuildingLedgerTargetId(targetEntry.purpose, targetEntry.target_ref)}`,
    compensation_hint: '家族建筑已根据共同基金大额确认完成真实落账；如后续拆除、扩建或补偿失败，需按该建筑流水和基金 ledger 回滚或重放。',
    deferred_operations: ['family_building_compensation_replay', 'family_building_rollback'],
  });
  contract.family_building_ledger = normalizeFamilyBuildingLedger(contract).map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: ['fund_compensation_replay', 'family_building_compensation_replay', 'family_building_rollback'],
      compensation_policy: '大额共同基金已扣款，家族建筑已真实落账；若后续拆除或扩建失败，按草案、基金 ledger 和建筑流水补偿或回滚。',
    });
  }
  appendAudit(contract, 'family_building_real_build_applied', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    amount: nextEntry.amount,
    shared_fund_deducted: true,
    shared_warehouse_materials_consumed: false,
    personal_money_merged: false,
    real_build_ref: nextEntry.real_build_ref,
    compensation_required: true,
  }, applyRequest.idempotency_key);
  contract.updated_at = appliedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_applied: false,
    shared_fund: {
      deducted_amount: 0,
      balance_after: contract.shared_fund.balance,
      personal_money_merged: false,
    },
  };
}

function resolveFamilyBuildingProjectDefinition(entry = {}) {
  const buildingId = sanitizeText(entry.building_id || entry.project_id || resolveFamilyBuildingLedgerTargetId(entry.purpose, entry.target_ref), 80);
  return FAMILY_BUILDING_PROJECT_DEFS.find(definition => definition.id === buildingId) || null;
}

function buildMaterialConsumptionSummary(projectDefinition, ledgerEntries) {
  return (projectDefinition?.material_plan || []).map(plan => ({
    item_id: plan.item_id,
    label: plan.label,
    quantity: plan.quantity,
    quality: 'normal',
    warehouse_ledger_ids: ledgerEntries
      .filter(entry => entry.item_id === plan.item_id)
      .map(entry => entry.id),
  }));
}

async function consumeCohabitationFamilyBuildingMaterials(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const consumeRequest = normalizeFamilyBuildingMaterialsConsumePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '消耗家族建筑共同仓库材料');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑材料消耗只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canConsumeMaterials = actorPermissions.storage.withdraw_common === true
    || actorPermissions.construction.buy_furniture === true
    || ['family_head', 'workshop_keeper', 'storage_keeper'].includes(actorManorRole);
  if (!canConsumeMaterials) throw createError('你没有消耗共同仓库建材的权限', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousMaterialEntry = familyLedger.find(entry => entry.materials_idempotency_key === consumeRequest.idempotency_key);
  if (previousMaterialEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, consumeRequest);
    if (requestedEntry && requestedEntry.id !== previousMaterialEntry.id) {
      throw createError('该家族建筑材料消耗幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    const materialLedgerEntries = contract.shared_warehouse.ledger
      .filter(entry => previousMaterialEntry.material_ledger_ids.includes(entry.id));
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: previousMaterialEntry,
      material_ledger_entries: materialLedgerEntries,
      idempotent: true,
      already_consumed: previousMaterialEntry.shared_warehouse_materials_consumed === true,
      shared_warehouse: {
        consumed_quantity: 0,
        material_count: previousMaterialEntry.material_consumptions.length,
        personal_inventory_merged: false,
      },
      shared_fund: {
        deducted_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, consumeRequest);
  if (!targetEntry) throw createError('找不到可消耗材料的家族建筑流水，请先执行已确认的大额共同基金草案', 404);
  if (targetEntry.status === 'compensated' || targetEntry.status === 'reverted') {
    throw createError('该家族建筑流水已进入补偿或回滚状态，不能消耗共同仓库材料', 409);
  }
  if (targetEntry.shared_fund_deducted !== true || !targetEntry.fund_ledger_id) {
    throw createError('该家族建筑流水没有已扣款共同基金凭证，不能消耗共同仓库材料', 409);
  }
  if (targetEntry.real_build_applied !== true && targetEntry.status !== 'build_applied') {
    throw createError('请先完成家族建筑真实落账，再消耗共同仓库材料', 409);
  }
  if (targetEntry.shared_warehouse_materials_consumed === true) {
    const materialLedgerEntries = contract.shared_warehouse.ledger
      .filter(entry => targetEntry.material_ledger_ids.includes(entry.id));
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      material_ledger_entries: materialLedgerEntries,
      idempotent: true,
      already_consumed: true,
      shared_warehouse: {
        consumed_quantity: 0,
        material_count: targetEntry.material_consumptions.length,
        personal_inventory_merged: false,
      },
      shared_fund: {
        deducted_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const projectDefinition = resolveFamilyBuildingProjectDefinition(targetEntry);
  if (!projectDefinition) throw createError('该建筑流水缺少可识别的家族建筑材料计划', 409);
  const materialAllocations = projectDefinition.material_plan.map(plan => {
    const allocationResult = buildWarehouseWithdrawalAllocations(contract.shared_warehouse, plan.item_id, plan.quantity, 'normal');
    if (!allocationResult.ok) {
      throw createError(`共同仓库中${plan.label}数量不足，暂时无法消耗家族建筑材料`);
    }
    return {
      plan,
      allocations: allocationResult.allocations,
    };
  });

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const targetRef = `family_building:${projectDefinition.id}:materials`;
  const materialLedgerEntries = materialAllocations.flatMap(({ plan, allocations }) =>
    allocations.map(allocation => normalizeWarehouseLedgerEntry({
      id: makeId('shared_warehouse_ledger'),
      action: 'consume',
      item_id: plan.item_id,
      quantity: allocation.quantity,
      quality: 'normal',
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
      actor_manor_role: actorManorRole,
      actor_manor_role_label: roleDef?.label || '',
      source_owner_id: allocation.source_owner_id,
      source_owner_username: allocation.source_owner_username,
      source_owner_display_name: allocation.source_owner_display_name,
      source_owner_key: allocation.source_owner_key,
      source_owner_manor_role: allocation.source_owner_manor_role,
      source_owner_manor_role_label: allocation.source_owner_manor_role_label,
      source_save_id: allocation.source_save_id,
      source_save_slot: allocation.source_save_slot,
      source_inventory: allocation.source_inventory || 'shared_warehouse.items',
      source_ledger_ids: allocation.source_ledger_ids,
      target_owner_id: `family_building:${targetEntry.id}`,
      target_owner_username: 'family_building',
      target_owner_display_name: projectDefinition.label,
      target_owner_key: 'family_building',
      target_inventory: 'family_building.materials',
      target_ref: targetRef,
      at: operatedAt,
      idempotency_key: consumeRequest.idempotency_key,
      reversible: true,
      compensation_hint: '家族建筑材料已从共同仓库扣减并写入建筑流水；若后续拆除、扩建或补偿失败，需按材料 ledger 与建筑流水回滚或重放。',
      status: 'committed',
    }))
  ).filter(Boolean);

  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    shared_warehouse_materials_consumed: true,
    materials_idempotency_key: consumeRequest.idempotency_key,
    materials_consumed_at: operatedAt,
    materials_consumed_by_username: member.username,
    materials_consumed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    material_ledger_ids: materialLedgerEntries.map(entry => entry.id),
    material_consumptions: buildMaterialConsumptionSummary(projectDefinition, materialLedgerEntries),
    compensation_hint: '家族建筑已完成真实落账并扣减共同仓库建材；若后续拆除、扩建或补偿失败，需按基金 ledger、材料 ledger 与建筑流水回滚或重放。',
    deferred_operations: [...new Set([
      ...(Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations.filter(item => item !== 'consume_shared_building_materials') : []),
      'family_building_compensation_replay',
      'family_building_rollback',
    ])],
  });
  contract.family_building_ledger = normalizeFamilyBuildingLedger(contract).map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: ['fund_compensation_replay', 'family_building_compensation_replay', 'family_building_rollback'],
      compensation_policy: '大额共同基金已扣款，家族建筑已真实落账并扣减共同仓库材料；若后续拆除或扩建失败，按草案、基金 ledger、材料 ledger 和建筑流水补偿或回滚。',
    });
  }
  contract.shared_warehouse.ledger = [...materialLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...materialLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'family_building_materials_consumed', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    material_ledger_ids: nextEntry.material_ledger_ids,
    material_consumptions: nextEntry.material_consumptions,
    material_count: nextEntry.material_consumptions.length,
    consumed_quantity: nextEntry.material_consumptions.reduce((sum, item) => sum + item.quantity, 0),
    shared_fund_deducted_again: false,
    personal_money_merged: false,
    personal_inventory_merged: false,
    compensation_required: true,
  }, consumeRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    material_ledger_entries: materialLedgerEntries,
    idempotent: false,
    already_consumed: false,
    shared_warehouse: {
      consumed_quantity: nextEntry.material_consumptions.reduce((sum, item) => sum + item.quantity, 0),
      material_count: nextEntry.material_consumptions.length,
      personal_inventory_merged: false,
    },
    shared_fund: {
      deducted_amount: 0,
      balance_after: contract.shared_fund.balance,
      personal_money_merged: false,
    },
  };
}

async function createCohabitationContract(payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const type = normalizeRelationType(payload.type);
  const typeDef = RELATION_TYPE_DEFS[type];
  const idempotencyKey = sanitizeText(payload.idempotency_key, 120);
  const createdAt = nowSeconds();
  const targetUsernames = collectTargetUsernames(payload).filter(username => normalizeUsernameKey(username) !== normalizeUsernameKey(actorUsername));
  const requestedMemberCount = 1 + targetUsernames.length;
  if (requestedMemberCount < typeDef.min_members || requestedMemberCount > typeDef.max_members) {
    throw createError(`${typeDef.label}需要 ${typeDef.min_members}-${typeDef.max_members} 名成员`, 400);
  }

  const creator = await resolveMemberFromUsername(actorUsername, 'owner', 'accepted', createdAt);
  const invitedMembers = [];
  for (const targetUsername of targetUsernames) {
    if (!taoyuanSocialRuntime.isFriendWith(actorUsername, targetUsername)) {
      throw createError('同居契约只能向好友发起', 403);
    }
    invitedMembers.push(await resolveMemberFromUsername(targetUsername, 'partner', 'pending', createdAt));
  }
  const members = [creator, ...invitedMembers];
  for (const member of members) {
    member.manor_role = normalizeFamilyManorRole(member.manor_role, type, member.role);
  }
  const store = loadContractStore();
  if (idempotencyKey) {
    const previous = store.contracts.find(contract =>
      contract.idempotency_key === idempotencyKey
      && contractBelongsToUser(contract, actorUsername)
      && OPEN_CONTRACT_STATUSES.has(contract.status)
    );
    if (previous) return { contract: toPublicContract(previous), idempotent: true };
  }
  const existing = findOpenContract(store, members);
  if (existing) return { contract: toPublicContract(existing), idempotent: true };

  const permissions = {};
  for (const member of members) {
    permissions[member.username_key] = isFamilyRoleContractType(type)
      ? createPermissionSetForFamilyRole(type, member.manor_role)
      : createDefaultPermissionSet(type);
  }
  const contract = normalizeContract({
    id: makeId('cohabitation_contract'),
    type,
    title: sanitizeText(payload.title, 80) || typeDef.title,
    status: 'pending_acceptance',
    members,
    shared_fund: {
      balance: 0,
      ledger: [],
    },
    shared_warehouse: {
      items: [],
      ledger: [],
    },
    origin_assets: {
      plots: [],
      warehouse_items: [],
      decorations: [],
      fund_contributions: [],
    },
    permissions,
    created_by: actorUsername,
    created_at: createdAt,
    updated_at: createdAt,
    idempotency_key: idempotencyKey,
  });
  appendAudit(contract, 'contract_created', actor, {
    type,
    member_count: members.length,
    invited_usernames: invitedMembers.map(member => member.username),
  }, idempotencyKey);
  store.contracts = [contract, ...store.contracts].slice(0, 500);
  saveContractStore(store);
  return { contract: toPublicContract(contract), idempotent: false };
}

async function acceptCohabitationContract(contractId, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!OPEN_CONTRACT_STATUSES.has(contract.status)) throw createError('这份契约已经结束', 409);
  const member = contract.members.find(entry => entry.username_key === normalizeUsernameKey(actorUsername));
  if (!member) throw createError('你不在这份契约中', 403);
  if (member.status === 'accepted' && contract.status === 'active') {
    return { contract: toPublicContract(contract), idempotent: true };
  }
  if (member.status !== 'accepted') {
    member.status = 'accepted';
    member.accepted_at = nowSeconds();
    appendAudit(contract, 'contract_accepted', actor, { member_username: member.username });
  }
  if (contract.members.every(entry => entry.status === 'accepted')) {
    contract.status = 'active';
    if (!contract.shared_manor_id) contract.shared_manor_id = makeId('shared_manor');
    if (!contract.activated_at) contract.activated_at = nowSeconds();
    contract.shared_fund.ledger = [
      {
        id: makeId('shared_fund_ledger'),
        action: 'contract_activated',
        actor_username: actorUsername,
        amount: 0,
        at: nowSeconds(),
        memo: '共同基金已建立，个人铜币不合并。',
      },
      ...(contract.shared_fund.ledger || []),
    ].slice(0, FUND_LEDGER_LIMIT);
    appendAudit(contract, 'contract_activated', actor, {
      shared_manor_id: contract.shared_manor_id,
      fund_balance: contract.shared_fund.balance,
    });
  }
  saveContractStore(store);
  return { contract: toPublicContract(contract), idempotent: false };
}

async function createSeparationPreview(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效契约可以生成分居预览', 409);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  if (idempotencyKey) {
    const existingPreview = contract.separation_previews.find(entry => entry.idempotency_key === idempotencyKey);
    if (existingPreview) {
      return { contract: toPublicContract(contract), preview: existingPreview, idempotent: true };
    }
  }
  const createdAt = nowSeconds();
  const cooldownHours = Math.max(24, Math.floor(Number(contract.separation_policy?.cooldown_hours) || 72));
  const confirmAfterAt = createdAt + cooldownHours * 60 * 60;
  const expiresAt = createdAt + (cooldownHours + 72) * 60 * 60;
  const plotReturnPreview = buildPlotReturnPreview(contract);
  const warehouseReturns = buildWarehouseReturnPreview(contract);
  const fundReturns = buildFundReturnPreview(contract);
  const totalFundContributions = fundReturns.reduce((sum, entry) => sum + entry.amount, 0);
  const totalSuggestedFundRefund = fundReturns.reduce((sum, entry) => sum + entry.suggested_refund_amount, 0);
  const requiredMemberUsernames = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => member.username);
  const preview = normalizeSeparationPreview({
    id: makeId('separation_preview'),
    version: SEPARATION_PREVIEW_VERSION,
    contract_id: contract.id,
    requested_by: actorUsername,
    created_at: createdAt,
    expires_at: expiresAt,
    confirm_after_at: confirmAfterAt,
    idempotency_key: idempotencyKey,
    summary: '当前预览已归集来源田区、共同仓库放入流水、共同基金注资比例和确认 / 补偿规则；真实返还仍需后续执行流程。',
    asset_return: {
      plots_by_origin_owner: plotReturnPreview.plots_by_origin_owner,
      plot_return_manifest: plotReturnPreview.plot_return_manifest,
      plot_return_manifest_hash: plotReturnPreview.plot_return_manifest_hash,
      plot_return_summary: plotReturnPreview.plot_return_summary,
      unavailable_plot_sources: plotReturnPreview.unavailable_plot_sources,
      warehouse_items_by_origin_owner: warehouseReturns,
      fund_contributions_by_origin_owner: fundReturns,
      fund_balance: contract.shared_fund.balance,
      fund_total_contributed: totalFundContributions,
      fund_suggested_refund_total: totalSuggestedFundRefund,
      fund_return_policy: contract.shared_fund.balance > 0 ? '按注资与经营流水拆分，缺流水时需双方确认。' : '共同基金当前为 0，不涉及返还。',
      personal_money_policy: '个人铜币从未合并，无需拆分。',
    },
    compensation_plan: buildSeparationCompensationPlan({
      plotReturnPreview,
      warehouseReturns,
      fundReturns,
      contract,
    }),
    narrative_hooks: [
      contract.type === 'marriage_home'
        ? '婚姻分居后续需要家庭剧情、孩子安排和共同基金确认。'
        : contract.type === 'lover_cohabitation'
          ? '恋人分居后续需要告别对话、搬离动画和回忆纪念。'
          : '知己或合伙拆伙后续需要道别记录或未来合作约定。',
    ],
    confirmation_state: {
      state: 'draft',
      requested_by: actorUsername,
      required_member_usernames: requiredMemberUsernames,
      confirmed_by: [],
      confirm_after_at: confirmAfterAt,
      expires_at: expiresAt,
      cooldown_hours: cooldownHours,
      can_execute_now: false,
      requires_both_confirm: true,
      execution_enabled: false,
      execution_policy: '第一版只允许生成预览；确认、冷静期结束和返还执行会走后续独立接口。',
    },
    safety_checks: buildSeparationSafetyChecks({
      plotReturnPreview,
      warehouseReturns,
      fundReturns,
      fundBalance: contract.shared_fund.balance,
    }),
    deferred_operations: [
      'execute_asset_return',
      'write_personal_save_refunds',
      'split_decorations',
      'resolve_family_story',
      'freeze_high_value_disputes',
    ],
    manual_execution_required: true,
    requires_both_confirm: true,
  });
  contract.separation_previews = [preview, ...(contract.separation_previews || [])].slice(0, 10);
  appendAudit(contract, 'separation_preview_created', actor, {
    preview_id: preview.id,
    preview_version: preview.version,
    reason: sanitizeText(payload.reason, 160),
    idempotency_key: idempotencyKey,
    plot_groups: preview.asset_return.plots_by_origin_owner.length,
    warehouse_groups: preview.asset_return.warehouse_items_by_origin_owner.length,
    fund_groups: preview.asset_return.fund_contributions_by_origin_owner.length,
    confirm_after_at: preview.confirm_after_at,
    requires_both_confirm: true,
  }, idempotencyKey);
  saveContractStore(store);
  return { contract: toPublicContract(contract), preview, idempotent: false };
}

async function confirmSeparationPreview(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const confirmRequest = normalizeSeparationPreviewConfirmPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要确认的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以确认分居预览', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以确认分居预览', 403);
  const memberKey = normalizeUsernameKey(member.username_key || member.username || actorUsername);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'separation_preview_confirmed'
    && entry.idempotency_key === confirmRequest.idempotency_key
    && entry.detail?.preview_id === normalizedPreviewId
  );
  if (previousAudit) {
    return {
      contract: toPublicContract(contract),
      preview: normalizeSeparationPreview(contract.separation_previews[previewIndex]),
      idempotent: true,
      audit_entry: previousAudit,
    };
  }

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const now = nowSeconds();
  if (preview.expires_at > 0 && preview.expires_at <= now && preview.state === 'draft') {
    const expiredPreview = normalizeSeparationPreview({
      ...preview,
      state: 'expired',
      confirmation_state: {
        ...preview.confirmation_state,
        state: 'expired',
        expired_at: now,
        can_execute_now: false,
        execution_enabled: false,
      },
    });
    contract.separation_previews[previewIndex] = expiredPreview;
    appendAudit(contract, 'separation_preview_expired', actor, {
      preview_id: expiredPreview.id,
      preview_version: expiredPreview.version,
      confirmation_required: true,
      execution_enabled: false,
    }, confirmRequest.idempotency_key);
    saveContractStore(store);
    throw createError('分居预览已过期，请重新生成预览', 409);
  }
  if (!['draft', 'confirmed'].includes(preview.state)) throw createError('该分居预览当前不能确认', 409);

  const requiredMemberUsernames = Array.isArray(preview.confirmation_state.required_member_usernames)
    && preview.confirmation_state.required_member_usernames.length > 0
    ? preview.confirmation_state.required_member_usernames.map(normalizeUsername).filter(Boolean)
    : (contract.members || []).filter(entry => entry.status === 'accepted').map(entry => normalizeUsername(entry.username)).filter(Boolean);
  const requiredKeys = new Set(requiredMemberUsernames.map(normalizeUsernameKey).filter(Boolean));
  if (!requiredKeys.has(memberKey)) throw createError('你不是该分居预览的必需确认成员', 403);

  const confirmedBy = Array.isArray(preview.confirmation_state.confirmed_by)
    ? preview.confirmation_state.confirmed_by.map(normalizeUsername).filter(Boolean)
    : [];
  const confirmedKeys = new Set(confirmedBy.map(normalizeUsernameKey).filter(Boolean));
  if (confirmedKeys.has(memberKey)) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_confirmed: true,
      confirmation: {
        confirmed_by: member.username,
        all_members_confirmed: requiredMemberUsernames.every(username => confirmedKeys.has(normalizeUsernameKey(username))),
        execution_enabled: false,
      },
    };
  }

  confirmedKeys.add(memberKey);
  const nextConfirmedBy = requiredMemberUsernames.filter(username => confirmedKeys.has(normalizeUsernameKey(username)));
  const pendingMemberUsernames = requiredMemberUsernames.filter(username => !confirmedKeys.has(normalizeUsernameKey(username)));
  const allMembersConfirmed = pendingMemberUsernames.length === 0;
  const confirmationEvent = {
    actor_username: member.username,
    actor_display_name: member.display_name || member.username,
    confirmed_at: now,
    idempotency_key: confirmRequest.idempotency_key,
    memo: confirmRequest.memo,
  };
  const confirmationEvents = Array.isArray(preview.confirmation_state.confirmation_events)
    ? preview.confirmation_state.confirmation_events
    : [];
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    state: allMembersConfirmed ? 'confirmed' : 'draft',
    confirmation_state: {
      ...preview.confirmation_state,
      state: allMembersConfirmed ? 'confirmed' : 'draft',
      required_member_usernames: requiredMemberUsernames,
      confirmed_by: nextConfirmedBy,
      pending_member_usernames: pendingMemberUsernames,
      confirmation_events: [...confirmationEvents, confirmationEvent],
      all_members_confirmed: allMembersConfirmed,
      ready_for_execution_request: allMembersConfirmed && now >= preview.confirm_after_at,
      last_confirmed_by: member.username,
      last_confirmed_at: now,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '本接口只记录成员确认；真实资产返还、个人存档写回和分居执行仍需后续独立接口。',
    },
    manual_execution_required: true,
    requires_both_confirm: true,
  });

  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_preview_confirmed', actor, {
    preview_id: nextPreview.id,
    preview_version: nextPreview.version,
    confirmed_member_usernames: nextConfirmedBy,
    pending_member_usernames: pendingMemberUsernames,
    all_members_confirmed: allMembersConfirmed,
    ready_for_execution_request: nextPreview.confirmation_state.ready_for_execution_request,
    can_execute_now: false,
    execution_enabled: false,
    personal_money_merged: false,
    asset_return_executed: false,
  }, confirmRequest.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_confirmed: false,
    confirmation: {
      confirmed_by: member.username,
      confirmed_at: now,
      all_members_confirmed: allMembersConfirmed,
      pending_member_usernames: pendingMemberUsernames,
      ready_for_execution_request: nextPreview.confirmation_state.ready_for_execution_request,
      execution_enabled: false,
    },
  };
}

async function requestSeparationExecution(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const requestPayload = normalizeSeparationExecutionRequestPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要请求执行的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以请求分居执行', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以请求分居执行', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'separation_execution_requested'
    && entry.idempotency_key === requestPayload.idempotency_key
    && entry.detail?.preview_id === normalizedPreviewId
  );
  if (previousAudit) {
    return {
      contract: toPublicContract(contract),
      preview: normalizeSeparationPreview(contract.separation_previews[previewIndex]),
      idempotent: true,
      audit_entry: previousAudit,
    };
  }

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const now = nowSeconds();
  if (preview.expires_at > 0 && preview.expires_at <= now) throw createError('分居预览已过期，请重新生成预览', 409);
  if (preview.state !== 'confirmed' || preview.confirmation_state.all_members_confirmed !== true) {
    throw createError('分居预览必须双方确认后才能请求执行', 409);
  }
  if (now < preview.confirm_after_at) throw createError('分居冷静期尚未结束，不能请求执行返还', 409);
  if (preview.confirmation_state.execution_request?.status === 'pending_manual_execution') {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_requested: true,
      execution_request: preview.confirmation_state.execution_request,
    };
  }

  const executionRequest = {
    id: makeId('separation_execution_request'),
    status: 'pending_manual_execution',
    requested_by: member.username,
    requested_at: now,
    idempotency_key: requestPayload.idempotency_key,
    memo: requestPayload.memo,
    asset_return_executed: false,
    personal_save_written: false,
    execution_enabled: false,
    next_required_operations: [
      'execute_asset_return',
      'write_personal_save_refunds',
      'split_decorations',
      'resolve_family_story',
    ],
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    confirmation_state: {
      ...preview.confirmation_state,
      can_execute_now: true,
      ready_for_execution_request: true,
      execution_request: executionRequest,
      execution_requested_at: now,
      execution_requested_by: member.username,
      execution_enabled: false,
      execution_policy: '已通过双方确认和冷静期校验；本请求只进入待人工执行状态，真实返还和个人存档写回仍需后续独立接口。',
    },
    manual_execution_required: true,
    requires_both_confirm: true,
  });

  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_execution_requested', actor, {
    preview_id: nextPreview.id,
    preview_version: nextPreview.version,
    execution_request_id: executionRequest.id,
    all_members_confirmed: true,
    cooldown_passed: true,
    can_execute_now: true,
    execution_enabled: false,
    asset_return_executed: false,
    personal_save_written: false,
    next_required_operations: executionRequest.next_required_operations,
  }, requestPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_requested: false,
    execution_request: executionRequest,
  };
}

async function executeSeparationAssetReturn(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const executePayload = normalizeSeparationAssetReturnExecutePayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要执行的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以执行分居返还记录', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以执行分居返还记录', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const previousLedger = contract.separation_execution_ledger.find(entry =>
    entry.idempotency_key === executePayload.idempotency_key
    && entry.preview_id === normalizedPreviewId
  );
  if (previousLedger) {
    return {
      contract: toPublicContract(contract),
      preview: normalizeSeparationPreview(contract.separation_previews[previewIndex]),
      idempotent: true,
      already_executed: true,
      execution_ledger: previousLedger,
    };
  }

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const now = nowSeconds();
  if (preview.expires_at > 0 && preview.expires_at <= now) throw createError('分居预览已过期，请重新生成预览', 409);
  if (preview.state !== 'confirmed' || preview.confirmation_state.all_members_confirmed !== true) {
    throw createError('分居预览必须双方确认后才能执行返还记录', 409);
  }
  if (now < preview.confirm_after_at) throw createError('分居冷静期尚未结束，不能执行返还记录', 409);

  const executionRequest = preview.confirmation_state.execution_request || {};
  if (executePayload.execution_request_id && executePayload.execution_request_id !== executionRequest.id) {
    throw createError('分居执行请求不匹配，请刷新后重试', 409);
  }
  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (executePayload.plot_return_manifest_hash && executePayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免返还错田区', 409);
  }
  if (executionRequest.status === 'asset_return_recorded') {
    const existingLedger = contract.separation_execution_ledger.find(entry => entry.id === executionRequest.execution_ledger_id)
      || contract.separation_execution_ledger.find(entry => entry.preview_id === normalizedPreviewId && entry.status === 'asset_return_recorded');
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_executed: true,
      execution_ledger: existingLedger || null,
    };
  }
  if (executionRequest.status !== 'pending_manual_execution') throw createError('请先请求分居执行，再执行返还记录', 409);

  const executionLedger = buildSeparationAssetReturnLedger(preview, member, {
    ...executePayload,
    plot_return_manifest_hash: expectedManifestHash,
  });
  const recordedManifest = manifest.map(entry => ({
    ...entry,
    execution_status: 'recorded_waiting_personal_save_write',
    execution_ledger_id: executionLedger.id,
  }));
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'asset_return_recorded',
    asset_return_executed: true,
    asset_return_recorded_at: now,
    asset_return_recorded_by: member.username,
    execution_ledger_id: executionLedger.id,
    personal_save_written: false,
    execution_enabled: false,
    next_required_operations: executionLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      plot_return_manifest: recordedManifest,
      plot_return_manifest_hash: expectedManifestHash,
      asset_return_recorded: true,
      asset_return_recorded_at: now,
      asset_return_ledger_id: executionLedger.id,
      personal_save_written: false,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      asset_return_recorded: true,
      asset_return_recorded_at: now,
      personal_save_written: false,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '已把分居返还清单固化为共同契约执行记录；个人存档写回、资金返还和剧情拆分仍需后续凭证化接口执行。',
    },
    deferred_operations: [
      'write_personal_save_refunds',
      'verify_personal_save_receipts',
      'split_decorations',
      'resolve_family_story',
    ],
    manual_execution_required: true,
    requires_both_confirm: true,
  });

  contract.separation_state = 'asset_return_recorded_waiting_personal_save_write';
  contract.separation_previews[previewIndex] = nextPreview;
  contract.separation_execution_ledger = [executionLedger, ...contract.separation_execution_ledger].slice(0, 20);
  appendAudit(contract, 'separation_asset_return_recorded', actor, {
    preview_id: nextPreview.id,
    preview_version: nextPreview.version,
    execution_request_id: executionRequest.id,
    execution_ledger_id: executionLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    plot_return_count: executionLedger.plot_return_count,
    personal_save_written: false,
    shared_assets_mutated: false,
    contract_status: contract.status,
    separation_state: contract.separation_state,
    next_required_operations: executionLedger.next_required_operations,
  }, executePayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_executed: false,
    execution_ledger: executionLedger,
  };
}

module.exports = {
  RELATION_TYPE_DEFS,
  listCohabitationContracts,
  getCohabitationSharedMap,
  getCohabitationWarehouse,
  getCohabitationFund,
  getCohabitationPermissions,
  getCohabitationFamilyRoles,
  getCohabitationFamilyOrders,
  getCohabitationFamilyReputation,
  getCohabitationFamilyBuildings,
  getCohabitationFamilyRelations,
  getCohabitationFamilyVisibility,
  getCohabitationFamilyFestivalSeats,
  getCohabitationOfflineStatus,
  depositCohabitationWarehouseItem,
  withdrawCohabitationWarehouseItem,
  sellCohabitationWarehouseItem,
  creditCohabitationOrderIncome,
  contributeCohabitationFund,
  spendCohabitationFund,
  createCohabitationFundLargeSpendDraft,
  confirmCohabitationFundLargeSpendDraft,
  executeCohabitationFundLargeSpendDraft,
  applyCohabitationFamilyBuildingRealBuild,
  consumeCohabitationFamilyBuildingMaterials,
  updateCohabitationPermissions,
  updateCohabitationFamilyRole,
  createCohabitationContract,
  acceptCohabitationContract,
  createSeparationPreview,
  confirmSeparationPreview,
  requestSeparationExecution,
  executeSeparationAssetReturn,
};
