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
    itemId: 'mixed_seed_oil',
    sourceSystems: ['processing'],
    currentUseSystems: ['cooking', 'quest', 'familyWish'],
    plannedUseSystems: ['onlineOrder'],
    repeatableSinks: ['cooking', 'quest', 'familyWish'],
    oneTimeSinks: [],
    demandTags: ['oil', 'processed', 'home_cooking', 'festival_prep', 'weekly_order'],
    status: 'weak',
    priority: 'P0',
    notes: ['隐藏榨油产物；已接料理、特殊订单和家庭心愿真实消耗，线上订单留作后续扩展。']
  },
  {
    itemId: 'manor_edge_bundle',
    sourceSystems: ['onlineOrder'],
    currentUseSystems: ['onlineOrder', 'petFeed'],
    plannedUseSystems: ['familyWish'],
    repeatableSinks: ['onlineOrder', 'petFeed'],
    oneTimeSinks: [],
    demandTags: ['manor', 'weak_item_sink', 'public_storage', 'pet_feed', 'weekly_order'],
    status: 'weak',
    priority: 'P0',
    notes: ['好友庄园来源；第一批接本地线上备料单和宠物点心。']
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
    { system: 'familyWish', label: '家庭心愿', detail: '庭前共食和集市共宴等心愿会真实扣除杂籽油。' }
  ],
  manor_edge_bundle: [
    { system: 'onlineOrder', label: '线上备料', detail: '可在在线委托页提交邻里边角菜包备料单。' },
    { system: 'petFeed', label: '宠物点心', detail: '可作为庄园边角小食喂给猫、田犬或灵宠。' },
    { system: 'familyWish', label: '家庭心愿', detail: '已登记为小屋换季/节前准备候选。' }
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
