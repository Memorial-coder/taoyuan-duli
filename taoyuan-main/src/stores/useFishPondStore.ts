import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  PondLevel,
  FishPondState,
  PondFish,
  FishGenetics,
  PondDailyResult,
  PondDisplayEntry,
  PondEligibilityGenerationBucket,
  PondEligibilitySnapshot,
  PondFishRatingSnapshot,
  PondMaintenanceState,
  PondRatingBreakdownEntry,
  PondContestSettlementSummary,
  PondContestState,
  PondContestDef
} from '@/types/fishPond'
import type { Quality } from '@/types'
import {
  POND_BUILD_COST,
  POND_UPGRADE_COSTS,
  POND_CAPACITY,
  WATER_QUALITY_DECAY_BASE,
  WATER_QUALITY_DECAY_HALF,
  WATER_QUALITY_DECAY_CROWDED,
  WATER_QUALITY_DECAY_HUNGRY,
  DISEASE_THRESHOLD,
  DISEASE_CHANCE_BASE,
  SICK_DEATH_DAYS,
  FEED_WATER_RESTORE,
  PURIFIER_WATER_RESTORE,
  FISH_BREEDING_DAYS,
  GENETICS_FLUCTUATION_BASE,
  POND_MUTATION_JUMP_MIN,
  POND_MUTATION_JUMP_MAX,
  getPondableFish,
  isPondableFish
} from '@/data/fishPond'
import { POND_CONTEST_DEFS, WS14_POND_CONTEST_DEFS, createDefaultPondContestState, getWeeklyPondContestDef } from '@/data/fishPondContests'
import { getGen1BreedsForFish, findBreedByParents, getBreedById, getBreedsByGeneration } from '@/data/pondBreeds'
import { getItemById } from '@/data/items'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
import { useSkillStore } from './useSkillStore'
import { useWalletStore } from './useWalletStore'
import { useGoalStore } from './useGoalStore'
import { useSettingsStore } from './useSettingsStore'
import { addLog } from '@/composables/useGameLog'
import { getWeekCycleInfo } from '@/utils/weekCycle'

let _idCounter = 0
const generateFishId = (): string => {
  _idCounter++
  return `pf_${Date.now()}_${_idCounter}`
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v))
const createDefaultMaintenanceState = (): PondMaintenanceState => ({
  ornamentalFeedBuffDays: 0,
  quarantineShieldDays: 0,
  lastOrnamentalFeedDayTag: '',
  lastAdvancedPurifierDayTag: ''
})
const normalizeMaintenanceState = (value: any): PondMaintenanceState => ({
  ornamentalFeedBuffDays: Math.max(0, Number(value?.ornamentalFeedBuffDays) || 0),
  quarantineShieldDays: Math.max(0, Number(value?.quarantineShieldDays) || 0),
  lastOrnamentalFeedDayTag: typeof value?.lastOrnamentalFeedDayTag === 'string' ? value.lastOrnamentalFeedDayTag : '',
  lastAdvancedPurifierDayTag: typeof value?.lastAdvancedPurifierDayTag === 'string' ? value.lastAdvancedPurifierDayTag : ''
})
const normalizeBreedingPair = (value: any) => {
  if (!value || typeof value !== 'object') return null
  const parentA = typeof value.parentA === 'string' ? value.parentA : ''
  const parentB = typeof value.parentB === 'string' ? value.parentB : ''
  const fishId = typeof value.fishId === 'string' && isPondableFish(value.fishId) ? value.fishId : ''
  if (!parentA || !parentB || !fishId) return null
  return {
    parentA,
    parentB,
    daysLeft: Math.max(0, Number(value.daysLeft) || 0),
    fishId
  }
}
const normalizeDisplayEntries = (value: any): PondDisplayEntry[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter(entry => entry && typeof entry === 'object' && typeof entry.pondFishId === 'string')
    .map(entry => ({
      pondFishId: entry.pondFishId,
      fishId: typeof entry.fishId === 'string' ? entry.fishId : '',
      fishName: typeof entry.fishName === 'string' ? entry.fishName : '',
      breedId: typeof entry.breedId === 'string' ? entry.breedId : null,
      snapshotScore: Math.max(0, Number(entry.snapshotScore) || 0),
      snapshotShowValue: Math.max(0, Number(entry.snapshotShowValue) || 0),
      snapshotGeneration: Math.max(1, Number(entry.snapshotGeneration) || 1),
      assignedAtDayTag: typeof entry.assignedAtDayTag === 'string' ? entry.assignedAtDayTag : ''
    }))
}

type PondHighCareActionStatus = 'ready' | 'noEligibleFish' | 'missingItem' | 'dailyLimit'
type PondDisplayAssignmentStatus = 'ready' | 'alreadyAssigned' | 'displayFull' | 'ineligible' | 'missingFish'

export const useFishPondStore = defineStore('fishPond', () => {
  // === 状态 ===

  const pond = ref<FishPondState>({
    built: false,
    level: 1 as PondLevel,
    fish: [],
    waterQuality: 100,
    fedToday: false,
    breeding: null,
    collectedToday: false
  })

  /** 已发现的品种ID集合（图鉴） */
  const discoveredBreeds = ref<Set<string>>(new Set())
  const lastOrderSubmissionSnapshots = ref<PondFishRatingSnapshot[]>([])

  /** 从鱼塘取出后暂存的鱼个体信息，避免“取出→放回”反复重roll品种 */
  const returnedFishPool = ref<Record<string, Omit<PondFish, 'id'>[]>>({})
  const pondContestState = ref<PondContestState>(createDefaultPondContestState())
  const lastPondContestSettlement = ref<PondContestSettlementSummary | null>(null)
  const displayEntries = ref<PondDisplayEntry[]>([])
  const maintenanceState = ref<PondMaintenanceState>(createDefaultMaintenanceState())

  // === 计算属性 ===

  const capacity = computed(() => (pond.value.built ? POND_CAPACITY[pond.value.level] : 0))
  const fishCount = computed(() => pond.value.fish.length)
  const isFull = computed(() => fishCount.value >= capacity.value)
  const sickFish = computed(() => pond.value.fish.filter(f => f.sick))
  const matureFish = computed(() => pond.value.fish.filter(f => f.mature))
  const getCurrentDayTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  }
  const getCurrentWeekInfo = () => {
    const gameStore = useGameStore()
    return getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
  }
  const getMaintenanceConfig = () => useSettingsStore().getLateGameBalanceConfig().fishPondMaintenance
  const displayAssignedFishIds = computed(() => new Set(displayEntries.value.map(entry => entry.pondFishId)))

  /** 密度百分比 */
  const density = computed(() => {
    if (capacity.value === 0) return 0
    return fishCount.value / capacity.value
  })

  // === 建造/升级 ===

  const buildPond = (): boolean => {
    if (pond.value.built) return false
    const playerStore = usePlayerStore()

    for (const mat of POND_BUILD_COST.materials) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    if (!playerStore.spendMoney(POND_BUILD_COST.money)) return false
    for (const mat of POND_BUILD_COST.materials) {
      removeCombinedItem(mat.itemId, mat.quantity)
    }

    pond.value.built = true
    pond.value.level = 1
    pond.value.waterQuality = 100
    if (!pondContestState.value.weekId || pondContestState.value.weekId !== getCurrentWeekInfo().seasonWeekId || !pondContestState.value.contestId) {
      syncContestStateToCurrentWeek()
    }
    return true
  }

  const upgradePond = (): boolean => {
    if (!pond.value.built) return false
    if (pond.value.level >= 5) return false
    const nextLevel = (pond.value.level + 1) as 2 | 3 | 4 | 5
    const cost = POND_UPGRADE_COSTS[nextLevel]

    const playerStore = usePlayerStore()

    for (const mat of cost.materials) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    if (!playerStore.spendMoney(cost.money)) return false
    for (const mat of cost.materials) {
      removeCombinedItem(mat.itemId, mat.quantity)
    }

    pond.value.level = nextLevel
    return true
  }

  // === 鱼操作 ===

  /** 从背包放鱼入塘（自动分配随机 Gen1 品种） */
  const addFish = (fishId: string, quantity: number = 1): number => {
    if (!pond.value.built) return 0
    if (!isPondableFish(fishId)) return 0
    const inventoryStore = useInventoryStore()
    const def = getPondableFish(fishId)!
    const g1Breeds = getGen1BreedsForFish(fishId)
    let added = 0
    for (let i = 0; i < quantity; i++) {
      if (fishCount.value >= capacity.value) break
      if (!inventoryStore.removeItem(fishId, 1)) break
      const reused = returnedFishPool.value[fishId]?.shift() ?? null
      const breed = !reused && g1Breeds.length > 0 ? g1Breeds[Math.floor(Math.random() * g1Breeds.length)] : null
      const fish: PondFish = reused
        ? {
            id: generateFishId(),
            fishId,
            name: reused.name,
            genetics: { ...reused.genetics },
            daysInPond: reused.daysInPond,
            mature: reused.mature,
            sick: reused.sick,
            sickDays: reused.sickDays,
            breedId: reused.breedId
          }
        : {
            id: generateFishId(),
            fishId,
            name: breed ? breed.name : def.name,
            genetics: { ...def.defaultGenetics },
            daysInPond: 0,
            mature: false,
            sick: false,
            sickDays: 0,
            breedId: breed ? breed.breedId : null
          }
      pond.value.fish.push(fish)
      if (fish.breedId) discoveredBreeds.value.add(fish.breedId)
      added++
    }
    return added
  }

  /** 从塘中取鱼回背包 */
  const removeFish = (pondFishId: string): boolean => {
    const idx = pond.value.fish.findIndex(f => f.id === pondFishId)
    if (idx === -1) return false
    const fish = pond.value.fish[idx]!
    const inventoryStore = useInventoryStore()
    if (!inventoryStore.canAddItem(fish.fishId, 1)) return false
    if (!inventoryStore.addItemExact(fish.fishId, 1)) return false
    returnedFishPool.value[fish.fishId] ??= []
    returnedFishPool.value[fish.fishId]!.push({
      fishId: fish.fishId,
      name: fish.name,
      genetics: { ...fish.genetics },
      daysInPond: fish.daysInPond,
      mature: fish.mature,
      sick: fish.sick,
      sickDays: fish.sickDays,
      breedId: fish.breedId
    })
    pond.value.fish.splice(idx, 1)
    // 如果正在繁殖的鱼被取出，取消繁殖
    if (pond.value.breeding && (pond.value.breeding.parentA === pondFishId || pond.value.breeding.parentB === pondFishId)) {
      pond.value.breeding = null
    }
    pruneDisplayEntries()
    pruneContestRegistrations()
    return true
  }

  const getFishBreedGeneration = (fish: PondFish): number => {
    const breed = fish.breedId ? getBreedById(fish.breedId) : null
    return breed?.generation ?? 1
  }

  const buildPondFishRatingSnapshot = (fish: PondFish): PondFishRatingSnapshot => {
    const maintenanceConfig = getMaintenanceConfig()
    const generation = getFishBreedGeneration(fish)
    const generationScore = clamp(18 + generation * 16, 0, 100)
    const displayAssigned = displayAssignedFishIds.value.has(fish.id)
    const ornamentalFeedBonus = maintenanceState.value.ornamentalFeedBuffDays > 0 && fish.mature && !fish.sick
      ? maintenanceConfig.ornamentalFeedShowBonus
      : 0
    const displayBonus = displayAssigned ? Math.max(4, Math.floor(maintenanceConfig.ornamentalFeedShowBonus / 2)) : 0
    const quarantineBonus = maintenanceState.value.quarantineShieldDays > 0 ? 10 : 0
    const showValue = clamp(
      Math.round(
        fish.genetics.qualityGene * 0.42 +
        fish.genetics.weight * 0.18 +
        fish.genetics.diseaseRes * 0.08 +
        generationScore * 0.24 +
        (fish.mature ? 10 : 0) -
        (fish.sick ? 24 : 0) +
        ornamentalFeedBonus +
        displayBonus
      ),
      0,
      100
    )
    const foodValue = clamp(
      Math.round(
        fish.genetics.weight * 0.35 +
        fish.genetics.growthRate * 0.2 +
        fish.genetics.qualityGene * 0.22 +
        generationScore * 0.1 +
        (fish.mature ? 12 : 0) -
        (fish.sick ? 20 : 0)
      ),
      0,
      100
    )
    const healthScore = clamp(
      Math.round(
        fish.genetics.diseaseRes * 0.55 +
        pond.value.waterQuality * 0.35 +
        (fish.sick ? -35 : 8) -
        fish.sickDays * 4 +
        quarantineBonus
      ),
      0,
      100
    )
    const stabilityScore = clamp(
      Math.round(
        fish.genetics.diseaseRes * 0.45 +
        fish.genetics.growthRate * 0.2 +
        (100 - fish.genetics.mutationRate * 2) * 0.35 +
        (maintenanceState.value.quarantineShieldDays > 0 ? 6 : 0)
      ),
      0,
      100
    )
    const entries: PondRatingBreakdownEntry[] = [
      { key: 'generation', label: '世代', value: generationScore, weight: 0.12, contribution: Math.round(generationScore * 0.12) },
      { key: 'show', label: '观赏', value: showValue, weight: 0.33, contribution: Math.round(showValue * 0.33) },
      { key: 'food', label: '食用', value: foodValue, weight: 0.24, contribution: Math.round(foodValue * 0.24) },
      { key: 'health', label: '健康', value: healthScore, weight: 0.19, contribution: Math.round(healthScore * 0.19) },
      { key: 'stability', label: '稳定', value: stabilityScore, weight: 0.12, contribution: Math.round(stabilityScore * 0.12) }
    ]
    const totalScore = clamp(entries.reduce((sum, entry) => sum + entry.contribution, 0), 0, 100)
    return {
      fishInstanceId: fish.id,
      fishId: fish.fishId,
      fishName: fish.name,
      breedId: fish.breedId,
      mature: fish.mature,
      sick: fish.sick,
      starRating: getGeneticStarRating(fish.genetics),
      totalScore,
      showValue,
      foodValue,
      healthScore,
      stabilityScore,
      generation,
      entries
    }
  }

  const pondFishRatings = computed<PondFishRatingSnapshot[]>(() =>
    pond.value.fish.map(fish => buildPondFishRatingSnapshot(fish))
  )

  const getPondFishRatingSnapshot = (pondFishId: string) =>
    pondFishRatings.value.find(entry => entry.fishInstanceId === pondFishId) ?? null

  const pondEligibilitySnapshots = computed<PondEligibilitySnapshot[]>(() => {
    const grouped = new Map<string, PondFishRatingSnapshot[]>()
    for (const rating of pondFishRatings.value) {
      const list = grouped.get(rating.fishId) ?? []
      list.push(rating)
      grouped.set(rating.fishId, list)
    }

    return [...grouped.entries()].map(([fishId, ratings]) => {
      const generationBuckets = [1, 2, 3, 4, 5]
        .map<PondEligibilityGenerationBucket>(generation => {
          const scoped = ratings.filter(entry => entry.generation === generation)
          return {
            generation,
            totalCount: scoped.length,
            matureCount: scoped.filter(entry => entry.mature).length,
            healthyCount: scoped.filter(entry => !entry.sick).length,
            matureHealthyCount: scoped.filter(entry => entry.mature && !entry.sick).length,
            bestTotalScore: scoped.length > 0 ? Math.max(...scoped.map(entry => entry.totalScore)) : 0
          }
        })
        .filter(bucket => bucket.totalCount > 0)

      return {
        fishId,
        fishName: ratings[0]?.fishName ?? (getPondableFish(fishId)?.name ?? fishId),
        totalCount: ratings.length,
        matureCount: ratings.filter(entry => entry.mature).length,
        healthyCount: ratings.filter(entry => !entry.sick).length,
        matureHealthyCount: ratings.filter(entry => entry.mature && !entry.sick).length,
        bestShowValue: ratings.length > 0 ? Math.max(...ratings.map(entry => entry.showValue)) : 0,
        bestFoodValue: ratings.length > 0 ? Math.max(...ratings.map(entry => entry.foodValue)) : 0,
        bestTotalScore: ratings.length > 0 ? Math.max(...ratings.map(entry => entry.totalScore)) : 0,
        generationBuckets
      }
    }).sort((a, b) => b.bestTotalScore - a.bestTotalScore)
  })

  const getEligibilitySnapshotForFishId = (fishId: string) =>
    pondEligibilitySnapshots.value.find(entry => entry.fishId === fishId) ?? null

  const highTierFishRatings = computed(() => {
    const threshold = getMaintenanceConfig().highTierScoreThreshold
    return pondFishRatings.value.filter(entry => entry.totalScore >= threshold)
  })
  const highCareEligibleFishRatings = computed(() => highTierFishRatings.value.filter(entry => entry.mature && !entry.sick))

  const displayOverview = computed(() => {
    const config = getMaintenanceConfig()
    const totalShowValue = displayEntries.value.reduce((sum, entry) => sum + entry.snapshotShowValue, 0)
    const museumDisplayBonus = displayEntries.value.reduce(
      (sum, entry) => sum + Math.max(1, Math.floor(entry.snapshotShowValue / config.displayTankMuseumScoreDivisor)),
      0
    )
    return {
      slotLimit: config.displayTankSlotLimit,
      entryCount: displayEntries.value.length,
      totalShowValue,
      museumDisplayBonus,
      contestBonus: maintenanceState.value.ornamentalFeedBuffDays > 0 ? config.ornamentalFeedContestBonus : 0
    }
  })

  const pruneDisplayEntries = () => {
    displayEntries.value = displayEntries.value.filter(entry => pond.value.fish.some(candidate => candidate.id === entry.pondFishId))
  }

  const getDisplayAssignmentStatus = (pondFishId: string): PondDisplayAssignmentStatus => {
    const rating = getPondFishRatingSnapshot(pondFishId)
    const fish = pond.value.fish.find(entry => entry.id === pondFishId)
    if (displayAssignedFishIds.value.has(pondFishId)) return 'alreadyAssigned'
    if (!rating || !fish) return 'missingFish'
    if (fish.sick || !fish.mature || rating.totalScore < getMaintenanceConfig().highTierScoreThreshold) return 'ineligible'
    if (displayEntries.value.length >= getMaintenanceConfig().displayTankSlotLimit) return 'displayFull'
    return 'ready'
  }

  const canAssignDisplayFish = (pondFishId: string): boolean => {
    return getDisplayAssignmentStatus(pondFishId) === 'ready'
  }

  const assignDisplayFish = (pondFishId: string): boolean => {
    if (!canAssignDisplayFish(pondFishId)) return false
    const rating = getPondFishRatingSnapshot(pondFishId)
    const fish = pond.value.fish.find(entry => entry.id === pondFishId)
    if (!rating || !fish) return false
    displayEntries.value = [
      ...displayEntries.value,
      {
        pondFishId,
        fishId: fish.fishId,
        fishName: fish.name,
        breedId: fish.breedId,
        snapshotScore: rating.totalScore,
        snapshotShowValue: rating.showValue,
        snapshotGeneration: rating.generation,
        assignedAtDayTag: getCurrentDayTag()
      }
    ]
    return true
  }

  const removeDisplayFish = (pondFishId: string): boolean => {
    if (!displayAssignedFishIds.value.has(pondFishId)) return false
    displayEntries.value = displayEntries.value.filter(entry => entry.pondFishId !== pondFishId)
    return true
  }

  const getOrnamentalFeedStatus = (): PondHighCareActionStatus => {
    if (!pond.value.built || highCareEligibleFishRatings.value.length <= 0) return 'noEligibleFish'
    const currentDayTag = getCurrentDayTag()
    if (maintenanceState.value.lastOrnamentalFeedDayTag === currentDayTag) return 'dailyLimit'
    if (useInventoryStore().getItemCount('ornamental_feed') <= 0) return 'missingItem'
    return 'ready'
  }

  const useOrnamentalFeed = (): boolean => {
    if (getOrnamentalFeedStatus() !== 'ready') return false
    const inventoryStore = useInventoryStore()
    const currentDayTag = getCurrentDayTag()
    if (!inventoryStore.removeItem('ornamental_feed', 1)) return false
    maintenanceState.value = {
      ...maintenanceState.value,
      ornamentalFeedBuffDays: 1,
      lastOrnamentalFeedDayTag: currentDayTag
    }
    return true
  }

  const getAdvancedPurifierStatus = (): PondHighCareActionStatus => {
    if (!pond.value.built || highCareEligibleFishRatings.value.length <= 0) return 'noEligibleFish'
    const currentDayTag = getCurrentDayTag()
    if (maintenanceState.value.lastAdvancedPurifierDayTag === currentDayTag) return 'dailyLimit'
    if (useInventoryStore().getItemCount('advanced_water_purifier') <= 0) return 'missingItem'
    return 'ready'
  }

  const useAdvancedPurifier = (): boolean => {
    if (getAdvancedPurifierStatus() !== 'ready') return false
    const inventoryStore = useInventoryStore()
    const currentDayTag = getCurrentDayTag()
    if (!inventoryStore.removeItem('advanced_water_purifier', 1)) return false
    pond.value.waterQuality = clamp(pond.value.waterQuality + getMaintenanceConfig().advancedPurifierRestore, 0, 100)
    maintenanceState.value = {
      ...maintenanceState.value,
      quarantineShieldDays: Math.max(maintenanceState.value.quarantineShieldDays, getMaintenanceConfig().quarantineShieldDays),
      lastAdvancedPurifierDayTag: currentDayTag
    }
    return true
  }

  const pondContestDefs = [...POND_CONTEST_DEFS, ...WS14_POND_CONTEST_DEFS]
  const currentPondContestDef = computed(() =>
    pondContestState.value.contestId ? pondContestDefs.find(entry => entry.id === pondContestState.value.contestId) ?? null : null
  )
  const contestUsesOrnamentalFeedBonus = (contest: PondContestDef): boolean =>
    contest.scoringMetric === 'showValue' || contest.scoringMetric === 'totalScore'
  const getContestScore = (entry: PondFishRatingSnapshot, contest: PondContestDef): number => {
    const baseScore = entry[contest.scoringMetric]
    if (!contestUsesOrnamentalFeedBonus(contest)) return baseScore
    if (maintenanceState.value.ornamentalFeedBuffDays <= 0 || !entry.mature || entry.sick) return baseScore
    return baseScore + getMaintenanceConfig().ornamentalFeedContestBonus
  }
  const currentThemeWeekPondFocus = computed(() => {
    const goalStore = useGoalStore()
    const themeWeek = goalStore.currentThemeWeek
    if (!themeWeek) return null
    const fishpondFocused = themeWeek.preferredQuestThemeTag === 'fishpond' || (themeWeek.recommendedCatalogTags ?? []).some(tag => ['鱼塘', '渔具'].includes(tag))
    if (!fishpondFocused) return null
    return {
      id: themeWeek.id,
      name: themeWeek.name,
      summary: themeWeek.breedingFocusDescription ?? '本周主题周更偏向鱼塘样本、观赏值与周赛承接。',
      recommendedContestId: currentPondContestDef.value?.id ?? null
    }
  })

  const contestEligibleFish = computed(() => {
    const contest = currentPondContestDef.value
    if (!contest) return []
    return pondFishRatings.value
      .filter(entry => {
        if (contest.requireMature && !entry.mature) return false
        if (contest.requireHealthy && entry.sick) return false
        if (contest.unlockGenerationMin && entry.generation < contest.unlockGenerationMin) return false
        return true
      })
      .sort((a, b) => getContestScore(b, contest) - getContestScore(a, contest))
  })

  const pruneContestRegistrations = (): boolean => {
    const validFishIds = new Set(contestEligibleFish.value.map(entry => entry.fishInstanceId))
    const nextRegisteredFishIds = pondContestState.value.registeredFishIds.filter(id => validFishIds.has(id))
    if (nextRegisteredFishIds.length === pondContestState.value.registeredFishIds.length) return false
    pondContestState.value = {
      ...pondContestState.value,
      registeredFishIds: nextRegisteredFishIds
    }
    return true
  }

  const syncContestStateToCurrentWeek = (): boolean => {
    const currentWeekInfo = getCurrentWeekInfo()
    if (pondContestState.value.weekId === currentWeekInfo.seasonWeekId && pondContestState.value.contestId) {
      pruneContestRegistrations()
      return false
    }
    refreshWeeklyContest(currentWeekInfo.seasonWeekId, currentWeekInfo.absoluteWeek)
    return true
  }

  const registerContestFish = (pondFishId: string): boolean => {
    if (!currentPondContestDef.value || pondContestState.value.settled) return false
    if (pondContestState.value.registeredFishIds.includes(pondFishId)) return false
    if (!contestEligibleFish.value.some(entry => entry.fishInstanceId === pondFishId)) return false
    pondContestState.value = {
      ...pondContestState.value,
      registeredFishIds: [...pondContestState.value.registeredFishIds, pondFishId]
    }
    return true
  }

  const unregisterContestFish = (pondFishId: string): boolean => {
    if (!pondContestState.value.registeredFishIds.includes(pondFishId)) return false
    pondContestState.value = {
      ...pondContestState.value,
      registeredFishIds: pondContestState.value.registeredFishIds.filter(id => id !== pondFishId)
    }
    return true
  }

  const refreshWeeklyContest = (weekId: string, absoluteWeek: number) => {
    const contest = getWeeklyPondContestDef(absoluteWeek)
    pondContestState.value = {
      weekId,
      contestId: contest?.id ?? '',
      registeredFishIds: [],
      settled: false,
      lastSettlementDayTag: ''
    }
    return contest
  }

  const settleWeeklyContest = (weekId: string, settledAtDayTag: string) => {
    const contest = currentPondContestDef.value
    if (!contest || pondContestState.value.weekId !== weekId || pondContestState.value.settled) return lastPondContestSettlement.value
    pruneContestRegistrations()
    const walletStore = useWalletStore()
    const playerStore = usePlayerStore()
    const ranking = pondContestState.value.registeredFishIds
      .map(id => pondFishRatings.value.find(entry => entry.fishInstanceId === id))
      .filter((entry): entry is PondFishRatingSnapshot => entry !== undefined)
      .map(entry => ({
        pondFishId: entry.fishInstanceId,
        fishId: entry.fishId,
        fishName: entry.fishName,
        breedId: entry.breedId,
        score: getContestScore(entry, contest)
      }))
      .sort((a, b) => b.score - a.score)

    const rewardSummary: string[] = []
    const winner = ranking[0]
    if (winner) {
      playerStore.earnMoney(contest.rewardMoney, { countAsEarned: false, system: 'fishPond' })
      rewardSummary.push(`${contest.rewardMoney}文`)
      const grantedTickets = walletStore.addRewardTickets(contest.rewardTickets, { source: 'goal', applyMultiplier: false })
      rewardSummary.push(...Object.entries(grantedTickets).map(([ticketType, amount]) => `${walletStore.getTicketLabel(ticketType as any)}×${amount}`))
      addLog(`【鱼塘周赛】${contest.label} 已结算，冠军样本为 ${winner.fishName}（${winner.score}分）。`, {
        category: 'goal',
        tags: ['late_game_cycle'],
        meta: { weekId, contestId: contest.id, score: winner.score }
      })
    }

    const summary: PondContestSettlementSummary = {
      weekId,
      contestId: contest.id,
      settledAtDayTag,
      participantCount: ranking.length,
      winner,
      ranking,
      rewardSummary
    }
    lastPondContestSettlement.value = summary
    pondContestState.value = {
      ...pondContestState.value,
      settled: true,
      lastSettlementDayTag: settledAtDayTag
    }
    return summary
  }

  const getEligibleFishForOrder = (options: {
    fishId: string
    generationMin?: number
    requireMature?: boolean
    requireHealthy?: boolean
  }): PondFish[] => {
    const scoreMap = new Map(pondFishRatings.value.map(entry => [entry.fishInstanceId, entry.totalScore]))
    return pond.value.fish.filter(fish => {
      if (fish.fishId !== options.fishId) return false
      if (options.requireMature && !fish.mature) return false
      if (options.requireHealthy && fish.sick) return false
      if (options.generationMin && getFishBreedGeneration(fish) < options.generationMin) return false
      return true
    }).sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
  }

  const countEligibleFishForOrder = (options: {
    fishId: string
    generationMin?: number
    requireMature?: boolean
    requireHealthy?: boolean
  }): number => {
    return getEligibleFishForOrder(options).length
  }

  const submitEligibleFishForOrder = (options: {
    fishId: string
    quantity: number
    generationMin?: number
    requireMature?: boolean
    requireHealthy?: boolean
  }): PondFishRatingSnapshot[] | null => {
    const matches = getEligibleFishForOrder(options)
    if (matches.length < options.quantity) {
      lastOrderSubmissionSnapshots.value = []
      return null
    }
    const selectedFish = matches.slice(0, options.quantity)
    const submittedSnapshots = selectedFish.map(fish => buildPondFishRatingSnapshot(fish))

    const removeIds = new Set(selectedFish.map(fish => fish.id))
    pond.value.fish = pond.value.fish.filter(fish => !removeIds.has(fish.id))

    if (pond.value.breeding && (removeIds.has(pond.value.breeding.parentA) || removeIds.has(pond.value.breeding.parentB))) {
      pond.value.breeding = null
    }
    pruneDisplayEntries()
    pruneContestRegistrations()

    lastOrderSubmissionSnapshots.value = submittedSnapshots
    return submittedSnapshots
  }

  // === 喂食/清理/治疗 ===

  const feedFish = (): boolean => {
    if (!pond.value.built || pond.value.fedToday) return false
    if (pond.value.fish.length === 0) return false
    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('fish_feed', 1)) return false
    pond.value.fedToday = true
    pond.value.waterQuality = clamp(pond.value.waterQuality + FEED_WATER_RESTORE, 0, 100)
    return true
  }

  const cleanPond = (): boolean => {
    if (!pond.value.built) return false
    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('water_purifier', 1)) return false
    pond.value.waterQuality = clamp(pond.value.waterQuality + PURIFIER_WATER_RESTORE, 0, 100)
    return true
  }

  const treatSickFish = (): number => {
    if (!pond.value.built) return 0
    const inventoryStore = useInventoryStore()
    const sick = pond.value.fish.filter(f => f.sick)
    if (sick.length === 0) return 0
    if (!inventoryStore.removeItem('animal_medicine', 1)) return 0
    for (const f of sick) {
      f.sick = false
      f.sickDays = 0
    }
    return sick.length
  }

  // === 繁殖 ===

  const startBreeding = (fishIdA: string, fishIdB: string): boolean => {
    if (!pond.value.built) return false
    if (pond.value.breeding) return false
    if (fishCount.value >= capacity.value) return false

    const fishA = pond.value.fish.find(f => f.id === fishIdA)
    const fishB = pond.value.fish.find(f => f.id === fishIdB)
    if (!fishA || !fishB) return false
    if (fishA.fishId !== fishB.fishId) return false
    if (!fishA.mature || !fishB.mature) return false
    if (fishA.sick || fishB.sick) return false

    pond.value.breeding = {
      parentA: fishIdA,
      parentB: fishIdB,
      daysLeft: FISH_BREEDING_DAYS,
      fishId: fishA.fishId
    }
    return true
  }

  /** 遗传算法：生成后代基因 */
  const _breedGenetics = (a: FishGenetics, b: FishGenetics): FishGenetics => {
    const avgStability = (a.diseaseRes + b.diseaseRes) / 2
    const fluctuationRange = GENETICS_FLUCTUATION_BASE * (1 - avgStability / 200)
    const avgMutRate = (a.mutationRate + b.mutationRate) / 2

    const inherit = (va: number, vb: number, min: number, max: number): number => {
      const avg = (va + vb) / 2
      const fluctuation = (Math.random() - 0.5) * 2 * fluctuationRange
      let val = avg + fluctuation

      // 变异
      if (Math.random() < avgMutRate / 100) {
        const jump = POND_MUTATION_JUMP_MIN + Math.random() * (POND_MUTATION_JUMP_MAX - POND_MUTATION_JUMP_MIN)
        val += Math.random() < 0.5 ? jump : -jump
      }

      return clamp(Math.round(val), min, max)
    }

    return {
      weight: inherit(a.weight, b.weight, 0, 100),
      growthRate: inherit(a.growthRate, b.growthRate, 0, 100),
      diseaseRes: inherit(a.diseaseRes, b.diseaseRes, 0, 100),
      qualityGene: inherit(a.qualityGene, b.qualityGene, 0, 100),
      mutationRate: inherit(a.mutationRate, b.mutationRate, 1, 50)
    }
  }

  // === 产出品质 ===

  const _getProductQuality = (qualityGene: number): Quality => {
    const roll = Math.random() * 100
    if (qualityGene >= 75 && roll < qualityGene - 50) return 'supreme'
    if (qualityGene >= 50 && roll < qualityGene - 25) return 'excellent'
    if (qualityGene >= 25 && roll < qualityGene) return 'fine'
    return 'normal'
  }

  // === 收获 ===

  /** 当日待收集产出（由 dailyUpdate 填充） */
  const pendingProducts = ref<{ itemId: string; quality: Quality }[]>([])

  const collectProducts = (maxCount: number = Number.POSITIVE_INFINITY): { itemId: string; quality: Quality }[] => {
    if (!pond.value.built || pond.value.collectedToday) return []
    const count = Math.min(maxCount, pendingProducts.value.length)
    if (count <= 0) return []
    const collected = pendingProducts.value.slice(0, count)
    pendingProducts.value = pendingProducts.value.slice(count)
    pond.value.collectedToday = pendingProducts.value.length === 0
    return collected
  }

  // === 每日更新 ===

  const dailyUpdate = (): PondDailyResult => {
    const maintenanceConfig = getMaintenanceConfig()
    const result: PondDailyResult = {
      products: [],
      died: [],
      gotSick: [],
      healed: [],
      bred: null,
      breedingFailed: null
    }

    if (!pond.value.built || pond.value.fish.length === 0) {
      maintenanceState.value = {
        ...maintenanceState.value,
        ornamentalFeedBuffDays: Math.max(0, maintenanceState.value.ornamentalFeedBuffDays - 1),
        quarantineShieldDays: Math.max(0, maintenanceState.value.quarantineShieldDays - 1)
      }
      pond.value.fedToday = false
      pond.value.collectedToday = false
      return result
    }

    const skillStore = useSkillStore()
    const fishingLevel = skillStore.getSkill('fishing').level

    // 1. 水质衰减
    let decay = WATER_QUALITY_DECAY_BASE
    if (density.value > 0.8) decay += WATER_QUALITY_DECAY_CROWDED
    else if (density.value > 0.5) decay += WATER_QUALITY_DECAY_HALF

    // 2. 未喂食额外衰减
    if (!pond.value.fedToday) {
      decay += WATER_QUALITY_DECAY_HUNGRY
    }

    pond.value.waterQuality = clamp(pond.value.waterQuality - decay, 0, 100)
    if (highTierFishRatings.value.length > 0 && maintenanceState.value.quarantineShieldDays <= 0) {
      pond.value.waterQuality = clamp(
        pond.value.waterQuality - highTierFishRatings.value.length * maintenanceConfig.maintenanceDecayPerHighTierFish,
        0,
        100
      )
    }

    // 3. 疾病判定 + 4. 死亡判定 + 5. 自然恢复
    const toRemove: number[] = []
    for (let i = 0; i < pond.value.fish.length; i++) {
      const fish = pond.value.fish[i]!

      // 生病鱼死亡判定
      if (fish.sick) {
        fish.sickDays++
        if (fish.sickDays >= SICK_DEATH_DAYS) {
          result.died.push(fish.name)
          toRemove.push(i)
          continue
        }
      }

      // 疾病判定
      if (!fish.sick && pond.value.waterQuality < DISEASE_THRESHOLD) {
        const resist = fish.genetics.diseaseRes / 100
        // 钓鱼等级降低生病率
        const chance =
          (DISEASE_CHANCE_BASE * (1 - resist)) /
          (1 + fishingLevel * 0.05) /
          (maintenanceState.value.quarantineShieldDays > 0 ? 2 : 1)
        if (Math.random() < chance) {
          fish.sick = true
          fish.sickDays = 0
          result.gotSick.push(fish.name)
        }
      }

      // 自然恢复：已喂食 + 水质OK → 清除生病
      if (fish.sick && pond.value.fedToday && pond.value.waterQuality >= DISEASE_THRESHOLD) {
        fish.sick = false
        fish.sickDays = 0
        result.healed.push(fish.name)
      }

      // 6. 成熟判定
      fish.daysInPond++
      if (!fish.mature) {
        const def = getPondableFish(fish.fishId)
        if (def) {
          const growthBonus = fish.genetics.growthRate / 100
          const effectiveDays = def.maturityDays * (1 - growthBonus * 0.3)
          if (fish.daysInPond >= effectiveDays) {
            fish.mature = true
          }
        }
      }
    }

    // 移除死亡鱼（倒序）
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i]!
      const deadFish = pond.value.fish[idx]!
      // 如果死亡鱼正在繁殖中，取消繁殖
      if (pond.value.breeding && (pond.value.breeding.parentA === deadFish.id || pond.value.breeding.parentB === deadFish.id)) {
        pond.value.breeding = null
      }
      pond.value.fish.splice(idx, 1)
    }
    pruneDisplayEntries()
    pruneContestRegistrations()

    // 7. 产出生成（成熟 + 已喂食 + 未生病）
    if (pond.value.fedToday) {
      for (const fish of pond.value.fish) {
        if (!fish.mature || fish.sick) continue
        const def = getPondableFish(fish.fishId)
        if (!def) continue
        // 产出概率受体重基因影响
        const weightBonus = fish.genetics.weight / 200
        const rate = def.baseProductionRate + weightBonus
        if (Math.random() < rate) {
          const quality = _getProductQuality(fish.genetics.qualityGene)
          result.products.push({ itemId: def.productItemId, quality })
        }
      }
    }

    // 8. 繁殖进度
    if (pond.value.breeding) {
      pond.value.breeding.daysLeft--
      if (pond.value.breeding.daysLeft <= 0) {
        const parentA = pond.value.fish.find(f => f.id === pond.value.breeding!.parentA)
        const parentB = pond.value.fish.find(f => f.id === pond.value.breeding!.parentB)
        if (!parentA || !parentB) {
          result.breedingFailed = '亲鱼死亡，繁殖失败'
        } else if (fishCount.value >= capacity.value) {
          result.breedingFailed = '鱼塘已满，繁殖失败'
        } else {
          const childGenetics = _breedGenetics(parentA.genetics, parentB.genetics)
          const def = getPondableFish(pond.value.breeding.fishId)
          if (def) {
            // 品种配方匹配：检查亲本品种组合是否产出高代品种
            let childBreedId: string | null = null
            let childName = def.name
            if (parentA.breedId && parentB.breedId) {
              const recipe = findBreedByParents(parentA.breedId, parentB.breedId)
              if (recipe) {
                childBreedId = recipe.breedId
                childName = recipe.name
                discoveredBreeds.value.add(recipe.breedId)
              }
            }
            // 无匹配配方时：后代继承父母同代品种（而非总是回退到Gen1）
            if (!childBreedId) {
              const parentABreed = parentA.breedId ? getBreedById(parentA.breedId) : null
              const parentBBreed = parentB.breedId ? getBreedById(parentB.breedId) : null
              const parentGen = Math.min(parentABreed?.generation ?? 1, parentBBreed?.generation ?? 1) as 1 | 2 | 3 | 4 | 5
              const sameGenBreeds = getBreedsByGeneration(parentGen).filter(b => b.baseFishId === def!.fishId)
              if (sameGenBreeds.length > 0) {
                const rnd = sameGenBreeds[Math.floor(Math.random() * sameGenBreeds.length)]!
                childBreedId = rnd.breedId
                childName = rnd.name
                discoveredBreeds.value.add(rnd.breedId)
              }
            }
            const child: PondFish = {
              id: generateFishId(),
              fishId: pond.value.breeding.fishId,
              name: childName,
              genetics: childGenetics,
              daysInPond: 0,
              mature: false,
              sick: false,
              sickDays: 0,
              breedId: childBreedId
            }
            pond.value.fish.push(child)
            result.bred = childName
          }
        }
        pond.value.breeding = null
      }
    }

    // 将产出存入待收集（保留玩家尚未领取的旧产物）
    pendingProducts.value.push(...result.products)

    // 9. 重置
    maintenanceState.value = {
      ...maintenanceState.value,
      ornamentalFeedBuffDays: Math.max(0, maintenanceState.value.ornamentalFeedBuffDays - 1),
      quarantineShieldDays: Math.max(0, maintenanceState.value.quarantineShieldDays - 1)
    }
    pond.value.fedToday = false
    pond.value.collectedToday = false

    return result
  }

  // === 基因星级 ===

  const getGeneticStarRating = (genetics: FishGenetics): number => {
    const total = genetics.weight + genetics.growthRate + genetics.diseaseRes + genetics.qualityGene
    if (total >= 320) return 5
    if (total >= 260) return 4
    if (total >= 200) return 3
    if (total >= 140) return 2
    return 1
  }

  // === 序列化 ===

  const serialize = () => ({
    pond: pond.value,
    pendingProducts: pendingProducts.value,
    discoveredBreeds: [...discoveredBreeds.value],
    returnedFishPool: returnedFishPool.value,
    pondContestState: pondContestState.value,
    lastPondContestSettlement: lastPondContestSettlement.value,
    displayEntries: displayEntries.value,
    maintenanceState: maintenanceState.value
  })

  const deserialize = (data: any) => {
    if (data?.pond) {
      pond.value = {
        built: data.pond.built ?? false,
        level: data.pond.level ?? 1,
        fish: (data.pond.fish ?? [])
          .filter((f: any) => typeof f?.fishId === 'string' && isPondableFish(f.fishId))
          .map((f: any) => ({
            id: f.id ?? generateFishId(),
            fishId: f.fishId,
            name: f.name ?? '',
            genetics: {
              weight: clamp(Math.round(Number(f.genetics?.weight ?? 50)), 0, 100),
              growthRate: clamp(Math.round(Number(f.genetics?.growthRate ?? 50)), 0, 100),
              diseaseRes: clamp(Math.round(Number(f.genetics?.diseaseRes ?? 50)), 0, 100),
              qualityGene: clamp(Math.round(Number(f.genetics?.qualityGene ?? 30)), 0, 100),
              mutationRate: clamp(Math.round(Number(f.genetics?.mutationRate ?? 10)), 1, 50)
            },
            daysInPond: f.daysInPond ?? 0,
            mature: f.mature ?? false,
            sick: f.sick ?? false,
            sickDays: f.sickDays ?? 0,
            breedId: f.breedId ?? null
          })),
        waterQuality: data.pond.waterQuality ?? 100,
        fedToday: data.pond.fedToday ?? false,
        breeding: normalizeBreedingPair(data.pond.breeding),
        collectedToday: data.pond.collectedToday ?? false
      }
    }
    pendingProducts.value = Array.isArray(data?.pendingProducts)
      ? data.pendingProducts.filter(
          (entry: any) =>
            entry &&
            typeof entry.itemId === 'string' &&
            !!getItemById(entry.itemId) &&
            ['normal', 'fine', 'excellent', 'supreme'].includes(entry.quality)
        )
      : []
    const discoveredBreedIds = new Set<string>(data?.discoveredBreeds ?? [])
    returnedFishPool.value = Object.fromEntries(
      Object.entries(data?.returnedFishPool && typeof data.returnedFishPool === 'object' ? data.returnedFishPool : {})
        .filter(([fishId]) => isPondableFish(fishId))
        .map(([fishId, entries]) => [
          fishId,
          Array.isArray(entries)
            ? entries
                .filter((entry: any) => entry && typeof entry === 'object')
                .map((entry: any) => ({
                  fishId,
                  name: typeof entry.name === 'string' ? entry.name : fishId,
                  genetics: {
                    weight: clamp(Math.round(Number(entry.genetics?.weight ?? 50)), 0, 100),
                    growthRate: clamp(Math.round(Number(entry.genetics?.growthRate ?? 50)), 0, 100),
                    diseaseRes: clamp(Math.round(Number(entry.genetics?.diseaseRes ?? 50)), 0, 100),
                    qualityGene: clamp(Math.round(Number(entry.genetics?.qualityGene ?? 30)), 0, 100),
                    mutationRate: clamp(Math.round(Number(entry.genetics?.mutationRate ?? 10)), 1, 50)
                  },
                  daysInPond: Math.max(0, Number(entry.daysInPond) || 0),
                  mature: !!entry.mature,
                  sick: !!entry.sick,
                  sickDays: Math.max(0, Number(entry.sickDays) || 0),
                  breedId: typeof entry.breedId === 'string' ? entry.breedId : null
                }))
            : []
        ])
    )
    for (const fish of pond.value.fish) {
      if (fish.breedId) discoveredBreedIds.add(fish.breedId)
    }
    for (const entries of Object.values(returnedFishPool.value)) {
      for (const fish of entries) {
        if (fish.breedId) discoveredBreedIds.add(fish.breedId)
      }
    }
    discoveredBreeds.value = discoveredBreedIds
    pondContestState.value = data?.pondContestState ?? createDefaultPondContestState()
    lastPondContestSettlement.value = data?.lastPondContestSettlement ?? null
    displayEntries.value = normalizeDisplayEntries(data?.displayEntries)
    maintenanceState.value = normalizeMaintenanceState(data?.maintenanceState)
    pruneDisplayEntries()
    if (pond.value.built) {
      syncContestStateToCurrentWeek()
    } else {
      pondContestState.value = createDefaultPondContestState()
    }
  }

  return {
    pond,
    capacity,
    fishCount,
    isFull,
    sickFish,
    matureFish,
    density,
    pendingProducts,
    discoveredBreeds,
    pondContestState,
    currentPondContestDef,
    currentThemeWeekPondFocus,
    contestEligibleFish,
    lastPondContestSettlement,
    displayEntries,
    displayOverview,
    highTierFishRatings,
    maintenanceState,
    pondFishRatings,
    lastOrderSubmissionSnapshots,
    pondEligibilitySnapshots,
    buildPond,
    upgradePond,
    addFish,
    removeFish,
    feedFish,
    cleanPond,
    treatSickFish,
    startBreeding,
    canAssignDisplayFish,
    getDisplayAssignmentStatus,
    assignDisplayFish,
    removeDisplayFish,
    getOrnamentalFeedStatus,
    useOrnamentalFeed,
    getAdvancedPurifierStatus,
    useAdvancedPurifier,
    registerContestFish,
    unregisterContestFish,
    refreshWeeklyContest,
    settleWeeklyContest,
    getPondFishRatingSnapshot,
    getEligibilitySnapshotForFishId,
    countEligibleFishForOrder,
    submitEligibleFishForOrder,
    collectProducts,
    dailyUpdate,
    getGeneticStarRating,
    serialize,
    deserialize
  }
})
