import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type FestivalStallBundleEntry =
  | {
      type: 'item'
      item_id: string
      quantity: number
      quality?: string
    }
  | {
      type: 'money'
      amount: number
    }
  | {
      type: 'ticket'
      ticket_type: string
      quantity: number
    }

export interface FestivalStallOffer {
  id: string
  name: string
  description: string
  badge: string
  price_money: number
  category: 'festival'
  category_label: string
  booth_category: 'materials' | 'souvenir' | 'food' | 'tickets' | string
  costs: FestivalStallBundleEntry[]
  rewards: FestivalStallBundleEntry[]
  tags: string[]
  weekly_limit_per_user: number
  station_stock: number
  claimed_by_user: number
  claimed_global: number
  remaining_global: number
  can_exchange: boolean
  disabled_reason: string
}

export interface FestivalStallRecord {
  id: string
  username: string
  offer_id: string
  offer_name: string
  week_key: string
  save_slot: number | null
  created_at: number
  costs: FestivalStallBundleEntry[]
  rewards: FestivalStallBundleEntry[]
}

export interface FestivalStallSnapshot {
  week_key: string
  week_label: string
  refresh_hint: string
  bulletin: string
  festival_theme?: {
    id: string
    label: string
    bulletin: string
  } | null
  categories?: Array<{
    id: 'materials' | 'souvenir' | 'food' | 'tickets' | string
    label: string
    offer_count: number
  }>
  save_available: boolean
  save_message: string
  offers: FestivalStallOffer[]
  my_records: FestivalStallRecord[]
}

export interface FestivalStallResponse {
  ok: boolean
  stall?: FestivalStallSnapshot
  msg?: string
}

export interface FestivalStallActionResponse {
  ok: boolean
  week_key: string
  week_label: string
  refresh_hint: string
  save_slot: number | null
  money: number
  offer: FestivalStallOffer
  record: FestivalStallRecord
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用节庆摊位')
  }
}

const request = async <T>(input: string, initFactory?: RequestInit | (() => Promise<RequestInit> | RequestInit)) => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson<T>(async () => {
    const init = typeof initFactory === 'function' ? await initFactory() : initFactory
    return fetch(input, {
      credentials: 'include',
      ...init
    })
  }, {
    fallbackMessage: '节庆摊位请求失败',
    networkErrorMessage: '节庆摊位连接失败，请检查网络或稍后重试'
  })
  return data
}

export const fetchFestivalStall = async (): Promise<FestivalStallSnapshot | null> => {
  const data = await request<FestivalStallResponse>('/api/taoyuan/exchange-station/festival-stall')
  return data?.stall ?? null
}

export const purchaseFestivalStallOffer = async (offerId: string): Promise<FestivalStallActionResponse> => {
  const data = await request<FestivalStallActionResponse>(`/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(offerId)}/purchase`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
  return data as FestivalStallActionResponse
}
