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
    id: 'farming_seed_recovery',
    skillType: 'farming',
    label: '良种回收',
    summary: '收获优质及以上作物时小概率回收 1 粒原种；远古果等高风险作物不触发。',
    cost: 2,
    effectKey: 'seed_recovery'
  },
  {
    id: 'farming_order_deed',
    skillType: 'farming',
    label: '订单田契',
    summary: '任务页会提前标出当前委托中涉及作物的需求，帮助安排播种。',
    cost: 2,
    effectKey: 'order_deed'
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
    id: 'foraging_mountain_hunch',
    skillType: 'foraging',
    label: '山路预感',
    summary: '采集页会提示今日最值得留意的稀有采集物，不直接提高产出。',
    cost: 2,
    effectKey: 'mountain_hunch'
  },
  {
    id: 'foraging_herb_sample',
    skillType: 'foraging',
    label: '药材留样',
    summary: '首次采到稀有草药和山野素材时，将样本记入见闻账本，不直接翻倍产出。',
    cost: 2,
    effectKey: 'herb_sample'
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
    id: 'fishing_pond_pedigree',
    skillType: 'fishing',
    label: '鱼塘谱系',
    summary: '鱼塘详情会显示产出率、封顶、繁殖和周赛适配信息，不直接提高产出。',
    cost: 2,
    effectKey: 'pond_pedigree'
  },
  {
    id: 'fishing_tide_notebook',
    skillType: 'fishing',
    label: '鱼汛笔记',
    summary: '连续在同一钓点作钓会轻微提高该钓点鱼的上钩权重，并有封顶。',
    cost: 2,
    effectKey: 'tide_notebook'
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
    id: 'mining_vein_marker',
    skillType: 'mining',
    label: '矿脉标记',
    summary: '进入矿层时提示一处高价值格子的相对方位，不直接揭开或采集。',
    cost: 2,
    effectKey: 'vein_marker'
  },
  {
    id: 'mining_stabilized_blasting',
    skillType: 'mining',
    label: '稳压爆破',
    summary: '炸弹完全空爆时返还本次炸弹，降低误点损失；命中奖励时不额外返还。',
    cost: 2,
    effectKey: 'stabilized_blasting'
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
  },
  {
    id: 'combat_boss_dossier',
    skillType: 'combat',
    label: '首领档案',
    summary: '遭遇 Boss 时显示生命、攻击和防御摘要；击败过的 Boss 会显示复战弱化提示。',
    cost: 2,
    effectKey: 'boss_dossier'
  },
  {
    id: 'combat_escort_discipline',
    skillType: 'combat',
    label: '护送纪律',
    summary: '远行构筑获得少量撤退余裕，失败时损失更可控，但不会免除失败。',
    cost: 2,
    effectKey: 'escort_discipline'
  }
]

export const getSkillMasteryNodeDefs = (skillType: SkillType): readonly SkillMasteryNodeDef[] =>
  SKILL_MASTERY_NODE_DEFS.filter(node => node.skillType === skillType)

export const SKILL_MASTERY_EFFECT_VALUES: Record<SkillMasteryEffectKey, number> = {
  batch_irrigation: 0.5,
  festival_supply: 0.15,
  processing_flow: 0.25,
  seed_recovery: 1,
  order_deed: 1,
  rare_signal: 0.2,
  journey_scout: 8,
  weather_window: 0.15,
  mountain_hunch: 1,
  herb_sample: 1,
  tide_marker: 1,
  pond_link: 0.1,
  legend_weight: 0.25,
  pond_pedigree: 1,
  tide_notebook: 0.25,
  floor_intel: 1,
  bomb_efficiency: 0.2,
  rare_transmute: 0.15,
  vein_marker: 1,
  stabilized_blasting: 1,
  boss_pressure: 0.15,
  escort_margin: 10,
  trinket_tuning: 0.1,
  boss_dossier: 1,
  escort_discipline: 0.08
}
