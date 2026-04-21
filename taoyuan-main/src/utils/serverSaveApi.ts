import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

const MAX_SLOTS = 3

const normalizeSlot = (slot: number): number | null => {
  return Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS ? slot : null
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用服务端存档')
  }
}

export const fetchServerSlots = async (): Promise<(string | null)[]> => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson(() => fetch('/api/taoyuan/save/slots', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取服务端存档列表失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
  })
  return Array.from({ length: MAX_SLOTS }, (_, slot) => data?.slots?.[slot]?.raw ?? null)
}

export const fetchServerSlotRaw = async (slot: number): Promise<string | null> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const { response, data } = await fetchProtectedJson(() => fetch(`/api/taoyuan/save/${safeSlot}`, {
    credentials: 'include'
  }), {
    fallbackMessage: '读取服务端存档失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试',
    allowNotFound: true
  })
  if (response.status === 404) return null
  return typeof data?.raw === 'string' ? data.raw : null
}

export interface SaveServerSlotRawResult {
  stale: boolean
  currentRevision: number
}

export const saveServerSlotRaw = async (slot: number, raw: string, revision: number): Promise<SaveServerSlotRawResult> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch(`/api/taoyuan/save/${safeSlot}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ raw, revision })
    })
  }, {
    fallbackMessage: '保存服务端存档失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
  })
  return {
    stale: data?.stale === true,
    currentRevision: Number.isFinite(Number(data?.current_revision)) ? Number(data?.current_revision) : revision
  }
}

export const setServerActiveSlot = async (slot: number): Promise<void> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  await fetchProtectedJson(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch('/api/taoyuan/save/active-slot', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ slot: safeSlot })
    })
  }, {
    fallbackMessage: '设置当前服务端存档失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
  })
}

export const deleteServerSlotRaw = async (slot: number): Promise<void> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  await fetchProtectedJson(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch(`/api/taoyuan/save/${safeSlot}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': csrfToken
      }
    })
  }, {
    fallbackMessage: '删除服务端存档失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
  })
}
