import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { getItemById } from '@/data'
import { getMysteryBoxDef, MYSTERY_BOX_DEFS, MYSTERY_BOX_NAMING_LAYERS, MYSTERY_BOX_SOURCE_HINTS } from '@/data/mysteryBoxes'
import { getPotentialResourceDef } from '@/data/potential'
import { getActiveRewardTicketPrizeStage, PRIZE_TICKET_NAMING_LAYERS, REWARD_TICKET_PRIZE_STAGES, REWARD_TICKET_SOURCE_HINTS } from '@/data/prizeTickets'
import {
  MAYOR_TICKET_CONVERSION_MONEY_COST,
  MAYOR_TICKET_CONVERSION_NPC_ID,
  MAYOR_TICKET_CONVERSION_NPC_NAME,
  MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP,
  MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL,
  MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST,
  MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT,
  MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT,
  MAYOR_TICKET_CONVERTIBLE_TYPES,
  REWARD_TICKET_DEFS,
  REWARD_TICKET_EXCHANGE_OFFERS,
  REWARD_TICKET_LABELS
} from '@/data/rewardTickets'
import { WALLET_ARCHETYPES, WALLET_ITEMS, getWalletArchetypeById, getWalletNodeById } from '@/data/wallet'
import { FISH } from '@/data/fish'
import { getWeekCycleInfo } from '@/utils/weekCycle'
import type {
  MayorTicketConversionOffer,
  MayorTicketConversionResult,
  MayorTicketConversionStatus,
  MayorTicketConversionTicketType,
  RewardTicketExchangeOffer,
  RewardTicketConversionUsage,
  RewardTicketLedger,
  RewardTicketType,
  WalletArchetypeId,
  WalletCatalogPool,
  WalletEffectModule,
  WalletGoalBiasKey,
  WalletPassiveEffect,
  WalletShopId
} from '@/types'
import type { ItemCategory } from '@/types/item'
import { useAchievementStore } from './useAchievementStore'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { usePotentialStore } from './usePotentialStore'
import { useSkillStore } from './useSkillStore'
import { useMiningStore } from './useMiningStore'
import { useNpcStore } from './useNpcStore'
import { useSettingsStore } from './useSettingsStore'
import { useGameStore } from './useGameStore'

const SHOP_LABELS: Record<WalletShopId, string> = {
  wanwupu: '万物铺',
  tiejiangpu: '铁匠铺',
  yugupu: '渔具铺',
  yaopu: '药铺',
  chouduanzhuang: '绸缎庄',
  jiuguan: '醉桃源酒馆',
  biaoju: '镖局'
}

const INVENTORY_CATEGORY_LABELS: Record<ItemCategory, string> = {
  seed: '种子',
  crop: '作物',
  fish: '鱼类',
  ore: '矿石',
  gem: '宝石',
  gift: '礼物',
  food: '料理',
  material: '材料',
  misc: '杂货',
  processed: '加工品',
  elixir: '丹药',
  machine: '机器',
  sprinkler: '洒水器',
  fertilizer: '肥料',
  animal_product: '畜产',
  sapling: '树苗',
  fruit: '水果',
  bait: '鱼饵',
  tackle: '钓具',
  bomb: '炸弹',
  fossil: '化石',
  artifact: '文物',
  weapon: '武器',
  ring: '戒指',
  hat: '帽子',
  shoe: '鞋子'
}

type MysteryBoxRewardItem = { itemId: string; quantity: number }

const getMysteryBoxRewardItemSummary = (rewardItems: MysteryBoxRewardItem[]) =>
  rewardItems.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、')

const getMysteryBoxRewardDestination = (rewardItems: MysteryBoxRewardItem[]) => {
  const destinationLabels = rewardItems
    .map(item => getItemById(item.itemId)?.category)
    .filter((category): category is ItemCategory => !!category)
    .map(category => INVENTORY_CATEGORY_LABELS[category] ?? category)
  const uniqueDestinationLabels = [...new Set(destinationLabels)]
  return uniqueDestinationLabels.length > 0 ? `背包-${uniqueDestinationLabels.join(' / ')}` : '背包'
}

const formatMysteryBoxRewardPreview = (reward: { label: string; rewardItems: MysteryBoxRewardItem[] }) =>
  `${reward.label}：${getMysteryBoxRewardItemSummary(reward.rewardItems)}，入${getMysteryBoxRewardDestination(reward.rewardItems)}`

const formatMysteryBoxRewardResult = (reward: { label: string; rewardItems: MysteryBoxRewardItem[] }) =>
  `${reward.label}：${getMysteryBoxRewardItemSummary(reward.rewardItems)}，已放入${getMysteryBoxRewardDestination(reward.rewardItems)}`

const getPotentialResourceRewardSummary = (resources: RewardTicketExchangeOffer['rewardPotentialResources'] = []) =>
  resources.map(resource => `${getPotentialResourceDef(resource.resourceId)?.label ?? resource.resourceId}×${resource.amount}`).join('、')

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

const normalizeRewardTicketLedger = (value: unknown): RewardTicketLedger => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([ticketType, amount]) => typeof ticketType === 'string' && Number.isFinite(Number(amount)))
      .map(([ticketType, amount]) => [ticketType, Math.max(0, Math.floor(Number(amount) || 0))] as const)
      .filter(([, amount]) => amount > 0)
  ) as RewardTicketLedger
}

const normalizeRewardTicketConversionUsage = (value: unknown, currentWeekId?: string): RewardTicketConversionUsage => {
  if (!value || typeof value !== 'object') {
    return { weekId: currentWeekId ?? '', used: 0 }
  }
  const raw = value as Partial<RewardTicketConversionUsage>
  const weekId = typeof raw.weekId === 'string' ? raw.weekId : currentWeekId ?? ''
  if (currentWeekId && weekId !== currentWeekId) {
    return { weekId: currentWeekId, used: 0 }
  }
  return {
    weekId,
    used: Math.min(MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT, Math.max(0, Math.floor(Number(raw.used) || 0)))
  }
}

const isMayorTicketConversionTicketType = (ticketType: unknown): ticketType is MayorTicketConversionTicketType =>
  typeof ticketType === 'string' && MAYOR_TICKET_CONVERTIBLE_TYPES.includes(ticketType as MayorTicketConversionTicketType)

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
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const npcStore = useNpcStore()
  const potentialStore = usePotentialStore()
  const playerStore = usePlayerStore()
  /** 已解锁的钱袋物品ID */
  const unlockedItems = ref<string[]>([])
  /** 当前选择的钱包流派 */
  const currentArchetypeId = ref<WalletArchetypeId | null>(null)
  const unlockedNodeIdsByArchetype = ref<Partial<Record<WalletArchetypeId, string[]>>>({})
  /** 当前流派已解锁节点 */
  const unlockedNodeIds = ref<string[]>([])
  /** 统一资源券 / 凭证余额 */
  const rewardTickets = ref<RewardTicketLedger>({})
  /** 统一资源券 / 凭证累计入账，用于驱动阶段奖池，不因当前已消费余额而回退 */
  const rewardTicketLifetimeEarned = ref<RewardTicketLedger>({})
  const rewardTicketConversionUsage = ref<RewardTicketConversionUsage>({ weekId: '', used: 0 })
  const mayorTicketConversionVillageProjectLevel = ref(0)
  const mysteryBoxes = ref<Record<string, number>>({})
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
  const rewardTicketEntries = computed(() =>
    REWARD_TICKET_DEFS.map(def => ({
      ...def,
      balance: rewardTickets.value[def.id] ?? 0,
      lifetimeEarned: rewardTicketLifetimeEarned.value[def.id] ?? 0
    }))
  )
  const rewardTicketLifetimeTotal = computed(() =>
    Object.values(rewardTicketLifetimeEarned.value).reduce((total, amount) => total + Math.max(0, Number(amount) || 0), 0)
  )
  const rewardTicketPrizeNaming = computed(() => ({
    intakeLabel: PRIZE_TICKET_NAMING_LAYERS[0]?.label ?? '乡约牌',
    exchangeLabel: PRIZE_TICKET_NAMING_LAYERS[1]?.label ?? '祠堂赏格',
    highTierLabel: PRIZE_TICKET_NAMING_LAYERS[2]?.label ?? '村衙赏契',
    summaryLines: PRIZE_TICKET_NAMING_LAYERS.map(layer => `${layer.label}：${layer.summary}`)
  }))
  const activeRewardTicketPrizeStage = computed(() => getActiveRewardTicketPrizeStage(rewardTicketLifetimeTotal.value))
  const rewardTicketPrizeStageEntries = computed(() =>
    REWARD_TICKET_PRIZE_STAGES.map((stage, index, list) => {
      const nextStage = list[index + 1] ?? null
      const earned = rewardTicketLifetimeTotal.value
      const unlocked = earned >= stage.unlockLifetimeTickets
      const progressBase = unlocked ? earned - stage.unlockLifetimeTickets : 0
      const progressGoal = nextStage ? Math.max(1, nextStage.unlockLifetimeTickets - stage.unlockLifetimeTickets) : 0
      return {
        ...stage,
        unlocked,
        active: activeRewardTicketPrizeStage.value.id === stage.id,
        progressValue: nextStage ? Math.min(progressGoal, Math.max(0, progressBase)) : 0,
        progressGoal,
        nextStageLabel: nextStage?.label ?? null
      }
    })
  )
  const rewardTicketSourceHints = computed(() => [...REWARD_TICKET_SOURCE_HINTS])
  const mysteryBoxNaming = computed(() => ({
    summaryLines: MYSTERY_BOX_NAMING_LAYERS.map(layer => `${layer.label}：${layer.summary}`),
    sourceLines: [...MYSTERY_BOX_SOURCE_HINTS]
  }))
  const mysteryBoxEntries = computed(() =>
    MYSTERY_BOX_DEFS.map(def => ({
      ...def,
      count: Math.max(0, Number(mysteryBoxes.value[def.id]) || 0),
      rewardPreview: def.rewardEntries.map(formatMysteryBoxRewardPreview).join(' / ')
    }))
  )
  const ticketExchangeOffers = computed(() =>
    REWARD_TICKET_EXCHANGE_OFFERS.map(offer => {
      const rewardSummary = offer.rewardItems.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、')
      const mysteryBoxSummary = (offer.rewardMysteryBoxes ?? [])
        .map(box => `${getMysteryBoxDef(box.boxId)?.label ?? box.boxId}×${box.quantity}`)
        .join('、')
      const potentialResourceSummary = getPotentialResourceRewardSummary(offer.rewardPotentialResources)
      return {
        ...offer,
        balance: rewardTickets.value[offer.ticketType] ?? 0,
        affordable: (rewardTickets.value[offer.ticketType] ?? 0) >= offer.costTickets,
        rewardSummary,
        mysteryBoxSummary,
        potentialResourceSummary,
        rewardContentSummary: [rewardSummary, mysteryBoxSummary, potentialResourceSummary].filter(Boolean).join('、'),
        poolStageLabel: rewardTicketPrizeStageEntries.value.find(stage => stage.id === offer.poolStageId)?.label ?? '',
        poolTagsLabel: (offer.poolTags ?? []).join('、')
      }
    })
  )

  const getFriendlyNpcCount = () => {
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

  const normalizeNodeIdList = (nodeIds: string[]): string[] => [...new Set(nodeIds.filter(nodeId => typeof nodeId === 'string'))]

  const getSavedNodeIdsForArchetype = (archetypeId: WalletArchetypeId): string[] => {
    return normalizeNodeIdList(unlockedNodeIdsByArchetype.value[archetypeId] ?? [])
  }

  const setSavedNodeIdsForArchetype = (archetypeId: WalletArchetypeId, nodeIds: string[]) => {
    unlockedNodeIdsByArchetype.value = {
      ...unlockedNodeIdsByArchetype.value,
      [archetypeId]: normalizeNodeIdList(nodeIds)
    }
  }

  const clearSavedNodeIdsForArchetype = (archetypeId: WalletArchetypeId) => {
    const next = { ...unlockedNodeIdsByArchetype.value }
    delete next[archetypeId]
    unlockedNodeIdsByArchetype.value = next
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
      const fishCount = achievementStore.caughtFishIds.filter(id => fishIdSet.has(id)).length
      if (fishCount >= 30) {
        unlock('anglers_token')
        newlyUnlocked.push('钓翁令牌')
      }
    }

    // 厨师帽：烹饪10道不同食谱
    if (!has('chefs_hat') && achievementStore.cookedRecipeIds.length >= 10) {
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

  watch(
    () => [
      useAchievementStore().stats.totalMoneyEarned,
      useAchievementStore().stats.totalCropsHarvested,
      useAchievementStore().caughtFishIds.length,
      useAchievementStore().cookedRecipeIds.length,
      useSkillStore().getSkill('foraging').level,
      useMiningStore().safePointFloor,
    ],
    () => {
      checkAndUnlock()
    },
    { immediate: true }
  )

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
      if (currentArchetypeId.value) {
        setSavedNodeIdsForArchetype(currentArchetypeId.value, unlockedNodeIds.value)
      }
      currentArchetypeId.value = archetypeId
      unlockedNodeIds.value = getSavedNodeIdsForArchetype(archetypeId)
    }
    return true
  }

  const resetArchetype = (): void => {
    if (currentArchetypeId.value) {
      clearSavedNodeIdsForArchetype(currentArchetypeId.value)
    }
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
    unlockedNodeIds.value = [...unlockedNodeIds.value, nodeId]
    if (currentArchetypeId.value) {
      setSavedNodeIdsForArchetype(currentArchetypeId.value, unlockedNodeIds.value)
    }
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

  const getTicketLabel = (ticketType: RewardTicketType): string => REWARD_TICKET_LABELS[ticketType] ?? ticketType

  const getRewardTicketBalance = (ticketType: RewardTicketType): number => rewardTickets.value[ticketType] ?? 0

  const canAffordRewardTickets = (ticketType: RewardTicketType, amount: number): boolean => {
    return getRewardTicketBalance(ticketType) >= Math.max(0, Math.floor(Number(amount) || 0))
  }

  const getCurrentRewardTicketConversionWeekId = (): string =>
    getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId

  const ensureRewardTicketConversionUsageCurrent = (): RewardTicketConversionUsage => {
    const currentWeekId = getCurrentRewardTicketConversionWeekId()
    const nextUsage = normalizeRewardTicketConversionUsage(rewardTicketConversionUsage.value, currentWeekId)
    if (
      rewardTicketConversionUsage.value.weekId !== nextUsage.weekId ||
      rewardTicketConversionUsage.value.used !== nextUsage.used
    ) {
      rewardTicketConversionUsage.value = nextUsage
    }
    return rewardTicketConversionUsage.value
  }

  const syncMayorTicketConversionVillageProjectLevel = (completedProjects: number): void => {
    mayorTicketConversionVillageProjectLevel.value = Math.max(0, Math.floor(Number(completedProjects) || 0))
  }

  const mayorTicketConversionStatus = computed<MayorTicketConversionStatus>(() => {
    const usage = ensureRewardTicketConversionUsageCurrent()
    const currentFriendship = npcStore.getNpcState(MAYOR_TICKET_CONVERSION_NPC_ID)?.friendship ?? 0
    const currentVillageProjectLevel = mayorTicketConversionVillageProjectLevel.value
    const friendshipReady = currentFriendship >= MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP
    const villageProjectReady = currentVillageProjectLevel >= MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL
    const unlocked = friendshipReady && villageProjectReady
    const weeklyUsed = Math.min(MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT, usage.used)
    const weeklyRemaining = Math.max(0, MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT - weeklyUsed)
    const hint = unlocked
      ? `${MAYOR_TICKET_CONVERSION_NPC_NAME}已开放村务票据转换，本周还可转换${weeklyRemaining}次。`
      : friendshipReady
        ? `村长愿意为你担保票据转换，还需要完成${MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL}项村庄建设。`
        : villageProjectReady
          ? `村务票据转换已具备建设条件，还需要${MAYOR_TICKET_CONVERSION_NPC_NAME}好感达到${MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP}。`
          : `需要${MAYOR_TICKET_CONVERSION_NPC_NAME}好感达到${MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP}，并完成${MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL}项村庄建设。`

    return {
      unlocked,
      npcId: MAYOR_TICKET_CONVERSION_NPC_ID,
      npcName: MAYOR_TICKET_CONVERSION_NPC_NAME,
      requiredFriendship: MAYOR_TICKET_CONVERSION_REQUIRED_FRIENDSHIP,
      currentFriendship,
      friendshipReady,
      requiredVillageProjectLevel: MAYOR_TICKET_CONVERSION_REQUIRED_VILLAGE_PROJECT_LEVEL,
      currentVillageProjectLevel,
      villageProjectReady,
      sourceTicketCost: MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST,
      moneyCost: MAYOR_TICKET_CONVERSION_MONEY_COST,
      weeklyLimit: MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT,
      weeklyUsed,
      weeklyRemaining,
      weekId: usage.weekId,
      hint
    }
  })

  const ticketConversionOffers = computed<MayorTicketConversionOffer[]>(() => {
    const status = mayorTicketConversionStatus.value
    return MAYOR_TICKET_CONVERTIBLE_TYPES.flatMap(sourceType =>
      MAYOR_TICKET_CONVERTIBLE_TYPES
        .filter(targetType => targetType !== sourceType)
        .map(targetType => {
          const sourceBalance = getRewardTicketBalance(sourceType)
          const targetBalance = getRewardTicketBalance(targetType)
          const disabledReason = !status.unlocked
            ? status.hint
            : status.weeklyRemaining <= 0
              ? '本周村务票据转换次数已用完。'
              : sourceBalance < MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST
                ? `${getTicketLabel(sourceType)}不足（需要${MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST}）。`
                : playerStore.money < MAYOR_TICKET_CONVERSION_MONEY_COST
                  ? `铜钱不足（需要${MAYOR_TICKET_CONVERSION_MONEY_COST}文）。`
                  : undefined

          return {
            sourceType,
            targetType,
            sourceLabel: getTicketLabel(sourceType),
            targetLabel: getTicketLabel(targetType),
            sourceBalance,
            targetBalance,
            sourceTicketCost: MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST,
            targetTicketAmount: MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT,
            moneyCost: MAYOR_TICKET_CONVERSION_MONEY_COST,
            weeklyRemaining: status.weeklyRemaining,
            affordable: !disabledReason,
            disabledReason
          }
        })
    )
  })

  const addRewardTicketsToBalanceOnly = (ticketChanges: RewardTicketLedger | undefined): RewardTicketLedger => {
    const normalizedInput = normalizeRewardTicketLedger(ticketChanges)
    const entries = Object.entries(normalizedInput)
    if (entries.length === 0) return {}

    const nextLedger: RewardTicketLedger = { ...rewardTickets.value }
    for (const [ticketType, amount] of entries) {
      nextLedger[ticketType as RewardTicketType] = (nextLedger[ticketType as RewardTicketType] ?? 0) + amount
    }
    rewardTickets.value = nextLedger

    return normalizedInput
  }

  const addRewardTickets = (
    ticketChanges: RewardTicketLedger | undefined,
    options?: { applyMultiplier?: boolean; source?: string }
  ): RewardTicketLedger => {
    const normalizedInput = normalizeRewardTicketLedger(ticketChanges)
    const entries = Object.entries(normalizedInput)
    if (entries.length === 0) return {}

    const ticketRewardRate = options?.applyMultiplier === false
      ? 1
      : Math.max(0, useSettingsStore().getLateGameBalanceConfig().ticketRewardRate || 1)

    const grantedEntries = entries
      .map(([ticketType, amount]) => [ticketType, Math.max(0, Math.round(amount * ticketRewardRate))] as const)
      .filter(([, amount]) => amount > 0)

    if (grantedEntries.length === 0) return {}

    const nextLedger: RewardTicketLedger = { ...rewardTickets.value }
    const nextLifetimeLedger: RewardTicketLedger = { ...rewardTicketLifetimeEarned.value }
    for (const [ticketType, amount] of grantedEntries) {
      nextLedger[ticketType as RewardTicketType] = (nextLedger[ticketType as RewardTicketType] ?? 0) + amount
      nextLifetimeLedger[ticketType as RewardTicketType] = (nextLifetimeLedger[ticketType as RewardTicketType] ?? 0) + amount
    }
    rewardTickets.value = nextLedger
    rewardTicketLifetimeEarned.value = nextLifetimeLedger

    return Object.fromEntries(grantedEntries) as RewardTicketLedger
  }

  const spendRewardTickets = (ticketType: RewardTicketType, amount: number): boolean => {
    const normalizedAmount = Math.max(0, Math.floor(Number(amount) || 0))
    if (normalizedAmount <= 0) return true
    if (!canAffordRewardTickets(ticketType, normalizedAmount)) return false

    const nextLedger: RewardTicketLedger = { ...rewardTickets.value }
    const remaining = (nextLedger[ticketType] ?? 0) - normalizedAmount
    if (remaining > 0) {
      nextLedger[ticketType] = remaining
    } else {
      delete nextLedger[ticketType]
    }
    rewardTickets.value = nextLedger
    return true
  }

  const redeemRewardTicketConversion = (
    sourceType: MayorTicketConversionTicketType,
    targetType: MayorTicketConversionTicketType
  ): MayorTicketConversionResult => {
    if (!isMayorTicketConversionTicketType(sourceType) || !isMayorTicketConversionTicketType(targetType)) {
      return { success: false, message: '村务票据转换暂只开放建设券、展陈券、商路票和研究券。' }
    }
    if (sourceType === targetType) {
      return { success: false, message: '来源券和目标券不能相同。' }
    }

    const offer = ticketConversionOffers.value.find(entry => entry.sourceType === sourceType && entry.targetType === targetType)
    if (!offer) return { success: false, message: '村务票据转换项目不存在。' }
    if (!offer.affordable) {
      return { success: false, message: offer.disabledReason ?? '当前无法进行村务票据转换。', offer }
    }

    if (!spendRewardTickets(sourceType, MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST)) {
      return {
        success: false,
        message: `${getTicketLabel(sourceType)}不足（需要${MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST}）。`,
        offer
      }
    }
    if (!playerStore.spendMoney(MAYOR_TICKET_CONVERSION_MONEY_COST, 'wallet')) {
      addRewardTicketsToBalanceOnly({ [sourceType]: MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST })
      return { success: false, message: `铜钱不足（需要${MAYOR_TICKET_CONVERSION_MONEY_COST}文）。`, offer }
    }

    addRewardTicketsToBalanceOnly({ [targetType]: MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT })
    const usage = ensureRewardTicketConversionUsageCurrent()
    rewardTicketConversionUsage.value = {
      weekId: usage.weekId,
      used: Math.min(MAYOR_TICKET_CONVERSION_WEEKLY_LIMIT, usage.used + 1)
    }

    return {
      success: true,
      message: `消耗${getTicketLabel(sourceType)}×${MAYOR_TICKET_CONVERSION_SOURCE_TICKET_COST}与${MAYOR_TICKET_CONVERSION_MONEY_COST}文，转换为${getTicketLabel(targetType)}×${MAYOR_TICKET_CONVERSION_TARGET_TICKET_AMOUNT}。`,
      offer: ticketConversionOffers.value.find(entry => entry.sourceType === sourceType && entry.targetType === targetType) ?? offer
    }
  }

  const addMysteryBoxes = (boxId: string, amount: number): boolean => {
    const normalizedAmount = Math.max(0, Math.floor(Number(amount) || 0))
    if (!getMysteryBoxDef(boxId) || normalizedAmount <= 0) return false
    usePlayerStore().markMysteryBoxCatalogued(boxId)
    mysteryBoxes.value = {
      ...mysteryBoxes.value,
      [boxId]: (mysteryBoxes.value[boxId] ?? 0) + normalizedAmount
    }
    return true
  }

  const openMysteryBox = (boxId: string): { success: boolean; message: string } => {
    const def = getMysteryBoxDef(boxId)
    if (!def) return { success: false, message: '找不到这只密匣。' }
    if ((mysteryBoxes.value[boxId] ?? 0) <= 0) return { success: false, message: `${def.label}数量不足。` }
    const reward = def.rewardEntries[Math.floor(Math.random() * def.rewardEntries.length)]
    if (!reward) return { success: false, message: `${def.label}里暂时没有可开的内容。` }
    const rewardItems = reward.rewardItems.map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (!inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包空间不足，暂时无法开匣。' }
    }

    const nextBoxes = { ...mysteryBoxes.value }
    const remaining = (nextBoxes[boxId] ?? 0) - 1
    if (remaining > 0) {
      nextBoxes[boxId] = remaining
    } else {
      delete nextBoxes[boxId]
    }
    mysteryBoxes.value = nextBoxes
    inventoryStore.addItemsExact(rewardItems)
    usePlayerStore().markMysteryBoxCatalogued(boxId)
    return { success: true, message: `你开启了${def.label}，获得${formatMysteryBoxRewardResult(reward)}。` }
  }

  const redeemRewardTicketOffer = (offerId: string): { success: boolean; message: string; offer?: RewardTicketExchangeOffer } => {
    const offer = REWARD_TICKET_EXCHANGE_OFFERS.find(entry => entry.id === offerId)
    if (!offer) return { success: false, message: '兑换项目不存在。' }
    if (!canAffordRewardTickets(offer.ticketType, offer.costTickets)) {
      return {
        success: false,
        message: `${getTicketLabel(offer.ticketType)}不足（需要${offer.costTickets}）。`,
        offer
      }
    }

    const rewardItems = offer.rewardItems.map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      return { success: false, message: '背包空间不足，暂时无法兑换。', offer }
    }

    const inventorySnapshot = inventoryStore.serialize()
    if (!spendRewardTickets(offer.ticketType, offer.costTickets)) {
      return {
        success: false,
        message: `${getTicketLabel(offer.ticketType)}不足（需要${offer.costTickets}）。`,
        offer
      }
    }

    if (rewardItems.length > 0 && !inventoryStore.addItemsExact(rewardItems)) {
      inventoryStore.deserialize(inventorySnapshot)
      addRewardTickets({ [offer.ticketType]: offer.costTickets }, { applyMultiplier: false, source: 'ticket_refund' })
      return { success: false, message: '兑换失败，已返还票券。', offer }
    }
    for (const boxReward of offer.rewardMysteryBoxes ?? []) {
      addMysteryBoxes(boxReward.boxId, boxReward.quantity)
    }
    const grantedPotentialResources = (offer.rewardPotentialResources ?? [])
      .map(reward => {
        const granted = potentialStore.addPotentialResource(reward.resourceId, reward.amount)
        return granted > 0 ? `${getPotentialResourceDef(reward.resourceId)?.label ?? reward.resourceId}×${granted}` : ''
      })
      .filter(Boolean)
    if (
      rewardItems.length === 0 &&
      (offer.rewardMysteryBoxes ?? []).length === 0 &&
      (offer.rewardPotentialResources ?? []).length > 0 &&
      grantedPotentialResources.length === 0
    ) {
      addRewardTickets({ [offer.ticketType]: offer.costTickets }, { applyMultiplier: false, source: 'ticket_refund' })
      return { success: false, message: '兑换失败，已返还票券。', offer }
    }
    usePlayerStore().markPrizeProgress(offer.poolStageId ?? offer.ticketType)

    const grantedRewardSummary = [
      offer.rewardItems.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、'),
      (offer.rewardMysteryBoxes ?? []).map(box => `${getMysteryBoxDef(box.boxId)?.label ?? box.boxId}×${box.quantity}`).join('、'),
      grantedPotentialResources.join('、')
    ].filter(Boolean).join('、')

    return {
      success: true,
      message: `消耗${getTicketLabel(offer.ticketType)}×${offer.costTickets}，兑换了${offer.label}${grantedRewardSummary ? `，获得${grantedRewardSummary}` : ''}。`,
      offer
    }
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
    const currentConversionUsage = ensureRewardTicketConversionUsageCurrent()
    return {
      unlockedItems: unlockedItems.value,
      currentArchetypeId: currentArchetypeId.value,
      unlockedNodeIds: unlockedNodeIds.value,
      unlockedNodeIdsByArchetype: unlockedNodeIdsByArchetype.value,
      rewardTickets: rewardTickets.value,
      rewardTicketLifetimeEarned: rewardTicketLifetimeEarned.value,
      rewardTicketConversionUsage: currentConversionUsage,
      mysteryBoxes: mysteryBoxes.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    unlockedItems.value = data?.unlockedItems ?? []
    currentArchetypeId.value = data?.currentArchetypeId ?? null
    const rawNodeMap = data?.unlockedNodeIdsByArchetype
    unlockedNodeIdsByArchetype.value = rawNodeMap && typeof rawNodeMap === 'object'
      ? Object.fromEntries(
          Object.entries(rawNodeMap)
            .filter(([archetypeId]) => !!getWalletArchetypeById(archetypeId as WalletArchetypeId))
            .map(([archetypeId, nodeIds]) => [archetypeId, normalizeNodeIdList(Array.isArray(nodeIds) ? nodeIds : [])])
        ) as Partial<Record<WalletArchetypeId, string[]>>
      : {}
    unlockedNodeIds.value = Array.isArray(data?.unlockedNodeIds) ? data!.unlockedNodeIds.filter(nodeId => typeof nodeId === 'string') : []
    rewardTickets.value = normalizeRewardTicketLedger(data?.rewardTickets)
    rewardTicketLifetimeEarned.value = normalizeRewardTicketLedger(
      data?.rewardTicketLifetimeEarned && Object.keys(data.rewardTicketLifetimeEarned).length > 0
        ? data.rewardTicketLifetimeEarned
        : data?.rewardTickets
    )
    rewardTicketConversionUsage.value = normalizeRewardTicketConversionUsage(data?.rewardTicketConversionUsage)
    mysteryBoxes.value = data?.mysteryBoxes && typeof data.mysteryBoxes === 'object'
      ? Object.fromEntries(
          Object.entries(data.mysteryBoxes)
            .filter(([boxId, amount]) => getMysteryBoxDef(boxId) && Number.isFinite(Number(amount)))
            .map(([boxId, amount]) => [boxId, Math.max(0, Math.floor(Number(amount) || 0))] as const)
            .filter(([, amount]) => amount > 0)
        )
      : {}

    if (currentArchetypeId.value && !getWalletArchetypeById(currentArchetypeId.value)) {
      currentArchetypeId.value = null
      unlockedNodeIds.value = []
    }

    if (currentArchetype.value) {
      const validNodeIds = new Set(currentArchetype.value.nodes.map(node => node.id))
      const legacyNodeIds = unlockedNodeIds.value.filter(nodeId => validNodeIds.has(nodeId))
      if (legacyNodeIds.length > 0 && getSavedNodeIdsForArchetype(currentArchetypeId.value!).length === 0) {
        setSavedNodeIdsForArchetype(currentArchetypeId.value!, legacyNodeIds)
      }
      unlockedNodeIds.value = getSavedNodeIdsForArchetype(currentArchetypeId.value!).filter(nodeId => validNodeIds.has(nodeId))
      setSavedNodeIdsForArchetype(currentArchetypeId.value!, unlockedNodeIds.value)
    } else {
      unlockedNodeIds.value = []
    }

    checkAndUnlock()
  }

  const $reset = () => {
    unlockedItems.value = []
    currentArchetypeId.value = null
    unlockedNodeIdsByArchetype.value = {}
    unlockedNodeIds.value = []
    rewardTickets.value = {}
    rewardTicketLifetimeEarned.value = {}
    rewardTicketConversionUsage.value = { weekId: '', used: 0 }
    mysteryBoxes.value = {}
  }

  return {
    unlockedItems,
    currentArchetypeId,
    unlockedNodeIds,
    rewardTickets,
    rewardTicketLifetimeEarned,
    rewardTicketConversionUsage,
    mysteryBoxes,
    archetypes,
    unlockedDefs,
    currentArchetype,
    currentArchetypeNodes,
    unlockedArchetypeNodes,
    currentArchetypeMainEffectText,
    currentArchetypeMainEffectSummary,
    currentArchetypeNodeEffects,
    rewardTicketEntries,
    rewardTicketLifetimeTotal,
    rewardTicketPrizeNaming,
    activeRewardTicketPrizeStage,
    rewardTicketPrizeStageEntries,
    rewardTicketSourceHints,
    mayorTicketConversionStatus,
    ticketConversionOffers,
    mysteryBoxNaming,
    mysteryBoxEntries,
    ticketExchangeOffers,
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
    getTicketLabel,
    getRewardTicketBalance,
    canAffordRewardTickets,
    syncMayorTicketConversionVillageProjectLevel,
    addRewardTickets,
    spendRewardTickets,
    addMysteryBoxes,
    openMysteryBox,
    redeemRewardTicketOffer,
    redeemRewardTicketConversion,
    getShopDiscount,
    getForageQualityBoost,
    getMiningStaminaReduction,
    getFishingCalmBonus,
    getCookingRestoreBonus,
    getCropGrowthBonus,
    serialize,
    deserialize,
    $reset
  }
})
