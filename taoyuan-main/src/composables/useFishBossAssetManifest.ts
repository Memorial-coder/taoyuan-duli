import { ref } from 'vue'

export type FishBossAssetKind = 'asset' | 'fish' | 'mineBoss' | 'regionBoss'
export type FishBossAssetVariant = '01' | '02'
export type FishBossAssetSize = 128 | 256

export interface FishBossAssetManifestVariant {
  128?: string
  256?: string
}

export interface FishBossAssetManifestEntry {
  assetBase: string
  displayName?: string
  kind?: FishBossAssetKind
  fishId?: string
  bossId?: string
  regionId?: string
  floor?: number
  variants: Partial<Record<FishBossAssetVariant, FishBossAssetManifestVariant>>
}

export interface FishBossAssetManifest {
  version: string
  generatedAt?: string
  basePath?: string
  defaultVariant?: FishBossAssetVariant
  sizes?: FishBossAssetSize[]
  byAssetBase?: Record<string, FishBossAssetManifestEntry>
  byName?: Record<string, FishBossAssetManifestEntry>
  byDisplayName?: Record<string, FishBossAssetManifestEntry>
  byFishId?: Record<string, FishBossAssetManifestEntry>
  byMineBossId?: Record<string, FishBossAssetManifestEntry>
  byRegionBossId?: Record<string, FishBossAssetManifestEntry>
}

export interface FishBossAssetLookup {
  kind?: FishBossAssetKind | null
  id?: string | null
  name?: string | null
  assetBase?: string | null
}

const FISH_BOSS_ASSET_ORIGIN = String(import.meta.env.VITE_FISH_BOSS_ASSET_ORIGIN || '').replace(/\/+$/, '')
const FALLBACK_BASE_PATH = '/asset_fish_boss'
const ASSET_CACHE_NAME = 'taoyuan-fish-boss-assets-v1'

const manifest = ref<FishBossAssetManifest | null>(null)
const manifestLoaded = ref(false)
const manifestLoading = ref(false)
const manifestError = ref('')
let loadPromise: Promise<FishBossAssetManifest | null> | null = null

export const resetFishBossAssetManifest = () => {
  manifest.value = null
  manifestLoaded.value = false
  manifestLoading.value = false
  manifestError.value = ''
  loadPromise = null
}

const normalizeVariant = (value: string | null | undefined): FishBossAssetVariant => {
  return value === '02' ? value : '01'
}

const resolveStaticBase = (basePath = FALLBACK_BASE_PATH): string => {
  const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`
  return FISH_BOSS_ASSET_ORIGIN ? `${FISH_BOSS_ASSET_ORIGIN}${normalizedPath}` : normalizedPath
}

const encodeRelativePath = (value: string): string =>
  value
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

const appendVersion = (url: string, version: string): string => {
  if (!version) return url
  const joiner = url.includes('?') ? '&' : '?'
  return `${url}${joiner}v=${encodeURIComponent(version)}`
}

export const loadFishBossAssetManifest = async (): Promise<FishBossAssetManifest | null> => {
  if (manifestLoaded.value) return manifest.value
  if (loadPromise) return loadPromise

  manifestLoading.value = true
  manifestError.value = ''
  loadPromise = (async () => {
    try {
      const url = `${resolveStaticBase(FALLBACK_BASE_PATH)}/fish-boss-asset-manifest.json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`manifest ${res.status}`)
      const data = (await res.json()) as FishBossAssetManifest
      manifest.value = data && typeof data === 'object' ? data : null
      manifestLoaded.value = true
      return manifest.value
    } catch (error) {
      manifestError.value = error instanceof Error ? error.message : 'fish boss asset manifest load failed'
      manifest.value = null
      return null
    } finally {
      manifestLoading.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

export const retryFishBossAssetManifest = async (): Promise<FishBossAssetManifest | null> => {
  manifestLoaded.value = false
  return loadFishBossAssetManifest()
}

export const resolveFishBossAssetEntry = (target: FishBossAssetLookup | null | undefined): FishBossAssetManifestEntry | null => {
  if (!target || !manifest.value) return null
  const id = target.id || ''
  const name = target.name || ''
  const assetBase = target.assetBase || ''

  if (target.kind === 'fish') {
    return manifest.value.byFishId?.[id] ?? manifest.value.byName?.[name] ?? manifest.value.byDisplayName?.[name] ?? null
  }
  if (target.kind === 'mineBoss') {
    return manifest.value.byMineBossId?.[id] ?? manifest.value.byName?.[name] ?? manifest.value.byDisplayName?.[name] ?? null
  }
  if (target.kind === 'regionBoss') {
    return manifest.value.byRegionBossId?.[id] ?? manifest.value.byName?.[name] ?? manifest.value.byDisplayName?.[name] ?? null
  }

  return (
    manifest.value.byAssetBase?.[assetBase] ??
    manifest.value.byName?.[name] ??
    manifest.value.byDisplayName?.[name] ??
    manifest.value.byFishId?.[id] ??
    manifest.value.byMineBossId?.[id] ??
    manifest.value.byRegionBossId?.[id] ??
    null
  )
}

const resolveVariantPath = (
  entry: FishBossAssetManifestEntry,
  requestedVariant: FishBossAssetVariant,
  requestedSize: FishBossAssetSize,
): string => {
  const sizeKey = String(requestedSize) as '128' | '256'
  const variants = entry.variants || {}
  const fallbackVariant = normalizeVariant(manifest.value?.defaultVariant)
  return (
    variants[requestedVariant]?.[sizeKey] ??
    variants[fallbackVariant]?.[sizeKey] ??
    variants['01']?.[sizeKey] ??
    variants[requestedVariant]?.['128'] ??
    variants[fallbackVariant]?.['128'] ??
    variants['01']?.['128'] ??
    ''
  )
}

export const getFishBossAssetUrl = (
  target: FishBossAssetLookup | null | undefined,
  variant: FishBossAssetVariant = '01',
  size: FishBossAssetSize = 128,
): string => {
  const entry = resolveFishBossAssetEntry(target)
  if (!entry || !manifest.value) return ''
  const relativePath = resolveVariantPath(entry, variant, size)
  if (!relativePath) return ''
  const base = resolveStaticBase(manifest.value.basePath || FALLBACK_BASE_PATH)
  return appendVersion(`${base}/${encodeRelativePath(relativePath)}`, manifest.value.version || 'dev')
}

export const warmFishBossAssetCache = (url: string) => {
  if (!url || typeof caches === 'undefined') return
  void (async () => {
    try {
      const cache = await caches.open(ASSET_CACHE_NAME)
      const cached = await cache.match(url)
      if (cached) return
      const res = await fetch(url, { cache: 'force-cache' })
      if (res.ok) await cache.put(url, res.clone())
    } catch {
      /* best-effort browser cache */
    }
  })()
}

export const useFishBossAssetManifest = () => ({
  manifest,
  manifestLoaded,
  manifestLoading,
  manifestError,
  loadFishBossAssetManifest,
  retryFishBossAssetManifest,
  resetFishBossAssetManifest,
  resolveFishBossAssetEntry,
  getFishBossAssetUrl,
})
