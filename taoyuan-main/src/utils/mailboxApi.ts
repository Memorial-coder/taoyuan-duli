import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用桃源乡邮箱')
  }
}

const request = async (input: string, init?: RequestInit) => {
  await ensureLoggedInContext()
  let res: Response
  try {
    res = await fetch(input, {
      credentials: 'include',
      ...init
    })
  } catch {
    throw new Error('邮箱服务连接失败，请检查网络或服务器状态')
  }
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '桃源乡邮箱请求失败')
  }
  return data
}

export const fetchMailboxList = async () => request('/api/taoyuan/mail/list')

export const fetchMailboxDetail = async (id: string) => request(`/api/taoyuan/mail/${encodeURIComponent(id)}`)

export const markMailboxRead = async (id: string) => {
  const csrfToken = await ensureCurrentCsrfToken()
  return request(`/api/taoyuan/mail/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  })
}

export const claimMailboxMail = async (id: string) => {
  const csrfToken = await ensureCurrentCsrfToken()
  return request(`/api/taoyuan/mail/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  })
}

export const claimAllMailboxMail = async () => {
  const csrfToken = await ensureCurrentCsrfToken()
  return request('/api/taoyuan/mail/claim-all', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  })
}

export const clearClaimedMailboxMail = async () => {
  const csrfToken = await ensureCurrentCsrfToken()
  return request('/api/taoyuan/mail/clear-claimed', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  })
}
