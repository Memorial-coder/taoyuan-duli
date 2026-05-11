import type { Season, Weather } from './game'

/** 秘密笔记类型 */
export type SecretNoteType = 'tip' | 'treasure' | 'npc' | 'story'
export type SecretNoteCategory = 'gift' | 'treasure' | 'location' | 'rumor' | 'character'
export type SecretNoteSource = 'tree' | 'mining' | 'fishing' | 'digging' | 'monster' | 'resource'

export interface SecretNoteVerificationDef {
  summary: string
  hint: string
  successText: string
  recordText?: string
  readableHint?: string
  requiredSeason?: Season
  requiredWeather?: Weather
  requiredPanel?: 'farm' | 'forage' | 'fishing' | 'mining' | 'village'
  requiredHourMin?: number
  requiredHourMax?: number
  requiredMineFloor?: number
  requiredVillageProjectLevel?: number
  requiredFestivalId?: string
  requiredNpcId?: string
  requiredFriendship?: number
  requiredItemId?: string
  requiredItemCount?: number
  requiredMoney?: number
  readableProjectLevel?: number
  unlockHiddenNpcId?: string
}

/** 秘密笔记定义 */
export interface SecretNoteDef {
  id: number
  type: SecretNoteType
  category?: SecretNoteCategory
  title: string
  content: string
  sourceHints?: SecretNoteSource[]
  /** 是否可使用（宝藏类笔记） */
  usable: boolean
  verification?: SecretNoteVerificationDef
  /** 使用后奖励 */
  reward?: {
    money?: number
    items?: { itemId: string; quantity: number }[]
  }
}
