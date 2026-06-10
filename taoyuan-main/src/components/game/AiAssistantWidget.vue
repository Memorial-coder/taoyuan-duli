<template>
  <template v-if="store.canRender">
    <button
      ref="fabButton"
      type="button"
      class="ai-fab"
      :class="{ 'ai-fab--open': store.isOpen }"
      :aria-expanded="store.isOpen"
      aria-controls="ai-assistant-panel"
      :aria-label="store.isOpen ? '关闭桃源小助理面板' : '打开桃源小助理面板'"
      @click="void store.togglePanel()"
    >
      <Bot :size="18" />
      <span>{{ store.publicConfig.assistantName }}</span>
    </button>

    <Transition name="panel-fade">
      <div v-if="store.isOpen" class="ai-panel-wrap">
        <div
          id="ai-assistant-panel"
          ref="panelElement"
          class="ai-panel game-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ai-assistant-title"
          aria-describedby="ai-assistant-subtitle"
          tabindex="-1"
          @keydown.esc.stop.prevent="handlePanelEscape"
        >
          <div class="ai-panel__header">
            <div>
              <p id="ai-assistant-title" class="ai-panel__title">
                <Sparkles :size="14" />
                {{ store.publicConfig.assistantName }}
              </p>
              <p id="ai-assistant-subtitle" class="ai-panel__subtitle">
                当前模式：{{ store.publicConfig.mode === 'standard' ? '标准模式' : '严格模式' }}
                <span v-if="!store.publicConfig.providerConfigured">· 内置知识库</span>
                <span v-else>· 已接入模型</span>
              </p>
            </div>
            <div class="ai-panel__header-actions">
              <details ref="headerMenu" class="ai-panel__more">
                <summary class="btn !px-2 !py-1 ai-panel__more-toggle" aria-label="打开 AI 助手更多操作菜单" title="更多操作">
                  <MoreHorizontal :size="12" />
                </summary>
                <div class="ai-panel__more-menu" role="menu" aria-label="AI 助手更多操作">
                  <button v-if="store.isAdmin" type="button" class="ai-panel__menu-btn" role="menuitem" @click="openAdminPage">
                    <Shield :size="12" />
                    <span>桃源管理</span>
                  </button>
                  <button type="button" class="ai-panel__menu-btn" role="menuitem" @click="handleResetConversation">
                    <Trash2 :size="12" />
                    <span>清空会话</span>
                  </button>
                </div>
              </details>
              <button type="button" class="btn !px-2 !py-1 ai-panel__close" aria-label="关闭桃源小助理面板" @click="handleClosePanel">
                <X :size="12" />
              </button>
            </div>
          </div>

          <div ref="messageViewport" class="ai-panel__messages" role="log" aria-live="polite" aria-relevant="additions text" aria-label="AI 助手对话记录">
            <div v-for="message in store.messages" :key="message.id" class="ai-msg" :class="`ai-msg--${message.role}`">
              <div class="ai-msg__bubble" :class="{ 'ai-msg__bubble--error': message.error, 'ai-msg__bubble--draft': message.localDraft }">
                <div
                  v-if="message.role === 'assistant' && message.pending"
                  class="ai-msg__pending"
                  data-testid="ai-pending-stage"
                  :data-stage-id="getPendingStage(message).id"
                  :data-stream-phase="message.streamPhase || ''"
                >
                  <span class="ai-msg__pending-dot" />
                  <div>
                    <p class="ai-msg__pending-title">{{ message.streamPhaseLabel || getPendingStage(message).label }}</p>
                    <p class="ai-msg__pending-detail">{{ message.streamPhaseDetail || getPendingStage(message).detail }}</p>
                    <button class="ai-msg__inline-btn" data-testid="ai-cancel-generation" @click="store.cancelActiveQuestion()">
                      <CircleStop :size="12" />
                      <span>取消生成</span>
                    </button>
                  </div>
                </div>
                <div v-else-if="message.role === 'assistant'" class="ai-msg__answer" :class="{ 'ai-msg__answer--long': getAnswerPresentation(message).long }">
                  <div v-if="getAnswerPresentation(message).blocks.length" class="ai-msg__answer-blocks" data-testid="ai-answer-blocks">
                    <section
                      v-for="block in getAnswerPresentation(message).blocks"
                      :key="block.id"
                      class="ai-answer-block"
                      :class="`ai-answer-block--${block.kind}`"
                      :data-testid="`ai-answer-block-${block.kind}`"
                    >
                      <div class="ai-answer-block__header">
                        <span class="ai-answer-block__title">{{ block.title }}</span>
                        <button v-if="block.copyable" type="button" class="ai-answer-block__copy" data-testid="ai-copy-answer-block" @click="void copyAnswerBlock(message.id, block)">
                          <Copy :size="12" />
                          <span>{{ answerCopyFeedback[`${message.id}:${block.id}`] || '复制' }}</span>
                        </button>
                      </div>
                      <div class="ai-answer-block__body ai-msg__markdown" @click="handleMarkdownClick" v-html="renderSafeMarkdown(block.content)" />
                    </section>
                  </div>
                  <details v-if="getAnswerPresentation(message).long" class="ai-msg__full-answer" data-testid="ai-answer-long-details">
                    <summary>
                      <span>展开完整回答</span>
                      <span>{{ getAnswerLengthLabel(message) }}</span>
                    </summary>
                    <div class="ai-msg__markdown" data-testid="ai-answer-full-markdown" @click="handleMarkdownClick" v-html="renderMessage(message)" />
                  </details>
                  <div v-else class="ai-msg__markdown" data-testid="ai-answer-full-markdown" @click="handleMarkdownClick" v-html="renderMessage(message)" />
                </div>
                <p v-else class="ai-msg__text">{{ message.content }}</p>
                <div v-if="message.role === 'assistant' && message.streaming" class="ai-msg__streaming" data-testid="ai-streaming-indicator">
                  <span class="ai-msg__streaming-dot" />
                  <span>{{ message.streamPhaseLabel || '正在生成回答' }}</span>
                  <button class="ai-msg__inline-btn" data-testid="ai-cancel-streaming" @click="store.cancelActiveQuestion()">
                    <CircleStop :size="12" />
                    <span>取消生成</span>
                  </button>
                </div>
                <div v-if="message.role === 'assistant' && message.error && message.retryQuestion" class="ai-msg__retry">
                  <button class="ai-msg__inline-btn" data-testid="ai-retry-question" :disabled="store.isAsking" @click="void retryAssistantMessage(message)">
                    <RotateCcw :size="12" />
                    <span>重试</span>
                  </button>
                </div>
                <div v-if="message.role === 'assistant' && hasAnswerMeta(message)" class="ai-msg__meta" data-testid="ai-answer-source-summary">
                  <div class="ai-msg__meta-line">
                    <span v-if="message.localDraft" class="ai-meta-pill ai-meta-pill--draft" data-testid="ai-local-draft-marker">本地草稿</span>
                    <span class="ai-meta-pill ai-meta-pill--provider">{{ getProviderLabel(message) }}</span>
                    <span class="ai-meta-pill">{{ getModeLabel(message) }}</span>
                    <span v-if="message.traceSummary?.fallback || message.provider === 'fallback'" class="ai-meta-pill ai-meta-pill--fallback">备用回答</span>
                    <span v-if="message.traceSummary?.guarded || message.provider === 'guard'" class="ai-meta-pill ai-meta-pill--guard">安全保护</span>
                  </div>
                  <details v-if="hasEvidenceDetails(message)" class="ai-msg__evidence" data-testid="ai-answer-evidence-details">
                    <summary>
                      <span>来源依据</span>
                      <span>{{ getEvidenceCountLabel(message) }}</span>
                    </summary>
                    <div v-if="message.evidence?.length" class="ai-evidence-list">
                      <div v-for="item in message.evidence" :key="item.id" class="ai-evidence-row">
                        <span class="ai-evidence-title">{{ item.title }}</span>
                        <span class="ai-evidence-chip">{{ item.sourceTypeLabel }}</span>
                        <span class="ai-evidence-chip">{{ item.moduleLabel }}</span>
                        <span v-for="hint in item.routeHints" :key="`${item.id}-${hint}`" class="ai-evidence-chip">{{ hint }}</span>
                        <span v-if="item.truncated" class="ai-evidence-chip ai-evidence-chip--warn">已截断</span>
                      </div>
                    </div>
                    <div v-else-if="message.sources?.length" class="ai-msg__sources">
                      <span v-for="source in message.sources" :key="source" class="ai-source-tag">{{ source }}</span>
                    </div>
                    <div v-if="message.traceSummary?.uncertainPoints?.length" class="ai-msg__uncertain">
                      <strong>不确定：</strong>
                      <span>{{ message.traceSummary.uncertainPoints.join('；') }}</span>
                    </div>
                    <details v-if="store.isAdmin && message.trace" class="ai-msg__debug" data-testid="ai-answer-debug-trace">
                      <summary>完整 trace</summary>
                      <button type="button" class="ai-msg__debug-copy" @click="void copyDebugTrace(message)">
                        <Copy :size="12" />
                        <span>复制 trace</span>
                      </button>
                      <pre>{{ formatTrace(message.trace) }}</pre>
                    </details>
                  </details>
                </div>
                <div v-if="getMessageActionSuggestions(message).length" class="ai-msg__actions" data-testid="ai-answer-actions">
                  <button
                    v-for="suggestion in getMessageActionSuggestions(message)"
                    :key="suggestion.id"
                    class="ai-msg__action-btn"
                    :class="{ 'ai-msg__action-btn--done': isSuggestionMarked(suggestion) }"
                    :data-ai-action-type="suggestion.action.type"
                    @click="void handleSuggestionAction(message.id, suggestion)"
                  >
                    {{ getRenderedActionLabel(suggestion) }}
                  </button>
                  <p v-if="actionFeedback[message.id]" class="ai-msg__action-feedback" data-testid="ai-answer-action-feedback">
                    {{ actionFeedback[message.id] }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="ai-panel__quick" role="group" aria-label="AI 助手快捷问题" data-testid="ai-quick-question-list">
            <button
              v-for="item in quickQuestions"
              :key="item"
              type="button"
              class="ai-quick-btn"
              data-testid="ai-quick-question"
              :disabled="store.isAsking"
              :aria-label="`快捷问题：${item}`"
              @click="void submitQuestion(item)"
            >
              <span class="ai-quick-btn__text">{{ item }}</span>
            </button>
          </div>

          <div class="ai-panel__input" data-testid="ai-assistant-input">
            <textarea
              v-model="draft"
              rows="3"
              maxlength="300"
              class="ai-textarea"
              aria-label="向桃源小助理提问"
              placeholder="例如：农场前期怎么赚钱？当前页面主要做什么？"
              @keydown="handleKeydown"
            />
            <div class="ai-panel__input-actions">
              <p class="text-[0.6875rem] text-muted">支持玩法问答、资源获取、任务推进和攻略建议。</p>
              <button type="button" class="btn ai-panel__send" :disabled="store.isAsking || !draft.trim()" aria-label="发送问题给桃源小助理" @click="void submitQuestion()">
                <Send :size="12" />
                <span>{{ store.isAsking ? '发送中...' : '提问' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </template>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { Bot, CircleStop, Copy, MoreHorizontal, RotateCcw, Send, Shield, Sparkles, Trash2, X } from 'lucide-vue-next'
  import { buildAiAssistantContextSnapshotV2, useAiAssistantStore } from '@/stores/useAiAssistantStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useHomeStore } from '@/stores/useHomeStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { useFishPondStore } from '@/stores/useFishPondStore'
  import { useBreedingStore } from '@/stores/useBreedingStore'
  import { useMuseumStore } from '@/stores/useMuseumStore'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { useHanhaiStore } from '@/stores/useHanhaiStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import { useCohabitationStore } from '@/stores/useCohabitationStore'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { getItemById } from '@/data/items'
  import { getCropById } from '@/data/crops'
  import { getAnimalDef, getBuildingDef } from '@/data/animals'
  import { getStoryQuestById } from '@/data/storyQuests'
  import {
    buildAiAssistantCopyText,
    getAiAssistantActionButtonLabel,
    isAiAssistantExecutableAction,
    normalizeAiAssistantActionType,
    resolveAiAssistantActionRouteName,
  } from '@/utils/aiAssistantActions'
  import { getAiAssistantPendingStage } from '@/utils/aiAssistantPendingStages'
  import { buildDynamicAiQuickQuestions, getAiAssistantRouteLabel, getConfiguredAiQuickQuestions } from '@/utils/aiAssistantQuickQuestions'
  import { renderRichContent, renderSafeMarkdown } from '@/utils/safeMarkdown'
  import type { AiAssistantActionSuggestion, AiAssistantAnswerBlock, AiAssistantDebugTrace, AiAssistantMessage, FarmPlot, MainQuestObjective, QuestInstance, Season } from '@/types'

  const store = useAiAssistantStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const inventoryStore = useInventoryStore()
  const farmStore = useFarmStore()
  const animalStore = useAnimalStore()
  const homeStore = useHomeStore()
  const villageProjectStore = useVillageProjectStore()
  const fishPondStore = useFishPondStore()
  const breedingStore = useBreedingStore()
  const museumStore = useMuseumStore()
  const guildStore = useGuildStore()
  const hanhaiStore = useHanhaiStore()
  const saveStore = useSaveStore()
  const mailboxStore = useMailboxStore()
  const festivalRoomStore = useFestivalRoomStore()
  const coopOrderStore = useCoopOrderStore()
  const cohabitationStore = useCohabitationStore()
  const societyStore = useSocietyStore()
  const npcStore = useNpcStore()
  const hiddenNpcStore = useHiddenNpcStore()
  const route = useRoute()
  const router = useRouter()

  const draft = ref('')
  const fabButton = ref<HTMLButtonElement | null>(null)
  const panelElement = ref<HTMLElement | null>(null)
  const headerMenu = ref<HTMLDetailsElement | null>(null)
  const messageViewport = ref<HTMLElement | null>(null)
  const actionFeedback = ref<Record<string, string>>({})
  const answerCopyFeedback = ref<Record<string, string>>({})
  const markedSuggestionIds = ref<Set<string>>(new Set())
  const pendingStageNow = ref(Date.now())
  let pendingStageTimer: ReturnType<typeof setInterval> | undefined

  const currentRouteName = computed(() => (typeof route.name === 'string' ? route.name : ''))
  const currentContextLabel = computed(() => getAiAssistantRouteLabel(currentRouteName.value))

  const getDefaultQuickQuestions = () => (
    getConfiguredAiQuickQuestions(currentRouteName.value)
  )

  const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const toolLabels: Record<string, string> = {
    wateringCan: '水壶',
    hoe: '锄头',
    pickaxe: '镐子',
    fishingRod: '鱼竿',
    scythe: '镰刀',
    axe: '斧头',
    pan: '淘盘',
  }
  const toolTierLabels: Record<string, string> = {
    basic: '基础',
    iron: '铁',
    steel: '钢',
    iridium: '铱金',
  }

  type QuestRequirementSummary = {
    label: string
    shortageLabel?: string
    claimable: boolean
    inventoryBound: boolean
  }

  const getItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId

  const formatGroupedCounts = (counts: Map<string, number>, maxItems = 4) => (
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems)
      .map(([name, count]) => `${name}×${count}`)
  )

  const addGroupedCount = (counts: Map<string, number>, name: string, quantity = 1) => {
    if (!name || quantity <= 0) return
    counts.set(name, (counts.get(name) ?? 0) + quantity)
  }

  const summarizeInventoryResources = () => {
    const counts = new Map<string, number>()
    for (const item of [...inventoryStore.items, ...inventoryStore.tempItems]) {
      addGroupedCount(counts, getItemName(item.itemId), item.quantity)
    }
    return formatGroupedCounts(counts, 5)
  }

  const summarizeQuestRequirement = (
    itemId: string,
    itemName: string,
    quantity: number,
    deliveryMode: string | undefined,
    deliveredQuantity = 0,
  ): QuestRequirementSummary => {
    const requiredQuantity = Math.max(0, Math.floor(Number(quantity) || 0))
    if (!itemId || requiredQuantity <= 0) {
      return { label: itemName || '目标未明确', claimable: false, inventoryBound: false }
    }
    if (deliveryMode === 'pond') {
      return {
        label: `${itemName || getItemName(itemId)}×${requiredQuantity}（鱼塘交付）`,
        claimable: false,
        inventoryBound: false,
      }
    }

    const ownedQuantity = inventoryStore.getTotalItemCount(itemId)
    const visibleProgress = Math.min(Math.max(deliveredQuantity, ownedQuantity), requiredQuantity)
    const label = `${itemName || getItemName(itemId)} ${visibleProgress}/${requiredQuantity}`
    const shortage = Math.max(0, requiredQuantity - ownedQuantity)
    return {
      label,
      shortageLabel: shortage > 0 ? `${itemName || getItemName(itemId)}缺${shortage}（${ownedQuantity}/${requiredQuantity}）` : undefined,
      claimable: visibleProgress >= requiredQuantity && ownedQuantity >= requiredQuantity,
      inventoryBound: true,
    }
  }

  const getQuestCurrentStage = (quest: QuestInstance) => {
    const stages = quest.stageDefinitions ?? []
    if (!stages.length) return null
    const currentStageIndex = Math.max(0, Math.min(stages.length - 1, quest.orderProgressState?.currentStageIndex ?? 0))
    return stages[currentStageIndex] ?? null
  }

  const getStageDeliveredQuantity = (quest: QuestInstance, stageId?: string) => (
    quest.orderProgressState?.stageProgress?.find(stage => stage.stageId === stageId)?.deliveredQuantity ?? 0
  )

  const getQuestRequirementSummaries = (quest: QuestInstance, maxItems = 2): QuestRequirementSummary[] => {
    const currentStage = getQuestCurrentStage(quest)
    const comboRequirements = currentStage?.comboRequirements ?? quest.comboRequirements ?? []
    if (comboRequirements.length > 0) {
      return comboRequirements.slice(0, maxItems).map(requirement =>
        summarizeQuestRequirement(
          requirement.itemId,
          requirement.itemName,
          requirement.quantity,
          requirement.deliveryMode,
        )
      )
    }

    return [
      summarizeQuestRequirement(
        currentStage?.targetItemId ?? quest.targetItemId,
        currentStage?.targetItemName ?? quest.targetItemName,
        currentStage?.targetQuantity ?? quest.targetQuantity,
        currentStage?.deliveryMode ?? quest.deliveryMode,
        getStageDeliveredQuantity(quest, currentStage?.id),
      ),
    ]
  }

  const formatQuestLabel = (quest: QuestInstance) => {
    const title = quest.description || quest.targetItemName || quest.id
    const sourceLabel = quest.sourceLabel || quest.activitySourceLabel || (quest.type === 'special_order' ? '特殊订单' : '')
    const requirementLabel = getQuestRequirementSummaries(quest, 2).map(item => item.label).join('、')
    const timeLabel = quest.daysRemaining > 0 ? `，剩${quest.daysRemaining}天` : ''
    return `${sourceLabel ? `${sourceLabel}：` : ''}${title}（${requirementLabel || '目标待确认'}${timeLabel}）`
  }

  const collectQuestShortages = (quest: QuestInstance) => (
    getQuestRequirementSummaries(quest, 3)
      .map(item => item.shortageLabel)
      .filter((item): item is string => Boolean(item))
  )

  const isQuestClaimableFromVisibleState = (quest: QuestInstance) => {
    const requirements = getQuestRequirementSummaries(quest, 3)
    return requirements.length > 0 && requirements.every(item => item.inventoryBound && item.claimable)
  }

  const summarizeMainQuestObjective = (objective: MainQuestObjective, completed: boolean) => (
    `${completed ? '已完成' : '待完成'}：${objective.label}`
  )

  const getMainQuestShortageLabels = (objective: MainQuestObjective, completed: boolean) => {
    if (completed || objective.type !== 'deliverItem' || !objective.itemId) return []
    const requiredQuantity = Math.max(1, Math.floor(Number(objective.itemQuantity ?? objective.target ?? 1) || 1))
    const ownedQuantity = inventoryStore.getTotalItemCount(objective.itemId)
    const shortage = Math.max(0, requiredQuantity - ownedQuantity)
    return shortage > 0 ? [`${getItemName(objective.itemId)}缺${shortage}（${ownedQuantity}/${requiredQuantity}）`] : []
  }

  const buildQuestContextSnapshot = () => {
    const mainQuest = questStore.mainQuest
    const mainQuestDef = mainQuest ? getStoryQuestById(mainQuest.questId) : undefined
    const mainObjectiveLabels = mainQuestDef?.objectives.map((objective, index) =>
      summarizeMainQuestObjective(objective, mainQuest?.objectiveProgress[index] === true)
    ) ?? []
    const mainShortages = mainQuestDef?.objectives.flatMap((objective, index) =>
      getMainQuestShortageLabels(objective, mainQuest?.objectiveProgress[index] === true)
    ) ?? []
    const activeQuestLabels = questStore.activeQuests.slice(0, 4).map(formatQuestLabel)
    const boardQuestLabels = questStore.boardQuests.slice(0, 3).map(formatQuestLabel)
    const activeShortages = questStore.activeQuests.flatMap(collectQuestShortages)
    const activeClaimables = questStore.activeQuests
      .filter(isQuestClaimableFromVisibleState)
      .map(quest => `可交付：${quest.description || quest.targetItemName}`)
    const mainClaimable = mainQuest && mainQuest.accepted && mainQuest.objectiveProgress.every(Boolean) && mainQuestDef
      ? [`主线可提交：${mainQuestDef.title}`]
      : []
    const activeSpecialOrder = questStore.activeQuests.find(quest => quest.type === 'special_order') ?? null
    const visibleSpecialOrder = activeSpecialOrder ?? questStore.specialOrder
    const limitedCampaign = questStore.currentLimitedTimeQuestCampaign
    const remainingDays = questStore.currentLimitedTimeQuestRemainingDays

    return {
      mainQuestLabel: mainQuestDef
        ? `主线：${mainQuestDef.title}（${mainQuest?.accepted ? '已接取' : '待接取'}，${mainQuest?.objectiveProgress.filter(Boolean).length ?? 0}/${mainQuestDef.objectives.length}）`
        : undefined,
      mainQuestObjectiveLabels: mainObjectiveLabels,
      activeQuestLabels,
      boardQuestLabels,
      specialOrderLabel: visibleSpecialOrder ? formatQuestLabel(visibleSpecialOrder) : undefined,
      limitedTimeQuestLabel: limitedCampaign ? `${limitedCampaign.label}（剩${remainingDays}天）` : undefined,
      claimableLabels: [...mainClaimable, ...activeClaimables, ...weeklyPlanSnapshotClaimables()],
      blockerLabels: [...mainShortages, ...activeShortages].map(label => `任务缺口：${label}`),
      shortageLabels: [...mainShortages, ...activeShortages],
    }
  }

  const weeklyPlanSnapshotClaimables = () => goalStore.weeklyPlanSnapshot.claimableNodeLabels.map(label => `周计划可领：${label}`)

  const summarizeInventoryContext = (shortageLabels: string[]) => {
    const pendingUpgrade = inventoryStore.pendingUpgrade
    return {
      slotUsageLabel: `背包${inventoryStore.items.length}/${inventoryStore.capacity}格${inventoryStore.isFull ? '，已满' : ''}${inventoryStore.tempItems.length > 0 ? `，临时${inventoryStore.tempItems.length}格` : ''}`,
      keyResourceLabels: summarizeInventoryResources(),
      shortageLabels,
      toolLevelLabels: inventoryStore.tools.map(tool => `${toolLabels[tool.type] ?? tool.type}：${toolTierLabels[tool.tier] ?? tool.tier}`),
      pendingToolUpgradeLabel: pendingUpgrade
        ? `${toolLabels[pendingUpgrade.toolType] ?? pendingUpgrade.toolType}升级到${toolTierLabels[pendingUpgrade.targetTier] ?? pendingUpgrade.targetTier}，剩${pendingUpgrade.daysRemaining}天`
        : undefined,
    }
  }

  const nextSeason = (season: Season) => {
    const index = seasonOrder.indexOf(season)
    return seasonOrder[(index + 1 + seasonOrder.length) % seasonOrder.length] ?? 'spring'
  }

  const getPlantedCropName = (plot: FarmPlot) => (plot.cropId ? getCropById(plot.cropId)?.name ?? plot.cropId : '')

  const summarizeCropPlots = (plots: FarmPlot[], predicate: (plot: FarmPlot) => boolean, maxItems = 4) => {
    const counts = new Map<string, number>()
    for (const plot of plots) {
      if (!predicate(plot)) continue
      addGroupedCount(counts, getPlantedCropName(plot))
    }
    return formatGroupedCounts(counts, maxItems)
  }

  const buildFarmingContextSnapshot = () => {
    const plantedStates = new Set(['planted', 'growing', 'harvestable'])
    const plantedPlots = farmStore.plots.filter(plot => plantedStates.has(plot.state) && plot.cropId)
    const unwateredPlots = plantedPlots.filter(plot => !plot.watered)
    const problemPlots = plantedPlots.filter(plot => plot.infested || plot.weedy)
    const next = nextSeason(gameStore.season)
    const seasonRiskPlots = gameStore.day >= 24
      ? plantedPlots.filter(plot => {
          const crop = plot.cropId ? getCropById(plot.cropId) : undefined
          return crop ? !crop.season.includes(next) : false
        })
      : []
    const greenhouseHarvestable = farmStore.greenhousePlots.filter(plot => plot.state === 'harvestable').length

    return {
      plotStatusLabel: `农田${farmStore.farmSize}×${farmStore.farmSize}，已种${plantedPlots.length}块，可收${farmStore.harvestableCount}块，缺水${unwateredPlots.length}块${problemPlots.length > 0 ? `，虫草风险${problemPlots.length}块` : ''}`,
      harvestableLabels: summarizeCropPlots(farmStore.plots, plot => plot.state === 'harvestable'),
      waterRiskLabels: summarizeCropPlots(farmStore.plots, plot => plantedStates.has(plot.state) && Boolean(plot.cropId) && !plot.watered),
      seasonRiskLabels: summarizeCropPlots(seasonRiskPlots, () => true),
      greenhouseLabel: homeStore.greenhouseUnlocked || farmStore.greenhouseLevel > 0
        ? `温室Lv${farmStore.greenhouseLevel}，地块${farmStore.greenhousePlots.length}，可收${greenhouseHarvestable}`
        : '温室未解锁',
    }
  }

  const buildAnimalContextSnapshot = () => {
    const buildingLabels = animalStore.buildings.map(building => {
      const def = getBuildingDef(building.type)
      return building.built ? `${def?.name ?? building.type}Lv${building.level}` : `${def?.name ?? building.type}未建`
    })
    const careAnimalList = animalStore.animals.filter(animal => animal.type !== 'horse')
    const unfedCount = careAnimalList.filter(animal => !animal.wasFed).length
    const sickCount = careAnimalList.filter(animal => animal.sick).length
    const regularProductCounts = new Map<string, number>()
    const nearProductCounts = new Map<string, number>()
    for (const animal of careAnimalList) {
      const def = getAnimalDef(animal.type)
      if (!def || !def.productName || def.produceDays <= 0 || animal.sick) continue
      addGroupedCount(regularProductCounts, def.productName)
      if (animal.wasFed && animal.daysSinceProduct + 1 >= def.produceDays) {
        addGroupedCount(nearProductCounts, def.productName)
      }
    }
    const careAlertLabels = [
      unfedCount > 0 ? `未喂食${unfedCount}只` : '',
      sickCount > 0 ? `生病${sickCount}只` : '',
      animalStore.incubating ? `鸡舍孵化剩${animalStore.incubating.daysLeft}天` : '',
      animalStore.barnIncubating ? `牲口棚孕育剩${animalStore.barnIncubating.daysLeft}天` : '',
    ].filter(Boolean)

    return {
      buildingLabels,
      animalStatusLabel: `动物${careAnimalList.length}只，未喂${unfedCount}只，生病${sickCount}只`,
      productLabels: [
        ...formatGroupedCounts(nearProductCounts, 3).map(label => `明日可能产出：${label}`),
        ...formatGroupedCounts(regularProductCounts, 3).map(label => `常规产物：${label}`),
      ],
      careAlertLabels,
    }
  }

  const buildBuildingContextSnapshot = (animalBuildingLabels: string[], greenhouseLabel: string) => {
    const overview = villageProjectStore.overviewSummary
    const availableProjectLabels = villageProjectStore.projectSummaries
      .filter(project => project.available)
      .slice(0, 4)
      .map(project => project.name)

    return {
      farmhouseLabel: `${homeStore.farmhouseName} Lv${homeStore.farmhouseLevel}`,
      greenhouseLabel,
      animalBuildingLabels,
      villageProjectLabel: `村庄工程Lv${villageProjectStore.villageProjectLevel}，已完成${overview.completedProjects}/${overview.totalProjects}，可推进${overview.availableProjects}`,
      availableProjectLabels,
    }
  }

  const compactLabels = (labels: Array<string | undefined | null>, maxItems = 4) => (
    labels
      .map(label => String(label ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, maxItems)
  )

  const saveSyncStatusLabels: Record<string, string> = {
    idle: '未同步',
    syncing: '同步中',
    queued: '待上传',
    synced: '已同步',
    error: '同步异常',
  }

  const buildLateGameContextSnapshot = () => {
    const pond = fishPondStore.pond
    const pondContest = fishPondStore.currentPondContestDef
    const pondRegisteredCount = fishPondStore.pondContestState.registeredFishIds.length
    const pondLabel = pond.built
      ? `鱼塘Lv${pond.level}，鱼${fishPondStore.fishCount}/${fishPondStore.capacity}，水质${pond.waterQuality}，成熟${fishPondStore.matureFish.length}，病鱼${fishPondStore.sickFish.length}`
      : '鱼塘未建'
    const fishPondAlertLabels = compactLabels([
      pond.built && fishPondStore.isFull ? '鱼塘已满，先收成、换养或升级容量' : '',
      fishPondStore.sickFish.length > 0 ? `病鱼${fishPondStore.sickFish.length}条，优先治疗和清洁` : '',
      pondContest ? `鱼塘周赛：${pondContest.label}，已报名${pondRegisteredCount}/${fishPondStore.contestEligibleFish.length}` : '',
      fishPondStore.displayOverview.entryCount > 0
        ? `观赏缸${fishPondStore.displayOverview.entryCount}/${fishPondStore.displayOverview.slotLimit}，展示值${fishPondStore.displayOverview.totalShowValue}`
        : '',
      fishPondStore.highTierFishRatings.length > 0 ? `高评分鱼${fishPondStore.highTierFishRatings.length}条可承接周赛/展示` : '',
    ])

    const activeBreedingStations = breedingStore.stations.filter(slot => slot.parentA && slot.parentB && !slot.ready).length
    const readyBreedingStations = breedingStore.stations.filter(slot => slot.ready).length
    const certifiedLineageCount = Object.keys(breedingStore.certifiedLineages).length
    const discoverableHybrids = breedingStore.recommendedHybrids.filter(entry => entry.availability.status === 'discoverable')
    const nearHybrids = breedingStore.recommendedHybrids.filter(entry => entry.availability.status === 'near')
    const breedingContest = breedingStore.currentBreedingContestDef
    const breedingLabel = breedingStore.unlocked
      ? `育种Lv${breedingStore.researchLevel}，种子箱${breedingStore.boxCount}/${breedingStore.maxSeedBox}，图鉴${breedingStore.compendium.length}，认证${certifiedLineageCount}`
      : '育种未解锁'
    const breedingAlertLabels = compactLabels([
      readyBreedingStations > 0 ? `育种台${readyBreedingStations}个结果可收` : '',
      activeBreedingStations > 0 ? `育种台${activeBreedingStations}个进行中` : '',
      discoverableHybrids.length > 0 ? `可直接发现杂交：${discoverableHybrids.map(entry => entry.hybrid.name).join('、')}` : '',
      nearHybrids.length > 0 ? `接近杂交门槛：${nearHybrids.map(entry => entry.hybrid.name).join('、')}` : '',
      breedingContest ? `育种周赛：${breedingContest.label}，已报名${breedingStore.breedingContestState.registeredSeedIds.length}/${breedingStore.contestEligibleSeeds.length}` : '',
    ])

    const availableExhibitSlots = museumStore.exhibitSlotOverview.filter(slot => slot.isAvailable).length
    const acceptedCommissions = museumStore.scholarCommissionOverview.filter(commission => commission.isAccepted).length
    const rewardPendingCommissions = museumStore.scholarCommissionOverview.filter(commission => commission.isRewardPending).length
    const museumLabel = `博物馆藏品${museumStore.donatedCount}/${museumStore.totalCount}，展陈Lv${museumStore.exhibitLevel}，馆区Lv合计${museumStore.hallLevelTotal}，空展位${availableExhibitSlots}`
    const museumAlertLabels = compactLabels([
      museumStore.claimableMilestones.length > 0 ? `博物馆里程碑可领${museumStore.claimableMilestones.length}项` : '',
      museumStore.availableScholarCommissionCount > 0 ? `可接学者委托${museumStore.availableScholarCommissionCount}条` : '',
      acceptedCommissions > 0 ? `进行中学者委托${acceptedCommissions}条` : '',
      rewardPendingCommissions > 0 ? `学者委托奖励待领${rewardPendingCommissions}条` : '',
      ...museumStore.crossSystemOverview.recommendedActions,
    ])

    const guildSeason = guildStore.seasonOverview
    const guildLabel = `公会Lv${guildStore.guildLevel}，贡献${guildStore.contributionPoints}，赛季${guildSeason.currentPhase}，段位${guildStore.crossSystemOverview.currentRankBandLabel ?? guildSeason.rankBand}`
    const guildAlertLabels = compactLabels([
      guildStore.claimableGoals.length > 0 ? `公会讨伐奖励可领${guildStore.claimableGoals.length}项` : '',
      guildStore.activeRewardPoolOverview?.label ? `当前奖励池：${guildStore.activeRewardPoolOverview.label}` : '',
      ...guildStore.crossSystemOverview.recommendedActions,
    ])

    const hanhaiCycle = hanhaiStore.cycleOverview
    const availableRelicSites = hanhaiStore.relicSiteSummaries.filter(site => site.remaining > 0)
    const purchasableHanhaiItems = hanhaiStore.shopItemSummaries.filter(item => item.canPurchase).slice(0, 3)
    const hanhaiLabel = hanhaiStore.unlocked
      ? `瀚海${hanhaiCycle.progressTier}，遗迹清理${hanhaiCycle.totalRelicClears}次，商路${hanhaiCycle.activeInvestmentCount}条，赌坊剩${hanhaiCycle.betsRemaining}次`
      : '瀚海未开通'
    const hanhaiAlertLabels = compactLabels([
      availableRelicSites.length > 0 ? `可探索遗迹：${availableRelicSites.slice(0, 3).map(site => `${site.name}剩${site.remaining}`).join('、')}` : '',
      purchasableHanhaiItems.length > 0 ? `瀚海商店可购：${purchasableHanhaiItems.map(item => item.name).join('、')}` : '',
      hanhaiStore.hasActiveCasinoSession ? '瀚海仍有牌局待结算' : '',
      ...hanhaiStore.crossSystemOverview.recommendedActions,
    ])

    return {
      fishPondLabel: pondLabel,
      fishPondAlertLabels,
      breedingLabel,
      breedingAlertLabels,
      museumLabel,
      museumAlertLabels,
      guildLabel,
      guildAlertLabels,
      hanhaiLabel,
      hanhaiAlertLabels,
    }
  }

  const buildOnlineContextSnapshot = () => {
    const claimableMails = mailboxStore.mails.filter(mail => mail.can_claim && !mail.is_claimed && !mail.is_expired)
    const importantMails = mailboxStore.mails
      .filter(mail => mail.unread || mail.can_claim || mail.is_pinned)
      .slice(0, 4)
      .map(mail => mail.title)
    const festivalRoom = festivalRoomStore.myRoom
    const allCoopOrders = [
      ...coopOrderStore.myOrders,
      ...coopOrderStore.myAcceptedOrders,
      ...coopOrderStore.visibleOrders,
    ]
    const deliverySubmittedCount = allCoopOrders.filter(order => order.delivery_status === 'submitted').length
    const compensationPendingOrderCount = allCoopOrders.filter(order => (
      order.delivery_status === 'compensation_pending'
      || (order.stages ?? []).some(stage => stage.delivery_status === 'compensation_pending')
    )).length
    const pendingCompensations = coopOrderStore.myCompensations.filter(entry => entry.status === 'pending').length
    const cohabitationSummary = cohabitationStore.summary
    const mySociety = societyStore.mySociety
    const activeSocietyProjects = mySociety?.public_projects.filter(project => project.status === 'active').length ?? 0

    return {
      saveSyncLabel: `存档${saveStore.storageMode}，当前槽${saveStore.activeSlot > 0 ? saveStore.activeSlot : '未选'}，云同步${saveSyncStatusLabels[saveStore.serverSyncStatus] ?? saveStore.serverSyncStatus}，待上传${saveStore.pendingServerSlots.length}个`,
      mailboxLabel: `邮箱${mailboxStore.mails.length}封，未读${mailboxStore.unreadCount}封，可领取${claimableMails.length}封`,
      mailClaimableLabels: claimableMails.slice(0, 4).map(mail => `可领邮件：${mail.title}`),
      hallLabel: `交流大厅：村社${societyStore.visibleSocieties.length}个，邀请${societyStore.incomingInvites.length}个，申请${societyStore.myPendingRequests.length}个${societyStore.overview?.bulletin ? `，公告：${societyStore.overview.bulletin}` : ''}`,
      festivalRoomLabel: festivalRoom
        ? `节会房间「${festivalRoom.title}」${festivalRoom.state_label}，成员${festivalRoom.joined_member_count}/${festivalRoom.member_limit}，玩法${festivalRoom.gameplay?.phase_label ?? festivalRoom.template_label}`
        : `节会房间：可见${festivalRoomStore.visibleRooms.length}间，邀请${festivalRoomStore.invitedRooms.length}间`,
      coopOrderLabel: `互助委托：我发布${coopOrderStore.myOrders.length}单，已接${coopOrderStore.myAcceptedOrders.length}单，可接${coopOrderStore.visibleOrders.length}单，待确认${deliverySubmittedCount}单`,
      coopCompensationLabel: pendingCompensations > 0 || compensationPendingOrderCount > 0
        ? `委托补偿待处理${pendingCompensations}项，补偿中委托${compensationPendingOrderCount}单`
        : undefined,
      cohabitationLabel: `同住：总${cohabitationSummary.total}，活跃${cohabitationSummary.active}，待确认${cohabitationSummary.pending}，分居预览${cohabitationSummary.separation_previews}`,
      societyLabel: mySociety
        ? `村社「${mySociety.name}」${mySociety.level_title}，成员${mySociety.member_count}/${mySociety.capacity}，公共项目${activeSocietyProjects}个`
        : `村社未加入，可见${societyStore.visibleSocieties.length}个`,
      onlineAlertLabels: compactLabels([
        saveStore.pendingServerSlots.length > 0 ? `云存档有${saveStore.pendingServerSlots.length}个槽位待上传` : '',
        saveStore.serverSyncStatus === 'error' ? (saveStore.lastServerSyncMessage || saveStore.lastSaveErrorMessage || '云存档同步异常') : '',
        ...importantMails.map(title => `邮箱关注：${title}`),
        festivalRoom?.can_reconnect ? '节会房间可重连' : '',
        festivalRoom?.can_host_settle ? '节会房间可结算' : '',
        deliverySubmittedCount > 0 ? `互助委托有${deliverySubmittedCount}单待确认` : '',
        pendingCompensations > 0 ? `互助补偿有${pendingCompensations}项待处理` : '',
      ], 5),
    }
  }

  const aiContextSnapshot = computed(() => {
    const familyWishOverview = npcStore.getFamilyWishOverview()
    const activeFamilyWish = familyWishOverview.defs.find(def => def.id === familyWishOverview.state.activeWishId) ?? null
    const bondedNpc = hiddenNpcStore.getBondedNpc
    const weeklyPlanSnapshot = goalStore.weeklyPlanSnapshot
    const highlightedRouteLabels = [...new Set([weeklyPlanSnapshot.primaryRouteLabel, ...weeklyPlanSnapshot.secondaryRouteLabels])]
    const questContext = buildQuestContextSnapshot()
    const farmingContext = buildFarmingContextSnapshot()
    const animalContext = buildAnimalContextSnapshot()
    return buildAiAssistantContextSnapshotV2({
      routeName: currentRouteName.value,
      routeLabel: currentContextLabel.value,
      year: gameStore.year,
      season: gameStore.season,
      seasonLabel: gameStore.seasonName,
      day: gameStore.day,
      weather: gameStore.weather,
      weatherLabel: gameStore.weatherName,
      hour: gameStore.hour,
      timeDisplay: gameStore.timeDisplay,
      timePeriod: gameStore.timePeriod,
      stamina: playerStore.stamina,
      maxStamina: playerStore.maxStamina,
      money: playerStore.money,
      weeklyPlan: {
        planId: weeklyPlanSnapshot.planId,
        weekId: weeklyPlanSnapshot.weekId,
        primaryRouteLabel: weeklyPlanSnapshot.primaryRouteLabel,
        primaryRouteSummary: weeklyPlanSnapshot.primaryRouteSummary,
        secondaryRouteLabels: weeklyPlanSnapshot.secondaryRouteLabels,
        secondaryRouteSummaries: weeklyPlanSnapshot.secondaryRouteSummaries,
        claimableNodeLabels: weeklyPlanSnapshot.claimableNodeLabels,
        nextWeekPrepSummary: weeklyPlanSnapshot.nextWeekPrepSummary,
        sourceLabels: weeklyPlanSnapshot.sourceLabels,
      },
      inventory: summarizeInventoryContext(questContext.shortageLabels),
      farming: farmingContext,
      animals: animalContext,
      buildings: buildBuildingContextSnapshot(animalContext.buildingLabels, farmingContext.greenhouseLabel),
      quests: questContext,
      lateGame: buildLateGameContextSnapshot(),
      online: buildOnlineContextSnapshot(),
      legacy: {
        currentThemeWeekId: goalStore.currentThemeWeek?.id,
        currentThemeWeekLabel: goalStore.currentThemeWeek?.name,
        currentEventCampaignId: goalStore.currentEventCampaign?.id,
        currentEventCampaignLabel: goalStore.currentEventCampaign?.label,
        currentLimitedQuestCampaignId: questStore.currentLimitedTimeQuestCampaign?.id,
        currentLimitedQuestLabel: questStore.currentLimitedTimeQuestCampaign?.label,
        activeFamilyWishId: activeFamilyWish?.id,
        activeFamilyWishTitle: activeFamilyWish?.title,
        bondedSpiritId: bondedNpc?.id,
        bondedSpiritName: bondedNpc?.name,
        highlightedRouteLabels,
        previewMailTitles: goalStore.eventMailTemplateRefs
          .filter(template => goalStore.currentEventCampaign?.mailboxTemplateIds.includes(template.id))
          .map(template => template.title)
          .slice(0, 4),
      },
    })
  })

  const quickQuestions = computed(() => buildDynamicAiQuickQuestions({
    contextSnapshot: aiContextSnapshot.value,
    routeName: currentRouteName.value,
    defaultQuestions: getDefaultQuickQuestions(),
  }))

  interface AiAssistantAnswerPresentation {
    blocks: AiAssistantAnswerBlock[]
    long: boolean
  }

  const ANSWER_LONG_CHAR_LIMIT = 560
  const ANSWER_LONG_LINE_LIMIT = 10
  const answerSectionLabels = ['结论', '总结', '关键步骤', '步骤', '下一步', '行动建议', '行动', '注意事项', '注意', '风险', '提醒', '来源依据', '依据', '来源', '不确定', '无法确认', 'fallback', '安全保护']
  const sensitiveSourcePathRe = /(?:^|[\\/])(?:server|src|data-defaults|taoyuan-main)[\\/]|(?:\.ts|\.tsx|\.js|\.mjs|\.vue|\.json)(?::\d+)?$/i

  const getAnswerLines = (content: string) => String(content || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const normalizeAnswerLine = (line: string) => line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*\*(.*?)\*\*$/, '$1')
    .trim()

  const stripMarkdownPrefix = (line: string) => normalizeAnswerLine(line)
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim()

  const getLineSectionMatch = (line: string, labels = answerSectionLabels): { label: string; rest: string } | null => {
    const normalized = stripMarkdownPrefix(line)
    for (const label of labels) {
      if (normalized === label) return { label, rest: '' }
      if (normalized.startsWith(`${label}：`)) return { label, rest: normalized.slice(label.length + 1).trim() }
      if (normalized.startsWith(`${label}:`)) return { label, rest: normalized.slice(label.length + 1).trim() }
    }
    return null
  }

  const isAnySectionStart = (line: string) => Boolean(getLineSectionMatch(line))

  const extractLabeledSection = (content: string, labels: string[], maxLines = 5): string => {
    const lines = getAnswerLines(content)
    for (let index = 0; index < lines.length; index += 1) {
      const match = getLineSectionMatch(lines[index] || '', labels)
      if (!match) continue

      const sectionLines = match.rest ? [match.rest] : []
      for (let nextIndex = index + 1; nextIndex < lines.length && sectionLines.length < maxLines; nextIndex += 1) {
        const line = lines[nextIndex] || ''
        if (isAnySectionStart(line)) break
        sectionLines.push(line)
      }
      return sectionLines.join('\n').trim()
    }
    return ''
  }

  const getFirstAnswerSummary = (content: string): string => {
    const labeled = extractLabeledSection(content, ['结论', '总结'], 3)
    if (labeled) return labeled

    const lines = getAnswerLines(content)
    const summaryLines = lines
      .filter(line => !/^[-*]\s+/.test(line) && !/^\d+[.)]\s+/.test(line) && !isAnySectionStart(line))
      .slice(0, 2)

    const summary = summaryLines.join('\n').trim()
    return summary.length > 220 ? `${summary.slice(0, 220)}...` : summary
  }

  const getStepAnswerSummary = (content: string): string => {
    const labeled = extractLabeledSection(content, ['关键步骤', '步骤', '下一步', '行动建议', '行动'], 5)
    if (labeled) return labeled

    const listLines = getAnswerLines(content)
      .filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
      .slice(0, 4)
    return listLines.join('\n')
  }

  const getRiskAnswerSummary = (message: AiAssistantMessage): string => {
    const guarded = message.traceSummary?.guarded || message.provider === 'guard'
    const guardLine = guarded ? '当前回答已触发安全保护：不会读取源码、后台规则或密钥，也不会改动存档或公平性相关数据。' : ''
    const labeled = extractLabeledSection(message.content, ['风险', '注意事项', '注意', '提醒'], 4)
    const keywordLines = getAnswerLines(message.content)
      .filter(line => /风险|注意|提醒|换季|库存不足|严格模式|拒答|无法|不建议|可能/i.test(line))
      .slice(0, 4)
      .join('\n')

    return [guardLine, labeled || keywordLines].filter(Boolean).join('\n')
  }

  const getPublicSourceLabel = (value: string): string => {
    const trimmed = String(value || '').trim()
    if (!trimmed) return ''
    if (sensitiveSourcePathRe.test(trimmed)) return '已校验资料'
    return trimmed
  }

  const buildSourceBlockContent = (message: AiAssistantMessage): string => {
    if (message.evidence?.length) {
      return message.evidence
        .slice(0, 5)
        .map(item => {
          const labels = [
            getPublicSourceLabel(item.title),
            getPublicSourceLabel(item.sourceTypeLabel),
            getPublicSourceLabel(item.moduleLabel),
            ...item.routeHints.map(getPublicSourceLabel),
            item.truncated ? '已截断' : '',
          ].filter(Boolean)
          return `- ${labels.join(' / ')}`
        })
        .join('\n')
    }

    if (message.sources?.length) {
      return message.sources
        .map(getPublicSourceLabel)
        .filter(Boolean)
        .slice(0, 5)
        .map(source => `- ${source}`)
        .join('\n')
    }

    if (message.traceSummary?.evidenceCount === 0) return '本次回答未引用外部依据，优先按内置规则和安全边界给出。'
    return ''
  }

  const buildAnswerBlocks = (message: AiAssistantMessage, long: boolean): AiAssistantAnswerBlock[] => {
    const blocks: AiAssistantAnswerBlock[] = []
    const addBlock = (kind: AiAssistantAnswerBlock['kind'], title: string, content: string, copyable = true) => {
      const normalized = content.trim()
      if (!normalized) return
      blocks.push({
        id: `${kind}-${blocks.length}`,
        kind,
        title,
        content: normalized,
        copyable,
      })
    }

    const summary = getFirstAnswerSummary(message.content)
    const steps = getStepAnswerSummary(message.content)
    const risk = getRiskAnswerSummary(message)
    const sourceContent = buildSourceBlockContent(message)

    if (long || extractLabeledSection(message.content, ['结论', '总结'], 3)) addBlock('summary', '结论', summary)
    if (steps) addBlock('steps', '关键步骤', steps)
    if (risk) addBlock('risk', '风险与注意', risk)

    if (message.localDraft) {
      addBlock('notice', '本地草稿', '这是先行展示的本地草稿，等待远程或完整结果返回后会补全依据与操作建议。')
    }

    if (message.traceSummary?.fallback || message.provider === 'fallback') {
      addBlock('fallback', '备用回答', '远程回答暂不可用时，当前内容会先使用内置知识库给出可参考建议。')
    }

    if (message.traceSummary?.uncertain || message.traceSummary?.uncertainPoints?.length) {
      const points = message.traceSummary?.uncertainPoints?.length
        ? message.traceSummary.uncertainPoints.map(point => `- ${point}`).join('\n')
        : '当前资料不足以给出完全确定结论，请以页面中的任务、库存和活动状态为准。'
      addBlock('uncertainty', '不确定性', points)
    }

    addBlock('sources', '来源依据', sourceContent)
    return blocks
  }

  const getAnswerPresentation = (message: AiAssistantMessage): AiAssistantAnswerPresentation => {
    const lines = getAnswerLines(message.content)
    const long = message.content.length >= ANSWER_LONG_CHAR_LIMIT || lines.length >= ANSWER_LONG_LINE_LIMIT
    return {
      blocks: buildAnswerBlocks(message, long),
      long,
    }
  }

  const getAnswerLengthLabel = (message: AiAssistantMessage) => {
    const lines = getAnswerLines(message.content).length
    return `${message.content.length} 字 / ${lines} 行`
  }

  const renderMessage = (message: AiAssistantMessage) => (
    message.richStatic ? renderRichContent(message.content) : renderSafeMarkdown(message.content)
  )

  const getPendingElapsedMs = (message: AiAssistantMessage) => (
    Math.max(0, pendingStageNow.value - (message.pendingStartedAt ?? message.createdAt))
  )

  const getPendingStage = (message: AiAssistantMessage) => getAiAssistantPendingStage(
    getPendingElapsedMs(message),
    { providerConfigured: store.publicConfig.providerConfigured }
  )

  const providerLabels: Record<string, string> = {
    local: '内置知识库',
    model: '远程模型',
    fallback: '备用回答',
    guard: '安全保护',
  }

  const hasAnswerMeta = (message: AiAssistantMessage) => {
    if (message.pending || message.streaming || message.error || message.richStatic) return false
    return Boolean(message.provider || message.mode || message.traceSummary || message.evidence?.length || message.sources?.length)
  }

  const hasEvidenceDetails = (message: AiAssistantMessage) => hasAnswerMeta(message)

  const getProviderLabel = (message: AiAssistantMessage) => (
    message.traceSummary?.providerLabel || providerLabels[message.provider || ''] || '内置知识库'
  )

  const getModeLabel = (message: AiAssistantMessage) => (
    message.traceSummary?.modeLabel || (message.mode === 'standard' ? '标准模式' : '严格模式')
  )

  const getEvidenceCountLabel = (message: AiAssistantMessage) => {
    const count = message.traceSummary?.evidenceCount ?? message.evidence?.length ?? message.sources?.length ?? 0
    if (message.traceSummary?.uncertain) return `${count} 条依据 · 有不确定项`
    return count > 0 ? `${count} 条依据` : '无外部依据'
  }

  const formatTrace = (trace: AiAssistantDebugTrace) => JSON.stringify(trace, null, 2)

  const getSuggestionActionKey = (suggestion: AiAssistantActionSuggestion) => `${suggestion.id}:${suggestion.action.type}:${suggestion.action.target}:${suggestion.action.label}`

  const getMessageActionSuggestions = (message: AiAssistantMessage) => {
    if (message.pending || message.streaming || message.error || message.role !== 'assistant') return []
    return (message.suggestions || []).filter(isAiAssistantExecutableAction).slice(0, 3)
  }

  const isSuggestionMarked = (suggestion: AiAssistantActionSuggestion) => markedSuggestionIds.value.has(getSuggestionActionKey(suggestion))

  const getRenderedActionLabel = (suggestion: AiAssistantActionSuggestion) => (
    isSuggestionMarked(suggestion) ? '已标记' : getAiAssistantActionButtonLabel(suggestion)
  )

  const setActionFeedback = (messageId: string, text: string) => {
    actionFeedback.value = {
      ...actionFeedback.value,
      [messageId]: text,
    }
  }

  const copyTextToClipboard = async (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('当前环境不支持剪贴板复制')
    }
    await navigator.clipboard.writeText(text)
  }

  const setGeneratedCopyButtonLabel = (button: HTMLButtonElement, label: string, resetLabel = '复制') => {
    button.textContent = label
    window.setTimeout(() => {
      button.textContent = resetLabel
    }, 1200)
  }

  const handleMarkdownClick = async (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    const button = target?.closest<HTMLButtonElement>('[data-ai-copy-code]')
    if (!button) return

    event.preventDefault()
    event.stopPropagation()

    const codeText = button.closest('.ai-md-code-block')?.querySelector('code')?.textContent || ''
    if (!codeText.trim()) return

    try {
      await copyTextToClipboard(codeText)
      setGeneratedCopyButtonLabel(button, '已复制')
    } catch {
      setGeneratedCopyButtonLabel(button, '复制失败')
    }
  }

  const copyDebugTrace = async (message: AiAssistantMessage) => {
    if (!message.trace) return
    try {
      await copyTextToClipboard(formatTrace(message.trace))
    } catch {
      // Clipboard access can be unavailable in embedded or insecure contexts.
    }
  }

  const copyAnswerBlock = async (messageId: string, block: AiAssistantAnswerBlock) => {
    const key = `${messageId}:${block.id}`
    try {
      await copyTextToClipboard(block.content)
      answerCopyFeedback.value = {
        ...answerCopyFeedback.value,
        [key]: '已复制',
      }
    } catch {
      answerCopyFeedback.value = {
        ...answerCopyFeedback.value,
        [key]: '复制失败',
      }
    }

    window.setTimeout(() => {
      const nextFeedback = { ...answerCopyFeedback.value }
      delete nextFeedback[key]
      answerCopyFeedback.value = nextFeedback
    }, 1200)
  }

  const handleSuggestionAction = async (messageId: string, suggestion: AiAssistantActionSuggestion) => {
    const actionType = normalizeAiAssistantActionType(suggestion.action.type)
    if (!actionType || !isAiAssistantExecutableAction(suggestion)) {
      setActionFeedback(messageId, '这个动作不在安全轻动作白名单内，已忽略。')
      return
    }

    if (actionType === 'copy_checklist') {
      try {
        await copyTextToClipboard(buildAiAssistantCopyText(suggestion))
        setActionFeedback(messageId, '清单已复制。')
      } catch {
        setActionFeedback(messageId, '当前环境不支持复制，请手动选择清单文本。')
      }
      return
    }

    if (actionType === 'mark_goal') {
      markedSuggestionIds.value = new Set([...markedSuggestionIds.value, getSuggestionActionKey(suggestion)])
      setActionFeedback(messageId, '已在本次会话中标记为今日目标，不会写入存档。')
      return
    }

    const routeName = resolveAiAssistantActionRouteName(suggestion.action, suggestion.routeName)
    if (!routeName) {
      setActionFeedback(messageId, '没有可用的安全页面入口。')
      return
    }

    await router.push({ name: routeName })
    store.closePanel()
  }

  const scrollToBottom = async () => {
    await nextTick()
    if (!messageViewport.value) return
    messageViewport.value.scrollTop = messageViewport.value.scrollHeight
  }

  const submitQuestion = async (question?: string) => {
    const value = (question ?? draft.value).trim()
    if (!value) return
    if (store.isAsking) return
    draft.value = ''
    await store.askQuestion(value, {
      routeName: currentRouteName.value,
      contextLabel: currentContextLabel.value,
      contextSnapshot: aiContextSnapshot.value,
    })
    await scrollToBottom()
  }

  const retryAssistantMessage = async (message: AiAssistantMessage) => {
    const value = (message.retryQuestion || '').trim()
    if (!value || store.isAsking) return
    await store.askQuestion(value, {
      routeName: currentRouteName.value,
      contextLabel: currentContextLabel.value,
      contextSnapshot: aiContextSnapshot.value,
    })
    await scrollToBottom()
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitQuestion()
    }
  }

  const openAdminPage = () => {
    closeHeaderMenu()
    handleClosePanel()
    void router.push({ path: '/admin', query: { tab: 'ai' } })
  }

  const closeHeaderMenu = () => {
    if (headerMenu.value) headerMenu.value.open = false
  }

  const handleResetConversation = () => {
    store.resetConversation()
    closeHeaderMenu()
  }

  const handleClosePanel = () => {
    closeHeaderMenu()
    store.closePanel()
  }

  const handlePanelEscape = () => {
    handleClosePanel()
  }

  watch(
    () => [store.isOpen, store.messages.length],
    () => {
      void scrollToBottom()
    }
  )

  watch(
    () => store.isOpen,
    async isOpen => {
      await nextTick()
      if (isOpen) {
        panelElement.value?.focus({ preventScroll: true })
      } else {
        fabButton.value?.focus({ preventScroll: true })
      }
    }
  )

  onMounted(() => {
    goalStore.ensureInitialized()
    void store.loadConfig({ appendWelcome: false })
    void store.verifyAdminAccess()
    pendingStageTimer = setInterval(() => {
      pendingStageNow.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (pendingStageTimer) clearInterval(pendingStageTimer)
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
    min-width: var(--ai-assistant-touch-target, 44px);
    min-height: var(--ai-assistant-touch-target, 44px);
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
    max-height: min(78dvh, 760px);
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    outline: none;
  }

  .ai-panel:focus-visible,
  .ai-fab:focus-visible,
  .ai-panel button:focus-visible,
  .ai-panel textarea:focus-visible,
  .ai-panel summary:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .ai-panel__header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    position: sticky;
    top: 0;
    z-index: 2;
    padding-bottom: 2px;
    background: rgb(var(--color-panel));
  }

  .ai-panel__title {
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-accent);
    font-size: 0.875rem;
  }

  .ai-panel__subtitle {
    margin: 0;
    font-size: 0.6875rem;
    color: rgb(var(--color-text));
    opacity: 0.72;
    line-height: 1.6;
  }

  .ai-panel__header-actions {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    justify-content: flex-end;
    align-items: flex-start;
    position: relative;
  }

  .ai-panel__more {
    position: relative;
  }

  .ai-panel__more-toggle {
    min-width: 32px;
    min-height: 30px;
    list-style: none;
  }

  .ai-panel__more-toggle::-webkit-details-marker {
    display: none;
  }

  .ai-panel__more-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 4;
    display: flex;
    min-width: 132px;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    border: 1px solid rgba(200, 164, 92, 0.28);
    border-radius: 4px;
    background: rgb(var(--color-panel));
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  .ai-panel__menu-btn {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    min-height: 32px;
    padding: 6px 8px;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 4px;
    color: rgb(var(--color-text));
    font-size: 0.6875rem;
    line-height: 1.4;
    cursor: pointer;
  }

  .ai-panel__menu-btn:hover {
    border-color: rgba(200, 164, 92, 0.42);
    color: var(--color-accent);
  }

  .ai-panel__close {
    min-width: 32px;
    min-height: 30px;
  }

  .ai-panel__messages {
    min-height: 0;
    flex: 1 1 auto;
    max-height: min(42dvh, 420px);
    overflow-y: auto;
    overscroll-behavior: contain;
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

  .ai-msg__bubble--draft {
    border-color: rgba(248, 209, 122, 0.32);
    background: rgba(248, 209, 122, 0.08);
  }

  .ai-msg__text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.75rem;
    line-height: 1.8;
  }

  .ai-msg__markdown {
    min-width: 0;
    max-width: 100%;
    font-size: 0.75rem;
    line-height: 1.8;
    color: rgb(var(--color-text));
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .ai-msg__markdown :deep(p),
  .ai-msg__markdown :deep(ul),
  .ai-msg__markdown :deep(ol),
  .ai-msg__markdown :deep(pre),
  .ai-msg__markdown :deep(blockquote),
  .ai-msg__markdown :deep(.ai-md-code-block),
  .ai-msg__markdown :deep(.ai-md-table-scroll),
  .ai-msg__markdown :deep(h1),
  .ai-msg__markdown :deep(h2),
  .ai-msg__markdown :deep(h3),
  .ai-msg__markdown :deep(hr) {
    margin: 0 0 8px;
  }

  .ai-msg__markdown :deep(p:last-child),
  .ai-msg__markdown :deep(ul:last-child),
  .ai-msg__markdown :deep(ol:last-child),
  .ai-msg__markdown :deep(pre:last-child),
  .ai-msg__markdown :deep(blockquote:last-child),
  .ai-msg__markdown :deep(.ai-md-code-block:last-child),
  .ai-msg__markdown :deep(.ai-md-table-scroll:last-child),
  .ai-msg__markdown :deep(hr:last-child) {
    margin-bottom: 0;
  }

  .ai-msg__markdown :deep(p),
  .ai-msg__markdown :deep(li),
  .ai-msg__markdown :deep(th),
  .ai-msg__markdown :deep(td),
  .ai-msg__markdown :deep(a) {
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .ai-msg__markdown :deep(ul),
  .ai-msg__markdown :deep(ol) {
    margin-left: 0;
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

  .ai-msg__markdown :deep(h1) {
    font-size: 0.9375rem;
    line-height: 1.55;
  }

  .ai-msg__markdown :deep(h2) {
    font-size: 0.84375rem;
    line-height: 1.6;
  }

  .ai-msg__markdown :deep(h3) {
    font-size: 0.78125rem;
    line-height: 1.65;
  }

  .ai-msg__markdown :deep(code) {
    padding: 1px 4px;
    border: 1px solid rgba(200, 164, 92, 0.12);
    border-radius: 4px;
    background: var(--ai-assistant-markdown-soft-bg, rgba(255, 255, 255, 0.04));
    color: rgb(var(--color-text) / 0.88);
    font-family: Consolas, 'Courier New', monospace;
    white-space: break-spaces;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .ai-msg__markdown :deep(.ai-md-code-block) {
    position: relative;
    max-width: 100%;
  }

  .ai-msg__markdown :deep(.ai-md-code-copy) {
    position: absolute;
    top: 6px;
    right: 6px;
    min-height: 24px;
    padding: 2px 7px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.32);
    color: rgb(var(--color-text) / 0.84);
    font-size: 0.625rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .ai-msg__markdown :deep(.ai-md-code-copy:hover) {
    border-color: rgba(200, 164, 92, 0.42);
    color: var(--color-accent);
  }

  .ai-msg__markdown :deep(pre) {
    max-width: 100%;
    overflow: auto;
    padding: 34px 10px 10px;
    border: 1px solid var(--ai-assistant-markdown-border, rgba(200, 164, 92, 0.18));
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.24);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .ai-msg__markdown :deep(pre code) {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .ai-msg__markdown :deep(a) {
    color: #9fd3ff;
    text-decoration: underline;
  }

  .ai-msg__markdown :deep(blockquote) {
    padding: 8px 10px;
    border-left: 3px solid rgba(248, 209, 122, 0.52);
    border-radius: 4px;
    background: rgba(248, 209, 122, 0.06);
  }

  .ai-msg__markdown :deep(blockquote p:last-child) {
    margin-bottom: 0;
  }

  .ai-msg__markdown :deep(hr) {
    height: 0;
    border: 0;
    border-top: 1px solid var(--ai-assistant-markdown-border, rgba(200, 164, 92, 0.18));
  }

  .ai-msg__markdown :deep(img) {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .ai-msg__markdown :deep(.ai-md-table-scroll) {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    border: 1px solid var(--ai-assistant-markdown-border, rgba(200, 164, 92, 0.18));
    border-radius: 6px;
    scrollbar-width: thin;
  }

  .ai-msg__markdown :deep(table) {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: 0.6875rem;
    line-height: 1.55;
  }

  .ai-msg__markdown :deep(th),
  .ai-msg__markdown :deep(td) {
    max-width: min(220px, 70vw);
    padding: 6px 8px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    text-align: left;
    vertical-align: top;
    white-space: normal;
  }

  .ai-msg__markdown :deep(th) {
    background: rgba(200, 164, 92, 0.1);
    color: var(--color-accent);
    font-weight: 600;
  }

  .ai-msg__markdown :deep(td[data-align='center']),
  .ai-msg__markdown :deep(th[data-align='center']) {
    text-align: center;
  }

  .ai-msg__markdown :deep(td[data-align='right']),
  .ai-msg__markdown :deep(th[data-align='right']) {
    text-align: right;
  }

  .ai-msg__answer {
    display: flex;
    min-width: 0;
    max-width: 100%;
    flex-direction: column;
    gap: 8px;
  }

  .ai-msg__answer-blocks {
    display: flex;
    min-width: 0;
    max-width: 100%;
    flex-direction: column;
    gap: 7px;
  }

  .ai-answer-block {
    min-width: 0;
    max-width: 100%;
    padding: 8px 10px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-left-width: 3px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.035);
  }

  .ai-answer-block--summary {
    border-left-color: rgba(120, 190, 255, 0.68);
    background: rgba(120, 190, 255, 0.06);
  }

  .ai-answer-block--steps,
  .ai-answer-block--sources {
    border-left-color: var(--ai-assistant-info-border, rgba(120, 190, 255, 0.28));
  }

  .ai-answer-block--notice,
  .ai-answer-block--fallback,
  .ai-answer-block--uncertainty {
    border-left-color: var(--ai-assistant-warn-border, rgba(248, 209, 122, 0.42));
    background: rgba(248, 209, 122, 0.055);
  }

  .ai-answer-block--risk {
    border-left-color: var(--ai-assistant-risk-border, rgba(255, 137, 137, 0.38));
    background: rgba(255, 137, 137, 0.055);
  }

  .ai-answer-block__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    margin-bottom: 5px;
  }

  .ai-answer-block__title {
    min-width: 0;
    color: var(--color-accent);
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .ai-answer-block__copy {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    padding: 2px 7px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.18);
    color: rgb(var(--color-text) / 0.82);
    font-size: 0.625rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .ai-answer-block__copy:hover {
    border-color: rgba(200, 164, 92, 0.42);
    color: var(--color-accent);
  }

  .ai-answer-block__body {
    color: rgb(var(--color-text) / 0.9);
  }

  .ai-answer-block__body :deep(p),
  .ai-answer-block__body :deep(ul),
  .ai-answer-block__body :deep(ol) {
    margin-bottom: 0;
  }

  .ai-msg__full-answer {
    min-width: 0;
    max-width: 100%;
    padding-top: 6px;
    border-top: 1px solid rgba(200, 164, 92, 0.14);
  }

  .ai-msg__full-answer summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: rgb(var(--color-text) / 0.78);
    font-size: 0.6875rem;
    line-height: 1.5;
    cursor: pointer;
    list-style: none;
    overflow-wrap: anywhere;
  }

  .ai-msg__full-answer summary::-webkit-details-marker {
    display: none;
  }

  .ai-msg__full-answer .ai-msg__markdown {
    margin-top: 8px;
  }

  .ai-msg__pending {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    min-width: 0;
  }

  .ai-msg__pending-dot {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 999px;
    background: #9fd3ff;
    box-shadow: 0 0 0 0 rgba(159, 211, 255, 0.42);
    animation: ai-pending-pulse 1.4s ease-in-out infinite;
  }

  .ai-msg__pending-title,
  .ai-msg__pending-detail {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .ai-msg__pending-title {
    color: #cfe9ff;
    font-size: 0.75rem;
    line-height: 1.65;
  }

  .ai-msg__pending-detail {
    color: rgb(var(--color-text) / 0.68);
    font-size: 0.6875rem;
    line-height: 1.55;
  }

  .ai-msg__streaming {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    color: rgb(var(--color-text) / 0.68);
    font-size: 0.6875rem;
    line-height: 1.55;
  }

  .ai-msg__streaming-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #9fd3ff;
    box-shadow: 0 0 0 0 rgba(159, 211, 255, 0.42);
    animation: ai-pending-pulse 1.4s ease-in-out infinite;
  }

  .ai-msg__retry {
    margin-top: 8px;
  }

  .ai-msg__inline-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    margin-top: 6px;
    padding: 3px 7px;
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    color: rgb(var(--color-text) / 0.86);
    font-size: 0.6875rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .ai-msg__inline-btn:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  .ai-msg__inline-btn:not(:disabled):hover {
    border-color: rgba(200, 164, 92, 0.42);
    color: var(--color-accent);
  }

  @keyframes ai-pending-pulse {
    0%,
    100% {
      opacity: 0.62;
      box-shadow: 0 0 0 0 rgba(159, 211, 255, 0.36);
    }

    50% {
      opacity: 1;
      box-shadow: 0 0 0 5px rgba(159, 211, 255, 0);
    }
  }

  .ai-msg__actions {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .ai-msg__action-btn {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-height: 26px;
    padding: 4px 8px;
    border: 1px solid rgba(120, 190, 255, 0.28);
    border-radius: 4px;
    background: rgba(120, 190, 255, 0.08);
    color: #bfe3ff;
    font-size: 0.6875rem;
    line-height: 1.35;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .ai-msg__action-btn:hover {
    border-color: rgba(120, 190, 255, 0.48);
    background: rgba(120, 190, 255, 0.14);
  }

  .ai-msg__action-btn--done {
    border-color: rgba(132, 211, 139, 0.36);
    color: #bff2c3;
    background: rgba(132, 211, 139, 0.1);
  }

  .ai-msg__action-feedback {
    flex: 1 1 100%;
    margin: 0;
    color: rgb(var(--color-text) / 0.72);
    font-size: 0.625rem;
    line-height: 1.45;
  }

  .ai-msg__sources {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ai-msg__meta {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.6875rem;
    color: rgb(var(--color-text) / 0.78);
  }

  .ai-msg__meta-line {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ai-meta-pill,
  .ai-evidence-chip {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 2px 6px;
    border: 1px solid rgba(200, 164, 92, 0.22);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.03);
    color: rgb(var(--color-text));
    line-height: 1.4;
  }

  .ai-meta-pill--provider {
    border-color: rgba(120, 190, 255, 0.32);
    color: #9fd3ff;
  }

  .ai-meta-pill--draft {
    border-color: rgba(248, 209, 122, 0.34);
    color: #f8d17a;
  }

  .ai-meta-pill--fallback {
    border-color: rgba(248, 209, 122, 0.32);
    color: #f8d17a;
  }

  .ai-meta-pill--guard {
    border-color: rgba(255, 137, 137, 0.36);
    color: #ffb2b2;
  }

  .ai-msg__evidence {
    border-top: 1px solid rgba(200, 164, 92, 0.14);
    padding-top: 6px;
  }

  .ai-msg__evidence summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    color: rgb(var(--color-text) / 0.84);
    list-style: none;
  }

  .ai-msg__evidence summary::-webkit-details-marker {
    display: none;
  }

  .ai-evidence-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  .ai-evidence-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .ai-evidence-title {
    flex: 1 1 140px;
    min-width: 0;
    color: rgb(var(--color-text));
    overflow-wrap: anywhere;
  }

  .ai-evidence-chip {
    min-height: 18px;
    padding: 1px 5px;
    font-size: 0.625rem;
    color: rgb(var(--color-text) / 0.76);
  }

  .ai-evidence-chip--warn {
    color: #f8d17a;
  }

  .ai-msg__uncertain {
    margin-top: 6px;
    padding: 6px 8px;
    border-left: 2px solid rgba(248, 209, 122, 0.55);
    background: rgba(248, 209, 122, 0.06);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .ai-msg__debug {
    margin-top: 6px;
  }

  .ai-msg__debug-copy {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    margin-top: 6px;
    padding: 3px 7px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    color: rgb(var(--color-text) / 0.82);
    font-size: 0.625rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .ai-msg__debug-copy:hover {
    border-color: rgba(200, 164, 92, 0.42);
    color: var(--color-accent);
  }

  .ai-msg__debug pre {
    max-width: 100%;
    max-height: 220px;
    margin: 6px 0 0;
    padding: 8px;
    overflow: auto;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.26);
    color: rgb(var(--color-text) / 0.86);
    font-size: 0.625rem;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .ai-source-tag,
  .ai-quick-btn {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid rgba(200, 164, 92, 0.22);
    border-radius: 999px;
    font-size: 0.6875rem;
    color: rgb(var(--color-text));
    background: rgba(255, 255, 255, 0.02);
  }

  .ai-panel__quick {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    max-height: 56px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    padding: 1px 2px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .ai-panel__quick::-webkit-scrollbar {
    display: none;
  }

  .ai-quick-btn {
    cursor: pointer;
    flex: 0 0 auto;
    max-width: min(78vw, 260px);
    min-height: 32px;
    line-height: 1.35;
    text-align: left;
    white-space: normal;
  }

  .ai-quick-btn__text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .ai-quick-btn:hover {
    border-color: rgba(200, 164, 92, 0.45);
    color: var(--color-accent);
  }

  .ai-panel__input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: constant(safe-area-inset-bottom, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    scroll-margin-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }

  .ai-panel__input-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgb(var(--color-bg));
    color: rgb(var(--color-text));
    border: 1px solid rgba(200, 164, 92, 0.25);
    border-radius: 2px;
    outline: none;
    font-size: 0.75rem;
    box-sizing: border-box;
    resize: vertical;
    min-height: 76px;
    max-height: 28dvh;
  }

  .ai-textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  @media (max-width: 768px) {
    .ai-fab {
      left: var(--ai-assistant-mobile-edge, 8px);
      bottom: calc(var(--ai-assistant-mobile-edge, 8px) + constant(safe-area-inset-bottom, 0px));
      bottom: calc(var(--ai-assistant-mobile-edge, 8px) + env(safe-area-inset-bottom, 0px));
      padding: 10px;
    }

    .ai-fab span {
      display: none;
    }

    .ai-panel-wrap {
      top: calc(var(--ai-assistant-mobile-edge, 8px) + constant(safe-area-inset-top, 0px));
      top: calc(var(--ai-assistant-mobile-edge, 8px) + env(safe-area-inset-top, 0px));
      left: var(--ai-assistant-mobile-edge, 8px);
      right: var(--ai-assistant-mobile-edge, 8px);
      justify-content: stretch;
      align-items: flex-end;
      bottom: calc(60px + constant(safe-area-inset-bottom, 0px));
      bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    }

    .ai-panel {
      width: 100%;
      max-height: min(100%, calc(100dvh - 76px - env(safe-area-inset-bottom, 0px)));
      gap: 8px;
      padding-bottom: calc(var(--spacing-3) + env(safe-area-inset-bottom, 0px));
    }

    .ai-panel__header {
      gap: 8px;
      align-items: flex-start;
    }

    .ai-panel__more-menu {
      max-width: calc(100vw - 32px);
    }

    .ai-panel__messages {
      min-height: 120px;
      max-height: none;
    }

    .ai-msg__bubble {
      max-width: 94%;
    }

    .ai-panel__input-actions {
      align-items: stretch;
    }

    .ai-panel__input-actions p {
      flex: 1 1 100%;
      margin: 0;
    }

    .ai-panel__send {
      min-height: var(--ai-assistant-touch-target, 44px);
      width: 100%;
    }
  }
</style>
