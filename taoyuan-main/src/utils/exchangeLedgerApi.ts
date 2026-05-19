import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type ExchangeLedgerBundleEntry =
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

export interface ExchangeLedgerDispute {
  id: string
  entry_id: string
  source: string
  source_label: string
  event_label: string
  reported_by: string
  counterparty_username: string
  counterparty_label: string
  status: 'open' | 'resolved' | 'dismissed'
  reason_code: string
  reason_label: string
  note: string
  created_at: number
  updated_at: number
}

export interface ExchangeLedgerEntry {
  id: string
  source: 'weekly_exchange_station' | 'festival_stall' | 'neighbor_consignment' | string
  source_label: string
  event_type: string
  event_label: string
  title: string
  status: 'completed' | 'open' | 'cancelled' | 'expired' | 'reclaimed' | string
  status_label: string
  viewer_role: 'trader' | 'buyer' | 'seller' | string
  actor_username: string
  counterparty_username: string
  counterparty_label: string
  counterparty_type: string
  created_at: number
  week_key: string
  scope_label: string
  money_volume: number
  price_label: string
  offered_entries: ExchangeLedgerBundleEntry[]
  received_entries: ExchangeLedgerBundleEntry[]
  category_labels: string[]
  dispute_count: number
  open_dispute_count: number
  latest_dispute?: ExchangeLedgerDispute | null
  reportable: boolean
}

export interface ExchangeLedgerSummary {
  total_completed_count: number
  total_entry_count: number
  anomaly_count: number
  total_dispute_count: number
  open_dispute_count: number
  total_money_spent: number
  total_money_received: number
  total_money_volume: number
  trust_level: {
    id: string
    label: string
  }
  source_ranks: Array<{
    source: string
    label: string
    count: number
  }>
  counterparty_ranks: Array<{
    key: string
    username: string
    label: string
    count: number
    money_volume: number
  }>
  category_ranks: Array<{
    label: string
    count: number
  }>
}

export interface ExchangeLedgerOverview {
  bulletin: string
  reason_options: Array<{
    id: string
    label: string
  }>
  summary: ExchangeLedgerSummary
  entries: ExchangeLedgerEntry[]
  my_disputes: ExchangeLedgerDispute[]
}

export interface ExchangeLedgerResponse {
  ok: boolean
  ledger?: ExchangeLedgerOverview
  msg?: string
}

export interface ExchangeLedgerDisputeActionResponse {
  ok: boolean
  dispute: ExchangeLedgerDispute
  ledger: ExchangeLedgerOverview
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再查看交换记录')
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
    fallbackMessage: '交换记录请求失败',
    networkErrorMessage: '交换记录连接失败，请检查网络或稍后重试'
  })
  return data
}

export const fetchExchangeLedger = async (): Promise<ExchangeLedgerOverview | null> => {
  const data = await request<ExchangeLedgerResponse>('/api/taoyuan/exchange-station/ledger')
  return data?.ledger ?? null
}

export const reportExchangeLedgerDispute = async (entryId: string, payload: {
  reason_code: string
  note?: string
}): Promise<ExchangeLedgerDisputeActionResponse> => {
  const data = await request<ExchangeLedgerDisputeActionResponse>(`/api/taoyuan/exchange-station/ledger/${encodeURIComponent(entryId)}/disputes`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  })
  return data as ExchangeLedgerDisputeActionResponse
}
