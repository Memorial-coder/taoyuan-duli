import type { WildTreeDef } from '@/types'

/** 野树定义 */
export const WILD_TREE_DEFS: WildTreeDef[] = [
  {
    type: 'pine',
    name: '松树',
    seedItemId: 'pine_cone',
    growthDays: 21,
    tapProduct: 'pine_resin',
    tapCycleDays: 5,
    tapProductName: '松脂'
  },
  {
    type: 'camphor',
    name: '樟树',
    seedItemId: 'camphor_seed',
    growthDays: 28,
    tapProduct: 'camphor_oil',
    tapCycleDays: 7,
    tapProductName: '樟脑油'
  },
  {
    type: 'mulberry',
    name: '桑树',
    seedItemId: 'mulberry',
    growthDays: 14,
    tapProduct: 'silk',
    tapCycleDays: 4,
    tapProductName: '蚕丝'
  }
]

/** 最大野树数量 */
export const MAX_WILD_TREES = 6

export const getWildTreeDef = (type: string): WildTreeDef | undefined => {
  return WILD_TREE_DEFS.find(d => d.type === type)
}
