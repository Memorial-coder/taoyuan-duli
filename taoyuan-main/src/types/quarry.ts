import type { SkillType } from './skill'

export type QuarryResourceKind = 'rock' | 'ore' | 'gem' | 'wood' | 'deep'
export type QuarryCellKind = QuarryResourceKind | 'treasure' | 'artifact' | 'monster' | 'empty'
export type QuarryCellState = QuarryCellKind | 'surface'
export type QuarryMineNodeKind = 'ore' | 'monster' | 'chest' | 'final'
export type QuarryMineNodeState = 'available' | 'cleared'
export type QuarryMineExploreMode = 'steady' | 'force' | 'search'

export interface QuarryMonsterDef {
  id: string
  name: string
  hp: number
  attack: number
  defense: number
  expReward: number
  drops: { itemId: string; chance: number }[]
  nightHpBonus: number
  nightAttackBonus: number
  description: string
}

export interface QuarryExpansionMaterialCost {
  itemId: string
  quantity: number
}

export interface QuarryExpansionCost {
  targetSize: number
  money: number
  materialCosts: QuarryExpansionMaterialCost[]
  requiredCleared: number
  requiredDeepClears: number
}

export interface QuarryCell {
  index: number
  state: QuarryCellState
  resourceId?: string
  kind?: QuarryCellKind
  isActiveSite?: boolean
  itemId?: string
  quantity?: number
  revealed?: boolean
  damage?: number
  monsterId?: string
  monsterHp?: number
  monsterMaxHp?: number
  treasureItems?: { itemId: string; quantity: number }[]
}

export interface QuarryMineNode {
  index: number
  kind: QuarryMineNodeKind
  state: QuarryMineNodeState
  label: string
  itemId?: string
  quantity?: number
  monsterId?: string
  treasureItems?: { itemId: string; quantity: number }[]
}

export interface QuarryMineSaveData {
  unlocked: boolean
  entered: boolean
  completed: boolean
  finalRewardClaimed: boolean
  lastRunDayTag: string
  lastCompletedDayTag: string
  lastResetDayTag: string
  runId: number
  nodes: QuarryMineNode[]
}

export interface QuarryWeeklyProgress {
  weekKey: string
  clearedCount: number
  claimedMilestoneKeys: string[]
}

export interface QuarrySaveData {
  unlockedAtDayTag: string
  unlockYear: number
  activeSize: number
  lifetimeClearedCount: number
  deepClearCount: number
  cells: QuarryCell[]
  lastRefreshDayTag: string
  weeklyProgress: QuarryWeeklyProgress
  quarryMine: QuarryMineSaveData
}

export interface QuarryResourceDef {
  id: string
  label: string
  kind: QuarryCellKind
  itemId: string
  minQuantity: number
  maxQuantity: number
  weight: number
}

export interface QuarryUnlockRequirement {
  id: string
  label: string
  current: number
  target: number
  met: boolean
  skillType?: SkillType
}

export interface QuarryUnlockStatus {
  unlocked: boolean
  canUnlock: boolean
  requirements: QuarryUnlockRequirement[]
}

export interface QuarryWeeklyStewardshipProgress {
  weekKey: string
  clearedCount: number
  current: number
  target: number
  claimedCount: number
  maxClaims: number
  ready: boolean
  percent: number
}

export interface QuarryCollectRewardEntry {
  itemId: string
  quantity: number
}

export interface QuarryCollectResult {
  success: boolean
  message: string
  rewards: QuarryCollectRewardEntry[]
  potentialClaimed?: boolean
  trinketUnlocked?: boolean
  exploreMode?: QuarryMineExploreMode
  globalLogged?: boolean
}

export interface QuarryActionResult {
  success: boolean
  message: string
  startsCombat?: boolean
  rewards?: QuarryCollectRewardEntry[]
  completed?: boolean
  rewardClaimed?: boolean
}

export interface QuarryCombatActionResult {
  message: string
  combatOver: boolean
  won: boolean
  timeCostHours: number
  dealtDamage?: number
  mainDamage?: number
  extraDamage?: number
  totalDamage?: number
  effectiveDamage?: number
  takenDamage?: number
  isCrit?: boolean
  rewards?: QuarryCollectRewardEntry[]
}

export interface QuarryExpansionStage {
  fromSize: number
  toSize: number
  moneyCost: number
  materialCosts: QuarryExpansionMaterialCost[]
  requiredClearedCount: number
  requiredDeepClearCount: number
  requiredMineFloor: number
  requiredSkullFloor: number
  requiredMiningLevel: number
  description: string
}

export interface QuarryExpansionInfo {
  currentSize: number
  maxExpansionSize: number
  nextStage: QuarryExpansionStage | null
  totalCells: number
  usedCells: number
  canExpand: boolean
  missingRequirements: string[]
}

export interface QuarryMineStatus {
  unlocked: boolean
  entered: boolean
  completed: boolean
  finalRewardClaimed: boolean
  lastRunDayTag: string
  lastCompletedDayTag: string
  lastResetDayTag: string
  runId: number
  nodes: QuarryMineNode[]
  nextNodeIndex: number | null
  clearedCount: number
  totalCount: number
  canEnter: boolean
  enteredToday: boolean
  canClaimFinalReward: boolean
  canRefresh: boolean
  daysUntilRefresh: number
  refreshDayCount: number
}
