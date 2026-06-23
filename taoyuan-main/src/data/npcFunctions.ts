import type { RelationshipStage } from '@/types'

export type NpcFunctionUnlockTier = 'T1' | 'T2' | 'T3' | 'T4'

export interface NpcFunctionMaterialCost {
  itemId: string
  quantity: number
}

export interface NpcFunctionUnlockDef {
  id: string
  npcId: string
  tier: NpcFunctionUnlockTier
  requiredStage: RelationshipStage
  title: string
  summary: string
  materialCost: NpcFunctionMaterialCost[]
  costMoney: number
  effectType: string
  effectPayload?: Record<string, unknown>
  legacyUnlocked?: boolean
}

export interface NpcFunctionUnlockStatus {
  def: NpcFunctionUnlockDef | null
  npcExists: boolean
  unlocked: boolean
  relationshipReady: boolean
  previousTierReady: boolean
  moneyReady: boolean
  materialsReady: boolean
  missingMaterials: Array<NpcFunctionMaterialCost & { owned: number }>
  canUnlock: boolean
  disabledReason: string
}

export const NPC_FUNCTION_TIER_ORDER: NpcFunctionUnlockTier[] = ['T1', 'T2', 'T3', 'T4']

const legacy = (
  id: string,
  npcId: string,
  tier: NpcFunctionUnlockTier,
  requiredStage: RelationshipStage,
  title: string,
  summary: string,
  effectType = 'legacy_existing'
): NpcFunctionUnlockDef => ({
  id,
  npcId,
  tier,
  requiredStage,
  title,
  summary,
  materialCost: [],
  costMoney: 0,
  effectType,
  legacyUnlocked: true
})

export const NPC_FUNCTION_UNLOCKS: NpcFunctionUnlockDef[] = [
  {
    id: 'liu_cunzhang_T1_village_quest_speed',
    npcId: 'liu_cunzhang',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '村务公告板加速',
    summary: '村务任务刷新节奏提前 1 天，先作为可追踪解锁标记接入。',
    materialCost: [{ itemId: 'wood', quantity: 20 }],
    costMoney: 500,
    effectType: 'village_quest_speed',
    effectPayload: { value: 1 }
  },
  {
    id: 'liu_cunzhang_T2_village_project_preview',
    npcId: 'liu_cunzhang',
    tier: 'T2',
    requiredStage: 'friend',
    title: '建设规划预览',
    summary: '提前预览下一个建设项目，后续接入村庄建设提示。',
    materialCost: [
      { itemId: 'stone', quantity: 15 },
      { itemId: 'copper_ore', quantity: 10 }
    ],
    costMoney: 800,
    effectType: 'village_project_preview',
    effectPayload: { value: 1 }
  },
  legacy('liu_cunzhang_T3_mayor_ticket_conversion', 'liu_cunzhang', 'T3', 'bestie', '村务票据兑换', '柳村长既有的村务票据兑换路径，本系统只记录为已有能力。', 'mayor_ticket_conversion'),
  {
    id: 'lao_song_T1_night_gather_bonus',
    npcId: 'lao_song',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '夜间巡逻情报',
    summary: '夜间采集成功率 +5%，先进入永久解锁状态。',
    materialCost: [{ itemId: 'firewood', quantity: 10 }],
    costMoney: 300,
    effectType: 'night_gather_bonus',
    effectPayload: { value: 5 }
  },
  {
    id: 'lao_song_T2_extra_night_action',
    npcId: 'lao_song',
    tier: 'T2',
    requiredStage: 'friend',
    title: '守夜值班',
    summary: '22:00 后额外行动 1 次，后续接入行动结算。',
    materialCost: [{ itemId: 'iron_bar', quantity: 3 }],
    costMoney: 600,
    effectType: 'extra_night_action',
    effectPayload: { value: 1 }
  },
  {
    id: 'lao_song_T3_night_drop_bonus',
    npcId: 'lao_song',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '深夜密道',
    summary: '矿洞和林地夜间额外掉落 +10%，先记录能力标记。',
    materialCost: [
      { itemId: 'obsidian', quantity: 2 },
      { itemId: 'iron_bar', quantity: 5 }
    ],
    costMoney: 1200,
    effectType: 'night_drop_bonus',
    effectPayload: { value: 10 }
  },
  {
    id: 'he_zhanggui_T1_price_intel',
    npcId: 'he_zhanggui',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '茶楼情报',
    summary: '每周随机 1 条商品价格波动消息，先接入解锁树。',
    materialCost: [{ itemId: 'tea', quantity: 5 }],
    costMoney: 400,
    effectType: 'price_intel',
    effectPayload: { value: 1 }
  },
  {
    id: 'he_zhanggui_T2_shop_discount_bonus',
    npcId: 'he_zhanggui',
    tier: 'T2',
    requiredStage: 'friend',
    title: '商会联络',
    summary: '商店折扣额外 +3%，后续接入商店价格结算。',
    materialCost: [{ itemId: 'green_tea_drink', quantity: 3 }],
    costMoney: 1000,
    effectType: 'shop_discount_bonus',
    effectPayload: { value: 3 }
  },
  {
    id: 'he_zhanggui_T3_rare_commission',
    npcId: 'he_zhanggui',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀有订单',
    summary: '茶楼每周刷出 1 个高价收购任务，先保留可追踪标记。',
    materialCost: [
      { itemId: 'tea', quantity: 10 },
      { itemId: 'osmanthus', quantity: 5 }
    ],
    costMoney: 2000,
    effectType: 'rare_commission',
    effectPayload: { value: 1 }
  },
  {
    id: 'chen_bo_T1_bulk_buy',
    npcId: 'chen_bo',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '批量采购权',
    summary: '万物铺解锁批量购买入口，后续接入商店数量控件。',
    materialCost: [{ itemId: 'wood', quantity: 10 }],
    costMoney: 500,
    effectType: 'bulk_buy',
    effectPayload: { value: 1 }
  },
  {
    id: 'chen_bo_T2_rare_shop_stock',
    npcId: 'chen_bo',
    tier: 'T2',
    requiredStage: 'friend',
    title: '商路情报',
    summary: '每季初获得 1 个随机稀有商品上架线索。',
    materialCost: [
      { itemId: 'bamboo', quantity: 15 },
      { itemId: 'cloth', quantity: 3 }
    ],
    costMoney: 1000,
    effectType: 'rare_shop_stock',
    effectPayload: { value: 1 }
  },
  legacy('chen_bo_T3_trade_cache', 'chen_bo', 'T3', 'bestie', '万物铺代购', '陈伯既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'ma_liu_T1_caravan_map',
    npcId: 'ma_liu',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '商路地图',
    summary: '解锁商路地图说明，后续接入旅行商提示。',
    materialCost: [{ itemId: 'bamboo', quantity: 8 }],
    costMoney: 400,
    effectType: 'caravan_map',
    effectPayload: { value: 1 }
  },
  {
    id: 'ma_liu_T2_caravan_alert',
    npcId: 'ma_liu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '商队联络',
    summary: '商队到达前提前 1 天通知。',
    materialCost: [
      { itemId: 'copper_bar', quantity: 3 },
      { itemId: 'cloth', quantity: 2 }
    ],
    costMoney: 800,
    effectType: 'caravan_alert',
    effectPayload: { value: 1 }
  },
  {
    id: 'ma_liu_T3_caravan_preorder',
    npcId: 'ma_liu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀有商品预订',
    summary: '商队来访前可预约 1 件商品，先建立解锁状态。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'iron_bar', quantity: 5 }
    ],
    costMoney: 2000,
    effectType: 'caravan_preorder',
    effectPayload: { value: 1 }
  },
  {
    id: 'wu_shen_T1_proxy_buy',
    npcId: 'wu_shen',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '杂货代购',
    summary: '帮忙代购基础消耗品，先进入解锁框架。',
    materialCost: [{ itemId: 'wood', quantity: 10 }],
    costMoney: 300,
    effectType: 'proxy_buy',
    effectPayload: { value: 1 }
  },
  {
    id: 'wu_shen_T2_extra_warehouse',
    npcId: 'wu_shen',
    tier: 'T2',
    requiredStage: 'friend',
    title: '仓库整理',
    summary: '仓库容量 +6 格，后续接入仓储系统。',
    materialCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    costMoney: 1500,
    effectType: 'extra_warehouse',
    effectPayload: { value: 6 }
  },
  {
    id: 'wu_shen_T3_rare_consumable',
    npcId: 'wu_shen',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀缺渠道',
    summary: '杂货铺每周刷出 1 件稀有消耗品。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'iron_bar', quantity: 3 }
    ],
    costMoney: 2000,
    effectType: 'rare_consumable',
    effectPayload: { value: 1 }
  },
  legacy('da_niu_T1_barn_feed', 'da_niu', 'T1', 'familiar', '牧场草料', '大牛既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'da_niu_T2_animal_mood_slow',
    npcId: 'da_niu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '动物护理',
    summary: '动物心情衰减 -20%，后续接入畜牧日结。',
    materialCost: [
      { itemId: 'hay', quantity: 30 },
      { itemId: 'milk', quantity: 5 }
    ],
    costMoney: 1000,
    effectType: 'animal_mood_slow',
    effectPayload: { value: 20 }
  },
  {
    id: 'da_niu_T3_breeding_boost',
    npcId: 'da_niu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '配种建议',
    summary: '繁殖成功率 +15%，孕期 -1 天。',
    materialCost: [
      { itemId: 'fish_feed', quantity: 10 },
      { itemId: 'goat_milk', quantity: 3 }
    ],
    costMoney: 2500,
    effectType: 'breeding_boost',
    effectPayload: { value: 15 }
  },
  {
    id: 'da_niu_T4_spouse_animal_boost',
    npcId: 'da_niu',
    tier: 'T4',
    requiredStage: 'married',
    title: '共牧时光',
    summary: '动物产出品质 +1 级，保留为婚后功能标记。',
    materialCost: [{ itemId: 'ornamental_feed', quantity: 5 }],
    costMoney: 5000,
    effectType: 'spouse_animal_boost',
    effectPayload: { value: 1 }
  },
  {
    id: 'qin_dashu_T1_orchard_care',
    npcId: 'qin_dashu',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '果树护理',
    summary: '浇水效率 +1，果实产量 +10%，先记录为功能标记。',
    materialCost: [{ itemId: 'wood', quantity: 10 }],
    costMoney: 500,
    effectType: 'orchard_care',
    effectPayload: { value: 10 }
  },
  {
    id: 'qin_dashu_T2_grafting',
    npcId: 'qin_dashu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '嫁接指导',
    summary: '解锁嫁接功能，后续接入果树系统。',
    materialCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'copper_bar', quantity: 5 }
    ],
    costMoney: 1500,
    effectType: 'grafting',
    effectPayload: { value: 1 }
  },
  {
    id: 'qin_dashu_T3_rare_sapling',
    npcId: 'qin_dashu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀有果苗',
    summary: '每季获得 1 株随机稀有果树苗。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 2 },
      { itemId: 'wood', quantity: 30 }
    ],
    costMoney: 3000,
    effectType: 'rare_sapling',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_fu_T1_auto_animal_affection',
    npcId: 'a_fu',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '放牧协助',
    summary: '动物每天自动 +3 好感，后续接入畜牧日结。',
    materialCost: [{ itemId: 'hay', quantity: 10 }],
    costMoney: 200,
    effectType: 'auto_animal_affection',
    effectPayload: { value: 3 }
  },
  {
    id: 'a_fu_T2_animal_tracker',
    npcId: 'a_fu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '动物追踪',
    summary: '小地图显示散养动物位置。',
    materialCost: [
      { itemId: 'bamboo', quantity: 5 },
      { itemId: 'silk', quantity: 3 }
    ],
    costMoney: 500,
    effectType: 'animal_tracker',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_fu_T3_pasture_discovery',
    npcId: 'a_fu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '野外发现',
    summary: '放牧时 5% 概率发现稀有采集物。',
    materialCost: [
      { itemId: 'herb', quantity: 10 },
      { itemId: 'hay', quantity: 20 }
    ],
    costMoney: 1500,
    effectType: 'pasture_discovery',
    effectPayload: { value: 5 }
  },
  legacy('a_shi_T1_mine_brace', 'a_shi', 'T1', 'familiar', '矿料支持', '阿石既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'a_shi_T2_mine_extra_node',
    npcId: 'a_shi',
    tier: 'T2',
    requiredStage: 'friend',
    title: '矿洞支架',
    summary: '每层额外 1 个可采集矿格。',
    materialCost: [
      { itemId: 'iron_bar', quantity: 5 },
      { itemId: 'wood', quantity: 20 }
    ],
    costMoney: 1500,
    effectType: 'mine_extra_node',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_shi_T3_mine_floor_hint',
    npcId: 'a_shi',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '矿脉指引',
    summary: '每周 1 次本周最佳矿层提示；深层矿洞更容易辨认配件材料与稀有配件。',
    materialCost: [
      { itemId: 'obsidian', quantity: 2 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    costMoney: 3000,
    effectType: 'mine_floor_hint',
    effectPayload: { value: 1, accessoryDropHint: 1 }
  },
  {
    id: 'a_shi_T4_zhiji_mine_boost',
    npcId: 'a_shi',
    tier: 'T4',
    requiredStage: 'family',
    title: '矿洞同修',
    summary: '知己同行矿洞体力 -20%，掉落 +15%。',
    materialCost: [{ itemId: 'crystal_ore', quantity: 5 }],
    costMoney: 4000,
    effectType: 'zhiji_mine_boost',
    effectPayload: { value: 20 }
  },
  legacy('sun_tiejiang_T1_forge_stock', 'sun_tiejiang', 'T1', 'familiar', '锻炉余料', '孙铁匠既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'sun_tiejiang_T2_forge_success_boost',
    npcId: 'sun_tiejiang',
    tier: 'T2',
    requiredStage: 'friend',
    title: '锻造指导',
    summary: '锻造成功率 +10%，材料返还 +5%；铁匠铺可开始定向打造二阶配件。',
    materialCost: [
      { itemId: 'copper_bar', quantity: 5 },
      { itemId: 'iron_ore', quantity: 10 }
    ],
    costMoney: 1500,
    effectType: 'forge_success_boost',
    effectPayload: { value: 10, accessoryTierUnlock: 2 }
  },
  {
    id: 'sun_tiejiang_T3_premium_forge',
    npcId: 'sun_tiejiang',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀有锻造',
    summary: '解锁精锻选项，后续接入锻造台。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 3 },
      { itemId: 'iron_bar', quantity: 10 },
      { itemId: 'obsidian', quantity: 2 }
    ],
    costMoney: 4000,
    effectType: 'premium_forge',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_tie_T1_free_tool_repair',
    npcId: 'a_tie',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '工具修补',
    summary: '每 7 天免费修复 1 件工具。',
    materialCost: [{ itemId: 'copper_ore', quantity: 5 }],
    costMoney: 300,
    effectType: 'free_tool_repair',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_tie_T2_forge_speed',
    npcId: 'a_tie',
    tier: 'T2',
    requiredStage: 'friend',
    title: '锻造协助',
    summary: '锻造时间 -1 天，先记录为能力标记。',
    materialCost: [
      { itemId: 'iron_ore', quantity: 10 },
      { itemId: 'wood', quantity: 10 }
    ],
    costMoney: 1000,
    effectType: 'forge_speed',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_tie_T3_apprentice_craft',
    npcId: 'a_tie',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '学徒出品',
    summary: '每季独立完成 1 件随机铁制工具。',
    materialCost: [
      { itemId: 'iron_ore', quantity: 20 },
      { itemId: 'copper_bar', quantity: 5 }
    ],
    costMoney: 2500,
    effectType: 'apprentice_craft',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_tie_T4_spouse_forge_bonus',
    npcId: 'a_tie',
    tier: 'T4',
    requiredStage: 'married',
    title: '双人锻造',
    summary: '夫妻共同锻造额外产出 1 件副产品。',
    materialCost: [{ itemId: 'crystal_ore', quantity: 3 }],
    costMoney: 5000,
    effectType: 'spouse_forge_bonus',
    effectPayload: { value: 1 }
  },
  legacy('qiu_yue_T1_bait_bundle', 'qiu_yue', 'T1', 'familiar', '渔汛饵包', '秋月既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'qiu_yue_T2_fish_odds_display',
    npcId: 'qiu_yue',
    tier: 'T2',
    requiredStage: 'friend',
    title: '鱼获情报',
    summary: '显示当前水域稀有鱼概率。',
    materialCost: [{ itemId: 'standard_bait', quantity: 20 }],
    costMoney: 800,
    effectType: 'fish_odds_display',
    effectPayload: { value: 1 }
  },
  {
    id: 'qiu_yue_T3_tackle_maintain',
    npcId: 'qiu_yue',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '渔具维修',
    summary: '钓竿耐久消耗 -30%，断裂归零。',
    materialCost: [
      { itemId: 'wood', quantity: 10 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    costMoney: 2000,
    effectType: 'tackle_maintain',
    effectPayload: { value: 30 }
  },
  {
    id: 'qiu_yue_T4_spouse_fishing_boost',
    npcId: 'qiu_yue',
    tier: 'T4',
    requiredStage: 'married',
    title: '同舟共钓',
    summary: '夫妻同钓双倍经验，稀有鱼 +20%。',
    materialCost: [{ itemId: 'fish_feed', quantity: 10 }],
    costMoney: 4000,
    effectType: 'spouse_fishing_boost',
    effectPayload: { value: 20 }
  },
  {
    id: 'li_yu_T1_fishing_easy',
    npcId: 'li_yu',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '钓鱼指导',
    summary: '钓鱼小游戏难度 -10%。',
    materialCost: [{ itemId: 'bamboo', quantity: 10 }],
    costMoney: 400,
    effectType: 'fishing_easy',
    effectPayload: { value: 10 }
  },
  {
    id: 'li_yu_T2_secret_fishing_style',
    npcId: 'li_yu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '秘传钓法',
    summary: '解锁落叶钓，特定鱼种 +30%。',
    materialCost: [
      { itemId: 'silk', quantity: 5 },
      { itemId: 'wild_mushroom', quantity: 10 }
    ],
    costMoney: 1200,
    effectType: 'secret_fishing_style',
    effectPayload: { value: 30 }
  },
  {
    id: 'li_yu_T3_deep_water_spot',
    npcId: 'li_yu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '深水线索',
    summary: '解锁瀑布与沼泽深水钓点，深水鱼权重 +25%，可转入鱼塘承接样本。',
    materialCost: [
      { itemId: 'iron_bar', quantity: 5 },
      { itemId: 'standard_bait', quantity: 30 }
    ],
    costMoney: 3000,
    effectType: 'deep_water_spot',
    effectPayload: { value: 1 }
  },
  legacy('lin_lao_T1_tonic_pack', 'lin_lao', 'T1', 'familiar', '药圃调养包', '林老既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'lin_lao_T2_daily_stamina_regen',
    npcId: 'lin_lao',
    tier: 'T2',
    requiredStage: 'friend',
    title: '养生配方',
    summary: '每日体力恢复 +5，解锁药膳分类。',
    materialCost: [
      { itemId: 'herb', quantity: 15 },
      { itemId: 'ginseng', quantity: 2 }
    ],
    costMoney: 1500,
    effectType: 'daily_stamina_regen',
    effectPayload: { value: 5 }
  },
  {
    id: 'lin_lao_T3_hot_spring_boost',
    npcId: 'lin_lao',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '温泉疗养线索',
    summary: '解锁温泉标记，温泉恢复 +50%。',
    materialCost: [
      { itemId: 'herb', quantity: 20 },
      { itemId: 'ginseng_extract', quantity: 1 },
      { itemId: 'antler_velvet', quantity: 1 }
    ],
    costMoney: 3000,
    effectType: 'hot_spring_boost',
    effectPayload: { value: 50 }
  },
  {
    id: 'qian_niang_T1_herb_preorder',
    npcId: 'qian_niang',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '药材代购',
    summary: '药铺新增月草代购货架。',
    materialCost: [{ itemId: 'herb', quantity: 10 }],
    costMoney: 500,
    effectType: 'herb_preorder',
    effectPayload: { value: 1 }
  },
  {
    id: 'qian_niang_T2_herb_craft_boost',
    npcId: 'qian_niang',
    tier: 'T2',
    requiredStage: 'friend',
    title: '配药协助',
    summary: '药剂制作时间 -20%，材料 -10%。',
    materialCost: [
      { itemId: 'herb', quantity: 20 },
      { itemId: 'ginseng', quantity: 3 }
    ],
    costMoney: 1500,
    effectType: 'herb_craft_boost',
    effectPayload: { value: 20 }
  },
  {
    id: 'qian_niang_T3_rare_herb_channel',
    npcId: 'qian_niang',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '珍稀药材渠道',
    summary: '每季 1 次珍稀药材采购。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'ginseng_extract', quantity: 2 }
    ],
    costMoney: 3500,
    effectType: 'rare_herb_channel',
    effectPayload: { value: 1 }
  },
  legacy('su_su_T1_tailor_bundle', 'su_su', 'T1', 'familiar', '裁缝补给', '素素既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'su_su_T2_equip_durability',
    npcId: 'su_su',
    tier: 'T2',
    requiredStage: 'friend',
    title: '衣物修补',
    summary: '装备耐久上限 +20%，修理费 -30%。',
    materialCost: [
      { itemId: 'cloth', quantity: 10 },
      { itemId: 'silk', quantity: 5 }
    ],
    costMoney: 1200,
    effectType: 'equip_durability',
    effectPayload: { value: 20 }
  },
  {
    id: 'su_su_T3_custom_equip',
    npcId: 'su_su',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '定制衣物',
    summary: '指定装备附加 1 个随机词条。',
    materialCost: [
      { itemId: 'silk_cloth', quantity: 3 },
      { itemId: 'gold_bar', quantity: 1 }
    ],
    costMoney: 3000,
    effectType: 'custom_equip',
    effectPayload: { value: 1 }
  },
  {
    id: 'su_su_T4_spouse_equip_bonus',
    npcId: 'su_su',
    tier: 'T4',
    requiredStage: 'married',
    title: '量身定做',
    summary: '配偶专属装备槽，属性 +15%。',
    materialCost: [
      { itemId: 'silk_cloth', quantity: 2 },
      { itemId: 'gold_ore', quantity: 2 }
    ],
    costMoney: 5000,
    effectType: 'spouse_equip_bonus',
    effectPayload: { value: 15 }
  },
  {
    id: 'zhang_popo_T1_cloth_speed',
    npcId: 'zhang_popo',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '织布协助',
    summary: '布料加工速度 +20%，先进入解锁状态。',
    materialCost: [{ itemId: 'wool', quantity: 10 }],
    costMoney: 300,
    effectType: 'cloth_speed',
    effectPayload: { value: 20 }
  },
  {
    id: 'zhang_popo_T2_free_cloth_repair',
    npcId: 'zhang_popo',
    tier: 'T2',
    requiredStage: 'friend',
    title: '旧布修补',
    summary: '每 7 天免费修补 1 件布质装备。',
    materialCost: [
      { itemId: 'wool', quantity: 15 },
      { itemId: 'silk', quantity: 5 }
    ],
    costMoney: 800,
    effectType: 'free_cloth_repair',
    effectPayload: { value: 1 }
  },
  {
    id: 'zhang_popo_T3_ancient_weave',
    npcId: 'zhang_popo',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '珍藏布料',
    summary: '解锁古法织造配方。',
    materialCost: [
      { itemId: 'wool', quantity: 25 },
      { itemId: 'silk_cloth', quantity: 3 }
    ],
    costMoney: 2500,
    effectType: 'ancient_weave',
    effectPayload: { value: 1 }
  },
  {
    id: 'hui_niang_T1_embroidery_craft',
    npcId: 'hui_niang',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '绣品补给',
    summary: '解锁定制绣样功能。',
    materialCost: [{ itemId: 'silk', quantity: 10 }],
    costMoney: 500,
    effectType: 'embroidery_craft',
    effectPayload: { value: 1 }
  },
  {
    id: 'hui_niang_T2_embroidery_boost',
    npcId: 'hui_niang',
    tier: 'T2',
    requiredStage: 'friend',
    title: '刺绣指导',
    summary: '绣品类装备属性 +10%。',
    materialCost: [
      { itemId: 'silk_cloth', quantity: 5 },
      { itemId: 'gold_bar', quantity: 2 }
    ],
    costMoney: 1500,
    effectType: 'embroidery_boost',
    effectPayload: { value: 10 }
  },
  {
    id: 'hui_niang_T3_premium_embroidery',
    npcId: 'hui_niang',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '定制绣品',
    summary: '每月 1 件绣庄精品附带 buff。',
    materialCost: [
      { itemId: 'silk_cloth', quantity: 2 },
      { itemId: 'gold_bar', quantity: 5 }
    ],
    costMoney: 3500,
    effectType: 'premium_embroidery',
    effectPayload: { value: 1 }
  },
  legacy('wang_dashen_T1_banquet_prep', 'wang_dashen', 'T1', 'familiar', '宴席备料', '王大婶既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'wang_dashen_T2_cook_success_boost',
    npcId: 'wang_dashen',
    tier: 'T2',
    requiredStage: 'friend',
    title: '烹饪指导',
    summary: '料理成功率 +15%，品质 +1。',
    materialCost: [
      { itemId: 'egg', quantity: 10 },
      { itemId: 'rice', quantity: 5 }
    ],
    costMoney: 1000,
    effectType: 'cook_success_boost',
    effectPayload: { value: 15 }
  },
  {
    id: 'wang_dashen_T3_secret_recipes',
    npcId: 'wang_dashen',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '秘方传授',
    summary: '解锁 3 道隐藏料理配方。',
    materialCost: [
      { itemId: 'osmanthus', quantity: 10 },
      { itemId: 'honey', quantity: 5 },
      { itemId: 'sesame_powder', quantity: 3 }
    ],
    costMoney: 3000,
    effectType: 'secret_recipes',
    effectPayload: { value: 1 }
  },
  {
    id: 'pang_shen_T1_daily_tofu',
    npcId: 'pang_shen',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '豆腐供应',
    summary: '每日可领取 1 份基础豆腐。',
    materialCost: [{ itemId: 'broad_bean', quantity: 10 }],
    costMoney: 200,
    effectType: 'daily_tofu',
    effectPayload: { value: 1 }
  },
  {
    id: 'pang_shen_T2_tofu_workshop',
    npcId: 'pang_shen',
    tier: 'T2',
    requiredStage: 'friend',
    title: '豆制品加工',
    summary: '解锁豆腐坊加工台。',
    materialCost: [
      { itemId: 'broad_bean', quantity: 20 },
      { itemId: 'stone', quantity: 10 }
    ],
    costMoney: 800,
    effectType: 'tofu_workshop',
    effectPayload: { value: 1 }
  },
  {
    id: 'pang_shen_T3_festival_tofu_feast',
    npcId: 'pang_shen',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '节庆豆腐宴',
    summary: '节庆期间全属性 +5%。',
    materialCost: [
      { itemId: 'broad_bean', quantity: 30 },
      { itemId: 'ginseng_extract', quantity: 1 }
    ],
    costMoney: 2000,
    effectType: 'festival_tofu_feast',
    effectPayload: { value: 5 }
  },
  {
    id: 'lao_lu_T1_wine_cellar',
    npcId: 'lao_lu',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '酒窖储藏',
    summary: '酒类仓储箱容量 +12。',
    materialCost: [{ itemId: 'wood', quantity: 15 }],
    costMoney: 500,
    effectType: 'wine_cellar',
    effectPayload: { value: 12 }
  },
  {
    id: 'lao_lu_T2_wine_aging_boost',
    npcId: 'lao_lu',
    tier: 'T2',
    requiredStage: 'friend',
    title: '陈酿指导',
    summary: '酒类陈酿时间 -20%，品质 +1。',
    materialCost: [
      { itemId: 'charcoal', quantity: 5 },
      { itemId: 'bamboo', quantity: 10 }
    ],
    costMoney: 1200,
    effectType: 'wine_aging_boost',
    effectPayload: { value: 20 }
  },
  {
    id: 'lao_lu_T3_rare_wine',
    npcId: 'lao_lu',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '稀有佳酿',
    summary: '每季获得 1 瓶随机稀有酒。',
    materialCost: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'osmanthus', quantity: 15 }
    ],
    costMoney: 3000,
    effectType: 'rare_wine',
    effectPayload: { value: 1 }
  },
  legacy('chun_lan_T1_tea_pack', 'chun_lan', 'T1', 'familiar', '茶庄点心', '春兰既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'chun_lan_T2_tea_ceremony',
    npcId: 'chun_lan',
    tier: 'T2',
    requiredStage: 'friend',
    title: '茶艺指导',
    summary: '泡茶成功率 +20%，茶饮 buff +1 天。',
    materialCost: [
      { itemId: 'tea', quantity: 10 },
      { itemId: 'honey', quantity: 3 }
    ],
    costMoney: 1200,
    effectType: 'tea_ceremony',
    effectPayload: { value: 20 }
  },
  {
    id: 'chun_lan_T3_private_tea',
    npcId: 'chun_lan',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '私藏好茶',
    summary: '每月 1 罐春兰私藏强力 buff。',
    materialCost: [
      { itemId: 'tea', quantity: 20 },
      { itemId: 'ginseng_extract', quantity: 1 }
    ],
    costMoney: 3000,
    effectType: 'private_tea',
    effectPayload: { value: 1 }
  },
  {
    id: 'chun_lan_T4_spouse_tea_bonus',
    npcId: 'chun_lan',
    tier: 'T4',
    requiredStage: 'married',
    title: '对饮时光',
    summary: '配偶同行茶饮效果 +50%。',
    materialCost: [{ itemId: 'ginseng_tea', quantity: 5 }],
    costMoney: 5000,
    effectType: 'spouse_tea_bonus',
    effectPayload: { value: 50 }
  },
  legacy('xue_qin_T1_gallery_supplies', 'xue_qin', 'T1', 'familiar', '画室陈列', '雪芹既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'xue_qin_T2_farmhouse_portrait',
    npcId: 'xue_qin',
    tier: 'T2',
    requiredStage: 'friend',
    title: '农舍画像',
    summary: '画像计入家园美观度 +2，影响好感上限和折扣门槛。',
    materialCost: [
      { itemId: 'pine_resin', quantity: 5 },
      { itemId: 'cloth', quantity: 3 }
    ],
    costMoney: 1500,
    effectType: 'farmhouse_portrait',
    effectPayload: { value: 2 }
  },
  {
    id: 'xue_qin_T3_scenic_paintings',
    npcId: 'xue_qin',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '景观点缀',
    summary: '景观点缀每日全 NPC 好感 +3，受好感上限约束。',
    materialCost: [
      { itemId: 'pine_resin', quantity: 10 },
      { itemId: 'gold_bar', quantity: 3 }
    ],
    costMoney: 3500,
    effectType: 'scenic_paintings',
    effectPayload: { value: 3 }
  },
  legacy('dan_qing_T1_letter_gathering', 'dan_qing', 'T1', 'familiar', '文会名帖', '丹青既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'dan_qing_T2_calligraphy',
    npcId: 'dan_qing',
    tier: 'T2',
    requiredStage: 'friend',
    title: '书法指导',
    summary: '解锁药碾隐藏配方「题字墨」，消耗木炭与纸张整理文书。',
    materialCost: [
      { itemId: 'bamboo', quantity: 10 },
      { itemId: 'charcoal', quantity: 5 }
    ],
    costMoney: 1200,
    effectType: 'calligraphy',
    effectPayload: { value: 1 }
  },
  {
    id: 'dan_qing_T3_letter_writing',
    npcId: 'dan_qing',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '信件代笔',
    summary: '代写邀请函，社交/邻里邀请容量 +1。',
    materialCost: [
      { itemId: 'gold_bar', quantity: 2 },
      { itemId: 'paper', quantity: 20 }
    ],
    costMoney: 2500,
    effectType: 'letter_writing',
    effectPayload: { value: 1 }
  },
  legacy('mo_bai_T1_night_song', 'mo_bai', 'T1', 'familiar', '夜曲润喉茶', '墨白既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'mo_bai_T2_festival_music',
    npcId: 'mo_bai',
    tier: 'T2',
    requiredStage: 'friend',
    title: '乐曲指导',
    summary: '节庆好感奖励 +20%，在线节会显示乐曲表现加成。',
    materialCost: [
      { itemId: 'bamboo', quantity: 10 },
      { itemId: 'silk', quantity: 5 }
    ],
    costMoney: 1200,
    effectType: 'festival_music',
    effectPayload: { value: 20 }
  },
  {
    id: 'mo_bai_T3_special_perform',
    npcId: 'mo_bai',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '节庆表演',
    summary: '解锁特别演出，全 NPC 好感 +5。',
    materialCost: [
      { itemId: 'bamboo', quantity: 5 },
      { itemId: 'gold_bar', quantity: 3 }
    ],
    costMoney: 3000,
    effectType: 'special_perform',
    effectPayload: { value: 5 }
  },
  legacy('zhao_mujiang_T1_workshop_pack', 'zhao_mujiang', 'T1', 'familiar', '木工整料', '赵木匠既有每周帮办，本系统记录为已有能力。', 'npc_active_service'),
  {
    id: 'zhao_mujiang_T2_build_speed',
    npcId: 'zhao_mujiang',
    tier: 'T2',
    requiredStage: 'friend',
    title: '建筑指导',
    summary: '建造时间 -15%，材料 -10%。',
    materialCost: [
      { itemId: 'wood', quantity: 30 },
      { itemId: 'copper_bar', quantity: 3 }
    ],
    costMoney: 1500,
    effectType: 'build_speed',
    effectPayload: { value: 15 }
  },
  {
    id: 'zhao_mujiang_T3_custom_furniture',
    npcId: 'zhao_mujiang',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '定制家具',
    summary: '解锁目录限定家具直购，仍受价格和单件上限限制。',
    materialCost: [
      { itemId: 'pine_resin', quantity: 5 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    costMoney: 3500,
    effectType: 'custom_furniture',
    effectPayload: { value: 1 }
  },
  legacy('xiao_man_T1_tool_upgrade', 'xiao_man', 'T1', 'familiar', '工具升级', '小满已有工具升级路径，本系统只补解锁展示。', 'tool_upgrade_existing'),
  {
    id: 'xiao_man_T2_tool_upgrade_speed',
    npcId: 'xiao_man',
    tier: 'T2',
    requiredStage: 'friend',
    title: '工具加速',
    summary: '工具升级时间 -1 天，后续接入升级结算。',
    materialCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'iron_bar', quantity: 2 }
    ],
    costMoney: 1000,
    effectType: 'tool_upgrade_speed',
    effectPayload: { value: 1 }
  },
  {
    id: 'xiao_man_T3_tool_bonus_slot',
    npcId: 'xiao_man',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '工具精修',
    summary: '升级后工具额外 +1 词条槽位。',
    materialCost: [
      { itemId: 'iron_bar', quantity: 5 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    costMoney: 3000,
    effectType: 'tool_bonus_slot',
    effectPayload: { value: 1 }
  },
  {
    id: 'shi_tou_T1_herb_gather_bonus',
    npcId: 'shi_tou',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '采药帮手',
    summary: '草药采集量 +1，先进入解锁树。',
    materialCost: [
      { itemId: 'hay', quantity: 5 },
      { itemId: 'fine_candied_fruit', quantity: 3 }
    ],
    costMoney: 200,
    effectType: 'herb_gather_bonus',
    effectPayload: { value: 1 }
  },
  {
    id: 'shi_tou_T2_hidden_gather_spots',
    npcId: 'shi_tou',
    tier: 'T2',
    requiredStage: 'friend',
    title: '隐藏地点',
    summary: '解锁 3 个隐藏采集点。',
    materialCost: [
      { itemId: 'bamboo', quantity: 5 },
      { itemId: 'wood', quantity: 5 }
    ],
    costMoney: 500,
    effectType: 'hidden_gather_spots',
    effectPayload: { value: 3 }
  },
  {
    id: 'shi_tou_T3_weekly_rare_hint',
    npcId: 'shi_tou',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '探险伙伴',
    summary: '每周 1 条随机稀有资源线索。',
    materialCost: [
      { itemId: 'fine_candied_fruit', quantity: 10 },
      { itemId: 'bamboo', quantity: 10 }
    ],
    costMoney: 1500,
    effectType: 'weekly_rare_hint',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_hua_T1_errand_bonus',
    npcId: 'a_hua',
    tier: 'T1',
    requiredStage: 'familiar',
    title: '跑腿帮忙',
    summary: 'NPC 好感获取 +3，后续接入关系增长。',
    materialCost: [{ itemId: 'fine_candied_fruit', quantity: 3 }],
    costMoney: 200,
    effectType: 'errand_bonus',
    effectPayload: { value: 3 }
  },
  {
    id: 'a_hua_T2_discovery_clues',
    npcId: 'a_hua',
    tier: 'T2',
    requiredStage: 'friend',
    title: '发现线索',
    summary: '偶尔发现隐藏物品线索。',
    materialCost: [
      { itemId: 'wildflower_honey', quantity: 1 },
      { itemId: 'silk_ribbon', quantity: 1 }
    ],
    costMoney: 500,
    effectType: 'discovery_clues',
    effectPayload: { value: 1 }
  },
  {
    id: 'a_hua_T3_weekly_surprise',
    npcId: 'a_hua',
    tier: 'T3',
    requiredStage: 'bestie',
    title: '意外收获',
    summary: '每周可能带回 1 件随机小礼物。',
    materialCost: [
      { itemId: 'moonstone', quantity: 1 },
      { itemId: 'silk_cloth', quantity: 2 }
    ],
    costMoney: 1500,
    effectType: 'weekly_surprise',
    effectPayload: { value: 1 }
  }
]

export const getNpcFunctionUnlockDefs = (npcId: string): NpcFunctionUnlockDef[] =>
  NPC_FUNCTION_UNLOCKS
    .filter(def => def.npcId === npcId)
    .sort((a, b) => NPC_FUNCTION_TIER_ORDER.indexOf(a.tier) - NPC_FUNCTION_TIER_ORDER.indexOf(b.tier))

export const getNpcFunctionById = (id: string): NpcFunctionUnlockDef | undefined =>
  NPC_FUNCTION_UNLOCKS.find(def => def.id === id)
