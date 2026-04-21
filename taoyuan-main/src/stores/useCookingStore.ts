import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { RecipeDef, Quality } from '@/types'
import { getRecipeById } from '@/data'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useAchievementStore } from './useAchievementStore'
import { useWalletStore } from './useWalletStore'
import { useHomeStore } from './useHomeStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { getCombinedItemCount, removeCombinedItem, getLowestCombinedQuality } from '@/composables/useCombinedInventory'

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
  return {
    type: raw.type,
    value: numericValue,
    description: typeof raw.description === 'string' ? raw.description : ''
  }
}

const getBuffDescription = (buff: RecipeDef['effect']['buff'] | null | undefined) => buff?.description ?? ''
const isSkillBonusBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => /技能\+/.test(getBuffDescription(buff))
const isStaminaReductionBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('体力消耗-')
const isDefenseReductionBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('受到伤害-')
const isDefenseFlatBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('防御+')
const isInstantStaminaRestoreBuff = (buff: RecipeDef['effect']['buff'] | null | undefined) => getBuffDescription(buff).includes('体力全恢复')
const getTemporaryMaxStaminaBuffAmount = (buff: RecipeDef['effect']['buff'] | null | undefined) =>
  buff?.type === 'stamina' && getBuffDescription(buff).includes('体力上限+') ? Math.max(0, Math.floor(buff.value)) : 0

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
    'silkie_egg_soup'
  ])

  /** 当天生效的食物增益 */
  const activeBuff = ref<RecipeDef['effect']['buff'] | null>(null)

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
  const getActiveDefenseReduction = () => (activeBuff.value?.type === 'defense' && isDefenseReductionBuff(activeBuff.value) ? activeBuff.value.value / 100 : 0)
  const getActiveDefenseFlatBonus = () => (activeBuff.value?.type === 'defense' && isDefenseFlatBuff(activeBuff.value) ? activeBuff.value.value : 0)

  /** 已解锁的食谱定义 */
  const recipes = computed(() => unlockedRecipes.value.map(id => getRecipeById(id)).filter((r): r is RecipeDef => r !== undefined))

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
    return recipe.ingredients.every(ing => getCombinedItemCount(ing.itemId) >= ing.quantity)
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
    let max = Infinity
    for (const ing of recipe.ingredients) {
      const available = getCombinedItemCount(ing.itemId)
      max = Math.min(max, Math.floor(available / ing.quantity))
    }
    return max === Infinity ? 0 : max
  }

  /** 预览烹饪品质（取所有材料最低品质） */
  const previewCookQuality = (recipeId: string): Quality => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return 'normal'
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
    let maxPossible = Math.floor(quantity)
    for (const ing of recipe.ingredients) {
      const available = getCombinedItemCount(ing.itemId)
      maxPossible = Math.min(maxPossible, Math.floor(available / ing.quantity))
    }
    if (maxPossible <= 0) return { success: false, message: '材料不足。' }

    // 计算品质（取所有材料中最低品质）
    let minQualityIndex = 3
    for (const ing of recipe.ingredients) {
      const quality = getLowestCombinedQuality(ing.itemId)
      const idx = QUALITY_ORDER.indexOf(quality)
      if (idx < minQualityIndex) minQualityIndex = idx
    }
    const resultQuality = QUALITY_ORDER[minQualityIndex]!
    if (!inventoryStore.canAddItem(`food_${recipe.id}`, maxPossible, resultQuality)) {
      return { success: false, message: '背包空间不足，无法放入烹饪成品。' }
    }

    // 批量消耗材料
    for (const ing of recipe.ingredients) {
      removeCombinedItem(ing.itemId, ing.quantity * maxPossible)
    }

    // 添加食物到背包
    inventoryStore.addItem(`food_${recipe.id}`, maxPossible, resultQuality)
    for (let i = 0; i < maxPossible; i++) {
      useAchievementStore().recordRecipeCooked(recipe.id)
    }
    const qualityTag = QUALITY_LABEL[resultQuality] ? `【${QUALITY_LABEL[resultQuality]}】` : ''
    const qtyTag = maxPossible > 1 ? `${maxPossible}份` : ''
    return { success: true, message: `烹饪了${qtyTag}${qualityTag}${recipe.name}！` }
  }

  /** 食用烹饪品 */
  const eat = (recipeId: string, quality: Quality = 'normal'): { success: boolean; message: string } => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return { success: false, message: '食谱数据丢失。' }

    const foodItemId = `food_${recipeId}`
    if (!inventoryStore.removeItem(foodItemId, 1, quality)) {
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
    // 仙缘能力：月膳（yue_tu_2）食物恢复+50%
    const moonRabbitBonus = useHiddenNpcStore().isAbilityActive('yue_tu_2') ? 1.5 : 1.0
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
  }

  const serialize = () => {
    return { unlockedRecipes: unlockedRecipes.value, activeBuff: activeBuff.value }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    unlockedRecipes.value = Array.isArray(data?.unlockedRecipes) ? data.unlockedRecipes : unlockedRecipes.value
    const nextBuff = normalizeActiveBuff(data?.activeBuff)
    activeBuff.value = nextBuff
    syncTemporaryMaxStaminaBuff(activeBuff.value)
  }

  return {
    unlockedRecipes,
    activeBuff,
    getActiveFarmingSkillBonus,
    getActiveFishingSkillBonus,
    getActiveMiningSkillBonus,
    getActiveFarmingStaminaReduction,
    getActiveMiningStaminaReduction,
    getActiveDefenseReduction,
    getActiveDefenseFlatBonus,
    recipes,
    canCook,
    maxCookable,
    previewCookQuality,
    cook,
    eat,
    unlockRecipe,
    dailyReset,
    serialize,
    deserialize
  }
})
