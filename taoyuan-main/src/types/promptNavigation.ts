import type { PanelKey } from '@/composables/useNavigation'

export type PromptPanelKey = PanelKey | 'top_goals'
export type PromptActionMode = 'card' | 'cta'

export interface PromptJumpTarget {
  panelKey: PromptPanelKey
  focusKey?: string
  disabledReason?: string
}

export interface PromptAction extends PromptJumpTarget {
  id: string
  label: string
  mode: PromptActionMode
}
