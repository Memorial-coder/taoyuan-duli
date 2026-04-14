/** 持久谱系快照节点 */
export interface SeedLineageNode {
  /** 基因ID */
  id: string
  /** 作物ID */
  cropId: string
  /** 世代 */
  generation: number
  /** 总属性 */
  totalStats: number
  /** 杂交品种ID */
  hybridId: string | null
  /** 祖代快照 */
  parents?: SeedLineageNode[]
}

/** 种子基因属性 */
export interface SeedGenetics {
  /** 唯一标识 */
  id: string
  /** 对应作物ID */
  cropId: string
  /** 世代（种子制造机=0，每次杂交+1） */
  generation: number
  /** 甜度 0-100 → 售价加成 */
  sweetness: number
  /** 产量 0-100 → 双收概率 */
  yield: number
  /** 抗性 0-100 → 减缓枯萎 */
  resistance: number
  /** 稳定度 0-100 → 后代属性波动越小 */
  stability: number
  /** 变异率 1-50 → 大幅突变概率 */
  mutationRate: number
  /** 亲本A的ID（可溯源） */
  parentA: string | null
  /** 亲本B的ID（可溯源） */
  parentB: string | null
  /** 是否为杂交品种 */
  isHybrid: boolean
  /** 杂交品种ID（仅杂交种有值） */
  hybridId: string | null
  /** 持久谱系快照（最多保留近几代祖先） */
  lineageParents?: SeedLineageNode[] | null
}

/** 育种种子（种子箱中的条目） */
export interface BreedingSeed {
  genetics: SeedGenetics
  /** 显示标签（作物名+世代+星级） */
  label: string
}

/** 育种台槽位 */
export interface BreedingSlot {
  /** 亲本A */
  parentA: SeedGenetics | null
  /** 亲本B */
  parentB: SeedGenetics | null
  /** 已加工天数 */
  daysProcessed: number
  /** 总需天数 */
  totalDays: number
  /** 结果种子 */
  result: SeedGenetics | null
  /** 是否完成 */
  ready: boolean
}

/** 杂交配方定义 */
export interface HybridDef {
  /** 杂交种ID */
  id: string
  /** 杂交种名称 */
  name: string
  /** 亲本A的cropId */
  parentCropA: string
  /** 亲本B的cropId */
  parentCropB: string
  /** 父母平均甜度要求 */
  minSweetness: number
  /** 父母平均产量要求 */
  minYield: number
  /** 产出的作物ID */
  resultCropId: string
  /** 杂交种基础基因属性 */
  baseGenetics: { sweetness: number; yield: number; resistance: number }
  /** 发现时的描述文字 */
  discoveryText: string
}

/** 图鉴条目 */
export interface CompendiumEntry {
  /** 杂交品种ID */
  hybridId: string
  /** 发现年份 */
  discoveredYear: number
  /** 最佳总属性 */
  bestTotalStats: number
  /** 历史最佳单项属性 */
  bestSweetness?: number
  bestYield?: number
  bestResistance?: number
  /** 历史最高世代 */
  bestGeneration?: number
  /** 曾达成过的谱系亲本作物记录 */
  lineageCropIds?: string[]
  /** 种植次数 */
  timesGrown: number
}

/** 育种研究升级 */
export interface BreedingResearchUpgrade {
  level: number
  name: string
  description: string
  cost: number
  materials: { itemId: string; quantity: number }[]
}

/** 育种大师被动效果 */
export interface BreedingMasteryPerk {
  id: string
  name: string
  description: string
  unlocked: boolean
}

/** 星级评分 1-5 */
export type SeedStarRating = 1 | 2 | 3 | 4 | 5

/** 种子箱排序方式 */
export type SeedSortKey = 'default' | 'total' | 'sweetness' | 'yield' | 'resistance' | 'generation'

/** 种子箱筛选方式 */
export type SeedFilterKey = 'all' | 'hybrid' | 'nonHybrid' | 'highStar' | 'favorite'

/** 图鉴目标状态 */
export type HybridStatusFilter = 'all' | 'discovered' | 'discoverable' | 'near'

/** 杂交目标可达性 */
export interface HybridAvailability {
  hybridId: string
  hasParents: boolean
  canDiscover: boolean
  avgSweetness: number
  avgYield: number
  sweetGap: number
  yieldGap: number
  status: 'missing_parents' | 'unavailable' | 'near' | 'discoverable'
  recommendation: string
}

export type BreedingCommercialTag =
  | 'banquet'
  | 'bulk_supply'
  | 'showcase'
  | 'storage'
  | 'research'
  | 'luxury'

export type BreedingShowcaseTag = 'tea_showcase' | 'festival_display' | 'archive_display' | 'luxury_display'

export type BreedingStabilityRank = 'volatile' | 'emerging' | 'stable' | 'certified'

export interface BreedingScoreBreakdownEntry {
  key: 'sweetness' | 'yield' | 'resistance' | 'stability' | 'generation'
  label: string
  value: number
  weight: number
  contribution: number
}

export interface BreedingScoreBreakdown {
  totalScore: number
  stabilityRank: BreedingStabilityRank
  commercialTags: BreedingCommercialTag[]
  showcaseTags: BreedingShowcaseTag[]
  exhibitWorth: number
  entries: BreedingScoreBreakdownEntry[]
}

export interface BreedingCertificationRecord {
  hybridId: string
  certifiedAtYear: number
  bestGeneration: number
  bestTotalScore: number
  requiredGeneration: number
  requiredTimesGrown: number
  requiredTotalScore: number
}

export interface BreedingContestDef {
  id: string
  label: string
  description: string
  scoringMetric: 'totalScore' | 'exhibitWorth'
  requiredCommercialTags?: BreedingCommercialTag[]
  rewardMoney: number
}

export interface BreedingContestEntryResult {
  geneticsId: string
  cropId: string
  label: string
  hybridId: string | null
  score: number
}

export interface BreedingContestSettlementSummary {
  weekId: string
  contestId: string
  settledAtDayTag: string
  participantCount: number
  winner?: BreedingContestEntryResult
  ranking: BreedingContestEntryResult[]
  rewardSummary: string[]
}

export interface BreedingContestState {
  weekId: string
  contestId: string
  registeredSeedIds: string[]
  settled: boolean
  lastSettlementDayTag: string
}

export interface BreedingFailureSalvageItem {
  itemId: string
  quantity: number
  reason: string
}

export interface BreedingFailureSalvageSummary {
  generatedAtDayTag: string
  returnedSeedId: string
  returnedSeedLabel: string
  targetHybridId?: string
  failedStatKey: 'sweetness' | 'yield' | 'resistance'
  failedPenalty: number
  salvageItems: BreedingFailureSalvageItem[]
  summary: string
}

export interface BreedingPlanningNeed {
  itemId: string
  itemName: string
  quantity: number
  owned: number
}

export interface BreedingPlanningSuggestion {
  hybridId: string
  targetLabel: string
  readiness: 'ready' | 'near' | 'prep'
  currentGapSummary: string
  reasonLines: string[]
  expectedUseLines: string[]
  parentLines: string[]
  logisticsNeeds: BreedingPlanningNeed[]
}
