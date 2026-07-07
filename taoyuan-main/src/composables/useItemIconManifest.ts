import { ref } from 'vue'
import type { ItemDef } from '@/types'
import { warmBrowserAssetCache } from '@/utils/assetWarmCache'

export type ItemIconVariant = '01' | '02' | '03'
export type ItemIconSize = 128 | 256

export interface ItemIconManifestVariant {
  128?: string
  256?: string
}

export interface ItemIconManifestEntry {
  name: string
  displayName?: string
  variants: Partial<Record<ItemIconVariant, ItemIconManifestVariant>>
}

export interface ItemIconManifest {
  version: string
  generatedAt?: string
  basePath?: string
  defaultVariant?: ItemIconVariant
  sizes?: ItemIconSize[]
  byId?: Record<string, ItemIconManifestEntry>
  byName?: Record<string, ItemIconManifestEntry>
  byDisplayName?: Record<string, ItemIconManifestEntry>
}

type ItemIconManifestAliasIndex = Record<string, ItemIconManifestEntry | string>
type RawItemIconManifest = Omit<ItemIconManifest, 'byName' | 'byDisplayName'> & {
  byName?: ItemIconManifestAliasIndex
  byDisplayName?: ItemIconManifestAliasIndex
}

const ITEM_ICON_ORIGIN = String(import.meta.env.VITE_ITEM_ICON_ORIGIN || '').replace(/\/+$/, '')
const FALLBACK_BASE_PATH = '/item'
const ICON_CACHE_NAME = 'taoyuan-item-icons-v1'

const manifest = ref<ItemIconManifest | null>(null)
const manifestLoaded = ref(false)
const manifestLoading = ref(false)
const manifestError = ref('')
let loadPromise: Promise<ItemIconManifest | null> | null = null

export const resetItemIconManifest = () => {
  manifest.value = null
  manifestLoaded.value = false
  manifestLoading.value = false
  manifestError.value = ''
  loadPromise = null
}

const normalizeVariant = (value: string | null | undefined): ItemIconVariant => {
  return value === '02' || value === '03' ? value : '01'
}

const resolveStaticBase = (basePath = FALLBACK_BASE_PATH): string => {
  const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`
  return ITEM_ICON_ORIGIN ? `${ITEM_ICON_ORIGIN}${normalizedPath}` : normalizedPath
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

const isItemIconManifestEntry = (value: unknown): value is ItemIconManifestEntry =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'variants' in value

const hydrateItemIconAliasIndex = (
  index: ItemIconManifestAliasIndex | undefined,
  primary: Record<string, ItemIconManifestEntry>,
): Record<string, ItemIconManifestEntry> | undefined => {
  if (!index) return undefined
  const hydrated: Record<string, ItemIconManifestEntry> = {}
  for (const [key, value] of Object.entries(index)) {
    const entry = typeof value === 'string' ? primary[value] : value
    if (isItemIconManifestEntry(entry)) hydrated[key] = entry
  }
  return hydrated
}

const normalizeLoadedItemIconManifest = (data: unknown): ItemIconManifest | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const raw = data as RawItemIconManifest
  const byId = raw.byId || {}
  return {
    ...raw,
    byId,
    byName: hydrateItemIconAliasIndex(raw.byName, byId),
    byDisplayName: hydrateItemIconAliasIndex(raw.byDisplayName, byId),
  }
}

export const loadItemIconManifest = async (): Promise<ItemIconManifest | null> => {
  if (manifestLoaded.value) return manifest.value
  if (loadPromise) return loadPromise

  manifestLoading.value = true
  manifestError.value = ''
  loadPromise = (async () => {
    try {
      const url = `${resolveStaticBase(FALLBACK_BASE_PATH)}/item-icon-manifest.json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`manifest ${res.status}`)
      const data = await res.json()
      manifest.value = normalizeLoadedItemIconManifest(data)
      manifestLoaded.value = true
      return manifest.value
    } catch (error) {
      manifestError.value = error instanceof Error ? error.message : 'item icon manifest load failed'
      manifest.value = null
      return null
    } finally {
      manifestLoading.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

export const retryItemIconManifest = async (): Promise<ItemIconManifest | null> => {
  manifestLoaded.value = false
  return loadItemIconManifest()
}

export const resolveItemIconEntry = (item: ItemDef | null | undefined): ItemIconManifestEntry | null => {
  if (!item || !manifest.value) return null
  return (
    manifest.value.byId?.[item.id] ??
    manifest.value.byName?.[item.name] ??
    manifest.value.byDisplayName?.[item.name] ??
    null
  )
}

const resolveVariantPath = (
  entry: ItemIconManifestEntry,
  requestedVariant: ItemIconVariant,
  requestedSize: ItemIconSize,
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

export const getItemIconUrl = (
  item: ItemDef | null | undefined,
  variant: ItemIconVariant = '01',
  size: ItemIconSize = 128,
): string => {
  const entry = resolveItemIconEntry(item)
  if (!entry || !manifest.value) return ''
  const relativePath = resolveVariantPath(entry, variant, size)
  if (!relativePath) return ''
  const base = resolveStaticBase(manifest.value.basePath || FALLBACK_BASE_PATH)
  return appendVersion(`${base}/${encodeRelativePath(relativePath)}`, manifest.value.version || 'dev')
}

export const warmItemIconCache = (url: string) => {
  warmBrowserAssetCache(url, { cacheName: ICON_CACHE_NAME })
}

export const useItemIconManifest = () => ({
  manifest,
  manifestLoaded,
  manifestLoading,
  manifestError,
  loadItemIconManifest,
  retryItemIconManifest,
  resetItemIconManifest,
  resolveItemIconEntry,
  getItemIconUrl,
})
