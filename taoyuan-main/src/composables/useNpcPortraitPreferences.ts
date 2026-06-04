import { readonly, reactive } from 'vue'
import { apiFetch } from '@/utils/apiClient'
import { ensureCurrentCsrfToken } from '@/utils/accountStorage'
import type { NpcPortraitLookup, NpcPortraitVariant } from '@/composables/useNpcPortraitManifest'

const STORAGE_KEY = 'taoyuanxiang_npc_portrait_preferences_v1'
const VALID_VARIANTS = new Set<NpcPortraitVariant>(['01', '02', '03', '04', '05'])

const preferences = reactive<Record<string, NpcPortraitVariant>>({})
let loaded = false
let loadPromise: Promise<void> | null = null
let saveTimer = 0

export type NpcPortraitPreferenceTarget = NpcPortraitLookup | string | null | undefined

export const getNpcPortraitPreferenceKey = (target: NpcPortraitPreferenceTarget): string => {
  if (typeof target === 'string') return target.trim()
  if (!target) return ''
  return String(
    target.id ||
    target.templateId ||
    target.assetBase ||
    target.name ||
    target.displayName ||
    '',
  ).trim()
}

const normalizePreferences = (raw: unknown): Record<string, NpcPortraitVariant> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const normalized: Record<string, NpcPortraitVariant> = {}
  for (const [npcKey, variant] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(npcKey || '').trim()
    if (!key || key.length > 180) continue
    if (variant === '01' || variant === '02' || variant === '03' || variant === '04' || variant === '05') {
      normalized[key] = variant
    }
  }
  return normalized
}

const readLocalPreferences = (): Record<string, NpcPortraitVariant> => {
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
    await apiFetch('/api/taoyuan/npc-portrait-preferences', {
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

export const loadNpcPortraitPreferences = async () => {
  if (loaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    Object.assign(preferences, readLocalPreferences())
    try {
      const res = await apiFetch('/api/taoyuan/npc-portrait-preferences')
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

export const getNpcPortraitVariant = (target: NpcPortraitPreferenceTarget): NpcPortraitVariant => {
  const key = getNpcPortraitPreferenceKey(target)
  const variant = key ? preferences[key] : undefined
  return variant && VALID_VARIANTS.has(variant) ? variant : '01'
}

export const setNpcPortraitVariant = (target: NpcPortraitPreferenceTarget, variant: NpcPortraitVariant) => {
  const key = getNpcPortraitPreferenceKey(target)
  if (!key || !VALID_VARIANTS.has(variant)) return
  if (variant === '01') {
    delete preferences[key]
  } else {
    preferences[key] = variant
  }
  persistLocalPreferences()
  scheduleServerSave()
}

export const useNpcPortraitPreferences = () => ({
  preferences: readonly(preferences),
  loadNpcPortraitPreferences,
  getNpcPortraitVariant,
  setNpcPortraitVariant,
})
