import type { FertilizerType } from './processing'
import type { SeedGenetics } from './breeding'
import type { Season } from './game'

/** 地块状态 */
export type PlotState = 'wasteland' | 'tilled' | 'planted' | 'growing' | 'harvestable'

/** 农场地块 */
export interface FarmPlot {
  id: number
  state: PlotState
  /** 种植的作物ID */
  cropId: string | null
  /** 已生长天数 */
  growthDays: number
  /** 今天是否已浇水 */
  watered: boolean
  /** 连续未浇水天数 */
  unwateredDays: number
  /** 已施加的肥料类型 */
  fertilizer: FertilizerType | null
  /** 多茬作物已收获次数 */
  harvestCount: number
  /** 巨型作物组 ID，非 null 表示属于巨型作物 */
  giantCropGroup: number | null
  /** 育种种子的基因属性 */
  seedGenetics: SeedGenetics | null
  /** 是否被虫害感染 */
  infested: boolean
  /** 连续虫害天数 */
  infestedDays: number
  /** 是否长草 */
  weedy: boolean
  /** 连续长草天数 */
  weedyDays: number
}

/** 作物定义（配置数据用） */
export interface CropDef {
  id: string
  name: string
  seedId: string
  season: Season[]
  growthDays: number
  sellPrice: number
  seedPrice: number
  /** 是否需要深度灌溉 */
  deepWatering: boolean
  description: string
  /** 是否为多茬作物（收获后可重新长出） */
  regrowth?: boolean
  /** 多茬天数 */
  regrowthDays?: number
  /** 多茬作物最大收获次数 */
  maxHarvests?: number
  /** 是否可形成巨型作物 */
  giantCropEligible?: boolean
}

/** 农场尺寸 */
export type FarmSize = 4 | 6 | 8
