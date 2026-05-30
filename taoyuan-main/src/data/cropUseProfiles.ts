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
  },
  {
    cropId: 'green_bean',
    tags: ['food', 'pet_feed', 'animal_feed', 'pickle', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['清炒豆角', '豆角焖面', '宠物清脆餐', '家畜蛋白补料', '腌豆角', '夏日小菜订单', '节会素菜'],
    summary: '跨春夏高频豆荚，适合家常料理、宠物清脆反馈、家畜蛋白补料、腌制小菜、节会素菜和夏日订单。'
  },
  {
    cropId: 'loofah',
    tags: ['food', 'medicine', 'pet_feed', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['丝瓜汤', '清暑药膳', '灵宠清润餐', '夏日节会清供', '水乡小菜订单'],
    summary: '清润瓜蔬，适合丝瓜汤、清暑药膳、灵宠清润喂食、夏日节会清供和水乡小菜订单。'
  },
  {
    cropId: 'eggplant',
    tags: ['food', 'pickle', 'gift', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['酱烧茄子', '茄盒家宴', '酱茄子', '邻里素菜赠礼', '丰收宴备菜', '市集茄菜订单'],
    summary: '夏季稳定蔬菜，适合酱烧料理、家宴茄盒、酱缸腌制、邻里赠礼、丰收宴备菜和市集订单。'
  },
  {
    cropId: 'yam',
    tags: ['food', 'alchemy', 'medicine', 'pet_feed', 'gift', 'order'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['山药粥', '温补药膳', '固元山药丹', '灵宠滋养餐', '长辈滋补赠礼', '药膳订单'],
    summary: '秋季滋补根茎，适合山药粥、温补药膳、固元炼丹辅材、灵宠滋养餐、长辈赠礼和药膳订单。'
  },
  {
    cropId: 'spinach',
    tags: ['food', 'pet_feed', 'animal_feed', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'mundane',
    rarityUse: 'daily',
    recommendedUses: ['菠菜面', '冬菜汤', '宠物青蔬餐', '家畜青饲', '冬日备菜', '早春青菜订单'],
    summary: '冬季耐寒叶菜，适合面点汤菜、宠物青蔬喂食、家畜青饲、冬日备菜和早春青菜订单。'
  },
  {
    cropId: 'mustard_green',
    tags: ['food', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['芥菜汤', '腌芥菜', '暖冬腌菜', '节会小菜', '冬储腌菜订单'],
    summary: '辛香耐寒叶菜，适合汤菜、酱缸腌制、暖冬腌菜、节会小菜和冬储订单。'
  },
  {
    cropId: 'garlic',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['蒜蓉调味', '蒜香萝卜', '驱寒丹引子', '腌蒜', '龙舟暖菜', '辛香调料订单'],
    summary: '冬季辛香调料，适合料理增香、腌制、驱寒炼丹引子、龙舟暖菜、节会调料和辛香订单。'
  },
  {
    cropId: 'longan',
    tags: ['food', 'medicine', 'wine', 'gift', 'festival', 'order'],
    flavor: ['甜', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['桂圆甜汤', '龙眼干', '桂圆酒', '滋补赠礼', '年节甜品', '补气果品订单'],
    summary: '夏季滋补甜果，适合甜汤、晒干果、酿酒、滋补赠礼、年节甜品和补气果品订单。'
  },
  {
    cropId: 'zizania',
    tags: ['food', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['茭白炒肉', '水乡清供', '清润药膳', '端午备菜', '水乡特产赠礼', '水路商单'],
    summary: '深水水乡作物，适合茭白炒肉、清润药膳、端午备菜、水乡赠礼和水路商队订单。'
  },
  {
    cropId: 'bitter_gourd',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['苦', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['苦瓜汤', '凉拌苦瓜', '清暑丹辅材', '腌苦瓜', '夏日清供', '解暑订单'],
    summary: '苦凉消暑瓜蔬，适合汤菜凉拌、清暑炼丹辅材、腌制、夏日节会清供和解暑订单。'
  },
  {
    cropId: 'chestnut',
    tags: ['food', 'flour', 'pet_feed', 'gift', 'festival', 'order'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['板栗糕', '栗子粉', '栗香宠物餐', '秋收赠礼', '节会糖炒栗子', '冬储点心订单'],
    summary: '秋季坚果作物，适合糕点、制粉、栗香宠物餐、秋收赠礼、节会糖炒栗子和冬储点心订单。'
  },
  {
    cropId: 'shepherd_purse',
    tags: ['food', 'medicine', 'pet_feed', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['荠菜饺', '早春野蔬汤', '灵宠野蔬餐', '春寒药膳', '上巳供品', '早春野菜订单'],
    summary: '冬末春初野蔬，适合荠菜饺、野蔬汤、灵宠野蔬喂食、春寒药膳、上巳供品和早春订单。'
  },
  {
    cropId: 'snow_mustard',
    tags: ['food', 'medicine', 'pickle', 'animal_feed', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['雪菜面', '雪里蕻腌菜', '冬储酸菜', '家畜冬青料', '年节腌菜', '公共仓腌菜包', '冬储订单'],
    summary: '耐寒腌菜原料，适合雪菜面、酱缸腌菜、冬储酸菜、家畜青饲、年节腌菜、公共仓腌菜包和冬储订单。'
  },
  {
    cropId: 'winter_bamboo',
    tags: ['food', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['冬笋汤', '腊味冬笋', '清润药膳', '山野鲜味赠礼', '冬至备菜', '山货订单'],
    summary: '冬季山货鲜蔬，适合冬笋汤、腊味菜、清润药膳、山野赠礼、冬至备菜和山货订单。'
  },
  {
    cropId: 'cotton',
    tags: ['gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '鲜'],
    nature: 'neutral',
    spirituality: 'mundane',
    rarityUse: 'stable',
    recommendedUses: ['纺织布匹原料', '亲友棉包赠礼', '节会灯绸', '冬衣订单', '公共仓布料包'],
    summary: '经济纤维作物，适合纺织原料、亲友棉包赠礼、节会灯绸、冬衣订单和公共仓布料包。'
  },
  {
    cropId: 'mulberry',
    tags: ['food', 'medicine', 'animal_feed', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'daily',
    recommendedUses: ['桑叶茶', '蚕房饲叶', '清热药饮', '端午香囊叶', '药茶赠礼', '养蚕订单'],
    summary: '桑蚕与药茶作物，适合桑叶茶、蚕房饲叶、清热药饮、端午香囊叶、药茶赠礼和养蚕订单。'
  },
  {
    cropId: 'golden_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['金蜜瓜宴席拼盘', '金蜜瓜灵果丹', '灵宠清甜餐', '春夏秋鲜果赠礼', '金蜜瓜节会供品', '公共仓灵果备料', '高价果商订单'],
    summary: '西瓜与莲藕杂交的高价值灵果，适合宴席拼盘、灵果炼丹、灵宠清甜喂食、鲜果赠礼、节会供品、公共仓灵果备料和高价果商订单。'
  },
  {
    cropId: 'jade_tea',
    tags: ['food', 'alchemy', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['翡翠茶饮', '翡翠凝神丹', '待客玉盏茶', '清心药茶', '文会供茶', '茶席赠礼', '茶商高价订单'],
    summary: '茶与菊杂交的清香珍品，适合高阶茶饮、凝神炼丹、待客茶席、清心药茶、文会供茶、赠礼和茶商订单。'
  },
  {
    cropId: 'phoenix_pepper',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['凤凰椒酱', '凤火行气丹', '腌凤凰椒', '辛香节会热菜', '武师暖身赠礼', '辛烈调料订单'],
    summary: '辣椒与南瓜杂交的辛甜奇果，适合料理酱料、辛烈炼丹、腌制、热闹节会菜、武师赠礼和辛香调料订单。'
  },
  {
    cropId: 'moonlight_rice',
    tags: ['food', 'alchemy', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['月光米饭团', '月华米粉', '月光米酒', '月辉续行丹', '中秋供饭', '公共仓月米包', '旅人订单'],
    summary: '稻谷与春笋杂交的神稻，适合饭团、制粉、酿酒、续行炼丹、中秋供饭、公共仓月米包和旅人订单。'
  },
  {
    cropId: 'frost_garlic',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'gift', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['霜雪蒜泥', '寒蒜护脉丹', '腌霜蒜', '雪夜暖菜', '药师赠礼', '冬祭辛香供品', '驱寒订单'],
    summary: '雪莲与大蒜杂交的寒辛灵材，适合辛香调味、护脉炼丹、腌制、雪夜暖菜、药师赠礼、冬祭供品和驱寒订单。'
  },
  {
    cropId: 'emerald_radish',
    tags: ['food', 'alchemy', 'animal_feed', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翡翠萝卜汤', '翡翠护脉丹', '腌翡翠萝卜', '家畜清脆补料', '春社冷盘', '公共仓青根备料', '根菜订单'],
    summary: '青菜与萝卜杂交的一代根菜，适合清甜汤羹、护脉炼丹、腌制加工、家畜补料、春社冷盘、公共仓备料和根菜订单。'
  },
  {
    cropId: 'jade_shoot',
    tags: ['food', 'alchemy', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['玉竹芽清汤', '玉芽凝神丹', '清香药膳', '雅士鲜笋赠礼', '春宴供笋', '公共仓春鲜包', '茶笋订单'],
    summary: '春笋与茶叶杂交的清香芽菜，适合鲜汤料理、凝神炼丹、清香药膳、雅士赠礼、春宴供笋、公共仓春鲜备料和茶笋订单。'
  },
  {
    cropId: 'golden_tuber',
    tags: ['food', 'alchemy', 'animal_feed', 'oil', 'flour', 'festival', 'order', 'online_cost'],
    flavor: ['土', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金油薯饼', '金薯暖胃丹', '金薯粉', '金薯油料', '家畜饱腹料', '丰收节薯盘', '公共仓薯粉包', '油薯订单'],
    summary: '土豆与油菜杂交的饱腹油料，适合薯饼料理、暖胃炼丹、制粉、榨油、家畜饲料、丰收节供盘、公共仓薯粉包和油薯订单。'
  },
  {
    cropId: 'peach_blossom_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['桃花茶饮', '桃花醒神丹', '桃香花酿', '灵宠花果茶', '清心药茶', '春游赠礼', '花朝供茶', '雅集茶单'],
    summary: '桃子与茶叶杂交的花茶灵材，适合花茶料理、醒神炼丹、花酿加工、灵宠花果喂食、清心药茶、春游赠礼、花朝供茶和雅集茶单。'
  },
  {
    cropId: 'ruby_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'flour', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['红宝豆饭', '红宝养气丹', '桃香豆粉', '灵宠甜豆餐', '红豆糕赠礼', '七夕甜豆供品', '公共仓甜豆包', '豆点订单'],
    summary: '蚕豆与桃子杂交的甜豆作物，适合豆饭料理、养气炼丹、制粉加工、灵宠甜豆喂食、糕点赠礼、七夕供品、公共仓甜豆包和豆点订单。'
  },
  {
    cropId: 'emerald_jade_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['翠玉清茗', '翠玉凝神丹', '灵宠翠叶茶', '清心药茶', '文士茶礼', '春夏茶会供品', '珍茗订单'],
    summary: '翡翠萝卜与茶叶杂交的二代清茗，适合茶饮料理、凝神炼丹、灵宠草本喂食、清心药茶、文士赠礼、茶会供品和珍茗订单。'
  },
  {
    cropId: 'pearl_osmanthus',
    tags: ['food', 'alchemy', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['桂珠甜粥', '桂珠安神丹', '桂香谷粉', '桂珠花酿', '秋日香谷赠礼', '中秋供粥', '公共仓香谷包', '桂谷订单'],
    summary: '珍珠谷与桂花杂交的秋香粮谷，适合甜粥料理、安神炼丹、制粉、花酿加工、秋日赠礼、中秋供粥、公共仓香谷备料和桂谷订单。'
  },
  {
    cropId: 'ruby_fire',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'pet_feed', 'festival', 'order'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['红宝辣豆酱', '红火行气丹', '腌红宝椒', '灵宠暖身豆', '驱寒药膳', '火神节热菜', '辛香酱订单'],
    summary: '红宝豆与辣椒杂交的辛甜二代作物，适合辣豆酱料理、行气炼丹、腌制、灵宠暖身喂食、驱寒药膳、火热节会菜和辛香酱订单。'
  },
  {
    cropId: 'golden_corn_king',
    tags: ['food', 'alchemy', 'animal_feed', 'flour', 'wine', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金穗王饭', '谷王续行丹', '金穗面粉', '金谷酒', '家畜精谷料', '丰收祭主粮', '公共仓五谷包', '粮商大单'],
    summary: '金穗玉米与稻谷杂交的二代主粮，适合主粮料理、续行炼丹、制粉、酿酒、家畜精谷饲料、丰收祭主粮、公共仓五谷备料和粮商大单。'
  },
  {
    cropId: 'jade_melon_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['碧茗瓜凉饮', '碧瓜清暑丹', '灵宠消暑瓜茶', '清凉药饮', '夏日鲜果赠礼', '消暑节供品', '公共仓凉瓜包', '暑茶订单'],
    summary: '碧玉瓜与茶叶杂交的消暑二代作物，适合凉饮料理、清暑炼丹、灵宠消暑喂食、清凉药饮、夏日赠礼、消暑节供品、公共仓凉瓜备料和暑茶订单。'
  },
  {
    cropId: 'twin_golden_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金双豆饭', '双豆养元丹', '金双豆粉', '双豆花生油', '灵宠坚果豆餐', '家畜蛋白补料', '成双赠礼', '春社豆供', '公共仓豆粮包', '豆坊订单'],
    summary: '双子豆与花生杂交的饱满二代豆作，适合豆饭料理、养元炼丹、制粉、榨油、灵宠坚果喂食、家畜蛋白补料、成双赠礼、春社供品、公共仓豆粮包和豆坊订单。'
  },
  {
    cropId: 'peach_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['桃花香饭', '桃华续行丹', '桃米粉', '桃花米酒', '灵宠花饭团', '春游饭盒赠礼', '花朝供饭', '公共仓桃米包', '雅宴饭单'],
    summary: '桃花茶与稻谷杂交的花香米作，适合花饭料理、续行炼丹、制粉、酿酒、灵宠花饭团、春游赠礼、花朝供饭、公共仓桃米备料和雅宴饭单。'
  },
  {
    cropId: 'jade_shoot_ginger',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'gift', 'festival', 'order'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['玉笋姜汤', '玉姜驱寒丹', '腌玉笋姜', '暖身药膳', '寒夜赠礼', '立春节暖菜', '驱寒调料订单'],
    summary: '玉竹芽与生姜杂交的鲜辛二代作物，适合姜汤料理、驱寒炼丹、腌制加工、暖身药膳、寒夜赠礼、立春节暖菜和驱寒调料订单。'
  },
  {
    cropId: 'golden_tuber_lotus',
    tags: ['food', 'alchemy', 'animal_feed', 'flour', 'medicine', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金莲薯羹', '金莲润脉丹', '金莲薯粉', '清润药膳', '家畜饱腹料', '秋社甜薯供', '公共仓薯藕包', '薯粉药膳订单'],
    summary: '金油薯与莲藕杂交的清甜二代根茎，适合薯羹料理、润脉炼丹、制粉、清润药膳、家畜饱腹料、秋社供品、公共仓薯藕备料和薯粉药膳订单。'
  },
  {
    cropId: 'frost_chrysanthemum',
    tags: ['food', 'alchemy', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['霜菊清茶', '霜菊定心丹', '清寒药饮', '药师寒香赠礼', '重阳霜菊供茶', '寒香药茶订单'],
    summary: '霜雪蒜与菊花杂交的寒香二代花材，适合清茶料理、定心炼丹、清寒药饮、药师赠礼、重阳供茶和寒香药茶订单。'
  },
  {
    cropId: 'phoenix_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'oil', 'pickle', 'gift', 'festival', 'order'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['凤仁麻辣酱', '凤仁行气丹', '凤仁香油', '腌凤仁辣籽', '灵宠辛香豆', '武师香辣赠礼', '赛舟辛香供品', '麻辣调料订单'],
    summary: '凤凰椒与芝麻杂交的麻辣二代油料，适合麻辣酱料理、行气炼丹、榨油、腌制、灵宠辛香喂食、武师赠礼、赛舟供品和麻辣调料订单。'
  },
  {
    cropId: 'moonlight_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'flour', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['月莲清羹', '月莲清心丹', '月莲粉', '灵宠月莲餐', '安神药膳', '月夜赠礼', '中秋月莲供品', '公共仓月莲包', '清心订单'],
    summary: '月光稻与莲子杂交的清心二代灵材，适合清羹料理、清心炼丹、制粉、灵宠月莲喂食、安神药膳、月夜赠礼、中秋供品、公共仓月莲备料和清心订单。'
  },
  {
    cropId: 'jade_snow',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'gift', 'festival', 'order'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['翠雪芽茶', '翠雪护神丹', '灵宠雪芽茶', '冰清药饮', '隐士清礼', '冬春茶会供品', '雪芽药茶订单'],
    summary: '翡翠茶与雪莲杂交的冰清二代芽叶，适合药茶料理、护神炼丹、灵宠雪芽喂食、冰清药饮、隐士赠礼、冬春茶会供品和雪芽药茶订单。'
  },
  {
    cropId: 'golden_pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['金瓜王羹', '金瓜聚火丹', '金瓜粉', '灵宠丰收餐', '家畜秋储料', '丰收祭主供', '公共仓金瓜包', '巨瓜宴席订单'],
    summary: '金蜜瓜与南瓜杂交的巨型二代瓜作，适合浓羹料理、聚火炼丹、制粉、灵宠丰收喂食、家畜秋储料、丰收祭主供、公共仓金瓜包和巨瓜宴席订单。'
  },
  {
    cropId: 'phoenix_corn',
    tags: ['food', 'alchemy', 'animal_feed', 'flour', 'wine', 'pickle', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['火穗甜辣饭', '火穗行军丹', '火穗面粉', '火谷酒', '家畜暖谷料', '腌火穗粒', '夏祭火谷供品', '公共仓火穗包', '辣谷订单'],
    summary: '凤凰椒与玉米杂交的甜辣二代谷物，适合甜辣饭料理、行军炼丹、制粉、酿酒、家畜暖谷料、腌制、夏祭供品、公共仓火穗备料和辣谷订单。'
  },
  {
    cropId: 'moonlight_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['月光薯泥', '月薯续行丹', '月光薯粉', '灵宠月薯糕', '家畜越冬料', '安神药膳', '冬夜赠礼', '冬祭薯供', '公共仓月薯包', '薯粮订单'],
    summary: '月光稻与红薯杂交的柔光二代根茎，适合薯泥料理、续行炼丹、制粉、灵宠月薯点心、家畜越冬料、安神药膳、冬夜赠礼、冬祭供品、公共仓月薯包和薯粮订单。'
  },
  {
    cropId: 'jade_peanut',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '苦'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠仁茶点', '翠仁醒神丹', '翠仁油', '灵宠坚果茶餐', '家畜蛋白料', '茶席坚果赠礼', '夏日茶会供品', '公共仓翠仁包', '坚果订单'],
    summary: '翡翠茶与花生杂交的翠色坚果，适合茶点料理、醒神炼丹、榨油、灵宠坚果茶餐、家畜蛋白料、茶席赠礼、夏日茶会供品、公共仓翠仁备料和坚果订单。'
  },
  {
    cropId: 'frost_radish',
    tags: ['food', 'alchemy', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['霜玉萝卜汤', '霜玉护脉丹', '腌霜玉萝卜', '清寒药膳', '家畜冬根料', '寒香赠礼', '冬祭冰根供', '公共仓霜根包', '冬根订单'],
    summary: '霜雪蒜与萝卜杂交的冰玉根菜，适合萝卜汤料理、护脉炼丹、腌制、清寒药膳、家畜冬根料、寒香赠礼、冬祭供品、公共仓霜根备料和冬根订单。'
  },
  {
    cropId: 'golden_jujube',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['金蜜枣糕', '金枣养气丹', '金蜜枣酒', '灵宠蜜枣餐', '补气药膳', '亲友蜜枣赠礼', '腊八甜枣供', '公共仓蜜枣包', '蜜枣订单'],
    summary: '金蜜瓜与红枣杂交的蜜甜二代果作，适合枣糕料理、养气炼丹、酿酒、灵宠蜜枣喂食、补气药膳、亲友赠礼、腊八供品、公共仓蜜枣备料和蜜枣订单。'
  },
  {
    cropId: 'phoenix_eggplant',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'gift', 'festival', 'order'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['火焰茄煲', '火茄行气丹', '腌火焰茄', '暖胃药膳', '厨师辛香赠礼', '夏秋热菜供品', '辣茄订单'],
    summary: '凤凰椒与茄子杂交的辛鲜二代茄果，适合茄煲料理、行气炼丹、腌制、暖胃药膳、厨师赠礼、夏秋热菜供品和辣茄订单。'
  },
  {
    cropId: 'moonlight_spinach',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['银叶菜羹', '银叶护目丹', '灵宠银叶餐', '家畜青叶料', '清目药膳', '夜读赠礼', '冬春青叶供', '公共仓银叶包', '青叶订单'],
    summary: '月光稻与菠菜杂交的银脉叶菜，适合菜羹料理、护目炼丹、灵宠银叶喂食、家畜青叶料、清目药膳、夜读赠礼、冬春供品、公共仓银叶备料和青叶订单。'
  },
  {
    cropId: 'jade_loofah',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '甜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠丝瓜汤', '翠瓜清络丹', '腌翠丝瓜', '灵宠清瓜餐', '家畜青瓜料', '清络药膳', '消暑赠礼', '夏日瓜供', '公共仓翠瓜包', '清瓜订单'],
    summary: '翡翠茶与丝瓜杂交的清润瓜蔬，适合丝瓜汤料理、清络炼丹、腌制、灵宠清瓜喂食、家畜青瓜料、清络药膳、消暑赠礼、夏日供品、公共仓翠瓜备料和清瓜订单。'
  },
  {
    cropId: 'frost_winter_wheat',
    tags: ['food', 'alchemy', 'animal_feed', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['霜麦面', '霜麦护脉丹', '霜麦粉', '霜麦冻酒', '家畜冬麦料', '寒夜麦礼', '冬祭霜麦供', '公共仓霜麦包', '冬麦订单'],
    summary: '霜雪蒜与冬小麦杂交的寒香麦作，适合面食料理、护脉炼丹、制粉、冻酒酿造、家畜冬麦料、寒夜赠礼、冬祭供品、公共仓霜麦备料和冬麦订单。'
  },
  {
    cropId: 'golden_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['金芝酥', '金芝聚火丹', '金芝香油', '灵宠金芝饼', '家畜油籽料', '富贵香油赠礼', '丰收祭金芝供', '公共仓金芝包', '芝油订单'],
    summary: '金蜜瓜与芝麻杂交的金色油籽，适合酥点料理、聚火炼丹、榨金芝香油、灵宠金芝点心、家畜油籽料、富贵赠礼、丰收祭供品、公共仓金芝备料和芝油订单。'
  },
  {
    cropId: 'phoenix_garlic',
    tags: ['food', 'alchemy', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['火蒜爆菜', '火蒜驱寒丹', '腌火蒜瓣', '暖身药膳', '厨师辛蒜赠礼', '冬春辛蒜供', '公共仓火蒜包', '辛蒜订单'],
    summary: '凤凰椒与大蒜杂交的烈辛蒜作，适合爆炒料理、驱寒炼丹、腌制、暖身药膳、厨师赠礼、冬春供品、公共仓火蒜备料和辛蒜订单。'
  },
  {
    cropId: 'moonlight_cabbage',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['月白菜卷', '月白清心丹', '腌月白菜', '灵宠月白菜餐', '家畜冬菜料', '清甜药膳', '月夜菜礼', '冬祭月白供', '公共仓月菜包', '冬菜订单'],
    summary: '月光稻与白菜杂交的月白叶菜，适合菜卷料理、清心炼丹、腌制、灵宠月白菜喂食、家畜冬菜料、清甜药膳、月夜赠礼、冬祭供品、公共仓月菜备料和冬菜订单。'
  },
  {
    cropId: 'jade_persimmon',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['翠柿甜羹', '翠柿润喉丹', '翠柿果酒', '灵宠翠柿餐', '润喉药膳', '秋日果礼', '重阳翠柿供', '公共仓翠柿包', '果羹订单'],
    summary: '翡翠茶与柿子杂交的翠色秋果，适合甜羹料理、润喉炼丹、酿果酒、灵宠翠柿喂食、润喉药膳、秋日赠礼、重阳供品、公共仓翠柿备料和果羹订单。'
  },
  {
    cropId: 'frost_bamboo',
    tags: ['food', 'alchemy', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '苦'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['冰笋清汤', '冰笋护脉丹', '腌冰笋片', '清寒药膳', '家畜鲜笋料', '隐士冰笋礼', '寒食冰笋供', '公共仓冰笋包', '鲜笋订单'],
    summary: '霜雪蒜与春笋杂交的冰镇笋材，适合清汤料理、护脉炼丹、腌制、清寒药膳、家畜鲜笋料、隐士赠礼、寒食供品、公共仓冰笋备料和鲜笋订单。'
  },
  {
    cropId: 'golden_watermelon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['帝瓜冰盏', '帝瓜清暑丹', '帝瓜甜酒', '灵宠帝瓜餐', '家畜消暑瓜料', '清暑药膳', '贵客帝瓜礼', '夏至帝瓜供', '公共仓帝瓜包', '巨瓜订单'],
    summary: '金蜜瓜与西瓜杂交的巨型甜瓜，适合冰盏料理、清暑炼丹、酿甜酒、灵宠帝瓜喂食、家畜消暑瓜料、清暑药膳、贵客赠礼、夏至供品、公共仓帝瓜备料和巨瓜订单。'
  },
  {
    cropId: 'phoenix_peach',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '辛'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['火桃蜜盏', '火桃行气丹', '火桃果酒', '灵宠火桃餐', '暖身药膳', '侠客火桃礼', '上巳火桃供', '公共仓火桃包', '辛甜果订单'],
    summary: '凤凰椒与蜜桃杂交的辛甜火果，适合蜜盏料理、行气炼丹、酿果酒、灵宠火桃喂食、暖身药膳、侠客赠礼、上巳供品、公共仓火桃备料和辛甜果订单。'
  },
  {
    cropId: 'moonlight_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['月穗甜饭', '月穗续行丹', '月穗粉', '月穗清酒', '灵宠月穗餐', '家畜银穗料', '月下谷礼', '中秋月穗供', '公共仓月穗包', '银穗订单'],
    summary: '月光稻与玉米杂交的银色谷穗，适合甜饭料理、续行炼丹、制粉、酿清酒、灵宠月穗喂食、家畜银穗料、月下赠礼、中秋供品、公共仓月穗备料和银穗订单。'
  },
  {
    cropId: 'jade_chive',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠韭炒蛋', '翠韭行气丹', '腌翠韭段', '灵宠翠韭餐', '家畜辛叶料', '暖胃药膳', '厨师翠韭礼', '春祭翠韭供', '公共仓翠韭包', '辛叶订单'],
    summary: '翡翠茶与韭菜杂交的翠色辛叶，适合炒蛋料理、行气炼丹、腌制、灵宠翠韭喂食、家畜辛叶料、暖胃药膳、厨师赠礼、春祭供品、公共仓翠韭备料和辛叶订单。'
  },
  {
    cropId: 'frost_pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['霜南瓜羹', '霜瓜护脉丹', '霜瓜粉', '灵宠霜瓜餐', '家畜冬瓜料', '清寒药膳', '寒夜瓜礼', '冬祭霜瓜供', '公共仓霜瓜包', '霜瓜订单'],
    summary: '霜雪蒜与南瓜杂交的冰甜瓜作，适合浓羹料理、护脉炼丹、制粉、灵宠霜瓜喂食、家畜冬瓜料、清寒药膳、寒夜赠礼、冬祭供品、公共仓霜瓜备料和霜瓜订单。'
  },
  {
    cropId: 'emerald_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠粒香饭', '翠粒凝神丹', '翠粒米粉', '翠粒米酒', '灵宠翠粒饭', '家畜翠谷料', '清香米礼', '春夏翠粒供', '公共仓翠粒包', '翠米订单'],
    summary: '翡翠萝卜与稻谷杂交的翠色米粒，适合香饭料理、凝神炼丹、制米粉、酿米酒、灵宠翠粒喂食、家畜翠谷料、清香赠礼、春夏供品、公共仓翠粒备料和翠米订单。'
  },
  {
    cropId: 'pearl_peach',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['珠桃蜜羹', '珠桃养气丹', '珠桃果酒', '灵宠珠桃餐', '养气药膳', '贵客珠桃礼', '花朝珠桃供', '公共仓珠桃包', '珠桃订单'],
    summary: '珍珠谷与蜜桃杂交的圆润灵果，适合蜜羹料理、养气炼丹、酿果酒、灵宠珠桃喂食、养气药膳、贵客赠礼、花朝供品、公共仓珠桃备料和珠桃订单。'
  },
  {
    cropId: 'golden_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'flour', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '甜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['金莲清羹', '金莲清心丹', '金莲粉', '灵宠金莲餐', '安神药膳', '贵客金莲礼', '夏祭金莲供', '公共仓金莲包', '清心莲材订单'],
    summary: '金蜜瓜与莲子杂交的金辉莲材，适合清羹料理、清心炼丹、制粉、灵宠金莲喂食、安神药膳、贵客赠礼、夏祭供品、公共仓金莲备料和清心莲材订单。'
  },
  {
    cropId: 'phoenix_broad_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['凤豆辣酱', '凤豆行气丹', '腌凤豆瓣', '灵宠凤豆餐', '家畜蛋白料', '暖胃药膳', '武师凤豆礼', '赛舟凤豆供', '公共仓凤豆包', '辣豆订单'],
    summary: '凤凰椒与蚕豆杂交的火香豆作，适合辣酱料理、行气炼丹、腌制、灵宠凤豆喂食、家畜蛋白料、暖胃药膳、武师赠礼、赛舟供品、公共仓凤豆备料和辣豆订单。'
  },
  {
    cropId: 'moonlight_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '苦'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['月芽清茶', '月芽凝神丹', '灵宠月芽茶餐', '清心药饮', '夜读茶礼', '中秋月芽供', '公共仓月芽茶包', '月芽茶单'],
    summary: '月光稻与茶叶杂交的月芽茶作，适合清茶料理、凝神炼丹、灵宠月芽喂食、清心药饮、夜读赠礼、中秋供品、公共仓月芽茶包和月芽茶单。'
  },
  {
    cropId: 'jade_rapeseed',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠金菜油卷', '翠金润脉丹', '翠金菜油', '灵宠翠金点心', '家畜油籽料', '润脉药膳', '农家翠金礼', '春祭翠金供', '公共仓翠金包', '菜油订单'],
    summary: '翡翠茶与油菜杂交的翠金油料，适合油卷料理、润脉炼丹、榨菜油、灵宠翠金点心、家畜油籽料、润脉药膳、农家赠礼、春祭供品、公共仓翠金备料和菜油订单。'
  },
  {
    cropId: 'frost_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['霜山药泥', '霜药护脉丹', '霜山药粉', '灵宠霜药糕', '家畜冬根料', '清润药膳', '寒夜山药礼', '冬祭霜药供', '公共仓霜药包', '山药粉订单'],
    summary: '霜雪蒜与山药杂交的冰润根茎，适合山药泥料理、护脉炼丹、制粉、灵宠霜药点心、家畜冬根料、清润药膳、寒夜赠礼、冬祭供品、公共仓霜药备料和山药粉订单。'
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
