import { ref } from 'vue'
import Qmsg from 'qmsg'
import type { GameLogCategory, GameLogMeta, GameLogTag } from '@/types'

export type FloatColor = 'danger' | 'success' | 'accent' | 'water'

export interface QmsgConfigOptions {
  position: string
  timeout: number
  maxNums: number
  isLimitWidth: boolean
  limitWidthNum: number
  limitWidthWrap: 'no-wrap' | 'wrap' | 'ellipsis'
  animation: boolean
  autoClose: boolean
  showClose: boolean
  showIcon: boolean
  showReverse: boolean
}

// 配置 Qmsg 全局样式
Qmsg.config({
  position: 'top',
  showIcon: false,
  maxNums: 5,
  timeout: 2500,
  isHTML: false,
  useShadowRoot: false
})

/** 动态更新 Qmsg 全部通知配置 */
export const applyQmsgConfig = (opts: QmsgConfigOptions) => {
  Qmsg.config({
    isHTML: false,
    position: opts.position as 'top',
    timeout: opts.timeout,
    maxNums: opts.maxNums,
    isLimitWidth: opts.isLimitWidth,
    limitWidthNum: opts.limitWidthNum,
    limitWidthWrap: opts.limitWidthWrap,
    animation: opts.animation,
    autoClose: opts.autoClose,
    showClose: opts.showClose,
    showIcon: opts.showIcon,
    showReverse: opts.showReverse,
    useShadowRoot: false
  })
}

// 天赋检查回调 — 由 useDialogs 注册以避免循环导入
let _perkChecker: (() => void) | null = null

/** 注册天赋检查回调（useDialogs 初始化时调用） */
export const _registerPerkChecker = (fn: () => void) => {
  _perkChecker = fn
}

// === 日志历史记录（前端保留历史；关键日志异步上报到服务端长期保存） ===

export interface LogEntry {
  msg: string
  dayLabel: string
  category?: GameLogCategory
  tags?: GameLogTag[]
  meta?: GameLogMeta
}

interface PersistedGameplayLogPayload {
  message: string
  day_label: string
  category: GameLogCategory | 'system'
  tags: GameLogTag[]
  meta: GameLogMeta
  route_name: string
  username: string
  save_slot?: number | null
}

interface GameplaySaveContext {
  saveSlot: number | null
  saveMode: 'local' | 'server' | null
}

/** 全部日志历史 */
export const logHistory = ref<LogEntry[]>([])

const gameplayLogQueue: PersistedGameplayLogPayload[] = []
let gameplayLogFlushTimer: ReturnType<typeof setTimeout> | null = null
let gameplayLogFlushInFlight = false
let _gameplaySaveContextGetter: (() => GameplaySaveContext) | null = null

const getCurrentRouteName = () => {
  if (typeof window === 'undefined') return ''
  const rawHash = String(window.location.hash || '')
  if (!rawHash.startsWith('#')) return ''
  const normalized = (rawHash.slice(1).split('?')[0] || '').trim()
  return normalized || '/'
}

const getCurrentUsernameLabel = () => {
  if (typeof window === 'undefined') return 'guest'
  try {
    return window.localStorage.getItem('taoyuanxiang_current_account') || 'guest'
  } catch {
    return 'guest'
  }
}

export const _registerGameplaySaveContextGetter = (fn: () => GameplaySaveContext) => {
  _gameplaySaveContextGetter = fn
}

const getCurrentGameplaySaveContext = (): GameplaySaveContext => {
  try {
    return _gameplaySaveContextGetter?.() ?? { saveSlot: null, saveMode: null }
  } catch {
    return { saveSlot: null, saveMode: null }
  }
}

const scheduleGameplayLogFlush = () => {
  if (typeof window === 'undefined') return
  if (gameplayLogFlushTimer) return
  gameplayLogFlushTimer = window.setTimeout(() => {
    gameplayLogFlushTimer = null
    void flushGameplayLogQueue()
  }, 1500)
}

const flushGameplayLogQueue = async () => {
  if (typeof window === 'undefined') return
  if (gameplayLogFlushInFlight || gameplayLogQueue.length === 0) return
  gameplayLogFlushInFlight = true
  const batch = gameplayLogQueue.splice(0, 50)
  try {
    await fetch('/api/taoyuan/logs/gameplay/batch', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: batch }),
    })
  } catch {
    gameplayLogQueue.unshift(...batch)
  } finally {
    gameplayLogFlushInFlight = false
    if (gameplayLogQueue.length > 0) {
      scheduleGameplayLogFlush()
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (gameplayLogQueue.length === 0) return
    const payload = JSON.stringify({ logs: gameplayLogQueue.slice(0, 50) })
    try {
      navigator.sendBeacon('/api/taoyuan/logs/gameplay/batch', new Blob([payload], { type: 'application/json' }))
      gameplayLogQueue.length = 0
    } catch {
      // ignore unload send failures
    }
  })
}

/** 天数标签获取器 — 由 GameLayout 注册以避免循环导入 */
let _dayLabelGetter: (() => string) | null = null

/** 注册天数标签获取器（GameLayout 初始化时调用） */
export const _registerDayLabelGetter = (fn: () => string) => {
  _dayLabelGetter = fn
}

/** 添加日志消息（显示为 toast 通知，同时记录到历史） */
export const addLog = (msg: string, options: { category?: GameLogCategory; tags?: GameLogTag[]; meta?: GameLogMeta } = {}) => {
  Qmsg.info(msg)
  const dayLabel = _dayLabelGetter?.() ?? ''
  const category = options.category || 'system'
  const tags = Array.isArray(options.tags) ? options.tags : []
  const { saveSlot, saveMode } = getCurrentGameplaySaveContext()
  const meta = {
    ...(options.meta || {}),
    ...(saveMode ? { save_mode: saveMode } : {}),
    ...(saveSlot !== null ? { save_slot: saveSlot } : {}),
  }
  logHistory.value.push({ msg, dayLabel, category, tags, meta })
  gameplayLogQueue.push({
    message: msg,
    day_label: dayLabel,
    category,
    tags,
    meta,
    route_name: getCurrentRouteName(),
    username: getCurrentUsernameLabel(),
    save_slot: saveSlot,
  })
  scheduleGameplayLogFlush()
  _perkChecker?.()
}

/** 显示浮动文本反馈（显示为 toast 通知） */
export const showFloat = (text: string, color: FloatColor = 'accent') => {
  switch (color) {
    case 'danger':
      Qmsg.error(text, { timeout: 1500 })
      break
    case 'success':
      Qmsg.success(text, { timeout: 1500 })
      break
    case 'accent':
      Qmsg.warning(text, { timeout: 1500 })
      break
    case 'water':
      Qmsg.info(text, { timeout: 1500 })
      break
  }
}

/** 重置日志（新游戏） */
export const resetLogs = () => {
  Qmsg.closeAll()
  logHistory.value = []
}

/** 清空全部日志历史 */
export const clearAllLogs = () => {
  logHistory.value = []
}

/** 清空指定天的日志 */
export const clearDayLogs = (dayLabel: string) => {
  logHistory.value = logHistory.value.filter(e => e.dayLabel !== dayLabel)
}

export const useGameLog = () => {
  return {
    addLog,
    showFloat,
    resetLogs,
    clearAllLogs,
    clearDayLogs,
    logHistory
  }
}
