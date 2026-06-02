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
        <span class="text-[10px] leading-4 text-muted">玩家名或存档 ID</span>
        <textarea
          v-model="draftInput"
          class="online-textarea mt-1 min-h-[7rem] w-full"
          data-testid="online-invite-input"
          :disabled="busy"
          placeholder="可一次粘贴多个玩家名，用空格、逗号或换行分隔"
        />
      </label>

      <div v-if="draftRecipients.length > 0" class="space-y-2">
        <p class="text-[10px] leading-4 text-muted">待邀请</p>
        <div class="flex flex-wrap gap-2" data-testid="online-invite-draft-list">
          <span
            v-for="recipient in draftRecipients"
            :key="recipient"
            class="inline-flex min-h-[32px] items-center gap-1 border border-accent/15 bg-black/10 px-2 py-1 text-[10px] leading-4 text-muted"
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
        <p id="online-invite-recent-title" class="text-[10px] leading-4 text-muted">最近联机</p>
        <slot name="recent-players" :recent-players="recentPlayers" :add="addRecentPlayer">
          <div class="grid gap-2 sm:grid-cols-2" data-testid="online-invite-recent-list">
            <button
              v-for="player in recentPlayers"
              :key="playerKey(player)"
              type="button"
              class="game-panel-muted min-h-[54px] p-2 text-left transition-colors"
              :class="player.disabled ? 'opacity-60' : 'hover:border-accent/35'"
              :disabled="busy || player.disabled"
              :data-testid="`online-invite-recent-${playerKey(player)}`"
              @click="addRecentPlayer(player)"
            >
              <span class="block truncate text-xs leading-5 text-accent">{{ player.displayName || player.username }}</span>
              <span class="mt-0.5 block truncate text-[10px] leading-4 text-muted">
                {{ player.reason || player.subtitle || player.username }}
              </span>
            </button>
          </div>
        </slot>
      </section>

      <section v-if="existingMembers.length > 0" class="space-y-2" aria-labelledby="online-invite-existing-title">
        <p id="online-invite-existing-title" class="text-[10px] leading-4 text-muted">房间成员</p>
        <div class="grid gap-2 sm:grid-cols-2" data-testid="online-invite-existing-list">
          <div
            v-for="member in existingMembers"
            :key="memberKey(member)"
            class="border border-accent/10 bg-black/10 p-2"
            data-testid="online-invite-existing-member"
          >
            <p class="truncate text-xs leading-5 text-accent">{{ member.displayName || member.username || member.id }}</p>
            <p class="mt-0.5 truncate text-[10px] leading-4 text-muted">{{ member.statusLabel || member.status || '已在房间' }}</p>
          </div>
        </div>
      </section>

      <section class="space-y-2" aria-labelledby="online-invite-result-title">
        <div class="flex items-center justify-between gap-2">
          <p id="online-invite-result-title" class="text-[10px] leading-4 text-muted">邀请结果</p>
          <span class="text-[10px] leading-4 text-muted">{{ resultRows.length }} 项</span>
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
              <p class="mt-0.5 truncate text-[10px] leading-4 text-muted">{{ row.message || inviteStatusLabel(row.status) }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <span class="border border-accent/15 px-2 py-1 text-[10px] leading-4 text-muted">{{ inviteStatusLabel(row.status) }}</span>
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
          class="online-action-btn online-action-btn--compact justify-center"
          :disabled="busy"
          @click="emit('close')"
        >
          稍后邀请
        </button>
        <button
          type="button"
          class="online-action-btn online-action-btn--primary online-action-btn--compact justify-center"
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
    if (props.busy || player.disabled) return
    const recipient = player.username.trim()
    if (!recipient) return
    const nextRecipients = [...draftRecipients.value]
    if (!nextRecipients.some(item => normalizeRecipient(item) === normalizeRecipient(recipient))) {
      nextRecipients.push(recipient)
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
