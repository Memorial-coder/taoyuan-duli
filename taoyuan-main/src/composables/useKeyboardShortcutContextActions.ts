import type { Ref } from 'vue'
import { useKeyboardShortcutActions, type KeyboardShortcutAction } from './useKeyboardShortcuts'

type MaybeRef<T> = T | Ref<T>

type ContextShortcutOptions = {
  priority?: number
  canRun?: () => boolean
  hasBlockingModal?: () => boolean
  onConfirm?: () => void
  focusSearch?: () => boolean | void
  onPageUp?: () => void
  onPageDown?: () => void
}

type TabShortcutOptions<T extends string> = ContextShortcutOptions & {
  tabs: MaybeRef<readonly T[]>
  current: Ref<T>
}

const getMaybeRefValue = <T>(value: MaybeRef<T>): T => {
  if (value && typeof value === 'object' && 'value' in value) {
    return (value as Ref<T>).value
  }
  return value as T
}

const canRunContextShortcut = (options: ContextShortcutOptions) => (
  (options.canRun?.() ?? true) && !(options.hasBlockingModal?.() ?? false)
)

const moveCurrentValue = <T>(values: readonly T[], current: Ref<T>, delta: number) => {
  if (values.length <= 0) return
  const currentIndex = Math.max(0, values.indexOf(current.value))
  const nextIndex = (currentIndex + delta + values.length) % values.length
  current.value = values[nextIndex]!
}

const appendOptionalContextActions = (
  actions: KeyboardShortcutAction[],
  options: ContextShortcutOptions,
  priority: number
) => {
  if (options.onConfirm) {
    actions.push({
      id: 'uiConfirm',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: options.onConfirm
    })
  }

  if (options.focusSearch) {
    actions.push({
      id: 'uiFocusSearch',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: () => {
        options.focusSearch?.()
      }
    })
  }

  if (options.onPageUp) {
    actions.push({
      id: 'uiPageUp',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: options.onPageUp
    })
  }

  if (options.onPageDown) {
    actions.push({
      id: 'uiPageDown',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: options.onPageDown
    })
  }
}

export const useKeyboardShortcutContextActions = (options: ContextShortcutOptions) => {
  const priority = options.priority ?? 60
  const actions: KeyboardShortcutAction[] = []
  appendOptionalContextActions(actions, options, priority)
  useKeyboardShortcutActions(actions)
}

export const useKeyboardShortcutTabActions = <T extends string>(options: TabShortcutOptions<T>) => {
  const priority = options.priority ?? 60
  const actions: KeyboardShortcutAction[] = [
    {
      id: 'uiPrevSection',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: () => moveCurrentValue(getMaybeRefValue(options.tabs), options.current, -1)
    },
    {
      id: 'uiNextSection',
      priority,
      canRun: () => canRunContextShortcut(options),
      run: () => moveCurrentValue(getMaybeRefValue(options.tabs), options.current, 1)
    }
  ]

  appendOptionalContextActions(actions, options, priority)

  useKeyboardShortcutActions(actions)
}

export const focusFirstSelector = (selectors: MaybeRef<readonly string[]>) => {
  if (typeof document === 'undefined') return false
  for (const selector of getMaybeRefValue(selectors)) {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      element.focus()
      return true
    }
  }
  return false
}

export const scrollByViewport = (direction: -1 | 1) => {
  if (typeof window === 'undefined') return
  window.scrollBy({
    top: Math.max(240, window.innerHeight * 0.78) * direction,
    behavior: 'smooth'
  })
}
