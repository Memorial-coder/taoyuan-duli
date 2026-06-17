import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { RecipeDef, Quality, ProcessingRecipeDef } from '@/types'
import { getItemById, getRecipeById } from '@/data'
import { getAlchemyRecipeByOutputItemId } from '@/data/processing'
import { getRecipeCategoryLabels, getRecipeStoryTriggerLabels } from '@/data/recipes'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useAchievementStore } from './useAchievementStore'
import { useWalletStore } from './useWalletStore'
import { useHomeStore } from './useHomeStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { getCombinedItemCount, removeCombinedItem, getLowestCombinedQuality } from '@/composables/useCombinedInventory'
import {
  formatCropUseSubstitutionSummary,
  getCropUseRequirementAvailableCount,
  getLowestCropUsePlanQuality,
  resolveCropUseSubstitutionPlan,
  type CropUseSubstitutionPlan
} from '@/utils/cropUseSubstitution'

const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
const QUALITY_MULTIPLIER: Record<Quality, number> = { normal: 1, fine: 1.25, excellent: 1.5, supreme: 2 }
const QUALITY_LABEL: Record<Quality, string> = { normal: '', fine: '优良', excellent: '精品', supreme: '极品' }

const VALID_BUFF_TYPES = new Set<NonNullable<RecipeDef['effect']['buff']>['type']>([
  'fishing',
  'mining',
  'giftBonus',
  'speed',
  'defense',
  'luck',
  'farming',
  'stamina',
  'all_skills'
])

const normalizeActiveBuff = (value: unknown): RecipeDef['effect']['buff'] | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<NonNullable<RecipeDef['effect']['buff']>>
  if (!raw.type || !VALID_BUFF_TYPES.has(raw.type)) return null
  const numericValue = Number(raw.value)
  if (!Number.isFinite(numericValue)) return null
  const normalized: NonNullable<RecipeDef['effect']['buff']> = {
    type: raw.type,
    value: numericValue,
    description: typeof raw.description === 'string' ? raw.description : ''
  }
  const oreBonusChance = Number(raw.oreBonusChance)
  if (Number.isFinite(oreBonusChance) && oreBonusChance > 0) {
    normalized.oreBonusChance = Math.min(1, oreBonusChance)
  }
  return normalized
}

const getBuffDescription = (buff: RecipeDef['effect']['buff'] | null | undefined) => buff?.description ?? ''
const isSkillBonusBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => /技能\+/.test(getBuffDescription(buff))
const isStaminaReductionBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('体力消耗-')
const isDefenseReductionBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('受到伤害-')
const isDefenseFlatBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('防御+')
const isInstantStaminaRestoreBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('体力全恢复')
const getTemporaryMaxStaminaBuffAmount = (buff: RecipeDef['effect']['buff'] | null | undefined) =>
  buff?.type === 'stamina' && getBuffDescription(buff).includes('体力上限+') ? Math.max(0, Math.floor(buff.value)) : 0

type ActiveAlchemyElixir = {
  itemId: string
  name: string
  description: string
  staminaRestore?: number
  miningStaminaReduction?: number
  journeyStaminaReduction?: number
  giftBonusMultiplier?: number
  actionSpeedBonus?: number
  defenseReduction?: number
  dialogueAffinityBonus?: number
  festivalRewardMultiplier?: number
  petCalmFriendshipBonus?: number
}

type AlchemyEffect = NonNullable<ProcessingRecipeDef['alchemy']>['effect']

const YUE_TU_MEDICINE_EFFECT_MULTIPLIER = 1.5

const getMoonRabbitMedicineMultiplier = () =>
  useHiddenNpcStore().isAbilityActive('yue_tu_2') ? YUE_TU_MEDICINE_EFFECT_MULTIPLIER : 1.0

const amplifyFlatInteger = (value: number | undefined, multiplier: number) =>
  value === undefined ? undefined : Math.floor(value * multiplier)

const amplifyFlatNumber = (value: number | undefined, multiplier: number) =>
  value === undefined ? undefined : value * multiplier

const amplifyBonusMultiplier = (value: number | undefined, multiplier: number) =>
  value === undefined ? undefined : 1 + (value - 1) * multiplier

const applyMoonRabbitAlchemyEffectBonus = (effect: AlchemyEffect, multiplier = getMoonRabbitMedicineMultiplier()): AlchemyEffect => {
  if (multiplier === 1) return effect
  return {
    ...effect,
    staminaRestore: amplifyFlatInteger(effect.staminaRestore, multiplier),
    miningStaminaReduction: amplifyFlatNumber(effect.miningStaminaReduction, multiplier),
    journeyStaminaReduction: amplifyFlatNumber(effect.journeyStaminaReduction, multiplier),
    giftBonusMultiplier: amplifyBonusMultiplier(effect.giftBonusMultiplier, multiplier),
    actionSpeedBonus: amplifyFlatNumber(effect.actionSpeedBonus, multiplier),
    defenseReduction: amplifyFlatNumber(effect.defenseReduction, multiplier),
    dialogueAffinityBonus: amplifyFlatInteger(effect.dialogueAffinityBonus, multiplier),
    festivalRewardMultiplier: amplifyBonusMultiplier(effect.festivalRewardMultiplier, multiplier),
    petCalmFriendshipBonus: amplifyFlatInteger(effect.petCalmFriendshipBonus, multiplier)
  }
}

export type CookingStoryTriggerRecord = {
  id: string
  recipeId: string
  recipeName: string
  quantity: number
  categoryLabels: string[]
  triggerLabels: string[]
  createdAt: number
}

const STORY_TRIGGER_RECORD_LIMIT = 8

const normalizeReduction = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(0.45, numericValue))
}

const normalizeMultiplier = (value: unknown, fallback = 1) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.max(0.1, Math.min(3, numericValue))
}

const normalizeDialogueAffinityBonus = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(20, Math.floor(numericValue)))
}

const normalizePetCalmFriendshipBonus = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(20, Math.floor(numericValue)))
}

const normalizeActiveElixir = (value: unknown): ActiveAlchemyElixir | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<ActiveAlchemyElixir>
  if (typeof raw.itemId !== 'string' || typeof raw.name !== 'string' || typeof raw.description !== 'string') return null
  return {
    itemId: raw.itemId,
    name: raw.name,
    description: raw.description,
    staminaRestore: raw.staminaRestore === undefined ? undefined : Math.max(0, Math.floor(Number(raw.staminaRestore) || 0)),
    miningStaminaReduction: raw.miningStaminaReduction === undefined ? undefined : normalizeReduction(raw.miningStaminaReduction),
    journeyStaminaReduction: raw.journeyStaminaReduction === undefined ? undefined : normalizeReduction(raw.journeyStaminaReduction),
    giftBonusMultiplier: raw.giftBonusMultiplier === undefined ? undefined : normalizeMultiplier(raw.giftBonusMultiplier),
    actionSpeedBonus: raw.actionSpeedBonus === undefined ? undefined : normalizeReduction(raw.actionSpeedBonus),
    defenseReduction: raw.defenseReduction === undefined ? undefined : normalizeReduction(raw.defenseReduction),
    dialogueAffinityBonus: raw.dialogueAffinityBonus === undefined ? undefined : normalizeDialogueAffinityBonus(raw.dialogueAffinityBonus),
    festivalRewardMultiplier: raw.festivalRewardMultiplier === undefined ? undefined : normalizeMultiplier(raw.festivalRewardMultiplier),
    petCalmFriendshipBonus: raw.petCalmFriendshipBonus === undefined ? undefined : normalizePetCalmFriendshipBonus(raw.petCalmFriendshipBonus)
  }
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
}

const normalizeStoryTriggerRecords = (value: unknown): CookingStoryTriggerRecord[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((raw): CookingStoryTriggerRecord | null => {
      if (!raw || typeof raw !== 'object') return null
      const record = raw as Partial<CookingStoryTriggerRecord>
      if (typeof record.recipeId !== 'string' || typeof record.recipeName !== 'string') return null
      const triggerLabels = normalizeStringArray(record.triggerLabels)
      if (triggerLabels.length === 0) return null
      return {
        id: typeof record.id === 'string' ? record.id : `${record.recipeId}-${Number(record.createdAt) || Date.now()}`,
        recipeId: record.recipeId,
        recipeName: record.recipeName,
        quantity: Math.max(1, Math.floor(Number(record.quantity) || 1)),
        categoryLabels: normalizeStringArray(record.categoryLabels),
        triggerLabels,
        createdAt: Number.isFinite(Number(record.createdAt)) ? Number(record.createdAt) : Date.now()
      }
    })
    .filter((record): record is CookingStoryTriggerRecord => record !== null)
    .slice(0, STORY_TRIGGER_RECORD_LIMIT)
}

export const useCookingStore = defineStore('cooking', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()

  /** 已解锁的食谱ID列表 */
  const unlockedRecipes = ref<string[]>([
    'stir_fried_cabbage',
    'honey_tea',
    'ginger_soup',
    'bamboo_shoot_stir_fry',
    'dried_persimmon',
    'sesame_paste',
    'corn_pancake',
    'scrambled_egg_rice',
    'stir_fried_potato',
    'boiled_egg',
    'congee',
    'roasted_sweet_potato',
    'vegetable_soup',
    'chive_egg_stir_fry',
    'peanut_candy',
    'silkie_egg_soup',
    'yam_family_porridge',
    'garlic_radish_side_dish',
    'bitter_gourd_cooling_soup'
  ])

  /** 当天生效的食物增益 */
  const activeBuff = ref<RecipeDef['effect']['buff'] | null>(null)
  const activeElixir = ref<ActiveAlchemyElixir | null>(null)
  const storyTriggerRecords = ref<CookingStoryTriggerRecord[]>([])

  const syncTemporaryMaxStaminaBuff = (buff: RecipeDef['effect']['buff'] | null | undefined = activeBuff.value) => {
    playerStore.setTemporaryFoodMaxStaminaBonus(getTemporaryMaxStaminaBuffAmount(buff))
  }

  const getActiveFarmingSkillBonus = () => (activeBuff.value?.type === 'farming' && isSkillBonusBuff(activeBuff.value) ? activeBuff.value.value : 0)
  const getActiveFishingSkillBonus = () => (activeBuff.value?.type === 'fishing' && isSkillBonusBuff(activeBuff.value) ? activeBuff.value.value : 0)
  const getActiveMiningSkillBonus = () => (activeBuff.value?.type === 'mining' && isSkillBonusBuff(activeBuff.value) ? activeBuff.value.value : 0)
  const getActiveFarmingStaminaReduction = () =>
    activeBuff.value?.type === 'farming'
      ? isStaminaReductionBuff(activeBuff.value)
        ? activeBuff.value.value / 100
        : isSkillBonusBuff(activeBuff.value)
          ? activeBuff.value.value * 0.01
          : 0
      : 0
  const getActiveMiningStaminaReduction = () =>
    activeBuff.value?.type === 'mining'
      ? isStaminaReductionBuff(activeBuff.value)
        ? activeBuff.value.value / 100
        : isSkillBonusBuff(activeBuff.value)
          ? activeBuff.value.value * 0.01
          : 0
      : 0
  const getActiveAlchemyMiningStaminaReduction = () => activeElixir.value?.miningStaminaReduction ?? 0
  const getActiveAlchemyJourneyStaminaReduction = () => activeElixir.value?.journeyStaminaReduction ?? 0
  const getActiveAlchemyGiftBonusMultiplier = () => activeElixir.value?.giftBonusMultiplier ?? 1
  const getActiveAlchemyActionSpeedBonus = () => activeElixir.value?.actionSpeedBonus ?? 0
  const getActiveAlchemyDefenseReduction = () => activeElixir.value?.defenseReduction ?? 0
  const getActiveAlchemyDialogueAffinityBonus = () => activeElixir.value?.dialogueAffinityBonus ?? 0
  const getActiveAlchemyFestivalRewardMultiplier = () => activeElixir.value?.festivalRewardMultiplier ?? 1
  const getActiveAlchemyPetCalmFriendshipBonus = () => activeElixir.value?.petCalmFriendshipBonus ?? 0
  const getActiveDefenseReduction = () => (activeBuff.value?.type === 'defense' && isDefenseReductionBuff(activeBuff.value) ? activeBuff.value.value / 100 : 0)
  const getActiveDefenseFlatBonus = () => (activeBuff.value?.type === 'defense' && isDefenseFlatBuff(activeBuff.value) ? activeBuff.value.value : 0)
  const getActiveMiningOreBonusChance = () => Math.max(0, Math.min(1, activeBuff.value?.oreBonusChance ?? 0))
  const recentStoryTriggerRecords = computed(() => storyTriggerRecords.value.slice(0, STORY_TRIGGER_RECORD_LIMIT))

  const consumeStoryTriggerRecord = (preferredLabels: string[] = []): CookingStoryTriggerRecord | null => {
    const preferredIndex = preferredLabels.length > 0
      ? storyTriggerRecords.value.findIndex(record => record.triggerLabels.some(label => preferredLabels.includes(label)))
      : -1
    const targetIndex = preferredIndex >= 0 ? preferredIndex : storyTriggerRecords.value.length > 0 ? 0 : -1
    if (targetIndex < 0) return null
    const [record] = storyTriggerRecords.value.splice(targetIndex, 1)
    return record ?? null
  }

  /** 已解锁的食谱定义 */
  const recipes = computed(() => unlockedRecipes.value.map(id => getRecipeById(id)).filter((r): r is RecipeDef => r !== undefined))

  const getItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId

  const buildCookingRequirements = (recipe: RecipeDef, quantity: number = 1) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity))
    return recipe.ingredients.map(ing => ({
      itemId: ing.itemId,
      quantity: ing.quantity * normalizedQuantity,
      tags: ['food' as const]
    }))
  }

  const resolveCookingUsePlan = (recipe: RecipeDef, quantity: number = 1): CropUseSubstitutionPlan => {
    return resolveCropUseSubstitutionPlan(buildCookingRequirements(recipe, quantity), getCombinedItemCount)
  }

  const getCookingUsePlan = (recipeId: string, quantity: number = 1): CropUseSubstitutionPlan => {
    const recipe = getRecipeById(recipeId)
    return recipe
      ? resolveCookingUsePlan(recipe, quantity)
      : { fulfilled: false, entries: [], missing: [] }
  }

  const getCookingIngredientAvailableCount = (itemId: string): number => {
    return getCropUseRequirementAvailableCount({ itemId, quantity: 1, tags: ['food'] }, getCombinedItemCount)
  }

  const getCookingSubstitutionText = (recipeId: string, quantity: number = 1): string => {
    return formatCropUseSubstitutionSummary(getCookingUsePlan(recipeId, quantity), getItemName)
  }

  /** 检查是否有足够材料 */
  const canCook = (recipeId: string): boolean => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false
    if (!unlockedRecipes.value.includes(recipeId)) return false
    // 检查技能等级门槛
    if (recipe.requiredSkill) {
      const skill = skillStore.getSkill(recipe.requiredSkill.type)
      if (skill.level < recipe.requiredSkill.level) return false
    }
    return resolveCookingUsePlan(recipe).fulfilled
  }

  /** 计算最多能烹饪几份 */
  const maxCookable = (recipeId: string): number => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return 0
    if (!unlockedRecipes.value.includes(recipeId)) return 0
    if (recipe.requiredSkill) {
      const skill = skillStore.getSkill(recipe.requiredSkill.type)
      if (skill.level < recipe.requiredSkill.level) return 0
    }
    let upper = Infinity
    for (const ing of recipe.ingredients) {
      const available = getCookingIngredientAvailableCount(ing.itemId)
      upper = Math.min(upper, Math.floor(available / ing.quantity))
    }
    if (upper === Infinity || upper <= 0) return 0

    let low = 0
    let high = upper
    while (low < high) {
      const mid = Math.ceil((low + high + 1) / 2)
      if (resolveCookingUsePlan(recipe, mid).fulfilled) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    return low
  }

  /** 预览烹饪品质（取所有材料最低品质） */
  const previewCookQuality = (recipeId: string): Quality => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return 'normal'
    const plan = resolveCookingUsePlan(recipe)
    if (plan.entries.length > 0) return getLowestCropUsePlanQuality(plan)
    let minIdx = 3
    for (const ing of recipe.ingredients) {
      const q = getLowestCombinedQuality(ing.itemId)
      const idx = QUALITY_ORDER.indexOf(q)
      if (idx < minIdx) minIdx = idx
    }
    return QUALITY_ORDER[minIdx]!
  }

  /** 烹饪 */
  const cook = (recipeId: string, quantity: number = 1): { success: boolean; message: string } => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return { success: false, message: '食谱不存在。' }
    if (!unlockedRecipes.value.includes(recipeId)) return { success: false, message: '尚未解锁此食谱。' }
    if (!Number.isInteger(quantity) || quantity <= 0) return { success: false, message: '请输入有效的烹饪份数。' }
    if (recipe.requiredSkill) {
      const skill = skillStore.getSkill(recipe.requiredSkill.type)
      if (skill.level < recipe.requiredSkill.level) {
        return { success: false, message: '当前技能等级不足，无法烹饪此食谱。' }
      }
    }

    // 计算最多能做几份
    const maxPossible = Math.min(Math.floor(quantity), maxCookable(recipeId))
    if (maxPossible <= 0) return { success: false, message: '材料不足。' }

    const cookingPlan = resolveCookingUsePlan(recipe, maxPossible)
    if (!cookingPlan.fulfilled) return { success: false, message: '材料不足。' }

    // 计算品质（取所有材料中最低品质）
    const resultQuality = getLowestCropUsePlanQuality(cookingPlan)
    if (!inventoryStore.canAddItem(`food_${recipe.id}`, maxPossible, resultQuality)) {
      return { success: false, message: '背包空间不足，无法放入烹饪成品。' }
    }

    // 批量消耗材料
    for (const entry of cookingPlan.entries) {
      if (!removeCombinedItem(entry.itemId, entry.quantity, entry.quality)) return { success: false, message: '材料不足。' }
    }

    // 添加食物到背包
    inventoryStore.addItem(`food_${recipe.id}`, maxPossible, resultQuality)
    for (let i = 0; i < maxPossible; i++) {
      useAchievementStore().recordRecipeCooked(recipe.id)
    }
    const storyTriggerLabels = getRecipeStoryTriggerLabels(recipe)
    if (storyTriggerLabels.length > 0) {
      storyTriggerRecords.value = [
        {
          id: `${Date.now()}-${recipe.id}-${storyTriggerRecords.value.length}`,
          recipeId: recipe.id,
          recipeName: recipe.name,
          quantity: maxPossible,
          categoryLabels: getRecipeCategoryLabels(recipe),
          triggerLabels: storyTriggerLabels,
          createdAt: Date.now()
        },
        ...storyTriggerRecords.value
      ].slice(0, STORY_TRIGGER_RECORD_LIMIT)
    }
    const qualityTag = QUALITY_LABEL[resultQuality] ? `【${QUALITY_LABEL[resultQuality]}】` : ''
    const qtyTag = maxPossible > 1 ? `${maxPossible}份` : ''
    const substitutionHint = formatCropUseSubstitutionSummary(cookingPlan, getItemName)
    const storyHint = storyTriggerLabels.length > 0 ? ` 可作为：${storyTriggerLabels.join('、')}。` : ''
    return { success: true, message: `烹饪了${qtyTag}${qualityTag}${recipe.name}！${substitutionHint ? ` ${substitutionHint}。` : ''}${storyHint}` }
  }

  /** 食用烹饪品 */
  const eat = (recipeId: string, quality: Quality = 'normal'): { success: boolean; message: string } => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return { success: false, message: '食谱数据丢失。' }

    const foodItemId = `food_${recipeId}`
    if (!inventoryStore.removeUnlockedItem(foodItemId, 1, quality)) {
      return { success: false, message: '背包中没有这个食物。' }
    }

    // 品质加成
    const qualityBonus = QUALITY_MULTIPLIER[quality]
    // 炼金师专精：食物恢复+50%
    const walletStore = useWalletStore()
    const homeStore = useHomeStore()
    const chefBonus = 1 + walletStore.getCookingRestoreBonus()
    const _foragingSkill = skillStore.getSkill('foraging')
    const alchemistBonus = _foragingSkill.perk20 === 'philosopher' ? 3.0 : _foragingSkill.perk15 === 'grand_alchemist' ? 2.25 : _foragingSkill.perk10 === 'alchemist' ? 1.5 : 1.0
    const kitchenBonus = homeStore.getKitchenBonus()
    // 仙缘能力：药引（yue_tu_2）料理恢复+50%
    const moonRabbitBonus = getMoonRabbitMedicineMultiplier()
    const staminaRestore = Math.floor(
      recipe.effect.staminaRestore * qualityBonus * alchemistBonus * chefBonus * kitchenBonus * moonRabbitBonus
    )
    playerStore.restoreStamina(staminaRestore)
    const qualityTag = QUALITY_LABEL[quality] ? `【${QUALITY_LABEL[quality]}】` : ''
    let msg = `食用了${qualityTag}${recipe.name}，恢复${staminaRestore}体力`

    if (recipe.effect.healthRestore) {
      const healthRestore = Math.floor(
        recipe.effect.healthRestore * qualityBonus * alchemistBonus * chefBonus * kitchenBonus * moonRabbitBonus
      )
      playerStore.restoreHealth(healthRestore)
      msg += `、${healthRestore}生命值`
    }
    msg += '。'

    if (recipe.effect.buff?.type === 'stamina') {
      const normalizedBuff = { ...recipe.effect.buff }
      msg += ` ${recipe.effect.buff.description}`
      syncTemporaryMaxStaminaBuff(null)
      if (isInstantStaminaRestoreBuff(normalizedBuff)) {
        playerStore.restoreStamina(playerStore.maxStamina)
        activeBuff.value = null
      } else {
        activeBuff.value = normalizedBuff
        syncTemporaryMaxStaminaBuff(activeBuff.value)
      }
      return { success: true, message: msg }
    }

    if (recipe.effect.buff) {
      activeBuff.value = null
      syncTemporaryMaxStaminaBuff(null)
      activeBuff.value = { ...recipe.effect.buff }
      msg += ` ${recipe.effect.buff.description}`
      // 「体力全恢复」类buff：立即将体力回满
    }

    return { success: true, message: msg }
  }

  const useElixir = (itemId: string, quality: Quality = 'normal'): { success: boolean; message: string } => {
    const recipe = getAlchemyRecipeByOutputItemId(itemId)
    const itemName = recipe?.outputItemId ? recipe.name : itemId
    if (!recipe?.alchemy) return { success: false, message: '这枚丹药暂时没有可用效果。' }
    if (activeElixir.value) {
      return { success: false, message: `今日已服用${activeElixir.value.name}，丹药效果不可叠加。` }
    }
    if (!inventoryStore.removeUnlockedItem(itemId, 1, quality)) {
      return { success: false, message: '背包中没有这枚丹药。' }
    }

    const medicineMultiplier = getMoonRabbitMedicineMultiplier()
    const effect = applyMoonRabbitAlchemyEffectBonus(recipe.alchemy.effect, medicineMultiplier)
    const effectDescription = medicineMultiplier > 1
      ? `${effect.description}（药引加成已生效）`
      : effect.description
    const active: ActiveAlchemyElixir = {
      itemId,
      name: recipe.name,
      description: effectDescription,
      staminaRestore: effect.staminaRestore,
      miningStaminaReduction: effect.miningStaminaReduction,
      journeyStaminaReduction: effect.journeyStaminaReduction,
      giftBonusMultiplier: effect.giftBonusMultiplier,
      actionSpeedBonus: effect.actionSpeedBonus,
      defenseReduction: effect.defenseReduction,
      dialogueAffinityBonus: effect.dialogueAffinityBonus,
      festivalRewardMultiplier: effect.festivalRewardMultiplier,
      petCalmFriendshipBonus: effect.petCalmFriendshipBonus
    }
    activeElixir.value = normalizeActiveElixir(active)
    if (activeElixir.value?.staminaRestore) {
      playerStore.restoreStamina(activeElixir.value.staminaRestore)
    }
    return { success: true, message: `服用了${itemName}：${effectDescription}。今日不能再叠加其他丹药。` }
  }

  /** 解锁食谱 */
  const unlockRecipe = (recipeId: string): boolean => {
    if (unlockedRecipes.value.includes(recipeId)) return false
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false
    unlockedRecipes.value.push(recipeId)
    return true
  }

  /** 每日重置增益（哲学家专精：buff永不过期） */
  const dailyReset = () => {
    const foragingSkill = skillStore.getSkill('foraging')
    if (foragingSkill.perk20 !== 'philosopher') {
      syncTemporaryMaxStaminaBuff(null)
      activeBuff.value = null
    }
    activeElixir.value = null
  }

  const serialize = () => {
    return {
      unlockedRecipes: unlockedRecipes.value,
      activeBuff: activeBuff.value,
      activeElixir: activeElixir.value,
      storyTriggerRecords: storyTriggerRecords.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    unlockedRecipes.value = Array.isArray(data?.unlockedRecipes) ? data.unlockedRecipes : unlockedRecipes.value
    const nextBuff = normalizeActiveBuff(data?.activeBuff)
    activeBuff.value = nextBuff
    activeElixir.value = normalizeActiveElixir((data as any)?.activeElixir)
    storyTriggerRecords.value = normalizeStoryTriggerRecords((data as any)?.storyTriggerRecords)
    syncTemporaryMaxStaminaBuff(activeBuff.value)
  }

  return {
    unlockedRecipes,
    activeBuff,
    activeElixir,
    storyTriggerRecords,
    recentStoryTriggerRecords,
    consumeStoryTriggerRecord,
    getActiveFarmingSkillBonus,
    getActiveFishingSkillBonus,
    getActiveMiningSkillBonus,
    getActiveFarmingStaminaReduction,
    getActiveMiningStaminaReduction,
    getActiveAlchemyMiningStaminaReduction,
    getActiveAlchemyJourneyStaminaReduction,
    getActiveAlchemyGiftBonusMultiplier,
    getActiveAlchemyActionSpeedBonus,
    getActiveAlchemyDefenseReduction,
    getActiveAlchemyDialogueAffinityBonus,
    getActiveAlchemyFestivalRewardMultiplier,
    getActiveAlchemyPetCalmFriendshipBonus,
    getActiveDefenseReduction,
    getActiveDefenseFlatBonus,
    getActiveMiningOreBonusChance,
    recipes,
    canCook,
    maxCookable,
    previewCookQuality,
    getCookingUsePlan,
    getCookingIngredientAvailableCount,
    getCookingSubstitutionText,
    cook,
    eat,
    useElixir,
    unlockRecipe,
    dailyReset,
    serialize,
    deserialize
  }
})
