import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const serviceWorkerSource = read('public/taoyuan-asset-cache-sw.js')
const registrationSource = read('src/utils/assetCacheServiceWorker.ts')
const mainSource = read('src/main.ts')

assert.match(serviceWorkerSource, /IMAGE_PATH_RE/, 'service worker must define image cache route matcher')
assert.match(serviceWorkerSource, /item\|npc\|crop\|asset_fish_boss/, 'service worker must cover packaged image asset routes')
assert.match(serviceWorkerSource, /cacheFirst/, 'packaged image assets must use cache-first handling')
assert.match(serviceWorkerSource, /staleWhileRevalidate/, 'asset manifests must use stale-while-revalidate handling')
assert.match(serviceWorkerSource, /fish-boss-asset-manifest/, 'fish boss manifest must be cached')

assert.match(registrationSource, /navigator\.serviceWorker\.register/, 'asset cache service worker must be registered')
assert.match(registrationSource, /import\.meta\.env\.PROD/, 'service worker registration must be production-only')
assert.match(mainSource, /registerAssetCacheServiceWorker\(\)/, 'app bootstrap must install the asset cache service worker')

const manifestLoaders = [
  'src/composables/useItemIconManifest.ts',
  'src/composables/useNpcPortraitManifest.ts',
  'src/composables/useCropAssetManifest.ts',
  'src/composables/useFishBossAssetManifest.ts',
]

for (const relativePath of manifestLoaders) {
  const source = read(relativePath)
  assert.doesNotMatch(source, /cache:\s*['"]no-store['"]/, `${relativePath} must not bypass browser cache`)
}

console.log('static asset browser cache QA passed')
