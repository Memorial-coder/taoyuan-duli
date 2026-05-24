export type CropUseTag =
  | 'food'
  | 'alchemy'
  | 'pet_feed'
  | 'oil'
  | 'flour'
  | 'wine'
  | 'pickle'
  | 'gift'
  | 'festival'
  | 'order'
  | 'medicine'

export type CropUseNature = 'neutral' | 'warm' | 'cool' | 'hot' | 'sweet' | 'fragrant' | 'moistening'

export type CropUseRarity = 'daily' | 'stable' | 'seasonal' | 'valuable'

export interface CropUseProfile {
  cropId: string
  tags: CropUseTag[]
  flavor: string[]
  nature: CropUseNature
  rarityUse: CropUseRarity
  recommendedUses: string[]
  summary: string
}

export const CROP_USE_TAG_LABELS: Record<CropUseTag, string> = {
  food: '料理',
  alchemy: '炼丹',
  pet_feed: '宠物粮',
  oil: '榨油',
  flour: '制粉',
  wine: '酿酒',
  pickle: '腌制',
  gift: '赠礼',
  festival: '节会',
  order: '订单',
  medicine: '药材'
}

export const CROP_USE_NATURE_LABELS: Record<CropUseNature, string> = {
  neutral: '平',
  warm: '温',
  cool: '凉',
  hot: '辛热',
  sweet: '甘润',
  fragrant: '芳香',
  moistening: '清润'
}

export const CROP_USE_RARITY_LABELS: Record<CropUseRarity, string> = {
  daily: '日常高频',
  stable: '稳定消耗',
  seasonal: '节令用途',
  valuable: '高价值低频'
}

export const CROP_USE_PROFILES: CropUseProfile[] = [
  {
    cropId: 'rice',
    tags: ['food', 'wine', 'flour', 'pet_feed', 'festival', 'order'],
    flavor: ['清香', '饱腹'],
    nature: 'neutral',
    rarityUse: 'stable',
    recommendedUses: ['米粉', '饭团', '米酒', '团圆饭订单', '宠物温饱粮', '节会供品'],
    summary: '基础粮食出口，适合料理、酿酒、制粉、宠物饱腹和团圆类订单。'
  },
  {
    cropId: 'sesame',
    tags: ['oil', 'flour', 'food', 'alchemy', 'pet_feed', 'festival'],
    flavor: ['浓香', '坚果香'],
    nature: 'warm',
    rarityUse: 'stable',
    recommendedUses: ['芝麻油', '芝麻粉', '糕点辅料', '辛火丹辅料', '田犬辛香餐', '节会供品'],
    summary: '小作物走加工增值，适合榨油、制粉、糕点、温补炼丹和宠物辛香反馈。'
  },
  {
    cropId: 'lotus_seed',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'medicine'],
    flavor: ['清甜', '粉糯'],
    nature: 'moistening',
    rarityUse: 'valuable',
    recommendedUses: ['清心丹', '莲子甜汤', 'NPC 赠礼', '宠物安神餐', '药膳辅料'],
    summary: '清润药食两用作物，适合低频高价值料理、炼丹、赠礼和宠物安抚。'
  },
  {
    cropId: 'osmanthus',
    tags: ['food', 'alchemy', 'pet_feed', 'gift', 'festival', 'medicine'],
    flavor: ['花香', '清甜'],
    nature: 'fragrant',
    rarityUse: 'seasonal',
    recommendedUses: ['桂露', '桂花香囊', '凝神丹', '宠物芳香点心', '灯谜奖励兑换', '节会茶点'],
    summary: '芳香型节令作物，适合节会、赠礼、凝神炼丹、宠物芳香反馈和花香料理。'
  },
  {
    cropId: 'sweet_potato',
    tags: ['food', 'pet_feed', 'order', 'flour'],
    flavor: ['甜糯', '厚实'],
    nature: 'sweet',
    rarityUse: 'daily',
    recommendedUses: ['饱腹料理', '宠物耐力餐', '行旅干粮', '救济订单', '粗粮粉'],
    summary: '高产粗粮消耗口，适合日常料理、宠物耐力、行旅干粮和村社订单。'
  },
  {
    cropId: 'pumpkin',
    tags: ['food', 'pet_feed', 'festival', 'order'],
    flavor: ['绵甜', '丰收味'],
    nature: 'warm',
    rarityUse: 'seasonal',
    recommendedUses: ['南瓜汤', '节庆灯饰', '宠物亲密餐', '家庭餐桌事件', '丰收订单'],
    summary: '丰收感强的节令作物，适合家庭料理、节庆装饰、宠物亲密和订单。'
  },
  {
    cropId: 'radish',
    tags: ['food', 'pet_feed', 'alchemy', 'order', 'pickle'],
    flavor: ['脆甜', '清辛'],
    nature: 'cool',
    rarityUse: 'daily',
    recommendedUses: ['家常料理', '动物饲料', '低级炼丹辅料', '村民订单', '腌萝卜'],
    summary: '常见作物的稳定出口，适合料理、饲料、低级炼丹、腌制和村民订单。'
  },
  {
    cropId: 'tea',
    tags: ['food', 'gift', 'order', 'medicine'],
    flavor: ['回甘', '清苦'],
    nature: 'cool',
    rarityUse: 'valuable',
    recommendedUses: ['清醒饮品', '待客茶', 'NPC 好感赠礼', '行旅抗疲劳', '茶商订单'],
    summary: '高价值饮品与社交作物，适合待客、赠礼、抗疲劳和茶商订单。'
  },
  {
    cropId: 'peach',
    tags: ['gift', 'wine', 'pet_feed', 'festival', 'food'],
    flavor: ['多汁', '蜜甜'],
    nature: 'sweet',
    rarityUse: 'seasonal',
    recommendedUses: ['鲜果赠礼', '桃酒', '宠物心情餐', '恋爱剧情道具', '春日节会点心'],
    summary: '偏社交和情绪反馈的果类作物，适合赠礼、酿酒、宠物心情和恋爱剧情。'
  },
  {
    cropId: 'chili',
    tags: ['food', 'alchemy', 'medicine', 'festival'],
    flavor: ['辛辣', '提味'],
    nature: 'hot',
    rarityUse: 'stable',
    recommendedUses: ['辛火丹', '料理增味', '驱虫药', '龙舟热血餐', '暖身小菜'],
    summary: '辛热型功能作物，适合料理提味、炼丹、驱虫药和热闹节会餐。'
  }
]

export const getCropUseProfile = (cropId: string): CropUseProfile | undefined => {
  return CROP_USE_PROFILES.find(profile => profile.cropId === cropId)
}

export const getCropUseTagLabels = (profile: CropUseProfile): string[] => {
  return profile.tags.map(tag => CROP_USE_TAG_LABELS[tag])
}

export const formatCropUseSummary = (profile: CropUseProfile): string => {
  return `${profile.summary} 推荐：${profile.recommendedUses.join('、')}。`
}
