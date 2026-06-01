import { CROPS } from '@/data/crops'
import {
  getCropUseProfile,
  type CropUseFlavor,
  type CropUseProfile,
  type CropUseTag
} from '@/data/cropUseProfiles'
import type { Quality } from '@/types'

const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
const RARITY_RANK: Record<CropUseProfile['rarityUse'], number> = {
  daily: 0,
  stable: 1,
  seasonal: 2,
  valuable: 3
}

export interface CropUseSubstitutionRequirement {
  itemId: string
  quantity: number
  tags: CropUseTag[]
  minQuality?: Quality
  quality?: Quality
}

export interface CropUseSubstitutionEntry {
  requirementItemId: string
  itemId: string
  quantity: number
  quality: Quality
  substitute: boolean
}

export interface CropUseSubstitutionMissing {
  requirementItemId: string
  quantity: number
  missing: number
  tags: CropUseTag[]
}

export interface CropUseSubstitutionPlan {
  fulfilled: boolean
  entries: CropUseSubstitutionEntry[]
  missing: CropUseSubstitutionMissing[]
}

const hasAnyTag = (profile: CropUseProfile | undefined, tags: CropUseTag[]): profile is CropUseProfile =>
  !!profile && tags.some(tag => profile.tags.includes(tag))

const hasSharedFlavor = (a: CropUseFlavor[], b: CropUseFlavor[]) => a.some(flavor => b.includes(flavor))

const isCompatibleCropUseSubstitute = (
  expected: CropUseProfile,
  candidate: CropUseProfile,
  tags: CropUseTag[]
): boolean => {
  if (expected.cropId === candidate.cropId) return true
  if (!hasAnyTag(expected, tags) || !hasAnyTag(candidate, tags)) return false

  const sharedFlavor = hasSharedFlavor(expected.flavor, candidate.flavor)
  const sameNature = expected.nature === candidate.nature
  const sameSpirituality = expected.spirituality === candidate.spirituality

  if (tags.includes('food')) return sameNature || sharedFlavor
  if (tags.includes('alchemy') || tags.includes('medicine')) return sameNature || sameSpirituality || sharedFlavor
  return true
}

const scoreCropUseCandidate = (expected: CropUseProfile, candidate: CropUseProfile): number => {
  let score = 0
  if (expected.nature !== candidate.nature) score += 6
  if (!hasSharedFlavor(expected.flavor, candidate.flavor)) score += 5
  if (expected.spirituality !== candidate.spirituality) score += 3
  const rarityDelta = RARITY_RANK[candidate.rarityUse] - RARITY_RANK[expected.rarityUse]
  score += rarityDelta > 0 ? rarityDelta * 2 : Math.abs(rarityDelta)
  return score
}

export const getCropUseSubstitutionCandidateIds = (itemId: string, tags: CropUseTag[]): string[] => {
  const expected = getCropUseProfile(itemId)
  if (!hasAnyTag(expected, tags)) return []

  return CROPS
    .map((crop, index) => {
      const profile = getCropUseProfile(crop.id)
      if (!profile || profile.cropId === itemId) return null
      if (!isCompatibleCropUseSubstitute(expected, profile, tags)) return null
      return {
        cropId: profile.cropId,
        score: scoreCropUseCandidate(expected, profile),
        index
      }
    })
    .filter((entry): entry is { cropId: string; score: number; index: number } => entry !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index || a.cropId.localeCompare(b.cropId))
    .map(entry => entry.cropId)
}

export const getCropUseRequirementCandidateIds = (itemId: string, tags: CropUseTag[]): string[] => {
  return Array.from(new Set([itemId, ...getCropUseSubstitutionCandidateIds(itemId, tags)]))
}

const getQualityCandidates = (requirement: CropUseSubstitutionRequirement): Quality[] => {
  if (requirement.quality) return [requirement.quality]
  if (!requirement.minQuality) return QUALITY_ORDER
  const minIndex = QUALITY_ORDER.indexOf(requirement.minQuality)
  return minIndex >= 0 ? QUALITY_ORDER.slice(minIndex) : QUALITY_ORDER
}

const getEntryKey = (itemId: string, quality: Quality) => `${itemId}::${quality}`

export const getCropUseRequirementAvailableCount = (
  requirement: CropUseSubstitutionRequirement,
  getItemCount: (itemId: string, quality?: Quality) => number
): number => {
  return getCropUseRequirementCandidateIds(requirement.itemId, requirement.tags).reduce((total, candidateId) => {
    return total + getQualityCandidates(requirement).reduce((sum, quality) => sum + getItemCount(candidateId, quality), 0)
  }, 0)
}

export const resolveCropUseSubstitutionPlan = (
  requirements: CropUseSubstitutionRequirement[],
  getItemCount: (itemId: string, quality?: Quality) => number
): CropUseSubstitutionPlan => {
  const normalized = requirements
    .map(requirement => ({
      ...requirement,
      quantity: Math.max(0, Math.floor(requirement.quantity))
    }))
    .filter(requirement => requirement.itemId.length > 0 && requirement.quantity > 0)
  const remaining = normalized.map(requirement => requirement.quantity)
  const consumedByItemQuality = new Map<string, number>()
  const entries: CropUseSubstitutionEntry[] = []

  const allocate = (requirementIndex: number, itemId: string, substitute: boolean) => {
    const requirement = normalized[requirementIndex]
    if (!requirement || remaining[requirementIndex]! <= 0) return

    for (const quality of getQualityCandidates(requirement)) {
      if (remaining[requirementIndex]! <= 0) break
      const key = getEntryKey(itemId, quality)
      const available = Math.max(0, getItemCount(itemId, quality) - (consumedByItemQuality.get(key) ?? 0))
      if (available <= 0) continue
      const quantity = Math.min(remaining[requirementIndex]!, available)
      consumedByItemQuality.set(key, (consumedByItemQuality.get(key) ?? 0) + quantity)
      remaining[requirementIndex] = remaining[requirementIndex]! - quantity
      entries.push({
        requirementItemId: requirement.itemId,
        itemId,
        quantity,
        quality,
        substitute
      })
    }
  }

  normalized.forEach((requirement, index) => allocate(index, requirement.itemId, false))

  normalized.forEach((requirement, index) => {
    if (remaining[index]! <= 0) return
    for (const candidateId of getCropUseSubstitutionCandidateIds(requirement.itemId, requirement.tags)) {
      allocate(index, candidateId, true)
      if (remaining[index]! <= 0) break
    }
  })

  const missing = normalized
    .map((requirement, index): CropUseSubstitutionMissing | null => {
      const missingQuantity = remaining[index] ?? 0
      if (missingQuantity <= 0) return null
      return {
        requirementItemId: requirement.itemId,
        quantity: requirement.quantity,
        missing: missingQuantity,
        tags: requirement.tags
      }
    })
    .filter((entry): entry is CropUseSubstitutionMissing => entry !== null)

  return {
    fulfilled: missing.length === 0,
    entries,
    missing
  }
}

export const getLowestCropUsePlanQuality = (plan: CropUseSubstitutionPlan): Quality => {
  let lowestIndex = QUALITY_ORDER.length - 1
  for (const entry of plan.entries) {
    const index = QUALITY_ORDER.indexOf(entry.quality)
    if (index >= 0 && index < lowestIndex) lowestIndex = index
  }
  return QUALITY_ORDER[lowestIndex] ?? 'normal'
}

export const formatCropUseSubstitutionSummary = (
  plan: CropUseSubstitutionPlan,
  getItemName: (itemId: string) => string
): string => {
  const substitutions = new Map<string, { requiredItemId: string; itemId: string; quantity: number }>()
  for (const entry of plan.entries) {
    if (!entry.substitute || entry.itemId === entry.requirementItemId) continue
    const key = `${entry.requirementItemId}->${entry.itemId}`
    const current = substitutions.get(key)
    if (current) {
      current.quantity += entry.quantity
    } else {
      substitutions.set(key, {
        requiredItemId: entry.requirementItemId,
        itemId: entry.itemId,
        quantity: entry.quantity
      })
    }
  }

  if (substitutions.size === 0) return ''
  return `用途替代：${Array.from(substitutions.values())
    .map(entry => `${getItemName(entry.itemId)}代${getItemName(entry.requiredItemId)}×${entry.quantity}`)
    .join('、')}`
}
