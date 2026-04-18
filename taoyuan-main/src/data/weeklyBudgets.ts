import type { WeeklyBudgetChannelDef } from '@/types'

export const WEEKLY_BUDGET_CHANNELS: WeeklyBudgetChannelDef[] = [
  {
    channelId: 'trade',
    label: '商路预算',
    shortLabel: '商路',
    description: '给驿站、货栈与告示栏留出周度投放，提升本周经营目标的现金回报。',
    resetRule: '每周开始后手动投入，当周有效，跨周自动失效。',
    tiers: [
      {
        id: 'trade_tier_1',
        tier: 1,
        label: '试运档',
        costMoney: 1200,
        projectedValue: 1500,
        effect: {
          moneyRewardMultiplier: 1.08,
          ticketRewards: { caravan: 1 },
          summary: '目标现金奖励 +8%，每次目标结算额外获得 1 点商路票券。'
        }
      },
      {
        id: 'trade_tier_2',
        tier: 2,
        label: '扩线档',
        costMoney: 2800,
        projectedValue: 3600,
        effect: {
          moneyRewardMultiplier: 1.14,
          ticketRewards: { caravan: 2 },
          summary: '目标现金奖励 +14%，每次目标结算额外获得 2 点商路票券。'
        }
      },
      {
        id: 'trade_tier_3',
        tier: 3,
        label: '旗舰档',
        costMoney: 5200,
        projectedValue: 7100,
        effect: {
          moneyRewardMultiplier: 1.22,
          ticketRewards: { caravan: 3 },
          summary: '目标现金奖励 +22%，每次目标结算额外获得 3 点商路票券。'
        }
      }
    ]
  },
  {
    channelId: 'museum',
    label: '展馆预算',
    shortLabel: '展馆',
    description: '用于布展、宣传与专题活动筹备，强化本周目标的声望转化。',
    resetRule: '每周开始后手动投入，当周有效，跨周自动失效。',
    tiers: [
      {
        id: 'museum_tier_1',
        tier: 1,
        label: '陈列档',
        costMoney: 1000,
        projectedValue: 1300,
        effect: {
          reputationRewardMultiplier: 1.2,
          ticketRewards: { exhibit: 1 },
          summary: '目标声望奖励 +20%，每次目标结算额外获得 1 点展馆票券。'
        }
      },
      {
        id: 'museum_tier_2',
        tier: 2,
        label: '巡展档',
        costMoney: 2400,
        projectedValue: 3200,
        effect: {
          reputationRewardMultiplier: 1.35,
          ticketRewards: { exhibit: 2 },
          summary: '目标声望奖励 +35%，每次目标结算额外获得 2 点展馆票券。'
        }
      },
      {
        id: 'museum_tier_3',
        tier: 3,
        label: '盛会档',
        costMoney: 4600,
        projectedValue: 6400,
        effect: {
          reputationRewardMultiplier: 1.5,
          ticketRewards: { exhibit: 3 },
          summary: '目标声望奖励 +50%，每次目标结算额外获得 3 点展馆票券。'
        }
      }
    ]
  },
  {
    channelId: 'academy',
    label: '学舍预算',
    shortLabel: '学舍',
    description: '资助讲学与研习，稳定抬高本周目标的学识回报与研究积累。',
    resetRule: '每周开始后手动投入，当周有效，跨周自动失效。',
    tiers: [
      {
        id: 'academy_tier_1',
        tier: 1,
        label: '讲习档',
        costMoney: 900,
        projectedValue: 1200,
        effect: {
          flatReputationBonus: 2,
          ticketRewards: { research: 1 },
          summary: '每次目标结算额外 +2 声望，并获得 1 点学舍票券。'
        }
      },
      {
        id: 'academy_tier_2',
        tier: 2,
        label: '研修档',
        costMoney: 2100,
        projectedValue: 2900,
        effect: {
          flatReputationBonus: 4,
          ticketRewards: { research: 2 },
          summary: '每次目标结算额外 +4 声望，并获得 2 点学舍票券。'
        }
      },
      {
        id: 'academy_tier_3',
        tier: 3,
        label: '藏书档',
        costMoney: 3900,
        projectedValue: 5600,
        effect: {
          flatReputationBonus: 7,
          ticketRewards: { research: 3 },
          summary: '每次目标结算额外 +7 声望，并获得 3 点学舍票券。'
        }
      }
    ]
  }
]

export const WEEKLY_BUDGET_CHANNEL_MAP = Object.fromEntries(WEEKLY_BUDGET_CHANNELS.map(channel => [channel.channelId, channel])) as Record<
  WeeklyBudgetChannelDef['channelId'],
  WeeklyBudgetChannelDef
>