import type { EquipmentEffect } from '@/types'

export type EquipmentEnchantSlot = 'ring' | 'hat' | 'shoe'

export interface EquipmentEnchantmentDef {
  id: string
  name: string
  description: string
  slot: EquipmentEnchantSlot
  effects: EquipmentEffect[]
}

export const EQUIPMENT_ENCHANTMENTS: Record<string, EquipmentEnchantmentDef> = {
  ring_focus: {
    id: 'ring_focus',
    name: '聚灵',
    description: '佩戴时获得经验+6%。',
    slot: 'ring',
    effects: [{ type: 'exp_bonus', value: 0.06 }]
  },
  ring_fortune: {
    id: 'ring_fortune',
    name: '招财',
    description: '出售物品收益+4%。',
    slot: 'ring',
    effects: [{ type: 'sell_price_bonus', value: 0.04 }]
  },
  ring_treasure: {
    id: 'ring_treasure',
    name: '探宝',
    description: '探索时发现宝物概率+6%。',
    slot: 'ring',
    effects: [{ type: 'treasure_find', value: 0.06 }]
  },
  hat_guard: {
    id: 'hat_guard',
    name: '护心',
    description: '受到的伤害降低4%。',
    slot: 'hat',
    effects: [{ type: 'defense_bonus', value: 0.04 }]
  },
  hat_clear_mind: {
    id: 'hat_clear_mind',
    name: '清明',
    description: '获得经验+5%。',
    slot: 'hat',
    effects: [{ type: 'exp_bonus', value: 0.05 }]
  },
  hat_herbal: {
    id: 'hat_herbal',
    name: '草识',
    description: '作物品质概率+4%。',
    slot: 'hat',
    effects: [{ type: 'crop_quality_bonus', value: 0.04 }]
  },
  shoe_swift: {
    id: 'shoe_swift',
    name: '轻身',
    description: '移动速度+12%。',
    slot: 'shoe',
    effects: [{ type: 'travel_speed', value: 0.12 }]
  },
  shoe_surefoot: {
    id: 'shoe_surefoot',
    name: '稳步',
    description: '日常体力消耗-4%。',
    slot: 'shoe',
    effects: [{ type: 'stamina_reduction', value: 0.04 }]
  },
  shoe_mine_step: {
    id: 'shoe_mine_step',
    name: '踏矿',
    description: '矿洞探索体力消耗-6%。',
    slot: 'shoe',
    effects: [{ type: 'mining_stamina', value: 0.06 }]
  },
  // === 耐久附魔 ===
  ring_persistent: {
    id: 'ring_persistent',
    name: '恒久',
    description: '戒指耐久上限+15%。',
    slot: 'ring',
    effects: [{ type: 'durability_bonus', value: 0.15 }]
  },
  hat_fortified: {
    id: 'hat_fortified',
    name: '坚甲',
    description: '帽子耐久消耗-15%。',
    slot: 'hat',
    effects: [{ type: 'durability_consumption_reduction', value: 0.15 }]
  },
  shoe_resilient: {
    id: 'shoe_resilient',
    name: '韧行',
    description: '鞋子耐久消耗-12%。',
    slot: 'shoe',
    effects: [{ type: 'durability_consumption_reduction', value: 0.12 }]
  }
}

export const RING_EQUIPMENT_ENCHANTMENT_IDS = ['ring_focus', 'ring_fortune', 'ring_treasure', 'ring_persistent'] as const
export const HAT_EQUIPMENT_ENCHANTMENT_IDS = ['hat_guard', 'hat_clear_mind', 'hat_herbal', 'hat_fortified'] as const
export const SHOE_EQUIPMENT_ENCHANTMENT_IDS = ['shoe_swift', 'shoe_surefoot', 'shoe_mine_step', 'shoe_resilient'] as const

export const EQUIPMENT_ENCHANTMENT_IDS = [
  ...RING_EQUIPMENT_ENCHANTMENT_IDS,
  ...HAT_EQUIPMENT_ENCHANTMENT_IDS,
  ...SHOE_EQUIPMENT_ENCHANTMENT_IDS
] as const

export const EQUIPMENT_ENCHANTMENT_IDS_BY_SLOT: Record<EquipmentEnchantSlot, readonly string[]> = {
  ring: RING_EQUIPMENT_ENCHANTMENT_IDS,
  hat: HAT_EQUIPMENT_ENCHANTMENT_IDS,
  shoe: SHOE_EQUIPMENT_ENCHANTMENT_IDS
}

export const getEquipmentEnchantmentById = (id: string): EquipmentEnchantmentDef | undefined => {
  return EQUIPMENT_ENCHANTMENTS[id]
}

export const getEquipmentDisplayName = (baseName: string, enchantmentId: string | null | undefined): string => {
  if (!enchantmentId) return baseName
  const enchant = getEquipmentEnchantmentById(enchantmentId)
  if (!enchant) return baseName
  return `${enchant.name}的${baseName}`
}
