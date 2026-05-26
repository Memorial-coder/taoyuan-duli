<template>
  <section
    class="space-y-3 border border-accent/15 bg-black/10 p-3"
    data-testid="online-visual-room-shell"
    :aria-label="`${title} 房间状态`"
  >
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="border px-2 py-0.5 text-[10px]" :class="statusClass">{{ statusLabel || '未载入' }}</span>
          <span v-if="phaseLabel" class="border border-accent/15 px-2 py-0.5 text-[10px] text-muted">{{ phaseLabel }}</span>
          <span v-if="countdownLabel" class="border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">{{ countdownLabel }}</span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm text-accent">{{ title }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ subtitle }}</p>
        </div>
        <p v-if="stateReason" class="text-[10px] leading-4 text-warning">{{ stateReason }}</p>
        <p v-if="actionFeedback" class="text-[10px] leading-4 text-success" aria-live="polite">{{ actionFeedback }}</p>
        <p v-if="connectionLabel" class="text-[10px] leading-4" :class="connectionClass">{{ connectionLabel }}</p>
        <p v-if="conflictMessage" class="text-[10px] leading-4 text-danger">{{ conflictMessage }}</p>
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

    <div class="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="border border-accent/10 bg-bg/10 p-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">成员</p>
          <span class="text-[10px] text-accent">{{ readyMemberCount }} / {{ memberLimit }} 已准备</span>
        </div>
        <div v-if="members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
          <span
            v-for="member in members"
            :key="member.username"
            class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted"
            :class="member.isHost ? 'bg-accent/10 text-accent' : ''"
          >
            {{ member.displayName }} · {{ member.statusLabel }}<template v-if="member.isHost"> · 房主</template>
          </span>
        </div>
        <p v-else class="mt-2 text-[10px] leading-4 text-muted">成员信息载入后会显示准备、离线和房主状态。</p>
      </div>

      <div class="border border-accent/10 bg-bg/10 p-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">奖励预览</p>
          <span class="text-[10px] text-muted">{{ rewardPreview.length }} 项</span>
        </div>
        <div v-if="rewardPreview.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
          <p v-for="reward in rewardPreview" :key="reward" class="text-[10px] leading-4 text-muted">{{ reward }}</p>
        </div>
        <p v-else class="mt-2 text-[10px] leading-4 text-muted">结算前会展示服务端返回的行动收益、凭证或可保留成果。</p>
      </div>
    </div>

    <div v-if="$slots.default" class="space-y-3">
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
    countdownSeconds?: number
    countdownRemainingSeconds?: number
    members: OnlineVisualRoomShellMember[]
    readyMemberCount: number
    memberLimit: number
    rewardPreview: string[]
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
    countdownSeconds: 0,
    countdownRemainingSeconds: 0,
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
</script>
