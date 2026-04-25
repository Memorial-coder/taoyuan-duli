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
  getRegionBossDef,
  getRegionEvents,
  getRegionRoutes
} from '@/data/regions'
import { addLog, showFloat } from '@/composables/useGameLog'
import { getEnchantmentById, getWeaponById } from '@/data/weapons'
import type {
  ExpeditionRuntimeState,
  RegionBossDef,
  RegionExpeditionApproach,
  RegionExpeditionEncounter,
  RegionExpeditionEncounterOption,
  RegionExpeditionArchiveEntry,
  RegionKnowledgeState,
  RegionExpeditionLogEntry,
  RegionExpeditionRetreatRule,
  RegionExpeditionSession,
  RegionId,
  RegionMapSaveData,
  RegionRouteKnowledgeState,
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
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useVillageProjectStore } from './useVillageProjectStore'

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

  const getRegionKnowledgeState = (regionId: RegionId) => saveData.value.knowledgeState[regionId] ?? createEmptyRegionKnowledgeState(regionId)

  const getRouteKnowledgeState = (routeId: string) => saveData.value.routeKnowledgeState[routeId] ?? createEmptyRouteKnowledgeState(routeId)

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
    return next
  }

  const getRouteShortcutProfile = (routeId: string) => {
    const state = getRouteKnowledgeState(routeId)
    if (state.familiarity >= 85 && state.surveyProgress >= 80) {
      return {
        level: 'mastered' as const,
        label: '熟路',
        stepReduction: 1,
        visibilityBonus: 8,
        dangerReduction: 4,
        supplyBonus: { rations: 1, utility: 1 }
      }
    }
    if (state.familiarity >= 60 && state.surveyProgress >= 55) {
      return {
        level: 'shortcut' as const,
        label: '捷径已立',
        stepReduction: 1,
        visibilityBonus: 5,
        dangerReduction: 2,
        supplyBonus: { rations: 0, utility: 1 }
      }
    }
    if (state.familiarity >= 35 || state.surveyProgress >= 40) {
      return {
        level: 'marked' as const,
        label: '路标渐明',
        stepReduction: 0,
        visibilityBonus: 3,
        dangerReduction: 1,
        supplyBonus: { rations: 0, utility: 0 }
      }
    }
    return {
      level: 'none' as const,
      label: '陌生路段',
      stepReduction: 0,
      visibilityBonus: 0,
      dangerReduction: 0,
      supplyBonus: { rations: 0, utility: 0 }
    }
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
    const highlightSummaries: string[] = []
    const nextHookSummaries: string[] = []

    if (focusedRegion?.unlocked) {
      highlightSummaries.push(`本周焦点：${focusedRegion.name}`)
      nextHookSummaries.push(`优先承接：${focusedRegion.linkedSystems.slice(0, 2).join(' / ')}`)
      const focusedKnowledge = getRegionKnowledgeState(focusedRegion.id)
      if (focusedKnowledge.intel > 0 || focusedKnowledge.survey > 0) {
        highlightSummaries.push(`地图认知：情报 ${focusedKnowledge.intel} / 勘明 ${focusedKnowledge.survey}`)
      }
      const focusedEvents = getActiveRegionEvents(focusedRegion.id).map(event => event.name)
      if (focusedEvents.length > 0) {
        highlightSummaries.push(`本周事件：${focusedEvents.join(' / ')}`)
      }
    }

    if (activeExpeditionSummary.value?.region) {
      highlightSummaries.push(`进行中远征：${activeExpeditionSummary.value.region.name}`)
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
      headline: focusedRegion?.name ?? '行旅图摘要',
      highlightSummaries: [...new Set(highlightSummaries)].slice(0, 4),
      nextHookSummaries: [...new Set(nextHookSummaries)].slice(0, 4)
    }
  })

  const reset = () => {
    saveData.value = createDefaultRegionMapSaveData()
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
      unlockRegion(region.id, dayTag)
      unlockedRegionIds.push(region.id)
    }
    return unlockedRegionIds
  }

  const unlockRegion = (regionId: RegionId, unlockedDayTag = '') => {
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
    if (saveData.value.weeklyFocusState.weekId) {
      refreshWeeklyEventRuntime(saveData.value.weeklyFocusState.weekId, saveData.value.weeklyFocusState.focusedRegionId, unlockedDayTag)
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
      addRegionKnowledge(route.regionId, { intel: 6, survey: 8, familiarity: 4 }, dayTag)
      addRouteKnowledge(route.id, { intel: 8, surveyProgress: 12, familiarity: 10 }, dayTag)
      refreshRouteUnlocks(route.regionId)
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
    pendingRewardItems: session.pendingRewardItems.map(item => ({ ...item })),
    pendingEncounter: cloneEncounter(session.pendingEncounter),
    encounteredEventIds: [...session.encounteredEventIds],
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

  const createGenericEncounter = (session: RegionExpeditionSession): RegionExpeditionEncounter => {
    const kind: RegionExpeditionEncounter['kind'] =
      session.mode === 'boss' && session.progressStep >= Math.max(1, session.totalSteps - 1)
        ? 'boss_prep'
        : session.danger >= 45 || session.visibility <= 45
          ? 'hazard'
          : session.approach === 'greedy'
            ? 'cache'
            : 'traveler'

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
      boss_prep: {
        title: '决战前夜',
        summary: '首领区域前的最后准备窗口已经出现，你可以调整最后的进入姿态。',
        risk: 'high',
        detailLines: ['准备充分会改善最终决战状态。', '若急于突入，可能用更高风险换取更高收益。']
      }
    }

    const config = encounterConfig[kind]
    return {
      id: createSessionToken(),
      step: session.progressStep,
      kind,
      title: config.title,
      summary: config.summary,
      detailLines: [...config.detailLines],
      risk: config.risk,
      sourceEventId: null,
      rewardFamilyId: session.pendingRewardFamilyId,
      rewardAmount: kind === 'cache' ? 2 : kind === 'traveler' ? 1 : kind === 'boss_prep' ? 2 : 1,
      rewardItems: [],
      options: createEncounterOptions(kind)
    }
  }

  const createStepEncounter = (session: RegionExpeditionSession): RegionExpeditionEncounter | null => {
    if (session.progressStep <= 0 || session.progressStep >= session.totalSteps) return null

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
      session.visibility <= 52

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
      summaryLines: summaryLines.filter(Boolean).slice(0, 6),
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
    const regionKnowledge = getRegionKnowledgeState(route.regionId)
    const routeKnowledge = getRouteKnowledgeState(route.id)
    const shortcutProfile = getRouteShortcutProfile(route.id)
    const supplies = createDefaultRegionExpeditionSupplyState()
    if (approach === 'scout') supplies.utility += 1
    if (approach === 'greedy') supplies.rations = Math.max(1, supplies.rations - 1)
    if (route.nodeType === 'elite') supplies.medicine += 1
    supplies.rations += shortcutProfile.supplyBonus.rations
    supplies.utility += shortcutProfile.supplyBonus.utility

    const baseSteps = route.nodeType === 'elite' ? 4 : 3
    const totalSteps = Math.max(2, baseSteps - shortcutProfile.stepReduction)
    const visibilityBonus = Math.floor((regionKnowledge.intel + routeKnowledge.intel + routeKnowledge.surveyProgress) / 24) + shortcutProfile.visibilityBonus
    const dangerMitigation = Math.floor((regionKnowledge.familiarity + routeKnowledge.familiarity) / 30) + shortcutProfile.dangerReduction
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
      visibility: clamp((approach === 'scout' ? 76 : approach === 'greedy' ? 45 : 60) + visibilityBonus, 0, 100),
      morale: clamp((approach === 'greedy' ? 54 : approach === 'scout' ? 60 : 66) + moraleBonus, 0, 100),
      danger: clamp((route.nodeType === 'elite' ? 24 : route.nodeType === 'handoff' ? 14 : 12) - dangerMitigation, 0, 100),
      findings: 0,
      campUsed: false,
      supplies,
      pendingRewardFamilyId: route.primaryResourceFamilyId,
      pendingRewardAmount: getRouteRewardAmount(route.id),
      pendingRewardItems: (ROUTE_ITEM_REWARDS[route.id] ?? []).map(item => ({ ...item })),
      pendingEncounter: null,
      encounteredEventIds: [],
      journal: [],
      recommendedRouteId: null
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
            : ''
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
    const supplies = createDefaultRegionExpeditionSupplyState()
    supplies.medicine += 1
    if (approach === 'scout') supplies.utility += 1
    if (approach === 'greedy') supplies.rations = Math.max(1, supplies.rations - 1)

    const visibilityBonus = Math.floor((regionKnowledge.intel + regionKnowledge.survey) / 28)
    const dangerMitigation = Math.floor(regionKnowledge.familiarity / 22)
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
      visibility: clamp((approach === 'scout' ? 68 : 52) + visibilityBonus, 0, 100),
      morale: clamp((approach === 'greedy' ? 52 : 64) + Math.floor(regionKnowledge.familiarity / 30), 0, 100),
      danger: clamp(28 - dangerMitigation, 0, 100),
      findings: 1,
      campUsed: false,
      supplies,
      pendingRewardFamilyId: boss.rewardFamilyId,
      pendingRewardAmount: getBossRewardAmount(regionId),
      pendingRewardItems: (BOSS_ITEM_REWARDS[regionId] ?? []).map(item => ({ ...item })),
      pendingEncounter: null,
      encounteredEventIds: [],
      journal: [],
      recommendedRouteId: null
    }
    appendSessionJournal(
      session,
      '首领远征就绪',
      `你开始逼近「${boss.name}」的活动范围，准备逐段压缩前线空间。`,
      [
        '已切换为多阶段首领远征，可途中扎营、撤退或收束。',
        visibilityBonus > 0 || dangerMitigation > 0 ? `区域认知提供了额外准备：视野 +${visibilityBonus}，前线压力 -${dangerMitigation}。` : '该区域深层仍缺少足够认知，决战前需要边推进边摸清。'
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

  const advanceActiveExpedition = (_dayTag = '') => {
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
    const stepTimeHours = getSessionStepTimeHours(session)
    const timeResult = gameStore.advanceTime(stepTimeHours, { skipSpeedBuff: true })
    const effects: string[] = []

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
    session.visibility = clamp(session.visibility + (session.approach === 'scout' ? 6 : session.approach === 'greedy' ? -3 : 2), 0, 100)
    session.morale = clamp(session.morale + (session.approach === 'greedy' ? -2 : 1), 0, 100)
    session.danger = clamp(session.danger + (session.mode === 'boss' ? 10 : routeDef?.nodeType === 'elite' ? 8 : 6) + (session.approach === 'greedy' ? 3 : 0), 0, 100)
    session.findings += session.approach === 'greedy' ? 3 : session.approach === 'scout' ? 2 : 2
    session.carryLoad = clamp(session.carryLoad + (session.approach === 'greedy' ? 2 : 1), 0, session.maxCarryLoad)
    const regionKnowledge = addRegionKnowledge(
      session.regionId,
      {
        intel: session.approach === 'scout' ? 5 : session.approach === 'greedy' ? 2 : 3,
        survey: session.mode === 'boss' ? 2 : 3,
        familiarity: session.mode === 'boss' ? 1 : 2
      },
      _dayTag
    )
    effects.push(`区域认知提升：情报 ${regionKnowledge.intel}/100，勘明 ${regionKnowledge.survey}/100。`)
    if (session.routeId) {
      const routeKnowledge = addRouteKnowledge(
        session.routeId,
        {
          intel: routeDef?.nodeType === 'elite' ? 5 : 4,
          surveyProgress: routeDef?.nodeType === 'handoff' ? 3 : 5,
          familiarity: stepNumber >= session.totalSteps ? 8 : 4
        },
        _dayTag
      )
      effects.push(`路线熟悉度提升：勘明 ${routeKnowledge.surveyProgress}/100，熟悉 ${routeKnowledge.familiarity}/100。`)
    }

    let summary = `你推进了第 ${stepNumber}/${session.totalSteps} 段。`
    let tone: RegionExpeditionLogEntry['tone'] = 'accent'

    if (session.mode === 'boss' && stepNumber >= session.totalSteps) {
      const boss = getRegionBossDef(session.regionId)
      if (boss) {
        const combatResult = simulateBossExpedition(session.regionId, boss)
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
      summary = `你已完成 ${session.targetName} 的前线推进，可以回城清点战利品。`
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
        effects.push(`途中出现了新的遭遇：${encounter.title}。`)
      }
    }

    appendSessionJournal(session, `推进第 ${stepNumber} 段`, summary, effects, tone)
    persistActiveSession(session)
    showFloat(session.status === 'failure' ? '远征失利' : session.status === 'ready_to_settle' ? '远征收束' : '远征推进', tone)

    return {
      success: true,
      message: `${summary}${timeResult.message ? ` ${timeResult.message}` : ''}`.trim(),
      title: session.status === 'failure' ? '远征失利' : session.status === 'ready_to_settle' ? '远征可收束' : '远征推进',
      lines: [
        `目标：${session.targetName}`,
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

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const timeResult = gameStore.advanceTime(0.25, { skipSpeedBuff: true })
    const effects: string[] = []
    let recoverAmount = 10

    if (session.supplies.rations > 0) {
      session.supplies.rations -= 1
      recoverAmount += 6
      effects.push('消耗 1 份口粮稳定队伍状态。')
    }
    if (session.supplies.medicine > 0) {
      session.supplies.medicine -= 1
      recoverAmount += 8
      effects.push('消耗 1 份药剂修整伤势。')
    }
    if (session.supplies.utility > 0) {
      session.supplies.utility -= 1
      session.visibility = clamp(session.visibility + 6, 0, 100)
      effects.push('消耗 1 份器具加固营地与标记。')
    }

    playerStore.restoreHealth(recoverAmount)
    session.campUsed = true
    session.morale = clamp(session.morale + 14, 0, 100)
    session.danger = clamp(session.danger - 10, 0, 100)
    const regionKnowledge = addRegionKnowledge(session.regionId, { intel: 2, survey: 5, familiarity: 2 }, _dayTag)
    effects.push(`扎营勘察让区域勘明提升至 ${regionKnowledge.survey}/100。`)
    if (session.routeId) {
      const routeKnowledge = addRouteKnowledge(session.routeId, { intel: 2, surveyProgress: 6, familiarity: 4 }, _dayTag)
      effects.push(`沿途标记更新：路线勘明 ${routeKnowledge.surveyProgress}/100，熟悉 ${routeKnowledge.familiarity}/100。`)
    }
    appendSessionJournal(session, '途中扎营', `你在 ${session.targetName} 途中完成了一次整备。`, [`恢复 ${recoverAmount} 点生命。`, ...effects], 'success')

    if (session.retreatRule === 'after_camp') {
      session.status = 'retreated'
      session.recommendedRouteId = getRecommendedRecoveryRoute(session.regionId)?.id ?? null
      appendSessionJournal(session, '扎营后收束', '按照预设撤退规则，队伍决定带着现有记录回城。', [], 'accent')
    }

    persistActiveSession(session)
    showFloat('途中扎营', 'success')
    return {
      success: true,
      message: `已完成一次途中扎营。${timeResult.message ? ` ${timeResult.message}` : ''}`.trim(),
      title: '扎营完成',
      lines: [
        `目标：${session.targetName}`,
        `生命 ${playerStore.hp}/${playerStore.getMaxHp()}｜士气 ${session.morale}｜风险 ${session.danger}`,
        ...effects,
        session.retreatRule === 'after_camp' ? '已按预设规则切换为回撤收束。' : ''
      ].filter(Boolean),
      tone: 'success' as const
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
    let tone: RegionExpeditionLogEntry['tone'] = optionId === 'bold' ? 'danger' : optionId === 'balanced' ? 'success' : 'accent'
    let summary = `你处理了「${encounter.title}」。`
    let rewardMultiplier = optionId === 'cautious' ? 0.7 : optionId === 'bold' ? 1.5 : 1

    if (encounter.kind === 'hazard') {
      session.danger = clamp(session.danger + (optionId === 'bold' ? 8 : optionId === 'balanced' ? 2 : -6), 0, 100)
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 4 : optionId === 'bold' ? -4 : 0), 0, 100)
      const damage = optionId === 'bold' ? 7 : optionId === 'balanced' ? 4 : 1
      const actualDamage = playerStore.takeDamage(damage)
      if (actualDamage > 0) effects.push(`额外承受 ${actualDamage} 点伤害。`)
      if (optionId === 'cautious') effects.push('你压住了前线暴露，风险明显下降。')
      if (optionId === 'bold') effects.push('你强行闯过险段，队伍暴露大幅提升。')
    } else if (encounter.kind === 'cache') {
      session.carryLoad = clamp(session.carryLoad + (optionId === 'bold' ? 2 : 1), 0, session.maxCarryLoad)
      session.findings += optionId === 'bold' ? 2 : 1
      session.morale = clamp(session.morale + (optionId === 'cautious' ? 1 : optionId === 'balanced' ? 2 : 3), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 5 : 1), 0, 100)
      effects.push(optionId === 'bold' ? '你让队伍深入翻查，额外榨出了一批沿途收获。' : '你收稳了可见物资，继续保持推进节奏。')
    } else if (encounter.kind === 'traveler') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 6 : optionId === 'balanced' ? 4 : 2), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 3 : 2), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 3 : -2), 0, 100)
      if (optionId === 'cautious' && session.supplies.rations > 0) {
        session.supplies.rations -= 1
        effects.push('你分出 1 份口粮换取了更清晰的前路线索。')
      } else {
        effects.push('你从路上痕迹中整理出一批可用情报。')
      }
    } else if (encounter.kind === 'boss_prep') {
      session.visibility = clamp(session.visibility + (optionId === 'cautious' ? 4 : optionId === 'balanced' ? 2 : 0), 0, 100)
      session.morale = clamp(session.morale + (optionId === 'bold' ? 4 : optionId === 'balanced' ? 2 : 1), 0, 100)
      session.danger = clamp(session.danger + (optionId === 'bold' ? 6 : optionId === 'balanced' ? 1 : -4), 0, 100)
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

    if (optionId === 'bold') {
      session.findings += 1
      session.carryLoad = clamp(session.carryLoad + (encounter.kind === 'hazard' ? 0 : 1), 0, session.maxCarryLoad)
    }

    if (optionId === 'cautious' && encounter.kind !== 'hazard') {
      session.danger = clamp(session.danger - 2, 0, 100)
    }

    summary =
      optionId === 'bold'
        ? `你以强势方式处理了「${encounter.title}」，换来了更高收益，也抬高了风险。`
        : optionId === 'balanced'
          ? `你按计划处理了「${encounter.title}」，队伍节奏维持稳定。`
          : `你谨慎应对了「${encounter.title}」，优先保住了前线状态。`

    const encounterIntelGain = encounter.kind === 'weekly_event' ? 6 : encounter.kind === 'traveler' ? 5 : encounter.kind === 'boss_prep' ? 4 : 3
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

  const simulateBossExpedition = (regionId: RegionId, boss: RegionBossDef) => {
    const { playerHp, maxHp, weaponLabel, runtime } = buildRegionBossPlayerRuntime()
    const completedRouteCount = getRegionCompletedRouteCount(regionId)
    const weeklyEventCompletions = getRegionWeeklyEventCompletions(regionId)
    const familyStock = getFamilyResourceQuantity(boss.rewardFamilyId)
    const failureStreak = saveData.value.bossFailureStreaks[regionId] ?? 0
    const focusBonus = currentWeeklyFocus.value.focusedRegionId === regionId ? 1 : 0
    const supportDamageBonus = completedRouteCount * 2 + weeklyEventCompletions * 2 + Math.min(6, familyStock) + focusBonus * 2 + failureStreak
    const supportMitigation = Math.min(0.35, weeklyEventCompletions * 0.04 + failureStreak * 0.05 + focusBonus * 0.03)

    const phaseLines: string[] = []
    let projectedHp = playerHp
    for (const phase of boss.phases) {
      const expectedDamage = getExpectedAttackDamage(runtime.attack, phase.enemyDefense)
      const effectiveDamagePerRound = Math.max(1, Math.ceil(expectedDamage + supportDamageBonus))
      const rounds = Math.max(1, Math.ceil(phase.enemyHp / effectiveDamagePerRound))
      const expectedIncomingPerRound = getExpectedIncomingDamage(phase.enemyAttack, runtime.defense, Math.max(0.55, 1 - runtime.attack.stunChance! * 0.4))
      const phaseDamageTaken = Math.max(1, Math.ceil(rounds * expectedIncomingPerRound * (1 - supportMitigation)))
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
          supportSummary: `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 资源库存 ${familyStock} / 失败保底 ${failureStreak}`,
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
      supportSummary: `路线 ${completedRouteCount} / 事件 ${weeklyEventCompletions} / 资源库存 ${familyStock} / 焦点加成 ${focusBonus > 0 ? '有' : '无'}`
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
    const pendingRewardItems = Array.isArray(raw.pendingRewardItems)
      ? raw.pendingRewardItems
          .filter((item: unknown) => item && typeof item === 'object')
          .map((item: unknown) => ({
            itemId: typeof (item as { itemId?: unknown }).itemId === 'string' ? String((item as { itemId?: unknown }).itemId) : '',
            quantity: Math.max(0, Math.floor(Number((item as { quantity?: unknown }).quantity) || 0))
          }))
          .filter((item: { itemId: string; quantity: number }) => item.itemId && item.quantity > 0)
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

    return {
      sessionId: typeof raw.sessionId === 'string' && raw.sessionId ? raw.sessionId : createSessionToken(),
      mode: raw.mode === 'boss' ? 'boss' : 'route',
      regionId,
      routeId,
      bossId,
      targetName,
      startedAtDayTag: typeof raw.startedAtDayTag === 'string' ? raw.startedAtDayTag : '',
      approach: raw.approach === 'scout' || raw.approach === 'greedy' ? raw.approach : 'steady',
      retreatRule:
        raw.retreatRule === 'low_hp' || raw.retreatRule === 'pack_full' || raw.retreatRule === 'after_camp'
          ? raw.retreatRule
          : 'balanced',
      status:
        raw.status === 'ready_to_settle' || raw.status === 'victory' || raw.status === 'retreated' || raw.status === 'failure'
          ? raw.status
          : 'ongoing',
      progressStep,
      totalSteps,
      carryLoad: clamp(Math.floor(Number(raw.carryLoad) || 0), 0, Math.max(1, Math.floor(Number(raw.maxCarryLoad) || 1))),
      maxCarryLoad: Math.max(1, Math.floor(Number(raw.maxCarryLoad) || 1)),
      visibility: clamp(Math.floor(Number(raw.visibility) || 0), 0, 100),
      morale: clamp(Math.floor(Number(raw.morale) || 0), 0, 100),
      danger: clamp(Math.floor(Number(raw.danger) || 0), 0, 100),
      findings: Math.max(0, Math.floor(Number(raw.findings) || 0)),
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
      encounteredEventIds,
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
      telemetry,
      bossClearCounts,
      bossFailureStreaks,
      lastBossOutcome
    }
    refreshRouteUnlocks()
    if (saveData.value.weeklyFocusState.weekId && saveData.value.weeklyEventState.weekId !== saveData.value.weeklyFocusState.weekId) {
      refreshWeeklyEventRuntime(saveData.value.weeklyFocusState.weekId, saveData.value.weeklyFocusState.focusedRegionId, '')
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
    journeyHistory,
    getRegionKnowledgeState,
    getRouteKnowledgeState,
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
    unlockRegion,
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
