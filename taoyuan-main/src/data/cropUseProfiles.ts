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
    tags: ['oil', 'flour', 'food', 'alchemy', 'pet_feed', 'festival', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['芝麻油', '芝麻粉', '糕点辅料', '辛火丹辅料', '田犬辛香餐', '节会供品'],
    summary: '小作物走加工增值，适合榨油、制粉、糕点、温补炼丹和宠物辛香反馈。'
  },
  {
    cropId: 'lotus_seed',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'medicine'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['清心丹', '莲子甜汤', 'NPC 赠礼', '宠物安神餐', '药膳辅料'],
    summary: '清凉药食两用作物，适合低频高价值料理、炼丹、赠礼和宠物安抚。'
  },
  {
    cropId: 'osmanthus',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'festival', 'medicine'],
    flavor: ['香', '甜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['桂露', '桂花香囊', '凝神丹', '宠物芳香点心', '灯谜奖励兑换', '节会茶点'],
    summary: '芳香型节令作物，适合节会、赠礼、凝神炼丹、宠物芳香反馈和花香料理。'
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
    tags: ['food', 'pet_feed', 'animal_feed', 'alchemy', 'order', 'pickle'],
    flavor: ['甜', '辛'],
    nature: 'cool',
    spirituality: 'mundane',
    rarityUse: 'daily',
    recommendedUses: ['家常料理', '动物饲料', '低级炼丹辅料', '村民订单', '腌萝卜'],
    summary: '常见作物的稳定出口，适合料理、饲料、低级炼丹、腌制和村民订单。'
  },
  {
    cropId: 'tea',
    tags: ['food', 'alchemy', 'gift', 'order', 'medicine'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['清醒饮品', '茶心凝神丹', '待客茶', 'NPC 好感赠礼', '行旅抗疲劳', '茶商订单'],
    summary: '高价值饮品与社交作物，适合制茶、凝神炼丹、待客、赠礼、抗疲劳和茶商订单。'
  },
  {
    cropId: 'peach',
    tags: ['gift', 'wine', 'pet_feed', 'festival', 'food', 'alchemy'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['鲜果赠礼', '桃酒', '宠物心情餐', '灵果醒神丹', '恋爱剧情道具', '春日节会点心'],
    summary: '偏社交和情绪反馈的果类作物，适合赠礼、酿酒、宠物心情、灵果炼丹和恋爱剧情。'
  },
  {
    cropId: 'chili',
    tags: ['food', 'alchemy', 'medicine', 'festival'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['辛火丹', '料理增味', '驱虫药', '龙舟热血餐', '暖身小菜'],
    summary: '辛热型功能作物，适合料理提味、炼丹、驱虫药和热闹节会餐。'
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
