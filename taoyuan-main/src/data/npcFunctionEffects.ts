import {
  NPC_FUNCTION_UNLOCKS,
  getNpcFunctionById,
  type NpcFunctionUnlockDef
} from '@/data/npcFunctions'

export type NpcFunctionEffectAggregation = 'sum' | 'max' | 'any'

export type NpcFunctionEffectSystem =
  | 'village'
  | 'forage'
  | 'shop'
  | 'warehouse'
  | 'animal'
  | 'farm'
  | 'mining'
  | 'forge'
  | 'fishing'
  | 'stamina'
  | 'medicine'
  | 'equipment'
  | 'textile'
  | 'cooking'
  | 'wine'
  | 'tea'
  | 'decoration'
  | 'festival'
  | 'tool'
  | 'relationship'
  | 'legacy'

export type NpcFunctionEffectValueKind =
  | 'unlock'
  | 'flat'
  | 'percent'
  | 'days'
  | 'slots'
  | 'count'
  | 'quality'

export interface NpcFunctionEffectDef {
  effectType: string
  label: string
  system: NpcFunctionEffectSystem
  aggregation: NpcFunctionEffectAggregation
  valueKind: NpcFunctionEffectValueKind
}

export interface NpcFunctionEffectContext {
  unlockedFunctionIds?: string[]
  unlockedFunctionDefs?: NpcFunctionUnlockDef[]
}

export interface NpcFunctionEffectSummary {
  effectType: string
  label: string
  system: NpcFunctionEffectSystem
  value: number
  valueKind: NpcFunctionEffectValueKind
  sourceFunctionIds: string[]
  sourceTitles: string[]
}

const EFFECT_SYSTEM_RULES: Array<{ system: NpcFunctionEffectSystem; effectTypes: string[] }> = [
  { system: 'village', effectTypes: ['village_quest_speed', 'village_project_preview', 'mayor_ticket_conversion'] },
  { system: 'forage', effectTypes: ['night_gather_bonus', 'extra_night_action', 'night_drop_bonus', 'herb_gather_bonus', 'hidden_gather_spots', 'weekly_rare_hint', 'discovery_clues', 'weekly_surprise'] },
  { system: 'shop', effectTypes: ['price_intel', 'shop_discount_bonus', 'rare_commission', 'bulk_buy', 'rare_shop_stock', 'caravan_map', 'caravan_alert', 'caravan_preorder', 'proxy_buy', 'rare_consumable'] },
  { system: 'warehouse', effectTypes: ['extra_warehouse'] },
  { system: 'animal', effectTypes: ['npc_active_service', 'animal_mood_slow', 'breeding_boost', 'spouse_animal_boost', 'auto_animal_affection', 'animal_tracker', 'pasture_discovery'] },
  { system: 'farm', effectTypes: ['orchard_care', 'grafting', 'rare_sapling'] },
  { system: 'mining', effectTypes: ['mine_extra_node', 'mine_floor_hint', 'zhiji_mine_boost', 'accessory_mine_hint'] },
  { system: 'forge', effectTypes: ['forge_success_boost', 'premium_forge', 'free_tool_repair', 'forge_speed', 'apprentice_craft', 'spouse_forge_bonus', 'accessory_tier2_craft'] },
  { system: 'fishing', effectTypes: ['fish_odds_display', 'tackle_maintain', 'spouse_fishing_boost', 'fishing_easy', 'secret_fishing_style', 'deep_water_spot'] },
  { system: 'stamina', effectTypes: ['daily_stamina_regen', 'hot_spring_boost'] },
  { system: 'medicine', effectTypes: ['herb_preorder', 'herb_craft_boost', 'rare_herb_channel'] },
  { system: 'equipment', effectTypes: ['equip_durability', 'custom_equip', 'spouse_equip_bonus', 'tool_bonus_slot'] },
  { system: 'textile', effectTypes: ['cloth_speed', 'free_cloth_repair', 'ancient_weave', 'embroidery_craft', 'embroidery_boost', 'premium_embroidery'] },
  { system: 'cooking', effectTypes: ['cook_success_boost', 'secret_recipes', 'daily_tofu', 'tofu_workshop', 'festival_tofu_feast'] },
  { system: 'wine', effectTypes: ['wine_cellar', 'wine_aging_boost', 'rare_wine'] },
  { system: 'tea', effectTypes: ['tea_ceremony', 'private_tea', 'spouse_tea_bonus'] },
  { system: 'decoration', effectTypes: ['farmhouse_portrait', 'scenic_paintings', 'calligraphy', 'letter_writing', 'build_speed', 'custom_furniture'] },
  { system: 'festival', effectTypes: ['festival_music', 'special_perform'] },
  { system: 'tool', effectTypes: ['tool_upgrade_existing', 'tool_upgrade_speed'] },
  { system: 'relationship', effectTypes: ['errand_bonus'] },
]

const EFFECT_LABELS: Record<string, string> = {
  village_quest_speed: '村务刷新加速',
  village_project_preview: '建设预览',
  mayor_ticket_conversion: '村务票据兑换',
  night_gather_bonus: '夜间采集',
  extra_night_action: '额外夜间行动',
  night_drop_bonus: '夜间掉落',
  price_intel: '价格情报',
  shop_discount_bonus: '商店折扣',
  rare_commission: '稀有委托',
  bulk_buy: '批量采购',
  rare_shop_stock: '稀有货架',
  caravan_map: '商路地图',
  caravan_alert: '商队预告',
  caravan_preorder: '商队预订',
  proxy_buy: '杂货代购',
  extra_warehouse: '仓库扩容',
  rare_consumable: '稀缺消耗品',
  npc_active_service: '村民帮办',
  animal_mood_slow: '动物心情护理',
  breeding_boost: '育种加成',
  spouse_animal_boost: '共牧加成',
  orchard_care: '果树护理',
  grafting: '嫁接',
  rare_sapling: '稀有果苗',
  auto_animal_affection: '动物自动好感',
  animal_tracker: '动物追踪',
  pasture_discovery: '放牧发现',
  mine_extra_node: '矿洞额外节点',
  mine_floor_hint: '矿层提示',
  zhiji_mine_boost: '知己矿洞加成',
  accessory_mine_hint: '配件矿脉提示',
  forge_success_boost: '锻造成功加成',
  accessory_tier2_craft: '二阶配件打造',
  premium_forge: '精锻',
  free_tool_repair: '免费工具修理',
  forge_speed: '锻造加速',
  apprentice_craft: '学徒出品',
  spouse_forge_bonus: '双人锻造',
  fish_odds_display: '鱼获情报',
  tackle_maintain: '渔具维护',
  spouse_fishing_boost: '同舟共钓',
  fishing_easy: '钓鱼指导',
  secret_fishing_style: '秘传钓法',
  deep_water_spot: '深水钓点',
  daily_stamina_regen: '每日体力恢复',
  hot_spring_boost: '温泉疗养',
  herb_preorder: '药材代购',
  herb_craft_boost: '配药协助',
  rare_herb_channel: '珍稀药材渠道',
  equip_durability: '装备耐久',
  custom_equip: '定制装备',
  spouse_equip_bonus: '配偶装备加成',
  cloth_speed: '织布加速',
  free_cloth_repair: '旧布修补',
  ancient_weave: '古法织造',
  embroidery_craft: '刺绣制作',
  embroidery_boost: '刺绣加成',
  premium_embroidery: '精品绣品',
  cook_success_boost: '料理成功加成',
  secret_recipes: '秘方传授',
  daily_tofu: '每日豆腐',
  tofu_workshop: '豆腐坊',
  festival_tofu_feast: '节庆豆腐宴',
  wine_cellar: '酒窖储藏',
  wine_aging_boost: '陈酿指导',
  rare_wine: '稀有佳酿',
  tea_ceremony: '茶艺指导',
  private_tea: '私藏好茶',
  spouse_tea_bonus: '对饮时光',
  farmhouse_portrait: '农舍画像',
  scenic_paintings: '景观点缀',
  calligraphy: '书法题字',
  letter_writing: '信件代笔',
  festival_music: '节庆乐曲',
  special_perform: '特别演出',
  build_speed: '建造指导',
  custom_furniture: '定制家具',
  tool_upgrade_existing: '工具升级',
  tool_upgrade_speed: '工具升级加速',
  tool_bonus_slot: '工具精修',
  herb_gather_bonus: '采药帮手',
  hidden_gather_spots: '隐藏采集点',
  weekly_rare_hint: '稀有资源线索',
  errand_bonus: '跑腿帮忙',
  discovery_clues: '发现线索',
  weekly_surprise: '意外收获',
  legacy_existing: '既有能力'
}

const UNLOCK_VALUE_EFFECTS = new Set([
  'village_project_preview',
  'mayor_ticket_conversion',
  'extra_night_action',
  'price_intel',
  'bulk_buy',
  'rare_shop_stock',
  'caravan_map',
  'caravan_alert',
  'caravan_preorder',
  'proxy_buy',
  'rare_consumable',
  'npc_active_service',
  'grafting',
  'rare_sapling',
  'animal_tracker',
  'mine_floor_hint',
  'accessory_mine_hint',
  'premium_forge',
  'accessory_tier2_craft',
  'free_tool_repair',
  'apprentice_craft',
  'spouse_forge_bonus',
  'fish_odds_display',
  'deep_water_spot',
  'herb_preorder',
  'rare_herb_channel',
  'custom_equip',
  'free_cloth_repair',
  'ancient_weave',
  'embroidery_craft',
  'premium_embroidery',
  'secret_recipes',
  'daily_tofu',
  'tofu_workshop',
  'private_tea',
  'rare_wine',
  'calligraphy',
  'letter_writing',
  'special_perform',
  'custom_furniture',
  'tool_upgrade_existing',
  'tool_bonus_slot',
  'hidden_gather_spots',
  'weekly_rare_hint',
  'discovery_clues',
  'weekly_surprise',
  'legacy_existing'
])

const DAYS_VALUE_EFFECTS = new Set(['village_quest_speed', 'forge_speed', 'tool_upgrade_speed'])
const SLOT_VALUE_EFFECTS = new Set(['extra_warehouse', 'wine_cellar'])
const QUALITY_VALUE_EFFECTS = new Set(['spouse_animal_boost'])
const FLAT_VALUE_EFFECTS = new Set(['daily_stamina_regen', 'auto_animal_affection', 'mine_extra_node', 'herb_gather_bonus', 'errand_bonus'])

const ANY_AGGREGATION_EFFECTS = new Set([...UNLOCK_VALUE_EFFECTS, 'tool_bonus_slot'])
const MAX_AGGREGATION_EFFECTS = new Set(['spouse_animal_boost'])

const getSystemForEffectType = (effectType: string): NpcFunctionEffectSystem => {
  return EFFECT_SYSTEM_RULES.find(rule => rule.effectTypes.includes(effectType))?.system ?? 'legacy'
}

const getValueKindForEffectType = (effectType: string): NpcFunctionEffectValueKind => {
  if (UNLOCK_VALUE_EFFECTS.has(effectType)) return 'unlock'
  if (DAYS_VALUE_EFFECTS.has(effectType)) return 'days'
  if (SLOT_VALUE_EFFECTS.has(effectType)) return 'slots'
  if (QUALITY_VALUE_EFFECTS.has(effectType)) return 'quality'
  if (FLAT_VALUE_EFFECTS.has(effectType)) return 'flat'
  return 'percent'
}

const getAggregationForEffectType = (effectType: string): NpcFunctionEffectAggregation => {
  if (ANY_AGGREGATION_EFFECTS.has(effectType)) return 'any'
  if (MAX_AGGREGATION_EFFECTS.has(effectType)) return 'max'
  return 'sum'
}

const normalizeNumericValue = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0

const getPayloadValue = (def: NpcFunctionUnlockDef): number =>
  normalizeNumericValue(def.effectPayload?.value)

const uniqueEffectTypes = Array.from(new Set(NPC_FUNCTION_UNLOCKS.map(def => def.effectType).filter(Boolean)))

export const NPC_FUNCTION_EFFECTS: NpcFunctionEffectDef[] = uniqueEffectTypes.map(effectType => ({
  effectType,
  label: EFFECT_LABELS[effectType] ?? effectType,
  system: getSystemForEffectType(effectType),
  aggregation: getAggregationForEffectType(effectType),
  valueKind: getValueKindForEffectType(effectType)
}))

export const getRegisteredNpcFunctionEffectTypes = (): string[] =>
  NPC_FUNCTION_EFFECTS.map(def => def.effectType)

export const getNpcFunctionEffectDef = (effectType: string): NpcFunctionEffectDef | undefined =>
  NPC_FUNCTION_EFFECTS.find(def => def.effectType === effectType)

const resolveEffectSourceDefs = (context: NpcFunctionEffectContext = {}): NpcFunctionUnlockDef[] => {
  if (Array.isArray(context.unlockedFunctionDefs)) {
    return context.unlockedFunctionDefs.filter(def => def && typeof def.effectType === 'string')
  }
  if (Array.isArray(context.unlockedFunctionIds)) {
    return context.unlockedFunctionIds
      .map(functionId => getNpcFunctionById(functionId))
      .filter((def): def is NpcFunctionUnlockDef => !!def)
  }
  return []
}

export const getNpcFunctionEffectSources = (
  effectType: string,
  context: NpcFunctionEffectContext = {}
): NpcFunctionUnlockDef[] => resolveEffectSourceDefs(context).filter(def => def.effectType === effectType)

export const isNpcFunctionEffectActive = (
  effectType: string,
  context: NpcFunctionEffectContext = {}
): boolean => getNpcFunctionEffectSources(effectType, context).length > 0

export const getNpcFunctionEffectValue = (
  effectType: string,
  context: NpcFunctionEffectContext = {}
): number => {
  const effectDef = getNpcFunctionEffectDef(effectType)
  const values = getNpcFunctionEffectSources(effectType, context).map(getPayloadValue)
  if (values.length === 0) return 0
  if (effectDef?.aggregation === 'any') return 1
  if (effectDef?.aggregation === 'max') return Math.max(...values)
  return values.reduce((sum, value) => sum + value, 0)
}

export const getNpcFunctionEffectSummaries = (
  context: NpcFunctionEffectContext = {}
): NpcFunctionEffectSummary[] => {
  const sourceDefs = resolveEffectSourceDefs(context)
  const sourceIdsByEffect = new Map<string, NpcFunctionUnlockDef[]>()
  for (const def of sourceDefs) {
    if (!sourceIdsByEffect.has(def.effectType)) sourceIdsByEffect.set(def.effectType, [])
    sourceIdsByEffect.get(def.effectType)!.push(def)
  }

  return [...sourceIdsByEffect.entries()]
    .map(([effectType, defs]) => {
      const effectDef = getNpcFunctionEffectDef(effectType)
      return {
        effectType,
        label: effectDef?.label ?? effectType,
        system: effectDef?.system ?? 'legacy',
        value: getNpcFunctionEffectValue(effectType, { unlockedFunctionDefs: defs }),
        valueKind: effectDef?.valueKind ?? 'flat',
        sourceFunctionIds: defs.map(def => def.id),
        sourceTitles: defs.map(def => def.title)
      }
    })
    .sort((left, right) => left.system.localeCompare(right.system) || left.label.localeCompare(right.label))
}

export const getUnlockedNpcFunctionEffectSummary = (
  unlockedFunctionIds: string[]
): NpcFunctionEffectSummary[] => getNpcFunctionEffectSummaries({ unlockedFunctionIds })
