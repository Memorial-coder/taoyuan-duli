import { ref } from 'vue'
import type { CropDef, FarmPlot } from '@/types'
import { warmBrowserAssetCache } from '@/utils/assetWarmCache'

export type CropAssetVariant = '01' | '02'
export type CropAssetSize = 128 | 256
export type CropVisualState =
  | '播种'
  | '发芽'
  | '幼苗'
  | '生长期'
  | '花苞抽穗'
  | '结果结实'
  | '成熟可收获'
  | '已浇水'
  | '已施肥'
  | '缺水'
  | '虫害'
  | '杂草'
  | '枯萎'
  | '深灌水泽'
  | '再生期'
  | '巨型成熟'

export interface CropAssetManifestVariant {
  128?: string
  256?: string
}

export interface CropAssetManifestEntry {
  cropId: string
  name: string
  seedId: string
  deepWatering: boolean
  regrowth: boolean
  giantCropEligible: boolean
  states: Partial<Record<CropVisualState, Partial<Record<CropAssetVariant, CropAssetManifestVariant>>>>
}

export interface CropAssetManifest {
  version: string
  generatedAt?: string
  basePath?: string
  defaultVariant?: CropAssetVariant
  sizes?: CropAssetSize[]
  states?: CropVisualState[]
  byCropId?: Record<string, CropAssetManifestEntry>
  byName?: Record<string, CropAssetManifestEntry>
}

type CropAssetManifestAliasIndex = Record<string, CropAssetManifestEntry | string>
type RawCropAssetManifest = Omit<CropAssetManifest, 'byName'> & {
  byName?: CropAssetManifestAliasIndex
}

export interface CropAssetLookup {
  cropId?: string | null
  cropName?: string | null
  state?: CropVisualState | null
}

const CROP_ASSET_ORIGIN = String(import.meta.env.VITE_CROP_ASSET_ORIGIN || '').replace(/\/+$/, '')
const FALLBACK_BASE_PATH = '/crop'
const ASSET_CACHE_NAME = 'taoyuan-crop-assets-v1'

const manifest = ref<CropAssetManifest | null>(null)
const manifestLoaded = ref(false)
const manifestLoading = ref(false)
const manifestError = ref('')
let loadPromise: Promise<CropAssetManifest | null> | null = null

export const resetCropAssetManifest = () => {
  manifest.value = null
  manifestLoaded.value = false
  manifestLoading.value = false
  manifestError.value = ''
  loadPromise = null
}

const normalizeVariant = (value: string | null | undefined): CropAssetVariant => {
  return value === '02' ? value : '01'
}

const resolveStaticBase = (basePath = FALLBACK_BASE_PATH): string => {
  const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`
  return CROP_ASSET_ORIGIN ? `${CROP_ASSET_ORIGIN}${normalizedPath}` : normalizedPath
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

const isCropAssetManifestEntry = (value: unknown): value is CropAssetManifestEntry =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'states' in value

const hydrateCropAssetAliasIndex = (
  index: CropAssetManifestAliasIndex | undefined,
  primary: Record<string, CropAssetManifestEntry>,
): Record<string, CropAssetManifestEntry> | undefined => {
  if (!index) return undefined
  const hydrated: Record<string, CropAssetManifestEntry> = {}
  for (const [key, value] of Object.entries(index)) {
    const entry = typeof value === 'string' ? primary[value] : value
    if (isCropAssetManifestEntry(entry)) hydrated[key] = entry
  }
  return hydrated
}

const normalizeLoadedCropAssetManifest = (data: unknown): CropAssetManifest | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const raw = data as RawCropAssetManifest
  const byCropId = raw.byCropId || {}
  return {
    ...raw,
    byCropId,
    byName: hydrateCropAssetAliasIndex(raw.byName, byCropId),
  }
}

export const loadCropAssetManifest = async (): Promise<CropAssetManifest | null> => {
  if (manifestLoaded.value) return manifest.value
  if (loadPromise) return loadPromise

  manifestLoading.value = true
  manifestError.value = ''
  loadPromise = (async () => {
    try {
      const url = `${resolveStaticBase(FALLBACK_BASE_PATH)}/crop-asset-manifest.json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`manifest ${res.status}`)
      const data = await res.json()
      manifest.value = normalizeLoadedCropAssetManifest(data)
      manifestLoaded.value = true
      return manifest.value
    } catch (error) {
      manifestError.value = error instanceof Error ? error.message : 'crop asset manifest load failed'
      manifest.value = null
      return null
    } finally {
      manifestLoading.value = false
      loadPromise = null
    }
  })()

  return loadPromise
}

export const retryCropAssetManifest = async (): Promise<CropAssetManifest | null> => {
  manifestLoaded.value = false
  return loadCropAssetManifest()
}

export const resolveCropVisualState = (plot: FarmPlot | null | undefined, crop: CropDef | null | undefined): CropVisualState | null => {
  if (!plot?.cropId || !crop) return null
  const hasActiveCrop = plot.state === 'planted' || plot.state === 'growing' || plot.state === 'harvestable'
  if (plot.infested) return '虫害'
  if (plot.weedy) return '杂草'
  if ((plot.state === 'planted' || plot.state === 'growing') && !plot.watered) return '缺水'
  if (plot.fertilizer) return '已施肥'
  if (hasActiveCrop && plot.watered) return crop.deepWatering ? '深灌水泽' : '已浇水'
  if (plot.state === 'planted') return '播种'
  if (plot.harvestCount > 0 && crop.regrowth && plot.state === 'growing') return '再生期'
  if (plot.state === 'growing') {
    const progress = crop.growthDays > 0 ? plot.growthDays / crop.growthDays : 0
    if (progress < 0.2) return '发芽'
    if (progress < 0.45) return '幼苗'
    if (progress < 0.7) return '生长期'
    if (progress < 0.9) return '花苞抽穗'
    return '结果结实'
  }
  if (plot.state === 'harvestable') return plot.giantCropGroup !== null ? '巨型成熟' : '成熟可收获'
  if (String(plot.state) === 'withered') return '枯萎'
  return null
}

export const resolveCropAssetEntry = (target: CropAssetLookup | null | undefined): CropAssetManifestEntry | null => {
  if (!target || !manifest.value) return null
  const cropId = target.cropId || ''
  const cropName = target.cropName || ''
  return manifest.value.byCropId?.[cropId] ?? manifest.value.byName?.[cropName] ?? null
}

const stateFallbacks: Partial<Record<CropVisualState, CropVisualState[]>> = {
  深灌水泽: ['已浇水', '生长期'],
  再生期: ['生长期', '幼苗'],
  巨型成熟: ['成熟可收获', '结果结实'],
  花苞抽穗: ['生长期', '结果结实'],
  结果结实: ['生长期', '成熟可收获'],
  枯萎: ['缺水', '生长期'],
}

const resolveStateVariants = (
  entry: CropAssetManifestEntry,
  requestedState: CropVisualState,
) => {
  const states = entry.states || {}
  const candidates = [requestedState, ...(stateFallbacks[requestedState] || []), '生长期', '播种'] as CropVisualState[]
  for (const state of candidates) {
    const variants = states[state]
    if (variants) return variants
  }
  return null
}

const resolveVariantPath = (
  entry: CropAssetManifestEntry,
  requestedState: CropVisualState,
  requestedVariant: CropAssetVariant,
  requestedSize: CropAssetSize,
): string => {
  const sizeKey = String(requestedSize) as '128' | '256'
  const variants = resolveStateVariants(entry, requestedState) || {}
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

export const getCropAssetUrl = (
  target: CropAssetLookup | null | undefined,
  variant: CropAssetVariant = '01',
  size: CropAssetSize = 128,
): string => {
  const entry = resolveCropAssetEntry(target)
  const state = target?.state || null
  if (!entry || !manifest.value || !state) return ''
  const relativePath = resolveVariantPath(entry, state, variant, size)
  if (!relativePath) return ''
  const base = resolveStaticBase(manifest.value.basePath || FALLBACK_BASE_PATH)
  return appendVersion(`${base}/${encodeRelativePath(relativePath)}`, manifest.value.version || 'dev')
}

export const warmCropAssetCache = (url: string) => {
  warmBrowserAssetCache(url, { cacheName: ASSET_CACHE_NAME })
}

export const useCropAssetManifest = () => ({
  manifest,
  manifestLoaded,
  manifestLoading,
  manifestError,
  loadCropAssetManifest,
  retryCropAssetManifest,
  resetCropAssetManifest,
  resolveCropVisualState,
  resolveCropAssetEntry,
  getCropAssetUrl,
})
