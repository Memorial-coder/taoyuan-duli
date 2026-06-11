const ASSET_CACHE_SW_PATH = '/taoyuan-asset-cache-sw.js'

const canRegisterAssetCacheServiceWorker = () => {
  return (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.isSecureContext
  )
}

export const registerAssetCacheServiceWorker = () => {
  if (!canRegisterAssetCacheServiceWorker()) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(ASSET_CACHE_SW_PATH, { scope: '/' }).catch(() => {
      // Best-effort cache layer; HTTP cache still works if registration fails.
    })
  }, { once: true })
}
