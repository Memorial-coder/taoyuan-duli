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

export const createDefaultPondContestState = (): PondContestState => ({
  weekId: '',
  contestId: '',
  registeredFishIds: [],
  settled: false,
  lastSettlementDayTag: ''
})

export const getWeeklyPondContestDef = (absoluteWeek: number) => {
  if (POND_CONTEST_DEFS.length === 0) return null
  return POND_CONTEST_DEFS[Math.abs(absoluteWeek) % POND_CONTEST_DEFS.length] ?? null
}
