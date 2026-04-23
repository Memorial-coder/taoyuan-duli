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

export const buildApiUrl = (path: string): string => resolveApiUrl(path)

export const getConfiguredAndroidApiOrigin = (): string => configuredAndroidApiOrigin

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof input === 'string' || input instanceof URL) {
    const url = resolveApiUrl(String(input))
    return nativeFetch(url, withDefaultCredentials(url, init))
  }

  if (input instanceof Request) {
    const url = resolveApiUrl(input.url)
    const nextInit = withDefaultCredentials(url, init)
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
