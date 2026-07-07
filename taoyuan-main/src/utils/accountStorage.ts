const ACCOUNT_STORAGE_KEY = 'taoyuanxiang_current_account'
const DEFAULT_ACCOUNT_KEY = 'guest'
const DEFAULT_SAVE_MODE = 'server'

let currentAccountKey = DEFAULT_ACCOUNT_KEY
let currentCsrfToken = ''
let currentAccountRefreshPromise: Promise<CurrentAccountContext> | null = null
let currentAccountUser: CurrentAccountUserSummary | null = null

export type SaveMode = 'local' | 'server'

export interface CurrentAccountUserSummary {
  username: string
  display_name?: string
}

export interface CurrentAccountContext {
  accountKey: string
  csrfToken: string
  loggedIn: boolean
  user: CurrentAccountUserSummary | null
}

const sanitizeAccountKey = (value: string | null | undefined): string => {
  const raw = String(value || '').normalize('NFKC').trim()
  if (!raw) return DEFAULT_ACCOUNT_KEY
  if (/^[a-z0-9._-]+$/i.test(raw)) return raw.toLocaleLowerCase('zh-CN')
  return encodeURIComponent(raw.toLocaleLowerCase('zh-CN'))
}

export const getCurrentAccountKey = (): string => {
  return currentAccountKey || DEFAULT_ACCOUNT_KEY
}

export const buildScopedStorageKey = (baseKey: string): string => {
  return `${baseKey}${getCurrentAccountKey()}_`
}

export const buildScopedSingleKey = (baseKey: string): string => {
  return `${baseKey}${getCurrentAccountKey()}`
}

export const getCurrentCsrfToken = (): string => {
  return currentCsrfToken || ''
}

const persistCurrentAccountKey = () => {
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, currentAccountKey)
  } catch {
    /* ignore */
  }
}

const buildCurrentAccountContext = (): CurrentAccountContext => ({
  accountKey: currentAccountKey || DEFAULT_ACCOUNT_KEY,
  csrfToken: currentCsrfToken || '',
  loggedIn: !!currentAccountKey && currentAccountKey !== DEFAULT_ACCOUNT_KEY,
  user: currentAccountUser
})

export const getCurrentAccountUserSnapshot = (): CurrentAccountUserSummary | null => currentAccountUser

export const getStoredSaveMode = (): SaveMode => {
  try {
    const raw = localStorage.getItem(buildScopedSingleKey('taoyuanxiang_save_mode_'))
    if (raw === 'local' || raw === 'server') return raw
    return DEFAULT_SAVE_MODE
  } catch {
    return DEFAULT_SAVE_MODE
  }
}

export const setStoredSaveMode = (mode: SaveMode) => {
  try {
    localStorage.setItem(buildScopedSingleKey('taoyuanxiang_save_mode_'), mode)
  } catch {
    /* ignore */
  }
}

const hasNamespacedSaveData = (prefix: string, maxSlots: number): boolean => {
  for (let i = 0; i < maxSlots; i++) {
    if (localStorage.getItem(`${prefix}${i}`)) return true
  }
  return false
}

export const migrateLegacyScopedSlots = (legacyPrefix: string, scopedPrefix: string, maxSlots: number) => {
  try {
    if (hasNamespacedSaveData(scopedPrefix, maxSlots)) return
    for (let i = 0; i < maxSlots; i++) {
      const legacyValue = localStorage.getItem(`${legacyPrefix}${i}`)
      if (legacyValue && !localStorage.getItem(`${scopedPrefix}${i}`)) {
        localStorage.setItem(`${scopedPrefix}${i}`, legacyValue)
      }
    }
  } catch {
    /* ignore migration errors */
  }
}

export const migrateLegacySingleValue = (legacyKey: string, scopedKey: string) => {
  try {
    const scopedValue = localStorage.getItem(scopedKey)
    if (scopedValue !== null) return
    const legacyValue = localStorage.getItem(legacyKey)
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue)
    }
  } catch {
    /* ignore migration errors */
  }
}

export const clearCurrentAccountContext = () => {
  currentAccountKey = DEFAULT_ACCOUNT_KEY
  currentCsrfToken = ''
  currentAccountUser = null
  persistCurrentAccountKey()
  return buildCurrentAccountContext()
}

export const forceRefreshCurrentAccountContext = async (): Promise<CurrentAccountContext> => {
  if (currentAccountRefreshPromise) return currentAccountRefreshPromise

  currentAccountRefreshPromise = (async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (res.status === 401) {
        return clearCurrentAccountContext()
      }
      if (res.ok && data?.ok) {
        const username = typeof data?.user?.username === 'string' ? data.user.username : ''
        currentAccountKey = sanitizeAccountKey(username)
        currentCsrfToken = typeof data?.csrf_token === 'string' ? data.csrf_token : ''
        currentAccountUser = username
          ? {
              username,
              ...(typeof data?.user?.display_name === 'string' ? { display_name: data.user.display_name } : {})
            }
          : null
        persistCurrentAccountKey()
      } else {
        currentAccountUser = null
      }
      return buildCurrentAccountContext()
    } catch {
      currentAccountUser = null
      return buildCurrentAccountContext()
    }
  })()

  try {
    return await currentAccountRefreshPromise
  } finally {
    currentAccountRefreshPromise = null
  }
}

export const initCurrentAccount = async (): Promise<string> => {
  const context = await forceRefreshCurrentAccountContext()
  return context.accountKey
}

export const ensureCurrentAccount = async (): Promise<string> => {
  if (currentAccountKey && currentAccountKey !== DEFAULT_ACCOUNT_KEY) return currentAccountKey
  return initCurrentAccount()
}

export const ensureCurrentCsrfToken = async (): Promise<string> => {
  if (currentCsrfToken) return currentCsrfToken
  const context = await forceRefreshCurrentAccountContext()
  return context.csrfToken
}

try {
  const cachedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY)
  if (cachedAccount) currentAccountKey = sanitizeAccountKey(cachedAccount)
} catch {
  currentAccountKey = DEFAULT_ACCOUNT_KEY
}
