export interface DialoguePlaceholderContext {
  playerName?: string | null
  honorific?: string | null
}

export const formatDialoguePlaceholders = (text: string, context: DialoguePlaceholderContext = {}): string => {
  const playerName = context.playerName?.trim() || '你'
  const honorific = context.honorific?.trim() || playerName
  return text.replace(/\{player\}/g, playerName).replace(/\{title\}/g, honorific)
}
