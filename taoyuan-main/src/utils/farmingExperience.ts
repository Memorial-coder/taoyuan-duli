import type { CropDef, Quality } from '@/types'

export const FARM_HARVEST_EXP_MIN = 8
export const FARM_HARVEST_EXP_MAX = 20

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
  if (!crop) return 4
  const useRegrowthCycle = harvestCount > 0 && crop.regrowth === true && Number.isFinite(crop.regrowthDays)
  const days = useRegrowthCycle ? crop.regrowthDays : crop.growthDays
  return Math.max(1, Math.floor(Number(days) || 1))
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
