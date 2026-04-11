import type { SeedGenetics, HybridDef, SeedStarRating, BreedingResearchUpgrade } from '@/types/breeding'
import { getCropById } from './crops'

// === 常量 ===

/** 种子箱基础容量 */
export const BASE_BREEDING_BOX = 30

/** 种子箱升级定义 */
export const SEED_BOX_UPGRADES = [
  {
    level: 1,
    cost: 5000,
    materials: [
      { itemId: 'wood', quantity: 50 },
      { itemId: 'copper_bar', quantity: 5 }
    ]
  },
  {
    level: 2,
    cost: 15000,
    materials: [
      { itemId: 'iron_bar', quantity: 8 },
      { itemId: 'pine_resin', quantity: 10 }
    ]
  },
  {
    level: 3,
    cost: 30000,
    materials: [
      { itemId: 'gold_bar', quantity: 5 },
      { itemId: 'cloth', quantity: 3 },
      { itemId: 'wood', quantity: 100 }
    ]
  },
  {
    level: 4,
    cost: 50000,
    materials: [
      { itemId: 'gold_bar', quantity: 10 },
      { itemId: 'silk_cloth', quantity: 5 },
      { itemId: 'battery', quantity: 3 }
    ]
  },
  {
    level: 5,
    cost: 80000,
    materials: [
      { itemId: 'iridium_bar', quantity: 5 },
      { itemId: 'dream_silk', quantity: 3 },
      { itemId: 'moon_herb', quantity: 5 }
    ]
  }
]

/** 每级种子箱容量增量 */
export const SEED_BOX_UPGRADE_INCREMENT = 15

/** @deprecated 使用 useBreedingStore().maxSeedBox 代替 */
export const MAX_BREEDING_BOX = 30

/** 育种加工天数 */
export const BREEDING_DAYS = 2

/** 属性上限 */
export const STAT_CAP = 100

/** 基础波动幅度 */
export const BASE_MUTATION_MAGNITUDE = 8

/** 每代稳定度增长 */
export const GENERATIONAL_STABILITY_GAIN = 3

/** 稳定度上限 */
export const MAX_STABILITY = 95

/** 变异时属性跳动范围 */
export const MUTATION_JUMP_MIN = 15
export const MUTATION_JUMP_MAX = 30

/** 变异时变异率自身浮动 */
export const MUTATION_RATE_DRIFT = 5

/** 育种台制造费用 */
export const BREEDING_STATION_COST = {
  money: 100000,
  materials: [
    { itemId: 'wood', quantity: 30 },
    { itemId: 'iron_ore', quantity: 10 },
    { itemId: 'gold_ore', quantity: 3 }
  ]
}

/** 育种台最大数量 */
export const MAX_BREEDING_STATIONS = 3

/** 育种研究升级定义 */
export const BREEDING_RESEARCH_UPGRADES: BreedingResearchUpgrade[] = [
  {
    level: 1,
    name: '稳育笔记',
    description: '整理基础育种记录，扩大“接近可成”识别范围，并略微提高世代培育稳定性。',
    cost: 12000,
    materials: [
      { itemId: 'tea', quantity: 6 },
      { itemId: 'quality_fertilizer', quantity: 4 }
    ]
  },
  {
    level: 2,
    name: '速育图谱',
    description: '建立高代样本对照表，让高代品系更早进入速育区间，并降低失败杂交的损耗。',
    cost: 28000,
    materials: [
      { itemId: 'gold_bar', quantity: 2 },
      { itemId: 'battery', quantity: 1 },
      { itemId: 'speed_gro', quantity: 4 }
    ]
  },
  {
    level: 3,
    name: '谱系档案',
    description: '建立高阶谱系档案，扩展祖代快照深度，并强化长期育种规划能力。',
    cost: 60000,
    materials: [
      { itemId: 'iridium_bar', quantity: 3 },
      { itemId: 'dream_silk', quantity: 2 },
      { itemId: 'moon_herb', quantity: 2 }
    ]
  }
]

// === 辅助函数 ===

let _nextGeneticsId = 1

/** 生成唯一基因ID */
export const generateGeneticsId = (): string => {
  return `gen_${Date.now()}_${_nextGeneticsId++}`
}

/** 限制属性值在 0-100 */
export const clampStat = (value: number): number => {
  return Math.max(0, Math.min(STAT_CAP, Math.round(value)))
}

/** 限制变异率在 1-50 */
export const clampMutationRate = (value: number): number => {
  return Math.max(1, Math.min(50, Math.round(value)))
}

/** 根据作物ID计算默认基因属性 */
export const getDefaultGenetics = (cropId: string): Omit<SeedGenetics, 'id'> => {
  const crop = getCropById(cropId)
  if (!crop) {
    return {
      cropId,
      generation: 0,
      sweetness: 20,
      yield: 20,
      resistance: 20,
      stability: 50,
      mutationRate: 10,
      parentA: null,
      parentB: null,
      isHybrid: false,
      hybridId: null
    }
  }

  // 贵/慢的作物属性更高
  const priceScore = Math.min(crop.sellPrice / 350, 1) // 350 = 雪莲售价
  const growthScore = Math.min(crop.growthDays / 12, 1) // 12 = 雪莲生长天数

  const baseSweetness = clampStat(15 + Math.round(priceScore * 40))
  const baseYield = clampStat(15 + Math.round(growthScore * 35))
  const baseResistance = clampStat(10 + Math.round((priceScore + growthScore) * 15))

  return {
    cropId,
    generation: 0,
    sweetness: baseSweetness,
    yield: baseYield,
    resistance: baseResistance,
    stability: 50,
    mutationRate: 10,
    parentA: null,
    parentB: null,
    isHybrid: false,
    hybridId: null
  }
}

/** 计算总属性 */
export const getTotalStats = (g: SeedGenetics): number => {
  return g.sweetness + g.yield + g.resistance
}

/** 获取星级评分 */
export const getStarRating = (g: SeedGenetics): SeedStarRating => {
  const total = getTotalStats(g)
  if (total >= 250) return 5
  if (total >= 200) return 4
  if (total >= 150) return 3
  if (total >= 100) return 2
  return 1
}

/** 生成种子显示标签 */
export const makeSeedLabel = (g: SeedGenetics): string => {
  const crop = getCropById(g.cropId)
  const name = crop?.name ?? g.cropId
  return `${name} G${g.generation}`
}

// === 杂交配方 ===

export const HYBRID_DEFS: HybridDef[] = [
  {
    id: 'golden_melon',
    name: '金蜜瓜',
    parentCropA: 'watermelon',
    parentCropB: 'lotus_root',
    minSweetness: 60,
    minYield: 50,
    resultCropId: 'golden_melon',
    baseGenetics: { sweetness: 70, yield: 60, resistance: 50 },
    discoveryText: '西瓜的甜蜜与莲藕的清润完美融合，诞生了传说中的金蜜瓜！'
  },
  {
    id: 'jade_tea',
    name: '翡翠茶',
    parentCropA: 'tea',
    parentCropB: 'chrysanthemum',
    minSweetness: 50,
    minYield: 45,
    resultCropId: 'jade_tea',
    baseGenetics: { sweetness: 60, yield: 55, resistance: 55 },
    discoveryText: '茶叶的甘醇与菊花的清雅交融，翡翠茶的茶汤泛着碧绿光泽！'
  },
  {
    id: 'phoenix_pepper',
    name: '凤凰椒',
    parentCropA: 'chili',
    parentCropB: 'pumpkin',
    minSweetness: 40,
    minYield: 55,
    resultCropId: 'phoenix_pepper',
    baseGenetics: { sweetness: 50, yield: 65, resistance: 60 },
    discoveryText: '辣椒的火热与南瓜的醇厚碰撞，凤凰椒如烈焰般绚烂！'
  },
  {
    id: 'moonlight_rice',
    name: '月光稻',
    parentCropA: 'rice',
    parentCropB: 'bamboo_shoot',
    minSweetness: 45,
    minYield: 60,
    resultCropId: 'moonlight_rice',
    baseGenetics: { sweetness: 55, yield: 70, resistance: 45 },
    discoveryText: '稻谷的质朴与春笋的灵气相融，月光稻在月下泛着银光！'
  },
  {
    id: 'frost_garlic',
    name: '霜雪蒜',
    parentCropA: 'snow_lotus',
    parentCropB: 'garlic',
    minSweetness: 55,
    minYield: 40,
    resultCropId: 'frost_garlic',
    baseGenetics: { sweetness: 65, yield: 50, resistance: 70 },
    discoveryText: '雪莲的纯净与大蒜的辛烈融合，霜雪蒜散发着冰霜般的寒气！'
  },
  {
    id: 'emerald_radish',
    name: '翡翠萝卜',
    parentCropA: 'cabbage',
    parentCropB: 'radish',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'emerald_radish',
    baseGenetics: { sweetness: 40, yield: 35, resistance: 30 },
    discoveryText: '青菜的清脆与萝卜的甘甜融合，翡翠般的根茎闪闪发光。'
  },
  {
    id: 'jade_shoot',
    name: '玉竹芽',
    parentCropA: 'bamboo_shoot',
    parentCropB: 'tea',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'jade_shoot',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 35 },
    discoveryText: '春笋的鲜嫩与茶叶的醇香交融，如玉如竹。'
  },
  {
    id: 'golden_tuber',
    name: '金油薯',
    parentCropA: 'potato',
    parentCropB: 'rapeseed',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'golden_tuber',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 30 },
    discoveryText: '土豆的饱满与油菜的金黄交织，通体金色。'
  },
  {
    id: 'peach_blossom_tea',
    name: '桃花茶',
    parentCropA: 'peach',
    parentCropB: 'tea',
    minSweetness: 45,
    minYield: 35,
    resultCropId: 'peach_blossom_tea',
    baseGenetics: { sweetness: 55, yield: 45, resistance: 40 },
    discoveryText: '桃花的妩媚与茶香的雅致合一，花瓣似蝶。'
  },
  {
    id: 'ruby_bean',
    name: '红宝豆',
    parentCropA: 'broad_bean',
    parentCropB: 'peach',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'ruby_bean',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 35 },
    discoveryText: '蚕豆的饱满与蜜桃的红润结合，颗颗如红宝石。'
  },
  {
    id: 'twin_bean',
    name: '双子豆',
    parentCropA: 'broad_bean',
    parentCropB: 'rapeseed',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'twin_bean',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 30 },
    discoveryText: '蚕豆与油菜联姻，每荚双生如孪生兄弟。'
  },
  {
    id: 'jade_melon',
    name: '碧玉瓜',
    parentCropA: 'watermelon',
    parentCropB: 'potato',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'jade_melon',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 35 },
    discoveryText: '西瓜的多汁与土豆的醇厚碰撞，果肉翠绿如玉。'
  },
  {
    id: 'pearl_grain',
    name: '珍珠谷',
    parentCropA: 'rice',
    parentCropB: 'tea',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'pearl_grain',
    baseGenetics: { sweetness: 50, yield: 50, resistance: 40 },
    discoveryText: '稻谷的质朴与茶叶的清雅融合，米粒晶莹如珍珠。'
  },
  {
    id: 'golden_corn',
    name: '金穗玉米',
    parentCropA: 'corn',
    parentCropB: 'rapeseed',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'golden_corn',
    baseGenetics: { sweetness: 40, yield: 55, resistance: 35 },
    discoveryText: '玉米的丰硕与油菜的金色交汇，穗穗金黄。'
  },
  {
    id: 'lotus_tea',
    name: '莲心茶',
    parentCropA: 'lotus_root',
    parentCropB: 'tea',
    minSweetness: 45,
    minYield: 40,
    resultCropId: 'lotus_tea',
    baseGenetics: { sweetness: 55, yield: 50, resistance: 45 },
    discoveryText: '莲藕的清润与茶叶的芬芳共鸣，杯中莲花绽放。'
  },
  {
    id: 'purple_bamboo',
    name: '紫竹茄',
    parentCropA: 'bamboo_shoot',
    parentCropB: 'eggplant',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'purple_bamboo',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 40 },
    discoveryText: '春笋的挺拔与茄子的紫韵合一，紫色竹节状果实。'
  },
  {
    id: 'honey_peach_melon',
    name: '蜜桃瓜',
    parentCropA: 'peach',
    parentCropB: 'watermelon',
    minSweetness: 45,
    minYield: 35,
    resultCropId: 'honey_peach_melon',
    baseGenetics: { sweetness: 55, yield: 45, resistance: 35 },
    discoveryText: '蜜桃的香甜与西瓜的清爽交融，咬一口蜜汁四溢。'
  },
  {
    id: 'fire_bean',
    name: '火豆',
    parentCropA: 'broad_bean',
    parentCropB: 'chili',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'fire_bean',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 40 },
    discoveryText: '蚕豆的饱满裹上辣椒的火焰，辣中带香。'
  },
  {
    id: 'silk_bean',
    name: '丝豆',
    parentCropA: 'green_bean',
    parentCropB: 'loofah',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'silk_bean',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '豆角的清脆与丝瓜的丝滑结合，口感如丝。'
  },
  {
    id: 'double_oil_seed',
    name: '双油籽',
    parentCropA: 'rapeseed',
    parentCropB: 'sesame',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'double_oil_seed',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 30 },
    discoveryText: '油菜与芝麻双重醇香，出油率极高。'
  },
  {
    id: 'lotus_potato',
    name: '莲薯',
    parentCropA: 'potato',
    parentCropB: 'lotus_seed',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'lotus_potato',
    baseGenetics: { sweetness: 45, yield: 45, resistance: 40 },
    discoveryText: '土豆的淀粉与莲子的清甜结合，口感绵密。'
  },
  {
    id: 'jade_pumpkin',
    name: '翡翠南瓜',
    parentCropA: 'potato',
    parentCropB: 'pumpkin',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'jade_pumpkin',
    baseGenetics: { sweetness: 50, yield: 50, resistance: 40 },
    discoveryText: '土豆的质朴与南瓜的金黄交融，外皮翠绿内里金黄。'
  },
  {
    id: 'crystal_yam',
    name: '水晶山药',
    parentCropA: 'bamboo_shoot',
    parentCropB: 'yam',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'crystal_yam',
    baseGenetics: { sweetness: 50, yield: 50, resistance: 45 },
    discoveryText: '春笋的脆嫩与山药的滋补合一，通体晶莹。'
  },
  {
    id: 'osmanthus_tea',
    name: '桂花茶',
    parentCropA: 'tea',
    parentCropB: 'osmanthus',
    minSweetness: 50,
    minYield: 40,
    resultCropId: 'osmanthus_tea',
    baseGenetics: { sweetness: 60, yield: 50, resistance: 50 },
    discoveryText: '茶叶的醇厚与桂花的芬芳天作之合，满室飘香。'
  },
  {
    id: 'mountain_bamboo',
    name: '山竹薯',
    parentCropA: 'bamboo_shoot',
    parentCropB: 'sweet_potato',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'mountain_bamboo',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '春笋的清爽与红薯的甜糯碰撞，山野间的美味。'
  },
  {
    id: 'golden_fruit',
    name: '金秋果',
    parentCropA: 'peach',
    parentCropB: 'persimmon',
    minSweetness: 45,
    minYield: 40,
    resultCropId: 'golden_fruit',
    baseGenetics: { sweetness: 55, yield: 50, resistance: 40 },
    discoveryText: '蜜桃的甜与柿子的糯完美融合，金色果实满枝头。'
  },
  {
    id: 'nut_potato',
    name: '花生薯',
    parentCropA: 'potato',
    parentCropB: 'peanut',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'nut_potato',
    baseGenetics: { sweetness: 40, yield: 50, resistance: 35 },
    discoveryText: '土豆的绵密与花生的香脆结合，越嚼越香。'
  },
  {
    id: 'autumn_bean',
    name: '秋枣豆',
    parentCropA: 'broad_bean',
    parentCropB: 'jujube',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'autumn_bean',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 40 },
    discoveryText: '蚕豆与红枣联姻，豆中带枣香。'
  },
  {
    id: 'jujube_blossom',
    name: '枣花桃',
    parentCropA: 'peach',
    parentCropB: 'jujube',
    minSweetness: 45,
    minYield: 35,
    resultCropId: 'jujube_blossom',
    baseGenetics: { sweetness: 55, yield: 45, resistance: 40 },
    discoveryText: '桃花的粉嫩与枣花的素雅共绽，果实甜蜜。'
  },
  {
    id: 'ginger_blossom',
    name: '姜花菜',
    parentCropA: 'rapeseed',
    parentCropB: 'ginger',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'ginger_blossom',
    baseGenetics: { sweetness: 40, yield: 40, resistance: 40 },
    discoveryText: '油菜的嫩与生姜的辛交融，花开似蝶。'
  },
  {
    id: 'fairy_chrysanthemum',
    name: '仙菊菜',
    parentCropA: 'cabbage',
    parentCropB: 'chrysanthemum',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'fairy_chrysanthemum',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 40 },
    discoveryText: '青菜的平凡与菊花的高洁融合，叶缘如菊瓣。'
  },
  {
    id: 'imperial_cabbage',
    name: '御品白菜',
    parentCropA: 'cabbage',
    parentCropB: 'napa_cabbage',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'imperial_cabbage',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '青菜与白菜的皇家联姻，叶嫩味鲜。'
  },
  {
    id: 'spicy_radish',
    name: '蒜香萝卜',
    parentCropA: 'radish',
    parentCropB: 'garlic',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'spicy_radish',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '萝卜的脆甜与大蒜的辛辣交织，风味独特。'
  },
  {
    id: 'snow_tea',
    name: '雪茶',
    parentCropA: 'tea',
    parentCropB: 'snow_lotus',
    minSweetness: 55,
    minYield: 45,
    resultCropId: 'snow_tea',
    baseGenetics: { sweetness: 65, yield: 55, resistance: 55 },
    discoveryText: '茶叶与雪莲的极品融合，茶汤如雪般纯白。'
  },
  {
    id: 'spring_chive',
    name: '春韭菜',
    parentCropA: 'cabbage',
    parentCropB: 'chives',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'spring_chive',
    baseGenetics: { sweetness: 30, yield: 40, resistance: 30 },
    discoveryText: '青菜的温和与韭菜的浓郁合一，四季可种。'
  },
  {
    id: 'wheat_potato',
    name: '麦香薯',
    parentCropA: 'potato',
    parentCropB: 'winter_wheat',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'wheat_potato',
    baseGenetics: { sweetness: 40, yield: 50, resistance: 35 },
    discoveryText: '土豆与冬小麦跨季联姻，带着麦香的薯类。'
  },
  {
    id: 'spring_green_peach',
    name: '绿桃',
    parentCropA: 'peach',
    parentCropB: 'spinach',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'spring_green_peach',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 35 },
    discoveryText: '水蜜桃的甜与菠菜的翠绿交融，果皮碧绿如翠玉。'
  },
  {
    id: 'mustard_bean',
    name: '芥香豆',
    parentCropA: 'broad_bean',
    parentCropB: 'mustard_green',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'mustard_bean',
    baseGenetics: { sweetness: 40, yield: 40, resistance: 40 },
    discoveryText: '蚕豆裹上芥菜的微辣，冬春佳品。'
  },
  {
    id: 'frost_rapeseed',
    name: '霜油菜',
    parentCropA: 'rapeseed',
    parentCropB: 'spinach',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'frost_rapeseed',
    baseGenetics: { sweetness: 35, yield: 35, resistance: 35 },
    discoveryText: '油菜不畏寒霜，叶上凝霜犹翠绿。'
  },
  {
    id: 'purple_melon',
    name: '紫晶瓜',
    parentCropA: 'watermelon',
    parentCropB: 'eggplant',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'purple_melon',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 40 },
    discoveryText: '西瓜的多汁与茄子的紫韵碰撞，果肉紫如水晶。'
  },
  {
    id: 'golden_rice',
    name: '金芝稻',
    parentCropA: 'rice',
    parentCropB: 'sesame',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'golden_rice',
    baseGenetics: { sweetness: 40, yield: 50, resistance: 35 },
    discoveryText: '稻谷与芝麻合一，金色的谷粒散发芝麻香。'
  },
  {
    id: 'double_lotus',
    name: '双莲',
    parentCropA: 'lotus_root',
    parentCropB: 'lotus_seed',
    minSweetness: 50,
    minYield: 45,
    resultCropId: 'double_lotus',
    baseGenetics: { sweetness: 60, yield: 55, resistance: 50 },
    discoveryText: '莲藕与莲子同根生的极致融合，花开并蒂。'
  },
  {
    id: 'fire_sesame',
    name: '火麻仁',
    parentCropA: 'chili',
    parentCropB: 'sesame',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'fire_sesame',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '辣椒的火与芝麻的香完美结合，又辣又香。'
  },
  {
    id: 'silk_corn',
    name: '丝穗',
    parentCropA: 'loofah',
    parentCropB: 'corn',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'silk_corn',
    baseGenetics: { sweetness: 40, yield: 50, resistance: 40 },
    discoveryText: '丝瓜的丝滑与玉米的穗实交融，丝缕金黄。'
  },
  {
    id: 'purple_lotus',
    name: '紫莲茄',
    parentCropA: 'eggplant',
    parentCropB: 'lotus_root',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'purple_lotus',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 45 },
    discoveryText: '茄子的紫韵与莲藕的清润结合，亭亭如莲。'
  },
  {
    id: 'chrysanthemum_melon',
    name: '菊瓜',
    parentCropA: 'watermelon',
    parentCropB: 'chrysanthemum',
    minSweetness: 40,
    minYield: 30,
    resultCropId: 'chrysanthemum_melon',
    baseGenetics: { sweetness: 50, yield: 40, resistance: 40 },
    discoveryText: '西瓜的甜与菊花的清雅交融，瓜中带花香。'
  },
  {
    id: 'pumpkin_rice',
    name: '南瓜稻',
    parentCropA: 'rice',
    parentCropB: 'pumpkin',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'pumpkin_rice',
    baseGenetics: { sweetness: 45, yield: 55, resistance: 40 },
    discoveryText: '稻谷与南瓜的田园联姻，米饭带有南瓜甜香。'
  },
  {
    id: 'mountain_lotus',
    name: '山莲',
    parentCropA: 'lotus_root',
    parentCropB: 'yam',
    minSweetness: 45,
    minYield: 40,
    resultCropId: 'mountain_lotus',
    baseGenetics: { sweetness: 55, yield: 50, resistance: 50 },
    discoveryText: '莲藕的清润与山药的滋补交融，山水相依。'
  },
  {
    id: 'double_nut',
    name: '双果仁',
    parentCropA: 'peanut',
    parentCropB: 'sesame',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'double_nut',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '花生与芝麻双仁合一，香气浓郁。'
  },
  {
    id: 'sweet_gourd',
    name: '甜丝瓜',
    parentCropA: 'loofah',
    parentCropB: 'sweet_potato',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'sweet_gourd',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 35 },
    discoveryText: '丝瓜的嫩滑与红薯的甜蜜碰撞，瓜肉甘甜。'
  },
  {
    id: 'purple_persimmon',
    name: '紫柿',
    parentCropA: 'eggplant',
    parentCropB: 'persimmon',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'purple_persimmon',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 40 },
    discoveryText: '茄子的紫润与柿子的甜蜜融合，果实紫红。'
  },
  {
    id: 'fire_ginger',
    name: '火姜',
    parentCropA: 'chili',
    parentCropB: 'ginger',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'fire_ginger',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 45 },
    discoveryText: '辣椒的火辣与生姜的辛暖交汇，暖意十足。'
  },
  {
    id: 'osmanthus_lotus',
    name: '桂莲',
    parentCropA: 'lotus_seed',
    parentCropB: 'osmanthus',
    minSweetness: 50,
    minYield: 40,
    resultCropId: 'osmanthus_lotus',
    baseGenetics: { sweetness: 60, yield: 50, resistance: 55 },
    discoveryText: '莲子的清心与桂花的芬芳共鸣，如入仙境。'
  },
  {
    id: 'golden_sweet',
    name: '金薯',
    parentCropA: 'corn',
    parentCropB: 'sweet_potato',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'golden_sweet',
    baseGenetics: { sweetness: 45, yield: 50, resistance: 35 },
    discoveryText: '玉米的金色与红薯的甜蜜合一，通体金黄。'
  },
  {
    id: 'ruby_melon',
    name: '红宝瓜',
    parentCropA: 'watermelon',
    parentCropB: 'jujube',
    minSweetness: 40,
    minYield: 30,
    resultCropId: 'ruby_melon',
    baseGenetics: { sweetness: 50, yield: 40, resistance: 40 },
    discoveryText: '西瓜的多汁与红枣的甜蜜碰撞，果肉红如宝石。'
  },
  {
    id: 'chrysanthemum_rice',
    name: '菊稻',
    parentCropA: 'rice',
    parentCropB: 'chrysanthemum',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'chrysanthemum_rice',
    baseGenetics: { sweetness: 45, yield: 45, resistance: 40 },
    discoveryText: '稻谷与菊花的田园融合，米饭带着淡淡菊香。'
  },
  {
    id: 'nut_corn',
    name: '花生玉米',
    parentCropA: 'corn',
    parentCropB: 'peanut',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'nut_corn',
    baseGenetics: { sweetness: 40, yield: 55, resistance: 35 },
    discoveryText: '玉米与花生的粗粮结合，每穗夹带花生香。'
  },
  {
    id: 'frost_melon',
    name: '霜甜瓜',
    parentCropA: 'watermelon',
    parentCropB: 'napa_cabbage',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'frost_melon',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 40 },
    discoveryText: '西瓜的甜与白菜的耐寒交融，冬日也能品尝的甜蜜。'
  },
  {
    id: 'twin_grain',
    name: '双谷',
    parentCropA: 'rice',
    parentCropB: 'winter_wheat',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'twin_grain',
    baseGenetics: { sweetness: 40, yield: 55, resistance: 35 },
    discoveryText: '稻谷与冬小麦的谷物联姻，南北交融。'
  },
  {
    id: 'lotus_cabbage',
    name: '莲白菜',
    parentCropA: 'lotus_root',
    parentCropB: 'napa_cabbage',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'lotus_cabbage',
    baseGenetics: { sweetness: 45, yield: 45, resistance: 40 },
    discoveryText: '莲藕的清润与白菜的质朴合一，冬日清补。'
  },
  {
    id: 'garlic_sesame',
    name: '蒜芝',
    parentCropA: 'sesame',
    parentCropB: 'garlic',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'garlic_sesame',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 40 },
    discoveryText: '芝麻的香浓与大蒜的辛辣碰撞，调味圣品。'
  },
  {
    id: 'chive_gourd',
    name: '韭丝瓜',
    parentCropA: 'loofah',
    parentCropB: 'chives',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'chive_gourd',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '丝瓜的嫩滑与韭菜的浓郁交织，三季可种。'
  },
  {
    id: 'mustard_eggplant',
    name: '芥茄',
    parentCropA: 'eggplant',
    parentCropB: 'mustard_green',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'mustard_eggplant',
    baseGenetics: { sweetness: 40, yield: 40, resistance: 40 },
    discoveryText: '茄子的紫韵裹上芥菜的微辣，别有风味。'
  },
  {
    id: 'snow_fire_pepper',
    name: '冰火椒',
    parentCropA: 'chili',
    parentCropB: 'snow_lotus',
    minSweetness: 50,
    minYield: 40,
    resultCropId: 'snow_fire_pepper',
    baseGenetics: { sweetness: 60, yield: 50, resistance: 55 },
    discoveryText: '辣椒的火焰与雪莲的冰霜碰撞，冰火两重天。'
  },
  {
    id: 'winter_corn',
    name: '冬玉米',
    parentCropA: 'corn',
    parentCropB: 'spinach',
    minSweetness: 30,
    minYield: 40,
    resultCropId: 'winter_corn',
    baseGenetics: { sweetness: 40, yield: 50, resistance: 40 },
    discoveryText: '玉米不畏严寒，叶绿如冬日常青松。'
  },
  {
    id: 'amber_yam',
    name: '琥珀薯',
    parentCropA: 'yam',
    parentCropB: 'sweet_potato',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'amber_yam',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 40 },
    discoveryText: '山药的滋补与红薯的甜糯交融，色如琥珀。'
  },
  {
    id: 'twin_blossom',
    name: '双花',
    parentCropA: 'chrysanthemum',
    parentCropB: 'osmanthus',
    minSweetness: 45,
    minYield: 35,
    resultCropId: 'twin_blossom',
    baseGenetics: { sweetness: 55, yield: 45, resistance: 50 },
    discoveryText: '菊花与桂花竞相绽放，双花争艳。'
  },
  {
    id: 'mountain_nut',
    name: '山花生',
    parentCropA: 'yam',
    parentCropB: 'peanut',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'mountain_nut',
    baseGenetics: { sweetness: 45, yield: 50, resistance: 35 },
    discoveryText: '山药的绵密与花生的香脆碰撞，山中奇珍。'
  },
  {
    id: 'autumn_gem',
    name: '秋桂南瓜',
    parentCropA: 'pumpkin',
    parentCropB: 'osmanthus',
    minSweetness: 45,
    minYield: 40,
    resultCropId: 'autumn_gem',
    baseGenetics: { sweetness: 55, yield: 50, resistance: 45 },
    discoveryText: '南瓜的丰满与桂花的馨香融合，金秋瑰宝。'
  },
  {
    id: 'ginger_yam',
    name: '姜山药',
    parentCropA: 'ginger',
    parentCropB: 'yam',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'ginger_yam',
    baseGenetics: { sweetness: 45, yield: 50, resistance: 45 },
    discoveryText: '生姜的辛暖与山药的滋补合一，冬日滋补圣品。'
  },
  {
    id: 'golden_persimmon',
    name: '金柿',
    parentCropA: 'persimmon',
    parentCropB: 'pumpkin',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'golden_persimmon',
    baseGenetics: { sweetness: 50, yield: 50, resistance: 40 },
    discoveryText: '柿子的甜软与南瓜的金黄交融，如金似蜜。'
  },
  {
    id: 'chrysanthemum_jujube',
    name: '菊枣',
    parentCropA: 'chrysanthemum',
    parentCropB: 'jujube',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'chrysanthemum_jujube',
    baseGenetics: { sweetness: 45, yield: 45, resistance: 45 },
    discoveryText: '菊花的清雅与红枣的甜蜜合一，花中带果。'
  },
  {
    id: 'osmanthus_yam',
    name: '桂薯',
    parentCropA: 'osmanthus',
    parentCropB: 'sweet_potato',
    minSweetness: 40,
    minYield: 35,
    resultCropId: 'osmanthus_yam',
    baseGenetics: { sweetness: 50, yield: 45, resistance: 45 },
    discoveryText: '桂花的馨香渗入红薯的甜糯，满口桂香。'
  },
  {
    id: 'winter_pumpkin',
    name: '冬南瓜',
    parentCropA: 'pumpkin',
    parentCropB: 'napa_cabbage',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'winter_pumpkin',
    baseGenetics: { sweetness: 45, yield: 50, resistance: 40 },
    discoveryText: '南瓜的丰硕与白菜的耐寒结合，冬日暖食。'
  },
  {
    id: 'emerald_yam',
    name: '翡翠山药',
    parentCropA: 'yam',
    parentCropB: 'spinach',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'emerald_yam',
    baseGenetics: { sweetness: 45, yield: 45, resistance: 45 },
    discoveryText: '山药的滋补与菠菜的翠绿交融，切面翡翠般碧绿。'
  },
  {
    id: 'snow_chrysanthemum',
    name: '雪菊',
    parentCropA: 'chrysanthemum',
    parentCropB: 'snow_lotus',
    minSweetness: 55,
    minYield: 40,
    resultCropId: 'snow_chrysanthemum',
    baseGenetics: { sweetness: 65, yield: 50, resistance: 60 },
    discoveryText: '菊花的清雅与雪莲的纯净合一，花瓣如雪。'
  },
  {
    id: 'osmanthus_garlic',
    name: '桂蒜',
    parentCropA: 'osmanthus',
    parentCropB: 'garlic',
    minSweetness: 40,
    minYield: 30,
    resultCropId: 'osmanthus_garlic',
    baseGenetics: { sweetness: 50, yield: 40, resistance: 45 },
    discoveryText: '桂花的馨香中和大蒜的辛辣，芳香四溢。'
  },
  {
    id: 'wheat_yam',
    name: '麦山药',
    parentCropA: 'yam',
    parentCropB: 'winter_wheat',
    minSweetness: 35,
    minYield: 40,
    resultCropId: 'wheat_yam',
    baseGenetics: { sweetness: 45, yield: 50, resistance: 40 },
    discoveryText: '山药与冬小麦的跨季联姻，营养丰富。'
  },
  {
    id: 'cream_peanut',
    name: '白花生',
    parentCropA: 'peanut',
    parentCropB: 'napa_cabbage',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'cream_peanut',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '花生的香脆与白菜的素净合一，壳白如雪。'
  },
  {
    id: 'garlic_jujube',
    name: '蒜枣',
    parentCropA: 'jujube',
    parentCropB: 'garlic',
    minSweetness: 35,
    minYield: 35,
    resultCropId: 'garlic_jujube',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 45 },
    discoveryText: '红枣的甜与大蒜的辛碰撞，味道出人意料。'
  },
  {
    id: 'chive_persimmon',
    name: '韭柿',
    parentCropA: 'persimmon',
    parentCropB: 'chives',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'chive_persimmon',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 40 },
    discoveryText: '柿子的甜蜜与韭菜的浓郁交融，三季可收。'
  },
  {
    id: 'mustard_ginger',
    name: '芥姜',
    parentCropA: 'ginger',
    parentCropB: 'mustard_green',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'mustard_ginger',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 40 },
    discoveryText: '生姜的辛暖与芥菜的微辣合一，驱寒神品。'
  },
  {
    id: 'snow_pumpkin',
    name: '雪南瓜',
    parentCropA: 'pumpkin',
    parentCropB: 'snow_lotus',
    minSweetness: 55,
    minYield: 45,
    resultCropId: 'snow_pumpkin',
    baseGenetics: { sweetness: 65, yield: 55, resistance: 55 },
    discoveryText: '南瓜的丰硕与雪莲的纯净交融，白色巨瓜传说。'
  },
  {
    id: 'jade_white',
    name: '碧白菜',
    parentCropA: 'napa_cabbage',
    parentCropB: 'spinach',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'jade_white',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 30 },
    discoveryText: '白菜的质朴与菠菜的翠绿融合，叶片碧绿晶莹。'
  },
  {
    id: 'garlic_cabbage',
    name: '蒜白菜',
    parentCropA: 'garlic',
    parentCropB: 'napa_cabbage',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'garlic_cabbage',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '大蒜的辛与白菜的甜合一，冬储佳品。'
  },
  {
    id: 'evergreen_herb',
    name: '长青菜',
    parentCropA: 'spinach',
    parentCropB: 'mustard_green',
    minSweetness: 25,
    minYield: 25,
    resultCropId: 'evergreen_herb',
    baseGenetics: { sweetness: 30, yield: 35, resistance: 35 },
    discoveryText: '菠菜与芥菜不畏严寒，四季常青。'
  },
  {
    id: 'wheat_mustard',
    name: '麦芥菜',
    parentCropA: 'winter_wheat',
    parentCropB: 'mustard_green',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'wheat_mustard',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 35 },
    discoveryText: '冬小麦的醇厚与芥菜的辛辣交融，面中带辛。'
  },
  {
    id: 'allium_king',
    name: '百蒜王',
    parentCropA: 'garlic',
    parentCropB: 'chives',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'allium_king',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 40 },
    discoveryText: '大蒜与韭菜的葱属之王，辛香无敌。'
  },
  {
    id: 'green_wheat',
    name: '翠麦',
    parentCropA: 'spinach',
    parentCropB: 'winter_wheat',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'green_wheat',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 35 },
    discoveryText: '菠菜的翠绿渗入冬小麦，青翠麦穗随风摇。'
  },
  {
    id: 'chive_mustard',
    name: '韭芥',
    parentCropA: 'chives',
    parentCropB: 'mustard_green',
    minSweetness: 25,
    minYield: 25,
    resultCropId: 'chive_mustard',
    baseGenetics: { sweetness: 30, yield: 35, resistance: 35 },
    discoveryText: '韭菜与芥菜的辛辣同盟，开胃下饭。'
  },
  {
    id: 'jade_bamboo_corn',
    name: '玉笋棒',
    parentCropA: 'bamboo_shoot',
    parentCropB: 'corn',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'jade_bamboo_corn',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '春笋的鲜脆与玉米的甜糯交融，翠玉般的穗棒清甜可口。'
  },
  {
    id: 'ginger_jade_green',
    name: '姜翠菜',
    parentCropA: 'cabbage',
    parentCropB: 'ginger',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'ginger_jade_green',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '青菜的清爽与生姜的暖辣相遇，暖胃又解腻。'
  },
  {
    id: 'spicy_sesame',
    name: '麻辣仁',
    parentCropA: 'chili',
    parentCropB: 'peanut',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'spicy_sesame',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 40 },
    discoveryText: '辣椒的火热与花生的酥脆碰撞，麻辣酥香一口入魂。'
  },
  {
    id: 'honey_gourd',
    name: '蜜丝瓜',
    parentCropA: 'loofah',
    parentCropB: 'peanut',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'honey_gourd',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 30 },
    discoveryText: '丝瓜的柔滑与花生的醇甜相逢，蜜意绵绵。'
  },
  {
    id: 'golden_peanut_yam',
    name: '花薯',
    parentCropA: 'peanut',
    parentCropB: 'sweet_potato',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'golden_peanut_yam',
    baseGenetics: { sweetness: 40, yield: 45, resistance: 35 },
    discoveryText: '花生的酥香与红薯的绵密交融，香甜可口。'
  },
  {
    id: 'spice_jujube',
    name: '辛枣',
    parentCropA: 'jujube',
    parentCropB: 'ginger',
    minSweetness: 30,
    minYield: 30,
    resultCropId: 'spice_jujube',
    baseGenetics: { sweetness: 40, yield: 35, resistance: 40 },
    discoveryText: '红枣的甜蜜与大蒜的辛辣奇异融合，回味无穷。'
  },
  {
    id: 'bean_eggplant',
    name: '豆茄',
    parentCropA: 'green_bean',
    parentCropB: 'eggplant',
    minSweetness: 25,
    minYield: 30,
    resultCropId: 'bean_eggplant',
    baseGenetics: { sweetness: 35, yield: 40, resistance: 35 },
    discoveryText: '豆角的鲜嫩与茄子的绵软合一，田间双宝。'
  },
  {
    id: 'chrysanthemum_persimmon',
    name: '菊柿',
    parentCropA: 'persimmon',
    parentCropB: 'chrysanthemum',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'chrysanthemum_persimmon',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 35 },
    discoveryText: '柿子的甘甜与菊花的清香交融，秋日极品。'
  },
  {
    id: 'purple_yam',
    name: '紫玉薯',
    parentCropA: 'yam',
    parentCropB: 'eggplant',
    minSweetness: 30,
    minYield: 35,
    resultCropId: 'purple_yam',
    baseGenetics: { sweetness: 35, yield: 45, resistance: 40 },
    discoveryText: '山药的润滑与茄子的紫韵交融，通体泛紫光泽。'
  },
  {
    id: 'snow_lotus_pearl',
    name: '雪莲子',
    parentCropA: 'lotus_seed',
    parentCropB: 'snow_lotus',
    minSweetness: 35,
    minYield: 30,
    resultCropId: 'snow_lotus_pearl',
    baseGenetics: { sweetness: 45, yield: 40, resistance: 45 },
    discoveryText: '莲子的清心与雪莲的纯净合一，寒冬明珠。'
  },
  {
    id: 'melon_tea_fruit',
    name: '蜜茶果',
    parentCropA: 'golden_melon',
    parentCropB: 'tea',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'melon_tea_fruit',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 60 },
    discoveryText: '金蜜瓜的甘甜与茶叶的清雅在最高境界融合，传说中的仙果！'
  },
  {
    id: 'dragon_fire',
    name: '龙火椒',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'ginger',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'dragon_fire',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 60 },
    discoveryText: '凤凰椒的烈焰与生姜的辛暖碰撞，如龙息般灼热！'
  },
  {
    id: 'celestial_rice',
    name: '天香稻',
    parentCropA: 'moonlight_rice',
    parentCropB: 'osmanthus',
    minSweetness: 65,
    minYield: 60,
    resultCropId: 'celestial_rice',
    baseGenetics: { sweetness: 75, yield: 70, resistance: 60 },
    discoveryText: '月光稻的银辉与桂花的馨香交融，天上仙稻！'
  },
  {
    id: 'ice_lotus',
    name: '冰莲',
    parentCropA: 'frost_garlic',
    parentCropB: 'lotus_seed',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'ice_lotus',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 65 },
    discoveryText: '霜雪蒜的冰霜与莲子的清心合一，冰莲花开永不凋！'
  },
  {
    id: 'jade_peach_tea',
    name: '翠桃茶',
    parentCropA: 'jade_tea',
    parentCropB: 'peach',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'jade_peach_tea',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 55 },
    discoveryText: '翡翠茶的碧绿与蜜桃的甜润交融，茶中极品！'
  },
  {
    id: 'golden_dragon',
    name: '金龙果',
    parentCropA: 'golden_melon',
    parentCropB: 'phoenix_pepper',
    minSweetness: 70,
    minYield: 65,
    resultCropId: 'golden_dragon',
    baseGenetics: { sweetness: 80, yield: 75, resistance: 65 },
    discoveryText: '金蜜瓜的尊贵与凤凰椒的烈焰碰撞，果中之龙！'
  },
  {
    id: 'moonlight_frost',
    name: '月霜稻',
    parentCropA: 'moonlight_rice',
    parentCropB: 'frost_garlic',
    minSweetness: 65,
    minYield: 65,
    resultCropId: 'moonlight_frost',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 65 },
    discoveryText: '月光稻的银辉与霜雪蒜的冰霜交织，月下霜华！'
  },
  {
    id: 'jade_golden_melon',
    name: '翡翠金瓜',
    parentCropA: 'jade_tea',
    parentCropB: 'golden_melon',
    minSweetness: 70,
    minYield: 65,
    resultCropId: 'jade_golden_melon',
    baseGenetics: { sweetness: 80, yield: 70, resistance: 70 },
    discoveryText: '翡翠茶的碧绿与金蜜瓜的金黄交融，翡翠包金！'
  },
  {
    id: 'immortal_flower',
    name: '仙人花',
    parentCropA: 'frost_garlic',
    parentCropB: 'jade_tea',
    minSweetness: 70,
    minYield: 60,
    resultCropId: 'immortal_flower',
    baseGenetics: { sweetness: 85, yield: 70, resistance: 75 },
    discoveryText: '霜雪蒜的冰霜与翡翠茶的碧绿交融，传说中的仙人之花！'
  },
  {
    id: 'dragon_pearl',
    name: '龙珠',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'moonlight_rice',
    minSweetness: 75,
    minYield: 70,
    resultCropId: 'dragon_pearl',
    baseGenetics: { sweetness: 85, yield: 80, resistance: 70 },
    discoveryText: '凤凰椒的烈焰与月光稻的银辉碰撞，果实圆润如龙珠，至宝！'
  },
  // --- 新增二代杂交 ---
  {
    id: 'emerald_jade_tea',
    name: '翠玉茗',
    parentCropA: 'emerald_radish',
    parentCropB: 'tea',
    minSweetness: 55,
    minYield: 50,
    resultCropId: 'emerald_jade_tea',
    baseGenetics: { sweetness: 65, yield: 60, resistance: 55 },
    discoveryText: '翡翠萝卜的碧绿与茶叶的清雅相融，翠色茗香沁人心脾。'
  },
  {
    id: 'pearl_osmanthus',
    name: '桂珠谷',
    parentCropA: 'pearl_grain',
    parentCropB: 'osmanthus',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'pearl_osmanthus',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 55 },
    discoveryText: '珍珠谷的晶莹与桂花的芬芳合一，颗颗桂香满溢。'
  },
  {
    id: 'ruby_fire',
    name: '红宝椒',
    parentCropA: 'ruby_bean',
    parentCropB: 'chili',
    minSweetness: 55,
    minYield: 50,
    resultCropId: 'ruby_fire',
    baseGenetics: { sweetness: 65, yield: 60, resistance: 55 },
    discoveryText: '红宝豆的红润与辣椒的火热碰撞，如烈焰红宝石。'
  },
  {
    id: 'golden_corn_king',
    name: '金穗王',
    parentCropA: 'golden_corn',
    parentCropB: 'rice',
    minSweetness: 55,
    minYield: 60,
    resultCropId: 'golden_corn_king',
    baseGenetics: { sweetness: 65, yield: 70, resistance: 55 },
    discoveryText: '金穗玉米的丰硕与稻谷的质朴融合，五谷之王！'
  },
  {
    id: 'jade_melon_tea',
    name: '碧茗瓜',
    parentCropA: 'jade_melon',
    parentCropB: 'tea',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'jade_melon_tea',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 55 },
    discoveryText: '碧玉瓜的翠绿与茶叶的清香交融，清凉消暑。'
  },
  {
    id: 'twin_golden_bean',
    name: '金双豆',
    parentCropA: 'twin_bean',
    parentCropB: 'peanut',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'twin_golden_bean',
    baseGenetics: { sweetness: 60, yield: 60, resistance: 50 },
    discoveryText: '双子豆的双生与花生的饱满结合，金灿灿成双成对。'
  },
  {
    id: 'peach_rice',
    name: '桃花饭',
    parentCropA: 'peach_blossom_tea',
    parentCropB: 'rice',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'peach_rice',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 55 },
    discoveryText: '桃花茶的芬芳渗入稻谷，煮出的米饭泛着桃粉。'
  },
  {
    id: 'jade_shoot_ginger',
    name: '玉笋姜',
    parentCropA: 'jade_shoot',
    parentCropB: 'ginger',
    minSweetness: 55,
    minYield: 50,
    resultCropId: 'jade_shoot_ginger',
    baseGenetics: { sweetness: 65, yield: 60, resistance: 55 },
    discoveryText: '玉竹芽的鲜嫩与生姜的暖辣碰撞，驱寒暖身。'
  },
  {
    id: 'golden_tuber_lotus',
    name: '金莲薯',
    parentCropA: 'golden_tuber',
    parentCropB: 'lotus_root',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'golden_tuber_lotus',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '金油薯的金黄与莲藕的清润交融，甜糯清香。'
  },
  {
    id: 'frost_chrysanthemum',
    name: '霜菊',
    parentCropA: 'frost_garlic',
    parentCropB: 'chrysanthemum',
    minSweetness: 65,
    minYield: 50,
    resultCropId: 'frost_chrysanthemum',
    baseGenetics: { sweetness: 75, yield: 60, resistance: 70 },
    discoveryText: '霜雪蒜的寒气与菊花的傲骨合一，霜中怒放。'
  },
  {
    id: 'phoenix_sesame',
    name: '凤仁',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'sesame',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'phoenix_sesame',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 60 },
    discoveryText: '凤凰椒的烈焰与芝麻的醇香熔于一体，麻辣仙果。'
  },
  {
    id: 'moonlight_lotus',
    name: '月莲',
    parentCropA: 'moonlight_rice',
    parentCropB: 'lotus_seed',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'moonlight_lotus',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 60 },
    discoveryText: '月光稻的银辉与莲子的清心交融，月下白莲悄然开放。'
  },
  {
    id: 'jade_snow',
    name: '翠雪芽',
    parentCropA: 'jade_tea',
    parentCropB: 'snow_lotus',
    minSweetness: 65,
    minYield: 50,
    resultCropId: 'jade_snow',
    baseGenetics: { sweetness: 75, yield: 60, resistance: 70 },
    discoveryText: '翡翠茶的碧绿遇上雪莲的纯白，冰清玉洁。'
  },
  {
    id: 'golden_pumpkin',
    name: '金瓜王',
    parentCropA: 'golden_melon',
    parentCropB: 'pumpkin',
    minSweetness: 65,
    minYield: 60,
    resultCropId: 'golden_pumpkin',
    baseGenetics: { sweetness: 75, yield: 70, resistance: 60 },
    discoveryText: '金蜜瓜的甘甜与南瓜的醇厚碰撞，金色大瓜威风凛凛。'
  },
  {
    id: 'phoenix_corn',
    name: '火穗',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'corn',
    minSweetness: 55,
    minYield: 60,
    resultCropId: 'phoenix_corn',
    baseGenetics: { sweetness: 65, yield: 70, resistance: 55 },
    discoveryText: '凤凰椒的烈焰点燃玉米穗，火红穗粒甜中带辣。'
  },
  {
    id: 'moonlight_yam',
    name: '月光薯',
    parentCropA: 'moonlight_rice',
    parentCropB: 'sweet_potato',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'moonlight_yam',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 55 },
    discoveryText: '月光稻的银辉照耀红薯，通体泛着月白柔光。'
  },
  {
    id: 'jade_peanut',
    name: '翠仁果',
    parentCropA: 'jade_tea',
    parentCropB: 'peanut',
    minSweetness: 55,
    minYield: 50,
    resultCropId: 'jade_peanut',
    baseGenetics: { sweetness: 65, yield: 60, resistance: 55 },
    discoveryText: '翡翠茶的碧绿渗入花生，壳内仁翠如玉。'
  },
  {
    id: 'frost_radish',
    name: '霜玉萝卜',
    parentCropA: 'frost_garlic',
    parentCropB: 'radish',
    minSweetness: 60,
    minYield: 50,
    resultCropId: 'frost_radish',
    baseGenetics: { sweetness: 70, yield: 60, resistance: 65 },
    discoveryText: '霜雪蒜的冰霜渗入萝卜，根茎晶莹如冰玉。'
  },
  {
    id: 'golden_jujube',
    name: '金蜜枣',
    parentCropA: 'golden_melon',
    parentCropB: 'jujube',
    minSweetness: 70,
    minYield: 55,
    resultCropId: 'golden_jujube',
    baseGenetics: { sweetness: 80, yield: 65, resistance: 60 },
    discoveryText: '金蜜瓜的甘甜注入红枣，颗颗蜜汁饱满。'
  },
  {
    id: 'phoenix_eggplant',
    name: '火焰茄',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'eggplant',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'phoenix_eggplant',
    baseGenetics: { sweetness: 60, yield: 65, resistance: 60 },
    discoveryText: '凤凰椒的烈焰与茄子的紫韵碰撞，紫皮之下火辣鲜美。'
  },
  {
    id: 'moonlight_spinach',
    name: '银叶菜',
    parentCropA: 'moonlight_rice',
    parentCropB: 'spinach',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'moonlight_spinach',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '月光稻的银辉浸润菠菜叶脉，叶片泛着银光。'
  },
  {
    id: 'jade_loofah',
    name: '翠丝瓜',
    parentCropA: 'jade_tea',
    parentCropB: 'loofah',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'jade_loofah',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 50 },
    discoveryText: '翡翠茶的碧色融入丝瓜，瓜身翠绿如玉。'
  },
  {
    id: 'frost_winter_wheat',
    name: '霜麦',
    parentCropA: 'frost_garlic',
    parentCropB: 'winter_wheat',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'frost_winter_wheat',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 70 },
    discoveryText: '霜雪蒜的寒冰渗入冬小麦，麦穗挂满霜花。'
  },
  {
    id: 'golden_sesame',
    name: '金芝',
    parentCropA: 'golden_melon',
    parentCropB: 'sesame',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'golden_sesame',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 55 },
    discoveryText: '金蜜瓜的金色光辉注入芝麻，粒粒金灿如砂金。'
  },
  {
    id: 'phoenix_garlic',
    name: '火蒜',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'garlic',
    minSweetness: 60,
    minYield: 50,
    resultCropId: 'phoenix_garlic',
    baseGenetics: { sweetness: 65, yield: 60, resistance: 65 },
    discoveryText: '凤凰椒的烈焰灼烧大蒜，辛辣之上更添火意。'
  },
  {
    id: 'moonlight_cabbage',
    name: '月白菜',
    parentCropA: 'moonlight_rice',
    parentCropB: 'napa_cabbage',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'moonlight_cabbage',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 55 },
    discoveryText: '月光稻的银辉洒落白菜叶，月白如绢清甜无比。'
  },
  {
    id: 'jade_persimmon',
    name: '翠柿',
    parentCropA: 'jade_tea',
    parentCropB: 'persimmon',
    minSweetness: 60,
    minYield: 50,
    resultCropId: 'jade_persimmon',
    baseGenetics: { sweetness: 70, yield: 60, resistance: 55 },
    discoveryText: '翡翠茶的碧绿渗入柿子，果肉翡翠色泽甘甜馥郁。'
  },
  {
    id: 'frost_bamboo',
    name: '冰笋',
    parentCropA: 'frost_garlic',
    parentCropB: 'bamboo_shoot',
    minSweetness: 60,
    minYield: 50,
    resultCropId: 'frost_bamboo',
    baseGenetics: { sweetness: 70, yield: 60, resistance: 65 },
    discoveryText: '霜雪蒜的冰霜封住春笋鲜味，冰镇之鲜。'
  },
  {
    id: 'golden_watermelon',
    name: '帝瓜',
    parentCropA: 'golden_melon',
    parentCropB: 'watermelon',
    minSweetness: 70,
    minYield: 60,
    resultCropId: 'golden_watermelon',
    baseGenetics: { sweetness: 80, yield: 70, resistance: 60 },
    discoveryText: '金蜜瓜回归西瓜之源，甜度登峰造极，瓜中帝王。'
  },
  {
    id: 'phoenix_peach',
    name: '火桃',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'peach',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'phoenix_peach',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 60 },
    discoveryText: '凤凰椒的火焰亲吻蜜桃，红如烈焰甜中带辛。'
  },
  {
    id: 'moonlight_corn',
    name: '月穗',
    parentCropA: 'moonlight_rice',
    parentCropB: 'corn',
    minSweetness: 60,
    minYield: 65,
    resultCropId: 'moonlight_corn',
    baseGenetics: { sweetness: 70, yield: 75, resistance: 55 },
    discoveryText: '月光稻的银辉照耀玉米穗，月下银穗丰收满仓。'
  },
  {
    id: 'jade_chive',
    name: '翠韭',
    parentCropA: 'jade_tea',
    parentCropB: 'chives',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'jade_chive',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '翡翠茶的碧色浸入韭菜，翠色欲滴辛香四溢。'
  },
  {
    id: 'frost_pumpkin',
    name: '霜南瓜',
    parentCropA: 'frost_garlic',
    parentCropB: 'pumpkin',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'frost_pumpkin',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 65 },
    discoveryText: '霜雪蒜的寒气凝于南瓜之上，冰镇南瓜甜如蜜。'
  },
  {
    id: 'emerald_rice',
    name: '翠粒稻',
    parentCropA: 'emerald_radish',
    parentCropB: 'rice',
    minSweetness: 50,
    minYield: 55,
    resultCropId: 'emerald_rice',
    baseGenetics: { sweetness: 60, yield: 65, resistance: 50 },
    discoveryText: '翡翠萝卜的碧绿渗入稻谷，翠色米粒清香扑鼻。'
  },
  {
    id: 'pearl_peach',
    name: '珠桃',
    parentCropA: 'pearl_grain',
    parentCropB: 'peach',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'pearl_peach',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 55 },
    discoveryText: '珍珠谷的晶莹与蜜桃的红润交融，果实圆润如明珠。'
  },
  {
    id: 'golden_lotus',
    name: '金莲',
    parentCropA: 'golden_melon',
    parentCropB: 'lotus_seed',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'golden_lotus',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 60 },
    discoveryText: '金蜜瓜的金辉照耀莲子，金莲绽放熠熠生辉。'
  },
  {
    id: 'phoenix_broad_bean',
    name: '凤豆',
    parentCropA: 'phoenix_pepper',
    parentCropB: 'broad_bean',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'phoenix_broad_bean',
    baseGenetics: { sweetness: 60, yield: 65, resistance: 60 },
    discoveryText: '凤凰椒的烈焰烤炙蚕豆，火中淬炼的豆中珍品。'
  },
  {
    id: 'moonlight_tea',
    name: '月芽茶',
    parentCropA: 'moonlight_rice',
    parentCropB: 'tea',
    minSweetness: 65,
    minYield: 55,
    resultCropId: 'moonlight_tea',
    baseGenetics: { sweetness: 75, yield: 65, resistance: 60 },
    discoveryText: '月光稻的银辉与茶叶的清雅交融，月芽形茶叶清香悠长。'
  },
  {
    id: 'jade_rapeseed',
    name: '翠金菜',
    parentCropA: 'jade_tea',
    parentCropB: 'rapeseed',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'jade_rapeseed',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '翡翠茶的碧绿与油菜的金黄交融，翠金相映。'
  },
  {
    id: 'frost_yam',
    name: '霜山药',
    parentCropA: 'frost_garlic',
    parentCropB: 'yam',
    minSweetness: 60,
    minYield: 55,
    resultCropId: 'frost_yam',
    baseGenetics: { sweetness: 70, yield: 65, resistance: 65 },
    discoveryText: '霜雪蒜的寒意渗入山药，冰润滑腻入口即化。'
  },
  // === 三代杂交作物 ===,
  {
    id: 'wind_melon',
    name: '风瓜',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'jade_tea',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'wind_melon',
    baseGenetics: { sweetness: 55, yield: 55, resistance: 45 },
    discoveryText: '金瓜与翡翠茶经风雨淬炼而成的珍品。'
  },
  {
    id: 'cloud_bean',
    name: '云豆',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'phoenix_pepper',
    minSweetness: 40,
    minYield: 40,
    resultCropId: 'cloud_bean',
    baseGenetics: { sweetness: 55, yield: 55, resistance: 45 },
    discoveryText: '金瓜与凤凰椒在清风中交融，自然之韵。'
  },
  {
    id: 'rain_rice',
    name: '雨稻',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'moonlight_rice',
    minSweetness: 41,
    minYield: 41,
    resultCropId: 'rain_rice',
    baseGenetics: { sweetness: 56, yield: 56, resistance: 46 },
    discoveryText: '金瓜与月光稻沐浴露霜，天地灵气所化。'
  },
  {
    id: 'hoar_tuber',
    name: '霜薯',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'frost_garlic',
    minSweetness: 41,
    minYield: 41,
    resultCropId: 'hoar_tuber',
    baseGenetics: { sweetness: 56, yield: 56, resistance: 46 },
    discoveryText: '金瓜与霜雪蒜在星光下蜕变，风物之精。'
  },
  {
    id: 'thunder_green',
    name: '雷菜',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'emerald_radish',
    minSweetness: 41,
    minYield: 41,
    resultCropId: 'thunder_green',
    baseGenetics: { sweetness: 56, yield: 56, resistance: 47 },
    discoveryText: '金瓜与翡翠萝卜汇聚山川之气，化为珍品。'
  },
  {
    id: 'rainbow_fruit',
    name: '虹果',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'jade_shoot',
    minSweetness: 42,
    minYield: 42,
    resultCropId: 'rainbow_fruit',
    baseGenetics: { sweetness: 57, yield: 57, resistance: 47 },
    discoveryText: '金瓜与碧玉笋经风雨淬炼而成的珍品。'
  },
  {
    id: 'dew_bloom',
    name: '露花',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'golden_tuber',
    minSweetness: 42,
    minYield: 42,
    resultCropId: 'dew_bloom',
    baseGenetics: { sweetness: 57, yield: 57, resistance: 47 },
    discoveryText: '金瓜与金油薯在清风中交融，自然之韵。'
  },
  {
    id: 'dawn_tea',
    name: '晨茶',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'peach_blossom_tea',
    minSweetness: 42,
    minYield: 42,
    resultCropId: 'dawn_tea',
    baseGenetics: { sweetness: 57, yield: 57, resistance: 48 },
    discoveryText: '金瓜与桃花茶沐浴露霜，天地灵气所化。'
  },
  {
    id: 'dusk_shoot',
    name: '暮笋',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'ruby_bean',
    minSweetness: 42,
    minYield: 42,
    resultCropId: 'dusk_shoot',
    baseGenetics: { sweetness: 58, yield: 58, resistance: 48 },
    discoveryText: '金瓜与红宝豆在星光下蜕变，风物之精。'
  },
  {
    id: 'star_lotus',
    name: '星莲',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'twin_bean',
    minSweetness: 43,
    minYield: 43,
    resultCropId: 'star_lotus',
    baseGenetics: { sweetness: 58, yield: 58, resistance: 49 },
    discoveryText: '金瓜与双子豆汇聚山川之气，化为珍品。'
  },
  {
    id: 'wind_splendor_wheat',
    name: '风华麦',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'jade_melon',
    minSweetness: 43,
    minYield: 43,
    resultCropId: 'wind_splendor_wheat',
    baseGenetics: { sweetness: 58, yield: 58, resistance: 49 },
    discoveryText: '金瓜与碧玉瓜经风雨淬炼而成的珍品。'
  },
  {
    id: 'cloud_splendor_sesame',
    name: '云华芝',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'pearl_grain',
    minSweetness: 43,
    minYield: 43,
    resultCropId: 'cloud_splendor_sesame',
    baseGenetics: { sweetness: 59, yield: 59, resistance: 49 },
    discoveryText: '金瓜与珍珠谷在清风中交融，自然之韵。'
  },
  {
    id: 'rain_splendor_pepper',
    name: '雨华椒',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'golden_corn',
    minSweetness: 44,
    minYield: 44,
    resultCropId: 'rain_splendor_pepper',
    baseGenetics: { sweetness: 59, yield: 59, resistance: 50 },
    discoveryText: '金瓜与金穗玉米沐浴露霜，天地灵气所化。'
  },
  {
    id: 'hoar_splendor_root',
    name: '霜华参',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'lotus_tea',
    minSweetness: 44,
    minYield: 44,
    resultCropId: 'hoar_splendor_root',
    baseGenetics: { sweetness: 60, yield: 60, resistance: 50 },
    discoveryText: '金瓜与莲心茶在星光下蜕变，风物之精。'
  },
  {
    id: 'thunder_splendor_sprout',
    name: '雷华芽',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'purple_bamboo',
    minSweetness: 44,
    minYield: 44,
    resultCropId: 'thunder_splendor_sprout',
    baseGenetics: { sweetness: 60, yield: 60, resistance: 51 },
    discoveryText: '金瓜与紫竹茄汇聚山川之气，化为珍品。'
  },
  {
    id: 'rainbow_splendor_vine',
    name: '虹华藤',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'honey_peach_melon',
    minSweetness: 45,
    minYield: 45,
    resultCropId: 'rainbow_splendor_vine',
    baseGenetics: { sweetness: 60, yield: 60, resistance: 51 },
    discoveryText: '金瓜与蜜桃瓜经风雨淬炼而成的珍品。'
  },
  {
    id: 'dew_splendor_bud',
    name: '露华蕾',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'fire_bean',
    minSweetness: 45,
    minYield: 45,
    resultCropId: 'dew_splendor_bud',
    baseGenetics: { sweetness: 61, yield: 61, resistance: 52 },
    discoveryText: '金瓜与火豆在清风中交融，自然之韵。'
  },
  {
    id: 'dawn_splendor_orchid',
    name: '晨华兰',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'silk_bean',
    minSweetness: 45,
    minYield: 45,
    resultCropId: 'dawn_splendor_orchid',
    baseGenetics: { sweetness: 61, yield: 61, resistance: 52 },
    discoveryText: '金瓜与丝豆沐浴露霜，天地灵气所化。'
  },
  {
    id: 'dusk_splendor_gourd',
    name: '暮华葫',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'double_oil_seed',
    minSweetness: 46,
    minYield: 46,
    resultCropId: 'dusk_splendor_gourd',
    baseGenetics: { sweetness: 61, yield: 61, resistance: 52 },
    discoveryText: '金瓜与双油籽在星光下蜕变，风物之精。'
  },
  {
    id: 'star_splendor_herb',
    name: '星华草',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'lotus_potato',
    minSweetness: 46,
    minYield: 46,
    resultCropId: 'star_splendor_herb',
    baseGenetics: { sweetness: 62, yield: 62, resistance: 53 },
    discoveryText: '金瓜与莲花薯汇聚山川之气，化为珍品。'
  },
  {
    id: 'wind_jade3_chestnut',
    name: '风翠栗',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'jade_pumpkin',
    minSweetness: 46,
    minYield: 46,
    resultCropId: 'wind_jade3_chestnut',
    baseGenetics: { sweetness: 62, yield: 62, resistance: 53 },
    discoveryText: '金瓜与翡翠南瓜经风雨淬炼而成的珍品。'
  },
  {
    id: 'cloud_jade3_apricot',
    name: '云翠杏',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'crystal_yam',
    minSweetness: 46,
    minYield: 46,
    resultCropId: 'cloud_jade3_apricot',
    baseGenetics: { sweetness: 62, yield: 62, resistance: 54 },
    discoveryText: '金瓜与水晶山药在清风中交融，自然之韵。'
  },
  {
    id: 'rain_jade3_pear',
    name: '雨翠梨',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'osmanthus_tea',
    minSweetness: 47,
    minYield: 47,
    resultCropId: 'rain_jade3_pear',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 54 },
    discoveryText: '金瓜与桂花茶沐浴露霜，天地灵气所化。'
  },
  {
    id: 'hoar_jade3_berry',
    name: '霜翠莓',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'mountain_bamboo',
    minSweetness: 47,
    minYield: 47,
    resultCropId: 'hoar_jade3_berry',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 54 },
    discoveryText: '金瓜与山竹薯在星光下蜕变，风物之精。'
  },
  {
    id: 'thunder_jade3_peach_t',
    name: '雷翠桃',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'golden_fruit',
    minSweetness: 47,
    minYield: 47,
    resultCropId: 'thunder_jade3_peach_t',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 55 },
    discoveryText: '金瓜与金秋果汇聚山川之气，化为珍品。'
  },
  {
    id: 'rainbow_jade3_melon',
    name: '虹翠瓜',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'nut_potato',
    minSweetness: 48,
    minYield: 48,
    resultCropId: 'rainbow_jade3_melon',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 55 },
    discoveryText: '金瓜与花生薯经风雨淬炼而成的珍品。'
  },
  {
    id: 'dew_jade3_bean',
    name: '露翠豆',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'autumn_bean',
    minSweetness: 48,
    minYield: 48,
    resultCropId: 'dew_jade3_bean',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 56 },
    discoveryText: '金瓜与秋枣豆在清风中交融，自然之韵。'
  },
  {
    id: 'dawn_jade3_rice',
    name: '晨翠稻',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'jujube_blossom',
    minSweetness: 48,
    minYield: 48,
    resultCropId: 'dawn_jade3_rice',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 56 },
    discoveryText: '金瓜与枣花桃沐浴露霜，天地灵气所化。'
  },
  {
    id: 'dusk_jade3_tuber',
    name: '暮翠薯',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'ginger_blossom',
    minSweetness: 49,
    minYield: 49,
    resultCropId: 'dusk_jade3_tuber',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 56 },
    discoveryText: '金瓜与姜花菜在星光下蜕变，风物之精。'
  },
  {
    id: 'star_jade3_green',
    name: '星翠菜',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'fairy_chrysanthemum',
    minSweetness: 49,
    minYield: 49,
    resultCropId: 'star_jade3_green',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 57 },
    discoveryText: '金瓜与仙菊菜汇聚山川之气，化为珍品。'
  },
  {
    id: 'wind_aura_fruit',
    name: '风灵果',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'imperial_cabbage',
    minSweetness: 49,
    minYield: 49,
    resultCropId: 'wind_aura_fruit',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 57 },
    discoveryText: '金瓜与御品白菜经风雨淬炼而成的珍品。'
  },
  {
    id: 'cloud_aura_bloom',
    name: '云灵花',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'spicy_radish',
    minSweetness: 49,
    minYield: 49,
    resultCropId: 'cloud_aura_bloom',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 58 },
    discoveryText: '金瓜与蒜香萝卜在清风中交融，自然之韵。'
  },
  {
    id: 'rain_aura_tea',
    name: '雨灵茶',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'snow_tea',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'rain_aura_tea',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 58 },
    discoveryText: '金瓜与雪茶沐浴露霜，天地灵气所化。'
  },
  {
    id: 'hoar_aura_shoot',
    name: '霜灵笋',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'spring_chive',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'hoar_aura_shoot',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 58 },
    discoveryText: '金瓜与春韭菜在星光下蜕变，风物之精。'
  },
  {
    id: 'thunder_aura_lotus',
    name: '雷灵莲',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'wheat_potato',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'thunder_aura_lotus',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 59 },
    discoveryText: '金瓜与麦香薯汇聚山川之气，化为珍品。'
  },
  {
    id: 'rainbow_aura_wheat',
    name: '虹灵麦',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'spring_green_peach',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'rainbow_aura_wheat',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 59 },
    discoveryText: '金瓜与绿桃经风雨淬炼而成的珍品。'
  },
  {
    id: 'dew_aura_sesame',
    name: '露灵芝',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'mustard_bean',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'dew_aura_sesame',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 60 },
    discoveryText: '金瓜与芥香豆在清风中交融，自然之韵。'
  },
  {
    id: 'dawn_aura_pepper',
    name: '晨灵椒',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'frost_rapeseed',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'dawn_aura_pepper',
    baseGenetics: { sweetness: 68, yield: 68, resistance: 60 },
    discoveryText: '金瓜与霜油菜沐浴露霜，天地灵气所化。'
  },
  {
    id: 'dusk_aura_root',
    name: '暮灵参',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'purple_melon',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'dusk_aura_root',
    baseGenetics: { sweetness: 68, yield: 68, resistance: 61 },
    discoveryText: '金瓜与紫晶瓜在星光下蜕变，风物之精。'
  },
  {
    id: 'star_aura_sprout',
    name: '星灵芽',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'golden_rice',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'star_aura_sprout',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 61 },
    discoveryText: '金瓜与金芝稻汇聚山川之气，化为珍品。'
  },
  {
    id: 'wind_glow_vine',
    name: '风光藤',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'double_lotus',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'wind_glow_vine',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 61 },
    discoveryText: '金瓜与双莲经风雨淬炼而成的珍品。'
  },
  {
    id: 'cloud_glow_bud',
    name: '云光蕾',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'fire_sesame',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'cloud_glow_bud',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 62 },
    discoveryText: '金瓜与火麻仁在清风中交融，自然之韵。'
  },
  {
    id: 'rain_glow_orchid',
    name: '雨光兰',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'silk_corn',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'rain_glow_orchid',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 62 },
    discoveryText: '金瓜与丝穗沐浴露霜，天地灵气所化。'
  },
  {
    id: 'hoar_glow_gourd',
    name: '霜光葫',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'purple_lotus',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'hoar_glow_gourd',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 63 },
    discoveryText: '金瓜与紫莲茄在星光下蜕变，风物之精。'
  },
  {
    id: 'thunder_glow_herb',
    name: '雷光草',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'chrysanthemum_melon',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'thunder_glow_herb',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 63 },
    discoveryText: '金瓜与菊瓜汇聚山川之气，化为珍品。'
  },
  {
    id: 'rainbow_glow_chestnut',
    name: '虹光栗',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'pumpkin_rice',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'rainbow_glow_chestnut',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 63 },
    discoveryText: '金瓜与南瓜稻经风雨淬炼而成的珍品。'
  },
  {
    id: 'dew_glow_apricot',
    name: '露光杏',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'mountain_lotus',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'dew_glow_apricot',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 64 },
    discoveryText: '金瓜与山莲在清风中交融，自然之韵。'
  },
  {
    id: 'dawn_glow_pear',
    name: '晨光梨',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'double_nut',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'dawn_glow_pear',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 64 },
    discoveryText: '金瓜与双果仁沐浴露霜，天地灵气所化。'
  },
  {
    id: 'dusk_glow_berry',
    name: '暮光莓',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'sweet_gourd',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'dusk_glow_berry',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 65 },
    discoveryText: '金瓜与甜丝瓜在星光下蜕变，风物之精。'
  },
  {
    id: 'star_glow_peach_t',
    name: '星光桃',
    parentCropA: 'melon_tea_fruit',
    parentCropB: 'purple_persimmon',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'star_glow_peach_t',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 65 },
    discoveryText: '金瓜与紫柿汇聚山川之气，化为珍品。'
  },
  // === 四代杂交作物 ===,
  {
    id: 'moon_hua_melon',
    name: '月华瓜',
    parentCropA: 'wind_melon',
    parentCropB: 'golden_melon',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'moon_hua_melon',
    baseGenetics: { sweetness: 62, yield: 62, resistance: 52 },
    discoveryText: '蜜茶果与金瓜在天光下交融，绽放华彩。'
  },
  {
    id: 'sun_hua_bean',
    name: '日华豆',
    parentCropA: 'wind_melon',
    parentCropB: 'jade_tea',
    minSweetness: 50,
    minYield: 50,
    resultCropId: 'sun_hua_bean',
    baseGenetics: { sweetness: 62, yield: 62, resistance: 52 },
    discoveryText: '蜜茶果与翡翠茶承日月精华，辉映四方。'
  },
  {
    id: 'sky_hua_rice',
    name: '天华稻',
    parentCropA: 'wind_melon',
    parentCropB: 'phoenix_pepper',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'sky_hua_rice',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 53 },
    discoveryText: '蜜茶果与凤凰椒凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'gem_hua_tuber',
    name: '玉华薯',
    parentCropA: 'wind_melon',
    parentCropB: 'moonlight_rice',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'gem_hua_tuber',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 53 },
    discoveryText: '蜜茶果与月光稻沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'prism_hua_green',
    name: '琉华菜',
    parentCropA: 'wind_melon',
    parentCropB: 'frost_garlic',
    minSweetness: 51,
    minYield: 51,
    resultCropId: 'prism_hua_green',
    baseGenetics: { sweetness: 63, yield: 63, resistance: 53 },
    discoveryText: '蜜茶果与霜雪蒜在月华中蜕变，天赐之品。'
  },
  {
    id: 'silver_hua_fruit',
    name: '银华果',
    parentCropA: 'wind_melon',
    parentCropB: 'emerald_radish',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'silver_hua_fruit',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 54 },
    discoveryText: '蜜茶果与翡翠萝卜在天光下交融，绽放华彩。'
  },
  {
    id: 'verdant_hua_bloom',
    name: '翠华花',
    parentCropA: 'wind_melon',
    parentCropB: 'jade_shoot',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'verdant_hua_bloom',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 54 },
    discoveryText: '蜜茶果与碧玉笋承日月精华，辉映四方。'
  },
  {
    id: 'violet_hua_tea',
    name: '紫华茶',
    parentCropA: 'wind_melon',
    parentCropB: 'golden_tuber',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'violet_hua_tea',
    baseGenetics: { sweetness: 64, yield: 64, resistance: 55 },
    discoveryText: '蜜茶果与金油薯凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'scarlet_hua_shoot',
    name: '丹华笋',
    parentCropA: 'wind_melon',
    parentCropB: 'peach_blossom_tea',
    minSweetness: 52,
    minYield: 52,
    resultCropId: 'scarlet_hua_shoot',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '蜜茶果与桃花茶沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'azure_hua_lotus',
    name: '青华莲',
    parentCropA: 'wind_melon',
    parentCropB: 'ruby_bean',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'azure_hua_lotus',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 55 },
    discoveryText: '蜜茶果与红宝豆在月华中蜕变，天赐之品。'
  },
  {
    id: 'moon_shine_wheat',
    name: '月辉麦',
    parentCropA: 'wind_melon',
    parentCropB: 'twin_bean',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'moon_shine_wheat',
    baseGenetics: { sweetness: 65, yield: 65, resistance: 56 },
    discoveryText: '蜜茶果与双子豆在天光下交融，绽放华彩。'
  },
  {
    id: 'sun_shine_sesame',
    name: '日辉芝',
    parentCropA: 'wind_melon',
    parentCropB: 'jade_melon',
    minSweetness: 53,
    minYield: 53,
    resultCropId: 'sun_shine_sesame',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 56 },
    discoveryText: '蜜茶果与碧玉瓜承日月精华，辉映四方。'
  },
  {
    id: 'sky_shine_pepper',
    name: '天辉椒',
    parentCropA: 'wind_melon',
    parentCropB: 'pearl_grain',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'sky_shine_pepper',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 56 },
    discoveryText: '蜜茶果与珍珠谷凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'gem_shine_root',
    name: '玉辉参',
    parentCropA: 'wind_melon',
    parentCropB: 'golden_corn',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'gem_shine_root',
    baseGenetics: { sweetness: 66, yield: 66, resistance: 57 },
    discoveryText: '蜜茶果与金穗玉米沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'prism_shine_sprout',
    name: '琉辉芽',
    parentCropA: 'wind_melon',
    parentCropB: 'lotus_tea',
    minSweetness: 54,
    minYield: 54,
    resultCropId: 'prism_shine_sprout',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 57 },
    discoveryText: '蜜茶果与莲心茶在月华中蜕变，天赐之品。'
  },
  {
    id: 'silver_shine_vine',
    name: '银辉藤',
    parentCropA: 'wind_melon',
    parentCropB: 'purple_bamboo',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'silver_shine_vine',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 58 },
    discoveryText: '蜜茶果与紫竹茄在天光下交融，绽放华彩。'
  },
  {
    id: 'verdant_shine_bud',
    name: '翠辉蕾',
    parentCropA: 'wind_melon',
    parentCropB: 'honey_peach_melon',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'verdant_shine_bud',
    baseGenetics: { sweetness: 67, yield: 67, resistance: 58 },
    discoveryText: '蜜茶果与蜜桃瓜承日月精华，辉映四方。'
  },
  {
    id: 'violet_shine_orchid',
    name: '紫辉兰',
    parentCropA: 'wind_melon',
    parentCropB: 'fire_bean',
    minSweetness: 55,
    minYield: 55,
    resultCropId: 'violet_shine_orchid',
    baseGenetics: { sweetness: 68, yield: 68, resistance: 58 },
    discoveryText: '蜜茶果与火豆凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'scarlet_shine_gourd',
    name: '丹辉葫',
    parentCropA: 'wind_melon',
    parentCropB: 'silk_bean',
    minSweetness: 56,
    minYield: 56,
    resultCropId: 'scarlet_shine_gourd',
    baseGenetics: { sweetness: 68, yield: 68, resistance: 59 },
    discoveryText: '蜜茶果与丝豆沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'azure_shine_herb',
    name: '青辉草',
    parentCropA: 'wind_melon',
    parentCropB: 'double_oil_seed',
    minSweetness: 56,
    minYield: 56,
    resultCropId: 'azure_shine_herb',
    baseGenetics: { sweetness: 68, yield: 68, resistance: 59 },
    discoveryText: '蜜茶果与双油籽在月华中蜕变，天赐之品。'
  },
  {
    id: 'moon_fortune_chestnut',
    name: '月瑞栗',
    parentCropA: 'wind_melon',
    parentCropB: 'lotus_potato',
    minSweetness: 56,
    minYield: 56,
    resultCropId: 'moon_fortune_chestnut',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 59 },
    discoveryText: '蜜茶果与莲花薯在天光下交融，绽放华彩。'
  },
  {
    id: 'sun_fortune_apricot',
    name: '日瑞杏',
    parentCropA: 'wind_melon',
    parentCropB: 'jade_pumpkin',
    minSweetness: 56,
    minYield: 56,
    resultCropId: 'sun_fortune_apricot',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 60 },
    discoveryText: '蜜茶果与翡翠南瓜承日月精华，辉映四方。'
  },
  {
    id: 'sky_fortune_pear',
    name: '天瑞梨',
    parentCropA: 'wind_melon',
    parentCropB: 'crystal_yam',
    minSweetness: 57,
    minYield: 57,
    resultCropId: 'sky_fortune_pear',
    baseGenetics: { sweetness: 69, yield: 69, resistance: 60 },
    discoveryText: '蜜茶果与水晶山药凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'gem_fortune_berry',
    name: '玉瑞莓',
    parentCropA: 'wind_melon',
    parentCropB: 'osmanthus_tea',
    minSweetness: 57,
    minYield: 57,
    resultCropId: 'gem_fortune_berry',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 60 },
    discoveryText: '蜜茶果与桂花茶沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'prism_fortune_peach_t',
    name: '琉瑞桃',
    parentCropA: 'wind_melon',
    parentCropB: 'mountain_bamboo',
    minSweetness: 57,
    minYield: 57,
    resultCropId: 'prism_fortune_peach_t',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 61 },
    discoveryText: '蜜茶果与山竹薯在月华中蜕变，天赐之品。'
  },
  {
    id: 'silver_fortune_melon',
    name: '银瑞瓜',
    parentCropA: 'wind_melon',
    parentCropB: 'golden_fruit',
    minSweetness: 58,
    minYield: 58,
    resultCropId: 'silver_fortune_melon',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 61 },
    discoveryText: '蜜茶果与金秋果在天光下交融，绽放华彩。'
  },
  {
    id: 'verdant_fortune_bean',
    name: '翠瑞豆',
    parentCropA: 'wind_melon',
    parentCropB: 'nut_potato',
    minSweetness: 58,
    minYield: 58,
    resultCropId: 'verdant_fortune_bean',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 62 },
    discoveryText: '蜜茶果与花生薯承日月精华，辉映四方。'
  },
  {
    id: 'violet_fortune_rice',
    name: '紫瑞稻',
    parentCropA: 'wind_melon',
    parentCropB: 'autumn_bean',
    minSweetness: 58,
    minYield: 58,
    resultCropId: 'violet_fortune_rice',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 62 },
    discoveryText: '蜜茶果与秋枣豆凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'scarlet_fortune_tuber',
    name: '丹瑞薯',
    parentCropA: 'wind_melon',
    parentCropB: 'jujube_blossom',
    minSweetness: 59,
    minYield: 59,
    resultCropId: 'scarlet_fortune_tuber',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 62 },
    discoveryText: '蜜茶果与枣花桃沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'azure_fortune_green',
    name: '青瑞菜',
    parentCropA: 'wind_melon',
    parentCropB: 'ginger_blossom',
    minSweetness: 59,
    minYield: 59,
    resultCropId: 'azure_fortune_green',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 63 },
    discoveryText: '蜜茶果与姜花菜在月华中蜕变，天赐之品。'
  },
  {
    id: 'moon_glory_fruit',
    name: '月祥果',
    parentCropA: 'wind_melon',
    parentCropB: 'fairy_chrysanthemum',
    minSweetness: 59,
    minYield: 59,
    resultCropId: 'moon_glory_fruit',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 63 },
    discoveryText: '蜜茶果与仙菊菜在天光下交融，绽放华彩。'
  },
  {
    id: 'sun_glory_bloom',
    name: '日祥花',
    parentCropA: 'wind_melon',
    parentCropB: 'imperial_cabbage',
    minSweetness: 59,
    minYield: 59,
    resultCropId: 'sun_glory_bloom',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 63 },
    discoveryText: '蜜茶果与御品白菜承日月精华，辉映四方。'
  },
  {
    id: 'sky_glory_tea',
    name: '天祥茶',
    parentCropA: 'wind_melon',
    parentCropB: 'spicy_radish',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'sky_glory_tea',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 64 },
    discoveryText: '蜜茶果与蒜香萝卜凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'gem_glory_shoot',
    name: '玉祥笋',
    parentCropA: 'wind_melon',
    parentCropB: 'snow_tea',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'gem_glory_shoot',
    baseGenetics: { sweetness: 73, yield: 73, resistance: 64 },
    discoveryText: '蜜茶果与雪茶沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'prism_glory_lotus',
    name: '琉祥莲',
    parentCropA: 'wind_melon',
    parentCropB: 'spring_chive',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'prism_glory_lotus',
    baseGenetics: { sweetness: 73, yield: 73, resistance: 64 },
    discoveryText: '蜜茶果与春韭菜在月华中蜕变，天赐之品。'
  },
  {
    id: 'silver_glory_wheat',
    name: '银祥麦',
    parentCropA: 'wind_melon',
    parentCropB: 'wheat_potato',
    minSweetness: 61,
    minYield: 61,
    resultCropId: 'silver_glory_wheat',
    baseGenetics: { sweetness: 73, yield: 73, resistance: 65 },
    discoveryText: '蜜茶果与麦香薯在天光下交融，绽放华彩。'
  },
  {
    id: 'verdant_glory_sesame',
    name: '翠祥芝',
    parentCropA: 'wind_melon',
    parentCropB: 'spring_green_peach',
    minSweetness: 61,
    minYield: 61,
    resultCropId: 'verdant_glory_sesame',
    baseGenetics: { sweetness: 74, yield: 74, resistance: 65 },
    discoveryText: '蜜茶果与绿桃承日月精华，辉映四方。'
  },
  {
    id: 'violet_glory_pepper',
    name: '紫祥椒',
    parentCropA: 'wind_melon',
    parentCropB: 'mustard_bean',
    minSweetness: 61,
    minYield: 61,
    resultCropId: 'violet_glory_pepper',
    baseGenetics: { sweetness: 74, yield: 74, resistance: 66 },
    discoveryText: '蜜茶果与芥香豆凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'scarlet_glory_root',
    name: '丹祥参',
    parentCropA: 'wind_melon',
    parentCropB: 'frost_rapeseed',
    minSweetness: 62,
    minYield: 62,
    resultCropId: 'scarlet_glory_root',
    baseGenetics: { sweetness: 74, yield: 74, resistance: 66 },
    discoveryText: '蜜茶果与霜油菜沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'azure_glory_sprout',
    name: '青祥芽',
    parentCropA: 'wind_melon',
    parentCropB: 'purple_melon',
    minSweetness: 62,
    minYield: 62,
    resultCropId: 'azure_glory_sprout',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 66 },
    discoveryText: '蜜茶果与紫晶瓜在月华中蜕变，天赐之品。'
  },
  {
    id: 'moon_prism4_vine',
    name: '月彩藤',
    parentCropA: 'wind_melon',
    parentCropB: 'golden_rice',
    minSweetness: 62,
    minYield: 62,
    resultCropId: 'moon_prism4_vine',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 67 },
    discoveryText: '蜜茶果与金芝稻在天光下交融，绽放华彩。'
  },
  {
    id: 'sun_prism4_bud',
    name: '日彩蕾',
    parentCropA: 'wind_melon',
    parentCropB: 'double_lotus',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'sun_prism4_bud',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 67 },
    discoveryText: '蜜茶果与双莲承日月精华，辉映四方。'
  },
  {
    id: 'sky_prism4_orchid',
    name: '天彩兰',
    parentCropA: 'wind_melon',
    parentCropB: 'fire_sesame',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'sky_prism4_orchid',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 67 },
    discoveryText: '蜜茶果与火麻仁凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'gem_prism4_gourd',
    name: '玉彩葫',
    parentCropA: 'wind_melon',
    parentCropB: 'silk_corn',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'gem_prism4_gourd',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 68 },
    discoveryText: '蜜茶果与丝穗沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'prism_prism4_herb',
    name: '琉彩草',
    parentCropA: 'wind_melon',
    parentCropB: 'purple_lotus',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'prism_prism4_herb',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 68 },
    discoveryText: '蜜茶果与紫莲茄在月华中蜕变，天赐之品。'
  },
  {
    id: 'silver_prism4_chestnut',
    name: '银彩栗',
    parentCropA: 'wind_melon',
    parentCropB: 'chrysanthemum_melon',
    minSweetness: 64,
    minYield: 64,
    resultCropId: 'silver_prism4_chestnut',
    baseGenetics: { sweetness: 77, yield: 77, resistance: 69 },
    discoveryText: '蜜茶果与菊瓜在天光下交融，绽放华彩。'
  },
  {
    id: 'verdant_prism4_apricot',
    name: '翠彩杏',
    parentCropA: 'wind_melon',
    parentCropB: 'pumpkin_rice',
    minSweetness: 64,
    minYield: 64,
    resultCropId: 'verdant_prism4_apricot',
    baseGenetics: { sweetness: 77, yield: 77, resistance: 69 },
    discoveryText: '蜜茶果与南瓜稻承日月精华，辉映四方。'
  },
  {
    id: 'violet_prism4_pear',
    name: '紫彩梨',
    parentCropA: 'wind_melon',
    parentCropB: 'mountain_lotus',
    minSweetness: 64,
    minYield: 64,
    resultCropId: 'violet_prism4_pear',
    baseGenetics: { sweetness: 77, yield: 77, resistance: 69 },
    discoveryText: '蜜茶果与山莲凝天地灵气，瑞光盈盈。'
  },
  {
    id: 'scarlet_prism4_berry',
    name: '丹彩莓',
    parentCropA: 'wind_melon',
    parentCropB: 'double_nut',
    minSweetness: 65,
    minYield: 65,
    resultCropId: 'scarlet_prism4_berry',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 70 },
    discoveryText: '蜜茶果与双果仁沐浴星辉，祥瑞之兆。'
  },
  {
    id: 'azure_prism4_peach_t',
    name: '青彩桃',
    parentCropA: 'wind_melon',
    parentCropB: 'sweet_gourd',
    minSweetness: 65,
    minYield: 65,
    resultCropId: 'azure_prism4_peach_t',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 70 },
    discoveryText: '蜜茶果与甜丝瓜在月华中蜕变，天赐之品。'
  },
  // === 五代杂交作物 ===,
  {
    id: 'precious_light5_melon',
    name: '瑶光瓜',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'melon_tea_fruit',
    minSweetness: 60,
    minYield: 60,
    resultCropId: 'precious_light5_melon',
    baseGenetics: { sweetness: 70, yield: 70, resistance: 60 },
    discoveryText: '风瓜与蜜茶果的精华凝结，珍贵异常。'
  },
  {
    id: 'rare_light5_bean',
    name: '琼光豆',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'dragon_fire',
    minSweetness: 61,
    minYield: 61,
    resultCropId: 'rare_light5_bean',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 61 },
    discoveryText: '风瓜与龙火椒在晨曦中绽放瑶光。'
  },
  {
    id: 'magnif_light5_rice',
    name: '瑰光稻',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'celestial_rice',
    minSweetness: 61,
    minYield: 61,
    resultCropId: 'magnif_light5_rice',
    baseGenetics: { sweetness: 71, yield: 71, resistance: 62 },
    discoveryText: '风瓜与天香稻汇聚琼露，锦绣天成。'
  },
  {
    id: 'radiant_light5_tuber',
    name: '曦光薯',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'ice_lotus',
    minSweetness: 62,
    minYield: 62,
    resultCropId: 'radiant_light5_tuber',
    baseGenetics: { sweetness: 72, yield: 72, resistance: 62 },
    discoveryText: '风瓜与冰莲璃光交映，绮丽非凡。'
  },
  {
    id: 'lustrous_light5_green',
    name: '璃光菜',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'jade_peach_tea',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'lustrous_light5_green',
    baseGenetics: { sweetness: 73, yield: 73, resistance: 63 },
    discoveryText: '风瓜与翠桃茶凝珊瑚之精，琳琅之品。'
  },
  {
    id: 'precious_hua5_fruit',
    name: '瑶华果',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'golden_dragon',
    minSweetness: 63,
    minYield: 63,
    resultCropId: 'precious_hua5_fruit',
    baseGenetics: { sweetness: 73, yield: 73, resistance: 64 },
    discoveryText: '风瓜与金龙果的精华凝结，珍贵异常。'
  },
  {
    id: 'rare_hua5_bloom',
    name: '琼华花',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'moonlight_frost',
    minSweetness: 64,
    minYield: 64,
    resultCropId: 'rare_hua5_bloom',
    baseGenetics: { sweetness: 74, yield: 74, resistance: 65 },
    discoveryText: '风瓜与月霜稻在晨曦中绽放瑶光。'
  },
  {
    id: 'magnif_hua5_tea',
    name: '瑰华茶',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'jade_golden_melon',
    minSweetness: 64,
    minYield: 64,
    resultCropId: 'magnif_hua5_tea',
    baseGenetics: { sweetness: 74, yield: 74, resistance: 65 },
    discoveryText: '风瓜与翡翠金瓜汇聚琼露，锦绣天成。'
  },
  {
    id: 'radiant_hua5_shoot',
    name: '曦华笋',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'immortal_flower',
    minSweetness: 65,
    minYield: 65,
    resultCropId: 'radiant_hua5_shoot',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 66 },
    discoveryText: '风瓜与仙人花璃光交映，绮丽非凡。'
  },
  {
    id: 'lustrous_hua5_lotus',
    name: '璃华莲',
    parentCropA: 'moon_hua_melon',
    parentCropB: 'dragon_pearl',
    minSweetness: 66,
    minYield: 66,
    resultCropId: 'lustrous_hua5_lotus',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 67 },
    discoveryText: '风瓜与龙珠凝珊瑚之精，琳琅之品。'
  },
  {
    id: 'precious_dewdrop_wheat',
    name: '瑶露麦',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'ice_lotus',
    minSweetness: 66,
    minYield: 66,
    resultCropId: 'precious_dewdrop_wheat',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 68 },
    discoveryText: '云豆与冰莲的精华凝结，珍贵异常。'
  },
  {
    id: 'rare_dewdrop_sesame',
    name: '琼露芝',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'jade_peach_tea',
    minSweetness: 67,
    minYield: 67,
    resultCropId: 'rare_dewdrop_sesame',
    baseGenetics: { sweetness: 77, yield: 77, resistance: 68 },
    discoveryText: '云豆与翠桃茶在晨曦中绽放瑶光。'
  },
  {
    id: 'magnif_dewdrop_pepper',
    name: '瑰露椒',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'golden_dragon',
    minSweetness: 68,
    minYield: 68,
    resultCropId: 'magnif_dewdrop_pepper',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 69 },
    discoveryText: '云豆与金龙果汇聚琼露，锦绣天成。'
  },
  {
    id: 'radiant_dewdrop_root',
    name: '曦露参',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'moonlight_frost',
    minSweetness: 68,
    minYield: 68,
    resultCropId: 'radiant_dewdrop_root',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 70 },
    discoveryText: '云豆与月霜稻璃光交映，绮丽非凡。'
  },
  {
    id: 'lustrous_dewdrop_sprout',
    name: '璃露芽',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'jade_golden_melon',
    minSweetness: 69,
    minYield: 69,
    resultCropId: 'lustrous_dewdrop_sprout',
    baseGenetics: { sweetness: 79, yield: 79, resistance: 71 },
    discoveryText: '云豆与翡翠金瓜凝珊瑚之精，琳琅之品。'
  },
  {
    id: 'precious_soul_vine',
    name: '瑶灵藤',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'immortal_flower',
    minSweetness: 69,
    minYield: 69,
    resultCropId: 'precious_soul_vine',
    baseGenetics: { sweetness: 79, yield: 79, resistance: 71 },
    discoveryText: '云豆与仙人花的精华凝结，珍贵异常。'
  },
  {
    id: 'rare_soul_bud',
    name: '琼灵蕾',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'dragon_pearl',
    minSweetness: 70,
    minYield: 70,
    resultCropId: 'rare_soul_bud',
    baseGenetics: { sweetness: 80, yield: 80, resistance: 72 },
    discoveryText: '云豆与龙珠在晨曦中绽放瑶光。'
  },
  {
    id: 'magnif_soul_orchid',
    name: '瑰灵兰',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'melon_tea_fruit',
    minSweetness: 71,
    minYield: 71,
    resultCropId: 'magnif_soul_orchid',
    baseGenetics: { sweetness: 81, yield: 81, resistance: 73 },
    discoveryText: '云豆与蜜茶果汇聚琼露，锦绣天成。'
  },
  {
    id: 'radiant_soul_gourd',
    name: '曦灵葫',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'dragon_fire',
    minSweetness: 71,
    minYield: 71,
    resultCropId: 'radiant_soul_gourd',
    baseGenetics: { sweetness: 81, yield: 81, resistance: 74 },
    discoveryText: '云豆与龙火椒璃光交映，绮丽非凡。'
  },
  {
    id: 'lustrous_soul_herb',
    name: '璃灵草',
    parentCropA: 'sun_hua_bean',
    parentCropB: 'celestial_rice',
    minSweetness: 72,
    minYield: 72,
    resultCropId: 'lustrous_soul_herb',
    baseGenetics: { sweetness: 82, yield: 82, resistance: 74 },
    discoveryText: '云豆与天香稻凝珊瑚之精，琳琅之品。'
  },
  {
    id: 'precious_silk5_chestnut',
    name: '瑶锦栗',
    parentCropA: 'sky_hua_rice',
    parentCropB: 'moonlight_frost',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'precious_silk5_chestnut',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 75 },
    discoveryText: '雨稻与月霜稻的精华凝结，珍贵异常。'
  },
  {
    id: 'rare_silk5_apricot',
    name: '琼锦杏',
    parentCropA: 'sky_hua_rice',
    parentCropB: 'jade_golden_melon',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'rare_silk5_apricot',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 76 },
    discoveryText: '雨稻与翡翠金瓜在晨曦中绽放瑶光。'
  },
  {
    id: 'magnif_silk5_pear',
    name: '瑰锦梨',
    parentCropA: 'sky_hua_rice',
    parentCropB: 'immortal_flower',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'magnif_silk5_pear',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 77 },
    discoveryText: '雨稻与仙人花汇聚琼露，锦绣天成。'
  },
  {
    id: 'radiant_silk5_berry',
    name: '曦锦莓',
    parentCropA: 'sky_hua_rice',
    parentCropB: 'dragon_pearl',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'radiant_silk5_berry',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 77 },
    discoveryText: '雨稻与龙珠璃光交映，绮丽非凡。'
  },
  {
    id: 'lustrous_silk5_peach_t',
    name: '璃锦桃',
    parentCropA: 'sky_hua_rice',
    parentCropB: 'melon_tea_fruit',
    minSweetness: 75,
    minYield: 75,
    resultCropId: 'lustrous_silk5_peach_t',
    baseGenetics: { sweetness: 85, yield: 85, resistance: 78 },
    discoveryText: '雨稻与蜜茶果凝珊瑚之精，琳琅之品。'
  },
  // === 六代杂交作物 ===,
  {
    id: 'spirit_wonder_melon',
    name: '灵妙瓜',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'wind_melon',
    minSweetness: 65,
    minYield: 65,
    resultCropId: 'spirit_wonder_melon',
    baseGenetics: { sweetness: 75, yield: 75, resistance: 65 },
    discoveryText: '月华瓜与风瓜灵气交汇，仙韵天成。'
  },
  {
    id: 'fairy_wonder_bean',
    name: '仙妙豆',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'cloud_bean',
    minSweetness: 66,
    minYield: 66,
    resultCropId: 'fairy_wonder_bean',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 66 },
    discoveryText: '月华瓜与云豆圣华流转，超凡入圣。'
  },
  {
    id: 'holy_wonder_rice',
    name: '圣妙稻',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'rain_rice',
    minSweetness: 66,
    minYield: 66,
    resultCropId: 'holy_wonder_rice',
    baseGenetics: { sweetness: 76, yield: 76, resistance: 66 },
    discoveryText: '月华瓜与雨稻神妙莫测，真灵之品。'
  },
  {
    id: 'divine_wonder_tuber',
    name: '神妙薯',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'hoar_tuber',
    minSweetness: 67,
    minYield: 67,
    resultCropId: 'divine_wonder_tuber',
    baseGenetics: { sweetness: 77, yield: 77, resistance: 67 },
    discoveryText: '月华瓜与霜薯幻梦交织，禅意盎然。'
  },
  {
    id: 'trueth_wonder_green',
    name: '真妙菜',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'thunder_green',
    minSweetness: 68,
    minYield: 68,
    resultCropId: 'trueth_wonder_green',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 68 },
    discoveryText: '月华瓜与雷菜仙灵缭绕，不染尘埃。'
  },
  {
    id: 'spirit_grace6_fruit',
    name: '灵华果',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'rainbow_fruit',
    minSweetness: 68,
    minYield: 68,
    resultCropId: 'spirit_grace6_fruit',
    baseGenetics: { sweetness: 78, yield: 78, resistance: 69 },
    discoveryText: '月华瓜与虹果灵气交汇，仙韵天成。'
  },
  {
    id: 'fairy_grace6_bloom',
    name: '仙华花',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dew_bloom',
    minSweetness: 69,
    minYield: 69,
    resultCropId: 'fairy_grace6_bloom',
    baseGenetics: { sweetness: 79, yield: 79, resistance: 69 },
    discoveryText: '月华瓜与露花圣华流转，超凡入圣。'
  },
  {
    id: 'holy_grace6_tea',
    name: '圣华茶',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dawn_tea',
    minSweetness: 69,
    minYield: 69,
    resultCropId: 'holy_grace6_tea',
    baseGenetics: { sweetness: 79, yield: 79, resistance: 70 },
    discoveryText: '月华瓜与晨茶神妙莫测，真灵之品。'
  },
  {
    id: 'divine_grace6_shoot',
    name: '神华笋',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dusk_shoot',
    minSweetness: 70,
    minYield: 70,
    resultCropId: 'divine_grace6_shoot',
    baseGenetics: { sweetness: 80, yield: 80, resistance: 71 },
    discoveryText: '月华瓜与暮笋幻梦交织，禅意盎然。'
  },
  {
    id: 'trueth_grace6_lotus',
    name: '真华莲',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'star_lotus',
    minSweetness: 71,
    minYield: 71,
    resultCropId: 'trueth_grace6_lotus',
    baseGenetics: { sweetness: 81, yield: 81, resistance: 71 },
    discoveryText: '月华瓜与星莲仙灵缭绕，不染尘埃。'
  },
  {
    id: 'spirit_phantom_wheat',
    name: '灵幻麦',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'wind_splendor_wheat',
    minSweetness: 71,
    minYield: 71,
    resultCropId: 'spirit_phantom_wheat',
    baseGenetics: { sweetness: 81, yield: 81, resistance: 72 },
    discoveryText: '月华瓜与风华麦灵气交汇，仙韵天成。'
  },
  {
    id: 'fairy_phantom_sesame',
    name: '仙幻芝',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'cloud_splendor_sesame',
    minSweetness: 72,
    minYield: 72,
    resultCropId: 'fairy_phantom_sesame',
    baseGenetics: { sweetness: 82, yield: 82, resistance: 73 },
    discoveryText: '月华瓜与云华芝圣华流转，超凡入圣。'
  },
  {
    id: 'holy_phantom_pepper',
    name: '圣幻椒',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'rain_splendor_pepper',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'holy_phantom_pepper',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 74 },
    discoveryText: '月华瓜与雨华椒神妙莫测，真灵之品。'
  },
  {
    id: 'divine_phantom_root',
    name: '神幻参',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'hoar_splendor_root',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'divine_phantom_root',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 74 },
    discoveryText: '月华瓜与霜华参幻梦交织，禅意盎然。'
  },
  {
    id: 'trueth_phantom_sprout',
    name: '真幻芽',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'thunder_splendor_sprout',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'trueth_phantom_sprout',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 75 },
    discoveryText: '月华瓜与雷华芽仙灵缭绕，不染尘埃。'
  },
  {
    id: 'spirit_dream_vine',
    name: '灵梦藤',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'rainbow_splendor_vine',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'spirit_dream_vine',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 76 },
    discoveryText: '月华瓜与虹华藤灵气交汇，仙韵天成。'
  },
  {
    id: 'fairy_dream_bud',
    name: '仙梦蕾',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dew_splendor_bud',
    minSweetness: 75,
    minYield: 75,
    resultCropId: 'fairy_dream_bud',
    baseGenetics: { sweetness: 85, yield: 85, resistance: 76 },
    discoveryText: '月华瓜与露华蕾圣华流转，超凡入圣。'
  },
  {
    id: 'holy_dream_orchid',
    name: '圣梦兰',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dawn_splendor_orchid',
    minSweetness: 76,
    minYield: 76,
    resultCropId: 'holy_dream_orchid',
    baseGenetics: { sweetness: 86, yield: 86, resistance: 77 },
    discoveryText: '月华瓜与晨华兰神妙莫测，真灵之品。'
  },
  {
    id: 'divine_dream_gourd',
    name: '神梦葫',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'dusk_splendor_gourd',
    minSweetness: 76,
    minYield: 76,
    resultCropId: 'divine_dream_gourd',
    baseGenetics: { sweetness: 86, yield: 86, resistance: 78 },
    discoveryText: '月华瓜与暮华葫幻梦交织，禅意盎然。'
  },
  {
    id: 'trueth_dream_herb',
    name: '真梦草',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'star_splendor_herb',
    minSweetness: 77,
    minYield: 77,
    resultCropId: 'trueth_dream_herb',
    baseGenetics: { sweetness: 87, yield: 87, resistance: 78 },
    discoveryText: '月华瓜与星华草仙灵缭绕，不染尘埃。'
  },
  {
    id: 'spirit_zen_chestnut',
    name: '灵禅栗',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'wind_jade3_chestnut',
    minSweetness: 78,
    minYield: 78,
    resultCropId: 'spirit_zen_chestnut',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 79 },
    discoveryText: '月华瓜与风翠栗灵气交汇，仙韵天成。'
  },
  {
    id: 'fairy_zen_apricot',
    name: '仙禅杏',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'cloud_jade3_apricot',
    minSweetness: 78,
    minYield: 78,
    resultCropId: 'fairy_zen_apricot',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 80 },
    discoveryText: '月华瓜与云翠杏圣华流转，超凡入圣。'
  },
  {
    id: 'holy_zen_pear',
    name: '圣禅梨',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'rain_jade3_pear',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'holy_zen_pear',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 81 },
    discoveryText: '月华瓜与雨翠梨神妙莫测，真灵之品。'
  },
  {
    id: 'divine_zen_berry',
    name: '神禅莓',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'hoar_jade3_berry',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'divine_zen_berry',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 81 },
    discoveryText: '月华瓜与霜翠莓幻梦交织，禅意盎然。'
  },
  {
    id: 'trueth_zen_peach_t',
    name: '真禅桃',
    parentCropA: 'precious_light5_melon',
    parentCropB: 'thunder_jade3_peach_t',
    minSweetness: 80,
    minYield: 80,
    resultCropId: 'trueth_zen_peach_t',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 82 },
    discoveryText: '月华瓜与雷翠桃仙灵缭绕，不染尘埃。'
  },
  // === 七代杂交作物 ===,
  {
    id: 'draco_song_melon',
    name: '龙吟瓜',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'moon_hua_melon',
    minSweetness: 72,
    minYield: 72,
    resultCropId: 'draco_song_melon',
    baseGenetics: { sweetness: 82, yield: 82, resistance: 72 },
    discoveryText: '瑶光瓜与月华瓜的神力融合，有神兽之威。'
  },
  {
    id: 'fenghuang_song_bean',
    name: '凤吟豆',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sun_hua_bean',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'fenghuang_song_bean',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 73 },
    discoveryText: '瑶光瓜与日华豆龙吟凤鸣，瑞兽降世。'
  },
  {
    id: 'qilin_song_rice',
    name: '麟吟稻',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sky_hua_rice',
    minSweetness: 73,
    minYield: 73,
    resultCropId: 'qilin_song_rice',
    baseGenetics: { sweetness: 83, yield: 83, resistance: 73 },
    discoveryText: '瑶光瓜与天华稻虎啸山林，鹤舞九天。'
  },
  {
    id: 'crane_song_tuber',
    name: '鹤吟薯',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'gem_hua_tuber',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'crane_song_tuber',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 74 },
    discoveryText: '瑶光瓜与玉华薯麟光闪耀，百兽朝拜。'
  },
  {
    id: 'tiger_song_green',
    name: '虎吟菜',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'prism_hua_green',
    minSweetness: 74,
    minYield: 74,
    resultCropId: 'tiger_song_green',
    baseGenetics: { sweetness: 84, yield: 84, resistance: 75 },
    discoveryText: '瑶光瓜与琉华菜蛟龙出水，威震八方。'
  },
  {
    id: 'draco_dance_fruit',
    name: '龙舞果',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'silver_hua_fruit',
    minSweetness: 75,
    minYield: 75,
    resultCropId: 'draco_dance_fruit',
    baseGenetics: { sweetness: 85, yield: 85, resistance: 75 },
    discoveryText: '瑶光瓜与银华果的神力融合，有神兽之威。'
  },
  {
    id: 'fenghuang_dance_bloom',
    name: '凤舞花',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'verdant_hua_bloom',
    minSweetness: 75,
    minYield: 75,
    resultCropId: 'fenghuang_dance_bloom',
    baseGenetics: { sweetness: 85, yield: 85, resistance: 76 },
    discoveryText: '瑶光瓜与翠华花龙吟凤鸣，瑞兽降世。'
  },
  {
    id: 'qilin_dance_tea',
    name: '麟舞茶',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'violet_hua_tea',
    minSweetness: 76,
    minYield: 76,
    resultCropId: 'qilin_dance_tea',
    baseGenetics: { sweetness: 86, yield: 86, resistance: 77 },
    discoveryText: '瑶光瓜与紫华茶虎啸山林，鹤舞九天。'
  },
  {
    id: 'crane_dance_shoot',
    name: '鹤舞笋',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'scarlet_hua_shoot',
    minSweetness: 76,
    minYield: 76,
    resultCropId: 'crane_dance_shoot',
    baseGenetics: { sweetness: 86, yield: 86, resistance: 77 },
    discoveryText: '瑶光瓜与丹华笋麟光闪耀，百兽朝拜。'
  },
  {
    id: 'tiger_dance_lotus',
    name: '虎舞莲',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'azure_hua_lotus',
    minSweetness: 77,
    minYield: 77,
    resultCropId: 'tiger_dance_lotus',
    baseGenetics: { sweetness: 87, yield: 87, resistance: 78 },
    discoveryText: '瑶光瓜与青华莲蛟龙出水，威震八方。'
  },
  {
    id: 'draco_gleam7_wheat',
    name: '龙辉麦',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'moon_shine_wheat',
    minSweetness: 77,
    minYield: 77,
    resultCropId: 'draco_gleam7_wheat',
    baseGenetics: { sweetness: 87, yield: 87, resistance: 79 },
    discoveryText: '瑶光瓜与月辉麦的神力融合，有神兽之威。'
  },
  {
    id: 'fenghuang_gleam7_sesame',
    name: '凤辉芝',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sun_shine_sesame',
    minSweetness: 78,
    minYield: 78,
    resultCropId: 'fenghuang_gleam7_sesame',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 79 },
    discoveryText: '瑶光瓜与日辉芝龙吟凤鸣，瑞兽降世。'
  },
  {
    id: 'qilin_gleam7_pepper',
    name: '麟辉椒',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sky_shine_pepper',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'qilin_gleam7_pepper',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 80 },
    discoveryText: '瑶光瓜与天辉椒虎啸山林，鹤舞九天。'
  },
  {
    id: 'crane_gleam7_root',
    name: '鹤辉参',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'gem_shine_root',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'crane_gleam7_root',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 81 },
    discoveryText: '瑶光瓜与玉辉参麟光闪耀，百兽朝拜。'
  },
  {
    id: 'tiger_gleam7_sprout',
    name: '虎辉芽',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'prism_shine_sprout',
    minSweetness: 80,
    minYield: 80,
    resultCropId: 'tiger_gleam7_sprout',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 81 },
    discoveryText: '瑶光瓜与琉辉芽蛟龙出水，威震八方。'
  },
  {
    id: 'draco_shadow_vine',
    name: '龙影藤',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'silver_shine_vine',
    minSweetness: 80,
    minYield: 80,
    resultCropId: 'draco_shadow_vine',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 82 },
    discoveryText: '瑶光瓜与银辉藤的神力融合，有神兽之威。'
  },
  {
    id: 'fenghuang_shadow_bud',
    name: '凤影蕾',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'verdant_shine_bud',
    minSweetness: 81,
    minYield: 81,
    resultCropId: 'fenghuang_shadow_bud',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 83 },
    discoveryText: '瑶光瓜与翠辉蕾龙吟凤鸣，瑞兽降世。'
  },
  {
    id: 'qilin_shadow_orchid',
    name: '麟影兰',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'violet_shine_orchid',
    minSweetness: 81,
    minYield: 81,
    resultCropId: 'qilin_shadow_orchid',
    baseGenetics: { sweetness: 91, yield: 91, resistance: 83 },
    discoveryText: '瑶光瓜与紫辉兰虎啸山林，鹤舞九天。'
  },
  {
    id: 'crane_shadow_gourd',
    name: '鹤影葫',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'scarlet_shine_gourd',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'crane_shadow_gourd',
    baseGenetics: { sweetness: 91, yield: 91, resistance: 84 },
    discoveryText: '瑶光瓜与丹辉葫麟光闪耀，百兽朝拜。'
  },
  {
    id: 'tiger_shadow_herb',
    name: '虎影草',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'azure_shine_herb',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'tiger_shadow_herb',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 85 },
    discoveryText: '瑶光瓜与青辉草蛟龙出水，威震八方。'
  },
  {
    id: 'draco_roar_chestnut',
    name: '龙啸栗',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'moon_fortune_chestnut',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'draco_roar_chestnut',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 85 },
    discoveryText: '瑶光瓜与月瑞栗的神力融合，有神兽之威。'
  },
  {
    id: 'fenghuang_roar_apricot',
    name: '凤啸杏',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sun_fortune_apricot',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'fenghuang_roar_apricot',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 86 },
    discoveryText: '瑶光瓜与日瑞杏龙吟凤鸣，瑞兽降世。'
  },
  {
    id: 'qilin_roar_pear',
    name: '麟啸梨',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'sky_fortune_pear',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'qilin_roar_pear',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 87 },
    discoveryText: '瑶光瓜与天瑞梨虎啸山林，鹤舞九天。'
  },
  {
    id: 'crane_roar_berry',
    name: '鹤啸莓',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'gem_fortune_berry',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'crane_roar_berry',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 87 },
    discoveryText: '瑶光瓜与玉瑞莓麟光闪耀，百兽朝拜。'
  },
  {
    id: 'tiger_roar_peach_t',
    name: '虎啸桃',
    parentCropA: 'spirit_wonder_melon',
    parentCropB: 'prism_fortune_peach_t',
    minSweetness: 85,
    minYield: 85,
    resultCropId: 'tiger_roar_peach_t',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 88 },
    discoveryText: '瑶光瓜与琉瑞桃蛟龙出水，威震八方。'
  },
  // === 八代杂交作物 ===,
  {
    id: 'supreme_origin_melon',
    name: '太初瓜',
    parentCropA: 'draco_song_melon',
    parentCropB: 'precious_light5_melon',
    minSweetness: 78,
    minYield: 78,
    resultCropId: 'supreme_origin_melon',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 78 },
    discoveryText: '灵妙瓜与瑶光瓜天地之气凝聚，元气充沛。'
  },
  {
    id: 'firmament_origin_bean',
    name: '乾初豆',
    parentCropA: 'draco_song_melon',
    parentCropB: 'rare_light5_bean',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'firmament_origin_bean',
    baseGenetics: { sweetness: 88, yield: 88, resistance: 79 },
    discoveryText: '灵妙瓜与琼光豆乾坤交泰，阴阳和合。'
  },
  {
    id: 'terra_origin_rice',
    name: '坤初稻',
    parentCropA: 'draco_song_melon',
    parentCropB: 'magnif_light5_rice',
    minSweetness: 79,
    minYield: 79,
    resultCropId: 'terra_origin_rice',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 79 },
    discoveryText: '灵妙瓜与瑰光稻太初之力觉醒，混元归一。'
  },
  {
    id: 'primal_origin_tuber',
    name: '元初薯',
    parentCropA: 'draco_song_melon',
    parentCropB: 'radiant_light5_tuber',
    minSweetness: 80,
    minYield: 80,
    resultCropId: 'primal_origin_tuber',
    baseGenetics: { sweetness: 89, yield: 89, resistance: 80 },
    discoveryText: '灵妙瓜与曦光薯天极之光降临，万物归元。'
  },
  {
    id: 'chaos_origin_green',
    name: '混初菜',
    parentCropA: 'draco_song_melon',
    parentCropB: 'lustrous_light5_green',
    minSweetness: 80,
    minYield: 80,
    resultCropId: 'chaos_origin_green',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 80 },
    discoveryText: '灵妙瓜与璃光菜元气混沌初开，太一显化。'
  },
  {
    id: 'supreme_vital8_fruit',
    name: '太灵果',
    parentCropA: 'draco_song_melon',
    parentCropB: 'precious_hua5_fruit',
    minSweetness: 81,
    minYield: 81,
    resultCropId: 'supreme_vital8_fruit',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 81 },
    discoveryText: '灵妙瓜与瑶华果天地之气凝聚，元气充沛。'
  },
  {
    id: 'firmament_vital8_bloom',
    name: '乾灵花',
    parentCropA: 'draco_song_melon',
    parentCropB: 'rare_hua5_bloom',
    minSweetness: 81,
    minYield: 81,
    resultCropId: 'firmament_vital8_bloom',
    baseGenetics: { sweetness: 90, yield: 90, resistance: 82 },
    discoveryText: '灵妙瓜与琼华花乾坤交泰，阴阳和合。'
  },
  {
    id: 'terra_vital8_tea',
    name: '坤灵茶',
    parentCropA: 'draco_song_melon',
    parentCropB: 'magnif_hua5_tea',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'terra_vital8_tea',
    baseGenetics: { sweetness: 91, yield: 91, resistance: 82 },
    discoveryText: '灵妙瓜与瑰华茶太初之力觉醒，混元归一。'
  },
  {
    id: 'primal_vital8_shoot',
    name: '元灵笋',
    parentCropA: 'draco_song_melon',
    parentCropB: 'radiant_hua5_shoot',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'primal_vital8_shoot',
    baseGenetics: { sweetness: 91, yield: 91, resistance: 83 },
    discoveryText: '灵妙瓜与曦华笋天极之光降临，万物归元。'
  },
  {
    id: 'chaos_vital8_lotus',
    name: '混灵莲',
    parentCropA: 'draco_song_melon',
    parentCropB: 'lustrous_hua5_lotus',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'chaos_vital8_lotus',
    baseGenetics: { sweetness: 91, yield: 91, resistance: 83 },
    discoveryText: '灵妙瓜与璃华莲元气混沌初开，太一显化。'
  },
  {
    id: 'supreme_glory8_wheat',
    name: '太华麦',
    parentCropA: 'draco_song_melon',
    parentCropB: 'precious_dewdrop_wheat',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'supreme_glory8_wheat',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 84 },
    discoveryText: '灵妙瓜与瑶露麦天地之气凝聚，元气充沛。'
  },
  {
    id: 'firmament_glory8_sesame',
    name: '乾华芝',
    parentCropA: 'draco_song_melon',
    parentCropB: 'rare_dewdrop_sesame',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'firmament_glory8_sesame',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 84 },
    discoveryText: '灵妙瓜与琼露芝乾坤交泰，阴阳和合。'
  },
  {
    id: 'terra_glory8_pepper',
    name: '坤华椒',
    parentCropA: 'draco_song_melon',
    parentCropB: 'magnif_dewdrop_pepper',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'terra_glory8_pepper',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 85 },
    discoveryText: '灵妙瓜与瑰露椒太初之力觉醒，混元归一。'
  },
  {
    id: 'primal_glory8_root',
    name: '元华参',
    parentCropA: 'draco_song_melon',
    parentCropB: 'radiant_dewdrop_root',
    minSweetness: 85,
    minYield: 85,
    resultCropId: 'primal_glory8_root',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 86 },
    discoveryText: '灵妙瓜与曦露参天极之光降临，万物归元。'
  },
  {
    id: 'chaos_glory8_sprout',
    name: '混华芽',
    parentCropA: 'draco_song_melon',
    parentCropB: 'lustrous_dewdrop_sprout',
    minSweetness: 85,
    minYield: 85,
    resultCropId: 'chaos_glory8_sprout',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 86 },
    discoveryText: '灵妙瓜与璃露芽元气混沌初开，太一显化。'
  },
  {
    id: 'supreme_zenith_vine',
    name: '太极藤',
    parentCropA: 'draco_song_melon',
    parentCropB: 'precious_soul_vine',
    minSweetness: 86,
    minYield: 86,
    resultCropId: 'supreme_zenith_vine',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 87 },
    discoveryText: '灵妙瓜与瑶灵藤天地之气凝聚，元气充沛。'
  },
  {
    id: 'firmament_zenith_bud',
    name: '乾极蕾',
    parentCropA: 'draco_song_melon',
    parentCropB: 'rare_soul_bud',
    minSweetness: 86,
    minYield: 86,
    resultCropId: 'firmament_zenith_bud',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 87 },
    discoveryText: '灵妙瓜与琼灵蕾乾坤交泰，阴阳和合。'
  },
  {
    id: 'terra_zenith_orchid',
    name: '坤极兰',
    parentCropA: 'draco_song_melon',
    parentCropB: 'magnif_soul_orchid',
    minSweetness: 87,
    minYield: 87,
    resultCropId: 'terra_zenith_orchid',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 88 },
    discoveryText: '灵妙瓜与瑰灵兰太初之力觉醒，混元归一。'
  },
  {
    id: 'primal_zenith_gourd',
    name: '元极葫',
    parentCropA: 'draco_song_melon',
    parentCropB: 'radiant_soul_gourd',
    minSweetness: 87,
    minYield: 87,
    resultCropId: 'primal_zenith_gourd',
    baseGenetics: { sweetness: 95, yield: 95, resistance: 89 },
    discoveryText: '灵妙瓜与曦灵葫天极之光降临，万物归元。'
  },
  {
    id: 'chaos_zenith_herb',
    name: '混极草',
    parentCropA: 'draco_song_melon',
    parentCropB: 'lustrous_soul_herb',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'chaos_zenith_herb',
    baseGenetics: { sweetness: 95, yield: 95, resistance: 89 },
    discoveryText: '灵妙瓜与璃灵草元气混沌初开，太一显化。'
  },
  {
    id: 'supreme_core_chestnut',
    name: '太元栗',
    parentCropA: 'draco_song_melon',
    parentCropB: 'precious_silk5_chestnut',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'supreme_core_chestnut',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 90 },
    discoveryText: '灵妙瓜与瑶锦栗天地之气凝聚，元气充沛。'
  },
  {
    id: 'firmament_core_apricot',
    name: '乾元杏',
    parentCropA: 'draco_song_melon',
    parentCropB: 'rare_silk5_apricot',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'firmament_core_apricot',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 90 },
    discoveryText: '灵妙瓜与琼锦杏乾坤交泰，阴阳和合。'
  },
  {
    id: 'terra_core_pear',
    name: '坤元梨',
    parentCropA: 'draco_song_melon',
    parentCropB: 'magnif_silk5_pear',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'terra_core_pear',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 91 },
    discoveryText: '灵妙瓜与瑰锦梨太初之力觉醒，混元归一。'
  },
  {
    id: 'primal_core_berry',
    name: '元元莓',
    parentCropA: 'draco_song_melon',
    parentCropB: 'radiant_silk5_berry',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'primal_core_berry',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 91 },
    discoveryText: '灵妙瓜与曦锦莓天极之光降临，万物归元。'
  },
  {
    id: 'chaos_core_peach_t',
    name: '混元桃',
    parentCropA: 'draco_song_melon',
    parentCropB: 'lustrous_silk5_peach_t',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'chaos_core_peach_t',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 92 },
    discoveryText: '灵妙瓜与璃锦桃元气混沌初开，太一显化。'
  },
  // === 九代杂交作物 ===,
  {
    id: 'vast_meng_melon',
    name: '鸿蒙瓜',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'spirit_wonder_melon',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'vast_meng_melon',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 85 },
    discoveryText: '龙吟瓜与灵妙瓜鸿蒙之力交汇，通灵化境。'
  },
  {
    id: 'ancient_meng_bean',
    name: '古蒙豆',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'fairy_wonder_bean',
    minSweetness: 82,
    minYield: 82,
    resultCropId: 'ancient_meng_bean',
    baseGenetics: { sweetness: 92, yield: 92, resistance: 85 },
    discoveryText: '龙吟瓜与仙妙豆太古洪荒之气，开天辟地。'
  },
  {
    id: 'infinite_meng_rice',
    name: '无蒙稻',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'holy_wonder_rice',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'infinite_meng_rice',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 86 },
    discoveryText: '龙吟瓜与圣妙稻无极之道显现，玄之又玄。'
  },
  {
    id: 'primeval_meng_tuber',
    name: '洪蒙薯',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'divine_wonder_tuber',
    minSweetness: 83,
    minYield: 83,
    resultCropId: 'primeval_meng_tuber',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 86 },
    discoveryText: '龙吟瓜与神妙薯洪荒大力，超越万物。'
  },
  {
    id: 'genesis_meng_green',
    name: '开蒙菜',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'trueth_wonder_green',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'genesis_meng_green',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 87 },
    discoveryText: '龙吟瓜与真妙菜鸿蒙初判，天地为之变色。'
  },
  {
    id: 'vast_apex9_fruit',
    name: '鸿极果',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'spirit_grace6_fruit',
    minSweetness: 84,
    minYield: 84,
    resultCropId: 'vast_apex9_fruit',
    baseGenetics: { sweetness: 93, yield: 93, resistance: 87 },
    discoveryText: '龙吟瓜与灵华果鸿蒙之力交汇，通灵化境。'
  },
  {
    id: 'ancient_apex9_bloom',
    name: '古极花',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'fairy_grace6_bloom',
    minSweetness: 85,
    minYield: 85,
    resultCropId: 'ancient_apex9_bloom',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 88 },
    discoveryText: '龙吟瓜与仙华花太古洪荒之气，开天辟地。'
  },
  {
    id: 'infinite_apex9_tea',
    name: '无极茶',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'holy_grace6_tea',
    minSweetness: 85,
    minYield: 85,
    resultCropId: 'infinite_apex9_tea',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 88 },
    discoveryText: '龙吟瓜与圣华茶无极之道显现，玄之又玄。'
  },
  {
    id: 'primeval_apex9_shoot',
    name: '洪极笋',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'divine_grace6_shoot',
    minSweetness: 86,
    minYield: 86,
    resultCropId: 'primeval_apex9_shoot',
    baseGenetics: { sweetness: 94, yield: 94, resistance: 89 },
    discoveryText: '龙吟瓜与神华笋洪荒大力，超越万物。'
  },
  {
    id: 'genesis_apex9_lotus',
    name: '开极莲',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'trueth_grace6_lotus',
    minSweetness: 86,
    minYield: 86,
    resultCropId: 'genesis_apex9_lotus',
    baseGenetics: { sweetness: 95, yield: 95, resistance: 89 },
    discoveryText: '龙吟瓜与真华莲鸿蒙初判，天地为之变色。'
  },
  {
    id: 'vast_wilder_wheat',
    name: '鸿荒麦',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'spirit_phantom_wheat',
    minSweetness: 87,
    minYield: 87,
    resultCropId: 'vast_wilder_wheat',
    baseGenetics: { sweetness: 95, yield: 95, resistance: 90 },
    discoveryText: '龙吟瓜与灵幻麦鸿蒙之力交汇，通灵化境。'
  },
  {
    id: 'ancient_wilder_sesame',
    name: '古荒芝',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'fairy_phantom_sesame',
    minSweetness: 87,
    minYield: 87,
    resultCropId: 'ancient_wilder_sesame',
    baseGenetics: { sweetness: 95, yield: 95, resistance: 90 },
    discoveryText: '龙吟瓜与仙幻芝太古洪荒之气，开天辟地。'
  },
  {
    id: 'infinite_wilder_pepper',
    name: '无荒椒',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'holy_phantom_pepper',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'infinite_wilder_pepper',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 91 },
    discoveryText: '龙吟瓜与圣幻椒无极之道显现，玄之又玄。'
  },
  {
    id: 'primeval_wilder_root',
    name: '洪荒参',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'divine_phantom_root',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'primeval_wilder_root',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 91 },
    discoveryText: '龙吟瓜与神幻参洪荒大力，超越万物。'
  },
  {
    id: 'genesis_wilder_sprout',
    name: '开荒芽',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'trueth_phantom_sprout',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'genesis_wilder_sprout',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 91 },
    discoveryText: '龙吟瓜与真幻芽鸿蒙初判，天地为之变色。'
  },
  {
    id: 'vast_empyrean_vine',
    name: '鸿天藤',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'spirit_dream_vine',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'vast_empyrean_vine',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 92 },
    discoveryText: '龙吟瓜与灵梦藤鸿蒙之力交汇，通灵化境。'
  },
  {
    id: 'ancient_empyrean_bud',
    name: '古天蕾',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'fairy_dream_bud',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'ancient_empyrean_bud',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 92 },
    discoveryText: '龙吟瓜与仙梦蕾太古洪荒之气，开天辟地。'
  },
  {
    id: 'infinite_empyrean_orchid',
    name: '无天兰',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'holy_dream_orchid',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'infinite_empyrean_orchid',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 93 },
    discoveryText: '龙吟瓜与圣梦兰无极之道显现，玄之又玄。'
  },
  {
    id: 'primeval_empyrean_gourd',
    name: '洪天葫',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'divine_dream_gourd',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'primeval_empyrean_gourd',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 93 },
    discoveryText: '龙吟瓜与神梦葫洪荒大力，超越万物。'
  },
  {
    id: 'genesis_empyrean_herb',
    name: '开天草',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'trueth_dream_herb',
    minSweetness: 91,
    minYield: 91,
    resultCropId: 'genesis_empyrean_herb',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 94 },
    discoveryText: '龙吟瓜与真梦草鸿蒙初判，天地为之变色。'
  },
  {
    id: 'vast_spirit9_chestnut',
    name: '鸿灵栗',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'spirit_zen_chestnut',
    minSweetness: 91,
    minYield: 91,
    resultCropId: 'vast_spirit9_chestnut',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 94 },
    discoveryText: '龙吟瓜与灵禅栗鸿蒙之力交汇，通灵化境。'
  },
  {
    id: 'ancient_spirit9_apricot',
    name: '古灵杏',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'fairy_zen_apricot',
    minSweetness: 92,
    minYield: 92,
    resultCropId: 'ancient_spirit9_apricot',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 95 },
    discoveryText: '龙吟瓜与仙禅杏太古洪荒之气，开天辟地。'
  },
  {
    id: 'infinite_spirit9_pear',
    name: '无灵梨',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'holy_zen_pear',
    minSweetness: 92,
    minYield: 92,
    resultCropId: 'infinite_spirit9_pear',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 95 },
    discoveryText: '龙吟瓜与圣禅梨无极之道显现，玄之又玄。'
  },
  {
    id: 'primeval_spirit9_berry',
    name: '洪灵莓',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'divine_zen_berry',
    minSweetness: 93,
    minYield: 93,
    resultCropId: 'primeval_spirit9_berry',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 96 },
    discoveryText: '龙吟瓜与神禅莓洪荒大力，超越万物。'
  },
  {
    id: 'genesis_spirit9_peach_t',
    name: '开灵桃',
    parentCropA: 'supreme_origin_melon',
    parentCropB: 'trueth_zen_peach_t',
    minSweetness: 93,
    minYield: 93,
    resultCropId: 'genesis_spirit9_peach_t',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 96 },
    discoveryText: '龙吟瓜与真禅桃鸿蒙初判，天地为之变色。'
  },
  // === 十代杂交作物 ===,
  {
    id: 'creation_change_melon',
    name: '造化瓜',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'draco_song_melon',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'creation_change_melon',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 90 },
    discoveryText: '太初瓜与龙吟瓜造化之力成就，永恒不朽之品。'
  },
  {
    id: 'eternal_change_bean',
    name: '永化豆',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'fenghuang_song_bean',
    minSweetness: 88,
    minYield: 88,
    resultCropId: 'eternal_change_bean',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 90 },
    discoveryText: '太初瓜与凤吟豆天命所归，万象更新。'
  },
  {
    id: 'undying_change_rice',
    name: '不化稻',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'qilin_song_rice',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'undying_change_rice',
    baseGenetics: { sweetness: 96, yield: 96, resistance: 91 },
    discoveryText: '太初瓜与麟吟稻不朽轮回，涅槃重生。'
  },
  {
    id: 'heavenly_change_tuber',
    name: '天化薯',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'crane_song_tuber',
    minSweetness: 89,
    minYield: 89,
    resultCropId: 'heavenly_change_tuber',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 91 },
    discoveryText: '太初瓜与鹤吟薯造化弄人，终成至宝。'
  },
  {
    id: 'myriad_change_green',
    name: '万化菜',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'tiger_song_green',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'myriad_change_green',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 92 },
    discoveryText: '太初瓜与虎吟菜永恒不灭之光，照耀天地。'
  },
  {
    id: 'creation_lasting_fruit',
    name: '造恒果',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'draco_dance_fruit',
    minSweetness: 90,
    minYield: 90,
    resultCropId: 'creation_lasting_fruit',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 92 },
    discoveryText: '太初瓜与龙舞果造化之力成就，永恒不朽之品。'
  },
  {
    id: 'eternal_lasting_bloom',
    name: '永恒花',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'fenghuang_dance_bloom',
    minSweetness: 91,
    minYield: 91,
    resultCropId: 'eternal_lasting_bloom',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 93 },
    discoveryText: '太初瓜与凤舞花天命所归，万象更新。'
  },
  {
    id: 'undying_lasting_tea',
    name: '不恒茶',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'qilin_dance_tea',
    minSweetness: 91,
    minYield: 91,
    resultCropId: 'undying_lasting_tea',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 93 },
    discoveryText: '太初瓜与麟舞茶不朽轮回，涅槃重生。'
  },
  {
    id: 'heavenly_lasting_shoot',
    name: '天恒笋',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'crane_dance_shoot',
    minSweetness: 91,
    minYield: 91,
    resultCropId: 'heavenly_lasting_shoot',
    baseGenetics: { sweetness: 97, yield: 97, resistance: 93 },
    discoveryText: '太初瓜与鹤舞笋造化弄人，终成至宝。'
  },
  {
    id: 'myriad_lasting_lotus',
    name: '万恒莲',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'tiger_dance_lotus',
    minSweetness: 92,
    minYield: 92,
    resultCropId: 'myriad_lasting_lotus',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 94 },
    discoveryText: '太初瓜与虎舞莲永恒不灭之光，照耀天地。'
  },
  {
    id: 'creation_timeless_wheat',
    name: '造朽麦',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'draco_gleam7_wheat',
    minSweetness: 92,
    minYield: 92,
    resultCropId: 'creation_timeless_wheat',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 94 },
    discoveryText: '太初瓜与龙辉麦造化之力成就，永恒不朽之品。'
  },
  {
    id: 'eternal_timeless_sesame',
    name: '永朽芝',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'fenghuang_gleam7_sesame',
    minSweetness: 93,
    minYield: 93,
    resultCropId: 'eternal_timeless_sesame',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 95 },
    discoveryText: '太初瓜与凤辉芝天命所归，万象更新。'
  },
  {
    id: 'undying_timeless_pepper',
    name: '不朽椒',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'qilin_gleam7_pepper',
    minSweetness: 93,
    minYield: 93,
    resultCropId: 'undying_timeless_pepper',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 95 },
    discoveryText: '太初瓜与麟辉椒不朽轮回，涅槃重生。'
  },
  {
    id: 'heavenly_timeless_root',
    name: '天朽参',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'crane_gleam7_root',
    minSweetness: 93,
    minYield: 93,
    resultCropId: 'heavenly_timeless_root',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 95 },
    discoveryText: '太初瓜与鹤辉参造化弄人，终成至宝。'
  },
  {
    id: 'myriad_timeless_sprout',
    name: '万朽芽',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'tiger_gleam7_sprout',
    minSweetness: 94,
    minYield: 94,
    resultCropId: 'myriad_timeless_sprout',
    baseGenetics: { sweetness: 98, yield: 98, resistance: 96 },
    discoveryText: '太初瓜与虎辉芽永恒不灭之光，照耀天地。'
  },
  {
    id: 'creation_destiny_vine',
    name: '造命藤',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'draco_shadow_vine',
    minSweetness: 94,
    minYield: 94,
    resultCropId: 'creation_destiny_vine',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 96 },
    discoveryText: '太初瓜与龙影藤造化之力成就，永恒不朽之品。'
  },
  {
    id: 'eternal_destiny_bud',
    name: '永命蕾',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'fenghuang_shadow_bud',
    minSweetness: 95,
    minYield: 95,
    resultCropId: 'eternal_destiny_bud',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 97 },
    discoveryText: '太初瓜与凤影蕾天命所归，万象更新。'
  },
  {
    id: 'undying_destiny_orchid',
    name: '不命兰',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'qilin_shadow_orchid',
    minSweetness: 95,
    minYield: 95,
    resultCropId: 'undying_destiny_orchid',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 97 },
    discoveryText: '太初瓜与麟影兰不朽轮回，涅槃重生。'
  },
  {
    id: 'heavenly_destiny_gourd',
    name: '天命葫',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'crane_shadow_gourd',
    minSweetness: 96,
    minYield: 96,
    resultCropId: 'heavenly_destiny_gourd',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 98 },
    discoveryText: '太初瓜与鹤影葫造化弄人，终成至宝。'
  },
  {
    id: 'myriad_destiny_herb',
    name: '万命草',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'tiger_shadow_herb',
    minSweetness: 96,
    minYield: 96,
    resultCropId: 'myriad_destiny_herb',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 98 },
    discoveryText: '太初瓜与虎影草永恒不灭之光，照耀天地。'
  },
  {
    id: 'creation_form_chestnut',
    name: '造象栗',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'draco_roar_chestnut',
    minSweetness: 96,
    minYield: 96,
    resultCropId: 'creation_form_chestnut',
    baseGenetics: { sweetness: 99, yield: 99, resistance: 98 },
    discoveryText: '太初瓜与龙啸栗造化之力成就，永恒不朽之品。'
  },
  {
    id: 'eternal_form_apricot',
    name: '永象杏',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'fenghuang_roar_apricot',
    minSweetness: 97,
    minYield: 97,
    resultCropId: 'eternal_form_apricot',
    baseGenetics: { sweetness: 100, yield: 100, resistance: 99 },
    discoveryText: '太初瓜与凤啸杏天命所归，万象更新。'
  },
  {
    id: 'undying_form_pear',
    name: '不象梨',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'qilin_roar_pear',
    minSweetness: 97,
    minYield: 97,
    resultCropId: 'undying_form_pear',
    baseGenetics: { sweetness: 100, yield: 100, resistance: 99 },
    discoveryText: '太初瓜与麟啸梨不朽轮回，涅槃重生。'
  },
  {
    id: 'heavenly_form_berry',
    name: '天象莓',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'crane_roar_berry',
    minSweetness: 98,
    minYield: 98,
    resultCropId: 'heavenly_form_berry',
    baseGenetics: { sweetness: 100, yield: 100, resistance: 100 },
    discoveryText: '太初瓜与鹤啸莓造化弄人，终成至宝。'
  },
  {
    id: 'myriad_form_peach_t',
    name: '万象桃',
    parentCropA: 'vast_meng_melon',
    parentCropB: 'tiger_roar_peach_t',
    minSweetness: 98,
    minYield: 98,
    resultCropId: 'myriad_form_peach_t',
    baseGenetics: { sweetness: 100, yield: 100, resistance: 100 },
    discoveryText: '太初瓜与虎啸桃永恒不灭之光，照耀天地。'
  }
]

/** 杂交品种阶层 (tier) 划分：基于 HYBRID_DEFS 数组顺序 */
const TIER_COUNTS = [100, 50, 50, 50, 25, 25, 25, 25, 25, 25] // T1..T10
const _tierMap = new Map<string, number>()
let _offset = 0
for (let t = 0; t < TIER_COUNTS.length; t++) {
  for (let i = 0; i < TIER_COUNTS[t]!; i++) {
    const def = HYBRID_DEFS[_offset + i]
    if (def) _tierMap.set(def.id, t + 1)
  }
  _offset += TIER_COUNTS[t]!
}

/** 获取杂交品种所属阶层 (1-10) */
export const getHybridTier = (hybridId: string): number => _tierMap.get(hybridId) ?? 1

/** 查找可能的杂交配方 */
export const findPossibleHybrid = (cropIdA: string, cropIdB: string): HybridDef | null => {
  return (
    HYBRID_DEFS.find(
      h => (h.parentCropA === cropIdA && h.parentCropB === cropIdB) || (h.parentCropA === cropIdB && h.parentCropB === cropIdA)
    ) ?? null
  )
}

/** 根据杂交种ID查找配方 */
export const findPossibleHybridById = (hybridId: string): HybridDef | null => {
  return HYBRID_DEFS.find(h => h.id === hybridId) ?? null
}

/** 种子制造机产出育种种子的概率 */
export const getSeedMakerGeneticChance = (farmingLevel: number): number => {
  return 0.3 + farmingLevel * 0.03
}
