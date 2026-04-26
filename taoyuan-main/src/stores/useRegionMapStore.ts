import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  REGION_BOSS_DEFS,
  REGION_DEFS,
  REGION_EVENT_DEFS,
  REGION_ROUTE_DEFS,
  REGIONAL_RESOURCE_FAMILY_DEFS,
  createDefaultRegionExpeditionSupplyState,
  createDefaultRegionMapSaveData,
  getBossMapNodeKey,
  getCampSiteKey,
  getRegionBossDef,
  getRegionEvents,
  getRegionRoutes,
  getRouteMapNodeKey
} from '@/data/regions'
import { addLog, showFloat } from '@/composables/useGameLog'
import { getEnchantmentById, getWeaponById } from '@/data/weapons'
import { getNpcById } from '@/data'
import type {
  ExpeditionRuntimeState,
  RegionBossDef,
  RegionCampActionId,
  RegionCampSiteState,
  RegionCompanionContract,
  RegionCompanionSourceType,
  RegionExpeditionCarryItem,
  RegionExpeditionCarryItemCategory,
  RegionExpeditionApproach,
  RegionExpeditionEncounter,
  RegionExpeditionEncounterKind,
  RegionExpeditionEncounterMemory,
  RegionExpeditionEncounterOption,
  RegionExpeditionArchiveEntry,
  RegionKnowledgeState,
  RegionExpeditionLogEntry,
  RegionExpeditionNodeChoice,
  RegionExpeditionNodeLane,
  RegionExpeditionNodeRecord,
  RegionExpeditionRetreatRule,
  RegionExpeditionSession,
  RegionExpeditionRiskState,
  RegionExpeditionWeather,
  RegionId,
  RegionLinkedSystem,
  RegionMapMetaState,
  RegionMapNodeState,
  RegionMapNodeVisibilityStage,
  RegionMapSaveData,
  RegionMapSessionState,
  RegionMapSettlementState,
  RegionRumorBoardEntry,
  RegionRouteKnowledgeState,
  RegionSeasonalState,
  RegionShortcutState,
  RegionShortcutStateLevel,
  RegionAutoPatrolState,
  RegionalResourceFamilyId
} from '@/types/region'
import {
  buildPlayerCombatRuntime,
  getDefendHeal,
  getExpectedAttackDamage,
  getExpectedIncomingDamage,
  getLifestealHeal
} from '@/utils/combatRuntime'
import { getItemById } from '@/data/items'
import { useAchievementStore } from './useAchievementStore'
import { useCookingStore } from './useCookingStore'
import { useFishPondStore } from './useFishPondStore'
import { useGameStore } from './useGameStore'
import { useGuildStore } from './useGuildStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useInventoryStore } from './useInventoryStore'
import { useMiningStore } from './useMiningStore'
import { useMuseumStore } from './useMuseumStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { useFrontierChronicleStore } from './useFrontierChronicleStore'
import { DAYS_PER_SEASON, DAYS_PER_YEAR, getAbsoluteDay, getWeekCycleInfo } from '@/utils/weekCycle'
import type { Season, Weather } from '@/types'

const ROUTE_ITEM_REWARDS: Record<string, Array<{ itemId: string; quantity: number }>> = {
  ancient_road_supply_relay: [{ itemId: 'ancient_waybill', quantity: 1 }],
  ancient_road_watchtower_scout: [{ itemId: 'ancient_waybill', quantity: 1 }],
  ancient_road_archive_recovery: [{ itemId: 'archive_rubbing', quantity: 1 }],
  ancient_road_convoy_risk: [{ itemId: 'archive_rubbing', quantity: 1 }],
  mirage_marsh_night_watch: [{ itemId: 'marsh_spore_sample', quantity: 1 }],
  mirage_marsh_reed_drift: [{ itemId: 'marsh_spore_sample', quantity: 1 }],
  mirage_marsh_specimen_drive: [{ itemId: 'luminous_algae', quantity: 1 }],
  mirage_marsh_ecology_alert: [{ itemId: 'luminous_algae', quantity: 1 }],
  cloud_highland_ley_crack: [{ itemId: 'wind_etched_core', quantity: 1 }],
  cloud_highland_skybridge_watch: [{ itemId: 'ley_crystal_shard', quantity: 1 }],
  cloud_highland_patrol: [{ itemId: 'ley_crystal_shard', quantity: 1 }],
  cloud_highland_supply_push: [{ itemId: 'wind_etched_core', quantity: 1 }]
}

const EVENT_ITEM_REWARDS: Record<string, Array<{ itemId: string; quantity: number }>> = {
  ancient_road_station_blackout: [{ itemId: 'ancient_waybill', quantity: 1 }],
  ancient_road_sand_market: [{ itemId: 'archive_rubbing', quantity: 1 }],
  ancient_road_detour_rescue: [{ itemId: 'archive_rubbing', quantity: 1 }],
  mirage_marsh_spore_bloom: [{ itemId: 'marsh_spore_sample', quantity: 1 }],
  mirage_marsh_moon_nursery: [{ itemId: 'luminous_algae', quantity: 1 }],
  mirage_marsh_reed_migration: [{ itemId: 'luminous_algae', quantity: 1 }],
  cloud_highland_ley_surge: [{ itemId: 'ley_crystal_shard', quantity: 1 }],
  cloud_highland_signal_patrol: [{ itemId: 'wind_etched_core', quantity: 1 }],
  cloud_highland_cache_collapse: [{ itemId: 'wind_etched_core', quantity: 1 }]
}

const BOSS_ITEM_REWARDS: Record<RegionId, Array<{ itemId: string; quantity: number }>> = {
  ancient_road: [{ itemId: 'archive_rubbing', quantity: 2 }],
  mirage_marsh: [{ itemId: 'luminous_algae', quantity: 2 }],
  cloud_highland: [{ itemId: 'wind_etched_core', quantity: 2 }]
}

const createEmptyActiveEventMap = () => ({
  ancient_road: [] as string[],
  mirage_marsh: [] as string[],
  cloud_highland: [] as string[]
})

const getWeeklyRotationSeed = (weekId: string, regionId: RegionId) =>
  [...`${weekId}:${regionId}`].reduce((seed, char) => seed + char.charCodeAt(0), 0)

const formatRewardItems = (rewardItems: Array<{ itemId: string; quantity: number }>) =>
  rewardItems.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、')

const createSessionToken = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createEmptyRegionKnowledgeState = (regionId: RegionId): RegionKnowledgeState => ({
  regionId,
  intel: 0,
  survey: 0,
  familiarity: 0,
  lastUpdatedDayTag: ''
})

const createEmptyRouteKnowledgeState = (routeId: string): RegionRouteKnowledgeState => ({
  routeId,
  intel: 0,
  surveyProgress: 0,
  familiarity: 0,
  lastUpdatedDayTag: ''
})

const createEmptyMapNodeState = (
  nodeKey: string,
  regionId: RegionId,
  routeId: string | null,
  bossId: string | null,
  nodeType: RegionMapNodeState['nodeType']
): RegionMapNodeState => ({
  nodeKey,
  regionId,
  routeId,
  bossId,
  nodeType,
  visibilityStage: 'unknown',
  visitCount: 0,
  surveyCount: 0,
  lastVisitedDayTag: ''
})

const createEmptyRouteMapNodeState = (routeId: string) => {
  const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
  return route
    ? createEmptyMapNodeState(getRouteMapNodeKey(route.id), route.regionId, route.id, null, route.nodeType)
    : createEmptyMapNodeState(getRouteMapNodeKey(routeId), 'ancient_road', routeId, null, 'route')
}

const createEmptyBossMapNodeState = (regionId: RegionId) =>
  createEmptyMapNodeState(getBossMapNodeKey(regionId), regionId, null, getRegionBossDef(regionId)?.id ?? null, 'boss')

const createEmptyCampSiteState = (regionId: RegionId, routeId: string | null, bossId: string | null): RegionCampSiteState => ({
  campKey: getCampSiteKey(regionId, routeId, bossId),
  regionId,
  routeId,
  bossId,
  visitCount: 0,
  restCount: 0,
  sortCount: 0,
  markCount: 0,
  scoutCount: 0,
  safetyProgress: 0,
  stashTier: 0,
  lastUsedDayTag: ''
})

const createEmptyShortcutState = (routeId: string): RegionShortcutState => ({
  routeId,
  level: 'none',
  masteryRuns: 0,
  markedEntrances: 0,
  lastUpdatedDayTag: ''
})

const VISIBILITY_STAGE_ORDER: RegionMapNodeVisibilityStage[] = ['unknown', 'heard', 'surveyed', 'mastered']

const getMoreVisibleStage = (
  current: RegionMapNodeVisibilityStage,
  next: RegionMapNodeVisibilityStage
): RegionMapNodeVisibilityStage =>
  VISIBILITY_STAGE_ORDER.indexOf(next) > VISIBILITY_STAGE_ORDER.indexOf(current) ? next : current

const buildShortcutProfileFromLevel = (level: RegionShortcutStateLevel) =>
  level === 'mastered'
    ? {
        level,
        label: '熟路',
        stepReduction: 1,
        visibilityBonus: 8,
        dangerReduction: 4,
        supplyBonus: { rations: 1, utility: 1 }
      }
    : level === 'shortcut'
      ? {
          level,
          label: '捷径已立',
          stepReduction: 1,
          visibilityBonus: 5,
          dangerReduction: 2,
          supplyBonus: { rations: 0, utility: 1 }
        }
      : level === 'marked'
        ? {
            level,
            label: '路标渐明',
            stepReduction: 0,
            visibilityBonus: 3,
            dangerReduction: 1,
            supplyBonus: { rations: 0, utility: 0 }
          }
        : {
            level,
            label: '陌生路段',
            stepReduction: 0,
            visibilityBonus: 0,
            dangerReduction: 0,
            supplyBonus: { rations: 0, utility: 0 }
        }

const CALENDAR_SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

type RegionVariantRule = {
  id: string
  regionId: RegionId
  label: string
  summary: string
  detailLines: string[]
  affectedRouteIds: string[]
  seasons?: Season[] | 'all'
  weathers?: Weather[] | 'all'
  manualExplorationRequired: boolean
}

const REGION_VARIANT_RULES: RegionVariantRule[] = [
  {
    id: 'ancient_road_sand_echo',
    regionId: 'ancient_road',
    label: '流沙回声',
    summary: '风带把旧驿站与残卷夹层重新吹开，荒道本周更像一张会变的纸页。',
    detailLines: ['补给中继与残卷回收线更容易翻出夹层线索。', '自动巡行容易直接略过这批新显形节点。'],
    affectedRouteIds: ['ancient_road_supply_relay', 'ancient_road_archive_recovery'],
    seasons: ['spring', 'autumn'],
    weathers: ['windy'],
    manualExplorationRequired: true
  },
  {
    id: 'ancient_road_storm_convoy',
    regionId: 'ancient_road',
    label: '押运改道',
    summary: '坏天气逼得沿线商队改换路口，护送和瀚海线索会一起改写。',
    detailLines: ['护送风险线会抬高，但也更容易接住新的合同流向。'],
    affectedRouteIds: ['ancient_road_convoy_risk', 'ancient_road_watchtower_scout'],
    seasons: 'all',
    weathers: ['rainy', 'stormy'],
    manualExplorationRequired: true
  },
  {
    id: 'ancient_road_frost_station',
    regionId: 'ancient_road',
    label: '霜站封页',
    summary: '冬季把旧驿站压成了更静止的站点，很多细碎文书需要亲自翻开。',
    detailLines: ['残卷和站内押运票据更适合手动收束。'],
    affectedRouteIds: ['ancient_road_supply_relay', 'ancient_road_archive_recovery'],
    seasons: ['winter'],
    manualExplorationRequired: true
  },
  {
    id: 'mirage_marsh_green_tide',
    regionId: 'mirage_marsh',
    label: '藻潮外翻',
    summary: '绿雨后的泽地会把浅层样本翻到外圈，路线显形与风险一起上扬。',
    detailLines: ['样本驱动和生态警报的权重会更高。', '这周的样本更适合及时送去展示池或研究口。'],
    affectedRouteIds: ['mirage_marsh_specimen_drive', 'mirage_marsh_ecology_alert'],
    seasons: ['summer'],
    weathers: ['green_rain', 'rainy'],
    manualExplorationRequired: true
  },
  {
    id: 'mirage_marsh_night_mist',
    regionId: 'mirage_marsh',
    label: '夜雾回巡',
    summary: '夜里薄雾把泽地旧巡路重新接起来，脚印和鱼讯都会挪位。',
    detailLines: ['夜巡与苇荡线更容易撞上传闻兑现点。'],
    affectedRouteIds: ['mirage_marsh_night_watch', 'mirage_marsh_reed_drift'],
    seasons: 'all',
    weathers: ['windy', 'rainy'],
    manualExplorationRequired: true
  },
  {
    id: 'mirage_marsh_cold_shallows',
    regionId: 'mirage_marsh',
    label: '寒潮退泽',
    summary: '冬日寒潮让部分浅滩短暂露出，能看见平时不会显形的样本痕迹。',
    detailLines: ['夜巡线更安全，但样本窗口很短。'],
    affectedRouteIds: ['mirage_marsh_night_watch', 'mirage_marsh_specimen_drive'],
    seasons: ['winter'],
    weathers: ['snowy', 'windy'],
    manualExplorationRequired: true
  },
  {
    id: 'cloud_highland_ley_bloom',
    regionId: 'cloud_highland',
    label: '裂脉外涌',
    summary: '高地灵脉的外涌把旧裂口重新点亮，晶体与风险都会在前线抬头。',
    detailLines: ['灵脉裂口与巡修线都值得亲自确认。'],
    affectedRouteIds: ['cloud_highland_ley_crack', 'cloud_highland_patrol'],
    seasons: 'all',
    weathers: ['sunny', 'windy'],
    manualExplorationRequired: true
  },
  {
    id: 'cloud_highland_snow_bridge',
    regionId: 'cloud_highland',
    label: '霜桥折光',
    summary: '雪天把云桥边缘的旧折光点重新翻出来，前哨与建设链会一起受影响。',
    detailLines: ['云桥观察位和补给推进线会更需要手动校准。'],
    affectedRouteIds: ['cloud_highland_skybridge_watch', 'cloud_highland_supply_push'],
    seasons: ['winter'],
    weathers: ['snowy'],
    manualExplorationRequired: true
  },
  {
    id: 'cloud_highland_storm_front',
    regionId: 'cloud_highland',
    label: '前哨乱流',
    summary: '强风或雷雨把高地前哨线吹得更乱，巡修与补给不再适合放手自动跑。',
    detailLines: ['这周的高地收益更看重亲自判断推进顺序。'],
    affectedRouteIds: ['cloud_highland_patrol', 'cloud_highland_supply_push'],
    seasons: 'all',
    weathers: ['windy', 'stormy'],
    manualExplorationRequired: true
  }
]

const variantRuleMatches = (rule: RegionVariantRule, season: Season, weather: Weather) => {
  const seasonOk = !rule.seasons || rule.seasons === 'all' || rule.seasons.includes(season)
  const weatherOk = !rule.weathers || rule.weathers === 'all' || rule.weathers.includes(weather)
  return seasonOk && weatherOk
}

const parseCalendarDayTag = (dayTag: string) => {
  const [yearText, seasonText, dayText] = dayTag.split('-')
  if (!yearText || !seasonText || !dayText || !CALENDAR_SEASON_ORDER.includes(seasonText as Season)) return null
  const year = Number(yearText)
  const day = Number(dayText)
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null
  return {
    year,
    season: seasonText as Season,
    day
  }
}

const formatCalendarDayTag = (absoluteDay: number) => {
  const safeAbsoluteDay = Math.max(1, Math.floor(absoluteDay))
  const year = Math.floor((safeAbsoluteDay - 1) / DAYS_PER_YEAR) + 1
  const dayOfYear = ((safeAbsoluteDay - 1) % DAYS_PER_YEAR) + 1
  const seasonIndex = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON)
  const season = CALENDAR_SEASON_ORDER[seasonIndex] ?? 'spring'
  const day = ((dayOfYear - 1) % DAYS_PER_SEASON) + 1
  return `${year}-${season}-${day}`
}

const addDaysToCalendarDayTag = (dayTag: string, durationDays: number) => {
  const parsed = parseCalendarDayTag(dayTag)
  if (!parsed) return dayTag
  return formatCalendarDayTag(getAbsoluteDay(parsed.year, parsed.season, parsed.day) + Math.max(0, durationDays))
}

const cloneEncounter = (encounter: RegionExpeditionEncounter | null): RegionExpeditionEncounter | null =>
  encounter
    ? {
        ...encounter,
        detailLines: [...encounter.detailLines],
        rewardItems: encounter.rewardItems.map(item => ({ ...item })),
        options: encounter.options.map(option => ({ ...option }))
      }
    : null

const mergeRewardItems = (
  baseItems: Array<{ itemId: string; quantity: number }>,
  extraItems: Array<{ itemId: string; quantity: number }>
) => {
  const itemMap = new Map<string, number>()
  for (const item of [...baseItems, ...extraItems]) {
    if (!item.itemId || item.quantity <= 0) continue
    itemMap.set(item.itemId, (itemMap.get(item.itemId) ?? 0) + item.quantity)
  }
  return Array.from(itemMap.entries()).map(([itemId, quantity]) => ({ itemId, quantity }))
}

const createEncounterOptions = (kind: RegionExpeditionEncounter['kind']): RegionExpeditionEncounterOption[] => {
  if (kind === 'weekly_event') {
    return [
      { id: 'cautious', label: '谨慎处理', summary: '保守推进，优先稳住补给与风险。', tone: 'accent' },
      { id: 'balanced', label: '顺势推进', summary: '按原定节奏处理，兼顾收益与队伍状态。', tone: 'success' },
      { id: 'bold', label: '强势介入', summary: '争取额外收获，但会抬高风险和损耗。', tone: 'danger' }
    ]
  }

  if (kind === 'hazard' || kind === 'boss_prep') {
    return [
      { id: 'cautious', label: '稳扎稳打', summary: '降低风险，尽量避免额外损伤。', tone: 'accent' },
      { id: 'balanced', label: '维持推进', summary: '接受少量损耗，保持当前节奏。', tone: 'success' },
      { id: 'bold', label: '强行突破', summary: '直接冲过去，可能换取额外发现。', tone: 'danger' }
    ]
  }

  if (kind === 'support') {
    return [
      { id: 'cautious', label: '稳接支援', summary: '优先把支援变成补给和路线信息。', tone: 'accent' },
      { id: 'balanced', label: '并入队列', summary: '维持行军节奏，把支援安全并入推进链。', tone: 'success' },
      { id: 'bold', label: '借势前压', summary: '趁支援刚到就继续压进，换更高收益。', tone: 'danger' }
    ]
  }

  if (kind === 'anomaly') {
    return [
      { id: 'cautious', label: '压制异变', summary: '优先稳住污染和异常扩散，降低后续风险。', tone: 'accent' },
      { id: 'balanced', label: '测量前推', summary: '边观察边推进，兼顾收益和异常样本。', tone: 'success' },
      { id: 'bold', label: '强取样本', summary: '直接深入异变中心，可能换更高线索但后遗症更重。', tone: 'danger' }
    ]
  }

  return [
    { id: 'cautious', label: '收稳再走', summary: '保住现有所得，顺手整理沿途信息。', tone: 'accent' },
    { id: 'balanced', label: '按计划收取', summary: '按标准节奏处理，不额外冒险。', tone: 'success' },
    { id: 'bold', label: '加码追收', summary: '想办法再榨出一点收益，但会更危险。', tone: 'danger' }
  ]
}

export const useRegionMapStore = defineStore('regionMap', () => {
  const saveData = ref<RegionMapSaveData>(createDefaultRegionMapSaveData())
  const recentActionTimestamps = ref<Record<string, number>>({})

  // Region-map availability now depends only on player progression.
  const featureEnabled = computed(() =>
    Object.values(saveData.value.unlockStates).some(state => state?.unlocked)
  )
  const expeditionFeatureEnabled = computed(() => true)
  const resourceFeatureEnabled = computed(() => true)
  const regionIntegrationEnabled = computed(() => true)

  const getRegionCompletedRouteCount = (regionId: RegionId) =>
    getRegionRoutes(regionId).filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0).length

  const getRegionActiveEventIds = (regionId: RegionId) => saveData.value.weeklyEventState.activeEventIdsByRegion[regionId] ?? []

  const getRegionWeeklyEventCompletions = (regionId: RegionId) =>
    getRegionActiveEventIds(regionId).filter(eventId => (saveData.value.eventStates[eventId]?.weeklyCompletions ?? 0) > 0).length

  const getFamilyResourceQuantity = (familyId: RegionalResourceFamilyId) =>
    resourceFeatureEnabled.value ? (saveData.value.resourceLedger[familyId] ?? 0) : 0

  const regionSummaries = computed(() =>
    REGION_DEFS.map(region => {
      const unlockState = saveData.value.unlockStates[region.id]
      const routes = getRegionRoutes(region.id)
      const completedRouteCount = routes.filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0).length
      const unlockedRouteCount = routes.filter(route => saveData.value.routeStates[route.id]?.unlocked).length
      const activeEventIds = getRegionActiveEventIds(region.id)
      return {
        ...region,
        unlocked: unlockState?.unlocked ?? false,
        unlockedDayTag: unlockState?.unlockedDayTag ?? '',
        routeCount: routes.length,
        unlockedRouteCount,
        completedRouteCount,
        totalEventCount: getRegionEvents(region.id).length,
        activeEventCount: activeEventIds.length,
        completedWeeklyEventCount: getRegionWeeklyEventCompletions(region.id),
        boss: getRegionBossDef(region.id)
      }
    })
  )

  const unlockedRegionCount = computed(() => regionSummaries.value.filter(region => region.unlocked).length)
  const hasActiveExpedition = computed(() => Boolean(saveData.value.activeSession || saveData.value.expedition.activeRegionId))
  const currentWeeklyFocus = computed(() => saveData.value.weeklyFocusState)
  const currentWeeklyEventState = computed(() => saveData.value.weeklyEventState)
  const resourceLedgerEntries = computed(() =>
    REGIONAL_RESOURCE_FAMILY_DEFS.map(family => ({
      ...family,
      quantity: resourceFeatureEnabled.value ? (saveData.value.resourceLedger[family.id] ?? 0) : 0
    }))
  )
  const activeExpeditionSummary = computed(() => {
    const runtimeSource = saveData.value.activeSession
      ? {
          activeRegionId: saveData.value.activeSession.regionId,
          activeRouteId: saveData.value.activeSession.routeId,
          activeBossId: saveData.value.activeSession.bossId,
          startedAtDayTag: saveData.value.activeSession.startedAtDayTag
        }
      : saveData.value.expedition

    if (!runtimeSource.activeRegionId) return null
    const region = REGION_DEFS.find(entry => entry.id === runtimeSource.activeRegionId) ?? null
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === runtimeSource.activeRouteId) ?? null
    const boss = REGION_BOSS_DEFS.find(entry => entry.id === runtimeSource.activeBossId) ?? null
    return {
      region,
      route,
      boss,
      startedAtDayTag: runtimeSource.startedAtDayTag
    }
  })
  const lastBossOutcome = computed(() => saveData.value.lastBossOutcome)
  const activeSession = computed(() => saveData.value.activeSession)
  const journeyHistory = computed(() => saveData.value.journeyHistory)
  const currentExpeditionNodeChoices = computed(() => (saveData.value.activeSession ? buildExpeditionNodeChoices(saveData.value.activeSession) : []))

  const getRegionKnowledgeState = (regionId: RegionId) => saveData.value.knowledgeState[regionId] ?? createEmptyRegionKnowledgeState(regionId)

  const getRouteKnowledgeState = (routeId: string) => saveData.value.routeKnowledgeState[routeId] ?? createEmptyRouteKnowledgeState(routeId)

  const getRouteMapNodeState = (routeId: string) =>
    saveData.value.mapNodeStates[getRouteMapNodeKey(routeId)] ?? createEmptyRouteMapNodeState(routeId)

  const getBossMapNodeState = (regionId: RegionId) =>
    saveData.value.mapNodeStates[getBossMapNodeKey(regionId)] ?? createEmptyBossMapNodeState(regionId)

  const getCampSiteState = (regionId: RegionId, routeId: string | null, bossId: string | null) =>
    saveData.value.campStates[getCampSiteKey(regionId, routeId, bossId)] ?? createEmptyCampSiteState(regionId, routeId, bossId)

  const getShortcutState = (routeId: string) =>
    saveData.value.shortcutStates[routeId] ?? createEmptyShortcutState(routeId)

  const getRouteNodeVisibilityStage = (routeId: string): RegionMapNodeVisibilityStage => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return 'unknown'
    const routeState = saveData.value.routeStates[route.id]
    const routeKnowledge = getRouteKnowledgeState(route.id)
    const regionKnowledge = getRegionKnowledgeState(route.regionId)

    if ((routeState?.completions ?? 0) > 0 || routeKnowledge.familiarity >= 55) return 'mastered'
    if (routeState?.unlocked || routeKnowledge.surveyProgress >= 40 || routeKnowledge.intel >= 45 || regionKnowledge.survey >= 55) return 'surveyed'
    if (routeKnowledge.intel >= 15 || routeKnowledge.surveyProgress >= 15 || regionKnowledge.intel >= 25 || regionKnowledge.survey >= 25) return 'heard'
    return 'unknown'
  }

  const getBossNodeVisibilityStage = (regionId: RegionId): RegionMapNodeVisibilityStage => {
    const regionKnowledge = getRegionKnowledgeState(regionId)
    const completedRouteCount = getRegionCompletedRouteCount(regionId)
    const latestBossOutcome = saveData.value.lastBossOutcome

    if (latestBossOutcome.regionId === regionId && latestBossOutcome.outcome === 'victory') return 'mastered'
    if (getBossExpeditionStatus(regionId).available || completedRouteCount >= 2 || regionKnowledge.survey >= 55) return 'surveyed'
    if (completedRouteCount >= 1 || regionKnowledge.intel >= 35) return 'heard'
    return 'unknown'
  }

  const syncRouteMapNodeState = (routeId: string, dayTag = '', visitDelta = 0, surveyDelta = 0) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return null
    const current = getRouteMapNodeState(routeId)
    const next: RegionMapNodeState = {
      ...current,
      regionId: route.regionId,
      routeId: route.id,
      bossId: null,
      nodeType: route.nodeType,
      visibilityStage: getMoreVisibleStage(current.visibilityStage, getRouteNodeVisibilityStage(routeId)),
      visitCount: current.visitCount + Math.max(0, visitDelta),
      surveyCount: current.surveyCount + Math.max(0, surveyDelta),
      lastVisitedDayTag: dayTag || current.lastVisitedDayTag
    }
    saveData.value.mapNodeStates[next.nodeKey] = next
    return next
  }

  const syncBossMapNodeState = (regionId: RegionId, dayTag = '', visitDelta = 0, surveyDelta = 0) => {
    const boss = getRegionBossDef(regionId)
    const current = getBossMapNodeState(regionId)
    const next: RegionMapNodeState = {
      ...current,
      regionId,
      routeId: null,
      bossId: boss?.id ?? current.bossId,
      nodeType: 'boss',
      visibilityStage: getMoreVisibleStage(current.visibilityStage, getBossNodeVisibilityStage(regionId)),
      visitCount: current.visitCount + Math.max(0, visitDelta),
      surveyCount: current.surveyCount + Math.max(0, surveyDelta),
      lastVisitedDayTag: dayTag || current.lastVisitedDayTag
    }
    saveData.value.mapNodeStates[next.nodeKey] = next
    return next
  }

  const syncShortcutState = (routeId: string, dayTag = '', markedEntrancesDelta = 0) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return null
    const routeState = saveData.value.routeStates[route.id]
    const routeKnowledge = getRouteKnowledgeState(route.id)
    const current = getShortcutState(route.id)
    const nextLevel: RegionShortcutStateLevel =
      (routeState?.completions ?? 0) > 0 || (routeKnowledge.familiarity >= 85 && routeKnowledge.surveyProgress >= 80)
        ? 'mastered'
        : routeKnowledge.familiarity >= 60 && routeKnowledge.surveyProgress >= 55
          ? 'shortcut'
          : routeKnowledge.familiarity >= 35 || routeKnowledge.surveyProgress >= 40
            ? 'marked'
            : 'none'
    const next: RegionShortcutState = {
      routeId: route.id,
      level: nextLevel,
      masteryRuns: Math.max(current.masteryRuns, routeState?.completions ?? 0),
      markedEntrances: Math.max(current.markedEntrances + Math.max(0, markedEntrancesDelta), nextLevel === 'none' ? 0 : 1),
      lastUpdatedDayTag: dayTag || current.lastUpdatedDayTag
    }
    saveData.value.shortcutStates[route.id] = next
    return next
  }

  const syncStructuralState = (regionId?: RegionId, dayTag = '') => {
    const routeDefs = regionId ? getRegionRoutes(regionId) : REGION_ROUTE_DEFS
    for (const route of routeDefs) {
      syncRouteMapNodeState(route.id, dayTag)
      syncShortcutState(route.id, dayTag)
    }
    const regionIds = regionId ? [regionId] : REGION_DEFS.map(region => region.id)
    for (const currentRegionId of regionIds) {
      syncBossMapNodeState(currentRegionId, dayTag)
    }
  }

  const recordCampSiteUsage = (
    regionId: RegionId,
    routeId: string | null,
    bossId: string | null,
    usage: 'enter' | RegionCampActionId,
    dayTag = ''
  ) => {
    const current = getCampSiteState(regionId, routeId, bossId)
    const next: RegionCampSiteState = {
      ...current,
      visitCount: current.visitCount + (usage === 'enter' ? 1 : 0),
      restCount: current.restCount + (usage === 'rest' ? 1 : 0),
      sortCount: current.sortCount + (usage === 'sort' ? 1 : 0),
      markCount: current.markCount + (usage === 'mark' ? 1 : 0),
      scoutCount: current.scoutCount + (usage === 'scout' ? 1 : 0),
      safetyProgress: Math.min(
        12,
        current.safetyProgress +
          (usage === 'enter' ? 1 : 0) +
          (usage === 'rest' ? 2 : 0) +
          (usage === 'mark' ? 2 : 0) +
          (usage === 'scout' ? 1 : 0)
      ),
      stashTier: Math.min(3, current.stashTier + (usage === 'sort' ? 1 : 0)),
      lastUsedDayTag: dayTag || current.lastUsedDayTag
    }
    saveData.value.campStates[next.campKey] = next
    return next
  }

  const getCampSiteSessionBonuses = (regionId: RegionId, routeId: string | null, bossId: string | null) => {
    const campState = getCampSiteState(regionId, routeId, bossId)
    return {
      visibilityBonus: Math.min(6, campState.markCount + campState.scoutCount * 2),
      dangerReduction: Math.min(4, Math.floor(campState.safetyProgress / 2)),
      frontlinePrep: Math.min(3, campState.markCount + Math.floor(campState.scoutCount / 2)),
      supplyBonus: {
        rations: Math.min(1, campState.stashTier),
        medicine: Math.min(1, Math.floor(campState.restCount / 2)),
        utility: Math.min(1, Math.floor((campState.sortCount + campState.scoutCount) / 2))
      },
      headline:
        campState.visitCount > 0
          ? `前线旧营：已记录 ${campState.visitCount} 次停留，开局会继承一部分路标和补给整理。`
          : ''
    }
  }

  const metaState = computed<RegionMapMetaState>(() => ({
    unlockStates: saveData.value.unlockStates,
    routeStates: saveData.value.routeStates,
    eventStates: saveData.value.eventStates,
    weeklyFocusState: saveData.value.weeklyFocusState,
    weeklyEventState: saveData.value.weeklyEventState,
    knowledgeState: saveData.value.knowledgeState,
    routeKnowledgeState: saveData.value.routeKnowledgeState,
    mapNodeStates: saveData.value.mapNodeStates,
    shortcutStates: saveData.value.shortcutStates,
    seasonalRegionStates: saveData.value.seasonalRegionStates,
    companionContracts: saveData.value.companionContracts,
    rumorBoard: saveData.value.rumorBoard,
    autoPatrolStates: saveData.value.autoPatrolStates,
    telemetry: saveData.value.telemetry,
    bossClearCounts: saveData.value.bossClearCounts,
    bossFailureStreaks: saveData.value.bossFailureStreaks
  }))

  const sessionState = computed<RegionMapSessionState>(() => ({
    expedition: saveData.value.expedition,
    activeSession: saveData.value.activeSession,
    currentExpeditionNodeChoices: currentExpeditionNodeChoices.value,
    campStates: saveData.value.campStates
  }))

  const settlementState = computed<RegionMapSettlementState>(() => ({
    resourceLedger: saveData.value.resourceLedger,
    journeyHistory: saveData.value.journeyHistory,
    lastBossOutcome: saveData.value.lastBossOutcome
  }))

  const getRegionDisplayName = (regionId: RegionId) => REGION_DEFS.find(region => region.id === regionId)?.name ?? regionId

  const syncSeasonalRegionState = (regionId: RegionId, weekId: string, dayTag: string) => {
    const gameStore = useGameStore()
    const frontierChronicleStore = useFrontierChronicleStore()
    const current = saveData.value.seasonalRegionStates[regionId] ?? createDefaultRegionMapSaveData().seasonalRegionStates[regionId]
    const matchedRule = REGION_VARIANT_RULES.find(
      rule => rule.regionId === regionId && variantRuleMatches(rule, gameStore.season, gameStore.weather)
    )
    const next: RegionSeasonalState = {
      regionId,
      weekId,
      season: gameStore.season,
      weather: gameStore.weather,
      activeVariantId: matchedRule?.id ?? null,
      activeVariantLabel: matchedRule?.label ?? '',
      summary:
        matchedRule?.summary ??
        `${getRegionDisplayName(regionId)} 当前没有额外显形的季节变体，熟路更适合作为稳定回流线。`,
      detailLines:
        matchedRule?.detailLines ??
        [
          `当前季节 ${gameStore.seasonName} / 天气 ${gameStore.weatherName}，区域版图保持常态轮廓。`,
          '如果本周没有额外传闻或同伴合同，这里的熟路更适合自动巡行。'
        ],
      affectedRouteIds: matchedRule?.affectedRouteIds ?? [],
      manualExplorationRequired: Boolean(matchedRule?.manualExplorationRequired),
      seenVariantIds:
        matchedRule?.id && !current.seenVariantIds.includes(matchedRule.id)
          ? [...current.seenVariantIds, matchedRule.id]
          : [...current.seenVariantIds],
      lastUpdatedDayTag: dayTag
    }
    saveData.value.seasonalRegionStates[regionId] = next

    if (matchedRule?.id && !current.seenVariantIds.includes(matchedRule.id)) {
      const entryKey = `variant:${matchedRule.id}`
      frontierChronicleStore.recordChronicleEntry({
        entryKey,
        type: 'variant',
        title: `${getRegionDisplayName(regionId)}·${matchedRule.label}`,
        summary: matchedRule.summary,
        detailLines: [...matchedRule.detailLines],
        regionId,
        season: gameStore.season,
        weather: gameStore.weather,
        rumorId: null,
        companionNpcId: null,
        companionName: '',
        variantId: matchedRule.id,
        firstRecordedDayTag: dayTag,
        lastRecordedDayTag: dayTag,
        tags: ['见闻册', '季节变体', matchedRule.label]
      })
      frontierChronicleStore.recordPhotoMoment({
        chronicleEntryKey: entryKey,
        label: `${getRegionDisplayName(regionId)}留影卡`,
        frameHint: `${matchedRule.label} / ${gameStore.seasonName} / ${gameStore.weatherName}`,
        regionId,
        season: gameStore.season,
        weather: gameStore.weather,
        capturedDayTag: dayTag
      })
      frontierChronicleStore.recordRegionNotable(regionId, matchedRule.id)
    }

    return next
  }

  const buildWeeklyRumorEntries = (regionId: RegionId, weekId: string): RegionRumorBoardEntry[] => {
    const npcStore = useNpcStore()
    const supplyEntries = npcStore.getRegionRumorSupplyOverview(regionId)
    if (supplyEntries.length <= 0) return []

    const offset = getWeeklyRotationSeed(weekId, regionId) % supplyEntries.length
    const orderedEntries = supplyEntries.map((_, index) => supplyEntries[(index + offset) % supplyEntries.length]!)
    const pickedEntries = orderedEntries.slice(0, Math.min(2, orderedEntries.length))
    return pickedEntries.map(entry => ({
      ...entry,
      weekId,
      fulfilled: false,
      fulfilledDayTag: ''
    }))
  }

  const syncRumorBoardRuntime = (weekId: string, dayTag: string) => {
    if (saveData.value.rumorBoard.weekId === weekId) return saveData.value.rumorBoard

    saveData.value.rumorBoard = {
      weekId,
      lastRefreshedDayTag: dayTag,
      entriesByRegion: {
        ancient_road: buildWeeklyRumorEntries('ancient_road', weekId),
        mirage_marsh: buildWeeklyRumorEntries('mirage_marsh', weekId),
        cloud_highland: buildWeeklyRumorEntries('cloud_highland', weekId)
      }
    }
    return saveData.value.rumorBoard
  }

  const getActiveCompanionContract = (routeId: string) =>
    saveData.value.companionContracts.find(contract => contract.routeId === routeId && contract.status === 'active') ?? null

  const getCompanionContractCandidates = (routeId: string) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return [] as Array<{
      npcId: string
      npcName: string
      sourceType: RegionCompanionSourceType
      relationshipStage: RegionCompanionContract['relationshipStage']
      relationshipStageLabel: string
      summary: string
      riskModifier: number
      moraleBonus: number
    }>

    const npcStore = useNpcStore()
    const candidates = [] as Array<{
      npcId: string
      npcName: string
      sourceType: RegionCompanionSourceType
      relationshipStage: RegionCompanionContract['relationshipStage']
      relationshipStageLabel: string
      summary: string
      riskModifier: number
      moraleBonus: number
    }>
    const seenNpcIds = new Set<string>()

    const spouse = npcStore.getSpouse()
    if (spouse && !seenNpcIds.has(spouse.npcId)) {
      const stage = npcStore.getRelationshipStage(spouse.npcId)
      candidates.push({
        npcId: spouse.npcId,
        npcName: getNpcById(spouse.npcId)?.name ?? spouse.npcId,
        sourceType: 'spouse',
        relationshipStage: stage,
        relationshipStageLabel: npcStore.getRelationshipStageText(spouse.npcId),
        summary: `配偶会优先替你照看 ${route.name} 这一线的补给与回程承接。`,
        riskModifier: 2,
        moraleBonus: 6
      })
      seenNpcIds.add(spouse.npcId)
    }

    const zhiji = npcStore.getZhiji()
    if (zhiji && !seenNpcIds.has(zhiji.npcId)) {
      const stage = npcStore.getRelationshipStage(zhiji.npcId)
      candidates.push({
        npcId: zhiji.npcId,
        npcName: getNpcById(zhiji.npcId)?.name ?? zhiji.npcId,
        sourceType: 'zhiji',
        relationshipStage: stage,
        relationshipStageLabel: npcStore.getRelationshipStageText(zhiji.npcId),
        summary: `知己更擅长替你把 ${route.name} 的见闻整理成后续承接。`,
        riskModifier: 1,
        moraleBonus: 8
      })
      seenNpcIds.add(zhiji.npcId)
    }

    for (const helper of npcStore.hiredHelpers) {
      if (seenNpcIds.has(helper.npcId)) continue
      const stage = npcStore.getRelationshipStage(helper.npcId)
      candidates.push({
        npcId: helper.npcId,
        npcName: getNpcById(helper.npcId)?.name ?? helper.npcId,
        sourceType: 'helper',
        relationshipStage: stage,
        relationshipStageLabel: npcStore.getRelationshipStageText(helper.npcId),
        summary: `帮手愿意跟着你跑一趟 ${route.name}，主要负责沿线补给和杂务。`,
        riskModifier: 1,
        moraleBonus: 4
      })
      seenNpcIds.add(helper.npcId)
    }

    return candidates
  }

  const resolveRumorBoardEntries = (regionId: RegionId, routeId: string | null, dayTag: string, note: string) => {
    const frontierChronicleStore = useFrontierChronicleStore()
    const gameStore = useGameStore()
    const entries = saveData.value.rumorBoard.entriesByRegion[regionId] ?? []
    const matchedEntries = entries.filter(entry => !entry.fulfilled && (!entry.targetRouteId || entry.targetRouteId === routeId))
    if (matchedEntries.length <= 0) return [] as RegionRumorBoardEntry[]

    saveData.value.rumorBoard.entriesByRegion[regionId] = entries.map(entry =>
      matchedEntries.some(candidate => candidate.id === entry.id)
        ? {
            ...entry,
            fulfilled: true,
            fulfilledDayTag: dayTag
          }
        : entry
    )

    for (const entry of matchedEntries) {
      const entryKey = `rumor:${entry.id}`
      frontierChronicleStore.recordRumorReceipt({
        rumorId: entry.id,
        regionId,
        title: entry.title,
        sourceNpcId: entry.sourceNpcId,
        sourceNpcName: entry.sourceNpcName,
        resolvedDayTag: dayTag,
        summary: note
      })
      frontierChronicleStore.recordChronicleEntry({
        entryKey,
        type: 'rumor',
        title: `${entry.sourceNpcName}的传闻回执`,
        summary: entry.summary,
        detailLines: [...entry.detailLines, `兑现结果：${note}`].slice(0, 6),
        regionId,
        season: gameStore.season,
        weather: gameStore.weather,
        rumorId: entry.id,
        companionNpcId: null,
        companionName: '',
        variantId: null,
        firstRecordedDayTag: dayTag,
        lastRecordedDayTag: dayTag,
        tags: ['见闻册', '传闻', entry.title]
      })
      frontierChronicleStore.recordPhotoMoment({
        chronicleEntryKey: entryKey,
        label: `${entry.title}留影卡`,
        frameHint: `${entry.sourceNpcName} / ${entry.sourceLocation}`,
        regionId,
        season: gameStore.season,
        weather: gameStore.weather,
        capturedDayTag: dayTag
      })
      frontierChronicleStore.recordRegionNotable(regionId, entry.id)
    }

    if (routeId) {
      syncAutoPatrolState(routeId, dayTag)
    }

    return matchedEntries
  }

  const resolveCompanionContract = (
    routeId: string | null,
    outcome: 'completed' | 'failed',
    dayTag: string,
    noteLines: string[]
  ) => {
    if (!routeId) return null
    const contract = getActiveCompanionContract(routeId)
    if (!contract) return null

    const npcStore = useNpcStore()
    const frontierChronicleStore = useFrontierChronicleStore()
    const gameStore = useGameStore()
    const relationshipDelta = outcome === 'completed' ? (contract.sourceType === 'helper' ? 20 : 35) : -10
    npcStore.adjustFriendship(contract.npcId, relationshipDelta)

    saveData.value.companionContracts = saveData.value.companionContracts.map(entry =>
      entry.id === contract.id
        ? {
            ...entry,
            status: outcome,
            resolvedDayTag: dayTag,
            settlementLines: [...entry.settlementLines, ...noteLines].slice(0, 6)
          }
        : entry
    )

    const resolvedContract = saveData.value.companionContracts.find(entry => entry.id === contract.id) ?? contract
    const entryKey = `companion:${resolvedContract.id}`
    frontierChronicleStore.recordChronicleEntry({
      entryKey,
      type: 'companion',
      title: resolvedContract.chronicleTitle,
      summary: resolvedContract.summary,
      detailLines: [...resolvedContract.settlementLines, `关系变化：${relationshipDelta >= 0 ? '+' : ''}${relationshipDelta}`].slice(0, 6),
      regionId: resolvedContract.regionId,
      season: gameStore.season,
      weather: gameStore.weather,
      rumorId: null,
      companionNpcId: resolvedContract.npcId,
      companionName: resolvedContract.npcName,
      variantId: null,
      firstRecordedDayTag: dayTag,
      lastRecordedDayTag: dayTag,
      tags: ['见闻册', '同伴合同', resolvedContract.npcName]
    })
    frontierChronicleStore.recordPhotoMoment({
      chronicleEntryKey: entryKey,
      label: `${resolvedContract.npcName}同行留影`,
      frameHint: resolvedContract.sourceType === 'helper' ? '帮手合同' : '关系同行',
      regionId: resolvedContract.regionId,
      season: gameStore.season,
      weather: gameStore.weather,
      capturedDayTag: dayTag
    })
    frontierChronicleStore.recordRegionNotable(resolvedContract.regionId, resolvedContract.id)
    syncAutoPatrolState(routeId, dayTag)
    return resolvedContract
  }

  const recordJourneyChronicle = (
    entryKey: string,
    regionId: RegionId,
    title: string,
    summary: string,
    detailLines: string[],
    dayTag: string,
    companionNpcId: string | null = null,
    companionName = '',
    variantId: string | null = null
  ) => {
    const frontierChronicleStore = useFrontierChronicleStore()
    const gameStore = useGameStore()
    frontierChronicleStore.recordChronicleEntry({
      entryKey,
      type: 'journey',
      title,
      summary,
      detailLines: detailLines.slice(0, 6),
      regionId,
      season: gameStore.season,
      weather: gameStore.weather,
      rumorId: null,
      companionNpcId,
      companionName,
      variantId,
      firstRecordedDayTag: dayTag,
      lastRecordedDayTag: dayTag,
      tags: ['见闻册', '行旅纪', getRegionDisplayName(regionId)]
    })
    frontierChronicleStore.recordPhotoMoment({
      chronicleEntryKey: entryKey,
      label: `${title}留影卡`,
      frameHint: `${gameStore.seasonName} / ${gameStore.weatherName}`,
      regionId,
      season: gameStore.season,
      weather: gameStore.weather,
      capturedDayTag: dayTag
    })
  }

  const syncAutoPatrolState = (routeId: string, dayTag: string) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) {
      return (
        saveData.value.autoPatrolStates[routeId] ?? {
          routeId,
          enabled: true,
          mode: 'manual',
          lastAutoSettledDayTag: '',
          lastEvaluatedDayTag: dayTag,
          blockedReason: '路线不存在。',
          blockedTags: []
        }
      )
    }

    const current = saveData.value.autoPatrolStates[routeId] ?? {
      routeId,
      enabled: true,
      mode: 'manual',
      lastAutoSettledDayTag: '',
      lastEvaluatedDayTag: '',
      blockedReason: '',
      blockedTags: []
    }
    const shortcutProfile = getRouteShortcutProfile(routeId)
    const seasonalState = saveData.value.seasonalRegionStates[route.regionId]
    const activeRumors = (saveData.value.rumorBoard.entriesByRegion[route.regionId] ?? []).filter(
      entry => !entry.fulfilled && (!entry.targetRouteId || entry.targetRouteId === routeId)
    )
    const activeContract = getActiveCompanionContract(routeId)
    const blockedTags = [] as string[]
    const blockedReasons = [] as string[]

    if (shortcutProfile.level !== 'mastered') {
      blockedReasons.push('这条路线还没进入熟路阶段，默认仍需手动探索。')
    }
    if (
      seasonalState?.activeVariantId &&
      seasonalState.manualExplorationRequired &&
      seasonalState.affectedRouteIds.includes(routeId)
    ) {
      blockedTags.push('变体')
      blockedReasons.push(`季节变体「${seasonalState.activeVariantLabel}」要求本周继续手动确认。`)
    }
    if (activeRumors.length > 0) {
      blockedTags.push('传闻')
      blockedReasons.push(`还有 ${activeRumors.length} 条传闻待兑现。`)
    }
    if (activeContract) {
      blockedTags.push('同伴')
      blockedReasons.push(`已挂上 ${activeContract.npcName} 的同行合同。`)
    }
    if (!current.enabled) {
      blockedTags.push('关闭')
      blockedReasons.push('你已手动关闭这条熟路的自动巡行。')
    }

    const nextState: RegionAutoPatrolState = {
      routeId,
      enabled: current.enabled,
      mode:
        shortcutProfile.level !== 'mastered'
          ? 'manual'
          : blockedReasons.length > 0
            ? 'blocked'
            : 'ready',
      lastAutoSettledDayTag: current.lastAutoSettledDayTag,
      lastEvaluatedDayTag: dayTag,
      blockedReason: blockedReasons.join(' '),
      blockedTags
    }
    saveData.value.autoPatrolStates[routeId] = nextState
    return nextState
  }

  const syncAutoPatrolStates = (dayTag: string) => {
    for (const route of REGION_ROUTE_DEFS) {
      syncAutoPatrolState(route.id, dayTag)
    }
  }

  const ensureFrontierWorldSignals = (dayTag = '') => {
    const gameStore = useGameStore()
    const effectiveDayTag = dayTag || `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    const weekId = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId
    for (const region of REGION_DEFS) {
      syncSeasonalRegionState(region.id, weekId, effectiveDayTag)
    }
    syncRumorBoardRuntime(weekId, effectiveDayTag)
    syncAutoPatrolStates(effectiveDayTag)
    return {
      weekId,
      dayTag: effectiveDayTag
    }
  }

  const getRegionVariantSnapshot = (regionId: RegionId, dayTag = '') => {
    ensureFrontierWorldSignals(dayTag)
    return saveData.value.seasonalRegionStates[regionId]
  }

  const getRumorBoardForRegion = (regionId: RegionId, dayTag = '') => {
    ensureFrontierWorldSignals(dayTag)
    return saveData.value.rumorBoard.entriesByRegion[regionId] ?? []
  }

  const getAutoPatrolStatus = (routeId: string, dayTag = '') => {
    const runtime = ensureFrontierWorldSignals(dayTag)
    return saveData.value.autoPatrolStates[routeId] ?? syncAutoPatrolState(routeId, runtime.dayTag)
  }

  const assignCompanionContract = (routeId: string, npcId: string, dayTag = '') => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { success: false, message: '路线不存在。' }
    if (hasActiveExpedition.value) return { success: false, message: '当前已有进行中的远征，先收束再派合同。' }

    const runtime = ensureFrontierWorldSignals(dayTag)
    const existingActiveContract = saveData.value.companionContracts.find(contract => contract.status === 'active')
    if (existingActiveContract && existingActiveContract.routeId !== routeId) {
      return { success: false, message: `当前已有 ${existingActiveContract.npcName} 的同行合同在路上。` }
    }
    if (getActiveCompanionContract(routeId)?.npcId === npcId) {
      return { success: true, message: '这位同伴已经挂在这条路线上了。' }
    }

    const candidate = getCompanionContractCandidates(routeId).find(entry => entry.npcId === npcId)
    if (!candidate) return { success: false, message: '当前没有可派发的同伴合同。' }

    const contract: RegionCompanionContract = {
      id: createSessionToken(),
      npcId: candidate.npcId,
      npcName: candidate.npcName,
      sourceType: candidate.sourceType,
      relationshipStage: candidate.relationshipStage,
      relationshipStageLabel: candidate.relationshipStageLabel,
      regionId: route.regionId,
      routeId,
      assignedDayTag: runtime.dayTag,
      expiresDayTag: addDaysToCalendarDayTag(runtime.dayTag, 3),
      durationDays: 3,
      riskModifier: candidate.riskModifier,
      moraleBonus: candidate.moraleBonus,
      summary: candidate.summary,
      chronicleTitle: `${candidate.npcName}·${route.name}同行回执`,
      settlementLines: [
        `${candidate.npcName} 已接下 ${route.name} 的同行合同。`,
        candidate.summary,
        candidate.sourceType === 'helper' ? '这份合同更偏向补给与杂务支援。' : '这份合同会把关系线与见闻册一起接进旅后处理。'
      ],
      status: 'active',
      resolvedDayTag: ''
    }

    saveData.value.companionContracts = [
      contract,
      ...saveData.value.companionContracts.filter(entry => entry.status !== 'active')
    ].slice(0, 16)
    syncAutoPatrolState(routeId, runtime.dayTag)
    return {
      success: true,
      message: `${candidate.npcName} 已接下 ${route.name} 的同行合同，这周默认需要手动探索。`
    }
  }

  const clearCompanionContract = (routeId: string, dayTag = '') => {
    const activeContract = getActiveCompanionContract(routeId)
    if (!activeContract) return { success: false, message: '这条路线当前没有挂着同行合同。' }
    saveData.value.companionContracts = saveData.value.companionContracts.filter(entry => entry.id !== activeContract.id)
    syncAutoPatrolState(routeId, dayTag)
    return {
      success: true,
      message: `已撤回 ${activeContract.npcName} 的同行合同。`
    }
  }

  const addRegionKnowledge = (
    regionId: RegionId,
    gains: Partial<Pick<RegionKnowledgeState, 'intel' | 'survey' | 'familiarity'>>,
    dayTag = ''
  ) => {
    const current = getRegionKnowledgeState(regionId)
    const next: RegionKnowledgeState = {
      regionId,
      intel: clamp(current.intel + Math.max(0, Math.floor(Number(gains.intel) || 0)), 0, 100),
      survey: clamp(current.survey + Math.max(0, Math.floor(Number(gains.survey) || 0)), 0, 100),
      familiarity: clamp(current.familiarity + Math.max(0, Math.floor(Number(gains.familiarity) || 0)), 0, 100),
      lastUpdatedDayTag: dayTag || current.lastUpdatedDayTag
    }
    saveData.value.knowledgeState[regionId] = next
    syncStructuralState(regionId, dayTag)
    return next
  }

  const addRouteKnowledge = (
    routeId: string,
    gains: Partial<Pick<RegionRouteKnowledgeState, 'intel' | 'surveyProgress' | 'familiarity'>>,
    dayTag = ''
  ) => {
    const current = getRouteKnowledgeState(routeId)
    const next: RegionRouteKnowledgeState = {
      routeId,
      intel: clamp(current.intel + Math.max(0, Math.floor(Number(gains.intel) || 0)), 0, 100),
      surveyProgress: clamp(current.surveyProgress + Math.max(0, Math.floor(Number(gains.surveyProgress) || 0)), 0, 100),
      familiarity: clamp(current.familiarity + Math.max(0, Math.floor(Number(gains.familiarity) || 0)), 0, 100),
      lastUpdatedDayTag: dayTag || current.lastUpdatedDayTag
    }
    saveData.value.routeKnowledgeState[routeId] = next
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (route) syncStructuralState(route.regionId, dayTag)
    return next
  }

  const getRouteShortcutProfile = (routeId: string) => {
    return buildShortcutProfileFromLevel(getShortcutState(routeId).level)
  }

  const createClearedExpeditionState = (): ExpeditionRuntimeState => ({
    activeRegionId: null,
    activeRouteId: null,
    activeBossId: null,
    startedAtDayTag: ''
  })

  const normalizeExpeditionState = (expedition: ExpeditionRuntimeState): ExpeditionRuntimeState => {
    if (!expedition.activeRegionId || !REGION_DEFS.some(region => region.id === expedition.activeRegionId)) {
      return createClearedExpeditionState()
    }

    const route = expedition.activeRouteId
      ? REGION_ROUTE_DEFS.find(entry => entry.id === expedition.activeRouteId && entry.regionId === expedition.activeRegionId) ?? null
      : null
    const boss = expedition.activeBossId
      ? REGION_BOSS_DEFS.find(entry => entry.id === expedition.activeBossId && entry.regionId === expedition.activeRegionId) ?? null
      : null

    if (!route && !boss) {
      return createClearedExpeditionState()
    }

    return {
      activeRegionId: expedition.activeRegionId,
      activeRouteId: boss ? null : route?.id ?? null,
      activeBossId: boss?.id ?? null,
      startedAtDayTag: expedition.startedAtDayTag
    }
  }

  const getRouteRewardAmount = (routeId: string) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return 0
    const priorCompletions = saveData.value.routeStates[routeId]?.completions ?? 0
    const firstClearReward = route.nodeType === 'elite' ? 3 : 2
    return priorCompletions > 0 ? Math.max(1, firstClearReward - 1) : firstClearReward
  }

  const getBossRewardAmount = (regionId: RegionId) => ((saveData.value.bossClearCounts[regionId] ?? 0) > 0 ? 2 : 4)

  const shouldBlockRapidRepeatAction = (actionId: string, cooldownMs = 1000) => {
    const now = Date.now()
    const previous = recentActionTimestamps.value[actionId] ?? 0
    recentActionTimestamps.value = {
      ...recentActionTimestamps.value,
      [actionId]: now
    }
    return now - previous < cooldownMs
  }

  const getRouteUnlockStatus = (routeId: string) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { unlocked: false, reason: '路线不存在。' }
    if (!saveData.value.unlockStates[route.regionId]?.unlocked) {
      return { unlocked: false, reason: '该区域尚未解锁。' }
    }
    const state = saveData.value.routeStates[route.id]
    if (state?.unlocked) return { unlocked: true, reason: '' }

    const missingRouteIds = (route.unlockRouteIds ?? []).filter(requiredRouteId => (saveData.value.routeStates[requiredRouteId]?.completions ?? 0) <= 0)
    if (missingRouteIds.length > 0) {
      const missingNames = missingRouteIds
        .map(requiredRouteId => REGION_ROUTE_DEFS.find(entry => entry.id === requiredRouteId)?.name ?? requiredRouteId)
        .join('、')
      return { unlocked: false, reason: `需先完成：${missingNames}。` }
    }

    const unlockCompletionCount = Math.max(0, route.unlockCompletionCount ?? 0)
    if (unlockCompletionCount > 0 && getRegionCompletedRouteCount(route.regionId) < unlockCompletionCount) {
      return { unlocked: false, reason: `需先完成该区域至少 ${unlockCompletionCount} 条路线。` }
    }
    return { unlocked: true, reason: '' }
  }

  const getEventUnlockStatus = (eventId: string) => {
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId)
    if (!event) return { unlocked: false, reason: '区域事件不存在。' }
    if (!saveData.value.unlockStates[event.regionId]?.unlocked) {
      return { unlocked: false, reason: '该区域尚未解锁。' }
    }

    const missingRouteIds = (event.unlockRouteIds ?? []).filter(requiredRouteId => (saveData.value.routeStates[requiredRouteId]?.completions ?? 0) <= 0)
    if (missingRouteIds.length > 0) {
      const missingNames = missingRouteIds
        .map(requiredRouteId => REGION_ROUTE_DEFS.find(entry => entry.id === requiredRouteId)?.name ?? requiredRouteId)
        .join('、')
      return { unlocked: false, reason: `需先完成：${missingNames}。` }
    }

    const unlockCompletionCount = Math.max(0, event.unlockCompletionCount ?? 0)
    if (unlockCompletionCount > 0 && getRegionCompletedRouteCount(event.regionId) < unlockCompletionCount) {
      return { unlocked: false, reason: `需先完成该区域至少 ${unlockCompletionCount} 条路线。` }
    }

    return { unlocked: true, reason: '' }
  }

  const refreshRouteUnlocks = (regionId?: RegionId) => {
    const routeDefs = regionId ? getRegionRoutes(regionId) : REGION_ROUTE_DEFS
    for (const route of routeDefs) {
      const current = saveData.value.routeStates[route.id]
      const unlockStatus = getRouteUnlockStatus(route.id)
      saveData.value.routeStates[route.id] = {
        routeId: route.id,
        unlocked: Boolean(current?.unlocked) || unlockStatus.unlocked,
        completions: current?.completions ?? 0,
        lastCompletedDayTag: current?.lastCompletedDayTag ?? ''
      }
    }
    syncStructuralState(regionId)
  }

  const getRouteExpeditionStatus = (routeId: string) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { available: false, reason: '路线不存在。' }

    const unlockStatus = getRouteUnlockStatus(routeId)
    if (!unlockStatus.unlocked) {
      return { available: false, reason: unlockStatus.reason }
    }
    if (hasActiveExpedition.value) {
      return { available: false, reason: '当前已有一条进行中的远征，请先收束当前远征记录。' }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const rewardItems = ROUTE_ITEM_REWARDS[route.id] ?? []

    if (gameStore.isPastBedtime) {
      return { available: false, reason: '已经太晚了，今天不适合再出发行旅图。' }
    }
    if (playerStore.stamina < route.staminaCost) {
      return { available: false, reason: `体力不足，需要 ${route.staminaCost} 点体力。` }
    }
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { available: false, reason: '背包空间不足，无法携带本次区域收获。' }
    }
    return { available: true, reason: '' }
  }

  const getEventAvailability = (eventId: string) => {
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId)
    if (!event) return { available: false, reason: '区域事件不存在。' }
    const unlockStatus = getEventUnlockStatus(eventId)
    if (!unlockStatus.unlocked) {
      return { available: false, reason: unlockStatus.reason }
    }

    const activeEventIds = getRegionActiveEventIds(event.regionId)
    if (!activeEventIds.includes(event.id)) {
      return { available: false, reason: '该事件当前不在本周刷新池中。' }
    }

    const state = saveData.value.eventStates[event.id]
    const maxWeeklyCompletions = Math.max(1, event.maxWeeklyCompletions ?? 1)
    if ((state?.weeklyCompletions ?? 0) >= maxWeeklyCompletions) {
      return { available: false, reason: '本周该事件已处理完成。' }
    }

    if (hasActiveExpedition.value) {
      return { available: false, reason: '当前已有进行中的远征记录，请先收束。' }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const rewardItems = EVENT_ITEM_REWARDS[event.id] ?? []
    if (gameStore.isPastBedtime) {
      return { available: false, reason: '已经太晚了，今天不适合再处理区域事件。' }
    }
    if (playerStore.stamina < event.staminaCost) {
      return { available: false, reason: `体力不足，需要 ${event.staminaCost} 点体力。` }
    }
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { available: false, reason: '背包空间不足，无法带回本次事件奖励。' }
    }
    return { available: true, reason: '' }
  }

  const getRecommendedRecoveryRoute = (regionId: RegionId) => {
    const highlightedRouteIds = new Set(saveData.value.weeklyFocusState.highlightedRouteIds ?? [])
    const unlockedRoutes = getRegionRoutes(regionId).filter(route => getRouteUnlockStatus(route.id).unlocked)
    if (unlockedRoutes.length <= 0) return null

    return unlockedRoutes
      .map(route => {
        const completions = saveData.value.routeStates[route.id]?.completions ?? 0
        const routeKnowledge = getRouteKnowledgeState(route.id)
        const score =
          (highlightedRouteIds.has(route.id) ? 4 : 0) +
          (completions <= 0 ? 3 : 0) +
          (route.nodeType === 'route' ? 2 : route.nodeType === 'handoff' ? 1 : 0) +
          Math.max(0, 2 - completions) +
          Math.floor(routeKnowledge.familiarity / 20) +
          Math.floor(routeKnowledge.intel / 30)
        return { route, score }
      })
      .sort((left, right) => right.score - left.score)[0]?.route ?? null
  }

  const getBossExpeditionStatus = (regionId: RegionId) => {
    const boss = getRegionBossDef(regionId)
    if (!saveData.value.unlockStates[regionId]?.unlocked) {
      return { available: false, reason: '该区域尚未解锁。' }
    }
    if (hasActiveExpedition.value) {
      return { available: false, reason: '当前已有一条进行中的远征，请先收束当前远征记录。' }
    }
    const completedRouteCount = getRegionCompletedRouteCount(regionId)
    if (completedRouteCount <= 0) {
      return { available: false, reason: '至少先完成 1 条该区域路线，才能挑战区域首领。' }
    }
    if (!boss) {
      return { available: false, reason: '当前区域首领未配置。' }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const rewardItems = BOSS_ITEM_REWARDS[regionId] ?? []

    if (gameStore.isPastBedtime) {
      return { available: false, reason: '已经太晚了，今天不适合挑战区域首领。' }
    }
    if (playerStore.stamina < boss.staminaCost) {
      return { available: false, reason: `体力不足，需要 ${boss.staminaCost} 点体力。` }
    }
    if (playerStore.hp <= Math.max(20, Math.floor(playerStore.getMaxHp() * 0.25))) {
      return { available: false, reason: '当前生命值过低，建议先恢复状态再战。' }
    }
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { available: false, reason: '背包空间不足，无法带回首领奖励。' }
    }
    return { available: true, reason: '' }
  }

  const regionBossAvailability = computed(() =>
    REGION_DEFS.map(region => {
      const boss = getRegionBossDef(region.id)
      const status = getBossExpeditionStatus(region.id)
      return {
        regionId: region.id,
        bossId: boss?.id ?? null,
        available: status.available,
        disabledReason: status.reason,
        completedRouteCount: getRegionCompletedRouteCount(region.id)
      }
    })
  )

  const regionEventEntries = computed(() =>
    REGION_EVENT_DEFS.map(event => ({
      ...event,
      active: getRegionActiveEventIds(event.regionId).includes(event.id),
      totalCompletions: saveData.value.eventStates[event.id]?.totalCompletions ?? 0,
      weeklyCompletions: saveData.value.eventStates[event.id]?.weeklyCompletions ?? 0
    }))
  )

  const getActiveRegionEvents = (regionId: RegionId) =>
    getRegionActiveEventIds(regionId)
      .map(eventId => regionEventEntries.value.find(entry => entry.id === eventId) ?? null)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  const frontierDigest = computed(() => {
    const focusedRegion = currentWeeklyFocus.value.focusedRegionId
      ? regionSummaries.value.find(region => region.id === currentWeeklyFocus.value.focusedRegionId) ?? null
      : null
    const latestJourney = journeyHistory.value[0] ?? null
    const highlightSummaries: string[] = []
    const nextHookSummaries: string[] = []
    const riskSummaries: string[] = []

    if (focusedRegion?.unlocked) {
      highlightSummaries.push(`本周焦点：${focusedRegion.name}`)
      nextHookSummaries.push(`本周导向：${getLinkedSystemLabels(focusedRegion.linkedSystems).slice(0, 2).join(' / ')}`)
      const focusedKnowledge = getRegionKnowledgeState(focusedRegion.id)
      if (focusedKnowledge.intel > 0 || focusedKnowledge.survey > 0) {
        highlightSummaries.push(`地图认知：情报 ${focusedKnowledge.intel} / 勘明 ${focusedKnowledge.survey}`)
      }
      const focusedEvents = getActiveRegionEvents(focusedRegion.id).map(event => event.name)
      if (focusedEvents.length > 0) {
        highlightSummaries.push(`本周事件：${focusedEvents.join(' / ')}`)
      }
    }

    if (latestJourney) {
      highlightSummaries.push(`上次回城：${latestJourney.targetName} / ${latestJourney.outcome === 'victory' ? '凯旋' : latestJourney.outcome === 'retreated' ? '撤退' : '失利'}`)
    }

    if (activeExpeditionSummary.value?.region) {
      highlightSummaries.push(`进行中远征：${activeExpeditionSummary.value.region.name}`)
      const session = activeSession.value
      if (session?.nodeHistory.length) {
        const lastNode = session.nodeHistory[session.nodeHistory.length - 1]
        if (lastNode) nextHookSummaries.push(`当前节点：${lastNode.label}`)
      }
      if (session?.campState) {
        nextHookSummaries.push('当前停留：前线营地')
      }
      if (currentExpeditionNodeChoices.value.length > 0) {
        nextHookSummaries.push(`下一步：${currentExpeditionNodeChoices.value.map(choice => choice.label).join(' / ')}`)
      }
      if (session) {
        if (session.danger >= 60) riskSummaries.push(`风险提醒：当前风险 ${session.danger}，建议优先扎营、标记路线或直接回撤。`)
        if (session.carryLoad >= Math.max(1, session.maxCarryLoad - 1)) riskSummaries.push(`负重提醒：当前负重 ${session.carryLoad}/${session.maxCarryLoad}，继续深推前先整理补给更稳。`)
        if (session.visibility <= 40) riskSummaries.push(`视野提醒：当前视野 ${session.visibility}，支线观察或营地侦察能更快补清地图。`)
        if (session.riskState.pollution >= 30 || session.riskState.anomaly >= 28) riskSummaries.push(`异变提醒：污染 ${session.riskState.pollution} / 异变 ${session.riskState.anomaly}，继续强推会把后续遭遇链抬成高压分支。`)
        if (session.mode === 'boss' && session.frontlinePrep <= Math.max(1, session.progressStep)) riskSummaries.push(`决战提醒：前线准备仅 ${session.frontlinePrep}，建议先做支援、扎营或侧翼布置再压首领。`)
      }
    }

    if (lastBossOutcome.value.outcome !== 'none' && lastBossOutcome.value.summary) {
      highlightSummaries.push(lastBossOutcome.value.summary)
    }

    if (lastBossOutcome.value.outcome === 'failure' && lastBossOutcome.value.recommendedRouteId) {
      const routeName = REGION_ROUTE_DEFS.find(route => route.id === lastBossOutcome.value.recommendedRouteId)?.name
      if (routeName) {
        nextHookSummaries.unshift(`失败回滚：${routeName}`)
      }
    }

    const resourceHighlights = resourceLedgerEntries.value
      .filter(entry => entry.quantity > 0)
      .slice(0, 2)
      .map(entry => `${entry.label} x${entry.quantity}`)
    if (resourceHighlights.length > 0) {
      highlightSummaries.push(`区域库存：${resourceHighlights.join(' / ')}`)
      nextHookSummaries.push(`优先交付：${resourceHighlights.join(' / ')}`)
    }

    return {
      headline: focusedRegion?.name ? `${focusedRegion.name} · 上周回顾 / 本周导向` : '行旅图摘要',
      highlightSummaries: [...new Set(highlightSummaries)].slice(0, 4),
      nextHookSummaries: [...new Set(nextHookSummaries)].slice(0, 4),
      riskSummaries: [...new Set(riskSummaries)].slice(0, 4)
    }
  })

  const reset = () => {
    saveData.value = createDefaultRegionMapSaveData()
    syncStructuralState()
  }

  const getRegionUnlockProgress = (regionId: RegionId) => {
    const villageProjectStore = useVillageProjectStore()
    const hanhaiStore = useHanhaiStore()
    const museumStore = useMuseumStore()
    const fishPondStore = useFishPondStore()
    const guildStore = useGuildStore()
    const achievementStore = useAchievementStore()

    switch (regionId) {
      case 'ancient_road':
        return {
          ready: villageProjectStore.villageProjectLevel >= 2 || hanhaiStore.totalRelicClears >= 2,
          summary: `村庄建设 ${villageProjectStore.villageProjectLevel}/2 或 瀚海遗迹 ${hanhaiStore.totalRelicClears}/2`
        }
      case 'mirage_marsh':
        return {
          ready: museumStore.donatedCount >= 6 || fishPondStore.pond.built,
          summary: `博物馆捐赠 ${museumStore.donatedCount}/6 或 已建鱼塘 ${fishPondStore.pond.built ? '是' : '否'}`
        }
      case 'cloud_highland':
        return {
          ready:
            guildStore.guildLevel >= 3 ||
            achievementStore.stats.highestMineFloor >= 40 ||
            villageProjectStore.villageProjectLevel >= 4,
          summary: `公会等级 ${guildStore.guildLevel}/3 或 矿洞层数 ${achievementStore.stats.highestMineFloor}/40 或 村建等级 ${villageProjectStore.villageProjectLevel}/4`
        }
      default:
        return {
          ready: false,
          summary: '暂无解锁条件'
        }
    }
  }

  const refreshUnlocksFromProgress = (dayTag = '') => {
    const unlockedRegionIds: RegionId[] = []
    for (const region of REGION_DEFS) {
      const current = saveData.value.unlockStates[region.id]
      if (current?.unlocked) continue
      const progress = getRegionUnlockProgress(region.id)
      if (!progress.ready) continue
      applyUnlockedRegionState(region.id, dayTag)
      unlockedRegionIds.push(region.id)
    }
    return unlockedRegionIds
  }

  const applyUnlockedRegionState = (regionId: RegionId, unlockedDayTag = '') => {
    saveData.value.unlockStates[regionId] = {
      unlocked: true,
      unlockedDayTag
    }
    for (const route of getRegionRoutes(regionId)) {
      const current = saveData.value.routeStates[route.id]
      saveData.value.routeStates[route.id] = {
        routeId: route.id,
        unlocked: current?.unlocked ?? false,
        completions: current?.completions ?? 0,
        lastCompletedDayTag: current?.lastCompletedDayTag ?? ''
      }
    }
    refreshRouteUnlocks(regionId)
    syncStructuralState(regionId, unlockedDayTag)
    if (saveData.value.weeklyFocusState.weekId) {
      refreshWeeklyEventRuntime(saveData.value.weeklyFocusState.weekId, saveData.value.weeklyFocusState.focusedRegionId, unlockedDayTag)
    }
  }

  const applyLockedRegionState = (regionId: RegionId) => {
    saveData.value.unlockStates[regionId] = {
      unlocked: false,
      unlockedDayTag: ''
    }
    for (const route of getRegionRoutes(regionId)) {
      const current = saveData.value.routeStates[route.id]
      saveData.value.routeStates[route.id] = {
        routeId: route.id,
        unlocked: false,
        completions: current?.completions ?? 0,
        lastCompletedDayTag: current?.lastCompletedDayTag ?? ''
      }
    }
    refreshRouteUnlocks(regionId)
    syncStructuralState(regionId, '')
    if (saveData.value.weeklyFocusState.weekId) {
      refreshWeeklyEventRuntime(saveData.value.weeklyFocusState.weekId, saveData.value.weeklyFocusState.focusedRegionId, '')
    }
  }

  const setWeeklyFocus = (weekId: string, focusedRegionId: RegionId | null, highlightedRouteIds: string[] = []) => {
    saveData.value.weeklyFocusState = {
      weekId,
      focusedRegionId,
      highlightedRouteIds: [...new Set(highlightedRouteIds.filter(Boolean))]
    }
  }

  const pickWeeklyRegionEvents = (regionId: RegionId, weekId: string, focusedRegionId: RegionId | null) => {
    const eligibleEvents = getRegionEvents(regionId).filter(event => getEventUnlockStatus(event.id).unlocked)
    if (eligibleEvents.length <= 0) return []
    const desiredCount = focusedRegionId === regionId ? Math.min(3, eligibleEvents.length) : Math.min(2, eligibleEvents.length)
    const seed = getWeeklyRotationSeed(weekId, regionId) % eligibleEvents.length
    return Array.from({ length: desiredCount }, (_, index) => eligibleEvents[(seed + index) % eligibleEvents.length]?.id ?? '')
      .filter(Boolean)
  }

  const refreshWeeklyEventRuntime = (weekId: string, focusedRegionId: RegionId | null, dayTag = '') => {
    const sameWeek = saveData.value.weeklyEventState.weekId === weekId
    const activeEventIdsByRegion = createEmptyActiveEventMap()
    for (const region of REGION_DEFS) {
      activeEventIdsByRegion[region.id] = saveData.value.unlockStates[region.id]?.unlocked
        ? pickWeeklyRegionEvents(region.id, weekId, focusedRegionId)
        : []
    }

    for (const event of REGION_EVENT_DEFS) {
      const current = saveData.value.eventStates[event.id] ?? {
        eventId: event.id,
        totalCompletions: 0,
        weeklyCompletions: 0,
        lastCompletedDayTag: '',
        lastActivatedWeekId: ''
      }
      saveData.value.eventStates[event.id] = {
        eventId: event.id,
        totalCompletions: current.totalCompletions,
        weeklyCompletions: sameWeek ? current.weeklyCompletions : 0,
        lastCompletedDayTag: current.lastCompletedDayTag,
        lastActivatedWeekId: activeEventIdsByRegion[event.regionId].includes(event.id) ? weekId : current.lastActivatedWeekId
      }
    }

    saveData.value.weeklyEventState = {
      weekId,
      activeEventIdsByRegion,
      lastRefreshedDayTag: dayTag
    }
    return activeEventIdsByRegion
  }

  const ensureWeeklyEventRuntime = (weekId: string, focusedRegionId: RegionId | null, dayTag = '') => {
    if (saveData.value.weeklyEventState.weekId === weekId) return false
    refreshWeeklyEventRuntime(weekId, focusedRegionId, dayTag)
    return true
  }

  const markRouteCompleted = (routeId: string, dayTag = '') => {
    const current = saveData.value.routeStates[routeId]
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    saveData.value.routeStates[routeId] = {
      routeId,
      unlocked: current?.unlocked ?? true,
      completions: (current?.completions ?? 0) + 1,
      lastCompletedDayTag: dayTag
    }
    saveData.value.telemetry.totalRouteCompletions += 1
    if (route) {
      syncRouteMapNodeState(route.id, dayTag, 1, 1)
      syncShortcutState(route.id, dayTag)
      addRegionKnowledge(route.regionId, { intel: 6, survey: 8, familiarity: 4 }, dayTag)
      addRouteKnowledge(route.id, { intel: 8, surveyProgress: 12, familiarity: 10 }, dayTag)
      refreshRouteUnlocks(route.regionId)
      syncAutoPatrolState(route.id, dayTag)
    }
  }

  const addFamilyResources = (familyId: RegionalResourceFamilyId, amount: number) => {
    if (!resourceFeatureEnabled.value) return
    if (!Number.isFinite(amount)) return
    const normalized = Math.max(0, Math.floor(amount))
    if (normalized <= 0) return
    saveData.value.resourceLedger[familyId] = (saveData.value.resourceLedger[familyId] ?? 0) + normalized
  }

  const consumeFamilyResources = (familyId: RegionalResourceFamilyId, amount: number) => {
    if (!resourceFeatureEnabled.value) return false
    const normalized = Math.max(0, Math.floor(Number(amount) || 0))
    if (normalized <= 0) return false
    const current = saveData.value.resourceLedger[familyId] ?? 0
    if (current < normalized) return false
    saveData.value.resourceLedger[familyId] = current - normalized
    return true
  }

  const recordResourceTurnIn = (familyId: RegionalResourceFamilyId, amount = 1) => {
    if (!consumeFamilyResources(familyId, amount)) return false
    const normalized = Math.max(0, Math.floor(Number(amount) || 0))
    if (normalized <= 0) return false
    saveData.value.telemetry.resourceTurnIns += normalized
    return true
  }

  const startExpedition = (regionId: RegionId, routeId: string | null = null, bossId: string | null = null, startedAtDayTag = '') => {
    saveData.value.expedition = {
      activeRegionId: regionId,
      activeRouteId: routeId,
      activeBossId: bossId,
      startedAtDayTag
    }
  }

  const beginRoute = (routeId: string, startedAtDayTag = '') => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return false
    if (!getRouteUnlockStatus(routeId).unlocked) return false
    startExpedition(route.regionId, route.id, null, startedAtDayTag)
    return true
  }

  const clearExpedition = () => {
    saveData.value.expedition = createClearedExpeditionState()
    saveData.value.activeSession = null
  }

  const LINKED_SYSTEM_LABELS: Record<RegionLinkedSystem, string> = {
    quest: '任务板',
    shop: '商圈',
    museum: '博物馆',
    guild: '公会',
    hanhai: '瀚海',
    fishPond: '鱼塘',
    villageProject: '村庄',
    wallet: '钱包'
  }

  const getLinkedSystemLabels = (linkedSystems: RegionLinkedSystem[]) =>
    [...new Set(linkedSystems)].map(system => LINKED_SYSTEM_LABELS[system]).filter(Boolean)

  const getResourceFamilyLabel = (familyId: RegionalResourceFamilyId | null) =>
    familyId ? REGIONAL_RESOURCE_FAMILY_DEFS.find(entry => entry.id === familyId)?.label ?? familyId : '区域收获'

  const createInitialRiskState = (regionId: RegionId, approach: RegionExpeditionApproach): RegionExpeditionRiskState => ({
    weather:
      regionId === 'ancient_road'
        ? (approach === 'scout' ? 'wind' : 'clear')
        : regionId === 'mirage_marsh'
          ? (approach === 'scout' ? 'fog' : 'wind')
          : (approach === 'greedy' ? 'storm' : 'wind'),
    pollution: regionId === 'mirage_marsh' ? 18 : regionId === 'cloud_highland' ? 8 : 4,
    alertness: regionId === 'ancient_road' ? 14 : regionId === 'cloud_highland' ? 16 : 10,
    anomaly: regionId === 'mirage_marsh' ? 12 : regionId === 'cloud_highland' ? 6 : 4
  })

  const createCarryItem = (
    label: string,
    category: RegionExpeditionCarryItemCategory,
    quantity: number,
    burden: number,
    note: string
  ): RegionExpeditionCarryItem => ({
    id: createSessionToken(),
    label,
    category,
    quantity: Math.max(1, Math.floor(quantity)),
    burden: Math.max(1, Math.floor(burden)),
    note
  })

  const mergeCarryItems = (baseItems: RegionExpeditionCarryItem[], extraItems: RegionExpeditionCarryItem[]) => {
    const carryMap = new Map<string, RegionExpeditionCarryItem>()
    for (const item of [...baseItems, ...extraItems]) {
      if (!item.label || item.quantity <= 0 || item.burden <= 0) continue
      const key = `${item.label}::${item.category}::${item.note}`
      const current = carryMap.get(key)
      if (current) {
        current.quantity += item.quantity
        current.burden += item.burden
      } else {
        carryMap.set(key, { ...item })
      }
    }
    return Array.from(carryMap.values())
  }

  const summarizeCarryItems = (carryItems: RegionExpeditionCarryItem[]) =>
    carryItems.map(item => `${item.label}(${item.category}) x${item.quantity}`).join(' / ')

  const recalculateCarryLoad = (session: RegionExpeditionSession) => {
    session.carryLoad = clamp(session.carryItems.reduce((total, item) => total + item.burden, 0), 0, session.maxCarryLoad)
    return session.carryLoad
  }

  const addCarryItems = (session: RegionExpeditionSession, carryItems: RegionExpeditionCarryItem[]) => {
    session.carryItems = mergeCarryItems(session.carryItems, carryItems)
    recalculateCarryLoad(session)
    return session.carryItems
  }

  const getEncounterKindLabel = (kind: RegionExpeditionEncounterKind) =>
    kind === 'hazard'
      ? '险段'
      : kind === 'cache'
        ? '收获'
        : kind === 'traveler'
          ? '旅者'
          : kind === 'support'
            ? '支援'
            : kind === 'anomaly'
              ? '异变'
              : kind === 'boss_prep'
                ? '前夜'
                : '事件'

  const createEncounterMemorySummary = (kind: RegionExpeditionEncounterKind, optionId: RegionExpeditionEncounterOption['id']) =>
    `${getEncounterKindLabel(kind)} / ${optionId === 'bold' ? '强势推进' : optionId === 'balanced' ? '维持节奏' : '谨慎处理'}`

  const getFollowUpEncounterKind = (
    kind: RegionExpeditionEncounterKind,
    optionId: RegionExpeditionEncounterOption['id'],
    session: RegionExpeditionSession
  ): RegionExpeditionEncounterKind | null => {
    if (kind === 'hazard') return optionId === 'bold' ? 'anomaly' : optionId === 'cautious' ? 'support' : 'traveler'
    if (kind === 'cache') return optionId === 'bold' ? 'hazard' : optionId === 'cautious' ? 'traveler' : 'support'
    if (kind === 'traveler') return optionId === 'bold' ? 'cache' : 'support'
    if (kind === 'support') return optionId === 'bold' ? 'cache' : session.mode === 'boss' ? 'boss_prep' : null
    if (kind === 'anomaly') return optionId === 'cautious' ? 'support' : optionId === 'balanced' ? 'hazard' : 'anomaly'
    if (kind === 'boss_prep') return optionId === 'bold' ? 'anomaly' : optionId === 'cautious' ? 'support' : null
    return optionId === 'bold' ? 'hazard' : optionId === 'balanced' ? 'traveler' : 'support'
  }

  const createNodeRecord = (
    step: number,
    lane: RegionExpeditionNodeLane,
    label: string,
    summary: string
  ): RegionExpeditionNodeRecord => ({
    id: createSessionToken(),
    step,
    lane,
    label,
    summary
  })

  const createCampNightHint = (session: RegionExpeditionSession) => {
    if (session.regionId === 'ancient_road') {
      return '夜里能听到旧驿铃声和车辙回响，适合整理补给并尽早把回撤线标清。'
    }
    if (session.regionId === 'mirage_marsh') {
      return '潮声和泽雾会在夜里放大动静，先稳住样本、再决定要不要继续深探更安全。'
    }
    return '高地夜风会暴露营火位置，先标清巡路点和撤退坡口，明早推进会更稳。'
  }

  const createCampState = (session: RegionExpeditionSession) => ({
    enteredAtStep: session.progressStep,
    nightEventHint: createCampNightHint(session),
    availableActionIds: ['rest', 'sort', 'mark', 'scout'] satisfies RegionCampActionId[]
  })

  const buildExpeditionNodeChoices = (session: RegionExpeditionSession): RegionExpeditionNodeChoice[] => {
    if (session.status !== 'ongoing' || session.pendingEncounter || session.campState) return []

    if (session.mode === 'boss') {
      const boss = getRegionBossDef(session.regionId)
      const phase = boss?.phases[Math.min(session.progressStep, Math.max(0, (boss?.phases.length ?? 1) - 1))]
      const phaseLabel = phase?.label ?? '决战前线'
      return [
        {
          id: 'boss-main',
          lane: 'boss',
          label: `正面压向「${phaseLabel}」`,
          summary: phase?.summary ? `${phase.summary} 更快逼近决战，但前线压力也会显著上升。` : '正面逼近首领区域，换取更快收束节奏。',
          risk: 'high'
        },
        {
          id: 'boss-branch',
          lane: 'branch',
          label: `绕向「${phaseLabel}」侧翼`,
          summary: '先用侧翼观察、布置与试探换更高视野，再决定是否继续强推。',
          risk: 'medium'
        }
      ]
    }

    const route = session.routeId ? REGION_ROUTE_DEFS.find(entry => entry.id === session.routeId) ?? null : null
    if (!route) return []
    const linkedLabels = getLinkedSystemLabels(route.linkedSystems).slice(0, 2).join(' / ') || '后续承接'
    const isFinalStep = session.progressStep + 1 >= session.totalSteps
    const mainLabel = isFinalStep ? `压向「${route.name}」收束点` : session.progressStep === 0 ? `切入「${route.name}」正线` : `继续「${route.name}」正线`
    const branchLabel =
      route.nodeType === 'handoff'
        ? `转入「${route.name}」承接岔口`
        : route.nodeType === 'elite'
          ? `探查「${route.name}」危险侧坡`
          : `转向「${route.name}」侧路观察`

    return [
      {
        id: 'route-main',
        lane: route.nodeType === 'elite' ? 'deep' : 'main',
        label: mainLabel,
        summary: isFinalStep ? '继续压向最终收束节点，把这一趟远征尽快推到可回城状态。' : '沿主线推进，更容易稳定熟悉度和正线进度。',
        risk: route.nodeType === 'elite' ? 'high' : 'medium'
      },
      {
        id: 'route-branch',
        lane: 'branch',
        label: branchLabel,
        summary:
          route.nodeType === 'handoff'
            ? `偏向 ${linkedLabels} 的承接线索，更容易把这趟收获转成回城后的下游动作。`
            : `绕去侧岔观察、补给或临时据点，换更高视野与更多线索。`,
        risk: route.nodeType === 'elite' ? 'medium' : 'low'
      }
    ]
  }

  const resolveExpeditionNodeChoice = (session: RegionExpeditionSession, choiceId?: string) => {
    const choices = buildExpeditionNodeChoices(session)
    if (choices.length <= 0) return null
    return choices.find(choice => choice.id === choiceId) ?? choices[0] ?? null
  }

  const completeRouteAndGrantRewards = (routeId: string, dayTag = '') => {
    const inventoryStore = useInventoryStore()
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return null
    if (!getRouteUnlockStatus(routeId).unlocked) return null
    const rewardAmount = resourceFeatureEnabled.value ? getRouteRewardAmount(route.id) : 0
    markRouteCompleted(route.id, dayTag)
    addFamilyResources(route.primaryResourceFamilyId, rewardAmount)
    const rewardItems = ROUTE_ITEM_REWARDS[route.id] ?? []
    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
    }
    return {
      routeId: route.id,
      regionId: route.regionId,
      familyId: route.primaryResourceFamilyId,
      rewardAmount,
      rewardItems
    }
  }

  const cloneSession = (session: RegionExpeditionSession): RegionExpeditionSession => ({
    ...session,
    supplies: { ...session.supplies },
    carryItems: session.carryItems.map(item => ({ ...item })),
    pendingRewardItems: session.pendingRewardItems.map(item => ({ ...item })),
    pendingEncounter: cloneEncounter(session.pendingEncounter),
    riskState: { ...session.riskState },
    campState: session.campState
      ? {
          enteredAtStep: session.campState.enteredAtStep,
          nightEventHint: session.campState.nightEventHint,
          availableActionIds: [...session.campState.availableActionIds]
        }
      : null,
    encounterMemory: session.encounterMemory.map(entry => ({ ...entry })),
    encounteredEventIds: [...session.encounteredEventIds],
    nodeHistory: session.nodeHistory.map(entry => ({ ...entry })),
    journal: session.journal.map(entry => ({ ...entry, effects: [...entry.effects] }))
  })

  const createWeeklyEventEncounter = (session: RegionExpeditionSession, eventId: string): RegionExpeditionEncounter | null => {
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId && entry.regionId === session.regionId)
    if (!event) return null
    return {
      id: createSessionToken(),
      step: session.progressStep,
      kind: 'weekly_event',
      title: `途中事件：${event.name}`,
      summary: event.description,
      detailLines: [
        event.encounterHint ? `线索：${event.encounterHint}` : '前线斥候带来了新的现场信息。',
        event.handoffHint ? `承接：${event.handoffHint}` : '若处理妥当，可直接转化为区域推进收益。'
      ].filter(Boolean),
      risk: session.danger >= 50 ? 'high' : session.danger >= 28 ? 'medium' : 'low',
      sourceEventId: event.id,
      rewardFamilyId: event.rewardFamilyId,
      rewardAmount: Math.max(1, event.rewardAmount),
      rewardItems: (EVENT_ITEM_REWARDS[event.id] ?? []).map(item => ({ ...item })),
      options: createEncounterOptions('weekly_event')
    }
  }

  const createGenericEncounter = (session: RegionExpeditionSession, forcedKind: RegionExpeditionEncounterKind | null = null): RegionExpeditionEncounter => {
    const lastNodeLane = session.nodeHistory[session.nodeHistory.length - 1]?.lane ?? 'main'
    const lastMemory = session.encounterMemory[session.encounterMemory.length - 1] ?? null
    const kind: RegionExpeditionEncounter['kind'] =
      forcedKind ??
      (session.mode === 'boss' && session.progressStep >= Math.max(1, session.totalSteps - 1)
        ? 'boss_prep'
        : lastNodeLane === 'branch'
          ? session.riskState.anomaly >= 30
            ? 'anomaly'
            : session.approach === 'greedy'
            ? 'cache'
            : 'traveler'
          : lastNodeLane === 'deep'
            ? session.riskState.alertness >= 32 || session.riskState.pollution >= 24
              ? 'anomaly'
              : 'hazard'
          : session.riskState.alertness >= 40 || session.danger >= 45 || session.visibility <= 45
            ? 'hazard'
            : session.riskState.pollution >= 28 || session.riskState.anomaly >= 28
              ? 'anomaly'
              : session.approach === 'greedy'
                ? 'cache'
                : session.progressStep % 2 === 0
                  ? 'support'
                  : 'traveler')

    const encounterConfig: Record<RegionExpeditionEncounter['kind'], { title: string; summary: string; risk: RegionExpeditionEncounter['risk']; detailLines: string[] }> = {
      weekly_event: {
        title: '途中事件',
        summary: '区域局势出现了新的分支。',
        risk: 'medium',
        detailLines: []
      },
      hazard: {
        title: '前线险段',
        summary: '前方路况突然恶化，需要重新评估推进方式。',
        risk: 'high',
        detailLines: ['若强行通过，可能会增加风险与伤害。', '谨慎处理则更容易保住补给与士气。']
      },
      cache: {
        title: '遗落收获',
        summary: '斥候发现了一处可疑补给点或遗落物资堆。',
        risk: 'medium',
        detailLines: ['继续搜刮可能带来额外收获。', '处理不当也可能拖慢节奏，抬高暴露风险。']
      },
      traveler: {
        title: '路途中转',
        summary: '路线上出现了可交互的行脚人、补给痕迹或临时据点。',
        risk: 'low',
        detailLines: ['妥善交涉可能换来视野、补给或额外线索。', '也可以选择不节外生枝，尽快赶路。']
      },
      support: {
        title: '沿线支援',
        summary: '你捕捉到了能真正改善前线状态的支援窗口。',
        risk: 'low',
        detailLines: ['可能是补给组、临时据点或回流系统派来的照应。', '处理得当会直接缓和风险、补足补给或提高首领准备度。']
      },
      anomaly: {
        title: '异变扩散',
        summary: '局势里开始出现更危险的污染、异常回响或警戒波动。',
        risk: 'high',
        detailLines: ['若继续放任，后续推进与首领决战都会受到更明显的拖累。', '也可以借机带回更稀有的异常样本与深层线索。']
      },
      boss_prep: {
        title: '决战前夜',
        summary: '首领区域前的最后准备窗口已经出现，你可以调整最后的进入姿态。',
        risk: 'high',
        detailLines: ['准备充分会改善最终决战状态。', '若急于突入，可能用更高风险换取更高收益。']
      }
    }

    const config = encounterConfig[kind]
    const detailLines = [
      ...(lastMemory ? [`前次留痕：${lastMemory.summary}，这一次局势也受到了影响。`] : []),
      ...(session.frontlinePrep > 0 ? [`前线准备 ${session.frontlinePrep}｜当前节点链已经形成了可延续的前压节奏。`] : []),
      ...(session.riskState.weather !== 'clear' ? [`天气压力：当前为${session.riskState.weather === 'wind' ? '劲风' : session.riskState.weather === 'fog' ? '浓雾' : '风暴'}。`] : []),
      ...(session.riskState.pollution > 0 ? [`污染 ${session.riskState.pollution}/100｜警戒 ${session.riskState.alertness}/100｜异变 ${session.riskState.anomaly}/100。`] : []),
      ...(session.carryItems.length > 0 ? [`携带层：${summarizeCarryItems(session.carryItems)}。`] : []),
      ...config.detailLines
    ].slice(0, 5)
    return {
      id: createSessionToken(),
      step: session.progressStep,
      kind,
      title: config.title,
      summary: config.summary,
      detailLines,
      risk: config.risk,
      sourceEventId: null,
      rewardFamilyId: session.pendingRewardFamilyId,
      rewardAmount: kind === 'cache' ? 2 : kind === 'traveler' ? 1 : kind === 'support' ? 1 : kind === 'anomaly' ? 2 : kind === 'boss_prep' ? 2 : 1,
      rewardItems: [],
      options: createEncounterOptions(kind)
    }
  }

  const createStepEncounter = (session: RegionExpeditionSession): RegionExpeditionEncounter | null => {
    if (session.progressStep <= 0 || session.progressStep >= session.totalSteps) return null

    if (session.queuedEncounterKind) {
      return createGenericEncounter(session, session.queuedEncounterKind)
    }

    const availableWeeklyEventIds = getRegionActiveEventIds(session.regionId).filter(eventId => {
      if (session.encounteredEventIds.includes(eventId)) return false
      const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId && entry.regionId === session.regionId)
      if (!event) return false
      const state = saveData.value.eventStates[event.id]
      const maxWeeklyCompletions = Math.max(1, event.maxWeeklyCompletions ?? 1)
      return (state?.weeklyCompletions ?? 0) < maxWeeklyCompletions
    })

    if (availableWeeklyEventIds.length > 0) {
      const eventIndex = (session.progressStep + session.findings + (session.mode === 'boss' ? 1 : 0)) % availableWeeklyEventIds.length
      return createWeeklyEventEncounter(session, availableWeeklyEventIds[eventIndex] ?? availableWeeklyEventIds[0] ?? '')
    }

    const shouldCreateGenericEncounter =
      session.progressStep === 1 ||
      session.mode === 'boss' ||
      session.approach === 'greedy' ||
      session.danger >= 32 ||
      session.visibility <= 52 ||
      session.riskState.pollution >= 22 ||
      session.riskState.alertness >= 24 ||
      session.riskState.anomaly >= 18

    return shouldCreateGenericEncounter ? createGenericEncounter(session) : null
  }

  const recordEncounteredWeeklyEvent = (eventId: string, dayTag = '') => {
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId)
    if (!event) return false
    const current = saveData.value.eventStates[event.id] ?? {
      eventId: event.id,
      totalCompletions: 0,
      weeklyCompletions: 0,
      lastCompletedDayTag: '',
      lastActivatedWeekId: ''
    }
    saveData.value.eventStates[event.id] = {
      eventId: event.id,
      totalCompletions: current.totalCompletions + 1,
      weeklyCompletions: current.weeklyCompletions + 1,
      lastCompletedDayTag: dayTag,
      lastActivatedWeekId: saveData.value.weeklyEventState.weekId
    }
    return true
  }

  const persistActiveSession = (session: RegionExpeditionSession | null) => {
    if (!session) {
      saveData.value.activeSession = null
      saveData.value.expedition = createClearedExpeditionState()
      return
    }
    saveData.value.activeSession = cloneSession(session)
    startExpedition(session.regionId, session.routeId, session.bossId, session.startedAtDayTag)
  }

  const appendSessionJournal = (
    session: RegionExpeditionSession,
    title: string,
    summary: string,
    effects: string[] = [],
    tone: RegionExpeditionLogEntry['tone'] = 'accent'
  ) => {
    session.journal = [
      ...session.journal,
      {
        id: createSessionToken(),
        step: session.progressStep,
        title,
        summary,
        effects: effects.filter(Boolean),
        tone
      }
    ].slice(-14)
    return session
  }

  const archiveSession = (
    session: RegionExpeditionSession,
    outcome: 'ready_to_settle' | 'victory' | 'retreated' | 'failure',
    endedAtDayTag: string,
    summaryLines: string[]
  ) => {
    const finalOutcome = outcome === 'ready_to_settle' ? 'victory' : outcome
    const entry: RegionExpeditionArchiveEntry = {
      id: session.sessionId,
      regionId: session.regionId,
      mode: session.mode,
      targetName: session.targetName,
      startedAtDayTag: session.startedAtDayTag,
      endedAtDayTag,
      outcome: finalOutcome,
      summaryLines: summaryLines.filter(Boolean).slice(0, 9),
      carryItems: session.carryItems.map(item => ({ ...item })),
      journal: session.journal.map(entry => ({ ...entry, effects: [...entry.effects] })).slice(-12)
    }
    saveData.value.journeyHistory = [entry, ...saveData.value.journeyHistory].slice(0, 12)
  }

  const getSessionStepTimeHours = (session: RegionExpeditionSession) => {
    const route = session.routeId ? REGION_ROUTE_DEFS.find(entry => entry.id === session.routeId) ?? null : null
    const boss = session.bossId ? REGION_BOSS_DEFS.find(entry => entry.id === session.bossId) ?? null : null
    const totalTimeHours = route?.timeCostHours ?? boss?.timeCostHours ?? 0.5
    return Math.max(0.17, Number((totalTimeHours / Math.max(1, session.totalSteps)).toFixed(2)))
  }

  const resolveSessionTargetLabel = (regionId: RegionId, routeId: string | null, bossId: string | null) => {
    if (routeId) return REGION_ROUTE_DEFS.find(entry => entry.id === routeId)?.name ?? routeId
    if (bossId) return REGION_BOSS_DEFS.find(entry => entry.id === bossId)?.name ?? bossId
    return REGION_DEFS.find(entry => entry.id === regionId)?.name ?? regionId
  }

  const createRouteSession = (
    routeId: string,
    startedAtDayTag: string,
    approach: RegionExpeditionApproach,
    retreatRule: RegionExpeditionRetreatRule
  ) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return null
    ensureFrontierWorldSignals(startedAtDayTag)
    const regionKnowledge = getRegionKnowledgeState(route.regionId)
    const routeKnowledge = getRouteKnowledgeState(route.id)
    const shortcutProfile = getRouteShortcutProfile(route.id)
    const campSiteBonus = getCampSiteSessionBonuses(route.regionId, route.id, null)
    const seasonalState = saveData.value.seasonalRegionStates[route.regionId]
    const activeRumors = (saveData.value.rumorBoard.entriesByRegion[route.regionId] ?? []).filter(
      entry => !entry.fulfilled && (!entry.targetRouteId || entry.targetRouteId === route.id)
    )
    const companionContract = getActiveCompanionContract(route.id)
    const supplies = createDefaultRegionExpeditionSupplyState()
    if (approach === 'scout') supplies.utility += 1
    if (approach === 'greedy') supplies.rations = Math.max(1, supplies.rations - 1)
    if (route.nodeType === 'elite') supplies.medicine += 1
    supplies.rations += shortcutProfile.supplyBonus.rations
    supplies.rations += campSiteBonus.supplyBonus.rations
    supplies.medicine += campSiteBonus.supplyBonus.medicine
    supplies.utility += shortcutProfile.supplyBonus.utility
    supplies.utility += campSiteBonus.supplyBonus.utility

    const baseSteps = route.nodeType === 'elite' ? 4 : 3
    const totalSteps = Math.max(2, baseSteps - shortcutProfile.stepReduction)
    const visibilityBonus =
      Math.floor((regionKnowledge.intel + routeKnowledge.intel + routeKnowledge.surveyProgress) / 24) +
      shortcutProfile.visibilityBonus +
      campSiteBonus.visibilityBonus
    const dangerMitigation =
      Math.floor((regionKnowledge.familiarity + routeKnowledge.familiarity) / 30) +
      shortcutProfile.dangerReduction +
      campSiteBonus.dangerReduction
    const moraleBonus = Math.floor(routeKnowledge.familiarity / 25)
    const session: RegionExpeditionSession = {
      sessionId: createSessionToken(),
      mode: 'route',
      regionId: route.regionId,
      routeId: route.id,
      bossId: null,
      targetName: route.name,
      startedAtDayTag,
      approach,
      retreatRule,
      status: 'ongoing',
      progressStep: 0,
      totalSteps,
      carryLoad: 0,
      maxCarryLoad: approach === 'greedy' ? 8 : approach === 'scout' ? 6 : 7,
      carryItems: [],
      visibility: clamp((approach === 'scout' ? 76 : approach === 'greedy' ? 45 : 60) + visibilityBonus, 0, 100),
      morale: clamp((approach === 'greedy' ? 54 : approach === 'scout' ? 60 : 66) + moraleBonus, 0, 100),
      danger: clamp((route.nodeType === 'elite' ? 24 : route.nodeType === 'handoff' ? 14 : 12) - dangerMitigation, 0, 100),
      findings: 0,
      frontlinePrep: (route.nodeType === 'handoff' ? 1 : 0) + campSiteBonus.frontlinePrep,
      riskState: createInitialRiskState(route.regionId, approach),
      campUsed: false,
      supplies,
      pendingRewardFamilyId: route.primaryResourceFamilyId,
      pendingRewardAmount: getRouteRewardAmount(route.id),
      pendingRewardItems: (ROUTE_ITEM_REWARDS[route.id] ?? []).map(item => ({ ...item })),
      pendingEncounter: null,
      queuedEncounterKind: null,
      campState: null,
      encounteredEventIds: [],
      encounterMemory: [],
      nodeHistory: [createNodeRecord(0, 'main', '出发营地', `你从营地踏上「${route.name}」的前线。`)],
      journal: [],
      recommendedRouteId: null
    }
    if (
      seasonalState?.activeVariantId &&
      seasonalState.manualExplorationRequired &&
      seasonalState.affectedRouteIds.includes(route.id)
    ) {
      session.visibility = clamp(session.visibility + 3, 0, 100)
      session.danger = clamp(session.danger + 4, 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + 8, 0, 100)
    }
    if (activeRumors.length > 0) {
      session.findings += activeRumors.length
      session.visibility = clamp(session.visibility + 2, 0, 100)
    }
    if (companionContract) {
      session.danger = clamp(session.danger - companionContract.riskModifier, 0, 100)
      session.morale = clamp(session.morale + companionContract.moraleBonus, 0, 100)
      session.frontlinePrep = clamp(session.frontlinePrep + 1, 0, 100)
    }
    appendSessionJournal(
      session,
      '整装出发',
      `你以${approach === 'scout' ? '侦察' : approach === 'greedy' ? '激进' : '稳扎稳打'}的节奏进入「${route.name}」。`,
      [
        `预设撤退规则：${retreatRule === 'low_hp' ? '低血量撤离' : retreatRule === 'pack_full' ? '满载撤离' : retreatRule === 'after_camp' ? '扎营后收束' : '平衡推进'}`,
        visibilityBonus > 0 || dangerMitigation > 0 ? `既有认知生效：视野 +${visibilityBonus}，初始风险 -${dangerMitigation}。` : '这条路仍较陌生，需要边走边摸清局势。',
        shortcutProfile.level === 'shortcut' || shortcutProfile.level === 'mastered'
          ? `熟路增益：${shortcutProfile.label}，本趟推进段数缩减为 ${totalSteps}。`
          : shortcutProfile.level === 'marked'
            ? '沿途已立下部分路标，推进时更容易维持方向。'
            : '',
        campSiteBonus.headline,
        seasonalState?.activeVariantId && seasonalState.affectedRouteIds.includes(route.id)
          ? `季节变体：${seasonalState.activeVariantLabel}，本周这条线默认要手动确认。`
          : '',
        activeRumors.length > 0 ? `待兑现传闻：${activeRumors.map(entry => entry.title).join(' / ')}` : '',
        companionContract ? `同行合同：${companionContract.npcName} 已挂在这条线。` : ''
      ],
      'accent'
    )
    return session
  }

  const createBossSession = (
    regionId: RegionId,
    startedAtDayTag: string,
    approach: RegionExpeditionApproach,
    retreatRule: RegionExpeditionRetreatRule
  ) => {
    const boss = getRegionBossDef(regionId)
    if (!boss) return null
    const regionKnowledge = getRegionKnowledgeState(regionId)
    const campSiteBonus = getCampSiteSessionBonuses(regionId, null, boss.id)
    const supplies = createDefaultRegionExpeditionSupplyState()
    supplies.medicine += 1
    if (approach === 'scout') supplies.utility += 1
    if (approach === 'greedy') supplies.rations = Math.max(1, supplies.rations - 1)
    supplies.rations += campSiteBonus.supplyBonus.rations
    supplies.medicine += campSiteBonus.supplyBonus.medicine
    supplies.utility += campSiteBonus.supplyBonus.utility

    const visibilityBonus = Math.floor((regionKnowledge.intel + regionKnowledge.survey) / 28) + campSiteBonus.visibilityBonus
    const dangerMitigation = Math.floor(regionKnowledge.familiarity / 22) + campSiteBonus.dangerReduction
    const session: RegionExpeditionSession = {
      sessionId: createSessionToken(),
      mode: 'boss',
      regionId,
      routeId: null,
      bossId: boss.id,
      targetName: boss.name,
      startedAtDayTag,
      approach,
      retreatRule,
      status: 'ongoing',
      progressStep: 0,
      totalSteps: Math.max(3, boss.phases.length + 1),
      carryLoad: 0,
      maxCarryLoad: approach === 'greedy' ? 9 : 7,
      carryItems: [],
      visibility: clamp((approach === 'scout' ? 68 : 52) + visibilityBonus, 0, 100),
      morale: clamp((approach === 'greedy' ? 52 : 64) + Math.floor(regionKnowledge.familiarity / 30), 0, 100),
      danger: clamp(28 - dangerMitigation, 0, 100),
      findings: 1,
      frontlinePrep: Math.floor(regionKnowledge.survey / 25) + campSiteBonus.frontlinePrep,
      riskState: createInitialRiskState(regionId, approach),
      campUsed: false,
      supplies,
      pendingRewardFamilyId: boss.rewardFamilyId,
      pendingRewardAmount: getBossRewardAmount(regionId),
      pendingRewardItems: (BOSS_ITEM_REWARDS[regionId] ?? []).map(item => ({ ...item })),
      pendingEncounter: null,
      queuedEncounterKind: null,
      campState: null,
      encounteredEventIds: [],
      encounterMemory: [],
      nodeHistory: [createNodeRecord(0, 'boss', '前线集结', `你开始逼近「${boss.name}」的外围活动范围。`)],
      journal: [],
      recommendedRouteId: null
    }
    appendSessionJournal(
      session,
      '首领远征就绪',
      `你开始逼近「${boss.name}」的活动范围，准备逐段压缩前线空间。`,
      [
        '已切换为多阶段首领远征，可途中扎营、撤退或收束。',
        visibilityBonus > 0 || dangerMitigation > 0 ? `区域认知提供了额外准备：视野 +${visibilityBonus}，前线压力 -${dangerMitigation}。` : '该区域深层仍缺少足够认知，决战前需要边推进边摸清。',
        campSiteBonus.headline
      ],
      'accent'
    )
    return session
  }

  const startRouteExpeditionSession = (
    routeId: string,
    dayTag = '',
    approach: RegionExpeditionApproach = 'steady',
    retreatRule: RegionExpeditionRetreatRule = 'balanced'
  ) => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { success: false, message: '路线不存在。', title: '无法出发', lines: ['路线不存在。'], tone: 'danger' as const }
    if (shouldBlockRapidRepeatAction(`route:start:${routeId}`)) {
      return { success: false, message: '刚刚已经发起过这条路线，请稍候再试。', title: '无法出发', lines: ['刚刚已经发起过这条路线，请稍候再试。'], tone: 'danger' as const }
    }
    const status = getRouteExpeditionStatus(routeId)
    if (!status.available) {
      return { success: false, message: status.reason, title: '无法出发', lines: [status.reason], tone: 'danger' as const }
    }

    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(route.staminaCost)) {
      return { success: false, message: `体力不足，需要 ${route.staminaCost} 点体力。`, title: '无法出发', lines: [`体力不足，需要 ${route.staminaCost} 点体力。`], tone: 'danger' as const }
    }

    const session = createRouteSession(routeId, dayTag, approach, retreatRule)
    if (!session) {
      playerStore.restoreStamina(route.staminaCost)
      return { success: false, message: '路线远征初始化失败。', title: '无法出发', lines: ['路线远征初始化失败。'], tone: 'danger' as const }
    }

    persistActiveSession(session)
    const regionName = REGION_DEFS.find(region => region.id === route.regionId)?.name ?? route.regionId
    addLog(`【行旅图】已发起 ${regionName}·${route.name} 远征，采用 ${approach} 节奏。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId: route.regionId,
        routeId: route.id,
        approach,
        retreatRule,
        staminaCost: route.staminaCost
      }
    })
    showFloat(`远征出发：${route.name}`, 'accent')

    return {
      success: true,
      message: `已发起 ${regionName}·${route.name} 远征。`,
      title: '远征已出发',
      lines: [
        `目标：${route.name}`,
        `已消耗 ${route.staminaCost} 点体力，进入多阶段推进。`,
        `当前策略：${approach === 'scout' ? '侦察优先' : approach === 'greedy' ? '激进搜刮' : '稳健推进'} / ${retreatRule === 'low_hp' ? '低血量撤离' : retreatRule === 'pack_full' ? '满载撤离' : retreatRule === 'after_camp' ? '扎营后收束' : '平衡推进'}`
      ],
      tone: 'accent' as const
    }
  }

  const startBossExpeditionSession = (
    regionId: RegionId,
    dayTag = '',
    approach: RegionExpeditionApproach = 'steady',
    retreatRule: RegionExpeditionRetreatRule = 'balanced'
  ) => {
    const boss = getRegionBossDef(regionId)
    if (!boss) return { success: false, message: '当前区域首领未配置。', title: '无法出发', lines: ['当前区域首领未配置。'], tone: 'danger' as const }
    if (shouldBlockRapidRepeatAction(`boss:start:${regionId}`)) {
      return { success: false, message: '刚刚已经发起过这场首领远征，请稍候再试。', title: '无法出发', lines: ['刚刚已经发起过这场首领远征，请稍候再试。'], tone: 'danger' as const }
    }
    const status = getBossExpeditionStatus(regionId)
    if (!status.available) {
      return { success: false, message: status.reason, title: '无法出发', lines: [status.reason], tone: 'danger' as const }
    }

    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(boss.staminaCost)) {
      return { success: false, message: `体力不足，需要 ${boss.staminaCost} 点体力。`, title: '无法出发', lines: [`体力不足，需要 ${boss.staminaCost} 点体力。`], tone: 'danger' as const }
    }

    const session = createBossSession(regionId, dayTag, approach, retreatRule)
    if (!session) {
      playerStore.restoreStamina(boss.staminaCost)
      return { success: false, message: '首领远征初始化失败。', title: '无法出发', lines: ['首领远征初始化失败。'], tone: 'danger' as const }
    }

    persistActiveSession(session)
    addLog(`【行旅图】已发起区域首领远征「${boss.name}」，采用 ${approach} 节奏。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId,
        bossId: boss.id,
        approach,
        retreatRule,
        staminaCost: boss.staminaCost
      }
    })
    showFloat(`首领远征：${boss.name}`, 'accent')

    return {
      success: true,
      message: `已发起首领远征「${boss.name}」。`,
      title: '首领远征已出发',
      lines: [
        `目标：${boss.name}`,
        `已消耗 ${boss.staminaCost} 点体力，接下来需逐段推进至决战。`,
        `当前策略：${approach === 'scout' ? '侦察优先' : approach === 'greedy' ? '激进搜刮' : '稳健推进'} / ${retreatRule === 'low_hp' ? '低血量撤离' : retreatRule === 'pack_full' ? '满载撤离' : retreatRule === 'after_camp' ? '扎营后收束' : '平衡推进'}`
      ],
      tone: 'accent' as const
    }
  }

  const advanceActiveExpedition = (choiceId?: string, _dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session) {
      return { success: false, message: '当前没有进行中的远征。', title: '无法推进', lines: ['当前没有进行中的远征。'], tone: 'danger' as const }
    }
    if (session.pendingEncounter) {
      return {
        success: false,
        message: '当前有一个待处理的途中遭遇，请先决定如何应对。',
        title: '无法推进',
        lines: ['当前有一个待处理的途中遭遇，请先决定如何应对。'],
        tone: 'danger' as const
      }
    }
    if (session.campState) {
      return {
        success: false,
        message: '当前正停留在前线营地，请先处理营地动作，再决定是否继续推进。',
        title: '无法推进',
        lines: ['当前正停留在前线营地，请先处理营地动作，再决定是否继续推进。'],
        tone: 'danger' as const
      }
    }
    if (session.status !== 'ongoing') {
      return {
        success: false,
        message: session.status === 'ready_to_settle' ? '远征已经抵达收束阶段，请直接结算。' : '当前远征已脱离进行中状态，请直接收束。',
        title: '无法推进',
        lines: [session.status === 'ready_to_settle' ? '远征已经抵达收束阶段，请直接结算。' : '当前远征已脱离进行中状态，请直接收束。'],
        tone: 'danger' as const
      }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const stepNumber = session.progressStep + 1
    const routeDef = session.routeId ? REGION_ROUTE_DEFS.find(entry => entry.id === session.routeId) ?? null : null
    const choice = resolveExpeditionNodeChoice(session, choiceId)
    if (!choice) {
      return {
        success: false,
        message: '当前没有可推进的节点，请先处理营地、遭遇或直接收束。',
        title: '无法推进',
        lines: ['当前没有可推进的节点，请先处理营地、遭遇或直接收束。'],
        tone: 'danger' as const
      }
    }
    const stepTimeHours = getSessionStepTimeHours(session)
    const timeResult = gameStore.advanceTime(stepTimeHours, { skipSpeedBuff: true })
    const effects: string[] = [`节点抉择：${choice.label}。`, choice.summary]
    const laneVisibilityBonus = choice.lane === 'branch' ? 6 : choice.lane === 'boss' ? 2 : choice.lane === 'deep' ? -2 : 2
    const laneDangerDelta = choice.lane === 'branch' ? 1 : choice.lane === 'boss' ? 6 : choice.lane === 'deep' ? 5 : 3
    const laneFindingsBonus = choice.lane === 'branch' ? 2 : choice.lane === 'boss' ? 2 : choice.lane === 'deep' ? 3 : 1
    const laneCarryBonus = choice.lane === 'deep' || choice.lane === 'boss' ? 2 : 1
    const laneMoraleDelta = choice.lane === 'branch' ? 0 : choice.lane === 'boss' ? 1 : choice.lane === 'deep' ? -1 : 1
    const carryItemsForNode: RegionExpeditionCarryItem[] = []

    if (stepNumber % 2 === 1) {
      if (session.supplies.rations > 0) {
        session.supplies.rations -= 1
        session.morale = clamp(session.morale + 6, 0, 100)
        effects.push('消耗 1 份口粮，士气回稳。')
      } else {
        session.morale = clamp(session.morale - 6, 0, 100)
        session.danger = clamp(session.danger + 3, 0, 100)
        effects.push('口粮见底，队伍开始焦躁。')
      }
    }

    if (session.approach === 'scout' && session.supplies.utility > 0 && stepNumber === 1) {
      session.supplies.utility -= 1
      session.visibility = clamp(session.visibility + 12, 0, 100)
      effects.push('使用 1 份器具进行侦察，视野提升。')
    }

    const baseDamage = session.mode === 'boss' ? 8 + stepNumber * 3 : 4 + stepNumber * 2
    let damage = baseDamage + Math.floor(session.danger / 24)
    if (session.approach === 'scout') damage = Math.max(1, damage - 2)
    if (session.approach === 'greedy') damage += 2
    if (choice.lane === 'branch') damage = Math.max(1, damage - 1)
    if (choice.lane === 'deep' || choice.lane === 'boss') damage += 2
    if (session.riskState.weather === 'storm') damage += 2
    if (session.riskState.weather === 'fog') session.visibility = clamp(session.visibility - 4, 0, 100)

    if (session.supplies.medicine > 0 && playerStore.hp <= Math.max(18, Math.floor(playerStore.getMaxHp() * 0.4))) {
      session.supplies.medicine -= 1
      const recoverAmount = 10 + stepNumber * 2
      playerStore.restoreHealth(recoverAmount)
      effects.push(`消耗 1 份药剂，回复 ${recoverAmount} 点生命。`)
    }

    const actualDamage = playerStore.takeDamage(damage)
    if (actualDamage > 0) {
      effects.push(`途中承受 ${actualDamage} 点伤害。`)
    }

    session.progressStep = stepNumber
    session.nodeHistory = [...session.nodeHistory, createNodeRecord(stepNumber, choice.lane, choice.label, choice.summary)].slice(-12)
    session.visibility = clamp(session.visibility + (session.approach === 'scout' ? 6 : session.approach === 'greedy' ? -3 : 2) + laneVisibilityBonus, 0, 100)
    session.morale = clamp(session.morale + (session.approach === 'greedy' ? -2 : 1) + laneMoraleDelta, 0, 100)
    session.danger = clamp(
      session.danger + (session.mode === 'boss' ? 10 : routeDef?.nodeType === 'elite' ? 8 : 6) + (session.approach === 'greedy' ? 3 : 0) + laneDangerDelta,
      0,
      100
    )
    session.findings += (session.approach === 'greedy' ? 3 : session.approach === 'scout' ? 2 : 2) + laneFindingsBonus
    session.frontlinePrep += (choice.lane === 'branch' ? 2 : choice.lane === 'boss' ? 3 : choice.lane === 'deep' ? 2 : 1) + (session.approach === 'scout' ? 1 : 0)
    session.riskState.weather =
      session.regionId === 'mirage_marsh'
        ? (stepNumber % 3 === 0 ? 'storm' : stepNumber % 2 === 0 ? 'fog' : 'wind')
        : session.regionId === 'cloud_highland'
          ? (stepNumber % 2 === 0 ? 'wind' : 'storm')
          : (stepNumber % 3 === 0 ? 'wind' : 'clear')
    session.riskState.pollution = clamp(
      session.riskState.pollution + (session.regionId === 'mirage_marsh' ? 4 : 1) + (choice.lane === 'deep' ? 3 : choice.lane === 'branch' ? 1 : 0),
      0,
      100
    )
    session.riskState.alertness = clamp(
      session.riskState.alertness + (choice.lane === 'boss' ? 10 : choice.lane === 'deep' ? 7 : choice.lane === 'branch' ? 3 : 5),
      0,
      100
    )
    session.riskState.anomaly = clamp(
      session.riskState.anomaly + (session.regionId === 'mirage_marsh' ? 5 : session.regionId === 'cloud_highland' ? 2 : 1) + (choice.lane === 'boss' ? 4 : choice.lane === 'deep' ? 3 : 0),
      0,
      100
    )
    if (choice.lane === 'branch') {
      carryItemsForNode.push(createCarryItem(`${getResourceFamilyLabel(session.pendingRewardFamilyId)}线索包`, 'clue', 1, laneCarryBonus, '侧探节点带回的可承接线索。'))
    } else if (choice.lane === 'deep' || choice.lane === 'boss') {
      carryItemsForNode.push(createCarryItem(`${getResourceFamilyLabel(session.pendingRewardFamilyId)}粗样`, 'resource', 1, laneCarryBonus, '深层节点回收的高压收获。'))
    } else {
      carryItemsForNode.push(createCarryItem(`${getResourceFamilyLabel(session.pendingRewardFamilyId)}回收物`, 'resource', 1, laneCarryBonus, '正线推进中收稳的常规收获。'))
    }
    addCarryItems(session, carryItemsForNode)
    effects.push(`局势变量：前线准备 ${session.frontlinePrep}｜天气 ${session.riskState.weather} / 污染 ${session.riskState.pollution} / 警戒 ${session.riskState.alertness} / 异变 ${session.riskState.anomaly}。`)
    effects.push(`携带层：${summarizeCarryItems(carryItemsForNode)}｜当前总负重 ${session.carryLoad}/${session.maxCarryLoad}。`)
    if (session.routeId) {
      syncRouteMapNodeState(session.routeId, _dayTag, 1, choice.lane === 'branch' || choice.lane === 'deep' ? 1 : 0)
      syncShortcutState(session.routeId, _dayTag, choice.lane === 'branch' ? 1 : 0)
    } else {
      syncBossMapNodeState(session.regionId, _dayTag, 1, choice.lane === 'branch' ? 1 : 0)
    }
    const regionKnowledge = addRegionKnowledge(
      session.regionId,
      {
        intel: (session.approach === 'scout' ? 5 : session.approach === 'greedy' ? 2 : 3) + (choice.lane === 'branch' ? 2 : 0),
        survey: (session.mode === 'boss' ? 2 : 3) + (choice.lane === 'branch' ? 1 : choice.lane === 'deep' || choice.lane === 'boss' ? 2 : 0),
        familiarity: (session.mode === 'boss' ? 1 : 2) + (choice.lane === 'main' ? 1 : 0)
      },
      _dayTag
    )
    effects.push(`区域认知提升：情报 ${regionKnowledge.intel}/100，勘明 ${regionKnowledge.survey}/100。`)
    if (session.routeId) {
      const routeKnowledge = addRouteKnowledge(
        session.routeId,
        {
          intel: (routeDef?.nodeType === 'elite' ? 5 : 4) + (choice.lane === 'branch' ? 2 : 0),
          surveyProgress: (routeDef?.nodeType === 'handoff' ? 3 : 5) + (choice.lane === 'branch' ? 3 : 0),
          familiarity: (stepNumber >= session.totalSteps ? 8 : 4) + (choice.lane === 'main' || choice.lane === 'deep' ? 2 : 0)
        },
        _dayTag
      )
      effects.push(`路线熟悉度提升：勘明 ${routeKnowledge.surveyProgress}/100，熟悉 ${routeKnowledge.familiarity}/100。`)
    }

    let summary = `你选择了「${choice.label}」，并把远征推进到第 ${stepNumber}/${session.totalSteps} 个节点。`
    let tone: RegionExpeditionLogEntry['tone'] = 'accent'

    if (session.mode === 'boss' && stepNumber >= session.totalSteps) {
      const boss = getRegionBossDef(session.regionId)
      if (boss) {
        const combatResult = simulateBossExpedition(session.regionId, boss, session)
        const hpDelta = Math.max(0, playerStore.hp - Math.max(0, combatResult.projectedHp))
        if (hpDelta > 0) {
          playerStore.takeDamage(hpDelta)
          effects.push(`决战阶段额外损失 ${hpDelta} 点生命。`)
        }
        effects.push(combatResult.supportSummary)
        effects.push(...combatResult.phaseLines.slice(0, 2))
        if (combatResult.success) {
          session.status = 'ready_to_settle'
          session.pendingRewardAmount += Math.max(1, Math.floor(session.findings / 3))
          summary = `你已压制 ${boss.name}，可以回城收束这趟首领远征。`
          tone = 'success'
        } else {
          session.status = 'failure'
          session.recommendedRouteId = combatResult.recommendedRouteId ?? getRecommendedRecoveryRoute(session.regionId)?.id ?? null
          summary = `你在 ${boss.name} 面前被迫后撤，这趟远征转入失败收束。`
          tone = 'danger'
        }
      }
    } else if (session.progressStep >= session.totalSteps) {
      session.status = 'ready_to_settle'
      session.pendingRewardAmount += Math.max(1, Math.floor(session.findings / 2))
      summary = `你已走完整条节点链，完成 ${session.targetName} 的前线推进，可以回城清点战利品。`
      tone = 'success'
    }

    if (session.status === 'ongoing' && session.carryLoad >= session.maxCarryLoad) {
      session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
      effects.push('负重已接近上限。')
      if (session.retreatRule === 'pack_full') {
        session.status = 'retreated'
        summary = '按照预设的满载撤离规则，你决定带着现有收获撤回营地。'
        tone = 'accent'
      }
    }

    if (session.status === 'ongoing' && playerStore.hp <= Math.max(12, Math.floor(playerStore.getMaxHp() * 0.2))) {
      effects.push('当前生命值已经非常危险。')
      if (session.retreatRule === 'low_hp') {
        session.status = 'retreated'
        session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
        summary = '队伍生命线过低，已按预设规则自动撤离。'
        tone = 'accent'
      }
    }

    if (playerStore.hp <= 0) {
      session.status = 'failure'
      session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
      summary = '队伍在途中彻底失去战线，被迫带着残余记录撤出。'
      tone = 'danger'
    }

    if (session.status === 'ongoing') {
      const encounter = createStepEncounter(session)
      if (encounter) {
        session.pendingEncounter = encounter
        if (session.queuedEncounterKind === encounter.kind) {
          session.queuedEncounterKind = null
        }
        effects.push(`途中出现了新的遭遇：${encounter.title}。`)
      }
    }

    appendSessionJournal(session, choice.label, summary, effects, tone)
    persistActiveSession(session)
    showFloat(session.status === 'failure' ? '远征失利' : session.status === 'ready_to_settle' ? '远征收束' : '远征推进', tone)

    return {
      success: true,
      message: `${summary}${timeResult.message ? ` ${timeResult.message}` : ''}`.trim(),
      title: session.status === 'failure' ? '远征失利' : session.status === 'ready_to_settle' ? '远征可收束' : '远征推进',
      lines: [
        `目标：${session.targetName}`,
        `当前节点：${choice.label}`,
        `进度：${session.progressStep}/${session.totalSteps}｜负重 ${session.carryLoad}/${session.maxCarryLoad}｜发现 ${session.findings}`,
        `生命 ${playerStore.hp}/${playerStore.getMaxHp()}｜士气 ${session.morale}｜风险 ${session.danger}｜视野 ${session.visibility}`,
        session.pendingEncounter ? `遭遇：${session.pendingEncounter.title}` : '',
        ...effects
      ].filter(Boolean),
      tone: tone === 'danger' ? ('danger' as const) : tone === 'success' ? ('success' as const) : ('accent' as const)
    }
  }

  const campActiveExpedition = (_dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session) {
      return { success: false, message: '当前没有进行中的远征。', title: '无法扎营', lines: ['当前没有进行中的远征。'], tone: 'danger' as const }
    }
    if (session.status !== 'ongoing') {
      return { success: false, message: '当前远征已不在可扎营阶段。', title: '无法扎营', lines: ['当前远征已不在可扎营阶段。'], tone: 'danger' as const }
    }
    if (session.campUsed) {
      return { success: false, message: '本次远征已经扎营过一次。', title: '无法扎营', lines: ['本次远征已经扎营过一次。'], tone: 'danger' as const }
    }
    if (session.progressStep <= 0) {
      return { success: false, message: '至少先推进一段，再决定是否扎营。', title: '无法扎营', lines: ['至少先推进一段，再决定是否扎营。'], tone: 'danger' as const }
    }
    if (session.pendingEncounter) {
      return { success: false, message: '当前有一个待处理遭遇，请先决定如何应对。', title: '无法扎营', lines: ['当前有一个待处理遭遇，请先决定如何应对。'], tone: 'danger' as const }
    }

    if (session.campState) {
      return { success: false, message: '前线营地已经搭起，请先处理营地动作。', title: '无法扎营', lines: ['前线营地已经搭起，请先处理营地动作。'], tone: 'danger' as const }
    }

    const gameStore = useGameStore()
    const timeResult = gameStore.advanceTime(0.17, { skipSpeedBuff: true })
    session.campUsed = true
    session.campState = createCampState(session)
    session.nodeHistory = [...session.nodeHistory, createNodeRecord(session.progressStep, 'camp', '前线营地', session.campState.nightEventHint)].slice(-12)
    session.morale = clamp(session.morale + 4, 0, 100)
    session.danger = clamp(session.danger - 4, 0, 100)
    const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 1, survey: 3, familiarity: 1 }, _dayTag)
    const campSiteState = recordCampSiteUsage(session.regionId, session.routeId, session.bossId, 'enter', _dayTag)
    const effects = [
      session.campState.nightEventHint,
      `营地搭起后，区域勘明推进到 ${regionKnowledge.survey}/100。`,
      `营地档案：已记录 ${campSiteState.visitCount} 次前线停留。`,
      '现在可以选择：休整伤势、整理补给、标记路线，或派出观察侦察。'
    ]
    appendSessionJournal(session, '前线扎营', `你在 ${session.targetName} 的途中搭起了一处前线营地。`, effects, 'accent')

    persistActiveSession(session)
    showFloat('前线营地', 'accent')
    return {
      success: true,
      message: `已搭起前线营地。${timeResult.message ? ` ${timeResult.message}` : ''}`.trim(),
      title: '前线营地已建立',
      lines: [
        `目标：${session.targetName}`,
        `士气 ${session.morale}｜风险 ${session.danger}｜视野 ${session.visibility}`,
        ...effects,
      ].filter(Boolean),
      tone: 'accent' as const
    }
  }

  const resolveCampAction = (actionId: RegionCampActionId, _dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session || !session.campState) {
      return { success: false, message: '当前没有待处理的前线营地。', title: '无法处理营地', lines: ['当前没有待处理的前线营地。'], tone: 'danger' as const }
    }
    if (session.status !== 'ongoing') {
      return { success: false, message: '当前远征已不在可处理营地阶段。', title: '无法处理营地', lines: ['当前远征已不在可处理营地阶段。'], tone: 'danger' as const }
    }
    if (!session.campState.availableActionIds.includes(actionId)) {
      return { success: false, message: '该营地动作当前不可用。', title: '无法处理营地', lines: ['该营地动作当前不可用。'], tone: 'danger' as const }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const timeResult = gameStore.advanceTime(0.17, { skipSpeedBuff: true })
    const effects: string[] = [session.campState.nightEventHint]
    let summary = '你处理了一次前线营地动作。'
    let tone: RegionExpeditionLogEntry['tone'] = 'accent'

    if (actionId === 'rest') {
      let recoverAmount = 8
      if (session.supplies.rations > 0) {
        session.supplies.rations -= 1
        recoverAmount += 6
        effects.push('消耗 1 份口粮，队伍在营火边稳住了状态。')
      }
      if (session.supplies.medicine > 0) {
        session.supplies.medicine -= 1
        recoverAmount += 8
        effects.push('消耗 1 份药剂修整伤势。')
      }
      playerStore.restoreHealth(recoverAmount)
      session.morale = clamp(session.morale + 10, 0, 100)
      session.danger = clamp(session.danger - 6, 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness - 6, 0, 100)
      const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 1, survey: 1, familiarity: 2 }, _dayTag)
      effects.push(`营地休整后，区域熟悉度进一步沉淀到 ${regionKnowledge.familiarity}/100。`)
      summary = `你让队伍在营地里完成了一轮休整，恢复 ${recoverAmount} 点生命。`
      tone = 'success'
    } else if (actionId === 'sort') {
      const carryLoadBeforeSort = session.carryLoad
      if (session.supplies.utility > 0) {
        session.supplies.utility -= 1
        effects.push('消耗 1 份器具，把散乱物资重新装进可继续携带的状态。')
      }
      session.carryItems = session.carryItems.map(item =>
        item.category === 'resource' && item.burden > 1
          ? { ...item, category: 'refined', burden: Math.max(1, item.burden - 1), note: `${item.note} 已在营地中压缩整理。` }
          : item
      )
      recalculateCarryLoad(session)
      const carryReduction = Math.max(0, carryLoadBeforeSort - session.carryLoad)
      session.findings += 1
      session.frontlinePrep += 1
      session.morale = clamp(session.morale + 5, 0, 100)
      const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 2, survey: 1, familiarity: 1 }, _dayTag)
      effects.push(`整理后腾出了 ${carryReduction} 格负重空间，区域情报也推进到 ${regionKnowledge.intel}/100。`)
      summary = '你在营地里重新整理补给与收获，把负重压力暂时压了下去。'
      tone = 'success'
    } else if (actionId === 'mark') {
      if (session.supplies.utility > 0) {
        session.supplies.utility -= 1
        session.visibility = clamp(session.visibility + 6, 0, 100)
        effects.push('消耗 1 份器具，把回撤线、路标和观察点都重新标清。')
      }
      session.danger = clamp(session.danger - 8, 0, 100)
      session.frontlinePrep += 2
      session.riskState.alertness = clamp(session.riskState.alertness - 5, 0, 100)
      const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 1, survey: 4, familiarity: 2 }, _dayTag)
      effects.push(`区域勘明推进到 ${regionKnowledge.survey}/100。`)
      if (session.routeId) {
        const routeKnowledge = addRouteKnowledge(session.routeId, { intel: 1, surveyProgress: 8, familiarity: 4 }, _dayTag)
        effects.push(`路线标记更新：勘明 ${routeKnowledge.surveyProgress}/100，熟悉 ${routeKnowledge.familiarity}/100。`)
      }
      summary = '你在营地周围重新标定了路线、坡口和回撤点，后续推进会更稳。'
      tone = 'success'
    } else {
      if (session.supplies.utility > 0) {
        session.supplies.utility -= 1
        effects.push('消耗 1 份器具派出夜间观察，换回了更清晰的前线轮廓。')
      }
      session.visibility = clamp(session.visibility + 12, 0, 100)
      session.danger = clamp(session.danger + 1, 0, 100)
      session.frontlinePrep += 3
      session.riskState.pollution = clamp(session.riskState.pollution - 2, 0, 100)
      session.riskState.anomaly = clamp(session.riskState.anomaly - 1, 0, 100)
      const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 5, survey: 2, familiarity: 1 }, _dayTag)
      effects.push(`夜间观察推进了区域情报：${regionKnowledge.intel}/100。`)
      if (session.routeId) {
        const routeKnowledge = addRouteKnowledge(session.routeId, { intel: 4, surveyProgress: 3, familiarity: 1 }, _dayTag)
        effects.push(`路线观察补足：情报 ${routeKnowledge.intel}/100，勘明 ${routeKnowledge.surveyProgress}/100。`)
      }
      summary = '你让斥候在营地周边做了一轮夜间观察，把下一段节点看得更清楚。'
    }

    session.campState = null
    const persistentCampState = recordCampSiteUsage(session.regionId, session.routeId, session.bossId, actionId, _dayTag)
    effects.push(`局势回看：前线准备 ${session.frontlinePrep}｜天气 ${session.riskState.weather} / 污染 ${session.riskState.pollution} / 警戒 ${session.riskState.alertness} / 异变 ${session.riskState.anomaly}。`)
    effects.push(session.carryItems.length > 0 ? `携带层现状：${summarizeCarryItems(session.carryItems)}。` : '携带层现状：当前没有额外携带物。')
    effects.push(`营地档案：休整 ${persistentCampState.restCount} / 整理 ${persistentCampState.sortCount} / 标记 ${persistentCampState.markCount} / 侦察 ${persistentCampState.scoutCount}。`)
    appendSessionJournal(session, `营地动作：${actionId === 'rest' ? '休整伤势' : actionId === 'sort' ? '整理补给' : actionId === 'mark' ? '标记路线' : '观察侦察'}`, summary, effects, tone)

    if (session.retreatRule === 'after_camp') {
      session.status = 'retreated'
      session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
      appendSessionJournal(session, '扎营后收束', '按照预设撤退规则，队伍决定带着现有记录回城。', [], 'accent')
    }

    persistActiveSession(session)
    showFloat('营地动作完成', tone)
    return {
      success: true,
      message: `${summary}${timeResult.message ? ` ${timeResult.message}` : ''}`.trim(),
      title: '营地动作完成',
      lines: [
        `目标：${session.targetName}`,
        `生命 ${playerStore.hp}/${playerStore.getMaxHp()}｜士气 ${session.morale}｜风险 ${session.danger}｜视野 ${session.visibility}`,
        ...effects,
        session.retreatRule === 'after_camp' ? '已按预设规则切换为回撤收束。' : ''
      ].filter(Boolean),
      tone: tone === 'success' ? ('success' as const) : ('accent' as const)
    }
  }

  const retreatActiveExpedition = (_dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session) {
      return { success: false, message: '当前没有进行中的远征。', title: '无法撤退', lines: ['当前没有进行中的远征。'], tone: 'danger' as const }
    }
    if (session.status !== 'ongoing') {
      return { success: false, message: '当前远征已不在可撤退阶段。', title: '无法撤退', lines: ['当前远征已不在可撤退阶段。'], tone: 'danger' as const }
    }
    session.status = 'retreated'
    session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
    if (session.pendingEncounter) {
      appendSessionJournal(session, '放弃处理中遭遇', `你放弃了「${session.pendingEncounter.title}」的后续处理，决定立即返程。`, ['该遭遇不会再在本次远征中继续展开。'], 'accent')
      session.pendingEncounter = null
    }
    if (session.campState) {
      appendSessionJournal(session, '拔营返程', '你收起了前线营地，决定把这次观察和收获直接带回去。', [session.campState.nightEventHint], 'accent')
      session.campState = null
    }
    appendSessionJournal(session, '主动撤退', `你决定从「${session.targetName}」提前撤离，保留已记录的线索。`, ['本次将按部分收益收束。'], 'accent')
    persistActiveSession(session)
    showFloat('远征撤退', 'accent')
    return {
      success: true,
      message: '已将当前远征切换为撤退收束。',
      title: '已撤退',
      lines: ['你可以立即结算当前远征，按部分收益带回记录与战利品。'],
      tone: 'accent' as const
    }
  }

  const resolveActiveEncounter = (optionId: RegionExpeditionEncounterOption['id'], dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session || !session.pendingEncounter) {
      return { success: false, message: '当前没有待处理的途中遭遇。', title: '无法处理遭遇', lines: ['当前没有待处理的途中遭遇。'], tone: 'danger' as const }
    }
    if (session.status !== 'ongoing') {
      return { success: false, message: '当前远征已不处于可处理遭遇的推进阶段。', title: '无法处理遭遇', lines: ['当前远征已不处于可处理遭遇的推进阶段。'], tone: 'danger' as const }
    }

    const encounter = cloneEncounter(session.pendingEncounter)
    if (!encounter) {
      return { success: false, message: '途中遭遇状态异常。', title: '无法处理遭遇', lines: ['途中遭遇状态异常。'], tone: 'danger' as const }
    }

    const playerStore = usePlayerStore()
    const effects: string[] = []
    const carryItemsFromEncounter: RegionExpeditionCarryItem[] = []
    let tone: RegionExpeditionLogEntry['tone'] = optionId === 'bold' ? 'danger' : optionId === 'balanced' ? 'success' : 'accent'
    let summary = `你处理了「${encounter.title}」。`
    const rewardMultiplier = optionId === 'cautious' ? 0.7 : optionId === 'bold' ? 1.5 : 1

    if (encounter.kind === 'hazard') {
      session.danger = clamp(session.danger + (optionId === 'bold' ? 8 : optionId === 'balanced' ? 2 : -6), 0, 100)
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 4 : optionId === 'bold' ? -4 : 0), 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 8 : optionId === 'balanced' ? 3 : -4), 0, 100)
      session.riskState.anomaly = clamp(session.riskState.anomaly + (optionId === 'bold' ? 3 : optionId === 'balanced' ? 1 : -1), 0, 100)
      const damage = optionId === 'bold' ? 7 : optionId === 'balanced' ? 4 : 1
      const actualDamage = playerStore.takeDamage(damage)
      if (actualDamage > 0) effects.push(`额外承受 ${actualDamage} 点伤害。`)
      if (optionId === 'cautious') effects.push('你压住了前线暴露，风险明显下降。')
      if (optionId === 'bold') effects.push('你强行闯过险段，队伍暴露大幅提升。')
    } else if (encounter.kind === 'cache') {
      session.findings += optionId === 'bold' ? 2 : 1
      session.morale = clamp(session.morale + (optionId === 'cautious' ? 1 : optionId === 'balanced' ? 2 : 3), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 5 : 1), 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 6 : optionId === 'balanced' ? 2 : -1), 0, 100)
      carryItemsFromEncounter.push(
        createCarryItem(
          optionId === 'bold' ? `${getResourceFamilyLabel(session.pendingRewardFamilyId)}重装收获` : `${getResourceFamilyLabel(session.pendingRewardFamilyId)}沿途回收物`,
          optionId === 'cautious' ? 'refined' : 'resource',
          optionId === 'bold' ? 2 : 1,
          optionId === 'bold' ? 2 : 1,
          optionId === 'bold' ? '翻查得更深，带回了一批更占负重的收获。' : '沿路整收下来的可回城处理物资。'
        )
      )
      effects.push(optionId === 'bold' ? '你让队伍深入翻查，额外榨出了一批沿途收获。' : '你收稳了可见物资，继续保持推进节奏。')
    } else if (encounter.kind === 'traveler') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 6 : optionId === 'balanced' ? 4 : 2), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 3 : 2), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 3 : -2), 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 2 : -3), 0, 100)
      carryItemsFromEncounter.push(
        createCarryItem(
          optionId === 'cautious' ? '旅者路书' : '途中传闻',
          'clue',
          1,
          1,
          optionId === 'cautious' ? '用补给换来的可靠路书。' : '从旅者和沿线痕迹中整理出的线索。'
        )
      )
      if (optionId === 'cautious' && session.supplies.rations > 0) {
        session.supplies.rations -= 1
        effects.push('你分出 1 份口粮换取了更清晰的前路线索。')
      } else {
        effects.push('你从路上痕迹中整理出一批可用情报。')
      }
    } else if (encounter.kind === 'support') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 4 : optionId === 'balanced' ? 2 : 1), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 4 : optionId === 'balanced' ? 3 : 2), 0, 100)
      session.danger = clamp(session.danger - (optionId === 'cautious' ? 5 : optionId === 'balanced' ? 3 : 1), 0, 100)
      session.frontlinePrep += optionId === 'bold' ? 4 : optionId === 'balanced' ? 3 : 2
      session.riskState.alertness = clamp(session.riskState.alertness - (optionId === 'bold' ? 2 : 4), 0, 100)
      if (optionId !== 'bold') {
        session.supplies.rations += 1
        effects.push('沿线支援补回了 1 份口粮。')
      }
      carryItemsFromEncounter.push(
        createCarryItem(
          optionId === 'bold' ? '支援前压包' : '沿线补给箱',
          'supply',
          1,
          1,
          optionId === 'bold' ? '把支援直接转成下一段推进用的前压配置。' : '支援队临时补给给前线留下的可用储备。'
        )
      )
      effects.push(optionId === 'bold' ? '你借着支援窗口继续前压，把补给直接转成了推进势能。' : '你把支援稳稳接住，前线状态明显改善。')
    } else if (encounter.kind === 'anomaly') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 1 : optionId === 'balanced' ? 0 : -2), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 6 : optionId === 'balanced' ? 2 : -1), 0, 100)
      session.findings += optionId === 'bold' ? 2 : 1
      session.riskState.pollution = clamp(session.riskState.pollution + (optionId === 'bold' ? 8 : optionId === 'balanced' ? 3 : -5), 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 5 : optionId === 'balanced' ? 2 : -2), 0, 100)
      session.riskState.anomaly = clamp(session.riskState.anomaly + (optionId === 'bold' ? 9 : optionId === 'balanced' ? 4 : -6), 0, 100)
      carryItemsFromEncounter.push(
        createCarryItem(
          optionId === 'cautious' ? '异变观测笔记' : '异常样本',
          optionId === 'cautious' ? 'clue' : 'resource',
          1,
          optionId === 'bold' ? 2 : 1,
          optionId === 'cautious' ? '压制异变时留下的可复盘记录。' : '从异常现场强行带回的高压样本。'
        )
      )
      effects.push(optionId === 'cautious' ? '你优先压住了异常扩散，把问题控制在可处理范围内。' : optionId === 'balanced' ? '你边测量边前推，保住了样本也没有完全失控。' : '你强行深入异变核心，虽然带回了样本，但后遗压也更高。')
    } else if (encounter.kind === 'boss_prep') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 4 : optionId === 'balanced' ? 2 : 0), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 4 : optionId === 'balanced' ? 2 : 1), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 6 : optionId === 'balanced' ? 1 : -4), 0, 100)
      session.frontlinePrep += optionId === 'bold' ? 5 : optionId === 'balanced' ? 3 : 2
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 4 : optionId === 'balanced' ? 1 : -3), 0, 100)
      if (optionId !== 'cautious') {
        session.pendingRewardAmount += optionId === 'bold' ? 2 : 1
        effects.push(optionId === 'bold' ? '你前压布置，决战阶段将带着更高的推进收益预期。' : '你完成了基础布置，决战收益略有提升。')
      } else {
        effects.push('你把最后的准备压回稳妥区，队伍状态更适合决战。')
      }
    }

    if (encounter.kind === 'weekly_event') {
      if (encounter.sourceEventId) {
        session.encounteredEventIds = [...new Set([...session.encounteredEventIds, encounter.sourceEventId])]
        recordEncounteredWeeklyEvent(encounter.sourceEventId, dayTag)
      }
      session.danger = clamp(session.danger + (optionId === 'bold' ? 5 : optionId === 'balanced' ? 1 : -3), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 3 : optionId === 'balanced' ? 2 : 1), 0, 100)
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 3 : 1), 0, 100)
      session.riskState.alertness = clamp(session.riskState.alertness + (optionId === 'bold' ? 3 : optionId === 'balanced' ? 1 : -2), 0, 100)
      session.frontlinePrep += optionId === 'bold' ? 2 : 1
      effects.push(optionId === 'bold' ? '你强行把局势拉进自己的推进节奏，前线压力也随之上升。' : optionId === 'balanced' ? '你把这一段区域局势稳稳接住了。' : '你谨慎收束现场，优先带走关键线索。')
    }

    const rewardAmount = Math.max(0, Math.floor(encounter.rewardAmount * rewardMultiplier))
    if (encounter.rewardFamilyId && rewardAmount > 0) {
      session.pendingRewardAmount += rewardAmount
      effects.push(`暂存 ${rewardAmount} 份区域资源，待回城统一收束。`)
    }

    const rewardItems = encounter.rewardItems
      .map(item => ({ ...item, quantity: Math.max(0, Math.floor(item.quantity * rewardMultiplier)) }))
      .filter(item => item.quantity > 0)
    if (rewardItems.length > 0) {
      session.pendingRewardItems = mergeRewardItems(session.pendingRewardItems, rewardItems)
      effects.push(`暂存物资：${formatRewardItems(rewardItems)}`)
    }

    if (carryItemsFromEncounter.length > 0) {
      addCarryItems(session, carryItemsFromEncounter)
      effects.push(`携带层更新：${summarizeCarryItems(carryItemsFromEncounter)}｜当前总负重 ${session.carryLoad}/${session.maxCarryLoad}。`)
    }

    if (optionId === 'bold') {
      session.findings += 1
    }

    if (optionId === 'cautious' && encounter.kind !== 'hazard') {
      session.danger = clamp(session.danger - 2, 0, 100)
    }

    const nextEncounterKind = getFollowUpEncounterKind(encounter.kind, optionId, session)
    const encounterMemory: RegionExpeditionEncounterMemory = {
      id: createSessionToken(),
      kind: encounter.kind,
      optionId,
      summary: createEncounterMemorySummary(encounter.kind, optionId),
      nextKind: nextEncounterKind
    }
    session.encounterMemory = [...session.encounterMemory, encounterMemory].slice(-6)
    session.queuedEncounterKind = nextEncounterKind

    summary =
      optionId === 'bold'
        ? `你以强势方式处理了「${encounter.title}」，换来了更高收益，也抬高了风险。`
        : optionId === 'balanced'
          ? `你按计划处理了「${encounter.title}」，队伍节奏维持稳定。`
          : `你谨慎应对了「${encounter.title}」，优先保住了前线状态。`

    const encounterIntelGain =
      encounter.kind === 'weekly_event'
        ? 6
        : encounter.kind === 'traveler' || encounter.kind === 'anomaly'
          ? 5
          : encounter.kind === 'support' || encounter.kind === 'boss_prep'
            ? 4
            : 3
    const encounterSurveyGain = optionId === 'bold' ? 4 : optionId === 'balanced' ? 3 : 2
    const regionKnowledge = addRegionKnowledge(
      session.regionId,
      {
        intel: encounterIntelGain,
        survey: encounterSurveyGain,
        familiarity: encounter.kind === 'traveler' ? 3 : optionId === 'cautious' ? 2 : 1
      },
      dayTag
    )
    effects.push(`地图认知推进：区域情报 ${regionKnowledge.intel}/100。`)
    if (session.routeId) {
      const routeKnowledge = addRouteKnowledge(
        session.routeId,
        {
          intel: Math.max(2, Math.floor(encounterIntelGain / 2) + 1),
          surveyProgress: encounter.kind === 'weekly_event' ? 5 : 3,
          familiarity: encounter.kind === 'traveler' || optionId === 'cautious' ? 2 : 1
        },
        dayTag
      )
      effects.push(`路线记录补全：勘明 ${routeKnowledge.surveyProgress}/100，熟悉 ${routeKnowledge.familiarity}/100。`)
    }

    effects.push(`局势回写：前线准备 ${session.frontlinePrep}｜天气 ${session.riskState.weather} / 污染 ${session.riskState.pollution} / 警戒 ${session.riskState.alertness} / 异变 ${session.riskState.anomaly}。`)
    effects.push(`事件留痕：${encounterMemory.summary}${nextEncounterKind ? `，下一次更可能牵出「${getEncounterKindLabel(nextEncounterKind)}」链。` : '，暂时没有强制后续分支。'}`)

    appendSessionJournal(session, encounter.title, summary, effects, tone)
    session.pendingEncounter = null
    persistActiveSession(session)
    showFloat('遭遇已处理', tone)
    return {
      success: true,
      message: summary,
      title: '遭遇已处理',
      lines: [
        `目标：${session.targetName}`,
        `当前进度 ${session.progressStep}/${session.totalSteps}｜士气 ${session.morale}｜风险 ${session.danger}｜视野 ${session.visibility}`,
        ...effects
      ],
      tone: tone === 'danger' ? ('danger' as const) : tone === 'success' ? ('success' as const) : ('accent' as const)
    }
  }

  const settleActiveExpedition = (dayTag = '') => {
    const session = saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null
    if (!session) {
      return { success: false, message: '当前没有可收束的远征。', title: '无法收束', lines: ['当前没有可收束的远征。'], tone: 'danger' as const }
    }
    if (session.status === 'ongoing') {
      return { success: false, message: '这趟远征仍在途中，请先推进、扎营或撤退。', title: '无法收束', lines: ['这趟远征仍在途中，请先推进、扎营或撤退。'], tone: 'danger' as const }
    }

    const inventoryStore = useInventoryStore()
    const playerStore = usePlayerStore()
    const finalStatus = session.status === 'ready_to_settle' ? 'victory' : session.status
    const routeShortcutBefore = session.routeId ? getRouteShortcutProfile(session.routeId) : null
    let rewardAmount = 0
    let rewardItems: Array<{ itemId: string; quantity: number }> = []
    const bonusReward = Math.max(0, Math.floor(session.findings / (session.mode === 'boss' ? 3 : 2)))
    let title = '远征结算'
    let tone: 'success' | 'danger' | 'accent' = finalStatus === 'failure' ? 'danger' : finalStatus === 'victory' ? 'success' : 'accent'
    const summaryLines = [`目标：${session.targetName}`, `进度：${session.progressStep}/${session.totalSteps}`]

    if (finalStatus === 'victory') {
      rewardAmount = Math.max(1, session.pendingRewardAmount + bonusReward)
      rewardItems = session.pendingRewardItems.map(item => ({ ...item }))
      if (session.mode === 'route' && session.routeId && session.pendingRewardFamilyId) {
        markRouteCompleted(session.routeId, dayTag)
        addFamilyResources(session.pendingRewardFamilyId, rewardAmount)
      }
      if (session.mode === 'boss' && session.bossId && session.pendingRewardFamilyId) {
        recordBossClear(session.regionId, session.bossId, session.pendingRewardFamilyId, rewardAmount, dayTag)
        addFamilyResources(session.pendingRewardFamilyId, rewardAmount)
      }
      title = session.mode === 'boss' ? '首领远征凯旋' : '远征顺利收束'
      summaryLines.push(`带回 ${rewardAmount} 份区域资源。`)
    } else if (finalStatus === 'retreated') {
      rewardAmount = session.pendingRewardFamilyId ? Math.max(0, Math.floor((session.pendingRewardAmount + bonusReward) * 0.5)) : 0
      rewardItems = session.pendingRewardItems.map(item => ({ ...item, quantity: Math.max(0, Math.floor(item.quantity / 2)) })).filter(item => item.quantity > 0)
      if (session.pendingRewardFamilyId && rewardAmount > 0) {
        addFamilyResources(session.pendingRewardFamilyId, rewardAmount)
      }
      if (session.mode === 'boss' && session.bossId) {
        const recommendedRouteId = session.recommendedRouteId ?? getRecommendedRecoveryRoute(session.regionId)?.id ?? null
        saveData.value.lastBossOutcome = {
          regionId: session.regionId,
          bossId: session.bossId,
          outcome: 'failure',
          rewardFamilyId: session.pendingRewardFamilyId,
          rewardAmount,
          resolvedDayTag: dayTag,
          summary: recommendedRouteId ? `首领远征主动撤退，建议先回补给路线：${resolveSessionTargetLabel(session.regionId, recommendedRouteId, null)}` : '首领远征主动撤退，建议先补足状态再战。',
          recommendedRouteId,
          failureStreak: saveData.value.bossFailureStreaks[session.regionId] ?? 0
        }
      }
      title = '远征半途回撤'
      summaryLines.push(rewardAmount > 0 ? `保留 ${rewardAmount} 份区域资源。` : '几乎没有带回可用收获。')
    } else {
      if (session.mode === 'boss' && session.bossId && session.pendingRewardFamilyId) {
        const currentFailureStreak = saveData.value.bossFailureStreaks[session.regionId] ?? 0
        const pityRewardAmount = resourceFeatureEnabled.value && currentFailureStreak <= 0 && (saveData.value.bossClearCounts[session.regionId] ?? 0) <= 0 ? 1 : 0
        const refund = Math.max(1, Math.floor((getRegionBossDef(session.regionId)?.staminaCost ?? 2) / 2))
        playerStore.restoreStamina(refund)
        if (pityRewardAmount > 0) {
          addFamilyResources(session.pendingRewardFamilyId, pityRewardAmount)
        }
        rewardAmount = pityRewardAmount
        recordBossFailure(
          session.regionId,
          session.bossId,
          session.pendingRewardFamilyId,
          pityRewardAmount,
          session.recommendedRouteId ?? getRecommendedRecoveryRoute(session.regionId)?.id ?? null,
          dayTag
        )
        summaryLines.push(`返还 ${refund} 点体力。`)
        if (pityRewardAmount > 0) {
          summaryLines.push(`发放 ${pityRewardAmount} 份保底区域资源。`)
        }
      } else if (session.pendingRewardFamilyId) {
        rewardAmount = Math.max(0, Math.floor(session.findings / 3))
        if (rewardAmount > 0) {
          addFamilyResources(session.pendingRewardFamilyId, rewardAmount)
        }
        summaryLines.push(rewardAmount > 0 ? `仍带回 ${rewardAmount} 份零散资源。` : '没能带回成型战利品。')
      }
      title = '远征失利'
    }

    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
      summaryLines.push(`物品战利品：${formatRewardItems(rewardItems)}`)
    } else if (rewardItems.length > 0) {
      summaryLines.push('背包空间不足，部分物品战利品未能带回。')
      rewardItems = []
    }

    const regionSettlementKnowledge =
      finalStatus === 'victory'
        ? addRegionKnowledge(session.regionId, { intel: 6, survey: 8, familiarity: 6 }, dayTag)
        : finalStatus === 'retreated'
          ? addRegionKnowledge(session.regionId, { intel: 3, survey: 4, familiarity: 3 }, dayTag)
          : addRegionKnowledge(session.regionId, { intel: 2, survey: 3, familiarity: 1 }, dayTag)
    summaryLines.push(`区域认知：情报 ${regionSettlementKnowledge.intel}/100，勘明 ${regionSettlementKnowledge.survey}/100。`)
    if (session.routeId) {
      const routeSettlementKnowledge =
        finalStatus === 'victory'
          ? addRouteKnowledge(session.routeId, { intel: 6, surveyProgress: 10, familiarity: 8 }, dayTag)
          : finalStatus === 'retreated'
            ? addRouteKnowledge(session.routeId, { intel: 3, surveyProgress: 5, familiarity: 4 }, dayTag)
            : addRouteKnowledge(session.routeId, { intel: 1, surveyProgress: 2, familiarity: 1 }, dayTag)
      summaryLines.push(`路线熟悉：勘明 ${routeSettlementKnowledge.surveyProgress}/100，熟悉 ${routeSettlementKnowledge.familiarity}/100。`)
      const routeShortcutAfter = getRouteShortcutProfile(session.routeId)
      if (routeShortcutBefore && routeShortcutBefore.level !== routeShortcutAfter.level) {
        summaryLines.push(
          routeShortcutAfter.level === 'mastered'
            ? '你已把这条路走成熟路，后续远征将更容易直接切入核心路段。'
            : routeShortcutAfter.level === 'shortcut'
              ? '你在这条路上立下了稳定捷径，后续远征会更快进入正线。'
              : '这条路的关键路标逐渐清晰，后续摸图会更稳。'
        )
      }
    }

    summaryLines.push(session.carryItems.length > 0 ? `携带清单：${summarizeCarryItems(session.carryItems)}。` : '携带清单：未形成额外途中携带物。')
    summaryLines.push(
      `前线态势：准备 ${session.frontlinePrep}｜天气 ${session.riskState.weather} / 污染 ${session.riskState.pollution} / 警戒 ${session.riskState.alertness} / 异变 ${session.riskState.anomaly}。`
    )
    if (session.encounterMemory.length > 0) {
      summaryLines.push(`事件链留痕：${session.encounterMemory.slice(-3).map(entry => entry.summary).join(' / ')}。`)
    }

    const seasonalState = getRegionVariantSnapshot(session.regionId, dayTag)
    if (
      seasonalState.activeVariantId &&
      (!session.routeId || seasonalState.affectedRouteIds.length <= 0 || seasonalState.affectedRouteIds.includes(session.routeId))
    ) {
      summaryLines.push(`季节变体：${seasonalState.activeVariantLabel}。`)
    }
    const resolvedRumors = resolveRumorBoardEntries(
      session.regionId,
      session.routeId,
      dayTag,
      `${session.targetName} 已完成本周的手动确认与回城回执。`
    )
    if (resolvedRumors.length > 0) {
      summaryLines.push(`兑现传闻：${resolvedRumors.map(entry => entry.title).join(' / ')}。`)
    }
    const resolvedContract = resolveCompanionContract(
      session.routeId,
      finalStatus === 'failure' ? 'failed' : 'completed',
      dayTag,
      [
        `${session.targetName} 已${finalStatus === 'failure' ? '失利收束' : '顺利回城'}。`,
        finalStatus === 'failure' ? '同行合同没有完全兑现，后续关系会稍受影响。' : '同行合同已转成额外见闻和关系推进。'
      ]
    )
    if (resolvedContract) {
      summaryLines.push(`同行合同：${resolvedContract.npcName} 的合同已${resolvedContract.status === 'failed' ? '失效' : '结算'}。`)
    }
    recordJourneyChronicle(
      session.sessionId,
      session.regionId,
      `${session.targetName} 行旅纪`,
      finalStatus === 'failure' ? `${session.targetName} 以失利收束，但仍留下了可回看的见闻。` : `${session.targetName} 的本趟远征已写入见闻册。`,
      summaryLines.slice(0, 6),
      dayTag,
      resolvedContract?.npcId ?? null,
      resolvedContract?.npcName ?? '',
      seasonalState.activeVariantId
    )
    archiveSession(session, finalStatus, dayTag, [
      `${finalStatus === 'victory' ? '凯旋' : finalStatus === 'retreated' ? '撤退' : '失利'}：${session.targetName}`,
      ...summaryLines.slice(1)
    ])
    addLog(`【行旅图】${title}：${session.targetName}。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId: session.regionId,
        routeId: session.routeId,
        bossId: session.bossId,
        status: finalStatus,
        rewardAmount
      }
    })
    persistActiveSession(null)
    showFloat(title, tone)

    return {
      success: finalStatus !== 'failure',
      message: `${title}：${session.targetName}。`,
      title,
      lines: summaryLines,
      tone
    }
  }

  const runRouteExpedition = (routeId: string, dayTag = '') => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { success: false, message: '路线不存在。' }
    if (shouldBlockRapidRepeatAction(`route:${routeId}`)) {
      return { success: false, message: '刚刚已经处理过这条路线，请稍候再试。' }
    }
    const status = getRouteExpeditionStatus(routeId)
    if (!status.available) {
      return { success: false, message: status.reason }
    }
    const autoPatrolStatus = getAutoPatrolStatus(routeId, dayTag)
    if (autoPatrolStatus.mode !== 'ready') {
      return { success: false, message: autoPatrolStatus.blockedReason || '这条路线当前还不适合自动巡行。' }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    startExpedition(route.regionId, route.id, null, dayTag)
    if (!playerStore.consumeStamina(route.staminaCost)) {
      clearExpedition()
      return { success: false, message: `体力不足，需要 ${route.staminaCost} 点体力。` }
    }

    const timeResult = gameStore.advanceTime(route.timeCostHours, { skipSpeedBuff: true })
    const result = completeRouteAndGrantRewards(route.id, dayTag)
    if (!result) {
      playerStore.restoreStamina(route.staminaCost)
      clearExpedition()
      return { success: false, message: '路线结算失败。' }
    }
    clearExpedition()
    saveData.value.autoPatrolStates[routeId] = {
      ...autoPatrolStatus,
      mode: 'ready',
      lastAutoSettledDayTag: dayTag || `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    }

    const regionName = REGION_DEFS.find(region => region.id === route.regionId)?.name ?? route.regionId
    const rewardSummary = result.rewardItems.length > 0
      ? `，获得 ${formatRewardItems(result.rewardItems)}`
      : ''
    addLog(`【行旅图】已完成 ${regionName}·${route.name}，消耗 ${route.staminaCost} 体力${rewardSummary}。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId: route.regionId,
        routeId: route.id,
        staminaCost: route.staminaCost,
        timeCostHours: route.timeCostHours
      }
    })
    const seasonalState = getRegionVariantSnapshot(route.regionId, dayTag)
    recordJourneyChronicle(
      `auto-route:${route.id}:${dayTag || `${gameStore.year}-${gameStore.season}-${gameStore.day}`}`,
      route.regionId,
      `${route.name} 自动巡行回执`,
      `熟路自动巡行已完成 ${route.name}，稳定回收了本周区域收益。`,
      [
        `自动巡行：${route.name}`,
        rewardSummary ? `回收结果：${rewardSummary.slice(1)}` : '本次主要完成熟路回收，没有额外物资挤压。',
        seasonalState.activeVariantId ? `当前区域仍存在变体「${seasonalState.activeVariantLabel}」，后续仍要留意手动线。` : '当前区域没有额外季节变体压在熟路上。'
      ],
      dayTag || `${gameStore.year}-${gameStore.season}-${gameStore.day}`,
      null,
      '',
      seasonalState.activeVariantId
    )
    showFloat(`行旅图推进：${route.name}`, 'accent')

    return {
      success: true,
      message: `已推进 ${regionName}·${route.name}。${timeResult.message ? `${timeResult.message} ` : ''}${rewardSummary ? `本次${rewardSummary.slice(1)}。` : ''}`.trim()
    }
  }

  const completeEventAndGrantRewards = (eventId: string, dayTag = '') => {
    const inventoryStore = useInventoryStore()
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId)
    if (!event) return null
    if (!getEventAvailability(eventId).available) return null

    const current = saveData.value.eventStates[event.id] ?? {
      eventId: event.id,
      totalCompletions: 0,
      weeklyCompletions: 0,
      lastCompletedDayTag: '',
      lastActivatedWeekId: ''
    }
    saveData.value.eventStates[event.id] = {
      eventId: event.id,
      totalCompletions: current.totalCompletions + 1,
      weeklyCompletions: current.weeklyCompletions + 1,
      lastCompletedDayTag: dayTag,
      lastActivatedWeekId: saveData.value.weeklyEventState.weekId
    }
    const rewardAmount = resourceFeatureEnabled.value ? event.rewardAmount : 0
    addFamilyResources(event.rewardFamilyId, rewardAmount)
    addRegionKnowledge(
      event.regionId,
      {
        intel: 4 + event.rewardAmount,
        survey: 2 + Math.floor(event.rewardAmount / 2),
        familiarity: 1
      },
      dayTag
    )
    const rewardItems = EVENT_ITEM_REWARDS[event.id] ?? []
    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
    }
    return {
      eventId: event.id,
      regionId: event.regionId,
      familyId: event.rewardFamilyId,
      rewardAmount,
      rewardItems
    }
  }

  const runRegionEvent = (eventId: string, dayTag = '') => {
    const event = REGION_EVENT_DEFS.find(entry => entry.id === eventId)
    if (!event) return { success: false, message: '区域事件不存在。' }
    if (shouldBlockRapidRepeatAction(`event:${eventId}`)) {
      return { success: false, message: '刚刚已经处理过这个区域事件，请稍候再试。' }
    }
    const status = getEventAvailability(eventId)
    if (!status.available) {
      return { success: false, message: status.reason }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(event.staminaCost)) {
      return { success: false, message: `体力不足，需要 ${event.staminaCost} 点体力。` }
    }

    const timeResult = gameStore.advanceTime(event.timeCostHours, { skipSpeedBuff: true })
    const result = completeEventAndGrantRewards(event.id, dayTag)
    if (!result) {
      playerStore.restoreStamina(event.staminaCost)
      return { success: false, message: '区域事件结算失败。' }
    }

    addLog(`【行旅图】已处理区域事件「${event.name}」，消耗 ${event.staminaCost} 体力。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId: event.regionId,
        eventId: event.id,
        staminaCost: event.staminaCost,
        timeCostHours: event.timeCostHours
      }
    })
    showFloat(`区域事件：${event.name}`, 'accent')

    return {
      success: true,
      message: `已完成事件「${event.name}」。${timeResult.message ? `${timeResult.message} ` : ''}${result.rewardAmount > 0 ? `获得 ${result.rewardAmount} 点区域资源` : '已完成本次事件推进'}${result.rewardItems.length > 0 ? `，并带回 ${formatRewardItems(result.rewardItems)}` : ''}。`.trim()
    }
  }

  const buildRegionBossPlayerRuntime = () => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const skillStore = useSkillStore()
    const cookingStore = useCookingStore()
    const guildStore = useGuildStore()
    const miningStore = useMiningStore()
    const ownedWeapon = inventoryStore.getEquippedWeapon()
    const weaponDef = getWeaponById(ownedWeapon.defId)
    const enchant = ownedWeapon.enchantmentId ? getEnchantmentById(ownedWeapon.enchantmentId) : null
    const combatSkill = skillStore.getSkill('combat')
    const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0

    return {
      playerHp: playerStore.hp,
      maxHp: playerStore.getMaxHp(),
      weaponLabel: weaponDef?.name ?? ownedWeapon.defId,
      runtime: buildPlayerCombatRuntime({
        weaponAttack: inventoryStore.getWeaponAttack(),
        weaponCritRate: inventoryStore.getWeaponCritRate(),
        weaponType: weaponDef?.type ?? null,
        enchantSpecial: enchant?.special ?? null,
        combatLevel: skillStore.combatLevel,
        allSkillsBuff,
        ringAttackBonus: inventoryStore.getRingEffectValue('attack_bonus'),
        ringCritBonus: inventoryStore.getRingEffectValue('crit_rate_bonus'),
        ringLuck: inventoryStore.getRingEffectValue('luck'),
        ringDefenseBonus: inventoryStore.getRingEffectValue('defense_bonus'),
        ringVampiric: inventoryStore.getRingEffectValue('vampiric'),
        guildAttackBonus: guildStore.getGuildAttackBonus(),
        guildBadgeBonusAttack: miningStore.guildBadgeBonusAttack,
        guildDefenseBonus: miningStore.guildBonusDefense,
        cookingDefenseReduction: cookingStore.getActiveDefenseReduction(),
        cookingDefenseFlatBonus: cookingStore.getActiveDefenseFlatBonus(),
        perk5: combatSkill.perk5,
        perk10: combatSkill.perk10,
        perk15: combatSkill.perk15,
        perk20: combatSkill.perk20
      })
    }
  }

  const simulateBossExpedition = (regionId: RegionId, boss: RegionBossDef, session: RegionExpeditionSession | null = null) => {
    const { playerHp, maxHp, weaponLabel, runtime } = buildRegionBossPlayerRuntime()
    const completedRouteCount = getRegionCompletedRouteCount(regionId)
    const weeklyEventCompletions = getRegionWeeklyEventCompletions(regionId)
    const familyStock = getFamilyResourceQuantity(boss.rewardFamilyId)
    const failureStreak = saveData.value.bossFailureStreaks[regionId] ?? 0
    const focusBonus = currentWeeklyFocus.value.focusedRegionId === regionId ? 1 : 0
    const branchCount = session?.nodeHistory.filter(node => node.lane === 'branch').length ?? 0
    const deepCount = session?.nodeHistory.filter(node => node.lane === 'deep' || node.lane === 'boss').length ?? 0
    const campCount = session?.nodeHistory.filter(node => node.lane === 'camp').length ?? 0
    const supportCount = session?.encounterMemory.filter(entry => entry.kind === 'support').length ?? 0
    const anomalyCount = session?.encounterMemory.filter(entry => entry.kind === 'anomaly').length ?? 0
    const hazardBoldCount = session?.encounterMemory.filter(entry => entry.kind === 'hazard' && entry.optionId === 'bold').length ?? 0
    const frontlinePrepBonus = Math.min(12, session?.frontlinePrep ?? 0)
    const weatherPressure =
      session?.riskState.weather === 'storm' ? 3 : session?.riskState.weather === 'fog' ? 2 : session?.riskState.weather === 'wind' ? 1 : 0
    const anomalyPressure = Math.floor((session?.riskState.anomaly ?? 0) / 14) + anomalyCount * 2
    const alertPressure = Math.floor((session?.riskState.alertness ?? 0) / 20)
    const pollutionPressure = Math.floor((session?.riskState.pollution ?? 0) / 18)
    const supportDamageBonus =
      completedRouteCount * 2 +
      weeklyEventCompletions * 2 +
      Math.min(6, familyStock) +
      focusBonus * 2 +
      failureStreak +
      frontlinePrepBonus +
      branchCount +
      deepCount +
      supportCount * 2
    const supportMitigation = Math.min(
      0.55,
      weeklyEventCompletions * 0.04 +
        failureStreak * 0.05 +
        focusBonus * 0.03 +
        Math.min(0.2, frontlinePrepBonus * 0.015) +
        supportCount * 0.04 +
        campCount * 0.03
    )

    const phaseLines: string[] = []
    let projectedHp = playerHp
    for (const phase of boss.phases) {
      const expectedDamage = getExpectedAttackDamage(runtime.attack, phase.enemyDefense)
      const effectiveDamagePerRound = Math.max(1, Math.ceil(expectedDamage + supportDamageBonus - anomalyPressure))
      const rounds = Math.max(1, Math.ceil(phase.enemyHp / effectiveDamagePerRound))
      const expectedIncomingPerRound = getExpectedIncomingDamage(phase.enemyAttack, runtime.defense, Math.max(0.55, 1 - runtime.attack.stunChance! * 0.4))
      const incomingPressureMultiplier = 1 + weatherPressure * 0.05 + alertPressure * 0.04 + pollutionPressure * 0.03 + hazardBoldCount * 0.04
      const phaseDamageTaken = Math.max(1, Math.ceil(rounds * expectedIncomingPerRound * (1 - supportMitigation) * incomingPressureMultiplier))
      const phaseLifesteal = getLifestealHeal(Math.ceil(rounds * expectedDamage), runtime.attack.lifesteal)
      projectedHp = Math.min(maxHp, projectedHp - phaseDamageTaken + phaseLifesteal)

      phaseLines.push(
        `${phase.label}：预计交锋 ${rounds} 轮，输出压制 ${effectiveDamagePerRound}/轮，承伤约 ${phaseDamageTaken}，阶段结束剩余生命 ${Math.max(projectedHp, 0)}。`
      )

      if (projectedHp <= 0) {
        return {
          success: false,
          projectedHp,
          weaponLabel,
          phaseLines,
          supportSummary:
            session
              ? `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 前线准备 ${frontlinePrepBonus} / 支援链 ${supportCount} / 异变压力 ${anomalyPressure + pollutionPressure}`
              : `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 资源库存 ${familyStock} / 失败保底 ${failureStreak}`,
          recommendedRouteId: getRecommendedRecoveryRoute(regionId)?.id ?? null
        }
      }
    }

    const defendRecovery = getDefendHeal({
      maxHp,
      healFlat: runtime.defendHealFlat,
      healRatio: runtime.defendHealRatio
    })
    projectedHp = Math.min(maxHp, projectedHp + Math.max(0, Math.floor(defendRecovery / 2)))
    phaseLines.push(`战后回气：依托 ${weaponLabel} 与战斗专精回稳，保留 ${projectedHp}/${maxHp} 生命。`)

    return {
      success: true,
      projectedHp,
      weaponLabel,
      phaseLines,
      supportSummary:
        session
          ? `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 前线准备 ${frontlinePrepBonus} / 支援链 ${supportCount} / 焦点加成 ${focusBonus > 0 ? '有' : '无'}`
          : `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 资源库存 ${familyStock} / 焦点加成 ${focusBonus > 0 ? '有' : '无'}`
    }
  }

  const recordBossFailure = (
    regionId: RegionId,
    bossId: string,
    familyId: RegionalResourceFamilyId,
    rewardAmount: number,
    recommendedRouteId: string | null,
    dayTag = ''
  ) => {
    const nextFailureStreak = (saveData.value.bossFailureStreaks[regionId] ?? 0) + 1
    const recommendedRouteName = recommendedRouteId
      ? REGION_ROUTE_DEFS.find(route => route.id === recommendedRouteId)?.name ?? recommendedRouteId
      : null
    saveData.value.bossFailureStreaks[regionId] = nextFailureStreak
    saveData.value.lastBossOutcome = {
      regionId,
      bossId,
      outcome: 'failure',
      rewardFamilyId: familyId,
      rewardAmount,
      resolvedDayTag: dayTag,
      summary: recommendedRouteName ? `首领失利，建议先回补给路线：${recommendedRouteName}` : '首领失利，建议先补体力与库存。',
      recommendedRouteId,
      failureStreak: nextFailureStreak
    }
    syncBossMapNodeState(regionId, dayTag, 1, 1)
    return nextFailureStreak
  }

  const recordBossClear = (regionId: RegionId, bossId: string, familyId: RegionalResourceFamilyId, rewardAmount: number, dayTag = '') => {
    if (!expeditionFeatureEnabled.value) return false
    const bossName = getRegionBossDef(regionId)?.name ?? bossId
    saveData.value.telemetry.bossClears += 1
    saveData.value.bossClearCounts[regionId] = (saveData.value.bossClearCounts[regionId] ?? 0) + 1
    saveData.value.bossFailureStreaks[regionId] = 0
    saveData.value.lastBossOutcome = {
      regionId,
      bossId,
      outcome: 'victory',
      rewardFamilyId: familyId,
      rewardAmount,
      resolvedDayTag: dayTag,
      summary: `已击败区域首领：${bossName}`,
      recommendedRouteId: null,
      failureStreak: 0
    }
    syncBossMapNodeState(regionId, dayTag, 1, 2)
    addRegionKnowledge(regionId, { intel: 12, survey: 10, familiarity: 8 }, dayTag)
    return true
  }

  const clearBossAndGrantRewards = (regionId: RegionId, dayTag = '') => {
    if (!saveData.value.unlockStates[regionId]?.unlocked) return null
    const inventoryStore = useInventoryStore()
    const boss = getRegionBossDef(regionId)
    const familyId = boss?.rewardFamilyId ?? 'ley_crystal'
    const rewardAmount = resourceFeatureEnabled.value ? getBossRewardAmount(regionId) : 0
    if (!boss || !recordBossClear(regionId, boss.id, familyId, rewardAmount, dayTag)) return null
    addFamilyResources(familyId, rewardAmount)
    const rewardItems = BOSS_ITEM_REWARDS[regionId] ?? []
    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
    }
    return {
      regionId,
      familyId,
      rewardAmount,
      rewardItems
    }
  }

  const runBossExpedition = (regionId: RegionId, dayTag = '') => {
    if (shouldBlockRapidRepeatAction(`boss:${regionId}`)) {
      return { success: false, message: '刚刚已经处理过这场首领战，请稍候再试。' }
    }
    const status = getBossExpeditionStatus(regionId)
    if (!status.available) {
      return { success: false, message: status.reason }
    }
    const boss = getRegionBossDef(regionId)
    if (!boss) return { success: false, message: '当前区域首领未配置。' }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    startExpedition(regionId, null, boss.id, dayTag)
    if (!playerStore.consumeStamina(boss.staminaCost)) {
      clearExpedition()
      return { success: false, message: `体力不足，需要 ${boss.staminaCost} 点体力。` }
    }

    const timeResult = gameStore.advanceTime(boss.timeCostHours, { skipSpeedBuff: true })
    const combatResult = simulateBossExpedition(regionId, boss)

    if (!combatResult.success) {
      const refund = Math.max(1, Math.floor(boss.staminaCost / 2))
      const currentFailureStreak = saveData.value.bossFailureStreaks[regionId] ?? 0
      const pityRewardAmount = resourceFeatureEnabled.value && currentFailureStreak <= 0 && (saveData.value.bossClearCounts[regionId] ?? 0) <= 0 ? 1 : 0
      playerStore.restoreStamina(refund)
      if (pityRewardAmount > 0) {
        addFamilyResources(boss.rewardFamilyId, pityRewardAmount)
      }
      const fallbackRouteId = combatResult.recommendedRouteId ?? null
      const fallbackRouteName = fallbackRouteId
        ? REGION_ROUTE_DEFS.find(route => route.id === fallbackRouteId)?.name ?? fallbackRouteId
        : null
      recordBossFailure(regionId, boss.id, boss.rewardFamilyId, pityRewardAmount, fallbackRouteId, dayTag)
      clearExpedition()
      addLog(`【行旅图】${boss.name} 将你逼退，返还了 ${refund} 点体力${pityRewardAmount > 0 ? '，并保留了少量区域收获。' : '。'}`, {
        category: 'goal',
        tags: ['late_game_cycle'],
        meta: {
          regionId,
          bossId: boss.id,
          staminaRefund: refund,
          failureStreak: saveData.value.bossFailureStreaks[regionId]
        }
      })
      showFloat(`首领失利：${boss.name}`, 'danger')
      return {
        success: false,
        message: [
          `挑战 ${boss.name} 失利。${timeResult.message ? `${timeResult.message} ` : ''}已返还 ${refund} 点体力${pityRewardAmount > 0 ? `，并发放 ${pityRewardAmount} 份保底区域资源。` : '。'}`,
          combatResult.supportSummary,
          ...combatResult.phaseLines,
          fallbackRouteName ? `建议先回「${fallbackRouteName}」补给后再战。` : ''
        ]
          .filter(Boolean)
          .join(' ')
      }
    }

    const result = clearBossAndGrantRewards(regionId, dayTag)
    if (!result) {
      playerStore.restoreStamina(boss.staminaCost)
      clearExpedition()
      return { success: false, message: '首领结算失败。' }
    }
    clearExpedition()

    const regionName = REGION_DEFS.find(region => region.id === regionId)?.name ?? regionId
    const rewardSummary = result.rewardItems.length > 0
      ? `，获得 ${formatRewardItems(result.rewardItems)}`
      : ''
    addLog(`【行旅图】已击败 ${regionName} 首领「${boss.name}」，消耗 ${boss.staminaCost} 体力${rewardSummary}。`, {
      category: 'goal',
      tags: ['late_game_cycle'],
      meta: {
        regionId,
        bossId: boss.id,
        staminaCost: boss.staminaCost,
        timeCostHours: boss.timeCostHours
      }
    })
    showFloat(`区域首领：${boss.name}`, 'success')
    return {
      success: true,
      message: [
        `已击败 ${regionName} 首领「${boss.name}」。${timeResult.message ? `${timeResult.message} ` : ''}${rewardSummary ? `本次${rewardSummary.slice(1)}。` : ''}`.trim(),
        combatResult.supportSummary,
        ...combatResult.phaseLines
      ]
        .filter(Boolean)
        .join(' ')
    }
  }

  const serialize = (): RegionMapSaveData => ({
    saveVersion: saveData.value.saveVersion,
    unlockStates: { ...saveData.value.unlockStates },
    routeStates: { ...saveData.value.routeStates },
    eventStates: { ...saveData.value.eventStates },
    weeklyFocusState: {
      weekId: saveData.value.weeklyFocusState.weekId,
      focusedRegionId: saveData.value.weeklyFocusState.focusedRegionId,
      highlightedRouteIds: [...saveData.value.weeklyFocusState.highlightedRouteIds]
    },
    weeklyEventState: {
      weekId: saveData.value.weeklyEventState.weekId,
      activeEventIdsByRegion: {
        ancient_road: [...(saveData.value.weeklyEventState.activeEventIdsByRegion.ancient_road ?? [])],
        mirage_marsh: [...(saveData.value.weeklyEventState.activeEventIdsByRegion.mirage_marsh ?? [])],
        cloud_highland: [...(saveData.value.weeklyEventState.activeEventIdsByRegion.cloud_highland ?? [])]
      },
      lastRefreshedDayTag: saveData.value.weeklyEventState.lastRefreshedDayTag
    },
    resourceLedger: { ...saveData.value.resourceLedger },
    expedition: { ...saveData.value.expedition },
    activeSession: saveData.value.activeSession ? cloneSession(saveData.value.activeSession) : null,
    journeyHistory: saveData.value.journeyHistory.map(entry => ({
      ...entry,
      summaryLines: [...entry.summaryLines],
      carryItems: entry.carryItems.map(item => ({ ...item })),
      journal: entry.journal.map(logEntry => ({ ...logEntry, effects: [...logEntry.effects] }))
    })),
    knowledgeState: Object.fromEntries(
      REGION_DEFS.map(region => {
        const state = getRegionKnowledgeState(region.id)
        return [region.id, { ...state }]
      })
    ) as Record<RegionId, RegionKnowledgeState>,
    routeKnowledgeState: Object.fromEntries(
      REGION_ROUTE_DEFS.map(route => {
        const state = getRouteKnowledgeState(route.id)
        return [route.id, { ...state }]
      })
    ) as Record<string, RegionRouteKnowledgeState>,
    mapNodeStates: Object.fromEntries(
      Object.entries(saveData.value.mapNodeStates).map(([nodeKey, state]) => [nodeKey, { ...state }])
    ) as Record<string, RegionMapNodeState>,
    campStates: Object.fromEntries(
      Object.entries(saveData.value.campStates).map(([campKey, state]) => [campKey, { ...state }])
    ) as Record<string, RegionCampSiteState>,
    shortcutStates: Object.fromEntries(
      Object.entries(saveData.value.shortcutStates).map(([routeId, state]) => [routeId, { ...state }])
    ) as Record<string, RegionShortcutState>,
    seasonalRegionStates: Object.fromEntries(
      REGION_DEFS.map(region => {
        const state = saveData.value.seasonalRegionStates[region.id]
        return [
          region.id,
          {
            ...state,
            detailLines: [...state.detailLines],
            affectedRouteIds: [...state.affectedRouteIds],
            seenVariantIds: [...state.seenVariantIds]
          }
        ]
      })
    ) as Record<RegionId, RegionSeasonalState>,
    companionContracts: saveData.value.companionContracts.map(contract => ({
      ...contract,
      settlementLines: [...contract.settlementLines]
    })),
    rumorBoard: {
      weekId: saveData.value.rumorBoard.weekId,
      lastRefreshedDayTag: saveData.value.rumorBoard.lastRefreshedDayTag,
      entriesByRegion: {
        ancient_road: saveData.value.rumorBoard.entriesByRegion.ancient_road.map(entry => ({
          ...entry,
          detailLines: [...entry.detailLines],
          tags: [...entry.tags]
        })),
        mirage_marsh: saveData.value.rumorBoard.entriesByRegion.mirage_marsh.map(entry => ({
          ...entry,
          detailLines: [...entry.detailLines],
          tags: [...entry.tags]
        })),
        cloud_highland: saveData.value.rumorBoard.entriesByRegion.cloud_highland.map(entry => ({
          ...entry,
          detailLines: [...entry.detailLines],
          tags: [...entry.tags]
        }))
      }
    },
    autoPatrolStates: Object.fromEntries(
      Object.entries(saveData.value.autoPatrolStates).map(([routeId, state]) => [routeId, { ...state, blockedTags: [...state.blockedTags] }])
    ) as Record<string, RegionAutoPatrolState>,
    telemetry: { ...saveData.value.telemetry },
    bossClearCounts: { ...saveData.value.bossClearCounts },
    bossFailureStreaks: { ...saveData.value.bossFailureStreaks },
    lastBossOutcome: { ...saveData.value.lastBossOutcome }
  })

  const normalizeExpeditionSession = (raw: any): RegionExpeditionSession | null => {
    if (!raw || typeof raw !== 'object') return null
    const regionId = REGION_DEFS.some(region => region.id === raw.regionId) ? (raw.regionId as RegionId) : null
    if (!regionId) return null
    const routeId = typeof raw.routeId === 'string' && REGION_ROUTE_DEFS.some(route => route.id === raw.routeId && route.regionId === regionId)
      ? String(raw.routeId)
      : null
    const bossId = typeof raw.bossId === 'string' && REGION_BOSS_DEFS.some(boss => boss.id === raw.bossId && boss.regionId === regionId)
      ? String(raw.bossId)
      : null
    if (!routeId && !bossId) return null

    const targetName = typeof raw.targetName === 'string' && raw.targetName
      ? raw.targetName
      : resolveSessionTargetLabel(regionId, routeId, bossId)
    const totalSteps = Math.max(1, Math.floor(Number(raw.totalSteps) || 1))
    const progressStep = clamp(Math.floor(Number(raw.progressStep) || 0), 0, totalSteps)
    const normalizedApproach = raw.approach === 'scout' || raw.approach === 'greedy' ? raw.approach : 'steady'
    const normalizedRetreatRule =
      raw.retreatRule === 'low_hp' || raw.retreatRule === 'pack_full' || raw.retreatRule === 'after_camp'
        ? raw.retreatRule
        : 'balanced'
    const pendingRewardItems = Array.isArray(raw.pendingRewardItems)
      ? raw.pendingRewardItems
          .filter((item: unknown) => item && typeof item === 'object')
          .map((item: unknown) => ({
            itemId: typeof (item as { itemId?: unknown }).itemId === 'string' ? String((item as { itemId?: unknown }).itemId) : '',
            quantity: Math.max(0, Math.floor(Number((item as { quantity?: unknown }).quantity) || 0))
          }))
          .filter((item: { itemId: string; quantity: number }) => item.itemId && item.quantity > 0)
      : []
    const carryItems = Array.isArray(raw.carryItems)
      ? raw.carryItems
          .filter((item: unknown) => item && typeof item === 'object')
          .map((item: unknown) => ({
            id: typeof (item as { id?: unknown }).id === 'string' ? String((item as { id?: unknown }).id) : createSessionToken(),
            label: typeof (item as { label?: unknown }).label === 'string' ? String((item as { label?: unknown }).label) : '途中收获',
            category:
              (item as { category?: unknown }).category === 'clue' ||
              (item as { category?: unknown }).category === 'refined' ||
              (item as { category?: unknown }).category === 'supply'
                ? ((item as { category?: RegionExpeditionCarryItemCategory }).category ?? 'resource')
                : 'resource',
            quantity: Math.max(1, Math.floor(Number((item as { quantity?: unknown }).quantity) || 1)),
            burden: Math.max(1, Math.floor(Number((item as { burden?: unknown }).burden) || 1)),
            note: typeof (item as { note?: unknown }).note === 'string' ? String((item as { note?: unknown }).note) : ''
          }))
      : []
    const journal = Array.isArray(raw.journal)
      ? raw.journal
          .filter((entry: unknown) => entry && typeof entry === 'object')
          .map((entry: unknown) => ({
            id: typeof (entry as { id?: unknown }).id === 'string' ? String((entry as { id?: unknown }).id) : createSessionToken(),
            step: Math.max(0, Math.floor(Number((entry as { step?: unknown }).step) || 0)),
            title: typeof (entry as { title?: unknown }).title === 'string' ? String((entry as { title?: unknown }).title) : '远征记录',
            summary: typeof (entry as { summary?: unknown }).summary === 'string' ? String((entry as { summary?: unknown }).summary) : '',
            effects: Array.isArray((entry as { effects?: unknown }).effects)
              ? ((entry as { effects?: unknown[] }).effects ?? []).filter((effect): effect is string => typeof effect === 'string')
              : [],
            tone:
              (entry as { tone?: unknown }).tone === 'success' ||
              (entry as { tone?: unknown }).tone === 'danger' ||
              (entry as { tone?: unknown }).tone === 'accent'
                ? ((entry as { tone?: RegionExpeditionLogEntry['tone'] }).tone ?? 'accent')
                : 'accent'
          }))
      : []
    const pendingEncounter = raw.pendingEncounter && typeof raw.pendingEncounter === 'object'
      ? (() => {
          const encounterRaw = raw.pendingEncounter as {
            id?: unknown
            step?: unknown
            kind?: unknown
            title?: unknown
            summary?: unknown
            detailLines?: unknown
            risk?: unknown
            sourceEventId?: unknown
            rewardFamilyId?: unknown
            rewardAmount?: unknown
            rewardItems?: unknown
            options?: unknown
          }
          const kind =
            encounterRaw.kind === 'weekly_event' ||
            encounterRaw.kind === 'hazard' ||
            encounterRaw.kind === 'cache' ||
            encounterRaw.kind === 'traveler' ||
            encounterRaw.kind === 'support' ||
            encounterRaw.kind === 'anomaly' ||
            encounterRaw.kind === 'boss_prep'
              ? encounterRaw.kind
              : null
          if (!kind) return null
          const rewardItems = Array.isArray(encounterRaw.rewardItems)
            ? encounterRaw.rewardItems
                .filter((item: unknown) => item && typeof item === 'object')
                .map((item: unknown) => ({
                  itemId: typeof (item as { itemId?: unknown }).itemId === 'string' ? String((item as { itemId?: unknown }).itemId) : '',
                  quantity: Math.max(0, Math.floor(Number((item as { quantity?: unknown }).quantity) || 0))
                }))
                .filter((item: { itemId: string; quantity: number }) => item.itemId && item.quantity > 0)
            : []
          const options = Array.isArray(encounterRaw.options)
            ? encounterRaw.options
                .filter((option: unknown) => option && typeof option === 'object')
                .map((option: unknown) => {
                  const normalizedOption = option as { id?: unknown; label?: unknown; summary?: unknown; tone?: unknown }
                  const optionId =
                    normalizedOption.id === 'cautious' || normalizedOption.id === 'balanced' || normalizedOption.id === 'bold'
                      ? normalizedOption.id
                      : null
                  if (!optionId) return null
                  return {
                    id: optionId,
                    label: typeof normalizedOption.label === 'string' ? normalizedOption.label : optionId,
                    summary: typeof normalizedOption.summary === 'string' ? normalizedOption.summary : '',
                    tone:
                      normalizedOption.tone === 'success' || normalizedOption.tone === 'danger' || normalizedOption.tone === 'accent'
                        ? normalizedOption.tone
                        : 'accent'
                  } satisfies RegionExpeditionEncounterOption
                })
                .filter((option): option is RegionExpeditionEncounterOption => Boolean(option))
            : createEncounterOptions(kind)

          return {
            id: typeof encounterRaw.id === 'string' ? encounterRaw.id : createSessionToken(),
            step: Math.max(0, Math.floor(Number(encounterRaw.step) || 0)),
            kind,
            title: typeof encounterRaw.title === 'string' ? encounterRaw.title : '途中遭遇',
            summary: typeof encounterRaw.summary === 'string' ? encounterRaw.summary : '',
            detailLines: Array.isArray(encounterRaw.detailLines)
              ? encounterRaw.detailLines.filter((line: unknown): line is string => typeof line === 'string').slice(0, 4)
              : [],
            risk: encounterRaw.risk === 'low' || encounterRaw.risk === 'high' ? encounterRaw.risk : 'medium',
            sourceEventId:
              typeof encounterRaw.sourceEventId === 'string' && REGION_EVENT_DEFS.some(event => event.id === encounterRaw.sourceEventId)
                ? String(encounterRaw.sourceEventId)
                : null,
            rewardFamilyId: REGIONAL_RESOURCE_FAMILY_DEFS.some(family => family.id === encounterRaw.rewardFamilyId)
              ? (encounterRaw.rewardFamilyId as RegionalResourceFamilyId)
              : null,
            rewardAmount: Math.max(0, Math.floor(Number(encounterRaw.rewardAmount) || 0)),
            rewardItems,
            options: options.length > 0 ? options : createEncounterOptions(kind)
          } satisfies RegionExpeditionEncounter
        })()
      : null
    const encounteredEventIds = Array.isArray(raw.encounteredEventIds)
      ? raw.encounteredEventIds.filter((entry: unknown): entry is string => typeof entry === 'string' && REGION_EVENT_DEFS.some(event => event.id === entry))
      : []
    const encounterMemory = Array.isArray(raw.encounterMemory)
      ? raw.encounterMemory
          .filter((entry: unknown) => entry && typeof entry === 'object')
          .map((entry: unknown) => ({
            id: typeof (entry as { id?: unknown }).id === 'string' ? String((entry as { id?: unknown }).id) : createSessionToken(),
            kind:
              (entry as { kind?: unknown }).kind === 'hazard' ||
              (entry as { kind?: unknown }).kind === 'cache' ||
              (entry as { kind?: unknown }).kind === 'traveler' ||
              (entry as { kind?: unknown }).kind === 'support' ||
              (entry as { kind?: unknown }).kind === 'anomaly' ||
              (entry as { kind?: unknown }).kind === 'boss_prep' ||
              (entry as { kind?: unknown }).kind === 'weekly_event'
                ? ((entry as { kind?: RegionExpeditionEncounterKind }).kind ?? 'weekly_event')
                : 'weekly_event',
            optionId:
              (entry as { optionId?: unknown }).optionId === 'cautious' ||
              (entry as { optionId?: unknown }).optionId === 'bold'
                ? ((entry as { optionId?: 'cautious' | 'balanced' | 'bold' }).optionId ?? 'balanced')
                : 'balanced',
            summary: typeof (entry as { summary?: unknown }).summary === 'string' ? String((entry as { summary?: unknown }).summary) : '',
            nextKind:
              (entry as { nextKind?: unknown }).nextKind === 'hazard' ||
              (entry as { nextKind?: unknown }).nextKind === 'cache' ||
              (entry as { nextKind?: unknown }).nextKind === 'traveler' ||
              (entry as { nextKind?: unknown }).nextKind === 'support' ||
              (entry as { nextKind?: unknown }).nextKind === 'anomaly' ||
              (entry as { nextKind?: unknown }).nextKind === 'boss_prep' ||
              (entry as { nextKind?: unknown }).nextKind === 'weekly_event'
                ? ((entry as { nextKind?: RegionExpeditionEncounterKind }).nextKind ?? null)
                : null
          }))
          .slice(-6)
      : []
    const campState = raw.campState && typeof raw.campState === 'object'
      ? {
          enteredAtStep: Math.max(0, Math.floor(Number(raw.campState.enteredAtStep) || 0)),
          nightEventHint: typeof raw.campState.nightEventHint === 'string' ? raw.campState.nightEventHint : createCampNightHint({
            sessionId: '',
            mode: raw.mode === 'boss' ? 'boss' : 'route',
            regionId,
            routeId,
            bossId,
            targetName,
            startedAtDayTag: '',
            approach: normalizedApproach,
            retreatRule: normalizedRetreatRule,
            status: 'ongoing',
            progressStep,
            totalSteps,
            carryLoad: 0,
            maxCarryLoad: 1,
            carryItems: [],
            visibility: 0,
            morale: 0,
            danger: 0,
            findings: 0,
            frontlinePrep: 0,
            riskState: createInitialRiskState(regionId, normalizedApproach),
            campUsed: true,
            supplies: { rations: 0, medicine: 0, utility: 0 },
            pendingRewardFamilyId: null,
            pendingRewardAmount: 0,
            pendingRewardItems: [],
            pendingEncounter: null,
            queuedEncounterKind: null,
            campState: null,
            encounteredEventIds: [],
            encounterMemory: [],
            nodeHistory: [],
            journal: [],
            recommendedRouteId: null
          }),
          availableActionIds: Array.isArray(raw.campState.availableActionIds)
            ? raw.campState.availableActionIds.filter((entry: unknown): entry is RegionCampActionId =>
                entry === 'rest' || entry === 'sort' || entry === 'mark' || entry === 'scout'
              )
            : ['rest', 'sort', 'mark', 'scout']
        }
      : null
    const riskState = {
      weather:
        raw.riskState?.weather === 'wind' || raw.riskState?.weather === 'fog' || raw.riskState?.weather === 'storm'
          ? (raw.riskState.weather as RegionExpeditionWeather)
          : 'clear',
      pollution: clamp(Math.floor(Number(raw.riskState?.pollution) || 0), 0, 100),
      alertness: clamp(Math.floor(Number(raw.riskState?.alertness) || 0), 0, 100),
      anomaly: clamp(Math.floor(Number(raw.riskState?.anomaly) || 0), 0, 100)
    } satisfies RegionExpeditionRiskState
    const maxCarryLoad = Math.max(1, Math.floor(Number(raw.maxCarryLoad) || 1))
    const carryLoad =
      carryItems.length > 0
        ? clamp(carryItems.reduce((total: number, item: RegionExpeditionCarryItem) => total + item.burden, 0), 0, maxCarryLoad)
        : clamp(Math.floor(Number(raw.carryLoad) || 0), 0, maxCarryLoad)
    const nodeHistory = Array.isArray(raw.nodeHistory)
      ? raw.nodeHistory
          .filter((entry: unknown) => entry && typeof entry === 'object')
          .map((entry: unknown) => {
            const lane =
              (entry as { lane?: unknown }).lane === 'branch' ||
              (entry as { lane?: unknown }).lane === 'deep' ||
              (entry as { lane?: unknown }).lane === 'boss' ||
              (entry as { lane?: unknown }).lane === 'camp'
                ? ((entry as { lane?: RegionExpeditionNodeLane }).lane ?? 'main')
                : 'main'
            return {
              id: typeof (entry as { id?: unknown }).id === 'string' ? String((entry as { id?: unknown }).id) : createSessionToken(),
              step: Math.max(0, Math.floor(Number((entry as { step?: unknown }).step) || 0)),
              lane,
              label: typeof (entry as { label?: unknown }).label === 'string' ? String((entry as { label?: unknown }).label) : '节点记录',
              summary: typeof (entry as { summary?: unknown }).summary === 'string' ? String((entry as { summary?: unknown }).summary) : ''
            } satisfies RegionExpeditionNodeRecord
          })
      : []

    return {
      sessionId: typeof raw.sessionId === 'string' && raw.sessionId ? raw.sessionId : createSessionToken(),
      mode: raw.mode === 'boss' ? 'boss' : 'route',
      regionId,
      routeId,
      bossId,
      targetName,
      startedAtDayTag: typeof raw.startedAtDayTag === 'string' ? raw.startedAtDayTag : '',
      approach: normalizedApproach,
      retreatRule: normalizedRetreatRule,
      status:
        raw.status === 'ready_to_settle' || raw.status === 'victory' || raw.status === 'retreated' || raw.status === 'failure'
          ? raw.status
          : 'ongoing',
      progressStep,
      totalSteps,
      carryLoad,
      maxCarryLoad,
      carryItems,
      visibility: clamp(Math.floor(Number(raw.visibility) || 0), 0, 100),
      morale: clamp(Math.floor(Number(raw.morale) || 0), 0, 100),
      danger: clamp(Math.floor(Number(raw.danger) || 0), 0, 100),
      findings: Math.max(0, Math.floor(Number(raw.findings) || 0)),
      frontlinePrep: Math.max(0, Math.floor(Number(raw.frontlinePrep) || 0)),
      riskState,
      campUsed: Boolean(raw.campUsed),
      supplies: {
        rations: Math.max(0, Math.floor(Number(raw.supplies?.rations) || 0)),
        medicine: Math.max(0, Math.floor(Number(raw.supplies?.medicine) || 0)),
        utility: Math.max(0, Math.floor(Number(raw.supplies?.utility) || 0))
      },
      pendingRewardFamilyId: REGIONAL_RESOURCE_FAMILY_DEFS.some(family => family.id === raw.pendingRewardFamilyId)
        ? (raw.pendingRewardFamilyId as RegionalResourceFamilyId)
        : null,
      pendingRewardAmount: Math.max(0, Math.floor(Number(raw.pendingRewardAmount) || 0)),
      pendingRewardItems,
      pendingEncounter,
      queuedEncounterKind:
        raw.queuedEncounterKind === 'hazard' ||
        raw.queuedEncounterKind === 'cache' ||
        raw.queuedEncounterKind === 'traveler' ||
        raw.queuedEncounterKind === 'support' ||
        raw.queuedEncounterKind === 'anomaly' ||
        raw.queuedEncounterKind === 'boss_prep' ||
        raw.queuedEncounterKind === 'weekly_event'
          ? (raw.queuedEncounterKind as RegionExpeditionEncounterKind)
          : null,
      campState,
      encounteredEventIds,
      encounterMemory,
      nodeHistory: nodeHistory.length > 0 ? nodeHistory : [createNodeRecord(0, raw.mode === 'boss' ? 'boss' : 'main', raw.mode === 'boss' ? '前线集结' : '出发营地', raw.mode === 'boss' ? `你开始逼近「${targetName}」的外围活动范围。` : `你从营地踏上「${targetName}」的前线。`)],
      journal,
      recommendedRouteId:
        typeof raw.recommendedRouteId === 'string' && REGION_ROUTE_DEFS.some(route => route.id === raw.recommendedRouteId)
          ? String(raw.recommendedRouteId)
          : null
    }
  }

  const normalizeJourneyHistory = (raw: any): RegionExpeditionArchiveEntry[] => {
    if (!Array.isArray(raw)) return []
    const normalizedHistory: RegionExpeditionArchiveEntry[] = []
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const normalizedEntry = entry as {
        id?: unknown
        regionId?: unknown
        mode?: unknown
        targetName?: unknown
        startedAtDayTag?: unknown
        endedAtDayTag?: unknown
        outcome?: unknown
        summaryLines?: unknown
        carryItems?: unknown
        journal?: unknown
      }
      const regionId = REGION_DEFS.some(region => region.id === normalizedEntry.regionId)
        ? (normalizedEntry.regionId as RegionId)
        : null
      if (!regionId) continue

      const journal = Array.isArray(normalizedEntry.journal)
        ? normalizedEntry.journal
            .filter((logEntry: unknown) => logEntry && typeof logEntry === 'object')
            .map((logEntry: unknown) => ({
              id: typeof (logEntry as { id?: unknown }).id === 'string' ? String((logEntry as { id?: unknown }).id) : createSessionToken(),
              step: Math.max(0, Math.floor(Number((logEntry as { step?: unknown }).step) || 0)),
              title: typeof (logEntry as { title?: unknown }).title === 'string' ? String((logEntry as { title?: unknown }).title) : '远征记录',
              summary: typeof (logEntry as { summary?: unknown }).summary === 'string' ? String((logEntry as { summary?: unknown }).summary) : '',
              effects: Array.isArray((logEntry as { effects?: unknown }).effects)
                ? ((logEntry as { effects?: unknown[] }).effects ?? []).filter((effect): effect is string => typeof effect === 'string')
                : [],
              tone:
                (logEntry as { tone?: unknown }).tone === 'success' ||
                (logEntry as { tone?: unknown }).tone === 'danger' ||
                (logEntry as { tone?: unknown }).tone === 'accent'
                  ? ((logEntry as { tone?: RegionExpeditionLogEntry['tone'] }).tone ?? 'accent')
                  : 'accent'
            }))
            .slice(-12)
        : []
      const carryItems = Array.isArray(normalizedEntry.carryItems)
        ? normalizedEntry.carryItems
            .filter((item: unknown) => item && typeof item === 'object')
            .map((item: unknown) => ({
              id: typeof (item as { id?: unknown }).id === 'string' ? String((item as { id?: unknown }).id) : createSessionToken(),
              label: typeof (item as { label?: unknown }).label === 'string' ? String((item as { label?: unknown }).label) : '途中收获',
              category:
                (item as { category?: unknown }).category === 'clue' ||
                (item as { category?: unknown }).category === 'refined' ||
                (item as { category?: unknown }).category === 'supply'
                  ? ((item as { category?: RegionExpeditionCarryItemCategory }).category ?? 'resource')
                  : 'resource',
              quantity: Math.max(1, Math.floor(Number((item as { quantity?: unknown }).quantity) || 1)),
              burden: Math.max(1, Math.floor(Number((item as { burden?: unknown }).burden) || 1)),
              note: typeof (item as { note?: unknown }).note === 'string' ? String((item as { note?: unknown }).note) : ''
            }))
        : []

      const archiveEntry: RegionExpeditionArchiveEntry = {
        id: typeof normalizedEntry.id === 'string' ? normalizedEntry.id : createSessionToken(),
        regionId,
        mode: normalizedEntry.mode === 'boss' ? 'boss' : 'route',
        targetName:
          typeof normalizedEntry.targetName === 'string'
            ? normalizedEntry.targetName
            : resolveSessionTargetLabel(regionId, null, null),
        startedAtDayTag: typeof normalizedEntry.startedAtDayTag === 'string' ? normalizedEntry.startedAtDayTag : '',
        endedAtDayTag: typeof normalizedEntry.endedAtDayTag === 'string' ? normalizedEntry.endedAtDayTag : '',
        outcome:
          normalizedEntry.outcome === 'ready_to_settle' ||
          normalizedEntry.outcome === 'retreated' ||
          normalizedEntry.outcome === 'failure'
            ? normalizedEntry.outcome
            : 'victory',
        summaryLines: Array.isArray(normalizedEntry.summaryLines)
          ? normalizedEntry.summaryLines.filter((line: unknown): line is string => typeof line === 'string').slice(0, 6)
          : [],
        carryItems,
        journal
      }
      normalizedHistory.push(archiveEntry)
      if (normalizedHistory.length >= 12) break
    }
    return normalizedHistory
  }

  const deserialize = (data: any) => {
    const fallback = createDefaultRegionMapSaveData()
    if (!data || typeof data !== 'object') {
      saveData.value = fallback
      return
    }

    const unlockStates = { ...fallback.unlockStates }
    for (const region of REGION_DEFS) {
      const raw = data.unlockStates?.[region.id]
      if (!raw || typeof raw !== 'object') continue
      unlockStates[region.id] = {
        unlocked: Boolean((raw as { unlocked?: unknown }).unlocked),
        unlockedDayTag:
          typeof (raw as { unlockedDayTag?: unknown }).unlockedDayTag === 'string'
            ? String((raw as { unlockedDayTag?: unknown }).unlockedDayTag)
            : ''
      }
    }

    const routeStates = { ...fallback.routeStates }
    for (const route of REGION_ROUTE_DEFS) {
      const raw = data.routeStates?.[route.id]
      if (!raw || typeof raw !== 'object') continue
      routeStates[route.id] = {
        routeId: route.id,
        unlocked: Boolean((raw as { unlocked?: unknown }).unlocked),
        completions: Math.max(0, Math.floor(Number((raw as { completions?: unknown }).completions) || 0)),
        lastCompletedDayTag:
          typeof (raw as { lastCompletedDayTag?: unknown }).lastCompletedDayTag === 'string'
            ? String((raw as { lastCompletedDayTag?: unknown }).lastCompletedDayTag)
            : ''
      }
    }

    const eventStates = { ...fallback.eventStates }
    for (const event of REGION_EVENT_DEFS) {
      const raw = data.eventStates?.[event.id]
      if (!raw || typeof raw !== 'object') continue
      eventStates[event.id] = {
        eventId: event.id,
        totalCompletions: Math.max(0, Math.floor(Number(raw.totalCompletions) || 0)),
        weeklyCompletions: Math.max(0, Math.floor(Number(raw.weeklyCompletions) || 0)),
        lastCompletedDayTag: typeof raw.lastCompletedDayTag === 'string' ? raw.lastCompletedDayTag : '',
        lastActivatedWeekId: typeof raw.lastActivatedWeekId === 'string' ? raw.lastActivatedWeekId : ''
      }
    }

    const resourceLedger = { ...fallback.resourceLedger }
    for (const family of REGIONAL_RESOURCE_FAMILY_DEFS) {
      resourceLedger[family.id] = Math.max(0, Math.floor(Number(data.resourceLedger?.[family.id]) || 0))
    }

    const weeklyFocusState = {
      weekId: typeof data.weeklyFocusState?.weekId === 'string' ? data.weeklyFocusState.weekId : '',
      focusedRegionId: REGION_DEFS.some(region => region.id === data.weeklyFocusState?.focusedRegionId)
        ? (data.weeklyFocusState.focusedRegionId as RegionId)
        : null,
      highlightedRouteIds: Array.isArray(data.weeklyFocusState?.highlightedRouteIds)
        ? data.weeklyFocusState.highlightedRouteIds.filter((entry: unknown) => typeof entry === 'string')
        : []
    }

    const weeklyEventState = {
      weekId: typeof data.weeklyEventState?.weekId === 'string' ? data.weeklyEventState.weekId : '',
      activeEventIdsByRegion: createEmptyActiveEventMap(),
      lastRefreshedDayTag: typeof data.weeklyEventState?.lastRefreshedDayTag === 'string' ? data.weeklyEventState.lastRefreshedDayTag : ''
    }
    for (const region of REGION_DEFS) {
      weeklyEventState.activeEventIdsByRegion[region.id] = Array.isArray(data.weeklyEventState?.activeEventIdsByRegion?.[region.id])
        ? data.weeklyEventState.activeEventIdsByRegion[region.id]
            .filter((entry: unknown) => typeof entry === 'string')
            .filter((eventId: string) => REGION_EVENT_DEFS.some(event => event.id === eventId && event.regionId === region.id))
        : []
    }

    const expedition = normalizeExpeditionState({
      activeRegionId: REGION_DEFS.some(region => region.id === data.expedition?.activeRegionId)
        ? (data.expedition.activeRegionId as RegionId)
        : null,
      activeRouteId: typeof data.expedition?.activeRouteId === 'string' ? data.expedition.activeRouteId : null,
      activeBossId: REGION_BOSS_DEFS.some(boss => boss.id === data.expedition?.activeBossId)
        ? String(data.expedition.activeBossId)
        : null,
      startedAtDayTag: typeof data.expedition?.startedAtDayTag === 'string' ? data.expedition.startedAtDayTag : ''
    })

    const activeSession = normalizeExpeditionSession(data.activeSession)
    const journeyHistory = normalizeJourneyHistory(data.journeyHistory)

    const knowledgeState = { ...fallback.knowledgeState }
    for (const region of REGION_DEFS) {
      const raw = data.knowledgeState?.[region.id]
      if (!raw || typeof raw !== 'object') continue
      knowledgeState[region.id] = {
        regionId: region.id,
        intel: clamp(Math.floor(Number((raw as { intel?: unknown }).intel) || 0), 0, 100),
        survey: clamp(Math.floor(Number((raw as { survey?: unknown }).survey) || 0), 0, 100),
        familiarity: clamp(Math.floor(Number((raw as { familiarity?: unknown }).familiarity) || 0), 0, 100),
        lastUpdatedDayTag:
          typeof (raw as { lastUpdatedDayTag?: unknown }).lastUpdatedDayTag === 'string'
            ? String((raw as { lastUpdatedDayTag?: unknown }).lastUpdatedDayTag)
            : ''
      }
    }

    const routeKnowledgeState = { ...fallback.routeKnowledgeState }
    for (const route of REGION_ROUTE_DEFS) {
      const raw = data.routeKnowledgeState?.[route.id]
      if (!raw || typeof raw !== 'object') continue
      routeKnowledgeState[route.id] = {
        routeId: route.id,
        intel: clamp(Math.floor(Number((raw as { intel?: unknown }).intel) || 0), 0, 100),
        surveyProgress: clamp(Math.floor(Number((raw as { surveyProgress?: unknown }).surveyProgress) || 0), 0, 100),
        familiarity: clamp(Math.floor(Number((raw as { familiarity?: unknown }).familiarity) || 0), 0, 100),
        lastUpdatedDayTag:
          typeof (raw as { lastUpdatedDayTag?: unknown }).lastUpdatedDayTag === 'string'
            ? String((raw as { lastUpdatedDayTag?: unknown }).lastUpdatedDayTag)
            : ''
      }
    }

    const mapNodeStates = { ...fallback.mapNodeStates }
    for (const route of REGION_ROUTE_DEFS) {
      const nodeKey = getRouteMapNodeKey(route.id)
      const raw = data.mapNodeStates?.[nodeKey]
      if (!raw || typeof raw !== 'object') continue
      mapNodeStates[nodeKey] = {
        nodeKey,
        regionId: route.regionId,
        routeId: route.id,
        bossId: null,
        nodeType: route.nodeType,
        visibilityStage:
          raw.visibilityStage === 'heard' || raw.visibilityStage === 'surveyed' || raw.visibilityStage === 'mastered'
            ? (raw.visibilityStage as RegionMapNodeVisibilityStage)
            : 'unknown',
        visitCount: Math.max(0, Math.floor(Number(raw.visitCount) || 0)),
        surveyCount: Math.max(0, Math.floor(Number(raw.surveyCount) || 0)),
        lastVisitedDayTag: typeof raw.lastVisitedDayTag === 'string' ? raw.lastVisitedDayTag : ''
      }
    }
    for (const region of REGION_DEFS) {
      const nodeKey = getBossMapNodeKey(region.id)
      const raw = data.mapNodeStates?.[nodeKey]
      if (!raw || typeof raw !== 'object') continue
      mapNodeStates[nodeKey] = {
        nodeKey,
        regionId: region.id,
        routeId: null,
        bossId: getRegionBossDef(region.id)?.id ?? null,
        nodeType: 'boss',
        visibilityStage:
          raw.visibilityStage === 'heard' || raw.visibilityStage === 'surveyed' || raw.visibilityStage === 'mastered'
            ? (raw.visibilityStage as RegionMapNodeVisibilityStage)
            : 'unknown',
        visitCount: Math.max(0, Math.floor(Number(raw.visitCount) || 0)),
        surveyCount: Math.max(0, Math.floor(Number(raw.surveyCount) || 0)),
        lastVisitedDayTag: typeof raw.lastVisitedDayTag === 'string' ? raw.lastVisitedDayTag : ''
      }
    }

    const campStates = { ...fallback.campStates }
    for (const route of REGION_ROUTE_DEFS) {
      const campKey = getCampSiteKey(route.regionId, route.id, null)
      const raw = data.campStates?.[campKey]
      if (!raw || typeof raw !== 'object') continue
      campStates[campKey] = {
        campKey,
        regionId: route.regionId,
        routeId: route.id,
        bossId: null,
        visitCount: Math.max(0, Math.floor(Number(raw.visitCount) || 0)),
        restCount: Math.max(0, Math.floor(Number(raw.restCount) || 0)),
        sortCount: Math.max(0, Math.floor(Number(raw.sortCount) || 0)),
        markCount: Math.max(0, Math.floor(Number(raw.markCount) || 0)),
        scoutCount: Math.max(0, Math.floor(Number(raw.scoutCount) || 0)),
        safetyProgress: Math.max(0, Math.floor(Number(raw.safetyProgress) || 0)),
        stashTier: Math.max(0, Math.floor(Number(raw.stashTier) || 0)),
        lastUsedDayTag: typeof raw.lastUsedDayTag === 'string' ? raw.lastUsedDayTag : ''
      }
    }
    for (const region of REGION_DEFS) {
      const bossId = getRegionBossDef(region.id)?.id ?? null
      const campKey = getCampSiteKey(region.id, null, bossId)
      const raw = data.campStates?.[campKey]
      if (!raw || typeof raw !== 'object') continue
      campStates[campKey] = {
        campKey,
        regionId: region.id,
        routeId: null,
        bossId,
        visitCount: Math.max(0, Math.floor(Number(raw.visitCount) || 0)),
        restCount: Math.max(0, Math.floor(Number(raw.restCount) || 0)),
        sortCount: Math.max(0, Math.floor(Number(raw.sortCount) || 0)),
        markCount: Math.max(0, Math.floor(Number(raw.markCount) || 0)),
        scoutCount: Math.max(0, Math.floor(Number(raw.scoutCount) || 0)),
        safetyProgress: Math.max(0, Math.floor(Number(raw.safetyProgress) || 0)),
        stashTier: Math.max(0, Math.floor(Number(raw.stashTier) || 0)),
        lastUsedDayTag: typeof raw.lastUsedDayTag === 'string' ? raw.lastUsedDayTag : ''
      }
    }

    const shortcutStates = { ...fallback.shortcutStates }
    for (const route of REGION_ROUTE_DEFS) {
      const raw = data.shortcutStates?.[route.id]
      if (!raw || typeof raw !== 'object') continue
      shortcutStates[route.id] = {
        routeId: route.id,
        level:
          raw.level === 'marked' || raw.level === 'shortcut' || raw.level === 'mastered'
            ? (raw.level as RegionShortcutStateLevel)
            : 'none',
        masteryRuns: Math.max(0, Math.floor(Number(raw.masteryRuns) || 0)),
        markedEntrances: Math.max(0, Math.floor(Number(raw.markedEntrances) || 0)),
        lastUpdatedDayTag: typeof raw.lastUpdatedDayTag === 'string' ? raw.lastUpdatedDayTag : ''
      }
    }

    const seasonalRegionStates = { ...fallback.seasonalRegionStates }
    for (const region of REGION_DEFS) {
      const raw = data.seasonalRegionStates?.[region.id]
      if (!raw || typeof raw !== 'object') continue
      seasonalRegionStates[region.id] = {
        regionId: region.id,
        weekId: typeof raw.weekId === 'string' ? raw.weekId : '',
        season: raw.season === 'summer' || raw.season === 'autumn' || raw.season === 'winter' ? raw.season : 'spring',
        weather:
          raw.weather === 'rainy' ||
          raw.weather === 'stormy' ||
          raw.weather === 'snowy' ||
          raw.weather === 'windy' ||
          raw.weather === 'green_rain'
            ? raw.weather
            : 'sunny',
        activeVariantId: typeof raw.activeVariantId === 'string' ? raw.activeVariantId : null,
        activeVariantLabel: typeof raw.activeVariantLabel === 'string' ? raw.activeVariantLabel : '',
        summary: typeof raw.summary === 'string' ? raw.summary : '',
        detailLines: Array.isArray(raw.detailLines) ? raw.detailLines.filter((line: unknown): line is string => typeof line === 'string').slice(0, 6) : [],
        affectedRouteIds: Array.isArray(raw.affectedRouteIds)
          ? raw.affectedRouteIds.filter((entry: unknown): entry is string => typeof entry === 'string')
          : [],
        manualExplorationRequired: Boolean(raw.manualExplorationRequired),
        seenVariantIds: Array.isArray(raw.seenVariantIds)
          ? raw.seenVariantIds.filter((entry: unknown): entry is string => typeof entry === 'string')
          : [],
        lastUpdatedDayTag: typeof raw.lastUpdatedDayTag === 'string' ? raw.lastUpdatedDayTag : ''
      }
    }

    const companionContracts = Array.isArray(data.companionContracts)
      ? data.companionContracts
          .filter((entry: unknown) => entry && typeof entry === 'object')
          .map((raw: any) => ({
            id: typeof raw.id === 'string' ? raw.id : createSessionToken(),
            npcId: typeof raw.npcId === 'string' ? raw.npcId : '',
            npcName: typeof raw.npcName === 'string' ? raw.npcName : '',
            sourceType: raw.sourceType === 'spouse' || raw.sourceType === 'zhiji' ? raw.sourceType : 'helper',
            relationshipStage:
              raw.relationshipStage === 'familiar' ||
              raw.relationshipStage === 'friend' ||
              raw.relationshipStage === 'bestie' ||
              raw.relationshipStage === 'romance' ||
              raw.relationshipStage === 'married' ||
              raw.relationshipStage === 'family'
                ? raw.relationshipStage
                : 'recognize',
            relationshipStageLabel: typeof raw.relationshipStageLabel === 'string' ? raw.relationshipStageLabel : '',
            regionId: REGION_DEFS.some(region => region.id === raw.regionId) ? (raw.regionId as RegionId) : 'ancient_road',
            routeId: typeof raw.routeId === 'string' ? raw.routeId : '',
            assignedDayTag: typeof raw.assignedDayTag === 'string' ? raw.assignedDayTag : '',
            expiresDayTag: typeof raw.expiresDayTag === 'string' ? raw.expiresDayTag : '',
            durationDays: Math.max(1, Math.floor(Number(raw.durationDays) || 1)),
            riskModifier: Math.max(0, Math.floor(Number(raw.riskModifier) || 0)),
            moraleBonus: Math.max(0, Math.floor(Number(raw.moraleBonus) || 0)),
            summary: typeof raw.summary === 'string' ? raw.summary : '',
            chronicleTitle: typeof raw.chronicleTitle === 'string' ? raw.chronicleTitle : '',
            settlementLines: Array.isArray(raw.settlementLines)
              ? raw.settlementLines.filter((line: unknown): line is string => typeof line === 'string').slice(0, 6)
              : [],
            status: raw.status === 'completed' || raw.status === 'failed' ? raw.status : 'active',
            resolvedDayTag: typeof raw.resolvedDayTag === 'string' ? raw.resolvedDayTag : ''
          }))
          .slice(0, 16)
      : []

    const rumorBoard = {
      weekId: typeof data.rumorBoard?.weekId === 'string' ? data.rumorBoard.weekId : '',
      lastRefreshedDayTag: typeof data.rumorBoard?.lastRefreshedDayTag === 'string' ? data.rumorBoard.lastRefreshedDayTag : '',
      entriesByRegion: {
        ancient_road: [] as RegionRumorBoardEntry[],
        mirage_marsh: [] as RegionRumorBoardEntry[],
        cloud_highland: [] as RegionRumorBoardEntry[]
      }
    }
    for (const region of REGION_DEFS) {
      rumorBoard.entriesByRegion[region.id] = Array.isArray(data.rumorBoard?.entriesByRegion?.[region.id])
        ? data.rumorBoard.entriesByRegion[region.id]
            .filter((entry: unknown) => entry && typeof entry === 'object')
            .map((raw: any) => ({
              id: typeof raw.id === 'string' ? raw.id : createSessionToken(),
              regionId: region.id,
              title: typeof raw.title === 'string' ? raw.title : '区域传闻',
              summary: typeof raw.summary === 'string' ? raw.summary : '',
              detailLines: Array.isArray(raw.detailLines)
                ? raw.detailLines.filter((line: unknown): line is string => typeof line === 'string').slice(0, 4)
                : [],
              sourceNpcId: typeof raw.sourceNpcId === 'string' ? raw.sourceNpcId : '',
              sourceNpcName: typeof raw.sourceNpcName === 'string' ? raw.sourceNpcName : '',
              sourceLocation: typeof raw.sourceLocation === 'string' ? raw.sourceLocation : '',
              relationshipStage:
                raw.relationshipStage === 'familiar' ||
                raw.relationshipStage === 'friend' ||
                raw.relationshipStage === 'bestie' ||
                raw.relationshipStage === 'romance' ||
                raw.relationshipStage === 'married' ||
                raw.relationshipStage === 'family'
                  ? raw.relationshipStage
                  : 'recognize',
              relationshipStageLabel: typeof raw.relationshipStageLabel === 'string' ? raw.relationshipStageLabel : '',
              targetRouteId: typeof raw.targetRouteId === 'string' ? raw.targetRouteId : null,
              tags: Array.isArray(raw.tags) ? raw.tags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 8) : [],
              requiresManualExploration: Boolean(raw.requiresManualExploration),
              weekId: typeof raw.weekId === 'string' ? raw.weekId : rumorBoard.weekId,
              fulfilled: Boolean(raw.fulfilled),
              fulfilledDayTag: typeof raw.fulfilledDayTag === 'string' ? raw.fulfilledDayTag : ''
            }))
        : []
    }

    const autoPatrolStates = { ...fallback.autoPatrolStates }
    for (const route of REGION_ROUTE_DEFS) {
      const raw = data.autoPatrolStates?.[route.id]
      if (!raw || typeof raw !== 'object') continue
      autoPatrolStates[route.id] = {
        routeId: route.id,
        enabled: raw.enabled !== false,
        mode: raw.mode === 'ready' || raw.mode === 'blocked' ? raw.mode : 'manual',
        lastAutoSettledDayTag: typeof raw.lastAutoSettledDayTag === 'string' ? raw.lastAutoSettledDayTag : '',
        lastEvaluatedDayTag: typeof raw.lastEvaluatedDayTag === 'string' ? raw.lastEvaluatedDayTag : '',
        blockedReason: typeof raw.blockedReason === 'string' ? raw.blockedReason : '',
        blockedTags: Array.isArray(raw.blockedTags)
          ? raw.blockedTags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 4)
          : []
      }
    }

    const telemetry = {
      totalRouteCompletions: Math.max(0, Math.floor(Number(data.telemetry?.totalRouteCompletions) || 0)),
      bossClears: Math.max(0, Math.floor(Number(data.telemetry?.bossClears) || 0)),
      resourceTurnIns: Math.max(0, Math.floor(Number(data.telemetry?.resourceTurnIns) || 0))
    }

    const bossClearCounts = { ...fallback.bossClearCounts }
    const hasExplicitBossClearCounts = Boolean(data.bossClearCounts && typeof data.bossClearCounts === 'object')
    if (hasExplicitBossClearCounts) {
      for (const region of REGION_DEFS) {
        bossClearCounts[region.id] = Math.max(0, Math.floor(Number(data.bossClearCounts?.[region.id]) || 0))
      }
    } else if (telemetry.bossClears > 0) {
      let remainingLegacyBossClears = telemetry.bossClears
      const candidateRegionIds = REGION_DEFS
        .map(region => region.id)
        .filter(regionId =>
          unlockStates[regionId]?.unlocked ||
          getRegionRoutes(regionId).some(route => (routeStates[route.id]?.completions ?? 0) > 0)
        )

      for (const regionId of candidateRegionIds) {
        if (remainingLegacyBossClears <= 0) break
        bossClearCounts[regionId] = 1
        remainingLegacyBossClears -= 1
      }
    }

    const bossFailureStreaks = { ...fallback.bossFailureStreaks }
    for (const region of REGION_DEFS) {
      bossFailureStreaks[region.id] = Math.max(0, Math.floor(Number(data.bossFailureStreaks?.[region.id]) || 0))
    }

    const lastBossOutcome = {
      regionId: REGION_DEFS.some(region => region.id === data.lastBossOutcome?.regionId)
        ? (data.lastBossOutcome.regionId as RegionId)
        : null,
      bossId: REGION_BOSS_DEFS.some(boss => boss.id === data.lastBossOutcome?.bossId)
        ? String(data.lastBossOutcome.bossId)
        : null,
      outcome: data.lastBossOutcome?.outcome === 'victory' || data.lastBossOutcome?.outcome === 'failure'
        ? data.lastBossOutcome.outcome
        : 'none',
      rewardFamilyId: REGIONAL_RESOURCE_FAMILY_DEFS.some(family => family.id === data.lastBossOutcome?.rewardFamilyId)
        ? (data.lastBossOutcome.rewardFamilyId as RegionalResourceFamilyId)
        : null,
      rewardAmount: Math.max(0, Math.floor(Number(data.lastBossOutcome?.rewardAmount) || 0)),
      resolvedDayTag: typeof data.lastBossOutcome?.resolvedDayTag === 'string' ? data.lastBossOutcome.resolvedDayTag : '',
      summary: typeof data.lastBossOutcome?.summary === 'string' ? data.lastBossOutcome.summary : '',
      recommendedRouteId: typeof data.lastBossOutcome?.recommendedRouteId === 'string' ? data.lastBossOutcome.recommendedRouteId : null,
      failureStreak: Math.max(0, Math.floor(Number(data.lastBossOutcome?.failureStreak) || 0))
    }

    saveData.value = {
      saveVersion: Math.max(1, Math.floor(Number(data.saveVersion) || fallback.saveVersion)),
      unlockStates,
      routeStates,
      eventStates,
      weeklyFocusState,
      weeklyEventState,
      resourceLedger,
      expedition: activeSession
        ? normalizeExpeditionState({
            activeRegionId: activeSession.regionId,
            activeRouteId: activeSession.routeId,
            activeBossId: activeSession.bossId,
            startedAtDayTag: activeSession.startedAtDayTag
          })
        : expedition,
      activeSession,
      journeyHistory,
      knowledgeState,
      routeKnowledgeState,
      mapNodeStates,
      campStates,
      shortcutStates,
      seasonalRegionStates,
      companionContracts,
      rumorBoard,
      autoPatrolStates,
      telemetry,
      bossClearCounts,
      bossFailureStreaks,
      lastBossOutcome
    }
    refreshRouteUnlocks()
    syncStructuralState()
    ensureFrontierWorldSignals()
    if (saveData.value.weeklyFocusState.weekId && saveData.value.weeklyEventState.weekId !== saveData.value.weeklyFocusState.weekId) {
      refreshWeeklyEventRuntime(saveData.value.weeklyFocusState.weekId, saveData.value.weeklyFocusState.focusedRegionId, '')
    }
  }

  if (import.meta.env.DEV) {
    ;(globalThis as any).__TAOYUAN_REGION_MAP_DEBUG__ = {
      clearActiveExpedition: () => {
        clearExpedition()
        return true
      },
      forceUnlockRegion: (regionId: RegionId, unlockedDayTag = '') => {
        if (!REGION_DEFS.some(region => region.id === regionId)) return false
        applyUnlockedRegionState(regionId, unlockedDayTag)
        return true
      },
      setRegionUnlockedForDebug: (regionId: RegionId, unlocked: boolean, unlockedDayTag = '') => {
        if (!REGION_DEFS.some(region => region.id === regionId)) return false
        if (unlocked) {
          applyUnlockedRegionState(regionId, unlockedDayTag)
        } else {
          applyLockedRegionState(regionId)
        }
        return true
      },
      startFirstManualSession: () => {
        clearExpedition()
        const gameStore = useGameStore()
        const dayTag = `${gameStore.year}-${gameStore.season}-${gameStore.day}`
        const route = REGION_ROUTE_DEFS.find(entry => getRouteExpeditionStatus(entry.id).available) ?? null
        if (route) {
          return startRouteExpeditionSession(route.id, dayTag, 'steady', 'balanced')
        }
        const bossRegion = REGION_DEFS.find(entry => getBossExpeditionStatus(entry.id).available) ?? null
        if (bossRegion) {
          return startBossExpeditionSession(bossRegion.id, dayTag, 'steady', 'balanced')
        }
        return { success: false, message: 'no_debug_session_available' }
      }
    }
  }

  return {
    regionDefs: REGION_DEFS,
    routeDefs: REGION_ROUTE_DEFS,
    bossDefs: REGION_BOSS_DEFS,
    eventDefs: REGION_EVENT_DEFS,
    resourceFamilyDefs: REGIONAL_RESOURCE_FAMILY_DEFS,
    featureEnabled,
    expeditionFeatureEnabled,
    resourceFeatureEnabled,
    regionIntegrationEnabled,
    metaState,
    sessionState,
    settlementState,
    saveData,
    regionSummaries,
    unlockedRegionCount,
    hasActiveExpedition,
    activeExpeditionSummary,
    lastBossOutcome,
    frontierDigest,
    regionBossAvailability,
    regionEventEntries,
    activeSession,
    currentExpeditionNodeChoices,
    journeyHistory,
    getRegionKnowledgeState,
    getRouteKnowledgeState,
    getRouteMapNodeState,
    getBossMapNodeState,
    getCampSiteState,
    getShortcutState,
    getRouteNodeVisibilityStage,
    getBossNodeVisibilityStage,
    getRegionVariantSnapshot,
    getRumorBoardForRegion,
    getCompanionContractCandidates,
    assignCompanionContract,
    clearCompanionContract,
    getAutoPatrolStatus,
    ensureFrontierWorldSignals,
    getRouteShortcutProfile,
    getRegionCompletedRouteCount,
    getRegionWeeklyEventCompletions,
    getFamilyResourceQuantity,
    getRouteRewardAmount,
    getBossRewardAmount,
    getRouteUnlockStatus,
    getEventUnlockStatus,
    refreshRouteUnlocks,
    getRouteExpeditionStatus,
    getEventAvailability,
    getBossExpeditionStatus,
    currentWeeklyFocus,
    currentWeeklyEventState,
    resourceLedgerEntries,
    getActiveRegionEvents,
    reset,
    getRegionUnlockProgress,
    refreshUnlocksFromProgress,
    setWeeklyFocus,
    refreshWeeklyEventRuntime,
    ensureWeeklyEventRuntime,
    markRouteCompleted,
    addFamilyResources,
    consumeFamilyResources,
    recordResourceTurnIn,
    startExpedition,
    beginRoute,
    startRouteExpeditionSession,
    startBossExpeditionSession,
    advanceActiveExpedition,
    campActiveExpedition,
    resolveCampAction,
    retreatActiveExpedition,
    resolveActiveEncounter,
    settleActiveExpedition,
    completeRouteAndGrantRewards,
    runRouteExpedition,
    completeEventAndGrantRewards,
    runRegionEvent,
    clearExpedition,
    recordBossClear,
    clearBossAndGrantRewards,
    runBossExpedition,
    serialize,
    deserialize
  }
})
