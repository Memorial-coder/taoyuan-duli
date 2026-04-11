import type { EconomyBaselineAuditConfig, ChestTier, Season } from '@/types'

export type ShopCatalogPool = 'basic' | 'weekly' | 'seasonal' | 'premium'

export type ShopCatalogEffect =
  | { type: 'unlock_decoration' }
  | { type: 'expand_inventory_extra'; amount: number }
  | { type: 'expand_warehouse'; amount: number }
  | { type: 'unlock_greenhouse' }
  | { type: 'grant_chest'; tier: ChestTier; label?: string }
  | { type: 'add_items'; items: { itemId: string; quantity: number }[] }

export interface ShopCatalogOfferDef {
  id: string
  shopId: 'wanwupu'
  pool: ShopCatalogPool
  name: string
  description: string
  price: number
  onceOnly?: boolean
  unlockDiscoveryCount?: number
  seasonLimits?: Season[]
  tags?: string[]
  recommendationKey?: string
  recommendationPriority?: number
  recommendationReasonTemplate?: string
  weeklySpotlightWeight?: number
  uiBadge?: string
  effect: ShopCatalogEffect
}

const BASIC_OFFERS: ShopCatalogOfferDef[] = [
  { id: 'decor_bamboo_screen', shopId: 'wanwupu', pool: 'basic', name: '竹影屏风', description: '典雅的竹制屏风，适合收藏陈设。', price: 880, onceOnly: true, tags: ['家具', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'decor_tea_table', shopId: 'wanwupu', pool: 'basic', name: '清茶小案', description: '一张适合摆茶具的小案几。', price: 760, onceOnly: true, tags: ['家具', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'decor_clay_vase', shopId: 'wanwupu', pool: 'basic', name: '素陶花瓶', description: '朴素沉静的陶瓶，适合摆在屋内。', price: 520, onceOnly: true, tags: ['装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'decor_stone_lantern', shopId: 'wanwupu', pool: 'basic', name: '庭院石灯', description: '适合院子收藏的石灯摆件。', price: 1280, onceOnly: true, tags: ['院子摆件'], effect: { type: 'unlock_decoration' } },
  { id: 'func_silk_satchel', shopId: 'wanwupu', pool: 'basic', name: '丝绸行囊', description: '扩充背包额外容量 +2。', price: 4200, onceOnly: true, tags: ['功能商品'], recommendationKey: 'inventory', recommendationPriority: 2, recommendationReasonTemplate: '适合需要整理背包与稳定经营的阶段：{context}', uiBadge: '容量', effect: { type: 'expand_inventory_extra', amount: 2 } },
  {
    id: 'func_builder_pack', shopId: 'wanwupu', pool: 'basic', name: '匠作材料包', description: '一套常用的建造材料。', price: 2400, tags: ['功能商品', '材料包'], recommendationKey: 'builder_pack', recommendationPriority: 2, recommendationReasonTemplate: '适合补齐建造与加工材料：{context}', uiBadge: '材料包',
    effect: { type: 'add_items', items: [{ itemId: 'wood', quantity: 80 }, { itemId: 'charcoal', quantity: 20 }] }
  },
  {
    id: 'func_angler_pack', shopId: 'wanwupu', pool: 'basic', name: '渔具补给包', description: '适合中期钓鱼准备的补给。', price: 3200, tags: ['功能商品', '渔具'], recommendationKey: 'angler_pack', recommendationPriority: 2, recommendationReasonTemplate: '适合外出钓鱼与鱼塘筹备：{context}', uiBadge: '补给',
    effect: { type: 'add_items', items: [{ itemId: 'crab_pot', quantity: 1 }, { itemId: 'standard_bait', quantity: 15 }] }
  },
  {
    id: 'func_ranch_pack', shopId: 'wanwupu', pool: 'basic', name: '牧场照料包', description: '给牲畜与鱼塘准备的照料物资。', price: 2600, tags: ['功能商品', '牧场'],
    effect: { type: 'add_items', items: [{ itemId: 'animal_medicine', quantity: 2 }, { itemId: 'premium_feed', quantity: 4 }, { itemId: 'hay', quantity: 30 }] }
  },
  {
    id: 'func_field_irrigation_pack', shopId: 'wanwupu', pool: 'basic', name: '田作灌溉包', description: '包含可直接摆放的喷灌器与基础肥料，适合快速扩田。', price: 4800, tags: ['功能商品', '灌溉'],
    effect: { type: 'add_items', items: [{ itemId: 'bamboo_sprinkler', quantity: 1 }, { itemId: 'basic_fertilizer', quantity: 8 }] }
  },
  {
    id: 'func_resin_tool_pack', shopId: 'wanwupu', pool: 'basic', name: '林场采脂包', description: '适合建立树脂与林产线的工具包。', price: 3600, tags: ['功能商品', '采集'],
    effect: { type: 'add_items', items: [{ itemId: 'tapper', quantity: 2 }, { itemId: 'wood', quantity: 30 }] }
  }
]

const WEEKLY_OFFERS: ShopCatalogOfferDef[] = [
  { id: 'weekly_scholar_shelf', shopId: 'wanwupu', pool: 'weekly', name: '书香高架', description: '带有书卷气的高架家具。', price: 1680, onceOnly: true, tags: ['每周精选', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'weekly_festival_lantern', shopId: 'wanwupu', pool: 'weekly', name: '彩绸灯笼', description: '节庆氛围十足的彩绸灯笼。', price: 1180, onceOnly: true, tags: ['每周精选', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'weekly_travel_trunk', shopId: 'wanwupu', pool: 'weekly', name: '旅行大木箱', description: '赠送一个额外金箱，方便中期整理仓储。', price: 6800, tags: ['每周精选', '功能商品'], recommendationKey: 'travel_trunk', recommendationPriority: 3, recommendationReasonTemplate: '适合整理仓储与中期备货：{context}', weeklySpotlightWeight: 6, uiBadge: '周更惊喜', effect: { type: 'grant_chest', tier: 'gold', label: '旅行木箱' } },
  { id: 'weekly_rain_kit', shopId: 'wanwupu', pool: 'weekly', name: '祈雨仪式包', description: '内含两枚雨图腾，适合集中经营。', price: 5400, tags: ['每周精选', '功能商品'], recommendationKey: 'rain_kit', recommendationPriority: 2, recommendationReasonTemplate: '适合集中经营与天气规划：{context}', weeklySpotlightWeight: 4, uiBadge: '精选', effect: { type: 'add_items', items: [{ itemId: 'rain_totem', quantity: 2 }] } },
  { id: 'weekly_warehouse_deed', shopId: 'wanwupu', pool: 'weekly', name: '仓契扩建文书', description: '仓库箱位上限 +1。', price: 8800, tags: ['每周精选', '功能商品'], recommendationKey: 'warehouse_expand', recommendationPriority: 3, recommendationReasonTemplate: '适合扩充仓储与长期囤货：{context}', weeklySpotlightWeight: 7, uiBadge: '扩建', effect: { type: 'expand_warehouse', amount: 1 } },
  { id: 'weekly_apothecary_box', shopId: 'wanwupu', pool: 'weekly', name: '百草收纳盒', description: '适合日常经营的药材补给。', price: 1800, unlockDiscoveryCount: 20, tags: ['每周精选', '功能商品'], recommendationKey: 'apothecary_box', recommendationPriority: 1, recommendationReasonTemplate: '适合日常药材补给与稳健经营：{context}', weeklySpotlightWeight: 3, uiBadge: '补给', effect: { type: 'add_items', items: [{ itemId: 'herb', quantity: 6 }, { itemId: 'ginseng', quantity: 1 }] } },
  { id: 'weekly_irrigation_case', shopId: 'wanwupu', pool: 'weekly', name: '匠心灌溉箱', description: '包含铜制喷灌器与高级速生肥，适合中后期冲收益。', price: 9600, unlockDiscoveryCount: 40, tags: ['每周精选', '功能商品', '灌溉'], recommendationKey: 'irrigation_case', recommendationPriority: 4, recommendationReasonTemplate: '适合冲刺耕作收益与扩田效率：{context}', weeklySpotlightWeight: 8, uiBadge: '灌溉', effect: { type: 'add_items', items: [{ itemId: 'copper_sprinkler', quantity: 1 }, { itemId: 'deluxe_speed_gro', quantity: 6 }] } },
  { id: 'weekly_pond_care_pack', shopId: 'wanwupu', pool: 'weekly', name: '鱼塘养护包', description: '鱼塘与蟹笼经营常用补给。', price: 3200, tags: ['每周精选', '功能商品', '鱼塘'], recommendationKey: 'pond_care', recommendationPriority: 3, recommendationReasonTemplate: '适合鱼塘养护与水产筹备：{context}', weeklySpotlightWeight: 7, uiBadge: '鱼塘', effect: { type: 'add_items', items: [{ itemId: 'fish_feed', quantity: 20 }, { itemId: 'water_purifier', quantity: 4 }] } },
  { id: 'weekly_mining_supply', shopId: 'wanwupu', pool: 'weekly', name: '矿工补给箱', description: '深入矿洞前备好的物资包。', price: 4800, tags: ['每周精选', '功能商品', '矿洞'], recommendationKey: 'mining_supply', recommendationPriority: 3, recommendationReasonTemplate: '适合矿洞推进与补给准备：{context}', weeklySpotlightWeight: 8, uiBadge: '矿洞', effect: { type: 'add_items', items: [{ itemId: 'stone', quantity: 60 }, { itemId: 'copper_bar', quantity: 5 }, { itemId: 'iron_bar', quantity: 3 }] } },
  { id: 'weekly_tavern_gift', shopId: 'wanwupu', pool: 'weekly', name: '酒馆礼品篮', description: '来自醉桃源酒馆的精选礼品组合。', price: 2200, tags: ['每周精选', '功能商品'], recommendationKey: 'tavern_gift', recommendationPriority: 1, recommendationReasonTemplate: '适合外出前补给与轻度经营准备：{context}', weeklySpotlightWeight: 2, uiBadge: '轻补给', effect: { type: 'add_items', items: [{ itemId: 'tavern_plum_wine', quantity: 2 }, { itemId: 'tavern_braised_pork', quantity: 1 }] } },
  { id: 'weekly_inventory_bag', shopId: 'wanwupu', pool: 'weekly', name: '竹编行囊', description: '扩充背包额外容量 +1。', price: 2400, onceOnly: false, unlockDiscoveryCount: 10, tags: ['每周精选', '功能商品'], recommendationKey: 'inventory_bag', recommendationPriority: 4, recommendationReasonTemplate: '适合中前期扩容与频繁外出：{context}', weeklySpotlightWeight: 9, uiBadge: '容量', effect: { type: 'expand_inventory_extra', amount: 1 } },
  { id: 'weekly_chest_deed', shopId: 'wanwupu', pool: 'weekly', name: '仓契小文书', description: '仓库箱位上限 +1，随时入手。', price: 7200, tags: ['每周精选', '功能商品'], recommendationKey: 'chest_deed', recommendationPriority: 2, recommendationReasonTemplate: '适合扩仓与整理物资：{context}', weeklySpotlightWeight: 5, uiBadge: '仓储', effect: { type: 'expand_warehouse', amount: 1 } }
]

const SEASONAL_OFFERS: ShopCatalogOfferDef[] = [
  { id: 'spring_blossom_arch', shopId: 'wanwupu', pool: 'seasonal', name: '花朝拱门', description: '春季限定花饰拱门。', price: 1880, onceOnly: true, seasonLimits: ['spring'], tags: ['春季限定', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'spring_willow_mat', shopId: 'wanwupu', pool: 'seasonal', name: '柳纹地席', description: '带着春天气息的柳纹地席。', price: 920, onceOnly: true, seasonLimits: ['spring'], tags: ['春季限定', '外观'], effect: { type: 'unlock_decoration' } },
  { id: 'spring_peach_scroll', shopId: 'wanwupu', pool: 'seasonal', name: '桃花挂轴', description: '轻柔雅致的桃花挂轴。', price: 960, onceOnly: true, seasonLimits: ['spring'], tags: ['春季限定', '外观'], effect: { type: 'unlock_decoration' } },
  { id: 'summer_lotus_lamp', shopId: 'wanwupu', pool: 'seasonal', name: '荷灯摆台', description: '夏夜荷灯造型摆台。', price: 1180, onceOnly: true, seasonLimits: ['summer'], tags: ['夏季限定', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'summer_cool_bench', shopId: 'wanwupu', pool: 'seasonal', name: '纳凉石凳', description: '适合院子纳凉的石凳组合。', price: 1440, onceOnly: true, seasonLimits: ['summer'], tags: ['夏季限定', '院子摆件'], effect: { type: 'unlock_decoration' } },
  { id: 'summer_bamboo_blind', shopId: 'wanwupu', pool: 'seasonal', name: '青竹帘影', description: '夏日风格的竹帘收藏品。', price: 980, onceOnly: true, seasonLimits: ['summer'], tags: ['夏季限定', '外观'], effect: { type: 'unlock_decoration' } },
  { id: 'autumn_maple_screen', shopId: 'wanwupu', pool: 'seasonal', name: '枫纹屏风', description: '秋意浓郁的枫纹屏风。', price: 1680, onceOnly: true, seasonLimits: ['autumn'], tags: ['秋季限定', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'autumn_harvest_banner', shopId: 'wanwupu', pool: 'seasonal', name: '丰收旗幡', description: '庆贺秋收的旗幡摆件。', price: 1260, onceOnly: true, seasonLimits: ['autumn'], tags: ['秋季限定', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'autumn_moon_set', shopId: 'wanwupu', pool: 'seasonal', name: '望月案设', description: '适合中秋风格收藏的案设。', price: 1760, onceOnly: true, seasonLimits: ['autumn'], tags: ['秋季限定', '外观'], effect: { type: 'unlock_decoration' } },
  { id: 'winter_brazier', shopId: 'wanwupu', pool: 'seasonal', name: '暖炭火盆', description: '冬日限定火盆摆件。', price: 1580, onceOnly: true, seasonLimits: ['winter'], tags: ['冬季限定', '装饰'], effect: { type: 'unlock_decoration' } },
  { id: 'winter_plum_frame', shopId: 'wanwupu', pool: 'seasonal', name: '寒梅窗框', description: '点缀冬景的寒梅窗框。', price: 980, onceOnly: true, seasonLimits: ['winter'], tags: ['冬季限定', '外观'], effect: { type: 'unlock_decoration' } },
  { id: 'winter_incense_stand', shopId: 'wanwupu', pool: 'seasonal', name: '梅雪香座', description: '带有冬日氛围的香座摆件。', price: 1120, onceOnly: true, seasonLimits: ['winter'], tags: ['冬季限定', '外观'], effect: { type: 'unlock_decoration' } },
  // 季节限定功能包
  {
    id: 'spring_seed_bundle',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '春耕种子礼包',
    description: '春季限定：含茶苗、水蜜桃、蚕豆种子各5份。',
    price: 720,
    seasonLimits: ['spring'],
    tags: ['春季限定', '功能商品'],
    effect: {
      type: 'add_items',
      items: [
        { itemId: 'seed_tea', quantity: 5 },
        { itemId: 'seed_peach', quantity: 5 },
        { itemId: 'seed_broad_bean', quantity: 5 }
      ]
    }
  },
  { id: 'summer_fishing_pack', shopId: 'wanwupu', pool: 'seasonal', name: '夏钓补给包', description: '夏季限定：含高级鱼饵与魔法鱼饵各一批。', price: 2800, seasonLimits: ['summer'], tags: ['夏季限定', '功能商品', '渔具'], effect: { type: 'add_items', items: [{ itemId: 'wild_bait', quantity: 10 }, { itemId: 'magic_bait', quantity: 3 }] } },
  { id: 'autumn_harvest_pack', shopId: 'wanwupu', pool: 'seasonal', name: '秋收丰收包', description: '秋季限定：含速生肥与保质土壤，助力最后一波收成。', price: 3200, seasonLimits: ['autumn'], tags: ['秋季限定', '功能商品'], effect: { type: 'add_items', items: [{ itemId: 'deluxe_speed_gro', quantity: 8 }, { itemId: 'quality_retaining_soil', quantity: 8 }] } },
  { id: 'winter_warming_pack', shopId: 'wanwupu', pool: 'seasonal', name: '冬藏备用包', description: '冬季限定：含木炭与精饲料，安稳度过冬天。', price: 2400, seasonLimits: ['winter'], tags: ['冬季限定', '功能商品'], effect: { type: 'add_items', items: [{ itemId: 'charcoal', quantity: 30 }, { itemId: 'premium_feed', quantity: 10 }] } }
]

const PREMIUM_OFFERS: ShopCatalogOfferDef[] = [
  { id: 'premium_grand_satchel', shopId: 'wanwupu', pool: 'premium', name: '锦纹大行囊', description: '背包额外容量 +4，适合作为长期投资。', price: 18000, onceOnly: true, tags: ['高价长期商品'], effect: { type: 'expand_inventory_extra', amount: 4 } },
  { id: 'premium_greenhouse_permit', shopId: 'wanwupu', pool: 'premium', name: '温室特许状', description: '直接解锁温室，无需再提交材料。', price: 48000, onceOnly: true, unlockDiscoveryCount: 80, tags: ['高价长期商品', '稀有建筑'], effect: { type: 'unlock_greenhouse' } },
  { id: 'premium_void_contract', shopId: 'wanwupu', pool: 'premium', name: '虚空箱契约', description: '额外获得一个虚空箱，用于高级仓储管理。', price: 26000, tags: ['高价长期商品', '特殊箱子'], effect: { type: 'grant_chest', tier: 'void', label: '虚空箱' } },
  { id: 'premium_warehouse_charter', shopId: 'wanwupu', pool: 'premium', name: '府库扩建札记', description: '仓库箱位上限 +2，适合大规模经营。', price: 22000, tags: ['高价长期商品'], effect: { type: 'expand_warehouse', amount: 2 } },
  { id: 'premium_master_irrigation_set', shopId: 'wanwupu', pool: 'premium', name: '金衡灌溉套组', description: '一组金制喷灌器，适合作为高价长期经营投资。', price: 36000, tags: ['高价长期商品', '自动化'], effect: { type: 'add_items', items: [{ itemId: 'gold_sprinkler', quantity: 2 }, { itemId: 'quality_retaining_soil', quantity: 8 }] } },
  { id: 'premium_resin_workshop', shopId: 'wanwupu', pool: 'premium', name: '林业采脂工坊', description: '直接建立一套树脂采集线。', price: 24000, tags: ['高价长期商品', '自动化'], effect: { type: 'add_items', items: [{ itemId: 'tapper', quantity: 4 }, { itemId: 'camphor_seed', quantity: 4 }] } },
  { id: 'premium_golden_frame', shopId: 'wanwupu', pool: 'premium', name: '金鲤头像框', description: '象征财富与收获的高价收藏外观。', price: 12800, onceOnly: true, tags: ['高价长期商品', '头像框'], effect: { type: 'unlock_decoration' } },
  { id: 'premium_ranch_starter', shopId: 'wanwupu', pool: 'premium', name: '牧场启动套组', description: '一次性配齐牧场中期所需物资。', price: 28000, tags: ['高价长期商品', '牧场'], effect: { type: 'add_items', items: [{ itemId: 'premium_feed', quantity: 20 }, { itemId: 'nourishing_feed', quantity: 10 }, { itemId: 'animal_medicine', quantity: 5 }, { itemId: 'hay', quantity: 60 }] } },
  { id: 'premium_angler_elite', shopId: 'wanwupu', pool: 'premium', name: '垂钓大师礼盒', description: '高端钓鱼装备一次配齐，含魔法鱼饵与豪华鱼饵。', price: 32000, unlockDiscoveryCount: 60, tags: ['高价长期商品', '渔具'], effect: { type: 'add_items', items: [{ itemId: 'magic_bait', quantity: 10 }, { itemId: 'deluxe_bait', quantity: 5 }, { itemId: 'targeted_bait', quantity: 3 }] } },
  { id: 'premium_warehouse_expansion_xl', shopId: 'wanwupu', pool: 'premium', name: '大府库扩建契约', description: '仓库箱位上限 +3，适合后期大仓储布局。', price: 38000, tags: ['高价长期商品'], effect: { type: 'expand_warehouse', amount: 3 } },
  { id: 'premium_inventory_xl', shopId: 'wanwupu', pool: 'premium', name: '御制宝囊', description: '背包额外容量 +6，极限扩充携带上限。', price: 42000, onceOnly: true, tags: ['高价长期商品'], effect: { type: 'expand_inventory_extra', amount: 6 } }
]

export const SHOP_CATALOG_LUXURY_BASELINE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'shop_catalog_luxury_expansion',
  workstreamId: 'WS03_T021',
  label: '商店目录与豪华消费池扩容基线审计',
  summary: '围绕豪华许可证、仓储服务、远行补给、节庆礼盒、展示型家具与功能型券包建立统一口径，确保后续扩容先观测购买转化、重复消费与沉没效率，再逐步放量。',
  focusAreas: ['豪华许可与仓储服务', '周精选与节庆礼盒', '展示型家具与收藏消费', '功能型券包与远行补给'],
  coreMetrics: [
    {
      id: 'luxury_offer_purchase_rate',
      label: '豪华商品购买率',
      description: '衡量进入豪华目录后，玩家是否愿意为高价长期商品付费。',
      formula: 'luxuryOfferBuyersLast14Days / max(1, luxuryOfferViewersLast14Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.premiumCatalogOffers', 'useShopStore.ownedCatalogOfferIds', 'usePlayerStore.money'],
      thresholds: { watch: 0.18, warning: 0.12, critical: 0.08 },
      anomalyRule: '若样本玩家少于 20，则与近 4 周均值合并观察，并备注为低样本。'
    },
    {
      id: 'weekly_spotlight_conversion_rate',
      label: '周精选转化率',
      description: '衡量每周精选是否成功把浏览兴趣转成实际消费。',
      formula: 'weeklySpotlightPurchasesLast28Days / max(1, weeklySpotlightRefreshesLast28Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.weeklyCatalogOffers', 'useShopStore.weeklySurpriseOffer', 'useGameStore.day'],
      thresholds: { watch: 0.3, warning: 0.22, critical: 0.15 },
      anomalyRule: '若节庆周导致精选数量异常提升，则按单次刷新归一化，不直接与普通周横比。'
    },
    {
      id: 'luxury_repeat_purchase_rate',
      label: '重复购买率',
      description: '衡量功能型券包、仓储扩建和远行补给是否形成可持续复购。',
      formula: 'repeatLuxuryPurchasesLast28Days / max(1, luxuryPurchasersLast28Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.weeklyCatalogOffers', 'useShopStore.premiumCatalogOffers', 'useWarehouseStore.maxChests'],
      thresholds: { watch: 0.24, warning: 0.18, critical: 0.12 },
      anomalyRule: '一次性商品占比超过 70% 的周次，需剔除 onceOnly 商品后再计算复购。'
    },
    {
      id: 'functional_sink_absorption_rate',
      label: '功能道具沉没率',
      description: '衡量功能型消费是否真实吸收后期铜钱，而不是被一次性买断后失去价值。',
      formula: 'functionalLuxurySpendLast14Days / max(1, lateSegmentDisposableMoneyLast14Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.recommendedCatalogOffers', 'usePlayerStore.getEconomyOverview', 'useInventoryStore.items'],
      thresholds: { watch: 0.12, warning: 0.08, critical: 0.05 },
      anomalyRule: '若玩家刚进入后期分层 7 天内，则允许短期偏低，但需同步观察仓储与温室等长期投资是否被解锁。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'shop_sink_share_guardrail',
      label: '商店 sink 占总支出比',
      description: '避免豪华消费池过度吞噬其他系统支出，制造“只能去商店花钱”的错觉。',
      formula: 'shopLuxurySpendLast14Days / max(1, totalSinkSpendLast14Days)',
      direction: 'target_range',
      dataSources: ['useShopStore.purchaseCatalogOffer', 'usePlayerStore.getEconomyOverview', 'economyTelemetry.lifetimeSinkSpend'],
      thresholds: { targetMin: 0.18, targetMax: 0.42 },
      anomalyRule: '高于上限时优先补充非商店 sink 内容，低于下限时优先检查推荐与入口曝光，而不是立即提价。'
    },
    {
      id: 'luxury_affordability_guardrail',
      label: '豪华商品可负担周数',
      description: '避免高价目录脱离当前市场和商店节奏，造成纯氪金错觉。',
      formula: 'medianLuxuryOfferPrice / max(1, lateSegmentRecent7DayNetIncome)',
      direction: 'higher_is_worse',
      dataSources: ['useShopStore.premiumCatalogOffers', 'useShopStore.weeklyCatalogOffers', 'useShopStore.shippingHistory'],
      thresholds: { watch: 2.8, warning: 3.6, critical: 4.5 },
      anomalyRule: '若主题周提供额外现金流奖励，则单独记录活动周口径，避免掩盖平时的真实负担。'
    }
  ],
  playerSegments: [
    {
      id: 'weekly_value_seeker',
      label: '周精选捡漏型玩家',
      description: '现金流稳定但更关注每周精选和折扣，优先测试补给包与节庆礼盒。',
      disposableMoneyMin: 12000,
      inflationPressureMin: 6,
      recommendedFocus: '先投放每周精选、轻豪华礼包和可复购补给，验证价格敏感度。'
    },
    {
      id: 'luxury_builder',
      label: '豪华建设型玩家',
      description: '开始追求温室、仓储与长期经营许可，适合承接仓储服务和功能型券包。',
      disposableMoneyMin: 32000,
      inflationPressureMin: 11,
      recommendedFocus: '优先投放仓储扩建、温室许可和远行补给等长期建设消费。'
    },
    {
      id: 'showcase_collector',
      label: '展示收藏型玩家',
      description: '资金富余且图鉴/展示倾向明显，适合展示型家具与收藏向高价商品。',
      disposableMoneyMin: 70000,
      inflationPressureMin: 18,
      recommendedFocus: '强化展示型家具、节庆礼盒和终局收藏消费，观察是否带动复购与跨系统炫耀性目标。'
    }
  ],
  rollbackRules: [
    {
      id: 'luxury_pool_roll_back_on_conversion_drop',
      label: '转化下滑且负担失衡时回滚',
      condition: 'weekly_spotlight_conversion_rate < 0.15 且 luxury_affordability_guardrail > 4.5，连续 2 个结算周期成立',
      fallbackAction: '回退新增豪华价格带到上个稳定版本，只保留已验证的周精选与功能型券包，并暂停继续扩容豪华许可证/展示型家具池。'
    }
  ],
  linkedSystems: ['shop', 'wallet', 'goal', 'achievement', 'market'],
  linkedSystemRefs: [
    {
      system: 'shop',
      storeId: 'useShopStore',
      touchpoints: ['premiumCatalogOffers', 'weeklyCatalogOffers', 'purchaseCatalogOffer', 'recommendedCatalogOffers'],
      rationale: '负责目录曝光、推荐逻辑、价格带分层与实际购买入口，是主口径来源。'
    },
    {
      system: 'wallet',
      storeId: 'walletCatalogBias',
      touchpoints: ['商贾流 weekly/premium 权重', '商店折扣', 'catalogTagWeights'],
      rationale: '决定不同钱包流派对周精选、豪华目录和功能型商品的偏好差异。'
    },
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'recommendedCatalogTags'],
      rationale: '负责主题周与推荐标签，影响周精选和节庆礼盒的转化解释。'
    },
    {
      system: 'achievement',
      storeId: 'useAchievementStore',
      touchpoints: ['discoveredCount', 'unlockDiscoveryCount'],
      rationale: '提供高价目录与收藏型商品的解锁门槛，支持展示型玩家分层。'
    },
    {
      system: 'market',
      storeId: 'useShopStore.shippingHistory',
      touchpoints: ['recent7DayNetIncome', '品类行情收益'],
      rationale: '校验高价商品负担是否仍与当前市场收益匹配，避免价格带脱离经济现实。'
    }
  ]
}

export const SHOP_CATALOG_OFFERS: ShopCatalogOfferDef[] = [...BASIC_OFFERS, ...WEEKLY_OFFERS, ...SEASONAL_OFFERS, ...PREMIUM_OFFERS]

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export const getWeeklyShopCatalogOffers = (weekId: number, count = 4): ShopCatalogOfferDef[] => {
  const rng = seededRandom(weekId + 17)
  const pool = [...WEEKLY_OFFERS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, Math.min(count, pool.length))
}
