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

      <div v-if="store.adminConfig.officialManagedStatus" class="text-[0.6875rem] text-muted leading-5">
        当前生效来源：{{ sourceLabel }} · 托管字段：{{ readonlyManagedFieldsText }}
        <div v-if="store.adminConfig.officialManagedStatus.lastError" class="mt-1 text-warning">
          最近回退原因：{{ store.adminConfig.officialManagedStatus.lastError }}
        </div>
      </div>

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

      <div class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">助手名称</label>
          <span data-testid="ai-admin-char-count-assistant-name">{{ store.adminConfig.assistantName.length }}/20</span>
        </div>
        <p class="text-[0.6875rem] text-muted leading-5">展示在玩家侧小助理标题、欢迎语称呼和官方托管 AI 名称预览中。</p>
        <input
          v-model="store.adminConfig.assistantName"
          class="ai-admin-panel__input"
          maxlength="20"
          :disabled="isManagedReadonly('ai_assistant_name')"
          :readonly="isManagedReadonly('ai_assistant_name')"
        />
      </div>

      <div class="ai-admin-panel__group">
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
          :disabled="isManagedReadonly('ai_assistant_welcome')"
          :readonly="isManagedReadonly('ai_assistant_welcome')"
        />
      </div>

      <div class="ai-admin-panel__group">
        <div class="ai-admin-panel__field-header">
          <label class="ai-admin-panel__label">控制台署名文案</label>
          <span data-testid="ai-admin-char-count-console-credit">{{ store.adminConfig.consoleCreditMessage.length }}/1200</span>
        </div>
        <p class="text-[0.6875rem] text-muted leading-5">用于玩家侧控制台/署名展示；官方托管发布会把这一项和助手名称、欢迎语一起纳入 diff。</p>
        <textarea
          v-model="store.adminConfig.consoleCreditMessage"
          rows="3"
          class="ai-admin-panel__textarea"
          maxlength="1200"
          :disabled="isManagedReadonly('ai_assistant_console_credit')"
          :readonly="isManagedReadonly('ai_assistant_console_credit')"
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

      <div class="ai-admin-panel__section" data-testid="ai-admin-official-preview">
        <div class="ai-admin-panel__section-header">
          <div>
            <p class="ai-admin-panel__label">官方托管 AI 文案发布预览</p>
            <p class="text-[0.6875rem] text-muted leading-5">只发布助手名称、欢迎语和控制台署名；首页关于字段会沿用当前官方版本。</p>
          </div>
          <button class="btn" :disabled="officialLoading" @click="void loadOfficialControlData()">
            <RefreshCw :size="12" />
            <span>{{ officialLoading ? '刷新中...' : '刷新云控' }}</span>
          </button>
        </div>

        <div v-if="officialError" class="text-xs text-danger leading-6">{{ officialError }}</div>
        <div v-if="officialUnavailable" class="text-xs text-muted leading-6">{{ officialUnavailable }}</div>

        <div v-if="officialCanLogin" class="ai-admin-official-auth" data-testid="ai-admin-official-second-auth">
          <input
            v-model="officialSecondPassword"
            type="password"
            class="ai-admin-panel__input"
            placeholder="云控二次密码"
            @keydown.enter.prevent="void loginOfficialControl()"
          />
          <button class="btn" :disabled="officialAuthenticating || !officialSecondPassword.trim()" @click="void loginOfficialControl()">
            <Settings2 :size="12" />
            <span>{{ officialAuthenticating ? '验证中...' : '二次验证' }}</span>
          </button>
        </div>

        <template v-if="officialStatus?.secondAuthVerified">
          <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div class="ai-admin-panel__group">
              <div class="ai-admin-panel__field-header">
                <label class="ai-admin-panel__label">托管助手名称</label>
                <span>{{ officialDraft.ai_assistant_name.length }}/80</span>
              </div>
              <input v-model="officialDraft.ai_assistant_name" class="ai-admin-panel__input" maxlength="80" />
            </div>
            <div class="ai-admin-panel__group">
              <div class="ai-admin-panel__field-header">
                <label class="ai-admin-panel__label">发布状态</label>
                <span>{{ currentOfficialRelease ? `v${currentOfficialRelease.version}` : '尚未发布' }}</span>
              </div>
              <button class="btn" @click="loadOfficialDraftFromAdminConfig">
                <RotateCcw :size="12" />
                <span>载入当前配置</span>
              </button>
            </div>
          </div>

          <div class="ai-admin-panel__group">
            <div class="ai-admin-panel__field-header">
              <label class="ai-admin-panel__label">托管欢迎语</label>
              <span>{{ officialDraft.ai_assistant_welcome.length }}/1200</span>
            </div>
            <textarea v-model="officialDraft.ai_assistant_welcome" rows="3" class="ai-admin-panel__textarea" maxlength="1200" />
          </div>

          <div class="ai-admin-panel__group">
            <div class="ai-admin-panel__field-header">
              <label class="ai-admin-panel__label">托管控制台署名</label>
              <span>{{ officialDraft.ai_assistant_console_credit.length }}/1200</span>
            </div>
            <textarea v-model="officialDraft.ai_assistant_console_credit" rows="3" class="ai-admin-panel__textarea" maxlength="1200" />
          </div>

          <div class="ai-admin-preview-card">
            <div class="ai-admin-preview-card__header">
              <span>{{ officialDraft.ai_assistant_name || '桃源小助理' }}</span>
              <span>官方托管预览</span>
            </div>
            <p>{{ officialDraft.ai_assistant_welcome || '暂无欢迎语' }}</p>
            <div class="ai-admin-preview-card__meta">
              <span>{{ previewOfficialConsoleCredit }}</span>
            </div>
          </div>

          <div class="ai-admin-panel__section ai-admin-panel__section--nested" data-testid="ai-admin-official-diff">
            <div class="ai-admin-panel__section-header">
              <p class="ai-admin-panel__label">发布差异</p>
              <span class="text-[0.6875rem] text-muted">{{ officialDiffRows.length }} 项</span>
            </div>
            <div v-if="officialDiffRows.length" class="ai-admin-diff-list">
              <div v-for="row in officialDiffRows" :key="row.key" class="ai-admin-diff-row">
                <span>{{ row.label }}</span>
                <small>{{ row.before }}</small>
                <strong>{{ row.after }}</strong>
              </div>
            </div>
            <p v-else class="text-xs text-muted leading-6">当前托管草稿与最新官方版本一致。</p>
          </div>

          <div class="ai-admin-panel__row !justify-end">
            <button
              class="btn btn-primary"
              data-testid="ai-admin-official-second-confirm"
              :disabled="officialPublishing || officialDiffRows.length === 0"
              @click="void publishOfficialAiDraft()"
            >
              <CloudUpload :size="12" />
              <span>{{ officialPublishing ? '发布中...' : '二次确认并发布' }}</span>
            </button>
          </div>

          <div class="ai-admin-panel__section ai-admin-panel__section--nested" data-testid="ai-admin-official-release-records">
            <div class="ai-admin-panel__section-header">
              <p class="ai-admin-panel__label">发布记录摘要</p>
              <span class="text-[0.6875rem] text-muted">{{ officialReleases.length }} 条</span>
            </div>
            <div v-if="officialReleases.length" class="ai-admin-release-list">
              <button
                v-for="release in officialReleases.slice(0, 5)"
                :key="release.id"
                type="button"
                class="ai-admin-release-card"
                @click="syncOfficialDraftFromRelease(release)"
              >
                <span>v{{ release.version }}</span>
                <small>{{ formatOfficialTime(release.createdAt) }} · {{ summarizeOfficialAiRelease(release) }}</small>
              </button>
            </div>
            <p v-else class="text-xs text-muted leading-6">暂无官方托管发布记录。</p>
          </div>
        </template>
      </div>

      <div class="ai-admin-panel__footer">
        <p class="text-[0.6875rem] text-muted">若未配置 API 地址和模型名，系统会自动退回内置知识库回答。</p>
        <div class="ai-admin-panel__row !justify-end">
          <button class="btn" @click="openKnowledgeAdminPage">
            <BookOpen :size="12" />
            <span>知识库页面</span>
          </button>
          <button class="btn" :disabled="store.isSavingAdmin" @click="void saveAdminConfig()">
            <Settings2 :size="12" />
            <span>{{ store.isSavingAdmin ? '保存中...' : '保存配置' }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { BookOpen, CloudUpload, RefreshCw, RotateCcw, Send, Settings2 } from 'lucide-vue-next'
  import { showFloat } from '@/composables/useGameLog'
  import { useAiAssistantStore } from '@/stores/useAiAssistantStore'
  import { askAiAssistantDebug } from '@/utils/taoyuanAiApi'
  import {
    fetchOfficialControlCurrentConfig,
    fetchOfficialControlPlatformStatus,
    loginOfficialControlSecondAuth,
    publishOfficialControlConfig,
  } from '@/utils/officialControlApi'
  import type {
    AiAssistantAdminConfig,
    AiAssistantAskResult,
    AiAssistantProvider,
    OfficialControlPlatformStatus,
    OfficialControlReleaseRecord,
    OfficialManagedConfigValues,
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
  const router = useRouter()
  type ConfigComparable = Record<string, string>
  type DiffRow = {
    key: string
    label: string
    before: string
    after: string
  }
  type AiOfficialFieldKey = 'ai_assistant_name' | 'ai_assistant_welcome' | 'ai_assistant_console_credit'

  const loadedConfigComparable = ref<ConfigComparable | null>(null)
  const testQuestion = ref('我今天该做什么？')
  const testQuestionResult = ref<AiAssistantAskResult | null>(null)
  const testQuestionError = ref('')
  const isTestingQuestion = ref(false)
  const officialStatus = ref<OfficialControlPlatformStatus | null>(null)
  const currentOfficialRelease = ref<OfficialControlReleaseRecord | null>(null)
  const officialReleases = ref<OfficialControlReleaseRecord[]>([])
  const officialLoading = ref(false)
  const officialAuthenticating = ref(false)
  const officialPublishing = ref(false)
  const officialSecondPassword = ref('')
  const officialError = ref('')
  const officialUnavailable = ref('')
  const officialDraft = ref<Record<AiOfficialFieldKey, string>>({
    ai_assistant_name: '桃源小助理',
    ai_assistant_welcome: '',
    ai_assistant_console_credit: '',
  })
  const managedFieldLabelMap: Record<string, string> = {
    ai_assistant_console_credit: 'AI 控制台署名',
    ai_assistant_name: 'AI 助手名称',
    ai_assistant_welcome: 'AI 欢迎语',
    taoyuan_about_dialog_title: '关于弹窗标题',
    taoyuan_about_dialog_content: '关于弹窗正文',
  }
  const readonlyManagedFieldSet = computed(() => new Set(store.adminConfig.readonlyManagedFields || []))
  const sourceLabel = computed(() => {
    const source = store.adminConfig.officialManagedStatus?.source
    if (source === 'official_live') return '官方实时'
    if (source === 'official_cached') return '官方缓存'
    if (source === 'local_default') return '本地默认'
    return '未知'
  })
  const readonlyManagedFieldsText = computed(() => {
    const fields = store.adminConfig.readonlyManagedFields || []
    return fields.length ? fields.map(field => managedFieldLabelMap[field] || field).join('、') : '无'
  })
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

  const isManagedReadonly = (key: 'ai_assistant_name' | 'ai_assistant_welcome' | 'ai_assistant_console_credit') => {
    return readonlyManagedFieldSet.value.has(key)
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
    consoleCreditMessage: clipPreview(config.consoleCreditMessage, 80),
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
    consoleCreditMessage: '控制台署名',
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
      loadOfficialDraftFromAdminConfig()
    }
  }

  const toggleApiKeyClear = () => {
    store.adminConfig.apiKeyClearRequested = !store.adminConfig.apiKeyClearRequested
    if (store.adminConfig.apiKeyClearRequested) {
      store.adminConfig.apiKey = ''
    }
  }

  const openKnowledgeAdminPage = () => {
    void router.push({ path: '/admin', query: { tab: 'ai' } })
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

  const syncOfficialDraftFromRelease = (release: OfficialControlReleaseRecord | null) => {
    const values = release?.values || {}
    officialDraft.value = {
      ai_assistant_name: String(values.ai_assistant_name || store.adminConfig.assistantName || '桃源小助理'),
      ai_assistant_welcome: String(values.ai_assistant_welcome || store.adminConfig.welcomeMessage || ''),
      ai_assistant_console_credit: String(values.ai_assistant_console_credit || store.adminConfig.consoleCreditMessage || ''),
    }
  }

  const loadOfficialDraftFromAdminConfig = () => {
    officialDraft.value = {
      ai_assistant_name: store.adminConfig.assistantName,
      ai_assistant_welcome: store.adminConfig.welcomeMessage,
      ai_assistant_console_credit: store.adminConfig.consoleCreditMessage,
    }
  }

  const officialFieldLabels: Record<AiOfficialFieldKey, string> = {
    ai_assistant_name: '助手名称',
    ai_assistant_welcome: '欢迎语',
    ai_assistant_console_credit: '控制台署名',
  }
  const officialFieldKeys: AiOfficialFieldKey[] = [
    'ai_assistant_name',
    'ai_assistant_welcome',
    'ai_assistant_console_credit',
  ]
  const officialCanLogin = computed(() => (
    officialStatus.value?.enabled === true
    && officialStatus.value.hostAllowed === true
    && officialStatus.value.secondAuthVerified !== true
  ))
  const previewOfficialConsoleCredit = computed(() => clipPreview(officialDraft.value.ai_assistant_console_credit, 120))
  const officialDiffRows = computed<DiffRow[]>(() => {
    const values = currentOfficialRelease.value?.values || {}
    return officialFieldKeys
      .filter(key => String(values[key] || '') !== String(officialDraft.value[key] || ''))
      .map(key => ({
        key,
        label: officialFieldLabels[key],
        before: currentOfficialRelease.value ? clipPreview(values[key], 80) : '尚未发布',
        after: clipPreview(officialDraft.value[key], 80),
      }))
  })

  const formatOfficialTime = (timestamp?: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const summarizeOfficialAiRelease = (release: OfficialControlReleaseRecord) => {
    const values = release.values || {}
    const name = values.ai_assistant_name || '未命名'
    const welcomeLength = String(values.ai_assistant_welcome || '').length
    const creditLength = String(values.ai_assistant_console_credit || '').length
    return `${name} · 欢迎语 ${welcomeLength} 字 · 署名 ${creditLength} 字`
  }

  const loadOfficialControlData = async (options: { silent?: boolean } = {}) => {
    officialLoading.value = true
    officialError.value = ''
    officialUnavailable.value = ''
    try {
      officialStatus.value = await fetchOfficialControlPlatformStatus()
      if (!officialStatus.value.enabled || !officialStatus.value.hostAllowed) {
        officialUnavailable.value = '当前环境未启用官方托管发布，或当前 host 不在官方云控允许列表内。'
        currentOfficialRelease.value = null
        officialReleases.value = []
        syncOfficialDraftFromRelease(null)
        return
      }
      if (!officialStatus.value.secondAuthVerified) {
        currentOfficialRelease.value = null
        officialReleases.value = []
        syncOfficialDraftFromRelease(null)
        return
      }
      const result = await fetchOfficialControlCurrentConfig()
      currentOfficialRelease.value = result.current
      officialReleases.value = result.releases
      syncOfficialDraftFromRelease(result.current)
    } catch (error) {
      officialError.value = error instanceof Error ? error.message : '读取官方托管状态失败'
      if (!options.silent) showFloat(officialError.value, 'danger')
    } finally {
      officialLoading.value = false
    }
  }

  const loginOfficialControl = async () => {
    const password = officialSecondPassword.value.trim()
    if (!password) return
    officialAuthenticating.value = true
    officialError.value = ''
    try {
      officialStatus.value = await loginOfficialControlSecondAuth(password)
      officialSecondPassword.value = ''
      showFloat('云控二次验证通过', 'success')
      await loadOfficialControlData()
    } catch (error) {
      officialError.value = error instanceof Error ? error.message : '云控二次验证失败'
      showFloat(officialError.value, 'danger')
    } finally {
      officialAuthenticating.value = false
    }
  }

  const buildOfficialPublishValues = (): OfficialManagedConfigValues => ({
    ...(currentOfficialRelease.value?.values || {}),
    ai_assistant_name: officialDraft.value.ai_assistant_name,
    ai_assistant_welcome: officialDraft.value.ai_assistant_welcome,
    ai_assistant_console_credit: officialDraft.value.ai_assistant_console_credit,
  })

  const publishOfficialAiDraft = async () => {
    if (!officialDiffRows.value.length) return
    const diffText = officialDiffRows.value.map(row => row.label).join('、')
    if (typeof window !== 'undefined' && !window.confirm(`确认发布官方托管 AI 文案吗？本次变更：${diffText}`)) return
    officialPublishing.value = true
    officialError.value = ''
    try {
      const result = await publishOfficialControlConfig(buildOfficialPublishValues())
      currentOfficialRelease.value = result.current
      officialReleases.value = result.releases
      syncOfficialDraftFromRelease(result.current)
      await store.loadAdminConfig()
      captureAdminConfigBaseline()
      showFloat(`官方 AI 文案已发布为 v${result.current.version}`, 'success')
    } catch (error) {
      officialError.value = error instanceof Error ? error.message : '发布官方 AI 文案失败'
      showFloat(officialError.value, 'danger')
    } finally {
      officialPublishing.value = false
    }
  }

  const loadPanelData = async () => {
    await store.loadAdminConfig()
    captureAdminConfigBaseline()
    loadOfficialDraftFromAdminConfig()
    await loadOfficialControlData({ silent: true })
  }

  onMounted(() => {
    if (props.autoLoad) {
      void loadPanelData()
    } else {
      captureAdminConfigBaseline()
      loadOfficialDraftFromAdminConfig()
    }
  })
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

  .ai-admin-diff-list,
  .ai-admin-release-list {
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

  .ai-admin-official-auth {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .ai-admin-release-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(255, 255, 255, 0.03);
    color: rgb(var(--color-text));
    text-align: left;
    cursor: pointer;
  }

  .ai-admin-release-card:hover {
    border-color: rgba(200, 164, 92, 0.34);
  }

  .ai-admin-release-card small {
    color: rgb(var(--color-muted));
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

    .ai-admin-official-auth {
      grid-template-columns: 1fr;
    }
  }
</style>
