import { readonly, reactive } from 'vue'
import { apiFetch } from '@/utils/apiClient'
import { buildScopedSingleKey, ensureCurrentCsrfToken, migrateLegacySingleValue } from '@/utils/accountStorage'
import type { ItemIconVariant } from '@/composables/useItemIconManifest'

const LEGACY_STORAGE_KEY = 'taoyuanxiang_item_icon_preferences_v1'
const STORAGE_KEY_PREFIX = `${LEGACY_STORAGE_KEY}_`
const VALID_VARIANTS = new Set<ItemIconVariant>(['01', '02', '03'])

const preferences = reactive<Record<string, ItemIconVariant>>({})
let loadedStorageKey = ''
let loadPromise: Promise<void> | null = null
let loadingStorageKey = ''
let saveTimer = 0

const getStorageKey = (): string => {
  const storageKey = buildScopedSingleKey(STORAGE_KEY_PREFIX)
  migrateLegacySingleValue(LEGACY_STORAGE_KEY, storageKey)
  return storageKey
}

const normalizePreferences = (raw: unknown): Record<string, ItemIconVariant> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const normalized: Record<string, ItemIconVariant> = {}
  for (const [itemId, variant] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(itemId || '').trim()
    if (!key || key.length > 120) continue
    if (variant === '01' || variant === '02' || variant === '03') normalized[key] = variant
  }
  return normalized
}

const readLocalPreferences = (): Record<string, ItemIconVariant> => {
  try {
    return normalizePreferences(JSON.parse(localStorage.getItem(getStorageKey()) || '{}'))
  } catch {
    return {}
  }
}

const persistLocalPreferences = () => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify({ ...preferences }))
  } catch {
    /* ignore */
  }
}

const replacePreferences = (next: Record<string, ItemIconVariant>) => {
  for (const key of Object.keys(preferences)) {
    delete preferences[key]
  }
  Object.assign(preferences, next)
}

const ensureLoadedScope = () => {
  const storageKey = getStorageKey()
  if (loadedStorageKey !== storageKey && !loadPromise) {
    replacePreferences(readLocalPreferences())
    loadedStorageKey = storageKey
  }
}

const saveServerPreferences = async () => {
  try {
    const csrfToken = await ensureCurrentCsrfToken()
    if (!csrfToken) return
    await apiFetch('/api/taoyuan/item-icon-preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ preferences: { ...preferences } }),
    })
  } catch {
    /* local preferences remain usable offline or before login */
  }
}

const scheduleServerSave = () => {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = 0
    void saveServerPreferences()
  }, 450)
}

export const loadItemIconPreferences = async () => {
  const storageKey = getStorageKey()
  if (loadedStorageKey === storageKey) return
  if (loadPromise && loadingStorageKey === storageKey) return loadPromise

  loadingStorageKey = storageKey
  loadPromise = (async () => {
    replacePreferences(readLocalPreferences())
    loadedStorageKey = storageKey
    try {
      const res = await apiFetch('/api/taoyuan/item-icon-preferences')
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (getStorageKey() !== storageKey) return
        replacePreferences(normalizePreferences(data?.preferences))
        persistLocalPreferences()
      }
    } catch {
      /* keep local fallback */
    } finally {
      if (loadingStorageKey === storageKey) {
        loadPromise = null
        loadingStorageKey = ''
      }
    }
  })()

  return loadPromise
}

export const getItemIconVariant = (itemId: string | null | undefined): ItemIconVariant => {
  ensureLoadedScope()
  const key = String(itemId || '').trim()
  const variant = key ? preferences[key] : undefined
  return variant && VALID_VARIANTS.has(variant) ? variant : '01'
}

export const setItemIconVariant = (itemId: string | null | undefined, variant: ItemIconVariant) => {
  ensureLoadedScope()
  const key = String(itemId || '').trim()
  if (!key || !VALID_VARIANTS.has(variant)) return
  if (variant === '01') {
    delete preferences[key]
  } else {
    preferences[key] = variant
  }
  persistLocalPreferences()
  scheduleServerSave()
}

export const useItemIconPreferences = () => ({
  preferences: readonly(preferences),
  loadItemIconPreferences,
  getItemIconVariant,
  setItemIconVariant,
})
