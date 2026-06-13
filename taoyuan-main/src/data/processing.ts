import type {
  AlchemyHeat,
  AlchemyNature,
  AlchemyPillRole,
  AlchemyResultKind,
  AlchemyResultRule,
  ProcessingMachineDef,
  ProcessingRecipeDef,
  SprinklerDef,
  FertilizerDef,
  BaitDef,
  TackleDef,
  BombDef
} from '@/types'
import { CROPS } from './crops'
import { FISH } from './fish'
import { FRUIT_TREE_DEFS } from './fruitTrees'
import { getCropUseProfile, type CropUseProfile } from './cropUseProfiles'

export const ALCHEMY_MAIN_DAILY_LIMIT = 1
export const ALCHEMY_SUPPORT_DAILY_LIMIT = 2

export const ALCHEMY_PILL_ROLE_LABELS: Record<AlchemyPillRole, string> = {
  main: '主丹',
  support: '辅丹'
}

export const ALCHEMY_NATURE_LABELS: Record<AlchemyNature, string> = {
  clear: '清润',
  warm: '温补',
  spicy: '辛烈',
  fragrant: '芳香',
  root: '根茎',
  spirit_fruit: '灵果'
}

export const ALCHEMY_HEAT_LABELS: Record<AlchemyHeat, string> = {
  gentle: '文火',
  steady: '中火',
  strong: '武火'
}

export const ALCHEMY_RESULT_KIND_LABELS: Record<AlchemyResultKind, string> = {
  success: '成丹',
  partial: '偏丹',
  failed: '废丹',
  rare: '奇丹'
}

const buildAlchemyResultRules = (successOutputItemId: string): AlchemyResultRule[] => [
  {
    kind: 'success',
    outputItemId: successOutputItemId,
    outputQuantity: 1,
    weight: 80,
    label: ALCHEMY_RESULT_KIND_LABELS.success,
    description: '火候与药性稳定，收取完整成丹。'
  },
  {
    kind: 'partial',
    outputItemId: 'partial_elixir_slurry',
    outputQuantity: 1,
    weight: 14,
    label: ALCHEMY_RESULT_KIND_LABELS.partial,
    description: '药性略偏，凝成可再研磨利用的偏丹膏。'
  },
  {
    kind: 'failed',
    outputItemId: 'failed_elixir_ash',
    outputQuantity: 1,
    weight: 4,
    label: ALCHEMY_RESULT_KIND_LABELS.failed,
    description: '火候失稳，丹气散尽，只余废丹灰。'
  },
  {
    kind: 'rare',
    outputItemId: 'rare_elixir_crystal',
    outputQuantity: 1,
    weight: 2,
    label: ALCHEMY_RESULT_KIND_LABELS.rare,
    description: '药性意外凝华，得一枚稀少奇丹晶。'
  }
]

/** 加工机器定义 */
export const PROCESSING_MACHINES: ProcessingMachineDef[] = [
  {
    id: 'wine_workshop',
    name: '酒坊',
    description: '将水果/作物酿成美酒，售价翻三倍。',
    craftCost: [
      { itemId: 'wood', quantity: 30 },
      { itemId: 'copper_ore', quantity: 5 },
      { itemId: 'iron_ore', quantity: 3 }
    ],
    craftMoney: 300
  },
  {
    id: 'sauce_jar',
    name: '酱缸',
    description: '将作物腌制成酱菜蜜饯，稳定增值。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'copper_ore', quantity: 8 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 200
  },
  {
    id: 'sugar_jar',
    name: '糖渍罐',
    description: '用蜂蜜慢渍水果，产出蜜饯、灵果点心胚和节会甜品材料。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'copper_ore', quantity: 6 },
      { itemId: 'honey', quantity: 2 }
    ],
    craftMoney: 240
  },
  {
    id: 'bee_house',
    name: '蜂箱',
    description: '每4天自动产出蜂蜜。',
    craftCost: [
      { itemId: 'wood', quantity: 40 },
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'bamboo', quantity: 10 }
    ],
    craftMoney: 250
  },
  {
    id: 'oil_press',
    name: '油坊',
    description: '将芝麻或种子榨成食用油。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    craftMoney: 350
  },
  {
    id: 'mayo_maker',
    name: '蛋黄酱机',
    description: '将鸡蛋或鸭蛋制成蛋黄酱。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'copper_ore', quantity: 5 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 200
  },
  {
    id: 'seed_maker',
    name: '种子制造机',
    description: '将成熟作物转化为种子。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'gold_ore', quantity: 2 }
    ],
    craftMoney: 500
  },
  {
    id: 'crystal_duplicator',
    name: '结晶复制机',
    description: '投入宝石后缓慢复制，获得双倍产出。',
    craftCost: [
      { itemId: 'gold_ore', quantity: 5 },
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'quartz', quantity: 2 }
    ],
    craftMoney: 500
  },
  {
    id: 'smoker',
    name: '烟熏机',
    description: '将鱼烟熏处理，售价翻倍。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'firewood', quantity: 5 }
    ],
    craftMoney: 300
  },
  {
    id: 'drying_rack',
    name: '晒架',
    description: '用日晒风干保存作物，产出柿饼、干菜和药材干。',
    craftCost: [
      { itemId: 'wood', quantity: 12 },
      { itemId: 'bamboo', quantity: 6 },
      { itemId: 'firewood', quantity: 4 }
    ],
    craftMoney: 120
  },
  {
    id: 'dehydrator',
    name: '脱水机',
    description: '将蘑菇或水果脱水保存，增值出售。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'firewood', quantity: 10 }
    ],
    craftMoney: 200
  },
  {
    id: 'recycler',
    name: '回收机',
    description: '将垃圾回收转化为有用材料。',
    craftCost: [
      { itemId: 'wood', quantity: 25 },
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'copper_ore', quantity: 5 }
    ],
    craftMoney: 150
  },
  {
    id: 'cheese_press',
    name: '乳酪机',
    description: '将牛奶制成美味的奶酪。',
    craftCost: [
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'wood', quantity: 15 },
      { itemId: 'copper_ore', quantity: 3 }
    ],
    craftMoney: 400
  },
  {
    id: 'loom',
    name: '织布机',
    description: '将毛线和丝织成布匹。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'bamboo', quantity: 10 }
    ],
    craftMoney: 300
  },
  {
    id: 'furnace',
    name: '熔炉',
    description: '将矿石冶炼成金属锭。完成后自动收取。',
    craftCost: [
      { itemId: 'copper_ore', quantity: 10 },
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'quartz', quantity: 2 }
    ],
    craftMoney: 500,
    autoCollect: true
  },
  {
    id: 'charcoal_kiln',
    name: '炭窑',
    description: '将木材烧制成木炭。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'copper_ore', quantity: 3 },
      { itemId: 'firewood', quantity: 10 }
    ],
    craftMoney: 150
  },
  {
    id: 'mill',
    name: '石磨',
    description: '将谷物磨成面粉。',
    craftCost: [
      { itemId: 'wood', quantity: 25 },
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 350
  },
  {
    id: 'worm_bin',
    name: '蚯蚓箱',
    description: '每2天自动产出鱼饵。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'herb', quantity: 5 },
      { itemId: 'firewood', quantity: 5 }
    ],
    craftMoney: 200
  },
  {
    id: 'tea_maker',
    name: '制茶机',
    description: '将茶叶和花卉泡制成饮品。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'bamboo', quantity: 5 }
    ],
    craftMoney: 250
  },
  {
    id: 'tofu_press',
    name: '豆腐坊',
    description: '将豆类磨制成豆腐和酱料。',
    craftCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 300
  },
  {
    id: 'herb_grinder',
    name: '药碾',
    description: '将草药研磨成药膏和精华。',
    craftCost: [
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'quartz', quantity: 2 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    craftMoney: 400
  },
  {
    id: 'alchemy_furnace',
    name: '丹炉',
    description: '将药性作物、草药与加工稳定剂炼成短效丹药。',
    craftCost: [
      { itemId: 'stone', quantity: 40 },
      { itemId: 'copper_bar', quantity: 5 },
      { itemId: 'refined_quartz', quantity: 2 }
    ],
    craftMoney: 800
  },
  {
    id: 'incense_maker',
    name: '制香坊',
    description: '将树脂和花卉制成香料。',
    craftCost: [
      { itemId: 'wood', quantity: 15 },
      { itemId: 'bamboo', quantity: 10 },
      { itemId: 'firewood', quantity: 5 }
    ],
    craftMoney: 200
  },
  {
    id: 'spirit_forge',
    name: '仙灵炉',
    description: '炼制仙灵信物的神秘炉台，可制作求缘与结缘信物。',
    masteryRewardId: 'advanced_workbench',
    craftCost: [
      { itemId: 'dragon_jade', quantity: 3 },
      { itemId: 'moonstone', quantity: 5 },
      { itemId: 'iridium_ore', quantity: 5 }
    ],
    craftMoney: 2000
  }
]

/** 加工配方 */
export const PROCESSING_RECIPES: ProcessingRecipeDef[] = [
  // 酒坊
  {
    id: 'wine_watermelon',
    machineType: 'wine_workshop',
    name: '西瓜酒',
    inputItemId: 'watermelon',
    inputQuantity: 1,
    outputItemId: 'watermelon_wine',
    outputQuantity: 1,
    processingDays: 3,
    description: '甘甜的西瓜酿成的佳酿。'
  },
  {
    id: 'wine_osmanthus',
    machineType: 'wine_workshop',
    name: '桂花酿',
    inputItemId: 'osmanthus',
    inputQuantity: 1,
    outputItemId: 'osmanthus_wine',
    outputQuantity: 1,
    processingDays: 3,
    description: '馥郁芬芳的桂花酒。'
  },
  {
    id: 'wine_rice',
    machineType: 'wine_workshop',
    name: '桃源米酒',
    inputItemId: 'rice',
    inputQuantity: 1,
    outputItemId: 'tavern_rice_wine',
    outputQuantity: 2,
    processingDays: 2,
    description: '用一份稻米酿出两壶清甜米酒，可用于酒饮订单交付。'
  },
  {
    id: 'vinegar_rice',
    machineType: 'wine_workshop',
    name: '米醋',
    inputItemId: 'rice',
    inputQuantity: 2,
    outputItemId: 'rice_vinegar',
    outputQuantity: 1,
    processingDays: 3,
    description: '家酿老陈醋。'
  },
  // 酱缸
  {
    id: 'pickle_cabbage',
    machineType: 'sauce_jar',
    name: '腌白菜',
    inputItemId: 'cabbage',
    inputQuantity: 2,
    outputItemId: 'pickled_cabbage',
    outputQuantity: 1,
    processingDays: 2,
    description: '开胃的腌白菜。'
  },
  {
    id: 'pickle_radish',
    machineType: 'sauce_jar',
    name: '萝卜干',
    inputItemId: 'radish',
    inputQuantity: 2,
    outputItemId: 'dried_radish',
    outputQuantity: 1,
    processingDays: 2,
    description: '香脆的萝卜干。'
  },
  {
    id: 'pickle_radish_slices',
    machineType: 'sauce_jar',
    name: '腌萝卜',
    inputItemId: 'radish',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'rice_vinegar', quantity: 1 }],
    outputItemId: 'pickled_radish',
    outputQuantity: 1,
    processingDays: 2,
    description: '将萝卜与米醋腌成脆爽腌萝卜，可继续进入护院汤、冬储订单和根茎丹材准备。'
  },
  {
    id: 'preserve_pumpkin',
    machineType: 'sauce_jar',
    name: '南瓜酱',
    inputItemId: 'pumpkin',
    inputQuantity: 1,
    outputItemId: 'pumpkin_preserve',
    outputQuantity: 1,
    processingDays: 2,
    description: '浓郁的南瓜酱。'
  },
  // 糖渍罐
  {
    id: 'sugar_candied_peach',
    machineType: 'sugar_jar',
    name: '蜜桃脯',
    inputItemId: 'peach',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'honey', quantity: 1 }],
    outputItemId: 'candied_peach',
    outputQuantity: 1,
    processingDays: 2,
    description: '将桃子与蜂蜜慢渍成蜜桃脯，可继续做灵果点心、伴手礼和节会甜品。'
  },
  // 蜂箱
  {
    id: 'honey',
    machineType: 'bee_house',
    name: '蜂蜜',
    inputItemId: null,
    inputQuantity: 0,
    outputItemId: 'honey',
    outputQuantity: 1,
    processingDays: 4,
    description: '金黄甘甜的蜂蜜。'
  },
  {
    id: 'honey_chrysanthemum',
    machineType: 'bee_house',
    name: '菊花蜜',
    inputItemId: 'chrysanthemum',
    inputQuantity: 1,
    outputItemId: 'chrysanthemum_honey',
    outputQuantity: 1,
    processingDays: 4,
    description: '带有菊花清香的蜂蜜。'
  },
  {
    id: 'honey_osmanthus',
    machineType: 'bee_house',
    name: '桂花蜜',
    inputItemId: 'osmanthus',
    inputQuantity: 1,
    outputItemId: 'osmanthus_honey',
    outputQuantity: 1,
    processingDays: 4,
    description: '馥郁芬芳的桂花蜂蜜。'
  },
  {
    id: 'honey_rapeseed',
    machineType: 'bee_house',
    name: '菜花蜜',
    inputItemId: 'rapeseed',
    inputQuantity: 1,
    outputItemId: 'rapeseed_honey',
    outputQuantity: 1,
    processingDays: 4,
    description: '清甜的油菜花蜂蜜。'
  },
  {
    id: 'honey_snow_lotus',
    machineType: 'bee_house',
    name: '雪莲蜜',
    inputItemId: 'snow_lotus',
    inputQuantity: 1,
    outputItemId: 'snow_lotus_honey',
    outputQuantity: 1,
    processingDays: 4,
    description: '珍贵的雪莲花蜂蜜。'
  },
  // 油坊
  {
    id: 'sesame_oil',
    machineType: 'oil_press',
    name: '芝麻油',
    inputItemId: 'sesame',
    inputQuantity: 3,
    outputItemId: 'sesame_oil',
    outputQuantity: 1,
    processingDays: 1,
    description: '醇香的小磨麻油。'
  },
  {
    id: 'rapeseed_oil',
    machineType: 'oil_press',
    name: '菜籽油',
    inputItemId: 'rapeseed',
    inputQuantity: 3,
    outputItemId: 'rapeseed_oil',
    outputQuantity: 1,
    processingDays: 1,
    description: '将油菜籽压榨成清亮菜籽油，可用于料理和集市摊位材料。'
  },
  {
    id: 'tea_oil',
    machineType: 'oil_press',
    name: '茶油',
    inputItemId: 'tea',
    inputQuantity: 2,
    outputItemId: 'tea_oil',
    outputQuantity: 1,
    processingDays: 1,
    description: '珍贵的山茶油。'
  },
  {
    id: 'truffle_oil',
    machineType: 'oil_press',
    name: '松露油',
    inputItemId: 'truffle',
    inputQuantity: 1,
    outputItemId: 'truffle_oil',
    outputQuantity: 1,
    processingDays: 1,
    description: '珍贵的松露油。'
  },
  // 新增：酒坊配方
  {
    id: 'wine_peach',
    machineType: 'wine_workshop',
    name: '桃花酒',
    inputItemId: 'peach',
    inputQuantity: 1,
    outputItemId: 'peach_wine',
    outputQuantity: 1,
    processingDays: 3,
    description: '清甜的桃花酒。'
  },
  {
    id: 'wine_jujube',
    machineType: 'wine_workshop',
    name: '红枣酒',
    inputItemId: 'jujube',
    inputQuantity: 1,
    outputItemId: 'jujube_wine',
    outputQuantity: 1,
    processingDays: 3,
    description: '醇厚滋补的红枣酒。'
  },
  {
    id: 'wine_corn',
    machineType: 'wine_workshop',
    name: '玉米酒',
    inputItemId: 'corn',
    inputQuantity: 2,
    outputItemId: 'corn_wine',
    outputQuantity: 1,
    processingDays: 3,
    description: '淡雅清香的玉米酒。'
  },
  // 新增：酱缸配方
  {
    id: 'pickle_chili',
    machineType: 'sauce_jar',
    name: '泡椒',
    inputItemId: 'chili',
    inputQuantity: 2,
    outputItemId: 'pickled_chili',
    outputQuantity: 1,
    processingDays: 2,
    description: '酸辣开胃的泡椒。'
  },
  {
    id: 'pickle_ginger',
    machineType: 'sauce_jar',
    name: '腌姜',
    inputItemId: 'ginger',
    inputQuantity: 2,
    outputItemId: 'pickled_ginger',
    outputQuantity: 1,
    processingDays: 2,
    description: '酸甜脆嫩的腌姜。'
  },
  // 蛋黄酱机
  {
    id: 'mayo_egg',
    machineType: 'mayo_maker',
    name: '蛋黄酱',
    inputItemId: 'egg',
    inputQuantity: 1,
    outputItemId: 'mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用鸡蛋制成的浓郁蛋黄酱。'
  },
  {
    id: 'mayo_duck_egg',
    machineType: 'mayo_maker',
    name: '鸭蛋黄酱',
    inputItemId: 'duck_egg',
    inputQuantity: 1,
    outputItemId: 'duck_mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用鸭蛋制成的高级蛋黄酱。'
  },
  {
    id: 'mayo_goose_egg',
    machineType: 'mayo_maker',
    name: '鹅蛋黄酱',
    inputItemId: 'goose_egg',
    inputQuantity: 1,
    outputItemId: 'goose_mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用鹅蛋制成的浓稠蛋黄酱。'
  },
  {
    id: 'mayo_silkie_egg',
    machineType: 'mayo_maker',
    name: '乌鸡蛋黄酱',
    inputItemId: 'silkie_egg',
    inputQuantity: 1,
    outputItemId: 'silkie_mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用乌鸡蛋制成的滋补蛋黄酱。'
  },
  {
    id: 'mayo_ostrich_egg',
    machineType: 'mayo_maker',
    name: '鸵鸟蛋黄酱',
    inputItemId: 'ostrich_egg',
    inputQuantity: 1,
    outputItemId: 'ostrich_mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用鸵鸟蛋制成的大份蛋黄酱。'
  },
  {
    id: 'mayo_quail_egg',
    machineType: 'mayo_maker',
    name: '鹌鹑蛋黄酱',
    inputItemId: 'quail_egg',
    inputQuantity: 3,
    outputItemId: 'quail_mayonnaise',
    outputQuantity: 1,
    processingDays: 2,
    description: '用鹌鹑蛋制成的精致蛋黄酱。'
  },
  // 种子制造机
  {
    id: 'seed_from_cabbage',
    machineType: 'seed_maker',
    name: '青菜种子',
    inputItemId: 'cabbage',
    inputQuantity: 1,
    outputItemId: 'seed_cabbage',
    outputQuantity: 2,
    processingDays: 1,
    description: '从青菜中提取种子。'
  },
  {
    id: 'seed_from_radish',
    machineType: 'seed_maker',
    name: '萝卜种子',
    inputItemId: 'radish',
    inputQuantity: 1,
    outputItemId: 'seed_radish',
    outputQuantity: 2,
    processingDays: 1,
    description: '从萝卜中提取种子。'
  },
  {
    id: 'seed_from_potato',
    machineType: 'seed_maker',
    name: '土豆种子',
    inputItemId: 'potato',
    inputQuantity: 1,
    outputItemId: 'seed_potato',
    outputQuantity: 2,
    processingDays: 1,
    description: '从土豆中提取种子。'
  },
  {
    id: 'seed_from_tea',
    machineType: 'seed_maker',
    name: '茶苗种子',
    inputItemId: 'tea',
    inputQuantity: 1,
    outputItemId: 'seed_tea',
    outputQuantity: 2,
    processingDays: 1,
    description: '从茶苗中提取种子。'
  },
  {
    id: 'seed_from_watermelon',
    machineType: 'seed_maker',
    name: '西瓜种子',
    inputItemId: 'watermelon',
    inputQuantity: 1,
    outputItemId: 'seed_watermelon',
    outputQuantity: 2,
    processingDays: 1,
    description: '从西瓜中提取种子。'
  },
  {
    id: 'seed_from_rice',
    machineType: 'seed_maker',
    name: '稻种',
    inputItemId: 'rice',
    inputQuantity: 1,
    outputItemId: 'seed_rice',
    outputQuantity: 2,
    processingDays: 1,
    description: '从稻谷中提取种子。'
  },
  {
    id: 'seed_from_lotus_root',
    machineType: 'seed_maker',
    name: '莲藕种子',
    inputItemId: 'lotus_root',
    inputQuantity: 1,
    outputItemId: 'seed_lotus_root',
    outputQuantity: 2,
    processingDays: 1,
    description: '从莲藕中提取种子。'
  },
  {
    id: 'seed_from_sesame',
    machineType: 'seed_maker',
    name: '芝麻种子',
    inputItemId: 'sesame',
    inputQuantity: 1,
    outputItemId: 'seed_sesame',
    outputQuantity: 2,
    processingDays: 1,
    description: '从芝麻中提取种子。'
  },
  {
    id: 'seed_from_pumpkin',
    machineType: 'seed_maker',
    name: '南瓜种子',
    inputItemId: 'pumpkin',
    inputQuantity: 1,
    outputItemId: 'seed_pumpkin',
    outputQuantity: 2,
    processingDays: 1,
    description: '从南瓜中提取种子。'
  },
  {
    id: 'seed_from_sweet_potato',
    machineType: 'seed_maker',
    name: '红薯种子',
    inputItemId: 'sweet_potato',
    inputQuantity: 1,
    outputItemId: 'seed_sweet_potato',
    outputQuantity: 2,
    processingDays: 1,
    description: '从红薯中提取种子。'
  },
  {
    id: 'seed_from_chrysanthemum',
    machineType: 'seed_maker',
    name: '菊花种子',
    inputItemId: 'chrysanthemum',
    inputQuantity: 1,
    outputItemId: 'seed_chrysanthemum',
    outputQuantity: 2,
    processingDays: 1,
    description: '从菊花中提取种子。'
  },
  {
    id: 'seed_from_osmanthus',
    machineType: 'seed_maker',
    name: '桂花种子',
    inputItemId: 'osmanthus',
    inputQuantity: 1,
    outputItemId: 'seed_osmanthus',
    outputQuantity: 2,
    processingDays: 1,
    description: '从桂花中提取种子。'
  },
  {
    id: 'seed_from_bamboo_shoot',
    machineType: 'seed_maker',
    name: '春笋种子',
    inputItemId: 'bamboo_shoot',
    inputQuantity: 1,
    outputItemId: 'seed_bamboo_shoot',
    outputQuantity: 2,
    processingDays: 1,
    description: '从春笋中提取种子。'
  },
  {
    id: 'seed_from_persimmon',
    machineType: 'seed_maker',
    name: '柿子种子',
    inputItemId: 'persimmon',
    inputQuantity: 1,
    outputItemId: 'seed_persimmon',
    outputQuantity: 2,
    processingDays: 1,
    description: '从柿子中提取种子。'
  },
  {
    id: 'seed_from_winter_wheat',
    machineType: 'seed_maker',
    name: '冬麦种子',
    inputItemId: 'winter_wheat',
    inputQuantity: 1,
    outputItemId: 'seed_winter_wheat',
    outputQuantity: 2,
    processingDays: 1,
    description: '从冬小麦中提取种子。'
  },
  {
    id: 'seed_from_garlic',
    machineType: 'seed_maker',
    name: '大蒜种子',
    inputItemId: 'garlic',
    inputQuantity: 1,
    outputItemId: 'seed_garlic',
    outputQuantity: 2,
    processingDays: 1,
    description: '从大蒜中提取种子。'
  },
  {
    id: 'seed_from_snow_lotus',
    machineType: 'seed_maker',
    name: '雪莲种子',
    inputItemId: 'snow_lotus',
    inputQuantity: 1,
    outputItemId: 'seed_snow_lotus',
    outputQuantity: 2,
    processingDays: 1,
    description: '从雪莲中提取种子。'
  },
  {
    id: 'seed_from_rapeseed',
    machineType: 'seed_maker',
    name: '油菜种子',
    inputItemId: 'rapeseed',
    inputQuantity: 1,
    outputItemId: 'seed_rapeseed',
    outputQuantity: 2,
    processingDays: 1,
    description: '从油菜中提取种子。'
  },
  {
    id: 'seed_from_broad_bean',
    machineType: 'seed_maker',
    name: '蚕豆种子',
    inputItemId: 'broad_bean',
    inputQuantity: 1,
    outputItemId: 'seed_broad_bean',
    outputQuantity: 2,
    processingDays: 1,
    description: '从蚕豆中提取种子。'
  },
  {
    id: 'seed_from_peach',
    machineType: 'seed_maker',
    name: '水蜜桃种子',
    inputItemId: 'peach',
    inputQuantity: 1,
    outputItemId: 'seed_peach',
    outputQuantity: 2,
    processingDays: 1,
    description: '从水蜜桃中提取种子。'
  },
  {
    id: 'seed_from_green_bean',
    machineType: 'seed_maker',
    name: '豆角种子',
    inputItemId: 'green_bean',
    inputQuantity: 1,
    outputItemId: 'seed_green_bean',
    outputQuantity: 2,
    processingDays: 1,
    description: '从豆角中提取种子。'
  },
  {
    id: 'seed_from_loofah',
    machineType: 'seed_maker',
    name: '丝瓜种子',
    inputItemId: 'loofah',
    inputQuantity: 1,
    outputItemId: 'seed_loofah',
    outputQuantity: 2,
    processingDays: 1,
    description: '从丝瓜中提取种子。'
  },
  {
    id: 'seed_from_eggplant',
    machineType: 'seed_maker',
    name: '茄子种子',
    inputItemId: 'eggplant',
    inputQuantity: 1,
    outputItemId: 'seed_eggplant',
    outputQuantity: 2,
    processingDays: 1,
    description: '从茄子中提取种子。'
  },
  {
    id: 'seed_from_chili',
    machineType: 'seed_maker',
    name: '辣椒种子',
    inputItemId: 'chili',
    inputQuantity: 1,
    outputItemId: 'seed_chili',
    outputQuantity: 2,
    processingDays: 1,
    description: '从辣椒中提取种子。'
  },
  {
    id: 'seed_from_lotus_seed',
    machineType: 'seed_maker',
    name: '莲子种子',
    inputItemId: 'lotus_seed',
    inputQuantity: 1,
    outputItemId: 'seed_lotus_seed',
    outputQuantity: 2,
    processingDays: 1,
    description: '从莲子中提取种子。'
  },
  {
    id: 'seed_from_corn',
    machineType: 'seed_maker',
    name: '玉米种子',
    inputItemId: 'corn',
    inputQuantity: 1,
    outputItemId: 'seed_corn',
    outputQuantity: 2,
    processingDays: 1,
    description: '从玉米中提取种子。'
  },
  {
    id: 'seed_from_yam',
    machineType: 'seed_maker',
    name: '山药种子',
    inputItemId: 'yam',
    inputQuantity: 1,
    outputItemId: 'seed_yam',
    outputQuantity: 2,
    processingDays: 1,
    description: '从山药中提取种子。'
  },
  {
    id: 'seed_from_peanut',
    machineType: 'seed_maker',
    name: '花生种子',
    inputItemId: 'peanut',
    inputQuantity: 1,
    outputItemId: 'seed_peanut',
    outputQuantity: 2,
    processingDays: 1,
    description: '从花生中提取种子。'
  },
  {
    id: 'seed_from_jujube',
    machineType: 'seed_maker',
    name: '红枣种子',
    inputItemId: 'jujube',
    inputQuantity: 1,
    outputItemId: 'seed_jujube',
    outputQuantity: 2,
    processingDays: 1,
    description: '从红枣中提取种子。'
  },
  {
    id: 'seed_from_ginger',
    machineType: 'seed_maker',
    name: '生姜种子',
    inputItemId: 'ginger',
    inputQuantity: 1,
    outputItemId: 'seed_ginger',
    outputQuantity: 2,
    processingDays: 1,
    description: '从生姜中提取种子。'
  },
  {
    id: 'seed_from_napa_cabbage',
    machineType: 'seed_maker',
    name: '白菜种子',
    inputItemId: 'napa_cabbage',
    inputQuantity: 1,
    outputItemId: 'seed_napa_cabbage',
    outputQuantity: 2,
    processingDays: 1,
    description: '从白菜中提取种子。'
  },
  {
    id: 'seed_from_spinach',
    machineType: 'seed_maker',
    name: '菠菜种子',
    inputItemId: 'spinach',
    inputQuantity: 1,
    outputItemId: 'seed_spinach',
    outputQuantity: 2,
    processingDays: 1,
    description: '从菠菜中提取种子。'
  },
  {
    id: 'seed_from_mustard_green',
    machineType: 'seed_maker',
    name: '芥菜种子',
    inputItemId: 'mustard_green',
    inputQuantity: 1,
    outputItemId: 'seed_mustard_green',
    outputQuantity: 2,
    processingDays: 1,
    description: '从芥菜中提取种子。'
  },
  {
    id: 'seed_from_chives',
    machineType: 'seed_maker',
    name: '韭菜种子',
    inputItemId: 'chives',
    inputQuantity: 1,
    outputItemId: 'seed_chives',
    outputQuantity: 2,
    processingDays: 1,
    description: '从韭菜中提取种子。'
  },
  // 结晶复制机
  {
    id: 'dup_quartz',
    machineType: 'crystal_duplicator',
    name: '复制石英',
    inputItemId: 'quartz',
    inputQuantity: 1,
    outputItemId: 'quartz',
    outputQuantity: 2,
    processingDays: 3,
    description: '缓慢复制一颗石英。'
  },
  {
    id: 'dup_jade',
    machineType: 'crystal_duplicator',
    name: '复制翡翠',
    inputItemId: 'jade',
    inputQuantity: 1,
    outputItemId: 'jade',
    outputQuantity: 2,
    processingDays: 4,
    description: '缓慢复制一颗翡翠。'
  },
  {
    id: 'dup_ruby',
    machineType: 'crystal_duplicator',
    name: '复制红宝石',
    inputItemId: 'ruby',
    inputQuantity: 1,
    outputItemId: 'ruby',
    outputQuantity: 2,
    processingDays: 5,
    description: '缓慢复制一颗红宝石。'
  },
  {
    id: 'dup_moonstone',
    machineType: 'crystal_duplicator',
    name: '复制月光石',
    inputItemId: 'moonstone',
    inputQuantity: 1,
    outputItemId: 'moonstone',
    outputQuantity: 2,
    processingDays: 5,
    description: '缓慢复制一颗月光石。'
  },
  {
    id: 'dup_obsidian',
    machineType: 'crystal_duplicator',
    name: '复制黑曜石',
    inputItemId: 'obsidian',
    inputQuantity: 1,
    outputItemId: 'obsidian',
    outputQuantity: 2,
    processingDays: 4,
    description: '缓慢复制一颗黑曜石。'
  },
  {
    id: 'dup_dragon_jade',
    machineType: 'crystal_duplicator',
    name: '复制龙玉',
    inputItemId: 'dragon_jade',
    inputQuantity: 1,
    outputItemId: 'dragon_jade',
    outputQuantity: 2,
    processingDays: 7,
    description: '缓慢复制一颗龙玉。'
  },
  // 烟熏机
  {
    id: 'smoke_crucian',
    machineType: 'smoker',
    name: '烟熏鲫鱼',
    inputItemId: 'crucian',
    inputQuantity: 1,
    outputItemId: 'smoked_crucian',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲫鱼烟熏处理。'
  },
  {
    id: 'smoke_carp',
    machineType: 'smoker',
    name: '烟熏鲤鱼',
    inputItemId: 'carp',
    inputQuantity: 1,
    outputItemId: 'smoked_carp',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲤鱼烟熏处理。'
  },
  {
    id: 'smoke_grass_carp',
    machineType: 'smoker',
    name: '烟熏草鱼',
    inputItemId: 'grass_carp',
    inputQuantity: 1,
    outputItemId: 'smoked_grass_carp',
    outputQuantity: 1,
    processingDays: 1,
    description: '将草鱼烟熏处理。'
  },
  {
    id: 'smoke_bass',
    machineType: 'smoker',
    name: '烟熏鲈鱼',
    inputItemId: 'bass',
    inputQuantity: 1,
    outputItemId: 'smoked_bass',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲈鱼烟熏处理。'
  },
  {
    id: 'smoke_catfish',
    machineType: 'smoker',
    name: '烟熏鲶鱼',
    inputItemId: 'catfish',
    inputQuantity: 1,
    outputItemId: 'smoked_catfish',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲶鱼烟熏处理。'
  },
  {
    id: 'smoke_mandarin_fish',
    machineType: 'smoker',
    name: '烟熏桂花鱼',
    inputItemId: 'mandarin_fish',
    inputQuantity: 1,
    outputItemId: 'smoked_mandarin_fish',
    outputQuantity: 1,
    processingDays: 1,
    description: '将桂花鱼烟熏处理。'
  },
  {
    id: 'smoke_eel',
    machineType: 'smoker',
    name: '烟熏鳗鱼',
    inputItemId: 'eel',
    inputQuantity: 1,
    outputItemId: 'smoked_eel',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鳗鱼烟熏处理。'
  },
  {
    id: 'smoke_sturgeon',
    machineType: 'smoker',
    name: '烟熏鲟鱼',
    inputItemId: 'sturgeon',
    inputQuantity: 1,
    outputItemId: 'smoked_sturgeon',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲟鱼烟熏处理。'
  },
  {
    id: 'smoke_loach',
    machineType: 'smoker',
    name: '烟熏泥鳅',
    inputItemId: 'loach',
    inputQuantity: 1,
    outputItemId: 'smoked_loach',
    outputQuantity: 1,
    processingDays: 1,
    description: '将泥鳅烟熏处理。'
  },
  {
    id: 'smoke_yellow_eel',
    machineType: 'smoker',
    name: '烟熏黄鳝',
    inputItemId: 'yellow_eel',
    inputQuantity: 1,
    outputItemId: 'smoked_yellow_eel',
    outputQuantity: 1,
    processingDays: 1,
    description: '将黄鳝烟熏处理。'
  },
  // 脱水机
  {
    id: 'dry_mushroom',
    machineType: 'dehydrator',
    name: '干蘑菇',
    inputItemId: 'wild_mushroom',
    inputQuantity: 3,
    outputItemId: 'dried_mushroom',
    outputQuantity: 1,
    processingDays: 1,
    description: '将野蘑菇脱水制成干蘑菇。'
  },
  {
    id: 'dry_peach',
    machineType: 'dehydrator',
    name: '桃干',
    inputItemId: 'tree_peach',
    inputQuantity: 1,
    outputItemId: 'dried_peach',
    outputQuantity: 1,
    processingDays: 1,
    description: '将鲜桃脱水制成桃干。'
  },
  {
    id: 'dry_lychee',
    machineType: 'dehydrator',
    name: '荔枝干',
    inputItemId: 'lychee',
    inputQuantity: 1,
    outputItemId: 'dried_lychee',
    outputQuantity: 1,
    processingDays: 1,
    description: '将荔枝脱水制成荔枝干。'
  },
  {
    id: 'dry_persimmon',
    machineType: 'dehydrator',
    name: '柿饼',
    inputItemId: 'persimmon',
    inputQuantity: 1,
    outputItemId: 'dried_persimmon_slice',
    outputQuantity: 1,
    processingDays: 1,
    description: '将柿子脱水制成柿饼。'
  },
  {
    id: 'dry_hawthorn',
    machineType: 'dehydrator',
    name: '山楂片',
    inputItemId: 'hawthorn',
    inputQuantity: 1,
    outputItemId: 'dried_hawthorn',
    outputQuantity: 1,
    processingDays: 1,
    description: '将山楂脱水制成山楂片。'
  },
  {
    id: 'dry_apricot',
    machineType: 'dehydrator',
    name: '杏脯',
    inputItemId: 'apricot',
    inputQuantity: 1,
    outputItemId: 'dried_apricot',
    outputQuantity: 1,
    processingDays: 1,
    description: '将杏子脱水制成杏脯。'
  },
  {
    id: 'dry_wild_berry',
    machineType: 'dehydrator',
    name: '果脯',
    inputItemId: 'wild_berry',
    inputQuantity: 3,
    outputItemId: 'dried_berry',
    outputQuantity: 1,
    processingDays: 1,
    description: '将野果脱水制成果脯。'
  },
  {
    id: 'dry_lotus_seed',
    machineType: 'dehydrator',
    name: '干莲子',
    inputItemId: 'lotus_seed',
    inputQuantity: 2,
    outputItemId: 'dried_lotus_seed',
    outputQuantity: 1,
    processingDays: 1,
    description: '将莲子脱水成耐储的干莲子，可继续做安神茶点或研成莲心粉。'
  },
  // 晒架
  {
    id: 'rack_dried_persimmon',
    machineType: 'drying_rack',
    name: '柿饼',
    inputItemId: 'persimmon',
    inputQuantity: 1,
    outputItemId: 'dried_persimmon_slice',
    outputQuantity: 1,
    processingDays: 2,
    description: '将柿子慢晒成柿饼，适合作为冬储点心和节会甜品。'
  },
  {
    id: 'rack_dried_vegetable',
    machineType: 'drying_rack',
    name: '干菜',
    inputItemId: 'cabbage',
    inputQuantity: 2,
    outputItemId: 'dried_vegetable',
    outputQuantity: 1,
    processingDays: 2,
    description: '将白菜晒成耐储干菜，可继续做干菜汤、订单食材和冬储补给。'
  },
  {
    id: 'rack_dried_herb',
    machineType: 'drying_rack',
    name: '药材干',
    inputItemId: 'herb',
    inputQuantity: 3,
    outputItemId: 'dried_herb',
    outputQuantity: 1,
    processingDays: 2,
    description: '将草药晒成药材干，适合再研磨成药膏或作为丹材储备。'
  },
  // 回收机
  {
    id: 'recycle_firewood',
    machineType: 'recycler',
    name: '回收柴火',
    inputItemId: 'trash',
    inputQuantity: 3,
    outputItemId: 'firewood',
    outputQuantity: 5,
    processingDays: 1,
    description: '将垃圾回收转化为柴火。'
  },
  {
    id: 'recycle_copper',
    machineType: 'recycler',
    name: '回收铜矿',
    inputItemId: 'trash',
    inputQuantity: 5,
    outputItemId: 'copper_ore',
    outputQuantity: 3,
    processingDays: 1,
    description: '将垃圾回收提炼出铜矿。'
  },
  {
    id: 'recycle_iron',
    machineType: 'recycler',
    name: '回收铁矿',
    inputItemId: 'trash',
    inputQuantity: 5,
    outputItemId: 'iron_ore',
    outputQuantity: 2,
    processingDays: 1,
    description: '将垃圾回收提炼出铁矿。'
  },
  {
    id: 'recycle_quartz',
    machineType: 'recycler',
    name: '回收石英',
    inputItemId: 'trash',
    inputQuantity: 8,
    outputItemId: 'quartz',
    outputQuantity: 1,
    processingDays: 2,
    description: '将垃圾回收提炼出石英。'
  },
  {
    id: 'recycle_driftwood',
    machineType: 'recycler',
    name: '浮木回收',
    inputItemId: 'driftwood',
    inputQuantity: 5,
    outputItemId: 'wood',
    outputQuantity: 10,
    processingDays: 1,
    description: '将浮木处理为可用木材。'
  },
  {
    id: 'recycle_cd',
    machineType: 'recycler',
    name: '碟片提炼',
    inputItemId: 'broken_cd',
    inputQuantity: 3,
    outputItemId: 'copper_ore',
    outputQuantity: 3,
    processingDays: 1,
    description: '从碎碟片中提炼金属。'
  },
  {
    id: 'recycle_newspaper',
    machineType: 'recycler',
    name: '报纸回收',
    inputItemId: 'soggy_newspaper',
    inputQuantity: 5,
    outputItemId: 'firewood',
    outputQuantity: 3,
    processingDays: 1,
    description: '将湿报纸晒干用作燃料。'
  },
  // 乳酪机
  {
    id: 'cheese_milk',
    machineType: 'cheese_press',
    name: '奶酪',
    inputItemId: 'milk',
    inputQuantity: 1,
    outputItemId: 'cheese',
    outputQuantity: 1,
    processingDays: 2,
    description: '用牛奶制成的醇厚奶酪。'
  },
  {
    id: 'cheese_goat',
    machineType: 'cheese_press',
    name: '山羊奶酪',
    inputItemId: 'goat_milk',
    inputQuantity: 1,
    outputItemId: 'goat_cheese',
    outputQuantity: 1,
    processingDays: 2,
    description: '用山羊奶制成的风味奶酪。'
  },
  {
    id: 'cheese_buffalo',
    machineType: 'cheese_press',
    name: '水牛奶酪',
    inputItemId: 'buffalo_milk',
    inputQuantity: 1,
    outputItemId: 'buffalo_cheese',
    outputQuantity: 1,
    processingDays: 2,
    description: '用水牛奶制成的浓郁奶酪。'
  },
  {
    id: 'cheese_yak',
    machineType: 'cheese_press',
    name: '牦牛奶酪',
    inputItemId: 'yak_milk',
    inputQuantity: 1,
    outputItemId: 'yak_cheese',
    outputQuantity: 1,
    processingDays: 2,
    description: '用牦牛奶制成的高原奶酪。'
  },
  // 织布机
  {
    id: 'weave_wool',
    machineType: 'loom',
    name: '布匹',
    inputItemId: 'wool',
    inputQuantity: 1,
    outputItemId: 'cloth',
    outputQuantity: 1,
    processingDays: 2,
    description: '将羊毛纺织成布匹。'
  },
  {
    id: 'weave_silk',
    machineType: 'loom',
    name: '丝绸',
    inputItemId: 'silk',
    inputQuantity: 1,
    outputItemId: 'silk_cloth',
    outputQuantity: 1,
    processingDays: 2,
    description: '将蚕丝织成华美丝绸。'
  },
  {
    id: 'weave_alpaca',
    machineType: 'loom',
    name: '羊驼绒',
    inputItemId: 'alpaca_wool',
    inputQuantity: 1,
    outputItemId: 'alpaca_cloth',
    outputQuantity: 1,
    processingDays: 2,
    description: '将羊驼毛织成柔软绒布。'
  },
  {
    id: 'weave_rabbit',
    machineType: 'loom',
    name: '毛毡',
    inputItemId: 'rabbit_fur',
    inputQuantity: 1,
    outputItemId: 'felt',
    outputQuantity: 1,
    processingDays: 2,
    description: '将兔毛压制成毛毡。'
  },
  // 熔炉
  {
    id: 'smelt_copper',
    machineType: 'furnace',
    name: '铜锭',
    inputItemId: 'copper_ore',
    inputQuantity: 5,
    outputItemId: 'copper_bar',
    outputQuantity: 1,
    processingDays: 1,
    description: '将铜矿冶炼成铜锭。'
  },
  {
    id: 'smelt_iron',
    machineType: 'furnace',
    name: '铁锭',
    inputItemId: 'iron_ore',
    inputQuantity: 5,
    outputItemId: 'iron_bar',
    outputQuantity: 1,
    processingDays: 1,
    description: '将铁矿冶炼成铁锭。'
  },
  {
    id: 'smelt_gold',
    machineType: 'furnace',
    name: '金锭',
    inputItemId: 'gold_ore',
    inputQuantity: 5,
    outputItemId: 'gold_bar',
    outputQuantity: 1,
    processingDays: 1,
    description: '将金矿冶炼成金锭。'
  },
  {
    id: 'smelt_iridium',
    machineType: 'furnace',
    name: '铱锭',
    inputItemId: 'iridium_ore',
    inputQuantity: 5,
    outputItemId: 'iridium_bar',
    outputQuantity: 1,
    processingDays: 2,
    description: '将铱矿冶炼成铱锭。'
  },
  // 合金配方
  {
    id: 'smelt_bronze',
    machineType: 'furnace',
    name: '青铜锭',
    inputItemId: 'copper_bar',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'iron_bar', quantity: 1 }],
    outputItemId: 'bronze_bar',
    outputQuantity: 1,
    processingDays: 2,
    description: '将铜锭与铁锭合炼成青铜锭，可用于高级工具制作。'
  },
  {
    id: 'smelt_refined_quartz',
    machineType: 'furnace',
    name: '精制石英',
    inputItemId: 'quartz',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'charcoal', quantity: 1 }],
    outputItemId: 'refined_quartz',
    outputQuantity: 1,
    processingDays: 1,
    description: '用高温木炭提纯石英，得到纯净透明的精制石英。'
  },
  {
    id: 'smelt_mythril',
    machineType: 'furnace',
    name: '秘银锭',
    inputItemId: 'crystal_ore',
    inputQuantity: 3,
    extraInputs: [{ itemId: 'iron_bar', quantity: 1 }],
    outputItemId: 'mythril_bar',
    outputQuantity: 1,
    processingDays: 3,
    description: '将水晶矿与铁锭熔合，得到散发神秘光芒的秘银锭。'
  },
  // 炭窑
  {
    id: 'burn_wood',
    machineType: 'charcoal_kiln',
    name: '木炭（木材）',
    inputItemId: 'wood',
    inputQuantity: 10,
    outputItemId: 'charcoal',
    outputQuantity: 1,
    processingDays: 1,
    description: '将木材烧制成木炭。'
  },
  {
    id: 'burn_bamboo',
    machineType: 'charcoal_kiln',
    name: '木炭（竹子）',
    inputItemId: 'bamboo',
    inputQuantity: 5,
    outputItemId: 'charcoal',
    outputQuantity: 1,
    processingDays: 1,
    description: '将竹子烧制成木炭。'
  },
  // 石磨
  {
    id: 'mill_rice',
    machineType: 'mill',
    name: '米粉',
    inputItemId: 'rice',
    inputQuantity: 2,
    outputItemId: 'rice_flour',
    outputQuantity: 1,
    processingDays: 1,
    description: '将稻米磨成米粉。'
  },
  {
    id: 'mill_wheat',
    machineType: 'mill',
    name: '面粉',
    inputItemId: 'winter_wheat',
    inputQuantity: 2,
    outputItemId: 'wheat_flour',
    outputQuantity: 1,
    processingDays: 1,
    description: '将冬小麦磨成面粉。'
  },
  {
    id: 'mill_corn',
    machineType: 'mill',
    name: '玉米粉',
    inputItemId: 'corn',
    inputQuantity: 2,
    outputItemId: 'cornmeal',
    outputQuantity: 1,
    processingDays: 1,
    description: '将玉米磨成玉米粉。'
  },
  {
    id: 'mill_sesame_powder',
    machineType: 'mill',
    name: '芝麻粉',
    inputItemId: 'sesame',
    inputQuantity: 2,
    outputItemId: 'sesame_powder',
    outputQuantity: 1,
    processingDays: 1,
    description: '将芝麻磨成细粉，适合作糕点、宠物点心和辛香丹材。'
  },
  // 蚯蚓箱
  {
    id: 'worm_bait',
    machineType: 'worm_bin',
    name: '蚯蚓鱼饵',
    inputItemId: null,
    inputQuantity: 0,
    outputItemId: 'standard_bait',
    outputQuantity: 3,
    processingDays: 2,
    description: '蚯蚓箱自动产出鱼饵。'
  },
  // 制茶机
  {
    id: 'brew_green_tea',
    machineType: 'tea_maker',
    name: '绿茶',
    inputItemId: 'tea',
    inputQuantity: 2,
    outputItemId: 'green_tea_drink',
    outputQuantity: 1,
    processingDays: 1,
    description: '用茶叶泡制的清香绿茶。'
  },
  {
    id: 'brew_guest_green_tea',
    machineType: 'tea_maker',
    name: '待客清茶',
    inputItemId: 'tea',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'guest_green_tea',
    outputQuantity: 1,
    processingDays: 1,
    description: '茶叶佐蜂蜜调成温润待客茶，作为好友拜访与节会寒暄的社交饮品。'
  },
  {
    id: 'brew_chrysanthemum',
    machineType: 'tea_maker',
    name: '菊花茶',
    inputItemId: 'chrysanthemum',
    inputQuantity: 2,
    outputItemId: 'chrysanthemum_tea',
    outputQuantity: 1,
    processingDays: 1,
    description: '清热明目的菊花茶。'
  },
  {
    id: 'brew_osmanthus',
    machineType: 'tea_maker',
    name: '桂花茶',
    inputItemId: 'osmanthus',
    inputQuantity: 2,
    outputItemId: 'processed_osmanthus_tea',
    outputQuantity: 1,
    processingDays: 1,
    description: '馥郁芬芳的桂花茶。'
  },
  {
    id: 'brew_ginseng',
    machineType: 'tea_maker',
    name: '人参茶',
    inputItemId: 'ginseng',
    inputQuantity: 1,
    outputItemId: 'ginseng_tea',
    outputQuantity: 1,
    processingDays: 1,
    description: '滋补强身的人参茶。'
  },
  // 豆腐坊
  {
    id: 'press_tofu',
    machineType: 'tofu_press',
    name: '豆腐',
    inputItemId: 'broad_bean',
    inputQuantity: 3,
    outputItemId: 'tofu',
    outputQuantity: 1,
    processingDays: 1,
    description: '用蚕豆磨制的鲜嫩豆腐。'
  },
  {
    id: 'press_peanut_tofu',
    machineType: 'tofu_press',
    name: '花生豆腐',
    inputItemId: 'peanut',
    inputQuantity: 3,
    outputItemId: 'peanut_tofu',
    outputQuantity: 1,
    processingDays: 1,
    description: '用花生磨制的香浓豆腐。'
  },
  {
    id: 'press_sesame_paste',
    machineType: 'tofu_press',
    name: '芝麻酱',
    inputItemId: 'sesame',
    inputQuantity: 2,
    outputItemId: 'sesame_paste',
    outputQuantity: 1,
    processingDays: 1,
    description: '用芝麻磨制的浓香芝麻酱。'
  },
  // 药碾
  {
    id: 'grind_herb',
    machineType: 'herb_grinder',
    name: '草药膏',
    inputItemId: 'herb',
    inputQuantity: 3,
    outputItemId: 'herbal_paste',
    outputQuantity: 1,
    processingDays: 2,
    description: '将草药研磨成药膏。'
  },
  {
    id: 'grind_dried_herb',
    machineType: 'herb_grinder',
    name: '草药膏',
    inputItemId: 'dried_herb',
    inputQuantity: 1,
    outputItemId: 'herbal_paste',
    outputQuantity: 1,
    processingDays: 1,
    description: '将药材干复研成稳定草药膏，继续进入清心莲丹和探索前药材准备。'
  },
  {
    id: 'grind_ginseng',
    machineType: 'herb_grinder',
    name: '人参精',
    inputItemId: 'ginseng',
    inputQuantity: 1,
    outputItemId: 'ginseng_extract',
    outputQuantity: 1,
    processingDays: 2,
    description: '将人参浓缩成精华。'
  },
  {
    id: 'grind_antler',
    machineType: 'herb_grinder',
    name: '鹿茸粉',
    inputItemId: 'antler_velvet',
    inputQuantity: 1,
    outputItemId: 'antler_powder',
    outputQuantity: 1,
    processingDays: 2,
    description: '将鹿茸研磨成粉。'
  },
  {
    id: 'grind_lotus_heart_powder',
    machineType: 'herb_grinder',
    name: '莲心粉',
    inputItemId: 'dried_lotus_seed',
    inputQuantity: 1,
    outputItemId: 'lotus_heart_powder',
    outputQuantity: 1,
    processingDays: 1,
    description: '将干莲子研成清苦莲心粉，作为安神茶和清心丹的稳定辅材。'
  },
  {
    id: 'grind_animal_medicine',
    machineType: 'herb_grinder',
    name: '兽药',
    inputItemId: 'herb',
    inputQuantity: 2,
    outputItemId: 'animal_medicine',
    outputQuantity: 1,
    processingDays: 1,
    description: '将草药研磨成治疗牲畜的药物。'
  },
  // 丹炉
  {
    id: 'alchemy_qingxin_lotus_elixir',
    machineType: 'alchemy_furnace',
    name: '清心莲丹',
    inputItemId: 'lotus_seed',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'lotus_root', quantity: 1 },
      { itemId: 'herbal_paste', quantity: 1 }
    ],
    outputItemId: 'qingxin_lotus_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'clear',
      mainMaterialId: 'lotus_seed',
      supportMaterialIds: ['lotus_root'],
      primerItemId: 'herbal_paste',
      heat: 'gentle',
      shortEffect: '探索前护心与降低疲劳波动',
      results: buildAlchemyResultRules('qingxin_lotus_elixir'),
      effect: {
        description: '今日采矿体力消耗-8%，远征体力消耗-6%，宠物安抚好感+3',
        miningStaminaReduction: 0.08,
        journeyStaminaReduction: 0.06,
        petCalmFriendshipBonus: 3
      }
    },
    description: '莲子、莲藕与草药膏同炼，成丹清润，可作探索前的护心丹。'
  },
  {
    id: 'alchemy_warming_sweet_potato_pill',
    machineType: 'alchemy_furnace',
    name: '温阳薯丸',
    inputItemId: 'sweet_potato',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'ginger', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'warming_sweet_potato_pill',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'warm',
      mainMaterialId: 'sweet_potato',
      supportMaterialIds: ['ginger'],
      primerItemId: 'honey',
      heat: 'steady',
      shortEffect: '农忙与采集前的短时耐力准备',
      results: buildAlchemyResultRules('warming_sweet_potato_pill'),
      effect: {
        description: '立即恢复30体力，今日行动耗时-5%',
        staminaRestore: 30,
        actionSpeedBonus: 0.05
      }
    },
    description: '红薯、姜与蜂蜜温炼成丸，适合农忙和采集前备用。'
  },
  {
    id: 'alchemy_grain_breath_elixir',
    machineType: 'alchemy_furnace',
    name: '谷气续行丹',
    inputItemId: 'rice',
    inputQuantity: 3,
    extraInputs: [
      { itemId: 'herb', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'grain_breath_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'warm',
      mainMaterialId: 'rice',
      supportMaterialIds: ['herb'],
      primerItemId: 'honey',
      heat: 'steady',
      shortEffect: '旅途、公共订单和长线经营前的短时续航准备',
      results: buildAlchemyResultRules('grain_breath_elixir'),
      effect: {
        description: '立即恢复20体力，今日远征体力消耗-4%，行动耗时-3%',
        staminaRestore: 20,
        journeyStaminaReduction: 0.04,
        actionSpeedBonus: 0.03
      }
    },
    description: '稻米、草药与蜂蜜中火同炼，取谷物厚实之气，适合赶路和公共订单前续航。'
  },
  {
    id: 'alchemy_sesame_courtesy_elixir',
    machineType: 'alchemy_furnace',
    name: '芝香护礼丸',
    inputItemId: 'sesame',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'tea', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'sesame_courtesy_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'fragrant',
      mainMaterialId: 'sesame',
      supportMaterialIds: ['tea'],
      primerItemId: 'honey',
      heat: 'gentle',
      shortEffect: '送礼、节会供品和拜访前的短时礼仪准备',
      results: buildAlchemyResultRules('sesame_courtesy_elixir'),
      effect: {
        description: '今日送礼好感×1.08，受到伤害-4%',
        giftBonusMultiplier: 1.08,
        defenseReduction: 0.04
      }
    },
    description: '芝麻、茶叶与蜂蜜文火合香，适合送礼、节会供品和拜访前稳定心神。'
  },
  {
    id: 'alchemy_pumpkin_warmth_elixir',
    machineType: 'alchemy_furnace',
    name: '南瓜聚火丹',
    inputItemId: 'pumpkin',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'sesame_powder', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'pumpkin_warmth_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'warm',
      mainMaterialId: 'pumpkin',
      supportMaterialIds: ['sesame_powder'],
      primerItemId: 'honey',
      heat: 'steady',
      shortEffect: '节会备菜、宠物安抚和秋日订单前的短时暖身准备',
      results: buildAlchemyResultRules('pumpkin_warmth_elixir'),
      effect: {
        description: '立即恢复15体力，今日节会奖金×1.05，宠物安抚好感+2',
        staminaRestore: 15,
        festivalRewardMultiplier: 1.05,
        petCalmFriendshipBonus: 2
      }
    },
    description: '南瓜、芝麻粉与蜂蜜中火聚暖，和南瓜料理的节会 / 宠物餐价值区分为短时节会与安抚辅丹。'
  },
  {
    id: 'alchemy_yam_foundation_elixir',
    machineType: 'alchemy_furnace',
    name: '固元山药丹',
    inputItemId: 'yam',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'yam_foundation_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'root',
      mainMaterialId: 'yam',
      supportMaterialIds: ['ginseng'],
      primerItemId: 'honey',
      heat: 'steady',
      shortEffect: '长辈拜访、宠物安抚和药膳订单前的短时固元准备',
      results: buildAlchemyResultRules('yam_foundation_elixir'),
      effect: {
        description: '今日 NPC 对话好感+3，宠物安抚好感+2，远征体力消耗-3%',
        dialogueAffinityBonus: 3,
        petCalmFriendshipBonus: 2,
        journeyStaminaReduction: 0.03
      }
    },
    description: '山药、人参与蜂蜜中火固元，和山药团圆粥的家宴价值区分为拜访、宠物安抚和远行前的短效辅丹。'
  },
  {
    id: 'alchemy_garlic_coldward_elixir',
    machineType: 'alchemy_furnace',
    name: '蒜辛驱寒丹',
    inputItemId: 'garlic',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'ginger', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'garlic_coldward_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'spicy',
      mainMaterialId: 'garlic',
      supportMaterialIds: ['ginger'],
      primerItemId: 'honey',
      heat: 'strong',
      shortEffect: '冬日巡田、护送和节会暖场前的短时驱寒准备',
      results: buildAlchemyResultRules('garlic_coldward_elixir'),
      effect: {
        description: '今日行动耗时-4%，受到伤害-5%，节会奖金×1.03',
        actionSpeedBonus: 0.04,
        defenseReduction: 0.05,
        festivalRewardMultiplier: 1.03
      }
    },
    description: '大蒜、生姜与蜂蜜武火催辛，和蒜香萝卜的来访小菜价值区分为护送、防护和节会暖场辅丹。'
  },
  {
    id: 'alchemy_bitter_gourd_cooling_elixir',
    machineType: 'alchemy_furnace',
    name: '苦瓜清暑丹',
    inputItemId: 'bitter_gourd',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'tea', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'bitter_gourd_cooling_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'support',
      nature: 'clear',
      mainMaterialId: 'bitter_gourd',
      supportMaterialIds: ['tea'],
      primerItemId: 'honey',
      heat: 'gentle',
      shortEffect: '夏日行旅、采集和节会清供前的短时清暑准备',
      results: buildAlchemyResultRules('bitter_gourd_cooling_elixir'),
      effect: {
        description: '今日远征体力消耗-4%，采矿体力消耗-5%，节会奖金×1.04',
        journeyStaminaReduction: 0.04,
        miningStaminaReduction: 0.05,
        festivalRewardMultiplier: 1.04
      }
    },
    description: '苦瓜、茶叶与蜂蜜文火清炼，和苦瓜清暑汤的夏日剧情价值区分为行旅、采集与节会前的短效辅丹。'
  },
  {
    id: 'alchemy_spicy_vitality_pill',
    machineType: 'alchemy_furnace',
    name: '辛火行气丸',
    inputItemId: 'pickled_chili',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'sesame_paste', quantity: 1 },
      { itemId: 'tea', quantity: 2 }
    ],
    outputItemId: 'spicy_vitality_pill',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'main',
      nature: 'spicy',
      mainMaterialId: 'pickled_chili',
      supportMaterialIds: ['sesame_paste'],
      primerItemId: 'tea',
      heat: 'strong',
      shortEffect: '赶路、赛舟和护送前的短时行动提气',
      results: buildAlchemyResultRules('spicy_vitality_pill'),
      effect: {
        description: '今日行动耗时-10%，远征体力消耗-5%',
        actionSpeedBonus: 0.1,
        journeyStaminaReduction: 0.05
      }
    },
    description: '泡椒、芝麻酱与茶叶调和辛香，用于赶路、赛舟和护送前提气。'
  },
  {
    id: 'alchemy_osmanthus_focus_elixir',
    machineType: 'alchemy_furnace',
    name: '桂露凝神丹',
    inputItemId: 'osmanthus_honey',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'tea', quantity: 2 },
      { itemId: 'lotus_seed', quantity: 1 }
    ],
    outputItemId: 'osmanthus_focus_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'main',
      nature: 'fragrant',
      mainMaterialId: 'osmanthus_honey',
      supportMaterialIds: ['tea'],
      primerItemId: 'lotus_seed',
      heat: 'gentle',
      shortEffect: '社交与节会拜访前的短时凝神',
      results: buildAlchemyResultRules('osmanthus_focus_elixir'),
      effect: {
        description: '今日送礼好感×1.12，行动耗时-4%，节会奖金×1.08',
        giftBonusMultiplier: 1.12,
        actionSpeedBonus: 0.04,
        festivalRewardMultiplier: 1.08
      }
    },
    description: '桂花蜜、茶叶与莲子慢炼，香气沉静，适合社交与节会拜访前使用。'
  },
  {
    id: 'alchemy_tea_focus_elixir',
    machineType: 'alchemy_furnace',
    name: '茶心凝神丹',
    inputItemId: 'green_tea_drink',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'lotus_heart_powder', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'tea_focus_elixir',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'main',
      nature: 'clear',
      mainMaterialId: 'green_tea_drink',
      supportMaterialIds: ['lotus_heart_powder'],
      primerItemId: 'honey',
      heat: 'gentle',
      shortEffect: '文游对话、节会拜访和好友长谈前的短时专注',
      results: buildAlchemyResultRules('tea_focus_elixir'),
      effect: {
        description: '今日送礼好感×1.1，远征体力消耗-4%，NPC 对话好感+4',
        giftBonusMultiplier: 1.1,
        journeyStaminaReduction: 0.04,
        dialogueAffinityBonus: 4
      }
    },
    description: '绿茶、莲心粉与蜂蜜清炼成丹，适合文游对话、节会拜访和好友长谈前凝神。'
  },
  {
    id: 'alchemy_stone_root_guard_pill',
    machineType: 'alchemy_furnace',
    name: '石根护脉丸',
    inputItemId: 'radish',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'potato', quantity: 1 },
      { itemId: 'refined_quartz', quantity: 1 }
    ],
    outputItemId: 'stone_root_guard_pill',
    outputQuantity: 1,
    processingDays: 2,
    alchemy: {
      role: 'main',
      nature: 'root',
      mainMaterialId: 'radish',
      supportMaterialIds: ['potato'],
      primerItemId: 'refined_quartz',
      heat: 'steady',
      shortEffect: '矿洞与夜巡前的短时防护准备',
      results: buildAlchemyResultRules('stone_root_guard_pill'),
      effect: {
        description: '今日采矿体力消耗-12%，远征体力消耗-8%',
        miningStaminaReduction: 0.12,
        journeyStaminaReduction: 0.08,
        defenseReduction: 0.08
      }
    },
    description: '萝卜、土豆与精制石英炼成护脉丸，偏向矿洞与夜巡前的防护。'
  },
  {
    id: 'alchemy_spirit_peach_elixir',
    machineType: 'alchemy_furnace',
    name: '灵桃醒神丹',
    inputItemId: 'peach',
    inputQuantity: 2,
    minInputQuality: 'fine',
    extraInputs: [
      { itemId: 'candied_peach', quantity: 1 },
      { itemId: 'moon_herb', quantity: 1 }
    ],
    outputItemId: 'spirit_peach_elixir',
    outputQuantity: 1,
    processingDays: 3,
    alchemy: {
      role: 'main',
      nature: 'spirit_fruit',
      mainMaterialId: 'peach',
      supportMaterialIds: ['candied_peach'],
      primerItemId: 'moon_herb',
      heat: 'gentle',
      shortEffect: '灵果药性主丹，适合社交、节会拜访和长线经营前醒神',
      results: buildAlchemyResultRules('spirit_peach_elixir'),
      effect: {
        description: '今日送礼好感×1.15，行动耗时-6%，远征体力消耗-5%，NPC 对话好感+5，节会奖金×1.1，宠物安抚好感+4',
        giftBonusMultiplier: 1.15,
        actionSpeedBonus: 0.06,
        journeyStaminaReduction: 0.05,
        dialogueAffinityBonus: 5,
        festivalRewardMultiplier: 1.1,
        petCalmFriendshipBonus: 4
      }
    },
    description: '优质以上桃子、蜜桃脯与月草文火同炼，凝成带灵果药性的高阶醒神丹。'
  },
  // 特殊饲料
  {
    id: 'alchemy_ley_prismatic_transmutation',
    machineType: 'alchemy_furnace',
    name: '灵脉转彩丹',
    visibility: 'hidden',
    hiddenMeta: {
      unknownName: '未知转化丹方',
      familyId: 'mastery_transmutation',
      gate: { masteryRewardId: 'transmutation_recipe' },
      revealOn: 'collect'
    },
    inputItemId: 'ley_crystal_shard',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'wind_etched_core', quantity: 1 },
      { itemId: 'rare_elixir_crystal', quantity: 1 },
      { itemId: 'iridium_ore', quantity: 5 }
    ],
    outputItemId: 'prismatic_shard',
    outputQuantity: 1,
    processingDays: 3,
    alchemy: {
      role: 'main',
      nature: 'clear',
      mainMaterialId: 'ley_crystal_shard',
      supportMaterialIds: ['wind_etched_core', 'rare_elixir_crystal'],
      primerItemId: 'iridium_ore',
      heat: 'strong',
      shortEffect: '高耗材稀有资源转化，受每日主丹限次约束。',
      results: buildAlchemyResultRules('prismatic_shard'),
      effect: {
        description: '消耗灵脉碎晶、风蚀晶核、奇丹晶和铱矿进行一次高风险转化；每日主丹限次提供冷却。'
      }
    },
    description: '把云岚高地的灵脉碎晶与风蚀晶核压入丹炉，尝试换取五彩碎片。材料昂贵，失败也会消耗投入。'
  },
  {
    id: 'mill_premium_feed',
    machineType: 'mill',
    name: '精饲料',
    inputItemId: 'corn',
    inputQuantity: 3,
    outputItemId: 'premium_feed',
    outputQuantity: 2,
    processingDays: 1,
    description: '将玉米配制成精饲料。'
  },
  {
    id: 'mill_nourishing_feed',
    machineType: 'mill',
    name: '滋补饲料',
    inputItemId: 'rice',
    inputQuantity: 3,
    outputItemId: 'nourishing_feed',
    outputQuantity: 2,
    processingDays: 1,
    description: '将稻米配制成滋补饲料。'
  },
  {
    id: 'grind_vitality_feed',
    machineType: 'herb_grinder',
    name: '活力饲料',
    inputItemId: 'herb',
    inputQuantity: 3,
    outputItemId: 'vitality_feed',
    outputQuantity: 1,
    processingDays: 2,
    description: '将草药研磨成活力饲料。'
  },
  {
    id: 'mill_sweet_potato_filling_feed',
    machineType: 'mill',
    name: '红薯饱腹粮',
    inputItemId: 'sweet_potato',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'hay', quantity: 2 }],
    outputItemId: 'sweet_potato_filling_feed',
    outputQuantity: 2,
    processingDays: 1,
    description: '将红薯与干草磨成厚实饱腹粮，给红薯一个宠物耐力出口。'
  },
  {
    id: 'mill_pumpkin_pet_rice',
    machineType: 'mill',
    name: '南瓜宠物饭',
    inputItemId: 'pumpkin',
    inputQuantity: 1,
    extraInputs: [{ itemId: 'rice', quantity: 1 }],
    outputItemId: 'pumpkin_pet_rice',
    outputQuantity: 2,
    processingDays: 1,
    description: '将南瓜与稻米拌磨成绵甜宠物饭，给南瓜一个稳定亲密喂食出口。'
  },
  {
    id: 'mill_sesame_patrol_biscuit',
    machineType: 'mill',
    name: '芝麻巡院饼',
    inputItemId: 'sesame_powder',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'sweet_potato_filling_feed', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'sesame_patrol_biscuit',
    outputQuantity: 2,
    processingDays: 1,
    description: '将芝麻粉、红薯饱腹粮和蜂蜜压成高阶田犬点心，提供辛香巡院喂食出口。'
  },
  {
    id: 'mill_lotus_heart_cat_treat',
    machineType: 'mill',
    name: '莲心桂花糕',
    inputItemId: 'lotus_heart_powder',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'osmanthus', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    outputItemId: 'lotus_heart_cat_treat',
    outputQuantity: 2,
    processingDays: 1,
    description: '将莲心粉、桂花和蜂蜜揉成高阶猫与灵宠点心，延伸草本与芳香作物用途。'
  },
  {
    id: 'mill_spirit_fruit_mooncake',
    machineType: 'mill',
    name: '灵果月华糕',
    inputItemId: 'candied_peach',
    inputQuantity: 1,
    extraInputs: [
      { itemId: 'moon_herb', quantity: 1 },
      { itemId: 'lotus_heart_powder', quantity: 1 }
    ],
    outputItemId: 'spirit_fruit_mooncake',
    outputQuantity: 1,
    processingDays: 2,
    description: '将蜜桃脯、月草和莲心粉制成高阶灵宠点心，偏向稀有灵果线索但不稳定刷材料。'
  },
  // 鱼饲料
  {
    id: 'mill_fish_feed',
    machineType: 'mill',
    name: '鱼饲料',
    inputItemId: 'hay',
    inputQuantity: 5,
    outputItemId: 'fish_feed',
    outputQuantity: 3,
    processingDays: 1,
    description: '将干草发酵配制成鱼塘专用饲料。'
  },
  {
    id: 'recycle_fish_feed',
    machineType: 'recycler',
    name: '废料制饲料',
    inputItemId: 'trash',
    inputQuantity: 4,
    outputItemId: 'fish_feed',
    outputQuantity: 2,
    processingDays: 1,
    description: '将钓鱼时捞到的垃圾回收处理，制成鱼饲料。'
  },
  // 制香坊
  {
    id: 'incense_pine',
    machineType: 'incense_maker',
    name: '松香',
    inputItemId: 'pine_resin',
    inputQuantity: 2,
    outputItemId: 'pine_incense',
    outputQuantity: 1,
    processingDays: 2,
    description: '将松脂炼制成松香。'
  },
  {
    id: 'incense_camphor',
    machineType: 'incense_maker',
    name: '樟脑香',
    inputItemId: 'camphor_oil',
    inputQuantity: 2,
    outputItemId: 'camphor_incense',
    outputQuantity: 1,
    processingDays: 2,
    description: '将樟脑油炼制成樟脑香。'
  },
  {
    id: 'incense_osmanthus',
    machineType: 'incense_maker',
    name: '桂花香',
    inputItemId: 'osmanthus',
    inputQuantity: 2,
    outputItemId: 'osmanthus_incense',
    outputQuantity: 1,
    processingDays: 2,
    description: '将桂花制成桂花香。'
  },

  // ==================== 仙灵炉：求缘信物 ====================
  {
    id: 'spirit_forge_dragon_scale_charm',
    machineType: 'spirit_forge',
    name: '龙鳞佩',
    inputItemId: 'dragon_jade',
    inputQuantity: 2,
    outputItemId: 'dragon_scale_charm',
    outputQuantity: 1,
    processingDays: 3,
    description: '以龙玉雕琢的鳞片形佩饰，蕴含潜渊之力。'
  },
  {
    id: 'spirit_forge_blossom_crown',
    machineType: 'spirit_forge',
    name: '花灵冠',
    inputItemId: 'peach',
    inputQuantity: 3,
    extraInputs: [{ itemId: 'honey', quantity: 2 }],
    outputItemId: 'blossom_crown',
    outputQuantity: 1,
    processingDays: 3,
    description: '用永不凋零的桃花编织的花冠。'
  },
  {
    id: 'spirit_forge_jade_mortar',
    machineType: 'spirit_forge',
    name: '玉药杵',
    inputItemId: 'moonstone',
    inputQuantity: 3,
    outputItemId: 'jade_mortar',
    outputQuantity: 1,
    processingDays: 3,
    description: '月光石雕成的药杵，与月兔的玉杵成对。'
  },
  {
    id: 'spirit_forge_fox_flame_lantern',
    machineType: 'spirit_forge',
    name: '狐火灯笼',
    inputItemId: 'fox_bead',
    inputQuantity: 1,
    extraInputs: [{ itemId: 'ruby', quantity: 1 }],
    outputItemId: 'fox_flame_lantern',
    outputQuantity: 1,
    processingDays: 3,
    description: '内含狐火的灯笼，永不熄灭。'
  },
  {
    id: 'spirit_forge_cultivation_jade',
    machineType: 'spirit_forge',
    name: '修炼玉佩',
    inputItemId: 'jade',
    inputQuantity: 2,
    extraInputs: [{ itemId: 'ginseng', quantity: 1 }],
    outputItemId: 'cultivation_jade',
    outputQuantity: 1,
    processingDays: 3,
    description: '蕴含灵气的玉佩，修行者的信物。'
  },
  {
    id: 'spirit_forge_silver_thread_ring',
    machineType: 'spirit_forge',
    name: '银丝戒',
    inputItemId: 'silk',
    inputQuantity: 3,
    extraInputs: [{ itemId: 'moonstone', quantity: 1 }],
    outputItemId: 'silver_thread_ring',
    outputQuantity: 1,
    processingDays: 3,
    description: '用月光银丝编织的戒指，寄托归乡之思。'
  },

  // ==================== 仙灵炉：结缘信物 ====================
  {
    id: 'spirit_forge_dragon_pearl',
    machineType: 'spirit_forge',
    name: '龙珠',
    inputItemId: 'dragon_jade',
    inputQuantity: 3,
    extraInputs: [
      { itemId: 'moonstone', quantity: 2 },
      { itemId: 'prismatic_shard', quantity: 1 }
    ],
    outputItemId: 'spirit_dragon_pearl',
    outputQuantity: 1,
    processingDays: 7,
    description: '以龙玉、月光石与五彩碎片炼成的灵珠，是龙族至高的缘定信物。'
  },
  {
    id: 'spirit_forge_eternal_blossom',
    machineType: 'spirit_forge',
    name: '不凋花',
    inputItemId: 'peach',
    inputQuantity: 5,
    extraInputs: [
      { itemId: 'honey', quantity: 3 },
      { itemId: 'osmanthus', quantity: 2 }
    ],
    outputItemId: 'eternal_blossom',
    outputQuantity: 1,
    processingDays: 7,
    description: '用至尊桃子、蜂蜜和桂花凝聚而成，永不枯萎的灵花。'
  },
  {
    id: 'spirit_forge_moon_elixir',
    machineType: 'spirit_forge',
    name: '月华丹',
    inputItemId: 'ginseng',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'snow_lotus', quantity: 2 },
      { itemId: 'moonstone', quantity: 2 }
    ],
    outputItemId: 'moon_elixir',
    outputQuantity: 1,
    processingDays: 7,
    description: '人参、雪莲与月光石炼制的仙丹，散发柔和的银白色光芒。'
  },
  {
    id: 'spirit_forge_fox_spirit_bead',
    machineType: 'spirit_forge',
    name: '灵狐珠',
    inputItemId: 'ruby',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'moonstone', quantity: 2 },
      { itemId: 'gold_ore', quantity: 3 }
    ],
    outputItemId: 'fox_spirit_bead',
    outputQuantity: 1,
    processingDays: 7,
    description: '红宝石、月光石与黄金炼成的珠子，封印着狐仙的一缕灵力。'
  },
  {
    id: 'spirit_forge_immortal_gourd',
    machineType: 'spirit_forge',
    name: '仙人葫',
    inputItemId: 'ginseng',
    inputQuantity: 2,
    extraInputs: [
      { itemId: 'antler_velvet', quantity: 1 },
      { itemId: 'iridium_ore', quantity: 3 }
    ],
    outputItemId: 'immortal_gourd',
    outputQuantity: 1,
    processingDays: 7,
    description: '人参、鹿茸与铱矿炼制的丹葫芦，内蕴五百年修行之力。'
  },
  {
    id: 'spirit_forge_starlight_loom',
    machineType: 'spirit_forge',
    name: '星光织机',
    inputItemId: 'silk',
    inputQuantity: 3,
    extraInputs: [
      { itemId: 'moonstone', quantity: 2 },
      { itemId: 'prismatic_shard', quantity: 1 }
    ],
    outputItemId: 'starlight_loom',
    outputQuantity: 1,
    processingDays: 7,
    description: '蚕丝、月光石与五彩碎片织成的微型织机，能织出星光般的丝线。'
  }
]

/** 洒水器定义 */
export const SPRINKLERS: SprinklerDef[] = [
  {
    id: 'bamboo_sprinkler',
    name: '竹筒洒水器',
    description: '自动灌溉上下左右4块地。',
    range: 4,
    craftCost: [
      { itemId: 'bamboo', quantity: 10 },
      { itemId: 'copper_ore', quantity: 3 }
    ],
    craftMoney: 100
  },
  {
    id: 'copper_sprinkler',
    name: '铜管洒水器',
    description: '自动灌溉周围8块地。',
    range: 8,
    craftCost: [
      { itemId: 'copper_bar', quantity: 3 },
      { itemId: 'iron_bar', quantity: 1 }
    ],
    craftMoney: 500
  },
  {
    id: 'gold_sprinkler',
    name: '金管洒水器',
    description: '自动灌溉周围5×5共24块地。',
    range: 24,
    craftCost: [
      { itemId: 'gold_bar', quantity: 2 },
      { itemId: 'iron_bar', quantity: 2 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 1500
  }
]

/** 肥料定义 */
export const FERTILIZERS: FertilizerDef[] = [
  {
    id: 'basic_fertilizer',
    name: '基础肥料',
    description: '提升作物品质概率+20%。',
    qualityBonus: 0.2,
    craftCost: [
      { itemId: 'wood', quantity: 5 },
      { itemId: 'herb', quantity: 2 }
    ],
    craftMoney: 0,
    shopPrice: 25
  },
  {
    id: 'quality_fertilizer',
    name: '优质肥料',
    description: '提升作物品质概率+40%。',
    qualityBonus: 0.4,
    craftCost: [
      { itemId: 'herb', quantity: 3 },
      { itemId: 'quartz', quantity: 1 }
    ],
    craftMoney: 0,
    shopPrice: 75
  },
  {
    id: 'speed_gro',
    name: '生长激素',
    description: '加速作物生长25%。',
    growthSpeedup: 0.25,
    craftCost: [
      { itemId: 'pine_cone', quantity: 3 },
      { itemId: 'herb', quantity: 1 }
    ],
    craftMoney: 0,
    shopPrice: 50
  },
  {
    id: 'deluxe_speed_gro',
    name: '高级激素',
    description: '加速作物生长33%。',
    growthSpeedup: 0.33,
    craftCost: [
      { itemId: 'quartz', quantity: 1 },
      { itemId: 'firewood', quantity: 3 }
    ],
    craftMoney: 0,
    shopPrice: 100
  },
  {
    id: 'retaining_soil',
    name: '保湿土',
    description: '50%概率隔夜保持浇水状态。',
    retainChance: 0.5,
    craftCost: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'firewood', quantity: 2 }
    ],
    craftMoney: 0,
    shopPrice: 30
  },
  {
    id: 'quality_retaining_soil',
    name: '优质保湿土',
    description: '100%隔夜保持浇水状态。',
    retainChance: 1.0,
    craftCost: [
      { itemId: 'quartz', quantity: 1 },
      { itemId: 'wood', quantity: 5 }
    ],
    craftMoney: 0,
    shopPrice: 80
  }
]

/** 鱼饵定义 */
export const BAITS: BaitDef[] = [
  {
    id: 'standard_bait',
    name: '普通鱼饵',
    description: '使鱼更安静，降低猛冲概率。',
    behaviorModifier: { calm: 0.1, struggle: 0, dash: -0.1 },
    craftCost: [{ itemId: 'herb', quantity: 2 }],
    craftMoney: 0,
    shopPrice: 5
  },
  {
    id: 'wild_bait',
    name: '野生鱼饵',
    description: '25%概率获得双倍鱼获。',
    doubleCatchChance: 0.25,
    craftCost: [
      { itemId: 'herb', quantity: 3 },
      { itemId: 'wild_berry', quantity: 1 },
      { itemId: 'firewood', quantity: 2 }
    ],
    craftMoney: 0,
    shopPrice: null
  },
  {
    id: 'magic_bait',
    name: '魔法鱼饵',
    description: '无视季节限制，可钓到所有鱼。',
    ignoresSeason: true,
    craftCost: [
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    craftMoney: 0,
    shopPrice: null
  },
  {
    id: 'deluxe_bait',
    name: '精致鱼饵',
    description: '鱼更安静，挣扎成功率+5%。',
    behaviorModifier: { calm: 0.15, struggle: 0, dash: -0.1 },
    struggleBonus: 0.05,
    craftCost: [
      { itemId: 'herb', quantity: 3 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    craftMoney: 0,
    shopPrice: null
  },
  {
    id: 'targeted_bait',
    name: '定向鱼饵',
    description: '困难鱼权重×2，传说鱼权重×1.5。',
    hardWeightMult: 2,
    legendaryWeightMult: 1.5,
    craftCost: [
      { itemId: 'magic_bait', quantity: 1 },
      { itemId: 'gold_ore', quantity: 1 }
    ],
    craftMoney: 0,
    shopPrice: null
  }
]

/** 浮漂定义 */
export const TACKLES: TackleDef[] = [
  {
    id: 'spinner',
    name: '旋转浮漂',
    description: '减少50%钓鱼体力消耗。',
    maxDurability: 20,
    requiredRodTier: 'iron',
    staminaReduction: 0.5,
    craftCost: [
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'bamboo', quantity: 2 }
    ],
    craftMoney: 0,
    shopPrice: 250
  },
  {
    id: 'trap_bobber',
    name: '陷阱浮漂',
    description: '断线时获得1次额外机会。',
    maxDurability: 20,
    requiredRodTier: 'iron',
    extraBreakChance: 1,
    craftCost: [
      { itemId: 'copper_ore', quantity: 5 },
      { itemId: 'wood', quantity: 5 }
    ],
    craftMoney: 0,
    shopPrice: 200
  },
  {
    id: 'cork_bobber',
    name: '软木浮漂',
    description: '挣扎时成功率+25%。',
    maxDurability: 20,
    requiredRodTier: 'iron',
    struggleBonus: 0.25,
    craftCost: [
      { itemId: 'wood', quantity: 10 },
      { itemId: 'iron_ore', quantity: 2 }
    ],
    craftMoney: 0,
    shopPrice: 250
  },
  {
    id: 'quality_bobber',
    name: '品质浮漂',
    description: '钓到的鱼品质+1档。',
    maxDurability: 20,
    requiredRodTier: 'iron',
    qualityBoost: 1,
    craftCost: [
      { itemId: 'gold_ore', quantity: 2 },
      { itemId: 'copper_ore', quantity: 3 }
    ],
    craftMoney: 0,
    shopPrice: 500
  },
  {
    id: 'lead_bobber',
    name: '铅坠浮漂',
    description: '减少鱼猛冲和翻腾概率各10%。',
    maxDurability: 20,
    requiredRodTier: 'iron',
    dangerReduction: 0.1,
    craftCost: [
      { itemId: 'iron_ore', quantity: 5 },
      { itemId: 'wood', quantity: 3 }
    ],
    craftMoney: 0,
    shopPrice: 200
  }
]

const getProcessingInputSignature = (recipe: Pick<ProcessingRecipeDef, 'machineType' | 'inputItemId' | 'extraInputs'>): string => {
  const extras = (recipe.extraInputs ?? [])
    .map(extra => `${extra.itemId}:${extra.quantity}`)
    .sort()
    .join(',')
  return `${recipe.machineType}|${recipe.inputItemId ?? 'none'}|${extras}`
}

const _existingProcessingInputSignatures = new Set(PROCESSING_RECIPES.map(getProcessingInputSignature))

const hasHiddenText = (text: string, keywords: string[]) => keywords.some(keyword => text.includes(keyword))

const isFlowerLikeCrop = (crop: (typeof CROPS)[number], profile: CropUseProfile): boolean => {
  const text = `${crop.id} ${crop.name} ${crop.description}`
  return profile.flavor.includes('香') && hasHiddenText(text, ['flower', 'blossom', 'osmanthus', 'chrysanthemum', 'lotus', '花', '桂', '菊', '莲', '兰', '蕾', '芽'])
}

const isRootLikeCrop = (crop: (typeof CROPS)[number], profile: CropUseProfile): boolean => {
  const text = `${crop.id} ${crop.name} ${crop.description}`
  return profile.flavor.includes('土') || hasHiddenText(text, ['potato', 'yam', 'radish', 'root', '薯', '山药', '萝卜', '藕', '根'])
}

type HiddenInputEconomy = {
  value: number
  stamina: number
  health: number
}

type HiddenOutputTier = HiddenInputEconomy & {
  itemId: string
  edible: boolean
}

const HIDDEN_EXTRA_INPUT_ECONOMY: Record<string, HiddenInputEconomy> = {
  honey: { value: 100, stamina: 20, health: 10 },
  wood: { value: 5, stamina: 0, health: 0 }
}

const HIDDEN_OUTPUT_LABELS: Record<string, string> = {
  mixed_fruit_wine: '百果酒',
  seasonal_fruit_wine: '时令果酒',
  spirit_fruit_brew: '灵果清酿',
  mystic_fruit_wine: '玄果清酿',
  celestial_fruit_wine: '天成果酿',
  ancient_fruit_wine: '远古果酒',
  mixed_pickles: '百味腌菜',
  root_pickles: '根菜脆腌',
  fine_pickles: '锦味腌菜',
  spirit_pickles: '灵蔬脆腌',
  celestial_pickles: '天成腌珍',
  mixed_seed_oil: '杂籽油',
  refined_seed_oil: '精炼香油',
  artisan_seed_oil: '匠榨香油',
  spirit_seed_oil: '灵籽清油',
  celestial_seed_oil: '天成灵油',
  mixed_flour: '杂粮粉',
  fine_flour: '精磨粉',
  premium_flour: '锦磨粉',
  spirit_flour: '灵谷粉',
  celestial_flour: '天成细粉',
  medicinal_powder: '百草药粉',
  fine_medicinal_powder: '锦草药粉',
  spirit_medicinal_powder: '灵草药粉',
  celestial_medicinal_powder: '天成药粉',
  candied_fruit_mix: '百果蜜脯',
  fine_candied_fruit: '锦果蜜脯',
  spirit_candied_fruit: '灵果蜜脯',
  mystic_candied_fruit: '玄果蜜脯',
  celestial_candied_fruit: '天成果脯',
  wildflower_honey: '百花蜜',
  fine_wildflower_honey: '锦花蜜',
  spirit_wildflower_honey: '灵花蜜',
  celestial_wildflower_honey: '天成花蜜',
  dried_crop_bundle: '田园干货包',
  fine_dried_crop_bundle: '锦晒干货包',
  spirit_dried_crop_bundle: '灵晒干货包',
  celestial_dried_crop_bundle: '天成干货包',
  dried_fruit_mix: '什锦果干',
  fine_dried_fruit_mix: '锦果干',
  spirit_dried_fruit_mix: '灵果干',
  celestial_dried_fruit_mix: '天成果干',
  herbal_tea_blend: '草本调饮',
  fine_herbal_tea_blend: '锦草调饮',
  spirit_herbal_tea_blend: '灵草调饮',
  celestial_herbal_tea_blend: '天成调饮',
  mixed_tofu: '杂豆腐',
  firm_mixed_tofu: '锦豆腐',
  spirit_tofu: '灵豆腐',
  celestial_tofu: '天成豆腐',
  rustic_incense: '田园合香',
  refined_incense: '锦草合香',
  spirit_incense: '灵草合香',
  celestial_incense: '天成合香',
  smoked_fish: '烟熏鱼',
  smoked_prime_fish: '上选熏鱼',
  smoked_legendary_fish: '传说熏鱼'
}

const HIDDEN_WINE_TIERS: HiddenOutputTier[] = [
  { itemId: 'mixed_fruit_wine', value: 760, edible: true, stamina: 60, health: 30 },
  { itemId: 'seasonal_fruit_wine', value: 1800, edible: true, stamina: 120, health: 60 },
  { itemId: 'spirit_fruit_brew', value: 2400, edible: true, stamina: 160, health: 80 },
  { itemId: 'mystic_fruit_wine', value: 7600, edible: true, stamina: 420, health: 210 },
  { itemId: 'celestial_fruit_wine', value: 18500, edible: true, stamina: 720, health: 360 }
]

const HIDDEN_PICKLE_TIERS: HiddenOutputTier[] = [
  { itemId: 'mixed_pickles', value: 420, edible: true, stamina: 32, health: 16 },
  { itemId: 'root_pickles', value: 520, edible: true, stamina: 40, health: 20 },
  { itemId: 'fine_pickles', value: 1400, edible: true, stamina: 190, health: 95 },
  { itemId: 'spirit_pickles', value: 4200, edible: true, stamina: 560, health: 280 },
  { itemId: 'celestial_pickles', value: 6800, edible: true, stamina: 700, health: 350 }
]

const HIDDEN_OIL_TIERS: HiddenOutputTier[] = [
  { itemId: 'mixed_seed_oil', value: 320, edible: false, stamina: 0, health: 0 },
  { itemId: 'refined_seed_oil', value: 800, edible: false, stamina: 0, health: 0 },
  { itemId: 'artisan_seed_oil', value: 2400, edible: false, stamina: 0, health: 0 },
  { itemId: 'spirit_seed_oil', value: 5600, edible: false, stamina: 0, health: 0 },
  { itemId: 'celestial_seed_oil', value: 11000, edible: false, stamina: 0, health: 0 }
]

const HIDDEN_FLOUR_TIERS: HiddenOutputTier[] = [
  { itemId: 'mixed_flour', value: 240, edible: false, stamina: 0, health: 0 },
  { itemId: 'fine_flour', value: 720, edible: false, stamina: 0, health: 0 },
  { itemId: 'premium_flour', value: 2400, edible: false, stamina: 0, health: 0 },
  { itemId: 'spirit_flour', value: 5600, edible: false, stamina: 0, health: 0 },
  { itemId: 'celestial_flour', value: 11000, edible: false, stamina: 0, health: 0 }
]

const HIDDEN_MEDICINE_TIERS: HiddenOutputTier[] = [
  { itemId: 'medicinal_powder', value: 420, edible: false, stamina: 0, health: 0 },
  { itemId: 'fine_medicinal_powder', value: 1400, edible: false, stamina: 0, health: 0 },
  { itemId: 'spirit_medicinal_powder', value: 4200, edible: false, stamina: 0, health: 0 },
  { itemId: 'celestial_medicinal_powder', value: 7200, edible: false, stamina: 0, health: 0 }
]

const HIDDEN_SUGAR_TIERS: HiddenOutputTier[] = [
  { itemId: 'candied_fruit_mix', value: 700, edible: true, stamina: 90, health: 45 },
  { itemId: 'fine_candied_fruit', value: 1800, edible: true, stamina: 240, health: 120 },
  { itemId: 'spirit_candied_fruit', value: 5200, edible: true, stamina: 720, health: 360 },
  { itemId: 'mystic_candied_fruit', value: 10000, edible: true, stamina: 1250, health: 625 },
  { itemId: 'celestial_candied_fruit', value: 16000, edible: true, stamina: 1700, health: 850 }
]

const HIDDEN_HONEY_TIERS: HiddenOutputTier[] = [
  { itemId: 'wildflower_honey', value: 520, edible: true, stamina: 60, health: 30 },
  { itemId: 'fine_wildflower_honey', value: 1400, edible: true, stamina: 220, health: 110 },
  { itemId: 'spirit_wildflower_honey', value: 4200, edible: true, stamina: 560, health: 280 },
  { itemId: 'celestial_wildflower_honey', value: 7600, edible: true, stamina: 720, health: 360 }
]

const HIDDEN_DRY_TIERS: HiddenOutputTier[] = [
  { itemId: 'dried_crop_bundle', value: 320, edible: true, stamina: 45, health: 22 },
  { itemId: 'fine_dried_crop_bundle', value: 1200, edible: true, stamina: 180, health: 90 },
  { itemId: 'spirit_dried_crop_bundle', value: 3600, edible: true, stamina: 520, health: 260 },
  { itemId: 'celestial_dried_crop_bundle', value: 7800, edible: true, stamina: 820, health: 410 }
]

const HIDDEN_DEHYDRATE_TIERS: HiddenOutputTier[] = [
  { itemId: 'dried_fruit_mix', value: 520, edible: true, stamina: 70, health: 35 },
  { itemId: 'fine_dried_fruit_mix', value: 1400, edible: true, stamina: 220, health: 110 },
  { itemId: 'spirit_dried_fruit_mix', value: 4200, edible: true, stamina: 600, health: 300 },
  { itemId: 'celestial_dried_fruit_mix', value: 7800, edible: true, stamina: 820, health: 410 }
]

const HIDDEN_TEA_TIERS: HiddenOutputTier[] = [
  { itemId: 'herbal_tea_blend', value: 620, edible: true, stamina: 70, health: 35 },
  { itemId: 'fine_herbal_tea_blend', value: 1800, edible: true, stamina: 260, health: 130 },
  { itemId: 'spirit_herbal_tea_blend', value: 5600, edible: true, stamina: 760, health: 380 },
  { itemId: 'celestial_herbal_tea_blend', value: 15000, edible: true, stamina: 1700, health: 850 }
]

const HIDDEN_TOFU_TIERS: HiddenOutputTier[] = [
  { itemId: 'mixed_tofu', value: 520, edible: true, stamina: 45, health: 22 },
  { itemId: 'firm_mixed_tofu', value: 1800, edible: true, stamina: 280, health: 140 },
  { itemId: 'spirit_tofu', value: 6400, edible: true, stamina: 820, health: 410 },
  { itemId: 'celestial_tofu', value: 15000, edible: true, stamina: 1800, health: 900 }
]

const HIDDEN_INCENSE_TIERS: HiddenOutputTier[] = [
  { itemId: 'rustic_incense', value: 850, edible: false, stamina: 0, health: 0 },
  { itemId: 'refined_incense', value: 1800, edible: false, stamina: 0, health: 0 },
  { itemId: 'spirit_incense', value: 6200, edible: false, stamina: 0, health: 0 },
  { itemId: 'celestial_incense', value: 13000, edible: false, stamina: 0, health: 0 }
]

const HIDDEN_SMOKE_TIERS: HiddenOutputTier[] = [
  { itemId: 'smoked_fish', value: 180, edible: true, stamina: 24, health: 12 },
  { itemId: 'smoked_prime_fish', value: 620, edible: true, stamina: 50, health: 30 },
  { itemId: 'smoked_legendary_fish', value: 2600, edible: true, stamina: 180, health: 100 }
]

const getHiddenOutputLabel = (itemId: string): string => HIDDEN_OUTPUT_LABELS[itemId] ?? itemId

const addHiddenEconomy = (base: HiddenInputEconomy, extra: HiddenInputEconomy): HiddenInputEconomy => ({
  value: base.value + extra.value,
  stamina: base.stamina + extra.stamina,
  health: base.health + extra.health
})

const multiplyHiddenEconomy = (economy: HiddenInputEconomy, quantity: number): HiddenInputEconomy => ({
  value: economy.value * quantity,
  stamina: economy.stamina * quantity,
  health: economy.health * quantity
})

const getCropHiddenEconomy = (crop: (typeof CROPS)[number], quantity: number): HiddenInputEconomy => multiplyHiddenEconomy({
  value: Math.floor(crop.sellPrice * 1.5),
  stamina: Math.floor(crop.sellPrice / 5),
  health: Math.floor(crop.sellPrice / 10)
}, quantity)

const getFruitTreeHiddenEconomy = (fruitTree: (typeof FRUIT_TREE_DEFS)[number], quantity: number): HiddenInputEconomy => multiplyHiddenEconomy({
  value: Math.floor(fruitTree.fruitSellPrice * 1.5),
  stamina: Math.floor(fruitTree.fruitSellPrice / 5),
  health: Math.floor(fruitTree.fruitSellPrice / 10)
}, quantity)

const getFishHiddenEconomy = (fish: (typeof FISH)[number], quantity: number): HiddenInputEconomy => multiplyHiddenEconomy({
  value: Math.floor(fish.sellPrice * 1.5),
  stamina: Math.floor(fish.sellPrice / 5),
  health: Math.floor(fish.sellPrice / 8)
}, quantity)

const withHiddenExtraInputs = (
  base: HiddenInputEconomy,
  extraInputs: NonNullable<ProcessingRecipeDef['extraInputs']> = []
): HiddenInputEconomy => extraInputs.reduce((total, extra) => {
  const economy = HIDDEN_EXTRA_INPUT_ECONOMY[extra.itemId]
  return economy ? addHiddenEconomy(total, multiplyHiddenEconomy(economy, extra.quantity)) : total
}, base)

const getHiddenProcessingValueMultiplier = (machineType: ProcessingRecipeDef['machineType'], processingDays: number): number => {
  if (machineType === 'wine_workshop') return 3 + Math.max(0, processingDays - 3) * 0.5
  if (machineType === 'smoker') return 2
  if (machineType === 'oil_press' || machineType === 'mill' || machineType === 'herb_grinder' || machineType === 'tofu_press') return 1.1
  if (machineType === 'bee_house') return 1.5
  return 1.25
}

const getHiddenRequiredOutputEconomy = (
  machineType: ProcessingRecipeDef['machineType'],
  inputEconomy: HiddenInputEconomy,
  processingDays: number
): HiddenInputEconomy => ({
  value: Math.ceil(inputEconomy.value * getHiddenProcessingValueMultiplier(machineType, processingDays)),
  stamina: inputEconomy.stamina,
  health: inputEconomy.health
})

const hiddenTierMeets = (tier: HiddenOutputTier, required: HiddenInputEconomy): boolean => {
  if (tier.value < required.value) return false
  if (!tier.edible) return true
  return tier.stamina >= required.stamina && tier.health >= required.health
}

const chooseHiddenOutputTier = (
  tiers: HiddenOutputTier[],
  required: HiddenInputEconomy,
  preferredItemId?: string
): string => {
  const preferredTier = preferredItemId ? tiers.find(tier => tier.itemId === preferredItemId) : undefined
  if (preferredTier && hiddenTierMeets(preferredTier, required)) return preferredTier.itemId
  const fallbackTier = tiers[tiers.length - 1]
  if (!fallbackTier) throw new Error('隐藏加工产物档位不能为空')
  return tiers.find(tier => hiddenTierMeets(tier, required))?.itemId ?? fallbackTier.itemId
}

const getHiddenTieredOutput = (
  machineType: ProcessingRecipeDef['machineType'],
  tiers: HiddenOutputTier[],
  inputEconomy: HiddenInputEconomy,
  processingDays: number,
  preferredItemId?: string
): string => chooseHiddenOutputTier(tiers, getHiddenRequiredOutputEconomy(machineType, inputEconomy, processingDays), preferredItemId)

const getHiddenWineOutput = (
  cropId: string,
  profile: CropUseProfile,
  inputEconomy: HiddenInputEconomy,
  processingDays: number
): string => {
  if (cropId === 'ancient_fruit') return 'ancient_fruit_wine'
  const preferredItemId = profile.spirituality === 'mystic' || profile.spirituality === 'spirit'
    ? 'spirit_fruit_brew'
    : profile.rarityUse === 'valuable' || profile.rarityUse === 'seasonal'
      ? 'seasonal_fruit_wine'
      : 'mixed_fruit_wine'
  return getHiddenTieredOutput('wine_workshop', HIDDEN_WINE_TIERS, inputEconomy, processingDays, preferredItemId)
}

const getUnknownProcessingName = (machineType: ProcessingRecipeDef['machineType']): string => {
  switch (machineType) {
    case 'wine_workshop':
      return '未知酿造'
    case 'sauce_jar':
      return '未知腌制'
    case 'oil_press':
      return '未知压榨'
    case 'mill':
      return '未知研磨'
    case 'herb_grinder':
      return '未知药粉'
    case 'drying_rack':
    case 'dehydrator':
      return '未知风干'
    case 'bee_house':
      return '未知花蜜'
    case 'sugar_jar':
      return '未知糖渍'
    case 'smoker':
      return '未知烟熏'
    case 'tea_maker':
      return '未知调饮'
    case 'tofu_press':
      return '未知豆制'
    case 'incense_maker':
      return '未知合香'
    default:
      return '未知加工'
  }
}

const pushHiddenProcessingRecipe = (recipes: ProcessingRecipeDef[], recipe: ProcessingRecipeDef) => {
  const signature = getProcessingInputSignature(recipe)
  if (_existingProcessingInputSignatures.has(signature)) return
  _existingProcessingInputSignatures.add(signature)
  recipes.push(recipe)
}

const buildHiddenProcessingRecipe = (
  recipe: Omit<ProcessingRecipeDef, 'visibility' | 'hiddenMeta'> & {
    familyId: string
    unknownName?: string
    gate?: NonNullable<ProcessingRecipeDef['hiddenMeta']>['gate']
    sharedEnabled?: boolean
  }
): ProcessingRecipeDef => {
  const { familyId, unknownName, gate, sharedEnabled, ...base } = recipe
  return {
    ...base,
    visibility: 'hidden',
    hiddenMeta: {
      unknownName: unknownName ?? getUnknownProcessingName(base.machineType),
      familyId,
      gate,
      revealOn: 'collect',
      sharedEnabled
    }
  }
}

const buildHiddenCropProcessingRecipes = (): ProcessingRecipeDef[] => {
  const recipes: ProcessingRecipeDef[] = []

  for (const crop of CROPS) {
    const profile = getCropUseProfile(crop.id)
    if (!profile) continue
    const inputQuantity = profile.rarityUse === 'valuable' ? 1 : 2
    const title = crop.name

    if (profile.tags.includes('wine')) {
      const wineInputQuantity = crop.id === 'ancient_fruit' ? 1 : inputQuantity
      const wineProcessingDays = crop.id === 'ancient_fruit' ? 5 : profile.rarityUse === 'valuable' ? 4 : 3
      const outputItemId = getHiddenWineOutput(crop.id, profile, getCropHiddenEconomy(crop, wineInputQuantity), wineProcessingDays)
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: crop.id === 'ancient_fruit' ? 'hidden_wine_ancient_fruit' : `hidden_wine_${crop.id}`,
        machineType: 'wine_workshop',
        name: crop.id === 'ancient_fruit' ? '远古果酒' : `${title}试酿`,
        inputItemId: crop.id,
        inputQuantity: wineInputQuantity,
        outputItemId,
        outputQuantity: 1,
        processingDays: wineProcessingDays,
        description: crop.id === 'ancient_fruit'
          ? '远古水果在酒坊中慢慢沉成幽蓝酒液，首次成功后会记入隐藏酿造配方。'
          : `将${title}投入酒坊试酿，成功后可固定作为${getHiddenOutputLabel(outputItemId)}配方使用。`,
        familyId: 'hidden_wine',
        gate: crop.id === 'ancient_fruit' ? { workshopLevel: 2, requiredItemId: 'ancient_fruit' } : undefined,
        sharedEnabled: true
      }))
    }

    if (profile.tags.includes('pickle')) {
      const outputItemId = getHiddenTieredOutput(
        'sauce_jar',
        HIDDEN_PICKLE_TIERS,
        getCropHiddenEconomy(crop, inputQuantity),
        2,
        isRootLikeCrop(crop, profile) ? 'root_pickles' : 'mixed_pickles'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_pickle_${crop.id}`,
        machineType: 'sauce_jar',
        name: `${title}试腌`,
        inputItemId: crop.id,
        inputQuantity,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}投入酱缸试腌，成功后会固定为${getHiddenOutputLabel(outputItemId)}配方。`,
        familyId: 'hidden_pickle',
        sharedEnabled: true
      }))
    }

    if (profile.tags.includes('oil')) {
      const oilInputQuantity = profile.rarityUse === 'valuable' ? 2 : 3
      const outputItemId = getHiddenTieredOutput(
        'oil_press',
        HIDDEN_OIL_TIERS,
        getCropHiddenEconomy(crop, oilInputQuantity),
        1,
        profile.rarityUse === 'valuable' ? 'refined_seed_oil' : 'mixed_seed_oil'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_oil_${crop.id}`,
        machineType: 'oil_press',
        name: `${title}试榨`,
        inputItemId: crop.id,
        inputQuantity: oilInputQuantity,
        outputItemId,
        outputQuantity: 1,
        processingDays: 1,
        description: `将${title}投入油坊试榨，得到${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_oil',
        sharedEnabled: true
      }))
    }

    if (profile.tags.includes('flour')) {
      const outputItemId = getHiddenTieredOutput(
        'mill',
        HIDDEN_FLOUR_TIERS,
        getCropHiddenEconomy(crop, 2),
        1,
        profile.rarityUse === 'valuable' || profile.rarityUse === 'seasonal' ? 'fine_flour' : 'mixed_flour'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_flour_${crop.id}`,
        machineType: 'mill',
        name: `${title}试磨`,
        inputItemId: crop.id,
        inputQuantity: 2,
        outputItemId,
        outputQuantity: 1,
        processingDays: 1,
        description: `将${title}投入石磨试磨，成功后成为${getHiddenOutputLabel(outputItemId)}配方。`,
        familyId: 'hidden_flour',
        sharedEnabled: true
      }))
    }

    if (profile.tags.includes('medicine')) {
      const medicineInputQuantity = profile.rarityUse === 'valuable' ? 1 : 2
      const outputItemId = getHiddenTieredOutput(
        'herb_grinder',
        HIDDEN_MEDICINE_TIERS,
        getCropHiddenEconomy(crop, medicineInputQuantity),
        1,
        'medicinal_powder'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_medicine_${crop.id}`,
        machineType: 'herb_grinder',
        name: `${title}试研`,
        inputItemId: crop.id,
        inputQuantity: medicineInputQuantity,
        outputItemId,
        outputQuantity: 1,
        processingDays: 1,
        description: `将${title}投入药碾试研，转成${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_medicine',
        sharedEnabled: true
      }))
    }

    if (profile.flavor.includes('甜') && (profile.tags.includes('gift') || profile.tags.includes('pet_feed') || profile.tags.includes('festival'))) {
      const sugarExtraInputs = [{ itemId: 'honey', quantity: 1 }]
      const outputItemId = getHiddenTieredOutput(
        'sugar_jar',
        HIDDEN_SUGAR_TIERS,
        withHiddenExtraInputs(getCropHiddenEconomy(crop, 2), sugarExtraInputs),
        2,
        'candied_fruit_mix'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_sugar_${crop.id}`,
        machineType: 'sugar_jar',
        name: `${title}试渍`,
        inputItemId: crop.id,
        inputQuantity: 2,
        extraInputs: sugarExtraInputs,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}与蜂蜜慢渍，试出${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_sugar',
        sharedEnabled: true
      }))
    }

    if (isFlowerLikeCrop(crop, profile)) {
      const outputItemId = getHiddenTieredOutput(
        'bee_house',
        HIDDEN_HONEY_TIERS,
        getCropHiddenEconomy(crop, 1),
        4,
        'wildflower_honey'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_honey_${crop.id}`,
        machineType: 'bee_house',
        name: `${title}花蜜`,
        inputItemId: crop.id,
        inputQuantity: 1,
        outputItemId,
        outputQuantity: 1,
        processingDays: 4,
        description: `在蜂箱旁放置${title}，试出可稳定复现的${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_honey',
        sharedEnabled: true
      }))
    }

    if (profile.tags.includes('food') || profile.tags.includes('medicine')) {
      const outputItemId = getHiddenTieredOutput(
        'drying_rack',
        HIDDEN_DRY_TIERS,
        getCropHiddenEconomy(crop, 1),
        2,
        'dried_crop_bundle'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_dry_${crop.id}`,
        machineType: 'drying_rack',
        name: `${title}试晒`,
        inputItemId: crop.id,
        inputQuantity: 1,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}放上晒架试晒，转成${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_dry',
        sharedEnabled: true
      }))
    }

    if (profile.flavor.includes('甜')) {
      const outputItemId = getHiddenTieredOutput(
        'dehydrator',
        HIDDEN_DEHYDRATE_TIERS,
        getCropHiddenEconomy(crop, 1),
        2,
        'dried_fruit_mix'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_dehydrate_${crop.id}`,
        machineType: 'dehydrator',
        name: `${title}试脱水`,
        inputItemId: crop.id,
        inputQuantity: 1,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}放入脱水机试制，得到${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_dehydrate',
        sharedEnabled: true
      }))
    }

    if (profile.flavor.includes('香') || profile.flavor.includes('苦') || profile.tags.includes('medicine')) {
      const outputItemId = getHiddenTieredOutput(
        'tea_maker',
        HIDDEN_TEA_TIERS,
        getCropHiddenEconomy(crop, 2),
        2,
        'herbal_tea_blend'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_tea_${crop.id}`,
        machineType: 'tea_maker',
        name: `${title}调饮`,
        inputItemId: crop.id,
        inputQuantity: 2,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}放入制茶机试调，得到${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_tea',
        sharedEnabled: true
      }))
    }

    if (hasHiddenText(`${crop.id} ${crop.name}`, ['bean', '豆'])) {
      const outputItemId = getHiddenTieredOutput(
        'tofu_press',
        HIDDEN_TOFU_TIERS,
        getCropHiddenEconomy(crop, 3),
        1,
        'mixed_tofu'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_tofu_${crop.id}`,
        machineType: 'tofu_press',
        name: `${title}试压`,
        inputItemId: crop.id,
        inputQuantity: 3,
        outputItemId,
        outputQuantity: 1,
        processingDays: 1,
        description: `将${title}投入豆腐坊试压，得到${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_tofu',
        sharedEnabled: true
      }))
    }

    if (profile.flavor.includes('香') && (profile.tags.includes('gift') || profile.tags.includes('medicine') || profile.tags.includes('festival'))) {
      const outputItemId = getHiddenTieredOutput(
        'incense_maker',
        HIDDEN_INCENSE_TIERS,
        getCropHiddenEconomy(crop, 2),
        2,
        'rustic_incense'
      )
      pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
        id: `hidden_incense_${crop.id}`,
        machineType: 'incense_maker',
        name: `${title}试香`,
        inputItemId: crop.id,
        inputQuantity: 2,
        outputItemId,
        outputQuantity: 1,
        processingDays: 2,
        description: `将${title}送入制香坊试配，得到${getHiddenOutputLabel(outputItemId)}。`,
        familyId: 'hidden_incense',
        sharedEnabled: true
      }))
    }
  }

  for (const fruitTree of FRUIT_TREE_DEFS) {
    const wineOutputItemId = getHiddenTieredOutput(
      'wine_workshop',
      HIDDEN_WINE_TIERS,
      getFruitTreeHiddenEconomy(fruitTree, 2),
      3,
      'seasonal_fruit_wine'
    )
    pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
      id: `hidden_tree_wine_${fruitTree.fruitId}`,
      machineType: 'wine_workshop',
      name: `${fruitTree.fruitName}试酿`,
      inputItemId: fruitTree.fruitId,
      inputQuantity: 2,
      outputItemId: wineOutputItemId,
      outputQuantity: 1,
      processingDays: 3,
      description: `将${fruitTree.fruitName}投入酒坊试酿，得到${getHiddenOutputLabel(wineOutputItemId)}。`,
      familyId: 'hidden_wine',
      sharedEnabled: true
    }))
    const dehydrateOutputItemId = getHiddenTieredOutput(
      'dehydrator',
      HIDDEN_DEHYDRATE_TIERS,
      getFruitTreeHiddenEconomy(fruitTree, 1),
      2,
      'dried_fruit_mix'
    )
    pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
      id: `hidden_tree_dehydrate_${fruitTree.fruitId}`,
      machineType: 'dehydrator',
      name: `${fruitTree.fruitName}试脱水`,
      inputItemId: fruitTree.fruitId,
      inputQuantity: 1,
      outputItemId: dehydrateOutputItemId,
      outputQuantity: 1,
      processingDays: 2,
      description: `将${fruitTree.fruitName}放入脱水机试制，得到${getHiddenOutputLabel(dehydrateOutputItemId)}。`,
      familyId: 'hidden_dehydrate',
      sharedEnabled: true
    }))
  }

  for (const fish of FISH) {
    const smokeExtraInputs = [{ itemId: 'wood', quantity: 1 }]
    const outputItemId = getHiddenTieredOutput(
      'smoker',
      HIDDEN_SMOKE_TIERS,
      withHiddenExtraInputs(getFishHiddenEconomy(fish, 1), smokeExtraInputs),
      1,
      fish.difficulty === 'legendary' ? 'smoked_legendary_fish' : fish.difficulty === 'hard' ? 'smoked_prime_fish' : 'smoked_fish'
    )
    pushHiddenProcessingRecipe(recipes, buildHiddenProcessingRecipe({
      id: `hidden_smoke_${fish.id}`,
      machineType: 'smoker',
      name: `${fish.name}试熏`,
      inputItemId: fish.id,
      inputQuantity: 1,
      extraInputs: smokeExtraInputs,
      outputItemId,
      outputQuantity: 1,
      processingDays: 1,
      description: `将${fish.name}放入烟熏机试制，成功后固定为${getHiddenOutputLabel(outputItemId)}配方。`,
      familyId: 'hidden_smoke',
      sharedEnabled: true
    }))
  }

  return recipes
}

PROCESSING_RECIPES.push(...buildHiddenCropProcessingRecipes())

// 为所有尚无种子制造机配方的作物自动生成配方
const _existingSeedMakerInputs = new Set(
  PROCESSING_RECIPES.filter(r => r.machineType === 'seed_maker').map(r => r.inputItemId)
)
const _autoSeedRecipes: ProcessingRecipeDef[] = CROPS
  .filter(crop => !_existingSeedMakerInputs.has(crop.id))
  .map(crop => ({
    id: `seed_from_${crop.id}`,
    machineType: 'seed_maker' as const,
    name: `${crop.name}种子`,
    inputItemId: crop.id,
    inputQuantity: 1,
    outputItemId: crop.seedId,
    outputQuantity: crop.id === 'ancient_fruit' ? 1 : 2,
    processingDays: 1,
    description: `从${crop.name}中提取种子。`
  }))
PROCESSING_RECIPES.push(..._autoSeedRecipes)

export const getMachineById = (id: string): ProcessingMachineDef | undefined => {
  return PROCESSING_MACHINES.find(m => m.id === id)
}

export const getProcessingRecipeById = (id: string): ProcessingRecipeDef | undefined => {
  return PROCESSING_RECIPES.find(r => r.id === id)
}

export const getAlchemyRecipeByOutputItemId = (itemId: string): ProcessingRecipeDef | undefined => {
  return PROCESSING_RECIPES.find(r => r.outputItemId === itemId && !!r.alchemy)
}

export const getRecipesForMachine = (machineType: string): ProcessingRecipeDef[] => {
  return PROCESSING_RECIPES.filter(r => r.machineType === machineType)
}

export const getSprinklerById = (id: string): SprinklerDef | undefined => {
  return SPRINKLERS.find(s => s.id === id)
}

export const getFertilizerById = (id: string): FertilizerDef | undefined => {
  return FERTILIZERS.find(f => f.id === id)
}

export const getBaitById = (id: string): BaitDef | undefined => {
  return BAITS.find(b => b.id === id)
}

export const getTackleById = (id: string): TackleDef | undefined => {
  return TACKLES.find(t => t.id === id)
}

/** 采脂器制造定义 */
export const TAPPER = {
  id: 'tapper',
  name: '采脂器',
  description: '安装到成熟野树上，定期产出树脂。',
  craftCost: [
    { itemId: 'copper_ore', quantity: 5 },
    { itemId: 'wood', quantity: 10 }
  ],
  craftMoney: 200
}

/** 蟹笼制造定义 */
export const CRAB_POT_CRAFT = {
  id: 'crab_pot',
  name: '蟹笼',
  description: '放置在钓鱼地点，每日自动捕获水产（需鱼饵）。',
  craftCost: [
    { itemId: 'wood', quantity: 15 },
    { itemId: 'iron_bar', quantity: 2 }
  ],
  craftMoney: 500
}

/** 避雷针制造定义 */
export const LIGHTNING_ROD = {
  id: 'lightning_rod',
  name: '避雷针',
  description: '放置在农场，雷暴时吸收闪电保护作物，产出电池组。',
  craftCost: [
    { itemId: 'iron_ore', quantity: 5 },
    { itemId: 'copper_ore', quantity: 3 },
    { itemId: 'quartz', quantity: 1 }
  ],
  craftMoney: 300
}

/** 稻草人制造定义 */
export const SCARECROW = {
  id: 'scarecrow',
  name: '稻草人',
  description: '放置在农场，驱赶偷吃作物的乌鸦。',
  craftCost: [
    { itemId: 'wood', quantity: 20 },
    { itemId: 'bamboo', quantity: 5 },
    { itemId: 'firewood', quantity: 5 }
  ],
  craftMoney: 150
}

export const AUTO_PETTER = {
  id: 'auto_petter',
  name: '自动抚摸机',
  description: '安装到畜舍后，每天自动抚摸所有动物。需要大型畜舍（2级）。',
  craftCost: [
    { itemId: 'gold_bar', quantity: 10 },
    { itemId: 'iron_bar', quantity: 20 },
    { itemId: 'copper_bar', quantity: 20 }
  ],
  craftMoney: 5000
}

/** 炸弹定义 */
export const BOMBS: BombDef[] = [
  {
    id: 'cherry_bomb',
    name: '爆竹',
    description: '小范围爆破，一次获取3份矿石。',
    oreMultiplier: 3,
    clearsMonster: false,
    craftCost: [
      { itemId: 'copper_ore', quantity: 12 },
      { itemId: 'firewood', quantity: 15 }
    ],
    craftMoney: 100,
    shopPrice: null
  },
  {
    id: 'bomb',
    name: '火药包',
    description: '大范围爆破，获取5份矿石并清除怪物。',
    oreMultiplier: 5,
    clearsMonster: true,
    craftCost: [
      { itemId: 'iron_ore', quantity: 12 },
      { itemId: 'firewood', quantity: 18 },
      { itemId: 'quartz', quantity: 5 }
    ],
    craftMoney: 250,
    shopPrice: null
  },
  {
    id: 'mega_bomb',
    name: '雷火弹',
    description: '超大范围爆破，获取8份矿石并清除怪物。',
    oreMultiplier: 8,
    clearsMonster: true,
    craftCost: [
      { itemId: 'gold_ore', quantity: 18 },
      { itemId: 'iron_ore', quantity: 15 },
      { itemId: 'firewood', quantity: 25 },
      { itemId: 'ruby', quantity: 3 }
    ],
    craftMoney: 500,
    shopPrice: null
  }
]

export const getBombById = (id: string): BombDef | undefined => {
  return BOMBS.find(b => b.id === id)
}
