import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router'
import { navigateToPanel } from './useNavigation'
import { showFloat } from './useGameLog'
import type { PromptAction, PromptJumpTarget, PromptPanelKey } from '@/types/promptNavigation'
import type { GuidanceSurfaceId } from '@/types/tutorial'

interface PromptFocusRequest extends PromptJumpTarget {
  token: number
}

interface UsePromptFocusPanelOptions {
  routeMatcher?: () => boolean
  handlers?: Record<string, () => void | Promise<void>>
}

const GAME_ROUTE_PREFIX = '/game/'
const pendingPromptFocus = ref<PromptFocusRequest | null>(null)
const activePromptFocusAttr = ref<string | null>(null)

const GUIDANCE_SURFACE_PROMPT_TARGETS: Partial<Record<GuidanceSurfaceId, PromptJumpTarget>> = {
  wallet: { panelKey: 'wallet', focusKey: 'economy-overview' },
  quest: { panelKey: 'quest', focusKey: 'prompt-hints' },
  breeding: { panelKey: 'breeding' },
  fishpond: { panelKey: 'fishpond' },
  museum: { panelKey: 'museum' },
  guild: { panelKey: 'guild' },
  hanhai: { panelKey: 'hanhai' },
  npc: { panelKey: 'village' },
  shop: { panelKey: 'shop', focusKey: 'recommended-consumption' },
  mail: { panelKey: 'mail' },
  top_goals: { panelKey: 'top_goals', focusKey: 'daily-goals' }
}

const GUIDANCE_ROUTE_PROMPT_TARGETS: Partial<Record<string, PromptJumpTarget>> = {
  ws11_route_budget_to_shop: { panelKey: 'shop', focusKey: 'recommended-consumption' },
  ws11_route_theme_to_quest: { panelKey: 'quest', focusKey: 'prompt-hints' },
  ws11_route_growth_to_breeding: { panelKey: 'breeding' },
  ws11_route_focus_to_museum: { panelKey: 'museum' }
}

let promptFocusToken = 0
let clearActivePromptFocusTimer: ReturnType<typeof setTimeout> | null = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clearPromptFocusHighlight = () => {
  if (clearActivePromptFocusTimer) {
    clearTimeout(clearActivePromptFocusTimer)
    clearActivePromptFocusTimer = null
  }
  activePromptFocusAttr.value = null
}

const markPromptFocusActive = (attr: string) => {
  clearPromptFocusHighlight()
  activePromptFocusAttr.value = attr
  clearActivePromptFocusTimer = setTimeout(() => {
    activePromptFocusAttr.value = null
    clearActivePromptFocusTimer = null
  }, 1800)
}

const isGameRoute = (path: string) => path.startsWith(GAME_ROUTE_PREFIX)

const queuePromptFocus = (target: PromptJumpTarget) => {
  pendingPromptFocus.value = {
    ...target,
    token: ++promptFocusToken
  }
}

export const buildPromptFocusAttr = (panelKey: PromptPanelKey, focusKey: string) => `${panelKey}:${focusKey}`

export const clearPromptFocusRequest = (token?: number) => {
  if (!pendingPromptFocus.value) return
  if (token !== undefined && pendingPromptFocus.value.token !== token) return
  pendingPromptFocus.value = null
}

export const resolveGuidancePromptTarget = (surfaceId: GuidanceSurfaceId, routeId?: string): PromptJumpTarget | null => {
  if (routeId && GUIDANCE_ROUTE_PROMPT_TARGETS[routeId]) {
    return GUIDANCE_ROUTE_PROMPT_TARGETS[routeId] ?? null
  }
  return GUIDANCE_SURFACE_PROMPT_TARGETS[surfaceId] ?? null
}

export const navigateToPromptTarget = (target: PromptJumpTarget) => {
  if (target.disabledReason) {
    showFloat(target.disabledReason, 'danger')
    return false
  }

  if (target.panelKey === 'top_goals') {
    if (!isGameRoute(router.currentRoute.value.path)) {
      showFloat('请先进入游戏后再查看目标规划。', 'danger')
      return false
    }
    queuePromptFocus(target)
    return true
  }

  const currentRouteName = typeof router.currentRoute.value.name === 'string' ? router.currentRoute.value.name : ''
  if (currentRouteName === target.panelKey) {
    if (!target.focusKey) {
      showFloat('当前已在相关页面。', 'accent')
      return true
    }
    queuePromptFocus(target)
    return true
  }

  const navigated = navigateToPanel(target.panelKey)
  if (!navigated) return false

  queuePromptFocus(target)
  return true
}

export const runPromptAction = (action: PromptAction) => navigateToPromptTarget(action)

export const usePromptFocusPanel = (panelKey: PromptPanelKey, options: UsePromptFocusPanelOptions = {}) => {
  const route = useRoute()

  const isPanelAvailable = () => {
    if (options.routeMatcher) return options.routeMatcher()
    return route.name === panelKey
  }

  const scrollElementIntoView = (element: HTMLElement) => {
    element.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }

  const applyPromptFocus = async (request: PromptFocusRequest) => {
    if (!request.focusKey) {
      clearPromptFocusRequest(request.token)
      return
    }

    const handler = options.handlers?.[request.focusKey]
    if (handler) {
      await handler()
    }

    await nextTick()

    requestAnimationFrame(() => {
      const attr = buildPromptFocusAttr(panelKey, request.focusKey!)
      const selector = `[data-prompt-focus="${attr}"]`
      const element = document.querySelector<HTMLElement>(selector)
      clearPromptFocusRequest(request.token)

      if (!element) return

      scrollElementIntoView(element)
      markPromptFocusActive(attr)
    })
  }

  watch(
    () => [isPanelAvailable(), pendingPromptFocus.value?.token],
    () => {
      const request = pendingPromptFocus.value
      if (!request || request.panelKey !== panelKey || !isPanelAvailable()) return
      void applyPromptFocus(request)
    },
    { immediate: true }
  )

  const isPromptFocusActive = (focusKey: string) => activePromptFocusAttr.value === buildPromptFocusAttr(panelKey, focusKey)
  const buildPanelPromptFocusAttr = (focusKey: string) => buildPromptFocusAttr(panelKey, focusKey)

  return {
    buildPromptFocusAttr: buildPanelPromptFocusAttr,
    isPromptFocusActive,
    navigateToPromptTarget,
    runPromptAction
  }
}
