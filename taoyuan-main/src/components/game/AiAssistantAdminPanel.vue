<template>
  <div class="ai-admin-panel" :class="{ 'ai-admin-panel--scrollable': scrollable }">
    <div v-if="store.isLoadingAdmin" class="ai-admin-panel__loading">AI 管理配置加载中...</div>
    <template v-else>
      <div class="ai-admin-panel__toolbar">
        <div>
          <p class="ai-admin-panel__label">配置编辑</p>
          <p class="text-[0.6875rem] text-muted leading-5" data-testid="ai-admin-dirty-state">
            {{ isConfigDirty ? `有 ${configDiffRows.length} 项未保存改动` : '当前表单与最近加载配置一致' }}
          </p>
        </div>
        <button class="btn" :disabled="store.isLoadingAdmin" @click="void loadPanelData()">
          <RefreshCw :size="12" />
          <span>{{ store.isLoadingAdmin ? '刷新中...' : '刷新' }}</span>
        </button>
      </div>

      <div class="ai-admin-panel__subnav" role="tablist" aria-label="AI 助手管理">
        <button
          type="button"
          class="btn"
          data-testid="ai-admin-subnav-config"
          :class="{ '!bg-accent !text-bg': activeAdminPanelPage === 'config' }"
          role="tab"
          :aria-selected="activeAdminPanelPage === 'config'"
          @click="setAiAdminPanelPage('config')"
        >
          <Settings2 :size="12" />
          <span>配置</span>
        </button>
        <button
          type="button"
          class="btn"
          data-testid="ai-admin-subnav-knowledge"
          :class="{ '!bg-accent !text-bg': activeAdminPanelPage === 'knowledge' }"
          role="tab"
          :aria-selected="activeAdminPanelPage === 'knowledge'"
          @click="setAiAdminPanelPage('knowledge')"
        >
          <BookOpen :size="12" />
          <span>知识库</span>
        </button>
      </div>

      <template v-if="activeAdminPanelPage === 'config'">
      <div class="ai-admin-panel__group">
        <p class="ai-admin-panel__label">功能开关</p>
        <div class="ai-admin-panel__row">
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.enabled }" @click="store.adminConfig.enabled = true">开启</button>
          <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.enabled }" @click="store.adminConfig.enabled = false">关闭</button>
        </div>
      </div>

      <div class="ai-admin-panel__group">
        <p class="ai-admin-panel__label">回答模式</p>
        <div class="ai-admin-panel__row">
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.mode === 'strict' }" @click="store.adminConfig.mode = 'strict'">
            严格模式
          </button>
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.mode === 'standard' }" @click="store.adminConfig.mode = 'standard'">
            标准模式
          </button>
        </div>
      </div>

      <div class="ai-admin-panel__group">
        <p class="ai-admin-panel__label">源码能力</p>
        <div class="ai-admin-panel__row">
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.sourceReadEnabled }" @click="store.adminConfig.sourceReadEnabled = true">
            允许读取源码
          </button>
          <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.sourceReadEnabled }" @click="store.adminConfig.sourceReadEnabled = false">
            禁止读取源码
          </button>
        </div>
        <div class="ai-admin-panel__row">
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.sourceIngestEnabled }" @click="store.adminConfig.sourceIngestEnabled = true">
            生成源码候选草稿
          </button>
          <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.sourceIngestEnabled }" @click="store.adminConfig.sourceIngestEnabled = false">
            不自动沉淀候选
          </button>
        </div>
      </div>

      <div v-if="!isManagedReadonly('ai_assistant_name')" class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">助手名称</label>
          <span data-testid="ai-admin-char-count-assistant-name">{{ store.adminConfig.assistantName.length }}/20</span>
        </div>
        <p class="text-[0.6875rem] text-muted leading-5">展示在玩家侧小助理标题和欢迎语称呼中。</p>
        <input
          v-model="store.adminConfig.assistantName"
          class="ai-admin-panel__input"
          maxlength="20"
        />
      </div>

      <div v-if="!isManagedReadonly('ai_assistant_welcome')" class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">欢迎语</label>
          <span data-testid="ai-admin-char-count-welcome">{{ store.adminConfig.welcomeMessage.length }}/300</span>
        </div>
        <p class="text-[0.6875rem] text-muted leading-5">首次打开面板时展示；应说明助手能看玩家可见状态、回答依据和严格模式边界。</p>
        <textarea
          v-model="store.adminConfig.welcomeMessage"
          rows="3"
          class="ai-admin-panel__textarea"
          maxlength="300"
        />
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">模型 API 地址</label>
        <input v-model="store.adminConfig.apiUrl" class="ai-admin-panel__input" placeholder="如：https://api.example.com/v1" />
      </div>

      <div class="ai-admin-panel__group grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <label class="ai-admin-panel__label">模型名称</label>
          <input v-model="store.adminConfig.model" class="ai-admin-panel__input" placeholder="如：gpt-4o-mini" />
        </div>
        <div>
          <label class="ai-admin-panel__label">温度</label>
          <input v-model.number="store.adminConfig.temperature" type="number" min="0" max="1.5" step="0.1" class="ai-admin-panel__input" />
        </div>
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">API Key</label>
        <p class="text-[0.6875rem] text-muted leading-5">{{ apiKeyStatusText }}</p>
        <input
          v-model="store.adminConfig.apiKey"
          type="password"
          class="ai-admin-panel__input"
          placeholder="留空保持不变，输入新 Key 后保存"
          :disabled="store.adminConfig.apiKeyClearRequested"
        />
        <div class="ai-admin-panel__row !justify-end">
          <button class="btn" :class="{ '!bg-danger !text-bg': store.adminConfig.apiKeyClearRequested }" @click="toggleApiKeyClear">
            {{ store.adminConfig.apiKeyClearRequested ? '取消清空' : '显式清空 Key' }}
          </button>
        </div>
      </div>

      <div class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">系统提示词</label>
          <span data-testid="ai-admin-char-count-system-prompt">{{ store.adminConfig.systemPrompt.length }}/1500</span>
        </div>
        <p class="text-[0.6875rem] text-muted leading-5">仅用于管理端配置远程模型的行为约束，公开问答仍会经过 strict guard 和 evidence 校验。</p>
        <textarea v-model="store.adminConfig.systemPrompt" rows="4" class="ai-admin-panel__textarea" maxlength="1500" />
      </div>

      <div class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">额外屏蔽主题（每行一条）</label>
          <span data-testid="ai-admin-char-count-blocked-topics">{{ blockedTopicLineCount }} 行</span>
        </div>
        <textarea v-model="store.adminConfig.blockedTopics" rows="4" class="ai-admin-panel__textarea" placeholder="例如：隐藏 boss&#10;内部数值" />
      </div>

      <div class="ai-admin-panel__section" data-testid="ai-admin-config-preview">
        <div class="ai-admin-panel__section-header">
          <div>
            <p class="ai-admin-panel__label">玩家侧预览</p>
            <p class="text-[0.6875rem] text-muted leading-5">保存前先核对玩家能看到的名称、欢迎语和来源状态。</p>
          </div>
          <span class="ai-admin-panel__status" :class="{ 'ai-admin-panel__status--dirty': isConfigDirty }">
            {{ isConfigDirty ? '未保存' : '已同步' }}
          </span>
        </div>
        <div class="ai-admin-preview-card">
          <div class="ai-admin-preview-card__header">
            <span>{{ store.adminConfig.assistantName || '桃源小助理' }}</span>
            <span>{{ modeLabel }} · {{ providerStatusText }}</span>
          </div>
          <p>{{ store.adminConfig.welcomeMessage || '暂无欢迎语' }}</p>
          <div class="ai-admin-preview-card__meta">
            <span>{{ store.adminConfig.enabled ? '已开启' : '已关闭' }}</span>
            <span>{{ store.adminConfig.sourceReadEnabled ? '管理端可读源码' : '公开问答不读源码' }}</span>
            <span>{{ apiKeyStatusText }}</span>
          </div>
        </div>
      </div>

      <div v-if="configDiffRows.length" class="ai-admin-panel__section" data-testid="ai-admin-config-diff">
        <div class="ai-admin-panel__section-header">
          <p class="ai-admin-panel__label">待保存差异</p>
          <span class="text-[0.6875rem] text-muted">{{ configDiffRows.length }} 项</span>
        </div>
        <div class="ai-admin-diff-list">
          <div v-for="row in configDiffRows" :key="row.key" class="ai-admin-diff-row">
            <span>{{ row.label }}</span>
            <small>{{ row.before }}</small>
            <strong>{{ row.after }}</strong>
          </div>
        </div>
      </div>

      <div class="ai-admin-panel__section" data-testid="ai-admin-test-question">
        <div class="ai-admin-panel__section-header">
          <div>
            <p class="ai-admin-panel__label">测试问答</p>
            <p class="text-[0.6875rem] text-muted leading-5">用当前管理配置发起 debug 问答；结果只展示回答、provider、mode 和公开来源摘要。</p>
          </div>
        </div>
        <textarea
          v-model="testQuestion"
          rows="2"
          class="ai-admin-panel__textarea"
          maxlength="240"
          placeholder="例如：我今天该做什么？"
        />
        <div class="ai-admin-panel__row !justify-end">
          <button class="btn" :disabled="isTestingQuestion || !testQuestion.trim()" @click="void runTestQuestion()">
            <Send :size="12" />
            <span>{{ isTestingQuestion ? '测试中...' : '发送测试' }}</span>
          </button>
        </div>
        <div v-if="testQuestionError" class="text-xs text-danger leading-6">{{ testQuestionError }}</div>
        <div v-if="testQuestionResult" class="ai-admin-test-result">
          <div class="ai-admin-preview-card__header">
            <span>{{ getProviderLabel(testQuestionResult.provider) }}</span>
            <span>{{ testQuestionResult.mode === 'standard' ? '标准模式' : '严格模式' }}</span>
          </div>
          <p>{{ testQuestionResult.answer || '无回答内容' }}</p>
          <div v-if="testQuestionResult.evidence.length" class="ai-admin-preview-card__meta">
            <span v-for="item in testQuestionResult.evidence.slice(0, 3)" :key="item.id">{{ item.title }}</span>
          </div>
        </div>
      </div>

      <div class="ai-admin-panel__footer">
        <p class="text-[0.6875rem] text-muted">若未配置 API 地址和模型名，系统会自动退回内置知识库回答。</p>
        <div class="ai-admin-panel__row !justify-end">
          <button class="btn" type="button" @click="openKnowledgeAdminPage">
            <BookOpen :size="12" />
            <span>知识库页面</span>
          </button>
          <button class="btn" type="button" :disabled="store.isSavingAdmin" @click="void saveAdminConfig()">
            <Settings2 :size="12" />
            <span>{{ store.isSavingAdmin ? '保存中...' : '保存配置' }}</span>
          </button>
        </div>
      </div>
      </template>

      <AiAssistantKnowledgeAdminPanel v-else />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { BookOpen, RefreshCw, Send, Settings2 } from 'lucide-vue-next'
  import AiAssistantKnowledgeAdminPanel from '@/components/game/AiAssistantKnowledgeAdminPanel.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { useAiAssistantStore } from '@/stores/useAiAssistantStore'
  import { askAiAssistantDebug } from '@/utils/taoyuanAiApi'
  import type {
    AiAssistantAdminConfig,
    AiAssistantAskResult,
    AiAssistantProvider,
  } from '@/types'

  const props = withDefaults(
    defineProps<{
      scrollable?: boolean
      autoLoad?: boolean
    }>(),
    {
      scrollable: false,
      autoLoad: true,
    }
  )

  const store = useAiAssistantStore()
  const route = useRoute()
  const router = useRouter()
  type ConfigComparable = Record<string, string>
  type AiAdminPanelPage = 'config' | 'knowledge'
  type DiffRow = {
    key: string
    label: string
    before: string
    after: string
  }

  const loadedConfigComparable = ref<ConfigComparable | null>(null)
  const activeAdminPanelPage = ref<AiAdminPanelPage>('config')
  const testQuestion = ref('我今天该做什么？')
  const testQuestionResult = ref<AiAssistantAskResult | null>(null)
  const testQuestionError = ref('')
  const isTestingQuestion = ref(false)
  const readonlyManagedFieldSet = computed(() => new Set(store.adminConfig.readonlyManagedFields || []))
  const apiKeySourceLabel = computed(() => {
    if (store.adminConfig.apiKeySource === 'env') return '环境变量'
    if (store.adminConfig.apiKeySource === 'runtime') return '本进程新 Key'
    if (store.adminConfig.apiKeySource === 'metadata') return '已迁移状态'
    return '未配置'
  })
  const apiKeyStatusText = computed(() => {
    if (!store.adminConfig.apiKeyConfigured) return '当前：未配置'
    const masked = store.adminConfig.apiKeyMasked || (store.adminConfig.apiKeyLast4 ? `****${store.adminConfig.apiKeyLast4}` : '已配置')
    return `当前：${masked} · 来源：${apiKeySourceLabel.value}`
  })
  const modeLabel = computed(() => store.adminConfig.mode === 'standard' ? '标准模式' : '严格模式')
  const providerStatusText = computed(() => (
    store.adminConfig.apiUrl.trim() && store.adminConfig.model.trim()
      ? '远程模型可用'
      : '内置知识库 fallback'
  ))
  const blockedTopicLineCount = computed(() => (
    store.adminConfig.blockedTopics
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean).length
  ))

  const isManagedReadonly = (key: 'ai_assistant_name' | 'ai_assistant_welcome') => {
    return readonlyManagedFieldSet.value.has(key)
  }

  const normalizeAiAdminPanelPage = (value: unknown): AiAdminPanelPage => (
    String(value || '') === 'knowledge' ? 'knowledge' : 'config'
  )

  const setAiAdminPanelPage = (page: AiAdminPanelPage) => {
    activeAdminPanelPage.value = page
    const nextQuery = { ...route.query, tab: 'ai' } as Record<string, string | string[] | undefined>
    delete nextQuery.mode
    delete nextQuery.username
    if (page === 'knowledge') {
      nextQuery.ai_panel = 'knowledge'
    } else {
      delete nextQuery.ai_panel
    }
    void router.replace({ path: '/admin', query: nextQuery })
  }

  const clipPreview = (value: unknown, maxLength = 72) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim()
    if (!text) return '空'
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }

  const getApiKeyComparableState = (config: AiAssistantAdminConfig) => {
    if (config.apiKeyClearRequested) return '显式清空'
    if (config.apiKey.trim()) return '写入新 Key'
    return '保持不变'
  }

  const buildConfigComparable = (config: AiAssistantAdminConfig): ConfigComparable => ({
    enabled: config.enabled ? '开启' : '关闭',
    mode: config.mode === 'standard' ? '标准模式' : '严格模式',
    sourceReadEnabled: config.sourceReadEnabled ? '允许读取源码' : '禁止读取源码',
    sourceIngestEnabled: config.sourceIngestEnabled ? '生成源码候选' : '不自动沉淀',
    assistantName: clipPreview(config.assistantName, 40),
    welcomeMessage: clipPreview(config.welcomeMessage, 80),
    apiUrl: clipPreview(config.apiUrl, 80),
    apiKeyState: getApiKeyComparableState(config),
    model: clipPreview(config.model, 60),
    temperature: String(config.temperature),
    systemPrompt: clipPreview(config.systemPrompt, 80),
    blockedTopics: clipPreview(config.blockedTopics, 80),
  })

  const configDiffLabels: Record<string, string> = {
    enabled: '功能开关',
    mode: '回答模式',
    sourceReadEnabled: '源码读取',
    sourceIngestEnabled: '源码候选',
    assistantName: '助手名称',
    welcomeMessage: '欢迎语',
    apiUrl: '模型 API 地址',
    apiKeyState: 'API Key 动作',
    model: '模型名称',
    temperature: '温度',
    systemPrompt: '系统提示词',
    blockedTopics: '额外屏蔽主题',
  }

  const captureAdminConfigBaseline = () => {
    loadedConfigComparable.value = buildConfigComparable(store.adminConfig)
  }

  const configDiffRows = computed<DiffRow[]>(() => {
    const baseline = loadedConfigComparable.value
    if (!baseline) return []
    const current = buildConfigComparable(store.adminConfig)
    return Object.keys(configDiffLabels)
      .filter(key => baseline[key] !== current[key])
      .map(key => ({
        key,
        label: configDiffLabels[key] || key,
        before: baseline[key] || '空',
        after: current[key] || '空',
      }))
  })
  const isConfigDirty = computed(() => configDiffRows.value.length > 0)

  const getProviderLabel = (provider: AiAssistantProvider) => {
    if (provider === 'model') return '远程模型'
    if (provider === 'fallback') return 'fallback'
    if (provider === 'guard') return '安全保护'
    return '内置知识库'
  }

  const saveAdminConfig = async () => {
    const saved = await store.saveAdminConfig()
    if (saved) {
      captureAdminConfigBaseline()
    }
  }

  const toggleApiKeyClear = () => {
    store.adminConfig.apiKeyClearRequested = !store.adminConfig.apiKeyClearRequested
    if (store.adminConfig.apiKeyClearRequested) {
      store.adminConfig.apiKey = ''
    }
  }

  const openKnowledgeAdminPage = () => {
    setAiAdminPanelPage('knowledge')
  }

  const runTestQuestion = async () => {
    const question = testQuestion.value.trim()
    if (!question) return
    isTestingQuestion.value = true
    testQuestionError.value = ''
    testQuestionResult.value = null
    try {
      testQuestionResult.value = await askAiAssistantDebug({
        question,
        routeName: 'admin-ai',
        contextLabel: 'AI 管理配置预览',
      })
    } catch (error) {
      testQuestionError.value = error instanceof Error ? error.message : 'AI 测试问答失败'
      showFloat(testQuestionError.value, 'danger')
    } finally {
      isTestingQuestion.value = false
    }
  }

  const loadPanelData = async () => {
    await store.loadAdminConfig()
    captureAdminConfigBaseline()
  }

  onMounted(() => {
    if (props.autoLoad) {
      void loadPanelData()
    } else {
      captureAdminConfigBaseline()
    }
  })

  watch(
    () => route.query.ai_panel,
    value => {
      activeAdminPanelPage.value = normalizeAiAdminPanelPage(value)
    },
    { immediate: true }
  )
</script>

<style scoped>
  .ai-admin-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ai-admin-panel--scrollable {
    overflow-y: auto;
    padding-right: 4px;
  }

  .ai-admin-panel__footer,
  .ai-admin-panel__toolbar,
  .ai-admin-panel__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-admin-panel__toolbar {
    padding: 10px 12px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(200, 164, 92, 0.06);
  }

  .ai-admin-panel__subnav {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-admin-panel__input,
  .ai-admin-panel__textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgb(var(--color-bg));
    color: rgb(var(--color-text));
    border: 1px solid rgba(200, 164, 92, 0.25);
    border-radius: 2px;
    outline: none;
    font-size: 0.75rem;
    box-sizing: border-box;
  }

  .ai-admin-panel__input:focus,
  .ai-admin-panel__textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .ai-admin-panel__textarea {
    resize: vertical;
    min-height: 76px;
  }

  .ai-admin-panel__group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ai-admin-panel__section,
  .ai-admin-panel__section--nested {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(26, 26, 26, 0.14);
  }

  .ai-admin-panel__section--nested {
    padding: 10px;
    background: rgba(255, 255, 255, 0.025);
  }

  .ai-admin-panel__section-header,
  .ai-admin-panel__field-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .ai-admin-panel__field-header span,
  .ai-admin-panel__status {
    font-size: 0.6875rem;
    line-height: 1.25rem;
    color: rgb(var(--color-muted));
  }

  .ai-admin-panel__status {
    padding: 2px 8px;
    border: 1px solid rgba(72, 146, 95, 0.3);
    background: rgba(72, 146, 95, 0.12);
    color: rgb(var(--color-text));
  }

  .ai-admin-panel__status--dirty {
    border-color: rgba(248, 209, 122, 0.36);
    background: rgba(248, 209, 122, 0.1);
  }

  .ai-admin-panel__label {
    font-size: 0.75rem;
    color: rgb(var(--color-text));
    opacity: 0.8;
  }

  .ai-admin-preview-card,
  .ai-admin-test-result {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(200, 164, 92, 0.16);
    background: rgba(0, 0, 0, 0.16);
    font-size: 0.75rem;
    line-height: 1.5;
    color: rgb(var(--color-text));
  }

  .ai-admin-preview-card__header,
  .ai-admin-preview-card__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-admin-preview-card__header span:last-child,
  .ai-admin-preview-card__meta {
    font-size: 0.6875rem;
    color: rgb(var(--color-muted));
  }

  .ai-admin-preview-card__meta span {
    padding: 2px 6px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(255, 255, 255, 0.03);
  }

  .ai-admin-diff-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-admin-diff-row {
    display: grid;
    grid-template-columns: minmax(82px, 0.35fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    font-size: 0.6875rem;
    line-height: 1.35rem;
  }

  .ai-admin-diff-row small,
  .ai-admin-diff-row strong {
    min-width: 0;
    overflow-wrap: anywhere;
    padding: 6px;
    border: 1px solid rgba(200, 164, 92, 0.12);
    background: rgba(255, 255, 255, 0.03);
    font-weight: 400;
  }

  .ai-admin-diff-row strong {
    color: rgb(var(--color-text));
  }

  .ai-admin-panel__loading {
    padding: 24px 0;
    text-align: center;
    font-size: 0.75rem;
    color: rgb(var(--color-text));
    opacity: 0.72;
  }

  @media (max-width: 640px) {
    .ai-admin-diff-row {
      grid-template-columns: 1fr;
    }
  }
</style>
