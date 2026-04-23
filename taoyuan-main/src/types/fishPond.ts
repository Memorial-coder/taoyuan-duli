import type { Quality } from './item'
import type { RewardTicketType } from './economy'

/** 鱼塘等级 */
export type PondLevel = 1 | 2 | 3 | 4 | 5

/** 鱼个体基因 */
export interface FishGenetics {
  /** 体重 0-100 → 影响售价 */
  weight: number
  /** 生长率 0-100 → 成熟速度 */
  growthRate: number
  /** 抗病性 0-100 → 抗病概率 */
  diseaseRes: number
  /** 品质基因 0-100 → 产出品质 */
  qualityGene: number
  /** 变异率 1-50 → 后代变异幅度 */
  mutationRate: number
}

/** 鱼塘中的鱼个体 */
export interface PondFish {
  id: string
  fishId: string
  name: string
  genetics: FishGenetics
  /** 入塘天数 */
  daysInPond: number
  /** 是否成熟（可产出/繁殖） */
  mature: boolean
  /** 是否生病 */
  sick: boolean
  /** 连续生病天数 */
  sickDays: number
  /** 品种ID（图鉴系统） */
  breedId: string | null
}

/** 品种定义（图鉴系统） */
export interface PondBreedDef {
  breedId: string
  name: string
  generation: 1 | 2 | 3 | 4 | 5
  baseFishId: string
  parentBreedA: string | null
  parentBreedB: string | null
}

export type PondRatingDimensionKey = 'generation' | 'show' | 'food' | 'health' | 'stability'

export interface PondRatingBreakdownEntry {
  key: PondRatingDimensionKey
  label: string
  value: number
  weight: number
  contribution: number
}

export interface PondRatingBreakdown {
  totalScore: number
  showValue: number
  foodValue: number
  healthScore: number
  stabilityScore: number
  generation: number
  entries: PondRatingBreakdownEntry[]
}

export interface PondFishRatingSnapshot extends PondRatingBreakdown {
  fishInstanceId: string
  fishId: string
  fishName: string
  breedId: string | null
  mature: boolean
  sick: boolean
  starRating: number
}

export interface PondEligibilityGenerationBucket {
  generation: number
  totalCount: number
  matureCount: number
  healthyCount: number
  matureHealthyCount: number
  bestTotalScore: number
}

export interface PondEligibilitySnapshot {
  fishId: string
  fishName: string
  totalCount: number
  matureCount: number
  healthyCount: number
  matureHealthyCount: number
  bestShowValue: number
  bestFoodValue: number
  bestTotalScore: number
  generationBuckets: PondEligibilityGenerationBucket[]
}

export type PondContestCategory = 'showcase' | 'food' | 'rare'

export interface PondContestDef {
  id: string
  label: string
  description: string
  category: PondContestCategory
  scoringMetric: 'showValue' | 'foodValue' | 'totalScore' | 'healthScore'
  variantGroup?: 'showcase' | 'harvest' | 'maintenance'
  eligibilitySnapshotLabel?: string
  unlockGenerationMin?: number
  requireMature: boolean
  requireHealthy: boolean
  rewardMoney: number
  rewardTickets?: Partial<Record<RewardTicketType, number>>
  rewardTierId?: string
}

export interface PondContestEntryResult {
  pondFishId: string
  fishId: string
  fishName: string
  breedId: string | null
  score: number
}

export interface PondContestSettlementSummary {
  weekId: string
  contestId: string
  settledAtDayTag: string
  participantCount: number
  winner?: PondContestEntryResult
  ranking: PondContestEntryResult[]
  rewardSummary: string[]
}

export interface PondContestState {
  weekId: string
  contestId: string
  registeredFishIds: string[]
  settled: boolean
  lastSettlementDayTag: string
}

export interface PondDisplayEntry {
  pondFishId: string
  fishId: string
  fishName: string
  breedId: string | null
  snapshotScore: number
  snapshotShowValue: number
  snapshotGeneration: number
  assignedAtDayTag: string
}

export interface PondMaintenanceState {
  ornamentalFeedBuffDays: number
  quarantineShieldDays: number
  lastOrnamentalFeedDayTag: string
  lastAdvancedPurifierDayTag: string
}

/** 繁殖槽 */
export interface BreedingPair {
  parentA: string
  parentB: string
  daysLeft: number
  fishId: string
}

/** 鱼塘状态 */
export interface FishPondState {
  built: boolean
  level: PondLevel
  fish: PondFish[]
  /** 水质 0-100 */
  waterQuality: number
  fedToday: boolean
  breeding: BreedingPair | null
  collectedToday: boolean
}

/** 可养殖鱼种定义 */
export interface PondableFishDef {
  fishId: string
  name: string
  /** 成熟天数 */
  maturityDays: number
  /** 每日产出概率 (0-1) */
  baseProductionRate: number
  /** 产出物品ID（通常就是鱼本身） */
  productItemId: string
  /** 默认基因 */
  defaultGenetics: FishGenetics
}

/** 鱼塘每日更新结果 */
export interface PondDailyResult {
  products: { itemId: string; quality: Quality }[]
  died: string[]
  gotSick: string[]
  healed: string[]
  bred: string | null
  /** 繁殖失败原因 */
  breedingFailed: string | null
}
