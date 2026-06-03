<template>
  <OnlineActionDialog
    :open="open"
    title="发布求助单"
    description="分步填写类型、需求、协作方式和回报；没有发布成功前，草稿会留在这里。"
    :running="running"
    :close-on-backdrop="!running"
    @close="requestClose"
    @cancel="requestClose"
  >
    <div class="space-y-3" data-testid="online-order-wizard">
      <ol class="grid grid-cols-5 gap-1 text-[10px] leading-4" aria-label="发布委托步骤">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="border px-2 py-1.5"
          :class="index === currentStepIndex ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/10 text-muted'"
        >
          <span class="block truncate">{{ index + 1 }}. {{ step.label }}</span>
        </li>
      </ol>

      <OnlineStatusBanner
        v-if="errorMessage"
        tone="danger"
        title="求助单暂时没有发布成功"
        :description="errorMessage"
      />

      <section
        v-show="activeStepId === 'type'"
        class="space-y-3"
        data-testid="online-order-wizard-step-type"
        aria-labelledby="online-order-wizard-step-type-title"
      >
        <div>
          <p id="online-order-wizard-step-type-title" class="text-sm leading-5 text-accent">选择类型和可见范围</p>
          <p class="mt-1 text-xs leading-5 text-muted">先说明这张单是什么类别、谁能看到，后面再补具体需求。</p>
        </div>

        <div v-if="targetDraftSummary" class="border border-accent/15 bg-accent/5 px-3 py-2 text-xs text-muted">
          {{ targetDraftSummary }}
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            求助类别
            <select v-model="coopOrderStore.orderTypeDraft" data-testid="online-orders-publish-type-select" class="online-select" :disabled="running">
              <option v-for="option in orderTypeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            可见范围
            <select v-model="coopOrderStore.scopeDraft" data-testid="online-orders-publish-scope-select" class="online-select" :disabled="running">
              <option v-for="option in scopeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </section>

      <section
        v-show="activeStepId === 'need'"
        class="space-y-3"
        data-testid="online-order-wizard-step-need"
        aria-labelledby="online-order-wizard-step-need-title"
      >
        <div>
          <p id="online-order-wizard-step-need-title" class="text-sm leading-5 text-accent">写清需求和时间</p>
          <p class="mt-1 text-xs leading-5 text-muted">标题、截止时间和说明会帮助别人快速判断要帮什么、需要多少。</p>
        </div>

        <label class="flex flex-col gap-1 text-[10px] text-muted">
          求助标题
          <input
            v-model="coopOrderStore.titleDraft"
            data-testid="online-orders-publish-title-input"
            maxlength="40"
            class="online-input"
            placeholder="例如：缺一批冬菜备节"
            :disabled="running"
          />
        </label>

        <label class="flex flex-col gap-1 text-[10px] text-muted">
          截止时间
          <input
            v-model="coopOrderStore.deadlineAtDraft"
            data-testid="online-orders-publish-deadline-input"
            type="datetime-local"
            class="online-input"
            :disabled="running"
          />
        </label>

        <label class="flex flex-col gap-1 text-[10px] text-muted">
          求助内容
          <textarea
            v-model="coopOrderStore.descriptionDraft"
            data-testid="online-orders-publish-description-input"
            rows="4"
            maxlength="160"
            class="online-textarea resize-none"
            placeholder="写清楚当前缺什么、希望别人怎么帮、为什么这单值得接。"
            :disabled="running"
          />
        </label>
      </section>

      <section
        v-show="activeStepId === 'mode'"
        class="space-y-3"
        data-testid="online-order-wizard-step-mode"
        aria-labelledby="online-order-wizard-step-mode-title"
      >
        <div>
          <p id="online-order-wizard-step-mode-title" class="text-sm leading-5 text-accent">设置协作模式</p>
          <p class="mt-1 text-xs leading-5 text-muted">单阶段适合一人完成；接力单可以把目标数量拆给不同玩家。</p>
        </div>

        <label class="flex flex-col gap-1 text-[10px] text-muted">
          协作模式
          <select v-model="coopOrderStore.collaborationModeDraft" data-testid="online-orders-publish-mode-select" class="online-select" :disabled="running">
            <option value="single">单阶段委托</option>
            <option value="multi_stage">多段接力单</option>
          </select>
        </label>

        <div v-if="coopOrderStore.collaborationModeDraft === 'multi_stage'" class="space-y-2 border border-accent/10 bg-black/10 p-2">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-xs text-accent">接力阶段</p>
              <p class="mt-1 text-[10px] text-muted">至少补齐 2 个子目标；每段都可以写目标资源和数量。</p>
            </div>
            <button
              class="online-action-btn online-action-btn--compact shrink-0 justify-center"
              type="button"
              :disabled="running"
              @click="coopOrderStore.addStageDraft()"
            >
              <Plus :size="12" />
              新增阶段
            </button>
          </div>

          <OnlineEmptyState
            v-if="coopOrderStore.stageDrafts.length === 0"
            title="还没有接力阶段"
            description="多段接力单至少需要 2 个子目标；先补齐每段要做什么，再发布给不同玩家接力。"
            primary-label="新增阶段"
            @primary="coopOrderStore.addStageDraft()"
          />
          <div
            v-for="(stage, index) in coopOrderStore.stageDrafts"
            :key="stage.id"
            class="space-y-2 border border-accent/10 bg-bg/40 p-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">阶段 {{ index + 1 }}</p>
              <button
                class="online-action-btn online-action-btn--danger online-action-btn--compact"
                type="button"
                :disabled="running"
                @click="coopOrderStore.removeStageDraft(stage.id)"
              >
                <Trash2 :size="12" />
                删除
              </button>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <input
                v-model="stage.title"
                maxlength="40"
                class="online-input"
                placeholder="阶段标题，例如：先补齐冬菜"
                :disabled="running"
              />
              <select v-model="stage.preferredOrderType" class="online-select" :disabled="running">
                <option v-for="option in orderTypeOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model="stage.targetItemId"
                maxlength="40"
                class="online-input"
                placeholder="目标资源 ID，例如 wheat"
                :disabled="running"
              />
              <input
                v-model.number="stage.targetQuantity"
                type="number"
                min="1"
                class="online-input"
                placeholder="数量"
                :disabled="running"
              />
            </div>
            <textarea
              v-model="stage.description"
              rows="2"
              maxlength="120"
              class="online-textarea w-full resize-none"
              placeholder="告诉接力的人这一段具体要做什么。"
              :disabled="running"
            />
          </div>
        </div>
      </section>

      <section
        v-show="activeStepId === 'reward'"
        class="space-y-3"
        data-testid="online-order-wizard-step-reward"
        aria-labelledby="online-order-wizard-step-reward-title"
      >
        <div>
          <p id="online-order-wizard-step-reward-title" class="text-sm leading-5 text-accent">设置回报</p>
          <p class="mt-1 text-xs leading-5 text-muted">回报会在结算凭证里记录，接力单会按阶段拆分。</p>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            回报类型
            <select v-model="coopOrderStore.rewardTypeDraft" data-testid="online-orders-publish-reward-type-select" class="online-select" :disabled="running">
              <option v-for="option in rewardTypeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            回报数值
            <input
              v-model.number="coopOrderStore.rewardValueDraft"
              data-testid="online-orders-publish-reward-value-input"
              type="number"
              min="1"
              class="online-input"
              :disabled="running"
            />
          </label>
        </div>

        <label class="flex flex-col gap-1 text-[10px] text-muted">
          回报说明
          <input
            v-model="coopOrderStore.rewardLabelDraft"
            data-testid="online-orders-publish-reward-label-input"
            maxlength="40"
            class="online-input"
            placeholder="例如：铜钱回报 / 人情回礼 / 节庆礼包"
            :disabled="running"
          />
        </label>
      </section>

      <section
        v-show="activeStepId === 'review'"
        class="space-y-3"
        data-testid="online-order-wizard-step-review"
        aria-labelledby="online-order-wizard-step-review-title"
      >
        <div>
          <p id="online-order-wizard-step-review-title" class="text-sm leading-5 text-accent">确认发布</p>
          <p class="mt-1 text-xs leading-5 text-muted">确认后开始发布；如果没有成功，弹窗会保持打开并保留草稿。</p>
        </div>

        <dl class="grid gap-2 text-[10px] leading-4" data-testid="online-order-wizard-review-summary">
          <div class="game-panel-muted p-2">
            <dt class="text-muted">求助单</dt>
            <dd class="mt-1 text-xs text-accent">{{ titleSummary }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">类型与范围</dt>
            <dd class="mt-1 text-xs text-accent">{{ selectedOrderTypeLabel }} · {{ selectedScopeLabel }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">需求和数量</dt>
            <dd class="mt-1 text-xs text-accent">{{ needSummary }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">协作方式</dt>
            <dd class="mt-1 text-xs text-accent">{{ collaborationSummary }}</dd>
          </div>
          <div class="game-panel-muted p-2">
            <dt class="text-muted">回报</dt>
            <dd class="mt-1 text-xs text-accent">{{ rewardSummary }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <template #footer>
      <footer class="space-y-3 border-t border-accent/10 pt-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[10px] leading-4 text-muted">
            {{ activeStepIndexLabel }} · {{ activeStep.summary }}
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              data-testid="online-order-wizard-back"
              :disabled="running || !canGoBack"
              @click="goBack"
            >
              <ChevronLeft :size="12" />
              上一步
            </button>
            <button
              v-if="!isReviewStep"
              type="button"
              class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
              data-testid="online-order-wizard-next"
              :disabled="running"
              @click="goNext"
            >
              下一步
              <ChevronRight :size="12" />
            </button>
            <button
              v-else
              type="button"
              class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
              data-testid="online-orders-publish-submit"
              :disabled="running"
              @click="submit"
            >
              <Send :size="12" />
              {{ running ? '发布中' : '发布求助单' }}
            </button>
          </div>
        </div>
      </footer>
    </template>
  </OnlineActionDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ChevronLeft, ChevronRight, Plus, Send, Trash2 } from 'lucide-vue-next'
  import OnlineActionDialog from '@/components/game/online/OnlineActionDialog.vue'
  import OnlineEmptyState from '@/components/game/online/OnlineEmptyState.vue'
  import OnlineStatusBanner from '@/components/game/online/OnlineStatusBanner.vue'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import type { OnlineCoopOrderScope, OnlineCoopOrderType, OnlineCoopRewardType } from '@/utils/onlineProfileApi'

  type Option<T extends string> = { id: T; label: string }
  type StepId = 'type' | 'need' | 'mode' | 'reward' | 'review'
  type StepMeta = { id: StepId; label: string; summary: string }

  const props = withDefaults(defineProps<{
    open: boolean
    running?: boolean
    errorMessage?: string
    targetDraftSummary?: string
    orderTypeOptions: Array<Option<OnlineCoopOrderType>>
    scopeOptions: Array<Option<OnlineCoopOrderScope>>
    rewardTypeOptions: Array<Option<OnlineCoopRewardType>>
  }>(), {
    running: false,
    errorMessage: '',
    targetDraftSummary: '',
  })

  const emit = defineEmits<{
    close: []
    submit: []
  }>()

  const coopOrderStore = useCoopOrderStore()
  const currentStepIndex = ref(0)
  const steps: StepMeta[] = [
    { id: 'type', label: '类型', summary: '选择求助类别和谁能看到。' },
    { id: 'need', label: '需求', summary: '写清标题、截止时间和需要别人帮什么。' },
    { id: 'mode', label: '协作', summary: '选择一人完成，或拆成多段接力。' },
    { id: 'reward', label: '回报', summary: '说明结算回报和备注。' },
    { id: 'review', label: '确认', summary: '检查无误后发布求助单。' },
  ]

  const activeStep = computed(() => steps[currentStepIndex.value] || steps[0]!)
  const activeStepId = computed(() => activeStep.value.id)
  const canGoBack = computed(() => currentStepIndex.value > 0)
  const isReviewStep = computed(() => activeStepId.value === 'review')
  const activeStepIndexLabel = computed(() => `第 ${currentStepIndex.value + 1} / ${steps.length} 步`)
  const selectedOrderTypeLabel = computed(() =>
    props.orderTypeOptions.find(option => option.id === coopOrderStore.orderTypeDraft)?.label || coopOrderStore.orderTypeDraft
  )
  const selectedScopeLabel = computed(() =>
    props.scopeOptions.find(option => option.id === coopOrderStore.scopeDraft)?.label || coopOrderStore.scopeDraft
  )
  const selectedRewardTypeLabel = computed(() =>
    props.rewardTypeOptions.find(option => option.id === coopOrderStore.rewardTypeDraft)?.label || coopOrderStore.rewardTypeDraft
  )
  const titleSummary = computed(() => coopOrderStore.titleDraft.trim() || '还没填写标题')
  const deadlineSummary = computed(() => coopOrderStore.deadlineAtDraft || '未设置截止时间')
  const validStageCount = computed(() => coopOrderStore.stageDrafts.filter(stage => stage.title.trim()).length)
  const needSummary = computed(() => {
    if (coopOrderStore.collaborationModeDraft === 'multi_stage') {
      const quantities = coopOrderStore.stageDrafts
        .filter(stage => stage.title.trim())
        .map(stage => `${stage.title.trim()} ×${Math.max(1, Math.floor(Number(stage.targetQuantity) || 1))}`)
      return quantities.length > 0 ? quantities.join('、') : '接力阶段还没补齐'
    }
    return `${coopOrderStore.descriptionDraft.trim() || '还没填写求助内容'} · 截止 ${deadlineSummary.value}`
  })
  const collaborationSummary = computed(() =>
    coopOrderStore.collaborationModeDraft === 'multi_stage'
      ? `多段接力单 · 已填写 ${validStageCount.value} 段`
      : '单阶段委托'
  )
  const rewardSummary = computed(() =>
    `${selectedRewardTypeLabel.value} ${Math.max(1, Math.floor(Number(coopOrderStore.rewardValueDraft) || 0))}${coopOrderStore.rewardLabelDraft.trim() ? ` · ${coopOrderStore.rewardLabelDraft.trim()}` : ''}`
  )

  const goBack = () => {
    if (!canGoBack.value || props.running) return
    currentStepIndex.value -= 1
  }

  const goNext = () => {
    if (props.running || currentStepIndex.value >= steps.length - 1) return
    currentStepIndex.value += 1
  }

  const requestClose = () => {
    if (props.running) return
    emit('close')
  }

  const submit = () => {
    if (props.running) return
    emit('submit')
  }

  watch(
    () => props.open,
    isOpen => {
      if (isOpen) {
        currentStepIndex.value = 0
      }
    }
  )
</script>
