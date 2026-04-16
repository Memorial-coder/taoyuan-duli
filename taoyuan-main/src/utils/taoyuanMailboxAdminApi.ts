export type TaoyuanMailTemplateType = 'compensation' | 'activity_reward' | 'maintenance_notice'
export type TaoyuanRecipientMode = 'all' | 'single' | 'batch' | 'keyword' | 'has_save'
export type TaoyuanRewardType = 'money' | 'item' | 'seed' | 'weapon' | 'ring' | 'hat' | 'shoe'

export interface TaoyuanMailRewardPayload {
  type: TaoyuanRewardType
  id?: string
  quantity?: number
  amount?: number
  quality?: 'normal' | 'fine' | 'excellent' | 'supreme'
}

export interface TaoyuanMailRecipientRulePayload {
  mode: TaoyuanRecipientMode
  username?: string
  usernames_text?: string
  keyword?: string
  target_slot?: number | null
  targets?: Array<{
    username: string
    target_slot?: number | null
  }>
}

export interface TaoyuanMailCampaignPayload {
  id?: string
  action: 'draft' | 'schedule' | 'send'
  template_type?: TaoyuanMailTemplateType
  title: string
  content: string
  expire_mode: 'never' | 'datetime'
  expires_at?: string
  scheduled_at?: string
  duplicate_compensation_money?: number
  recipient_rule: TaoyuanMailRecipientRulePayload
  rewards: TaoyuanMailRewardPayload[]
}

export interface TaoyuanMailClaimResult {
  save_slot: number | null
  money_added: number
  duplicate_compensation_money: number
  applied_rewards: Array<Record<string, unknown>>
  skipped_rewards: Array<Record<string, unknown>>
}

export interface TaoyuanMailDeliveryDetail {
  id: string
  username: string
  recipient_display_name: string
  target_slot?: number | null
  claim_status: 'claimable' | 'claimed' | 'expired' | 'notice'
  read_at: number | null
  claimed_at: number | null
  claim_result: TaoyuanMailClaimResult | null
}

export interface TaoyuanMailCampaignSummary {
  id: string
  title: string
  content: string
  template_type: TaoyuanMailTemplateType | null
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled'
  rewards: TaoyuanMailRewardPayload[]
  recipient_count_preview: number
  delivery_count: number
  claimed_count: number
  pending_claim_count: number
  sent_at: number | null
  updated_at: number | null
  created_by_display_name?: string
}

export interface TaoyuanMailCampaignDetail {
  campaign: TaoyuanMailCampaignSummary & {
    recipient_rule?: {
      mode?: TaoyuanRecipientMode
      username?: string
      usernames?: string[]
      keyword?: string
      target_slot?: number | null
      targets?: Array<{ username?: string; target_slot?: number | null }>
    }
    expires_at?: number | null
    scheduled_at?: number | null
    duplicate_compensation_money?: number
  }
  deliveries: TaoyuanMailDeliveryDetail[]
}

const ADMIN_TOKEN_KEY = 'admin_token'
const getScopedAdminTokenKey = () => buildScopedSingleKey(`${ADMIN_TOKEN_KEY}_`)

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export const getStoredAdminToken = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(getScopedAdminTokenKey()) || ''
}

export const setStoredAdminToken = (token: string) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getScopedAdminTokenKey(), token.trim())
}

export const clearStoredAdminToken = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getScopedAdminTokenKey())
}

const ensureAdminToken = (tokenOverride?: string) => {
  const token = String(tokenOverride || '').trim() || getStoredAdminToken()
  if (!token) throw new Error('请先填写管理员口令')
  return token
}

const adminRequest = async <T>(path: string, init?: RequestInit, tokenOverride?: string): Promise<T> => {
  const token = ensureAdminToken(tokenOverride)
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(init?.headers || {}),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    if (res.status === 403) throw new Error('管理员口令无效，请重新输入')
    throw new Error(data?.msg || '管理员请求失败')
  }
  return data as T
}

export const fetchTaoyuanMailCampaigns = async (tokenOverride?: string): Promise<TaoyuanMailCampaignSummary[]> => {
  const data = await adminRequest<{ campaigns?: TaoyuanMailCampaignSummary[] }>('/api/admin/taoyuan/mail/campaigns', undefined, tokenOverride)
  return Array.isArray(data.campaigns) ? data.campaigns : []
}

export const fetchTaoyuanMailCampaignDetail = async (id: string, tokenOverride?: string): Promise<TaoyuanMailCampaignDetail> => {
  return adminRequest<TaoyuanMailCampaignDetail>(`/api/admin/taoyuan/mail/campaigns/${encodeURIComponent(id)}`, undefined, tokenOverride)
}

export const saveTaoyuanMailCampaign = async (payload: TaoyuanMailCampaignPayload, tokenOverride?: string): Promise<TaoyuanMailCampaignSummary> => {
  const data = await adminRequest<{ campaign: TaoyuanMailCampaignSummary }>(
    '/api/admin/taoyuan/mail/campaigns',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    tokenOverride
  )
  return data.campaign
}
import { buildScopedSingleKey } from '@/utils/accountStorage'
