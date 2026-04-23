import type { PondContestDef, PondContestState } from '@/types/fishPond'

export const POND_CONTEST_DEFS: PondContestDef[] = [
  {
    id: 'pond_showcase_show',
    label: '观赏组周赛',
    description: '优先比较观赏值与展示完成度，适合高颜值、高世代样本参赛。',
    category: 'showcase',
    scoringMetric: 'showValue',
    unlockGenerationMin: 2,
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 1200,
    rewardTickets: { exhibit: 1 }
  },
  {
    id: 'pond_food_grade',
    label: '食用品质组',
    description: '优先比较食用值与成熟度，适合稳定供货型鱼类参赛。',
    category: 'food',
    scoringMetric: 'foodValue',
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 1000,
    rewardTickets: { caravan: 1 }
  },
  {
    id: 'pond_rare_breed',
    label: '稀有品系组',
    description: '优先比较综合评分，适合高世代或稀有品系样本参赛。',
    category: 'rare',
    scoringMetric: 'totalScore',
    unlockGenerationMin: 3,
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 1500,
    rewardTickets: { exhibit: 1, research: 1 }
  }
]

export const WS14_POND_CONTEST_DEFS: PondContestDef[] = [
  {
    id: 'pond_showcase_gallery',
    label: '展示样本组',
    description: '更强调展示池中的观赏值和世代镜像快照，适合活动收尾和高光展示。',
    category: 'showcase',
    scoringMetric: 'showValue',
    variantGroup: 'showcase',
    eligibilitySnapshotLabel: '展示池高光 / 活动收尾',
    unlockGenerationMin: 3,
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 1800,
    rewardTickets: { exhibit: 1, caravan: 1 },
    rewardTierId: 'activity'
  },
  {
    id: 'pond_harvest_cycle',
    label: '产物收成组',
    description: '更强调成熟健康个体带来的产物回收，适合限时供货和周中补领奖励。',
    category: 'food',
    scoringMetric: 'foodValue',
    variantGroup: 'harvest',
    eligibilitySnapshotLabel: '待领取产物 / 成熟个体',
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 1700,
    rewardTickets: { caravan: 1, research: 1 },
    rewardTierId: 'activity'
  },
  {
    id: 'pond_clean_water_keystone',
    label: '水质养护组',
    description: '更强调健康度和稳定性，适合高压养护周和冬季维护类活动。',
    category: 'rare',
    scoringMetric: 'healthScore',
    variantGroup: 'maintenance',
    eligibilitySnapshotLabel: '健康度 / 水质养护',
    requireMature: true,
    requireHealthy: true,
    rewardMoney: 2200,
    rewardTickets: { exhibit: 1, research: 1, caravan: 1 },
    rewardTierId: 'showcase'
  }
]

const ALL_POND_CONTEST_DEFS = [...POND_CONTEST_DEFS, ...WS14_POND_CONTEST_DEFS]

export const createDefaultPondContestState = (): PondContestState => ({
  weekId: '',
  contestId: '',
  registeredFishIds: [],
  settled: false,
  lastSettlementDayTag: ''
})

export const getWeeklyPondContestDef = (absoluteWeek: number) => {
  if (ALL_POND_CONTEST_DEFS.length === 0) return null
  return ALL_POND_CONTEST_DEFS[Math.abs(absoluteWeek) % ALL_POND_CONTEST_DEFS.length] ?? null
}
