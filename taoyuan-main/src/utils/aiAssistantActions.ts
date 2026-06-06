import type { AiAssistantActionSuggestion, AiAssistantStructuredAction } from '@/types'

export const AI_ASSISTANT_SAFE_ACTION_TYPES = new Set([
  'navigate',
  'open_page',
  'open_mail',
  'open_activity',
  'open_quest',
  'copy_checklist',
  'expand_page',
  'mark_goal',
])

export const AI_ASSISTANT_ROUTE_FALLBACKS: Record<string, string> = {
  navigate: 'quest',
  open_page: 'quest',
  open_mail: 'mail',
  open_activity: 'festival',
  open_quest: 'quest',
  expand_page: 'quest',
}

export const AI_ASSISTANT_ALLOWED_ROUTE_NAMES = new Set([
  'menu',
  'hall',
  'farm',
  'animal',
  'home',
  'cottage',
  'village',
  'npc',
  'online',
  'online-manor',
  'online-cohabitation',
  'online-neighbor',
  'online-orders',
  'online-festival',
  'online-society',
  'expedition-room',
  'friend-station',
  'manor',
  'festival',
  'expedition',
  'society',
  'village-projects',
  'shop',
  'forage',
  'fishing',
  'mining',
  'cooking',
  'workshop',
  'processing',
  'upgrade',
  'inventory',
  'skills',
  'achievement',
  'glossary',
  'wallet',
  'quest',
  'mail',
  'charinfo',
  'breeding',
  'museum',
  'guild',
  'hanhai',
  'region-map',
  'fishpond',
  'decoration',
])

export const normalizeAiAssistantActionType = (type: unknown) => {
  const normalized = String(type || '').trim()
  return AI_ASSISTANT_SAFE_ACTION_TYPES.has(normalized) ? normalized : ''
}

export const resolveAiAssistantActionRouteName = (action?: Partial<AiAssistantStructuredAction> | null, routeName = '') => {
  const type = normalizeAiAssistantActionType(action?.type)
  if (!type) return ''
  const candidates = [
    action?.target,
    routeName,
    AI_ASSISTANT_ROUTE_FALLBACKS[type],
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)

  return candidates.find(item => AI_ASSISTANT_ALLOWED_ROUTE_NAMES.has(item)) || ''
}

export const buildAiAssistantCopyText = (suggestion: Pick<AiAssistantActionSuggestion, 'title' | 'action'>) => {
  const action = suggestion.action
  const items = Array.isArray(action.items)
    ? action.items.map(item => String(item || '').trim()).filter(Boolean)
    : []
  if (items.length > 0) return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
  return String(action.value || '').trim()
}

export const isAiAssistantExecutableAction = (suggestion?: Pick<AiAssistantActionSuggestion, 'action'> | null) => {
  const action = suggestion?.action
  if (!action) return false
  const type = normalizeAiAssistantActionType(action.type)
  if (!type) return false
  if (type === 'copy_checklist') return buildAiAssistantCopyText(suggestion as AiAssistantActionSuggestion).length > 0
  if (type === 'mark_goal') return Boolean(String(action.value || action.label || '').trim())
  return Boolean(resolveAiAssistantActionRouteName(action))
}

export const getAiAssistantActionButtonLabel = (suggestion: Pick<AiAssistantActionSuggestion, 'action'>) => {
  const action = suggestion.action
  const type = normalizeAiAssistantActionType(action.type)
  if (type === 'copy_checklist') return action.label || '复制清单'
  if (type === 'mark_goal') return action.label || '标记目标'
  if (type === 'open_mail') return action.label || '打开邮箱'
  if (type === 'open_activity') return action.label || '打开活动'
  if (type === 'open_quest') return action.label || '打开任务页'
  if (type === 'expand_page') return action.label || '展开页面'
  return action.label || '打开页面'
}
