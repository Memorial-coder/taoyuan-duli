/** 晨间提示定义 */
export interface MorningTipDef {
  id: string
  priority: number
  conditionKey: string
  message: string
}

/**
 * 18 条晨间提示，按优先级排序。
 * conditionKey 在 useEndDay 的晨间提示逻辑中映射为实际判断函数。
 */
export const MORNING_TIPS: MorningTipDef[] = [
  {
    id: 'tip_welcome',
    priority: 1,
    conditionKey: 'earlyFirstDay',
    message: '柳村长说：「欢迎来到桃源乡！背包里有白菜种子，去农场面板开垦土地、播种吧。」'
  },
  {
    id: 'tip_first_till',
    priority: 2,
    conditionKey: 'allWasteland',
    message: '柳村长说：「田地要先开垦才能种东西。在农场面板点击「一键操作」→「一键开垦」。」'
  },
  {
    id: 'tip_first_plant',
    priority: 3,
    conditionKey: 'tilledNoPlanted',
    message: '柳村长说：「地开垦好了，去农场面板播种吧。「一键种植」可以批量播种。」'
  },
  {
    id: 'tip_first_water',
    priority: 4,
    conditionKey: 'plantedUnwatered',
    message: '柳村长说：「种子种下后记得浇水，不浇水作物不会生长。试试「一键浇水」。」'
  },
  {
    id: 'tip_first_harvest',
    priority: 5,
    conditionKey: 'hasHarvestable',
    message: '柳村长说：「作物成熟了！去农场面板收获吧，金色地块就是成熟的作物。」'
  },
  {
    id: 'tip_sell_crops',
    priority: 6,
    conditionKey: 'harvestedNeverSold',
    message: '柳村长说：「收获的作物放进农场面板底部的出货箱，次日就能换钱了。」'
  },
  {
    id: 'tip_check_weather',
    priority: 7,
    conditionKey: 'earlyGame',
    message: '柳村长说：「每天注意看天气预报，提前安排一天的活计会事半功倍。」'
  },
  {
    id: 'tip_stamina',
    priority: 8,
    conditionKey: 'staminaWasLow',
    message: '柳村长说：「体力不够就早点休息，熬夜会影响次日恢复。吃东西也能补充体力。」'
  },
  {
    id: 'tip_visit_shop',
    priority: 9,
    conditionKey: 'neverVisitedShop',
    message: '柳村长说：「商圈有各种种子和道具出售，有空去逛逛吧。」'
  },
  { id: 'tip_try_fishing', priority: 10, conditionKey: 'neverFished', message: '柳村长说：「村东的清溪鱼虾丰美，带上鱼竿去试试钓鱼吧。」' },
  {
    id: 'tip_try_mining',
    priority: 11,
    conditionKey: 'neverMined',
    message: '柳村长说：「村北的矿洞里有矿石和宝物，不过也有怪物，小心些。」'
  },
  {
    id: 'tip_talk_npc',
    priority: 12,
    conditionKey: 'neverTalkedNpc',
    message: '柳村长说：「乡里乡亲的，多和大家聊聊天，送礼也能增进交情。」'
  },
  {
    id: 'tip_quest_board',
    priority: 13,
    conditionKey: 'neverCheckedQuests',
    message: '柳村长说：「告示栏上有乡亲们的委托，帮忙做做能赚点钱和人情。」'
  },
  {
    id: 'tip_try_cooking',
    priority: 14,
    conditionKey: 'neverCooked',
    message: '柳村长说：「学了食谱可以做菜，做出来的饭能恢复体力。去灶台试试。」'
  },
  {
    id: 'tip_rain',
    priority: 15,
    conditionKey: 'firstRainyDay',
    message: '柳村长说：「下雨天作物会自动浇水，省了力气。正好可以去做别的事。」'
  },
  {
    id: 'tip_season_change',
    priority: 16,
    conditionKey: 'justChangedSeason',
    message: '柳村长说：「换季了，不同季节能种的作物不一样，去商圈看看新种子吧。」'
  },
  {
    id: 'tip_sprinkler',
    priority: 17,
    conditionKey: 'hasCropNoSprinkler',
    message: '柳村长说：「种地面积大了浇水很累，加工坊或铁匠铺可以做洒水器自动浇水。」'
  },
  {
    id: 'tip_try_animal',
    priority: 18,
    conditionKey: 'neverHadAnimal',
    message: '柳村长说：「养些鸡鸭牛羊也不错，先去商铺建个鸡舍或牧场吧。」'
  },
  {
    id: 'tip_breeding_unlock',
    priority: 19,
    conditionKey: 'breedingJustUnlocked',
    message: '柳村长说：「育种台解锁了！使用种子制造机加工时，有概率额外获得育种种子。在育种面板可以进行杂交培育，提升作物属性。」'
  },
  {
    id: 'tip_breeding_has_seeds',
    priority: 20,
    conditionKey: 'hasSeedsNeverBred',
    message: '柳村长说：「种子箱里有育种种子了！试试同种培育——用两颗相同作物的种子杂交，可以提升后代的甜度和产量。」'
  },
  {
    id: 'tip_breeding_try_hybrid',
    priority: 21,
    conditionKey: 'canTryHybrid',
    message: '柳村长说：「育种种子属性不错了！试试异种杂交——把两种不同作物的种子放入育种台，说不定能培育出新品种。」'
  },
  {
    id: 'tip_breeding_station',
    priority: 22,
    conditionKey: 'hasSeedsNoStation',
    message: '柳村长说：「有了育种种子，还需要建造育种台才能杂交。在育种面板点击「建造」，用木材和矿石就能搭一台。」'
  }
]
