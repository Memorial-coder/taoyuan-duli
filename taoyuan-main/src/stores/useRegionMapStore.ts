import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  REGION_BOSS_DEFS,
  REGION_DEFS,
  REGION_EVENT_DEFS,
  REGION_ROUTE_DEFS,
  REGIONAL_RESOURCE_FAMILY_DEFS,
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
  RegionId,
  RegionMapSaveData,
  RegionalResourceFamilyId
} from '@/types/region'
import {
  buildPlayerCombatRuntime,
  getDefendHeal,
  getExpectedAttackDamage,
  getExpectedIncomingDamage,
  getLifestealHeal
} from '@/utils/combatRuntime'
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
  const hasActiveExpedition = computed(() => Boolean(saveData.value.expedition.activeRegionId))
  const currentWeeklyFocus = computed(() => saveData.value.weeklyFocusState)
  const currentWeeklyEventState = computed(() => saveData.value.weeklyEventState)
  const resourceLedgerEntries = computed(() =>
    REGIONAL_RESOURCE_FAMILY_DEFS.map(family => ({
      ...family,
      quantity: resourceFeatureEnabled.value ? (saveData.value.resourceLedger[family.id] ?? 0) : 0
    }))
  )
  const activeExpeditionSummary = computed(() => {
    if (!saveData.value.expedition.activeRegionId) return null
    const region = REGION_DEFS.find(entry => entry.id === saveData.value.expedition.activeRegionId) ?? null
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === saveData.value.expedition.activeRouteId) ?? null
    const boss = REGION_BOSS_DEFS.find(entry => entry.id === saveData.value.expedition.activeBossId) ?? null
    return {
      region,
      route,
      boss,
      startedAtDayTag: saveData.value.expedition.startedAtDayTag
    }
  })
  const lastBossOutcome = computed(() => saveData.value.lastBossOutcome)

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
    if (saveData.value.expedition.activeRegionId) {
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

    if (saveData.value.expedition.activeRegionId) {
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
        const score =
          (highlightedRouteIds.has(route.id) ? 4 : 0) +
          (completions <= 0 ? 3 : 0) +
          (route.nodeType === 'route' ? 2 : route.nodeType === 'handoff' ? 1 : 0) +
          Math.max(0, 2 - completions)
        return { route, score }
      })
      .sort((left, right) => right.score - left.score)[0]?.route ?? null
  }

  const getBossExpeditionStatus = (regionId: RegionId) => {
    const boss = getRegionBossDef(regionId)
    if (!saveData.value.unlockStates[regionId]?.unlocked) {
      return { available: false, reason: '该区域尚未解锁。' }
    }
    if (saveData.value.expedition.activeRegionId) {
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
      ? `，获得 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}`
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
      message: `已完成事件「${event.name}」。${timeResult.message ? `${timeResult.message} ` : ''}${result.rewardAmount > 0 ? `获得 ${result.rewardAmount} 点区域资源` : '已完成本次事件推进'}${result.rewardItems.length > 0 ? `，并带回 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''}。`.trim()
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
      ? `，获得 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}`
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
    telemetry: { ...saveData.value.telemetry },
    bossClearCounts: { ...saveData.value.bossClearCounts },
    bossFailureStreaks: { ...saveData.value.bossFailureStreaks },
    lastBossOutcome: { ...saveData.value.lastBossOutcome }
  })

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
      expedition,
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
