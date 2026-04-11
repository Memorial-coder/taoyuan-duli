import type {
  EconomyAuditConfig,
  GapCorrectionRule,
  GoalBiasRule,
  GoalMetricKey,
  GoalSource,
  GoalTemplate,
  GoalUiMeta,
  MainQuestStageTemplate,
  ThemeWeekDef
} from '@/types'

export const FRIENDSHIP_GOAL_LEVELS = new Set(['friendly', 'bestFriend'])

export const MAIN_QUEST_STAGE_DEFS: MainQuestStageTemplate[] = [
  {
    id: 1,
    title: '田园新生',
    description: '先学会最基础的生活方式：播种、钓鱼、做饭。',
    conditions: [
      { id: 'main_stage_1_harvest', title: '初次丰收', description: '累计收获 15 株作物。', metric: 'totalCropsHarvested', targetValue: 15, reward: {} },
      { id: 'main_stage_1_fish', title: '会钓鱼了', description: '累计钓到 5 条鱼。', metric: 'totalFishCaught', targetValue: 5, reward: {} },
      { id: 'main_stage_1_cook', title: '开灶生火', description: '累计完成 1 次烹饪。', metric: 'totalRecipesCooked', targetValue: 1, reward: {} }
    ],
    reward: { money: 500, reputation: 20, items: [{ itemId: 'herb', quantity: 3 }], unlockHint: '你已经掌握了桃源生活的基本节奏。' }
  },
  {
    id: 2,
    title: '经营起步',
    description: '开始走向真正的经营：赚钱、下矿、结识村民。',
    conditions: [
      { id: 'main_stage_2_money', title: '站稳脚跟', description: '累计赚到 2000 文。', metric: 'totalMoneyEarned', targetValue: 2000, reward: {} },
      { id: 'main_stage_2_mine', title: '第一次深入矿洞', description: '矿洞最高到达 10 层。', metric: 'highestMineFloor', targetValue: 10, reward: {} },
      { id: 'main_stage_2_friend', title: '在村里站住脚', description: '让 1 位村民达到友好。', metric: 'friendlyNpcCount', targetValue: 1, reward: {} }
    ],
    reward: { money: 1200, reputation: 35, items: [{ itemId: 'bamboo', quantity: 5 }], unlockHint: '你已经不只是生存，而是真正开始经营自己的桃源。' }
  },
  {
    id: 3,
    title: '家业渐丰',
    description: '扩建家园，解锁新区域，开始拥有稳定的发展节奏。',
    conditions: [
      { id: 'main_stage_3_home', title: '翻修农舍', description: '将农舍提升到 1 级。', metric: 'farmhouseLevel', targetValue: 1, reward: {} },
      { id: 'main_stage_3_cave', title: '新的去处', description: '解锁山洞。', metric: 'caveUnlocked', targetValue: 1, reward: {} },
      { id: 'main_stage_3_bundle', title: '回应村庄需要', description: '完成 1 个社区目标。（图鉴→祠堂页签可提交物品完成）', metric: 'completedBundles', targetValue: 1, reward: {} }
    ],
    reward: { money: 2500, reputation: 50, items: [{ itemId: 'wild_mushroom', quantity: 4 }], unlockHint: '你的家业已经有了模样，新的发展方向正在展开。' }
  },
  {
    id: 4,
    title: '世外桃源',
    description: '迈入真正的中后期：积累财富、扩大影响、打造理想生活。',
    conditions: [
      { id: 'main_stage_4_money', title: '家底殷实', description: '累计赚到 30000 文。', metric: 'totalMoneyEarned', targetValue: 30000, reward: {} },
      { id: 'main_stage_4_social', title: '四方和乐', description: '让 4 位村民达到友好。', metric: 'friendlyNpcCount', targetValue: 4, reward: {} },
      { id: 'main_stage_4_collect', title: '见多识广', description: '累计发现 25 种物品。', metric: 'discoveredCount', targetValue: 25, reward: {} }
    ],
    reward: { money: 5000, reputation: 100, items: [{ itemId: 'food_rice_ball', quantity: 3 }], unlockHint: '你已经把桃源经营成了真正令人向往的地方。' }
  },
  {
    id: 5,
    title: '桃源盛世',
    description: '达成真正的传奇成就：功成名就、广交挚友、探遍矿洞、著书立说。',
    conditions: [
      { id: 'main_stage_5_wealth', title: '富甲一方', description: '累计赚到 80000 文。', metric: 'totalMoneyEarned', targetValue: 80000, reward: {} },
      { id: 'main_stage_5_social', title: '挚友遍桃源', description: '让 6 位村民达到友好。', metric: 'friendlyNpcCount', targetValue: 6, reward: {} },
      { id: 'main_stage_5_mine', title: '矿洞探秘', description: '矿洞最高到达 80 层。', metric: 'highestMineFloor', targetValue: 80, reward: {} },
      { id: 'main_stage_5_collect', title: '博物志成', description: '累计发现 50 种物品。', metric: 'discoveredCount', targetValue: 50, reward: {} }
    ],
    reward: { money: 12000, reputation: 200, items: [{ itemId: 'food_rice_ball', quantity: 8 }, { itemId: 'wild_mushroom', quantity: 6 }], unlockHint: '你的桃源已成为世人口耳相传的传奇之地。恭喜你完成了所有主线里程碑！' }
  }
]

export const SEASON_GOAL_DEFS: Record<'spring' | 'summer' | 'autumn' | 'winter', GoalTemplate[]> = {
  spring: [
    { id: 'season_spring_harvest', title: '春耕有成', description: '本季收获 20 株作物。', metric: 'totalCropsHarvested', targetValue: 20, reward: { money: 600, reputation: 10, items: [{ itemId: 'herb', quantity: 2 }] } },
    { id: 'season_spring_fish', title: '春水试钓', description: '本季钓到 6 条鱼。', metric: 'totalFishCaught', targetValue: 6, reward: { money: 500, reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] } },
    { id: 'season_spring_income', title: '春日积蓄', description: '本季赚到 3000 文。', metric: 'totalMoneyEarned', targetValue: 3000, reward: { money: 800, reputation: 12, items: [{ itemId: 'bamboo', quantity: 3 }] } },
    { id: 'season_spring_cook', title: '春灶开火', description: '本季完成 2 次烹饪。', metric: 'totalRecipesCooked', targetValue: 2, reward: { money: 550, reputation: 8, items: [{ itemId: 'herb', quantity: 3 }] } },
    { id: 'season_spring_social', title: '春日结识', description: '本季新增 1 位友好村民。', metric: 'friendlyNpcCount', targetValue: 1, reward: { money: 600, reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] } }
  ],
  summer: [
    { id: 'season_summer_harvest', title: '盛夏丰收', description: '本季收获 35 株作物。', metric: 'totalCropsHarvested', targetValue: 35, reward: { money: 900, reputation: 12, items: [{ itemId: 'herb', quantity: 2 }] } },
    { id: 'season_summer_income', title: '暑月进账', description: '本季赚到 6000 文。', metric: 'totalMoneyEarned', targetValue: 6000, reward: { money: 1200, reputation: 15, items: [{ itemId: 'bamboo', quantity: 4 }] } },
    { id: 'season_summer_recipe', title: '夏日灶火', description: '本季完成 3 次烹饪。', metric: 'totalRecipesCooked', targetValue: 3, reward: { money: 700, reputation: 10, items: [{ itemId: 'food_rice_ball', quantity: 2 }] } },
    { id: 'season_summer_fish', title: '夏日垂钓', description: '本季钓到 10 条鱼。', metric: 'totalFishCaught', targetValue: 10, reward: { money: 750, reputation: 10, items: [{ itemId: 'herb', quantity: 5 }] } },
    { id: 'season_summer_mine', title: '夏日探矿', description: '本季将矿洞最高层再推进 8 层。', metric: 'highestMineFloor', targetValue: 8, reward: { money: 850, reputation: 12, items: [{ itemId: 'gold_ore', quantity: 3 }] } }
  ],
  autumn: [
    { id: 'season_autumn_harvest', title: '秋收满仓', description: '本季收获 45 株作物。', metric: 'totalCropsHarvested', targetValue: 45, reward: { money: 1100, reputation: 15, items: [{ itemId: 'wild_mushroom', quantity: 2 }] } },
    { id: 'season_autumn_income', title: '秋账丰盈', description: '本季赚到 9000 文。', metric: 'totalMoneyEarned', targetValue: 9000, reward: { money: 1500, reputation: 18, items: [{ itemId: 'bamboo', quantity: 5 }] } },
    { id: 'season_autumn_collect', title: '山野采存', description: '本季累计发现 6 种新物品。', metric: 'discoveredCount', targetValue: 6, reward: { money: 900, reputation: 12, items: [{ itemId: 'herb', quantity: 4 }] } },
    { id: 'season_autumn_fish', title: '秋水钓获', description: '本季钓到 12 条鱼。', metric: 'totalFishCaught', targetValue: 12, reward: { money: 950, reputation: 12, items: [{ itemId: 'herb', quantity: 6 }] } },
    { id: 'season_autumn_social', title: '秋日互访', description: '本季新增 1 位友好村民。', metric: 'friendlyNpcCount', targetValue: 1, reward: { money: 850, reputation: 14, items: [{ itemId: 'wild_mushroom', quantity: 3 }] } }
  ],
  winter: [
    { id: 'season_winter_mine', title: '冬季探矿', description: '本季将矿洞最高层再推进 10 层。', metric: 'highestMineFloor', targetValue: 10, reward: { money: 1300, reputation: 15, items: [{ itemId: 'wild_mushroom', quantity: 3 }] } },
    { id: 'season_winter_cook', title: '围炉做饭', description: '本季完成 4 次烹饪。', metric: 'totalRecipesCooked', targetValue: 4, reward: { money: 1000, reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] } },
    { id: 'season_winter_social', title: '冬日走亲', description: '本季新增 1 位友好村民。', metric: 'friendlyNpcCount', targetValue: 1, reward: { money: 900, reputation: 15, items: [{ itemId: 'herb', quantity: 3 }] } },
    { id: 'season_winter_income', title: '冬日营生', description: '本季赚到 5000 文。', metric: 'totalMoneyEarned', targetValue: 5000, reward: { money: 1100, reputation: 14, items: [{ itemId: 'bamboo', quantity: 4 }] } },
    { id: 'season_winter_fish', title: '冬日冰钓', description: '本季钓到 8 条鱼。', metric: 'totalFishCaught', targetValue: 8, reward: { money: 850, reputation: 12, items: [{ itemId: 'herb', quantity: 4 }] } }
  ]
}

export const DAILY_GOAL_DEFS: Record<'spring' | 'summer' | 'autumn' | 'winter', GoalTemplate[]> = {
  spring: [
    { id: 'daily_spring_harvest', title: '今日春耕', description: '今日收获 5 株作物。', metric: 'totalCropsHarvested', targetValue: 5, reward: { money: 180, reputation: 3 } },
    { id: 'daily_spring_fish', title: '今日试钓', description: '今日钓到 2 条鱼。', metric: 'totalFishCaught', targetValue: 2, reward: { money: 160, reputation: 2 } },
    { id: 'daily_spring_income', title: '今日进账', description: '今日赚到 800 文。', metric: 'totalMoneyEarned', targetValue: 800, reward: { money: 220, reputation: 3 } },
    { id: 'daily_spring_discovery', title: '今日见闻', description: '今日发现 1 种新物品。', metric: 'discoveredCount', targetValue: 1, reward: { money: 180, reputation: 3 } }
  ],
  summer: [
    { id: 'daily_summer_harvest', title: '今日抢收', description: '今日收获 8 株作物。', metric: 'totalCropsHarvested', targetValue: 8, reward: { money: 220, reputation: 3 } },
    { id: 'daily_summer_income', title: '今日大卖', description: '今日赚到 1200 文。', metric: 'totalMoneyEarned', targetValue: 1200, reward: { money: 260, reputation: 3 } },
    { id: 'daily_summer_cook', title: '今日开灶', description: '今日完成 1 次烹饪。', metric: 'totalRecipesCooked', targetValue: 1, reward: { money: 180, reputation: 2 } },
    { id: 'daily_summer_fish', title: '今日鱼获', description: '今日钓到 3 条鱼。', metric: 'totalFishCaught', targetValue: 3, reward: { money: 180, reputation: 2 } }
  ],
  autumn: [
    { id: 'daily_autumn_harvest', title: '今日丰收', description: '今日收获 10 株作物。', metric: 'totalCropsHarvested', targetValue: 10, reward: { money: 260, reputation: 4 } },
    { id: 'daily_autumn_income', title: '今日结账', description: '今日赚到 1500 文。', metric: 'totalMoneyEarned', targetValue: 1500, reward: { money: 300, reputation: 4 } },
    { id: 'daily_autumn_discovery', title: '今日采奇', description: '今日发现 1 种新物品。', metric: 'discoveredCount', targetValue: 1, reward: { money: 200, reputation: 3 } },
    { id: 'daily_autumn_cook', title: '今日备冬', description: '今日完成 1 次烹饪。', metric: 'totalRecipesCooked', targetValue: 1, reward: { money: 180, reputation: 2 } }
  ],
  winter: [
    { id: 'daily_winter_mine', title: '今日探矿', description: '今日将矿洞最高层推进 5 层。', metric: 'highestMineFloor', targetValue: 5, reward: { money: 260, reputation: 4 } },
    { id: 'daily_winter_cook', title: '今日暖胃', description: '今日完成 1 次烹饪。', metric: 'totalRecipesCooked', targetValue: 1, reward: { money: 180, reputation: 2 } },
    { id: 'daily_winter_fish', title: '今日冰钓', description: '今日钓到 2 条鱼。', metric: 'totalFishCaught', targetValue: 2, reward: { money: 180, reputation: 2 } },
    { id: 'daily_winter_income', title: '今日补贴', description: '今日赚到 1000 文。', metric: 'totalMoneyEarned', targetValue: 1000, reward: { money: 240, reputation: 3 } }
  ]
}

export const LONG_TERM_GOAL_DEFS: GoalTemplate[] = [
  { id: 'long_money_1', title: '积蓄小成', description: '累计赚到 20000 文。', metric: 'totalMoneyEarned', targetValue: 20000, reward: { money: 2000, reputation: 30, unlockHint: '你已经开始拥有稳定的家底。' } },
  { id: 'long_money_2', title: '家财万贯', description: '累计赚到 50000 文。', metric: 'totalMoneyEarned', targetValue: 50000, reward: { money: 5000, reputation: 60, items: [{ itemId: 'bamboo', quantity: 10 }], unlockHint: '你的名声已传遍周边村落。' } },
  { id: 'long_money_3', title: '富甲一方', description: '累计赚到 100000 文。', metric: 'totalMoneyEarned', targetValue: 100000, reward: { money: 12000, reputation: 120, items: [{ itemId: 'gold_ore', quantity: 5 }], unlockHint: '桃源之名，远近皆知。' } },
  { id: 'long_home_1', title: '家园升级', description: '将农舍提升到 2 级（宅院）。', metric: 'farmhouseLevel', targetValue: 2, reward: { money: 2500, reputation: 40, items: [{ itemId: 'bamboo', quantity: 8 }] } },
  { id: 'long_home_2', title: '豪华宅邸', description: '将农舍提升到 3 级（酒窖宅院）。', metric: 'farmhouseLevel', targetValue: 3, reward: { money: 8000, reputation: 80, items: [{ itemId: 'wild_mushroom', quantity: 6 }], unlockHint: '你的宅院已是桃源最气派的居所。' } },
  { id: 'long_mine_1', title: '深层探路', description: '矿洞最高到达 60 层。', metric: 'highestMineFloor', targetValue: 60, reward: { money: 2600, reputation: 45, items: [{ itemId: 'gold_ore', quantity: 8 }] } },
  { id: 'long_mine_2', title: '矿洞征服者', description: '矿洞最高到达 100 层。', metric: 'highestMineFloor', targetValue: 100, reward: { money: 6000, reputation: 80, items: [{ itemId: 'gold_ore', quantity: 15 }], unlockHint: '矿洞深处的秘密，只有你知晓。' } },
  { id: 'long_fish_1', title: '垂钓有成', description: '累计钓到 30 条鱼。', metric: 'totalFishCaught', targetValue: 30, reward: { money: 2000, reputation: 35, items: [{ itemId: 'herb', quantity: 10 }] } },
  { id: 'long_fish_2', title: '桃源渔翁', description: '累计钓到 80 条鱼。', metric: 'totalFishCaught', targetValue: 80, reward: { money: 4500, reputation: 60, items: [{ itemId: 'crab_pot', quantity: 2 }], unlockHint: '村民们都称你为桃源第一渔翁。' } },
  { id: 'long_cook_1', title: '家常好厨', description: '累计完成 20 次烹饪。', metric: 'totalRecipesCooked', targetValue: 20, reward: { money: 2200, reputation: 35, items: [{ itemId: 'herb', quantity: 8 }] } },
  { id: 'long_cook_2', title: '桃源名厨', description: '累计完成 60 次烹饪。', metric: 'totalRecipesCooked', targetValue: 60, reward: { money: 5500, reputation: 70, items: [{ itemId: 'ginseng', quantity: 3 }], unlockHint: '你的厨艺已令村中所有人叹服。' } },
  { id: 'long_crop_1', title: '丰收大户', description: '累计收获 200 株作物。', metric: 'totalCropsHarvested', targetValue: 200, reward: { money: 3000, reputation: 45, items: [{ itemId: 'bamboo', quantity: 6 }] } },
  { id: 'long_crop_2', title: '耕耘不辍', description: '累计收获 500 株作物。', metric: 'totalCropsHarvested', targetValue: 500, reward: { money: 7000, reputation: 90, items: [{ itemId: 'bamboo', quantity: 12 }], unlockHint: '这片土地已被你的汗水浸润得格外肥沃。' } },
  { id: 'long_social_1', title: '村中熟面孔', description: '让 4 位村民达到友好。', metric: 'friendlyNpcCount', targetValue: 4, reward: { money: 1800, reputation: 35, items: [{ itemId: 'food_rice_ball', quantity: 3 }] } },
  { id: 'long_social_2', title: '八方挚友', description: '让 8 位村民达到友好或以上。', metric: 'friendlyNpcCount', targetValue: 8, reward: { money: 5000, reputation: 80, items: [{ itemId: 'food_rice_ball', quantity: 8 }], unlockHint: '整个桃源都是你的朋友。' } },
  { id: 'long_collect_1', title: '见闻渐丰', description: '累计发现 30 种物品。', metric: 'discoveredCount', targetValue: 30, reward: { money: 1800, reputation: 35, items: [{ itemId: 'wild_mushroom', quantity: 4 }] } },
  { id: 'long_collect_2', title: '博物达人', description: '累计发现 60 种物品。', metric: 'discoveredCount', targetValue: 60, reward: { money: 4000, reputation: 65, items: [{ itemId: 'wild_mushroom', quantity: 8 }], unlockHint: '桃源的物产几乎被你摸了个遍。' } },
  { id: 'long_bundle_1', title: '村庄栋梁', description: '累计完成 3 个社区目标。（图鉴→祠堂页签可提交物品完成）', metric: 'completedBundles', targetValue: 3, reward: { money: 3200, reputation: 50, items: [{ itemId: 'bamboo', quantity: 4 }] } },
  { id: 'long_bundle_2', title: '社区中坚', description: '累计完成 6 个社区目标。（图鉴→祠堂页签可提交物品完成）', metric: 'completedBundles', targetValue: 6, reward: { money: 7500, reputation: 100, items: [{ itemId: 'bamboo', quantity: 8 }], unlockHint: '你为桃源的繁荣做出了卓越贡献。' } },
  { id: 'long_crabpot_1', title: '蟹笼渔家', description: '同时拥有 3 个蟹笼。（钓鱼页签可购买或制作蟹笼，放置后计入数量）', metric: 'crabPotCount', targetValue: 3, reward: { money: 2400, reputation: 40, items: [{ itemId: 'herb', quantity: 15 }] } },
  { id: 'long_family_1', title: '家业有人', description: '迎来 1 个孩子。（结婚7天后且配偶好感≥3000，配偶会随机提议要孩子）', metric: 'childCount', targetValue: 1, reward: { money: 2800, reputation: 45, items: [{ itemId: 'food_rice_ball', quantity: 5 }] } },
  { id: 'long_family_2', title: '儿女双全', description: '迎来 2 个孩子。（结婚7天后且配偶好感≥3000，配偶会随机提议要孩子）', metric: 'childCount', targetValue: 2, reward: { money: 5000, reputation: 70, items: [{ itemId: 'food_rice_ball', quantity: 10 }], unlockHint: '家中笑声不断，此乃人生之大幸。' } },
  { id: 'long_sink_mid_service', title: '经营有章', description: '累计赚到 15000 文，为功能型服务与基础经营 sink 做好准备。', metric: 'totalMoneyEarned', targetValue: 15000, reward: { money: 1800, reputation: 28, unlockHint: '你已经能把铜钱花在效率和经营节奏上，而不只是囤起来。' } },
  { id: 'long_sink_late_catalog', title: '豪华席位', description: '累计赚到 60000 文，并准备承接高价目录与商路认购。', metric: 'totalMoneyEarned', targetValue: 60000, reward: { money: 4200, reputation: 55, unlockHint: '你已进入后期高价 sink 区间，豪华目录与商路席位开始值得投入。' } },
  { id: 'long_sink_showcase', title: '终局赞助者', description: '累计赚到 120000 文，为终局展示与瀚海赞助预留预算。', metric: 'totalMoneyEarned', targetValue: 120000, reward: { money: 10000, reputation: 135, unlockHint: '你的财富已足以支撑终局展示型活动，不再只是简单堆钱。' } }
]

export const GOAL_BIAS_MAP: Partial<Record<GoalMetricKey, Array<'cashflow' | 'farming' | 'fishing' | 'mining' | 'cooking' | 'social' | 'discovery'>>> = {
  totalMoneyEarned: ['cashflow'],
  totalCropsHarvested: ['farming'],
  totalFishCaught: ['fishing'],
  totalRecipesCooked: ['cooking'],
  highestMineFloor: ['mining'],
  friendlyNpcCount: ['social'],
  discoveredCount: ['discovery']
}

export const GOAL_SOURCE_LABELS: Record<GoalSource, string> = {
  random: '随机目标',
  season: '季节目标',
  archetype_bias: '流派推荐'
}

export const GOAL_METRIC_LABELS: Record<GoalMetricKey, string> = {
  totalMoneyEarned: '累计赚取铜钱',
  totalCropsHarvested: '累计收获作物',
  totalFishCaught: '累计钓鱼数量',
  totalRecipesCooked: '累计烹饪次数',
  highestMineFloor: '矿洞最高层',
  friendlyNpcCount: '友好村民数量',
  farmhouseLevel: '农舍等级',
  completedBundles: '社区目标完成数',
  discoveredCount: '图鉴发现数',
  crabPotCount: '蟹笼数量',
  childCount: '孩子数量',
  caveUnlocked: '山洞解锁状态',
  villageProjectLevel: '村庄建设等级',
  hanhaiContractCompletions: '瀚海循环完成数',
  museumExhibitLevel: '博物馆展陈等级',
  familyWishCompletions: '家庭心愿完成数'
}

export const GOAL_BIAS_RULES: GoalBiasRule[] = [
  {
    id: 'bias_cashflow_daily',
    label: '现金流偏好',
    description: '当玩家偏向商贾路线时，更容易看到赚钱与经营相关目标。',
    biasTags: ['cashflow', 'social'],
    metrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    weight: 2
  },
  {
    id: 'bias_artisan_daily',
    label: '匠营偏好',
    description: '偏向农耕、采矿与烹饪的玩家，会看到更多生产经营型目标。',
    biasTags: ['farming', 'mining', 'cooking'],
    metrics: ['totalCropsHarvested', 'highestMineFloor', 'totalRecipesCooked'],
    weight: 2
  },
  {
    id: 'bias_wander_daily',
    label: '游历偏好',
    description: '偏向钓鱼与探索的玩家，更容易刷出见闻与外出型目标。',
    biasTags: ['fishing', 'discovery', 'social'],
    metrics: ['totalFishCaught', 'discoveredCount', 'friendlyNpcCount'],
    weight: 2
  }
]

export const GAP_CORRECTION_RULES: GapCorrectionRule[] = [
  {
    id: 'gap_cashflow',
    label: '现金流补正',
    description: '当玩家需要更稳的经济回流时，优先推荐赚钱与经营相关目标。',
    metric: 'totalMoneyEarned',
    recommendedCatalogTags: ['功能商品', '材料包']
  },
  {
    id: 'gap_cooking',
    label: '料理补正',
    description: '当料理推进较少时，引导玩家进行烹饪与补给准备。',
    metric: 'totalRecipesCooked',
    recommendedCatalogTags: ['功能商品']
  },
  {
    id: 'gap_mining',
    label: '矿洞补正',
    description: '当矿洞推进不足时，优先展示探索与补给方向目标。',
    metric: 'highestMineFloor',
    recommendedCatalogTags: ['矿洞', '每周精选']
  },
  {
    id: 'gap_social',
    label: '社交补正',
    description: '当玩家久未与村民互动时，优先展示社交与关系推进目标。',
    metric: 'friendlyNpcCount',
    recommendedCatalogTags: ['每周精选']
  }
]

export const GOAL_UI_META_BY_ID: Record<string, GoalUiMeta> = {
  daily_spring_harvest: { shortTitle: '春耕', categoryTag: '今日目标', progressUnit: '株', panelBadge: '耕作' },
  daily_spring_income: { shortTitle: '进账', categoryTag: '今日目标', progressUnit: '文', panelBadge: '经营' },
  daily_summer_fish: { shortTitle: '鱼获', categoryTag: '今日目标', progressUnit: '条', panelBadge: '钓鱼' },
  daily_autumn_discovery: { shortTitle: '采奇', categoryTag: '今日目标', progressUnit: '种', panelBadge: '探索' },
  daily_winter_mine: { shortTitle: '探矿', categoryTag: '今日目标', progressUnit: '层', panelBadge: '矿洞' },
  season_spring_harvest: { shortTitle: '春耕有成', categoryTag: '季节目标', progressUnit: '株', panelBadge: '春种' },
  season_summer_fish: { shortTitle: '夏日垂钓', categoryTag: '季节目标', progressUnit: '条', panelBadge: '夏渔' },
  season_autumn_income: { shortTitle: '秋账丰盈', categoryTag: '季节目标', progressUnit: '文', panelBadge: '秋收' },
  season_winter_mine: { shortTitle: '冬季探矿', categoryTag: '季节目标', progressUnit: '层', panelBadge: '冬矿' },
  long_sink_mid_service: { shortTitle: '经营有章', categoryTag: '长期目标', progressUnit: '文', panelBadge: '基础 sink', recommendedReason: '先把铜钱投入功能型服务，建立花钱换效率的节奏。' },
  long_sink_late_catalog: { shortTitle: '豪华席位', categoryTag: '长期目标', progressUnit: '文', panelBadge: '高价 sink', recommendedReason: '开始承接豪华目录、商路席位和高价订单型消费。' },
  long_sink_showcase: { shortTitle: '终局赞助', categoryTag: '长期目标', progressUnit: '文', panelBadge: '终局展示', recommendedReason: '把终局预算转成展示、赞助和跨系统活动，而不是继续裸堆资产。' }
}

export const BREEDING_SPECIAL_ORDER_THEME_AUDIT: EconomyAuditConfig = {
  coreMetrics: [
    {
      id: 'ws05_breeding_active_rate',
      label: '后期育种活跃率',
      description: '进入后期门槛的玩家中，持续使用育种系统并具备可追踪育种目标的占比。',
      formula: '后7日内 researchLevel≥1 且（育种台加工中或近7日 compendium 新增/更新）的玩家数 ÷ 后7日内 totalMoneyEarned≥60000 的活跃玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useBreedingStore.researchLevel', 'useBreedingStore.stations', 'useBreedingStore.compendium', 'achievementStore.stats.totalMoneyEarned'],
      thresholds: { watch: 0.35, warning: 0.25, critical: 0.18 },
      anomalyRule: '若样本量低于20个后期活跃存档，仅做趋势观察；新版本首周允许因主题周错位产生一次性低值。'
    },
    {
      id: 'ws05_special_order_completion_rate',
      label: '特殊订单完成率',
      description: '聚焦育种/鱼塘主题订单的可准备性，验证订单需求是否可追踪、可准备、可解释。',
      formula: '近14日已提交 breeding 或 fishpond 主题 specialOrder 数 ÷ 近14日已接取 breeding 或 fishpond 主题 specialOrder 数',
      direction: 'lower_is_worse',
      dataSources: ['useQuestStore.activeQuests', 'useQuestStore.completedQuestCount', 'QuestInstance.themeTag', 'QuestInstance.requirementSummary'],
      thresholds: { watch: 0.6, warning: 0.48, critical: 0.35 },
      anomalyRule: '若当周新增高梯度订单占比超过50%，需拆分查看 tier3-4 与 tier1-2，避免难度结构变化误判整体下滑。'
    },
    {
      id: 'ws05_breeding_income_share',
      label: '育种收益占比',
      description: '衡量高价值育种订单是否成为后期稳定经营路线，而非一次性图鉴奖励。',
      formula: '近14日 breeding 主题特殊订单 moneyReward 总额 ÷ 近14日全部任务与主题周相关委托 moneyReward 总额',
      direction: 'target_range',
      dataSources: ['SPECIAL_ORDER_TEMPLATES.moneyReward', 'QuestInstance.themeTag', 'THEME_WEEK_DEFS'],
      thresholds: { targetMin: 0.18, targetMax: 0.38, warning: 0.45, critical: 0.55 },
      anomalyRule: '低于目标下限说明育种路线吸引力不足；高于 warning 说明可能挤压普通订单与其他后期循环收益。'
    },
    {
      id: 'ws05_retry_after_failure_rate',
      label: '失败后继续尝试率',
      description: '衡量玩家在杂交失败或高门槛订单未达标后，是否仍愿意沿该路线继续投入。',
      formula: '近7日触发杂交失败提示后 3 日内再次 startBreeding 或接取 breeding 主题订单的玩家数 ÷ 近7日触发杂交失败提示的玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useBreedingStore.startBreeding', 'useBreedingStore.breedDifferentCrop', 'useQuestStore.acceptSpecialOrder', 'useGameLog'],
      thresholds: { watch: 0.55, warning: 0.42, critical: 0.3 },
      anomalyRule: '若失败样本少于10次，结合图鉴进度与主题周偏置一起看，避免因为高端玩家低失败率导致分母过小。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws05_unprepared_order_rate',
      label: '不可准备订单占比',
      description: '防止订单生成落到当前存档无法追踪或无法提前准备的需求上。',
      formula: '近14日生成后立即不满足 requiredHybridId / requiredParentCropIds / requiredGenerationMin 的 breeding 主题订单数 ÷ 近14日生成的 breeding 主题订单数',
      direction: 'higher_is_worse',
      dataSources: ['generateSpecialOrder', 'SpecialOrderTemplate.requiredHybridId', 'SpecialOrderTemplate.requiredParentCropIds', 'SpecialOrderTemplate.requiredGenerationMin', 'useBreedingStore.compendium'],
      thresholds: { watch: 0.2, warning: 0.3, critical: 0.4 },
      anomalyRule: '若主题周切换当日出现尖峰，可单独剔除刷新批次复核；连续两周超标则视为配置问题。'
    },
    {
      id: 'ws05_theme_concentration_rate',
      label: '主题周订单集中度',
      description: '防止主题周把订单池压缩成单一路线，削弱后期多系统经营选择。',
      formula: '单一 preferredHybridIds 或单一 themeTag 在近7日特殊订单中的最高出现次数 ÷ 近7日特殊订单总数',
      direction: 'higher_is_worse',
      dataSources: ['THEME_WEEK_DEFS.preferredQuestThemeTag', 'THEME_WEEK_DEFS.breedingFocusHybridIds', 'QuestInstance.themeTag', 'QuestInstance.recommendedHybridIds'],
      thresholds: { watch: 0.45, warning: 0.58, critical: 0.7 },
      anomalyRule: '若季节主题周本就聚焦单一作物群，可接受一次 watch；连续两轮达到 warning 需回调权重。'
    }
  ],
  playerSegments: [
    {
      id: 'ws05_segment_late_balanced',
      label: '后期均衡经营玩家',
      description: '已有稳定现金流，开始在育种、订单与主题周之间寻找更高单价路线。',
      disposableMoneyMin: 60000,
      inflationPressureMin: 0.2,
      recommendedFocus: '优先观察育种活跃率与收益占比是否把该群体从普通订单转向高价值订单。'
    },
    {
      id: 'ws05_segment_collection_breeder',
      label: '图鉴深挖育种玩家',
      description: '已解锁研究并持续更新图鉴，关注高世代、高属性与谱系完整度。',
      disposableMoneyMin: 80000,
      inflationPressureMin: 0.28,
      recommendedFocus: '重点看失败后继续尝试率、世代门槛接受度以及高属性订单的完成率。'
    },
    {
      id: 'ws05_segment_theme_trader',
      label: '主题周套利经营玩家',
      description: '跟随主题周偏置安排供货与展示，更在意可解释的刷新节奏。',
      disposableMoneyMin: 70000,
      inflationPressureMin: 0.25,
      recommendedFocus: '重点看主题周订单集中度与不可准备订单占比，确保周更偏置不会变成纯随机赌池。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws05_order_theme_rollback',
      label: '主题育种订单回滚',
      condition: '连续7日 ws05_special_order_completion_rate ≤ 0.35，且 ws05_unprepared_order_rate ≥ 0.4',
      fallbackAction: '回退到无 breeding/fishpond 主题偏置的普通特殊订单池，仅保留已验证可完成的低梯度模板，并禁用高世代/谱系硬门槛。'
    }
  ],
  linkedSystems: ['breeding', 'quest', 'goal', 'fishPond', 'shop', 'villageProject'],
  linkedSystemNotes: [
    {
      system: 'breeding',
      label: '育种主系统',
      touchpoints: ['compendium 最佳属性/世代记录', 'researchLevel', '杂交失败后重试行为'],
      whyItMatters: '所有高甜度、高抗性、世代门槛与亲本来源要求都依赖图鉴口径与育种操作沉淀。'
    },
    {
      system: 'quest',
      label: '特殊订单系统',
      touchpoints: ['generateSpecialOrder 权重池', 'QuestInstance.requirementSummary', 'themeTag / recommendedHybridIds'],
      whyItMatters: 'KPI 的完成率、可准备性与需求解释性都以订单生成和提交链路为准。'
    },
    {
      system: 'goal',
      label: '主题周与目标系统',
      touchpoints: ['THEME_WEEK_DEFS.preferredQuestThemeTag', 'breedingFocusHybridIds', 'focusMetrics'],
      whyItMatters: '主题周负责给订单池加偏置，决定玩家是否能提前理解本周育种方向。'
    },
    {
      system: 'fishPond',
      label: '鱼塘品系系统',
      touchpoints: ['pond deliveryMode 订单', '高代观赏鱼提交', '健康/成熟状态要求'],
      whyItMatters: 'WS05 目标包含 breeding × special orders × theme-week monetization，鱼塘主题订单是同一经营化框架的并行验证样本。'
    },
    {
      system: 'shop',
      label: '出货与物价系统',
      touchpoints: ['高甜度/高产作物的常规变现对比', '主题周奖励预览', '功能材料回流'],
      whyItMatters: '需要判断育种订单收益是否真的构成后期稳定路线，而不是被普通卖货价格完全替代。'
    },
    {
      system: 'villageProject',
      label: '村庄项目加成',
      touchpoints: ['任务奖励倍率', '容量与每日任务扩展', '后期经营承载能力'],
      whyItMatters: '村庄项目会改变任务承接上限与报酬曲线，分析订单完成率时要剔除基建差异。'
    }
  ]
}

export const THEME_WEEK_DEFS: ThemeWeekDef[] = [
  {
    id: 'spring_sowing',
    name: '春种主题周',
    description: '集中鼓励播种、收获与基础经营。',
    season: 'spring',
    recommendedCatalogTags: ['功能商品', '灌溉'],
    focusMetrics: ['totalCropsHarvested', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_artisan_daily', 'gap_cashflow'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '早春试育',
    breedingFocusDescription: '适合先冲低门槛杂交，补齐春季基础经营向的订单作物。',
    breedingFocusHybridIds: ['emerald_radish', 'golden_tuber'],
    rewardPreview: {
      label: '春种筹备奖励',
      description: '更适合搭配灌溉、扩田与基础经营向采购。',
      recommendedOfferIds: ['func_field_irrigation_pack', 'weekly_inventory_bag']
    },
    ui: {
      badgeText: '春种',
      summaryLabel: '本周重点：耕作与起步经营',
      bannerTone: 'success'
    }
  },
  {
    id: 'summer_fishing',
    name: '夏渔主题周',
    description: '偏向钓鱼、水产与外出补给。',
    season: 'summer',
    recommendedCatalogTags: ['渔具', '鱼塘'],
    focusMetrics: ['totalFishCaught', 'discoveredCount'],
    relatedBiasRules: ['bias_wander_daily'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '夏季高产订单',
    breedingFocusDescription: '优先培育高产、适合宴席与供货的杂交作物，承接更高价的特殊订单。',
    breedingFocusHybridIds: ['moonlight_rice', 'golden_melon', 'honey_peach_melon'],
    rewardPreview: {
      label: '夏渔筹备奖励',
      description: '更适合搭配渔具、鱼塘与外出补给向采购。',
      recommendedOfferIds: ['func_angler_pack', 'weekly_pond_care_pack']
    },
    ui: {
      badgeText: '夏渔',
      summaryLabel: '本周重点：钓鱼、鱼塘与见闻',
      bannerTone: 'accent'
    }
  },
  {
    id: 'autumn_processing',
    name: '秋收加工周',
    description: '适合秋收变现、加工囤货与料理推进。',
    season: 'autumn',
    recommendedCatalogTags: ['材料包', '功能商品'],
    focusMetrics: ['totalMoneyEarned', 'totalRecipesCooked'],
    relatedBiasRules: ['bias_cashflow_daily', 'bias_artisan_daily', 'gap_cooking'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '秋宴精品单',
    breedingFocusDescription: '高甜度、高品质的茶饮与宴席类杂交作物在秋季最容易卖出高价。',
    breedingFocusHybridIds: ['jade_tea', 'osmanthus_tea', 'lotus_tea'],
    rewardPreview: {
      label: '秋收加工奖励',
      description: '更适合搭配料理、材料与变现型经营采购。',
      recommendedOfferIds: ['func_builder_pack', 'autumn_harvest_pack']
    },
    ui: {
      badgeText: '秋收',
      summaryLabel: '本周重点：变现、加工与料理',
      bannerTone: 'warning'
    }
  },
  {
    id: 'winter_mining',
    name: '冬矿挑战周',
    description: '聚焦矿洞推进、补给准备和冬日经营。',
    season: 'winter',
    recommendedCatalogTags: ['矿洞', '每周精选'],
    focusMetrics: ['highestMineFloor', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_artisan_daily', 'gap_mining'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '寒季耐久单',
    breedingFocusDescription: '冬季更适合培育耐性高、可作为囤货与补给素材的杂交作物。',
    breedingFocusHybridIds: ['frost_garlic', 'moonlight_rice'],
    rewardPreview: {
      label: '冬矿补给奖励',
      description: '更适合搭配矿洞补给与长期经营型采购。',
      recommendedOfferIds: ['weekly_mining_supply', 'premium_warehouse_charter']
    },
    ui: {
      badgeText: '冬矿',
      summaryLabel: '本周重点：矿洞推进与冬储经营',
      bannerTone: 'accent'
    }
  },
  {
    id: 'late_sink_rotation',
    name: '豪华经营周',
    description: '面向后期玩家的高价投入周，鼓励把资金转进服务、认购和展示。',
    season: 'autumn',
    recommendedCatalogTags: ['功能商品', '材料包', '每周精选'],
    focusMetrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_cashflow', 'gap_social'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '豪华供货单',
    breedingFocusDescription: '适合用高规格杂交品种承接豪华经营周的高价订单与展示需求。',
    breedingFocusHybridIds: ['jade_tea', 'golden_melon', 'moonlight_rice'],
    rewardPreview: {
      label: '豪华经营奖励',
      description: '推荐把预算转入服务型 sink、豪华目录和高规格供货。',
      recommendedOfferIds: ['func_builder_pack', 'premium_warehouse_charter', 'weekly_inventory_bag']
    },
    ui: {
      badgeText: '豪华经营',
      summaryLabel: '本周重点：高价投入、服务认购与展示准备',
      bannerTone: 'warning'
    }
  }
]

export const getThemeWeekBySeason = (season: 'spring' | 'summer' | 'autumn' | 'winter') => {
  return THEME_WEEK_DEFS.find(theme => theme.season === season) ?? null
}