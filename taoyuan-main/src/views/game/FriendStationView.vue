<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/70" data-testid="region-social-friend-panel">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-accent">
            <Users :size="14" />
            <p class="text-xs">好友驿站</p>
          </div>
          <p class="text-[0.625rem] text-muted mt-1 leading-4">
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

      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[0.625rem] text-muted">好友</p>
          <p class="text-accent mt-1">{{ socialStore.friends.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[0.625rem] text-muted">收到申请</p>
          <p class="text-accent mt-1">{{ socialStore.incomingRequests.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[0.625rem] text-muted">发出申请</p>
          <p class="text-accent mt-1">{{ socialStore.outgoingRequests.length }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0" data-testid="region-social-chat-unread-summary">
          <p class="text-[0.625rem] text-muted">私聊未读</p>
          <p :class="friendChatStore.totalUnreadCount > 0 ? 'text-danger' : 'text-accent'" class="mt-1">{{ friendChatUnreadLabel }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
          <p class="text-[0.625rem] text-muted">已拉黑</p>
          <p class="text-accent mt-1">{{ socialStore.blockedUsers.length }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] gap-3 mt-3">
        <div class="space-y-2 min-w-0">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[0.625rem] text-muted mb-2">存档 ID 搜索</p>
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
                  <p class="text-[0.625rem] text-muted mt-1 break-all">ID {{ searchedPlayer.identity.save_id }} · {{ searchedPlayer.identity.account_username }}</p>
                </div>
                <span class="text-[0.625rem] text-muted shrink-0">槽位 {{ Number(searchedPlayer.identity.save_slot ?? 0) + 1 }}</span>
              </div>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ searchedPlayer.profile.recent_activity || '暂无近期动态' }}</p>
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
            <p v-else-if="socialStore.errorMessage" class="text-[0.625rem] text-danger mt-2 leading-4">{{ socialStore.errorMessage }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted mb-1">收到的申请</p>
              <p v-if="socialStore.incomingRequests.length === 0" class="text-[0.625rem] text-muted leading-4">当前没有新的好友申请。</p>
              <div
                v-for="entry in socialStore.incomingRequests.slice(0, 3)"
                :key="entry.request_id"
                class="border border-accent/10 rounded-xs p-2 mb-1.5"
                :data-testid="`region-social-incoming-${entry.request_id || 'missing'}`"
              >
                <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                <p class="text-[0.625rem] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'incoming') }}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button class="online-action-btn online-action-btn--compact" :disabled="socialStore.relationshipActionRunning || !entry.request_id" :data-testid="`region-social-incoming-accept-${entry.request_id || 'missing'}`" @click="acceptRequest(entry.request_id!)">接受</button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="socialStore.relationshipActionRunning || !entry.request_id" :data-testid="`region-social-incoming-reject-${entry.request_id || 'missing'}`" @click="rejectRequest(entry.request_id!)">拒绝</button>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted mb-1">发出的申请</p>
              <p v-if="socialStore.outgoingRequests.length === 0" class="text-[0.625rem] text-muted leading-4">当前没有待处理的外发申请。</p>
              <div v-for="entry in socialStore.outgoingRequests.slice(0, 3)" :key="entry.request_id" class="border border-accent/10 rounded-xs p-2 mb-1.5" :data-testid="`region-social-outgoing-${entry.request_id || 'missing'}`">
                <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                <p class="text-[0.625rem] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'outgoing') }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ formatSocialTime(entry.created_at, '待处理') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2 min-w-0">
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.625rem] text-muted">好友列表</p>
              <span class="text-[0.625rem] text-accent">{{ socialStore.friends.length }} 人</span>
            </div>
            <p v-if="socialStore.friends.length === 0" class="text-[0.625rem] text-muted mt-2 leading-4">当前还没有好友。</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div v-for="entry in socialStore.friends.slice(0, 4)" :key="entry.friendship_id" class="border border-accent/10 rounded-xs p-2 min-w-0 bg-bg/60" :data-testid="`region-social-friend-${entry.friendship_id || 'missing'}`">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                    <p class="text-[0.625rem] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'friend') }}</p>
                  </div>
                  <span class="text-[0.625rem] text-muted shrink-0">{{ formatSocialTime(entry.last_interaction_at ?? entry.friends_since, '未互动') }}</span>
                </div>
                <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ entry.profile.recent_activity || entry.profile.primary_route_label }}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-manor-${entry.friendship_id || 'missing'}`" @click="openFriendManor(entry)">
                    <Map :size="11" />
                    进入庄园
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-care-${entry.friendship_id || 'missing'}`" @click="openFriendManorCare(entry)">
                    <HeartHandshake :size="11" />
                    照料
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact"
                    :class="{ 'online-action-btn--primary': getFriendChatUnreadCount(entry) > 0 }"
                    :disabled="!getFriendTargetUsername(entry)"
                    :data-testid="`region-social-friend-mail-${entry.friendship_id || 'missing'}`"
                    @click="openFriendChat(entry)"
                  >
                    <MessageCircle :size="11" />
                    {{ getFriendChatUnreadCount(entry) > 0 ? `${formatFriendChatUnreadCount(entry)} 未读` : '私聊' }}
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-gift-${entry.friendship_id || 'missing'}`" @click="openFriendChat(entry, 'gift')">
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
                  <button class="online-action-btn online-action-btn--compact" :disabled="!getFriendTargetUsername(entry)" :data-testid="`region-social-friend-cohabitation-${entry.friendship_id || 'missing'}`" @click="openFriendCohabitationInvite(entry)">
                    <HeartHandshake :size="11" />
                    共同庄园
                  </button>
                  <button class="online-action-btn online-action-btn--compact online-action-btn--danger" :disabled="socialStore.relationshipActionRunning || !entry.friendship_id" :data-testid="`region-social-friend-remove-${entry.friendship_id || 'missing'}`" @click="removeFriend(entry)">删除</button>
                  <button class="online-action-btn online-action-btn--compact online-action-btn--danger" :disabled="socialStore.relationshipActionRunning || !entry.friend_save_id" :data-testid="`region-social-friend-block-${entry.friendship_id || 'missing'}`" @click="blockRelation(entry)">拉黑</button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted mb-1">最近互动</p>
              <p v-if="recentFriendInteractions.length === 0" class="text-[0.625rem] text-muted leading-4">暂无好友互动记录。</p>
              <div v-for="entry in recentFriendInteractions" :key="`recent-${entry.friendship_id}`" class="flex items-center justify-between gap-2 border border-accent/10 rounded-xs px-2 py-1.5 mb-1">
                <span class="text-[0.625rem] text-accent truncate">{{ entry.profile.display_name }}</span>
                <span class="text-[0.625rem] text-muted shrink-0">{{ formatSocialTime(entry.last_interaction_at ?? entry.friends_since, '未互动') }}</span>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <p class="text-[0.625rem] text-muted mb-1">已拉黑</p>
              <p v-if="socialStore.blockedUsers.length === 0" class="text-[0.625rem] text-muted leading-4">当前没有拉黑玩家。</p>
              <div v-for="entry in socialStore.blockedUsers.slice(0, 4)" :key="entry.block_id" class="border border-accent/10 rounded-xs p-2 mb-1.5" :data-testid="`region-social-blocked-${entry.block_id || 'missing'}`">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                    <p class="text-[0.625rem] text-muted mt-1 break-all">{{ getRelationSaveIdLine(entry, 'blocked') }}</p>
                  </div>
                  <button class="online-action-btn online-action-btn--compact shrink-0" :disabled="socialStore.relationshipActionRunning" :data-testid="`region-social-blocked-unblock-${entry.block_id || 'missing'}`" @click="unblockRelation(entry)">解除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 bg-bg/70" data-testid="friend-lobby-panel">
      <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-accent">
            <Users :size="14" />
            <p class="text-xs">好友大厅</p>
          </div>
          <p class="text-[0.625rem] text-muted mt-1 leading-4">
            发现全服公开玩家，优先展示在线、最近活跃和等级接近的存档。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in discoveryModeOptions"
            :key="option.value"
            class="online-action-btn online-action-btn--compact"
            :class="{ 'online-action-btn--primary': socialStore.friendDiscoveryMode === option.value }"
            :disabled="socialStore.friendDiscoveryLoading"
            :title="option.title"
            @click="setFriendDiscoveryMode(option.value)"
          >
            {{ option.label }}
          </button>
          <button
            class="online-action-btn online-action-btn--compact"
            :disabled="socialStore.friendDiscoveryLoading"
            title="随机刷新推荐"
            @click="refreshFriendLobby(true)"
          >
            <RefreshCw :size="12" />
            {{ socialStore.friendDiscoveryLoading ? '刷新中' : '换一批' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-2 mt-3">
        <div class="flex gap-2 min-w-0">
          <input
            v-model="socialStore.friendDiscoverySearchDraft"
            class="online-input flex-1 min-w-0"
            maxlength="60"
            placeholder="搜索昵称、用户名或 9 位存档 ID"
            data-testid="friend-lobby-search-input"
            @keyup.enter="refreshFriendLobby(false)"
          />
          <button
            class="online-action-btn online-action-btn--primary online-action-btn--icon shrink-0"
            :disabled="socialStore.friendDiscoveryLoading"
            title="搜索好友大厅"
            data-testid="friend-lobby-search-submit"
            @click="refreshFriendLobby(false)"
          >
            <Search :size="15" />
          </button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
            <p class="text-[0.625rem] text-muted">可见</p>
            <p class="text-accent mt-1">{{ socialStore.friendDiscoverySummary.total_visible }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
            <p class="text-[0.625rem] text-muted">在线</p>
            <p class="text-accent mt-1">{{ socialStore.friendDiscoverySummary.online }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2 min-w-0">
            <p class="text-[0.625rem] text-muted">活跃</p>
            <p class="text-accent mt-1">{{ socialStore.friendDiscoverySummary.recent }}</p>
          </div>
        </div>
      </div>

      <p v-if="socialStore.friendDiscoveryLoading" class="text-[0.625rem] text-muted mt-3 leading-4">正在整理好友大厅名单...</p>
      <p v-else-if="socialStore.friendDiscoveryPlayers.length === 0" class="text-[0.625rem] text-muted mt-3 leading-4">
        当前没有符合条件的公开玩家，可切回“全部”或清空搜索后刷新。
      </p>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-3">
        <div
          v-for="entry in socialStore.friendDiscoveryPlayers"
          :key="`friend-lobby-${entry.save_identity.save_id}`"
          class="border border-accent/10 rounded-xs p-2 bg-bg/60 min-w-0"
          :data-testid="`friend-lobby-card-${entry.save_identity.save_id}`"
        >
          <div class="flex items-start gap-2 min-w-0">
            <div class="w-10 h-10 shrink-0 rounded-xs border border-accent/15 bg-bg/80 overflow-hidden flex items-center justify-center text-xs text-accent">
              <img
                v-if="entry.profile.avatar_image_url"
                :src="entry.profile.avatar_image_url"
                :alt="entry.profile.avatar_image_alt || '好友头像'"
                class="w-full h-full object-cover"
              />
              <span v-else>{{ getAvatarInitial(entry) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-accent truncate">{{ entry.profile.display_name }}</p>
                  <p class="text-[0.625rem] text-muted mt-1 break-all">ID {{ entry.save_identity.save_id }} · Lv.{{ entry.level }}</p>
                </div>
                <span class="text-[0.625rem] shrink-0" :class="getDiscoveryStatusClass(entry)">
                  {{ getDiscoveryStatusLabel(entry) }}
                </span>
              </div>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">
                最近登录 {{ formatSocialTime(entry.last_active_at || entry.last_seen_at, '暂无记录') }}
              </p>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">
                共同好友 {{ entry.mutual_friend_count }} · {{ getDiscoveryRelationLabel(entry.relation_status) }}
              </p>
            </div>
          </div>

          <p class="text-[0.625rem] text-muted mt-2 leading-4 line-clamp-2">
            {{ entry.profile.public_intro || entry.profile.recent_activity || entry.profile.primary_route_label }}
          </p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="reason in entry.recommendation_reasons"
              :key="`${entry.save_identity.save_id}-${reason}`"
              class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-[0.625rem] text-muted"
            >
              {{ reason }}
            </span>
            <span v-if="entry.recommendation_reasons.length === 0" class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-[0.625rem] text-muted">
              随机推荐
            </span>
          </div>

          <div class="flex flex-wrap gap-2 mt-2">
            <button class="online-action-btn online-action-btn--compact" title="查看公开资料" @click="openDiscoveryProfile(entry)">
              <Eye :size="11" />
              资料
            </button>
            <button class="online-action-btn online-action-btn--compact" :title="entry.relation_status === 'friend' ? '打开好友私聊' : '先加为好友后再私聊'" @click="openDiscoveryChat(entry)">
              <MessageCircle :size="11" />
              {{ entry.relation_status === 'friend' ? '私聊' : '先加好友' }}
            </button>
            <button
              class="online-action-btn online-action-btn--compact"
              :disabled="!canRequestDiscoveryPlayer(entry)"
              title="发送好友申请"
              @click="sendDiscoveryFriendRequest(entry)"
            >
              <UserPlus :size="11" />
              {{ entry.relation_status === 'pending_outgoing' ? '已申请' : '加好友' }}
            </button>
            <button
              class="online-action-btn online-action-btn--compact online-action-btn--danger"
              :disabled="socialStore.relationshipActionRunning"
              title="屏蔽该玩家"
              @click="blockDiscoveryPlayer(entry)"
            >
              <Ban :size="11" />
              屏蔽
            </button>
            <button
              class="online-action-btn online-action-btn--compact online-action-btn--danger"
              :disabled="socialStore.friendDiscoveryActionRunning"
              title="举报该玩家"
              @click="reportDiscoveryPlayer(entry)"
            >
              <ShieldAlert :size="11" />
              举报
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeDiscoveryPlayer"
      class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      data-testid="friend-lobby-profile-modal"
      @click.self="closeDiscoveryProfile"
    >
      <div class="bg-bg border border-accent/30 rounded-xs p-3 w-full max-w-xl max-h-[86vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2 min-w-0">
            <div class="w-12 h-12 shrink-0 rounded-xs border border-accent/15 bg-bg/80 overflow-hidden flex items-center justify-center text-sm text-accent">
              <img
                v-if="activeDiscoveryPlayer.profile.avatar_image_url"
                :src="activeDiscoveryPlayer.profile.avatar_image_url"
                :alt="activeDiscoveryPlayer.profile.avatar_image_alt || '好友头像'"
                class="w-full h-full object-cover"
              />
              <span v-else>{{ getAvatarInitial(activeDiscoveryPlayer) }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm text-accent truncate">{{ activeDiscoveryPlayer.profile.display_name }}</p>
              <p class="text-[0.625rem] text-muted mt-1 break-all">
                ID {{ activeDiscoveryPlayer.save_identity.save_id }} · {{ activeDiscoveryPlayer.save_identity.account_username }}
              </p>
              <p class="text-[0.625rem] mt-1" :class="getDiscoveryStatusClass(activeDiscoveryPlayer)">
                {{ getDiscoveryStatusLabel(activeDiscoveryPlayer) }} · 最近登录 {{ formatSocialTime(activeDiscoveryPlayer.last_active_at || activeDiscoveryPlayer.last_seen_at, '暂无记录') }}
              </p>
            </div>
          </div>
          <button class="online-action-btn online-action-btn--compact online-action-btn--icon shrink-0" title="关闭资料" @click="closeDiscoveryProfile">
            <X :size="13" />
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs">
          <div class="border border-accent/10 rounded-xs px-2 py-2">
            <p class="text-[0.625rem] text-muted">庄园</p>
            <p class="text-accent mt-1 leading-4">{{ activeDiscoveryPlayer.profile.manor_name || '未命名庄园' }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2">
            <p class="text-[0.625rem] text-muted">称号</p>
            <p class="text-accent mt-1 leading-4">{{ activeDiscoveryPlayer.profile.public_title || '桃源新居民' }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2">
            <p class="text-[0.625rem] text-muted">路线</p>
            <p class="text-accent mt-1 leading-4">{{ activeDiscoveryPlayer.profile.primary_route_label }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2">
            <p class="text-[0.625rem] text-muted">共同好友</p>
            <p class="text-accent mt-1 leading-4">{{ activeDiscoveryPlayer.mutual_friend_count }} 人</p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 mt-2">
          <p class="text-[0.625rem] text-muted">公开介绍</p>
          <p class="text-xs text-accent mt-1 leading-5">{{ activeDiscoveryPlayer.profile.public_intro || '这个人还没写公开介绍。' }}</p>
        </div>

        <div class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="tag in activeDiscoveryPlayer.profile.public_tags"
            :key="`modal-tag-${tag.id}`"
            class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-[0.625rem] text-muted"
          >
            {{ tag.label }}
          </span>
          <span v-if="activeDiscoveryPlayer.profile.public_tags.length === 0" class="text-[0.625rem] text-muted">当前没有公开标签。</span>
        </div>

        <div class="flex flex-wrap gap-2 mt-3">
          <button class="online-action-btn online-action-btn--compact" @click="openDiscoveryChat(activeDiscoveryPlayer)">
            <MessageCircle :size="11" />
            {{ activeDiscoveryPlayer.relation_status === 'friend' ? '私聊' : '先加好友' }}
          </button>
          <button
            class="online-action-btn online-action-btn--compact"
            :disabled="!canRequestDiscoveryPlayer(activeDiscoveryPlayer)"
            @click="sendDiscoveryFriendRequest(activeDiscoveryPlayer)"
          >
            <UserPlus :size="11" />
            加好友
          </button>
          <button class="online-action-btn online-action-btn--compact online-action-btn--danger" @click="blockDiscoveryPlayer(activeDiscoveryPlayer)">
            <Ban :size="11" />
            屏蔽
          </button>
          <button class="online-action-btn online-action-btn--compact online-action-btn--danger" @click="reportDiscoveryPlayer(activeDiscoveryPlayer)">
            <ShieldAlert :size="11" />
            举报
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Ban, Copy, Eye, Gift, HeartHandshake, Map, MessageCircle, RefreshCw, Search, ShieldAlert, UserPlus, Users, X } from 'lucide-vue-next'
  import { showFloat } from '@/composables/useGameLog'
  import { useFriendChatStore } from '@/stores/useFriendChatStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import type { OnlineFriendDiscoveryCard, OnlineFriendDiscoveryMode, OnlineFriendDiscoveryRelationStatus, OnlineRelationCard } from '@/utils/onlineProfileApi'

  const router = useRouter()
  const friendChatStore = useFriendChatStore()
  const saveStore = useSaveStore()
  const socialStore = useSocialStore()
  const activeDiscoveryPlayer = ref<OnlineFriendDiscoveryCard | null>(null)
  const discoveryModeOptions: Array<{ value: OnlineFriendDiscoveryMode; label: string; title: string }> = [
    { value: 'all', label: '全部', title: '展示全服公开玩家' },
    { value: 'online', label: '在线', title: '只看当前在线玩家' },
    { value: 'recent', label: '最近活跃', title: '只看最近活跃玩家' }
  ]

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
  const friendChatUnreadLabel = computed(() =>
    friendChatStore.totalUnreadCount > 99 ? '99+' : String(friendChatStore.totalUnreadCount)
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

  const getAvatarInitial = (entry: OnlineFriendDiscoveryCard) =>
    (entry.profile.display_name || entry.profile.player_name || entry.profile.username || '?').slice(0, 1)

  const getDiscoveryStatusLabel = (entry: OnlineFriendDiscoveryCard) => {
    if (entry.is_online) return '在线'
    if (entry.is_recently_active) return '最近活跃'
    return '离线'
  }

  const getDiscoveryStatusClass = (entry: OnlineFriendDiscoveryCard) => {
    if (entry.is_online) return 'text-success'
    if (entry.is_recently_active) return 'text-accent'
    return 'text-muted'
  }

  const getDiscoveryRelationLabel = (status: OnlineFriendDiscoveryRelationStatus) => {
    if (status === 'friend') return '已是好友'
    if (status === 'pending_incoming') return '待你处理'
    if (status === 'pending_outgoing') return '已申请'
    if (status === 'blocked') return '已屏蔽'
    return '可申请'
  }

  const canRequestDiscoveryPlayer = (entry: OnlineFriendDiscoveryCard) => {
    const saveId = Number(entry.save_identity.save_id || 0)
    return (
      saveId > 0 &&
      saveId !== ownActiveSaveId.value &&
      entry.relation_status === 'none' &&
      !socialStore.relationshipActionRunning
    )
  }

  const buildDiscoveryTargetQuery = (entry: OnlineFriendDiscoveryCard) => ({
    target_username: entry.profile.username,
    target_save_id: String(entry.save_identity.save_id),
    display_name: entry.profile.display_name,
    source: 'friend_lobby'
  })

  const openDiscoveryProfile = (entry: OnlineFriendDiscoveryCard) => {
    activeDiscoveryPlayer.value = entry
  }

  const closeDiscoveryProfile = () => {
    activeDiscoveryPlayer.value = null
  }

  const openDiscoveryChat = (entry: OnlineFriendDiscoveryCard) => {
    if (entry.relation_status !== 'friend') {
      showFloat('先加为好友后再私聊', 'accent')
      return
    }
    void router.push({ name: 'friend-chat', query: buildDiscoveryTargetQuery(entry) })
  }

  const refreshFriendLobby = async (randomize = false) => {
    await socialStore.refreshFriendDiscovery({ seed: randomize ? String(Date.now()) : undefined }).catch(error => {
      const message = error instanceof Error ? error.message : '刷新好友大厅失败'
      showFloat(message, 'danger')
    })
  }

  const setFriendDiscoveryMode = async (mode: OnlineFriendDiscoveryMode) => {
    await socialStore.setFriendDiscoveryMode(mode).catch(error => {
      const message = error instanceof Error ? error.message : '切换好友大厅筛选失败'
      showFloat(message, 'danger')
    })
  }

  const sendDiscoveryFriendRequest = async (entry: OnlineFriendDiscoveryCard) => {
    await sendFriendRequest(Number(entry.save_identity.save_id || 0))
  }

  const blockDiscoveryPlayer = async (entry: OnlineFriendDiscoveryCard) => {
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`确认屏蔽「${entry.profile.display_name}」吗？`)
    if (!confirmed) return
    await blockSaveId(Number(entry.save_identity.save_id || 0))
    if (activeDiscoveryPlayer.value?.save_identity.save_id === entry.save_identity.save_id) closeDiscoveryProfile()
  }

  const reportDiscoveryPlayer = async (entry: OnlineFriendDiscoveryCard) => {
    const reason = typeof window === 'undefined'
      ? '好友大厅举报'
      : window.prompt(`举报「${entry.profile.display_name}」的原因`, '骚扰或不当资料')
    if (reason === null) return
    await socialStore.reportTargetBySaveId(
      Number(entry.save_identity.save_id || 0),
      reason || '好友大厅举报',
      `来自好友大厅：${entry.profile.display_name} / ID ${entry.save_identity.save_id}`
    ).then(() => {
      showFloat('举报已提交', 'success')
    }).catch(error => {
      const message = error instanceof Error ? error.message : '举报玩家失败'
      showFloat(message, 'danger')
    })
  }

  const getFriendTargetUsername = (entry: OnlineRelationCard) => entry.profile.username?.trim() || ''
  const getFriendChatUnreadCount = (entry: OnlineRelationCard) => {
    const targetUsername = getFriendTargetUsername(entry)
    if (!targetUsername) return 0
    return Math.max(0, Number(friendChatStore.conversations.find(item => item.peer_username === targetUsername)?.unread_count) || 0)
  }
  const formatFriendChatUnreadCount = (entry: OnlineRelationCard) => {
    const count = getFriendChatUnreadCount(entry)
    return count > 99 ? '99+' : String(count)
  }
  const buildFriendTargetQuery = (entry: OnlineRelationCard) => {
    const targetUsername = getFriendTargetUsername(entry)
    if (!targetUsername) return null
    return {
      target_username: targetUsername,
      target_save_id: entry.friend_save_id ? String(entry.friend_save_id) : undefined,
      display_name: entry.profile.display_name,
      source: 'friend_station'
    }
  }

  const openFriendManor = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-manor', query: { ...query, tab: 'overview' } })
  }

  const openFriendManorCare = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-manor', query: { ...query, tab: 'care' } })
  }

  const openFriendChat = (entry: OnlineRelationCard, compose: 'message' | 'gift' = 'message') => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'friend-chat', query: { ...query, compose } })
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

  const openFriendCohabitationInvite = (entry: OnlineRelationCard) => {
    const query = buildFriendTargetQuery(entry)
    if (!query) return
    void router.push({ name: 'online-cohabitation', query: { ...query, invite: '1', tab: 'overview' } })
  }

  const refreshFriendStation = async () => {
    await Promise.all([
      friendChatStore.refreshConversations({ silent: true }),
      socialStore.refreshRelationships(),
      socialStore.refreshFriendDiscovery({ silent: true })
    ]).catch(error => {
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
