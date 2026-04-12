import type {
  EconomyBaselineAuditConfig,
  GuidanceDigestState,
  GuidanceLoopLinkDef,
  GuidancePanelSummaryDef,
  GuidanceRecommendationRouteDef,
  GuidanceRouteContentVariantDef,
  GuidanceSummaryContentVariantDef,
  QaCaseDef,
  ReleaseChecklistItem,
  CompensationPlan
} from '@/types'

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

export const WS11_UI_GUIDANCE_BASELINE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'ws11_t101_ui_guidance_baseline_audit',
  workstreamId: 'WS11-T101',
  label: 'UI 引导、推荐系统与信息层级补强基线审计',
  summary: '围绕后期推荐面板、通胀提示、主题周摘要、活动倒计时和成长建议建立统一 KPI 口径，确保提示系统帮助玩家理解而不是把界面堆成公告板。',
  focusAreas: ['高阶页面停留时间', '目标点击率', '推荐任务采纳率', '迷失反馈下降'],
  coreMetrics: [
    {
      id: 'ws11_high_tier_page_dwell_ratio',
      label: '高阶页面停留时间占比',
      description: '衡量玩家在后期关键页面是否会停留足够久阅读推荐，而不是秒进秒出看不懂。',
      formula: '近14日 Wallet / Quest / Breeding / Museum / Shop 等高阶页面的中位停留时间 ÷ 近14日全部功能页中位停留时间',
      direction: 'lower_is_worse',
      dataSources: ['useTutorialStore.visitedPanels', 'WalletView / QuestView / BreedingView / MuseumView / ShopView 访问轨迹', '主题周与活动摘要展示入口'],
      thresholds: { watch: 0.7, warning: 0.55, critical: 0.4 },
      anomalyRule: '若版本首周大量玩家仅为看一眼新页面而短暂打开，需要拆分首次访问与重复访问样本，避免把“新鲜感点开”误判为看不懂。'
    },
    {
      id: 'ws11_goal_clickthrough_rate',
      label: '目标点击率',
      description: '衡量推荐目标、主题周摘要和活动提示是否真的能引导玩家继续采取行动。',
      formula: '近14日从推荐摘要、目标规划或风险提示跳转到对应页面并发生后续操作的次数 ÷ 近14日推荐摘要展示次数',
      direction: 'lower_is_worse',
      dataSources: ['TopGoalsPanel 展示', 'QuestView / WalletView / ShopView / BreedingView 导航行为', 'useTutorialStore.flags / visitedPanels'],
      thresholds: { watch: 0.34, warning: 0.24, critical: 0.16 },
      anomalyRule: '若推荐曝光明显增加但点击率下滑，需要优先检查推荐文本是否过长、入口是否堆叠，而不是先增加奖励。'
    },
    {
      id: 'ws11_recommended_route_adoption_rate',
      label: '推荐路线采纳率',
      description: '衡量推荐目录、活动承接、陪伴承接与主题周建议是否真的改变玩家本周路线。',
      formula: '近14日按推荐摘要进入并完成至少1次推荐动作（接取活动任务、购买推荐目录、推进推荐杂交 / 展陈 / 瀚海动作）的玩家数 ÷ 近14日查看过推荐摘要的玩家数',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.recommendedCatalogOffers', 'useQuestStore.marketQuestBiasProfile', 'useBreedingStore.companionshipBreedingFocus', 'useMuseumStore.crossSystemOverview', 'useHanhaiStore.crossSystemOverview'],
      thresholds: { watch: 0.36, warning: 0.26, critical: 0.18 },
      anomalyRule: '若某条推荐路线本身尚未落内容，应从采纳率口径中剔除，避免把空入口误判为玩家不接受推荐。'
    },
    {
      id: 'ws11_lost_feedback_reduction_rate',
      label: '迷失反馈下降率',
      description: '衡量风险提示、活动摘要和推荐目标是否减少“钱很多但不知道做什么”的迷失感。',
      formula: '近14日触发“高风险 / 观察中 / 无明确推荐”后，次日仍无新增系统参与的玩家数 ÷ 近14日触发该类迷失信号的玩家数',
      direction: 'lower_is_worse',
      dataSources: ['WalletView 风险提示', 'goalStore.recommendedEconomySinks', 'event campaign summaries', 'weeklyMetricArchive'],
      thresholds: { watch: 0.62, warning: 0.48, critical: 0.35 },
      anomalyRule: '若活动层刚切换导致推荐入口短期波动，需拆分活动周和常规周样本，否则容易高估迷失率。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'ws11_announcement_wall_ratio',
      label: '公告墙密度',
      description: '防止把推荐、主题周、活动、风险提示全部堆到同一屏，变成公告板。',
      formula: '单页同时显示的高优先级摘要块数量 ÷ 单页推荐容量上限',
      direction: 'higher_is_worse',
      dataSources: ['QuestView / WalletView / ShopView / TopGoalsPanel 摘要块数量', 'useTutorialStore.enabled'],
      thresholds: { watch: 0.7, warning: 0.85, critical: 1 },
      anomalyRule: '若活动周确实需要更多说明，必须确认展示块彼此不重复、且玩家能通过折叠或跳转快速消化。'
    },
    {
      id: 'ws11_recommendation_conflict_ratio',
      label: '推荐冲突率',
      description: '防止同一页面同时出现互相矛盾的推荐，例如“继续囤钱”和“立刻大额消费”并列。',
      formula: '近14日同一页面同一时段中出现 2 条以上互斥推荐的次数 ÷ 近14日推荐摘要展示总次数',
      direction: 'higher_is_worse',
      dataSources: ['goalStore.recommendedEconomySinks', 'shopStore.recommendedCatalogOffers', 'questStore.marketQuestBiasProfile', 'tutorial hints'],
      thresholds: { watch: 0.08, warning: 0.15, critical: 0.25 },
      anomalyRule: '若冲突来自跨系统推荐并列，需要优先补层级分组和优先级，而不是简单删掉其中一条。'
    }
  ],
  playerSegments: [
    {
      id: 'ws11_segment_late_builder',
      label: '后期扩建玩家',
      description: '已进入后期，需要通过推荐摘要理解钱该花到哪里、周该怎么排。',
      disposableMoneyMin: 50000,
      inflationPressureMin: 0.18,
      recommendedFocus: '优先观察高阶页面停留时间与迷失反馈下降率。'
    },
    {
      id: 'ws11_segment_event_operator',
      label: '活动承接玩家',
      description: '会同时处理主题周、活动任务、活动邮件与多系统推荐的活动承接型玩家。',
      disposableMoneyMin: 80000,
      inflationPressureMin: 0.24,
      recommendedFocus: '重点看目标点击率、推荐路线采纳率与推荐冲突率。'
    },
    {
      id: 'ws11_segment_endgame_planner',
      label: '终局规划玩家',
      description: '会跨 Wallet / Quest / Breeding / Museum / Shop 等页面做整周决策的终局规划型玩家。',
      disposableMoneyMin: 120000,
      inflationPressureMin: 0.3,
      recommendedFocus: '重点看活动摘要、风险提示与跨系统推荐是否形成统一的决策面板。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws11_guidance_soft_rollback',
      label: '信息层级软回滚',
      condition: '连续2个观测周中 ws11_announcement_wall_ratio ≥ 0.85，且 ws11_goal_clickthrough_rate ≤ 0.24 或 ws11_recommendation_conflict_ratio ≥ 0.15',
      fallbackAction: '暂停继续追加新的高优先级摘要块，回退到主题周 + 风险提示 + 单条主推荐的轻量模式，并优先修正推荐优先级与折叠逻辑。'
    }
  ],
  linkedSystems: ['goal', 'quest', 'shop', 'breeding', 'system'],
  linkedSystemRefs: [
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'currentThemeWeekGoals', 'recommendedEconomySinks', 'currentEventCampaign'],
      rationale: '主题周摘要、活动摘要和目标规划是后期推荐层的主入口。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['marketQuestBiasProfile', 'currentLimitedTimeQuestCampaign', 'specialOrder'],
      rationale: '任务板和限时任务窗口是推荐目标最直接的承接页。'
    },
    {
      system: 'shop',
      storeId: 'useShopStore',
      touchpoints: ['recommendedCatalogOffers', 'activityCampaignOfferRecommendations', 'marketDynamicsOverview'],
      rationale: '资金去向提示与目录推荐决定玩家是否理解“为什么现在该花钱”。'
    },
    {
      system: 'breeding',
      storeId: 'useBreedingStore',
      touchpoints: ['recommendedHybrids', 'companionshipBreedingFocus'],
      rationale: '成长建议需要能落到具体培育路线，而不是只停在抽象提醒。'
    },
    {
      system: 'system',
      storeId: 'useTutorialStore',
      touchpoints: ['shownTipIds', 'visitedPanels', 'flags'],
      rationale: '教程与面板访问轨迹是判断提示是否真的帮助玩家理解的基础信号。'
    }
  ]
}

export const WS11_GUIDANCE_PANEL_SUMMARY_DEFS: GuidancePanelSummaryDef[] = [
  {
    id: 'ws11_wallet_sink_summary',
    surfaceId: 'wallet',
    title: '资金去向摘要',
    description: '把通胀压力、风险提示与推荐资金去向统一压缩成一张后期经营摘要卡。',
    unlockTier: 'P0',
    sourceType: 'economy',
    linkedSystems: ['goal', 'shop'],
    actionLabel: '查看钱袋'
  },
  {
    id: 'ws11_quest_activity_summary',
    surfaceId: 'quest',
    title: '活动与主题周摘要',
    description: '把主题周、活动编排、限时任务窗口和特殊订单风向统一放到任务页头部。',
    unlockTier: 'P0',
    sourceType: 'activity',
    linkedSystems: ['goal', 'quest', 'mail'],
    actionLabel: '查看任务'
  },
  {
    id: 'ws11_breeding_growth_summary',
    surfaceId: 'breeding',
    title: '成长建议摘要',
    description: '把育种推荐、订单建议和陪伴承接放到同一块，减少图鉴深挖时的信息迷失。',
    unlockTier: 'P1',
    sourceType: 'growth',
    linkedSystems: ['breeding', 'quest', 'goal'],
    actionLabel: '查看育种'
  },
  {
    id: 'ws11_fishpond_cycle_summary',
    surfaceId: 'fishpond',
    title: '鱼塘经营摘要',
    description: '把鱼塘待收产物、成熟鱼与经营提醒集中在页面顶部，减少中后期巡检遗漏。',
    unlockTier: 'P1',
    sourceType: 'growth',
    linkedSystems: ['fishPond', 'goal', 'system'],
    actionLabel: '查看鱼塘'
  },
  {
    id: 'ws11_museum_focus_summary',
    surfaceId: 'museum',
    title: '展陈焦点摘要',
    description: '把展陈焦点、委托承接和主题周展陈建议压缩成一条可执行提示。',
    unlockTier: 'P1',
    sourceType: 'theme_week',
    linkedSystems: ['museum', 'goal', 'quest'],
    actionLabel: '查看博物馆'
  },
  {
    id: 'ws11_guild_season_summary',
    surfaceId: 'guild',
    title: '公会赛季摘要',
    description: '把赛季焦点、可领取奖励和周目标提醒压缩成一条赛季经营提示。',
    unlockTier: 'P1',
    sourceType: 'theme_week',
    linkedSystems: ['guild', 'goal', 'quest'],
    actionLabel: '查看公会'
  },
  {
    id: 'ws11_hanhai_cycle_summary',
    surfaceId: 'hanhai',
    title: '瀚海终局摘要',
    description: '把遗迹推进、商路承接和终局推荐动作收束到瀚海页顶部。',
    unlockTier: 'P1',
    sourceType: 'economy',
    linkedSystems: ['hanhai', 'goal', 'shop'],
    actionLabel: '查看瀚海'
  },
  {
    id: 'ws11_npc_companion_summary',
    surfaceId: 'npc',
    title: '陪伴关系摘要',
    description: '把家庭心愿、知己协作和陪伴循环提醒压缩成一条关系经营摘要。',
    unlockTier: 'P1',
    sourceType: 'growth',
    linkedSystems: ['social', 'goal', 'breeding'],
    actionLabel: '查看关系'
  },
  {
    id: 'ws11_shop_route_summary',
    surfaceId: 'shop',
    title: '目录承接摘要',
    description: '把目录推荐、活动承接包与市场风险提示集中到商店页顶部。',
    unlockTier: 'P0',
    sourceType: 'risk',
    linkedSystems: ['shop', 'goal', 'quest'],
    actionLabel: '查看商店'
  },
  {
    id: 'ws11_mail_digest_summary',
    surfaceId: 'mail',
    title: '活动邮件摘要',
    description: '把活动邮件、可领奖邮件和当前活动说明做成统一摘要入口。',
    unlockTier: 'P1',
    sourceType: 'activity',
    linkedSystems: ['mail', 'goal', 'quest'],
    actionLabel: '查看邮箱'
  },
  {
    id: 'ws11_top_goals_digest',
    surfaceId: 'top_goals',
    title: '周目标与活动摘要',
    description: '把主题周、活动节奏和长线目标统一放到顶部目标规划面板。',
    unlockTier: 'P0',
    sourceType: 'theme_week',
    linkedSystems: ['goal', 'system'],
    actionLabel: '查看目标'
  }
]

export const WS11_GUIDANCE_RECOMMENDATION_ROUTE_DEFS: GuidanceRecommendationRouteDef[] = [
  {
    id: 'ws11_route_budget_to_shop',
    surfaceId: 'wallet',
    label: '钱袋 → 商店目录',
    description: '当风险提示和资金去向同时出现时，把玩家引导到对应目录与服务承接。',
    unlockTier: 'P0',
    linkedSystems: ['goal', 'shop'],
    rationale: '帮助玩家理解“为什么现在该花钱”。'
  },
  {
    id: 'ws11_route_theme_to_quest',
    surfaceId: 'quest',
    label: '主题周 → 活动任务',
    description: '把主题周焦点、活动编排和限时任务窗口串成一条可执行路线。',
    unlockTier: 'P0',
    linkedSystems: ['goal', 'quest', 'mail'],
    rationale: '帮助玩家理解“为什么本周要换玩法”。'
  },
  {
    id: 'ws11_route_growth_to_breeding',
    surfaceId: 'breeding',
    label: '成长建议 → 育种承接',
    description: '把图鉴成长、订单建议和陪伴承接合并为具体成长路线。',
    unlockTier: 'P1',
    linkedSystems: ['breeding', 'quest', 'goal'],
    rationale: '帮助玩家把抽象成长建议转成下一步操作。'
  },
  {
    id: 'ws11_route_focus_to_museum',
    surfaceId: 'museum',
    label: '主题周 → 展陈承接',
    description: '把馆区焦点、学者委托和展陈收益放到统一建议链路中。',
    unlockTier: 'P1',
    linkedSystems: ['museum', 'goal', 'quest'],
    rationale: '帮助玩家理解展陈为什么值得持续维护。'
  }
]

export const WS11_GUIDANCE_SUMMARY_CONTENT_DEFS: GuidanceSummaryContentVariantDef[] = [
  {
    id: 'ws11_wallet_risk_report',
    summaryId: 'ws11_wallet_sink_summary',
    priority: 100,
    entityType: 'digest',
    headlineTemplate: '{riskSummary}',
    detailTemplates: ['{segmentFocus}', '推荐去向：{sinkNames}', '商店目录可承接 {recommendedOfferCount} 条推荐。'],
    linkedRouteIds: ['ws11_route_budget_to_shop']
  },
  {
    id: 'ws11_wallet_sink_catalog',
    summaryId: 'ws11_wallet_sink_summary',
    priority: 70,
    entityType: 'offer',
    headlineTemplate: '优先把资金投入 {sinkNames}。',
    detailTemplates: ['{segmentFocus}', '商店目录可承接 {recommendedOfferCount} 条推荐。'],
    linkedRouteIds: ['ws11_route_budget_to_shop']
  },
  {
    id: 'ws11_quest_event_campaign',
    summaryId: 'ws11_quest_activity_summary',
    priority: 100,
    entityType: 'campaign',
    headlineTemplate: '当前活动“{eventLabel}”正在主导任务页节奏。',
    detailTemplates: ['{activityDescription}', '{boardHint}', '{specialOrderHint}'],
    linkedRouteIds: ['ws11_route_theme_to_quest']
  },
  {
    id: 'ws11_quest_theme_week',
    summaryId: 'ws11_quest_activity_summary',
    priority: 80,
    entityType: 'goal',
    headlineTemplate: '本周主题“{themeWeekLabel}”已接入任务页摘要。',
    detailTemplates: ['{activityDescription}', '{boardHint}', '{specialOrderHint}'],
    linkedRouteIds: ['ws11_route_theme_to_quest']
  },
  {
    id: 'ws11_quest_special_order',
    summaryId: 'ws11_quest_activity_summary',
    priority: 72,
    entityType: 'order',
    headlineTemplate: '特殊订单正在牵引当前任务路线。',
    detailTemplates: ['{specialOrderHint}', '{boardHint}'],
    linkedRouteIds: ['ws11_route_theme_to_quest']
  },
  {
    id: 'ws11_breeding_family_wish',
    summaryId: 'ws11_breeding_growth_summary',
    priority: 92,
    entityType: 'goal',
    headlineTemplate: '{familyWishSummary}',
    detailTemplates: ['当前心愿：{familyWishTitle}', '{themeBreedingLabel}', '可直接查看 {recommendedHybridCount} 条推荐杂交目标。'],
    linkedRouteIds: ['ws11_route_growth_to_breeding']
  },
  {
    id: 'ws11_breeding_special_order',
    summaryId: 'ws11_breeding_growth_summary',
    priority: 86,
    entityType: 'order',
    headlineTemplate: '{familyWishSummary}',
    detailTemplates: ['特殊订单额外指向 {orderHybridCount} 条育种路线。', '{themeBreedingLabel}', '可直接查看 {recommendedHybridCount} 条推荐杂交目标。'],
    linkedRouteIds: ['ws11_route_growth_to_breeding']
  },
  {
    id: 'ws11_breeding_theme_focus',
    summaryId: 'ws11_breeding_growth_summary',
    priority: 70,
    entityType: 'goal',
    headlineTemplate: '{familyWishSummary}',
    detailTemplates: ['{themeBreedingLabel}', '可直接查看 {recommendedHybridCount} 条推荐杂交目标。'],
    linkedRouteIds: ['ws11_route_growth_to_breeding']
  },
  {
    id: 'ws11_museum_commission',
    summaryId: 'ws11_museum_focus_summary',
    priority: 88,
    entityType: 'hall',
    headlineTemplate: '当前展陈焦点：{museumHeadline}',
    detailTemplates: ['可承接 {commissionCount} 条学者委托。', '{museumBoardHint}', '{supportNpcSummary}'],
    linkedRouteIds: ['ws11_route_focus_to_museum']
  },
  {
    id: 'ws11_museum_theme_focus',
    summaryId: 'ws11_museum_focus_summary',
    priority: 70,
    entityType: 'hall',
    headlineTemplate: '当前展陈焦点：{museumHeadline}',
    detailTemplates: ['{museumBoardHint}', '{supportNpcSummary}'],
    linkedRouteIds: ['ws11_route_focus_to_museum']
  },
  {
    id: 'ws11_shop_market_route',
    summaryId: 'ws11_shop_route_summary',
    priority: 92,
    entityType: 'route',
    headlineTemplate: '市场正在推荐 {routeLabels}。',
    detailTemplates: ['目录推荐：{offerNames}', '本周热点：{hotspotLabels}', '当前阶段：{phaseLabel}'],
    linkedRouteIds: ['ws11_route_budget_to_shop']
  },
  {
    id: 'ws11_shop_catalog_offer',
    summaryId: 'ws11_shop_route_summary',
    priority: 72,
    entityType: 'offer',
    headlineTemplate: '当前目录推荐已经准备好承接资金去向。',
    detailTemplates: ['目录推荐：{offerNames}', '本周热点：{hotspotLabels}', '当前阶段：{phaseLabel}'],
    linkedRouteIds: ['ws11_route_budget_to_shop']
  },
  {
    id: 'ws11_mail_campaign_digest',
    summaryId: 'ws11_mail_digest_summary',
    priority: 78,
    entityType: 'campaign',
    headlineTemplate: '当前活动邮件摘要已准备好 {mailTemplateCount} 条模板。',
    detailTemplates: ['活动节奏：{campaignCadence}', '摘要模板：{mailTemplateTitles}', '{activityDescription}'],
    linkedRouteIds: ['ws11_route_theme_to_quest']
  },
  {
    id: 'ws11_top_goals_theme_week',
    summaryId: 'ws11_top_goals_digest',
    priority: 82,
    entityType: 'goal',
    headlineTemplate: '当前主题周：{themeWeekLabel}',
    detailTemplates: ['优先目标：{goalTitles}', '{eventDescription}', '配套资金去向：{sinkNames}'],
    linkedRouteIds: ['ws11_route_budget_to_shop', 'ws11_route_theme_to_quest']
  },
  {
    id: 'ws11_top_goals_event_campaign',
    summaryId: 'ws11_top_goals_digest',
    priority: 68,
    entityType: 'campaign',
    headlineTemplate: '当前活动：{eventLabel}',
    detailTemplates: ['优先目标：{goalTitles}', '{eventDescription}', '配套资金去向：{sinkNames}'],
    linkedRouteIds: ['ws11_route_budget_to_shop', 'ws11_route_theme_to_quest']
  }
]

export const WS11_GUIDANCE_ROUTE_CONTENT_DEFS: GuidanceRouteContentVariantDef[] = [
  {
    id: 'ws11_route_budget_offer',
    routeId: 'ws11_route_budget_to_shop',
    priority: 100,
    entityType: 'offer',
    summaryTemplate: '从资金去向“{sinkName}”直接承接到商店目录推荐“{offerName}”。'
  },
  {
    id: 'ws11_route_budget_market',
    routeId: 'ws11_route_budget_to_shop',
    priority: 72,
    entityType: 'route',
    summaryTemplate: '优先沿着 {routeLabels} 处理资金去向。'
  },
  {
    id: 'ws11_route_theme_campaign',
    routeId: 'ws11_route_theme_to_quest',
    priority: 96,
    entityType: 'campaign',
    summaryTemplate: '当前活动“{eventLabel}”已进入任务承接期，优先把主题周和限时委托串成一条路线。'
  },
  {
    id: 'ws11_route_theme_week',
    routeId: 'ws11_route_theme_to_quest',
    priority: 82,
    entityType: 'goal',
    summaryTemplate: '围绕本周主题“{themeWeekLabel}”安排任务板、限时窗口和特殊订单。'
  },
  {
    id: 'ws11_route_growth_family_wish',
    routeId: 'ws11_route_growth_to_breeding',
    priority: 90,
    entityType: 'goal',
    summaryTemplate: '家庭心愿“{familyWishTitle}”正在放大育种收益。'
  },
  {
    id: 'ws11_route_growth_order',
    routeId: 'ws11_route_growth_to_breeding',
    priority: 82,
    entityType: 'order',
    summaryTemplate: '特殊订单已指定 {orderHybridCount} 条育种承接方向，优先回到育种页推进。'
  },
  {
    id: 'ws11_route_growth_hybrid',
    routeId: 'ws11_route_growth_to_breeding',
    priority: 68,
    entityType: 'goal',
    summaryTemplate: '当前可直接推进 {recommendedHybridCount} 条推荐杂交路线。'
  },
  {
    id: 'ws11_route_museum_focus',
    routeId: 'ws11_route_focus_to_museum',
    priority: 86,
    entityType: 'hall',
    summaryTemplate: '{museumHeadline}'
  },
  {
    id: 'ws11_route_museum_commission',
    routeId: 'ws11_route_focus_to_museum',
    priority: 72,
    entityType: 'hall',
    summaryTemplate: '当前可承接 {commissionCount} 条学者委托，适合把展陈焦点转成稳定收益。'
  }
]

export const WS11_GUIDANCE_LOOP_LINK_DEFS: GuidanceLoopLinkDef[] = [
  {
    id: 'ws11_loop_wallet_shop',
    routeId: 'ws11_route_budget_to_shop',
    sourceSurfaceId: 'wallet',
    targetSurfaceId: 'shop',
    linkedSystems: ['goal', 'shop'],
    summaryTemplate: '先从资金去向判断本周要花在哪，再去商店目录承接“{targetHeadline}”。'
  },
  {
    id: 'ws11_loop_theme_quest',
    routeId: 'ws11_route_theme_to_quest',
    sourceSurfaceId: 'quest',
    targetSurfaceId: 'quest',
    linkedSystems: ['goal', 'quest', 'mail'],
    summaryTemplate: '围绕主题周与活动窗口，优先处理“{targetHeadline}”对应的任务路线。'
  },
  {
    id: 'ws11_loop_growth_breeding',
    routeId: 'ws11_route_growth_to_breeding',
    sourceSurfaceId: 'breeding',
    targetSurfaceId: 'breeding',
    linkedSystems: ['breeding', 'quest', 'goal'],
    summaryTemplate: '把成长建议转成育种推进，优先承接“{targetHeadline}”这条成长线。'
  },
  {
    id: 'ws11_loop_focus_museum',
    routeId: 'ws11_route_focus_to_museum',
    sourceSurfaceId: 'museum',
    targetSurfaceId: 'museum',
    linkedSystems: ['museum', 'goal', 'quest'],
    summaryTemplate: '将主题周焦点落到博物馆经营，优先完成“{targetHeadline}”相关展陈动作。'
  }
]

export const WS11_GUIDANCE_TUNING_CONFIG = {
  featureFlags: {
    surfaceDigestPanelEnabled: true,
    crossSystemLoopEnabled: true,
    summaryAutoRouteSyncEnabled: true,
    routeAutoSummarySyncEnabled: true,
    weeklyLoopLogEnabled: true,
    guidanceActionLockEnabled: true,
    surfaceViewTrackingEnabled: true
  },
  display: {
    maxDetailLineCount: 3,
    maxRouteCountPerSurface: 2,
    maxLoopActionCount: 3
  },
  operations: {
    p1RecommendedHybridThreshold: 1,
    p1CommissionThreshold: 1
  }
} as const

export const WS11_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    'UI 引导必须复用同一份 store snapshot 与 data 配置，不能回到页面各自拼公式与文案的旧模式。',
    '主题周、活动、资金去向、成长建议与展陈焦点必须能串成跨系统周决策链，而不是静态公告板。',
    '摘要采纳、路线采纳、提示收起与 digest 刷新必须具备幂等、防重入与旧档兼容能力。',
    '所有页面入口都必须能在 10 秒内告诉玩家本页当前重点、下一步承接路线与是否已有新提示。'
  ],
  releaseAnnouncement: [
    '【经营引导】钱包、任务、育种、博物馆与商店页面现已接入统一 guidance 面板，可直接看到本页要点与承接路线。',
    '【内容配置】首批资金去向、目录推荐、活动摘要、成长承接与展陈焦点文案已改为 data 配置驱动，后续可持续扩展。',
    '【周决策链】主题周、活动窗口、目录承接、成长建议与展陈焦点已串成可追踪的跨系统 weekly loop。'
  ]
} as const

export const WS11_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws11-positive-wallet-digest',
    title: '钱包页可展示资金去向引导与目录承接路线',
    category: 'positive',
    steps: ['进入后期阶段并打开 WalletView', '检查 guidance 面板的 headline、detail 与 route 状态'],
    expectedResult: '钱包页能正确显示资金去向摘要、目录承接路线，并支持采纳与收起。'
  },
  {
    id: 'ws11-positive-quest-digest',
    title: '任务页可展示主题周 / 活动 / 特殊订单摘要',
    category: 'positive',
    steps: ['准备主题周或活动窗口并打开 QuestView', '检查 guidance 面板与经营提示区'],
    expectedResult: '任务页顶部 guidance 面板能正确承接主题周、活动与特殊订单线索。'
  },
  {
    id: 'ws11-positive-breeding-digest',
    title: '育种页可展示成长承接与推荐杂交路线',
    category: 'positive',
    steps: ['准备至少 1 条 recommendedHybrids 或家庭心愿', '打开 BreedingView'],
    expectedResult: '育种页 guidance 面板能正确显示成长摘要、推荐路线与采纳状态。'
  },
  {
    id: 'ws11-positive-museum-digest',
    title: '博物馆页可展示展陈焦点与学者委托承接',
    category: 'positive',
    steps: ['准备 themeWeekFocus 或 scholar commission', '打开 MuseumView'],
    expectedResult: '博物馆页 guidance 面板能正确承接展陈焦点、馆务协力与推荐路线。'
  },
  {
    id: 'ws11-positive-shop-digest',
    title: '商店页可展示目录承接摘要与市场路线',
    category: 'positive',
    steps: ['准备 recommendedCatalogOffers 或 recommendedMarketDynamicsRoutes', '打开 ShopView'],
    expectedResult: '商店页 guidance 面板能正确显示目录摘要、市场路线与采纳状态。'
  },
  {
    id: 'ws11-boundary-weekly-refresh',
    title: '跨周切换时 guidance digest 与 weekly loop 稳定刷新',
    category: 'boundary',
    steps: ['推进到新周', '检查 `ensureGuidanceDigestFresh()`、guidance digest 状态与 weekly loop 日志'],
    expectedResult: 'digest 只刷新一次，active summary / route 与 weekly loop 日志保持一致。'
  },
  {
    id: 'ws11-compatibility-old-save',
    title: '旧档缺少 guidance 扩展字段时可安全读档',
    category: 'compatibility',
    steps: ['读取不包含 activeRouteIds / adoptedRouteIds / surfaceStates 的旧档', '打开任一 guidance 页面'],
    expectedResult: '旧档会安全回填默认值，页面与 digest 状态不报错。'
  },
  {
    id: 'ws11-recovery-duplicate-action',
    title: '重复点击采纳 / 收起不会造成 digest 状态错乱',
    category: 'recovery',
    steps: ['在任一 guidance 面板连续点击“记下要点”或“收起提示”', '检查 adopted / dismissed 状态'],
    expectedResult: '重复操作被幂等保护拦住，不会出现重复 route / summary 记录或锁残留。'
  }
]

export const WS11_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws11-check-surface-panels', label: '确认 Wallet / Quest / Breeding / Museum / Shop 五个页面都已接入 guidance 面板', owner: 'qa', done: false },
  { id: 'ws11-check-config-driven-copy', label: '确认 summary / route 文案由 `tutorials.ts` 配置生成，而不是页面硬编码', owner: 'dev', done: false },
  { id: 'ws11-check-weekly-loop', label: '确认跨周后会输出跨系统 weekly loop 日志，且与页面 guidance 一致', owner: 'qa', done: false },
  { id: 'ws11-check-ops-toggle', label: '确认 guidance tuning config 的显示数量、自动联动与周日志开关可安全调整', owner: 'ops', done: false },
  { id: 'ws11-check-old-save', label: '确认旧档 guidance digest 扩展字段能安全回填', owner: 'qa', done: false }
]

export const WS11_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws11-compensate-guidance-state-mismatch',
    trigger: 'guidance digest 刷新异常，导致页面 guidance 与实际主题周 / 活动状态错位',
    action: '回调 WS11 guidance tuning config，临时关闭 cross-system loop 或 surface panel，并重新刷新 digest 状态。',
    compensation: ['向玩家发放一封说明邮件，说明当前推荐层为展示问题，不影响实际收益与结算。'],
    notes: '优先依据 `ui_guidance_digest_refresh` 日志与 guidance debug snapshot 定位错位区间。'
  },
  {
    id: 'ws11-compensate-duplicate-adoption',
    trigger: '重复采纳或收起导致 guidance 状态异常膨胀',
    action: '重置异常 surface 的 guidance digest 扩展字段，并保留已完成的实际经营结果。',
    compensation: ['无需回收实际收益，只恢复 guidance 状态并在公告中说明已修复。']
  },
  {
    id: 'ws11-compensate-panel-noise',
    trigger: 'guidance 面板密度过高或跨系统 weekly loop 过长，影响页面可读性',
    action: '下调 `maxDetailLineCount`、`maxRouteCountPerSurface`、`maxLoopActionCount`，必要时关闭 weeklyLoopLogEnabled。'
  }
]

export const WS11_RELEASE_ANNOUNCEMENT = [
  '【经营引导】钱包、任务、育种、博物馆与商店页面已接入统一 guidance 面板，进入页面即可看到当前重点与下一步路线。',
  '【跨系统闭环】主题周、活动窗口、目录承接、成长建议与展陈焦点已串成 weekly loop，帮助玩家理解本周为什么要换玩法、为什么要花钱。',
  '【运营调节】guidance 的展示数量、自动联动与周日志均可通过 tuning config 调整，便于后续持续优化。'
] as const

export const createDefaultGuidanceDigestState = (): GuidanceDigestState => ({
  version: 2,
  activeSummaryIds: [],
  activeRouteIds: [],
  dismissedSummaryIds: [],
  adoptedSummaryIds: [],
  adoptedRouteIds: [],
  lastRefreshDayTag: '',
  currentThemeWeekId: null,
  currentCampaignId: null,
  lastViewedSurfaceId: null,
  surfaceStates: []
})
