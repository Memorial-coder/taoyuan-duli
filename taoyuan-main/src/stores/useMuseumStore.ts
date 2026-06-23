import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAbsoluteDay } from '@/utils/weekCycle'
import { addLog } from '@/composables/useGameLog'
import {
  MUSEUM_DISPLAY_RATING_BANDS,
  MUSEUM_HALL_LEVELS,
  MUSEUM_ITEMS,
  MUSEUM_EXHIBIT_SETS,
  MUSEUM_MILESTONES,
  MUSEUM_OPERATIONAL_CONFIG,
  MUSEUM_OPERATION_TUNING_CONFIG,
  MUSEUM_SCHOLAR_COMMISSIONS,
  WS14_MUSEUM_SCHOLAR_COMMISSIONS,
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
  MuseumExhibitSetState,
  MuseumHallLevelDef,
  MuseumHallProgress,
  MuseumHallZoneId,
  MuseumCategory,
  MuseumSaveData,
  MuseumScholarCommissionDef,
  MuseumScholarCommissionState,
  MuseumShrineThemeState,
  MuseumVisitorFlowState,
  QuestType,
  VillagerQuestCategory
} from '@/types'
import { getItemById } from '@/data'
import { getNpcById } from '@/data/npcs'
import { buildSpeciesNoteOverview } from '@/data/speciesNotes'
import { QUARRY_MUSEUM_ARTIFACT_ITEM_IDS } from '@/data/quarry'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import type { Season } from '@/types'
import { useGameStore } from './useGameStore'
import { useGoalStore } from './useGoalStore'
import { useFishPondStore } from './useFishPondStore'
import { useBreedingStore } from './useBreedingStore'
import { useNpcStore } from './useNpcStore'
import { usePotentialStore } from './usePotentialStore'
import { useRegionMapStore } from './useRegionMapStore'
import { useShopStore } from './useShopStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import type { RegionId } from '@/types/region'

const HALL_ZONE_IDS = [...new Set(MUSEUM_HALL_LEVELS.map(level => level.hallZoneId))] as MuseumHallZoneId[]
const ALL_MUSEUM_SCHOLAR_COMMISSIONS = [...MUSEUM_SCHOLAR_COMMISSIONS, ...WS14_MUSEUM_SCHOLAR_COMMISSIONS]
const SPECIES_NOTE_REGION_IDS: RegionId[] = ['ancient_road', 'mirage_marsh', 'cloud_highland']
const ANCIENT_SEED_ITEM_ID = 'ancient_seed'
const ANCIENT_SEED_DONATION_REWARD_ITEMS = [{ itemId: ANCIENT_SEED_ITEM_ID, quantity: 1, quality: 'normal' as const }]

const getMuseumItemDef = (itemId: string) => MUSEUM_ITEMS.find(item => item.id === itemId)
const DEFAULT_VISITOR_FLOW_BAND = MUSEUM_VISITOR_FLOW_BANDS[0]!
const DEFAULT_DISPLAY_RATING_BAND = MUSEUM_DISPLAY_RATING_BANDS[0]!
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']
const EXHIBIT_SET_TELEMETRY_REWARD_KINDS = new Set(['display_rating', 'visitor_flow'])
type MuseumQuestMarketCategory = 'crop' | 'fish' | 'animal_product' | 'processed' | 'fruit' | 'ore' | 'gem'

const dedupeList = <T,>(items: T[]): T[] => Array.from(new Set(items))

const normalizeScholarCommissionMaterialRequirements = (
  requirements: MuseumScholarCommissionDef['materialRequirements'] = []
): { itemId: string; quantity: number }[] => {
  const totals = new Map<string, number>()
  for (const requirement of requirements) {
    const itemId = requirement.itemId
    const quantity = Math.max(0, Math.floor(Number(requirement.quantity) || 0))
    if (!itemId || quantity <= 0) continue
    totals.set(itemId, (totals.get(itemId) ?? 0) + quantity)
  }
  return [...totals.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
}

const MUSEUM_CATEGORY_TO_QUEST_MARKET_CATEGORIES: Record<MuseumCategory, MuseumQuestMarketCategory[]> = {
  ore: ['ore'],
  gem: ['gem'],
  bar: ['ore', 'processed'],
  fossil: ['ore'],
  artifact: ['processed', 'gem'],
  spirit: ['fruit', 'processed']
}

const MUSEUM_HALL_TO_QUEST_MARKET_CATEGORIES: Record<MuseumHallZoneId, MuseumQuestMarketCategory[]> = {
  entry_gallery: ['processed'],
  mineral_hall: ['ore', 'gem'],
  fossil_hall: ['ore'],
  artifact_hall: ['processed', 'fruit'],
  spirit_hall: ['fruit'],
  shrine_courtyard: ['fruit', 'processed']
}

const MUSEUM_HALL_SUPPORT_NPCS: Record<MuseumHallZoneId, string[]> = {
  entry_gallery: ['wang_dashen'],
  mineral_hall: ['lin_lao', 'sun_tiejiang'],
  fossil_hall: ['lin_lao', 'dan_qing'],
  artifact_hall: ['dan_qing', 'xue_qin'],
  spirit_hall: ['mo_bai', 'lin_lao'],
  shrine_courtyard: ['mo_bai', 'wang_dashen']
}

const MUSEUM_SCHOLAR_SUPPORT_NPCS: Record<string, string[]> = {
  mineral_catalogue_revision: ['lin_lao', 'sun_tiejiang'],
  fossil_restoration_notes: ['dan_qing', 'xue_qin'],
  ancestral_relic_field_report: ['mo_bai', 'dan_qing']
}

const FRIENDSHIP_LEVEL_LABELS: Record<string, string> = {
  stranger: '陌生',
  acquaintance: '相识',
  friendly: '友好',
  bestFriend: '挚友',
  dating: '恋人',
  married: '成婚'
}

const mapMarketCategoriesToQuestTypes = (categories: MuseumQuestMarketCategory[]): QuestType[] => {
  const questTypes: QuestType[] = []
  if (categories.some(category => category === 'ore' || category === 'gem')) questTypes.push('mining')
  if (categories.some(category => category === 'processed' || category === 'animal_product')) questTypes.push('gathering')
  if (categories.some(category => category === 'crop' || category === 'fruit')) questTypes.push('delivery')
  if (categories.includes('fish')) questTypes.push('fishing')
  return dedupeList(questTypes)
}

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
  exhibitSetStates: Object.fromEntries(
    Object.entries(data.exhibitSetStates).map(([setId, state]) => [
      setId,
      {
        ...state,
        submittedItems: { ...state.submittedItems }
      }
    ])
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
  const museumTuning = MUSEUM_OPERATION_TUNING_CONFIG
  const museumFeatureFlags = museumTuning.featureFlags
  const museumDisplayConfig = museumTuning.display
  const museumOperationConfig = museumTuning.operations
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const goalStore = useGoalStore()
  const npcStore = useNpcStore()
  const regionMapStore = useRegionMapStore()
  const villageProjectStore = useVillageProjectStore()
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
  const exhibitSetStates = ref<Record<string, MuseumExhibitSetState>>(cloneMuseumSaveData(initialState).exhibitSetStates)
  const shrineThemeState = ref(cloneMuseumSaveData(initialState).shrineThemeState)
  const telemetry = ref(cloneMuseumSaveData(initialState).telemetry)
  const museumActionLocks = ref<string[]>([])

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
      const currentLevelDef = [...levelDefs].reverse().find(level => level.level <= progress.level) ?? null
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
    return ALL_MUSEUM_SCHOLAR_COMMISSIONS.map(def => {
      const state = scholarCommissionStates.value[def.id] ?? initialState.scholarCommissionStates[def.id]!
      const hallLevel = getHallLevel(def.hallZoneId)
      const unlocked = exhibitLevel.value >= def.unlockExhibitLevel && donatedCount.value >= def.requiredDonationCount && hallLevel >= def.requiredHallLevel
      const materialRequirements = normalizeScholarCommissionMaterialRequirements(def.materialRequirements)
      return {
        ...def,
        materialRequirements,
        state,
        hallLevel,
        unlocked,
        isAvailable: unlocked && !state.completed && !state.expired && !state.acceptedDayTag,
        isAccepted: Boolean(state.acceptedDayTag) && !state.completed && !state.expired,
        isRewardPending: Boolean(state.completed && !state.rewarded)
      }
    })
  })

  const exhibitSetOverview = computed(() => {
    const inventoryStore = useInventoryStore()
    return MUSEUM_EXHIBIT_SETS.map(def => {
      const state = exhibitSetStates.value[def.id] ?? initialState.exhibitSetStates[def.id]!
      const unlocked = exhibitLevel.value >= def.unlockExhibitLevel
      const requirements = def.requirements.map(requirement => {
        const submitted = Math.max(0, Math.min(requirement.quantity, Math.floor(Number(state.submittedItems[requirement.itemId]) || 0)))
        const remaining = Math.max(0, requirement.quantity - submitted)
        const owned = inventoryStore.getTotalItemCount(requirement.itemId)
        const duplicateReady = !requirement.duplicateOnly || !getMuseumItemDef(requirement.itemId) || isDonated(requirement.itemId)
        return {
          ...requirement,
          submitted,
          remaining,
          owned,
          duplicateReady,
          enough: remaining <= 0 || (owned >= 1 && duplicateReady),
          itemName: getItemById(requirement.itemId)?.name ?? requirement.itemId
        }
      })
      const submittedTotal = requirements.reduce((sum, requirement) => sum + requirement.submitted, 0)
      const requiredTotal = requirements.reduce((sum, requirement) => sum + requirement.quantity, 0)
      const completed = state.completed || requirements.every(requirement => requirement.remaining <= 0)
      return {
        ...def,
        state,
        unlocked,
        requirements,
        submittedTotal,
        requiredTotal,
        progressPercent: requiredTotal > 0 ? Math.min(100, Math.floor((submittedTotal / requiredTotal) * 100)) : 0,
        completed,
        canSubmit: unlocked && !completed && requirements.some(requirement => requirement.remaining > 0 && requirement.owned > 0 && requirement.duplicateReady),
        canClaimReward: unlocked && completed && !state.rewardClaimed
      }
    })
  })

  const completedExhibitSetCount = computed(() => exhibitSetOverview.value.filter(set => set.completed).length)
  const claimableExhibitSetCount = computed(() => exhibitSetOverview.value.filter(set => set.canClaimReward).length)

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

  const speciesNoteOverview = computed(() => {
    const breedingStore = useBreedingStore()
    const fishPondStore = useFishPondStore()
    const completedRegionIds = SPECIES_NOTE_REGION_IDS.filter(regionId => regionMapStore.getRegionCompletedRouteCount(regionId) > 0)
    return buildSpeciesNoteOverview({
      breedingHybridIds: breedingStore.compendium.map(entry => entry.hybridId),
      pondBreedIds: [...fishPondStore.discoveredBreeds],
      completedRegionIds,
      discoveredQuarryArtifactItemIds: QUARRY_MUSEUM_ARTIFACT_ITEM_IDS.filter(itemId => isDonated(itemId)),
      completedMuseumExhibitSetIds: exhibitSetOverview.value.filter(set => set.completed).map(set => set.id)
    })
  })

  const getCurrentDayTag = () => `${gameStore.year}-${gameStore.season}-${gameStore.day}`

  const currentThemeWeekMuseumFocus = computed(() => {
    if (!museumFeatureFlags.themeWeekFocusEnabled) return null
    const themeWeek = goalStore.currentThemeWeek
    if (!themeWeek) return null
    return {
      id: themeWeek.id,
      name: themeWeek.name,
      summaryLabel: themeWeek.ui?.summaryLabel ?? themeWeek.name,
      hallZoneIds: themeWeek.museumFocusHallZoneIds ?? [],
      themeIds: themeWeek.museumFocusThemeIds ?? [],
      scholarCommissionIds: themeWeek.museumFocusScholarCommissionIds ?? []
    }
  })

  const linkedVillageProjects = computed(() => {
    return (villageProjectStore.getLinkedProjectSummaries('museum') as Array<Record<string, any>> | undefined) ?? []
  })

  const featuredScholarCommissionOverview = computed(() => {
    const focusedCommissionIds = new Set(currentThemeWeekMuseumFocus.value?.scholarCommissionIds ?? [])
    return [...scholarCommissionOverview.value]
      .sort((left, right) => {
        const leftWeight = (left.isRewardPending ? 4 : 0) + (left.isAccepted ? 3 : 0) + (left.isAvailable ? 2 : 0) + (focusedCommissionIds.has(left.id) ? 1 : 0)
        const rightWeight = (right.isRewardPending ? 4 : 0) + (right.isAccepted ? 3 : 0) + (right.isAvailable ? 2 : 0) + (focusedCommissionIds.has(right.id) ? 1 : 0)
        return rightWeight - leftWeight
      })
      .slice(0, Math.max(1, museumDisplayConfig.featuredCommissionLimit))
  })

  const activeMuseumFocusCategories = computed<MuseumCategory[]>(() => {
    const activeThemeCategories = getActiveShrineTheme()?.favoredCategories ?? []
    const commissionCategories = featuredScholarCommissionOverview.value
      .filter(commission => commission.unlocked || commission.isAvailable || commission.isAccepted || commission.isRewardPending)
      .flatMap(commission => commission.preferredCategories)

    return dedupeList<MuseumCategory>([...activeThemeCategories, ...commissionCategories])
  })

  const questBoardBiasProfile = computed(() => {
    if (!museumFeatureFlags.questBoardBiasEnabled) {
      return {
        preferredMarketCategories: [] as MuseumQuestMarketCategory[],
        preferredQuestTypes: [] as QuestType[],
        preferredVillagerCategory: null as VillagerQuestCategory | null,
        biasStrength: 0,
        boardHint: '',
        specialOrderHint: '',
        focusHallLabels: [] as string[],
        activeThemeName: undefined as string | undefined
      }
    }

    const focusHallMarketCategories = (currentThemeWeekMuseumFocus.value?.hallZoneIds ?? []).flatMap(
      hallZoneId => MUSEUM_HALL_TO_QUEST_MARKET_CATEGORIES[hallZoneId] ?? []
    )
    const preferredMarketCategories = dedupeList<MuseumQuestMarketCategory>([
      ...activeMuseumFocusCategories.value.flatMap(category => MUSEUM_CATEGORY_TO_QUEST_MARKET_CATEGORIES[category] ?? []),
      ...focusHallMarketCategories
    ])
    const preferredQuestTypes = mapMarketCategoriesToQuestTypes(preferredMarketCategories)
    const preferredVillagerCategory: VillagerQuestCategory | null =
      preferredMarketCategories.some(category => category === 'ore' || category === 'gem')
        ? 'gathering'
        : preferredMarketCategories.some(category => category === 'processed' || category === 'animal_product')
          ? 'cooking'
          : null

    const hallLabels = (currentThemeWeekMuseumFocus.value?.hallZoneIds ?? []).map(hallZoneId => {
      const hall = hallProgressOverview.value.find(entry => entry.progress.hallZoneId === hallZoneId)
      return hall?.currentLevelDef?.unlockSummary ?? hallZoneId
    })
    const activeThemeName = getActiveShrineTheme()?.name
    const linkedProjectCount = linkedVillageProjects.value.filter(project => project.completed).length
    const biasStrength = Math.min(
      museumOperationConfig.maxQuestBiasStrength,
      preferredMarketCategories.length +
        linkedProjectCount * museumOperationConfig.linkedProjectBiasWeight +
        (availableScholarCommissionCount.value > 0 ? museumOperationConfig.availableCommissionBiasWeight : 0)
    )

    return {
      preferredMarketCategories,
      preferredQuestTypes,
      preferredVillagerCategory,
      biasStrength,
      boardHint:
        preferredMarketCategories.length > 0
          ? `【博物馆联动】${activeThemeName ? `祠堂主题「${activeThemeName}」` : '当前展陈经营'}会让告示板更偏向${preferredMarketCategories.join(' / ')}相关筹备。`
          : '',
      specialOrderHint:
        hallLabels.length > 0
          ? `展陈联动：本周重点馆区为${hallLabels.slice(0, museumDisplayConfig.hallLabelDisplayLimit).join('、')}，相关筹备需求会更活跃。`
          : '',
      focusHallLabels: hallLabels,
      activeThemeName
    }
  })

  const supportNpcOverview = computed(() => {
    const focusedHallNpcIds = (currentThemeWeekMuseumFocus.value?.hallZoneIds ?? []).flatMap(hallZoneId => MUSEUM_HALL_SUPPORT_NPCS[hallZoneId] ?? [])
    const commissionNpcIds = featuredScholarCommissionOverview.value.flatMap(commission => MUSEUM_SCHOLAR_SUPPORT_NPCS[commission.id] ?? [])
    return dedupeList([...focusedHallNpcIds, ...commissionNpcIds])
      .slice(0, Math.max(1, museumDisplayConfig.supportNpcDisplayLimit))
      .map(npcId => ({
      npcId,
      name: getNpcById(npcId)?.name ?? npcId,
      friendshipLevel: npcStore.getFriendshipLevel(npcId),
      friendshipLabel: FRIENDSHIP_LEVEL_LABELS[npcStore.getFriendshipLevel(npcId)] ?? npcStore.getFriendshipLevel(npcId)
    }))
  })

  const crossSystemOverview = computed(() => {
    const recommendedActions: string[] = []
    const activeTheme = getActiveShrineTheme()
    if (goalStore.currentEventCampaign) {
      recommendedActions.push(`当前活动「${goalStore.currentEventCampaign.label}」正在放大展陈、委托与专题活动承接，优先把馆务安排和活动节奏对齐。`)
    }
    if (availableScholarCommissionCount.value > 0) {
      recommendedActions.push(`优先承接 ${availableScholarCommissionCount.value} 条学者委托，把展示评分和访客热度转成稳定奖励。`)
    }
    if (claimableExhibitSetCount.value > 0) {
      recommendedActions.push(`有 ${claimableExhibitSetCount.value} 组专题展组可确认奖励，完成后会沉淀为展示评分或访客热度。`)
    }
    const readyExhibitSet = exhibitSetOverview.value.find(set => set.canSubmit)
    if (readyExhibitSet) {
      recommendedActions.push(`专题展组「${readyExhibitSet.name}」已有可提交副本，适合把重复物品转成长期展示进度。`)
    }
    if (currentThemeWeekMuseumFocus.value?.hallZoneIds?.length) {
      recommendedActions.push(`本周主题周额外关注 ${questBoardBiasProfile.value.focusHallLabels.slice(0, 2).join('、')}，可更快形成展陈闭环。`)
    }
    if (linkedVillageProjects.value.some(project => !project.completed && project.available)) {
      recommendedActions.push('推进带有“博物馆”联动的村庄建设，可同步提升展示承接能力与周度收益。')
    }
    if (activeTheme) {
      recommendedActions.push(`围绕祠堂主题「${activeTheme.name}」补齐 ${activeTheme.favoredCategories.join('、')} 藏品，可进一步放大展示评分与访客热度。`)
    }
    const ecologySpecimenBacklog = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
    if (regionMapStore.regionIntegrationEnabled && ecologySpecimenBacklog > 0) {
      recommendedActions.push(`行旅图库存里还有 ${ecologySpecimenBacklog} 份生态样本，适合优先接学者委托、专题展示和研究说明链。`)
    }
    if (regionMapStore.regionIntegrationEnabled && regionMapStore.getRegionCompletedRouteCount('mirage_marsh') >= 2) {
      recommendedActions.push('蜃潮泽地已经形成稳定样本线，适合把夜游观察、生态异常和馆务展示收束成同一条研究链。')
    }
    if (regionMapStore.regionIntegrationEnabled && regionMapStore.currentWeeklyFocus.focusedRegionId === 'mirage_marsh') {
      recommendedActions.push('本周行旅图焦点落在蜃潮泽地，可优先把泽地样本、夜游观察和馆务展示承接到同一条研究线。')
    }

    return {
      themeWeekFocus: currentThemeWeekMuseumFocus.value,
      linkedVillageProjects: linkedVillageProjects.value,
      supportNpcOverview: supportNpcOverview.value,
      featuredScholarCommissions: featuredScholarCommissionOverview.value,
      questBoardBiasProfile: questBoardBiasProfile.value,
      recommendedActions: dedupeList(recommendedActions).slice(0, Math.max(1, museumDisplayConfig.recommendedActionLimit))
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
    exhibitSets: exhibitSetOverview.value,
    speciesNotes: speciesNoteOverview.value,
    activeShrineThemeId: activeShrineThemeId.value,
    unlockedExhibitSlotCount: unlockedExhibitSlotCount.value,
    availableScholarCommissionCount: availableScholarCommissionCount.value,
    completedExhibitSetCount: completedExhibitSetCount.value,
    claimableExhibitSetCount: claimableExhibitSetCount.value
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
      scholarCommissionCount: ALL_MUSEUM_SCHOLAR_COMMISSIONS.length,
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
    const lockId = `donate:${itemId}`
    const shouldGuard = museumFeatureFlags.museumActionGuardEnabled
    if (shouldGuard && !beginMuseumAction(lockId)) return false

    const inventoryStore = useInventoryStore()
    const inventorySnapshot = inventoryStore.serialize()
    const donatedSnapshot = [...donatedItems.value]

    try {
      const removed = inventoryStore.removeItem(itemId, 1)
      if (!removed) return false
      donatedItems.value.push(itemId)
      const rewardItems = itemId === ANCIENT_SEED_ITEM_ID ? ANCIENT_SEED_DONATION_REWARD_ITEMS : []
      if (rewardItems.length > 0 && !inventoryStore.addItemsExact(rewardItems)) {
        throw new Error('museum donation reward delivery failed')
      }
      const rewardSummary = rewardItems.length > 0 ? '馆方返还远古种子×1，并记录了远古水果制种配方。' : ''
      addLog(`【博物馆】已捐赠 ${getMuseumItemDef(itemId)?.name ?? itemId}。${rewardSummary}`, {
        category: 'museum',
        tags: ['late_game_cycle'],
        meta: {
          itemId,
          donatedCount: donatedItems.value.length,
          rewardItems: rewardItems.map(item => `${item.itemId}x${item.quantity}`).join(' | '),
          unlockedRecipeId: itemId === ANCIENT_SEED_ITEM_ID ? 'seed_from_ancient_fruit' : ''
        }
      })
      return true
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      donatedItems.value = donatedSnapshot
      return false
    } finally {
      if (shouldGuard) finishMuseumAction(lockId)
    }
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
  const getExhibitSetState = (setId: string) => exhibitSetStates.value[setId]
  const getExhibitSetOverview = (setId: string) => exhibitSetOverview.value.find(set => set.id === setId)
  const getShrineThemeOverview = (themeId: string) => shrineThemeOverview.value.find(theme => theme.id === themeId)
  const getActiveShrineTheme = () => shrineThemeOverview.value.find(theme => theme.active) ?? null
  const getCurrentShrineTheme = () => getActiveShrineTheme()
  const getAvailableExhibitSlots = (hallZoneId?: MuseumHallZoneId) => {
    const slots = exhibitSlotOverview.value.filter(slot => slot.isAvailable)
    return hallZoneId ? slots.filter(slot => slot.hallZoneId === hallZoneId) : slots
  }
  const getUnlockedExhibitSlots = () => exhibitSlotOverview.value.filter(slot => slot.unlocked)

  const getScholarCommissionMaterialStatus = (commissionId: string) => {
    const commission = getScholarCommissionOverview(commissionId)
    if (!commission) return []
    const inventoryStore = useInventoryStore()
    return normalizeScholarCommissionMaterialRequirements(commission.materialRequirements).map(requirement => {
      const owned = inventoryStore.getTotalItemCount(requirement.itemId)
      return {
        ...requirement,
        owned,
        enough: owned >= requirement.quantity,
        itemName: getItemById(requirement.itemId)?.name ?? requirement.itemId
      }
    })
  }

  const canSupplyScholarCommissionMaterials = (commissionId: string): boolean =>
    getScholarCommissionMaterialStatus(commissionId).every(requirement => requirement.enough)

  const getScholarCommissionMaterialBlockedReason = (commissionId: string): string => {
    const missing = getScholarCommissionMaterialStatus(commissionId).filter(requirement => !requirement.enough)
    if (missing.length <= 0) return ''
    return `缺少研究材料：${missing.map(item => `${item.itemName} ${item.owned}/${item.quantity}`).join('、')}。`
  }

  const getExhibitSetRequirementStatus = (setId: string) => getExhibitSetOverview(setId)?.requirements ?? []

  const getExhibitSetBlockedReason = (setId: string): string => {
    const overview = getExhibitSetOverview(setId)
    if (!overview) return '博物馆专题展组不存在。'
    if (!overview.unlocked) return `展陈等级 ${exhibitLevel.value}/${overview.unlockExhibitLevel}，暂未开放。`
    if (overview.completed) return '该专题展组已经完成。'
    const blockedDuplicateRequirement = overview.requirements.find(requirement => requirement.remaining > 0 && requirement.owned > 0 && !requirement.duplicateReady)
    if (blockedDuplicateRequirement) return `${blockedDuplicateRequirement.itemName} 需要先完成首件捐赠，展组只收副本。`
    const availableRequirement = overview.requirements.find(requirement => requirement.remaining > 0 && requirement.owned > 0 && requirement.duplicateReady)
    if (!availableRequirement) return '背包中没有可提交的展组副本材料。'
    return ''
  }

  const beginMuseumAction = (lockId: string): boolean => {
    if (!museumFeatureFlags.museumActionGuardEnabled) return true
    if (museumActionLocks.value.includes(lockId)) return false
    museumActionLocks.value = [...museumActionLocks.value, lockId]
    return true
  }

  const finishMuseumAction = (lockId: string) => {
    if (!museumFeatureFlags.museumActionGuardEnabled) return
    museumActionLocks.value = museumActionLocks.value.filter(entry => entry !== lockId)
  }

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

  const setExhibitSetState = (setId: string, patch: Partial<MuseumExhibitSetState>) => {
    const current = exhibitSetStates.value[setId] ?? initialState.exhibitSetStates[setId]
    if (!current) return undefined
    const nextState: MuseumExhibitSetState = {
      ...current,
      ...patch,
      submittedItems: patch.submittedItems ? { ...patch.submittedItems } : { ...current.submittedItems }
    }
    exhibitSetStates.value = {
      ...exhibitSetStates.value,
      [setId]: nextState
    }
    return nextState
  }

  const buildDisplayRatingTelemetry = (): MuseumDisplayRatingState => {
    const serviceContractEffect = useShopStore().getServiceContractEffectSummary('museum')
    const fishPondStore = useFishPondStore()
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

    if (serviceContractEffect.museumDisplayRatingBonus > 0) {
      score += serviceContractEffect.museumDisplayRatingBonus
      breakdown.push({
        key: 'service_contract:museum_display',
        label: '巡展服务合同',
        value: serviceContractEffect.museumDisplayRatingBonus
      })
    }

    if (fishPondStore.displayOverview.museumDisplayBonus > 0) {
      score += fishPondStore.displayOverview.museumDisplayBonus
      breakdown.push({
        key: 'fishpond:display_tank',
        label: '鱼塘展示池',
        value: fishPondStore.displayOverview.museumDisplayBonus
      })
    }

    for (const set of exhibitSetOverview.value) {
      if (!set.completed) continue
      for (const reward of set.rewards) {
        if (reward.kind !== 'display_rating' || reward.value <= 0) continue
        score += reward.value
        breakdown.push({
          key: `exhibit_set:${set.id}:${reward.kind}`,
          label: set.name,
          value: reward.value
        })
      }
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
    const serviceContractEffect = useShopStore().getServiceContractEffectSummary('museum')
    const hallTrafficBonusRate = hallProgressOverview.value.reduce(
      (sum, hall) => sum + (hall.currentLevelDef?.visitorFlowBonusRate ?? 0),
      0
    )
    const activeTheme = getActiveShrineTheme()
    const scholarCompletedCount = Object.values(scholarCommissionStates.value).filter(state => state.completed).length
    const assignedExhibitCount = exhibitSlotOverview.value.reduce((sum, slot) => sum + slot.assignedCount, 0)
    const baseVisitors =
      MUSEUM_OPERATIONAL_CONFIG.defaultVisitorFlow +
      unlockedExhibitSlotCount.value * museumOperationConfig.unlockedSlotVisitorBase +
      assignedExhibitCount * museumOperationConfig.assignedExhibitVisitorBase +
      scholarCompletedCount * museumOperationConfig.completedCommissionVisitorBase
    const exhibitSetVisitorBonus = exhibitSetOverview.value.reduce((sum, set) => {
      if (!set.completed) return sum
      return sum + set.rewards
        .filter(reward => reward.kind === 'visitor_flow')
        .reduce((rewardSum, reward) => rewardSum + Math.max(0, reward.value), 0)
    }, 0)
    const ratingBonusVisitors = Math.floor(displayRatingScore * museumOperationConfig.displayRatingToVisitorsFactor)
    const hallBonusVisitors = Math.floor(baseVisitors * hallTrafficBonusRate)
    const shrineBonusVisitors = activeTheme ? Math.floor(baseVisitors * activeTheme.trafficBonusRate) : 0
    const contractBonusVisitors = Math.floor(baseVisitors * serviceContractEffect.museumVisitorBonusRate)
    const bonusVisitors = ratingBonusVisitors + hallBonusVisitors + shrineBonusVisitors + contractBonusVisitors + exhibitSetVisitorBonus
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

  const refreshOperationalTelemetry = () => {
    const displayTelemetry = buildDisplayRatingTelemetry()
    const visitorTelemetry = buildVisitorFlowTelemetry(displayTelemetry.score)
    refreshOperationalTelemetry()
    return { displayTelemetry, visitorTelemetry }
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

    if (museumFeatureFlags.shrineThemeRotationEnabled && shouldRotateTheme) {
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

      if (
        museumFeatureFlags.scholarCommissionAutoCompleteEnabled &&
        displayTelemetry.score >= commission.ratingTarget &&
        visitorTelemetry.score >= commission.trafficTarget
      ) {
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
      scholarCommissionStates.value = Object.fromEntries(
        Object.entries(scholarCommissionStates.value).map(([commissionId, state]) => [
          commissionId,
          state.completed && !state.rewarded
            ? {
                ...state,
                expired: false
              }
            : {
                ...state,
                acceptedDayTag: '',
                progress: 0,
                completed: false,
                rewarded: false,
                expired: false
              }
        ])
      )
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

  const acceptScholarCommission = (commissionId: string): { success: boolean; message: string } => {
    const lockId = `acceptScholarCommission:${commissionId}`
    if (!beginMuseumAction(lockId)) {
      return { success: false, message: '该学者委托正在处理中，请勿重复点击。' }
    }

    try {
    const commission = getScholarCommissionOverview(commissionId)
    if (commission?.state.rewarded) return { success: false, message: '该学者委托奖励已领取，本轮不能重复接取。' }
    if (!commission) return { success: false, message: '学者委托不存在。' }
    if (!commission.unlocked) return { success: false, message: '该学者委托尚未开放。' }
    if (commission.isAccepted) return { success: false, message: '该学者委托已在进行中。' }
    if (commission.isRewardPending) return { success: false, message: '该学者委托已完成，等待领取奖励。' }
    if (commission.state.expired) {
      setScholarCommissionState(commissionId, { expired: false, completed: false, rewarded: false, progress: 0 })
    }

    const acceptedDayTag = getCurrentDayTag()
    setScholarCommissionState(commissionId, {
      acceptedDayTag,
      completed: false,
      rewarded: false,
      expired: false,
      progress: 0
    })

    addLog(`【博物馆】已接取学者委托「${commission.title}」，请在 ${commission.durationDays} 天内提升展陈评分与访客热度。`, {
      category: 'museum',
      tags: ['late_game_cycle'],
      meta: {
        commissionId: commission.id,
        hallZoneId: commission.hallZoneId,
        acceptedDayTag
      }
    })

    return { success: true, message: `已接取学者委托：${commission.title}。` }
    } finally {
      finishMuseumAction(lockId)
    }
  }

  const claimScholarCommissionReward = (commissionId: string): { success: boolean; message: string } => {
    const lockId = `claimScholarCommission:${commissionId}`
    if (!beginMuseumAction(lockId)) {
      return { success: false, message: '该学者委托奖励正在结算中，请勿重复点击。' }
    }

    const inventoryStore = useInventoryStore()
    const inventorySnapshot = inventoryStore.serialize()
    const playerSnapshot = playerStore.serialize()
    const goalSnapshot = goalStore.serialize()
    const npcSnapshot = npcStore.serialize()
    const museumSnapshot = serialize()
    const potentialStore = usePotentialStore()
    const potentialSnapshot = potentialStore.serialize()

    try {
    const commission = getScholarCommissionOverview(commissionId)
    if (!commission) return { success: false, message: '学者委托不存在。' }
    if (!commission.isRewardPending) return { success: false, message: '该学者委托尚未达到领奖条件。' }
    if (!museumFeatureFlags.scholarCommissionRewardEnabled) {
      return { success: false, message: '当前运营配置下学者委托领奖已暂时关闭。' }
    }

    const rewardItems = (commission.reward.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '请先整理背包，当前空间不足以领取学者委托奖励。' }
    }
    const materialRequirements = normalizeScholarCommissionMaterialRequirements(commission.materialRequirements)
    const missingMaterials = materialRequirements
      .map(requirement => ({
        ...requirement,
        owned: inventoryStore.getTotalItemCount(requirement.itemId),
        itemName: getItemById(requirement.itemId)?.name ?? requirement.itemId
      }))
      .filter(requirement => requirement.owned < requirement.quantity)
    if (missingMaterials.length > 0) {
      return {
        success: false,
        message: `缺少研究材料：${missingMaterials.map(item => `${item.itemName} ${item.owned}/${item.quantity}`).join('、')}。`
      }
    }

    for (const requirement of materialRequirements) {
      if (!inventoryStore.removeItemAnywhere(requirement.itemId, requirement.quantity)) {
        throw new Error('museum scholar commission material removal failed')
      }
    }

    if (commission.reward.money) {
      playerStore.earnMoney(commission.reward.money)
    }
    if (commission.reward.reputation) {
      goalStore.goalReputation += commission.reward.reputation
    }
    if (rewardItems.length > 0) {
      inventoryStore.addItemsExact(rewardItems)
    }

    const supportNpcId = (MUSEUM_SCHOLAR_SUPPORT_NPCS[commission.id] ?? [])[0]
    const friendshipMessages = supportNpcId
      ? npcStore.adjustFriendship(
          supportNpcId,
          Math.max(
            museumOperationConfig.scholarFriendshipRewardMinimum,
            Math.ceil((commission.reward.reputation ?? 0) / museumOperationConfig.scholarFriendshipRewardDivisor) || museumOperationConfig.scholarFriendshipRewardMinimum
          )
        )
      : []

    setScholarCommissionState(commissionId, { rewarded: true })
    const scholarPotentialEventKey = `scholar:${commission.id}:${commission.state.acceptedDayTag || getCurrentDayTag()}`
    const potentialReward = potentialStore.claimPotentialSourceReward('museum_hidden_sample', scholarPotentialEventKey, {
      reason: `博物馆学者委托：${commission.title}`
    })

    const rewardSummary = [
      commission.reward.money ? `${commission.reward.money}文` : '',
      commission.reward.reputation ? `目标声望+${commission.reward.reputation}` : '',
      ...(commission.reward.items ?? []).map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`)
    ].filter(Boolean)
    const materialSummary = materialRequirements.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`)

    addLog(`【博物馆】学者委托「${commission.title}」奖励已领取。`, {
      category: 'museum',
      tags: ['late_game_cycle'],
      meta: {
        commissionId: commission.id,
        consumedMaterials: materialSummary.join(' | '),
        rewardSummary: rewardSummary.join(' | '),
        potentialReward: potentialReward.success
      }
    })

    return {
      success: true,
      message: `领取了学者委托奖励：${commission.title}${materialSummary.length > 0 ? `，消耗${materialSummary.join('、')}` : ''}${rewardSummary.length > 0 ? `，获得${rewardSummary.join('、')}` : ''}${potentialReward.success ? '，并沉淀了博物馆考据材料' : ''}${friendshipMessages.length > 0 ? `。${friendshipMessages.join(' ')}` : '。'}`
    }
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      playerStore.deserialize(playerSnapshot)
      goalStore.deserialize(goalSnapshot)
      npcStore.deserialize(npcSnapshot)
      potentialStore.deserialize(potentialSnapshot)
      deserialize(museumSnapshot)
      return { success: false, message: '学者委托奖励结算失败，已回滚，请稍后再试。' }
    } finally {
      finishMuseumAction(lockId)
    }
  }

  const submitMuseumExhibitSetItem = (setId: string, itemId: string, quantity: number = 1): { success: boolean; message: string } => {
    const submitQuantityRequest = Math.max(1, Math.floor(Number(quantity) || 1))
    const lockId = `submitMuseumExhibitSet:${setId}:${itemId}`
    const failExhibitSetSubmission = (message: string) => {
      addLog(`【博物馆】专题展组提交失败：${message}`, {
        category: 'museum',
        tags: ['museum_exhibit_set', 'late_game_cycle', 'resource_sink'],
        meta: { setId, itemId, quantity: submitQuantityRequest }
      })
      return { success: false, message }
    }
    if (!beginMuseumAction(lockId)) {
      return failExhibitSetSubmission('该专题展组正在整理中，请勿重复点击。')
    }

    const inventoryStore = useInventoryStore()
    const inventorySnapshot = inventoryStore.serialize()
    const exhibitSetSnapshot = cloneMuseumSaveData(serialize()).exhibitSetStates

    try {
      const set = getExhibitSetOverview(setId)
      if (!set) return failExhibitSetSubmission('博物馆专题展组不存在。')
      if (!set.unlocked) return failExhibitSetSubmission(`展陈等级 ${exhibitLevel.value}/${set.unlockExhibitLevel}，暂未开放。`)
      if (set.completed) return failExhibitSetSubmission('该专题展组已经完成。')

      const requirement = set.requirements.find(entry => entry.itemId === itemId)
      if (!requirement) return failExhibitSetSubmission('该物品不属于此专题展组。')
      if (requirement.remaining <= 0) return failExhibitSetSubmission('该展品需求已经提交完成。')
      if (!requirement.duplicateReady) return failExhibitSetSubmission(`${requirement.itemName} 需要先完成首件捐赠，展组只收副本。`)
      if (requirement.owned <= 0) return failExhibitSetSubmission(`背包中没有可提交的 ${requirement.itemName}。`)

      const submitQuantity = Math.min(submitQuantityRequest, requirement.remaining, requirement.owned)
      if (!inventoryStore.removeItemAnywhere(itemId, submitQuantity)) {
        return failExhibitSetSubmission(`提交 ${requirement.itemName} 失败，背包数量不足。`)
      }

      const currentState = exhibitSetStates.value[setId] ?? initialState.exhibitSetStates[setId]
      const submittedItems = {
        ...(currentState?.submittedItems ?? {}),
        [itemId]: Math.min(requirement.quantity, (currentState?.submittedItems?.[itemId] ?? 0) + submitQuantity)
      }
      const completed = set.requirements.every(entry => (submittedItems[entry.itemId] ?? 0) >= entry.quantity)
      setExhibitSetState(setId, {
        submittedItems,
        completed,
        lastSubmittedDayTag: getCurrentDayTag(),
        completedDayTag: completed ? getCurrentDayTag() : currentState?.completedDayTag ?? ''
      })
      if (completed) {
        refreshOperationalTelemetry()
        goalStore.recordWeeklyActivityCounter('life_linkage_actions', 1)
      }

      addLog(`【博物馆】专题展组「${set.name}」提交了 ${requirement.itemName}×${submitQuantity}${completed ? '，展组已完成。' : '。'}`, {
        category: 'museum',
        tags: ['museum_exhibit_set', 'late_game_cycle'],
        meta: {
          setId,
          itemId,
          quantity: submitQuantity,
          completed
        }
      })

      return {
        success: true,
        message: completed
          ? `专题展组「${set.name}」已完成。`
          : `已提交 ${requirement.itemName}×${submitQuantity}。`
      }
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      exhibitSetStates.value = exhibitSetSnapshot
      return failExhibitSetSubmission('专题展组提交失败，已回滚，请稍后再试。')
    } finally {
      finishMuseumAction(lockId)
    }
  }

  const claimExhibitSetReward = (setId: string): { success: boolean; message: string } => {
    const lockId = `claimMuseumExhibitSet:${setId}`
    if (!beginMuseumAction(lockId)) {
      return { success: false, message: '该专题展组奖励正在确认中，请勿重复点击。' }
    }

    const exhibitSetSnapshot = cloneMuseumSaveData(serialize()).exhibitSetStates

    try {
      const set = getExhibitSetOverview(setId)
      if (!set) return { success: false, message: '博物馆专题展组不存在。' }
      if (!set.unlocked) return { success: false, message: `展陈等级 ${exhibitLevel.value}/${set.unlockExhibitLevel}，暂未开放。` }
      if (!set.completed) return { success: false, message: '该专题展组尚未完成。' }
      if (set.state.rewardClaimed) return { success: false, message: '该专题展组奖励已经确认。' }

      setExhibitSetState(setId, { rewardClaimed: true })
      refreshOperationalTelemetry()

      const rewardSummary = set.rewards
        .map(reward => `${reward.label}+${reward.value}`)
        .join('、')
      const telemetryRewards = set.rewards
        .filter(reward => EXHIBIT_SET_TELEMETRY_REWARD_KINDS.has(reward.kind))
        .map(reward => reward.kind)

      addLog(`【博物馆】专题展组「${set.name}」奖励已确认：${rewardSummary || '展陈记录已更新'}。`, {
        category: 'museum',
        tags: ['museum_exhibit_set', 'late_game_cycle'],
        meta: {
          setId,
          rewardSummary,
          telemetryRewards: telemetryRewards.join(' | ')
        }
      })

      return {
        success: true,
        message: `已确认专题展组「${set.name}」奖励：${rewardSummary || '展陈记录已更新'}。`
      }
    } catch {
      exhibitSetStates.value = exhibitSetSnapshot
      return { success: false, message: '专题展组奖励确认失败，已回滚，请稍后再试。' }
    } finally {
      finishMuseumAction(lockId)
    }
  }

  /** 领取里程碑奖励 */
  const claimMilestone = (count: number): boolean => {
    const lockId = `claimMilestone:${count}`
    if (!beginMuseumAction(lockId)) return false
    const inventoryStore = useInventoryStore()
    const inventorySnapshot = inventoryStore.serialize()
    const playerSnapshot = playerStore.serialize()
    const claimedSnapshot = [...claimedMilestones.value]
    const potentialStore = usePotentialStore()
    const potentialSnapshot = potentialStore.serialize()

    try {
      const milestone = MUSEUM_MILESTONES.find(m => m.count === count)
      if (!milestone) return false
      if (donatedCount.value < count) return false
      if (claimedMilestones.value.includes(count)) return false

      const rewardItems = (milestone.reward.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
      if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) return false

      if (milestone.reward.money) {
        playerStore.earnMoney(milestone.reward.money)
      }
      if (milestone.reward.items) {
        inventoryStore.addItemsExact(rewardItems)
      }
      claimedMilestones.value.push(count)
      const potentialReward = potentialStore.claimPotentialSourceReward('museum_hidden_sample', `milestone:${count}`, {
        reason: `博物馆里程碑：${milestone.name}`
      })
      addLog(`【博物馆】已领取里程碑「${milestone.name}」奖励。${potentialReward.success ? ' 潜能材料有所沉淀。' : ''}`, {
        category: 'museum',
        tags: ['late_game_cycle'],
        meta: {
          milestoneCount: count,
          rewardMoney: milestone.reward.money ?? 0,
          rewardItems: rewardItems.map(item => `${item.itemId}x${item.quantity}`).join(' | '),
          potentialReward: potentialReward.success
        }
      })
      return true
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      playerStore.deserialize(playerSnapshot)
      potentialStore.deserialize(potentialSnapshot)
      claimedMilestones.value = claimedSnapshot
      return false
    } finally {
      finishMuseumAction(lockId)
    }
  }

  const applySaveData = (dataLike: Partial<MuseumSaveData> | Record<string, any> | undefined | null) => {
    const data = cloneMuseumSaveData(normalizeMuseumSaveData(dataLike))
    saveVersion.value = data.saveVersion
    donatedItems.value = [...data.donatedItems]
    claimedMilestones.value = [...data.claimedMilestones]
    exhibitSlotStates.value = data.exhibitSlotStates
    hallProgress.value = data.hallProgress
    scholarCommissionStates.value = data.scholarCommissionStates
    exhibitSetStates.value = data.exhibitSetStates
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
      exhibitSetStates: exhibitSetStates.value,
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
    museumActionLocks.value = []
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
    exhibitSetStates,
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
    completedExhibitSetCount,
    claimableExhibitSetCount,
    visitorFlowState,
    displayRatingState,
    visitorFlowBand,
    displayRatingBand,
    exhibitSlotOverview,
    hallProgressOverview,
    visitorFlowOverview,
    displayRatingOverview,
    scholarCommissionOverview,
    exhibitSetOverview,
    shrineThemeOverview,
    speciesNoteOverview,
    operationalOverview,
    currentThemeWeekMuseumFocus,
    featuredScholarCommissionOverview,
    questBoardBiasProfile,
    supportNpcOverview,
    crossSystemOverview,
    currentAuditSegment,
    sustainedOperationAuditOverview,
    sustainedOperationAuditConfig: MUSEUM_SUSTAINED_OPERATION_AUDIT_CONFIG,
    operationalConfig: MUSEUM_OPERATIONAL_CONFIG,
    exhibitSlotDefs: MUSEUM_OPERATIONAL_CONFIG.exhibitSlots,
    hallLevelDefs: MUSEUM_HALL_LEVELS,
    scholarCommissionDefs: ALL_MUSEUM_SCHOLAR_COMMISSIONS,
    exhibitSetDefs: MUSEUM_EXHIBIT_SETS,
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
    getScholarCommissionMaterialStatus,
    canSupplyScholarCommissionMaterials,
    getScholarCommissionMaterialBlockedReason,
    getExhibitSetState,
    getExhibitSetOverview,
    getExhibitSetRequirementStatus,
    getExhibitSetBlockedReason,
    getShrineThemeOverview,
    getActiveShrineTheme,
    getCurrentShrineTheme,
    getAvailableExhibitSlots,
    getUnlockedExhibitSlots,
    processOperationalTick,
    acceptScholarCommission,
    claimScholarCommissionReward,
    submitMuseumExhibitSetItem,
    claimExhibitSetReward,
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
