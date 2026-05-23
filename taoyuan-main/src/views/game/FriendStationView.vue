<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/70" data-testid="region-social-friend-panel">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-accent">
            <Users :size="14" />
            <p class="text-xs">好友驿站</p>
          </div>
          <p class="text-[10px] text-muted mt-1 leading-4">
            存档身份：<span class="text-accent break-all">{{ ownSaveIdLabel }}</span>
            <template v-if="saveStore.currentOnlineIdentity?.save_slot !== null && saveStore.currentOnlineIdentity?.save_slot !== undefined">
              · 槽位 {{ Number(saveStore.currentOnlineIdentity.save_slot) + 1 }}
            </template>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            :disabled="socialStore.relationshipLoading"
            title="刷新好友关系"
            @click="refreshFriendStation"
          >
            <RefreshCw :size="12" />
            {{ socialStore.relationshipLoading ? '刷新中' : '刷新' }}
          </button>
          <button
            class="online-action-btn online-action-btn--compact"
            :disabled="!ownActiveSaveId"
            title="复制当前存档 ID"
            @click="copyOwnSaveId"
          >
            <Copy :size="12" />
            复制 ID
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[10px] text-muted">好友</p>
          <p class="text-accent mt-1">{{ socialStore.friends.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[10px] text-muted">收到申请</p>
          <p class="text-accent mt-1">{{ socialStore.incomingRequests.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[10px] text-muted">发出申请</p>
          <p class="text-accent mt-1">{{ socialStore.outgoingRequests.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[10px] text-muted">已拉黑</p>
          <p class="text-accent mt-1">{{ socialStore.blockedUsers.length }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] gap-3 mt-3">
        <div class="space-y-2 min-w-0">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-2">存档 ID 搜索</p>
            <div class="flex gap-2">
              <input
                v-model="socialStore.friendSaveIdDraft"
                class="online-input flex-1 min-w-0"
                inputmode="numeric"
                maxlength="12"
                placeholder="9 位数字 ID"
                @keyup.enter="searchPlayerBySaveId"
              />
              <button
                class="online-action-btn online-action-btn--primary online-action-btn--icon shrink-0"
                :disabled="socialStore.playerSearchLoading"
                data-testid="region-social-search-submit"
                title="搜索存档 ID"
                @click="searchPlayerBySaveId"
              >
                <Search :size="15" />
              </button>
            </div>

            <div v-if="searchedPlayer" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/60">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-accent truncate">{{ searchedPlayer.profile.display_name }}</p>
                  <p class="text-[10px] text-muted mt-1 break-all">ID {{ searchedPlayer.identity.save_id }} · {{ searchedPlayer.identity.account_username }}</p>
                </div>
                <span class="text-[10px] text-muted shrink-0">槽位 {{ Number(searchedPlayer.identity.save_slot ?? 0) + 1 }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2 leading-4">{{ searchedPlayer.profile.recent_activity || '暂无近期动态' }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  class="online-action-btn online-action-btn--compact"
                  :disabled="!canActOnSearchedPlayer || socialStore.relationshipActionRunning"
                  data-testid="region-social-search-request"
                  title="发送好友申请"
                  @click="sendFriendRequest(searchedSaveId)"
                >
                  <UserPlus :size="12" />
                  申请
                </button>
                <button
                  class="online-action-btn online-action-btn--compact online-action-btn--danger"
                  :disabled="!canActOnSearchedPlayer || socialStore.relationshipActionRunning"
                  data-testid="region-social-search-block"
                  title="拉黑该存档"
                  @click="blockSaveId(searchedSaveId)"
                >
                  <Ban :size="12" />
                  拉黑
                </button>
              </div>
            </div>
            <p v-else-if="socialStore.errorMessage" class="text-[10px] text-danger mt-2 leading-4">{{ socialStore.errorMessage }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[10px] text-muted mb-1">收到的申请</p>
              <p v-if="socialStore.incomingRequests.length === 0" class="text-[10px] text-muted leading-4">当前没有新的好友申请。</p>
              <div
                v-for="entry in socialStore.incomingRequests.slice(0, 3)"
                :key="entry.request_id"
                class="border border-accent/10 rounded-xs p-2 mb-1.5"
                :data-testid="`region-social-incoming-${entry.request_id || 'missing'}`"
              >
                <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                <p class="text-[10px] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'incoming') }}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button class="online-action-btn online-action-btn--compact" :disabled="socialStore.relationshipActionRunning || !entry.request_id" :data-testid="`region-social-incoming-accept-${entry.request_id || 'missing'}`" @click="acceptRequest(entry.request_id!)">接受</button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="socialStore.relationshipActionRunning || !entry.request_id" :data-testid="`region-social-incoming-reject-${entry.request_id || 'missing'}`" @click="rejectRequest(entry.request_id!)">拒绝</button>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[10px] text-muted mb-1">发出的申请</p>
              <p v-if="socialStore.outgoingRequests.length === 0" class="text-[10px] text-muted leading-4">当前没有待处理的外发申请。</p>
              <div v-for="entry in socialStore.outgoingRequests.slice(0, 3)" :key="entry.request_id" class="border border-accent/10 rounded-xs p-2 mb-1.5" :data-testid="`region-social-outgoing-${entry.request_id || 'missing'}`">
                <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                <p class="text-[10px] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'outgoing') }}</p>
                <p class="text-[10px] text-muted mt-1">{{ formatSocialTime(entry.created_at, '待处理') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2 min-w-0">
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[10px] text-muted">好友列表</p>
              <span class="text-[10px] text-accent">{{ socialStore.friends.length }} 人</span>
            </div>
            <p v-if="socialStore.friends.length === 0" class="text-[10px] text-muted mt-2 leading-4">当前还没有好友。</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div v-for="entry in socialStore.friends.slice(0, 4)" :key="entry.friendship_id" class="border border-accent/10 rounded-xs p-2 min-w-0 bg-bg/60" :data-testid="`region-social-friend-${entry.friendship_id || 'missing'}`">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                    <p class="text-[10px] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'friend') }}</p>
                  </div>
                  <span class="text-[10px] text-muted shrink-0">{{ formatSocialTime(entry.last_interaction_at ?? entry.friends_since, '未互动') }}</span>
                </div>
                <p class="text-[10px] text-muted mt-2 leading-4">{{ entry.profile.recent_activity || entry.profile.primary_route_label }}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-manor-${entry.friendship_id || 'missing'}`" @click="openFriendManor(entry)">
                    <Map :size="11" />
                    庄园
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-mail-${entry.friendship_id || 'missing'}`" @click="openFriendMail(entry, 'letter')">
                    <Mail :size="11" />
                    写信
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-gift-${entry.friendship_id || 'missing'}`" @click="openFriendMail(entry, 'gift')">
                    <Gift :size="11" />
                    送礼
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-invite-${entry.friendship_id || 'missing'}`" @click="openFriendExpeditionInvite(entry)">
                    <UserPlus :size="11" />
                    邀请进房
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-festival-${entry.friendship_id || 'missing'}`" @click="openFriendFestivalInvite(entry)">
                    <UserPlus :size="11" />
                    节会
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-society-${entry.friendship_id || 'missing'}`" @click="openFriendSocietyInvite(entry)">
                    <Users :size="11" />
                    村社
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-coop-${entry.friendship_id || 'missing'}`" @click="openFriendCoop(entry)">
                    <Users :size="11" />
                    协作
                  </button>
                  <button class="online-action-btn online-action-btn--compact online-action-btn--danger" :disabled="socialStore.relationshipActionRunning || !entry.friendship_id" :data-testid="`region-social-friend-remove-${entry.friendship_id || 'missing'}`" @click="removeFriend(entry)">删除</button>
                  <button class="online-action-btn online-action-btn--compact online-action-btn--danger" :disabled="socialStore.relationshipActionRunning || !entry.friend_save_id" :data-testid="`region-social-friend-block-${entry.friendship_id || 'missing'}`" @click="blockRelation(entry)">拉黑</button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[10px] text-muted mb-1">最近互动</p>
              <p v-if="recentFriendInteractions.length === 0" class="text-[10px] text-muted leading-4">暂无好友互动记录。</p>
              <div v-for="entry in recentFriendInteractions" :key="`recent-${entry.friendship_id}`" class="flex items-center justify-between gap-2 border border-accent/10 rounded-xs px-2 py-1.5 mb-1">
                <span class="text-[10px] text-accent truncate">{{ entry.profile.display_name }}</span>
                <span class="text-[10px] text-muted shrink-0">{{ formatSocialTime(entry.last_interaction_at ?? entry.friends_since, '未互动') }}</span>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[10px] text-muted mb-1">已拉黑</p>
              <p v-if="socialStore.blockedUsers.length === 0" class="text-[10px] text-muted leading-4">当前没有拉黑玩家。</p>
              <div v-for="entry in socialStore.blockedUsers.slice(0, 4)" :key="entry.block_id" class="border border-accent/10 rounded-xs p-2 mb-1.5" :data-testid="`region-social-blocked-${entry.block_id || 'missing'}`">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                    <p class="text-[10px] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'blocked') }}</p>
                  </div>
                  <button class="online-action-btn online-action-btn--compact shrink-0" :disabled="socialStore.relationshipActionRunning" :data-testid="`region-social-blocked-unblock-${entry.block_id || 'missing'}`" @click="unblockRelation(entry)">解除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Ban, Copy, Gift, Mail, Map, RefreshCw, Search, UserPlus, Users } from 'lucide-vue-next'
  import { showFloat } from '@/composables/useGameLog'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import type { OnlineRelationCard } from '@/utils/onlineProfileApi'

  const router = useRouter()
  const saveStore = useSaveStore()
  const socialStore = useSocialStore()

  const ownRelationshipSaveId = computed(() =>
    socialStore.friends.find(entry => entry.own_save_id)?.own_save_id
      ?? socialStore.incomingRequests.find(entry => entry.to_save_id)?.to_save_id
      ?? socialStore.outgoingRequests.find(entry => entry.from_save_id)?.from_save_id
      ?? socialStore.blockedUsers.find(entry => entry.own_save_id)?.own_save_id
      ?? 0
  )
  const ownActiveSaveId = computed(() => saveStore.currentOnlineIdentity?.save_id ?? ownRelationshipSaveId.value)
  const ownSaveIdLabel = computed(() => ownActiveSaveId.value ? String(ownActiveSaveId.value) : '请先使用服务端存档同步身份')
  const searchedPlayer = computed(() => {
    const result = socialStore.playerSearchResult
    if (!result?.profile || !result.save_identity) return null
    return {
      profile: result.profile,
      identity: result.save_identity
    }
  })
  const searchedSaveId = computed(() => Number(searchedPlayer.value?.identity.save_id ?? 0))
  const canActOnSearchedPlayer = computed(() => {
    const ownSaveId = ownActiveSaveId.value
    return Number.isInteger(searchedSaveId.value) && searchedSaveId.value > 0 && searchedSaveId.value !== ownSaveId
  })
  const recentFriendInteractions = computed(() =>
    [...socialStore.friends]
      .sort((left, right) => Number(right.last_interaction_at ?? right.friends_since ?? 0) - Number(left.last_interaction_at ?? left.friends_since ?? 0))
      .slice(0, 3)
  )

  const formatSocialTime = (timestamp?: number, emptyLabel = '-') => {
    if (!timestamp) return emptyLabel
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getRelationSaveIdLine = (entry: OnlineRelationCard, kind: 'incoming' | 'outgoing' | 'friend' | 'blocked') => {
    if (kind === 'incoming') return `来自 ID ${entry.from_save_id || '未绑定'}`
    if (kind === 'outgoing') return `目标 ID ${entry.to_save_id || '未绑定'}`
    if (kind === 'blocked') return `拉黑 ID ${entry.blocked_save_id || '未绑定'}`
    return `好友 ID ${entry.friend_save_id || '未绑定'}`
  }

  const getFriendTargetUsername = (entry: OnlineRelationCard) => entry.profile.username?.trim() || ''
  const buildFriendTargetQuery = (entry: OnlineRelationCard) => {
    const targetUsername = getFriendTargetUsername(entry)
    if (!targetUsername) return null
    return {
      target_username: targetUsername,
      target_save_id: entry.friend_save_id ? String(entry.friend_save_id) : undefined,
      source: 'friend_station'
    }
  }

  const openFriendManor = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-manor', query })
  }

  const openFriendMail = (entry: OnlineRelationCard, compose: 'letter' | 'gift') => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'mail', query: { ...query, compose } })
  }

  const openFriendExpeditionInvite = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-festival', query: { ...query, invite: '1', tab: 'expedition' } })
  }

  const openFriendFestivalInvite = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-festival', query: { ...query, invite: '1', tab: 'festival' } })
  }

  const openFriendSocietyInvite = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-society', query: { ...query, invite: '1', tab: 'members' } })
  }

  const openFriendCoop = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-orders', query: { ...query, scope: 'friends', tab: 'publish' } })
  }

  const refreshFriendStation = async () => {
    await socialStore.refreshRelationships().catch(error => {
      const message = error instanceof Error ? error.message : '刷新好友关系失败'
      showFloat(message, 'danger')
    })
  }

  const searchPlayerBySaveId = async () => {
    await socialStore.searchPlayerBySaveIdDraft().catch(error => {
      const message = error instanceof Error ? error.message : '搜索存档玩家失败'
      showFloat(message, 'danger')
    })
  }

  const copyOwnSaveId = async () => {
    const saveId = ownActiveSaveId.value
    if (!saveId) {
      showFloat('请先使用服务端存档同步身份。', 'danger')
      return
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(saveId))
      }
      showFloat('已复制存档 ID', 'success')
    } catch {
      showFloat(`存档 ID：${saveId}`, 'accent')
    }
  }

  const sendFriendRequest = async (saveId: number) => {
    await socialStore.submitFriendRequestBySaveId(saveId).then(() => {
      showFloat('好友申请已发送', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '发送好友申请失败'
      showFloat(message, 'danger')
    })
  }

  const acceptRequest = async (requestId: string) => {
    await socialStore.acceptRequest(requestId).then(() => {
      showFloat('已接受好友申请', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '接受好友申请失败'
      showFloat(message, 'danger')
    })
  }

  const rejectRequest = async (requestId: string) => {
    await socialStore.rejectRequest(requestId).then(() => {
      showFloat('已拒绝好友申请', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '拒绝好友申请失败'
      showFloat(message, 'danger')
    })
  }

  const removeFriend = async (entry: OnlineRelationCard) => {
    if (!entry.friendship_id) return
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`确认删除好友「${entry.profile.display_name}」吗？`)
    if (!confirmed) return
    await socialStore.removeFriendship(entry.friendship_id).then(() => {
      showFloat('好友已删除', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '删除好友失败'
      showFloat(message, 'danger')
    })
  }

  const blockSaveId = async (saveId: number) => {
    await socialStore.blockTargetBySaveId(saveId).then(() => {
      showFloat('已拉黑该存档', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '拉黑玩家失败'
      showFloat(message, 'danger')
    })
  }

  const blockRelation = async (entry: OnlineRelationCard) => {
    const saveId = Number(entry.friend_save_id || 0)
    if (!saveId) return
    await blockSaveId(saveId)
  }

  const unblockRelation = async (entry: OnlineRelationCard) => {
    const saveId = Number(entry.blocked_save_id || 0)
    const action = saveId
      ? socialStore.unblockTargetBySaveId(saveId)
      : socialStore.unblockTarget(entry.profile.username)
    await action.then(() => {
      showFloat('已解除拉黑', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '解除拉黑失败'
      showFloat(message, 'danger')
    })
  }

  onMounted(() => {
    void refreshFriendStation()
  })
</script>
