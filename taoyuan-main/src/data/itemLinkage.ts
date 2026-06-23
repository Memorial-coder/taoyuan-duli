import type { ItemLinkageDef, ItemLinkageUsageLine, LinkageSystemId } from '@/types'

export interface ItemLinkageUseTag {
  system: LinkageSystemId
  label: string
  panelKey: string | null
}

const SYSTEM_LABELS: Record<LinkageSystemId, string> = {
  farm: '农场',
  animal: '动物',
  cooking: '料理',
  processing: '工坊',
  quest: '订单',
  onlineOrder: '线上订单',
  festival: '节庆',
  familyWish: '家庭心愿',
  childTraining: '孩子训练',
  petFeed: '宠物点心',
  museum: '博物馆',
  decoration: '装饰',
  villageProject: '村庄项目',
  quarry: '采石场',
  mining: '矿洞',
  fishing: '钓鱼',
  fishPond: '鱼塘',
  breeding: '育种',
  guild: '公会',
  hanhai: '瀚海',
  regionMap: '行旅图',
  potential: '潜能',
  shop: '商店',
  npcFunction: 'NPC功能',
  equipment: '装备',
  trinket: '饰物',
  inventoryUse: '背包使用'
}

const LINKAGE_USE_TAG_LABELS: Record<LinkageSystemId, string> = {
  farm: '农场',
  animal: '动物',
  cooking: '料理',
  processing: '工坊',
  quest: '订单',
  onlineOrder: '线上订单',
  festival: '节庆',
  familyWish: '家庭',
  childTraining: '训练',
  petFeed: '宠物',
  museum: '博物馆',
  decoration: '装饰',
  villageProject: '村建',
  quarry: '采石场',
  mining: '矿洞',
  fishing: '钓鱼',
  fishPond: '鱼塘',
  breeding: '育种',
  guild: '公会',
  hanhai: '瀚海',
  regionMap: '远征',
  potential: '潜能',
  shop: '商店',
  npcFunction: 'NPC',
  equipment: '装备',
  trinket: '饰物',
  inventoryUse: '使用'
}

const LINKAGE_USE_TAG_PANEL_KEYS: Record<LinkageSystemId, string | null> = {
  farm: 'farm',
  animal: 'animal',
  cooking: 'cooking',
  processing: 'workshop',
  quest: 'quest',
  onlineOrder: 'online',
  festival: 'festival',
  familyWish: 'cottage',
  childTraining: 'cottage',
  petFeed: 'cottage',
  museum: 'museum',
  decoration: 'decoration',
  villageProject: 'village',
  quarry: 'quarry',
  mining: 'mining',
  fishing: 'fishing',
  fishPond: 'fishpond',
  breeding: 'breeding',
  guild: 'guild',
  hanhai: 'hanhai',
  regionMap: 'region-map',
  potential: 'potential',
  shop: 'shop',
  npcFunction: 'village',
  equipment: 'charinfo',
  trinket: 'charinfo',
  inventoryUse: 'inventory'
}

const ELITE_ELIXIR_IDS = [
  'ley_crystal_focus_elixir',
  'wind_core_guard_pill',
  'marsh_luminous_cleansing_elixir',
  'moon_pearl_calm_elixir',
  'jade_orchid_focus_elixir',
  'rare_lotus_guard_elixir',
  'jade_peach_spirit_elixir'
] as const

const ELITE_ELIXIR_USAGE: Record<typeof ELITE_ELIXIR_IDS[number], ItemLinkageUsageLine[]> = {
  ley_crystal_focus_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'regionMap', label: '远征准备', detail: '行旅图出发时可选择消耗，提升开局视野、发现和工具补给。' },
    { system: 'potential', label: '高阶准备', detail: '作为共同丹炉稀材回流单人潜能与探索准备。' }
  ],
  wind_core_guard_pill: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'mining', label: '矿洞防护', detail: '降低采矿体力消耗和受到伤害。' },
    { system: 'quarry', label: '采石场护脉', detail: '旧支道推进时可选择消耗，本段体力压力降低并减少遭遇伤害。' }
  ],
  marsh_luminous_cleansing_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'regionMap', label: '湿地远征', detail: '行旅图出发时可选择消耗，降低危险、污染和异常压力。' },
    { system: 'hanhai', label: '异常净息', detail: '作为后续瀚海/区域异常准备物登记。' }
  ],
  moon_pearl_calm_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用并立即恢复体力。' },
    { system: 'petFeed', label: '安抚协同', detail: '提高宠物安抚好感收益。' },
    { system: 'regionMap', label: '夜巡稳定', detail: '行旅图出发时可选择消耗，提升开局士气并降低危险。' }
  ],
  jade_orchid_focus_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'cooking', label: '协作专注', detail: '提高行动效率，适合料理/工坊/订单前准备。' },
    { system: 'quest', label: '订单评分', detail: '节会与订单准备前提供小幅表现加成。' }
  ],
  rare_lotus_guard_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'quarry', label: '长线守护', detail: '旧支道推进时可选择消耗，本段体力压力降低并大幅减少遭遇伤害。' },
    { system: 'petFeed', label: '照料安神', detail: '提高宠物安抚好感收益。' }
  ],
  jade_peach_spirit_elixir: [
    { system: 'inventoryUse', label: '背包丹药', detail: '可直接服用，接入当天炼丹 Buff 槽。' },
    { system: 'npcFunction', label: '关系社交', detail: '提高送礼倍率和 NPC 对话好感。' },
    { system: 'quest', label: '节会供品', detail: '提高节会奖励表现。' }
  ]
}

const ELITE_ELIXIR_REPEATABLE_SINKS: Record<typeof ELITE_ELIXIR_IDS[number], LinkageSystemId[]> = {
  ley_crystal_focus_elixir: ['inventoryUse', 'regionMap'],
  wind_core_guard_pill: ['inventoryUse', 'quarry'],
  marsh_luminous_cleansing_elixir: ['inventoryUse', 'regionMap'],
  moon_pearl_calm_elixir: ['inventoryUse', 'regionMap'],
  jade_orchid_focus_elixir: ['inventoryUse'],
  rare_lotus_guard_elixir: ['inventoryUse', 'quarry'],
  jade_peach_spirit_elixir: ['inventoryUse']
}

const getEliteElixirUseSystems = (itemId: typeof ELITE_ELIXIR_IDS[number]): LinkageSystemId[] =>
  [...new Set(ELITE_ELIXIR_USAGE[itemId].map(entry => entry.system))]

export const ITEM_LINKAGE_DEFS: ItemLinkageDef[] = [
  {
    itemId: 'paper',
    sourceSystems: ['processing', 'quest'],
    currentUseSystems: ['familyWish', 'childTraining'],
    plannedUseSystems: [],
    repeatableSinks: ['familyWish', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['refined_material', 'archive', 'family_wish', 'child_training', 'study'],
    status: 'weak',
    priority: 'P0',
    notes: ['文书材料；已接档案类家庭心愿和孩子学识训练，每次训练会真实扣除纸张。']
  },
  {
    itemId: 'food_rice_ball',
    sourceSystems: ['cooking', 'quest'],
    currentUseSystems: ['inventoryUse', 'quest', 'familyWish', 'childTraining'],
    plannedUseSystems: [],
    repeatableSinks: ['inventoryUse', 'quest', 'familyWish', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['food', 'home_cooking', 'child_training', 'body'],
    status: 'weak',
    priority: 'P0',
    notes: ['基础料理；已接家庭奖励、共同灶台和孩子体魄/社交训练消耗。']
  },
  {
    itemId: 'adventurer_ration',
    sourceSystems: ['guild'],
    currentUseSystems: ['inventoryUse', 'childTraining'],
    plannedUseSystems: ['regionMap'],
    repeatableSinks: ['inventoryUse', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['guild', 'ration', 'child_training', 'body'],
    status: 'weak',
    priority: 'P0',
    notes: ['公会补给；孩子体魄/社交训练会真实扣除，后续可继续接行旅图出发口粮。']
  },
  {
    itemId: 'fish_feed',
    sourceSystems: ['processing', 'shop'],
    currentUseSystems: ['fishPond', 'familyWish', 'childTraining', 'onlineOrder'],
    plannedUseSystems: [],
    repeatableSinks: ['fishPond', 'familyWish', 'childTraining', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['fish_processed', 'fishpond', 'family_wish', 'child_training', 'online_order', 'public_storage', 'nature'],
    status: 'weak',
    priority: 'P0',
    notes: ['鱼塘饲料；已接鱼塘、家庭心愿、孩子自然训练和线上公共鱼塘备料单真实扣料。']
  },
  {
    itemId: 'seed_cabbage',
    sourceSystems: ['shop', 'processing'],
    currentUseSystems: ['farm', 'childTraining'],
    plannedUseSystems: ['familyWish'],
    repeatableSinks: ['farm', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['seed', 'child_training', 'nature'],
    status: 'weak',
    priority: 'P1',
    notes: ['基础种子；孩子自然训练会真实扣除，避免早期种子只停留在种植入口。']
  },
  {
    itemId: 'cloth',
    sourceSystems: ['processing'],
    currentUseSystems: ['familyWish', 'childTraining'],
    plannedUseSystems: ['decoration'],
    repeatableSinks: ['familyWish', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['textile', 'family_wish', 'child_training', 'craft'],
    status: 'weak',
    priority: 'P0',
    notes: ['织物材料；已接赞助类家庭心愿和孩子手作训练真实扣料。']
  },
  {
    itemId: 'wood',
    sourceSystems: ['farm', 'processing'],
    currentUseSystems: ['processing', 'equipment', 'childTraining'],
    plannedUseSystems: ['familyWish'],
    repeatableSinks: ['processing', 'equipment', 'childTraining'],
    oneTimeSinks: [],
    demandTags: ['material', 'craft', 'child_training'],
    status: 'weak',
    priority: 'P1',
    notes: ['基础木材；孩子手作训练会真实扣除，后续还可继续接家庭换季与装饰需求。']
  },
  {
    itemId: 'mixed_seed_oil',
    sourceSystems: ['processing'],
    currentUseSystems: ['cooking', 'quest', 'familyWish', 'onlineOrder'],
    plannedUseSystems: [],
    repeatableSinks: ['cooking', 'quest', 'familyWish', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['oil', 'processed', 'home_cooking', 'festival_prep', 'weekly_order', 'online_order', 'public_storage'],
    status: 'weak',
    priority: 'P0',
    notes: ['隐藏榨油产物；已接料理、特殊订单、家庭心愿和线上公共灶间备油单真实消耗。']
  },
  {
    itemId: 'manor_edge_bundle',
    sourceSystems: ['onlineOrder'],
    currentUseSystems: ['onlineOrder', 'petFeed', 'familyWish'],
    plannedUseSystems: [],
    repeatableSinks: ['onlineOrder', 'petFeed', 'familyWish'],
    oneTimeSinks: [],
    demandTags: ['manor', 'weak_item_sink', 'public_storage', 'pet_feed', 'weekly_order', 'family_wish'],
    status: 'weak',
    priority: 'P0',
    notes: ['好友庄园来源；已接本地线上备料单、宠物点心和湖畔相伴家庭心愿。']
  },
  {
    itemId: 'rice_flour',
    sourceSystems: ['processing'],
    currentUseSystems: ['cooking', 'familyWish', 'festival', 'onlineOrder'],
    plannedUseSystems: [],
    repeatableSinks: ['cooking', 'familyWish', 'festival', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['flour', 'processed', 'family_wish', 'festival_prep', 'weekly_order', 'online_order', 'public_storage'],
    status: 'weak',
    priority: 'P0',
    notes: ['粉料加工品；已接料理、家庭心愿、节会备料和线上糕点粉料单真实消耗。']
  },
  {
    itemId: 'dried_crop_bundle',
    sourceSystems: ['processing'],
    currentUseSystems: ['inventoryUse', 'quest', 'festival', 'onlineOrder'],
    plannedUseSystems: ['familyWish'],
    repeatableSinks: ['inventoryUse', 'quest', 'festival', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['dried', 'processed', 'festival_prep', 'weekly_order', 'online_order', 'public_storage'],
    status: 'weak',
    priority: 'P0',
    notes: ['干货加工品；可直接食用，已接订单、节会备料和线上冬储田园干货单真实消耗。']
  },
  {
    itemId: 'dried_fruit_mix',
    sourceSystems: ['processing'],
    currentUseSystems: ['inventoryUse', 'onlineOrder'],
    plannedUseSystems: ['petFeed', 'familyWish', 'festival'],
    repeatableSinks: ['inventoryUse', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['dried', 'sweet', 'processed', 'pet_feed', 'family_wish', 'weekly_order', 'online_order', 'public_storage'],
    status: 'weak',
    priority: 'P0',
    notes: ['甜味干货；可直接食用，已接线上旅途果干补给单真实消耗，宠物/家庭/节会仍作为分组候选。']
  },
  {
    itemId: 'standard_bait',
    sourceSystems: ['processing', 'shop'],
    currentUseSystems: ['fishing', 'familyWish', 'onlineOrder'],
    plannedUseSystems: ['fishPond'],
    repeatableSinks: ['fishing', 'familyWish', 'onlineOrder'],
    oneTimeSinks: [],
    demandTags: ['feed', 'fishing', 'fishpond', 'family_wish', 'weekly_order', 'online_order', 'public_storage'],
    status: 'weak',
    priority: 'P0',
    notes: ['普通鱼饵；已接钓鱼、鱼塘相关家庭心愿和线上邻里鱼饵补给单真实消耗。']
  },
  ...ELITE_ELIXIR_IDS.map<ItemLinkageDef>(itemId => ({
    itemId,
    sourceSystems: ['onlineOrder', 'processing'],
    currentUseSystems: getEliteElixirUseSystems(itemId),
    plannedUseSystems: ['hanhai', 'quest'],
    repeatableSinks: ELITE_ELIXIR_REPEATABLE_SINKS[itemId],
    oneTimeSinks: [],
    demandTags: ['elite_elixir', 'shared_alchemy', 'expedition_supply', 'late_game_consumable'],
    status: 'weak',
    priority: 'P0',
    notes: ['共同丹炉产物；已接背包使用，风蚀/稀莲接采石场旧支道准备物，晶辉/沼光/月珠接行旅图出发丹药。']
  }))
]

export const ITEM_LINKAGE_USAGE_LINES: Record<string, ItemLinkageUsageLine[]> = {
  mixed_seed_oil: [
    { system: 'cooking', label: '料理原料', detail: '可制作杂油拌面和节庆油糕。' },
    { system: 'quest', label: '特殊订单', detail: '可被“家常油料补给”周期订单消耗。' },
    { system: 'familyWish', label: '家庭心愿', detail: '庭前共食和集市共宴等心愿会真实扣除杂籽油。' },
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为公共灶间备油单。' }
  ],
  manor_edge_bundle: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页作为弱用途物品轮换备料单真实扣除。' },
    { system: 'petFeed', label: '宠物点心', detail: '可作为庄园边角小食喂给猫、田犬或灵宠。' },
    { system: 'familyWish', label: '家庭心愿', detail: '湖畔相伴等小屋心愿会真实扣除庄园边角菜包。' }
  ],
  rice_flour: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为邻里糕点粉料单。' },
    { system: 'familyWish', label: '家庭心愿', detail: '集市共宴等心愿会真实扣除米粉。' },
    { system: 'festival', label: '节会备料', detail: '节庆摊位秋宴粉料供给会消耗米粉。' }
  ],
  dried_crop_bundle: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为冬储田园干货单。' },
    { system: 'inventoryUse', label: '背包食物', detail: '可直接食用恢复体力和生命。' },
    { system: 'festival', label: '节会备料', detail: '冬集炉边干货供给会消耗田园干货包。' },
    { system: 'quest', label: '周期订单', detail: '干货分组可进入特殊订单需求池。' }
  ],
  dried_fruit_mix: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为旅途果干补给单。' },
    { system: 'inventoryUse', label: '背包食物', detail: '可直接食用恢复体力和生命。' },
    { system: 'quest', label: '周期订单', detail: '干货分组可进入特殊订单候选池。' }
  ],
  paper: [
    { system: 'familyWish', label: '家庭心愿', detail: '档案类家庭心愿会真实扣除纸张。' },
    { system: 'childTraining', label: '孩子训练', detail: '学识训练会消耗纸张作为抄写、记录和博物馆复写笔记。' }
  ],
  food_rice_ball: [
    { system: 'inventoryUse', label: '背包食物', detail: '可直接食用恢复体力。' },
    { system: 'childTraining', label: '孩子训练', detail: '体魄/社交训练会消耗饭团作为课间补给。' }
  ],
  adventurer_ration: [
    { system: 'inventoryUse', label: '背包食物', detail: '可直接食用恢复体力和生命。' },
    { system: 'childTraining', label: '孩子训练', detail: '体魄/社交训练会消耗冒险口粮作为耐力课程补给。' }
  ],
  fish_feed: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为公共鱼塘饲料单。' },
    { system: 'fishPond', label: '鱼塘维护', detail: '鱼塘照料和部分家庭心愿会真实扣除鱼饲料。' },
    { system: 'familyWish', label: '家庭心愿', detail: '赏月鱼塘等小屋心愿会消耗鱼饲料。' },
    { system: 'childTraining', label: '孩子训练', detail: '自然训练会消耗鱼饲料和种子，承接鱼塘与农事观察。' }
  ],
  standard_bait: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页轮换为邻里鱼饵补给单。' },
    { system: 'fishing', label: '钓鱼', detail: '可装配为普通鱼饵，降低钓鱼压力。' },
    { system: 'familyWish', label: '家庭心愿', detail: '湖畔相伴和赏月鱼塘等心愿会消耗普通鱼饵。' }
  ],
  seed_cabbage: [
    { system: 'farm', label: '农场种植', detail: '可种在农田中获得白菜。' },
    { system: 'childTraining', label: '孩子训练', detail: '自然训练会消耗基础种子作为观察与育苗练习。' }
  ],
  cloth: [
    { system: 'familyWish', label: '家庭心愿', detail: '馆务赞助等家庭心愿会真实扣除布匹。' },
    { system: 'childTraining', label: '孩子训练', detail: '手作训练会消耗布匹作为缝补和小制作材料。' }
  ],
  wood: [
    { system: 'processing', label: '工坊材料', detail: '大量机器、箱子和加工建筑会消耗木材。' },
    { system: 'childTraining', label: '孩子训练', detail: '手作训练会消耗木材作为基础练习材料。' }
  ],
  ...ELITE_ELIXIR_USAGE
}

export const getItemLinkageDef = (itemId: string): ItemLinkageDef | undefined =>
  ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)

export const getItemLinkageUsageLines = (itemId: string): string[] =>
  (ITEM_LINKAGE_USAGE_LINES[itemId] ?? []).map(entry => `${entry.label}：${entry.detail}`)

export const getItemLinkageUseTags = (itemId: string, limit = 3): ItemLinkageUseTag[] => {
  const usageSystems = ITEM_LINKAGE_USAGE_LINES[itemId]?.map(entry => entry.system) ?? []
  const systems = usageSystems.length > 0 ? usageSystems : getItemLinkageDef(itemId)?.currentUseSystems ?? []
  const uniqueSystems = [...new Set(systems)]
  return uniqueSystems.map(system => ({
    system,
    label: LINKAGE_USE_TAG_LABELS[system],
    panelKey: LINKAGE_USE_TAG_PANEL_KEYS[system]
  })).slice(0, limit)
}

export const getItemLinkageUseLabels = (itemId: string, limit = 3): string[] => {
  const labels = getItemLinkageUseTags(itemId, limit).map(entry => entry.label)
  if (labels.length > 0) return labels
  const def = getItemLinkageDef(itemId)
  return [...new Set(def?.currentUseSystems.map(system => LINKAGE_USE_TAG_LABELS[system]) ?? [])].slice(0, limit)
}

export const getLinkageSystemLabel = (system: LinkageSystemId): string => SYSTEM_LABELS[system] ?? system
