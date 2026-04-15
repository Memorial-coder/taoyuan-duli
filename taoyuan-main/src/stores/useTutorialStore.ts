import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createDefaultGuidanceDigestState,
  WS11_GUIDANCE_LOOP_LINK_DEFS,
  WS11_GUIDANCE_PANEL_SUMMARY_DEFS,
  WS11_GUIDANCE_RECOMMENDATION_ROUTE_DEFS,
  WS11_GUIDANCE_ROUTE_CONTENT_DEFS,
  WS11_GUIDANCE_SUMMARY_CONTENT_DEFS,
  WS11_GUIDANCE_TUNING_CONFIG,
  WS11_UI_GUIDANCE_BASELINE_AUDIT
} from '@/data/tutorials'
import { useBreedingStore } from './useBreedingStore'
import { useFishPondStore } from './useFishPondStore'
import { useGoalStore } from './useGoalStore'
import { useGuildStore } from './useGuildStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useMuseumStore } from './useMuseumStore'
import { useNpcStore } from './useNpcStore'
import { useQuestStore } from './useQuestStore'
import { useShopStore } from './useShopStore'
import type {
  GuidanceCrossSystemOverview,
  GuidanceDebugSnapshot,
  GuidanceDigestState,
  GuidancePanelSummaryDef,
  GuidancePanelSummaryState,
  GuidanceRecommendationRouteDef,
  GuidanceRecommendationRouteState,
  GuidanceSurfaceDigestState,
  GuidanceSurfaceId,
  GuidanceSurfaceSnapshot,
  GuidanceTier
} from '@/types'

const GUIDANCE_SURFACE_IDS: GuidanceSurfaceId[] = ['wallet', 'quest', 'breeding', 'fishpond', 'museum', 'guild', 'hanhai', 'npc', 'shop', 'mail', 'top_goals']
const GUIDANCE_TIER_ORDER: Record<GuidanceTier, number> = { P0: 0, P1: 1, P2: 2 }
const GUIDANCE_ROUTE_TARGET_SURFACE_MAP: Record<string, GuidanceSurfaceId> = {
  ws11_route_budget_to_shop: 'shop',
  ws11_route_theme_to_quest: 'quest',
  ws11_route_growth_to_breeding: 'breeding',
  ws11_route_focus_to_museum: 'museum'
}

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

const dedupeStrings = (items: Array<string | null | undefined>) =>
  [...new Set(items.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))]

const formatGuidanceTemplate = (template: string, params: Record<string, string | number>) =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined || value === null ? '' : String(value)
  }).replace(/\s+/g, ' ').trim()

const createDefaultGuidanceSurfaceState = (surfaceId: GuidanceSurfaceId): GuidanceSurfaceDigestState => ({
  surfaceId,
  lastViewedDayTag: '',
  lastViewedDigestKey: '',
  viewedCount: 0,
  lastInteractedSummaryId: null,
  lastAdoptedRouteId: null
})

const createEmptyGuidanceSurfaceSnapshot = (surfaceId: GuidanceSurfaceId, unlockTier: GuidanceTier): GuidanceSurfaceSnapshot => ({
  surfaceId,
  unlockTier,
  headline: '',
  primarySummaryId: null,
  summaryStates: [],
  routeStates: [],
  activeSummaryCount: 0,
  activeRouteCount: 0,
  hasFreshContent: false,
  lastViewedDayTag: ''
})

const isGuidanceSurfaceId = (value: unknown): value is GuidanceSurfaceId =>
  typeof value === 'string' && GUIDANCE_SURFACE_IDS.includes(value as GuidanceSurfaceId)

const sortGuidanceSurfaceStates = (states: GuidanceSurfaceDigestState[]) =>
  [...states].sort((a, b) => GUIDANCE_SURFACE_IDS.indexOf(a.surfaceId) - GUIDANCE_SURFACE_IDS.indexOf(b.surfaceId))

const normalizeGuidanceSurfaceState = (value: unknown): GuidanceSurfaceDigestState | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<GuidanceSurfaceDigestState>
  if (!isGuidanceSurfaceId(raw.surfaceId)) return null
  return {
    surfaceId: raw.surfaceId,
    lastViewedDayTag: typeof raw.lastViewedDayTag === 'string' ? raw.lastViewedDayTag : '',
    lastViewedDigestKey: typeof raw.lastViewedDigestKey === 'string' ? raw.lastViewedDigestKey : '',
    viewedCount: Math.max(0, Number(raw.viewedCount) || 0),
    lastInteractedSummaryId: typeof raw.lastInteractedSummaryId === 'string' ? raw.lastInteractedSummaryId : null,
    lastAdoptedRouteId: typeof raw.lastAdoptedRouteId === 'string' ? raw.lastAdoptedRouteId : null
  }
}

const isGuidanceTierUnlocked = (currentTier: GuidanceTier, requiredTier: GuidanceTier) =>
  GUIDANCE_TIER_ORDER[currentTier] >= GUIDANCE_TIER_ORDER[requiredTier]

export const useTutorialStore = defineStore('tutorial', () => {
  const enabled = ref(true)
  const shownTipIds = ref<string[]>([])
  const visitedPanels = ref<string[]>([])
  const flags = ref<Record<string, boolean>>({})
  const guidanceDigestState = ref<GuidanceDigestState>(createDefaultGuidanceDigestState())
  const guidanceActionLocks = ref<string[]>([])
  const uiGuidanceBaselineAudit = WS11_UI_GUIDANCE_BASELINE_AUDIT
  const guidanceTuning = WS11_GUIDANCE_TUNING_CONFIG
  const guidanceFeatureFlags = guidanceTuning.featureFlags
  const guidanceDisplayConfig = guidanceTuning.display
  const guidanceOperationConfig = guidanceTuning.operations
  const guidancePanelSummaryDefs = WS11_GUIDANCE_PANEL_SUMMARY_DEFS
  const guidanceRecommendationRoutes = WS11_GUIDANCE_RECOMMENDATION_ROUTE_DEFS
  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const shopStore = useShopStore()
  const breedingStore = useBreedingStore()
  const fishPondStore = useFishPondStore()
  const museumStore = useMuseumStore()
  const guildStore = useGuildStore()
  const hanhaiStore = useHanhaiStore()
  const npcStore = useNpcStore()

  const guidanceTier = computed<GuidanceTier>(() => {
    const segmentId = goalStore.uiGuidanceSourceOverview.currentSegment?.id ?? ''
    if (segmentId === 'endgame_tycoon') return 'P2'
    if (
      segmentId === 'late_builder' ||
      !!goalStore.uiGuidanceSourceOverview.currentEventCampaign ||
      breedingStore.recommendedHybrids.length >= guidanceOperationConfig.p1RecommendedHybridThreshold ||
      museumStore.availableScholarCommissionCount >= guidanceOperationConfig.p1CommissionThreshold
    ) {
      return 'P1'
    }
    return 'P0'
  })

  const getGuidanceSurfaceState = (surfaceId: GuidanceSurfaceId): GuidanceSurfaceDigestState =>
    guidanceDigestState.value.surfaceStates.find(state => state.surfaceId === surfaceId) ?? createDefaultGuidanceSurfaceState(surfaceId)

  const updateGuidanceSurfaceState = (
    surfaceId: GuidanceSurfaceId,
    updater: (state: GuidanceSurfaceDigestState) => GuidanceSurfaceDigestState
  ) => {
    const nextState = updater({ ...getGuidanceSurfaceState(surfaceId), surfaceId })
    guidanceDigestState.value.surfaceStates = sortGuidanceSurfaceStates([
      ...guidanceDigestState.value.surfaceStates.filter(state => state.surfaceId !== surfaceId),
      nextState
    ])
  }

  const createGuidanceDigestSnapshot = (): GuidanceDigestState => ({
    ...guidanceDigestState.value,
    activeSummaryIds: [...guidanceDigestState.value.activeSummaryIds],
    activeRouteIds: [...guidanceDigestState.value.activeRouteIds],
    dismissedSummaryIds: [...guidanceDigestState.value.dismissedSummaryIds],
    adoptedSummaryIds: [...guidanceDigestState.value.adoptedSummaryIds],
    adoptedRouteIds: [...guidanceDigestState.value.adoptedRouteIds],
    surfaceStates: guidanceDigestState.value.surfaceStates.map(state => ({ ...state }))
  })

  const rollbackGuidanceAction = (snapshot: GuidanceDigestState) => {
    guidanceDigestState.value = snapshot
  }

  const beginGuidanceAction = (lockId: string) => {
    if (!guidanceFeatureFlags.guidanceActionLockEnabled) return true
    if (guidanceActionLocks.value.includes(lockId)) return false
    guidanceActionLocks.value = [...guidanceActionLocks.value, lockId]
    return true
  }

  const finishGuidanceAction = (lockId: string) => {
    if (!guidanceFeatureFlags.guidanceActionLockEnabled) return
    guidanceActionLocks.value = guidanceActionLocks.value.filter(id => id !== lockId)
  }

  const renderGuidanceRouteContent = (
    contentId: string | null,
    params: Record<string, string | number>,
    fallbackSummary: string
  ) => {
    const contentDef = WS11_GUIDANCE_ROUTE_CONTENT_DEFS.find(def => def.id === contentId) ?? null
    return contentDef ? formatGuidanceTemplate(contentDef.summaryTemplate, params) || fallbackSummary : fallbackSummary
  }

  const renderGuidanceSummaryContent = (
    contentId: string | null,
    params: Record<string, string | number>,
    fallbackHeadline: string,
    fallbackDetails: string[]
  ) => {
    const contentDef = WS11_GUIDANCE_SUMMARY_CONTENT_DEFS.find(def => def.id === contentId) ?? null
    if (!contentDef) {
      return {
        headline: fallbackHeadline,
        detailLines: fallbackDetails,
        linkedRouteIds: [] as string[]
      }
    }

    return {
      headline: formatGuidanceTemplate(contentDef.headlineTemplate, params) || fallbackHeadline,
      detailLines: contentDef.detailTemplates.map(template => formatGuidanceTemplate(template, params)).filter(Boolean),
      linkedRouteIds: contentDef.linkedRouteIds ?? []
    }
  }

  const resolveGuidanceRouteState = (def: GuidanceRecommendationRouteDef): GuidanceRecommendationRouteState => {
    const goalOverview = goalStore.uiGuidanceSourceOverview
    const activityOverview = questStore.activityQuestWindowOverview
    let active = false
    let priority = 0
    let summary = def.description

    switch (def.id) {
      case 'ws11_route_budget_to_shop': {
        const topSink = goalOverview.recommendedEconomySinks[0]
        const topOffer = shopStore.recommendedCatalogOffers[0]
        const routeLabels = shopStore.marketDynamicsOverview.recommendedRouteLabels.slice(0, 2).join('、')
        active = Boolean(topSink && (topOffer || routeLabels))
        priority = goalOverview.latestRiskReportSummary ? 95 : topOffer ? 82 : 68
        summary = renderGuidanceRouteContent(
          topOffer ? 'ws11_route_budget_offer' : 'ws11_route_budget_market',
          {
            sinkName: topSink?.name ?? '当前推荐',
            offerName: topOffer?.name ?? '当前目录推荐',
            routeLabels: routeLabels || '当前市场承接路线'
          },
          def.description
        )
        break
      }
      case 'ws11_route_theme_to_quest': {
        const themeWeekLabel = goalOverview.currentThemeWeek?.summaryLabel ?? goalOverview.currentThemeWeek?.name ?? ''
        const eventLabel = goalOverview.currentEventCampaign?.label ?? ''
        active = Boolean(themeWeekLabel || eventLabel || activityOverview.activeCampaign || activityOverview.specialOrder)
        priority = activityOverview.activeCampaign ? 92 : eventLabel ? 86 : activityOverview.specialOrder ? 78 : 64
        summary = eventLabel
          ? renderGuidanceRouteContent('ws11_route_theme_campaign', { eventLabel }, def.description)
          : themeWeekLabel
            ? renderGuidanceRouteContent('ws11_route_theme_week', { themeWeekLabel }, def.description)
            : activityOverview.specialOrder
              ? '先按特殊订单要求回看任务板和限时窗口，可更快形成可执行路线。'
              : def.description
        break
      }
      case 'ws11_route_growth_to_breeding': {
        const recommendedHybridCount = breedingStore.recommendedHybrids.length
        const suggestedHybridCount = breedingStore.companionshipBreedingFocus.recommendedHybridIds.length
        const orderHybridCount = activityOverview.specialOrder?.recommendedHybridIds?.length ?? 0
        active = recommendedHybridCount > 0 || suggestedHybridCount > 0 || orderHybridCount > 0
        priority = orderHybridCount > 0 ? 88 : breedingStore.companionshipBreedingFocus.activeFamilyWish ? 80 : 66
        summary = breedingStore.companionshipBreedingFocus.activeFamilyWish
          ? renderGuidanceRouteContent(
              'ws11_route_growth_family_wish',
              { familyWishTitle: breedingStore.companionshipBreedingFocus.activeFamilyWish.title },
              def.description
            )
          : orderHybridCount > 0
            ? renderGuidanceRouteContent('ws11_route_growth_order', { orderHybridCount }, def.description)
            : renderGuidanceRouteContent('ws11_route_growth_hybrid', { recommendedHybridCount }, def.description)
        break
      }
      case 'ws11_route_focus_to_museum': {
        const recommendedAction = museumStore.crossSystemOverview.recommendedActions[0]
        const museumHeadline =
          recommendedAction ??
          (museumStore.crossSystemOverview.themeWeekFocus
            ? `当前展陈焦点已切换到“${museumStore.crossSystemOverview.themeWeekFocus.summaryLabel ?? museumStore.crossSystemOverview.themeWeekFocus.name}”。`
            : def.description)
        active = Boolean(
          museumStore.crossSystemOverview.themeWeekFocus ||
          museumStore.crossSystemOverview.featuredScholarCommissions.length > 0 ||
          recommendedAction
        )
        priority = museumStore.crossSystemOverview.featuredScholarCommissions.length > 0 ? 84 : recommendedAction ? 76 : 62
        summary = recommendedAction || museumStore.crossSystemOverview.themeWeekFocus
          ? renderGuidanceRouteContent('ws11_route_museum_focus', { museumHeadline }, def.description)
          : renderGuidanceRouteContent(
              'ws11_route_museum_commission',
              { commissionCount: museumStore.crossSystemOverview.featuredScholarCommissions.length },
              def.description
            )
        break
      }
      default:
        break
    }

    if (!isGuidanceTierUnlocked(guidanceTier.value, def.unlockTier)) {
      active = false
      priority = 0
      summary = def.description
    }

    return {
      ...def,
      active,
      priority,
      status: guidanceDigestState.value.adoptedRouteIds.includes(def.id) ? 'adopted' : active ? 'available' : 'inactive',
      targetSurfaceId: GUIDANCE_ROUTE_TARGET_SURFACE_MAP[def.id] ?? def.surfaceId,
      summary
    }
  }

  const guidanceRecommendationRouteStates = computed<GuidanceRecommendationRouteState[]>(() =>
    guidanceRecommendationRoutes
      .map(resolveGuidanceRouteState)
      .filter(route => isGuidanceTierUnlocked(guidanceTier.value, route.unlockTier))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.label.localeCompare(b.label)
      })
      .slice(0, Math.max(1, guidanceDisplayConfig.maxRouteCountPerSurface * GUIDANCE_SURFACE_IDS.length))
  )

  const activeGuidanceRouteIds = computed(() =>
    guidanceRecommendationRouteStates.value.filter(route => route.active).map(route => route.id)
  )
  const activeGuidanceRouteIdSet = computed(() => new Set(activeGuidanceRouteIds.value))

  const resolveGuidanceSummaryState = (def: GuidancePanelSummaryDef): GuidancePanelSummaryState => {
    const goalOverview = goalStore.uiGuidanceSourceOverview
    const activityOverview = questStore.activityQuestWindowOverview
    let active = false
    let priority = 0
    let headline = def.description
    let detailLines: string[] = []
    let recommendedRouteIds: string[] = []

    switch (def.id) {
      case 'ws11_wallet_sink_summary': {
        const sinkNames = goalOverview.recommendedEconomySinks.slice(0, 2).map(sink => sink.name)
        const renderedContent = renderGuidanceSummaryContent(
          goalOverview.latestRiskReportSummary ? 'ws11_wallet_risk_report' : 'ws11_wallet_sink_catalog',
          {
            riskSummary: goalOverview.latestRiskReportSummary,
            segmentFocus: goalOverview.currentSegment?.recommendedFocus ?? '',
            sinkNames: sinkNames.join('、'),
            recommendedOfferCount: Math.min(3, shopStore.recommendedCatalogOffers.length)
          },
          def.description,
          []
        )
        active = Boolean(goalOverview.latestRiskReportSummary || sinkNames.length > 0)
        priority = goalOverview.latestRiskReportSummary ? 96 : sinkNames.length > 0 ? 74 : 0
        headline = renderedContent.headline || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_quest_activity_summary': {
        const themeWeekLabel = goalOverview.currentThemeWeek?.summaryLabel ?? goalOverview.currentThemeWeek?.name ?? ''
        const eventLabel = goalOverview.currentEventCampaign?.label ?? ''
        const renderedContent = renderGuidanceSummaryContent(
          eventLabel ? 'ws11_quest_event_campaign' : themeWeekLabel ? 'ws11_quest_theme_week' : 'ws11_quest_special_order',
          {
            eventLabel,
            themeWeekLabel,
            activityDescription: activityOverview.activeCampaign?.description ?? '',
            boardHint: activityOverview.boardHint || '',
            specialOrderHint: activityOverview.specialOrderHint || ''
          },
          def.description,
          []
        )
        active = Boolean(themeWeekLabel || eventLabel || activityOverview.activeCampaign || activityOverview.specialOrder || activityOverview.boardHint)
        priority = activityOverview.activeCampaign ? 92 : eventLabel ? 84 : activityOverview.specialOrder ? 78 : 60
        headline = renderedContent.headline || activityOverview.boardHint || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_breeding_growth_summary': {
        const orderHybridCount = activityOverview.specialOrder?.recommendedHybridIds?.length ?? 0
        const themeBreedingLabel = goalOverview.currentThemeWeek?.breedingFocusLabel ?? ''
        const renderedContent = renderGuidanceSummaryContent(
          breedingStore.companionshipBreedingFocus.activeFamilyWish
            ? 'ws11_breeding_family_wish'
            : orderHybridCount > 0
              ? 'ws11_breeding_special_order'
              : 'ws11_breeding_theme_focus',
          {
            familyWishSummary: breedingStore.companionshipBreedingFocus.summary,
            familyWishTitle: breedingStore.companionshipBreedingFocus.activeFamilyWish?.title ?? '',
            themeBreedingLabel,
            orderHybridCount,
            recommendedHybridCount: breedingStore.recommendedHybrids.length
          },
          breedingStore.companionshipBreedingFocus.summary,
          []
        )
        active = Boolean(
          breedingStore.recommendedHybrids.length > 0 ||
          breedingStore.companionshipBreedingFocus.activeFamilyWish ||
          orderHybridCount > 0 ||
          themeBreedingLabel
        )
        priority = orderHybridCount > 0 ? 88 : breedingStore.companionshipBreedingFocus.activeFamilyWish ? 80 : 64
        headline = renderedContent.headline || breedingStore.companionshipBreedingFocus.summary
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_fishpond_cycle_summary': {
        const pendingProductCount = fishPondStore.pendingProducts.length
        const matureFishCount = fishPondStore.matureFish.length
        const discoveredBreedCount = fishPondStore.discoveredBreeds.size
        active = Boolean(fishPondStore.pond.built && (pendingProductCount > 0 || matureFishCount > 0 || discoveredBreedCount > 0))
        priority = pendingProductCount > 0 ? 82 : matureFishCount > 0 ? 74 : discoveredBreedCount > 0 ? 60 : 0
        headline = pendingProductCount > 0
          ? `鱼塘已有 ${pendingProductCount} 份待领取产物。`
          : matureFishCount > 0
            ? `鱼塘已有 ${matureFishCount} 条成熟鱼可调度。`
            : def.description
        detailLines = dedupeStrings([
          fishPondStore.pond.built ? `当前容量：${fishPondStore.fishCount}/${fishPondStore.capacity}` : '',
          discoveredBreedCount > 0 ? `已发现品种 ${discoveredBreedCount} 种。` : '',
          fishPondStore.pond.built && fishPondStore.pond.breeding ? '当前有繁育组合正在进行，可留意跨周产出。' : ''
        ])
        recommendedRouteIds = []
        break
      }
      case 'ws11_museum_focus_summary': {
        const themeFocusLabel =
          museumStore.crossSystemOverview.themeWeekFocus?.summaryLabel ?? museumStore.crossSystemOverview.themeWeekFocus?.name ?? ''
        const museumHeadline =
          museumStore.crossSystemOverview.recommendedActions[0] || (themeFocusLabel ? themeFocusLabel : def.description)
        const renderedContent = renderGuidanceSummaryContent(
          museumStore.crossSystemOverview.featuredScholarCommissions.length > 0 ? 'ws11_museum_commission' : 'ws11_museum_theme_focus',
          {
            museumHeadline,
            commissionCount: museumStore.crossSystemOverview.featuredScholarCommissions.length,
            museumBoardHint: museumStore.crossSystemOverview.questBoardBiasProfile.boardHint || '',
            supportNpcSummary:
              museumStore.crossSystemOverview.supportNpcOverview.length > 0
                ? `馆务协力：${museumStore.crossSystemOverview.supportNpcOverview.slice(0, 2).map(npc => npc.name).join('、')}`
                : ''
          },
          def.description,
          []
        )
        active = Boolean(
          themeFocusLabel ||
          museumStore.crossSystemOverview.recommendedActions.length > 0 ||
          museumStore.crossSystemOverview.featuredScholarCommissions.length > 0
        )
        priority = museumStore.crossSystemOverview.featuredScholarCommissions.length > 0 ? 84 : museumStore.crossSystemOverview.recommendedActions.length > 0 ? 72 : 0
        headline = renderedContent.headline || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_guild_season_summary': {
        const recommendedAction = guildStore.crossSystemOverview.recommendedActions[0] ?? ''
        const featuredActivityTitles = guildStore.featuredSeasonActivities.slice(0, 2).map(activity => activity.title)
        active = Boolean(recommendedAction || guildStore.claimableGoals.length > 0 || featuredActivityTitles.length > 0)
        priority = guildStore.claimableGoals.length > 0 ? 84 : recommendedAction ? 76 : featuredActivityTitles.length > 0 ? 64 : 0
        headline = recommendedAction || def.description
        detailLines = dedupeStrings([
          guildStore.claimableGoals.length > 0 ? `当前可领取 ${guildStore.claimableGoals.length} 个公会目标奖励。` : '',
          featuredActivityTitles.length > 0 ? `赛季重点：${featuredActivityTitles.join('、')}` : '',
          guildStore.activeRewardPoolOverview?.label ? `奖励池：${guildStore.activeRewardPoolOverview.label}` : ''
        ])
        recommendedRouteIds = []
        break
      }
      case 'ws11_hanhai_cycle_summary': {
        const recommendedAction = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
        active = Boolean(hanhaiStore.cycleOverview.unlocked && (recommendedAction || hanhaiStore.cycleOverview.totalRelicClears > 0))
        priority = recommendedAction ? 86 : hanhaiStore.cycleOverview.totalRelicClears > 0 ? 70 : 0
        headline =
          recommendedAction ||
          `瀚海当前阶段：${({ P0: '开拓期', P1: '扩张期', P2: '深耕期' } as const)[hanhaiStore.cycleOverview.progressTier] ?? '开拓期'}`
        detailLines = dedupeStrings([
          `遗迹总通关 ${hanhaiStore.cycleOverview.totalRelicClears} 次。`,
          hanhaiStore.cycleOverview.activeInvestmentCount > 0 ? `已投资商路 ${hanhaiStore.cycleOverview.activeInvestmentCount} 条。` : '',
          hanhaiStore.betsRemaining > 0 ? `今日赌场剩余 ${hanhaiStore.betsRemaining} 次机会。` : ''
        ])
        recommendedRouteIds = []
        break
      }
      case 'ws11_npc_companion_summary': {
        const relationshipOverview = npcStore.getFamilyWishOverview()
        const relationshipSnapshot = npcStore.getRelationshipDebugSnapshot()
        const activeWish = relationshipOverview.defs.find(defItem => defItem.id === relationshipOverview.state.activeWishId) ?? null
        active = Boolean(activeWish || relationshipSnapshot.zhijiCompanionProjects.length > 0 || relationshipSnapshot.childCount > 0)
        priority = activeWish ? 84 : relationshipSnapshot.zhijiCompanionProjects.length > 0 ? 72 : relationshipSnapshot.childCount > 0 ? 60 : 0
        headline = activeWish
          ? `当前家庭心愿：${activeWish.title}`
          : relationshipSnapshot.zhijiCompanionProjects.length > 0
            ? `当前有 ${relationshipSnapshot.zhijiCompanionProjects.length} 个知己协作项目在推进。`
            : def.description
        detailLines = dedupeStrings([
          activeWish ? `进度 ${relationshipOverview.state.progress}/${Math.max(1, relationshipOverview.state.targetValue)}。` : '',
          relationshipSnapshot.zhijiCompanionProjects.length > 0 ? `知己项目数：${relationshipSnapshot.zhijiCompanionProjects.length}` : '',
          relationshipSnapshot.childCount > 0 ? `当前孩子数量：${relationshipSnapshot.childCount}` : ''
        ])
        recommendedRouteIds = []
        break
      }
      case 'ws11_shop_route_summary': {
        const recommendedOffers = shopStore.recommendedCatalogOffers.slice(0, 2).map(offer => offer.name)
        const routeLabels = shopStore.marketDynamicsOverview.recommendedRouteLabels.slice(0, 2)
        const renderedContent = renderGuidanceSummaryContent(
          routeLabels.length > 0 ? 'ws11_shop_market_route' : 'ws11_shop_catalog_offer',
          {
            routeLabels: routeLabels.join('、'),
            offerNames: recommendedOffers.join('、'),
            hotspotLabels: shopStore.marketDynamicsOverview.hotspotCategoryLabels.slice(0, 2).join('、'),
            phaseLabel: shopStore.marketDynamicsOverview.phaseLabel
          },
          def.description,
          []
        )
        active = Boolean(recommendedOffers.length > 0 || routeLabels.length > 0 || shopStore.marketDynamicsOverview.hotspotCount > 0)
        priority = routeLabels.length > 0 ? 90 : recommendedOffers.length > 0 ? 76 : 0
        headline = renderedContent.headline || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_mail_digest_summary': {
        const mailTemplateTitles = goalOverview.mailTemplateTitles.slice(0, 3)
        const renderedContent = renderGuidanceSummaryContent(
          'ws11_mail_campaign_digest',
          {
            mailTemplateCount: mailTemplateTitles.length,
            campaignCadence: goalOverview.currentEventCampaign?.cadence ?? '',
            mailTemplateTitles: mailTemplateTitles.join('、'),
            activityDescription: activityOverview.activeCampaign?.description ?? ''
          },
          def.description,
          []
        )
        active = Boolean(mailTemplateTitles.length > 0 || activityOverview.activeCampaign)
        priority = mailTemplateTitles.length > 0 ? 68 : activityOverview.activeCampaign ? 60 : 0
        headline = renderedContent.headline || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      case 'ws11_top_goals_digest': {
        const themeWeekLabel = goalOverview.currentThemeWeek?.summaryLabel ?? goalOverview.currentThemeWeek?.name ?? ''
        const goalTitles = goalOverview.themeWeekGoalTitles.slice(0, 3)
        const renderedContent = renderGuidanceSummaryContent(
          themeWeekLabel ? 'ws11_top_goals_theme_week' : 'ws11_top_goals_event_campaign',
          {
            themeWeekLabel,
            eventLabel: goalOverview.currentEventCampaign?.label ?? '',
            goalTitles: goalTitles.join('、'),
            eventDescription: goalOverview.currentEventCampaign?.description ?? '',
            sinkNames: goalOverview.recommendedEconomySinks.slice(0, 2).map(sink => sink.name).join('、')
          },
          def.description,
          []
        )
        active = Boolean(themeWeekLabel || goalTitles.length > 0 || goalOverview.currentEventCampaign)
        priority = goalTitles.length > 0 ? 80 : themeWeekLabel ? 72 : 0
        headline = renderedContent.headline || def.description
        detailLines = dedupeStrings(renderedContent.detailLines)
        recommendedRouteIds = renderedContent.linkedRouteIds.filter(routeId => activeGuidanceRouteIdSet.value.has(routeId))
        break
      }
      default:
        break
    }

    if (!isGuidanceTierUnlocked(guidanceTier.value, def.unlockTier)) {
      active = false
      priority = 0
      headline = def.description
      detailLines = []
      recommendedRouteIds = []
    }

    return {
      ...def,
      active,
      priority,
      status: guidanceDigestState.value.dismissedSummaryIds.includes(def.id)
        ? 'dismissed'
        : guidanceDigestState.value.adoptedSummaryIds.includes(def.id)
          ? 'adopted'
          : 'fresh',
      headline,
      detailLines: detailLines.slice(0, Math.max(1, guidanceDisplayConfig.maxDetailLineCount)),
      recommendedRouteIds
    }
  }

  const guidancePanelSummaryStates = computed<GuidancePanelSummaryState[]>(() =>
    guidancePanelSummaryDefs
      .map(resolveGuidanceSummaryState)
      .filter(summary => isGuidanceTierUnlocked(guidanceTier.value, summary.unlockTier))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.title.localeCompare(b.title)
      })
  )

  const activeGuidanceSummaryIds = computed(() =>
    guidancePanelSummaryStates.value.filter(summary => summary.active).map(summary => summary.id)
  )
  const currentGuidanceDigestKey = computed(() =>
    [
      goalStore.uiGuidanceSourceOverview.currentDayTag,
      goalStore.uiGuidanceSourceOverview.currentThemeWeek?.id ?? 'none',
      goalStore.uiGuidanceSourceOverview.currentEventCampaign?.id ?? 'none',
      ...activeGuidanceSummaryIds.value,
      '--',
      ...activeGuidanceRouteIds.value
    ].join('|')
  )

  const guidanceSurfaceSnapshots = computed<GuidanceSurfaceSnapshot[]>(() =>
    GUIDANCE_SURFACE_IDS.map(surfaceId => {
      if (!guidanceFeatureFlags.surfaceDigestPanelEnabled) {
        return createEmptyGuidanceSurfaceSnapshot(surfaceId, guidanceTier.value)
      }
      const summaryStates = guidancePanelSummaryStates.value.filter(summary => summary.surfaceId === surfaceId)
      const routeStates = guidanceRecommendationRouteStates.value
        .filter(route => route.surfaceId === surfaceId)
        .slice(0, Math.max(1, guidanceDisplayConfig.maxRouteCountPerSurface))
      const primarySummary = summaryStates.find(summary => summary.active) ?? summaryStates[0] ?? null
      const surfaceState = getGuidanceSurfaceState(surfaceId)
      return {
        surfaceId,
        unlockTier: guidanceTier.value,
        headline: primarySummary?.headline ?? '',
        primarySummaryId: primarySummary?.id ?? null,
        summaryStates,
        routeStates,
        activeSummaryCount: summaryStates.filter(summary => summary.active).length,
        activeRouteCount: routeStates.filter(route => route.active).length,
        hasFreshContent:
          surfaceState.lastViewedDigestKey !== currentGuidanceDigestKey.value &&
          (
            summaryStates.some(summary => summary.active && summary.status === 'fresh') ||
            routeStates.some(route => route.active && route.status === 'available')
          ),
        lastViewedDayTag: surfaceState.lastViewedDayTag
      }
    })
  )

  const guidanceCrossSystemOverview = computed<GuidanceCrossSystemOverview>(() => {
    if (!guidanceFeatureFlags.crossSystemLoopEnabled) {
      return {
        activeSurfaceIds: [],
        linkedSystems: [],
        sourceSummaryIds: [],
        weeklyDecisionLoop: []
      }
    }
    const activeSurfaceIds = guidanceSurfaceSnapshots.value
      .filter(snapshot => snapshot.activeSummaryCount > 0 || snapshot.activeRouteCount > 0)
      .map(snapshot => snapshot.surfaceId)
    const activeSummaryStates = guidancePanelSummaryStates.value.filter(summary => summary.active)
    const linkedSystems = [...new Set(activeSummaryStates.flatMap(summary => summary.linkedSystems))]
    const sourceSummaryIds = activeSummaryStates
      .filter(summary => summary.recommendedRouteIds.length > 0)
      .map(summary => summary.id)
    const weeklyDecisionLoop = WS11_GUIDANCE_LOOP_LINK_DEFS
      .map(def => {
        const routeState = guidanceRecommendationRouteStates.value.find(route => route.id === def.routeId)
        if (!routeState?.active) return null
        const targetSnapshot = guidanceSurfaceSnapshots.value.find(snapshot => snapshot.surfaceId === def.targetSurfaceId)
        const targetHeadline = targetSnapshot?.headline || routeState.summary
        return {
          id: def.id,
          routeId: def.routeId,
          sourceSurfaceId: def.sourceSurfaceId,
          targetSurfaceId: def.targetSurfaceId,
          label: routeState.label,
          summary: formatGuidanceTemplate(def.summaryTemplate, { targetHeadline, routeSummary: routeState.summary }),
          targetHeadline,
          linkedSystems: def.linkedSystems,
          adopted: routeState.status === 'adopted'
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .slice(0, Math.max(1, guidanceDisplayConfig.maxLoopActionCount))

    return {
      activeSurfaceIds,
      linkedSystems,
      sourceSummaryIds,
      weeklyDecisionLoop
    }
  })

  const guidanceNeedsRefresh = computed(() => {
    const goalOverview = goalStore.uiGuidanceSourceOverview
    const activeSummaryIds = activeGuidanceSummaryIds.value
    const activeRouteIds = activeGuidanceRouteIds.value
    return (
      guidanceDigestState.value.lastRefreshDayTag !== goalOverview.currentDayTag ||
      guidanceDigestState.value.currentThemeWeekId !== (goalOverview.currentThemeWeek?.id ?? null) ||
      guidanceDigestState.value.currentCampaignId !== (goalOverview.currentEventCampaign?.id ?? null) ||
      activeSummaryIds.length !== guidanceDigestState.value.activeSummaryIds.length ||
      activeSummaryIds.some((id, index) => guidanceDigestState.value.activeSummaryIds[index] !== id) ||
      activeRouteIds.length !== guidanceDigestState.value.activeRouteIds.length ||
      activeRouteIds.some((id, index) => guidanceDigestState.value.activeRouteIds[index] !== id)
    )
  })

  const uiGuidanceOverview = computed(() => ({
    baselineAudit: uiGuidanceBaselineAudit,
    enabled: enabled.value,
    currentTier: guidanceTier.value,
    shownTipCount: shownTipIds.value.length,
    visitedPanelCount: visitedPanels.value.length,
    activeFlagCount: Object.values(flags.value).filter(Boolean).length,
    activeGuidanceLockCount: guidanceActionLocks.value.length,
    activeSummaryCount: activeGuidanceSummaryIds.value.length,
    activeRouteCount: activeGuidanceRouteIds.value.length,
    guidanceNeedsRefresh: guidanceNeedsRefresh.value,
    tuning: guidanceTuning,
    currentThemeWeekId: goalStore.uiGuidanceSourceOverview.currentThemeWeek?.id ?? null,
    currentEventCampaignId: goalStore.uiGuidanceSourceOverview.currentEventCampaign?.id ?? null,
    currentLimitedTimeQuestCampaignId: questStore.currentLimitedTimeQuestCampaign?.id ?? null,
    goalSourceOverview: goalStore.uiGuidanceSourceOverview,
    crossSystemOverview: guidanceCrossSystemOverview.value,
    surfaceSnapshots: guidanceSurfaceSnapshots.value,
    guidanceDigestState: guidanceDigestState.value
  }))

  const getGuidancePanelSummaries = (surfaceId?: GuidanceSurfaceId) =>
    guidancePanelSummaryDefs.filter(def => !surfaceId || def.surfaceId === surfaceId)

  const getGuidancePanelSummaryStates = (surfaceId?: GuidanceSurfaceId) =>
    guidancePanelSummaryStates.value.filter(summary => !surfaceId || summary.surfaceId === surfaceId)

  const getGuidancePanelSummaryState = (summaryId: string) =>
    guidancePanelSummaryStates.value.find(summary => summary.id === summaryId) ?? null

  const getGuidanceRecommendationRouteStates = (surfaceId?: GuidanceSurfaceId) =>
    guidanceRecommendationRouteStates.value.filter(route => !surfaceId || route.surfaceId === surfaceId)

  const getGuidanceRecommendationRouteState = (routeId: string) =>
    guidanceRecommendationRouteStates.value.find(route => route.id === routeId) ?? null

  const getGuidanceSurfaceSnapshot = (surfaceId: GuidanceSurfaceId) =>
    guidanceSurfaceSnapshots.value.find(snapshot => snapshot.surfaceId === surfaceId) ??
    createEmptyGuidanceSurfaceSnapshot(surfaceId, guidanceTier.value)

  const markGuidanceSurfaceViewed = (surfaceId: GuidanceSurfaceId, dayTag = goalStore.uiGuidanceSourceOverview.currentDayTag) => {
    if (!guidanceFeatureFlags.surfaceViewTrackingEnabled) return false
    const lockId = `guidance_view_${surfaceId}_${dayTag}`
    if (!beginGuidanceAction(lockId)) return false
    const snapshot = createGuidanceDigestSnapshot()
    try {
      markPanelVisited(surfaceId)
      guidanceDigestState.value.lastViewedSurfaceId = surfaceId
      updateGuidanceSurfaceState(surfaceId, state => ({
        ...state,
        lastViewedDayTag: dayTag,
        lastViewedDigestKey: currentGuidanceDigestKey.value,
        viewedCount: state.viewedCount + 1
      }))
      return true
    } catch {
      rollbackGuidanceAction(snapshot)
      return false
    } finally {
      finishGuidanceAction(lockId)
    }
  }

  const markGuidanceSummaryDismissed = (summaryId: string, surfaceId?: GuidanceSurfaceId) => {
    const lockId = `guidance_dismiss_${summaryId}`
    if (!beginGuidanceAction(lockId)) return false
    const snapshot = createGuidanceDigestSnapshot()
    try {
      if (guidanceDigestState.value.dismissedSummaryIds.includes(summaryId)) return false
      const resolvedSurfaceId = surfaceId ?? guidancePanelSummaryDefs.find(def => def.id === summaryId)?.surfaceId
      guidanceDigestState.value.dismissedSummaryIds = [...guidanceDigestState.value.dismissedSummaryIds, summaryId]
      if (resolvedSurfaceId) {
        updateGuidanceSurfaceState(resolvedSurfaceId, state => ({
          ...state,
          lastInteractedSummaryId: summaryId
        }))
      }
      return true
    } catch {
      rollbackGuidanceAction(snapshot)
      return false
    } finally {
      finishGuidanceAction(lockId)
    }
  }

  const markGuidanceSummaryAdopted = (summaryId: string, surfaceId?: GuidanceSurfaceId) => {
    const lockId = `guidance_adopt_summary_${summaryId}`
    if (!beginGuidanceAction(lockId)) return false
    const snapshot = createGuidanceDigestSnapshot()
    try {
      if (guidanceDigestState.value.adoptedSummaryIds.includes(summaryId)) return false
      const resolvedSurfaceId = surfaceId ?? guidancePanelSummaryDefs.find(def => def.id === summaryId)?.surfaceId
      guidanceDigestState.value.adoptedSummaryIds = [...guidanceDigestState.value.adoptedSummaryIds, summaryId]
      guidanceDigestState.value.dismissedSummaryIds = guidanceDigestState.value.dismissedSummaryIds.filter(id => id !== summaryId)
      const relatedRouteIds = guidancePanelSummaryStates.value.find(summary => summary.id === summaryId)?.recommendedRouteIds ?? []
      if (guidanceFeatureFlags.summaryAutoRouteSyncEnabled && relatedRouteIds.length > 0) {
        guidanceDigestState.value.adoptedRouteIds = [
          ...new Set([...guidanceDigestState.value.adoptedRouteIds, ...relatedRouteIds])
        ]
      }
      if (resolvedSurfaceId) {
        updateGuidanceSurfaceState(resolvedSurfaceId, state => ({
          ...state,
          lastInteractedSummaryId: summaryId,
          lastAdoptedRouteId: relatedRouteIds[0] ?? state.lastAdoptedRouteId
        }))
      }
      return true
    } catch {
      rollbackGuidanceAction(snapshot)
      return false
    } finally {
      finishGuidanceAction(lockId)
    }
  }

  const markGuidanceRouteAdopted = (routeId: string, surfaceId?: GuidanceSurfaceId) => {
    const lockId = `guidance_adopt_route_${routeId}`
    if (!beginGuidanceAction(lockId)) return false
    const snapshot = createGuidanceDigestSnapshot()
    try {
      if (guidanceDigestState.value.adoptedRouteIds.includes(routeId)) return false
      const resolvedSurfaceId = surfaceId ?? guidanceRecommendationRoutes.find(route => route.id === routeId)?.surfaceId
      guidanceDigestState.value.adoptedRouteIds = [...guidanceDigestState.value.adoptedRouteIds, routeId]
      const relatedSummaryId = guidancePanelSummaryStates.value.find(
        summary => summary.surfaceId === (resolvedSurfaceId ?? summary.surfaceId) && summary.recommendedRouteIds.includes(routeId)
      )?.id
      if (guidanceFeatureFlags.routeAutoSummarySyncEnabled && relatedSummaryId && !guidanceDigestState.value.adoptedSummaryIds.includes(relatedSummaryId)) {
        guidanceDigestState.value.adoptedSummaryIds = [...guidanceDigestState.value.adoptedSummaryIds, relatedSummaryId]
        guidanceDigestState.value.dismissedSummaryIds = guidanceDigestState.value.dismissedSummaryIds.filter(id => id !== relatedSummaryId)
      }
      if (resolvedSurfaceId) {
        updateGuidanceSurfaceState(resolvedSurfaceId, state => ({
          ...state,
          lastAdoptedRouteId: routeId
        }))
      }
      return true
    } catch {
      rollbackGuidanceAction(snapshot)
      return false
    } finally {
      finishGuidanceAction(lockId)
    }
  }

  const refreshGuidanceDigest = (
    dayTag = goalStore.uiGuidanceSourceOverview.currentDayTag,
    themeWeekId = goalStore.uiGuidanceSourceOverview.currentThemeWeek?.id ?? null,
    campaignId = goalStore.uiGuidanceSourceOverview.currentEventCampaign?.id ?? null
  ) => {
    const lockId = `guidance_refresh_${dayTag}_${themeWeekId ?? 'none'}_${campaignId ?? 'none'}`
    if (!beginGuidanceAction(lockId)) return false
    const snapshot = createGuidanceDigestSnapshot()
    try {
      guidanceDigestState.value = {
        ...guidanceDigestState.value,
        version: Math.max(2, Number(guidanceDigestState.value.version) || 2),
        activeSummaryIds: [...activeGuidanceSummaryIds.value],
        activeRouteIds: [...activeGuidanceRouteIds.value],
        lastRefreshDayTag: dayTag,
        currentThemeWeekId: themeWeekId,
        currentCampaignId: campaignId
      }
      return true
    } catch {
      rollbackGuidanceAction(snapshot)
      return false
    } finally {
      finishGuidanceAction(lockId)
    }
  }

  const ensureGuidanceDigestFresh = () => {
    if (!guidanceNeedsRefresh.value) return false
    return refreshGuidanceDigest()
  }

  const getGuidanceDebugSnapshot = (): GuidanceDebugSnapshot => ({
    currentTier: guidanceTier.value,
    currentDayTag: goalStore.uiGuidanceSourceOverview.currentDayTag,
    activeSummaryIds: [...activeGuidanceSummaryIds.value],
    activeRouteIds: [...activeGuidanceRouteIds.value],
    lastRefreshDayTag: guidanceDigestState.value.lastRefreshDayTag,
    currentThemeWeekId: guidanceDigestState.value.currentThemeWeekId,
    currentCampaignId: guidanceDigestState.value.currentCampaignId,
    lastViewedSurfaceId: guidanceDigestState.value.lastViewedSurfaceId,
    surfaceStates: guidanceDigestState.value.surfaceStates.map(state => ({ ...state }))
  })

  const getGuidanceOperationDebugSnapshot = () => ({
    activeLockIds: [...guidanceActionLocks.value],
    activeSummaryIds: [...guidanceDigestState.value.activeSummaryIds],
    activeRouteIds: [...guidanceDigestState.value.activeRouteIds],
    adoptedSummaryIds: [...guidanceDigestState.value.adoptedSummaryIds],
    adoptedRouteIds: [...guidanceDigestState.value.adoptedRouteIds]
  })

  const isTipShown = (id: string) => shownTipIds.value.includes(id)
  const markTipShown = (id: string) => {
    if (!shownTipIds.value.includes(id)) shownTipIds.value.push(id)
  }
  const hasPanelVisited = (panel: string) => visitedPanels.value.includes(panel)
  const markPanelVisited = (panel: string) => {
    if (!visitedPanels.value.includes(panel)) visitedPanels.value.push(panel)
  }
  const setFlag = (key: string, val: boolean = true) => {
    flags.value[key] = val
  }
  const getFlag = (key: string) => flags.value[key] ?? false

  const serialize = () => ({
    enabled: enabled.value,
    shownTipIds: shownTipIds.value,
    visitedPanels: visitedPanels.value,
    flags: flags.value,
    guidanceDigestState: guidanceDigestState.value
  })

  const deserialize = (data: any) => {
    enabled.value = data?.enabled ?? true
    shownTipIds.value = normalizeStringArray(data?.shownTipIds)
    visitedPanels.value = normalizeStringArray(data?.visitedPanels)
    guidanceActionLocks.value = []
    flags.value =
      data?.flags && typeof data.flags === 'object'
        ? Object.fromEntries(Object.entries(data.flags).map(([key, value]) => [key, Boolean(value)]))
        : {}
    guidanceDigestState.value = (() => {
      const raw = data?.guidanceDigestState
      const fallback = createDefaultGuidanceDigestState()
      if (!raw || typeof raw !== 'object') return fallback
      return {
        version: Math.max(fallback.version, Number(raw.version) || fallback.version),
        activeSummaryIds: normalizeStringArray(raw.activeSummaryIds),
        activeRouteIds: normalizeStringArray(raw.activeRouteIds),
        dismissedSummaryIds: normalizeStringArray(raw.dismissedSummaryIds),
        adoptedSummaryIds: normalizeStringArray(raw.adoptedSummaryIds),
        adoptedRouteIds: normalizeStringArray(raw.adoptedRouteIds),
        lastRefreshDayTag: typeof raw.lastRefreshDayTag === 'string' ? raw.lastRefreshDayTag : '',
        currentThemeWeekId: typeof raw.currentThemeWeekId === 'string' ? raw.currentThemeWeekId : null,
        currentCampaignId: typeof raw.currentCampaignId === 'string' ? raw.currentCampaignId : null,
        lastViewedSurfaceId: isGuidanceSurfaceId(raw.lastViewedSurfaceId) ? raw.lastViewedSurfaceId : null,
        surfaceStates: Array.isArray(raw.surfaceStates)
          ? sortGuidanceSurfaceStates(
              (raw.surfaceStates as unknown[])
                .map(normalizeGuidanceSurfaceState)
                .filter((state): state is GuidanceSurfaceDigestState => state !== null)
            )
          : []
      }
    })()
  }

  return {
    enabled,
    uiGuidanceBaselineAudit,
    uiGuidanceOverview,
    guidanceTuning,
    guidanceFeatureFlags,
    guidanceDisplayConfig,
    guidanceOperationConfig,
    guidanceTier,
    guidanceNeedsRefresh,
    guidanceCrossSystemOverview,
    guidanceActionLocks,
    guidanceDigestState,
    guidancePanelSummaryDefs,
    guidancePanelSummaryStates,
    guidanceRecommendationRoutes,
    guidanceRecommendationRouteStates,
    guidanceSurfaceSnapshots,
    shownTipIds,
    visitedPanels,
    flags,
    isTipShown,
    markTipShown,
    hasPanelVisited,
    markPanelVisited,
    getGuidanceSurfaceState,
    getGuidancePanelSummaries,
    getGuidancePanelSummaryStates,
    getGuidancePanelSummaryState,
    getGuidanceRecommendationRouteStates,
    getGuidanceRecommendationRouteState,
    getGuidanceSurfaceSnapshot,
    markGuidanceSurfaceViewed,
    markGuidanceSummaryDismissed,
    markGuidanceSummaryAdopted,
    markGuidanceRouteAdopted,
    refreshGuidanceDigest,
    ensureGuidanceDigestFresh,
    getGuidanceDebugSnapshot,
    getGuidanceOperationDebugSnapshot,
    setFlag,
    getFlag,
    serialize,
    deserialize
  }
})
