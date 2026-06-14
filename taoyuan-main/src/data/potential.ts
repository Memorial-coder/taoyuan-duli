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
    summary: '从长期目标、主题周和精研结算中沉淀的通用修行材料。',
    branchHints: ['body', 'craft', 'trail', 'harmony']
  },
  {
    id: 'spirit_breath',
    label: '灵息',
    summary: '来自仙灵、节庆和旅途异象的轻灵材料，偏向根骨与人和。',
    branchHints: ['body', 'harmony']
  },
  {
    id: 'artisan_notes',
    label: '百工札记',
    summary: '工坊、订单和瀚海贸易带回的手艺记录，偏向巧作。',
    branchHints: ['craft']
  },
  {
    id: 'mountain_jade',
    label: '山行玉',
    summary: '采集、矿洞和远征中得到的山野凭证，偏向山行。',
    branchHints: ['trail']
  }
]

export const POTENTIAL_EFFECT_VALUES: Record<PotentialEffectKey, PotentialEffectDef> = {
  potential_max_hp_flat: {
    key: 'potential_max_hp_flat',
    label: '生命上限',
    mode: 'formula',
    valuePerRank: 10,
    cap: 30,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶生命上限 +10，最高 +30。'
  },
  potential_max_stamina_flat: {
    key: 'potential_max_stamina_flat',
    label: '体力上限',
    mode: 'formula',
    valuePerRank: 3,
    cap: 9,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶体力上限 +3，最高 +9。'
  },
  potential_passout_loss_reduction: {
    key: 'potential_passout_loss_reduction',
    label: '昏倒损失降低',
    mode: 'formula',
    valuePerRank: 0.05,
    cap: 0.15,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '每阶昏倒铜钱损失 -5%，最高 -15%。'
  },
  potential_short_rest_bonus: {
    key: 'potential_short_rest_bonus',
    label: '短休恢复',
    mode: 'reserved',
    valuePerRank: 2,
    cap: 6,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留短休恢复强化，首版先展示方向。'
  },
  potential_low_hp_hint: {
    key: 'potential_low_hp_hint',
    label: '低血提醒',
    mode: 'info',
    valuePerRank: 1,
    cap: 1,
    unit: 'switch',
    firstVersionConnected: false,
    playerSummary: '预留低血风险提醒，首版先展示方向。'
  },
  potential_processing_speed: {
    key: 'potential_processing_speed',
    label: '加工耗时',
    mode: 'formula',
    valuePerRank: 0.034,
    cap: 0.1,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '加工耗时最高缩短 10%，但不会低于 1 天。'
  },
  potential_tool_stamina_save: {
    key: 'potential_tool_stamina_save',
    label: '工具体力',
    mode: 'formula',
    valuePerRank: 0.02,
    cap: 0.06,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '工具体力消耗最高降低 6%，单次消耗仍至少 1 点。'
  },
  potential_alchemy_tolerance: {
    key: 'potential_alchemy_tolerance',
    label: '炼丹容错',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留炼丹容错，首版先展示方向。'
  },
  potential_storage_efficiency: {
    key: 'potential_storage_efficiency',
    label: '仓储效率',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留仓储效率，首版先展示方向。'
  },
  potential_workshop_hint: {
    key: 'potential_workshop_hint',
    label: '工坊提示',
    mode: 'info',
    valuePerRank: 1,
    cap: 1,
    unit: 'switch',
    firstVersionConnected: false,
    playerSummary: '预留工坊排产提示，首版先展示方向。'
  },
  potential_journey_hazard_resist: {
    key: 'potential_journey_hazard_resist',
    label: '行旅压险',
    mode: 'formula',
    valuePerRank: 3,
    cap: 9,
    unit: 'flat',
    firstVersionConnected: true,
    playerSummary: '每阶行旅压险 +3，最高 +9。'
  },
  potential_mine_entry_hint: {
    key: 'potential_mine_entry_hint',
    label: '矿洞进层提示',
    mode: 'info',
    valuePerRank: 1,
    cap: 1,
    unit: 'switch',
    firstVersionConnected: true,
    playerSummary: '进入矿层时补充更清晰的安全提示，不额外增加产出。'
  },
  potential_forage_window: {
    key: 'potential_forage_window',
    label: '采集窗口',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留采集窗口提示，首版先展示方向。'
  },
  potential_expedition_reserve: {
    key: 'potential_expedition_reserve',
    label: '远征保全',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留远征撤退保全，首版先展示方向。'
  },
  potential_region_marker: {
    key: 'potential_region_marker',
    label: '区域标记',
    mode: 'info',
    valuePerRank: 1,
    cap: 1,
    unit: 'switch',
    firstVersionConnected: true,
    playerSummary: '区域图会显示特殊关注标记，不直接给奖励。'
  },
  potential_quest_bias: {
    key: 'potential_quest_bias',
    label: '委托偏向',
    mode: 'info',
    valuePerRank: 1,
    cap: 1,
    unit: 'switch',
    firstVersionConnected: true,
    playerSummary: '任务板会提示更适合当前成长线的委托方向。'
  },
  potential_festival_bonus: {
    key: 'potential_festival_bonus',
    label: '节庆收益',
    mode: 'formula',
    valuePerRank: 0.03,
    cap: 0.09,
    unit: 'percent',
    firstVersionConnected: true,
    playerSummary: '节庆窗口内指定物资出货最高 +9%。'
  },
  potential_gift_hint: {
    key: 'potential_gift_hint',
    label: '送礼提示',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留送礼提示，首版先展示方向。'
  },
  potential_society_order: {
    key: 'potential_society_order',
    label: '村社订单',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留村社订单协同，首版先展示方向。'
  },
  potential_visitor_chance: {
    key: 'potential_visitor_chance',
    label: '来访机缘',
    mode: 'reserved',
    valuePerRank: 1,
    cap: 3,
    unit: 'flat',
    firstVersionConnected: false,
    playerSummary: '预留来访机缘，首版先展示方向。'
  }
}

const c = (...costs: PotentialResourceCost[]): PotentialResourceCost[] => costs

export const POTENTIAL_NODE_DEFS: readonly PotentialNodeDef[] = [
  {
    id: 'body_vital_root',
    branchId: 'body',
    label: '固本培元',
    summary: '把战斗与远行的容错先垫起来。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 2 })
    ],
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
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'spirit_breath', amount: 1 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'body', value: 1, label: '根骨总阶达到 1' }],
    effectKey: 'potential_max_stamina_flat',
    surface: '角色体力上限',
    firstVersionConnected: true
  },
  {
    id: 'body_safe_fall',
    branchId: 'body',
    label: '护身余息',
    summary: '昏倒时少损失一些铜钱，但不会免除风险。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 2 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'spirit_breath', amount: 2 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'body', value: 3, label: '根骨总阶达到 3' }],
    effectKey: 'potential_passout_loss_reduction',
    surface: '晚归昏倒结算',
    firstVersionConnected: true
  },
  {
    id: 'body_short_rest',
    branchId: 'body',
    label: '片刻调息',
    summary: '预留短休恢复强化，后续接入小屋与营地。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'spirit_breath', amount: 1 })
    ],
    unlockConditions: [{ kind: 'totalRank', value: 5, label: '潜能总阶达到 5' }],
    effectKey: 'potential_short_rest_bonus',
    surface: '短休恢复预留',
    firstVersionConnected: false
  },
  {
    id: 'body_low_hp_sense',
    branchId: 'body',
    label: '危息自觉',
    summary: '预留低血量提醒，适合后续接入矿洞与远征提示。',
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 })],
    unlockConditions: [{ kind: 'branchRank', branchId: 'body', value: 6, label: '根骨总阶达到 6' }],
    effectKey: 'potential_low_hp_hint',
    surface: '低血提醒预留',
    firstVersionConnected: false
  },
  {
    id: 'craft_processing_flow',
    branchId: 'craft',
    label: '顺手成流',
    summary: '缩短工坊加工耗时，保留至少 1 天制作节奏。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'artisan_notes', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 2 })
    ],
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
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'artisan_notes', amount: 1 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 1, label: '巧作总阶达到 1' }],
    effectKey: 'potential_tool_stamina_save',
    surface: '农具和日常工具体力',
    firstVersionConnected: true
  },
  {
    id: 'craft_alchemy_patience',
    branchId: 'craft',
    label: '炉火耐心',
    summary: '预留炼丹容错，后续接入火候结果。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'artisan_notes', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 2 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'artisan_notes', amount: 2 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 3, label: '巧作总阶达到 3' }],
    effectKey: 'potential_alchemy_tolerance',
    surface: '炼丹容错预留',
    firstVersionConnected: false
  },
  {
    id: 'craft_storage_order',
    branchId: 'craft',
    label: '仓中有序',
    summary: '预留仓储效率，让后续批量整理更可控。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'artisan_notes', amount: 1 })
    ],
    unlockConditions: [{ kind: 'totalRank', value: 5, label: '潜能总阶达到 5' }],
    effectKey: 'potential_storage_efficiency',
    surface: '仓储效率预留',
    firstVersionConnected: false
  },
  {
    id: 'craft_workshop_hint',
    branchId: 'craft',
    label: '工坊手记',
    summary: '预留工坊排产提示，方便后续接入加工页。',
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'artisan_notes', amount: 1 })],
    unlockConditions: [{ kind: 'branchRank', branchId: 'craft', value: 6, label: '巧作总阶达到 6' }],
    effectKey: 'potential_workshop_hint',
    surface: '工坊提示预留',
    firstVersionConnected: false
  },
  {
    id: 'trail_hazard_reading',
    branchId: 'trail',
    label: '识路避险',
    summary: '提高行旅构筑里的压险值，降低高风险路线波动。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'mountain_jade', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'mountain_jade', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'mountain_jade', amount: 2 })
    ],
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
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'mountain_jade', amount: 1 })],
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 1, label: '山行总阶达到 1' }],
    effectKey: 'potential_mine_entry_hint',
    surface: '矿洞进层提示',
    firstVersionConnected: true
  },
  {
    id: 'trail_forage_window',
    branchId: 'trail',
    label: '识草看风',
    summary: '预留采集窗口提示，后续接入竹林和天气窗口。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'mountain_jade', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'mountain_jade', amount: 2 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'mountain_jade', amount: 2 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 3, label: '山行总阶达到 3' }],
    effectKey: 'potential_forage_window',
    surface: '采集窗口预留',
    firstVersionConnected: false
  },
  {
    id: 'trail_expedition_reserve',
    branchId: 'trail',
    label: '回身留路',
    summary: '预留远征撤退保全，后续接入失败结算。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'mountain_jade', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'mountain_jade', amount: 1 })
    ],
    unlockConditions: [{ kind: 'totalRank', value: 5, label: '潜能总阶达到 5' }],
    effectKey: 'potential_expedition_reserve',
    surface: '远征保全预留',
    firstVersionConnected: false
  },
  {
    id: 'trail_region_marker',
    branchId: 'trail',
    label: '山图留记',
    summary: '区域图显示特殊关注标记，帮助判断下一步路线。',
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'mountain_jade', amount: 1 })],
    unlockConditions: [{ kind: 'branchRank', branchId: 'trail', value: 6, label: '山行总阶达到 6' }],
    effectKey: 'potential_region_marker',
    surface: '区域图标记',
    firstVersionConnected: true
  },
  {
    id: 'harmony_quest_bias',
    branchId: 'harmony',
    label: '识人问事',
    summary: '任务板提示更适合当前成长线的委托方向。',
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'spirit_breath', amount: 1 })],
    unlockConditions: [],
    effectKey: 'potential_quest_bias',
    surface: '任务板提示',
    firstVersionConnected: true
  },
  {
    id: 'harmony_festival_supply',
    branchId: 'harmony',
    label: '会期周全',
    summary: '节庆窗口内给指定物资一点出货加成。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 2 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'harmony', value: 1, label: '人和总阶达到 1' }],
    effectKey: 'potential_festival_bonus',
    surface: '节庆出货箱',
    firstVersionConnected: true
  },
  {
    id: 'harmony_gift_hint',
    branchId: 'harmony',
    label: '投其所好',
    summary: '预留送礼提示，后续接入村民关系页。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'spirit_breath', amount: 1 })
    ],
    unlockConditions: [{ kind: 'branchRank', branchId: 'harmony', value: 3, label: '人和总阶达到 3' }],
    effectKey: 'potential_gift_hint',
    surface: '送礼提示预留',
    firstVersionConnected: false
  },
  {
    id: 'harmony_society_order',
    branchId: 'harmony',
    label: '村社牵线',
    summary: '预留村社订单协同，后续接入村社组织。',
    maxRank: 3,
    costsByRank: [
      c({ resourceId: 'potential_insight', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 }),
      c({ resourceId: 'potential_insight', amount: 3 }, { resourceId: 'spirit_breath', amount: 1 })
    ],
    unlockConditions: [{ kind: 'totalRank', value: 5, label: '潜能总阶达到 5' }],
    effectKey: 'potential_society_order',
    surface: '村社订单预留',
    firstVersionConnected: false
  },
  {
    id: 'harmony_visitor_chance',
    branchId: 'harmony',
    label: '客来有缘',
    summary: '预留来访机缘，后续接入稀有访客和村镇事件。',
    maxRank: 1,
    costsByRank: [c({ resourceId: 'potential_insight', amount: 2 }, { resourceId: 'spirit_breath', amount: 1 })],
    unlockConditions: [{ kind: 'branchRank', branchId: 'harmony', value: 6, label: '人和总阶达到 6' }],
    effectKey: 'potential_visitor_chance',
    surface: '来访机缘预留',
    firstVersionConnected: false
  }
]

export const POTENTIAL_SOURCE_RULES: readonly PotentialSourceRule[] = [
  {
    id: 'mine_boss_clear',
    label: '矿洞首领结算',
    summary: '击败矿洞 Boss 或高层首领时少量获得。',
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
    summary: '捐赠稀有样本、考据隐藏样本时获得专门材料。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'artisan_notes', amount: 1 }
    ],
    cap: { period: 'seasonal', maxClaims: 3, maxResourceAmount: 6 }
  },
  {
    id: 'festival_spirit_event',
    label: '节庆灵息',
    summary: '节庆或仙灵相关事件中少量获得。',
    rewards: [
      { resourceId: 'potential_insight', amount: 1 },
      { resourceId: 'spirit_breath', amount: 1 }
    ],
    cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 4 }
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
