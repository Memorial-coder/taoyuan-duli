import type { Quality } from '@/types'
import { getCropById } from '@/data'
import { getFertilizerById } from '@/data/processing'
import { useAchievementStore } from '@/stores/useAchievementStore'
import { useBreedingStore } from '@/stores/useBreedingStore'
import { useCookingStore } from '@/stores/useCookingStore'
import { useFarmStore } from '@/stores/useFarmStore'
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useSkillStore } from '@/stores/useSkillStore'

const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

const applyCropBlessing = (quality: Quality): Quality => {
  const bondBonus = useHiddenNpcStore().getBondBonusByType('crop_blessing')
  if (bondBonus?.type === 'crop_blessing' && Math.random() < bondBonus.chance) {
    const idx = QUALITY_ORDER.indexOf(quality)
    if (idx >= 0 && idx < QUALITY_ORDER.length - 1) return QUALITY_ORDER[idx + 1]!
  }
  return quality
}

export interface FarmHarvestResult {
  success: boolean
  cropId: string | null
  cropName: string
  quantity: number
  quality?: Quality
  harvestedPlots: number
  giant: boolean
  bonusMoney: number
  leveledUp: boolean
  newLevel?: number
}

const buildFailedHarvestResult = (
  cropId: string | null,
  cropName: string,
  quantity: number,
  quality?: Quality
): FarmHarvestResult => ({
  success: false,
  cropId,
  cropName,
  quantity,
  quality,
  harvestedPlots: cropId ? 1 : 0,
  giant: false,
  bonusMoney: 0,
  leveledUp: false
})

export const harvestFarmPlotWithRewards = (
  plotId: number,
  options: { qualityOverride?: Quality } = {}
): FarmHarvestResult => {
  const farmStore = useFarmStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const cookingStore = useCookingStore()
  const achievementStore = useAchievementStore()
  const breedingStore = useBreedingStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()

  const plot = farmStore.plots[plotId]
  if (!plot || plot.state !== 'harvestable' || !plot.cropId) {
    return {
      success: false,
      cropId: null,
      cropName: '',
      quantity: 0,
      harvestedPlots: 0,
      giant: false,
      bonusMoney: 0,
      leveledUp: false
    }
  }

  if (plot.giantCropGroup !== null) {
    const groupPlots = farmStore.plots.filter(p => p.giantCropGroup === plot.giantCropGroup)
    const quantity = groupPlots.length * 2
    const cropDef = getCropById(plot.cropId)
    if (!inventoryStore.canAddItem(plot.cropId, quantity)) {
      return {
        success: false,
        cropId: plot.cropId,
        cropName: cropDef?.name ?? plot.cropId,
        quantity,
        harvestedPlots: groupPlots.length,
        giant: true,
        bonusMoney: 0,
        leveledUp: false
      }
    }
    const result = farmStore.harvestGiantCrop(plotId)
    if (!result || !inventoryStore.addItemExact(result.cropId, result.quantity)) {
      return {
        success: false,
        cropId: plot.cropId,
        cropName: cropDef?.name ?? plot.cropId,
        quantity,
        harvestedPlots: groupPlots.length,
        giant: true,
        bonusMoney: 0,
        leveledUp: false
      }
    }

    achievementStore.discoverItem(result.cropId)
    achievementStore.recordCropHarvest()
    questStore.onItemObtained(result.cropId, result.quantity)
    const levelResult = skillStore.addExp('farming', 10)

    return {
      success: true,
      cropId: result.cropId,
      cropName: cropDef?.name ?? result.cropId,
      quantity: result.quantity,
      harvestedPlots: groupPlots.length,
      giant: true,
      bonusMoney: 0,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel
    }
  }

  const cropId = plot.cropId
  const cropDef = getCropById(cropId)
  const genetics = plot.seedGenetics
  const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null
  const ringCropQualityBonus = inventoryStore.getRingEffectValue('crop_quality_bonus')
  const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0

  let quality = options.qualityOverride
  if (!quality) {
    quality = skillStore.rollCropQualityWithBonus((fertDef?.qualityBonus ?? 0) + ringCropQualityBonus, allSkillsBuff)
    quality = applyCropBlessing(quality)
  }

  const farmingSkill = skillStore.getSkill('farming')
  const intensiveDouble = farmingSkill.perk10 === 'intensive' && Math.random() < 0.2
  const grandmasterDouble =
    !intensiveDouble && (farmingSkill.perk15 === 'grandmaster_farmer' || farmingSkill.perk15 === 'estate_owner') && Math.random() < 0.2
  const deityDouble =
    !intensiveDouble &&
    !grandmasterDouble &&
    (farmingSkill.perk20 === 'deity_of_harvest' || farmingSkill.perk20 === 'land_god') &&
    Math.random() < 0.5
  const yieldDouble = genetics && !intensiveDouble && !grandmasterDouble && !deityDouble && Math.random() < (genetics.yield / 100) * 0.3
  const harvestQty = intensiveDouble || grandmasterDouble || deityDouble || yieldDouble ? 2 : 1

  if (!inventoryStore.canAddItem(cropId, harvestQty, quality)) {
    return {
      success: false,
      cropId,
      cropName: cropDef?.name ?? cropId,
      quantity: harvestQty,
      quality,
      harvestedPlots: 1,
      giant: false,
      bonusMoney: 0,
      leveledUp: false
    }
  }

  const result = farmStore.harvestPlot(plotId)
  if (!result.cropId || !inventoryStore.addItemExact(cropId, harvestQty, quality)) {
    return {
      success: false,
      cropId,
      cropName: cropDef?.name ?? cropId,
      quantity: harvestQty,
      quality,
      harvestedPlots: 1,
      giant: false,
      bonusMoney: 0,
      leveledUp: false
    }
  }

  achievementStore.discoverItem(cropId)
  achievementStore.recordCropHarvest()
  questStore.onItemObtained(cropId, harvestQty)
  const levelResult = skillStore.addExp('farming', 10)

  let bonusMoney = 0
  if (genetics && genetics.sweetness > 0 && cropDef) {
    bonusMoney = Math.floor((cropDef.sellPrice * harvestQty * genetics.sweetness) / 200)
    if (bonusMoney > 0) {
      playerStore.earnMoney(bonusMoney)
    }
  }

  if (genetics?.isHybrid && genetics.hybridId) {
    breedingStore.recordHybridGrown(genetics.hybridId)
  }

  return {
    success: true,
    cropId,
    cropName: cropDef?.name ?? cropId,
    quantity: harvestQty,
    quality,
    harvestedPlots: 1,
    giant: false,
    bonusMoney,
    leveledUp: levelResult.leveledUp,
    newLevel: levelResult.newLevel
  }
}

export const harvestGreenhousePlotWithRewards = (
  plotId: number,
  options: { qualityOverride?: Quality } = {}
): FarmHarvestResult => {
  const farmStore = useFarmStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const cookingStore = useCookingStore()
  const achievementStore = useAchievementStore()
  const breedingStore = useBreedingStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()

  const plot = farmStore.greenhousePlots[plotId]
  if (!plot || plot.state !== 'harvestable' || !plot.cropId) {
    return buildFailedHarvestResult(null, '', 0)
  }

  const cropId = plot.cropId
  const cropDef = getCropById(cropId)
  const genetics = plot.seedGenetics
  const fertDef = plot.fertilizer ? getFertilizerById(plot.fertilizer) : null
  const ringCropQualityBonus = inventoryStore.getRingEffectValue('crop_quality_bonus')
  const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0

  let quality = options.qualityOverride
  if (!quality) {
    quality = skillStore.rollCropQualityWithBonus((fertDef?.qualityBonus ?? 0) + ringCropQualityBonus, allSkillsBuff)
    quality = applyCropBlessing(quality)
  }

  const farmingSkill = skillStore.getSkill('farming')
  const intensiveDouble = farmingSkill.perk10 === 'intensive' && Math.random() < 0.2
  const grandmasterDouble =
    !intensiveDouble && (farmingSkill.perk15 === 'grandmaster_farmer' || farmingSkill.perk15 === 'estate_owner') && Math.random() < 0.2
  const deityDouble =
    !intensiveDouble &&
    !grandmasterDouble &&
    (farmingSkill.perk20 === 'deity_of_harvest' || farmingSkill.perk20 === 'land_god') &&
    Math.random() < 0.5
  const yieldDouble = genetics && !intensiveDouble && !grandmasterDouble && !deityDouble && Math.random() < (genetics.yield / 100) * 0.3
  const harvestQty = intensiveDouble || grandmasterDouble || deityDouble || yieldDouble ? 2 : 1

  if (!inventoryStore.canAddItem(cropId, harvestQty, quality)) {
    return buildFailedHarvestResult(cropId, cropDef?.name ?? cropId, harvestQty, quality)
  }

  const harvestedCropId = farmStore.greenhouseHarvestPlot(plotId)
  if (!harvestedCropId || !inventoryStore.addItemExact(cropId, harvestQty, quality)) {
    return buildFailedHarvestResult(cropId, cropDef?.name ?? cropId, harvestQty, quality)
  }

  achievementStore.discoverItem(cropId)
  achievementStore.recordCropHarvest()
  questStore.onItemObtained(cropId, harvestQty)
  const levelResult = skillStore.addExp('farming', 10)

  let bonusMoney = 0
  if (genetics && genetics.sweetness > 0 && cropDef) {
    bonusMoney = Math.floor((cropDef.sellPrice * harvestQty * genetics.sweetness) / 200)
    if (bonusMoney > 0) {
      playerStore.earnMoney(bonusMoney)
    }
  }

  if (genetics?.isHybrid && genetics.hybridId) {
    breedingStore.recordHybridGrown(genetics.hybridId)
  }

  return {
    success: true,
    cropId,
    cropName: cropDef?.name ?? cropId,
    quantity: harvestQty,
    quality,
    harvestedPlots: 1,
    giant: false,
    bonusMoney,
    leveledUp: levelResult.leveledUp,
    newLevel: levelResult.newLevel
  }
}
