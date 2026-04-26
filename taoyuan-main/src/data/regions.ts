import type {
  RegionCampSiteState,
  RegionCompanionContract,
  ExpeditionRuntimeState,
  RegionAutoPatrolState,
  RegionBossDef,
  RegionBossOutcomeState,
  RegionDef,
  RegionExpeditionArchiveEntry,
  RegionExpeditionSession,
  RegionKnowledgeState,
  RegionMapNodeState,
  RegionRouteKnowledgeState,
  RegionExpeditionSupplyState,
  RegionEventDef,
  RegionEventState,
  RegionId,
  RegionMapSaveData,
  RegionRumorBoardState,
  RegionRouteDef,
  RegionRouteState,
  RegionSeasonalState,
  RegionShortcutState,
  RegionTelemetrySnapshot,
  RegionUnlockState,
  RegionWeeklyEventState,
  RegionWeeklyFocusState,
  RegionalResourceFamilyDef,
  RegionalResourceFamilyId
} from '@/types/region'

export const REGION_MAP_SAVE_VERSION = 9

export const getRouteMapNodeKey = (routeId: string) => `route:${routeId}`

export const getBossMapNodeKey = (regionId: RegionId) => `boss:${regionId}`

export const getCampSiteKey = (regionId: RegionId, routeId: string | null, bossId: string | null) =>
  routeId ? `route:${routeId}` : `boss:${bossId ?? regionId}`

export const REGIONAL_RESOURCE_FAMILY_DEFS: RegionalResourceFamilyDef[] = [
  {
    id: 'ancient_archive',
    label: '古驿残卷',
    description: '围绕旧驿账册、拓片、押运票据与荒道文书形成的区域资源家族，主要承接任务、商圈、瀚海与馆务说明链。',
    linkedSystems: ['quest', 'shop', 'museum', 'hanhai']
  },
  {
    id: 'ecology_specimen',
    label: '生态样本',
    description: '围绕鱼样、藻样、孢瓶与湿地记录形成的区域资源家族，主要承接鱼塘展示、馆务研究与样本活动。',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet']
  },
  {
    id: 'ley_crystal',
    label: '灵脉结晶',
    description: '围绕高地灵脉、风蚀晶核与守脉残片形成的区域资源家族，主要承接公会、村建与高阶战备。',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet']
  }
]

export const REGION_DEFS: RegionDef[] = [
  {
    id: 'ancient_road',
    name: '古驿荒道',
    description: '围绕旧驿站、商队补给、古路账册与押运风险展开的商路前段区域，适合作为瀚海与任务链的前置空间。',
    themeHint: '商路、古迹、护送、驿站、瀚海承接',
    linkedSystems: ['quest', 'shop', 'museum', 'hanhai']
  },
  {
    id: 'mirage_marsh',
    name: '蜃潮泽地',
    description: '围绕湿地夜游、样本观察、生态异常与展示回流展开的研究型区域，适合作为鱼塘与博物馆的样本来源地。',
    themeHint: '样本、夜游、湿地、展示、研究',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet']
  },
  {
    id: 'cloud_highland',
    name: '云岚高地',
    description: '围绕高地巡路、灵脉采集、前哨补给与精英清剿展开的战备区域，适合作为公会与村建高阶承接前线。',
    themeHint: '高地、灵脉、精英、清剿、公会承接',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet']
  }
]

export const REGION_ROUTE_DEFS: RegionRouteDef[] = [
  {
    id: 'ancient_road_supply_relay',
    regionId: 'ancient_road',
    name: '旧驿补给线',
    description: '沿着荒道旧驿推进补给、货件与沿线风险排查，适合作为古驿荒道的基础起步路线。',
    nodeType: 'route',
    staminaCost: 3,
    timeCostHours: 0.5,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '先把站点、补给和沿线路况摸清，再决定是压押运还是走残卷回收。',
    handoffHint: '完成后优先回任务板补物流单，或先去商圈补下一趟押运消耗。'
  },
  {
    id: 'ancient_road_watchtower_scout',
    regionId: 'ancient_road',
    name: '烽亭探哨线',
    description: '沿着荒道烽亭和废弃哨点进行侦察，偏向提前发现商队绕行口与高风险路段。',
    nodeType: 'route',
    unlockRouteIds: ['ancient_road_supply_relay'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '比补给线更前压，适合提前摸清押运绕行点和路障口。',
    handoffHint: '回流后优先衔接押运任务和商圈补给推荐，给瀚海合同预热。'
  },
  {
    id: 'ancient_road_archive_recovery',
    regionId: 'ancient_road',
    name: '残卷回收线',
    description: '回收荒道沿线文书、残页与驿路拓片，偏向馆务说明与瀚海文书承接。',
    nodeType: 'handoff',
    unlockRouteIds: ['ancient_road_supply_relay'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'museum', 'hanhai'],
    encounterHint: '更偏档案回收和旧驿刻记整理，适合补齐说明链与馆务资料。',
    handoffHint: '残卷与拓片最适合回博物馆和瀚海做说明承接，也能带动任务页的古迹线。'
  },
  {
    id: 'ancient_road_convoy_risk',
    regionId: 'ancient_road',
    name: '护送风险线',
    description: '围绕车队压力、前哨警戒与危卡节点展开的精英线，是荒道首领战前的高压预演。',
    nodeType: 'elite',
    unlockCompletionCount: 2,
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '把押运、补给和站点风险压成一轮高压推进，更接近首领战节奏。',
    handoffHint: '完成后优先接限时护送与瀚海合同前置，顺手把商圈补给包消化掉。'
  },
  {
    id: 'mirage_marsh_night_watch',
    regionId: 'mirage_marsh',
    name: '夜游观察线',
    description: '围绕泽地夜间生态与样本初探展开，适合作为蜃潮泽地的基础观测路线。',
    nodeType: 'route',
    staminaCost: 3,
    timeCostHours: 0.5,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond'],
    encounterHint: '先摸清夜游节奏，带回第一批可展示样本与观察记录。',
    handoffHint: '优先回鱼塘看展示位，再把高亮样本送进馆务或研究委托。'
  },
  {
    id: 'mirage_marsh_reed_drift',
    regionId: 'mirage_marsh',
    name: '苇流漂采线',
    description: '沿着泽地苇流和漂浮样本带展开采集，偏向补齐研究样本与周赛展示素材。',
    nodeType: 'route',
    unlockRouteIds: ['mirage_marsh_night_watch'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond'],
    encounterHint: '更偏样本密集采集，适合把泽地的展示素材快速攒起来。',
    handoffHint: '回流时优先看鱼塘展示和馆务推荐，让样本直接转成可见价值。'
  },
  {
    id: 'mirage_marsh_specimen_drive',
    regionId: 'mirage_marsh',
    name: '样本护送线',
    description: '围绕样本整理、护送与活动承接展开，偏向周赛资格、馆务研究与样本回流。',
    nodeType: 'handoff',
    unlockRouteIds: ['mirage_marsh_night_watch'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet'],
    encounterHint: '更偏样本整理与护送，适合把研究线、展示线和结算线串成一轮。',
    handoffHint: '完成后优先回鱼塘上展示池或进博物馆接馆务，也能顺带触发活动邮件链。'
  },
  {
    id: 'mirage_marsh_ecology_alert',
    regionId: 'mirage_marsh',
    name: '生态异常线',
    description: '围绕水位异动、样本污染与幼体稳定展开的精英线，是泽地首领战前的异常压制版本。',
    nodeType: 'elite',
    unlockCompletionCount: 2,
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet'],
    encounterHint: '把夜游、异常压制和样本稳定压进同一轮，适合首领前热身。',
    handoffHint: '完成后优先收束到鱼塘展示、周赛和博物馆学者委托，把样本价值转成稳定回报。'
  },
  {
    id: 'cloud_highland_ley_crack',
    regionId: 'cloud_highland',
    name: '灵脉采晶线',
    description: '围绕灵脉裂隙、采晶与高阶战备展开，适合作为云岚高地的核心资源路线。',
    nodeType: 'route',
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'wallet'],
    encounterHint: '偏向灵脉资源收束，适合给高地首领与高风险票券路线做准备。',
    handoffHint: '采晶后优先回公会和钱包处理奖励与战备，再决定是否继续冲首领。'
  },
  {
    id: 'cloud_highland_skybridge_watch',
    regionId: 'cloud_highland',
    name: '云桥巡望线',
    description: '沿着高地风口和断桥哨点巡望，偏向稳住前线路况并为清剿路线铺路。',
    nodeType: 'route',
    unlockRouteIds: ['cloud_highland_ley_crack'],
    staminaCost: 4,
    timeCostHours: 0.75,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'villageProject'],
    encounterHint: '更偏前线稳定和路况侦察，适合在冲精英线前先稳住节奏。',
    handoffHint: '回流后优先衔接公会清剿推荐和村建前哨项目，让高地投入有出口。'
  },
  {
    id: 'cloud_highland_patrol',
    regionId: 'cloud_highland',
    name: '高地清剿线',
    description: '围绕危险地段巡路、精英压制与战备推进展开的精英线，是高地首领战前的主战节奏。',
    nodeType: 'elite',
    unlockCompletionCount: 2,
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'villageProject'],
    encounterHint: '把巡路、清剿与战备推进压成一轮，更接近高地首领的实战强度。',
    handoffHint: '完成后优先回公会和村建承接，把清剿奖励和材料出口接稳。'
  },
  {
    id: 'cloud_highland_supply_push',
    regionId: 'cloud_highland',
    name: '前哨补给线',
    description: '围绕前哨转运、补给栈整备与高地危险路线展开，偏向首领前战备与建设前置。',
    nodeType: 'handoff',
    unlockRouteIds: ['cloud_highland_skybridge_watch'],
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet'],
    encounterHint: '把清剿、补给与山路风险压成一轮，适合在首领前检查战备是否齐整。',
    handoffHint: '完成后优先回公会确认目标，再去村庄建设和钱包收束高地投入。'
  }
]

export const REGION_EVENT_DEFS: RegionEventDef[] = [
  {
    id: 'ancient_road_station_blackout',
    regionId: 'ancient_road',
    name: '驿灯失照',
    description: '旧驿晚间突然断灯，商队需要临时改走副道，你可以顺手摸出一条额外补给路径。',
    staminaCost: 2,
    timeCostHours: 0.34,
    rewardFamilyId: 'ancient_archive',
    rewardAmount: 2,
    linkedSystems: ['quest', 'shop'],
    encounterHint: '适合在本周刚切焦点时快速热身。',
    handoffHint: '完成后优先去任务板或商圈吃掉补给与押运推荐。'
  },
  {
    id: 'ancient_road_sand_market',
    regionId: 'ancient_road',
    name: '沙市易卷',
    description: '临时沙市出现了一批来源不明的旧驿账册，可以先行甄别并回收成可交付的文书线索。',
    unlockRouteIds: ['ancient_road_supply_relay'],
    staminaCost: 3,
    timeCostHours: 0.5,
    rewardFamilyId: 'ancient_archive',
    rewardAmount: 2,
    linkedSystems: ['museum', 'hanhai'],
    encounterHint: '适合补齐荒道文书与馆务说明链。',
    handoffHint: '回流后优先去馆务或瀚海，把回收文书转成展示和合同前置。'
  },
  {
    id: 'ancient_road_detour_rescue',
    regionId: 'ancient_road',
    name: '绕路援车',
    description: '一支商队在绕路时失联，需要临时探哨和快线补给协同，才能把残缺货单和车队讯息带回来。',
    unlockCompletionCount: 2,
    staminaCost: 4,
    timeCostHours: 0.67,
    rewardFamilyId: 'ancient_archive',
    rewardAmount: 3,
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '适合首领前验证荒道补给和押运是否已经成形。',
    handoffHint: '完成后优先接护送、商路合同和补给包，形成一轮高压推进。'
  },
  {
    id: 'mirage_marsh_spore_bloom',
    regionId: 'mirage_marsh',
    name: '潮雾孢华',
    description: '泽地夜间出现短时孢华带，能快速收集到一批高价值夜游样本。',
    staminaCost: 2,
    timeCostHours: 0.34,
    rewardFamilyId: 'ecology_specimen',
    rewardAmount: 2,
    linkedSystems: ['museum', 'fishPond'],
    encounterHint: '适合作为泽地本周事件的起步点。',
    handoffHint: '先回鱼塘展示，再决定是否送进馆务。'
  },
  {
    id: 'mirage_marsh_moon_nursery',
    regionId: 'mirage_marsh',
    name: '月汐育群',
    description: '潮沟中出现一片幼体育群区，需要在不破坏环境的情况下快速记录与取样。',
    unlockRouteIds: ['mirage_marsh_night_watch'],
    staminaCost: 3,
    timeCostHours: 0.5,
    rewardFamilyId: 'ecology_specimen',
    rewardAmount: 2,
    linkedSystems: ['quest', 'fishPond'],
    encounterHint: '更偏展示型和研究型样本，适合补鱼塘周赛资格。',
    handoffHint: '回流后优先看鱼塘周赛与展示池，再决定是否走活动任务。'
  },
  {
    id: 'mirage_marsh_reed_migration',
    regionId: 'mirage_marsh',
    name: '苇带迁潮',
    description: '苇带样本带随潮迁移，若不及时跟进就会错过一整周的异常记录窗口。',
    unlockCompletionCount: 2,
    staminaCost: 4,
    timeCostHours: 0.67,
    rewardFamilyId: 'ecology_specimen',
    rewardAmount: 3,
    linkedSystems: ['quest', 'museum', 'wallet'],
    encounterHint: '适合作为泽地精英前的节奏压缩事件。',
    handoffHint: '完成后优先承接学者委托、展示高亮与样本结算。'
  },
  {
    id: 'cloud_highland_ley_surge',
    regionId: 'cloud_highland',
    name: '脉潮突涌',
    description: '高地灵脉短时涌动，前线需要快速采回一批稳定结晶，避免后续哨站掉压。',
    staminaCost: 2,
    timeCostHours: 0.34,
    rewardFamilyId: 'ley_crystal',
    rewardAmount: 2,
    linkedSystems: ['guild', 'wallet'],
    encounterHint: '适合作为高地本周的快节奏热身事件。',
    handoffHint: '先回公会和钱包吃掉战备与票券承接。'
  },
  {
    id: 'cloud_highland_signal_patrol',
    regionId: 'cloud_highland',
    name: '风哨复讯',
    description: '高地一组风哨断讯，需要巡望、修复与临时布防，才能把前线信息链重新接通。',
    unlockRouteIds: ['cloud_highland_ley_crack'],
    staminaCost: 3,
    timeCostHours: 0.5,
    rewardFamilyId: 'ley_crystal',
    rewardAmount: 2,
    linkedSystems: ['guild', 'villageProject'],
    encounterHint: '偏向高地前线稳定和清剿前准备。',
    handoffHint: '回流后优先看公会焦点活动和村建前哨项目。'
  },
  {
    id: 'cloud_highland_cache_collapse',
    regionId: 'cloud_highland',
    name: '前仓塌线',
    description: '一座临时前哨仓崩塌，战备物资与守脉碎片被埋入风口，需要快速抢修和清点。',
    unlockCompletionCount: 2,
    staminaCost: 4,
    timeCostHours: 0.67,
    rewardFamilyId: 'ley_crystal',
    rewardAmount: 3,
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet'],
    encounterHint: '适合作为高地精英线和首领战前的战备压测事件。',
    handoffHint: '完成后优先衔接清剿、建设材料与高阶投入收束。'
  }
]

export const REGION_BOSS_DEFS: RegionBossDef[] = [
  {
    id: 'ancient_road_overseer',
    regionId: 'ancient_road',
    name: '荒道监军',
    description: '盘踞旧驿要冲的首领，会在补给、押运与账册线之间切换高压节奏。',
    rewardFamilyId: 'ancient_archive',
    staminaCost: 6,
    timeCostHours: 1,
    phases: [
      {
        id: 'overseer_p1',
        label: '封路警戒',
        summary: '围绕路障和护送压力展开的开场阶段。',
        enemyHp: 42,
        enemyAttack: 18,
        enemyDefense: 8
      },
      {
        id: 'overseer_p2',
        label: '账册追索',
        summary: '围绕残卷争夺与路线转移展开的中段阶段。',
        enemyHp: 54,
        enemyAttack: 21,
        enemyDefense: 10
      },
      {
        id: 'overseer_p3',
        label: '旧驿决断',
        summary: '围绕高压指挥与终局收束展开的收尾阶段。',
        enemyHp: 64,
        enemyAttack: 24,
        enemyDefense: 12
      }
    ]
  },
  {
    id: 'mirage_marsh_devourer',
    regionId: 'mirage_marsh',
    name: '潮息异兽',
    description: '潜伏在泽地深处的首领，会围绕水位、污染与展示样本争夺施压。',
    rewardFamilyId: 'ecology_specimen',
    staminaCost: 6,
    timeCostHours: 1,
    phases: [
      {
        id: 'marsh_p1',
        label: '潮雾逼近',
        summary: '围绕视野遮蔽与样本观察展开的开场阶段。',
        enemyHp: 40,
        enemyAttack: 17,
        enemyDefense: 9
      },
      {
        id: 'marsh_p2',
        label: '泽心回响',
        summary: '围绕生态异常与样本稳定展开的中段阶段。',
        enemyHp: 55,
        enemyAttack: 20,
        enemyDefense: 11
      },
      {
        id: 'marsh_p3',
        label: '蜃潮吞没',
        summary: '围绕高压反扑与终局展示展开的收尾阶段。',
        enemyHp: 66,
        enemyAttack: 23,
        enemyDefense: 13
      }
    ]
  },
  {
    id: 'cloud_highland_warden',
    regionId: 'cloud_highland',
    name: '云岚守脉者',
    description: '守在高地灵脉节点的首领，会围绕采晶压力、清剿路线与战备损耗施压。',
    rewardFamilyId: 'ley_crystal',
    staminaCost: 7,
    timeCostHours: 1.17,
    phases: [
      {
        id: 'highland_p1',
        label: '碎岚压阵',
        summary: '围绕高地巡路与护脉压阵展开的开场阶段。',
        enemyHp: 46,
        enemyAttack: 19,
        enemyDefense: 10
      },
      {
        id: 'highland_p2',
        label: '脉核共振',
        summary: '围绕灵脉过载与战备压力展开的中段阶段。',
        enemyHp: 60,
        enemyAttack: 23,
        enemyDefense: 13
      },
      {
        id: 'highland_p3',
        label: '守脉终战',
        summary: '围绕首领爆发与最终清剿展开的收尾阶段。',
        enemyHp: 74,
        enemyAttack: 27,
        enemyDefense: 15
      }
    ]
  }
]

const createDefaultUnlockStates = (): Record<RegionId, RegionUnlockState> =>
  Object.fromEntries(
    REGION_DEFS.map(region => [region.id, { unlocked: false, unlockedDayTag: '' } satisfies RegionUnlockState])
  ) as Record<RegionId, RegionUnlockState>

const createDefaultRouteStates = (): Record<string, RegionRouteState> =>
  Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      route.id,
      {
        routeId: route.id,
        unlocked: false,
        completions: 0,
        lastCompletedDayTag: ''
      } satisfies RegionRouteState
    ])
  )

const createDefaultEventStates = (): Record<string, RegionEventState> =>
  Object.fromEntries(
    REGION_EVENT_DEFS.map(event => [
      event.id,
      {
        eventId: event.id,
        totalCompletions: 0,
        weeklyCompletions: 0,
        lastCompletedDayTag: '',
        lastActivatedWeekId: ''
      } satisfies RegionEventState
    ])
  )

const createDefaultKnowledgeState = (): Record<RegionId, RegionKnowledgeState> =>
  Object.fromEntries(
    REGION_DEFS.map(region => [
      region.id,
      {
        regionId: region.id,
        intel: 0,
        survey: 0,
        familiarity: 0,
        lastUpdatedDayTag: ''
      } satisfies RegionKnowledgeState
    ])
  ) as Record<RegionId, RegionKnowledgeState>

const createDefaultRouteKnowledgeState = (): Record<string, RegionRouteKnowledgeState> =>
  Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      route.id,
      {
        routeId: route.id,
        intel: 0,
        surveyProgress: 0,
        familiarity: 0,
        lastUpdatedDayTag: ''
      } satisfies RegionRouteKnowledgeState
    ])
  )

const createDefaultWeeklyFocusState = (): RegionWeeklyFocusState => ({
  weekId: '',
  focusedRegionId: null,
  highlightedRouteIds: []
})

const createDefaultWeeklyEventState = (): RegionWeeklyEventState => ({
  weekId: '',
  activeEventIdsByRegion: {
    ancient_road: [],
    mirage_marsh: [],
    cloud_highland: []
  },
  lastRefreshedDayTag: ''
})

const createDefaultExpeditionRuntimeState = (): ExpeditionRuntimeState => ({
  activeRegionId: null,
  activeRouteId: null,
  activeBossId: null,
  startedAtDayTag: ''
})

const createDefaultTelemetry = (): RegionTelemetrySnapshot => ({
  totalRouteCompletions: 0,
  bossClears: 0,
  resourceTurnIns: 0
})

export const createDefaultRegionExpeditionSupplyState = (): RegionExpeditionSupplyState => ({
  rations: 2,
  medicine: 1,
  utility: 1
})

export const createDefaultRegionExpeditionSession = (): RegionExpeditionSession | null => null

export const createDefaultRegionJourneyHistory = (): RegionExpeditionArchiveEntry[] => []

const createDefaultMapNodeStates = (): Record<string, RegionMapNodeState> => ({
  ...Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      getRouteMapNodeKey(route.id),
      {
        nodeKey: getRouteMapNodeKey(route.id),
        regionId: route.regionId,
        routeId: route.id,
        bossId: null,
        nodeType: route.nodeType,
        visibilityStage: 'unknown',
        visitCount: 0,
        surveyCount: 0,
        lastVisitedDayTag: ''
      } satisfies RegionMapNodeState
    ])
  ),
  ...Object.fromEntries(
    REGION_DEFS.map(region => [
      getBossMapNodeKey(region.id),
      {
        nodeKey: getBossMapNodeKey(region.id),
        regionId: region.id,
        routeId: null,
        bossId: getRegionBossDef(region.id)?.id ?? null,
        nodeType: 'boss',
        visibilityStage: 'unknown',
        visitCount: 0,
        surveyCount: 0,
        lastVisitedDayTag: ''
      } satisfies RegionMapNodeState
    ])
  )
}) as Record<string, RegionMapNodeState>

const createDefaultCampStates = (): Record<string, RegionCampSiteState> => ({
  ...Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      getCampSiteKey(route.regionId, route.id, null),
      {
        campKey: getCampSiteKey(route.regionId, route.id, null),
        regionId: route.regionId,
        routeId: route.id,
        bossId: null,
        visitCount: 0,
        restCount: 0,
        sortCount: 0,
        markCount: 0,
        scoutCount: 0,
        safetyProgress: 0,
        stashTier: 0,
        lastUsedDayTag: ''
      } satisfies RegionCampSiteState
    ])
  ),
  ...Object.fromEntries(
    REGION_DEFS.map(region => [
      getCampSiteKey(region.id, null, getRegionBossDef(region.id)?.id ?? null),
      {
        campKey: getCampSiteKey(region.id, null, getRegionBossDef(region.id)?.id ?? null),
        regionId: region.id,
        routeId: null,
        bossId: getRegionBossDef(region.id)?.id ?? null,
        visitCount: 0,
        restCount: 0,
        sortCount: 0,
        markCount: 0,
        scoutCount: 0,
        safetyProgress: 0,
        stashTier: 0,
        lastUsedDayTag: ''
      } satisfies RegionCampSiteState
    ])
  )
}) as Record<string, RegionCampSiteState>

const createDefaultShortcutStates = (): Record<string, RegionShortcutState> =>
  Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      route.id,
      {
        routeId: route.id,
        level: 'none',
        masteryRuns: 0,
        markedEntrances: 0,
        lastUpdatedDayTag: ''
      } satisfies RegionShortcutState
    ])
  ) as Record<string, RegionShortcutState>

const createDefaultBossClearCounts = (): Record<RegionId, number> =>
  Object.fromEntries(REGION_DEFS.map(region => [region.id, 0])) as Record<RegionId, number>

const createDefaultBossFailureStreaks = (): Record<RegionId, number> =>
  Object.fromEntries(REGION_DEFS.map(region => [region.id, 0])) as Record<RegionId, number>

const createDefaultBossOutcomeState = (): RegionBossOutcomeState => ({
  regionId: null,
  bossId: null,
  outcome: 'none',
  rewardFamilyId: null,
  rewardAmount: 0,
  resolvedDayTag: '',
  summary: '',
  recommendedRouteId: null,
  failureStreak: 0
})

const createDefaultResourceLedger = (): Record<RegionalResourceFamilyId, number> =>
  Object.fromEntries(REGIONAL_RESOURCE_FAMILY_DEFS.map(family => [family.id, 0])) as Record<RegionalResourceFamilyId, number>

const createDefaultSeasonalRegionStates = (): Record<RegionId, RegionSeasonalState> =>
  Object.fromEntries(
    REGION_DEFS.map(region => [
      region.id,
      {
        regionId: region.id,
        weekId: '',
        season: 'spring',
        weather: 'sunny',
        activeVariantId: null,
        activeVariantLabel: '',
        summary: '',
        detailLines: [],
        affectedRouteIds: [],
        manualExplorationRequired: false,
        seenVariantIds: [],
        lastUpdatedDayTag: ''
      } satisfies RegionSeasonalState
    ])
  ) as unknown as Record<RegionId, RegionSeasonalState>

const createDefaultRumorBoardState = (): RegionRumorBoardState => ({
  weekId: '',
  lastRefreshedDayTag: '',
  entriesByRegion: {
    ancient_road: [],
    mirage_marsh: [],
    cloud_highland: []
  }
})

const createDefaultCompanionContracts = (): RegionCompanionContract[] => []

const createDefaultAutoPatrolStates = (): Record<string, RegionAutoPatrolState> =>
  Object.fromEntries(
    REGION_ROUTE_DEFS.map(route => [
      route.id,
      {
        routeId: route.id,
        enabled: true,
        mode: 'manual',
        lastAutoSettledDayTag: '',
        lastEvaluatedDayTag: '',
        blockedReason: '',
        blockedTags: []
      } satisfies RegionAutoPatrolState
    ])
  ) as Record<string, RegionAutoPatrolState>

export const createDefaultRegionMapSaveData = (): RegionMapSaveData => ({
  saveVersion: REGION_MAP_SAVE_VERSION,
  unlockStates: createDefaultUnlockStates(),
  routeStates: createDefaultRouteStates(),
  eventStates: createDefaultEventStates(),
  weeklyFocusState: createDefaultWeeklyFocusState(),
  weeklyEventState: createDefaultWeeklyEventState(),
  resourceLedger: createDefaultResourceLedger(),
  expedition: createDefaultExpeditionRuntimeState(),
  activeSession: createDefaultRegionExpeditionSession(),
  journeyHistory: createDefaultRegionJourneyHistory(),
  knowledgeState: createDefaultKnowledgeState(),
  routeKnowledgeState: createDefaultRouteKnowledgeState(),
  mapNodeStates: createDefaultMapNodeStates(),
  campStates: createDefaultCampStates(),
  shortcutStates: createDefaultShortcutStates(),
  seasonalRegionStates: createDefaultSeasonalRegionStates(),
  companionContracts: createDefaultCompanionContracts(),
  rumorBoard: createDefaultRumorBoardState(),
  autoPatrolStates: createDefaultAutoPatrolStates(),
  telemetry: createDefaultTelemetry(),
  bossClearCounts: createDefaultBossClearCounts(),
  bossFailureStreaks: createDefaultBossFailureStreaks(),
  lastBossOutcome: createDefaultBossOutcomeState()
})

export const getRegionDef = (regionId: RegionId) => REGION_DEFS.find(region => region.id === regionId) ?? null

export const getRegionRoutes = (regionId: RegionId) => REGION_ROUTE_DEFS.filter(route => route.regionId === regionId)

export const getRegionEvents = (regionId: RegionId) => REGION_EVENT_DEFS.filter(event => event.regionId === regionId)

export const getRegionBossDef = (regionId: RegionId) => REGION_BOSS_DEFS.find(boss => boss.regionId === regionId) ?? null
