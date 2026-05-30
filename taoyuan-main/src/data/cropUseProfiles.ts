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
    cropId: 'twin_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['双子豆饭', '双豆调息丹', '双子豆油', '灵宠双豆餐', '家畜双豆蛋白料', '调息药膳', '春社双豆礼', '春祭双豆供', '公共仓双豆包', '双荚订单'],
    summary: '蚕豆与油菜杂交的双荚豆作，适合豆饭料理、调息炼丹、榨豆油、灵宠双豆喂食、家畜蛋白料、调息药膳、春社赠礼、春祭供品、公共仓双豆备料和双荚订单。'
  },
  {
    cropId: 'jade_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['碧玉瓜羹', '碧瓜清暑丹', '碧玉瓜粉', '灵宠碧瓜餐', '家畜清暑瓜料', '清暑药膳', '夏客碧瓜礼', '夏祭碧瓜供', '公共仓碧瓜包', '消暑瓜订单'],
    summary: '西瓜与土豆杂交的翠色瓜作，适合瓜羹料理、清暑炼丹、制粉、灵宠碧瓜喂食、家畜清暑瓜料、清暑药膳、夏客赠礼、夏祭供品、公共仓碧瓜备料和消暑瓜订单。'
  },
  {
    cropId: 'pearl_grain',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '鲜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['珍珠谷饭', '珠谷凝神丹', '珍珠米粉', '珍珠谷酒', '灵宠珠谷饭', '家畜珠谷料', '茶客珠谷礼', '夏社珠谷供', '公共仓珠谷包', '珠谷米单'],
    summary: '稻谷与茶叶杂交的晶莹谷物，适合香饭料理、凝神炼丹、制米粉、酿谷酒、灵宠珠谷喂食、家畜珠谷料、茶客赠礼、夏社供品、公共仓珠谷备料和珠谷米单。'
  },
  {
    cropId: 'golden_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金穗玉米饼', '金穗续行丹', '金穗玉米油', '金穗面粉', '灵宠金穗餐', '家畜金穗料', '丰收金穗礼', '丰年金穗供', '公共仓金穗包', '金穗粮单'],
    summary: '玉米与油菜杂交的金黄粮作，适合玉米饼料理、续行炼丹、榨玉米油、制粉、灵宠金穗喂食、家畜金穗料、丰收赠礼、丰年供品、公共仓金穗备料和金穗粮单。'
  },
  {
    cropId: 'lotus_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['莲心清茶', '莲心清神丹', '灵宠莲心茶餐', '清润药饮', '书院莲心礼', '夏夜莲心供', '公共仓莲心茶包', '莲心茶单'],
    summary: '莲藕与茶叶杂交的清润茶材，适合清茶料理、清神炼丹、灵宠莲心喂食、清润药饮、书院赠礼、夏夜供品、公共仓莲心茶包和莲心茶单。'
  },
  {
    cropId: 'purple_bamboo',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['紫竹茄煲', '紫竹护脉丹', '腌紫竹茄', '灵宠紫竹餐', '家畜竹茄料', '清络药膳', '竹林紫茄礼', '春夏紫竹供', '公共仓紫竹包', '竹茄订单'],
    summary: '春笋与茄子杂交的紫节果蔬，适合茄煲料理、护脉炼丹、腌制、灵宠紫竹喂食、家畜竹茄料、清络药膳、竹林赠礼、春夏供品、公共仓紫竹备料和竹茄订单。'
  },
  {
    cropId: 'honey_peach_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['蜜桃瓜盏', '蜜瓜润喉丹', '蜜桃瓜酒', '灵宠蜜瓜餐', '润喉药饮', '夏客蜜瓜礼', '七夕蜜瓜供', '公共仓蜜瓜包', '蜜瓜订单'],
    summary: '蜜桃与西瓜杂交的清甜灵瓜，适合瓜盏料理、润喉炼丹、酿果酒、灵宠蜜瓜喂食、润喉药饮、夏客赠礼、七夕供品、公共仓蜜瓜备料和蜜瓜订单。'
  },
  {
    cropId: 'fire_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['火豆辣酱', '火豆行气丹', '腌火豆瓣', '灵宠火豆餐', '家畜辛豆料', '暖胃药膳', '武馆火豆礼', '龙舟火豆供', '公共仓火豆包', '辣豆订单'],
    summary: '蚕豆与辣椒杂交的辛香豆作，适合辣酱料理、行气炼丹、腌制、灵宠火豆喂食、家畜辛豆料、暖胃药膳、武馆赠礼、龙舟供品、公共仓火豆备料和辣豆订单。'
  },
  {
    cropId: 'silk_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['丝豆清炒', '丝豆清络丹', '腌丝豆段', '灵宠丝豆餐', '家畜青豆料', '清络药膳', '厨娘丝豆礼', '夏社丝豆供', '公共仓丝豆包', '青豆订单'],
    summary: '豆角与丝瓜杂交的柔滑豆蔬，适合清炒料理、清络炼丹、腌制、灵宠丝豆喂食、家畜青豆料、清络药膳、厨娘赠礼、夏社供品、公共仓丝豆备料和青豆订单。'
  },
  {
    cropId: 'double_oil_seed',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['双油籽糕', '双油润脉丹', '双油籽油', '灵宠油籽点心', '家畜油籽料', '润脉药膳', '油坊双籽礼', '春祭油籽供', '公共仓双油包', '油籽订单'],
    summary: '油菜与芝麻杂交的高香油料，适合糕点料理、润脉炼丹、榨双籽油、灵宠油籽点心、家畜油籽料、润脉药膳、油坊赠礼、春祭供品、公共仓双油备料和油籽订单。'
  },
  {
    cropId: 'lotus_potato',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['莲薯粉羹', '莲薯清心丹', '莲薯粉', '灵宠莲薯糕', '家畜莲薯料', '清心药膳', '水乡莲薯礼', '夏社莲薯供', '公共仓莲薯包', '莲薯粉单'],
    summary: '土豆与莲子杂交的清甜根茎，适合粉羹料理、清心炼丹、制粉、灵宠莲薯糕、家畜莲薯料、清心药膳、水乡赠礼、夏社供品、公共仓莲薯备料和莲薯粉单。'
  },
  {
    cropId: 'jade_pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['翡翠南瓜羹', '翠瓜聚火丹', '翡翠瓜粉', '灵宠翠瓜餐', '家畜翠瓜料', '温补药膳', '丰收翠瓜礼', '秋祭翠瓜供', '公共仓翠瓜包', '翠瓜订单'],
    summary: '土豆与南瓜杂交的翠皮金瓤瓜作，适合浓羹料理、聚火炼丹、制粉、灵宠翠瓜喂食、家畜翠瓜料、温补药膳、丰收赠礼、秋祭供品、公共仓翠瓜备料和翠瓜订单。'
  },
  {
    cropId: 'crystal_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['水晶山药羹', '晶药固元丹', '水晶山药粉', '灵宠晶药糕', '家畜晶根料', '固元药膳', '山居晶药礼', '秋社晶药供', '公共仓晶药包', '晶药粉单'],
    summary: '春笋与山药杂交的晶莹根作，适合山药羹料理、固元炼丹、制粉、灵宠晶药糕、家畜晶根料、固元药膳、山居赠礼、秋社供品、公共仓晶药备料和晶药粉单。'
  },
  {
    cropId: 'osmanthus_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '苦'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['桂花清茶', '桂茶凝神丹', '桂花茶酿', '灵宠桂茶餐', '芳香药饮', '雅士桂茶礼', '中秋桂茶供', '公共仓桂茶包', '桂茶订单'],
    summary: '茶叶与桂花杂交的芳香茶材，适合清茶料理、凝神炼丹、酿茶酒、灵宠桂茶喂食、芳香药饮、雅士赠礼、中秋供品、公共仓桂茶包和桂茶订单。'
  },
  {
    cropId: 'mountain_bamboo',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['山竹薯饭', '山竹续行丹', '山竹薯粉', '灵宠山竹餐', '家畜山薯料', '行旅药膳', '山路竹薯礼', '春秋竹薯供', '公共仓山竹包', '山薯粉单'],
    summary: '春笋与红薯杂交的山野甜根，适合竹薯饭料理、续行炼丹、制粉、灵宠山竹喂食、家畜山薯料、行旅药膳、山路赠礼、春秋供品、公共仓山竹备料和山薯粉单。'
  },
  {
    cropId: 'golden_fruit',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['金秋果羹', '金秋润喉丹', '金秋果酒', '灵宠金秋餐', '润喉药饮', '秋宴金果礼', '丰收金果供', '公共仓金果包', '金果订单'],
    summary: '蜜桃与柿子杂交的金色秋果，适合甜羹料理、润喉炼丹、酿果酒、灵宠金秋喂食、润喉药饮、秋宴赠礼、丰收供品、公共仓金果备料和金果订单。'
  },
  {
    cropId: 'nut_potato',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['花生薯饼', '花薯固元丹', '花生薯油', '花薯粉', '灵宠花薯糕', '家畜坚根料', '固元药膳', '山乡花薯礼', '秋社花薯供', '公共仓花薯包', '花薯粉单'],
    summary: '土豆与花生杂交的香糯根作，适合薯饼料理、固元炼丹、榨花生薯油、制花薯粉、灵宠花薯糕、家畜坚根料、固元药膳、山乡赠礼、秋社供品、公共仓花薯备料和花薯粉单。'
  },
  {
    cropId: 'autumn_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['秋枣豆饭', '秋豆养气丹', '秋枣豆粉', '灵宠秋豆餐', '家畜枣豆料', '养气药膳', '秋市枣豆礼', '重阳枣豆供', '公共仓枣豆包', '枣豆订单'],
    summary: '蚕豆与红枣杂交的枣香豆作，适合豆饭料理、养气炼丹、制秋枣豆粉、灵宠秋豆喂食、家畜枣豆料、养气药膳、秋市赠礼、重阳供品、公共仓枣豆备料和枣豆订单。'
  },
  {
    cropId: 'jujube_blossom',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['枣花桃羹', '枣桃养气丹', '枣花桃酒', '灵宠枣桃餐', '养气药饮', '花朝枣桃礼', '七夕枣桃供', '公共仓枣桃包', '枣桃订单'],
    summary: '桃花与枣花杂交的甜香花果，适合果羹料理、养气炼丹、酿枣花桃酒、灵宠枣桃喂食、养气药饮、花朝赠礼、七夕供品、公共仓枣桃备料和枣桃订单。'
  },
  {
    cropId: 'ginger_blossom',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['姜花菜炒', '姜花驱寒丹', '姜花菜油', '腌姜花菜', '灵宠姜花餐', '家畜辛花料', '驱寒药膳', '冬春姜花礼', '春祭姜花供', '公共仓姜花包', '辛花订单'],
    summary: '油菜与生姜杂交的辛香花菜，适合热炒料理、驱寒炼丹、榨姜花菜油、腌姜花菜、灵宠姜花喂食、家畜辛花料、驱寒药膳、冬春赠礼、春祭供品、公共仓姜花备料和辛花订单。'
  },
  {
    cropId: 'fairy_chrysanthemum',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '苦'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['仙菊菜汤', '仙菊清目丹', '灵宠仙菊餐', '家畜清叶料', '清目药膳', '高士仙菊礼', '重阳仙菊供', '公共仓仙菊包', '仙菊菜订单'],
    summary: '青菜与菊花杂交的清雅叶菜，适合清汤料理、清目炼丹、灵宠仙菊喂食、家畜清叶料、清目药膳、高士赠礼、重阳供品、公共仓仙菊备料和仙菊菜订单。'
  },
  {
    cropId: 'imperial_cabbage',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '甜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['御品白菜卷', '御白养胃丹', '腌御白菜', '灵宠御白餐', '家畜御叶料', '养胃药膳', '庄宴御菜礼', '冬祭御白供', '公共仓御白菜包', '御菜订单'],
    summary: '青菜与白菜杂交的厚叶菜作，适合白菜卷料理、养胃炼丹、腌御白菜、灵宠御白喂食、家畜御叶料、养胃药膳、庄宴赠礼、冬祭供品、公共仓御白菜备料和御菜订单。'
  },
  {
    cropId: 'spicy_radish',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['蒜香萝卜汤', '蒜萝护脉丹', '腌蒜香萝卜', '灵宠蒜萝餐', '家畜辛根料', '护脉药膳', '武馆蒜萝礼', '腊八蒜萝供', '公共仓蒜萝包', '蒜萝订单'],
    summary: '萝卜与大蒜杂交的辛甜根菜，适合暖汤料理、护脉炼丹、腌蒜香萝卜、灵宠蒜萝喂食、家畜辛根料、护脉药膳、武馆赠礼、腊八供品、公共仓蒜萝备料和蒜萝订单。'
  },
  {
    cropId: 'snow_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雪茶清饮', '雪茶凝神丹', '雪茶酿', '灵宠雪茶餐', '雪露药饮', '文士雪茶礼', '冬祭雪茶供', '公共仓雪茶包', '雪茶订单'],
    summary: '茶叶与雪莲杂交的纯白茶材，适合清饮料理、凝神炼丹、酿雪茶酒、灵宠雪茶喂食、雪露药饮、文士赠礼、冬祭供品、公共仓雪茶备料和雪茶订单。'
  },
  {
    cropId: 'spring_chive',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['春韭炒蛋', '春韭行气丹', '腌春韭段', '灵宠春韭餐', '家畜辛叶料', '行气药膳', '春社韭菜礼', '春祭韭菜供', '公共仓春韭包', '韭菜订单'],
    summary: '青菜与韭菜杂交的辛鲜叶菜，适合热炒料理、行气炼丹、腌春韭段、灵宠春韭喂食、家畜辛叶料、行气药膳、春社赠礼、春祭供品、公共仓春韭备料和韭菜订单。'
  },
  {
    cropId: 'wheat_potato',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '香'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['麦香薯饼', '麦薯续行丹', '麦香薯粉', '灵宠麦薯糕', '家畜麦薯料', '行旅药膳', '旅人麦薯礼', '冬社麦薯供', '公共仓麦薯包', '麦薯粉单'],
    summary: '土豆与冬小麦杂交的麦香根作，适合薯饼料理、续行炼丹、制麦香薯粉、灵宠麦薯糕、家畜麦薯料、行旅药膳、旅人赠礼、冬社供品、公共仓麦薯备料和麦薯粉单。'
  },
  {
    cropId: 'spring_green_peach',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['绿桃鲜羹', '绿桃清络丹', '绿桃酒', '灵宠绿桃餐', '清络药饮', '春游绿桃礼', '花朝绿桃供', '公共仓绿桃包', '绿桃订单'],
    summary: '水蜜桃与菠菜杂交的翠皮甜果，适合鲜羹料理、清络炼丹、酿绿桃酒、灵宠绿桃喂食、清络药饮、春游赠礼、花朝供品、公共仓绿桃备料和绿桃订单。'
  },
  {
    cropId: 'mustard_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['芥香豆饭', '芥豆行气丹', '芥香豆粉', '腌芥香豆', '灵宠芥豆餐', '家畜芥豆料', '行气药膳', '冬春芥豆礼', '春社芥豆供', '公共仓芥豆包', '芥豆订单'],
    summary: '蚕豆与芥菜杂交的微辛豆作，适合豆饭料理、行气炼丹、制芥香豆粉、腌芥香豆、灵宠芥豆喂食、家畜芥豆料、行气药膳、冬春赠礼、春社供品、公共仓芥豆备料和芥豆订单。'
  },
  {
    cropId: 'frost_rapeseed',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['霜油菜炒', '霜油护脉丹', '霜油菜油', '灵宠霜油餐', '家畜霜油料', '护脉药膳', '油坊霜菜礼', '冬祭霜油供', '公共仓霜油包', '霜油订单'],
    summary: '油菜与雪里蕻杂交的耐寒油菜，适合热炒料理、护脉炼丹、榨霜油菜油、灵宠霜油喂食、家畜霜油料、护脉药膳、油坊赠礼、冬祭供品、公共仓霜油备料和霜油订单。'
  },
  {
    cropId: 'purple_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['紫晶瓜盏', '紫瓜清暑丹', '紫晶瓜酒', '灵宠紫瓜餐', '清暑药饮', '夏宴紫晶礼', '消暑紫瓜供', '公共仓紫瓜包', '紫瓜订单'],
    summary: '西瓜与茄子杂交的紫晶瓜果，适合瓜盏料理、清暑炼丹、酿紫晶瓜酒、灵宠紫瓜喂食、清暑药饮、夏宴赠礼、消暑供品、公共仓紫瓜备料和紫瓜订单。'
  },
  {
    cropId: 'golden_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金芝稻饭', '金芝续行丹', '金芝米粉', '金芝香油', '金芝米酒', '灵宠金芝餐', '家畜金谷料', '行旅药膳', '粮坊金芝礼', '丰收金芝供', '公共仓金芝包', '金芝订单'],
    summary: '稻谷与芝麻杂交的香甜谷作，适合米饭料理、续行炼丹、制金芝米粉、榨金芝香油、酿金芝米酒、灵宠金芝喂食、家畜金谷料、行旅药膳、粮坊赠礼、丰收供品、公共仓金芝备料和金芝订单。'
  },
  {
    cropId: 'double_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['双莲羹', '双莲清心丹', '双莲粉', '灵宠双莲餐', '家畜莲根料', '清心药膳', '并蒂双莲礼', '七夕双莲供', '公共仓双莲包', '双莲粉单'],
    summary: '莲藕与莲子杂交的并蒂水生作物，适合甜羹料理、清心炼丹、制双莲粉、灵宠双莲喂食、家畜莲根料、清心药膳、并蒂赠礼、七夕供品、公共仓双莲备料和双莲粉单。'
  },
  {
    cropId: 'fire_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['火麻仁辣酱', '火麻行气丹', '火麻仁油', '腌火麻椒仁', '灵宠火麻餐', '家畜火麻料', '驱寒药膳', '武馆火麻礼', '火神火麻供', '公共仓火麻包', '火麻订单'],
    summary: '辣椒与芝麻杂交的辛香油料，适合辣酱料理、行气炼丹、榨火麻仁油、腌火麻椒仁、灵宠火麻喂食、家畜火麻料、驱寒药膳、武馆赠礼、火神供品、公共仓火麻备料和火麻订单。'
  },
  {
    cropId: 'silk_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['丝穗粥', '丝穗清络丹', '丝穗粉', '丝穗清酒', '灵宠丝穗餐', '家畜丝谷料', '清络药膳', '织坊丝穗礼', '秋社丝穗供', '公共仓丝穗包', '丝穗订单'],
    summary: '丝瓜与玉米杂交的柔滑谷穗，适合粥饭料理、清络炼丹、制丝穗粉、酿丝穗清酒、灵宠丝穗喂食、家畜丝谷料、清络药膳、织坊赠礼、秋社供品、公共仓丝穗备料和丝穗订单。'
  },
  {
    cropId: 'purple_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '苦'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['紫莲茄煲', '紫莲清心丹', '紫莲藕粉', '腌紫莲茄', '灵宠紫莲餐', '家畜紫莲料', '清心药膳', '水榭紫莲礼', '荷灯紫莲供', '公共仓紫莲包', '紫莲订单'],
    summary: '茄子与莲藕杂交的清润紫蔬，适合煲菜料理、清心炼丹、制紫莲藕粉、腌紫莲茄、灵宠紫莲喂食、家畜紫莲料、清心药膳、水榭赠礼、荷灯供品、公共仓紫莲备料和紫莲订单。'
  },
  {
    cropId: 'chrysanthemum_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['菊瓜清饮', '菊瓜清暑丹', '菊瓜花酿', '灵宠菊瓜餐', '清暑药饮', '重阳菊瓜礼', '消暑菊瓜供', '公共仓菊瓜包', '菊瓜订单'],
    summary: '西瓜与菊花杂交的清雅瓜果，适合清饮料理、清暑炼丹、酿菊瓜花酒、灵宠菊瓜喂食、清暑药饮、重阳赠礼、消暑供品、公共仓菊瓜备料和菊瓜订单。'
  },
  {
    cropId: 'pumpkin_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['南瓜稻饭', '南稻聚火丹', '南瓜米粉', '南瓜米酒', '灵宠南稻餐', '家畜南谷料', '温补药膳', '丰收南稻礼', '秋祭南稻供', '公共仓南稻包', '南稻订单'],
    summary: '稻谷与南瓜杂交的甜香主粮，适合米饭料理、聚火炼丹、制南瓜米粉、酿南瓜米酒、灵宠南稻喂食、家畜南谷料、温补药膳、丰收赠礼、秋祭供品、公共仓南稻备料和南稻订单。'
  },
  {
    cropId: 'mountain_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['山莲羹', '山莲固元丹', '山莲粉', '灵宠山莲糕', '家畜山莲料', '固元药膳', '山居山莲礼', '秋社山莲供', '公共仓山莲包', '山莲粉单'],
    summary: '莲藕与山药杂交的滋补水根，适合羹汤料理、固元炼丹、制山莲粉、灵宠山莲糕、家畜山莲料、固元药膳、山居赠礼、秋社供品、公共仓山莲备料和山莲粉单。'
  },
  {
    cropId: 'double_nut',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['双果仁糕', '双仁润脉丹', '双果仁油', '双仁粉', '灵宠双仁餐', '家畜坚仁料', '润脉药膳', '点心双仁礼', '秋社双仁供', '公共仓双仁包', '双仁订单'],
    summary: '花生与芝麻杂交的浓香仁作，适合糕点料理、润脉炼丹、榨双果仁油、制双仁粉、灵宠双仁喂食、家畜坚仁料、润脉药膳、点心赠礼、秋社供品、公共仓双仁备料和双仁订单。'
  },
  {
    cropId: 'sweet_gourd',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['甜丝瓜羹', '甜瓜护脉丹', '甜瓜粉', '腌甜丝瓜', '灵宠甜瓜餐', '家畜甜瓜料', '护脉药膳', '夏日甜瓜礼', '夏社甜瓜供', '公共仓甜瓜包', '甜瓜订单'],
    summary: '丝瓜与红薯杂交的甘甜瓜蔬，适合羹汤料理、护脉炼丹、制甜瓜粉、腌甜丝瓜、灵宠甜瓜喂食、家畜甜瓜料、护脉药膳、夏日赠礼、夏社供品、公共仓甜瓜备料和甜瓜订单。'
  },
  {
    cropId: 'purple_persimmon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['紫柿果盏', '紫柿养颜丹', '紫柿果酒', '腌紫柿', '灵宠紫柿餐', '家畜紫柿料', '润燥药膳', '秋日紫柿礼', '柿灯紫柿供', '公共仓紫柿包', '紫柿订单'],
    summary: '茄子与柿子杂交的紫润甜果，适合果盏料理、养颜炼丹、酿紫柿果酒、腌紫柿、灵宠紫柿喂食、家畜紫柿料、润燥药膳、秋日赠礼、柿灯供品、公共仓紫柿备料和紫柿订单。'
  },
  {
    cropId: 'fire_ginger',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['火姜驱寒汤', '火姜聚火丹', '腌火姜片', '灵宠火姜餐', '家畜火姜暖料', '驱寒药膳', '冬日火姜礼', '暖灶火姜供', '公共仓火姜包', '火姜订单'],
    summary: '辣椒与生姜杂交的辛暖根菜，适合驱寒汤料理、聚火炼丹、腌火姜片、灵宠火姜喂食、家畜火姜暖料、驱寒药膳、冬日赠礼、暖灶供品、公共仓火姜备料和火姜订单。'
  },
  {
    cropId: 'osmanthus_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['桂莲羹', '桂莲清心丹', '桂莲粉', '桂莲花酿', '灵宠桂莲糕', '家畜桂莲料', '清心药膳', '秋香桂莲礼', '荷灯桂莲供', '公共仓桂莲包', '桂莲粉单'],
    summary: '莲子与桂花杂交的清香莲实，适合羹汤料理、清心炼丹、制桂莲粉、酿桂莲花酒、灵宠桂莲糕、家畜桂莲料、清心药膳、秋香赠礼、荷灯供品、公共仓桂莲备料和桂莲粉单。'
  },
  {
    cropId: 'golden_sweet',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['金薯饭', '金薯固元丹', '金薯粉', '金薯甜酒', '灵宠金薯餐', '家畜金薯料', '固元药膳', '丰收金薯礼', '秋社金薯供', '公共仓金薯包', '金薯订单'],
    summary: '玉米与红薯杂交的金黄甜粮，适合主食料理、固元炼丹、制金薯粉、酿金薯甜酒、灵宠金薯喂食、家畜金薯料、固元药膳、丰收赠礼、秋社供品、公共仓金薯备料和金薯订单。'
  },
  {
    cropId: 'ruby_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['红宝瓜饮', '红宝养气丹', '红宝瓜酒', '灵宠红宝瓜餐', '家畜红瓜料', '养气药饮', '盛夏红宝礼', '瓜灯红宝供', '公共仓红宝瓜包', '红宝瓜订单'],
    summary: '西瓜与红枣杂交的红润瓜果，适合清甜瓜饮、养气炼丹、酿红宝瓜酒、灵宠红宝瓜喂食、家畜红瓜料、养气药饮、盛夏赠礼、瓜灯供品、公共仓红宝瓜备料和红宝瓜订单。'
  },
  {
    cropId: 'chrysanthemum_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['菊稻香饭', '菊稻凝神丹', '菊稻米粉', '菊稻清酒', '灵宠菊稻餐', '家畜菊谷料', '凝神药膳', '重阳菊稻礼', '秋祭菊稻供', '公共仓菊稻包', '菊稻订单'],
    summary: '稻谷与菊花杂交的淡香谷物，适合香饭料理、凝神炼丹、制菊稻米粉、酿菊稻清酒、灵宠菊稻喂食、家畜菊谷料、凝神药膳、重阳赠礼、秋祭供品、公共仓菊稻备料和菊稻订单。'
  },
  {
    cropId: 'nut_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['花生玉米饼', '坚谷固元丹', '花玉米油', '花玉米粉', '灵宠坚谷餐', '家畜坚谷料', '固元药膳', '粗粮坚谷礼', '秋社坚谷供', '公共仓坚谷包', '坚谷订单'],
    summary: '玉米与花生杂交的浓香粗粮，适合烙饼料理、固元炼丹、榨花玉米油、制花玉米粉、灵宠坚谷喂食、家畜坚谷料、固元药膳、粗粮赠礼、秋社供品、公共仓坚谷备料和坚谷订单。'
  },
  {
    cropId: 'frost_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['霜甜瓜盏', '霜瓜清暑丹', '霜甜瓜酒', '灵宠霜瓜餐', '家畜霜瓜料', '清暑药饮', '冬夏霜瓜礼', '冰灯霜瓜供', '公共仓霜瓜包', '霜瓜订单'],
    summary: '西瓜与白菜杂交的耐寒甜瓜，适合瓜盏料理、清暑炼丹、酿霜甜瓜酒、灵宠霜瓜喂食、家畜霜瓜料、清暑药饮、冬夏赠礼、冰灯供品、公共仓霜瓜备料和霜瓜订单。'
  },
  {
    cropId: 'twin_grain',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '香'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['双谷饭', '双谷续行丹', '双谷粉', '双谷清酒', '灵宠双谷餐', '家畜双谷料', '续行药膳', '南北双谷礼', '冬社双谷供', '公共仓双谷包', '双谷订单'],
    summary: '稻谷与冬小麦杂交的南北主粮，适合米麦饭料理、续行炼丹、制双谷粉、酿双谷清酒、灵宠双谷喂食、家畜双谷料、续行药膳、南北赠礼、冬社供品、公共仓双谷备料和双谷订单。'
  },
  {
    cropId: 'lotus_cabbage',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['莲白清汤', '莲白清心丹', '腌莲白菜', '灵宠莲白菜餐', '家畜莲白料', '清心药膳', '冬补莲白礼', '腊祭莲白供', '公共仓莲白包', '莲白菜订单'],
    summary: '莲藕与白菜杂交的清润冬蔬，适合清汤料理、清心炼丹、腌莲白菜、灵宠莲白菜喂食、家畜莲白料、清心药膳、冬补赠礼、腊祭供品、公共仓莲白备料和莲白菜订单。'
  },
  {
    cropId: 'garlic_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['蒜芝拌菜', '蒜芝行气丹', '蒜芝香油', '腌蒜芝', '灵宠蒜芝餐', '家畜蒜芝料', '暖胃药膳', '厨娘蒜芝礼', '暖灶蒜芝供', '公共仓蒜芝包', '蒜芝调料单'],
    summary: '芝麻与大蒜杂交的辛香调味作物，适合拌菜料理、行气炼丹、榨蒜芝香油、腌蒜芝、灵宠蒜芝喂食、家畜蒜芝料、暖胃药膳、厨娘赠礼、暖灶供品、公共仓蒜芝备料和调料订单。'
  },
  {
    cropId: 'chive_gourd',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '辛'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['韭丝瓜炒蛋', '韭瓜行气丹', '腌韭丝瓜', '灵宠韭瓜餐', '家畜韭瓜料', '行气药膳', '春社韭瓜礼', '三季韭瓜供', '公共仓韭瓜包', '韭丝瓜订单'],
    summary: '丝瓜与韭菜杂交的三季鲜蔬，适合热炒料理、行气炼丹、腌韭丝瓜、灵宠韭瓜喂食、家畜韭瓜料、行气药膳、春社赠礼、三季供品、公共仓韭瓜备料和韭丝瓜订单。'
  },
  {
    cropId: 'mustard_eggplant',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['芥茄煲', '芥茄护脉丹', '腌芥茄', '灵宠芥茄餐', '家畜芥茄料', '护脉药膳', '家常芥茄礼', '冬夏芥茄供', '公共仓芥茄包', '芥茄订单'],
    summary: '茄子与芥菜杂交的微辛紫蔬，适合煲菜料理、护脉炼丹、腌芥茄、灵宠芥茄喂食、家畜芥茄料、护脉药膳、家常赠礼、冬夏供品、公共仓芥茄备料和芥茄订单。'
  },
  {
    cropId: 'snow_fire_pepper',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '苦'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['冰火椒酱', '冰火调息丹', '腌冰火椒', '灵宠冰火餐', '家畜冰火暖料', '调息药膳', '武师冰火礼', '火神冰灯供', '公共仓冰火椒包', '冰火椒订单'],
    summary: '辣椒与雪莲杂交的高阶辛寒椒，适合椒酱料理、调息炼丹、腌冰火椒、灵宠冰火喂食、家畜冰火暖料、调息药膳、武师赠礼、火神冰灯供品、公共仓冰火椒备料和冰火椒订单。'
  },
  {
    cropId: 'winter_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '甜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['冬玉米粥', '冬玉米续行丹', '冬玉米粉', '冬玉米清酒', '灵宠冬玉米餐', '家畜冬谷料', '续行药膳', '冬储玉米礼', '腊祭玉米供', '公共仓冬玉米包', '冬玉米订单'],
    summary: '耐寒玉米培育出的三季主粮，适合粥饭料理、续行炼丹、制冬玉米粉、酿冬玉米清酒、灵宠冬玉米喂食、家畜冬谷料、续行药膳、冬储赠礼、腊祭供品、公共仓冬玉米备料和冬玉米订单。'
  },
  {
    cropId: 'amber_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['琥珀薯糕', '琥珀固元丹', '琥珀薯粉', '琥珀甜酒', '灵宠琥珀薯餐', '家畜琥珀料', '固元药膳', '秋收琥珀礼', '秋社琥珀供', '公共仓琥珀薯包', '琥珀薯订单'],
    summary: '山药与红薯杂交的琥珀色甜薯，适合糕点料理、固元炼丹、制琥珀薯粉、酿琥珀甜酒、灵宠琥珀薯喂食、家畜琥珀料、固元药膳、秋收赠礼、秋社供品、公共仓琥珀薯备料和琥珀薯订单。'
  },
  {
    cropId: 'twin_blossom',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '甜'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['双花蜜饮', '双花清目丹', '双花花酿', '灵宠双花茶', '家畜花草料', '清目药茶', '雅集双花礼', '重阳双花供', '公共仓双花包', '双花订单'],
    summary: '菊花与桂花杂交的双香花作，适合蜜饮料理、清目炼丹、酿双花花酒、灵宠双花茶、家畜花草料、清目药茶、雅集赠礼、重阳供品、公共仓双花备料和双花订单。'
  },
  {
    cropId: 'mountain_nut',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['山花生糕', '山仁固元丹', '山花生油', '山仁粉', '灵宠山仁餐', '家畜山仁料', '固元药膳', '山居山仁礼', '秋社山仁供', '公共仓山仁包', '山花生订单'],
    summary: '山药与花生杂交的山中坚仁，适合糕点料理、固元炼丹、榨山花生油、制山仁粉、灵宠山仁喂食、家畜山仁料、固元药膳、山居赠礼、秋社供品、公共仓山仁备料和山花生订单。'
  },
  {
    cropId: 'autumn_gem',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['秋桂南瓜羹', '秋桂养胃丹', '秋桂南瓜粉', '秋桂花酿', '灵宠秋桂瓜餐', '家畜秋瓜料', '养胃药膳', '金秋南瓜礼', '秋祭南瓜供', '公共仓秋桂瓜包', '秋桂南瓜订单'],
    summary: '南瓜与桂花杂交的金秋巨果，适合羹汤料理、养胃炼丹、制秋桂南瓜粉、酿秋桂花酒、灵宠秋桂瓜喂食、家畜秋瓜料、养胃药膳、金秋赠礼、秋祭供品、公共仓秋桂瓜备料和秋桂南瓜订单。'
  },
  {
    cropId: 'ginger_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '土'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['姜山药羹', '姜山固元丹', '姜山药粉', '腌姜山药', '灵宠姜山药餐', '家畜姜山料', '暖补药膳', '冬补姜山礼', '腊祭姜山供', '公共仓姜山包', '姜山药订单'],
    summary: '生姜与山药杂交的辛暖补根，适合羹汤料理、固元炼丹、制姜山药粉、腌姜山药、灵宠姜山药喂食、家畜姜山料、暖补药膳、冬补赠礼、腊祭供品、公共仓姜山备料和姜山药订单。'
  },
  {
    cropId: 'golden_persimmon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['金柿甜盏', '金柿养胃丹', '金柿果酒', '灵宠金柿餐', '家畜金柿料', '养胃药饮', '秋收金柿礼', '柿灯金柿供', '公共仓金柿包', '金柿订单'],
    summary: '柿子与南瓜杂交的金甜果蔬，适合甜盏料理、养胃炼丹、酿金柿果酒、灵宠金柿喂食、家畜金柿料、养胃药饮、秋收赠礼、柿灯供品、公共仓金柿备料和金柿订单。'
  },
  {
    cropId: 'chrysanthemum_jujube',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['菊枣茶羹', '菊枣养气丹', '菊枣花酿', '灵宠菊枣餐', '家畜菊枣料', '养气药茶', '重阳菊枣礼', '秋灯菊枣供', '公共仓菊枣包', '菊枣订单'],
    summary: '菊花与红枣杂交的清甜花果，适合茶羹料理、养气炼丹、酿菊枣花酒、灵宠菊枣喂食、家畜菊枣料、养气药茶、重阳赠礼、秋灯供品、公共仓菊枣备料和菊枣订单。'
  },
  {
    cropId: 'osmanthus_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['桂薯糕', '桂薯固元丹', '桂薯粉', '桂薯花酿', '灵宠桂薯餐', '家畜桂薯料', '固元药膳', '桂香薯礼', '秋社桂薯供', '公共仓桂薯包', '桂薯粉单'],
    summary: '桂花与红薯杂交的香甜薯作，适合糕点料理、固元炼丹、制桂薯粉、酿桂薯花酒、灵宠桂薯喂食、家畜桂薯料、固元药膳、桂香赠礼、秋社供品、公共仓桂薯备料和桂薯粉单。'
  },
  {
    cropId: 'winter_pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'valuable',
    recommendedUses: ['冬南瓜羹', '冬瓜养胃丹', '冬南瓜粉', '冬南瓜甜酒', '灵宠冬瓜餐', '家畜冬瓜料', '养胃药膳', '冬储南瓜礼', '腊祭南瓜供', '公共仓冬南瓜包', '冬南瓜订单'],
    summary: '南瓜与白菜杂交的耐寒巨果，适合羹汤料理、养胃炼丹、制冬南瓜粉、酿冬南瓜甜酒、灵宠冬瓜喂食、家畜冬瓜料、养胃药膳、冬储赠礼、腊祭供品、公共仓冬南瓜备料和冬南瓜订单。'
  },
  {
    cropId: 'emerald_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['翡翠山药羹', '翠山固元丹', '翡翠山药粉', '灵宠翠山药餐', '家畜翠山料', '固元药膳', '冬补翠山礼', '冬社翠山供', '公共仓翠山包', '翡翠山药订单'],
    summary: '山药与菠菜杂交的翠绿补根，适合羹汤料理、固元炼丹、制翡翠山药粉、灵宠翠山药喂食、家畜翠山料、固元药膳、冬补赠礼、冬社供品、公共仓翠山备料和翡翠山药订单。'
  },
  {
    cropId: 'snow_chrysanthemum',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雪菊清茶', '雪菊清心丹', '雪菊花酿', '灵宠雪菊茶', '家畜雪菊料', '清心药茶', '雅士雪菊礼', '冰灯雪菊供', '公共仓雪菊包', '雪菊订单'],
    summary: '菊花与雪莲杂交的高阶寒香花作，适合清茶料理、清心炼丹、酿雪菊花酒、灵宠雪菊茶、家畜雪菊料、清心药茶、雅士赠礼、冰灯供品、公共仓雪菊备料和雪菊订单。'
  },
  {
    cropId: 'osmanthus_garlic',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['桂蒜拌菜', '桂蒜行气丹', '桂蒜花酿', '腌桂蒜瓣', '灵宠桂蒜餐', '家畜桂蒜料', '行气药膳', '厨娘桂蒜礼', '暖灶桂蒜供', '公共仓桂蒜包', '桂蒜调料单'],
    summary: '桂花与大蒜杂交的芳辛调味作物，适合拌菜料理、行气炼丹、酿桂蒜花酒、腌桂蒜瓣、灵宠桂蒜喂食、家畜桂蒜料、行气药膳、厨娘赠礼、暖灶供品、公共仓桂蒜备料和调料订单。'
  },
  {
    cropId: 'wheat_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '甜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['麦山药饼', '麦山固元丹', '麦山药粉', '麦山清酒', '灵宠麦山餐', '家畜麦山料', '固元药膳', '冬粮麦山礼', '冬社麦山供', '公共仓麦山包', '麦山粉单'],
    summary: '山药与冬小麦杂交的跨季主粮，适合烙饼料理、固元炼丹、制麦山药粉、酿麦山清酒、灵宠麦山喂食、家畜麦山料、固元药膳、冬粮赠礼、冬社供品、公共仓麦山备料和麦山粉单。'
  },
  {
    cropId: 'cream_peanut',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['白花生糕', '白仁润脉丹', '白花生油', '白仁粉', '灵宠白仁餐', '家畜白仁料', '润脉药膳', '雪壳白仁礼', '冬社白仁供', '公共仓白仁包', '白花生订单'],
    summary: '花生与白菜杂交的雪壳坚仁，适合糕点料理、润脉炼丹、榨白花生油、制白仁粉、灵宠白仁喂食、家畜白仁料、润脉药膳、雪壳赠礼、冬社供品、公共仓白仁备料和白花生订单。'
  },
  {
    cropId: 'garlic_jujube',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['蒜枣暖饮', '蒜枣养气丹', '蒜枣果酒', '腌蒜枣', '灵宠蒜枣餐', '家畜蒜枣料', '暖补药膳', '冬夜蒜枣礼', '腊祭蒜枣供', '公共仓蒜枣包', '蒜枣订单'],
    summary: '红枣与大蒜杂交的辛甜果作，适合暖饮料理、养气炼丹、酿蒜枣果酒、腌蒜枣、灵宠蒜枣喂食、家畜蒜枣料、暖补药膳、冬夜赠礼、腊祭供品、公共仓蒜枣备料和蒜枣订单。'
  },
  {
    cropId: 'chive_persimmon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['韭柿炒菜', '韭柿温中丹', '韭柿果酒', '腌韭柿', '灵宠韭柿餐', '家畜韭柿料', '温中药膳', '秋熟韭柿礼', '腊祭韭柿供', '公共仓韭柿包', '韭柿订单'],
    summary: '柿子与韭菜杂交的再生辛甜果蔬，适合炒菜料理、温中炼丹、酿韭柿果酒、腌韭柿、灵宠韭柿喂食、家畜韭柿料、温中药膳、秋熟赠礼、腊祭供品、公共仓韭柿备料和韭柿订单。'
  },
  {
    cropId: 'mustard_ginger',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '苦'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['芥姜暖汤', '芥姜驱寒丹', '腌芥姜片', '灵宠芥姜餐', '家畜芥姜料', '驱寒药膳', '冬灶芥姜礼', '腊祭芥姜供', '公共仓芥姜包', '芥姜调料单'],
    summary: '生姜与芥菜杂交的辛苦根叶，适合暖汤料理、驱寒炼丹、腌芥姜片、灵宠芥姜喂食、家畜芥姜料、驱寒药膳、冬灶赠礼、腊祭供品、公共仓芥姜备料和调料订单。'
  },
  {
    cropId: 'snow_pumpkin',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雪南瓜羹', '雪瓜养胃丹', '雪南瓜粉', '雪瓜甜酒', '灵宠雪瓜餐', '家畜雪瓜料', '养胃药膳', '白玉巨瓜礼', '冰灯雪瓜供', '公共仓雪瓜包', '雪南瓜订单'],
    summary: '南瓜与雪莲杂交的白玉巨瓜，适合羹汤料理、养胃炼丹、制雪南瓜粉、酿雪瓜甜酒、灵宠雪瓜喂食、家畜雪瓜料、养胃药膳、白玉巨瓜赠礼、冰灯供品、公共仓雪瓜备料和雪南瓜订单。'
  },
  {
    cropId: 'jade_white',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['碧白菜羹', '碧白清络丹', '腌碧白菜', '灵宠碧白菜餐', '家畜碧白料', '清络药膳', '冬储碧白礼', '冬社碧白供', '公共仓碧白包', '碧白菜订单'],
    summary: '白菜与菠菜杂交的冬季翠叶，适合羹汤料理、清络炼丹、腌碧白菜、灵宠碧白菜喂食、家畜碧白料、清络药膳、冬储赠礼、冬社供品、公共仓碧白备料和碧白菜订单。'
  },
  {
    cropId: 'garlic_cabbage',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['蒜白菜炖菜', '蒜白行气丹', '腌蒜白菜', '灵宠蒜白餐', '家畜蒜白料', '行气药膳', '冬储蒜白礼', '腊祭蒜白供', '公共仓蒜白包', '蒜白菜订单'],
    summary: '大蒜与白菜杂交的冬储辛鲜菜，适合炖菜料理、行气炼丹、腌蒜白菜、灵宠蒜白喂食、家畜蒜白料、行气药膳、冬储赠礼、腊祭供品、公共仓蒜白备料和蒜白菜订单。'
  },
  {
    cropId: 'evergreen_herb',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '苦'],
    nature: 'cool',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['长青菜羹', '长青清络丹', '腌长青菜', '灵宠长青餐', '家畜长青料', '清络药膳', '冬青菜礼', '冬社长青供', '公共仓长青包', '长青菜订单'],
    summary: '菠菜与芥菜杂交的耐寒青叶，适合羹汤料理、清络炼丹、腌长青菜、灵宠长青喂食、家畜长青料、清络药膳、冬青赠礼、冬社供品、公共仓长青备料和长青菜订单。'
  },
  {
    cropId: 'wheat_mustard',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['麦芥汤饼', '麦芥行气丹', '麦芥粉', '腌麦芥菜', '灵宠麦芥餐', '家畜麦芥料', '行气药膳', '冬粮麦芥礼', '冬社麦芥供', '公共仓麦芥包', '麦芥粉单'],
    summary: '冬小麦与芥菜杂交的辛香主粮菜，适合汤饼料理、行气炼丹、制麦芥粉、腌麦芥菜、灵宠麦芥喂食、家畜麦芥料、行气药膳、冬粮赠礼、冬社供品、公共仓麦芥备料和麦芥粉单。'
  },
  {
    cropId: 'allium_king',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['百蒜王炒菜', '百蒜行气丹', '腌百蒜王', '灵宠百蒜餐', '家畜百蒜料', '行气药膳', '辛香百蒜礼', '腊祭百蒜供', '公共仓百蒜包', '百蒜王订单'],
    summary: '大蒜与韭菜杂交的再生辛香葱属，适合炒菜料理、行气炼丹、腌百蒜王、灵宠百蒜喂食、家畜百蒜料、行气药膳、辛香赠礼、腊祭供品、公共仓百蒜备料和百蒜王订单。'
  },
  {
    cropId: 'green_wheat',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['翠麦饭', '翠麦续行丹', '翠麦粉', '翠麦清酒', '灵宠翠麦餐', '家畜翠麦料', '续行药膳', '青穗翠麦礼', '冬社翠麦供', '公共仓翠麦包', '翠麦粉单'],
    summary: '菠菜与冬小麦杂交的青穗麦作，适合米饭料理、续行炼丹、制翠麦粉、酿翠麦清酒、灵宠翠麦喂食、家畜翠麦料、续行药膳、青穗赠礼、冬社供品、公共仓翠麦备料和翠麦粉单。'
  },
  {
    cropId: 'chive_mustard',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '苦'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['韭芥拌菜', '韭芥行气丹', '腌韭芥', '灵宠韭芥餐', '家畜韭芥料', '开胃药膳', '春辛韭芥礼', '腊祭韭芥供', '公共仓韭芥包', '韭芥订单'],
    summary: '韭菜与芥菜杂交的再生辛苦叶菜，适合拌菜料理、行气炼丹、腌韭芥、灵宠韭芥喂食、家畜韭芥料、开胃药膳、春辛赠礼、腊祭供品、公共仓韭芥备料和韭芥订单。'
  },
  {
    cropId: 'jade_bamboo_corn',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '甜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['玉笋棒清汤', '玉笋固元丹', '玉笋棒粉', '灵宠玉笋餐', '家畜玉笋料', '固元药膳', '春笋玉棒礼', '春社玉棒供', '公共仓玉棒包', '玉笋棒订单'],
    summary: '春笋与玉米杂交的鲜甜穗棒，适合清汤料理、固元炼丹、制玉笋棒粉、灵宠玉笋喂食、家畜玉笋料、固元药膳、春笋赠礼、春社供品、公共仓玉棒备料和玉笋棒订单。'
  },
  {
    cropId: 'ginger_jade_green',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['姜翠暖汤', '姜翠驱寒丹', '腌姜翠菜', '灵宠姜翠餐', '家畜姜翠料', '暖胃药膳', '春姜翠菜礼', '春社姜翠供', '公共仓姜翠包', '姜翠菜订单'],
    summary: '青菜与生姜杂交的暖辣青叶，适合暖汤料理、驱寒炼丹、腌姜翠菜、灵宠姜翠喂食、家畜姜翠料、暖胃药膳、春姜赠礼、春社供品、公共仓姜翠备料和姜翠菜订单。'
  },
  {
    cropId: 'spicy_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'stable',
    recommendedUses: ['麻辣仁酱', '麻仁聚火丹', '麻辣仁油', '腌麻辣仁', '灵宠麻仁餐', '家畜麻仁料', '聚火药膳', '辛香麻仁礼', '秋祭麻仁供', '公共仓麻仁包', '麻辣仁订单'],
    summary: '辣椒与芝麻杂交的辛香油仁，适合酱料料理、聚火炼丹、榨麻辣仁油、腌麻辣仁、灵宠麻仁喂食、家畜麻仁料、聚火药膳、辛香赠礼、秋祭供品、公共仓麻仁备料和麻辣仁订单。'
  },
  {
    cropId: 'honey_gourd',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['蜜丝瓜羹', '蜜瓜润脉丹', '蜜丝瓜粉', '蜜仁香油', '灵宠蜜瓜餐', '家畜蜜瓜料', '润脉药膳', '夏日蜜瓜礼', '夏祭蜜瓜供', '公共仓蜜瓜包', '蜜丝瓜订单'],
    summary: '丝瓜与花生杂交的柔甜夏瓜，适合羹汤料理、润脉炼丹、制蜜丝瓜粉、榨蜜仁香油、灵宠蜜瓜喂食、家畜蜜瓜料、润脉药膳、夏日赠礼、夏祭供品、公共仓蜜瓜备料和蜜丝瓜订单。'
  },
  {
    cropId: 'golden_peanut_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['花薯甜饼', '花薯固元丹', '花薯粉', '花薯仁油', '灵宠花薯餐', '家畜花薯料', '固元药膳', '香甜花薯礼', '秋社花薯供', '公共仓花薯包', '花薯订单'],
    summary: '花生与红薯杂交的香甜块根，适合甜饼料理、固元炼丹、制花薯粉、榨花薯仁油、灵宠花薯喂食、家畜花薯料、固元药膳、香甜赠礼、秋社供品、公共仓花薯备料和花薯订单。'
  },
  {
    cropId: 'spice_jujube',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '甜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'seasonal',
    recommendedUses: ['辛枣暖饮', '辛枣养气丹', '辛枣果酒', '腌辛枣', '灵宠辛枣餐', '家畜辛枣料', '暖补药膳', '冬夜辛枣礼', '腊祭辛枣供', '公共仓辛枣包', '辛枣订单'],
    summary: '红枣与大蒜杂交的辛甜冬果，适合暖饮料理、养气炼丹、酿辛枣果酒、腌辛枣、灵宠辛枣喂食、家畜辛枣料、暖补药膳、冬夜赠礼、腊祭供品、公共仓辛枣备料和辛枣订单。'
  },
  {
    cropId: 'bean_eggplant',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['豆茄煲', '豆茄护脉丹', '豆茄粉', '腌豆茄', '灵宠豆茄餐', '家畜豆茄料', '护脉药膳', '田园豆茄礼', '秋社豆茄供', '公共仓豆茄包', '豆茄订单'],
    summary: '豆角与茄子杂交的鲜软田蔬，适合煲菜料理、护脉炼丹、制豆茄粉、腌豆茄、灵宠豆茄喂食、家畜豆茄料、护脉药膳、田园赠礼、秋社供品、公共仓豆茄备料和豆茄订单。'
  },
  {
    cropId: 'chrysanthemum_persimmon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'seasonal',
    recommendedUses: ['菊柿甜汤', '菊柿清目丹', '菊柿果酒', '灵宠菊柿餐', '家畜菊柿料', '清目药膳', '秋香菊柿礼', '重阳菊柿供', '公共仓菊柿包', '菊柿订单'],
    summary: '菊花与柿子杂交的秋香甜果，适合甜汤料理、清目炼丹、酿菊柿果酒、灵宠菊柿喂食、家畜菊柿料、清目药膳、秋香赠礼、重阳供品、公共仓菊柿备料和菊柿订单。'
  },
  {
    cropId: 'purple_yam',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'pickle', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '鲜'],
    nature: 'warm',
    spirituality: 'earth',
    rarityUse: 'stable',
    recommendedUses: ['紫玉薯羹', '紫玉固元丹', '紫玉薯粉', '腌紫玉薯', '灵宠紫玉餐', '家畜紫玉料', '固元药膳', '紫玉薯礼', '冬社紫玉供', '公共仓紫玉包', '紫玉薯订单'],
    summary: '山药与茄子杂交的紫韵块根，适合羹汤料理、固元炼丹、制紫玉薯粉、腌紫玉薯、灵宠紫玉喂食、家畜紫玉料、固元药膳、紫玉赠礼、冬社供品、公共仓紫玉备料和紫玉薯订单。'
  },
  {
    cropId: 'snow_lotus_pearl',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '甜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雪莲子羹', '雪莲清心丹', '雪莲子粉', '雪莲子酒', '灵宠雪莲子餐', '家畜雪莲料', '清心药膳', '寒珠雪莲礼', '冰灯雪莲供', '公共仓雪莲包', '雪莲子订单'],
    summary: '莲子与雪莲杂交的寒冬明珠，适合羹汤料理、清心炼丹、制雪莲子粉、酿雪莲子酒、灵宠雪莲子喂食、家畜雪莲料、清心药膳、寒珠赠礼、冰灯供品、公共仓雪莲备料和雪莲子订单。'
  },
  {
    cropId: 'melon_tea_fruit',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['蜜茶果饮', '蜜茶凝神丹', '蜜茶果酒', '灵宠蜜茶餐', '家畜蜜茶料', '清润药膳', '仙果蜜茶礼', '夏至蜜茶供', '公共仓蜜茶包', '蜜茶果订单'],
    summary: '金蜜瓜与茶叶融合的高阶仙果，适合清甜茶饮料理、凝神炼丹、酿蜜茶果酒、灵宠蜜茶喂食、家畜蜜茶料、清润药膳、仙果赠礼、夏至供品、公共仓蜜茶备料和蜜茶果订单。'
  },
  {
    cropId: 'dragon_fire',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['龙火椒酱', '龙火聚火丹', '腌龙火椒', '灵宠龙火餐', '家畜龙火料', '驱寒药膳', '辛烈龙火礼', '火神节龙火供', '公共仓龙火包', '龙火椒订单'],
    summary: '凤凰椒与生姜碰撞出的辛烈椒果，适合辣酱料理、聚火炼丹、腌龙火椒、灵宠龙火喂食、家畜龙火料、驱寒药膳、辛烈赠礼、火神节供品、公共仓龙火备料和龙火椒订单。'
  },
  {
    cropId: 'celestial_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['天香饭', '天香续行丹', '天香米粉', '天香清酒', '灵宠天香饭团', '家畜天香料', '续行药膳', '桂香仙稻礼', '丰年天香供', '公共仓天香米包', '天香稻订单'],
    summary: '月光稻与桂花交融的仙香粮谷，适合主粮料理、续行炼丹、制天香米粉、酿天香清酒、灵宠饭团、家畜精粮、续行药膳、桂香赠礼、丰年供品、公共仓米包和天香稻订单。'
  },
  {
    cropId: 'ice_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '甜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['冰莲清汤', '冰莲清心丹', '冰莲粉', '冰莲寒酿', '灵宠冰莲餐', '家畜冰莲料', '清心药膳', '寒灯冰莲礼', '冰灯冰莲供', '公共仓冰莲包', '冰莲订单'],
    summary: '霜雪蒜与莲子合成的寒性灵植，适合清汤料理、清心炼丹、制冰莲粉、酿冰莲寒酿、灵宠冰莲喂食、家畜冰莲料、清心药膳、寒灯赠礼、冰灯供品、公共仓冰莲备料和冰莲订单。'
  },
  {
    cropId: 'jade_peach_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'spirit',
    rarityUse: 'valuable',
    recommendedUses: ['翠桃清茗', '翠桃凝神丹', '翠桃果茶酿', '灵宠翠桃餐', '家畜翠桃料', '清润药膳', '春会翠桃礼', '茶会翠桃供', '公共仓翠桃茶包', '翠桃茶订单'],
    summary: '翡翠茶与蜜桃融合的清甜茶果，适合茶饮料理、凝神炼丹、酿翠桃果茶、灵宠翠桃喂食、家畜翠桃料、清润药膳、春会赠礼、茶会供品、公共仓翠桃茶备料和翠桃茶订单。'
  },
  {
    cropId: 'golden_dragon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '辛'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['金龙果宴', '金龙聚火丹', '金龙果酒', '灵宠金龙餐', '家畜金龙料', '聚火药膳', '龙年金果礼', '火龙祭金果供', '公共仓金龙果包', '金龙果订单'],
    summary: '金蜜瓜与凤凰椒碰撞出的尊贵灵果，适合宴席料理、聚火炼丹、酿金龙果酒、灵宠金龙喂食、家畜金龙料、聚火药膳、龙年赠礼、火龙祭供品、公共仓金龙果备料和金龙果订单。'
  },
  {
    cropId: 'moonlight_frost',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['月霜饭', '月霜清心丹', '月霜米粉', '月霜寒酒', '灵宠月霜饭团', '家畜月霜料', '清心药膳', '月下霜稻礼', '冬祭月霜供', '公共仓月霜米包', '月霜稻订单'],
    summary: '月光稻与霜雪蒜交织的寒香稻谷，适合米饭料理、清心炼丹、制月霜米粉、酿月霜寒酒、灵宠饭团、家畜精粮、清心药膳、月下赠礼、冬祭供品、公共仓米包和月霜稻订单。'
  },
  {
    cropId: 'jade_golden_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['翡翠金瓜盏', '金瓜凝神丹', '翡翠金瓜粉', '金瓜翠酿', '灵宠金瓜餐', '家畜金瓜料', '清润药膳', '翡翠金瓜礼', '丰收金瓜供', '公共仓金瓜包', '翡翠金瓜订单'],
    summary: '翡翠茶与金蜜瓜融合的高阶瓜果，适合甜盏料理、凝神炼丹、制翡翠金瓜粉、酿金瓜翠酿、灵宠金瓜喂食、家畜金瓜料、清润药膳、翡翠赠礼、丰收供品、公共仓金瓜备料和翡翠金瓜订单。'
  },
  {
    cropId: 'immortal_flower',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'medicine', 'wine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['仙人花茶', '仙花清心丹', '仙人花露酿', '灵宠仙花餐', '家畜仙花料', '清心药膳', '仙人花礼', '寒山仙花供', '公共仓仙花包', '仙人花订单'],
    summary: '霜雪蒜与翡翠茶交融的寒香灵花，适合花茶料理、清心炼丹、酿仙人花露、灵宠仙花喂食、家畜仙花料、清心药膳、仙花赠礼、寒山供品、公共仓仙花备料和仙人花订单。'
  },
  {
    cropId: 'dragon_pearl',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['龙珠灵饭', '龙珠续行丹', '龙珠粉', '龙珠灵酿', '灵宠龙珠餐', '家畜龙珠料', '续行药膳', '龙珠至宝礼', '龙舟龙珠供', '公共仓龙珠包', '龙珠订单'],
    summary: '凤凰椒烈焰与月光稻银辉凝成的圆润至宝，适合灵饭料理、续行炼丹、制龙珠粉、酿龙珠灵酿、灵宠龙珠喂食、家畜龙珠料、续行药膳、至宝赠礼、龙舟供品、公共仓龙珠备料和龙珠订单。'
  },
  {
    cropId: 'wind_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['风瓜清盏', '风瓜凝神丹', '风瓜果酿', '灵宠风瓜餐', '家畜风瓜料', '清润药膳', '风行瓜礼', '春风风瓜供', '公共仓风瓜包', '风瓜订单'],
    summary: '金瓜与翡翠茶经风雨淬炼的三代瓜果，适合清甜料理、凝神炼丹、酿风瓜果酒、灵宠风瓜喂食、家畜风瓜料、清润药膳、行旅赠礼、春风供品、公共仓风瓜备料和风瓜订单。'
  },
  {
    cropId: 'cloud_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '辛'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['云豆辣酱', '云豆行气丹', '云豆粉', '腌云豆椒', '灵宠云豆餐', '家畜云豆料', '行气药膳', '云游豆礼', '云集云豆供', '公共仓云豆包', '云豆订单'],
    summary: '金瓜与凤凰椒交融出的三代辛甜豆蔬，适合辣酱料理、行气炼丹、制云豆粉、腌云豆椒、灵宠云豆喂食、家畜云豆料、行气药膳、云游赠礼、云集供品、公共仓云豆备料和云豆订单。'
  },
  {
    cropId: 'rain_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雨稻润饭', '雨稻续行丹', '雨稻米粉', '雨稻清酒', '灵宠雨稻饭团', '家畜雨稻料', '润泽药膳', '雨祭稻礼', '雨祈雨稻供', '公共仓雨稻米包', '雨稻订单'],
    summary: '金瓜与月光稻沐露而成的三代灵谷，适合润饭料理、续行炼丹、制雨稻米粉、酿雨稻清酒、灵宠饭团、家畜精粮、润泽药膳、雨祭赠礼、祈雨供品、公共仓米包和雨稻订单。'
  },
  {
    cropId: 'hoar_tuber',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['土', '苦'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['霜薯羹', '霜薯固元丹', '霜薯粉', '腌霜薯片', '灵宠霜薯餐', '家畜霜薯料', '固元药膳', '霜夜薯礼', '冬祭霜薯供', '公共仓霜薯包', '霜薯订单'],
    summary: '金瓜与霜雪蒜凝霜后的三代根茎，适合羹汤料理、固元炼丹、制霜薯粉、腌霜薯片、灵宠霜薯喂食、家畜霜薯料、固元药膳、霜夜赠礼、冬祭供品、公共仓霜薯备料和霜薯订单。'
  },
  {
    cropId: 'thunder_green',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '辛'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雷菜脆炒', '雷菜行气丹', '腌雷菜梗', '灵宠雷菜餐', '家畜雷菜料', '行气药膳', '雷雨菜礼', '惊蛰雷菜供', '公共仓雷菜包', '雷菜订单'],
    summary: '金瓜与翡翠萝卜汇聚雷雨气息的三代菜蔬，适合脆炒料理、行气炼丹、腌雷菜梗、灵宠雷菜喂食、家畜雷菜料、行气药膳、雷雨赠礼、惊蛰供品、公共仓雷菜备料和雷菜订单。'
  },
  {
    cropId: 'rainbow_fruit',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['虹果蜜盏', '虹果润脉丹', '虹果虹酿', '灵宠虹果餐', '家畜虹果料', '润脉药膳', '彩虹果礼', '虹桥虹果供', '公共仓虹果包', '虹果订单'],
    summary: '金瓜与碧玉笋淬炼出的三代彩色灵果，适合蜜盏料理、润脉炼丹、酿虹果虹酿、灵宠虹果喂食、家畜虹果料、润脉药膳、彩虹赠礼、虹桥供品、公共仓虹果备料和虹果订单。'
  },
  {
    cropId: 'dew_bloom',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['露花甜羹', '露花凝神丹', '露花香油', '露花露酿', '灵宠露花餐', '家畜露花料', '凝神药膳', '朝露花礼', '花朝露花供', '公共仓露花包', '露花订单'],
    summary: '金瓜与金油薯交融出的三代露香花实，适合甜羹料理、凝神炼丹、榨露花香油、酿露花露酿、灵宠露花喂食、家畜露花料、凝神药膳、朝露赠礼、花朝供品、公共仓露花备料和露花订单。'
  },
  {
    cropId: 'dawn_tea',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['晨茶清茗', '晨茶凝神丹', '晨茶花酿', '灵宠晨茶餐', '家畜晨茶料', '清心药茶', '晨露茶礼', '春晨茶供', '公共仓晨茶包', '晨茶订单'],
    summary: '金瓜与桃花茶沐露后的三代清香茶作，适合清茗料理、凝神炼丹、酿晨茶花酿、灵宠晨茶喂食、家畜晨茶料、清心药茶、晨露赠礼、春晨供品、公共仓晨茶备料和晨茶订单。'
  },
  {
    cropId: 'dusk_shoot',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '甜'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['暮笋豆羹', '暮笋护脉丹', '暮笋粉', '腌暮笋豆', '灵宠暮笋餐', '家畜暮笋料', '护脉药膳', '暮色笋礼', '星夜暮笋供', '公共仓暮笋包', '暮笋订单'],
    summary: '金瓜与红宝豆在星光下蜕变的三代鲜甜笋豆，适合豆羹料理、护脉炼丹、制暮笋粉、腌暮笋豆、灵宠暮笋喂食、家畜暮笋料、护脉药膳、暮色赠礼、星夜供品、公共仓暮笋备料和暮笋订单。'
  },
  {
    cropId: 'star_lotus',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '苦'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['星莲甜汤', '星莲安神丹', '星莲粉', '星莲清酿', '灵宠星莲餐', '家畜星莲料', '安神药膳', '星灯莲礼', '七夕星莲供', '公共仓星莲包', '星莲订单'],
    summary: '金瓜与双子豆汇聚星辉的三代莲形灵植，适合甜汤料理、安神炼丹、制星莲粉、酿星莲清酿、灵宠星莲喂食、家畜星莲料、安神药膳、星灯赠礼、七夕供品、公共仓星莲备料和星莲订单。'
  },
  {
    cropId: 'wind_splendor_wheat',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['风华麦饼', '风华续行丹', '风华麦粉', '风华清酒', '灵宠风华麦团', '家畜风华麦料', '续行药膳', '风华麦礼', '麦风祭供', '公共仓风华麦包', '风华麦订单'],
    summary: '金瓜与碧玉瓜淬炼出的三代华麦，适合麦饼料理、续行炼丹、制风华麦粉、酿风华清酒、灵宠麦团、家畜精粮、续行药膳、风华赠礼、麦风祭供品、公共仓麦包和风华麦订单。'
  },
  {
    cropId: 'cloud_splendor_sesame',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['香', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['云华芝糊', '云华润脉丹', '云华芝油', '云华芝粉', '灵宠云华芝点', '家畜云华芝料', '润脉药膳', '云纹芝礼', '云灯芝供', '公共仓云华芝包', '云华芝订单'],
    summary: '金瓜与珍珠谷交融出的三代云纹芝麻，适合芝麻糊料理、润脉炼丹、榨云华芝油、制云华芝粉、灵宠芝点、家畜芝料、润脉药膳、云纹赠礼、云灯供品、公共仓芝包和云华芝订单。'
  },
  {
    cropId: 'rain_splendor_pepper',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '鲜'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雨华辣羹', '雨华行气丹', '腌雨华椒', '灵宠暖雨椒', '家畜雨华椒料', '行气药膳', '雨市椒礼', '雨神椒供', '公共仓雨华椒包', '雨华椒订单'],
    summary: '金瓜与金穗玉米沐露后的三代辛鲜椒作，适合辣羹料理、行气炼丹、腌雨华椒、灵宠暖身喂食、家畜椒料、行气药膳、雨市赠礼、雨神供品、公共仓椒包和雨华椒订单。'
  },
  {
    cropId: 'hoar_splendor_root',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '土'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['霜华参汤', '霜参固元丹', '霜华参粉', '霜参寒酿', '灵宠霜参餐', '家畜霜参料', '固元药膳', '霜华参礼', '寒山霜参供', '公共仓霜参包', '霜华参订单'],
    summary: '金瓜与莲心茶星夜蜕变出的三代寒参，适合参汤料理、固元炼丹、制霜华参粉、酿霜参寒酿、灵宠霜参喂食、家畜霜参料、固元药膳、寒参赠礼、寒山供品、公共仓霜参备料和霜华参订单。'
  },
  {
    cropId: 'thunder_splendor_sprout',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '辛'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雷华芽炒', '雷芽行气丹', '腌雷华芽', '灵宠雷芽餐', '家畜雷芽料', '行气药膳', '惊雷芽礼', '惊蛰雷芽供', '公共仓雷华芽包', '雷华芽订单'],
    summary: '金瓜与紫竹茄汇聚雷气后的三代鲜芽，适合清炒料理、行气炼丹、腌雷华芽、灵宠雷芽喂食、家畜雷芽料、行气药膳、惊雷赠礼、惊蛰供品、公共仓雷华芽备料和雷华芽订单。'
  },
  {
    cropId: 'rainbow_splendor_vine',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['虹华藤果盏', '虹藤润脉丹', '虹华藤酿', '灵宠虹藤餐', '家畜虹藤料', '润脉药膳', '虹藤彩礼', '虹桥藤供', '公共仓虹藤包', '虹华藤订单'],
    summary: '金瓜与蜜桃瓜淬炼出的三代彩藤灵果，适合果盏料理、润脉炼丹、酿虹华藤酒、灵宠虹藤喂食、家畜虹藤料、润脉药膳、彩藤赠礼、虹桥供品、公共仓虹藤备料和虹华藤订单。'
  },
  {
    cropId: 'dew_splendor_bud',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['辛', '香'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['露华蕾炒豆', '露蕾行气丹', '腌露华蕾', '灵宠露蕾餐', '家畜露蕾料', '行气药膳', '朝露蕾礼', '花朝露蕾供', '公共仓露蕾包', '露华蕾订单'],
    summary: '金瓜与火豆在清风中交融出的三代辛香花蕾，适合炒豆料理、行气炼丹、腌露华蕾、灵宠露蕾喂食、家畜露蕾料、行气药膳、朝露赠礼、花朝供品、公共仓露蕾备料和露华蕾订单。'
  },
  {
    cropId: 'dawn_splendor_orchid',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['晨华兰羹', '晨兰清心丹', '晨华兰露酿', '灵宠晨兰餐', '家畜晨兰料', '清心药膳', '晨兰雅礼', '兰会晨华供', '公共仓晨兰包', '晨华兰订单'],
    summary: '金瓜与丝豆沐露后的三代清香兰作，适合清羹料理、清心炼丹、酿晨华兰露、灵宠晨兰喂食、家畜晨兰料、清心药膳、雅士赠礼、兰会供品、公共仓晨兰备料和晨华兰订单。'
  },
  {
    cropId: 'dusk_splendor_gourd',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'oil', 'flour', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['暮华葫蒸盅', '暮葫固元丹', '暮华葫油', '暮华葫粉', '灵宠暮葫餐', '家畜暮葫料', '固元药膳', '暮华葫礼', '秋夕暮葫供', '公共仓暮葫包', '暮华葫订单'],
    summary: '金瓜与双油籽星夜蜕变出的三代葫芦，适合蒸盅料理、固元炼丹、榨暮华葫油、制暮华葫粉、灵宠暮葫喂食、家畜暮葫料、固元药膳、秋夕赠礼、暮葫供品、公共仓暮葫备料和暮华葫订单。'
  },
  {
    cropId: 'star_splendor_herb',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['苦', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['星华草药粥', '星草安神丹', '星华草粉', '星草清酿', '灵宠星草餐', '家畜星草料', '安神药膳', '星草香礼', '星灯草供', '公共仓星草包', '星华草订单'],
    summary: '金瓜与莲花薯汇聚星辉的三代草本，适合药粥料理、安神炼丹、制星华草粉、酿星草清酿、灵宠星草喂食、家畜星草料、安神药膳、香草赠礼、星灯供品、公共仓星草备料和星华草订单。'
  },
  {
    cropId: 'wind_jade3_chestnut',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['风翠栗糕', '风栗固元丹', '风翠栗粉', '风栗甜酿', '灵宠风栗餐', '家畜风栗料', '固元药膳', '风翠栗礼', '秋风栗供', '公共仓风栗包', '风翠栗订单'],
    summary: '金瓜与翡翠南瓜淬炼出的三代翠栗，适合栗糕料理、固元炼丹、制风翠栗粉、酿风栗甜酒、灵宠风栗喂食、家畜风栗料、固元药膳、秋风赠礼、栗供节品、公共仓风栗备料和风翠栗订单。'
  },
  {
    cropId: 'cloud_jade3_apricot',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['云翠杏羹', '云杏润脉丹', '云翠杏酒', '灵宠云杏餐', '家畜云杏料', '润脉药膳', '云杏香礼', '杏花云供', '公共仓云杏包', '云翠杏订单'],
    summary: '金瓜与水晶山药清风交融出的三代香杏，适合甜羹料理、润脉炼丹、酿云翠杏酒、灵宠云杏喂食、家畜云杏料、润脉药膳、杏香赠礼、杏花供品、公共仓云杏备料和云翠杏订单。'
  },
  {
    cropId: 'rain_jade3_pear',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雨翠梨汤', '雨梨清心丹', '雨翠梨酿', '灵宠雨梨餐', '家畜雨梨料', '清心药膳', '雨梨清礼', '雨祭梨供', '公共仓雨梨包', '雨翠梨订单'],
    summary: '金瓜与桂花茶沐露后的三代清润梨果，适合梨汤料理、清心炼丹、酿雨翠梨酒、灵宠雨梨喂食、家畜雨梨料、清心药膳、清润赠礼、雨祭供品、公共仓雨梨备料和雨翠梨订单。'
  },
  {
    cropId: 'hoar_jade3_berry',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '苦'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['霜翠莓酥', '霜莓安神丹', '霜翠莓粉', '霜莓寒酿', '灵宠霜莓餐', '家畜霜莓料', '安神药膳', '霜莓寒礼', '冬灯莓供', '公共仓霜莓包', '霜翠莓订单'],
    summary: '金瓜与山竹薯星夜蜕变出的三代寒莓，适合莓酥料理、安神炼丹、制霜翠莓粉、酿霜莓寒酿、灵宠霜莓喂食、家畜霜莓料、安神药膳、寒莓赠礼、冬灯供品、公共仓霜莓备料和霜翠莓订单。'
  },
  {
    cropId: 'thunder_jade3_peach_t',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['雷翠桃盏', '雷桃行气丹', '雷翠桃酒', '灵宠雷桃餐', '家畜雷桃料', '行气药膳', '雷桃贺礼', '惊雷桃供', '公共仓雷桃包', '雷翠桃订单'],
    summary: '金瓜与金秋果汇聚雷气后的三代暖桃，适合甜盏料理、行气炼丹、酿雷翠桃酒、灵宠雷桃喂食、家畜雷桃料、行气药膳、贺礼赠送、惊雷供品、公共仓雷桃备料和雷翠桃订单。'
  },
  {
    cropId: 'rainbow_jade3_melon',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '鲜'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['虹翠瓜蜜盏', '虹瓜润脉丹', '虹翠瓜酿', '灵宠虹瓜餐', '家畜虹瓜料', '润脉药膳', '虹翠瓜礼', '彩桥虹瓜供', '公共仓虹瓜包', '虹翠瓜订单'],
    summary: '金瓜与花生薯经风雨淬炼出的三代彩瓜，适合蜜盏料理、润脉炼丹、酿虹翠瓜酒、灵宠虹瓜喂食、家畜虹瓜料、润脉药膳、彩桥赠礼、虹桥供品、公共仓虹瓜备料和虹翠瓜订单。'
  },
  {
    cropId: 'dew_jade3_bean',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['露翠豆羹', '露豆养气丹', '露翠豆粉', '腌露翠豆', '灵宠露豆餐', '家畜露豆料', '养气药膳', '露翠豆礼', '朝露豆供', '公共仓露豆包', '露翠豆订单'],
    summary: '金瓜与秋枣豆在清风中交融出的三代豆蔬，适合豆羹料理、养气炼丹、制露翠豆粉、腌露翠豆、灵宠露豆喂食、家畜露豆料、养气药膳、朝露赠礼、豆供节品、公共仓露豆备料和露翠豆订单。'
  },
  {
    cropId: 'dawn_jade3_rice',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'wine', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '土'],
    nature: 'neutral',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['晨翠稻饭', '晨稻续行丹', '晨翠米粉', '晨翠清酒', '灵宠晨稻饭团', '家畜晨稻料', '续行药膳', '晨稻礼', '晨祭稻供', '公共仓晨稻包', '晨翠稻订单'],
    summary: '金瓜与枣花桃沐露后的三代晨光灵稻，适合米饭料理、续行炼丹、制晨翠米粉、酿晨翠清酒、灵宠饭团、家畜精粮、续行药膳、晨祭赠礼、晨光供品、公共仓稻米备料和晨翠稻订单。'
  },
  {
    cropId: 'dusk_jade3_tuber',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'flour', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['甜', '土'],
    nature: 'warm',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['暮翠薯羹', '暮薯驱寒丹', '暮翠薯粉', '腌暮翠薯', '灵宠暮薯餐', '家畜暮薯料', '驱寒药膳', '暮翠薯礼', '暮火薯供', '公共仓暮薯包', '暮翠薯订单'],
    summary: '金瓜与姜花菜星夜蜕变出的三代暖薯，适合羹汤料理、驱寒炼丹、制暮翠薯粉、腌暮翠薯片、灵宠暮薯喂食、家畜暮薯料、驱寒药膳、暮色赠礼、暮火供品、公共仓暮薯备料和暮翠薯订单。'
  },
  {
    cropId: 'star_jade3_green',
    tags: ['food', 'alchemy', 'pet_feed', 'animal_feed', 'pickle', 'medicine', 'gift', 'festival', 'order', 'online_cost'],
    flavor: ['鲜', '香'],
    nature: 'cool',
    spirituality: 'mystic',
    rarityUse: 'valuable',
    recommendedUses: ['星翠菜羹', '星菜清目丹', '腌星翠菜', '灵宠星菜餐', '家畜星菜料', '清目药膳', '星翠菜礼', '星灯菜供', '公共仓星菜包', '星翠菜订单'],
    summary: '金瓜与仙菊菜汇聚星辉后的三代菜蔬，适合清羹料理、清目炼丹、腌星翠菜、灵宠星菜喂食、家畜星菜料、清目药膳、星灯赠礼、星灯供品、公共仓星菜备料和星翠菜订单。'
  },  {
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
