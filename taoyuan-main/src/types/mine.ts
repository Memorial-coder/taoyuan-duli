import type { MonsterDef, MineFloorDef } from './skill'

/** 格子类型 */
export type MineTileType = 'empty' | 'ore' | 'monster' | 'stairs' | 'trap' | 'treasure' | 'mushroom' | 'boss'

/** 格子状态 */
export type MineTileState = 'hidden' | 'revealed' | 'collected' | 'defeated' | 'triggered'

/** 格子附加数据 */
export interface MineTileData {
  oreId?: string
  oreQuantity?: number
  monster?: MonsterDef
  isBoss?: boolean
  trapDamage?: number
  treasureItems?: { itemId: string; quantity: number }[]
  treasureMoney?: number
  mushroomItems?: { itemId: string; quantity: number }[]
}

/** 单个格子 */
export interface MineTile {
  index: number // 0-35
  type: MineTileType
  state: MineTileState
  data?: MineTileData
}

/** 楼层格子分布配置 */
export interface FloorTileDistribution {
  oreCount: [number, number]
  monsterCount: [number, number]
  trapCount: [number, number]
  treasureCount?: [number, number]
  mushroomCount?: [number, number]
  bossCount?: [number, number]
  /** 楼梯是否需要全清才可使用（感染/BOSS层） */
  stairsHiddenUntilClear?: boolean
}

/** 网格常量 */
export const GRID_SIZE = 6
export const GRID_TOTAL = 36
export const MIN_STAIRS_DISTANCE = 3

/** 特殊层类型 */
export type FloorSpecialType = MineFloorDef['specialType']
