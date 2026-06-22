import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AlchemyHeat, AlchemyResultKind, MachineType, ProcessingRecipeDef, ProcessingSlot, Quality } from '@/types'
import {
  PROCESSING_MACHINES,
  SPRINKLERS,
  FERTILIZERS,
  BAITS,
  TACKLES,
  TAPPER,
  CRAB_POT_CRAFT,
  BOMBS,
  ALCHEMY_MAIN_DAILY_LIMIT,
  ALCHEMY_SUPPORT_DAILY_LIMIT,
  getRecipesForMachine,
  getProcessingRecipeById
} from '@/data/processing'
import { getItemById } from '@/data/items'
import { normalizeInventoryItemQuality, useInventoryStore } from './useInventoryStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import type { RepairBenchEquipType } from '@/utils/durability'
import { calculateRepairCost, getRepairEquipName } from '@/utils/durability'
import { usePotentialStore } from './usePotentialStore'
import { useGameStore } from './useGameStore'
import { useBreedingStore } from './useBreedingStore'
import { useWarehouseStore } from './useWarehouseStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { addLog } from '@/composables/useGameLog'
import {
  hasCombinedItems,
  removeCombinedItem,
  removeCombinedItems,
  getLowestCombinedQuality,
  getCombinedItemCount
} from '@/composables/useCombinedInventory'
import {
  formatCropUseSubstitutionSummary,
  getCropUseRequirementAvailableCount,
  getLowestCropUsePlanQuality,
  resolveCropUseSubstitutionPlan,
  type CropUseSubstitutionPlan,
  type CropUseSubstitutionRequirement
} from '@/utils/cropUseSubstitution'

/** 工坊升级定义 */
const WORKSHOP_UPGRADES = [
  { level: 1, cost: 10000, materials: [{ itemId: 'iron_bar', quantity: 15 }, { itemId: 'wood', quantity: 50 }] },
  { level: 2, cost: 25000, materials: [{ itemId: 'gold_bar', quantity: 10 }, { itemId: 'wood', quantity: 80 }] },
  { level: 3, cost: 50000, materials: [{ itemId: 'gold_bar', quantity: 20 }, { itemId: 'iridium_bar', quantity: 5 }, { itemId: 'wood', quantity: 120 }] },
  { level: 4, cost: 90000, materials: [{ itemId: 'iridium_bar', quantity: 12 }, { itemId: 'refined_quartz', quantity: 20 }, { itemId: 'stone', quantity: 150 }] },
  { level: 5, cost: 140000, materials: [{ itemId: 'iridium_bar', quantity: 20 }, { itemId: 'refined_quartz', quantity: 35 }, { itemId: 'stone', quantity: 220 }] },
  { level: 6, cost: 200000, materials: [{ itemId: 'iridium_bar', quantity: 30 }, { itemId: 'refined_quartz', quantity: 50 }, { itemId: 'wood', quantity: 220 }] },
  { level: 7, cost: 280000, materials: [{ itemId: 'iridium_bar', quantity: 45 }, { itemId: 'refined_quartz', quantity: 80 }, { itemId: 'bronze_bar', quantity: 6 }, { itemId: 'stone', quantity: 300 }] },
  { level: 8, cost: 380000, materials: [{ itemId: 'iridium_bar', quantity: 60 }, { itemId: 'refined_quartz', quantity: 100 }, { itemId: 'bronze_bar', quantity: 8 }, { itemId: 'stone', quantity: 400 }] },
  { level: 9, cost: 520000, materials: [{ itemId: 'iridium_bar', quantity: 80 }, { itemId: 'refined_quartz', quantity: 130 }, { itemId: 'bronze_bar', quantity: 10 }, { itemId: 'mythril_bar', quantity: 3 }, { itemId: 'wood', quantity: 400 }] },
  { level: 10, cost: 700000, materials: [{ itemId: 'iridium_bar', quantity: 100 }, { itemId: 'refined_quartz', quantity: 160 }, { itemId: 'bronze_bar', quantity: 12 }, { itemId: 'mythril_bar', quantity: 5 }, { itemId: 'stone', quantity: 500 }] },
  { level: 11, cost: 950000, materials: [{ itemId: 'iridium_bar', quantity: 120 }, { itemId: 'refined_quartz', quantity: 200 }, { itemId: 'bronze_bar', quantity: 16 }, { itemId: 'mythril_bar', quantity: 7 }, { itemId: 'stone', quantity: 600 }] },
  { level: 12, cost: 1300000, materials: [{ itemId: 'iridium_bar', quantity: 150 }, { itemId: 'refined_quartz', quantity: 250 }, { itemId: 'bronze_bar', quantity: 20 }, { itemId: 'mythril_bar', quantity: 10 }, { itemId: 'wood', quantity: 500 }] },
  { level: 13, cost: 1800000, materials: [{ itemId: 'iridium_bar', quantity: 190 }, { itemId: 'refined_quartz', quantity: 300 }, { itemId: 'bronze_bar', quantity: 26 }, { itemId: 'mythril_bar', quantity: 14 }, { itemId: 'stone', quantity: 700 }] },
  { level: 14, cost: 2500000, materials: [{ itemId: 'iridium_bar', quantity: 240 }, { itemId: 'refined_quartz', quantity: 370 }, { itemId: 'bronze_bar', quantity: 34 }, { itemId: 'mythril_bar', quantity: 18 }, { itemId: 'wood', quantity: 600 }] },
  { level: 15, cost: 3500000, materials: [{ itemId: 'iridium_bar', quantity: 300 }, { itemId: 'refined_quartz', quantity: 450 }, { itemId: 'bronze_bar', quantity: 45 }, { itemId: 'mythril_bar', quantity: 25 }, { itemId: 'stone', quantity: 800 }] }
]

/** 工坊最高等级 */
export const WORKSHOP_MAX_LEVEL = WORKSHOP_UPGRADES[WORKSHOP_UPGRADES.length - 1]!.level

/** 工坊里程碑被动奖励定义 */
export const WORKSHOP_MILESTONES = [
  { level: 7, id: 'weapon_enchant_basic', name: '武器铸魔', description: '开放随机铸魔' },
  { level: 10, id: 'weapon_enchant_directed', name: '定向铸魔', description: '开放定向附魔' },
  { level: 10, id: 'workshop_speed', name: '加工加速', description: '加工时间缩短 15%' },
  { level: 15, id: 'weapon_enchant_protected', name: '保留重铸', description: '开放保留原附魔重铸' },
  { level: 15, id: 'workshop_double_output', name: '双倍产出', description: '加工完成时 10% 概率双倍产出' }
]

/** 获取工坊等级对应的被动加工速度加成（0~1） */
const getWorkshopSpeedBonus = (level: number): number => {




  if (level >= 15) return 0.15
  if (level >= 10) return 0.15
  return 0
}

/** 获取工坊等级对应的双倍产出概率（0~1） */
const getWorkshopDoubleOutputChance = (level: number): number => {
  if (level >= 15) return 0.10
  return 0
}

export interface ProcessingMachineRemovalEntry {
  itemId: string
  quantity: number
  quality?: Quality
}

export interface ProcessingMachineVoidOutputEntry extends ProcessingMachineRemovalEntry {
  chestId: string
  quality: Quality
}

export interface ProcessingMachineRemovalPreview {
  total: number
  idle: number
  processing: number
  ready: number
  refundEntries: ProcessingMachineRemovalEntry[]
  voidOutputEntries: ProcessingMachineVoidOutputEntry[]
  moneyRefund: number
  canRemove: boolean
}

export interface ProcessingMachineRemovalResult extends ProcessingMachineRemovalPreview {
  removed: number
}

export interface ProcessingCollectedOutputEntry {
  itemId: string
  quantity: number
  quality: Quality
}

export const useProcessingStore = defineStore('processing', () => {
  // ---- DIAGNOSTIC: wrap init to locate actual throw ----
  let inventoryStore: ReturnType<typeof useInventoryStore>
  let playerStore: ReturnType<typeof usePlayerStore>
  let skillStore: ReturnType<typeof useSkillStore>
  let npcStore: ReturnType<typeof useNpcStore>
  try {
    inventoryStore = useInventoryStore()
    playerStore = usePlayerStore()
    skillStore = useSkillStore()
    npcStore = useNpcStore()
    console.info('[processing-store-diag] dependency stores OK')
  } catch (e) {
    console.error('[processing-store-diag] FAILED during dependency init:', e)
    throw e
  }

  /** NPC function quality upgrade chance for a given machineType (0..1) */
  const getNpcQualityUpgradeChance = (mt: MachineType): number => {
    if (mt === 'furnace') return npcStore.getNpcFunctionEffectValue('forge_success_boost') / 100
    if (mt === 'tea_maker') return npcStore.getNpcFunctionEffectValue('tea_ceremony') / 100
    if (mt === 'loom') return npcStore.getNpcFunctionEffectValue('embroidery_boost') / 100
    const foodMachines: MachineType[] = ['sauce_jar','sugar_jar','oil_press','mayo_maker','cheese_press','smoker','tofu_press','drying_rack','dehydrator','bee_house','wine_workshop','herb_grinder','incense_maker']
    if (foodMachines.includes(mt)) return npcStore.getNpcFunctionEffectValue('cook_success_boost') / 100
    return 0
  }
  /** Apply NPC quality upgrade roll; returns the possibly-upgraded quality */
  const applyNpcQualityUpgrade = (mt: MachineType, q: Quality): Quality => {
    const chance = getNpcQualityUpgradeChance(mt)
    if (chance <= 0) return q
    const ORDER: Quality[] = ['normal','fine','excellent','supreme']
    const idx = ORDER.indexOf(q)
    if (idx < 0 || idx >= ORDER.length - 1) return q
    return Math.random() < chance ? (ORDER[idx + 1] ?? q) : q
  }
  const gameStore = useGameStore()

  /** 已放置的加工机器（运行中的槽位） */
  const machines = ref<ProcessingSlot[]>([])
  const discoveredProcessingRecipeIds = ref<string[]>([])
  const alchemyDailyLimitState = ref({
    dayTag: '',
    mainStarted: 0,
    supportStarted: 0
  })

  const QUALITY_VALUES: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  const getQualityRank = (quality: Quality) => QUALITY_VALUES.indexOf(quality)
  const getQualitiesAtLeast = (minQuality: Quality): Quality[] => QUALITY_VALUES.slice(Math.max(0, getQualityRank(minQuality)))
  const isQualityAtLeast = (quality: Quality, minQuality: Quality): boolean => getQualityRank(quality) >= getQualityRank(minQuality)

  const normalizeDiscoveredProcessingRecipeIds = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return []
    return Array.from(new Set(raw.filter((id): id is string => {
      const recipe = typeof id === 'string' ? getProcessingRecipeById(id) : null
      return recipe?.visibility === 'hidden'
    })))
  }

  const isHiddenProcessingRecipeDiscovered = (recipeId: string): boolean => {
    const recipe = getProcessingRecipeById(recipeId)
    return !recipe || recipe.visibility !== 'hidden' || discoveredProcessingRecipeIds.value.includes(recipeId)
  }

  const discoverProcessingRecipe = (recipeId: string): boolean => {
    const recipe = getProcessingRecipeById(recipeId)
    if (recipe?.visibility !== 'hidden') return false
    if (discoveredProcessingRecipeIds.value.includes(recipeId)) return false
    discoveredProcessingRecipeIds.value.push(recipeId)
    return true
  }

  const getProcessingRecipeDisplayName = (recipeId: string): string => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe) return recipeId
    if (recipe.visibility === 'hidden' && !isHiddenProcessingRecipeDiscovered(recipe.id)) {
      return recipe.hiddenMeta?.unknownName ?? '未知加工'
    }
    return recipe.name
  }

  const getMasteryRewardLabel = (rewardId: string): string => skillStore.masteryRewards.find(entry => entry.id === rewardId)?.label ?? rewardId

  const isMachineCraftUnlocked = (machineType: MachineType): boolean => {
    const def = PROCESSING_MACHINES.find(machine => machine.id === machineType)
    if (def?.workshopLevelRequired !== undefined && workshopLevel.value < def.workshopLevelRequired) return false
    if (def?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(def.npcFunctionEffectType)) return false
    return !def?.masteryRewardId || skillStore.isMasteryRewardUnlocked(def.masteryRewardId)
  }

  const getMachineCraftLockedReason = (machineType: MachineType): string => {
    const def = PROCESSING_MACHINES.find(machine => machine.id === machineType)
    if (def?.workshopLevelRequired !== undefined && workshopLevel.value < def.workshopLevelRequired) {
      return `需要工坊 Lv.${def.workshopLevelRequired}`
    }
    if (def?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(def.npcFunctionEffectType)) return 'Need NPC function unlock'
    if (!def?.masteryRewardId || skillStore.isMasteryRewardUnlocked(def.masteryRewardId)) return ''
    return `需要解锁「${getMasteryRewardLabel(def.masteryRewardId)}」。`
  }

  const canAccessProcessingRecipe = (recipe: ProcessingRecipeDef): boolean => {
    if (recipe.visibility !== 'hidden') return true
    const gate = recipe.hiddenMeta?.gate
    if (gate?.workshopLevel !== undefined && workshopLevel.value < gate.workshopLevel) return false
    if (gate?.requiredItemId && getCombinedItemCount(gate.requiredItemId) <= 0) return false
    if (gate?.masteryRewardId && !skillStore.isMasteryRewardUnlocked(gate.masteryRewardId)) return false
    if (gate?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(gate.npcFunctionEffectType)) return false
    return true
  }

  const getAlchemyDayTag = () => `${gameStore.year}:${gameStore.season}:${gameStore.day}`

  const refreshAlchemyDailyLimitState = () => {
    const dayTag = getAlchemyDayTag()
    if (alchemyDailyLimitState.value.dayTag !== dayTag) {
      alchemyDailyLimitState.value = {
        dayTag,
        mainStarted: 0,
        supportStarted: 0
      }
    }
  }

  const getAlchemyDailyLimitStatus = (recipeId: string) => {
    refreshAlchemyDailyLimitState()
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe?.alchemy) return null

    const limit = recipe.alchemy.role === 'main' ? ALCHEMY_MAIN_DAILY_LIMIT : ALCHEMY_SUPPORT_DAILY_LIMIT
    const used = recipe.alchemy.role === 'main' ? alchemyDailyLimitState.value.mainStarted : alchemyDailyLimitState.value.supportStarted
    const remaining = Math.max(0, limit - used)
    return {
      role: recipe.alchemy.role,
      used,
      limit,
      remaining,
      blocked: remaining <= 0
    }
  }

  const getAlchemyDailyLimitSignature = () => {
    refreshAlchemyDailyLimitState()
    return `${alchemyDailyLimitState.value.dayTag}:${alchemyDailyLimitState.value.mainStarted}:${alchemyDailyLimitState.value.supportStarted}`
  }

  const incrementAlchemyDailyUse = (recipeId: string) => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe?.alchemy) return
    refreshAlchemyDailyLimitState()
    if (recipe.alchemy.role === 'main') {
      alchemyDailyLimitState.value.mainStarted++
    } else {
      alchemyDailyLimitState.value.supportStarted++
    }
  }

  const getItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId

  const buildAlchemyMaterialRequirements = (recipe: ProcessingRecipeDef, quantity: number = 1, specifiedQuality?: Quality) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity))
    const requirements: CropUseSubstitutionRequirement[] = []

    if (recipe.inputItemId) {
      requirements.push({
        itemId: recipe.inputItemId,
        quantity: recipe.inputQuantity * normalizedQuantity,
        tags: ['alchemy' as const, 'medicine' as const],
        minQuality: recipe.minInputQuality,
        quality: specifiedQuality
      })
    }

    for (const extra of recipe.extraInputs ?? []) {
      requirements.push({
        itemId: extra.itemId,
        quantity: extra.quantity * normalizedQuantity,
        tags: ['alchemy' as const, 'medicine' as const]
      })
    }

    return requirements
  }

  const resolveAlchemyMaterialPlan = (
    recipe: ProcessingRecipeDef,
    quantity: number = 1,
    specifiedQuality?: Quality
  ): CropUseSubstitutionPlan => {
    return resolveCropUseSubstitutionPlan(buildAlchemyMaterialRequirements(recipe, quantity, specifiedQuality), getCombinedItemCount)
  }

  const getAlchemyMaterialPlan = (recipeId: string, quantity: number = 1, specifiedQuality?: Quality): CropUseSubstitutionPlan => {
    const recipe = getProcessingRecipeById(recipeId)
    return recipe?.alchemy
      ? resolveAlchemyMaterialPlan(recipe, quantity, specifiedQuality)
      : { fulfilled: false, entries: [], missing: [] }
  }

  const getAlchemyRequirementAvailableCount = (recipeId: string, itemId: string, specifiedQuality?: Quality): number => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe?.alchemy) return getCombinedItemCount(itemId, specifiedQuality)
    const requirement = buildAlchemyMaterialRequirements(recipe, 1, specifiedQuality).find(entry => entry.itemId === itemId)
    return requirement ? getCropUseRequirementAvailableCount(requirement, getCombinedItemCount) : getCombinedItemCount(itemId, specifiedQuality)
  }

  const getAlchemySubstitutionText = (recipeId: string, quantity: number = 1, specifiedQuality?: Quality): string => {
    return formatCropUseSubstitutionSummary(getAlchemyMaterialPlan(recipeId, quantity, specifiedQuality), getItemName)
  }

  const getAlchemyMaterialProcessLimit = (recipe: ProcessingRecipeDef, maxLimit: number, specifiedQuality?: Quality): number => {
    let low = 0
    let high = Math.max(0, Math.floor(maxLimit))
    while (low < high) {
      const mid = Math.ceil((low + high + 1) / 2)
      if (resolveAlchemyMaterialPlan(recipe, mid, specifiedQuality).fulfilled) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    return low
  }

  const getAlchemyMainInputQuality = (recipe: ProcessingRecipeDef, plan: CropUseSubstitutionPlan): Quality => {
    const mainEntries = recipe.inputItemId ? plan.entries.filter(entry => entry.requirementItemId === recipe.inputItemId) : []
    return mainEntries.length > 0 ? getLowestCropUsePlanQuality({ fulfilled: true, entries: mainEntries, missing: [] }) : 'normal'
  }

  const toConsumedInputs = (plan: CropUseSubstitutionPlan): ProcessingSlot['consumedInputs'] =>
    plan.entries.map(entry => ({
      requirementItemId: entry.requirementItemId,
      itemId: entry.itemId,
      quantity: entry.quantity,
      quality: entry.quality,
      substitute: entry.substitute
    }))

  const normalizeConsumedInputs = (value: unknown): ProcessingSlot['consumedInputs'] => {
    if (!Array.isArray(value)) return undefined
    const entries = value
      .map((raw): NonNullable<ProcessingSlot['consumedInputs']>[number] | null => {
        if (!raw || typeof raw !== 'object') return null
        const entry = raw as Record<string, unknown>
        const itemId = typeof entry.itemId === 'string' ? entry.itemId : ''
        const quantity = Math.max(1, Math.floor(Number(entry.quantity) || 0))
        if (!itemId || quantity <= 0) return null
        const rawQuality = typeof entry.quality === 'string' ? entry.quality : undefined
        const quality = rawQuality && QUALITY_VALUES.includes(rawQuality as Quality) ? (rawQuality as Quality) : undefined
        return {
          requirementItemId: typeof entry.requirementItemId === 'string' ? entry.requirementItemId : undefined,
          itemId,
          quantity,
          quality,
          substitute: entry.substitute === true
        }
      })
      .filter((entry): entry is NonNullable<ProcessingSlot['consumedInputs']>[number] => entry !== null)
    return entries.length > 0 ? entries : undefined
  }

  const getDefaultRecipeRefundEntries = (recipe: ProcessingRecipeDef, quality: Quality): { itemId: string; quantity: number; quality?: Quality }[] => {
    const entries: { itemId: string; quantity: number; quality?: Quality }[] = (recipe.extraInputs ?? []).map(extra => ({ itemId: extra.itemId, quantity: extra.quantity }))
    if (recipe.inputItemId) entries.push({ itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality })
    return entries
  }

  // 合并所有加速比率后一次取整，避免逐步 Math.ceil 吃掉加速效果（例如 3天×0.75=2.25→ceil=3 变成无效）
  const getEffectiveProcessingDays = (recipe: ProcessingRecipeDef, machineType: MachineType): number => {
    let multiplier = 1
    const processingFlowBonus = skillStore.getSkillMasteryEffectValue('processing_flow')
    if (processingFlowBonus > 0) multiplier *= (1 - processingFlowBonus)
    const potentialProcessingBonus = usePotentialStore().getPotentialEffectValue('potential_processing_speed')
    if (potentialProcessingBonus > 0) multiplier *= (1 - potentialProcessingBonus)
    // 工坊里程碑：Lv.10 加工速度 +15%
    const workshopSpeedBonus = getWorkshopSpeedBonus(workshopLevel.value)
    if (workshopSpeedBonus > 0) multiplier *= (1 - workshopSpeedBonus)
    // NPC function percentage speed bonuses (cloth_speed, herb_craft_boost, wine_aging_boost)
    const _npcPctSpeedType = machineType === 'loom' ? 'cloth_speed' : machineType === 'herb_grinder' ? 'herb_craft_boost' : machineType === 'wine_workshop' ? 'wine_aging_boost' : ''
    if (_npcPctSpeedType) {
      const _npcPctSpeed = npcStore.getNpcFunctionEffectValue(_npcPctSpeedType) / 100
      if (_npcPctSpeed > 0) multiplier *= (1 - _npcPctSpeed)
    }
    // 仙缘能力：织速（gui_nv_1）织布机加工时间-30%
    if (machineType === 'loom' && useHiddenNpcStore().isAbilityActive('gui_nv_1')) {
      multiplier *= 0.7
    }
    let _days = Math.max(1, Math.ceil(recipe.processingDays * multiplier))
    // NPC function flat day reductions (forge_speed, tool_upgrade_speed)
    if (machineType === 'furnace') {
      const fsd = npcStore.getNpcFunctionEffectValue('forge_speed')
      if (fsd > 0) _days = Math.max(1, _days - fsd)
    } else if (machineType === 'repair_bench') {
      const tsd = npcStore.getNpcFunctionEffectValue('tool_upgrade_speed')
      if (tsd > 0) _days = Math.max(1, _days - tsd)
    }
    return _days
  }

  const getSlotInputRefundEntries = (slot: ProcessingSlot, recipe: ProcessingRecipeDef): { itemId: string; quantity: number; quality?: Quality }[] => {
    if (slot.consumedInputs?.length) {
      return slot.consumedInputs.map(entry => ({
        itemId: entry.itemId,
        quantity: entry.quantity,
        quality: entry.quality
      }))
    }
    return getDefaultRecipeRefundEntries(recipe, slot.inputQuality ?? 'normal')
  }

  const ALCHEMY_RESULT_KINDS: AlchemyResultKind[] = ['success', 'partial', 'failed', 'rare']
  const ALCHEMY_QUALITY_WEIGHT_BONUS: Record<Quality, Partial<Record<AlchemyResultKind, number>>> = {
    normal: {},
    fine: { success: 6, partial: -1, failed: -2, rare: 1 },
    excellent: { success: 10, partial: -2, failed: -3, rare: 2 },
    supreme: { success: 14, partial: -3, failed: -4, rare: 4 }
  }
  const ALCHEMY_HEAT_WEIGHT_BONUS: Record<AlchemyHeat, Partial<Record<AlchemyResultKind, number>>> = {
    gentle: { success: 5, partial: 1, failed: -2, rare: -1 },
    steady: { success: 2, partial: -1, failed: -1, rare: 1 },
    strong: { success: -3, partial: -2, failed: 3, rare: 5 }
  }
  const ALCHEMY_TOLERANCE_WEIGHT_BONUS: Record<AlchemyResultKind, number> = {
    success: 16,
    partial: -4,
    failed: -24,
    rare: 8
  }

  const sanitizeAlchemyResult = (recipe: ProcessingRecipeDef | null, raw: unknown): ProcessingSlot['alchemyResult'] | undefined => {
    if (!recipe?.alchemy?.results?.length || !raw || typeof raw !== 'object') return undefined

    const result = raw as Record<string, unknown>
    const kind = typeof result.kind === 'string' && ALCHEMY_RESULT_KINDS.includes(result.kind as AlchemyResultKind)
      ? (result.kind as AlchemyResultKind)
      : null
    if (!kind) return undefined

    const outputItemId = typeof result.outputItemId === 'string' ? result.outputItemId : ''
    const rule = recipe.alchemy.results.find(entry => entry.kind === kind && entry.outputItemId === outputItemId)
    if (!rule) return undefined

    return {
      kind,
      outputItemId: rule.outputItemId,
      outputQuantity: Math.max(1, rule.outputQuantity),
      label: rule.label,
      description: rule.description
    }
  }

  const resolveAlchemyResult = (recipe: ProcessingRecipeDef, inputQuality: Quality): ProcessingSlot['alchemyResult'] | undefined => {
    if (!recipe.alchemy?.results?.length) return undefined
    const potentialAlchemyTolerance = usePotentialStore().getPotentialEffectValue('potential_alchemy_tolerance')

    const weightedRules = recipe.alchemy.results.map(rule => ({
      rule,
      weight: Math.max(
        0.1,
        rule.weight +
          (ALCHEMY_QUALITY_WEIGHT_BONUS[inputQuality][rule.kind] ?? 0) +
          (ALCHEMY_HEAT_WEIGHT_BONUS[recipe.alchemy!.heat][rule.kind] ?? 0) +
          potentialAlchemyTolerance * ALCHEMY_TOLERANCE_WEIGHT_BONUS[rule.kind]
      )
    }))
    const totalWeight = weightedRules.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = Math.random() * totalWeight

    for (const entry of weightedRules) {
      roll -= entry.weight
      if (roll <= 0) {
        return {
          kind: entry.rule.kind,
          outputItemId: entry.rule.outputItemId,
          outputQuantity: entry.rule.outputQuantity,
          label: entry.rule.label,
          description: entry.rule.description
        }
      }
    }

    const fallback = weightedRules[0]?.rule
    return fallback
      ? {
          kind: fallback.kind,
          outputItemId: fallback.outputItemId,
          outputQuantity: fallback.outputQuantity,
          label: fallback.label,
          description: fallback.description
        }
      : undefined
  }

  const prepareAlchemyResult = (slot: ProcessingSlot, recipe: ProcessingRecipeDef) => {
    if (!recipe.alchemy || slot.alchemyResult) return
    slot.alchemyResult = resolveAlchemyResult(recipe, slot.inputQuality ?? 'normal')
  }

  const getSlotOutput = (slot: ProcessingSlot, recipe: ProcessingRecipeDef) => {
    if (recipe.alchemy && slot.alchemyResult) {
      return {
        itemId: slot.alchemyResult.outputItemId,
        quantity: slot.alchemyResult.outputQuantity
      }
    }
    if (!recipe.outputItemId) return null
    return {
      itemId: recipe.outputItemId,
      quantity: recipe.outputQuantity
    }
  }

  const getSlotCompletionName = (slot: ProcessingSlot, recipe: ProcessingRecipeDef): string => {
    const output = getSlotOutput(slot, recipe)
    if (!output) return getProcessingRecipeDisplayName(recipe.id)
    const outputName = getItemById(output.itemId)?.name ?? output.itemId
    return slot.alchemyResult ? `${slot.alchemyResult.label}：${outputName}` : getProcessingRecipeDisplayName(recipe.id)
  }

  const getSlotOutputEntry = (
    slot: ProcessingSlot,
    recipe: ProcessingRecipeDef,
    quality: Quality
  ): ProcessingCollectedOutputEntry => {
    const output = getSlotOutput(slot, recipe)
    if (!output) throw new Error(`Recipe ${recipe.id} has no output item`)
    return { itemId: output.itemId, quantity: output.quantity, quality: normalizeInventoryItemQuality(output.itemId, quality) }
  }

  const getOutputSummaryKey = (entry: ProcessingCollectedOutputEntry): string => `${entry.itemId}:${entry.quality}`

  const formatCollectedOutputSummary = (entries: ProcessingCollectedOutputEntry[]): string => {
    const summary = new Map<string, ProcessingCollectedOutputEntry>()
    for (const entry of entries) {
      const key = getOutputSummaryKey(entry)
      const existing = summary.get(key)
      if (existing) {
        existing.quantity += entry.quantity
      } else {
        summary.set(key, { ...entry })
      }
    }

    const qualityLabel: Record<Quality, string> = {
      normal: '',
      fine: '优质',
      excellent: '精品',
      supreme: '极品'
    }

    return Array.from(summary.values())
      .map(entry => {
        const name = getItemName(entry.itemId)
        const qualityText = qualityLabel[entry.quality]
        return `${qualityText ? `${qualityText}` : ''}${name}×${entry.quantity}`
      })
      .join('、')
  }

  const storeProcessingOutput = (itemId: string, quantity: number, quality: Quality): boolean => {
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    if (voidOutput && warehouseStore.addItemToChest(voidOutput.id, itemId, quantity, quality)) return true
    return inventoryStore.addItemExact(itemId, quantity, quality)
  }

  const getProcessingRawMaterialReturnEntries = (
    slot: ProcessingSlot,
    recipe: ProcessingRecipeDef
  ): { itemId: string; quantity: number; quality?: Quality }[] => {
    const sourceEntries = getSlotInputRefundEntries(slot, recipe)
    if (sourceEntries.length <= 0) return []
    const mainEntryIndex = recipe.inputItemId
      ? sourceEntries.findIndex(entry => entry.itemId === recipe.inputItemId && entry.quantity > 0)
      : -1
    const selectedIndex = mainEntryIndex >= 0 ? mainEntryIndex : sourceEntries.findIndex(entry => entry.quantity > 0)
    const selected = sourceEntries[selectedIndex]
    return selected ? [{ itemId: selected.itemId, quantity: 1, quality: selected.quality }] : []
  }

  const tryPotentialRawMaterialReturn = (slot: ProcessingSlot, recipe: ProcessingRecipeDef): boolean => {
    const chance = usePotentialStore().getPotentialEffectValue('potential_workshop_hint')
    if (chance <= 0 || Math.random() >= chance) return false
    const entries = getProcessingRawMaterialReturnEntries(slot, recipe)
    if (entries.length <= 0 || !entries.every(entry => storeProcessingOutput(entry.itemId, entry.quantity, entry.quality ?? 'normal'))) return false
    addLog(`工坊手记触发：${getSlotCompletionName(slot, recipe)}返还了${getItemName(entries[0]!.itemId)}×1。`, {
      category: 'processing',
      tags: ['potential_workshop_refund'],
      meta: { machineType: slot.machineType, recipeId: recipe.id, itemId: entries[0]!.itemId }
    })
    return true
  }

  const tryWorkshopDoubleOutput = (
    slot: ProcessingSlot,
    recipe: ProcessingRecipeDef,
    quality: Quality
  ): ProcessingCollectedOutputEntry | null => {
    const chance = workshopDoubleOutputChance.value
    if (chance <= 0 || Math.random() >= chance) return null
    const output = getSlotOutput(slot, recipe)
    if (!output) return null
    if (!storeProcessingOutput(output.itemId, output.quantity, quality)) return null
    const entry = getSlotOutputEntry(slot, recipe, quality)
    addLog(`工坊精研触发：额外产出${formatCollectedOutputSummary([entry])}。`, {
      category: 'processing',
      tags: ['workshop_double_output'],
      meta: { machineType: slot.machineType, recipeId: recipe.id, outputItemId: output.itemId }
    })
    return entry
  }

  const getIdleMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !slot.recipeId)
      .map(({ index }) => index)

  const getReadyMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !!slot.recipeId && slot.ready)
      .map(({ index }) => index)

  const getProcessingMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !!slot.recipeId && !slot.ready)
      .map(({ index }) => index)

  const normalizeLegacyRecipeId = (machineType: MachineType, recipeId: string | null | undefined): string | null => {
    if (!recipeId) return null

    const directRecipe = getProcessingRecipeById(recipeId)
    if (directRecipe?.machineType === machineType) return recipeId

    if (recipeId === 'fish_feed') {
      if (machineType === 'mill') return 'mill_fish_feed'
      if (machineType === 'recycler') return 'recycle_fish_feed'
    }

    return null
  }

  const sanitizeProcessingSlot = (raw: unknown): ProcessingSlot | null => {
    if (!raw || typeof raw !== 'object') return null

    const slot = raw as Partial<ProcessingSlot>
    const machineType = typeof slot.machineType === 'string' ? (slot.machineType as MachineType) : null
    if (!machineType || !PROCESSING_MACHINES.some(machine => machine.id === machineType)) return null

    const recipeId = normalizeLegacyRecipeId(machineType, typeof slot.recipeId === 'string' ? slot.recipeId : null)
    const recipe = recipeId ? getProcessingRecipeById(recipeId) : null
    const rawQuality = typeof slot.inputQuality === 'string' ? slot.inputQuality : undefined
    const inputQuality = rawQuality && QUALITY_VALUES.includes(rawQuality as Quality) ? (rawQuality as Quality) : undefined

    const daysProcessed = Math.max(0, Number(slot.daysProcessed) || 0)
    const totalDays = recipe ? Math.max(1, Number(slot.totalDays) || recipe.processingDays) : 0
    const ready = !!recipe && !!slot.ready
    const alchemyResult = ready ? sanitizeAlchemyResult(recipe, (slot as any).alchemyResult) : undefined
    const consumedInputs = ready ? undefined : normalizeConsumedInputs((slot as any).consumedInputs)

    const sanitized: ProcessingSlot = {
      machineType,
      recipeId,
      inputItemId: recipe ? recipe.inputItemId : null,
      inputQuality,
      consumedInputs,
      daysProcessed: recipe ? Math.min(daysProcessed, totalDays) : 0,
      totalDays,
      ready
    }
    if (alchemyResult) sanitized.alchemyResult = alchemyResult
    if (machineType === 'repair_bench') {
      const rawRepairId = (slot as any).repairTargetId
      const rawRepairSlot = (slot as any).repairTargetSlot
      if (typeof rawRepairId === 'string' && rawRepairId) sanitized.repairTargetId = rawRepairId
      if (typeof rawRepairSlot === 'string' && rawRepairSlot) sanitized.repairTargetSlot = rawRepairSlot
    }
    return sanitized
  }

  /** 工坊等级：0-7，对应 15-50 */
  const workshopLevel = ref(0)

  /** 最大放置机器数 */
  const maxMachines = computed(() => 15 + workshopLevel.value * 5)

  /** 当前工坊速度加成（0~1） */
  const workshopSpeedBonus = computed(() => getWorkshopSpeedBonus(workshopLevel.value))

  /** 当前工坊双倍产出概率（0~1） */
  const workshopDoubleOutputChance = computed(() => getWorkshopDoubleOutputChance(workshopLevel.value))

  /** 已激活的工坊里程碑列表 */
  const activeMilestones = computed(() => WORKSHOP_MILESTONES.filter(m => workshopLevel.value >= m.level))

  /** 即将达到的下一个里程碑 */
  const nextMilestone = computed(() => WORKSHOP_MILESTONES.find(m => workshopLevel.value < m.level) ?? null)

  /** 当前放置数量 */
  const machineCount = computed(() => machines.value.length)

  // === 制造(Craft) ===

  /** 检查是否有足够材料制造某样东西 */
  const canCraft = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (playerStore.money < craftMoney) return false
    return hasCombinedItems(craftCost)
  }

  /** 消耗材料 */
  const consumeCraftMaterials = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (!canCraft(craftCost, craftMoney)) return false
    if (!playerStore.spendMoney(craftMoney)) return false
    if (!removeCombinedItems(craftCost)) {
      playerStore.earnMoney(craftMoney)
      return false
    }
    return true
  }

  /** 制造并放置一台加工机器 */
  const craftMachine = (machineType: MachineType): boolean => {
    if (machines.value.length >= maxMachines.value) return false
    const def = PROCESSING_MACHINES.find(m => m.id === machineType)
    if (!def) return false
    if (!isMachineCraftUnlocked(machineType)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    machines.value.push({
      machineType,
      recipeId: null,
      inputItemId: null,
      daysProcessed: 0,
      totalDays: 0,
      ready: false
    })
    return true
  }

  /** 制造洒水器（返回物品ID放入背包） */
  const craftSprinkler = (sprinklerId: string): boolean => {
    const def = SPRINKLERS.find(s => s.id === sprinklerId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造肥料 */
  const craftFertilizer = (fertilizerId: string): boolean => {
    const def = FERTILIZERS.find(f => f.id === fertilizerId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造鱼饵 */
  const craftBait = (baitId: string): boolean => {
    const def = BAITS.find(b => b.id === baitId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造浮漂 */
  const craftTackle = (tackleId: string): boolean => {
    const def = TACKLES.find(t => t.id === tackleId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造采脂器 */
  const craftTapper = (): boolean => {
    if (!inventoryStore.canAddItem(TAPPER.id)) return false
    if (!consumeCraftMaterials(TAPPER.craftCost, TAPPER.craftMoney)) return false
    return inventoryStore.addItemExact(TAPPER.id)
  }

  /** 制造蟹笼 */
  const craftCrabPot = (): boolean => {
    if (!inventoryStore.canAddItem(CRAB_POT_CRAFT.id)) return false
    if (!consumeCraftMaterials(CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney)) return false
    return inventoryStore.addItemExact(CRAB_POT_CRAFT.id)
  }

  /** 制造炸弹 */
  const craftBomb = (bombId: string): boolean => {
    const def = BOMBS.find(b => b.id === bombId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  // === 加工操作 ===

  /** 检测背包+仓库中某物品的最低品质（removeItem 默认消耗顺序） */
  const getLowestQuality = (itemId: string): Quality => {
    return getLowestCombinedQuality(itemId)
  }

  const getCombinedItemCountAtMinQuality = (itemId: string, minQuality: Quality): number =>
    getQualitiesAtLeast(minQuality).reduce((sum, quality) => sum + getCombinedItemCount(itemId, quality), 0)

  const removeCombinedItemAtMinQuality = (itemId: string, quantity: number, minQuality: Quality): Quality | null => {
    if (getCombinedItemCountAtMinQuality(itemId, minQuality) < quantity) return null
    let remaining = quantity
    let lowestConsumedQuality: Quality | null = null

    for (const quality of getQualitiesAtLeast(minQuality)) {
      if (remaining <= 0) break
      const available = getCombinedItemCount(itemId, quality)
      if (available <= 0) continue
      const take = Math.min(remaining, available)
      if (!removeCombinedItem(itemId, take, quality)) return null
      lowestConsumedQuality ??= quality
      remaining -= take
    }

    return remaining <= 0 ? lowestConsumedQuality : null
  }

  const getBatchProcessLimit = (machineType: MachineType, recipeId: string, specifiedQuality?: Quality): number => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== machineType) return 0

    let limit = getIdleMachineIndicesByType(machineType).length
    if (limit <= 0) return 0

    const alchemyLimit = getAlchemyDailyLimitStatus(recipeId)
    if (alchemyLimit) {
      limit = Math.min(limit, alchemyLimit.remaining)
    }

    if (recipe.alchemy) {
      return getAlchemyMaterialProcessLimit(recipe, limit, specifiedQuality)
    }

    if (recipe.inputItemId !== null) {
      const availableInput = specifiedQuality
        ? recipe.minInputQuality && !isQualityAtLeast(specifiedQuality, recipe.minInputQuality)
          ? 0
          : getCombinedItemCount(recipe.inputItemId, specifiedQuality)
        : recipe.minInputQuality
          ? getCombinedItemCountAtMinQuality(recipe.inputItemId, recipe.minInputQuality)
          : getCombinedItemCount(recipe.inputItemId)
      limit = Math.min(limit, Math.floor(availableInput / recipe.inputQuantity))
    }

    if (recipe.extraInputs?.length) {
      for (const extra of recipe.extraInputs) {
        limit = Math.min(limit, Math.floor(getCombinedItemCount(extra.itemId) / extra.quantity))
      }
    }

    return Math.max(limit, 0)
  }

  const canRefundItems = (entries: { itemId: string; quantity: number; quality?: Quality }[]): boolean => {
    if (entries.length === 0) return true
    return inventoryStore.canAddItems(entries.map(entry => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
      quality: entry.quality ?? 'normal'
    })))
  }

  const refundItemsExact = (entries: { itemId: string; quantity: number; quality?: Quality }[]): boolean => {
    if (entries.length === 0) return true
    return inventoryStore.addItemsExact(entries.map(entry => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
      quality: entry.quality ?? 'normal'
    })))
  }

  /** 向已放置的机器投入原料开始加工。specifiedQuality 可指定消耗的品质 */
  const startProcessing = (slotIndex: number, recipeId: string, specifiedQuality?: Quality): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || slot.recipeId !== null) return false // 正在加工中
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== slot.machineType) return false

    const alchemyLimit = getAlchemyDailyLimitStatus(recipeId)
    if (alchemyLimit?.blocked) return false

    if (recipe.alchemy) {
      const materialPlan = resolveAlchemyMaterialPlan(recipe, 1, specifiedQuality)
      if (!materialPlan.fulfilled) return false
      const quality = getAlchemyMainInputQuality(recipe, materialPlan)
      if (!removeCombinedItems(materialPlan.entries)) return false

      slot.recipeId = recipeId
      slot.inputItemId = recipe.inputItemId
      slot.inputQuality = quality
      slot.consumedInputs = toConsumedInputs(materialPlan)
      slot.alchemyResult = undefined
      slot.daysProcessed = 0
      slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)
      slot.ready = false
      incrementAlchemyDailyUse(recipeId)
      return true
    }

    if (recipe.extraInputs && recipe.extraInputs.length > 0 && !hasCombinedItems(recipe.extraInputs)) return false

    const inventorySnapshot = inventoryStore.serialize()
    const warehouseStore = useWarehouseStore()
    const warehouseSnapshot = warehouseStore.serialize()

    // 消耗输入材料（蜂箱无需输入），记录投入品质
    let quality: Quality = 'normal'
    if (recipe.inputItemId !== null) {
      if (specifiedQuality !== undefined) {
        if (recipe.minInputQuality && !isQualityAtLeast(specifiedQuality, recipe.minInputQuality)) return false
        quality = specifiedQuality
        if (!removeCombinedItem(recipe.inputItemId, recipe.inputQuantity, specifiedQuality)) return false
      } else if (recipe.minInputQuality) {
        const consumedQuality = removeCombinedItemAtMinQuality(recipe.inputItemId, recipe.inputQuantity, recipe.minInputQuality)
        if (!consumedQuality) return false
        quality = consumedQuality
      } else {
        quality = getLowestQuality(recipe.inputItemId)
        if (!removeCombinedItem(recipe.inputItemId, recipe.inputQuantity)) return false
      }
    }
    // 消耗额外副材料（合金配方）
    if (recipe.extraInputs && recipe.extraInputs.length > 0) {
      if (!removeCombinedItems(recipe.extraInputs)) {
        inventoryStore.deserialize(inventorySnapshot)
        warehouseStore.deserialize(warehouseSnapshot)
        return false
      }
    }

    slot.recipeId = recipeId
    slot.inputItemId = recipe.inputItemId
    slot.inputQuality = quality
    slot.consumedInputs = undefined
    slot.alchemyResult = undefined
    slot.daysProcessed = 0
    slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)
    slot.ready = false
    incrementAlchemyDailyUse(recipeId)
    return true
  }

  const startRepairBench = (
    slotIndex: number,
    equipType: RepairBenchEquipType,
    equipIndex: number,
    defId: string
  ): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || slot.machineType !== 'repair_bench' || slot.recipeId !== null) return false

    const recipeId = `repair_${equipType}`
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== 'repair_bench') return false

    const unlocked = npcStore.isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []
    const cost = calculateRepairCost(equipType, defId, unlocked)
    if (playerStore.money < cost.money) return false
    if (!hasCombinedItems([{ itemId: cost.materialItemId, quantity: cost.materialQuantity }])) return false

    const inventorySnapshot = inventoryStore.serialize()
    if (!playerStore.spendMoney(cost.money)) return false
    if (!removeCombinedItems([{ itemId: cost.materialItemId, quantity: cost.materialQuantity }])) {
      inventoryStore.deserialize(inventorySnapshot)
      playerStore.earnMoney(cost.money, { countAsEarned: false })
      return false
    }

    slot.recipeId = recipeId
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.consumedInputs = undefined
    slot.alchemyResult = undefined
    slot.repairTargetId = String(equipIndex)
    slot.repairTargetSlot = equipType
    slot.daysProcessed = 0
    slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)
    slot.ready = false
    return true
  }

  const startProcessingBatch = (machineType: MachineType, recipeId: string, quantity?: number, specifiedQuality?: Quality): number => {
    const maxCount = getBatchProcessLimit(machineType, recipeId, specifiedQuality)
    const targetCount = Math.min(quantity ?? maxCount, maxCount)
    if (targetCount <= 0) return 0

    let started = 0
    for (const slotIndex of getIdleMachineIndicesByType(machineType)) {
      if (started >= targetCount) break
      if (startProcessing(slotIndex, recipeId, specifiedQuality)) started++
    }
    return started
  }

  /** 收取加工产物 */
  const collectProduct = (slotIndex: number): string | null => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.ready || !slot.recipeId) return null

    const recipe = getProcessingRecipeById(slot.recipeId)
    if (!recipe) return null
    // 修理台：修理装备后重置槽位
    if (slot.machineType === 'repair_bench' && slot.repairTargetId != null && slot.repairTargetSlot) {
      const idx = parseInt(slot.repairTargetId) || 0
      const repaired = inventoryStore.repairOwnedEquipment(slot.repairTargetSlot, idx)
      if (repaired) {
        const equipName = slot.repairTargetSlot === 'weapon'
          ? (inventoryStore as any).ownedWeapons?.[idx]?.defId ?? ''
          : slot.repairTargetSlot === 'ring'
            ? (inventoryStore as any).ownedRings?.[idx]?.defId ?? ''
            : slot.repairTargetSlot === 'hat'
              ? (inventoryStore as any).ownedHats?.[idx]?.defId ?? ''
              : (inventoryStore as any).ownedShoes?.[idx]?.defId ?? ''
        const displayName = equipName ? getRepairEquipName(slot.repairTargetSlot as RepairBenchEquipType, equipName) : slot.repairTargetSlot
        addLog(`修理完成：${displayName} 恢复全部耐久。`)
        slot.recipeId = null
        slot.inputItemId = null
        slot.repairTargetId = undefined
        slot.repairTargetSlot = undefined
        slot.consumedInputs = undefined
        slot.alchemyResult = undefined
        slot.daysProcessed = 0
        slot.totalDays = 0
        slot.ready = false
        return recipe.id
      }
      return null
    }

    // 优先放入虚空成品箱，箱子满则回退到背包
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    const outputQuality = applyNpcQualityUpgrade(slot.machineType, slot.inputQuality ?? 'normal')
    const output = getSlotOutput(slot, recipe)
    if (!output) return null
    if (voidOutput) {
      if (!warehouseStore.addItemToChest(voidOutput.id, output.itemId, output.quantity, outputQuality)) {
        if (!inventoryStore.canAddItem(output.itemId, output.quantity, outputQuality)) return null
        if (!inventoryStore.addItemExact(output.itemId, output.quantity, outputQuality)) return null
      }
    } else {
      if (!inventoryStore.canAddItem(output.itemId, output.quantity, outputQuality)) return null
      if (!inventoryStore.addItemExact(output.itemId, output.quantity, outputQuality)) return null
    }

    tryWorkshopDoubleOutput(slot, recipe, outputQuality)
    tryPotentialRawMaterialReturn(slot, recipe)

    // 种子制造机额外触发育种种子生成
    if (slot.machineType === 'seed_maker' && slot.inputItemId) {
      const breedingStore = useBreedingStore()
      const farmingLevel = skillStore.farmingLevel
      if (breedingStore.trySeedMakerGeneticSeed(slot.inputItemId, farmingLevel)) {
        addLog('种子制造机额外产出了一颗育种种子！', {
          category: 'processing',
          tags: ['processing_seed_bonus'],
          meta: { machineType: 'seed_maker', inputItemId: slot.inputItemId ?? '' }
        })
      }
    }

    if (discoverProcessingRecipe(recipe.id)) {
      addLog(`发现隐藏加工配方：${recipe.name}！`, {
        category: 'processing',
        meta: { recipeId: recipe.id, machineType: recipe.machineType, inputItemId: recipe.inputItemId ?? '' }
      })
    }

    // 重置槽位
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.consumedInputs = undefined
    slot.alchemyResult = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false

    return output.itemId
  }

  const collectProductsByType = (machineType: MachineType): { collected: number; blocked: number; outputs: string[] } => {
    let collected = 0
    let blocked = 0
    const outputs: string[] = []

    for (const slotIndex of getReadyMachineIndicesByType(machineType)) {
      const outputId = collectProduct(slotIndex)
      if (outputId) {
        collected++
        outputs.push(outputId)
      } else {
        blocked++
      }
    }

    return { collected, blocked, outputs }
  }

  const createEmptyMachineRemovalPreview = (): ProcessingMachineRemovalPreview => ({
    total: 0,
    idle: 0,
    processing: 0,
    ready: 0,
    refundEntries: [],
    voidOutputEntries: [],
    moneyRefund: 0,
    canRemove: false
  })

  const cloneProcessingSlot = (slot: ProcessingSlot): ProcessingSlot => {
    const clone: ProcessingSlot = {
      machineType: slot.machineType,
      recipeId: slot.recipeId,
      inputItemId: slot.inputItemId,
      inputQuality: slot.inputQuality,
      consumedInputs: slot.consumedInputs?.map(entry => ({ ...entry })),
      alchemyResult: slot.alchemyResult ? { ...slot.alchemyResult } : undefined,
      daysProcessed: slot.daysProcessed,
      totalDays: slot.totalDays,
      ready: slot.ready
    }
    if (slot.repairTargetId) clone.repairTargetId = slot.repairTargetId
    if (slot.repairTargetSlot) clone.repairTargetSlot = slot.repairTargetSlot
    return clone
  }

  const normalizeMachineRemovalIndices = (slotIndices: number[]) =>
    Array.from(new Set(slotIndices))
      .filter(index => Number.isInteger(index) && index >= 0 && index < machines.value.length)

  const getMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType)
      .map(({ index }) => index)

  const previewMachineRemovalBySlotIndices = (slotIndices: number[]): ProcessingMachineRemovalPreview => {
    const indices = normalizeMachineRemovalIndices(slotIndices)
    if (indices.length === 0) return createEmptyMachineRemovalPreview()

    const warehouseStore = useWarehouseStore()
    const warehouseSnapshot = warehouseStore.serialize()
    const preview = createEmptyMachineRemovalPreview()

    try {
      for (const slotIndex of indices) {
        const slot = machines.value[slotIndex]
        if (!slot) continue

        preview.total++
        if (!slot.recipeId) {
          preview.idle++
        } else if (slot.ready) {
          preview.ready++
        } else {
          preview.processing++
        }

        const machineDef = PROCESSING_MACHINES.find(m => m.id === slot.machineType)
        const recipe = slot.recipeId ? getProcessingRecipeById(slot.recipeId) : null
        const voidOutput = warehouseStore.getVoidOutputChest()

        if (slot.recipeId && slot.ready && recipe) {
          const outputQuality = applyNpcQualityUpgrade(slot.machineType, slot.inputQuality ?? 'normal')
          const output = getSlotOutput(slot, recipe)
          if (!output) continue
          if (voidOutput && warehouseStore.addItemToChest(voidOutput.id, output.itemId, output.quantity, outputQuality)) {
            preview.voidOutputEntries.push({
              chestId: voidOutput.id,
              itemId: output.itemId,
              quantity: output.quantity,
              quality: outputQuality
            })
          } else {
            preview.refundEntries.push({ itemId: output.itemId, quantity: output.quantity, quality: outputQuality })
          }
        } else if (slot.recipeId && !slot.ready && recipe) {
          preview.refundEntries.push(...getSlotInputRefundEntries(slot, recipe))
        }

        if (machineDef) {
          preview.refundEntries.push(...machineDef.craftCost.map(mat => ({ itemId: mat.itemId, quantity: mat.quantity })))
          preview.moneyRefund += machineDef.craftMoney
        }
      }
    } finally {
      warehouseStore.deserialize(warehouseSnapshot)
    }

    preview.canRemove = preview.total > 0 && canRefundItems(preview.refundEntries)
    return preview
  }

  const removeMachinesBySlotIndices = (slotIndices: number[]): ProcessingMachineRemovalResult => {
    const indices = normalizeMachineRemovalIndices(slotIndices)
    const preview = previewMachineRemovalBySlotIndices(indices)
    if (!preview.canRemove) return { ...preview, removed: 0 }

    const inventorySnapshot = inventoryStore.serialize()
    const warehouseStore = useWarehouseStore()
    const warehouseSnapshot = warehouseStore.serialize()
    const machineSnapshot = machines.value.map(cloneProcessingSlot)

    try {
      for (const entry of preview.voidOutputEntries) {
        if (!warehouseStore.addItemToChest(entry.chestId, entry.itemId, entry.quantity, entry.quality)) {
          throw new Error('void output chest is full')
        }
      }
      if (!refundItemsExact(preview.refundEntries)) throw new Error('inventory refund failed')

      for (const slotIndex of [...indices].sort((a, b) => b - a)) {
        machines.value.splice(slotIndex, 1)
      }
      if (preview.moneyRefund > 0) playerStore.earnMoney(preview.moneyRefund)

      return { ...preview, removed: preview.total }
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      machines.value = machineSnapshot
      return { ...preview, canRemove: false, removed: 0 }
    }
  }

  const previewRemoveMachinesByType = (machineType: MachineType): ProcessingMachineRemovalPreview => {
    return previewMachineRemovalBySlotIndices(getMachineIndicesByType(machineType))
  }

  const removeMachinesByType = (machineType: MachineType): ProcessingMachineRemovalResult => {
    return removeMachinesBySlotIndices(getMachineIndicesByType(machineType))
  }

  /** 拆除机器（退回加工原料 + 已完成产物 + 机器制作材料） */
  const removeMachine = (slotIndex: number): boolean => {
    return removeMachinesBySlotIndices([slotIndex]).removed === 1
  }

  /** 取消加工（退回原料，机器回到空闲状态） */
  const cancelProcessing = (slotIndex: number): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.recipeId || slot.ready) return false
    const recipe = getProcessingRecipeById(slot.recipeId)
    const refundEntries: { itemId: string; quantity: number; quality?: Quality }[] = []
    // 如果正在加工且有原料投入，退回原料
    if (!slot.ready && slot.inputItemId && recipe) {
      refundEntries.push(...getSlotInputRefundEntries(slot, recipe))
    }
    if (!canRefundItems(refundEntries)) return false
    refundItemsExact(refundEntries)
    // 重置为空闲
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.consumedInputs = undefined
    slot.alchemyResult = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false
    return true
  }

  const cancelProcessingByType = (machineType: MachineType): number => {
    let canceled = 0
    for (const slotIndex of getProcessingMachineIndicesByType(machineType)) {
      if (cancelProcessing(slotIndex)) canceled++
    }
    return canceled
  }

  /** 获取某台机器可用的加工配方列表 */
  const getAvailableRecipes = (machineType: MachineType) => {
    return getRecipesForMachine(machineType).filter(canAccessProcessingRecipe)
  }

  // === 每日更新 ===

  const dailyUpdate = () => {
    const collected: ProcessingCollectedOutputEntry[] = []
    const readyNames: string[] = []
    const warehouseStore = useWarehouseStore()
    const resetSlotToIdle = (slot: ProcessingSlot) => {
      slot.recipeId = null
      slot.inputItemId = null
      slot.inputQuality = undefined
      slot.consumedInputs = undefined
      slot.alchemyResult = undefined
      slot.daysProcessed = 0
      slot.totalDays = 0
      slot.ready = false
    }

    const buildVoidRestartPlan = (voidInputId: string, recipeId: string) => {
      const recipe = getProcessingRecipeById(recipeId)
      if (!recipe || !recipe.inputItemId) return null

      const nextQuality = recipe.minInputQuality
        ? getQualitiesAtLeast(recipe.minInputQuality).find(quality => warehouseStore.getChestItemCount(voidInputId, recipe.inputItemId!, quality) >= recipe.inputQuantity) ?? null
        : warehouseStore.findChestConsumableQuality(voidInputId, recipe.inputItemId, recipe.inputQuantity)
      if (!nextQuality) return null

      const entries: { itemId: string; quantity: number; quality?: Quality }[] = [
        { itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality: nextQuality }
      ]

      if (recipe.extraInputs?.length) {
        for (const extra of recipe.extraInputs) {
          entries.push({ itemId: extra.itemId, quantity: extra.quantity })
        }
      }

      if (!warehouseStore.canConsumeChestItems(voidInputId, entries)) return null
      return { nextQuality, entries }
    }

    for (const slot of machines.value) {
      if (!slot.recipeId || slot.ready) continue
      slot.daysProcessed++
      if (slot.daysProcessed >= slot.totalDays) {
        const recipe = getProcessingRecipeById(slot.recipeId)
        if (recipe) {
          const canStoreOutput = (itemId: string, quantity: number, quality: Quality) => storeProcessingOutput(itemId, quantity, quality)

          // 仙缘能力：梦织（gui_nv_2）织布机8%概率额外产出梦丝
          if (slot.machineType === 'loom' && useHiddenNpcStore().isAbilityActive('gui_nv_2') && Math.random() < 0.08) {
            if (canStoreOutput('dream_silk', 1, 'normal')) {
              collected.push({ itemId: 'dream_silk', quantity: 1, quality: 'normal' })
            }
          }
          const machineDef = PROCESSING_MACHINES.find(m => m.id === slot.machineType)
          if (recipe.inputItemId === null || machineDef?.autoCollect) {
            // 自动收取：无需原料的机器（蜂箱/蚯蚓箱）或标记了 autoCollect 的机器（熔炉）
            const outputQuality = applyNpcQualityUpgrade(slot.machineType, slot.inputQuality ?? 'normal')
            prepareAlchemyResult(slot, recipe)
            const output = getSlotOutput(slot, recipe)
            if (!output) {
              slot.ready = true
              readyNames.push(getSlotCompletionName(slot, recipe))
              continue
            }
            if (!canStoreOutput(output.itemId, output.quantity, outputQuality)) {
              slot.ready = true
              readyNames.push(getSlotCompletionName(slot, recipe))
              continue
            }
            collected.push(getSlotOutputEntry(slot, recipe, outputQuality))
            // 无需原料的机器自动重启，有原料的机器回到空闲
            const doubleOutput = tryWorkshopDoubleOutput(slot, recipe, outputQuality)
            if (doubleOutput) collected.push(doubleOutput)
            tryPotentialRawMaterialReturn(slot, recipe)
            if (discoverProcessingRecipe(recipe.id)) {
              addLog(`自动收取时发现隐藏加工配方：${recipe.name}！`, {
                category: 'processing',
                meta: { recipeId: recipe.id, machineType: recipe.machineType, inputItemId: recipe.inputItemId ?? '' }
              })
            }
            if (recipe.inputItemId === null) {
              slot.daysProcessed = 0
              slot.inputQuality = undefined
              slot.consumedInputs = undefined
              slot.alchemyResult = undefined
              slot.ready = false
            } else {
              slot.recipeId = null
              slot.inputItemId = null
              slot.inputQuality = undefined
              slot.consumedInputs = undefined
              slot.alchemyResult = undefined
              slot.daysProcessed = 0
              slot.totalDays = 0
              slot.ready = false
            }
          } else {
            // 需要原料的机器：检查虚空原料箱是否可自动续产
            const voidInput = warehouseStore.getVoidInputChest()
            if (voidInput && recipe.inputItemId) {
              // 自动收取当前产物
              const outputQuality = applyNpcQualityUpgrade(slot.machineType, slot.inputQuality ?? 'normal')
              prepareAlchemyResult(slot, recipe)
              const output = getSlotOutput(slot, recipe)
              if (!output) {
                slot.ready = true
                readyNames.push(getSlotCompletionName(slot, recipe))
                continue
              }
              if (!canStoreOutput(output.itemId, output.quantity, outputQuality)) {
                slot.ready = true
                readyNames.push(getSlotCompletionName(slot, recipe))
                continue
              }
              collected.push(getSlotOutputEntry(slot, recipe, outputQuality))

              // 种子制造机额外触发育种种子生成
              const doubleOutput = tryWorkshopDoubleOutput(slot, recipe, outputQuality)
              if (doubleOutput) collected.push(doubleOutput)
              tryPotentialRawMaterialReturn(slot, recipe)
              if (discoverProcessingRecipe(recipe.id)) {
                addLog(`自动收取时发现隐藏加工配方：${recipe.name}！`, {
                  category: 'processing',
                  meta: { recipeId: recipe.id, machineType: recipe.machineType, inputItemId: recipe.inputItemId ?? '' }
                })
              }
              if (slot.machineType === 'seed_maker' && slot.inputItemId) {
                const breedingStore = useBreedingStore()
                const farmingLevel = skillStore.farmingLevel
                if (breedingStore.trySeedMakerGeneticSeed(slot.inputItemId, farmingLevel)) {
                  addLog('种子制造机额外产出了一颗育种种子！', {
                    category: 'processing',
                    tags: ['processing_seed_bonus'],
                    meta: { machineType: 'seed_maker', inputItemId: slot.inputItemId ?? '' }
                  })
                }
              }

              if (recipe.alchemy) {
                resetSlotToIdle(slot)
                continue
              }

              // 尝试从虚空原料箱取材料开始下一轮
              const restartPlan = buildVoidRestartPlan(voidInput.id, slot.recipeId)
              if (restartPlan && warehouseStore.consumeChestItemsExact(voidInput.id, restartPlan.entries)) {
                slot.daysProcessed = 0
                slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)
                slot.inputQuality = restartPlan.nextQuality
                slot.consumedInputs = undefined
                slot.ready = false
              } else {
                // 虚空箱无足够原料，回到空闲
                resetSlotToIdle(slot)
              }
            } else {
              // 无虚空原料箱，保持原行为：标记为完成等待手动收取
              prepareAlchemyResult(slot, recipe)
              slot.ready = true
              readyNames.push(getSlotCompletionName(slot, recipe))
            }
          }
        } else {
          slot.ready = true
        }
      }
    }
    if (collected.length > 0) {
      const summary = formatCollectedOutputSummary(collected)
      addLog(`工坊自动收取了：${summary}。`)
    }
    if (readyNames.length > 0) {
      const counts = new Map<string, number>()
      for (const name of readyNames) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const summary = Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name}x${count}` : name))
        .join('、')
      addLog(`加工完成：${summary}，去工坊收取吧。`)
    }
  }

  // === 工坊升级 ===

  /** 升级工坊（扩展机器上限） */
  const upgradeWorkshop = (): { success: boolean; message: string } => {
    const next = workshopLevel.value + 1
    const upgrade = WORKSHOP_UPGRADES.find(u => u.level === next)
    if (!upgrade) return { success: false, message: '工坊已达到最高等级。' }
    if (!consumeCraftMaterials(upgrade.materials, upgrade.cost)) return { success: false, message: '材料或铜钱不足。' }
    workshopLevel.value = next
    const milestones = WORKSHOP_MILESTONES.filter(m => m.level === next)
    const milestoneText = milestones.length > 0
      ? `解锁里程碑：${milestones.map(m => `${m.name}（${m.description}）`).join('、')}。`
      : ''
    return { success: true, message: `工坊扩建完成！机器上限提升至${maxMachines.value}台。${milestoneText}` }
  }

  /** 获取下一级升级信息 */
  const getNextUpgrade = () => {
    const next = workshopLevel.value + 1
    return WORKSHOP_UPGRADES.find(u => u.level === next) ?? null
  }

  // === 序列化 ===

  const serialize = () => {
    return {
      machines: machines.value,
      workshopLevel: workshopLevel.value,
      discoveredProcessingRecipeIds: discoveredProcessingRecipeIds.value,
      alchemyDailyLimitState: alchemyDailyLimitState.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    machines.value = Array.isArray(data?.machines) ? data.machines.map(sanitizeProcessingSlot).filter((slot): slot is ProcessingSlot => !!slot) : []
    workshopLevel.value = (data as any).workshopLevel ?? 0
    discoveredProcessingRecipeIds.value = normalizeDiscoveredProcessingRecipeIds((data as any)?.discoveredProcessingRecipeIds)
    const rawAlchemyState = (data as any)?.alchemyDailyLimitState
    if (rawAlchemyState && typeof rawAlchemyState === 'object') {
      alchemyDailyLimitState.value = {
        dayTag: typeof rawAlchemyState.dayTag === 'string' ? rawAlchemyState.dayTag : '',
        mainStarted: Math.max(0, Number(rawAlchemyState.mainStarted) || 0),
        supportStarted: Math.max(0, Number(rawAlchemyState.supportStarted) || 0)
      }
      refreshAlchemyDailyLimitState()
    } else {
      refreshAlchemyDailyLimitState()
    }
  }
  return {
    machines,
    discoveredProcessingRecipeIds,
    machineCount,
    maxMachines,
    workshopLevel,
    workshopSpeedBonus,
    workshopDoubleOutputChance,
    activeMilestones,
    nextMilestone,
    canCraft,
    consumeCraftMaterials,
    craftMachine,
    craftSprinkler,
    craftFertilizer,
    craftBait,
    craftTackle,
    craftTapper,
    craftCrabPot,
    craftBomb,
    getBatchProcessLimit,
    getAlchemyDailyLimitStatus,
    getAlchemyDailyLimitSignature,
    getAlchemyMaterialPlan,
    getAlchemyRequirementAvailableCount,
    getAlchemySubstitutionText,
    isHiddenProcessingRecipeDiscovered,
    discoverProcessingRecipe,
    getProcessingRecipeDisplayName,
    isMachineCraftUnlocked,
    getMachineCraftLockedReason,
    startProcessing,
    startRepairBench,
    startProcessingBatch,
    collectProduct,
    collectProductsByType,
    cancelProcessing,
    cancelProcessingByType,
    previewRemoveMachinesByType,
    removeMachinesByType,
    removeMachine,
    getAvailableRecipes,
    dailyUpdate,
    upgradeWorkshop,
    getNextUpgrade,
    WORKSHOP_UPGRADES,
    serialize,
    deserialize,
    getEffectiveProcessingDays
  }
})
