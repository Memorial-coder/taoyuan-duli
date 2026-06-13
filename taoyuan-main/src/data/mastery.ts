import type { SkillType } from '@/types'

export interface PrimaryMasteryDef {
  id: string
  skillType: SkillType
  label: string
  requirementLevel: number
  rewardSummary: string
  flavor: string
}

export interface HybridMasteryDef {
  id: string
  label: string
  skillRequirements: Partial<Record<SkillType, number>>
  rewardSummary: string
  flavor: string
}

export interface MasteryRewardDef {
  id: string
  label: string
  unlockMasteryId: string
  summary: string
  panelHint: string
}

export const PRIMARY_MASTERY_DEFS: PrimaryMasteryDef[] = [
  {
    id: 'mastery_farming',
    skillType: 'farming',
    label: '农耕精通',
    requirementLevel: 20,
    rewardSummary: '后续可承接高阶种植、家园与节庆供货方向。',
    flavor: '你已经不只是会种地，而是能稳定控制整条农耕产线。'
  },
  {
    id: 'mastery_foraging',
    skillType: 'foraging',
    label: '采集精通',
    requirementLevel: 20,
    rewardSummary: '后续可承接见闻、稀有采集与环境事件方向。',
    flavor: '你对山野节律的理解，已经到了看一眼就知道今天该去哪儿的程度。'
  },
  {
    id: 'mastery_fishing',
    skillType: 'fishing',
    label: '钓鱼精通',
    requirementLevel: 20,
    rewardSummary: '后续可承接鱼汛、鱼塘展示与节庆竞赛方向。',
    flavor: '你开始能把鱼获、鱼塘和鱼汛周看成一套完整生意。'
  },
  {
    id: 'mastery_mining',
    skillType: 'mining',
    label: '挖矿精通',
    requirementLevel: 20,
    rewardSummary: '后续可承接深层矿洞、器具校准与资源转化方向。',
    flavor: '你已经不是在挖矿，而是在调度矿料、爆破和高压前线补给。'
  },
  {
    id: 'mastery_combat',
    skillType: 'combat',
    label: '战斗精通',
    requirementLevel: 20,
    rewardSummary: '后续可承接高地远征、首领战备与护送合同方向。',
    flavor: '你对前线节奏的把握，已经足以反过来影响整张后期路线图。'
  }
]

export const HYBRID_MASTERY_DEFS: HybridMasteryDef[] = [
  {
    id: 'mastery_journey',
    label: '行旅大师',
    skillRequirements: {
      foraging: 18,
      fishing: 18,
      mining: 14
    },
    rewardSummary: '后续可承接行旅图、区域见闻和路线捷径方向。',
    flavor: '你开始把采集、钓鱼和行旅中的发现看成同一条探索线。'
  },
  {
    id: 'mastery_research',
    label: '考据大师',
    skillRequirements: {
      foraging: 16,
      mining: 18,
      combat: 14
    },
    rewardSummary: '后续可承接纸条、博物馆、洞窟样本与隐藏线方向。',
    flavor: '你已经能把地点、线索、矿洞和旧物整理成真正有用的见闻体系。'
  },
  {
    id: 'mastery_life',
    label: '生活大师',
    skillRequirements: {
      farming: 18,
      fishing: 14,
      foraging: 14
    },
    rewardSummary: '后续可承接宠物、家居、祝福和家园成长方向。',
    flavor: '你擅长的不只是赚钱，而是让一整套生活循环彼此养起来。'
  },
  {
    id: 'mastery_ricefish_loop',
    label: '水田匠师',
    skillRequirements: {
      farming: 18,
      fishing: 18
    },
    rewardSummary: '后续可承接水田、鱼肥循环与鱼塘作物轻联动方向。',
    flavor: '你开始把田里的水、塘里的鱼和节令供货看成同一个循环。'
  },
  {
    id: 'mastery_artisan_foundry',
    label: '工台匠师',
    skillRequirements: {
      farming: 18,
      mining: 18
    },
    rewardSummary: '后续可承接高级工台、温室校准、工具精修与工坊扩展方向。',
    flavor: '你的农具和工坊不再只是消耗资源，而是在反过来校准整座农场。'
  },
  {
    id: 'mastery_wild_frontier',
    label: '险境行者',
    skillRequirements: {
      foraging: 18,
      combat: 18
    },
    rewardSummary: '后续可承接危险区域探索、隐藏节点与护送路线判断方向。',
    flavor: '你能读懂山林里的危险，也知道什么时候该绕路、什么时候该拔剑。'
  },
  {
    id: 'mastery_subterranean_tide',
    label: '地下水脉师',
    skillRequirements: {
      fishing: 18,
      mining: 18
    },
    rewardSummary: '后续可承接地下水域、矿洞鱼线与深层资源线索方向。',
    flavor: '你开始听见岩层里的水声，也知道哪些鱼会沿着暗河来到矿洞深处。'
  },
  {
    id: 'mastery_taoyuan_allrounder',
    label: '桃源全才',
    skillRequirements: {
      farming: 20,
      foraging: 20,
      fishing: 20,
      mining: 20,
      combat: 20
    },
    rewardSummary: '后续只承接称号、证书、展示和少量便利，不提供巨额倍率。',
    flavor: '你已经把桃源乡的每条长线都走到了能彼此照亮的程度。'
  }
]

export const MASTERY_REWARD_DEFS: MasteryRewardDef[] = [
  {
    id: 'blessing_altar',
    label: '每日祝福神像',
    unlockMasteryId: 'mastery_life',
    summary: '每天会给出一条轻度偏向，并接入体力、出货、寻宝、送礼等既有公式，让你更容易决定今天偏钓鱼、采集、挖矿还是社交。',
    panelHint: '小屋'
  },
  {
    id: 'trinket_slot',
    label: '护符 / 饰物位',
    unlockMasteryId: 'mastery_combat',
    summary: '角色信息和背包装备已接入专属饰物位，饰品调校会小幅强化已装备饰物的效果。',
    panelHint: '角色信息 / 背包装备'
  },
  {
    id: 'advanced_workbench',
    label: '高级工台权限',
    unlockMasteryId: 'mastery_artisan_foundry',
    summary: '解锁后才可制作仙灵炉这类高阶工台，用于承接护符、信物和终局加工。',
    panelHint: '加工坊 / 制造'
  },
  {
    id: 'transmutation_recipe',
    label: '稀有资源转化配方',
    unlockMasteryId: 'mastery_research',
    summary: '炼丹炉解锁隐藏转化丹方，消耗区域稀有材料与奇丹晶，并受每日主丹限次约束。',
    panelHint: '加工坊 / 炼丹炉'
  },
  {
    id: 'journey_map_markers',
    label: '特殊地图标记能力',
    unlockMasteryId: 'mastery_journey',
    summary: '行旅图摘要会标记本周焦点事件、路线承接和风险信号，偏规划能力，不直接增加奖励。',
    panelHint: '行旅图 / 新手路线'
  }
]
