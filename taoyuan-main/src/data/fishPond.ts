import type { PondLevel, PondableFishDef, FishGenetics } from '@/types/fishPond'

// === 建造/升级费用 ===

export const POND_BUILD_COST = {
  money: 5000,
  materials: [
    { itemId: 'wood', quantity: 100 },
    { itemId: 'bamboo', quantity: 50 }
  ]
}

export const POND_UPGRADE_COSTS: Record<2 | 3 | 4 | 5, { money: number; materials: { itemId: string; quantity: number }[] }> = {
  2: {
    money: 10000,
    materials: [
      { itemId: 'wood', quantity: 100 },
      { itemId: 'iron_bar', quantity: 5 }
    ]
  },
  3: {
    money: 25000,
    materials: [
      { itemId: 'wood', quantity: 200 },
      { itemId: 'gold_bar', quantity: 5 },
      { itemId: 'iron_bar', quantity: 10 }
    ]
  },
  4: {
    money: 50000,
    materials: [
      { itemId: 'wood', quantity: 300 },
      { itemId: 'gold_bar', quantity: 10 },
      { itemId: 'iridium_ore', quantity: 5 }
    ]
  },
  5: {
    money: 100000,
    materials: [
      { itemId: 'wood', quantity: 400 },
      { itemId: 'iridium_ore', quantity: 10 },
      { itemId: 'iron_bar', quantity: 20 },
      { itemId: 'gold_bar', quantity: 10 }
    ]
  }
}

// === 容量 ===

export const POND_CAPACITY: Record<PondLevel, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 30,
  5: 40
}

// === 水质参数 ===

/** 基础水质衰减/天 */
export const WATER_QUALITY_DECAY_BASE = 2
/** 密度 > 50% 额外衰减 */
export const WATER_QUALITY_DECAY_HALF = 2
/** 密度 > 80% 额外衰减 */
export const WATER_QUALITY_DECAY_CROWDED = 3
/** 未喂食额外衰减 */
export const WATER_QUALITY_DECAY_HUNGRY = 5

/** 水质低于此值开始有生病概率 */
export const DISEASE_THRESHOLD = 30
/** 每日生病基础概率 */
export const DISEASE_CHANCE_BASE = 0.05
/** 连续生病致死天数 */
export const SICK_DEATH_DAYS = 5

/** 喂食恢复水质 */
export const FEED_WATER_RESTORE = 10
/** 水质改良剂恢复水质 */
export const PURIFIER_WATER_RESTORE = 30

/** 繁殖周期（天） */
export const FISH_BREEDING_DAYS = 3

/** 遗传常量 */
export const GENETICS_FLUCTUATION_BASE = 15
export const POND_MUTATION_JUMP_MIN = 15
export const POND_MUTATION_JUMP_MAX = 30

// === 可养殖鱼种 (13种) ===

const defaultGene = (overrides: Partial<FishGenetics> = {}): FishGenetics => ({
  weight: 50,
  growthRate: 50,
  diseaseRes: 50,
  qualityGene: 30,
  mutationRate: 10,
  ...overrides
})

export const PONDABLE_FISH: PondableFishDef[] = [
  // 溪流
  {
    fishId: 'crucian',
    name: '鲫鱼',
    maturityDays: 3,
    baseProductionRate: 0.4,
    productItemId: 'crucian',
    defaultGenetics: defaultGene({ weight: 30, growthRate: 70, diseaseRes: 60 })
  },
  {
    fishId: 'carp',
    name: '鲤鱼',
    maturityDays: 4,
    baseProductionRate: 0.35,
    productItemId: 'carp',
    defaultGenetics: defaultGene({ weight: 45, growthRate: 55, diseaseRes: 55 })
  },
  {
    fishId: 'grass_carp',
    name: '草鱼',
    maturityDays: 5,
    baseProductionRate: 0.3,
    productItemId: 'grass_carp',
    defaultGenetics: defaultGene({ weight: 60, growthRate: 45, diseaseRes: 50 })
  },
  // 池塘
  {
    fishId: 'golden_carp',
    name: '金鲤',
    maturityDays: 7,
    baseProductionRate: 0.2,
    productItemId: 'golden_carp',
    defaultGenetics: defaultGene({ weight: 40, growthRate: 35, diseaseRes: 40, qualityGene: 50 })
  },
  {
    fishId: 'koi',
    name: '锦鲤',
    maturityDays: 6,
    baseProductionRate: 0.25,
    productItemId: 'koi',
    defaultGenetics: defaultGene({ weight: 45, growthRate: 40, diseaseRes: 45, qualityGene: 55 })
  },
  {
    fishId: 'pond_turtle',
    name: '乌龟',
    maturityDays: 8,
    baseProductionRate: 0.15,
    productItemId: 'pond_turtle',
    defaultGenetics: defaultGene({ weight: 70, growthRate: 25, diseaseRes: 80, qualityGene: 40 })
  },
  // 江河
  {
    fishId: 'bass',
    name: '鲈鱼',
    maturityDays: 5,
    baseProductionRate: 0.3,
    productItemId: 'bass',
    defaultGenetics: defaultGene({ weight: 55, growthRate: 50, diseaseRes: 45 })
  },
  {
    fishId: 'catfish',
    name: '鲶鱼',
    maturityDays: 5,
    baseProductionRate: 0.3,
    productItemId: 'catfish',
    defaultGenetics: defaultGene({ weight: 65, growthRate: 45, diseaseRes: 50 })
  },
  {
    fishId: 'yellow_eel',
    name: '黄鳝',
    maturityDays: 6,
    baseProductionRate: 0.25,
    productItemId: 'yellow_eel',
    defaultGenetics: defaultGene({ weight: 50, growthRate: 40, diseaseRes: 55, qualityGene: 45 })
  },
  // 瀑布
  {
    fishId: 'rainbow_trout',
    name: '虹鳟',
    maturityDays: 6,
    baseProductionRate: 0.25,
    productItemId: 'rainbow_trout',
    defaultGenetics: defaultGene({ weight: 50, growthRate: 45, diseaseRes: 40, qualityGene: 50 })
  },
  // 沼泽
  {
    fishId: 'mud_loach',
    name: '沼泽泥鳅',
    maturityDays: 3,
    baseProductionRate: 0.4,
    productItemId: 'mud_loach',
    defaultGenetics: defaultGene({ weight: 25, growthRate: 65, diseaseRes: 70 })
  },
  {
    fishId: 'pond_snail',
    name: '田螺',
    maturityDays: 2,
    baseProductionRate: 0.5,
    productItemId: 'pond_snail',
    defaultGenetics: defaultGene({ weight: 15, growthRate: 80, diseaseRes: 75, qualityGene: 20 })
  },
  // 矿洞
  {
    fishId: 'cave_blindfish',
    name: '洞穴盲鱼',
    maturityDays: 8,
    baseProductionRate: 0.15,
    productItemId: 'cave_blindfish',
    defaultGenetics: defaultGene({ weight: 35, growthRate: 30, diseaseRes: 30, qualityGene: 60, mutationRate: 25 })
  }
]

/** 根据鱼种ID查找可养殖定义 */
export const getPondableFish = (fishId: string): PondableFishDef | undefined => {
  return PONDABLE_FISH.find(f => f.fishId === fishId)
}

/** 判断鱼是否可养殖 */
export const isPondableFish = (fishId: string): boolean => {
  return PONDABLE_FISH.some(f => f.fishId === fishId)
}
