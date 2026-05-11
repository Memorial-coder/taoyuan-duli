import type {
  VillageProjectAuditTaggedDef,
  VillageProjectBaselineAuditDefinition,
  VillageProjectFundingPhase,
  VillageProjectOperationalConfig,
  VillageProjectPlayerSegment,
  VillageProjectPhaseSegmentDefinition,
  VillageProjectPlayerSegmentDefinition
} from '@/types/villageProject'

// WS01 anchor: village projects are the existing world-restoration layer that can
// grow into route changes, service unlocks, and persistent village feedback.

export const VILLAGE_PROJECT_SAVE_VERSION = 2

export const VILLAGE_PROJECT_OPERATIONAL_CONFIG: VillageProjectOperationalConfig = {
  saveVersion: VILLAGE_PROJECT_SAVE_VERSION,
  defaultContentTier: 'P0',
  tierLabels: {
    P0: '中期过渡',
    P1: '后期扩建',
    P2: '终局展示'
  },
  tierRoadmap: {
    P0: '先验证第一批高价建设与基础区域功能解锁。',
    P1: '扩展阶段建设、维护需求与跨系统订单池变化。',
    P2: '接入终局展示、捐赠里程碑与区域功能升级。'
  },
  futureHooks: [
    {
      id: 'theme_week_rotations',
      label: '主题周轮换池',
      description: '为后续主题周偏置、节庆订单和区域活动轮换预留扩展位。',
      targetTier: 'P1'
    },
    {
      id: 'museum_wing_donations',
      label: '馆区捐赠里程碑',
      description: '为后续博物馆 / 学舍类捐赠项目预留多档奖励与展示空间扩展。',
      targetTier: 'P2'
    },
    {
      id: 'regional_service_routes',
      label: '区域服务线路',
      description: '为商路、服务站和村庄功能区 reroute / upgrade 预留配置。',
      targetTier: 'P2'
    }
  ],
  defaultState: {
    saveVersion: VILLAGE_PROJECT_SAVE_VERSION,
    contentTier: 'P0',
    buildMode: 'standard',
    unlockEffects: [],
    regionalEffects: [],
    maintenanceAutoRenew: false,
    maintenanceCycleDays: 7,
    donationAcceptedItemIds: []
  }
}

export const VILLAGE_PROJECT_PHASE_SEGMENTS: VillageProjectPhaseSegmentDefinition[] = [
  {
    id: 'bootstrap',
    name: '中期过渡期',
    villageProjectLevelRange: [0, 2],
    targetPlayer: '刚接触村庄建设联动、仍在验证第一批功能解锁价值的玩家。',
    focus: '确认首批项目能把材料、订单与线索探索串起来，而不是只做一次性消耗。',
    watchMetricIds: ['highValueProjectCompletionRate', 'villageFundingStageDistribution', 'systemImpactCoverage']
  },
  {
    id: 'expansion',
    name: '后期扩建期',
    villageProjectLevelRange: [3, 5],
    targetPlayer: '已经开始跨系统经营，需要更稳定的大额资金出口与阶段成长反馈的玩家。',
    focus: '观察高价建设是否真正带动任务池、展示位和跨系统参与度。',
    watchMetricIds: ['lateGameBuildParticipationRate', 'villageFundingStageDistribution', 'fundingStressRate']
  },
  {
    id: 'endgame',
    name: '终局资金池期',
    villageProjectLevelRange: [6, 99],
    targetPlayer: '拥有高额铜钱与多系统素材储备，需要长期目标与终局展示空间的玩家。',
    focus: '控制终局项目的投入强度，确保终局建设是体面的长期 sink，而不是硬性税负。',
    watchMetricIds: ['highValueProjectCompletionRate', 'projectMaterialRecoveryVolume', 'fundingStressRate']
  }
]

export const WS12_VILLAGE_PROJECT_GOVERNANCE_PRESET = {
  version: 1,
  maintenanceReceiptRetention: 24,
  compensationPriority: ['maintenance', 'donation'] as const,
  compatibilityTouchpoints: ['saveVersion', 'maintenanceStates', 'donationStates'] as const,
  rollbackPriority: ['maintenance_cost', 'donation_reward', 'project_unlock'] as const
} as const

export const WS12_VILLAGE_PROJECT_GOVERNANCE_CONTENT_DEFS = [
  {
    id: 'ws12_maintenance_watch',
    tier: 'mid_transition',
    label: '维护巡检台账',
    priceBand: {
      money: [500, 1500],
      timeMinutes: [5, 12]
    },
    outputBand: {
      coveredPlans: [1, 2],
      compensationReach: '单项目维护说明',
      compatibilityScope: ['maintenanceStates']
    },
    consumptionBand: {
      manualChecks: [1, 2],
      rollbackBudget: [1, 1],
      overdueTolerance: [0, 1]
    }
  },
  {
    id: 'ws12_donation_reconciliation',
    tier: 'late_growth',
    label: '捐献对账护栏',
    priceBand: {
      money: [1500, 5000],
      timeMinutes: [12, 25]
    },
    outputBand: {
      coveredPlans: [2, 4],
      compensationReach: '维护 + 捐献双链路说明',
      compatibilityScope: ['maintenanceStates', 'donationStates']
    },
    consumptionBand: {
      manualChecks: [2, 4],
      rollbackBudget: [1, 2],
      overdueTolerance: [0, 1]
    }
  },
  {
    id: 'ws12_release_project_stability_gate',
    tier: 'endgame_showcase',
    label: '建设结算稳定闸门',
    priceBand: {
      money: [5000, 12000],
      timeMinutes: [25, 45]
    },
    outputBand: {
      coveredPlans: [4, 8],
      compensationReach: '全项目说明与补偿预案',
      compatibilityScope: ['saveVersion', 'maintenanceStates', 'donationStates']
    },
    consumptionBand: {
      manualChecks: [4, 8],
      rollbackBudget: [2, 3],
      overdueTolerance: [0, 0]
    }
  }
] as const

export const VILLAGE_PROJECT_PLAYER_SEGMENTS: VillageProjectPlayerSegmentDefinition[] = [
  {
    id: 'midgame_operator',
    name: '中期经营者',
    qualification: '村庄建设等级 0~2，且常备铜钱低于 6000 文。',
    focus: '重点验证前两档建设是否清晰易懂，避免早期被高价项目劝退。',
    watchMetricIds: ['lateGameBuildParticipationRate', 'fundingStressRate']
  },
  {
    id: 'capital_builder',
    name: '扩建型庄主',
    qualification: '村庄建设等级 3~5，或常备铜钱达到 6000~14999 文。',
    focus: '重点观察阶段建设、捐赠项目与跨系统联动是否能形成稳定周循环。',
    watchMetricIds: ['highValueProjectCompletionRate', 'villageFundingStageDistribution', 'systemImpactCoverage']
  },
  {
    id: 'endgame_patron',
    name: '终局投资人',
    qualification: '村庄建设等级 6+，或常备铜钱达到 15000 文以上。',
    focus: '重点观察终局资金池是否吸收巨额铜钱，同时不压垮任务、瀚海和公会循环。',
    watchMetricIds: ['highValueProjectCompletionRate', 'projectMaterialRecoveryVolume', 'fundingStressRate']
  }
]

export const VILLAGE_PROJECT_BASELINE_AUDIT: VillageProjectBaselineAuditDefinition = {
  coreMetrics: [
    {
      id: 'highValueProjectCompletionRate',
      name: '高价项目完成率',
      category: 'core',
      objective: '衡量后期 / 终局高价建设是否真的被玩家接受，而不是长期躺在列表里。',
      formula: '已完成的 expansion + endgame 项目数 ÷ 已开放的 expansion + endgame 项目数。',
      sampleWindow: '按周观察，重点看最近 7 天内已进入后期样本的玩家。',
      sourceStores: ['useVillageProjectStore', 'useQuestStore', 'useGoalStore'],
      linkedSystems: ['quest', 'goal', 'museum', 'guild', 'hanhai'],
      thresholds: {
        healthy: '>= 55%',
        warning: '35% ~ 54%',
        critical: '< 35%'
      },
      anomalyRule: '若开放率高但完成率低，优先检查价格带、前置项目链和联动反馈不足，不直接继续加价。'
    },
    {
      id: 'lateGameBuildParticipationRate',
      name: '后期玩家建设参与率',
      category: 'core',
      objective: '确认后期玩家是否把村庄建设当作稳定周目标，而非一次性点过。',
      formula: '最近 7 天内村庄建设等级达到 expansion 或完成任一 growth / endgame 联动项目的玩家数 ÷ 后期样本玩家数。',
      sampleWindow: '按周结观察，版本首周与第二周必须单独对比。',
      sourceStores: ['useVillageProjectStore', 'useQuestStore', 'useGuildStore', 'useHanhaiStore'],
      linkedSystems: ['quest', 'guild', 'hanhai'],
      thresholds: {
        healthy: '>= 60%',
        warning: '40% ~ 59%',
        critical: '< 40%'
      },
      anomalyRule: '若参与率低但铜钱储备高，说明建设线价值说明不足或入口反馈不够，不应先削玩家收益。'
    },
    {
      id: 'villageFundingStageDistribution',
      name: '村庄等级分布',
      category: 'core',
      objective: '观察玩家是否逐步进入扩建期和终局资金池期，避免大量玩家卡死在前几档。',
      formula: '分别统计 bootstrap / expansion / endgame 三档玩家占比，并追踪 expansion + endgame 总占比。',
      sampleWindow: '按周观察，版本灰度期间按批次拆分。',
      sourceStores: ['useVillageProjectStore', 'useGoalStore'],
      linkedSystems: ['goal', 'quest', 'museum'],
      thresholds: {
        healthy: 'expansion + endgame >= 50%，且单一档位不高于 70%',
        warning: 'expansion + endgame 为 35% ~ 49%，或 bootstrap 超过 70%',
        critical: 'expansion + endgame < 35%，或 bootstrap 超过 80%'
      },
      anomalyRule: '若玩家长期堆在 bootstrap 档，优先检查材料门槛、项目顺序与订单/展示联动是否断层。'
    },
    {
      id: 'projectMaterialRecoveryVolume',
      name: '项目材料回收量',
      category: 'core',
      objective: '确认建设线是否成功回收高储量材料，而不是只烧铜钱。',
      formula: '按周汇总已完成项目消耗的材料数量，并统计主要材料 itemId 的占比结构。',
      sampleWindow: '按周观察，至少保留最近 4 周趋势。',
      sourceStores: ['useVillageProjectStore', 'useMuseumStore', 'useHanhaiStore'],
      linkedSystems: ['museum', 'hanhai', 'quest'],
      thresholds: {
        healthy: '每周至少形成 2 个主材料回收热点，且单一材料占比 <= 65%',
        warning: '仅 1 个主材料热点，或单一材料占比为 66% ~ 80%',
        critical: '没有形成稳定回收热点，或单一材料占比 > 80%'
      },
      anomalyRule: '若材料回收过于集中，后续内容应扩别的项目需求，不要只重复堆同一种材料。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'fundingStressRate',
      name: '终局资金压力率',
      category: 'guardrail',
      objective: '防止终局项目把玩家现金流压到失去日常操作空间。',
      formula: '最近 7 天因铜钱不足或材料不足而未能开工的 expansion + endgame 项目尝试数 ÷ 同期项目尝试总数。',
      sampleWindow: '按周观察，并与版本前基线对比。',
      sourceStores: ['useVillageProjectStore', 'useQuestStore', 'useGuildStore', 'useHanhaiStore'],
      linkedSystems: ['quest', 'guild', 'hanhai'],
      thresholds: {
        healthy: '<= 25%',
        warning: '26% ~ 40%',
        critical: '> 40%'
      },
      anomalyRule: '若压力率升高，优先回退终局资金池价格斜率或前置材料密度，不额外叠加维护费。'
    },
    {
      id: 'systemImpactCoverage',
      name: '系统影响覆盖率',
      category: 'guardrail',
      objective: '确保建设完成后真的改变订单池、主题周、展示位、容量或新入口，而不是只给静态数值。',
      formula: '已完成项目中，带有 quest / goal / museum / guild / hanhai 任一明确联动标签的项目数 ÷ 已完成项目总数。',
      sampleWindow: '版本内持续观察，内容扩容时同步复核。',
      sourceStores: ['useVillageProjectStore', 'useGoalStore', 'useMuseumStore', 'useGuildStore', 'useHanhaiStore'],
      linkedSystems: ['quest', 'goal', 'museum', 'guild', 'hanhai'],
      thresholds: {
        healthy: '>= 70%',
        warning: '50% ~ 69%',
        critical: '< 50%'
      },
      anomalyRule: '若覆盖率下降，后续新增项目必须优先补功能变化与玩法入口，不能继续堆纯数值收益。'
    }
  ],
  phaseSegments: VILLAGE_PROJECT_PHASE_SEGMENTS,
  playerSegments: VILLAGE_PROJECT_PLAYER_SEGMENTS,
  rollbackRule: {
    id: 'endgame_funding_soft_rollback',
    name: '终局资金池软回滚',
    trigger: '连续 2 个周结窗口中，高价项目完成率低于 35%，且终局资金压力率高于 40%。',
    action: '暂停继续上调终局建设价格与维护需求；将 endgame 档项目的资金系数临时回退到 expansion 档目标带；保留已完成建设与已解锁入口，不做资产追缴。',
    recovery: '当后续 1 个完整周结窗口中，高价项目完成率恢复到 45% 以上且终局资金压力率回落到 30% 以下，再逐步恢复终局价格系数。',
    protectedState: '任何回滚都不得撤销玩家已完成项目、已消耗材料或已解锁的订单/展示功能。'
  }
}

export const getVillageProjectFundingPhase = (projectLevel: number): VillageProjectFundingPhase => {
  if (projectLevel >= 6) return 'endgame'
  if (projectLevel >= 3) return 'expansion'
  return 'bootstrap'
}

export const getVillageProjectPlayerSegment = (
  projectLevel: number,
  availableMoney: number
): VillageProjectPlayerSegment => {
  if (projectLevel >= 6 || availableMoney >= 15000) return 'endgame_patron'
  if (projectLevel >= 3 || availableMoney >= 6000) return 'capital_builder'
  return 'midgame_operator'
}

export const VILLAGE_PROJECT_DEFS: VillageProjectAuditTaggedDef[] = [
  {
    id: 'workbench_corner',
    name: '工台角',
    description: '把农舍旁的零散木料整理成正式工台，方便进行修补、木作与器具维护。',
    benefitSummary: '村庄建设起步项目，也让后续建设更有条理。',
    moneyCost: 1800,
    materials: [
      { itemId: 'wood', quantity: 35 },
      { itemId: 'bamboo', quantity: 12 },
      { itemId: 'stone', quantity: 15 }
    ],
    requiredClueId: 'zhao_mujiang_workbench',
    requiredClueText: '需要先从赵木匠处获得工台线索。',
    fundingPhase: 'bootstrap',
    linkedSystems: ['quest', 'goal'],
    auditTags: ['starter_sink', 'crafting_setup'],
    buildMode: 'standard',
    contentTier: 'P0',
    unlockEffects: [],
    regionalEffects: [],
    restorationProfile: {
      bundleIds: ['spring_bundle'],
      milestoneLabel: '工台与修补起步',
      preRumors: ['赵木匠最近总在念叨：再不把零散木料收成工台，后面的修补活会越堆越乱。'],
      postComments: ['赵木匠说工台角总算立住了，往后修器具和补木作都不用再临时借地方。'],
      crossEntryFeedback: ['家园设施页会开始把工台角和后续建设承接更稳定地挂出来。'],
      worldChanges: [
        {
          id: 'workbench_corner_entry_unlock',
          type: 'entry',
          title: '设施页承接更明确',
          summary: '家园与村庄建设入口开始稳定提示工台角相关建设，不再像一次性花钱后就沉底。',
          targetPanel: 'home'
        },
        {
          id: 'workbench_corner_dialogue_unlock',
          type: 'dialogue',
          title: '木作与修补闲谈开启',
          summary: '木匠系 NPC 会开始提起修补、器具维护和后续建设准备。'
        }
      ]
    }
  },
  {
    id: 'support_shed',
    name: '矿料棚与支架',
    description: '在农场边搭起稳固的矿料棚和支架，用来收纳矿材、工具与备用器具。',
    benefitSummary: '完成后可让村里的材料调度更顺，矿料类差事更好交接。',
    moneyCost: 2600,
    materials: [
      { itemId: 'wood', quantity: 45 },
      { itemId: 'stone', quantity: 30 },
      { itemId: 'iron_ore', quantity: 10 }
    ],
    requirements: [{ type: 'guildGoalCount', target: 1, label: '完成 1 个公会讨伐目标' }],
    requiredClueId: 'a_shi_support_clue',
    requiredClueText: '需要先从阿石处获得矿料棚与支架线索。',
    fundingPhase: 'bootstrap',
    linkedSystems: ['guild', 'quest'],
    auditTags: ['material_sink', 'guild_link'],
    buildMode: 'standard',
    contentTier: 'P0',
    unlockEffects: [],
    regionalEffects: [],
    restorationProfile: {
      bundleIds: ['ore_bundle'],
      milestoneLabel: '矿料调度起步',
      preRumors: ['阿石提过好几次，矿料不是不够，是散得太乱，少个像样的棚架就总会耽误差事。'],
      postComments: ['阿石说矿料棚撑起来后，矿材、器具和后勤交接总算能走一条顺路。'],
      crossEntryFeedback: ['公会和建设页会更明确点出矿料类承接，不再只剩一条抽象加成。'],
      worldChanges: [
        {
          id: 'support_shed_shortcut_unlock',
          type: 'shortcut',
          title: '矿料交接路线变短',
          summary: '农场边的矿料棚把矿材、支架和备用器具收拢到一处，日常调度明显更顺。'
        },
        {
          id: 'support_shed_service_unlock',
          type: 'service',
          title: '矿料后勤更稳定',
          summary: '矿料类差事和公会后勤开始拥有更清楚的承接点，建设不再像单次消耗。',
          targetPanel: 'guild'
        }
      ]
    }
  },
  {
    id: 'festival_greenhouse',
    name: '节庆暖房',
    description: '专门给花材和敏感作物准备的小型暖房，适合节庆前做稳定培育和保香。',
    benefitSummary: '让村里的节庆筹备更稳，也为后续经营项目打下基础。',
    moneyCost: 3200,
    materials: [
      { itemId: 'wood', quantity: 30 },
      { itemId: 'bamboo', quantity: 18 },
      { itemId: 'herb', quantity: 10 },
      { itemId: 'stone', quantity: 20 }
    ],
    requirements: [
      { type: 'breedingCompendium', target: 2, label: '育种图鉴发现 2 个杂交品种' },
      { type: 'completedBundles', target: 1, label: '完成 1 个社区目标' }
    ],
    requiredClueId: 'liu_niang_greenhouse_clue',
    requiredClueText: '需要先从柳娘处获得暖房线索。',
    fundingPhase: 'bootstrap',
    linkedSystems: ['goal', 'quest'],
    auditTags: ['event_prep', 'bundles_link'],
    buildMode: 'standard',
    contentTier: 'P0',
    unlockEffects: [
      {
        type: 'themePoolBias',
        value: 1,
        unit: 'tag',
        summary: '为后续主题周 / 节庆订单偏置预留暖房类标签入口。',
        linkedSystems: ['goal', 'quest']
      }
    ],
    regionalEffects: [
      {
        areaId: 'festival_greenhouse_zone',
        label: '暖房功能区',
        summary: '预留节庆暖房功能区的启用状态与后续活动轮换入口。',
        functionChanges: [
          {
            functionId: 'theme_greenhouse_board',
            type: 'themeWeek',
            mode: 'unlock',
            summary: '解锁暖房主题周候选池入口。'
          }
        ],
        linkedSystems: ['goal', 'quest']
      }
    ],
    restorationProfile: {
      bundleIds: ['spring_bundle', 'summer_bundle'],
      milestoneLabel: '节前培育位启用',
      preRumors: ['柳娘最近总担心花材和敏感作物赶不上节前的好时机，村里一直缺个稳当的暖房位。'],
      postComments: ['柳娘说暖房启用后，节庆前总算能把花材和娇嫩作物养稳，不必再看天吃饭。'],
      crossEntryFeedback: ['后续日历与主题周提醒会更容易把节前备货直接指向暖房与节庆筹备。'],
      worldChanges: [
        {
          id: 'festival_greenhouse_service_unlock',
          type: 'service',
          title: '节前培育位上线',
          summary: '暖房开始承担节庆前的稳定培育和保香准备，让节前筹备有了真实设施支点。'
        },
        {
          id: 'festival_greenhouse_calendar_unlock',
          type: 'calendar',
          title: '节庆准备开始有落点',
          summary: '后续日历和主题周提醒可以把节前供货、花材和预热活动直接挂到暖房上。'
        },
        {
          id: 'festival_greenhouse_dialogue_unlock',
          type: 'dialogue',
          title: '节前闲谈更新',
          summary: '节庆相关 NPC 会开始提起暖房、花材和这几天更值得优先准备的物资。'
        }
      ]
    }
  },
  {
    id: 'caravan_station',
    name: '商队驿站',
    description: '扩建村口驿站与货栈，方便来往商队停靠，也能更稳定承接后期大订单。',
    benefitSummary: '委托与订单的铜钱报酬提高 15%。',
    moneyCost: 5600,
    materials: [
      { itemId: 'wood', quantity: 60 },
      { itemId: 'bamboo', quantity: 24 },
      { itemId: 'iron_bar', quantity: 6 }
    ],
    requirements: [
      { type: 'villageProjectLevel', target: 2, label: '先完成 2 项村庄建设' },
      { type: 'hanhaiRelicClears', target: 2, label: '完成 2 次瀚海遗迹勘探' }
    ],
    requiredClueId: 'hong_dou_caravan_clue',
    requiredClueText: '需要先从红豆处获得驿站扩建线索。',
    fundingPhase: 'expansion',
    linkedSystems: ['quest', 'hanhai'],
    auditTags: ['high_value', 'order_pool'],
    buildMode: 'staged',
    stageConfig: {
      projectGroupId: 'caravan_station',
      stageIndex: 1,
      totalStages: 2,
      stageLabel: '一期扩建',
      gateSummary: '先搭起稳定停靠与货栈基础，为后续扩建告示栏与商路容量做准备。',
      nextStageProjectId: 'caravan_station_ii',
      targetTier: 'P1'
    },
    contentTier: 'P1',
    unlockEffects: [
      {
        type: 'questMoneyBonusRate',
        value: 0.15,
        unit: 'percent',
        summary: '委托与订单的铜钱报酬提高 15%。',
        linkedSystems: ['quest']
      },
      {
        type: 'regionalFunctionUnlock',
        summary: '预留商队驿站作为区域功能入口，供后续订单池和商路逻辑接入。',
        linkedSystems: ['quest', 'hanhai']
      }
    ],
    regionalEffects: [
      {
        areaId: 'village_gate_caravan_station',
        label: '村口驿站',
        summary: '驿站一期扩建完成，商队停靠区开始启用。',
        functionChanges: [
          {
            functionId: 'caravan_order_board',
            type: 'orderBoard',
            mode: 'unlock',
            summary: '解锁商队订单池入口。'
          },
          {
            functionId: 'westbound_caravan_route',
            type: 'caravanRoute',
            mode: 'unlock',
            summary: '预留商路启用状态，供后续商队线路逻辑读取。'
          }
        ],
        linkedSystems: ['quest', 'hanhai']
      }
    ],
    restorationProfile: {
      bundleIds: ['artisan_bundle'],
      milestoneLabel: '商路停靠点启用',
      preRumors: ['红豆觉得村口总少一处像样的停靠点，不然好货、急单和商队都只会路过不落脚。'],
      postComments: ['红豆说驿站一开，商队终于愿意留下来歇脚，村口的活气一下子就起来了。'],
      crossEntryFeedback: ['行旅图、高地承接和任务页会更明确提到村口驿站这条后续线路。'],
      worldChanges: [
        {
          id: 'caravan_station_shortcut_unlock',
          type: 'shortcut',
          title: '村口商路捷径开启',
          summary: '驿站启用后，村口停靠、接单和货栈整合到同一处，跑商与交接不再绕来绕去。'
        },
        {
          id: 'caravan_station_service_unlock',
          type: 'service',
          title: '商队服务开始落地',
          summary: '订单池、停靠区和后续商路功能开始以驿站为核心承接，世界不再只是数字加成。',
          targetPanel: 'quest'
        },
        {
          id: 'caravan_station_entry_unlock',
          type: 'entry',
          title: '村口设施可被看见',
          summary: '村庄建设、行旅图和相关承接页会开始把村口驿站视为真实入口来提示。',
          targetPanel: 'region-map'
        }
      ]
    }
  },
  {
    id: 'village_school',
    name: '村塾学舍',
    description: '整理旧屋做成学舍，让村里能更稳定地记录账目、传授手艺，也让人情往来更有分寸。',
    benefitSummary: '完成委托时额外获得 2 点好感。',
    moneyCost: 6800,
    materials: [
      { itemId: 'wood', quantity: 70 },
      { itemId: 'bamboo', quantity: 30 },
      { itemId: 'herb', quantity: 12 }
    ],
    requirements: [
      { type: 'villageProjectLevel', target: 3, label: '先完成 3 项村庄建设' },
      { type: 'museumDonations', target: 6, label: '向博物馆捐赠 6 件展品' },
      { type: 'completedBundles', target: 2, label: '完成 2 个社区目标' }
    ],
    requiredClueId: 'su_su_school_clue',
    requiredClueText: '需要先从素素处获得学舍启用线索。',
    fundingPhase: 'expansion',
    linkedSystems: ['quest', 'museum', 'goal'],
    auditTags: ['high_value', 'social_unlock'],
    buildMode: 'staged',
    stageConfig: {
      projectGroupId: 'village_school',
      stageIndex: 1,
      totalStages: 2,
      stageLabel: '学舍启用',
      gateSummary: '先启用学舍记录与授课空间，为后续容量扩建与展示联动打底。',
      nextStageProjectId: 'village_school_ii',
      targetTier: 'P1'
    },
    contentTier: 'P1',
    unlockEffects: [
      {
        type: 'questFriendshipBonus',
        value: 2,
        unit: 'flat',
        summary: '完成委托时额外获得 2 点好感。',
        linkedSystems: ['quest']
      }
    ],
    donationPlan: {
      id: 'village_school_archive_drive',
      label: '学舍文书捐赠',
      targetSystem: 'museum',
      requirementSummary: '为学舍补齐账册、碑拓与村史资料。',
      rewardSummary: '预留后续学舍展示位与文书整理奖励。',
      acceptedItemIds: ['paper'],
      targetAmount: 12,
      repeatable: false,
      milestones: [
        {
          id: 'archive_shelf_unlock',
          label: '账册架启用',
          targetAmount: 6,
          rewardSummary: '发放启用奖励金与基础木料，作为首个学舍捐赠回报。',
          reward: {
            money: 800,
            items: [{ itemId: 'wood', quantity: 8 }]
          }
        },
        {
          id: 'lecture_corner_unlock',
          label: '讲席补全',
          targetAmount: 12,
          rewardSummary: '发放讲席补全奖金与石料，支撑学舍继续扩建。',
          reward: {
            money: 1500,
            items: [{ itemId: 'stone', quantity: 12 }]
          }
        }
      ]
    },
    regionalEffects: [
      {
        areaId: 'village_school_zone',
        label: '学舍功能区',
        summary: '学舍启用后，村中记录与教学功能区进入可扩展状态。',
        functionChanges: [
          {
            functionId: 'school_service_hub',
            type: 'serviceHub',
            mode: 'unlock',
            summary: '解锁学舍服务区入口。'
          },
          {
            functionId: 'school_display_rack',
            type: 'displayHall',
            mode: 'unlock',
            summary: '预留学舍展示架与文书陈列位。'
          }
        ],
        linkedSystems: ['quest', 'museum', 'goal']
      }
    ],
    restorationProfile: {
      bundleIds: ['friendship_bundle'],
      milestoneLabel: '学舍记录与授课启用',
      preRumors: ['素素总说村里事情越来越多，可账册、讲席和人情往来还像各管各的，迟早会乱。'],
      postComments: ['素素说学舍一开，村里的账目、讲席和人情往来终于有了体面去处。'],
      crossEntryFeedback: ['家园和任务承接页会开始更明确提到学舍、关系推进和后续展示位。'],
      worldChanges: [
        {
          id: 'village_school_service_unlock',
          type: 'service',
          title: '学舍服务区启用',
          summary: '记录、授课和展示承接开始有固定据点，关系和委托不再像散落条目。'
        },
        {
          id: 'village_school_dialogue_unlock',
          type: 'dialogue',
          title: '学舍闲谈加入村中对话',
          summary: '村民会开始提起学舍、授课和谁最近常去帮忙，关系发展更像发生在村里。'
        }
      ]
    }
  },
  {
    id: 'hot_spring',
    name: '温泉整修',
    description: '把山脚旧泉重新引流修缮成可休养的温泉，让忙碌的人能真正歇一口气。',
    benefitSummary: '晚睡 / 昏倒后的体力恢复额外提高 10%。',
    moneyCost: 8200,
    materials: [
      { itemId: 'stone', quantity: 90 },
      { itemId: 'wood', quantity: 45 },
      { itemId: 'charcoal', quantity: 20 }
    ],
    requirements: [
      { type: 'villageProjectLevel', target: 4, label: '先完成 4 项村庄建设' },
      { type: 'completedQuests', target: 12, label: '累计完成 12 个委托 / 订单' },
      { type: 'guildContribution', target: 120, label: '公会贡献达到 120 点' }
    ],
    requiredClueId: 'lin_lao_hot_spring_clue',
    requiredClueText: '需要先从林老处获得温泉整修线索。',
    fundingPhase: 'expansion',
    linkedSystems: ['quest', 'guild', 'goal'],
    auditTags: ['high_value', 'recovery_bonus'],
    buildMode: 'standard',
    contentTier: 'P1',
    unlockEffects: [
      {
        type: 'dailyRecoveryBonusRate',
        value: 0.1,
        unit: 'percent',
        summary: '晚睡 / 昏倒后的体力恢复额外提高 10%。',
        linkedSystems: ['quest', 'goal']
      }
    ],
    maintenancePlan: {
      id: 'hot_spring_maintenance',
      targetType: 'villageProject',
      targetId: 'hot_spring',
      label: '温泉日常维护',
      costMoney: 480,
      cycleDays: 7,
      effectSummary: '维持温泉引流、木桶与药草补给，保证后续休养功能稳定。',
      autoRenew: false
    },
    regionalEffects: [
      {
        areaId: 'mountain_hot_spring_zone',
        label: '山脚温泉区',
        summary: '温泉区恢复启用，并预留后续休养区升级。',
        functionChanges: [
          {
            functionId: 'village_rest_facility',
            type: 'restFacility',
            mode: 'unlock',
            summary: '解锁休养设施入口。'
          }
        ],
        linkedSystems: ['quest', 'goal']
      }
    ],
    restorationProfile: {
      bundleIds: ['fish_bundle'],
      milestoneLabel: '温泉休养区恢复',
      preRumors: ['林老总念着旧泉荒在那里可惜，忙完活的人连个正经歇脚处都没有。'],
      postComments: ['林老说旧泉重新活过来后，村里总算多了个能真正歇口气的地方。'],
      crossEntryFeedback: ['设施页和后续生活层入口会更常提到休养、恢复和温泉相关承接。'],
      worldChanges: [
        {
          id: 'hot_spring_shortcut_unlock',
          type: 'shortcut',
          title: '山脚休养路线恢复',
          summary: '山脚旧泉被重新引流后，村里的休养动线终于重新接上，不再只是地图背景。'
        },
        {
          id: 'hot_spring_service_unlock',
          type: 'service',
          title: '休养设施重新可用',
          summary: '温泉作为真实恢复设施重新进入村庄循环，能被玩家每天感知。'
        }
      ]
    }
  },
  {
    id: 'village_school_ii',
    name: '村塾学舍扩建',
    description: '为学舍补建账房、讲席与资料架，让村中委托能更有条理地分流与登记，也方便你同时承接更多事情。',
    benefitSummary: '最大同时接取任务数 +1。',
    moneyCost: 9200,
    materials: [
      { itemId: 'wood', quantity: 88 },
      { itemId: 'bamboo', quantity: 30 },
      { itemId: 'herb', quantity: 18 },
      { itemId: 'paper', quantity: 12 }
    ],
    requirements: [
      { type: 'villageProjectLevel', target: 5, label: '先完成 5 项村庄建设' },
      { type: 'completedQuests', target: 16, label: '累计完成 16 个委托 / 订单' },
      { type: 'museumDonations', target: 8, label: '向博物馆捐赠 8 件展品' }
    ],
    requiredClueId: 'xue_qin_school_upgrade_clue',
    requiredClueText: '需要先从雪琴处获得学舍扩建线索。',
    requiredProjectId: 'village_school',
    requiredProjectText: '需要先完成「村塾学舍」，才能继续扩建。',
    fundingPhase: 'endgame',
    linkedSystems: ['quest', 'museum', 'goal'],
    auditTags: ['endgame_sink', 'capacity_unlock'],
    buildMode: 'staged',
    stageConfig: {
      projectGroupId: 'village_school',
      stageIndex: 2,
      totalStages: 2,
      stageLabel: '学舍扩建',
      gateSummary: '补全账房、讲席与资料架，形成完整学舍经营节点。',
      previousStageProjectId: 'village_school',
      targetTier: 'P2'
    },
    contentTier: 'P2',
    unlockEffects: [
      {
        type: 'questCapacityBonus',
        value: 1,
        unit: 'slot',
        summary: '最大同时接取任务数 +1。',
        linkedSystems: ['quest']
      },
      {
        type: 'regionalFunctionUpgrade',
        summary: '预留学舍功能区从启用升级到扩建态。',
        linkedSystems: ['museum', 'goal']
      }
    ],
    maintenancePlan: {
      id: 'village_school_ii_maintenance',
      targetType: 'villageProject',
      targetId: 'village_school_ii',
      label: '学舍账房维护',
      costMoney: 560,
      cycleDays: 7,
      effectSummary: '维持讲席、账房与资料架运转，确保额外任务容量与学舍服务持续生效。',
      autoRenew: false
    },
    donationPlan: {
      id: 'village_school_archive_drive',
      label: '学舍文书捐赠',
      targetSystem: 'museum',
      requirementSummary: '继续补齐学舍账册、讲义与展陈文书。',
      rewardSummary: '为终局学舍展示位和扩建奖励保留里程碑。',
      acceptedItemIds: ['paper'],
      targetAmount: 24,
      repeatable: false,
      milestones: [
        {
          id: 'archive_hall_upgrade',
          label: '资料架扩建',
          targetAmount: 12,
          rewardSummary: '发放陈列扩建补贴与木料，强化学舍经营收益。',
          reward: {
            money: 1800,
            items: [{ itemId: 'wood', quantity: 12 }]
          }
        },
        {
          id: 'lecture_hall_upgrade',
          label: '讲席成形',
          targetAmount: 24,
          rewardSummary: '发放终局学舍升级奖金与丝绸材料，形成明确里程碑奖励。',
          reward: {
            money: 2800,
            items: [{ itemId: 'hanhai_silk', quantity: 1 }]
          }
        }
      ]
    },
    regionalEffects: [
      {
        areaId: 'village_school_zone',
        label: '学舍功能区',
        summary: '学舍升级为完整经营节点，可承接更高阶展示与任务容量变化。',
        functionChanges: [
          {
            functionId: 'school_service_hub',
            type: 'serviceHub',
            mode: 'upgrade',
            summary: '学舍服务区升级。'
          },
          {
            functionId: 'school_display_rack',
            type: 'displayHall',
            mode: 'upgrade',
            summary: '学舍展示架升级。'
          }
        ],
        linkedSystems: ['quest', 'museum', 'goal']
      }
    ]
  },
  {
    id: 'caravan_station_ii',
    name: '商队驿站扩建',
    description: '在原有驿站基础上追加货棚、公告牌与歇脚区，让更多往来商队愿意停靠并留下委托。',
    benefitSummary: '每日告示栏额外增加 1 个可接取委托。',
    moneyCost: 9800,
    materials: [
      { itemId: 'wood', quantity: 90 },
      { itemId: 'bamboo', quantity: 36 },
      { itemId: 'iron_bar', quantity: 10 },
      { itemId: 'hanhai_silk', quantity: 2 }
    ],
    requirements: [
      { type: 'villageProjectLevel', target: 5, label: '先完成 5 项村庄建设' },
      { type: 'hanhaiRelicClears', target: 4, label: '完成 4 次瀚海遗迹勘探' },
      { type: 'completedQuests', target: 18, label: '累计完成 18 个委托 / 订单' }
    ],
    requiredClueId: 'yun_fei_station_upgrade_clue',
    requiredClueText: '需要先从云飞处获得驿站二期扩建线索。',
    requiredProjectId: 'caravan_station',
    requiredProjectText: '需要先完成「商队驿站」，才能继续扩建。',
    fundingPhase: 'endgame',
    linkedSystems: ['quest', 'hanhai', 'goal'],
    auditTags: ['endgame_sink', 'board_unlock'],
    buildMode: 'staged',
    stageConfig: {
      projectGroupId: 'caravan_station',
      stageIndex: 2,
      totalStages: 2,
      stageLabel: '二期扩建',
      gateSummary: '补齐公告牌、歇脚区与货棚，形成完整商队枢纽。',
      previousStageProjectId: 'caravan_station',
      targetTier: 'P2'
    },
    contentTier: 'P2',
    unlockEffects: [
      {
        type: 'dailyQuestBoardBonus',
        value: 1,
        unit: 'slot',
        summary: '每日告示栏额外增加 1 个可接取委托。',
        linkedSystems: ['quest']
      },
      {
        type: 'regionalFunctionUpgrade',
        summary: '预留商队驿站从一期停靠点升级为完整商路枢纽。',
        linkedSystems: ['quest', 'hanhai']
      }
    ],
    maintenancePlan: {
      id: 'caravan_station_maintenance',
      targetType: 'villageProject',
      targetId: 'caravan_station_ii',
      label: '驿站货棚维护',
      costMoney: 680,
      cycleDays: 7,
      effectSummary: '维持公告牌、货棚和歇脚区的日常运转，为后续告示栏刷新预留维护状态。',
      autoRenew: false
    },
    donationPlan: {
      id: 'caravan_station_supply_drive',
      label: '商队补给捐赠',
      targetSystem: 'hanhai',
      requirementSummary: '为扩建后的驿站储备补给包、绸布与行脚物资。',
      rewardSummary: '预留商路功能升级与补给里程碑。',
      acceptedItemIds: ['hanhai_silk', 'paper'],
      targetAmount: 8,
      repeatable: true,
      milestones: [
        {
          id: 'supply_cache_unlock',
          label: '补给仓启用',
          targetAmount: 4,
          rewardSummary: '发放商队补给金与鱼饵，作为补给仓启用奖励。',
          reward: {
            money: 1200,
            items: [{ itemId: 'standard_bait', quantity: 4 }]
          }
        },
        {
          id: 'route_board_upgrade',
          label: '路线公告补全',
          targetAmount: 8,
          rewardSummary: '发放商路公告补贴与木料，形成可见的商路回馈。',
          reward: {
            money: 2200,
            items: [{ itemId: 'wood', quantity: 10 }]
          }
        }
      ]
    },
    regionalEffects: [
      {
        areaId: 'village_gate_caravan_station',
        label: '村口驿站',
        summary: '驿站升级为完整商队枢纽，区域功能从入口态提升为运营态。',
        functionChanges: [
          {
            functionId: 'caravan_order_board',
            type: 'orderBoard',
            mode: 'upgrade',
            summary: '商队订单池升级。'
          },
          {
            functionId: 'westbound_caravan_route',
            type: 'caravanRoute',
            mode: 'upgrade',
            summary: '商路节点升级。'
          },
          {
            functionId: 'caravan_service_hub',
            type: 'serviceHub',
            mode: 'unlock',
            summary: '解锁商队服务枢纽。'
          }
        ],
        linkedSystems: ['quest', 'hanhai', 'goal']
      }
    ],
    restorationProfile: {
      bundleIds: ['gem_bundle'],
      milestoneLabel: '商路公告与歇脚区扩建',
      preRumors: ['云飞觉得现在的驿站能停靠，却还算不上真正的商路枢纽，公告牌和歇脚区都还差着一口气。'],
      postComments: ['云飞说二期货棚和公告牌补齐后，村口终于像个真正能留住商队和消息的地方了。'],
      crossEntryFeedback: ['任务板和行旅图会更容易把商路承接、额外委托和驿站状态一起说清。'],
      worldChanges: [
        {
          id: 'caravan_station_ii_shortcut_unlock',
          type: 'shortcut',
          title: '村口承接一步到位',
          summary: '货棚、公告牌和歇脚区连成完整节点后，村口从“可停靠”升级成“可办事”的真正捷径。'
        },
        {
          id: 'caravan_station_ii_service_unlock',
          type: 'service',
          title: '商路枢纽进入运营态',
          summary: '驿站二期会把额外委托、路线公告和后续来访承接到同一套村口服务里。'
        }
      ]
    }
  }
]
