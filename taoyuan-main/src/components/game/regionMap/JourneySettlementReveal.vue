<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import type { PanelKey } from '@/composables/useNavigation'

  type StatusChip = {
    statusLabel: string
    statusToneClass: string
  }

  type SettlementAction = {
    key: PanelKey
    label: string
  }

  type SettlementActionCard = SettlementAction & {
    summary: string
    reason: string
  } & StatusChip

  type JourneyHandoffReceiptSection = {
    title: string
    lines: string[]
  } & StatusChip

  type JourneyHandoffBoard = {
    headline: string
    resourceLines: string[]
    actionCards: SettlementActionCard[]
    whyNowLines: string[]
    receiptSections: JourneyHandoffReceiptSection[]
  }

  const props = defineProps<{
    journeyLines: string[]
    rewardLines: string[]
    aftermathLines: string[]
    handoffBoard: JourneyHandoffBoard | null
    actions: SettlementAction[]
  }>()

  const emit = defineEmits<{
    navigate: [panelKey: PanelKey]
    close: []
  }>()

  const stageIndex = ref(0)
  const revealedLineCount = ref(1)
  const stageDefs = computed(() => [
    { key: 'journey', label: '旅程回顾', lines: props.journeyLines, toneClass: 'border-accent/20 bg-bg/70' },
    { key: 'reward', label: '回流分发', lines: props.rewardLines, toneClass: 'border-success/20 bg-success/5' },
    { key: 'aftermath', label: '旅后承接', lines: props.aftermathLines, toneClass: 'border-accent/20 bg-accent/5' }
  ])

  let timers: number[] = []

  const clearTimers = () => {
    timers.forEach(timer => window.clearTimeout(timer))
    timers = []
  }

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.push(timer)
  }

  const revealCurrentStage = () => {
    clearTimers()
    revealedLineCount.value = 1
    const total = Math.min(4, Math.max(1, stageDefs.value[stageIndex.value]?.lines.length ?? 0))
    for (let index = 2; index <= total; index += 1) {
      schedule(() => {
        revealedLineCount.value = index
      }, 160 * index)
    }
  }

  const currentStage = computed(() => {
    const fallback = { key: 'journey', label: '旅程回顾', lines: [] as string[], toneClass: 'border-accent/20 bg-bg/70' }
    return stageDefs.value[stageIndex.value] ?? stageDefs.value[0] ?? fallback
  })
  const visibleCurrentLines = computed(() =>
    currentStage.value.lines.slice(0, Math.max(1, revealedLineCount.value))
  )

  const openStage = (target: number) => {
    stageIndex.value = Math.max(0, Math.min(target, stageDefs.value.length - 1))
    revealCurrentStage()
  }

  const nextStage = () => {
    if (stageIndex.value >= stageDefs.value.length - 1) return
    openStage(stageIndex.value + 1)
  }

  watch(
    () => `${props.journeyLines.join('|')}::${props.rewardLines.join('|')}::${props.aftermathLines.join('|')}`,
    () => {
      stageIndex.value = 0
      revealCurrentStage()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    clearTimers()
  })
</script>

<template>
  <div data-testid="journey-settlement-reveal">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(stage, index) in stageDefs"
          :key="stage.key"
          class="border rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
          :class="stageIndex === index ? 'border-accent text-accent' : 'border-accent/10 text-muted'"
          @click="openStage(index)"
        >
          {{ index + 1 }}. {{ stage.label }}
        </button>
      </div>
      <button
        v-if="stageIndex < stageDefs.length - 1"
        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
        data-testid="journey-settlement-next"
        @click="nextStage"
      >
        继续揭示
      </button>
    </div>

    <div class="mt-3 space-y-3">
      <div
        v-for="(stage, index) in stageDefs"
        v-show="stageIndex >= index"
        :key="`stage-panel-${stage.key}`"
        class="border rounded-xs px-3 py-3"
        :class="stage.toneClass"
        :data-testid="`journey-settlement-stage-${stage.key}`"
      >
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-[10px] text-muted">{{ stage.label }}</p>
          <span class="text-[10px]" :class="stageIndex === index ? 'text-accent' : 'text-muted'">
            {{ stageIndex === index ? '当前揭示' : '已展开' }}
          </span>
        </div>
        <div class="space-y-1">
          <p
            v-for="line in stageIndex === index ? visibleCurrentLines : stage.lines"
            :key="`${stage.key}-${line}`"
            class="text-[11px] leading-5"
            :class="stage.key === 'reward' && (line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还')) ? 'text-success' : 'text-muted'"
          >
            - {{ line }}
          </p>
        </div>
      </div>

      <div v-if="stageIndex >= 2 && handoffBoard" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
        <p class="text-[10px] text-muted">回流承接入口</p>
        <p class="text-xs text-accent mt-1">{{ handoffBoard.headline }}</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/70">
            <p class="text-[10px] text-muted mb-2">资源去向</p>
            <div class="space-y-1">
              <p v-for="line in handoffBoard.resourceLines" :key="`handoff-resource-${line}`" class="text-[10px] text-muted leading-4">
                - {{ line }}
              </p>
            </div>
          </div>

          <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
            <p class="text-[10px] text-muted mb-2">推荐动作</p>
            <div class="space-y-2">
              <div
                v-for="action in handoffBoard.actionCards"
                :key="`handoff-action-${action.key}`"
                class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-[10px] text-accent">去{{ action.label }}</p>
                      <span class="text-[10px] shrink-0" :class="action.statusToneClass">{{ action.statusLabel }}</span>
                    </div>
                    <p class="text-[10px] text-muted mt-1 leading-4">{{ action.summary }}</p>
                    <p class="text-[10px] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                  </div>
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
                    @click="emit('navigate', action.key)"
                  >
                    前往
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/70">
            <p class="text-[10px] text-muted mb-2">为什么现在去</p>
            <div class="space-y-1">
              <p v-for="line in handoffBoard.whyNowLines" :key="`handoff-why-${line}`" class="text-[10px] text-muted leading-4">
                - {{ line }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="handoffBoard.receiptSections.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div
            v-for="section in handoffBoard.receiptSections"
            :key="`handoff-receipt-${section.title}`"
            class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/70"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-[10px] text-muted">{{ section.title }}</p>
              <span class="text-[10px] shrink-0" :class="section.statusToneClass">{{ section.statusLabel }}</span>
            </div>
            <div class="space-y-1">
              <p v-for="line in section.lines" :key="`handoff-receipt-line-${section.title}-${line}`" class="text-[10px] text-muted leading-4">
                - {{ line }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="stageIndex >= 2 && actions.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="action in actions"
          :key="`settlement-action-${action.key}`"
          class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
          @click="emit('navigate', action.key)"
        >
          去{{ action.label }}
        </button>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap justify-between gap-2">
      <button
        v-if="stageIndex < stageDefs.length - 1"
        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-muted hover:bg-accent/5"
        @click="openStage(stageDefs.length - 1)"
      >
        直接看承接
      </button>
      <button
        v-else
        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-muted hover:bg-accent/5"
        @click="emit('close')"
      >
        收起回执
      </button>
    </div>
  </div>
</template>
