import type { ToolType } from '@/types'

export interface ToolEnchantmentDef {
  id: string
  name: string
  description: string
  toolType: ToolType
}

export const TOOL_ENCHANTMENTS: Record<string, ToolEnchantmentDef> = {
  stone_chips: {
    id: 'stone_chips',
    name: '石屑',
    description: '镐子挖到空区域时，20% 概率获得石材×1。',
    toolType: 'pickaxe'
  },
  efficient: {
    id: 'efficient',
    name: '省力',
    description: '镐子探索矿洞时体力消耗-15%。',
    toolType: 'pickaxe'
  },
  swift_pick: {
    id: 'swift_pick',
    name: '疾手',
    description: '镐子探索与矿洞战斗行动耗时-15%。',
    toolType: 'pickaxe'
  },
  generous_pick: {
    id: 'generous_pick',
    name: '丰采',
    description: '挖到矿石时，15% 概率使本次矿石数量+1。',
    toolType: 'pickaxe'
  },
  ore_smelter: {
    id: 'ore_smelter',
    name: '炼矿',
    description: '挖到矿石时，10% 概率额外获得下一阶矿石×1。',
    toolType: 'pickaxe'
  },
  treasure_sense: {
    id: 'treasure_sense',
    name: '寻宝',
    description: '挖到矿石时，8% 概率额外发现宝石或古物×1。',
    toolType: 'pickaxe'
  }
}

export const PICKAXE_ENCHANTMENT_IDS = [
  'stone_chips',
  'efficient',
  'swift_pick',
  'generous_pick',
  'ore_smelter',
  'treasure_sense'
] as const

export const getToolEnchantmentById = (id: string): ToolEnchantmentDef | undefined => {
  return TOOL_ENCHANTMENTS[id]
}
