import type { EquipmentEffect, EquipmentEffectType, ForgeAffixQuality, ForgeAffixRoll } from '@/types'

export type ForgeAffixTarget = 'weapon' | 'pickaxe' | 'ring' | 'hat' | 'shoe'
export type ForgeAffixMode = 'random' | 'directed' | 'protected' | 'deep_refine'
export type ForgeAffixDirectionId =
  | 'weapon_output'
  | 'weapon_survival'
  | 'weapon_efficiency'
  | 'weapon_slayer'
  | 'weapon_durability'
  | 'pickaxe_efficiency'
  | 'pickaxe_yield'
  | 'pickaxe_quarry_deep'
  | 'ring_profit'
  | 'ring_combat'
  | 'ring_treasure'
  | 'ring_durability'
  | 'hat_defense'
  | 'hat_farming'
  | 'hat_experience'
  | 'hat_durability'
  | 'shoe_movement'
  | 'shoe_stamina'
  | 'shoe_mining'
  | 'shoe_durability'

export type ForgeAffixEffectType =
  | EquipmentEffectType
  | 'weapon_damage_reduction'
  | 'weapon_combat_time_reduction'
  | 'weapon_defense_ignore'
  | 'weapon_spirit_damage'
  | 'weapon_bug_damage'
  | 'weapon_exorcist_crit'
  | 'weapon_extra_strike_chance'
  | 'weapon_haymaker_chance'
  | 'pickaxe_stone_chips_chance'
  | 'pickaxe_stamina_reduction'
  | 'pickaxe_time_reduction'
  | 'pickaxe_ore_bonus_chance'
  | 'pickaxe_ore_smelter_chance'
  | 'pickaxe_treasure_sense_chance'
  | 'pickaxe_quarry_double_chance'
  | 'pickaxe_quarry_deep_stamina_reduction'
  | 'pickaxe_quarry_artifact_chance'
  | 'durability_bonus'
  | 'durability_consumption_reduction'

type ForgeAffixDisplayKind = 'flat' | 'percent' | 'reduction'

export interface ForgeAffixDef {
  id: string
  name: string
  target: ForgeAffixTarget
  directions: ForgeAffixDirectionId[]
  effectType: ForgeAffixEffectType
  equipmentEffectType?: EquipmentEffectType
  min: number
  max: number
  step: number
  defaultValue: number
  displayKind: ForgeAffixDisplayKind
  description: string
}

export interface ForgeAffixDirectionDef {
  id: ForgeAffixDirectionId
  target: ForgeAffixTarget
  label: string
  description: string
  affixIds: string[]
}

export interface ForgeAffixModeDef {
  id: ForgeAffixMode
  label: string
  description: string
  minLevel: number
  cost: number
  materials: { itemId: string; quantity: number }[]
}

export const FORGE_AFFIX_QUALITY_LABELS: Record<ForgeAffixQuality, string> = {
  normal: '普通',
  fine: '优良',
  excellent: '卓越',
  supreme: '极品'
}

const percent = (value: number) => value

export const FORGE_AFFIXES: Record<string, ForgeAffixDef> = {
  sharp: {
    id: 'sharp',
    name: '锋利',
    target: 'weapon',
    directions: ['weapon_output'],
    effectType: 'attack_bonus',
    min: 2,
    max: 6,
    step: 1,
    defaultValue: 3,
    displayKind: 'flat',
    description: '攻击力提升。'
  },
  fierce: {
    id: 'fierce',
    name: '炽烈',
    target: 'weapon',
    directions: ['weapon_output'],
    effectType: 'attack_bonus',
    min: 5,
    max: 10,
    step: 1,
    defaultValue: 5,
    displayKind: 'flat',
    description: '攻击力大幅提升。'
  },
  precise: {
    id: 'precise',
    name: '精准',
    target: 'weapon',
    directions: ['weapon_output'],
    effectType: 'crit_rate_bonus',
    min: percent(0.06),
    max: percent(0.16),
    step: percent(0.01),
    defaultValue: percent(0.1),
    displayKind: 'percent',
    description: '暴击率提升。'
  },
  vampiric: {
    id: 'vampiric',
    name: '吸血',
    target: 'weapon',
    directions: ['weapon_survival'],
    effectType: 'vampiric',
    min: percent(0.08),
    max: percent(0.18),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'percent',
    description: '造成伤害时按比例回复生命。'
  },
  sturdy: {
    id: 'sturdy',
    name: '坚韧',
    target: 'weapon',
    directions: ['weapon_survival'],
    effectType: 'weapon_damage_reduction',
    min: percent(0.08),
    max: percent(0.18),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '受到的伤害降低。'
  },
  lucky: {
    id: 'lucky',
    name: '幸运',
    target: 'weapon',
    directions: ['weapon_efficiency'],
    effectType: 'monster_drop_bonus',
    min: percent(0.1),
    max: percent(0.26),
    step: percent(0.01),
    defaultValue: percent(0.2),
    displayKind: 'percent',
    description: '怪物掉落率提升。'
  },
  swift: {
    id: 'swift',
    name: '迅捷',
    target: 'weapon',
    directions: ['weapon_efficiency'],
    effectType: 'weapon_combat_time_reduction',
    min: percent(0.08),
    max: percent(0.18),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '矿洞战斗行动耗时降低。'
  },
  armor_breaker: {
    id: 'armor_breaker',
    name: '破甲',
    target: 'weapon',
    directions: ['weapon_slayer', 'weapon_output'],
    effectType: 'weapon_defense_ignore',
    min: percent(0.18),
    max: percent(0.38),
    step: percent(0.01),
    defaultValue: percent(0.3),
    displayKind: 'percent',
    description: '攻击时无视目标部分防御。'
  },
  spirit_slayer: {
    id: 'spirit_slayer',
    name: '镇魂',
    target: 'weapon',
    directions: ['weapon_slayer'],
    effectType: 'weapon_spirit_damage',
    min: percent(0.16),
    max: percent(0.36),
    step: percent(0.01),
    defaultValue: percent(0.25),
    displayKind: 'percent',
    description: '对幽魂、暗影、虚空与亡骨类敌人伤害提升。'
  },
  bug_slayer: {
    id: 'bug_slayer',
    name: '虫猎',
    target: 'weapon',
    directions: ['weapon_slayer'],
    effectType: 'weapon_bug_damage',
    min: percent(0.22),
    max: percent(0.46),
    step: percent(0.01),
    defaultValue: percent(0.35),
    displayKind: 'percent',
    description: '对虫、蛛、蟹类敌人伤害提升。'
  },
  exorcist: {
    id: 'exorcist',
    name: '斩邪',
    target: 'weapon',
    directions: ['weapon_slayer'],
    effectType: 'weapon_exorcist_crit',
    min: percent(0.08),
    max: percent(0.22),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'percent',
    description: '对不死与虚影类敌人暴击率提升。'
  },
  echo_strike: {
    id: 'echo_strike',
    name: '残响',
    target: 'weapon',
    directions: ['weapon_output'],
    effectType: 'weapon_extra_strike_chance',
    min: percent(0.1),
    max: percent(0.26),
    step: percent(0.01),
    defaultValue: percent(0.18),
    displayKind: 'percent',
    description: '攻击时有概率追击，追击至少造成 40% 伤害。'
  },
  haymaker: {
    id: 'haymaker',
    name: '割草',
    target: 'weapon',
    directions: ['weapon_efficiency'],
    effectType: 'weapon_haymaker_chance',
    min: percent(0.2),
    max: percent(0.45),
    step: percent(0.01),
    defaultValue: percent(0.35),
    displayKind: 'percent',
    description: '清除农田杂草时有概率获得干草。'
  },
  stone_chips: {
    id: 'stone_chips',
    name: '石屑',
    target: 'pickaxe',
    directions: ['pickaxe_efficiency'],
    effectType: 'pickaxe_stone_chips_chance',
    min: percent(0.12),
    max: percent(0.3),
    step: percent(0.01),
    defaultValue: percent(0.2),
    displayKind: 'percent',
    description: '镐子挖到空区域时有概率获得石材。'
  },
  efficient: {
    id: 'efficient',
    name: '省力',
    target: 'pickaxe',
    directions: ['pickaxe_efficiency'],
    effectType: 'pickaxe_stamina_reduction',
    min: percent(0.08),
    max: percent(0.2),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '镐子探索矿洞时体力消耗降低。'
  },
  swift_pick: {
    id: 'swift_pick',
    name: '疾手',
    target: 'pickaxe',
    directions: ['pickaxe_efficiency'],
    effectType: 'pickaxe_time_reduction',
    min: percent(0.08),
    max: percent(0.2),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '镐子探索与矿洞战斗耗时降低。'
  },
  generous_pick: {
    id: 'generous_pick',
    name: '丰采',
    target: 'pickaxe',
    directions: ['pickaxe_yield'],
    effectType: 'pickaxe_ore_bonus_chance',
    min: percent(0.08),
    max: percent(0.22),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'percent',
    description: '挖到矿石时有概率使本次数量增加。'
  },
  ore_smelter: {
    id: 'ore_smelter',
    name: '炼矿',
    target: 'pickaxe',
    directions: ['pickaxe_yield'],
    effectType: 'pickaxe_ore_smelter_chance',
    min: percent(0.05),
    max: percent(0.16),
    step: percent(0.01),
    defaultValue: percent(0.1),
    displayKind: 'percent',
    description: '挖到矿石时有概率额外获得下一阶矿石。'
  },
  treasure_sense: {
    id: 'treasure_sense',
    name: '寻宝',
    target: 'pickaxe',
    directions: ['pickaxe_yield'],
    effectType: 'pickaxe_treasure_sense_chance',
    min: percent(0.04),
    max: percent(0.14),
    step: percent(0.01),
    defaultValue: percent(0.08),
    displayKind: 'percent',
    description: '挖到矿石时有概率额外发现宝石或古物。'
  },
  quarry_resonance: {
    id: 'quarry_resonance',
    name: '岩鸣',
    target: 'pickaxe',
    directions: ['pickaxe_quarry_deep', 'pickaxe_yield'],
    effectType: 'pickaxe_quarry_double_chance',
    min: percent(0.06),
    max: percent(0.16),
    step: percent(0.01),
    defaultValue: percent(0.1),
    displayKind: 'percent',
    description: '旧采石场收取非木材资源时有概率额外获得 1 份主产物。'
  },
  deep_vein_grip: {
    id: 'deep_vein_grip',
    name: '脉握',
    target: 'pickaxe',
    directions: ['pickaxe_quarry_deep', 'pickaxe_efficiency'],
    effectType: 'pickaxe_quarry_deep_stamina_reduction',
    min: percent(0.12),
    max: percent(0.28),
    step: percent(0.01),
    defaultValue: percent(0.18),
    displayKind: 'reduction',
    description: '旧采石场深脉点和旧支道推进的体力消耗降低。'
  },
  relic_sense: {
    id: 'relic_sense',
    name: '遗感',
    target: 'pickaxe',
    directions: ['pickaxe_quarry_deep', 'pickaxe_yield'],
    effectType: 'pickaxe_quarry_artifact_chance',
    min: percent(0.03),
    max: percent(0.09),
    step: percent(0.01),
    defaultValue: percent(0.05),
    displayKind: 'percent',
    description: '旧采石场收取深脉、宝箱或古物点时，有概率额外发现一件采石场遗物。'
  },
  ring_focus: {
    id: 'ring_focus',
    name: '聚灵',
    target: 'ring',
    directions: ['ring_profit'],
    effectType: 'exp_bonus',
    equipmentEffectType: 'exp_bonus',
    min: percent(0.04),
    max: percent(0.1),
    step: percent(0.01),
    defaultValue: percent(0.06),
    displayKind: 'percent',
    description: '佩戴时获得经验提升。'
  },
  ring_fortune: {
    id: 'ring_fortune',
    name: '招财',
    target: 'ring',
    directions: ['ring_profit'],
    effectType: 'sell_price_bonus',
    equipmentEffectType: 'sell_price_bonus',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.04),
    displayKind: 'percent',
    description: '出售物品收益提升。'
  },
  ring_treasure: {
    id: 'ring_treasure',
    name: '探宝',
    target: 'ring',
    directions: ['ring_treasure'],
    effectType: 'treasure_find',
    equipmentEffectType: 'treasure_find',
    min: percent(0.04),
    max: percent(0.1),
    step: percent(0.01),
    defaultValue: percent(0.06),
    displayKind: 'percent',
    description: '探索时发现宝物概率提升。'
  },
  ring_battle: {
    id: 'ring_battle',
    name: '斗魄',
    target: 'ring',
    directions: ['ring_combat'],
    effectType: 'attack_bonus',
    equipmentEffectType: 'attack_bonus',
    min: 2,
    max: 7,
    step: 1,
    defaultValue: 4,
    displayKind: 'flat',
    description: '攻击力提升。'
  },
  ring_vampiric: {
    id: 'ring_vampiric',
    name: '血契',
    target: 'ring',
    directions: ['ring_combat'],
    effectType: 'vampiric',
    equipmentEffectType: 'vampiric',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.05),
    displayKind: 'percent',
    description: '吸血提升。'
  },
  ring_luck: {
    id: 'ring_luck',
    name: '福运',
    target: 'ring',
    directions: ['ring_treasure'],
    effectType: 'monster_drop_bonus',
    equipmentEffectType: 'monster_drop_bonus',
    min: percent(0.05),
    max: percent(0.14),
    step: percent(0.01),
    defaultValue: percent(0.08),
    displayKind: 'percent',
    description: '怪物掉落率提升。'
  },
  hat_guard: {
    id: 'hat_guard',
    name: '护心',
    target: 'hat',
    directions: ['hat_defense'],
    effectType: 'defense_bonus',
    equipmentEffectType: 'defense_bonus',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.04),
    displayKind: 'percent',
    description: '受到的伤害降低。'
  },
  hat_herbal: {
    id: 'hat_herbal',
    name: '草识',
    target: 'hat',
    directions: ['hat_farming'],
    effectType: 'crop_quality_bonus',
    equipmentEffectType: 'crop_quality_bonus',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.04),
    displayKind: 'percent',
    description: '作物品质概率提升。'
  },
  hat_clear_mind: {
    id: 'hat_clear_mind',
    name: '清明',
    target: 'hat',
    directions: ['hat_experience'],
    effectType: 'exp_bonus',
    equipmentEffectType: 'exp_bonus',
    min: percent(0.03),
    max: percent(0.09),
    step: percent(0.01),
    defaultValue: percent(0.05),
    displayKind: 'percent',
    description: '获得经验提升。'
  },
  hat_resolve: {
    id: 'hat_resolve',
    name: '定心',
    target: 'hat',
    directions: ['hat_defense'],
    effectType: 'max_hp_bonus',
    equipmentEffectType: 'max_hp_bonus',
    min: 10,
    max: 30,
    step: 1,
    defaultValue: 18,
    displayKind: 'flat',
    description: '生命上限提升。'
  },
  hat_growth: {
    id: 'hat_growth',
    name: '培元',
    target: 'hat',
    directions: ['hat_farming'],
    effectType: 'crop_growth_bonus',
    equipmentEffectType: 'crop_growth_bonus',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.05),
    displayKind: 'percent',
    description: '作物生长速度提升。'
  },
  hat_scholar: {
    id: 'hat_scholar',
    name: '悟道',
    target: 'hat',
    directions: ['hat_experience'],
    effectType: 'exp_bonus',
    equipmentEffectType: 'exp_bonus',
    min: percent(0.05),
    max: percent(0.11),
    step: percent(0.01),
    defaultValue: percent(0.07),
    displayKind: 'percent',
    description: '获得经验进一步提升。'
  },
  shoe_swift: {
    id: 'shoe_swift',
    name: '轻身',
    target: 'shoe',
    directions: ['shoe_movement'],
    effectType: 'travel_speed',
    equipmentEffectType: 'travel_speed',
    min: percent(0.05),
    max: percent(0.14),
    step: percent(0.01),
    defaultValue: percent(0.12),
    displayKind: 'percent',
    description: '旅行加速。'
  },
  shoe_fleet: {
    id: 'shoe_fleet',
    name: '疾行',
    target: 'shoe',
    directions: ['shoe_movement'],
    effectType: 'travel_speed',
    equipmentEffectType: 'travel_speed',
    min: percent(0.04),
    max: percent(0.12),
    step: percent(0.01),
    defaultValue: percent(0.08),
    displayKind: 'reduction',
    description: '旅行耗时降低。'
  },
  shoe_surefoot: {
    id: 'shoe_surefoot',
    name: '稳步',
    target: 'shoe',
    directions: ['shoe_stamina'],
    effectType: 'stamina_reduction',
    equipmentEffectType: 'stamina_reduction',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.04),
    displayKind: 'reduction',
    description: '日常体力消耗降低。'
  },
  shoe_breath: {
    id: 'shoe_breath',
    name: '息步',
    target: 'shoe',
    directions: ['shoe_stamina'],
    effectType: 'journey_stamina_reduction',
    equipmentEffectType: 'journey_stamina_reduction',
    min: percent(0.04),
    max: percent(0.1),
    step: percent(0.01),
    defaultValue: percent(0.06),
    displayKind: 'reduction',
    description: '行旅图体力消耗降低。'
  },
  shoe_mine_step: {
    id: 'shoe_mine_step',
    name: '踏矿',
    target: 'shoe',
    directions: ['shoe_mining'],
    effectType: 'mining_stamina',
    equipmentEffectType: 'mining_stamina',
    min: percent(0.04),
    max: percent(0.1),
    step: percent(0.01),
    defaultValue: percent(0.06),
    displayKind: 'reduction',
    description: '矿洞探索体力消耗降低。'
  },
  shoe_cavern_grip: {
    id: 'shoe_cavern_grip',
    name: '岩握',
    target: 'shoe',
    directions: ['shoe_mining'],
    effectType: 'boss_pressure_resist',
    equipmentEffectType: 'boss_pressure_resist',
    min: percent(0.03),
    max: percent(0.08),
    step: percent(0.01),
    defaultValue: percent(0.05),
    displayKind: 'reduction',
    description: '首领压力降低。'
  },
  // === 耐久词条 ===
  durable_weapon: {
    id: 'durable_weapon',
    name: '坚韧',
    target: 'weapon',
    directions: ['weapon_durability'],
    effectType: 'durability_bonus',
    min: percent(0.10),
    max: percent(0.30),
    step: percent(0.01),
    defaultValue: percent(0.20),
    displayKind: 'percent',
    description: '装备耐久上限提升。'
  },
  wear_resistant_weapon: {
    id: 'wear_resistant_weapon',
    name: '耐磨',
    target: 'weapon',
    directions: ['weapon_durability'],
    effectType: 'durability_consumption_reduction',
    min: percent(0.10),
    max: percent(0.25),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '耐久消耗降低。'
  },
  fragile_weapon: {
    id: 'fragile_weapon',
    name: '易损',
    target: 'weapon',
    directions: [],
    effectType: 'durability_bonus',
    min: percent(-0.20),
    max: percent(-0.10),
    step: percent(0.01),
    defaultValue: percent(-0.15),
    displayKind: 'percent',
    description: '装备耐久上限降低。'
  },
  durable_ring: {
    id: 'durable_ring',
    name: '坚韧',
    target: 'ring',
    directions: ['ring_durability'],
    effectType: 'durability_bonus',
    min: percent(0.10),
    max: percent(0.30),
    step: percent(0.01),
    defaultValue: percent(0.20),
    displayKind: 'percent',
    description: '装备耐久上限提升。'
  },
  wear_resistant_ring: {
    id: 'wear_resistant_ring',
    name: '耐磨',
    target: 'ring',
    directions: ['ring_durability'],
    effectType: 'durability_consumption_reduction',
    min: percent(0.10),
    max: percent(0.25),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '耐久消耗降低。'
  },
  fragile_ring: {
    id: 'fragile_ring',
    name: '易损',
    target: 'ring',
    directions: [],
    effectType: 'durability_bonus',
    min: percent(-0.20),
    max: percent(-0.10),
    step: percent(0.01),
    defaultValue: percent(-0.15),
    displayKind: 'percent',
    description: '装备耐久上限降低。'
  },
  durable_hat: {
    id: 'durable_hat',
    name: '坚韧',
    target: 'hat',
    directions: ['hat_durability'],
    effectType: 'durability_bonus',
    min: percent(0.10),
    max: percent(0.30),
    step: percent(0.01),
    defaultValue: percent(0.20),
    displayKind: 'percent',
    description: '装备耐久上限提升。'
  },
  wear_resistant_hat: {
    id: 'wear_resistant_hat',
    name: '耐磨',
    target: 'hat',
    directions: ['hat_durability'],
    effectType: 'durability_consumption_reduction',
    min: percent(0.10),
    max: percent(0.25),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '耐久消耗降低。'
  },
  fragile_hat: {
    id: 'fragile_hat',
    name: '易损',
    target: 'hat',
    directions: [],
    effectType: 'durability_bonus',
    min: percent(-0.20),
    max: percent(-0.10),
    step: percent(0.01),
    defaultValue: percent(-0.15),
    displayKind: 'percent',
    description: '装备耐久上限降低。'
  },
  durable_shoe: {
    id: 'durable_shoe',
    name: '坚韧',
    target: 'shoe',
    directions: ['shoe_durability'],
    effectType: 'durability_bonus',
    min: percent(0.10),
    max: percent(0.30),
    step: percent(0.01),
    defaultValue: percent(0.20),
    displayKind: 'percent',
    description: '装备耐久上限提升。'
  },
  wear_resistant_shoe: {
    id: 'wear_resistant_shoe',
    name: '耐磨',
    target: 'shoe',
    directions: ['shoe_durability'],
    effectType: 'durability_consumption_reduction',
    min: percent(0.10),
    max: percent(0.25),
    step: percent(0.01),
    defaultValue: percent(0.15),
    displayKind: 'reduction',
    description: '耐久消耗降低。'
  },
  fragile_shoe: {
    id: 'fragile_shoe',
    name: '易损',
    target: 'shoe',
    directions: [],
    effectType: 'durability_bonus',
    min: percent(-0.20),
    max: percent(-0.10),
    step: percent(0.01),
    defaultValue: percent(-0.15),
    displayKind: 'percent',
    description: '装备耐久上限降低。'
  }
}

export const FORGE_AFFIX_DIRECTIONS: ForgeAffixDirectionDef[] = [
  { id: 'weapon_output', target: 'weapon', label: '输出', description: '攻击、暴击与追击。', affixIds: ['sharp', 'fierce', 'precise', 'echo_strike', 'armor_breaker'] },
  { id: 'weapon_survival', target: 'weapon', label: '生存', description: '吸血与减伤。', affixIds: ['vampiric', 'sturdy'] },
  { id: 'weapon_efficiency', target: 'weapon', label: '效率掉落', description: '战斗耗时、掉落与割草。', affixIds: ['lucky', 'swift', 'haymaker'] },
  { id: 'weapon_slayer', target: 'weapon', label: '克制技巧', description: '针对特定敌群。', affixIds: ['armor_breaker', 'spirit_slayer', 'bug_slayer', 'exorcist'] },
  { id: 'pickaxe_efficiency', target: 'pickaxe', label: '效率', description: '省体力、减耗时和空格收益。', affixIds: ['stone_chips', 'efficient', 'swift_pick'] },
  { id: 'pickaxe_yield', target: 'pickaxe', label: '产出', description: '矿石、进阶矿与宝物。', affixIds: ['generous_pick', 'ore_smelter', 'treasure_sense'] },
  { id: 'pickaxe_quarry_deep', target: 'pickaxe', label: '深脉', description: '旧采石场体力、双采和遗物发现。', affixIds: ['quarry_resonance', 'deep_vein_grip', 'relic_sense'] },
  { id: 'ring_profit', target: 'ring', label: '收益', description: '经验与出售收益。', affixIds: ['ring_focus', 'ring_fortune'] },
  { id: 'ring_combat', target: 'ring', label: '战斗', description: '攻击与吸血。', affixIds: ['ring_battle', 'ring_vampiric'] },
  { id: 'ring_treasure', target: 'ring', label: '探宝', description: '宝物发现与掉落。', affixIds: ['ring_treasure', 'ring_luck'] },
  { id: 'hat_defense', target: 'hat', label: '防御', description: '减伤与生命。', affixIds: ['hat_guard', 'hat_resolve'] },
  { id: 'hat_farming', target: 'hat', label: '农作', description: '品质与生长。', affixIds: ['hat_herbal', 'hat_growth'] },
  { id: 'hat_experience', target: 'hat', label: '经验', description: '经验获取。', affixIds: ['hat_clear_mind', 'hat_scholar'] },
  { id: 'shoe_movement', target: 'shoe', label: '移动', description: '旅行加速与耗时降低。', affixIds: ['shoe_swift', 'shoe_fleet'] },
  { id: 'shoe_stamina', target: 'shoe', label: '体力', description: '日常与行旅减耗。', affixIds: ['shoe_surefoot', 'shoe_breath'] },
  { id: 'shoe_mining', target: 'shoe', label: '矿洞', description: '矿洞体力与首领压力。', affixIds: ['shoe_mine_step', 'shoe_cavern_grip'] }
,
  { id: 'weapon_durability', target: 'weapon', label: '耐久', description: '耐久上限与消耗。', affixIds: ['durable_weapon', 'wear_resistant_weapon'] },
  { id: 'ring_durability', target: 'ring', label: '耐久', description: '耐久上限与消耗。', affixIds: ['durable_ring', 'wear_resistant_ring'] },
  { id: 'hat_durability', target: 'hat', label: '耐久', description: '耐久上限与消耗。', affixIds: ['durable_hat', 'wear_resistant_hat'] },
  { id: 'shoe_durability', target: 'shoe', label: '耐久', description: '耐久上限与消耗。', affixIds: ['durable_shoe', 'wear_resistant_shoe'] }
]

export const FORGE_AFFIX_MODE_DEFS: ForgeAffixModeDef[] = [
  {
    id: 'random',
    label: '随机铸魔',
    description: '随机获得当前类型的词条。',
    minLevel: 7,
    cost: 30000,
    materials: [
      { itemId: 'bronze_bar', quantity: 1 },
      { itemId: 'shadow_ore', quantity: 3 }
    ]
  },
  {
    id: 'directed',
    label: '定向附魔',
    description: '只选择大方向，具体词条和数值仍随机。',
    minLevel: 10,
    cost: 80000,
    materials: [
      { itemId: 'mythril_bar', quantity: 1 },
      { itemId: 'shadow_ore', quantity: 6 },
      { itemId: 'prismatic_shard', quantity: 1 }
    ]
  },
  {
    id: 'protected',
    label: '保留重铸',
    description: '保留一个词条类型并重掷其数值，其余词条重新随机。',
    minLevel: 15,
    cost: 150000,
    materials: [
      { itemId: 'mythril_bar', quantity: 2 },
      { itemId: 'void_ore', quantity: 6 },
      { itemId: 'prismatic_shard', quantity: 1 },
      { itemId: 'dragon_jade', quantity: 1 }
    ]
  },
  {
    id: 'deep_refine',
    label: '深脉精锻',
    description: '消耗旧采石场深脉稀材，限定镐子获得采石场相关词条。',
    minLevel: 12,
    cost: 110000,
    materials: [
      { itemId: 'obsidian', quantity: 3 },
      { itemId: 'dragon_jade', quantity: 1 },
      { itemId: 'rare_lotus_guard_elixir', quantity: 1 }
    ]
  }
]

export const FORGE_AFFIX_COUNT_PROBABILITIES = {
  lv7: [{ count: 1, weight: 1 }],
  lv10: [
    { count: 1, weight: 0.7 },
    { count: 2, weight: 0.3 }
  ],
  lv15: [
    { count: 1, weight: 0.5 },
    { count: 2, weight: 0.38 },
    { count: 3, weight: 0.12 }
  ]
} as const

export const FORGE_AFFIX_TARGET_LABELS: Record<ForgeAffixTarget, string> = {
  weapon: '武器',
  pickaxe: '镐子',
  ring: '戒指',
  hat: '帽子',
  shoe: '鞋子'
}

const roundToStepPrecision = (value: number, step: number) => {
  const decimals = step >= 1 ? 0 : String(step).split('.')[1]?.length ?? 2
  return Number(value.toFixed(decimals))
}

export const getForgeAffixById = (id: string | null | undefined): ForgeAffixDef | undefined =>
  id ? FORGE_AFFIXES[id] : undefined

export const getForgeAffixesForTarget = (target: ForgeAffixTarget): ForgeAffixDef[] =>
  Object.values(FORGE_AFFIXES).filter(affix => affix.target === target)

export const getForgeDirectionsForTarget = (target: ForgeAffixTarget): ForgeAffixDirectionDef[] =>
  FORGE_AFFIX_DIRECTIONS.filter(direction => direction.target === target)

export const getForgeAffixDirectionById = (id: string | null | undefined): ForgeAffixDirectionDef | undefined =>
  FORGE_AFFIX_DIRECTIONS.find(direction => direction.id === id)

export const getForgeAffixModeById = (id: ForgeAffixMode): ForgeAffixModeDef =>
  FORGE_AFFIX_MODE_DEFS.find(mode => mode.id === id) ?? FORGE_AFFIX_MODE_DEFS[0]!

export const normalizeForgeAffixValue = (def: ForgeAffixDef, value: number): number => {
  const clamped = Math.min(def.max, Math.max(def.min, Number.isFinite(value) ? value : def.defaultValue))
  const steps = Math.round((clamped - def.min) / def.step)
  return roundToStepPrecision(def.min + steps * def.step, def.step)
}

export const getForgeAffixQuality = (def: ForgeAffixDef, value: number): ForgeAffixQuality => {
  const range = def.max - def.min
  const percentile = range <= 0 ? 1 : (normalizeForgeAffixValue(def, value) - def.min) / range
  if (percentile >= 0.95) return 'supreme'
  if (percentile >= 0.8) return 'excellent'
  if (percentile >= 0.5) return 'fine'
  return 'normal'
}

export const createForgeAffixRoll = (id: string, value?: number): ForgeAffixRoll | null => {
  const def = getForgeAffixById(id)
  if (!def) return null
  const normalizedValue = normalizeForgeAffixValue(def, value ?? def.defaultValue)
  return {
    id: def.id,
    value: normalizedValue,
    quality: getForgeAffixQuality(def, normalizedValue)
  }
}

export const rollForgeAffixValue = (def: ForgeAffixDef, rng: () => number = Math.random): number => {
  const steps = Math.max(0, Math.round((def.max - def.min) / def.step))
  const rolledSteps = Math.floor(rng() * (steps + 1))
  return normalizeForgeAffixValue(def, def.min + rolledSteps * def.step)
}

export const rollSingleForgeAffix = (id: string, rng: () => number = Math.random): ForgeAffixRoll | null => {
  const def = getForgeAffixById(id)
  if (!def) return null
  return createForgeAffixRoll(def.id, rollForgeAffixValue(def, rng))
}

export const getForgeAffixCountDistribution = (workshopLevel: number) => {
  if (workshopLevel >= 15) return FORGE_AFFIX_COUNT_PROBABILITIES.lv15
  if (workshopLevel >= 10) return FORGE_AFFIX_COUNT_PROBABILITIES.lv10
  return FORGE_AFFIX_COUNT_PROBABILITIES.lv7
}

export const rollForgeAffixCount = (workshopLevel: number, rng: () => number = Math.random): number => {
  const distribution = getForgeAffixCountDistribution(workshopLevel)
  const roll = rng()
  let cursor = 0
  for (const entry of distribution) {
    cursor += entry.weight
    if (roll <= cursor) return entry.count
  }
  return distribution[distribution.length - 1]!.count
}

const chooseRandom = <T>(values: T[], rng: () => number): T | null => {
  if (values.length <= 0) return null
  return values[Math.floor(rng() * values.length)] ?? null
}

export const rollForgeAffixes = ({
  target,
  workshopLevel,
  directionId,
  preserveId,
  rng = Math.random
}: {
  target: ForgeAffixTarget
  workshopLevel: number
  directionId?: ForgeAffixDirectionId | null
  preserveId?: string | null
  rng?: () => number
}): ForgeAffixRoll[] => {
  const count = rollForgeAffixCount(workshopLevel, rng)
  const direction = directionId ? getForgeAffixDirectionById(directionId) : null
  const allTargetAffixIds = getForgeAffixesForTarget(target).map(affix => affix.id)
  const preferredPool = (direction?.target === target ? direction.affixIds : allTargetAffixIds)
    .filter(id => getForgeAffixById(id)?.target === target)
  const picked = new Set<string>()
  const rolls: ForgeAffixRoll[] = []

  if (preserveId && getForgeAffixById(preserveId)?.target === target) {
    const preserved = rollSingleForgeAffix(preserveId, rng)
    if (preserved) {
      rolls.push(preserved)
      picked.add(preserveId)
    }
  }

  while (rolls.length < count) {
    const preferredCandidates = preferredPool.filter(id => !picked.has(id))
    const candidates = preferredCandidates.length > 0
      ? preferredCandidates
      : allTargetAffixIds.filter(id => !picked.has(id))
    const id = chooseRandom(candidates, rng)
    if (!id) break
    const roll = rollSingleForgeAffix(id, rng)
    if (roll) {
      rolls.push(roll)
      picked.add(id)
    }
  }

  return rolls
}

export const sanitizeForgeAffixes = (
  target: ForgeAffixTarget,
  rawAffixes: unknown,
  legacyEnchantmentId?: string | null
): ForgeAffixRoll[] => {
  const result: ForgeAffixRoll[] = []
  const seen = new Set<string>()
  if (Array.isArray(rawAffixes)) {
    for (const raw of rawAffixes) {
      if (!raw || typeof raw !== 'object') continue
      const id = typeof (raw as { id?: unknown }).id === 'string' ? (raw as { id: string }).id : ''
      if (seen.has(id)) continue
      const def = getForgeAffixById(id)
      if (!def || def.target !== target) continue
      const value = Number((raw as { value?: unknown }).value)
      const roll = createForgeAffixRoll(id, Number.isFinite(value) ? value : def.defaultValue)
      if (!roll) continue
      result.push(roll)
      seen.add(id)
    }
  }
  if (result.length > 0) return result
  return legacyEnchantmentId ? migrateLegacyEnchantmentToAffixes(target, legacyEnchantmentId) : []
}

export const migrateLegacyEnchantmentToAffixes = (target: ForgeAffixTarget, legacyEnchantmentId?: string | null): ForgeAffixRoll[] => {
  if (!legacyEnchantmentId) return []
  const def = getForgeAffixById(legacyEnchantmentId)
  if (!def || def.target !== target) return []
  const roll = createForgeAffixRoll(def.id, def.defaultValue)
  return roll ? [roll] : []
}

export const getForgeAffixSignature = (affixes?: ForgeAffixRoll[] | null): string | null => {
  const valid = (affixes ?? [])
    .filter(roll => !!getForgeAffixById(roll.id))
    .map(roll => {
      const def = getForgeAffixById(roll.id)!
      const value = normalizeForgeAffixValue(def, roll.value)
      const quality = getForgeAffixQuality(def, value)
      return `${roll.id}:${value}:${quality}`
    })
    .sort()
  return valid.length > 0 ? valid.join('|') : null
}

export const getLegacyAffixSignature = (target: ForgeAffixTarget, legacyEnchantmentId?: string | null): string | null =>
  getForgeAffixSignature(migrateLegacyEnchantmentToAffixes(target, legacyEnchantmentId))

export const formatForgeAffixValue = (def: ForgeAffixDef, value: number): string => {
  const normalized = normalizeForgeAffixValue(def, value)
  if (def.displayKind === 'flat') return `${normalized > 0 ? '+' : ''}${normalized}`
  const text = `${Math.round(normalized * 100)}%`
  return def.displayKind === 'reduction' ? `-${text}` : `+${text}`
}

export const formatForgeAffixRange = (def: ForgeAffixDef): string =>
  `${formatForgeAffixValue(def, def.min)}~${formatForgeAffixValue(def, def.max)}`

export const formatForgeAffixRoll = (roll: ForgeAffixRoll): string => {
  const def = getForgeAffixById(roll.id)
  if (!def) return roll.id
  return `${def.name} ${formatForgeAffixValue(def, roll.value)}（${FORGE_AFFIX_QUALITY_LABELS[roll.quality]}）`
}

export const formatForgeAffixSummary = (affixes?: ForgeAffixRoll[] | null): string =>
  (affixes ?? []).map(formatForgeAffixRoll).join('、')

export const formatForgeAffixSignature = (signature?: string | null): string => {
  if (!signature) return ''
  return signature
    .split('|')
    .map(part => {
      const [id, valueText, rawQuality] = part.split(':')
      const def = getForgeAffixById(id)
      const value = Number(valueText)
      if (!def || !Number.isFinite(value)) return ''
      const quality = rawQuality === 'normal' || rawQuality === 'fine' || rawQuality === 'excellent' || rawQuality === 'supreme'
        ? rawQuality
        : getForgeAffixQuality(def, value)
      return `${def.name} ${formatForgeAffixValue(def, value)}（${FORGE_AFFIX_QUALITY_LABELS[quality]}）`
    })
    .filter(Boolean)
    .join('、')
}

export const formatForgeAffixNameSummary = (affixes?: ForgeAffixRoll[] | null): string =>
  (affixes ?? [])
    .map(roll => getForgeAffixById(roll.id)?.name ?? roll.id)
    .join('·')

export const getForgeAffixEffectValue = (
  affixes: ForgeAffixRoll[] | undefined | null,
  effectType: ForgeAffixEffectType
): number =>
  (affixes ?? []).reduce((total, roll) => {
    const def = getForgeAffixById(roll.id)
    return def?.effectType === effectType ? total + normalizeForgeAffixValue(def, roll.value) : total
  }, 0)

export const getForgeAffixEquipmentEffects = (affixes?: ForgeAffixRoll[] | null): EquipmentEffect[] =>
  (affixes ?? []).flatMap(roll => {
    const def = getForgeAffixById(roll.id)
    if (!def?.equipmentEffectType) return []
    return [{ type: def.equipmentEffectType, value: normalizeForgeAffixValue(def, roll.value) }]
  })

export const getForgeAffixSellBonus = (affixes?: ForgeAffixRoll[] | null): number => {
  const qualityBase: Record<ForgeAffixQuality, number> = {
    normal: 120,
    fine: 220,
    excellent: 360,
    supreme: 600
  }
  return (affixes ?? []).reduce((total, roll) => {
    const def = getForgeAffixById(roll.id)
    if (!def) return total
    const range = def.max - def.min
    const percentile = range <= 0 ? 1 : (normalizeForgeAffixValue(def, roll.value) - def.min) / range
    return total + qualityBase[roll.quality] + Math.round(percentile * 200)
  }, 0)
}
