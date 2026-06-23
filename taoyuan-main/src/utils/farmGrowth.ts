import type { CropDef, FarmPlot } from '@/types'

export const MAX_CROP_GROWTH_SPEEDUP = 0.5

export const getCropCycleDays = (
  crop: Pick<CropDef, 'growthDays' | 'regrowth' | 'regrowthDays'> | null | undefined,
  harvestCount = 0
): number => {
  if (!crop) return 1
  const useRegrowthCycle = harvestCount > 0 && crop.regrowth === true && Number.isFinite(crop.regrowthDays)
  const days = useRegrowthCycle ? crop.regrowthDays : crop.growthDays
  return Math.max(1, Number(days) || 1)
}

export const getCropEffectiveGrowthDays = (
  crop: Pick<CropDef, 'growthDays' | 'regrowth' | 'regrowthDays'> | null | undefined,
  speedup = 0,
  harvestCount = 0
): number => {
  const cycleDays = getCropCycleDays(crop, harvestCount)
  const boundedSpeedup = Math.min(MAX_CROP_GROWTH_SPEEDUP, Math.max(0, Number(speedup) || 0))
  return Math.max(1, cycleDays * (1 - boundedSpeedup))
}

export const getPlotEffectiveGrowthDays = (
  plot: Pick<FarmPlot, 'harvestCount'>,
  crop: Pick<CropDef, 'growthDays' | 'regrowth' | 'regrowthDays'> | null | undefined,
  speedup = 0
): number => getCropEffectiveGrowthDays(crop, speedup, plot.harvestCount)
