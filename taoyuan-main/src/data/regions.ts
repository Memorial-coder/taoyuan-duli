import type {
  JourneyRequiredStats,
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
  RegionOpenWorldId,
  RegionOpenWorldRegionDef,
  RegionOpenWorldRegionState,
  RegionOpenWorldSaveData,
  RegionOpenWorldTileDef,
  RegionOpenWorldTileState,
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
import type { SkillType, WeaponType } from '@/types'
import { JOURNEY_AWAKENINGS, JOURNEY_CAMP_MODULES, JOURNEY_CRAFTING_RECIPES, JOURNEY_ROUTE_PERMITS } from './journeyHub.ts'

export const REGION_MAP_SAVE_VERSION = 11

export const getRouteMapNodeKey = (routeId: string) => `route:${routeId}`

export const getBossMapNodeKey = (regionId: RegionId) => `boss:${regionId}`

export const getCampSiteKey = (regionId: RegionId, routeId: string | null, bossId: string | null) =>
  routeId ? `route:${routeId}` : `boss:${bossId ?? regionId}`

const withJourneyLinks = <T extends { linkedSystems: RegionDef['linkedSystems'] }>(def: T): T => ({
  ...def,
  linkedSystems: [...new Set([...def.linkedSystems, 'inventory', 'skills'])]
})

const createRequiredStats = (
  minHpPercent: number,
  minStamina: number,
  minBuildScore: number,
  focusLines: string[]
): JourneyRequiredStats => ({
  minHpPercent,
  minStamina,
  minBuildScore,
  focusLines
})

const createXpRewards = (
  primary: SkillType,
  secondary: SkillType,
  tertiary: SkillType
) => ({
  victory: {
    [primary]: 16,
    [secondary]: 10,
    [tertiary]: 6
  },
  retreated: {
    [primary]: 8,
    [secondary]: 4,
    [tertiary]: 2
  },
  failure: {
    [primary]: 4,
    [secondary]: 2,
    [tertiary]: 1
  }
})

const ancientRoadRouteMeta = (
  weaponBias: WeaponType[],
  craftingUnlocks: string[],
  requiredStats: JourneyRequiredStats
) => ({
  journeyAffinities: ['foraging', 'combat', 'farming'] as SkillType[],
  weaponBias,
  xpRewards: createXpRewards('foraging', 'combat', 'farming'),
  requiredStats,
  craftingUnlocks,
  awakeningUnlocks: ['ancient_road_archivist_stride', 'ancient_road_convoy_guard']
})

const mirageRouteMeta = (
  weaponBias: WeaponType[],
  craftingUnlocks: string[],
  requiredStats: JourneyRequiredStats
) => ({
  journeyAffinities: ['fishing', 'foraging', 'combat'] as SkillType[],
  weaponBias,
  xpRewards: createXpRewards('fishing', 'foraging', 'combat'),
  requiredStats,
  craftingUnlocks,
  awakeningUnlocks: ['mirage_marsh_specimen_reader', 'mirage_marsh_calm_water']
})

const highlandRouteMeta = (
  weaponBias: WeaponType[],
  craftingUnlocks: string[],
  requiredStats: JourneyRequiredStats
) => ({
  journeyAffinities: ['mining', 'combat', 'farming'] as SkillType[],
  weaponBias,
  xpRewards: createXpRewards('mining', 'combat', 'farming'),
  requiredStats,
  craftingUnlocks,
  awakeningUnlocks: ['cloud_highland_ley_forge', 'cloud_highland_quartermaster']
})

const REGION_ROUTE_JOURNEY_META: Record<
  string,
  Pick<
    RegionRouteDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
> = {
  ancient_road_supply_relay: ancientRoadRouteMeta(
    ['sword'],
    ['courier_stride_boots_recipe'],
    createRequiredStats(0.28, 3, 16, ['优先稳住口粮、侦察和护送节奏。'])
  ),
  ancient_road_watchtower_scout: ancientRoadRouteMeta(
    ['dagger', 'sword'],
    ['relay_command_ring_recipe'],
    createRequiredStats(0.3, 4, 20, ['这条线偏侦察，先看视野和事件把控。'])
  ),
  ancient_road_archive_recovery: ancientRoadRouteMeta(
    ['dagger'],
    ['relay_command_ring_recipe'],
    createRequiredStats(0.3, 4, 22, ['先把样本和线索背回来，再回城承接。'])
  ),
  ancient_road_convoy_risk: ancientRoadRouteMeta(
    ['sword', 'club'],
    ['ancient_road_wayblade_recipe'],
    createRequiredStats(0.42, 5, 30, ['这是荒道首领前的高压预演，别空装硬压。'])
  ),
  mirage_marsh_night_watch: mirageRouteMeta(
    ['dagger'],
    ['reedstep_waders_recipe'],
    createRequiredStats(0.28, 3, 18, ['先做夜游观察，再追求样本密度。'])
  ),
  mirage_marsh_reed_drift: mirageRouteMeta(
    ['dagger'],
    ['reedstep_waders_recipe'],
    createRequiredStats(0.3, 4, 20, ['偏观察与采样，侦察与幸运收益更高。'])
  ),
  mirage_marsh_specimen_drive: mirageRouteMeta(
    ['dagger', 'sword'],
    ['specimen_lens_ring_recipe'],
    createRequiredStats(0.32, 4, 24, ['更偏样本护送与回流兑现。'])
  ),
  mirage_marsh_ecology_alert: mirageRouteMeta(
    ['dagger', 'club'],
    ['marsh_whisper_dagger_recipe'],
    createRequiredStats(0.4, 5, 30, ['高压异常线更吃恢复、冷静与危险控制。'])
  ),
  cloud_highland_ley_crack: highlandRouteMeta(
    ['club', 'sword'],
    ['bulwark_crystal_ring_recipe'],
    createRequiredStats(0.35, 4, 22, ['先把晶体和补给采回来，再谈高压线。'])
  ),
  cloud_highland_skybridge_watch: highlandRouteMeta(
    ['sword', 'club'],
    ['skywatch_helm_recipe'],
    createRequiredStats(0.38, 4, 24, ['偏巡路与观察，装备不足时别先冲主线。'])
  ),
  cloud_highland_patrol: highlandRouteMeta(
    ['club', 'sword'],
    ['highland_bastion_maul_recipe'],
    createRequiredStats(0.45, 5, 32, ['这是高地主战节奏，承伤和破障很重要。'])
  ),
  cloud_highland_supply_push: highlandRouteMeta(
    ['club'],
    ['bulwark_crystal_ring_recipe'],
    createRequiredStats(0.48, 5, 34, ['补给线会直接决定你能不能稳定接首领。'])
  )
}

const REGION_EVENT_JOURNEY_META: Record<
  string,
  Pick<
    RegionEventDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
> = {
  ancient_road_station_blackout: ancientRoadRouteMeta(['dagger', 'sword'], [], createRequiredStats(0.26, 2, 14, ['适合补侦察与轻回流。'])),
  ancient_road_sand_market: ancientRoadRouteMeta(['dagger'], [], createRequiredStats(0.28, 3, 16, ['更偏线索与残卷回收。'])),
  ancient_road_detour_rescue: ancientRoadRouteMeta(['sword', 'club'], [], createRequiredStats(0.38, 4, 24, ['护送与压险权重更高。'])),
  mirage_marsh_spore_bloom: mirageRouteMeta(['dagger'], [], createRequiredStats(0.26, 2, 14, ['适合快速补样本。'])),
  mirage_marsh_moon_nursery: mirageRouteMeta(['dagger'], [], createRequiredStats(0.28, 3, 16, ['偏样本稳定与观察。'])),
  mirage_marsh_reed_migration: mirageRouteMeta(['dagger', 'club'], [], createRequiredStats(0.34, 4, 22, ['更吃异常处理与恢复。'])),
  cloud_highland_ley_surge: highlandRouteMeta(['club'], [], createRequiredStats(0.32, 3, 18, ['偏晶体回收与补给准备。'])),
  cloud_highland_signal_patrol: highlandRouteMeta(['sword', 'club'], [], createRequiredStats(0.36, 4, 22, ['偏巡路与战备。'])),
  cloud_highland_cache_collapse: highlandRouteMeta(['club'], [], createRequiredStats(0.42, 4, 28, ['更吃承伤与撤退控制。']))
}

const REGION_BOSS_JOURNEY_META: Record<
  string,
  Pick<
    RegionBossDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
> = {
  ancient_road_overseer: {
    journeyAffinities: ['combat', 'foraging', 'farming'],
    weaponBias: ['sword', 'club'],
    xpRewards: createXpRewards('combat', 'foraging', 'farming'),
    requiredStats: createRequiredStats(0.55, 6, 42, ['首领线更吃护送稳定、承伤和口粮统筹。']),
    craftingUnlocks: ['roadwarden_hood_recipe'],
    awakeningUnlocks: ['ancient_road_convoy_guard']
  },
  mirage_marsh_devourer: {
    journeyAffinities: ['combat', 'fishing', 'foraging'],
    weaponBias: ['dagger', 'club'],
    xpRewards: createXpRewards('combat', 'fishing', 'foraging'),
    requiredStats: createRequiredStats(0.55, 6, 42, ['首领线更吃异常控制、夜巡恢复和样本节奏。']),
    craftingUnlocks: ['sporeglass_hood_recipe'],
    awakeningUnlocks: ['mirage_marsh_calm_water']
  },
  cloud_highland_warden: {
    journeyAffinities: ['combat', 'mining', 'farming'],
    weaponBias: ['club', 'sword'],
    xpRewards: createXpRewards('combat', 'mining', 'farming'),
    requiredStats: createRequiredStats(0.6, 7, 46, ['首领线更吃高地战备、承伤和补给闭环。']),
    craftingUnlocks: ['stormforged_greaves_recipe'],
    awakeningUnlocks: ['cloud_highland_quartermaster']
  }
}

const withJourneyRouteMeta = (
  route: Omit<
    RegionRouteDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
): RegionRouteDef => {
  const journeyMeta = REGION_ROUTE_JOURNEY_META[route.id as keyof typeof REGION_ROUTE_JOURNEY_META]!
  return {
    ...withJourneyLinks(route),
    ...journeyMeta
  } as RegionRouteDef
}

const withJourneyEventMeta = (
  event: Omit<
    RegionEventDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
): RegionEventDef => {
  const journeyMeta = REGION_EVENT_JOURNEY_META[event.id as keyof typeof REGION_EVENT_JOURNEY_META]!
  return {
    ...withJourneyLinks(event),
    ...journeyMeta
  } as RegionEventDef
}

const withJourneyBossMeta = (
  boss: Omit<
    RegionBossDef,
    'journeyAffinities' | 'weaponBias' | 'xpRewards' | 'requiredStats' | 'craftingUnlocks' | 'awakeningUnlocks'
  >
): RegionBossDef => {
  const journeyMeta = REGION_BOSS_JOURNEY_META[boss.id as keyof typeof REGION_BOSS_JOURNEY_META]!
  return {
    ...boss,
    ...journeyMeta
  } as RegionBossDef
}

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
  withJourneyLinks({
    id: 'ancient_road',
    name: '古驿荒道',
    description: '围绕旧驿站、商队补给、古路账册与押运风险展开的商路前段区域，适合作为瀚海与任务链的前置空间。',
    themeHint: '商路、古迹、护送、驿站、瀚海承接',
    linkedSystems: ['quest', 'shop', 'museum', 'hanhai']
  }),
  withJourneyLinks({
    id: 'mirage_marsh',
    name: '蜃潮泽地',
    description: '围绕湿地夜游、样本观察、生态异常与展示回流展开的研究型区域，适合作为鱼塘与博物馆的样本来源地。',
    themeHint: '样本、夜游、湿地、展示、研究',
    linkedSystems: ['quest', 'museum', 'fishPond', 'wallet']
  }),
  withJourneyLinks({
    id: 'cloud_highland',
    name: '云岚高地',
    description: '围绕高地巡路、灵脉采集、前哨补给与精英清剿展开的战备区域，适合作为公会与村建高阶承接前线。',
    themeHint: '高地、灵脉、精英、清剿、公会承接',
    linkedSystems: ['quest', 'guild', 'villageProject', 'wallet']
  })
]

export const REGION_ROUTE_DEFS: RegionRouteDef[] = [
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  }),
  withJourneyRouteMeta({
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
  })
]

export const REGION_EVENT_DEFS: RegionEventDef[] = [
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  }),
  withJourneyEventMeta({
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
  })
]

export const REGION_BOSS_DEFS: RegionBossDef[] = [
  withJourneyBossMeta({
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
  }),
  withJourneyBossMeta({
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
  }),
  withJourneyBossMeta({
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
  })
]

const createOpenWorldTile = (
  id: string,
  x: number,
  y: number,
  terrain: RegionOpenWorldTileDef['terrain'],
  label: string,
  description: string,
  options: Partial<Omit<RegionOpenWorldTileDef, 'id' | 'x' | 'y' | 'terrain' | 'label' | 'description'>> = {}
): RegionOpenWorldTileDef => ({
  id,
  x,
  y,
  terrain,
  label,
  description,
  objectType: options.objectType,
  actionId: options.actionId,
  staminaCost: options.staminaCost ?? 0,
  timeCostHours: options.timeCostHours ?? 0,
  rewardItems: options.rewardItems?.map(item => ({ ...item })) ?? [],
  rewardFamilyId: options.rewardFamilyId ?? null,
  rewardFamilyAmount: options.rewardFamilyAmount ?? 0,
  dailyRefresh: options.dailyRefresh ?? false,
  routeId: options.routeId ?? null,
  eventId: options.eventId ?? null,
  bossId: options.bossId ?? null,
  outpostId: options.outpostId ?? null,
  revealsRadius: options.revealsRadius ?? 1
})

const OUTSKIRTS_OPEN_WORLD_WIDTH = 12
const OUTSKIRTS_OPEN_WORLD_HEIGHT = 10

const getOpenWorldTileCoordKey = (x: number, y: number) => `${x}:${y}`

const createOpenWorldEmptyTile = (
  regionId: RegionOpenWorldId,
  x: number,
  y: number,
  terrain: RegionOpenWorldTileDef['terrain'],
  label: string,
  description: string
) => createOpenWorldTile(`${regionId}:empty_${x}_${y}`, x, y, terrain, label, description)

const getOutskirtsEmptyTerrain = (x: number, y: number): RegionOpenWorldTileDef['terrain'] => {
  if (x <= 2 && y >= 4 && y <= 6) return 'road'
  if (y >= 8 || (x <= 1 && y >= 7)) return 'water'
  if ((x >= 3 && x <= 8 && y <= 4) || (x >= 7 && y === 6)) return 'bamboo'
  if (x >= 7 || (x >= 5 && y >= 6)) return 'forest'
  return 'grass'
}

const OUTSKIRTS_EMPTY_TILE_COPY: Record<RegionOpenWorldTileDef['terrain'], { labels: string[]; descriptions: string[] }> = {
  grass: {
    labels: ['浅草地', '野花坡', '草径', '空草坪'],
    descriptions: ['浅草没过脚面，暂时没有可采的东西。', '野花贴着土坡开着，只适合经过和辨路。', '草径分出细小岔路，远处还压着雾。', '空草坪视野开阔，可以作为临时落脚点。']
  },
  bamboo: {
    labels: ['竹影地', '疏竹间', '竹林边', '竹叶坪'],
    descriptions: ['竹影落在地上，这一格暂时没有成熟竹材。', '稀疏竹子之间能看见更深的林路。', '竹林边缘有风声，适合继续摸索。', '竹叶铺成软地，只留下浅浅脚印。']
  },
  forest: {
    labels: ['林间空地', '树影径', '松土坡', '林缘草处'],
    descriptions: ['林间留出一小块空地，没有明显资源。', '树影遮住小径，适合绕行观察。', '松土上有旧脚印，但今天没有新东西。', '草叶贴着林缘生长，深处还有空间。']
  },
  road: {
    labels: ['旧路弯', '土路口', '碎石径', '行旅岔口'],
    descriptions: ['旧路在这里轻轻拐弯，可以继续往外走。', '土路口没有人影，只留下车辙。', '碎石铺成窄径，脚步声很清楚。', '几条小路在这里分开，适合选择方向。']
  },
  ruin: {
    labels: ['旧石痕', '断墙角', '残瓦地', '荒基'],
    descriptions: ['旧石痕埋在草里，暂时只能作为地标。', '断墙角挡住一点风，没有可处理对象。', '残瓦散在脚边，像是早年屋舍留下的。', '荒基只剩浅浅轮廓，后续也许能接上旧事。']
  },
  water: {
    labels: ['浅溪湾', '溪边石', '湿草滩', '小水洼'],
    descriptions: ['浅溪在这里放缓，暂时没有可拾取物。', '溪边石被水磨得很圆，可以踩着经过。', '湿草滩留下水痕，需要慢慢辨路。', '小水洼映出竹影，只是近郊地貌。']
  },
  marsh: {
    labels: ['湿草窝', '软泥边', '芦叶隙', '潮痕地'],
    descriptions: ['湿草伏在地面，暂时没有生态对象。', '软泥边能留下脚印，适合观察方向。', '芦叶之间有空隙，可以继续前进。', '潮痕停在这里，像一条自然边界。']
  },
  ridge: {
    labels: ['石脊', '风口石', '缓坡', '断岩边'],
    descriptions: ['石脊露出地面，暂时没有可互动对象。', '风从石缝里穿过，只提供地貌提示。', '缓坡能看见更远的竹林和溪线。', '断岩边适合停步观察。']
  },
  camp: {
    labels: ['空营地', '旧火塘', '草棚影', '歇脚处'],
    descriptions: ['空营地暂时无人使用，后续可作为据点线索。', '旧火塘已经冷透，只能辨认有人来过。', '草棚影落在地上，还没修成据点。', '歇脚处很安静，适合调整路线。']
  },
  gate: {
    labels: ['小门径', '村外口', '竹门影', '归路口'],
    descriptions: ['小门径连接村外，不含额外对象。', '村外口能看见回村方向。', '竹门影压在路面上，是安全边界。', '归路口标着回程方向。']
  }
}

const getOutskirtsEmptyTileCopy = (
  terrain: RegionOpenWorldTileDef['terrain'],
  x: number,
  y: number
) => {
  const copy = OUTSKIRTS_EMPTY_TILE_COPY[terrain]
  const index = Math.abs(x * 7 + y * 3) % copy.labels.length
  return {
    label: copy.labels[index]!,
    description: copy.descriptions[index]!
  }
}

const createOutskirtsOpenWorldTiles = (): RegionOpenWorldTileDef[] => {
  const specialTiles = [
    createOpenWorldTile('outskirts:village_gate', 1, 5, 'gate', '村口', '从桃源村外踏进竹径，行旅从这里开始。', {
      objectType: 'story',
      actionId: 'inspect',
      revealsRadius: 2
    }),
    createOpenWorldTile('outskirts:bamboo_1', 3, 4, 'bamboo', '青竹丛', '一小片适合练手的竹子，砍下后当天会留下竹茬。', {
      objectType: 'bamboo',
      actionId: 'gather',
      staminaCost: 3,
      timeCostHours: 0.25,
      rewardItems: [{ itemId: 'bamboo', quantity: 2 }],
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:herb_1', 2, 7, 'grass', '草药坡', '草丛里夹着几株能入药的野草。', {
      objectType: 'herb',
      actionId: 'gather',
      staminaCost: 2,
      timeCostHours: 0.2,
      rewardItems: [{ itemId: 'herb', quantity: 1 }],
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:wild_tree', 5, 5, 'forest', '野树根', '靠近林缘的野树，适合顺手收木材。', {
      objectType: 'tree',
      actionId: 'gather',
      staminaCost: 4,
      timeCostHours: 0.34,
      rewardItems: [{ itemId: 'wood', quantity: 2 }],
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:shallow_chest', 5, 3, 'grass', '旧藤箱', '被藤蔓缠住的小箱子，像是以前赶路人留下的。', {
      objectType: 'chest',
      actionId: 'open_chest',
      staminaCost: 2,
      timeCostHours: 0.25,
      rewardItems: [{ itemId: 'stone', quantity: 2 }],
      rewardFamilyId: 'ancient_archive',
      rewardFamilyAmount: 1,
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:hare_trace', 4, 7, 'grass', '兽迹草窝', '草叶被压出浅浅的窝，能观察到近郊小兽的去向。', {
      objectType: 'animal',
      actionId: 'observe',
      staminaCost: 1,
      timeCostHours: 0.17,
      rewardItems: [{ itemId: 'wild_meat', quantity: 1 }],
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:fallen_branch', 7, 5, 'forest', '挡路枝', '枯枝挡住了更深处的竹径，可以清开。', {
      objectType: 'roadblock',
      actionId: 'drive_off',
      staminaCost: 3,
      timeCostHours: 0.25,
      rewardItems: [{ itemId: 'firewood', quantity: 2 }],
      dailyRefresh: true
    }),
    createOpenWorldTile('outskirts:quiet_outpost', 8, 3, 'camp', '旧凉棚', '半塌的小凉棚，修好后可作为近郊据点。', {
      objectType: 'outpost',
      actionId: 'repair',
      staminaCost: 3,
      timeCostHours: 0.34,
      rewardItems: [],
      rewardFamilyId: 'ancient_archive',
      rewardFamilyAmount: 1,
      outpostId: 'outskirts_shed'
    }),
    createOpenWorldTile('outskirts:story_bamboo_path', 8, 6, 'bamboo', '竹径标记', '竹叶间有新的脚印，提示更远处会出现区域地标。', {
      objectType: 'story',
      actionId: 'inspect'
    }),
    createOpenWorldTile('outskirts:forest_edge', 10, 5, 'forest', '林缘', '近郊地图的边缘，后续会连接更大的区域。', {
      objectType: 'shortcut',
      actionId: 'inspect'
    })
  ]
  const specialByCoord = new Map(specialTiles.map(tile => [getOpenWorldTileCoordKey(tile.x, tile.y), tile]))
  const tiles: RegionOpenWorldTileDef[] = []
  for (let y = 0; y < OUTSKIRTS_OPEN_WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < OUTSKIRTS_OPEN_WORLD_WIDTH; x += 1) {
      const specialTile = specialByCoord.get(getOpenWorldTileCoordKey(x, y))
      if (specialTile) {
        tiles.push(specialTile)
        continue
      }
      const terrain = getOutskirtsEmptyTerrain(x, y)
      const copy = getOutskirtsEmptyTileCopy(terrain, x, y)
      tiles.push(createOpenWorldEmptyTile('taoyuan_outskirts', x, y, terrain, copy.label, copy.description))
    }
  }
  return tiles
}

const getRegionRouteIds = (regionId: RegionId) => REGION_ROUTE_DEFS.filter(route => route.regionId === regionId).map(route => route.id)

const getRegionEventIds = (regionId: RegionId) => REGION_EVENT_DEFS.filter(event => event.regionId === regionId).map(event => event.id)

const createOpenWorldRegionDef = (
  def: Omit<RegionOpenWorldRegionDef, 'landmarkRouteIds' | 'landmarkEventIds' | 'landmarkBossId'>
): RegionOpenWorldRegionDef => {
  const regionId = def.unlockRegionId
  return {
    ...def,
    landmarkRouteIds: regionId ? getRegionRouteIds(regionId) : [],
    landmarkEventIds: regionId ? getRegionEventIds(regionId) : [],
    landmarkBossId: regionId ? (REGION_BOSS_DEFS.find(boss => boss.regionId === regionId)?.id ?? null) : null
  }
}

export const REGION_OPEN_WORLD_DEFS: RegionOpenWorldRegionDef[] = [
  createOpenWorldRegionDef({
    id: 'taoyuan_outskirts',
    name: '近郊竹林',
    description: '村口外的竹径、野树和浅草地，作为开放行旅图的第一张教学地图。',
    width: OUTSKIRTS_OPEN_WORLD_WIDTH,
    height: OUTSKIRTS_OPEN_WORLD_HEIGHT,
    startTileId: 'outskirts:village_gate',
    unlockRegionId: null,
    pressureKind: 'safe',
    pressureLabel: '低压',
    pressureDescription: '近郊安全，只会遇到轻量资源、动物和小路障。',
    tiles: createOutskirtsOpenWorldTiles()
  }),
  createOpenWorldRegionDef({
    id: 'ancient_road',
    name: '古驿荒道',
    description: '旧驿、商路、残卷和护送压力交错的荒道开放地图。',
    width: 10,
    height: 7,
    startTileId: 'ancient_road:gate',
    unlockRegionId: 'ancient_road',
    pressureKind: 'sand_heat',
    pressureLabel: '沙热',
    pressureDescription: '荒道热风会抬高持续行动压力，据点和补给能降低风险。',
    tiles: [
      createOpenWorldTile('ancient_road:gate', 1, 3, 'gate', '荒道入口', '旧路从这里伸向废驿和烽亭。', { objectType: 'story', actionId: 'inspect' }),
      createOpenWorldTile('ancient_road:supply_relay', 2, 3, 'road', '旧驿补给线', '旧路线地标：沿荒道推进补给与路况排查。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'ancient_road_supply_relay'
      }),
      createOpenWorldTile('ancient_road:watchtower', 3, 2, 'ruin', '烽亭探哨线', '旧路线地标：废弃哨点仍能提供远处视野。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'ancient_road_watchtower_scout'
      }),
      createOpenWorldTile('ancient_road:archive', 4, 4, 'ruin', '残卷回收线', '旧路线地标：文书残页散在半塌驿墙下。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'ancient_road_archive_recovery'
      }),
      createOpenWorldTile('ancient_road:convoy', 5, 3, 'road', '护送风险线', '旧路线地标：车辙在沙地里断断续续。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'ancient_road_convoy_risk'
      }),
      createOpenWorldTile('ancient_road:event_blackout', 3, 5, 'ruin', '驿灯失照', '事件地标：旧驿灯架还留着焦痕。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'ancient_road_station_blackout'
      }),
      createOpenWorldTile('ancient_road:event_market', 6, 2, 'road', '沙市易卷', '事件地标：临时沙市留下散乱账册。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'ancient_road_sand_market'
      }),
      createOpenWorldTile('ancient_road:event_rescue', 6, 5, 'road', '绕路援车', '事件地标：失联车队的轮印绕向副道。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'ancient_road_detour_rescue'
      }),
      createOpenWorldTile('ancient_road:road_chest', 4, 2, 'ruin', '驿箱', '半埋在沙里的驿箱，可带回残卷和关券。', {
        objectType: 'chest',
        actionId: 'open_chest',
        staminaCost: 3,
        timeCostHours: 0.34,
        rewardItems: [{ itemId: 'ancient_waybill', quantity: 1 }],
        rewardFamilyId: 'ancient_archive',
        rewardFamilyAmount: 2,
        dailyRefresh: true
      }),
      createOpenWorldTile('ancient_road:sand_beast', 7, 4, 'road', '沙兽伏痕', '沙里有东西沿着车辙游走，需要驱散才能继续摸查。', {
        objectType: 'monster',
        actionId: 'drive_off',
        staminaCost: 5,
        timeCostHours: 0.5,
        rewardItems: [{ itemId: 'wild_meat', quantity: 1 }],
        rewardFamilyId: 'ancient_archive',
        rewardFamilyAmount: 1,
        dailyRefresh: true
      }),
      createOpenWorldTile('ancient_road:outpost', 7, 2, 'camp', '废驿据点', '修复后可作为荒道休整点。', {
        objectType: 'outpost',
        actionId: 'repair',
        staminaCost: 4,
        timeCostHours: 0.5,
        rewardFamilyId: 'ancient_archive',
        rewardFamilyAmount: 1,
        outpostId: 'ancient_road_station'
      }),
      createOpenWorldTile('ancient_road:boss', 8, 3, 'ruin', '荒道监军', '首领地标：旧驿要冲仍压着高风险气息。', {
        objectType: 'boss_landmark',
        actionId: 'inspect',
        bossId: 'ancient_road_overseer'
      })
    ]
  }),
  createOpenWorldRegionDef({
    id: 'mirage_marsh',
    name: '蜃潮泽地',
    description: '夜游、样本、潮沟和湿瘴异常构成的泽地开放地图。',
    width: 10,
    height: 7,
    startTileId: 'mirage_marsh:gate',
    unlockRegionId: 'mirage_marsh',
    pressureKind: 'miasma',
    pressureLabel: '湿瘴',
    pressureDescription: '泽地湿瘴会压低长时间行动的稳定性，样本和据点能帮助回流。',
    tiles: [
      createOpenWorldTile('mirage_marsh:gate', 1, 3, 'gate', '泽地浅滩', '水草把入口分成几条浅浅的潮沟。', { objectType: 'story', actionId: 'inspect' }),
      createOpenWorldTile('mirage_marsh:night_watch', 2, 3, 'marsh', '夜游观察线', '旧路线地标：夜间生态观察从这里开始。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'mirage_marsh_night_watch'
      }),
      createOpenWorldTile('mirage_marsh:reed_drift', 3, 2, 'marsh', '苇流漂采线', '旧路线地标：苇流会把样本带到外圈。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'mirage_marsh_reed_drift'
      }),
      createOpenWorldTile('mirage_marsh:specimen', 4, 4, 'water', '样本护送线', '旧路线地标：样本整理与护送都需要稳定路径。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'mirage_marsh_specimen_drive'
      }),
      createOpenWorldTile('mirage_marsh:alert', 5, 3, 'marsh', '生态异常线', '旧路线地标：水位异动在这里最明显。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'mirage_marsh_ecology_alert'
      }),
      createOpenWorldTile('mirage_marsh:event_spore', 3, 5, 'marsh', '潮雾孢华', '事件地标：短时孢华带会在潮雾里显形。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'mirage_marsh_spore_bloom'
      }),
      createOpenWorldTile('mirage_marsh:event_nursery', 6, 2, 'water', '月汐育群', '事件地标：幼体育群区需要轻手记录。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'mirage_marsh_moon_nursery'
      }),
      createOpenWorldTile('mirage_marsh:event_migration', 6, 5, 'marsh', '苇带迁潮', '事件地标：迁移苇带留下细密水痕。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'mirage_marsh_reed_migration'
      }),
      createOpenWorldTile('mirage_marsh:reed_patch', 4, 2, 'marsh', '苇草样本', '可采回泽地常见样本。', {
        objectType: 'herb',
        actionId: 'gather',
        staminaCost: 3,
        timeCostHours: 0.34,
        rewardItems: [{ itemId: 'luminous_algae', quantity: 1 }],
        rewardFamilyId: 'ecology_specimen',
        rewardFamilyAmount: 2,
        dailyRefresh: true
      }),
      createOpenWorldTile('mirage_marsh:waterbird', 7, 4, 'water', '水鸟影', '水鸟群忽近忽远，观察能补手册记录。', {
        objectType: 'animal',
        actionId: 'observe',
        staminaCost: 2,
        timeCostHours: 0.25,
        rewardFamilyId: 'ecology_specimen',
        rewardFamilyAmount: 1,
        dailyRefresh: true
      }),
      createOpenWorldTile('mirage_marsh:outpost', 7, 2, 'camp', '苇棚据点', '修好苇棚后可作为泽地临时样本台。', {
        objectType: 'outpost',
        actionId: 'repair',
        staminaCost: 4,
        timeCostHours: 0.5,
        rewardFamilyId: 'ecology_specimen',
        rewardFamilyAmount: 1,
        outpostId: 'mirage_marsh_reed_shed'
      }),
      createOpenWorldTile('mirage_marsh:boss', 8, 3, 'water', '潮息异兽', '首领地标：水面下传来周期性的沉重回响。', {
        objectType: 'boss_landmark',
        actionId: 'inspect',
        bossId: 'mirage_marsh_devourer'
      })
    ]
  }),
  createOpenWorldRegionDef({
    id: 'cloud_highland',
    name: '云岚高地',
    description: '风口、晶脉、前哨和高压清剿构成的高地开放地图。',
    width: 10,
    height: 7,
    startTileId: 'cloud_highland:gate',
    unlockRegionId: 'cloud_highland',
    pressureKind: 'wind_chill',
    pressureLabel: '风寒',
    pressureDescription: '高地风寒会放大长线推进的损耗，前哨和装备能降低压力。',
    tiles: [
      createOpenWorldTile('cloud_highland:gate', 1, 3, 'gate', '云阶入口', '从云阶往上，风声会盖住脚步。', { objectType: 'story', actionId: 'inspect' }),
      createOpenWorldTile('cloud_highland:ley_crack', 2, 3, 'ridge', '灵脉采晶线', '旧路线地标：裂隙里有稳定结晶。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'cloud_highland_ley_crack'
      }),
      createOpenWorldTile('cloud_highland:skybridge', 3, 2, 'ridge', '云桥巡望线', '旧路线地标：断桥哨点能看见远处风口。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'cloud_highland_skybridge_watch'
      }),
      createOpenWorldTile('cloud_highland:patrol', 4, 4, 'ridge', '高地清剿线', '旧路线地标：危险巡路在这里交汇。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'cloud_highland_patrol'
      }),
      createOpenWorldTile('cloud_highland:supply', 5, 3, 'camp', '前哨补给线', '旧路线地标：补给栈决定高地推进上限。', {
        objectType: 'route_landmark',
        actionId: 'inspect',
        routeId: 'cloud_highland_supply_push'
      }),
      createOpenWorldTile('cloud_highland:event_surge', 3, 5, 'ridge', '脉潮突涌', '事件地标：灵脉短时外涌过。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'cloud_highland_ley_surge'
      }),
      createOpenWorldTile('cloud_highland:event_signal', 6, 2, 'ridge', '风哨复讯', '事件地标：断讯风哨仍挂着残绳。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'cloud_highland_signal_patrol'
      }),
      createOpenWorldTile('cloud_highland:event_cache', 6, 5, 'camp', '前仓塌线', '事件地标：塌陷前仓露出战备碎片。', {
        objectType: 'event_landmark',
        actionId: 'inspect',
        eventId: 'cloud_highland_cache_collapse'
      }),
      createOpenWorldTile('cloud_highland:crystal_patch', 4, 2, 'ridge', '风蚀晶脉', '能采回高地晶脉碎片。', {
        objectType: 'herb',
        actionId: 'gather',
        staminaCost: 4,
        timeCostHours: 0.5,
        rewardItems: [{ itemId: 'wind_etched_core', quantity: 1 }],
        rewardFamilyId: 'ley_crystal',
        rewardFamilyAmount: 2,
        dailyRefresh: true
      }),
      createOpenWorldTile('cloud_highland:wind_beast', 7, 4, 'ridge', '风兽巡痕', '风口附近有山兽巡回，需要找准撤退路线。', {
        objectType: 'monster',
        actionId: 'drive_off',
        staminaCost: 5,
        timeCostHours: 0.5,
        rewardItems: [{ itemId: 'wild_meat', quantity: 1 }],
        rewardFamilyId: 'ley_crystal',
        rewardFamilyAmount: 1,
        dailyRefresh: true
      }),
      createOpenWorldTile('cloud_highland:outpost', 7, 2, 'camp', '高地前哨', '修好前哨后可承接高地休整。', {
        objectType: 'outpost',
        actionId: 'repair',
        staminaCost: 5,
        timeCostHours: 0.67,
        rewardFamilyId: 'ley_crystal',
        rewardFamilyAmount: 1,
        outpostId: 'cloud_highland_watchpost'
      }),
      createOpenWorldTile('cloud_highland:boss', 8, 3, 'ridge', '云岚守脉者', '首领地标：守脉者的压迫感从裂隙深处传来。', {
        objectType: 'boss_landmark',
        actionId: 'inspect',
        bossId: 'cloud_highland_warden'
      })
    ]
  })
]

const OPEN_WORLD_REGION_IDS = REGION_OPEN_WORLD_DEFS.map(region => region.id) as RegionOpenWorldId[]

const getOpenWorldRevealTileIds = (def: RegionOpenWorldRegionDef, tileId: string, radius = 1) => {
  const center = def.tiles.find(tile => tile.id === tileId)
  if (!center) return [def.startTileId]
  const safeRadius = Math.max(0, Math.floor(radius))
  return def.tiles
    .filter(tile => Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y)) <= safeRadius)
    .map(tile => tile.id)
}

const createDefaultOpenWorldTileState = (
  tile: RegionOpenWorldTileDef,
  discovered: boolean
): RegionOpenWorldTileState => ({
  tileId: tile.id,
  discovered,
  status: 'fresh',
  landmarkStage: discovered && tile.objectType?.endsWith('_landmark') ? 'heard' : 'unknown',
  actionCount: 0,
  lastActionDayTag: '',
  lastRefreshDayTag: ''
})

const createDefaultOpenWorldRegionState = (def: RegionOpenWorldRegionDef): RegionOpenWorldRegionState => {
  const discoveredTileIds = [...new Set(getOpenWorldRevealTileIds(def, def.startTileId, 1))]
  return {
    regionId: def.id,
    playerTileId: def.startTileId,
    selectedTileId: def.startTileId,
    discoveredTileIds,
    repairedOutpostIds: [],
    tileStates: Object.fromEntries(
      def.tiles.map(tile => [tile.id, createDefaultOpenWorldTileState(tile, discoveredTileIds.includes(tile.id))])
    ),
    lastRefreshDayTag: ''
  }
}

const createDefaultOpenWorldHandbookState = (
  regionStates: Record<RegionOpenWorldId, RegionOpenWorldRegionState>
) => ({
  discoveredTileIds: Object.fromEntries(
    OPEN_WORLD_REGION_IDS.map(regionId => [regionId, [...(regionStates[regionId]?.discoveredTileIds ?? [])]])
  ) as Record<RegionOpenWorldId, string[]>,
  discoveredObjectKeys: [],
  completedLandmarkKeys: [],
  repairedOutpostIds: [],
  claimedRewardKeys: []
})

export const createDefaultRegionOpenWorldSaveData = (): RegionOpenWorldSaveData => {
  const regionStates = Object.fromEntries(
    REGION_OPEN_WORLD_DEFS.map(def => [def.id, createDefaultOpenWorldRegionState(def)])
  ) as Record<RegionOpenWorldId, RegionOpenWorldRegionState>
  const activeRegionId: RegionOpenWorldId = 'taoyuan_outskirts'
  return {
    activeRegionId,
    selectedTileId: regionStates[activeRegionId]?.selectedTileId ?? 'outskirts:village_gate',
    lastRefreshDayTag: '',
    regionStates,
    handbook: createDefaultOpenWorldHandbookState(regionStates),
    log: []
  }
}

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

const createDefaultJourneyCraftingUnlocks = (): Record<string, boolean> =>
  Object.fromEntries(JOURNEY_CRAFTING_RECIPES.map(recipe => [recipe.id, false])) as Record<string, boolean>

const createDefaultJourneyAwakenings = (): Record<string, boolean> =>
  Object.fromEntries(JOURNEY_AWAKENINGS.map(entry => [entry.id, false])) as Record<string, boolean>

const createDefaultJourneyCampModules = (): Record<string, number> =>
  Object.fromEntries(JOURNEY_CAMP_MODULES.map(entry => [entry.id, 0])) as Record<string, number>

const createDefaultJourneyRouteLicenses = (): Record<string, number> =>
  Object.fromEntries(JOURNEY_ROUTE_PERMITS.map(entry => [entry.id, 0])) as Record<string, number>

export const createDefaultRegionMapSaveData = (): RegionMapSaveData => ({
  saveVersion: REGION_MAP_SAVE_VERSION,
  unlockStates: createDefaultUnlockStates(),
  routeStates: createDefaultRouteStates(),
  eventStates: createDefaultEventStates(),
  openWorld: createDefaultRegionOpenWorldSaveData(),
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
  journeyActionState: {},
  telemetry: createDefaultTelemetry(),
  bossClearCounts: createDefaultBossClearCounts(),
  bossFailureStreaks: createDefaultBossFailureStreaks(),
  lastBossOutcome: createDefaultBossOutcomeState(),
  journeyCraftingUnlocks: createDefaultJourneyCraftingUnlocks(),
  journeyAwakenings: createDefaultJourneyAwakenings(),
  journeyCampModules: createDefaultJourneyCampModules(),
  journeyRouteLicenses: createDefaultJourneyRouteLicenses()
})

export const getRegionDef = (regionId: RegionId) => REGION_DEFS.find(region => region.id === regionId) ?? null

export const getRegionRoutes = (regionId: RegionId) => REGION_ROUTE_DEFS.filter(route => route.regionId === regionId)

export const getRegionEvents = (regionId: RegionId) => REGION_EVENT_DEFS.filter(event => event.regionId === regionId)

export const getRegionBossDef = (regionId: RegionId) => REGION_BOSS_DEFS.find(boss => boss.regionId === regionId) ?? null

export const getOpenWorldRegionDef = (regionId: RegionOpenWorldId) =>
  REGION_OPEN_WORLD_DEFS.find(region => region.id === regionId) ?? null
