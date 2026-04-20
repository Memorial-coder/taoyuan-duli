import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { showFloat } from '@/composables/useGameLog'
import { askAiAssistant, fetchAiAssistantAdminConfig, fetchAiAssistantConfig, saveAiAssistantAdminConfig, verifyAiAssistantAdminAccess } from '@/utils/taoyuanAiApi'
import type { AiAssistantAdminConfig, AiAssistantMessage, AiAssistantPublicConfig } from '@/types'

const createId = () => `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const defaultPublicConfig = (): AiAssistantPublicConfig => ({
  enabled: true,
  mode: 'strict',
  assistantName: '桃源小助理',
  welcomeMessage: '你好，我是桃源小助理。你可以问我玩法、系统机制和攻略建议。',
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
  model: '',
  temperature: 0.2,
  systemPrompt: '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
  blockedTopics: '',
  officialManagedStatus: undefined,
  readonlyManagedFields: [],
})

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

  const isAdmin = ref(false)

  const canRender = computed(() => publicConfig.value.enabled || isAdmin.value || isCheckingAdmin.value)

  const appendWelcomeMessage = () => {
    if (messages.value.length > 0) return
    messages.value.push({
      id: createId(),
      role: 'assistant',
      content: publicConfig.value.welcomeMessage,
      createdAt: Date.now(),
    })
  }

  const loadConfig = async () => {
    isLoadingConfig.value = true
    try {
      publicConfig.value = await fetchAiAssistantConfig()
      if (!messages.value.length && (publicConfig.value.enabled || isAdmin.value)) {
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
    if (!publicConfig.value.enabled && !isAdmin.value) return
    if (!messages.value.length) appendWelcomeMessage()
    await loadConfig()
  }

  const closePanel = () => {
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
    messages.value = []
    if (publicConfig.value.enabled || isAdmin.value) appendWelcomeMessage()
  }

  const askQuestion = async (question: string, context: { routeName?: string; contextLabel?: string } = {}) => {
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

    messages.value.push({
      id: createId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    })

    const pendingId = createId()
    messages.value.push({
      id: pendingId,
      role: 'assistant',
      content: '正在整理回答…',
      createdAt: Date.now(),
      pending: true,
    })

    try {
      const result = await askAiAssistant({
        question: trimmed,
        routeName: context.routeName,
        contextLabel: context.contextLabel,
      })
      messages.value = messages.value.map(message =>
        message.id === pendingId
          ? {
              ...message,
              content: result.answer,
              sources: result.sources,
              pending: false,
            }
          : message
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI 助手暂时不可用'
      messages.value = messages.value.map(message =>
        message.id === pendingId
          ? {
              ...message,
              content: msg,
              pending: false,
              error: true,
            }
          : message
      )
    } finally {
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
    askQuestion,
    loadAdminConfig,
    saveAdminConfig,
  }
})
