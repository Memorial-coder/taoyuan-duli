import type { SkillMasteryEffectKey, SkillMasteryNodeDef, SkillType } from '@/types'

export const SKILL_MASTERY_NODE_DEFS: readonly SkillMasteryNodeDef[] = [
  {
    id: 'farming_batch_irrigation',
    skillType: 'farming',
    label: '批量灌溉',
    summary: '一键浇水体力消耗降低 50%，最低仍为 1 点。',
    cost: 1,
    effectKey: 'batch_irrigation'
  },
  {
    id: 'farming_festival_supply',
    skillType: 'farming',
    label: '节庆供货',
    summary: '节庆日出货箱中的作物和加工品收入提高 15%。',
    cost: 1,
    effectKey: 'festival_supply'
  },
  {
    id: 'farming_processing_flow',
    skillType: 'farming',
    label: '加工流线',
    summary: '工坊加工耗时缩短 25%，最低仍为 1 天。',
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
    summary: '远行构筑的侦察值提高 8 点，更容易提前发现路线资源。',
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
    summary: '在钓鱼页标记当前季节、天气可遇到的传说鱼窗口。',
    cost: 1,
    effectKey: 'tide_marker'
  },
  {
    id: 'fishing_pond_link',
    skillType: 'fishing',
    label: '鱼塘联动',
    summary: '鱼塘每日产出判定概率提高 10 个百分点。',
    cost: 1,
    effectKey: 'pond_link'
  },
  {
    id: 'fishing_legend_weight',
    skillType: 'fishing',
    label: '传奇称重',
    summary: '钓上传说鱼时，钓鱼经验额外提高 25%。',
    cost: 1,
    effectKey: 'legend_weight'
  },
  {
    id: 'mining_floor_intel',
    skillType: 'mining',
    label: '层位情报',
    summary: '进入新矿层时提示本层特殊类型和主要矿石。',
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
    summary: '手动采矿时有 15% 概率额外转化出 1 个更高阶矿石。',
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
    summary: '远行构筑的压险值提高 10 点，危险区域容错更高。',
    cost: 1,
    effectKey: 'escort_margin'
  },
  {
    id: 'combat_trinket_tuning',
    skillType: 'combat',
    label: '饰品调校',
    summary: '已装备饰品提供的数值效果提高 10%。',
    cost: 1,
    effectKey: 'trinket_tuning'
  }
]

export const getSkillMasteryNodeDefs = (skillType: SkillType): readonly SkillMasteryNodeDef[] =>
  SKILL_MASTERY_NODE_DEFS.filter(node => node.skillType === skillType)

export const SKILL_MASTERY_EFFECT_VALUES: Record<SkillMasteryEffectKey, number> = {
  batch_irrigation: 0.5,
  festival_supply: 0.15,
  processing_flow: 0.25,
  rare_signal: 0.2,
  journey_scout: 8,
  weather_window: 0.15,
  tide_marker: 1,
  pond_link: 0.1,
  legend_weight: 0.25,
  floor_intel: 1,
  bomb_efficiency: 0.2,
  rare_transmute: 0.15,
  boss_pressure: 0.15,
  escort_margin: 10,
  trinket_tuning: 0.1
}
