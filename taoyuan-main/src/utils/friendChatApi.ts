import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type PrivateChatMessageType = 'text' | 'photo' | 'gift'
export type PrivateChatGiftClaimStatus = 'claimable' | 'claimed' | 'expired' | 'notice'

export interface PrivateChatPeerProfile {
  username: string
  display_name: string
  avatar_image_url?: string
  avatar_image_alt?: string
  public_title?: string
  manor_name?: string
  recent_activity?: string
  primary_route_label?: string
}

export interface PrivateChatGiftState {
  delivery_id: string
  reward_count: number
  can_claim: boolean
  is_claimed: boolean
  claimed_at: number | null
  claim_status: PrivateChatGiftClaimStatus
}

export interface PrivateChatMessage {
  id: string
  conversation_id: string
  sender_username: string
  sender_display_name: string
  recipient_username: string
  recipient_display_name: string
  type: PrivateChatMessageType
  content: string
  photo_url: string
  photo_alt: string
  gift: PrivateChatGiftState | null
  is_own: boolean
  created_at: number
}

export interface PrivateChatConversationSummary {
  id: string
  peer_username: string
  peer_profile: PrivateChatPeerProfile
  updated_at: number
  last_message: PrivateChatMessage | null
  last_message_preview: string
  unread_count: number
}

export interface PrivateChatRewardDraft {
  type: 'item' | 'seed' | 'decoration'
  id: string
  quantity: number
  quality?: string
}

export interface PrivateChatTargetPayload {
  target_username?: string
  target_save_id?: number
}

export type PrivateChatSendMessagePayload = PrivateChatTargetPayload & {
  content: string
  photo_url?: string
  photo_alt?: string
}

export type PrivateChatGiftPayload = PrivateChatTargetPayload & {
  content?: string
  title?: string
  template_type?: string
  rewards: PrivateChatRewardDraft[]
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用好友私聊')
  }
}

const request = async <T = any>(input: string, initFactory?: RequestInit | (() => Promise<RequestInit> | RequestInit)) => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson<T>(async () => {
    const init = typeof initFactory === 'function' ? await initFactory() : initFactory
    return fetch(input, {
      credentials: 'include',
      ...init
    })
  }, {
    fallbackMessage: '好友私聊请求失败',
    networkErrorMessage: '好友私聊服务连接失败，请检查网络或稍后重试'
  })
  return data
}

const signedJsonInit = async (payload?: unknown): Promise<RequestInit> => {
  const csrfToken = await ensureCurrentCsrfToken()
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  }
}

const signedPostInit = async (): Promise<RequestInit> => {
  const csrfToken = await ensureCurrentCsrfToken()
  return {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  }
}

export const fetchPrivateChatConversations = async () =>
  request<{ ok: boolean; conversations: PrivateChatConversationSummary[] }>('/api/taoyuan/online/chat/conversations')

export const fetchPrivateChatMessages = async (conversationId: string, options: { before?: number; limit?: number } = {}) => {
  const params = new URLSearchParams()
  if (options.before) params.set('before', String(options.before))
  if (options.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return request<{
    ok: boolean
    conversation: PrivateChatConversationSummary
    messages: PrivateChatMessage[]
  }>(`/api/taoyuan/online/chat/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ''}`)
}

export const sendPrivateChatMessage = async (payload: PrivateChatSendMessagePayload) =>
  request<{
    ok: boolean
    conversation: PrivateChatConversationSummary
    message: PrivateChatMessage
    recipient_username: string
  }>('/api/taoyuan/online/chat/messages', () => signedJsonInit(payload))

export const sendPrivateChatGift = async (payload: PrivateChatGiftPayload) =>
  request<{
    ok: boolean
    conversation: PrivateChatConversationSummary
    message: PrivateChatMessage
    recipient_username: string
  }>('/api/taoyuan/online/chat/gifts', () => signedJsonInit(payload))

export const markPrivateChatConversationRead = async (conversationId: string) =>
  request<{ ok: boolean; conversation: PrivateChatConversationSummary }>(
    `/api/taoyuan/online/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    signedPostInit
  )

export const claimPrivateChatGift = async (messageId: string) =>
  request<{
    ok: boolean
    message: PrivateChatMessage
    conversation: PrivateChatConversationSummary | null
    claim: unknown
  }>(`/api/taoyuan/online/chat/messages/${encodeURIComponent(messageId)}/claim-gift`, signedPostInit)
