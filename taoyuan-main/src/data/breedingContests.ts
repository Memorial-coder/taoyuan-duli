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

export const WS14_BREEDING_CONTEST_DEFS: BreedingContestDef[] = [
  {
    id: 'breeding_sweetness_mastery',
    label: '单味甜度组',
    description: '只比较甜度，用来筛出适合宴席、茶饮和高价试吃的单属性专精样本。',
    scoringMetric: 'sweetness',
    variantGroup: 'single_trait',
    eligibilitySnapshotLabel: '单属性甜度专精',
    requiredCommercialTags: ['banquet'],
    rewardMoney: 1800,
    rewardTickets: { exhibit: 1, research: 1 },
    rewardTierId: 'activity'
  },
  {
    id: 'breeding_yield_trial',
    label: '高产供货组',
    description: '只比较产量，用来筛出适合活动供货和限时订单承接的高产样本。',
    scoringMetric: 'yield',
    variantGroup: 'single_trait',
    eligibilitySnapshotLabel: '高产供货专精',
    requiredCommercialTags: ['bulk_supply'],
    rewardMoney: 1900,
    rewardTickets: { caravan: 1, research: 1 },
    rewardTierId: 'activity'
  },
  {
    id: 'breeding_lineage_purity',
    label: '谱系纯度组',
    description: '综合考察世代、稳定度与谱系可读性，用来筛出适合档案馆和终局展示的谱系纯度样本。',
    scoringMetric: 'generation',
    variantGroup: 'lineage',
    eligibilitySnapshotLabel: '世代 / 稳定度 / 谱系纯度',
    requiredCommercialTags: ['research', 'showcase'],
    rewardMoney: 2400,
    rewardTickets: { exhibit: 1, research: 2 },
    rewardTierId: 'showcase'
  }
]

const ALL_BREEDING_CONTEST_DEFS = [...BREEDING_CONTEST_DEFS, ...WS14_BREEDING_CONTEST_DEFS]

export const createDefaultBreedingContestState = (): BreedingContestState => ({
  weekId: '',
  contestId: '',
  registeredSeedIds: [],
  settled: false,
  lastSettlementDayTag: ''
})

export const getWeeklyBreedingContestDef = (absoluteWeek: number) => {
  if (ALL_BREEDING_CONTEST_DEFS.length === 0) return null
  return ALL_BREEDING_CONTEST_DEFS[Math.abs(absoluteWeek) % ALL_BREEDING_CONTEST_DEFS.length] ?? null
}
