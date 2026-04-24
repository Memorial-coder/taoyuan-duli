import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  REGION_BOSS_DEFS,
  REGION_DEFS,
  REGION_ROUTE_DEFS,
  REGIONAL_RESOURCE_FAMILY_DEFS,
  createDefaultRegionMapSaveData,
  getRegionBossDef,
  getRegionRoutes
} from '@/data/regions'
import { useSettingsStore } from './useSettingsStore'
import { useAchievementStore } from './useAchievementStore'
import { useFishPondStore } from './useFishPondStore'
import { useGameStore } from './useGameStore'
import { useGuildStore } from './useGuildStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useInventoryStore } from './useInventoryStore'
import { useMuseumStore } from './useMuseumStore'
import { usePlayerStore } from './usePlayerStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import type { RegionId, RegionMapSaveData, RegionalResourceFamilyId } from '@/types/region'
import { addLog, showFloat } from '@/composables/useGameLog'

const ROUTE_ITEM_REWARDS: Record<string, Array<{ itemId: string; quantity: number }>> = {
  ancient_road_supply_relay: [{ itemId: 'ancient_waybill', quantity: 1 }],
  ancient_road_archive_recovery: [{ itemId: 'archive_rubbing', quantity: 1 }],
  ancient_road_convoy_risk: [{ itemId: 'relay_beacon_tag', quantity: 1 }],
  mirage_marsh_night_watch: [{ itemId: 'marsh_spore_sample', quantity: 1 }],
  mirage_marsh_specimen_drive: [{ itemId: 'luminous_algae', quantity: 1 }],
  mirage_marsh_ecology_alert: [{ itemId: 'marsh_glow_pod', quantity: 1 }],
  cloud_highland_patrol: [{ itemId: 'ley_crystal_shard', quantity: 1 }],
  cloud_highland_ley_crack: [{ itemId: 'wind_etched_core', quantity: 1 }]
}

const BOSS_ITEM_REWARDS: Record<RegionId, Array<{ itemId: string; quantity: number }>> = {
  ancient_road: [{ itemId: 'archive_rubbing', quantity: 2 }],
  mirage_marsh: [{ itemId: 'luminous_algae', quantity: 2 }],
  cloud_highland: [{ itemId: 'wind_etched_core', quantity: 2 }]
}

export const useRegionMapStore = defineStore('regionMap', () => {
  const settingsStore = useSettingsStore()
  const saveData = ref<RegionMapSaveData>(createDefaultRegionMapSaveData())

  const featureEnabled = computed(() => settingsStore.isFeatureEnabled('lateGameRegionMap'))
  const expeditionFeatureEnabled = computed(() => featureEnabled.value && settingsStore.isFeatureEnabled('lateGameExpeditionBoss'))
  const resourceFeatureEnabled = computed(() => featureEnabled.value && settingsStore.isFeatureEnabled('lateGameRegionalResources'))
  const regionIntegrationEnabled = computed(() => expeditionFeatureEnabled.value || resourceFeatureEnabled.value)

  const regionSummaries = computed(() =>
    REGION_DEFS.map(region => {
      const unlockState = saveData.value.unlockStates[region.id]
      const routes = getRegionRoutes(region.id)
      const completedRouteCount = routes.filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0).length
      const unlockedRouteCount = routes.filter(route => saveData.value.routeStates[route.id]?.unlocked).length
      return {
        ...region,
        unlocked: unlockState?.unlocked ?? false,
        unlockedDayTag: unlockState?.unlockedDayTag ?? '',
        routeCount: routes.length,
        unlockedRouteCount,
        completedRouteCount,
        boss: getRegionBossDef(region.id)
      }
    })
  )

  const unlockedRegionCount = computed(() => regionSummaries.value.filter(region => region.unlocked).length)
  const hasActiveExpedition = computed(() => Boolean(saveData.value.expedition.activeRegionId))
  const currentWeeklyFocus = computed(() => saveData.value.weeklyFocusState)
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
  const getRegionCompletedRouteCount = (regionId: RegionId) =>
    getRegionRoutes(regionId).filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0).length

  const getFamilyResourceQuantity = (familyId: RegionalResourceFamilyId) =>
    resourceFeatureEnabled.value ? (saveData.value.resourceLedger[familyId] ?? 0) : 0

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
  const getBossExpeditionStatus = (regionId: RegionId) => {
    const boss = getRegionBossDef(regionId)
    if (!saveData.value.unlockStates[regionId]?.unlocked) {
      return { available: false, reason: '该区域尚未解锁。' }
    }
    if (!expeditionFeatureEnabled.value) {
      return { available: false, reason: '远征首领功能当前未开启。' }
    }
    const completedRouteCount = getRegionRoutes(regionId)
      .filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0)
      .length
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
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { available: false, reason: '背包空间不足，无法带回首领奖励。' }
    }
    return { available: true, reason: '' }
  }
  const regionBossAvailability = computed(() =>
    REGION_DEFS.map(region => {
      const boss = getRegionBossDef(region.id)
      const completedRouteCount = getRegionRoutes(region.id)
        .filter(route => (saveData.value.routeStates[route.id]?.completions ?? 0) > 0)
        .length
      const status = getBossExpeditionStatus(region.id)
      return {
        regionId: region.id,
        bossId: boss?.id ?? null,
        available: status.available,
        disabledReason: status.reason,
        completedRouteCount
      }
    })
  )

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
          ready: guildStore.guildLevel >= 3 || achievementStore.stats.highestMineFloor >= 40 || villageProjectStore.villageProjectLevel >= 4,
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
  }

  const setWeeklyFocus = (weekId: string, focusedRegionId: RegionId | null, highlightedRouteIds: string[] = []) => {
    saveData.value.weeklyFocusState = {
      weekId,
      focusedRegionId,
      highlightedRouteIds: [...new Set(highlightedRouteIds.filter(Boolean))]
    }
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

  const completeRouteAndGrantRewards = (routeId: string, dayTag = '') => {
    const inventoryStore = useInventoryStore()
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return null
    if (!getRouteUnlockStatus(routeId).unlocked) return null
    markRouteCompleted(route.id, dayTag)
    addFamilyResources(route.primaryResourceFamilyId, route.nodeType === 'elite' ? 3 : 2)
    const rewardItems = ROUTE_ITEM_REWARDS[route.id] ?? []
    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
    }
    return {
      routeId: route.id,
      regionId: route.regionId,
      familyId: route.primaryResourceFamilyId,
      rewardAmount: route.nodeType === 'elite' ? 3 : 2,
      rewardItems
    }
  }

  const runRouteExpedition = (routeId: string, dayTag = '') => {
    const route = REGION_ROUTE_DEFS.find(entry => entry.id === routeId)
    if (!route) return { success: false, message: '路线不存在。' }
    const status = getRouteExpeditionStatus(routeId)
    if (!status.available) {
      return { success: false, message: status.reason }
    }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(route.staminaCost)) {
      return { success: false, message: `体力不足，需要 ${route.staminaCost} 点体力。` }
    }

    const timeResult = gameStore.advanceTime(route.timeCostHours, { skipSpeedBuff: true })
    const result = completeRouteAndGrantRewards(route.id, dayTag)
    if (!result) {
      playerStore.restoreStamina(route.staminaCost)
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

  const clearExpedition = () => {
    saveData.value.expedition = {
      activeRegionId: null,
      activeRouteId: null,
      activeBossId: null,
      startedAtDayTag: ''
    }
  }

  const recordBossClear = () => {
    if (!expeditionFeatureEnabled.value) return false
    saveData.value.telemetry.bossClears += 1
    return true
  }

  const clearBossAndGrantRewards = (regionId: RegionId) => {
    if (!saveData.value.unlockStates[regionId]?.unlocked) return null
    const inventoryStore = useInventoryStore()
    const route = REGION_ROUTE_DEFS.find(entry => entry.regionId === regionId) ?? null
    const familyId = route?.primaryResourceFamilyId ?? 'ley_crystal'
    if (!recordBossClear()) return null
    addFamilyResources(familyId, 4)
    const rewardItems = BOSS_ITEM_REWARDS[regionId] ?? []
    if (rewardItems.length > 0 && inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.addItemsExact(rewardItems)
    }
    return {
      regionId,
      familyId,
      rewardAmount: 4,
      rewardItems
    }
  }

  const runBossExpedition = (regionId: RegionId) => {
    const status = getBossExpeditionStatus(regionId)
    if (!status.available) {
      return { success: false, message: status.reason }
    }
    const boss = getRegionBossDef(regionId)
    if (!boss) return { success: false, message: '当前区域首领未配置。' }

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(boss.staminaCost)) return { success: false, message: `体力不足，需要 ${boss.staminaCost} 点体力。` }

    const timeResult = gameStore.advanceTime(boss.timeCostHours, { skipSpeedBuff: true })
    const result = clearBossAndGrantRewards(regionId)
    if (!result) {
      playerStore.restoreStamina(boss.staminaCost)
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
      message: `已击败 ${regionName} 首领「${boss.name}」。${timeResult.message ? `${timeResult.message} ` : ''}${rewardSummary ? `本次${rewardSummary.slice(1)}。` : ''}`.trim()
    }
  }

  const serialize = (): RegionMapSaveData => ({
    saveVersion: saveData.value.saveVersion,
    unlockStates: { ...saveData.value.unlockStates },
    routeStates: { ...saveData.value.routeStates },
    weeklyFocusState: {
      weekId: saveData.value.weeklyFocusState.weekId,
      focusedRegionId: saveData.value.weeklyFocusState.focusedRegionId,
      highlightedRouteIds: [...saveData.value.weeklyFocusState.highlightedRouteIds]
    },
    resourceLedger: { ...saveData.value.resourceLedger },
    expedition: { ...saveData.value.expedition },
    telemetry: { ...saveData.value.telemetry }
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

    const resourceLedger = { ...fallback.resourceLedger }
    for (const family of REGIONAL_RESOURCE_FAMILY_DEFS) {
      resourceLedger[family.id] = Math.max(0, Math.floor(Number(data.resourceLedger?.[family.id]) || 0))
    }

    const weeklyFocusState = {
      weekId: typeof data.weeklyFocusState?.weekId === 'string' ? data.weeklyFocusState.weekId : '',
      focusedRegionId: REGION_DEFS.some(region => region.id === data.weeklyFocusState?.focusedRegionId)
        ? data.weeklyFocusState.focusedRegionId as RegionId
        : null,
      highlightedRouteIds: Array.isArray(data.weeklyFocusState?.highlightedRouteIds)
        ? data.weeklyFocusState.highlightedRouteIds.filter((entry: unknown) => typeof entry === 'string')
        : []
    }

    const expedition = {
      activeRegionId: REGION_DEFS.some(region => region.id === data.expedition?.activeRegionId)
        ? data.expedition.activeRegionId as RegionId
        : null,
      activeRouteId: typeof data.expedition?.activeRouteId === 'string' ? data.expedition.activeRouteId : null,
      activeBossId: REGION_BOSS_DEFS.some(boss => boss.id === data.expedition?.activeBossId)
        ? String(data.expedition.activeBossId)
        : null,
      startedAtDayTag: typeof data.expedition?.startedAtDayTag === 'string' ? data.expedition.startedAtDayTag : ''
    }

    const telemetry = {
      totalRouteCompletions: Math.max(0, Math.floor(Number(data.telemetry?.totalRouteCompletions) || 0)),
      bossClears: Math.max(0, Math.floor(Number(data.telemetry?.bossClears) || 0)),
      resourceTurnIns: Math.max(0, Math.floor(Number(data.telemetry?.resourceTurnIns) || 0))
    }

    saveData.value = {
      saveVersion: Math.max(1, Math.floor(Number(data.saveVersion) || fallback.saveVersion)),
      unlockStates,
      routeStates,
      weeklyFocusState,
      resourceLedger,
      expedition,
      telemetry
    }
    refreshRouteUnlocks()
  }

  return {
    regionDefs: REGION_DEFS,
    routeDefs: REGION_ROUTE_DEFS,
    bossDefs: REGION_BOSS_DEFS,
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
    regionBossAvailability,
    getRegionCompletedRouteCount,
    getFamilyResourceQuantity,
    getRouteUnlockStatus,
    refreshRouteUnlocks,
    getRouteExpeditionStatus,
    getBossExpeditionStatus,
    currentWeeklyFocus,
    resourceLedgerEntries,
    reset,
    getRegionUnlockProgress,
    refreshUnlocksFromProgress,
    unlockRegion,
    setWeeklyFocus,
    markRouteCompleted,
    addFamilyResources,
    consumeFamilyResources,
    recordResourceTurnIn,
    startExpedition,
    beginRoute,
    completeRouteAndGrantRewards,
    runRouteExpedition,
    clearExpedition,
    recordBossClear,
    clearBossAndGrantRewards,
    runBossExpedition,
    serialize,
    deserialize
  }
})
