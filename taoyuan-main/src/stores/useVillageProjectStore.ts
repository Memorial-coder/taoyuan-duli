import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'
import { addLog } from '@/composables/useGameLog'
import { getAbsoluteDay } from '@/utils/weekCycle'
import {
  VILLAGE_PROJECT_BASELINE_AUDIT,
  VILLAGE_PROJECT_DEFS,
  VILLAGE_PROJECT_OPERATIONAL_CONFIG,
  VILLAGE_PROJECT_SAVE_VERSION,
  getVillageProjectFundingPhase,
  getVillageProjectPlayerSegment
} from '@/data/villageProjects'
import { getItemById } from '@/data'
import type {
  VillageProjectCheckResult,
  VillageProjectContentTier,
  VillageProjectDebugSnapshot,
  VillageProjectDonationState,
  VillageProjectDonationSummary,
  VillageProjectLinkedSystem,
  VillageProjectMaintenanceState,
  VillageProjectMaintenanceSummary,
  VillageProjectOperationalSummary,
  VillageProjectOverviewSummary,
  VillageProjectProjectSummary,
  VillageProjectQueryOptions,
  VillageProjectRegionalEffectSummary,
  VillageProjectRequirement,
  VillageProjectRequirementProgress,
  VillageProjectSaveData,
  Season,
  VillageProjectStageSummary,
  VillageProjectState,
  VillageProjectUnlockEffect
} from '@/types'
import { useAchievementStore } from './useAchievementStore'
import { useBreedingStore } from './useBreedingStore'
import { useGameStore } from './useGameStore'
import { useGuildStore } from './useGuildStore'
import { useGoalStore } from './useGoalStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useInventoryStore } from './useInventoryStore'
import { useMuseumStore } from './useMuseumStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useQuestStore } from './useQuestStore'
import { useShopStore } from './useShopStore'
import { useWarehouseStore } from './useWarehouseStore'

export const useVillageProjectStore = defineStore('villageProject', () => {
  const projectStates = ref<Record<string, VillageProjectState>>({})
  const maintenanceStates = ref<Record<string, VillageProjectMaintenanceState>>({})
  const donationStates = ref<Record<string, VillageProjectDonationState>>({})
  const playerStore = usePlayerStore()
  const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

  const getCurrentDayTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
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

  const buildDayTagFromAbsoluteDay = (absoluteDay: number) => {
    const safeAbsoluteDay = Math.max(1, Math.floor(absoluteDay))
    const absoluteDayIndex = safeAbsoluteDay - 1
    const year = Math.floor(absoluteDayIndex / 112) + 1
    const dayOfYear = absoluteDayIndex % 112
    const seasonIndex = Math.floor(dayOfYear / 28)
    const day = (dayOfYear % 28) + 1
    const season = SEASON_ORDER[seasonIndex] ?? 'spring'
    return `${year}-${season}-${day}`
  }

  const addDaysToDayTag = (dayTag: string, days: number) => {
    const absoluteDay = getAbsoluteDayFromTag(dayTag)
    if (absoluteDay == null) return dayTag
    return buildDayTagFromAbsoluteDay(absoluteDay + Math.max(0, Math.floor(days)))
  }

  const isDayTagReached = (targetDayTag: string | undefined, currentDayTag: string) => {
    const targetDay = getAbsoluteDayFromTag(targetDayTag)
    const currentDay = getAbsoluteDayFromTag(currentDayTag)
    if (targetDay == null || currentDay == null) return false
    return currentDay >= targetDay
  }

  const getProjectDefaultState = (projectId: string): VillageProjectState => {
    const project = VILLAGE_PROJECT_DEFS.find(entry => entry.id === projectId)
    return {
      completed: false,
      completedStageIndex: project?.stageConfig?.stageIndex,
      stageGroupId: project?.stageConfig?.projectGroupId
    }
  }

  const buildMaintenanceState = (projectId: string): VillageProjectMaintenanceState | undefined => {
    const project = VILLAGE_PROJECT_DEFS.find(entry => entry.id === projectId)
    if (!project?.maintenancePlan) return undefined

    return {
      planId: project.maintenancePlan.id,
      targetProjectId: project.id,
      autoRenew: project.maintenancePlan.autoRenew ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.maintenanceAutoRenew,
      status: 'inactive',
      pendingCycles: 0
    }
  }

  const buildDonationState = (projectId: string): VillageProjectDonationState | undefined => {
    const project = VILLAGE_PROJECT_DEFS.find(entry => entry.id === projectId)
    if (!project?.donationPlan) return undefined

    return {
      planId: project.donationPlan.id,
      projectId: project.id,
      totalAmount: 0,
      donatedItems: {},
      claimedMilestoneIds: []
    }
  }

  const normalizeProjectState = (projectId: string, state?: Partial<VillageProjectState>): VillageProjectState => {
    const defaults = getProjectDefaultState(projectId)
    return {
      completed: state?.completed ?? defaults.completed,
      completedDayTag: state?.completedDayTag,
      completedStageIndex: state?.completedStageIndex ?? defaults.completedStageIndex,
      stageGroupId: state?.stageGroupId ?? defaults.stageGroupId
    }
  }

  const normalizeMaintenanceState = (
    projectId: string,
    state?: Partial<VillageProjectMaintenanceState>
  ): VillageProjectMaintenanceState | undefined => {
    const defaults = buildMaintenanceState(projectId)
    if (!defaults) return undefined

    return {
      ...defaults,
      planId: state?.planId ?? defaults.planId,
      targetProjectId: state?.targetProjectId ?? defaults.targetProjectId,
      autoRenew: state?.autoRenew ?? defaults.autoRenew,
      status: state?.status ?? defaults.status,
      lastPaidDayTag: state?.lastPaidDayTag,
      nextDueDayTag: state?.nextDueDayTag,
      pendingCycles: state?.pendingCycles ?? defaults.pendingCycles
    }
  }

  const normalizeDonationState = (
    projectId: string,
    state?: Partial<VillageProjectDonationState>
  ): VillageProjectDonationState | undefined => {
    const defaults = buildDonationState(projectId)
    if (!defaults) return undefined

    const normalizedState = {
      ...defaults,
      planId: state?.planId ?? defaults.planId,
      projectId: state?.projectId ?? defaults.projectId,
      totalAmount: state?.totalAmount ?? defaults.totalAmount,
      donatedItems: state?.donatedItems ?? defaults.donatedItems,
      claimedMilestoneIds: state?.claimedMilestoneIds ?? defaults.claimedMilestoneIds
    }

    const donationPlan = VILLAGE_PROJECT_DEFS.find(entry => entry.id === projectId)?.donationPlan
    const shouldResetRepeatableCycle =
      !!donationPlan?.repeatable &&
      normalizedState.totalAmount >= (donationPlan.targetAmount ?? 0) &&
      (donationPlan.milestones ?? []).length > 0 &&
      (donationPlan.milestones ?? []).every(milestone => normalizedState.claimedMilestoneIds.includes(milestone.id))

    return shouldResetRepeatableCycle ? { ...defaults } : normalizedState
  }

  const projects = computed(() => {
    const npcStore = useNpcStore()
    return VILLAGE_PROJECT_DEFS.map(def => {
      const state = normalizeProjectState(def.id, projectStates.value[def.id])
      const clueUnlocked = !def.requiredClueId || npcStore.relationshipClues.some(clue => clue.clueId === def.requiredClueId)
      return {
        ...def,
        buildMode: def.buildMode ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.buildMode,
        contentTier: def.contentTier ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.contentTier,
        unlockEffects: def.unlockEffects ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.unlockEffects,
        regionalEffects: def.regionalEffects ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.regionalEffects,
        donationPlan: def.donationPlan
          ? {
              ...def.donationPlan,
              acceptedItemIds:
                def.donationPlan.acceptedItemIds ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.donationAcceptedItemIds,
              targetAmount: def.donationPlan.targetAmount ?? 0,
              repeatable: def.donationPlan.repeatable ?? false,
              milestones: def.donationPlan.milestones ?? []
            }
          : undefined,
        maintenancePlan: def.maintenancePlan
          ? {
              ...def.maintenancePlan,
              autoRenew: def.maintenancePlan.autoRenew ?? VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.maintenanceAutoRenew,
              cycleDays: def.maintenancePlan.cycleDays || VILLAGE_PROJECT_OPERATIONAL_CONFIG.defaultState.maintenanceCycleDays
            }
          : undefined,
        completed: state.completed,
        completedDayTag: state.completedDayTag,
        completedStageIndex: state.completedStageIndex,
        stageGroupId: state.stageGroupId,
        clueUnlocked
      }
    })
  })

  const getProject = (projectId: string) => projects.value.find(entry => entry.id === projectId)

  const villageProjectLevel = computed(() => projects.value.filter(project => project.completed).length)
  const fundingPhase = computed(() => getVillageProjectFundingPhase(villageProjectLevel.value))
  const playerSegment = computed(() => getVillageProjectPlayerSegment(villageProjectLevel.value, playerStore.money))
  const linkedSystemCoverage = computed(() => {
    const completedProjects = projects.value.filter(project => project.completed)
    if (!completedProjects.length) return 0

    const linkedProjects = completedProjects.filter(project => project.linkedSystems.length > 0)
    return linkedProjects.length / completedProjects.length
  })
  const phaseProjects = computed(() => {
    const result = {
      bootstrap: [] as typeof projects.value,
      expansion: [] as typeof projects.value,
      endgame: [] as typeof projects.value
    }

    for (const project of projects.value) {
      result[project.fundingPhase].push(project)
    }

    return result
  })

  const tierProjects = computed(() => {
    const result: Record<VillageProjectContentTier, typeof projects.value> = {
      P0: [],
      P1: [],
      P2: []
    }

    for (const project of projects.value) {
      result[project.contentTier].push(project)
    }

    return result
  })

  const linkedSystemProjects = computed<Record<VillageProjectLinkedSystem, typeof projects.value>>(() => {
    return {
      quest: projects.value.filter(project => project.linkedSystems.includes('quest')),
      goal: projects.value.filter(project => project.linkedSystems.includes('goal')),
      museum: projects.value.filter(project => project.linkedSystems.includes('museum')),
      guild: projects.value.filter(project => project.linkedSystems.includes('guild')),
      hanhai: projects.value.filter(project => project.linkedSystems.includes('hanhai'))
    }
  })

  const completedStageCounts = computed<Record<string, number>>(() => {
    return projects.value.reduce<Record<string, number>>((result, project) => {
      if (!project.completed || !project.stageConfig?.projectGroupId) return result
      result[project.stageConfig.projectGroupId] = (result[project.stageConfig.projectGroupId] ?? 0) + 1
      return result
    }, {})
  })

  const getRequirementCurrentValue = (requirement: VillageProjectRequirement): number => {
    const achievementStore = useAchievementStore()
    const breedingStore = useBreedingStore()
    const guildStore = useGuildStore()
    const hanhaiStore = useHanhaiStore()
    const museumStore = useMuseumStore()
    const questStore = useQuestStore()

    switch (requirement.type) {
      case 'guildContribution':
        return guildStore.contributionPoints
      case 'guildGoalCount':
        return guildStore.completedGoalCount
      case 'museumDonations':
        return museumStore.donatedCount
      case 'breedingCompendium':
        return breedingStore.compendium.length
      case 'hanhaiRelicClears':
        return hanhaiStore.totalRelicClears
      case 'completedBundles':
        return achievementStore.completedBundles.length
      case 'completedQuests':
        return questStore.completedQuestCount
      case 'villageProjectLevel':
        return villageProjectLevel.value
      default:
        return 0
    }
  }

  const getRequirementDefaultLabel = (requirement: VillageProjectRequirement): string => {
    switch (requirement.type) {
      case 'guildContribution':
        return `公会贡献达到 ${requirement.target} 点`
      case 'guildGoalCount':
        return `完成 ${requirement.target} 个公会讨伐目标`
      case 'museumDonations':
        return `向博物馆捐赠 ${requirement.target} 件展品`
      case 'breedingCompendium':
        return `育种图鉴发现 ${requirement.target} 个杂交品种`
      case 'hanhaiRelicClears':
        return `完成 ${requirement.target} 次瀚海遗迹勘探`
      case 'completedBundles':
        return `完成 ${requirement.target} 个社区目标`
      case 'completedQuests':
        return `累计完成 ${requirement.target} 个委托 / 订单`
      case 'villageProjectLevel':
        return `先完成 ${requirement.target} 项村庄建设`
      default:
        return '推进相关专项进度'
    }
  }

  const getProjectRequirementProgresses = (projectId: string): VillageProjectRequirementProgress[] => {
    const project = VILLAGE_PROJECT_DEFS.find(entry => entry.id === projectId)
    if (!project?.requirements?.length) return []

    return project.requirements.map(requirement => {
      const current = getRequirementCurrentValue(requirement)
      return {
        ...requirement,
        current,
        met: current >= requirement.target,
        displayLabel: requirement.label ?? getRequirementDefaultLabel(requirement)
      }
    })
  }

  const isProjectCompleted = (projectId: string) => projectStates.value[projectId]?.completed ?? false
  const hasProject = (projectId: string) => isProjectCompleted(projectId)
  const isProjectUnlocked = (projectId: string) => {
    const project = getProject(projectId)
    if (!project?.clueUnlocked) return false
    if (project.requiredProjectId && !hasProject(project.requiredProjectId)) return false
    return true
  }
  const hasProjectRequirementsMet = (projectId: string) => getProjectRequirementProgresses(projectId).every(requirement => requirement.met)
  const isProjectAvailable = (projectId: string) => {
    const project = getProject(projectId)
    return Boolean(project && !project.completed && isProjectUnlocked(projectId))
  }

  const canCompleteProject = (projectId: string): VillageProjectCheckResult => {
    const project = getProject(projectId)
    if (!project) return { ok: false, code: 'not_found', reason: '建设项目不存在。' }
    if (project.completed) return { ok: false, code: 'completed', reason: '该建设项目已完成。' }
    if (!project.clueUnlocked) return { ok: false, code: 'missing_clue', reason: project.requiredClueText ?? '尚未获得对应建设线索。' }
    if (project.requiredProjectId && !hasProject(project.requiredProjectId)) {
      return { ok: false, code: 'missing_project', reason: project.requiredProjectText ?? '需要先完成前置建设项目。' }
    }

    const unmetRequirement = getProjectRequirementProgresses(projectId).find(requirement => !requirement.met)
    if (unmetRequirement) {
      return {
        ok: false,
        code: 'requirement',
        reason: `专项进度未达标：${unmetRequirement.displayLabel}（${unmetRequirement.current}/${unmetRequirement.target}）`,
        unmetRequirement
      }
    }

    if (playerStore.money < project.moneyCost) {
      return { ok: false, code: 'money', reason: `金钱不足（需要${project.moneyCost}文）。` }
    }

    const lacking = project.materials.find(material => getCombinedItemCount(material.itemId) < material.quantity)
    if (lacking) {
      const itemName = getItemById(lacking.itemId)?.name ?? lacking.itemId
      return {
        ok: false,
        code: 'material',
        reason: `材料不足：${itemName} 还缺 ${lacking.quantity - getCombinedItemCount(lacking.itemId)}。`,
        missingItemId: lacking.itemId,
        missingAmount: lacking.quantity - getCombinedItemCount(lacking.itemId)
      }
    }

    return { ok: true }
  }

  const getProjectStageSummary = (projectId: string): VillageProjectStageSummary | undefined => {
    const project = getProject(projectId)
    if (!project) return undefined

    const completedStageCount = project.stageConfig?.projectGroupId
      ? completedStageCounts.value[project.stageConfig.projectGroupId] ?? 0
      : project.completed
        ? 1
        : 0
    const available = isProjectAvailable(projectId)
    return {
      projectId: project.id,
      projectGroupId: project.stageConfig?.projectGroupId,
      buildMode: project.buildMode,
      fundingPhase: project.fundingPhase,
      contentTier: project.contentTier,
      stageIndex: project.stageConfig?.stageIndex,
      totalStages: project.stageConfig?.totalStages,
      stageLabel: project.stageConfig?.stageLabel,
      gateSummary: project.stageConfig?.gateSummary,
      previousStageProjectId: project.stageConfig?.previousStageProjectId,
      nextStageProjectId: project.stageConfig?.nextStageProjectId,
      completed: project.completed,
      completedStageIndex: project.completedStageIndex,
      completedStageCount,
      available,
      canBuildNow: canCompleteProject(projectId).ok
    }
  }

  const getMaintenanceState = (projectId: string) => maintenanceStates.value[projectId]
  const getDonationState = (projectId: string) => donationStates.value[projectId]

  const isMaintenanceEffectActive = (projectId: string) => {
    const project = getProject(projectId)
    if (!project?.maintenancePlan) return true
    const state = normalizeMaintenanceState(projectId, maintenanceStates.value[projectId])
    return state?.status === 'active'
  }

  const getProjectMaintenanceSummary = (projectId: string): VillageProjectMaintenanceSummary | undefined => {
    const project = getProject(projectId)
    if (!project?.maintenancePlan) return undefined

    const state = normalizeMaintenanceState(projectId, maintenanceStates.value[projectId])
    if (!state) return undefined

    const statusLabel =
      state.status === 'active'
        ? '维护中'
        : state.status === 'overdue'
          ? '已逾期'
          : project.completed
            ? '待启用'
            : '未解锁'

    return {
      projectId,
      plan: project.maintenancePlan,
      state,
      unlocked: project.completed,
      active: state.status === 'active',
      overdue: state.status === 'overdue',
      statusLabel
    }
  }

  const getProjectDonationSummary = (projectId: string): VillageProjectDonationSummary | undefined => {
    const project = getProject(projectId)
    if (!project?.donationPlan) return undefined

    const state = normalizeDonationState(projectId, donationStates.value[projectId])
    if (!state) return undefined

    const targetAmount = project.donationPlan.targetAmount ?? 0
    const totalAmount = state.totalAmount

    return {
      projectId,
      plan: project.donationPlan,
      state,
      unlocked: project.completed,
      progressRate: targetAmount > 0 ? Math.min(totalAmount / targetAmount, 1) : 0,
      remainingAmount: Math.max(targetAmount - totalAmount, 0),
      targetReached: targetAmount > 0 ? totalAmount >= targetAmount : false,
      acceptedItems: (project.donationPlan.acceptedItemIds ?? []).map(itemId => ({
        itemId,
        itemName: getItemById(itemId)?.name ?? itemId,
        donatedAmount: state.donatedItems[itemId] ?? 0
      })),
      milestones: (project.donationPlan.milestones ?? []).map(milestone => ({
        id: milestone.id,
        label: milestone.label,
        targetAmount: milestone.targetAmount,
        rewardSummary: milestone.rewardSummary,
        claimed: state.claimedMilestoneIds.includes(milestone.id),
        reached: totalAmount >= milestone.targetAmount,
        remainingAmount: Math.max(milestone.targetAmount - totalAmount, 0)
      }))
    }
  }

  const getProjectRegionalSummary = (projectId: string): VillageProjectRegionalEffectSummary | undefined => {
    const project = getProject(projectId)
    if (!project) return undefined

    const areas = (project.regionalEffects ?? []).map(area => {
      const functionChanges = area.functionChanges ?? []
      return {
        areaId: area.areaId,
        label: area.label,
        summary: area.summary,
        unlockCount: functionChanges.filter(change => change.mode === 'unlock').length,
        upgradeCount: functionChanges.filter(change => change.mode === 'upgrade').length,
        rerouteCount: functionChanges.filter(change => change.mode === 'reroute').length,
        functionChanges,
        linkedSystems: area.linkedSystems ?? []
      }
    })

    return {
      projectId,
      unlocked: project.completed,
      totalAreaCount: areas.length,
      totalFunctionChangeCount: areas.reduce((sum, area) => sum + area.functionChanges.length, 0),
      areas
    }
  }

  const operationalSummaries = computed<VillageProjectOperationalSummary[]>(() => {
    return projects.value.map(project => ({
      id: project.id,
      fundingPhase: project.fundingPhase,
      buildMode: project.buildMode,
      contentTier: project.contentTier,
      linkedSystems: project.linkedSystems,
      stageConfig: project.stageConfig,
      unlockEffects: project.unlockEffects,
      maintenancePlan: project.maintenancePlan,
      donationPlan: project.donationPlan,
      regionalEffects: project.regionalEffects,
      auditTags: project.auditTags
    }))
  })

  const maintenanceSummaries = computed<VillageProjectMaintenanceSummary[]>(() => {
    return projects.value
      .map(project => getProjectMaintenanceSummary(project.id))
      .filter((summary): summary is VillageProjectMaintenanceSummary => Boolean(summary))
  })

  const donationSummaries = computed<VillageProjectDonationSummary[]>(() => {
    return projects.value
      .map(project => getProjectDonationSummary(project.id))
      .filter((summary): summary is VillageProjectDonationSummary => Boolean(summary))
  })

  const projectSummaries = computed<VillageProjectProjectSummary[]>(() => {
    return projects.value.map(project => {
      const requirements = getProjectRequirementProgresses(project.id)
      const requirementsMet = hasProjectRequirementsMet(project.id)
      const unlocked = isProjectUnlocked(project.id)
      const available = !project.completed && unlocked
      const check = canCompleteProject(project.id)
      return {
        id: project.id,
        name: project.name,
        completed: project.completed,
        clueUnlocked: project.clueUnlocked,
        unlocked,
        requirementsMet,
        available,
        canBuildNow: check.ok,
        blockedReason: check.ok ? undefined : check.reason,
        fundingPhase: project.fundingPhase,
        buildMode: project.buildMode,
        contentTier: project.contentTier,
        linkedSystems: project.linkedSystems,
        requirementProgresses: requirements,
        stage: getProjectStageSummary(project.id)!,
        maintenance: getProjectMaintenanceSummary(project.id),
        donation: getProjectDonationSummary(project.id),
        regional: getProjectRegionalSummary(project.id)!,
        operational: operationalSummaries.value.find(summary => summary.id === project.id)!
      }
    })
  })

  const overviewSummary = computed<VillageProjectOverviewSummary>(() => {
    const completedProjects = projectSummaries.value.filter(project => project.completed)
    const availableProjects = projectSummaries.value.filter(project => project.available)
    const lockedProjects = projectSummaries.value.filter(project => !project.unlocked && !project.completed)

    const buildPhaseOverview = (entries: VillageProjectProjectSummary[]) => ({
      total: entries.length,
      completed: entries.filter(project => project.completed).length,
      available: entries.filter(project => project.available).length,
      locked: entries.filter(project => !project.unlocked && !project.completed).length
    })

    return {
      totalProjects: projectSummaries.value.length,
      completedProjects: completedProjects.length,
      availableProjects: availableProjects.length,
      lockedProjects: lockedProjects.length,
      currentPhase: fundingPhase.value,
      currentPlayerSegment: playerSegment.value,
      linkedSystemCoverage: linkedSystemCoverage.value,
      countsByPhase: {
        bootstrap: buildPhaseOverview(projectSummaries.value.filter(project => project.fundingPhase === 'bootstrap')),
        expansion: buildPhaseOverview(projectSummaries.value.filter(project => project.fundingPhase === 'expansion')),
        endgame: buildPhaseOverview(projectSummaries.value.filter(project => project.fundingPhase === 'endgame'))
      },
      countsByTier: {
        P0: buildPhaseOverview(projectSummaries.value.filter(project => project.contentTier === 'P0')),
        P1: buildPhaseOverview(projectSummaries.value.filter(project => project.contentTier === 'P1')),
        P2: buildPhaseOverview(projectSummaries.value.filter(project => project.contentTier === 'P2'))
      },
      activeMaintenancePlans: maintenanceSummaries.value.filter(summary => summary.unlocked),
      availableDonationPlans: donationSummaries.value.filter(summary => summary.unlocked)
    }
  })

  const baselineAudit = computed(() => {
    const completedProjects = projects.value.filter(project => project.completed)
    const openedProjects = projects.value.filter(project => project.clueUnlocked)
    const highValueOpenedProjects = openedProjects.filter(project => project.fundingPhase !== 'bootstrap')
    const highValueCompletedProjects = completedProjects.filter(project => project.fundingPhase !== 'bootstrap')
    const totalRecoveredMaterials = completedProjects.reduce(
      (sum, project) => sum + project.materials.reduce((materialSum, material) => materialSum + material.quantity, 0),
      0
    )

    return {
      definition: VILLAGE_PROJECT_BASELINE_AUDIT,
      currentPhase: fundingPhase.value,
      currentPlayerSegment: playerSegment.value,
      currentPhaseDefinition: VILLAGE_PROJECT_BASELINE_AUDIT.phaseSegments.find(segment => segment.id === fundingPhase.value),
      currentPlayerSegmentDefinition: VILLAGE_PROJECT_BASELINE_AUDIT.playerSegments.find(segment => segment.id === playerSegment.value),
      summary: {
        villageProjectLevel: villageProjectLevel.value,
        completedProjectCount: completedProjects.length,
        openedProjectCount: openedProjects.length,
        highValueProjectCompletionRate: highValueOpenedProjects.length
          ? highValueCompletedProjects.length / highValueOpenedProjects.length
          : 0,
        lateGameBuildParticipationEligible: villageProjectLevel.value >= 3 || playerStore.money >= 6000,
        systemImpactCoverage: linkedSystemCoverage.value,
        recoveredMaterialQuantity: totalRecoveredMaterials,
        phaseProjectCounts: {
          bootstrap: phaseProjects.value.bootstrap.length,
          expansion: phaseProjects.value.expansion.length,
          endgame: phaseProjects.value.endgame.length
        },
        phaseCompletedCounts: {
          bootstrap: phaseProjects.value.bootstrap.filter(project => project.completed).length,
          expansion: phaseProjects.value.expansion.filter(project => project.completed).length,
          endgame: phaseProjects.value.endgame.filter(project => project.completed).length
        }
      },
      rollbackRule: VILLAGE_PROJECT_BASELINE_AUDIT.rollbackRule
    }
  })

  const getProjectAuditProfile = (projectId: string) => {
    const project = getProject(projectId)
    if (!project) return undefined

    return {
      id: project.id,
      fundingPhase: project.fundingPhase,
      linkedSystems: project.linkedSystems,
      auditTags: project.auditTags,
      requirementCount: project.requirements?.length ?? 0,
      materialTypes: project.materials.length,
      materialQuantity: project.materials.reduce((sum, material) => sum + material.quantity, 0),
      isHighValue: project.fundingPhase !== 'bootstrap'
    }
  }

  const getOperationalSummary = (projectId: string) => operationalSummaries.value.find(project => project.id === projectId)
  const getProjectSummary = (projectId: string) => projectSummaries.value.find(project => project.id === projectId)
  const getLinkedProjects = (system: VillageProjectLinkedSystem) => linkedSystemProjects.value[system]
  const getLinkedProjectSummaries = (system: VillageProjectLinkedSystem) =>
    projectSummaries.value.filter(project => project.linkedSystems.includes(system))
  const getProjectsByTier = (tier: VillageProjectContentTier) => tierProjects.value[tier]
  const getProjectsByPhase = (phase: typeof fundingPhase.value) => phaseProjects.value[phase]
  const getProjectSummariesByTier = (tier: VillageProjectContentTier) =>
    projectSummaries.value.filter(project => project.contentTier === tier)
  const getProjectSummariesByPhase = (phase: typeof fundingPhase.value) =>
    projectSummaries.value.filter(project => project.fundingPhase === phase)

  const queryProjects = (options: VillageProjectQueryOptions = {}) => {
    return projectSummaries.value.filter(project => {
      if (options.fundingPhase && project.fundingPhase !== options.fundingPhase) return false
      if (options.contentTier && project.contentTier !== options.contentTier) return false
      if (options.buildMode && project.buildMode !== options.buildMode) return false
      if (options.linkedSystem && !project.linkedSystems.includes(options.linkedSystem)) return false
      if (options.completed !== undefined && project.completed !== options.completed) return false
      if (options.clueUnlocked !== undefined && project.clueUnlocked !== options.clueUnlocked) return false
      if (options.auditTag && !project.operational.auditTags.includes(options.auditTag)) return false
      return true
    })
  }

  const setProjectState = (projectId: string, patch: Partial<VillageProjectState>) => {
    const nextState = normalizeProjectState(projectId, {
      ...projectStates.value[projectId],
      ...patch
    })
    projectStates.value = {
      ...projectStates.value,
      [projectId]: nextState
    }
    return nextState
  }

  const updateMaintenanceState = (projectId: string, patch: Partial<VillageProjectMaintenanceState>) => {
    const nextState = normalizeMaintenanceState(projectId, {
      ...maintenanceStates.value[projectId],
      ...patch
    })
    if (!nextState) return undefined

    maintenanceStates.value = {
      ...maintenanceStates.value,
      [projectId]: nextState
    }
    return nextState
  }

  const updateDonationState = (projectId: string, patch: Partial<VillageProjectDonationState>) => {
    const nextState = normalizeDonationState(projectId, {
      ...donationStates.value[projectId],
      ...patch
    })
    if (!nextState) return undefined

    donationStates.value = {
      ...donationStates.value,
      [projectId]: nextState
    }
    return nextState
  }

  const setMaintenanceAutoRenew = (projectId: string, autoRenew: boolean) => {
    return updateMaintenanceState(projectId, { autoRenew })
  }

  const activateMaintenancePlan = (projectId: string, nextDueDayTag?: string) => {
    return updateMaintenanceState(projectId, {
      status: 'active',
      lastPaidDayTag: getCurrentDayTag(),
      nextDueDayTag,
      pendingCycles: 0
    })
  }

  const markMaintenanceOverdue = (projectId: string, pendingCycles: number = 1, nextDueDayTag?: string) => {
    return updateMaintenanceState(projectId, {
      status: 'overdue',
      pendingCycles: Math.max(pendingCycles, 0),
      nextDueDayTag
    })
  }

  const deactivateMaintenancePlan = (projectId: string) => {
    return updateMaintenanceState(projectId, { status: 'inactive' })
  }

  const payProjectMaintenance = (projectId: string) => {
    const summary = getProjectMaintenanceSummary(projectId)
    if (!summary) return { success: false, message: '该项目没有维护计划。' }
    if (!summary.unlocked) return { success: false, message: '需要先完成该建设项目。' }
    if (summary.active && summary.state.nextDueDayTag && !isDayTagReached(summary.state.nextDueDayTag, getCurrentDayTag())) {
      return { success: false, message: '当前维护仍在生效，无需提前续费。' }
    }

    const maintenanceReduction = useShopStore().getServiceContractEffectSummary().maintenanceCostRateReduction
    const maintenanceCost = Math.max(0, Math.floor(summary.plan.costMoney * (1 - maintenanceReduction)))
    if (!playerStore.spendMoney(maintenanceCost, 'villageProject')) {
      return { success: false, message: `铜钱不足（需要${maintenanceCost}文）。` }
    }

    playerStore.recordSinkSpend(maintenanceCost, 'maintenance')
    const nextDueDayTag = addDaysToDayTag(getCurrentDayTag(), summary.plan.cycleDays)
    activateMaintenancePlan(projectId, nextDueDayTag)
    addLog(`【村庄建设】已为${getProject(projectId)?.name ?? projectId}支付${maintenanceCost}文维护费，下次维护日：${nextDueDayTag}。`, {
      category: 'village',
      tags: ['village_project_maintenance_cycle', 'late_game_cycle'],
      meta: { projectId, costMoney: maintenanceCost, nextDueDayTag }
    })
    return { success: true, message: `已启用维护：下次维护日 ${nextDueDayTag}${maintenanceReduction > 0 ? '（已计入维保合同减免）' : ''}` }
  }

  const donateToProject = (projectId: string, itemId: string, amount: number) => {
    if (amount <= 0) {
      return { success: false, message: '捐赠数量必须大于 0。' }
    }

    const donationSummary = getProjectDonationSummary(projectId)
    if (!donationSummary) {
      return { success: false, message: '该建设项目没有捐赠计划。' }
    }
    if (!donationSummary.unlocked) {
      return { success: false, message: '需要先完成对应建设，才能进行捐赠。' }
    }
    if (!donationSummary.plan.acceptedItemIds?.includes(itemId)) {
      return { success: false, message: '该物品不在当前捐赠清单内。' }
    }
    if (getCombinedItemCount(itemId) < amount) {
      return { success: false, message: `${getItemById(itemId)?.name ?? itemId}不足，无法完成当前捐赠。` }
    }

    const inventoryStore = useInventoryStore()
    const warehouseStore = useWarehouseStore()
    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()
    if (!removeCombinedItem(itemId, amount)) {
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      return { success: false, message: '扣除捐赠物资失败，请检查背包与仓库。' }
    }

    const nextState = updateDonationState(projectId, {
      totalAmount: donationSummary.state.totalAmount + amount,
      donatedItems: {
        ...donationSummary.state.donatedItems,
        [itemId]: (donationSummary.state.donatedItems[itemId] ?? 0) + amount
      }
    })

    if (!nextState) {
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      return { success: false, message: '更新捐赠状态失败。' }
    }

    addLog(`【村庄建设】${donationSummary.plan.label}新增捐赠：${getItemById(itemId)?.name ?? itemId} x${amount}`, {
      category: 'village',
      tags: ['village_project_donation'],
      meta: { projectId, planId: donationSummary.plan.id, itemId, amount }
    })

    return { success: true, message: `已为 ${donationSummary.plan.label} 记录捐赠。` }
  }

  const grantDonationMilestoneReward = (projectId: string, milestoneId: string) => {
    const project = getProject(projectId)
    const milestoneDef = project?.donationPlan?.milestones?.find(entry => entry.id === milestoneId)
    const reward = milestoneDef?.reward
    if (!reward) {
      return { success: true, rewardText: '' }
    }

    const inventoryStore = useInventoryStore()
    const rewardItems = (reward.items ?? [])
      .filter(entry => entry?.itemId && Number.isFinite(entry.quantity) && entry.quantity > 0)
      .map(entry => ({
        itemId: entry.itemId,
        quantity: Math.max(1, Math.floor(entry.quantity))
      }))

    if (rewardItems.length > 0 && !inventoryStore.addItemsExact(rewardItems)) {
      return {
        success: false,
        rewardText: '',
        message: '奖励发放失败：背包空间不足，请先整理背包后再领取。'
      }
    }

    const rewardMoney = Math.max(0, Math.floor(reward.money ?? 0))
    if (rewardMoney > 0) {
      playerStore.earnMoney(rewardMoney, { system: 'villageProject' })
    }

    const rewardText = [
      rewardMoney > 0 ? `铜钱+${rewardMoney}` : '',
      ...rewardItems.map(entry => `${getItemById(entry.itemId)?.name ?? entry.itemId} x${entry.quantity}`)
    ]
      .filter(Boolean)
      .join('、')

    return { success: true, rewardText }
  }

  const claimDonationMilestone = (projectId: string, milestoneId: string) => {
    const donationSummary = getProjectDonationSummary(projectId)
    if (!donationSummary) {
      return { success: false, message: '该建设项目没有捐赠里程碑。' }
    }

    const milestone = donationSummary.milestones.find(entry => entry.id === milestoneId)
    if (!milestone) {
      return { success: false, message: '捐赠里程碑不存在。' }
    }
    if (!milestone.reached) {
      return { success: false, message: '当前捐赠进度尚未达到该里程碑。' }
    }
    if (milestone.claimed) {
      return { success: false, message: '该捐赠里程碑已领取。' }
    }

    const rewardResult = grantDonationMilestoneReward(projectId, milestoneId)
    if (!rewardResult.success) {
      return { success: false, message: rewardResult.message ?? '奖励发放失败。' }
    }

    const nextState = updateDonationState(projectId, {
      claimedMilestoneIds: [...donationSummary.state.claimedMilestoneIds, milestoneId]
    })
    if (!nextState) {
      return { success: false, message: '更新捐赠里程碑状态失败。' }
    }

    addLog(`【村庄建设】${donationSummary.plan.label}达成里程碑：${milestone.label}`, {
      category: 'village',
      tags: ['village_project_donation_milestone'],
      meta: { projectId, planId: donationSummary.plan.id, milestoneId, rewardText: rewardResult.rewardText }
    })

    return {
      success: true,
      message: rewardResult.rewardText ? `${milestone.label} 已领取：${rewardResult.rewardText}。` : `${milestone.label} 已记录为已领取。`
    }
  }

  const processOperationalTick = (currentDayTag: string, options?: { startedNewWeek?: boolean }) => {
    const maintenanceEvents: string[] = []
    const weeklySummaries: string[] = []

    for (const project of projects.value) {
      if (!project.completed || !project.maintenancePlan) continue

      const state = normalizeMaintenanceState(project.id, maintenanceStates.value[project.id])
      if (!state) continue

      if (state.status === 'inactive' && !state.nextDueDayTag) {
        continue
      }

      if (!state.nextDueDayTag) continue

      if (!isDayTagReached(state.nextDueDayTag, currentDayTag)) continue

      const maintenanceReduction = useShopStore().getServiceContractEffectSummary().maintenanceCostRateReduction
      const maintenanceCost = Math.max(0, Math.floor(project.maintenancePlan.costMoney * (1 - maintenanceReduction)))
      if (state.status === 'active' && state.autoRenew && maintenanceCost > 0 && playerStore.spendMoney(maintenanceCost, 'villageProject')) {
        playerStore.recordSinkSpend(maintenanceCost, 'maintenance')
        const nextDueDayTag = addDaysToDayTag(currentDayTag, project.maintenancePlan.cycleDays)
        activateMaintenancePlan(project.id, nextDueDayTag)
        maintenanceEvents.push(`【村庄建设】已为${project.name}自动支付${maintenanceCost}文维护费，下次维护日：${nextDueDayTag}。${maintenanceReduction > 0 ? ' 维保合同已生效。' : ''}`)
      } else {
        const pendingCycles = Math.max(1, state.pendingCycles + 1)
        const nextDueDayTag = addDaysToDayTag(state.nextDueDayTag, project.maintenancePlan.cycleDays)
        markMaintenanceOverdue(project.id, pendingCycles, nextDueDayTag)
        maintenanceEvents.push(`【村庄建设】${project.name}的${project.maintenancePlan.label}已逾期，待补维护周期：${pendingCycles}。`)
      }
    }

    if (options?.startedNewWeek) {
      const activeMaintenanceCount = maintenanceSummaries.value.filter(summary => summary.active).length
      const overdueMaintenanceCount = maintenanceSummaries.value.filter(summary => summary.overdue).length
      const progressingDonationPlans = donationSummaries.value.filter(summary => summary.unlocked && summary.state.totalAmount > 0 && !summary.targetReached)
      const reachedDonationPlans = donationSummaries.value.filter(summary => summary.unlocked && summary.targetReached)

      if (activeMaintenanceCount > 0 || overdueMaintenanceCount > 0) {
        weeklySummaries.push(`【村庄建设】本周维护概览：维护中 ${activeMaintenanceCount} 项，逾期 ${overdueMaintenanceCount} 项。`)
      }
      if (progressingDonationPlans.length > 0) {
        weeklySummaries.push(`【村庄建设】仍有 ${progressingDonationPlans.length} 项捐赠计划在推进中，可继续补充专项物资。`)
      }
      if (reachedDonationPlans.length > 0) {
        weeklySummaries.push(`【村庄建设】已有 ${reachedDonationPlans.length} 项捐赠计划达到阶段目标，记得领取对应里程碑。`)
      }
    }

    for (const message of maintenanceEvents) {
      addLog(message, {
        category: 'village',
        tags: ['village_project_maintenance_cycle', 'late_game_cycle'],
        meta: { dayTag: currentDayTag }
      })
    }

    for (const message of weeklySummaries) {
      addLog(message, {
        category: 'village',
        tags: ['village_project_weekly_summary', 'late_game_cycle'],
        meta: { dayTag: currentDayTag }
      })
    }

    return {
      maintenanceEvents,
      weeklySummaries
    }
  }

  const completeProject = (projectId: string): { success: boolean; message: string } => {
    const project = getProject(projectId)
    if (!project) return { success: false, message: '建设项目不存在。' }

    const check = canCompleteProject(projectId)
    if (!check.ok) return { success: false, message: check.reason ?? '当前无法建设。' }

    const inventoryStore = useInventoryStore()
    const warehouseStore = useWarehouseStore()
    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()

    if (!playerStore.spendMoney(project.moneyCost)) {
      return { success: false, message: `金钱不足（需要${project.moneyCost}文）。` }
    }

    for (const material of project.materials) {
      if (!removeCombinedItem(material.itemId, material.quantity)) {
        inventoryStore.deserialize(inventorySnapshot)
        warehouseStore.deserialize(warehouseSnapshot)
        playerStore.earnMoney(project.moneyCost, { countAsEarned: false })
        return { success: false, message: '扣除材料失败，请检查背包与仓库。' }
      }
    }

    setProjectState(projectId, {
      completed: true,
      completedDayTag: getCurrentDayTag(),
      completedStageIndex: project.stageConfig?.stageIndex,
      stageGroupId: project.stageConfig?.projectGroupId
    })

    const nextMaintenanceState = normalizeMaintenanceState(projectId, maintenanceStates.value[projectId])
    if (nextMaintenanceState) {
      maintenanceStates.value = {
        ...maintenanceStates.value,
        [projectId]: nextMaintenanceState
      }
    }

    const nextDonationState = normalizeDonationState(projectId, donationStates.value[projectId])
    if (nextDonationState) {
      donationStates.value = {
        ...donationStates.value,
        [projectId]: nextDonationState
      }
    }

    addLog(`【村庄建设】${project.name}已经完工：${project.benefitSummary}`, {
      category: 'village',
      tags: ['village_project_completed'],
      meta: { projectId: project.id, fundingPhase: project.fundingPhase, buildMode: project.buildMode }
    })
    useGoalStore().evaluateProgressAndRewards()
    return { success: true, message: `${project.name}建设完成！` }
  }

  const completedUnlockEffects = computed<VillageProjectUnlockEffect[]>(() => {
    return projects.value.filter(project => project.completed && isMaintenanceEffectActive(project.id)).flatMap(project => project.unlockEffects)
  })

  const getCompletedEffectTotal = (effectType: VillageProjectUnlockEffect['type']) => {
    return completedUnlockEffects.value
      .filter(effect => effect.type === effectType)
      .reduce((sum, effect) => sum + (effect.value ?? 0), 0)
  }

  const getQuestMoneyBonusRate = () => getCompletedEffectTotal('questMoneyBonusRate')
  const getQuestFriendshipBonus = () => getCompletedEffectTotal('questFriendshipBonus')
  const getDailyRecoveryBonus = () => getCompletedEffectTotal('dailyRecoveryBonusRate')
  const getDailyQuestBoardBonus = () => getCompletedEffectTotal('dailyQuestBoardBonus')
  const getQuestCapacityBonus = () => getCompletedEffectTotal('questCapacityBonus')

  const getDebugSnapshot = (): VillageProjectDebugSnapshot => ({
    saveVersion: VILLAGE_PROJECT_SAVE_VERSION,
    overview: overviewSummary.value,
    projects: projectSummaries.value,
    maintenance: maintenanceSummaries.value,
    donation: donationSummaries.value,
    operational: operationalSummaries.value,
    rawState: serialize()
  })

  const serialize = (): VillageProjectSaveData => ({
    saveVersion: VILLAGE_PROJECT_SAVE_VERSION,
    projectStates: projectStates.value,
    maintenanceStates: maintenanceStates.value,
    donationStates: donationStates.value
  })

  const deserialize = (data: VillageProjectSaveData | undefined) => {
    const rawProjectStates = data?.projectStates ?? {}
    const rawMaintenanceStates = data?.maintenanceStates ?? {}
    const rawDonationStates = data?.donationStates ?? {}

    projectStates.value = Object.fromEntries(
      Object.keys(rawProjectStates).map(projectId => [projectId, normalizeProjectState(projectId, rawProjectStates[projectId])])
    )

    maintenanceStates.value = Object.fromEntries(
      VILLAGE_PROJECT_DEFS.flatMap(project => {
        const normalized = normalizeMaintenanceState(project.id, rawMaintenanceStates[project.id])
        return normalized ? [[project.id, normalized] as const] : []
      })
    )

    donationStates.value = Object.fromEntries(
      VILLAGE_PROJECT_DEFS.flatMap(project => {
        const normalized = normalizeDonationState(project.id, rawDonationStates[project.id])
        return normalized ? [[project.id, normalized] as const] : []
      })
    )
  }

  const reset = () => {
    projectStates.value = {}
    maintenanceStates.value = {}
    donationStates.value = {}
  }

  const $reset = () => {
    reset()
  }

  return {
    projectStates,
    maintenanceStates,
    donationStates,
    projects,
    villageProjectLevel,
    fundingPhase,
    playerSegment,
    baselineAudit,
    overviewSummary,
    operationalSummaries,
    maintenanceSummaries,
    donationSummaries,
    projectSummaries,
    linkedSystemProjects,
    isProjectCompleted,
    hasProject,
    isProjectUnlocked,
    isProjectAvailable,
    getProjectsByTier,
    getProjectsByPhase,
    getProjectSummariesByTier,
    getProjectSummariesByPhase,
    canCompleteProject,
    getProjectAuditProfile,
    getProjectRequirementProgresses,
    getProjectSummary,
    getProjectStageSummary,
    getMaintenanceState,
    getDonationState,
    getProjectMaintenanceSummary,
    getProjectDonationSummary,
    getProjectRegionalSummary,
    getOperationalSummary,
    getLinkedProjects,
    getLinkedProjectSummaries,
    queryProjects,
    setProjectState,
    updateMaintenanceState,
    updateDonationState,
    setMaintenanceAutoRenew,
    activateMaintenancePlan,
    markMaintenanceOverdue,
    deactivateMaintenancePlan,
    payProjectMaintenance,
    isMaintenanceEffectActive,
    processOperationalTick,
    donateToProject,
    claimDonationMilestone,
    completeProject,
    getQuestMoneyBonusRate,
    getQuestFriendshipBonus,
    getDailyRecoveryBonus,
    getDailyQuestBoardBonus,
    getQuestCapacityBonus,
    getDebugSnapshot,
    serialize,
    deserialize,
    reset,
    $reset
  }
})
/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */