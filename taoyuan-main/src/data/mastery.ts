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
  }
]

export const MASTERY_REWARD_DEFS: MasteryRewardDef[] = [
  {
    id: 'blessing_altar',
    label: '每日祝福神像',
    unlockMasteryId: 'mastery_life',
    summary: '每天会给出一条轻度偏向，让你更容易决定今天偏钓鱼、采集、挖矿还是社交。',
    panelHint: '小屋'
  },
  {
    id: 'trinket_slot',
    label: '护符 / 饰物位',
    unlockMasteryId: 'mastery_combat',
    summary: '角色信息里会出现专属饰物位，后续可承接护符与战备小构筑。',
    panelHint: '角色信息'
  },
  {
    id: 'advanced_workbench',
    label: '高级工台权限',
    unlockMasteryId: 'mastery_mining',
    summary: '设施页会先提示高阶工台与精修加工位的后续方向。',
    panelHint: '设施'
  },
  {
    id: 'transmutation_recipe',
    label: '稀有资源转化配方',
    unlockMasteryId: 'mastery_research',
    summary: '精通会先标出更深层资源转化与研究型加工的后续方向。',
    panelHint: '技能 / 后续加工线'
  },
  {
    id: 'journey_map_markers',
    label: '特殊地图标记能力',
    unlockMasteryId: 'mastery_journey',
    summary: '资料与行旅系统会先提示更偏路线和远征判断的标记能力方向。',
    panelHint: '新手路线 / 行旅图'
  }
]
