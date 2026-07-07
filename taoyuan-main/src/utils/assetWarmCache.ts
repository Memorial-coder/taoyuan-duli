type WarmCacheState = {
  cachePromise: Promise<Cache> | null
  warmedUrls: Set<string>
  warmingUrls: Set<string>
}

const warmCacheStates = new Map<string, WarmCacheState>()

const getWarmCacheState = (cacheName: string): WarmCacheState => {
  let state = warmCacheStates.get(cacheName)
  if (!state) {
    state = {
      cachePromise: null,
      warmedUrls: new Set(),
      warmingUrls: new Set(),
    }
    warmCacheStates.set(cacheName, state)
  }
  return state
}

const trimSet = (values: Set<string>, maxSize: number) => {
  while (values.size > maxSize) {
    const firstValue = values.values().next().value
    if (!firstValue) return
    values.delete(firstValue)
  }
}

const scheduleWarm = (callback: () => void, delayMs: number) => {
  if (typeof window === 'undefined') {
    callback()
    return
  }
  window.setTimeout(callback, delayMs)
}

const openWarmCache = (state: WarmCacheState, cacheName: string): Promise<Cache> => {
  if (!state.cachePromise) {
    state.cachePromise = caches.open(cacheName).catch(error => {
      state.cachePromise = null
      throw error
    })
  }
  return state.cachePromise
}

export const warmBrowserAssetCache = (
  url: string,
  options: {
    cacheName: string
    maxUrls?: number
    delayMs?: number
  },
) => {
  if (!url || typeof caches === 'undefined') return
  const cacheName = options.cacheName
  if (!cacheName) return

  const state = getWarmCacheState(cacheName)
  if (state.warmedUrls.has(url) || state.warmingUrls.has(url)) return

  state.warmingUrls.add(url)
  scheduleWarm(() => {
    void (async () => {
      try {
        const cache = await openWarmCache(state, cacheName)
        const cached = await cache.match(url)
        if (!cached) {
          const res = await fetch(url, { cache: 'force-cache' })
          if (res.ok) await cache.put(url, res.clone())
        }
        state.warmedUrls.add(url)
        trimSet(state.warmedUrls, Math.max(50, options.maxUrls || 1000))
      } catch {
        /* best-effort browser cache */
      } finally {
        state.warmingUrls.delete(url)
      }
    })()
  }, Math.max(0, options.delayMs ?? 120))
}
