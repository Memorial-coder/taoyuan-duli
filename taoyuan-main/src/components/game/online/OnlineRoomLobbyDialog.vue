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
          <p class="text-[10px] leading-4 text-muted">房间状态</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ roomStateLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[10px] leading-4 text-muted">成员</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ memberCountLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[10px] leading-4 text-muted">玩法</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ gameplayLabel }}</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[10px] leading-4 text-muted">我的身份</p>
          <p class="mt-1 text-sm leading-5 text-accent">{{ currentRoleLabel }}</p>
        </div>
      </section>

      <section v-if="lastFeedbackText" class="border border-emerald-300/20 bg-emerald-500/10 p-2 text-xs leading-5 text-emerald-100" data-testid="online-room-lobby-feedback">
        {{ lastFeedbackText }}
      </section>

      <section class="space-y-2" aria-labelledby="online-room-lobby-member-title">
        <div class="flex items-center justify-between gap-2">
          <p id="online-room-lobby-member-title" class="text-xs leading-5 text-accent">成员状态</p>
          <span class="text-[10px] leading-4 text-muted">{{ readyCountLabel }}</span>
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
              <p class="mt-0.5 truncate text-[10px] leading-4 text-muted">{{ memberSubLabel(member) }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-1.5">
              <span v-for="badge in memberBadges(member)" :key="badge" class="border border-accent/15 px-2 py-1 text-[10px] leading-4 text-muted">
                {{ badge }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="primaryBlockedReason" class="border border-amber-300/20 bg-amber-500/10 p-2 text-[10px] leading-4 text-amber-100" data-testid="online-room-disabled-reason">
        {{ primaryBlockedReason }}
      </section>
    </div>

    <template #footer>
      <div class="space-y-2">
        <button
          v-if="primaryAction"
          type="button"
          class="online-action-btn online-action-btn--primary min-h-[44px] w-full justify-center"
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
  import { CheckCircle2, Clock3, LogOut, PlayCircle, UserPlus, XCircle } from 'lucide-vue-next'
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
    members?: OnlineRoomLobbyMember[]
    can_invite?: boolean
    can_ready?: boolean
    can_unready?: boolean
    can_leave?: boolean
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

  type LobbyAction = {
    key: LobbyActionKey
    label: string
    icon: unknown
    tone?: 'default' | 'danger'
    disabled?: boolean
    disabledReason?: string
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
    close: []
  }>()

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
  const memberCountLabel = computed(() => memberLimit.value > 0 ? `${members.value.length}/${memberLimit.value} 人` : `${members.value.length} 人`)
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
  const readyMembers = computed(() => members.value.filter(member => isMemberReady(member)).length)
  const readyCountLabel = computed(() => `${readyMembers.value}/${members.value.length} 已准备`)
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

  const actionRunning = (key: LobbyActionKey) => isBusy.value || props.busyAction === key
  const actionDisabled = (action: LobbyAction) => action.disabled || actionRunning(action.key)

  const hostPrimaryAction = computed<LobbyAction | null>(() => {
    const room = props.room
    if (!room) return null
    if (room.can_invite && room.state === 'created') return { key: 'invite', label: '邀请玩家', icon: UserPlus }
    if (room.can_host_start_countdown) return { key: 'start-countdown', label: '开始倒计时', icon: Clock3 }
    if (room.can_host_ready_check) return { key: 'start-ready-check', label: '开始准备', icon: PlayCircle }
    if (room.can_host_settle) return { key: 'settle', label: '查看结算', icon: CheckCircle2 }
    return {
      key: 'start-countdown',
      label: '开始倒计时',
      icon: Clock3,
      disabled: true,
      disabledReason: room.state === 'ready_check' ? '还有成员未准备，暂时不能倒计时。' : '当前房间状态没有可执行的房主主行动。',
    }
  })

  const memberPrimaryAction = computed<LobbyAction | null>(() => {
    const room = props.room
    if (!room) return null
    if (currentMemberStatus.value === 'invited') return { key: 'accept-invite', label: '接受邀请', icon: CheckCircle2 }
    if (room.can_ready) return { key: 'ready', label: '我已准备', icon: CheckCircle2 }
    if (room.can_unready) return { key: 'unready', label: '取消准备', icon: Clock3 }
    return {
      key: 'ready',
      label: '我已准备',
      icon: CheckCircle2,
      disabled: true,
      disabledReason: '当前房间状态暂时不能修改准备状态。',
    }
  })

  const primaryAction = computed(() => isHost.value ? hostPrimaryAction.value : memberPrimaryAction.value)
  const primaryActionDisabled = computed(() => primaryAction.value ? actionDisabled(primaryAction.value) : true)
  const primaryBlockedReason = computed(() => primaryAction.value?.disabledReason || '')
  const secondaryActions = computed<LobbyAction[]>(() => {
    const room = props.room
    if (!room) return []
    const actions: LobbyAction[] = []
    if (isHost.value) {
      if (room.can_invite && primaryAction.value?.key !== 'invite') actions.push({ key: 'invite', label: '继续邀请', icon: UserPlus })
      if (room.can_host_ready_check && primaryAction.value?.key !== 'start-ready-check') actions.push({ key: 'start-ready-check', label: '开始准备', icon: PlayCircle })
      if (room.can_host_close) actions.push({ key: 'cancel-room', label: '取消房间', icon: XCircle, tone: 'danger' })
      return actions
    }
    if (room.can_leave) actions.push({ key: 'leave-room', label: '离开房间', icon: LogOut, tone: 'danger' })
    return actions
  })

  const executeAction = (action: LobbyAction) => {
    if (actionDisabled(action)) return
    if (action.key === 'invite') emit('invite')
    if (action.key === 'ready') emit('ready')
    if (action.key === 'unready') emit('unready')
    if (action.key === 'start-ready-check') emit('start-ready-check')
    if (action.key === 'start-countdown') emit('start-countdown')
    if (action.key === 'settle') emit('settle')
    if (action.key === 'cancel-room') emit('cancel-room')
    if (action.key === 'leave-room') emit('leave-room')
    if (action.key === 'accept-invite') emit('accept-invite')
  }
</script>
