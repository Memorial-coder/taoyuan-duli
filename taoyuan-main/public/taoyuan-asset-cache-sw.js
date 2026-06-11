const CACHE_PREFIX = 'taoyuan-static-assets'
const CACHE_VERSION = 'v1'
const IMAGE_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-images`
const MANIFEST_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-manifests`

const IMAGE_PATH_RE = /^\/(?:item|npc|crop|asset_fish_boss)\/.+\.(?:avif|gif|jpe?g|png|svg|webp)$/i
const MANIFEST_PATH_RE = /^\/(?:item\/item-icon-manifest|npc\/npc-portrait-manifest|crop\/crop-asset-manifest|asset_fish_boss\/fish-boss-asset-manifest)\.json$/i

const isCacheableResponse = response =>
  response && (response.ok || response.type === 'opaque')

const putIfCacheable = async (cache, request, response) => {
  if (!isCacheableResponse(response)) return
  await cache.put(request, response.clone())
}

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  await putIfCacheable(cache, request, response)
  return response
}

const staleWhileRevalidate = async (event, request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then(async response => {
      await putIfCacheable(cache, request, response)
      return response
    })
    .catch(() => null)

  if (cached) {
    event.waitUntil(refresh)
    return cached
  }

  const response = await refresh
  if (response) return response
  return new Response('', { status: 504, statusText: 'Gateway Timeout' })
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith(`${CACHE_PREFIX}-`) && name !== IMAGE_CACHE && name !== MANIFEST_CACHE)
        .map(name => caches.delete(name)),
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (IMAGE_PATH_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  if (MANIFEST_PATH_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request, MANIFEST_CACHE))
  }
})
