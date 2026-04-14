import type { LateGameBalanceConfig } from '@/types'

export const LATE_GAME_BALANCE_CONFIG: LateGameBalanceConfig = {
  maintenanceMultiplier: 1,
  ticketRewardRate: 1,
  budgetReturnCurves: [
    {
      channelId: 'trade',
      baseReturnRate: 0.08,
      bonusReturnRate: 0.04,
      maxReturnRate: 0.16
    },
    {
      channelId: 'museum',
      baseReturnRate: 0.06,
      bonusReturnRate: 0.05,
      maxReturnRate: 0.15
    },
    {
      channelId: 'academy',
      baseReturnRate: 0.05,
      bonusReturnRate: 0.04,
      maxReturnRate: 0.13
    },
    {
      channelId: 'guild',
      baseReturnRate: 0.05,
      bonusReturnRate: 0.03,
      maxReturnRate: 0.12
    },
    {
      channelId: 'family',
      baseReturnRate: 0.04,
      bonusReturnRate: 0.03,
      maxReturnRate: 0.1
    },
    {
      channelId: 'research',
      baseReturnRate: 0.05,
      bonusReturnRate: 0.05,
      maxReturnRate: 0.15
    }
  ],
  wealthTiers: [
    {
      id: 'tight_cashflow',
      label: '资金紧张',
      description: '现金与近 7 天净收入都偏低，应优先补流动性与低门槛经营投入。',
      minCashOnHand: 0,
      minRecent7DayNetIncome: -999999,
      minTotalAssetValue: 0,
      goalCashRewardMultiplier: 1.15,
      recommendationWeight: 3,
      preferredSinkCategories: ['service', 'specialOrder'],
      recommendedFocus: '优先推荐补现金流、低门槛周投入与可快速回收的经营动作。'
    },
    {
      id: 'stable_growth',
      label: '稳健增长',
      description: '已具备稳定收入和基础资产，可承接维护、目录与中期扩张建议。',
      minCashOnHand: 8000,
      minRecent7DayNetIncome: 1200,
      minTotalAssetValue: 22000,
      goalCashRewardMultiplier: 1,
      recommendationWeight: 2,
      preferredSinkCategories: ['service', 'maintenance', 'luxuryCatalog'],
      recommendedFocus: '优先推荐中期扩张、维护型投入与目录消费，保持经营节奏稳定。'
    },
    {
      id: 'capital_surplus',
      label: '资本充裕',
      description: '现金储备和资产总值已较高，适合把经营重点转向大额消耗与多系统联动。',
      minCashOnHand: 32000,
      minRecent7DayNetIncome: 4200,
      minTotalAssetValue: 85000,
      goalCashRewardMultiplier: 0.92,
      recommendationWeight: 3,
      preferredSinkCategories: ['maintenance', 'luxuryCatalog', 'themeActivity'],
      recommendedFocus: '优先推荐高价 sink、维护续费与主题活动，把冗余现金转成长期收益。'
    },
    {
      id: 'wealth_overflow',
      label: '财富溢出',
      description: '处于明显的终局财富溢出区间，应更多引导到主题展示、大额投入与跨系统运营。',
      minCashOnHand: 85000,
      minRecent7DayNetIncome: 9000,
      minTotalAssetValue: 200000,
      goalCashRewardMultiplier: 0.82,
      recommendationWeight: 4,
      preferredSinkCategories: ['themeActivity', 'luxuryCatalog', 'maintenance'],
      recommendedFocus: '优先推荐终局展示、高价目录和长期运营投入，避免继续单一路径堆钱。'
    }
  ],
  serviceContractRenewMultiplier: 1.15,
  highValueOrderCashRatio: 0.65,
  casinoCashExpectationMultiplier: 0.7,
  breedingFailureSalvage: {
    minimumGenerationForResidue: 4,
    residueBaseQuantity: 1,
    residueHybridBonus: 1,
    certificationGenerationThreshold: 6,
    certificationScoreThreshold: 210,
    preservationResistanceThreshold: 70
  },
  fishPondMaintenance: {
    highTierScoreThreshold: 78,
    maintenanceDecayPerHighTierFish: 2,
    ornamentalFeedShowBonus: 8,
    ornamentalFeedContestBonus: 6,
    advancedPurifierRestore: 28,
    quarantineShieldDays: 2,
    displayTankSlotLimit: 3,
    displayTankMuseumScoreDivisor: 24
  }
}

/**
 * 后期经济关键参数统一入口。
 *
 * - maintenanceMultiplier：维护费全局倍率
 * - ticketRewardRate：票券类奖励的全局倍率
 * - budgetReturnCurves：各预算槽的收益曲线配置
 * - wealthTiers：财富层级与软调控阈值配置
 * - serviceContractRenewMultiplier：服务合同续费倍率
 * - highValueOrderCashRatio：高价值订单中的现金奖励占比
 * - casinoCashExpectationMultiplier：赌坊现金期望倍率
 * - breedingFailureSalvage：育种失败保底与再利用参数
 * - fishPondMaintenance：鱼塘高阶养护与展示池参数
 */
