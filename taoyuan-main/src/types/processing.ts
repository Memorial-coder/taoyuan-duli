import type { Quality } from './item'
import type { FishingLocation } from './skill'

/** 加工机器类型 */
export type MachineType =
  | 'wine_workshop'
  | 'sauce_jar'
  | 'sugar_jar'
  | 'bee_house'
  | 'oil_press'
  | 'mayo_maker'
  | 'seed_maker'
  | 'crystal_duplicator'
  | 'smoker'
  | 'drying_rack'
  | 'dehydrator'
  | 'recycler'
  | 'cheese_press'
  | 'loom'
  | 'furnace'
  | 'charcoal_kiln'
  | 'mill'
  | 'worm_bin'
  | 'tea_maker'
  | 'tofu_press'
  | 'herb_grinder'
  | 'alchemy_furnace'
  | 'incense_maker'
  | 'spirit_forge'

/** 加工机器定义 */
export interface ProcessingMachineDef {
  id: MachineType
  name: string
  description: string
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
  /** 完成后自动收取产物（默认 false，需手动收取） */
  autoCollect?: boolean
}

export type AlchemyPillRole = 'main' | 'support'

export type AlchemyNature = 'clear' | 'warm' | 'spicy' | 'fragrant' | 'root' | 'spirit_fruit'

export type AlchemyHeat = 'gentle' | 'steady' | 'strong'

export type AlchemyResultKind = 'success' | 'partial' | 'failed' | 'rare'

export interface AlchemyResultRule {
  kind: AlchemyResultKind
  outputItemId: string
  outputQuantity: number
  weight: number
  label: string
  description: string
}

export interface AlchemyRecipeMeta {
  role: AlchemyPillRole
  nature: AlchemyNature
  mainMaterialId: string
  supportMaterialIds: string[]
  primerItemId: string
  heat: AlchemyHeat
  shortEffect: string
  results?: AlchemyResultRule[]
  effect: {
    description: string
    staminaRestore?: number
    miningStaminaReduction?: number
    journeyStaminaReduction?: number
    giftBonusMultiplier?: number
    actionSpeedBonus?: number
    defenseReduction?: number
    dialogueAffinityBonus?: number
    festivalRewardMultiplier?: number
    petCalmFriendshipBonus?: number
  }
}

/** 加工配方定义 */
export interface ProcessingRecipeDef {
  id: string
  machineType: MachineType
  name: string
  /** 输入物品ID（null = 无需输入，如蜂箱） */
  inputItemId: string | null
  inputQuantity: number
  /** 主输入最低品质要求（如高阶炼丹消耗优质作物） */
  minInputQuality?: Quality
  /** 额外副材料（合金配方等多输入场景） */
  extraInputs?: { itemId: string; quantity: number }[]
  outputItemId: string
  outputQuantity: number
  /** 加工天数 */
  processingDays: number
  description: string
  /** 炼丹配方结构与每日限制信息 */
  alchemy?: AlchemyRecipeMeta
}

/** 运行时加工槽位 */
export interface ProcessingSlot {
  machineType: MachineType
  recipeId: string | null
  inputItemId: string | null
  inputQuality?: Quality
  alchemyResult?: {
    kind: AlchemyResultKind
    outputItemId: string
    outputQuantity: number
    label: string
    description: string
  }
  daysProcessed: number
  totalDays: number
  ready: boolean
}

/** 洒水器类型 */
export type SprinklerType = 'bamboo_sprinkler' | 'copper_sprinkler' | 'gold_sprinkler'

/** 洒水器定义 */
export interface SprinklerDef {
  id: SprinklerType
  name: string
  description: string
  range: 4 | 8 | 24
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
}

/** 肥料类型 */
export type FertilizerType =
  | 'basic_fertilizer'
  | 'quality_fertilizer'
  | 'speed_gro'
  | 'deluxe_speed_gro'
  | 'retaining_soil'
  | 'quality_retaining_soil'

/** 肥料定义 */
export interface FertilizerDef {
  id: FertilizerType
  name: string
  description: string
  /** 品质提升概率加成 (0.2 = +20%) */
  qualityBonus?: number
  /** 生长速度加成百分比 (0.25 = +25%) */
  growthSpeedup?: number
  /** 隔夜保水概率 (0.5 = 50%) */
  retainChance?: number
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
  shopPrice: number | null
}

/** 鱼饵类型 */
export type BaitType = 'standard_bait' | 'wild_bait' | 'magic_bait' | 'deluxe_bait' | 'targeted_bait'

/** 鱼饵定义 */
export interface BaitDef {
  id: BaitType
  name: string
  description: string
  /** 行为概率修正 (calm/struggle/dash 增减) */
  behaviorModifier?: { calm: number; struggle: number; dash: number }
  /** 双倍鱼获概率 */
  doubleCatchChance?: number
  /** 是否无视季节限制 */
  ignoresSeason?: boolean
  /** 挣扎成功率加成 */
  struggleBonus?: number
  /** 困难鱼权重倍率 */
  hardWeightMult?: number
  /** 传说鱼权重倍率 */
  legendaryWeightMult?: number
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
  shopPrice: number | null
}

/** 浮漂类型 */
export type TackleType = 'spinner' | 'trap_bobber' | 'cork_bobber' | 'quality_bobber' | 'lead_bobber'

/** 浮漂定义 */
export interface TackleDef {
  id: TackleType
  name: string
  description: string
  maxDurability: number
  requiredRodTier: 'iron' | 'steel' | 'iridium'
  /** 体力消耗减免 (0.5 = -50%) */
  staminaReduction?: number
  /** 断线时额外机会次数 */
  extraBreakChance?: number
  /** 挣扎成功率加成 */
  struggleBonus?: number
  /** 鱼品质提升档数 */
  qualityBoost?: number
  /** 危险行为概率减免 (0.1 = dash/surge 各 -10%) */
  dangerReduction?: number
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
  shopPrice: number | null
}

/** 炸弹定义 */
export interface BombDef {
  id: string
  name: string
  description: string
  oreMultiplier: number
  clearsMonster: boolean
  craftCost: { itemId: string; quantity: number }[]
  craftMoney: number
  shopPrice: number | null
}

/** 野树类型 */
export type WildTreeType = 'pine' | 'camphor' | 'mulberry'

/** 野树定义 */
export interface WildTreeDef {
  type: WildTreeType
  name: string
  seedItemId: string
  growthDays: number
  tapProduct: string
  tapCycleDays: number
  tapProductName: string
}

/** 已种植的野树(运行时状态) */
export interface PlantedWildTree {
  id: number
  type: WildTreeType
  growthDays: number
  mature: boolean
  hasTapper: boolean
  tapDaysElapsed: number
  tapReady: boolean
  /** 已伐木次数（>=3 时树消失） */
  chopCount: number
}

/** 蟹笼状态 */
export interface CrabPotState {
  location: FishingLocation
  hasBait: boolean
}
