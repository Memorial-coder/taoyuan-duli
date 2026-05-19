import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export interface NeighborConsignmentScopeOption {
  id: 'neighbors' | 'friends'
  label: string
}

export interface NeighborConsignmentListing {
  id: string
  group_id: string
  group_name: string
  seller_username: string
  seller_save_slot: number
  item_id: string
  quantity: number
  quality: 'normal' | 'fine' | 'excellent' | 'supreme'
  price_money: number
  scope: 'neighbors' | 'friends'
  scope_label: string
  status: 'open' | 'sold' | 'cancelled' | 'expired' | 'reclaimed'
  created_at: number
  updated_at: number
  expires_at: number
  sold_at: number | null
  cancelled_at: number | null
  reclaimed_at: number | null
  buyer_username: string
  visible_to_viewer: boolean
  can_buy: boolean
  can_cancel: boolean
  can_reclaim: boolean
}

export interface NeighborConsignmentOverview {
  bulletin: string
  neighbor_group: {
    id: string
    name: string
    role: string
    member_count: number
  } | null
  scope_options: NeighborConsignmentScopeOption[]
  open_listings: NeighborConsignmentListing[]
  my_listings: NeighborConsignmentListing[]
}

export interface NeighborConsignmentActionResponse {
  ok: boolean
  actor_save_slot: number
  listing: NeighborConsignmentListing
  overview: NeighborConsignmentOverview
  msg?: string
}

export interface NeighborConsignmentResponse {
  ok: boolean
  bulletin?: string
  neighbor_group?: NeighborConsignmentOverview['neighbor_group']
  scope_options?: NeighborConsignmentScopeOption[]
  open_listings?: NeighborConsignmentListing[]
  my_listings?: NeighborConsignmentListing[]
  actor_save_slot?: number
  listing?: NeighborConsignmentListing
  overview?: NeighborConsignmentOverview
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用邻里寄售')
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
    fallbackMessage: '邻里寄售请求失败',
    networkErrorMessage: '邻里寄售连接失败，请检查网络或稍后重试'
  })
  return data
}

export const fetchNeighborConsignmentOverview = async (): Promise<NeighborConsignmentOverview | null> => {
  const data = await request<NeighborConsignmentResponse>('/api/taoyuan/exchange-station/neighbors/consignments')
  return data?.overview ?? (data?.bulletin ? {
    bulletin: data.bulletin,
    neighbor_group: data.neighbor_group ?? null,
    scope_options: data.scope_options ?? [],
    open_listings: data.open_listings ?? [],
    my_listings: data.my_listings ?? [],
  } : null)
}

export const createNeighborConsignment = async (payload: {
  item_id: string
  quantity: number
  price_money: number
  scope: 'neighbors' | 'friends'
  duration_hours?: number
  expires_at?: number
}): Promise<NeighborConsignmentActionResponse> => {
  const data = await request<NeighborConsignmentActionResponse>('/api/taoyuan/exchange-station/neighbors/consignments', async () => {
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
  return data as NeighborConsignmentActionResponse
}

export const buyNeighborConsignment = async (listingId: string): Promise<NeighborConsignmentActionResponse> => {
  const data = await request<NeighborConsignmentActionResponse>(`/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(listingId)}/purchase`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
  return data as NeighborConsignmentActionResponse
}

export const cancelNeighborConsignment = async (listingId: string): Promise<NeighborConsignmentActionResponse> => {
  const data = await request<NeighborConsignmentActionResponse>(`/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(listingId)}/cancel`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
  return data as NeighborConsignmentActionResponse
}

export const reclaimExpiredNeighborConsignment = async (listingId: string): Promise<NeighborConsignmentActionResponse> => {
  const data = await request<NeighborConsignmentActionResponse>(`/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(listingId)}/reclaim`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
  return data as NeighborConsignmentActionResponse
}
