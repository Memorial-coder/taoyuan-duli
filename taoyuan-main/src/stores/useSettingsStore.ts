import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAudio } from '@/composables/useAudio'
import { LATE_GAME_FEATURE_FLAGS, LATE_GAME_FEATURE_FLAG_CONFIG_MAP, createLateGameFeatureFlagState, normalizeLateGameFeatureOverrides } from '@/data/systemFlags'
import { LATE_GAME_BALANCE_CONFIG } from '@/data/balance/lateGameBalance'
import { getThemeByKey, hexToRgb, type ThemeKey } from '@/data/themes'
import { applyQmsgConfig } from '@/composables/useGameLog'
import type { ItemCategory, LateGameBalanceConfig, LateGameBalanceOverride, LateGameFeatureFlag, LateGameFeatureOverrideMap } from '@/types'
import { CROP_USE_TAG_LABELS, type CropUseTag } from '@/data/cropUseProfiles'

export type QmsgPosition = 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
export type QmsgLimitWidthWrap = 'no-wrap' | 'wrap' | 'ellipsis'
export type FarmPlotDisplayMode = 'classic' | 'image'
export type PageWidthMode = 'responsive' | 'custom'
export type DesktopLayoutMode = 'adaptive' | 'classic'

export const DEFAULT_FONT_SIZE = 16
export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 24
export const MIN_PAGE_WIDTH_PERCENT = 60
export const MAX_PAGE_WIDTH_PERCENT = 100
export const PAGE_WIDTH_PERCENT_STEP = 1
export const CROP_USE_TAG_SAVE_VERSION = 1
export const DEFAULT_NPC_PORTRAITS_ENABLED = false
export const DEFAULT_FARM_PLOT_DISPLAY_MODE: FarmPlotDisplayMode = 'classic'
export const DEFAULT_PAGE_WIDTH_MODE: PageWidthMode = 'responsive'
export const DEFAULT_PAGE_WIDTH_PERCENT = 100
export const DEFAULT_DESKTOP_LAYOUT_MODE: DesktopLayoutMode = 'adaptive'
const DEFAULT_THEME: ThemeKey = 'dark'
const DEFAULT_QMSG_POSITION: QmsgPosition = 'top'
const CROP_USE_FILTER_TAGS = Object.keys(CROP_USE_TAG_LABELS) as CropUseTag[]
const CROP_USE_FILTER_TAG_SET = new Set<CropUseTag>(CROP_USE_FILTER_TAGS)

const clampFontSize = (value: number) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)))
const clampPageWidthPercent = (value: number) => Math.min(MAX_PAGE_WIDTH_PERCENT, Math.max(MIN_PAGE_WIDTH_PERCENT, Math.round(value)))

const sanitizeInventoryCropUseFilter = (value: any): CropUseTag[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<CropUseTag>()
  const normalized: CropUseTag[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const tag = entry as CropUseTag
    if (!CROP_USE_FILTER_TAG_SET.has(tag) || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
  }
  return normalized
}

const normalizeCropUseFilterState = (data: any) => {
  const state = data?.cropUseFilterState && typeof data.cropUseFilterState === 'object'
    ? data.cropUseFilterState
    : {}
  const selectedTags = Array.isArray(state.selectedTags)
    ? state.selectedTags
    : data?.inventoryCropUseFilter
  return {
    version: Math.max(1, Math.floor(Number(state.version ?? data?.cropUseTagSaveVersion) || CROP_USE_TAG_SAVE_VERSION)),
    selectedTags: sanitizeInventoryCropUseFilter(selectedTags)
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const fontSize = ref(DEFAULT_FONT_SIZE)
  const theme = ref<ThemeKey>(DEFAULT_THEME)
  const qmsgPosition = ref<QmsgPosition>(DEFAULT_QMSG_POSITION)
  const qmsgTimeout = ref(2500)
  const qmsgMaxNums = ref(5)
  const qmsgIsLimitWidth = ref(true)
  const qmsgLimitWidthNum = ref(200)
  const qmsgLimitWidthWrap = ref<QmsgLimitWidthWrap>('wrap')
  const qmsgAnimation = ref(true)
  const qmsgAutoClose = ref(true)
  const qmsgShowClose = ref(false)
  const qmsgShowIcon = ref(false)
  const qmsgShowReverse = ref(false)
  const npcPortraitsEnabled = ref(DEFAULT_NPC_PORTRAITS_ENABLED)
  const farmPlotDisplayMode = ref<FarmPlotDisplayMode>(DEFAULT_FARM_PLOT_DISPLAY_MODE)
  const pageWidthMode = ref<PageWidthMode>(DEFAULT_PAGE_WIDTH_MODE)
  const pageWidthPercent = ref(DEFAULT_PAGE_WIDTH_PERCENT)
  const desktopLayoutMode = ref<DesktopLayoutMode>(DEFAULT_DESKTOP_LAYOUT_MODE)

  /** 背包物品筛选：选中的分类（空数组 = 显示全部） */
  const inventoryFilter = ref<ItemCategory[]>([])
  /** 背包作物用途筛选：选中的用途标签（空数组 = 不按用途限制） */
  const inventoryCropUseFilter = ref<CropUseTag[]>([])
  const cropUseTagSaveVersion = ref(CROP_USE_TAG_SAVE_VERSION)
  const lateGameFeatureOverrides = ref<LateGameFeatureOverrideMap>({})
  const lateGameFeatureBaselineSaveVersion = ref(Number.MAX_SAFE_INTEGER)
  const lateGameBalanceOverrides = ref<LateGameBalanceOverride>({})

  const applyFontSize = () => {
    fontSize.value = clampFontSize(fontSize.value)
    document.documentElement.style.fontSize = `${fontSize.value}px`
  }

  const applyTheme = () => {
    const t = getThemeByKey(theme.value)
    const root = document.documentElement
    root.setAttribute('data-theme', t.key)
    root.setAttribute('data-theme-tone', t.tone)

    const rgbColorVars = {
      bg: t.bg,
      panel: t.panel,
      text: t.text,
      accent: t.accent,
      danger: t.danger,
      success: t.success,
      warning: t.warning,
      water: t.water,
      earth: t.earth,
      muted: t.muted,
      highlight: t.highlight,
      background: t.bg
    }

    for (const [name, value] of Object.entries(rgbColorVars)) {
      root.style.setProperty(`--color-${name}`, name === 'bg' || name === 'panel' || name === 'text' || name === 'background' ? hexToRgb(value) : value)
      root.style.setProperty(`--color-${name}-rgb`, hexToRgb(value))
    }

    root.style.setProperty('--color-surface-muted', t.surfaceMuted)
    root.style.setProperty('--color-surface-raised', t.surfaceRaised)
    root.style.setProperty('--color-border-subtle', t.borderSubtle)
    root.style.setProperty('--color-border', t.border)
    root.style.setProperty('--color-focus-ring', t.focusRing)
    root.style.setProperty('--color-shadow', t.shadow)
    root.style.setProperty('--color-overlay', t.overlay)
  }

  const applyPageWidth = () => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (!root) return
    pageWidthPercent.value = clampPageWidthPercent(pageWidthPercent.value)
    if (typeof root.setAttribute === 'function') {
      root.setAttribute('data-page-width-mode', pageWidthMode.value)
    } else if (root.dataset) {
      root.dataset.pageWidthMode = pageWidthMode.value
    }
    const activePageWidth = pageWidthMode.value === 'custom'
      ? `${pageWidthPercent.value}vw`
      : '100vw'
    root.style?.setProperty?.('--app-page-width', activePageWidth)
  }

  const applyDesktopLayout = () => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (!root) return
    desktopLayoutMode.value = desktopLayoutMode.value === 'classic' ? 'classic' : DEFAULT_DESKTOP_LAYOUT_MODE
    if (typeof root.setAttribute === 'function') {
      root.setAttribute('data-desktop-layout-mode', desktopLayoutMode.value)
    } else if (root.dataset) {
      root.dataset.desktopLayoutMode = desktopLayoutMode.value
    }
  }

  const changeFontSize = (delta: number) => {
    fontSize.value = clampFontSize(fontSize.value + delta)
    applyFontSize()
  }

  const changeTheme = (key: ThemeKey) => {
    theme.value = key
    applyTheme()
  }

  const setPageWidthMode = (mode: PageWidthMode) => {
    pageWidthMode.value = mode === 'custom' ? 'custom' : DEFAULT_PAGE_WIDTH_MODE
    applyPageWidth()
  }

  const setPageWidthPercent = (value: number) => {
    pageWidthPercent.value = clampPageWidthPercent(value)
    applyPageWidth()
  }

  const changePageWidthPercent = (delta: number) => {
    setPageWidthPercent(pageWidthPercent.value + delta)
  }

  const setDesktopLayoutMode = (mode: DesktopLayoutMode) => {
    desktopLayoutMode.value = mode === 'classic' ? 'classic' : DEFAULT_DESKTOP_LAYOUT_MODE
    applyDesktopLayout()
  }

  const changeQmsgPosition = (pos: QmsgPosition) => {
    qmsgPosition.value = pos
    syncQmsgConfig()
  }

  /** 将当前所有通知设置同步到 Qmsg */
  const syncQmsgConfig = () => {
    applyQmsgConfig({
      position: qmsgPosition.value,
      timeout: qmsgTimeout.value,
      maxNums: qmsgMaxNums.value,
      isLimitWidth: qmsgIsLimitWidth.value,
      limitWidthNum: qmsgLimitWidthNum.value,
      limitWidthWrap: qmsgLimitWidthWrap.value,
      animation: qmsgAnimation.value,
      autoClose: qmsgAutoClose.value,
      showClose: qmsgShowClose.value,
      showIcon: qmsgShowIcon.value,
      showReverse: qmsgShowReverse.value
    })
  }

  const setLateGameFeatureBaselineSaveVersion = (saveVersion?: number) => {
    lateGameFeatureBaselineSaveVersion.value = Number.isFinite(saveVersion)
      ? Number(saveVersion)
      : Number.MAX_SAFE_INTEGER
  }

  const getLateGameFeatureState = () =>
    createLateGameFeatureFlagState(lateGameFeatureBaselineSaveVersion.value, lateGameFeatureOverrides.value)

  const isFeatureEnabled = (flagId: LateGameFeatureFlag) => getLateGameFeatureState()[flagId] ?? false

  const setFeatureOverride = (flagId: LateGameFeatureFlag, enabled: boolean | null | undefined) => {
    if (!import.meta.env.DEV) return

    const next = { ...lateGameFeatureOverrides.value }
    if (enabled === null || enabled === undefined) {
      delete next[flagId]
    } else {
      next[flagId] = enabled
    }
    lateGameFeatureOverrides.value = next
  }

  const clearFeatureOverride = (flagId: LateGameFeatureFlag) => {
    setFeatureOverride(flagId, null)
  }

  const clearAllFeatureOverrides = () => {
    if (!import.meta.env.DEV) return
    lateGameFeatureOverrides.value = {}
  }

  const getFeatureConfig = (flagId: LateGameFeatureFlag) => LATE_GAME_FEATURE_FLAG_CONFIG_MAP[flagId]

  const getLateGameBalanceConfig = (): LateGameBalanceConfig => ({
    ...LATE_GAME_BALANCE_CONFIG,
    ...lateGameBalanceOverrides.value,
    budgetReturnCurves: lateGameBalanceOverrides.value.budgetReturnCurves ?? LATE_GAME_BALANCE_CONFIG.budgetReturnCurves,
    wealthTiers: lateGameBalanceOverrides.value.wealthTiers ?? LATE_GAME_BALANCE_CONFIG.wealthTiers
  })

  const setLateGameBalanceOverrides = (overrides: LateGameBalanceOverride) => {
    if (!import.meta.env.DEV) return
    lateGameBalanceOverrides.value = {
      ...lateGameBalanceOverrides.value,
      ...overrides
    }
  }

  const clearLateGameBalanceOverrides = () => {
    if (!import.meta.env.DEV) return
    lateGameBalanceOverrides.value = {}
  }

  const serialize = () => {
    const { sfxEnabled, bgmEnabled } = useAudio()
    const selectedCropUseTags = sanitizeInventoryCropUseFilter(inventoryCropUseFilter.value)
    return {
      fontSize: fontSize.value,
      sfxEnabled: sfxEnabled.value,
      bgmEnabled: bgmEnabled.value,
      theme: theme.value,
      qmsgPosition: qmsgPosition.value,
      qmsgTimeout: qmsgTimeout.value,
      qmsgMaxNums: qmsgMaxNums.value,
      qmsgIsLimitWidth: qmsgIsLimitWidth.value,
      qmsgLimitWidthNum: qmsgLimitWidthNum.value,
      qmsgLimitWidthWrap: qmsgLimitWidthWrap.value,
      qmsgAnimation: qmsgAnimation.value,
      qmsgAutoClose: qmsgAutoClose.value,
      qmsgShowClose: qmsgShowClose.value,
      qmsgShowIcon: qmsgShowIcon.value,
      qmsgShowReverse: qmsgShowReverse.value,
      npcPortraitsEnabled: npcPortraitsEnabled.value,
      farmPlotDisplayMode: farmPlotDisplayMode.value,
      pageWidthMode: pageWidthMode.value,
      pageWidthPercent: pageWidthPercent.value,
      desktopLayoutMode: desktopLayoutMode.value,
      inventoryFilter: inventoryFilter.value,
      inventoryCropUseFilter: selectedCropUseTags,
      cropUseTagSaveVersion: CROP_USE_TAG_SAVE_VERSION,
      cropUseFilterState: {
        version: CROP_USE_TAG_SAVE_VERSION,
        selectedTags: selectedCropUseTags
      },
      lateGameFeatureOverrides: lateGameFeatureOverrides.value,
      lateGameBalanceOverrides: lateGameBalanceOverrides.value
    }
  }

  const deserialize = (data: any, saveVersion?: number) => {
    setLateGameFeatureBaselineSaveVersion(saveVersion)
    fontSize.value = clampFontSize(data?.fontSize ?? DEFAULT_FONT_SIZE)
    applyFontSize()
    theme.value = data?.theme ?? DEFAULT_THEME
    applyTheme()
    qmsgPosition.value = data?.qmsgPosition ?? DEFAULT_QMSG_POSITION
    qmsgTimeout.value = data?.qmsgTimeout ?? 2500
    qmsgMaxNums.value = data?.qmsgMaxNums ?? 5
    qmsgIsLimitWidth.value = data?.qmsgIsLimitWidth ?? true
    qmsgLimitWidthNum.value = data?.qmsgLimitWidthNum ?? 200
    qmsgLimitWidthWrap.value = data?.qmsgLimitWidthWrap ?? 'wrap'
    qmsgAnimation.value = data?.qmsgAnimation ?? true
    qmsgAutoClose.value = data?.qmsgAutoClose ?? true
    qmsgShowClose.value = data?.qmsgShowClose ?? false
    qmsgShowIcon.value = data?.qmsgShowIcon ?? false
    qmsgShowReverse.value = data?.qmsgShowReverse ?? false
    npcPortraitsEnabled.value = typeof data?.npcPortraitsEnabled === 'boolean'
      ? data.npcPortraitsEnabled
      : DEFAULT_NPC_PORTRAITS_ENABLED
    farmPlotDisplayMode.value = data?.farmPlotDisplayMode === 'image'
      ? 'image'
      : DEFAULT_FARM_PLOT_DISPLAY_MODE
    pageWidthMode.value = data?.pageWidthMode === 'custom'
      ? 'custom'
      : DEFAULT_PAGE_WIDTH_MODE
    pageWidthPercent.value = clampPageWidthPercent(data?.pageWidthPercent ?? DEFAULT_PAGE_WIDTH_PERCENT)
    applyPageWidth()
    desktopLayoutMode.value = data?.desktopLayoutMode === 'classic'
      ? 'classic'
      : DEFAULT_DESKTOP_LAYOUT_MODE
    applyDesktopLayout()
    inventoryFilter.value = data?.inventoryFilter ?? []
    const cropUseFilterState = normalizeCropUseFilterState(data)
    cropUseTagSaveVersion.value = cropUseFilterState.version
    inventoryCropUseFilter.value = cropUseFilterState.selectedTags
    lateGameFeatureOverrides.value = import.meta.env.DEV
      ? normalizeLateGameFeatureOverrides(data?.lateGameFeatureOverrides, lateGameFeatureBaselineSaveVersion.value)
      : {}
    lateGameBalanceOverrides.value = import.meta.env.DEV && data?.lateGameBalanceOverrides && typeof data.lateGameBalanceOverrides === 'object'
      ? data.lateGameBalanceOverrides
      : {}
    syncQmsgConfig()
    const { sfxEnabled, bgmEnabled, startBgm, stopBgm } = useAudio()
    sfxEnabled.value = data?.sfxEnabled ?? true
    bgmEnabled.value = data?.bgmEnabled ?? true
    if (bgmEnabled.value) {
      startBgm()
    } else {
      stopBgm()
    }
  }

  // 初始化时立即同步到 Qmsg，确保新游戏/首次加载也能生效
  syncQmsgConfig()
  applyFontSize()
  applyTheme()
  applyPageWidth()
  applyDesktopLayout()

  return {
    fontSize,
    theme,
    qmsgPosition,
    qmsgTimeout,
    qmsgMaxNums,
    qmsgIsLimitWidth,
    qmsgLimitWidthNum,
    qmsgLimitWidthWrap,
    qmsgAnimation,
    qmsgAutoClose,
    qmsgShowClose,
    qmsgShowIcon,
    qmsgShowReverse,
    npcPortraitsEnabled,
    farmPlotDisplayMode,
    pageWidthMode,
    pageWidthPercent,
    desktopLayoutMode,
    inventoryFilter,
    inventoryCropUseFilter,
    cropUseTagSaveVersion,
    lateGameFeatureOverrides,
    lateGameFeatureBaselineSaveVersion,
    lateGameBalanceOverrides,
    lateGameFeatureConfigs: LATE_GAME_FEATURE_FLAGS,
    changeFontSize,
    changeTheme,
    setPageWidthMode,
    setPageWidthPercent,
    changePageWidthPercent,
    setDesktopLayoutMode,
    changeQmsgPosition,
    syncQmsgConfig,
    setLateGameFeatureBaselineSaveVersion,
    getLateGameFeatureState,
    isFeatureEnabled,
    setFeatureOverride,
    clearFeatureOverride,
    clearAllFeatureOverrides,
    getFeatureConfig,
    getLateGameBalanceConfig,
    setLateGameBalanceOverrides,
    clearLateGameBalanceOverrides,
    applyFontSize,
    applyTheme,
    applyPageWidth,
    applyDesktopLayout,
    serialize,
    deserialize
  }
})
