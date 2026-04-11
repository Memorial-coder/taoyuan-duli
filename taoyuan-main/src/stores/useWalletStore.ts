import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { WALLET_ARCHETYPES, WALLET_ITEMS, getWalletArchetypeById, getWalletNodeById } from '@/data/wallet'
import { FISH } from '@/data/fish'
import type { WalletArchetypeId, WalletCatalogPool, WalletEffectModule, WalletGoalBiasKey, WalletPassiveEffect, WalletShopId } from '@/types'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'
import { useMiningStore } from './useMiningStore'
import { useNpcStore } from './useNpcStore'

const SHOP_LABELS: Record<WalletShopId, string> = {
  wanwupu: '万物铺',
  tiejiangpu: '铁匠铺',
  yugupu: '渔具铺',
  yaopu: '药铺',
  chouduanzhuang: '绸缎庄',
  jiuguan: '醉桃源酒馆',
  biaoju: '镖局'
}

const GOAL_BIAS_LABELS: Record<WalletGoalBiasKey, string> = {
  cashflow: '现金流',
  farming: '农耕',
  fishing: '钓鱼',
  mining: '采矿',
  cooking: '烹饪',
  social: '社交',
  discovery: '探索见闻'
}

const POOL_LABELS = {
  basic: '基础消费池',
  weekly: '每周精选',
  seasonal: '季节限定',
  premium: '高价长期商品'
} as const

const MODULE_LABELS: Record<WalletEffectModule, string> = {
  shop: '商店',
  goal: '目标',
  farming: '农耕',
  fishing: '钓鱼',
  mining: '采矿',
  cooking: '烹饪'
}

const CATALOG_TAG_LABELS: Record<string, string> = {
  '每周精选': '每周精选',
  '高价长期商品': '高价长期商品',
  '功能商品': '功能商品',
  '材料包': '材料包',
  '灌溉': '灌溉',
  '矿洞': '矿洞',
  '渔具': '渔具',
  '鱼塘': '鱼塘',
  '季节限定': '季节限定',
  '牧场': '牧场',
  '采集': '采集'
}

const mergeNumberRecord = <T extends string>(
  left: Partial<Record<T, number>> | undefined,
  right: Partial<Record<T, number>> | undefined
): Partial<Record<T, number>> | undefined => {
  const result: Partial<Record<T, number>> = { ...(left ?? {}) }
  for (const [key, value] of Object.entries(right ?? {})) {
    const current = result[key as T] ?? 0
    const next = typeof value === 'number' ? value : Number(value ?? 0)
    result[key as T] = current + next
  }
  return Object.keys(result).length > 0 ? result : undefined
}

const mergePassiveEffects = (effects: Array<WalletPassiveEffect | undefined>): WalletPassiveEffect => {
  return effects.reduce<WalletPassiveEffect>((acc, effect) => {
    if (!effect) return acc
    return {
      shopDiscount: (acc.shopDiscount ?? 0) + (effect.shopDiscount ?? 0),
      shopDiscountByShopId: mergeNumberRecord(acc.shopDiscountByShopId, effect.shopDiscountByShopId),
      goalWeights: mergeNumberRecord(acc.goalWeights, effect.goalWeights),
      catalogTagWeights: mergeNumberRecord(acc.catalogTagWeights, effect.catalogTagWeights),
      catalogPoolWeights: mergeNumberRecord(acc.catalogPoolWeights, effect.catalogPoolWeights)
    }
  }, {} as WalletPassiveEffect)
}

const getCatalogTagLabel = (tag: string): string => CATALOG_TAG_LABELS[tag] ?? tag

const summarizePassiveEffect = (effect: WalletPassiveEffect): string[] => {
  const summaries: string[] = []

  if ((effect.shopDiscount ?? 0) > 0) {
    summaries.push(`通用购物折扣 ${Math.round((effect.shopDiscount ?? 0) * 100)}%`)
  }

  for (const [shopId, value] of Object.entries(effect.shopDiscountByShopId ?? {})) {
    if ((value ?? 0) > 0) {
      summaries.push(`${SHOP_LABELS[shopId as WalletShopId] ?? shopId}额外折扣 ${Math.round((value ?? 0) * 100)}%`)
    }
  }

  const biasEntries = Object.entries(effect.goalWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (biasEntries.length > 0) {
    summaries.push(`目标偏好：${biasEntries.map(([key]) => GOAL_BIAS_LABELS[key as WalletGoalBiasKey]).join('、')}`)
  }

  const poolEntries = Object.entries(effect.catalogPoolWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (poolEntries.length > 0) {
    summaries.push(`商店偏好：${poolEntries.map(([key]) => POOL_LABELS[key as WalletCatalogPool]).join('、')}`)
  }

  const tagEntries = Object.entries(effect.catalogTagWeights ?? {}).filter(([, value]) => (value ?? 0) > 0)
  if (tagEntries.length > 0) {
    summaries.push(`推荐标签：${tagEntries.slice(0, 4).map(([key]) => getCatalogTagLabel(key)).join('、')}`)
  }

  return summaries
}

export const useWalletStore = defineStore('wallet', () => {
  /** 已解锁的钱袋物品ID */
  const unlockedItems = ref<string[]>([])
  /** 当前选择的钱包流派 */
  const currentArchetypeId = ref<WalletArchetypeId | null>(null)
  /** 当前流派已解锁节点 */
  const unlockedNodeIds = ref<string[]>([])
  const archetypes = computed(() => WALLET_ARCHETYPES)

  /** 已解锁的钱袋物品定义 */
  const unlockedDefs = computed(() => WALLET_ITEMS.filter(w => unlockedItems.value.includes(w.id)))
  const currentArchetype = computed(() => (currentArchetypeId.value ? getWalletArchetypeById(currentArchetypeId.value) ?? null : null))
  const currentArchetypeNodes = computed(() => currentArchetype.value?.nodes ?? [])
  const unlockedArchetypeNodes = computed(() => currentArchetypeNodes.value.filter(node => unlockedNodeIds.value.includes(node.id)))
  const activePassiveEffect = computed(() => mergePassiveEffects([currentArchetype.value?.effect, ...unlockedArchetypeNodes.value.map(node => node.effect)]))
  const currentArchetypeMainEffectText = computed(() => currentArchetype.value?.mainEffectText ?? '')
  const currentArchetypeMainEffectSummary = computed(() => (currentArchetype.value ? summarizePassiveEffect(currentArchetype.value.effect) : []))
  const currentArchetypeNodeEffects = computed(() =>
    unlockedArchetypeNodes.value.map(node => ({
      id: node.id,
      name: node.name,
      moduleLabels: node.modules.map(module => MODULE_LABELS[module]),
      summaries: summarizePassiveEffect(node.effect)
    }))
  )

  const getFriendlyNpcCount = () => {
    const npcStore = useNpcStore()
    return npcStore.npcStates.filter(state => {
      const level = npcStore.getFriendshipLevel(state.npcId)
      return level === 'friendly' || level === 'bestFriend'
    }).length
  }

  const isUnlockRequirementMet = (requirement?: { type: string; value: number }) => {
    if (!requirement || requirement.type === 'none') return true

    const achievementStore = useAchievementStore()

    switch (requirement.type) {
      case 'money_earned':
        return achievementStore.stats.totalMoneyEarned >= requirement.value
      case 'discoveries':
        return achievementStore.discoveredCount >= requirement.value
      case 'mine_floor':
        return achievementStore.stats.highestMineFloor >= requirement.value
      case 'fish_caught':
        return achievementStore.stats.totalFishCaught >= requirement.value
      case 'recipes_cooked':
        return achievementStore.stats.totalRecipesCooked >= requirement.value
      case 'friendly_npcs':
        return getFriendlyNpcCount() >= requirement.value
      default:
        return false
    }
  }

  /** 检查是否已拥有某物品 */
  const has = (id: string): boolean => {
    return unlockedItems.value.includes(id)
  }

  /** 手动解锁 */
  const unlock = (id: string): boolean => {
    if (has(id)) return false
    if (!WALLET_ITEMS.find(w => w.id === id)) return false
    unlockedItems.value.push(id)
    return true
  }

  /** 检查并自动解锁满足条件的物品，返回新解锁的物品名 */
  const checkAndUnlock = (): string[] => {
    const achievementStore = useAchievementStore()
    const skillStore = useSkillStore()
    const miningStore = useMiningStore()

    const newlyUnlocked: string[] = []

    // 商人印鉴：累计赚钱10000文
    if (!has('merchant_seal') && achievementStore.stats.totalMoneyEarned >= 10000) {
      unlock('merchant_seal')
      newlyUnlocked.push('商人印章')
    }

    // 草药图鉴：采集等级8
    if (!has('herb_guide') && skillStore.getSkill('foraging').level >= 8) {
      unlock('herb_guide')
      newlyUnlocked.push('神农本草')
    }

    // 矿工护符：矿洞50层
    if (!has('miners_charm') && miningStore.safePointFloor >= 50) {
      unlock('miners_charm')
      newlyUnlocked.push('矿工护符')
    }

    // 垂钓者令牌：钓到30种鱼
    if (!has('anglers_token')) {
      const fishIdSet = new Set(FISH.map(f => f.id))
      const fishCount = achievementStore.discoveredItems.filter(id => fishIdSet.has(id)).length
      if (fishCount >= 30) {
        unlock('anglers_token')
        newlyUnlocked.push('钓翁令牌')
      }
    }

    // 厨师帽：烹饪10道不同食谱
    if (!has('chefs_hat') && achievementStore.stats.totalRecipesCooked >= 10) {
      unlock('chefs_hat')
      newlyUnlocked.push('厨师帽')
    }

    // 大地图腾：收获100次作物
    if (!has('earth_totem') && achievementStore.stats.totalCropsHarvested >= 100) {
      unlock('earth_totem')
      newlyUnlocked.push('土地图腾')
    }

    return newlyUnlocked
  }

  const canUnlockArchetype = (archetypeId: WalletArchetypeId): boolean => {
    const archetype = getWalletArchetypeById(archetypeId)
    if (!archetype) return false
    return isUnlockRequirementMet(archetype.unlockRequirement)
  }

  const getArchetypeUnlockHint = (archetypeId: WalletArchetypeId): string => {
    const archetype = getWalletArchetypeById(archetypeId)
    if (!archetype) return '流派不存在。'
    return canUnlockArchetype(archetypeId) ? '已满足选择条件。' : archetype.unlockRequirement.label
  }

  const getArchetypeDescriptionText = (archetypeId?: WalletArchetypeId | null): string => {
    const targetArchetype = archetypeId ? getWalletArchetypeById(archetypeId) ?? null : currentArchetype.value
    if (!targetArchetype) return '尚未选择流派，当前仅生效旧钱袋被动。'
    return `${targetArchetype.description} ${targetArchetype.nodeUnlockText}`
  }

  const selectArchetype = (archetypeId: WalletArchetypeId): boolean => {
    if (!canUnlockArchetype(archetypeId)) return false
    if (currentArchetypeId.value !== archetypeId) {
      currentArchetypeId.value = archetypeId
      unlockedNodeIds.value = []
    }
    return true
  }

  const resetArchetype = (): void => {
    currentArchetypeId.value = null
    unlockedNodeIds.value = []
  }

  const isNodeUnlocked = (nodeId: string): boolean => unlockedNodeIds.value.includes(nodeId)

  const canUnlockNode = (nodeId: string): boolean => {
    if (!currentArchetype.value) return false
    if (isNodeUnlocked(nodeId)) return false
    const node = getWalletNodeById(nodeId)
    if (!node) return false
    if (!currentArchetype.value.nodes.some(entry => entry.id === nodeId)) return false
    return isUnlockRequirementMet(node.unlockRequirement)
  }

  const getNodeUnlockHint = (nodeId: string): string => {
    const node = getWalletNodeById(nodeId)
    if (!node) return '节点不存在。'
    return canUnlockNode(nodeId) ? '已满足解锁条件。' : node.unlockRequirement.label
  }

  const getEffectModuleLabel = (module: WalletEffectModule): string => MODULE_LABELS[module]

  const getNodeModuleLabels = (nodeId: string): string[] => {
    const node = getWalletNodeById(nodeId)
    if (!node) return []
    return node.modules.map(module => getEffectModuleLabel(module))
  }

  const getNodeEffectSummary = (nodeId: string): string[] => {
    const node = getWalletNodeById(nodeId)
    if (!node) return []
    return summarizePassiveEffect(node.effect)
  }

  const unlockNode = (nodeId: string): boolean => {
    if (!canUnlockNode(nodeId)) return false
    unlockedNodeIds.value.push(nodeId)
    return true
  }

  const getGoalPreferenceWeights = (): Partial<Record<WalletGoalBiasKey, number>> => {
    return activePassiveEffect.value.goalWeights ?? {}
  }

  const getShopDiscount = (shopId?: string | null): number => {
    const shopKey = shopId as WalletShopId | undefined
    const legacyDiscount = has('merchant_seal') ? 0.1 : 0
    const archetypeDiscount = activePassiveEffect.value.shopDiscount ?? 0
    const shopSpecificDiscount = shopKey ? activePassiveEffect.value.shopDiscountByShopId?.[shopKey] ?? 0 : 0
    return Math.min(0.35, legacyDiscount + archetypeDiscount + shopSpecificDiscount)
  }

  const getCatalogOfferPreferenceScore = (offer: { shopId: string; pool: string; tags?: string[] }): number => {
    if (!currentArchetype.value) return 0

    let score = 0
    const effect = activePassiveEffect.value

    if (currentArchetype.value.recommendedShops?.includes(offer.shopId as WalletShopId)) {
      score += 1
    }
    score += effect.catalogPoolWeights?.[offer.pool as keyof NonNullable<typeof effect.catalogPoolWeights>] ?? 0
    for (const tag of offer.tags ?? []) {
      score += effect.catalogTagWeights?.[tag] ?? 0
    }
    return score
  }

  const getCatalogOfferPreferenceReason = (offer: { shopId: string; pool: string; tags?: string[] }): string => {
    if (!currentArchetype.value) return ''

    const reasons: string[] = []
    if (currentArchetype.value.recommendedShops?.includes(offer.shopId as WalletShopId)) {
      reasons.push(`${currentArchetype.value.name}偏好${SHOP_LABELS[offer.shopId as WalletShopId] ?? offer.shopId}`)
    }
    const preferredPoolWeight = activePassiveEffect.value.catalogPoolWeights?.[offer.pool as keyof NonNullable<typeof activePassiveEffect.value.catalogPoolWeights>] ?? 0
    if (preferredPoolWeight > 0 && offer.pool in POOL_LABELS) {
      reasons.push(`偏好${POOL_LABELS[offer.pool as keyof typeof POOL_LABELS]}`)
    }
    for (const tag of offer.tags ?? []) {
      if ((activePassiveEffect.value.catalogTagWeights?.[tag] ?? 0) > 0) {
        reasons.push(`适配「${tag}」路线`)
        break
      }
    }
    return reasons.join(' · ') || `${currentArchetype.value.name}路线推荐`
  }

  const getCurrentArchetypeSummary = (): string[] => {
    if (!currentArchetype.value) return ['尚未选择流派，当前仅生效旧钱袋被动。']
    return summarizePassiveEffect(activePassiveEffect.value)
  }

  // === 被动效果查询 ===

  /** 商店折扣 (0.1 = 10%) */
  /** 采集品质加成档数 */
  const getForageQualityBoost = (): number => {
    return has('herb_guide') ? 1 : 0
  }

  /** 挖矿体力减免 (0.15 = 15%) */
  const getMiningStaminaReduction = (): number => {
    return has('miners_charm') ? 0.15 : 0
  }

  /** 钓鱼calm概率加成 */
  const getFishingCalmBonus = (): number => {
    return has('anglers_token') ? 0.1 : 0
  }

  /** 烹饪恢复量加成 (0.25 = 25%) */
  const getCookingRestoreBonus = (): number => {
    return has('chefs_hat') ? 0.25 : 0
  }

  /** 作物生长速度加成 (0.1 = 10%) */
  const getCropGrowthBonus = (): number => {
    return has('earth_totem') ? 0.1 : 0
  }

  const serialize = () => {
    return {
      unlockedItems: unlockedItems.value,
      currentArchetypeId: currentArchetypeId.value,
      unlockedNodeIds: unlockedNodeIds.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    unlockedItems.value = data?.unlockedItems ?? []
    currentArchetypeId.value = data?.currentArchetypeId ?? null
    unlockedNodeIds.value = Array.isArray(data?.unlockedNodeIds) ? data!.unlockedNodeIds.filter(nodeId => typeof nodeId === 'string') : []

    if (currentArchetypeId.value && !getWalletArchetypeById(currentArchetypeId.value)) {
      currentArchetypeId.value = null
      unlockedNodeIds.value = []
    }

    if (currentArchetype.value) {
      const validNodeIds = new Set(currentArchetype.value.nodes.map(node => node.id))
      unlockedNodeIds.value = unlockedNodeIds.value.filter(nodeId => validNodeIds.has(nodeId))
    }
  }

  return {
    unlockedItems,
    currentArchetypeId,
    unlockedNodeIds,
    archetypes,
    unlockedDefs,
    currentArchetype,
    currentArchetypeNodes,
    unlockedArchetypeNodes,
    currentArchetypeMainEffectText,
    currentArchetypeMainEffectSummary,
    currentArchetypeNodeEffects,
    has,
    unlock,
    checkAndUnlock,
    canUnlockArchetype,
    getArchetypeUnlockHint,
    getArchetypeDescriptionText,
    selectArchetype,
    resetArchetype,
    isNodeUnlocked,
    canUnlockNode,
    getNodeUnlockHint,
    getEffectModuleLabel,
    getNodeModuleLabels,
    getNodeEffectSummary,
    unlockNode,
    getGoalPreferenceWeights,
    getCatalogOfferPreferenceScore,
    getCatalogOfferPreferenceReason,
    getCurrentArchetypeSummary,
    getShopDiscount,
    getForageQualityBoost,
    getMiningStaminaReduction,
    getFishingCalmBonus,
    getCookingRestoreBonus,
    getCropGrowthBonus,
    serialize,
    deserialize
  }
})
