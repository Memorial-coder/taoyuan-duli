import type { RecipeDef } from '@/types'

/** 所有食谱定义 */
export const RECIPES: RecipeDef[] = [
  {
    id: 'stir_fried_cabbage',
    name: '炒青菜',
    ingredients: [{ itemId: 'cabbage', quantity: 2 }],
    effect: { staminaRestore: 15, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '简单朴素的家常菜。'
  },
  {
    id: 'radish_soup',
    name: '萝卜汤',
    ingredients: [
      { itemId: 'radish', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 10 },
    unlockSource: '陈伯好感「相识」',
    description: '热腾腾的萝卜汤，暖身又暖心。'
  },
  {
    id: 'braised_carp',
    name: '红烧鲤鱼',
    ingredients: [
      { itemId: 'carp', quantity: 1 },
      { itemId: 'sesame', quantity: 2 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 15,
      buff: { type: 'fishing', value: 1, description: '钓鱼技能+1（当天）' }
    },
    unlockSource: '秋月好感「相识」',
    description: '鲜香可口的红烧鲤鱼。'
  },
  {
    id: 'herbal_porridge',
    name: '药膳粥',
    ingredients: [
      { itemId: 'herb', quantity: 2 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: { staminaRestore: 40, healthRestore: 20 },
    unlockSource: '林老好感「相识」',
    description: '调理身体的药膳粥。'
  },
  {
    id: 'osmanthus_cake',
    name: '桂花糕',
    ingredients: [
      { itemId: 'osmanthus', quantity: 3 },
      { itemId: 'rice', quantity: 2 }
    ],
    effect: {
      staminaRestore: 20,
      healthRestore: 5,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '柳娘好感「相识」',
    description: '精致的桂花糕，送礼极佳。'
  },
  {
    id: 'miner_lunch',
    name: '矿工便当',
    ingredients: [
      { itemId: 'potato', quantity: 2 },
      { itemId: 'sweet_potato', quantity: 1 }
    ],
    effect: {
      staminaRestore: 25,
      healthRestore: 25,
      buff: { type: 'mining', value: 20, description: '挖矿体力消耗-20%（当天）' }
    },
    unlockSource: '阿石好感「相识」',
    description: '实打实的矿工饭。'
  },
  {
    id: 'spicy_hotpot',
    name: '麻辣火锅',
    ingredients: [
      { itemId: 'chili', quantity: 2 },
      { itemId: 'cabbage', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 40,
      buff: { type: 'defense', value: 20, description: '受到伤害-20%（当天）' }
    },
    unlockSource: '烹饪等级4',
    requiredSkill: { type: 'farming', level: 4 },
    description: '火辣辣的麻辣火锅，驱寒暖身。'
  },
  {
    id: 'steamed_bass',
    name: '清蒸鲈鱼',
    ingredients: [
      { itemId: 'bass', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'fishing', value: 2, description: '钓鱼技能+2（当天）' }
    },
    unlockSource: '钓鱼等级3',
    requiredSkill: { type: 'fishing', level: 3 },
    description: '鲜嫩的清蒸鲈鱼。'
  },
  {
    id: 'honey_tea',
    name: '蜂蜜茶',
    ingredients: [
      { itemId: 'honey', quantity: 1 },
      { itemId: 'herb', quantity: 1 }
    ],
    effect: { staminaRestore: 30, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '甜蜜温润的蜂蜜茶。'
  },
  {
    id: 'ginger_soup',
    name: '姜汤',
    ingredients: [
      { itemId: 'ginger', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 20,
      healthRestore: 10,
      buff: { type: 'speed', value: 15, description: '行动速度+15%（当天）' }
    },
    unlockSource: '初始自带',
    description: '驱寒暖胃的姜汤。'
  },
  {
    id: 'jujube_cake',
    name: '红枣糕',
    ingredients: [
      { itemId: 'jujube', quantity: 3 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: { staminaRestore: 35, healthRestore: 15 },
    unlockSource: '烹饪等级2',
    requiredSkill: { type: 'farming', level: 2 },
    description: '香甜软糯的红枣糕。'
  },
  {
    id: 'peach_blossom_cake',
    name: '桃花饼',
    ingredients: [
      { itemId: 'peach', quantity: 2 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 25,
      healthRestore: 10,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '烹饪等级3',
    requiredSkill: { type: 'farming', level: 3 },
    description: '春日限定的桃花饼。'
  },
  {
    id: 'fish_noodle',
    name: '鱼汤面',
    ingredients: [
      { itemId: 'crucian', quantity: 1 },
      { itemId: 'winter_wheat', quantity: 2 }
    ],
    effect: { staminaRestore: 30, healthRestore: 15 },
    unlockSource: '钓鱼等级2',
    requiredSkill: { type: 'fishing', level: 2 },
    description: '鲜美的鱼汤面。'
  },
  {
    id: 'miner_iron_pot',
    name: '矿工铁锅饭',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'copper_ore', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 30,
      buff: { type: 'mining', value: 25, description: '挖矿体力消耗-25%（当天）' }
    },
    unlockSource: '挖矿等级4',
    requiredSkill: { type: 'mining', level: 4 },
    description: '矿工们的铁锅大杂烩。'
  },
  {
    id: 'bamboo_shoot_stir_fry',
    name: '冬笋炒肉',
    ingredients: [
      { itemId: 'winter_bamboo_shoot', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '鲜香的冬笋炒肉片。'
  },
  {
    id: 'dried_persimmon',
    name: '柿饼',
    ingredients: [{ itemId: 'persimmon', quantity: 3 }],
    effect: { staminaRestore: 20, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '晒干的柿饼，甘甜绵密。'
  },
  {
    id: 'lotus_seed_soup',
    name: '莲子羹',
    ingredients: [
      { itemId: 'lotus_seed', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'luck', value: 15, description: '幸运+15%（当天）' }
    },
    unlockSource: '烹饪等级5',
    requiredSkill: { type: 'farming', level: 5 },
    description: '清心安神的莲子羹。'
  },
  {
    id: 'sesame_paste',
    name: '芝麻糊',
    ingredients: [
      { itemId: 'sesame', quantity: 3 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: { staminaRestore: 30, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '浓郁香滑的芝麻糊。'
  },
  {
    id: 'ginseng_soup',
    name: '人参汤',
    ingredients: [
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 30,
      buff: { type: 'farming', value: 20, description: '农耕体力消耗-20%（当天）' }
    },
    unlockSource: '采集等级5',
    requiredSkill: { type: 'foraging', level: 5 },
    description: '滋补元气的人参汤。'
  },
  {
    id: 'corn_pancake',
    name: '玉米烙',
    ingredients: [
      { itemId: 'corn', quantity: 2 },
      { itemId: 'sesame_oil', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '金黄酥脆的玉米烙。'
  },
  {
    id: 'osmanthus_lotus_root',
    name: '桂花藕粉',
    ingredients: [
      { itemId: 'osmanthus', quantity: 1 },
      { itemId: 'lotus_root', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'luck', value: 10, description: '幸运+10%（当天）' }
    },
    unlockSource: '烹饪等级3',
    requiredSkill: { type: 'farming', level: 3 },
    description: '清香四溢的桂花藕粉。'
  },

  // ==================== 新增初始食谱 (8) ====================
  {
    id: 'scrambled_egg_rice',
    name: '蛋炒饭',
    ingredients: [
      { itemId: 'egg', quantity: 1 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: { staminaRestore: 20, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '简单可口的蛋炒饭。'
  },
  {
    id: 'stir_fried_potato',
    name: '炒土豆丝',
    ingredients: [{ itemId: 'potato', quantity: 2 }],
    effect: { staminaRestore: 18, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '酸辣爽脆的炒土豆丝。'
  },
  {
    id: 'boiled_egg',
    name: '水煮蛋',
    ingredients: [{ itemId: 'egg', quantity: 2 }],
    effect: { staminaRestore: 15, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '最朴实的营养来源。'
  },
  {
    id: 'congee',
    name: '白粥',
    ingredients: [{ itemId: 'rice', quantity: 2 }],
    effect: { staminaRestore: 15, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '清淡养胃的白粥。'
  },
  {
    id: 'rice_ball',
    name: '饭团',
    ingredients: [{ itemId: 'rice', quantity: 1 }],
    effect: { staminaRestore: 12, healthRestore: 3 },
    unlockSource: '初始自带',
    description: '简单捏制的米饭团子，方便携带。'
  },
  {
    id: 'steamed_bun',
    name: '馒头',
    ingredients: [{ itemId: 'wheat_flour', quantity: 1 }],
    effect: { staminaRestore: 12, healthRestore: 3 },
    unlockSource: '初始自带',
    description: '松软的白面馒头，最朴素的主食。'
  },
  {
    id: 'roasted_sweet_potato',
    name: '烤红薯',
    ingredients: [{ itemId: 'sweet_potato', quantity: 2 }],
    effect: { staminaRestore: 20, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '香甜绵软的烤红薯。'
  },
  {
    id: 'vegetable_soup',
    name: '田园蔬菜汤',
    ingredients: [
      { itemId: 'cabbage', quantity: 1 },
      { itemId: 'radish', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '新鲜蔬菜熬制的清汤。'
  },
  {
    id: 'chive_egg_stir_fry',
    name: '韭菜炒蛋',
    ingredients: [
      { itemId: 'chives', quantity: 2 },
      { itemId: 'egg', quantity: 1 }
    ],
    effect: { staminaRestore: 22, healthRestore: 10 },
    unlockSource: '初始自带',
    description: '韭菜与鸡蛋的经典搭配。'
  },
  {
    id: 'peanut_candy',
    name: '花生糖',
    ingredients: [
      { itemId: 'peanut', quantity: 3 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: { staminaRestore: 18, healthRestore: 5 },
    unlockSource: '初始自带',
    description: '酥脆香甜的花生糖。'
  },

  // ==================== NPC 好感食谱 — 相识 (1 新) ====================
  {
    id: 'sweet_osmanthus_tea',
    name: '桂花甜茶',
    ingredients: [
      { itemId: 'osmanthus', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 20,
      healthRestore: 5,
      buff: { type: 'luck', value: 10, description: '幸运+10%（当天）' }
    },
    unlockSource: '小满好感「相识」',
    description: '芬芳甜蜜的桂花甜茶。'
  },

  // ==================== NPC 好感食谱 — 相知 (6) ====================
  {
    id: 'aged_radish_stew',
    name: '老萝卜炖肉',
    ingredients: [
      { itemId: 'radish', quantity: 3 },
      { itemId: 'firewood', quantity: 2 }
    ],
    effect: { staminaRestore: 40, healthRestore: 25 },
    unlockSource: '陈伯好感「相知」',
    description: '陈伯秘传的萝卜炖肉，入味三分。'
  },
  {
    id: 'maple_grilled_fish',
    name: '枫叶烤鱼',
    ingredients: [
      { itemId: 'mandarin_fish', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 20,
      buff: { type: 'fishing', value: 2, description: '钓鱼技能+2（当天）' }
    },
    unlockSource: '秋月好感「相知」',
    description: '秋月独创的枫叶烤鱼法。'
  },
  {
    id: 'herbal_pill',
    name: '百草丹',
    ingredients: [
      { itemId: 'herb', quantity: 3 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    effect: { staminaRestore: 60, healthRestore: 30 },
    unlockSource: '林老好感「相知」',
    description: '林老配方的百草良药。'
  },
  {
    id: 'embroidered_cake',
    name: '绣囊糕',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'osmanthus', quantity: 2 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 15,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '柳娘好感「相知」',
    description: '柳娘精心制作的绣囊糕。'
  },
  {
    id: 'deep_mine_stew',
    name: '深矿炖菜',
    ingredients: [
      { itemId: 'potato', quantity: 2 },
      { itemId: 'copper_ore', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 35,
      buff: { type: 'mining', value: 30, description: '挖矿体力消耗-30%（当天）' }
    },
    unlockSource: '阿石好感「相知」',
    description: '阿石在矿洞深处发明的炖菜。'
  },
  {
    id: 'wild_berry_jam',
    name: '野果酱',
    ingredients: [
      { itemId: 'wild_berry', quantity: 3 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 25,
      healthRestore: 10,
      buff: { type: 'speed', value: 20, description: '行动速度+20%（当天）' }
    },
    unlockSource: '小满好感「相知」',
    description: '小满用林中野果做的果酱。'
  },

  // ==================== NPC 好感食谱 — 挚友 (6) ====================
  {
    id: 'farmers_feast',
    name: '农家盛宴',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'cabbage', quantity: 2 },
      { itemId: 'egg', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 40,
      buff: { type: 'farming', value: 25, description: '农耕体力消耗-25%（当天）' }
    },
    unlockSource: '陈伯好感「挚友」',
    description: '陈伯压箱底的农家大菜。'
  },
  {
    id: 'autumn_moon_feast',
    name: '秋月宴',
    ingredients: [
      { itemId: 'mandarin_fish', quantity: 1 },
      { itemId: 'river_crab', quantity: 1 },
      { itemId: 'osmanthus', quantity: 2 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 30,
      buff: { type: 'luck', value: 20, description: '幸运+20%（当天）' }
    },
    unlockSource: '秋月好感「挚友」',
    description: '秋月为挚友备的秋夜佳宴。'
  },
  {
    id: 'longevity_soup',
    name: '长生汤',
    ingredients: [
      { itemId: 'ginseng', quantity: 2 },
      { itemId: 'herb', quantity: 3 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: { staminaRestore: 80, healthRestore: 40 },
    unlockSource: '林老好感「挚友」',
    description: '林老毕生心血的养生秘方。'
  },
  {
    id: 'lovers_pastry',
    name: '鸳鸯酥',
    ingredients: [
      { itemId: 'peach', quantity: 2 },
      { itemId: 'rice', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 20,
      buff: { type: 'giftBonus', value: 3, description: '送礼好感×3（当天）' }
    },
    unlockSource: '柳娘好感「挚友」',
    description: '柳娘专为有情人做的鸳鸯酥。'
  },
  {
    id: 'forgemasters_meal',
    name: '锻造师套餐',
    ingredients: [
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'potato', quantity: 3 },
      { itemId: 'firewood', quantity: 2 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 50,
      buff: { type: 'defense', value: 25, description: '受到伤害-25%（当天）' }
    },
    unlockSource: '阿石好感「挚友」',
    description: '阿石独创的锻造师能量餐。'
  },
  {
    id: 'spirit_fruit_wine',
    name: '灵果酒',
    ingredients: [
      { itemId: 'wild_berry', quantity: 3 },
      { itemId: 'honey', quantity: 2 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25,
      buff: { type: 'luck', value: 25, description: '幸运+25%（当天）' }
    },
    unlockSource: '小满好感「挚友」',
    description: '小满用灵果酿的幸运酒。'
  },

  // ==================== NPC 结婚食谱 (12) ====================
  {
    id: 'phoenix_cake',
    name: '凤凰糕',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'osmanthus', quantity: 2 },
      { itemId: 'jujube', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25,
      buff: { type: 'giftBonus', value: 3, description: '送礼好感×3（当天）' }
    },
    unlockSource: '与柳娘结婚后',
    description: '柳娘婚后传授的凤凰糕秘方。'
  },
  {
    id: 'molten_hotpot',
    name: '熔岩铁锅',
    ingredients: [
      { itemId: 'iron_ore', quantity: 3 },
      { itemId: 'chili', quantity: 2 },
      { itemId: 'potato', quantity: 2 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 50,
      buff: { type: 'mining', value: 35, description: '挖矿体力消耗-35%（当天）' }
    },
    unlockSource: '与阿石结婚后',
    description: '阿石婚后教你的熔岩铁锅料理。'
  },
  {
    id: 'moonlight_sashimi',
    name: '月下刺身',
    ingredients: [
      { itemId: 'sturgeon', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 20,
      buff: { type: 'fishing', value: 3, description: '钓鱼技能+3（当天）' }
    },
    unlockSource: '与秋月结婚后',
    description: '秋月婚后分享的月下刺身。'
  },
  {
    id: 'tea_banquet',
    name: '茶宴八珍',
    ingredients: [
      { itemId: 'tea', quantity: 3 },
      { itemId: 'lotus_seed', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 30,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '与春兰结婚后',
    description: '春兰婚后传授的茶宴配方，以茶入馔。'
  },
  {
    id: 'snow_plum_soup',
    name: '雪梅羹',
    ingredients: [
      { itemId: 'snow_lotus', quantity: 1 },
      { itemId: 'honey', quantity: 2 }
    ],
    effect: {
      staminaRestore: 65,
      healthRestore: 35,
      buff: { type: 'luck', value: 3, description: '幸运+3（当天）' }
    },
    unlockSource: '与雪芹结婚后',
    description: '雪芹婚后分享的画室私房羹汤。'
  },
  {
    id: 'silk_dumpling',
    name: '锦囊玉饺',
    ingredients: [
      { itemId: 'silk', quantity: 1 },
      { itemId: 'rice', quantity: 2 },
      { itemId: 'cabbage', quantity: 2 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '与素素结婚后',
    description: '素素婚后教你包的精致饺子，形如锦囊。'
  },
  {
    id: 'drunken_chicken',
    name: '醉仙鸡',
    ingredients: [
      { itemId: 'egg', quantity: 3 },
      { itemId: 'peach_wine', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 40,
      buff: { type: 'farming', value: 30, description: '农作体力消耗-30%（当天）' }
    },
    unlockSource: '与红豆结婚后',
    description: '红豆婚后传授的酒香名菜。'
  },
  {
    id: 'scholars_porridge',
    name: '文曲星粥',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'tea', quantity: 1 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 30,
      buff: { type: 'speed', value: 2, description: '移动速度+2（当天）' }
    },
    unlockSource: '与丹青结婚后',
    description: '丹青婚后按古方熬煮的养心粥。'
  },
  {
    id: 'ironforge_stew',
    name: '铁匠炖',
    ingredients: [
      { itemId: 'potato', quantity: 3 },
      { itemId: 'corn', quantity: 2 },
      { itemId: 'iron_ore', quantity: 1 }
    ],
    effect: {
      staminaRestore: 80,
      healthRestore: 50,
      buff: { type: 'mining', value: 40, description: '挖矿体力消耗-40%（当天）' }
    },
    unlockSource: '与阿铁结婚后',
    description: '阿铁婚后做的粗犷炖菜，量大管饱。'
  },
  {
    id: 'hunters_roast',
    name: '猎人烤',
    ingredients: [
      { itemId: 'wild_mushroom', quantity: 3 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'pine_cone', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 45,
      buff: { type: 'defense', value: 3, description: '防御+3（当天）' }
    },
    unlockSource: '与云飞结婚后',
    description: '云飞婚后教你的山野烤法。'
  },
  {
    id: 'ranch_milk_soup',
    name: '牧场鲜奶汤',
    ingredients: [
      { itemId: 'milk', quantity: 2 },
      { itemId: 'corn', quantity: 2 },
      { itemId: 'sweet_potato', quantity: 1 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 35,
      buff: { type: 'farming', value: 25, description: '农作体力消耗-25%（当天）' }
    },
    unlockSource: '与大牛结婚后',
    description: '大牛婚后常做的香浓奶汤。'
  },
  {
    id: 'moonlit_tea_rice',
    name: '月下茶泡饭',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'tea', quantity: 2 },
      { itemId: 'bamboo_shoot', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 20,
      buff: { type: 'luck', value: 2, description: '幸运+2（当天）' }
    },
    unlockSource: '与墨白结婚后',
    description: '墨白婚后常在月下泡的清淡茶饭。'
  },

  // ==================== 农耕技能食谱 (3 新) ====================
  {
    id: 'pumpkin_pie',
    name: '南瓜饼',
    ingredients: [
      { itemId: 'pumpkin', quantity: 2 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'farming', value: 15, description: '农耕体力消耗-15%（当天）' }
    },
    unlockSource: '农耕等级6',
    requiredSkill: { type: 'farming', level: 6 },
    description: '金黄松软的南瓜饼。'
  },
  {
    id: 'golden_fried_rice',
    name: '黄金炒饭',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'egg', quantity: 2 },
      { itemId: 'corn', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'farming', value: 20, description: '农耕体力消耗-20%（当天）' }
    },
    unlockSource: '农耕等级7',
    requiredSkill: { type: 'farming', level: 7 },
    description: '粒粒金黄的炒饭。'
  },
  {
    id: 'supreme_farm_feast',
    name: '田园盛筵',
    ingredients: [
      { itemId: 'pumpkin', quantity: 1 },
      { itemId: 'watermelon', quantity: 1 },
      { itemId: 'corn', quantity: 1 },
      { itemId: 'rice', quantity: 2 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 35,
      buff: { type: 'farming', value: 30, description: '农耕体力消耗-30%（当天）' }
    },
    unlockSource: '农耕等级9',
    requiredSkill: { type: 'farming', level: 9 },
    description: '集四季精华的田园盛筵。'
  },

  // ==================== 钓鱼技能食谱 (5 新) ====================
  {
    id: 'braised_catfish',
    name: '红烧鲶鱼',
    ingredients: [
      { itemId: 'catfish', quantity: 1 },
      { itemId: 'chili', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'fishing', value: 1, description: '钓鱼技能+1（当天）' }
    },
    unlockSource: '钓鱼等级4',
    requiredSkill: { type: 'fishing', level: 4 },
    description: '辣味十足的红烧鲶鱼。'
  },
  {
    id: 'grilled_eel',
    name: '烤鳗鱼',
    ingredients: [
      { itemId: 'eel', quantity: 1 },
      { itemId: 'sesame', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'fishing', value: 2, description: '钓鱼技能+2（当天）' }
    },
    unlockSource: '钓鱼等级5',
    requiredSkill: { type: 'fishing', level: 5 },
    description: '外焦里嫩的烤鳗鱼。'
  },
  {
    id: 'crab_soup',
    name: '蟹黄汤',
    ingredients: [
      { itemId: 'river_crab', quantity: 2 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25,
      buff: { type: 'luck', value: 15, description: '幸运+15%（当天）' }
    },
    unlockSource: '钓鱼等级6',
    requiredSkill: { type: 'fishing', level: 6 },
    description: '鲜美浓郁的蟹黄汤。'
  },
  {
    id: 'sturgeon_stew',
    name: '鲟鱼羹',
    ingredients: [
      { itemId: 'sturgeon', quantity: 1 },
      { itemId: 'herb', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 30,
      buff: { type: 'fishing', value: 3, description: '钓鱼技能+3（当天）' }
    },
    unlockSource: '钓鱼等级7',
    requiredSkill: { type: 'fishing', level: 7 },
    description: '珍贵的鲟鱼炖羹。'
  },
  {
    id: 'dragon_sashimi',
    name: '龙鱼刺身',
    ingredients: [
      { itemId: 'dragonfish', quantity: 1 },
      { itemId: 'ginger', quantity: 2 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 35,
      buff: { type: 'fishing', value: 4, description: '钓鱼技能+4（当天）' }
    },
    unlockSource: '钓鱼等级8',
    requiredSkill: { type: 'fishing', level: 8 },
    description: '传说龙鱼制成的极品刺身。'
  },

  // ==================== 采矿技能食谱 (5 新) ====================
  {
    id: 'stone_soup',
    name: '矿石汤',
    ingredients: [
      { itemId: 'copper_ore', quantity: 2 },
      { itemId: 'radish', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 20 },
    unlockSource: '采矿等级3',
    requiredSkill: { type: 'mining', level: 3 },
    description: '矿洞中就地取材的汤。'
  },
  {
    id: 'crystal_jelly',
    name: '水晶冻',
    ingredients: [
      { itemId: 'crystal_ore', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 25,
      buff: { type: 'mining', value: 25, description: '挖矿体力消耗-25%（当天）' }
    },
    unlockSource: '采矿等级5',
    requiredSkill: { type: 'mining', level: 5 },
    description: '晶莹剔透的水晶冻。'
  },
  {
    id: 'iron_tonic',
    name: '铁骨汤',
    ingredients: [
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 35,
      buff: { type: 'defense', value: 20, description: '受到伤害-20%（当天）' }
    },
    unlockSource: '采矿等级6',
    requiredSkill: { type: 'mining', level: 6 },
    description: '强筋健骨的铁骨汤。'
  },
  {
    id: 'gold_dumpling',
    name: '金矿饺',
    ingredients: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'winter_wheat', quantity: 2 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 30,
      buff: { type: 'mining', value: 30, description: '挖矿体力消耗-30%（当天）' }
    },
    unlockSource: '采矿等级7',
    requiredSkill: { type: 'mining', level: 7 },
    description: '金粉入馅的矿工饺子。'
  },
  {
    id: 'void_essence_soup',
    name: '虚空精华汤',
    ingredients: [
      { itemId: 'void_ore', quantity: 1 },
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'herb', quantity: 2 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 40,
      buff: { type: 'mining', value: 35, description: '挖矿体力消耗-35%（当天）' }
    },
    unlockSource: '采矿等级8',
    requiredSkill: { type: 'mining', level: 8 },
    description: '虚空矿石炼制的神秘汤剂。'
  },

  // ==================== 采集技能食谱 (4 新) ====================
  {
    id: 'wild_salad',
    name: '野菜沙拉',
    ingredients: [
      { itemId: 'herb', quantity: 2 },
      { itemId: 'wild_berry', quantity: 1 }
    ],
    effect: { staminaRestore: 20, healthRestore: 10 },
    unlockSource: '采集等级3',
    requiredSkill: { type: 'foraging', level: 3 },
    description: '山间新鲜野菜拌成的沙拉。'
  },
  {
    id: 'mushroom_stew',
    name: '蘑菇炖',
    ingredients: [
      { itemId: 'wild_mushroom', quantity: 3 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 20,
      buff: { type: 'speed', value: 15, description: '行动速度+15%（当天）' }
    },
    unlockSource: '采集等级4',
    requiredSkill: { type: 'foraging', level: 4 },
    description: '野生蘑菇慢炖的浓汤。'
  },
  {
    id: 'forest_tonic',
    name: '林间补药',
    ingredients: [
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'wild_mushroom', quantity: 2 },
      { itemId: 'herb', quantity: 2 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 30,
      buff: { type: 'farming', value: 20, description: '农耕体力消耗-20%（当天）' }
    },
    unlockSource: '采集等级7',
    requiredSkill: { type: 'foraging', level: 7 },
    description: '林中珍材熬制的补药。'
  },
  {
    id: 'spirit_herb_elixir',
    name: '灵草秘药',
    ingredients: [
      { itemId: 'ginseng', quantity: 2 },
      { itemId: 'herb', quantity: 3 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 80,
      healthRestore: 40,
      buff: { type: 'luck', value: 25, description: '幸运+25%（当天）' }
    },
    unlockSource: '采集等级9',
    requiredSkill: { type: 'foraging', level: 9 },
    description: '采集大师秘传的灵草药剂。'
  },

  // ==================== 战斗技能食谱 (5 新) ====================
  {
    id: 'warrior_ration',
    name: '战士口粮',
    ingredients: [
      { itemId: 'potato', quantity: 2 },
      { itemId: 'egg', quantity: 1 }
    ],
    effect: { staminaRestore: 25, healthRestore: 25 },
    unlockSource: '战斗等级3',
    requiredSkill: { type: 'combat', level: 3 },
    description: '简单实用的战士口粮。'
  },
  {
    id: 'battle_stew',
    name: '战斗炖菜',
    ingredients: [
      { itemId: 'chili', quantity: 1 },
      { itemId: 'potato', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 30,
      buff: { type: 'defense', value: 15, description: '受到伤害-15%（当天）' }
    },
    unlockSource: '战斗等级4',
    requiredSkill: { type: 'combat', level: 4 },
    description: '提升战斗力的辛辣炖菜。'
  },
  {
    id: 'iron_fist_soup',
    name: '铁拳汤',
    ingredients: [
      { itemId: 'iron_ore', quantity: 1 },
      { itemId: 'chili', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 35,
      buff: { type: 'defense', value: 20, description: '受到伤害-20%（当天）' }
    },
    unlockSource: '战斗等级5',
    requiredSkill: { type: 'combat', level: 5 },
    description: '拳师专用的铁拳汤。'
  },
  {
    id: 'shadow_brew',
    name: '暗影酿',
    ingredients: [
      { itemId: 'shadow_ore', quantity: 1 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 55,
      healthRestore: 40,
      buff: { type: 'defense', value: 25, description: '受到伤害-25%（当天）' }
    },
    unlockSource: '战斗等级7',
    requiredSkill: { type: 'combat', level: 7 },
    description: '暗影矿石酿制的神秘饮品。'
  },
  {
    id: 'void_elixir',
    name: '虚空药剂',
    ingredients: [
      { itemId: 'void_ore', quantity: 1 },
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'shadow_ore', quantity: 1 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 50,
      buff: { type: 'defense', value: 30, description: '受到伤害-30%（当天）' }
    },
    unlockSource: '战斗等级9',
    requiredSkill: { type: 'combat', level: 9 },
    description: '战斗大师炼制的终极药剂。'
  },

  // ==================== 季节节日食谱 (4) ====================
  {
    id: 'spring_roll',
    name: '春卷',
    ingredients: [
      { itemId: 'cabbage', quantity: 2 },
      { itemId: 'bamboo_shoot', quantity: 1 },
      { itemId: 'sesame_oil', quantity: 1 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 15,
      buff: { type: 'speed', value: 15, description: '行动速度+15%（当天）' }
    },
    unlockSource: '春耕祭奖励',
    description: '春耕祭传统的春卷。'
  },
  {
    id: 'lotus_lantern_cake',
    name: '荷灯糕',
    ingredients: [
      { itemId: 'lotus_seed', quantity: 2 },
      { itemId: 'rice', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 20,
      buff: { type: 'luck', value: 15, description: '幸运+15%（当天）' }
    },
    unlockSource: '荷灯节奖励',
    description: '荷灯节限定的荷灯糕。'
  },
  {
    id: 'harvest_feast',
    name: '丰收盛宴',
    ingredients: [
      { itemId: 'pumpkin', quantity: 1 },
      { itemId: 'sweet_potato', quantity: 1 },
      { itemId: 'corn', quantity: 1 },
      { itemId: 'firewood', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25,
      buff: { type: 'farming', value: 20, description: '农耕体力消耗-20%（当天）' }
    },
    unlockSource: '丰收宴奖励',
    description: '丰收宴上的传统大菜。'
  },
  {
    id: 'new_year_dumpling',
    name: '年夜饺',
    ingredients: [
      { itemId: 'winter_wheat', quantity: 3 },
      { itemId: 'napa_cabbage', quantity: 2 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 30,
      buff: { type: 'luck', value: 20, description: '幸运+20%（当天）' }
    },
    unlockSource: '除夕守岁奖励',
    description: '除夕夜包的幸运饺子。'
  },

  // ==================== 新增节日食谱 (10) ====================
  {
    id: 'nian_gao',
    name: '年糕',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 15,
      buff: { type: 'farming', value: 10, description: '农耕体力消耗-10%（当天）' }
    },
    unlockSource: '元日奖励',
    description: '「年年高」的吉祥年糕。'
  },
  {
    id: 'hua_gao',
    name: '花糕',
    ingredients: [
      { itemId: 'peach', quantity: 2 },
      { itemId: 'rice', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 10,
      buff: { type: 'luck', value: 10, description: '幸运+10%（当天）' }
    },
    unlockSource: '花朝节奖励',
    description: '以鲜花入馅的精致糕点。'
  },
  {
    id: 'qing_tuan',
    name: '青团',
    ingredients: [
      { itemId: 'herb', quantity: 2 },
      { itemId: 'rice', quantity: 2 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 10,
      buff: { type: 'farming', value: 15, description: '农耕体力消耗-15%（当天）' }
    },
    unlockSource: '上巳踏青奖励',
    description: '草药清香的踏青小食。'
  },
  {
    id: 'yue_bing',
    name: '月饼',
    ingredients: [
      { itemId: 'lotus_seed', quantity: 2 },
      { itemId: 'sesame_oil', quantity: 1 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'luck', value: 15, description: '幸运+15%（当天）' }
    },
    unlockSource: '中秋赏月奖励',
    description: '月圆之夜的莲蓉月饼。'
  },
  {
    id: 'la_ba_zhou',
    name: '腊八粥',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'peanut', quantity: 1 },
      { itemId: 'wild_berry', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25
    },
    unlockSource: '腊八粥会奖励',
    description: '暖胃驱寒的腊八粥。'
  },
  {
    id: 'dragon_boat_zongzi',
    name: '粽子',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'bamboo_shoot', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'speed', value: 10, description: '行动速度+10%（当天）' }
    },
    unlockSource: '端午赛龙舟奖励',
    description: '竹叶清香的端午粽子。'
  },
  {
    id: 'qiao_guo',
    name: '巧果',
    ingredients: [
      { itemId: 'winter_wheat', quantity: 2 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'sesame_oil', quantity: 1 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 10,
      buff: { type: 'fishing', value: 1, description: '钓鱼技能+1（当天）' }
    },
    unlockSource: '七夕猜灯谜奖励',
    description: '七夕乞巧的传统小点。'
  },
  {
    id: 'chrysanthemum_wine',
    name: '菊花酒',
    ingredients: [
      { itemId: 'chrysanthemum', quantity: 3 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 40,
      healthRestore: 20,
      buff: { type: 'luck', value: 12, description: '幸运+12%（当天）' }
    },
    unlockSource: '重阳投壶奖励',
    description: '重阳佳节的菊花酿。'
  },
  {
    id: 'jiaozi',
    name: '冬至饺',
    ingredients: [
      { itemId: 'winter_wheat', quantity: 2 },
      { itemId: 'napa_cabbage', quantity: 2 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'mining', value: 1, description: '矿工技能+1（当天）' }
    },
    unlockSource: '冬至包饺子奖励',
    description: '冬至时节包的暖心饺子。'
  },
  {
    id: 'tangyuan',
    name: '汤圆',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'peanut', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 25,
      buff: { type: 'all_skills', value: 1, description: '全技能+1（当天）' }
    },
    unlockSource: '年末烟花会奖励',
    description: '团团圆圆的花生汤圆。'
  },
  {
    id: 'dou_cha_yin',
    name: '斗茶饮',
    ingredients: [
      { itemId: 'tea', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'all_skills', value: 1, description: '全技能+1（当天）' }
    },
    unlockSource: '斗茶大会奖励',
    description: '斗茶会上的经典茶饮，清香沁脾。'
  },
  {
    id: 'zhi_yuan_gao',
    name: '纸鸢糕',
    ingredients: [
      { itemId: 'rice', quantity: 2 },
      { itemId: 'peach', quantity: 1 },
      { itemId: 'sesame_oil', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'speed', value: 12, description: '行动速度+12%（当天）' }
    },
    unlockSource: '秋风筝会奖励',
    description: '风筝节上的应景糕点，形如纸鸢。'
  },

  // ==================== 成就里程碑食谱 (9) ====================
  {
    id: 'first_catch_soup',
    name: '初钓鱼汤',
    ingredients: [
      { itemId: 'crucian', quantity: 2 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: { staminaRestore: 20, healthRestore: 10 },
    unlockSource: '成就：初次钓鱼',
    description: '第一次钓鱼的纪念汤。'
  },
  {
    id: 'bountiful_porridge',
    name: '百收粥',
    ingredients: [
      { itemId: 'rice', quantity: 3 },
      { itemId: 'jujube', quantity: 2 }
    ],
    effect: { staminaRestore: 40, healthRestore: 20 },
    unlockSource: '成就：收获100次作物',
    description: '庆祝百次丰收的粥。'
  },
  {
    id: 'miners_glory',
    name: '矿工荣光',
    ingredients: [
      { itemId: 'gold_ore', quantity: 1 },
      { itemId: 'egg', quantity: 2 },
      { itemId: 'rice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 30,
      buff: { type: 'mining', value: 25, description: '挖矿体力消耗-25%（当天）' }
    },
    unlockSource: '成就：到达矿洞30层',
    description: '矿工荣耀的象征。'
  },
  {
    id: 'chef_special',
    name: '大厨特供',
    ingredients: [
      { itemId: 'egg', quantity: 2 },
      { itemId: 'honey', quantity: 1 },
      { itemId: 'sesame', quantity: 2 }
    ],
    effect: { staminaRestore: 45, healthRestore: 20 },
    unlockSource: '成就：烹饪20道菜',
    description: '大厨才能做出的特供菜。'
  },
  {
    id: 'social_tea',
    name: '交际花茶',
    ingredients: [
      { itemId: 'osmanthus', quantity: 2 },
      { itemId: 'honey', quantity: 1 }
    ],
    effect: {
      staminaRestore: 30,
      healthRestore: 15,
      buff: { type: 'giftBonus', value: 2, description: '送礼好感×2（当天）' }
    },
    unlockSource: '成就：3位NPC达到相知',
    description: '社交达人的特调花茶。'
  },
  {
    id: 'anglers_platter',
    name: '渔夫拼盘',
    ingredients: [
      { itemId: 'bass', quantity: 1 },
      { itemId: 'creek_shrimp', quantity: 1 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 25,
      buff: { type: 'fishing', value: 2, description: '钓鱼技能+2（当天）' }
    },
    unlockSource: '成就：钓到20条鱼',
    description: '渔夫才能拼出的海鲜拼盘。'
  },
  {
    id: 'legendary_feast',
    name: '传说盛宴',
    ingredients: [
      { itemId: 'jade_dragon', quantity: 1 },
      { itemId: 'ginger', quantity: 2 }
    ],
    effect: {
      staminaRestore: 80,
      healthRestore: 40,
      buff: { type: 'fishing', value: 4, description: '钓鱼技能+4（当天）' }
    },
    unlockSource: '成就：钓到传说鱼',
    description: '用传说之鱼做的极品盛宴。'
  },
  {
    id: 'abyss_stew',
    name: '深渊炖菜',
    ingredients: [
      { itemId: 'shadow_ore', quantity: 1 },
      { itemId: 'crystal_shrimp', quantity: 1 },
      { itemId: 'herb', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 35,
      buff: { type: 'defense', value: 20, description: '受到伤害-20%（当天）' }
    },
    unlockSource: '成就：到达矿洞50层',
    description: '深渊探索者的秘制炖菜。'
  },
  {
    id: 'collectors_banquet',
    name: '收藏家宴',
    ingredients: [
      { itemId: 'ginseng', quantity: 1 },
      { itemId: 'sturgeon', quantity: 1 },
      { itemId: 'pumpkin', quantity: 1 },
      { itemId: 'rice', quantity: 2 }
    ],
    effect: {
      staminaRestore: 80,
      healthRestore: 40,
      buff: { type: 'luck', value: 25, description: '幸运+25%（当天）' }
    },
    unlockSource: '成就：发现50种物品',
    description: '用珍稀食材做的收藏家宴。'
  },
  // ===== 新增：动物产品食谱 =====
  {
    id: 'silkie_egg_soup',
    name: '乌鸡蛋羹',
    ingredients: [
      { itemId: 'silkie_egg', quantity: 2 },
      { itemId: 'ginger', quantity: 1 }
    ],
    effect: { staminaRestore: 50, healthRestore: 30 },
    unlockSource: '初始自带',
    description: '滋补养生的乌鸡蛋羹。'
  },
  {
    id: 'goat_milk_soup',
    name: '羊奶汤',
    ingredients: [
      { itemId: 'goat_milk', quantity: 2 },
      { itemId: 'herb', quantity: 1 }
    ],
    effect: { staminaRestore: 45, healthRestore: 25 },
    unlockSource: '大牛好感「挚友」',
    description: '温热醇厚的羊奶汤。'
  },
  {
    id: 'truffle_fried_rice',
    name: '松露炒饭',
    ingredients: [
      { itemId: 'truffle', quantity: 1 },
      { itemId: 'rice', quantity: 1 },
      { itemId: 'egg', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 30,
      buff: { type: 'farming', value: 1, description: '农耕技能+1（当天）' }
    },
    unlockSource: '大牛好感「知己」',
    description: '奢侈的松露炒饭，香气四溢。'
  },
  {
    id: 'antler_soup',
    name: '鹿茸汤',
    ingredients: [
      { itemId: 'antler_velvet', quantity: 1 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'ginseng', quantity: 1 }
    ],
    effect: {
      staminaRestore: 80,
      healthRestore: 40,
      buff: { type: 'stamina', value: 100, description: '体力全恢复' }
    },
    unlockSource: '林老好感「知己」',
    description: '大补之物，一碗下去神清气爽。'
  },
  {
    id: 'camel_milk_tea',
    name: '驼奶茶',
    ingredients: [
      { itemId: 'camel_milk', quantity: 1 },
      { itemId: 'tea', quantity: 1 }
    ],
    effect: {
      staminaRestore: 35,
      healthRestore: 15,
      buff: { type: 'speed', value: 15, description: '行动速度+15%（当天）' }
    },
    unlockSource: '陈伯好感「挚友」',
    description: '丝滑醇香的驼奶茶。'
  },
  {
    id: 'peacock_feast',
    name: '孔雀宴',
    ingredients: [
      { itemId: 'peacock_feather', quantity: 1 },
      { itemId: 'rice', quantity: 2 },
      { itemId: 'osmanthus', quantity: 1 }
    ],
    effect: {
      staminaRestore: 90,
      healthRestore: 50,
      buff: { type: 'all_skills', value: 1, description: '全技能+1（当天）' }
    },
    unlockSource: '结婚后解锁',
    description: '传说中的孔雀宴，尊贵无比。'
  },
  // === 瀚海食谱 ===
  {
    id: 'spiced_lamb',
    name: '香料烤羊',
    ingredients: [
      { itemId: 'hanhai_spice', quantity: 1 },
      { itemId: 'goat_milk', quantity: 1 }
    ],
    effect: {
      staminaRestore: 60,
      healthRestore: 30,
      buff: { type: 'mining', value: 2, description: '采矿技能+2（当天）' }
    },
    unlockSource: '瀚海驿站购买香料后解锁',
    description: '西域风味的烤羊肉，香气扑鼻，力量倍增。'
  },
  {
    id: 'silk_dumpling_deluxe',
    name: '丝路饺子',
    ingredients: [
      { itemId: 'hanhai_silk', quantity: 1 },
      { itemId: 'rice', quantity: 2 },
      { itemId: 'hanhai_spice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 70,
      healthRestore: 35,
      buff: { type: 'giftBonus', value: 3, description: '送礼好感×3（当天）' }
    },
    unlockSource: '瀚海驿站购买丝绸后解锁',
    description: '用丝绸包裹的精致饺子，配以西域香料，送礼佳品。'
  },
  {
    id: 'desert_cactus_soup',
    name: '仙人掌汤',
    ingredients: [
      { itemId: 'hanhai_cactus', quantity: 2 },
      { itemId: 'hanhai_spice', quantity: 1 }
    ],
    effect: {
      staminaRestore: 50,
      healthRestore: 40,
      buff: { type: 'stamina', value: 30, description: '体力上限+30（当天）' }
    },
    unlockSource: '收获仙人掌后解锁',
    description: '清凉解暑的仙人掌汤，沙漠旅人的续命良方。'
  },
  {
    id: 'date_cake',
    name: '枣糕',
    ingredients: [
      { itemId: 'hanhai_date', quantity: 3 },
      { itemId: 'rice', quantity: 2 }
    ],
    effect: {
      staminaRestore: 45,
      healthRestore: 20,
      buff: { type: 'farming', value: 2, description: '种植技能+2（当天）' }
    },
    unlockSource: '收获椰枣后解锁',
    description: '甜蜜软糯的枣糕，补气养血。'
  }
]

/** 根据ID获取食谱 */
export const getRecipeById = (id: string): RecipeDef | undefined => {
  return RECIPES.find(r => r.id === id)
}
