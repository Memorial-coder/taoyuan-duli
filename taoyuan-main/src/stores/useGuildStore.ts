import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  MONSTER_GOALS,
  GUILD_SHOP_ITEMS,
  GUILD_DONATIONS,
  GUILD_LEVELS,
  GUILD_BONUS_PER_LEVEL,
  GUILD_SEASON_TUNING_CONFIG,
  GUILD_SEASON_ACTIVITY_TRACKS,
  GUILD_SEASON_REWARD_POOLS,
  GUILD_WORLD_MILESTONES
} from '@/data/guild'
import type { GuildGoalSummary, GuildRankBand, GuildSeasonOverview, GuildSeasonPhase, GuildSeasonState } from '@/types'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { useGoalStore } from './useGoalStore'
import { addLog } from '@/composables/useGameLog'

type GuildQuestMarketCategory = 'processed' | 'animal_product' | 'ore' | 'gem'

const dedupeList = <T,>(items: T[]): T[] => Array.from(new Set(items))

const GUILD_PHASE_TO_QUEST_MARKET_CATEGORIES: Record<GuildSeasonPhase, GuildQuestMarketCategory[]> = {
  p0_commission: ['processed', 'animal_product'],
  p1_ranked_hunt: ['ore', 'gem'],
  p2_world_milestone: ['ore', 'gem', 'processed']
}

const GUILD_PHASE_TO_QUEST_TYPES: Record<GuildSeasonPhase, Array<'delivery' | 'gathering' | 'mining'>> = {
  p0_commission: ['delivery', 'gathering'],
  p1_ranked_hunt: ['mining', 'gathering'],
  p2_world_milestone: ['mining', 'delivery']
}

const GUILD_RANK_BAND_LABELS: Record<GuildRankBand, string> = {
  novice: '新秀',
  veteran: '资深',
  elite: '精英',
  legend: '传奇'
}

export const useGuildStore = defineStore('guild', () => {
  const goalStore = useGoalStore()
  const guildSeasonTuning = GUILD_SEASON_TUNING_CONFIG
  const guildFeatureFlags = guildSeasonTuning.featureFlags
  const guildDisplayConfig = guildSeasonTuning.display
  const guildProgressionConfig = guildSeasonTuning.progression
  const guildRewardConfig = guildSeasonTuning.rewards
  const guildOperationsConfig = guildSeasonTuning.operations
  /** 按怪物ID记录击杀数 */
  const monsterKills = ref<Record<string, number>>({})

  /** 已领取奖励的讨伐目标monsterId集合 */
  const claimedGoals = ref<string[]>([])

  /** 已遭遇过的怪物ID集合（用于图鉴） */
  const encounteredMonsters = ref<string[]>([])

  /** 贡献点（可消费货币） */
  const contributionPoints = ref(0)

  /** 公会经验（隐性） */
  const guildExp = ref(0)

  /** 公会等级（显性） */
  const guildLevel = ref(0)

  /** 每日限购追踪：{ itemId: 今日已购次数 } */
  const dailyPurchases = ref<Record<string, number>>({})

  /** 上次重置日限购的天编号 */
  const lastResetDay = ref(-1)

  /** 每周限购追踪：{ itemId: 本周已购次数 } */
  const weeklyPurchases = ref<Record<string, number>>({})

  /** 上次重置周限购的周编号 */
  const lastResetWeek = ref(-1)

  /** 永久总购买数追踪：{ itemId: 累计已购次数 } */
  const totalPurchases = ref<Record<string, number>>({})
  const guildActionLocks = ref<string[]>([])

  /** WS07/T062：赛季化存档状态 */
  const seasonState = ref<GuildSeasonState>({
    saveVersion: 1,
    currentSeasonId: '',
    currentPhase: 'p0_commission',
    asyncRankScore: 0,
    rankBand: 'novice',
    lastSnapshotWeekId: '',
    snapshots: []
  })

  /** 记录击杀 */
  const recordKill = (monsterId: string) => {
    monsterKills.value[monsterId] = (monsterKills.value[monsterId] ?? 0) + 1
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 记录遭遇（进入战斗时调用，不管是否击杀） */
  const recordEncounter = (monsterId: string) => {
    if (!encounteredMonsters.value.includes(monsterId)) {
      encounteredMonsters.value.push(monsterId)
    }
  }

  /** 获取某怪物击杀数 */
  const getKillCount = (monsterId: string): number => {
    return monsterKills.value[monsterId] ?? 0
  }

  /** 是否已遭遇某怪物 */
  const isEncountered = (monsterId: string): boolean => {
    return encounteredMonsters.value.includes(monsterId)
  }

  /** 已完成的讨伐目标数 */
  const completedGoalCount = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget).length
  })

  /** 可领取奖励的目标 */
  const claimableGoals = computed(() => {
    return MONSTER_GOALS.filter(g => (monsterKills.value[g.monsterId] ?? 0) >= g.killTarget && !claimedGoals.value.includes(g.monsterId))
  })

  const goalSummaries = computed<GuildGoalSummary[]>(() => {
    return MONSTER_GOALS.map(goal => ({
      monsterId: goal.monsterId,
      monsterName: goal.monsterName,
      zone: goal.zone,
      killTarget: goal.killTarget,
      currentKills: monsterKills.value[goal.monsterId] ?? 0,
      completed: (monsterKills.value[goal.monsterId] ?? 0) >= goal.killTarget,
      claimed: claimedGoals.value.includes(goal.monsterId),
      claimable: (monsterKills.value[goal.monsterId] ?? 0) >= goal.killTarget && !claimedGoals.value.includes(goal.monsterId)
    }))
  })

  const seasonOverview = computed<GuildSeasonOverview>(() => ({
    currentSeasonId: seasonState.value.currentSeasonId,
    currentPhase: seasonState.value.currentPhase,
    asyncRankScore: seasonState.value.asyncRankScore,
    rankBand: seasonState.value.rankBand,
    snapshotCount: seasonState.value.snapshots.length,
    completedGoalCount: completedGoalCount.value,
    claimableGoalCount: claimableGoals.value.length,
    contributionPoints: contributionPoints.value,
    guildLevel: guildLevel.value
  }))

  const currentThemeWeekGuildFocus = computed(() => {
    if (!guildFeatureFlags.themeWeekFocusEnabled) return null
    const themeWeek = goalStore.currentThemeWeek
    if (!themeWeek) return null
    return {
      id: themeWeek.id,
      name: themeWeek.name,
      summaryLabel: themeWeek.ui?.summaryLabel ?? themeWeek.name,
      activityIds: themeWeek.guildFocusActivityIds ?? [],
      milestoneIds: themeWeek.guildFocusMilestoneIds ?? [],
      rewardPoolIds: themeWeek.guildFocusRewardPoolIds ?? []
    }
  })

  const featuredSeasonActivities = computed(() => {
    const focusedActivityIds = new Set(currentThemeWeekGuildFocus.value?.activityIds ?? [])
    return [...GUILD_SEASON_ACTIVITY_TRACKS]
      .filter(activity => activity.phase === seasonState.value.currentPhase || focusedActivityIds.has(activity.id))
      .sort((left, right) => {
        const leftWeight = (focusedActivityIds.has(left.id) ? 2 : 0) + (left.phase === seasonState.value.currentPhase ? 1 : 0)
        const rightWeight = (focusedActivityIds.has(right.id) ? 2 : 0) + (right.phase === seasonState.value.currentPhase ? 1 : 0)
        return rightWeight - leftWeight
      })
      .slice(0, Math.max(1, guildDisplayConfig.featuredActivityLimit))
  })

  const featuredSeasonMilestones = computed(() => {
    const focusedMilestoneIds = new Set(currentThemeWeekGuildFocus.value?.milestoneIds ?? [])
    return [...GUILD_WORLD_MILESTONES]
      .filter(milestone => milestone.phase === seasonState.value.currentPhase || focusedMilestoneIds.has(milestone.id))
      .sort((left, right) => {
        const leftWeight = (focusedMilestoneIds.has(left.id) ? 2 : 0) + (left.phase === seasonState.value.currentPhase ? 1 : 0)
        const rightWeight = (focusedMilestoneIds.has(right.id) ? 2 : 0) + (right.phase === seasonState.value.currentPhase ? 1 : 0)
        return rightWeight - leftWeight
      })
      .slice(0, Math.max(1, guildDisplayConfig.featuredMilestoneLimit))
  })

  const activeRewardPoolOverview = computed(() => {
    if (!guildFeatureFlags.rewardPoolFocusEnabled) return null
    const focusedRewardPoolIds = new Set(currentThemeWeekGuildFocus.value?.rewardPoolIds ?? [])
    return (
      [...GUILD_SEASON_REWARD_POOLS].sort((left, right) => {
        const leftWeight = (focusedRewardPoolIds.has(left.id) ? 2 : 0) + (left.phase === seasonState.value.currentPhase ? 1 : 0)
        const rightWeight = (focusedRewardPoolIds.has(right.id) ? 2 : 0) + (right.phase === seasonState.value.currentPhase ? 1 : 0)
        return rightWeight - leftWeight
      })[0] ?? null
    )
  })

  const guildAchievementProgress = computed(() => {
    const current = completedGoalCount.value
    const nextTarget = [5, 21].find(target => target > current) ?? null
    return {
      current,
      nextTarget,
      completedLegendThreshold: current >= 21
    }
  })

  const questBoardBiasProfile = computed(() => {
    if (!guildFeatureFlags.questBoardBiasEnabled) {
      return {
        preferredMarketCategories: [] as GuildQuestMarketCategory[],
        preferredQuestTypes: [] as Array<'delivery' | 'gathering' | 'mining'>,
        preferredVillagerCategory: null as 'gathering' | 'cooking' | null,
        biasStrength: 0,
        boardHint: '',
        specialOrderHint: '',
        focusedActivityTitles: [] as string[],
        activeRewardPoolLabel: null as string | null
      }
    }

    const phaseCategories = GUILD_PHASE_TO_QUEST_MARKET_CATEGORIES[seasonState.value.currentPhase] ?? []
    const focusedActivityCategories = featuredSeasonActivities.value.flatMap(activity => {
      if (activity.id === 'commission_supply_week') return ['processed', 'animal_product'] as GuildQuestMarketCategory[]
      if (activity.id === 'border_patrol_rotation') return ['processed', 'ore'] as GuildQuestMarketCategory[]
      if (activity.id === 'ranked_hunt_board') return ['ore', 'gem'] as GuildQuestMarketCategory[]
      if (activity.id === 'elite_logistics_auction') return ['ore', 'processed'] as GuildQuestMarketCategory[]
      if (activity.id === 'world_milestone_fortress') return ['processed', 'gem'] as GuildQuestMarketCategory[]
      if (activity.id === 'abyss_boss_campaign') return ['ore', 'gem'] as GuildQuestMarketCategory[]
      return [] as GuildQuestMarketCategory[]
    })

    const preferredMarketCategories = dedupeList<GuildQuestMarketCategory>([...phaseCategories, ...focusedActivityCategories])
    const preferredQuestTypes = dedupeList(GUILD_PHASE_TO_QUEST_TYPES[seasonState.value.currentPhase] ?? [])
    const preferredVillagerCategory =
      preferredMarketCategories.includes('ore') || preferredMarketCategories.includes('gem')
        ? 'gathering'
        : preferredMarketCategories.includes('processed') || preferredMarketCategories.includes('animal_product')
          ? 'cooking'
          : null

    const featuredLabels = featuredSeasonActivities.value.slice(0, Math.max(1, guildDisplayConfig.focusedActivityTitleLimit)).map(activity => activity.title)
    const activeRewardPoolLabel = activeRewardPoolOverview.value?.label
    const focusedActivityBiasBonus = Math.max(0, guildOperationsConfig.focusedActivityCategoryWeight - 1) * featuredLabels.length
    const biasStrength = Math.min(
      guildOperationsConfig.maxQuestBiasStrength,
      preferredMarketCategories.length +
        focusedActivityBiasBonus +
        (claimableGoals.value.length > 0 ? guildOperationsConfig.claimableGoalBiasBonus : 0) +
        (activeRewardPoolOverview.value ? guildOperationsConfig.activeRewardPoolBiasBonus : 0)
    )

    return {
      preferredMarketCategories,
      preferredQuestTypes,
      preferredVillagerCategory,
      biasStrength,
      boardHint:
        featuredLabels.length > 0
          ? `【公会联动】当前赛季「${currentThemeWeekGuildFocus.value?.summaryLabel ?? seasonState.value.currentPhase}」更关注${featuredLabels.join('、')}，告示板会追加战备与讨伐筹备需求。`
          : '',
      specialOrderHint:
        activeRewardPoolLabel
          ? `公会联动：当前奖励池为「${activeRewardPoolLabel}」，高阶订单会更偏向矿材、补给与共建筹备。`
          : '',
      focusedActivityTitles: featuredLabels,
      activeRewardPoolLabel
    }
  })

  const crossSystemOverview = computed(() => {
    if (!guildFeatureFlags.crossSystemOverviewEnabled) {
      return {
        themeWeekFocus: null,
        featuredSeasonActivities: [] as typeof featuredSeasonActivities.value,
        featuredMilestones: [] as typeof featuredSeasonMilestones.value,
        activeRewardPool: null,
        questBoardBiasProfile: questBoardBiasProfile.value,
        guildAchievementProgress: guildAchievementProgress.value,
        recommendedActions: [] as string[],
        currentRankBandLabel: GUILD_RANK_BAND_LABELS[seasonState.value.rankBand]
      }
    }

    const recommendedActions: string[] = []
    if (claimableGoals.value.length > 0) {
      recommendedActions.push(`优先领取 ${claimableGoals.value.length} 个公会讨伐奖励，把击杀成果转成贡献点与周战备。`)
    }
    if (featuredSeasonActivities.value.length > 0) {
      recommendedActions.push(`本周重点跟进 ${featuredSeasonActivities.value.slice(0, 2).map(activity => activity.title).join('、')}，把矿洞推进和委托筹备串成一条周循环。`)
    }
    if (activeRewardPoolOverview.value) {
      recommendedActions.push(`围绕「${activeRewardPoolOverview.value.label}」准备矿材、补给与贡献点，可更稳地承接赛季奖励池。`)
    }
    if (guildAchievementProgress.value.nextTarget) {
      recommendedActions.push(`距离下一档公会成就还差 ${Math.max(0, guildAchievementProgress.value.nextTarget - guildAchievementProgress.value.current)} 个讨伐目标，可同步推进图鉴与荣誉展示。`)
    }

    return {
      themeWeekFocus: currentThemeWeekGuildFocus.value,
      featuredSeasonActivities: featuredSeasonActivities.value,
      featuredMilestones: featuredSeasonMilestones.value,
      activeRewardPool: activeRewardPoolOverview.value,
      questBoardBiasProfile: questBoardBiasProfile.value,
      guildAchievementProgress: guildAchievementProgress.value,
      recommendedActions: dedupeList(recommendedActions).slice(0, Math.max(1, guildDisplayConfig.recommendedActionLimit)),
      currentRankBandLabel: GUILD_RANK_BAND_LABELS[seasonState.value.rankBand]
    }
  })

  const beginGuildAction = (lockId: string): boolean => {
    if (!guildFeatureFlags.guildActionGuardEnabled) return true
    if (guildActionLocks.value.includes(lockId)) return false
    guildActionLocks.value = [...guildActionLocks.value, lockId]
    return true
  }

  const finishGuildAction = (lockId: string) => {
    if (!guildFeatureFlags.guildActionGuardEnabled) return
    guildActionLocks.value = guildActionLocks.value.filter(entry => entry !== lockId)
  }

  const resolveSeasonPhase = (weekOfSeason: number): GuildSeasonPhase => {
    if (weekOfSeason >= guildProgressionConfig.phaseSwitchWeekP2) return 'p2_world_milestone'
    if (weekOfSeason >= guildProgressionConfig.phaseSwitchWeekP1) return 'p1_ranked_hunt'
    return 'p0_commission'
  }

  const resolveRankBand = (score: number): GuildRankBand => {
    if (score >= guildProgressionConfig.legendRankMinScore) return 'legend'
    if (score >= guildProgressionConfig.eliteRankMinScore) return 'elite'
    if (score >= guildProgressionConfig.veteranRankMinScore) return 'veteran'
    return 'novice'
  }

  const buildAsyncRankScore = () => {
    const bossClears = goalSummaries.value.filter(goal => goal.zone === 'boss' && goal.claimed).length
    return Math.round(
      contributionPoints.value * guildProgressionConfig.asyncScoreContributionWeight +
        guildExp.value * guildProgressionConfig.asyncScoreGuildExpWeight +
        claimedGoals.value.length * guildProgressionConfig.asyncScoreClaimedGoalWeight +
        bossClears * guildProgressionConfig.asyncScoreBossClearWeight +
        guildLevel.value * guildProgressionConfig.asyncScoreGuildLevelWeight
    )
  }

  /** 领取讨伐奖励 */
  const claimGoal = (monsterId: string): boolean => {
    const lockId = `claimGoal:${monsterId}`
    if (!beginGuildAction(lockId)) return false

    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const playerSnapshot = playerStore.serialize()
    const inventorySnapshot = inventoryStore.serialize()
    const guildSnapshot = serialize()

    const goal = MONSTER_GOALS.find(g => g.monsterId === monsterId)
    try {
      if (!goal) return false
      if ((monsterKills.value[monsterId] ?? 0) < goal.killTarget) return false
      if (claimedGoals.value.includes(monsterId)) return false

      const rewardItems = (goal.reward.items ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
      if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
        addLog('背包空间不足，无法领取讨伐奖励。')
        return false
      }

      if (goal.reward.money) {
        playerStore.earnMoney(goal.reward.money)
      }
      if (goal.reward.items) {
        inventoryStore.addItemsExact(rewardItems)
      }
      // 讨伐奖励只给贡献点，不增加公会经验（只有捐献增加经验）
      const moneyContributionBonus = Math.floor((goal.reward.money ?? 0) / Math.max(1, guildRewardConfig.claimGoalContributionMoneyDivisor))
      const bonusPoints = Math.max(
        1,
        Math.round(
          (moneyContributionBonus + goal.killTarget * guildRewardConfig.claimGoalContributionKillTargetWeight) *
            guildRewardConfig.claimGoalContributionBonusMultiplier
        )
      )
      contributionPoints.value += bonusPoints
      claimedGoals.value.push(monsterId)
      addLog(`领取讨伐奖励，额外获得 ${bonusPoints} 贡献点。`)
      return true
    } catch {
      playerStore.deserialize(playerSnapshot)
      inventoryStore.deserialize(inventorySnapshot)
      deserialize(guildSnapshot)
      return false
    } finally {
      finishGuildAction(lockId)
    }
  }

  // ==================== 公会等级 ====================

  /** 计算当前游戏天编号 */
  const getCurrentDay = (): number => {
    const gameStore = useGameStore()
    const seasonIndex = ['spring', 'summer', 'autumn', 'winter'].indexOf(gameStore.season)
    return (gameStore.year - 1) * 112 + seasonIndex * 28 + gameStore.day
  }

  /** 确保每日限购已重置 */
  const ensureDailyReset = () => {
    const day = getCurrentDay()
    if (day !== lastResetDay.value) {
      dailyPurchases.value = {}
      lastResetDay.value = day
    }
  }

  /** 计算当前游戏周编号 */
  const getCurrentWeek = (): number => {
    return Math.floor((getCurrentDay() - 1) / 7)
  }

  /** 确保每周限购已重置 */
  const ensureWeeklyReset = () => {
    const week = getCurrentWeek()
    if (week !== lastResetWeek.value) {
      weeklyPurchases.value = {}
      lastResetWeek.value = week
    }
  }

  /** 检查升级 */
  const checkLevelUp = () => {
    while (guildLevel.value < GUILD_LEVELS.length) {
      const next = GUILD_LEVELS[guildLevel.value]
      if (!next || guildExp.value < next.expRequired) break
      guildLevel.value++
      addLog(`冒险家公会等级提升到 ${guildLevel.value} 级！`)
    }
  }

  /** 捐献物品 */
  const donateItem = (itemId: string, quantity: number): { success: boolean; pointsGained: number } => {
    const lockId = `donate:${itemId}`
    if (!beginGuildAction(lockId)) return { success: false, pointsGained: 0 }

    const donation = GUILD_DONATIONS.find(d => d.itemId === itemId)
    const inventoryStore = useInventoryStore()
    const inventorySnapshot = inventoryStore.serialize()
    const guildSnapshot = serialize()

    try {
      if (!donation) return { success: false, pointsGained: 0 }
      const available = inventoryStore.getItemCount(itemId)
      const actual = Math.min(quantity, available)
      if (actual <= 0) return { success: false, pointsGained: 0 }
      if (!inventoryStore.removeItem(itemId, actual)) return { success: false, pointsGained: 0 }
      const points = Math.max(1, Math.round(donation.points * actual * guildRewardConfig.donationContributionMultiplier))
      contributionPoints.value += points
      guildExp.value += Math.max(0, Math.round(points * guildRewardConfig.donationGuildExpMultiplier))
      checkLevelUp()
      return { success: true, pointsGained: points }
    } catch {
      inventoryStore.deserialize(inventorySnapshot)
      deserialize(guildSnapshot)
      return { success: false, pointsGained: 0 }
    } finally {
      finishGuildAction(lockId)
    }
  }

  /** 获取今日剩余购买次数 */
  const getDailyRemaining = (itemId: string, dailyLimit: number): number => {
    ensureDailyReset()
    return dailyLimit - (dailyPurchases.value[itemId] ?? 0)
  }

  /** 获取本周剩余购买次数 */
  const getWeeklyRemaining = (itemId: string, weeklyLimit: number): number => {
    ensureWeeklyReset()
    return weeklyLimit - (weeklyPurchases.value[itemId] ?? 0)
  }

  /** 获取永久剩余购买次数 */
  const getTotalRemaining = (itemId: string, totalLimit: number): number => {
    return totalLimit - (totalPurchases.value[itemId] ?? 0)
  }

  /** 获取公会等级被动攻击加成 */
  const getGuildAttackBonus = (): number => {
    return guildLevel.value * GUILD_BONUS_PER_LEVEL.attack
  }

  /** 获取公会等级被动HP加成 */
  const getGuildHpBonus = (): number => {
    return guildLevel.value * GUILD_BONUS_PER_LEVEL.maxHp
  }

  // ==================== 商店 ====================

  /** 公会商店：检查物品是否已解锁 */
  const isShopItemUnlocked = (itemId: string): boolean => {
    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) return false
    if (!item.unlockGuildLevel) return true
    return guildLevel.value >= item.unlockGuildLevel
  }

  /** 公会商店：购买物品 */
  const buyShopItem = (itemId: string): boolean => {
    const lockId = `buyShopItem:${itemId}`
    if (!beginGuildAction(lockId)) return false

    const item = GUILD_SHOP_ITEMS.find(i => i.itemId === itemId)
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const playerSnapshot = playerStore.serialize()
    const inventorySnapshot = inventoryStore.serialize()
    const guildSnapshot = serialize()

    try {
      if (!item) return false
      if (!isShopItemUnlocked(itemId)) return false

      // 每日限购检查
      if (item.dailyLimit) {
        ensureDailyReset()
        if ((dailyPurchases.value[itemId] ?? 0) >= item.dailyLimit) return false
      }

      // 每周限购检查
      if (item.weeklyLimit) {
        ensureWeeklyReset()
        if ((weeklyPurchases.value[itemId] ?? 0) >= item.weeklyLimit) return false
      }

      // 永久总限购检查
      if (item.totalLimit) {
        if ((totalPurchases.value[itemId] ?? 0) >= item.totalLimit) return false
      }

      // 检查材料是否足够
      if (item.materials) {
        for (const mat of item.materials) {
          if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
        }
      }

      // 永久品用贡献点，消耗品用铜钱
      if (item.contributionCost) {
        if (contributionPoints.value < item.contributionCost) return false
        contributionPoints.value -= item.contributionCost
      } else {
        if (playerStore.money < item.price) return false
        playerStore.spendMoney(item.price)
      }

      // 扣除材料
      if (item.materials) {
        for (const mat of item.materials) {
          if (!inventoryStore.removeItem(mat.itemId, mat.quantity)) {
            throw new Error(`failed to remove material: ${mat.itemId}`)
          }
        }
      }

      // 根据装备类型添加到对应栏位
      let addSuccess = true
      if (item.equipType === 'weapon') {
        addSuccess = inventoryStore.addWeapon(item.itemId, null)
      } else if (item.equipType === 'ring') {
        addSuccess = inventoryStore.addRing(item.itemId)
      } else if (item.equipType === 'hat') {
        addSuccess = inventoryStore.addHat(item.itemId)
      } else if (item.equipType === 'shoe') {
        addSuccess = inventoryStore.addShoe(item.itemId)
      } else {
        addSuccess = inventoryStore.addItemExact(item.itemId, 1)
      }

      if (!addSuccess) {
        throw new Error(`failed to grant guild shop item: ${item.itemId}`)
      }

      // 记录限购
      if (item.dailyLimit) {
        dailyPurchases.value[itemId] = (dailyPurchases.value[itemId] ?? 0) + 1
      }
      if (item.weeklyLimit) {
        weeklyPurchases.value[itemId] = (weeklyPurchases.value[itemId] ?? 0) + 1
      }
      if (item.totalLimit) {
        totalPurchases.value[itemId] = (totalPurchases.value[itemId] ?? 0) + 1
      }
      addLog(`在公会商店购买了「${item.name}」。`)
      return true
    } catch {
      playerStore.deserialize(playerSnapshot)
      inventoryStore.deserialize(inventorySnapshot)
      deserialize(guildSnapshot)
      return false
    } finally {
      finishGuildAction(lockId)
    }
  }

  const updateSeasonState = (patch: Partial<GuildSeasonState>) => {
    seasonState.value = {
      ...seasonState.value,
      ...patch,
      snapshots: patch.snapshots ?? seasonState.value.snapshots
    }
  }

  const addSeasonSnapshot = (snapshot: GuildSeasonState['snapshots'][number]) => {
    seasonState.value = {
      ...seasonState.value,
      lastSnapshotWeekId: snapshot.weekId,
      snapshots: [...seasonState.value.snapshots, snapshot]
    }
  }

  const getGoalSummary = (monsterId: string) => goalSummaries.value.find(goal => goal.monsterId === monsterId)
  const getGoalsByZone = (zone: string) => goalSummaries.value.filter(goal => goal.zone === zone)

  const processSeasonTick = (payload: {
    currentSeasonId: string
    previousSeasonId: string
    currentWeekId: string
    previousWeekId: string
    weekOfSeason: number
    startedNewWeek: boolean
  }) => {
    const logs: string[] = []
    const nextPhase = resolveSeasonPhase(payload.weekOfSeason)
    const nextAsyncRankScore = buildAsyncRankScore()
    const nextRankBand = resolveRankBand(nextAsyncRankScore)
    const seasonChanged = seasonState.value.currentSeasonId !== payload.currentSeasonId

    updateSeasonState({
      currentSeasonId: payload.currentSeasonId,
      currentPhase: nextPhase,
      asyncRankScore: nextAsyncRankScore,
      rankBand: nextRankBand
    })

    if (payload.startedNewWeek) {
      if (seasonState.value.lastSnapshotWeekId !== payload.previousWeekId) {
        const bossClears = goalSummaries.value.filter(goal => goal.zone === 'boss' && goal.claimed).length
        addSeasonSnapshot({
          seasonId: payload.previousSeasonId || payload.currentSeasonId,
          weekId: payload.previousWeekId,
          contributionGained: Math.max(0, guildExp.value),
          goalClaims: claimedGoals.value.length,
          bossClears,
          rankBand: nextRankBand
        })
      }
      weeklyPurchases.value = {}
      lastResetWeek.value = getCurrentWeek()
      logs.push(`【公会赛季】进入新一周：当前阶段为${nextPhase}，异步荣誉档位为${nextRankBand}。`)
    }

    if (seasonChanged) {
      logs.push(`【公会赛季】新的公会赛季 ${payload.currentSeasonId} 已开启。`)
    }

    for (const message of logs) {
      addLog(message, {
        category: 'guild',
        tags: ['guild_season_tick', 'late_game_cycle'],
        meta: {
          currentSeasonId: payload.currentSeasonId,
          currentWeekId: payload.currentWeekId,
          rankBand: nextRankBand,
          phase: nextPhase
        }
      })
    }

    return {
      logs,
      asyncRankScore: nextAsyncRankScore,
      rankBand: nextRankBand,
      phase: nextPhase
    }
  }

  /** 序列化 */
  const serialize = () => ({
    monsterKills: { ...monsterKills.value },
    claimedGoals: [...claimedGoals.value],
    encounteredMonsters: [...encounteredMonsters.value],
    contributionPoints: contributionPoints.value,
    guildExp: guildExp.value,
    guildLevel: guildLevel.value,
    dailyPurchases: { ...dailyPurchases.value },
    lastResetDay: lastResetDay.value,
    weeklyPurchases: { ...weeklyPurchases.value },
    lastResetWeek: lastResetWeek.value,
    totalPurchases: { ...totalPurchases.value },
    seasonState: {
      ...seasonState.value,
      snapshots: [...seasonState.value.snapshots]
    }
  })

  /** 反序列化 */
  const deserialize = (data: ReturnType<typeof serialize>) => {
    monsterKills.value = data.monsterKills ?? {}
    claimedGoals.value = data.claimedGoals ?? []
    encounteredMonsters.value = data.encounteredMonsters ?? []
    dailyPurchases.value = ((data as Record<string, unknown>).dailyPurchases as Record<string, number>) ?? {}
    lastResetDay.value = ((data as Record<string, unknown>).lastResetDay as number) ?? -1
    weeklyPurchases.value = ((data as Record<string, unknown>).weeklyPurchases as Record<string, number>) ?? {}
    lastResetWeek.value = ((data as Record<string, unknown>).lastResetWeek as number) ?? -1
    totalPurchases.value = ((data as Record<string, unknown>).totalPurchases as Record<string, number>) ?? {}

    // 旧存档迁移：如果没有贡献点字段但有已领取的讨伐目标，补发贡献点（不补经验，经验只来自捐献）
    const isOldSave = !('contributionPoints' in data)
    if (isOldSave && claimedGoals.value.length > 0) {
      let migratedPoints = 0
      for (const monsterId of claimedGoals.value) {
        const goal = MONSTER_GOALS.find(g => g.monsterId === monsterId)
        if (goal) {
          migratedPoints += Math.floor((goal.reward.money ?? 0) / 20) + goal.killTarget
        }
      }
      contributionPoints.value = migratedPoints
      guildExp.value = 0
      guildLevel.value = 0
    } else {
      contributionPoints.value = ((data as Record<string, unknown>).contributionPoints as number) ?? 0
      guildExp.value = ((data as Record<string, unknown>).guildExp as number) ?? 0
      guildLevel.value = ((data as Record<string, unknown>).guildLevel as number) ?? 0
    }

    const rawSeasonState = (data as Record<string, unknown>).seasonState as Partial<GuildSeasonState> | undefined
    seasonState.value = {
      saveVersion: rawSeasonState?.saveVersion ?? 1,
      currentSeasonId: rawSeasonState?.currentSeasonId ?? '',
      currentPhase: rawSeasonState?.currentPhase ?? 'p0_commission',
      asyncRankScore: rawSeasonState?.asyncRankScore ?? 0,
      rankBand: rawSeasonState?.rankBand ?? 'novice',
      lastSnapshotWeekId: rawSeasonState?.lastSnapshotWeekId ?? '',
      snapshots: rawSeasonState?.snapshots ?? []
    }
    guildActionLocks.value = []
  }

  return {
    monsterKills,
    claimedGoals,
    encounteredMonsters,
    contributionPoints,
    guildExp,
    guildLevel,
    seasonState,
    seasonOverview,
    currentThemeWeekGuildFocus,
    featuredSeasonActivities,
    featuredSeasonMilestones,
    activeRewardPoolOverview,
    questBoardBiasProfile,
    crossSystemOverview,
    guildAchievementProgress,
    goalSummaries,
    recordKill,
    recordEncounter,
    getKillCount,
    isEncountered,
    completedGoalCount,
    claimableGoals,
    getGoalSummary,
    getGoalsByZone,
    updateSeasonState,
    addSeasonSnapshot,
    processSeasonTick,
    claimGoal,
    donateItem,
    getDailyRemaining,
    getWeeklyRemaining,
    getTotalRemaining,
    getGuildAttackBonus,
    getGuildHpBonus,
    isShopItemUnlocked,
    buyShopItem,
    serialize,
    deserialize
  }
})
