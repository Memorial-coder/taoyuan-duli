<template>
  <section
    class="space-y-3 border border-accent/15 bg-black/10 p-3"
    data-testid="online-visual-room-shell"
    role="region"
    :aria-label="`${title} 房间状态`"
  >
    <p class="sr-only" data-testid="online-visual-room-screen-reader-summary" aria-live="polite">
      {{ screenReaderSummary }}
    </p>

    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2" data-testid="online-visual-room-status-strip">
          <span class="border px-2 py-0.5 text-[10px]" :class="statusClass" data-testid="online-visual-room-status">{{ statusLabel || '未载入' }}</span>
          <span v-if="phaseLabel" class="border border-accent/15 px-2 py-0.5 text-[10px] text-muted" data-testid="online-visual-room-phase">{{ phaseLabel }}</span>
          <span
            v-if="countdownLabel"
            class="border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] text-warning"
            data-testid="online-visual-room-countdown"
            aria-live="polite"
          >
            {{ countdownLabel }}
          </span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm text-accent" data-testid="online-visual-room-title">{{ title }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted" data-testid="online-visual-room-subtitle">{{ subtitle }}</p>
        </div>
        <p v-if="stateReason" class="text-[10px] leading-4 text-warning" data-testid="online-visual-room-state-reason">{{ stateReason }}</p>
        <p v-if="actionFeedback" class="text-[10px] leading-4 text-success" data-testid="online-visual-room-action-feedback" aria-live="polite">{{ actionFeedback }}</p>
        <p v-if="connectionLabel" class="text-[10px] leading-4" :class="connectionClass" data-testid="online-visual-room-connection">{{ connectionLabel }}</p>
        <p v-if="conflictMessage" class="text-[10px] leading-4 text-danger" data-testid="online-visual-room-conflict">{{ conflictMessage }}</p>
      </div>

      <div
        v-if="$slots.actions"
        class="grid min-w-[12rem] gap-2 sm:grid-cols-2 lg:max-w-sm"
        data-testid="online-visual-room-actions"
        role="group"
        aria-label="房间操作"
      >
        <slot name="actions" />
      </div>
    </div>

    <div
      v-if="errorMessages.length > 0 || permissionHints.length > 0"
      class="grid gap-2 md:grid-cols-2"
      data-testid="online-visual-room-shell-alerts"
      aria-live="assertive"
    >
      <div v-if="errorMessages.length > 0" class="border border-danger/25 bg-danger/10 p-2">
        <p class="text-[10px] text-danger">错误与冲突</p>
        <ul class="mt-1 space-y-1">
          <li v-for="message in errorMessages" :key="message" class="text-[10px] leading-4 text-muted">{{ message }}</li>
        </ul>
      </div>
      <div v-if="permissionHints.length > 0" class="border border-warning/25 bg-warning/10 p-2">
        <p class="text-[10px] text-warning">权限提示</p>
        <ul class="mt-1 space-y-1">
          <li v-for="hint in permissionHints" :key="hint" class="text-[10px] leading-4 text-muted">{{ hint }}</li>
        </ul>
      </div>
    </div>

    <div
      v-if="focusHints.length > 0"
      class="border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-shell-focus-guide"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[10px] text-accent">键盘与焦点</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ focusGuideSummary }}</p>
        </div>
        <span class="shrink-0 text-[10px] text-muted">Tab / Enter / Space</span>
      </div>
      <ul class="mt-2 grid gap-1 md:grid-cols-2">
        <li v-for="hint in focusHints" :key="hint" class="text-[10px] leading-4 text-muted">{{ hint }}</li>
      </ul>
    </div>

    <div
      class="border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-entry-readback"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[10px] text-accent">入口与降级</p>
          <p class="mt-1 text-[10px] leading-4 text-muted" data-testid="online-visual-room-primary-entry">
            {{ visualContentLabel }}
          </p>
        </div>
        <span
          class="w-fit shrink-0 border px-1.5 py-0.5 text-[10px]"
          :class="fallbackEntryVisible ? 'border-warning/30 bg-warning/10 text-warning' : 'border-accent/15 bg-accent/5 text-muted'"
          data-testid="online-visual-room-fallback-status"
        >
          {{ fallbackEntryStatus }}
        </span>
      </div>
      <p class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-visual-room-fallback-entry">
        {{ fallbackEntryLabel }}：{{ fallbackEntryHint }}
      </p>
    </div>

    <div
      class="grid gap-1 border border-accent/10 bg-bg/10 p-2 sm:hidden"
      data-testid="online-visual-room-mobile-readback"
      role="list"
      aria-label="移动端房间读回"
    >
      <p class="text-[10px] text-accent">移动端读回</p>
      <div
        v-for="row in mobileReadbackRows"
        :key="row.id"
        class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 border border-accent/10 px-2 py-1 text-[10px] leading-4"
        :data-testid="`online-visual-room-mobile-readback-${row.id}`"
        role="listitem"
      >
        <span class="text-muted">{{ row.label }}</span>
        <span class="min-w-0 whitespace-normal break-words" :class="row.valueClass">{{ row.value }}</span>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-members">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">成员</p>
          <span class="text-[10px] text-accent" data-testid="online-visual-room-ready-summary">{{ readyMemberCount }} / {{ memberLimit }} 已准备</span>
        </div>
        <div v-if="members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1" role="list" aria-label="房间成员">
          <span
            v-for="member in members"
            :key="member.username"
            class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
            :class="member.isHost ? 'bg-accent/10 text-accent' : ''"
            :data-testid="`online-visual-room-member-${member.username}`"
            role="listitem"
          >
            {{ member.displayName }} · {{ member.statusLabel }}<template v-if="member.isHost"> · 房主</template>
          </span>
        </div>
        <p v-else class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-visual-room-members-empty">成员信息载入后会显示准备、离线和房主状态。</p>
      </div>

      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-reward-preview">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">奖励预览</p>
          <span class="text-[10px] text-muted" data-testid="online-visual-room-reward-count">{{ rewardPreview.length }} 项</span>
        </div>
        <div v-if="rewardPreview.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1" role="list" aria-label="奖励预览">
          <p v-for="reward in rewardPreview" :key="reward" class="text-[10px] leading-4 text-muted" data-testid="online-visual-room-reward-item" role="listitem">{{ reward }}</p>
        </div>
        <p v-else class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-visual-room-reward-empty">结算前会展示服务端返回的行动收益、凭证或可保留成果。</p>
      </div>
    </div>

    <div
      v-if="settlementRecords.length > 0"
      class="border border-success/20 bg-success/10 p-2"
      data-testid="online-visual-room-settlement-replay"
      aria-live="polite"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[10px] text-success">结算 / 回看凭证</p>
        <span class="text-[10px] text-muted" data-testid="online-visual-room-settlement-count">{{ settlementRecords.length }} 条</span>
      </div>
      <div class="mt-2 grid gap-1 md:grid-cols-2" role="list" aria-label="结算和回看凭证">
        <article
          v-for="record in settlementRecords"
          :key="record.id"
          class="border border-success/15 bg-bg/20 p-2"
          data-testid="online-visual-room-settlement-item"
          role="listitem"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-[10px] text-text">{{ record.targetLabel }}</p>
            <span class="shrink-0 text-[10px] text-success">{{ record.statusLabel }}</span>
          </div>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ record.summary }}</p>
          <p v-if="record.replayLabel" class="mt-1 text-[10px] leading-4 text-accent" data-testid="online-visual-room-replay-label">
            {{ record.replayLabel }}
          </p>
          <p v-if="record.rewardLabel" class="mt-1 text-[10px] leading-4 text-muted" data-testid="online-visual-room-reward-label">
            {{ record.rewardLabel }}
          </p>
        </article>
      </div>
    </div>

    <div
      v-if="$slots.default"
      class="space-y-3"
      data-testid="online-visual-room-content"
      role="group"
      aria-label="房间可视化内容与备用操作"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  export interface OnlineVisualRoomShellMember {
    username: string
    displayName: string
    statusLabel: string
    isHost?: boolean
  }

  export interface OnlineVisualRoomShellSettlementRecord {
    id: string
    targetLabel: string
    statusLabel: string
    summary: string
    replayLabel?: string
    rewardLabel?: string
  }

  const props = withDefaults(defineProps<{
    title: string
    subtitle: string
    statusLabel: string
    phaseLabel?: string
    stateReason?: string
    connectionState?: 'online' | 'disconnected' | 'reconnecting' | 'conflict'
    conflictMessage?: string
    actionFeedback?: string
    errorMessages?: string[]
    permissionHints?: string[]
    focusHints?: string[]
    focusGuideSummary?: string
    visualContentLabel?: string
    fallbackEntryLabel?: string
    fallbackEntryHint?: string
    fallbackEntryVisible?: boolean
    countdownSeconds?: number
    countdownRemainingSeconds?: number
    members: OnlineVisualRoomShellMember[]
    readyMemberCount: number
    memberLimit: number
    rewardPreview: string[]
    settlementRecords?: OnlineVisualRoomShellSettlementRecord[]
  }>(), {
    phaseLabel: '',
    stateReason: '',
    connectionState: 'online',
    conflictMessage: '',
    actionFeedback: '',
    errorMessages: () => [],
    permissionHints: () => [],
    focusHints: () => [
      'Tab 切换到成员、地图节点、赛道格或场景物件。',
      'Enter 或 Space 触发当前聚焦按钮，行动结果会回到房间反馈区。',
    ],
    focusGuideSummary: '可视化房间保留原按钮键盘操作，并把行动结果、失败原因和权限提示固定在房间顶部。',
    visualContentLabel: '可视化棋盘、场景或轨道作为主要入口；旧按钮面板继续作为兼容路径保留。',
    fallbackEntryLabel: '旧按钮备用操作',
    fallbackEntryHint: '当可视化入口关闭、缺失或没有可用热区动作时，玩家仍可使用旧按钮继续提交同一行动。',
    fallbackEntryVisible: false,
    countdownSeconds: 0,
    countdownRemainingSeconds: 0,
    settlementRecords: () => [],
  })

  const normalizedStatus = computed(() => props.statusLabel.toLowerCase())
  const statusClass = computed(() => {
    if (normalizedStatus.value.includes('结算') || normalizedStatus.value.includes('完成')) return 'border-success/30 bg-success/10 text-success'
    if (normalizedStatus.value.includes('倒计时') || normalizedStatus.value.includes('准备')) return 'border-warning/30 bg-warning/10 text-warning'
    if (normalizedStatus.value.includes('关闭') || normalizedStatus.value.includes('断线')) return 'border-danger/30 bg-danger/10 text-danger'
    return 'border-accent/20 bg-accent/10 text-accent'
  })

  const countdownLabel = computed(() => {
    const remaining = props.countdownRemainingSeconds || props.countdownSeconds
    if (!remaining || remaining <= 0) return ''
    return `倒计时 ${remaining} 秒`
  })

  const connectionLabel = computed(() => {
    if (props.connectionState === 'disconnected') return '连接已断开，可在重连窗口内恢复房间状态。'
    if (props.connectionState === 'reconnecting') return '正在等待重连确认，操作会以服务端最新状态为准。'
    if (props.connectionState === 'conflict') return '服务端状态有冲突，请刷新后再提交操作。'
    return ''
  })

  const connectionClass = computed(() => {
    if (props.connectionState === 'conflict' || props.connectionState === 'disconnected') return 'text-danger'
    if (props.connectionState === 'reconnecting') return 'text-warning'
    return 'text-muted'
  })

  const fallbackEntryStatus = computed(() =>
    props.fallbackEntryVisible ? '旧入口当前可见' : '主可视化入口优先'
  )

  const mobileFeedbackLabel = computed(() => {
    if (props.actionFeedback) return props.actionFeedback
    if (props.conflictMessage) return props.conflictMessage
    if (connectionLabel.value) return connectionLabel.value
    if (props.stateReason) return props.stateReason
    if (props.errorMessages.length > 0) return props.errorMessages[0]
    if (props.permissionHints.length > 0) return props.permissionHints[0]
    return '暂无新的行动反馈'
  })

  const mobileReplayLabel = computed(() => {
    const firstRecord = props.settlementRecords[0]
    if (firstRecord) {
      return `${props.settlementRecords.length} 条 · ${firstRecord.replayLabel || firstRecord.summary || firstRecord.targetLabel}`
    }
    if (props.rewardPreview.length > 0) return `奖励预览 ${props.rewardPreview.length} 项`
    return '结算后会显示服务端回看凭证'
  })

  const mobileReadbackRows = computed(() => [
    {
      id: 'status',
      label: '状态',
      value: props.phaseLabel ? `${props.statusLabel || '未载入'} · ${props.phaseLabel}` : (props.statusLabel || '未载入'),
      valueClass: 'text-accent',
    },
    {
      id: 'entry',
      label: '入口',
      value: props.visualContentLabel,
      valueClass: 'text-muted',
    },
    {
      id: 'fallback',
      label: '旧入口',
      value: `${fallbackEntryStatus.value} · ${props.fallbackEntryLabel}`,
      valueClass: props.fallbackEntryVisible ? 'text-warning' : 'text-muted',
    },
    {
      id: 'feedback',
      label: '反馈',
      value: mobileFeedbackLabel.value,
      valueClass: props.actionFeedback ? 'text-success' : props.conflictMessage || props.errorMessages.length > 0 ? 'text-danger' : 'text-muted',
    },
    {
      id: 'replay',
      label: '回看',
      value: mobileReplayLabel.value,
      valueClass: props.settlementRecords.length > 0 ? 'text-success' : 'text-muted',
    },
  ])

  const screenReaderSummary = computed(() => {
    const parts = [`${props.title}，状态 ${props.statusLabel || '未载入'}`]
    if (props.phaseLabel) parts.push(`阶段 ${props.phaseLabel}`)
    if (countdownLabel.value) parts.push(countdownLabel.value)
    parts.push(`成员 ${props.readyMemberCount}/${props.memberLimit} 已准备`)
    parts.push(`奖励预览 ${props.rewardPreview.length} 项`)
    if (props.settlementRecords.length > 0) parts.push(`结算回看 ${props.settlementRecords.length} 条`)
    parts.push(`入口 ${props.visualContentLabel}`)
    parts.push(`${props.fallbackEntryLabel}${props.fallbackEntryVisible ? '当前可见' : '作为备用保留'}`)
    if (connectionLabel.value) parts.push(connectionLabel.value)
    if (props.actionFeedback) parts.push(`最近反馈：${props.actionFeedback}`)
    if (props.errorMessages.length > 0) parts.push(`错误 ${props.errorMessages.length} 条`)
    if (props.permissionHints.length > 0) parts.push(`权限提示 ${props.permissionHints.length} 条`)
    return parts.join('。')
  })
</script>
