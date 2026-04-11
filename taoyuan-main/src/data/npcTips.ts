import type { Weather } from '@/types'

/** 李渔翁 - 天气预报台词 */
export const WEATHER_TIPS: Record<Weather, string> = {
  sunny: '明日天朗气清，适合外出活动。',
  rainy: '明日有雨，记得带伞……不过鱼儿倒是爱咬钩。',
  stormy: '明日雷雨交加，在家歇息为好。',
  snowy: '明日有雪，注意保暖。河面可能会结冰。',
  windy: '明日起风，晾晒的东西记得收好。',
  green_rain: '老朽感觉明日……有些不寻常。'
}

/** 周秀才 - 运势台词阈值 */
export const FORTUNE_TIERS: { min: number; message: string }[] = [
  { min: 0.07, message: '紫气东来，今日大吉！诸事皆宜。' },
  { min: 0.03, message: '今日运势不错，宜出门办事。' },
  { min: -0.03, message: '今日运势平平，一切照常便好。' },
  { min: -0.07, message: '今日运势欠佳，做事需小心谨慎。' },
  { min: -Infinity, message: '今日诸事不宜，建议在家休息。' }
]

/** 根据 dailyLuck 获取运势台词 */
export const getFortuneTip = (luck: number): string => {
  for (const tier of FORTUNE_TIERS) {
    if (luck >= tier.min) return tier.message
  }
  return FORTUNE_TIERS[FORTUNE_TIERS.length - 1]!.message
}

/** 柳村长 - 生活提示 (25条循环) */
export const LIVING_TIPS: string[] = [
  '春季是种植土豆和白菜的好时节，早播早收。',
  '给作物施肥可以提高品质，品质越高卖价越好。',
  '下雨天不需要浇水，可以腾出时间做别的事。',
  '竹林的竹笋在春季最多，别忘了去采集。',
  '钓鱼时注意时机，不同鱼类有不同的最佳钓鱼时段。',
  '矿洞越深越危险，记得带足食物和药品。',
  '送礼可以增进与村民的友谊，每个人喜好不同。',
  '升级工具可以提高效率，别忘了去铁匠铺看看。',
  '夏季的水蜜桃和西瓜卖价不错，值得大面积种植。',
  '制作洒水器可以自动浇水，节省大量时间。',
  '秋季可以种植多季节作物，收益更稳定。',
  '冬季虽然不能种地，但矿洞收益更高。',
  '多和村民聊天，到了一定好感度会学到新食谱。',
  '博物馆捐赠能获得里程碑奖励，记得收集化石和古物。',
  '公会的讨伐任务奖励丰厚，值得一做。',
  '鱼饵和浮标可以提高钓鱼效率和品质。',
  '加工机器可以把原材料变成更值钱的商品。',
  '节日活动有限定奖励，别错过每个节日。',
  '炸弹可以一次炸开大片矿石，效率很高。',
  '下矿前别忘了装备好戒指，属性加成很重要。',
  '高品质作物可以做出更好的食物。',
  '宠物养久了会有意想不到的收获。',
  '桃花林深处据说藏着稀有的采集物。',
  '认真经营农场，大家都在看着你呢。',
  '秘密笔记里藏着桃源乡的秘密，多留意。'
]

/** 获取当天的生活提示 */
export const getLivingTip = (day: number, year: number): string => {
  const index = ((year - 1) * 112 + day - 1) % LIVING_TIPS.length
  return LIVING_TIPS[index]!
}

/** 王大婶 - 食谱推荐台词模板 */
export const getRecipeTipMessage = (recipeName: string, ingredientNames: string[]): string => {
  return `今天教你做${recipeName}，需要${ingredientNames.join('、')}。`
}

/** 王大婶 - 无可推荐食谱时的通用台词 */
export const NO_RECIPE_TIP = '好好学做饭，以后日子还长着呢。'

/** 有每日提示功能的NPC ID列表 */
export const TIP_NPC_IDS = ['li_yu', 'zhou_xiucai', 'wang_dashen', 'liu_cunzhang'] as const

/** NPC提示类型 */
export type TipNpcId = (typeof TIP_NPC_IDS)[number]

/** NPC提示标签 */
export const TIP_NPC_LABELS: Record<TipNpcId, string> = {
  li_yu: '天气预报',
  zhou_xiucai: '今日运势',
  wang_dashen: '食谱推荐',
  liu_cunzhang: '生活提示'
}
