import { readonly, reactive } from 'vue'
import { apiFetch } from '@/utils/apiClient'
import { ensureCurrentCsrfToken } from '@/utils/accountStorage'
import type { CropAssetVariant } from '@/composables/useCropAssetManifest'

const STORAGE_KEY = 'taoyuanxiang_crop_image_preferences_v1'
const VALID_VARIANTS = new Set<CropAssetVariant>(['01', '02'])

const preferences = reactive<Record<string, CropAssetVariant>>({})
let loaded = false
let loadPromise: Promise<void> | null = null
let saveTimer = 0

const normalizePreferences = (raw: unknown): Record<string, CropAssetVariant> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const normalized: Record<string, CropAssetVariant> = {}
  for (const [cropId, variant] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(cropId || '').trim()
    if (!key || key.length > 120) continue
    if (variant === '01' || variant === '02') normalized[key] = variant
  }
  return normalized
}

const readLocalPreferences = (): Record<string, CropAssetVariant> => {
  try {
    return normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))
  } catch {
    return {}
  }
}

const persistLocalPreferences = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences }))
  } catch {
    /* ignore */
  }
}

const saveServerPreferences = async () => {
  try {
    const csrfToken = await ensureCurrentCsrfToken()
    if (!csrfToken) return
    await apiFetch('/api/taoyuan/crop-image-preferences', {
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

export const loadCropImagePreferences = async () => {
  if (loaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    Object.assign(preferences, readLocalPreferences())
    try {
      const res = await apiFetch('/api/taoyuan/crop-image-preferences')
      if (res.ok) {
        const data = await res.json().catch(() => null)
        Object.assign(preferences, normalizePreferences(data?.preferences))
        persistLocalPreferences()
      }
    } catch {
      /* keep local fallback */
    } finally {
      loaded = true
      loadPromise = null
    }
  })()

  return loadPromise
}

export const getCropImageVariant = (cropId: string | null | undefined): CropAssetVariant => {
  const key = String(cropId || '').trim()
  const variant = key ? preferences[key] : undefined
  return variant && VALID_VARIANTS.has(variant) ? variant : '01'
}

export const setCropImageVariant = (cropId: string | null | undefined, variant: CropAssetVariant) => {
  const key = String(cropId || '').trim()
  if (!key || !VALID_VARIANTS.has(variant)) return
  if (variant === '01') {
    delete preferences[key]
  } else {
    preferences[key] = variant
  }
  persistLocalPreferences()
  scheduleServerSave()
}

export const useCropImagePreferences = () => ({
  preferences: readonly(preferences),
  loadCropImagePreferences,
  getCropImageVariant,
  setCropImageVariant,
})
