/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  BreedingCommercialTag,
  BreedingCertificationRecord,
  BreedingContestEntryResult,
  BreedingContestSettlementSummary,
  BreedingContestState,
  BreedingFailureSalvageSummary,
  BreedingScoreBreakdown,
  BreedingScoreBreakdownEntry,
  BreedingShowcaseTag,
  BreedingStabilityRank,
  SeedGenetics,
  BreedingSlot,
  BreedingSeed,
  CompendiumEntry,
  SeedLineageNode,
  BreedingMasteryPerk,
  SeedSortKey,
  SeedFilterKey,
  HybridStatusFilter,
  HybridAvailability
} from '@/types/breeding'
import {
  BASE_BREEDING_BOX,
  SEED_BOX_UPGRADES,
  SEED_BOX_UPGRADE_INCREMENT,
  BREEDING_DAYS,
  BASE_MUTATION_MAGNITUDE,
  GENERATIONAL_STABILITY_GAIN,
  MAX_STABILITY,
  MUTATION_JUMP_MIN,
  MUTATION_JUMP_MAX,
  MUTATION_RATE_DRIFT,
  BREEDING_STATION_COST,
  MAX_BREEDING_STATIONS,
  BREEDING_RESEARCH_UPGRADES,
  generateGeneticsId,
  clampStat,
  clampMutationRate,
  getDefaultGenetics,
  getStarRating,
  makeSeedLabel,
  HYBRID_DEFS,
  findPossibleHybrid,
  findPossibleHybridById,
  getSeedMakerGeneticChance,
  getHybridTier,
  getTotalStats
} from '@/data/breeding'
import { BREEDING_CONTEST_DEFS, createDefaultBreedingContestState, getWeeklyBreedingContestDef } from '@/data/breedingContests'
import { getCropById } from '@/data/crops'
import { getItemById } from '@/data/items'
import { addLog } from '@/composables/useGameLog'
import { useAchievementStore } from './useAchievementStore'
import { useGameStore } from './useGameStore'
import { useInventoryStore } from './useInventoryStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useSettingsStore } from './useSettingsStore'
import { BREEDING_SPECIAL_ORDER_THEME_AUDIT } from '@/data/goals'
import { getWeekCycleInfo } from '@/utils/weekCycle'

export const useBreedingStore = defineStore('breeding', () => {
  const npcStore = useNpcStore()
  // === 状态 ===

  /** 种子箱 */
  const breedingBox = ref<BreedingSeed[]>([])

  /** 育种台 */
  const stations = ref<BreedingSlot[]>([])

  /** 已建造的育种台数量 */
  const stationCount = ref(0)

  /** 图鉴 */
  const compendium = ref<CompendiumEntry[]>([])
  const certifiedLineages = ref<Record<string, BreedingCertificationRecord>>({})

  /** 是否已解锁育种系统（首次获得育种种子时解锁） */
  const unlocked = ref(false)
  const breedingContestState = ref<BreedingContestState>(createDefaultBreedingContestState())
  const lastBreedingContestSettlement = ref<BreedingContestSettlementSummary | null>(null)
  const lastFailureSalvage = ref<BreedingFailureSalvageSummary | null>(null)

  /** 种子箱等级：0/1/2，对应 30/45/60 */
  const seedBoxLevel = ref(0)

  /** 收藏的种子ID */
  const favoriteSeedIds = ref<string[]>([])

  /** 种子箱排序 */
  const seedSortKey = ref<SeedSortKey>('default')

  /** 种子箱筛选 */
  const seedFilterKey = ref<SeedFilterKey>('all')

  /** 图鉴状态筛选 */
  const hybridStatusFilter = ref<HybridStatusFilter>('all')

  /** 育种研究等级 */
  const researchLevel = ref(0)

  const breedingOrderAuditConfig = BREEDING_SPECIAL_ORDER_THEME_AUDIT
  const getBreedingFailureSalvageConfig = () => useSettingsStore().getLateGameBalanceConfig().breedingFailureSalvage
  const getCurrentWeekInfo = () => {
    const gameStore = useGameStore()
    return getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
  }

  // === 计算属性 ===

  /** 种子箱最大容量（基于等级） */
  const maxSeedBox = computed(() => BASE_BREEDING_BOX + seedBoxLevel.value * SEED_BOX_UPGRADE_INCREMENT)

  const boxCount = computed(() => breedingBox.value.length)
  const boxFull = computed(() => breedingBox.value.length >= maxSeedBox.value)
  const nearThreshold = computed(() => (researchLevel.value >= 1 ? 20 : 15))
  const highGenThreshold = computed(() => (researchLevel.value >= 2 ? 8 : 10))
  const failedPenalty = computed(() => (researchLevel.value >= 2 ? 3 : 5))
  const lineageDepth = computed(() => (researchLevel.value >= 3 ? 3 : 2))

  const breedingMasteryPerks = computed<BreedingMasteryPerk[]>(() => [
    {
      id: 'target_analysis',
      name: '目标分析',
      description: '接近可成识别范围扩大到甜度/产量各差 20 点。',
      unlocked: researchLevel.value >= 1
    },
    {
      id: 'precision_breeding',
      name: '精密育种',
      description: '高代速育门槛降到 8 代，失败杂交的属性损耗由 5 点降至 3 点。',
      unlocked: researchLevel.value >= 2
    },
    {
      id: 'lineage_archive',
      name: '谱系档案',
      description: '持久谱系快照扩展到 3 层，便于长期追踪高价值血统。',
      unlocked: researchLevel.value >= 3
    },
    {
      id: 'market_breeder',
      name: '订单育种师',
      description: '发现首批核心杂交品种后，会逐步解锁对应育种主题特殊订单。',
      unlocked: compendium.value.length >= 4
    }
  ])

  const isFavorite = (geneticsId: string): boolean => favoriteSeedIds.value.includes(geneticsId)

  const toggleFavorite = (geneticsId: string): boolean => {
    const idx = favoriteSeedIds.value.indexOf(geneticsId)
    if (idx >= 0) {
      favoriteSeedIds.value.splice(idx, 1)
      return false
    }
    favoriteSeedIds.value.push(geneticsId)
    return true
  }

  const cleanupFavorites = () => {
    const ids = new Set(breedingBox.value.map(s => s.genetics.id))
    favoriteSeedIds.value = favoriteSeedIds.value.filter(id => ids.has(id))
  }

  const visibleBreedingBox = computed(() => {
    let seeds = [...breedingBox.value]

    switch (seedFilterKey.value) {
      case 'hybrid':
        seeds = seeds.filter(s => s.genetics.isHybrid)
        break
      case 'nonHybrid':
        seeds = seeds.filter(s => !s.genetics.isHybrid)
        break
      case 'highStar':
        seeds = seeds.filter(s => getStarRating(s.genetics) >= 4)
        break
      case 'favorite':
        seeds = seeds.filter(s => isFavorite(s.genetics.id))
        break
    }

    const compareByTotal = (a: BreedingSeed, b: BreedingSeed) => getTotalStats(b.genetics) - getTotalStats(a.genetics)

    switch (seedSortKey.value) {
      case 'total':
        seeds.sort(compareByTotal)
        break
      case 'sweetness':
        seeds.sort((a, b) => b.genetics.sweetness - a.genetics.sweetness || compareByTotal(a, b))
        break
      case 'yield':
        seeds.sort((a, b) => b.genetics.yield - a.genetics.yield || compareByTotal(a, b))
        break
      case 'resistance':
        seeds.sort((a, b) => b.genetics.resistance - a.genetics.resistance || compareByTotal(a, b))
        break
      case 'generation':
        seeds.sort((a, b) => b.genetics.generation - a.genetics.generation || compareByTotal(a, b))
        break
    }

    return seeds
  })

  const bestSeedByCrop = computed<Record<string, SeedGenetics>>(() => {
    const map: Record<string, SeedGenetics> = {}
    for (const seed of breedingBox.value) {
      const current = map[seed.genetics.cropId]
      if (!current || getTotalStats(seed.genetics) > getTotalStats(current)) {
        map[seed.genetics.cropId] = seed.genetics
      }
    }
    return map
  })

  const hybridAvailabilityMap = computed<Record<string, HybridAvailability>>(() => {
    const result: Record<string, HybridAvailability> = {}
    for (const hybrid of HYBRID_DEFS) {
      const parentA = bestSeedByCrop.value[hybrid.parentCropA]
      const parentB = bestSeedByCrop.value[hybrid.parentCropB]
      const hasParents = Boolean(parentA && parentB)
      if (!parentA || !parentB) {
        result[hybrid.id] = {
          hybridId: hybrid.id,
          hasParents,
          canDiscover: false,
          avgSweetness: 0,
          avgYield: 0,
          sweetGap: hybrid.minSweetness,
          yieldGap: hybrid.minYield,
          status: 'missing_parents',
          recommendation: '缺少对应亲本，请先收集或培育这两个作物的育种种子。'
        }
        continue
      }

      const avgSweetness = Math.round((parentA.sweetness + parentB.sweetness) / 2)
      const avgYield = Math.round((parentA.yield + parentB.yield) / 2)
      const sweetGap = Math.max(0, hybrid.minSweetness - avgSweetness)
      const yieldGap = Math.max(0, hybrid.minYield - avgYield)
      const canDiscover = sweetGap === 0 && yieldGap === 0
      const near = !canDiscover && sweetGap <= nearThreshold.value && yieldGap <= nearThreshold.value
      result[hybrid.id] = {
        hybridId: hybrid.id,
        hasParents: true,
        canDiscover,
        avgSweetness,
        avgYield,
        sweetGap,
        yieldGap,
        status: canDiscover ? 'discoverable' : near ? 'near' : 'unavailable',
        recommendation: canDiscover
          ? '亲本已达标，可以直接尝试杂交。'
          : near
            ? `距离成功不远了：甜度差${sweetGap}，产量差${yieldGap}。建议优先继续同种培育。`
            : `亲本差距较大：甜度差${sweetGap}，产量差${yieldGap}。建议先集中培育高属性亲本。`
      }
    }
    return result
  })

  const recommendedHybrids = computed(() => {
    return HYBRID_DEFS
      .filter(h => !compendium.value.some(e => e.hybridId === h.id))
      .map(h => ({ hybrid: h, availability: hybridAvailabilityMap.value[h.id]! }))
      .filter(entry => entry.availability.hasParents)
      .sort((a, b) => {
        const statusWeight = (status: HybridAvailability['status']) => {
          if (status === 'discoverable') return 0
          if (status === 'near') return 1
          if (status === 'unavailable') return 2
          return 3
        }
        const weightDiff = statusWeight(a.availability.status) - statusWeight(b.availability.status)
        if (weightDiff !== 0) return weightDiff
        const gapA = a.availability.sweetGap + a.availability.yieldGap
        const gapB = b.availability.sweetGap + b.availability.yieldGap
        return gapA - gapB
      })
      .slice(0, researchLevel.value >= 1 ? 5 : 3)
  })

  const companionshipBreedingFocus = computed(() => {
    const familyWishOverview = npcStore.getFamilyWishOverview()
    const relationshipSnapshot = npcStore.getRelationshipDebugSnapshot()
    const activeFamilyWish = familyWishOverview.defs.find(def => def.id === familyWishOverview.state.activeWishId) ?? null
    const craftAssignments = relationshipSnapshot.householdAssignments.filter(entry => entry.roleId === 'craft_assist')
    const recommendedEntries = recommendedHybrids.value.slice(0, 3)
    return {
      activeFamilyWish,
      craftAssignmentCount: craftAssignments.length,
      recommendedHybridIds: recommendedEntries.map(entry => entry.hybrid.id),
      summary:
        activeFamilyWish?.id === 'wish_legacy_archive'
          ? '家业传承心愿会放大长期培育与高阶杂交的筹备价值。'
          : craftAssignments.length > 0
            ? '已安排家业协作分工，优先推进可发现或接近可发现的杂交品种。'
            : '当前暂无明显的家庭育种承接压力，可按图鉴与订单优先级推进。'
    }
  })

  const getBreedingStabilityRank = (genetics: SeedGenetics): BreedingStabilityRank => {
    if (genetics.stability >= 85 && genetics.generation >= 6) return 'certified'
    if (genetics.stability >= 70) return 'stable'
    if (genetics.stability >= 45) return 'emerging'
    return 'volatile'
  }

  const getBreedingCommercialTags = (genetics: SeedGenetics): BreedingCommercialTag[] => {
    const tags = new Set<BreedingCommercialTag>()
    if (genetics.sweetness >= 72) tags.add('banquet')
    if (genetics.yield >= 72) tags.add('bulk_supply')
    if (genetics.resistance >= 70) tags.add('storage')
    if (genetics.stability >= 68) tags.add('showcase')
    if (genetics.isHybrid || genetics.mutationRate >= 18) tags.add('research')
    if (genetics.isHybrid && genetics.generation >= 5 && getTotalStats(genetics) >= 225) tags.add('luxury')
    return [...tags]
  }

  const getBreedingShowcaseTags = (genetics: SeedGenetics): BreedingShowcaseTag[] => {
    const tags = new Set<BreedingShowcaseTag>()
    if (genetics.cropId.includes('tea') || genetics.hybridId?.includes('tea')) tags.add('tea_showcase')
    if (genetics.sweetness >= 72 || genetics.hybridId?.includes('osmanthus') || genetics.hybridId?.includes('golden_melon')) tags.add('festival_display')
    if (genetics.lineageParents?.length || genetics.generation >= 4) tags.add('archive_display')
    if (genetics.isHybrid && genetics.generation >= 5 && getTotalStats(genetics) >= 225) tags.add('luxury_display')
    return [...tags]
  }

  const getBreedingExhibitWorth = (genetics: SeedGenetics): number => {
    return Math.min(
      100,
      Math.round(genetics.sweetness * 0.25) +
        Math.round(genetics.stability * 0.2) +
        Math.round(genetics.resistance * 0.12) +
        Math.round(Math.min(100, genetics.generation * 10) * 0.18) +
        (genetics.isHybrid ? 12 : 0)
    )
  }

  const getBreedingScoreBreakdown = (genetics: SeedGenetics): BreedingScoreBreakdown => {
    const generationValue = Math.min(100, 20 + genetics.generation * 8)
    const entries: BreedingScoreBreakdownEntry[] = [
      { key: 'sweetness', label: '甜度', value: genetics.sweetness, weight: 0.28, contribution: Math.round(genetics.sweetness * 0.28) },
      { key: 'yield', label: '产量', value: genetics.yield, weight: 0.22, contribution: Math.round(genetics.yield * 0.22) },
      { key: 'resistance', label: '抗性', value: genetics.resistance, weight: 0.18, contribution: Math.round(genetics.resistance * 0.18) },
      { key: 'stability', label: '稳定', value: genetics.stability, weight: 0.2, contribution: Math.round(genetics.stability * 0.2) },
      { key: 'generation', label: '世代', value: generationValue, weight: 0.12, contribution: Math.round(generationValue * 0.12) }
    ]

    return {
      totalScore: Math.min(100, entries.reduce((sum, entry) => sum + entry.contribution, 0)),
      stabilityRank: getBreedingStabilityRank(genetics),
      commercialTags: getBreedingCommercialTags(genetics),
      showcaseTags: getBreedingShowcaseTags(genetics),
      exhibitWorth: getBreedingExhibitWorth(genetics),
      entries
    }
  }

  const getCertificationThresholds = () => ({
    requiredGeneration: 6,
    requiredTimesGrown: 3,
    requiredTotalScore: 78
  })

  const evaluateHybridCertification = (hybridId: string) => {
    const entry = compendium.value.find(item => item.hybridId === hybridId)
    if (!entry) return null
    const thresholds = getCertificationThresholds()
    const totalScore = Math.min(100, Math.round(entry.bestTotalStats / 3) + Math.min(20, (entry.bestGeneration ?? 0) * 2))
    if (
      (entry.bestGeneration ?? 0) < thresholds.requiredGeneration ||
      entry.timesGrown < thresholds.requiredTimesGrown ||
      totalScore < thresholds.requiredTotalScore
    ) {
      return null
    }
    const existing = certifiedLineages.value[hybridId]
    const nextRecord: BreedingCertificationRecord = {
      hybridId,
      certifiedAtYear: existing?.certifiedAtYear ?? useGameStore().year,
      bestGeneration: entry.bestGeneration ?? 0,
      bestTotalScore: Math.max(existing?.bestTotalScore ?? 0, totalScore),
      requiredGeneration: thresholds.requiredGeneration,
      requiredTimesGrown: thresholds.requiredTimesGrown,
      requiredTotalScore: thresholds.requiredTotalScore
    }
    certifiedLineages.value = {
      ...certifiedLineages.value,
      [hybridId]: nextRecord
    }
    return nextRecord
  }

  const getCertificationRecord = (hybridId: string) => certifiedLineages.value[hybridId] ?? null

  const grantFailureSalvage = (
    returnedSeed: SeedGenetics,
    targetHybridId: string | null,
    failedStatKey: 'sweetness' | 'yield' | 'resistance'
  ) => {
    const config = getBreedingFailureSalvageConfig()
    const inventoryStore = useInventoryStore()
    const currentDayTag = `${useGameStore().year}-${useGameStore().season}-${useGameStore().day}`
    const salvageItems: BreedingFailureSalvageSummary['salvageItems'] = []
    const maxGeneration = returnedSeed.generation
    const totalStats = getTotalStats(returnedSeed)

    if (maxGeneration >= config.minimumGenerationForResidue || returnedSeed.isHybrid) {
      const quantity = config.residueBaseQuantity + (returnedSeed.isHybrid ? config.residueHybridBonus : 0)
      salvageItems.push({
        itemId: 'breeding_residue',
        quantity,
        reason: '高代失败批次会回收为研究与储运残留。'
      })
    }

    if (maxGeneration >= config.certificationGenerationThreshold || totalStats >= config.certificationScoreThreshold) {
      salvageItems.push({
        itemId: 'lineage_certificate_tag',
        quantity: 1,
        reason: '高规格失败样本仍可拆解出认证补材。'
      })
    }

    if (returnedSeed.resistance >= config.preservationResistanceThreshold) {
      salvageItems.push({
        itemId: 'preservation_seal',
        quantity: 1,
        reason: '高抗性品系可拆出可复用的保鲜封签。'
      })
    }

    if (salvageItems.length === 0) {
      lastFailureSalvage.value = null
      return
    }

    const grantableItems = salvageItems
      .map(entry => ({ itemId: entry.itemId, quantity: entry.quantity, quality: 'normal' as const }))
      .filter(entry => entry.quantity > 0)

    if (!inventoryStore.canAddItems(grantableItems)) {
      addLog('育种失败保底已触发，但背包空间不足，残留材料暂未入包。', {
        category: 'breeding',
        tags: ['breeding_completed'],
        meta: { returnedSeedId: returnedSeed.id, targetHybridId: targetHybridId ?? '' }
      })
      lastFailureSalvage.value = null
      return
    }

    inventoryStore.addItemsExact(grantableItems)
    const returnedSeedLabel = makeSeedLabel(returnedSeed)
    const summary = `杂交失败后回收了${salvageItems
      .map(entry => `${getItemById(entry.itemId)?.name ?? entry.itemId}×${entry.quantity}`)
      .join('、')}。`
    lastFailureSalvage.value = {
      generatedAtDayTag: currentDayTag,
      returnedSeedId: returnedSeed.id,
      returnedSeedLabel,
      targetHybridId: targetHybridId ?? undefined,
      failedStatKey,
      failedPenalty: failedPenalty.value,
      salvageItems,
      summary
    }
    addLog(summary, {
      category: 'breeding',
      tags: ['breeding_completed'],
      meta: { returnedSeedId: returnedSeed.id, targetHybridId: targetHybridId ?? '' }
    })
  }

  const currentBreedingContestDef = computed(() =>
    breedingContestState.value.contestId ? BREEDING_CONTEST_DEFS.find(entry => entry.id === breedingContestState.value.contestId) ?? null : null
  )

  const contestEligibleSeeds = computed(() => {
    const contest = currentBreedingContestDef.value
    if (!contest) return []
    return breedingBox.value
      .filter(seed => {
        const score = getBreedingScoreBreakdown(seed.genetics)
        if (contest.requiredCommercialTags?.length) {
          return contest.requiredCommercialTags.every(tag => score.commercialTags.includes(tag))
        }
        return true
      })
      .sort((a, b) => {
        const scoreA = getBreedingScoreBreakdown(a.genetics)
        const scoreB = getBreedingScoreBreakdown(b.genetics)
        return scoreB[contest.scoringMetric] - scoreA[contest.scoringMetric]
      })
  })

  const pruneContestRegistrations = (): boolean => {
    const validSeedIds = new Set(contestEligibleSeeds.value.map(seed => seed.genetics.id))
    const nextRegisteredSeedIds = breedingContestState.value.registeredSeedIds.filter(id => validSeedIds.has(id))
    if (nextRegisteredSeedIds.length === breedingContestState.value.registeredSeedIds.length) return false
    breedingContestState.value = {
      ...breedingContestState.value,
      registeredSeedIds: nextRegisteredSeedIds
    }
    return true
  }

  const syncContestStateToCurrentWeek = (): boolean => {
    const currentWeekInfo = getCurrentWeekInfo()
    if (
      breedingContestState.value.weekId === currentWeekInfo.seasonWeekId &&
      breedingContestState.value.contestId
    ) {
      pruneContestRegistrations()
      return false
    }
    refreshWeeklyContest(currentWeekInfo.seasonWeekId, currentWeekInfo.absoluteWeek)
    return true
  }

  const registerContestSeed = (geneticsId: string): boolean => {
    if (!currentBreedingContestDef.value || breedingContestState.value.settled) return false
    if (breedingContestState.value.registeredSeedIds.includes(geneticsId)) return false
    if (!contestEligibleSeeds.value.some(seed => seed.genetics.id === geneticsId)) return false
    breedingContestState.value = {
      ...breedingContestState.value,
      registeredSeedIds: [...breedingContestState.value.registeredSeedIds, geneticsId]
    }
    return true
  }

  const unregisterContestSeed = (geneticsId: string): boolean => {
    if (!breedingContestState.value.registeredSeedIds.includes(geneticsId)) return false
    breedingContestState.value = {
      ...breedingContestState.value,
      registeredSeedIds: breedingContestState.value.registeredSeedIds.filter(id => id !== geneticsId)
    }
    return true
  }

  const refreshWeeklyContest = (weekId: string, absoluteWeek: number) => {
    const contest = getWeeklyBreedingContestDef(absoluteWeek)
    breedingContestState.value = {
      weekId,
      contestId: contest?.id ?? '',
      registeredSeedIds: [],
      settled: false,
      lastSettlementDayTag: ''
    }
    return contest
  }

  const settleWeeklyContest = (weekId: string, settledAtDayTag: string) => {
    const contest = currentBreedingContestDef.value
    if (!contest || breedingContestState.value.weekId !== weekId || breedingContestState.value.settled) return lastBreedingContestSettlement.value
    pruneContestRegistrations()

    const ranking = breedingContestState.value.registeredSeedIds
      .map(id => breedingBox.value.find(seed => seed.genetics.id === id))
      .filter((seed): seed is BreedingSeed => seed !== undefined)
      .map<BreedingContestEntryResult>(seed => {
        const score = getBreedingScoreBreakdown(seed.genetics)
        return {
          geneticsId: seed.genetics.id,
          cropId: seed.genetics.cropId,
          label: seed.label,
          hybridId: seed.genetics.hybridId,
          score: score[contest.scoringMetric]
        }
      })
      .sort((a, b) => b.score - a.score)

    const winner = ranking[0]
    const rewardSummary: string[] = []
    if (winner) {
      usePlayerStore().earnMoney(contest.rewardMoney, { countAsEarned: false, system: 'breeding' })
      rewardSummary.push(`${contest.rewardMoney}文`)
      addLog(`【育种周赛】${contest.label} 已结算，冠军样本为 ${winner.label}（${winner.score}分）。`, {
        category: 'breeding',
        tags: ['breeding_completed'],
        meta: { weekId, contestId: contest.id, score: winner.score }
      })
    }

    const summary: BreedingContestSettlementSummary = {
      weekId,
      contestId: contest.id,
      settledAtDayTag,
      participantCount: ranking.length,
      winner,
      ranking,
      rewardSummary
    }
    lastBreedingContestSettlement.value = summary
    breedingContestState.value = {
      ...breedingContestState.value,
      settled: true,
      lastSettlementDayTag: settledAtDayTag
    }
    return summary
  }

  const setSeedSortKey = (value: SeedSortKey) => {
    seedSortKey.value = value
  }

  const setSeedFilterKey = (value: SeedFilterKey) => {
    seedFilterKey.value = value
  }

  const setHybridStatusFilter = (value: HybridStatusFilter) => {
    hybridStatusFilter.value = value
  }

  const getNextResearchUpgrade = () => {
    return BREEDING_RESEARCH_UPGRADES.find(upgrade => upgrade.level === researchLevel.value + 1) ?? null
  }

  const canUpgradeResearch = (money: number, getItemCount: (id: string) => number): boolean => {
    const upgrade = getNextResearchUpgrade()
    if (!upgrade) return false
    if (money < upgrade.cost) return false
    for (const mat of upgrade.materials) {
      if (getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const upgradeResearch = (
    spendMoney: (amount: number) => void,
    removeItem: (id: string, qty: number) => void
  ): { success: boolean; message: string } => {
    const upgrade = getNextResearchUpgrade()
    if (!upgrade) return { success: false, message: '育种研究已达到最高等级。' }
    spendMoney(upgrade.cost)
    for (const mat of upgrade.materials) {
      removeItem(mat.itemId, mat.quantity)
    }
    researchLevel.value = upgrade.level
    return { success: true, message: `育种研究提升到 Lv.${upgrade.level}：${upgrade.name}。` }
  }

  const cloneLineageNode = (node: SeedLineageNode, depth: number = lineageDepth.value): SeedLineageNode => ({
    id: node.id,
    cropId: node.cropId,
    generation: node.generation,
    totalStats: node.totalStats,
    hybridId: node.hybridId,
    parents: depth > 0 ? node.parents?.map(parent => cloneLineageNode(parent, depth - 1)) : undefined
  })

  const makeLineageNode = (genetics: SeedGenetics, depth: number = lineageDepth.value): SeedLineageNode => ({
    id: genetics.id,
    cropId: genetics.cropId,
    generation: genetics.generation,
    totalStats: getTotalStats(genetics),
    hybridId: genetics.hybridId,
    parents: depth > 0 ? genetics.lineageParents?.map(parent => cloneLineageNode(parent, depth - 1)) : undefined
  })

  const collectLineageCropIds = (nodes: SeedLineageNode[] | null | undefined, acc: Set<string> = new Set()): Set<string> => {
    for (const node of nodes ?? []) {
      acc.add(node.cropId)
      collectLineageCropIds(node.parents, acc)
    }
    return acc
  }

  const syncCompendiumEntry = (hybridId: string, genetics: SeedGenetics) => {
    const total = genetics.sweetness + genetics.yield + genetics.resistance
    const lineageCropIds = [...collectLineageCropIds(genetics.lineageParents)]
    const existing = compendium.value.find(entry => entry.hybridId === hybridId)

    if (!existing) {
      const hybrid = findPossibleHybridById(hybridId)
      compendium.value.push({
        hybridId,
        discoveredYear: useGameStore().year,
        bestTotalStats: total,
        bestSweetness: genetics.sweetness,
        bestYield: genetics.yield,
        bestResistance: genetics.resistance,
        bestGeneration: genetics.generation,
        lineageCropIds,
        timesGrown: 0
      })
      if (hybrid) {
        addLog(hybrid.discoveryText, {
          category: 'breeding',
          tags: ['breeding_discovery'],
          meta: { hybridId }
        })
      }
      evaluateHybridCertification(hybridId)
      return
    }

    existing.bestTotalStats = Math.max(existing.bestTotalStats, total)
    existing.bestSweetness = Math.max(existing.bestSweetness ?? 0, genetics.sweetness)
    existing.bestYield = Math.max(existing.bestYield ?? 0, genetics.yield)
    existing.bestResistance = Math.max(existing.bestResistance ?? 0, genetics.resistance)
    existing.bestGeneration = Math.max(existing.bestGeneration ?? 0, genetics.generation)
    existing.lineageCropIds = [...new Set([...(existing.lineageCropIds ?? []), ...lineageCropIds])]
    evaluateHybridCertification(hybridId)
  }

  // === 种子箱操作 ===

  const addToBox = (genetics: SeedGenetics): boolean => {
    if (breedingBox.value.length >= maxSeedBox.value) return false
    breedingBox.value.push({
      genetics,
      label: makeSeedLabel(genetics)
    })
    return true
  }

  const removeFromBox = (geneticsId: string): BreedingSeed | null => {
    const idx = breedingBox.value.findIndex(s => s.genetics.id === geneticsId)
    if (idx === -1) return null
    const removed = breedingBox.value.splice(idx, 1)[0] ?? null
    cleanupFavorites()
    pruneContestRegistrations()
    return removed
  }

  // === 种子制造机增强 ===

  const trySeedMakerGeneticSeed = (cropId: string, farmingLevel: number): boolean => {
    if (breedingBox.value.length >= maxSeedBox.value) return false

    const chance = getSeedMakerGeneticChance(farmingLevel)
    if (Math.random() > chance) return false

    const base = getDefaultGenetics(cropId)
    // 添加少量随机波动
    const genetics: SeedGenetics = {
      ...base,
      id: generateGeneticsId(),
      sweetness: clampStat(base.sweetness + Math.round((Math.random() - 0.5) * 10)),
      yield: clampStat(base.yield + Math.round((Math.random() - 0.5) * 10)),
      resistance: clampStat(base.resistance + Math.round((Math.random() - 0.5) * 10))
    }

    addToBox(genetics)
    unlocked.value = true
    if (!breedingContestState.value.weekId || breedingContestState.value.weekId !== getCurrentWeekInfo().seasonWeekId || !breedingContestState.value.contestId) {
      syncContestStateToCurrentWeek()
    } else {
      pruneContestRegistrations()
    }
    return true
  }

  // === 育种台 ===

  const craftStation = (spendMoney: (amount: number) => void, removeItem: (id: string, qty: number) => void): boolean => {
    if (stationCount.value >= MAX_BREEDING_STATIONS) return false
    spendMoney(BREEDING_STATION_COST.money)
    for (const mat of BREEDING_STATION_COST.materials) {
      removeItem(mat.itemId, mat.quantity)
    }
    stationCount.value++
    stations.value.push({
      parentA: null,
      parentB: null,
      daysProcessed: 0,
      totalDays: BREEDING_DAYS,
      result: null,
      ready: false
    })
    return true
  }

  const canCraftStation = (money: number, getItemCount: (id: string) => number): boolean => {
    if (stationCount.value >= MAX_BREEDING_STATIONS) return false
    if (money < BREEDING_STATION_COST.money) return false
    for (const mat of BREEDING_STATION_COST.materials) {
      if (getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  // === 种子箱升级 ===

  const getNextSeedBoxUpgrade = () => {
    const next = seedBoxLevel.value + 1
    return SEED_BOX_UPGRADES.find(u => u.level === next) ?? null
  }

  const canUpgradeSeedBox = (money: number, getItemCount: (id: string) => number): boolean => {
    const upgrade = getNextSeedBoxUpgrade()
    if (!upgrade) return false
    if (money < upgrade.cost) return false
    for (const mat of upgrade.materials) {
      if (getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const upgradeSeedBox = (
    spendMoney: (amount: number) => void,
    removeItem: (id: string, qty: number) => void
  ): { success: boolean; message: string } => {
    const upgrade = getNextSeedBoxUpgrade()
    if (!upgrade) return { success: false, message: '种子箱已达到最高等级。' }
    spendMoney(upgrade.cost)
    for (const mat of upgrade.materials) {
      removeItem(mat.itemId, mat.quantity)
    }
    seedBoxLevel.value++
    return { success: true, message: `种子箱扩容完成！容量提升至${maxSeedBox.value}格。` }
  }

  const startBreeding = (slotIndex: number, seedAId: string, seedBId: string): boolean => {
    const slot = stations.value[slotIndex]
    if (!slot || slot.parentA || slot.ready) return false

    const seedA = removeFromBox(seedAId)
    const seedB = removeFromBox(seedBId)
    if (!seedA || !seedB) {
      // 归还已取出的种子
      if (seedA) addToBox(seedA.genetics)
      if (seedB) addToBox(seedB.genetics)
      return false
    }

    slot.parentA = seedA.genetics
    slot.parentB = seedB.genetics
    slot.daysProcessed = 0
    const highGenReduction = Math.min(seedA.genetics.generation, seedB.genetics.generation) >= highGenThreshold.value ? 1 : 0
    slot.totalDays = Math.max(1, BREEDING_DAYS - highGenReduction)
    slot.result = null
    slot.ready = false
    pruneContestRegistrations()
    if (highGenReduction > 0) {
      addLog('高代品系已经更加稳定，本次育种耗时缩短了1天。', {
        category: 'breeding',
        tags: ['breeding_completed'],
        meta: { slotIndex, duration: slot.totalDays }
      })
    }
    return true
  }

  const collectResult = (slotIndex: number): SeedGenetics | null => {
    const slot = stations.value[slotIndex]
    if (!slot || !slot.ready || !slot.result) return null

    const result = slot.result
    // 放入种子箱
    if (!addToBox(result)) {
      addLog('种子箱已满，无法收取。')
      return null
    }

    // 安全校验：确保杂交种已记录到图鉴
    if (result.isHybrid && result.hybridId) {
      syncCompendiumEntry(result.hybridId, result)
    }

    // 重置槽位
    slot.parentA = null
    slot.parentB = null
    slot.daysProcessed = 0
    slot.result = null
    slot.ready = false

    return result
  }

  // === 核心杂交算法 ===

  const breedSeeds = (parentA: SeedGenetics, parentB: SeedGenetics): SeedGenetics => {
    if (parentA.cropId === parentB.cropId) {
      // 同种杂交：世代培育
      return breedSameCrop(parentA, parentB)
    } else {
      // 异种杂交
      return breedDifferentCrop(parentA, parentB)
    }
  }

  /** 同种杂交（世代培育） */
  const breedSameCrop = (a: SeedGenetics, b: SeedGenetics): SeedGenetics => {
    const avgStability = (a.stability + b.stability) / 2
    const avgMutationRate = (a.mutationRate + b.mutationRate) / 2

    const fluctuationScale = (avgMutationRate / 50) * (1 - avgStability / 100)

    const fluctuate = (): number => {
      return Math.round((Math.random() - 0.5) * 2 * BASE_MUTATION_MAGNITUDE * fluctuationScale)
    }

    let sweetness = clampStat(Math.round((a.sweetness + b.sweetness) / 2) + fluctuate())
    let yieldVal = clampStat(Math.round((a.yield + b.yield) / 2) + fluctuate())
    let resistance = clampStat(Math.round((a.resistance + b.resistance) / 2) + fluctuate())
    let mutationRate = clampMutationRate(Math.round(avgMutationRate))

    // 变异事件
    if (Math.random() < avgMutationRate / 100) {
      const mutateCount = Math.random() < 0.5 ? 1 : 2
      const stats: ('sweetness' | 'yield' | 'resistance')[] = ['sweetness', 'yield', 'resistance']
      // Fisher-Yates 洗牌
      for (let j = stats.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1))
        ;[stats[j], stats[k]] = [stats[k]!, stats[j]!]
      }
      const shuffled = stats
      const current = { sweetness, yield: yieldVal, resistance }

      for (let i = 0; i < mutateCount; i++) {
        const stat = shuffled[i]!
        const jump = MUTATION_JUMP_MIN + Math.round(Math.random() * (MUTATION_JUMP_MAX - MUTATION_JUMP_MIN))
        const direction = Math.random() < 0.5 ? 1 : -1
        current[stat] = clampStat(current[stat] + jump * direction)
      }

      sweetness = current.sweetness
      yieldVal = current.yield
      resistance = current.resistance
      mutationRate = clampMutationRate(mutationRate + Math.round((Math.random() - 0.5) * 2 * MUTATION_RATE_DRIFT))

      addLog('育种发生了变异！属性产生了大幅波动。', {
        category: 'breeding',
        tags: ['breeding_mutation'],
        meta: { cropId: a.cropId }
      })
    }

    // F: 基因退化 — 双亲为完全相同的基因ID（连续自交）时稳定度-5
    const isSelfing = a.parentA !== null && a.parentA === b.parentA && a.parentB !== null && a.parentB === b.parentB
    const stabilityGain = isSelfing ? GENERATIONAL_STABILITY_GAIN - 5 : GENERATIONAL_STABILITY_GAIN
    if (isSelfing) addLog('警告：近亲繁殖！遗传稳定度下降，建议引入新的血统。')

    const newGeneration = Math.max(a.generation, b.generation) + 1

    // D: 世代里程碑提示
    if (newGeneration === 5) addLog(`${getCropById(a.cropId)?.name ?? a.cropId} 达到第5代，遗传趋于稳定！`)
    else if (newGeneration === 10) addLog(`${getCropById(a.cropId)?.name ?? a.cropId} 达到第10代，品系精进！属性有望突破极限。`)
    else if (newGeneration === 20) addLog(`${getCropById(a.cropId)?.name ?? a.cropId} 达到第20代，传说级品系！桃源乡将流传此种的名声。`)

    const researchStabilityBonus = researchLevel.value >= 1 ? 1 : 0

    const result: SeedGenetics = {
      id: generateGeneticsId(),
      cropId: a.cropId,
      generation: newGeneration,
      sweetness,
      yield: yieldVal,
      resistance,
      stability: Math.min(Math.round(avgStability) + stabilityGain + researchStabilityBonus, MAX_STABILITY),
      mutationRate,
      parentA: a.id,
      parentB: b.id,
      isHybrid: a.isHybrid || b.isHybrid,
      hybridId: a.hybridId ?? b.hybridId,
      lineageParents: [makeLineageNode(a, lineageDepth.value), makeLineageNode(b, lineageDepth.value)]
    }

    // 同种杂交也需要同步图鉴（防止图鉴条目丢失后无法恢复）
    if (result.isHybrid && result.hybridId) {
      syncCompendiumEntry(result.hybridId, result)
    }

    return result
  }

  /** 异种杂交 */
  const breedDifferentCrop = (a: SeedGenetics, b: SeedGenetics): SeedGenetics => {
    const hybrid = findPossibleHybrid(a.cropId, b.cropId)
    const avgSweetness = (a.sweetness + b.sweetness) / 2
    const avgYield = (a.yield + b.yield) / 2

    if (hybrid && avgSweetness >= hybrid.minSweetness && avgYield >= hybrid.minYield) {
      // 匹配成功，产出杂交种
      const avgStability = (a.stability + b.stability) / 2
      const avgMutationRate = (a.mutationRate + b.mutationRate) / 2
      const fluctuationScale = (avgMutationRate / 50) * (1 - avgStability / 100)

      const fluctuate = (): number => {
        return Math.round((Math.random() - 0.5) * 2 * BASE_MUTATION_MAGNITUDE * fluctuationScale)
      }

      const result: SeedGenetics = {
        id: generateGeneticsId(),
        cropId: hybrid.resultCropId,
        generation: Math.max(a.generation, b.generation) + 1,
        sweetness: clampStat(Math.round(hybrid.baseGenetics.sweetness * 0.6 + avgSweetness * 0.4) + fluctuate()),
        yield: clampStat(Math.round(hybrid.baseGenetics.yield * 0.6 + avgYield * 0.4) + fluctuate()),
        resistance: clampStat(Math.round(hybrid.baseGenetics.resistance * 0.6 + ((a.resistance + b.resistance) / 2) * 0.4) + fluctuate()),
        stability: Math.min(Math.round(avgStability) + GENERATIONAL_STABILITY_GAIN, MAX_STABILITY),
        mutationRate: clampMutationRate(Math.round(avgMutationRate)),
        parentA: a.id,
        parentB: b.id,
        isHybrid: true,
        hybridId: hybrid.id,
        lineageParents: [makeLineageNode(a, lineageDepth.value), makeLineageNode(b, lineageDepth.value)]
      }

      // 更新图鉴
      const existing = compendium.value.find(e => e.hybridId === hybrid.id)
      if (!existing) {
        syncCompendiumEntry(hybrid.id, result)
        const achievementStore = useAchievementStore()
        achievementStore.recordHybridDiscovered()
        achievementStore.recordHybridTier(getHybridTier(hybrid.id))
      } else {
        syncCompendiumEntry(hybrid.id, result)
      }

      return result
    } else {
      // 匹配失败，返回随机亲本种子的副本并微降属性
      const source = Math.random() < 0.5 ? a : b
      const statToReduce: ('sweetness' | 'yield' | 'resistance')[] = ['sweetness', 'yield', 'resistance']
      const randomStat = statToReduce[Math.floor(Math.random() * 3)]!

      const failed: SeedGenetics = {
        ...source,
        id: generateGeneticsId(),
        [randomStat]: clampStat(source[randomStat] - failedPenalty.value),
        lineageParents: source.lineageParents?.map(parent => cloneLineageNode(parent, lineageDepth.value)) ?? null
      } as SeedGenetics

      if (hybrid) {
        addLog(
          `杂交失败：亲本平均甜度${Math.round(avgSweetness)}（需≥${hybrid.minSweetness}），平均产量${Math.round(avgYield)}（需≥${hybrid.minYield}）。请先通过同种培育提升属性。`
        )
      } else {
        addLog('这两个品种无法杂交，返回了一颗种子。')
      }

      grantFailureSalvage(failed, hybrid?.id ?? null, randomStat)

      return failed
    }
  }

  // === 日更新 ===

  const dailyUpdate = (): void => {
    for (const slot of stations.value) {
      if (slot.parentA && slot.parentB && !slot.ready) {
        slot.daysProcessed++
        if (slot.daysProcessed >= slot.totalDays) {
          const isCrossBreed = slot.parentA.cropId !== slot.parentB.cropId
          slot.result = breedSeeds(slot.parentA, slot.parentB)
          slot.ready = true
          const crop = getCropById(slot.result.cropId)
          const stars = getStarRating(slot.result)
          if (isCrossBreed && slot.result.isHybrid) {
            addLog(`杂交成功：${crop?.name ?? slot.result.cropId}（${stars}星）！已记录到图鉴。`, {
              category: 'breeding',
              tags: ['breeding_completed', 'breeding_discovery'],
              meta: { cropId: slot.result.cropId, hybridId: slot.result.hybridId ?? '' }
            })
          } else if (isCrossBreed) {
            addLog(`杂交未成功，获得了${crop?.name ?? slot.result.cropId}种子（${stars}星）。`, {
              category: 'breeding',
              tags: ['breeding_completed'],
              meta: { cropId: slot.result.cropId }
            })
          } else {
            addLog(`育种完成：${crop?.name ?? slot.result.cropId}（${stars}星）。`, {
              category: 'breeding',
              tags: ['breeding_completed'],
              meta: { cropId: slot.result.cropId }
            })
          }
          const achievementStore = useAchievementStore()
          achievementStore.recordBreeding()
        }
      }
    }
  }

  /** 记录杂交种被种植 */
  const recordHybridGrown = (hybridId: string): void => {
    const entry = compendium.value.find(e => e.hybridId === hybridId)
    if (entry) {
      entry.timesGrown++
      const certification = evaluateHybridCertification(hybridId)
      if (certification) {
        addLog(`育种品系 ${findPossibleHybridById(hybridId)?.name ?? hybridId} 已达到认证供货线。`, {
          category: 'breeding',
          tags: ['breeding_completed'],
          meta: { hybridId, score: certification.bestTotalScore, generation: certification.bestGeneration }
        })
      }
    }
  }

  const normalizeSeedGenetics = (value: any): SeedGenetics | null => {
    if (!value || typeof value !== 'object') return null
    const cropId = typeof value.cropId === 'string' ? value.cropId : ''
    if (!cropId) return null
    return {
      id: typeof value.id === 'string' ? value.id : generateGeneticsId(),
      cropId,
      generation: Math.max(0, Number(value.generation) || 0),
      sweetness: Math.max(0, Number(value.sweetness) || 0),
      yield: Math.max(0, Number(value.yield) || 0),
      resistance: Math.max(0, Number(value.resistance) || 0),
      stability: Math.max(0, Number(value.stability) || 0),
      mutationRate: Math.max(0, Number(value.mutationRate) || 0),
      parentA: typeof value.parentA === 'string' ? value.parentA : null,
      parentB: typeof value.parentB === 'string' ? value.parentB : null,
      isHybrid: !!value.isHybrid,
      hybridId: typeof value.hybridId === 'string' ? value.hybridId : null,
      lineageParents: Array.isArray(value.lineageParents) ? value.lineageParents : null
    }
  }

  // === 序列化 ===

  const serialize = () => ({
    breedingBox: breedingBox.value.map(s => ({
      genetics: s.genetics,
      label: s.label
    })),
    stations: stations.value.map(s => ({
      parentA: s.parentA,
      parentB: s.parentB,
      daysProcessed: s.daysProcessed,
      totalDays: s.totalDays,
      result: s.result,
      ready: s.ready
    })),
    stationCount: stationCount.value,
    seedBoxLevel: seedBoxLevel.value,
    researchLevel: researchLevel.value,
    favoriteSeedIds: favoriteSeedIds.value,
    compendium: compendium.value,
    certifiedLineages: certifiedLineages.value,
    breedingContestState: breedingContestState.value,
    lastBreedingContestSettlement: lastBreedingContestSettlement.value,
    lastFailureSalvage: lastFailureSalvage.value,
    unlocked: unlocked.value
  })

  const deserialize = (data: any) => {
    breedingBox.value = (data.breedingBox ?? [])
      .map((s: any) => {
        const genetics = normalizeSeedGenetics(s?.genetics)
        if (!genetics) return null
        return {
          genetics,
          label: typeof s?.label === 'string' ? s.label : makeSeedLabel(genetics)
        }
      })
      .filter((seed: BreedingSeed | null): seed is BreedingSeed => seed !== null)
    stations.value = (data.stations ?? []).slice(0, MAX_BREEDING_STATIONS).map((s: any) => ({
      parentA: normalizeSeedGenetics(s.parentA),
      parentB: normalizeSeedGenetics(s.parentB),
      daysProcessed: s.daysProcessed ?? 0,
      totalDays: s.totalDays ?? BREEDING_DAYS,
      result: normalizeSeedGenetics(s.result),
      ready: s.ready ?? false
    }))
    const rawStationCount = Math.max(0, Number(data.stationCount) || 0)
    stationCount.value = Math.min(MAX_BREEDING_STATIONS, Math.max(rawStationCount, stations.value.length))
    seedBoxLevel.value = data.seedBoxLevel ?? 0
    researchLevel.value = data.researchLevel ?? 0
    favoriteSeedIds.value = (data.favoriteSeedIds ?? []).filter((id: string) => breedingBox.value.some(s => s.genetics.id === id))
    compendium.value = data.compendium ?? []
    certifiedLineages.value = data.certifiedLineages ?? {}
    breedingContestState.value = data.breedingContestState ?? createDefaultBreedingContestState()
    lastBreedingContestSettlement.value = data.lastBreedingContestSettlement ?? null
    lastFailureSalvage.value = data.lastFailureSalvage ?? null
    unlocked.value = data.unlocked ?? (breedingBox.value.length > 0 || stationCount.value > 0)
    if (unlocked.value) {
      syncContestStateToCurrentWeek()
    } else {
      breedingContestState.value = createDefaultBreedingContestState()
    }
  }

  const getBreedingOrderAuditConfig = () => breedingOrderAuditConfig

  const reset = () => {
    breedingBox.value = []
    stations.value = []
    stationCount.value = 0
    seedBoxLevel.value = 0
    researchLevel.value = 0
    favoriteSeedIds.value = []
    compendium.value = []
    certifiedLineages.value = {}
    breedingContestState.value = createDefaultBreedingContestState()
    lastBreedingContestSettlement.value = null
    lastFailureSalvage.value = null
    unlocked.value = false
  }

  return {
    // 状态
    breedingBox,
    stations,
    stationCount,
    seedBoxLevel,
    compendium,
    certifiedLineages,
    breedingContestState,
    currentBreedingContestDef,
    contestEligibleSeeds,
    lastBreedingContestSettlement,
    lastFailureSalvage,
    unlocked,
    researchLevel,
    favoriteSeedIds,
    seedSortKey,
    seedFilterKey,
    hybridStatusFilter,
    // 计算
    boxCount,
    boxFull,
    maxSeedBox,
    visibleBreedingBox,
    hybridAvailabilityMap,
    recommendedHybrids,
    companionshipBreedingFocus,
    breedingMasteryPerks,
    getBreedingCommercialTags,
    getBreedingShowcaseTags,
    getBreedingExhibitWorth,
    getBreedingStabilityRank,
    getBreedingScoreBreakdown,
    getCertificationRecord,
    registerContestSeed,
    unregisterContestSeed,
    refreshWeeklyContest,
    settleWeeklyContest,
    // 方法
    addToBox,
    removeFromBox,
    isFavorite,
    toggleFavorite,
    setSeedSortKey,
    setSeedFilterKey,
    setHybridStatusFilter,
    trySeedMakerGeneticSeed,
    craftStation,
    canCraftStation,
    getNextSeedBoxUpgrade,
    canUpgradeSeedBox,
    upgradeSeedBox,
    getNextResearchUpgrade,
    canUpgradeResearch,
    upgradeResearch,
    startBreeding,
    collectResult,
    dailyUpdate,
    recordHybridGrown,
    getBreedingOrderAuditConfig,
    // 序列化
    serialize,
    deserialize,
    reset
  }
})
