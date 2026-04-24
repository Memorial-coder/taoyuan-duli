import type {
  ExpeditionRuntimeState,
  RegionBossDef,
  RegionDef,
  RegionId,
  RegionMapSaveData,
  RegionRouteState,
  RegionUnlockState,
  RegionWeeklyFocusState,
  RegionalResourceFamilyDef,
  RegionalResourceFamilyId,
  RegionRouteDef,
  RegionTelemetrySnapshot
} from '@/types/region'

export const REGION_MAP_SAVE_VERSION = 1

export const REGIONAL_RESOURCE_FAMILY_DEFS: RegionalResourceFamilyDef[] = [
  {
    id: 'ancient_archive',
    label: '古迹残卷',
    description: '围绕旧驿账册、残页拓片与古路文书组织的区域资源家族，服务任务、瀚海、博物馆与活动文书承接。',
    linkedSystems: ['quest', 'shop', 'museum', 'hanhai']
  },
  {
    id: 'ecology_specimen',
    label: '生态样本',
    description: '围绕鱼样、藻样、孢子和幼体记录组织的区域资源家族，服务鱼塘、展示、馆务与活动样本链。',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet']
  },
  {
    id: 'ley_crystal',
    label: '灵脉结晶',
    description: '围绕高地矿髓、风蚀结晶与首领残核组织的区域资源家族，服务公会、建设、高阶准备与后续票券消耗。',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet']
  }
]

export const REGION_DEFS: RegionDef[] = [
  {
    id: 'ancient_road',
    name: '古驿荒道',
    description: '围绕旧驿站、古路账册与护送风险建立的商路前段区域，适合作为瀚海与任务承接的前置地图。',
    themeHint: '商路、古迹、护送、驿站、瀚海承接',
    linkedSystems: ['quest', 'shop', 'museum', 'hanhai']
  },
  {
    id: 'mirage_marsh',
    name: '蜃潮泽地',
    description: '围绕湿地生态、夜游观察与样本展示建立的研究型区域，适合作为鱼塘、馆务与展示活动的样本来源地。',
    themeHint: '样本、夜游、湿地、展示、研究',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet']
  },
  {
    id: 'cloud_highland',
    name: '云岚高地',
    description: '围绕高地矿脉、危险路段与精英清剿建立的战备区域，适合作为公会和建设高阶承接的战斗前线。',
    themeHint: '高地、灵脉、精英、清剿、公会承接',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet']
  }
]

export const REGION_ROUTE_DEFS: RegionRouteDef[] = [
  {
    id: 'ancient_road_supply_relay',
    regionId: 'ancient_road',
    name: '旧驿补给线',
    description: '沿着荒道旧驿推进，偏向补给、货物和沿线风险处理。',
    nodeType: 'route',
    staminaCost: 3,
    timeCostHours: 0.5,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '适合先把补给、关券和沿线站点状态摸清，再决定后续护送还是回收残卷。',
    handoffHint: '跑完后优先回任务板补物流单，或先去商圈补足下一轮护送消耗。'
  },
  {
    id: 'ancient_road_archive_recovery',
    regionId: 'ancient_road',
    name: '残卷回收线',
    description: '回收荒道沿线文书与残卷，偏向古迹说明与馆务承接。',
    nodeType: 'handoff',
    unlockRouteIds: ['ancient_road_supply_relay'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'museum', 'hanhai'],
    encounterHint: '更偏档案回收和旧驿碑刻整理，适合补齐说明链与馆务资料。',
    handoffHint: '残卷和拓片最适合回博物馆、瀚海做说明承接，也能带动任务页的古迹线。'
  },
  {
    id: 'ancient_road_convoy_risk',
    regionId: 'ancient_road',
    name: '护送风险线',
    description: '围绕车队压力、前哨警戒与危卡节点处理展开的精英节点。',
    nodeType: 'elite',
    unlockCompletionCount: 2,
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ancient_archive',
    linkedSystems: ['quest', 'shop', 'hanhai'],
    encounterHint: '这里会把护送、补给、站点风险压成一轮高压推进，更像首领前的实战预演。',
    handoffHint: '完成后优先接限时护送和瀚海合同前置，顺手把商圈补给包一起消化。'
  },
  {
    id: 'mirage_marsh_night_watch',
    regionId: 'mirage_marsh',
    name: '夜游观察线',
    description: '围绕泽地夜间生态与样本观测展开，偏向样本发现与展示高光。',
    nodeType: 'event',
    staminaCost: 3,
    timeCostHours: 0.5,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond'],
    encounterHint: '适合先摸清泽地夜游节奏，带回第一批可展示的样本与观察记录。',
    handoffHint: '先回鱼塘看周赛和展示位，再把高光样本送进馆务或研究委托。'
  },
  {
    id: 'mirage_marsh_specimen_drive',
    regionId: 'mirage_marsh',
    name: '样本护送线',
    description: '围绕样本整理、护送与活动承接展开，偏向周赛资格与馆务研究。',
    nodeType: 'handoff',
    unlockRouteIds: ['mirage_marsh_night_watch'],
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet'],
    encounterHint: '更偏样本整理与护送，适合把研究线、展示线和结算线串成一轮。',
    handoffHint: '完成后优先回鱼塘上展示池或进博物馆接馆务，也能顺带吃活动邮件链。'
  },
  {
    id: 'mirage_marsh_ecology_alert',
    regionId: 'mirage_marsh',
    name: '生态异常线',
    description: '围绕水位异动、样本污染和幼体稳定展开的精英节点。',
    nodeType: 'elite',
    unlockCompletionCount: 2,
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ecology_specimen',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet'],
    encounterHint: '这里会把夜游观察、异常压制和样本稳定压进同一轮，适合做首领前热身。',
    handoffHint: '完成后优先收束到鱼塘展示、周赛和博物馆学者委托，把样本价值转成稳定回报。'
  },
  {
    id: 'cloud_highland_patrol',
    regionId: 'cloud_highland',
    name: '高地巡路线',
    description: '围绕危险地段巡路和补给推进展开，偏向公会清剿与建设备料。',
    nodeType: 'elite',
    staminaCost: 5,
    timeCostHours: 0.75,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'villageProject'],
    encounterHint: '适合先把高地巡路和清剿节奏压稳，再考虑上更高风险的灵脉线。',
    handoffHint: '巡路成果优先回公会和建设承接，先把清剿奖励与材料出口接住。'
  },
  {
    id: 'cloud_highland_ley_crack',
    regionId: 'cloud_highland',
    name: '灵脉采晶线',
    description: '围绕灵脉裂隙、采晶和高阶准备展开，偏向资源收束与首领前置。',
    nodeType: 'route',
    staminaCost: 4,
    timeCostHours: 0.67,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'wallet'],
    encounterHint: '更偏灵脉采集和战备收束，适合准备高地首领或高风险票券路线。',
    handoffHint: '采晶后优先回公会和钱包处理奖励与高阶准备，再决定是否继续冲首领。'
  },
  {
    id: 'cloud_highland_supply_push',
    regionId: 'cloud_highland',
    name: '前哨补给线',
    description: '围绕前哨转运、补给棚整备与高地危险路线展开，偏向建设前置与首领前战备。',
    nodeType: 'handoff',
    unlockRouteIds: ['cloud_highland_patrol'],
    staminaCost: 5,
    timeCostHours: 0.84,
    primaryResourceFamilyId: 'ley_crystal',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet'],
    encounterHint: '这里会把清剿、补给和山路危险压成同一轮，适合在首领前检查战备是否齐整。',
    handoffHint: '完成后优先回公会确认战备目标，再去村庄建设和钱包收束高地投入。'
  }
]

export const REGION_BOSS_DEFS: RegionBossDef[] = [
  {
    id: 'ancient_road_overseer',
    regionId: 'ancient_road',
    name: '荒道监军',
    description: '盘踞旧驿要冲的首领，会在补给、文书和护送节点之间切换压迫感。',
    rewardFamilyId: 'ancient_archive',
    staminaCost: 6,
    timeCostHours: 1,
    phases: [
      { id: 'overseer_p1', label: '封路警戒', summary: '围绕路障与护送压力展开的开场阶段。' },
      { id: 'overseer_p2', label: '账册追索', summary: '围绕残卷争夺和路线转移展开的中段阶段。' },
      { id: 'overseer_p3', label: '旧驿决断', summary: '围绕高压指挥与终局收尾展开的阶段。' }
    ]
  },
  {
    id: 'mirage_marsh_devourer',
    regionId: 'mirage_marsh',
    name: '潮息异兽',
    description: '潜伏在泽地深处的首领，会围绕水位、样本污染和展示样本争夺施压。',
    rewardFamilyId: 'ecology_specimen',
    staminaCost: 6,
    timeCostHours: 1,
    phases: [
      { id: 'marsh_p1', label: '潮雾逼近', summary: '围绕视野遮蔽和样本观察展开的开场阶段。' },
      { id: 'marsh_p2', label: '沼心回响', summary: '围绕湿地异常与样本稳定展开的中段阶段。' },
      { id: 'marsh_p3', label: '蜃潮吞噬', summary: '围绕高压生态反扑与终局展示展开的阶段。' }
    ]
  },
  {
    id: 'cloud_highland_warden',
    regionId: 'cloud_highland',
    name: '云岚守脉者',
    description: '守在高地灵脉节点的首领，会围绕采晶压力、精英护卫和战备消耗施压。',
    rewardFamilyId: 'ley_crystal',
    staminaCost: 7,
    timeCostHours: 1.17,
    phases: [
      { id: 'highland_p1', label: '碎岚压阵', summary: '围绕高地巡路和碎晶护卫展开的开场阶段。' },
      { id: 'highland_p2', label: '脉核共振', summary: '围绕灵脉过载与战备压力展开的中段阶段。' },
      { id: 'highland_p3', label: '守脉终战', summary: '围绕首领爆发与终局清剿展开的阶段。' }
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

const createDefaultWeeklyFocusState = (): RegionWeeklyFocusState => ({
  weekId: '',
  focusedRegionId: null,
  highlightedRouteIds: []
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

const createDefaultResourceLedger = (): Record<RegionalResourceFamilyId, number> =>
  Object.fromEntries(REGIONAL_RESOURCE_FAMILY_DEFS.map(family => [family.id, 0])) as Record<RegionalResourceFamilyId, number>

export const createDefaultRegionMapSaveData = (): RegionMapSaveData => ({
  saveVersion: REGION_MAP_SAVE_VERSION,
  unlockStates: createDefaultUnlockStates(),
  routeStates: createDefaultRouteStates(),
  weeklyFocusState: createDefaultWeeklyFocusState(),
  resourceLedger: createDefaultResourceLedger(),
  expedition: createDefaultExpeditionRuntimeState(),
  telemetry: createDefaultTelemetry()
})

export const getRegionDef = (regionId: RegionId) => REGION_DEFS.find(region => region.id === regionId) ?? null

export const getRegionRoutes = (regionId: RegionId) => REGION_ROUTE_DEFS.filter(route => route.regionId === regionId)

export const getRegionBossDef = (regionId: RegionId) => REGION_BOSS_DEFS.find(boss => boss.regionId === regionId) ?? null
