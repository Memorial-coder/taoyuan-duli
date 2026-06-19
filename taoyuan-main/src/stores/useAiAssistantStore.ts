import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { showFloat } from '@/composables/useGameLog'
import { buildAiAssistantLocalDraft } from '@/utils/aiAssistantLocalDraft'
import { AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE } from '@/utils/aiAssistantQuickQuestions'
import { askAiAssistantDebug, askAiAssistantStream, fetchAiAssistantAdminConfig, fetchAiAssistantConfig, isAiAssistantAbortError, saveAiAssistantAdminConfig, verifyAiAssistantAdminAccess } from '@/utils/taoyuanAiApi'
import type {
  AiAssistantAdminConfig,
  AiAssistantAnimalContext,
  AiAssistantBuildingContext,
  AiAssistantContextSnapshot,
  AiAssistantFarmingContext,
  AiAssistantInventoryContext,
  AiAssistantLateGameContext,
  AiAssistantMessage,
  AiAssistantOnlineContext,
  AiAssistantPublicConfig,
  AiAssistantQuestContext,
  AiAssistantStreamEvent,
} from '@/types'

const createId = () => `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const defaultPublicConfig = (): AiAssistantPublicConfig => ({
  enabled: true,
  mode: 'strict',
  assistantName: '桃源小助理',
  welcomeMessage: AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE,
  consoleCreditMessage:
    '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186',
  providerConfigured: false,
})

const defaultAdminConfig = (): AiAssistantAdminConfig => ({
  ...defaultPublicConfig(),
  sourceReadEnabled: false,
  sourceIngestEnabled: false,
  sourceIndexStatus: undefined,
  nounLexiconStatus: undefined,
  apiUrl: '',
  apiKey: '',
  apiKeyConfigured: false,
  apiKeyLast4: '',
  apiKeyMasked: '',
  apiKeySource: 'none',
  apiKeyClearRequested: false,
  model: '',
  temperature: 0.2,
  systemPrompt: '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
  blockedTopics: '',
  officialManagedStatus: undefined,
  readonlyManagedFields: [],
})

const AI_CONTEXT_TIME_PERIOD_LABELS: Record<string, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜晚',
  late_night: '深夜',
}

const AI_CONTEXT_SENSITIVE_TEXT_PATTERN = /(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌|后台规则|风控|隐藏掉率|完整源码|server[\\/]+src|process\.env)/i
const AI_ASSISTANT_LOCAL_DRAFT_DELAY_MS = 900

type AiAssistantAskContextInput = {
  routeName?: string
  contextLabel?: string
  contextSnapshot?: AiAssistantContextSnapshot
}

type AiAssistantContextSnapshotV2Input = {
  routeName?: unknown
  routeLabel?: unknown
  year?: unknown
  season?: unknown
  seasonLabel?: unknown
  day?: unknown
  weather?: unknown
  weatherLabel?: unknown
  hour?: unknown
  timeDisplay?: unknown
  timePeriod?: unknown
  timePeriodLabel?: unknown
  stamina?: unknown
  maxStamina?: unknown
  money?: unknown
  weeklyPlan?: {
    planId?: unknown
    weekId?: unknown
    primaryRouteLabel?: unknown
    primaryRouteSummary?: unknown
    secondaryRouteLabels?: unknown
    secondaryRouteSummaries?: unknown
    claimableNodeLabels?: unknown
    nextWeekPrepSummary?: unknown
    sourceLabels?: unknown
  }
  inventory?: Partial<Record<keyof AiAssistantInventoryContext, unknown>>
  farming?: Partial<Record<keyof AiAssistantFarmingContext, unknown>>
  animals?: Partial<Record<keyof AiAssistantAnimalContext, unknown>>
  buildings?: Partial<Record<keyof AiAssistantBuildingContext, unknown>>
  quests?: Partial<Record<keyof AiAssistantQuestContext, unknown>>
  lateGame?: Partial<Record<keyof AiAssistantLateGameContext, unknown>>
  online?: Partial<Record<keyof AiAssistantOnlineContext, unknown>>
  legacy?: Partial<AiAssistantContextSnapshot>
}

const normalizeAiContextText = (value: unknown, maxLength = 80) => {
  if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return undefined
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  if (AI_CONTEXT_SENSITIVE_TEXT_PATTERN.test(text)) return undefined
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const normalizeAiContextNumber = (value: unknown) => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const normalizeAiContextInteger = (value: unknown) => {
  const numberValue = normalizeAiContextNumber(value)
  return numberValue === undefined ? undefined : Math.floor(numberValue)
}

const normalizeAiContextList = (value: unknown, maxItems = 4, maxLength = 60) => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(item => normalizeAiContextText(item, maxLength)).filter((item): item is string => Boolean(item)))]
    .slice(0, maxItems)
}

export const buildAiAssistantContextSnapshotV2 = (input: AiAssistantContextSnapshotV2Input = {}): AiAssistantContextSnapshot => {
  const legacy = input.legacy ?? {}
  const weeklyPlan = input.weeklyPlan ?? {}
  const inventory = input.inventory ?? {}
  const farming = input.farming ?? {}
  const animals = input.animals ?? {}
  const buildings = input.buildings ?? {}
  const quests = input.quests ?? {}
  const lateGame = input.lateGame ?? {}
  const online = input.online ?? {}
  const timePeriod = normalizeAiContextText(input.timePeriod, 40)
  const timePeriodLabel = normalizeAiContextText(input.timePeriodLabel, 40) || (timePeriod ? AI_CONTEXT_TIME_PERIOD_LABELS[timePeriod] : undefined)
  const year = normalizeAiContextInteger(input.year)
  const day = normalizeAiContextInteger(input.day)
  const hour = normalizeAiContextNumber(input.hour)
  const stamina = normalizeAiContextInteger(input.stamina)
  const maxStamina = normalizeAiContextInteger(input.maxStamina)
  const money = normalizeAiContextInteger(input.money)
  const seasonLabel = normalizeAiContextText(input.seasonLabel || input.season, 40)
  const weatherLabel = normalizeAiContextText(input.weatherLabel || input.weather, 40)
  const dateLabel = year !== undefined && day !== undefined && seasonLabel
    ? `第${year}年 ${seasonLabel} 第${day}天`
    : undefined

  const normalizedWeeklyPlan = {
    planId: normalizeAiContextText(weeklyPlan.planId ?? legacy.weeklyPlanId, 100),
    weekId: normalizeAiContextText(weeklyPlan.weekId, 80),
    primaryRouteLabel: normalizeAiContextText(weeklyPlan.primaryRouteLabel ?? legacy.primaryRouteLabel, 80),
    primaryRouteSummary: normalizeAiContextText(weeklyPlan.primaryRouteSummary, 160),
    secondaryRouteLabels: normalizeAiContextList(weeklyPlan.secondaryRouteLabels ?? legacy.secondaryRouteLabels, 3, 60),
    secondaryRouteSummaries: normalizeAiContextList(weeklyPlan.secondaryRouteSummaries, 2, 120),
    claimableNodeLabels: normalizeAiContextList(weeklyPlan.claimableNodeLabels ?? legacy.claimableNodeLabels, 4, 80),
    nextWeekPrepSummary: normalizeAiContextText(weeklyPlan.nextWeekPrepSummary ?? legacy.nextWeekPrepSummary, 180),
    sourceLabels: normalizeAiContextList(weeklyPlan.sourceLabels, 4, 60),
  }
  const normalizedInventory = {
    slotUsageLabel: normalizeAiContextText(inventory.slotUsageLabel, 80),
    keyResourceLabels: normalizeAiContextList(inventory.keyResourceLabels, 5, 60),
    shortageLabels: normalizeAiContextList(inventory.shortageLabels, 5, 80),
    toolLevelLabels: normalizeAiContextList(inventory.toolLevelLabels, 7, 40),
    pendingToolUpgradeLabel: normalizeAiContextText(inventory.pendingToolUpgradeLabel, 80),
  }
  const normalizedFarming = {
    plotStatusLabel: normalizeAiContextText(farming.plotStatusLabel, 100),
    harvestableLabels: normalizeAiContextList(farming.harvestableLabels, 4, 60),
    waterRiskLabels: normalizeAiContextList(farming.waterRiskLabels, 4, 60),
    seasonRiskLabels: normalizeAiContextList(farming.seasonRiskLabels, 4, 80),
    greenhouseLabel: normalizeAiContextText(farming.greenhouseLabel, 80),
  }
  const normalizedAnimals = {
    buildingLabels: normalizeAiContextList(animals.buildingLabels, 4, 50),
    animalStatusLabel: normalizeAiContextText(animals.animalStatusLabel, 100),
    productLabels: normalizeAiContextList(animals.productLabels, 4, 80),
    careAlertLabels: normalizeAiContextList(animals.careAlertLabels, 4, 80),
  }
  const normalizedBuildings = {
    farmhouseLabel: normalizeAiContextText(buildings.farmhouseLabel, 80),
    greenhouseLabel: normalizeAiContextText(buildings.greenhouseLabel, 80),
    animalBuildingLabels: normalizeAiContextList(buildings.animalBuildingLabels, 4, 50),
    villageProjectLabel: normalizeAiContextText(buildings.villageProjectLabel, 100),
    availableProjectLabels: normalizeAiContextList(buildings.availableProjectLabels, 4, 60),
  }
  const normalizedQuests = {
    mainQuestLabel: normalizeAiContextText(quests.mainQuestLabel, 100),
    mainQuestObjectiveLabels: normalizeAiContextList(quests.mainQuestObjectiveLabels, 4, 90),
    activeQuestLabels: normalizeAiContextList(quests.activeQuestLabels, 4, 90),
    boardQuestLabels: normalizeAiContextList(quests.boardQuestLabels, 3, 90),
    specialOrderLabel: normalizeAiContextText(quests.specialOrderLabel, 100),
    limitedTimeQuestLabel: normalizeAiContextText(quests.limitedTimeQuestLabel, 100),
    claimableLabels: normalizeAiContextList(quests.claimableLabels, 5, 80),
    blockerLabels: normalizeAiContextList(quests.blockerLabels, 5, 90),
    shortageLabels: normalizeAiContextList(quests.shortageLabels, 5, 80),
  }
  const normalizedLateGame = {
    fishPondLabel: normalizeAiContextText(lateGame.fishPondLabel, 120),
    fishPondAlertLabels: normalizeAiContextList(lateGame.fishPondAlertLabels, 4, 80),
    breedingLabel: normalizeAiContextText(lateGame.breedingLabel, 120),
    breedingAlertLabels: normalizeAiContextList(lateGame.breedingAlertLabels, 4, 80),
    museumLabel: normalizeAiContextText(lateGame.museumLabel, 120),
    museumAlertLabels: normalizeAiContextList(lateGame.museumAlertLabels, 4, 80),
    guildLabel: normalizeAiContextText(lateGame.guildLabel, 120),
    guildAlertLabels: normalizeAiContextList(lateGame.guildAlertLabels, 4, 80),
    hanhaiLabel: normalizeAiContextText(lateGame.hanhaiLabel, 120),
    hanhaiAlertLabels: normalizeAiContextList(lateGame.hanhaiAlertLabels, 4, 80),
  }
  const normalizedOnline = {
    saveSyncLabel: normalizeAiContextText(online.saveSyncLabel, 120),
    mailboxLabel: normalizeAiContextText(online.mailboxLabel, 100),
    mailClaimableLabels: normalizeAiContextList(online.mailClaimableLabels, 4, 70),
    hallLabel: normalizeAiContextText(online.hallLabel, 120),
    festivalRoomLabel: normalizeAiContextText(online.festivalRoomLabel, 120),
    coopOrderLabel: normalizeAiContextText(online.coopOrderLabel, 120),
    coopCompensationLabel: normalizeAiContextText(online.coopCompensationLabel, 100),
    cohabitationLabel: normalizeAiContextText(online.cohabitationLabel, 120),
    societyLabel: normalizeAiContextText(online.societyLabel, 120),
    onlineAlertLabels: normalizeAiContextList(online.onlineAlertLabels, 5, 80),
  }

  return {
    contextVersion: 2,
    version: 2,
    baseState: {
      currentRouteName: normalizeAiContextText(input.routeName, 60),
      currentPageLabel: normalizeAiContextText(input.routeLabel, 80),
      year,
      season: normalizeAiContextText(input.season, 40),
      seasonLabel,
      day,
      dateLabel,
      weather: normalizeAiContextText(input.weather, 40),
      weatherLabel,
      hour,
      timeLabel: normalizeAiContextText(input.timeDisplay, 40),
      timePeriod,
      timePeriodLabel,
      stamina,
      maxStamina,
      staminaLabel: stamina !== undefined && maxStamina !== undefined ? `${stamina}/${maxStamina}` : undefined,
      money,
      moneyLabel: money !== undefined ? `${money}文` : undefined,
    },
    weeklyPlan: normalizedWeeklyPlan,
    inventory: normalizedInventory,
    farming: normalizedFarming,
    animals: normalizedAnimals,
    buildings: normalizedBuildings,
    quests: normalizedQuests,
    lateGame: normalizedLateGame,
    online: normalizedOnline,
    weeklyPlanId: normalizedWeeklyPlan.planId,
    currentThemeWeekId: normalizeAiContextText(legacy.currentThemeWeekId, 100),
    currentThemeWeekLabel: normalizeAiContextText(legacy.currentThemeWeekLabel, 80),
    currentEventCampaignId: normalizeAiContextText(legacy.currentEventCampaignId, 100),
    currentEventCampaignLabel: normalizeAiContextText(legacy.currentEventCampaignLabel, 80),
    currentLimitedQuestCampaignId: normalizeAiContextText(legacy.currentLimitedQuestCampaignId, 100),
    currentLimitedQuestLabel: normalizeAiContextText(legacy.currentLimitedQuestLabel, 80),
    primaryRouteLabel: normalizedWeeklyPlan.primaryRouteLabel,
    secondaryRouteLabels: normalizedWeeklyPlan.secondaryRouteLabels,
    claimableNodeLabels: normalizedWeeklyPlan.claimableNodeLabels,
    nextWeekPrepSummary: normalizedWeeklyPlan.nextWeekPrepSummary,
    activeFamilyWishId: normalizeAiContextText(legacy.activeFamilyWishId, 100),
    activeFamilyWishTitle: normalizeAiContextText(legacy.activeFamilyWishTitle, 80),
    bondedSpiritId: normalizeAiContextText(legacy.bondedSpiritId, 100),
    bondedSpiritName: normalizeAiContextText(legacy.bondedSpiritName, 80),
    highlightedRouteLabels: normalizeAiContextList(legacy.highlightedRouteLabels, 4, 60),
    previewMailTitles: normalizeAiContextList(legacy.previewMailTitles, 4, 60),
  }
}

export const useAiAssistantStore = defineStore('aiAssistant', () => {
  const isOpen = ref(false)
  const isLoadingConfig = ref(false)
  const isAsking = ref(false)
  const activeAskRequestId = ref(0)
  const isCheckingAdmin = ref(false)
  const isLoadingAdmin = ref(false)
  const isSavingAdmin = ref(false)
  const publicConfig = ref<AiAssistantPublicConfig>(defaultPublicConfig())
  const adminConfig = ref<AiAssistantAdminConfig>(defaultAdminConfig())
  const messages = ref<AiAssistantMessage[]>([])
  let activeAskController: AbortController | null = null
  let activeAskPendingId = ''
  let activeAskRetryQuestion = ''
  let activeLocalDraftTimer: ReturnType<typeof setTimeout> | null = null

  const isAdmin = ref(false)

  const canRender = computed(() => publicConfig.value.enabled || isAdmin.value || isCheckingAdmin.value)

  const appendWelcomeMessage = () => {
    if (messages.value.length > 0) return
    messages.value.push({
      id: createId(),
      role: 'assistant',
      content: publicConfig.value.welcomeMessage,
      createdAt: Date.now(),
      richStatic: true,
    })
  }

  const loadConfig = async ({ appendWelcome = true }: { appendWelcome?: boolean } = {}) => {
    isLoadingConfig.value = true
    try {
      publicConfig.value = await fetchAiAssistantConfig()
      if (appendWelcome && !messages.value.length && (publicConfig.value.enabled || isAdmin.value)) {
        appendWelcomeMessage()
      }
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '获取 AI 助手配置失败', 'danger')
    } finally {
      isLoadingConfig.value = false
    }
  }

  const verifyAdminAccess = async () => {
    isCheckingAdmin.value = true
    try {
      isAdmin.value = await verifyAiAssistantAdminAccess()
    } catch {
      isAdmin.value = false
    } finally {
      isCheckingAdmin.value = false
    }
  }

  const openPanel = async () => {
    isOpen.value = true
    await verifyAdminAccess()
    await loadConfig()
    if (!publicConfig.value.enabled && !isAdmin.value) return
    if (!messages.value.length && (publicConfig.value.enabled || isAdmin.value)) appendWelcomeMessage()
  }

  const clearActiveLocalDraftTimer = () => {
    if (activeLocalDraftTimer === null) return
    clearTimeout(activeLocalDraftTimer)
    activeLocalDraftTimer = null
  }

  const scheduleLocalDraft = ({
    requestId,
    pendingId,
    question,
    context,
    abortController,
  }: {
    requestId: number
    pendingId: string
    question: string
    context: AiAssistantAskContextInput
    abortController: AbortController
  }) => {
    clearActiveLocalDraftTimer()
    activeLocalDraftTimer = setTimeout(() => {
      activeLocalDraftTimer = null
      if (
        activeAskRequestId.value !== requestId
        || activeAskController !== abortController
        || abortController.signal.aborted
      ) {
        return
      }

      const pendingIndex = messages.value.findIndex(message => message.id === pendingId && message.pending)
      if (pendingIndex < 0) return
      if (messages.value.some(message => message.localDraft && message.draftForPendingId === pendingId)) return

      const draftMessage: AiAssistantMessage = {
        id: createId(),
        role: 'assistant',
        content: buildAiAssistantLocalDraft({
          question,
          routeName: context.routeName,
          contextLabel: context.contextLabel,
          contextSnapshot: context.contextSnapshot,
        }),
        createdAt: Date.now(),
        provider: 'local',
        mode: publicConfig.value.mode,
        localDraft: true,
        draftForPendingId: pendingId,
      }

      messages.value = [
        ...messages.value.slice(0, pendingIndex),
        draftMessage,
        ...messages.value.slice(pendingIndex),
      ]
    }, AI_ASSISTANT_LOCAL_DRAFT_DELAY_MS)
  }

  const isCurrentAskRequest = (requestId: number, abortController: AbortController) => (
    activeAskRequestId.value === requestId
    && activeAskController === abortController
    && !abortController.signal.aborted
  )

  const removeLocalDraftForPending = (pendingId: string) => {
    if (!pendingId) return
    messages.value = messages.value.filter(message => !(message.localDraft && message.draftForPendingId === pendingId))
  }

  const shouldHideLocalDraftForResult = (provider?: string) => provider === 'model'

  const applyAskStreamEvent = ({
    event,
    requestId,
    pendingId,
    abortController,
  }: {
    event: AiAssistantStreamEvent
    requestId: number
    pendingId: string
    abortController: AbortController
  }) => {
    if (!isCurrentAskRequest(requestId, abortController)) return

    if (event.event === 'phase') {
      messages.value = messages.value.map(message =>
        message.id === pendingId && message.pending
          ? {
              ...message,
              streamPhase: event.phase,
              streamPhaseLabel: event.label,
              streamPhaseDetail: event.detail,
            }
          : message
      )
      return
    }

    if (event.event === 'delta') {
      const delta = event.delta || ''
      if (!delta) return
      clearActiveLocalDraftTimer()
      messages.value = messages.value.map(message =>
        message.id === pendingId && (message.pending || message.streaming)
          ? {
              ...message,
              content: `${message.content || ''}${delta}`,
              pending: false,
              streaming: true,
              streamPhase: 'answering',
              streamPhaseLabel: '正在生成回答',
              streamPhaseDetail: '已收到流式文本，完整来源会在结束后补齐。',
            }
          : message
      )
      return
    }

    if (event.event === 'evidence') {
      if (shouldHideLocalDraftForResult(event.provider)) {
        removeLocalDraftForPending(pendingId)
      }
      messages.value = messages.value.map(message =>
        message.id === pendingId && (message.pending || message.streaming)
          ? {
              ...message,
              sources: event.sources,
              evidence: event.evidence,
              suggestions: event.suggestions,
              traceSummary: event.traceSummary,
              mode: event.mode,
              provider: event.provider,
            }
          : message
      )
    }
  }

  const cancelActiveQuestion = (options: { keepMessage?: boolean } = {}) => {
    const controller = activeAskController
    if (!controller) return false
    clearActiveLocalDraftTimer()
    const pendingId = activeAskPendingId
    const retryQuestion = activeAskRetryQuestion
    activeAskController = null
    activeAskPendingId = ''
    activeAskRetryQuestion = ''
    activeAskRequestId.value += 1
    isAsking.value = false
    controller.abort()

    if (options.keepMessage !== false && pendingId) {
      messages.value = messages.value.map(message =>
        message.id === pendingId && (message.pending || message.streaming)
          ? {
              ...message,
              content: message.content ? `${message.content}\n\n已取消生成。` : '已取消生成。',
              pending: false,
              streaming: false,
              error: true,
              cancelled: true,
              retryQuestion,
            }
          : message
      )
    }
    return true
  }

  const closePanel = () => {
    cancelActiveQuestion({ keepMessage: true })
    isOpen.value = false
  }

  const togglePanel = async () => {
    if (isOpen.value) {
      closePanel()
      return
    }
    await openPanel()
  }

  const resetConversation = () => {
    cancelActiveQuestion({ keepMessage: false })
    messages.value = []
    if (publicConfig.value.enabled || isAdmin.value) appendWelcomeMessage()
  }

  const askQuestion = async (question: string, context: AiAssistantAskContextInput = {}) => {
    const trimmed = question.trim()
    if (!trimmed) return
    if (!publicConfig.value.enabled) {
      showFloat('AI 助手当前已关闭', 'danger')
      return
    }
    if (isAsking.value) {
      showFloat('AI 助手正在整理上一条回答，请稍后再试。', 'danger')
      return
    }

    const requestId = activeAskRequestId.value + 1
    activeAskRequestId.value = requestId
    isAsking.value = true
    const abortController = new AbortController()
    activeAskController = abortController

    messages.value.push({
      id: createId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    })

    const pendingId = createId()
    const pendingStartedAt = Date.now()
    activeAskPendingId = pendingId
    activeAskRetryQuestion = trimmed
    messages.value.push({
      id: pendingId,
      role: 'assistant',
      content: '',
      createdAt: pendingStartedAt,
      pending: true,
      pendingStartedAt,
    })
    scheduleLocalDraft({
      requestId,
      pendingId,
      question: trimmed,
      context,
      abortController,
    })

    try {
      const askPayload = {
        question: trimmed,
        routeName: context.routeName,
        contextLabel: context.contextLabel,
        contextSnapshot: context.contextSnapshot,
        signal: abortController.signal,
      }
      const result = isAdmin.value
        ? await askAiAssistantDebug(askPayload)
        : await askAiAssistantStream(askPayload, {
            onEvent: event => applyAskStreamEvent({
              event,
              requestId,
              pendingId,
              abortController,
            }),
          })
      if (activeAskRequestId.value !== requestId || abortController.signal.aborted) return
      if (shouldHideLocalDraftForResult(result.provider)) {
        removeLocalDraftForPending(pendingId)
      }
      messages.value = messages.value.map(message =>
        message.id === pendingId
          ? {
              ...message,
              content: result.answer,
              sources: result.sources,
              evidence: result.evidence,
              suggestions: result.suggestions,
              traceSummary: result.traceSummary,
              mode: result.mode,
              provider: result.provider,
              trace: result.trace,
              pending: false,
              streaming: false,
            }
          : message
      )
    } catch (error) {
      if (activeAskRequestId.value !== requestId || isAiAssistantAbortError(error) || abortController.signal.aborted) return
      const msg = error instanceof Error ? error.message : 'AI 助手暂时不可用'
      messages.value = messages.value.map(message =>
        message.id === pendingId
          ? {
              ...message,
              content: msg,
              pending: false,
              streaming: false,
              error: true,
              retryQuestion: trimmed,
            }
          : message
      )
    } finally {
      clearActiveLocalDraftTimer()
      if (activeAskController === abortController) {
        activeAskController = null
        activeAskPendingId = ''
        activeAskRetryQuestion = ''
      }
      if (activeAskRequestId.value === requestId) {
        isAsking.value = false
      }
    }
  }

  const loadAdminConfig = async () => {
    await verifyAdminAccess()
    if (!isAdmin.value) return
    isLoadingAdmin.value = true
    try {
      adminConfig.value = await fetchAiAssistantAdminConfig()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '获取 AI 管理配置失败', 'danger')
    } finally {
      isLoadingAdmin.value = false
    }
  }

  const saveAdminConfig = async () => {
    await verifyAdminAccess()
    if (!isAdmin.value) return false
    isSavingAdmin.value = true
    try {
      adminConfig.value = await saveAiAssistantAdminConfig(adminConfig.value)
      publicConfig.value = {
        enabled: adminConfig.value.enabled,
        mode: adminConfig.value.mode,
        assistantName: adminConfig.value.assistantName,
        welcomeMessage: adminConfig.value.welcomeMessage,
        consoleCreditMessage: adminConfig.value.consoleCreditMessage,
        providerConfigured: adminConfig.value.providerConfigured,
      }
      showFloat('AI 助手配置已保存', 'success')
      return true
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '保存 AI 管理配置失败', 'danger')
      return false
    } finally {
      isSavingAdmin.value = false
    }
  }

  return {
    isOpen,
    isLoadingConfig,
    isAsking,
    isCheckingAdmin,
    isLoadingAdmin,
    isSavingAdmin,
    publicConfig,
    adminConfig,
    messages,
    isAdmin,
    canRender,
    loadConfig,
    verifyAdminAccess,
    openPanel,
    closePanel,
    togglePanel,
    resetConversation,
    cancelActiveQuestion,
    askQuestion,
    loadAdminConfig,
    saveAdminConfig,
  }
})
