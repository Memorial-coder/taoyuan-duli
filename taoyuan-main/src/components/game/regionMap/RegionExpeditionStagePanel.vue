<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import type {
    RegionCampActionId,
    RegionExpeditionEncounterMemory,
    RegionExpeditionNodeChoice,
    RegionExpeditionSession,
    RegionExpeditionWeather
  } from '@/types/region'

  type RegionExpeditionUiPhase =
    | 'intro'
    | 'node_reveal'
    | 'choice_pick'
    | 'encounter_reveal'
    | 'encounter_result'
    | 'camp_reveal'
    | 'camp_result'
    | 'settlement_reveal'

  type RegionExpeditionPrimaryAction = 'waiting' | 'choice' | 'encounter' | 'camp' | 'settlement'

  type RegionExpeditionRevealState = {
    phase: RegionExpeditionUiPhase
    revealedLineCount: number
    actionLocked: boolean
  }

  type ShortcutSummary = {
    label: string
    toneClass: string
    headline: string
    benefitSummary: string
    level: 'none' | 'marked' | 'shortcut' | 'mastered'
  }

  const props = defineProps<{
    session: RegionExpeditionSession
    regionLabel: string
    statusLabel: string
    playerHp: number
    playerMaxHp: number
    nodeChoices: RegionExpeditionNodeChoice[]
    encounterTrail: RegionExpeditionEncounterMemory[]
    currentNodeHeadline: string
    shortcutSummary: ShortcutSummary | null
    introLines: string[]
    signalLines: string[]
    approachLabel: string
    retreatLabel: string
  }>()

  const emit = defineEmits<{
    advance: [choiceId?: string]
    camp: []
    retreat: []
    settle: []
    resolveCamp: [actionId: RegionCampActionId]
    resolveEncounter: [optionId: 'cautious' | 'balanced' | 'bold']
  }>()

  const CAMP_ACTION_META: Record<RegionCampActionId, { label: string; summary: string; toneClass: string; borderClass: string }> = {
    rest: {
      label: '休整伤势',
      summary: '先稳住生命和士气，再决定接下来怎么推进。',
      toneClass: 'text-success',
      borderClass: 'border-success/20 bg-success/5'
    },
    sort: {
      label: '整理补给',
      summary: '压缩负重和整理收获，让后续推进更轻快。',
      toneClass: 'text-accent',
      borderClass: 'border-accent/20 bg-accent/5'
    },
    mark: {
      label: '标记路线',
      summary: '把入口、坡口和撤离线钉稳，为熟路做准备。',
      toneClass: 'text-success',
      borderClass: 'border-success/20 bg-success/5'
    },
    scout: {
      label: '夜间侦察',
      summary: '换一点风险，提前知道下一段地形和动静。',
      toneClass: 'text-warning',
      borderClass: 'border-warning/20 bg-warning/5'
    }
  }

  const revealState = ref<RegionExpeditionRevealState>({
    phase: 'intro',
    revealedLineCount: 1,
    actionLocked: true
  })

  const snapshot = ref({
    sessionId: '',
    progressStep: -1,
    pendingEncounterId: '',
    campToken: '',
    status: '',
    journalId: ''
  })

  let timers: number[] = []

  const clearTimers = () => {
    timers.forEach(timer => window.clearTimeout(timer))
    timers = []
  }

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.push(timer)
  }

  const latestJournal = computed(() => props.session.journal[props.session.journal.length - 1] ?? null)
  const recentJournal = computed(() => props.session.journal.slice(-3).reverse())
  const nodeTrail = computed(() => props.session.nodeHistory.slice(-8))
  const visibleSignalLines = computed(() => props.signalLines.slice(0, 3))
  const carryPreviewLines = computed(() =>
    props.session.carryItems.slice(0, 4).map(item => `${item.label} x${item.quantity} · ${item.note}`)
  )
  const sceneKey = computed(
    () => `${props.session.sessionId}:${revealState.value.phase}:${props.session.progressStep}:${props.session.pendingEncounter?.id ?? 'none'}:${props.session.campState?.enteredAtStep ?? 'none'}:${props.session.status}`
  )
  const progressPercent = computed(() =>
    props.session.totalSteps > 0 ? Math.max(6, Math.round((props.session.progressStep / props.session.totalSteps) * 100)) : 0
  )

  const getWeatherLabel = (weather: RegionExpeditionWeather) =>
    weather === 'storm' ? '风暴' : weather === 'fog' ? '浓雾' : weather === 'wind' ? '劲风' : '晴稳'

  const getEncounterKindLabel = (kind: RegionExpeditionEncounterMemory['kind'] | null) =>
    kind === 'hazard'
      ? '险段'
      : kind === 'cache'
        ? '收获'
        : kind === 'traveler'
          ? '旅人'
          : kind === 'support'
            ? '支援'
            : kind === 'anomaly'
              ? '异变'
              : kind === 'boss_prep'
                ? '前夜'
                : kind === 'weekly_event'
                  ? '事件'
                  : '未知'

  const getNodeLaneToneClass = (lane: RegionExpeditionNodeChoice['lane']) =>
    lane === 'boss' ? 'text-danger' : lane === 'deep' ? 'text-warning' : lane === 'branch' ? 'text-success' : 'text-accent'

  const getNodeLaneLabel = (lane: RegionExpeditionNodeChoice['lane']) =>
    lane === 'boss' ? '首领压进' : lane === 'deep' ? '深层推进' : lane === 'branch' ? '支线侧探' : '主线推进'

  const getPhaseLabel = (phase: RegionExpeditionUiPhase) =>
    phase === 'intro'
      ? '出发校准'
      : phase === 'node_reveal'
        ? '节点揭示'
        : phase === 'choice_pick'
          ? '节点选择'
          : phase === 'encounter_reveal'
            ? '遭遇逼近'
            : phase === 'encounter_result'
              ? '应对遭遇'
              : phase === 'camp_reveal'
                ? '前线营地'
                : phase === 'camp_result'
                  ? '营地动作'
                  : '返程收束'

  const getPhaseToneClass = (phase: RegionExpeditionUiPhase) =>
    phase === 'encounter_reveal' || phase === 'encounter_result'
      ? props.session.pendingEncounter?.risk === 'high'
        ? 'text-danger'
        : props.session.pendingEncounter?.risk === 'medium'
          ? 'text-warning'
          : 'text-success'
      : phase === 'camp_reveal' || phase === 'camp_result'
        ? 'text-success'
        : phase === 'settlement_reveal'
          ? props.session.status === 'failure'
            ? 'text-danger'
            : 'text-success'
          : 'text-accent'

  const getSceneLines = (phase: RegionExpeditionUiPhase) => {
    if (phase === 'intro') {
      return props.introLines
    }

    if (phase === 'encounter_reveal' || phase === 'encounter_result') {
      return [
        props.session.pendingEncounter?.summary ?? '这段路上有新的动静逼近。',
        ...(props.session.pendingEncounter?.detailLines ?? [])
      ].filter(Boolean)
    }

    if (phase === 'camp_reveal' || phase === 'camp_result') {
      return [
        props.session.campState?.nightEventHint ?? '营火边暂时稳住了队伍。',
        '只能先处理营地动作，完成后才会回到路线推进。'
      ].filter(Boolean)
    }

    if (phase === 'settlement_reveal') {
      return [
        latestJournal.value?.summary ?? '这趟远征已经脱离推进阶段。',
        ...(latestJournal.value?.effects ?? []).slice(0, 2),
        props.session.status === 'ready_to_settle'
          ? '现在可以回城收束，接下来会分成旅程、回流、承接三段揭示。'
          : props.session.status === 'retreated'
            ? '你已经带着现有收获返程，接下来会整理保留下来的成果。'
            : '这趟远征已经中断，接下来会把损失和残留收获一并回执。'
      ].filter(Boolean)
    }

    return [
      latestJournal.value?.summary ?? '下一段路线正在浮出细节。',
      ...(latestJournal.value?.effects ?? []).slice(0, 2),
      ...visibleSignalLines.value.slice(0, 1)
    ].filter(Boolean)
  }

  const visibleSceneLines = computed(() =>
    getSceneLines(revealState.value.phase).slice(0, Math.max(1, revealState.value.revealedLineCount))
  )

  const primaryActionMode = computed<RegionExpeditionPrimaryAction>(() => {
    const phase = revealState.value.phase
    if (phase === 'intro' || phase === 'node_reveal' || phase === 'encounter_reveal' || phase === 'camp_reveal') return 'waiting'
    if (props.session.pendingEncounter) return 'encounter'
    if (props.session.campState) return 'camp'
    if (props.session.status !== 'ongoing') return 'settlement'
    return 'choice'
  })

  const sceneTitle = computed(() => {
    const phase = revealState.value.phase
    if (phase === 'intro') return '整装出发'
    if (phase === 'encounter_reveal' || phase === 'encounter_result') return props.session.pendingEncounter?.title ?? '途中遭遇'
    if (phase === 'camp_reveal' || phase === 'camp_result') return '前线营地'
    if (phase === 'settlement_reveal') {
      return props.session.status === 'ready_to_settle'
        ? '返程收束'
        : props.session.status === 'retreated'
          ? '主动撤退'
          : '远征受阻'
    }
    return props.currentNodeHeadline
  })

  const sceneSummary = computed(() => {
    const phase = revealState.value.phase
    if (phase === 'intro') return `${props.approachLabel} / ${props.retreatLabel}`
    if (phase === 'encounter_reveal' || phase === 'encounter_result') return props.session.pendingEncounter?.summary ?? '先决定如何处理眼前的遭遇。'
    if (phase === 'camp_reveal' || phase === 'camp_result') return props.session.campState?.nightEventHint ?? '营地动作完成后才会继续推进。'
    if (phase === 'settlement_reveal') return '本趟推进已经进入回城阶段。'
    return latestJournal.value?.title ?? '路线正在展开下一步。'
  })

  const scenePanelClass = computed(() => {
    const phase = revealState.value.phase
    if (phase === 'encounter_reveal' || phase === 'encounter_result') return 'border-warning/30 bg-warning/5'
    if (phase === 'camp_reveal' || phase === 'camp_result') return 'border-success/30 bg-success/5'
    if (phase === 'settlement_reveal') {
      return props.session.status === 'failure' ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5'
    }
    return 'border-accent/30 bg-accent/5'
  })

  const prepareReveal = (phase: RegionExpeditionUiPhase, unlockAfter = 620, nextPhase?: RegionExpeditionUiPhase) => {
    clearTimers()
    revealState.value.phase = phase
    revealState.value.revealedLineCount = 1
    revealState.value.actionLocked = true

    const lineTotal = Math.min(3, Math.max(1, getSceneLines(phase).length))
    for (let index = 2; index <= lineTotal; index += 1) {
      schedule(() => {
        revealState.value.revealedLineCount = index
      }, 180 * index)
    }

    if (nextPhase) {
      schedule(() => {
        revealState.value.phase = nextPhase
        revealState.value.revealedLineCount = Math.min(3, Math.max(1, getSceneLines(nextPhase).length))
        revealState.value.actionLocked = false
      }, unlockAfter)
      return
    }

    schedule(() => {
      revealState.value.actionLocked = false
    }, unlockAfter)
  }

  const runIntroSequence = () => {
    prepareReveal('intro', 760)
    schedule(() => {
      if (props.session.pendingEncounter) {
        runEncounterSequence()
        return
      }
      if (props.session.campState) {
        runCampSequence()
        return
      }
      if (props.session.status !== 'ongoing') {
        runSettlementSequence()
        return
      }
      prepareReveal('node_reveal', 620, 'choice_pick')
    }, 760)
  }

  const runNodeSequence = () => {
    prepareReveal('node_reveal', 620, props.session.status === 'ongoing' ? 'choice_pick' : 'settlement_reveal')
  }

  const runEncounterSequence = () => {
    prepareReveal('encounter_reveal', 700, 'encounter_result')
  }

  const runCampSequence = () => {
    prepareReveal('camp_reveal', 700, 'camp_result')
  }

  const runSettlementSequence = () => {
    prepareReveal('settlement_reveal', 360)
  }

  const triggerWithLock = (callback: () => void) => {
    if (revealState.value.actionLocked) return
    revealState.value.actionLocked = true
    schedule(() => {
      revealState.value.actionLocked = false
    }, 1200)
    callback()
  }

  watch(
    () => ({
      sessionId: props.session.sessionId,
      progressStep: props.session.progressStep,
      pendingEncounterId: props.session.pendingEncounter?.id ?? '',
      campToken: props.session.campState ? `${props.session.campState.enteredAtStep}:${props.session.campState.nightEventHint}` : '',
      status: props.session.status,
      journalId: latestJournal.value?.id ?? ''
    }),
    next => {
      const previous = snapshot.value
      const sessionChanged = previous.sessionId !== next.sessionId
      const encounteredNow = !previous.pendingEncounterId && Boolean(next.pendingEncounterId)
      const encounterResolved = Boolean(previous.pendingEncounterId) && !next.pendingEncounterId
      const campOpened = !previous.campToken && Boolean(next.campToken)
      const campResolved = Boolean(previous.campToken) && !next.campToken
      const steppedForward = previous.progressStep !== next.progressStep
      const statusChanged = previous.status !== next.status
      const journalChanged = previous.journalId !== next.journalId

      if (sessionChanged) {
        runIntroSequence()
      } else if (encounteredNow) {
        runEncounterSequence()
      } else if (campOpened) {
        runCampSequence()
      } else if ((encounterResolved || campResolved) && next.status !== 'ongoing') {
        runSettlementSequence()
      } else if (encounterResolved || campResolved || steppedForward || (journalChanged && next.status === 'ongoing')) {
        runNodeSequence()
      } else if (statusChanged && next.status !== 'ongoing') {
        runSettlementSequence()
      }

      snapshot.value = next
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    clearTimers()
  })
</script>

<template>
  <Transition name="panel-fade">
    <div class="fixed inset-0 z-40 overflow-y-auto bg-black/70 px-3 py-4 md:px-6 md:py-6" data-testid="region-expedition-stage">
      <div class="game-panel mx-auto w-full max-w-6xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">远征推进中</p>
            <p class="text-sm text-text mt-1">{{ session.targetName }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              {{ regionLabel }} / {{ session.mode === 'boss' ? '首领远征' : '路线远征' }} / {{ statusLabel }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[10px] text-muted">进度</p>
            <p class="text-sm text-accent">{{ session.progressStep }}/{{ session.totalSteps }}</p>
          </div>
        </div>

        <div class="mt-3 h-1.5 rounded-xs bg-bg/70">
          <div class="h-1.5 rounded-xs bg-accent transition-all duration-500" :style="{ width: `${progressPercent}%` }"></div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <section class="space-y-3">
            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div class="flex items-center justify-between"><span class="text-muted">生命</span><span>{{ playerHp }}/{{ playerMaxHp }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">士气</span><span>{{ session.morale }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">风险</span><span>{{ session.danger }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">视野</span><span>{{ session.visibility }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">负重</span><span>{{ session.carryLoad }}/{{ session.maxCarryLoad }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">发现</span><span>{{ session.findings }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">口粮</span><span>{{ session.supplies.rations }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">药剂/器具</span><span>{{ session.supplies.medicine }} / {{ session.supplies.utility }}</span></div>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">前线态势</p>
                <span class="text-[10px] text-accent">准备 {{ session.frontlinePrep }}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-2">
                <div class="flex items-center justify-between"><span class="text-muted">天气</span><span>{{ getWeatherLabel(session.riskState.weather) }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">污染</span><span>{{ session.riskState.pollution }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">警戒</span><span>{{ session.riskState.alertness }}</span></div>
                <div class="flex items-center justify-between"><span class="text-muted">异变</span><span>{{ session.riskState.anomaly }}</span></div>
              </div>
            </div>

            <div v-if="visibleSignalLines.length > 0" class="border border-warning/20 rounded-xs px-3 py-3 bg-warning/5">
              <p class="text-[10px] text-muted">本次主线信号</p>
              <div class="space-y-1 mt-2">
                <p v-for="line in visibleSignalLines" :key="line" class="text-[10px] text-warning leading-4">
                  ! {{ line }}
                </p>
              </div>
            </div>

            <div v-if="shortcutSummary" class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">熟路态势</p>
                <span class="text-[10px]" :class="shortcutSummary.toneClass">{{ shortcutSummary.label }}</span>
              </div>
              <p class="text-[10px] mt-2 leading-4" :class="shortcutSummary.level === 'none' ? 'text-muted' : 'text-accent'">
                {{ shortcutSummary.headline }}
              </p>
              <p class="text-[10px] mt-1 leading-4" :class="shortcutSummary.level === 'none' ? 'text-muted' : 'text-success'">
                {{ shortcutSummary.benefitSummary }}
              </p>
            </div>
          </section>

          <section class="min-w-0">
            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="entry in nodeTrail"
                  :key="entry.id"
                  class="border rounded-xs px-2 py-1 text-[10px] transition-all"
                  :class="entry.id === session.nodeHistory[session.nodeHistory.length - 1]?.id ? 'border-accent/40 text-accent bg-accent/10' : 'border-accent/10 text-muted bg-bg/70'"
                >
                  {{ entry.step > 0 ? `第${entry.step}步` : '出发' }} · {{ entry.label }}
                </span>
              </div>
            </div>

            <Transition name="panel-fade" mode="out-in">
              <div
                :key="sceneKey"
                class="mt-3 border rounded-xs px-4 py-4 min-h-[360px] flex flex-col justify-between"
                :class="scenePanelClass"
                data-testid="region-expedition-primary-card"
              >
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-[10px]" :class="getPhaseToneClass(revealState.phase)">{{ getPhaseLabel(revealState.phase) }}</p>
                      <p class="text-lg text-text mt-1">{{ sceneTitle }}</p>
                      <p class="text-[11px] text-muted mt-2 leading-5">{{ sceneSummary }}</p>
                    </div>
                    <span class="text-[10px] shrink-0" :class="getPhaseToneClass(revealState.phase)">
                      {{ getPhaseLabel(revealState.phase) }}
                    </span>
                  </div>

                  <div class="space-y-2 mt-4">
                    <p
                      v-for="line in visibleSceneLines"
                      :key="`${revealState.phase}-${line}`"
                      class="text-[11px] leading-5"
                      :class="revealState.phase === 'encounter_reveal' || revealState.phase === 'encounter_result' ? 'text-warning' : revealState.phase === 'camp_reveal' || revealState.phase === 'camp_result' ? 'text-success' : 'text-muted'"
                    >
                      - {{ line }}
                    </p>
                  </div>
                </div>

                <div class="mt-5 space-y-3">
                  <div v-if="primaryActionMode === 'choice'" class="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <button
                      v-for="choice in nodeChoices"
                      :key="choice.id"
                      class="border rounded-xs px-3 py-3 text-left hover:bg-bg/40 disabled:opacity-60"
                      :class="choice.lane === 'branch' ? 'border-success/20' : choice.lane === 'deep' || choice.lane === 'boss' ? 'border-danger/20' : 'border-accent/20'"
                      :disabled="revealState.actionLocked"
                      :data-testid="`region-expedition-choice-${choice.id}`"
                      @click="triggerWithLock(() => emit('advance', choice.id))"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-[10px]" :class="getNodeLaneToneClass(choice.lane)">{{ choice.label }}</p>
                        <span class="text-[10px] text-muted shrink-0">{{ getNodeLaneLabel(choice.lane) }}</span>
                      </div>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ choice.summary }}</p>
                    </button>
                  </div>

                  <div v-else-if="primaryActionMode === 'encounter' && session.pendingEncounter" class="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <button
                      v-for="option in session.pendingEncounter.options"
                      :key="option.id"
                      class="border rounded-xs px-3 py-3 text-left hover:bg-bg/40 disabled:opacity-60"
                      :class="option.tone === 'danger' ? 'border-danger/20' : option.tone === 'success' ? 'border-success/20' : 'border-accent/20'"
                      :disabled="revealState.actionLocked"
                      :data-testid="`region-expedition-encounter-${option.id}`"
                      @click="triggerWithLock(() => emit('resolveEncounter', option.id))"
                    >
                      <p class="text-[10px]" :class="option.tone === 'danger' ? 'text-danger' : option.tone === 'success' ? 'text-success' : 'text-accent'">
                        {{ option.label }}
                      </p>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ option.summary }}</p>
                    </button>
                  </div>

                  <div v-else-if="primaryActionMode === 'camp' && session.campState" class="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <button
                      v-for="actionId in session.campState.availableActionIds"
                      :key="actionId"
                      class="border rounded-xs px-3 py-3 text-left hover:bg-bg/40 disabled:opacity-60"
                      :class="CAMP_ACTION_META[actionId].borderClass"
                      :disabled="revealState.actionLocked"
                      :data-testid="`region-expedition-camp-${actionId}`"
                      @click="triggerWithLock(() => emit('resolveCamp', actionId))"
                    >
                      <p class="text-[10px]" :class="CAMP_ACTION_META[actionId].toneClass">{{ CAMP_ACTION_META[actionId].label }}</p>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ CAMP_ACTION_META[actionId].summary }}</p>
                    </button>
                  </div>

                  <div v-else-if="primaryActionMode === 'settlement'" class="flex flex-wrap gap-2">
                    <button
                      class="border border-success/20 rounded-xs px-3 py-2 text-[11px] text-success hover:bg-success/5 disabled:opacity-60"
                      :disabled="revealState.actionLocked"
                      data-testid="region-expedition-settle"
                      @click="triggerWithLock(() => emit('settle'))"
                    >
                      结算收束
                    </button>
                  </div>

                  <div v-else class="flex flex-wrap gap-2">
                    <button class="border border-accent/20 rounded-xs px-3 py-2 text-[11px] text-accent/80 bg-bg/70 cursor-default" disabled>
                      {{ revealState.phase === 'intro' ? '正在校准出发信息…' : revealState.phase === 'node_reveal' ? '正在揭示下一段路线…' : revealState.phase === 'encounter_reveal' ? '遭遇正在浮现…' : '营地场景正在落定…' }}
                    </button>
                  </div>

                  <div
                    v-if="primaryActionMode === 'choice' && session.status === 'ongoing' && !session.pendingEncounter && !session.campState"
                    class="flex flex-wrap gap-2"
                  >
                    <button
                      class="border border-success/20 rounded-xs px-3 py-2 text-[11px] text-success hover:bg-success/5 disabled:opacity-60"
                      :disabled="revealState.actionLocked || session.campUsed"
                      data-testid="region-expedition-open-camp"
                      @click="triggerWithLock(() => emit('camp'))"
                    >
                      搭前线营地
                    </button>
                    <button
                      class="border border-danger/20 rounded-xs px-3 py-2 text-[11px] text-danger hover:bg-danger/5 disabled:opacity-60"
                      :disabled="revealState.actionLocked"
                      data-testid="region-expedition-retreat"
                      @click="triggerWithLock(() => emit('retreat'))"
                    >
                      主动撤退
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </section>

          <section class="space-y-3">
            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">近况滚动</p>
                <span class="text-[10px] text-accent">{{ recentJournal.length }} 条</span>
              </div>
              <div v-if="recentJournal.length > 0" class="space-y-2 mt-2">
                <div
                  v-for="entry in recentJournal"
                  :key="entry.id"
                  class="border rounded-xs px-2 py-2"
                  :class="entry.tone === 'danger' ? 'border-danger/20 bg-danger/5' : entry.tone === 'success' ? 'border-success/20 bg-success/5' : 'border-accent/10 bg-bg/70'"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[10px]" :class="entry.tone === 'danger' ? 'text-danger' : entry.tone === 'success' ? 'text-success' : 'text-accent'">
                      {{ entry.title }}
                    </p>
                    <span class="text-[10px] text-muted">{{ entry.step > 0 ? `第${entry.step}步` : '出发' }}</span>
                  </div>
                  <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                </div>
              </div>
              <p v-else class="text-[10px] text-muted mt-2 leading-4">这趟远征还没有形成新的日志。</p>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">事件留痕</p>
                <span class="text-[10px]" :class="session.queuedEncounterKind ? 'text-warning' : 'text-muted'">
                  {{ session.queuedEncounterKind ? `后续 ${getEncounterKindLabel(session.queuedEncounterKind)}` : '暂无强制后续' }}
                </span>
              </div>
              <div v-if="encounterTrail.length > 0" class="space-y-1 mt-2">
                <p v-for="entry in encounterTrail" :key="entry.id" class="text-[10px] text-muted leading-4">
                  {{ getEncounterKindLabel(entry.kind) }} · {{ entry.summary }}
                </p>
              </div>
              <p v-else class="text-[10px] text-muted mt-2 leading-4">当前还没有形成可追踪的遭遇链。</p>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">携带清单</p>
                <span class="text-[10px]" :class="carryPreviewLines.length > 0 ? 'text-accent' : 'text-muted'">{{ session.carryItems.length }} 项</span>
              </div>
              <div v-if="carryPreviewLines.length > 0" class="space-y-1 mt-2">
                <p v-for="line in carryPreviewLines" :key="line" class="text-[10px] text-muted leading-4">{{ line }}</p>
              </div>
              <p v-else class="text-[10px] text-muted mt-2 leading-4">当前没有额外的途中携带物。</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>
