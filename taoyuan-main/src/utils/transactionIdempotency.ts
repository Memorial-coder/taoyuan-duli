import { buildScopedSingleKey } from '@/utils/accountStorage'

const MAX_STORED_TRANSACTION_KEYS = 120

interface StoredTransactionKey {
  key: string
  createdAt: number
}

const createTransactionIdempotencyKey = (scope: string) => {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
  return `${scope}:${randomPart}`
}

const readStore = (storageKey: string): Record<string, StoredTransactionKey> => {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const writeStore = (storageKey: string, store: Record<string, StoredTransactionKey>) => {
  try {
    const pruned = Object.fromEntries(
      Object.entries(store)
        .filter(([, entry]) => typeof entry?.key === 'string' && entry.key)
        .sort(([, left], [, right]) => Number(right?.createdAt || 0) - Number(left?.createdAt || 0))
        .slice(0, MAX_STORED_TRANSACTION_KEYS)
    )
    localStorage.setItem(storageKey, JSON.stringify(pruned))
  } catch {
    /* ignore */
  }
}

export const getOrCreateTransactionIdempotencyKey = (scope: string, fingerprint: string): string => {
  const storageKey = buildScopedSingleKey(`taoyuanxiang_transaction_idempotency_${scope}_`)
  const normalizedFingerprint = String(fingerprint || '').trim()
  const store = readStore(storageKey)
  const existing = store[normalizedFingerprint]
  if (existing?.key) return existing.key

  const key = createTransactionIdempotencyKey(scope)
  store[normalizedFingerprint] = {
    key,
    createdAt: Date.now()
  }
  writeStore(storageKey, store)
  return key
}

export const clearTransactionIdempotencyKey = (scope: string, fingerprint: string) => {
  const storageKey = buildScopedSingleKey(`taoyuanxiang_transaction_idempotency_${scope}_`)
  const normalizedFingerprint = String(fingerprint || '').trim()
  const store = readStore(storageKey)
  if (!store[normalizedFingerprint]) return
  delete store[normalizedFingerprint]
  writeStore(storageKey, store)
}
