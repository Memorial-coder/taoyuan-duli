import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson, isProtectedApiError } from '@/utils/protectedApi'

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

export interface ServerSaveSlotEntry {
  slot: number
  raw: string | null
  revision: number
}

export const fetchServerSlotEntries = async (): Promise<ServerSaveSlotEntry[]> => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson(() => fetch('/api/taoyuan/save/slots', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取服务端存档列表失败',
    networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
  })
  return Array.from({ length: MAX_SLOTS }, (_, slot) => {
    const entry = Array.isArray(data?.slots) ? data.slots[slot] : null
    return {
      slot,
      raw: typeof entry?.raw === 'string' && entry.raw ? entry.raw : null,
      revision: Number.isFinite(Number(entry?.revision)) ? Math.max(0, Math.floor(Number(entry.revision))) : 0
    }
  })
}

export interface ServerSaveSlotRaw {
  raw: string
  revision: number
}

export const fetchServerSlotRaw = async (slot: number): Promise<ServerSaveSlotRaw | null> => {
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
  if (typeof data?.raw !== 'string' || !data.raw) return null
  return {
    raw: data.raw,
    revision: Number.isFinite(Number(data?.revision ?? data?.current_revision))
      ? Math.max(0, Math.floor(Number(data?.revision ?? data?.current_revision)))
      : 0
  }
}

export interface SaveServerSlotRawResult {
  stale: boolean
  currentRevision: number
  raw: string | null
  fieldRepair: ServerSaveFieldRepairSummary | null
}

export interface ServerSaveFieldAnomaly {
  id?: string
  action?: string
  field_path?: string
  observed_value?: unknown
  normalized_value?: unknown
  limit?: unknown
  severity?: string
  detected_at?: string
  required_operation?: string
}

export interface ServerSaveFieldRepairSummary {
  repaired?: boolean
  anomaly_count?: number
  repaired_count?: number
  anomalies?: ServerSaveFieldAnomaly[]
}

export interface SaveServerSlotRawOptions {
  repairFieldAnomalies?: boolean
}

export const saveServerSlotRaw = async (
  slot: number,
  raw: string,
  baseRevision: number,
  options: SaveServerSlotRawOptions = {}
): Promise<SaveServerSlotRawResult> => {
  const safeSlot = normalizeSlot(slot)
  if (safeSlot === null) throw new Error('无效的存档槽位')
  await ensureLoggedInContext()
  let data: any
  try {
    const result = await fetchProtectedJson(async () => {
      const csrfToken = await ensureCurrentCsrfToken()
      return fetch(`/api/taoyuan/save/${safeSlot}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          raw,
          base_revision: Math.max(0, Math.floor(Number(baseRevision) || 0)),
          ...(options.repairFieldAnomalies ? { repair_field_anomalies: true } : {})
        })
      })
    }, {
      fallbackMessage: '保存服务端存档失败',
      networkErrorMessage: '服务端存档连接失败，请检查网络或稍后重试'
    })
    data = result.data
  } catch (error) {
    if (isProtectedApiError(error) && error.status === 409 && (error.data as any)?.stale === true) {
      const payload = error.data as any
      return {
        stale: true,
        currentRevision: Number.isFinite(Number(payload?.current_revision ?? payload?.revision))
          ? Math.max(0, Math.floor(Number(payload?.current_revision ?? payload?.revision)))
          : Math.max(0, Math.floor(Number(baseRevision) || 0)),
        raw: typeof payload?.raw === 'string' && payload.raw ? payload.raw : null,
        fieldRepair: null
      }
    }
    throw error
  }
  return {
    stale: data?.stale === true,
    currentRevision: Number.isFinite(Number(data?.current_revision ?? data?.revision))
      ? Math.max(0, Math.floor(Number(data?.current_revision ?? data?.revision)))
      : Math.max(0, Math.floor(Number(baseRevision) || 0)),
    raw: typeof data?.raw === 'string' && data.raw ? data.raw : null,
    fieldRepair: data?.field_repair && typeof data.field_repair === 'object'
      ? data.field_repair as ServerSaveFieldRepairSummary
      : null
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
