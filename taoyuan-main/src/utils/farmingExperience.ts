import type { AnimalDef, CropDef, Quality } from '@/types'
import { getCropCycleDays } from './farmGrowth'

export const FARM_HARVEST_EXP_MIN = 8
export const FARM_HARVEST_EXP_MAX = 20
export const ANIMAL_PRODUCT_EXP_MIN = 3
export const ANIMAL_PRODUCT_EXP_MAX = 12

export const FARM_HARVEST_QUALITY_EXP_BONUS: Record<Quality, number> = {
  normal: 0,
  fine: 1,
  excellent: 2,
  supreme: 3
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const getCropHarvestExperienceCycleDays = (
  crop: Pick<CropDef, 'growthDays' | 'regrowth' | 'regrowthDays'> | null | undefined,
  harvestCount = 0
): number => {
  return getCropCycleDays(crop, harvestCount)
}

export const getCropHarvestExperience = (
  crop: Pick<CropDef, 'growthDays' | 'regrowth' | 'regrowthDays'> | null | undefined,
  quality: Quality = 'normal',
  options: { harvestCount?: number; giant?: boolean } = {}
): number => {
  const cycleDays = getCropHarvestExperienceCycleDays(crop, options.harvestCount ?? 0)
  const growthExp = clamp(Math.round(7 + cycleDays * 0.75), FARM_HARVEST_EXP_MIN, 17)
  const qualityBonus = FARM_HARVEST_QUALITY_EXP_BONUS[quality] ?? 0
  const giantBonus = options.giant ? 2 : 0
  return clamp(growthExp + qualityBonus + giantBonus, FARM_HARVEST_EXP_MIN, FARM_HARVEST_EXP_MAX)
}

export const getAnimalProductExperience = (
  animal: Pick<AnimalDef, 'produceDays'> | null | undefined,
  quality: Quality = 'normal',
  quantity = 1
): number => {
  if (!animal || animal.produceDays <= 0) return 0
  const cycleDays = Math.max(1, Math.floor(Number(animal.produceDays) || 1))
  const cycleExp = clamp(2 + cycleDays * 2, ANIMAL_PRODUCT_EXP_MIN, 9)
  const qualityBonus = FARM_HARVEST_QUALITY_EXP_BONUS[quality] ?? 0
  const singleProductExp = clamp(cycleExp + qualityBonus, ANIMAL_PRODUCT_EXP_MIN, ANIMAL_PRODUCT_EXP_MAX)
  return singleProductExp * Math.max(1, Math.floor(Number(quantity) || 1))
}
