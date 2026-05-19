import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用桃源乡邮箱')
  }
}

const request = async (input: string, initFactory?: RequestInit | (() => Promise<RequestInit> | RequestInit)) => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson(async () => {
    const init = typeof initFactory === 'function' ? await initFactory() : initFactory
    return fetch(input, {
      credentials: 'include',
      ...init
    })
  }, {
    fallbackMessage: '桃源乡邮箱请求失败',
    networkErrorMessage: '邮箱服务连接失败，请检查网络或稍后重试'
  })
  return data
}

export const fetchMailboxList = async () => request('/api/taoyuan/mail/list')

export const fetchMailboxDetail = async (id: string) => request(`/api/taoyuan/mail/${encodeURIComponent(id)}`)

export const fetchPlayerLetterPresets = async () => request('/api/taoyuan/mail/player-letter-presets')

export const markMailboxRead = async (id: string) => {
  return request(`/api/taoyuan/mail/${encodeURIComponent(id)}/read`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
}

export const claimMailboxMail = async (id: string) => {
  return request(`/api/taoyuan/mail/${encodeURIComponent(id)}/claim`, async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
}

export const claimAllMailboxMail = async () => {
  return request('/api/taoyuan/mail/claim-all', async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
}

export const clearClaimedMailboxMail = async () => {
  return request('/api/taoyuan/mail/clear-claimed', async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    }
  })
}

export const sendPlayerLetter = async (payload: {
  target_username: string
  title: string
  content: string
  template_type: 'player_letter' | 'season_greeting' | 'festival_greeting' | 'blessing_card' | 'short_note' | 'photo_letter'
  photo_url?: string
  photo_alt?: string
}) => {
  return request('/api/taoyuan/mail/player-letter', async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload)
    }
  })
}

export const sendPlayerGiftPackage = async (payload: {
  target_username: string
  title: string
  content: string
  template_type: 'material_package' | 'seed_package' | 'fish_fry_package' | 'decoration_package' | 'souvenir_package'
  rewards: Array<{
    type: 'item' | 'seed' | 'decoration'
    id: string
    quantity: number
    quality?: string
  }>
}) => {
  return request('/api/taoyuan/mail/player-gift-package', async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload)
    }
  })
}

export const createSystemMailboxCampaign = async (payload: {
  id: string
  title: string
  content: string
  template_type: 'activity_reward' | 'maintenance_notice' | 'compensation' | 'activity_notice' | 'activity_midweek' | 'activity_preview' | 'weekly_recap'
  rewards?: Array<{
    type: string
    amount?: number
    quantity?: number
    id?: string
    quality?: string
    source?: string
  }>
  duplicate_compensation_money?: number
}) => {
  return request('/api/taoyuan/mail/system-campaign', async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload)
    }
  })
}
