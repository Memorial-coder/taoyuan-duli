import type { RewardTicketLedger } from './economy'

export type HanhaiProgressTier = 'P0' | 'P1' | 'P2'
export type HanhaiLinkedSystem = 'quest' | 'shop' | 'museum' | 'goal'
export type HanhaiBossThreatLevel = 'standard' | 'advanced' | 'prestige'

export interface HanhaiRouteInvestmentDef {
  id: string
  label: string
  unlockTier: HanhaiProgressTier
  costMoney: number
  riskLevel: 'low' | 'medium' | 'high'
  rewardSummary: string
  weeklyYieldSummary?: string
  linkedSystems?: HanhaiLinkedSystem[]
  favoredCargoTags?: string[]
}

export interface HanhaiRouteInvestmentState {
  routeId: string
  totalInvested: number
  tripsCompleted: number
}

export interface HanhaiSetCollectionState {
  setId: string
  collectedRelicTags: string[]
  completed: boolean
}

export interface HanhaiRelicSetDef {
  id: string
  label: string
  unlockTier: HanhaiProgressTier
  requiredRelicTags: string[]
  rewardSummary: string
  linkedSystems?: HanhaiLinkedSystem[]
}

export interface HanhaiBossCycleDef {
  id: string
  label: string
  unlockTier: HanhaiProgressTier
  preferredWeekOfSeason: number[]
  threatLevel: HanhaiBossThreatLevel
  rewardSummary: string
  linkedSystems?: HanhaiLinkedSystem[]
}

export interface HanhaiCaravanContractDef {
  id: string
  label: string
  unlockTier: HanhaiProgressTier
  routeId: string
  durationWeeks: number
  costMoney: number
  cargoTags: string[]
  riskLevel: 'low' | 'medium' | 'high'
  rewardSummary: string
  linkedSystems?: HanhaiLinkedSystem[]
}

export interface HanhaiShopRotationDef {
  id: string
  label: string
  unlockTier: HanhaiProgressTier
  featuredItemIds: string[]
  summary: string
}

export interface HanhaiCycleState {
  saveVersion: number
  progressTier: HanhaiProgressTier
  routeInvestments: Record<string, HanhaiRouteInvestmentState>
  setCollections: Record<string, HanhaiSetCollectionState>
  bossCycleId: string
  lastWeeklyResetDayTag: string
}

export interface HanhaiActiveTexasSession {
  sessionId: string
  tierId: TexasTierId
  tierName: string
  entryFee: number
  startedAtDayTag: string
  reserveMoney: number
  hands: TexasHandSetup[]
  settled: boolean
}

export interface HanhaiActiveBuckshotSession {
  sessionId: string
  startedAtDayTag: string
  shells: BuckshotSetup['shells']
  playerFirst: boolean
  settled: boolean
}

export interface HanhaiSaveData {
  unlocked: boolean
  casinoBetsToday: number
  weeklyPurchases: Record<string, number>
  relicRecords: Record<string, HanhaiRelicRecord>
  cycleState: HanhaiCycleState
  activeTexasSession?: HanhaiActiveTexasSession | null
  activeBuckshotSession?: HanhaiActiveBuckshotSession | null
}

export interface HanhaiCycleOverview {
  unlocked: boolean
  progressTier: HanhaiProgressTier
  totalRelicClears: number
  activeInvestmentCount: number
  completedCollectionCount: number
  bossCycleId: string
  betsRemaining: number
}

export interface HanhaiRelicSiteSummary {
  siteId: string
  name: string
  weeklyLimit: number
  clears: number
  remaining: number
  claimedMilestone: boolean
  relicTag: string
}

export interface HanhaiShopItemSummary {
  itemId: string
  name: string
  weeklyLimit?: number
  remaining: number
  canPurchase: boolean
}

export interface HanhaiDebugSnapshot {
  unlocked: boolean
  casinoBetsToday: number
  weeklyPurchases: Record<string, number>
  relicRecords: Record<string, HanhaiRelicRecord>
  cycleState: HanhaiCycleState
}

export interface HanhaiRewardBundle {
  money?: number
  items?: { itemId: string; quantity: number }[]
  ticketRewards?: RewardTicketLedger
}

export interface HanhaiWeightedRewardBundle {
  id: string
  label: string
  summary: string
  weight: number
  rewards: HanhaiRewardBundle
}

export type HanhaiCasinoRewardTrigger = 'win' | 'lose' | 'draw'

export interface HanhaiCasinoSideRewardDef extends HanhaiWeightedRewardBundle {
  gameType: CasinoGameType
  trigger: HanhaiCasinoRewardTrigger
}

export interface HanhaiRelicReward extends HanhaiRewardBundle {
}

export interface HanhaiRelicSiteDef {
  id: string
  name: string
  description: string
  unlockCost: number
  weeklyLimit: number
  rewards: HanhaiRelicReward
  relicTag: string
}

export interface HanhaiRelicRecord {
  siteId: string
  clears: number
  claimedMilestone: boolean
}

/** 瀚海商店物品定义 */
export interface HanhaiShopItemDef {
  itemId: string
  name: string
  price: number
  description: string
  /** 购买后获得数量（默认 1） */
  quantity?: number
  /** 额外兑换材料 */
  costItems?: { itemId: string; quantity: number }[]
  /** 每周限购数量（0或不填=不限购） */
  weeklyLimit?: number
}

/** 赌坊游戏类型 */
export type CasinoGameType = 'roulette' | 'dice' | 'cup' | 'cricket' | 'cardflip' | 'texas' | 'buckshot'

/** 蛐蛐定义 */
export interface CricketDef {
  id: string
  name: string
  description: string
}

/** 轮盘赔率档位 */
export interface RouletteOutcome {
  label: string
  multiplier: number
  /** 概率百分比（所有项之和应为100） */
  chance: number
}

// === 瀚海扑克 ===

export type PokerSuit = 'spade' | 'heart' | 'diamond' | 'club'
export type PokerRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface PokerCard {
  suit: PokerSuit
  rank: PokerRank
}

export type PokerHandType =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_kind'
  | 'two_pair'
  | 'one_pair'
  | 'high_card'

export interface PokerHandResult {
  type: PokerHandType
  /** 牌型优先级（越大越强） */
  typeRank: number
  /** 用于同类型比较的排序值数组（降序） */
  ranks: number[]
  label: string
}

export type TexasStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
export type PokerActionType = 'check' | 'raise' | 'call' | 'fold' | 'allin'
export type TexasTierId = 'beginner' | 'normal' | 'expert'

export interface TexasTierDef {
  id: TexasTierId
  name: string
  /** 入场费（= 双方初始筹码） */
  entryFee: number
  /** 大盲注 */
  blind: number
  /** 每局抽水（荷官小费） */
  rake: number
  /** 入场最低持有金钱 */
  minMoney: number
  /** 每次入场可对局手数 */
  rounds: number
}

export interface TexasHandSetup {
  playerHole: PokerCard[]
  dealerHole: PokerCard[]
  community: PokerCard[]
}

export interface TexasActionRecord {
  round: number
  street: TexasStreet
  action: PokerActionType
  total?: number
}

export interface TexasSessionReport {
  sessionId: string
  tierName: string
  playerActions: TexasActionRecord[]
}

export interface TexasSetup {
  sessionId: string
  reserveMoney: number
  hands: TexasHandSetup[]
  /** 场次配置 */
  tier: TexasTierDef
}

// === 恶魔轮盘 ===

export type ShellType = 'live' | 'blank'

export interface BuckshotSetup {
  sessionId: string
  shells: ShellType[]
  playerHP: number
  dealerHP: number
  playerFirst: boolean
}

export type BuckshotPlayerAction = 'self' | 'opponent'
