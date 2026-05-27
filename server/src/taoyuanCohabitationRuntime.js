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
const FARM_ACTION_LEDGER_LIMIT = 160;
const SHARED_ANIMAL_LEDGER_LIMIT = 120;
const SHARED_ANIMAL_LIMIT = 80;
const COHABITATION_RECENT_ONLINE_SECONDS = 15 * 60;
const SHARED_FARM_WATER_COOP_HEALTH_BONUS = 1;
const SHARED_FARM_PLANT_FERTILIZE_COOP_QUALITY_BONUS = 1;
const SHARED_ANIMAL_CARE_COOP_MOOD_BONUS = 3;
const SHARED_ORDER_CONFIRM_COOP_EFFICIENCY_BONUS = 1;
const SHARED_DECORATION_COOP_ATMOSPHERE_BONUS = 1;
const SHARED_WORKSHOP_PROCESS_COOP_QUALITY_BONUS = 1;
const WAREHOUSE_LEDGER_LIMIT = 160;
const WAREHOUSE_ORIGIN_LIMIT = 160;
const WAREHOUSE_WITHDRAWAL_DRAFT_LIMIT = 40;
const WAREHOUSE_MAX_DEPOSIT_QUANTITY = 99;
const WAREHOUSE_MAX_WITHDRAW_QUANTITY = 99;
const WAREHOUSE_MAX_SELL_QUANTITY = 99;
const WAREHOUSE_ITEM_MAX_STACK = 999;
const WAREHOUSE_TEMP_BAG_CAPACITY = 10;
const WAREHOUSE_GOVERNANCE_WINDOW_SECONDS = 10 * 60;
const WAREHOUSE_GOVERNANCE_OUTBOUND_ACTION_LIMIT = 6;
const WAREHOUSE_GOVERNANCE_INBOUND_ACTION_LIMIT = 12;
const WAREHOUSE_GOVERNANCE_RECOVERY_LIMIT = 60;
const WAREHOUSE_QUALITIES = new Set(['normal', 'fine', 'excellent', 'supreme']);
const WAREHOUSE_QUALITY_ORDER = Object.freeze(['normal', 'fine', 'excellent', 'supreme']);
const WAREHOUSE_WITHDRAWAL_DRAFT_STATES = new Set(['pending_confirmation', 'ready_to_execute', 'executed', 'rolled_back', 'expired']);
const WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES = new Set(['pending_confirmation', 'ready_to_execute']);
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
  rare_item_purchase: {
    label: '稀有物采购',
    category: 'rare_item',
    max_amount: 30000,
  },
  limited_decoration: {
    label: '限定装饰采购',
    category: 'limited_decoration',
    max_amount: 40000,
  },
  shared_decoration_removal: {
    label: 'Shared decoration removal',
    category: 'shared_decoration_removal',
    max_amount: 35000,
  },
  family_major_event: {
    label: '孩子 / 家庭重大事件',
    category: 'family_major_event',
    max_amount: 60000,
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
const SHARED_FARM_SEED_CATALOG = Object.freeze(Object.fromEntries(
  Object.values(SHARED_FUND_AUTO_PURCHASE_CATALOG)
    .filter(item => item.category === 'seed')
    .map(item => [item.item_id, {
      seed_item_id: item.item_id,
      crop_id: item.item_id.replace(/^seed_/, ''),
      label: item.label,
    }])
));
const SHARED_ANIMAL_PRODUCT_CATALOG = Object.freeze({
  chicken: { product_id: 'egg', produce_days: 1 },
  duck: { product_id: 'duck_egg', produce_days: 2 },
  rabbit: { product_id: 'rabbit_fur', produce_days: 3 },
  goose: { product_id: 'goose_egg', produce_days: 2 },
  quail: { product_id: 'quail_egg', produce_days: 1 },
  pigeon: { product_id: 'pigeon_egg', produce_days: 2 },
  silkie: { product_id: 'silkie_egg', produce_days: 2 },
  peacock: { product_id: 'peacock_feather', produce_days: 4 },
  cow: { product_id: 'milk', produce_days: 1 },
  sheep: { product_id: 'wool', produce_days: 3 },
  goat: { product_id: 'goat_milk', produce_days: 2 },
  pig: { product_id: 'truffle', produce_days: 2 },
  buffalo: { product_id: 'buffalo_milk', produce_days: 2 },
  yak: { product_id: 'yak_milk', produce_days: 2 },
  alpaca: { product_id: 'alpaca_wool', produce_days: 3 },
  deer: { product_id: 'antler_velvet', produce_days: 5 },
  donkey: { product_id: 'donkey_milk', produce_days: 3 },
  camel: { product_id: 'camel_milk', produce_days: 2 },
  ostrich: { product_id: 'ostrich_egg', produce_days: 3 },
});
const SHARED_WORKSHOP_RECIPE_CATALOG = Object.freeze({
  shared_dried_cabbage: {
    id: 'shared_dried_cabbage',
    label: '共同晒制干菜',
    station: 'drying_rack',
    process_kind: 'processing',
    input_items: [{ item_id: 'cabbage', quantity: 1, quality: 'normal' }],
    output_item_id: 'dried_cabbage',
    output_quantity: 1,
    output_quality: 'normal',
  },
  shared_rice_flour: {
    id: 'shared_rice_flour',
    label: '共同石磨米粉',
    station: 'stone_mill',
    process_kind: 'cooking_material',
    input_items: [{ item_id: 'rice', quantity: 2, quality: 'normal' }],
    output_item_id: 'rice_flour',
    output_quantity: 1,
    output_quality: 'normal',
  },
  shared_herb_paste: {
    id: 'shared_herb_paste',
    label: '共同药碾草药膏',
    station: 'herb_grinder',
    process_kind: 'alchemy_material',
    input_items: [{ item_id: 'herb', quantity: 2, quality: 'normal' }],
    output_item_id: 'herbal_paste',
    output_quantity: 1,
    output_quality: 'normal',
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
    state: 'partial_write',
    summary: '已持久化成员田区来源与拼接边界，并开放浇水、白名单种子种植的契约地图写链；收获入仓仍由后续共同庄园写链承接。',
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

function normalizeContractFamilyState(value = {}) {
  const childCount = Math.max(0, Math.min(20, Math.floor(Number(value.child_count) || 0)));
  return {
    has_children: value.has_children === true || childCount > 0,
    child_count: childCount,
  };
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
    simultaneous_online_bonus: entry?.simultaneous_online_bonus && typeof entry.simultaneous_online_bonus === 'object'
      ? {
          applied: entry.simultaneous_online_bonus.applied === true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          recent_member_count: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.recent_member_count) || 0)),
          recent_member_usernames: Array.isArray(entry.simultaneous_online_bonus.recent_member_usernames)
            ? entry.simultaneous_online_bonus.recent_member_usernames.map(normalizeUsername).filter(Boolean).slice(0, 8)
            : [],
          assignee_username: normalizeUsername(entry.simultaneous_online_bonus.assignee_username),
          confirmer_username: normalizeUsername(entry.simultaneous_online_bonus.confirmer_username),
          receipt_id: sanitizeText(entry.simultaneous_online_bonus.receipt_id, 100),
          order_id: sanitizeText(entry.simultaneous_online_bonus.order_id, 100),
          policy: sanitizeText(entry.simultaneous_online_bonus.policy, 160),
        }
      : {
          applied: false,
          type: '',
          bonus_value: 0,
          recent_member_count: 0,
          recent_member_usernames: [],
          assignee_username: '',
          confirmer_username: '',
          receipt_id: '',
          order_id: '',
          policy: '',
        },
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

function upgradeWarehouseQuality(quality, steps = 1) {
  const normalized = normalizeQuality(quality);
  const currentIndex = WAREHOUSE_QUALITY_ORDER.indexOf(normalized);
  const stepCount = Math.max(0, Math.floor(Number(steps) || 0));
  const nextIndex = Math.min(WAREHOUSE_QUALITY_ORDER.length - 1, Math.max(0, currentIndex) + stepCount);
  return WAREHOUSE_QUALITY_ORDER[nextIndex] || normalized;
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
  const action = ['deposit', 'withdraw', 'sell', 'consume', 'compensate', 'revert', 'separation_return'].includes(entry.action) ? entry.action : 'deposit';
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
    simultaneous_online_bonus: entry.simultaneous_online_bonus && typeof entry.simultaneous_online_bonus === 'object'
      ? {
          applied: entry.simultaneous_online_bonus.applied === true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          recent_member_count: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.recent_member_count) || 0)),
          recent_member_usernames: Array.isArray(entry.simultaneous_online_bonus.recent_member_usernames)
            ? entry.simultaneous_online_bonus.recent_member_usernames.map(normalizeUsername).filter(Boolean).slice(0, 8)
            : [],
          material_actor_username: normalizeUsername(entry.simultaneous_online_bonus.material_actor_username),
          processor_username: normalizeUsername(entry.simultaneous_online_bonus.processor_username),
          recipe_id: sanitizeText(entry.simultaneous_online_bonus.recipe_id, 100),
          source_ledger_ids: Array.isArray(entry.simultaneous_online_bonus.source_ledger_ids)
            ? entry.simultaneous_online_bonus.source_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
            : [],
          output_quality_before: normalizeQuality(entry.simultaneous_online_bonus.output_quality_before),
          output_quality_after: normalizeQuality(entry.simultaneous_online_bonus.output_quality_after),
          policy: sanitizeText(entry.simultaneous_online_bonus.policy, 160),
        }
      : {
          applied: false,
          type: '',
          bonus_value: 0,
          recent_member_count: 0,
          recent_member_usernames: [],
          material_actor_username: '',
          processor_username: '',
          recipe_id: '',
          source_ledger_ids: [],
          output_quality_before: 'normal',
          output_quality_after: 'normal',
          policy: '',
        },
  };
}

function normalizeWarehouseWithdrawalDraftEvent(entry = {}) {
  const actorUsername = normalizeUsername(entry.actor_username || entry.username);
  if (!actorUsername) return null;
  return {
    actor_username: actorUsername,
    actor_display_name: sanitizeText(entry.actor_display_name || entry.display_name || actorUsername, 60),
    actor_username_key: normalizeUsernameKey(entry.actor_username_key || entry.username_key || actorUsername),
    actor_manor_role: sanitizeText(entry.actor_manor_role, 40),
    actor_manor_role_label: sanitizeText(entry.actor_manor_role_label, 40),
    confirmation_text: sanitizeText(entry.confirmation_text, 120),
    confirmed_at: Math.max(0, Math.floor(Number(entry.confirmed_at || entry.at) || 0)) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
  };
}

function normalizeWarehouseWithdrawalAllocation(entry = {}) {
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (quantity <= 0) return null;
  return {
    source_owner_id: sanitizeText(entry.source_owner_id, 100),
    source_owner_username: normalizeUsername(entry.source_owner_username),
    source_owner_display_name: sanitizeText(entry.source_owner_display_name || entry.source_owner_username, 60),
    source_owner_key: normalizeUsernameKey(entry.source_owner_key || entry.source_owner_username),
    source_owner_manor_role: sanitizeText(entry.source_owner_manor_role, 40),
    source_owner_manor_role_label: sanitizeText(entry.source_owner_manor_role_label, 40),
    source_save_id: normalizeSaveId(entry.source_save_id),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    source_inventory: sanitizeText(entry.source_inventory, 40) || 'shared_warehouse.items',
    source_ledger_ids: Array.isArray(entry.source_ledger_ids)
      ? entry.source_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
      : [],
    quantity,
  };
}

function normalizeWarehouseWithdrawalDraft(entry = {}) {
  const itemId = normalizeWarehouseItemId(entry.item_id ?? entry.itemId);
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  const quality = normalizeQuality(entry.quality);
  const requiredMemberUsernames = Array.isArray(entry.required_member_usernames)
    ? entry.required_member_usernames.map(normalizeUsername).filter(Boolean)
    : [];
  const confirmationEvents = Array.isArray(entry.confirmation_events)
    ? entry.confirmation_events.map(normalizeWarehouseWithdrawalDraftEvent).filter(Boolean).slice(-12)
    : [];
  const confirmedKeys = [...new Set(confirmationEvents.map(event => event.actor_username_key).filter(Boolean))];
  const requiredKeys = requiredMemberUsernames.map(normalizeUsernameKey).filter(Boolean);
  const pendingMemberUsernames = requiredMemberUsernames.filter(username => !confirmedKeys.includes(normalizeUsernameKey(username)));
  const lastEvent = confirmationEvents[confirmationEvents.length - 1] || null;
  const sourceAllocations = Array.isArray(entry.source_allocations)
    ? entry.source_allocations.map(normalizeWarehouseWithdrawalAllocation).filter(Boolean).slice(0, 12)
    : [];
  const state = WAREHOUSE_WITHDRAWAL_DRAFT_STATES.has(entry.state) ? entry.state : 'pending_confirmation';
  return {
    id: sanitizeText(entry.id, 100) || makeId('warehouse_withdrawal_draft'),
    state,
    item_id: itemId,
    quality,
    quantity,
    risk_level: ['high_quality', 'rare'].includes(entry.risk_level) ? entry.risk_level : getWarehouseWithdrawalRiskLevel(itemId, quality),
    requester_username: normalizeUsername(entry.requester_username || entry.actor_username),
    requester_display_name: sanitizeText(entry.requester_display_name || entry.requester_username || entry.actor_username, 60),
    requester_username_key: normalizeUsernameKey(entry.requester_username_key || entry.requester_username || entry.actor_username),
    requester_manor_role: sanitizeText(entry.requester_manor_role, 40),
    requester_manor_role_label: sanitizeText(entry.requester_manor_role_label, 40),
    target_save_slot: normalizeSaveSlot(entry.target_save_slot),
    target_save_id: normalizeSaveId(entry.target_save_id),
    required_member_usernames: requiredMemberUsernames,
    confirmation_events: confirmationEvents,
    confirmation_state: {
      required_member_usernames: requiredMemberUsernames,
      confirmed_member_usernames: confirmationEvents.map(event => event.actor_username),
      pending_member_usernames: pendingMemberUsernames,
      all_members_confirmed: requiredKeys.length > 0 && requiredKeys.every(key => confirmedKeys.includes(key)),
      last_confirmed_by: lastEvent?.actor_username || '',
      last_confirmed_at: lastEvent?.confirmed_at || 0,
    },
    source_allocations: sourceAllocations,
    frozen_quantity: Math.min(quantity, normalizePositiveInt(entry.frozen_quantity ?? quantity, quantity)),
    frozen_at: Math.max(0, Math.floor(Number(entry.frozen_at) || 0)),
    freeze_policy: sanitizeText(entry.freeze_policy, 180) || '草案确认期间锁定共同仓库高价值库存，不写个人背包；撤销草案会释放冻结数量。',
    compensation_hint: sanitizeText(entry.compensation_hint, 220) || '执行取出后若个人背包写入或审计链路异常，需按 draft、withdraw ledger 与目标背包落点人工补偿或重放。',
    rollback_plan: sanitizeText(entry.rollback_plan, 220) || '执行前可撤销草案释放冻结；执行后不自动回收个人背包，需走补偿复核。',
    created_at: Math.max(0, Math.floor(Number(entry.created_at) || 0)) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    execute_idempotency_key: sanitizeText(entry.execute_idempotency_key, 120),
    executed_at: Math.max(0, Math.floor(Number(entry.executed_at) || 0)),
    executed_by_username: normalizeUsername(entry.executed_by_username),
    warehouse_ledger_ids: Array.isArray(entry.warehouse_ledger_ids)
      ? entry.warehouse_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
      : [],
    rollback_idempotency_key: sanitizeText(entry.rollback_idempotency_key, 120),
    rolled_back_at: Math.max(0, Math.floor(Number(entry.rolled_back_at) || 0)),
    rolled_back_by_username: normalizeUsername(entry.rolled_back_by_username),
    rollback_reason: sanitizeText(entry.rollback_reason, 160),
  };
}

function normalizeWarehouseWithdrawalDrafts(value = []) {
  return Array.isArray(value)
    ? value.map(normalizeWarehouseWithdrawalDraft).filter(Boolean).slice(0, WAREHOUSE_WITHDRAWAL_DRAFT_LIMIT)
    : [];
}

function normalizeWarehouseGovernanceDirection(value = '') {
  const direction = sanitizeText(value, 40).toLowerCase();
  return ['inbound', 'outbound', 'all'].includes(direction) ? direction : 'all';
}

function normalizeWarehouseGovernanceRecovery(entry = {}) {
  const targetUsername = normalizeUsername(entry.target_username || entry.targetUsername || entry.username || entry.target_username_key);
  const targetUsernameKey = normalizeUsernameKey(entry.target_username_key || entry.target_key || targetUsername);
  if (!targetUsername || !targetUsernameKey) return null;
  const createdAt = Math.max(0, Math.floor(Number(entry.created_at || entry.at) || 0)) || nowSeconds();
  const rawWindowSeconds = Math.max(0, Math.floor(Number(entry.window_seconds) || 0));
  const windowSeconds = rawWindowSeconds > 0 ? Math.max(60, rawWindowSeconds) : WAREHOUSE_GOVERNANCE_WINDOW_SECONDS;
  const expiresAt = Math.max(0, Math.floor(Number(entry.expires_at) || 0)) || createdAt + windowSeconds;
  const inboundLedgerIds = Array.isArray(entry.inbound_ledger_ids)
    ? entry.inbound_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 20)
    : [];
  const outboundLedgerIds = Array.isArray(entry.outbound_ledger_ids)
    ? entry.outbound_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 20)
    : [];
  const approverUsername = normalizeUsername(entry.approver_username || entry.actor_username);
  return {
    id: sanitizeText(entry.id, 100) || makeId('warehouse_governance_recovery'),
    state: ['applied', 'expired', 'revoked'].includes(entry.state) ? entry.state : 'applied',
    direction: normalizeWarehouseGovernanceDirection(entry.direction),
    target_username: targetUsername,
    target_username_key: targetUsernameKey,
    target_display_name: sanitizeText(entry.target_display_name || targetUsername, 60),
    requester_username: normalizeUsername(entry.requester_username || targetUsername),
    requester_username_key: normalizeUsernameKey(entry.requester_username_key || entry.requester_username || targetUsername),
    approver_username: approverUsername,
    approver_display_name: sanitizeText(entry.approver_display_name || approverUsername, 60),
    approver_username_key: normalizeUsernameKey(entry.approver_username_key || approverUsername),
    reason: sanitizeText(entry.reason, 180),
    recovery_note: sanitizeText(entry.recovery_note || entry.note, 180),
    window_seconds: windowSeconds,
    inbound_action_count: Math.max(0, Math.floor(Number(entry.inbound_action_count) || 0)),
    inbound_quantity: Math.max(0, Math.floor(Number(entry.inbound_quantity) || 0)),
    outbound_action_count: Math.max(0, Math.floor(Number(entry.outbound_action_count) || 0)),
    outbound_quantity: Math.max(0, Math.floor(Number(entry.outbound_quantity) || 0)),
    inbound_ledger_ids: inboundLedgerIds,
    outbound_ledger_ids: outboundLedgerIds,
    created_at: createdAt,
    expires_at: expiresAt,
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
  };
}

function normalizeWarehouseGovernanceRecoveries(value = []) {
  return Array.isArray(value)
    ? value
        .map(normalizeWarehouseGovernanceRecovery)
        .filter(Boolean)
        .sort((left, right) => right.created_at - left.created_at)
        .slice(0, WAREHOUSE_GOVERNANCE_RECOVERY_LIMIT)
    : [];
}

function warehouseGovernanceRecoveryCoversDirection(recovery = {}, direction = '') {
  const normalizedDirection = normalizeWarehouseGovernanceDirection(direction);
  return recovery.direction === 'all' || recovery.direction === normalizedDirection;
}

function getActiveSharedWarehouseGovernanceRecoveries(contract = {}, actorUsernameOrKey = '', direction = '', checkedAt = nowSeconds()) {
  const actorKey = normalizeUsernameKey(actorUsernameOrKey);
  if (!actorKey) return [];
  return normalizeWarehouseGovernanceRecoveries(contract.shared_warehouse_governance_recoveries)
    .filter(recovery => recovery.state === 'applied')
    .filter(recovery => recovery.target_username_key === actorKey)
    .filter(recovery => recovery.expires_at >= checkedAt)
    .filter(recovery => !direction || warehouseGovernanceRecoveryCoversDirection(recovery, direction));
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

function getWarehouseWithdrawalRiskLevel(itemId, quality = 'normal') {
  if (isProtectedWarehouseItemId(itemId)) return 'rare';
  return normalizeQuality(quality) === 'normal' ? 'common' : 'high_quality';
}

function getWarehouseStockQuantity(warehouse = {}, itemId = '', quality = 'normal') {
  const normalizedItemId = normalizeWarehouseItemId(itemId);
  const normalizedQuality = normalizeQuality(quality);
  return (warehouse.items || [])
    .filter(item => item.item_id === normalizedItemId && item.quality === normalizedQuality)
    .reduce((sum, item) => sum + normalizePositiveInt(item.quantity, 0), 0);
}

function getActiveWarehouseWithdrawalDrafts(contract = {}, excludeDraftId = '') {
  return normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts)
    .filter(draft => WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES.has(draft.state))
    .filter(draft => !excludeDraftId || draft.id !== excludeDraftId);
}

function getWarehouseFrozenQuantity(contract = {}, itemId = '', quality = 'normal', excludeDraftId = '') {
  const normalizedItemId = normalizeWarehouseItemId(itemId);
  const normalizedQuality = normalizeQuality(quality);
  return getActiveWarehouseWithdrawalDrafts(contract, excludeDraftId)
    .filter(draft => draft.item_id === normalizedItemId && draft.quality === normalizedQuality)
    .reduce((sum, draft) => sum + normalizePositiveInt(draft.frozen_quantity || draft.quantity, 0), 0);
}

function assertWarehouseHighValueWithdrawalPermission(actorPermissions = {}, riskLevel = 'common') {
  if (riskLevel === 'rare') {
    if (actorPermissions.storage?.withdraw_rare !== true) throw createError('你没有发起稀有物取出确认的权限', 403);
    return true;
  }
  if (riskLevel === 'high_quality') {
    if (actorPermissions.storage?.withdraw_high_quality !== true) throw createError('你没有发起高品质物取出确认的权限', 403);
    return true;
  }
  throw createError('普通物品请使用普通取出流程', 400);
}

function normalizeOriginAssets(value = {}) {
  return {
    plots: Array.isArray(value.plots) ? value.plots : [],
    animals: Array.isArray(value.animals) ? value.animals : [],
    warehouse_items: Array.isArray(value.warehouse_items) ? value.warehouse_items : [],
    decorations: Array.isArray(value.decorations) ? value.decorations : [],
    fund_contributions: Array.isArray(value.fund_contributions) ? value.fund_contributions : [],
  };
}

function normalizeSharedAnimal(entry = {}) {
  const id = sanitizeText(entry.id || entry.shared_animal_id, 140);
  if (!id) return null;
  const state = summarizeAnimal(entry.animal_state || entry.state || entry);
  return {
    id,
    source_animal_id: sanitizeText(entry.source_animal_id || state.id || id, 100),
    type: sanitizeText(entry.type || state.type, 60),
    name: sanitizeText(entry.name || state.name || id, 60),
    origin_owner_id: sanitizeText(entry.origin_owner_id, 100),
    origin_save_id: normalizeSaveId(entry.origin_save_id),
    origin_owner_username: normalizeUsername(entry.origin_owner_username),
    origin_owner_display_name: sanitizeText(entry.origin_owner_display_name || entry.origin_owner_username, 60),
    origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
    origin_owner_manor_role: sanitizeText(entry.origin_owner_manor_role, 40),
    origin_owner_manor_role_label: sanitizeText(entry.origin_owner_manor_role_label, 40),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    current_keeper_username: normalizeUsername(entry.current_keeper_username),
    current_keeper_display_name: sanitizeText(entry.current_keeper_display_name || entry.current_keeper_username, 60),
    current_keeper_manor_role: sanitizeText(entry.current_keeper_manor_role, 40),
    current_keeper_manor_role_label: sanitizeText(entry.current_keeper_manor_role_label, 40),
    permission_mode: sanitizeText(entry.permission_mode, 40) || 'owner_only',
    split_rule: sanitizeText(entry.split_rule, 120) || 'return_to_origin_owner_on_separation',
    permission_restriction: sanitizeText(entry.permission_restriction, 160) || 'origin_owner_or_member_with_animal_feed_permission',
    readonly: false,
    animal_state: state,
  };
}

function normalizeSharedAnimals(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      version: 1,
      contract_id: '',
      shared_manor_id: '',
      status: 'active',
      readonly: false,
      writes_enabled: true,
      persisted: false,
      persistence_policy: 'persist_contract_animals_without_rewriting_personal_saves',
      generated_at: 0,
      persisted_at: 0,
      revision: 0,
      animals: [],
      summary: {
        animal_count: 0,
        fed_count: 0,
        petted_count: 0,
        sick_count: 0,
        feedable_count: 0,
        pettable_count: 0,
        product_ready_count: 0,
        origin_owner_count: 0,
        animal_feed_write_enabled: true,
        animal_pet_write_enabled: true,
        animal_product_collect_write_enabled: true,
        shared_warehouse_feed_consume_enabled: true,
        shared_warehouse_product_deposit_enabled: true,
        personal_save_changed: false,
        deferred_writes: [],
      },
    };
  }
  const animals = Array.isArray(value.animals)
    ? value.animals.map(normalizeSharedAnimal).filter(Boolean).slice(0, SHARED_ANIMAL_LIMIT)
    : [];
  const stateCounts = countSharedAnimalStates(animals);
  const summary = value.summary && typeof value.summary === 'object' ? value.summary : {};
  const activeDeferredWrites = Array.isArray(summary.deferred_writes)
    ? summary.deferred_writes.map(item => sanitizeText(item, 80)).filter(item =>
        item && item !== 'animal.collect_product' && item !== 'collect_product'
      )
    : [];
  return {
    version: Math.max(1, Math.floor(Number(value.version) || 1)),
    contract_id: sanitizeText(value.contract_id, 80),
    shared_manor_id: sanitizeText(value.shared_manor_id, 80),
    status: sanitizeText(value.status, 40) || 'active',
    readonly: false,
    writes_enabled: true,
    persisted: value.persisted === true,
    persistence_policy: sanitizeText(value.persistence_policy, 160) || 'persist_contract_animals_without_rewriting_personal_saves',
    generated_at: Math.max(0, Math.floor(Number(value.generated_at) || 0)),
    persisted_at: Math.max(0, Math.floor(Number(value.persisted_at) || Number(value.generated_at) || 0)),
    revision: Math.max(0, Math.floor(Number(value.revision) || 0)),
    animals,
    summary: {
      ...summary,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: Math.max(0, stateCounts.total - stateCounts.fed),
      pettable_count: Math.max(0, stateCounts.total - stateCounts.petted),
      product_ready_count: stateCounts.product_ready,
      origin_owner_count: new Set(animals.map(animal => animal.origin_owner_id).filter(Boolean)).size,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      personal_save_changed: false,
      deferred_writes: activeDeferredWrites,
    },
  };
}

function normalizeAnimalActionLedgerEntry(entry = {}) {
  const action = sanitizeText(entry.action, 40) || 'feed';
  if (!['feed', 'pet', 'collect_product'].includes(action)) return null;
  const animalId = sanitizeText(entry.animal_id || entry.shared_animal_id, 140);
  if (!animalId) return null;
  const productItemId = normalizeWarehouseItemId(entry.product_item_id || entry.output_item_id || entry.item_id);
  return {
    id: sanitizeText(entry.id, 100) || makeId('shared_animal_ledger'),
    action,
    animal_id: animalId,
    shared_animal_id: animalId,
    source_animal_id: sanitizeText(entry.source_animal_id, 100),
    actor_username: normalizeUsername(entry.actor_username),
    actor_display_name: sanitizeText(entry.actor_display_name || entry.actor_username, 60),
    actor_key: normalizeUsernameKey(entry.actor_key || entry.actor_username),
    actor_manor_role: sanitizeText(entry.actor_manor_role, 40),
    actor_manor_role_label: sanitizeText(entry.actor_manor_role_label, 40),
    feed_item_id: normalizeWarehouseItemId(entry.feed_item_id || entry.item_id),
    product_item_id: productItemId,
    product_quantity: productItemId ? normalizePositiveInt(entry.product_quantity ?? entry.output_quantity ?? entry.quantity, 0) : 0,
    product_quality: productItemId ? normalizeQuality(entry.product_quality || entry.output_quality || entry.quality || 'normal') : '',
    warehouse_ledger_ids: Array.isArray(entry.warehouse_ledger_ids)
      ? entry.warehouse_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
      : [],
    shared_warehouse_changed: entry.shared_warehouse_changed === true,
    origin_owner_id: sanitizeText(entry.origin_owner_id, 100),
    origin_owner_username: normalizeUsername(entry.origin_owner_username),
    origin_owner_display_name: sanitizeText(entry.origin_owner_display_name || entry.origin_owner_username, 60),
    origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
    origin_save_id: normalizeSaveId(entry.origin_save_id),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    before_animal_state: entry.before_animal_state && typeof entry.before_animal_state === 'object' ? entry.before_animal_state : {},
    after_animal_state: entry.after_animal_state && typeof entry.after_animal_state === 'object' ? entry.after_animal_state : {},
    simultaneous_online_bonus: entry.simultaneous_online_bonus && typeof entry.simultaneous_online_bonus === 'object'
      ? {
          applied: entry.simultaneous_online_bonus.applied === true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          recent_member_count: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.recent_member_count) || 0)),
          recent_member_usernames: Array.isArray(entry.simultaneous_online_bonus.recent_member_usernames)
            ? entry.simultaneous_online_bonus.recent_member_usernames.map(normalizeUsername).filter(Boolean).slice(0, 8)
            : [],
          feed_actor_username: normalizeUsername(entry.simultaneous_online_bonus.feed_actor_username),
          policy: sanitizeText(entry.simultaneous_online_bonus.policy, 160),
        }
      : {
          applied: false,
          type: '',
          bonus_value: 0,
          recent_member_count: 0,
          recent_member_usernames: [],
          feed_actor_username: '',
          policy: '',
        },
    permission_mode: sanitizeText(entry.permission_mode, 40) || 'owner_only',
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    at: Math.max(0, Math.floor(Number(entry.at) || Number(entry.created_at) || nowSeconds())),
    reversible: entry.reversible !== false,
    compensation_hint: sanitizeText(entry.compensation_hint, 240),
    status: ['committed', 'rolled_back', 'blocked'].includes(entry.status) ? entry.status : 'committed',
  };
}

function normalizeAnimalActionLedger(value = []) {
  return Array.isArray(value)
    ? value.map(normalizeAnimalActionLedgerEntry).filter(Boolean).slice(0, SHARED_ANIMAL_LEDGER_LIMIT)
    : [];
}

function normalizeFarmActionLedgerEntry(entry = {}) {
  const action = sanitizeText(entry.action, 40) || 'water';
  if (!['water', 'plant', 'fertilize', 'harvest', 'cure_pests', 'clear_weeds'].includes(action)) return null;
  const plotId = sanitizeText(entry.plot_id || entry.shared_plot_id, 140);
  if (!plotId) return null;
  const outputItemId = normalizeWarehouseItemId(entry.output_item_id || entry.harvest_item_id || entry.item_id);
  return {
    id: sanitizeText(entry.id, 100) || makeId('shared_farm_ledger'),
    action,
    plot_id: plotId,
    shared_plot_id: plotId,
    source_plot_id: normalizePlotId(entry.source_plot_id, 0),
    source_area: sanitizeText(entry.source_area, 40) || 'field',
    actor_username: normalizeUsername(entry.actor_username),
    actor_display_name: sanitizeText(entry.actor_display_name || entry.actor_username, 60),
    actor_key: normalizeUsernameKey(entry.actor_key || entry.actor_username),
    actor_manor_role: sanitizeText(entry.actor_manor_role, 40),
    actor_manor_role_label: sanitizeText(entry.actor_manor_role_label, 40),
    seed_item_id: normalizeWarehouseItemId(entry.seed_item_id),
    fertilizer_item_id: normalizeWarehouseItemId(entry.fertilizer_item_id || entry.fertilizerItemId),
    crop_id: sanitizeText(entry.crop_id, 80),
    output_item_id: outputItemId,
    output_quantity: normalizePositiveInt(entry.output_quantity ?? entry.harvest_quantity ?? entry.quantity, 0),
    output_quality: outputItemId ? normalizeQuality(entry.output_quality || entry.harvest_quality || entry.quality || 'normal') : '',
    warehouse_ledger_ids: Array.isArray(entry.warehouse_ledger_ids)
      ? entry.warehouse_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
      : [],
    shared_warehouse_changed: entry.shared_warehouse_changed === true,
    origin_owner_id: sanitizeText(entry.origin_owner_id, 100),
    origin_owner_username: normalizeUsername(entry.origin_owner_username),
    origin_owner_display_name: sanitizeText(entry.origin_owner_display_name || entry.origin_owner_username, 60),
    origin_owner_key: normalizeUsernameKey(entry.origin_owner_key || entry.origin_owner_username),
    origin_save_id: normalizeSaveId(entry.origin_save_id),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    before_plot_state: entry.before_plot_state && typeof entry.before_plot_state === 'object' ? entry.before_plot_state : {},
    after_plot_state: entry.after_plot_state && typeof entry.after_plot_state === 'object' ? entry.after_plot_state : {},
    simultaneous_online_bonus: entry.simultaneous_online_bonus && typeof entry.simultaneous_online_bonus === 'object'
      ? {
          applied: entry.simultaneous_online_bonus.applied === true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          recent_member_count: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.recent_member_count) || 0)),
          recent_member_usernames: Array.isArray(entry.simultaneous_online_bonus.recent_member_usernames)
            ? entry.simultaneous_online_bonus.recent_member_usernames.map(normalizeUsername).filter(Boolean).slice(0, 8)
            : [],
          plant_actor_username: normalizeUsername(entry.simultaneous_online_bonus.plant_actor_username),
          plant_ledger_id: sanitizeText(entry.simultaneous_online_bonus.plant_ledger_id, 100),
          policy: sanitizeText(entry.simultaneous_online_bonus.policy, 160),
        }
      : {
          applied: false,
          type: '',
          bonus_value: 0,
          recent_member_count: 0,
          recent_member_usernames: [],
          plant_actor_username: '',
          plant_ledger_id: '',
          policy: '',
        },
    permission_mode: sanitizeText(entry.permission_mode, 40) || 'owner_only',
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    at: Math.max(0, Math.floor(Number(entry.at) || Number(entry.created_at) || nowSeconds())),
    reversible: entry.reversible !== false,
    compensation_hint: sanitizeText(entry.compensation_hint, 240),
    status: ['committed', 'rolled_back', 'blocked'].includes(entry.status) ? entry.status : 'committed',
  };
}

function normalizeFarmActionLedger(value = []) {
  return Array.isArray(value)
    ? value.map(normalizeFarmActionLedgerEntry).filter(Boolean).slice(0, FARM_ACTION_LEDGER_LIMIT)
    : [];
}

function normalizePersistentSharedMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (
    !value.contract_id
    && !value.shared_manor_id
    && !Array.isArray(value.plots)
    && !(value.layout && typeof value.layout === 'object')
  ) {
    return null;
  }
  const plots = Array.isArray(value.plots) ? value.plots : [];
  const layout = value.layout && typeof value.layout === 'object' ? value.layout : {};
  const summary = value.summary && typeof value.summary === 'object' ? value.summary : {};
  return {
    version: Math.max(1, Math.floor(Number(value.version) || 1)),
    contract_id: sanitizeText(value.contract_id, 80),
    shared_manor_id: sanitizeText(value.shared_manor_id, 80),
    status: sanitizeText(value.status, 40) || 'active',
    readonly: false,
    writes_enabled: true,
    persisted: value.persisted === true,
    persistence_policy: sanitizeText(value.persistence_policy, 160) || 'persist_contract_map_without_rewriting_personal_saves',
    generated_at: Math.max(0, Math.floor(Number(value.generated_at) || 0)),
    persisted_at: Math.max(0, Math.floor(Number(value.persisted_at) || Number(value.generated_at) || 0)),
    revision: Math.max(0, Math.floor(Number(value.revision) || 0)),
    layout: {
      columns: Math.max(0, Math.floor(Number(layout.columns) || 0)),
      rows: Math.max(0, Math.floor(Number(layout.rows) || 0)),
      regions: Array.isArray(layout.regions) ? layout.regions : [],
      arrangement: sanitizeText(layout.arrangement, 60) || 'side_by_side',
      strategy: sanitizeText(layout.strategy, 80) || 'member_region_x_axis',
      stitch_axis: sanitizeText(layout.stitch_axis, 20) || 'x',
      summary: layout.summary && typeof layout.summary === 'object' ? layout.summary : {},
    },
    members: Array.isArray(value.members) ? value.members : [],
    plots,
    summary: {
      ...summary,
      total_plots: Math.max(0, Math.floor(Number(summary.total_plots) || plots.length)),
      persisted_shared_manor_map: value.persisted === true || summary.persisted_shared_manor_map === true,
      personal_money_merged: false,
      origin_trace_enabled: summary.origin_trace_enabled !== false,
      farm_plant_write_enabled: true,
      farm_water_write_enabled: true,
      farm_harvest_write_enabled: true,
    },
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
    cooperation_health_bonus: Math.max(0, Math.floor(Number(plot.cooperationHealthBonus ?? plot.cooperation_health_bonus) || 0)),
    cooperation_quality_bonus: Math.max(0, Math.floor(Number(plot.cooperationQualityBonus ?? plot.cooperation_quality_bonus) || 0)),
    last_cooperation_bonus_at: Math.max(0, Math.floor(Number(plot.lastCooperationBonusAt ?? plot.last_cooperation_bonus_at) || 0)),
    last_cooperation_bonus_action: sanitizeText(plot.lastCooperationBonusAction ?? plot.last_cooperation_bonus_action, 80),
    last_cooperation_bonus_members: Array.isArray(plot.lastCooperationBonusMembers ?? plot.last_cooperation_bonus_members)
      ? (plot.lastCooperationBonusMembers ?? plot.last_cooperation_bonus_members).map(normalizeUsername).filter(Boolean).slice(0, 8)
      : [],
    last_cooperation_plant_actor_username: normalizeUsername(plot.lastCooperationPlantActorUsername ?? plot.last_cooperation_plant_actor_username),
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

function summarizeAnimal(animal = {}) {
  const id = sanitizeText(animal.id ?? animal.animal_id, 100);
  const type = sanitizeText(animal.type ?? animal.animal_type, 80);
  return {
    id,
    type,
    name: sanitizeText(animal.name || type || id, 80),
    friendship: Math.max(0, Math.floor(Number(animal.friendship) || 0)),
    mood: Math.max(0, Math.floor(Number(animal.mood) || 0)),
    days_owned: Math.max(0, Math.floor(Number(animal.daysOwned ?? animal.days_owned) || 0)),
    days_since_product: Math.max(0, Math.floor(Number(animal.daysSinceProduct ?? animal.days_since_product) || 0)),
    was_fed: animal.wasFed === true || animal.was_fed === true,
    fed_with: normalizeWarehouseItemId(animal.fedWith ?? animal.fed_with),
    was_petted: animal.wasPetted === true || animal.was_petted === true,
    cooperation_mood_bonus: Math.max(0, Math.floor(Number(animal.cooperationMoodBonus ?? animal.cooperation_mood_bonus) || 0)),
    last_cooperation_bonus_at: Math.max(0, Math.floor(Number(animal.lastCooperationBonusAt ?? animal.last_cooperation_bonus_at) || 0)),
    last_cooperation_bonus_action: sanitizeText(animal.lastCooperationBonusAction ?? animal.last_cooperation_bonus_action, 80),
    last_cooperation_bonus_members: Array.isArray(animal.lastCooperationBonusMembers ?? animal.last_cooperation_bonus_members)
      ? (animal.lastCooperationBonusMembers ?? animal.last_cooperation_bonus_members).map(normalizeUsername).filter(Boolean).slice(0, 8)
      : [],
    last_cooperation_feed_actor_username: normalizeUsername(animal.lastCooperationFeedActorUsername ?? animal.last_cooperation_feed_actor_username),
    hunger: Math.max(0, Math.floor(Number(animal.hunger) || 0)),
    sick: animal.sick === true,
    sick_days: Math.max(0, Math.floor(Number(animal.sickDays ?? animal.sick_days) || 0)),
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

function readMemberAnimalSnapshot(member = {}) {
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
        animals: [],
      };
    }
    const entry = saves.slots[slot];
    const decrypted = decryptTaoyuanRaw(entry.raw);
    const saveContainer = normalizeGameplaySaveContainer(decrypted);
    const gameplay = saveContainer?.gameplayData;
    const animalState = gameplay?.animal && typeof gameplay.animal === 'object' ? gameplay.animal : null;
    if (!animalState) {
      return {
        available: false,
        unavailable_reason: '成员存档缺少动物数据',
        member,
        save_slot: slot,
        save_revision: Number(entry.revision) || 0,
        save_id: normalizeSaveId(member.save_id || identity?.save_id),
        animals: [],
      };
    }
    const onlineIdentity = getContainerIdentity(saveContainer);
    const animals = Array.isArray(animalState.animals) ? animalState.animals : [];
    const saveId = normalizeSaveId(member.save_id || identity?.save_id || onlineIdentity?.save_id || onlineIdentity?.saveId);
    return {
      available: true,
      unavailable_reason: '',
      member,
      save_slot: slot,
      save_revision: Number(entry.revision) || 0,
      save_id: saveId,
      animals,
    };
  } catch {
    return {
      available: false,
      unavailable_reason: '成员动物存档读取失败',
      member,
      save_slot: null,
      save_revision: 0,
      save_id: normalizeSaveId(member.save_id || identity?.save_id),
      animals: [],
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
      'persistent_shared_manor_map',
    ],
  };
}

function getAnimalPermissionMode(contract = {}, ownerKey = '') {
  const acceptedMembers = (contract.members || []).filter(member => member.status === 'accepted');
  const sharedOperators = acceptedMembers.filter(member => {
    if (member.username_key === ownerKey) return true;
    const animalPermissions = contract.permissions?.[member.username_key]?.animal || {};
    return animalPermissions.feed === true || animalPermissions.pet === true || animalPermissions.collect_product === true;
  });
  return sharedOperators.length > 1 ? 'shared' : 'owner_only';
}

function countSharedAnimalStates(animals = []) {
  return animals.reduce((summary, animal) => {
    const state = animal?.animal_state || {};
    summary.total += 1;
    if (state.was_fed === true) summary.fed += 1;
    if (state.was_petted === true) summary.petted += 1;
    if (state.sick === true) summary.sick += 1;
    if (isSharedAnimalProductReady(animal)) summary.product_ready += 1;
    return summary;
  }, {
    total: 0,
    fed: 0,
    petted: 0,
    sick: 0,
    product_ready: 0,
  });
}

function getSharedAnimalProductDef(animal = {}) {
  const state = animal?.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : {};
  const type = sanitizeText(animal.type || state.type, 80);
  const def = SHARED_ANIMAL_PRODUCT_CATALOG[type];
  if (!def?.product_id || !def?.produce_days) return null;
  return {
    product_id: normalizeWarehouseItemId(def.product_id),
    produce_days: Math.max(1, Math.floor(Number(def.produce_days) || 1)),
  };
}

function getSharedAnimalProductQuality(animal = {}) {
  const state = animal?.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : {};
  const friendship = Math.max(0, Math.floor(Number(state.friendship) || 0));
  if (friendship >= 800) return 'supreme';
  if (friendship >= 500) return 'excellent';
  if (friendship >= 200) return 'fine';
  return 'normal';
}

function isSharedAnimalProductReady(animal = {}) {
  const def = getSharedAnimalProductDef(animal);
  if (!def) return false;
  const state = animal?.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : {};
  if (state.sick === true || state.was_fed !== true) return false;
  return Math.max(0, Math.floor(Number(state.days_since_product) || 0)) >= def.produce_days;
}

function buildSharedMapFromFarmSnapshots(contract, farmSnapshots, options = {}) {
  const layout = buildSharedFarmPlots(contract, farmSnapshots);
  const stateCounts = countPlotStates(layout.plots);
  const generatedAt = nowSeconds();
  return {
    version: 1,
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: false,
    writes_enabled: true,
    persisted: options.persisted === true,
    persistence_policy: 'persist_contract_map_without_rewriting_personal_saves',
    generated_at: generatedAt,
    persisted_at: options.persisted === true ? generatedAt : 0,
    revision: Math.max(contract.updated_at || 0, ...farmSnapshots.map(snapshot => Number(snapshot.save_revision) || 0), generatedAt),
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
    plots: layout.plots.map(plot => ({ ...plot, readonly: false })),
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
      persisted_shared_manor_map: options.persisted === true,
      farm_plant_write_enabled: true,
      farm_water_write_enabled: true,
      farm_harvest_write_enabled: true,
      farm_action_ledger_count: Array.isArray(contract.shared_farm_ledger) ? contract.shared_farm_ledger.length : 0,
      shared_warehouse_harvest_deposit_enabled: true,
      shared_fund_balance: contract.shared_fund.balance,
      included_sources: ['farm.plots'],
      deferred_sources: ['farm.greenhousePlots', 'farm.fruitTrees', 'animal', 'warehouse', 'decoration'],
      deferred_writes: [],
    },
  };
}

function buildSharedAnimalsFromSnapshots(contract, animalSnapshots, options = {}) {
  const generatedAt = nowSeconds();
  const animals = [];
  for (const snapshot of animalSnapshots) {
    const member = snapshot.member || {};
    const ownerKey = normalizeUsernameKey(member.username_key || member.username);
    const originOwnerId = `save:${snapshot.save_id || member.save_id || ownerKey}`;
    const manorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
    const roleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole) : null;
    const permissionMode = getAnimalPermissionMode(contract, ownerKey);
    if (!snapshot.available) continue;
    for (const [index, rawAnimal] of (Array.isArray(snapshot.animals) ? snapshot.animals : []).entries()) {
      const state = summarizeAnimal(rawAnimal);
      const sourceAnimalId = state.id || `animal_${index}`;
      animals.push({
        id: `${ownerKey}:animal:${sourceAnimalId}`,
        source_animal_id: sourceAnimalId,
        type: state.type,
        name: state.name,
        origin_owner_id: originOwnerId,
        origin_save_id: snapshot.save_id,
        origin_owner_username: member.username,
        origin_owner_display_name: member.display_name,
        origin_owner_key: ownerKey,
        origin_owner_manor_role: manorRole,
        origin_owner_manor_role_label: roleDef?.label || '',
        source_save_slot: snapshot.save_slot,
        source_save_revision: snapshot.save_revision,
        current_keeper_username: member.username,
        current_keeper_display_name: member.display_name,
        current_keeper_manor_role: manorRole,
        current_keeper_manor_role_label: roleDef?.label || '',
        permission_mode: permissionMode,
        split_rule: 'return_to_origin_owner_on_separation',
        permission_restriction: permissionMode === 'shared'
          ? 'accepted_members_with_animal_feed_permission_can_feed'
          : 'origin_owner_only_until_permission_changed',
        readonly: false,
        animal_state: state,
      });
    }
  }
  const normalizedAnimals = animals.map(normalizeSharedAnimal).filter(Boolean).slice(0, SHARED_ANIMAL_LIMIT);
  const stateCounts = countSharedAnimalStates(normalizedAnimals);
  return {
    version: 1,
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: false,
    writes_enabled: true,
    persisted: options.persisted === true,
    persistence_policy: 'persist_contract_animals_without_rewriting_personal_saves',
    generated_at: generatedAt,
    persisted_at: options.persisted === true ? generatedAt : 0,
    revision: Math.max(contract.updated_at || 0, ...animalSnapshots.map(snapshot => Number(snapshot.save_revision) || 0), generatedAt),
    animals: normalizedAnimals,
    summary: {
      member_count: contract.members.length,
      available_member_count: animalSnapshots.filter(snapshot => snapshot.available).length,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: Math.max(0, stateCounts.total - stateCounts.fed),
      pettable_count: Math.max(0, stateCounts.total - stateCounts.petted),
      product_ready_count: stateCounts.product_ready,
      origin_owner_count: new Set(normalizedAnimals.map(animal => animal.origin_owner_id).filter(Boolean)).size,
      personal_money_merged: false,
      personal_save_changed: false,
      origin_trace_enabled: true,
      persisted_shared_animals: options.persisted === true,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      animal_action_ledger_count: Array.isArray(contract.shared_animal_ledger) ? contract.shared_animal_ledger.length : 0,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      included_sources: ['animal.animals'],
      deferred_sources: ['animal.pets', 'animal.buildings', 'animal.products'],
      deferred_writes: [],
    },
  };
}

function buildPlotOriginAssetFromSharedPlot(plot = {}) {
  return {
    id: sanitizeText(plot.id, 120),
    source_area: sanitizeText(plot.source_area, 40) || 'field',
    source_plot_id: normalizePlotId(plot.source_plot_id, 0),
    origin_owner_id: sanitizeText(plot.origin_owner_id, 100),
    origin_save_id: normalizeSaveId(plot.origin_save_id),
    origin_owner_username: normalizeUsername(plot.origin_owner_username),
    origin_owner_display_name: sanitizeText(plot.origin_owner_display_name || plot.origin_owner_username, 60),
    origin_owner_key: normalizeUsernameKey(plot.origin_owner_key || plot.origin_owner_username),
    origin_owner_manor_role: sanitizeText(plot.origin_owner_manor_role, 40),
    origin_owner_manor_role_label: sanitizeText(plot.origin_owner_manor_role_label, 40),
    source_save_slot: normalizeSaveSlot(plot.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(plot.source_save_revision) || 0)),
    current_steward_username: normalizeUsername(plot.current_steward_username),
    current_steward_display_name: sanitizeText(plot.current_steward_display_name || plot.current_steward_username, 60),
    current_steward_manor_role: sanitizeText(plot.current_steward_manor_role, 40),
    current_steward_manor_role_label: sanitizeText(plot.current_steward_manor_role_label, 40),
    permission_mode: sanitizeText(plot.permission_mode, 40) || 'owner_only',
    x: Math.max(0, Math.floor(Number(plot.x) || 0)),
    y: Math.max(0, Math.floor(Number(plot.y) || 0)),
    row: Math.max(0, Math.floor(Number(plot.row) || 0)),
    col: Math.max(0, Math.floor(Number(plot.col) || 0)),
    local_row: Math.max(0, Math.floor(Number(plot.local_row) || 0)),
    local_col: Math.max(0, Math.floor(Number(plot.local_col) || 0)),
    split_rule: 'return_to_origin_owner_on_separation',
    permission_restriction: plot.permission_mode === 'shared'
      ? 'accepted_members_with_farm_permission_can_care'
      : 'origin_owner_only_until_permission_changed',
    plot_state: plot.plot_state && typeof plot.plot_state === 'object' ? { ...plot.plot_state } : summarizeFarmPlot({}),
  };
}

function buildAnimalOriginAssetFromSharedAnimal(animal = {}) {
  return {
    id: sanitizeText(animal.id, 140),
    source_animal_id: sanitizeText(animal.source_animal_id, 100),
    type: sanitizeText(animal.type, 80),
    name: sanitizeText(animal.name, 80),
    origin_owner_id: sanitizeText(animal.origin_owner_id, 100),
    origin_save_id: normalizeSaveId(animal.origin_save_id),
    origin_owner_username: normalizeUsername(animal.origin_owner_username),
    origin_owner_display_name: sanitizeText(animal.origin_owner_display_name || animal.origin_owner_username, 60),
    origin_owner_key: normalizeUsernameKey(animal.origin_owner_key || animal.origin_owner_username),
    origin_owner_manor_role: sanitizeText(animal.origin_owner_manor_role, 40),
    origin_owner_manor_role_label: sanitizeText(animal.origin_owner_manor_role_label, 40),
    source_save_slot: normalizeSaveSlot(animal.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(animal.source_save_revision) || 0)),
    current_keeper_username: normalizeUsername(animal.current_keeper_username),
    current_keeper_display_name: sanitizeText(animal.current_keeper_display_name || animal.current_keeper_username, 60),
    current_keeper_manor_role: sanitizeText(animal.current_keeper_manor_role, 40),
    current_keeper_manor_role_label: sanitizeText(animal.current_keeper_manor_role_label, 40),
    permission_mode: sanitizeText(animal.permission_mode, 40) || 'owner_only',
    split_rule: 'return_to_origin_owner_on_separation',
    permission_restriction: animal.permission_mode === 'shared'
      ? 'accepted_members_with_animal_feed_permission_can_care'
      : 'origin_owner_only_until_permission_changed',
    animal_state: animal.animal_state && typeof animal.animal_state === 'object' ? { ...animal.animal_state } : summarizeAnimal({}),
  };
}

function refreshSharedMapContractFields(contract, sharedMap) {
  const normalizedMap = normalizePersistentSharedMap(sharedMap);
  if (!normalizedMap) return null;
  const normalizedDeferredWrites = Array.isArray(normalizedMap.summary?.deferred_writes)
    ? normalizedMap.summary.deferred_writes.map(item => sanitizeText(item, 80)).filter(Boolean)
    : [];
  const activeDeferredWrites = normalizedDeferredWrites.filter(item =>
    item !== 'harvest'
    && item !== 'shared_warehouse_auto_deposit'
  );
  const memberByKey = new Map((contract.members || []).map(member => [member.username_key, member]));
  const regions = (normalizedMap.layout.regions || []).map(region => {
    const member = memberByKey.get(region.member_username_key) || null;
    const manorRole = normalizeFamilyManorRole(member?.manor_role || region.manor_role, contract.type, member?.role || region.member_role);
    const roleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole) : null;
    return {
      ...region,
      member_role: member?.role || region.member_role,
      manor_role: manorRole,
      manor_role_label: roleDef?.label || '',
      permission_mode: getPlotPermissionMode(contract, region.member_username_key),
    };
  });
  const plots = (normalizedMap.plots || []).map(plot => {
    const ownerKey = normalizeUsernameKey(plot.origin_owner_key || plot.origin_owner_username);
    const member = memberByKey.get(ownerKey) || null;
    const manorRole = normalizeFamilyManorRole(member?.manor_role || plot.origin_owner_manor_role, contract.type, member?.role || 'member');
    const roleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole) : null;
    return {
      ...plot,
      origin_owner_manor_role: manorRole,
      origin_owner_manor_role_label: roleDef?.label || '',
      permission_mode: getPlotPermissionMode(contract, ownerKey),
      readonly: false,
    };
  });
  const stateCounts = countPlotStates(plots);
  return {
    ...normalizedMap,
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: false,
    writes_enabled: true,
    layout: {
      ...normalizedMap.layout,
      regions,
      summary: {
        ...(normalizedMap.layout.summary || {}),
        writes_enabled: true,
        deferred_writes: activeDeferredWrites,
      },
    },
    members: (normalizedMap.members || []).map(snapshotMember => {
      const member = memberByKey.get(snapshotMember.username_key) || null;
      const manorRole = normalizeFamilyManorRole(member?.manor_role || snapshotMember.manor_role, contract.type, member?.role || snapshotMember.role);
      return {
        ...snapshotMember,
        role: member?.role || snapshotMember.role,
        manor_role: manorRole,
        manor_role_label: isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole).label : '',
        status: member?.status || snapshotMember.status,
      };
    }),
    plots,
    summary: {
      ...(normalizedMap.summary || {}),
      member_count: contract.members.length,
      total_plots: stateCounts.total,
      active_plots: stateCounts.active,
      harvestable_plots: stateCounts.harvestable,
      waterable_plots: stateCounts.waterable,
      origin_owner_count: new Set(plots.map(plot => plot.origin_owner_id)).size,
      layout_region_count: regions.length,
      multi_member_layout: isFamilyRoleContractType(contract.type) && contract.members.length > 2,
      max_members: (RELATION_TYPE_DEFS[contract.type] || RELATION_TYPE_DEFS.lover_cohabitation).max_members,
      personal_money_merged: false,
      origin_trace_enabled: true,
      persisted_shared_manor_map: true,
      farm_plant_write_enabled: true,
      farm_water_write_enabled: true,
      farm_harvest_write_enabled: true,
      farm_action_ledger_count: Array.isArray(contract.shared_farm_ledger) ? contract.shared_farm_ledger.length : 0,
      shared_warehouse_harvest_deposit_enabled: true,
      shared_fund_balance: contract.shared_fund.balance,
      deferred_writes: activeDeferredWrites,
    },
  };
}

function refreshSharedAnimalsContractFields(contract, sharedAnimals) {
  const normalized = normalizeSharedAnimals(sharedAnimals);
  const memberByKey = new Map((contract.members || []).map(member => [member.username_key, member]));
  const animals = (normalized.animals || []).map(animal => {
    const ownerKey = normalizeUsernameKey(animal.origin_owner_key || animal.origin_owner_username);
    const owner = memberByKey.get(ownerKey) || null;
    const manorRole = normalizeFamilyManorRole(owner?.manor_role || animal.origin_owner_manor_role, contract.type, owner?.role || 'member');
    const roleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(manorRole) : null;
    return {
      ...animal,
      origin_owner_manor_role: manorRole,
      origin_owner_manor_role_label: roleDef?.label || '',
      permission_mode: getAnimalPermissionMode(contract, ownerKey),
      readonly: false,
    };
  });
  const stateCounts = countSharedAnimalStates(animals);
  return {
    ...normalized,
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: false,
    writes_enabled: true,
    animals,
    summary: {
      ...(normalized.summary || {}),
      member_count: contract.members.length,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: animals.filter(animal => animal.animal_state?.was_fed !== true).length,
      pettable_count: animals.filter(animal => animal.animal_state?.was_petted !== true).length,
      product_ready_count: stateCounts.product_ready,
      origin_owner_count: new Set(animals.map(animal => animal.origin_owner_id).filter(Boolean)).size,
      personal_money_merged: false,
      personal_save_changed: false,
      origin_trace_enabled: true,
      persisted_shared_animals: normalized.persisted === true,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      shared_animal_ledger_count: Array.isArray(contract.shared_animal_ledger) ? contract.shared_animal_ledger.length : 0,
      deferred_writes: (normalized.summary?.deferred_writes || [])
        .filter(item => item !== 'animal.collect_product' && item !== 'collect_product'),
    },
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
  const normalizedPurpose = sanitizeText(entry.purpose, 80) || 'family_building';
  const normalizedState = ['pending_confirmation', 'ready_to_execute', 'executed', 'expired', 'cancelled'].includes(entry.state)
    ? entry.state
    : 'pending_confirmation';
  const highRiskReceiptStatus = ['pending', 'delivered', 'refunded'].includes(entry.high_risk_receipt_status)
    ? entry.high_risk_receipt_status
    : (!isFamilyBuildingLargeFundPurpose(normalizedPurpose) && normalizedState === 'executed' ? 'pending' : '');
  return {
    id: sanitizeText(entry.id, 80) || makeId('fund_large_spend_draft'),
    contract_id: sanitizeText(entry.contract_id, 80),
    state: normalizedState,
    requested_by: normalizeUsername(entry.requested_by || entry.actor_username),
    requested_by_key: normalizeUsernameKey(entry.requested_by_key || entry.requested_by || entry.actor_username),
    amount: Math.max(0, Math.floor(Number(entry.amount) || 0)),
    purpose: normalizedPurpose,
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
      policy: sanitizeText(rawConfirmationState.policy, 180) || '大额共同基金支出必须先完成全部成员确认，执行扣款另走后续专用接口。',
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
    high_risk_receipt_id: sanitizeText(entry.high_risk_receipt_id, 100),
    high_risk_receipt_status: highRiskReceiptStatus,
    high_risk_receipt_outcome: ['delivered', 'refunded'].includes(entry.high_risk_receipt_outcome) ? entry.high_risk_receipt_outcome : '',
    high_risk_receipt_ref: sanitizeText(entry.high_risk_receipt_ref || entry.receipt_ref, 120),
    high_risk_receipt_memo: sanitizeText(entry.high_risk_receipt_memo || entry.receipt_memo, 180),
    high_risk_receipt_idempotency_key: sanitizeText(entry.high_risk_receipt_idempotency_key, 120),
    high_risk_receipt_at: Math.max(0, Math.floor(Number(entry.high_risk_receipt_at) || 0)),
    high_risk_receipt_by: normalizeUsername(entry.high_risk_receipt_by),
    high_risk_receipt_by_display_name: sanitizeText(entry.high_risk_receipt_by_display_name || entry.high_risk_receipt_by, 60),
    high_risk_refund_ledger_id: sanitizeText(entry.high_risk_refund_ledger_id, 100),
    compensation_policy: sanitizeText(entry.compensation_policy, 180) || getLargeFundSpendCompensationPolicy(entry.purpose, false),
    deferred_operations: Array.isArray(entry.deferred_operations)
      ? entry.deferred_operations.map(item => sanitizeText(item, 80)).filter(Boolean)
      : getLargeFundSpendDeferredOperations(entry.purpose, false),
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
    simultaneous_online_bonus: entry.simultaneous_online_bonus && typeof entry.simultaneous_online_bonus === 'object'
      ? {
          applied: entry.simultaneous_online_bonus.applied === true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          recent_member_count: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.recent_member_count) || 0)),
          recent_member_usernames: Array.isArray(entry.simultaneous_online_bonus.recent_member_usernames)
            ? entry.simultaneous_online_bonus.recent_member_usernames.map(normalizeUsername).filter(Boolean).slice(0, 8)
            : [],
          applied_by_username: normalizeUsername(entry.simultaneous_online_bonus.applied_by_username),
          materials_actor_username: normalizeUsername(entry.simultaneous_online_bonus.materials_actor_username),
          building_ledger_id: sanitizeText(entry.simultaneous_online_bonus.building_ledger_id, 100),
          family_atmosphere_event_id: sanitizeText(entry.simultaneous_online_bonus.family_atmosphere_event_id, 120),
          photo_moment_id: sanitizeText(entry.simultaneous_online_bonus.photo_moment_id, 120),
          policy: sanitizeText(entry.simultaneous_online_bonus.policy, 160),
        }
      : {
          applied: false,
          type: '',
          bonus_value: 0,
          recent_member_count: 0,
          recent_member_usernames: [],
          applied_by_username: '',
          materials_actor_username: '',
          building_ledger_id: '',
          family_atmosphere_event_id: '',
          photo_moment_id: '',
          policy: '',
        },
    material_restorations: Array.isArray(entry.material_restorations)
      ? entry.material_restorations.map(item => ({
          item_id: normalizeWarehouseItemId(item?.item_id ?? item?.itemId),
          label: sanitizeText(item?.label, 40),
          quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)),
          quality: normalizeQuality(item?.quality),
          warehouse_ledger_ids: Array.isArray(item?.warehouse_ledger_ids)
            ? item.warehouse_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
            : [],
          source_consume_ledger_ids: Array.isArray(item?.source_consume_ledger_ids)
            ? item.source_consume_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 12)
            : [],
        })).filter(item => item.item_id && item.quantity > 0).slice(0, 12)
      : [],
    rollback_idempotency_key: sanitizeText(entry.rollback_idempotency_key, 120),
    reverted_at: Math.max(0, Math.floor(Number(entry.reverted_at) || 0)),
    reverted_by_username: normalizeUsername(entry.reverted_by_username),
    reverted_by_display_name: sanitizeText(entry.reverted_by_display_name || entry.reverted_by_username, 60),
    rollback_reason: sanitizeText(entry.rollback_reason || entry.revert_reason, 160),
    rollback_policy: sanitizeText(entry.rollback_policy, 180),
    shared_fund_refunded: entry.shared_fund_refunded === true,
    fund_refund_idempotency_key: sanitizeText(entry.fund_refund_idempotency_key, 120),
    fund_refund_ledger_id: sanitizeText(entry.fund_refund_ledger_id, 100),
    fund_refunded_at: Math.max(0, Math.floor(Number(entry.fund_refunded_at) || 0)),
    fund_refunded_by_username: normalizeUsername(entry.fund_refunded_by_username),
    fund_refunded_by_display_name: sanitizeText(entry.fund_refunded_by_display_name || entry.fund_refunded_by_username, 60),
    shared_warehouse_materials_restored: entry.shared_warehouse_materials_restored === true,
    material_restore_idempotency_key: sanitizeText(entry.material_restore_idempotency_key, 120),
    material_restore_ledger_ids: Array.isArray(entry.material_restore_ledger_ids)
      ? entry.material_restore_ledger_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 20)
      : [],
    materials_restored_at: Math.max(0, Math.floor(Number(entry.materials_restored_at) || 0)),
    materials_restored_by_username: normalizeUsername(entry.materials_restored_by_username),
    materials_restored_by_display_name: sanitizeText(entry.materials_restored_by_display_name || entry.materials_restored_by_username, 60),
    compensation_replay_idempotency_key: sanitizeText(entry.compensation_replay_idempotency_key, 120),
    compensation_replayed_at: Math.max(0, Math.floor(Number(entry.compensation_replayed_at) || 0)),
    compensation_replayed_by_username: normalizeUsername(entry.compensation_replayed_by_username),
    compensation_replayed_by_display_name: sanitizeText(entry.compensation_replayed_by_display_name || entry.compensation_replayed_by_username, 60),
    real_build_demolished: entry.real_build_demolished === true,
    real_build_demolition_policy: sanitizeText(entry.real_build_demolition_policy, 180),
    real_build_demolition_request_idempotency_key: sanitizeText(entry.real_build_demolition_request_idempotency_key, 120),
    real_build_demolition_requested_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_requested_at) || 0)),
    real_build_demolition_requested_by_username: normalizeUsername(entry.real_build_demolition_requested_by_username),
    real_build_demolition_requested_by_display_name: sanitizeText(entry.real_build_demolition_requested_by_display_name || entry.real_build_demolition_requested_by_username, 60),
    real_build_demolition_review_idempotency_key: sanitizeText(entry.real_build_demolition_review_idempotency_key, 120),
    real_build_demolition_reviewed_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_reviewed_at) || 0)),
    real_build_demolition_reviewed_by_username: normalizeUsername(entry.real_build_demolition_reviewed_by_username),
    real_build_demolition_reviewed_by_display_name: sanitizeText(entry.real_build_demolition_reviewed_by_display_name || entry.real_build_demolition_reviewed_by_username, 60),
    real_build_demolition_review_state: ['not_requested', 'pending_manual_review', 'approved_for_execute', 'rejected', 'executed'].includes(entry.real_build_demolition_review_state)
      ? entry.real_build_demolition_review_state
      : (entry.real_build_demolition_request_idempotency_key ? 'pending_manual_review' : 'not_requested'),
    real_build_demolition_review_note: sanitizeText(entry.real_build_demolition_review_note || entry.real_build_demolition_note, 180),
    real_build_demolition_execution_request_idempotency_key: sanitizeText(entry.real_build_demolition_execution_request_idempotency_key || entry.real_build_demolition_execute_idempotency_key, 120),
    real_build_demolition_execution_requested_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_execution_requested_at || entry.real_build_demolition_executed_at) || 0)),
    real_build_demolition_execution_requested_by_username: normalizeUsername(entry.real_build_demolition_execution_requested_by_username || entry.real_build_demolition_executed_by_username),
    real_build_demolition_execution_requested_by_display_name: sanitizeText(
      entry.real_build_demolition_execution_requested_by_display_name
        || entry.real_build_demolition_executed_by_display_name
        || entry.real_build_demolition_execution_requested_by_username
        || entry.real_build_demolition_executed_by_username,
      60
    ),
    real_build_demolition_execution_state: ['not_requested', 'pending_personal_save_write', 'executed', 'cancelled'].includes(entry.real_build_demolition_execution_state)
      ? entry.real_build_demolition_execution_state
      : (entry.real_build_demolition_execution_request_idempotency_key || entry.real_build_demolition_execute_idempotency_key ? 'pending_personal_save_write' : 'not_requested'),
    real_build_demolition_personal_save_write_idempotency_key: sanitizeText(entry.real_build_demolition_personal_save_write_idempotency_key, 120),
    real_build_demolition_personal_save_written_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_personal_save_written_at) || 0)),
    real_build_demolition_personal_save_written_by_username: normalizeUsername(entry.real_build_demolition_personal_save_written_by_username),
    real_build_demolition_personal_save_written_by_display_name: sanitizeText(
      entry.real_build_demolition_personal_save_written_by_display_name
        || entry.real_build_demolition_personal_save_written_by_username,
      60
    ),
    real_build_demolition_personal_save_receipts: Array.isArray(entry.real_build_demolition_personal_save_receipts)
      ? entry.real_build_demolition_personal_save_receipts.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        before_revision: Math.max(0, Math.floor(Number(item?.before_revision) || 0)),
        after_revision: Math.max(0, Math.floor(Number(item?.after_revision) || 0)),
        receipt_id: sanitizeText(item?.receipt_id, 120),
        receipt_status: sanitizeText(item?.receipt_status, 40) || 'written',
        real_build_ref: sanitizeText(item?.real_build_ref, 120),
        idempotency_key: sanitizeText(item?.idempotency_key, 120),
        written_at: Math.max(0, Math.floor(Number(item?.written_at) || 0)),
      })).filter(item => item.username && item.receipt_id).slice(0, 12)
      : [],
    real_build_demolition_main_state_preview_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_preview_idempotency_key, 120),
    real_build_demolition_main_state_previewed_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_previewed_at) || 0)),
    real_build_demolition_main_state_previewed_by_username: normalizeUsername(entry.real_build_demolition_main_state_previewed_by_username),
    real_build_demolition_main_state_previewed_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_previewed_by_display_name
        || entry.real_build_demolition_main_state_previewed_by_username,
      60
    ),
    real_build_demolition_main_state_manifest_hash: sanitizeText(entry.real_build_demolition_main_state_manifest_hash, 100),
    real_build_demolition_main_state_manifest: Array.isArray(entry.real_build_demolition_main_state_manifest)
      ? entry.real_build_demolition_main_state_manifest.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        before_revision: Math.max(0, Math.floor(Number(item?.before_revision) || 0)),
        real_build_ref: sanitizeText(item?.real_build_ref, 120),
        mapping_status: sanitizeText(item?.mapping_status, 80) || 'blocked_missing_personal_building_binding',
        mutation_enabled: item?.mutation_enabled === true,
        candidate_paths: Array.isArray(item?.candidate_paths)
          ? item.candidate_paths.map(pathName => sanitizeText(pathName, 100)).filter(Boolean).slice(0, 12)
          : [],
        blocked_reason: sanitizeText(item?.blocked_reason, 180),
        candidate_snapshot: sanitizeFamilyBuildingMainStateCandidateSnapshot(item?.candidate_snapshot),
        snapshot_hash: sanitizeText(item?.snapshot_hash, 100),
      })).filter(item => item.username && item.real_build_ref).slice(0, 12)
      : [],
    real_build_demolition_main_state_policy: sanitizeText(entry.real_build_demolition_main_state_policy, 180),
    real_build_demolition_main_state_mapping_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_mapping_idempotency_key, 120),
    real_build_demolition_main_state_mapped_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_mapped_at) || 0)),
    real_build_demolition_main_state_mapped_by_username: normalizeUsername(entry.real_build_demolition_main_state_mapped_by_username),
    real_build_demolition_main_state_mapped_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_mapped_by_display_name
        || entry.real_build_demolition_main_state_mapped_by_username,
      60
    ),
    real_build_demolition_main_state_mapping_manifest_hash: sanitizeText(entry.real_build_demolition_main_state_mapping_manifest_hash, 100),
    real_build_demolition_main_state_mapping_manifest: Array.isArray(entry.real_build_demolition_main_state_mapping_manifest)
      ? entry.real_build_demolition_main_state_mapping_manifest.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        real_build_ref: sanitizeText(item?.real_build_ref, 120),
        building_ledger_id: sanitizeText(item?.building_ledger_id, 100),
        candidate_path: sanitizeText(item?.candidate_path, 100),
        binding_ref: sanitizeText(item?.binding_ref, 160),
        snapshot_hash: sanitizeText(item?.snapshot_hash, 100),
        mapping_status: sanitizeText(item?.mapping_status, 80) || 'verified_personal_binding_pending_mutation',
        mutation_enabled: item?.mutation_enabled === true,
      })).filter(item => item.username && item.binding_ref && item.candidate_path).slice(0, 12)
      : [],
    real_build_demolition_main_state_mapping_policy: sanitizeText(entry.real_build_demolition_main_state_mapping_policy, 180),
    real_build_demolition_main_state_guard_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_guard_idempotency_key, 120),
    real_build_demolition_main_state_guarded_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_guarded_at) || 0)),
    real_build_demolition_main_state_guarded_by_username: normalizeUsername(entry.real_build_demolition_main_state_guarded_by_username),
    real_build_demolition_main_state_guarded_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_guarded_by_display_name
        || entry.real_build_demolition_main_state_guarded_by_username,
      60
    ),
    real_build_demolition_main_state_guard_manifest_hash: sanitizeText(entry.real_build_demolition_main_state_guard_manifest_hash, 100),
    real_build_demolition_main_state_guard_manifest: Array.isArray(entry.real_build_demolition_main_state_guard_manifest)
      ? entry.real_build_demolition_main_state_guard_manifest.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        real_build_ref: sanitizeText(item?.real_build_ref, 120),
        building_ledger_id: sanitizeText(item?.building_ledger_id, 100),
        candidate_path: sanitizeText(item?.candidate_path, 100),
        binding_ref: sanitizeText(item?.binding_ref, 160),
        snapshot_hash: sanitizeText(item?.snapshot_hash, 100),
        guard_status: sanitizeText(item?.guard_status, 80),
        compensation_required: item?.compensation_required !== false,
        rollback_required: item?.rollback_required !== false,
        mutation_enabled: item?.mutation_enabled === true,
      })).filter(item => item.username && item.binding_ref && item.candidate_path).slice(0, 12)
      : [],
    real_build_demolition_main_state_guard_policy: sanitizeText(entry.real_build_demolition_main_state_guard_policy, 180),
    real_build_demolition_main_state_execute_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_execute_idempotency_key, 120),
    real_build_demolition_main_state_executed_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_executed_at) || 0)),
    real_build_demolition_main_state_executed_by_username: normalizeUsername(entry.real_build_demolition_main_state_executed_by_username),
    real_build_demolition_main_state_executed_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_executed_by_display_name
        || entry.real_build_demolition_main_state_executed_by_username,
      60
    ),
    real_build_demolition_main_state_execution_state: sanitizeText(entry.real_build_demolition_main_state_execution_state, 80),
    real_build_demolition_main_state_execute_policy: sanitizeText(entry.real_build_demolition_main_state_execute_policy, 180),
    real_build_demolition_main_state_exact_target_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_exact_target_idempotency_key, 120),
    real_build_demolition_main_state_exact_target_bound_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_exact_target_bound_at) || 0)),
    real_build_demolition_main_state_exact_target_bound_by_username: normalizeUsername(entry.real_build_demolition_main_state_exact_target_bound_by_username),
    real_build_demolition_main_state_exact_target_bound_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_exact_target_bound_by_display_name
        || entry.real_build_demolition_main_state_exact_target_bound_by_username,
      60
    ),
    real_build_demolition_main_state_exact_target_manifest_hash: sanitizeText(entry.real_build_demolition_main_state_exact_target_manifest_hash, 100),
    real_build_demolition_main_state_exact_target_manifest: Array.isArray(entry.real_build_demolition_main_state_exact_target_manifest)
      ? entry.real_build_demolition_main_state_exact_target_manifest.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        real_build_ref: sanitizeText(item?.real_build_ref, 120),
        building_ledger_id: sanitizeText(item?.building_ledger_id, 100),
        candidate_path: sanitizeText(item?.candidate_path, 100),
        binding_ref: sanitizeText(item?.binding_ref, 160),
        snapshot_hash: sanitizeText(item?.snapshot_hash, 100),
        exact_target_ref: sanitizeText(item?.exact_target_ref, 180),
        delete_selector: sanitizeText(item?.delete_selector, 180),
        target_kind: sanitizeText(item?.target_kind, 40),
        target_status: sanitizeText(item?.target_status, 80),
        mutation_enabled: item?.mutation_enabled === true,
      })).filter(item => item.username && item.exact_target_ref && item.delete_selector).slice(0, 12)
      : [],
    real_build_demolition_main_state_exact_target_policy: sanitizeText(entry.real_build_demolition_main_state_exact_target_policy, 180),
    real_build_demolition_main_state_exact_target_resolution_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key, 120),
    real_build_demolition_main_state_exact_target_resolved_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_exact_target_resolved_at) || 0)),
    real_build_demolition_main_state_exact_target_resolved_by_username: normalizeUsername(entry.real_build_demolition_main_state_exact_target_resolved_by_username),
    real_build_demolition_main_state_exact_target_resolved_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_exact_target_resolved_by_display_name
        || entry.real_build_demolition_main_state_exact_target_resolved_by_username,
      60
    ),
    real_build_demolition_main_state_exact_target_resolution_policy: sanitizeText(entry.real_build_demolition_main_state_exact_target_resolution_policy, 180),
    real_build_demolition_main_state_exact_execute_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_exact_execute_idempotency_key, 120),
    real_build_demolition_main_state_exact_executed_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_exact_executed_at) || 0)),
    real_build_demolition_main_state_exact_executed_by_username: normalizeUsername(entry.real_build_demolition_main_state_exact_executed_by_username),
    real_build_demolition_main_state_exact_executed_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_exact_executed_by_display_name
        || entry.real_build_demolition_main_state_exact_executed_by_username,
      60
    ),
    real_build_demolition_main_state_exact_execution_state: sanitizeText(entry.real_build_demolition_main_state_exact_execution_state, 80),
    real_build_demolition_main_state_exact_execute_policy: sanitizeText(entry.real_build_demolition_main_state_exact_execute_policy, 180),
    real_build_demolition_main_state_exact_mutation_idempotency_key: sanitizeText(entry.real_build_demolition_main_state_exact_mutation_idempotency_key, 120),
    real_build_demolition_main_state_exact_mutated_at: Math.max(0, Math.floor(Number(entry.real_build_demolition_main_state_exact_mutated_at) || 0)),
    real_build_demolition_main_state_exact_mutated_by_username: normalizeUsername(entry.real_build_demolition_main_state_exact_mutated_by_username),
    real_build_demolition_main_state_exact_mutated_by_display_name: sanitizeText(
      entry.real_build_demolition_main_state_exact_mutated_by_display_name
        || entry.real_build_demolition_main_state_exact_mutated_by_username,
      60
    ),
    real_build_demolition_main_state_exact_mutation_receipts: Array.isArray(entry.real_build_demolition_main_state_exact_mutation_receipts)
      ? entry.real_build_demolition_main_state_exact_mutation_receipts.map(item => ({
        username: normalizeUsername(item?.username),
        username_key: normalizeUsernameKey(item?.username_key || item?.username),
        save_slot: normalizeSaveSlot(item?.save_slot),
        save_id: normalizeSaveId(item?.save_id),
        before_revision: Math.max(0, Math.floor(Number(item?.before_revision) || 0)),
        after_revision: Math.max(0, Math.floor(Number(item?.after_revision) || 0)),
        receipt_id: sanitizeText(item?.receipt_id, 140),
        receipt_status: sanitizeText(item?.receipt_status, 40) || 'written',
        delete_selector: sanitizeText(item?.delete_selector, 180),
        target_kind: sanitizeText(item?.target_kind, 40),
        mutation_result: sanitizeText(item?.mutation_result, 80),
        idempotency_key: sanitizeText(item?.idempotency_key, 120),
        written_at: Math.max(0, Math.floor(Number(item?.written_at) || 0)),
      })).filter(item => item.username && item.receipt_id).slice(0, 12)
      : [],
    real_build_demolition_main_state_exact_mutation_policy: sanitizeText(entry.real_build_demolition_main_state_exact_mutation_policy, 180),
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
    shared_map: normalizePersistentSharedMap(entry.shared_map),
    shared_farm_ledger: normalizeFarmActionLedger(entry.shared_farm_ledger),
    shared_animals: normalizeSharedAnimals(entry.shared_animals),
    shared_animal_ledger: normalizeAnimalActionLedger(entry.shared_animal_ledger),
    shared_fund: normalizeSharedFund(entry.shared_fund),
    shared_warehouse: normalizeSharedWarehouse(entry.shared_warehouse),
    shared_warehouse_withdrawal_drafts: normalizeWarehouseWithdrawalDrafts(entry.shared_warehouse_withdrawal_drafts),
    shared_warehouse_governance_recoveries: normalizeWarehouseGovernanceRecoveries(entry.shared_warehouse_governance_recoveries),
    origin_assets: normalizeOriginAssets(entry.origin_assets),
    permissions,
    family_state: normalizeContractFamilyState(entry.family_state),
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
    shared_warehouse_withdrawal_drafts: normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts),
    shared_warehouse_governance_recoveries: normalizeWarehouseGovernanceRecoveries(contract.shared_warehouse_governance_recoveries),
    shared_animals: normalizeSharedAnimals(contract.shared_animals),
    shared_animal_ledger: normalizeAnimalActionLedger(contract.shared_animal_ledger),
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

function isContractOwner(contract = {}, username = '') {
  return getContractMember(contract, username)?.role === 'owner';
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
  const simultaneousOnlineBonus = buildSharedOrderConfirmCoopBonusSnapshot(contract, actorUsername, {
    ...receipt,
    receipt_id: receiptId,
    order_id: orderId,
    stage_id: stageId,
    target_ref: targetRef,
  });
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
    simultaneous_online_bonus: {
      applied: simultaneousOnlineBonus.applied,
      type: simultaneousOnlineBonus.type,
      bonus_value: simultaneousOnlineBonus.bonus_value,
      recent_member_count: simultaneousOnlineBonus.recent_member_count,
      recent_member_usernames: simultaneousOnlineBonus.recent_member_usernames,
      assignee_username: simultaneousOnlineBonus.assignee_username,
      confirmer_username: simultaneousOnlineBonus.confirmer_username,
      receipt_id: simultaneousOnlineBonus.receipt_id,
      order_id: simultaneousOnlineBonus.order_id,
      policy: simultaneousOnlineBonus.policy,
    },
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
    simultaneous_online_bonus: simultaneousOnlineBonus,
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
      simultaneous_online_bonus: simultaneousOnlineBonus,
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
    .filter(entry => entry.status !== 'reverted' && entry.status !== 'compensated' && (entry.real_build_applied === true || entry.status === 'build_applied'))
    .map(entry => entry.building_id || entry.project_id)
    .filter(Boolean));
  const materialConsumedBuildingIds = new Set(constructionLedger
    .filter(entry => entry.status !== 'reverted' && entry.status !== 'compensated' && entry.shared_warehouse_materials_consumed === true)
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

function buildSimultaneousOnlineBonusSnapshot(contract = {}, actorUsername = '', action = '') {
  const now = nowSeconds();
  const actorKey = normalizeUsernameKey(actorUsername);
  const recentMembers = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => {
      const lastActiveAt = member.username_key === actorKey
        ? now
        : resolveMemberLastActive(contract, member);
      const offlineSeconds = lastActiveAt > 0 ? Math.max(0, now - lastActiveAt) : null;
      return {
        username: member.username,
        username_key: member.username_key,
        display_name: member.display_name,
        last_active_at: lastActiveAt,
        offline_seconds: offlineSeconds,
        recently_active: offlineSeconds !== null && offlineSeconds <= COHABITATION_RECENT_ONLINE_SECONDS,
      };
    })
    .filter(member => member.recently_active);
  const farmWaterEnabled = contract.status === 'active' && recentMembers.length >= 2;
  const farmPlantFertilizeEnabled = contract.status === 'active' && recentMembers.length >= 2;
  const sharedWorkshopProcessEnabled = contract.status === 'active' && recentMembers.length >= 2;
  const orderConfirmEnabled = isFamilyRoleContractType(contract.type) && contract.status === 'active' && recentMembers.length >= 2;
  const decorationEnabled = isFamilyRoleContractType(contract.type) && contract.status === 'active' && recentMembers.length >= 2;
  return {
    action: sanitizeText(action, 80),
    farm_water_health_bonus_enabled: farmWaterEnabled,
    farm_plant_fertilize_quality_bonus_enabled: farmPlantFertilizeEnabled,
    animal_feed_pet_mood_bonus_enabled: contract.status === 'active' && recentMembers.length >= 2,
    shared_workshop_process_quality_bonus_enabled: sharedWorkshopProcessEnabled,
    order_confirm_efficiency_bonus_enabled: orderConfirmEnabled,
    family_building_decoration_atmosphere_enabled: decorationEnabled,
    applied: farmWaterEnabled && action === 'shared_farm_water',
    bonus_value: farmWaterEnabled && action === 'shared_farm_water' ? SHARED_FARM_WATER_COOP_HEALTH_BONUS : 0,
    recent_member_count: recentMembers.length,
    recent_member_usernames: recentMembers.map(member => member.username).filter(Boolean).slice(0, 8),
    recent_member_keys: recentMembers.map(member => member.username_key).filter(Boolean).slice(0, 8),
    policy: 'two_recent_active_members_within_15_minutes',
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  };
}

function buildFamilyBuildingDecorationCoopBonusSnapshot(contract = {}, actorUsername = '', buildingEntry = {}) {
  const base = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'family_building_materials_consume');
  const actorKey = normalizeUsernameKey(actorUsername);
  const appliedByUsername = normalizeUsername(buildingEntry.applied_by_username);
  const appliedByKey = normalizeUsernameKey(appliedByUsername);
  const buildingLedgerId = sanitizeText(buildingEntry.id, 100);
  const applied = base.family_building_decoration_atmosphere_enabled === true
    && buildingEntry.real_build_applied === true
    && !!actorKey
    && !!appliedByKey
    && actorKey !== appliedByKey;
  return {
    ...base,
    action: 'family_building_materials_consume',
    applied,
    type: 'family_building_decoration_atmosphere',
    bonus_value: applied ? SHARED_DECORATION_COOP_ATMOSPHERE_BONUS : 0,
    applied_by_username: appliedByUsername,
    materials_actor_username: normalizeUsername(actorUsername),
    building_ledger_id: buildingLedgerId,
    family_atmosphere_event_id: applied ? `family_atmosphere:${buildingLedgerId}` : '',
    photo_moment_id: applied ? `family_photo:${buildingLedgerId}` : '',
  };
}

function buildSharedOrderConfirmCoopBonusSnapshot(contract = {}, actorUsername = '', receipt = {}) {
  const base = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'shared_order_confirm');
  const actorKey = normalizeUsernameKey(actorUsername);
  const assigneeUsername = normalizeUsername(receipt.assignee_username);
  const assigneeKey = normalizeUsernameKey(assigneeUsername);
  const applied = base.order_confirm_efficiency_bonus_enabled === true
    && !!actorKey
    && !!assigneeKey
    && actorKey !== assigneeKey;
  return {
    ...base,
    action: 'shared_order_confirm',
    applied,
    type: 'shared_order_confirm_efficiency',
    bonus_value: applied ? SHARED_ORDER_CONFIRM_COOP_EFFICIENCY_BONUS : 0,
    assignee_username: assigneeUsername,
    confirmer_username: normalizeUsername(actorUsername),
    receipt_id: sanitizeText(receipt.receipt_id || receipt.id, 100),
    order_id: sanitizeText(receipt.order_id, 100),
  };
}

function buildSharedFarmPlantFertilizeCoopBonusSnapshot(contract = {}, actorUsername = '', plot = {}) {
  const base = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'shared_farm_fertilize');
  const actorKey = normalizeUsernameKey(actorUsername);
  const plotId = sanitizeText(plot.id || plot.shared_plot_id || plot.plot_id, 140);
  const plantEntry = normalizeFarmActionLedger(contract.shared_farm_ledger).find(entry =>
    entry.action === 'plant'
    && entry.status === 'committed'
    && entry.plot_id === plotId
  );
  const plantActorKey = normalizeUsernameKey(plantEntry?.actor_key || plantEntry?.actor_username);
  const applied = base.farm_plant_fertilize_quality_bonus_enabled === true
    && !!plantEntry
    && !!actorKey
    && !!plantActorKey
    && plantActorKey !== actorKey;
  return {
    ...base,
    action: 'shared_farm_fertilize',
    applied,
    type: 'shared_farm_plant_fertilize_quality',
    bonus_value: applied ? SHARED_FARM_PLANT_FERTILIZE_COOP_QUALITY_BONUS : 0,
    plant_actor_username: plantEntry?.actor_username || '',
    plant_ledger_id: plantEntry?.id || '',
  };
}

function buildSharedAnimalCareCoopBonusSnapshot(contract = {}, actorUsername = '', animal = {}) {
  const base = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'shared_animal_pet');
  const actorKey = normalizeUsernameKey(actorUsername);
  const feedEntry = normalizeAnimalActionLedger(contract.shared_animal_ledger).find(entry =>
    entry.action === 'feed'
    && entry.status === 'committed'
    && entry.animal_id === sanitizeText(animal.id || animal.shared_animal_id, 140)
  );
  const feedActorKey = normalizeUsernameKey(feedEntry?.actor_key || feedEntry?.actor_username);
  const applied = base.animal_feed_pet_mood_bonus_enabled === true
    && !!feedEntry
    && !!actorKey
    && !!feedActorKey
    && feedActorKey !== actorKey;
  return {
    ...base,
    action: 'shared_animal_pet',
    applied,
    type: 'shared_animal_feed_pet_mood',
    bonus_value: applied ? SHARED_ANIMAL_CARE_COOP_MOOD_BONUS : 0,
    feed_actor_username: feedEntry?.actor_username || '',
    feed_ledger_id: feedEntry?.id || '',
  };
}

function buildSharedWorkshopProcessCoopBonusSnapshot(contract = {}, actorUsername = '', context = {}) {
  const base = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'shared_workshop_process');
  const actorKey = normalizeUsernameKey(actorUsername);
  const sourceEntries = Array.isArray(context.source_entries)
    ? context.source_entries.map(normalizeWarehouseLedgerEntry).filter(Boolean)
    : [];
  const materialEntry = sourceEntries.find(entry => {
    const materialActorKey = normalizeUsernameKey(entry.actor_username || entry.source_owner_username);
    return !!actorKey && !!materialActorKey && materialActorKey !== actorKey;
  });
  const applied = base.shared_workshop_process_quality_bonus_enabled === true && !!materialEntry;
  const outputQualityBefore = normalizeQuality(context.output_quality_before);
  const outputQualityAfter = applied
    ? upgradeWarehouseQuality(outputQualityBefore, SHARED_WORKSHOP_PROCESS_COOP_QUALITY_BONUS)
    : outputQualityBefore;
  return {
    ...base,
    action: 'shared_workshop_process',
    applied,
    type: 'shared_workshop_process_quality',
    bonus_value: applied ? SHARED_WORKSHOP_PROCESS_COOP_QUALITY_BONUS : 0,
    material_actor_username: normalizeUsername(materialEntry?.actor_username || materialEntry?.source_owner_username),
    processor_username: normalizeUsername(actorUsername),
    recipe_id: sanitizeText(context.recipe_id, 100),
    source_ledger_ids: sourceEntries.map(entry => entry.id).filter(Boolean).slice(0, 12),
    output_quality_before: outputQualityBefore,
    output_quality_after: outputQualityAfter,
  };
}

function buildOfflineOperationSnapshot(contract, actorUsername = '') {
  const actorMember = getContractMember(contract, actorUsername);
  const actorPermissions = enforcePermissionSafetyRails(contract.permissions?.[actorMember?.username_key], contract.type);
  const simultaneousOnlineBonus = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'offline_status');
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
      shared_farm_offline_writes_enabled: true,
      shared_animal_offline_writes_enabled: true,
      shared_workshop_offline_writes_enabled: true,
      simultaneous_online_bonus_enabled: simultaneousOnlineBonus.farm_water_health_bonus_enabled,
      simultaneous_online_farm_fertilize_bonus_enabled: simultaneousOnlineBonus.farm_plant_fertilize_quality_bonus_enabled,
      simultaneous_online_animal_bonus_enabled: simultaneousOnlineBonus.animal_feed_pet_mood_bonus_enabled,
      simultaneous_online_workshop_bonus_enabled: simultaneousOnlineBonus.shared_workshop_process_quality_bonus_enabled,
      simultaneous_online_order_bonus_enabled: simultaneousOnlineBonus.order_confirm_efficiency_bonus_enabled,
      simultaneous_online_decoration_bonus_enabled: simultaneousOnlineBonus.family_building_decoration_atmosphere_enabled,
      simultaneous_online_bonus_policy: simultaneousOnlineBonus.policy,
      auto_offline_income_enabled: false,
      conflict_policy: '共同庄园第一版以服务端契约、仓库、基金和审计日志为准；离线自动收益与客户端本地合并暂不开放。',
    },
    members,
    actor_capabilities: {
      read_shared_map: true,
      water_shared_farm: actorPermissions.farm.water === true,
      plant_shared_farm: actorPermissions.farm.plant === true,
      harvest_shared_farm: actorPermissions.farm.harvest === true,
      care_shared_farm: actorPermissions.farm.cure_pests === true,
      fertilize_shared_farm_basic: actorPermissions.farm.plant === true,
      read_shared_animals: true,
      feed_shared_animal: actorPermissions.animal.feed === true,
      pet_shared_animal: actorPermissions.animal.pet === true,
      collect_shared_animal_product: actorPermissions.animal.collect_product === true,
      process_shared_workshop_recipe: actorPermissions.construction.move_common_furniture === true
        || actorPermissions.construction.buy_furniture === true
        || ['family_head', 'workshop_keeper', 'storage_keeper'].includes(normalizeFamilyManorRole(actorMember?.manor_role, contract.type, actorMember?.role)),
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
    simultaneous_online_bonus: simultaneousOnlineBonus,
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
  const withdrawalDrafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts);
  const activeWithdrawalDrafts = withdrawalDrafts.filter(draft => WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES.has(draft.state));
  const actorKey = normalizeUsernameKey(actorUsername);
  const actorMember = getContractMember(contract, actorUsername);
  const actorPermissions = enforcePermissionSafetyRails(contract.permissions?.[actorKey], contract.type);
  const familyWarehouse = buildFamilyWarehouseSummary(contract, warehouse, actorMember);
  const governance = buildSharedWarehouseGovernanceSnapshot(contract, actorUsername);
  const totalQuantity = warehouse.items.reduce((sum, item) => sum + item.quantity, 0);
  const frozenQuantity = activeWithdrawalDrafts.reduce((sum, draft) => sum + normalizePositiveInt(draft.frozen_quantity || draft.quantity, 0), 0);
  const sellEnabled = contract.status === 'active' && actorPermissions.storage.sell_items === true;
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    items: warehouse.items,
    ledger: warehouse.ledger.slice(0, 50),
    high_value_withdrawal_drafts: withdrawalDrafts.slice(0, 20),
    governance,
    summary: {
      item_count: warehouse.items.length,
      total_quantity: totalQuantity,
      frozen_quantity: frozenQuantity,
      ledger_count: warehouse.ledger.length,
      personal_money_merged: false,
      deposit_enabled: contract.status === 'active' && actorPermissions.storage.deposit === true,
      withdraw_enabled: contract.status === 'active' && actorPermissions.storage.withdraw_common === true,
      high_value_withdrawal_confirmation_enabled: contract.status === 'active',
      high_value_withdrawal_draft_count: withdrawalDrafts.length,
      active_high_value_withdrawal_draft_count: activeWithdrawalDrafts.length,
      sell_enabled: sellEnabled,
      governance_blocked: governance.blocking.block_outbound === true || governance.blocking.block_inbound === true,
      high_frequency_outbound_count: governance.actor_window.outbound_action_count,
      high_frequency_inbound_count: governance.actor_window.inbound_action_count,
      family_manor_warehouse: familyWarehouse.enabled,
      role_based_storage_permissions: familyWarehouse.role_based_storage_permissions,
      source_owner_count: familyWarehouse.source_owner_summary.length,
      idempotency_required: true,
      protected_qualities: ['fine', 'excellent', 'supreme'],
      protected_operations: ['withdraw_high_quality', 'withdraw_rare', 'sell_high_quality', 'sell_rare'],
      compensation_policy: '普通物品可直接按权限取出；高品质 / 稀有物必须先建草案冻结库存、双方确认，再执行取出。执行前可撤销草案释放冻结，执行后按 ledger 与个人背包落点走补偿复核。',
    },
    permissions: {
      can_deposit: actorPermissions.storage.deposit === true,
      can_withdraw_common: actorPermissions.storage.withdraw_common === true,
      can_withdraw_high_quality: actorPermissions.storage.withdraw_high_quality === true,
      can_withdraw_rare: actorPermissions.storage.withdraw_rare === true,
      can_create_high_value_withdrawal_draft: actorPermissions.storage.withdraw_high_quality === true || actorPermissions.storage.withdraw_rare === true,
      can_sell_items: actorPermissions.storage.sell_items === true,
    },
    family_warehouse: familyWarehouse,
  };
}

function buildSharedWarehouseGovernanceSnapshot(contract, actorUsername = '') {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const actorKey = normalizeUsernameKey(actorUsername);
  const checkedAt = nowSeconds();
  const windowStartedAt = Math.max(0, checkedAt - WAREHOUSE_GOVERNANCE_WINDOW_SECONDS);
  const inboundActions = new Set(['deposit']);
  const outboundActions = new Set(['withdraw', 'sell']);
  const recentInboundEntries = warehouse.ledger
    .filter(entry => entry.status === 'committed')
    .filter(entry => inboundActions.has(entry.action))
    .filter(entry => entry.source_inventory === 'inventory.items')
    .filter(entry => Math.max(0, Number(entry.at) || 0) >= windowStartedAt);
  const recentOutboundEntries = warehouse.ledger
    .filter(entry => entry.status === 'committed')
    .filter(entry => outboundActions.has(entry.action))
    .filter(entry => Math.max(0, Number(entry.at) || 0) >= windowStartedAt);
  const actorInboundEntries = recentInboundEntries.filter(entry =>
    normalizeUsernameKey(entry.actor_username) === actorKey
  );
  const actorOutboundEntries = recentOutboundEntries.filter(entry =>
    normalizeUsernameKey(entry.actor_username) === actorKey
  );
  const byActor = new Map();
  const trackActorWarehouseAction = (entry, direction) => {
    const key = normalizeUsernameKey(entry.actor_username) || 'unknown';
    const current = byActor.get(key) || {
      actor_username: entry.actor_username,
      actor_key: key,
      inbound_action_count: 0,
      inbound_quantity: 0,
      outbound_action_count: 0,
      outbound_quantity: 0,
      actions: {},
      inbound_ledger_ids: [],
      outbound_ledger_ids: [],
      ledger_ids: [],
    };
    const quantity = Math.max(0, Math.floor(Number(entry.quantity) || 0));
    if (direction === 'inbound') {
      current.inbound_action_count += 1;
      current.inbound_quantity += quantity;
      if (entry.id && current.inbound_ledger_ids.length < 12) current.inbound_ledger_ids.push(entry.id);
    } else {
      current.outbound_action_count += 1;
      current.outbound_quantity += quantity;
      if (entry.id && current.outbound_ledger_ids.length < 12) current.outbound_ledger_ids.push(entry.id);
      if (entry.id && current.ledger_ids.length < 12) current.ledger_ids.push(entry.id);
    }
    current.actions[entry.action] = (current.actions[entry.action] || 0) + 1;
    byActor.set(key, current);
  };
  for (const entry of recentInboundEntries) trackActorWarehouseAction(entry, 'inbound');
  for (const entry of recentOutboundEntries) trackActorWarehouseAction(entry, 'outbound');
  const suspiciousActors = [...byActor.values()]
    .filter(entry =>
      entry.outbound_action_count >= WAREHOUSE_GOVERNANCE_OUTBOUND_ACTION_LIMIT
      || entry.inbound_action_count >= WAREHOUSE_GOVERNANCE_INBOUND_ACTION_LIMIT
    )
    .sort((left, right) => {
      const rightScore = Math.max(right.outbound_action_count, right.inbound_action_count);
      const leftScore = Math.max(left.outbound_action_count, left.inbound_action_count);
      return rightScore - leftScore;
    })
    .slice(0, 20);
  const activeHighValueDrafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts)
    .filter(draft => WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES.has(draft.state))
    .map(draft => ({
      draft_id: draft.id,
      requester_username: draft.requester_username,
      item_id: draft.item_id,
      quality: draft.quality,
      quantity: draft.quantity,
      risk_level: draft.risk_level,
      state: draft.state,
      frozen_quantity: draft.frozen_quantity,
      created_at: draft.created_at,
      pending_member_usernames: draft.pending_member_usernames,
    }))
    .slice(0, 20);
  const actorInboundCount = actorInboundEntries.length;
  const actorOutboundCount = actorOutboundEntries.length;
  const actorInboundQuantity = actorInboundEntries.reduce(
    (sum, entry) => sum + Math.max(0, Math.floor(Number(entry.quantity) || 0)),
    0
  );
  const actorOutboundQuantity = actorOutboundEntries.reduce(
    (sum, entry) => sum + Math.max(0, Math.floor(Number(entry.quantity) || 0)),
    0
  );
  const activeRecoveries = getActiveSharedWarehouseGovernanceRecoveries(contract, actorKey, '', checkedAt);
  const activeInboundRecovery = activeRecoveries.find(recovery => warehouseGovernanceRecoveryCoversDirection(recovery, 'inbound')) || null;
  const activeOutboundRecovery = activeRecoveries.find(recovery => warehouseGovernanceRecoveryCoversDirection(recovery, 'outbound')) || null;
  const rawBlockInbound = actorInboundCount >= WAREHOUSE_GOVERNANCE_INBOUND_ACTION_LIMIT;
  const rawBlockOutbound = actorOutboundCount >= WAREHOUSE_GOVERNANCE_OUTBOUND_ACTION_LIMIT;
  const blockInbound = rawBlockInbound && !activeInboundRecovery;
  const blockOutbound = rawBlockOutbound && !activeOutboundRecovery;
  const recentGovernanceAudits = (Array.isArray(contract.audit_log) ? contract.audit_log : [])
    .filter(entry => [
      'warehouse_deposited',
      'warehouse_withdrawn',
      'warehouse_sold',
      'warehouse_high_value_withdrawal_draft_created',
      'warehouse_high_value_withdrawal_executed',
      'warehouse_high_frequency_inbound_blocked',
      'warehouse_high_frequency_outbound_blocked',
      'warehouse_governance_recovered',
    ].includes(entry.action))
    .slice(0, 20);

  return {
    contract_id: contract.id,
    actor_username: normalizeUsername(actorUsername),
    checked_at: checkedAt,
    window_seconds: WAREHOUSE_GOVERNANCE_WINDOW_SECONDS,
    inbound_action_limit: WAREHOUSE_GOVERNANCE_INBOUND_ACTION_LIMIT,
    outbound_action_limit: WAREHOUSE_GOVERNANCE_OUTBOUND_ACTION_LIMIT,
    actor_window: {
      inbound_action_count: actorInboundCount,
      inbound_quantity: actorInboundQuantity,
      outbound_action_count: actorOutboundCount,
      outbound_quantity: actorOutboundQuantity,
      inbound_ledger_ids: actorInboundEntries.map(entry => entry.id).filter(Boolean).slice(0, 20),
      outbound_ledger_ids: actorOutboundEntries.map(entry => entry.id).filter(Boolean).slice(0, 20),
      ledger_ids: actorOutboundEntries.map(entry => entry.id).filter(Boolean).slice(0, 20),
      actions: [...actorInboundEntries, ...actorOutboundEntries].reduce((acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      }, {}),
    },
    suspicious_actors: suspiciousActors,
    active_high_value_withdrawal_drafts: activeHighValueDrafts,
    active_recoveries: activeRecoveries.slice(0, 10),
    last_recovery: normalizeWarehouseGovernanceRecoveries(contract.shared_warehouse_governance_recoveries)
      .find(recovery => recovery.target_username_key === actorKey) || null,
    recent_audits: recentGovernanceAudits,
    blocking: {
      block_inbound: blockInbound,
      block_outbound: blockOutbound,
      raw_block_inbound: rawBlockInbound,
      raw_block_outbound: rawBlockOutbound,
      recovery_active: activeRecoveries.length > 0,
      recovered_directions: [
        activeInboundRecovery ? 'inbound' : '',
        activeOutboundRecovery ? 'outbound' : '',
      ].filter(Boolean),
      recovery_expires_at: Math.max(
        0,
        ...activeRecoveries.map(recovery => Math.max(0, Number(recovery.expires_at) || 0))
      ),
      blocked_directions: [
        blockInbound ? 'inbound' : '',
        blockOutbound ? 'outbound' : '',
      ].filter(Boolean),
      reason: blockOutbound
        ? '当前成员短时间共同仓库取出 / 卖出次数过高，需等待窗口结束或走申诉恢复。'
        : blockInbound
          ? '当前成员短时间共同仓库放入次数过高，需等待窗口结束或走申诉恢复。'
        : '',
      required_operation: blockOutbound
        ? 'wait_or_appeal_shared_warehouse_outbound'
        : blockInbound
          ? 'wait_or_appeal_shared_warehouse_inbound'
        : '',
    },
    policy: {
      personal_inventory_merged: false,
      personal_money_merged: false,
      idempotent_replay_allowed: true,
      high_frequency_manual_deposit_limited: true,
      high_value_withdraw_requires_freeze_and_confirm: true,
      appeal_recovery_required_for_blocked_outbound: true,
      appeal_recovery_required_for_blocked_inbound: true,
      managed_recovery_records_enabled: true,
    },
  };
}

function assertSharedWarehouseOutboundGovernance(contract, actor = {}, operation = 'withdraw', idempotencyKey = '', store = null) {
  const governance = buildSharedWarehouseGovernanceSnapshot(contract, actor.username);
  if (governance.blocking.block_outbound !== true) return governance;
  appendAudit(contract, 'warehouse_high_frequency_outbound_blocked', actor, {
    operation: sanitizeText(operation, 80),
    outbound_action_count: governance.actor_window.outbound_action_count,
    outbound_quantity: governance.actor_window.outbound_quantity,
    window_seconds: governance.window_seconds,
    outbound_action_limit: governance.outbound_action_limit,
    recent_ledger_ids: governance.actor_window.ledger_ids,
    personal_inventory_merged: false,
    personal_money_merged: false,
    required_operation: governance.blocking.required_operation,
  }, idempotencyKey);
  if (store) saveContractStore(store);
  throw createError('共同仓库短时间取出 / 卖出次数过高，已暂时阻断本次操作，请稍后重试或走申诉恢复', 429);
}

function assertSharedWarehouseInboundGovernance(contract, actor = {}, operation = 'deposit', idempotencyKey = '', store = null) {
  const governance = buildSharedWarehouseGovernanceSnapshot(contract, actor.username);
  if (governance.blocking.block_inbound !== true) return governance;
  appendAudit(contract, 'warehouse_high_frequency_inbound_blocked', actor, {
    operation: sanitizeText(operation, 80),
    inbound_action_count: governance.actor_window.inbound_action_count,
    inbound_quantity: governance.actor_window.inbound_quantity,
    window_seconds: governance.window_seconds,
    inbound_action_limit: governance.inbound_action_limit,
    recent_ledger_ids: governance.actor_window.inbound_ledger_ids,
    shared_warehouse_changed: false,
    personal_inventory_merged: false,
    personal_money_merged: false,
    required_operation: governance.blocking.required_operation,
  }, idempotencyKey);
  if (store) saveContractStore(store);
  throw createError('共同仓库短时间放入次数过高，已暂时阻断本次操作，请稍后重试或走申诉恢复', 429);
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
  const governance = buildSharedFundGovernanceSnapshot(contract, actorUsername);
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    balance: fund.balance,
    ledger: fund.ledger.slice(0, 50),
    large_spend_drafts: largeSpendDrafts.slice(0, 20),
    governance,
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
      pending_high_risk_receipt_count: governance.pending_high_risk_receipts.length,
      governance_blocked: governance.blocking.block_new_high_risk_execution === true,
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

function buildSharedFundGovernanceSnapshot(contract, actorUsername = '') {
  const normalizedActor = normalizeUsername(actorUsername);
  const fund = normalizeSharedFund(contract.shared_fund);
  const drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const pendingHighRiskReceipts = drafts
    .filter(draft =>
      draft.state === 'executed'
      && isHighRiskNonBuildingLargeFundPurpose(draft.purpose)
      && (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    )
    .map(draft => ({
      draft_id: draft.id,
      purpose: draft.purpose,
      purpose_label: draft.purpose_label,
      target_ref: draft.target_ref,
      amount: draft.amount,
      final_spend_ledger_id: draft.final_spend_ledger_id,
      executed_at: draft.executed_at,
      executed_by: draft.executed_by,
      pending_seconds: Math.max(0, nowSeconds() - Math.max(0, Number(draft.executed_at) || 0)),
      deferred_operations: draft.deferred_operations,
      compensation_policy: draft.compensation_policy,
    }))
    .slice(0, 20);
  const highRiskRefundLedgerEntries = fund.ledger
    .filter(entry => entry.action === 'high_risk_fund_refund')
    .map(entry => ({
      ledger_id: entry.id,
      draft_id: String(entry.target_ref || '').replace(/^high_risk_refund:/, ''),
      amount: entry.amount,
      purpose: entry.purpose,
      target_ref: entry.target_ref,
      actor_username: entry.actor_username,
      at: entry.at,
      idempotency_key: entry.idempotency_key,
      balance_after: entry.balance_after,
    }))
    .slice(0, 20);
  const largeSpendByTarget = new Map();
  for (const entry of fund.ledger) {
    if (entry.action !== 'spend' || entry.spend_tier !== 'large') continue;
    const targetKey = `${entry.purpose}:${entry.target_ref}`;
    if (!largeSpendByTarget.has(targetKey)) largeSpendByTarget.set(targetKey, []);
    largeSpendByTarget.get(targetKey).push(entry);
  }
  const suspiciousLargeSpends = Array.from(largeSpendByTarget.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([target_key, entries]) => ({
      target_key,
      count: entries.length,
      total_amount: entries.reduce((sum, entry) => sum + Math.max(0, Math.floor(Number(entry.amount) || 0)), 0),
      ledger_ids: entries.map(entry => entry.id).slice(0, 10),
      actor_usernames: Array.from(new Set(entries.map(entry => entry.actor_username).filter(Boolean))).slice(0, 10),
    }))
    .slice(0, 20);
  const recentGovernanceAudits = (Array.isArray(contract.audit_log) ? contract.audit_log : [])
    .filter(entry => [
      'fund_large_spend_draft_created',
      'fund_large_spend_draft_confirmed',
      'fund_large_spend_draft_executed',
      'fund_high_risk_receipt_recorded',
      'fund_high_risk_execution_blocked',
    ].includes(entry.action))
    .slice(0, 20);

  return {
    contract_id: contract.id,
    actor_username: normalizedActor,
    checked_at: nowSeconds(),
    pending_high_risk_receipts: pendingHighRiskReceipts,
    high_risk_refund_ledger_entries: highRiskRefundLedgerEntries,
    suspicious_large_spends: suspiciousLargeSpends,
    recent_audits: recentGovernanceAudits,
    blocking: {
      block_new_high_risk_execution: pendingHighRiskReceipts.length > 0,
      reason: pendingHighRiskReceipts.length > 0
        ? '存在已扣款但未记录交付或退款回执的高风险共同基金草案，需先收口回执再执行新的高风险扣款。'
        : '',
      required_operation: pendingHighRiskReceipts.length > 0 ? 'record_high_risk_receipt' : '',
      pending_draft_ids: pendingHighRiskReceipts.map(entry => entry.draft_id),
    },
    policy: {
      personal_money_merged: false,
      high_risk_receipt_required: true,
      refund_returns_to_shared_fund_only: true,
      duplicate_target_review_required: suspiciousLargeSpends.length > 0,
    },
  };
}

function normalizeSharedFarmActionPayload(payload = {}) {
  const plotId = sanitizeText(payload.plot_id || payload.shared_plot_id || payload.id, 140);
  if (!plotId) throw createError('shared farm plot_id is required');
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('shared farm action requires idempotency_key');
  return {
    plot_id: plotId,
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSharedFarmCarePayload(payload = {}) {
  const request = normalizeSharedFarmActionPayload(payload);
  const action = sanitizeText(payload.action || payload.care_action || payload.action_type, 40);
  if (!['cure_pests', 'clear_weeds'].includes(action)) {
    throw createError('shared farm care action must be cure_pests or clear_weeds', 400);
  }
  return {
    ...request,
    action,
  };
}

function normalizeSharedFarmPlantPayload(payload = {}) {
  const request = normalizeSharedFarmActionPayload(payload);
  const seedItemId = normalizeWarehouseItemId(payload.seed_item_id || payload.seedItemId || payload.item_id || payload.itemId);
  const seedDef = SHARED_FARM_SEED_CATALOG[seedItemId];
  if (!seedDef) throw createError('shared farm planting only supports whitelisted shared-warehouse seeds', 403);
  return {
    ...request,
    seed_item_id: seedDef.seed_item_id,
    crop_id: seedDef.crop_id,
  };
}

function normalizeSharedFarmFertilizePayload(payload = {}) {
  const request = normalizeSharedFarmActionPayload(payload);
  const fertilizerItemId = normalizeWarehouseItemId(payload.fertilizer_item_id || payload.fertilizerItemId || payload.item_id || payload.itemId);
  if (fertilizerItemId !== 'basic_fertilizer') {
    throw createError('shared farm fertilize only supports basic_fertilizer in this pass', 403);
  }
  return {
    ...request,
    fertilizer_item_id: fertilizerItemId,
  };
}

function normalizeSharedAnimalActionPayload(payload = {}) {
  const animalId = sanitizeText(payload.animal_id || payload.shared_animal_id || payload.id, 140);
  if (!animalId) throw createError('shared animal animal_id is required');
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('shared animal action requires idempotency_key');
  return {
    animal_id: animalId,
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSharedAnimalFeedPayload(payload = {}) {
  const request = normalizeSharedAnimalActionPayload(payload);
  const feedItemId = normalizeWarehouseItemId(payload.feed_item_id || payload.feedItemId || payload.item_id || payload.itemId || 'hay');
  if (feedItemId !== 'hay') {
    throw createError('shared animal feed only supports hay in this pass', 403);
  }
  return {
    ...request,
    feed_item_id: feedItemId,
  };
}

function normalizeSharedWorkshopProcessPayload(payload = {}) {
  const recipeId = sanitizeText(payload.recipe_id || payload.recipeId || payload.id, 100);
  const recipe = SHARED_WORKSHOP_RECIPE_CATALOG[recipeId];
  if (!recipe) throw createError('shared workshop processing only supports whitelisted recipes', 403);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('shared workshop processing requires idempotency_key');
  return {
    recipe_id: recipe.id,
    idempotency_key: idempotencyKey,
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function assertSharedWorkshopProcessAllowed(contract = {}, member = {}, actorPermissions = {}) {
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  if (
    actorPermissions?.construction?.move_common_furniture === true
    || actorPermissions?.construction?.buy_furniture === true
    || ['family_head', 'workshop_keeper', 'storage_keeper'].includes(actorManorRole)
  ) {
    return true;
  }
  throw createError('shared workshop processing permission denied', 403);
}

function findSharedMapPlot(sharedMap = {}, plotId = '') {
  const normalizedPlotId = sanitizeText(plotId, 140);
  return (Array.isArray(sharedMap.plots) ? sharedMap.plots : []).find(plot =>
    sanitizeText(plot?.id, 140) === normalizedPlotId
    || sanitizeText(plot?.shared_plot_id, 140) === normalizedPlotId
  ) || null;
}

function findSharedAnimal(sharedAnimals = {}, animalId = '') {
  const normalizedAnimalId = sanitizeText(animalId, 140);
  return (Array.isArray(sharedAnimals.animals) ? sharedAnimals.animals : []).find(animal =>
    sanitizeText(animal?.id, 140) === normalizedAnimalId
    || sanitizeText(animal?.shared_animal_id, 140) === normalizedAnimalId
  ) || null;
}

function assertSharedFarmActionAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}, permissionKey = 'water') {
  if (actorPermissions?.farm?.[permissionKey] !== true) throw createError(`shared farm ${permissionKey} permission denied`, 403);
  const actorKey = normalizeUsernameKey(member.username_key || member.username);
  const originOwnerKey = normalizeUsernameKey(plot.origin_owner_key || plot.origin_owner_username);
  if (actorKey && originOwnerKey && actorKey === originOwnerKey) return true;
  if (plot.permission_mode === 'shared') return true;
  throw createError('shared farm plot is owner-only', 403);
}

function assertSharedFarmWaterAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}) {
  return assertSharedFarmActionAllowed(contract, member, plot, actorPermissions, 'water');
}

function assertSharedFarmCareAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}) {
  return assertSharedFarmActionAllowed(contract, member, plot, actorPermissions, 'cure_pests');
}

function assertSharedFarmPlantAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}) {
  return assertSharedFarmActionAllowed(contract, member, plot, actorPermissions, 'plant');
}

function assertSharedFarmFertilizeAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}) {
  return assertSharedFarmActionAllowed(contract, member, plot, actorPermissions, 'plant');
}

function assertSharedFarmHarvestAllowed(contract = {}, member = {}, plot = {}, actorPermissions = {}) {
  return assertSharedFarmActionAllowed(contract, member, plot, actorPermissions, 'harvest');
}

function assertSharedAnimalFeedAllowed(contract = {}, member = {}, animal = {}, actorPermissions = {}) {
  if (actorPermissions?.animal?.feed !== true) throw createError('shared animal feed permission denied', 403);
  const actorKey = normalizeUsernameKey(member.username_key || member.username);
  const originOwnerKey = normalizeUsernameKey(animal.origin_owner_key || animal.origin_owner_username);
  if (actorKey && originOwnerKey && actorKey === originOwnerKey) return true;
  if (animal.permission_mode === 'shared') return true;
  throw createError('shared animal is owner-only', 403);
}

function assertSharedAnimalPetAllowed(contract = {}, member = {}, animal = {}, actorPermissions = {}) {
  if (actorPermissions?.animal?.pet !== true) throw createError('shared animal pet permission denied', 403);
  const actorKey = normalizeUsernameKey(member.username_key || member.username);
  const originOwnerKey = normalizeUsernameKey(animal.origin_owner_key || animal.origin_owner_username);
  if (actorKey && originOwnerKey && actorKey === originOwnerKey) return true;
  if (animal.permission_mode === 'shared') return true;
  throw createError('shared animal is owner-only', 403);
}

function assertSharedAnimalProductCollectAllowed(contract = {}, member = {}, animal = {}, actorPermissions = {}) {
  if (actorPermissions?.animal?.collect_product !== true) throw createError('shared animal product collect permission denied', 403);
  const actorKey = normalizeUsernameKey(member.username_key || member.username);
  const originOwnerKey = normalizeUsernameKey(animal.origin_owner_key || animal.origin_owner_username);
  if (actorKey && originOwnerKey && actorKey === originOwnerKey) return true;
  if (animal.permission_mode === 'shared') return true;
  throw createError('shared animal is owner-only', 403);
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

function normalizeWarehouseHighValueWithdrawalDraftPayload(payload = {}) {
  const itemId = normalizeWarehouseItemId(payload.item_id ?? payload.itemId);
  const rawQuantity = Math.floor(Number(payload.quantity) || 0);
  const requestedQuality = String(payload.quality || 'normal').trim().toLowerCase();
  if (!itemId) throw createError('请指定有效的高价值取出物品');
  if (rawQuantity <= 0) throw createError('高价值取出数量必须大于 0');
  if (rawQuantity > WAREHOUSE_MAX_WITHDRAW_QUANTITY) throw createError(`单次高价值取出数量不能超过 ${WAREHOUSE_MAX_WITHDRAW_QUANTITY}`);
  if (!WAREHOUSE_QUALITIES.has(requestedQuality)) throw createError('高价值取出物品品质参数无效');
  const riskLevel = getWarehouseWithdrawalRiskLevel(itemId, requestedQuality);
  if (riskLevel === 'common') throw createError('普通物品请使用普通取出流程', 400);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('高价值取出草案需要 idempotency_key，以防断线或重试时重复冻结');
  return {
    item_id: itemId,
    quantity: rawQuantity,
    quality: requestedQuality,
    risk_level: riskLevel,
    idempotency_key: idempotencyKey,
    save_slot: normalizeSaveSlot(payload.save_slot),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeWarehouseHighValueWithdrawalConfirmPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('高价值取出确认需要 idempotency_key，以防断线或重试时重复确认');
  return {
    idempotency_key: idempotencyKey,
    confirmation_text: sanitizeText(payload.confirmation_text || payload.confirm_text || payload.confirmation || '', 120),
    freeze_acknowledged: payload.freeze_acknowledged === true || payload.ack_freeze === true,
    rollback_plan_acknowledged: payload.rollback_plan_acknowledged === true || payload.ack_rollback === true,
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeWarehouseHighValueWithdrawalExecutePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('高价值取出执行需要 idempotency_key，以防断线或重试时重复取出');
  return {
    idempotency_key: idempotencyKey,
    save_slot: normalizeSaveSlot(payload.save_slot),
    expected_state: sanitizeText(payload.expected_state || payload.state, 60),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeWarehouseHighValueWithdrawalRollbackPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('高价值取出回滚需要 idempotency_key，以防断线或重试时重复回滚');
  return {
    idempotency_key: idempotencyKey,
    reason: sanitizeText(payload.reason || payload.memo || payload.note || '撤销高价值取出草案并释放冻结库存', 160),
  };
}

function normalizeWarehouseGovernanceRecoveryPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同仓库治理恢复需要 idempotency_key，以防断线或重试时重复恢复');
  const direction = normalizeWarehouseGovernanceDirection(payload.direction || payload.blocked_direction || payload.operation_direction);
  const reason = sanitizeText(payload.reason || payload.appeal_reason || payload.memo || payload.note, 180);
  if (!reason) throw createError('共同仓库治理恢复必须填写申诉 / 恢复原因');
  return {
    idempotency_key: idempotencyKey,
    direction,
    target_username: normalizeUsername(payload.target_username || payload.targetUsername || payload.username),
    reason,
    recovery_note: sanitizeText(payload.recovery_note || payload.approval_note || payload.note, 180),
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

function isFamilyBuildingLargeFundPurpose(purpose) {
  return ['family_building', 'manor_expansion'].includes(sanitizeText(purpose, 80));
}

function isHighRiskNonBuildingLargeFundPurpose(purpose) {
  const normalizedPurpose = sanitizeText(purpose, 80);
  return Boolean(resolveLargeFundSpendPurpose(normalizedPurpose)) && !isFamilyBuildingLargeFundPurpose(normalizedPurpose);
}

function getLargeFundSpendDeferredOperations(purpose, executed = false) {
  const normalizedPurpose = sanitizeText(purpose, 80) || 'family_building';
  if (isFamilyBuildingLargeFundPurpose(normalizedPurpose)) {
    return executed
      ? ['real_build_apply', 'fund_compensation_replay']
      : ['confirm_large_fund_spend', 'execute_large_fund_spend', 'building_ledger_write', 'fund_compensation_replay'];
  }
  if (normalizedPurpose === 'family_major_event') {
    return executed
      ? ['family_event_resolution_receipt', 'child_arrangement_review', 'fund_compensation_replay']
      : ['confirm_large_fund_spend', 'execute_large_fund_spend', 'family_event_resolution_receipt', 'child_arrangement_review', 'fund_compensation_replay'];
  }
  if (normalizedPurpose === 'shared_decoration_removal') {
    return executed
      ? ['shared_decoration_removal_receipt', 'shared_decoration_dispute_review', 'fund_compensation_replay']
      : ['confirm_large_fund_spend', 'execute_large_fund_spend', 'shared_decoration_removal_receipt', 'shared_decoration_dispute_review', 'fund_compensation_replay'];
  }
  return executed
    ? ['confirm_high_risk_purchase_receipt', 'delivery_or_refund', 'fund_compensation_replay']
    : ['confirm_large_fund_spend', 'execute_large_fund_spend', 'high_risk_purchase_receipt', 'delivery_or_refund', 'fund_compensation_replay'];
}

function getLargeFundSpendExecutionPolicy(purpose) {
  const normalizedPurpose = sanitizeText(purpose, 80) || 'family_building';
  if (isFamilyBuildingLargeFundPurpose(normalizedPurpose)) {
    return '大额建筑 / 扩建支出已完成成员确认、扣减共同基金并写入建筑流水；真实建造仍待后续接入。';
  }
  if (normalizedPurpose === 'family_major_event') {
    return '孩子 / 家庭重大事件支出已完成成员确认并扣减共同基金；后续必须写家庭事件决议和孩子安排回执，不直接改个人家庭主状态。';
  }
  return '稀有物 / 限定装饰支出已完成成员确认并扣减共同基金；后续必须写采购收货或退款补偿回执，不直接改个人背包或小屋。';
}

function getLargeFundSpendCompensationPolicy(purpose, executed = false) {
  const normalizedPurpose = sanitizeText(purpose, 80) || 'family_building';
  if (isFamilyBuildingLargeFundPurpose(normalizedPurpose)) {
    return executed
      ? '大额共同基金已扣款并写入建筑流水；若后续真实建造或扩建失败，按草案、基金 ledger 和建筑流水补偿或重放。'
      : '草案阶段不扣基金；后续执行若失败必须按确认草案、基金 ledger 和建筑 ledger 重放或回滚。';
  }
  if (normalizedPurpose === 'family_major_event') {
    return executed
      ? '孩子 / 家庭重大事件已扣共同基金；若后续事件决议或孩子安排失败，按草案、基金 ledger 和家庭回执退款或重放。'
      : '草案阶段不扣基金；后续执行若失败必须按确认草案、基金 ledger 和家庭事件回执补偿或回滚。';
  }
  return executed
    ? '高风险采购已扣共同基金；若后续收货或装修发放失败，按草案、基金 ledger 和采购回执退款或重放。'
    : '草案阶段不扣基金；后续执行若失败必须按确认草案、基金 ledger 和采购回执补偿或回滚。';
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
  if (!purposeDef) throw createError('共同基金大额确认草案当前只支持家族建筑、庄园扩建、稀有物、限定装饰或孩子 / 家庭重大事件用途', 403);
  if (amount <= FUND_MAX_MEDIUM_SPEND_AMOUNT) throw createError(`大额共同基金确认草案金额必须超过 ${FUND_MAX_MEDIUM_SPEND_AMOUNT}`);
  if (amount > purposeDef.max_amount) throw createError(`该大额共同基金用途单次确认不能超过 ${purposeDef.max_amount}`);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金大额确认草案需要 idempotency_key，以防断线或重试时重复生成');
  const targetRef = sanitizeText(payload.target_ref || payload.target_id || payload.building_id || payload.expansion_id || payload.item_id || payload.decoration_id || payload.removal_id || payload.event_id || payload.child_event_id, 120);
  if (!targetRef) throw createError('共同基金大额确认草案需要 target_ref 记录高风险支出目标');
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

function normalizeSeparationPersonalSaveWritePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居个人存档写回需要 idempotency_key，以防断线或重试时重复写回');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationSharedFundRefundPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居共同基金返还需要 idempotency_key，以防断线或重试时重复返还');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationSharedWarehouseReturnPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居共同仓库返还需要 idempotency_key，以防断线或重试时重复返还');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationFamilyStoryResolvePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居剧情拆分记录需要 idempotency_key，以防断线或重试时重复记录');
  const resolutionChoice = sanitizeText(payload.resolution_choice || payload.choice || 'peaceful_separation', 80);
  const allowedChoices = ['peaceful_separation', 'cooling_off', 'family_meeting', 'manual_review'];
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    resolution_choice: allowedChoices.includes(resolutionChoice) ? resolutionChoice : 'manual_review',
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationPersonalStoryReceiptsPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居个人剧情回执写入需要 idempotency_key，以防断线或重试时重复写入');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationChildArrangementResolvePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居孩子安排记录需要 idempotency_key，以防断线或重试时重复记录');
  const arrangementChoice = sanitizeText(payload.arrangement_choice || payload.choice || 'shared_care_pending_personal_saves', 100);
  const allowedChoices = ['shared_care_pending_personal_saves', 'primary_owner_care', 'manual_family_review'];
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    arrangement_choice: allowedChoices.includes(arrangementChoice) ? arrangementChoice : 'manual_family_review',
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationPersonalFamilyReceiptsPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居个人家庭回执写入需要 idempotency_key，以防断线或重试时重复写入');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    memo: sanitizeText(payload.memo || payload.note, 160),
  };
}

function normalizeSeparationDecorationBuildingSplitPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('分居装饰 / 建筑拆分记录需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    execution_ledger_id: sanitizeText(payload.execution_ledger_id, 100),
    plot_return_manifest_hash: sanitizeText(payload.plot_return_manifest_hash || payload.manifest_hash, 100),
    decoration_split_manifest_hash: sanitizeText(payload.decoration_split_manifest_hash || payload.split_manifest_hash, 100),
    building_split_manifest_hash: sanitizeText(payload.building_split_manifest_hash || payload.family_building_split_manifest_hash, 100),
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

function normalizeLargeFundHighRiskReceiptPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金高风险回执需要 idempotency_key，以防断线或重试时重复记录');
  const outcome = sanitizeText(payload.outcome || payload.receipt_outcome || payload.result, 40);
  const normalizedOutcome = ['delivered', 'refunded'].includes(outcome) ? outcome : '';
  if (!normalizedOutcome) throw createError('共同基金高风险回执 outcome 只支持 delivered 或 refunded');
  const receiptRef = sanitizeText(payload.receipt_ref || payload.delivery_ref || payload.resolution_ref || payload.ref || payload.target_ref, 120);
  if (!receiptRef) throw createError('共同基金高风险回执需要 receipt_ref 记录交付、家庭事件或退款凭证');
  if (normalizedOutcome === 'refunded' && payload.compensation_plan_acknowledged !== true && payload.refund_acknowledged !== true) {
    throw createError('共同基金高风险退款回执需要确认补偿方案', 409);
  }
  return {
    idempotency_key: idempotencyKey,
    outcome: normalizedOutcome,
    receipt_ref: receiptRef,
    memo: sanitizeText(payload.memo || payload.note, 180),
    compensation_plan_acknowledged: payload.compensation_plan_acknowledged === true || payload.refund_acknowledged === true,
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

function normalizeFamilyBuildingRollbackPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑回滚记录需要 idempotency_key，以防断线或重试时重复记录回滚');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingFundRefundPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑基金退款补偿需要 idempotency_key，以防断线或重试时重复退回共同基金');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingMaterialsRestorePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑材料恢复补偿需要 idempotency_key，以防断线或重试时重复恢复共同仓库');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingCompensationReplayPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑补偿重放收口需要 idempotency_key，以防断线或重试时重复收口');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionRequestPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除复核请求需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionRejectPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除复核驳回需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionApprovePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除复核批准需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionExecutionRequestPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除执行请求需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionPersonalSaveWritePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人存档写回需要 idempotency_key，以防断线或重试时重复写回');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStatePreviewPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态预览需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateMappingPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态映射证明需要 idempotency_key，以防断线或重试时重复记录');
  const mappings = Array.isArray(payload.mappings)
    ? payload.mappings.map(item => ({
      username: normalizeUsername(item?.username),
      username_key: normalizeUsernameKey(item?.username_key || item?.username),
      save_slot: normalizeSaveSlot(item?.save_slot),
      save_id: normalizeSaveId(item?.save_id),
      real_build_ref: sanitizeText(item?.real_build_ref, 120),
      candidate_path: sanitizeText(item?.candidate_path || item?.path, 100),
      binding_ref: sanitizeText(item?.binding_ref || item?.personal_binding_ref || item?.ref, 160),
      snapshot_hash: sanitizeText(item?.snapshot_hash || item?.expected_snapshot_hash, 100),
    })).filter(item => item.username && item.binding_ref && item.candidate_path).slice(0, 12)
    : [];
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_manifest_hash: sanitizeText(payload.expected_manifest_hash || payload.manifest_hash, 100),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
    mappings,
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateMutationGuardPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态变更安全阀需要 idempotency_key，以防断线或重试时重复记录');
  const confirmationText = sanitizeText(payload.confirmation_text || payload.confirm_text || payload.confirmation || '', 120);
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_mapping_manifest_hash: sanitizeText(payload.expected_mapping_manifest_hash || payload.mapping_manifest_hash || payload.manifest_hash, 100),
    confirmation_text: confirmationText,
    compensation_plan_acknowledged: payload.compensation_plan_acknowledged === true || payload.ack_compensation === true,
    rollback_plan_acknowledged: payload.rollback_plan_acknowledged === true || payload.ack_rollback === true,
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateExecutePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态执行需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_guard_manifest_hash: sanitizeText(payload.expected_guard_manifest_hash || payload.guard_manifest_hash || payload.manifest_hash, 100),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateExactTargetPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态精确目标绑定需要 idempotency_key，以防断线或重试时重复记录');
  const targets = Array.isArray(payload.targets || payload.exact_targets || payload.manifest)
    ? (payload.targets || payload.exact_targets || payload.manifest).map(item => ({
      username: normalizeUsername(item?.username),
      username_key: normalizeUsernameKey(item?.username_key || item?.username),
      save_slot: normalizeSaveSlot(item?.save_slot),
      save_id: normalizeSaveId(item?.save_id),
      real_build_ref: sanitizeText(item?.real_build_ref, 120),
      candidate_path: sanitizeText(item?.candidate_path, 100),
      binding_ref: sanitizeText(item?.binding_ref, 160),
      snapshot_hash: sanitizeText(item?.snapshot_hash || item?.expected_snapshot_hash, 100),
      exact_target_ref: sanitizeText(item?.exact_target_ref || item?.target_ref || item?.delete_target_ref, 180),
      delete_selector: sanitizeText(item?.delete_selector || item?.selector || item?.exact_target_ref || item?.target_ref, 180),
      target_kind: sanitizeText(item?.target_kind || item?.kind, 40),
    })).filter(item => item.username_key && item.candidate_path && item.exact_target_ref && item.delete_selector).slice(0, 12)
    : [];
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_guard_manifest_hash: sanitizeText(payload.expected_guard_manifest_hash || payload.guard_manifest_hash || payload.manifest_hash, 100),
    expected_execution_state: sanitizeText(payload.expected_execution_state || payload.execution_state, 80),
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
    targets,
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateExactExecutePayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态精确执行需要 idempotency_key，以防断线或重试时重复记录');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_exact_target_manifest_hash: sanitizeText(payload.expected_exact_target_manifest_hash || payload.exact_target_manifest_hash || payload.manifest_hash, 100),
    expected_execution_state: sanitizeText(payload.expected_execution_state || payload.execution_state, 80),
    confirmation_text: sanitizeText(payload.confirmation_text, 80),
    compensation_plan_acknowledged: payload.compensation_plan_acknowledged === true,
    rollback_plan_acknowledged: payload.rollback_plan_acknowledged === true,
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateExactTargetResolutionPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态精确目标人工解析需要 idempotency_key，以防断线或重试时重复记录');
  const targets = Array.isArray(payload.targets || payload.resolved_targets || payload.manifest)
    ? (payload.targets || payload.resolved_targets || payload.manifest).map(item => ({
      username: normalizeUsername(item?.username),
      username_key: normalizeUsernameKey(item?.username_key || item?.username),
      save_slot: normalizeSaveSlot(item?.save_slot),
      save_id: normalizeSaveId(item?.save_id),
      real_build_ref: sanitizeText(item?.real_build_ref, 120),
      candidate_path: sanitizeText(item?.candidate_path, 100),
      binding_ref: sanitizeText(item?.binding_ref, 160),
      snapshot_hash: sanitizeText(item?.snapshot_hash || item?.expected_snapshot_hash, 100),
      exact_target_ref: sanitizeText(item?.exact_target_ref || item?.target_ref || item?.resolved_target_ref, 180),
      delete_selector: sanitizeText(item?.delete_selector || item?.selector || item?.exact_target_ref || item?.target_ref, 180),
      target_kind: sanitizeText(item?.target_kind || item?.kind, 40),
      resolution_proof: sanitizeText(item?.resolution_proof || item?.proof || item?.note, 180),
    })).filter(item => item.username_key && item.candidate_path && item.exact_target_ref && item.delete_selector).slice(0, 12)
    : [];
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_exact_target_manifest_hash: sanitizeText(payload.expected_exact_target_manifest_hash || payload.exact_target_manifest_hash || payload.manifest_hash, 100),
    expected_execution_state: sanitizeText(payload.expected_execution_state || payload.execution_state, 80),
    confirmation_text: sanitizeText(payload.confirmation_text, 80),
    targets,
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
  };
}

function normalizeFamilyBuildingRealDemolitionMainStateExactMutationAdapterPayload(payload = {}) {
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('家族建筑真实拆除个人主状态变更适配器执行需要 idempotency_key，以防断线或重试时重复写入');
  return {
    idempotency_key: idempotencyKey,
    building_ledger_id: sanitizeText(payload.building_ledger_id || payload.ledger_id || payload.id, 100),
    draft_id: sanitizeText(payload.draft_id, 100),
    fund_ledger_id: sanitizeText(payload.fund_ledger_id, 100),
    target_ref: sanitizeText(payload.target_ref || payload.target, 120),
    expected_exact_target_manifest_hash: sanitizeText(payload.expected_exact_target_manifest_hash || payload.exact_target_manifest_hash || payload.manifest_hash, 100),
    expected_execution_state: sanitizeText(payload.expected_execution_state || payload.execution_state, 80),
    confirmation_text: sanitizeText(payload.confirmation_text, 100),
    compensation_plan_acknowledged: payload.compensation_plan_acknowledged === true,
    rollback_plan_acknowledged: payload.rollback_plan_acknowledged === true,
    reason: sanitizeText(payload.reason || payload.memo || payload.note, 160),
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
  const withdrawalRiskLevel = getWarehouseWithdrawalRiskLevel(entry.item_id, entry.quality);
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
    withdrawal_risk_level: withdrawalRiskLevel,
    high_value_withdrawal_required: withdrawalRiskLevel !== 'common',
    simultaneous_online_bonus: entry.simultaneous_online_bonus?.applied === true
      ? {
          applied: true,
          type: sanitizeText(entry.simultaneous_online_bonus.type, 80),
          bonus_value: Math.max(0, Math.floor(Number(entry.simultaneous_online_bonus.bonus_value) || 0)),
          material_actor_username: normalizeUsername(entry.simultaneous_online_bonus.material_actor_username),
          processor_username: normalizeUsername(entry.simultaneous_online_bonus.processor_username),
          recipe_id: sanitizeText(entry.simultaneous_online_bonus.recipe_id, 100),
          output_quality_before: normalizeQuality(entry.simultaneous_online_bonus.output_quality_before),
          output_quality_after: normalizeQuality(entry.simultaneous_online_bonus.output_quality_after),
        }
      : { applied: false },
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
        source_save_revision: entry.source_save_revision,
        source_inventory: entry.source_inventory,
        remaining: entry.quantity,
      });
    } else if (['withdraw', 'sell', 'consume', 'revert', 'separation_return'].includes(entry.action)) {
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
    if (entry.status !== 'committed' || !['deposit', 'compensate', 'withdraw', 'sell', 'consume', 'revert', 'separation_return'].includes(entry.action)) continue;
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

function buildDecorationSplitManifest(contract = {}) {
  const originAssets = normalizeOriginAssets(contract.origin_assets);
  return (Array.isArray(originAssets.decorations) ? originAssets.decorations : [])
    .map((item, index) => {
      const originUsername = normalizeUsername(item.origin_owner_username || item.source_owner_username || item.username);
      const originKey = normalizeUsernameKey(item.origin_owner_key || item.source_owner_key || originUsername);
      const decorationId = sanitizeText(item.decoration_id || item.item_id || item.id || `decoration_${index + 1}`, 100);
      return {
        manifest_id: `${originKey}:decoration:${decorationId}:${index}`,
        decoration_id: decorationId,
        decoration_label: sanitizeText(item.decoration_label || item.label || item.name || decorationId, 80),
        origin_owner_id: sanitizeText(item.origin_owner_id || item.source_owner_id, 80),
        origin_owner_username: originUsername,
        origin_owner_key: originKey,
        source_ledger_id: sanitizeText(item.ledger_id || item.source_ledger_id, 100),
        return_policy: 'record_only_waiting_personal_home_receipt',
        execution_status: 'preview_only',
      };
    })
    .filter(entry => entry.decoration_id && entry.origin_owner_username)
    .sort((left, right) => left.manifest_id.localeCompare(right.manifest_id))
    .slice(0, 120);
}

function hashDecorationSplitManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    manifest_id: entry.manifest_id,
    decoration_id: entry.decoration_id,
    origin_owner_id: entry.origin_owner_id,
    origin_owner_username: entry.origin_owner_username,
    source_ledger_id: entry.source_ledger_id,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(stableRows)).digest('hex');
}

function buildFamilyBuildingSplitManifest(contract = {}) {
  const ledger = normalizeFamilyBuildingLedger(contract);
  return ledger
    .filter(entry => entry.real_build_applied === true || entry.shared_warehouse_materials_consumed === true || entry.shared_fund_deducted === true)
    .map(entry => ({
      manifest_id: `family_building:${entry.id}`,
      building_ledger_id: entry.id,
      building_id: entry.building_id,
      project_id: entry.project_id,
      target_ref: entry.target_ref,
      fund_ledger_id: entry.fund_ledger_id,
      draft_id: entry.draft_id,
      amount: Math.max(0, Math.floor(Number(entry.amount) || 0)),
      shared_fund_deducted: entry.shared_fund_deducted === true,
      real_build_applied: entry.real_build_applied === true,
      shared_warehouse_materials_consumed: entry.shared_warehouse_materials_consumed === true,
      split_policy: 'record_only_waiting_building_rollback_or_manual_receipt',
      execution_status: 'preview_only',
    }))
    .sort((left, right) => left.manifest_id.localeCompare(right.manifest_id))
    .slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
}

function hashFamilyBuildingSplitManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    manifest_id: entry.manifest_id,
    building_ledger_id: entry.building_ledger_id,
    building_id: entry.building_id,
    target_ref: entry.target_ref,
    fund_ledger_id: entry.fund_ledger_id,
    amount: entry.amount,
    shared_fund_deducted: entry.shared_fund_deducted,
    real_build_applied: entry.real_build_applied,
    shared_warehouse_materials_consumed: entry.shared_warehouse_materials_consumed,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(stableRows)).digest('hex');
}

function summarizeDecorationSplitsByOwner(manifest = []) {
  const groups = new Map();
  for (const entry of Array.isArray(manifest) ? manifest : []) {
    const key = entry.origin_owner_key || normalizeUsernameKey(entry.origin_owner_username);
    if (!key) continue;
    const current = groups.get(key) || {
      origin_owner_id: entry.origin_owner_id,
      origin_owner_username: entry.origin_owner_username,
      origin_owner_key: key,
      decoration_count: 0,
      decoration_ids: [],
      return_status: 'recorded_waiting_personal_home_receipt',
    };
    current.decoration_count += 1;
    if (current.decoration_ids.length < 40) current.decoration_ids.push(entry.decoration_id);
    groups.set(key, current);
  }
  return [...groups.values()].slice(0, 80);
}

function summarizeBuildingSplitsByProject(manifest = []) {
  return (Array.isArray(manifest) ? manifest : []).map(entry => ({
    building_ledger_id: entry.building_ledger_id,
    building_id: entry.building_id,
    project_id: entry.project_id,
    target_ref: entry.target_ref,
    amount: Math.max(0, Math.floor(Number(entry.amount) || 0)),
    split_status: 'recorded_waiting_building_rollback_or_manual_receipt',
  })).filter(entry => entry.building_ledger_id).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
}

function buildSeparationAssetReturnLedger(preview = {}, actorMember = {}, payload = {}) {
  const assetReturn = preview.asset_return && typeof preview.asset_return === 'object' ? preview.asset_return : {};
  const plotManifest = Array.isArray(assetReturn.plot_return_manifest) ? assetReturn.plot_return_manifest : [];
  const decorationManifest = Array.isArray(assetReturn.decoration_split_manifest) ? assetReturn.decoration_split_manifest : [];
  const buildingManifest = Array.isArray(assetReturn.family_building_split_manifest) ? assetReturn.family_building_split_manifest : [];
  const plotsByOwner = Array.isArray(assetReturn.plots_by_origin_owner) ? assetReturn.plots_by_origin_owner : [];
  const warehouseReturns = Array.isArray(assetReturn.warehouse_items_by_origin_owner) ? assetReturn.warehouse_items_by_origin_owner : [];
  const fundReturns = Array.isArray(assetReturn.fund_contributions_by_origin_owner) ? assetReturn.fund_contributions_by_origin_owner : [];
  const plotReturnManifestHash = sanitizeText(assetReturn.plot_return_manifest_hash, 100) || hashPlotReturnManifest(plotManifest);
  const decorationSplitManifestHash = sanitizeText(assetReturn.decoration_split_manifest_hash, 100) || hashDecorationSplitManifest(decorationManifest);
  const buildingSplitManifestHash = sanitizeText(assetReturn.family_building_split_manifest_hash, 100) || hashFamilyBuildingSplitManifest(buildingManifest);
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
    decoration_split_manifest_hash: decorationSplitManifestHash,
    building_split_manifest_hash: buildingSplitManifestHash,
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
      quality: normalizeQuality(entry.quality),
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
    decoration_splits_by_origin_owner: summarizeDecorationSplitsByOwner(decorationManifest),
    building_splits_by_origin_owner: summarizeBuildingSplitsByProject(buildingManifest),
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

function restoreFarmPlotFromManifestSnapshot(snapshot = {}) {
  return {
    state: normalizePlotState(snapshot.state),
    cropId: sanitizeText(snapshot.crop_id ?? snapshot.cropId, 80) || null,
    growthDays: Math.max(0, Math.floor(Number(snapshot.growth_days ?? snapshot.growthDays) || 0)),
    watered: snapshot.watered === true,
    unwateredDays: Math.max(0, Math.floor(Number(snapshot.unwatered_days ?? snapshot.unwateredDays) || 0)),
    fertilizer: sanitizeText(snapshot.fertilizer, 80) || null,
    harvestCount: Math.max(0, Math.floor(Number(snapshot.harvest_count ?? snapshot.harvestCount) || 0)),
    giantCropGroup: snapshot.giant_crop_group === null || snapshot.giant_crop_group === undefined || snapshot.giant_crop_group === ''
      ? null
      : Math.max(0, Math.floor(Number(snapshot.giant_crop_group ?? snapshot.giantCropGroup) || 0)),
    infested: snapshot.infested === true,
    infestedDays: Math.max(0, Math.floor(Number(snapshot.infested_days ?? snapshot.infestedDays) || 0)),
    weedy: snapshot.weedy === true,
    weedyDays: Math.max(0, Math.floor(Number(snapshot.weedy_days ?? snapshot.weedyDays) || 0)),
  };
}

function groupPlotManifestByReturnTarget(manifest = []) {
  const groups = new Map();
  for (const entry of Array.isArray(manifest) ? manifest : []) {
    const username = normalizeUsername(entry.return_target_username || entry.origin_owner_username);
    const key = normalizeUsernameKey(username);
    if (!username || !key || entry.source_area !== 'field') continue;
    const current = groups.get(key) || {
      username,
      username_key: key,
      return_target_save_id: normalizeSaveId(entry.return_target_save_id || entry.origin_save_id),
      rows: [],
    };
    current.rows.push(entry);
    groups.set(key, current);
  }
  return [...groups.values()];
}

function writePersonalFarmPlotsFromManifest(group = {}, payload = {}) {
  const context = getActiveSaveContext(group.username, group.member?.save_slot ?? null, '分居返还目标账号没有可写入的桃源乡存档');
  context.username = group.username;
  const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
  if (group.return_target_save_id && identitySaveId && group.return_target_save_id !== identitySaveId) {
    throw createError(`分居返还目标存档不匹配：${group.username}`, 409);
  }
  if (!context.data.farm || typeof context.data.farm !== 'object') context.data.farm = {};
  if (!Array.isArray(context.data.farm.plots)) context.data.farm.plots = [];
  const beforeRevision = Number(context.saves.slots[context.slot]?.revision) || 0;
  const restoredPlotIds = [];
  for (const row of group.rows) {
    const sourcePlotId = normalizePlotId(row.source_plot_id, -1);
    if (sourcePlotId < 0) throw createError('分居返还清单包含无效田区 ID', 409);
    context.data.farm.plots[sourcePlotId] = restoreFarmPlotFromManifestSnapshot(row.plot_state_snapshot || {});
    restoredPlotIds.push(sourcePlotId);
  }
  const afterRevision = persistGameplayData(context);
  return {
    username: group.username,
    username_key: group.username_key,
    save_slot: context.slot,
    save_id: identitySaveId || group.return_target_save_id || 0,
    before_revision: beforeRevision,
    after_revision: afterRevision,
    restored_plot_count: restoredPlotIds.length,
    source_plot_ids: restoredPlotIds.sort((left, right) => left - right),
    idempotency_key: payload.idempotency_key,
    written_at: nowSeconds(),
  };
}

function writePersonalMoneyRefundsFromLedger(refunds = [], contract = {}, payload = {}, fundLedgerEntries = []) {
  const prepared = [];
  for (const refund of Array.isArray(refunds) ? refunds : []) {
    const username = normalizeUsername(refund.origin_owner_username);
    const amount = Math.max(0, Math.floor(Number(refund.suggested_refund_amount) || 0));
    if (!username || amount <= 0) continue;
    const usernameKey = normalizeUsernameKey(username);
    const member = (contract.members || []).find(entry =>
      entry.username_key === usernameKey || normalizeUsernameKey(entry.username) === usernameKey
    ) || null;
    const context = getActiveSaveContext(username, member?.save_slot ?? null, '分居共同基金返还目标账号没有可写入的桃源乡存档');
    context.username = username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    if (!projectedData.player || typeof projectedData.player !== 'object') projectedData.player = {};
    const beforeMoney = getPlayerMoney(projectedData);
    projectedData.player.money = beforeMoney + amount;
    const afterMoney = getPlayerMoney(projectedData);
    if (afterMoney !== beforeMoney + amount) throw createError(`分居共同基金返还个人铜币校验失败：${username}`, 500);
    const fundLedgerEntry = fundLedgerEntries.find(entry =>
      normalizeUsernameKey(entry.source_owner_username) === usernameKey || normalizeUsernameKey(entry.target_owner_username) === usernameKey
    ) || null;
    prepared.push({
      username,
      username_key: usernameKey,
      context,
      projectedData,
      save_id: identitySaveId,
      save_slot: normalizeSaveSlot(context.slot),
      before_revision: Number(context.saves.slots[context.slot]?.revision) || 0,
      refund_amount: amount,
      before_money: beforeMoney,
      after_money: afterMoney,
      fund_ledger_id: fundLedgerEntry?.id || '',
    });
  }
  return prepared.map(entry => {
    assignGameplayDataToContext(entry.context, entry.projectedData);
    const afterRevision = persistGameplayData(entry.context);
    return {
      username: entry.username,
      username_key: entry.username_key,
      save_slot: entry.save_slot,
      save_id: entry.save_id,
      before_revision: entry.before_revision,
      after_revision: afterRevision,
      refund_amount: entry.refund_amount,
      before_money: entry.before_money,
      after_money: entry.after_money,
      fund_ledger_id: entry.fund_ledger_id,
      idempotency_key: payload.idempotency_key,
      written_at: nowSeconds(),
    };
  });
}

function writePersonalInventoryReturnsFromLedger(rows = [], contract = {}, payload = {}, warehouseLedgerEntries = []) {
  const prepared = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const username = normalizeUsername(row.origin_owner_username);
    const itemId = normalizeWarehouseItemId(row.item_id);
    const quality = normalizeQuality(row.quality);
    const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));
    if (!username || !itemId || quantity <= 0) continue;
    const usernameKey = normalizeUsernameKey(username);
    const member = (contract.members || []).find(entry =>
      entry.username_key === usernameKey || normalizeUsernameKey(entry.username) === usernameKey
    ) || null;
    const context = getActiveSaveContext(username, member?.save_slot ?? null, '分居共同仓库返还目标账号没有可写入的桃源乡存档');
    context.username = username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    const beforeMoney = getPlayerMoney(projectedData);
    const addResult = addWithdrawnWarehouseItemToInventory(projectedData, itemId, quantity, quality);
    if (!addResult.ok) throw createError(`分居共同仓库返还目标背包空间不足：${username}`, 409);
    const afterMoney = getPlayerMoney(projectedData);
    if (afterMoney !== beforeMoney) throw createError(`分居共同仓库返还不会处理个人铜币：${username}`, 500);
    const warehouseLedgerEntry = warehouseLedgerEntries.find(entry =>
      normalizeUsernameKey(entry.target_owner_username) === usernameKey
      && entry.item_id === itemId
      && entry.quality === quality
    ) || null;
    prepared.push({
      username,
      username_key: usernameKey,
      context,
      projectedData,
      save_id: identitySaveId,
      save_slot: normalizeSaveSlot(context.slot),
      before_revision: Number(context.saves.slots[context.slot]?.revision) || 0,
      item_id: itemId,
      quality,
      returned_quantity: quantity,
      target_slots: addResult.target_slots,
      warehouse_ledger_id: warehouseLedgerEntry?.id || '',
    });
  }
  return prepared.map(entry => {
    assignGameplayDataToContext(entry.context, entry.projectedData);
    const afterRevision = persistGameplayData(entry.context);
    return {
      username: entry.username,
      username_key: entry.username_key,
      save_slot: entry.save_slot,
      save_id: entry.save_id,
      before_revision: entry.before_revision,
      after_revision: afterRevision,
      item_id: entry.item_id,
      quality: entry.quality,
      returned_quantity: entry.returned_quantity,
      target_slots: entry.target_slots,
      warehouse_ledger_id: entry.warehouse_ledger_id,
      idempotency_key: payload.idempotency_key,
      written_at: nowSeconds(),
    };
  });
}

function writePersonalStoryReceiptsFromResolution(contract = {}, ledger = {}, payload = {}) {
  const storyResolution = ledger.family_story_resolution || {};
  const acceptedMembers = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => ({
      ...member,
      username: normalizeUsername(member.username),
      username_key: normalizeUsernameKey(member.username_key || member.username),
    }))
    .filter(member => member.username);
  const writtenAt = nowSeconds();
  return acceptedMembers.map(member => {
    const context = getActiveSaveContext(member.username, member.save_slot ?? null, '分居个人剧情回执目标账号没有可写入的桃源乡存档');
    context.username = member.username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    if (!projectedData.onlineCohabitation || typeof projectedData.onlineCohabitation !== 'object') {
      projectedData.onlineCohabitation = {};
    }
    if (!Array.isArray(projectedData.onlineCohabitation.story_receipts)) {
      projectedData.onlineCohabitation.story_receipts = [];
    }
    const receiptId = `separation_story_${ledger.id}_${member.username_key}`;
    const existingIndex = projectedData.onlineCohabitation.story_receipts.findIndex(receipt =>
      receipt?.receipt_id === receiptId || (
        receipt?.contract_id === contract.id
        && receipt?.preview_id === ledger.preview_id
        && receipt?.execution_ledger_id === ledger.id
      )
    );
    const receipt = {
      receipt_id: receiptId,
      type: 'cohabitation_separation_personal_story',
      contract_id: contract.id,
      preview_id: ledger.preview_id,
      execution_ledger_id: ledger.id,
      relation_type: sanitizeText(storyResolution.relation_type || contract.type, 80),
      relation_label: sanitizeText(storyResolution.relation_label || (RELATION_TYPE_DEFS[contract.type] || {}).label || contract.type, 80),
      resolution_choice: sanitizeText(storyResolution.resolution_choice || 'peaceful_separation', 80),
      personal_story_state: 'receipt_recorded_only',
      privacy_boundary: '仅追加分居剧情回执；不改写 NPC、恋爱、家庭、孩子或资产状态。',
      memo: payload.memo,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
    if (existingIndex >= 0) {
      projectedData.onlineCohabitation.story_receipts[existingIndex] = {
        ...projectedData.onlineCohabitation.story_receipts[existingIndex],
        ...receipt,
      };
    } else {
      projectedData.onlineCohabitation.story_receipts.unshift(receipt);
    }
    projectedData.onlineCohabitation.story_receipts = projectedData.onlineCohabitation.story_receipts.slice(0, 20);
    assignGameplayDataToContext(context, projectedData);
    const beforeRevision = Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0));
    const afterRevision = persistGameplayData(context);
    return {
      username: member.username,
      username_key: member.username_key,
      save_slot: normalizeSaveSlot(context.slot),
      save_id: identitySaveId,
      before_revision: beforeRevision,
      after_revision: afterRevision,
      receipt_id: receipt.receipt_id,
      receipt_status: 'written',
      relation_type: receipt.relation_type,
      resolution_choice: receipt.resolution_choice,
      personal_story_state: receipt.personal_story_state,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
  });
}

function writePersonalFamilyReceiptsFromChildArrangement(contract = {}, ledger = {}, payload = {}) {
  const childArrangement = ledger.child_arrangement_resolution || {};
  const acceptedMembers = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => ({
      ...member,
      username: normalizeUsername(member.username),
      username_key: normalizeUsernameKey(member.username_key || member.username),
    }))
    .filter(member => member.username);
  const writtenAt = nowSeconds();
  return acceptedMembers.map(member => {
    const context = getActiveSaveContext(member.username, member.save_slot ?? null, '分居个人家庭回执目标账号没有可写入的桃源乡存档');
    context.username = member.username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    if (!projectedData.onlineCohabitation || typeof projectedData.onlineCohabitation !== 'object') {
      projectedData.onlineCohabitation = {};
    }
    if (!Array.isArray(projectedData.onlineCohabitation.family_receipts)) {
      projectedData.onlineCohabitation.family_receipts = [];
    }
    const receiptId = `separation_family_${ledger.id}_${member.username_key}`;
    const existingIndex = projectedData.onlineCohabitation.family_receipts.findIndex(receipt =>
      receipt?.receipt_id === receiptId || (
        receipt?.contract_id === contract.id
        && receipt?.preview_id === ledger.preview_id
        && receipt?.execution_ledger_id === ledger.id
      )
    );
    const receipt = {
      receipt_id: receiptId,
      type: 'cohabitation_separation_family_child_arrangement',
      contract_id: contract.id,
      preview_id: ledger.preview_id,
      execution_ledger_id: ledger.id,
      relation_type: sanitizeText(childArrangement.relation_type || contract.type, 80),
      arrangement_choice: sanitizeText(childArrangement.arrangement_choice || 'shared_care_pending_personal_saves', 100),
      arrangement_state: 'personal_family_receipt_recorded_only',
      child_count: Math.max(0, Math.floor(Number(childArrangement.child_count) || 0)),
      children_private: childArrangement.children_private !== false,
      privacy_boundary: '仅追加分居孩子安排回执；不改写孩子、家庭心愿、NPC、恋爱或资产状态。',
      memo: payload.memo,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
    if (existingIndex >= 0) {
      projectedData.onlineCohabitation.family_receipts[existingIndex] = {
        ...projectedData.onlineCohabitation.family_receipts[existingIndex],
        ...receipt,
      };
    } else {
      projectedData.onlineCohabitation.family_receipts.unshift(receipt);
    }
    projectedData.onlineCohabitation.family_receipts = projectedData.onlineCohabitation.family_receipts.slice(0, 20);
    assignGameplayDataToContext(context, projectedData);
    const beforeRevision = Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0));
    const afterRevision = persistGameplayData(context);
    return {
      username: member.username,
      username_key: member.username_key,
      save_slot: normalizeSaveSlot(context.slot),
      save_id: identitySaveId,
      before_revision: beforeRevision,
      after_revision: afterRevision,
      receipt_id: receipt.receipt_id,
      receipt_status: 'written',
      relation_type: receipt.relation_type,
      arrangement_choice: receipt.arrangement_choice,
      arrangement_state: receipt.arrangement_state,
      child_count: receipt.child_count,
      children_private: receipt.children_private,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
  });
}

function writePersonalRealDemolitionReceiptsFromFamilyBuilding(contract = {}, buildingEntry = {}, payload = {}) {
  const acceptedMembers = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => ({
      ...member,
      username: normalizeUsername(member.username),
      username_key: normalizeUsernameKey(member.username_key || member.username),
    }))
    .filter(member => member.username);
  const writtenAt = nowSeconds();
  return acceptedMembers.map(member => {
    const context = getActiveSaveContext(member.username, member.save_slot ?? null, '家族建筑真实拆除个人存档写回目标账号没有可写入的桃源乡存档');
    context.username = member.username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    const beforeRevision = Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0));
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    if (!projectedData.onlineCohabitation || typeof projectedData.onlineCohabitation !== 'object') {
      projectedData.onlineCohabitation = {};
    }
    if (!Array.isArray(projectedData.onlineCohabitation.real_build_demolition_receipts)) {
      projectedData.onlineCohabitation.real_build_demolition_receipts = [];
    }
    const receiptId = `family_building_demolition_${buildingEntry.id}_${member.username_key}`;
    const existingIndex = projectedData.onlineCohabitation.real_build_demolition_receipts.findIndex(receipt =>
      receipt?.receipt_id === receiptId || (
        receipt?.contract_id === contract.id
        && receipt?.building_ledger_id === buildingEntry.id
      )
    );
    const receipt = {
      receipt_id: receiptId,
      type: 'cohabitation_family_building_real_demolition',
      contract_id: contract.id,
      building_ledger_id: buildingEntry.id,
      building_id: sanitizeText(buildingEntry.building_id, 100),
      project_id: sanitizeText(buildingEntry.project_id, 100),
      target_ref: sanitizeText(buildingEntry.target_ref, 120),
      real_build_ref: sanitizeText(buildingEntry.real_build_ref, 120),
      demolition_state: 'personal_save_receipt_recorded',
      personal_asset_boundary: '仅追加真实拆除写回回执；不改个人铜币、背包、农田、NPC、家庭或孩子状态。',
      memo: payload.reason,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
    if (existingIndex >= 0) {
      projectedData.onlineCohabitation.real_build_demolition_receipts[existingIndex] = {
        ...projectedData.onlineCohabitation.real_build_demolition_receipts[existingIndex],
        ...receipt,
      };
    } else {
      projectedData.onlineCohabitation.real_build_demolition_receipts.unshift(receipt);
    }
    projectedData.onlineCohabitation.real_build_demolition_receipts = projectedData.onlineCohabitation.real_build_demolition_receipts.slice(0, 20);
    assignGameplayDataToContext(context, projectedData);
    const afterRevision = persistGameplayData(context);
    return {
      username: member.username,
      username_key: member.username_key,
      save_slot: normalizeSaveSlot(context.slot),
      save_id: identitySaveId,
      before_revision: beforeRevision,
      after_revision: afterRevision,
      receipt_id: receipt.receipt_id,
      receipt_status: 'written',
      real_build_ref: receipt.real_build_ref,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
  });
}

function resolveFamilyBuildingMainStateMutationTarget(data = {}, target = {}) {
  const selector = sanitizeText(target.delete_selector || target.exact_target_ref, 180);
  const candidatePath = sanitizeText(target.candidate_path, 100);
  if (!selector || !candidatePath || !(selector.startsWith(`${candidatePath}.`) || selector.startsWith(`${candidatePath}[`))) {
    throw createError('个人主状态变更 selector 必须位于已验证候选路径下', 409);
  }

  const childKey = selector.slice(candidatePath.length + 1);
  if (!childKey || childKey.includes('.') || childKey.includes('[') || childKey.includes(']')) {
    throw createError('个人主状态变更适配器第一版只支持候选路径下一层具体 ID', 409);
  }

  if (candidatePath === 'home.homeRenovationStates') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    if (!data.home.homeRenovationStates || typeof data.home.homeRenovationStates !== 'object' || Array.isArray(data.home.homeRenovationStates)) {
      data.home.homeRenovationStates = {};
    }
    if (data.home.homeRenovationStates[childKey] !== true) {
      throw createError('个人宅院改造目标不存在或已不是启用状态，不能执行真实删除', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'home',
      before_value: true,
      apply() {
        delete data.home.homeRenovationStates[childKey];
        return {
          mutation_result: 'home_renovation_removed',
          after_value: data.home.homeRenovationStates[childKey] === true,
        };
      },
    };
  }

  if (candidatePath === 'home.farmhouseLevel') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    if (!/^\d+$/.test(childKey)) {
      throw createError('个人农舍等级目标必须是当前等级数字', 409);
    }
    const currentLevel = Math.max(0, Math.floor(Number(data.home.farmhouseLevel) || 0));
    const targetLevel = Number(childKey);
    if (![1, 2, 3].includes(targetLevel) || targetLevel !== currentLevel) {
      throw createError('个人农舍等级目标与当前存档等级不一致，不能执行真实降级', 409);
    }
    const nextLevel = currentLevel - 1;
    const cellarSlotCount = Array.isArray(data.home.cellarSlots) ? data.home.cellarSlots.length : 0;
    if (currentLevel >= 3 && cellarSlotCount > 0) {
      throw createError('个人酒窖仍有陈酿槽，不能降级农舍等级', 409);
    }
    const renovationRequirements = {
      scholar_room: 2,
      tea_corner: 2,
      ancestral_display_wall: 3,
    };
    const activeRenovations = data.home.homeRenovationStates && typeof data.home.homeRenovationStates === 'object' && !Array.isArray(data.home.homeRenovationStates)
      ? Object.keys(data.home.homeRenovationStates).filter(id => data.home.homeRenovationStates[id] === true)
      : [];
    const blockingRenovations = activeRenovations.filter(id => (renovationRequirements[id] || 1) > nextLevel);
    if (blockingRenovations.length > 0) {
      throw createError('个人仍有高等级宅院改造启用，不能降级农舍等级', 409);
    }
    const pets = Array.isArray(data.animal?.pets)
      ? data.animal.pets
      : data.animal?.pet && typeof data.animal.pet === 'object'
        ? [data.animal.pet]
        : [];
    const projectStates = data.villageProject?.projectStates && typeof data.villageProject.projectStates === 'object'
      ? Object.values(data.villageProject.projectStates)
      : [];
    const completedVillageProjectCount = projectStates.filter(project => project?.completed === true || project?.status === 'completed').length;
    const nextPetCapacity = 1 + (nextLevel >= 2 ? 1 : 0) + (nextLevel >= 3 || completedVillageProjectCount >= 8 ? 1 : 0);
    if (pets.length > nextPetCapacity) {
      throw createError('个人宠物数量超过降级后的容量，不能降级农舍等级', 409);
    }
    return {
      target_id: String(targetLevel),
      target_kind: 'home_farmhouse_level',
      before_value: {
        farmhouseLevel: currentLevel,
        downgrade_to: nextLevel,
        cellarSlots: cellarSlotCount,
        activeRenovations: activeRenovations.length,
        petCount: pets.length,
        petCapacityAfter: nextPetCapacity,
      },
      apply() {
        data.home.farmhouseLevel = nextLevel;
        return {
          mutation_result: 'home_farmhouse_level_downgraded',
          after_value: {
            farmhouseLevel: data.home.farmhouseLevel,
            downgraded_from: currentLevel,
          },
        };
      },
    };
  }

  if (candidatePath === 'home.caveChoice') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    const currentChoice = sanitizeText(data.home.caveChoice || 'none', 40);
    if (!['mushroom', 'fruit_bat'].includes(childKey)) {
      throw createError('个人山洞用途目标只支持 mushroom 或 fruit_bat', 409);
    }
    if (currentChoice !== childKey) {
      throw createError('个人山洞用途目标与当前存档不一致，不能执行真实复位', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'home_cave_choice',
      before_value: currentChoice,
      apply() {
        data.home.caveChoice = 'none';
        return {
          mutation_result: 'home_cave_choice_reset',
          after_value: data.home.caveChoice,
        };
      },
    };
  }

  if (candidatePath === 'home.caveUnlocked') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    if (childKey !== 'true') {
      throw createError('个人山洞开放态目标只支持 true 窄 selector', 409);
    }
    if (data.home.caveUnlocked !== true) {
      throw createError('个人山洞开放态目标不存在或已关闭，不能执行真实复位', 409);
    }
    const currentChoice = sanitizeText(data.home.caveChoice || 'none', 40);
    if (currentChoice !== 'none') {
      throw createError('个人山洞用途尚未复位为 none，不能关闭山洞开放态', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'home_cave_unlocked',
      before_value: true,
      apply() {
        data.home.caveUnlocked = false;
        return {
          mutation_result: 'home_cave_unlocked_reset',
          after_value: data.home.caveUnlocked === true,
        };
      },
    };
  }

  if (candidatePath === 'home.cellarSlots') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    if (!Array.isArray(data.home.cellarSlots)) data.home.cellarSlots = [];
    if (!/^\d+$/.test(childKey)) {
      throw createError('个人酒窖陈酿槽目标必须是数组下标', 409);
    }
    const slotIndex = Number(childKey);
    if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || slotIndex >= data.home.cellarSlots.length) {
      throw createError('个人酒窖陈酿槽目标不存在或已为空，不能执行真实删除', 409);
    }
    const slot = data.home.cellarSlots[slotIndex];
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      throw createError('个人酒窖陈酿槽目标不是可审计的陈酿对象，不能执行真实删除', 409);
    }
    const beforeValue = {
      itemId: sanitizeText(slot.itemId, 80),
      quality: sanitizeText(slot.quality || 'normal', 30),
      daysAging: Math.max(0, Math.floor(Number(slot.daysAging) || 0)),
    };
    if (!beforeValue.itemId) {
      throw createError('个人酒窖陈酿槽缺少物品 ID，不能执行真实删除', 409);
    }
    return {
      target_id: String(slotIndex),
      target_kind: 'home_cellar_slot',
      before_value: beforeValue,
      apply() {
        data.home.cellarSlots.splice(slotIndex, 1);
        return {
          mutation_result: 'home_cellar_slot_removed',
          after_value: {
            removed_index: slotIndex,
            remaining_slots: data.home.cellarSlots.length,
          },
        };
      },
    };
  }

  if (candidatePath === 'home.greenhouseUnlocked') {
    if (!data.home || typeof data.home !== 'object') data.home = {};
    if (childKey !== 'true') {
      throw createError('个人温室解锁目标只支持 true 窄 selector', 409);
    }
    if (data.home.greenhouseUnlocked !== true) {
      throw createError('个人温室解锁目标不存在或已关闭，不能执行真实复位', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'home_greenhouse_unlocked',
      before_value: true,
      apply() {
        data.home.greenhouseUnlocked = false;
        return {
          mutation_result: 'home_greenhouse_unlocked_reset',
          after_value: data.home.greenhouseUnlocked === true,
        };
      },
    };
  }

  if (candidatePath === 'decoration.placed') {
    if (!data.decoration || typeof data.decoration !== 'object') data.decoration = {};
    if (!data.decoration.placed || typeof data.decoration.placed !== 'object' || Array.isArray(data.decoration.placed)) {
      data.decoration.placed = {};
    }
    const beforeCount = Math.max(0, Math.floor(Number(data.decoration.placed[childKey]) || 0));
    if (beforeCount <= 0) {
      throw createError('个人装饰放置目标不存在或已为空，不能执行真实删除', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'decoration',
      before_value: beforeCount,
      apply() {
        const nextCount = Math.max(0, beforeCount - 1);
        if (nextCount > 0) data.decoration.placed[childKey] = nextCount;
        else delete data.decoration.placed[childKey];
        return {
          mutation_result: 'decoration_placed_removed',
          after_value: nextCount,
        };
      },
    };
  }

  if (candidatePath === 'decoration.owned') {
    if (!data.decoration || typeof data.decoration !== 'object') data.decoration = {};
    if (!data.decoration.owned || typeof data.decoration.owned !== 'object' || Array.isArray(data.decoration.owned)) {
      data.decoration.owned = {};
    }
    if (!data.decoration.placed || typeof data.decoration.placed !== 'object' || Array.isArray(data.decoration.placed)) {
      data.decoration.placed = {};
    }
    const beforeCount = Math.max(0, Math.floor(Number(data.decoration.owned[childKey]) || 0));
    const placedCount = Math.max(0, Math.floor(Number(data.decoration.placed[childKey]) || 0));
    if (beforeCount <= 0) {
      throw createError('个人装饰拥有目标不存在或已为空，不能执行真实删除', 409);
    }
    if (beforeCount <= placedCount) {
      throw createError('个人装饰拥有目标没有未放置库存，不能只删除拥有数量', 409);
    }
    return {
      target_id: childKey,
      target_kind: 'decoration_owned',
      before_value: beforeCount,
      apply() {
        const nextCount = Math.max(0, beforeCount - 1);
        if (nextCount > 0) data.decoration.owned[childKey] = nextCount;
        else delete data.decoration.owned[childKey];
        return {
          mutation_result: 'decoration_owned_removed',
          after_value: nextCount,
        };
      },
    };
  }

  throw createError('个人主状态变更适配器第一版只支持农舍等级、宅院改造状态、山洞用途、山洞开放态、酒窖陈酿槽、温室解锁态、已放置装饰和未放置装饰库存目标', 409);
}

function applyFamilyBuildingMainStateExactMutationToPersonalSaves(contract = {}, buildingEntry = {}, payload = {}) {
  const exactTargets = Array.isArray(buildingEntry.real_build_demolition_main_state_exact_target_manifest)
    ? buildingEntry.real_build_demolition_main_state_exact_target_manifest
    : [];
  if (exactTargets.length === 0) throw createError('缺少可执行的个人主状态精确目标清单', 409);
  const writtenAt = nowSeconds();
  const preparedMutations = exactTargets.map(target => {
    const username = normalizeUsername(target.username);
    const usernameKey = normalizeUsernameKey(target.username_key || target.username);
    if (!username || !usernameKey) throw createError('个人主状态精确目标缺少成员信息', 409);
    const context = getActiveSaveContext(username, target.save_slot ?? null, '家族建筑真实拆除个人主状态变更目标账号没有可写入的桃源乡存档');
    context.username = username;
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    if (target.save_id && identitySaveId !== target.save_id) {
      throw createError('个人主状态变更目标 save_id 已漂移，请重新预览并解析目标', 409);
    }
    const beforeRevision = Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0));
    const projectedData = JSON.parse(JSON.stringify(context.data || {}));
    if (!projectedData.onlineCohabitation || typeof projectedData.onlineCohabitation !== 'object') {
      projectedData.onlineCohabitation = {};
    }
    if (!Array.isArray(projectedData.onlineCohabitation.real_build_main_state_mutation_receipts)) {
      projectedData.onlineCohabitation.real_build_main_state_mutation_receipts = [];
    }
    const receiptId = `family_building_main_state_mutation_${buildingEntry.id}_${usernameKey}`;
    const existingReceipt = projectedData.onlineCohabitation.real_build_main_state_mutation_receipts.find(receipt =>
      receipt?.receipt_id === receiptId || (
        receipt?.contract_id === contract.id
        && receipt?.building_ledger_id === buildingEntry.id
        && receipt?.idempotency_key === payload.idempotency_key
      )
    );
    if (existingReceipt) {
      return {
        already_written: true,
        username,
        username_key: usernameKey,
        save_slot: normalizeSaveSlot(context.slot),
        save_id: identitySaveId,
        before_revision: beforeRevision,
        after_revision: beforeRevision,
        receipt_id: receiptId,
        receipt_status: 'already_written',
        delete_selector: sanitizeText(target.delete_selector, 180),
        target_kind: sanitizeText(target.target_kind, 40),
        mutation_result: sanitizeText(existingReceipt.mutation_result, 80) || 'already_applied',
        idempotency_key: payload.idempotency_key,
        written_at: Math.max(0, Math.floor(Number(existingReceipt.written_at) || writtenAt)),
      };
    }
    const adapterTarget = resolveFamilyBuildingMainStateMutationTarget(projectedData, target);
    return {
      already_written: false,
      username,
      username_key: usernameKey,
      save_slot: normalizeSaveSlot(context.slot),
      save_id: identitySaveId,
      before_revision: beforeRevision,
      context,
      projectedData,
      adapterTarget,
      target,
      receipt_id: receiptId,
    };
  });

  return preparedMutations.map(prepared => {
    if (prepared.already_written) return prepared;
    const {
      username,
      username_key: usernameKey,
      save_slot: saveSlot,
      save_id: saveId,
      before_revision: beforeRevision,
      context,
      projectedData,
      adapterTarget,
      target,
      receipt_id: receiptId,
    } = prepared;
    const mutation = adapterTarget.apply();
    const receipt = {
      receipt_id: receiptId,
      type: 'cohabitation_family_building_real_demolition_main_state_mutation',
      contract_id: contract.id,
      building_ledger_id: buildingEntry.id,
      real_build_ref: sanitizeText(buildingEntry.real_build_ref, 120),
      delete_selector: sanitizeText(target.delete_selector, 180),
      target_kind: adapterTarget.target_kind,
      target_id: adapterTarget.target_id,
      before_value: adapterTarget.before_value,
      after_value: mutation.after_value,
      mutation_result: mutation.mutation_result,
      personal_asset_boundary: '仅删除已解析的个人 home / decoration 主状态目标；不改个人铜币、背包、农田、NPC、家庭或孩子状态。',
      memo: payload.reason,
      idempotency_key: payload.idempotency_key,
      written_at: writtenAt,
    };
    projectedData.onlineCohabitation.real_build_main_state_mutation_receipts.unshift(receipt);
    projectedData.onlineCohabitation.real_build_main_state_mutation_receipts = projectedData.onlineCohabitation.real_build_main_state_mutation_receipts.slice(0, 20);
    assignGameplayDataToContext(context, projectedData);
    const afterRevision = persistGameplayData(context);
    return {
      username,
      username_key: usernameKey,
      save_slot: saveSlot,
      save_id: saveId,
      before_revision: beforeRevision,
      after_revision: afterRevision,
      receipt_id: receiptId,
      receipt_status: 'written',
      delete_selector: receipt.delete_selector,
      target_kind: receipt.target_kind,
      mutation_result: receipt.mutation_result,
      idempotency_key: payload.idempotency_key,
      written_at: receipt.written_at,
    };
  });
}

function hashStableObject(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function summarizeMainStateCountMap(value) {
  if (Array.isArray(value)) {
    return {
      count: value.length,
      keys: value.map((_, index) => String(index)).slice(0, 80),
    };
  }
  if (!value || typeof value !== 'object') {
    return {
      count: 0,
      keys: [],
    };
  }
  const entries = Object.entries(value)
    .map(([key, rawQuantity]) => ({
      key: sanitizeText(key, 80),
      quantity: Math.max(0, Math.floor(Number(rawQuantity) || 0)),
    }))
    .filter(entry => entry.key && entry.quantity > 0)
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(0, 80);
  return {
    count: entries.reduce((sum, entry) => sum + entry.quantity, 0),
    keys: entries.map(entry => entry.key),
  };
}

function sanitizeFamilyBuildingMainStateCandidateSnapshot(snapshot = {}) {
  const home = snapshot && typeof snapshot.home === 'object' && !Array.isArray(snapshot.home) ? snapshot.home : {};
  const decoration = snapshot && typeof snapshot.decoration === 'object' && !Array.isArray(snapshot.decoration) ? snapshot.decoration : {};
  const onlineCohabitation = snapshot && typeof snapshot.onlineCohabitation === 'object' && !Array.isArray(snapshot.onlineCohabitation)
    ? snapshot.onlineCohabitation
    : {};
  return {
    home: {
      farmhouseLevel: Number.isFinite(Number(home.farmhouseLevel)) ? Math.max(0, Math.floor(Number(home.farmhouseLevel))) : null,
      caveChoice: sanitizeText(home.caveChoice, 40) || null,
      caveUnlocked: home.caveUnlocked === true,
      greenhouseUnlocked: home.greenhouseUnlocked === true,
      cellarSlots: Math.max(0, Math.floor(Number(home.cellarSlots) || 0)),
      homeRenovationStateKeys: Array.isArray(home.homeRenovationStateKeys)
        ? home.homeRenovationStateKeys.map(key => sanitizeText(key, 80)).filter(Boolean).slice(0, 80)
        : [],
    },
    decoration: {
      ownedCount: Math.max(0, Math.floor(Number(decoration.ownedCount) || 0)),
      ownedKeys: Array.isArray(decoration.ownedKeys)
        ? decoration.ownedKeys.map(key => sanitizeText(key, 80)).filter(Boolean).slice(0, 80)
        : [],
      placedCount: Math.max(0, Math.floor(Number(decoration.placedCount) || 0)),
      placedKeys: Array.isArray(decoration.placedKeys)
        ? decoration.placedKeys.map(key => sanitizeText(key, 80)).filter(Boolean).slice(0, 80)
        : [],
    },
    onlineCohabitation: {
      realBuildDemolitionReceiptCount: Math.max(0, Math.floor(Number(onlineCohabitation.realBuildDemolitionReceiptCount) || 0)),
    },
  };
}

function buildFamilyBuildingRealDemolitionMainStateManifest(contract = {}, buildingEntry = {}) {
  const acceptedMembers = (contract.members || [])
    .filter(member => member.status === 'accepted')
    .map(member => ({
      ...member,
      username: normalizeUsername(member.username),
      username_key: normalizeUsernameKey(member.username_key || member.username),
    }))
    .filter(member => member.username);
  return acceptedMembers.map(member => {
    const context = getActiveSaveContext(member.username, member.save_slot ?? null, '家族建筑真实拆除个人主状态预览目标账号没有可读取的桃源乡存档');
    const data = context.data || {};
    const ownedDecorationSummary = summarizeMainStateCountMap(data.decoration?.owned);
    const placedDecorationSummary = summarizeMainStateCountMap(data.decoration?.placed);
    const candidateSnapshot = {
      home: {
        farmhouseLevel: data.home?.farmhouseLevel ?? null,
        caveChoice: data.home?.caveChoice ?? null,
        caveUnlocked: data.home?.caveUnlocked === true,
        greenhouseUnlocked: data.home?.greenhouseUnlocked === true,
        cellarSlots: Array.isArray(data.home?.cellarSlots) ? data.home.cellarSlots.length : 0,
        homeRenovationStateKeys: data.home?.homeRenovationStates && typeof data.home.homeRenovationStates === 'object'
          ? Object.keys(data.home.homeRenovationStates).sort().slice(0, 80)
          : [],
      },
      decoration: {
        ownedCount: ownedDecorationSummary.count,
        ownedKeys: ownedDecorationSummary.keys,
        placedCount: placedDecorationSummary.count,
        placedKeys: placedDecorationSummary.keys,
      },
      onlineCohabitation: {
        realBuildDemolitionReceiptCount: Array.isArray(data.onlineCohabitation?.real_build_demolition_receipts)
          ? data.onlineCohabitation.real_build_demolition_receipts.length
          : 0,
      },
    };
    const identitySaveId = normalizeSaveId(context.identity?.save_id || context.identity?.saveId);
    return {
      username: member.username,
      username_key: member.username_key,
      save_slot: normalizeSaveSlot(context.slot),
      save_id: identitySaveId,
      before_revision: Math.max(0, Math.floor(Number(context.saves.slots[context.slot]?.revision) || 0)),
      real_build_ref: sanitizeText(buildingEntry.real_build_ref, 120),
      building_ledger_id: sanitizeText(buildingEntry.id, 100),
      building_id: sanitizeText(buildingEntry.building_id, 80),
      project_id: sanitizeText(buildingEntry.project_id, 80),
      candidate_paths: [
        'home.farmhouseLevel',
        'home.caveChoice',
        'home.caveUnlocked',
        'home.greenhouseUnlocked',
        'home.cellarSlots',
        'home.homeRenovationStates',
        'decoration.owned',
        'decoration.placed',
      ],
      mapping_status: 'blocked_missing_personal_building_binding',
      mutation_enabled: false,
      blocked_reason: 'real_build_ref 只指向家族建筑流水，未绑定个人 home / decoration 具体字段；本步骤禁止自动删除个人房屋或建筑主状态。',
      candidate_snapshot: candidateSnapshot,
      snapshot_hash: hashStableObject(candidateSnapshot),
    };
  });
}

function hashFamilyBuildingRealDemolitionMainStateManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    username_key: entry.username_key,
    save_slot: entry.save_slot,
    save_id: entry.save_id,
    before_revision: entry.before_revision,
    real_build_ref: entry.real_build_ref,
    building_ledger_id: entry.building_ledger_id,
    building_id: entry.building_id,
    project_id: entry.project_id,
    mapping_status: entry.mapping_status,
    mutation_enabled: entry.mutation_enabled,
    candidate_paths: entry.candidate_paths,
    snapshot_hash: entry.snapshot_hash,
  }));
  return hashStableObject(stableRows);
}

function buildFamilyBuildingRealDemolitionMainStateMappingManifest(previewManifest = [], requestMappings = []) {
  const previewRows = Array.isArray(previewManifest) ? previewManifest : [];
  if (previewRows.length === 0) throw createError('请先生成个人主状态预览清单，再记录映射证明', 409);
  if (!Array.isArray(requestMappings) || requestMappings.length !== previewRows.length) {
    throw createError('个人主状态映射证明必须覆盖全部已接受成员', 400);
  }
  const mappingByUser = new Map(requestMappings.map(item => [normalizeUsernameKey(item.username_key || item.username), item]));
  const result = [];
  const seen = new Set();
  for (const row of previewRows) {
    const rowKey = normalizeUsernameKey(row.username_key || row.username);
    const mapping = mappingByUser.get(rowKey);
    if (!mapping) throw createError('个人主状态映射证明缺少成员绑定', 400);
    if (seen.has(rowKey)) throw createError('个人主状态映射证明包含重复成员', 400);
    seen.add(rowKey);
    const candidatePaths = Array.isArray(row.candidate_paths) ? row.candidate_paths : [];
    if (!candidatePaths.includes(mapping.candidate_path)) {
      throw createError('个人主状态映射证明引用了预览清单外的候选路径', 409);
    }
    if (mapping.real_build_ref !== row.real_build_ref) {
      throw createError('个人主状态映射证明的 real_build_ref 与预览清单不一致', 409);
    }
    if (mapping.save_slot !== row.save_slot || mapping.save_id !== row.save_id) {
      throw createError('个人主状态映射证明的存档槽位或 save_id 与预览清单不一致', 409);
    }
    if (mapping.snapshot_hash !== row.snapshot_hash) {
      throw createError('个人主状态预览快照 hash 已漂移，请重新生成预览', 409);
    }
    result.push({
      username: row.username,
      username_key: rowKey,
      save_slot: row.save_slot,
      save_id: row.save_id,
      real_build_ref: row.real_build_ref,
      building_ledger_id: row.building_ledger_id,
      candidate_path: mapping.candidate_path,
      binding_ref: mapping.binding_ref,
      snapshot_hash: row.snapshot_hash,
      mapping_status: 'verified_personal_binding_pending_mutation',
      mutation_enabled: false,
    });
  }
  return result;
}

function hashFamilyBuildingRealDemolitionMainStateMappingManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    username_key: entry.username_key,
    save_slot: entry.save_slot,
    save_id: entry.save_id,
    real_build_ref: entry.real_build_ref,
    building_ledger_id: entry.building_ledger_id,
    candidate_path: entry.candidate_path,
    binding_ref: entry.binding_ref,
    snapshot_hash: entry.snapshot_hash,
    mapping_status: entry.mapping_status,
    mutation_enabled: entry.mutation_enabled,
  }));
  return hashStableObject(stableRows);
}

function buildFamilyBuildingRealDemolitionMainStateGuardManifest(mappingManifest = []) {
  const mappingRows = Array.isArray(mappingManifest) ? mappingManifest : [];
  if (mappingRows.length === 0) throw createError('请先完成个人主状态映射证明，再记录变更安全阀', 409);
  return mappingRows.map(row => ({
    username: row.username,
    username_key: normalizeUsernameKey(row.username_key || row.username),
    save_slot: normalizeSaveSlot(row.save_slot),
    save_id: normalizeSaveId(row.save_id),
    real_build_ref: sanitizeText(row.real_build_ref, 120),
    building_ledger_id: sanitizeText(row.building_ledger_id, 100),
    candidate_path: sanitizeText(row.candidate_path, 100),
    binding_ref: sanitizeText(row.binding_ref, 160),
    snapshot_hash: sanitizeText(row.snapshot_hash, 100),
    guard_status: 'confirmed_pending_personal_main_state_mutation',
    compensation_required: true,
    rollback_required: true,
    mutation_enabled: false,
  })).filter(item => item.username && item.binding_ref && item.candidate_path);
}

function hashFamilyBuildingRealDemolitionMainStateGuardManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    username_key: entry.username_key,
    save_slot: entry.save_slot,
    save_id: entry.save_id,
    real_build_ref: entry.real_build_ref,
    building_ledger_id: entry.building_ledger_id,
    candidate_path: entry.candidate_path,
    binding_ref: entry.binding_ref,
    snapshot_hash: entry.snapshot_hash,
    guard_status: entry.guard_status,
    compensation_required: entry.compensation_required,
    rollback_required: entry.rollback_required,
    mutation_enabled: entry.mutation_enabled,
  }));
  return hashStableObject(stableRows);
}

function getFamilyBuildingMainStateTargetKindForCandidatePath(candidatePath = '') {
  if (String(candidatePath).startsWith('home.')) return 'home';
  if (String(candidatePath).startsWith('decoration.')) return 'decoration';
  return '';
}

function parseFamilyBuildingMainStateExactSelector(candidatePath = '', selector = '', fieldLabel = 'selector') {
  const normalizedCandidatePath = sanitizeText(candidatePath, 100);
  const normalizedSelector = sanitizeText(selector, 180);
  if (!normalizedCandidatePath || !normalizedSelector || !normalizedSelector.startsWith(`${normalizedCandidatePath}.`)) {
    throw createError(`个人主状态变更 ${fieldLabel} 必须位于已验证候选路径下`, 409);
  }
  const childKey = normalizedSelector.slice(normalizedCandidatePath.length + 1);
  if (!/^[a-z0-9_:-]{1,80}$/i.test(childKey)) {
    throw createError(`个人主状态变更 ${fieldLabel} 只能指向候选路径下一层安全 ID`, 409);
  }
  return childKey;
}

function assertFamilyBuildingMainStateTargetKindMatchesCandidatePath(candidatePath = '', targetKind = '') {
  const expectedKind = getFamilyBuildingMainStateTargetKindForCandidatePath(candidatePath);
  const normalizedKind = sanitizeText(targetKind, 40);
  if (!expectedKind) throw createError('个人主状态精确目标候选路径暂不支持真实变更', 409);
  if (normalizedKind && normalizedKind !== expectedKind) {
    throw createError('个人主状态精确目标 target_kind 与候选路径不一致', 409);
  }
  return expectedKind;
}

function buildFamilyBuildingRealDemolitionMainStateExactTargetManifest(guardManifest = [], requestTargets = []) {
  const guardRows = Array.isArray(guardManifest) ? guardManifest : [];
  if (guardRows.length === 0) throw createError('请先确认个人主状态变更安全阀，再绑定精确目标', 409);
  if (!Array.isArray(requestTargets) || requestTargets.length !== guardRows.length) {
    throw createError('个人主状态精确目标必须覆盖全部安全阀清单成员', 400);
  }
  const targetByKey = new Map(requestTargets.map(item => [
    `${normalizeUsernameKey(item.username_key || item.username)}::${sanitizeText(item.candidate_path, 100)}`,
    item,
  ]));
  const result = [];
  const seen = new Set();
  for (const row of guardRows) {
    const rowKey = normalizeUsernameKey(row.username_key || row.username);
    const candidatePath = sanitizeText(row.candidate_path, 100);
    const key = `${rowKey}::${candidatePath}`;
    const target = targetByKey.get(key);
    if (!target) throw createError('个人主状态精确目标缺少成员或候选路径绑定', 400);
    if (seen.has(key)) throw createError('个人主状态精确目标包含重复成员路径', 400);
    seen.add(key);
    if (target.real_build_ref !== row.real_build_ref) {
      throw createError('个人主状态精确目标的 real_build_ref 与安全阀清单不一致', 409);
    }
    if (target.save_slot !== row.save_slot || target.save_id !== row.save_id) {
      throw createError('个人主状态精确目标的存档槽位或 save_id 与安全阀清单不一致', 409);
    }
    if (target.binding_ref !== row.binding_ref) {
      throw createError('个人主状态精确目标的绑定证明与安全阀清单不一致', 409);
    }
    if (target.snapshot_hash !== row.snapshot_hash) {
      throw createError('个人主状态精确目标快照 hash 已漂移，请重新生成预览', 409);
    }
    const exactTargetRef = sanitizeText(target.exact_target_ref, 180);
    const deleteSelector = sanitizeText(target.delete_selector, 180);
    const exactTargetChildKey = parseFamilyBuildingMainStateExactSelector(candidatePath, exactTargetRef, 'exact_target_ref');
    const deleteSelectorChildKey = parseFamilyBuildingMainStateExactSelector(candidatePath, deleteSelector, 'delete_selector');
    if (exactTargetChildKey !== deleteSelectorChildKey) {
      throw createError('个人主状态精确目标的 exact_target_ref 与 delete_selector 必须指向同一个目标', 409);
    }
    const targetKind = sanitizeText(target.target_kind, 40) || getFamilyBuildingMainStateTargetKindForCandidatePath(candidatePath);
    assertFamilyBuildingMainStateTargetKindMatchesCandidatePath(candidatePath, targetKind);
    result.push({
      username: row.username,
      username_key: rowKey,
      save_slot: row.save_slot,
      save_id: row.save_id,
      real_build_ref: row.real_build_ref,
      building_ledger_id: row.building_ledger_id,
      candidate_path: candidatePath,
      binding_ref: row.binding_ref,
      snapshot_hash: row.snapshot_hash,
      exact_target_ref: exactTargetRef,
      delete_selector: deleteSelector,
      target_kind: targetKind,
      target_status: 'exact_target_bound_pending_execute',
      mutation_enabled: false,
    });
  }
  return result;
}

function hashFamilyBuildingRealDemolitionMainStateExactTargetManifest(manifest = []) {
  const stableRows = (Array.isArray(manifest) ? manifest : []).map(entry => ({
    username_key: entry.username_key,
    save_slot: entry.save_slot,
    save_id: entry.save_id,
    real_build_ref: entry.real_build_ref,
    building_ledger_id: entry.building_ledger_id,
    candidate_path: entry.candidate_path,
    binding_ref: entry.binding_ref,
    snapshot_hash: entry.snapshot_hash,
    exact_target_ref: entry.exact_target_ref,
    delete_selector: entry.delete_selector,
    target_kind: entry.target_kind,
    target_status: entry.target_status,
    mutation_enabled: entry.mutation_enabled,
  }));
  return hashStableObject(stableRows);
}

function isUnresolvedFamilyBuildingRealDemolitionMainStateExactTarget(item = {}) {
  return !item.exact_target_ref
    || !item.delete_selector
    || String(item.exact_target_ref).includes('.ui_exact_target_')
    || String(item.exact_target_ref).includes('.qa_exact_target_')
    || String(item.delete_selector).includes('.ui_exact_target_')
    || String(item.delete_selector).includes('.qa_exact_target_');
}

function buildFamilyBuildingRealDemolitionMainStateResolvedExactTargetManifest(currentManifest = [], requestTargets = []) {
  const currentRows = Array.isArray(currentManifest) ? currentManifest : [];
  if (currentRows.length === 0) throw createError('缺少待人工解析的个人主状态精确目标清单', 409);
  if (!Array.isArray(requestTargets) || requestTargets.length !== currentRows.length) {
    throw createError('个人主状态精确目标人工解析必须覆盖全部目标成员', 400);
  }
  const targetByKey = new Map(requestTargets.map(item => [
    `${item.username_key}:${item.save_slot ?? 'active'}:${item.real_build_ref}:${item.candidate_path}`,
    item,
  ]));
  return currentRows.map(row => {
    const rowKey = `${row.username_key}:${row.save_slot ?? 'active'}:${row.real_build_ref}:${row.candidate_path}`;
    const target = targetByKey.get(rowKey);
    if (!target) throw createError('个人主状态精确目标人工解析缺少成员或候选路径对应项', 400);
    if (target.save_id !== row.save_id) throw createError('个人主状态精确目标人工解析 save_id 已漂移，请重新预览', 409);
    if (target.binding_ref !== row.binding_ref) throw createError('个人主状态精确目标人工解析绑定证明不匹配', 409);
    if (target.snapshot_hash !== row.snapshot_hash) throw createError('个人主状态精确目标人工解析快照 hash 已漂移，请重新生成预览', 409);
    const candidatePath = sanitizeText(row.candidate_path, 100);
    const exactTargetRef = sanitizeText(target.exact_target_ref, 180);
    const deleteSelector = sanitizeText(target.delete_selector, 180);
    const exactTargetChildKey = parseFamilyBuildingMainStateExactSelector(candidatePath, exactTargetRef, 'exact_target_ref');
    const deleteSelectorChildKey = parseFamilyBuildingMainStateExactSelector(candidatePath, deleteSelector, 'delete_selector');
    if (exactTargetChildKey !== deleteSelectorChildKey) {
      throw createError('人工解析后的个人主状态 exact_target_ref 与 delete_selector 必须指向同一个目标', 409);
    }
    if (isUnresolvedFamilyBuildingRealDemolitionMainStateExactTarget({
      exact_target_ref: exactTargetRef,
      delete_selector: deleteSelector,
    })) {
      throw createError('人工解析后的个人主状态精确目标不能继续使用前端或 QA 占位 selector', 409);
    }
    if (!target.resolution_proof) throw createError('人工解析个人主状态精确目标需要 resolution_proof', 400);
    const targetKind = sanitizeText(target.target_kind, 40) || row.target_kind;
    assertFamilyBuildingMainStateTargetKindMatchesCandidatePath(candidatePath, targetKind);
    return {
      ...row,
      exact_target_ref: exactTargetRef,
      delete_selector: deleteSelector,
      target_kind: targetKind,
      target_status: 'exact_target_resolved_pending_adapter',
      mutation_enabled: false,
    };
  });
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
    status: ['asset_return_recorded', 'personal_save_written', 'shared_fund_refunded', 'shared_warehouse_returned', 'decorations_buildings_split', 'family_story_resolved', 'personal_story_receipts_written', 'child_arrangement_resolved', 'personal_family_receipts_written', 'compensated', 'reverted'].includes(entry.status)
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
          quality: normalizeQuality(item.quality),
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
    decoration_split_manifest_hash: sanitizeText(entry.decoration_split_manifest_hash, 100),
    building_split_manifest_hash: sanitizeText(entry.building_split_manifest_hash, 100),
    decoration_splits_by_origin_owner: Array.isArray(entry.decoration_splits_by_origin_owner)
      ? entry.decoration_splits_by_origin_owner.map(item => ({
          origin_owner_id: sanitizeText(item.origin_owner_id, 80),
          origin_owner_username: normalizeUsername(item.origin_owner_username),
          origin_owner_key: normalizeUsernameKey(item.origin_owner_key || item.origin_owner_username),
          decoration_count: Math.max(0, Math.floor(Number(item.decoration_count) || 0)),
          decoration_ids: Array.isArray(item.decoration_ids) ? item.decoration_ids.map(id => sanitizeText(id, 100)).filter(Boolean).slice(0, 40) : [],
          return_status: sanitizeText(item.return_status, 80) || 'recorded_waiting_personal_home_receipt',
        })).filter(item => item.origin_owner_username && item.decoration_count > 0).slice(0, 80)
      : [],
    building_splits_by_origin_owner: Array.isArray(entry.building_splits_by_origin_owner)
      ? entry.building_splits_by_origin_owner.map(item => ({
          building_ledger_id: sanitizeText(item.building_ledger_id, 100),
          building_id: sanitizeText(item.building_id, 80),
          project_id: sanitizeText(item.project_id, 80),
          target_ref: sanitizeText(item.target_ref, 120),
          amount: Math.max(0, Math.floor(Number(item.amount) || 0)),
          split_status: sanitizeText(item.split_status, 100) || 'recorded_waiting_building_rollback_or_manual_receipt',
        })).filter(item => item.building_ledger_id).slice(0, FAMILY_BUILDING_LEDGER_LIMIT)
      : [],
    decorations_buildings_split: entry.decorations_buildings_split === true,
    decorations_buildings_split_idempotency_key: sanitizeText(entry.decorations_buildings_split_idempotency_key, 120),
    decorations_buildings_split_at: Math.max(0, Math.floor(Number(entry.decorations_buildings_split_at) || 0)),
    decorations_buildings_split_by: normalizeUsername(entry.decorations_buildings_split_by),
    decoration_building_split_receipts: Array.isArray(entry.decoration_building_split_receipts)
      ? entry.decoration_building_split_receipts.map(item => ({
          receipt_id: sanitizeText(item.receipt_id, 120),
          receipt_type: sanitizeText(item.receipt_type, 80),
          count: Math.max(0, Math.floor(Number(item.count) || 0)),
          manifest_hash: sanitizeText(item.manifest_hash, 100),
          status: sanitizeText(item.status, 80) || 'recorded_only',
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          recorded_at: Math.max(0, Math.floor(Number(item.recorded_at) || 0)),
        })).filter(item => item.receipt_id).slice(0, 20)
      : [],
    personal_money_merged: entry.personal_money_merged === true,
    personal_save_written: entry.personal_save_written === true,
    personal_save_write_idempotency_key: sanitizeText(entry.personal_save_write_idempotency_key, 120),
    personal_save_written_at: Math.max(0, Math.floor(Number(entry.personal_save_written_at) || 0)),
    personal_save_written_by: normalizeUsername(entry.personal_save_written_by),
    personal_save_receipts: Array.isArray(entry.personal_save_receipts)
      ? entry.personal_save_receipts.map(item => ({
          username: normalizeUsername(item.username),
          username_key: normalizeUsernameKey(item.username_key || item.username),
          save_slot: normalizeSaveSlot(item.save_slot),
          save_id: normalizeSaveId(item.save_id),
          before_revision: Math.max(0, Math.floor(Number(item.before_revision) || 0)),
          after_revision: Math.max(0, Math.floor(Number(item.after_revision) || 0)),
          restored_plot_count: Math.max(0, Math.floor(Number(item.restored_plot_count) || 0)),
          source_plot_ids: Array.isArray(item.source_plot_ids) ? item.source_plot_ids.map(id => normalizePlotId(id, 0)).slice(0, 120) : [],
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          written_at: Math.max(0, Math.floor(Number(item.written_at) || 0)),
        })).filter(item => item.username && item.restored_plot_count > 0).slice(0, 20)
      : [],
    shared_fund_refunded: entry.shared_fund_refunded === true,
    shared_fund_refund_idempotency_key: sanitizeText(entry.shared_fund_refund_idempotency_key, 120),
    shared_fund_refunded_at: Math.max(0, Math.floor(Number(entry.shared_fund_refunded_at) || 0)),
    shared_fund_refunded_by: normalizeUsername(entry.shared_fund_refunded_by),
    shared_fund_refund_total: Math.max(0, Math.floor(Number(entry.shared_fund_refund_total) || 0)),
    shared_fund_balance_before: Math.max(0, Math.floor(Number(entry.shared_fund_balance_before) || 0)),
    shared_fund_balance_after: Math.max(0, Math.floor(Number(entry.shared_fund_balance_after) || 0)),
    shared_fund_refund_receipts: Array.isArray(entry.shared_fund_refund_receipts)
      ? entry.shared_fund_refund_receipts.map(item => ({
          username: normalizeUsername(item.username),
          username_key: normalizeUsernameKey(item.username_key || item.username),
          save_slot: normalizeSaveSlot(item.save_slot),
          save_id: normalizeSaveId(item.save_id),
          before_revision: Math.max(0, Math.floor(Number(item.before_revision) || 0)),
          after_revision: Math.max(0, Math.floor(Number(item.after_revision) || 0)),
          refund_amount: Math.max(0, Math.floor(Number(item.refund_amount) || 0)),
          before_money: Math.max(0, Math.floor(Number(item.before_money) || 0)),
          after_money: Math.max(0, Math.floor(Number(item.after_money) || 0)),
          fund_ledger_id: sanitizeText(item.fund_ledger_id, 100),
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          written_at: Math.max(0, Math.floor(Number(item.written_at) || 0)),
        })).filter(item => item.username && item.refund_amount > 0).slice(0, 20)
      : [],
    shared_warehouse_returned: entry.shared_warehouse_returned === true,
    shared_warehouse_return_idempotency_key: sanitizeText(entry.shared_warehouse_return_idempotency_key, 120),
    shared_warehouse_returned_at: Math.max(0, Math.floor(Number(entry.shared_warehouse_returned_at) || 0)),
    shared_warehouse_returned_by: normalizeUsername(entry.shared_warehouse_returned_by),
    shared_warehouse_return_total_quantity: Math.max(0, Math.floor(Number(entry.shared_warehouse_return_total_quantity) || 0)),
    shared_warehouse_return_receipts: Array.isArray(entry.shared_warehouse_return_receipts)
      ? entry.shared_warehouse_return_receipts.map(item => ({
          username: normalizeUsername(item.username),
          username_key: normalizeUsernameKey(item.username_key || item.username),
          save_slot: normalizeSaveSlot(item.save_slot),
          save_id: normalizeSaveId(item.save_id),
          before_revision: Math.max(0, Math.floor(Number(item.before_revision) || 0)),
          after_revision: Math.max(0, Math.floor(Number(item.after_revision) || 0)),
          item_id: normalizeWarehouseItemId(item.item_id),
          quality: normalizeQuality(item.quality),
          returned_quantity: Math.max(0, Math.floor(Number(item.returned_quantity) || 0)),
          target_slots: Array.isArray(item.target_slots) ? item.target_slots.slice(0, 12) : [],
          warehouse_ledger_id: sanitizeText(item.warehouse_ledger_id, 100),
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          written_at: Math.max(0, Math.floor(Number(item.written_at) || 0)),
        })).filter(item => item.username && item.item_id && item.returned_quantity > 0).slice(0, 80)
      : [],
    family_story_resolved: entry.family_story_resolved === true,
    family_story_resolution_idempotency_key: sanitizeText(entry.family_story_resolution_idempotency_key, 120),
    family_story_resolved_at: Math.max(0, Math.floor(Number(entry.family_story_resolved_at) || 0)),
    family_story_resolved_by: normalizeUsername(entry.family_story_resolved_by),
    family_story_resolution: entry.family_story_resolution && typeof entry.family_story_resolution === 'object'
      ? {
          relation_type: sanitizeText(entry.family_story_resolution.relation_type, 80),
          relation_label: sanitizeText(entry.family_story_resolution.relation_label, 80),
          resolution_choice: sanitizeText(entry.family_story_resolution.resolution_choice, 80),
          story_state: sanitizeText(entry.family_story_resolution.story_state, 100),
          personal_story_write_required: entry.family_story_resolution.personal_story_write_required !== false,
          child_arrangement_required: entry.family_story_resolution.child_arrangement_required === true,
          privacy_boundary: sanitizeText(entry.family_story_resolution.privacy_boundary, 160),
          memo: sanitizeText(entry.family_story_resolution.memo, 160),
        }
      : null,
    personal_story_receipts_written: entry.personal_story_receipts_written === true,
    personal_story_receipts_idempotency_key: sanitizeText(entry.personal_story_receipts_idempotency_key, 120),
    personal_story_receipts_written_at: Math.max(0, Math.floor(Number(entry.personal_story_receipts_written_at) || 0)),
    personal_story_receipts_written_by: normalizeUsername(entry.personal_story_receipts_written_by),
    personal_story_receipts: Array.isArray(entry.personal_story_receipts)
      ? entry.personal_story_receipts.map(item => ({
          username: normalizeUsername(item.username),
          username_key: normalizeUsernameKey(item.username_key || item.username),
          save_slot: normalizeSaveSlot(item.save_slot),
          save_id: normalizeSaveId(item.save_id),
          before_revision: Math.max(0, Math.floor(Number(item.before_revision) || 0)),
          after_revision: Math.max(0, Math.floor(Number(item.after_revision) || 0)),
          receipt_id: sanitizeText(item.receipt_id, 100),
          receipt_status: sanitizeText(item.receipt_status, 80) || 'written',
          relation_type: sanitizeText(item.relation_type, 80),
          resolution_choice: sanitizeText(item.resolution_choice, 80),
          personal_story_state: sanitizeText(item.personal_story_state, 100),
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          written_at: Math.max(0, Math.floor(Number(item.written_at) || 0)),
        })).filter(item => item.username && item.receipt_id).slice(0, 20)
      : [],
    child_arrangement_resolved: entry.child_arrangement_resolved === true,
    child_arrangement_idempotency_key: sanitizeText(entry.child_arrangement_idempotency_key, 120),
    child_arrangement_resolved_at: Math.max(0, Math.floor(Number(entry.child_arrangement_resolved_at) || 0)),
    child_arrangement_resolved_by: normalizeUsername(entry.child_arrangement_resolved_by),
    child_arrangement_resolution: entry.child_arrangement_resolution && typeof entry.child_arrangement_resolution === 'object'
      ? {
          relation_type: sanitizeText(entry.child_arrangement_resolution.relation_type, 80),
          arrangement_choice: sanitizeText(entry.child_arrangement_resolution.arrangement_choice, 100),
          arrangement_state: sanitizeText(entry.child_arrangement_resolution.arrangement_state, 100),
          child_count: Math.max(0, Math.floor(Number(entry.child_arrangement_resolution.child_count) || 0)),
          personal_family_save_write_required: entry.child_arrangement_resolution.personal_family_save_write_required !== false,
          children_private: entry.child_arrangement_resolution.children_private !== false,
          privacy_boundary: sanitizeText(entry.child_arrangement_resolution.privacy_boundary, 180),
          memo: sanitizeText(entry.child_arrangement_resolution.memo, 160),
      }
      : null,
    personal_family_receipts_written: entry.personal_family_receipts_written === true,
    personal_family_receipts_idempotency_key: sanitizeText(entry.personal_family_receipts_idempotency_key, 120),
    personal_family_receipts_written_at: Math.max(0, Math.floor(Number(entry.personal_family_receipts_written_at) || 0)),
    personal_family_receipts_written_by: normalizeUsername(entry.personal_family_receipts_written_by),
    personal_family_receipts: Array.isArray(entry.personal_family_receipts)
      ? entry.personal_family_receipts.map(item => ({
          username: normalizeUsername(item.username),
          username_key: normalizeUsernameKey(item.username_key || item.username),
          save_slot: normalizeSaveSlot(item.save_slot),
          save_id: normalizeSaveId(item.save_id),
          before_revision: Math.max(0, Math.floor(Number(item.before_revision) || 0)),
          after_revision: Math.max(0, Math.floor(Number(item.after_revision) || 0)),
          receipt_id: sanitizeText(item.receipt_id, 140),
          receipt_status: sanitizeText(item.receipt_status, 40) || 'written',
          relation_type: sanitizeText(item.relation_type, 80),
          arrangement_choice: sanitizeText(item.arrangement_choice, 100),
          arrangement_state: sanitizeText(item.arrangement_state, 100),
          child_count: Math.max(0, Math.floor(Number(item.child_count) || 0)),
          children_private: item.children_private !== false,
          idempotency_key: sanitizeText(item.idempotency_key, 120),
          written_at: Math.max(0, Math.floor(Number(item.written_at) || 0)),
        })).filter(item => item.username && item.receipt_id).slice(0, 20)
      : [],
    shared_assets_mutated: entry.shared_assets_mutated === true,
    next_required_operations: Array.isArray(entry.next_required_operations)
      ? entry.next_required_operations.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 12)
      : ['write_personal_save_refunds', 'verify_personal_save_receipts'],
  };
}

function buildSharedDecorationRemovalDisputeFreezePreview(contract) {
  const drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const disputes = drafts
    .filter(draft =>
      draft.purpose === 'shared_decoration_removal'
      && draft.state === 'executed'
      && (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    )
    .map(draft => ({
      draft_id: draft.id,
      target_ref: draft.target_ref,
      amount: draft.amount,
      requested_by: draft.requested_by,
      executed_by: draft.executed_by,
      executed_at: draft.executed_at,
      original_fund_ledger_id: draft.final_spend_ledger_id,
      receipt_status: draft.high_risk_receipt_status || 'pending',
      freeze_reason: '共同装修拆除已扣共同基金但尚未提交拆除完成或退款回执。',
      deferred_operations: ['shared_decoration_removal_receipt', 'fund_compensation_replay'],
    }))
    .slice(0, FUND_LARGE_SPEND_DRAFT_LIMIT);
  return {
    disputes,
    summary: {
      pending_count: disputes.length,
      total_amount: disputes.reduce((sum, entry) => sum + entry.amount, 0),
      target_refs: [...new Set(disputes.map(entry => entry.target_ref).filter(Boolean))].slice(0, 20),
      original_fund_ledger_ids: [...new Set(disputes.map(entry => entry.original_fund_ledger_id).filter(Boolean))].slice(0, 20),
      freeze_required: disputes.length > 0,
    },
    policy: {
      status: disputes.length > 0 ? 'manual_receipt_required' : 'clear',
      freeze_scope: '只冻结分居预览中的争议处理，不自动改共同基金余额、个人铜币、个人小屋或装修主状态。',
      release_condition: '提交拆除完成回执或带补偿确认的退款回执后，后续分居预览不再列入该争议冻结项。',
      no_personal_home_mutation: true,
      no_personal_money_mutation: true,
    },
  };
}

function buildSeparationSafetyChecks({ plotReturnPreview, warehouseReturns, fundReturns, fundBalance, sharedDecorationRemovalDisputeFreeze }) {
  const totalSuggestedFundRefund = fundReturns.reduce((sum, entry) => sum + entry.suggested_refund_amount, 0);
  const removalDisputeSummary = sharedDecorationRemovalDisputeFreeze?.summary || {};
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
    {
      id: 'shared_decoration_removal_disputes_traceable',
      passed: !removalDisputeSummary.freeze_required
        || (sharedDecorationRemovalDisputeFreeze.disputes || []).every(entry =>
          entry.draft_id && entry.target_ref && entry.original_fund_ledger_id && entry.receipt_status === 'pending'
        ),
      detail: removalDisputeSummary.freeze_required
        ? '共同装修拆除待回执草案已进入分居争议冻结预览，需先拆除完成或退款收口。'
        : '当前没有待回执的共同装修拆除争议。',
    },
  ];
}

function buildSeparationCompensationPlan({ plotReturnPreview, warehouseReturns, fundReturns, contract, sharedDecorationRemovalDisputeFreeze }) {
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
  if (sharedDecorationRemovalDisputeFreeze?.summary?.freeze_required) {
    plan.push({
      id: 'shared_decoration_removal_dispute_freeze',
      target: 'shared_decoration_removal',
      action: 'freeze_until_receipt_or_refund',
      status: 'manual_execution_required',
      detail: '共同装修拆除扣款未提交拆除 / 退款回执时，分居返还先冻结该争议项；收口前不改个人小屋、装修主状态或个人铜币。',
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

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map)
    || buildSharedMapFromFarmSnapshots(contract, contract.members.map(readMemberFarmSnapshot));

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

async function getCohabitationSharedAnimals(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看共同动物');
  if (!contract.shared_animals?.persisted) {
    contract.shared_animals = buildSharedAnimalsFromSnapshots(contract, contract.members.map(readMemberAnimalSnapshot), {
      persisted: true,
    });
    contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
    contract.origin_assets.animals = contract.shared_animals.animals
      .map(buildAnimalOriginAssetFromSharedAnimal)
      .filter(entry => entry.id)
      .slice(0, SHARED_ANIMAL_LIMIT);
    saveContractStore(store);
  } else {
    contract.shared_animals = normalizeSharedAnimals(contract.shared_animals);
  }
  return {
    contract: toPublicContract(contract),
    shared_animals: contract.shared_animals,
  };
}

async function waterCohabitationSharedFarmPlot(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('login required', 401);
  const request = normalizeSharedFarmActionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, 'water shared farm');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_farm_ledger = normalizeFarmActionLedger(contract.shared_farm_ledger);
  const previousEntry = contract.shared_farm_ledger.find(entry =>
    entry.action === 'water' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.plot_id !== request.plot_id) {
      throw createError('idempotency_key cannot be reused for another shared farm plot', 409);
    }
    return {
      contract: toPublicContract(contract),
      shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
      plot: findSharedMapPlot(contract.shared_map, previousEntry.plot_id),
      ledger_entry: previousEntry,
      idempotent: true,
      already_watered: previousEntry.status === 'committed',
    };
  }

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map);
  if (!sharedMap) throw createError('shared farm map is not persisted', 409);
  const plot = findSharedMapPlot(sharedMap, request.plot_id);
  if (!plot) throw createError('shared farm plot not found', 404);
  assertSharedFarmWaterAllowed(contract, member, plot, actorPermissions);
  const plotState = plot.plot_state && typeof plot.plot_state === 'object' ? plot.plot_state : {};
  if (!['planted', 'growing'].includes(plotState.state)) throw createError('shared farm plot is not waterable', 409);
  if (plotState.watered === true) throw createError('shared farm plot already watered', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const simultaneousOnlineBonus = buildSimultaneousOnlineBonusSnapshot(contract, actorUsername, 'shared_farm_water');
  const beforeState = { ...plotState };
  const afterState = {
    ...plotState,
    watered: true,
    unwatered_days: 0,
    cooperation_health_bonus: Math.max(0, Math.floor(Number(plotState.cooperation_health_bonus) || 0)) + simultaneousOnlineBonus.bonus_value,
    last_cooperation_bonus_at: simultaneousOnlineBonus.applied ? operatedAt : Math.max(0, Math.floor(Number(plotState.last_cooperation_bonus_at) || 0)),
    last_cooperation_bonus_action: simultaneousOnlineBonus.applied ? 'shared_farm_water' : sanitizeText(plotState.last_cooperation_bonus_action, 80),
    last_cooperation_bonus_members: simultaneousOnlineBonus.applied ? simultaneousOnlineBonus.recent_member_usernames : (Array.isArray(plotState.last_cooperation_bonus_members) ? plotState.last_cooperation_bonus_members : []),
  };
  const nextPlot = {
    ...plot,
    plot_state: afterState,
    current_steward_username: member.username,
    current_steward_display_name: member.display_name || member.username,
    current_steward_manor_role: actorManorRole,
    current_steward_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  contract.shared_map = {
    ...sharedMap,
    readonly: false,
    writes_enabled: true,
    revision: Math.max(sharedMap.revision || 0, operatedAt),
    plots: sharedMap.plots.map(entry => entry.id === plot.id ? nextPlot : entry),
    summary: {
      ...sharedMap.summary,
      waterable_plots: Math.max(0, Number(sharedMap.summary?.waterable_plots || 0) - 1),
      farm_water_write_enabled: true,
      farm_action_ledger_count: contract.shared_farm_ledger.length + 1,
      deferred_writes: (sharedMap.summary?.deferred_writes || []).filter(item => item !== 'water'),
    },
  };
  const ledgerEntry = normalizeFarmActionLedgerEntry({
    id: makeId('shared_farm_ledger'),
    action: 'water',
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    source_area: plot.source_area,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    origin_owner_display_name: plot.origin_owner_display_name,
    origin_owner_key: plot.origin_owner_key,
    origin_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    before_plot_state: beforeState,
    after_plot_state: afterState,
    simultaneous_online_bonus: {
      applied: simultaneousOnlineBonus.applied,
      type: 'shared_farm_water_health',
      bonus_value: simultaneousOnlineBonus.bonus_value,
      recent_member_count: simultaneousOnlineBonus.recent_member_count,
      recent_member_usernames: simultaneousOnlineBonus.recent_member_usernames,
      policy: simultaneousOnlineBonus.policy,
    },
    permission_mode: plot.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-map-only shared farm water; personal saves are unchanged',
    status: 'committed',
  });
  contract.shared_farm_ledger = [ledgerEntry, ...contract.shared_farm_ledger].slice(0, FARM_ACTION_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.plots = contract.origin_assets.plots.map(entry =>
    sanitizeText(entry?.id, 120) === plot.id
      ? buildPlotOriginAssetFromSharedPlot(nextPlot)
      : entry
  );
  appendAudit(contract, 'shared_farm_watered', actor, {
    ledger_id: ledgerEntry.id,
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    actor_username: actorUsername,
    permission_mode: plot.permission_mode,
    simultaneous_online_bonus: simultaneousOnlineBonus,
    personal_save_changed: false,
    shared_warehouse_changed: false,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
    plot: nextPlot,
    ledger_entry: ledgerEntry,
    idempotent: false,
    already_watered: false,
    farm_action: {
      action: 'water',
      plot_id: plot.id,
      before_plot_state: beforeState,
      after_plot_state: afterState,
      simultaneous_online_bonus: simultaneousOnlineBonus,
      personal_save_changed: false,
      shared_warehouse_changed: false,
      shared_fund_changed: false,
    },
  };
}

async function careCohabitationSharedFarmPlot(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('login required', 401);
  const request = normalizeSharedFarmCarePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, 'care shared farm');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_farm_ledger = normalizeFarmActionLedger(contract.shared_farm_ledger);
  const previousEntry = contract.shared_farm_ledger.find(entry =>
    entry.action === request.action && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.plot_id !== request.plot_id) {
      throw createError('idempotency_key cannot be reused for another shared farm care plot', 409);
    }
    return {
      contract: toPublicContract(contract),
      shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
      plot: findSharedMapPlot(contract.shared_map, previousEntry.plot_id),
      ledger_entry: previousEntry,
      idempotent: true,
      already_applied: previousEntry.status === 'committed',
    };
  }

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map);
  if (!sharedMap) throw createError('shared farm map is not persisted', 409);
  const plot = findSharedMapPlot(sharedMap, request.plot_id);
  if (!plot) throw createError('shared farm plot not found', 404);
  assertSharedFarmCareAllowed(contract, member, plot, actorPermissions);
  const plotState = plot.plot_state && typeof plot.plot_state === 'object' ? plot.plot_state : {};
  if (request.action === 'cure_pests' && plotState.infested !== true) throw createError('shared farm plot has no pests to cure', 409);
  if (request.action === 'clear_weeds' && plotState.weedy !== true) throw createError('shared farm plot has no weeds to clear', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const beforeState = { ...plotState };
  const afterState = {
    ...plotState,
    ...(request.action === 'cure_pests'
      ? { infested: false, infested_days: 0 }
      : { weedy: false, weedy_days: 0 }),
  };
  const nextPlot = {
    ...plot,
    plot_state: afterState,
    current_steward_username: member.username,
    current_steward_display_name: member.display_name || member.username,
    current_steward_manor_role: actorManorRole,
    current_steward_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const nextPlots = sharedMap.plots.map(entry => entry.id === plot.id ? nextPlot : entry);
  const nextStateCounts = countPlotStates(nextPlots);
  contract.shared_map = {
    ...sharedMap,
    readonly: false,
    writes_enabled: true,
    revision: Math.max(sharedMap.revision || 0, operatedAt),
    plots: nextPlots,
    summary: {
      ...sharedMap.summary,
      total_plots: nextStateCounts.total,
      active_plots: nextStateCounts.active,
      harvestable_plots: nextStateCounts.harvestable,
      waterable_plots: nextStateCounts.waterable,
      farm_care_write_enabled: true,
      farm_cure_pests_write_enabled: true,
      farm_action_ledger_count: contract.shared_farm_ledger.length + 1,
      deferred_writes: (sharedMap.summary?.deferred_writes || [])
        .filter(item => item !== 'cure_pests' && item !== 'clear_weeds' && item !== 'farm_care'),
    },
  };
  const ledgerEntry = normalizeFarmActionLedgerEntry({
    id: makeId('shared_farm_ledger'),
    action: request.action,
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    source_area: plot.source_area,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    origin_owner_display_name: plot.origin_owner_display_name,
    origin_owner_key: plot.origin_owner_key,
    origin_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    before_plot_state: beforeState,
    after_plot_state: afterState,
    permission_mode: plot.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-map-only shared farm care; personal saves, shared warehouse, and shared fund are unchanged',
    status: 'committed',
  });
  contract.shared_farm_ledger = [ledgerEntry, ...contract.shared_farm_ledger].slice(0, FARM_ACTION_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const plotAsset = buildPlotOriginAssetFromSharedPlot(nextPlot);
  const replacedPlotAssets = contract.origin_assets.plots.map(entry =>
    sanitizeText(entry?.id, 120) === plot.id ? plotAsset : entry
  );
  contract.origin_assets.plots = replacedPlotAssets.some(entry => sanitizeText(entry?.id, 120) === plot.id)
    ? replacedPlotAssets
    : [plotAsset, ...replacedPlotAssets].slice(0, 400);
  appendAudit(contract, request.action === 'cure_pests' ? 'shared_farm_pests_cured' : 'shared_farm_weeds_cleared', actor, {
    ledger_id: ledgerEntry.id,
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    actor_username: actorUsername,
    permission_mode: plot.permission_mode,
    personal_save_changed: false,
    shared_warehouse_changed: false,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
    plot: nextPlot,
    ledger_entry: ledgerEntry,
    idempotent: false,
    already_applied: false,
    farm_action: {
      action: request.action,
      plot_id: plot.id,
      before_plot_state: beforeState,
      after_plot_state: afterState,
      personal_save_changed: false,
      shared_warehouse_changed: false,
      shared_fund_changed: false,
    },
  };
}

async function plantCohabitationSharedFarmPlot(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeSharedFarmPlantPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '种植共同农田');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_farm_ledger = normalizeFarmActionLedger(contract.shared_farm_ledger);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);

  const previousEntry = contract.shared_farm_ledger.find(entry =>
    entry.action === 'plant' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.plot_id !== request.plot_id || previousEntry.seed_item_id !== request.seed_item_id) {
      throw createError('idempotency_key cannot be reused for another shared farm plant request', 409);
    }
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      previousEntry.warehouse_ledger_ids.includes(entry.id)
      || (entry.action === 'consume' && entry.idempotency_key === request.idempotency_key)
    );
    return {
      contract: toPublicContract(contract),
      shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      plot: findSharedMapPlot(contract.shared_map, previousEntry.plot_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_planted: previousEntry.status === 'committed',
    };
  }

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map);
  if (!sharedMap) throw createError('shared farm map is not persisted', 409);
  const plot = findSharedMapPlot(sharedMap, request.plot_id);
  if (!plot) throw createError('shared farm plot not found', 404);
  assertSharedFarmPlantAllowed(contract, member, plot, actorPermissions);
  const plotState = plot.plot_state && typeof plot.plot_state === 'object' ? plot.plot_state : {};
  if (plotState.state !== 'tilled') throw createError('shared farm plot must be tilled before planting', 409);

  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    request.seed_item_id,
    1,
    'normal'
  );
  if (!allocationResult.ok) throw createError('共同仓库中可用于共同种植的普通种子数量不足', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const beforeState = { ...plotState };
  const afterState = {
    ...plotState,
    state: 'planted',
    crop_id: request.crop_id,
    growth_days: 0,
    watered: false,
    unwatered_days: 0,
    harvest_count: 0,
    giant_crop_group: null,
    infested: false,
    infested_days: 0,
    weedy: false,
    weedy_days: 0,
  };
  const nextPlot = {
    ...plot,
    plot_state: afterState,
    current_steward_username: member.username,
    current_steward_display_name: member.display_name || member.username,
    current_steward_manor_role: actorManorRole,
    current_steward_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const nextPlots = sharedMap.plots.map(entry => entry.id === plot.id ? nextPlot : entry);
  const nextStateCounts = countPlotStates(nextPlots);
  const warehouseTargetRef = `shared_farm:plant:${plot.id}`;
  const warehouseLedgerEntries = allocationResult.allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'consume',
    item_id: request.seed_item_id,
    quantity: allocation.quantity,
    quality: 'normal',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
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
    source_save_revision: allocation.source_save_revision,
    source_inventory: allocation.source_inventory || 'shared_warehouse.items',
    source_ledger_ids: allocation.source_ledger_ids,
    target_owner_id: `shared_map:${contract.id}`,
    target_owner_username: 'shared_map',
    target_owner_display_name: '共同农田',
    target_owner_key: 'shared_map',
    target_inventory: 'shared_map.plots',
    target_ref: warehouseTargetRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: '共同农田种植已扣减共同仓库种子并写入契约地图；若误种，需要按本 consume ledger 和农田 ledger 走后续回滚或补偿。',
    status: 'committed',
  })).filter(Boolean);

  contract.shared_warehouse.ledger = [...warehouseLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_map = {
    ...sharedMap,
    readonly: false,
    writes_enabled: true,
    revision: Math.max(sharedMap.revision || 0, operatedAt),
    plots: nextPlots,
    summary: {
      ...sharedMap.summary,
      total_plots: nextStateCounts.total,
      active_plots: nextStateCounts.active,
      harvestable_plots: nextStateCounts.harvestable,
      waterable_plots: nextStateCounts.waterable,
      farm_plant_write_enabled: true,
      farm_water_write_enabled: true,
      farm_action_ledger_count: contract.shared_farm_ledger.length + 1,
      shared_warehouse_seed_consume_enabled: true,
      deferred_writes: (sharedMap.summary?.deferred_writes || []).filter(item => item !== 'plant'),
    },
  };
  const ledgerEntry = normalizeFarmActionLedgerEntry({
    id: makeId('shared_farm_ledger'),
    action: 'plant',
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    source_area: plot.source_area,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    seed_item_id: request.seed_item_id,
    crop_id: request.crop_id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    shared_warehouse_changed: true,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    origin_owner_display_name: plot.origin_owner_display_name,
    origin_owner_key: plot.origin_owner_key,
    origin_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    before_plot_state: beforeState,
    after_plot_state: afterState,
    permission_mode: plot.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-map shared farm planting consumes one shared-warehouse seed; personal saves are unchanged after seed入仓。',
    status: 'committed',
  });
  contract.shared_farm_ledger = [ledgerEntry, ...contract.shared_farm_ledger].slice(0, FARM_ACTION_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const plotAsset = buildPlotOriginAssetFromSharedPlot(nextPlot);
  const replacedPlotAssets = contract.origin_assets.plots.map(entry =>
    sanitizeText(entry?.id, 120) === plot.id ? plotAsset : entry
  );
  contract.origin_assets.plots = replacedPlotAssets.some(entry => sanitizeText(entry?.id, 120) === plot.id)
    ? replacedPlotAssets
    : [plotAsset, ...replacedPlotAssets].slice(0, 400);
  contract.origin_assets.warehouse_items = [
    ...warehouseLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_farm_planted', actor, {
    ledger_id: ledgerEntry.id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    actor_username: actorUsername,
    seed_item_id: request.seed_item_id,
    crop_id: request.crop_id,
    quantity: 1,
    target_ref: warehouseTargetRef,
    permission_mode: plot.permission_mode,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    plot: nextPlot,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: warehouseLedgerEntries,
    idempotent: false,
    already_planted: false,
    farm_action: {
      action: 'plant',
      plot_id: plot.id,
      seed_item_id: request.seed_item_id,
      crop_id: request.crop_id,
      warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
      before_plot_state: beforeState,
      after_plot_state: afterState,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
  };
}

async function fertilizeCohabitationSharedFarmPlot(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeSharedFarmFertilizePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '共同农田施肥');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_farm_ledger = normalizeFarmActionLedger(contract.shared_farm_ledger);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);

  const previousEntry = contract.shared_farm_ledger.find(entry =>
    entry.action === 'fertilize' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.plot_id !== request.plot_id || previousEntry.fertilizer_item_id !== request.fertilizer_item_id) {
      throw createError('idempotency_key cannot be reused for another shared farm fertilize request', 409);
    }
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      previousEntry.warehouse_ledger_ids.includes(entry.id)
      || (entry.action === 'consume' && entry.idempotency_key === request.idempotency_key)
    );
    return {
      contract: toPublicContract(contract),
      shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      plot: findSharedMapPlot(contract.shared_map, previousEntry.plot_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_fertilized: previousEntry.status === 'committed',
    };
  }

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map);
  if (!sharedMap) throw createError('shared farm map is not persisted', 409);
  const plot = findSharedMapPlot(sharedMap, request.plot_id);
  if (!plot) throw createError('shared farm plot not found', 404);
  assertSharedFarmFertilizeAllowed(contract, member, plot, actorPermissions);
  const plotState = plot.plot_state && typeof plot.plot_state === 'object' ? plot.plot_state : {};
  if (plotState.state === 'wasteland') throw createError('shared farm wasteland plot cannot be fertilized', 409);
  if (plotState.fertilizer) throw createError('shared farm plot already has fertilizer', 409);

  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    request.fertilizer_item_id,
    1,
    'normal'
  );
  if (!allocationResult.ok) throw createError('共同仓库中可用于共同施肥的普通基础肥料数量不足', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const simultaneousOnlineBonus = buildSharedFarmPlantFertilizeCoopBonusSnapshot(contract, actorUsername, plot);
  const beforeState = { ...plotState };
  const afterState = {
    ...plotState,
    fertilizer: request.fertilizer_item_id,
    cooperation_quality_bonus: Math.max(0, Math.floor(Number(plotState.cooperation_quality_bonus) || 0)) + simultaneousOnlineBonus.bonus_value,
    last_cooperation_bonus_at: simultaneousOnlineBonus.applied ? operatedAt : Math.max(0, Math.floor(Number(plotState.last_cooperation_bonus_at) || 0)),
    last_cooperation_bonus_action: simultaneousOnlineBonus.applied ? 'shared_farm_plant_fertilize' : sanitizeText(plotState.last_cooperation_bonus_action, 80),
    last_cooperation_bonus_members: simultaneousOnlineBonus.applied ? simultaneousOnlineBonus.recent_member_usernames : (Array.isArray(plotState.last_cooperation_bonus_members) ? plotState.last_cooperation_bonus_members : []),
    last_cooperation_plant_actor_username: simultaneousOnlineBonus.applied ? simultaneousOnlineBonus.plant_actor_username : normalizeUsername(plotState.last_cooperation_plant_actor_username),
  };
  const nextPlot = {
    ...plot,
    plot_state: afterState,
    current_steward_username: member.username,
    current_steward_display_name: member.display_name || member.username,
    current_steward_manor_role: actorManorRole,
    current_steward_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const nextPlots = sharedMap.plots.map(entry => entry.id === plot.id ? nextPlot : entry);
  const nextStateCounts = countPlotStates(nextPlots);
  const warehouseTargetRef = `shared_farm:fertilize:${plot.id}`;
  const warehouseLedgerEntries = allocationResult.allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'consume',
    item_id: request.fertilizer_item_id,
    quantity: allocation.quantity,
    quality: 'normal',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
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
    source_save_revision: allocation.source_save_revision,
    source_inventory: allocation.source_inventory || 'shared_warehouse.items',
    source_ledger_ids: allocation.source_ledger_ids,
    target_owner_id: `shared_map:${contract.id}`,
    target_owner_username: 'shared_map',
    target_owner_display_name: '共同农田',
    target_owner_key: 'shared_map',
    target_inventory: 'shared_map.plots',
    target_ref: warehouseTargetRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: '共同农田普通施肥已扣减共同仓库基础肥料并写入契约地图；若误用，需要按本 consume ledger 和农田 ledger 走后续回滚或补偿。',
    status: 'committed',
  })).filter(Boolean);

  contract.shared_warehouse.ledger = [...warehouseLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_map = {
    ...sharedMap,
    readonly: false,
    writes_enabled: true,
    revision: Math.max(sharedMap.revision || 0, operatedAt),
    plots: nextPlots,
    summary: {
      ...sharedMap.summary,
      total_plots: nextStateCounts.total,
      active_plots: nextStateCounts.active,
      harvestable_plots: nextStateCounts.harvestable,
      waterable_plots: nextStateCounts.waterable,
      farm_fertilize_write_enabled: true,
      farm_plant_write_enabled: true,
      farm_action_ledger_count: contract.shared_farm_ledger.length + 1,
      shared_warehouse_fertilizer_consume_enabled: true,
      deferred_writes: (sharedMap.summary?.deferred_writes || []).filter(item => item !== 'fertilize'),
    },
  };
  const ledgerEntry = normalizeFarmActionLedgerEntry({
    id: makeId('shared_farm_ledger'),
    action: 'fertilize',
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    source_area: plot.source_area,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    fertilizer_item_id: request.fertilizer_item_id,
    crop_id: plotState.crop_id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    shared_warehouse_changed: true,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    origin_owner_display_name: plot.origin_owner_display_name,
    origin_owner_key: plot.origin_owner_key,
    origin_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    before_plot_state: beforeState,
    after_plot_state: afterState,
    simultaneous_online_bonus: {
      applied: simultaneousOnlineBonus.applied,
      type: simultaneousOnlineBonus.type,
      bonus_value: simultaneousOnlineBonus.bonus_value,
      recent_member_count: simultaneousOnlineBonus.recent_member_count,
      recent_member_usernames: simultaneousOnlineBonus.recent_member_usernames,
      plant_actor_username: simultaneousOnlineBonus.plant_actor_username,
      plant_ledger_id: simultaneousOnlineBonus.plant_ledger_id,
      policy: simultaneousOnlineBonus.policy,
    },
    permission_mode: plot.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-map shared farm fertilize consumes one shared-warehouse basic fertilizer; personal saves are unchanged after fertilizer入仓。',
    status: 'committed',
  });
  contract.shared_farm_ledger = [ledgerEntry, ...contract.shared_farm_ledger].slice(0, FARM_ACTION_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const plotAsset = buildPlotOriginAssetFromSharedPlot(nextPlot);
  const replacedPlotAssets = contract.origin_assets.plots.map(entry =>
    sanitizeText(entry?.id, 120) === plot.id ? plotAsset : entry
  );
  contract.origin_assets.plots = replacedPlotAssets.some(entry => sanitizeText(entry?.id, 120) === plot.id)
    ? replacedPlotAssets
    : [plotAsset, ...replacedPlotAssets].slice(0, 400);
  contract.origin_assets.warehouse_items = [
    ...warehouseLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_farm_fertilized', actor, {
    ledger_id: ledgerEntry.id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    actor_username: actorUsername,
    fertilizer_item_id: request.fertilizer_item_id,
    quantity: 1,
    target_ref: warehouseTargetRef,
    permission_mode: plot.permission_mode,
    simultaneous_online_bonus: simultaneousOnlineBonus,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    plot: nextPlot,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: warehouseLedgerEntries,
    idempotent: false,
    already_fertilized: false,
    farm_action: {
      action: 'fertilize',
      plot_id: plot.id,
      fertilizer_item_id: request.fertilizer_item_id,
      crop_id: plotState.crop_id,
      warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
      before_plot_state: beforeState,
      after_plot_state: afterState,
      simultaneous_online_bonus: simultaneousOnlineBonus,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
  };
}

async function harvestCohabitationSharedFarmPlot(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeSharedFarmActionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '收获共同农田');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_farm_ledger = normalizeFarmActionLedger(contract.shared_farm_ledger);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);

  const previousEntry = contract.shared_farm_ledger.find(entry =>
    entry.action === 'harvest' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.plot_id !== request.plot_id) {
      throw createError('idempotency_key cannot be reused for another shared farm harvest request', 409);
    }
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      previousEntry.warehouse_ledger_ids.includes(entry.id)
      || (entry.action === 'deposit' && entry.idempotency_key === request.idempotency_key)
    );
    return {
      contract: toPublicContract(contract),
      shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      plot: findSharedMapPlot(contract.shared_map, previousEntry.plot_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_harvested: previousEntry.status === 'committed',
    };
  }

  const sharedMap = refreshSharedMapContractFields(contract, contract.shared_map);
  if (!sharedMap) throw createError('shared farm map is not persisted', 409);
  const plot = findSharedMapPlot(sharedMap, request.plot_id);
  if (!plot) throw createError('shared farm plot not found', 404);
  assertSharedFarmHarvestAllowed(contract, member, plot, actorPermissions);
  const plotState = plot.plot_state && typeof plot.plot_state === 'object' ? plot.plot_state : {};
  if (plotState.state !== 'harvestable') throw createError('shared farm plot is not harvestable', 409);
  const outputItemId = normalizeWarehouseItemId(plotState.crop_id);
  if (!outputItemId) throw createError('shared farm harvest requires a traceable crop_id', 409);
  if (plotState.giant_crop_group !== null && plotState.giant_crop_group !== undefined) {
    throw createError('shared farm giant crop harvest requires a dedicated grouped harvest flow', 409);
  }

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const beforeState = { ...plotState };
  const afterState = {
    ...plotState,
    state: 'tilled',
    crop_id: null,
    growth_days: 0,
    watered: false,
    unwatered_days: 0,
    fertilizer: null,
    harvest_count: 0,
    giant_crop_group: null,
    infested: false,
    infested_days: 0,
    weedy: false,
    weedy_days: 0,
  };
  const nextPlot = {
    ...plot,
    plot_state: afterState,
    current_steward_username: member.username,
    current_steward_display_name: member.display_name || member.username,
    current_steward_manor_role: actorManorRole,
    current_steward_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const nextPlots = sharedMap.plots.map(entry => entry.id === plot.id ? nextPlot : entry);
  const nextStateCounts = countPlotStates(nextPlots);
  const warehouseSourceRef = `shared_farm:harvest:${plot.id}`;
  const warehouseLedgerEntry = normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'deposit',
    item_id: outputItemId,
    quantity: 1,
    quality: 'normal',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: plot.origin_owner_id || `shared_map:${contract.id}`,
    source_owner_username: plot.origin_owner_username || member.username,
    source_owner_display_name: plot.origin_owner_display_name || member.display_name || member.username,
    source_owner_key: plot.origin_owner_key || member.username_key,
    source_owner_manor_role: plot.origin_owner_manor_role,
    source_owner_manor_role_label: plot.origin_owner_manor_role_label,
    source_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    source_inventory: 'shared_map.plots',
    source_slots: [{
      index: normalizePlotId(plot.source_plot_id, 0),
      quantity: 1,
    }],
    target_owner_id: `shared_warehouse:${contract.id}`,
    target_owner_username: 'shared_warehouse',
    target_owner_display_name: '共同仓库',
    target_owner_key: 'shared_warehouse',
    target_inventory: 'shared_warehouse.items',
    target_ref: warehouseSourceRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: '共同农田收获产出已进入共同仓库；如误收，需要按本 deposit ledger 和农田 ledger 走后续回滚或补偿。',
    status: 'committed',
  });

  contract.shared_warehouse.ledger = [warehouseLedgerEntry, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_map = {
    ...sharedMap,
    readonly: false,
    writes_enabled: true,
    revision: Math.max(sharedMap.revision || 0, operatedAt),
    plots: nextPlots,
    summary: {
      ...sharedMap.summary,
      total_plots: nextStateCounts.total,
      active_plots: nextStateCounts.active,
      harvestable_plots: nextStateCounts.harvestable,
      waterable_plots: nextStateCounts.waterable,
      farm_plant_write_enabled: true,
      farm_water_write_enabled: true,
      farm_harvest_write_enabled: true,
      farm_action_ledger_count: contract.shared_farm_ledger.length + 1,
      shared_warehouse_harvest_deposit_enabled: true,
      deferred_writes: (sharedMap.summary?.deferred_writes || [])
        .filter(item => item !== 'harvest' && item !== 'shared_warehouse_auto_deposit'),
    },
  };
  const ledgerEntry = normalizeFarmActionLedgerEntry({
    id: makeId('shared_farm_ledger'),
    action: 'harvest',
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    source_area: plot.source_area,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    crop_id: outputItemId,
    output_item_id: outputItemId,
    output_quantity: 1,
    output_quality: 'normal',
    warehouse_ledger_ids: [warehouseLedgerEntry.id],
    shared_warehouse_changed: true,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    origin_owner_display_name: plot.origin_owner_display_name,
    origin_owner_key: plot.origin_owner_key,
    origin_save_id: plot.origin_save_id,
    source_save_slot: plot.source_save_slot,
    source_save_revision: plot.source_save_revision,
    before_plot_state: beforeState,
    after_plot_state: afterState,
    permission_mode: plot.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-map shared farm harvest deposits output into shared warehouse; personal saves are unchanged.',
    status: 'committed',
  });
  contract.shared_farm_ledger = [ledgerEntry, ...contract.shared_farm_ledger].slice(0, FARM_ACTION_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const plotAsset = buildPlotOriginAssetFromSharedPlot(nextPlot);
  const replacedPlotAssets = contract.origin_assets.plots.map(entry =>
    sanitizeText(entry?.id, 120) === plot.id ? plotAsset : entry
  );
  contract.origin_assets.plots = replacedPlotAssets.some(entry => sanitizeText(entry?.id, 120) === plot.id)
    ? replacedPlotAssets
    : [plotAsset, ...replacedPlotAssets].slice(0, 400);
  contract.origin_assets.warehouse_items = [
    buildWarehouseOriginAsset(warehouseLedgerEntry),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_farm_harvested', actor, {
    ledger_id: ledgerEntry.id,
    warehouse_ledger_ids: [warehouseLedgerEntry.id],
    plot_id: plot.id,
    source_plot_id: plot.source_plot_id,
    origin_owner_id: plot.origin_owner_id,
    origin_owner_username: plot.origin_owner_username,
    actor_username: actorUsername,
    crop_id: outputItemId,
    output_item_id: outputItemId,
    output_quantity: 1,
    output_quality: 'normal',
    target_ref: warehouseSourceRef,
    permission_mode: plot.permission_mode,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_map: refreshSharedMapContractFields(contract, contract.shared_map),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    plot: nextPlot,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: [warehouseLedgerEntry],
    idempotent: false,
    already_harvested: false,
    farm_action: {
      action: 'harvest',
      plot_id: plot.id,
      crop_id: outputItemId,
      output_item_id: outputItemId,
      output_quantity: 1,
      output_quality: 'normal',
      warehouse_ledger_ids: [warehouseLedgerEntry.id],
      before_plot_state: beforeState,
      after_plot_state: afterState,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
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

async function feedCohabitationSharedAnimal(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeSharedAnimalFeedPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '喂食共同动物');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_animal_ledger = normalizeAnimalActionLedger(contract.shared_animal_ledger);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_animals = normalizeSharedAnimals(contract.shared_animals);

  const previousEntry = contract.shared_animal_ledger.find(entry =>
    entry.action === 'feed' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.animal_id !== request.animal_id || previousEntry.feed_item_id !== request.feed_item_id) {
      throw createError('idempotency_key cannot be reused for another shared animal feed request', 409);
    }
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      previousEntry.warehouse_ledger_ids.includes(entry.id)
      || (entry.action === 'consume' && entry.idempotency_key === request.idempotency_key)
    );
    return {
      contract: toPublicContract(contract),
      shared_animals: contract.shared_animals,
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      animal: findSharedAnimal(contract.shared_animals, previousEntry.animal_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_fed: previousEntry.status === 'committed',
    };
  }

  if (!contract.shared_animals.persisted) {
    contract.shared_animals = buildSharedAnimalsFromSnapshots(contract, contract.members.map(readMemberAnimalSnapshot), {
      persisted: true,
    });
  }
  const sharedAnimals = normalizeSharedAnimals(contract.shared_animals);
  const animal = findSharedAnimal(sharedAnimals, request.animal_id);
  if (!animal) throw createError('shared animal not found', 404);
  assertSharedAnimalFeedAllowed(contract, member, animal, actorPermissions);
  const animalState = animal.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : summarizeAnimal({});
  if (animalState.was_fed === true) throw createError('shared animal already fed', 409);

  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    request.feed_item_id,
    1,
    'normal'
  );
  if (!allocationResult.ok) throw createError('共同仓库中可用于共同动物喂食的干草不足', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const beforeState = { ...animalState };
  const afterState = {
    ...animalState,
    was_fed: true,
    fed_with: request.feed_item_id,
    hunger: 0,
  };
  const nextAnimal = {
    ...animal,
    animal_state: afterState,
    current_keeper_username: member.username,
    current_keeper_display_name: member.display_name || member.username,
    current_keeper_manor_role: actorManorRole,
    current_keeper_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const warehouseTargetRef = `shared_animal:feed:${animal.id}`;
  const warehouseLedgerEntries = allocationResult.allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'consume',
    item_id: request.feed_item_id,
    quantity: allocation.quantity,
    quality: 'normal',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
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
    source_save_revision: allocation.source_save_revision,
    source_inventory: allocation.source_inventory || 'shared_warehouse.items',
    source_ledger_ids: allocation.source_ledger_ids,
    target_owner_id: `shared_animals:${contract.id}`,
    target_owner_username: 'shared_animals',
    target_owner_display_name: '共同动物',
    target_owner_key: 'shared_animals',
    target_inventory: 'shared_animals.animals',
    target_ref: warehouseTargetRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: '共同动物喂食已扣减共同仓库干草并写入契约动物状态；个人动物存档保持不变。',
    status: 'committed',
  })).filter(Boolean);

  contract.shared_warehouse.ledger = [...warehouseLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const nextAnimals = sharedAnimals.animals.map(entry => entry.id === animal.id ? nextAnimal : entry);
  const stateCounts = countSharedAnimalStates(nextAnimals);
  contract.shared_animals = {
    ...sharedAnimals,
    revision: Math.max(sharedAnimals.revision || 0, operatedAt),
    animals: nextAnimals,
    summary: {
      ...sharedAnimals.summary,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: Math.max(0, stateCounts.total - stateCounts.fed),
      pettable_count: Math.max(0, stateCounts.total - stateCounts.petted),
      product_ready_count: stateCounts.product_ready,
      animal_action_ledger_count: contract.shared_animal_ledger.length + 1,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      deferred_writes: (sharedAnimals.summary?.deferred_writes || []).filter(item => item !== 'feed'),
    },
  };
  const ledgerEntry = normalizeAnimalActionLedgerEntry({
    id: makeId('shared_animal_ledger'),
    action: 'feed',
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    feed_item_id: request.feed_item_id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    shared_warehouse_changed: true,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    origin_owner_display_name: animal.origin_owner_display_name,
    origin_owner_key: animal.origin_owner_key,
    origin_save_id: animal.origin_save_id,
    source_save_slot: animal.source_save_slot,
    source_save_revision: animal.source_save_revision,
    before_animal_state: beforeState,
    after_animal_state: afterState,
    permission_mode: animal.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-animal shared feed consumes one shared-warehouse hay; personal saves are unchanged after hay入仓。',
    status: 'committed',
  });
  contract.shared_animal_ledger = [ledgerEntry, ...contract.shared_animal_ledger].slice(0, SHARED_ANIMAL_LEDGER_LIMIT);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const animalAsset = buildAnimalOriginAssetFromSharedAnimal(nextAnimal);
  const replacedAnimalAssets = contract.origin_assets.animals.map(entry =>
    sanitizeText(entry?.id, 140) === animal.id ? animalAsset : entry
  );
  contract.origin_assets.animals = replacedAnimalAssets.some(entry => sanitizeText(entry?.id, 140) === animal.id)
    ? replacedAnimalAssets
    : [animalAsset, ...replacedAnimalAssets].slice(0, SHARED_ANIMAL_LIMIT);
  contract.origin_assets.warehouse_items = [
    ...warehouseLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_animal_fed', actor, {
    ledger_id: ledgerEntry.id,
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    actor_username: actorUsername,
    feed_item_id: request.feed_item_id,
    quantity: 1,
    target_ref: warehouseTargetRef,
    permission_mode: animal.permission_mode,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_animals: contract.shared_animals,
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    animal: nextAnimal,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: warehouseLedgerEntries,
    idempotent: false,
    already_fed: false,
    animal_action: {
      action: 'feed',
      animal_id: animal.id,
      feed_item_id: request.feed_item_id,
      warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
      before_animal_state: beforeState,
      after_animal_state: afterState,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
  };
}

async function petCohabitationSharedAnimal(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeSharedAnimalActionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '抚摸共同动物');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_animal_ledger = normalizeAnimalActionLedger(contract.shared_animal_ledger);
  contract.shared_animals = normalizeSharedAnimals(contract.shared_animals);

  const previousEntry = contract.shared_animal_ledger.find(entry =>
    entry.action === 'pet' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.animal_id !== request.animal_id) {
      throw createError('idempotency_key cannot be reused for another shared animal pet request', 409);
    }
    return {
      contract: toPublicContract(contract),
      shared_animals: contract.shared_animals,
      animal: findSharedAnimal(contract.shared_animals, previousEntry.animal_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: [],
      idempotent: true,
      already_petted: previousEntry.status === 'committed',
    };
  }

  if (!contract.shared_animals.persisted) {
    contract.shared_animals = buildSharedAnimalsFromSnapshots(contract, contract.members.map(readMemberAnimalSnapshot), {
      persisted: true,
    });
  }
  const sharedAnimals = normalizeSharedAnimals(contract.shared_animals);
  const animal = findSharedAnimal(sharedAnimals, request.animal_id);
  if (!animal) throw createError('shared animal not found', 404);
  assertSharedAnimalPetAllowed(contract, member, animal, actorPermissions);
  const animalState = animal.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : summarizeAnimal({});
  if (animalState.was_petted === true) throw createError('shared animal already petted', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const simultaneousOnlineBonus = buildSharedAnimalCareCoopBonusSnapshot(contract, actorUsername, animal);
  const beforeState = { ...animalState };
  const afterState = {
    ...animalState,
    was_petted: true,
    friendship: Math.max(0, Math.min(999, Math.floor(Number(animalState.friendship) || 0) + 2)),
    mood: Math.max(0, Math.min(999, Math.floor(Number(animalState.mood) || 0) + 5 + simultaneousOnlineBonus.bonus_value)),
    cooperation_mood_bonus: Math.max(0, Math.floor(Number(animalState.cooperation_mood_bonus) || 0)) + simultaneousOnlineBonus.bonus_value,
    last_cooperation_bonus_at: simultaneousOnlineBonus.applied ? operatedAt : Math.max(0, Math.floor(Number(animalState.last_cooperation_bonus_at) || 0)),
    last_cooperation_bonus_action: simultaneousOnlineBonus.applied ? 'shared_animal_feed_pet' : sanitizeText(animalState.last_cooperation_bonus_action, 80),
    last_cooperation_bonus_members: simultaneousOnlineBonus.applied ? simultaneousOnlineBonus.recent_member_usernames : (Array.isArray(animalState.last_cooperation_bonus_members) ? animalState.last_cooperation_bonus_members : []),
    last_cooperation_feed_actor_username: simultaneousOnlineBonus.applied ? simultaneousOnlineBonus.feed_actor_username : normalizeUsername(animalState.last_cooperation_feed_actor_username),
  };
  const nextAnimal = {
    ...animal,
    animal_state: afterState,
    current_keeper_username: member.username,
    current_keeper_display_name: member.display_name || member.username,
    current_keeper_manor_role: actorManorRole,
    current_keeper_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const nextAnimals = sharedAnimals.animals.map(entry => entry.id === animal.id ? nextAnimal : entry);
  const stateCounts = countSharedAnimalStates(nextAnimals);
  const ledgerEntry = normalizeAnimalActionLedgerEntry({
    id: makeId('shared_animal_ledger'),
    action: 'pet',
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    shared_warehouse_changed: false,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    origin_owner_display_name: animal.origin_owner_display_name,
    origin_owner_key: animal.origin_owner_key,
    origin_save_id: animal.origin_save_id,
    source_save_slot: animal.source_save_slot,
    source_save_revision: animal.source_save_revision,
    before_animal_state: beforeState,
    after_animal_state: afterState,
    simultaneous_online_bonus: {
      applied: simultaneousOnlineBonus.applied,
      type: simultaneousOnlineBonus.type,
      bonus_value: simultaneousOnlineBonus.bonus_value,
      recent_member_count: simultaneousOnlineBonus.recent_member_count,
      recent_member_usernames: simultaneousOnlineBonus.recent_member_usernames,
      feed_actor_username: simultaneousOnlineBonus.feed_actor_username,
      policy: simultaneousOnlineBonus.policy,
    },
    permission_mode: animal.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-animal shared pet writes only contract animal state; personal saves and shared warehouse are unchanged.',
    status: 'committed',
  });
  contract.shared_animal_ledger = [ledgerEntry, ...contract.shared_animal_ledger].slice(0, SHARED_ANIMAL_LEDGER_LIMIT);
  contract.shared_animals = {
    ...sharedAnimals,
    revision: Math.max(sharedAnimals.revision || 0, operatedAt),
    animals: nextAnimals,
    summary: {
      ...sharedAnimals.summary,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: Math.max(0, stateCounts.total - stateCounts.fed),
      pettable_count: Math.max(0, stateCounts.total - stateCounts.petted),
      product_ready_count: stateCounts.product_ready,
      animal_action_ledger_count: contract.shared_animal_ledger.length,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      deferred_writes: (sharedAnimals.summary?.deferred_writes || []).filter(item => item !== 'pet' && item !== 'animal.pet'),
    },
  };
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const animalAsset = buildAnimalOriginAssetFromSharedAnimal(nextAnimal);
  const replacedAnimalAssets = contract.origin_assets.animals.map(entry =>
    sanitizeText(entry?.id, 140) === animal.id ? animalAsset : entry
  );
  contract.origin_assets.animals = replacedAnimalAssets.some(entry => sanitizeText(entry?.id, 140) === animal.id)
    ? replacedAnimalAssets
    : [animalAsset, ...replacedAnimalAssets].slice(0, SHARED_ANIMAL_LIMIT);
  appendAudit(contract, 'shared_animal_petted', actor, {
    ledger_id: ledgerEntry.id,
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    actor_username: actorUsername,
    permission_mode: animal.permission_mode,
    simultaneous_online_bonus: simultaneousOnlineBonus,
    personal_save_changed: false,
    shared_warehouse_changed: false,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_animals: contract.shared_animals,
    animal: nextAnimal,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: [],
    idempotent: false,
    already_petted: false,
    animal_action: {
      action: 'pet',
      animal_id: animal.id,
      before_animal_state: beforeState,
      after_animal_state: afterState,
      simultaneous_online_bonus: simultaneousOnlineBonus,
      personal_save_changed: false,
      shared_warehouse_changed: false,
      shared_fund_changed: false,
    },
  };
}

async function collectCohabitationSharedAnimalProduct(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('login required', 401);
  const request = normalizeSharedAnimalActionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, 'collect shared animal product');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  contract.shared_animal_ledger = normalizeAnimalActionLedger(contract.shared_animal_ledger);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_animals = normalizeSharedAnimals(contract.shared_animals);

  const previousEntry = contract.shared_animal_ledger.find(entry =>
    entry.action === 'collect_product' && entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousEntry) {
    if (previousEntry.animal_id !== request.animal_id) {
      throw createError('idempotency_key cannot be reused for another shared animal product request', 409);
    }
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      previousEntry.warehouse_ledger_ids.includes(entry.id)
      || (entry.action === 'deposit' && entry.idempotency_key === request.idempotency_key)
    );
    return {
      contract: toPublicContract(contract),
      shared_animals: contract.shared_animals,
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      animal: findSharedAnimal(contract.shared_animals, previousEntry.animal_id),
      ledger_entry: previousEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_collected: previousEntry.status === 'committed',
    };
  }

  if (!contract.shared_animals.persisted) {
    contract.shared_animals = buildSharedAnimalsFromSnapshots(contract, contract.members.map(readMemberAnimalSnapshot), {
      persisted: true,
    });
  }
  const sharedAnimals = normalizeSharedAnimals(contract.shared_animals);
  const animal = findSharedAnimal(sharedAnimals, request.animal_id);
  if (!animal) throw createError('shared animal not found', 404);
  assertSharedAnimalProductCollectAllowed(contract, member, animal, actorPermissions);
  const productDef = getSharedAnimalProductDef(animal);
  if (!productDef) throw createError('shared animal does not produce collectible products', 409);
  const animalState = animal.animal_state && typeof animal.animal_state === 'object' ? animal.animal_state : summarizeAnimal({});
  if (animalState.sick === true) throw createError('shared animal product cannot be collected while sick', 409);
  if (animalState.was_fed !== true) throw createError('shared animal must be fed before collecting product', 409);
  const daysSinceProduct = Math.max(0, Math.floor(Number(animalState.days_since_product) || 0));
  if (daysSinceProduct < productDef.produce_days) throw createError('shared animal product is not ready', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const productQuantity = 1;
  const productQuality = getSharedAnimalProductQuality(animal);
  const beforeState = { ...animalState };
  const afterState = {
    ...animalState,
    days_since_product: 0,
  };
  const nextAnimal = {
    ...animal,
    animal_state: afterState,
    current_keeper_username: member.username,
    current_keeper_display_name: member.display_name || member.username,
    current_keeper_manor_role: actorManorRole,
    current_keeper_manor_role_label: actorManorRoleDef?.label || '',
    readonly: false,
  };
  const warehouseTargetRef = `shared_animal:product:${animal.id}`;
  const warehouseLedgerEntry = normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'deposit',
    item_id: productDef.product_id,
    quantity: productQuantity,
    quality: productQuality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: animal.origin_owner_id || `shared_animals:${contract.id}`,
    source_owner_username: animal.origin_owner_username || member.username,
    source_owner_display_name: animal.origin_owner_display_name || member.display_name || member.username,
    source_owner_key: animal.origin_owner_key || member.username_key,
    source_owner_manor_role: animal.origin_owner_manor_role,
    source_owner_manor_role_label: animal.origin_owner_manor_role_label,
    source_save_id: animal.origin_save_id,
    source_save_slot: animal.source_save_slot,
    source_save_revision: animal.source_save_revision,
    source_inventory: 'shared_animals.animals',
    target_owner_id: `shared_warehouse:${contract.id}`,
    target_owner_username: 'shared_warehouse',
    target_owner_display_name: 'shared warehouse',
    target_owner_key: 'shared_warehouse',
    target_inventory: 'shared_warehouse.items',
    target_ref: warehouseTargetRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: 'shared animal product was deposited into shared warehouse; rollback should compensate by warehouse ledger and animal ledger.',
    status: 'committed',
  });

  contract.shared_warehouse.ledger = [warehouseLedgerEntry, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const nextAnimals = sharedAnimals.animals.map(entry => entry.id === animal.id ? nextAnimal : entry);
  const stateCounts = countSharedAnimalStates(nextAnimals);
  const ledgerEntry = normalizeAnimalActionLedgerEntry({
    id: makeId('shared_animal_ledger'),
    action: 'collect_product',
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_key: member.username_key,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    product_item_id: productDef.product_id,
    product_quantity: productQuantity,
    product_quality: productQuality,
    warehouse_ledger_ids: [warehouseLedgerEntry.id],
    shared_warehouse_changed: true,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    origin_owner_display_name: animal.origin_owner_display_name,
    origin_owner_key: animal.origin_owner_key,
    origin_save_id: animal.origin_save_id,
    source_save_slot: animal.source_save_slot,
    source_save_revision: animal.source_save_revision,
    before_animal_state: beforeState,
    after_animal_state: afterState,
    permission_mode: animal.permission_mode,
    idempotency_key: request.idempotency_key,
    at: operatedAt,
    reversible: true,
    compensation_hint: 'contract-animal product collect deposits output into shared warehouse; personal saves are unchanged.',
    status: 'committed',
  });
  contract.shared_animal_ledger = [ledgerEntry, ...contract.shared_animal_ledger].slice(0, SHARED_ANIMAL_LEDGER_LIMIT);
  contract.shared_animals = {
    ...sharedAnimals,
    revision: Math.max(sharedAnimals.revision || 0, operatedAt),
    animals: nextAnimals,
    summary: {
      ...sharedAnimals.summary,
      animal_count: stateCounts.total,
      fed_count: stateCounts.fed,
      petted_count: stateCounts.petted,
      sick_count: stateCounts.sick,
      feedable_count: Math.max(0, stateCounts.total - stateCounts.fed),
      pettable_count: Math.max(0, stateCounts.total - stateCounts.petted),
      product_ready_count: stateCounts.product_ready,
      animal_action_ledger_count: contract.shared_animal_ledger.length,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_write_enabled: true,
      shared_warehouse_feed_consume_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      deferred_writes: (sharedAnimals.summary?.deferred_writes || [])
        .filter(item => item !== 'animal.collect_product' && item !== 'collect_product'),
    },
  };
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  const animalAsset = buildAnimalOriginAssetFromSharedAnimal(nextAnimal);
  const replacedAnimalAssets = contract.origin_assets.animals.map(entry =>
    sanitizeText(entry?.id, 140) === animal.id ? animalAsset : entry
  );
  contract.origin_assets.animals = replacedAnimalAssets.some(entry => sanitizeText(entry?.id, 140) === animal.id)
    ? replacedAnimalAssets
    : [animalAsset, ...replacedAnimalAssets].slice(0, SHARED_ANIMAL_LIMIT);
  contract.origin_assets.warehouse_items = [
    buildWarehouseOriginAsset(warehouseLedgerEntry),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_animal_product_collected', actor, {
    ledger_id: ledgerEntry.id,
    warehouse_ledger_ids: [warehouseLedgerEntry.id],
    animal_id: animal.id,
    source_animal_id: animal.source_animal_id,
    origin_owner_id: animal.origin_owner_id,
    origin_owner_username: animal.origin_owner_username,
    actor_username: actorUsername,
    product_item_id: productDef.product_id,
    product_quantity: productQuantity,
    product_quality: productQuality,
    target_ref: warehouseTargetRef,
    permission_mode: animal.permission_mode,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    shared_animals: contract.shared_animals,
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    animal: nextAnimal,
    ledger_entry: ledgerEntry,
    warehouse_ledger_entries: [warehouseLedgerEntry],
    idempotent: false,
    already_collected: false,
    animal_action: {
      action: 'collect_product',
      animal_id: animal.id,
      product_item_id: productDef.product_id,
      product_quantity: productQuantity,
      product_quality: productQuality,
      warehouse_ledger_ids: [warehouseLedgerEntry.id],
      before_animal_state: beforeState,
      after_animal_state: afterState,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
  };
}

async function processCohabitationSharedWorkshopRecipe(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('login required', 401);
  const request = normalizeSharedWorkshopProcessPayload(payload);
  const recipe = SHARED_WORKSHOP_RECIPE_CATALOG[request.recipe_id];
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, 'process shared workshop recipe');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  assertSharedWorkshopProcessAllowed(contract, member, actorPermissions);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);

  const previousOutputEntry = contract.shared_warehouse.ledger.find(entry =>
    entry.action === 'deposit'
    && entry.idempotency_key
    && entry.idempotency_key === request.idempotency_key
    && entry.target_ref === `shared_workshop:${recipe.id}`
  );
  if (previousOutputEntry) {
    const previousWarehouseEntries = contract.shared_warehouse.ledger.filter(entry =>
      entry.idempotency_key === request.idempotency_key
      && (entry.target_ref === `shared_workshop:${recipe.id}` || entry.source_inventory === 'shared_warehouse.items')
    );
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      recipe,
      ledger_entry: previousOutputEntry,
      warehouse_ledger_entries: previousWarehouseEntries,
      idempotent: true,
      already_processed: true,
      workshop_action: {
        action: 'process',
        recipe_id: recipe.id,
        process_kind: recipe.process_kind || 'processing',
        output_item_id: previousOutputEntry.item_id,
        output_quantity: previousOutputEntry.quantity,
        output_quality: previousOutputEntry.quality,
        output_quality_before_bonus: previousOutputEntry.simultaneous_online_bonus?.output_quality_before || previousOutputEntry.quality,
        warehouse_ledger_ids: previousWarehouseEntries.map(entry => entry.id),
        simultaneous_online_bonus: previousOutputEntry.simultaneous_online_bonus,
        personal_save_changed: false,
        shared_warehouse_changed: true,
        shared_fund_changed: false,
      },
    };
  }

  const allocationResults = recipe.input_items.map(input => ({
    input,
    result: buildWarehouseWithdrawalAllocations(contract.shared_warehouse, input.item_id, input.quantity, input.quality),
  }));
  const missingInput = allocationResults.find(entry => !entry.result.ok);
  if (missingInput) throw createError('shared warehouse does not have enough normal materials for this workshop recipe', 409);

  const operatedAt = nowSeconds();
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const targetRef = `shared_workshop:${recipe.id}`;
  const sourceLedgerIds = [...new Set(allocationResults.flatMap(({ result }) =>
    result.allocations.flatMap(allocation => allocation.source_ledger_ids || [])
  ).map(id => sanitizeText(id, 100)).filter(Boolean))];
  const sourceLedgerEntries = sourceLedgerIds
    .map(id => contract.shared_warehouse.ledger.find(entry => entry.id === id))
    .filter(Boolean);
  const simultaneousOnlineBonus = buildSharedWorkshopProcessCoopBonusSnapshot(contract, actorUsername, {
    recipe_id: recipe.id,
    source_entries: sourceLedgerEntries,
    output_quality_before: recipe.output_quality,
  });
  const outputQuality = simultaneousOnlineBonus.output_quality_after || recipe.output_quality;
  const consumeLedgerEntries = allocationResults.flatMap(({ input, result }) =>
    result.allocations.map(allocation => normalizeWarehouseLedgerEntry({
      id: makeId('shared_warehouse_ledger'),
      action: 'consume',
      item_id: input.item_id,
      quantity: allocation.quantity,
      quality: input.quality,
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
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
      source_save_revision: allocation.source_save_revision,
      source_inventory: allocation.source_inventory || 'shared_warehouse.items',
      source_ledger_ids: allocation.source_ledger_ids,
      target_owner_id: `shared_workshop:${contract.id}`,
      target_owner_username: 'shared_workshop',
      target_owner_display_name: 'shared workshop',
      target_owner_key: 'shared_workshop',
      target_inventory: 'shared_workshop.inputs',
      target_ref: targetRef,
      at: operatedAt,
      idempotency_key: request.idempotency_key,
      reversible: true,
      compensation_hint: 'shared workshop processing consumed shared warehouse inputs; rollback should replay the paired consume and output deposit ledgers.',
      status: 'committed',
    }))
  ).filter(Boolean);
  const outputLedgerEntry = normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'deposit',
    item_id: recipe.output_item_id,
    quantity: recipe.output_quantity,
    quality: outputQuality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: actorManorRoleDef?.label || '',
    source_owner_id: `shared_workshop:${contract.id}`,
    source_owner_username: 'shared_workshop',
    source_owner_display_name: recipe.label,
    source_owner_key: 'shared_workshop',
    source_owner_manor_role: actorManorRole,
    source_owner_manor_role_label: actorManorRoleDef?.label || '',
    source_inventory: 'shared_workshop.outputs',
    source_ledger_ids: consumeLedgerEntries.map(entry => entry.id),
    target_owner_id: `shared_warehouse:${contract.id}`,
    target_owner_username: 'shared_warehouse',
    target_owner_display_name: 'shared warehouse',
    target_owner_key: 'shared_warehouse',
    target_inventory: 'shared_warehouse.items',
    target_ref: targetRef,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: 'shared workshop output was deposited into shared warehouse; personal saves and shared fund are unchanged.',
    status: 'committed',
    simultaneous_online_bonus: simultaneousOnlineBonus,
  });
  const warehouseLedgerEntries = [outputLedgerEntry, ...consumeLedgerEntries];
  contract.shared_warehouse.ledger = [...warehouseLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...warehouseLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'shared_workshop_processed', actor, {
    warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
    consume_ledger_ids: consumeLedgerEntries.map(entry => entry.id),
    output_ledger_id: outputLedgerEntry.id,
    recipe_id: recipe.id,
    station: recipe.station,
    process_kind: recipe.process_kind || 'processing',
    input_items: recipe.input_items,
    output_item_id: recipe.output_item_id,
    output_quantity: recipe.output_quantity,
    output_quality: outputQuality,
    output_quality_before_bonus: recipe.output_quality,
    simultaneous_online_bonus: simultaneousOnlineBonus,
    actor_username: actorUsername,
    target_ref: targetRef,
    personal_save_changed: false,
    shared_warehouse_changed: true,
    shared_fund_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    recipe,
    ledger_entry: outputLedgerEntry,
    warehouse_ledger_entries: warehouseLedgerEntries,
    idempotent: false,
    already_processed: false,
    workshop_action: {
      action: 'process',
      recipe_id: recipe.id,
      station: recipe.station,
      process_kind: recipe.process_kind || 'processing',
      input_items: recipe.input_items,
      output_item_id: recipe.output_item_id,
      output_quantity: recipe.output_quantity,
      output_quality: outputQuality,
      output_quality_before_bonus: recipe.output_quality,
      warehouse_ledger_ids: warehouseLedgerEntries.map(entry => entry.id),
      simultaneous_online_bonus: simultaneousOnlineBonus,
      personal_save_changed: false,
      shared_warehouse_changed: true,
      shared_fund_changed: false,
    },
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

  assertSharedWarehouseInboundGovernance(contract, actor, 'deposit', deposit.idempotency_key, store);

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

  assertSharedWarehouseOutboundGovernance(contract, actor, 'withdraw', withdraw.idempotency_key, store);

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

async function createCohabitationWarehouseHighValueWithdrawalDraft(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeWarehouseHighValueWithdrawalDraftPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '发起共同仓库高价值取出确认');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  assertWarehouseHighValueWithdrawalPermission(actorPermissions, request.risk_level);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_warehouse_withdrawal_drafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts);
  const previousDraft = contract.shared_warehouse_withdrawal_drafts.find(entry =>
    entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousDraft) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      draft: previousDraft,
      idempotent: true,
    };
  }

  assertSharedWarehouseOutboundGovernance(contract, actor, 'high_value_withdrawal_draft', request.idempotency_key, store);

  const stockQuantity = getWarehouseStockQuantity(contract.shared_warehouse, request.item_id, request.quality);
  const frozenQuantity = getWarehouseFrozenQuantity(contract, request.item_id, request.quality);
  if (stockQuantity < frozenQuantity + request.quantity) throw createError('共同仓库高价值库存不足，或已有冻结草案占用该库存', 409);
  const allocationResult = buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    request.item_id,
    request.quantity,
    request.quality
  );
  if (!allocationResult.ok) throw createError('共同仓库高价值物品来源流水不足，不能冻结取出草案', 409);

  const acceptedMembers = (contract.members || []).filter(entry => entry.status === 'accepted');
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  const now = nowSeconds();
  let draft = normalizeWarehouseWithdrawalDraft({
    id: makeId('warehouse_withdrawal_draft'),
    state: 'pending_confirmation',
    item_id: request.item_id,
    quantity: request.quantity,
    quality: request.quality,
    risk_level: request.risk_level,
    requester_username: member.username,
    requester_display_name: member.display_name || member.username,
    requester_username_key: member.username_key,
    requester_manor_role: actorManorRole,
    requester_manor_role_label: actorManorRoleDef?.label || '',
    target_save_slot: request.save_slot,
    required_member_usernames: acceptedMembers.map(entry => entry.username),
    confirmation_events: [{
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || actorUsername,
      actor_username_key: member.username_key,
      actor_manor_role: actorManorRole,
      actor_manor_role_label: actorManorRoleDef?.label || '',
      confirmation_text: request.reason || '发起人自动确认高价值取出冻结草案',
      confirmed_at: now,
      idempotency_key: request.idempotency_key,
    }],
    source_allocations: allocationResult.allocations,
    frozen_quantity: request.quantity,
    frozen_at: now,
    created_at: now,
    idempotency_key: request.idempotency_key,
  });
  if (draft.confirmation_state.all_members_confirmed) draft = normalizeWarehouseWithdrawalDraft({ ...draft, state: 'ready_to_execute' });
  contract.shared_warehouse_withdrawal_drafts = [draft, ...contract.shared_warehouse_withdrawal_drafts].slice(0, WAREHOUSE_WITHDRAWAL_DRAFT_LIMIT);
  appendAudit(contract, 'warehouse_high_value_withdrawal_draft_created', actor, {
    draft_id: draft.id,
    item_id: draft.item_id,
    quantity: draft.quantity,
    quality: draft.quality,
    risk_level: draft.risk_level,
    frozen_quantity: draft.frozen_quantity,
    required_member_usernames: draft.required_member_usernames,
    source_ledger_ids: [...new Set(draft.source_allocations.flatMap(allocation => allocation.source_ledger_ids || []))],
    shared_warehouse_changed: false,
    personal_save_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    draft,
    idempotent: false,
  };
}

async function confirmCohabitationWarehouseHighValueWithdrawalDraft(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeWarehouseHighValueWithdrawalConfirmPayload(payload);
  if (!request.freeze_acknowledged || !request.rollback_plan_acknowledged) {
    throw createError('确认高价值取出前必须确认冻结与回滚方案', 400);
  }
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '确认共同仓库高价值取出');
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_warehouse_withdrawal_drafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts);
  const normalizedDraftId = sanitizeText(draftId, 100);
  const draftIndex = contract.shared_warehouse_withdrawal_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同仓库高价值取出草案不存在', 404);
  let draft = contract.shared_warehouse_withdrawal_drafts[draftIndex];
  if (!WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES.has(draft.state)) throw createError('该高价值取出草案当前不能确认', 409);
  if (!draft.required_member_usernames.map(normalizeUsernameKey).includes(member.username_key)) {
    throw createError('只有草案要求的契约成员可以确认本次取出', 403);
  }
  if (draft.confirmation_events.some(event => event.idempotency_key === request.idempotency_key)) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      draft,
      idempotent: true,
    };
  }
  if (draft.confirmation_events.some(event => event.actor_username_key === member.username_key)) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      draft,
      idempotent: true,
    };
  }

  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const actorManorRoleDef = isFamilyRoleContractType(contract.type) ? getFamilyManorRoleDef(actorManorRole) : null;
  draft = normalizeWarehouseWithdrawalDraft({
    ...draft,
    confirmation_events: [
      ...draft.confirmation_events,
      {
        actor_username: actorUsername,
        actor_display_name: actor.displayName || actor.display_name || actorUsername,
        actor_username_key: member.username_key,
        actor_manor_role: actorManorRole,
        actor_manor_role_label: actorManorRoleDef?.label || '',
        confirmation_text: request.confirmation_text || '确认高价值取出冻结与回滚方案',
        confirmed_at: nowSeconds(),
        idempotency_key: request.idempotency_key,
      },
    ],
  });
  if (draft.confirmation_state.all_members_confirmed) draft = normalizeWarehouseWithdrawalDraft({ ...draft, state: 'ready_to_execute' });
  contract.shared_warehouse_withdrawal_drafts[draftIndex] = draft;
  appendAudit(contract, 'warehouse_high_value_withdrawal_draft_confirmed', actor, {
    draft_id: draft.id,
    item_id: draft.item_id,
    quantity: draft.quantity,
    quality: draft.quality,
    risk_level: draft.risk_level,
    state: draft.state,
    confirmed_member_usernames: draft.confirmation_state.confirmed_member_usernames,
    pending_member_usernames: draft.confirmation_state.pending_member_usernames,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    draft,
    idempotent: false,
  };
}

async function executeCohabitationWarehouseHighValueWithdrawalDraft(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeWarehouseHighValueWithdrawalExecutePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '执行共同仓库高价值取出');
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_warehouse_withdrawal_drafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts);
  const normalizedDraftId = sanitizeText(draftId, 100);
  const draftIndex = contract.shared_warehouse_withdrawal_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同仓库高价值取出草案不存在', 404);
  let draft = contract.shared_warehouse_withdrawal_drafts[draftIndex];
  if (draft.state === 'executed' && draft.execute_idempotency_key === request.idempotency_key) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      draft,
      ledger_entries: (contract.shared_warehouse.ledger || []).filter(entry => draft.warehouse_ledger_ids.includes(entry.id)),
      idempotent: true,
    };
  }
  if (draft.state !== 'ready_to_execute') throw createError('高价值取出草案尚未完成双方确认，不能执行', 409);
  if (draft.requester_username_key !== member.username_key) throw createError('只有草案发起人可以把高价值物品取入自己的存档', 403);
  if (request.expected_state && request.expected_state !== draft.state) throw createError('高价值取出草案状态已变化，请刷新后重试', 409);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  assertWarehouseHighValueWithdrawalPermission(actorPermissions, draft.risk_level);

  const stockQuantity = getWarehouseStockQuantity(contract.shared_warehouse, draft.item_id, draft.quality);
  if (stockQuantity < draft.quantity) throw createError('共同仓库高价值库存不足，不能执行取出', 409);
  const context = getActiveSaveContext(
    actorUsername,
    request.save_slot ?? draft.target_save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法执行共同仓库高价值取出'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  const addResult = addWithdrawnWarehouseItemToInventory(projectedData, draft.item_id, draft.quantity, draft.quality);
  if (!addResult.ok) throw createError('个人背包和临时背包空间不足，已中止本次高价值取出');
  const afterMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  if (afterMoney !== beforeMoney) throw createError('共同仓库高价值取出不会处理个人铜币，已中止本次操作', 500);

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
  const allocations = draft.source_allocations.length ? draft.source_allocations : buildWarehouseWithdrawalAllocations(
    contract.shared_warehouse,
    draft.item_id,
    draft.quantity,
    draft.quality
  ).allocations;
  const ledgerEntries = allocations.map(allocation => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'withdraw',
    item_id: draft.item_id,
    quantity: allocation.quantity,
    quality: draft.quality,
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
    target_ref: draft.id,
    at: operatedAt,
    idempotency_key: request.idempotency_key,
    reversible: true,
    compensation_hint: '高价值取出已完成双方确认并写个人背包落点；若需回滚，必须按本流水、草案和目标背包落点走补偿复核。',
    status: 'committed',
  })).filter(Boolean);
  contract.shared_warehouse.ledger = [...ledgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...ledgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  draft = normalizeWarehouseWithdrawalDraft({
    ...draft,
    state: 'executed',
    execute_idempotency_key: request.idempotency_key,
    executed_at: operatedAt,
    executed_by_username: actorUsername,
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    warehouse_ledger_ids: ledgerEntries.map(entry => entry.id),
  });
  contract.shared_warehouse_withdrawal_drafts[draftIndex] = draft;
  appendAudit(contract, 'warehouse_high_value_withdrawal_executed', actor, {
    draft_id: draft.id,
    ledger_ids: ledgerEntries.map(entry => entry.id),
    item_id: draft.item_id,
    quantity: draft.quantity,
    quality: draft.quality,
    risk_level: draft.risk_level,
    target_owner_id: targetOwnerId,
    target_save_id: targetSaveId,
    target_save_slot: targetSaveSlot,
    save_revision: saveRevision,
    source_owner_count: new Set(ledgerEntries.map(entry => entry.source_owner_id || entry.source_owner_key)).size,
    shared_warehouse_changed: true,
    personal_save_changed: true,
    compensation_required: true,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    draft,
    ledger_entry: ledgerEntries[0],
    ledger_entries: ledgerEntries,
    idempotent: false,
    personal_inventory: {
      item_id: draft.item_id,
      quality: draft.quality,
      added_quantity: draft.quantity,
      total_quantity: countDepositableMainInventoryItem(projectedData, draft.item_id, draft.quality),
      target_slots: addResult.target_slots,
      personal_money_merged: false,
    },
  };
}

async function rollbackCohabitationWarehouseHighValueWithdrawalDraft(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeWarehouseHighValueWithdrawalRollbackPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '撤销共同仓库高价值取出草案');
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_warehouse_withdrawal_drafts = normalizeWarehouseWithdrawalDrafts(contract.shared_warehouse_withdrawal_drafts);
  const normalizedDraftId = sanitizeText(draftId, 100);
  const draftIndex = contract.shared_warehouse_withdrawal_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同仓库高价值取出草案不存在', 404);
  let draft = contract.shared_warehouse_withdrawal_drafts[draftIndex];
  if (draft.state === 'rolled_back' && draft.rollback_idempotency_key === request.idempotency_key) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      draft,
      idempotent: true,
    };
  }
  if (draft.state === 'executed') throw createError('高价值取出已经执行，不能直接释放冻结；请按取出流水进入补偿复核', 409);
  if (!WAREHOUSE_ACTIVE_WITHDRAWAL_DRAFT_STATES.has(draft.state)) throw createError('该高价值取出草案当前不能回滚', 409);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const isRequester = draft.requester_username_key === member.username_key;
  const canGovern = actorPermissions.storage.withdraw_rare === true || actorPermissions.storage.withdraw_high_quality === true || isContractOwner(contract, actorUsername);
  if (!isRequester && !canGovern) throw createError('只有草案发起人、owner 或具备高价值取出权限的成员可以撤销草案', 403);

  draft = normalizeWarehouseWithdrawalDraft({
    ...draft,
    state: 'rolled_back',
    rollback_idempotency_key: request.idempotency_key,
    rolled_back_at: nowSeconds(),
    rolled_back_by_username: actorUsername,
    rollback_reason: request.reason,
  });
  contract.shared_warehouse_withdrawal_drafts[draftIndex] = draft;
  appendAudit(contract, 'warehouse_high_value_withdrawal_rolled_back', actor, {
    draft_id: draft.id,
    item_id: draft.item_id,
    quantity: draft.quantity,
    quality: draft.quality,
    risk_level: draft.risk_level,
    released_frozen_quantity: draft.frozen_quantity,
    reason: request.reason,
    shared_warehouse_changed: false,
    personal_save_changed: false,
  }, request.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    draft,
    idempotent: false,
  };
}

async function recoverCohabitationWarehouseGovernance(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeWarehouseGovernanceRecoveryPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '恢复共同仓库治理阻断');
  const targetUsername = request.target_username || actorUsername;
  const targetMember = getContractMember(contract, targetUsername);
  if (!targetMember || targetMember.status !== 'accepted') throw createError('只能恢复已接受成员的共同仓库治理阻断', 404);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const canGovern = isContractOwner(contract, actorUsername)
    || actorPermissions.storage.withdraw_rare === true
    || actorPermissions.storage.withdraw_high_quality === true;
  if (!canGovern) throw createError('只有契约 owner 或具备高价值仓库权限的成员可以恢复共同仓库治理阻断', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.shared_warehouse_governance_recoveries = normalizeWarehouseGovernanceRecoveries(contract.shared_warehouse_governance_recoveries);
  const previousRecovery = contract.shared_warehouse_governance_recoveries.find(entry =>
    entry.idempotency_key && entry.idempotency_key === request.idempotency_key
  );
  if (previousRecovery) {
    const warehouse = buildSharedWarehouseSnapshot(contract, previousRecovery.target_username);
    return {
      contract: toPublicContract(contract),
      warehouse,
      governance: warehouse.governance,
      recovery: previousRecovery,
      idempotent: true,
    };
  }

  const targetGovernance = buildSharedWarehouseGovernanceSnapshot(contract, targetMember.username);
  const needsInboundRecovery = targetGovernance.actor_window.inbound_action_count >= targetGovernance.inbound_action_limit;
  const needsOutboundRecovery = targetGovernance.actor_window.outbound_action_count >= targetGovernance.outbound_action_limit;
  const directionNeedsRecovery = request.direction === 'all'
    ? needsInboundRecovery || needsOutboundRecovery
    : request.direction === 'inbound'
      ? needsInboundRecovery
      : needsOutboundRecovery;
  if (!directionNeedsRecovery) throw createError('目标成员当前没有对应方向的共同仓库高频阻断需要恢复', 409);

  const recoveredAt = nowSeconds();
  const recovery = normalizeWarehouseGovernanceRecovery({
    id: makeId('warehouse_governance_recovery'),
    state: 'applied',
    direction: request.direction,
    target_username: targetMember.username,
    target_username_key: targetMember.username_key,
    target_display_name: targetMember.display_name || targetMember.username,
    requester_username: targetMember.username,
    requester_username_key: targetMember.username_key,
    approver_username: actorUsername,
    approver_display_name: actor.displayName || actor.display_name || actorUsername,
    approver_username_key: member.username_key,
    reason: request.reason,
    recovery_note: request.recovery_note || '管理恢复共同仓库高频治理阻断',
    window_seconds: WAREHOUSE_GOVERNANCE_WINDOW_SECONDS,
    inbound_action_count: targetGovernance.actor_window.inbound_action_count,
    inbound_quantity: targetGovernance.actor_window.inbound_quantity,
    outbound_action_count: targetGovernance.actor_window.outbound_action_count,
    outbound_quantity: targetGovernance.actor_window.outbound_quantity,
    inbound_ledger_ids: targetGovernance.actor_window.inbound_ledger_ids,
    outbound_ledger_ids: targetGovernance.actor_window.outbound_ledger_ids,
    created_at: recoveredAt,
    expires_at: recoveredAt + WAREHOUSE_GOVERNANCE_WINDOW_SECONDS,
    idempotency_key: request.idempotency_key,
  });
  contract.shared_warehouse_governance_recoveries = [
    recovery,
    ...contract.shared_warehouse_governance_recoveries,
  ].slice(0, WAREHOUSE_GOVERNANCE_RECOVERY_LIMIT);
  appendAudit(contract, 'warehouse_governance_recovered', actor, {
    recovery_id: recovery.id,
    direction: recovery.direction,
    target_username: recovery.target_username,
    target_username_key: recovery.target_username_key,
    reason: recovery.reason,
    recovery_note: recovery.recovery_note,
    expires_at: recovery.expires_at,
    window_seconds: recovery.window_seconds,
    inbound_action_count: recovery.inbound_action_count,
    outbound_action_count: recovery.outbound_action_count,
    inbound_ledger_ids: recovery.inbound_ledger_ids,
    outbound_ledger_ids: recovery.outbound_ledger_ids,
    shared_warehouse_changed: false,
    personal_inventory_changed: false,
    personal_money_merged: false,
  }, request.idempotency_key);
  saveContractStore(store);

  const warehouse = buildSharedWarehouseSnapshot(contract, targetMember.username);
  return {
    contract: toPublicContract(contract),
    warehouse,
    governance: warehouse.governance,
    recovery,
    idempotent: false,
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

  assertSharedWarehouseOutboundGovernance(contract, actor, 'sell', sale.idempotency_key, store);

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
    policy: '大额共同基金支出必须先完成全部成员确认，执行扣款另走后续专用接口。',
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
  if (actorPermissions.fund.spend_large !== true) throw createError('你没有发起共同基金大额确认草案的权限', 403);
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
  if (beforeBalance < draftRequest.amount) throw createError('共同基金余额不足，暂时不能发起大额确认草案');
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
    compensation_policy: getLargeFundSpendCompensationPolicy(draftRequest.purpose, false),
    deferred_operations: getLargeFundSpendDeferredOperations(draftRequest.purpose, false),
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
  if (actorPermissions.fund.spend_large !== true) throw createError('你没有执行共同基金大额扣款的权限', 403);
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

  const shouldWriteBuildingLedgerForGovernance = isFamilyBuildingLargeFundPurpose(draft.purpose);
  if (!shouldWriteBuildingLedgerForGovernance) {
    const pendingHighRiskReceipts = contract.fund_large_spend_drafts
      .map(normalizeFundLargeSpendDraft)
      .filter(entry =>
        entry.id !== draft.id
        && entry.state === 'executed'
        && isHighRiskNonBuildingLargeFundPurpose(entry.purpose)
        && (!entry.high_risk_receipt_status || entry.high_risk_receipt_status === 'pending')
      );
    if (pendingHighRiskReceipts.length > 0) {
      appendAudit(contract, 'fund_high_risk_execution_blocked', actor, {
        draft_id: draft.id,
        purpose: draft.purpose,
        target_ref: draft.target_ref,
        amount: draft.amount,
        pending_receipt_draft_ids: pendingHighRiskReceipts.map(entry => entry.id),
        pending_receipt_count: pendingHighRiskReceipts.length,
        personal_money_merged: false,
        required_operation: 'record_high_risk_receipt',
      }, executeRequest.idempotency_key);
      saveContractStore(store);
      throw createError('存在未收口回执的共同基金高风险扣款，请先记录交付或退款回执后再执行新的高风险扣款', 409);
    }
  }

  const beforeBalance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0));
  if (beforeBalance < draft.amount) throw createError('共同基金余额不足，暂时不能执行该大额草案扣款');
  const operatedAt = nowSeconds();
  const afterBalance = beforeBalance - draft.amount;
  const shouldWriteBuildingLedger = isFamilyBuildingLargeFundPurpose(draft.purpose);
  if (!shouldWriteBuildingLedger) {
    const pendingHighRiskReceipts = contract.fund_large_spend_drafts
      .map(normalizeFundLargeSpendDraft)
      .filter(entry =>
        entry.id !== draft.id
        && entry.state === 'executed'
        && isHighRiskNonBuildingLargeFundPurpose(entry.purpose)
        && (!entry.high_risk_receipt_status || entry.high_risk_receipt_status === 'pending')
      );
    if (pendingHighRiskReceipts.length > 0) {
      appendAudit(contract, 'fund_high_risk_execution_blocked', actor, {
        draft_id: draft.id,
        purpose: draft.purpose,
        target_ref: draft.target_ref,
        amount: draft.amount,
        pending_receipt_draft_ids: pendingHighRiskReceipts.map(entry => entry.id),
        pending_receipt_count: pendingHighRiskReceipts.length,
        personal_money_merged: false,
        required_operation: 'record_high_risk_receipt',
      }, executeRequest.idempotency_key);
      saveContractStore(store);
      throw createError('存在未收口回执的共同基金高风险扣款，请先记录交付或退款回执后再执行新的高风险扣款', 409);
    }
  }
  const deferredOperations = getLargeFundSpendDeferredOperations(draft.purpose, true);
  const executionPolicy = getLargeFundSpendExecutionPolicy(draft.purpose);
  const compensationPolicy = getLargeFundSpendCompensationPolicy(draft.purpose, true);
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
    compensation_hint: compensationPolicy,
    status: 'committed',
  });
  contract.shared_fund.balance = afterBalance;
  contract.shared_fund.ledger = [ledgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  let buildingLedgerEntry = shouldWriteBuildingLedger ? findFamilyBuildingLedgerEntry(contract, draft, ledgerEntry) : null;
  if (shouldWriteBuildingLedger && !buildingLedgerEntry) {
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
      policy: executionPolicy,
    },
    executed_at: operatedAt,
    executed_by: member.username,
    execution_enabled: false,
    final_spend_ledger_id: ledgerEntry.id,
    final_building_ledger_id: buildingLedgerEntry?.id || '',
    compensation_policy: compensationPolicy,
    deferred_operations: deferredOperations,
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
    building_ledger_written: Boolean(buildingLedgerEntry),
    building_ledger_id: buildingLedgerEntry?.id || '',
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
      building_ledger_written: Boolean(buildingLedgerEntry),
      building_ledger_id: buildingLedgerEntry?.id || '',
    },
  };
}

async function recordCohabitationFundHighRiskReceipt(contractId, draftId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const receiptRequest = normalizeLargeFundHighRiskReceiptPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '记录共同基金高风险回执');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.fund.spend_large !== true) throw createError('你没有记录共同基金高风险回执的权限', 403);
  if (actorPermissions.confirmations.large_fund_spend_requires_both !== true) {
    throw createError('共同基金高风险回执必须保留双方确认安全阀', 409);
  }

  const normalizedDraftId = sanitizeText(draftId || payload.draft_id || payload.id, 80);
  if (!normalizedDraftId) throw createError('请指定要记录回执的共同基金高风险草案');
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  normalizeFamilyBuildingLedger(contract);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(entry => entry.id === normalizedDraftId);
  if (draftIndex < 0) throw createError('共同基金高风险草案不存在', 404);
  const draft = normalizeFundLargeSpendDraft(contract.fund_large_spend_drafts[draftIndex]);
  if (!isHighRiskNonBuildingLargeFundPurpose(draft.purpose)) {
    throw createError('该共同基金草案不是稀有物、限定装饰或家庭重大事件用途，请走对应建筑或普通基金流程', 403);
  }
  if (draft.state !== 'executed' || !draft.final_spend_ledger_id) {
    throw createError('共同基金高风险回执必须在草案执行扣款后记录', 409);
  }
  const originalFundLedger = contract.shared_fund.ledger.find(entry => entry.id === draft.final_spend_ledger_id);
  if (!originalFundLedger || originalFundLedger.action !== 'spend' || originalFundLedger.spend_tier !== 'large') {
    throw createError('共同基金高风险回执缺少匹配的大额扣款流水，已中止避免误补偿', 409);
  }

  const previousRefundLedger = contract.shared_fund.ledger.find(entry =>
    entry.action === 'high_risk_fund_refund'
    && entry.idempotency_key === receiptRequest.idempotency_key
  );
  if (previousRefundLedger && previousRefundLedger.target_ref !== `high_risk_refund:${draft.id}`) {
    throw createError('共同基金高风险回执幂等键已用于其他退款目标，请更换 idempotency_key', 409);
  }
  if (draft.high_risk_receipt_idempotency_key === receiptRequest.idempotency_key && draft.high_risk_receipt_status !== 'pending') {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      draft,
      receipt: {
        id: draft.high_risk_receipt_id,
        status: draft.high_risk_receipt_status,
        outcome: draft.high_risk_receipt_outcome,
        receipt_ref: draft.high_risk_receipt_ref,
        recorded_at: draft.high_risk_receipt_at,
        recorded_by: draft.high_risk_receipt_by,
      },
      original_fund_ledger_entry: originalFundLedger,
      refund_ledger_entry: draft.high_risk_refund_ledger_id
        ? (contract.shared_fund.ledger.find(entry => entry.id === draft.high_risk_refund_ledger_id) || previousRefundLedger || null)
        : null,
      idempotent: true,
      already_recorded: true,
      shared_fund: {
        refund_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }
  if (draft.high_risk_receipt_status && draft.high_risk_receipt_status !== 'pending') {
    throw createError('该共同基金高风险草案已记录交付或退款回执，不能重复变更结果', 409);
  }

  const operatedAt = nowSeconds();
  const receiptId = makeId('fund_high_risk_receipt');
  let refundLedgerEntry = null;
  let balanceBefore = contract.shared_fund.balance;
  let balanceAfter = balanceBefore;
  let refundAmount = 0;
  let deferredOperations = [];
  let compensationPolicy = '';
  if (receiptRequest.outcome === 'refunded') {
    refundAmount = Math.max(0, Math.floor(Number(draft.amount) || 0));
    balanceAfter = balanceBefore + refundAmount;
    refundLedgerEntry = normalizeFundLedgerEntry({
      id: makeId('shared_fund_ledger'),
      action: 'high_risk_fund_refund',
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
      amount: refundAmount,
      at: operatedAt,
      memo: receiptRequest.memo || '共同基金高风险支出退款回执',
      purpose: draft.purpose,
      spend_category: draft.spend_category,
      spend_tier: 'large',
      target_ref: `high_risk_refund:${draft.id}`,
      balance_after: balanceAfter,
      confirmation_required: true,
      confirmation_status: 'high_risk_refunded',
      idempotency_key: receiptRequest.idempotency_key,
      reversible: true,
      compensation_hint: '共同基金高风险支出已按回执退回共同基金池；不写个人铜币、背包、小屋或家庭主状态。',
      status: 'committed',
    });
    contract.shared_fund.balance = balanceAfter;
    contract.shared_fund.ledger = [refundLedgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
    compensationPolicy = '高风险支出已按回执退回共同基金；若后续仍有争议，按原扣款 ledger、退款 ledger 和共同审计记录复核。';
  } else {
    deferredOperations = draft.purpose === 'family_major_event'
      ? ['family_event_governance_review']
      : ['high_risk_purchase_governance_review'];
    compensationPolicy = draft.purpose === 'family_major_event'
      ? '家庭重大事件已记录回执；本步骤不改个人孩子 / 家庭主状态，后续争议走家庭事件治理复核。'
      : '高风险采购已记录交付回执；本步骤不改个人背包或小屋，后续争议走采购治理复核。';
  }

  const nextDraft = normalizeFundLargeSpendDraft({
    ...draft,
    high_risk_receipt_id: receiptId,
    high_risk_receipt_status: receiptRequest.outcome,
    high_risk_receipt_outcome: receiptRequest.outcome,
    high_risk_receipt_ref: receiptRequest.receipt_ref,
    high_risk_receipt_memo: receiptRequest.memo,
    high_risk_receipt_idempotency_key: receiptRequest.idempotency_key,
    high_risk_receipt_at: operatedAt,
    high_risk_receipt_by: member.username,
    high_risk_receipt_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    high_risk_refund_ledger_id: refundLedgerEntry?.id || '',
    compensation_policy: compensationPolicy,
    deferred_operations: deferredOperations,
  });
  contract.fund_large_spend_drafts[draftIndex] = nextDraft;
  appendAudit(contract, 'fund_high_risk_receipt_recorded', actor, {
    draft_id: nextDraft.id,
    original_fund_ledger_id: originalFundLedger.id,
    refund_fund_ledger_id: refundLedgerEntry?.id || '',
    receipt_id: nextDraft.high_risk_receipt_id,
    outcome: nextDraft.high_risk_receipt_outcome,
    receipt_ref: nextDraft.high_risk_receipt_ref,
    purpose: nextDraft.purpose,
    purpose_label: nextDraft.purpose_label,
    spend_category: nextDraft.spend_category,
    amount: nextDraft.amount,
    refund_amount: refundAmount,
    shared_fund_balance_before: balanceBefore,
    shared_fund_balance_after: balanceAfter,
    personal_money_merged: false,
    personal_inventory_merged: false,
    home_or_family_state_mutated: false,
    compensation_plan_acknowledged: receiptRequest.compensation_plan_acknowledged,
  }, receiptRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    draft: nextDraft,
    receipt: {
      id: nextDraft.high_risk_receipt_id,
      status: nextDraft.high_risk_receipt_status,
      outcome: nextDraft.high_risk_receipt_outcome,
      receipt_ref: nextDraft.high_risk_receipt_ref,
      recorded_at: nextDraft.high_risk_receipt_at,
      recorded_by: nextDraft.high_risk_receipt_by,
    },
    original_fund_ledger_entry: originalFundLedger,
    refund_ledger_entry: refundLedgerEntry,
    idempotent: false,
    already_recorded: false,
    shared_fund: {
      refund_amount: refundAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      personal_money_merged: false,
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
        simultaneous_online_bonus: previousMaterialEntry.simultaneous_online_bonus,
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
        simultaneous_online_bonus: targetEntry.simultaneous_online_bonus,
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
  const simultaneousOnlineBonus = buildFamilyBuildingDecorationCoopBonusSnapshot(contract, actorUsername, targetEntry);
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
    simultaneous_online_bonus: simultaneousOnlineBonus,
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
    simultaneous_online_bonus: simultaneousOnlineBonus,
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
      simultaneous_online_bonus: simultaneousOnlineBonus,
      personal_inventory_merged: false,
    },
    shared_fund: {
      deducted_amount: 0,
      balance_after: contract.shared_fund.balance,
      personal_money_merged: false,
    },
  };
}

async function rollbackCohabitationFamilyBuilding(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const rollbackRequest = normalizeFamilyBuildingRollbackPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '记录家族建筑回滚');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑回滚只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRollback = actorPermissions.fund.spend_large === true
    || actorPermissions.construction.demolish_building === true
    || ['family_head', 'workshop_keeper', 'treasurer'].includes(actorManorRole);
  if (!canRollback) throw createError('你没有记录家族建筑回滚的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑回滚必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousRollbackEntry = familyLedger.find(entry => entry.rollback_idempotency_key === rollbackRequest.idempotency_key);
  if (previousRollbackEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, rollbackRequest);
    if (requestedEntry && requestedEntry.id !== previousRollbackEntry.id) {
      throw createError('该家族建筑回滚幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: previousRollbackEntry,
      idempotent: true,
      already_reverted: previousRollbackEntry.status === 'reverted',
      rollback: {
        shared_fund_refunded: false,
        shared_warehouse_restored: false,
        personal_money_merged: false,
        personal_inventory_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, rollbackRequest);
  if (!targetEntry) throw createError('找不到可回滚的家族建筑流水', 404);
  if (targetEntry.status === 'reverted') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_reverted: true,
      rollback: {
        shared_fund_refunded: false,
        shared_warehouse_restored: false,
        personal_money_merged: false,
        personal_inventory_merged: false,
      },
    };
  }
  if (targetEntry.status === 'compensated') throw createError('该家族建筑流水已进入补偿状态，不能重复记录回滚', 409);
  if (targetEntry.shared_fund_deducted !== true || !targetEntry.fund_ledger_id) {
    throw createError('该家族建筑流水缺少已扣款共同基金凭证，不能记录回滚', 409);
  }
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const materialLedgerEntries = contract.shared_warehouse.ledger
    .filter(entry => targetEntry.material_ledger_ids.includes(entry.id));
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    action: 'reverted',
    status: 'reverted',
    rollback_idempotency_key: rollbackRequest.idempotency_key,
    reverted_at: operatedAt,
    reverted_by_username: member.username,
    reverted_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    rollback_reason: rollbackRequest.reason || '前端或治理流程记录家族建筑回滚',
    rollback_policy: '本步骤只记录家族建筑回滚事实和审计，不自动退共同基金、不恢复共同仓库材料、不改个人资产；后续补偿重放需按基金 ledger、材料 ledger 和建筑流水人工或专用流程处理。',
    compensation_hint: '家族建筑已记录回滚；共同基金退款、共同仓库材料恢复和真实建筑拆除仍需后续补偿重放或人工复核。',
    deferred_operations: ['family_building_compensation_replay', 'fund_compensation_replay'],
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: ['fund_compensation_replay', 'family_building_compensation_replay'],
      compensation_policy: '家族建筑已记录回滚；共同基金退款、材料恢复和真实建筑拆除不由本步骤自动执行，需按审计流水补偿重放。',
    });
  }
  appendAudit(contract, 'family_building_rollback_recorded', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    material_ledger_ids: nextEntry.material_ledger_ids,
    material_ledger_count: materialLedgerEntries.length,
    shared_fund_refunded: false,
    shared_warehouse_restored: false,
    personal_money_merged: false,
    personal_inventory_merged: false,
    rollback_record_only: true,
    compensation_required: true,
  }, rollbackRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    material_ledger_entries: materialLedgerEntries,
    idempotent: false,
    already_reverted: false,
    rollback: {
      shared_fund_refunded: false,
      shared_warehouse_restored: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
    },
  };
}

async function refundCohabitationFamilyBuildingFund(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const refundRequest = normalizeFamilyBuildingFundRefundPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '退回家族建筑共同基金');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑基金退款只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRefund = actorPermissions.fund.spend_large === true
    || actorPermissions.construction.demolish_building === true
    || ['family_head', 'treasurer'].includes(actorManorRole);
  if (!canRefund) throw createError('你没有退回家族建筑共同基金的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑基金退款必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousRefundEntry = familyLedger.find(entry => entry.fund_refund_idempotency_key === refundRequest.idempotency_key);
  if (previousRefundEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, refundRequest);
    if (requestedEntry && requestedEntry.id !== previousRefundEntry.id) {
      throw createError('该家族建筑基金退款幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    const fundLedgerEntry = contract.shared_fund.ledger.find(entry => entry.id === previousRefundEntry.fund_refund_ledger_id) || null;
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: previousRefundEntry,
      fund_ledger_entry: fundLedgerEntry,
      idempotent: true,
      already_refunded: previousRefundEntry.shared_fund_refunded === true,
      shared_fund: {
        refund_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, refundRequest);
  if (!targetEntry) throw createError('找不到可退款的家族建筑流水', 404);
  if (targetEntry.status !== 'reverted') throw createError('请先记录家族建筑回滚，再退回共同基金', 409);
  if (targetEntry.shared_fund_deducted !== true || !targetEntry.fund_ledger_id || targetEntry.amount <= 0) {
    throw createError('该家族建筑流水缺少已扣款共同基金凭证，不能退回共同基金', 409);
  }
  if (targetEntry.shared_fund_refunded === true || targetEntry.fund_refund_ledger_id) {
    const fundLedgerEntry = contract.shared_fund.ledger.find(entry => entry.id === targetEntry.fund_refund_ledger_id) || null;
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      fund_ledger_entry: fundLedgerEntry,
      idempotent: true,
      already_refunded: true,
      shared_fund: {
        refund_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const operatedAt = nowSeconds();
  const refundAmount = Math.max(0, Math.floor(Number(targetEntry.amount) || 0));
  const balanceBefore = contract.shared_fund.balance;
  const balanceAfter = balanceBefore + refundAmount;
  const fundLedgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'family_building_fund_refund',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    amount: refundAmount,
    at: operatedAt,
    memo: refundRequest.reason || '家族建筑回滚后退回共同基金',
    purpose: targetEntry.purpose || 'family_building',
    spend_category: targetEntry.spend_category || 'construction',
    spend_tier: 'large',
    target_ref: `family_building_rollback:${targetEntry.id}`,
    balance_after: balanceAfter,
    confirmation_required: true,
    confirmation_status: 'rollback_refund_recorded',
    idempotency_key: refundRequest.idempotency_key,
    reversible: true,
    compensation_hint: '家族建筑回滚后的共同基金已退回共同基金池；材料恢复、真实建筑拆除和个人资产返还仍需后续独立补偿链处理。',
    status: 'committed',
  });
  contract.shared_fund.balance = balanceAfter;
  contract.shared_fund.ledger = [fundLedgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);

  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    shared_fund_refunded: true,
    fund_refund_idempotency_key: refundRequest.idempotency_key,
    fund_refund_ledger_id: fundLedgerEntry.id,
    fund_refunded_at: operatedAt,
    fund_refunded_by_username: member.username,
    fund_refunded_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    compensation_hint: targetEntry.shared_warehouse_materials_consumed
      ? '家族建筑回滚已退回共同基金；共同仓库材料恢复和真实建筑拆除仍需后续补偿重放。'
      : '家族建筑回滚已退回共同基金；真实建筑拆除仍需后续补偿重放。',
    deferred_operations: [...new Set([
      ...(Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations.filter(item => item !== 'fund_compensation_replay') : []),
      targetEntry.shared_warehouse_materials_consumed ? 'family_building_material_restore' : '',
      'family_building_compensation_replay',
    ].filter(Boolean))],
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: targetEntry.shared_warehouse_materials_consumed
        ? ['family_building_compensation_replay', 'family_building_material_restore']
        : ['family_building_compensation_replay'],
      compensation_policy: '家族建筑已记录回滚并退回共同基金；材料恢复、真实建筑拆除和个人资产返还仍需后续独立接口或人工复核。',
    });
  }
  appendAudit(contract, 'family_building_fund_refunded', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    original_fund_ledger_id: nextEntry.fund_ledger_id,
    refund_fund_ledger_id: fundLedgerEntry.id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    refund_amount: refundAmount,
    shared_fund_balance_before: balanceBefore,
    shared_fund_balance_after: balanceAfter,
    personal_money_merged: false,
    shared_warehouse_restored: false,
    compensation_required: nextEntry.shared_warehouse_materials_consumed === true,
  }, refundRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    fund_ledger_entry: fundLedgerEntry,
    idempotent: false,
    already_refunded: false,
    shared_fund: {
      refund_amount: refundAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      personal_money_merged: false,
    },
  };
}

function buildFamilyBuildingMaterialRestorationSummary(restorationLedgerEntries = []) {
  const materialLabels = new Map(FAMILY_BUILDING_PROJECT_DEFS.flatMap(project =>
    project.material_plan.map(plan => [plan.item_id, plan.label])
  ));
  const groups = new Map();
  for (const entry of restorationLedgerEntries) {
    const normalized = normalizeWarehouseLedgerEntry(entry);
    if (!normalized) continue;
    const key = `${normalized.item_id}:${normalized.quality}`;
    const current = groups.get(key) || {
      item_id: normalized.item_id,
      label: materialLabels.get(normalized.item_id) || normalized.item_id,
      quantity: 0,
      quality: normalized.quality,
      warehouse_ledger_ids: [],
      source_consume_ledger_ids: [],
    };
    current.quantity += normalized.quantity;
    current.warehouse_ledger_ids.push(normalized.id);
    for (const sourceLedgerId of normalized.source_ledger_ids || []) {
      if (!current.source_consume_ledger_ids.includes(sourceLedgerId)) current.source_consume_ledger_ids.push(sourceLedgerId);
    }
    groups.set(key, current);
  }
  return [...groups.values()]
    .map(item => ({
      ...item,
      warehouse_ledger_ids: item.warehouse_ledger_ids.slice(0, 12),
      source_consume_ledger_ids: item.source_consume_ledger_ids.slice(0, 12),
    }))
    .filter(item => item.item_id && item.quantity > 0)
    .slice(0, 12);
}

async function restoreCohabitationFamilyBuildingMaterials(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const restoreRequest = normalizeFamilyBuildingMaterialsRestorePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '恢复家族建筑共同仓库材料');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑材料恢复只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRestoreMaterials = actorPermissions.storage.deposit === true
    || actorPermissions.construction.demolish_building === true
    || ['family_head', 'workshop_keeper', 'storage_keeper'].includes(actorManorRole);
  if (!canRestoreMaterials) throw createError('你没有恢复共同仓库建材的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑材料恢复必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousRestoreEntry = familyLedger.find(entry => entry.material_restore_idempotency_key === restoreRequest.idempotency_key);
  if (previousRestoreEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, restoreRequest);
    if (requestedEntry && requestedEntry.id !== previousRestoreEntry.id) {
      throw createError('该家族建筑材料恢复幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    const materialRestoreLedgerEntries = contract.shared_warehouse.ledger
      .filter(entry => previousRestoreEntry.material_restore_ledger_ids.includes(entry.id));
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousRestoreEntry,
      material_ledger_entries: materialRestoreLedgerEntries,
      material_restore_ledger_entries: materialRestoreLedgerEntries,
      idempotent: true,
      already_restored: previousRestoreEntry.shared_warehouse_materials_restored === true,
      shared_warehouse: {
        restored_quantity: 0,
        material_count: previousRestoreEntry.material_restorations.length,
        personal_inventory_merged: false,
      },
      shared_fund: {
        deducted_amount: 0,
        refund_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, restoreRequest);
  if (!targetEntry) throw createError('找不到可恢复材料的家族建筑流水', 404);
  if (targetEntry.status !== 'reverted') throw createError('请先记录家族建筑回滚，再恢复共同仓库材料', 409);
  if (targetEntry.shared_fund_refunded !== true || !targetEntry.fund_refund_ledger_id) {
    throw createError('请先退回家族建筑共同基金，再恢复共同仓库材料', 409);
  }
  if (targetEntry.shared_warehouse_materials_consumed !== true || targetEntry.material_ledger_ids.length <= 0) {
    throw createError('该家族建筑流水没有已消耗的共同仓库材料凭证，不能恢复材料', 409);
  }
  if (targetEntry.shared_warehouse_materials_restored === true || targetEntry.material_restore_ledger_ids.length > 0) {
    const materialRestoreLedgerEntries = contract.shared_warehouse.ledger
      .filter(entry => targetEntry.material_restore_ledger_ids.includes(entry.id));
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      material_ledger_entries: materialRestoreLedgerEntries,
      material_restore_ledger_entries: materialRestoreLedgerEntries,
      idempotent: true,
      already_restored: true,
      shared_warehouse: {
        restored_quantity: 0,
        material_count: targetEntry.material_restorations.length,
        personal_inventory_merged: false,
      },
      shared_fund: {
        deducted_amount: 0,
        refund_amount: 0,
        balance_after: contract.shared_fund.balance,
        personal_money_merged: false,
      },
    };
  }

  const sourceConsumeEntries = contract.shared_warehouse.ledger
    .map(normalizeWarehouseLedgerEntry)
    .filter(entry => entry && targetEntry.material_ledger_ids.includes(entry.id) && entry.action === 'consume');
  if (sourceConsumeEntries.length <= 0) {
    throw createError('原材料消耗流水已缺失，不能自动恢复共同仓库材料，请人工复核补偿', 409);
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const targetRef = `family_building_rollback:${targetEntry.id}:materials`;
  const materialRestoreLedgerEntries = sourceConsumeEntries.map(entry => normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'compensate',
    item_id: entry.item_id,
    quantity: entry.quantity,
    quality: entry.quality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || member.display_name || actorUsername,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || '',
    source_owner_id: entry.source_owner_id,
    source_owner_username: entry.source_owner_username,
    source_owner_display_name: entry.source_owner_display_name,
    source_owner_key: entry.source_owner_key,
    source_owner_manor_role: entry.source_owner_manor_role,
    source_owner_manor_role_label: entry.source_owner_manor_role_label,
    source_save_id: entry.source_save_id,
    source_save_slot: entry.source_save_slot,
    source_inventory: 'family_building.material_restore',
    source_ledger_ids: [entry.id],
    target_owner_id: contract.shared_manor_id,
    target_owner_username: 'shared_warehouse',
    target_owner_display_name: '共同仓库',
    target_owner_key: 'shared_warehouse',
    target_inventory: 'shared_warehouse.items',
    target_ref: targetRef,
    at: operatedAt,
    idempotency_key: restoreRequest.idempotency_key,
    reversible: true,
    compensation_hint: '家族建筑回滚后的建材已恢复到共同仓库；不写个人背包，不改个人铜币，真实建筑拆除仍需后续独立记录。',
    status: 'committed',
  })).filter(Boolean);
  const materialRestorations = buildFamilyBuildingMaterialRestorationSummary(materialRestoreLedgerEntries);
  const restoredQuantity = materialRestorations.reduce((sum, item) => sum + item.quantity, 0);

  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    shared_warehouse_materials_restored: true,
    material_restore_idempotency_key: restoreRequest.idempotency_key,
    material_restore_ledger_ids: materialRestoreLedgerEntries.map(entry => entry.id),
    material_restorations: materialRestorations,
    materials_restored_at: operatedAt,
    materials_restored_by_username: member.username,
    materials_restored_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    compensation_hint: '家族建筑回滚已退回共同基金并恢复共同仓库材料；真实建筑拆除和最终补偿重放仍需后续独立接口或人工复核。',
    deferred_operations: [...new Set([
      ...(Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations.filter(item => item !== 'family_building_material_restore') : []),
      'family_building_compensation_replay',
    ])],
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: ['family_building_compensation_replay'],
      compensation_policy: '家族建筑已记录回滚、退回共同基金并恢复共同仓库材料；真实建筑拆除和最终补偿重放仍需后续独立接口或人工复核。',
    });
  }
  contract.shared_warehouse.ledger = [...materialRestoreLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    ...materialRestoreLedgerEntries.map(buildWarehouseOriginAsset),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'family_building_materials_restored', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    source_material_ledger_ids: targetEntry.material_ledger_ids,
    material_restore_ledger_ids: nextEntry.material_restore_ledger_ids,
    material_restorations: nextEntry.material_restorations,
    restored_quantity: restoredQuantity,
    shared_fund_changed: false,
    personal_money_merged: false,
    personal_inventory_merged: false,
    real_build_demolished: false,
    compensation_required: true,
  }, restoreRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    material_ledger_entries: materialRestoreLedgerEntries,
    material_restore_ledger_entries: materialRestoreLedgerEntries,
    idempotent: false,
    already_restored: false,
    shared_warehouse: {
      restored_quantity: restoredQuantity,
      material_count: materialRestorations.length,
      personal_inventory_merged: false,
    },
    shared_fund: {
      deducted_amount: 0,
      refund_amount: 0,
      balance_after: contract.shared_fund.balance,
      personal_money_merged: false,
    },
  };
}

async function replayCohabitationFamilyBuildingCompensation(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const replayRequest = normalizeFamilyBuildingCompensationReplayPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '收口家族建筑补偿重放');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑补偿重放只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canReplayCompensation = actorPermissions.fund.spend_large === true
    || actorPermissions.construction.demolish_building === true
    || ['family_head', 'workshop_keeper', 'treasurer'].includes(actorManorRole);
  if (!canReplayCompensation) throw createError('你没有收口家族建筑补偿重放的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑补偿重放必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousReplayEntry = familyLedger.find(entry => entry.compensation_replay_idempotency_key === replayRequest.idempotency_key);
  if (previousReplayEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, replayRequest);
    if (requestedEntry && requestedEntry.id !== previousReplayEntry.id) {
      throw createError('该家族建筑补偿重放幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousReplayEntry,
      idempotent: true,
      already_compensated: previousReplayEntry.status === 'compensated',
      compensation_replay: {
        shared_fund_refunded: previousReplayEntry.shared_fund_refunded === true,
        shared_warehouse_restored: previousReplayEntry.shared_warehouse_materials_restored === true || previousReplayEntry.shared_warehouse_materials_consumed !== true,
        real_build_demolished: false,
        personal_money_merged: false,
        personal_inventory_merged: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, replayRequest);
  if (!targetEntry) throw createError('找不到可收口补偿重放的家族建筑流水', 404);
  if (targetEntry.status === 'compensated') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_compensated: true,
      compensation_replay: {
        shared_fund_refunded: targetEntry.shared_fund_refunded === true,
        shared_warehouse_restored: targetEntry.shared_warehouse_materials_restored === true || targetEntry.shared_warehouse_materials_consumed !== true,
        real_build_demolished: false,
        personal_money_merged: false,
        personal_inventory_merged: false,
      },
    };
  }
  if (targetEntry.status !== 'reverted') throw createError('请先记录家族建筑回滚，再收口补偿重放', 409);
  if (targetEntry.shared_fund_refunded !== true || !targetEntry.fund_refund_ledger_id) {
    throw createError('请先退回家族建筑共同基金，再收口补偿重放', 409);
  }
  if (targetEntry.shared_warehouse_materials_consumed === true
    && (targetEntry.shared_warehouse_materials_restored !== true || targetEntry.material_restore_ledger_ids.length <= 0)) {
    throw createError('请先恢复家族建筑共同仓库材料，再收口补偿重放', 409);
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    action: 'compensated',
    status: 'compensated',
    compensation_required: false,
    compensation_replay_idempotency_key: replayRequest.idempotency_key,
    compensation_replayed_at: operatedAt,
    compensation_replayed_by_username: member.username,
    compensation_replayed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    real_build_demolished: false,
    real_build_demolition_policy: '本步骤只收口家族建筑补偿重放审计，不拆除个人房屋或真实建筑；真实拆除仍需后续独立安全阀。',
    compensation_hint: '家族建筑回滚补偿已完成共同基金退款与共同仓库材料恢复，并完成补偿重放收口；真实建筑拆除仍需独立安全阀。',
    deferred_operations: [...new Set([
      ...(Array.isArray(targetEntry.deferred_operations)
        ? targetEntry.deferred_operations.filter(item => ![
            'fund_compensation_replay',
            'family_building_material_restore',
            'family_building_compensation_replay',
          ].includes(item))
        : []),
      'real_build_demolition_manual_review',
    ])],
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  const draftIndex = contract.fund_large_spend_drafts.findIndex(draft =>
    draft.id === targetEntry.draft_id || draft.final_building_ledger_id === targetEntry.id
  );
  if (draftIndex >= 0) {
    contract.fund_large_spend_drafts[draftIndex] = normalizeFundLargeSpendDraft({
      ...contract.fund_large_spend_drafts[draftIndex],
      deferred_operations: ['real_build_demolition_manual_review'],
      compensation_policy: '家族建筑回滚补偿已收口；真实建筑拆除仍需后续独立安全阀或人工复核。',
    });
  }
  appendAudit(contract, 'family_building_compensation_replayed', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    fund_refund_ledger_id: nextEntry.fund_refund_ledger_id,
    material_restore_ledger_ids: nextEntry.material_restore_ledger_ids,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    shared_fund_refunded: nextEntry.shared_fund_refunded === true,
    shared_warehouse_restored: nextEntry.shared_warehouse_materials_restored === true || nextEntry.shared_warehouse_materials_consumed !== true,
    real_build_demolished: false,
    personal_money_merged: false,
    personal_inventory_merged: false,
    compensation_required: false,
  }, replayRequest.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_compensated: false,
    compensation_replay: {
      shared_fund_refunded: true,
      shared_warehouse_restored: nextEntry.shared_warehouse_materials_restored === true || nextEntry.shared_warehouse_materials_consumed !== true,
      real_build_demolished: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
    },
  };
}

async function requestCohabitationFamilyBuildingRealDemolitionReview(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionRequestPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '请求家族建筑真实拆除复核');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除复核只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRequestDemolition = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canRequestDemolition) throw createError('你没有请求家族建筑真实拆除复核的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除复核必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousRequestEntry = familyLedger.find(entry => entry.real_build_demolition_request_idempotency_key === request.idempotency_key);
  if (previousRequestEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousRequestEntry.id) {
      throw createError('该真实拆除复核幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousRequestEntry,
      idempotent: true,
      already_requested: previousRequestEntry.real_build_demolition_review_state === 'pending_manual_review',
      demolition_review: {
        requested: previousRequestEntry.real_build_demolition_review_state === 'pending_manual_review',
        review_state: previousRequestEntry.real_build_demolition_review_state,
        execution_enabled: false,
        requires_manual_review: true,
        real_build_demolished: previousRequestEntry.real_build_demolished === true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可请求真实拆除复核的家族建筑流水', 404);
  if (targetEntry.status !== 'compensated' || targetEntry.compensation_required !== false) {
    throw createError('请先完成家族建筑回滚补偿收口，再请求真实拆除复核', 409);
  }
  if (targetEntry.real_build_applied !== true && targetEntry.status !== 'build_applied' && !targetEntry.real_build_ref) {
    throw createError('该建筑流水没有真实建造落账记录，不能请求真实拆除复核', 409);
  }
  if (targetEntry.real_build_demolished === true || targetEntry.real_build_demolition_review_state === 'executed') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_requested: true,
      demolition_review: {
        requested: true,
        review_state: targetEntry.real_build_demolition_review_state || 'executed',
        execution_enabled: false,
        requires_manual_review: false,
        real_build_demolished: true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  if (targetEntry.real_build_demolition_review_state === 'pending_manual_review') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_requested: true,
      demolition_review: {
        requested: true,
        review_state: 'pending_manual_review',
        execution_enabled: false,
        requires_manual_review: true,
        real_build_demolished: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_request_idempotency_key: request.idempotency_key,
    real_build_demolition_requested_at: operatedAt,
    real_build_demolition_requested_by_username: member.username,
    real_build_demolition_requested_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_review_state: 'pending_manual_review',
    real_build_demolition_review_note: request.reason || '已记录真实建筑拆除复核请求，等待独立安全阀执行。',
    real_build_demolished: false,
    real_build_demolition_policy: '仅记录真实建筑拆除复核请求；本步骤不删除个人房屋、真实建筑、共同基金或共同仓库数据。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: [...new Set([
      ...(Array.isArray(targetEntry.deferred_operations)
        ? targetEntry.deferred_operations.filter(Boolean)
        : []),
      'real_build_demolition_manual_review',
      'real_build_demolition_execute',
    ])],
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_requested', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    fund_refund_ledger_id: nextEntry.fund_refund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    review_state: nextEntry.real_build_demolition_review_state,
    execution_enabled: false,
    requires_manual_review: true,
    real_build_demolished: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_requested: false,
    demolition_review: {
      requested: true,
      review_state: 'pending_manual_review',
      execution_enabled: false,
      requires_manual_review: true,
      real_build_demolished: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
    },
  };
}

async function rejectCohabitationFamilyBuildingRealDemolitionReview(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionRejectPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '驳回家族建筑真实拆除复核');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除复核驳回只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRejectDemolition = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canRejectDemolition) throw createError('你没有驳回家族建筑真实拆除复核的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除复核驳回必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousReviewEntry = familyLedger.find(entry => entry.real_build_demolition_review_idempotency_key === request.idempotency_key);
  if (previousReviewEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousReviewEntry.id) {
      throw createError('该真实拆除复核处理幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousReviewEntry,
      idempotent: true,
      already_rejected: previousReviewEntry.real_build_demolition_review_state === 'rejected',
      demolition_review: {
        requested: Boolean(previousReviewEntry.real_build_demolition_request_idempotency_key),
        review_state: previousReviewEntry.real_build_demolition_review_state,
        execution_enabled: false,
        requires_manual_review: previousReviewEntry.real_build_demolition_review_state === 'pending_manual_review',
        rejected: previousReviewEntry.real_build_demolition_review_state === 'rejected',
        real_build_demolished: previousReviewEntry.real_build_demolished === true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可驳回真实拆除复核的家族建筑流水', 404);
  if (targetEntry.real_build_demolition_review_state === 'rejected') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_rejected: true,
      demolition_review: {
        requested: Boolean(targetEntry.real_build_demolition_request_idempotency_key),
        review_state: 'rejected',
        execution_enabled: false,
        requires_manual_review: false,
        rejected: true,
        real_build_demolished: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  if (targetEntry.real_build_demolition_review_state !== 'pending_manual_review') {
    throw createError('只有待人工复核的真实拆除请求可以驳回', 409);
  }
  if (targetEntry.real_build_demolished === true || targetEntry.real_build_demolition_review_state === 'executed') {
    throw createError('真实建筑拆除已执行，不能驳回复核请求', 409);
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = (Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations : [])
    .filter(op => op && !['real_build_demolition_manual_review', 'real_build_demolition_execute'].includes(op));
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_review_idempotency_key: request.idempotency_key,
    real_build_demolition_reviewed_at: operatedAt,
    real_build_demolition_reviewed_by_username: member.username,
    real_build_demolition_reviewed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_review_state: 'rejected',
    real_build_demolition_review_note: request.reason || '真实建筑拆除复核已驳回；不会执行真实拆除。',
    real_build_demolished: false,
    real_build_demolition_policy: '真实建筑拆除复核已驳回；本步骤不删除个人房屋、真实建筑、共同基金或共同仓库数据。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_rejected', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    review_state: nextEntry.real_build_demolition_review_state,
    execution_enabled: false,
    requires_manual_review: false,
    rejected: true,
    real_build_demolished: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_rejected: false,
    demolition_review: {
      requested: true,
      review_state: 'rejected',
      execution_enabled: false,
      requires_manual_review: false,
      rejected: true,
      real_build_demolished: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
    },
  };
}

async function approveCohabitationFamilyBuildingRealDemolitionReview(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionApprovePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '批准家族建筑真实拆除复核');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除复核批准只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canApproveDemolition = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canApproveDemolition) throw createError('你没有批准家族建筑真实拆除复核的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除复核批准必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousReviewEntry = familyLedger.find(entry => entry.real_build_demolition_review_idempotency_key === request.idempotency_key);
  if (previousReviewEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousReviewEntry.id) {
      throw createError('该真实拆除复核处理幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousReviewEntry,
      idempotent: true,
      already_approved: previousReviewEntry.real_build_demolition_review_state === 'approved_for_execute',
      demolition_review: {
        requested: Boolean(previousReviewEntry.real_build_demolition_request_idempotency_key),
        review_state: previousReviewEntry.real_build_demolition_review_state,
        execution_enabled: false,
        approved_for_execute: previousReviewEntry.real_build_demolition_review_state === 'approved_for_execute',
        requires_manual_review: previousReviewEntry.real_build_demolition_review_state === 'pending_manual_review',
        real_build_demolished: previousReviewEntry.real_build_demolished === true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可批准真实拆除复核的家族建筑流水', 404);
  if (targetEntry.real_build_demolition_review_state === 'approved_for_execute') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_approved: true,
      demolition_review: {
        requested: Boolean(targetEntry.real_build_demolition_request_idempotency_key),
        review_state: 'approved_for_execute',
        execution_enabled: false,
        approved_for_execute: true,
        requires_manual_review: false,
        real_build_demolished: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  if (targetEntry.real_build_demolition_review_state !== 'pending_manual_review') {
    throw createError('只有待人工复核的真实拆除请求可以批准', 409);
  }
  if (!targetEntry.real_build_demolition_request_idempotency_key) {
    throw createError('该建筑流水没有真实拆除复核请求记录，不能批准', 409);
  }
  if (targetEntry.real_build_demolished === true || targetEntry.real_build_demolition_review_state === 'executed') {
    throw createError('真实建筑拆除已执行，不能再次批准复核请求', 409);
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(op => op && op !== 'real_build_demolition_manual_review')
      : []),
    'real_build_demolition_execute',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_review_idempotency_key: request.idempotency_key,
    real_build_demolition_reviewed_at: operatedAt,
    real_build_demolition_reviewed_by_username: member.username,
    real_build_demolition_reviewed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_review_state: 'approved_for_execute',
    real_build_demolition_review_note: request.reason || '真实建筑拆除复核已批准；等待独立执行安全阀，不会在本步骤删除建筑。',
    real_build_demolished: false,
    real_build_demolition_policy: '真实建筑拆除复核已批准待执行；本步骤不删除个人房屋、真实建筑、共同基金或共同仓库数据。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_approved', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    review_state: nextEntry.real_build_demolition_review_state,
    execution_enabled: false,
    approved_for_execute: true,
    requires_manual_review: false,
    real_build_demolished: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_approved: false,
    demolition_review: {
      requested: true,
      review_state: 'approved_for_execute',
      execution_enabled: false,
      approved_for_execute: true,
      requires_manual_review: false,
      real_build_demolished: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
    },
  };
}

async function requestCohabitationFamilyBuildingRealDemolitionExecution(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionExecutionRequestPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '请求家族建筑真实拆除执行');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除执行请求只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canRequestExecution = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canRequestExecution) throw createError('你没有请求家族建筑真实拆除执行的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除执行请求必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousExecutionEntry = familyLedger.find(entry => entry.real_build_demolition_execution_request_idempotency_key === request.idempotency_key);
  if (previousExecutionEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousExecutionEntry.id) {
      throw createError('该真实拆除执行请求幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousExecutionEntry,
      idempotent: true,
      already_execution_requested: previousExecutionEntry.real_build_demolition_execution_state === 'pending_personal_save_write',
      demolition_execution: {
        requested: Boolean(previousExecutionEntry.real_build_demolition_execution_request_idempotency_key),
        execution_state: previousExecutionEntry.real_build_demolition_execution_state,
        deferred_personal_save_write: previousExecutionEntry.real_build_demolition_execution_state === 'pending_personal_save_write',
        review_state: previousExecutionEntry.real_build_demolition_review_state,
        real_build_demolished: previousExecutionEntry.real_build_demolished === true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可请求真实拆除执行的家族建筑流水', 404);
  if (targetEntry.real_build_demolition_execution_state === 'pending_personal_save_write') {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_execution_requested: true,
      demolition_execution: {
        requested: true,
        execution_state: 'pending_personal_save_write',
        deferred_personal_save_write: true,
        review_state: targetEntry.real_build_demolition_review_state,
        real_build_demolished: targetEntry.real_build_demolished === true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  if (targetEntry.real_build_demolition_review_state !== 'approved_for_execute') {
    throw createError('只有已批准待执行的真实拆除复核可以请求执行', 409);
  }
  if (!targetEntry.real_build_demolition_review_idempotency_key) {
    throw createError('该建筑流水没有真实拆除复核处理记录，不能请求执行', 409);
  }
  if (targetEntry.real_build_applied !== true || !targetEntry.real_build_ref) {
    throw createError('该建筑流水缺少真实建造落账证据，不能请求真实拆除执行', 409);
  }
  if (targetEntry.real_build_demolished === true || targetEntry.real_build_demolition_review_state === 'executed') {
    throw createError('真实建筑拆除已执行，不能重复请求执行', 409);
  }

  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(op => op && op !== 'real_build_demolition_execute')
      : []),
    'real_build_demolition_personal_save_write',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_execution_request_idempotency_key: request.idempotency_key,
    real_build_demolition_execution_requested_at: operatedAt,
    real_build_demolition_execution_requested_by_username: member.username,
    real_build_demolition_execution_requested_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_execution_state: 'pending_personal_save_write',
    real_build_demolished: false,
    real_build_demolition_policy: '真实建筑拆除执行请求已记录；仍需后续个人存档写回安全阀，不在本步骤删除个人房屋、真实建筑、共同基金或共同仓库数据。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_execution_requested', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    real_build_ref: nextEntry.real_build_ref,
    review_state: nextEntry.real_build_demolition_review_state,
    execution_state: nextEntry.real_build_demolition_execution_state,
    deferred_personal_save_write: true,
    real_build_demolished: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_execution_requested: false,
    demolition_execution: {
      requested: true,
      execution_state: 'pending_personal_save_write',
      deferred_personal_save_write: true,
      review_state: 'approved_for_execute',
      real_build_demolished: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
    },
  };
}

async function writeCohabitationFamilyBuildingRealDemolitionPersonalSave(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionPersonalSaveWritePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '写回家族建筑真实拆除个人存档');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人存档写回只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canWritePersonalSave = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canWritePersonalSave) throw createError('你没有写回家族建筑真实拆除个人存档的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人存档写回必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.fund_large_spend_drafts = Array.isArray(contract.fund_large_spend_drafts)
    ? contract.fund_large_spend_drafts.map(normalizeFundLargeSpendDraft)
    : [];
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousWriteEntry = familyLedger.find(entry => entry.real_build_demolition_personal_save_write_idempotency_key === request.idempotency_key);
  if (previousWriteEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousWriteEntry.id) {
      throw createError('该真实拆除个人存档写回幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousWriteEntry,
      idempotent: true,
      already_written: previousWriteEntry.real_build_demolition_execution_state === 'executed',
      receipts: previousWriteEntry.real_build_demolition_personal_save_receipts || [],
      demolition_execution: {
        requested: Boolean(previousWriteEntry.real_build_demolition_execution_request_idempotency_key),
        execution_state: previousWriteEntry.real_build_demolition_execution_state,
        personal_save_written: previousWriteEntry.real_build_demolition_execution_state === 'executed',
        receipt_count: (previousWriteEntry.real_build_demolition_personal_save_receipts || []).length,
        real_build_demolished: previousWriteEntry.real_build_demolished === true,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可写回真实拆除个人存档的家族建筑流水', 404);
  if (targetEntry.real_build_demolition_execution_state === 'executed' || targetEntry.real_build_demolished === true) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_written: true,
      receipts: targetEntry.real_build_demolition_personal_save_receipts || [],
      demolition_execution: {
        requested: Boolean(targetEntry.real_build_demolition_execution_request_idempotency_key),
        execution_state: targetEntry.real_build_demolition_execution_state,
        personal_save_written: true,
        receipt_count: (targetEntry.real_build_demolition_personal_save_receipts || []).length,
        real_build_demolished: targetEntry.real_build_demolished === true,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  if (targetEntry.real_build_demolition_review_state !== 'approved_for_execute') {
    throw createError('只有已批准待执行的真实拆除复核可以写回个人存档', 409);
  }
  if (targetEntry.real_build_demolition_execution_state !== 'pending_personal_save_write') {
    throw createError('请先请求真实拆除执行，再写回个人存档', 409);
  }
  if (!targetEntry.real_build_demolition_execution_request_idempotency_key) {
    throw createError('该建筑流水没有真实拆除执行请求记录，不能写回个人存档', 409);
  }
  if (targetEntry.real_build_applied !== true || !targetEntry.real_build_ref) {
    throw createError('该建筑流水缺少真实建造落账证据，不能写回真实拆除个人存档', 409);
  }

  const receipts = writePersonalRealDemolitionReceiptsFromFamilyBuilding(contract, targetEntry, request);
  if (receipts.length === 0) throw createError('没有可写回真实拆除回执的已接受成员', 409);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = (Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations : [])
    .filter(operation => operation && operation !== 'real_build_demolition_personal_save_write');
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolished: true,
    real_build_demolition_review_state: 'executed',
    real_build_demolition_execution_state: 'executed',
    real_build_demolition_personal_save_write_idempotency_key: request.idempotency_key,
    real_build_demolition_personal_save_written_at: operatedAt,
    real_build_demolition_personal_save_written_by_username: member.username,
    real_build_demolition_personal_save_written_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_personal_save_receipts: receipts,
    real_build_demolition_policy: '真实建筑拆除已写入成员个人存档回执；共同基金、共同仓库、个人铜币、背包、农田、NPC、家庭和孩子状态不在本步骤变更。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_personal_save_written', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    real_build_ref: nextEntry.real_build_ref,
    receipt_count: receipts.length,
    receipt_usernames: receipts.map(receipt => receipt.username),
    execution_state: nextEntry.real_build_demolition_execution_state,
    real_build_demolished: true,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
    personal_money_changed: false,
    personal_inventory_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_written: false,
    receipts,
    demolition_execution: {
      requested: true,
      execution_state: 'executed',
      personal_save_written: true,
      receipt_count: receipts.length,
      real_build_demolished: true,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      personal_money_changed: false,
      personal_inventory_changed: false,
    },
  };
}

async function previewCohabitationFamilyBuildingRealDemolitionMainState(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStatePreviewPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '预览家族建筑真实拆除个人主状态');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态预览只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canPreviewMainState = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canPreviewMainState) throw createError('你没有预览家族建筑真实拆除个人主状态的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态预览必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousPreviewEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_preview_idempotency_key === request.idempotency_key);
  if (previousPreviewEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousPreviewEntry.id) {
      throw createError('该真实拆除个人主状态预览幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousPreviewEntry,
      idempotent: true,
      already_previewed: true,
      main_state_preview: {
        manifest: previousPreviewEntry.real_build_demolition_main_state_manifest || [],
        manifest_hash: previousPreviewEntry.real_build_demolition_main_state_manifest_hash,
        mutation_enabled: false,
        blocked: true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可预览个人主状态变更的家族建筑流水', 404);
  if (targetEntry.real_build_demolition_execution_state !== 'executed' || targetEntry.real_build_demolished !== true) {
    throw createError('请先完成真实拆除个人存档回执写回，再预览个人房屋 / 建筑主状态变更', 409);
  }
  if (!targetEntry.real_build_demolition_personal_save_write_idempotency_key) {
    throw createError('该建筑流水缺少真实拆除个人存档写回记录，不能预览主状态变更', 409);
  }
  if (targetEntry.real_build_applied !== true || !targetEntry.real_build_ref) {
    throw createError('该建筑流水缺少真实建造落账证据，不能预览主状态变更', 409);
  }

  const manifest = buildFamilyBuildingRealDemolitionMainStateManifest(contract, targetEntry);
  if (manifest.length === 0) throw createError('没有可预览真实拆除主状态的已接受成员', 409);
  const manifestHash = hashFamilyBuildingRealDemolitionMainStateManifest(manifest);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations) ? targetEntry.deferred_operations.filter(Boolean) : []),
    'real_build_demolition_main_state_mapping',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_preview_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_previewed_at: operatedAt,
    real_build_demolition_main_state_previewed_by_username: member.username,
    real_build_demolition_main_state_previewed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_manifest: manifest,
    real_build_demolition_main_state_manifest_hash: manifestHash,
    real_build_demolition_main_state_policy: '已生成个人房屋 / 建筑主状态变更预览；因 real_build_ref 未绑定个人 home / decoration 具体字段，本步骤只记录阻断清单和 hash，不自动删除个人主状态。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_previewed', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    real_build_ref: nextEntry.real_build_ref,
    manifest_hash: manifestHash,
    manifest_count: manifest.length,
    mutation_enabled: false,
    blocked: true,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_previewed: false,
    main_state_preview: {
      manifest,
      manifest_hash: manifestHash,
      mutation_enabled: false,
      blocked: true,
      blocked_reason: 'real_build_ref 未绑定个人 home / decoration 具体字段，不能安全自动删除个人房屋或建筑主状态。',
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
    },
  };
}

async function verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateMappingPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '记录家族建筑真实拆除个人主状态映射证明');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态映射证明只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canVerifyMapping = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canVerifyMapping) throw createError('你没有记录家族建筑真实拆除个人主状态映射证明的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态映射证明必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousMappingEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_mapping_idempotency_key === request.idempotency_key);
  if (previousMappingEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousMappingEntry.id) {
      throw createError('该真实拆除个人主状态映射幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousMappingEntry,
      idempotent: true,
      already_mapped: true,
      main_state_mapping: {
        manifest: previousMappingEntry.real_build_demolition_main_state_mapping_manifest || [],
        manifest_hash: previousMappingEntry.real_build_demolition_main_state_mapping_manifest_hash,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可记录个人主状态映射证明的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_preview_idempotency_key) {
    throw createError('请先生成个人主状态预览清单，再记录映射证明', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_manifest_hash || request.expected_manifest_hash !== targetEntry.real_build_demolition_main_state_manifest_hash) {
    throw createError('个人主状态预览 manifest hash 不匹配，请刷新后重试', 409);
  }
  if (targetEntry.real_build_demolition_main_state_mapping_idempotency_key) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_mapped: true,
      main_state_mapping: {
        manifest: targetEntry.real_build_demolition_main_state_mapping_manifest || [],
        manifest_hash: targetEntry.real_build_demolition_main_state_mapping_manifest_hash,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const mappingManifest = buildFamilyBuildingRealDemolitionMainStateMappingManifest(
    targetEntry.real_build_demolition_main_state_manifest,
    request.mappings
  );
  const mappingManifestHash = hashFamilyBuildingRealDemolitionMainStateMappingManifest(mappingManifest);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_mapping')
      : []),
    'real_build_demolition_main_state_mutation_guard',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_mapping_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_mapped_at: operatedAt,
    real_build_demolition_main_state_mapped_by_username: member.username,
    real_build_demolition_main_state_mapped_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_mapping_manifest: mappingManifest,
    real_build_demolition_main_state_mapping_manifest_hash: mappingManifestHash,
    real_build_demolition_main_state_mapping_policy: '已验证 real_build_ref 到个人 home / decoration 候选路径的映射证明；本步骤仍不修改个人主状态，真实删除需另走带预览确认和补偿的 mutation guard。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_mapping_verified', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    real_build_ref: nextEntry.real_build_ref,
    preview_manifest_hash: targetEntry.real_build_demolition_main_state_manifest_hash,
    mapping_manifest_hash: mappingManifestHash,
    mapping_count: mappingManifest.length,
    mutation_enabled: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_mapped: false,
    main_state_mapping: {
      manifest: mappingManifest,
      manifest_hash: mappingManifestHash,
      mutation_enabled: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      next_deferred_operation: 'real_build_demolition_main_state_mutation_guard',
    },
  };
}

async function guardCohabitationFamilyBuildingRealDemolitionMainStateMutation(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateMutationGuardPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '记录家族建筑真实拆除个人主状态变更安全阀');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态变更安全阀只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canGuardMutation = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canGuardMutation) throw createError('你没有记录家族建筑真实拆除个人主状态变更安全阀的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态变更安全阀必须保留拆除双方确认安全阀', 409);
  }
  if (request.confirmation_text !== '确认主状态变更安全阀') {
    throw createError('请明确确认主状态变更安全阀，避免误触个人房屋 / 建筑主状态流程', 400);
  }
  if (!request.compensation_plan_acknowledged || !request.rollback_plan_acknowledged) {
    throw createError('进入个人主状态变更前必须确认补偿和回滚方案', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousGuardEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_guard_idempotency_key === request.idempotency_key);
  if (previousGuardEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousGuardEntry.id) {
      throw createError('该真实拆除个人主状态变更安全阀幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousGuardEntry,
      idempotent: true,
      already_guarded: true,
      main_state_mutation_guard: {
        manifest: previousGuardEntry.real_build_demolition_main_state_guard_manifest || [],
        manifest_hash: previousGuardEntry.real_build_demolition_main_state_guard_manifest_hash,
        mutation_enabled: false,
        execution_enabled: false,
        compensation_required: true,
        rollback_required: true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可记录个人主状态变更安全阀的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_mapping_idempotency_key) {
    throw createError('请先完成个人主状态映射证明，再记录变更安全阀', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_mapping_manifest_hash || request.expected_mapping_manifest_hash !== targetEntry.real_build_demolition_main_state_mapping_manifest_hash) {
    throw createError('个人主状态映射 manifest hash 不匹配，请刷新后重试', 409);
  }
  if (targetEntry.real_build_demolition_main_state_guard_idempotency_key) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_guarded: true,
      main_state_mutation_guard: {
        manifest: targetEntry.real_build_demolition_main_state_guard_manifest || [],
        manifest_hash: targetEntry.real_build_demolition_main_state_guard_manifest_hash,
        mutation_enabled: false,
        execution_enabled: false,
        compensation_required: true,
        rollback_required: true,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const guardManifest = buildFamilyBuildingRealDemolitionMainStateGuardManifest(
    targetEntry.real_build_demolition_main_state_mapping_manifest
  );
  const guardManifestHash = hashFamilyBuildingRealDemolitionMainStateGuardManifest(guardManifest);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_mutation_guard')
      : []),
    'real_build_demolition_main_state_execute',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_guard_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_guarded_at: operatedAt,
    real_build_demolition_main_state_guarded_by_username: member.username,
    real_build_demolition_main_state_guarded_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_guard_manifest: guardManifest,
    real_build_demolition_main_state_guard_manifest_hash: guardManifestHash,
    real_build_demolition_main_state_guard_policy: '已确认个人主状态变更安全阀、补偿方案和回滚方案；本步骤仍不修改个人 home / decoration 主状态，真实删除需另走执行接口。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_mutation_guarded', actor, {
    building_ledger_id: nextEntry.id,
    draft_id: nextEntry.draft_id,
    fund_ledger_id: nextEntry.fund_ledger_id,
    target_ref: nextEntry.target_ref,
    building_id: nextEntry.building_id,
    project_id: nextEntry.project_id,
    real_build_ref: nextEntry.real_build_ref,
    mapping_manifest_hash: targetEntry.real_build_demolition_main_state_mapping_manifest_hash,
    guard_manifest_hash: guardManifestHash,
    guard_count: guardManifest.length,
    mutation_enabled: false,
    execution_enabled: false,
    compensation_required: true,
    rollback_required: true,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_guarded: false,
    main_state_mutation_guard: {
      manifest: guardManifest,
      manifest_hash: guardManifestHash,
      mutation_enabled: false,
      execution_enabled: false,
      compensation_required: true,
      rollback_required: true,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      next_deferred_operation: 'real_build_demolition_main_state_execute',
    },
  };
}

async function executeCohabitationFamilyBuildingRealDemolitionMainStateMutation(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateExecutePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '执行家族建筑真实拆除个人主状态变更');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态执行只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canExecuteMutation = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canExecuteMutation) throw createError('你没有执行家族建筑真实拆除个人主状态变更的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态执行必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousExecuteEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_execute_idempotency_key === request.idempotency_key);
  if (previousExecuteEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousExecuteEntry.id) {
      throw createError('该真实拆除个人主状态执行幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousExecuteEntry,
      idempotent: true,
      already_executed: previousExecuteEntry.real_build_demolition_main_state_execution_state === 'blocked_missing_exact_personal_target',
      main_state_execution: {
        execution_state: previousExecuteEntry.real_build_demolition_main_state_execution_state,
        blocked: true,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可执行个人主状态变更的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_guard_idempotency_key) {
    throw createError('请先确认个人主状态变更安全阀，再执行主状态变更', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_guard_manifest_hash || request.expected_guard_manifest_hash !== targetEntry.real_build_demolition_main_state_guard_manifest_hash) {
    throw createError('个人主状态变更安全阀 manifest hash 不匹配，请刷新后重试', 409);
  }
  if (targetEntry.real_build_demolition_main_state_execute_idempotency_key) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_executed: true,
      main_state_execution: {
        execution_state: targetEntry.real_build_demolition_main_state_execution_state,
        blocked: true,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
      },
    };
  }
  const guardManifest = Array.isArray(targetEntry.real_build_demolition_main_state_guard_manifest)
    ? targetEntry.real_build_demolition_main_state_guard_manifest
    : [];
  if (guardManifest.length === 0) throw createError('缺少个人主状态变更安全阀清单，不能执行', 409);
  const hasExactMutationTarget = guardManifest.every(item =>
    item.mutation_enabled === true
    && sanitizeText(item.exact_target_ref || item.exact_target_id || item.delete_selector, 160)
  );
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const executionState = hasExactMutationTarget ? 'ready_for_exact_personal_target_execution' : 'blocked_missing_exact_personal_target';
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_execute')
      : []),
    ...(hasExactMutationTarget ? ['real_build_demolition_main_state_exact_execute'] : ['real_build_demolition_main_state_exact_target_required']),
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_execute_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_executed_at: operatedAt,
    real_build_demolition_main_state_executed_by_username: member.username,
    real_build_demolition_main_state_executed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_execution_state: executionState,
    real_build_demolition_main_state_execute_policy: hasExactMutationTarget
      ? '已确认存在精确个人主状态删除目标；本步骤只记录执行前审计，真实删除仍需专用 exact execute 写回。'
      : '已阻断个人主状态执行：当前清单只有宽路径和绑定证明，缺少可删除的精确 home / decoration 字段目标；未修改任何个人主状态。',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_execution_blocked', actor, {
    building_ledger_id: nextEntry.id,
    real_build_ref: nextEntry.real_build_ref,
    guard_manifest_hash: targetEntry.real_build_demolition_main_state_guard_manifest_hash,
    execution_state: executionState,
    mutation_enabled: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_executed: false,
    main_state_execution: {
      execution_state: executionState,
      blocked: !hasExactMutationTarget,
      mutation_enabled: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      next_deferred_operation: hasExactMutationTarget
        ? 'real_build_demolition_main_state_exact_execute'
        : 'real_build_demolition_main_state_exact_target_required',
    },
  };
}

async function bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateExactTargetPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '绑定家族建筑真实拆除个人主状态精确目标');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态精确目标绑定只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canBindTargets = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canBindTargets) throw createError('你没有绑定家族建筑真实拆除个人主状态精确目标的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态精确目标绑定必须保留拆除双方确认安全阀', 409);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousExactTargetEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_exact_target_idempotency_key === request.idempotency_key);
  if (previousExactTargetEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousExactTargetEntry.id) {
      throw createError('该个人主状态精确目标绑定幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousExactTargetEntry,
      idempotent: true,
      already_bound: true,
      main_state_exact_targets: {
        manifest: previousExactTargetEntry.real_build_demolition_main_state_exact_target_manifest,
        manifest_hash: previousExactTargetEntry.real_build_demolition_main_state_exact_target_manifest_hash,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        next_deferred_operation: 'real_build_demolition_main_state_exact_execute',
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可绑定个人主状态精确目标的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_execute_idempotency_key) {
    throw createError('请先记录个人主状态执行阻断，再绑定精确目标', 409);
  }
  if (targetEntry.real_build_demolition_main_state_execution_state !== 'blocked_missing_exact_personal_target') {
    throw createError('当前个人主状态执行状态不需要精确目标绑定，请刷新后重试', 409);
  }
  if (request.expected_execution_state && request.expected_execution_state !== targetEntry.real_build_demolition_main_state_execution_state) {
    throw createError('个人主状态执行状态已变化，请刷新后重试', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_guard_manifest_hash || request.expected_guard_manifest_hash !== targetEntry.real_build_demolition_main_state_guard_manifest_hash) {
    throw createError('个人主状态变更安全阀 manifest hash 不匹配，请刷新后重试', 409);
  }
  if (targetEntry.real_build_demolition_main_state_exact_target_idempotency_key) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_bound: true,
      main_state_exact_targets: {
        manifest: targetEntry.real_build_demolition_main_state_exact_target_manifest,
        manifest_hash: targetEntry.real_build_demolition_main_state_exact_target_manifest_hash,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        next_deferred_operation: 'real_build_demolition_main_state_exact_execute',
      },
    };
  }

  const exactTargetManifest = buildFamilyBuildingRealDemolitionMainStateExactTargetManifest(
    targetEntry.real_build_demolition_main_state_guard_manifest,
    request.targets
  );
  const exactTargetManifestHash = hashFamilyBuildingRealDemolitionMainStateExactTargetManifest(exactTargetManifest);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_exact_target_required')
      : []),
    'real_build_demolition_main_state_exact_execute',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_exact_target_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_exact_target_bound_at: operatedAt,
    real_build_demolition_main_state_exact_target_bound_by_username: member.username,
    real_build_demolition_main_state_exact_target_bound_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_exact_target_manifest: exactTargetManifest,
    real_build_demolition_main_state_exact_target_manifest_hash: exactTargetManifestHash,
    real_build_demolition_main_state_exact_target_policy: '已绑定精确个人 home / decoration 目标并记录 hash；本步骤仍不删除个人主状态，真实删除需后续 exact execute 安全阀。',
    real_build_demolition_main_state_execution_state: 'exact_target_bound_pending_execute',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_exact_targets_bound', actor, {
    building_ledger_id: nextEntry.id,
    real_build_ref: nextEntry.real_build_ref,
    guard_manifest_hash: targetEntry.real_build_demolition_main_state_guard_manifest_hash,
    exact_target_manifest_hash: exactTargetManifestHash,
    exact_target_count: exactTargetManifest.length,
    mutation_enabled: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_bound: false,
    main_state_exact_targets: {
      manifest: exactTargetManifest,
      manifest_hash: exactTargetManifestHash,
      mutation_enabled: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      next_deferred_operation: 'real_build_demolition_main_state_exact_execute',
    },
  };
}

async function executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateExactExecutePayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '执行家族建筑真实拆除个人主状态精确目标');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态精确执行只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canExecute = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canExecute) throw createError('你没有执行家族建筑真实拆除个人主状态精确目标的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态精确执行必须保留拆除双方确认安全阀', 409);
  }
  if (request.confirmation_text !== '确认精确执行安全阀') {
    throw createError('请先输入确认精确执行安全阀文案', 400);
  }
  if (!request.compensation_plan_acknowledged || !request.rollback_plan_acknowledged) {
    throw createError('精确执行前必须确认补偿方案与回滚方案', 400);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousExactExecuteEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_exact_execute_idempotency_key === request.idempotency_key);
  if (previousExactExecuteEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousExactExecuteEntry.id) {
      throw createError('该个人主状态精确执行幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousExactExecuteEntry,
      idempotent: true,
      already_executed: true,
      main_state_exact_execution: {
        execution_state: previousExactExecuteEntry.real_build_demolition_main_state_exact_execution_state,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        next_deferred_operation: 'real_build_demolition_main_state_exact_target_manual_resolution',
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可执行个人主状态精确目标的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_exact_target_idempotency_key) {
    throw createError('请先绑定个人主状态精确目标，再执行精确目标安全阀', 409);
  }
  if (targetEntry.real_build_demolition_main_state_execution_state !== 'exact_target_bound_pending_execute') {
    throw createError('当前个人主状态执行状态不允许精确执行，请刷新后重试', 409);
  }
  if (request.expected_execution_state && request.expected_execution_state !== targetEntry.real_build_demolition_main_state_execution_state) {
    throw createError('个人主状态精确执行状态已变化，请刷新后重试', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_exact_target_manifest_hash || request.expected_exact_target_manifest_hash !== targetEntry.real_build_demolition_main_state_exact_target_manifest_hash) {
    throw createError('个人主状态精确目标 manifest hash 不匹配，请刷新后重试', 409);
  }
  if (targetEntry.real_build_demolition_main_state_exact_execute_idempotency_key) {
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: targetEntry,
      idempotent: true,
      already_executed: true,
      main_state_exact_execution: {
        execution_state: targetEntry.real_build_demolition_main_state_exact_execution_state,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        next_deferred_operation: 'real_build_demolition_main_state_exact_target_manual_resolution',
      },
    };
  }

  const exactTargets = targetEntry.real_build_demolition_main_state_exact_target_manifest || [];
  const unresolvedTargets = exactTargets.filter(isUnresolvedFamilyBuildingRealDemolitionMainStateExactTarget);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const executionState = unresolvedTargets.length > 0
    ? 'blocked_unresolved_exact_target_selector'
    : 'blocked_personal_main_state_mutation_adapter_missing';
  const nextDeferredOperation = unresolvedTargets.length > 0
    ? 'real_build_demolition_main_state_exact_target_manual_resolution'
    : 'real_build_demolition_main_state_exact_mutation_adapter_required';
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_exact_execute')
      : []),
    nextDeferredOperation,
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_exact_execute_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_exact_executed_at: operatedAt,
    real_build_demolition_main_state_exact_executed_by_username: member.username,
    real_build_demolition_main_state_exact_executed_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_exact_execution_state: executionState,
    real_build_demolition_main_state_exact_execute_policy: unresolvedTargets.length > 0
      ? '精确目标仍包含前端/QA 占位 selector，已阻断真实删除并要求人工解析到可证明个人存档对象。'
      : '精确目标已具备清单，但当前缺少个人 home / decoration 主状态 mutation adapter，已阻断真实删除。',
    real_build_demolition_main_state_execution_state: executionState,
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_exact_execution_blocked', actor, {
    building_ledger_id: nextEntry.id,
    real_build_ref: nextEntry.real_build_ref,
    exact_target_manifest_hash: targetEntry.real_build_demolition_main_state_exact_target_manifest_hash,
    exact_target_count: exactTargets.length,
    unresolved_target_count: unresolvedTargets.length,
    execution_state: executionState,
    mutation_enabled: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_executed: false,
    main_state_exact_execution: {
      execution_state: executionState,
      mutation_enabled: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      unresolved_target_count: unresolvedTargets.length,
      next_deferred_operation: nextDeferredOperation,
    },
  };
}

async function resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateExactTargetResolutionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '人工解析家族建筑真实拆除个人主状态精确目标');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态精确目标人工解析只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canResolve = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canResolve) throw createError('你没有人工解析家族建筑真实拆除个人主状态精确目标的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态精确目标人工解析必须保留拆除双方确认安全阀', 409);
  }
  if (request.confirmation_text !== '确认人工解析精确目标') {
    throw createError('请先输入确认人工解析精确目标文案', 400);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousResolutionEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key === request.idempotency_key);
  if (previousResolutionEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousResolutionEntry.id) {
      throw createError('该个人主状态精确目标人工解析幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousResolutionEntry,
      idempotent: true,
      already_resolved: true,
      main_state_exact_target_resolution: {
        manifest: previousResolutionEntry.real_build_demolition_main_state_exact_target_manifest,
        manifest_hash: previousResolutionEntry.real_build_demolition_main_state_exact_target_manifest_hash,
        mutation_enabled: false,
        personal_save_changed: false,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        next_deferred_operation: 'real_build_demolition_main_state_exact_mutation_adapter_required',
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可人工解析个人主状态精确目标的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_exact_target_idempotency_key) {
    throw createError('请先绑定个人主状态精确目标，再进行人工解析', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_exact_execute_idempotency_key) {
    throw createError('请先执行精确目标安全阀并记录阻断，再进行人工解析', 409);
  }
  if (targetEntry.real_build_demolition_main_state_exact_execution_state !== 'blocked_unresolved_exact_target_selector') {
    throw createError('当前个人主状态精确目标不处于待人工解析状态，请刷新后重试', 409);
  }
  if (request.expected_execution_state && request.expected_execution_state !== targetEntry.real_build_demolition_main_state_exact_execution_state) {
    throw createError('个人主状态精确目标人工解析状态已变化，请刷新后重试', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_exact_target_manifest_hash || request.expected_exact_target_manifest_hash !== targetEntry.real_build_demolition_main_state_exact_target_manifest_hash) {
    throw createError('个人主状态精确目标 manifest hash 不匹配，请刷新后重试', 409);
  }

  const resolvedManifest = buildFamilyBuildingRealDemolitionMainStateResolvedExactTargetManifest(
    targetEntry.real_build_demolition_main_state_exact_target_manifest,
    request.targets
  );
  const resolvedManifestHash = hashFamilyBuildingRealDemolitionMainStateExactTargetManifest(resolvedManifest);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = [...new Set([
    ...(Array.isArray(targetEntry.deferred_operations)
      ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_exact_target_manual_resolution')
      : []),
    'real_build_demolition_main_state_exact_mutation_adapter_required',
  ])];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_exact_target_resolution_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_exact_target_resolved_at: operatedAt,
    real_build_demolition_main_state_exact_target_resolved_by_username: member.username,
    real_build_demolition_main_state_exact_target_resolved_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_exact_target_manifest: resolvedManifest,
    real_build_demolition_main_state_exact_target_manifest_hash: resolvedManifestHash,
    real_build_demolition_main_state_exact_target_resolution_policy: '人工解析已替换前端/QA 占位 selector，并保留 hash、证明和审计；本步骤仍不删除个人主状态，真实删除需补个人主状态 mutation adapter。',
    real_build_demolition_main_state_exact_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
    real_build_demolition_main_state_exact_execute_policy: '精确目标已人工解析为非占位 selector，但当前缺少个人 home / decoration 主状态 mutation adapter，已继续阻断真实删除。',
    real_build_demolition_main_state_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_exact_targets_resolved', actor, {
    building_ledger_id: nextEntry.id,
    real_build_ref: nextEntry.real_build_ref,
    previous_exact_target_manifest_hash: targetEntry.real_build_demolition_main_state_exact_target_manifest_hash,
    resolved_exact_target_manifest_hash: resolvedManifestHash,
    resolved_target_count: resolvedManifest.length,
    execution_state: nextEntry.real_build_demolition_main_state_exact_execution_state,
    mutation_enabled: false,
    personal_save_changed: false,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_resolved: false,
    main_state_exact_target_resolution: {
      manifest: resolvedManifest,
      manifest_hash: resolvedManifestHash,
      mutation_enabled: false,
      personal_save_changed: false,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      next_deferred_operation: 'real_build_demolition_main_state_exact_mutation_adapter_required',
    },
  };
}

async function executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const request = normalizeFamilyBuildingRealDemolitionMainStateExactMutationAdapterPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '执行家族建筑真实拆除个人主状态变更适配器');
  if (!isFamilyRoleContractType(contract.type)) throw createError('家族建筑真实拆除个人主状态变更适配器只支持结拜庄园和合伙庄园', 403);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  const actorManorRole = normalizeFamilyManorRole(member.manor_role, contract.type, member.role);
  const canMutate = actorPermissions.construction.demolish_building === true
    || actorPermissions.fund.spend_large === true
    || ['family_head', 'workshop_keeper'].includes(actorManorRole);
  if (!canMutate) throw createError('你没有执行家族建筑真实拆除个人主状态变更适配器的权限', 403);
  if (actorPermissions.confirmations.demolish_requires_both !== true) {
    throw createError('家族建筑真实拆除个人主状态变更适配器必须保留拆除双方确认安全阀', 409);
  }
  if (request.confirmation_text !== '确认执行个人主状态变更') {
    throw createError('请先输入确认执行个人主状态变更文案', 400);
  }
  if (!request.compensation_plan_acknowledged || !request.rollback_plan_acknowledged) {
    throw createError('执行个人主状态变更前必须确认补偿方案与回滚方案', 400);
  }

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const familyLedger = normalizeFamilyBuildingLedger(contract);
  const previousMutationEntry = familyLedger.find(entry => entry.real_build_demolition_main_state_exact_mutation_idempotency_key === request.idempotency_key);
  if (previousMutationEntry) {
    const requestedEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
    if (requestedEntry && requestedEntry.id !== previousMutationEntry.id) {
      throw createError('该个人主状态变更适配器幂等键已用于其他建筑流水，请更换 idempotency_key', 409);
    }
    return {
      contract: toPublicContract(contract),
      family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      building_ledger_entry: previousMutationEntry,
      idempotent: true,
      already_mutated: true,
      main_state_exact_mutation: {
        receipts: previousMutationEntry.real_build_demolition_main_state_exact_mutation_receipts,
        mutation_enabled: true,
        personal_save_changed: previousMutationEntry.real_build_demolition_main_state_exact_mutation_receipts.length > 0,
        shared_fund_changed: false,
        shared_warehouse_changed: false,
        execution_state: previousMutationEntry.real_build_demolition_main_state_exact_execution_state,
      },
    };
  }

  const targetEntry = findFamilyBuildingLedgerForRealBuildApply(contract, request);
  if (!targetEntry) throw createError('找不到可执行个人主状态变更适配器的家族建筑流水', 404);
  if (!targetEntry.real_build_demolition_main_state_exact_target_resolution_idempotency_key) {
    throw createError('请先人工解析个人主状态精确目标，再执行变更适配器', 409);
  }
  if (targetEntry.real_build_demolition_main_state_exact_execution_state !== 'blocked_personal_main_state_mutation_adapter_missing') {
    throw createError('当前个人主状态精确执行状态不允许执行变更适配器，请刷新后重试', 409);
  }
  if (request.expected_execution_state && request.expected_execution_state !== targetEntry.real_build_demolition_main_state_exact_execution_state) {
    throw createError('个人主状态变更适配器执行状态已变化，请刷新后重试', 409);
  }
  if (!targetEntry.real_build_demolition_main_state_exact_target_manifest_hash || request.expected_exact_target_manifest_hash !== targetEntry.real_build_demolition_main_state_exact_target_manifest_hash) {
    throw createError('个人主状态精确目标 manifest hash 不匹配，请刷新后重试', 409);
  }
  const exactTargets = targetEntry.real_build_demolition_main_state_exact_target_manifest || [];
  if (exactTargets.length === 0) throw createError('缺少可执行的个人主状态精确目标清单', 409);
  if (exactTargets.some(isUnresolvedFamilyBuildingRealDemolitionMainStateExactTarget)) {
    throw createError('个人主状态精确目标仍包含占位 selector，请先人工解析', 409);
  }

  const receipts = applyFamilyBuildingMainStateExactMutationToPersonalSaves(contract, targetEntry, request);
  if (receipts.length === 0) throw createError('没有可写入个人主状态变更的已解析目标', 409);
  const operatedAt = nowSeconds();
  const roleDef = getFamilyManorRoleDef(actorManorRole);
  const nextDeferredOperations = Array.isArray(targetEntry.deferred_operations)
    ? targetEntry.deferred_operations.filter(item => item && item !== 'real_build_demolition_main_state_exact_mutation_adapter_required')
    : [];
  const nextEntry = normalizeFamilyBuildingLedgerEntry({
    ...targetEntry,
    real_build_demolition_main_state_exact_mutation_idempotency_key: request.idempotency_key,
    real_build_demolition_main_state_exact_mutated_at: operatedAt,
    real_build_demolition_main_state_exact_mutated_by_username: member.username,
    real_build_demolition_main_state_exact_mutated_by_display_name: actor.displayName || actor.display_name || member.display_name || member.username,
    real_build_demolition_main_state_exact_mutation_receipts: receipts,
    real_build_demolition_main_state_exact_mutation_policy: '已通过窄 selector 适配器删除个人 home / decoration 主状态目标；共同基金、共同仓库、个人铜币、背包和农田均未改写。',
    real_build_demolition_main_state_exact_execution_state: 'personal_main_state_mutated',
    real_build_demolition_main_state_exact_execute_policy: '个人主状态精确目标已执行适配器变更，保留回执用于审计、补偿和断线重试幂等读回。',
    real_build_demolition_main_state_execution_state: 'personal_main_state_mutated',
    actor_manor_role: actorManorRole,
    actor_manor_role_label: roleDef?.label || targetEntry.actor_manor_role_label,
    deferred_operations: nextDeferredOperations,
  });
  contract.family_building_ledger = familyLedger.map(entry =>
    entry.id === targetEntry.id ? nextEntry : entry
  ).slice(0, FAMILY_BUILDING_LEDGER_LIMIT);
  appendAudit(contract, 'family_building_real_demolition_main_state_exact_mutation_applied', actor, {
    building_ledger_id: nextEntry.id,
    real_build_ref: nextEntry.real_build_ref,
    exact_target_manifest_hash: targetEntry.real_build_demolition_main_state_exact_target_manifest_hash,
    receipt_count: receipts.length,
    receipt_usernames: receipts.map(receipt => receipt.username),
    execution_state: nextEntry.real_build_demolition_main_state_exact_execution_state,
    mutation_enabled: true,
    personal_save_changed: true,
    shared_fund_changed: false,
    shared_warehouse_changed: false,
  }, request.idempotency_key);
  contract.updated_at = operatedAt;
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    family_buildings_panel: buildFamilyBuildingSnapshot(contract, actorUsername),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    building_ledger_entry: nextEntry,
    idempotent: false,
    already_mutated: false,
    main_state_exact_mutation: {
      receipts,
      mutation_enabled: true,
      personal_save_changed: true,
      shared_fund_changed: false,
      shared_warehouse_changed: false,
      execution_state: nextEntry.real_build_demolition_main_state_exact_execution_state,
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
      animals: [],
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
    if (!contract.shared_map) {
      const farmSnapshots = contract.members.map(readMemberFarmSnapshot);
      contract.shared_map = buildSharedMapFromFarmSnapshots(contract, farmSnapshots, {
        persisted: true,
      });
      contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
      contract.origin_assets.plots = contract.shared_map.plots
        .map(buildPlotOriginAssetFromSharedPlot)
        .filter(entry => entry.id)
        .slice(0, 400);
    }
    if (!contract.shared_animals?.persisted) {
      const animalSnapshots = contract.members.map(readMemberAnimalSnapshot);
      contract.shared_animals = buildSharedAnimalsFromSnapshots(contract, animalSnapshots, {
        persisted: true,
      });
      contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
      contract.origin_assets.animals = contract.shared_animals.animals
        .map(buildAnimalOriginAssetFromSharedAnimal)
        .filter(entry => entry.id)
        .slice(0, SHARED_ANIMAL_LIMIT);
    }
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
      shared_map_persisted: contract.shared_map?.persisted === true,
      shared_map_plot_count: contract.shared_map?.summary?.total_plots || 0,
      shared_animals_persisted: contract.shared_animals?.persisted === true,
      shared_animal_count: contract.shared_animals?.summary?.animal_count || 0,
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
  const decorationSplitManifest = buildDecorationSplitManifest(contract);
  const familyBuildingSplitManifest = buildFamilyBuildingSplitManifest(contract);
  const sharedDecorationRemovalDisputeFreeze = buildSharedDecorationRemovalDisputeFreezePreview(contract);
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
      decorations_by_origin_owner: summarizeDecorationSplitsByOwner(decorationSplitManifest),
      decoration_split_manifest: decorationSplitManifest,
      decoration_split_manifest_hash: hashDecorationSplitManifest(decorationSplitManifest),
      family_buildings_by_origin_owner: summarizeBuildingSplitsByProject(familyBuildingSplitManifest),
      family_building_split_manifest: familyBuildingSplitManifest,
      family_building_split_manifest_hash: hashFamilyBuildingSplitManifest(familyBuildingSplitManifest),
      building_split_policy: '第一版只记录装饰 / 建筑拆分 ledger、hash、审计和补偿提示；不移动个人房屋、家具或真实建筑状态。',
      shared_decoration_removal_disputes: sharedDecorationRemovalDisputeFreeze.disputes,
      shared_decoration_removal_freeze_summary: sharedDecorationRemovalDisputeFreeze.summary,
      shared_decoration_removal_freeze_policy: sharedDecorationRemovalDisputeFreeze.policy,
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
      sharedDecorationRemovalDisputeFreeze,
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
      sharedDecorationRemovalDisputeFreeze,
    }),
    deferred_operations: [
      'execute_asset_return',
      'write_personal_save_refunds',
      'split_decorations',
      'resolve_family_story',
      'freeze_high_value_disputes',
      ...(sharedDecorationRemovalDisputeFreeze.summary.freeze_required ? ['freeze_shared_decoration_removal_disputes'] : []),
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
    decoration_groups: preview.asset_return.decorations_by_origin_owner.length,
    family_building_groups: preview.asset_return.family_buildings_by_origin_owner.length,
    shared_decoration_removal_dispute_count: sharedDecorationRemovalDisputeFreeze.summary.pending_count,
    shared_decoration_removal_dispute_amount: sharedDecorationRemovalDisputeFreeze.summary.total_amount,
    shared_decoration_removal_freeze_required: sharedDecorationRemovalDisputeFreeze.summary.freeze_required,
    shared_decoration_removal_fund_ledger_ids: sharedDecorationRemovalDisputeFreeze.summary.original_fund_ledger_ids,
    shared_decoration_removal_target_refs: sharedDecorationRemovalDisputeFreeze.summary.target_refs,
    shared_decoration_removal_freeze_status: sharedDecorationRemovalDisputeFreeze.policy.status,
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

async function writeSeparationPersonalFarmReturns(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const writePayload = normalizeSeparationPersonalSaveWritePayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要写回的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以写回分居农田', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以写回分居农田', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['asset_return_recorded', 'personal_save_written'].includes(String(executionRequest.status || ''))) {
    throw createError('请先记录分居返还执行，再写回个人农田', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (writePayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && entry.status === 'asset_return_recorded')
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (writePayload.execution_ledger_id && writePayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.personal_save_write_idempotency_key === writePayload.idempotency_key || ledger.personal_save_written === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_written: ledger.personal_save_written === true,
      execution_ledger: ledger,
      receipts: ledger.personal_save_receipts || [],
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (writePayload.plot_return_manifest_hash && writePayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免写回错田区', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }

  const groups = groupPlotManifestByReturnTarget(manifest).map(group => ({
    ...group,
    member: (contract.members || []).find(entry => entry.username_key === group.username_key || normalizeUsernameKey(entry.username) === group.username_key) || null,
  }));
  if (groups.length === 0) throw createError('分居返还清单没有可写回的来源田区', 409);
  const receipts = groups.map(group => writePersonalFarmPlotsFromManifest(group, writePayload));
  const writtenAt = nowSeconds();
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'personal_save_written',
    personal_save_written: true,
    personal_save_write_idempotency_key: writePayload.idempotency_key,
    personal_save_written_at: writtenAt,
    personal_save_written_by: member.username,
    personal_save_receipts: receipts,
    next_required_operations: ['verify_personal_save_receipts', 'split_decorations', 'resolve_family_story'],
  });
  const nextManifest = manifest.map(entry => ({
    ...entry,
    execution_status: 'personal_save_written',
    personal_save_write_idempotency_key: writePayload.idempotency_key,
  }));
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'personal_save_written',
    personal_save_written: true,
    personal_save_written_at: writtenAt,
    personal_save_written_by: member.username,
    personal_save_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      plot_return_manifest: nextManifest,
      personal_save_written: true,
      personal_save_written_at: writtenAt,
      personal_save_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      personal_save_written: true,
      personal_save_written_at: writtenAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '来源田区已按预览 hash 写回双方个人 farm.plots；共同基金、共同仓库、装饰和剧情拆分仍需后续独立接口。'
    },
    deferred_operations: ['verify_personal_save_receipts', 'split_decorations', 'resolve_family_story'],
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_personal_farm_written', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    receipt_count: receipts.length,
    restored_plot_count: receipts.reduce((sum, receipt) => sum + receipt.restored_plot_count, 0),
    personal_save_written: true,
    shared_fund_refunded: false,
    shared_warehouse_returned: false,
    next_required_operations: nextLedger.next_required_operations,
  }, writePayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_written: false,
    execution_ledger: nextLedger,
    receipts,
  };
}

async function refundSeparationSharedFund(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const refundPayload = normalizeSeparationSharedFundRefundPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要返还共同基金的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以返还共同基金', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以返还共同基金', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['personal_save_written', 'shared_fund_refunded'].includes(String(executionRequest.status || ''))) {
    throw createError('请先写回来源田区个人农田，再返还共同基金', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (refundPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['personal_save_written', 'shared_fund_refunded'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (refundPayload.execution_ledger_id && refundPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.shared_fund_refund_idempotency_key === refundPayload.idempotency_key || ledger.shared_fund_refunded === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      fund: buildSharedFundSnapshot(contract, actorUsername),
      idempotent: true,
      already_refunded: ledger.shared_fund_refunded === true,
      execution_ledger: ledger,
      receipts: ledger.shared_fund_refund_receipts || [],
      fund_ledger_entries: (contract.shared_fund.ledger || []).filter(entry =>
        (ledger.shared_fund_refund_receipts || []).some(receipt => receipt.fund_ledger_id === entry.id)
      ),
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (refundPayload.plot_return_manifest_hash && refundPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免返还错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.personal_save_written !== true) throw createError('来源田区个人农田尚未写回，不能返还共同基金', 409);

  const refundRows = (ledger.fund_refunds_by_origin_owner || []).filter(entry => entry.suggested_refund_amount > 0);
  const totalRefundAmount = refundRows.reduce((sum, entry) => sum + entry.suggested_refund_amount, 0);
  const balanceBefore = contract.shared_fund.balance;
  if (totalRefundAmount > balanceBefore) throw createError('共同基金余额不足以按预览返还，请重新生成分居预览或人工补偿', 409);
  let rollingBalance = balanceBefore;
  const refundedAt = nowSeconds();
  const fundLedgerEntries = refundRows.map(entry => {
    rollingBalance -= entry.suggested_refund_amount;
    return normalizeFundLedgerEntry({
      id: makeId('shared_fund_ledger'),
      action: 'separation_refund',
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || actorUsername,
      amount: entry.suggested_refund_amount,
      at: refundedAt,
      memo: refundPayload.memo || '分居共同基金返还',
      purpose: 'separation_refund',
      source_owner_id: entry.origin_owner_id,
      source_owner_username: entry.origin_owner_username,
      source_owner_key: entry.origin_owner_key,
      source_owner_display_name: entry.origin_owner_username,
      target_ref: `separation:${normalizedPreviewId}:${ledger.id}`,
      target_owner_username: entry.origin_owner_username,
      target_owner_key: entry.origin_owner_key,
      balance_after: rollingBalance,
      confirmation_required: false,
      idempotency_key: `${refundPayload.idempotency_key}:${entry.origin_owner_key || entry.origin_owner_username}`,
      reversible: true,
      compensation_hint: '分居共同基金已从共同基金扣除并写回个人铜币；失败时按本 ledger 与个人 receipt 补偿重放。',
      status: 'committed',
    });
  });
  const receipts = writePersonalMoneyRefundsFromLedger(refundRows, contract, refundPayload, fundLedgerEntries);
  contract.shared_fund.balance = Math.max(0, balanceBefore - totalRefundAmount);
  contract.shared_fund.ledger = [...fundLedgerEntries, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);

  const nextFundRefundRows = (ledger.fund_refunds_by_origin_owner || []).map(entry => ({
    ...entry,
    return_status: entry.suggested_refund_amount > 0 ? 'personal_money_written' : entry.return_status,
    refund_idempotency_key: refundPayload.idempotency_key,
  }));
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'shared_fund_refunded',
    fund_refunds_by_origin_owner: nextFundRefundRows,
    shared_fund_refunded: true,
    shared_fund_refund_idempotency_key: refundPayload.idempotency_key,
    shared_fund_refunded_at: refundedAt,
    shared_fund_refunded_by: member.username,
    shared_fund_refund_total: totalRefundAmount,
    shared_fund_balance_before: balanceBefore,
    shared_fund_balance_after: contract.shared_fund.balance,
    shared_fund_refund_receipts: receipts,
    shared_assets_mutated: totalRefundAmount > 0,
    next_required_operations: ['return_shared_warehouse_items', 'split_decorations', 'resolve_family_story'],
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'shared_fund_refunded',
    shared_fund_refunded: true,
    shared_fund_refunded_at: refundedAt,
    shared_fund_refunded_by: member.username,
    shared_fund_refund_total: totalRefundAmount,
    shared_fund_refund_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      fund_contributions_by_origin_owner: nextFundRefundRows,
      shared_fund_refunded: true,
      shared_fund_refunded_at: refundedAt,
      shared_fund_refund_total: totalRefundAmount,
      shared_fund_refund_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      shared_fund_refunded: true,
      shared_fund_refunded_at: refundedAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '共同基金已按预览比例写回个人铜币；共同仓库、装饰 / 建筑和剧情拆分仍需后续独立接口。'
    },
    deferred_operations: ['return_shared_warehouse_items', 'split_decorations', 'resolve_family_story'],
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_shared_fund_refunded', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    refund_total: totalRefundAmount,
    receipt_count: receipts.length,
    shared_fund_balance_before: balanceBefore,
    shared_fund_balance_after: contract.shared_fund.balance,
    personal_money_merged: false,
    shared_warehouse_returned: false,
    next_required_operations: nextLedger.next_required_operations,
  }, refundPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    fund: buildSharedFundSnapshot(contract, actorUsername),
    idempotent: false,
    already_refunded: false,
    execution_ledger: nextLedger,
    receipts,
    fund_ledger_entries: fundLedgerEntries,
    shared_fund: {
      refund_total: totalRefundAmount,
      balance_before: balanceBefore,
      balance_after: contract.shared_fund.balance,
      personal_money_merged: false,
    },
  };
}

async function returnSeparationSharedWarehouse(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const returnPayload = normalizeSeparationSharedWarehouseReturnPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要返还共同仓库的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以返还共同仓库', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以返还共同仓库', 403);

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['shared_fund_refunded', 'shared_warehouse_returned'].includes(String(executionRequest.status || ''))) {
    throw createError('请先返还共同基金，再返还共同仓库', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (returnPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['shared_fund_refunded', 'shared_warehouse_returned'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (returnPayload.execution_ledger_id && returnPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.shared_warehouse_return_idempotency_key === returnPayload.idempotency_key || ledger.shared_warehouse_returned === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      idempotent: true,
      already_returned: ledger.shared_warehouse_returned === true,
      execution_ledger: ledger,
      receipts: ledger.shared_warehouse_return_receipts || [],
      warehouse_ledger_entries: (contract.shared_warehouse.ledger || []).filter(entry =>
        (ledger.shared_warehouse_return_receipts || []).some(receipt => receipt.warehouse_ledger_id === entry.id)
      ),
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (returnPayload.plot_return_manifest_hash && returnPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免返还错物', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.shared_fund_refunded !== true) throw createError('共同基金尚未返还，不能返还共同仓库', 409);

  const returnRows = (ledger.warehouse_returns_by_origin_owner || []).filter(entry => entry.quantity > 0);
  let workingWarehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const returnedAt = nowSeconds();
  const warehouseLedgerEntries = [];
  for (const row of returnRows) {
    const allocationResult = buildWarehouseWithdrawalAllocations(workingWarehouse, row.item_id, row.quantity, row.quality);
    if (!allocationResult.ok) throw createError(`共同仓库中 ${row.item_id} 可返还数量不足，请重新生成分居预览或人工补偿`, 409);
    const mismatched = allocationResult.allocations.find(allocation =>
      normalizeUsernameKey(allocation.source_owner_key || allocation.source_owner_username) !== row.origin_owner_key
    );
    if (mismatched) throw createError(`共同仓库来源玩家与分居清单不一致：${row.item_id}`, 409);
    const targetMember = (contract.members || []).find(entry =>
      entry.username_key === row.origin_owner_key || normalizeUsernameKey(entry.username) === row.origin_owner_key
    ) || null;
    const targetSaveId = normalizeSaveId(targetMember?.save_id);
    const targetSaveSlot = normalizeSaveSlot(targetMember?.save_slot);
    const targetOwnerId = targetSaveId ? `save:${targetSaveId}` : `account:${row.origin_owner_key}`;
    const ledgerEntry = normalizeWarehouseLedgerEntry({
      id: makeId('shared_warehouse_ledger'),
      action: 'separation_return',
      item_id: row.item_id,
      quality: row.quality,
      quantity: row.quantity,
      actor_username: actorUsername,
      actor_display_name: actor.displayName || actor.display_name || actorUsername,
      source_owner_id: row.origin_owner_id,
      source_owner_username: row.origin_owner_username,
      source_owner_display_name: row.origin_owner_username,
      source_owner_key: row.origin_owner_key,
      source_ledger_ids: allocationResult.allocations.flatMap(allocation => allocation.source_ledger_ids || [allocation.source_ledger_id]).filter(Boolean),
      target_owner_id: targetOwnerId,
      target_owner_username: row.origin_owner_username,
      target_owner_display_name: row.origin_owner_username,
      target_owner_key: row.origin_owner_key,
      target_save_id: targetSaveId,
      target_save_slot: targetSaveSlot,
      target_inventory: 'inventory.items',
      target_ref: `separation:${normalizedPreviewId}:${ledger.id}`,
      at: returnedAt,
      idempotency_key: `${returnPayload.idempotency_key}:${row.origin_owner_key}:${row.item_id}:${row.quality}`,
      reversible: true,
      compensation_hint: '分居共同仓库物已扣共同仓库并写回来源成员个人背包；失败时按本 ledger 与个人 receipt 补偿重放。',
      status: 'committed',
    });
    if (ledgerEntry) {
      warehouseLedgerEntries.push(ledgerEntry);
      workingWarehouse = normalizeSharedWarehouse({
        ...workingWarehouse,
        ledger: [ledgerEntry, ...workingWarehouse.ledger],
      });
    }
  }

  const receipts = writePersonalInventoryReturnsFromLedger(returnRows, contract, returnPayload, warehouseLedgerEntries);
  const receiptByLedgerId = new Map(receipts.map(receipt => [receipt.warehouse_ledger_id, receipt]));
  const finalizedWarehouseLedgerEntries = warehouseLedgerEntries.map(entry => {
    const receipt = receiptByLedgerId.get(entry.id);
    return normalizeWarehouseLedgerEntry({
      ...entry,
      target_save_id: receipt?.save_id || entry.target_save_id,
      target_save_slot: receipt?.save_slot ?? entry.target_save_slot,
      target_save_revision: receipt?.after_revision || entry.target_save_revision,
      target_slots: receipt?.target_slots || entry.target_slots,
    });
  }).filter(Boolean);
  contract.shared_warehouse.ledger = [...finalizedWarehouseLedgerEntries, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);

  const nextWarehouseReturnRows = (ledger.warehouse_returns_by_origin_owner || []).map(entry => ({
    ...entry,
    return_status: entry.quantity > 0 ? 'personal_inventory_written' : entry.return_status,
    return_idempotency_key: returnPayload.idempotency_key,
  }));
  const totalReturnedQuantity = returnRows.reduce((sum, entry) => sum + entry.quantity, 0);
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'shared_warehouse_returned',
    warehouse_returns_by_origin_owner: nextWarehouseReturnRows,
    shared_warehouse_returned: true,
    shared_warehouse_return_idempotency_key: returnPayload.idempotency_key,
    shared_warehouse_returned_at: returnedAt,
    shared_warehouse_returned_by: member.username,
    shared_warehouse_return_total_quantity: totalReturnedQuantity,
    shared_warehouse_return_receipts: receipts,
    shared_assets_mutated: true,
    next_required_operations: ['split_decorations', 'resolve_family_story'],
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'shared_warehouse_returned',
    shared_warehouse_returned: true,
    shared_warehouse_returned_at: returnedAt,
    shared_warehouse_returned_by: member.username,
    shared_warehouse_return_total_quantity: totalReturnedQuantity,
    shared_warehouse_return_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      warehouse_items_by_origin_owner: nextWarehouseReturnRows,
      shared_warehouse_returned: true,
      shared_warehouse_returned_at: returnedAt,
      shared_warehouse_return_total_quantity: totalReturnedQuantity,
      shared_warehouse_return_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      shared_warehouse_returned: true,
      shared_warehouse_returned_at: returnedAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '共同仓库已按来源流水写回来源成员个人背包；装饰 / 建筑和剧情拆分仍需后续独立接口。'
    },
    deferred_operations: ['split_decorations', 'resolve_family_story'],
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_shared_warehouse_returned', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    returned_quantity: totalReturnedQuantity,
    receipt_count: receipts.length,
    warehouse_ledger_ids: finalizedWarehouseLedgerEntries.map(entry => entry.id),
    personal_money_merged: false,
    next_required_operations: nextLedger.next_required_operations,
  }, returnPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    idempotent: false,
    already_returned: false,
    execution_ledger: nextLedger,
    receipts,
    warehouse_ledger_entries: finalizedWarehouseLedgerEntries,
    shared_warehouse: {
      returned_quantity: totalReturnedQuantity,
      personal_inventory_merged: false,
    },
  };
}

async function splitSeparationDecorationsAndBuildings(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const splitPayload = normalizeSeparationDecorationBuildingSplitPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要记录装饰 / 建筑拆分的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以记录装饰 / 建筑拆分', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以记录装饰 / 建筑拆分', 403);

  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['shared_warehouse_returned', 'decorations_buildings_split'].includes(String(executionRequest.status || ''))) {
    throw createError('请先返还共同仓库，再记录装饰 / 建筑拆分', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (splitPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['shared_warehouse_returned', 'decorations_buildings_split'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (splitPayload.execution_ledger_id && splitPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.decorations_buildings_split_idempotency_key === splitPayload.idempotency_key || ledger.decorations_buildings_split === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_split: ledger.decorations_buildings_split === true,
      execution_ledger: ledger,
      receipts: ledger.decoration_building_split_receipts || [],
    };
  }

  const plotManifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const decorationManifest = Array.isArray(preview.asset_return?.decoration_split_manifest) ? preview.asset_return.decoration_split_manifest : [];
  const buildingManifest = Array.isArray(preview.asset_return?.family_building_split_manifest) ? preview.asset_return.family_building_split_manifest : [];
  const expectedPlotHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(plotManifest);
  const expectedDecorationHash = sanitizeText(preview.asset_return?.decoration_split_manifest_hash, 100) || hashDecorationSplitManifest(decorationManifest);
  const expectedBuildingHash = sanitizeText(preview.asset_return?.family_building_split_manifest_hash, 100) || hashFamilyBuildingSplitManifest(buildingManifest);
  if (!expectedPlotHash || !/^[a-f0-9]{64}$/i.test(expectedPlotHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (splitPayload.plot_return_manifest_hash && splitPayload.plot_return_manifest_hash !== expectedPlotHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免装饰 / 建筑拆分错账', 409);
  }
  if (splitPayload.decoration_split_manifest_hash && splitPayload.decoration_split_manifest_hash !== expectedDecorationHash) {
    throw createError('分居装饰拆分清单 hash 不匹配，请重新生成预览，避免装饰拆分错账', 409);
  }
  if (splitPayload.building_split_manifest_hash && splitPayload.building_split_manifest_hash !== expectedBuildingHash) {
    throw createError('分居建筑拆分清单 hash 不匹配，请重新生成预览，避免建筑拆分错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedPlotHash) throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  if (ledger.decoration_split_manifest_hash && ledger.decoration_split_manifest_hash !== expectedDecorationHash) throw createError('分居装饰执行记录与当前预览 hash 不一致，请人工复核', 409);
  if (ledger.building_split_manifest_hash && ledger.building_split_manifest_hash !== expectedBuildingHash) throw createError('分居建筑执行记录与当前预览 hash 不一致，请人工复核', 409);
  if (ledger.shared_warehouse_returned !== true) throw createError('共同仓库尚未返还，不能记录装饰 / 建筑拆分', 409);

  const splitAt = nowSeconds();
  const receipts = [
    {
      receipt_id: makeId('decoration_split_receipt'),
      receipt_type: 'decorations',
      count: decorationManifest.length,
      manifest_hash: expectedDecorationHash,
      status: 'recorded_only',
      idempotency_key: splitPayload.idempotency_key,
      recorded_at: splitAt,
    },
    {
      receipt_id: makeId('building_split_receipt'),
      receipt_type: 'family_buildings',
      count: buildingManifest.length,
      manifest_hash: expectedBuildingHash,
      status: 'recorded_only',
      idempotency_key: splitPayload.idempotency_key,
      recorded_at: splitAt,
    },
  ];
  const nextRequiredOperations = (ledger.next_required_operations || [])
    .filter(operation => operation && operation !== 'split_decorations' && operation !== 'split_buildings');
  if (!nextRequiredOperations.includes('resolve_family_story')) nextRequiredOperations.push('resolve_family_story');
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'decorations_buildings_split',
    decorations_buildings_split: true,
    decorations_buildings_split_idempotency_key: splitPayload.idempotency_key,
    decorations_buildings_split_at: splitAt,
    decorations_buildings_split_by: member.username,
    decoration_split_manifest_hash: expectedDecorationHash,
    building_split_manifest_hash: expectedBuildingHash,
    decoration_splits_by_origin_owner: summarizeDecorationSplitsByOwner(decorationManifest),
    building_splits_by_origin_owner: summarizeBuildingSplitsByProject(buildingManifest),
    decoration_building_split_receipts: receipts,
    next_required_operations: nextRequiredOperations,
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'decorations_buildings_split',
    decorations_buildings_split: true,
    decorations_buildings_split_at: splitAt,
    decorations_buildings_split_by: member.username,
    decoration_building_split_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      decorations_buildings_split: true,
      decorations_buildings_split_at: splitAt,
      decoration_building_split_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      decorations_buildings_split: true,
      decorations_buildings_split_at: splitAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '分居装饰 / 建筑拆分已记录 ledger、hash 和补偿提示；个人小屋、家具、真实建筑和共同资产不由本步骤自动改写。',
    },
    deferred_operations: nextLedger.next_required_operations,
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_decorations_buildings_split', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedPlotHash,
    decoration_split_manifest_hash: expectedDecorationHash,
    building_split_manifest_hash: expectedBuildingHash,
    decoration_count: decorationManifest.length,
    building_count: buildingManifest.length,
    shared_assets_mutated: false,
    personal_home_mutated: false,
    next_required_operations: nextLedger.next_required_operations,
  }, splitPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_split: false,
    execution_ledger: nextLedger,
    receipts,
  };
}

async function resolveSeparationFamilyStory(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const storyPayload = normalizeSeparationFamilyStoryResolvePayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要记录剧情拆分的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以记录剧情拆分', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以记录剧情拆分', 403);

  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['shared_warehouse_returned', 'decorations_buildings_split', 'family_story_resolved'].includes(String(executionRequest.status || ''))) {
    throw createError('请先返还共同仓库，再记录剧情拆分', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (storyPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['shared_warehouse_returned', 'decorations_buildings_split', 'family_story_resolved'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (storyPayload.execution_ledger_id && storyPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.family_story_resolution_idempotency_key === storyPayload.idempotency_key || ledger.family_story_resolved === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_resolved: ledger.family_story_resolved === true,
      execution_ledger: ledger,
      story_resolution: ledger.family_story_resolution,
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (storyPayload.plot_return_manifest_hash && storyPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免剧情拆分错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.shared_warehouse_returned !== true) throw createError('共同仓库尚未返还，不能记录剧情拆分', 409);

  const relationDef = RELATION_TYPE_DEFS[contract.type] || {};
  const familyStoryResolvedAt = nowSeconds();
  const childArrangementRequired = ['marriage_home'].includes(contract.type)
    && (contract.family_state?.has_children === true || contract.family_state?.child_count > 0);
  const personalStoryWriteRequired = ['lover_cohabitation', 'marriage_home', 'bosom_partner'].includes(contract.type);
  const storyResolution = {
    relation_type: contract.type,
    relation_label: relationDef.label || contract.type,
    resolution_choice: storyPayload.resolution_choice,
    story_state: personalStoryWriteRequired ? 'personal_story_write_pending' : 'contract_story_closed',
    personal_story_write_required: personalStoryWriteRequired,
    child_arrangement_required: childArrangementRequired,
    privacy_boundary: '仅在共同契约记录分居剧情拆分状态；个人 NPC、孩子、恋爱和家庭存档不在联机契约中公开或自动改写。',
    memo: storyPayload.memo,
  };
  const nextRequiredOperations = ledger.decorations_buildings_split === true ? [] : ['split_decorations'];
  if (childArrangementRequired) nextRequiredOperations.push('resolve_child_arrangement');
  if (personalStoryWriteRequired) nextRequiredOperations.push('write_personal_story_receipts');

  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'family_story_resolved',
    family_story_resolved: true,
    family_story_resolution_idempotency_key: storyPayload.idempotency_key,
    family_story_resolved_at: familyStoryResolvedAt,
    family_story_resolved_by: member.username,
    family_story_resolution: storyResolution,
    next_required_operations: nextRequiredOperations,
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'family_story_resolved',
    family_story_resolved: true,
    family_story_resolved_at: familyStoryResolvedAt,
    family_story_resolved_by: member.username,
    family_story_resolution: storyResolution,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      family_story_resolved: true,
      family_story_resolved_at: familyStoryResolvedAt,
      family_story_resolution: storyResolution,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      family_story_resolved: true,
      family_story_resolved_at: familyStoryResolvedAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '分居剧情拆分已记录在共同契约；个人剧情、孩子安排和装饰 / 建筑拆分仍由后续独立接口处理。',
    },
    deferred_operations: nextLedger.next_required_operations,
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_family_story_resolved', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    relation_type: storyResolution.relation_type,
    resolution_choice: storyResolution.resolution_choice,
    personal_story_write_required: storyResolution.personal_story_write_required,
    child_arrangement_required: storyResolution.child_arrangement_required,
    privacy_boundary: storyResolution.privacy_boundary,
    next_required_operations: nextLedger.next_required_operations,
  }, storyPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_resolved: false,
    execution_ledger: nextLedger,
    story_resolution: storyResolution,
  };
}

async function writeSeparationPersonalStoryReceipts(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const receiptPayload = normalizeSeparationPersonalStoryReceiptsPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要写入个人剧情回执的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以写入个人剧情回执', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以写入个人剧情回执', 403);

  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['family_story_resolved', 'personal_story_receipts_written'].includes(String(executionRequest.status || ''))) {
    throw createError('请先记录剧情拆分，再写入个人剧情回执', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (receiptPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['family_story_resolved', 'personal_story_receipts_written'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (receiptPayload.execution_ledger_id && receiptPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.personal_story_receipts_idempotency_key === receiptPayload.idempotency_key || ledger.personal_story_receipts_written === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_written: ledger.personal_story_receipts_written === true,
      execution_ledger: ledger,
      receipts: ledger.personal_story_receipts || [],
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (receiptPayload.plot_return_manifest_hash && receiptPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免个人剧情回执错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.family_story_resolved !== true || !ledger.family_story_resolution) throw createError('分居剧情拆分尚未记录，不能写入个人剧情回执', 409);
  if (ledger.family_story_resolution.personal_story_write_required === false) {
    throw createError('当前关系类型不需要写入个人剧情回执', 409);
  }

  const receipts = writePersonalStoryReceiptsFromResolution(contract, ledger, receiptPayload);
  if (receipts.length === 0) throw createError('没有可写入个人剧情回执的已接受成员', 409);
  const writtenAt = nowSeconds();
  const nextRequiredOperations = (ledger.next_required_operations || [])
    .filter(operation => operation && operation !== 'write_personal_story_receipts');
  if (ledger.decorations_buildings_split !== true && !nextRequiredOperations.includes('split_decorations')) nextRequiredOperations.unshift('split_decorations');
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'personal_story_receipts_written',
    personal_story_receipts_written: true,
    personal_story_receipts_idempotency_key: receiptPayload.idempotency_key,
    personal_story_receipts_written_at: writtenAt,
    personal_story_receipts_written_by: member.username,
    personal_story_receipts: receipts,
    next_required_operations: nextRequiredOperations,
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'personal_story_receipts_written',
    personal_story_receipts_written: true,
    personal_story_receipts_written_at: writtenAt,
    personal_story_receipts_written_by: member.username,
    personal_story_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      personal_story_receipts_written: true,
      personal_story_receipts_written_at: writtenAt,
      personal_story_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      personal_story_receipts_written: true,
      personal_story_receipts_written_at: writtenAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '分居个人剧情回执已写入各成员存档；NPC、家庭、孩子状态仍不由联机契约自动改写。',
    },
    deferred_operations: nextLedger.next_required_operations,
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_personal_story_receipts_written', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    receipt_count: receipts.length,
    receipt_usernames: receipts.map(receipt => receipt.username),
    personal_story_state: 'receipt_recorded_only',
    npc_family_child_mutation: false,
    next_required_operations: nextLedger.next_required_operations,
  }, receiptPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_written: false,
    execution_ledger: nextLedger,
    receipts,
  };
}

async function resolveSeparationChildArrangement(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const childPayload = normalizeSeparationChildArrangementResolvePayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要记录孩子安排的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以记录孩子安排', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以记录孩子安排', 403);

  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['family_story_resolved', 'personal_story_receipts_written', 'child_arrangement_resolved'].includes(String(executionRequest.status || ''))) {
    throw createError('请先记录剧情拆分，再记录孩子安排', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (childPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['family_story_resolved', 'personal_story_receipts_written', 'child_arrangement_resolved'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (childPayload.execution_ledger_id && childPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.child_arrangement_idempotency_key === childPayload.idempotency_key || ledger.child_arrangement_resolved === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_resolved: ledger.child_arrangement_resolved === true,
      execution_ledger: ledger,
      child_arrangement: ledger.child_arrangement_resolution,
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (childPayload.plot_return_manifest_hash && childPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免孩子安排错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.family_story_resolved !== true || !ledger.family_story_resolution) throw createError('分居剧情拆分尚未记录，不能记录孩子安排', 409);
  if (ledger.family_story_resolution.child_arrangement_required !== true) {
    throw createError('当前分居剧情不需要孩子安排记录', 409);
  }

  const childCount = Math.max(0, Math.floor(Number(contract.family_state?.child_count) || (contract.family_state?.has_children === true ? 1 : 0)));
  if (contract.type !== 'marriage_home' || childCount <= 0) throw createError('只有有孩子的婚姻同居分居需要孩子安排记录', 409);
  const resolvedAt = nowSeconds();
  const childArrangement = {
    relation_type: contract.type,
    arrangement_choice: childPayload.arrangement_choice,
    arrangement_state: 'contract_child_arrangement_recorded',
    child_count: childCount,
    personal_family_save_write_required: true,
    children_private: true,
    privacy_boundary: '仅在共同契约记录孩子安排方案；孩子、家庭心愿和监护细节仍留在个人存档，后续需独立家庭存档 receipt 确认。',
    memo: childPayload.memo,
  };
  const nextRequiredOperations = (ledger.next_required_operations || [])
    .filter(operation => operation && operation !== 'resolve_child_arrangement');
  if (ledger.decorations_buildings_split !== true && !nextRequiredOperations.includes('split_decorations')) nextRequiredOperations.unshift('split_decorations');
  if (!nextRequiredOperations.includes('write_personal_family_receipts')) nextRequiredOperations.push('write_personal_family_receipts');
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'child_arrangement_resolved',
    child_arrangement_resolved: true,
    child_arrangement_idempotency_key: childPayload.idempotency_key,
    child_arrangement_resolved_at: resolvedAt,
    child_arrangement_resolved_by: member.username,
    child_arrangement_resolution: childArrangement,
    next_required_operations: nextRequiredOperations,
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'child_arrangement_resolved',
    child_arrangement_resolved: true,
    child_arrangement_resolved_at: resolvedAt,
    child_arrangement_resolved_by: member.username,
    child_arrangement_resolution: childArrangement,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      child_arrangement_resolved: true,
      child_arrangement_resolved_at: resolvedAt,
      child_arrangement_resolution: childArrangement,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      child_arrangement_resolved: true,
      child_arrangement_resolved_at: resolvedAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '分居孩子安排已记录在共同契约；个人家庭 / 孩子存档仍不由联机契约自动改写。',
    },
    deferred_operations: nextLedger.next_required_operations,
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_child_arrangement_resolved', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    arrangement_choice: childArrangement.arrangement_choice,
    child_count: childArrangement.child_count,
    children_private: true,
    personal_family_save_write_required: true,
    npc_family_child_mutation: false,
    next_required_operations: nextLedger.next_required_operations,
  }, childPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_resolved: false,
    execution_ledger: nextLedger,
    child_arrangement: childArrangement,
  };
}

async function writeSeparationPersonalFamilyReceipts(contractId, previewId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const receiptPayload = normalizeSeparationPersonalFamilyReceiptsPayload(payload);
  const normalizedContractId = sanitizeText(contractId, 80);
  const normalizedPreviewId = sanitizeText(previewId || payload.preview_id || payload.id, 80);
  if (!normalizedPreviewId) throw createError('请指定要写入个人家庭回执的分居预览');

  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === normalizedContractId);
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效或分居处理中的契约可以写入个人家庭回执', 409);

  const member = (contract.members || []).find(entry =>
    entry.status === 'accepted' && (
      normalizeUsernameKey(entry.username) === normalizeUsernameKey(actorUsername)
      || normalizeUsernameKey(entry.username_key) === normalizeUsernameKey(actorUsername)
    )
  );
  if (!member) throw createError('只有已接受契约成员可以写入个人家庭回执', 403);

  contract.separation_previews = Array.isArray(contract.separation_previews)
    ? contract.separation_previews.map(normalizeSeparationPreview)
    : [];
  contract.separation_execution_ledger = Array.isArray(contract.separation_execution_ledger)
    ? contract.separation_execution_ledger.map(normalizeSeparationExecutionLedgerEntry)
    : [];
  const previewIndex = contract.separation_previews.findIndex(entry => entry.id === normalizedPreviewId);
  if (previewIndex < 0) throw createError('分居预览不存在', 404);

  const preview = normalizeSeparationPreview(contract.separation_previews[previewIndex]);
  const executionRequest = preview.confirmation_state.execution_request || {};
  if (!['child_arrangement_resolved', 'personal_family_receipts_written'].includes(String(executionRequest.status || ''))) {
    throw createError('请先记录孩子安排，再写入个人家庭回执', 409);
  }
  const ledgerIndex = contract.separation_execution_ledger.findIndex(entry =>
    entry.id === (receiptPayload.execution_ledger_id || executionRequest.execution_ledger_id)
    || (entry.preview_id === normalizedPreviewId && ['child_arrangement_resolved', 'personal_family_receipts_written'].includes(entry.status))
  );
  if (ledgerIndex < 0) throw createError('分居返还执行记录不存在，请重新记录返还执行', 409);
  const ledger = normalizeSeparationExecutionLedgerEntry(contract.separation_execution_ledger[ledgerIndex]);
  if (receiptPayload.execution_ledger_id && receiptPayload.execution_ledger_id !== ledger.id) throw createError('分居返还执行记录不匹配，请刷新后重试', 409);
  if (ledger.personal_family_receipts_idempotency_key === receiptPayload.idempotency_key || ledger.personal_family_receipts_written === true) {
    return {
      contract: toPublicContract(contract),
      preview,
      idempotent: true,
      already_written: ledger.personal_family_receipts_written === true,
      execution_ledger: ledger,
      receipts: ledger.personal_family_receipts || [],
    };
  }

  const manifest = Array.isArray(preview.asset_return?.plot_return_manifest) ? preview.asset_return.plot_return_manifest : [];
  const expectedManifestHash = sanitizeText(preview.asset_return?.plot_return_manifest_hash, 100) || hashPlotReturnManifest(manifest);
  if (!expectedManifestHash || !/^[a-f0-9]{64}$/i.test(expectedManifestHash)) throw createError('分居来源田区清单缺少可校验 hash，请重新生成预览', 409);
  if (receiptPayload.plot_return_manifest_hash && receiptPayload.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居来源田区清单 hash 不匹配，请重新生成预览，避免个人家庭回执错账', 409);
  }
  if (ledger.plot_return_manifest_hash && ledger.plot_return_manifest_hash !== expectedManifestHash) {
    throw createError('分居返还执行记录与当前预览 hash 不一致，请人工复核', 409);
  }
  if (ledger.child_arrangement_resolved !== true || !ledger.child_arrangement_resolution) throw createError('分居孩子安排尚未记录，不能写入个人家庭回执', 409);
  if (ledger.child_arrangement_resolution.personal_family_save_write_required === false) {
    throw createError('当前孩子安排不需要写入个人家庭回执', 409);
  }

  const receipts = writePersonalFamilyReceiptsFromChildArrangement(contract, ledger, receiptPayload);
  if (receipts.length === 0) throw createError('没有可写入个人家庭回执的已接受成员', 409);
  const writtenAt = nowSeconds();
  const nextRequiredOperations = (ledger.next_required_operations || [])
    .filter(operation => operation && operation !== 'write_personal_family_receipts');
  if (ledger.decorations_buildings_split !== true && !nextRequiredOperations.includes('split_decorations')) nextRequiredOperations.unshift('split_decorations');
  const nextLedger = normalizeSeparationExecutionLedgerEntry({
    ...ledger,
    status: 'personal_family_receipts_written',
    personal_family_receipts_written: true,
    personal_family_receipts_idempotency_key: receiptPayload.idempotency_key,
    personal_family_receipts_written_at: writtenAt,
    personal_family_receipts_written_by: member.username,
    personal_family_receipts: receipts,
    next_required_operations: nextRequiredOperations,
  });
  const nextExecutionRequest = {
    ...executionRequest,
    status: 'personal_family_receipts_written',
    personal_family_receipts_written: true,
    personal_family_receipts_written_at: writtenAt,
    personal_family_receipts_written_by: member.username,
    personal_family_receipts: receipts,
    next_required_operations: nextLedger.next_required_operations,
  };
  const nextPreview = normalizeSeparationPreview({
    ...preview,
    asset_return: {
      ...preview.asset_return,
      personal_family_receipts_written: true,
      personal_family_receipts_written_at: writtenAt,
      personal_family_receipts: receipts,
    },
    confirmation_state: {
      ...preview.confirmation_state,
      execution_request: nextExecutionRequest,
      personal_family_receipts_written: true,
      personal_family_receipts_written_at: writtenAt,
      can_execute_now: false,
      execution_enabled: false,
      execution_policy: '分居个人家庭回执已写入各成员存档；孩子、家庭心愿、NPC 和资产状态仍不由联机契约自动改写。',
    },
    deferred_operations: nextLedger.next_required_operations,
  });

  contract.separation_execution_ledger[ledgerIndex] = nextLedger;
  contract.separation_previews[previewIndex] = nextPreview;
  appendAudit(contract, 'separation_personal_family_receipts_written', actor, {
    preview_id: nextPreview.id,
    execution_ledger_id: nextLedger.id,
    plot_return_manifest_hash: expectedManifestHash,
    receipt_count: receipts.length,
    receipt_usernames: receipts.map(receipt => receipt.username),
    child_count: nextLedger.child_arrangement_resolution?.child_count || 0,
    personal_family_state: 'receipt_recorded_only',
    children_private: true,
    npc_family_child_mutation: false,
    next_required_operations: nextLedger.next_required_operations,
  }, receiptPayload.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    preview: nextPreview,
    idempotent: false,
    already_written: false,
    execution_ledger: nextLedger,
    receipts,
  };
}

module.exports = {
  RELATION_TYPE_DEFS,
  listCohabitationContracts,
  getCohabitationSharedMap,
  getCohabitationSharedAnimals,
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
  waterCohabitationSharedFarmPlot,
  careCohabitationSharedFarmPlot,
  plantCohabitationSharedFarmPlot,
  fertilizeCohabitationSharedFarmPlot,
  harvestCohabitationSharedFarmPlot,
  feedCohabitationSharedAnimal,
  petCohabitationSharedAnimal,
  collectCohabitationSharedAnimalProduct,
  processCohabitationSharedWorkshopRecipe,
  depositCohabitationWarehouseItem,
  withdrawCohabitationWarehouseItem,
  createCohabitationWarehouseHighValueWithdrawalDraft,
  confirmCohabitationWarehouseHighValueWithdrawalDraft,
  executeCohabitationWarehouseHighValueWithdrawalDraft,
  rollbackCohabitationWarehouseHighValueWithdrawalDraft,
  recoverCohabitationWarehouseGovernance,
  sellCohabitationWarehouseItem,
  creditCohabitationOrderIncome,
  contributeCohabitationFund,
  spendCohabitationFund,
  createCohabitationFundLargeSpendDraft,
  confirmCohabitationFundLargeSpendDraft,
  executeCohabitationFundLargeSpendDraft,
  recordCohabitationFundHighRiskReceipt,
  applyCohabitationFamilyBuildingRealBuild,
  consumeCohabitationFamilyBuildingMaterials,
  rollbackCohabitationFamilyBuilding,
  refundCohabitationFamilyBuildingFund,
  restoreCohabitationFamilyBuildingMaterials,
  replayCohabitationFamilyBuildingCompensation,
  requestCohabitationFamilyBuildingRealDemolitionReview,
  rejectCohabitationFamilyBuildingRealDemolitionReview,
  approveCohabitationFamilyBuildingRealDemolitionReview,
  requestCohabitationFamilyBuildingRealDemolitionExecution,
  writeCohabitationFamilyBuildingRealDemolitionPersonalSave,
  previewCohabitationFamilyBuildingRealDemolitionMainState,
  verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping,
  guardCohabitationFamilyBuildingRealDemolitionMainStateMutation,
  executeCohabitationFamilyBuildingRealDemolitionMainStateMutation,
  bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets,
  executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutationAdapter,
  updateCohabitationPermissions,
  updateCohabitationFamilyRole,
  createCohabitationContract,
  acceptCohabitationContract,
  createSeparationPreview,
  confirmSeparationPreview,
  requestSeparationExecution,
  executeSeparationAssetReturn,
  writeSeparationPersonalFarmReturns,
  refundSeparationSharedFund,
  returnSeparationSharedWarehouse,
  splitSeparationDecorationsAndBuildings,
  resolveSeparationFamilyStory,
  writeSeparationPersonalStoryReceipts,
  resolveSeparationChildArrangement,
  writeSeparationPersonalFamilyReceipts,
};
