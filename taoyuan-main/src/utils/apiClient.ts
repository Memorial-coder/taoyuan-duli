import { Capacitor } from '@capacitor/core'

const LOCALHOST_ORIGINS = new Set([
  'http://127.0.0.1',
  'http://localhost',
  'https://127.0.0.1',
  'https://localhost',
])

const normalizeOrigin = (value: string | undefined): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return new URL(raw).origin
  } catch {
    return ''
  }
}

const getWindowOrigin = (): string => {
  if (typeof window === 'undefined') return ''
  try {
    return window.location.origin
  } catch {
    return ''
  }
}

const configuredAndroidApiOrigin = normalizeOrigin(import.meta.env.VITE_ANDROID_API_ORIGIN)
const currentWindowOrigin = getWindowOrigin()
const nativeFetch = globalThis.fetch.bind(globalThis)
let fetchBridgeInstalled = false
const pendingFirstPartyApiGets = new Map<string, {
  promise: Promise<Response>
  servedOriginal: boolean
}>()
const cachedFirstPartyApiGets = new Map<string, {
  expiresAt: number
  response: Response
}>()

const isFirstPartyApiPath = (value: string): boolean => /^\/api(?:\/|\?|$)/.test(value)

const isLocalWebViewOrigin = (origin: string): boolean => {
  if (!origin) return false
  if (LOCALHOST_ORIGINS.has(origin)) return true
  return !!currentWindowOrigin && origin === currentWindowOrigin
}

const shouldUseAndroidApiOrigin = (): boolean =>
  Capacitor.getPlatform() === 'android' && !!configuredAndroidApiOrigin

const resolveApiUrl = (value: string): string => {
  if (!shouldUseAndroidApiOrigin()) return value

  if (isFirstPartyApiPath(value)) {
    return new URL(value, configuredAndroidApiOrigin).toString()
  }

  try {
    const parsed = new URL(value, currentWindowOrigin || undefined)
    if (parsed.pathname.startsWith('/api') && isLocalWebViewOrigin(parsed.origin)) {
      return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, configuredAndroidApiOrigin).toString()
    }
  } catch {
    return value
  }

  return value
}

const shouldForceApiCredentials = (value: string): boolean => {
  if (isFirstPartyApiPath(value)) return true
  try {
    const parsed = new URL(value, currentWindowOrigin || undefined)
    if (!parsed.pathname.startsWith('/api')) return false
    return isLocalWebViewOrigin(parsed.origin) || (!!configuredAndroidApiOrigin && parsed.origin === configuredAndroidApiOrigin)
  } catch {
    return false
  }
}

const withDefaultCredentials = (url: string, init?: RequestInit): RequestInit | undefined => {
  if (!shouldForceApiCredentials(url)) return init
  if (init?.credentials) return init
  return { ...init, credentials: 'include' }
}

const getRequestMethod = (init?: { method?: string }): string => String(init?.method || 'GET').trim().toUpperCase()

const shouldDedupeFirstPartyApiGet = (url: string, init?: RequestInit): boolean => {
  if (!shouldForceApiCredentials(url)) return false
  if (getRequestMethod(init) !== 'GET') return false
  if (init?.body !== undefined && init.body !== null) return false
  if (init?.signal || init?.headers) return false
  if (init?.cache === 'no-store' || init?.cache === 'reload') return false
  return true
}

const getSuccessfulApiGetCacheTtlMs = (url: string): number => {
  try {
    const parsed = new URL(url, currentWindowOrigin || 'http://taoyuan.local')
    const pathname = parsed.pathname
    if (pathname === '/api/me') return 2500
    if (pathname === '/api/public-config') return 5000
    if (pathname === '/api/taoyuan/ai/config') return 5000
    if (pathname === '/api/taoyuan/save/slots') return 1500
    if (/^\/api\/taoyuan\/save\/[0-2]$/.test(pathname)) return 1500
  } catch {
    return 0
  }
  return 0
}

const getFirstPartyApiGetKey = (url: string, init?: RequestInit): string => {
  return `${url}\ncredentials=${String(init?.credentials || '')}`
}

const clearSuccessfulApiGetCache = () => {
  cachedFirstPartyApiGets.clear()
}

const getCachedSuccessfulApiGet = (url: string, init?: RequestInit): Response | null => {
  if (getSuccessfulApiGetCacheTtlMs(url) <= 0) return null
  const key = getFirstPartyApiGetKey(url, init)
  const cached = cachedFirstPartyApiGets.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    cachedFirstPartyApiGets.delete(key)
    return null
  }
  return cached.response.clone()
}

const setCachedSuccessfulApiGet = (url: string, init: RequestInit | undefined, response: Response) => {
  if (!response.ok) return
  const ttlMs = getSuccessfulApiGetCacheTtlMs(url)
  if (ttlMs <= 0) return
  try {
    cachedFirstPartyApiGets.set(getFirstPartyApiGetKey(url, init), {
      expiresAt: Date.now() + ttlMs,
      response: response.clone(),
    })
  } catch {
    cachedFirstPartyApiGets.delete(getFirstPartyApiGetKey(url, init))
  }
}

const fetchDedupedFirstPartyApiGet = (url: string, init?: RequestInit): Promise<Response> => {
  const cached = getCachedSuccessfulApiGet(url, init)
  if (cached) return Promise.resolve(cached)

  const key = getFirstPartyApiGetKey(url, init)
  let entry = pendingFirstPartyApiGets.get(key)

  if (!entry) {
    entry = {
      promise: nativeFetch(url, init).then(response => {
        setCachedSuccessfulApiGet(url, init, response)
        return response
      }),
      servedOriginal: false,
    }
    pendingFirstPartyApiGets.set(key, entry)
    entry.promise.then(
      () => {
        if (pendingFirstPartyApiGets.get(key) === entry) pendingFirstPartyApiGets.delete(key)
      },
      () => {
        if (pendingFirstPartyApiGets.get(key) === entry) pendingFirstPartyApiGets.delete(key)
      },
    )
  }

  return entry.promise.then(response => {
    if (!entry.servedOriginal) {
      entry.servedOriginal = true
      return response
    }
    return response.clone()
  })
}

export const buildApiUrl = (path: string): string => resolveApiUrl(path)

export const getConfiguredAndroidApiOrigin = (): string => configuredAndroidApiOrigin

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof input === 'string' || input instanceof URL) {
    const url = resolveApiUrl(String(input))
    const nextInit = withDefaultCredentials(url, init)
    if (shouldForceApiCredentials(url) && getRequestMethod(nextInit) !== 'GET') {
      clearSuccessfulApiGetCache()
    }
    if (shouldDedupeFirstPartyApiGet(url, nextInit)) {
      return fetchDedupedFirstPartyApiGet(url, nextInit)
    }
    return nativeFetch(url, nextInit)
  }

  if (input instanceof Request) {
    const url = resolveApiUrl(input.url)
    const nextInit = withDefaultCredentials(url, init)
    if (shouldForceApiCredentials(url) && getRequestMethod(nextInit || input) !== 'GET') {
      clearSuccessfulApiGetCache()
    }
    if (url !== input.url || !!nextInit) {
      return nativeFetch(new Request(url, input), nextInit)
    }
  }

  return nativeFetch(input, init)
}

export const installApiFetchBridge = () => {
  if (fetchBridgeInstalled) return
  fetchBridgeInstalled = true

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    return apiFetch(input, init)
  }) as typeof globalThis.fetch
}
