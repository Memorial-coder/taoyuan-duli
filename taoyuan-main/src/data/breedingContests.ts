import type { BreedingContestDef, BreedingContestState } from '@/types/breeding'

export const BREEDING_CONTEST_DEFS: BreedingContestDef[] = [
  {
    id: 'breeding_banquet_showcase',
    label: '甜度品鉴会',
    description: '偏向高甜度、高展示价值的宴席型样本。',
    scoringMetric: 'exhibitWorth',
    requiredCommercialTags: ['banquet', 'showcase'],
    rewardMoney: 1400
  },
  {
    id: 'breeding_stable_batch',
    label: '稳定量产评比',
    description: '偏向高稳定度与综合评分的量产样本。',
    scoringMetric: 'totalScore',
    requiredCommercialTags: ['bulk_supply'],
    rewardMoney: 1200
  },
  {
    id: 'breeding_archive_show',
    label: '谱系档案展',
    description: '偏向高世代、可展示、可研究的谱系样本。',
    scoringMetric: 'totalScore',
    requiredCommercialTags: ['research', 'showcase'],
    rewardMoney: 1600
  }
]

export const createDefaultBreedingContestState = (): BreedingContestState => ({
  weekId: '',
  contestId: '',
  registeredSeedIds: [],
  settled: false,
  lastSettlementDayTag: ''
})

export const getWeeklyBreedingContestDef = (absoluteWeek: number) => {
  if (BREEDING_CONTEST_DEFS.length === 0) return null
  return BREEDING_CONTEST_DEFS[Math.abs(absoluteWeek) % BREEDING_CONTEST_DEFS.length] ?? null
}
