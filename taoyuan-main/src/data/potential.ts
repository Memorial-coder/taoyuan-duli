import type {
  PotentialBranchDef,
  PotentialBranchId,
  PotentialEffectDef,
  PotentialEffectKey,
  PotentialNodeDef,
  PotentialNodeId,
  PotentialResourceCost,
  PotentialResourceDef,
  PotentialResourceId,
  PotentialSourceId,
  PotentialSourceRule
} from '@/types/potential'

export const POTENTIAL_BRANCH_DEFS: readonly PotentialBranchDef[] = [
  {
    id: 'body',
    label: '根骨',
    summary: '体质、恢复和容错，适合常下矿、远行或经常晚归的角色。',
    tone: 'body'
  },
  {
    id: 'craft',
    label: '巧作',
    summary: '加工、工具和工坊节奏，适合把产线和日常体力压得更稳。',
    tone: 'craft'
  },
  {
    id: 'trail',
    label: '山行',
    summary: '行旅、矿洞和采集信息，适合探索开放地图与高层矿洞。',
    tone: 'trail'
  },
  {
    id: 'harmony',
    label: '人和',
    summary: '委托、节庆和村社往来，适合用长期关系换更清晰的目标。',
    tone: 'harmony'
  }
]

export const POTENTIAL_RESOURCE_DEFS: readonly PotentialResourceDef[] = [
  {
    id: 'potential_insight',
    label: '潜能心得',
    summary: '多条长期结算都会沉淀的通用修行材料，常随首领、行旅、订单、主题周、考据和节会小游戏奖励出现。',
    branchHints: ['body', 'craft', 'trail', 'harmony']
  },
  {
    id: 'spirit_breath',
    label: '灵息',
    summary: '来自仙灵结缘记忆、孩童挚友甜点委托、日历节日出货箱有效结算，或节会小游戏有效完成的轻灵材料，偏向根骨与人和。',
    branchHints: ['body', 'harmony']
  },
  {
    id: 'artisan_notes',
    label: '百工札记',
    summary: '特殊订单、博物馆考据和研究券兑换等经营研究线带回的手艺记录，偏向巧作。',
    branchHints: ['craft']
  },
  {
    id: 'mountain_jade',
    label: '山行玉',
    summary: '矿洞首领、高层首领和高风险行旅中得到的山野凭证，偏向山行。',
    branchHints: ['trail']
  }
]

export const POTENTIAL_EFFECT_VALUES: Record<PotentialEffectKey, PotentialEffectDef> = {
  potential_max_hp_flat: {
    key: 'potential_max_hp_flat',
    label: '生命上限',
    mode: 'formula',
    valuePerRank: 2,
    cap: 60,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶生命上限 +2，最高 +60。'
  },
  potential_max_stamina_flat: {
    key: 'potential_max_stamina_flat',
    label: '体力上限',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶体力上限 +1，最高 +30。'
  },
  potential_passout_loss_reduction: {
    key: 'potential_passout_loss_reduction',
    label: '昏倒损失降低',
    mode: 'formula',
    valuePerRank: 0.005,
    cap: 0.15,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '每阶昏倒铜钱损失 -0.5%，最高 -15%。'
  },
  potential_short_rest_bonus: {
    key: 'potential_short_rest_bonus',
    label: '短休恢复',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶短休恢复效率 +1，最高 +30。'
  },
  potential_low_hp_hint: {
    key: 'potential_low_hp_hint',
    label: '低血提醒',
    mode: 'info',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶低血风险感知 +1，最高 +30。'
  },
  potential_processing_speed: {
    key: 'potential_processing_speed',
    label: '加工耗时',
    mode: 'formula',
    valuePerRank: 0.004,
    cap: 0.12,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '加工耗时最高缩短 12%，但不会低于 1 天。'
  },
  potential_tool_stamina_save: {
    key: 'potential_tool_stamina_save',
    label: '工具体力',
    mode: 'formula',
    valuePerRank: 0.003,
    cap: 0.09,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '工具体力消耗最高降低 9%，单次消耗仍至少 1 点。'
  },
  potential_alchemy_tolerance: {
    key: 'potential_alchemy_tolerance',
    label: '炼丹容错',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶炼丹容错 +1，最高 +30。'
  },
  potential_storage_efficiency: {
    key: 'potential_storage_efficiency',
    label: '仓储效率',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶仓储整理效率 +1，最高 +30。'
  },
  potential_workshop_hint: {
    key: 'potential_workshop_hint',
    label: '工坊提示',
    mode: 'info',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶工坊排产感知 +1，最高 +30。'
  },
  potential_journey_hazard_resist: {
    key: 'potential_journey_hazard_resist',
    label: '行旅压险',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶行旅压险 +1，最高 +30。'
  },
  potential_mine_entry_hint: {
    key: 'potential_mine_entry_hint',
    label: '矿洞进层提示',
    mode: 'info',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶矿洞进层感知 +1，最高 +30，不额外增加产出。'
  },
  potential_forage_window: {
    key: 'potential_forage_window',
    label: '采集窗口',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶采集窗口判断 +1，最高 +30。'
  },
  potential_expedition_reserve: {
    key: 'potential_expedition_reserve',
    label: '远征保全',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶远征保全判断 +1，最高 +30。'
  },
  potential_region_marker: {
    key: 'potential_region_marker',
    label: '区域标记',
    mode: 'info',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶区域路线感知 +1，最高 +30，不直接给奖励。'
  },
  potential_quest_bias: {
    key: 'potential_quest_bias',
    label: '委托偏向',
    mode: 'info',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶委托判断 +1，最高 +30。'
  },
  potential_festival_bonus: {
    key: 'potential_festival_bonus',
    label: '节庆收益',
    mode: 'formula',
    valuePerRank: 0.004,
    cap: 0.12,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '节庆窗口内指定物资出货最高 +12%。'
  },
  potential_gift_hint: {
    key: 'potential_gift_hint',
    label: '送礼提示',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶送礼判断 +1，最高 +30。'
  },
  potential_society_order: {
    key: 'potential_society_order',
    label: '村社订单',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶村社协同 +1，最高 +30。'
  },
  potential_visitor_chance: {
    key: 'potential_visitor_chance',
    label: '来访机缘',
    mode: 'formula',
    valuePerRank: 1,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶来访机缘判断 +1，最高 +30。'
  }
}

const c = (...costs: PotentialResourceCost[]): PotentialResourceCost[] => costs

export const POTENTIAL_NODE_MAX_RANK = 30

type PotentialCostProfile = 'light' | 'standard' | 'deep'

const POTENTIAL_COST_PROFILE_MULTIPLIERS: Record<PotentialCostProfile, number> = {
  light: 0.82,
  standard: 1,
  deep: 1.18
}

const getPotentialCostCurveAmount = (rank: number, base: 'insight' | 'branch', profile: PotentialCostProfile): number => {
  const multiplier = POTENTIAL_COST_PROFILE_MULTIPLIERS[profile]
  if (base === 'insight') {
    const curve = 1 + rank * 0.32 + Math.max(0, rank - 10) * 0.38 + Math.max(0, rank - 20) * 0.68
    return Math.max(1, Math.ceil(curve * multiplier))
  }
  const curve = 0.6 + rank * 0.16 + Math.max(0, rank - 12) * 0.22 + Math.max(0, rank - 22) * 0.36
  return Math.max(1, Math.ceil(curve * multiplier))
}

const buildPotentialCosts = (
  branchResourceId: Exclude<PotentialResourceId, 'potential_insight'>,
  profile: PotentialCostProfile = 'standard'
): PotentialResourceCost[][] =>
  Array.from({ length: POTENTIAL_NODE_MAX_RANK }, (_, index) => {
    const rank = index + 1
    return c(
      { resourceId: 'potential_insight', amount: getPotentialCostCurveAmount(rank, 'insight', profile) },
      { resourceId: branchResourceId, amount: getPotentialCostCurveAmount(rank, 'branch', profile) }
    )
  })

export const POTENTIAL_NODE_DEFS: readonly PotentialNodeDef[] = [
  {
    id: 'body_vital_root',
    branchId: 'body',
    label: '固本培元',
    summary: '把战斗与远行的容错先垫起来。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'standard'),
    unlockConditions: [],
    effectKey: 'potential_max_hp_flat',
    surface: '角色生命上限',
    firstVersionConnected: true
  },
  {
    id: 'body_stamina_channel',
    branchId: 'body',
    label: '气脉舒展',
    summary: '给日常工具、赶路和晚间收尾留一点余量。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'standard'),
    unlockConditions: [
      { kind: 'branchRank', branchId: 'body', value: 5, label: '根骨总阶达到 5' },
      { kind: 'randomNpcMilestone', milestone: 'random_acquaintance', value: 1, label: '结识 1 位随机来访熟人' }
    ],
    effectKey: 'potential_max_stamina_flat',
    surface: '角色体力上限',
    firstVersionConnected: true
  },
  {
    id: 'body_safe_fall',
    branchId: 'body',
    label: '护身余息',
    summary: '昏倒时少损失一些铜钱，但不会免除风险。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'standard'),
    unlockConditions: [
      { kind: 'branchRank', branchId: 'body', value: 18, label: '根骨总阶达到 18' },
      { kind: 'randomNpcMilestone', milestone: 'random_small_order', value: 1, label: '完成 1 次随机来客小委托' }
    ],
    effectKey: 'potential_passout_loss_reduction',
    surface: '晚归昏倒结算',
    firstVersionConnected: true
  },
  {
    id: 'body_short_rest',
    branchId: 'body',
    label: '片刻调息',
    summary: '把短休、歇脚和临时恢复做成更稳定的长期积累。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'light'),
    unlockConditions: [{ kind: 'totalRank', value: 35, label: '潜能总阶达到 35' }],
    effectKey: 'potential_short_rest_bonus',
    surface: '短休恢复效率',
    firstVersionConnected: true
  },
  {
    id: 'body_low_hp_sense',
    branchId: 'body',
    label: '危息自觉',
    summary: '在低血、深矿和高风险远行时强化危险感知。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'deep'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'body', value: 50, label: '根骨总阶达到 50' }],
    effectKey: 'potential_low_hp_hint',
    surface: '低血风险感知',
    firstVersionConnected: true
  },
  {
    id: 'craft_processing_flow',
    branchId: 'craft',
    label: '顺手成流',
    summary: '缩短工坊加工耗时，保留至少 1 天制作节奏。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('artisan_notes', 'standard'),
    unlockConditions: [],
    effectKey: 'potential_processing_speed',
    surface: '工坊加工耗时',
    firstVersionConnected: true
  },
  {
    id: 'craft_tool_rhythm',
    branchId: 'craft',
    label: '器用有度',
    summary: '日常工具更省体力，单次消耗仍至少 1 点。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('artisan_notes', 'standard'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 5, label: '巧作总阶达到 5' }],
    effectKey: 'potential_tool_stamina_save',
    surface: '农具和日常工具体力',
    firstVersionConnected: true
  },
  {
    id: 'craft_alchemy_patience',
    branchId: 'craft',
    label: '炉火耐心',
    summary: '让火候、配比和失败回看更稳定，降低手艺线的波动感。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('artisan_notes', 'standard'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 18, label: '巧作总阶达到 18' }],
    effectKey: 'potential_alchemy_tolerance',
    surface: '炼丹容错',
    firstVersionConnected: true
  },
  {
    id: 'craft_storage_order',
    branchId: 'craft',
    label: '仓中有序',
    summary: '让批量整理、分类和出入库更可控。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('artisan_notes', 'light'),
    unlockConditions: [{ kind: 'totalRank', value: 35, label: '潜能总阶达到 35' }],
    effectKey: 'potential_storage_efficiency',
    surface: '仓储整理效率',
    firstVersionConnected: true
  },
  {
    id: 'craft_workshop_hint',
    branchId: 'craft',
    label: '工坊手记',
    summary: '把加工排产、耗时和材料占用整理成更清楚的工坊判断。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('artisan_notes', 'deep'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 50, label: '巧作总阶达到 50' }],
    effectKey: 'potential_workshop_hint',
    surface: '工坊排产感知',
    firstVersionConnected: true
  },
  {
    id: 'trail_hazard_reading',
    branchId: 'trail',
    label: '识路避险',
    summary: '提高行旅构筑里的压险值，降低高风险路线波动。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('mountain_jade', 'standard'),
    unlockConditions: [],
    effectKey: 'potential_journey_hazard_resist',
    surface: '行旅图构筑',
    firstVersionConnected: true
  },
  {
    id: 'trail_mine_entry_hint',
    branchId: 'trail',
    label: '入洞听声',
    summary: '进入矿层时获得安全与路线提示，不增加矿石产出。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('mountain_jade', 'light'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 5, label: '山行总阶达到 5' }],
    effectKey: 'potential_mine_entry_hint',
    surface: '矿洞进层提示',
    firstVersionConnected: true
  },
  {
    id: 'trail_forage_window',
    branchId: 'trail',
    label: '识草看风',
    summary: '强化采集窗口、天气节奏和竹林路线判断。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('mountain_jade', 'standard'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 18, label: '山行总阶达到 18' }],
    effectKey: 'potential_forage_window',
    surface: '采集窗口判断',
    firstVersionConnected: true
  },
  {
    id: 'trail_expedition_reserve',
    branchId: 'trail',
    label: '回身留路',
    summary: '让远征撤退、失败止损和回程判断更稳。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('mountain_jade', 'light'),
    unlockConditions: [{ kind: 'totalRank', value: 35, label: '潜能总阶达到 35' }],
    effectKey: 'potential_expedition_reserve',
    surface: '远征保全判断',
    firstVersionConnected: true
  },
  {
    id: 'trail_region_marker',
    branchId: 'trail',
    label: '山图留记',
    summary: '区域图显示特殊关注标记，帮助判断下一步路线。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('mountain_jade', 'deep'),
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 50, label: '山行总阶达到 50' }],
    effectKey: 'potential_region_marker',
    surface: '区域图标记',
    firstVersionConnected: true
  },
  {
    id: 'harmony_quest_bias',
    branchId: 'harmony',
    label: '识人问事',
    summary: '任务板提示更适合当前成长线的委托方向。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'light'),
    unlockConditions: [{ kind: 'randomNpcMilestone', milestone: 'random_small_order', value: 1, label: '完成 1 次随机来客小委托' }],
    effectKey: 'potential_quest_bias',
    surface: '任务板提示',
    firstVersionConnected: true
  },
  {
    id: 'harmony_festival_supply',
    branchId: 'harmony',
    label: '会期周全',
    summary: '节庆窗口内给指定物资一点出货加成。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'standard'),
    unlockConditions: [
      { kind: 'branchRank', branchId: 'harmony', value: 5, label: '人和总阶达到 5' },
      { kind: 'randomNpcMilestone', milestone: 'random_long_stay', value: 1, label: '邀请 1 位随机 NPC 长住' }
    ],
    effectKey: 'potential_festival_bonus',
    surface: '节庆出货箱',
    firstVersionConnected: true
  },
  {
    id: 'harmony_gift_hint',
    branchId: 'harmony',
    label: '投其所好',
    summary: '让送礼偏好、关系节奏和来往机会更容易判断。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'standard'),
    unlockConditions: [
      { kind: 'branchRank', branchId: 'harmony', value: 18, label: '人和总阶达到 18' },
      { kind: 'randomNpcMilestone', milestone: 'random_family_tie', value: 1, label: '见过 1 位随机 NPC 家人' }
    ],
    effectKey: 'potential_gift_hint',
    surface: '送礼关系判断',
    firstVersionConnected: true
  },
  {
    id: 'harmony_society_order',
    branchId: 'harmony',
    label: '村社牵线',
    summary: '让村社订单、亲缘委托和协同目标更顺手。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'light'),
    unlockConditions: [
      { kind: 'totalRank', value: 35, label: '潜能总阶达到 35' },
      { kind: 'randomNpcMilestone', milestone: 'random_family_commission', value: 1, label: '完成 1 次随机 NPC 家人线委托' }
    ],
    effectKey: 'potential_society_order',
    surface: '村社订单协同',
    firstVersionConnected: true
  },
  {
    id: 'harmony_visitor_chance',
    branchId: 'harmony',
    label: '客来有缘',
    summary: '提高来访、长住故事和村镇事件的线索感知。',
    maxRank: POTENTIAL_NODE_MAX_RANK,
    costsByRank: buildPotentialCosts('spirit_breath', 'deep'),
    unlockConditions: [
      { kind: 'branchRank', branchId: 'harmony', value: 50, label: '人和总阶达到 50' },
      { kind: 'randomNpcMilestone', milestone: 'random_relationship_line', value: 1, label: '开启 1 条随机 NPC 关系线' },
      { kind: 'randomNpcMilestone', milestone: 'random_long_stay_story', value: 1, label: '推进 1 次随机长住故事' }
    ],
    effectKey: 'potential_visitor_chance',
    surface: '来访机缘判断',
    firstVersionConnected: true
  }
]

export const POTENTIAL_SOURCE_RULES: readonly PotentialSourceRule[] = [
  {
    id: 'mine_boss_clear',
    label: '矿洞首领结算',
    summary: '首次击败矿洞 Boss 稳定获得，复战和高层首领随层数有一定概率获得。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'mountain_jade', amount: 1 }
    ],
    cap: { period: 'daily', maxClaims: 2, maxResourceAmount: 4 }
  },
  {
    id: 'journey_high_risk',
    label: '高风险行旅',
    summary: '完成高风险路线、精英路线或区域首领远征时获得。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'mountain_jade', amount: 1 }
    ],
    cap: { period: 'daily', maxClaims: 2, maxResourceAmount: 4 }
  },
  {
    id: 'special_order_finish',
    label: '特殊订单',
    summary: '完成特殊订单和阶段性订单时获得通用心得。',
    rewards: [
      { resourceId: 'potential_insight', amount: 2 },
      { resourceId: 'artisan_notes', amount: 1 }
    ],
    cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 6 }
  },
  {
    id: 'theme_week_settlement',
    label: '主题周结算',
    summary: '主题周或周目标收尾时按表现补充通用心得。',
    rewards: [{ resourceId: 'potential_insight', amount: 3 }],
    cap: { period: 'weekly', maxClaims: 1, maxResourceAmount: 3 }
  },
  {
    id: 'museum_hidden_sample',
    label: '博物馆考据',
    summary: '领取捐赠里程碑、完成学者委托考据时获得专门材料。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'artisan_notes', amount: 1 }
    ],
    cap: { period: 'seasonal', maxClaims: 3, maxResourceAmount: 6 }
  },
  {
    id: 'festival_spirit_event',
    label: '灵息机缘',
    summary: '归档仙灵结缘记忆，或在有日历节日的当天完成出货箱结算时少量获得。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'spirit_breath', amount: 1 }
    ],
    cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 4 }
  },
  {
    id: 'festival_minigame_clear',
    label: '节会小游戏',
    summary: '在互动节日小游戏中取得有效成绩时少量获得，独立于仙灵记忆和节庆出货上限。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'spirit_breath', amount: 1 }
    ],
    cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 4 }
  },
  {
    id: 'child_spirit_sweets',
    label: '童心灵息委托',
    summary: '阿花或石头达到挚友后，告示板有概率刷出提交甜点/糕点的童心甜点委托，完成时获得。',
    rewards: [{ resourceId: 'spirit_breath', amount: 1 }],
    cap: { period: 'weekly', maxClaims: 1, maxResourceAmount: 1 }
  }
]

export const CONNECTED_POTENTIAL_EFFECT_KEYS = new Set<PotentialEffectKey>(
  Object.values(POTENTIAL_EFFECT_VALUES)
    .filter(effect => effect.firstVersionConnected)
    .map(effect => effect.key)
)

export const POTENTIAL_BRANCH_IDS = POTENTIAL_BRANCH_DEFS.map(branch => branch.id)
export const POTENTIAL_RESOURCE_IDS = POTENTIAL_RESOURCE_DEFS.map(resource => resource.id)
export const POTENTIAL_NODE_IDS = POTENTIAL_NODE_DEFS.map(node => node.id)

export const POTENTIAL_NODE_DEF_BY_ID = new Map<PotentialNodeId, PotentialNodeDef>(
  POTENTIAL_NODE_DEFS.map(node => [node.id, node])
)

export const POTENTIAL_SOURCE_RULE_BY_ID = new Map<PotentialSourceId, PotentialSourceRule>(
  POTENTIAL_SOURCE_RULES.map(rule => [rule.id, rule])
)

export const getPotentialBranchDef = (branchId: PotentialBranchId): PotentialBranchDef | undefined =>
  POTENTIAL_BRANCH_DEFS.find(branch => branch.id === branchId)

export const getPotentialNodeDef = (nodeId: PotentialNodeId): PotentialNodeDef | undefined =>
  POTENTIAL_NODE_DEF_BY_ID.get(nodeId)

export const getPotentialResourceDef = (resourceId: PotentialResourceId): PotentialResourceDef | undefined =>
  POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === resourceId)

export const getPotentialSourceRule = (sourceId: PotentialSourceId): PotentialSourceRule | undefined =>
  POTENTIAL_SOURCE_RULE_BY_ID.get(sourceId)

export const getPotentialNodesByBranch = (branchId: PotentialBranchId): readonly PotentialNodeDef[] =>
  POTENTIAL_NODE_DEFS.filter(node => node.branchId === branchId)

export const formatPotentialEffectValue = (effect: PotentialEffectDef, value: number): string => {
  if (effect.unit === 'percent') return `${Math.round(value * 100)}%`
  if (effect.unit === 'switch') return value > 0 ? '已显化' : '未显化'
  return `${Math.round(value)}`
}
