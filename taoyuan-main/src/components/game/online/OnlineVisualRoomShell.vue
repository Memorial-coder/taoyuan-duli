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
          <span class="border px-2 py-0.5 text-[0.625rem]" :class="statusClass" data-testid="online-visual-room-status">{{ statusLabel || '未载入' }}</span>
          <span v-if="phaseLabel" class="border border-accent/15 px-2 py-0.5 text-[0.625rem] text-muted" data-testid="online-visual-room-phase">{{ phaseLabel }}</span>
          <span
            v-if="countdownLabel"
            class="border border-warning/25 bg-warning/10 px-2 py-0.5 text-[0.625rem] text-warning"
            data-testid="online-visual-room-countdown"
            aria-live="polite"
          >
            {{ countdownLabel }}
          </span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm text-accent" data-testid="online-visual-room-title">{{ title }}</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-subtitle">{{ subtitle }}</p>
        </div>
        <p v-if="stateReason" class="text-[0.625rem] leading-4 text-warning" data-testid="online-visual-room-state-reason">{{ stateReason }}</p>
        <p v-if="actionFeedback" class="text-[0.625rem] leading-4 text-success" data-testid="online-visual-room-action-feedback" aria-live="polite">{{ actionFeedback }}</p>
        <p v-if="connectionLabel" class="text-[0.625rem] leading-4" :class="connectionClass" data-testid="online-visual-room-connection">{{ connectionLabel }}</p>
        <p v-if="conflictMessage" class="text-[0.625rem] leading-4 text-danger" data-testid="online-visual-room-conflict">{{ conflictMessage }}</p>
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
        <p class="text-[0.625rem] text-danger">错误与冲突</p>
        <ul class="mt-1 space-y-1">
          <li v-for="message in errorMessages" :key="message" class="text-[0.625rem] leading-4 text-muted">{{ message }}</li>
        </ul>
      </div>
      <div v-if="permissionHints.length > 0" class="border border-warning/25 bg-warning/10 p-2">
        <p class="text-[0.625rem] text-warning">权限提示</p>
        <ul class="mt-1 space-y-1">
          <li v-for="hint in permissionHints" :key="hint" class="text-[0.625rem] leading-4 text-muted">{{ hint }}</li>
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
          <p class="text-[0.625rem] text-accent">键盘与焦点</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ focusGuideSummary }}</p>
        </div>
        <span class="shrink-0 text-[0.625rem] text-muted">Tab / Enter / Space</span>
      </div>
      <ul class="mt-2 grid gap-1 md:grid-cols-2">
        <li v-for="hint in focusHints" :key="hint" class="text-[0.625rem] leading-4 text-muted">{{ hint }}</li>
      </ul>
    </div>

    <div
      class="border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-entry-readback"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">入口与备用操作</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-primary-entry">
            {{ visualContentLabel }}
          </p>
        </div>
        <span
          class="w-fit shrink-0 border px-1.5 py-0.5 text-[0.625rem]"
          :class="fallbackEntryVisible ? 'border-warning/30 bg-warning/10 text-warning' : 'border-accent/15 bg-accent/5 text-muted'"
          data-testid="online-visual-room-fallback-status"
        >
          {{ fallbackEntryStatus }}
        </span>
      </div>
      <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-fallback-entry">
        {{ fallbackEntryLabel }}：{{ fallbackEntryHint }}
      </p>
    </div>

    <div
      class="grid gap-1 border border-accent/10 bg-bg/10 p-2 sm:hidden"
      data-testid="online-visual-room-mobile-readback"
      role="list"
      aria-label="移动端房间读回"
    >
      <p class="text-[0.625rem] text-accent">移动端读回</p>
      <div
        v-for="row in mobileReadbackRows"
        :key="row.id"
        class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 border border-accent/10 px-2 py-1 text-[0.625rem] leading-4"
        :data-testid="`online-visual-room-mobile-readback-${row.id}`"
        role="listitem"
      >
        <span class="text-muted">{{ row.label }}</span>
        <span class="min-w-0 whitespace-normal break-words" :class="row.valueClass">{{ row.value }}</span>
      </div>
    </div>

    <div
      v-if="showCollaborationPanel"
      class="space-y-2 border border-accent/10 bg-bg/10 p-2"
      data-testid="online-visual-room-collaboration-panel"
      aria-live="polite"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-[0.625rem] text-accent">协作推进</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-collaboration-progress">
            {{ collaborationProgressLabel || '等待成员分工后显示共同目标。' }}
          </p>
        </div>
        <span
          v-if="collaborationScoreLabel"
          class="w-fit shrink-0 border border-accent/15 bg-accent/5 px-2 py-1 text-[0.625rem] text-accent"
          data-testid="online-visual-room-collaboration-score"
        >
          {{ collaborationScoreLabel }}
        </span>
      </div>
      <div class="h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
        <div class="h-full bg-accent/80 transition-all" :style="{ width: `${safeCollaborationProgressPercent}%` }" />
      </div>
      <div v-if="collaborationSignals.length > 0" class="flex flex-wrap gap-1.5" data-testid="online-visual-room-collaboration-signals" role="list">
        <span
          v-for="signal in collaborationSignals"
          :key="signal.id"
          class="border px-2 py-1 text-[0.625rem] leading-4"
          :class="collaborationSignalClass(signal.tone)"
          data-testid="online-visual-room-collaboration-signal"
          role="listitem"
        >
          {{ signal.label }}
        </span>
      </div>
      <div v-if="collaborationRoles.length > 0" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="online-visual-room-collaboration-roles" role="list">
        <article
          v-for="role in collaborationRoles"
          :key="role.id"
          class="border border-accent/10 bg-black/10 p-2"
          data-testid="online-visual-room-collaboration-role"
          role="listitem"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-xs text-text">{{ role.label }}</p>
              <p class="mt-1 truncate text-[0.625rem] text-accent">{{ role.ownerLabel }}</p>
            </div>
            <span v-if="role.statusLabel" class="shrink-0 text-[0.625rem] text-muted">{{ role.statusLabel }}</span>
          </div>
          <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ role.summary }}</p>
        </article>
      </div>
      <div v-if="collaborationFeedback.length > 0" class="grid gap-1 md:grid-cols-2" data-testid="online-visual-room-collaboration-feedback" role="list">
        <p
          v-for="entry in collaborationFeedback"
          :key="entry.id"
          class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
          :class="entry.tone === 'success' ? 'text-success' : entry.tone === 'warning' ? 'text-warning' : ''"
          data-testid="online-visual-room-collaboration-feedback-item"
          role="listitem"
        >
          <span class="text-accent">{{ entry.label }}</span>
          <span v-if="entry.summary"> · {{ entry.summary }}</span>
        </p>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-members">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">成员</p>
          <span class="text-[0.625rem] text-accent" data-testid="online-visual-room-ready-summary">{{ readyMemberCount }} / {{ memberLimit }} 已准备</span>
        </div>
        <div v-if="members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1" role="list" aria-label="房间成员">
          <span
            v-for="member in members"
            :key="member.username"
            class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
            :class="member.isHost ? 'bg-accent/10 text-accent' : ''"
            :data-testid="`online-visual-room-member-${member.username}`"
            role="listitem"
          >
            {{ member.displayName }} · {{ member.statusLabel }}<template v-if="member.isHost"> · 房主</template>
          </span>
        </div>
        <p v-else class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-members-empty">成员信息载入后会显示准备、离线和房主状态。</p>
      </div>

      <div class="border border-accent/10 bg-bg/10 p-2" data-testid="online-visual-room-reward-preview">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">奖励预览</p>
          <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-reward-count">{{ rewardPreview.length }} 项</span>
        </div>
        <div v-if="rewardPreview.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1" role="list" aria-label="奖励预览">
          <p v-for="reward in rewardPreview" :key="reward" class="text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-item" role="listitem">{{ reward }}</p>
        </div>
        <p v-else class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-empty">结算前会展示行动收益、结算记录或可保留成果。</p>
      </div>
    </div>

    <div
      v-if="settlementRecords.length > 0"
      class="border border-success/20 bg-success/10 p-2"
      data-testid="online-visual-room-settlement-replay"
      aria-live="polite"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[0.625rem] text-success">结算 / 回看记录</p>
        <span class="text-[0.625rem] text-muted" data-testid="online-visual-room-settlement-count">{{ settlementRecords.length }} 条</span>
      </div>
      <div class="mt-2 grid gap-1 md:grid-cols-2" role="list" aria-label="结算和回看记录">
        <article
          v-for="record in settlementRecords"
          :key="record.id"
          class="border border-success/15 bg-bg/20 p-2"
          data-testid="online-visual-room-settlement-item"
          role="listitem"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-[0.625rem] text-text">{{ record.targetLabel }}</p>
            <span class="shrink-0 text-[0.625rem] text-success">{{ record.statusLabel }}</span>
          </div>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ record.summary }}</p>
          <p v-if="record.replayLabel" class="mt-1 text-[0.625rem] leading-4 text-accent" data-testid="online-visual-room-replay-label">
            {{ record.replayLabel }}
          </p>
          <p v-if="record.rewardLabel" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-room-reward-label">
            {{ record.rewardLabel }}
          </p>
          <div
            v-if="record.rewardItems?.length"
            class="mt-1 flex flex-wrap gap-1"
            data-testid="online-visual-room-reward-items"
          >
            <span
              v-for="item in record.rewardItems"
              :key="`${record.id}-${item.itemId}-${item.quantity}`"
              class="inline-flex min-w-0 items-center gap-1 border border-success/15 bg-success/5 px-1.5 py-0.5 text-[0.625rem] text-muted"
            >
              <ItemIcon v-if="getItemById(item.itemId)" :item="getItemById(item.itemId)" size="xs" :show-badge="false" />
              <span class="truncate">{{ getRewardItemLabel(item) }} x{{ item.quantity }}</span>
            </span>
          </div>
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
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { getItemById } from '@/data/items'

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
    rewardItems?: Array<{
      itemId: string
      quantity: number
      label?: string
    }>
  }

  export interface OnlineVisualRoomShellCollaborationRole {
    id: string
    label: string
    ownerLabel: string
    summary: string
    statusLabel?: string
  }

  export interface OnlineVisualRoomShellCollaborationFeedback {
    id: string
    label: string
    summary?: string
    tone?: 'default' | 'success' | 'warning'
  }

  export interface OnlineVisualRoomShellCollaborationSignal {
    id: string
    label: string
    tone?: 'default' | 'success' | 'warning'
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
    collaborationProgressLabel?: string
    collaborationProgressPercent?: number
    collaborationScoreLabel?: string
    collaborationSignals?: OnlineVisualRoomShellCollaborationSignal[]
    collaborationRoles?: OnlineVisualRoomShellCollaborationRole[]
    collaborationFeedback?: OnlineVisualRoomShellCollaborationFeedback[]
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
    visualContentLabel: '可视化棋盘、场景或轨道作为主要入口；备用操作会在需要时保留。',
    fallbackEntryLabel: '备用操作',
    fallbackEntryHint: '当主要入口暂时不可用或没有可选动作时，玩家仍可继续提交同一行动。',
    fallbackEntryVisible: false,
    countdownSeconds: 0,
    countdownRemainingSeconds: 0,
    settlementRecords: () => [],
    collaborationProgressLabel: '',
    collaborationProgressPercent: 0,
    collaborationScoreLabel: '',
    collaborationSignals: () => [],
    collaborationRoles: () => [],
    collaborationFeedback: () => [],
  })

  const normalizedStatus = computed(() => props.statusLabel.toLowerCase())
  const getRewardItemLabel = (item: { itemId: string; label?: string }) =>
    item.label || getItemById(item.itemId)?.name || item.itemId
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
    if (props.connectionState === 'reconnecting') return '正在等待重连确认，操作会以最新房间状态为准。'
    if (props.connectionState === 'conflict') return '房间状态需要刷新确认，请刷新后再提交操作。'
    return ''
  })

  const connectionClass = computed(() => {
    if (props.connectionState === 'conflict' || props.connectionState === 'disconnected') return 'text-danger'
    if (props.connectionState === 'reconnecting') return 'text-warning'
    return 'text-muted'
  })

  const fallbackEntryStatus = computed(() =>
    props.fallbackEntryVisible ? '备用入口当前可用' : '主可视化入口优先'
  )

  const showCollaborationPanel = computed(() =>
    Boolean(props.collaborationProgressLabel)
      || props.collaborationSignals.length > 0
      || props.collaborationRoles.length > 0
      || props.collaborationFeedback.length > 0
  )
  const collaborationSignalClass = (tone: OnlineVisualRoomShellCollaborationSignal['tone'] = 'default') => {
    if (tone === 'success') return 'border-success/25 bg-success/10 text-success'
    if (tone === 'warning') return 'border-warning/25 bg-warning/10 text-warning'
    return 'border-accent/15 bg-accent/5 text-muted'
  }
  const safeCollaborationProgressPercent = computed(() =>
    Math.max(0, Math.min(100, Math.round(Number(props.collaborationProgressPercent) || 0)))
  )
  const collaborationMobileLabel = computed(() => {
    if (props.collaborationProgressLabel) return props.collaborationProgressLabel
    if (props.collaborationSignals.length > 0) return props.collaborationSignals[0]?.label || '已有协作态势'
    if (props.collaborationRoles.length > 0) return `已分工 ${props.collaborationRoles.length} 项`
    if (props.collaborationFeedback.length > 0) return props.collaborationFeedback[0]?.summary || props.collaborationFeedback[0]?.label || '已有协作反馈'
    return '等待协作信息'
  })

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
    return '结算后会显示回看记录'
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
      id: 'collaboration',
      label: '协作',
      value: collaborationMobileLabel.value,
      valueClass: showCollaborationPanel.value ? 'text-accent' : 'text-muted',
    },
    {
      id: 'fallback',
      label: '备用入口',
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
    if (showCollaborationPanel.value) {
      parts.push(`协作推进 ${props.collaborationProgressLabel || `${props.collaborationRoles.length} 项分工`}`)
      if (props.collaborationFeedback.length > 0) parts.push(`协作反馈 ${props.collaborationFeedback[0]?.label || ''}`)
    }
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
