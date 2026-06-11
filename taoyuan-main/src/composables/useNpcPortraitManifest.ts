import { ref } from 'vue'

export type NpcPortraitVariant = '01' | '02' | '03' | '04' | '05'
export type NpcPortraitSize = 128 | 256

export interface NpcPortraitManifestVariant {
  128?: string
  256?: string
}

export interface NpcPortraitManifestEntry {
  assetBase: string
  displayName?: string
  kind?: 'asset' | 'regular' | 'hidden' | 'random'
  npcId?: string
  templateId?: string
  variants: Partial<Record<NpcPortraitVariant, NpcPortraitManifestVariant>>
}

export interface NpcPortraitManifest {
  version: string
  generatedAt?: string
  basePath?: string
  defaultVariant?: NpcPortraitVariant
  sizes?: NpcPortraitSize[]
  byId?: Record<string, NpcPortraitManifestEntry>
  byTemplateId?: Record<string, NpcPortraitManifestEntry>
  byAssetBase?: Record<string, NpcPortraitManifestEntry>
  byName?: Record<string, NpcPortraitManifestEntry>
  byDisplayName?: Record<string, NpcPortraitManifestEntry>
}

export interface NpcPortraitLookup {
  id?: string | null
  name?: string | null
  displayName?: string | null
  templateId?: string | null
  assetBase?: string | null
}

const NPC_PORTRAIT_ORIGIN = String(import.meta.env.VITE_NPC_PORTRAIT_ORIGIN || '').replace(/\/+$/, '')
const FALLBACK_BASE_PATH = '/npc'
const PORTRAIT_CACHE_NAME = 'taoyuan-npc-portraits-v1'

const manifest = ref<NpcPortraitManifest | null>(null)
const manifestLoaded = ref(false)
const manifestLoading = ref(false)
const manifestError = ref('')
let loadPromise: Promise<NpcPortraitManifest | null> | null = null

export const resetNpcPortraitManifest = () => {
  manifest.value = null
  manifestLoaded.value = false
  manifestLoading.value = false
  manifestError.value = ''
  loadPromise = null
}

const normalizeVariant = (value: string | null | undefined): NpcPortraitVariant => {
  return value === '02' || value === '03' || value === '04' || value === '05' ? value : '01'
}

const resolveStaticBase = (basePath = FALLBACK_BASE_PATH): string => {
  const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`
  return NPC_PORTRAIT_ORIGIN ? `${NPC_PORTRAIT_ORIGIN}${normalizedPath}` : normalizedPath
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

export const loadNpcPortraitManifest = async (): Promise<NpcPortraitManifest | null> => {
  if (manifestLoaded.value) return manifest.value
  if (loadPromise) return loadPromise

  manifestLoading.value = true
  manifestError.value = ''
  loadPromise = (async () => {
    try {
      const url = `${resolveStaticBase(FALLBACK_BASE_PATH)}/npc-portrait-manifest.json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`manifest ${res.status}`)
      const data = (await res.json()) as NpcPortraitManifest
      manifest.value = data && typeof data === 'object' ? data : null
      manifestLoaded.value = true
      return manifest.value
    } catch (error) {
      manifestError.value = error instanceof Error ? error.message : 'npc portrait manifest load failed'
      manifest.value = null
      return null
    } finally {
      manifestLoading.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

export const retryNpcPortraitManifest = async (): Promise<NpcPortraitManifest | null> => {
  manifestLoaded.value = false
  return loadNpcPortraitManifest()
}

export const resolveNpcPortraitEntry = (target: NpcPortraitLookup | null | undefined): NpcPortraitManifestEntry | null => {
  if (!target || !manifest.value) return null
  const id = target.id || ''
  const templateId = target.templateId || ''
  const assetBase = target.assetBase || ''
  const name = target.name || ''
  const displayName = target.displayName || ''
  return (
    manifest.value.byId?.[id] ??
    manifest.value.byTemplateId?.[templateId] ??
    manifest.value.byAssetBase?.[assetBase] ??
    manifest.value.byName?.[name] ??
    manifest.value.byDisplayName?.[displayName] ??
    manifest.value.byDisplayName?.[name] ??
    null
  )
}

const resolveVariantPath = (
  entry: NpcPortraitManifestEntry,
  requestedVariant: NpcPortraitVariant,
  requestedSize: NpcPortraitSize,
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

export const getNpcPortraitUrl = (
  target: NpcPortraitLookup | null | undefined,
  variant: NpcPortraitVariant = '01',
  size: NpcPortraitSize = 128,
): string => {
  const entry = resolveNpcPortraitEntry(target)
  if (!entry || !manifest.value) return ''
  const relativePath = resolveVariantPath(entry, variant, size)
  if (!relativePath) return ''
  const base = resolveStaticBase(manifest.value.basePath || FALLBACK_BASE_PATH)
  return appendVersion(`${base}/${encodeRelativePath(relativePath)}`, manifest.value.version || 'dev')
}

export const warmNpcPortraitCache = (url: string) => {
  if (!url || typeof caches === 'undefined') return
  void (async () => {
    try {
      const cache = await caches.open(PORTRAIT_CACHE_NAME)
      const cached = await cache.match(url)
      if (cached) return
      const res = await fetch(url, { cache: 'force-cache' })
      if (res.ok) await cache.put(url, res.clone())
    } catch {
      /* best-effort browser cache */
    }
  })()
}

export const useNpcPortraitManifest = () => ({
  manifest,
  manifestLoaded,
  manifestLoading,
  manifestError,
  loadNpcPortraitManifest,
  retryNpcPortraitManifest,
  resetNpcPortraitManifest,
  resolveNpcPortraitEntry,
  getNpcPortraitUrl,
})
