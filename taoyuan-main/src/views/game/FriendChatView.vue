<template>
  <div class="friend-chat" data-testid="friend-chat-page">
    <div class="friend-chat-layout">
      <section class="panel-box friend-chat-list">
        <div class="friend-chat-list-header">
          <Divider label="好友私聊" />
          <button class="friend-chat-icon-btn" type="button" title="刷新" :disabled="chatStore.loading" @click="refresh">
            <RefreshCw :size="14" />
          </button>
        </div>

        <div v-if="chatStore.loading && chatStore.conversations.length === 0" class="friend-chat-empty">
          正在整理会话...
        </div>
        <div v-else-if="chatStore.conversations.length === 0" class="friend-chat-empty">
          暂无私聊会话。
        </div>
        <div v-else class="friend-chat-conversations">
          <button
            v-for="conversation in chatStore.conversations"
            :key="conversation.id"
            type="button"
            class="friend-chat-conversation"
            :class="{ 'friend-chat-conversation--active': conversation.id === chatStore.activeConversationId }"
            :data-testid="`friend-chat-conversation-${conversation.id}`"
            @click="openConversation(conversation.id)"
          >
            <span class="friend-chat-avatar">{{ getAvatarInitial(conversation.peer_profile?.display_name || conversation.peer_username) }}</span>
            <span class="friend-chat-conversation-main">
              <span class="friend-chat-conversation-title">{{ conversation.peer_profile?.display_name || conversation.peer_username }}</span>
              <span class="friend-chat-conversation-preview">{{ conversation.last_message_preview || '还没有消息' }}</span>
            </span>
            <span class="friend-chat-conversation-side">
              <span>{{ formatTime(conversation.updated_at) }}</span>
              <span v-if="conversation.unread_count > 0" class="friend-chat-unread">{{ conversation.unread_count > 99 ? '99+' : conversation.unread_count }}</span>
            </span>
          </button>
        </div>
      </section>

      <section class="panel-box friend-chat-thread">
        <div class="friend-chat-thread-header">
          <button class="friend-chat-icon-btn" type="button" title="返回好友驿站" @click="router.push({ name: 'friend-station' })">
            <ArrowLeft :size="14" />
          </button>
          <div class="friend-chat-thread-title">
            <p>{{ chatStore.activePeerDisplayName || '选择好友' }}</p>
            <span>{{ chatStore.activeConversation ? '好友私聊' : '新会话' }}</span>
          </div>
          <button class="friend-chat-icon-btn" type="button" title="刷新消息" :disabled="chatStore.messagesLoading" @click="reloadMessages">
            <RefreshCw :size="14" />
          </button>
        </div>

        <div ref="messagePaneRef" class="friend-chat-messages">
          <div v-if="!chatStore.activePeerDisplayName && chatStore.conversations.length === 0" class="friend-chat-empty">
            从好友驿站选择好友后开始聊天。
          </div>
          <div v-else-if="chatStore.messagesLoading && chatStore.activeMessages.length === 0" class="friend-chat-empty">
            正在读取消息...
          </div>
          <template v-else>
            <template v-for="(message, index) in chatStore.activeMessages" :key="message.id">
              <div v-if="shouldShowDivider(index)" class="friend-chat-date-divider">
                {{ formatDateDivider(message.created_at) }}
              </div>
              <div class="friend-chat-message-row" :class="{ 'friend-chat-message-row--own': message.is_own }">
                <div class="friend-chat-bubble" :class="`friend-chat-bubble--${message.type}`">
                  <p v-if="message.content" class="friend-chat-message-text">{{ message.content }}</p>
                  <img v-if="message.photo_url" class="friend-chat-photo" :src="message.photo_url" :alt="message.photo_alt || '聊天图片'" />
                  <div v-if="message.gift" class="friend-chat-gift-card">
                    <div>
                      <p class="friend-chat-gift-title">礼物包裹</p>
                      <p class="friend-chat-gift-meta">{{ message.gift.reward_count }} 项 · {{ formatGiftStatus(message) }}</p>
                      <div v-if="getGiftDisplayRewards(message).length > 0" class="friend-chat-gift-rewards">
                        <span class="friend-chat-gift-rewards-prefix">{{ message.gift.is_claimed ? '已领取：' : '包含：' }}</span>
                        <span
                          v-for="(reward, rewardIndex) in getGiftDisplayRewards(message)"
                          :key="`${message.id}-gift-reward-${reward.type}-${reward.id || rewardIndex}`"
                          class="friend-chat-gift-reward-item"
                        >
                          <ItemIcon
                            v-if="getGiftRewardItem(reward)"
                            :item="getGiftRewardItem(reward)"
                            size="xs"
                            :quality="giftRewardQuality(reward)"
                            :show-badge="false"
                          />
                          <span>{{ formatGiftReward(reward) }}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      v-if="message.gift.can_claim"
                      class="friend-chat-claim-btn"
                      type="button"
                      :disabled="chatStore.claimingGift"
                      :data-testid="`friend-chat-gift-claim-${message.id}`"
                      @click="claimGift(message.id)"
                    >
                      领取
                    </button>
                  </div>
                  <span class="friend-chat-message-time">{{ formatTime(message.created_at) }}</span>
                </div>
              </div>
            </template>
            <div v-if="chatStore.activeMessages.length === 0" class="friend-chat-empty">
              还没有消息。
            </div>
          </template>
        </div>

        <div class="friend-chat-composer">
          <div class="friend-chat-compose-tabs">
            <button type="button" :class="{ active: composeMode === 'message' }" @click="composeMode = 'message'">
              <MessageCircle :size="13" />
              消息
            </button>
            <button type="button" :class="{ active: composeMode === 'gift' }" @click="composeMode = 'gift'">
              <Gift :size="13" />
              礼物
            </button>
          </div>

          <div v-if="composeMode === 'message'" class="friend-chat-message-compose">
            <div class="friend-chat-message-input-row">
              <textarea
                v-model="chatStore.messageDraft"
                maxlength="1200"
                rows="2"
                class="friend-chat-textarea"
                placeholder="输入私聊内容"
                data-testid="friend-chat-message-input"
                @keydown.enter.exact.prevent="sendMessage"
                @keydown.ctrl.enter.prevent="sendMessage"
              />
              <Button class="friend-chat-send-btn justify-center" :icon="Send" :icon-size="13" :disabled="chatStore.sending || !canSendMessage" @click="sendMessage">
                {{ chatStore.sending ? '发送中' : '发送' }}
              </Button>
            </div>
            <div class="friend-chat-photo-row">
              <input v-model="chatStore.photoUrlDraft" class="friend-chat-input" maxlength="300" placeholder="图片链接（可选）" />
              <input v-model="chatStore.photoAltDraft" class="friend-chat-input" maxlength="80" placeholder="图片说明" />
            </div>
          </div>

          <div v-else class="friend-chat-gift-compose">
            <input v-model="chatStore.giftContentDraft" class="friend-chat-input" maxlength="240" placeholder="礼物留言（可选）" />
            <div v-if="availableGiftOptions.length === 0" class="friend-chat-empty" data-testid="friend-chat-owned-gift-empty">
              背包里暂时没有可寄送的物品
            </div>
            <div class="friend-chat-gift-rows">
              <div v-for="(reward, index) in chatStore.giftRewardsDraft" :key="`chat-gift-${index}`" class="friend-chat-gift-row">
                <button
                  type="button"
                  class="friend-chat-owned-gift-picker"
                  :class="{ 'friend-chat-owned-gift-picker--selected': !!reward.id }"
                  :data-testid="`friend-chat-owned-gift-picker-${index}`"
                  :disabled="availableGiftOptions.length === 0"
                  @click="openGiftPicker(index)"
                >
                  <ItemIcon
                    v-if="getGiftRewardButtonItem(reward)"
                    :item="getGiftRewardButtonItem(reward)"
                    size="xs"
                    :quality="giftDraftQuality(reward)"
                    :show-badge="false"
                  />
                  <span v-else-if="reward.id" class="friend-chat-owned-gift-picker-icon" aria-hidden="true">
                    <Gift :size="13" />
                  </span>
                  <span class="friend-chat-owned-gift-picker-copy">
                    <span class="friend-chat-owned-gift-picker-title">{{ getGiftRewardButtonTitle(reward) }}</span>
                    <span class="friend-chat-owned-gift-picker-meta">{{ getGiftRewardButtonMeta(reward, index) }}</span>
                  </span>
                  <ChevronDown :size="13" />
                </button>
                <input
                  v-model.number="reward.quantity"
                  class="friend-chat-number"
                  type="number"
                  min="1"
                  :max="getGiftRewardMax(index)"
                  :disabled="!reward.id"
                  :data-testid="`friend-chat-owned-gift-quantity-${index}`"
                  @change="clampGiftRewardQuantity(index)"
                  @blur="clampGiftRewardQuantity(index)"
                />
                <button class="friend-chat-icon-btn" type="button" title="移除" :disabled="chatStore.giftRewardsDraft.length <= 1" @click="chatStore.removeGiftReward(index)">
                  <X :size="13" />
                </button>
                <span v-if="getGiftRewardHint(reward, index)" class="friend-chat-gift-row-hint">
                  {{ getGiftRewardHint(reward, index) }}
                </span>
              </div>
            </div>
            <div class="friend-chat-gift-actions">
              <Button class="justify-center" :icon="Plus" :icon-size="13" :disabled="chatStore.sending || availableGiftOptions.length === 0" @click="chatStore.addGiftReward">
                添加
              </Button>
              <Button class="justify-center" :icon="Gift" :icon-size="13" :disabled="chatStore.sending || !canSendGift" @click="sendGift">
                {{ chatStore.sending ? '发送中...' : '送礼' }}
              </Button>
            </div>
          </div>

          <p v-if="chatStore.errorMessage" class="friend-chat-error">{{ chatStore.errorMessage }}</p>
        </div>
      </section>
    </div>

    <OnlineActionDialog
      :open="activeGiftPickerIndex !== null"
      :title="activeGiftPickerTitle"
      :description="giftPickerDescription"
      confirm-label="完成"
      cancel-label="关闭"
      @confirm="closeGiftPicker"
      @cancel="closeGiftPicker"
      @close="closeGiftPicker"
    >
      <div class="friend-chat-gift-picker-dialog" data-testid="friend-chat-owned-gift-dialog">
        <div v-if="availableGiftOptions.length === 0" class="friend-chat-empty">
          背包里暂时没有可寄送的物品
        </div>
        <div v-else class="friend-chat-gift-picker-grid">
          <button
            v-for="option in availableGiftOptions"
            :key="option.value"
            type="button"
            class="friend-chat-gift-picker-option"
            :class="{ 'friend-chat-gift-picker-option--active': activeGiftPickerCurrentValue === option.value }"
            :disabled="isGiftPickerOptionDisabled(option)"
            :aria-pressed="activeGiftPickerCurrentValue === option.value"
            :aria-label="`选择 ${formatGiftOptionLabel(option, activeGiftPickerIndex ?? -1)}`"
            :data-testid="`friend-chat-owned-gift-option-${option.value}`"
            @click="selectGiftPickerOption(option.value)"
          >
            <ItemIcon
              v-if="option.item"
              :item="option.item"
              size="sm"
              :quality="option.quality || 'normal'"
            />
            <span v-else class="friend-chat-gift-picker-decoration-icon" aria-hidden="true">
              <Gift :size="16" />
            </span>
            <span class="friend-chat-gift-picker-option-copy">
              <span class="friend-chat-gift-picker-option-name">{{ option.name }}</span>
              <span class="friend-chat-gift-picker-option-meta">{{ getGiftOptionMeta(option, activeGiftPickerIndex ?? -1) }}</span>
            </span>
            <Check v-if="activeGiftPickerCurrentValue === option.value" class="friend-chat-gift-picker-check" :size="13" />
          </button>
        </div>
      </div>
    </OnlineActionDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ArrowLeft, Check, ChevronDown, Gift, MessageCircle, Plus, RefreshCw, Send, X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import OnlineActionDialog from '@/components/game/online/OnlineActionDialog.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { DECORATIONS } from '@/data/decorations'
  import { getHatById } from '@/data/hats'
  import { getItemById } from '@/data/items'
  import { getRingById } from '@/data/rings'
  import { getShoeById } from '@/data/shoes'
  import { getWeaponById } from '@/data/weapons'
  import { useDecorationStore } from '@/stores/useDecorationStore'
  import { useFriendChatStore } from '@/stores/useFriendChatStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import type { ItemDef, Quality } from '@/types/item'
  import type { PrivateChatGiftReward, PrivateChatMessage, PrivateChatRewardDraft } from '@/utils/friendChatApi'

  const route = useRoute()
  const router = useRouter()
  const chatStore = useFriendChatStore()
  const inventoryStore = useInventoryStore()
  const decorationStore = useDecorationStore()
  const messagePaneRef = ref<HTMLElement | null>(null)
  const composeMode = ref<'message' | 'gift'>('message')
  const activeGiftPickerIndex = ref<number | null>(null)

  type GiftPickerOption = {
    value: string
    type: PrivateChatRewardDraft['type']
    id: string
    quantity: number
    quality?: Quality
    label: string
    name: string
    sourceLabel: string
    item?: ItemDef | null
  }

  const QUALITY_SHORT_LABELS: Record<Quality, string> = {
    normal: '普',
    fine: '良',
    excellent: '优',
    supreme: '绝'
  }
  const decorationNameMap = new Map(DECORATIONS.map(def => [def.id, def.name]))

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const canSendMessage = computed(() =>
    !!chatStore.activePeerDisplayName && (!!chatStore.messageDraft.trim() || !!chatStore.photoUrlDraft.trim())
  )
  const availableGiftOptions = computed<GiftPickerOption[]>(() => {
    const options = new Map<string, GiftPickerOption>()
    const addStackableOption = (slot: { itemId: string; quality: Quality; quantity: number; locked?: boolean }) => {
      if (slot.locked) return
      const slotQuantity = Math.max(0, Number(slot.quantity) || 0)
      if (slotQuantity <= 0) return
      const itemDef = getItemById(slot.itemId)
      if (!itemDef) return
      const type: PrivateChatRewardDraft['type'] = itemDef.category === 'seed' ? 'seed' : 'item'
      const qualityLabel = QUALITY_SHORT_LABELS[slot.quality] || slot.quality
      const value = `${type}::${slot.itemId}::${slot.quality}`
      const current = options.get(value)
      const quantity = (current?.quantity || 0) + slotQuantity
      options.set(value, {
        value,
        type,
        id: slot.itemId,
        quality: slot.quality,
        quantity,
        label: `${itemDef.name}（${qualityLabel}）×${quantity}`,
        name: itemDef.name,
        sourceLabel: type === 'seed' ? '种子' : '物品',
        item: itemDef
      })
    }

    inventoryStore.items.forEach(addStackableOption)
    inventoryStore.tempItems.forEach(addStackableOption)

    for (const [id, count] of Object.entries(decorationStore.owned)) {
      const quantity = Math.max(0, Math.floor(Number(count) || 0) - decorationStore.getPlacedCount(id))
      if (quantity <= 0) continue
      const value = `decoration::${id}`
      const name = decorationNameMap.get(id) || id
      options.set(value, {
        value,
        type: 'decoration',
        id,
        quantity,
        label: `${name}×${quantity}`,
        name,
        sourceLabel: '装饰',
        item: null
      })
    }

    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
  })

  const rewardSelectionValue = (reward: Pick<PrivateChatRewardDraft, 'type' | 'id' | 'quality'>) => {
    if (!reward.id) return ''
    if (reward.type === 'decoration') return `decoration::${reward.id}`
    return `${reward.type}::${reward.id}::${reward.quality || 'normal'}`
  }

  const getGiftOptionRemaining = (value: string, currentIndex: number) => {
    const option = availableGiftOptions.value.find(entry => entry.value === value)
    if (!option) return 0
    const usedByOtherRows = chatStore.giftRewardsDraft.reduce((sum, reward, index) => {
      if (index === currentIndex || rewardSelectionValue(reward) !== value) return sum
      return sum + Math.max(1, Math.floor(Number(reward.quantity) || 1))
    }, 0)
    return Math.max(0, option.quantity - usedByOtherRows)
  }

  const getGiftRewardMax = (index: number) => {
    const reward = chatStore.giftRewardsDraft[index]
    if (!reward?.id) return 1
    return Math.max(1, getGiftOptionRemaining(rewardSelectionValue(reward), index))
  }

  const isGiftRewardAvailable = (reward: PrivateChatRewardDraft, index: number) => {
    if (!reward.id.trim()) return false
    const maxQuantity = getGiftOptionRemaining(rewardSelectionValue(reward), index)
    const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1))
    return maxQuantity > 0 && quantity <= maxQuantity
  }

  const canSendGift = computed(() => {
    if (!chatStore.activePeerDisplayName) return false
    const selectedRewards = chatStore.giftRewardsDraft
      .map((reward, index) => ({ reward, index }))
      .filter(({ reward }) => reward.id.trim())
    return selectedRewards.length > 0 && selectedRewards.every(({ reward, index }) => isGiftRewardAvailable(reward, index))
  })

  const updateGiftRewardSelection = (index: number, value: string) => {
    const reward = chatStore.giftRewardsDraft[index]
    if (!reward) return
    if (!value) {
      reward.type = 'item'
      reward.id = ''
      reward.quality = 'normal'
      reward.quantity = 1
      return
    }

    const option = availableGiftOptions.value.find(entry => entry.value === value)
    if (!option) return
    reward.type = option.type
    reward.id = option.id
    reward.quality = option.type === 'decoration' ? undefined : option.quality || 'normal'
    reward.quantity = Math.min(
      Math.max(1, Math.floor(Number(reward.quantity) || 1)),
      getGiftRewardMax(index)
    )
  }

  const clampGiftRewardQuantity = (index: number) => {
    const reward = chatStore.giftRewardsDraft[index]
    if (!reward?.id) return
    reward.quantity = Math.min(
      Math.max(1, Math.floor(Number(reward.quantity) || 1)),
      getGiftRewardMax(index)
    )
  }

  const formatGiftOptionLabel = (option: GiftPickerOption, currentIndex: number) => {
    const remaining = getGiftOptionRemaining(option.value, currentIndex)
    if (remaining <= 0) return `${option.label} · 已选完`
    if (remaining < option.quantity) return `${option.label} · 可选${remaining}`
    return option.label
  }

  const getGiftOptionMeta = (option: GiftPickerOption, currentIndex: number) => {
    const remaining = getGiftOptionRemaining(option.value, currentIndex)
    const meta = [option.sourceLabel]
    if (option.quality) meta.push(QUALITY_SHORT_LABELS[option.quality] || option.quality)
    meta.push(remaining <= 0 ? '已选完' : `可选 ${remaining}`)
    if (remaining < option.quantity) meta.push(`总数 ${option.quantity}`)
    return meta.join(' · ')
  }

  const getGiftRewardOption = (reward: Pick<PrivateChatRewardDraft, 'type' | 'id' | 'quality'>) => {
    const value = rewardSelectionValue(reward)
    if (!value) return null
    return availableGiftOptions.value.find(option => option.value === value) ?? null
  }

  const getGiftRewardButtonTitle = (reward: PrivateChatRewardDraft) => {
    if (!reward.id) return '选择礼物'
    return getGiftRewardOption(reward)?.name || reward.id
  }

  const getGiftRewardButtonItem = (reward: PrivateChatRewardDraft): ItemDef | null => {
    return getGiftRewardOption(reward)?.item ?? null
  }

  const giftDraftQuality = (reward: PrivateChatRewardDraft): Quality => {
    if (reward.type !== 'item' && reward.type !== 'seed') return 'normal'
    const quality = String(reward.quality || 'normal')
    return quality in QUALITY_SHORT_LABELS ? quality as Quality : 'normal'
  }

  const getGiftRewardButtonMeta = (reward: PrivateChatRewardDraft, index: number) => {
    if (!reward.id) return '从背包中挑选，再填写数量'
    const option = getGiftRewardOption(reward)
    if (!option) return '当前礼物已不在可用列表'
    const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1))
    return `${getGiftOptionMeta(option, index)} · 已填 ${quantity}`
  }

  const activeGiftPickerReward = computed(() => {
    if (activeGiftPickerIndex.value === null) return null
    return chatStore.giftRewardsDraft[activeGiftPickerIndex.value] ?? null
  })

  const activeGiftPickerCurrentValue = computed(() =>
    activeGiftPickerReward.value ? rewardSelectionValue(activeGiftPickerReward.value) : ''
  )

  const activeGiftPickerTitle = computed(() => {
    if (activeGiftPickerIndex.value === null) return '选择礼物'
    return `选择第 ${activeGiftPickerIndex.value + 1} 项礼物`
  })

  const giftPickerDescription = computed(() =>
    availableGiftOptions.value.length === 0
      ? '背包里暂时没有可寄送的物品。'
      : '从背包、临时背包或未摆放装饰中选一项，数量回到送礼栏填写。'
  )

  const openGiftPicker = (index: number) => {
    if (availableGiftOptions.value.length === 0) return
    activeGiftPickerIndex.value = index
  }

  const closeGiftPicker = () => {
    activeGiftPickerIndex.value = null
  }

  const isGiftPickerOptionDisabled = (option: GiftPickerOption) => {
    if (activeGiftPickerIndex.value === null) return true
    return getGiftOptionRemaining(option.value, activeGiftPickerIndex.value) <= 0 &&
      activeGiftPickerCurrentValue.value !== option.value
  }

  const selectGiftPickerOption = (value: string) => {
    if (activeGiftPickerIndex.value === null) return
    updateGiftRewardSelection(activeGiftPickerIndex.value, value)
    closeGiftPicker()
  }

  const getGiftRewardHint = (reward: PrivateChatRewardDraft, index: number) => {
    if (!reward.id) return ''
    const remaining = getGiftOptionRemaining(rewardSelectionValue(reward), index)
    if (remaining <= 0) return '这项礼物已没有可用数量'
    if (Math.max(1, Math.floor(Number(reward.quantity) || 1)) > remaining) return `最多可送 ${remaining}`
    return ''
  }

  const scrollToBottom = async () => {
    await nextTick()
    const pane = messagePaneRef.value
    if (!pane) return
    pane.scrollTop = pane.scrollHeight
  }

  const applyRouteTarget = async () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    const displayName = getRouteQueryText(route.query.display_name)
    composeMode.value = getRouteQueryText(route.query.compose) === 'gift' ? 'gift' : 'message'
    if (targetUsername || targetSaveId) {
      await chatStore.openTarget({ target_username: targetUsername, target_save_id: targetSaveId, display_name: displayName })
      await scrollToBottom()
      return
    }
    await chatStore.refreshConversations({ silent: true })
    if (!chatStore.activeConversationId && chatStore.conversations[0]) {
      await chatStore.openConversation(chatStore.conversations[0].id)
      await scrollToBottom()
    }
  }

  const refresh = async () => {
    await chatStore.refreshConversations().catch(error => {
      showFloat(error instanceof Error ? error.message : '刷新私聊失败', 'danger')
    })
  }

  const reloadMessages = async () => {
    if (!chatStore.activeConversationId) {
      await refresh()
      return
    }
    await chatStore.loadMessages().then(scrollToBottom).catch(error => {
      showFloat(error instanceof Error ? error.message : '刷新消息失败', 'danger')
    })
  }

  const openConversation = async (conversationId: string) => {
    await chatStore.openConversation(conversationId).then(scrollToBottom).catch(error => {
      showFloat(error instanceof Error ? error.message : '打开私聊失败', 'danger')
    })
  }

  const sendMessage = async () => {
    await chatStore.sendCurrentMessage().then(() => {
      showFloat('已发送', 'success')
      void scrollToBottom()
    }).catch(error => {
      showFloat(error instanceof Error ? error.message : '发送私聊失败', 'danger')
    })
  }

  const sendGift = async () => {
    await chatStore.sendCurrentGift().then(() => {
      showFloat('礼物已送出', 'success')
      composeMode.value = 'message'
      void scrollToBottom()
    }).catch(error => {
      showFloat(error instanceof Error ? error.message : '发送聊天礼物失败', 'danger')
    })
  }

  const claimGift = async (messageId: string) => {
    await chatStore.claimGift(messageId).then(data => {
      const claimedText = getGiftRewardListText(
        data?.message?.gift?.claimed_rewards?.length
          ? data.message.gift.claimed_rewards
          : data?.message?.gift?.rewards
      )
      showFloat(claimedText ? `已领取 ${claimedText}` : '礼物已领取', 'success')
    }).catch(error => {
      showFloat(error instanceof Error ? error.message : '领取聊天礼物失败', 'danger')
    })
  }

  const getAvatarInitial = (value: string) => (value || '?').trim().slice(0, 1).toUpperCase()

  const formatTime = (seconds?: number | null) => {
    if (!seconds) return ''
    const date = new Date(seconds * 1000)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const formatDateDivider = (seconds: number) => {
    const date = new Date(seconds * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const shouldShowDivider = (index: number) => {
    const message = chatStore.activeMessages[index]
    const prev = chatStore.activeMessages[index - 1]
    if (!message) return false
    if (!prev) return true
    return formatDateDivider(message.created_at) !== formatDateDivider(prev.created_at)
  }

  const formatGiftStatus = (message: PrivateChatMessage) => {
    if (!message.gift) return ''
    if (message.gift.is_claimed) return '已领取'
    if (message.gift.can_claim) return '可领取'
    return message.is_own ? '待对方领取' : '待领取'
  }

  const formatRewardQuality = (quality?: string) => {
    if (!quality) return ''
    return `（${QUALITY_SHORT_LABELS[quality as Quality] || quality}）`
  }

  const formatGiftReward = (reward: PrivateChatGiftReward) => {
    if (reward.type === 'money') return `桃源乡铜钱×${Math.max(0, Number(reward.amount) || 0)}`
    const rewardId = String(reward.id || '')
    const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1))
    if (reward.type === 'item' || reward.type === 'seed') {
      return `${getItemById(rewardId)?.name || rewardId}${formatRewardQuality(reward.quality)}×${quantity}`
    }
    if (reward.type === 'decoration') return `${decorationNameMap.get(rewardId) || rewardId}×${quantity}`
    if (reward.type === 'weapon') return `${getWeaponById(rewardId)?.name || rewardId}×${quantity}`
    if (reward.type === 'ring') return `${getRingById(rewardId)?.name || rewardId}×${quantity}`
    if (reward.type === 'hat') return `${getHatById(rewardId)?.name || rewardId}×${quantity}`
    if (reward.type === 'shoe') return `${getShoeById(rewardId)?.name || rewardId}×${quantity}`
    return `${rewardId || reward.type}×${quantity}`
  }

  const getGiftRewardItem = (reward: PrivateChatGiftReward): ItemDef | null => {
    if (reward.type !== 'item' && reward.type !== 'seed') return null
    return getItemById(String(reward.id || '')) ?? null
  }

  const giftRewardQuality = (reward: PrivateChatGiftReward): Quality => {
    if (reward.type !== 'item' && reward.type !== 'seed') return 'normal'
    const quality = String(reward.quality || 'normal')
    return quality in QUALITY_SHORT_LABELS ? quality as Quality : 'normal'
  }

  const getGiftDisplayRewards = (message: PrivateChatMessage): PrivateChatGiftReward[] => {
    if (!message.gift) return []
    return message.gift.is_claimed && message.gift.claimed_rewards?.length
      ? message.gift.claimed_rewards
      : message.gift.rewards ?? []
  }

  const getGiftRewardListText = (rewards?: PrivateChatGiftReward[] | null) => {
    if (!Array.isArray(rewards) || rewards.length === 0) return ''
    return rewards.map(formatGiftReward).join('、')
  }

  onMounted(() => {
    void applyRouteTarget()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id, route.query.display_name, route.query.compose],
    () => {
      void applyRouteTarget()
    }
  )

  watch(
    () => chatStore.activeMessages.length,
    () => {
      void scrollToBottom()
    }
  )
</script>

<style scoped>
  .friend-chat {
    height: min(54rem, calc(100vh - 13.5rem));
    height: min(54rem, calc(100dvh - 13.5rem));
    min-height: 0;
    min-width: 0;
  }

  .friend-chat-layout {
    display: grid;
    grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
  }

  .friend-chat-list,
  .friend-chat-thread {
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .friend-chat-list {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .friend-chat-list-header,
  .friend-chat-thread-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .friend-chat-thread {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .friend-chat-thread-title {
    min-width: 0;
    flex: 1;
  }

  .friend-chat-thread-title p,
  .friend-chat-conversation-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-accent);
    font-size: 0.75rem;
  }

  .friend-chat-thread-title span,
  .friend-chat-conversation-preview,
  .friend-chat-empty,
  .friend-chat-message-time,
  .friend-chat-gift-meta,
  .friend-chat-conversation-side {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1rem;
  }

  .friend-chat-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
    border-radius: 4px;
    color: var(--color-muted);
    background: rgb(var(--color-bg) / 0.55);
  }

  .friend-chat-icon-btn:disabled {
    opacity: 0.45;
  }

  .friend-chat-conversations {
    display: grid;
    gap: 0.4rem;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.2rem;
  }

  .friend-chat-conversation {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
    min-height: 3.75rem;
    padding: 0.5rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
    border-radius: 6px;
    background: rgb(var(--color-bg) / 0.45);
    text-align: left;
  }

  .friend-chat-conversation--active,
  .friend-chat-conversation:hover {
    border-color: rgb(var(--color-accent-rgb) / 0.35);
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .friend-chat-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.22);
    color: var(--color-accent);
    background: rgb(var(--color-accent-rgb) / 0.08);
    font-size: 0.75rem;
  }

  .friend-chat-conversation-main {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .friend-chat-conversation-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .friend-chat-conversation-side {
    display: grid;
    justify-items: end;
    gap: 0.25rem;
  }

  .friend-chat-unread {
    min-width: 1.25rem;
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--color-danger);
    color: white;
    font-size: 0.625rem;
  }

  .friend-chat-messages {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.1);
    border-radius: 6px;
    background: rgb(var(--color-bg) / 0.25);
  }

  .friend-chat-date-divider {
    width: fit-content;
    margin: 0.5rem auto;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgb(var(--color-accent-rgb) / 0.08);
    color: var(--color-muted);
    font-size: 0.625rem;
  }

  .friend-chat-message-row {
    display: flex;
    justify-content: flex-start;
    margin: 0.35rem 0;
  }

  .friend-chat-message-row--own {
    justify-content: flex-end;
  }

  .friend-chat-bubble {
    max-width: min(76%, 34rem);
    display: grid;
    gap: 0.35rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
    border-radius: 6px;
    background: rgb(var(--color-bg) / 0.65);
  }

  .friend-chat-message-row--own .friend-chat-bubble {
    border-color: rgb(var(--color-success-rgb) / 0.24);
    background: rgb(var(--color-success-rgb) / 0.08);
  }

  .friend-chat-message-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    line-height: 1.35rem;
  }

  .friend-chat-photo {
    max-width: min(100%, 24rem);
    max-height: 16rem;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
  }

  .friend-chat-gift-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: min(16rem, 70vw);
    padding: 0.45rem;
    border-radius: 4px;
    border: 1px solid rgb(var(--color-warning-rgb) / 0.24);
    background: rgb(var(--color-warning-rgb) / 0.08);
  }

  .friend-chat-gift-title {
    color: var(--color-accent);
    font-size: 0.75rem;
  }

  .friend-chat-gift-rewards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.35rem;
    align-items: center;
    max-width: min(24rem, 62vw);
    margin-top: 0.15rem;
    color: rgb(var(--color-text));
    font-size: 0.6875rem;
    line-height: 1.1rem;
    overflow-wrap: anywhere;
  }

  .friend-chat-gift-rewards-prefix,
  .friend-chat-gift-reward-item {
    display: inline-flex;
    min-width: 0;
    align-items: center;
  }

  .friend-chat-gift-reward-item {
    gap: 0.2rem;
  }

  .friend-chat-claim-btn {
    min-width: 3.25rem;
    height: 2rem;
    border-radius: 4px;
    background: var(--color-accent);
    color: rgb(var(--color-bg));
    font-size: 0.75rem;
  }

  .friend-chat-composer {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.6rem;
  }

  .friend-chat-compose-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .friend-chat-compose-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 2rem;
    padding: 0 0.65rem;
    border-radius: 4px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
    color: var(--color-muted);
  }

  .friend-chat-compose-tabs button.active {
    color: var(--color-accent);
    border-color: rgb(var(--color-accent-rgb) / 0.35);
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .friend-chat-message-compose,
  .friend-chat-gift-compose {
    display: grid;
    gap: 0.5rem;
  }

  .friend-chat-message-input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    gap: 0.5rem;
  }

  .friend-chat-send-btn {
    min-width: 5.25rem;
    min-height: 100%;
    white-space: nowrap;
  }

  .friend-chat-textarea,
  .friend-chat-input,
  .friend-chat-number {
    width: 100%;
    min-width: 0;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.2);
    border-radius: 4px;
    background: rgb(var(--color-bg));
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    outline: none;
  }

  .friend-chat-textarea {
    resize: none;
    padding: 0.5rem;
    line-height: 1.25rem;
  }

  .friend-chat-input,
  .friend-chat-number {
    height: 2.25rem;
    padding: 0 0.5rem;
  }

  .friend-chat-photo-row,
  .friend-chat-gift-row,
  .friend-chat-gift-actions {
    display: flex;
    gap: 0.5rem;
  }

  .friend-chat-gift-row {
    align-items: center;
    flex-wrap: wrap;
  }

  .friend-chat-owned-gift-picker {
    display: inline-flex;
    flex: 1 1 16rem;
    min-width: min(100%, 12rem);
    min-height: 2.75rem;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.2);
    border-radius: 4px;
    padding: 0.45rem 0.55rem;
    color: rgb(var(--color-text));
    text-align: left;
    background: rgb(var(--color-bg) / 0.72);
    transition: border-color 0.16s ease, background-color 0.16s ease;
  }

  .friend-chat-owned-gift-picker:hover,
  .friend-chat-owned-gift-picker:focus-visible,
  .friend-chat-owned-gift-picker--selected {
    border-color: rgb(var(--color-accent-rgb) / 0.44);
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .friend-chat-owned-gift-picker:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .friend-chat-owned-gift-picker-icon {
    display: inline-flex;
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
    border-radius: 4px;
    color: var(--color-muted);
  }

  .friend-chat-owned-gift-picker-copy {
    display: grid;
    min-width: 0;
    gap: 0.15rem;
  }

  .friend-chat-owned-gift-picker-title,
  .friend-chat-owned-gift-picker-meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .friend-chat-owned-gift-picker-title {
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .friend-chat-owned-gift-picker-meta {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 0.9rem;
  }

  .friend-chat-gift-row .friend-chat-number {
    flex: 0 0 5rem;
    max-width: 5rem;
  }

  .friend-chat-gift-row-hint {
    flex: 1 0 100%;
    color: var(--color-danger);
    font-size: 0.625rem;
    line-height: 1rem;
  }

  .friend-chat-gift-rows {
    display: grid;
    gap: 0.4rem;
    max-height: min(10rem, 24vh);
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.2rem;
  }

  .friend-chat-gift-picker-dialog {
    display: grid;
    gap: 0.5rem;
  }

  .friend-chat-gift-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.5rem;
  }

  .friend-chat-gift-picker-option {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 4rem;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
    border-radius: 4px;
    padding: 0.5rem;
    color: rgb(var(--color-text));
    text-align: left;
    background: rgb(var(--color-bg) / 0.48);
    transition: border-color 0.16s ease, background-color 0.16s ease, opacity 0.16s ease;
  }

  .friend-chat-gift-picker-option:hover,
  .friend-chat-gift-picker-option:focus-visible,
  .friend-chat-gift-picker-option--active {
    border-color: rgb(var(--color-accent-rgb) / 0.48);
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .friend-chat-gift-picker-option:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .friend-chat-gift-picker-decoration-icon {
    display: inline-flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.28);
    border-radius: 4px;
    color: var(--color-accent);
    background: rgb(var(--color-accent-rgb) / 0.08);
  }

  .friend-chat-gift-picker-option-copy {
    display: grid;
    min-width: 0;
    gap: 0.2rem;
  }

  .friend-chat-gift-picker-option-name,
  .friend-chat-gift-picker-option-meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .friend-chat-gift-picker-option-name {
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .friend-chat-gift-picker-option-meta {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 0.9rem;
  }

  .friend-chat-gift-picker-check {
    color: var(--color-accent);
  }

  .friend-chat-error {
    color: var(--color-danger);
    font-size: 0.625rem;
    line-height: 1rem;
  }

  @media (max-width: 767px) {
    .friend-chat {
      height: min(48rem, calc(100vh - 9rem));
      height: min(48rem, calc(100dvh - 9rem));
    }

    .friend-chat-layout {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, auto) minmax(0, 1fr);
      min-height: 0;
    }

    .friend-chat-list {
      height: auto;
      max-height: 9rem;
    }

    .friend-chat-thread {
      height: auto;
      min-height: 0;
      grid-template-rows: auto minmax(0, 1fr) auto;
    }

    .friend-chat-conversations {
      max-height: 5.75rem;
    }

    .friend-chat-conversations {
      grid-template-columns: 1fr;
    }

    .friend-chat-bubble {
      max-width: 88%;
    }

    .friend-chat-photo-row,
    .friend-chat-gift-row,
    .friend-chat-gift-actions {
      flex-wrap: wrap;
    }

    .friend-chat-message-input-row {
      grid-template-columns: minmax(0, 1fr) 4.75rem;
      gap: 0.4rem;
    }

    .friend-chat-send-btn {
      min-width: 0;
      padding-inline: 0.5rem;
    }

    .friend-chat-owned-gift-picker,
    .friend-chat-gift-row .friend-chat-number {
      max-width: none;
      flex: 1 1 5rem;
    }

    .friend-chat-gift-picker-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
