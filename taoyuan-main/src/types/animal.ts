import type { Season } from '.'

export type AnimalBuildingType = 'coop' | 'barn' | 'stable'
export type AnimalType =
  | 'chicken'
  | 'duck'
  | 'rabbit'
  | 'goose'
  | 'quail'
  | 'pigeon'
  | 'silkie'
  | 'peacock'
  | 'cow'
  | 'sheep'
  | 'goat'
  | 'pig'
  | 'buffalo'
  | 'yak'
  | 'alpaca'
  | 'deer'
  | 'donkey'
  | 'camel'
  | 'ostrich'
  | 'horse'

export interface AnimalBuildingDef {
  type: AnimalBuildingType
  name: string
  description: string
  capacity: number
  cost: number
  materialCost: { itemId: string; quantity: number }[]
}

export interface AnimalDef {
  type: AnimalType
  name: string
  building: AnimalBuildingType
  cost: number
  productId: string
  productName: string
  produceDays: number
  friendship: { min: number; max: number }
}

export interface Animal {
  id: string
  type: AnimalType
  name: string
  friendship: number
  mood: number
  daysOwned: number
  daysSinceProduct: number
  wasFed: boolean
  /** 今天喂食使用的饲料类型 */
  fedWith: string | null
  wasPetted: boolean
  /** 饥饿值：连续未喂食天数，达到上限时死亡 */
  hunger: number
  /** 是否生病（连续饥饿≥3天有概率生病，生病时不产出） */
  sick: boolean
  /** 连续生病天数，达到上限时死亡 */
  sickDays: number
}

export type FruitTreeType =
  | 'peach_tree'
  | 'lychee_tree'
  | 'mandarin_tree'
  | 'plum_tree'
  | 'apricot_tree'
  | 'pomegranate_tree'
  | 'persimmon_tree'
  | 'hawthorn_tree'

export interface FruitTreeDef {
  type: FruitTreeType
  name: string
  saplingId: string
  saplingPrice: number
  fruitId: string
  fruitName: string
  fruitSeason: Season
  growthDays: number
  fruitSellPrice: number
}

export interface PlantedFruitTree {
  id: number
  type: FruitTreeType
  growthDays: number
  mature: boolean
  yearAge: number
  todayFruit: boolean
}

export type FarmhouseLevel = 0 | 1 | 2 | 3
export type CaveChoice = 'none' | 'mushroom' | 'fruit_bat'

export type PetType = 'cat' | 'dog'

export interface PetState {
  type: PetType
  name: string
  friendship: number
  wasPetted: boolean
}

export interface IncubationState {
  itemId: string
  animalType: AnimalType
  daysLeft: number
}
