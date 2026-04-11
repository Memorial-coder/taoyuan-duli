import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { QuestInstance, Season, MainQuestState, MainQuestObjective, VillagerQuestCategory } from '@/types'
import { generateQuest, generateSpecialOrder as _generateSpecialOrder, generateVillagerQuest, BREEDING_SPECIAL_ORDER_BASELINE } from '@/data/quests'
import { getStoryQuestById, getNextStoryQuest, getFirstStoryQuest, STORY_QUESTS } from '@/data/storyQuests'
import { getNpcById } from '@/data/npcs'
import { getTodayEvent } from '@/data/events'
import { getItemById, getRecipeById } from '@/data'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useNpcStore } from './useNpcStore'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'
import { useShopStore } from './useShopStore'
import { useAnimalStore } from './useAnimalStore'
import { useBreedingStore } from './useBreedingStore'
import { useCookingStore } from './useCookingStore'
import { useFishPondStore } from './useFishPondStore'
import { useGoalStore } from './useGoalStore'
import { useVillageProjectStore } from './useVillageProjectStore'

export const useQuestStore = defineStore('quest', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const npcStore = useNpcStore()
  const achievementStore = useAchievementStore()
  const villageProjectStore = useVillageProjectStore()

  /** 告示栏上的可接取任务 */
  const boardQuests = ref<QuestInstance[]>([])

  /** 已接取的进行中任务 */
  const activeQuests = ref<QuestInstance[]>([])

  /** 累计完成任务数 */
  const completedQuestCount = ref<number>(0)

  /** 当前可接取的特殊订单 */
  const specialOrder = ref<QuestInstance | null>(null)

  /** 最大同时接取任务数 */
  const MAX_ACTIVE_QUESTS = computed(() => 3 + villageProjectStore.getQuestCapacityBonus())

  /** 每日生成新任务到告示栏 */
  const generateDailyQuests = (season: Season, day: number) => {
    boardQuests.value = [] // 清空旧的告示栏
    const count = 2 + Math.floor(Math.random() * 2) + villageProjectStore.getDailyQuestBoardBonus() // 2-3个，扩建后+1
    for (let i = 0; i < count; i++) {
      const quest = generateQuest(season, day)
      if (quest) {
        boardQuests.value.push(quest)
      }
    }
    // 25% 概率生成一个紧急委托（1天时限，奖励翻倍）
    if (Math.random() < 0.25) {
      const urgent = generateQuest(season, day, true)
      if (urgent) boardQuests.value.push(urgent)
    }

    const relationshipStages = Object.fromEntries(npcStore.npcStates.map(state => [state.npcId, npcStore.getRelationshipStage(state.npcId)]))
    const preferredCategory = (() => {
      if (getTodayEvent(season, day)) return 'festival_prep' as VillagerQuestCategory

      const rotation: VillagerQuestCategory[] = ['gathering', 'cooking', 'fishing', 'errand']
      return rotation[(day - 1) % rotation.length] ?? null
    })()

    const villagerQuest = generateVillagerQuest(season, relationshipStages, preferredCategory)
    if (villagerQuest) {
      const duplicateNpc = boardQuests.value.some(q => q.npcId === villagerQuest.npcId && q.sourceCategory)
      if (!duplicateNpc) boardQuests.value.push(villagerQuest)
    }
  }

  /** 按梯度生成特殊订单 (tier: 1-4 对应 第7/14/21/28天) */
  const specialOrderBaseline = BREEDING_SPECIAL_ORDER_BASELINE

  const generateSpecialOrder = (season: Season, tier: number) => {
    const breedingStore = useBreedingStore()
    const fishPondStore = useFishPondStore()
    const goalStore = useGoalStore()
    const order = _generateSpecialOrder(season, tier, {
      discoveredHybridIds: breedingStore.compendium.map(entry => entry.hybridId),
      breedingCompendiumEntries: breedingStore.compendium,
      discoveredPondBreedIds: [...fishPondStore.discoveredBreeds],
      preferredThemeTag: goalStore.currentThemeWeek?.preferredQuestThemeTag,
      preferredHybridIds: goalStore.currentThemeWeek?.breedingFocusHybridIds ?? []
    })
    specialOrder.value = order
  }

  /** 接取任务 */
  const acceptQuest = (questId: string): { success: boolean; message: string } => {
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS.value) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS.value}个任务。` }
    }
    const idx = boardQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = boardQuests.value[idx]!
    quest.accepted = true

    // 非送货类委托：检查背包中已有的物品数量
    if (quest.type !== 'delivery') {
      quest.collectedQuantity = Math.min(inventoryStore.getTotalItemCount(quest.targetItemId), quest.targetQuantity)
    }

    activeQuests.value.push(quest)
    boardQuests.value.splice(idx, 1)
    return { success: true, message: `接取了任务：${quest.description}` }
  }

  /** 接取特殊订单 */
  const acceptSpecialOrder = (): { success: boolean; message: string } => {
    if (!specialOrder.value) return { success: false, message: '没有可接取的特殊订单。' }
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS.value) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS.value}个任务。` }
    }

    const fishPondStore = useFishPondStore()
    const order = specialOrder.value
    order.accepted = true
    if (order.deliveryMode === 'pond') {
      order.collectedQuantity = Math.min(
        fishPondStore.countEligibleFishForOrder({
          fishId: order.targetItemId,
          generationMin: order.requiredPondGenerationMin,
          requireMature: order.requiredFishMature,
          requireHealthy: order.requiredFishHealthy
        }),
        order.targetQuantity
      )
    } else {
      order.collectedQuantity = Math.min(inventoryStore.getTotalItemCount(order.targetItemId), order.targetQuantity)
    }

    activeQuests.value.push(order)
    specialOrder.value = null
    return { success: true, message: `接取了特殊订单：${order.description}` }
  }

  const getSpecialOrderBaseline = () => specialOrderBaseline

  const getQuestEffectiveProgress = (quest: QuestInstance): number => {
    if (quest.deliveryMode === 'pond') {
      const fishPondStore = useFishPondStore()
      const eligible = fishPondStore.countEligibleFishForOrder({
        fishId: quest.targetItemId,
        generationMin: quest.requiredPondGenerationMin,
        requireMature: quest.requiredFishMature,
        requireHealthy: quest.requiredFishHealthy
      })
      return Math.min(eligible, quest.targetQuantity)
    }

    const carriedCount = inventoryStore.getTotalItemCount(quest.targetItemId)
    if (quest.type === 'delivery') {
      return Math.min(carriedCount, quest.targetQuantity)
    }
    return Math.min(Math.max(quest.collectedQuantity, carriedCount), quest.targetQuantity)
  }

  const canSubmitQuest = (quest: QuestInstance): boolean => {
    if (quest.deliveryMode === 'pond') {
      return getQuestEffectiveProgress(quest) >= quest.targetQuantity
    }

    const carriedCount = inventoryStore.getTotalItemCount(quest.targetItemId)
    if (quest.type === 'delivery') {
      return carriedCount >= quest.targetQuantity
    }
    return getQuestEffectiveProgress(quest) >= quest.targetQuantity && carriedCount >= quest.targetQuantity
  }

  /** 提交完成的任务 */
  const submitQuest = (questId: string): { success: boolean; message: string } => {
    const cookingStore = useCookingStore()
    const fishPondStore = useFishPondStore()
    const villageProjectStore = useVillageProjectStore()
    const idx = activeQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = activeQuests.value[idx]!
    const inventorySnapshot = inventoryStore.serialize()
    const rewardItems = (quest.itemReward ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))

    if (quest.deliveryMode === 'pond') {
      const eligibleCount = fishPondStore.countEligibleFishForOrder({
        fishId: quest.targetItemId,
        generationMin: quest.requiredPondGenerationMin,
        requireMature: quest.requiredFishMature,
        requireHealthy: quest.requiredFishHealthy
      })
      if (eligibleCount < quest.targetQuantity) {
        return { success: false, message: `鱼塘中符合条件的${quest.targetItemName}不足（${eligibleCount}/${quest.targetQuantity}）。` }
      }
      if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
        return { success: false, message: '请先整理背包，当前空间不足以领取委托奖励。' }
      }
      if (
        !fishPondStore.submitEligibleFishForOrder({
          fishId: quest.targetItemId,
          quantity: quest.targetQuantity,
          generationMin: quest.requiredPondGenerationMin,
          requireMature: quest.requiredFishMature,
          requireHealthy: quest.requiredFishHealthy
        })
      ) {
        return { success: false, message: '鱼塘交付失败，请稍后再试。' }
      }
    }
    // 送货类委托：提交时从背包扣除物品
    else if (quest.type === 'delivery') {
      if (inventoryStore.getTotalItemCount(quest.targetItemId) < quest.targetQuantity) {
        return { success: false, message: `背包中${quest.targetItemName}不足。` }
      }
      if (!inventoryStore.removeItemAnywhere(quest.targetItemId, quest.targetQuantity)) {
        inventoryStore.deserialize(inventorySnapshot)
        return { success: false, message: `背包中${quest.targetItemName}不足。` }
      }
    } else {
      // 钓鱼/挖矿/采集/特殊订单类：检查收集进度或背包数量
      const effectiveProgress = getQuestEffectiveProgress(quest)
      if (effectiveProgress < quest.targetQuantity) {
        return { success: false, message: `${quest.targetItemName}收集进度不足（${effectiveProgress}/${quest.targetQuantity}）。` }
      }
      if (inventoryStore.getTotalItemCount(quest.targetItemId) < quest.targetQuantity) {
        return { success: false, message: `请先带上足够的${quest.targetItemName}再来提交。` }
      }
      if (!inventoryStore.removeItemAnywhere(quest.targetItemId, quest.targetQuantity)) {
        inventoryStore.deserialize(inventorySnapshot)
        return { success: false, message: `请先带上足够的${quest.targetItemName}再来提交。` }
      }
    }

    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.deserialize(inventorySnapshot)
      return { success: false, message: '请先整理背包，提交后腾出的空间仍不足以领取委托奖励。' }
    }

    // 发放铜钱奖励
    const finalMoneyReward = quest.moneyReward + Math.floor(quest.moneyReward * villageProjectStore.getQuestMoneyBonusRate())
    const finalFriendshipReward = quest.friendshipReward + villageProjectStore.getQuestFriendshipBonus()

    playerStore.earnMoney(finalMoneyReward)
    const friendshipMessages = npcStore.adjustFriendship(quest.npcId, finalFriendshipReward)

    // 发放物品奖励
    if (quest.itemReward) {
      inventoryStore.addItemsExact(rewardItems)
    }

    const unlockedRecipes: string[] = []
    if (quest.recipeReward) {
      for (const recipeId of quest.recipeReward) {
        if (cookingStore.unlockRecipe(recipeId)) {
          unlockedRecipes.push(getRecipeById(recipeId)?.name ?? recipeId)
        }
      }
    }

    let clueMessage = ''
    if (quest.buildingClueId && quest.buildingClueText) {
      const added = npcStore.addRelationshipClue(quest.npcId, quest.buildingClueId, quest.buildingClueText)
      if (added) clueMessage = ` 你记下了一条新的建筑线索。`
    }

    // 记录完成
    completedQuestCount.value++

    // 从活跃列表移除
    activeQuests.value.splice(idx, 1)

    let message = `完成了${quest.npcName}的委托！获得${finalMoneyReward}文，${quest.npcName}好感+${finalFriendshipReward}。`
    if (villageProjectStore.getQuestMoneyBonusRate() > 0) {
      message += ' 商队驿站让这单报酬更高。'
    }
    if (villageProjectStore.getQuestFriendshipBonus() > 0) {
      message += ' 学舍整修让村民对你的帮助更认可。'
    }
    if (quest.itemReward && quest.itemReward.length > 0) {
      const itemNames = quest.itemReward.map(i => `${getItemById(i.itemId)?.name ?? i.itemId}×${i.quantity}`).join('、')
      message += ` 额外获得${itemNames}。`
    }
    if (unlockedRecipes.length > 0) {
      message += ` 解锁食谱：${unlockedRecipes.join('、')}。`
    }
    if (quest.bonusSummary && quest.bonusSummary.length > 0) {
      message += ` ${quest.bonusSummary.join(' ')}`
    }
    if (friendshipMessages.length > 0) {
      message += ` ${friendshipMessages.join(' ')}`
    }
    if (clueMessage) {
      message += clueMessage
    }

    return { success: true, message }
  }

  /** 当玩家获得某物品时，更新进行中任务的进度（钓鱼/挖矿/采集类） */
  const onItemObtained = (itemId: string, quantity: number = 1) => {
    for (const quest of activeQuests.value) {
      if (quest.type === 'delivery') continue // 送货类不自动追踪
      if (quest.targetItemId === itemId && quest.collectedQuantity < quest.targetQuantity) {
        quest.collectedQuantity = Math.min(quest.collectedQuantity + quantity, quest.targetQuantity)
      }
    }

    // 同步刷新主线任务中 deliverItem 目标的进度
    if (mainQuest.value?.accepted) {
      const def = getStoryQuestById(mainQuest.value.questId)
      if (def) {
        for (let i = 0; i < def.objectives.length; i++) {
          const obj = def.objectives[i]!
          if (obj.type === 'deliverItem' && obj.itemId === itemId && !mainQuest.value.objectiveProgress[i]) {
            mainQuest.value.objectiveProgress[i] = evaluateObjective(obj)
          }
        }
      }
    }
  }

  /** 每日更新：天数递减，过期移除 */
  const dailyUpdate = () => {
    // 活跃委托剩余天数递减
    const expired: QuestInstance[] = []
    activeQuests.value = activeQuests.value.filter(q => {
      q.daysRemaining--
      if (q.daysRemaining <= 0) {
        expired.push(q)
        return false
      }
      return true
    })

    // 特殊订单过期（未接取也会过期）
    if (specialOrder.value) {
      specialOrder.value.daysRemaining--
      if (specialOrder.value.daysRemaining <= 0) {
        specialOrder.value = null
      }
    }

    return expired
  }

  /** 检查是否有任务关注某物品 */
  const hasActiveQuestFor = (itemId: string): boolean => {
    return activeQuests.value.some(q => q.targetItemId === itemId)
  }

  // ============================================================
  // 主线任务
  // ============================================================

  /** 当前主线任务状态 */
  const mainQuest = ref<MainQuestState | null>(null)

  /** 已完成的主线任务ID列表 */
  const completedMainQuests = ref<string[]>([])

  /** 好感等级层级顺序 */
  const LEVEL_ORDER = ['stranger', 'acquaintance', 'friendly', 'bestFriend'] as const
  const meetsLevel = (current: string, required: string): boolean => {
    return LEVEL_ORDER.indexOf(current as (typeof LEVEL_ORDER)[number]) >= LEVEL_ORDER.indexOf(required as (typeof LEVEL_ORDER)[number])
  }

  /** 评估单个目标是否达成 */
  const evaluateObjective = (obj: MainQuestObjective): boolean => {
    const skillStore = useSkillStore()
    const shopStore = useShopStore()
    const animalStore = useAnimalStore()

    switch (obj.type) {
      case 'earnMoney':
        return achievementStore.stats.totalMoneyEarned >= (obj.target ?? 0)
      case 'reachMineFloor':
        return achievementStore.stats.highestMineFloor >= (obj.target ?? 0)
      case 'reachSkullFloor':
        return achievementStore.stats.skullCavernBestFloor >= (obj.target ?? 0)
      case 'skillLevel':
        if (obj.skillType) {
          return skillStore.getSkill(obj.skillType as 'farming' | 'foraging' | 'fishing' | 'mining' | 'combat').level >= (obj.target ?? 0)
        }
        // 无指定技能类型 = 任意技能达标
        return skillStore.skills.some(s => s.level >= (obj.target ?? 0))
      case 'allSkillsLevel':
        return skillStore.skills.every(s => s.level >= (obj.target ?? 0))
      case 'harvestCrops':
        return achievementStore.stats.totalCropsHarvested >= (obj.target ?? 0)
      case 'catchFish':
        return achievementStore.stats.totalFishCaught >= (obj.target ?? 0)
      case 'cookRecipes':
        return achievementStore.stats.totalRecipesCooked >= (obj.target ?? 0)
      case 'killMonsters':
        return achievementStore.stats.totalMonstersKilled >= (obj.target ?? 0)
      case 'discoverItems':
        return achievementStore.discoveredItems.length >= (obj.target ?? 0)
      case 'npcFriendship': {
        if (obj.npcId === '_any') {
          // 任意NPC达到指定好感
          return npcStore.npcStates.some(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'acquaintance'))
        }
        const level = npcStore.getFriendshipLevel(obj.npcId ?? '')
        return meetsLevel(level, obj.friendshipLevel ?? 'acquaintance')
      }
      case 'npcAllFriendly':
        return npcStore.npcStates.every(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'friendly'))
      case 'completeBundles':
        return achievementStore.completedBundles.length >= (obj.target ?? 0)
      case 'completeQuests':
        return completedQuestCount.value >= (obj.target ?? 0)
      case 'shipItems':
        return shopStore.shippedItems.length >= (obj.target ?? 0)
      case 'ownAnimals':
        return animalStore.animals.length >= (obj.target ?? 0)
      case 'married':
        return npcStore.getSpouse() !== null
      case 'hasChild':
        return npcStore.children.length > 0
      case 'deliverItem':
        // deliverItem 允许从主背包或临时背包提交
        return inventoryStore.getTotalItemCount(obj.itemId ?? '') >= (obj.itemQuantity ?? 1)
      default:
        return false
    }
  }

  /** 初始化主线任务：如果没有当前任务，设置下一个可接取的 */
  const initMainQuest = () => {
    if (mainQuest.value) return // 已有当前任务
    if (completedMainQuests.value.length >= STORY_QUESTS.length) return // 全部完成

    // 找到下一个未完成的主线任务
    const nextQuest =
      completedMainQuests.value.length === 0
        ? getFirstStoryQuest()
        : getNextStoryQuest(completedMainQuests.value[completedMainQuests.value.length - 1]!)

    if (nextQuest) {
      mainQuest.value = {
        questId: nextQuest.id,
        accepted: false,
        objectiveProgress: nextQuest.objectives.map(() => false)
      }
    }
  }

  /** 接取主线任务 */
  const acceptMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value) return { success: false, message: '没有可接取的主线任务。' }
    if (mainQuest.value.accepted) return { success: false, message: '主线任务已接取。' }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }

    mainQuest.value.accepted = true

    // 接取时立即评估一次进度
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    return { success: true, message: `接取了主线任务：${def.title}（${npcName}）` }
  }

  /** 每日更新主线任务进度 */
  const updateMainQuestProgress = () => {
    if (!mainQuest.value || !mainQuest.value.accepted) return

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return

    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }
  }

  /** 检查主线任务是否可提交（实时评估未完成的目标） */
  const canSubmitMainQuest = (): boolean => {
    if (!mainQuest.value || !mainQuest.value.accepted) return false

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return false

    // 实时刷新未完成目标的进度，使 UI 同步显示最新状态
    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }

    return mainQuest.value.objectiveProgress.every(p => p)
  }

  /** 提交主线任务 */
  const submitMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value || !mainQuest.value.accepted) {
      return { success: false, message: '没有可提交的主线任务。' }
    }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }
    const inventorySnapshot = inventoryStore.serialize()
    const rewardItems = (def.itemReward ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))

    // 最终验证所有目标
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }
    if (!mainQuest.value.objectiveProgress.every(p => p)) {
      return { success: false, message: '主线任务目标尚未全部完成。' }
    }

    // deliverItem 类型扣除背包物品
    for (const obj of def.objectives) {
      if (obj.type === 'deliverItem' && obj.itemId && obj.itemQuantity) {
        if (!inventoryStore.removeItemAnywhere(obj.itemId, obj.itemQuantity)) {
          inventoryStore.deserialize(inventorySnapshot)
          return { success: false, message: `背包中物品不足，无法提交。` }
        }
      }
    }

    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.deserialize(inventorySnapshot)
      return { success: false, message: '请先整理背包，提交后腾出的空间仍不足以领取主线奖励。' }
    }

    // 发放铜钱奖励
    playerStore.earnMoney(def.moneyReward)

    // 发放好感奖励
    if (def.friendshipReward) {
      for (const fr of def.friendshipReward) {
        npcStore.adjustFriendship(fr.npcId, fr.amount)
      }
    }

    // 发放物品奖励
    if (def.itemReward) {
      inventoryStore.addItemsExact(rewardItems)
    }

    // 记录完成
    completedMainQuests.value.push(mainQuest.value.questId)
    mainQuest.value = null

    // 自动初始化下一个主线任务
    initMainQuest()

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    let message = `【主线完成】${def.title}！${npcName}：获得${def.moneyReward}文。`
    if (def.itemReward && def.itemReward.length > 0) {
      message += ` 额外获得物品奖励。`
    }
    if (!mainQuest.value) {
      if (completedMainQuests.value.length >= STORY_QUESTS.length) {
        message += ` 恭喜！你已完成桃源乡全部主线任务！`
      }
    }

    return { success: true, message }
  }

  // ============================================================
  // 序列化
  // ============================================================

  const serialize = () => {
    return {
      boardQuests: boardQuests.value,
      activeQuests: activeQuests.value,
      completedQuestCount: completedQuestCount.value,
      specialOrder: specialOrder.value,
      mainQuest: mainQuest.value,
      completedMainQuests: completedMainQuests.value
    }
  }

  const normalizeQuestInstance = (raw: unknown): QuestInstance | null => {
    if (!raw || typeof raw !== 'object') return null
    const quest = raw as Record<string, any>
    if (typeof quest.id !== 'string' || typeof quest.npcId !== 'string' || typeof quest.targetItemId !== 'string') return null

    const validTypes = ['delivery', 'fishing', 'mining', 'gathering', 'special_order', 'cooking', 'errand', 'festival_prep']
    const validCategories = ['gathering', 'cooking', 'fishing', 'errand', 'festival_prep']
    const validStages = ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family']

    return {
      id: quest.id,
      type: validTypes.includes(quest.type) ? quest.type : 'delivery',
      npcId: quest.npcId,
      npcName: typeof quest.npcName === 'string' ? quest.npcName : quest.npcId,
      description: typeof quest.description === 'string' ? quest.description : '未命名委托',
      targetItemId: quest.targetItemId,
      targetItemName: typeof quest.targetItemName === 'string' ? quest.targetItemName : quest.targetItemId,
      targetQuantity: Math.max(1, Number(quest.targetQuantity) || 1),
      collectedQuantity: Math.max(0, Number(quest.collectedQuantity) || 0),
      moneyReward: Math.max(0, Number(quest.moneyReward) || 0),
      friendshipReward: Number(quest.friendshipReward) || 0,
      daysRemaining: Math.max(1, Number(quest.daysRemaining) || 1),
      accepted: !!quest.accepted,
      sourceCategory: validCategories.includes(quest.sourceCategory) ? quest.sourceCategory : undefined,
      relationshipStageRequired: validStages.includes(quest.relationshipStageRequired) ? quest.relationshipStageRequired : undefined,
      itemReward: Array.isArray(quest.itemReward)
        ? quest.itemReward
            .filter((item: any) => item && typeof item.itemId === 'string')
            .map((item: any) => ({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) || 1) }))
        : undefined,
      recipeReward: Array.isArray(quest.recipeReward) ? quest.recipeReward.filter((id: unknown) => typeof id === 'string') : undefined,
      buildingClueId: typeof quest.buildingClueId === 'string' ? quest.buildingClueId : undefined,
      buildingClueText: typeof quest.buildingClueText === 'string' ? quest.buildingClueText : undefined,
      bonusSummary: Array.isArray(quest.bonusSummary) ? quest.bonusSummary.filter((text: unknown) => typeof text === 'string') : undefined,
      tierLabel: typeof quest.tierLabel === 'string' ? quest.tierLabel : undefined,
      themeTag: quest.themeTag === 'breeding' || quest.themeTag === 'fishpond' ? quest.themeTag : undefined,
      demandHint: typeof quest.demandHint === 'string' ? quest.demandHint : undefined,
      recommendedHybridIds: Array.isArray(quest.recommendedHybridIds)
        ? quest.recommendedHybridIds.filter((id: unknown) => typeof id === 'string')
        : undefined,
      preferredSeasons: Array.isArray(quest.preferredSeasons)
        ? quest.preferredSeasons.filter((season: unknown) => typeof season === 'string') as Season[]
        : undefined,
      requirementSummary: Array.isArray(quest.requirementSummary)
        ? quest.requirementSummary.filter((text: unknown) => typeof text === 'string')
        : undefined,
      requiredHybridId: typeof quest.requiredHybridId === 'string' ? quest.requiredHybridId : undefined,
      requiredSweetnessMin: Number.isFinite(Number(quest.requiredSweetnessMin)) ? Number(quest.requiredSweetnessMin) : undefined,
      requiredYieldMin: Number.isFinite(Number(quest.requiredYieldMin)) ? Number(quest.requiredYieldMin) : undefined,
      requiredResistanceMin: Number.isFinite(Number(quest.requiredResistanceMin)) ? Number(quest.requiredResistanceMin) : undefined,
      requiredGenerationMin: Number.isFinite(Number(quest.requiredGenerationMin)) ? Number(quest.requiredGenerationMin) : undefined,
      requiredParentCropIds: Array.isArray(quest.requiredParentCropIds)
        ? quest.requiredParentCropIds.filter((id: unknown) => typeof id === 'string')
        : undefined,
      deliveryMode: quest.deliveryMode === 'pond' ? 'pond' : quest.deliveryMode === 'inventory' ? 'inventory' : undefined,
      requiredPondGenerationMin: Number.isFinite(Number(quest.requiredPondGenerationMin)) ? Number(quest.requiredPondGenerationMin) : undefined,
      requiredFishMature: quest.requiredFishMature === true ? true : undefined,
      requiredFishHealthy: quest.requiredFishHealthy === true ? true : undefined,
      isUrgent: quest.isUrgent === true ? true : undefined
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    boardQuests.value = (Array.isArray(data?.boardQuests) ? data.boardQuests : []).map(normalizeQuestInstance).filter((quest): quest is QuestInstance => quest !== null)
    activeQuests.value = (Array.isArray(data?.activeQuests) ? data.activeQuests : []).map(normalizeQuestInstance).filter((quest): quest is QuestInstance => quest !== null)
    completedQuestCount.value = data.completedQuestCount ?? 0
    specialOrder.value = normalizeQuestInstance((data as Record<string, unknown>).specialOrder ?? null)
    mainQuest.value = (() => {
      const rawMainQuest = (data as Record<string, unknown>).mainQuest as Record<string, any> | null | undefined
      if (!rawMainQuest || typeof rawMainQuest !== 'object' || typeof rawMainQuest.questId !== 'string') return null
      const normalized = {
        questId: rawMainQuest.questId,
        accepted: !!rawMainQuest.accepted,
        objectiveProgress: Array.isArray(rawMainQuest.objectiveProgress)
          ? rawMainQuest.objectiveProgress.map((progress: unknown) => !!progress)
          : []
      } as MainQuestState
      return getStoryQuestById(normalized.questId) ? normalized : null
    })()
    completedMainQuests.value = Array.isArray((data as Record<string, unknown>).completedMainQuests)
      ? ((data as Record<string, unknown>).completedMainQuests as unknown[]).filter((id): id is string => typeof id === 'string')
      : []
    // 加载后初始化主线任务（兼容旧存档）
    initMainQuest()
  }

  return {
    boardQuests,
    activeQuests,
    completedQuestCount,
    specialOrder,
    mainQuest,
    completedMainQuests,
    MAX_ACTIVE_QUESTS,
    generateDailyQuests,
    generateSpecialOrder,
    getSpecialOrderBaseline,
    acceptQuest,
    acceptSpecialOrder,
    submitQuest,
    getQuestEffectiveProgress,
    canSubmitQuest,
    onItemObtained,
    dailyUpdate,
    hasActiveQuestFor,
    initMainQuest,
    acceptMainQuest,
    updateMainQuestProgress,
    canSubmitMainQuest,
    submitMainQuest,
    serialize,
    deserialize
  }
})
