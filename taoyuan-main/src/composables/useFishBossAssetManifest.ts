import { ref } from 'vue'
import { warmBrowserAssetCache } from '@/utils/assetWarmCache'

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

type FishBossAssetManifestAliasIndex = Record<string, FishBossAssetManifestEntry | string>
type RawFishBossAssetManifest = Omit<
  FishBossAssetManifest,
  'byAssetBase' | 'byName' | 'byDisplayName' | 'byFishId' | 'byMineBossId' | 'byRegionBossId'
> & {
  byAssetBase?: FishBossAssetManifestAliasIndex
  byName?: FishBossAssetManifestAliasIndex
  byDisplayName?: FishBossAssetManifestAliasIndex
  byFishId?: FishBossAssetManifestAliasIndex
  byMineBossId?: FishBossAssetManifestAliasIndex
  byRegionBossId?: FishBossAssetManifestAliasIndex
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

const isFishBossAssetManifestEntry = (value: unknown): value is FishBossAssetManifestEntry =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'variants' in value

const hydrateFishBossAssetAliasIndex = (
  index: FishBossAssetManifestAliasIndex | undefined,
  primary: Record<string, FishBossAssetManifestEntry>,
): Record<string, FishBossAssetManifestEntry> | undefined => {
  if (!index) return undefined
  const hydrated: Record<string, FishBossAssetManifestEntry> = {}
  for (const [key, value] of Object.entries(index)) {
    const entry = typeof value === 'string' ? primary[value] : value
    if (isFishBossAssetManifestEntry(entry)) hydrated[key] = entry
  }
  return hydrated
}

const normalizeLoadedFishBossAssetManifest = (data: unknown): FishBossAssetManifest | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const raw = data as RawFishBossAssetManifest
  const byAssetBase = hydrateFishBossAssetAliasIndex(raw.byAssetBase, {}) || {}
  return {
    ...raw,
    byAssetBase,
    byName: hydrateFishBossAssetAliasIndex(raw.byName, byAssetBase),
    byDisplayName: hydrateFishBossAssetAliasIndex(raw.byDisplayName, byAssetBase),
    byFishId: hydrateFishBossAssetAliasIndex(raw.byFishId, byAssetBase),
    byMineBossId: hydrateFishBossAssetAliasIndex(raw.byMineBossId, byAssetBase),
    byRegionBossId: hydrateFishBossAssetAliasIndex(raw.byRegionBossId, byAssetBase),
  }
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
      const data = await res.json()
      manifest.value = normalizeLoadedFishBossAssetManifest(data)
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
  warmBrowserAssetCache(url, { cacheName: ASSET_CACHE_NAME })
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
