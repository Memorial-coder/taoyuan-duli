<template>
  <OnlineBottomSheet
    :open="open"
    :title="panelTitle"
    :description="panelDescription"
    side="bottom"
    :close-on-backdrop="!busy"
    initial-focus="[data-testid='online-invite-input']"
    @close="emit('close')"
  >
    <div class="space-y-4" data-testid="online-invite-panel">
      <label class="block">
        <span class="text-[0.625rem] leading-4 text-muted">玩家名或存档 ID</span>
        <textarea
          v-model="draftInput"
          class="online-textarea mt-1 min-h-[7rem] w-full"
          data-testid="online-invite-input"
          :disabled="busy"
          placeholder="可一次粘贴多个玩家名，用空格、逗号或换行分隔"
        />
      </label>

      <div v-if="draftRecipients.length > 0" class="space-y-2">
        <p class="text-[0.625rem] leading-4 text-muted">待邀请</p>
        <div class="flex flex-wrap gap-2" data-testid="online-invite-draft-list">
          <span
            v-for="recipient in draftRecipients"
            :key="recipient"
            class="inline-flex min-h-[32px] items-center gap-1 border border-accent/15 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
          >
            {{ recipient }}
            <button
              type="button"
              class="online-action-btn online-action-btn--icon online-action-btn--compact"
              :aria-label="`移除 ${recipient}`"
              :disabled="busy"
              @click="removeRecipient(recipient)"
            >
              <X :size="12" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <section v-if="recentPlayers.length > 0 || $slots['recent-players']" class="space-y-2" aria-labelledby="online-invite-recent-title">
        <div class="flex items-center justify-between gap-2">
          <p id="online-invite-recent-title" class="text-[0.625rem] leading-4 text-muted">可直接选择</p>
          <span class="text-[0.625rem] leading-4 text-muted">{{ selectablePlayerCount }} 人可选</span>
        </div>
        <div
          v-if="recommendedInvitePlayers.length > 0"
          class="space-y-2 border border-accent/10 bg-black/10 p-2"
          data-testid="online-invite-priority-picks"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <p class="text-[0.625rem] leading-4 text-accent">推荐一起开局</p>
              <p class="mt-0.5 text-[0.625rem] leading-4 text-muted" data-testid="online-invite-priority-summary">
                优先在线好友、近期队友和推荐玩家，先把最可能响应的人加入邀请名单。
              </p>
            </div>
            <button
              type="button"
              class="online-action-btn online-action-btn--compact min-h-[36px] shrink-0 justify-center"
              data-testid="online-invite-priority-add-all"
              :disabled="busy || recommendedInvitablePlayers.length === 0"
              @click="addRecommendedPlayers"
            >
              <UserPlus :size="12" aria-hidden="true" />
              加入推荐 {{ recommendedInvitablePlayers.length }}
            </button>
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <button
              v-for="player in recommendedInvitePlayers"
              :key="`priority-${playerKey(player)}`"
              type="button"
              class="game-panel-muted min-h-[72px] p-2 text-left transition-colors"
              :class="getPlayerCardClass(player)"
              :disabled="!isPlayerSelectable(player)"
              :aria-pressed="isRecipientSelected(player)"
              :data-testid="`online-invite-priority-player-${playerKey(player)}`"
              @click="addRecentPlayer(player)"
            >
              <span class="flex min-w-0 items-start justify-between gap-2">
                <span class="min-w-0">
                  <span class="block truncate text-xs leading-5 text-accent">{{ player.displayName || player.username }}</span>
                  <span class="mt-0.5 block truncate text-[0.625rem] leading-4 text-muted">
                    {{ getPlayerRecommendationLabel(player) }}
                  </span>
                </span>
                <span class="shrink-0 border border-accent/15 px-1.5 py-0.5 text-[0.625rem] leading-4 text-muted">
                  {{ getPlayerSelectionLabel(player) }}
                </span>
              </span>
            </button>
          </div>
        </div>
        <slot name="recent-players" :recent-players="recentPlayers" :add="addRecentPlayer">
          <div class="space-y-3" data-testid="online-invite-player-groups">
            <section
              v-for="group in invitePlayerGroups"
              :key="group.id"
              class="space-y-2"
              :data-testid="`online-invite-player-group-${group.id}`"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[0.625rem] leading-4 text-accent">{{ group.label }}</p>
                <span class="text-[0.625rem] leading-4 text-muted">{{ group.players.length }} 人</span>
              </div>
              <div class="grid gap-2 sm:grid-cols-2" data-testid="online-invite-recent-list">
                <button
                  v-for="player in group.players"
                  :key="playerKey(player)"
                  type="button"
                  class="game-panel-muted min-h-[64px] p-2 text-left transition-colors"
                  :class="getPlayerCardClass(player)"
                  :disabled="!isPlayerSelectable(player)"
                  :aria-pressed="isRecipientSelected(player)"
                  :data-testid="`online-invite-recent-${playerKey(player)}`"
                  @click="addRecentPlayer(player)"
                >
                  <span class="flex min-w-0 items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block truncate text-xs leading-5 text-accent">{{ player.displayName || player.username }}</span>
                      <span class="mt-0.5 block truncate text-[0.625rem] leading-4 text-muted">
                        {{ player.reason || player.subtitle || player.username }}
                      </span>
                    </span>
                    <span class="shrink-0 border border-accent/15 px-1.5 py-0.5 text-[0.625rem] leading-4 text-muted">
                      {{ getPlayerSelectionLabel(player) }}
                    </span>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </slot>
      </section>

      <section v-if="existingMembers.length > 0" class="space-y-2" aria-labelledby="online-invite-existing-title">
        <p id="online-invite-existing-title" class="text-[0.625rem] leading-4 text-muted">房间成员</p>
        <div class="grid gap-2 sm:grid-cols-2" data-testid="online-invite-existing-list">
          <div
            v-for="member in existingMembers"
            :key="memberKey(member)"
            class="border border-accent/10 bg-black/10 p-2"
            data-testid="online-invite-existing-member"
          >
            <p class="truncate text-xs leading-5 text-accent">{{ member.displayName || member.username || member.id }}</p>
            <p class="mt-0.5 truncate text-[0.625rem] leading-4 text-muted">{{ member.statusLabel || member.status || '已在房间' }}</p>
          </div>
        </div>
      </section>

      <section class="space-y-2" aria-labelledby="online-invite-result-title">
        <div class="flex items-center justify-between gap-2">
          <p id="online-invite-result-title" class="text-[0.625rem] leading-4 text-muted">邀请结果</p>
          <span class="text-[0.625rem] leading-4 text-muted">{{ resultRows.length }} 项</span>
        </div>

        <div v-if="resultRows.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted" data-testid="online-invite-result-list">
          输入玩家名后可以发送邀请，失败项会留在这里方便重试。
        </div>

        <div v-else class="space-y-2" data-testid="online-invite-result-list" role="list">
          <div
            v-for="row in resultRows"
            :key="rowKey(row)"
            class="flex flex-col gap-2 border border-accent/10 bg-black/10 p-2 sm:flex-row sm:items-center sm:justify-between"
            role="listitem"
            :data-testid="`online-invite-result-${rowKey(row)}`"
          >
            <div class="min-w-0">
              <p class="truncate text-xs leading-5 text-accent">{{ row.displayName || row.username }}</p>
              <p class="mt-0.5 truncate text-[0.625rem] leading-4 text-muted">{{ row.message || inviteStatusLabel(row.status) }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <span class="border border-accent/15 px-2 py-1 text-[0.625rem] leading-4 text-muted">{{ inviteStatusLabel(row.status) }}</span>
              <button
                v-if="row.status === 'failed'"
                type="button"
                class="online-action-btn online-action-btn--compact"
                data-testid="online-invite-retry"
                :disabled="busy"
                @click="retryInvite(row)"
              >
                <RefreshCcw :size="12" aria-hidden="true" />
                重试
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact"
                data-testid="online-invite-remove"
                :disabled="busy"
                @click="removeResult(row)"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="online-action-btn online-action-btn--compact online-invite-panel__footer-action min-h-[44px] justify-center"
          :disabled="busy"
          @click="emit('close')"
        >
          稍后邀请
        </button>
        <button
          type="button"
          class="online-action-btn online-action-btn--primary online-action-btn--compact online-invite-panel__footer-action min-h-[44px] justify-center"
          data-testid="online-invite-submit"
          :disabled="busy || invitableRecipients.length === 0"
          @click="submitInvites"
        >
          <UserPlus :size="13" aria-hidden="true" />
          {{ busy ? '发送中' : `发送邀请 ${invitableRecipients.length}` }}
        </button>
      </div>
    </template>
  </OnlineBottomSheet>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { RefreshCcw, UserPlus, X } from 'lucide-vue-next'
  import OnlineBottomSheet from './OnlineBottomSheet.vue'

  export type OnlineInviteDomain = 'festival' | 'expedition' | 'society' | 'neighbor' | 'room'
  export type OnlineInviteStatus = 'pending' | 'inviting' | 'invited' | 'failed' | 'already-in-room' | 'blocked'
  export type OnlineInvitePlayerGroup = 'online-friends' | 'friends' | 'recent' | 'recommended' | 'blocked' | 'other'

  export type OnlineInviteExistingMember = {
    id?: string
    username?: string
    displayName?: string
    status?: string
    statusLabel?: string
  }

  export type OnlineInviteRecentPlayer = {
    id?: string
    username: string
    displayName?: string
    subtitle?: string
    disabled?: boolean
    reason?: string
    group?: OnlineInvitePlayerGroup
    groupLabel?: string
  }

  export type OnlineInviteResult = {
    id?: string
    username: string
    displayName?: string
    status: OnlineInviteStatus
    message?: string
  }

  const props = withDefaults(defineProps<{
    open: boolean
    domain: OnlineInviteDomain
    existingMembers?: OnlineInviteExistingMember[]
    recentPlayers?: OnlineInviteRecentPlayer[]
    results?: OnlineInviteResult[]
    busy?: boolean
    title?: string
    description?: string
  }>(), {
    existingMembers: () => [],
    recentPlayers: () => [],
    results: () => [],
    busy: false,
    title: '',
    description: '',
  })

  const emit = defineEmits<{
    invite: [recipients: string[]]
    retry: [recipient: string]
    remove: [recipient: string]
    close: []
  }>()

  const draftInput = ref('')

  const domainLabel = computed(() => {
    if (props.domain === 'festival') return '节会房'
    if (props.domain === 'expedition') return '远征队伍'
    if (props.domain === 'society') return '村社'
    if (props.domain === 'neighbor') return '邻里'
    return '房间'
  })

  const panelTitle = computed(() => props.title || `邀请玩家加入${domainLabel.value}`)
  const panelDescription = computed(() => props.description || '可单独输入，也可以批量粘贴；邀请失败的玩家会保留在结果里方便重试。')

  const splitInviteText = (value: string) => value
    .split(/[\s,，]+/g)
    .map(item => item.trim())
    .filter(Boolean)

  const normalizeRecipient = (value = '') => value.trim().toLowerCase()

  const draftRecipients = computed(() => {
    const seen = new Set<string>()
    return splitInviteText(draftInput.value).filter(recipient => {
      const key = normalizeRecipient(recipient)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

  const existingMemberKeys = computed(() => new Set(
    props.existingMembers.flatMap(member => [member.id, member.username, member.displayName].map(value => normalizeRecipient(value || '')))
      .filter(Boolean)
  ))

  const selectedRecipientKeys = computed(() => new Set(draftRecipients.value.map(normalizeRecipient).filter(Boolean)))

  const invitePlayerGroupLabels: Record<OnlineInvitePlayerGroup, string> = {
    'online-friends': '在线好友',
    friends: '好友',
    recent: '最近联机',
    recommended: '推荐玩家',
    blocked: '暂不可邀请',
    other: '其他候选',
  }
  const invitePlayerGroupOrder: OnlineInvitePlayerGroup[] = ['online-friends', 'friends', 'recent', 'recommended', 'other', 'blocked']

  const getPlayerGroupId = (player: OnlineInviteRecentPlayer): OnlineInvitePlayerGroup => {
    if (player.group) return player.group
    if (player.disabled) return 'blocked'
    return 'recommended'
  }

  const getRecipientForPlayer = (player: OnlineInviteRecentPlayer) => player.username.trim()
  const isExistingPlayer = (player: OnlineInviteRecentPlayer) => {
    const recipient = normalizeRecipient(getRecipientForPlayer(player))
    return existingMemberKeys.value.has(recipient) || existingMemberKeys.value.has(normalizeRecipient(player.displayName || ''))
  }
  const isRecipientSelected = (player: OnlineInviteRecentPlayer) =>
    selectedRecipientKeys.value.has(normalizeRecipient(getRecipientForPlayer(player)))
  const isPlayerAvailable = (player: OnlineInviteRecentPlayer) =>
    !player.disabled && !isExistingPlayer(player) && !isRecipientSelected(player)
  const isPlayerSelectable = (player: OnlineInviteRecentPlayer) =>
    !props.busy && isPlayerAvailable(player)

  const getPlayerSelectionLabel = (player: OnlineInviteRecentPlayer) => {
    if (isExistingPlayer(player)) return '已在房'
    if (isRecipientSelected(player)) return '已选'
    if (player.disabled) return '不可邀'
    return '选择'
  }

  const getPlayerCardClass = (player: OnlineInviteRecentPlayer) => {
    if (isExistingPlayer(player) || isRecipientSelected(player) || player.disabled) return 'opacity-60'
    return 'hover:border-accent/35'
  }

  const invitePlayerGroups = computed(() => {
    const groups = new Map<OnlineInvitePlayerGroup, OnlineInviteRecentPlayer[]>()
    for (const player of props.recentPlayers) {
      const groupId = getPlayerGroupId(player)
      const list = groups.get(groupId) ?? []
      list.push(player)
      groups.set(groupId, list)
    }
    return invitePlayerGroupOrder
      .filter(groupId => groups.has(groupId))
      .map(groupId => ({
        id: groupId,
        label: groups.get(groupId)?.[0]?.groupLabel || invitePlayerGroupLabels[groupId],
        players: groups.get(groupId) ?? [],
      }))
  })

  const inviteGroupPriority: Record<OnlineInvitePlayerGroup, number> = {
    'online-friends': 0,
    friends: 1,
    recent: 2,
    recommended: 3,
    other: 4,
    blocked: 5,
  }
  const getPlayerRecommendationLabel = (player: OnlineInviteRecentPlayer) => {
    const groupId = getPlayerGroupId(player)
    if (player.reason) return player.reason
    if (player.subtitle) return player.subtitle
    if (groupId === 'online-friends') return '在线好友，适合马上准备。'
    if (groupId === 'friends') return '好友，适合固定队协作。'
    if (groupId === 'recent') return '近期一起出现过，适合快速复开。'
    if (groupId === 'recommended') return '推荐玩家，适合补位开局。'
    return player.username
  }
  const recommendedInvitePlayers = computed(() =>
    props.recentPlayers
      .filter(isPlayerAvailable)
      .slice()
      .sort((left, right) => {
        const priorityDiff = inviteGroupPriority[getPlayerGroupId(left)] - inviteGroupPriority[getPlayerGroupId(right)]
        if (priorityDiff !== 0) return priorityDiff
        return (left.displayName || left.username).localeCompare(right.displayName || right.username, 'zh-Hans-CN')
      })
      .slice(0, 3)
  )
  const recommendedInvitablePlayers = computed(() => recommendedInvitePlayers.value.filter(isPlayerAvailable))
  const selectablePlayerCount = computed(() => props.recentPlayers.filter(isPlayerSelectable).length)

  const invitableRecipients = computed(() =>
    draftRecipients.value.filter(recipient => !existingMemberKeys.value.has(normalizeRecipient(recipient)))
  )

  const resultRows = computed<OnlineInviteResult[]>(() => {
    if (props.results.length > 0) return props.results
    return draftRecipients.value.map(recipient => ({
      username: recipient,
      status: existingMemberKeys.value.has(normalizeRecipient(recipient)) ? 'already-in-room' : 'pending',
    }))
  })

  const playerKey = (player: OnlineInviteRecentPlayer) => player.id || player.username
  const memberKey = (member: OnlineInviteExistingMember) => member.id || member.username || member.displayName || 'member'
  const rowKey = (row: OnlineInviteResult) => row.id || row.username

  const inviteStatusLabel = (status: OnlineInviteStatus) => {
    if (status === 'pending') return '待发送'
    if (status === 'inviting') return '邀请中'
    if (status === 'invited') return '已邀请'
    if (status === 'failed') return '邀请失败'
    if (status === 'already-in-room') return '已在房间'
    return '暂不可邀请'
  }

  const addRecentPlayer = (player: OnlineInviteRecentPlayer) => {
    if (!isPlayerSelectable(player)) return
    const recipient = getRecipientForPlayer(player)
    if (!recipient) return
    const nextRecipients = [...draftRecipients.value]
    if (!nextRecipients.some(item => normalizeRecipient(item) === normalizeRecipient(recipient))) {
      nextRecipients.push(recipient)
    }
    draftInput.value = nextRecipients.join('\n')
  }
  const addRecommendedPlayers = () => {
    if (props.busy || recommendedInvitablePlayers.value.length === 0) return
    const nextRecipients = [...draftRecipients.value]
    for (const player of recommendedInvitablePlayers.value) {
      const recipient = getRecipientForPlayer(player)
      if (!recipient) continue
      if (!nextRecipients.some(item => normalizeRecipient(item) === normalizeRecipient(recipient))) {
        nextRecipients.push(recipient)
      }
    }
    draftInput.value = nextRecipients.join('\n')
  }

  const removeRecipient = (recipient: string) => {
    draftInput.value = draftRecipients.value.filter(item => item !== recipient).join('\n')
    emit('remove', recipient)
  }

  const retryInvite = (row: OnlineInviteResult) => {
    emit('retry', row.username)
  }

  const removeResult = (row: OnlineInviteResult) => {
    removeRecipient(row.username)
  }

  const submitInvites = () => {
    if (props.busy || invitableRecipients.value.length === 0) return
    emit('invite', invitableRecipients.value)
  }

  watch(
    () => props.open,
    isOpen => {
      if (!isOpen) return
      draftInput.value = ''
    }
  )
</script>

<style scoped>
  .online-invite-panel__footer-action {
    min-height: 44px;
  }
</style>
