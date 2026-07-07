import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { addLog } from '@/composables/useGameLog'
import {
  QUARRY_COLLECT_STAMINA_COST,
  QUARRY_DEEP_STAMINA_COST,
  QUARRY_GRID_SIZE,
  QUARRY_MINE_FINAL_TRINKET_ID,
  QUARRY_MINE_FINAL_UNLOCK_ID,
  QUARRY_MINE_REFRESH_DAYS,
  QUARRY_MINE_REPEAT_FINAL_REWARDS,
  QUARRY_MIN_GRID_SIZE,
  QUARRY_MONSTER_BASE_EXP,
  QUARRY_MONSTERS,
  QUARRY_NIGHT_MONSTER_ATK_MULT,
  QUARRY_NIGHT_MONSTER_HP_MULT,
  QUARRY_PROJECT_ID,
  QUARRY_ARTIFACT_POOL,
  QUARRY_RARE_TRANSMUTE_UPGRADES,
  QUARRY_REQUIRED_PROJECT_ID,
  QUARRY_RUBBLE_BASE_EXP,
  QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS,
  QUARRY_WEEKLY_STEWARDSHIP_TARGET,
  createDefaultQuarrySaveData,
  createDefaultQuarryMineSaveData,
  createRefreshedQuarryMineNodes,
  createDefaultQuarryWeeklyProgress,
  createEmptyQuarryCellsSized,
  getQuarryDailySpawnCap,
  getQuarryExpansionInfo,
  getQuarryResourceDef,
  normalizeQuarrySaveData,
  seedInitialQuarryCells,
  spawnQuarryDailyResources
} from '@/data/quarry'
import { getQuarryMineElixirPrepOption } from '@/data/eliteElixirPrep'
import { getItemById } from '@/data/items'
import { getWeaponById } from '@/data/weapons'
import type {
  CombatAction,
  QuarryActionResult,
  QuarryCell,
  QuarryCollectResult,
  QuarryCollectRewardEntry,
  QuarryCombatActionResult,
  QuarryMineExploreMode,
  QuarryMineSaveData,
  QuarryMonsterDef,
  QuarrySaveData,
  QuarryUnlockRequirement,
  Season
} from '@/types'
import {
  buildPlayerCombatRuntime,
  calculateIncomingDamage,
  getDefendHeal,
  getEffectiveDamage,
  getExpectedAttackDamage,
  getLifestealHeal,
  rollAttackOutcome
} from '@/utils/combatRuntime'
import { calculateConsumptionReduction, consumeEquipmentDurability } from '@/composables/useDurability'
import { getCombinedItemCount, hasCombinedItems, removeCombinedItems } from '@/composables/useCombinedInventory'
import { getWeekCycleInfo } from '@/utils/weekCycle'
import { useAchievementStore } from './useAchievementStore'
import { useCookingStore } from './useCookingStore'
import { useGameStore } from './useGameStore'
import { useGuildStore } from './useGuildStore'
import { useInventoryStore } from './useInventoryStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { usePotentialStore } from './usePotentialStore'
import { useQuestStore } from './useQuestStore'
import { useGoalStore } from './useGoalStore'
import { useSkillStore } from './useSkillStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { useEquipmentAccessoryStore } from './useEquipmentAccessoryStore'

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
const QUARRY_COMBAT_LOG_LIMIT = 80
const QUARRY_COMBAT_TIME_FAST = 0.08
const QUARRY_COMBAT_TIME_NORMAL = 0.17
const QUARRY_COMBAT_TIME_LONG = 0.25

const cloneCells = (cells: QuarryCell[]): QuarryCell[] => cells.map(cell => ({ ...cell }))
const createExploredEmptyCell = (index: number): QuarryCell => ({
  index,
  state: 'empty',
  kind: 'empty',
  isActiveSite: false,
  revealed: true
})
const isCollectableCell = (cell: QuarryCell): boolean =>
  cell.state === 'rock' ||
  cell.state === 'ore' ||
  cell.state === 'gem' ||
  cell.state === 'wood' ||
  cell.state === 'deep' ||
  cell.state === 'treasure' ||
  cell.state === 'artifact'

const formatRewardLabels = (rewards: QuarryCollectRewardEntry[]): string =>
  rewards
    .map(reward => `${getItemById(reward.itemId)?.name ?? reward.itemId}×${reward.quantity}`)
    .join('、')

const rollQuarryAffixArtifactReward = (): QuarryCollectRewardEntry | null => {
  const totalWeight = QUARRY_ARTIFACT_POOL.reduce((sum, entry) => sum + Math.max(0, entry.chance), 0)
  if (totalWeight <= 0) return null
  let roll = Math.random() * totalWeight
  for (const entry of QUARRY_ARTIFACT_POOL) {
    roll -= Math.max(0, entry.chance)
    if (roll <= 0) return { itemId: entry.itemId, quantity: entry.quantity }
  }
  const fallback = QUARRY_ARTIFACT_POOL[QUARRY_ARTIFACT_POOL.length - 1]
  return fallback ? { itemId: fallback.itemId, quantity: fallback.quantity } : null
}

const parseDayTag = (dayTag: string): { year: number; season: Season; day: number } | null => {
  const [yearText, seasonText, dayText] = dayTag.split('-')
  if (!yearText || !dayText || !SEASONS.includes(seasonText as Season)) return null
  const year = Math.floor(Number(yearText))
  const day = Math.floor(Number(dayText))
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null
  return { year, season: seasonText as Season, day }
}

const getAbsoluteDayIndex = (dayTag: string): number | null => {
  const parsed = parseDayTag(dayTag)
  if (!parsed) return null
  const seasonIndex = SEASONS.indexOf(parsed.season)
  if (seasonIndex < 0) return null
  return (Math.max(1, parsed.year) - 1) * 112 + seasonIndex * 28 + Math.max(1, parsed.day)
}

const getDayDistance = (fromDayTag: string, toDayTag: string): number | null => {
  const from = getAbsoluteDayIndex(fromDayTag)
  const to = getAbsoluteDayIndex(toDayTag)
  if (from === null || to === null) return null
  return to - from
}

const normalizeQuarryMineExploreMode = (mode: QuarryMineExploreMode = 'steady'): QuarryMineExploreMode =>
  mode === 'force' || mode === 'search' ? mode : 'steady'

const getQuarryMineModeStaminaCost = (mode: QuarryMineExploreMode): number => {
  if (mode === 'force') return QUARRY_COLLECT_STAMINA_COST + 1
  if (mode === 'search') return QUARRY_COLLECT_STAMINA_COST + 2
  return QUARRY_COLLECT_STAMINA_COST
}

const buildQuarryMineRewardEntries = (rewards: QuarryCollectRewardEntry[]) =>
  rewards.map(reward => ({ ...reward, quality: 'normal' as const }))

export const useQuarryStore = defineStore('quarry', () => {
  const defaults = createDefaultQuarrySaveData()
  const unlockedAtDayTag = ref(defaults.unlockedAtDayTag)
  const unlockYear = ref(defaults.unlockYear)
  const activeSize = ref(defaults.activeSize)
  const lifetimeClearedCount = ref(defaults.lifetimeClearedCount)
  const deepClearCount = ref(defaults.deepClearCount)
  const cells = ref<QuarryCell[]>(cloneCells(defaults.cells))
  const lastRefreshDayTag = ref(defaults.lastRefreshDayTag)
  const lastDailySpawnedCount = ref(0)
  const weeklyProgress = ref(defaults.weeklyProgress)
  const quarryMine = ref<QuarryMineSaveData>({
    ...defaults.quarryMine,
    nodes: defaults.quarryMine.nodes.map(node => ({ ...node, treasureItems: node.treasureItems?.map(item => ({ ...item })) }))
  })

  const inCombat = ref(false)
  const combatMonster = ref<QuarryMonsterDef | null>(null)
  const combatMonsterHp = ref(0)
  const combatRound = ref(0)
  const combatLog = ref<string[]>([])
  const combatCellIndex = ref(-1)
  const accessoryStore = useEquipmentAccessoryStore()

  watch(
    () => combatLog.value.length,
    length => {
      const overflow = length - QUARRY_COMBAT_LOG_LIMIT
      if (overflow > 0) combatLog.value.splice(0, overflow)
    },
    { flush: 'sync' }
  )

  const gameStore = useGameStore()
  const achievementStore = useAchievementStore()
  const cookingStore = useCookingStore()
  const guildStore = useGuildStore()
  const inventoryStore = useInventoryStore()
  const npcStore = useNpcStore()
  const playerStore = usePlayerStore()
  const potentialStore = usePotentialStore()
  const questStore = useQuestStore()
  const skillStore = useSkillStore()

  const getCurrentDayTag = () => `${gameStore.year}-${gameStore.season}-${gameStore.day}`

  const getWeekKeyForDayTag = (dayTag = getCurrentDayTag()): string => {
    const parsed = parseDayTag(dayTag)
    if (!parsed) return dayTag
    return getWeekCycleInfo(parsed.year, parsed.season, parsed.day).seasonWeekId
  }

  const getMiningMasteryNodeCount = () => skillStore.getSkill('mining').unlockedMasteryNodeIds.length

  const isUnlocked = computed(() => unlockedAtDayTag.value.length > 0)
  const maintenanceActive = computed(() => useVillageProjectStore().isMaintenanceEffectActive(QUARRY_PROJECT_ID))
  const isNight = computed(() => gameStore.timePeriod === 'night' || gameStore.timePeriod === 'late_night')

  const dailySpawnCap = computed(() =>
    getQuarryDailySpawnCap(gameStore.year, unlockYear.value, activeSize.value, {
      maintenanceActive: maintenanceActive.value,
      skullCavernBestFloor: achievementStore.stats.skullCavernBestFloor,
      miningMasteryNodeCount: getMiningMasteryNodeCount()
    })
  )

  const emptyCellCount = computed(() => cells.value.filter(cell => cell.state === 'empty').length)
  const resourceCellCount = computed(() =>
    cells.value.filter(cell => cell.state === 'rock' || cell.state === 'ore' || cell.state === 'gem' || cell.state === 'wood').length
  )
  const surfaceCellCount = computed(() => cells.value.filter(cell => cell.state === 'surface').length)
  const monsterCellCount = computed(() => cells.value.filter(cell => cell.state === 'monster').length)
  const rareCellCount = computed(() =>
    cells.value.filter(cell => cell.state === 'deep' || cell.state === 'treasure' || cell.state === 'artifact').length
  )
  const interactableCellCount = computed(() => resourceCellCount.value + surfaceCellCount.value + monsterCellCount.value + rareCellCount.value)
  const unexploredCellCount = computed(() => 0)
  const exploredCellCount = computed(() => emptyCellCount.value)
  const revealedInteractableCount = computed(() => interactableCellCount.value)
  const totalCellCount = computed(() => activeSize.value * activeSize.value)

  const expansionInfo = computed(() =>
    getQuarryExpansionInfo(
      activeSize.value,
      lifetimeClearedCount.value,
      deepClearCount.value,
      achievementStore.stats.highestMineFloor,
      achievementStore.stats.skullCavernBestFloor,
      skillStore.getSkill('mining').level
    )
  )

  const unlockStatus = computed(() => {
    const villageProjectStore = useVillageProjectStore()
    const miningSkill = skillStore.getSkill('mining')
    const requirements: QuarryUnlockRequirement[] = [
      {
        id: QUARRY_REQUIRED_PROJECT_ID,
        label: '完成矿料棚与支架',
        current: villageProjectStore.hasProject(QUARRY_REQUIRED_PROJECT_ID) ? 1 : 0,
        target: 1,
        met: villageProjectStore.hasProject(QUARRY_REQUIRED_PROJECT_ID)
      },
      {
        id: 'mineFloor',
        label: '云隐矿洞推进到第 120 层',
        current: achievementStore.stats.highestMineFloor,
        target: 120,
        met: achievementStore.stats.highestMineFloor >= 120
      },
      {
        id: 'skullCavernFloor',
        label: '骷髅矿穴最深达到第 100 层',
        current: achievementStore.stats.skullCavernBestFloor,
        target: 100,
        met: achievementStore.stats.skullCavernBestFloor >= 100
      },
      {
        id: 'skillLevel:mining',
        label: '采矿 Lv.20',
        current: miningSkill.level,
        target: 20,
        met: miningSkill.level >= 20,
        skillType: 'mining'
      },
      {
        id: 'skillMasteryNodeCount:mining',
        label: '采矿精研节点至少 1 个',
        current: miningSkill.unlockedMasteryNodeIds.length,
        target: 1,
        met: miningSkill.unlockedMasteryNodeIds.length >= 1,
        skillType: 'mining'
      },
      {
        id: 'villageProjectLevel',
        label: '村庄建设等级至少 6',
        current: villageProjectStore.villageProjectLevel,
        target: 6,
        met: villageProjectStore.villageProjectLevel >= 6
      }
    ]
    return {
      unlocked: isUnlocked.value,
      canUnlock: requirements.every(requirement => requirement.met),
      requirements
    }
  })

  const weeklyStewardshipProgress = computed(() => {
    const weekKey = getWeekKeyForDayTag()
    const progress =
      weeklyProgress.value.weekKey === weekKey ? weeklyProgress.value : createDefaultQuarryWeeklyProgress(weekKey)
    const claimedCount = Math.min(QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS, progress.claimedMilestoneKeys.length)
    const nextClaimIndex = Math.min(QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS, claimedCount + 1)
    const target = QUARRY_WEEKLY_STEWARDSHIP_TARGET * nextClaimIndex
    const cappedCleared = Math.min(
      progress.clearedCount,
      QUARRY_WEEKLY_STEWARDSHIP_TARGET * QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS
    )
    return {
      weekKey,
      clearedCount: progress.clearedCount,
      current: Math.min(cappedCleared, target),
      target,
      claimedCount,
      maxClaims: QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS,
      ready: claimedCount < QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS && progress.clearedCount >= target,
      percent: target > 0 ? Math.min(100, Math.round((Math.min(cappedCleared, target) / target) * 100)) : 0
    }
  })
  const weeklyStewardshipLifetimeClaimCount = computed(() => Math.floor(lifetimeClearedCount.value / QUARRY_WEEKLY_STEWARDSHIP_TARGET))

  const quarryMineStatus = computed(() => {
    const nodes = quarryMine.value.nodes.map(node => ({ ...node, treasureItems: node.treasureItems?.map(item => ({ ...item })) }))
    const nextNode = nodes.find(node => node.state !== 'cleared') ?? null
    const clearedCount = nodes.filter(node => node.state === 'cleared').length
    const enteredToday = quarryMine.value.lastRunDayTag === getCurrentDayTag()
    const completedDistance = quarryMine.value.lastCompletedDayTag
      ? getDayDistance(quarryMine.value.lastCompletedDayTag, getCurrentDayTag())
      : null
    const daysSinceCompletion = Math.max(0, completedDistance ?? 0)
    const canRefresh = !!quarryMine.value.completed && daysSinceCompletion >= QUARRY_MINE_REFRESH_DAYS
    return {
      unlocked: quarryMine.value.unlocked,
      entered: quarryMine.value.entered,
      completed: quarryMine.value.completed,
      finalRewardClaimed: quarryMine.value.finalRewardClaimed,
      lastRunDayTag: quarryMine.value.lastRunDayTag,
      lastCompletedDayTag: quarryMine.value.lastCompletedDayTag,
      lastResetDayTag: quarryMine.value.lastResetDayTag,
      runId: quarryMine.value.runId,
      nodes,
      nextNodeIndex: nextNode?.index ?? null,
      clearedCount,
      totalCount: nodes.length,
      canEnter: isUnlocked.value && quarryMine.value.unlocked && !quarryMine.value.completed && !enteredToday,
      enteredToday,
      canClaimFinalReward: !quarryMine.value.completed && nextNode?.kind === 'final',
      canRefresh,
      daysUntilRefresh: quarryMine.value.completed ? Math.max(0, QUARRY_MINE_REFRESH_DAYS - daysSinceCompletion) : 0,
      refreshDayCount: QUARRY_MINE_REFRESH_DAYS
    }
  })

  const setWeeklyProgressForDay = (dayTag = getCurrentDayTag()) => {
    const weekKey = getWeekKeyForDayTag(dayTag)
    if (weeklyProgress.value.weekKey !== weekKey) {
      weeklyProgress.value = createDefaultQuarryWeeklyProgress(weekKey)
    }
  }

  const unlockFromProject = (dayTag = getCurrentDayTag(), year = gameStore.year): boolean => {
    if (isUnlocked.value) return false
    unlockedAtDayTag.value = dayTag
    unlockYear.value = Math.max(1, Math.floor(Number(year) || 1))
    activeSize.value = QUARRY_MIN_GRID_SIZE
    lifetimeClearedCount.value = 0
    deepClearCount.value = 0
    cells.value = seedInitialQuarryCells()
    lastRefreshDayTag.value = dayTag
    weeklyProgress.value = createDefaultQuarryWeeklyProgress(getWeekKeyForDayTag(dayTag))
    quarryMine.value = { ...createDefaultQuarryMineSaveData(), unlocked: true }
    addLog('【旧采石场】旧采石场复开了，露天矿面重新长出石头、矿脉和少量裂隙，深处的旧矿洞也露出了入口。', {
      category: 'village',
      tags: ['quarry_unlocked', 'late_game_cycle'],
      meta: { dayTag, projectId: QUARRY_PROJECT_ID }
    })
    return true
  }

  const ensureUnlockedFromProject = (dayTag = getCurrentDayTag(), year = gameStore.year): boolean => {
    if (isUnlocked.value) return true
    if (!useVillageProjectStore().hasProject(QUARRY_PROJECT_ID)) return false
    unlockFromProject(dayTag, year)
    return true
  }

  const refreshQuarryMineIfReady = (dayTag = getCurrentDayTag()): boolean => {
    if (!quarryMine.value.unlocked || !quarryMine.value.completed || !quarryMine.value.lastCompletedDayTag) return false
    const distance = getDayDistance(quarryMine.value.lastCompletedDayTag, dayTag)
    if (distance === null || distance < QUARRY_MINE_REFRESH_DAYS) return false
    if (quarryMine.value.lastResetDayTag === dayTag) return false

    const nextRunId = Math.max(1, quarryMine.value.runId + 1)
    quarryMine.value = {
      ...quarryMine.value,
      entered: false,
      completed: false,
      lastRunDayTag: '',
      lastResetDayTag: dayTag,
      runId: nextRunId,
      nodes: createRefreshedQuarryMineNodes(nextRunId)
    }
    addLog(`【旧采石场】旧支道岩层重新稳定，新的矿洞路线刷新了（第 ${nextRunId + 1} 轮）。`, {
      category: 'village',
      tags: ['late_game_cycle'],
      meta: { dayTag, runId: nextRunId }
    })
    return true
  }

  const dailyUpdate = (dayTag = getCurrentDayTag()) => {
    ensureUnlockedFromProject(dayTag, gameStore.year)
    if (!isUnlocked.value) return { unlocked: false, spawnedCount: 0, attemptedCount: 0 }
    setWeeklyProgressForDay(dayTag)
    if (!quarryMine.value.unlocked) quarryMine.value = { ...quarryMine.value, unlocked: true }
    refreshQuarryMineIfReady(dayTag)
    if (lastRefreshDayTag.value === dayTag) {
      return { unlocked: true, spawnedCount: 0, attemptedCount: 0, skipped: true }
    }
    const result = spawnQuarryDailyResources(cells.value, dailySpawnCap.value)
    cells.value = result.cells
    lastRefreshDayTag.value = dayTag
    lastDailySpawnedCount.value = result.spawnedCount
    return { unlocked: true, ...result }
  }

  const addWeeklyClearAndClaimPotential = (): boolean => {
    setWeeklyProgressForDay()
    weeklyProgress.value = { ...weeklyProgress.value, clearedCount: weeklyProgress.value.clearedCount + 1 }
    let claimed = false
    const nextClaimedKeys = new Set(weeklyProgress.value.claimedMilestoneKeys)
    for (let claimIndex = 1; claimIndex <= QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS; claimIndex += 1) {
      const threshold = QUARRY_WEEKLY_STEWARDSHIP_TARGET * claimIndex
      const milestoneKey = `${weeklyProgress.value.weekKey}:${threshold}`
      if (weeklyProgress.value.clearedCount < threshold || nextClaimedKeys.has(milestoneKey)) continue
      const result = potentialStore.claimPotentialSourceReward('quarry_stewardship', `quarry-clear:${milestoneKey}`, {
        periodKey: weeklyProgress.value.weekKey,
        reason: '旧采石场周清理'
      })
      if (result.success) {
        nextClaimedKeys.add(milestoneKey)
        claimed = true
        useGoalStore().recordWeeklyActivityCounter('life_linkage_actions', 1)
      }
    }
    weeklyProgress.value = { ...weeklyProgress.value, claimedMilestoneKeys: [...nextClaimedKeys] }
    return claimed
  }

  const markSiteCleared = (cell: QuarryCell): boolean => {
    if (!cell.isActiveSite) return false
    lifetimeClearedCount.value += 1
    if (cell.kind === 'deep') deepClearCount.value += 1
    return addWeeklyClearAndClaimPotential()
  }

  const buildCollectionRewards = (cell: QuarryCell): QuarryCollectRewardEntry[] => {
    if (cell.treasureItems && cell.treasureItems.length > 0) {
      const rewards = cell.treasureItems.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
      const artifactChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_artifact_chance')
      if ((cell.kind === 'deep' || cell.kind === 'treasure' || cell.kind === 'artifact') && artifactChance > 0 && Math.random() < artifactChance) {
        const artifactReward = rollQuarryAffixArtifactReward()
        if (artifactReward) rewards.push(artifactReward)
      }
      return rewards
    }
    const itemId = cell.itemId ?? getQuarryResourceDef(cell.resourceId)?.itemId
    if (!itemId) return []
    const quantity = Math.max(1, Math.floor(Number(cell.quantity) || 1))
    const rewards: QuarryCollectRewardEntry[] = [{ itemId, quantity }]
    const quarryDoubleChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_double_chance')
    if (cell.kind !== 'wood' && quarryDoubleChance > 0 && Math.random() < quarryDoubleChance) {
      rewards[0]!.quantity += 1
    }
    const accessoryDoubleChance = accessoryStore.getAccessoryEffectValue('accessory_quarry_double_chance')
    if (cell.kind !== 'wood' && accessoryDoubleChance > 0 && Math.random() < accessoryDoubleChance) {
      rewards[0]!.quantity += 1
    }
    if (cell.kind !== 'wood') {
      const rareTransmuteChance = skillStore.getSkillMasteryEffectValue('rare_transmute')
      const transmutedItemId =
        rareTransmuteChance > 0 && Math.random() < rareTransmuteChance ? QUARRY_RARE_TRANSMUTE_UPGRADES[itemId] : null
      if (transmutedItemId) rewards.push({ itemId: transmutedItemId, quantity: 1 })
    }
    const artifactChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_artifact_chance')
    if (cell.kind === 'deep' && artifactChance > 0 && Math.random() < artifactChance) {
      const artifactReward = rollQuarryAffixArtifactReward()
      if (artifactReward) rewards.push(artifactReward)
    }
    return rewards
  }

  const getCollectionExp = (cell: QuarryCell): { skill: 'mining' | 'foraging'; amount: number } => {
    if (cell.kind === 'wood') return { skill: 'foraging', amount: 5 }
    if (cell.kind === 'deep') return { skill: 'mining', amount: 14 }
    if (cell.kind === 'gem') return { skill: 'mining', amount: 10 }
    if (cell.kind === 'ore') return { skill: 'mining', amount: 8 }
    if (cell.kind === 'treasure') return { skill: 'mining', amount: 12 }
    if (cell.kind === 'artifact') return { skill: 'mining', amount: 16 }
    return { skill: 'mining', amount: 4 }
  }

  const buildRuntimeMonster = (
    monsterId: string,
    savedHp?: number,
    savedMaxHp?: number
  ): QuarryMonsterDef | null => {
    const monsterDef = QUARRY_MONSTERS.find(monster => monster.id === monsterId)
    if (!monsterDef) return null
    const runtimeMaxHp =
      savedMaxHp && savedMaxHp > 0
        ? savedMaxHp
        : Math.max(
            1,
            Math.floor(monsterDef.hp * (isNight.value ? QUARRY_NIGHT_MONSTER_HP_MULT : 1)) +
              (isNight.value ? monsterDef.nightHpBonus : 0)
          )
    return {
      ...monsterDef,
      hp: savedHp && savedHp > 0 ? Math.min(savedHp, runtimeMaxHp) : runtimeMaxHp,
      attack: Math.max(
        1,
        Math.floor(monsterDef.attack * (isNight.value ? QUARRY_NIGHT_MONSTER_ATK_MULT : 1)) +
          (isNight.value ? monsterDef.nightAttackBonus : 0)
      ),
      defense: monsterDef.defense,
      expReward: monsterDef.expReward + (isNight.value ? 2 : 0)
    }
  }

  const buildQuarryCombatRuntime = () => {
    const owned = inventoryStore.getEquippedWeapon()
    const weaponDef = getWeaponById(owned.defId)
    const combatSkill = skillStore.getSkill('combat')
    const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
    return {
      weaponDef,
      runtime: buildPlayerCombatRuntime({
        weaponAttack: inventoryStore.getWeaponAttack() + accessoryStore.getAccessoryEffectValue('accessory_attack_flat'),
        weaponCritRate: inventoryStore.getWeaponCritRate() + accessoryStore.getAccessoryEffectValue('accessory_crit_rate'),
        weaponType: weaponDef?.type ?? null,
        weaponDamageReduction: inventoryStore.getWeaponAffixEffectValue('weapon_damage_reduction'),
        weaponDefenseIgnore: inventoryStore.getWeaponAffixEffectValue('weapon_defense_ignore'),
        weaponExtraStrikeChance: inventoryStore.getWeaponAffixEffectValue('weapon_extra_strike_chance'),
        weaponLifesteal: inventoryStore.getWeaponAffixEffectValue('vampiric'),
        combatLevel: skillStore.combatLevel,
        allSkillsBuff,
        ringAttackBonus: inventoryStore.getRingEffectValue('attack_bonus'),
        ringCritBonus: inventoryStore.getRingEffectValue('crit_rate_bonus'),
        ringLuck: inventoryStore.getRingEffectValue('luck'),
        ringDefenseBonus: inventoryStore.getRingEffectValue('defense_bonus'),
        ringVampiric: inventoryStore.getRingEffectValue('vampiric'),
        accessoryDamageReduction: accessoryStore.getAccessoryEffectValue('accessory_damage_reduction'),
        guildAttackBonus: guildStore.getGuildAttackBonus(),
        guildBadgeBonusAttack: 0,
        guildDefenseBonus: 0,
        cookingDefenseReduction:
          cookingStore.getActiveDefenseReduction() + cookingStore.getActiveAlchemyDefenseReduction(),
        cookingDefenseFlatBonus: cookingStore.getActiveDefenseFlatBonus(),
        perk5: combatSkill.perk5,
        perk10: combatSkill.perk10,
        perk15: combatSkill.perk15,
        perk20: combatSkill.perk20
      })
    }
  }

  const getWeaponCombatTimeMultiplier = () =>
    Math.max(
      0.1,
      1 -
        inventoryStore.getWeaponAffixEffectValue('weapon_combat_time_reduction') -
        accessoryStore.getAccessoryEffectValue('accessory_combat_time_reduction')
    )

  const getAccessoryDurabilityReduction = (): number =>
    accessoryStore.getAccessoryEffectValue('accessory_durability_consumption_reduction')

  const getAttackCombatTimeCost = (monsterHpBefore: number, totalDamage: number, expectedDamage: number): number => {
    const safeHpBefore = Math.max(1, monsterHpBefore)
    if (totalDamage >= safeHpBefore) return QUARRY_COMBAT_TIME_FAST
    const damageRatio = totalDamage / safeHpBefore
    const expectedRatio = expectedDamage / safeHpBefore
    if (damageRatio >= 0.6 || expectedRatio >= 0.75) return QUARRY_COMBAT_TIME_NORMAL
    if (damageRatio >= 0.35 || expectedRatio >= 0.5) return 0.21
    return QUARRY_COMBAT_TIME_LONG
  }

  const startMonsterEncounter = (index: number, fromHidden = false): QuarryActionResult => {
    ensureUnlockedFromProject()
    if (!isUnlocked.value) return { success: false, message: '旧采石场尚未复开。' }
    if (inCombat.value) return { success: false, message: '战斗中无法重新探查。' }

    const safeIndex = Math.floor(Number(index))
    const cell = cells.value[safeIndex]
    if (!cell || cell.kind !== 'monster' || !cell.monsterId) {
      return { success: false, message: '这里没有潜伏的怪物。' }
    }

    const runtimeMonster = buildRuntimeMonster(cell.monsterId, cell.monsterHp, cell.monsterMaxHp)
    if (!runtimeMonster) return { success: false, message: '这只怪物的数据异常，暂时无法交战。' }

    const runtimeHp = cell.monsterHp && cell.monsterHp > 0 ? Math.min(cell.monsterHp, runtimeMonster.hp) : runtimeMonster.hp
    cells.value[safeIndex] = {
      index: safeIndex,
      state: 'monster',
      kind: 'monster',
      isActiveSite: true,
      monsterId: cell.monsterId,
      monsterHp: runtimeHp,
      monsterMaxHp: runtimeMonster.hp
    }
    combatCellIndex.value = safeIndex
    combatMonster.value = runtimeMonster
    combatMonsterHp.value = runtimeHp
    combatRound.value = 0
    combatLog.value = [
      fromHidden
        ? `遭遇了${runtimeMonster.name}！(HP: ${runtimeHp})${isNight.value ? ' 夜晚的采石场更危险。' : ''}`
        : `再次遭遇${runtimeMonster.name}！(HP: ${runtimeHp})`
    ]
    inCombat.value = true

    return {
      success: true,
      message: fromHidden ? `碎石下窜出了${runtimeMonster.name}！` : `你重新逼近了${runtimeMonster.name}。`,
      startsCombat: true
    }
  }

  const exploreCell = (index: number): QuarryActionResult => {
    ensureUnlockedFromProject()
    const safeIndex = Math.floor(Number(index))
    const cell = cells.value[safeIndex]
    if (!cell || cell.state === 'empty') return { success: false, message: '这里暂时没有可清理的资源。' }
    if (cell.state === 'monster') return startMonsterEncounter(safeIndex, false)
    if (cell.state === 'surface') return clearRubble(safeIndex)
    return collectCell(safeIndex)
  }

  const clearRubble = (index: number): QuarryActionResult => {
    ensureUnlockedFromProject()
    if (!isUnlocked.value) return { success: false, message: '旧采石场尚未复开。' }
    if (inCombat.value) return { success: false, message: '战斗中无法处理表层碎石。' }

    const safeIndex = Math.floor(Number(index))
    const cell = cells.value[safeIndex]
    if (!cell || cell.state !== 'surface') return { success: false, message: '这里没有需要剥开的深脉石壳。' }
    const staminaCost = Math.max(
      1,
      Math.ceil(QUARRY_DEEP_STAMINA_COST * Math.max(0.1, 1 - accessoryStore.getAccessoryEffectValue('accessory_mining_stamina_reduction')))
    )
    if (!playerStore.consumeStamina(staminaCost, { source: 'tool' })) {
      return { success: false, message: '体力不足，无法凿开深脉石壳。' }
    }
    skillStore.addExp('mining', QUARRY_RUBBLE_BASE_EXP)

    cells.value[safeIndex] = {
      index: safeIndex,
      state: 'deep',
      isActiveSite: true,
      resourceId: cell.resourceId,
      kind: cell.kind,
      itemId: cell.itemId,
      quantity: cell.quantity
    }
    const resourceLabel = getQuarryResourceDef(cell.resourceId)?.label ?? '深脉'
    return {
      success: true,
      message: `你凿开了深脉外壳，真正的${resourceLabel}露出来了。`
    }
  }

  const fightMonster = (index: number): QuarryActionResult => startMonsterEncounter(index, false)

  const handleCombatRetreat = (message: string): QuarryCombatActionResult => {
    if (combatCellIndex.value >= 0) {
      const cell = cells.value[combatCellIndex.value]
      if (cell && cell.state === 'monster') {
        cells.value[combatCellIndex.value] = {
          ...cell,
          monsterHp: Math.max(1, combatMonsterHp.value),
          monsterMaxHp: combatMonster.value?.hp ?? cell.monsterMaxHp
        }
      }
    }
    if (playerStore.hp <= 0) {
      playerStore.restoreHealth(1)
      message += ' 你被逼退到采石场边缘，勉强稳住了 1 点 HP。'
    }
    inCombat.value = false
    combatMonster.value = null
    combatCellIndex.value = -1
    combatLog.value.push(message)
    return { message, combatOver: true, won: false, timeCostHours: QUARRY_COMBAT_TIME_LONG }
  }

  const handleMonsterDefeat = (monster: QuarryMonsterDef, prefix: string): QuarryCombatActionResult => {
    const safeIndex = combatCellIndex.value
    const defeatedCell = safeIndex >= 0 ? cells.value[safeIndex] : null
    const rewards: QuarryCollectRewardEntry[] = []
    let blockedDrop = false

    for (const drop of monster.drops) {
      if (Math.random() >= drop.chance) continue
      const rewardEntry = { itemId: drop.itemId, quantity: 1, quality: 'normal' as const }
      if (!inventoryStore.canAddItems([rewardEntry]) || !inventoryStore.addItemsExact([rewardEntry])) {
        blockedDrop = true
        continue
      }
      rewards.push({ itemId: drop.itemId, quantity: 1 })
      questStore.onItemObtained(drop.itemId, 1)
    }

    skillStore.addExp('combat', monster.expReward)
    skillStore.addExp('mining', QUARRY_MONSTER_BASE_EXP)
    if (safeIndex >= 0) {
      cells.value[safeIndex] = createExploredEmptyCell(safeIndex)
    }
    const potentialClaimed = defeatedCell ? markSiteCleared(defeatedCell) : false
    let message = `${prefix}${monster.name}被击退了。`
    if (rewards.length > 0) message += ` 掉落：${formatRewardLabels(rewards)}。`
    if (blockedDrop) message += ' 部分掉落因背包不足未能带走。'
    if (potentialClaimed) message += ' 本周管护进度推进了。'

    inCombat.value = false
    combatMonster.value = null
    combatCellIndex.value = -1
    combatLog.value.push(message)
    return {
      message,
      combatOver: true,
      won: true,
      timeCostHours: QUARRY_COMBAT_TIME_FAST,
      rewards
    }
  }

  const combatAction = (action: CombatAction): QuarryCombatActionResult => {
    if (!inCombat.value || !combatMonster.value) {
      return { message: '当前不在战斗中。', combatOver: true, won: false, timeCostHours: 0 }
    }

    combatRound.value += 1
    const monster = combatMonster.value
    const { runtime } = buildQuarryCombatRuntime()

    if (action === 'flee') {
      const message = `你暂时甩开了${monster.name}，退回到裂隙边。`
      if (combatCellIndex.value >= 0) {
        const cell = cells.value[combatCellIndex.value]
        if (cell) {
          cells.value[combatCellIndex.value] = {
            ...cell,
            state: 'monster',
            monsterHp: Math.max(1, combatMonsterHp.value),
            monsterMaxHp: monster.hp
          }
        }
      }
      inCombat.value = false
      combatMonster.value = null
      combatCellIndex.value = -1
      combatLog.value.push(message)
      return { message, combatOver: true, won: false, timeCostHours: QUARRY_COMBAT_TIME_FAST }
    }

    if (action === 'defend') {
      const rawDamage = calculateIncomingDamage({
        incomingAttack: monster.attack,
        flatReduction: runtime.defendDefense.flatReduction,
        modifiers: runtime.defendDefense.damageMultipliers
      })
      const actualDamage = playerStore.takeDamage(rawDamage)
      let message = `你稳住架势，挡下了${monster.name}的大半攻击，仍受到${rawDamage}点伤害。`
      if (playerStore.hp <= 0) return handleCombatRetreat(message)

      const defendHealAmount = getDefendHeal({
        maxHp: playerStore.getMaxHp(),
        healFlat: runtime.defendHealFlat,
        healRatio: runtime.defendHealRatio
      })
      if (defendHealAmount > 0) {
        playerStore.restoreHealth(defendHealAmount)
        message += ` 防守回气，恢复${defendHealAmount}点 HP。`
      }
      combatLog.value.push(message)
      return {
        message,
        combatOver: false,
        won: false,
        timeCostHours: QUARRY_COMBAT_TIME_NORMAL * getWeaponCombatTimeMultiplier(),
        takenDamage: actualDamage
      }
    }

    const monsterHpBefore = combatMonsterHp.value
    const attackOutcome = rollAttackOutcome(runtime.attack, monster.defense)
    const effectiveDamage = getEffectiveDamage(monsterHpBefore, attackOutcome.totalDamage)
    const timeCostHours =
      getAttackCombatTimeCost(
        monsterHpBefore,
        attackOutcome.totalDamage,
        getExpectedAttackDamage(runtime.attack, monster.defense)
      ) * getWeaponCombatTimeMultiplier()

    combatMonsterHp.value = Math.max(0, combatMonsterHp.value - attackOutcome.totalDamage)

    // Equipment durability consumption on attack
    const durabilityNpcUnlocked = npcStore.isNpcFunctionEffectUnlocked('tackle_maintain') ? ['tackle_maintain'] : []
    const equippedWeapon = inventoryStore.ownedWeapons[inventoryStore.equippedWeaponIndex]
    if (equippedWeapon) {
      const wAffixes = equippedWeapon.affixes ?? []
      const wReduction = calculateConsumptionReduction(wAffixes, equippedWeapon.enchantmentId, durabilityNpcUnlocked) + getAccessoryDurabilityReduction()
      const wMax = inventoryStore.getWeaponMaxDurability?.() ?? 100
      consumeEquipmentDurability(equippedWeapon, wMax, 1, wReduction, 'weapon')
    }
    const ringSlots = [inventoryStore.equippedRingSlot1, inventoryStore.equippedRingSlot2]
    for (const slot of ringSlots) {
      if (slot >= 0) {
        const ring = inventoryStore.ownedRings[slot]
        if (ring) {
          const rReduction = calculateConsumptionReduction(ring.affixes ?? [], ring.enchantmentId, durabilityNpcUnlocked) + getAccessoryDurabilityReduction()
          const rMax = inventoryStore.getRingMaxDurability?.(slot) ?? 100
          consumeEquipmentDurability(ring, rMax, 1, rReduction, 'ring')
        }
      }
    }

    let message = `你命中了${monster.name}，造成${attackOutcome.damage}点伤害。`
    if (attackOutcome.isCrit) message = `暴击！${message}`
    if (attackOutcome.didExtraStrike) {
      message += ` 追击再造成${attackOutcome.extraDamage}点伤害。`
    }

    const lifestealHeal = getLifestealHeal(effectiveDamage, runtime.attack.lifesteal)
    if (lifestealHeal > 0) {
      playerStore.restoreHealth(lifestealHeal)
      message += ` 吸血恢复${lifestealHeal}点 HP。`
    }

    if (combatMonsterHp.value <= 0) {
      return {
        ...handleMonsterDefeat(monster, message),
        timeCostHours,
        dealtDamage: attackOutcome.totalDamage,
        mainDamage: attackOutcome.damage,
        extraDamage: attackOutcome.extraDamage,
        totalDamage: attackOutcome.totalDamage,
        effectiveDamage,
        isCrit: attackOutcome.isCrit
      }
    }

    if (attackOutcome.didStun) {
      message += ` ${monster.name}被震得后退，没能立刻反扑。`
      if (combatCellIndex.value >= 0) {
        const cell = cells.value[combatCellIndex.value]
        if (cell) cells.value[combatCellIndex.value] = { ...cell, monsterHp: combatMonsterHp.value, monsterMaxHp: monster.hp }
      }
      combatLog.value.push(message)
      return {
        message,
        combatOver: false,
        won: false,
        timeCostHours,
        dealtDamage: attackOutcome.totalDamage,
        mainDamage: attackOutcome.damage,
        extraDamage: attackOutcome.extraDamage,
        totalDamage: attackOutcome.totalDamage,
        effectiveDamage,
        isCrit: attackOutcome.isCrit
      }
    }

    const dodgeRate = runtime.defense.dodgeRate ?? 0
    if (dodgeRate > 0 && Math.random() < dodgeRate) {
      message += ` 你侧身避开了${monster.name}的反击。`
      if (combatCellIndex.value >= 0) {
        const cell = cells.value[combatCellIndex.value]
        if (cell) cells.value[combatCellIndex.value] = { ...cell, monsterHp: combatMonsterHp.value, monsterMaxHp: monster.hp }
      }
      combatLog.value.push(message)
      return {
        message,
        combatOver: false,
        won: false,
        timeCostHours,
        dealtDamage: attackOutcome.totalDamage,
        mainDamage: attackOutcome.damage,
        extraDamage: attackOutcome.extraDamage,
        totalDamage: attackOutcome.totalDamage,
        effectiveDamage,
        isCrit: attackOutcome.isCrit
      }
    }

    const rawCounterDamage = calculateIncomingDamage({
      incomingAttack: monster.attack,
      flatReduction: runtime.defense.flatReduction,
      modifiers: runtime.defense.damageMultipliers
    })
    const actualCounterDamage = playerStore.takeDamage(rawCounterDamage)
    message += ` ${monster.name}反扑，你受到${rawCounterDamage}点伤害。`

    if (combatCellIndex.value >= 0) {
      const cell = cells.value[combatCellIndex.value]
      if (cell) cells.value[combatCellIndex.value] = { ...cell, monsterHp: combatMonsterHp.value, monsterMaxHp: monster.hp }
    }

    if (playerStore.hp <= 0) {
      return {
        ...handleCombatRetreat(message),
        timeCostHours,
        dealtDamage: attackOutcome.totalDamage,
        mainDamage: attackOutcome.damage,
        extraDamage: attackOutcome.extraDamage,
        totalDamage: attackOutcome.totalDamage,
        effectiveDamage,
        takenDamage: actualCounterDamage,
        isCrit: attackOutcome.isCrit
      }
    }

    combatLog.value.push(message)
    return {
      message,
      combatOver: false,
      won: false,
      timeCostHours,
      dealtDamage: attackOutcome.totalDamage,
      mainDamage: attackOutcome.damage,
      extraDamage: attackOutcome.extraDamage,
      totalDamage: attackOutcome.totalDamage,
      effectiveDamage,
      takenDamage: actualCounterDamage,
      isCrit: attackOutcome.isCrit
    }
  }

  const collectCell = (index: number): QuarryCollectResult => {
    ensureUnlockedFromProject()
    if (!isUnlocked.value) return { success: false, message: '旧采石场尚未复开。', rewards: [] }
    if (inCombat.value) return { success: false, message: '战斗中无法收取资源。', rewards: [] }

    const safeIndex = Math.floor(Number(index))
    const cell = cells.value[safeIndex]
    if (!cell || !isCollectableCell(cell)) {
      return { success: false, message: '这里暂时没有可收取的发现。', rewards: [] }
    }

    const rewards = buildCollectionRewards(cell)
    if (rewards.length === 0) {
      return { success: false, message: '这个勘探点的数据异常，暂时无法收取。', rewards: [] }
    }

    const rewardEntries = rewards.map(reward => ({ ...reward, quality: 'normal' as const }))
    if (!inventoryStore.canAddItems(rewardEntries)) {
      return { success: false, message: '背包空间不足，这处发现会保留在原地。', rewards: [] }
    }

    const inventorySnapshot = inventoryStore.serialize()
    const playerSnapshot = playerStore.serialize()
    const staminaSource = cell.kind === 'wood' ? 'foraging' : 'tool'
    const deepStaminaReduction = cell.kind === 'deep'
      ? inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_deep_stamina_reduction')
      : 0
    const accessoryStaminaReduction = cell.kind === 'wood'
      ? 0
      : accessoryStore.getAccessoryEffectValue('accessory_mining_stamina_reduction')
    const baseStaminaCost = cell.kind === 'deep' ? QUARRY_DEEP_STAMINA_COST : QUARRY_COLLECT_STAMINA_COST
    const staminaCost = Math.max(1, Math.ceil(baseStaminaCost * Math.max(0.1, 1 - deepStaminaReduction - accessoryStaminaReduction)))
    if (!playerStore.consumeStamina(staminaCost, { source: staminaSource })) {
      return { success: false, message: '体力不足，无法继续收取采石场发现。', rewards: [] }
    }
    if (!inventoryStore.addItemsExact(rewardEntries)) {
      inventoryStore.deserialize(inventorySnapshot)
      playerStore.deserialize(playerSnapshot)
      return { success: false, message: '背包空间不足，这处发现会保留在原地。', rewards: [] }
    }

    for (const reward of rewards) questStore.onItemObtained(reward.itemId, reward.quantity)

    const exp = getCollectionExp(cell)
    skillStore.addExp(exp.skill, exp.amount)
    const potentialClaimed = markSiteCleared(cell)
    cells.value[safeIndex] = createExploredEmptyCell(safeIndex)

    const resourceLabel = cell.treasureItems
      ? cell.kind === 'treasure'
        ? '旧宝箱'
        : '古物'
      : getQuarryResourceDef(cell.resourceId)?.label ?? '采石场发现'
    const potentialSuffix = potentialClaimed ? ' 本周管护进度推进了。' : ''
    return {
      success: true,
      message: `你收起了${resourceLabel}：${formatRewardLabels(rewards)}。${potentialSuffix}`.trim(),
      rewards,
      potentialClaimed
    }
  }

  const expandQuarry = (): { success: boolean; message: string } => {
    if (!isUnlocked.value) return { success: false, message: '旧采石场尚未复开。' }
    const info = expansionInfo.value
    if (!info.nextStage) return { success: false, message: '采石场已达最大规模。' }
    if (!info.canExpand) {
      return { success: false, message: `尚未满足扩建条件：${info.missingRequirements.join('；')}` }
    }
    if (playerStore.money < info.nextStage.moneyCost) {
      return { success: false, message: `资金不足，需要 ${info.nextStage.moneyCost} 文。` }
    }
    if (!hasCombinedItems(info.nextStage.materialCosts)) {
      const missing = info.nextStage.materialCosts.find(material => getCombinedItemCount(material.itemId) < material.quantity)
      const itemName = getItemById(missing?.itemId ?? '')?.name ?? missing?.itemId ?? '材料'
      return { success: false, message: `${itemName}不足，需要 ${missing?.quantity ?? 0}。` }
    }

    playerStore.spendMoney(info.nextStage.moneyCost)
    if (!removeCombinedItems(info.nextStage.materialCosts)) {
      playerStore.earnMoney(info.nextStage.moneyCost, { countAsEarned: false })
      return { success: false, message: '材料不足，无法扩建采石场。' }
    }

    const oldSize = activeSize.value
    const newSize = info.nextStage.toSize
    const oldCells = cloneCells(cells.value)
    const newCells = createEmptyQuarryCellsSized(newSize)
    for (let row = 0; row < oldSize; row += 1) {
      for (let col = 0; col < oldSize; col += 1) {
        const oldIndex = row * oldSize + col
        const newIndex = row * newSize + col
        newCells[newIndex] = { ...(oldCells[oldIndex] ?? createExploredEmptyCell(oldIndex)), index: newIndex }
      }
    }
    activeSize.value = newSize
    cells.value = newCells
    addLog(`【旧采石场】${info.nextStage.description}`, {
      category: 'village',
      tags: ['quarry_expanded'],
      meta: { fromSize: oldSize, toSize: newSize }
    })
    return {
      success: true,
      message: `${info.nextStage.description}（${oldSize}×${oldSize} → ${newSize}×${newSize}）`
    }
  }

  const enterQuarryMine = (): QuarryActionResult => {
    ensureUnlockedFromProject()
    refreshQuarryMineIfReady()
    if (!isUnlocked.value || !quarryMine.value.unlocked) {
      return { success: false, message: '采石场矿洞尚未露出入口。' }
    }
    if (quarryMine.value.completed) {
      const daysUntilRefresh = quarryMineStatus.value.daysUntilRefresh
      return {
        success: false,
        message:
          daysUntilRefresh > 0
            ? `本轮旧支道已经清完，岩层还需 ${daysUntilRefresh} 天稳定后刷新。`
            : '本轮旧支道已经清完，明早刷新时会重新露出路线。'
      }
    }
    if (quarryMine.value.lastRunDayTag === getCurrentDayTag()) {
      return { success: false, message: '今天已经进入过采石场矿洞，先把当前支道进度处理完。' }
    }
    quarryMine.value = {
      ...quarryMine.value,
      entered: true,
      lastRunDayTag: getCurrentDayTag()
    }
    const routeText = quarryMine.value.finalRewardClaimed
      ? '岩层重新稳定后露出了一条新岔路，终点多半是旧矿工留下的补给。'
      : '这里是一条短而危险的旧支道，终点供着一枚灵器碎片。'
    return { success: true, message: `你进入了采石场矿洞。${routeText}` }
  }

  const markQuarryMineNodeCleared = (nodeIndex: number) => {
    quarryMine.value = {
      ...quarryMine.value,
      nodes: quarryMine.value.nodes.map(node => (node.index === nodeIndex ? { ...node, state: 'cleared' } : node))
    }
    if (quarryMine.value.nodes.every(node => node.state === 'cleared')) {
      quarryMine.value = { ...quarryMine.value, completed: true }
    }
  }

  const buildQuarryMineNodeRewards = (
    node: QuarryMineSaveData['nodes'][number],
    mode: QuarryMineExploreMode
  ): QuarryCollectRewardEntry[] => {
    const baseRewards =
      node.kind === 'chest' && node.treasureItems?.length
        ? node.treasureItems.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
        : node.itemId
          ? [{ itemId: node.itemId, quantity: Math.max(1, node.quantity ?? 1) }]
          : []
    if (mode === 'search') {
      return baseRewards.map(reward => ({
        ...reward,
        quantity: reward.quantity + (node.kind === 'chest' ? 1 : Math.max(1, Math.floor(reward.quantity * 0.25)))
      }))
    }
    if (mode === 'force' && node.kind === 'ore' && node.itemId) {
      return baseRewards.map(reward => ({ ...reward, quantity: reward.quantity + 1 }))
    }
    return baseRewards
  }

  const getQuarryMineModeMessagePrefix = (mode: QuarryMineExploreMode): string => {
    if (mode === 'force') return '你选择强攻，快速压过危险点。'
    if (mode === 'search') return '你选择细搜，沿支架和碎石缝多查了一遍。'
    return '你稳步推进，尽量避开松动岩层。'
  }

  const addQuarryMineSettlementFailureLog = (message: string, meta: Record<string, string | number | boolean | null | undefined> = {}) => {
    addLog(`【旧采石场】结算失败：${message}`, {
      category: 'village',
      tags: ['late_game_cycle', 'resource_sink'],
      meta
    })
  }

  const resolveQuarryMineNode = (index: number, mode: QuarryMineExploreMode = 'steady', prepItemId: string | null = null): QuarryCollectResult => {
    ensureUnlockedFromProject()
    if (!isUnlocked.value || !quarryMine.value.unlocked) {
      return { success: false, message: '采石场矿洞尚未开放。', rewards: [] }
    }

    const exploreMode = normalizeQuarryMineExploreMode(mode)
    const elixirPrep = getQuarryMineElixirPrepOption(prepItemId)
    if (prepItemId && !elixirPrep) {
      addQuarryMineSettlementFailureLog('这种丹药暂时不能用于旧支道准备。', { index, prepItemId })
      return { success: false, message: '这种丹药暂时不能用于旧支道准备。', rewards: [] }
    }
    const safeIndex = Math.floor(Number(index))
    const node = quarryMine.value.nodes[safeIndex]
    if (!node) return { success: false, message: '这条支道已经塌死了。', rewards: [] }
    const firstAvailable = quarryMine.value.nodes.find(entry => entry.state !== 'cleared')
    if (firstAvailable && firstAvailable.index !== safeIndex) {
      return { success: false, message: '采石场矿洞只能沿着旧支道一段段推进。', rewards: [] }
    }
    if (node.state === 'cleared') return { success: false, message: '这里已经清理过了。', rewards: [] }
    if (node.kind === 'final') {
      const finalResult = claimQuarryMineFinalReward()
      return { ...finalResult, rewards: finalResult.rewards ?? [], exploreMode }
    }
    if (!quarryMine.value.entered || quarryMine.value.lastRunDayTag !== getCurrentDayTag()) {
      return { success: false, message: '今天还没有进入采石场矿洞，先从入口下去。', rewards: [] }
    }

    if (elixirPrep && inventoryStore.getTotalItemCount(elixirPrep.itemId) < 1) {
      const elixirName = getItemById(elixirPrep.itemId)?.name ?? elixirPrep.label
      addQuarryMineSettlementFailureLog(`${elixirName}不足，无法作为旧支道准备物。`, {
        index: safeIndex,
        prepItemId: elixirPrep.itemId
      })
      return { success: false, message: `${elixirName}不足，无法作为旧支道准备物。`, rewards: [] }
    }

    const quarryDeepStaminaReduction = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_quarry_deep_stamina_reduction')
    const accessoryStaminaReduction = accessoryStore.getAccessoryEffectValue('accessory_mining_stamina_reduction')
    const staminaCost = Math.max(
      1,
      Math.ceil(getQuarryMineModeStaminaCost(exploreMode) * Math.max(0.1, 1 - quarryDeepStaminaReduction - accessoryStaminaReduction)) -
        (elixirPrep?.staminaReduction ?? 0)
    )
    const consumeElixirPrep = (): string | null => {
      if (!elixirPrep) return ''
      const elixirName = getItemById(elixirPrep.itemId)?.name ?? elixirPrep.label
      if (!inventoryStore.removeItemAnywhere(elixirPrep.itemId, 1)) return null
      return `消耗 ${elixirName} x1，${elixirPrep.logEffect}。`
    }

    if (node.kind === 'monster') {
      const monster = QUARRY_MONSTERS.find(entry => entry.id === node.monsterId)
      if (!monster) return { success: false, message: '矿洞怪物数据异常。', rewards: [] }
      if (!playerStore.consumeStamina(staminaCost, { source: 'tool' })) {
        return { success: false, message: '体力不足，无法继续推进采石场矿洞。', rewards: [] }
      }
      const elixirMessage = consumeElixirPrep()
      if (elixirMessage === null) {
        addQuarryMineSettlementFailureLog('丹药准备状态已变化，旧支道推进已中止。', {
          index: safeIndex,
          prepItemId: elixirPrep?.itemId ?? null
        })
        return { success: false, message: '丹药准备状态已变化，旧支道推进已中止。', rewards: [] }
      }
      const baseDamageRate = exploreMode === 'steady' ? 0.35 : exploreMode === 'force' ? 0.75 : 0.55
      const damageRate = baseDamageRate * (elixirPrep?.monsterDamageMultiplier ?? 1)
      const damage = Math.max(1, Math.floor(monster.attack * damageRate))
      const takenDamage = playerStore.takeDamage(damage)
      skillStore.addExp('combat', monster.expReward)
      skillStore.addExp('mining', QUARRY_MONSTER_BASE_EXP + (exploreMode === 'force' ? 2 : 0))
      markQuarryMineNodeCleared(node.index)
      if (elixirPrep) {
        addLog(`【旧采石场】${elixirMessage}本次旧支道探索伤害损耗降低。`, {
          category: 'village',
          tags: ['late_game_cycle', 'resource_sink'],
          meta: {
            nodeIndex: node.index,
            nodeKind: node.kind,
            prepItemId: elixirPrep.itemId,
            exploreMode
          }
        })
      }
      return {
        success: true,
        message: `${getQuarryMineModeMessagePrefix(exploreMode)}${elixirMessage ? ` ${elixirMessage}` : ''} 你击退了${monster.name}，受到 ${takenDamage} 点伤害，旧支道继续向前延伸。`,
        rewards: [],
        exploreMode,
        globalLogged: Boolean(elixirPrep)
      }
    }

    const rewards = buildQuarryMineNodeRewards(node, exploreMode)
    const rewardEntries = buildQuarryMineRewardEntries(rewards)
    if (rewardEntries.length > 0 && !inventoryStore.canAddItems(rewardEntries)) {
      return { success: false, message: '背包空间不足，矿洞里的发现会保留在原地。', rewards: [] }
    }
    if (!playerStore.consumeStamina(staminaCost, { source: 'tool' })) {
      return { success: false, message: '体力不足，无法继续推进采石场矿洞。', rewards: [] }
    }
    const elixirMessage = consumeElixirPrep()
    if (elixirMessage === null) {
      addQuarryMineSettlementFailureLog('丹药准备状态已变化，旧支道推进已中止。', {
        index: safeIndex,
        prepItemId: elixirPrep?.itemId ?? null
      })
      return { success: false, message: '丹药准备状态已变化，旧支道推进已中止。', rewards: [] }
    }
    if (rewardEntries.length > 0 && !inventoryStore.addItemsExact(rewardEntries)) {
      return { success: false, message: '背包空间不足，矿洞里的发现会保留在原地。', rewards: [] }
    }
    for (const reward of rewards) questStore.onItemObtained(reward.itemId, reward.quantity)
    skillStore.addExp('mining', node.kind === 'chest' ? 10 : 6)
    markQuarryMineNodeCleared(node.index)
    if (elixirPrep) {
      addLog(`【旧采石场】${elixirMessage}本次旧支道探索体力损耗降低。`, {
        category: 'village',
        tags: ['late_game_cycle', 'resource_sink'],
        meta: {
          nodeIndex: node.index,
          nodeKind: node.kind,
          prepItemId: elixirPrep.itemId,
          exploreMode
        }
      })
    }
    return {
      success: true,
      message: `${getQuarryMineModeMessagePrefix(exploreMode)}${elixirMessage ? ` ${elixirMessage}` : ''} 你清理了${node.label}${rewards.length > 0 ? `，获得${formatRewardLabels(rewards)}` : ''}。`,
      rewards,
      exploreMode,
      globalLogged: Boolean(elixirPrep)
    }
  }

  const claimQuarryMineFinalReward = (): QuarryActionResult => {
    ensureUnlockedFromProject()
    if (!isUnlocked.value || !quarryMine.value.unlocked) {
      return { success: false, message: '采石场矿洞尚未开放。' }
    }
    const blockingNode = quarryMine.value.nodes.find(node => node.kind !== 'final' && node.state !== 'cleared')
    if (blockingNode) return { success: false, message: '旧支道还没清到底，终点祭台够不着。' }
    const finalNode = quarryMine.value.nodes.find(node => node.kind === 'final')
    if (!finalNode || finalNode.state === 'cleared') return { success: false, message: '旧支道终点已经处理过了。' }
    const currentDayTag = getCurrentDayTag()

    if (quarryMine.value.finalRewardClaimed) {
      const rewards = QUARRY_MINE_REPEAT_FINAL_REWARDS.map(reward => ({ itemId: reward.itemId, quantity: reward.quantity }))
      const rewardEntries = buildQuarryMineRewardEntries(rewards)
      if (!inventoryStore.canAddItems(rewardEntries)) {
        return { success: false, message: '背包空间不足，旧支道终点的补给暂时保留在祭台旁。' }
      }
      if (!inventoryStore.addItemsExact(rewardEntries)) {
        return { success: false, message: '背包空间不足，旧支道终点的补给暂时保留在祭台旁。' }
      }
      for (const reward of rewards) questStore.onItemObtained(reward.itemId, reward.quantity)
      skillStore.addExp('mining', 12)
      quarryMine.value = {
        ...quarryMine.value,
        completed: true,
        lastCompletedDayTag: currentDayTag,
        nodes: quarryMine.value.nodes.map(node => (node.kind === 'final' ? { ...node, state: 'cleared' } : node))
      }
      return {
        success: true,
        completed: true,
        rewardClaimed: true,
        rewards,
        message: `你清点了旧支道尽头的回声祭台，获得${formatRewardLabels(rewards)}。岩层会在 ${QUARRY_MINE_REFRESH_DAYS} 天后重新稳定。`
      }
    }

    playerStore.markLifestyleUnlock(QUARRY_MINE_FINAL_UNLOCK_ID, currentDayTag)
    quarryMine.value = {
      ...quarryMine.value,
      completed: true,
      finalRewardClaimed: true,
      lastCompletedDayTag: currentDayTag,
      nodes: quarryMine.value.nodes.map(node => (node.kind === 'final' ? { ...node, state: 'cleared' } : node))
    }
    return {
      success: true,
      completed: true,
      rewardClaimed: true,
      message: `你在采石场矿洞尽头取下了灵器碎片。若已解锁饰物槽，可在角色/背包中装备 ${QUARRY_MINE_FINAL_TRINKET_ID}。岩层会在 ${QUARRY_MINE_REFRESH_DAYS} 天后刷新出新的旧支道。`
    }
  }

  const serialize = (): QuarrySaveData => ({
    unlockedAtDayTag: unlockedAtDayTag.value,
    unlockYear: unlockYear.value,
    activeSize: activeSize.value,
    lifetimeClearedCount: lifetimeClearedCount.value,
    deepClearCount: deepClearCount.value,
    cells: cloneCells(cells.value),
    lastRefreshDayTag: lastRefreshDayTag.value,
    weeklyProgress: {
      weekKey: weeklyProgress.value.weekKey,
      clearedCount: weeklyProgress.value.clearedCount,
      claimedMilestoneKeys: [...weeklyProgress.value.claimedMilestoneKeys]
    },
    quarryMine: {
      ...quarryMine.value,
      nodes: quarryMine.value.nodes.map(node => ({ ...node, treasureItems: node.treasureItems?.map(item => ({ ...item })) }))
    }
  })

  const deserialize = (data?: Partial<QuarrySaveData> | null) => {
    const normalized = normalizeQuarrySaveData(data)
    unlockedAtDayTag.value = normalized.unlockedAtDayTag
    unlockYear.value = normalized.unlockYear
    activeSize.value = normalized.activeSize
    lifetimeClearedCount.value = normalized.lifetimeClearedCount
    deepClearCount.value = normalized.deepClearCount
    cells.value = cloneCells(normalized.cells)
    lastRefreshDayTag.value = normalized.lastRefreshDayTag
    lastDailySpawnedCount.value = 0
    weeklyProgress.value = {
      weekKey: normalized.weeklyProgress.weekKey,
      clearedCount: normalized.weeklyProgress.clearedCount,
      claimedMilestoneKeys: [...normalized.weeklyProgress.claimedMilestoneKeys]
    }
    quarryMine.value = {
      ...normalized.quarryMine,
      nodes: normalized.quarryMine.nodes.map(node => ({ ...node, treasureItems: node.treasureItems?.map(item => ({ ...item })) }))
    }
    inCombat.value = false
    combatMonster.value = null
    combatMonsterHp.value = 0
    combatRound.value = 0
    combatLog.value = []
    combatCellIndex.value = -1
  }

  const reset = () => {
    deserialize(createDefaultQuarrySaveData())
  }
  const $reset = () => {
    reset()
  }

  return {
    unlockedAtDayTag,
    unlockYear,
    activeSize,
    lifetimeClearedCount,
    deepClearCount,
    weeklyStewardshipLifetimeClaimCount,
    cells,
    lastRefreshDayTag,
    lastDailySpawnedCount,
    weeklyProgress,
    quarryMine,
    gridSize: QUARRY_GRID_SIZE,
    isUnlocked,
    maintenanceActive,
    dailySpawnCap,
    isNight,
    emptyCellCount,
    interactableCellCount,
    rareCellCount,
    unexploredCellCount,
    exploredCellCount,
    surfaceCellCount,
    monsterCellCount,
    resourceCellCount,
    revealedInteractableCount,
    totalCellCount,
    expansionInfo,
    unlockStatus,
    weeklyStewardshipProgress,
    quarryMineStatus,
    inCombat,
    combatMonster,
    combatMonsterHp,
    combatRound,
    combatLog,
    unlockFromProject,
    ensureUnlockedFromProject,
    dailyUpdate,
    exploreCell,
    clearRubble,
    fightMonster,
    combatAction,
    collectCell,
    expandQuarry,
    enterQuarryMine,
    resolveQuarryMineNode,
    claimQuarryMineFinalReward,
    serialize,
    deserialize,
    reset,
    $reset
  }
})
