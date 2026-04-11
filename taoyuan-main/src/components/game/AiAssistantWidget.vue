<template>
  <template v-if="store.canRender">
    <button class="ai-fab" :class="{ 'ai-fab--open': store.isOpen }" @click="void store.togglePanel()">
      <Bot :size="18" />
      <span>{{ store.publicConfig.assistantName }}</span>
    </button>

    <Transition name="panel-fade">
      <div v-if="store.isOpen" class="ai-panel-wrap">
        <div class="ai-panel game-panel">
          <div class="ai-panel__header">
            <div>
              <p class="ai-panel__title">
                <Sparkles :size="14" />
                {{ store.publicConfig.assistantName }}
              </p>
              <p class="ai-panel__subtitle">
                当前模式：{{ store.publicConfig.mode === 'standard' ? '标准模式' : '严格模式' }}
                <span v-if="!store.publicConfig.providerConfigured">· 内置知识库</span>
                <span v-else>· 已接入模型</span>
              </p>
            </div>
            <div class="ai-panel__header-actions">
              <button v-if="store.isAdmin" class="btn !px-2 !py-1" @click="void toggleAdminTab()">
                <Shield :size="12" />
                <span>{{ activeTab === 'admin' ? '返回问答' : '管理' }}</span>
              </button>
              <button class="btn !px-2 !py-1" @click="store.resetConversation()">
                <Trash2 :size="12" />
                <span>清空</span>
              </button>
              <button class="btn !px-2 !py-1" @click="store.closePanel()">
                <X :size="12" />
              </button>
            </div>
          </div>

          <template v-if="activeTab === 'chat'">
            <div ref="messageViewport" class="ai-panel__messages">
              <div v-for="message in store.messages" :key="message.id" class="ai-msg" :class="`ai-msg--${message.role}`">
                <div class="ai-msg__bubble" :class="{ 'ai-msg__bubble--error': message.error }">
                  <div v-if="message.role === 'assistant'" class="ai-msg__markdown" v-html="renderMessage(message.content)" />
                  <p v-else class="ai-msg__text">{{ message.content }}</p>
                  <div v-if="message.sources?.length" class="ai-msg__sources">
                    <span v-for="source in message.sources" :key="source" class="ai-source-tag">{{ source }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="ai-panel__quick">
              <button v-for="item in quickQuestions" :key="item" class="ai-quick-btn" @click="void submitQuestion(item)">
                {{ item }}
              </button>
            </div>

            <div class="ai-panel__input">
              <textarea
                v-model="draft"
                rows="3"
                maxlength="300"
                class="ai-textarea"
                placeholder="例如：农场前期怎么赚钱？当前页面主要做什么？"
                @keydown="handleKeydown"
              />
              <div class="ai-panel__input-actions">
                <p class="text-[11px] text-muted">支持玩法问答、资源获取、任务推进和攻略建议。</p>
                <button class="btn" :disabled="store.isAsking || !draft.trim()" @click="void submitQuestion()">
                  <Send :size="12" />
                  <span>{{ store.isAsking ? '发送中...' : '提问' }}</span>
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="ai-admin">
              <div v-if="store.isLoadingAdmin" class="ai-admin__loading">AI 管理配置加载中...</div>
              <template v-else>
                <div class="ai-admin__group">
                  <p class="ai-admin__label">功能开关</p>
                  <div class="ai-admin__row">
                    <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.enabled }" @click="store.adminConfig.enabled = true">开启</button>
                    <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.enabled }" @click="store.adminConfig.enabled = false">关闭</button>
                  </div>
                </div>

                <div class="ai-admin__group">
                  <p class="ai-admin__label">回答模式</p>
                  <div class="ai-admin__row">
                    <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.mode === 'strict' }" @click="store.adminConfig.mode = 'strict'">
                      严格模式
                    </button>
                    <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.mode === 'standard' }" @click="store.adminConfig.mode = 'standard'">
                      标准模式
                    </button>
                  </div>
                </div>

                <div class="ai-admin__group">
                  <p class="ai-admin__label">源码能力</p>
                  <div class="ai-admin__row">
                    <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.sourceReadEnabled }" @click="store.adminConfig.sourceReadEnabled = true">
                      允许阅读源码
                    </button>
                    <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.sourceReadEnabled }" @click="store.adminConfig.sourceReadEnabled = false">
                      禁止阅读源码
                    </button>
                  </div>
                  <div class="ai-admin__row">
                    <button class="btn" :class="{ '!bg-accent !text-bg': store.adminConfig.sourceIngestEnabled }" @click="store.adminConfig.sourceIngestEnabled = true">
                      生成源码候选草稿
                    </button>
                    <button class="btn" :class="{ '!bg-accent !text-bg': !store.adminConfig.sourceIngestEnabled }" @click="store.adminConfig.sourceIngestEnabled = false">
                      不自动沉淀候选
                    </button>
                  </div>
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">助手名称</label>
                  <input v-model="store.adminConfig.assistantName" class="ai-input" maxlength="20" />
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">欢迎语</label>
                  <textarea v-model="store.adminConfig.welcomeMessage" rows="3" class="ai-textarea" maxlength="300" />
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">模型 API 地址</label>
                  <input v-model="store.adminConfig.apiUrl" class="ai-input" placeholder="如 https://api.example.com/v1" />
                </div>

                <div class="ai-admin__group grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label class="ai-admin__label">模型名称</label>
                    <input v-model="store.adminConfig.model" class="ai-input" placeholder="如 gpt-4o-mini" />
                  </div>
                  <div>
                    <label class="ai-admin__label">温度</label>
                    <input v-model.number="store.adminConfig.temperature" type="number" min="0" max="1.5" step="0.1" class="ai-input" />
                  </div>
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">API Key</label>
                  <input v-model="store.adminConfig.apiKey" type="password" class="ai-input" placeholder="留空则不带 Bearer Token" />
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">系统提示词</label>
                  <textarea v-model="store.adminConfig.systemPrompt" rows="4" class="ai-textarea" maxlength="1500" />
                </div>

                <div class="ai-admin__group">
                  <label class="ai-admin__label">额外屏蔽主题（每行一条）</label>
                  <textarea v-model="store.adminConfig.blockedTopics" rows="4" class="ai-textarea" placeholder="例如：隐藏 boss\n内部数值" />
                </div>

                <div class="ai-admin__footer">
                  <p class="text-[11px] text-muted">若未配置 API 地址和模型名，系统会自动退回内置知识库回答。</p>
                  <div class="ai-admin__row !justify-end">
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
        </div>
      </div>
    </Transition>
  </template>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { BookOpen, Bot, Send, Shield, Settings2, Sparkles, Trash2, X } from 'lucide-vue-next'
  import { useAiAssistantStore } from '@/stores/useAiAssistantStore'
  import { renderSafeMarkdown } from '@/utils/safeMarkdown'

  const store = useAiAssistantStore()
  const route = useRoute()
  const router = useRouter()

  const draft = ref('')
  const activeTab = ref<'chat' | 'admin'>('chat')
  const messageViewport = ref<HTMLElement | null>(null)

  const routeLabels: Record<string, string> = {
    menu: '主菜单',
    hall: '交流大厅',
    farm: '农场',
    animal: '畜棚与宠物',
    home: '家园',
    cottage: '小屋与家庭',
    village: '村庄与 NPC',
    shop: '商店',
    forage: '采集',
    fishing: '钓鱼',
    mining: '矿洞',
    cooking: '烹饪',
    workshop: '作坊加工',
    upgrade: '工具升级',
    inventory: '背包',
    skills: '技能',
    achievement: '成就',
    wallet: '钱包兑换',
    quest: '任务',
    charinfo: '角色信息',
    breeding: '育种',
    museum: '博物馆',
    guild: '公会',
    hanhai: '瀚海',
    fishpond: '鱼塘',
  }

  const quickQuestionMap: Record<string, string[]> = {
    menu: ['这游戏新手开局先做什么？', '本地存档和服务端存档有什么区别？', '怎么开始新游戏？'],
    hall: ['交流大厅能做什么？', '怎么发帖和回复？', '求助帖悬赏有什么用？'],
    farm: ['农场前期怎么赚钱？', '换季前要注意什么？', '当前页面主要做什么？'],
    animal: ['养殖前期该怎么起步？', '动物为什么不稳定产出？', '宠物有什么作用？'],
    fishing: ['钓鱼前期值得练吗？', '想靠钓鱼赚钱该怎么安排？', '钓鱼要先准备什么？'],
    mining: ['下矿前要准备什么？', '矿洞的核心收益是什么？', '体力不够时还适合下矿吗？'],
    wallet: ['钱包兑换页面是做什么的？', '为什么提示超出当日限制？', '兑换前我要注意什么？'],
    quest: ['任务卡住了怎么办？', '不知道下一步做什么怎么办？', '主线任务有什么用？'],
  }

  const currentRouteName = computed(() => (typeof route.name === 'string' ? route.name : ''))
  const currentContextLabel = computed(() => routeLabels[currentRouteName.value] || '')

  const quickQuestions = computed(() => {
    return quickQuestionMap[currentRouteName.value] || ['这游戏新手怎么玩？', '当前页面主要功能是什么？', '我接下来应该优先做什么？']
  })

  const renderMessage = (content: string) => renderSafeMarkdown(content)

  const scrollToBottom = async () => {
    await nextTick()
    if (!messageViewport.value) return
    messageViewport.value.scrollTop = messageViewport.value.scrollHeight
  }

  const submitQuestion = async (question?: string) => {
    const value = (question ?? draft.value).trim()
    if (!value) return
    draft.value = ''
    await store.askQuestion(value, {
      routeName: currentRouteName.value,
      contextLabel: currentContextLabel.value,
    })
    await scrollToBottom()
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitQuestion()
    }
  }

  const toggleAdminTab = async () => {
    if (activeTab.value === 'admin') {
      activeTab.value = 'chat'
      return
    }
    activeTab.value = 'admin'
    await store.loadAdminConfig()
  }

  const saveAdminConfig = async () => {
    const success = await store.saveAdminConfig()
    if (success && !store.publicConfig.enabled && !store.isAdmin) {
      store.closePanel()
    }
  }

  const openKnowledgeAdminPage = () => {
    store.closePanel()
    void router.push('/admin/ai-knowledge')
  }

  watch(
    () => [store.isOpen, store.messages.length],
    () => {
      if (activeTab.value === 'chat') {
        void scrollToBottom()
      }
    }
  )

  onMounted(() => {
    void store.loadConfig()
    void store.verifyAdminAccess()
  })
</script>

<style scoped>
  .ai-fab {
    position: fixed;
    left: 12px;
    bottom: calc(12px + constant(safe-area-inset-bottom, 0px));
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: 45;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 2px solid var(--color-accent);
    border-radius: 4px;
    background: rgb(var(--color-panel));
    color: var(--color-accent);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  .ai-fab--open {
    background: var(--color-accent);
    color: rgb(var(--color-bg));
  }

  .ai-panel-wrap {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(66px + constant(safe-area-inset-bottom, 0px));
    bottom: calc(66px + env(safe-area-inset-bottom, 0px));
    z-index: 45;
    display: flex;
    justify-content: flex-start;
    pointer-events: none;
  }

  .ai-panel {
    width: min(100%, 420px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: auto;
    max-height: min(78vh, 760px);
  }

  .ai-panel__header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .ai-panel__title {
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-accent);
    font-size: 14px;
  }

  .ai-panel__subtitle {
    margin: 0;
    font-size: 11px;
    color: rgb(var(--color-text));
    opacity: 0.72;
    line-height: 1.6;
  }

  .ai-panel__header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .ai-panel__messages {
    min-height: 220px;
    max-height: 42vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }

  .ai-msg {
    display: flex;
  }

  .ai-msg--assistant {
    justify-content: flex-start;
  }

  .ai-msg--user {
    justify-content: flex-end;
  }

  .ai-msg__bubble {
    max-width: 88%;
    padding: 10px 12px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.14);
  }

  .ai-msg--user .ai-msg__bubble {
    background: rgba(200, 164, 92, 0.14);
  }

  .ai-msg__bubble--error {
    border-color: rgba(195, 64, 67, 0.4);
    color: #ffb2b2;
  }

  .ai-msg__text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.8;
  }

  .ai-msg__markdown {
    font-size: 12px;
    line-height: 1.8;
    color: rgb(var(--color-text));
    word-break: break-word;
  }

  .ai-msg__markdown :deep(p),
  .ai-msg__markdown :deep(ul),
  .ai-msg__markdown :deep(ol),
  .ai-msg__markdown :deep(pre),
  .ai-msg__markdown :deep(blockquote),
  .ai-msg__markdown :deep(h1),
  .ai-msg__markdown :deep(h2),
  .ai-msg__markdown :deep(h3) {
    margin: 0 0 8px;
  }

  .ai-msg__markdown :deep(p:last-child),
  .ai-msg__markdown :deep(ul:last-child),
  .ai-msg__markdown :deep(ol:last-child),
  .ai-msg__markdown :deep(pre:last-child) {
    margin-bottom: 0;
  }

  .ai-msg__markdown :deep(ul),
  .ai-msg__markdown :deep(ol) {
    padding-left: 18px;
  }

  .ai-msg__markdown :deep(li + li) {
    margin-top: 4px;
  }

  .ai-msg__markdown :deep(strong),
  .ai-msg__markdown :deep(h1),
  .ai-msg__markdown :deep(h2),
  .ai-msg__markdown :deep(h3) {
    color: var(--color-accent);
  }

  .ai-msg__markdown :deep(code) {
    padding: 1px 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: #f8d17a;
    font-family: Consolas, 'Courier New', monospace;
  }

  .ai-msg__markdown :deep(pre) {
    overflow-x: auto;
    padding: 10px;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.24);
  }

  .ai-msg__markdown :deep(pre code) {
    padding: 0;
    background: transparent;
    color: inherit;
  }

  .ai-msg__markdown :deep(a) {
    color: #9fd3ff;
    text-decoration: underline;
  }

  .ai-msg__sources {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ai-source-tag,
  .ai-quick-btn {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid rgba(200, 164, 92, 0.22);
    border-radius: 999px;
    font-size: 11px;
    color: rgb(var(--color-text));
    background: rgba(255, 255, 255, 0.02);
  }

  .ai-panel__quick {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ai-quick-btn {
    cursor: pointer;
  }

  .ai-quick-btn:hover {
    border-color: rgba(200, 164, 92, 0.45);
    color: var(--color-accent);
  }

  .ai-panel__input {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-panel__input-actions,
  .ai-admin__footer,
  .ai-admin__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-input,
  .ai-textarea {
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

  .ai-input:focus,
  .ai-textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .ai-textarea {
    resize: vertical;
    min-height: 76px;
  }

  .ai-admin {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 4px;
  }

  .ai-admin__group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ai-admin__label {
    font-size: 12px;
    color: rgb(var(--color-text));
    opacity: 0.8;
  }

  .ai-admin__loading {
    padding: 24px 0;
    text-align: center;
    font-size: 12px;
    color: rgb(var(--color-text));
    opacity: 0.72;
  }

  @media (max-width: 768px) {
    .ai-fab {
      left: 8px;
      bottom: calc(8px + constant(safe-area-inset-bottom, 0px));
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      padding: 10px;
    }

    .ai-fab span {
      display: none;
    }

    .ai-panel-wrap {
      left: 8px;
      right: 8px;
      justify-content: stretch;
      bottom: calc(60px + constant(safe-area-inset-bottom, 0px));
      bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    }

    .ai-panel {
      width: 100%;
      max-height: 74vh;
    }

    .ai-msg__bubble {
      max-width: 94%;
    }
  }
</style>