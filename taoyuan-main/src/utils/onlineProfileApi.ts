import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type OnlineProfileVisibility = 'public' | 'friends_only' | 'private'

export interface OnlineProfileResponse {
  ok: boolean
  profile?: {
    username: string
    display_name: string
    player_name: string
    honorific: string
    manor_name: string
    season_progress: string
    primary_route_label: string
    recent_activity: string
    public_title: string
    neighborhood_role: string
    showcase_theme: string
    public_intro: string
    visibility: OnlineProfileVisibility
    active_quest_count: number
    updated_at: number
    last_active_at: number
  }
  msg?: string
}

export const fetchOnlineProfile = async (): Promise<OnlineProfileResponse['profile'] | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineProfileResponse>(() => fetch('/api/taoyuan/online/profile', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取公开档案失败',
    networkErrorMessage: '公开档案连接失败，请检查网络或稍后重试'
  })
  return data?.profile ?? null
}

export const saveOnlineProfile = async (payload: {
  visibility: OnlineProfileVisibility
  public_intro: string
  manor_name: string
  public_title: string
  neighborhood_role: string
  showcase_theme: string
}): Promise<OnlineProfileResponse['profile'] | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineProfileResponse>(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch('/api/taoyuan/online/profile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload)
    })
  }, {
    fallbackMessage: '保存公开档案失败',
    networkErrorMessage: '公开档案连接失败，请检查网络或稍后重试'
  })
  return data?.profile ?? null
}
