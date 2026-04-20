import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAudio } from '@/composables/useAudio'
import { LATE_GAME_FEATURE_FLAGS, LATE_GAME_FEATURE_FLAG_CONFIG_MAP, createLateGameFeatureFlagState, normalizeLateGameFeatureOverrides } from '@/data/systemFlags'
import { LATE_GAME_BALANCE_CONFIG } from '@/data/balance/lateGameBalance'
import { getThemeByKey, hexToRgb, type ThemeKey } from '@/data/themes'
import { applyQmsgConfig } from '@/composables/useGameLog'
import type { ItemCategory, LateGameBalanceConfig, LateGameBalanceOverride, LateGameFeatureFlag, LateGameFeatureOverrideMap } from '@/types'

export type QmsgPosition = 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
export type QmsgLimitWidthWrap = 'no-wrap' | 'wrap' | 'ellipsis'

const DEFAULT_FONT_SIZE = 16
const DEFAULT_THEME: ThemeKey = 'dark'
const DEFAULT_QMSG_POSITION: QmsgPosition = 'top'

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

  /** 背包物品筛选：选中的分类（空数组 = 显示全部） */
  const inventoryFilter = ref<ItemCategory[]>([])
  const lateGameFeatureOverrides = ref<LateGameFeatureOverrideMap>({})
  const lateGameFeatureBaselineSaveVersion = ref(Number.MAX_SAFE_INTEGER)
  const lateGameBalanceOverrides = ref<LateGameBalanceOverride>({})

  const applyFontSize = () => {
    document.documentElement.style.fontSize = fontSize.value + 'px'
  }

  const applyTheme = () => {
    const t = getThemeByKey(theme.value)
    document.documentElement.style.setProperty('--color-bg', hexToRgb(t.bg))
    document.documentElement.style.setProperty('--color-panel', hexToRgb(t.panel))
    document.documentElement.style.setProperty('--color-text', hexToRgb(t.text))
  }

  const changeFontSize = (delta: number) => {
    fontSize.value = Math.min(24, Math.max(12, fontSize.value + delta))
    applyFontSize()
  }

  const changeTheme = (key: ThemeKey) => {
    theme.value = key
    applyTheme()
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
      inventoryFilter: inventoryFilter.value,
      lateGameFeatureOverrides: lateGameFeatureOverrides.value,
      lateGameBalanceOverrides: lateGameBalanceOverrides.value
    }
  }

  const deserialize = (data: any, saveVersion?: number) => {
    setLateGameFeatureBaselineSaveVersion(saveVersion)
    fontSize.value = data?.fontSize ?? DEFAULT_FONT_SIZE
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
    inventoryFilter.value = data?.inventoryFilter ?? []
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
    inventoryFilter,
    lateGameFeatureOverrides,
    lateGameFeatureBaselineSaveVersion,
    lateGameBalanceOverrides,
    lateGameFeatureConfigs: LATE_GAME_FEATURE_FLAGS,
    changeFontSize,
    changeTheme,
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
    serialize,
    deserialize
  }
})
