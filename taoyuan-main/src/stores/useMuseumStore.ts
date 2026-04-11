import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAbsoluteDay } from '@/utils/weekCycle'
import { addLog } from '@/composables/useGameLog'
import {
  MUSEUM_DISPLAY_RATING_BANDS,
  MUSEUM_HALL_LEVELS,
  MUSEUM_ITEMS,
  MUSEUM_MILESTONES,
  MUSEUM_OPERATIONAL_CONFIG,
  MUSEUM_SCHOLAR_COMMISSIONS,
  MUSEUM_SHRINE_THEMES,
  MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG,
  MUSEUM_VISITOR_FLOW_BANDS,
  createDefaultMuseumSaveData,
  normalizeMuseumSaveData
} from '@/data/museum'
import type {
  MuseumAuditPlayerSegmentDef,
  MuseumDisplayRatingState,
  MuseumExhibitSlotState,
  MuseumHallLevelDef,
  MuseumHallProgress,
  MuseumHallZoneId,
  MuseumSaveData,
  MuseumScholarCommissionState,
  MuseumShrineThemeState,
  MuseumVisitorFlowState
} from '@/types'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import type { Season } from '@/types'

const HALL_ZONE_IDS = [...new Set(MUSEUM_HALL_LEVELS.map(level => level.hallZoneId))] as MuseumHallZoneId[]

const getMuseumItemDef = (itemId: string) => MUSEUM_ITEMS.find(item => item.id === itemId)
const DEFAULT_VISITOR_FLOW_BAND = MUSEUM_VISITOR_FLOW_BANDS[0]!
const DEFAULT_DISPLAY_RATING_BAND = MUSEUM_DISPLAY_RATING_BANDS[0]!
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

const cloneMuseumSaveData = (data: MuseumSaveData): MuseumSaveData => ({
  saveVersion: data.saveVersion,
  donatedItems: [...data.donatedItems],
  claimedMilestones: [...data.claimedMilestones],
  exhibitSlotStates: Object.fromEntries(
    Object.entries(data.exhibitSlotStates).map(([slotId, state]) => [
      slotId,
      {
        ...state,
        assignedItemIds: [...state.assignedItemIds]
      }
    ])
  ),
  hallProgress: Object.fromEntries(Object.entries(data.hallProgress).map(([hallZoneId, progress]) => [hallZoneId, { ...progress }])) as Record<MuseumHallZoneId, MuseumSaveData['hallProgress'][MuseumHallZoneId]>,
  scholarCommissionStates: Object.fromEntries(
    Object.entries(data.scholarCommissionStates).map(([commissionId, state]) => [commissionId, { ...state }])
  ),
  shrineThemeState: {
    unlockedThemeIds: [...data.shrineThemeState.unlockedThemeIds],
    activeThemeId: data.shrineThemeState.activeThemeId,
    lastRotationDayTag: data.shrineThemeState.lastRotationDayTag,
    activationCounts: { ...data.shrineThemeState.activationCounts }
  },
  telemetry: {
    saveVersion: data.telemetry.saveVersion,
    visitorFlow: { ...data.telemetry.visitorFlow },
    displayRating: {
      ...data.telemetry.displayRating,
      breakdown: data.telemetry.displayRating.breakdown.map(entry => ({ ...entry }))
    },
    scholarProgress: data.telemetry.scholarProgress,
    shrineFavor: data.telemetry.shrineFavor
  }
})

const getHallLevelDefs = (hallZoneId: MuseumHallZoneId): MuseumHallLevelDef[] => {
  return MUSEUM_HALL_LEVELS.filter(level => level.hallZoneId === hallZoneId).sort((left, right) => left.level - right.level)
}

const parseDayTag = (dayTag?: string) => {
  if (!dayTag) return null
  const [yearText, seasonText, dayText] = dayTag.split('-')
  if (!yearText || !seasonText || !dayText || !SEASON_ORDER.includes(seasonText as Season)) return null
  const year = Number(yearText)
  const day = Number(dayText)
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null
  return {
    year,
    season: seasonText as Season,
    day
  }
}

const getAbsoluteDayFromTag = (dayTag?: string) => {
  const parsed = parseDayTag(dayTag)
  if (!parsed) return null
  return getAbsoluteDay(parsed.year, parsed.season, parsed.day)
}

const getDayDiff = (fromDayTag?: string, toDayTag?: string) => {
  const fromDay = getAbsoluteDayFromTag(fromDayTag)
  const toDay = getAbsoluteDayFromTag(toDayTag)
  if (fromDay == null || toDay == null) return 0
  return Math.max(0, toDay - fromDay)
}

export const useMuseumStore = defineStore('museum', () => {
  const playerStore = usePlayerStore()
  const initialState = cloneMuseumSaveData(createDefaultMuseumSaveData())

  /** 已捐赠物品ID集合 */
  const donatedItems = ref<string[]>([...initialState.donatedItems])

  /** 已领取的里程碑count值集合 */
  const claimedMilestones = ref<number[]>([...initialState.claimedMilestones])

  /** T052：博物馆持续经营线持久态 */
  const saveVersion = ref(initialState.saveVersion)
  const exhibitSlotStates = ref<Record<string, MuseumExhibitSlotState>>(cloneMuseumSaveData(initialState).exhibitSlotStates)
  const hallProgress = ref<Record<MuseumHallZoneId, MuseumHallProgress>>(cloneMuseumSaveData(initialState).hallProgress)
  const scholarCommissionStates = ref<Record<string, MuseumScholarCommissionState>>(cloneMuseumSaveData(initialState).scholarCommissionStates)
  const shrineThemeState = ref(cloneMuseumSaveData(initialState).shrineThemeState)
  const telemetry = ref(cloneMuseumSaveData(initialState).telemetry)

  /** 已捐赠数量 */
  const donatedCount = computed(() => donatedItems.value.length)

  /** 总物品数 */
  const totalCount = computed(() => MUSEUM_ITEMS.length)

  const donatedItemsByCategory = computed(() => {
    const totals = Object.fromEntries(MUSEUM_ITEMS.map(item => [item.category, 0])) as Record<(typeof MUSEUM_ITEMS)[number]['category'], number>
    for (const itemId of donatedItems.value) {
      const item = getMuseumItemDef(itemId)
      if (!item) continue
      totals[item.category] = (totals[item.category] ?? 0) + 1
    }
    return totals
  })

  const donatedCategoryCoverage = computed(() => Object.values(donatedItemsByCategory.value).filter(count => count > 0).length)

  const spiritDonationCount = computed(() => donatedItemsByCategory.value.spirit ?? 0)

  const exhibitLevel = computed(() => donatedCount.value)
  const exhibitLevelProxy = computed(() => donatedCount.value)

  const currentHallProgressMap = computed<Record<MuseumHallZoneId, MuseumSaveData['hallProgress'][MuseumHallZoneId]>>(() => {
    return Object.fromEntries(
      HALL_ZONE_IDS.map(hallZoneId => {
        const fallback = initialState.hallProgress[hallZoneId]
        return [
          hallZoneId,
          hallProgress.value[hallZoneId] ?? {
            hallZoneId,
            level: fallback?.level ?? MUSEUM_OPERATIONAL_CONFIG.defaultHallLevel,
            lastUpgradeDayTag: fallback?.lastUpgradeDayTag
          }
        ]
      })
    ) as Record<MuseumHallZoneId, MuseumSaveData['hallProgress'][MuseumHallZoneId]>
  })

  const getHallLevel = (hallZoneId: MuseumHallZoneId): number => {
    return currentHallProgressMap.value[hallZoneId]?.level ?? MUSEUM_OPERATIONAL_CONFIG.defaultHallLevel
  }

  const currentExhibitSlotStates = computed<MuseumSaveData['exhibitSlotStates']>(() => {
    return Object.fromEntries(
      MUSEUM_OPERATIONAL_CONFIG.exhibitSlots.map(slot => {
        const base = exhibitSlotStates.value[slot.id] ?? initialState.exhibitSlotStates[slot.id]
        const unlocked = Boolean(base?.unlocked) || (exhibitLevel.value >= slot.unlockExhibitLevel && getHallLevel(slot.hallZoneId) >= (slot.unlockHallLevel ?? 0))
        return [
          slot.id,
          {
            slotId: slot.id,
            unlocked,
            assignedItemIds: [...(base?.assignedItemIds ?? [])],
            featuredThemeId: base?.featuredThemeId ?? null
          }
        ]
      })
    ) as MuseumSaveData['exhibitSlotStates']
  })

  const currentShrineThemeState = computed<MuseumShrineThemeState>(() => {
    const unlockedThemeIds = new Set(shrineThemeState.value.unlockedThemeIds)
    for (const theme of MUSEUM_SHRINE_THEMES) {
      if (exhibitLevel.value >= theme.unlockExhibitLevel && spiritDonationCount.value >= theme.requiredSpiritDonations) {
        unlockedThemeIds.add(theme.id)
      }
    }

    return {
      unlockedThemeIds: [...unlockedThemeIds],
      activeThemeId:
        shrineThemeState.value.activeThemeId && unlockedThemeIds.has(shrineThemeState.value.activeThemeId)
          ? shrineThemeState.value.activeThemeId
          : null,
      lastRotationDayTag: shrineThemeState.value.lastRotationDayTag,
      activationCounts: { ...shrineThemeState.value.activationCounts }
    }
  })

  const visitorFlowState = computed<MuseumVisitorFlowState>(() => {
    const current = telemetry.value.visitorFlow
    const score = Math.max(0, current?.score ?? initialState.telemetry.visitorFlow.score)
    const band =
      [...MUSEUM_VISITOR_FLOW_BANDS]
        .sort((left, right) => left.minScore - right.minScore)
        .reduce((selected, entry) => (score >= entry.minScore ? entry : selected), DEFAULT_VISITOR_FLOW_BAND)

    return {
      score,
      bandId: band.id,
      baseVisitors: Math.max(0, current?.baseVisitors ?? initialState.telemetry.visitorFlow.baseVisitors),
      bonusVisitors: Math.max(0, current?.bonusVisitors ?? initialState.telemetry.visitorFlow.bonusVisitors)
    }
  })

  const displayRatingState = computed<MuseumDisplayRatingState>(() => {
    const current = telemetry.value.displayRating
    const score = Math.max(0, current?.score ?? initialState.telemetry.displayRating.score)
    const band =
      [...MUSEUM_DISPLAY_RATING_BANDS]
        .sort((left, right) => left.minScore - right.minScore)
        .reduce((selected, entry) => (score >= entry.minScore ? entry : selected), DEFAULT_DISPLAY_RATING_BAND)

    return {
      score,
      bandId: band.id,
      breakdown: [...(current?.breakdown ?? initialState.telemetry.displayRating.breakdown)]
    }
  })

  const visitorFlowBand = computed(() => MUSEUM_VISITOR_FLOW_BANDS.find(band => band.id === visitorFlowState.value.bandId) ?? DEFAULT_VISITOR_FLOW_BAND)
  const displayRatingBand = computed(() => MUSEUM_DISPLAY_RATING_BANDS.find(band => band.id === displayRatingState.value.bandId) ?? DEFAULT_DISPLAY_RATING_BAND)

  const unlockedExhibitSlotCount = computed(() => Object.values(currentExhibitSlotStates.value).filter(slot => slot.unlocked).length)
  const hallLevelTotal = computed(() => Object.values(currentHallProgressMap.value).reduce((sum, hall) => sum + hall.level, 0))
  const activeShrineThemeId = computed(() => currentShrineThemeState.value.activeThemeId)
  const unlockedShrineThemeCount = computed(() => currentShrineThemeState.value.unlockedThemeIds.length)

  const exhibitSlotOverview = computed(() => {
    return MUSEUM_OPERATIONAL_CONFIG.exhibitSlots.map(slot => {
      const state = currentExhibitSlotStates.value[slot.id] ?? initialState.exhibitSlotStates[slot.id]!
      const assignedItems = state.assignedItemIds.map(itemId => getMuseumItemDef(itemId)).filter(Boolean)
      return {
        ...slot,
        state,
        unlocked: state.unlocked,
        assignedItems,
        assignedCount: state.assignedItemIds.length,
        isAvailable: state.unlocked && state.assignedItemIds.length === 0,
        featuredTheme: state.featuredThemeId ? MUSEUM_SHRINE_THEMES.find(theme => theme.id === state.featuredThemeId) ?? null : null,
        hallLevel: getHallLevel(slot.hallZoneId)
      }
    })
  })

  const hallProgressOverview = computed(() => {
    return HALL_ZONE_IDS.map(hallZoneId => {
      const progress = currentHallProgressMap.value[hallZoneId] ?? initialState.hallProgress[hallZoneId]
      const levelDefs = getHallLevelDefs(hallZoneId)
      const currentLevelDef = [...levelDefs].reverse().find(level => level.level <= progress.level) ?? levelDefs[0] ?? null
      const nextLevelDef = levelDefs.find(level => level.level > progress.level) ?? null
      const hallSlots = exhibitSlotOverview.value.filter(slot => slot.hallZoneId === hallZoneId)
      return {
        progress,
        currentLevelDef,
        nextLevelDef,
        unlockedSlotCount: hallSlots.filter(slot => slot.unlocked).length,
        availableSlotCount: hallSlots.filter(slot => slot.isAvailable).length,
        canUpgrade: Boolean(
          nextLevelDef &&
            donatedCount.value >= nextLevelDef.requiredDonatedCount &&
            donatedCategoryCoverage.value >= nextLevelDef.requiredCategoryCoverage &&
            exhibitLevel.value >= nextLevelDef.unlockExhibitLevel
        )
      }
    })
  })

  const scholarCommissionOverview = computed(() => {
    return MUSEUM_SCHOLAR_COMMISSIONS.map(def => {
      const state = scholarCommissionStates.value[def.id] ?? initialState.scholarCommissionStates[def.id]!
      const hallLevel = getHallLevel(def.hallZoneId)
      const unlocked = exhibitLevel.value >= def.unlockExhibitLevel && donatedCount.value >= def.requiredDonationCount && hallLevel >= def.requiredHallLevel
      return {
        ...def,
        state,
        hallLevel,
        unlocked,
        isAvailable: unlocked && !state.completed && !state.expired && !state.acceptedDayTag,
        isAccepted: Boolean(state.acceptedDayTag) && !state.completed && !state.expired,
        isRewardPending: Boolean(state.completed && !state.rewarded)
      }
    })
  })

  const availableScholarCommissionCount = computed(() => scholarCommissionOverview.value.filter(entry => entry.isAvailable).length)

  const shrineThemeOverview = computed(() => {
    return MUSEUM_SHRINE_THEMES.map(theme => ({
      ...theme,
      unlocked: currentShrineThemeState.value.unlockedThemeIds.includes(theme.id),
      active: currentShrineThemeState.value.activeThemeId === theme.id,
      activationCount: currentShrineThemeState.value.activationCounts[theme.id] ?? 0,
      eligible: exhibitLevel.value >= theme.unlockExhibitLevel && spiritDonationCount.value >= theme.requiredSpiritDonations
    }))
  })

  const visitorFlowOverview = computed(() => {
    const nextBand = MUSEUM_VISITOR_FLOW_BANDS.find(band => band.minScore > visitorFlowState.value.score) ?? null
    return {
      state: visitorFlowState.value,
      band: visitorFlowBand.value,
      nextBand,
      totalVisitors: visitorFlowState.value.baseVisitors + visitorFlowState.value.bonusVisitors
    }
  })

  const displayRatingOverview = computed(() => {
    const nextBand = MUSEUM_DISPLAY_RATING_BANDS.find(band => band.minScore > displayRatingState.value.score) ?? null
    return {
      state: displayRatingState.value,
      band: displayRatingBand.value,
      nextBand
    }
  })

  const operationalOverview = computed(() => ({
    saveVersion: saveVersion.value,
    donatedCount: donatedCount.value,
    totalCount: totalCount.value,
    exhibitLevel: exhibitLevel.value,
    exhibitSlotOverview: exhibitSlotOverview.value,
    hallProgressOverview: hallProgressOverview.value,
    visitorFlowOverview: visitorFlowOverview.value,
    displayRatingOverview: displayRatingOverview.value,
    shrineThemeOverview: shrineThemeOverview.value,
    scholarCommissionOverview: scholarCommissionOverview.value,
    exhibitSlots: exhibitSlotOverview.value,
    halls: hallProgressOverview.value,
    visitorFlow: visitorFlowOverview.value,
    displayRating: displayRatingOverview.value,
    shrineThemes: shrineThemeOverview.value,
    scholarCommissions: scholarCommissionOverview.value,
    activeShrineThemeId: activeShrineThemeId.value,
    unlockedExhibitSlotCount: unlockedExhibitSlotCount.value,
    availableScholarCommissionCount: availableScholarCommissionCount.value
  }))

  const currentAuditSegment = computed<MuseumAuditPlayerSegmentDef | null>(() => {
    return (
      [...MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.playerSegments]
        .reverse()
        .find(segment =>
          donatedCount.value >= segment.donatedCountMin &&
          donatedCategoryCoverage.value >= segment.categoryCoverageMin &&
          spiritDonationCount.value >= segment.spiritDonationMin
        ) ?? null
    )
  })

  const sustainedOperationAuditOverview = computed(() => {
    const linkedSystems = MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.linkedSystems.map(system => system.key)
    const currentSegment = currentAuditSegment.value
    return {
      baselineSummary: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.baselineSummary,
      coreMetrics: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.coreMetrics,
      guardrailMetrics: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.guardrailMetrics,
      rollbackRules: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.rollbackRules,
      linkedSystems: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.linkedSystems,
      currentSegment,
      saveVersion: saveVersion.value,
      exhibitLevel: exhibitLevel.value,
      exhibitLevelProxy: exhibitLevelProxy.value,
      donatedCount: donatedCount.value,
      totalCount: totalCount.value,
      donatedCategoryCoverage: donatedCategoryCoverage.value,
      spiritDonationCount: spiritDonationCount.value,
      unlockedExhibitSlotCount: unlockedExhibitSlotCount.value,
      hallLevelTotal: hallLevelTotal.value,
      scholarCommissionCount: MUSEUM_SCHOLAR_COMMISSIONS.length,
      availableScholarCommissionCount: availableScholarCommissionCount.value,
      shrineThemeCount: MUSEUM_SHRINE_THEMES.length,
      unlockedShrineThemeCount: unlockedShrineThemeCount.value,
      activeShrineThemeId: activeShrineThemeId.value,
      visitorFlow: visitorFlowState.value,
      visitorFlowBand: visitorFlowBand.value,
      displayRating: displayRatingState.value,
      displayRatingBand: displayRatingBand.value,
      donationCompletionRatio: totalCount.value <= 0 ? 0 : donatedCount.value / totalCount.value,
      segmentProgress: currentSegment
        ? {
            nextDonationTarget: currentSegment.donatedCountMin,
            nextCategoryCoverageTarget: currentSegment.categoryCoverageMin,
            nextSpiritDonationTarget: currentSegment.spiritDonationMin
          }
        : {
            nextDonationTarget: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.playerSegments[0]?.donatedCountMin ?? 0,
            nextCategoryCoverageTarget: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.playerSegments[0]?.categoryCoverageMin ?? 0,
            nextSpiritDonationTarget: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG.playerSegments[0]?.spiritDonationMin ?? 0
          },
      linkedSystemContextSummary: linkedSystems.join(' / ')
    }
  })

  /** 是否已捐赠 */
  const isDonated = (itemId: string): boolean => {
    return donatedItems.value.includes(itemId)
  }

  /** 是否可捐赠（背包中有且未捐赠过） */
  const canDonate = (itemId: string): boolean => {
    if (isDonated(itemId)) return false
    if (!getMuseumItemDef(itemId)) return false
    const inventoryStore = useInventoryStore()
    return inventoryStore.hasItem(itemId)
  }

  /** 获取背包中可捐赠的物品列表 */
  const donatableItems = computed(() => {
    const inventoryStore = useInventoryStore()
    return inventoryStore.items
      .filter(inv => {
        const museumItem = getMuseumItemDef(inv.itemId)
        return museumItem && !isDonated(inv.itemId)
      })
      .map(inv => inv.itemId)
  })

  /** 捐赠物品 */
  const donateItem = (itemId: string): boolean => {
    if (!canDonate(itemId)) return false
    const inventoryStore = useInventoryStore()
    const removed = inventoryStore.removeItem(itemId, 1)
    if (!removed) return false
    donatedItems.value.push(itemId)
    return true
  }

  /** 可领取的里程碑 */
  const claimableMilestones = computed(() => {
    return MUSEUM_MILESTONES.filter(m => donatedCount.value >= m.count && !claimedMilestones.value.includes(m.count))
  })

  const getExhibitSlotState = (slotId: string) => currentExhibitSlotStates.value[slotId]
  const getExhibitSlotOverview = (slotId: string) => exhibitSlotOverview.value.find(slot => slot.id === slotId)
  const getHallProgress = (hallZoneId: MuseumHallZoneId) => currentHallProgressMap.value[hallZoneId]
  const getHallOverview = (hallZoneId: MuseumHallZoneId) => hallProgressOverview.value.find(hall => hall.progress?.hallZoneId === hallZoneId)
  const getScholarCommissionState = (commissionId: string) => scholarCommissionStates.value[commissionId]
  const getScholarCommissionOverview = (commissionId: string) => scholarCommissionOverview.value.find(commission => commission.id === commissionId)
  const getScholarCommissionStatus = (commissionId: string) => getScholarCommissionOverview(commissionId) ?? null
  const getShrineThemeOverview = (themeId: string) => shrineThemeOverview.value.find(theme => theme.id === themeId)
  const getActiveShrineTheme = () => shrineThemeOverview.value.find(theme => theme.active) ?? null
  const getCurrentShrineTheme = () => getActiveShrineTheme()
  const getAvailableExhibitSlots = (hallZoneId?: MuseumHallZoneId) => {
    const slots = exhibitSlotOverview.value.filter(slot => slot.isAvailable)
    return hallZoneId ? slots.filter(slot => slot.hallZoneId === hallZoneId) : slots
  }
  const getUnlockedExhibitSlots = () => exhibitSlotOverview.value.filter(slot => slot.unlocked)

  const setScholarCommissionState = (commissionId: string, patch: Partial<MuseumScholarCommissionState>) => {
    const current = scholarCommissionStates.value[commissionId] ?? initialState.scholarCommissionStates[commissionId]
    if (!current) return undefined
    const nextState: MuseumScholarCommissionState = {
      ...current,
      ...patch
    }
    scholarCommissionStates.value = {
      ...scholarCommissionStates.value,
      [commissionId]: nextState
    }
    return nextState
  }

  const buildDisplayRatingTelemetry = (): MuseumDisplayRatingState => {
    const breakdown: MuseumDisplayRatingState['breakdown'] = []
    let score = MUSEUM_OPERATIONAL_CONFIG.defaultDisplayRating

    for (const slot of exhibitSlotOverview.value) {
      if (!slot.unlocked || slot.assignedCount <= 0) continue
      const slotScore = slot.assignedCount * slot.ratingWeight
      score += slotScore
      breakdown.push({ key: slot.id, label: slot.name, value: slotScore })
    }

    for (const hall of hallProgressOverview.value) {
      const hallBonus = hall.currentLevelDef?.displayRatingBonus ?? 0
      if (hallBonus <= 0) continue
      score += hallBonus
      breakdown.push({
        key: `hall:${hall.progress.hallZoneId}`,
        label: hall.currentLevelDef?.unlockSummary ?? hall.progress.hallZoneId,
        value: hallBonus
      })
    }

    const activeTheme = getActiveShrineTheme()
    if (activeTheme?.ratingBonus) {
      score += activeTheme.ratingBonus
      breakdown.push({ key: `theme:${activeTheme.id}`, label: activeTheme.name, value: activeTheme.ratingBonus })
    }

    const band =
      [...MUSEUM_DISPLAY_RATING_BANDS]
        .sort((left, right) => left.minScore - right.minScore)
        .reduce((selected, entry) => (score >= entry.minScore ? entry : selected), DEFAULT_DISPLAY_RATING_BAND)

    return {
      score,
      bandId: band.id,
      breakdown
    }
  }

  const buildVisitorFlowTelemetry = (displayRatingScore: number): MuseumVisitorFlowState => {
    const hallTrafficBonusRate = hallProgressOverview.value.reduce(
      (sum, hall) => sum + (hall.currentLevelDef?.visitorFlowBonusRate ?? 0),
      0
    )
    const activeTheme = getActiveShrineTheme()
    const scholarCompletedCount = Object.values(scholarCommissionStates.value).filter(state => state.completed).length
    const assignedExhibitCount = exhibitSlotOverview.value.reduce((sum, slot) => sum + slot.assignedCount, 0)
    const baseVisitors =
      MUSEUM_OPERATIONAL_CONFIG.defaultVisitorFlow + unlockedExhibitSlotCount.value * 4 + assignedExhibitCount * 3 + scholarCompletedCount * 5
    const ratingBonusVisitors = Math.floor(displayRatingScore * 0.2)
    const hallBonusVisitors = Math.floor(baseVisitors * hallTrafficBonusRate)
    const shrineBonusVisitors = activeTheme ? Math.floor(baseVisitors * activeTheme.trafficBonusRate) : 0
    const bonusVisitors = ratingBonusVisitors + hallBonusVisitors + shrineBonusVisitors
    const score = baseVisitors + bonusVisitors
    const band =
      [...MUSEUM_VISITOR_FLOW_BANDS]
        .sort((left, right) => left.minScore - right.minScore)
        .reduce((selected, entry) => (score >= entry.minScore ? entry : selected), DEFAULT_VISITOR_FLOW_BAND)

    return {
      score,
      bandId: band.id,
      baseVisitors,
      bonusVisitors
    }
  }

  const rotateShrineTheme = (currentDayTag: string, rotation: 'daily' | 'weekly' | 'seasonal') => {
    const unlockedThemes = shrineThemeOverview.value.filter(theme => theme.unlocked)
    if (unlockedThemes.length <= 0) return null

    const rotationPool = unlockedThemes.filter(theme => theme.rotation === rotation)
    const candidatePool = rotationPool.length > 0 ? rotationPool : unlockedThemes
    const currentThemeId = currentShrineThemeState.value.activeThemeId
    const currentIndex = candidatePool.findIndex(theme => theme.id === currentThemeId)
    const nextTheme = currentIndex >= 0 ? candidatePool[(currentIndex + 1) % candidatePool.length] ?? candidatePool[0]! : candidatePool[0]!

    shrineThemeState.value = {
      ...currentShrineThemeState.value,
      activeThemeId: nextTheme.id,
      lastRotationDayTag: currentDayTag,
      activationCounts: {
        ...currentShrineThemeState.value.activationCounts,
        [nextTheme.id]: (currentShrineThemeState.value.activationCounts[nextTheme.id] ?? 0) + 1
      }
    }

    return nextTheme
  }

  const processOperationalTick = (currentDayTag: string, options?: { startedNewWeek?: boolean; seasonChanged?: boolean }) => {
    const dailyLogs: string[] = []

    const currentTheme = getActiveShrineTheme()
    const shouldRotateTheme =
      !currentTheme ||
      (currentTheme.rotation === 'daily' && currentShrineThemeState.value.lastRotationDayTag !== currentDayTag) ||
      (currentTheme.rotation === 'weekly' && options?.startedNewWeek) ||
      (currentTheme.rotation === 'seasonal' && options?.seasonChanged)

    if (shouldRotateTheme) {
      const rotationMode = options?.seasonChanged ? 'seasonal' : options?.startedNewWeek ? 'weekly' : 'daily'
      const rotatedTheme = rotateShrineTheme(currentDayTag, rotationMode)
      if (rotatedTheme) {
        dailyLogs.push(`【博物馆】祠堂主题轮换为「${rotatedTheme.name}」。`)
      }
    }

    const displayTelemetry = buildDisplayRatingTelemetry()
    const visitorTelemetry = buildVisitorFlowTelemetry(displayTelemetry.score)

    for (const commission of scholarCommissionOverview.value) {
      const state = commission.state
      if (!state.acceptedDayTag || state.completed || state.expired) continue

      const elapsedDays = getDayDiff(state.acceptedDayTag, currentDayTag)
      if (elapsedDays >= commission.durationDays) {
        setScholarCommissionState(commission.id, { expired: true })
        dailyLogs.push(`【博物馆】学者委托「${commission.title}」已因超期而失效。`)
        continue
      }

      if (displayTelemetry.score >= commission.ratingTarget && visitorTelemetry.score >= commission.trafficTarget) {
        setScholarCommissionState(commission.id, { completed: true, expired: false })
        dailyLogs.push(`【博物馆】学者委托「${commission.title}」已达到展陈目标，等待领取奖励。`)
      }
    }

    telemetry.value = {
      ...telemetry.value,
      visitorFlow: visitorTelemetry,
      displayRating: displayTelemetry,
      scholarProgress: Object.values(scholarCommissionStates.value).filter(state => state.completed).length,
      shrineFavor: Object.values(currentShrineThemeState.value.activationCounts).reduce((sum, count) => sum + count, 0)
    }

    if (options?.startedNewWeek) {
      dailyLogs.push(
        `【博物馆】本周展陈概览：陈列评分 ${displayTelemetry.score}（${displayRatingBand.value.name}），访客热度 ${visitorTelemetry.score}（${visitorFlowBand.value.name}）。`
      )
    }

    for (const message of dailyLogs) {
      addLog(message, {
        category: 'museum',
        tags: ['museum_operational_tick', 'late_game_cycle'],
        meta: { dayTag: currentDayTag }
      })
    }

    return {
      logs: dailyLogs,
      displayTelemetry,
      visitorTelemetry
    }
  }

  /** 领取里程碑奖励 */
  const claimMilestone = (count: number): boolean => {
    const milestone = MUSEUM_MILESTONES.find(m => m.count === count)
    if (!milestone) return false
    if (donatedCount.value < count) return false
    if (claimedMilestones.value.includes(count)) return false

    const inventoryStore = useInventoryStore()
    const rewardItems = (milestone.reward.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) return false

    if (milestone.reward.money) {
      playerStore.earnMoney(milestone.reward.money)
    }
    if (milestone.reward.items) {
      inventoryStore.addItemsExact(rewardItems)
    }
    claimedMilestones.value.push(count)
    return true
  }

  const applySaveData = (dataLike: Partial<MuseumSaveData> | Record<string, any> | undefined | null) => {
    const data = cloneMuseumSaveData(normalizeMuseumSaveData(dataLike))
    saveVersion.value = data.saveVersion
    donatedItems.value = [...data.donatedItems]
    claimedMilestones.value = [...data.claimedMilestones]
    exhibitSlotStates.value = data.exhibitSlotStates
    hallProgress.value = data.hallProgress
    scholarCommissionStates.value = data.scholarCommissionStates
    shrineThemeState.value = data.shrineThemeState
    telemetry.value = data.telemetry
  }

  /** 序列化 */
  const serialize = (): MuseumSaveData => {
    return normalizeMuseumSaveData({
      saveVersion: saveVersion.value,
      donatedItems: donatedItems.value,
      claimedMilestones: claimedMilestones.value,
      exhibitSlotStates: currentExhibitSlotStates.value,
      hallProgress: currentHallProgressMap.value,
      scholarCommissionStates: scholarCommissionStates.value,
      shrineThemeState: currentShrineThemeState.value,
      telemetry: {
        saveVersion: saveVersion.value,
        visitorFlow: visitorFlowState.value,
        displayRating: displayRatingState.value,
        scholarProgress: telemetry.value.scholarProgress,
        shrineFavor: telemetry.value.shrineFavor
      }
    })
  }

  /** 反序列化 */
  const deserialize = (data: Partial<MuseumSaveData> | Record<string, any> | undefined | null) => {
    applySaveData(data)
  }

  const $reset = () => {
    applySaveData(createDefaultMuseumSaveData())
  }

  return {
    donatedItems,
    claimedMilestones,
    saveVersion,
    exhibitSlotStates,
    hallProgress,
    scholarCommissionStates,
    shrineThemeState,
    telemetry,
    donatedCount,
    totalCount,
    donatedItemsByCategory,
    donatedCategoryCoverage,
    spiritDonationCount,
    exhibitLevel,
    exhibitLevelProxy,
    unlockedExhibitSlotCount,
    hallLevelTotal,
    activeShrineThemeId,
    unlockedShrineThemeCount,
    availableScholarCommissionCount,
    visitorFlowState,
    displayRatingState,
    visitorFlowBand,
    displayRatingBand,
    exhibitSlotOverview,
    hallProgressOverview,
    visitorFlowOverview,
    displayRatingOverview,
    scholarCommissionOverview,
    shrineThemeOverview,
    operationalOverview,
    currentAuditSegment,
    sustainedOperationAuditOverview,
    sustainedOperationAuditConfig: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG,
    operationalConfig: MUSEUM_OPERATIONAL_CONFIG,
    exhibitSlotDefs: MUSEUM_OPERATIONAL_CONFIG.exhibitSlots,
    hallLevelDefs: MUSEUM_HALL_LEVELS,
    scholarCommissionDefs: MUSEUM_SCHOLAR_COMMISSIONS,
    shrineThemeDefs: MUSEUM_SHRINE_THEMES,
    visitorFlowBands: MUSEUM_VISITOR_FLOW_BANDS,
    displayRatingBands: MUSEUM_DISPLAY_RATING_BANDS,
    getExhibitSlotState,
    getExhibitSlotOverview,
    getHallLevel,
    getHallProgress,
    getHallOverview,
    getScholarCommissionState,
    getScholarCommissionOverview,
    getScholarCommissionStatus,
    getShrineThemeOverview,
    getActiveShrineTheme,
    getCurrentShrineTheme,
    getAvailableExhibitSlots,
    getUnlockedExhibitSlots,
    processOperationalTick,
    isDonated,
    canDonate,
    donatableItems,
    donateItem,
    claimableMilestones,
    claimMilestone,
    serialize,
    deserialize,
    $reset
  }
})
