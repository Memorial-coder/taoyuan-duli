import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'

const MAX_SLOTS = 3

const normalizeSlot = (slot: number): number | null => {
  return Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS ? slot : null
}

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
    throw new Error('请先登录后再使用服务端存档')
  }
}

export const fetchServerSlots = async (): Promise<(string | null)[]> => {
  await ensureLoggedInContext()
  const res = await fetch('/api/taoyuan/save/slots', {
    credentials: 'include'
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '获取服务端存档列表失败')
  }
  return Array.from({ length: MAX_SLOTS }, (_, slot) => data?.slots?.[slot]?.raw ?? null)
}

export const fetchServerSlotRaw = async (slot: number): Promise<string | null> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const res = await fetch(`/api/taoyuan/save/${safeSlot}`, {
    credentials: 'include'
  })
  const data = await parseJsonSafe(res)
  if (res.status === 404) return null
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '读取服务端存档失败')
  }
  return typeof data.raw === 'string' ? data.raw : null
}

export const saveServerSlotRaw = async (slot: number, raw: string): Promise<void> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const csrfToken = await ensureCurrentCsrfToken()
  const res = await fetch(`/api/taoyuan/save/${safeSlot}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ raw })
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '保存服务端存档失败')
  }
}

export const setServerActiveSlot = async (slot: number): Promise<void> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const csrfToken = await ensureCurrentCsrfToken()
  const res = await fetch('/api/taoyuan/save/active-slot', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ slot: safeSlot })
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '设置当前服务端存档失败')
  }
}

export const deleteServerSlotRaw = async (slot: number): Promise<void> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  const csrfToken = await ensureCurrentCsrfToken()
  const res = await fetch(`/api/taoyuan/save/${safeSlot}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken
    }
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '删除服务端存档失败')
  }
}