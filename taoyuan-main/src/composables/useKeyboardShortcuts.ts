import { onMounted, onUnmounted, ref } from 'vue'
import {
  getKeyboardEventBinding,
  getKeyboardShortcutBindingKey,
  isReservedKeyboardShortcutBinding,
  type KeyboardShortcutActionId,
  type KeyboardShortcutBinding
} from '@/data/keyboardShortcuts'
import { useSettingsStore } from '@/stores/useSettingsStore'

export type KeyboardShortcutAction = {
  id: KeyboardShortcutActionId
  priority?: number
  allowRepeat?: boolean
  repeatConfig?: {
    initialDelayMs?: number
    intervalMs?: number
  }
  canRun?: (event: KeyboardEvent) => boolean
  run: (event: KeyboardEvent) => void
}

const registeredActions = new Map<KeyboardShortcutActionId, Set<KeyboardShortcutAction>>()
const shortcutCaptureActive = ref(false)
let listenerUsers = 0
let repeatTimeout: number | null = null
let activeRepeatBindingKey = ''
let activeRepeatCode = ''
let activeRepeatEventInit: KeyboardEventInit | null = null

const DEFAULT_REPEAT_INITIAL_DELAY_MS = 140
const DEFAULT_REPEAT_INTERVAL_MS = 70

const isEditableShortcutTarget = (target: EventTarget | null): boolean => {
  const element = target instanceof HTMLElement ? target : null
  if (!element) return false
  if (element.isContentEditable) return true
  const tagName = element.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
  return Boolean(element.closest('[contenteditable="true"], input, textarea, select'))
}

const shouldAllowUiCancelBinding = (bindingValue: KeyboardShortcutBinding, bindingKey: string): boolean => {
  if (bindingValue.code !== 'Escape') return false
  return !bindingValue.ctrlKey && !bindingValue.altKey && !bindingValue.shiftKey && !bindingValue.metaKey && bindingKey === 'Escape'
}

const isDesktopShortcutViewport = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
)

const findMatchingAction = (eventBinding: KeyboardShortcutBinding, event: KeyboardEvent) => {
  const settingsStore = useSettingsStore()
  const bindingKey = getKeyboardShortcutBindingKey(eventBinding)
  const actions = [...registeredActions.values()]
    .flatMap(actionSet => [...actionSet])
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))

  for (const action of actions) {
    const configuredBinding = settingsStore.getKeyboardShortcutBinding(action.id)
    if (!configuredBinding || getKeyboardShortcutBindingKey(configuredBinding) !== bindingKey) continue
    if (action.canRun && !action.canRun(event)) continue
    return action
  }

  return null
}

const clearActiveShortcutRepeat = () => {
  if (typeof window !== 'undefined') {
    if (repeatTimeout !== null) window.clearTimeout(repeatTimeout)
  }
  repeatTimeout = null
  activeRepeatBindingKey = ''
  activeRepeatCode = ''
  activeRepeatEventInit = null
}

const getShortcutRepeatInitialDelay = (action: KeyboardShortcutAction) => (
  action.repeatConfig?.initialDelayMs ?? DEFAULT_REPEAT_INITIAL_DELAY_MS
)

const getShortcutRepeatInterval = (action: KeyboardShortcutAction) => (
  action.repeatConfig?.intervalMs ?? DEFAULT_REPEAT_INTERVAL_MS
)

const scheduleActiveShortcutRepeat = (delayMs: number) => {
  if (typeof window === 'undefined' || !activeRepeatBindingKey) return
  repeatTimeout = window.setTimeout(() => {
    repeatTimeout = null
    runActiveShortcutRepeat()
  }, Math.max(0, delayMs))
}

const runActiveShortcutRepeat = () => {
  if (!activeRepeatEventInit) {
    clearActiveShortcutRepeat()
    return
  }
  if (!isDesktopShortcutViewport()) {
    clearActiveShortcutRepeat()
    return
  }

  const settingsStore = useSettingsStore()
  if (!settingsStore.keyboardShortcutsEnabled) {
    clearActiveShortcutRepeat()
    return
  }

  const repeatEvent = new KeyboardEvent('keydown', activeRepeatEventInit)
  const eventBinding = getKeyboardEventBinding(repeatEvent)
  if (!eventBinding || isReservedKeyboardShortcutBinding(eventBinding)) {
    clearActiveShortcutRepeat()
    return
  }

  const action = findMatchingAction(eventBinding, repeatEvent)
  if (!action?.allowRepeat) {
    clearActiveShortcutRepeat()
    return
  }

  action.run(repeatEvent)
  scheduleActiveShortcutRepeat(getShortcutRepeatInterval(action))
}

const startShortcutRepeat = (eventBinding: KeyboardShortcutBinding, event: KeyboardEvent, action: KeyboardShortcutAction) => {
  const bindingKey = getKeyboardShortcutBindingKey(eventBinding)
  if (activeRepeatBindingKey && activeRepeatBindingKey !== bindingKey) {
    clearActiveShortcutRepeat()
  }
  if (activeRepeatBindingKey === bindingKey) return

  activeRepeatBindingKey = bindingKey
  activeRepeatCode = event.code
  activeRepeatEventInit = {
    code: event.code,
    key: event.key,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    repeat: true,
    bubbles: true,
    cancelable: true
  }
  scheduleActiveShortcutRepeat(getShortcutRepeatInitialDelay(action))
}

const handleKeyboardShortcutKeydown = (event: KeyboardEvent) => {
  if (event.defaultPrevented || shortcutCaptureActive.value) return
  if (!isDesktopShortcutViewport() || isEditableShortcutTarget(event.target)) return

  const settingsStore = useSettingsStore()
  if (!settingsStore.keyboardShortcutsEnabled) return

  const eventBinding = getKeyboardEventBinding(event)
  if (!eventBinding) return

  const eventBindingKey = getKeyboardShortcutBindingKey(eventBinding)
  if (isReservedKeyboardShortcutBinding(eventBinding) && !shouldAllowUiCancelBinding(eventBinding, eventBindingKey)) return

  const action = findMatchingAction(eventBinding, event)
  if (!action) return

  event.preventDefault()
  event.stopPropagation()

  if (action.allowRepeat) {
    if (event.repeat) return
    action.run(event)
    startShortcutRepeat(eventBinding, event, action)
    return
  }

  if (event.repeat) return
  action.run(event)
}

const handleKeyboardShortcutKeyup = (event: KeyboardEvent) => {
  if (!activeRepeatCode) return
  if (event.code !== activeRepeatCode) return
  clearActiveShortcutRepeat()
}

const ensureKeyboardShortcutListener = () => {
  listenerUsers += 1
  if (listenerUsers !== 1 || typeof window === 'undefined') return
  window.addEventListener('keydown', handleKeyboardShortcutKeydown, true)
  window.addEventListener('keyup', handleKeyboardShortcutKeyup, true)
  window.addEventListener('blur', clearActiveShortcutRepeat)
  document.addEventListener('visibilitychange', clearActiveShortcutRepeat)
}

const releaseKeyboardShortcutListener = () => {
  listenerUsers = Math.max(0, listenerUsers - 1)
  if (listenerUsers !== 0 || typeof window === 'undefined') return
  clearActiveShortcutRepeat()
  window.removeEventListener('keydown', handleKeyboardShortcutKeydown, true)
  window.removeEventListener('keyup', handleKeyboardShortcutKeyup, true)
  window.removeEventListener('blur', clearActiveShortcutRepeat)
  document.removeEventListener('visibilitychange', clearActiveShortcutRepeat)
}

export const setKeyboardShortcutCaptureActive = (active: boolean) => {
  shortcutCaptureActive.value = active
}

export const useKeyboardShortcutActions = (actions: KeyboardShortcutAction[]) => {
  onMounted(() => {
    for (const action of actions) {
      const actionSet = registeredActions.get(action.id) ?? new Set<KeyboardShortcutAction>()
      actionSet.add(action)
      registeredActions.set(action.id, actionSet)
    }
    ensureKeyboardShortcutListener()
  })

  onUnmounted(() => {
    for (const action of actions) {
      const actionSet = registeredActions.get(action.id)
      if (!actionSet) continue
      actionSet.delete(action)
      if (actionSet.size <= 0) {
        registeredActions.delete(action.id)
      }
    }
    releaseKeyboardShortcutListener()
  })
}
