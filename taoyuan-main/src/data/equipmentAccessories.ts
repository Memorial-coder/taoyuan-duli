import type {
  EquipmentAccessoryDailyPurchaseState,
  EquipmentAccessoryDef,
  EquipmentAccessoryDismantleRule,
  EquipmentAccessoryEffectKey,
  EquipmentAccessoryFamilyId,
  EquipmentAccessoryFusionRule,
  EquipmentAccessoryMaterialCost,
  EquipmentAccessoryPityKey,
  EquipmentAccessoryQuality,
  EquipmentAccessoryRecipeDef,
  EquipmentAccessorySaveData,
  EquipmentAccessorySetBonusDef,
  EquipmentAccessorySetSummary,
  EquipmentAccessorySlotId,
  EquipmentAccessoryTier,
  EquipmentAccessoryUpgradeCostDef,
  EquipmentAccessoryUpgradeInvestment,
  EquippedEquipmentAccessorySlots,
  OwnedEquipmentAccessory
} from '@/types/equipmentAccessory'

export const EQUIPMENT_ACCESSORY_SAVE_VERSION = 1
export const EQUIPMENT_ACCESSORY_MAX_LEVEL = 20
export const EQUIPMENT_ACCESSORY_GAME_YEAR_DAYS = 112
export const EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID = 'accessory_material'
export const EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID = 'accessory_tuning_stone'
export const EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID = 'accessory_protection_sand'

export const EQUIPMENT_ACCESSORY_FAMILIES: Array<{
  id: EquipmentAccessoryFamilyId
  label: string
  description: string
  slotIds: EquipmentAccessorySlotId[]
}> = [
  {
    id: 'weaponry',
    label: '兵刃',
    description: '强化战斗输出、暴击和战斗耗时。',
    slotIds: ['weaponry_blade_core', 'weaponry_guard', 'weaponry_inscription']
  },
  {
    id: 'armor',
    label: '护具',
    description: '强化生命、防御、昏倒损失和耐久消耗。',
    slotIds: ['armor_lining', 'armor_talisman', 'armor_tread']
  },
  {
    id: 'gathering',
    label: '采具',
    description: '强化挖矿体力、额外矿石、采石场和宝物提示。',
    slotIds: ['gathering_pick_head', 'gathering_grip', 'gathering_probe']
  }
]

export const EQUIPMENT_ACCESSORY_SLOT_IDS = EQUIPMENT_ACCESSORY_FAMILIES.flatMap(family => family.slotIds)

export const EQUIPMENT_ACCESSORY_TIERS: EquipmentAccessoryTier[] = [1, 2, 3, 4]
export const EQUIPMENT_ACCESSORY_QUALITIES: EquipmentAccessoryQuality[] = ['normal', 'fine', 'excellent', 'supreme']

export const EQUIPMENT_ACCESSORY_TIER_LABELS: Record<EquipmentAccessoryTier, string> = {
  1: '一阶',
  2: '二阶',
  3: '三阶',
  4: '四阶'
}
export const EQUIPMENT_ACCESSORY_QUALITY_LABELS: Record<EquipmentAccessoryQuality, string> = {
  normal: '普通',
  fine: '精良',
  excellent: '卓越',
  supreme: '极品'
}

export const EQUIPMENT_ACCESSORY_QUALITY_ORDER: Record<EquipmentAccessoryQuality, number> = {
  normal: 1,
  fine: 2,
  excellent: 3,
  supreme: 4
}

export const EQUIPMENT_ACCESSORY_TIER_MULTIPLIERS: Record<EquipmentAccessoryTier, number> = {
  1: 1,
  2: 1.35,
  3: 1.75,
  4: 2.2
}

export const EQUIPMENT_ACCESSORY_QUALITY_MULTIPLIERS: Record<EquipmentAccessoryQuality, number> = {
  normal: 1,
  fine: 1.15,
  excellent: 1.35,
  supreme: 1.6
}

export const EQUIPMENT_ACCESSORY_DEFS: EquipmentAccessoryDef[] = [
  {
    id: 'weaponry_blade_core',
    familyId: 'weaponry',
    slotId: 'weaponry_blade_core',
    name: '刃芯',
    shortName: '刃芯',
    description: '嵌入兵刃核心的锋芒部件，提升攻击。',
    icon: 'accessory_blade_core',
    frame: 'weaponry',
    effects: [{ key: 'accessory_attack_flat', basePerLevel: 0.15, maxValue: 8, label: '攻击', unit: 'flat' }]
  },
  {
    id: 'weaponry_guard',
    familyId: 'weaponry',
    slotId: 'weaponry_guard',
    name: '护手',
    shortName: '护手',
    description: '稳住出招的护手部件，提升暴击。',
    icon: 'accessory_guard',
    frame: 'weaponry',
    effects: [{ key: 'accessory_crit_rate', basePerLevel: 0.0008, maxValue: 0.04, label: '暴击率', unit: 'percent' }]
  },
  {
    id: 'weaponry_inscription',
    familyId: 'weaponry',
    slotId: 'weaponry_inscription',
    name: '铭印',
    shortName: '铭印',
    description: '刻写战法的铭印部件，略微缩短战斗耗时。',
    icon: 'accessory_inscription',
    frame: 'weaponry',
    effects: [{ key: 'accessory_combat_time_reduction', basePerLevel: 0.001, maxValue: 0.05, label: '战斗耗时降低', unit: 'percent' }]
  },
  {
    id: 'armor_lining',
    familyId: 'armor',
    slotId: 'armor_lining',
    name: '内衬',
    shortName: '内衬',
    description: '贴身护具内衬，提升生命上限。',
    icon: 'accessory_lining',
    frame: 'armor',
    effects: [{ key: 'accessory_max_hp_flat', basePerLevel: 0.45, maxValue: 25, label: '生命上限', unit: 'flat' }]
  },
  {
    id: 'armor_talisman',
    familyId: 'armor',
    slotId: 'armor_talisman',
    name: '护符',
    shortName: '护符',
    description: '随身护符，降低受到伤害。',
    icon: 'accessory_talisman',
    frame: 'armor',
    effects: [{ key: 'accessory_damage_reduction', basePerLevel: 0.001, maxValue: 0.05, label: '受到伤害降低', unit: 'percent' }]
  },
  {
    id: 'armor_tread',
    familyId: 'armor',
    slotId: 'armor_tread',
    name: '履带',
    shortName: '履带',
    description: '分散冲击的履带部件，降低装备耐久消耗。',
    icon: 'accessory_tread',
    frame: 'armor',
    effects: [{ key: 'accessory_durability_consumption_reduction', basePerLevel: 0.0016, maxValue: 0.08, label: '耐久消耗降低', unit: 'percent' }]
  },
  {
    id: 'gathering_pick_head',
    familyId: 'gathering',
    slotId: 'gathering_pick_head',
    name: '镐头',
    shortName: '镐头',
    description: '用于采矿的锋利镐头，降低挖矿体力消耗。',
    icon: 'accessory_pick_head',
    frame: 'gathering',
    effects: [{ key: 'accessory_mining_stamina_reduction', basePerLevel: 0.0012, maxValue: 0.06, label: '挖矿体力降低', unit: 'percent' }]
  },
  {
    id: 'gathering_grip',
    familyId: 'gathering',
    slotId: 'gathering_grip',
    name: '握柄',
    shortName: '握柄',
    description: '让采具更顺手的握柄，提高额外矿石概率。',
    icon: 'accessory_grip',
    frame: 'gathering',
    effects: [{ key: 'accessory_ore_bonus_chance', basePerLevel: 0.0012, maxValue: 0.06, label: '额外矿石概率', unit: 'percent' }]
  },
  {
    id: 'gathering_probe',
    familyId: 'gathering',
    slotId: 'gathering_probe',
    name: '探针',
    shortName: '探针',
    description: '探查矿脉的细长探针，提高采石场额外收益。',
    icon: 'accessory_probe',
    frame: 'gathering',
    effects: [
      { key: 'accessory_quarry_double_chance', basePerLevel: 0.001, maxValue: 0.06, label: '采石场额外产物', unit: 'percent' },
      { key: 'accessory_treasure_hint', basePerLevel: 0.02, maxValue: 1, label: '宝物提示', unit: 'hint' }
    ]
  }
]

export const EQUIPMENT_ACCESSORY_UPGRADE_COSTS: EquipmentAccessoryUpgradeCostDef[] = [
  { targetLevel: 2, accessoryMaterial: 4, tuningStone: 0, money: 200, extraItems: [] },
  { targetLevel: 3, accessoryMaterial: 6, tuningStone: 0, money: 300, extraItems: [] },
  { targetLevel: 4, accessoryMaterial: 8, tuningStone: 0, money: 500, extraItems: [] },
  { targetLevel: 5, accessoryMaterial: 10, tuningStone: 0, money: 800, extraItems: [] },
  { targetLevel: 6, accessoryMaterial: 16, tuningStone: 0, money: 1200, extraItems: [{ itemId: 'copper_bar', quantity: 1 }] },
  { targetLevel: 7, accessoryMaterial: 22, tuningStone: 0, money: 1800, extraItems: [{ itemId: 'copper_bar', quantity: 1 }] },
  { targetLevel: 8, accessoryMaterial: 30, tuningStone: 1, money: 2600, extraItems: [{ itemId: 'iron_bar', quantity: 1 }] },
  { targetLevel: 9, accessoryMaterial: 40, tuningStone: 1, money: 3600, extraItems: [{ itemId: 'iron_bar', quantity: 1 }] },
  { targetLevel: 10, accessoryMaterial: 52, tuningStone: 1, money: 5000, extraItems: [{ itemId: 'iron_bar', quantity: 2 }] },
  { targetLevel: 11, accessoryMaterial: 70, tuningStone: 2, money: 7000, extraItems: [{ itemId: 'gold_bar', quantity: 1 }] },
  { targetLevel: 12, accessoryMaterial: 90, tuningStone: 2, money: 9500, extraItems: [{ itemId: 'gold_bar', quantity: 1 }] },
  { targetLevel: 13, accessoryMaterial: 115, tuningStone: 3, money: 12500, extraItems: [{ itemId: 'gold_bar', quantity: 2 }] },
  { targetLevel: 14, accessoryMaterial: 145, tuningStone: 3, money: 16000, extraItems: [{ itemId: 'mythril_bar', quantity: 1 }] },
  { targetLevel: 15, accessoryMaterial: 180, tuningStone: 4, money: 20000, extraItems: [{ itemId: 'mythril_bar', quantity: 1 }] },
  { targetLevel: 16, accessoryMaterial: 230, tuningStone: 5, money: 26000, extraItems: [{ itemId: 'mythril_bar', quantity: 2 }] },
  { targetLevel: 17, accessoryMaterial: 290, tuningStone: 6, money: 33000, extraItems: [{ itemId: 'iridium_bar', quantity: 1 }] },
  { targetLevel: 18, accessoryMaterial: 360, tuningStone: 8, money: 42000, extraItems: [{ itemId: 'iridium_bar', quantity: 1 }, { itemId: 'moonstone', quantity: 1 }] },
  { targetLevel: 19, accessoryMaterial: 450, tuningStone: 10, money: 54000, extraItems: [{ itemId: 'iridium_bar', quantity: 2 }, { itemId: 'moonstone', quantity: 1 }] },
  { targetLevel: 20, accessoryMaterial: 560, tuningStone: 12, money: 70000, extraItems: [{ itemId: 'iridium_bar', quantity: 2 }, { itemId: 'prismatic_shard', quantity: 1 }] }
]

export const EQUIPMENT_ACCESSORY_RECIPES: EquipmentAccessoryRecipeDef[] = EQUIPMENT_ACCESSORY_DEFS.flatMap(def => [
  {
    id: `${def.id}:tier1`,
    defId: def.id,
    tier: 1,
    unlock: 'default',
    qualityRolls: [
      { quality: 'normal', weight: 86 },
      { quality: 'fine', weight: 14 }
    ],
    materialCosts: [
      { itemId: 'copper_ore', quantity: 8 },
      { itemId: 'stone', quantity: 12 },
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: 8 }
    ],
    moneyCost: 600
  },
  {
    id: `${def.id}:tier2`,
    defId: def.id,
    tier: 2,
    unlock: 'workshop_advanced',
    qualityRolls: [
      { quality: 'normal', weight: 90 },
      { quality: 'fine', weight: 10 }
    ],
    materialCosts: [
      { itemId: 'iron_bar', quantity: 2 },
      { itemId: 'crystal_ore', quantity: 3 },
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: 20 }
    ],
    moneyCost: 1800
  },
  {
    id: `${def.id}:tier4`,
    defId: def.id,
    tier: 4,
    unlock: 'blueprint',
    qualityRolls: [{ quality: 'normal', weight: 100 }],
    materialCosts: [
      { itemId: 'iridium_bar', quantity: 2 },
      { itemId: 'prismatic_shard', quantity: 1 },
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: 80 },
      { itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: 6 }
    ],
    moneyCost: 12000
  }
])

export const EQUIPMENT_ACCESSORY_FUSION_RULES: EquipmentAccessoryFusionRule[] = [
  { tier: 1, fromQuality: 'normal', toQuality: 'fine', successRate: 0.8, pityThreshold: 3 },
  { tier: 1, fromQuality: 'fine', toQuality: 'excellent', successRate: 0.55, pityThreshold: 5 },
  { tier: 1, fromQuality: 'excellent', toQuality: 'supreme', successRate: 0.25, pityThreshold: 8 },
  { tier: 2, fromQuality: 'normal', toQuality: 'fine', successRate: 0.7, pityThreshold: 3 },
  { tier: 2, fromQuality: 'fine', toQuality: 'excellent', successRate: 0.45, pityThreshold: 5 },
  { tier: 2, fromQuality: 'excellent', toQuality: 'supreme', successRate: 0.18, pityThreshold: 8 },
  { tier: 3, fromQuality: 'normal', toQuality: 'fine', successRate: 0.6, pityThreshold: 3 },
  { tier: 3, fromQuality: 'fine', toQuality: 'excellent', successRate: 0.35, pityThreshold: 5 },
  { tier: 3, fromQuality: 'excellent', toQuality: 'supreme', successRate: 0.12, pityThreshold: 8 },
  { tier: 4, fromQuality: 'normal', toQuality: 'fine', successRate: 0.5, pityThreshold: 3 },
  { tier: 4, fromQuality: 'fine', toQuality: 'excellent', successRate: 0.28, pityThreshold: 5 },
  { tier: 4, fromQuality: 'excellent', toQuality: 'supreme', successRate: 0.08, pityThreshold: 8 }
]

export const EQUIPMENT_ACCESSORY_SET_BONUSES: EquipmentAccessorySetBonusDef[] = [
  {
    familyId: 'weaponry',
    label: '兵刃三件',
    description: '三件兵刃配件齐备时提升战斗节奏。',
    effects: [
      { key: 'accessory_attack_flat', basePerLevel: 0.04, maxValue: 3, label: '套装攻击', unit: 'flat' },
      { key: 'accessory_combat_time_reduction', basePerLevel: 0.00045, maxValue: 0.02, label: '套装战斗耗时降低', unit: 'percent' }
    ]
  },
  {
    familyId: 'armor',
    label: '护具三件',
    description: '三件护具配件齐备时提升生存和损失控制。',
    effects: [
      { key: 'accessory_max_hp_flat', basePerLevel: 0.16, maxValue: 8, label: '套装生命', unit: 'flat' },
      { key: 'accessory_passout_loss_reduction', basePerLevel: 0.001, maxValue: 0.08, label: '昏倒损失降低', unit: 'percent' }
    ]
  },
  {
    familyId: 'gathering',
    label: '采具三件',
    description: '三件采具配件齐备时提升矿洞和采石场收益。',
    effects: [
      { key: 'accessory_mining_stamina_reduction', basePerLevel: 0.00045, maxValue: 0.025, label: '套装挖矿体力降低', unit: 'percent' },
      { key: 'accessory_ore_bonus_chance', basePerLevel: 0.00045, maxValue: 0.025, label: '套装额外矿石概率', unit: 'percent' }
    ]
  }
]

export const EQUIPMENT_ACCESSORY_DISMANTLE_RULES: EquipmentAccessoryDismantleRule[] =
  EQUIPMENT_ACCESSORY_TIERS.flatMap(tier =>
    EQUIPMENT_ACCESSORY_QUALITIES.map(quality => {
      const qualityRank = EQUIPMENT_ACCESSORY_QUALITY_ORDER[quality]
      return {
        tier,
        quality,
        baseRefundItems: [
          {
            itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
            quantity: Math.max(1, Math.floor(tier * qualityRank * 3))
          }
        ]
      }
    })
  )

export const EQUIPMENT_ACCESSORY_DAILY_PURCHASES = [
  {
    id: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
    itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
    label: '配件材料',
    dailyLimit: 8,
    unitPrice: 180
  },
  {
    id: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
    itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
    label: '调校石',
    dailyLimit: 1,
    unitPrice: 2600
  },
  {
    id: EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
    itemId: EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
    label: '稳固石',
    dailyLimit: 1,
    unitPrice: 4800
  }
]

const toPositiveInt = (value: unknown, fallback = 0): number => {
  const num = Math.floor(Number(value))
  return Number.isFinite(num) ? Math.max(0, num) : fallback
}

export const createEmptyAccessoryInvestment = (): EquipmentAccessoryUpgradeInvestment => ({
  accessoryMaterial: 0,
  tuningStone: 0
})

export const createDefaultEquipmentAccessoryDailyPurchaseState = (): EquipmentAccessoryDailyPurchaseState => ({
  dayTag: '',
  purchased: {}
})

export const createDefaultEquipmentAccessorySaveData = (): EquipmentAccessorySaveData => ({
  saveVersion: EQUIPMENT_ACCESSORY_SAVE_VERSION,
  ownedAccessories: [],
  equippedSlots: Object.fromEntries(EQUIPMENT_ACCESSORY_SLOT_IDS.map(slotId => [slotId, null])) as EquippedEquipmentAccessorySlots,
  unlockedBlueprints: [1],
  fusionPityState: {},
  dailyPurchaseState: createDefaultEquipmentAccessoryDailyPurchaseState(),
  nextInstanceSeq: 1
})

export const getEquipmentAccessoryDef = (id: EquipmentAccessorySlotId | string): EquipmentAccessoryDef | undefined =>
  EQUIPMENT_ACCESSORY_DEFS.find(def => def.id === id)

export const getEquipmentAccessoryFamily = (familyId: EquipmentAccessoryFamilyId | string) =>
  EQUIPMENT_ACCESSORY_FAMILIES.find(family => family.id === familyId)

export const getEquipmentAccessoryRecipe = (
  defId: EquipmentAccessorySlotId,
  tier: EquipmentAccessoryTier
): EquipmentAccessoryRecipeDef | undefined =>
  EQUIPMENT_ACCESSORY_RECIPES.find(recipe => recipe.defId === defId && recipe.tier === tier)

export const getEquipmentAccessoryUpgradeCost = (targetLevel: number): EquipmentAccessoryUpgradeCostDef | undefined =>
  EQUIPMENT_ACCESSORY_UPGRADE_COSTS.find(cost => cost.targetLevel === targetLevel)

export const getEquipmentAccessoryFusionRule = (
  tier: EquipmentAccessoryTier,
  quality: EquipmentAccessoryQuality
): EquipmentAccessoryFusionRule | undefined =>
  EQUIPMENT_ACCESSORY_FUSION_RULES.find(rule => rule.tier === tier && rule.fromQuality === quality)

export const getNextEquipmentAccessoryQuality = (quality: EquipmentAccessoryQuality): EquipmentAccessoryQuality | null => {
  const index = EQUIPMENT_ACCESSORY_QUALITIES.indexOf(quality)
  return index >= 0 ? EQUIPMENT_ACCESSORY_QUALITIES[index + 1] ?? null : null
}

export const buildEquipmentAccessoryPityKey = (
  defId: EquipmentAccessorySlotId,
  tier: EquipmentAccessoryTier,
  targetQuality: EquipmentAccessoryQuality
): EquipmentAccessoryPityKey => `${defId}:${tier}:${targetQuality}`

export const normalizeEquipmentAccessoryTier = (value: unknown, fallback: EquipmentAccessoryTier = 1): EquipmentAccessoryTier => {
  const tier = Math.floor(Number(value))
  return EQUIPMENT_ACCESSORY_TIERS.includes(tier as EquipmentAccessoryTier) ? tier as EquipmentAccessoryTier : fallback
}

export const normalizeEquipmentAccessoryQuality = (
  value: unknown,
  fallback: EquipmentAccessoryQuality = 'normal'
): EquipmentAccessoryQuality =>
  EQUIPMENT_ACCESSORY_QUALITIES.includes(value as EquipmentAccessoryQuality) ? value as EquipmentAccessoryQuality : fallback

export const normalizeEquipmentAccessoryLevel = (value: unknown): number =>
  Math.max(1, Math.min(EQUIPMENT_ACCESSORY_MAX_LEVEL, toPositiveInt(value, 1)))

export const normalizeEquipmentAccessoryInvestment = (
  value: Partial<EquipmentAccessoryUpgradeInvestment> | undefined,
  level?: number
): EquipmentAccessoryUpgradeInvestment => {
  const maxInvestment = level ? getEquipmentAccessoryTotalUpgradeInvestment(level) : null
  return {
    accessoryMaterial: Math.min(toPositiveInt(value?.accessoryMaterial), maxInvestment?.accessoryMaterial ?? Number.MAX_SAFE_INTEGER),
    tuningStone: Math.min(toPositiveInt(value?.tuningStone), maxInvestment?.tuningStone ?? Number.MAX_SAFE_INTEGER)
  }
}

export const getEquipmentAccessoryTotalUpgradeInvestment = (level: number): EquipmentAccessoryUpgradeInvestment => {
  const safeLevel = normalizeEquipmentAccessoryLevel(level)
  return EQUIPMENT_ACCESSORY_UPGRADE_COSTS
    .filter(cost => cost.targetLevel <= safeLevel)
    .reduce<EquipmentAccessoryUpgradeInvestment>((total, cost) => ({
      accessoryMaterial: total.accessoryMaterial + cost.accessoryMaterial,
      tuningStone: total.tuningStone + cost.tuningStone
    }), createEmptyAccessoryInvestment())
}

export const getEquipmentAccessoryTotalUpgradeMoney = (level: number): number => {
  const safeLevel = normalizeEquipmentAccessoryLevel(level)
  return EQUIPMENT_ACCESSORY_UPGRADE_COSTS
    .filter(cost => cost.targetLevel <= safeLevel)
    .reduce((sum, cost) => sum + cost.money, 0)
}

export const getEquipmentAccessoryLevelCurve = (level: number): number => {
  const safeLevel = normalizeEquipmentAccessoryLevel(level)
  if (safeLevel <= 5) return safeLevel
  if (safeLevel <= 10) return 5 + (safeLevel - 5) * 1.08
  if (safeLevel <= 15) return 10.4 + (safeLevel - 10) * 0.92
  return 15 + (safeLevel - 15) * 0.78
}

export const getEquipmentAccessoryEffectValue = (
  accessory: Pick<OwnedEquipmentAccessory, 'defId' | 'tier' | 'quality' | 'level'>,
  effectKey: EquipmentAccessoryEffectKey
): number => {
  const def = getEquipmentAccessoryDef(accessory.defId)
  const effect = def?.effects.find(entry => entry.key === effectKey)
  if (!effect) return 0
  const rawValue = effect.basePerLevel *
    getEquipmentAccessoryLevelCurve(accessory.level) *
    EQUIPMENT_ACCESSORY_TIER_MULTIPLIERS[accessory.tier] *
    EQUIPMENT_ACCESSORY_QUALITY_MULTIPLIERS[accessory.quality]
  return Math.min(effect.maxValue, rawValue)
}

export const getEquipmentAccessoryEffectSummary = (
  accessories: Array<Pick<OwnedEquipmentAccessory, 'defId' | 'tier' | 'quality' | 'level'>>
): Partial<Record<EquipmentAccessoryEffectKey, number>> => {
  const totals: Partial<Record<EquipmentAccessoryEffectKey, number>> = {}
  for (const accessory of accessories) {
    const def = getEquipmentAccessoryDef(accessory.defId)
    for (const effect of def?.effects ?? []) {
      totals[effect.key] = (totals[effect.key] ?? 0) + getEquipmentAccessoryEffectValue(accessory, effect.key)
    }
  }
  return totals
}

export const getEquipmentAccessorySetQuality = (accessories: OwnedEquipmentAccessory[]): EquipmentAccessoryQuality | null => {
  if (accessories.length < 3) return null
  const average = Math.floor(accessories.reduce((sum, accessory) => sum + EQUIPMENT_ACCESSORY_QUALITY_ORDER[accessory.quality], 0) / accessories.length)
  return EQUIPMENT_ACCESSORY_QUALITIES.find(quality => EQUIPMENT_ACCESSORY_QUALITY_ORDER[quality] === average) ?? 'normal'
}

export const getEquipmentAccessorySetSummary = (
  familyId: EquipmentAccessoryFamilyId,
  equippedAccessories: OwnedEquipmentAccessory[]
): EquipmentAccessorySetSummary => {
  const family = getEquipmentAccessoryFamily(familyId)
  const inFamily = equippedAccessories.filter(accessory => getEquipmentAccessoryDef(accessory.defId)?.familyId === familyId)
  const active = !!family && inFamily.length === family.slotIds.length
  const setTier = active ? Math.min(...inFamily.map(accessory => accessory.tier)) as EquipmentAccessoryTier : null
  const setQuality = active ? getEquipmentAccessorySetQuality(inFamily) : null
  const averageLevel = inFamily.length > 0
    ? Math.floor(inFamily.reduce((sum, accessory) => sum + accessory.level, 0) / inFamily.length)
    : 0
  const effectValues: Partial<Record<EquipmentAccessoryEffectKey, number>> = {}

  if (active && setTier && setQuality) {
    const setBonus = EQUIPMENT_ACCESSORY_SET_BONUSES.find(entry => entry.familyId === familyId)
    const qualityMultiplier = EQUIPMENT_ACCESSORY_QUALITY_MULTIPLIERS[setQuality]
    const tierMultiplier = EQUIPMENT_ACCESSORY_TIER_MULTIPLIERS[setTier]
    const levelCurve = getEquipmentAccessoryLevelCurve(Math.max(1, averageLevel))
    for (const effect of setBonus?.effects ?? []) {
      effectValues[effect.key] = Math.min(effect.maxValue, effect.basePerLevel * levelCurve * tierMultiplier * qualityMultiplier)
    }
  }

  return {
    familyId,
    label: family?.label ?? familyId,
    equippedCount: inFamily.length,
    setTier,
    setQuality,
    averageLevel,
    active,
    effectValues
  }
}

export const getEquipmentAccessoryBaseDismantleRefund = (
  tier: EquipmentAccessoryTier,
  quality: EquipmentAccessoryQuality
): EquipmentAccessoryMaterialCost[] =>
  EQUIPMENT_ACCESSORY_DISMANTLE_RULES.find(rule => rule.tier === tier && rule.quality === quality)?.baseRefundItems.map(item => ({ ...item })) ?? []

export const getEquipmentAccessoryAnnualPace = () => {
  const total = getEquipmentAccessoryTotalUpgradeInvestment(EQUIPMENT_ACCESSORY_MAX_LEVEL)
  return {
    days: EQUIPMENT_ACCESSORY_GAME_YEAR_DAYS,
    totalAccessoryMaterial: total.accessoryMaterial,
    totalTuningStone: total.tuningStone,
    dailyAccessoryMaterialEquivalent: total.accessoryMaterial / EQUIPMENT_ACCESSORY_GAME_YEAR_DAYS
  }
}
