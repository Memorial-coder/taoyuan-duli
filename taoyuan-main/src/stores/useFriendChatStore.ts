import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  claimPrivateChatGift,
  fetchPrivateChatConversations,
  fetchPrivateChatMessages,
  markPrivateChatConversationRead,
  sendPrivateChatGift,
  sendPrivateChatMessage,
  type PrivateChatConversationSummary,
  type PrivateChatMessage,
  type PrivateChatRewardDraft,
  type PrivateChatTargetPayload
} from '@/utils/friendChatApi'

const createDefaultGiftRewards = (): PrivateChatRewardDraft[] => [
  { type: 'item', id: '', quantity: 1, quality: 'normal' }
]

export const useFriendChatStore = defineStore('friendChat', () => {
  const conversations = ref<PrivateChatConversationSummary[]>([])
  const messageMap = ref<Record<string, PrivateChatMessage[]>>({})
  const activeConversationId = ref('')
  const activeTargetUsername = ref('')
  const activeTargetSaveId = ref('')
  const activeTargetDisplayName = ref('')
  const loading = ref(false)
  const messagesLoading = ref(false)
  const sending = ref(false)
  const claimingGift = ref(false)
  const errorMessage = ref('')

  const messageDraft = ref('')
  const photoUrlDraft = ref('')
  const photoAltDraft = ref('')
  const giftContentDraft = ref('')
  const giftRewardsDraft = ref<PrivateChatRewardDraft[]>(createDefaultGiftRewards())

  const activeConversation = computed(() =>
    conversations.value.find(item => item.id === activeConversationId.value) ?? null
  )
  const activeMessages = computed(() =>
    activeConversationId.value ? messageMap.value[activeConversationId.value] ?? [] : []
  )
  const totalUnreadCount = computed(() =>
    conversations.value.reduce((sum, item) => sum + Math.max(0, Number(item.unread_count) || 0), 0)
  )
  const activePeerUsername = computed(() => activeConversation.value?.peer_username || activeTargetUsername.value)
  const activePeerDisplayName = computed(() =>
    activeConversation.value?.peer_profile?.display_name ||
    activeTargetDisplayName.value ||
    activeTargetUsername.value ||
    (activeTargetSaveId.value ? `ID ${activeTargetSaveId.value}` : '')
  )

  const upsertConversation = (conversation: PrivateChatConversationSummary | null | undefined) => {
    if (!conversation?.id) return
    const index = conversations.value.findIndex(item => item.id === conversation.id)
    if (index >= 0) conversations.value[index] = conversation
    else conversations.value.unshift(conversation)
    conversations.value = [...conversations.value].sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0))
  }

  const upsertMessage = (message: PrivateChatMessage | null | undefined) => {
    if (!message?.conversation_id || !message.id) return
    const current = messageMap.value[message.conversation_id] ?? []
    const index = current.findIndex(item => item.id === message.id)
    const next = index >= 0
      ? current.map(item => item.id === message.id ? message : item)
      : [...current, message]
    messageMap.value = {
      ...messageMap.value,
      [message.conversation_id]: next.sort((left, right) => (left.created_at || 0) - (right.created_at || 0))
    }
  }

  const refreshConversations = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) loading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchPrivateChatConversations()
      conversations.value = data?.conversations ?? []
      if (activeTargetUsername.value && !activeConversationId.value) {
        const matched = conversations.value.find(item => item.peer_username === activeTargetUsername.value)
        if (matched) activeConversationId.value = matched.id
      }
      return conversations.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取私聊会话失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const openTarget = async (target: {
    target_username?: string
    target_save_id?: string | number
    display_name?: string
  }) => {
    activeTargetUsername.value = String(target.target_username || '').trim()
    activeTargetSaveId.value = String(target.target_save_id || '').trim()
    activeTargetDisplayName.value = String(target.display_name || '').trim()
    await refreshConversations({ silent: true }).catch(() => {})
    const matched = conversations.value.find(item =>
      (activeTargetUsername.value && item.peer_username === activeTargetUsername.value) ||
      (activeTargetDisplayName.value && item.peer_profile?.display_name === activeTargetDisplayName.value)
    )
    activeConversationId.value = matched?.id || ''
    if (matched) await loadMessages(matched.id).catch(() => {})
  }

  const openConversation = async (conversationId: string) => {
    activeConversationId.value = conversationId
    const conversation = conversations.value.find(item => item.id === conversationId)
    activeTargetUsername.value = conversation?.peer_username || ''
    activeTargetSaveId.value = ''
    activeTargetDisplayName.value = conversation?.peer_profile?.display_name || ''
    await loadMessages(conversationId)
  }

  const loadMessages = async (conversationId = activeConversationId.value) => {
    if (!conversationId) return []
    messagesLoading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchPrivateChatMessages(conversationId)
      if (data?.conversation) upsertConversation(data.conversation)
      messageMap.value = {
        ...messageMap.value,
        [conversationId]: data?.messages ?? []
      }
      await markConversationRead(conversationId).catch(() => {})
      return messageMap.value[conversationId] ?? []
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取私聊消息失败'
      throw error
    } finally {
      messagesLoading.value = false
    }
  }

  const buildTargetPayload = (): PrivateChatTargetPayload => {
    const target_save_id = Number(activeTargetSaveId.value)
    return {
      target_username: activePeerUsername.value || undefined,
      target_save_id: activeTargetSaveId.value && Number.isInteger(target_save_id) ? target_save_id : undefined
    }
  }

  const sendCurrentMessage = async () => {
    const content = messageDraft.value.trim()
    const photoUrl = photoUrlDraft.value.trim()
    const photoAlt = photoAltDraft.value.trim()
    if (!content && !photoUrl) throw new Error('请输入要发送的内容')
    sending.value = true
    errorMessage.value = ''
    try {
      const data = await sendPrivateChatMessage({
        ...buildTargetPayload(),
        content,
        photo_url: photoUrl || undefined,
        photo_alt: photoAlt || undefined
      })
      if (data?.conversation) {
        upsertConversation(data.conversation)
        activeConversationId.value = data.conversation.id
      }
      upsertMessage(data?.message)
      messageDraft.value = ''
      photoUrlDraft.value = ''
      photoAltDraft.value = ''
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发送私聊失败'
      throw error
    } finally {
      sending.value = false
    }
  }

  const addGiftReward = () => {
    giftRewardsDraft.value = [...giftRewardsDraft.value, { type: 'item', id: '', quantity: 1, quality: 'normal' }]
  }

  const removeGiftReward = (index: number) => {
    giftRewardsDraft.value = giftRewardsDraft.value.filter((_, currentIndex) => currentIndex !== index)
  }

  const sendCurrentGift = async () => {
    const rewards = giftRewardsDraft.value
      .map(reward => ({
        type: reward.type,
        id: reward.id.trim(),
        quantity: Math.max(1, Math.floor(Number(reward.quantity) || 1)),
        quality: reward.quality?.trim() || undefined
      }))
      .filter(reward => reward.id)
    if (rewards.length === 0) throw new Error('请至少放入一项礼物')
    sending.value = true
    errorMessage.value = ''
    try {
      const data = await sendPrivateChatGift({
        ...buildTargetPayload(),
        content: giftContentDraft.value.trim() || undefined,
        rewards
      })
      if (data?.conversation) {
        upsertConversation(data.conversation)
        activeConversationId.value = data.conversation.id
      }
      upsertMessage(data?.message)
      giftContentDraft.value = ''
      giftRewardsDraft.value = createDefaultGiftRewards()
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发送聊天礼物失败'
      throw error
    } finally {
      sending.value = false
    }
  }

  const claimGift = async (messageId: string) => {
    claimingGift.value = true
    errorMessage.value = ''
    try {
      const data = await claimPrivateChatGift(messageId)
      upsertConversation(data?.conversation)
      upsertMessage(data?.message)
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '领取聊天礼物失败'
      throw error
    } finally {
      claimingGift.value = false
    }
  }

  const markConversationRead = async (conversationId = activeConversationId.value) => {
    if (!conversationId) return null
    const data = await markPrivateChatConversationRead(conversationId)
    upsertConversation(data?.conversation)
    return data
  }

  const resetDrafts = () => {
    messageDraft.value = ''
    photoUrlDraft.value = ''
    photoAltDraft.value = ''
    giftContentDraft.value = ''
    giftRewardsDraft.value = createDefaultGiftRewards()
  }

  return {
    conversations,
    messageMap,
    activeConversationId,
    activeTargetUsername,
    activeTargetSaveId,
    activeTargetDisplayName,
    loading,
    messagesLoading,
    sending,
    claimingGift,
    errorMessage,
    messageDraft,
    photoUrlDraft,
    photoAltDraft,
    giftContentDraft,
    giftRewardsDraft,
    activeConversation,
    activeMessages,
    activePeerUsername,
    activePeerDisplayName,
    totalUnreadCount,
    refreshConversations,
    openTarget,
    openConversation,
    loadMessages,
    sendCurrentMessage,
    sendCurrentGift,
    addGiftReward,
    removeGiftReward,
    claimGift,
    markConversationRead,
    resetDrafts
  }
})
