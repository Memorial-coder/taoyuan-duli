import type {
  HanhaiShopItemDef,
  HanhaiRelicSiteDef,
  RouletteOutcome,
  CricketDef,
  PokerSuit,
  PokerRank,
  PokerCard,
  PokerHandType,
  PokerHandResult,
  TexasStreet,
  TexasTierId,
  TexasTierDef,
  PokerActionType,
  ShellType
} from '@/types'

export type HanhaiAuditMetricDirection = 'higher_is_better' | 'higher_is_worse' | 'lower_is_better' | 'lower_is_worse' | 'target_range'

export interface HanhaiAuditMetricThresholds {
  watch?: number
  warning?: number
  critical?: number
  targetMin?: number
  targetMax?: number
}

export interface HanhaiAuditMetricDef {
  id: string
  label: string
  description: string
  formula: string
  direction: HanhaiAuditMetricDirection
  dataSources: string[]
  thresholds: HanhaiAuditMetricThresholds
  anomalyRule: string
}

export interface HanhaiAuditPlayerSegmentDef {
  id: string
  label: string
  description: string
  unlockedRequired: boolean
  relicClearsMin: number
  weeklyHanhaiSpendMin: number
  linkedSystemCountMin: number
  recommendedFocus: string
}

export interface HanhaiAuditRollbackRule {
  id: string
  label: string
  condition: string
  fallbackAction: string
}

export type HanhaiLinkedSystemKey = 'quest' | 'shop' | 'museum' | 'goal'

export interface HanhaiLinkedSystemContext {
  key: HanhaiLinkedSystemKey
  label: string
  relationship: string
  primarySignals: string[]
}

export interface HanhaiAuditBaselineSummary {
  currentState: string[]
  targetPlayers: string[]
  painPoints: string[]
  successSignals: string[]
}

export interface HanhaiBaselineAuditConfig {
  id: string
  workstreamId: string
  label: string
  summary: string
  focusAreas: string[]
  baselineSummary: HanhaiAuditBaselineSummary
  coreMetrics: HanhaiAuditMetricDef[]
  guardrailMetrics: HanhaiAuditMetricDef[]
  playerSegments: HanhaiAuditPlayerSegmentDef[]
  rollbackRules: HanhaiAuditRollbackRule[]
  linkedSystems: HanhaiLinkedSystemContext[]
}

export const HANHAI_BASELINE_AUDIT_CONFIG: HanhaiBaselineAuditConfig = {
  id: 'ws08_t071_hanhai_baseline_audit',
  workstreamId: 'WS08-T071',
  label: '瀚海终局循环深化基线审计',
  summary: '为瀚海从终局开口升级为终局循环提供统一 KPI 口径，重点约束“只刷钱、不跨系统、不做风险决策”的失衡路径。',
  focusAreas: ['瀚海解锁后留存', '遗迹复玩率', '商路投资采用率', '瀚海材料跨系统回收量'],
  baselineSummary: {
    currentState: [
      '当前瀚海已有解锁、驿站商店、遗迹勘探、藏宝图和赌坊玩法，但主要奖励仍以直接铜钱和少量材料为主。',
      '商路投资、套组古物、周期 Boss、沙海订单与节庆仍未落地，导致瀚海更像终局侧场景入口，而非可持续经营的第二主战场。'
    ],
    targetPlayers: [
      '已拥有高额可支配铜钱、需要第二条终局经营线来分散主循环压力的后期玩家。',
      '愿意在探险、投资、收藏和跨系统经营之间做取舍，而不是只追逐单日最高现金回报的终局玩家。'
    ],
    painPoints: [
      '瀚海现阶段仍可能演化为“花钱进场再把钱刷回来”的纯现金循环，净消耗与风险决策不足。',
      '瀚海材料对 quest / shop / museum / goal 的出口还不够明确，玩家缺少跨系统承接理由。',
      '若后续继续单纯加钱或加掉落，会放大主线经济通胀，而不是形成新的终局目标层。'
    ],
    successSignals: [
      '玩家在解锁瀚海后，14 天内仍会持续回到遗迹、商路或沙海主题内容，而不是只体验一次。',
      '瀚海材料和行为会稳定反哺 quest / shop / museum / goal 至少两条旧系统，形成可观察的跨系统闭环。'
    ]
  },
  coreMetrics: [
    {
      id: 'hanhai_unlock_retention_14d',
      label: '瀚海解锁后 14 日留存',
      description: '衡量玩家在完成瀚海解锁后，是否持续回到瀚海进行遗迹、商路或相关经营行为。',
      formula: 'playersWithHanhaiActionWithin14DaysAfterUnlock / max(1, playersWhoUnlockedHanhai)',
      direction: 'higher_is_better',
      dataSources: ['useHanhaiStore.unlocked', 'useHanhaiStore.relicRecords', 'hanhaiTelemetry.dailySnapshots', 'hanhaiTelemetry.operationLog'],
      thresholds: { watch: 0.52, warning: 0.4, critical: 0.28 },
      anomalyRule: '若仍处于首周灰度或瀚海解锁样本不足 30，则只做趋势记录，不直接触发失败判定。'
    },
    {
      id: 'hanhai_relic_replay_rate_7d',
      label: '遗迹 7 日复玩率',
      description: '衡量至少完成过一次遗迹勘探的玩家中，有多少人会在 7 天内再次回到瀚海重复游玩。',
      formula: 'playersWith2PlusRelicClearsIn7Days / max(1, playersWithAnyRelicClearIn7Days)',
      direction: 'higher_is_better',
      dataSources: ['useHanhaiStore.relicRecords', 'hanhaiTelemetry.dailySnapshots', 'hanhaiTelemetry.relicClearHistory'],
      thresholds: { watch: 0.48, warning: 0.35, critical: 0.22 },
      anomalyRule: '若当周仅开放 1 个遗迹位或有全局内容冻结，则按“有无回流”口径观察，不强行比较绝对次数。'
    },
    {
      id: 'hanhai_caravan_investment_adoption_rate',
      label: '商路投资采用率',
      description: '衡量已进入瀚海稳定循环的玩家中，是否愿意采用带风险的商路投资 / 押运决策，而不是只做无脑刷取。',
      formula: 'playersUsingCaravanInvestmentOrEscortChoiceIn14Days / max(1, eligibleHanhaiLoopPlayers)',
      direction: 'higher_is_better',
      dataSources: ['hanhaiTelemetry.investmentLog', 'hanhaiTelemetry.routeDecisionLog', 'useHanhaiStore'],
      thresholds: { watch: 0.36, warning: 0.24, critical: 0.15 },
      anomalyRule: '若商路投资功能尚未开启，则以“待接线”标记保留口径，不拿空样本做负向结论。'
    },
    {
      id: 'hanhai_material_recovery_share',
      label: '瀚海材料跨系统回收率',
      description: '衡量瀚海产出的材料与古物，是否真正流向 quest / shop / museum / goal，而不是长期堆在背包。',
      formula: 'hanhaiMaterialsSpentInQuestShopMuseumGoal / max(1, totalHanhaiMaterialsAcquired)',
      direction: 'higher_is_better',
      dataSources: ['useHanhaiStore.relicRecords', 'useQuestStore', 'useShopStore', 'useMuseumStore', 'useGoalStore', 'hanhaiTelemetry.materialFlow'],
      thresholds: { watch: 0.34, warning: 0.22, critical: 0.12 },
      anomalyRule: '若 museum / goal 尚未接入瀚海材料出口，则先按 quest + shop 双系统口径采样，并明确记录缺口来源。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'hanhai_pure_money_loop_ratio',
      label: '纯刷钱循环占比',
      description: '作为核心护栏，衡量瀚海收益中有多少仍来自直接铜钱回流，而非风险投资、材料回收或跨系统转化。',
      formula: 'hanhaiDirectMoneyIncome / max(1, hanhaiDirectMoneyIncome + hanhaiSinkSpend + hanhaiMaterialSpendValue)',
      direction: 'higher_is_worse',
      dataSources: ['usePlayerStore.money', 'useHanhaiStore.relicRecords', 'hanhaiTelemetry.economyFlow', 'hanhaiTelemetry.materialFlow'],
      thresholds: { watch: 0.58, warning: 0.72, critical: 0.84 },
      anomalyRule: '若后续投资 / Boss / 节庆尚未开放，则先作为开发护栏使用，禁止据此继续上调直接金钱掉落。'
    },
    {
      id: 'hanhai_linked_system_activation_rate',
      label: '跨系统联动激活率',
      description: '衡量活跃瀚海玩家中，有多少人会在瀚海行为后触发 quest / shop / museum / goal 的承接动作。',
      formula: 'activeHanhaiPlayersWithLinkedSystemTouchpoint / max(1, activeHanhaiPlayers)',
      direction: 'lower_is_worse',
      dataSources: ['hanhaiTelemetry.linkedSystemSignals', 'useQuestStore', 'useShopStore', 'useMuseumStore', 'useGoalStore'],
      thresholds: { watch: 0.56, warning: 0.42, critical: 0.3 },
      anomalyRule: '若某一联动系统当期未投放，只统计已开放系统，避免因功能排期差异误伤整体判断。'
    }
  ],
  playerSegments: [
    {
      id: 'route_opener',
      label: '商路开拓型玩家',
      description: '刚完成瀚海解锁，主要体验遗迹与驿站商店，需要先建立“瀚海不只是赌坊和一次性探险”的认知。',
      unlockedRequired: true,
      relicClearsMin: 1,
      weeklyHanhaiSpendMin: 0,
      linkedSystemCountMin: 0,
      recommendedFocus: '优先提供首批遗迹复玩目标、驿站商店出口和与 quest 的第一层材料承接。'
    },
    {
      id: 'caravan_operator',
      label: '商路经营型玩家',
      description: '已能稳定回到瀚海，具备持续投入和材料调配能力，适合引入押运风险、材料分流与阶段目标。',
      unlockedRequired: true,
      relicClearsMin: 4,
      weeklyHanhaiSpendMin: 3000,
      linkedSystemCountMin: 1,
      recommendedFocus: '优先推商路投资、沙海订单与 shop / goal 联动，让瀚海收益转成经营抉择。'
    },
    {
      id: 'desert_curator',
      label: '沙海策展型玩家',
      description: '终局深度玩家，已经把瀚海当作长期经营线，需要靠套组古物、博物馆展示和周目标维持热度。',
      unlockedRequired: true,
      relicClearsMin: 10,
      weeklyHanhaiSpendMin: 12000,
      linkedSystemCountMin: 2,
      recommendedFocus: '优先开放套组古物、museum 展示出口、goal 周度目标和高规格风险事件，避免回到纯现金最优解。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws08_hanhai_cash_loop_rollback',
      label: '瀚海刷钱化回滚条件',
      condition: 'hanhai_pure_money_loop_ratio > 0.84 且 hanhai_material_recovery_share < 0.12 且 hanhai_linked_system_activation_rate < 0.3 持续 2 个观测周',
      fallbackAction: '暂停继续投放更高直接铜钱奖励与高赔率现金玩法，回退最近一档遗迹 / 藏宝图现金产出系数，优先补 quest / shop / museum / goal 出口与风险决策反馈。'
    }
  ],
  linkedSystems: [
    {
      key: 'quest',
      label: '委托 / 特殊订单系统',
      relationship: '瀚海材料、押运货物和遗迹古物应反向生成沙海订单、限时委托或高规格交付需求，提供第一层材料回收出口。',
      primarySignals: ['hanhaiQuestOrderCount', 'hanhaiSpecialOrderCompletionRate', 'hanhaiMaterialDeliverySpend']
    },
    {
      key: 'shop',
      label: '商店 / 目录消费系统',
      relationship: '驿站商店与主商店目录应共同承接瀚海收益，把商路利润转成高价商品、经营许可或功能型服务消费。',
      primarySignals: ['hanhaiShopPurchaseRate', 'catalogSpendAfterHanhaiIncome', 'hanhaiProfitToShopSinkRate']
    },
    {
      key: 'museum',
      label: '博物馆 / 展示系统',
      relationship: '遗迹古物、套组收藏与沙海异域素材应进入馆藏、专题展或展示评分，提供终局展示价值而非只卖钱。',
      primarySignals: ['hanhaiRelicMuseumDonationCount', 'hanhaiSetCollectionCompletionRate', 'museumShowcaseValueFromHanhai']
    },
    {
      key: 'goal',
      label: '目标 / 主题周系统',
      relationship: '瀚海周目标、节庆主题和风险事件应进入长期目标与主题周推荐，驱动玩家每周重新安排瀚海与主线资源。',
      primarySignals: ['hanhaiGoalCount', 'hanhaiThemeWeekParticipationRate', 'hanhaiLoopGoalCompletionRate']
    }
  ]
}

export const HANHAI_RELIC_SITES: HanhaiRelicSiteDef[] = [
  {
    id: 'sunset_ruins',
    name: '落日古驿',
    description: '残破驿站埋着旧商路的账册与丝路余货，适合作为第一批遗迹勘探目标。',
    unlockCost: 1800,
    weeklyLimit: 2,
    relicTag: '商路遗物',
    rewards: {
      money: 1800,
      items: [
        { itemId: 'hanhai_spice', quantity: 2 },
        { itemId: 'hanhai_silk', quantity: 1 }
      ]
    }
  },
  {
    id: 'turquoise_pit',
    name: '青玉采坑',
    description: '风沙掩埋的采坑仍残留绿松石与古老碎片，适合中后期稳定刷稀有材料。',
    unlockCost: 2600,
    weeklyLimit: 2,
    relicTag: '沙海矿藏',
    rewards: {
      money: 2400,
      items: [
        { itemId: 'hanhai_turquoise', quantity: 2 },
        { itemId: 'hanhai_map', quantity: 1 }
      ]
    }
  },
  {
    id: 'moon_sand_shrine',
    name: '月沙祭坛',
    description: '月夜才会显形的遗坛，能稳定产出高价值异域素材与额外铜钱。',
    unlockCost: 3600,
    weeklyLimit: 1,
    relicTag: '祭仪遗珍',
    rewards: {
      money: 4200,
      items: [
        { itemId: 'hanhai_spice', quantity: 3 },
        { itemId: 'hanhai_turquoise', quantity: 1 }
      ]
    }
  }
]

/** 瀚海驿站商店物品 */
export const HANHAI_SHOP_ITEMS: HanhaiShopItemDef[] = [
  { itemId: 'hanhai_cactus_seed', name: '仙人掌种子', price: 500, description: '来自西域的奇特植物种子。', weeklyLimit: 5 },
  { itemId: 'hanhai_date_seed', name: '红枣种子', price: 400, description: '丝绸之路带来的果树种子。', weeklyLimit: 5 },
  { itemId: 'hanhai_spice', name: '西域香料', price: 300, description: '异域风情的香料，烹饪佳品。', weeklyLimit: 3 },
  { itemId: 'hanhai_silk', name: '丝绸', price: 800, description: '细腻光滑的上等丝绸。', weeklyLimit: 2 },
  { itemId: 'hanhai_turquoise', name: '绿松石', price: 600, description: '西域特产的珍贵宝石。', weeklyLimit: 2 },
  { itemId: 'hanhai_map', name: '藏宝图', price: 1000, description: '标记着荒原某处宝藏的地图。', weeklyLimit: 1 },
  { itemId: 'mega_bomb_recipe', name: '巨型炸弹配方', price: 5000, description: '据说能炸开整层矿洞的秘方。', weeklyLimit: 1 }
]

/** 轮盘赔率 */
export const ROULETTE_OUTCOMES: RouletteOutcome[] = [
  { label: '空', multiplier: 0, chance: 72 },
  { label: '双倍', multiplier: 2, chance: 18 },
  { label: '三倍', multiplier: 3, chance: 7 },
  { label: '五倍', multiplier: 5, chance: 3 }
]

/** 轮盘投注档位 */
export const ROULETTE_BET_TIERS = [100, 500, 1000] as const

/** 骰子投注金额 */
export const DICE_BET_AMOUNT = 200

/** 每天最大赌博次数 */
export const MAX_DAILY_BETS = 10

/** 解锁瀚海所需费用 */
export const HANHAI_UNLOCK_COST = 100000

/** 根据概率随机选择轮盘结果 */
export const spinRoulette = (): RouletteOutcome => {
  let roll = Math.random() * 100
  for (const outcome of ROULETTE_OUTCOMES) {
    roll -= outcome.chance
    if (roll <= 0) return outcome
  }
  return ROULETTE_OUTCOMES[0]!
}

/** 骰子游戏：投大小 */
export const rollDice = (): { dice1: number; dice2: number; total: number; isBig: boolean } => {
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const total = dice1 + dice2
  return { dice1, dice2, total, isBig: total >= 7 }
}

// ==================== 猜杯 ====================

/** 猜杯投注金额 */
export const CUP_BET_AMOUNT = 250

/** 猜杯倍率 */
export const CUP_WIN_MULTIPLIER = 3

/** 猜杯游戏：球藏在哪个杯子下 */
export const playCupRound = (): { correctCup: number } => {
  return { correctCup: Math.floor(Math.random() * 3) }
}

// ==================== 斗蛐蛐 ====================

/** 斗蛐蛐投注金额 */
export const CRICKET_BET_AMOUNT = 300

/** 斗蛐蛐赢赔率 */
export const CRICKET_WIN_MULTIPLIER = 2.5

/** 可选蛐蛐 */
export const CRICKETS: CricketDef[] = [
  { id: 'general', name: '将军', description: '体格健壮，攻守兼备。' },
  { id: 'ironhead', name: '铁头', description: '头铁如铁，擅长硬碰硬。' },
  { id: 'dragonfly', name: '青龙', description: '身法灵活，出其不意。' }
]

/** 斗蛐蛐：双方各掷力量，高者胜 */
export const fightCricket = (): { playerPower: number; opponentPower: number } => {
  const playerPower = Math.floor(Math.random() * 10) + 1
  const opponentPower = Math.floor(Math.random() * 10) + 1
  return { playerPower, opponentPower }
}

// ==================== 翻牌寻宝 ====================

/** 翻牌投注金额 */
export const CARD_BET_AMOUNT = 150

/** 翻牌赢赔率 */
export const CARD_WIN_MULTIPLIER = 2.5

/** 翻牌总数 */
export const CARD_TOTAL = 5

/** 翻牌中宝牌数量 */
export const CARD_TREASURE_COUNT = 2

/** 翻牌游戏：生成宝牌位置 */
export const dealCards = (): { treasures: number[] } => {
  const positions = [0, 1, 2, 3, 4]
  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j]!, positions[i]!]
  }
  return { treasures: positions.slice(0, CARD_TREASURE_COUNT) }
}

// ==================== 瀚海扑克 ====================

/** 场次配置 */
export const TEXAS_TIERS: TexasTierDef[] = [
  { id: 'beginner', name: '新手场', entryFee: 200, blind: 10, rake: 20, minMoney: 500, rounds: 3 },
  { id: 'normal', name: '普通场', entryFee: 500, blind: 25, rake: 50, minMoney: 2000, rounds: 5 },
  { id: 'expert', name: '高手场', entryFee: 2000, blind: 100, rake: 200, minMoney: 10000, rounds: 8 }
]

/** 根据ID获取场次配置 */
export const getTexasTier = (id: TexasTierId): TexasTierDef => TEXAS_TIERS.find(t => t.id === id)!

/** 花色显示符号 */
export const SUIT_LABELS: Record<PokerSuit, string> = {
  spade: '\u2660',
  heart: '\u2665',
  diamond: '\u2666',
  club: '\u2663'
}

/** 点数显示 */
export const RANK_LABELS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A'
}

/** 牌型中文名称 */
export const HAND_LABELS: Record<PokerHandType, string> = {
  royal_flush: '皇家同花顺',
  straight_flush: '同花顺',
  four_kind: '四条',
  full_house: '葫芦',
  flush: '同花',
  straight: '顺子',
  three_kind: '三条',
  two_pair: '两对',
  one_pair: '一对',
  high_card: '高牌'
}

/** 牌型优先级（越大越强） */
const HAND_TYPE_RANK: Record<PokerHandType, number> = {
  high_card: 0,
  one_pair: 1,
  two_pair: 2,
  three_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_kind: 7,
  straight_flush: 8,
  royal_flush: 9
}

const ALL_SUITS: PokerSuit[] = ['spade', 'heart', 'diamond', 'club']
const ALL_RANKS: PokerRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

/** 创建并洗牌（Fisher-Yates） */
export const createShuffledDeck = (): PokerCard[] => {
  const deck: PokerCard[] = []
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ suit, rank })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  return deck
}

/** 评估5张牌的牌型 */
export const evaluateHand = (cards: PokerCard[]): PokerHandResult => {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank)
  const ranks = sorted.map(c => c.rank)

  // 检查同花
  const isFlush = sorted.every(c => c.suit === sorted[0]!.suit)

  // 检查顺子
  let isStraight = false
  let straightHighRank = ranks[0]!

  // 普通顺子
  if (ranks[0]! - ranks[4]! === 4 && new Set(ranks).size === 5) {
    isStraight = true
  }
  // A-2-3-4-5 小顺子
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true
    straightHighRank = 5 // A做最小
  }

  // 统计频率
  const freq = new Map<number, number>()
  for (const r of ranks) {
    freq.set(r, (freq.get(r) ?? 0) + 1)
  }
  const counts = [...freq.values()].sort((a, b) => b - a)
  // 按频率降序、同频率按rank降序排列
  const groupedRanks = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(e => e[0])

  // 判定牌型
  let type: PokerHandType
  let compareRanks: number[]

  if (isFlush && isStraight && ranks[0] === 14 && ranks[1] === 13) {
    type = 'royal_flush'
    compareRanks = [14]
  } else if (isFlush && isStraight) {
    type = 'straight_flush'
    compareRanks = [straightHighRank]
  } else if (counts[0] === 4) {
    type = 'four_kind'
    compareRanks = groupedRanks
  } else if (counts[0] === 3 && counts[1] === 2) {
    type = 'full_house'
    compareRanks = groupedRanks
  } else if (isFlush) {
    type = 'flush'
    compareRanks = ranks
  } else if (isStraight) {
    type = 'straight'
    compareRanks = [straightHighRank]
  } else if (counts[0] === 3) {
    type = 'three_kind'
    compareRanks = groupedRanks
  } else if (counts[0] === 2 && counts[1] === 2) {
    type = 'two_pair'
    compareRanks = groupedRanks
  } else if (counts[0] === 2) {
    type = 'one_pair'
    compareRanks = groupedRanks
  } else {
    type = 'high_card'
    compareRanks = ranks
  }

  return {
    type,
    typeRank: HAND_TYPE_RANK[type],
    ranks: compareRanks,
    label: HAND_LABELS[type]
  }
}

/** 从 n 张中生成所有 C(n,5) 组合 */
const combinations5 = (cards: PokerCard[]): PokerCard[][] => {
  const result: PokerCard[][] = []
  const n = cards.length
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            result.push([cards[i]!, cards[j]!, cards[k]!, cards[l]!, cards[m]!])
          }
        }
      }
    }
  }
  return result
}

/** 比较两手牌: >0 = a胜, <0 = b胜, 0 = 平 */
export const compareHands = (a: PokerHandResult, b: PokerHandResult): number => {
  if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank
  for (let i = 0; i < Math.min(a.ranks.length, b.ranks.length); i++) {
    if (a.ranks[i]! !== b.ranks[i]!) return a.ranks[i]! - b.ranks[i]!
  }
  return 0
}

/** 从7张中选最佳5张牌型 */
export const evaluateBestHand = (cards: PokerCard[]): PokerHandResult => {
  const combos = combinations5(cards)
  let best = evaluateHand(combos[0]!)
  for (let i = 1; i < combos.length; i++) {
    const hand = evaluateHand(combos[i]!)
    if (compareHands(hand, best) > 0) {
      best = hand
    }
  }
  return best
}

/** 发一局瀚海扑克 */
export const dealTexas = (): {
  playerHole: PokerCard[]
  dealerHole: PokerCard[]
  community: PokerCard[]
} => {
  const deck = createShuffledDeck()
  return {
    playerHole: [deck[0]!, deck[1]!],
    dealerHole: [deck[2]!, deck[3]!],
    community: [deck[4]!, deck[5]!, deck[6]!, deck[7]!, deck[8]!]
  }
}

/** 庄家AI决策 */
export const texasDealerAI = (
  dealerHole: PokerCard[],
  community: PokerCard[],
  street: TexasStreet,
  pot: number,
  dealerStack: number,
  playerBet: number,
  dealerBet: number,
  playerAllIn: boolean,
  blind: number
): { action: PokerActionType; amount: number } => {
  const toCall = playerBet - dealerBet

  // 评估当前牌力
  const visibleCards = [...dealerHole, ...community]
  let strength = 0 // 0=弱 1=中 2=强
  if (visibleCards.length >= 5) {
    const hand = evaluateBestHand(visibleCards)
    if (hand.typeRank >= 3)
      strength = 2 // 三条+
    else if (hand.typeRank >= 1) strength = 1 // 一对+
  } else if (visibleCards.length >= 2) {
    // preflop: 简单评估手牌
    const r1 = dealerHole[0]!.rank
    const r2 = dealerHole[1]!.rank
    const paired = r1 === r2
    const highCard = Math.max(r1, r2) >= 11
    const suited = dealerHole[0]!.suit === dealerHole[1]!.suit
    if (paired || (highCard && suited)) strength = 2
    else if (highCard || suited) strength = 1
  }

  // 玩家已全押 → 只能跟或弃
  if (playerAllIn) {
    if (toCall <= 0) return { action: 'check', amount: 0 }
    if (strength >= 1 || toCall <= pot * 0.3) return { action: 'call', amount: toCall }
    return Math.random() < 0.3 ? { action: 'call', amount: toCall } : { action: 'fold', amount: 0 }
  }

  // 无需跟注
  if (toCall <= 0) {
    if (strength >= 2 && Math.random() < 0.6) {
      const raiseAmt = Math.min(blind * (street === 'preflop' ? 2 : 3), dealerStack)
      return raiseAmt > 0 ? { action: 'raise', amount: raiseAmt } : { action: 'check', amount: 0 }
    }
    if (strength >= 1 && Math.random() < 0.3) {
      const raiseAmt = Math.min(blind * 2, dealerStack)
      return raiseAmt > 0 ? { action: 'raise', amount: raiseAmt } : { action: 'check', amount: 0 }
    }
    return { action: 'check', amount: 0 }
  }

  // 需要跟注
  const potOdds = toCall / (pot + toCall)

  if (strength >= 2) {
    // 强牌：跟注或加注
    if (Math.random() < 0.4 && dealerStack > toCall + blind) {
      const raiseAmt = toCall + Math.min(blind * 2, dealerStack - toCall)
      return { action: 'raise', amount: raiseAmt }
    }
    return { action: 'call', amount: toCall }
  }

  if (strength >= 1) {
    // 中等牌：大部分跟注，大注可能弃
    if (potOdds > 0.5 && street === 'river') {
      return Math.random() < 0.5 ? { action: 'fold', amount: 0 } : { action: 'call', amount: toCall }
    }
    return { action: 'call', amount: toCall }
  }

  // 弱牌
  if (potOdds > 0.4) {
    return Math.random() < 0.7 ? { action: 'fold', amount: 0 } : { action: 'call', amount: toCall }
  }
  return Math.random() < 0.3 ? { action: 'fold', amount: 0 } : { action: 'call', amount: toCall }
}

// ==================== 恶魔轮盘 ====================

/** 恶魔轮盘投注金额 */
export const BUCKSHOT_BET_AMOUNT = 400

/** 恶魔轮盘赢赔率 */
export const BUCKSHOT_WIN_MULTIPLIER = 3

/** 双方初始HP */
export const BUCKSHOT_PLAYER_HP = 2
export const BUCKSHOT_DEALER_HP = 2

/** 实弹数量 */
export const BUCKSHOT_LIVE_COUNT = 4

/** 空弹数量 */
export const BUCKSHOT_BLANK_COUNT = 4

/** 生成弹仓（打乱顺序） */
export const loadShotgun = (): ShellType[] => {
  const shells: ShellType[] = []
  for (let i = 0; i < BUCKSHOT_LIVE_COUNT; i++) shells.push('live')
  for (let i = 0; i < BUCKSHOT_BLANK_COUNT; i++) shells.push('blank')
  // Fisher-Yates
  for (let i = shells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shells[i], shells[j]] = [shells[j]!, shells[i]!]
  }
  return shells
}

/** 庄家AI决策 */
export const dealerDecide = (shells: ShellType[], currentIndex: number, knowsCurrent: boolean): 'self' | 'opponent' => {
  if (knowsCurrent) {
    return shells[currentIndex] === 'blank' ? 'self' : 'opponent'
  }
  // 统计剩余弹药
  let liveLeft = 0
  let blankLeft = 0
  for (let i = currentIndex; i < shells.length; i++) {
    if (shells[i] === 'live') liveLeft++
    else blankLeft++
  }
  return blankLeft > liveLeft ? 'self' : 'opponent'
}
