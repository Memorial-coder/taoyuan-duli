import type { CropDef } from '@/types/farm'
import { getCropById } from './crops'

export type CropUseTag =
  | 'food'
  | 'alchemy'
  | 'pet_feed'
  | 'animal_feed'
  | 'oil'
  | 'flour'
  | 'wine'
  | 'pickle'
  | 'gift'
  | 'festival'
  | 'order'
  | 'online_cost'
  | 'medicine'

export type CropUseFlavor = '甜' | '鲜' | '辛' | '香' | '土' | '苦'

export type CropUseNature = 'neutral' | 'warm' | 'cool'

export type CropUseRarity = 'daily' | 'stable' | 'seasonal' | 'valuable'

export type CropUseSpirituality = 'mundane' | 'earth' | 'spirit' | 'mystic'

export interface CropUseProfile {
  cropId: string
  tags: CropUseTag[]
  flavor: CropUseFlavor[]
  nature: CropUseNature
  spirituality: CropUseSpirituality
  rarityUse: CropUseRarity
  recommendedUses: string[]
  summary: string
}

export interface CropUseTagMatch {
  cropId: string
  tag: CropUseTag
  label: string
  summary: string
  recommendedUses: string[]
}

export const CROP_USE_TAG_LABELS: Record<CropUseTag, string> = {
  food: '料理',
  alchemy: '炼丹',
  pet_feed: '宠物粮',
  animal_feed: '动物饲料',
  oil: '榨油',
  flour: '制粉',
  wine: '酿酒',
  pickle: '腌制',
  gift: '赠礼',
  festival: '节会',
  order: '订单',
  online_cost: '联机消耗',
  medicine: '药材'
}

export const CROP_USE_TAG_FILTER_HINTS: Record<CropUseTag, string> = {
  food: '灶台食材',
  alchemy: '丹炉主辅材',
  pet_feed: '宠物特别喂食',
  animal_feed: '家畜牧场补料',
  oil: '油坊榨油',
  flour: '石磨制粉',
  wine: '酒坊酿造',
  pickle: '酱缸腌制',
  gift: '村民赠礼',
  festival: '节会供品',
  order: '订单交付',
  online_cost: '公共仓消耗',
  medicine: '药膳药材'
}

export const CROP_USE_TAG_SEARCH_KEYWORDS: Record<CropUseTag, string[]> = {
  food: ['食材', '灶台料理', '料理用途入口', 'food 用途标签'],
  alchemy: ['丹材', '丹炉材料', '炼丹用途入口', 'alchemy 用途标签'],
  pet_feed: ['宠物点心', '特别喂食', '宠物喂食读取用途标签', 'pet_feed 用途标签'],
  animal_feed: ['家畜饲料', '牧场补料', '动物喂食读取用途标签', 'animal_feed 用途标签'],
  oil: ['油坊', '榨油加工', 'oil 用途标签'],
  flour: ['石磨', '制粉加工', 'flour 用途标签'],
  wine: ['酒坊', '酿造', 'wine 用途标签'],
  pickle: ['酱缸', '腌制加工', 'pickle 用途标签'],
  gift: ['送礼', '好感赠礼', 'gift 用途标签'],
  festival: ['节庆供品', '节会备料', '宴席备菜', 'festival 用途标签'],
  order: ['村民订单', '公共订单', '任务交付', 'order 用途标签'],
  online_cost: ['联机消耗', '公共仓消耗', '公共订单消耗', 'online_cost 用途标签'],
  medicine: ['药材储备', '药膳材料', 'medicine 用途标签']
}

export const CROP_USE_NATURE_LABELS: Record<CropUseNature, string> = {
  neutral: '中性',
  warm: '温补',
  cool: '清凉'
}

export const CROP_USE_RARITY_LABELS: Record<CropUseRarity, string> = {
  daily: '日常高频',
  stable: '稳定消耗',
  seasonal: '节令用途',
  valuable: '高价值低频'
}

export const CROP_USE_SPIRITUALITY_LABELS: Record<CropUseSpirituality, string> = {
  mundane: '凡品',
  earth: '地气',
  spirit: '灵息',
  mystic: '玄妙'
}

export const CROP_USE_PROFILES: CropUseProfile[] = [
  {
    cropId: 'rice',
    tags: ['food', 'alchemy', 'wine', 'flour', 'pet_feed', 'animal_feed', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['米粉', '饭团', '米酒', '谷气续行丹', '团圆饭订单', '宠物温饱粮', '家畜补料', '节会供品', '公共仓粥底'],
    summary: '基础粮食出口，适合料理、酿酒、制粉、宠物饱腹、家畜补料、团圆类订单和公共仓节会消耗。'
  },
  {
    cropId: 'sesame',
    tags: ['oil', 'flour', 'food', 'alchemy', 'pet_feed', 'festival', 'online_cost', 'order'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['芝麻油', '芝麻粉', '糕点辅料', '辛火丹辅料', '田犬辛香餐', '节会供品', '点心订单', '公共仓点心备料'],
    summary: '小作物走加工增值，适合榨油、制粉、糕点、温补炼丹、宠物辛香反馈、点心订单和公共仓点心备料。'
  },
  {
    cropId: 'lotus_seed',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'medicine', 'order'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['清心丹', '莲子甜汤', 'NPC 赠礼', '宠物安神餐', '药膳辅料', '安神药膳订单'],
    summary: '清凉药食两用作物，适合低频高价值料理、炼丹、赠礼、宠物安抚和安神药膳订单。'
  },
  {
    cropId: 'osmanthus',
    tags: ['food', 'alchemy', 'pet_feed', 'wine', 'gift', 'festival', 'medicine', 'order'],
    flavor: ['香', '甜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['桂花蜜', '桂花酿', '桂花茶', '桂花香', '桂露凝神丹', '宠物芳香点心', '灯谜茶点订单', '节会茶点'],
    summary: '芳香型节令作物，适合桂花蜜、酿酒、制茶、制香、凝神炼丹、宠物芳香反馈、灯谜茶点订单和节会赠礼。'
  },
  {
    cropId: 'sweet_potato',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'order', 'flour', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'daily',
    recommendedUses: ['饱腹料理', '温阳薯丸', '宠物耐力餐', '家畜越冬料', '行旅干粮', '救济订单', '公共订单粗粮包', '粗粮粉'],
    summary: '高产粗粮消耗口，适合日常料理、温补辅丹、宠物耐力、家畜越冬料、行旅干粮、公共订单和村社救济。'
  },
  {
    cropId: 'pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'festival', 'order'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['南瓜汤', '南瓜聚火丹', '节庆灯饰', '宠物亲密餐', '家畜甜口补料', '家庭餐桌事件', '丰收订单'],
    summary: '丰收感强的节令作物，适合家庭料理、温补辅丹、节庆装饰、宠物亲密、家畜甜口补料和订单。'
  },
  {
    cropId: 'radish',
    tags: ['food', 'pet_feed', 'animal_feed', 'alchemy', 'order', 'pickle', 'medicine'],
    flavor: ['甜', '辛'],
    nature: 'cool',
    spirituality: 'mundane',
    rarityUse: 'daily',
    recommendedUses: ['家常料理', '动物饲料', '石根护脉丸', '村民订单', '腌萝卜'],
    summary: '常见作物的稳定出口，适合料理、饲料、石根护脉丸防护丹药材、腌制和村民订单。'
  },
  {
    cropId: 'tea',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'order', 'medicine'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['清醒饮品', '茶心凝神丹', '待客茶', '灵宠清茶餐', 'NPC 好感赠礼', '行旅抗疲劳', '茶商订单'],
    summary: '高价值饮品与社交作物，适合制茶、凝神炼丹、灵宠清茶草本反馈、待客、赠礼、抗疲劳和茶商订单。'
  },
  {
    cropId: 'peach',
    tags: ['gift', 'wine', 'pet_feed', 'festival', 'food', 'alchemy', 'order'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['鲜果赠礼', '桃酒', '宠物心情餐', '灵果醒神丹', '恋爱剧情道具', '春日鲜果订单', '春日节会点心'],
    summary: '偏社交和情绪反馈的果类作物，适合赠礼、酿酒、宠物心情、灵果炼丹、恋爱剧情和春日鲜果订单。'
  },
  {
    cropId: 'chili',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['辛火丹', '泡椒', '料理增味', '驱虫药', '龙舟热血餐', '暖身小菜订单'],
    summary: '辛热型功能作物，适合料理提味、泡椒腌制、炼丹、驱虫药、热闹节会餐和暖身小菜订单。'
  },
  {
    cropId: 'cabbage',
    tags: ['food', 'pickle', 'animal_feed', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'mundane',
    rarityUse: 'daily',
    recommendedUses: ['炒青菜', '蔬菜汤', '酸菜', '干菜米粉汤', '家畜青饲', '修桥慰劳饭', '公共仓热饭'],
    summary: '基础叶菜消耗口，适合家常料理、腌制干菜、家畜青饲、修桥慰劳饭、公共仓热饭和日常订单。'
  },
  {
    cropId: 'potato',
    tags: ['food', 'alchemy', 'animal_feed', 'order'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['矿工便当', '炒土豆', '石根护脉丸辅材', '矿工订单', '家畜饱腹补料', '山路干粮'],
    summary: '耐饱根茎作物，适合矿工料理、护脉丹辅材、饱腹型家畜补料、行旅干粮和矿工订单。'
  },
  {
    cropId: 'watermelon',
    tags: ['food', 'wine', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['消暑鲜果', '西瓜酒', '丰收宴拼盘', '夏日解暑订单', '节会冰镇果盘', '公共仓消暑备料'],
    summary: '盛夏清凉果类，适合消暑料理、酿酒、丰收宴席、节会果盘、公共仓解暑备料和夏日订单。'
  },
  {
    cropId: 'lotus_root',
    tags: ['food', 'alchemy', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['桂花糯米藕', '清心莲丹辅材', '药膳汤底', '夏日清供', '药师订单', '清凉赠礼'],
    summary: '深水清凉作物，适合药膳料理、清心莲丹辅材、节会清供、清凉赠礼和药师订单。'
  },
  {
    cropId: 'rapeseed',
    tags: ['oil', 'food', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['菜籽油', '菜油春笋米粉卷', '油菜花蜜', '春日伴手礼', '节会备油', '公共仓油料订单'],
    summary: '春季油料作物，适合榨油、料理增香、蜂箱花蜜、节会备油、公共仓油料订单和春日赠礼。'
  },
  {
    cropId: 'corn',
    tags: ['food', 'flour', 'wine', 'animal_feed', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['玉米饼', '玉米粉', '玉米酒', '精饲料', '秋收订单', '公共仓粗粮包'],
    summary: '跨季粗粮作物，适合料理、制粉、酿酒、精饲料、秋收订单和公共仓粗粮消耗。'
  },
  {
    cropId: 'ginger',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['姜汤', '清蒸鱼佐料', '温阳薯丸引子', '腌姜', '冬日暖身订单', '节会暖饮'],
    summary: '温热辛香作物，适合姜汤、鱼料理、温阳薯丸引子、腌姜、冬日暖身订单和节会暖饮。'
  },
  {
    cropId: 'winter_wheat',
    tags: ['food', 'flour', 'animal_feed', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['小麦粉', '冬麦面点', '鱼麦便当', '冬季家畜料', '年节面食', '公共仓面粉包'],
    summary: '耐寒主粮作物，适合制粉、冬季料理、家畜补料、年节面食、订单交付和公共仓面粉包。'
  },
  {
    cropId: 'chrysanthemum',
    tags: ['food', 'medicine', 'wine', 'gift', 'festival', 'order'],
    flavor: ['香', '苦'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['菊花茶', '菊花蜜', '菊花酒', '重阳供品', '清热药饮', '秋日赠礼订单'],
    summary: '秋季清香花材，适合制茶、蜂箱花蜜、重阳菊花酒、清热药饮、节会供品、赠礼和秋日订单。'
  },
  {
    cropId: 'broad_bean',
    tags: ['food', 'animal_feed', 'order'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['蚕豆豆腐', '豆类料理', '家畜蛋白补料', '春豆订单'],
    summary: '春季豆类作物，适合豆腐坊加工、豆类料理、家畜蛋白补料和春豆订单。'
  },
  {
    cropId: 'bamboo_shoot',
    tags: ['food', 'medicine', 'festival', 'gift', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'daily',
    recommendedUses: ['菜油春笋米粉卷', '春卷', '端午粽子', '竹香料理', '踏青赠礼', '春日订单'],
    summary: '早春鲜蔬作物，适合春笋料理、节令米粉卷、端午粽子、清润药膳、踏青赠礼和春日订单。'
  },
  {
    cropId: 'peanut',
    tags: ['food', 'animal_feed', 'festival', 'order'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['花生糖', '花生豆腐', '腊八粥', '花生汤圆', '家畜蛋白补料', '年节点心订单'],
    summary: '香暖坚果作物，适合点心料理、花生豆腐、腊八粥、汤圆、家畜蛋白补料、节会供品和年节订单。'
  },
  {
    cropId: 'jujube',
    tags: ['food', 'medicine', 'wine', 'gift', 'festival', 'order'],
    flavor: ['甜', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['红枣糕', '红枣酒', '百收粥', '滋补药膳', '秋收赠礼', '补气订单'],
    summary: '温补秋果作物，适合糕点、红枣酒、百收粥、滋补药膳、赠礼、节会甜品和补气订单。'
  },
  {
    cropId: 'persimmon',
    tags: ['food', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['柿饼', '晒架冬储点心', '脱水机果脯', '年节甜品', '旅人伴手礼', '公共仓冬储备料'],
    summary: '秋季甜果作物，适合柿饼料理、晒架或脱水加工、冬储点心、年节甜品、赠礼订单和公共仓冬储备料。'
  },
  {
    cropId: 'napa_cabbage',
    tags: ['food', 'animal_feed', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'mundane',
    rarityUse: 'daily',
    recommendedUses: ['年夜饺', '冬至饺', '冬季炖菜', '家畜青饲', '冬储订单', '公共仓备菜'],
    summary: '冬季高频叶菜，适合饺子、冬季炖菜、家畜青饲、冬储订单、节会备菜和公共仓消耗。'
  },
  {
    cropId: 'snow_lotus',
    tags: ['food', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雪梅羹', '雪莲蜜', '月华丹信物', '高阶药材', '冬日清供', '药师高价订单'],
    summary: '高价值寒性灵材，适合雪梅羹、雪莲蜜、月华丹信物、高阶药材、冬日清供、赠礼和药师高价订单。'
  },
  {
    cropId: 'chives',
    tags: ['food', 'medicine', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['韭菜炒蛋', '春日辛香小菜', '冬春温补菜', '早春节会备菜', '家常订单'],
    summary: '冬春再生辛香作物，适合韭菜炒蛋、春日小菜、温补家常菜、节会备菜和日常订单。'
  },
  {
    cropId: 'hanhai_cactus',
    tags: ['food', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '鲜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['仙人掌汤', '瀚海清暑药膳', '西域旅人赠礼', '沙漠集市订单', '夏日节会清供'],
    summary: '瀚海高价值耐旱作物，适合仙人掌汤、清暑药膳、西域赠礼、沙漠集市订单和夏日节会清供。'
  },
  {
    cropId: 'hanhai_date',
    tags: ['food', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['枣糕', '瀚海旅粮', '西域甜点赠礼', '商队订单', '节会甜品', '公共仓干粮包'],
    summary: '瀚海甜果作物，适合枣糕、旅粮甜点、商队赠礼、节会甜品、公共仓干粮包和商队订单。'
  },
  {
    cropId: 'lychee',
    tags: ['food', 'gift', 'festival', 'order'],
    flavor: ['甜', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['荔枝干', '岭南鲜果赠礼', '夏日甜品', '脱水果脯', '节会果盘', '果商订单'],
    summary: '夏季岭南果类，适合鲜果食用、脱水荔枝干、甜品果盘、赠礼、节会供品和果商订单。'
  }
]

const MANUAL_CROP_USE_PROFILE_MAP = new Map(CROP_USE_PROFILES.map(profile => [profile.cropId, profile]))
const DERIVED_CROP_USE_PROFILE_CACHE = new Map<string, CropUseProfile>()

const tagUseLabels: Record<CropUseTag, string> = {
  food: '家常料理',
  alchemy: '丹炉辅材',
  pet_feed: '宠物点心',
  animal_feed: '动物饲料',
  oil: '榨油加工',
  flour: '制粉加工',
  wine: '酿造入坛',
  pickle: '腌制入缸',
  gift: '村民赠礼',
  festival: '节会供品',
  order: '订单交付',
  online_cost: '公共仓消耗',
  medicine: '药材储备'
}

const hasAny = (text: string, keywords: string[]): boolean => keywords.some(keyword => text.includes(keyword))

const uniqueValues = <T extends string>(values: T[]): T[] => Array.from(new Set(values.filter(Boolean)))

const buildCropSearchText = (crop: CropDef): string => `${crop.id} ${crop.name} ${crop.seedId} ${crop.description ?? ''}`.toLowerCase()

const buildCropUseTags = (searchText: string): CropUseTag[] => {
  const tags: CropUseTag[] = []
  const add = (...values: CropUseTag[]) => tags.push(...values)

  const isFiber = hasAny(searchText, ['cotton', 'mulberry', 'silk', '棉', '桑', '丝'])
  const isGrain = hasAny(searchText, ['rice', 'wheat', 'grain', 'corn', 'millet', '稻', '麦', '谷', '玉米', '粟'])
  const isOil = hasAny(searchText, ['sesame', 'rapeseed', 'peanut', 'oil', '芝', '油', '花生', '籽'])
  const isSpice = hasAny(searchText, ['chili', 'pepper', 'ginger', 'garlic', 'mustard', 'chives', '椒', '姜', '蒜', '芥', '韭'])
  const isTeaOrFlower = hasAny(searchText, ['tea', 'osmanthus', 'chrysanthemum', 'flower', 'blossom', 'orchid', 'bud', 'bloom', '茶', '桂', '菊', '花', '兰', '蕾'])
  const isMedicinal = hasAny(searchText, ['lotus', 'snow_lotus', 'ginseng', 'herb', 'root', 'yam', 'shoot', 'sprout', 'bamboo', '莲', '雪莲', '参', '草', '药', '山药', '笋', '芽', '竹'])
  const isFruit = hasAny(searchText, ['melon', 'peach', 'jujube', 'date', 'lychee', 'longan', 'persimmon', 'fruit', 'berry', 'chestnut', 'apricot', 'pear', 'cactus', 'gourd', '瓜', '桃', '枣', '椰枣', '荔枝', '龙眼', '柿', '果', '莓', '栗', '杏', '梨', '仙人掌', '葫'])
  const isLeafy = hasAny(searchText, ['cabbage', 'green', 'spinach', 'loofah', 'eggplant', 'zizania', 'bitter_gourd', 'shepherd', '菜', '青', '菠菜', '丝瓜', '茄', '茭白', '苦瓜', '荠'])
  const isTuber = hasAny(searchText, ['potato', 'tuber', 'sweet_potato', 'radish', 'lotus_root', '薯', '萝卜', '藕', '根'])
  const isBean = hasAny(searchText, ['bean', '豆', '蚕豆'])

  if (isFiber) add('order', 'gift', 'festival', 'online_cost')
  if (isGrain) add('food', 'flour', 'wine', 'pet_feed', 'animal_feed', 'order', 'online_cost')
  if (isOil) add('oil', 'flour', 'food', 'alchemy', 'festival', 'order', 'online_cost')
  if (isSpice) add('food', 'alchemy', 'medicine', 'pickle', 'order')
  if (isTeaOrFlower) add('gift', 'festival', 'medicine', 'alchemy', 'food', 'order')
  if (isMedicinal) add('alchemy', 'medicine', 'food', 'gift', 'order')
  if (isFruit) add('food', 'gift', 'wine', 'festival', 'pet_feed', 'order')
  if (isLeafy) add('food', 'pickle', 'order', 'pet_feed', 'animal_feed')
  if (isTuber) add('food', 'pet_feed', 'animal_feed', 'flour', 'order', 'alchemy')
  if (isBean) add('food', 'flour', 'pet_feed', 'animal_feed', 'order')

  if (tags.length === 0) add('food', 'order')

  return uniqueValues(tags).slice(0, 8)
}

const buildCropUseFlavor = (searchText: string): CropUseFlavor[] => {
  if (hasAny(searchText, ['chili', 'pepper', 'ginger', 'garlic', 'mustard', 'chives', '椒', '姜', '蒜', '芥', '韭'])) return ['辛', '香']
  if (hasAny(searchText, ['tea', '茶'])) return ['苦', '香']
  if (hasAny(searchText, ['osmanthus', 'chrysanthemum', 'flower', 'blossom', 'orchid', 'bud', 'bloom', '桂', '菊', '花', '兰', '蕾'])) return ['香', '甜']
  if (hasAny(searchText, ['sesame', 'rapeseed', 'peanut', 'oil', '芝', '油', '花生', '籽'])) return ['香', '土']
  if (hasAny(searchText, ['melon', 'peach', 'jujube', 'date', 'lychee', 'longan', 'persimmon', 'fruit', 'berry', 'apricot', 'pear', '瓜', '桃', '枣', '荔枝', '龙眼', '柿', '果', '莓', '杏', '梨'])) return ['甜', '鲜']
  if (hasAny(searchText, ['potato', 'tuber', 'sweet_potato', 'yam', 'radish', 'lotus_root', 'root', '薯', '山药', '萝卜', '藕', '根'])) return ['甜', '土']
  if (hasAny(searchText, ['bitter_gourd', 'snow_mustard', '苦瓜', '雪里蕻'])) return ['苦', '鲜']
  if (hasAny(searchText, ['rice', 'wheat', 'grain', 'corn', 'bean', '稻', '麦', '谷', '玉米', '豆'])) return ['鲜', '土']
  return ['鲜', '土']
}

const buildCropUseNature = (searchText: string): CropUseNature => {
  if (hasAny(searchText, ['chili', 'pepper', 'ginger', 'garlic', 'chives', 'sesame', 'peanut', '椒', '姜', '蒜', '韭', '芝', '花生'])) return 'warm'
  if (hasAny(searchText, ['tea', 'lotus', 'snow_lotus', 'chrysanthemum', 'bitter_gourd', 'watermelon', 'cactus', '茶', '莲', '雪莲', '菊', '苦瓜', '西瓜', '仙人掌'])) return 'cool'
  return 'neutral'
}

const buildCropUseSpirituality = (searchText: string, tags: CropUseTag[], rarityUse: CropUseRarity): CropUseSpirituality => {
  if (hasAny(searchText, ['ancient', 'apex', 'empyrean', 'spirit', 'destiny', 'timeless', '远古', '无极', '洪荒', '开天', '龙', '灵', '天命'])) return 'mystic'
  if (rarityUse === 'valuable' && (tags.includes('alchemy') || tags.includes('medicine'))) return 'mystic'
  if (tags.includes('alchemy') || tags.includes('medicine') || tags.includes('festival')) return 'spirit'
  if (tags.includes('wine') || tags.includes('gift') || tags.includes('online_cost')) return 'earth'
  return 'mundane'
}

const buildCropUseRarity = (crop: CropDef, searchText: string): CropUseRarity => {
  if (
    crop.sellPrice >= 220 ||
    crop.growthDays >= 11 ||
    hasAny(searchText, ['ancient', 'apex', 'wilder', 'empyrean', 'spirit', 'destiny', 'timeless', 'ancient', '远古', '无极', '洪荒', '开天', '龙', '灵', '天命'])
  ) {
    return 'valuable'
  }
  if (crop.regrowth || hasAny(searchText, ['festival', 'osmanthus', 'pumpkin', 'chrysanthemum', '桂', '南瓜', '菊', '节'])) return 'seasonal'
  if (crop.growthDays <= 5 || crop.sellPrice <= 75) return 'daily'
  return 'stable'
}

const buildRecommendedUses = (crop: CropDef, tags: CropUseTag[], rarityUse: CropUseRarity): string[] => {
  const uses = tags.map(tag => `${crop.name}${tagUseLabels[tag]}`)
  if (rarityUse === 'valuable') uses.unshift(`${crop.name}高价值委托`)
  if (rarityUse === 'daily') uses.push(`${crop.name}日常消耗`)
  return uniqueValues(uses).slice(0, 6)
}

const deriveCropUseProfile = (crop: CropDef): CropUseProfile => {
  const searchText = buildCropSearchText(crop)
  const tags = buildCropUseTags(searchText)
  const flavor = buildCropUseFlavor(searchText)
  const nature = buildCropUseNature(searchText)
  const rarityUse = buildCropUseRarity(crop, searchText)
  const spirituality = buildCropUseSpirituality(searchText, tags, rarityUse)
  const recommendedUses = buildRecommendedUses(crop, tags, rarityUse)
  const tagLabels = tags.map(tag => CROP_USE_TAG_LABELS[tag]).join('、')

  return {
    cropId: crop.id,
    tags,
    flavor,
    nature,
    spirituality,
    rarityUse,
    recommendedUses,
    summary: `${crop.name}已归入${tagLabels}等非卖钱用途，风味偏${flavor.join('、')}，药性为${CROP_USE_NATURE_LABELS[nature]}，灵性为${CROP_USE_SPIRITUALITY_LABELS[spirituality]}，适合作为${CROP_USE_RARITY_LABELS[rarityUse]}。`
  }
}

export const getCropUseProfile = (cropId: string): CropUseProfile | undefined => {
  const manualProfile = MANUAL_CROP_USE_PROFILE_MAP.get(cropId)
  if (manualProfile) return manualProfile

  const cachedProfile = DERIVED_CROP_USE_PROFILE_CACHE.get(cropId)
  if (cachedProfile) return cachedProfile

  const crop = getCropById(cropId)
  if (!crop) return undefined

  const derivedProfile = deriveCropUseProfile(crop)
  DERIVED_CROP_USE_PROFILE_CACHE.set(cropId, derivedProfile)
  return derivedProfile
}

export const getCropUseTagLabels = (profile: CropUseProfile): string[] => {
  return profile.tags.map(tag => CROP_USE_TAG_LABELS[tag])
}

export const formatCropUseSummary = (profile: CropUseProfile): string => {
  return `${profile.summary} 灵性：${CROP_USE_SPIRITUALITY_LABELS[profile.spirituality]}。推荐：${profile.recommendedUses.join('、')}。`
}

export const getCropUseTagSearchKeywords = (tags: CropUseTag[]): string[] => {
  return Array.from(
    new Set(
      tags.flatMap(tag => [
        CROP_USE_TAG_LABELS[tag],
        CROP_USE_TAG_FILTER_HINTS[tag],
        `${CROP_USE_TAG_LABELS[tag]}筛选`,
        `${tag} 用途标签`,
        ...CROP_USE_TAG_SEARCH_KEYWORDS[tag]
      ])
    )
  )
}

export const getCropUseTagMatches = (itemId: string, tags: CropUseTag[]): CropUseTagMatch[] => {
  const profile = getCropUseProfile(itemId)
  if (!profile) return []

  return tags
    .filter(tag => profile.tags.includes(tag))
    .map(tag => ({
      cropId: profile.cropId,
      tag,
      label: CROP_USE_TAG_LABELS[tag],
      summary: profile.summary,
      recommendedUses: profile.recommendedUses
    }))
}
