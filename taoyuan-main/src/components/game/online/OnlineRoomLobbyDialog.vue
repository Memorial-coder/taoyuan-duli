<template>
  <OnlineBottomSheet
    :open="open"
    :title="dialogTitle"
    :description="dialogDescription"
    side="right"
    :close-on-backdrop="!isBusy"
    initial-focus="[data-testid='online-room-primary-action']"
    @close="emit('close')"
  >
    <div class="space-y-4" data-testid="online-room-lobby">
      <section class="grid gap-2 text-xs sm:grid-cols-2" aria-label="房间摘要">
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[0.625rem] leading-4 text-muted">房间状态</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ roomStateLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[0.625rem] leading-4 text-muted">成员</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ memberCountLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[0.625rem] leading-4 text-muted">玩法</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ gameplayLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[0.625rem] leading-4 text-muted">我的身份</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ currentRoleLabel }}</p>
        </div>
      </section>

      <section v-if="lastFeedbackText" class="border border-emerald-300/20 bg-emerald-500/10 p-2 text-xs leading-5 text-emerald-100" data-testid="online-room-lobby-feedback">
        {{ lastFeedbackText }}
      </section>

      <section class="space-y-2" aria-labelledby="online-room-lobby-member-title">
        <div class="flex items-center justify-between gap-2">
          <p id="online-room-lobby-member-title" class="text-xs leading-5 text-accent">成员状态</p>
          <span class="text-[0.625rem] leading-4 text-muted">{{ readyCountLabel }}</span>
        </div>

        <div v-if="members.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted" data-testid="online-room-member-list">
          还没有成员加入，房主可以先邀请玩家。
        </div>
        <div v-else class="space-y-2" data-testid="online-room-member-list" role="list">
          <div
            v-for="member in members"
            :key="memberKey(member)"
            class="flex flex-col gap-2 border border-accent/10 bg-black/10 p-2 sm:flex-row sm:items-center sm:justify-between"
            role="listitem"
            :data-testid="`online-room-member-${memberKey(member)}`"
          >
            <div class="min-w-0">
              <p class="truncate text-xs leading-5 text-accent">{{ memberDisplayName(member) }}</p>
              <p class="mt-0.5 truncate text-[0.625rem] leading-4 text-muted">{{ memberSubLabel(member) }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-1.5">
              <span v-for="badge in memberBadges(member)" :key="badge" class="border border-accent/15 px-2 py-1 text-[0.625rem] leading-4 text-muted">
                {{ badge }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="disabledActionReasons.length > 0" class="space-y-1 border border-amber-300/20 bg-amber-500/10 p-2 text-[0.625rem] leading-4 text-amber-100" data-testid="online-room-disabled-reason">
        <p v-for="reason in disabledActionReasons" :key="reason">
          {{ reason }}
        </p>
      </section>
    </div>

    <template #footer>
      <div class="space-y-2">
        <button
          v-if="primaryAction"
          type="button"
          class="online-action-btn online-action-btn--primary online-room-lobby__primary-action min-h-[44px] w-full justify-center"
          data-testid="online-room-primary-action"
          :disabled="primaryActionDisabled"
          @click="executeAction(primaryAction)"
        >
          <component :is="primaryAction.icon" :size="14" aria-hidden="true" />
          {{ actionRunning(primaryAction.key) ? '处理中' : primaryAction.label }}
        </button>

        <div v-if="secondaryActions.length > 0" class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="action in secondaryActions"
            :key="action.key"
            type="button"
            class="online-action-btn online-action-btn--compact min-h-[40px] justify-center"
            :class="action.tone === 'danger' ? 'online-action-btn--danger' : ''"
            :data-testid="`online-room-action-${action.key}`"
            :disabled="actionDisabled(action)"
            @click="executeAction(action)"
          >
            <component :is="action.icon" :size="13" aria-hidden="true" />
            {{ actionRunning(action.key) ? '处理中' : action.label }}
          </button>
        </div>

        <button
          type="button"
          class="online-action-btn online-action-btn--compact w-full justify-center"
          :disabled="isBusy"
          @click="emit('close')"
        >
          稍后处理
        </button>
      </div>
    </template>
  </OnlineBottomSheet>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { CheckCircle2, Clock3, DoorOpen, Eye, Gift, LogOut, PlayCircle, Radio, RotateCcw, UserPlus, XCircle } from 'lucide-vue-next'
  import OnlineBottomSheet from './OnlineBottomSheet.vue'

  export type OnlineRoomLobbyDomain = 'festival' | 'expedition' | 'room'
  export type OnlineRoomLobbyMember = {
    id?: string
    username?: string
    display_name?: string
    displayName?: string
    role?: string
    status?: string
    status_label?: string
    statusLabel?: string
    invited_at?: number
    joined_at?: number
    ready_at?: number
    disconnected_at?: number
    left_at?: number
  }

  export type OnlineRoomLobbyRoom = {
    id: string
    title?: string
    room_title?: string
    template_label?: string
    templateLabel?: string
    gameplay_template_label?: string
    gameplayLabel?: string
    state?: string
    state_label?: string
    stateLabel?: string
    host_username?: string
    hostUsername?: string
    member_limit?: number
    memberLimit?: number
    max_member_limit?: number
    maxMemberLimit?: number
    joined_member_count?: number
    joinedMemberCount?: number
    ready_member_count?: number
    readyMemberCount?: number
    members?: OnlineRoomLobbyMember[]
    can_invite?: boolean
    can_join?: boolean
    can_ready?: boolean
    can_unready?: boolean
    can_leave?: boolean
    can_reconnect?: boolean
    can_host_ready_check?: boolean
    can_host_start_countdown?: boolean
    can_host_settle?: boolean
    can_host_close?: boolean
  }

  export type OnlineRoomLobbyFeedback = string | {
    title?: string
    description?: string
  }

  type LobbyActionKey =
    | 'invite'
    | 'ready'
    | 'unready'
    | 'start-ready-check'
    | 'start-countdown'
    | 'settle'
    | 'cancel-room'
    | 'leave-room'
    | 'accept-invite'
    | 'reconnect'
    | 'view-countdown'
    | 'enter-gameplay'
    | 'view-members'
    | 'view-objective'
    | 'view-settlement'
    | 'view-record'
    | 'return-lobby'
    | 'notify-members'
    | 'retry-settle'
    | 'rematch'

  type HostRoomState = 'created' | 'ready_check' | 'countdown' | 'running' | 'settling' | 'settled' | 'closed' | 'unknown'
  type MemberRoomStatus = 'invited' | 'joined' | 'ready' | 'running' | 'disconnected' | 'settled' | 'unknown'
  type RoomCapability =
    | 'can_invite'
    | 'can_join'
    | 'can_ready'
    | 'can_unready'
    | 'can_leave'
    | 'can_reconnect'
    | 'can_host_ready_check'
    | 'can_host_start_countdown'
    | 'can_host_settle'
    | 'can_host_close'

  type LobbyAction = {
    key: LobbyActionKey
    label: string
    icon: unknown
    tone?: 'default' | 'danger'
    enabledBy?: RoomCapability
    disabled?: boolean
    disabledReason?: string
  }

  type LobbyActionMatrix = {
    primary: LobbyAction
    secondary?: LobbyAction[]
    danger?: LobbyAction[]
  }

  const props = withDefaults(defineProps<{
    open: boolean
    domain: OnlineRoomLobbyDomain
    room?: OnlineRoomLobbyRoom | null
    currentUserId?: string
    busyAction?: boolean | LobbyActionKey | ''
    lastFeedback?: OnlineRoomLobbyFeedback | null
  }>(), {
    room: null,
    currentUserId: '',
    busyAction: '',
    lastFeedback: null,
  })

  const emit = defineEmits<{
    invite: []
    ready: []
    unready: []
    'start-ready-check': []
    'start-countdown': []
    settle: []
    'cancel-room': []
    'leave-room': []
    'accept-invite': []
    reconnect: []
    'view-countdown': []
    'enter-gameplay': []
    'view-members': []
    'view-objective': []
    'view-settlement': []
    'view-record': []
    'return-lobby': []
    'notify-members': []
    'retry-settle': []
    rematch: []
    close: []
  }>()

  const hostStateActionMatrix: Record<HostRoomState, LobbyActionMatrix> = {
    created: {
      primary: { key: 'invite', label: '邀请玩家', icon: UserPlus, enabledBy: 'can_invite', disabledReason: '当前房间暂时不能邀请玩家。' },
      secondary: [{ key: 'start-ready-check', label: '开始准备', icon: PlayCircle, enabledBy: 'can_host_ready_check', disabledReason: '人数不足时不能开始准备。' }],
      danger: [{ key: 'cancel-room', label: '取消房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close' }],
    },
    ready_check: {
      primary: { key: 'start-countdown', label: '开始倒计时', icon: Clock3, enabledBy: 'can_host_start_countdown', disabledReason: '还有成员未准备，暂时不能倒计时。' },
      secondary: [{ key: 'invite', label: '继续邀请', icon: UserPlus, enabledBy: 'can_invite' }],
      danger: [{ key: 'cancel-room', label: '取消房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close' }],
    },
    countdown: {
      primary: { key: 'view-countdown', label: '查看倒计时', icon: Clock3 },
      secondary: [{ key: 'notify-members', label: '通知成员', icon: Radio }],
      danger: [{ key: 'cancel-room', label: '取消房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close' }],
    },
    running: {
      primary: { key: 'enter-gameplay', label: '进入玩法', icon: DoorOpen },
      secondary: [{ key: 'view-members', label: '查看成员', icon: Eye }],
      danger: [{ key: 'cancel-room', label: '关闭房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close', disabledReason: '玩法进行中时关闭需要确认成员影响。' }],
    },
    settling: {
      primary: { key: 'view-settlement', label: '查看结算', icon: Gift },
      secondary: [{ key: 'retry-settle', label: '重试结算', icon: RotateCcw, enabledBy: 'can_host_settle', disabledReason: '正在结算时不能重复提交。' }],
      danger: [{ key: 'cancel-room', label: '关闭房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close' }],
    },
    settled: {
      primary: { key: 'view-settlement', label: '查看奖励', icon: Gift },
      secondary: [{ key: 'rematch', label: '再开一局', icon: RotateCcw }],
      danger: [{ key: 'cancel-room', label: '关闭房间', icon: XCircle, tone: 'danger', enabledBy: 'can_host_close' }],
    },
    closed: {
      primary: { key: 'view-record', label: '查看记录', icon: Eye },
      secondary: [{ key: 'return-lobby', label: '返回大厅', icon: DoorOpen }],
    },
    unknown: {
      primary: { key: 'return-lobby', label: '刷新后继续', icon: RotateCcw, disabled: true, disabledReason: '房间状态暂时无法识别，请刷新后继续。' },
    },
  }

  const memberStatusActionMatrix: Record<MemberRoomStatus, LobbyActionMatrix> = {
    invited: {
      primary: { key: 'accept-invite', label: '接受邀请', icon: CheckCircle2, enabledBy: 'can_join', disabledReason: '房间已满时不能加入。' },
      secondary: [{ key: 'leave-room', label: '拒绝邀请', icon: LogOut, enabledBy: 'can_leave' }],
    },
    joined: {
      primary: { key: 'ready', label: '我已准备', icon: CheckCircle2, enabledBy: 'can_ready', disabledReason: '房间状态变化后需要刷新。' },
      secondary: [{ key: 'leave-room', label: '离开房间', icon: LogOut, enabledBy: 'can_leave' }],
    },
    ready: {
      primary: { key: 'unready', label: '取消准备', icon: Clock3, enabledBy: 'can_unready', disabledReason: '倒计时开始后不能取消准备。' },
      secondary: [{ key: 'view-members', label: '查看成员', icon: Eye }],
      danger: [{ key: 'leave-room', label: '离开房间', icon: LogOut, tone: 'danger', enabledBy: 'can_leave' }],
    },
    running: {
      primary: { key: 'enter-gameplay', label: '进入玩法', icon: DoorOpen },
      secondary: [{ key: 'view-objective', label: '查看目标', icon: Eye }],
      danger: [{ key: 'leave-room', label: '离开房间', icon: LogOut, tone: 'danger', enabledBy: 'can_leave', disabledReason: '当前阶段不允许离开。' }],
    },
    disconnected: {
      primary: { key: 'reconnect', label: '重新连接', icon: RotateCcw, enabledBy: 'can_reconnect', disabledReason: '网络未恢复。' },
      secondary: [{ key: 'view-objective', label: '查看说明', icon: Eye }],
      danger: [{ key: 'leave-room', label: '离开房间', icon: LogOut, tone: 'danger', enabledBy: 'can_leave' }],
    },
    settled: {
      primary: { key: 'view-settlement', label: '查看奖励', icon: Gift },
      secondary: [{ key: 'return-lobby', label: '返回大厅', icon: DoorOpen }],
    },
    unknown: {
      primary: { key: 'return-lobby', label: '刷新后继续', icon: RotateCcw, disabled: true, disabledReason: '成员状态暂时无法识别，请刷新后继续。' },
    },
  }

  const normalizeKey = (value = '') => value.trim().toLowerCase()
  const domainLabel = computed(() => props.domain === 'festival' ? '节会房' : props.domain === 'expedition' ? '远征队伍' : '房间')
  const members = computed(() => props.room?.members ?? [])
  const roomTitle = computed(() => props.room?.title || props.room?.room_title || `${domainLabel.value}准备大厅`)
  const dialogTitle = computed(() => `${roomTitle.value}`)
  const roomStateLabel = computed(() => props.room?.state_label || props.room?.stateLabel || props.room?.state || '等待同步')
  const gameplayLabel = computed(() =>
    props.room?.gameplay_template_label || props.room?.gameplayLabel || props.room?.template_label || props.room?.templateLabel || domainLabel.value
  )
  const dialogDescription = computed(() => `${gameplayLabel.value} · ${roomStateLabel.value}`)
  const memberLimit = computed(() => props.room?.member_limit || props.room?.memberLimit || props.room?.max_member_limit || props.room?.maxMemberLimit || members.value.length || 0)
  const hostUsername = computed(() => normalizeKey(props.room?.host_username || props.room?.hostUsername || ''))
  const currentUserKey = computed(() => normalizeKey(props.currentUserId))
  const currentMember = computed(() => {
    if (!currentUserKey.value) return null
    return members.value.find(member =>
      [member.id, member.username, member.display_name, member.displayName].some(value => normalizeKey(String(value || '')) === currentUserKey.value)
    ) ?? null
  })
  const currentMemberStatus = computed(() => normalizeKey(currentMember.value?.status || ''))
  const isHost = computed(() => {
    const member = currentMember.value
    if (normalizeKey(member?.role || '') === 'host') return true
    if (!currentUserKey.value || !hostUsername.value) return false
    return currentUserKey.value === hostUsername.value
  })
  const currentRoleLabel = computed(() => {
    if (isHost.value) return '房主'
    if (!currentMember.value) return '旁观'
    if (isMemberReady(currentMember.value)) return '已准备'
    if (isMemberInvited(currentMember.value)) return '被邀请'
    return '成员'
  })
  const explicitJoinedMemberCount = computed(() => Number(props.room?.joined_member_count ?? props.room?.joinedMemberCount ?? -1))
  const explicitReadyMemberCount = computed(() => Number(props.room?.ready_member_count ?? props.room?.readyMemberCount ?? -1))
  const joinedMembers = computed(() => {
    if (Number.isFinite(explicitJoinedMemberCount.value) && explicitJoinedMemberCount.value >= 0) return explicitJoinedMemberCount.value
    return members.value.filter(member => isMemberParticipating(member)).length
  })
  const invitedMembers = computed(() => members.value.filter(member => isMemberInvited(member)).length)
  const readyMembers = computed(() => {
    if (Number.isFinite(explicitReadyMemberCount.value) && explicitReadyMemberCount.value >= 0) return explicitReadyMemberCount.value
    return members.value.filter(member => isMemberReady(member)).length
  })
  const memberCountLabel = computed(() => {
    const inviteLabel = invitedMembers.value > 0 ? ` · ${invitedMembers.value} 已邀请` : ''
    return memberLimit.value > 0 ? `${joinedMembers.value}/${memberLimit.value} 人${inviteLabel}` : `${joinedMembers.value} 人${inviteLabel}`
  })
  const readyCountLabel = computed(() => {
    const denominator = Math.max(joinedMembers.value, readyMembers.value)
    const inviteLabel = invitedMembers.value > 0 ? ` · ${invitedMembers.value} 已邀请` : ''
    return `${readyMembers.value}/${denominator} 已准备${inviteLabel}`
  })
  const isBusy = computed(() => props.busyAction === true)
  const lastFeedbackText = computed(() => {
    if (!props.lastFeedback) return ''
    if (typeof props.lastFeedback === 'string') return props.lastFeedback
    return [props.lastFeedback.title, props.lastFeedback.description].filter(Boolean).join('：')
  })

  const memberKey = (member: OnlineRoomLobbyMember) =>
    normalizeKey(member.id || member.username || member.display_name || member.displayName || 'member')
  const memberDisplayName = (member: OnlineRoomLobbyMember) => member.displayName || member.display_name || member.username || member.id || '成员'
  const memberSubLabel = (member: OnlineRoomLobbyMember) => member.statusLabel || member.status_label || member.status || '等待同步'
  const isMemberHost = (member: OnlineRoomLobbyMember) =>
    normalizeKey(member.role || '') === 'host' || (!!hostUsername.value && normalizeKey(member.username || '') === hostUsername.value)
  const isMemberReady = (member: OnlineRoomLobbyMember) =>
    normalizeKey(member.status || '') === 'ready' || Number(member.ready_at || 0) > 0
  const isMemberInvited = (member: OnlineRoomLobbyMember) =>
    normalizeKey(member.status || '') === 'invited' || (!member.joined_at && Number(member.invited_at || 0) > 0)
  const isMemberParticipating = (member: OnlineRoomLobbyMember) => {
    const status = normalizeKey(member.status || '')
    if (['joined', 'ready', 'countdown_locked', 'active', 'disconnected', 'reconnecting', 'finished', 'settled'].includes(status)) return true
    return Number(member.joined_at || 0) > 0 || isMemberReady(member)
  }
  const isMemberOffline = (member: OnlineRoomLobbyMember) =>
    ['offline', 'disconnected'].includes(normalizeKey(member.status || '')) || Number(member.disconnected_at || 0) > 0

  const memberBadges = (member: OnlineRoomLobbyMember) => {
    const badges: string[] = []
    if (isMemberHost(member)) badges.push('房主')
    if (isMemberOffline(member)) badges.push('离线')
    if (isMemberInvited(member)) badges.push('被邀请')
    if (isMemberReady(member)) badges.push('已准备')
    if (badges.length === 0) badges.push('未准备')
    return badges
  }

  const normalizeRoomState = (value = ''): HostRoomState => {
    const key = normalizeKey(value).replace(/-/g, '_')
    if (key === 'inviting') return 'created'
    if (key === 'readycheck' || key === 'ready_check') return 'ready_check'
    if (key === 'countdown') return 'countdown'
    if (key === 'running' || key === 'paused') return 'running'
    if (key === 'settling' || key === 'settlement') return 'settling'
    if (key === 'settled' || key === 'finished' || key === 'completed') return 'settled'
    if (key === 'closed' || key === 'aborted' || key === 'cancelled' || key === 'canceled') return 'closed'
    if (key === 'created') return 'created'
    return 'unknown'
  }

  const normalizeMemberStatus = (value = ''): MemberRoomStatus => {
    const key = normalizeKey(value).replace(/-/g, '_')
    if (key === 'invited' || key === 'pending') return 'invited'
    if (key === 'joined' || key === 'accepted' || key === 'member') return 'joined'
    if (key === 'ready') return 'ready'
    if (key === 'running' || key === 'playing') return 'running'
    if (key === 'disconnected' || key === 'offline') return 'disconnected'
    if (key === 'settled' || key === 'rewarded' || key === 'completed') return 'settled'
    return 'unknown'
  }

  const normalizedRoomState = computed<HostRoomState>(() => normalizeRoomState(props.room?.state || ''))
  const normalizedMemberStatus = computed<MemberRoomStatus>(() => {
    const member = currentMember.value
    if (member && isMemberOffline(member)) return 'disconnected'
    const explicitStatus = normalizeMemberStatus(currentMemberStatus.value)
    if (explicitStatus === 'invited' || explicitStatus === 'disconnected') return explicitStatus
    if (!member) return 'unknown'
    if (normalizedRoomState.value === 'running' || normalizedRoomState.value === 'settling') return 'running'
    if (normalizedRoomState.value === 'settled' || normalizedRoomState.value === 'closed') return 'settled'
    if (explicitStatus !== 'unknown') return explicitStatus
    return isMemberReady(member) ? 'ready' : 'joined'
  })

  const roomHasCapability = (capability?: RoomCapability) => {
    if (!capability) return true
    const value = props.room?.[capability]
    return value !== false
  }

  const decorateAction = (action: LobbyAction): LobbyAction => {
    const capabilityBlocked = !roomHasCapability(action.enabledBy)
    const disabled = action.disabled || capabilityBlocked
    return {
      ...action,
      disabled,
      disabledReason: disabled ? action.disabledReason || '当前房间状态暂时不能执行此操作。' : action.disabledReason,
    }
  }

  const activeLobbyMatrix = computed<LobbyActionMatrix | null>(() => {
    if (!props.room) return null
    return isHost.value ? hostStateActionMatrix[normalizedRoomState.value] : memberStatusActionMatrix[normalizedMemberStatus.value]
  })
  const actionRunning = (key: LobbyActionKey) => isBusy.value || props.busyAction === key
  const actionDisabled = (action: LobbyAction) => action.disabled || actionRunning(action.key)
  const primaryAction = computed(() => activeLobbyMatrix.value ? decorateAction(activeLobbyMatrix.value.primary) : null)
  const primaryActionDisabled = computed(() => primaryAction.value ? actionDisabled(primaryAction.value) : true)
  const secondaryActions = computed<LobbyAction[]>(() => {
    const matrix = activeLobbyMatrix.value
    if (!matrix) return []
    return [...(matrix.secondary ?? []), ...(matrix.danger ?? [])].map(decorateAction)
  })
  const disabledActionReasons = computed(() => {
    const actionReasons = [primaryAction.value, ...secondaryActions.value]
      .filter((action): action is LobbyAction => Boolean(action?.disabled && action.disabledReason))
      .map(action => `${action.label}：${action.disabledReason}`)
    return Array.from(new Set(actionReasons))
  })

  const executeAction = (action: LobbyAction) => {
    if (actionDisabled(action)) return
    switch (action.key) {
      case 'invite':
        emit('invite')
        break
      case 'ready':
        emit('ready')
        break
      case 'unready':
        emit('unready')
        break
      case 'start-ready-check':
        emit('start-ready-check')
        break
      case 'start-countdown':
        emit('start-countdown')
        break
      case 'settle':
        emit('settle')
        break
      case 'cancel-room':
        emit('cancel-room')
        break
      case 'leave-room':
        emit('leave-room')
        break
      case 'accept-invite':
        emit('accept-invite')
        break
      case 'reconnect':
        emit('reconnect')
        break
      case 'view-countdown':
        emit('view-countdown')
        break
      case 'enter-gameplay':
        emit('enter-gameplay')
        break
      case 'view-members':
        emit('view-members')
        break
      case 'view-objective':
        emit('view-objective')
        break
      case 'view-settlement':
        emit('view-settlement')
        break
      case 'view-record':
        emit('view-record')
        break
      case 'return-lobby':
        emit('return-lobby')
        break
      case 'notify-members':
        emit('notify-members')
        break
      case 'retry-settle':
        emit('retry-settle')
        break
      case 'rematch':
        emit('rematch')
        break
    }
  }
</script>

<style scoped>
  .online-room-lobby__primary-action {
    min-height: 44px;
  }
</style>
