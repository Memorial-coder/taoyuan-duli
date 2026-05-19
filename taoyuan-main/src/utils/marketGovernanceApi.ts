import { ensureCurrentAccount } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export interface MarketGovernanceSourceSnapshot {
  id: string
  label: string
  enabled: boolean
  detail: string
}

export interface MarketGovernancePublicSnapshot {
  bulletin: string
  sources: MarketGovernanceSourceSnapshot[]
  price_bands: {
    consignment: { min_money: number; max_money: number }
    festival: { min_money: number; max_money: number }
    official_money: { min_money: number; max_money: number }
  }
  rare_policy: {
    official_only_categories: string[]
    blocked_rules: string[]
    summary: string
  }
  anti_abuse: {
    daily_trade_action_limit: number
    daily_consignment_listing_limit: number
    daily_consignment_purchase_limit: number
    min_action_interval_seconds: number
    daily_money_volume_limit: number
    duplicate_open_listing_limit: number
  }
  my_today: {
    day_key: string
    total_action_count: number
    total_money_volume: number
    consignment_listing_count: number
    consignment_purchase_count: number
    next_action_ready_in_seconds: number
  }
  sanction: {
    blocked: boolean
    reason: string
    updated_at: number
  }
}

export interface MarketGovernancePublicResponse {
  ok: boolean
  governance?: MarketGovernancePublicSnapshot
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再查看集市调控')
  }
}

export const fetchMarketGovernance = async (): Promise<MarketGovernancePublicSnapshot | null> => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson<MarketGovernancePublicResponse>(async () => fetch('/api/taoyuan/exchange-station/governance', {
    credentials: 'include',
  }), {
    fallbackMessage: '集市调控请求失败',
    networkErrorMessage: '集市调控连接失败，请检查网络或稍后重试'
  })
  return data?.governance ?? null
}
