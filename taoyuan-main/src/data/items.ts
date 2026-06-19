import type { ItemDef, ItemCategory } from '@/types/item'
import { CROPS } from './crops'
import { FISH } from './fish'
import { RECIPES } from './recipes'
import { PROCESSING_MACHINES, SPRINKLERS, FERTILIZERS, BAITS, TACKLES, BOMBS } from './processing'
import { FRUIT_TREE_DEFS } from './fruitTrees'
import { WEAPONS, getWeaponSellPrice } from './weapons'
import { RINGS } from './rings'
import { HATS } from './hats'
import { SHOES } from './shoes'

const MARKET_REGROWTH_RAW_CROP_RECOVERY_CAP = {
  staminaRestore: 14,
  healthRestore: 5
} as const

const getRawCropRecovery = (crop: (typeof CROPS)[number]) => {
  const baseRecovery = {
    staminaRestore: Math.floor(crop.sellPrice / 5),
    healthRestore: Math.floor(crop.sellPrice / 10)
  }

  if (!crop.regrowth || (crop.seedPrice <= 0 && crop.id !== 'ancient_fruit')) return baseRecovery

  return {
    staminaRestore: Math.min(baseRecovery.staminaRestore, MARKET_REGROWTH_RAW_CROP_RECOVERY_CAP.staminaRestore),
    healthRestore: Math.min(baseRecovery.healthRestore, MARKET_REGROWTH_RAW_CROP_RECOVERY_CAP.healthRestore)
  }
}

/** 从作物定义自动生成种子物品（排除已手动定义的种子） */
const SEED_ITEMS: ItemDef[] = CROPS.filter(
  crop => crop.seedId !== 'ancient_seed' && crop.seedId !== 'hanhai_cactus_seed' && crop.seedId !== 'hanhai_date_seed'
).map(crop => ({
  id: crop.seedId,
  name: `${crop.name}种子`,
  category: 'seed',
  description: `${crop.name}的种子，${crop.season
    .map(s => {
      const names: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }
      return names[s]
    })
    .join('/')}季可种植。`,
  sellPrice: Math.floor(crop.seedPrice / 2),
  edible: false
}))

/** 从作物定义自动生成收获物品 */
const CROP_ITEMS: ItemDef[] = CROPS.map(crop => {
  const recovery = getRawCropRecovery(crop)

  return {
    id: crop.id,
    name: crop.name,
    category: 'crop',
    description: crop.description,
    sellPrice: Math.floor(crop.sellPrice * 1.5),
    edible: true,
    staminaRestore: recovery.staminaRestore,
    healthRestore: recovery.healthRestore
  }
})

/** 矿石物品 */
const ORE_ITEMS: ItemDef[] = [
  { id: 'copper_ore', name: '铜矿', category: 'ore', description: '常见的金属矿石。', sellPrice: 5, edible: false },
  { id: 'iron_ore', name: '铁矿', category: 'ore', description: '坚硬的铁矿石。', sellPrice: 10, edible: false },
  { id: 'gold_ore', name: '金矿', category: 'ore', description: '珍贵的金矿石。', sellPrice: 18, edible: false },
  { id: 'crystal_ore', name: '水晶矿', category: 'ore', description: '折射光芒的水晶矿石。', sellPrice: 30, edible: false },
  { id: 'shadow_ore', name: '暗影矿', category: 'ore', description: '沉重漆黑的神秘矿石。', sellPrice: 45, edible: false },
  { id: 'void_ore', name: '虚空矿', category: 'ore', description: '来自深渊尽头的矿石。', sellPrice: 60, edible: false },
  { id: 'iridium_ore', name: '铱矿', category: 'ore', description: '最坚硬稀有的金属矿石。', sellPrice: 80, edible: false },
  { id: 'quartz', name: '石英', category: 'gem', description: '晶莹剔透的石英。', sellPrice: 10, edible: false },
  { id: 'jade', name: '翡翠', category: 'gem', description: '温润的翡翠。', sellPrice: 30, edible: false },
  { id: 'ruby', name: '红宝石', category: 'gem', description: '光芒四射的红宝石。', sellPrice: 45, edible: false },
  { id: 'moonstone', name: '月光石', category: 'gem', description: '散发柔和光辉的宝石。', sellPrice: 65, edible: false },
  { id: 'obsidian', name: '黑曜石', category: 'gem', description: '暗如深渊的火山玻璃。', sellPrice: 90, edible: false },
  { id: 'dragon_jade', name: '龙玉', category: 'gem', description: '传说中龙脉凝聚的神玉。', sellPrice: 120, edible: false },
  { id: 'prismatic_shard', name: '五彩碎片', category: 'gem', description: '蕴含远古能量的碎片。', sellPrice: 180, edible: false },
  { id: 'battery', name: '电池组', category: 'material', description: '避雷针吸收雷电后产出的能量。', sellPrice: 100, edible: false }
]

/** 杂项 */
const MISC_ITEMS: ItemDef[] = [
  { id: 'wood', name: '木材', category: 'material', description: '建造和制作的基础材料。', sellPrice: 5, edible: false },
  { id: 'stone', name: '石材', category: 'material', description: '常见的建筑石料，可用于建造、加工与委托。', sellPrice: 3, edible: false },
  { id: 'bamboo', name: '竹子', category: 'material', description: '竹林中采集的翠竹。', sellPrice: 10, edible: false },
  { id: 'paper', name: '纸张', category: 'material', description: '用于记账、抄写与文书整理的基础纸张。', sellPrice: 18, edible: false },
  { id: 'manor_edge_bundle', name: '庄园边角作物包', category: 'material', description: '好友照料庄园时整理出的少量边角作物，可留作公共订单、宠物点心或节会备料。', sellPrice: 8, edible: false },
  { id: 'herb', name: '草药', category: 'material', description: '山间野生的草药。', sellPrice: 15, edible: false },
  { id: 'firewood', name: '柴火', category: 'material', description: '烹饪用的燃料。', sellPrice: 5, edible: false },
  { id: 'wild_meat', name: '野兽肉块', category: 'material', description: '竹林中惊走野兽或牧场动物取肉后得到的肉块，可用于需要荤香的料理。', sellPrice: 35, edible: false },
  {
    id: 'winter_bamboo_shoot',
    name: '冬笋',
    category: 'misc',
    description: '冬季特有的鲜嫩竹笋。',
    sellPrice: 40,
    edible: true,
    staminaRestore: 8,
    healthRestore: 3
  },
  { id: 'wintersweet', name: '腊梅', category: 'gift', description: '寒冬中绽放的腊梅，送礼佳品。', sellPrice: 50, edible: false },
  {
    id: 'wild_mushroom',
    name: '野蘑菇',
    category: 'misc',
    description: '秋天的山林中采到的蘑菇。',
    sellPrice: 30,
    edible: true,
    staminaRestore: 5,
    healthRestore: 2
  },
  {
    id: 'skull_mushroom',
    name: '幽骨菇',
    category: 'misc',
    description: '骷髅矿穴阴冷裂缝里生出的发光菌菇。',
    sellPrice: 120,
    edible: true,
    staminaRestore: 14,
    healthRestore: 6
  },
  { id: 'ginseng', name: '人参', category: 'misc', description: '极其珍贵的野生人参。', sellPrice: 200, edible: false },
  {
    id: 'wild_berry',
    name: '野果',
    category: 'misc',
    description: '夏天山间的甜美野果。',
    sellPrice: 20,
    edible: true,
    staminaRestore: 5,
    healthRestore: 2
  },
  { id: 'pine_cone', name: '松果', category: 'material', description: '松树上掉落的果实。', sellPrice: 10, edible: false },
  { id: 'jade_ring', name: '翡翠戒指', category: 'gift', description: '精心打磨的翡翠戒指，可以用来求婚。', sellPrice: 500, edible: false },
  {
    id: 'silk_ribbon',
    name: '丝帕',
    category: 'gift',
    description: '精心绣制的丝帕，用来向心仪之人表达心意。',
    sellPrice: 200,
    edible: false
  },
  {
    id: 'zhiji_jade',
    name: '知己玉佩',
    category: 'gift',
    description: '一对精心雕琢的玉佩，赠予同性挚友可结为知己。',
    sellPrice: 300,
    edible: false
  },
  { id: 'scarecrow', name: '稻草人', category: 'machine', description: '放置在农场，驱赶偷吃作物的乌鸦。', sellPrice: 75, edible: false },
  { id: 'rain_totem', name: '雨图腾', category: 'misc', description: '使用后可以让明天下雨。', sellPrice: 30, edible: false },
  {
    id: 'fish_feed',
    name: '鱼饲料',
    category: 'material',
    description: '鱼塘专用饲料，维持鱼塘水质和鱼的健康。',
    sellPrice: 10,
    edible: false
  },
  {
    id: 'ornamental_feed',
    name: '观赏饲料',
    category: 'material',
    description: '专为高评分样鱼调配的饲料，可短时提升观赏状态与周赛表现。',
    sellPrice: 35,
    edible: false
  },
  {
    id: 'water_purifier',
    name: '水质改良剂',
    category: 'material',
    description: '改善鱼塘水质，降低鱼生病概率。',
    sellPrice: 50,
    edible: false
  },
  {
    id: 'advanced_water_purifier',
    name: '高级净水剂',
    category: 'material',
    description: '用于高阶鱼塘养护的净水剂，可额外提供隔离与稳定效果。',
    sellPrice: 120,
    edible: false
  },
  {
    id: 'preservation_seal',
    name: '保鲜封签',
    category: 'material',
    description: '高价值作物储运时使用的封签，可降低跨周供货中的损耗感。',
    sellPrice: 45,
    edible: false
  },
  {
    id: 'breeding_residue',
    name: '育种残留',
    category: 'material',
    description: '高代育种失败后回收出的残留材料，可继续用于研究和储运补材。',
    sellPrice: 18,
    edible: false
  },
  {
    id: 'lineage_certificate_tag',
    name: '谱系认证签',
    category: 'material',
    description: '从高阶失败样本中拆解出的认证补材，可用于精品供货与陈列复核。',
    sellPrice: 28,
    edible: false
  }
]

/** 从鱼定义自动生成鱼物品 */
const FISH_ITEMS: ItemDef[] = FISH.map(fish => ({
  id: fish.id,
  name: fish.name,
  category: 'fish' as const,
  description: fish.description,
  sellPrice: Math.floor(fish.sellPrice * 1.5),
  edible: true,
  staminaRestore: Math.floor(fish.sellPrice / 5),
  healthRestore: Math.floor(fish.sellPrice / 8)
}))

/** 从食谱定义自动生成烹饪物品 */
const _preFoodItems: ItemDef[] = [...SEED_ITEMS, ...CROP_ITEMS, ...ORE_ITEMS, ...MISC_ITEMS, ...FISH_ITEMS]
const FOOD_ITEMS: ItemDef[] = RECIPES.map(recipe => {
  const baseSellPrice = Math.floor(recipe.effect.staminaRestore * 2)
  // 计算材料总售价，保底：食物售价不低于材料总售价的1.2倍
  const ingredientTotal = recipe.ingredients.reduce((sum, ing) => {
    const def = _preFoodItems.find(i => i.id === ing.itemId)
    return sum + (def?.sellPrice ?? 0) * ing.quantity
  }, 0)
  const sellPrice = Math.max(baseSellPrice, Math.floor(ingredientTotal * 1.2))
  return {
    id: `food_${recipe.id}`,
    name: recipe.name,
    category: 'food' as const,
    description: recipe.description,
    sellPrice,
    edible: true,
    staminaRestore: recipe.effect.staminaRestore,
    healthRestore: recipe.effect.healthRestore ?? Math.floor(recipe.effect.staminaRestore * 0.4)
  }
})

/** 加工品物品 */
const PROCESSED_ITEMS: ItemDef[] = [
  {
    id: 'watermelon_wine',
    name: '西瓜酒',
    category: 'processed',
    description: '甘甜的西瓜酿成的佳酿。',
    sellPrice: 600,
    edible: true,
    staminaRestore: 40,
    healthRestore: 20
  },
  {
    id: 'osmanthus_wine',
    name: '桂花酿',
    category: 'processed',
    description: '馥郁芬芳的桂花酒。',
    sellPrice: 900,
    edible: true,
    staminaRestore: 50,
    healthRestore: 25
  },
  { id: 'rice_vinegar', name: '米醋', category: 'processed', description: '家酿老陈醋。', sellPrice: 360, edible: false },
  {
    id: 'pickled_cabbage',
    name: '腌白菜',
    category: 'processed',
    description: '开胃的腌白菜。',
    sellPrice: 180,
    edible: true,
    staminaRestore: 16,
    healthRestore: 8
  },
  {
    id: 'dried_radish',
    name: '萝卜干',
    category: 'processed',
    description: '香脆的萝卜干。',
    sellPrice: 245,
    edible: true,
    staminaRestore: 24,
    healthRestore: 12
  },
  {
    id: 'pickled_radish',
    name: '腌萝卜',
    category: 'processed',
    description: '酱缸腌出的脆爽萝卜，可入冬储订单、护院汤和根茎丹材准备。',
    sellPrice: 620,
    edible: true,
    staminaRestore: 32,
    healthRestore: 16
  },
  {
    id: 'pumpkin_preserve',
    name: '南瓜酱',
    category: 'processed',
    description: '浓郁的南瓜酱。',
    sellPrice: 500,
    edible: true,
    staminaRestore: 45,
    healthRestore: 22
  },
  {
    id: 'candied_peach',
    name: '蜜桃脯',
    category: 'processed',
    description: '糖渍罐慢渍出的清甜蜜桃脯，可继续制作蜜桃灵果糕、伴手礼和节会甜品。',
    sellPrice: 700,
    edible: true,
    staminaRestore: 90,
    healthRestore: 45
  },
  {
    id: 'candied_fruit_mix',
    name: '百果蜜脯',
    category: 'processed',
    description: '糖渍罐试出的混合果脯，适合作为节会甜品、宠物点心和伴手礼胚料。',
    sellPrice: 700,
    edible: true,
    staminaRestore: 90,
    healthRestore: 45
  },
  {
    id: 'fine_candied_fruit',
    name: '锦果蜜脯',
    category: 'processed',
    description: '高甜果蔬慢渍出的进阶果脯，适合节会礼盒和精致点心。',
    sellPrice: 1800,
    edible: true,
    staminaRestore: 240,
    healthRestore: 120
  },
  {
    id: 'spirit_candied_fruit',
    name: '灵果蜜脯',
    category: 'processed',
    description: '灵性果实凝成的蜜脯，甜味里留着稳定灵气，可作高阶点心胚。',
    sellPrice: 5200,
    edible: true,
    staminaRestore: 720,
    healthRestore: 360
  },
  {
    id: 'mystic_candied_fruit',
    name: '玄果蜜脯',
    category: 'processed',
    description: '珍稀灵果经蜂蜜封存后的深层甜品材料，适合稀有委托和压轴供礼。',
    sellPrice: 10000,
    edible: true,
    staminaRestore: 1250,
    healthRestore: 625
  },
  {
    id: 'celestial_candied_fruit',
    name: '天成果脯',
    category: 'processed',
    description: '极高价值灵果慢渍出的顶阶蜜脯，保留了原料浓缩后的生命力。',
    sellPrice: 16000,
    edible: true,
    staminaRestore: 1700,
    healthRestore: 850
  },
  {
    id: 'honey',
    name: '蜂蜜',
    category: 'processed',
    description: '金黄甘甜的蜂蜜。',
    sellPrice: 100,
    edible: true,
    staminaRestore: 20,
    healthRestore: 10
  },
  { id: 'sesame_oil', name: '芝麻油', category: 'processed', description: '醇香的小磨麻油。', sellPrice: 260, edible: false },
  { id: 'rapeseed_oil', name: '菜籽油', category: 'processed', description: '油菜籽榨出的清亮食用油，适合家常烹调和集市摊位。', sellPrice: 280, edible: false },
  { id: 'tea_oil', name: '茶油', category: 'processed', description: '珍贵的山茶油。', sellPrice: 620, edible: false },
  { id: 'mixed_seed_oil', name: '杂籽油', category: 'processed', description: '油坊用适合榨油的作物试压出的通用食用油，可接料理和订单。', sellPrice: 320, edible: false },
  { id: 'refined_seed_oil', name: '精炼香油', category: 'processed', description: '高价值油料慢压出的清亮香油，适合节会菜、公共仓备料和赠礼。', sellPrice: 800, edible: false },
  { id: 'artisan_seed_oil', name: '匠榨香油', category: 'processed', description: '优质油料细榨出的通配香油，适合高阶料理和公共仓精备。', sellPrice: 2400, edible: false },
  { id: 'spirit_seed_oil', name: '灵籽清油', category: 'processed', description: '灵性油料压出的澄亮清油，可作稀有料理和节会供品底油。', sellPrice: 5600, edible: false },
  { id: 'celestial_seed_oil', name: '天成灵油', category: 'processed', description: '顶阶油料慢压出的清透灵油，适合高价值委托和压轴供礼。', sellPrice: 11000, edible: false },
  {
    id: 'peach_wine',
    name: '桃花酒',
    category: 'processed',
    description: '清甜的桃花酒。',
    sellPrice: 630,
    edible: true,
    staminaRestore: 35,
    healthRestore: 20
  },
  {
    id: 'jujube_wine',
    name: '红枣酒',
    category: 'processed',
    description: '醇厚滋补的红枣酒。',
    sellPrice: 450,
    edible: true,
    staminaRestore: 25,
    healthRestore: 15
  },
  {
    id: 'corn_wine',
    name: '玉米酒',
    category: 'processed',
    description: '淡雅清香的玉米酒。',
    sellPrice: 800,
    edible: true,
    staminaRestore: 50,
    healthRestore: 25
  },
  {
    id: 'mixed_fruit_wine',
    name: '百果酒',
    category: 'processed',
    description: '酒坊用适合酿造的作物试出的通用果酒，适合拜访、节会和公共仓消耗。',
    sellPrice: 760,
    edible: true,
    staminaRestore: 60,
    healthRestore: 30
  },
  {
    id: 'seasonal_fruit_wine',
    name: '时令果酒',
    category: 'processed',
    description: '季节性甜果酿出的清亮果酒，比普通百果酒更适合节庆供桌。',
    sellPrice: 2500,
    edible: true,
    staminaRestore: 120,
    healthRestore: 60
  },
  {
    id: 'spirit_fruit_brew',
    name: '灵果清酿',
    category: 'processed',
    description: '灵性作物入坛后凝出的清酿，可用于高阶赠礼、节会供品和公共仓稀有备料。',
    sellPrice: 4000,
    edible: true,
    staminaRestore: 160,
    healthRestore: 80
  },
  {
    id: 'mystic_fruit_wine',
    name: '玄果清酿',
    category: 'processed',
    description: '高阶灵果酿出的深色清酿，适合稀有委托和压轴供礼。',
    sellPrice: 12000,
    edible: true,
    staminaRestore: 420,
    healthRestore: 210
  },
  {
    id: 'celestial_fruit_wine',
    name: '天成果酿',
    category: 'processed',
    description: '顶阶灵果长时酿成的珍贵果酿，保留原料浓缩后的灵息。',
    sellPrice: 28000,
    edible: true,
    staminaRestore: 720,
    healthRestore: 360
  },
  {
    id: 'ancient_fruit_wine',
    name: '远古果酒',
    category: 'processed',
    description: '远古水果慢酿出的幽蓝果酒，酒液里像封着亘古生命力，可陈酿也适合高阶供礼。',
    sellPrice: 5000,
    edible: true,
    staminaRestore: 180,
    healthRestore: 90
  },
  {
    id: 'pickled_chili',
    name: '泡椒',
    category: 'processed',
    description: '酸辣开胃的泡椒，可作辛火行气丸辅材，也能拌成赛舟提神食。',
    sellPrice: 270,
    edible: true,
    staminaRestore: 28,
    healthRestore: 14
  },
  {
    id: 'pickled_ginger',
    name: '腌姜',
    category: 'processed',
    description: '酸甜脆嫩的腌姜。',
    sellPrice: 360,
    edible: true,
    staminaRestore: 32,
    healthRestore: 16
  },
  {
    id: 'mixed_pickles',
    name: '百味腌菜',
    category: 'processed',
    description: '酱缸试出的通用腌菜，能把零散蔬果转成订单、家常配菜和冬储材料。',
    sellPrice: 420,
    edible: true,
    staminaRestore: 32,
    healthRestore: 16
  },
  {
    id: 'root_pickles',
    name: '根菜脆腌',
    category: 'processed',
    description: '根茎作物腌出的脆口小菜，适合护院汤、冬储单和药膳前置。',
    sellPrice: 520,
    edible: true,
    staminaRestore: 40,
    healthRestore: 20
  },
  {
    id: 'fine_pickles',
    name: '锦味腌菜',
    category: 'processed',
    description: '优质蔬果腌成的进阶通配腌菜，适合冬储委托和节会小食。',
    sellPrice: 1400,
    edible: true,
    staminaRestore: 190,
    healthRestore: 95
  },
  {
    id: 'spirit_pickles',
    name: '灵蔬脆腌',
    category: 'processed',
    description: '灵性蔬果入缸后成就的清脆腌菜，可作高阶药膳前置。',
    sellPrice: 4200,
    edible: true,
    staminaRestore: 560,
    healthRestore: 280
  },
  {
    id: 'celestial_pickles',
    name: '天成腌珍',
    category: 'processed',
    description: '顶阶蔬果慢腌出的珍味，保留了原料压缩后的饱满效力。',
    sellPrice: 6800,
    edible: true,
    staminaRestore: 700,
    healthRestore: 350
  },
  { id: 'mayonnaise', name: '蛋黄酱', category: 'processed', description: '用鸡蛋制成的浓郁蛋黄酱。', sellPrice: 115, edible: false },
  {
    id: 'duck_mayonnaise',
    name: '鸭蛋黄酱',
    category: 'processed',
    description: '用鸭蛋制成的高级蛋黄酱。',
    sellPrice: 215,
    edible: false
  },
  {
    id: 'goose_mayonnaise',
    name: '鹅蛋黄酱',
    category: 'processed',
    description: '用鹅蛋制成的浓稠蛋黄酱。',
    sellPrice: 250,
    edible: false
  },
  {
    id: 'silkie_mayonnaise',
    name: '乌鸡蛋黄酱',
    category: 'processed',
    description: '用乌鸡蛋制成的滋补蛋黄酱。',
    sellPrice: 295,
    edible: false
  },
  {
    id: 'ostrich_mayonnaise',
    name: '鸵鸟蛋黄酱',
    category: 'processed',
    description: '用鸵鸟蛋制成的大份蛋黄酱。',
    sellPrice: 450,
    edible: false
  },
  {
    id: 'quail_mayonnaise',
    name: '鹌鹑蛋黄酱',
    category: 'processed',
    description: '用鹌鹑蛋制成的精致蛋黄酱。',
    sellPrice: 170,
    edible: false
  }
]

/** 烟熏鱼物品 */
const SMOKED_ITEMS: ItemDef[] = [
  {
    id: 'smoked_fish',
    name: '烟熏鱼',
    category: 'processed',
    description: '烟熏机试出的通用熏鱼，方便保存，可接料理、订单和公共仓备料。',
    sellPrice: 180,
    edible: true,
    staminaRestore: 24,
    healthRestore: 12
  },
  {
    id: 'smoked_prime_fish',
    name: '上选熏鱼',
    category: 'processed',
    description: '高价值鱼类烟熏后的通配熏鱼，油脂更足，适合进阶料理和委托。',
    sellPrice: 620,
    edible: true,
    staminaRestore: 50,
    healthRestore: 30
  },
  {
    id: 'smoked_legendary_fish',
    name: '传说熏鱼',
    category: 'processed',
    description: '传说鱼经烟熏后留下的稀有珍味，适合作为收藏家宴和高阶委托材料。',
    sellPrice: 2600,
    edible: true,
    staminaRestore: 180,
    healthRestore: 100
  },
  {
    id: 'smoked_crucian',
    name: '烟熏鲫鱼',
    category: 'processed',
    description: '经过烟熏处理的鲫鱼，风味独特。',
    sellPrice: 30,
    edible: true,
    staminaRestore: 7,
    healthRestore: 3
  },
  {
    id: 'smoked_carp',
    name: '烟熏鲤鱼',
    category: 'processed',
    description: '经过烟熏处理的鲤鱼，肉质紧实。',
    sellPrice: 50,
    edible: true,
    staminaRestore: 12,
    healthRestore: 6
  },
  {
    id: 'smoked_grass_carp',
    name: '烟熏草鱼',
    category: 'processed',
    description: '经过烟熏处理的草鱼，鲜香可口。',
    sellPrice: 80,
    edible: true,
    staminaRestore: 20,
    healthRestore: 10
  },
  {
    id: 'smoked_bass',
    name: '烟熏鲈鱼',
    category: 'processed',
    description: '经过烟熏处理的鲈鱼，口感细腻。',
    sellPrice: 120,
    edible: true,
    staminaRestore: 30,
    healthRestore: 15
  },
  {
    id: 'smoked_catfish',
    name: '烟熏鲶鱼',
    category: 'processed',
    description: '经过烟熏处理的鲶鱼，味道醇厚。',
    sellPrice: 90,
    edible: true,
    staminaRestore: 22,
    healthRestore: 11
  },
  {
    id: 'smoked_mandarin_fish',
    name: '烟熏桂花鱼',
    category: 'processed',
    description: '经过烟熏处理的桂花鱼，鲜嫩多汁。',
    sellPrice: 140,
    edible: true,
    staminaRestore: 35,
    healthRestore: 17
  },
  {
    id: 'smoked_eel',
    name: '烟熏鳗鱼',
    category: 'processed',
    description: '经过烟熏处理的鳗鱼，肥美香滑。',
    sellPrice: 170,
    edible: true,
    staminaRestore: 42,
    healthRestore: 21
  },
  {
    id: 'smoked_sturgeon',
    name: '烟熏鲟鱼',
    category: 'processed',
    description: '经过烟熏处理的鲟鱼，珍贵美味。',
    sellPrice: 260,
    edible: true,
    staminaRestore: 65,
    healthRestore: 32
  },
  {
    id: 'smoked_loach',
    name: '烟熏泥鳅',
    category: 'processed',
    description: '经过烟熏处理的泥鳅，酥脆鲜香。',
    sellPrice: 44,
    edible: true,
    staminaRestore: 11,
    healthRestore: 5
  },
  {
    id: 'smoked_yellow_eel',
    name: '烟熏黄鳝',
    category: 'processed',
    description: '经过烟熏处理的黄鳝，滋补美味。',
    sellPrice: 100,
    edible: true,
    staminaRestore: 25,
    healthRestore: 12
  }
]

/** 脱水食品物品 */
const DRIED_ITEMS: ItemDef[] = [
  {
    id: 'dried_mushroom',
    name: '干蘑菇',
    category: 'processed',
    description: '脱水保存的蘑菇，浓缩了鲜味。',
    sellPrice: 135,
    edible: true,
    staminaRestore: 18,
    healthRestore: 9
  },
  {
    id: 'dried_peach',
    name: '桃干',
    category: 'processed',
    description: '脱水制成的桃干，酸甜可口。',
    sellPrice: 120,
    edible: true,
    staminaRestore: 30,
    healthRestore: 15
  },
  {
    id: 'dried_lychee',
    name: '荔枝干',
    category: 'processed',
    description: '脱水制成的荔枝干，甘甜浓郁。',
    sellPrice: 340,
    edible: true,
    staminaRestore: 40,
    healthRestore: 20
  },
  {
    id: 'dried_persimmon_slice',
    name: '柿饼',
    category: 'processed',
    description: '柿子晒干或脱水制成的柿饼，软糯香甜，可作冬储点心。',
    sellPrice: 300,
    edible: true,
    staminaRestore: 42,
    healthRestore: 21
  },
  {
    id: 'dried_hawthorn',
    name: '山楂片',
    category: 'processed',
    description: '脱水制成的山楂片，酸甜开胃。',
    sellPrice: 130,
    edible: true,
    staminaRestore: 32,
    healthRestore: 16
  },
  {
    id: 'dried_apricot',
    name: '杏脯',
    category: 'processed',
    description: '脱水制成的杏脯，酸甜适中。',
    sellPrice: 110,
    edible: true,
    staminaRestore: 27,
    healthRestore: 13
  },
  {
    id: 'dried_berry',
    name: '果脯',
    category: 'processed',
    description: '野果脱水制成的果脯，方便保存。',
    sellPrice: 90,
    edible: true,
    staminaRestore: 18,
    healthRestore: 6
  },
  {
    id: 'dried_vegetable',
    name: '干菜',
    category: 'processed',
    description: '白菜晒成的耐储干菜，可做干菜汤、冬储订单和公共食材。',
    sellPrice: 120,
    edible: true,
    staminaRestore: 16,
    healthRestore: 8
  },
  {
    id: 'dried_crop_bundle',
    name: '田园干货包',
    category: 'processed',
    description: '晒架把适合长期保存的作物晒成一包干货，可接冬储订单、料理和公共仓备料。',
    sellPrice: 320,
    edible: true,
    staminaRestore: 45,
    healthRestore: 22
  },
  {
    id: 'fine_dried_crop_bundle',
    name: '锦晒干货包',
    category: 'processed',
    description: '优质作物晒成的进阶干货包，适合冬储委托和高阶料理备料。',
    sellPrice: 1200,
    edible: true,
    staminaRestore: 180,
    healthRestore: 90
  },
  {
    id: 'spirit_dried_crop_bundle',
    name: '灵晒干货包',
    category: 'processed',
    description: '灵性作物慢晒后的干货包，风味和药性都被稳稳收住。',
    sellPrice: 3600,
    edible: true,
    staminaRestore: 520,
    healthRestore: 260
  },
  {
    id: 'celestial_dried_crop_bundle',
    name: '天成干货包',
    category: 'processed',
    description: '顶阶作物晒成的珍贵干货，保留了原料浓缩后的生命力。',
    sellPrice: 7800,
    edible: true,
    staminaRestore: 820,
    healthRestore: 410
  },
  {
    id: 'dried_fruit_mix',
    name: '什锦果干',
    category: 'processed',
    description: '脱水机试出的混合果干，甜味浓缩，适合宠物点心、节会甜品和旅途干粮。',
    sellPrice: 520,
    edible: true,
    staminaRestore: 70,
    healthRestore: 35
  },
  {
    id: 'fine_dried_fruit_mix',
    name: '锦果干',
    category: 'processed',
    description: '优质甜果脱水后的进阶果干，适合精致甜品和节会礼盒。',
    sellPrice: 1400,
    edible: true,
    staminaRestore: 220,
    healthRestore: 110
  },
  {
    id: 'spirit_dried_fruit_mix',
    name: '灵果干',
    category: 'processed',
    description: '灵性果实脱水后的浓缩果干，适合高阶点心和稀有委托。',
    sellPrice: 4200,
    edible: true,
    staminaRestore: 600,
    healthRestore: 300
  },
  {
    id: 'celestial_dried_fruit_mix',
    name: '天成果干',
    category: 'processed',
    description: '顶阶灵果脱水后的珍贵果干，完整保留原料的浓缩效力。',
    sellPrice: 7800,
    edible: true,
    staminaRestore: 820,
    healthRestore: 410
  },
  {
    id: 'dried_herb',
    name: '药材干',
    category: 'processed',
    description: '草药晒成的药材干，可再研磨成药膏并进入丹药准备链。',
    sellPrice: 150,
    edible: false
  },
  {
    id: 'dried_lotus_seed',
    name: '干莲子',
    category: 'processed',
    description: '脱水后的莲子，清香耐储，可做安神茶点或继续研成莲心粉。',
    sellPrice: 720,
    edible: true,
    staminaRestore: 90,
    healthRestore: 45
  }
]

/** 机器物品 */
const MACHINE_ITEMS: ItemDef[] = PROCESSING_MACHINES.map(m => ({
  id: `machine_${m.id}`,
  name: m.name,
  category: 'machine' as const,
  description: m.description,
  sellPrice: Math.floor(m.craftMoney * 0.5),
  edible: false
}))

/** 洒水器物品 */
const SPRINKLER_ITEMS: ItemDef[] = SPRINKLERS.map(s => ({
  id: s.id,
  name: s.name,
  category: 'sprinkler' as const,
  description: s.description,
  sellPrice: Math.floor(s.craftMoney * 0.5),
  edible: false
}))

/** 肥料物品 */
const FERTILIZER_ITEMS: ItemDef[] = FERTILIZERS.map(f => ({
  id: f.id,
  name: f.name,
  category: 'fertilizer' as const,
  description: f.description,
  sellPrice: 5,
  edible: false
}))

/** 鱼饵物品 */
const BAIT_ITEMS: ItemDef[] = BAITS.map(b => ({
  id: b.id,
  name: b.name,
  category: 'bait' as const,
  description: b.description,
  sellPrice: b.shopPrice ? Math.floor(b.shopPrice * 0.4) : 5,
  edible: false
}))

/** 浮漂物品 */
const TACKLE_ITEMS: ItemDef[] = TACKLES.map(t => ({
  id: t.id,
  name: t.name,
  category: 'tackle' as const,
  description: t.description,
  sellPrice: t.shopPrice ? Math.floor(t.shopPrice * 0.5) : 50,
  edible: false
}))

/** 动物产品 */
const ANIMAL_PRODUCT_ITEMS: ItemDef[] = [
  {
    id: 'egg',
    name: '鸡蛋',
    category: 'animal_product',
    description: '新鲜的鸡蛋。',
    sellPrice: 75,
    edible: true,
    staminaRestore: 5,
    healthRestore: 3
  },
  {
    id: 'duck_egg',
    name: '鸭蛋',
    category: 'animal_product',
    description: '个大味美的鸭蛋。',
    sellPrice: 180,
    edible: true,
    staminaRestore: 8,
    healthRestore: 4
  },
  {
    id: 'milk',
    name: '牛奶',
    category: 'animal_product',
    description: '新鲜的牛奶。',
    sellPrice: 187,
    edible: true,
    staminaRestore: 10,
    healthRestore: 5
  },
  { id: 'wool', name: '羊毛', category: 'animal_product', description: '柔软的羊毛。', sellPrice: 510, edible: false },
  { id: 'hay', name: '干草', category: 'material', description: '喂养牲畜的干草。', sellPrice: 0, edible: false },
  // 新增动物产品
  { id: 'rabbit_fur', name: '兔毛', category: 'animal_product', description: '柔软的兔毛。', sellPrice: 330, edible: false },
  {
    id: 'rabbit_foot',
    name: '幸运兔脚',
    category: 'animal_product',
    description: '传说能带来好运的兔脚，十分稀有。',
    sellPrice: 300,
    edible: false
  },
  {
    id: 'goose_egg',
    name: '鹅蛋',
    category: 'animal_product',
    description: '个头很大的鹅蛋。',
    sellPrice: 165,
    edible: true,
    staminaRestore: 10,
    healthRestore: 5
  },
  {
    id: 'quail_egg',
    name: '鹌鹑蛋',
    category: 'animal_product',
    description: '小巧的鹌鹑蛋。',
    sellPrice: 65,
    edible: true,
    staminaRestore: 3,
    healthRestore: 2
  },
  {
    id: 'pigeon_egg',
    name: '鸽子蛋',
    category: 'animal_product',
    description: '营养丰富的鸽子蛋。',
    sellPrice: 140,
    edible: true,
    staminaRestore: 5,
    healthRestore: 3
  },
  {
    id: 'silkie_egg',
    name: '乌鸡蛋',
    category: 'animal_product',
    description: '滋补的乌鸡蛋。',
    sellPrice: 195,
    edible: true,
    staminaRestore: 15,
    healthRestore: 8
  },
  { id: 'peacock_feather', name: '孔雀羽', category: 'animal_product', description: '华丽的孔雀尾羽。', sellPrice: 525, edible: false },
  {
    id: 'goat_milk',
    name: '羊奶',
    category: 'animal_product',
    description: '新鲜的羊奶。',
    sellPrice: 240,
    edible: true,
    staminaRestore: 10,
    healthRestore: 5
  },
  {
    id: 'truffle',
    name: '松露',
    category: 'animal_product',
    description: '珍贵的地下菌类。',
    sellPrice: 450,
    edible: true,
    staminaRestore: 5,
    healthRestore: 3
  },
  {
    id: 'buffalo_milk',
    name: '水牛奶',
    category: 'animal_product',
    description: '醇厚的水牛奶。',
    sellPrice: 230,
    edible: true,
    staminaRestore: 8,
    healthRestore: 4
  },
  {
    id: 'yak_milk',
    name: '牦牛奶',
    category: 'animal_product',
    description: '高原牦牛的浓郁奶。',
    sellPrice: 210,
    edible: true,
    staminaRestore: 32,
    healthRestore: 16
  },
  { id: 'alpaca_wool', name: '羊驼毛', category: 'animal_product', description: '极其柔软的羊驼毛。', sellPrice: 375, edible: false },
  {
    id: 'antler_velvet',
    name: '鹿茸',
    category: 'animal_product',
    description: '珍贵的鹿茸，可直接食用补体力。',
    sellPrice: 900,
    edible: true,
    staminaRestore: 30,
    healthRestore: 15
  },
  {
    id: 'donkey_milk',
    name: '驴奶',
    category: 'animal_product',
    description: '驴奶，味道温和。',
    sellPrice: 300,
    edible: true,
    staminaRestore: 6,
    healthRestore: 3
  },
  {
    id: 'camel_milk',
    name: '驼奶',
    category: 'animal_product',
    description: '营养丰富的驼奶。',
    sellPrice: 240,
    edible: true,
    staminaRestore: 12,
    healthRestore: 6
  },
  {
    id: 'ostrich_egg',
    name: '鸵鸟蛋',
    category: 'animal_product',
    description: '巨大的鸵鸟蛋。',
    sellPrice: 520,
    edible: true,
    staminaRestore: 15,
    healthRestore: 8
  }
]

/** 果树水果 */
const FRUIT_TREE_ITEMS: ItemDef[] = FRUIT_TREE_DEFS.map(t => ({
  id: t.fruitId,
  name: t.fruitName,
  category: 'fruit' as const,
  description: `${t.name}结出的${t.fruitName}。`,
  sellPrice: Math.floor(t.fruitSellPrice * 1.5),
  edible: true,
  staminaRestore: Math.floor(t.fruitSellPrice / 5),
  healthRestore: Math.floor(t.fruitSellPrice / 10)
}))

/** 树苗 */
const SAPLING_ITEMS: ItemDef[] = FRUIT_TREE_DEFS.map(t => ({
  id: t.saplingId,
  name: `${t.name}苗`,
  category: 'sapling' as const,
  description: `种下后${t.growthDays}天可成熟，${t.fruitSeason === 'spring' ? '春' : t.fruitSeason === 'summer' ? '夏' : t.fruitSeason === 'autumn' ? '秋' : '冬'}季产出${t.fruitName}。`,
  sellPrice: Math.floor(t.saplingPrice / 2),
  edible: false
}))

/** 野树产物和材料 */
const WILD_TREE_ITEMS: ItemDef[] = [
  {
    id: 'camphor_seed',
    name: '樟树种子',
    category: 'material',
    description: '樟树的种子，种下后可长成樟树。',
    sellPrice: 15,
    edible: false
  },
  {
    id: 'wild_mulberry',
    name: '桑葚',
    category: 'misc',
    description: '紫黑色的桑葚，酸甜可口。',
    sellPrice: 25,
    edible: true,
    staminaRestore: 5,
    healthRestore: 2
  },
  { id: 'pine_resin', name: '松脂', category: 'material', description: '松树分泌的树脂，可用于制作。', sellPrice: 30, edible: false },
  { id: 'camphor_oil', name: '樟脑油', category: 'material', description: '樟树提取的精油，气味清香。', sellPrice: 50, edible: false },
  { id: 'silk', name: '蚕丝', category: 'material', description: '桑树上采集的蚕丝，光滑细腻。', sellPrice: 40, edible: false },
  { id: 'tapper', name: '采脂器', category: 'machine', description: '安装到成熟野树上，定期产出树脂。', sellPrice: 100, edible: false }
]

/** 炸弹物品 */
const BOMB_ITEMS: ItemDef[] = BOMBS.map(b => ({
  id: b.id,
  name: b.name,
  category: 'bomb' as const,
  description: b.description,
  sellPrice: 25,
  edible: false
}))

/** 蟹笼和水产物品 */
const CRAB_POT_ITEMS: ItemDef[] = [
  {
    id: 'crab_pot',
    name: '蟹笼',
    category: 'machine',
    description: '放置在钓鱼地点，每日自动捕获水产（需鱼饵）。',
    sellPrice: 750,
    edible: false
  },
  {
    id: 'snail',
    name: '蜗牛',
    category: 'fish',
    description: '小巧的淡水蜗牛。',
    sellPrice: 15,
    edible: true,
    staminaRestore: 3,
    healthRestore: 2
  },
  {
    id: 'freshwater_shrimp',
    name: '淡水虾',
    category: 'fish',
    description: '清澈水域中的小虾。',
    sellPrice: 20,
    edible: true,
    staminaRestore: 4,
    healthRestore: 2
  },
  {
    id: 'crab',
    name: '螃蟹',
    category: 'fish',
    description: '鲜美的河蟹。',
    sellPrice: 30,
    edible: true,
    staminaRestore: 6,
    healthRestore: 3
  },
  {
    id: 'lobster',
    name: '龙虾',
    category: 'fish',
    description: '珍贵的淡水龙虾。',
    sellPrice: 50,
    edible: true,
    staminaRestore: 10,
    healthRestore: 5
  },
  {
    id: 'cave_shrimp',
    name: '洞穴虾',
    category: 'fish',
    description: '矿洞暗河中的透明小虾。',
    sellPrice: 40,
    edible: true,
    staminaRestore: 8,
    healthRestore: 4
  },
  {
    id: 'swamp_crab',
    name: '沼泽蟹',
    category: 'fish',
    description: '沼泽中的深色螃蟹。',
    sellPrice: 45,
    edible: true,
    staminaRestore: 9,
    healthRestore: 4
  },
  { id: 'trash', name: '垃圾', category: 'misc', description: '没什么用的杂物。', sellPrice: 1, edible: false },
  { id: 'driftwood', name: '浮木', category: 'misc', description: '水中捞起的朽木。', sellPrice: 2, edible: false },
  { id: 'broken_cd', name: '碎碟片', category: 'misc', description: '不知谁丢的破碟子。', sellPrice: 1, edible: false },
  { id: 'soggy_newspaper', name: '湿报纸', category: 'misc', description: '泡烂的旧报纸。', sellPrice: 1, edible: false }
]

/** 花蜜物品 */
const FLOWER_HONEY_ITEMS: ItemDef[] = [
  {
    id: 'wildflower_honey',
    name: '百花蜜',
    category: 'processed',
    description: '蜂箱旁摆放各类花作后采出的混合花蜜，适合茶饮、节会甜品和赠礼。',
    sellPrice: 520,
    edible: true,
    staminaRestore: 60,
    healthRestore: 30
  },
  {
    id: 'fine_wildflower_honey',
    name: '锦花蜜',
    category: 'processed',
    description: '优质花作酿出的进阶花蜜，香气更稳，适合节会甜品和伴手礼。',
    sellPrice: 1400,
    edible: true,
    staminaRestore: 220,
    healthRestore: 110
  },
  {
    id: 'spirit_wildflower_honey',
    name: '灵花蜜',
    category: 'processed',
    description: '灵性花作凝出的珍贵花蜜，可作高阶茶饮和稀有委托材料。',
    sellPrice: 4200,
    edible: true,
    staminaRestore: 560,
    healthRestore: 280
  },
  {
    id: 'celestial_wildflower_honey',
    name: '天成花蜜',
    category: 'processed',
    description: '顶阶花作酿出的清亮花蜜，保留了原料浓缩后的香气和效力。',
    sellPrice: 7600,
    edible: true,
    staminaRestore: 720,
    healthRestore: 360
  },
  {
    id: 'chrysanthemum_honey',
    name: '菊花蜜',
    category: 'processed',
    description: '带有菊花清香的蜂蜜。',
    sellPrice: 200,
    edible: true,
    staminaRestore: 25,
    healthRestore: 12
  },
  {
    id: 'osmanthus_honey',
    name: '桂花蜜',
    category: 'processed',
    description: '馥郁芬芳的桂花蜂蜜。',
    sellPrice: 450,
    edible: true,
    staminaRestore: 45,
    healthRestore: 22
  },
  {
    id: 'rapeseed_honey',
    name: '菜花蜜',
    category: 'processed',
    description: '清甜的油菜花蜂蜜。',
    sellPrice: 150,
    edible: true,
    staminaRestore: 20,
    healthRestore: 10
  },
  {
    id: 'snow_lotus_honey',
    name: '雪莲蜜',
    category: 'processed',
    description: '珍贵的雪莲花蜂蜜。',
    sellPrice: 900,
    edible: true,
    staminaRestore: 80,
    healthRestore: 40
  }
]

/** 松露油 */
const TRUFFLE_OIL_ITEM: ItemDef[] = [
  { id: 'truffle_oil', name: '松露油', category: 'processed', description: '珍贵的松露油，烹饪佳品。', sellPrice: 680, edible: false }
]

/** 奶酪物品 */
const CHEESE_ITEMS: ItemDef[] = [
  {
    id: 'cheese',
    name: '奶酪',
    category: 'processed',
    description: '用牛奶制成的醇厚奶酪。',
    sellPrice: 250,
    edible: true,
    staminaRestore: 50,
    healthRestore: 25
  },
  {
    id: 'goat_cheese',
    name: '山羊奶酪',
    category: 'processed',
    description: '用山羊奶制成的风味奶酪。',
    sellPrice: 220,
    edible: true,
    staminaRestore: 44,
    healthRestore: 22
  },
  {
    id: 'buffalo_cheese',
    name: '水牛奶酪',
    category: 'processed',
    description: '用水牛奶制成的浓郁奶酪。',
    sellPrice: 200,
    edible: true,
    staminaRestore: 40,
    healthRestore: 20
  },
  {
    id: 'yak_cheese',
    name: '牦牛奶酪',
    category: 'processed',
    description: '用牦牛奶制成的高原奶酪。',
    sellPrice: 280,
    edible: true,
    staminaRestore: 56,
    healthRestore: 28
  }
]

/** 布料物品 */
const CLOTH_ITEMS: ItemDef[] = [
  { id: 'cloth', name: '布匹', category: 'material', description: '用羊毛纺织的布匹。', sellPrice: 660, edible: false },
  { id: 'silk_cloth', name: '丝绸', category: 'material', description: '华美的丝绸。', sellPrice: 200, edible: false },
  { id: 'alpaca_cloth', name: '羊驼绒', category: 'material', description: '极其柔软的羊驼绒布。', sellPrice: 530, edible: false },
  { id: 'felt', name: '毛毡', category: 'material', description: '用兔毛压制的毛毡。', sellPrice: 340, edible: false }
]

/** 金属锭物品 */
const BAR_ITEMS: ItemDef[] = [
  { id: 'copper_bar', name: '铜锭', category: 'material', description: '冶炼出的铜锭。', sellPrice: 40, edible: false },
  { id: 'iron_bar', name: '铁锭', category: 'material', description: '冶炼出的铁锭。', sellPrice: 80, edible: false },
  { id: 'gold_bar', name: '金锭', category: 'material', description: '冶炼出的金锭。', sellPrice: 160, edible: false },
  { id: 'iridium_bar', name: '铱锭', category: 'material', description: '冶炼出的铱锭，极其珍贵。', sellPrice: 700, edible: false },
  { id: 'bronze_bar', name: '青铜锭', category: 'material', description: '铜锭与铁锭合炼而成的青铜色金属锭，坚固耐用。', sellPrice: 120, edible: false },
  { id: 'refined_quartz', name: '精制石英', category: 'material', description: '高温提纯的石英，质地纯净透明。', sellPrice: 50, edible: false },
  { id: 'mythril_bar', name: '秘银锭', category: 'material', description: '由水晶矿与铁锭熔合而成，散发神秘光芒。', sellPrice: 350, edible: false }
]

/** 木炭物品 */
const CHARCOAL_ITEMS: ItemDef[] = [
  { id: 'charcoal', name: '木炭', category: 'material', description: '烧制的木炭，可用作燃料和制作。', sellPrice: 55, edible: false }
]

/** 面粉物品 */
const FLOUR_ITEMS: ItemDef[] = [
  { id: 'rice_flour', name: '米粉', category: 'material', description: '用稻米磨成的细腻米粉。', sellPrice: 260, edible: false },
  { id: 'wheat_flour', name: '面粉', category: 'material', description: '用冬小麦磨成的面粉。', sellPrice: 220, edible: false },
  { id: 'cornmeal', name: '玉米粉', category: 'material', description: '用玉米磨成的粗粉。', sellPrice: 300, edible: false },
  { id: 'sesame_powder', name: '芝麻粉', category: 'material', description: '用芝麻细磨成的香粉，可做糕点、宠物点心或辛香丹材。', sellPrice: 145, edible: false },
  { id: 'mixed_flour', name: '杂粮粉', category: 'material', description: '石磨把适合制粉的作物磨成通用杂粮粉，可接灶台、宠物点心和订单。', sellPrice: 240, edible: false },
  { id: 'fine_flour', name: '精磨粉', category: 'material', description: '高价值谷物或根茎细磨成的精粉，适合节会糕点与高阶料理。', sellPrice: 720, edible: false },
  { id: 'premium_flour', name: '锦磨粉', category: 'material', description: '优质谷物和根茎细磨出的进阶通配粉料，适合高阶料理和节会糕点。', sellPrice: 2400, edible: false },
  { id: 'spirit_flour', name: '灵谷粉', category: 'material', description: '灵性谷物和根茎磨出的细粉，可作稀有点心、丹材辅料和委托材料。', sellPrice: 5600, edible: false },
  { id: 'celestial_flour', name: '天成细粉', category: 'material', description: '顶阶作物磨成的珍贵细粉，适合压轴供礼和高价值委托。', sellPrice: 11000, edible: false }
]

/** 茶饮物品 */
const TEA_DRINK_ITEMS: ItemDef[] = [
  {
    id: 'green_tea_drink',
    name: '绿茶',
    category: 'processed',
    description: '清香的绿茶饮品。',
    sellPrice: 700,
    edible: true,
    staminaRestore: 70,
    healthRestore: 35
  },
  {
    id: 'guest_green_tea',
    name: '待客清茶',
    category: 'processed',
    description: '茶叶与蜂蜜调成的温润待客茶，适合作为好友拜访、节会寒暄和伴手礼饮品。',
    sellPrice: 900,
    edible: true,
    staminaRestore: 90,
    healthRestore: 45
  },
  {
    id: 'chrysanthemum_tea',
    name: '菊花茶',
    category: 'processed',
    description: '清热明目的菊花茶。',
    sellPrice: 470,
    edible: true,
    staminaRestore: 55,
    healthRestore: 28
  },
  {
    id: 'processed_osmanthus_tea',
    name: '桂花茶',
    category: 'processed',
    description: '馥郁芬芳的桂花茶。',
    sellPrice: 900,
    edible: true,
    staminaRestore: 90,
    healthRestore: 45
  },
  {
    id: 'ginseng_tea',
    name: '人参茶',
    category: 'processed',
    description: '滋补强身的人参茶。',
    sellPrice: 300,
    edible: true,
    staminaRestore: 40,
    healthRestore: 20
  },
  {
    id: 'herbal_tea_blend',
    name: '草本调饮',
    category: 'processed',
    description: '制茶机把带香气或药性的作物调成草本饮品，适合拜访和节会寒暄。',
    sellPrice: 620,
    edible: true,
    staminaRestore: 70,
    healthRestore: 35
  },
  {
    id: 'fine_herbal_tea_blend',
    name: '锦草调饮',
    category: 'processed',
    description: '优质香草和药材调出的进阶茶饮，适合精致拜访和节会寒暄。',
    sellPrice: 1800,
    edible: true,
    staminaRestore: 260,
    healthRestore: 130
  },
  {
    id: 'spirit_herbal_tea_blend',
    name: '灵草调饮',
    category: 'processed',
    description: '灵性草木调成的清亮茶饮，可作高阶药膳和稀有委托材料。',
    sellPrice: 5600,
    edible: true,
    staminaRestore: 760,
    healthRestore: 380
  },
  {
    id: 'celestial_herbal_tea_blend',
    name: '天成调饮',
    category: 'processed',
    description: '顶阶草木调成的珍贵茶饮，完整承住原料浓缩后的灵息。',
    sellPrice: 15000,
    edible: true,
    staminaRestore: 1700,
    healthRestore: 850
  }
]

/** 豆腐物品 */
const TOFU_ITEMS: ItemDef[] = [
  {
    id: 'tofu',
    name: '豆腐',
    category: 'processed',
    description: '鲜嫩的豆腐。',
    sellPrice: 600,
    edible: true,
    staminaRestore: 60,
    healthRestore: 30
  },
  {
    id: 'peanut_tofu',
    name: '花生豆腐',
    category: 'processed',
    description: '香浓的花生豆腐。',
    sellPrice: 450,
    edible: true,
    staminaRestore: 45,
    healthRestore: 22
  },
  {
    id: 'sesame_paste',
    name: '芝麻酱',
    category: 'processed',
    description: '浓香的芝麻酱。',
    sellPrice: 200,
    edible: true,
    staminaRestore: 20,
    healthRestore: 10
  },
  {
    id: 'mixed_tofu',
    name: '杂豆腐',
    category: 'processed',
    description: '豆腐坊用豆类作物试压出的豆腐，适合家常菜、宠物点心和公共仓备料。',
    sellPrice: 520,
    edible: true,
    staminaRestore: 45,
    healthRestore: 22
  },
  {
    id: 'firm_mixed_tofu',
    name: '锦豆腐',
    category: 'processed',
    description: '优质豆类压出的进阶通配豆腐，口感紧实，适合高阶料理。',
    sellPrice: 1800,
    edible: true,
    staminaRestore: 280,
    healthRestore: 140
  },
  {
    id: 'spirit_tofu',
    name: '灵豆腐',
    category: 'processed',
    description: '灵性豆类压成的细嫩豆腐，可作稀有料理和委托材料。',
    sellPrice: 6400,
    edible: true,
    staminaRestore: 820,
    healthRestore: 410
  },
  {
    id: 'celestial_tofu',
    name: '天成豆腐',
    category: 'processed',
    description: '顶阶豆类凝成的珍贵豆腐，保留了原料饱满的生命力。',
    sellPrice: 15000,
    edible: true,
    staminaRestore: 1800,
    healthRestore: 900
  }
]

/** 药品物品 */
const HERB_PRODUCT_ITEMS: ItemDef[] = [
  {
    id: 'herbal_paste',
    name: '草药膏',
    category: 'processed',
    description: '研磨制成的草药膏。',
    sellPrice: 180,
    edible: true,
    staminaRestore: 15,
    healthRestore: 10
  },
  {
    id: 'ginseng_extract',
    name: '人参精',
    category: 'processed',
    description: '浓缩的人参精华。',
    sellPrice: 400,
    edible: true,
    staminaRestore: 50,
    healthRestore: 25
  },
  {
    id: 'antler_powder',
    name: '鹿茸粉',
    category: 'processed',
    description: '研磨的鹿茸粉。',
    sellPrice: 950,
    edible: true,
    staminaRestore: 60,
    healthRestore: 30
  },
  {
    id: 'lotus_heart_powder',
    name: '莲心粉',
    category: 'processed',
    description: '干莲子研成的清苦细粉，可入安神茶、清心丹或节前礼盒。',
    sellPrice: 800,
    edible: false
  },
  {
    id: 'medicinal_powder',
    name: '百草药粉',
    category: 'processed',
    description: '药碾把适合入药的作物研成通用药粉，可接丹炉、药膳和节会药饮。',
    sellPrice: 420,
    edible: false
  },
  {
    id: 'fine_medicinal_powder',
    name: '锦草药粉',
    category: 'processed',
    description: '优质药材研成的进阶通配药粉，适合药膳、丹炉和节会药饮。',
    sellPrice: 1400,
    edible: false
  },
  {
    id: 'spirit_medicinal_powder',
    name: '灵草药粉',
    category: 'processed',
    description: '灵性药材研成的细粉，可作高阶丹材和稀有委托材料。',
    sellPrice: 4200,
    edible: false
  },
  {
    id: 'celestial_medicinal_powder',
    name: '天成药粉',
    category: 'processed',
    description: '顶阶药材细研出的珍贵粉料，适合压轴供礼和高价值委托。',
    sellPrice: 7200,
    edible: false
  },
  {
    id: 'animal_medicine',
    name: '兽药',
    category: 'misc',
    description: '治疗生病的牲畜，立即痊愈。',
    sellPrice: 50,
    edible: false
  },
  {
    id: 'stamina_fruit',
    name: '仙桃',
    category: 'misc',
    description: '蕴含远古灵气的果实，食用后永久提升体力上限。极其稀有。',
    sellPrice: 5000,
    edible: false
  }
]

/** 丹药物品 */
const ELIXIR_ITEMS: ItemDef[] = [
  {
    id: 'qingxin_lotus_elixir',
    name: '清心莲丹',
    category: 'elixir',
    description: '莲子、莲藕与草药膏炼成的清润主丹。定位为探索前的幸运与受伤保护丹药。',
    sellPrice: 260,
    edible: false
  },
  {
    id: 'warming_sweet_potato_pill',
    name: '温阳薯丸',
    category: 'elixir',
    description: '红薯、姜与蜂蜜炼成的温补主丹。定位为农忙、采集和寒天劳作前的体力丹药。',
    sellPrice: 240,
    edible: false
  },
  {
    id: 'spicy_vitality_pill',
    name: '辛火行气丸',
    category: 'elixir',
    description: '泡椒、芝麻酱与茶叶炼成的辛烈主丹。定位为赶路、赛舟和护送前的行动效率丹药。',
    sellPrice: 310,
    edible: false
  },
  {
    id: 'grain_breath_elixir',
    name: '谷气续行丹',
    category: 'elixir',
    description: '稻米、草药与蜂蜜炼成的温补辅丹。定位为旅途、公共订单和长线经营前的续航丹药。',
    sellPrice: 230,
    edible: false
  },
  {
    id: 'sesame_courtesy_elixir',
    name: '芝香护礼丸',
    category: 'elixir',
    description: '芝麻、茶叶与蜂蜜炼成的芳香辅丹。定位为送礼、节会供品和拜访前的礼仪丹药。',
    sellPrice: 250,
    edible: false
  },
  {
    id: 'pumpkin_warmth_elixir',
    name: '南瓜聚火丹',
    category: 'elixir',
    description: '南瓜、芝麻粉与蜂蜜炼成的温补辅丹。定位为节会备菜、宠物安抚和秋日订单前的暖身丹药。',
    sellPrice: 245,
    edible: false
  },
  {
    id: 'osmanthus_focus_elixir',
    name: '桂露凝神丹',
    category: 'elixir',
    description: '桂花蜜、茶叶与莲子炼成的芳香主丹。定位为送礼、社交和节会拜访前的凝神丹药。',
    sellPrice: 360,
    edible: false
  },
  {
    id: 'tea_focus_elixir',
    name: '茶心凝神丹',
    category: 'elixir',
    description: '绿茶、莲心粉与蜂蜜炼成的清苦主丹。定位为文游对话、节会拜访和好友长谈前的凝神丹药。',
    sellPrice: 340,
    edible: false
  },
  {
    id: 'stone_root_guard_pill',
    name: '石根护脉丸',
    category: 'elixir',
    description: '萝卜、土豆与精制石英炼成的根茎主丹。定位为矿洞、夜巡和远征前的防护丹药。',
    sellPrice: 220,
    edible: false
  },
  {
    id: 'spirit_peach_elixir',
    name: '灵桃醒神丹',
    category: 'elixir',
    description: '优质桃子、蜜桃脯与月草炼成的灵果主丹。定位为社交、节会拜访和长线经营前的醒神丹药。',
    sellPrice: 520,
    edible: false
  },
  {
    id: 'ley_crystal_focus_elixir',
    name: '灵脉凝神丹',
    category: 'elixir',
    description: '绿茶、精制石英与灵脉碎晶炼成的高地稀材主丹。定位为远征、首领战和高阶准备前的凝神丹药。',
    sellPrice: 680,
    edible: false
  },
  {
    id: 'yam_foundation_elixir',
    name: '固元山药丹',
    category: 'elixir',
    description: '山药、人参与蜂蜜炼成的根茎辅丹。定位为长辈拜访、宠物安抚和药膳订单前的固元丹药。',
    sellPrice: 265,
    edible: false
  },
  {
    id: 'garlic_coldward_elixir',
    name: '蒜辛驱寒丹',
    category: 'elixir',
    description: '大蒜、生姜与蜂蜜炼成的辛烈辅丹。定位为冬日巡田、护送和节会暖场前的驱寒丹药。',
    sellPrice: 255,
    edible: false
  },
  {
    id: 'bitter_gourd_cooling_elixir',
    name: '苦瓜清暑丹',
    category: 'elixir',
    description: '苦瓜、茶叶与蜂蜜炼成的清润辅丹。定位为夏日行旅、采集和节会清供前的清暑丹药。',
    sellPrice: 250,
    edible: false
  },
  {
    id: 'wind_core_guard_pill',
    name: '风蚀护脉丸',
    category: 'elixir',
    description: '腌姜、精制石英与风蚀晶核炼成的高地稀材护丹。定位为风蚀远征、护送和高压采集前的防护丹药。',
    sellPrice: 720,
    edible: false
  },
  {
    id: 'marsh_luminous_cleansing_elixir',
    name: '泽光净息丹',
    category: 'elixir',
    description: '草药膏、湿地孢样与夜光藻团炼成的泽地稀材主丹。定位为泽地远征、湿地采样和夜间探索前的净息丹药。',
    sellPrice: 740,
    edible: false
  },
  {
    id: 'moon_pearl_calm_elixir',
    name: '月珠安神丹',
    category: 'elixir',
    description: '绿茶、莲心粉与月珠炼成的稀材安神丹。定位为夜巡、结契仪式和长线探索前的安神丹药。',
    sellPrice: 780,
    edible: false
  },
  {
    id: 'jade_orchid_focus_elixir',
    name: '玉兰凝心丹',
    category: 'elixir',
    description: '桂花蜜、莲心粉与玉兰炼成的稀材凝心丹。定位为家族议事、节会筹备和高压协作前的凝心丹药。',
    sellPrice: 820,
    edible: false
  },
  {
    id: 'rare_lotus_guard_elixir',
    name: '稀莲护心丹',
    category: 'elixir',
    description: '草药膏、莲心粉与稀有莲子炼成的稀材护心丹。定位为长线守护、夜间巡田和高阶照料前的护心丹药。',
    sellPrice: 840,
    edible: false
  },
  {
    id: 'jade_peach_spirit_elixir',
    name: '翠桃醒神丹',
    category: 'elixir',
    description: '蜜桃脯、桂花蜜与翠桃炼成的稀材醒神丹。定位为节会访客、远行备战和高压经营前的醒神丹药。',
    sellPrice: 860,
    edible: false
  }
]

/** 炼丹副产物 */
const ALCHEMY_RESULT_ITEMS: ItemDef[] = [
  {
    id: 'partial_elixir_slurry',
    name: '偏丹膏',
    category: 'material',
    description: '炼丹药性偏移后凝成的膏状副产物，可作为后续丹材和百科追踪线索。',
    sellPrice: 90,
    edible: false
  },
  {
    id: 'failed_elixir_ash',
    name: '废丹灰',
    category: 'material',
    description: '炼丹失败后留下的灰烬，药性稀薄，适合回收研究或低阶委托。',
    sellPrice: 25,
    edible: false
  },
  {
    id: 'rare_elixir_crystal',
    name: '奇丹晶',
    category: 'material',
    description: '炼丹偶然凝出的晶核，保留异常药性，可作为稀有丹材收藏。',
    sellPrice: 180,
    edible: false
  }
]

/** 特殊饲料物品 */
const FEED_ITEMS: ItemDef[] = [
  {
    id: 'premium_feed',
    name: '精饲料',
    category: 'material',
    description: '精心配制的优质饲料，显著提升动物心情和好感度。',
    sellPrice: 210,
    edible: false
  },
  {
    id: 'nourishing_feed',
    name: '滋补饲料',
    category: 'material',
    description: '添加滋补成分的饲料，加速动物产出周期。',
    sellPrice: 185,
    edible: false
  },
  {
    id: 'vitality_feed',
    name: '活力饲料',
    category: 'material',
    description: '含有草药精华的饲料，喂食后必定治愈疾病。',
    sellPrice: 60,
    edible: false
  },
  {
    id: 'sweet_potato_filling_feed',
    name: '红薯饱腹粮',
    category: 'material',
    description: '红薯与干草磨成的厚实宠物粮，适合给宠物补足耐力和护院精神。',
    sellPrice: 110,
    edible: false
  },
  {
    id: 'pumpkin_pet_rice',
    name: '南瓜宠物饭',
    category: 'material',
    description: '南瓜和稻米拌成的绵甜宠物饭，适合猫狗日常亲密喂食。',
    sellPrice: 210,
    edible: false
  },
  {
    id: 'sesame_patrol_biscuit',
    name: '芝麻巡院饼',
    category: 'material',
    description: '芝麻粉、红薯饱腹粮与蜂蜜压成的高阶宠物点心，适合田犬巡院前补气味记忆。',
    sellPrice: 190,
    edible: false
  },
  {
    id: 'lotus_heart_cat_treat',
    name: '莲心桂花糕',
    category: 'material',
    description: '莲心粉、桂花与蜂蜜揉成的高阶宠物点心，适合猫与灵宠记住草本香气。',
    sellPrice: 680,
    edible: false
  },
  {
    id: 'spirit_fruit_mooncake',
    name: '灵果月华糕',
    category: 'material',
    description: '蜜桃脯、月草与莲心粉制成的高阶灵宠点心，稀有灵果线索更强但冷却更长。',
    sellPrice: 2100,
    edible: false
  }
]

/** 香料物品 */
const INCENSE_ITEMS: ItemDef[] = [
  { id: 'pine_incense', name: '松香', category: 'gift', description: '清新的松香，送礼佳品。', sellPrice: 100, edible: false },
  { id: 'camphor_incense', name: '樟脑香', category: 'gift', description: '提神醒脑的樟脑香。', sellPrice: 150, edible: false },
  { id: 'osmanthus_incense', name: '桂花香', category: 'gift', description: '馥郁的桂花香。', sellPrice: 780, edible: false },
  { id: 'rustic_incense', name: '田园合香', category: 'gift', description: '制香坊把香草花作调成的合香，适合拜访、节会和静心礼。', sellPrice: 850, edible: false },
  { id: 'refined_incense', name: '锦草合香', category: 'gift', description: '优质香草花作调成的进阶合香，适合精致拜访和节会供礼。', sellPrice: 1800, edible: false },
  { id: 'spirit_incense', name: '灵草合香', category: 'gift', description: '灵性香草花作调成的清雅合香，可作高阶赠礼和稀有委托材料。', sellPrice: 6200, edible: false },
  { id: 'celestial_incense', name: '天成合香', category: 'gift', description: '顶阶香草花作调成的珍贵合香，适合压轴供礼和高价值委托。', sellPrice: 15000, edible: false }
]

/** 武器图鉴物品 */
const WEAPON_ITEMS: ItemDef[] = Object.values(WEAPONS).map(w => ({
  id: w.id,
  name: w.name,
  category: 'weapon' as const,
  description: w.description,
  sellPrice: getWeaponSellPrice(w.id, null),
  edible: false
}))

/** 戒指图鉴物品 */
const RING_ITEMS: ItemDef[] = RINGS.map(r => ({
  id: r.id,
  name: r.name,
  category: 'ring' as const,
  description: r.description,
  sellPrice: r.sellPrice,
  edible: false
}))

/** 帽子图鉴物品 */
const HAT_ITEMS: ItemDef[] = HATS.map(h => ({
  id: h.id,
  name: h.name,
  category: 'hat' as const,
  description: h.description,
  sellPrice: h.sellPrice,
  edible: false
}))

/** 鞋子图鉴物品 */
const SHOE_ITEMS: ItemDef[] = SHOES.map(s => ({
  id: s.id,
  name: s.name,
  category: 'shoe' as const,
  description: s.description,
  sellPrice: s.sellPrice,
  edible: false
}))

/** 所有物品定义 */
export const ITEMS: ItemDef[] = [
  ...SEED_ITEMS,
  ...CROP_ITEMS,
  ...ORE_ITEMS,
  ...MISC_ITEMS,
  ...FISH_ITEMS,
  ...FOOD_ITEMS,
  ...PROCESSED_ITEMS,
  ...SMOKED_ITEMS,
  ...DRIED_ITEMS,
  ...MACHINE_ITEMS,
  ...SPRINKLER_ITEMS,
  ...FERTILIZER_ITEMS,
  ...BAIT_ITEMS,
  ...TACKLE_ITEMS,
  ...ANIMAL_PRODUCT_ITEMS,
  ...FRUIT_TREE_ITEMS,
  ...SAPLING_ITEMS,
  ...WILD_TREE_ITEMS,
  ...BOMB_ITEMS,
  ...CRAB_POT_ITEMS,
  ...TRUFFLE_OIL_ITEM,
  ...FLOWER_HONEY_ITEMS,
  ...CHEESE_ITEMS,
  ...CLOTH_ITEMS,
  ...BAR_ITEMS,
  ...CHARCOAL_ITEMS,
  ...FLOUR_ITEMS,
  ...TEA_DRINK_ITEMS,
  ...TOFU_ITEMS,
  ...HERB_PRODUCT_ITEMS,
  ...ELIXIR_ITEMS,
  ...ALCHEMY_RESULT_ITEMS,
  ...FEED_ITEMS,
  ...INCENSE_ITEMS,

  // 装备图鉴
  ...WEAPON_ITEMS,
  ...RING_ITEMS,
  ...HAT_ITEMS,
  ...SHOE_ITEMS,

  // 淘金产出
  { id: 'gold_nugget', name: '金砂', category: 'misc', description: '河中淘得的金砂，闪闪发光。', sellPrice: 80, edible: false },

  // ===== 化石 (8) =====
  { id: 'trilobite_fossil', name: '三叶虫化石', category: 'fossil', description: '远古海洋生物的化石。', sellPrice: 120, edible: false },
  { id: 'amber', name: '琥珀', category: 'fossil', description: '凝固了万年的树脂化石。', sellPrice: 150, edible: false },
  { id: 'ammonite_fossil', name: '菊石化石', category: 'fossil', description: '螺旋状的远古海洋化石。', sellPrice: 180, edible: false },
  { id: 'fern_fossil', name: '蕨叶化石', category: 'fossil', description: '保存完好的远古蕨类化石。', sellPrice: 100, edible: false },
  { id: 'shell_fossil', name: '螺壳化石', category: 'fossil', description: '古代软体动物的壳化石。', sellPrice: 90, edible: false },
  { id: 'bone_fragment', name: '骨骸碎片', category: 'fossil', description: '不知名远古生物的骨骸碎片。', sellPrice: 200, edible: false },
  { id: 'petrified_wood', name: '石化木', category: 'fossil', description: '被矿物质替代的远古木材。', sellPrice: 130, edible: false },
  { id: 'dragon_tooth', name: '龙牙化石', category: 'fossil', description: '传说中龙族遗留的牙齿化石。', sellPrice: 350, edible: false },

  // ===== 古物 (10) =====
  { id: 'ancient_pottery', name: '古陶片', category: 'artifact', description: '远古文明留下的陶器碎片。', sellPrice: 100, edible: false },
  { id: 'jade_disc', name: '玉璧残片', category: 'artifact', description: '精美的远古玉璧碎片。', sellPrice: 250, edible: false },
  { id: 'bronze_mirror', name: '铜镜', category: 'artifact', description: '磨制精良的远古铜镜。', sellPrice: 200, edible: false },
  { id: 'ancient_coin', name: '远古铜钱', category: 'artifact', description: '不知名朝代的古铜钱。', sellPrice: 150, edible: false },
  { id: 'oracle_bone', name: '甲骨片', category: 'artifact', description: '刻有卜辞的远古甲骨。', sellPrice: 300, edible: false },
  { id: 'jade_pendant', name: '玉佩', category: 'artifact', description: '温润如玉的远古佩饰。', sellPrice: 220, edible: false },
  {
    id: 'ancient_seed',
    name: '远古种子',
    category: 'artifact',
    description: '蕴含远古生命力的神秘种子，据说能种出远古水果。',
    sellPrice: 400,
    edible: false
  },
  { id: 'bamboo_scroll', name: '竹简', category: 'artifact', description: '刻有古文的竹简残片。', sellPrice: 180, edible: false },
  { id: 'stone_axe_head', name: '石斧头', category: 'artifact', description: '远古先民使用的石斧头。', sellPrice: 120, edible: false },
  { id: 'painted_pottery', name: '彩陶碎片', category: 'artifact', description: '绘有精美纹饰的彩陶碎片。', sellPrice: 200, edible: false },

  // ===== 酒馆物品 =====
  { id: 'tavern_rice_wine', name: '桃源米酒', category: 'processed' as const, description: '桃源乡常见的清甜米酒，入口绵软。', sellPrice: 180, edible: true, staminaRestore: 20, healthRestore: 8 },
  { id: 'tavern_plum_wine', name: '青梅酒', category: 'processed' as const, description: '用青梅酿制的酸甜果酒，回味悠长。', sellPrice: 150, edible: true, staminaRestore: 30, healthRestore: 12 },
  { id: 'tavern_herbal_brew', name: '药草老酒', category: 'processed' as const, description: '浸泡多味草药的陈酿，强筋健体。', sellPrice: 280, edible: true, staminaRestore: 50, healthRestore: 25 },
  { id: 'tavern_snack_plate', name: '小食拼盘', category: 'food' as const, description: '花生、豆干和咸肉的下酒小食，补充体力。', sellPrice: 60, edible: true, staminaRestore: 15, healthRestore: 6 },
  { id: 'tavern_braised_pork', name: '酱猪蹄', category: 'food' as const, description: '慢火炖制的香浓猪蹄，大补体力。', sellPrice: 200, edible: true, staminaRestore: 40, healthRestore: 18 },
  { id: 'tavern_premium_brew', name: '桃源特酿', category: 'processed' as const, description: '酒馆镇店之宝，极其醇厚，喝一杯精力倍增。', sellPrice: 600, edible: true, staminaRestore: 80, healthRestore: 40 },

  // ===== 公会商店物品 =====
  {
    id: 'combat_tonic',
    name: '战斗补剂',
    category: 'food',
    description: '恢复30点HP。',
    sellPrice: 100,
    edible: true,
    staminaRestore: 0,
    healthRestore: 30
  },
  {
    id: 'fortify_brew',
    name: '强化药水',
    category: 'food',
    description: '恢复60点HP。',
    sellPrice: 250,
    edible: true,
    staminaRestore: 0,
    healthRestore: 60
  },
  {
    id: 'ironhide_potion',
    name: '铁壁药剂',
    category: 'food',
    description: '恢复全部HP。',
    sellPrice: 400,
    edible: true,
    staminaRestore: 0,
    healthRestore: 999
  },
  { id: 'slayer_charm', name: '猎魔符', category: 'misc', description: '怪物掉落率+20%（当次探索）。', sellPrice: 750, edible: false },
  {
    id: 'warriors_feast',
    name: '勇者盛宴',
    category: 'food',
    description: '恢复50体力和50HP。',
    sellPrice: 500,
    edible: true,
    staminaRestore: 50,
    healthRestore: 50
  },
  { id: 'monster_lure', name: '怪物诱饵', category: 'misc', description: '本层怪物数量翻倍。', sellPrice: 1000, edible: false },
  { id: 'guild_badge', name: '公会徽章', category: 'misc', description: '攻击力永久+3。', sellPrice: 0, edible: false },
  { id: 'life_talisman', name: '生命护符', category: 'misc', description: '最大生命值永久+15。', sellPrice: 0, edible: false },
  { id: 'defense_charm', name: '守护符', category: 'misc', description: '防御永久+3%。', sellPrice: 0, edible: false },
  {
    id: 'adventurer_ration',
    name: '冒险口粮',
    category: 'food',
    description: '恢复25体力和25HP。',
    sellPrice: 175,
    edible: true,
    staminaRestore: 25,
    healthRestore: 25
  },
  {
    id: 'stamina_elixir',
    name: '精力药剂',
    category: 'food',
    description: '恢复120点体力。',
    sellPrice: 300,
    edible: true,
    staminaRestore: 120,
    healthRestore: 0
  },
  { id: 'lucky_coin', name: '幸运铜钱', category: 'misc', description: '怪物掉落率永久+5%。', sellPrice: 0, edible: false },

  // ===== 瀚海物品 =====
  {
    id: 'hanhai_cactus_seed',
    name: '仙人掌种子',
    category: 'seed',
    description: '来自西域的奇特植物种子，夏季可种植。',
    sellPrice: 250,
    edible: false
  },
  {
    id: 'hanhai_date_seed',
    name: '椰枣种子',
    category: 'seed',
    description: '丝绸之路带来的西域果实种子，夏/秋季可种植。',
    sellPrice: 200,
    edible: false
  },
  { id: 'hanhai_spice', name: '西域香料', category: 'material', description: '异域风情的香料，烹饪佳品。', sellPrice: 150, edible: false },
  { id: 'hanhai_silk', name: '丝绸', category: 'material', description: '细腻光滑的上等丝绸。', sellPrice: 400, edible: false },
  { id: 'hanhai_turquoise', name: '绿松石', category: 'gem', description: '西域特产的珍贵宝石。', sellPrice: 300, edible: false },
  { id: 'hanhai_map', name: '藏宝图', category: 'misc', description: '标记着荒原某处宝藏的地图。', sellPrice: 500, edible: false },
  { id: 'ancient_waybill', name: '驿路关券', category: 'artifact', description: '古驿荒道沿线残存的关券文书，可作为任务和馆务研究的区域素材。', sellPrice: 180, edible: false },
  { id: 'archive_rubbing', name: '残卷拓片', category: 'artifact', description: '从荒道碑刻与旧驿账册拓下的片页，适合用于古迹说明与档案整理。', sellPrice: 220, edible: false },
  { id: 'marsh_spore_sample', name: '湿地孢样', category: 'material', description: '封存在玻璃瓶中的泽地孢子样本，适合研究和展示承接。', sellPrice: 120, edible: false },
  { id: 'luminous_algae', name: '夜光藻团', category: 'material', description: '夜里会发出淡蓝荧光的藻团，是泽地样本线的代表素材。', sellPrice: 160, edible: false },
  { id: 'ley_crystal_shard', name: '灵脉碎晶', category: 'gem', description: '云岚高地灵脉裂隙剥落的碎晶，可作为高阶准备与首领承接素材。', sellPrice: 260, edible: false },
  { id: 'wind_etched_core', name: '风蚀晶核', category: 'material', description: '经历风蚀与高压后保留下来的晶核，是高地区域的高规格战备素材。', sellPrice: 320, edible: false },
  {
    id: 'mega_bomb_recipe',
    name: '巨型炸弹配方',
    category: 'misc',
    description: '据说能炸开整层矿洞的秘方。',
    sellPrice: 2500,
    edible: false
  },

  // ==================== 仙灵物品 ====================
  // 发现线索
  {
    id: 'fox_bead',
    name: '狐珠',
    category: 'misc',
    description: '矿洞深处捡到的赤红色珠子，温热如有生命。',
    sellPrice: 500,
    edible: false
  },

  // 求缘物品
  {
    id: 'dragon_scale_charm',
    name: '龙鳞佩',
    category: 'misc',
    description: '以龙玉雕琢的鳞片形佩饰，蕴含潜渊之力。',
    sellPrice: 0,
    edible: false
  },
  { id: 'blossom_crown', name: '花灵冠', category: 'misc', description: '用永不凋零的桃花编织的花冠。', sellPrice: 0, edible: false },
  { id: 'jade_mortar', name: '玉药杵', category: 'misc', description: '月光石雕成的药杵，与月兔的玉杵成对。', sellPrice: 0, edible: false },
  { id: 'fox_flame_lantern', name: '狐火灯笼', category: 'misc', description: '内含狐火的灯笼，永不熄灭。', sellPrice: 0, edible: false },
  {
    id: 'cultivation_jade',
    name: '修炼玉佩',
    category: 'misc',
    description: '蕴含灵气的玉佩，修行者的信物。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'silver_thread_ring',
    name: '银丝戒',
    category: 'misc',
    description: '用月光银丝编织的戒指，寄托归乡之思。',
    sellPrice: 0,
    edible: false
  },

  // 结缘物品
  {
    id: 'spirit_dragon_pearl',
    name: '龙珠',
    category: 'misc',
    description: '以龙玉、月光石与棱彩碎片炼成的灵珠，是龙族至高的缘定信物。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'eternal_blossom',
    name: '不凋花',
    category: 'misc',
    description: '用至尊桃子、蜂蜜和桂花凝聚而成，永不枯萎的灵花。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'moon_elixir',
    name: '月华丹',
    category: 'misc',
    description: '人参、雪莲与月光石炼制的仙丹，散发柔和的银白色光芒。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'fox_spirit_bead',
    name: '灵狐珠',
    category: 'misc',
    description: '红宝石、月光石与黄金炼成的珠子，封印着狐仙的一缕灵力。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'immortal_gourd',
    name: '仙人葫',
    category: 'misc',
    description: '人参、鹿茸与铱矿炼制的丹葫芦，内蕴五百年修行之力。',
    sellPrice: 0,
    edible: false
  },
  {
    id: 'starlight_loom',
    name: '星光织机',
    category: 'misc',
    description: '蚕丝、月光石与棱彩碎片织成的微型织机，能织出星光般的丝线。',
    sellPrice: 0,
    edible: false
  },

  // 能力产出物品
  {
    id: 'spirit_peach',
    name: '灵桃',
    category: 'misc',
    description: '桃夭赐福的仙桃，散发着灵气。',
    sellPrice: 800,
    edible: true,
    staminaRestore: 50,
    healthRestore: 30
  },
  { id: 'moon_herb', name: '月草', category: 'material', description: '沐浴月华而生的灵草，药效极佳。', sellPrice: 300, edible: false },
  { id: 'dream_silk', name: '梦丝', category: 'material', description: '归女织出的银白丝线，闪烁着星光。', sellPrice: 500, edible: false }
]

/** 根据ID查找物品 */
export const getItemById = (id: string): ItemDef | undefined => {
  return ITEMS.find(i => i.id === id)
}

export type LegacyItemIdMigrationContext =
  | 'general'
  | 'quest_reward'
  | 'quest_combo_tea'
  | 'processing_output'
  | 'hidden_npc_bond'

export const LEGACY_AMBIGUOUS_ITEM_ID_COMPATIBILITY = [
  {
    legacyId: 'osmanthus_tea',
    retainedRuntimeMeaning: '作物：桂花茶',
    splitRuntimeId: 'processed_osmanthus_tea',
    splitRuntimeMeaning: '加工品：制茶机桂花茶',
    migrationRule: '通用背包旧档保留作物身份；任务奖励、茶饮组合与加工产出迁移到 processed_osmanthus_tea。'
  },
  {
    legacyId: 'dragon_pearl',
    retainedRuntimeMeaning: '作物：龙珠',
    splitRuntimeId: 'spirit_dragon_pearl',
    splitRuntimeMeaning: '龙灵结缘信物',
    migrationRule: '通用背包旧档保留作物身份；仙灵炉产出与龙灵结缘配置迁移到 spirit_dragon_pearl。'
  },
  {
    legacyId: 'lychee',
    retainedRuntimeMeaning: '作物：荔枝',
    splitRuntimeId: 'tree_lychee',
    splitRuntimeMeaning: '果树水果：荔枝',
    migrationRule: '通用背包旧档保留作物身份；果树日结新产出使用 tree_lychee。'
  },
  {
    legacyId: 'persimmon',
    retainedRuntimeMeaning: '作物：柿子',
    splitRuntimeId: 'tree_persimmon',
    splitRuntimeMeaning: '果树水果：鲜柿',
    migrationRule: '通用背包旧档保留作物身份；果树日结新产出使用 tree_persimmon。'
  },
  {
    legacyId: 'mulberry',
    retainedRuntimeMeaning: '作物：桑叶',
    splitRuntimeId: 'wild_mulberry',
    splitRuntimeMeaning: '觅食/野树材料：桑葚',
    migrationRule: '通用背包旧档保留作物身份；觅食与野树种植新产出使用 wild_mulberry。'
  }
] as const

export const migrateLegacyItemId = (
  itemId: string,
  context: LegacyItemIdMigrationContext = 'general'
): string => {
  if ((context === 'quest_reward' || context === 'quest_combo_tea' || context === 'processing_output') && itemId === 'osmanthus_tea') {
    return 'processed_osmanthus_tea'
  }
  if ((context === 'processing_output' || context === 'hidden_npc_bond') && itemId === 'dragon_pearl') {
    return 'spirit_dragon_pearl'
  }
  if (context === 'general') return itemId
  return itemId
}

/** 物品分类默认来源 */
const CATEGORY_SOURCE: Record<ItemCategory, string> = {
  seed: '商店购买',
  crop: '种植收获',
  fish: '钓鱼获得',
  ore: '矿洞采集',
  gem: '矿洞采集',
  material: '采集/合成',
  food: '烹饪制作',
  processed: '加工制作',
  elixir: '丹炉炼制',
  machine: '合成制作',
  sprinkler: '合成制作',
  fertilizer: '合成制作',
  bait: '商店购买',
  tackle: '商店购买',
  animal_product: '畜牧产出',
  fruit: '果树收获',
  sapling: '商店购买',
  bomb: '合成制作',
  gift: '采集/商店',
  fossil: '矿洞挖掘',
  artifact: '矿洞挖掘',
  weapon: '商店/掉落',
  ring: '商店/合成',
  hat: '商店/合成',
  shoe: '铁匠铺合成',
  misc: '多种途径'
}

/** 特定物品来源覆写 */
const ITEM_SOURCE_OVERRIDES: Record<string, string> = {
  // 材料类
  wood: '砍树获得',
  stone: '采石 / 矿洞获取',
  bamboo: '砍竹获得',
  manor_edge_bundle: '好友庄园照料：收拾掉落物时获得',
  herb: '山间采集',
  firewood: '砍树获得',
  wild_meat: '竹林采集时惊动野兽后偶尔获得 / 牧场动物取肉',
  pine_cone: '砍树掉落',
  battery: '避雷针（雷雨天气）',
  copper_bar: '熔炉冶炼',
  iron_bar: '熔炉冶炼',
  gold_bar: '熔炉冶炼',
  iridium_bar: '熔炉冶炼',
  bronze_bar: '熔炉合炼',
  refined_quartz: '熔炉提纯',
  mythril_bar: '熔炉合炼',
  charcoal: '窑炉烧制',
  rice_flour: '石磨加工',
  wheat_flour: '石磨加工',
  cornmeal: '石磨加工',
  sesame_powder: '石磨加工',
  dried_persimmon_slice: '晒架 / 脱水机加工',
  dried_vegetable: '晒架加工',
  dried_herb: '晒架加工',
  dried_lotus_seed: '脱水机加工',
  lotus_heart_powder: '药碾加工',
  pickled_radish: '酱缸加工',
  pickled_chili: '酱缸加工',
  candied_peach: '糖渍罐加工',
  cloth: '织布机加工',
  silk_cloth: '织布机加工',
  alpaca_cloth: '织布机加工',
  felt: '织布机加工',
  sweet_potato_filling_feed: '石磨加工',
  pumpkin_pet_rice: '石磨加工',
  sesame_patrol_biscuit: '石磨加工（芝麻粉×1、红薯饱腹粮×1、蜂蜜×1）',
  lotus_heart_cat_treat: '石磨加工（莲心粉×1、桂花×1、蜂蜜×1）',
  spirit_fruit_mooncake: '石磨加工（蜜桃脯×1、月草×1、莲心粉×1）',
  fish_feed: '商店购买 / 磨坊加工（干草×5）/ 回收站（垃圾×4）/ 旅行商人',
  water_purifier: '商店购买 / 旅行商人',
  // 采集类
  wild_mushroom: '矿洞蘑菇层/秋季觅食',
  skull_mushroom: '骷髅矿穴蘑菇层',
  winter_bamboo_shoot: '冬季觅食',
  ginseng: '秋季觅食',
  wild_berry: '夏季觅食',
  camphor_seed: '野树掉落',
  mulberry: '种植收获',
  wild_mulberry: '觅食 / 桑树种植',
  pine_resin: '树液采集器',
  // 野树相关
  tapper: '合成制作',
  lightning_rod: '合成制作',
  // 机器
  scarecrow: '合成制作',
  crab_pot: '合成制作',
  // 蟹笼捕获
  snail: '蟹笼捕获',
  freshwater_shrimp: '蟹笼捕获',
  crab: '蟹笼捕获',
  lobster: '蟹笼捕获',
  cave_shrimp: '蟹笼捕获',
  swamp_crab: '蟹笼捕获',
  trash: '蟹笼捕获',
  driftwood: '蟹笼捕获',
  broken_cd: '蟹笼捕获',
  soggy_newspaper: '蟹笼捕获',
  // 蜂蜜
  chrysanthemum_honey: '蜂箱产出',
  osmanthus_honey: '蜂箱产出',
  rapeseed_honey: '蜂箱产出',
  snow_lotus_honey: '蜂箱产出',
  // 奶酪
  cheese: '奶酪机加工',
  goat_cheese: '奶酪机加工',
  buffalo_cheese: '奶酪机加工',
  yak_cheese: '奶酪机加工',
  // 松露油
  rapeseed_oil: '油坊加工',
  truffle_oil: '榨油机加工',
  // 豆腐
  tofu: '石磨加工',
  peanut_tofu: '石磨加工',
  sesame_paste: '石磨加工',
  // 茶饮
  green_tea_drink: '加工制作',
  guest_green_tea: '制茶机加工',
  chrysanthemum_tea: '加工制作',
  processed_osmanthus_tea: '加工制作',
  ginseng_tea: '加工制作',
  // 礼物
  jade_ring: '商店购买',
  silk_ribbon: '商店购买',
  zhiji_jade: '商店购买',
  wintersweet: '冬季觅食',
  pine_incense: '合成制作',
  camphor_incense: '合成制作',
  osmanthus_incense: '合成制作',
  // 杂货
  rain_totem: '合成制作',
  gold_nugget: '河边淘金',
  // 公会商店
  combat_tonic: '冒险家公会',
  fortify_brew: '冒险家公会',
  ironhide_potion: '冒险家公会',
  warriors_feast: '冒险家公会',
  slayer_charm: '冒险家公会',
  monster_lure: '冒险家公会',
  guild_badge: '冒险家公会',
  life_talisman: '冒险家公会',
  defense_charm: '冒险家公会',
  lucky_coin: '冒险家公会',
  adventurer_ration: '冒险家公会',
  stamina_elixir: '冒险家公会',
  // 瀚海物品
  hanhai_cactus_seed: '瀚海沙漠商人',
  hanhai_date_seed: '瀚海沙漠商人',
  hanhai_spice: '瀚海沙漠商人',
  hanhai_silk: '瀚海沙漠商人',
  hanhai_turquoise: '瀚海沙漠商人',
  hanhai_map: '瀚海沙漠',
  hanhai_fossil: '瀚海沙漠',
  ancient_waybill: '行旅图·古驿荒道',
  archive_rubbing: '行旅图·古驿荒道',
  marsh_spore_sample: '行旅图·蜃潮泽地',
  luminous_algae: '行旅图·蜃潮泽地',
  ley_crystal_shard: '行旅图·云岚高地',
  wind_etched_core: '行旅图·云岚高地',
  mega_bomb_recipe: '瀚海沙漠',
  // 远古种子
  ancient_seed: '矿洞挖掘（可种植）',
  // 草药加工品
  herbal_paste: '加工制作',
  ginseng_extract: '加工制作',
  antler_powder: '加工制作',
  stamina_fruit: '深渊宝箱(极稀有) / 制作',
  // 仙灵相关物品
  fox_bead: '矿洞50层后深层宝箱（狐仙发现线索）',
  spirit_peach: '仙缘能力·灵桃（桃夭）',
  moon_herb: '仙缘能力·月华（月兔）',
  dream_silk: '仙缘能力·梦织（归女）',
  dragon_scale_charm: '制作（龙灵求缘信物）',
  blossom_crown: '制作（桃夭求缘信物）',
  jade_mortar: '制作（月兔求缘信物）',
  fox_flame_lantern: '制作（狐仙求缘信物）',
  cultivation_jade: '制作（山翁求缘信物）',
  silver_thread_ring: '制作（归女求缘信物）',
  spirit_dragon_pearl: '制作（龙灵结缘信物）',
  eternal_blossom: '制作（桃夭结缘信物）',
  moon_elixir: '制作（月兔结缘信物）',
  fox_spirit_bead: '制作（狐仙结缘信物）',
  immortal_gourd: '制作（山翁结缘信物）',
  starlight_loom: '制作（归女结缘信物）'
}

/** 获取物品来源描述 */
export const getItemSource = (itemId: string): string => {
  const override = ITEM_SOURCE_OVERRIDES[itemId]
  if (override) return override
  const def = getItemById(itemId)
  if (!def) return '未知'
  return CATEGORY_SOURCE[def.category]
}

/** 箱子阶梯定义 */
import type { ChestTier } from '@/types'

export const CHEST_DEFS: Record<
  ChestTier,
  {
    name: string
    capacity: number
    craftCost: { itemId: string; quantity: number }[]
    craftMoney: number
    description: string
  }
> = {
  wood: {
    name: '木箱',
    capacity: 9,
    craftCost: [{ itemId: 'wood', quantity: 50 }],
    craftMoney: 500,
    description: '基础储物箱，可存放9格物品。'
  },
  copper: {
    name: '铜箱',
    capacity: 18,
    craftCost: [{ itemId: 'copper_bar', quantity: 15 }],
    craftMoney: 2000,
    description: '坚固的铜制储物箱，可存放18格物品。'
  },
  iron: {
    name: '铁箱',
    capacity: 27,
    craftCost: [
      { itemId: 'iron_bar', quantity: 10 },
      { itemId: 'wood', quantity: 20 }
    ],
    craftMoney: 5000,
    description: '耐用的铁制储物箱，可存放27格物品。'
  },
  gold: {
    name: '金箱',
    capacity: 36,
    craftCost: [
      { itemId: 'gold_bar', quantity: 8 },
      { itemId: 'iron_bar', quantity: 5 }
    ],
    craftMoney: 10000,
    description: '华贵的金制储物箱，可存放36格物品。'
  },
  void: {
    name: '虚空箱',
    capacity: 27,
    craftCost: [
      { itemId: 'iridium_bar', quantity: 5 },
      { itemId: 'void_ore', quantity: 20 }
    ],
    craftMoney: 25000,
    description: '可远程存取，并可设为作坊原料箱/成品箱。容量27格。'
  }
}

/** 箱子阶梯顺序 */
export const CHEST_TIER_ORDER: ChestTier[] = ['wood', 'copper', 'iron', 'gold', 'void']
