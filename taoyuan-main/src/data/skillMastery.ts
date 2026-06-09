import type { SkillMasteryEffectKey, SkillMasteryNodeDef, SkillType } from '@/types'

export const SKILL_MASTERY_NODE_DEFS: readonly SkillMasteryNodeDef[] = [
  {
    id: 'farming_batch_irrigation',
    skillType: 'farming',
    label: '批量灌溉',
    summary: '为后续批量浇水、耕作效率和农场自动化预留能力钩子。',
    cost: 1,
    effectKey: 'batch_irrigation'
  },
  {
    id: 'farming_festival_supply',
    skillType: 'farming',
    label: '节庆供货',
    summary: '为后续节庆订单、应季作物供货和高端农产收益预留能力钩子。',
    cost: 1,
    effectKey: 'festival_supply'
  },
  {
    id: 'farming_processing_flow',
    skillType: 'farming',
    label: '加工流线',
    summary: '为后续加工队列、精品转化和农产深加工预留能力钩子。',
    cost: 1,
    effectKey: 'processing_flow'
  },
  {
    id: 'foraging_rare_signal',
    skillType: 'foraging',
    label: '稀有信号',
    summary: '稀有采集物的出现概率提高 20%。',
    cost: 1,
    effectKey: 'rare_signal'
  },
  {
    id: 'foraging_journey_scout',
    skillType: 'foraging',
    label: '旅途侦察',
    summary: '为后续外出探索路线、资源预览和旅途事件预留能力钩子。',
    cost: 1,
    effectKey: 'journey_scout'
  },
  {
    id: 'foraging_weather_window',
    skillType: 'foraging',
    label: '天候窗口',
    summary: '采集环境窗口激活时，采集概率额外提高 15%。',
    cost: 1,
    effectKey: 'weather_window'
  },
  {
    id: 'fishing_tide_marker',
    skillType: 'fishing',
    label: '潮汐标记',
    summary: '为后续稀有鱼窗口提示、鱼汛追踪和水域预报预留能力钩子。',
    cost: 1,
    effectKey: 'tide_marker'
  },
  {
    id: 'fishing_pond_link',
    skillType: 'fishing',
    label: '鱼塘联动',
    summary: '为后续鱼塘收益、钓鱼记录和养殖反馈预留能力钩子。',
    cost: 1,
    effectKey: 'pond_link'
  },
  {
    id: 'fishing_legend_weight',
    skillType: 'fishing',
    label: '传奇称重',
    summary: '为后续传奇鱼记录、称重奖励和竞赛展示预留能力钩子。',
    cost: 1,
    effectKey: 'legend_weight'
  },
  {
    id: 'mining_floor_intel',
    skillType: 'mining',
    label: '层位情报',
    summary: '为后续矿层目标预报、稀有矿脉提示和深层路线预留能力钩子。',
    cost: 1,
    effectKey: 'floor_intel'
  },
  {
    id: 'mining_bomb_efficiency',
    skillType: 'mining',
    label: '爆破效率',
    summary: '使用炸弹时有 20% 概率返还本次炸弹。',
    cost: 1,
    effectKey: 'bomb_efficiency'
  },
  {
    id: 'mining_rare_transmute',
    skillType: 'mining',
    label: '稀矿转化',
    summary: '为后续稀有矿石保底、兑换和转化配方预留能力钩子。',
    cost: 1,
    effectKey: 'rare_transmute'
  },
  {
    id: 'combat_boss_pressure',
    skillType: 'combat',
    label: '首领压制',
    summary: '击败 Boss 时，战斗经验和 Boss 铜钱奖励提高 15%。',
    cost: 1,
    effectKey: 'boss_pressure'
  },
  {
    id: 'combat_escort_margin',
    skillType: 'combat',
    label: '护送余裕',
    summary: '为后续护送、远行容错和危险区域撤退预留能力钩子。',
    cost: 1,
    effectKey: 'escort_margin'
  },
  {
    id: 'combat_trinket_tuning',
    skillType: 'combat',
    label: '饰品调校',
    summary: '为后续饰品词条、套装调整和战备构筑预留能力钩子。',
    cost: 1,
    effectKey: 'trinket_tuning'
  }
]

export const getSkillMasteryNodeDefs = (skillType: SkillType): readonly SkillMasteryNodeDef[] =>
  SKILL_MASTERY_NODE_DEFS.filter(node => node.skillType === skillType)

export const SKILL_MASTERY_EFFECT_VALUES: Record<SkillMasteryEffectKey, number> = {
  batch_irrigation: 0,
  festival_supply: 0,
  processing_flow: 0,
  rare_signal: 0.2,
  journey_scout: 0,
  weather_window: 0.15,
  tide_marker: 0,
  pond_link: 0,
  legend_weight: 0,
  floor_intel: 0,
  bomb_efficiency: 0.2,
  rare_transmute: 0,
  boss_pressure: 0.15,
  escort_margin: 0,
  trinket_tuning: 0
}
