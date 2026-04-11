/** 秘密笔记类型 */
export type SecretNoteType = 'tip' | 'treasure' | 'npc' | 'story'

/** 秘密笔记定义 */
export interface SecretNoteDef {
  id: number
  type: SecretNoteType
  title: string
  content: string
  /** 是否可使用（宝藏类笔记） */
  usable: boolean
  /** 使用后奖励 */
  reward?: {
    money?: number
    items?: { itemId: string; quantity: number }[]
  }
}
