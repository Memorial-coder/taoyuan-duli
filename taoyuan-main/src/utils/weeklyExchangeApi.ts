import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type WeeklyExchangeBundleEntry =
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

export interface WeeklyExchangeOffer {
  id: string
  name: string
  description: string
  badge: string
  costs: WeeklyExchangeBundleEntry[]
  rewards: WeeklyExchangeBundleEntry[]
  tags: string[]
  weekly_limit_per_user: number
  station_stock: number
  claimed_by_user: number
  claimed_global: number
  remaining_global: number
  can_exchange: boolean
  disabled_reason: string
}

export interface WeeklyExchangeRecord {
  id: string
  username: string
  offer_id: string
  offer_name: string
  week_key: string
  save_slot: number | null
  created_at: number
  costs: WeeklyExchangeBundleEntry[]
  rewards: WeeklyExchangeBundleEntry[]
}

export interface WeeklyExchangeStationSnapshot {
  week_key: string
  week_label: string
  refresh_hint: string
  bulletin: string
  save_available: boolean
  save_message: string
  offers: WeeklyExchangeOffer[]
  my_records: WeeklyExchangeRecord[]
}

export interface WeeklyExchangeStationResponse {
  ok: boolean
  station?: WeeklyExchangeStationSnapshot
  msg?: string
}

export interface WeeklyExchangeActionResponse {
  ok: boolean
  week_key: string
  week_label: string
  refresh_hint: string
  save_slot: number | null
  money: number
  offer: WeeklyExchangeOffer
  record: WeeklyExchangeRecord
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用每周交换站')
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
    fallbackMessage: '每周交换站请求失败',
    networkErrorMessage: '每周交换站连接失败，请检查网络或稍后重试'
  })
  return data
}

export const fetchWeeklyExchangeStation = async (): Promise<WeeklyExchangeStationSnapshot | null> => {
  const data = await request<WeeklyExchangeStationResponse>('/api/taoyuan/exchange-station/weekly')
  return data?.station ?? null
}

export const exchangeWeeklyOffer = async (offerId: string): Promise<WeeklyExchangeActionResponse> => {
  const data = await request<WeeklyExchangeActionResponse>(`/api/taoyuan/exchange-station/weekly/${encodeURIComponent(offerId)}/exchange`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
  return data as WeeklyExchangeActionResponse
}
