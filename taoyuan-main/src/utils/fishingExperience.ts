import type { FishDef, Quality } from '@/types'

export const FISHING_DIFFICULTY_EXP_MULTIPLIER: Record<FishDef['difficulty'], number> = {
  easy: 1,
  normal: 1.5,
  hard: 2,
  legendary: 3
}

export const FISHING_QUALITY_EXP_MULTIPLIER: Record<Quality, number> = {
  normal: 1,
  fine: 1.25,
  excellent: 1.5,
  supreme: 2
}

export interface FishingCatchExperienceInput {
  fish: Pick<FishDef, 'difficulty' | 'sellPrice'>
  quantity?: number
  quality?: Quality
  riverlandBonus?: number
  perfectMult?: number
  legendWeightBonus?: number
}

const normalizePositiveMultiplier = (value: number | undefined, fallback = 1): number => {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback
}

export const getFishingCatchExperience = ({
  fish,
  quantity = 1,
  quality = 'normal',
  riverlandBonus = 1,
  perfectMult = 1,
  legendWeightBonus = 0
}: FishingCatchExperienceInput): number => {
  const sellPrice = Math.max(0, Number(fish.sellPrice) || 0)
  const catchQuantity = Math.max(1, Math.floor(Number(quantity) || 1))
  const difficultyMult = FISHING_DIFFICULTY_EXP_MULTIPLIER[fish.difficulty] ?? 1
  const qualityMult = FISHING_QUALITY_EXP_MULTIPLIER[quality] ?? 1
  const legendMult = 1 + Math.max(0, Number(legendWeightBonus) || 0)

  return Math.floor(
    sellPrice *
      difficultyMult *
      catchQuantity *
      qualityMult *
      normalizePositiveMultiplier(riverlandBonus) *
      normalizePositiveMultiplier(perfectMult) *
      legendMult
  )
}
