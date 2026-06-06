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

interface AddLogOptions {
  category?: GameLogCategory
  tags?: GameLogTag[]
  meta?: GameLogMeta
  silent?: boolean
}

interface LogCaptureContext {
  silent?: boolean
  onLog?: (entry: LogEntry) => void
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
  retry_count?: number
  queued_at?: number
}

interface GameplaySaveContext {
  saveSlot: number | null
  saveMode: 'local' | 'server' | null
}

/** 全部日志历史 */
export const logHistory = ref<LogEntry[]>([])

export const GAME_LOG_HISTORY_LIMIT = 1200
export const GAMEPLAY_LOG_QUEUE_LIMIT = 600
export const GAMEPLAY_LOG_BATCH_SIZE = 50
export const GAMEPLAY_LOG_MAX_RETRIES = 3
const GAMEPLAY_LOG_FLUSH_DELAY_MS = 1500
const GAMEPLAY_LOG_RETRY_BASE_DELAY_MS = 5000
const GAMEPLAY_LOG_RETRY_MAX_DELAY_MS = 60000
const REPEATED_LOG_COLLAPSE_WINDOW_MS = 1200

const gameplayLogQueue: PersistedGameplayLogPayload[] = []
let gameplayLogFlushTimer: ReturnType<typeof setTimeout> | null = null
let gameplayLogFlushInFlight = false
let gameplayLogQueueGeneration = 0
let _gameplaySaveContextGetter: (() => GameplaySaveContext) | null = null
const logCaptureStack: LogCaptureContext[] = []
let lastCollapsedLog: { key: string; updatedAt: number; count: number } | null = null

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

const getActiveLogCaptureContext = (): LogCaptureContext | null => {
  if (logCaptureStack.length <= 0) return null
  return logCaptureStack[logCaptureStack.length - 1] ?? null
}

export const withLogCapture = <T>(context: LogCaptureContext, runner: () => T): T => {
  logCaptureStack.push(context)
  try {
    return runner()
  } finally {
    logCaptureStack.pop()
  }
}

const getCurrentGameplaySaveContext = (): GameplaySaveContext => {
  try {
    return _gameplaySaveContextGetter?.() ?? { saveSlot: null, saveMode: null }
  } catch {
    return { saveSlot: null, saveMode: null }
  }
}

const trimLogHistory = () => {
  const overflow = logHistory.value.length - GAME_LOG_HISTORY_LIMIT
  if (overflow > 0) logHistory.value.splice(0, overflow)
}

const trimGameplayLogQueue = () => {
  const overflow = gameplayLogQueue.length - GAMEPLAY_LOG_QUEUE_LIMIT
  if (overflow > 0) gameplayLogQueue.splice(0, overflow)
}

const clearPendingGameplayLogs = () => {
  gameplayLogQueueGeneration += 1
  gameplayLogQueue.length = 0
  if (gameplayLogFlushTimer) {
    clearTimeout(gameplayLogFlushTimer)
    gameplayLogFlushTimer = null
  }
}

const getGameplayLogRetryDelay = () => {
  const nextRetry = gameplayLogQueue[0]?.retry_count ?? 0
  if (nextRetry <= 0) return GAMEPLAY_LOG_FLUSH_DELAY_MS
  return Math.min(GAMEPLAY_LOG_RETRY_MAX_DELAY_MS, GAMEPLAY_LOG_RETRY_BASE_DELAY_MS * nextRetry)
}

const getLogCollapseKey = (
  msg: string,
  dayLabel: string,
  category: GameLogCategory | 'system',
  tags: GameLogTag[],
  meta: GameLogMeta,
  routeName: string
) => {
  if (tags.length > 0 || Object.keys(meta).length > 0) return ''
  return `${dayLabel}|${category}|${routeName}|${msg}`
}

const scheduleGameplayLogFlush = (delay = GAMEPLAY_LOG_FLUSH_DELAY_MS) => {
  if (typeof window === 'undefined') return
  if (gameplayLogFlushTimer) return
  gameplayLogFlushTimer = window.setTimeout(() => {
    gameplayLogFlushTimer = null
    void flushGameplayLogQueue()
  }, delay)
}

const flushGameplayLogQueue = async () => {
  if (typeof window === 'undefined') return
  if (gameplayLogFlushInFlight || gameplayLogQueue.length === 0) return
  gameplayLogFlushInFlight = true
  const generation = gameplayLogQueueGeneration
  const batch = gameplayLogQueue.splice(0, GAMEPLAY_LOG_BATCH_SIZE)
  try {
    const response = await fetch('/api/taoyuan/logs/gameplay/batch', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: batch }),
    })
    if (!response.ok) throw new Error(`gameplay log flush failed: ${response.status}`)
  } catch {
    if (generation === gameplayLogQueueGeneration) {
      const retryable = batch
        .map(item => ({ ...item, retry_count: (item.retry_count ?? 0) + 1 }))
        .filter(item => (item.retry_count ?? 0) <= GAMEPLAY_LOG_MAX_RETRIES)
      gameplayLogQueue.unshift(...retryable)
      trimGameplayLogQueue()
    }
  } finally {
    gameplayLogFlushInFlight = false
    if (gameplayLogQueue.length > 0) {
      scheduleGameplayLogFlush(getGameplayLogRetryDelay())
    }
  }
}

export const _flushGameplayLogQueueForQa = flushGameplayLogQueue

export const _getGameplayLogDebugState = () => ({
  queueLength: gameplayLogQueue.length,
  historyLength: logHistory.value.length,
  generation: gameplayLogQueueGeneration,
  inFlight: gameplayLogFlushInFlight,
})

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
export const addLog = (msg: string, options: AddLogOptions = {}) => {
  const activeCapture = getActiveLogCaptureContext()
  const shouldSilence = Boolean(options.silent || activeCapture?.silent)
  if (!shouldSilence) {
    Qmsg.info(msg)
  }
  const dayLabel = _dayLabelGetter?.() ?? ''
  const category = options.category || 'system'
  const tags = Array.isArray(options.tags) ? options.tags : []
  const { saveSlot, saveMode } = getCurrentGameplaySaveContext()
  const meta = {
    ...(options.meta || {}),
    ...(saveMode ? { save_mode: saveMode } : {}),
    ...(saveSlot !== null ? { save_slot: saveSlot } : {}),
  }
  const routeName = getCurrentRouteName()
  const collapseKey = activeCapture ? '' : getLogCollapseKey(msg, dayLabel, category, tags, meta, routeName)
  const now = Date.now()
  const shouldCollapse =
    collapseKey &&
    lastCollapsedLog?.key === collapseKey &&
    now - lastCollapsedLog.updatedAt <= REPEATED_LOG_COLLAPSE_WINDOW_MS &&
    logHistory.value.length > 0

  if (shouldCollapse) {
    const repeatCount = (lastCollapsedLog?.count ?? 1) + 1
    lastCollapsedLog = {
      key: collapseKey,
      updatedAt: now,
      count: repeatCount
    }
    const lastEntry = logHistory.value[logHistory.value.length - 1]
    if (lastEntry) lastEntry.meta = { ...(lastEntry.meta || {}), repeat_count: repeatCount }
    const lastQueued = gameplayLogQueue[gameplayLogQueue.length - 1]
    if (lastQueued) {
      lastQueued.meta = { ...(lastQueued.meta || {}), repeat_count: repeatCount }
      lastQueued.queued_at = now
    }
  } else {
    const entry = { msg, dayLabel, category, tags, meta }
    logHistory.value.push(entry)
    trimLogHistory()
    activeCapture?.onLog?.(entry)
    lastCollapsedLog = collapseKey ? { key: collapseKey, updatedAt: now, count: 1 } : null
    gameplayLogQueue.push({
      message: msg,
      day_label: dayLabel,
      category,
      tags,
      meta,
      route_name: routeName,
      username: getCurrentUsernameLabel(),
      save_slot: saveSlot,
      retry_count: 0,
      queued_at: now,
    })
  }
  trimGameplayLogQueue()
  scheduleGameplayLogFlush()
  _perkChecker?.()
}

/** 显示浮动文本反馈（显示为 toast 通知） */
export const showFloat = (text: string, color: FloatColor = 'accent') => {
  const activeCapture = getActiveLogCaptureContext()
  if (activeCapture?.silent) return
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
  clearPendingGameplayLogs()
  lastCollapsedLog = null
}

/** 清空全部日志历史 */
export const clearAllLogs = () => {
  logHistory.value = []
  clearPendingGameplayLogs()
  lastCollapsedLog = null
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
