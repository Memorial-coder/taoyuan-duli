import type {
  CompensationPlan,
  EconomyAuditConfig,
  EconomyBaselineAuditConfig,
  EventCampaignDef,
  EventMailTemplateRef,
  EventOperationsState,
  GapCorrectionRule,
  GoalBiasRule,
  GoalMetricKey,
  GoalSource,
  GoalTemplate,
  GoalUiMeta,
  MainQuestStageTemplate,
  QaGovernanceCompensationMailPreset,
  QaGovernanceFeatureFlags,
  QaGovernanceMigrationProfileDef,
  QaGovernanceRegressionSuiteDef,
  QaGovernanceRuntimeState,
  QaGovernanceTransactionGuardDef,
  QaCaseDef,
  ProgressBridgeDef,
  ReleaseChecklistItem,
  ThemeWeekDef,
  ThemeWeekRewardPoolEntry,
  WeeklyGoalDef
} from '@/types'
import { WS09_RELATIONSHIP_AUDIT_POOLS } from './npcs'
import { WS09_SPIRIT_BOND_AUDIT_POOLS } from './hiddenNpcHeartEvents'

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
  discoveredCount: ['discovery'],
  regionRouteCompletions: ['discovery'],
  expeditionBossClears: ['mining'],
  regionalResourceTurnIns: ['cashflow', 'discovery']
}

export const GOAL_SOURCE_LABELS: Record<GoalSource, string> = {
  random: '随机目标',
  season: '季节目标',
  weekly: '每周目标',
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
  familyWishCompletions: '家庭心愿完成数',
  regionRouteCompletions: '区域路线完成数',
  expeditionBossClears: '远征首领清关数',
  regionalResourceTurnIns: '区域资源交付数'
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

export interface Ws09FamilyCompanionshipBaselineAuditConfig extends EconomyBaselineAuditConfig {
  baselineSummary: {
    currentState: string[]
    targetPlayers: string[]
    painPoints: string[]
    successSignals: string[]
  }
  auditSubjectPools: {
    marriageableNpcIds: string[]
    zhijiNpcIds: string[]
    helperCapableNpcIds: string[]
    hiddenNpcIds: string[]
  }
}

export const WS09_FAMILY_COMPANIONSHIP_BASELINE_AUDIT: Ws09FamilyCompanionshipBaselineAuditConfig = {
  id: 'ws09_t081_family_companionship_baseline_audit',
  workstreamId: 'WS09-T081',
  label: '家庭 / 配偶 / 仙灵陪伴循环基线审计',
  summary: `基于现有 ${WS09_RELATIONSHIP_AUDIT_POOLS.marriageableNpcIds.length} 名可婚 / 可知己 NPC 与 ${WS09_SPIRIT_BOND_AUDIT_POOLS.hiddenNpcIds.length} 名可结缘仙灵，先统一婚后陪伴、家庭心愿、子女成长与仙灵结缘的 KPI 口径，避免后续把关系线只做成自动化收益按钮。`,
  focusAreas: ['婚后玩家周活', '家庭心愿完成率', '非战斗后期目标覆盖度', '关系系统回访率'],
  baselineSummary: {
    currentState: [
      '当前 useNpcStore 已具备约会、求婚、婚礼、知己、孕期、子女、关系线索与雇工等状态骨架，婚后与家庭系统已有基础存档和日更入口。',
      '当前 useHiddenNpcStore 已具备仙灵发现、供奉、求缘、结缘、心事件与被动能力，能够为钓鱼、体力恢复和特殊收益提供长期陪伴向增益样本。',
      '当前 Home / Breeding / Fishing / Goal 侧已有可联动的宅院、酒窖、育种图鉴、鱼塘与周目标指标位，但家庭心愿和家业继承仍停留在预留指标阶段。'
    ],
    targetPlayers: [
      '已进入中后期、铜钱和主线稳定，开始追求婚后生活感、非战斗成长线与家庭目标的经营型玩家。',
      '愿意在配偶陪伴、知己互动、仙灵结缘、孩子成长与家园经营之间做长期取舍，而不是只追逐数值收益的后期玩家。'
    ],
    painPoints: [
      '关系线当前更多是好感阈值与一次性节点，婚后、知己与仙灵结缘缺少稳定的周循环牵引。',
      '若直接放大雇工、仙灵被动或家庭奖励，容易把配偶和仙灵异化成纯自动化工具人，反而削弱陪伴感。',
      '家庭心愿、子女成长、家业继承与非战斗后期目标尚未形成统一口径，后续扩容容易各做各的。'
    ],
    successSignals: [
      '婚后 / 知己 / 结缘后的玩家仍会在每周多次返回关系线，而不是一次结缘后长期不再查看。',
      '家庭心愿、陪伴互动与仙灵结缘能反向影响 Home / Breeding / Fishing / Goal 等至少两条非战斗成长线。',
      '关系系统提供的是“陪伴 + 选择 + 反馈”，而非单纯把农事、钓鱼或产出进一步自动化。'
    ]
  },
  coreMetrics: [
    {
      id: 'ws09_married_household_weekly_active_rate',
      label: '婚后家庭周活率',
      description: '衡量进入婚后 / 知己 / 结缘阶段的玩家，是否仍把陪伴、照料与家庭经营当作稳定周循环，而非结缘后立刻流失。',
      formula: '近7日内满足任一陪伴行为（talkTo、giveGift、performOffering、performSpecialInteraction、processDailyHelpers、performPregnancyCare、interactWithChild）的婚后 / 知己 / 结缘玩家数 ÷ 近7日内已进入后期且至少解锁一条关系线的活跃玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useNpcStore.npcStates / children / pregnancy / hiredHelpers', 'useHiddenNpcStore.hiddenNpcStates', 'useGameLog', 'useGoalStore.weeklyMetricArchive'],
      thresholds: { watch: 0.42, warning: 0.32, critical: 0.22 },
      anomalyRule: '若关系线版本首周存在集中结婚/结缘行为，可单独拆分新结缘样本与老玩家样本，避免一次性庆典峰值误判常态周活。'
    },
    {
      id: 'ws09_family_wish_completion_rate',
      label: '家庭心愿完成率',
      description: '为后续家庭心愿系统建立统一验收口径，过渡阶段允许用婚礼、孕期照料、子女互动等现有家庭节点代理观测。',
      formula: '近14日 familyWishCompletions 增量 ÷ 近14日被编排的家庭心愿条目数；在心愿系统正式上线前，用婚礼完成、孕期照料完成与有效子女互动的完成条目做代理样本',
      direction: 'lower_is_worse',
      dataSources: ['GoalMetricKey.familyWishCompletions', 'useGoalStore.currentGoals / weeklyMetricArchive', 'useNpcStore.dailyWeddingUpdate / dailyPregnancyUpdate / interactWithChild'],
      thresholds: { watch: 0.55, warning: 0.42, critical: 0.3 },
      anomalyRule: '若当周家庭心愿仍以代理样本为主，需要在看板中标注“proxy-only”，不与正式心愿版本横向比较。'
    },
    {
      id: 'ws09_non_combat_late_goal_coverage_rate',
      label: '非战斗后期目标覆盖度',
      description: '衡量家庭 / 仙灵陪伴线是否真的构成后期非战斗目标，而不是只给现有循环加一点被动收益。',
      formula: '近14日完成至少1项家庭 / 知己 / 仙灵相关非战斗目标的玩家数 ÷ 近14日后期活跃玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useGoalStore.currentGoals', 'useNpcStore.relationshipClues / children / weddingCountdown', 'useHiddenNpcStore.triggeredHeartEvents / unlockedAbilities', 'useHomeStore.farmhouseLevel'],
      thresholds: { watch: 0.38, warning: 0.28, critical: 0.18 },
      anomalyRule: '若目标覆盖度突然下降但婚后周活稳定，优先检查家庭目标编排密度与任务入口可见度，而非直接提高奖励。'
    },
    {
      id: 'ws09_relationship_revisit_rate',
      label: '关系系统回访率',
      description: '衡量玩家是否会在不同日窗重复返回 NPC / 仙灵互动，而不是只在冲好感或拿被动时短暂停留。',
      formula: '近7日内在至少3个不同日窗访问 NPC 或仙灵互动并完成对话 / 供奉 / 特殊互动的玩家数 ÷ 近7日内已解锁至少1条关系线的玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useNpcStore.talkedToday / giftedToday / tipGivenToday', 'useHiddenNpcStore.offeredToday / interactedToday / offersThisWeek', 'useGameStore.day / week'],
      thresholds: { watch: 0.48, warning: 0.36, critical: 0.25 },
      anomalyRule: '若婚礼、结缘或新心事件上线导致单日集中访问，需要按“3日后仍回访”的留存窗复核，避免被首日剧情消费掩盖。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws09_partner_automation_share',
      label: '伴侣自动化占比',
      description: '防止雇工、仙灵被动与婚后收益把关系线做成纯代打 / 代产出系统，削弱生活感和情感反馈。',
      formula: '近7日由 hiredHelpers、bondBonuses 与关系被动直接完成的农事 / 喂养 / 钓鱼 / 恢复收益次数 ÷ 近7日关系线带来的全部收益触发次数',
      direction: 'higher_is_worse',
      dataSources: ['useNpcStore.hiredHelpers / processDailyHelpers', 'useHiddenNpcStore.dailyBondBonus / getBondBonus', 'useFishingStore', 'useHomeStore'],
      thresholds: { watch: 0.45, warning: 0.58, critical: 0.7 },
      anomalyRule: '若节庆周或缺劳力补偿周暂时提高了雇工利用率，需要与回访率联看；只有“自动化占比高且回访率低”才视为结构性问题。'
    },
    {
      id: 'ws09_emotional_feedback_visibility_score',
      label: '情感反馈可见度',
      description: '确保关系行为大多数都伴随对话、线索、心事件或生活文本反馈，而不是只跳数字和被动加成。',
      formula: '近14日伴随对话、线索、婚礼 / 孕期 / 子女文本、心事件或结缘文本的关系行为次数 ÷ 近14日全部关系行为次数',
      direction: 'lower_is_worse',
      dataSources: ['NPCS.dialogues / datingDialogues / zhijiDialogues', 'HIDDEN_NPC_HEART_EVENTS', 'useNpcStore.relationshipClues / pregnancy / children', 'useHiddenNpcStore.triggeredHeartEvents'],
      thresholds: { watch: 0.72, warning: 0.58, critical: 0.45 },
      anomalyRule: '若新增的是纯底座任务，可接受一次性 watch；连续两个观测窗低于 warning 则禁止继续追加纯收益型扩容。'
    }
  ],
  playerSegments: [
    {
      id: 'ws09_segment_household_builder',
      label: '家园经营型玩家',
      description: '已有稳定家底和宅院投入，开始追求婚后陪伴、知己互动与家园生活感。',
      disposableMoneyMin: 50000,
      inflationPressureMin: 0.18,
      recommendedFocus: '优先观察婚后家庭周活与关系回访率，验证陪伴线是否能成为后期非战斗日常。'
    },
    {
      id: 'ws09_segment_companion_operator',
      label: '陪伴协作型玩家',
      description: '会使用雇工、孕期照料、子女互动与关系线索，把关系线并入经营节奏。',
      disposableMoneyMin: 80000,
      inflationPressureMin: 0.24,
      recommendedFocus: '重点看家庭心愿完成率与自动化占比，避免协作收益挤掉陪伴反馈。'
    },
    {
      id: 'ws09_segment_spirit_legacy_seeker',
      label: '仙灵结缘与家业传承玩家',
      description: '更关注结缘、隐藏心事件、非战斗终局目标与长期家庭主题的深度玩家。',
      disposableMoneyMin: 120000,
      inflationPressureMin: 0.3,
      recommendedFocus: '重点看非战斗后期目标覆盖度、情感反馈可见度以及 Home / Breeding / Fishing 的跨系统承接。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws09_family_companionship_soft_rollback',
      label: '关系线工具人化软回滚',
      condition: '连续2个观测周中 ws09_partner_automation_share ≥ 0.58，且 ws09_relationship_revisit_rate ≤ 0.36 或 ws09_emotional_feedback_visibility_score ≤ 0.58',
      fallbackAction: '暂停继续放大雇工槽位、仙灵被动和纯收益型婚后加成；回退到低梯度陪伴收益，只保留已解锁关系与叙事进度，优先补家庭心愿、生活文本与跨系统反馈。'
    }
  ],
  linkedSystems: ['system', 'goal', 'quest', 'breeding', 'fishPond'],
  linkedSystemRefs: [
    {
      system: 'system',
      storeId: 'useNpcStore',
      touchpoints: ['dating / married / zhiji 状态', 'children / pregnancy / hiredHelpers', 'relationshipClues / unlockedPerks'],
      rationale: '婚礼、婚后、知己、孕期、子女和雇工都在 useNpcStore 收口，是家庭陪伴线的主状态源。'
    },
    {
      system: 'system',
      storeId: 'useHiddenNpcStore',
      touchpoints: ['affinity / courting / bonded', 'performOffering / performSpecialInteraction', 'bondBonuses / unlockedAbilities'],
      rationale: '仙灵供奉、求缘、结缘与心事件是陪伴线的另一半，需要和婚后线共用同一 KPI 口径。'
    },
    {
      system: 'system',
      storeId: 'useHomeStore',
      touchpoints: ['farmhouseLevel', 'getKitchenBonus', 'dailyCellarUpdate / unlockGreenhouse'],
      rationale: '家庭陪伴必须与宅院、厨房、酒窖等家园经营空间发生联系，才能避免关系线悬空。'
    },
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['familyWishCompletions 指标位', 'currentThemeWeek', 'weeklyMetricArchive'],
      rationale: '家庭心愿、非战斗后期目标和周回访都需要目标系统提供统一周窗与指标快照。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['故事 / 委托入口预留', '非战斗关系主题任务编排', '奖励与叙事投放'],
      rationale: '后续家庭愿望、挚友协作与家业继承需要通过委托 / 剧情入口编排，才能形成明确推进感。'
    },
    {
      system: 'breeding',
      storeId: 'useBreedingStore',
      touchpoints: ['compendium / researchLevel', '杂交失败后重试', '高价值长期培育路线'],
      rationale: '家业传承、子女成长与家庭协作需要能反向作用于长期培育目标，验证“陪伴线”不是孤立内容。'
    },
    {
      system: 'fishPond',
      storeId: 'useFishingStore',
      touchpoints: ['legendary fish / treasure / fish pond 维护', '隐藏仙灵对钓鱼权重的被动影响', '非战斗高端外出循环'],
      rationale: '仙灵结缘已能影响钓鱼与外出收益，是验证陪伴线跨系统承接能力的现成样本。'
    }
  ],
  auditSubjectPools: {
    marriageableNpcIds: [...WS09_RELATIONSHIP_AUDIT_POOLS.marriageableNpcIds],
    zhijiNpcIds: [...WS09_RELATIONSHIP_AUDIT_POOLS.zhijiNpcIds],
    helperCapableNpcIds: [...WS09_RELATIONSHIP_AUDIT_POOLS.helperCapableNpcIds],
    hiddenNpcIds: [...WS09_SPIRIT_BOND_AUDIT_POOLS.hiddenNpcIds]
  }
}

export const WS09_FAMILY_WISH_GOAL_CONFIG = {
  metric: 'familyWishCompletions' as GoalMetricKey,
  tierTargetByTier: { P0: 1, P1: 2, P2: 3 },
  refreshDaysByTier: { P0: 7, P1: 5, P2: 3 },
  linkedSystems: ['goal', 'system', 'fishPond', 'breeding'] as const,
  summary: '为 WS09 家庭心愿系统预留目标度量与周刷新节奏，在 T082 阶段先锁定指标位和档位结构。'
} as const

export const WS10_EVENT_OPERATIONS_BASELINE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'ws10_t091_event_operations_baseline_audit',
  workstreamId: 'WS10-T091',
  label: '主题周 + 活动编排 + 邮箱运营层基线审计',
  summary: '围绕主题周、限时任务、活动奖励邮件与跨系统活动编排建立统一 KPI 口径，确保活动层增强主循环而不是绑架玩家日常登录。',
  focusAreas: ['活动参与率', '邮件打开率', '活动带回流量', '主题周完成率'],
  coreMetrics: [
    {
      id: 'ws10_activity_participation_rate',
      label: '活动参与率',
      description: '衡量主题周、限时任务和活动订单是否真的被玩家承接，而不是停留在说明层。',
      formula: '近14日参与至少1项主题周 / 活动任务 / 活动邮件奖励领取的玩家数 ÷ 近14日活跃玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useGoalStore.currentThemeWeek', 'useGoalStore.currentThemeWeekGoals', 'useQuestStore.specialOrder', 'useMailboxStore.claimMail / claimAll'],
      thresholds: { watch: 0.42, warning: 0.3, critical: 0.2 },
      anomalyRule: '若活动首周恰逢大型版本回归，需拆分新回流用户与常驻用户样本，避免短期峰值掩盖常态参与。'
    },
    {
      id: 'ws10_mail_open_rate',
      label: '邮件打开率',
      description: '衡量活动说明、结算邮件与补偿邮件是否被真正打开和消费。',
      formula: '近14日 `read_at` 非空的活动 / 结算 / 补偿邮件数 ÷ 近14日已发送活动相关邮件数',
      direction: 'lower_is_worse',
      dataSources: ['useMailboxStore.mails', 'useMailboxStore.openMail', 'template_type', 'read_at'],
      thresholds: { watch: 0.68, warning: 0.52, critical: 0.38 },
      anomalyRule: '若当周有大批纯奖励邮件自动被领取但未读，需要单独统计公告型邮件与奖励型邮件，避免读取口径失真。'
    },
    {
      id: 'ws10_activity_return_rate',
      label: '活动带回流量',
      description: '衡量主题周和活动邮件是否能把玩家重新拉回 Quest / Shop / Guild / Museum / Hanhai 的经营循环。',
      formula: '近14日因主题周焦点、活动订单、活动邮件而触发至少2个系统参与的玩家数 ÷ 近14日活动参与玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useQuestStore.marketQuestBiasProfile', 'useGoalStore.currentThemeWeekGoals', 'useShopStore.recommendedCatalogOffers', 'useMailboxStore.claim_result'],
      thresholds: { watch: 0.4, warning: 0.28, critical: 0.18 },
      anomalyRule: '若活动参与率高但回流率低，优先检查活动是否只给奖励不导向后续玩法，而不是单纯提高奖励。'
    },
    {
      id: 'ws10_theme_week_completion_rate',
      label: '主题周完成率',
      description: '衡量主题周目标是否可理解、可承接且不会因为活动编排过重而导致完成率断崖。',
      formula: '近8个主题周窗口中，完成至少1条周目标或活动订单的主题周次数 ÷ 已开启的主题周窗口数',
      direction: 'lower_is_worse',
      dataSources: ['useGoalStore.currentThemeWeekGoals', 'useGoalStore.weeklyGoals', 'useQuestStore.specialOrder', 'useEndDay weekly snapshot'],
      thresholds: { watch: 0.62, warning: 0.48, critical: 0.35 },
      anomalyRule: '若某个主题周内容尚未首批落地，可标记为空窗周单独统计，避免把缺内容周和可玩周混算。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws10_forced_checkin_pressure',
      label: '强制打卡压力比',
      description: '防止活动层演变为每天必须上线签到的负担。',
      formula: '近14日要求“每日连续登录 / 当天必须打开邮件 / 当天必须完成活动”的活动条目数 ÷ 近14日活动条目总数',
      direction: 'higher_is_worse',
      dataSources: ['活动模板配置', 'useMailboxStore.template_type', 'useGoalStore.currentThemeWeek'],
      thresholds: { watch: 0.2, warning: 0.3, critical: 0.4 },
      anomalyRule: '若节庆冲刺周短期出现高值，需要确认是否设置了明确补签或宽限窗；连续两轮超标则视为活动设计问题。'
    },
    {
      id: 'ws10_duplicate_reward_mail_ratio',
      label: '重复奖励邮件占比',
      description: '防止活动结算与补偿邮件因模板或任务重复导致玩家重复领同类奖励。',
      formula: '近14日带 `duplicate_compensation_money` 或 skipped_rewards 的活动邮件数 ÷ 近14日活动奖励邮件总数',
      direction: 'higher_is_worse',
      dataSources: ['useMailboxStore.claim_result', 'duplicate_compensation_money', 'skipped_rewards'],
      thresholds: { watch: 0.08, warning: 0.15, critical: 0.25 },
      anomalyRule: '若高值集中在单次补偿活动，应拆分“活动奖励重复”与“补偿兜底重复”，避免把一次修复波动当常态。'
    }
  ],
  playerSegments: [
    {
      id: 'ws10_segment_theme_regular',
      label: '主题周常驻玩家',
      description: '习惯跟随周节奏推进经营、订单和展示的常驻玩家。',
      disposableMoneyMin: 40000,
      inflationPressureMin: 0.18,
      recommendedFocus: '优先看主题周完成率与活动参与率，验证活动层是否增强了原有周循环。'
    },
    {
      id: 'ws10_segment_event_returnee',
      label: '活动回流玩家',
      description: '主要被邮件说明、活动订单或主题周推荐重新带回经营循环的玩家。',
      disposableMoneyMin: 60000,
      inflationPressureMin: 0.2,
      recommendedFocus: '重点看邮件打开率、活动带回流量与跨系统二次参与。'
    },
    {
      id: 'ws10_segment_endgame_operator',
      label: '终局活动编排玩家',
      description: '会同时承接公会、博物馆、瀚海和豪华目录活动编排的终局经营者。',
      disposableMoneyMin: 100000,
      inflationPressureMin: 0.28,
      recommendedFocus: '重点看活动层是否把多系统节奏串起来，而不是让任务板和邮件只重复发奖。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws10_event_operations_soft_rollback',
      label: '活动层软回滚',
      condition: '连续2个观测周中 ws10_forced_checkin_pressure ≥ 0.3，且 ws10_theme_week_completion_rate ≤ 0.48 或 ws10_mail_open_rate ≤ 0.52',
      fallbackAction: '暂停高频打卡型活动模板与高密度邮件推送，仅保留主题周基础说明、已发奖励和低频结算邮件，优先回退到主题周 + 订单的轻编排模式。'
    }
  ],
  linkedSystems: ['goal', 'quest', 'shop', 'system'],
  linkedSystemRefs: [
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'currentThemeWeekGoals', 'weeklyGoals', 'weeklyMetricArchive'],
      rationale: '主题周节奏、周目标与周快照是活动编排的底层时间窗和完成口径。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['specialOrder', 'marketQuestBiasProfile', 'activitySourceLabel', 'processSpecialOrderWeeklyRefresh'],
      rationale: '活动订单、限时任务和供货方向都通过 QuestStore 编排，是活动参与的核心入口。'
    },
    {
      system: 'shop',
      storeId: 'useShopStore',
      touchpoints: ['recommendedCatalogOffers', 'weeklyCatalogOffers', 'getServiceContractEffectSummary'],
      rationale: '活动层会把玩家导向特定采购、补给和服务承接，因此需要统计商店承接效果。'
    },
    {
      system: 'system',
      storeId: 'useMailboxStore',
      touchpoints: ['mails', 'unreadCount', 'openMail', 'claimMail', 'claimAll'],
      rationale: '活动说明、奖励结算和补偿投放都通过邮箱承载，邮件打开与领奖是运营层最直接的观测信号。'
    },
    {
      system: 'system',
      storeId: 'useGuildStore / useMuseumStore / useHanhaiStore',
      touchpoints: ['crossSystemOverview', 'featured content', 'week tick outputs'],
      rationale: '活动层是否成功，取决于它能否把公会、博物馆、瀚海等既有后期系统纳入同一节奏编排。'
    }
  ]
}

export const WS10_EVENT_MAIL_TEMPLATE_REFS: EventMailTemplateRef[] = [
  {
    id: 'ws10_theme_week_settlement',
    templateType: 'activity_reward',
    cadenceSlot: 'settlement',
    linkedRouteLabels: ['Quest', 'Mail', 'TopGoals'],
    title: '主题周阶段结算',
    summary: '用于主题周中期 / 周末结算，回收主题周参与与奖励说明。'
  },
  {
    id: 'ws10_limited_time_campaign_notice',
    templateType: 'maintenance_notice',
    cadenceSlot: 'opening',
    linkedRouteLabels: ['Quest', 'Mail'],
    title: '限时活动说明',
    summary: '用于限时活动启用、规则说明与倒计时提醒。'
  },
  {
    id: 'ws10_activity_compensation',
    templateType: 'compensation',
    cadenceSlot: 'compensation',
    linkedRouteLabels: ['Mail', 'Hall'],
    title: '活动补偿说明',
    summary: '用于活动异常、补发奖励或临时降级时的补偿模板。'
  }
]

export const WS10_EVENT_CAMPAIGN_DEFS: EventCampaignDef[] = [
  {
    id: 'ws10_campaign_theme_rotation',
    label: '主题周轮转活动',
    description: '围绕现有主题周、周目标与特殊订单建立 P0 级活动编排骨架。',
    unlockTier: 'P0',
    cadence: 'weekly',
    linkedThemeWeekIds: ['spring_sowing', 'summer_fishing', 'autumn_processing', 'winter_mining'],
    linkedSystems: ['goal', 'quest', 'shop'],
    mailboxTemplateIds: ['ws10_theme_week_settlement'],
    rewardSummary: '提供主题周说明、周目标承接与结算邮件入口。'
  },
  {
    id: 'ws10_campaign_limited_supply',
    label: '限时供货活动',
    description: '围绕高阶订单、限时任务与目录推荐建立 P1 级活动编排骨架。',
    unlockTier: 'P1',
    cadence: 'biweekly',
    linkedThemeWeekIds: ['autumn_processing', 'late_sink_rotation'],
    linkedSystems: ['quest', 'goal', 'shop'],
    mailboxTemplateIds: ['ws10_limited_time_campaign_notice', 'ws10_theme_week_settlement'],
    rewardSummary: '用于承接限时任务、供货周与阶段奖励邮件。'
  },
  {
    id: 'ws10_campaign_world_milestone',
    label: '全服共建与收尾活动',
    description: '围绕世界里程碑、公会共建、终局展示与收尾邮件建立 P2 级活动骨架。',
    unlockTier: 'P2',
    cadence: 'seasonal',
    linkedThemeWeekIds: ['late_sink_rotation'],
    linkedSystems: ['goal', 'quest', 'shop', 'system'],
    mailboxTemplateIds: ['ws10_theme_week_settlement', 'ws10_activity_compensation'],
    rewardSummary: '用于承接终局活动、共建收尾、补偿与长期回流说明。'
  }
]

export const WS13_EVENT_MAIL_TEMPLATE_REFS: EventMailTemplateRef[] = [
  {
    id: 'ws13_activity_opening_brief',
    templateType: 'activity_notice',
    cadenceSlot: 'opening',
    linkedRouteLabels: ['TopGoals', 'Quest', 'Mail'],
    title: '本周活动开启说明',
    summary: '用于在活动开始时说明本周活动主旋律、推荐路线和当前建议前往的玩法页。',
    previewHeadline: '这封邮件会把“本周做什么、先去哪、先备什么”一次讲清楚。'
  },
  {
    id: 'ws13_activity_midweek_digest',
    templateType: 'activity_midweek',
    cadenceSlot: 'midweek',
    linkedRouteLabels: ['Mail', 'Quest', 'Hall'],
    title: '活动周中提醒',
    summary: '用于在周中提示活动剩余目标、可领取奖励和推荐补救路线。',
    previewHeadline: '给回流玩家和中断中的玩家一个重新接回活动节奏的入口。'
  },
  {
    id: 'ws13_activity_settlement_bonus',
    templateType: 'activity_reward',
    cadenceSlot: 'settlement',
    linkedRouteLabels: ['Mail', 'TopGoals', 'Quest'],
    title: '活动结算奖励',
    summary: '用于活动收尾的主要结算奖励邮件，并附带下周推荐方向。',
    previewHeadline: '奖励不再只是落袋，同时给出“下周去哪”的衔接说明。'
  },
  {
    id: 'ws13_activity_next_week_preview',
    templateType: 'activity_preview',
    cadenceSlot: 'preview',
    linkedRouteLabels: ['Mail', 'Shop', 'TopGoals'],
    title: '下周活动预告',
    summary: '用于在收尾阶段展示下周活动路线、建议物资和推荐页面。',
    previewHeadline: '提前一封预告，把回流和囤货节奏一起做起来。'
  }
]

export const WS13_EVENT_CAMPAIGN_DEFS: EventCampaignDef[] = [
  {
    id: 'ws13_campaign_fishpond_rotation',
    label: '鱼塘周赛升级周',
    description: '围绕春塘苏醒、夏夜展示与寒塘养护，把鱼塘周赛、待领取产物和展示池承接并入统一活动层。',
    unlockTier: 'P0',
    cadence: 'weekly',
    variantGroup: 'fishpond',
    targetAudience: ['newcomer_friendly', 'returnee_friendly'],
    linkedThemeWeekIds: ['spring_pond_awakening', 'summer_pond_showcase', 'winter_pond_maintenance'],
    linkedSystems: ['goal', 'quest', 'shop', 'fishPond'],
    linkedRouteLabels: ['鱼塘', '任务', '邮箱'],
    mailboxTemplateIds: ['ws13_activity_opening_brief', 'ws13_activity_midweek_digest', 'ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview'],
    mailCadence: ['opening', 'midweek', 'settlement', 'preview'],
    shopBundleId: 'ws13_fishpond_rotation_bundle',
    limitedQuestCampaignId: 'ws13_fishpond_rotation_window',
    rewardTierId: 'steady',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 30,
    rewardSummary: '强调鱼塘周赛报名、产物承接、展示池镜像和活动奖励邮件的鱼塘活动周。'
  },
  {
    id: 'ws13_campaign_breeding_rotation',
    label: '育种周赛扩展周',
    description: '围绕春种试育、盛夏量产、秋收精品与冬储补给，把育种周赛、图鉴推进和特种订单承接整合进活动层。',
    unlockTier: 'P0',
    cadence: 'weekly',
    variantGroup: 'breeding',
    targetAudience: ['newcomer_friendly', 'returnee_friendly'],
    linkedThemeWeekIds: ['spring_sowing', 'summer_supply', 'autumn_harvest', 'winter_storage'],
    linkedSystems: ['goal', 'quest', 'shop'],
    linkedRouteLabels: ['育种', '任务', '商店'],
    mailboxTemplateIds: ['ws13_activity_opening_brief', 'ws13_activity_midweek_digest', 'ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview'],
    mailCadence: ['opening', 'midweek', 'settlement', 'preview'],
    shopBundleId: 'ws13_breeding_rotation_bundle',
    limitedQuestCampaignId: 'ws13_breeding_rotation_window',
    rewardTierId: 'steady',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 30,
    rewardSummary: '强调育种周赛、图鉴推进、研究补给与特种订单承接的育种活动周。'
  },
  {
    id: 'ws13_campaign_museum_supply',
    label: '博物馆策展供给周',
    description: '围绕春研布展、秋展筹备和冬研考据，把学者委托、馆务展陈与活动邮件节奏整合到同一条策展线。',
    unlockTier: 'P1',
    cadence: 'biweekly',
    variantGroup: 'museum',
    targetAudience: ['returnee_friendly', 'endgame'],
    linkedThemeWeekIds: ['spring_scholar', 'autumn_exhibition', 'winter_scholar'],
    linkedSystems: ['goal', 'quest', 'shop'],
    linkedRouteLabels: ['博物馆', '任务', '邮箱'],
    mailboxTemplateIds: ['ws13_activity_opening_brief', 'ws13_activity_midweek_digest', 'ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview'],
    mailCadence: ['opening', 'midweek', 'settlement', 'preview'],
    shopBundleId: 'ws13_museum_supply_bundle',
    limitedQuestCampaignId: 'ws13_museum_supply_window',
    rewardTierId: 'activity',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 26,
    rewardSummary: '强调馆区焦点、学者委托、展陈热度和活动承接提示的博物馆活动周。'
  },
  {
    id: 'ws13_campaign_hanhai_supply',
    label: '瀚海远征承接周',
    description: '围绕夏行商路、冬储经营与豪华经营周，把瀚海商路、遗迹勘探和目录承接串成一条活动线。',
    unlockTier: 'P1',
    cadence: 'biweekly',
    variantGroup: 'hanhai',
    targetAudience: ['returnee_friendly', 'endgame'],
    linkedThemeWeekIds: ['summer_caravan', 'winter_storage', 'late_sink_rotation'],
    linkedSystems: ['goal', 'quest', 'shop', 'fishPond'],
    linkedRouteLabels: ['瀚海', '任务', '商店'],
    mailboxTemplateIds: ['ws13_activity_opening_brief', 'ws13_activity_midweek_digest', 'ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview'],
    mailCadence: ['opening', 'midweek', 'settlement', 'preview'],
    shopBundleId: 'ws13_hanhai_supply_bundle',
    limitedQuestCampaignId: 'ws13_hanhai_supply_window',
    rewardTierId: 'activity',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 26,
    rewardSummary: '强调商路投资、遗迹勘探、轮换货架和高价目录承接的瀚海活动周。'
  },
  {
    id: 'ws13_campaign_fishpond_showcase_wrapup',
    label: '鱼塘展示收尾周',
    description: '围绕展示池快照、博物馆加成和活动收尾，把本周高光鱼样和活动成果转成 Hall / Mail 的展示节奏。',
    unlockTier: 'P2',
    cadence: 'seasonal',
    variantGroup: 'fishpond',
    targetAudience: ['returnee_friendly', 'endgame'],
    linkedThemeWeekIds: ['summer_pond_showcase', 'late_sink_rotation'],
    linkedSystems: ['goal', 'quest', 'shop', 'fishPond'],
    linkedRouteLabels: ['鱼塘', '大厅', '邮箱'],
    mailboxTemplateIds: ['ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview', 'ws10_activity_compensation'],
    mailCadence: ['settlement', 'preview', 'compensation'],
    shopBundleId: 'ws13_fishpond_showcase_bundle',
    limitedQuestCampaignId: 'ws13_fishpond_showcase_window',
    rewardTierId: 'showcase',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 20,
    rewardSummary: '强调鱼塘高光样本展示、收尾回顾与下一轮准备的活动收尾周。'
  },
  {
    id: 'ws13_campaign_hanhai_patron_wrapup',
    label: '瀚海赞助收尾周',
    description: '围绕豪华经营周的赞助、收尾与共建编排，让 Hanhai / Museum / Shop 的终局承接以一场活动收束。',
    unlockTier: 'P2',
    cadence: 'seasonal',
    variantGroup: 'hanhai',
    targetAudience: ['returnee_friendly', 'endgame'],
    linkedThemeWeekIds: ['late_sink_rotation', 'winter_mining'],
    linkedSystems: ['goal', 'quest', 'shop', 'system'],
    linkedRouteLabels: ['瀚海', '博物馆', '大厅'],
    mailboxTemplateIds: ['ws13_activity_settlement_bonus', 'ws13_activity_next_week_preview', 'ws10_activity_compensation'],
    mailCadence: ['settlement', 'preview', 'compensation'],
    shopBundleId: 'ws13_hanhai_patron_bundle',
    limitedQuestCampaignId: 'ws13_hanhai_patron_window',
    rewardTierId: 'showcase',
    onlineEngagementMode: 'hall_mail_ai',
    priority: 20,
    rewardSummary: '强调瀚海赞助、展陈收尾和回流预告的终局活动收尾周。'
  }
]

export const WS18_PROGRESS_BRIDGE_DEFS: ProgressBridgeDef[] = [
  {
    bridgeId: 'ws18_fishpond_unlock_bridge',
    label: '鱼塘开塘桥',
    targetSystem: 'fishpond',
    entryCriteria: { minMoney: 1800, requireRouteLabels: ['Quest', 'TopGoals'] },
    linkedThemeWeekIds: ['spring_pond_awakening', 'summer_fishing'],
    linkedRouteLabels: ['鱼塘', '任务', '邮箱'],
    weeklyObjective: '先把鱼塘建起来，再用本周任务和活动摘要承接第一次养护与投样。',
    settlementHook: '第一次周切换后，把鱼塘样本、产物与可领奖点同步到任务与邮件摘要。',
    nextWeekPrepSummary: '下周继续保留基础饵料和一批可投样鱼获，方便直接接上周赛或展示线。',
    rewardSummary: '默认承接少量养护物资、资格放开和鱼塘路线摘要增强。',
    priority: 100
  },
  {
    bridgeId: 'ws18_fishpond_settlement_bridge',
    label: '鱼塘首轮结算桥',
    targetSystem: 'fishpond',
    entryCriteria: { minMoney: 4200, requireRouteLabels: ['Mail', 'Quest'] },
    linkedThemeWeekIds: ['summer_pond_showcase', 'winter_pond_maintenance'],
    linkedRouteLabels: ['鱼塘', '大厅', '邮箱'],
    weeklyObjective: '完成第一次报名、周中养护和展示准备，让鱼塘不只停在日常产物。',
    settlementHook: '首次周赛或展示结算后，把奖励、展示结果和下周推荐同步进周纪行。',
    nextWeekPrepSummary: '下周提前准备展示池样本和养护物资，方便从结算直接过渡到下一轮经营。',
    rewardSummary: '默认承接少量展示票券、活动资格与收尾摘要增强。',
    priority: 92
  },
  {
    bridgeId: 'ws18_breeding_unlock_bridge',
    label: '育种开线桥',
    targetSystem: 'breeding',
    entryCriteria: { minMoney: 2200, requireRouteLabels: ['Quest', 'Shop'] },
    linkedThemeWeekIds: ['spring_sowing', 'summer_supply'],
    linkedRouteLabels: ['育种', '任务', '商店'],
    weeklyObjective: '先完成首轮育种解锁和样本入箱，再让任务和目录推荐接住第一次培育目标。',
    settlementHook: '第一次收种或研究推进后，把品系方向、票券和推荐路线写进周计划快照。',
    nextWeekPrepSummary: '下周继续保留基础亲本和研究消耗，方便直接进入周赛或特殊订单。',
    rewardSummary: '默认承接少量研究票券、育种耗材与育种路线摘要增强。',
    priority: 100
  },
  {
    bridgeId: 'ws18_breeding_settlement_bridge',
    label: '育种首轮结算桥',
    targetSystem: 'breeding',
    entryCriteria: { minMoney: 5200, requireRouteLabels: ['Quest', 'Mail'] },
    linkedThemeWeekIds: ['autumn_harvest', 'winter_storage'],
    linkedRouteLabels: ['育种', '任务', '邮箱'],
    weeklyObjective: '完成第一次参赛或图鉴推进，把育种从单次实验变成有周节奏的成长线。',
    settlementHook: '首次周赛或图鉴结算后，把研究票券、下一轮推荐品系和活动承接写进周纪行。',
    nextWeekPrepSummary: '下周提前整理亲本、图鉴缺口和任务供货方向，保证结算后能继续接线。',
    rewardSummary: '默认承接少量研究票券、活动资格与下周育种推荐摘要。',
    priority: 90
  },
  {
    bridgeId: 'ws18_museum_unlock_bridge',
    label: '博物馆开馆桥',
    targetSystem: 'museum',
    entryCriteria: { minMoney: 3600, requireRouteLabels: ['Quest', 'Village'] },
    linkedThemeWeekIds: ['spring_scholar', 'autumn_exhibition'],
    linkedRouteLabels: ['博物馆', '任务', '邮箱'],
    weeklyObjective: '先完成第一次捐赠和展位解锁，让任务、家园或挖矿成果有地方沉淀。',
    settlementHook: '第一次捐赠或委托承接后，把展陈焦点、馆区热度和后续推荐同步到周计划。',
    nextWeekPrepSummary: '下周优先保留一批适合捐赠或展陈的矿晶、古物或灵物样本。',
    rewardSummary: '默认承接少量展陈票券、委托资格与展陈摘要增强。',
    priority: 96
  },
  {
    bridgeId: 'ws18_museum_settlement_bridge',
    label: '博物馆首轮结算桥',
    targetSystem: 'museum',
    entryCriteria: { minMoney: 7600, requireRouteLabels: ['Mail', 'Hall'] },
    linkedThemeWeekIds: ['autumn_exhibition', 'winter_scholar'],
    linkedRouteLabels: ['博物馆', '大厅', '邮箱'],
    weeklyObjective: '完成第一次馆务委托、展陈加热或活动承接，让博物馆进入稳定周循环。',
    settlementHook: '首次委托或展陈高光结算后，把馆区成果、访客热度和下周推荐写入周纪行。',
    nextWeekPrepSummary: '下周提前备好展陈样本和委托素材，方便直接衔接下一轮专题展。',
    rewardSummary: '默认承接少量委托加成、展示资格和收尾摘要增强。',
    priority: 88
  },
  {
    bridgeId: 'ws18_hanhai_unlock_bridge',
    label: '瀚海开通桥',
    targetSystem: 'hanhai',
    entryCriteria: { minMoney: 9000, requireRouteLabels: ['Shop', 'Quest'] },
    linkedThemeWeekIds: ['summer_caravan', 'winter_storage'],
    linkedRouteLabels: ['瀚海', '任务', '商店'],
    weeklyObjective: '先完成瀚海开通和第一条商路投资，让资金线、供货线和后期路线真正接通。',
    settlementHook: '第一次商路开通或遗迹勘探后，把瀚海焦点、补给需求和推荐目录同步到周计划。',
    nextWeekPrepSummary: '下周提前准备补给包、藏宝图和高价值供货物资，方便继续推进商路。',
    rewardSummary: '默认承接少量商路票券、补给资格和瀚海摘要增强。',
    priority: 98
  },
  {
    bridgeId: 'ws18_hanhai_settlement_bridge',
    label: '瀚海首轮结算桥',
    targetSystem: 'hanhai',
    entryCriteria: { minMoney: 18000, requireRouteLabels: ['Mail', 'Hall'] },
    linkedThemeWeekIds: ['late_sink_rotation', 'winter_mining'],
    linkedRouteLabels: ['瀚海', '博物馆', '大厅'],
    weeklyObjective: '完成第一次首领、合同或遗迹收尾，让瀚海从单次高端商路变成周循环的一部分。',
    settlementHook: '首次合同或首领收尾后，把高光结果、轮换货架和下一周准备同步进周纪行与收尾展示。',
    nextWeekPrepSummary: '下周优先准备高规格样本、合同物资和补给包，确保能承接下一轮瀚海活动。',
    rewardSummary: '默认承接少量商路票券、展示资格与收尾摘要增强。',
    priority: 86
  }
]

export const WS20_EVENT_MAIL_TEMPLATE_REFS: EventMailTemplateRef[] = [
  {
    id: 'ws20_weekly_recap_digest',
    templateType: 'weekly_recap',
    cadenceSlot: 'recap',
    linkedRouteLabels: ['Mail', 'TopGoals', 'Hall'],
    title: '周纪行回顾',
    summary: '用于在周切换后汇总本周主路线、高光结果、结算记录和下周准备说明。',
    previewHeadline: '它不会替代奖励邮件，而是把“这周发生了什么”稳定沉淀下来。'
  }
]

export const createDefaultEventOperationsState = (): EventOperationsState => ({
  version: 1,
  activeCampaignId: null,
  activeThemeWeekCampaignId: null,
  cadence: 'weekly',
  completedCampaignIds: [],
  completedThemeWeekIds: [],
  claimedMailCampaignIds: [],
  claimedMailReceiptKeys: [],
  lastCampaignDayTag: '',
  lastSettlementDayTag: ''
})

export const WS10_EVENT_OPERATION_TUNING_CONFIG = {
  featureFlags: {
    eventCampaignEnabled: true,
    activityQuestWindowEnabled: true,
    mailboxDigestEnabled: true,
    eventViewSummaryEnabled: true
  },
  display: {
    topGoalsCampaignPreviewLimit: 1,
    mailDigestPreviewLimit: 3
  },
  cadence: {
    weeklyCampaignDurationDays: 7,
    limitedQuestRefreshDays: 7,
    seasonalCampaignDurationDays: 28
  },
  operations: {
    maxActiveCampaigns: 1,
    maxPendingMailTemplateRefs: 2
  }
} as const

export const WS10_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '活动层只能增强主循环，不得把主题周、邮件与限时任务做成强制每天打卡的第二套主线。',
    '活动编排、限时任务窗口与邮件模板引用必须统一走 store API 和 data 配置，不得在页面临时拼状态。',
    '活动层的周切换、窗口切换与邮件认领必须具备幂等、回滚与旧档兼容回填。',
    '活动编排必须能明确导向 Quest / Shop / Guild / Museum / Hanhai 中的至少两条现有系统路线，而不是只发奖励邮件。'
  ],
  releaseAnnouncement: [
    '【活动编排】主题周、限时任务、邮件摘要与活动结算节奏已接入统一活动层底座。',
    '【运营模板】活动邮件模板、限时任务窗口与目录承接包现已具备统一配置入口，后续可持续扩容。',
    '【活动联动】活动层现已开始反向影响任务板、目录承接和多条后期系统的周建议。'
  ]
} as const

export const WS10_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws10-positive-theme-campaign-switch',
    title: '主题周切换时活动编排能稳定切到对应活动',
    category: 'positive',
    steps: ['推进到新周', '检查 `processEventOperationsTick()` 和 `currentEventCampaign`'],
    expectedResult: '活动编排切换到对应主题周活动，活动总览、QuestView 与 TopGoalsPanel 同步显示。'
  },
  {
    id: 'ws10-positive-limited-window-switch',
    title: '限时任务窗口会跟随活动编排切换',
    category: 'positive',
    steps: ['激活某个活动编排', '触发 `processActivityQuestWindowTick()`', '查看 QuestView'],
    expectedResult: '限时任务窗口更新为对应 campaign，QuestView 能看到活动来源与时长。'
  },
  {
    id: 'ws10-positive-mail-digest',
    title: '邮箱页可正确展示活动邮件摘要',
    category: 'positive',
    steps: ['准备至少 1 封 `activity_reward` 邮件', '打开 MailView'],
    expectedResult: 'MailView 顶部活动邮件摘要正确显示当前活动、活动邮件数与可领邮件数。'
  },
  {
    id: 'ws10-boundary-repeat-campaign-tick',
    title: '同一周重复触发活动 tick 不会重复写状态',
    category: 'boundary',
    steps: ['在同一天对同一 `weekId` 连续调用 `processEventOperationsTick()` 与 `processActivityQuestWindowTick()` 两次'],
    expectedResult: '活动编排与活动任务窗口只保留一次有效切换结果，不重复生成额外状态或日志洪泛。'
  },
  {
    id: 'ws10-negative-rollback-campaign-state',
    title: '活动状态写入异常时会回滚',
    category: 'negative',
    steps: ['模拟活动编排或活动任务窗口状态写入异常', '检查 eventOperationsState / activityQuestWindowState'],
    expectedResult: '两类活动状态都会回滚到异常前，不出现半切换状态。'
  },
  {
    id: 'ws10-ops-disable-event-layer',
    title: '关闭活动层开关后系统可安全降级',
    category: 'ops',
    steps: ['将 `WS10_EVENT_OPERATION_TUNING_CONFIG.featureFlags.eventCampaignEnabled` 或 `activityQuestWindowEnabled` 设为 false', '刷新活动相关页面'],
    expectedResult: '活动编排或限时任务窗口可安全关闭，其余主题周 / 任务 / 邮箱功能保持正常。'
  },
  {
    id: 'ws10-compatibility-old-save-event-state',
    title: '旧档缺少活动层字段时可安全读档',
    category: 'compatibility',
    steps: ['读取不包含 eventOperationsState / activityQuestWindowState 的旧档', '打开 QuestView、MailView、TopGoalsPanel'],
    expectedResult: '旧档安全回填默认值，活动层页面不报错。'
  },
  {
    id: 'ws10-recovery-mail-template-reference',
    title: '活动模板引用异常时可回退到基础结算模板',
    category: 'recovery',
    steps: ['模拟某个活动邮件模板引用失效', '触发活动 tick 与页面展示'],
    expectedResult: '活动层仍可回退到基础结算模板引用，不影响主循环推进。'
  }
]

export const WS10_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws10-check-campaign-state', label: '确认活动编排与限时任务窗口的状态切换、回填与收束一致', owner: 'dev', done: false },
  { id: 'ws10-check-mail-digest', label: '确认 MailView 与 TopGoalsPanel 能看到活动摘要和当前活动', owner: 'qa', done: false },
  { id: 'ws10-check-cross-link', label: '确认活动层能导向 Quest / Shop 等现有系统路线', owner: 'qa', done: false },
  { id: 'ws10-check-ops-toggle', label: '确认活动层开关、预览数量与邮件模板引用可通过 tuning config 调整', owner: 'ops', done: false },
  { id: 'ws10-check-old-save', label: '确认旧档活动层字段能安全默认回填', owner: 'qa', done: false }
]

export const WS10_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws10-compensate-duplicate-activity-mail',
    trigger: '活动结算邮件或限时任务窗口重复发放奖励，导致同类活动收益异常叠加。',
    compensation: ['按 campaignId / mail template / claimed reward 记录回收重复收益或发放说明补偿', '保留首次合法活动结算记录'],
    notes: '优先依据 claimedMailCampaignIds、claimedRewardMailIds 与活动周切换日志定位异常窗口。'
  },
  {
    id: 'ws10-compensate-event-cadence-fallback',
    trigger: '活动编排切换异常，导致主题周和限时任务窗口错位或空窗。',
    action: '回调 `WS10_EVENT_OPERATION_TUNING_CONFIG` 的 cadence / featureFlags，回退到基础主题周 + 邮件结算模式。'
  },
  {
    id: 'ws10-compensate-checkin-pressure',
    trigger: '活动层打卡压力过高，导致主题周完成率和邮件打开率同步下滑。',
    action: '暂停高频活动模板，只保留低频结算与主题周摘要，并通过活动公告说明节奏调整。'
  }
]

export const WS10_RELEASE_ANNOUNCEMENT = [
  '【活动编排】主题周、限时任务、邮件摘要与活动结算节奏已接入统一活动层底座。',
  '【运营模板】活动邮件模板、限时任务窗口与目录承接包现已具备统一配置入口，后续可持续扩容。',
  '【活动联动】活动层现已开始反向影响任务板、目录承接和多条后期系统的周建议。'
] as const

export const WS12_QA_GOVERNANCE_BASELINE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'ws12_t111_qa_governance_baseline_audit',
  workstreamId: 'WS12-T111',
  label: 'QA、平衡、灰度、存档兼容与回滚基线审计',
  summary: '围绕特性开关、存档迁移、事务化结算、自动化回归、公告与补偿建立统一 KPI 口径，确保后期内容扩展不会放大历史边界问题。',
  focusAreas: ['坏档率', '回滚触发率', '任务结算错误率', '发布后热修次数'],
  coreMetrics: [
    {
      id: 'ws12_save_corruption_rate',
      label: '坏档率',
      description: '衡量导入、读档、模式切换和旧档迁移后出现不可恢复存档异常的比例。',
      formula: '近14天 parse / load / import 失败且无法通过回退快照恢复的存档次数 ÷ 近14天总读档 / 导档 / 模式切换次数',
      direction: 'higher_is_worse',
      dataSources: ['useSaveStore.parseSaveData', 'useSaveStore.loadFromSlot', 'useSaveStore.importSave', 'SaveEnvelope.meta.saveVersion'],
      thresholds: { watch: 0.01, warning: 0.03, critical: 0.05 },
      anomalyRule: '若失败集中在单个历史版本或单个样例档，必须拆分“旧档迁移失败”和“当前版本写坏档”两类口径，避免误判线上稳定性。'
    },
    {
      id: 'ws12_rollback_trigger_rate',
      label: '回滚触发率',
      description: '衡量事务保护、快照恢复和幂等护栏是否频繁被触发，反映后期链路是否仍存在边界不稳。',
      formula: '近14天因奖励发放、状态写入、日结或周结异常而执行回滚的次数 ÷ 近14天受事务保护的关键操作总次数',
      direction: 'higher_is_worse',
      dataSources: ['useSaveStore.applySaveData 回退', 'useQuestStore 订单结算回滚', 'useTutorialStore guidanceActionLocks / rollbackGuidanceAction', 'useEndDay 结算日志'],
      thresholds: { watch: 0.02, warning: 0.05, critical: 0.08 },
      anomalyRule: '若回滚主要来自压测或开发态样例档批量切换，必须从正式玩家样本中剔除，再评估是否属于真实稳定性问题。'
    },
    {
      id: 'ws12_settlement_error_rate',
      label: '任务结算错误率',
      description: '衡量订单、加工、矿洞战利品、项目捐献等高风险结算链路是否仍会出现半成功、重复发放或吞货问题。',
      formula: '近14天任务 / 订单 / 奖励发放中出现失败回执、重复领取拦截或容量预检失败的次数 ÷ 近14天对应结算尝试总次数',
      direction: 'higher_is_worse',
      dataSources: ['useQuestStore 结算记录', 'useProcessingStore 产物领取', 'useInventoryStore.canAddItems', 'useVillageProjectStore 捐献与维护操作'],
      thresholds: { watch: 0.015, warning: 0.04, critical: 0.06 },
      anomalyRule: '若错误集中在单一资源缺口或背包满场景，应单独统计为“预检拦截”而非“真实结算错误”，防止把正常保护误算成线上事故。'
    },
    {
      id: 'ws12_post_release_hotfix_count',
      label: '发布后热修次数',
      description: '衡量版本上线后是否仍需通过紧急参数或代码修补来兜住稳定性和兼容性问题。',
      formula: '版本发布后7天内，因坏档、回滚、奖励异常、灰度开关错配而执行的热修 / 热调 / 回退次数',
      direction: 'higher_is_worse',
      dataSources: ['CHANGELOG 热修记录', 'tuning config 调整记录', 'ops 发布清单', '补偿公告'],
      thresholds: { watch: 1, warning: 2, critical: 3 },
      anomalyRule: '若热修仅为文案或展示层微调，需与影响结算或兼容性的真实事故热修分开统计，避免放大运维噪音。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws12_migration_fallback_ratio',
      label: '旧档迁移兜底占比',
      description: '防止新字段或版本迁移过度依赖兜底回填，导致表面可读档、实则状态不一致。',
      formula: '近14天读取旧档时命中默认回填 / 兜底修正的字段次数 ÷ 近14天旧档读取的字段总次数',
      direction: 'higher_is_worse',
      dataSources: ['useSaveStore.migrateSavePayload', 'usePlayerStore.deserialize', '各 store deserialize 默认值回填'],
      thresholds: { watch: 0.15, warning: 0.25, critical: 0.35 },
      anomalyRule: '若某次大版本主动引入多个新字段，首周兜底占比会自然升高，需要拆分“字段新增导致的正常回填”和“迁移逻辑缺失导致的异常回填”。'
    },
    {
      id: 'ws12_gray_toggle_drift_ratio',
      label: '灰度开关漂移率',
      description: '防止 data、store、页面与运维配置中的开关状态不同步，导致玩家看到入口但无法结算或反之。',
      formula: '近7天 feature flag / tuning config / 页面入口状态不一致的次数 ÷ 近7天灰度相关校验总次数',
      direction: 'higher_is_worse',
      dataSources: ['各 WS tuning config.featureFlags', 'useTutorialStore / useGoalStore / useQuestStore overview', '发布检查清单'],
      thresholds: { watch: 0.05, warning: 0.1, critical: 0.2 },
      anomalyRule: '若漂移只出现在开发态实验开关，不应与正式发布开关混算；正式服开关必须单独监控。'
    }
  ],
  playerSegments: [
    {
      id: 'ws12_segment_old_save_returnee',
      label: '旧档回流玩家',
      description: '长时间未登录后直接读入旧档、最依赖迁移与兼容性保护的玩家。',
      disposableMoneyMin: 20000,
      inflationPressureMin: 0.1,
      recommendedFocus: '优先观察坏档率、旧档迁移兜底占比与灰度开关漂移率，确保回流玩家能安全进入最新版本。'
    },
    {
      id: 'ws12_segment_endgame_operator',
      label: '后期重度经营玩家',
      description: '频繁触发订单、加工、维护费、周结与多系统奖励链路的重度玩家。',
      disposableMoneyMin: 80000,
      inflationPressureMin: 0.22,
      recommendedFocus: '重点观察回滚触发率、任务结算错误率与周结日志是否稳定，避免高频链路把历史边界放大。'
    },
    {
      id: 'ws12_segment_release_watch',
      label: '版本观察样本玩家',
      description: '用于发布后首周持续跟踪热修与补偿触发情况的核心样本。',
      disposableMoneyMin: 120000,
      inflationPressureMin: 0.3,
      recommendedFocus: '重点跟踪发布后热修次数、补偿触发与灰度开关漂移，验证版本是否具备稳定上线条件。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws12_global_stability_soft_rollback',
      label: '全局稳定性软回滚',
      condition: '连续2个观察周内 ws12_save_corruption_rate >= 0.03，且 ws12_settlement_error_rate >= 0.04 或 ws12_gray_toggle_drift_ratio >= 0.1',
      fallbackAction: '暂停继续扩展新的后期功能开关，回退到最近稳定的 feature flag / tuning config 组合；仅保留读档、基础结算和必要补偿入口，并优先修正迁移、容量预检与结算回执链路。'
    }
  ],
  linkedSystems: ['system', 'quest', 'villageProject'],
  linkedSystemRefs: [
    {
      system: 'system',
      storeId: 'useSaveStore',
      touchpoints: ['parseSaveData', 'loadFromSlot', 'importSave', 'exportSave', 'setStorageMode'],
      rationale: '存档读取、模式切换与导入导出是坏档率、灰度漂移和回滚恢复的第一观测点。'
    },
    {
      system: 'system',
      storeId: 'usePlayerStore',
      touchpoints: ['economyTelemetry', 'getEconomyOverview', 'setEconomyRiskReport'],
      rationale: '玩家运行态观测与风险报告为发布后热修和异常样本分层提供统一入口。'
    },
    {
      system: 'system',
      storeId: 'useInventoryStore',
      touchpoints: ['canAddItems', 'addItemsExact', 'removeItem'],
      rationale: '几乎所有奖励发放、回滚与容量预检都依赖背包真实写入边界。'
    },
    {
      system: 'system',
      storeId: 'useMiningStore',
      touchpoints: ['leaveMine', 'battleRewards', 'exploration state reset'],
      rationale: '矿洞战利品与失败退出是事务边界、回滚恢复和日结兼容的高风险样本。'
    },
    {
      system: 'system',
      storeId: 'useProcessingStore',
      touchpoints: ['crafting queue', 'collectOutput', 'serialize / deserialize'],
      rationale: '加工链能集中暴露容量预检、重复领取与旧档兼容问题。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['submitQuest', 'special order settlement', 'specialOrderSettlementReceipts'],
      rationale: '订单结算与重复领奖保护是任务结算错误率的核心来源。'
    },
    {
      system: 'villageProject',
      storeId: 'useVillageProjectStore',
      touchpoints: ['donateToProject', 'startProjectMaintenance', 'maintenanceStates'],
      rationale: '建设捐献与维护费链路能验证跨周结算、补偿与回滚口径是否一致。'
    }
  ]
}

export const WS12_QA_GOVERNANCE_FEATURE_FLAGS: QaGovernanceFeatureFlags = {
  saveMigrationGuardEnabled: true,
  transactionalSettlementGuardEnabled: true,
  automatedRegressionEnabled: true,
  compensationMailEnabled: true,
  grayReleaseEnabled: true
}

export const WS12_SAVE_MIGRATION_PROFILES: QaGovernanceMigrationProfileDef[] = [
  {
    id: 'ws12_profile_live_stable',
    label: '正式稳定迁移',
    targetSaveVersion: 4,
    rollbackOnFailure: true,
    compatibilityScope: ['player.economyTelemetry', 'tutorial.guidanceDigestState', 'guild.seasonState']
  },
  {
    id: 'ws12_profile_canary',
    label: '灰度观察迁移',
    targetSaveVersion: 4,
    rollbackOnFailure: true,
    compatibilityScope: ['quest.activityQuestWindowState', 'hanhai.cycleState', 'museum.saveVersion']
  }
]

export const WS12_TRANSACTION_GUARD_DEFS: QaGovernanceTransactionGuardDef[] = [
  {
    id: 'ws12_guard_reward_delivery',
    label: '奖励发放守护',
    linkedStoreIds: ['useInventoryStore', 'useQuestStore', 'useVillageProjectStore'],
    requiresInventoryPrecheck: true,
    requiresSettlementReceipt: true
  },
  {
    id: 'ws12_guard_daily_weekly_settlement',
    label: '日结 / 周结守护',
    linkedStoreIds: ['useEndDay', 'usePlayerStore', 'useSaveStore'],
    requiresInventoryPrecheck: false,
    requiresSettlementReceipt: true
  },
  {
    id: 'ws12_guard_save_import_export',
    label: '读档导档守护',
    linkedStoreIds: ['useSaveStore', 'usePlayerStore'],
    requiresInventoryPrecheck: false,
    requiresSettlementReceipt: false
  }
]

export const WS12_AUTOMATED_REGRESSION_SUITES: QaGovernanceRegressionSuiteDef[] = [
  {
    id: 'ws12_regression_daily_settlement',
    label: '日结结算回归',
    cadence: 'daily',
    focusAreas: ['日结奖励发放', '容量预检', '事务回滚']
  },
  {
    id: 'ws12_regression_weekly_cycles',
    label: '周切换循环回归',
    cadence: 'weekly',
    focusAreas: ['主题周切换', '活动窗口', 'weekly loop 日志', '预算与维护费']
  },
  {
    id: 'ws12_regression_release_gate',
    label: '上线闸门回归',
    cadence: 'release',
    focusAreas: ['旧档迁移', '灰度开关漂移', '补偿邮件预置', '关键页面入口']
  }
]

export const WS12_COMPENSATION_MAIL_PRESETS: QaGovernanceCompensationMailPreset[] = [
  {
    id: 'ws12_mail_save_recovery',
    label: '存档恢复说明',
    trigger: '坏档恢复或回退到稳定版本后需要向玩家说明影响范围',
    linkedSystems: ['system']
  },
  {
    id: 'ws12_mail_settlement_compensation',
    label: '结算补偿说明',
    trigger: '任务、订单、加工或建设奖励在事务回滚后需要发放兜底说明',
    linkedSystems: ['quest', 'villageProject', 'system']
  }
]

export const createDefaultQaGovernanceRuntimeState = (): QaGovernanceRuntimeState => ({
  version: 1,
  activeMigrationProfileId: WS12_SAVE_MIGRATION_PROFILES[0]?.id ?? 'ws12_profile_live_stable',
  activeGrayReleaseChannel: 'stable',
  rollbackTriggerCount: 0,
  postReleaseHotfixCount: 0,
  completedRegressionSuiteIds: [],
  claimedCompensationMailIds: [],
  lastCompatibilityAuditDayTag: ''
})

export const WS12_QA_GOVERNANCE_CONTENT_TIERS = [
  {
    id: 'mid_transition',
    label: '中期过渡治理包',
    summary: '先确保读档、导档、日结和基础订单结算不会写坏档或吞奖励。',
    priceBand: {
      money: [0, 2000],
      timeMinutes: [5, 15],
      rolloutScope: ['stable']
    },
    outputBand: {
      auditedChains: ['save import/export', 'daily settlement', 'basic quest delivery'],
      regressionSuites: ['ws12_regression_daily_settlement'],
      compensationReach: '单链路补偿说明'
    },
    consumptionBand: {
      manualChecks: [2, 4],
      receiptRetentionDays: [7, 14],
      rollbackBudgetPerWeek: [1, 1]
    }
  },
  {
    id: 'late_growth',
    label: '后期进阶治理包',
    summary: '覆盖主题周、活动窗口、维护费与多系统奖励发放，降低跨周切换的边界风险。',
    priceBand: {
      money: [2000, 8000],
      timeMinutes: [15, 40],
      rolloutScope: ['stable', 'canary']
    },
    outputBand: {
      auditedChains: ['weekly cycles', 'activity window', 'maintenance settlement', 'special order settlement'],
      regressionSuites: ['ws12_regression_daily_settlement', 'ws12_regression_weekly_cycles'],
      compensationReach: '多链路补偿说明'
    },
    consumptionBand: {
      manualChecks: [4, 8],
      receiptRetentionDays: [14, 30],
      rollbackBudgetPerWeek: [1, 2]
    }
  },
  {
    id: 'endgame_showcase',
    label: '终局展示治理包',
    summary: '为上线周灰度、热修、补偿与旧档回流提供完整治理兜底，形成真正可发布的稳定版本。',
    priceBand: {
      money: [8000, 20000],
      timeMinutes: [40, 90],
      rolloutScope: ['canary', 'stable']
    },
    outputBand: {
      auditedChains: ['release gate', 'gray release drift', 'post-release compensation', 'old save migration'],
      regressionSuites: ['ws12_regression_daily_settlement', 'ws12_regression_weekly_cycles', 'ws12_regression_release_gate'],
      compensationReach: '全链路补偿与公告'
    },
    consumptionBand: {
      manualChecks: [8, 12],
      receiptRetentionDays: [30, 60],
      rollbackBudgetPerWeek: [2, 3]
    }
  }
] as const

export const WS12_QA_GOVERNANCE_LOOP_LINK_DEFS = [
  {
    id: 'ws12_loop_income_to_consumption',
    label: '收入转消耗',
    source: 'player_income',
    target: 'village_maintenance',
    summaryTemplate: '近7天净收入稳定后，优先承接维护费与建设捐献，避免盈余只留在账上。'
  },
  {
    id: 'ws12_loop_growth_to_order',
    label: '成长转订单',
    source: 'processing_growth',
    target: 'quest_settlement',
    summaryTemplate: '工坊扩建与加工产能提升后，优先拿去承接高价值委托和特殊订单。'
  },
  {
    id: 'ws12_loop_display_to_reputation',
    label: '展示转声望',
    source: 'museum_display',
    target: 'goal_reputation',
    summaryTemplate: '当展陈评分和馆务运转稳定后，优先回看目标声望与长期规划收益。'
  },
  {
    id: 'ws12_loop_activity_to_reward',
    label: '活动转奖励',
    source: 'event_window',
    target: 'reward_delivery',
    summaryTemplate: '活动窗口开启时，优先核对奖励回执、补偿邮件和领取状态，避免收益链断档。'
  }
] as const

export const WS12_QA_GOVERNANCE_TUNING_CONFIG = {
  featureFlags: WS12_QA_GOVERNANCE_FEATURE_FLAGS,
  display: {
    maxCrossSystemLoopCount: 3,
    maxQuestGovernanceContentCount: 2,
    maxProjectGovernanceContentCount: 2
  },
  operations: {
    autoMarkDailyRegressionEnabled: true,
    autoMarkWeeklyRegressionEnabled: true,
    releaseGateQuickActionEnabled: true,
    storageModeQuickSwitchEnabled: true
  }
} as const

export const WS12_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '所有治理层状态必须复用统一的 store overview / debug snapshot，不能重新散落到页面或零散 util。',
    '读档、导档、灰度通道、回归套件、补偿邮件与事务回滚必须具备幂等、防重入与旧档兼容保护。',
    '治理页面入口必须能解释当前风险、巡检节奏、花费拆解与收益预览，避免“只知道有风险、不知道怎么做”。',
    '每周巡检日志、跨系统治理 loop 与发布闸门状态必须可追踪，确保发布后热修与补偿有统一证据链。'
  ],
  releaseAnnouncement: [
    '【QA治理】后期页面现已接入统一治理面板，可直接查看存档模式、灰度通道、回滚/热修累计与本周巡检重点。',
    '【稳定性】读档、灰度、回归套件、补偿邮件与事务回滚已统一纳入 WS12 治理底座，后续版本可沿用同一套口径扩展。',
    '【发布保障】治理层现已具备内容 tiers、跨系统 weekly loop、事务锁、热调参数与上线闸门常量，便于持续迭代。'
  ]
} as const

export const WS12_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws12-positive-governance-panel',
    title: '后期页面可展示统一 QA 治理面板',
    category: 'positive',
    steps: ['打开 Wallet / Quest / Shop / Guild 等后期页面', '检查 QA 治理面板的摘要、成本、收益与风险说明'],
    expectedResult: '页面顶部可直接看到治理状态、巡检节奏与一键治理操作。'
  },
  {
    id: 'ws12-positive-regression-auto-mark',
    title: '日结 / 周结可自动记录治理回归套件',
    category: 'positive',
    steps: ['推进一天并跨周', '检查 `completedRegressionSuiteIds` 与治理巡检日志'],
    expectedResult: 'daily / weekly 套件按节奏自动写入，日志口径与 runtime state 一致。'
  },
  {
    id: 'ws12-positive-gray-channel-switch',
    title: '灰度通道切换可在页面内安全执行',
    category: 'positive',
    steps: ['在治理面板点击“切到稳定 / 切到灰度”', '检查 `activeGrayReleaseChannel`'],
    expectedResult: '灰度通道切换成功，且不影响其他运行态状态。'
  },
  {
    id: 'ws12-boundary-storage-mode-switch',
    title: '治理存档模式切换不会打乱当前 slot 状态',
    category: 'boundary',
    steps: ['通过治理入口切换本地 / 云端存档模式', '检查 activeSlot / activeSlotMode'],
    expectedResult: '存档模式切换成功，slot 引用保持可解释，不出现空引用或误写入。'
  },
  {
    id: 'ws12-negative-governance-action-reentry',
    title: '重复点击治理操作不会造成状态重入',
    category: 'negative',
    steps: ['连续点击灰度切换、发布闸门记录或治理重置', '检查 action locks 与 runtime state'],
    expectedResult: '重复操作被锁与幂等保护拦住，不会出现治理状态膨胀或锁残留。'
  },
  {
    id: 'ws12-compatibility-old-save-governance',
    title: '旧档缺少治理 runtime 字段时可安全回填',
    category: 'compatibility',
    steps: ['读取不包含 `qaGovernanceRuntimeState` 的旧档', '检查 overview / debug snapshot / 页面治理面板'],
    expectedResult: '旧档安全回填默认运行态，治理面板与治理 API 不报错。'
  },
  {
    id: 'ws12-recovery-storage-rollback',
    title: '存档治理操作异常时可回滚到前一状态',
    category: 'recovery',
    steps: ['模拟治理存档模式切换异常', '检查 storage snapshot 与锁释放'],
    expectedResult: '存档治理状态回滚到操作前，且无残留 lock。'
  },
  {
    id: 'ws12-ops-tuning-config',
    title: '治理 tuning config 可安全控制自动回归与快捷操作',
    category: 'ops',
    steps: ['调整 `WS12_QA_GOVERNANCE_TUNING_CONFIG` 的 autoMark / releaseGate 开关', '刷新页面并推进日结'],
    expectedResult: '自动回归记录、发布闸门快捷操作与页面展示按配置生效。'
  }
]

export const WS12_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws12-check-overview-apis', label: '确认 player/save 两侧治理 overview 与 debug snapshot 输出一致', owner: 'dev', done: false },
  { id: 'ws12-check-page-panels', label: '确认后期页面都能展示治理面板与巡检节奏', owner: 'qa', done: false },
  { id: 'ws12-check-regression-cadence', label: '确认 daily / weekly / release 套件与周巡检日志节奏一致', owner: 'qa', done: false },
  { id: 'ws12-check-gray-switch', label: '确认灰度通道、存档模式快捷操作与 tuning config 开关安全可控', owner: 'ops', done: false },
  { id: 'ws12-check-old-save', label: '确认旧档治理 runtime 字段与内容 tiers 能安全回填', owner: 'qa', done: false }
]

export const WS12_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws12-compensate-save-governance-mismatch',
    trigger: '存档治理状态错位，导致玩家错误进入灰度通道或读取到错误治理提示。',
    action: '回调治理通道到 stable，回退治理 runtime state 到最近稳定快照。',
    compensation: ['通过治理说明邮件告知玩家，本次问题仅影响治理展示与巡检状态，不回收实际收益。']
  },
  {
    id: 'ws12-compensate-regression-gap',
    trigger: '自动回归套件未按节奏记录，导致发布后缺少巡检证据链。',
    action: '手动补记 release gate 套件并补发治理说明邮件，必要时暂停灰度。'
  },
  {
    id: 'ws12-compensate-rollback-overflow',
    trigger: '回滚触发次数或热修次数异常升高，达到软回滚条件。',
    action: '停用 canary 通道，缩减 weekly loop 和快捷操作，回退到最近稳定配置组合。'
  }
]

export const WS12_RELEASE_ANNOUNCEMENT = [
  '【QA治理】后期页面现已接入统一治理面板，可直接查看存档模式、灰度通道、回滚/热修累计与本周巡检重点。',
  '【稳定性】读档、灰度、回归套件、补偿邮件与事务回滚已统一纳入 WS12 治理底座，后续版本可沿用同一套口径扩展。',
  '【发布保障】治理层现已具备内容 tiers、跨系统 weekly loop、事务锁、热调参数与上线闸门常量，便于持续迭代。'
] as const

export const THEME_WEEK_DEFS: ThemeWeekDef[] = [
  {
    id: 'spring_sowing',
    name: '春种主题周',
    description: '集中鼓励播种、收获与基础经营。',
    season: 'spring',
    weekOfSeason: 1,
    recommendedCatalogTags: ['功能商品', '灌溉'],
    focusMetrics: ['totalCropsHarvested', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_artisan_daily', 'gap_cashflow'],
    preferredQuestThemeTag: 'breeding',
    museumFocusHallZoneIds: ['entry_gallery', 'mineral_hall'],
    museumFocusThemeIds: ['ancestral_echo'],
    museumFocusScholarCommissionIds: ['mineral_catalogue_revision'],
    guildFocusActivityIds: ['commission_supply_week'],
    guildFocusMilestoneIds: ['guild_supply_chain'],
    guildFocusRewardPoolIds: ['commission_preparation_pool'],
    hanhaiFocusRouteIds: ['westbound_silk_route'],
    hanhaiFocusRelicSiteIds: ['sunset_ruins'],
    hanhaiFocusBossCycleIds: ['dune_revenant'],
    hanhaiFocusContractIds: ['contract_silk_relay'],
    hanhaiFocusRelicSetIds: ['merchant_ledger_set'],
    hanhaiFocusShopRotationIds: ['rotation_frontier_supplies'],
    regionFocusRegionIds: ['ancient_road'],
    regionFocusRouteIds: ['ancient_road_supply_relay', 'ancient_road_archive_recovery'],
    regionFocusBossIds: ['ancient_road_overseer'],
    regionFocusResourceFamilies: ['ancient_archive'],
    familyFocusNpcIds: ['liu_niang', 'chun_lan'],
    familyFocusWishIds: ['wish_shared_breakfast'],
    familyFocusSpiritIds: ['tao_yao'],
    familyFocusZhijiProjectIds: ['zhiji_story_salon'],
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
    weekOfSeason: 2,
    recommendedCatalogTags: ['渔具', '鱼塘'],
    focusMetrics: ['totalFishCaught', 'discoveredCount'],
    relatedBiasRules: ['bias_wander_daily'],
    preferredQuestThemeTag: 'breeding',
    guildFocusActivityIds: ['border_patrol_rotation'],
    guildFocusMilestoneIds: ['guild_patrol_wall'],
    guildFocusRewardPoolIds: ['commission_preparation_pool'],
    hanhaiFocusRouteIds: ['turquoise_exchange_route'],
    hanhaiFocusRelicSiteIds: ['turquoise_pit'],
    hanhaiFocusBossCycleIds: ['glass_scorpion'],
    hanhaiFocusContractIds: ['contract_turquoise_exchange'],
    hanhaiFocusRelicSetIds: ['merchant_ledger_set'],
    hanhaiFocusShopRotationIds: ['rotation_trade_house'],
    familyFocusNpcIds: ['qiu_yue', 'da_niu'],
    familyFocusWishIds: ['wish_lakeside_outing'],
    familyFocusSpiritIds: ['yue_tu'],
    familyFocusZhijiProjectIds: ['zhiji_story_salon'],
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
    weekOfSeason: 3,
    recommendedCatalogTags: ['材料包', '功能商品'],
    focusMetrics: ['totalMoneyEarned', 'totalRecipesCooked'],
    relatedBiasRules: ['bias_cashflow_daily', 'bias_artisan_daily', 'gap_cooking'],
    preferredQuestThemeTag: 'breeding',
    museumFocusHallZoneIds: ['artifact_hall', 'fossil_hall'],
    museumFocusThemeIds: ['ancestral_echo'],
    museumFocusScholarCommissionIds: ['fossil_restoration_notes'],
    guildFocusActivityIds: ['ranked_hunt_board'],
    guildFocusMilestoneIds: ['guild_ranked_hunt_banner'],
    guildFocusRewardPoolIds: ['ranked_hunt_pool'],
    hanhaiFocusRouteIds: ['turquoise_exchange_route'],
    hanhaiFocusRelicSiteIds: ['turquoise_pit', 'moon_sand_shrine'],
    hanhaiFocusBossCycleIds: ['glass_scorpion', 'sunken_colossus'],
    hanhaiFocusContractIds: ['contract_turquoise_exchange'],
    hanhaiFocusRelicSetIds: ['merchant_ledger_set', 'desert_ritual_set'],
    hanhaiFocusShopRotationIds: ['rotation_trade_house'],
    familyFocusNpcIds: ['a_shi', 'chun_lan', 'mo_bai'],
    familyFocusWishIds: ['wish_legacy_archive'],
    familyFocusSpiritIds: ['gui_nv'],
    familyFocusZhijiProjectIds: ['zhiji_household_archive'],
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
    weekOfSeason: 4,
    recommendedCatalogTags: ['矿洞', '每周精选'],
    focusMetrics: ['highestMineFloor', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_artisan_daily', 'gap_mining'],
    preferredQuestThemeTag: 'breeding',
    museumFocusHallZoneIds: ['mineral_hall', 'fossil_hall'],
    museumFocusThemeIds: ['moon_prayer'],
    museumFocusScholarCommissionIds: ['mineral_catalogue_revision'],
    guildFocusActivityIds: ['abyss_boss_campaign'],
    guildFocusMilestoneIds: ['guild_world_bulwark'],
    guildFocusRewardPoolIds: ['world_milestone_pool'],
    regionFocusRegionIds: ['cloud_highland'],
    regionFocusRouteIds: ['cloud_highland_patrol', 'cloud_highland_ley_crack'],
    regionFocusBossIds: ['cloud_highland_warden'],
    regionFocusResourceFamilies: ['ley_crystal'],
    hanhaiFocusRouteIds: ['moon_sand_ceremony_route'],
    hanhaiFocusRelicSiteIds: ['moon_sand_shrine'],
    hanhaiFocusBossCycleIds: ['sunken_colossus', 'sandstorm_wyrm'],
    hanhaiFocusContractIds: ['contract_moon_sand_patronage'],
    hanhaiFocusRelicSetIds: ['desert_ritual_set', 'sun_moon_trade_set'],
    hanhaiFocusShopRotationIds: ['rotation_endgame_patron'],
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
    weekOfSeason: 4,
    recommendedCatalogTags: ['功能商品', '材料包', '每周精选'],
    focusMetrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_cashflow', 'gap_social'],
    preferredQuestThemeTag: 'breeding',
    museumFocusHallZoneIds: ['artifact_hall', 'shrine_courtyard'],
    museumFocusThemeIds: ['moon_prayer', 'fox_blessing'],
    museumFocusScholarCommissionIds: ['ancestral_relic_field_report'],
    guildFocusActivityIds: ['elite_logistics_auction', 'world_milestone_fortress'],
    guildFocusMilestoneIds: ['guild_legend_hall'],
    guildFocusRewardPoolIds: ['world_milestone_pool'],
    hanhaiFocusRouteIds: ['moon_sand_ceremony_route'],
    hanhaiFocusRelicSiteIds: ['moon_sand_shrine'],
    hanhaiFocusBossCycleIds: ['sandstorm_wyrm'],
    hanhaiFocusContractIds: ['contract_moon_sand_patronage'],
    hanhaiFocusRelicSetIds: ['sun_moon_trade_set'],
    hanhaiFocusShopRotationIds: ['rotation_endgame_patron'],
    regionFocusRegionIds: ['ancient_road', 'cloud_highland'],
    regionFocusRouteIds: ['ancient_road_archive_recovery', 'cloud_highland_ley_crack'],
    regionFocusBossIds: ['ancient_road_overseer', 'cloud_highland_warden'],
    regionFocusResourceFamilies: ['ancient_archive', 'ley_crystal'],
    familyFocusNpcIds: ['a_shi', 'chun_lan', 'mo_bai'],
    familyFocusWishIds: ['wish_legacy_archive'],
    familyFocusSpiritIds: ['shan_weng', 'long_ling'],
    familyFocusZhijiProjectIds: ['zhiji_legacy_route'],
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
  },
  {
    id: 'spring_market',
    name: '春集商路周',
    description: '强调周转、供货与人情往来，让春季第二周进入稳定经营节奏。',
    season: 'spring',
    weekOfSeason: 2,
    recommendedCatalogTags: ['每周精选', '功能商品'],
    focusMetrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_social'],
    preferredQuestThemeTag: 'fishpond',
    guildFocusActivityIds: ['commission_supply_week'],
    hanhaiFocusRouteIds: ['westbound_silk_route'],
    breedingFocusLabel: '春集供货单',
    breedingFocusDescription: '优先准备稳定出货的基础杂交作物，承接商路与乡镇补给订单。',
    breedingFocusHybridIds: ['emerald_radish', 'moonlight_rice'],
    rewardPreview: {
      label: '春集周推荐',
      description: '商路补给、仓储与流转效率更值得提前投入。',
      recommendedOfferIds: ['weekly_inventory_bag', 'premium_warehouse_charter']
    },
    ui: {
      badgeText: '春集',
      summaryLabel: '本周重点：周转、供货与关系经营',
      bannerTone: 'accent'
    }
  },
  {
    id: 'spring_scholar',
    name: '春研布展周',
    description: '把采集、料理与布展串起来，为后续主题展和订单提供准备。',
    season: 'spring',
    weekOfSeason: 3,
    recommendedCatalogTags: ['材料包', '学舍'],
    focusMetrics: ['discoveredCount', 'totalRecipesCooked'],
    relatedBiasRules: ['bias_wander_daily', 'gap_cooking'],
    museumFocusHallZoneIds: ['entry_gallery', 'artifact_hall'],
    museumFocusThemeIds: ['ancestral_echo'],
    museumFocusScholarCommissionIds: ['ancestral_relic_field_report'],
    guildFocusActivityIds: ['ranked_hunt_board'],
    hanhaiFocusRelicSiteIds: ['sunset_ruins'],
    regionFocusRegionIds: ['mirage_marsh'],
    regionFocusRouteIds: ['mirage_marsh_night_watch', 'mirage_marsh_specimen_drive'],
    regionFocusBossIds: ['mirage_marsh_devourer'],
    regionFocusResourceFamilies: ['ecology_specimen'],
    ui: {
      badgeText: '春研',
      summaryLabel: '本周重点：采集见闻与布展筹备',
      bannerTone: 'accent'
    }
  },
  {
    id: 'spring_pond_awakening',
    name: '春塘苏醒周',
    description: '强调鱼塘苏醒、观赏准备与配套补给，给鱼塘线一个明确的周入口。',
    season: 'spring',
    weekOfSeason: 4,
    recommendedCatalogTags: ['鱼塘', '渔具'],
    focusMetrics: ['totalFishCaught', 'friendlyNpcCount'],
    relatedBiasRules: ['bias_wander_daily', 'gap_social'],
    preferredQuestThemeTag: 'fishpond',
    guildFocusActivityIds: ['border_patrol_rotation'],
    hanhaiFocusContractIds: ['contract_turquoise_exchange'],
    rewardPreview: {
      label: '春塘养护推荐',
      description: '鱼塘养护、活体展示与外出补给收益更高。',
      recommendedOfferIds: ['func_angler_pack', 'weekly_pond_care_pack']
    },
    ui: {
      badgeText: '春塘',
      summaryLabel: '本周重点：鱼塘苏醒与观赏准备',
      bannerTone: 'success'
    }
  },
  {
    id: 'summer_supply',
    name: '盛夏供货周',
    description: '高产、快周转与宴席前置备货是盛夏第一周的经营主线。',
    season: 'summer',
    weekOfSeason: 1,
    recommendedCatalogTags: ['功能商品', '每周精选'],
    focusMetrics: ['totalCropsHarvested', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_cashflow'],
    preferredQuestThemeTag: 'breeding',
    guildFocusActivityIds: ['commission_supply_week'],
    hanhaiFocusRouteIds: ['turquoise_exchange_route'],
    breedingFocusLabel: '盛夏量产单',
    breedingFocusDescription: '优先准备高产、高稳定性的供货型杂交作物，为后续高价单预热。',
    breedingFocusHybridIds: ['moonlight_rice', 'golden_melon'],
    rewardPreview: {
      label: '盛夏供货推荐',
      description: '更适合提前投入仓储、灌溉与批量供货辅助。',
      recommendedOfferIds: ['func_field_irrigation_pack', 'premium_warehouse_charter']
    },
    ui: {
      badgeText: '供货',
      summaryLabel: '本周重点：高产供货与现金周转',
      bannerTone: 'success'
    }
  },
  {
    id: 'summer_caravan',
    name: '夏行商路周',
    description: '强调探索见闻、商路试投与移动补给，是夏季中盘的转换周。',
    season: 'summer',
    weekOfSeason: 3,
    recommendedCatalogTags: ['每周精选', '学舍'],
    focusMetrics: ['discoveredCount', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_cashflow_daily', 'bias_wander_daily'],
    preferredQuestThemeTag: 'breeding',
    guildFocusActivityIds: ['elite_logistics_auction'],
    hanhaiFocusRouteIds: ['turquoise_exchange_route'],
    hanhaiFocusContractIds: ['contract_turquoise_exchange'],
    regionFocusRegionIds: ['ancient_road'],
    regionFocusRouteIds: ['ancient_road_supply_relay', 'ancient_road_archive_recovery'],
    regionFocusBossIds: ['ancient_road_overseer'],
    regionFocusResourceFamilies: ['ancient_archive'],
    breedingFocusLabel: '夏行补给单',
    breedingFocusDescription: '更适合承接兼顾供货与远行补给的杂交作物订单。',
    breedingFocusHybridIds: ['honey_peach_melon', 'moonlight_rice'],
    ui: {
      badgeText: '夏行',
      summaryLabel: '本周重点：商路试投与移动补给',
      bannerTone: 'accent'
    }
  },
  {
    id: 'summer_pond_showcase',
    name: '夏夜观赏周',
    description: '强化观赏鱼、宴席配套与夜间展示，让鱼塘线和展示线形成联动。',
    season: 'summer',
    weekOfSeason: 4,
    recommendedCatalogTags: ['鱼塘', '材料包'],
    focusMetrics: ['totalFishCaught', 'totalRecipesCooked'],
    relatedBiasRules: ['bias_artisan_daily', 'bias_wander_daily'],
    preferredQuestThemeTag: 'fishpond',
    museumFocusHallZoneIds: ['shrine_courtyard', 'artifact_hall'],
    guildFocusActivityIds: ['elite_logistics_auction'],
    rewardPreview: {
      label: '夏夜展示推荐',
      description: '更适合把鱼塘活体展示和宴席配套备货一起推进。',
      recommendedOfferIds: ['weekly_pond_care_pack', 'autumn_harvest_pack']
    },
    ui: {
      badgeText: '夏夜',
      summaryLabel: '本周重点：观赏鱼与宴席展示',
      bannerTone: 'warning'
    }
  },
  {
    id: 'autumn_exhibition',
    name: '秋展筹备周',
    description: '先把见闻、关系和布展打通，为秋季高价值展示与邮件结算做准备。',
    season: 'autumn',
    weekOfSeason: 1,
    recommendedCatalogTags: ['学舍', '材料包'],
    focusMetrics: ['discoveredCount', 'friendlyNpcCount'],
    relatedBiasRules: ['gap_social', 'bias_wander_daily'],
    museumFocusHallZoneIds: ['artifact_hall', 'shrine_courtyard'],
    museumFocusThemeIds: ['fox_blessing'],
    museumFocusScholarCommissionIds: ['ancestral_relic_field_report'],
    ui: {
      badgeText: '秋展',
      summaryLabel: '本周重点：见闻收集与布展筹备',
      bannerTone: 'accent'
    }
  },
  {
    id: 'autumn_harvest',
    name: '秋收统筹周',
    description: '强化丰收、加工前置和批量兑现，让秋季前半段更像经营冲刺周。',
    season: 'autumn',
    weekOfSeason: 2,
    recommendedCatalogTags: ['功能商品', '材料包'],
    focusMetrics: ['totalCropsHarvested', 'totalMoneyEarned'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_cashflow'],
    preferredQuestThemeTag: 'breeding',
    guildFocusActivityIds: ['ranked_hunt_board'],
    hanhaiFocusRouteIds: ['turquoise_exchange_route'],
    breedingFocusLabel: '秋收预备单',
    breedingFocusDescription: '优先储备高甜度、可加工与可展示的丰收型杂交作物。',
    breedingFocusHybridIds: ['jade_tea', 'golden_melon'],
    ui: {
      badgeText: '秋收',
      summaryLabel: '本周重点：丰收统筹与变现预热',
      bannerTone: 'success'
    }
  },
  {
    id: 'winter_storage',
    name: '冬储经营周',
    description: '强调囤货、料理与冷季现金回流，是冬季第一周的稳态经营入口。',
    season: 'winter',
    weekOfSeason: 1,
    recommendedCatalogTags: ['材料包', '每周精选'],
    focusMetrics: ['totalMoneyEarned', 'totalRecipesCooked'],
    relatedBiasRules: ['bias_cashflow_daily', 'gap_cooking'],
    preferredQuestThemeTag: 'breeding',
    breedingFocusLabel: '冬储补给单',
    breedingFocusDescription: '更适合准备耐储、耐寒且可转成料理与补给的杂交作物。',
    breedingFocusHybridIds: ['frost_garlic', 'moonlight_rice'],
    ui: {
      badgeText: '冬储',
      summaryLabel: '本周重点：囤货、料理与现金回流',
      bannerTone: 'accent'
    }
  },
  {
    id: 'winter_scholar',
    name: '冬研考据周',
    description: '把矿洞推进、古物见闻和研究布展压到同一周，形成冬季中盘深挖节奏。',
    season: 'winter',
    weekOfSeason: 2,
    recommendedCatalogTags: ['学舍', '矿洞'],
    focusMetrics: ['highestMineFloor', 'discoveredCount'],
    relatedBiasRules: ['gap_mining', 'bias_wander_daily'],
    museumFocusHallZoneIds: ['mineral_hall', 'fossil_hall'],
    museumFocusThemeIds: ['moon_prayer'],
    museumFocusScholarCommissionIds: ['mineral_catalogue_revision'],
    hanhaiFocusRelicSiteIds: ['moon_sand_shrine'],
    ui: {
      badgeText: '冬研',
      summaryLabel: '本周重点：矿洞深挖与研究考据',
      bannerTone: 'accent'
    }
  },
  {
    id: 'winter_pond_maintenance',
    name: '寒塘养护周',
    description: '鱼塘线在冬季不再断档，围绕养护、成熟样本和关系经营给出明确节奏。',
    season: 'winter',
    weekOfSeason: 3,
    recommendedCatalogTags: ['鱼塘', '功能商品'],
    focusMetrics: ['totalFishCaught', 'friendlyNpcCount'],
    relatedBiasRules: ['gap_social', 'bias_wander_daily'],
    preferredQuestThemeTag: 'fishpond',
    guildFocusActivityIds: ['border_patrol_rotation'],
    rewardPreview: {
      label: '寒塘养护推荐',
      description: '适合先做鱼塘健康维护，再承接活体展示和研究样本单。',
      recommendedOfferIds: ['weekly_pond_care_pack', 'func_angler_pack']
    },
    ui: {
      badgeText: '寒塘',
      summaryLabel: '本周重点：鱼塘养护与活体样本',
      bannerTone: 'accent'
    }
  }
]

const THEME_WEEK_BASE_REWARD_POOLS: Record<'spring' | 'summer' | 'autumn' | 'winter', ThemeWeekRewardPoolEntry[]> = {
  spring: [
    {
      id: 'season_any',
      label: '春耕起步奖',
      description: '完成任一周目标时，给予基础经营补给。',
      threshold: 'any',
      bonusReward: { money: 180, items: [{ itemId: 'herb', quantity: 2 }] }
    },
    {
      id: 'season_majority',
      label: '春耕连作奖',
      description: '完成多数周目标时，追加基础建设型奖励。',
      threshold: 'majority',
      bonusReward: { money: 260, reputation: 4, items: [{ itemId: 'bamboo', quantity: 2 }] }
    },
    {
      id: 'season_full',
      label: '春耕满贯奖',
      description: '全部周目标完成时，发放更完整的春耕周奖励。',
      threshold: 'full',
      bonusReward: { money: 360, reputation: 6, items: [{ itemId: 'quality_fertilizer', quantity: 1 }] }
    }
  ],
  summer: [
    {
      id: 'season_any',
      label: '夏行补给奖',
      description: '完成任一周目标时，给予外出与鱼塘补给。',
      threshold: 'any',
      bonusReward: { money: 200, items: [{ itemId: 'wild_bait', quantity: 3 }] }
    },
    {
      id: 'season_majority',
      label: '夏行承接奖',
      description: '完成多数周目标时，追加商路与鱼塘经营奖励。',
      threshold: 'majority',
      bonusReward: { money: 300, reputation: 4, items: [{ itemId: 'fish_feed', quantity: 2 }] }
    },
    {
      id: 'season_full',
      label: '夏行满贯奖',
      description: '全部周目标完成时，发放夏行主题完整承接奖励。',
      threshold: 'full',
      bonusReward: { money: 420, reputation: 6, items: [{ itemId: 'bait_maker', quantity: 1 }] }
    }
  ],
  autumn: [
    {
      id: 'season_any',
      label: '秋收回流奖',
      description: '完成任一周目标时，给予变现与加工补给。',
      threshold: 'any',
      bonusReward: { money: 220, items: [{ itemId: 'wild_mushroom', quantity: 2 }] }
    },
    {
      id: 'season_majority',
      label: '秋收经营奖',
      description: '完成多数周目标时，追加加工与展示向奖励。',
      threshold: 'majority',
      bonusReward: { money: 320, reputation: 4, items: [{ itemId: 'charcoal', quantity: 2 }] }
    },
    {
      id: 'season_full',
      label: '秋收满贯奖',
      description: '全部周目标完成时，发放秋收主题高价值奖励。',
      threshold: 'full',
      bonusReward: { money: 480, reputation: 8, items: [{ itemId: 'jade', quantity: 1 }] }
    }
  ],
  winter: [
    {
      id: 'season_any',
      label: '冬储保底奖',
      description: '完成任一周目标时，给予冬储补给。',
      threshold: 'any',
      bonusReward: { money: 220, items: [{ itemId: 'charcoal', quantity: 2 }] }
    },
    {
      id: 'season_majority',
      label: '冬储韧性奖',
      description: '完成多数周目标时，追加矿洞与储运向奖励。',
      threshold: 'majority',
      bonusReward: { money: 340, reputation: 4, items: [{ itemId: 'gold_ore', quantity: 2 }] }
    },
    {
      id: 'season_full',
      label: '冬储满贯奖',
      description: '全部周目标完成时，发放冬储主题收口奖励。',
      threshold: 'full',
      bonusReward: { money: 500, reputation: 8, items: [{ itemId: 'battery', quantity: 1 }] }
    }
  ]
}

export const getThemeWeekRewardPool = (themeWeekId: string): ThemeWeekRewardPoolEntry[] => {
  const themeWeek = THEME_WEEK_DEFS.find(entry => entry.id === themeWeekId)
  if (!themeWeek) return []
  const recommendedOfferIds = themeWeek.rewardPreview?.recommendedOfferIds ?? []
  return THEME_WEEK_BASE_REWARD_POOLS[themeWeek.season].map(entry => ({
    ...entry,
    id: `${themeWeek.id}_${entry.id}`,
    recommendedOfferIds: entry.recommendedOfferIds?.length ? entry.recommendedOfferIds : recommendedOfferIds.slice(0, 2)
  }))
}

export const WEEKLY_GOAL_FAILURE_COMPENSATION_RULE = {
  enabled: true,
  minProgressRatio: 0.6,
  maxCompensatedGoals: 1,
  reward: {
    money: 260,
    items: [{ itemId: 'food_rice_ball', quantity: 1 }]
  },
  reasonTemplate: '本周目标已接近完成线，发放轻量补偿用于下周继续推进。'
} as const

const THEME_WEEK_CROSS_GOAL_METRICS: Record<string, GoalMetricKey> = {
  spring_sowing: 'villageProjectLevel',
  spring_market: 'friendlyNpcCount',
  spring_scholar: 'museumExhibitLevel',
  spring_pond_awakening: 'totalRecipesCooked',
  summer_supply: 'villageProjectLevel',
  summer_fishing: 'hanhaiContractCompletions',
  summer_caravan: 'hanhaiContractCompletions',
  summer_pond_showcase: 'museumExhibitLevel',
  autumn_exhibition: 'museumExhibitLevel',
  autumn_harvest: 'villageProjectLevel',
  autumn_processing: 'friendlyNpcCount',
  late_sink_rotation: 'familyWishCompletions',
  winter_storage: 'totalRecipesCooked',
  winter_scholar: 'museumExhibitLevel',
  winter_pond_maintenance: 'familyWishCompletions',
  winter_mining: 'expeditionBossClears'
}

const WEEKLY_GOAL_METRIC_PRESETS: Partial<
  Record<
    GoalMetricKey,
    {
      summary: string
      targets: [number, number, number]
      rewards: [
        { reputation?: number; items?: Array<{ itemId: string; quantity: number }> },
        { reputation?: number; items?: Array<{ itemId: string; quantity: number }> },
        { reputation?: number; items?: Array<{ itemId: string; quantity: number }> }
      ]
    }
  >
> = {
  totalMoneyEarned: {
    summary: '累计赚到指定铜钱，验证本周经营方向是否真正跑通。',
    targets: [3000, 4500, 2200],
    rewards: [
      { reputation: 10, items: [{ itemId: 'bamboo', quantity: 2 }] },
      { reputation: 14, items: [{ itemId: 'bamboo', quantity: 3 }] },
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  },
  totalCropsHarvested: {
    summary: '在本周完成一轮稳定收获，给订单和加工提供原料。',
    targets: [18, 28, 14],
    rewards: [
      { reputation: 8, items: [{ itemId: 'herb', quantity: 3 }] },
      { reputation: 12, items: [{ itemId: 'quality_fertilizer', quantity: 2 }] },
      { reputation: 6, items: [{ itemId: 'herb', quantity: 2 }] }
    ]
  },
  totalFishCaught: {
    summary: '保持活体样本与鱼获供给，为鱼塘线和订单线补库存。',
    targets: [8, 12, 6],
    rewards: [
      { reputation: 8, items: [{ itemId: 'wild_bait', quantity: 4 }] },
      { reputation: 12, items: [{ itemId: 'fish_feed', quantity: 3 }] },
      { reputation: 6, items: [{ itemId: 'wild_bait', quantity: 3 }] }
    ]
  },
  totalRecipesCooked: {
    summary: '用料理把收获转成更高价值的周内产出。',
    targets: [2, 4, 3],
    rewards: [
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 2 }] },
      { reputation: 12, items: [{ itemId: 'charcoal', quantity: 2 }] },
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  },
  highestMineFloor: {
    summary: '在本周继续向下推进矿洞，兼顾补给与长期探索。',
    targets: [5, 8, 4],
    rewards: [
      { reputation: 10, items: [{ itemId: 'gold_ore', quantity: 2 }] },
      { reputation: 14, items: [{ itemId: 'gold_ore', quantity: 3 }] },
      { reputation: 8, items: [{ itemId: 'charcoal', quantity: 3 }] }
    ]
  },
  friendlyNpcCount: {
    summary: '推动与村民的关系积累，让经营线和社交线一起前进。',
    targets: [1, 2, 1],
    rewards: [
      { reputation: 10, items: [{ itemId: 'food_rice_ball', quantity: 2 }] },
      { reputation: 14, items: [{ itemId: 'osmanthus', quantity: 2 }] },
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  },
  discoveredCount: {
    summary: '补齐见闻与新发现，为后续研究、展示和订单解释性做准备。',
    targets: [2, 4, 3],
    rewards: [
      { reputation: 8, items: [{ itemId: 'wild_mushroom', quantity: 2 }] },
      { reputation: 12, items: [{ itemId: 'herb', quantity: 4 }] },
      { reputation: 8, items: [{ itemId: 'wild_mushroom', quantity: 1 }] }
    ]
  },
  villageProjectLevel: {
    summary: '把周目标导向建设或维护，让后期资金不只停留在背包里。',
    targets: [1, 1, 1],
    rewards: [
      { reputation: 12, items: [{ itemId: 'bamboo', quantity: 3 }] },
      { reputation: 16, items: [{ itemId: 'bamboo', quantity: 4 }] },
      { reputation: 10, items: [{ itemId: 'stone', quantity: 8 }] }
    ]
  },
  museumExhibitLevel: {
    summary: '在周内把展示线向前推一步，确保主题周不只是文案推荐。',
    targets: [1, 1, 1],
    rewards: [
      { reputation: 12, items: [{ itemId: 'jade', quantity: 1 }] },
      { reputation: 16, items: [{ itemId: 'battery', quantity: 1 }] },
      { reputation: 10, items: [{ itemId: 'wild_mushroom', quantity: 2 }] }
    ]
  },
  hanhaiContractCompletions: {
    summary: '要求本周至少推进一次瀚海循环，避免后期线在周节奏外游离。',
    targets: [1, 1, 1],
    rewards: [
      { reputation: 12, items: [{ itemId: 'battery', quantity: 1 }] },
      { reputation: 16, items: [{ itemId: 'jade', quantity: 1 }] },
      { reputation: 10, items: [{ itemId: 'charcoal', quantity: 2 }] }
    ]
  },
  familyWishCompletions: {
    summary: '为后续家庭愿望系统预留周目标入口，用于晚期社交与陪伴线联动。',
    targets: [1, 1, 1],
    rewards: [
      { reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] },
      { reputation: 16, items: [{ itemId: 'osmanthus', quantity: 2 }] },
      { reputation: 10, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  },
  regionRouteCompletions: {
    summary: '完成区域路线，验证本周行旅图推进是否真正形成闭环。',
    targets: [1, 2, 1],
    rewards: [
      { reputation: 10, items: [{ itemId: 'bamboo', quantity: 2 }] },
      { reputation: 14, items: [{ itemId: 'charcoal', quantity: 2 }] },
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  },
  expeditionBossClears: {
    summary: '击败区域首领，验证高风险路线与战备节奏是否成立。',
    targets: [1, 1, 1],
    rewards: [
      { reputation: 16, items: [{ itemId: 'gold_ore', quantity: 2 }] },
      { reputation: 18, items: [{ itemId: 'gold_ore', quantity: 3 }] },
      { reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] }
    ]
  },
  regionalResourceTurnIns: {
    summary: '交付区域资源，验证新地图成果是否真正进入旧系统承接链。',
    targets: [2, 4, 2],
    rewards: [
      { reputation: 10, items: [{ itemId: 'herb', quantity: 3 }] },
      { reputation: 14, items: [{ itemId: 'bamboo', quantity: 2 }] },
      { reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    ]
  }
}

const WEEKLY_GOAL_FALLBACK_METRICS: GoalMetricKey[] = ['totalMoneyEarned', 'discoveredCount', 'friendlyNpcCount']
const WEEKLY_GOAL_SLOT_LABELS = ['主攻', '拓展', '联动'] as const

const getThemeWeekGoalMetrics = (themeWeek: ThemeWeekDef): GoalMetricKey[] => {
  const candidates = [
    ...themeWeek.focusMetrics,
    THEME_WEEK_CROSS_GOAL_METRICS[themeWeek.id],
    ...WEEKLY_GOAL_FALLBACK_METRICS
  ]

  const picked: GoalMetricKey[] = []
  for (const metric of candidates) {
    if (!metric || !WEEKLY_GOAL_METRIC_PRESETS[metric] || picked.includes(metric)) continue
    picked.push(metric)
    if (picked.length >= 3) break
  }
  return picked
}

const createThemeWeekGoalDef = (
  themeWeek: ThemeWeekDef,
  metric: GoalMetricKey,
  slotIndex: 0 | 1 | 2
): WeeklyGoalDef => {
  const preset = WEEKLY_GOAL_METRIC_PRESETS[metric]!
  const slotLabel = WEEKLY_GOAL_SLOT_LABELS[slotIndex]
  return {
    id: `weekly_${themeWeek.id}_${slotIndex + 1}_${metric}`,
    title: `${themeWeek.name}·${slotLabel}`,
    description: `${preset.summary}（${themeWeek.name}）`,
    metric,
    targetValue: preset.targets[slotIndex],
    reward: preset.rewards[slotIndex],
    season: themeWeek.season,
    weekOfSeason: themeWeek.weekOfSeason,
    linkedThemeWeekId: themeWeek.id
  }
}

export const WEEKLY_GOAL_DEFS: WeeklyGoalDef[] = THEME_WEEK_DEFS.flatMap(themeWeek =>
  getThemeWeekGoalMetrics(themeWeek).map((metric, index) =>
    createThemeWeekGoalDef(themeWeek, metric, index as 0 | 1 | 2)
  )
)

export const getThemeWeeksBySeason = (season: 'spring' | 'summer' | 'autumn' | 'winter') =>
  THEME_WEEK_DEFS
    .filter(theme => theme.season === season)
    .sort((a, b) => a.weekOfSeason - b.weekOfSeason)

export const getThemeWeekBySeason = (
  season: 'spring' | 'summer' | 'autumn' | 'winter',
  weekOfSeason?: 1 | 2 | 3 | 4
) => {
  const seasonWeeks = getThemeWeeksBySeason(season)
  if (weekOfSeason) {
    return seasonWeeks.find(theme => theme.weekOfSeason === weekOfSeason) ?? null
  }
  return seasonWeeks[0] ?? null
}

export const getWeeklyGoalsBySeasonWeek = (
  season: 'spring' | 'summer' | 'autumn' | 'winter',
  weekOfSeason: 1 | 2 | 3 | 4
) => WEEKLY_GOAL_DEFS.filter(goal => goal.season === season && goal.weekOfSeason === weekOfSeason)
