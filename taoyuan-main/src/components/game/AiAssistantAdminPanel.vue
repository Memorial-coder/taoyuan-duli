<template>
  <div class="ai-admin-panel" :class="{ 'ai-admin-panel--scrollable': scrollable }">
    <div v-if="store.isLoadingAdmin" class="ai-admin-panel__loading">AI 管理配置加载中...</div>
    <template v-else>
      <div class="ai-admin-panel__banner" :class="`ai-admin-panel__banner--${store.adminConfig.officialManagedStatus?.source || 'local_default'}`">
        <div class="text-xs leading-6">
          官方文案状态：{{ getOfficialManagedSourceLabel() }}
          <span v-if="store.adminConfig.officialManagedStatus?.profileId"> · {{ store.adminConfig.officialManagedStatus.profileId }}</span>
          <span v-if="store.adminConfig.officialManagedStatus?.version"> · v{{ store.adminConfig.officialManagedStatus.version }}</span>
        </div>
        <div class="text-[11px] text-muted leading-5">
          助手名称、欢迎语和控制台署名文案已改为官方云控只读，本地后台仅能查看当前生效值。
        </div>
        <div v-if="store.adminConfig.officialManagedStatus?.lastError" class="text-[11px] text-muted leading-5">
          最近同步信息：{{ store.adminConfig.officialManagedStatus.lastError }}
        </div>
      </div>

      <div v-if="!isManagedReadonly('ai_assistant_name')" class="ai-admin-panel__group">
        <p class="ai-admin-panel__label">功能开关</p>
        <div class="ai-admin-panel__row">
          <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.enabled }" @click="store.adminConfig.enabled = true">开启</button>
          <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.enabled }" @click="store.adminConfig.enabled = false">关闭</button>
        </div>
      </div>

      <div v-if="!isManagedReadonly('ai_assistant_welcome')" class="ai-admin-panel__group">
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

      <div v-if="!isManagedReadonly('ai_assistant_console_credit')" class="ai-admin-panel__group">
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
        <label class="ai-admin-panel__label">助手名称</label>
        <input v-model="store.adminConfig.assistantName" class="ai-admin-panel__input" maxlength="20" />
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">欢迎语</label>
        <textarea v-model="store.adminConfig.welcomeMessage" rows="3" class="ai-admin-panel__textarea" maxlength="300" />
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">控制台署名文案</label>
        <textarea v-model="store.adminConfig.consoleCreditMessage" rows="4" class="ai-admin-panel__textarea" maxlength="500" />
        <p class="text-[11px] text-muted">前台会在页面进入和路由切换时输出这段文案；如果里面包含 URL，会自动把链接单独识别出来。</p>
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">模型 API 地址</label>
        <input v-model="store.adminConfig.apiUrl" class="ai-admin-panel__input" placeholder="如 https://api.example.com/v1" />
      </div>

      <div class="ai-admin-panel__group grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <label class="ai-admin-panel__label">模型名称</label>
          <input v-model="store.adminConfig.model" class="ai-admin-panel__input" placeholder="如 gpt-4o-mini" />
        </div>
        <div>
          <label class="ai-admin-panel__label">温度</label>
          <input v-model.number="store.adminConfig.temperature" type="number" min="0" max="1.5" step="0.1" class="ai-admin-panel__input" />
        </div>
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">API Key</label>
        <input v-model="store.adminConfig.apiKey" type="password" class="ai-admin-panel__input" placeholder="留空则不带 Bearer Token" />
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">系统提示词</label>
        <textarea v-model="store.adminConfig.systemPrompt" rows="4" class="ai-admin-panel__textarea" maxlength="1500" />
      </div>

      <div class="ai-admin-panel__group">
        <label class="ai-admin-panel__label">额外屏蔽主题（每行一条）</label>
        <textarea v-model="store.adminConfig.blockedTopics" rows="4" class="ai-admin-panel__textarea" placeholder="例如：隐藏 boss&#10;内部数值" />
      </div>

      <div class="ai-admin-panel__footer">
        <p class="text-[11px] text-muted">若未配置 API 地址和模型名，系统会自动退回内置知识库回答。</p>
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
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { BookOpen, Settings2 } from 'lucide-vue-next'
  import { useAiAssistantStore } from '@/stores/useAiAssistantStore'

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
  const readonlyManagedFieldSet = computed(() => new Set(store.adminConfig.readonlyManagedFields || []))

  const isManagedReadonly = (key: 'ai_assistant_name' | 'ai_assistant_welcome' | 'ai_assistant_console_credit') => {
    return readonlyManagedFieldSet.value.has(key)
  }

  const getOfficialManagedSourceLabel = () => {
    const source = store.adminConfig.officialManagedStatus?.source
    if (source === 'official_live') return '官方云控生效中'
    if (source === 'official_cached') return '官方缓存回退中'
    return '仓库默认文案'
  }

  const saveAdminConfig = async () => {
    await store.saveAdminConfig()
  }

  const openKnowledgeAdminPage = () => {
    void router.push('/admin/ai-knowledge')
  }

  onMounted(() => {
    if (props.autoLoad) {
      void store.loadAdminConfig()
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
  .ai-admin-panel__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    font-size: 12px;
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

  .ai-admin-panel__banner {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    padding: 10px 12px;
    background: rgba(200, 164, 92, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ai-admin-panel__banner--official_live {
    border-color: rgba(72, 146, 95, 0.3);
    background: rgba(72, 146, 95, 0.1);
  }

  .ai-admin-panel__banner--official_cached {
    border-color: rgba(200, 164, 92, 0.26);
    background: rgba(200, 164, 92, 0.12);
  }

  .ai-admin-panel__banner--local_default {
    border-color: rgba(120, 130, 150, 0.24);
    background: rgba(120, 130, 150, 0.1);
  }

  .ai-admin-panel__label {
    font-size: 12px;
    color: rgb(var(--color-text));
    opacity: 0.8;
  }

  .ai-admin-panel__loading {
    padding: 24px 0;
    text-align: center;
    font-size: 12px;
    color: rgb(var(--color-text));
    opacity: 0.72;
  }
</style>
