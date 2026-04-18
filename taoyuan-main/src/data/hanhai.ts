import type {
  CompensationPlan,
  HanhaiBossCycleDef,
  HanhaiCasinoSideRewardDef,
  HanhaiCaravanContractDef,
  HanhaiRelicSetDef,
  HanhaiShopItemDef,
  HanhaiShopRotationDef,
  HanhaiRelicSiteDef,
  HanhaiRouteInvestmentDef,
  HanhaiRewardBundle,
  HanhaiWeightedRewardBundle,
  QaCaseDef,
  ReleaseChecklistItem,
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

export const HANHAI_ROUTE_INVESTMENTS: HanhaiRouteInvestmentDef[] = [
  {
    id: 'westbound_silk_route',
    label: '西行丝货路',
    unlockTier: 'P0',
    costMoney: 3200,
    riskLevel: 'low',
    rewardSummary: '稳定回收丝绸、香料与基础商路利润，作为瀚海经营的第一档投资入口。',
    weeklyYieldSummary: '每周完成一次押运后，可提供稳定的丝货与目录消费承接理由。',
    linkedSystems: ['shop', 'quest'],
    favoredCargoTags: ['丝货', '补给']
  },
  {
    id: 'turquoise_exchange_route',
    label: '青玉互市路',
    unlockTier: 'P1',
    costMoney: 7800,
    riskLevel: 'medium',
    rewardSummary: '主打绿松石与藏宝图相关收益，强化中后期遗迹复玩与委托承接。',
    weeklyYieldSummary: '为特殊订单、驿站精选货架和中档展示提供稳定的矿藏流。',
    linkedSystems: ['quest', 'shop', 'museum'],
    favoredCargoTags: ['矿藏', '古物']
  },
  {
    id: 'moon_sand_ceremony_route',
    label: '月沙祭仪路',
    unlockTier: 'P2',
    costMoney: 16800,
    riskLevel: 'high',
    rewardSummary: '面向终局展示与主题周的高价商路，可承接高规格古物、供奉与赞助需求。',
    weeklyYieldSummary: '每周完成高风险押运后，可为博物馆展示、主题周与终局赞助提供关键素材。',
    linkedSystems: ['museum', 'goal', 'shop'],
    favoredCargoTags: ['祭仪', '珍宝', '赞助']
  }
]

export const HANHAI_ROUTE_WEEKLY_YIELDS: Record<string, HanhaiRewardBundle> = {
  westbound_silk_route: {
    money: 900,
    items: [
      { itemId: 'hanhai_silk', quantity: 1 },
      { itemId: 'hanhai_spice', quantity: 2 }
    ],
    ticketRewards: { caravan: 1 }
  },
  turquoise_exchange_route: {
    money: 1800,
    items: [
      { itemId: 'hanhai_turquoise', quantity: 2 },
      { itemId: 'hanhai_map', quantity: 1 }
    ],
    ticketRewards: { caravan: 1, exhibit: 1 }
  },
  moon_sand_ceremony_route: {
    money: 3600,
    items: [
      { itemId: 'hanhai_silk', quantity: 2 },
      { itemId: 'hanhai_turquoise', quantity: 3 },
      { itemId: 'hanhai_map', quantity: 1 }
    ],
    ticketRewards: { exhibit: 1, research: 1 }
  }
}

export const HANHAI_RELIC_SET_DEFS: HanhaiRelicSetDef[] = [
  {
    id: 'merchant_ledger_set',
    label: '商旅账册套组',
    unlockTier: 'P1',
    requiredRelicTags: ['商路遗物', '沙海矿藏'],
    rewardSummary: '为商路专题展示、押运委托与终局贸易周提供第一档套组价值。',
    linkedSystems: ['museum', 'quest', 'goal']
  },
  {
    id: 'desert_ritual_set',
    label: '沙海祭仪套组',
    unlockTier: 'P2',
    requiredRelicTags: ['祭仪遗珍', '沙海矿藏'],
    rewardSummary: '适合用于祠堂 / 展示联动与终局节庆活动，是高价展示型内容的关键套组。',
    linkedSystems: ['museum', 'goal']
  },
  {
    id: 'sun_moon_trade_set',
    label: '日月商路套组',
    unlockTier: 'P2',
    requiredRelicTags: ['商路遗物', '祭仪遗珍', '沙海矿藏'],
    rewardSummary: '作为终局收藏向目标，服务瀚海赞助、跨系统主题周与高规格订单。',
    linkedSystems: ['museum', 'quest', 'shop', 'goal']
  }
]

export const HANHAI_BOSS_CYCLE_DEFS: HanhaiBossCycleDef[] = [
  {
    id: 'dune_revenant',
    label: '沙丘遗魂',
    unlockTier: 'P0',
    preferredWeekOfSeason: [1],
    threatLevel: 'standard',
    rewardSummary: '适合作为首周热身 Boss，掉落基础商路与矿藏类战利品。',
    linkedSystems: ['quest', 'goal']
  },
  {
    id: 'glass_scorpion',
    label: '琉沙晶蝎',
    unlockTier: 'P1',
    preferredWeekOfSeason: [2],
    threatLevel: 'advanced',
    rewardSummary: '强化绿松石、藏宝图与商店精选货架的中段承接。',
    linkedSystems: ['shop', 'quest', 'goal']
  },
  {
    id: 'sunken_colossus',
    label: '沉碑巨像',
    unlockTier: 'P2',
    preferredWeekOfSeason: [3],
    threatLevel: 'advanced',
    rewardSummary: '面向高规格古物、博物馆展示与专题赞助的终局过渡 Boss。',
    linkedSystems: ['museum', 'goal']
  },
  {
    id: 'sandstorm_wyrm',
    label: '沙暴龙蛇',
    unlockTier: 'P2',
    preferredWeekOfSeason: [4],
    threatLevel: 'prestige',
    rewardSummary: '作为季末终局 Boss，服务主题周高潮、终局订单与商路赞助收官。',
    linkedSystems: ['quest', 'museum', 'goal', 'shop']
  }
]

export const HANHAI_CARAVAN_CONTRACT_DEFS: HanhaiCaravanContractDef[] = [
  {
    id: 'contract_silk_relay',
    label: '丝货接力单',
    unlockTier: 'P0',
    routeId: 'westbound_silk_route',
    durationWeeks: 1,
    costMoney: 2400,
    cargoTags: ['丝货', '补给'],
    riskLevel: 'low',
    rewardSummary: '适合作为瀚海第一档合同，强调稳定押运与轻度净消耗。',
    linkedSystems: ['shop', 'quest']
  },
  {
    id: 'contract_turquoise_exchange',
    label: '青玉互市合同',
    unlockTier: 'P1',
    routeId: 'turquoise_exchange_route',
    durationWeeks: 1,
    costMoney: 6200,
    cargoTags: ['矿藏', '古物'],
    riskLevel: 'medium',
    rewardSummary: '中后期合同，承接遗迹矿藏与高规格交付的双向循环。',
    linkedSystems: ['quest', 'museum', 'shop']
  },
  {
    id: 'contract_moon_sand_patronage',
    label: '月沙赞助合同',
    unlockTier: 'P2',
    routeId: 'moon_sand_ceremony_route',
    durationWeeks: 2,
    costMoney: 12800,
    cargoTags: ['祭仪', '珍宝', '赞助'],
    riskLevel: 'high',
    rewardSummary: '终局高价合同，服务瀚海赞助、专题展与主题周收官。',
    linkedSystems: ['museum', 'goal', 'shop']
  },
  {
    id: 'contract_koi_showcase_relay',
    label: '锦鲤观赏接力单',
    unlockTier: 'P1',
    routeId: 'turquoise_exchange_route',
    durationWeeks: 1,
    costMoney: 5600,
    cargoTags: ['活体观赏', '茶会联供'],
    riskLevel: 'medium',
    rewardSummary: '把鱼塘观赏样鱼、茶会联供单与驿站精选货架串成同一条活体展示商路。',
    linkedSystems: ['quest', 'shop', 'museum']
  },
  {
    id: 'contract_coldchain_specimen_route',
    label: '冷链样本押运合同',
    unlockTier: 'P2',
    routeId: 'moon_sand_ceremony_route',
    durationWeeks: 1,
    costMoney: 9800,
    cargoTags: ['冷链样本', '研究供货', '活体押运'],
    riskLevel: 'high',
    rewardSummary: '面向高代鱼塘样本与研究联运的终局合同，会放大鱼塘组合单、样本周赛与研究承接。',
    linkedSystems: ['quest', 'goal', 'museum']
  }
]

export const HANHAI_SHOP_ROTATIONS: HanhaiShopRotationDef[] = [
  {
    id: 'rotation_frontier_supplies',
    label: '边路补给轮换',
    unlockTier: 'P0',
    featuredItemIds: ['hanhai_cactus_seed', 'hanhai_date_seed', 'hanhai_spice'],
    summary: '面向中期过渡，强化种子、香料与基础驿站消费。'
  },
  {
    id: 'rotation_trade_house',
    label: '互市精选轮换',
    unlockTier: 'P1',
    featuredItemIds: ['hanhai_silk', 'hanhai_turquoise', 'hanhai_map'],
    summary: '服务中后期商路互市，放大矿藏、丝货与藏宝图的目录承接。'
  },
  {
    id: 'rotation_endgame_patron',
    label: '终局赞助轮换',
    unlockTier: 'P2',
    featuredItemIds: ['hanhai_map', 'mega_bomb_recipe', 'hanhai_silk'],
    summary: '作为终局展示与高价投资的消费池，为高风险押运与终局活动预留货架。'
  }
]

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

export const HANHAI_TREASURE_MAP_REWARDS: HanhaiWeightedRewardBundle[] = [
  {
    id: 'weathered_cache',
    label: '风蚀补给箱',
    summary: '以少量铜钱配合商路补给为主，突出“寻得补给”而非直接暴富。',
    weight: 28,
    rewards: {
      money: 300,
      items: [{ itemId: 'hanhai_spice', quantity: 2 }],
      ticketRewards: { caravan: 1 }
    }
  },
  {
    id: 'silk_way_stash',
    label: '丝路旧货',
    summary: '中档现金回收配合丝绸与展陈票券，适合作为中位奖励。',
    weight: 30,
    rewards: {
      money: 600,
      items: [{ itemId: 'hanhai_silk', quantity: 1 }],
      ticketRewards: { exhibit: 1 }
    }
  },
  {
    id: 'turquoise_bundle',
    label: '青玉货包',
    summary: '强调矿藏与商路票的替代价值，减少直接现金返还。',
    weight: 24,
    rewards: {
      money: 900,
      items: [{ itemId: 'hanhai_turquoise', quantity: 2 }],
      ticketRewards: { caravan: 1 }
    }
  },
  {
    id: 'moon_sand_relic',
    label: '月沙遗珍',
    summary: '高档奖励改为“少量现金 + 稀有素材 + 研究票券”的复合组合。',
    weight: 12,
    rewards: {
      money: 1400,
      items: [
        { itemId: 'hanhai_turquoise', quantity: 1 },
        { itemId: 'hanhai_spice', quantity: 2 }
      ],
      ticketRewards: { research: 1, exhibit: 1 }
    }
  },
  {
    id: 'mirage_vault',
    label: '蜃景秘库',
    summary: '最高档奖励仍保留惊喜感，但主要价值由票券与稀有货物承担。',
    weight: 6,
    rewards: {
      money: 2200,
      items: [
        { itemId: 'hanhai_turquoise', quantity: 2 },
        { itemId: 'hanhai_silk', quantity: 1 }
      ],
      ticketRewards: { caravan: 2, exhibit: 1 }
    }
  }
]

export const HANHAI_CASINO_SIDE_REWARD_DEFS: HanhaiCasinoSideRewardDef[] = [
  {
    id: 'roulette_win_none',
    gameType: 'roulette',
    trigger: 'win',
    label: '围观喝彩',
    summary: '赢下轮盘后，大多数时候只有喝彩，没有额外物资。',
    weight: 55,
    rewards: {}
  },
  {
    id: 'roulette_win_caravan_ticket',
    gameType: 'roulette',
    trigger: 'win',
    label: '筹码换票',
    summary: '轮盘盈利有机会折算为商路票。',
    weight: 25,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'roulette_win_turquoise',
    gameType: 'roulette',
    trigger: 'win',
    label: '青玉彩头',
    summary: '小概率带回绿松石作为彩头。',
    weight: 20,
    rewards: { items: [{ itemId: 'hanhai_turquoise', quantity: 1 }] }
  },
  {
    id: 'roulette_lose_none',
    gameType: 'roulette',
    trigger: 'lose',
    label: '空手而回',
    summary: '输钱后多数情况没有额外补偿。',
    weight: 70,
    rewards: {}
  },
  {
    id: 'roulette_lose_spice',
    gameType: 'roulette',
    trigger: 'lose',
    label: '香料安慰奖',
    summary: '偶尔拿到一份异域香料。',
    weight: 20,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 1 }] }
  },
  {
    id: 'roulette_lose_caravan_ticket',
    gameType: 'roulette',
    trigger: 'lose',
    label: '商路安慰票',
    summary: '低概率发放商路票，鼓励转去经营线。',
    weight: 10,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'dice_win_none',
    gameType: 'dice',
    trigger: 'win',
    label: '猜中收桌',
    summary: '猜大小获胜后通常只有现金回收。',
    weight: 60,
    rewards: {}
  },
  {
    id: 'dice_win_research_ticket',
    gameType: 'dice',
    trigger: 'win',
    label: '算筹记录',
    summary: '骰局赢面有机会折算为研究券。',
    weight: 20,
    rewards: { ticketRewards: { research: 1 } }
  },
  {
    id: 'dice_win_spice',
    gameType: 'dice',
    trigger: 'win',
    label: '赌桌香包',
    summary: '赢面奖励可能附带一份香料。',
    weight: 20,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 1 }] }
  },
  {
    id: 'dice_lose_none',
    gameType: 'dice',
    trigger: 'lose',
    label: '认栽离席',
    summary: '猜错时大多直接离桌。',
    weight: 82,
    rewards: {}
  },
  {
    id: 'dice_lose_research_ticket',
    gameType: 'dice',
    trigger: 'lose',
    label: '算筹旁听券',
    summary: '低概率获得研究券作为旁听补贴。',
    weight: 18,
    rewards: { ticketRewards: { research: 1 } }
  },
  {
    id: 'cup_win_none',
    gameType: 'cup',
    trigger: 'win',
    label: '揭杯得彩',
    summary: '猜杯获胜后大多只回收部分现金。',
    weight: 50,
    rewards: {}
  },
  {
    id: 'cup_win_exhibit_ticket',
    gameType: 'cup',
    trigger: 'win',
    label: '展台赏票',
    summary: '赢家有机会拿到展陈券。',
    weight: 25,
    rewards: { ticketRewards: { exhibit: 1 } }
  },
  {
    id: 'cup_win_silk',
    gameType: 'cup',
    trigger: 'win',
    label: '杯底丝货',
    summary: '偶尔带回一匹丝绸。',
    weight: 25,
    rewards: { items: [{ itemId: 'hanhai_silk', quantity: 1 }] }
  },
  {
    id: 'cup_lose_none',
    gameType: 'cup',
    trigger: 'lose',
    label: '错杯散场',
    summary: '猜错时多数没有补偿。',
    weight: 85,
    rewards: {}
  },
  {
    id: 'cup_lose_exhibit_ticket',
    gameType: 'cup',
    trigger: 'lose',
    label: '看客留票',
    summary: '低概率获得展陈券，鼓励转向收藏线。',
    weight: 15,
    rewards: { ticketRewards: { exhibit: 1 } }
  },
  {
    id: 'cricket_win_none',
    gameType: 'cricket',
    trigger: 'win',
    label: '斗胜喝彩',
    summary: '斗蛐蛐获胜后多数只有少量现金回流。',
    weight: 50,
    rewards: {}
  },
  {
    id: 'cricket_win_caravan_ticket',
    gameType: 'cricket',
    trigger: 'win',
    label: '虫局佣票',
    summary: '赢面可以折算成商路票。',
    weight: 25,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'cricket_win_spice',
    gameType: 'cricket',
    trigger: 'win',
    label: '虫笼香料',
    summary: '偶尔带回一批异域香料。',
    weight: 25,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 2 }] }
  },
  {
    id: 'cricket_draw_none',
    gameType: 'cricket',
    trigger: 'draw',
    label: '平局散场',
    summary: '平局时通常只退回本金。',
    weight: 60,
    rewards: {}
  },
  {
    id: 'cricket_draw_spice',
    gameType: 'cricket',
    trigger: 'draw',
    label: '平局香包',
    summary: '平局时有机会拿到一点香料。',
    weight: 25,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 1 }] }
  },
  {
    id: 'cricket_draw_caravan_ticket',
    gameType: 'cricket',
    trigger: 'draw',
    label: '平局周转票',
    summary: '平局时低概率补发商路票。',
    weight: 15,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'cricket_lose_none',
    gameType: 'cricket',
    trigger: 'lose',
    label: '败局离场',
    summary: '落败后大多没有补偿。',
    weight: 90,
    rewards: {}
  },
  {
    id: 'cricket_lose_spice',
    gameType: 'cricket',
    trigger: 'lose',
    label: '败者香囊',
    summary: '偶尔发放少量香料。',
    weight: 10,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 1 }] }
  },
  {
    id: 'cardflip_win_none',
    gameType: 'cardflip',
    trigger: 'win',
    label: '翻宝收桌',
    summary: '翻中宝牌后大多数情况没有附加奖励。',
    weight: 45,
    rewards: {}
  },
  {
    id: 'cardflip_win_map',
    gameType: 'cardflip',
    trigger: 'win',
    label: '暗格藏宝图',
    summary: '小概率再拿到一张藏宝图，延伸去遗迹线。',
    weight: 15,
    rewards: { items: [{ itemId: 'hanhai_map', quantity: 1 }] }
  },
  {
    id: 'cardflip_win_turquoise',
    gameType: 'cardflip',
    trigger: 'win',
    label: '翻出青玉',
    summary: '有机会翻出绿松石。',
    weight: 20,
    rewards: { items: [{ itemId: 'hanhai_turquoise', quantity: 1 }] }
  },
  {
    id: 'cardflip_win_exhibit_ticket',
    gameType: 'cardflip',
    trigger: 'win',
    label: '奇观展票',
    summary: '有机会折算为展陈券。',
    weight: 20,
    rewards: { ticketRewards: { exhibit: 1 } }
  },
  {
    id: 'cardflip_lose_none',
    gameType: 'cardflip',
    trigger: 'lose',
    label: '空牌作罢',
    summary: '翻到空牌时通常没有别的收获。',
    weight: 85,
    rewards: {}
  },
  {
    id: 'cardflip_lose_caravan_ticket',
    gameType: 'cardflip',
    trigger: 'lose',
    label: '翻空补票',
    summary: '低概率补发一张商路票。',
    weight: 15,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'texas_win_none',
    gameType: 'texas',
    trigger: 'win',
    label: '牌桌散场',
    summary: '扑克收桌后大多数时候只有筹码回收。',
    weight: 40,
    rewards: {}
  },
  {
    id: 'texas_win_caravan_ticket',
    gameType: 'texas',
    trigger: 'win',
    label: '牌桌商路票',
    summary: '扑克盈利可折算成商路票。',
    weight: 25,
    rewards: { ticketRewards: { caravan: 2 } }
  },
  {
    id: 'texas_win_showcase_pack',
    gameType: 'texas',
    trigger: 'win',
    label: '高桌陈列包',
    summary: '偶尔带回丝货与展陈券。',
    weight: 20,
    rewards: {
      items: [{ itemId: 'hanhai_silk', quantity: 1 }],
      ticketRewards: { exhibit: 1 }
    }
  },
  {
    id: 'texas_win_map',
    gameType: 'texas',
    trigger: 'win',
    label: '牌桌线索图',
    summary: '小概率从桌友手里赢来藏宝图。',
    weight: 15,
    rewards: { items: [{ itemId: 'hanhai_map', quantity: 1 }] }
  },
  {
    id: 'buckshot_win_none',
    gameType: 'buckshot',
    trigger: 'win',
    label: '险胜散席',
    summary: '恶魔轮盘赢下后通常没有额外奖励。',
    weight: 50,
    rewards: {}
  },
  {
    id: 'buckshot_win_research_ticket',
    gameType: 'buckshot',
    trigger: 'win',
    label: '危险实验券',
    summary: '胜利后有机会获研究券。',
    weight: 20,
    rewards: { ticketRewards: { research: 1 } }
  },
  {
    id: 'buckshot_win_turquoise',
    gameType: 'buckshot',
    trigger: 'win',
    label: '险局青玉',
    summary: '胜利后偶尔带回绿松石。',
    weight: 15,
    rewards: { items: [{ itemId: 'hanhai_turquoise', quantity: 1 }] }
  },
  {
    id: 'buckshot_win_map',
    gameType: 'buckshot',
    trigger: 'win',
    label: '赌坊密图',
    summary: '小概率赢来一张藏宝图。',
    weight: 15,
    rewards: { items: [{ itemId: 'hanhai_map', quantity: 1 }] }
  },
  {
    id: 'buckshot_draw_none',
    gameType: 'buckshot',
    trigger: 'draw',
    label: '平局离场',
    summary: '平局时大多数只有本金返还。',
    weight: 70,
    rewards: {}
  },
  {
    id: 'buckshot_draw_caravan_ticket',
    gameType: 'buckshot',
    trigger: 'draw',
    label: '平局通路票',
    summary: '平局时有机会拿到商路票。',
    weight: 15,
    rewards: { ticketRewards: { caravan: 1 } }
  },
  {
    id: 'buckshot_draw_exhibit_ticket',
    gameType: 'buckshot',
    trigger: 'draw',
    label: '平局纪念票',
    summary: '平局时有机会拿到展陈券。',
    weight: 15,
    rewards: { ticketRewards: { exhibit: 1 } }
  },
  {
    id: 'buckshot_lose_none',
    gameType: 'buckshot',
    trigger: 'lose',
    label: '落败退场',
    summary: '落败时大多空手离开。',
    weight: 90,
    rewards: {}
  },
  {
    id: 'buckshot_lose_spice',
    gameType: 'buckshot',
    trigger: 'lose',
    label: '落败香囊',
    summary: '少量香料作为安慰。',
    weight: 10,
    rewards: { items: [{ itemId: 'hanhai_spice', quantity: 1 }] }
  }
]

export const HANHAI_OPERATION_TUNING_CONFIG = {
  featureFlags: {
    themeWeekFocusEnabled: true,
    questBoardBiasEnabled: true,
    crossSystemOverviewEnabled: true,
    hanhaiActionGuardEnabled: true,
    linkedVillageProjectLinkEnabled: true,
    recommendedCatalogEnabled: true
  },
  display: {
    featuredRouteLimit: 3,
    featuredContractLimit: 3,
    featuredRelicSetLimit: 3,
    recommendedCatalogOfferLimit: 3,
    recommendedActionLimit: 3,
    themeFocusLabelLimit: 4
  },
  progression: {
    tierUnlockInvestmentCountP1: 1,
    tierUnlockRelicClearsP1: 2,
    tierUnlockSetCompletionCountP2: 1,
    tierUnlockRelicClearsP2: 6,
    bossCycleOrder: ['dune_revenant', 'glass_scorpion', 'sunken_colossus', 'sandstorm_wyrm']
  },
  rewards: {
    relicExploreMoneyMultiplier: 1,
    relicMilestoneMapRewardQuantity: 1,
    treasureMapMoneyMultiplier: 1,
    shopWeeklyLimitMultiplier: 1
  },
  operations: {
    maxQuestBiasStrength: 4,
    linkedVillageProjectBiasBonus: 1,
    recommendedCatalogTagMatchBonus: 1,
    activeBossQuestBiasBonus: 1
  },
  casino: {
    maxDailyBets: 10,
    rouletteBetTiers: [100, 500, 1000],
    diceBetAmount: 200,
    cupBetAmount: 200,
    cricketBetAmount: 300,
    cardBetAmount: 400,
    buckshotBetAmount: 500,
    unlockCost: 100000
  }
} as const

export const pickWeightedRewardBundle = <T extends HanhaiWeightedRewardBundle>(bundles: T[]): T | null => {
  const normalized = bundles.filter(bundle => (Number(bundle.weight) || 0) > 0)
  if (normalized.length === 0) return null
  const totalWeight = normalized.reduce((sum, bundle) => sum + Math.max(0, Number(bundle.weight) || 0), 0)
  if (totalWeight <= 0) return normalized[0] ?? null

  let roll = Math.random() * totalWeight
  for (const bundle of normalized) {
    roll -= Math.max(0, Number(bundle.weight) || 0)
    if (roll <= 0) return bundle
  }
  return normalized[normalized.length - 1] ?? null
}

/** 轮盘赔率 */
export const ROULETTE_OUTCOMES: RouletteOutcome[] = [
  { label: '空', multiplier: 0, chance: 72 },
  { label: '双倍', multiplier: 2, chance: 18 },
  { label: '三倍', multiplier: 3, chance: 7 },
  { label: '五倍', multiplier: 5, chance: 3 }
]

/** 轮盘投注档位 */
export const ROULETTE_BET_TIERS = HANHAI_OPERATION_TUNING_CONFIG.casino.rouletteBetTiers

/** 骰子投注金额 */
export const DICE_BET_AMOUNT = HANHAI_OPERATION_TUNING_CONFIG.casino.diceBetAmount

/** 每天最大赌博次数 */
export const MAX_DAILY_BETS = HANHAI_OPERATION_TUNING_CONFIG.casino.maxDailyBets

/** 解锁瀚海所需费用 */
export const HANHAI_UNLOCK_COST = HANHAI_OPERATION_TUNING_CONFIG.casino.unlockCost

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
export const CUP_BET_AMOUNT = HANHAI_OPERATION_TUNING_CONFIG.casino.cupBetAmount

/** 猜杯倍率 */
export const CUP_WIN_MULTIPLIER = 3

/** 猜杯游戏：球藏在哪个杯子下 */
export const playCupRound = (): { correctCup: number } => {
  return { correctCup: Math.floor(Math.random() * 3) }
}

// ==================== 斗蛐蛐 ====================

/** 斗蛐蛐投注金额 */
export const CRICKET_BET_AMOUNT = HANHAI_OPERATION_TUNING_CONFIG.casino.cricketBetAmount

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
export const CARD_BET_AMOUNT = HANHAI_OPERATION_TUNING_CONFIG.casino.cardBetAmount

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
export const BUCKSHOT_BET_AMOUNT = HANHAI_OPERATION_TUNING_CONFIG.casino.buckshotBetAmount

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

export const WS08_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '瀚海关键平衡参数、展示数量、阶段阈值、奖励倍率与赌坊下注配置必须统一收口在 data tuning config，不应散落写死在 store / view 临时变量里。',
    '主题周焦点、告示板偏置、跨系统总览、目录承接推荐与事务锁必须支持通过 feature flag 快速降级，异常时可在不改主逻辑的前提下关闭。',
    'Boss 周期、阶段阈值、遗迹 / 藏宝图 / 商店奖励倍率调整后，仍需维持“有净消耗、有风险决策、有跨系统出口”的后期经营口径。',
    '旧档缺少瀚海运行时锁、调参字段或主题周 `weekOfSeason` 时，必须能安全回填默认值，且不影响周切换、结算与读档稳定性。'
  ],
  releaseAnnouncement: [
    '【瀚海运营】已新增 `HANHAI_OPERATION_TUNING_CONFIG`，主题周焦点、展示数量、阶段阈值、奖励倍率、告示板偏置与赌坊参数均可直接热调。',
    '【联动降级】瀚海主题周聚焦、告示板偏置、跨系统总览、目录承接推荐与事务锁现已接入 feature flag，异常活动可快速降级。',
    '【发布资料】WS08 已补齐 QA 用例、上线检查项、补偿预案与公告文案，可直接供 QA / 运营验收和上线沟通复用。'
  ]
} as const

export const WS08_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws08-positive-theme-focus-overview',
    title: '主题周焦点可正确驱动瀚海跨系统总览',
    category: 'positive',
    steps: ['切换到带 `hanhaiFocusRouteIds` / `hanhaiFocusRelicSiteIds` / `hanhaiFocusBossCycleIds` 的主题周', '打开 HanhaiView 并检查跨系统总览、推荐动作与告示板提示'],
    expectedResult: '主题周焦点、Boss / 合同 / 套组 / 货架焦点、推荐动作与告示板提示同步展示，且展示数量受 display 配置限制。'
  },
  {
    id: 'ws08-positive-display-limits',
    title: '展示条数与推荐数量可通过 display 配置热调',
    category: 'positive',
    steps: ['调整 `featuredRouteLimit`、`featuredContractLimit`、`featuredRelicSetLimit`、`recommendedCatalogOfferLimit`、`recommendedActionLimit`', '刷新瀚海页面与目录推荐区块'],
    expectedResult: '商路 / 合同 / 套组 / 目录推荐 / 推荐动作展示条数按新配置变化，无需改动 store / view 主逻辑。'
  },
  {
    id: 'ws08-positive-progression-boss-order',
    title: '阶段阈值与 Boss 顺序跟随 progression 配置生效',
    category: 'positive',
    steps: ['调整 `tierUnlockInvestmentCountP1`、`tierUnlockRelicClearsP1`、`tierUnlockSetCompletionCountP2`、`tierUnlockRelicClearsP2` 与 `bossCycleOrder`', '推动周切换并观察 `processCycleTick()` 输出'],
    expectedResult: '瀚海 progress tier 与本周 Boss 顺序按新配置推进，日志、总览与页面展示口径一致。'
  },
  {
    id: 'ws08-positive-reward-and-casino-tuning',
    title: '奖励倍率、周限购与赌坊参数可通过配置热调',
    category: 'positive',
    steps: ['调整 `relicExploreMoneyMultiplier`、`relicMilestoneMapRewardQuantity`、`treasureMapMoneyMultiplier`、`shopWeeklyLimitMultiplier`、`maxDailyBets` 与下注金额配置', '执行遗迹勘探、驻点领奖、藏宝图、驿站商店购买与赌坊玩法'],
    expectedResult: '奖励倍率、周限购、每日下注次数与投注金额按配置生效，无需改动业务结算逻辑。'
  },
  {
    id: 'ws08-boundary-bias-cap',
    title: '告示板偏置强度不会突破上限',
    category: 'boundary',
    steps: ['同时激活多条商路 / 合同 / 套组 / 主题周焦点，并保留可用联动村庄项目与目录推荐', '检查 `questBoardBiasProfile.biasStrength` 与提示文本'],
    expectedResult: '`biasStrength` 不会超过 `maxQuestBiasStrength`，且告示板 / 特殊订单提示仍保持可解释。'
  },
  {
    id: 'ws08-ops-disable-quest-bias',
    title: '关闭告示板偏置后任务链路自动降级',
    category: 'ops',
    steps: ['将 `HANHAI_OPERATION_TUNING_CONFIG.featureFlags.questBoardBiasEnabled` 设为 `false`', '刷新告示板与特殊订单'],
    expectedResult: '瀚海不再额外影响任务 / 订单偏置，但瀚海页面其余进度、Boss 与收益展示保持正常。'
  },
  {
    id: 'ws08-ops-disable-overview-and-catalog',
    title: '关闭跨系统总览与目录承接后页面仍可安全降级',
    category: 'ops',
    steps: ['将 `crossSystemOverviewEnabled` 与 `recommendedCatalogEnabled` 设为 `false`', '打开 HanhaiView 并检查跨系统总览与目录承接推荐'],
    expectedResult: '跨系统总览退化为基础空结构，目录承接推荐返回空数组，页面不报错也不出现脏提示。'
  },
  {
    id: 'ws08-compatibility-old-save-tuning-defaults',
    title: '旧档缺少调参与运行时字段时可安全读档',
    category: 'compatibility',
    steps: ['读取未包含 `hanhaiActionLocks`、调参驱动扩展字段或旧主题周 `weekOfSeason` 字段的旧档', '进入瀚海页并触发一次周切换或遗迹勘探'],
    expectedResult: '读档成功，运行时锁为空，主题周与瀚海循环按默认值回填，相关结算可正常执行。'
  },
  {
    id: 'ws08-recovery-rollback-and-lock-cleanup',
    title: '瀚海高频操作异常时会回滚并释放运行时锁',
    category: 'recovery',
    steps: ['在开发态模拟 `exploreRelicSite()`、`useTreasureMap()` 或赌坊结算中途抛错', '重复触发同一操作并检查 `hanhaiActionLocks`'],
    expectedResult: '玩家 / 背包 / 钱包 / 瀚海状态回滚到操作前，锁在 `finally` 中被释放，恢复后可再次正常操作且不会重复发奖。'
  }
]

export const WS08_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws08-check-theme-focus', label: '确认主题周焦点、跨系统总览与推荐动作展示口径一致', owner: 'design', done: false },
  { id: 'ws08-check-hot-tuning', label: '确认瀚海展示数量、阶段阈值、奖励倍率与赌坊参数可通过配置热调', owner: 'dev', done: false },
  { id: 'ws08-check-boss-cycle', label: '确认周切换后的 Boss 顺序、阶段推进与日志输出符合 progression 配置', owner: 'qa', done: false },
  { id: 'ws08-check-guard-and-compatibility', label: '确认异常回滚、运行时锁释放与旧档兼容读档稳定', owner: 'qa', done: false },
  { id: 'ws08-check-ops-docs', label: '确认 feature flag、补偿预案、公告文案与 changelog / TODO / 索引同步完成', owner: 'ops', done: false }
]

export const WS08_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws08-compensate-reward-multiplier-error',
    trigger: '遗迹、藏宝图、赌坊或驿站商店倍率配置异常，导致瀚海产出或消耗明显偏离预期。',
    compensation: ['按日志、周快照与购买/领奖记录补发或回收异常差值', '保留玩家已合法完成的周循环推进与套组收集进度'],
    notes: '优先依据 `hanhai_cycle_tick` 日志、遗迹记录、每日下注次数与商店购买记录定位异常窗口。'
  },
  {
    id: 'ws08-compensate-boss-cycle-bias-misconfig',
    trigger: 'Boss 顺序、阶段阈值或告示板偏置配置异常，导致主题周焦点、任务筹备或周循环路线长期错误。',
    action: '回调 `HANHAI_OPERATION_TUNING_CONFIG.progression` / `operations` / `featureFlags` 对应字段，并通过更新日志与公告说明修正口径。'
  },
  {
    id: 'ws08-compensate-rollback-lock-residue',
    trigger: '瀚海高频操作异常回滚失败或运行时锁残留，导致玩家少领、重复领奖或无法继续操作。',
    compensation: ['补发缺失的铜钱 / 票券 / 藏宝图 / 异域材料', '人工清理对应操作锁并重置异常遗迹、赌坊或里程碑状态'],
    notes: '以 `player / inventory / wallet / hanhai` 快照、结构化日志与对应领奖状态为准核算。'
  }
]

export const WS08_RELEASE_ANNOUNCEMENT = [
  '【瀚海运营】已新增 `HANHAI_OPERATION_TUNING_CONFIG`，主题周焦点、展示数量、阶段阈值、奖励倍率、告示板偏置与赌坊参数均可直接热调。',
  '【联动降级】瀚海主题周聚焦、告示板偏置、跨系统总览、目录承接推荐与事务锁现已接入 feature flag，异常活动可快速降级。',
  '【发布资料】WS08 已补齐 QA 用例、上线检查项、补偿预案与公告文案，可直接供 QA / 运营验收和上线沟通复用。'
] as const
