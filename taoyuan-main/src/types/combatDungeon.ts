import type {
  EquipmentAccessoryQuality,
  EquipmentAccessorySlotId,
  EquipmentAccessoryTier
} from './equipmentAccessory'

export type CombatDungeonCategory = 'daily' | 'weekly'
export type CombatDungeonDifficulty = 'intro' | 'advanced' | 'deep' | 'normal' | 'sealed'

export type DailyCombatDungeonId =
  | 'daily_rice_night_watch'
  | 'daily_peach_old_path'
  | 'daily_clear_creek_water_wraith'
  | 'daily_wild_hill_beast_path'
  | 'daily_ancestral_lamp'
  | 'daily_foxfire_bamboo'
  | 'daily_frost_well'
  | 'daily_deep_vein_rift'

export type WeeklyCombatDungeonId = 'weekly_mountain_sea_altar'
export type CombatDungeonId = DailyCombatDungeonId | WeeklyCombatDungeonId
export type CombatDungeonRunAttemptKind = 'free' | 'paid'

export type CombatDungeonNodeKind = 'story' | 'combat' | 'elite' | 'boss' | 'checkpoint' | 'final'
export type CombatDungeonRewardKind = 'item' | 'money' | 'accessory' | 'weekly_progress' | 'bestiary' | 'relic'
export type CombatDungeonRewardPoolId =
  | 'night_watch_box'
  | 'peach_talisman_box'
  | 'creek_spirit_box'
  | 'beast_path_box'
  | 'ancestral_lamp_box'
  | 'foxfire_box'
  | 'frost_well_box'
  | 'deep_vein_box'
  | 'mountain_sea_box'

export interface CombatDungeonAssetRefs {
  header: string
  battleBg: string
  eventBg: string
  minions: string[]
  elite: string
  boss: string
  rewardBox: string
}

export interface CombatDungeonMonsterDef {
  id: string
  name: string
  role: 'minion' | 'elite' | 'boss'
  maxHp: number
  attack: number
  defense: number
  critRate?: number
  asset: string
  bestiaryText: string
  weaknessHint: string
  dropHint: string
}

export interface CombatDungeonRewardEntry {
  kind: CombatDungeonRewardKind
  itemId?: string
  quantity?: number
  money?: number
  accessorySlotId?: EquipmentAccessorySlotId
  accessoryTier?: EquipmentAccessoryTier
  accessoryQuality?: EquipmentAccessoryQuality
  weeklyProgress?: number
  relicId?: string
  label: string
}

export interface CombatDungeonRewardRollEntry {
  id: string
  weight: number
  reward: CombatDungeonRewardEntry
  pityTag?: 'daily_accessory' | 'deep_tier3_accessory' | 'weekly_tier3_accessory' | 'weekly_relic'
}

export interface CombatDungeonRewardPoolDef {
  id: CombatDungeonRewardPoolId
  label: string
  entries: CombatDungeonRewardRollEntry[]
  forbiddenItemIds?: string[]
}

export interface CombatDungeonCheckpointDef {
  id: string
  nodeIndex: number
  label: string
  rewards: CombatDungeonRewardEntry[]
}

export interface CombatDungeonNodeDef {
  id: string
  kind: CombatDungeonNodeKind
  label: string
  description: string
  monsterIds?: string[]
  checkpointId?: string
}

export interface CombatDungeonDifficultyDef {
  id: CombatDungeonDifficulty
  label: string
  recommendedStage: 'early' | 'mid' | 'late' | 'endgame'
  recommendedCombatLevel: number
  unlockHint: string
  enemyMultiplier: number
  rewardMultiplier: number
  paidRerunCost: number
}

export interface CombatDungeonDef {
  id: CombatDungeonId
  category: CombatDungeonCategory
  name: string
  shortName: string
  stage: 'early' | 'mid' | 'late' | 'endgame'
  intro: string
  unlockHint: string
  difficulties: CombatDungeonDifficultyDef[]
  nodes: CombatDungeonNodeDef[]
  checkpoints: CombatDungeonCheckpointDef[]
  monsters: CombatDungeonMonsterDef[]
  finalRewardPoolId: CombatDungeonRewardPoolId
  assets: CombatDungeonAssetRefs
}

export interface CombatDungeonAttemptState {
  dayTag: string
  weekTag: string
  freeByDungeon: Partial<Record<CombatDungeonId, number>>
  paidByDungeon: Partial<Record<CombatDungeonId, number>>
}

export interface CombatDungeonPityState {
  dailyNoAccessoryClears: Partial<Record<DailyCombatDungeonId, number>>
  deepVeinNoTier3Clears: number
  weeklyNoTier3Weeks: number
  weeklyNoRelicWeeks: number
}

export interface CombatDungeonWishState {
  weekTag: string
  slotId: EquipmentAccessorySlotId | null
  consumed: boolean
}

export interface CombatDungeonBestiaryEntry {
  monsterId: string
  defeats: number
  unlockedName: boolean
  unlockedWeakness: boolean
  unlockedDropHint: boolean
  unlockedStory: boolean
}

export interface ActiveCombatDungeonRun {
  runId: string
  dungeonId: CombatDungeonId
  difficultyId: CombatDungeonDifficulty
  attemptKind: CombatDungeonRunAttemptKind
  paidRerunCost: number
  startedDayTag: string
  currentNodeIndex: number
  playerHp: number
  monsterHpByNode: Record<string, number>
  claimedCheckpointIds: string[]
  reachedCheckpointIds: string[]
  consumedAttempt: boolean
  finished: boolean
}

export interface CombatDungeonRecentReward {
  id: string
  dayTag: string
  dungeonId: CombatDungeonId
  label: string
  rewards: CombatDungeonRewardEntry[]
}

export interface CombatDungeonSaveData {
  saveVersion: number
  attempts: CombatDungeonAttemptState
  activeRun: ActiveCombatDungeonRun | null
  pity: CombatDungeonPityState
  wish: CombatDungeonWishState
  weeklyProgress: { weekTag: string; value: number; claimedMilestones: number[] }
  mastery: Partial<Record<CombatDungeonId, number>>
  firstClears: Partial<Record<CombatDungeonId, boolean>>
  bestiary: Record<string, CombatDungeonBestiaryEntry>
  recentRewards: CombatDungeonRecentReward[]
}
