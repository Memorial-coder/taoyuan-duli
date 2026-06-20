import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ForgeAffixRoll, MonsterDef, CombatAction, MineFloorDef, MineTile, Quality } from '@/types'
import {
  getFloor,
  getRewardNames,
  getInfestedClearRewards,
  BOSS_MONSTERS,
  BOSS_MONEY_REWARDS,
  BOSS_ORE_REWARDS,
  getWeakenedBoss,
  MAX_MINE_FLOOR,
  generateSkullCavernFloor,
  scaleMonster,
  generateFloorGrid,
  getAdjacentIndices,
  getBombIndices
} from '@/data'
import { getBombById } from '@/data/processing'
import { resolveEnvironmentWindow } from '@/data/environmentWindows'
import { getItemById } from '@/data/items'
import {
  getWeaponById,
  getEnchantmentById,
  MONSTER_DROP_WEAPONS,
  BOSS_DROP_WEAPONS,
  TREASURE_DROP_WEAPONS,
  getWeaponDisplayName
} from '@/data/weapons'
import {
  migrateLegacyEnchantmentToAffixes,
  rollForgeAffixes,
  sanitizeForgeAffixes
} from '@/data/forgeAffixes'
import { getRingById, MONSTER_DROP_RINGS, BOSS_DROP_RINGS, TREASURE_DROP_RINGS } from '@/data/rings'
import { getHatById, MONSTER_DROP_HATS, BOSS_DROP_HATS, TREASURE_DROP_HATS } from '@/data/hats'
import { getShoeById, MONSTER_DROP_SHOES, BOSS_DROP_SHOES, TREASURE_DROP_SHOES } from '@/data/shoes'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useSkillStore } from './useSkillStore'
import { usePotentialStore } from './usePotentialStore'
import { useAchievementStore } from './useAchievementStore'
import { useGuildStore } from './useGuildStore'
import { useQuestStore } from './useQuestStore'
import { useCookingStore } from './useCookingStore'
import { useGameStore } from './useGameStore'
import { useWalletStore } from './useWalletStore'
import { useSecretNoteStore } from './useSecretNoteStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useGoalStore } from './useGoalStore'
import type { SkullCavernFloorDef } from '@/data/mine'
import {
  buildPlayerCombatRuntime,
  calculateIncomingDamage,
  getDefendHeal,
  getEffectiveDamage,
  getExpectedAttackDamage,
  getLifestealHeal,
  rollAttackOutcome
} from '@/utils/combatRuntime'
import { resolveFractionalStaminaCost } from '@/utils/fractionalStamina'

const DEFEAT_MONEY_PENALTY_RATE = 0.1
const DEFEAT_MONEY_PENALTY_CAP = 15000
const DEFEAT_MAX_ITEM_LOSS = 3
const COMBAT_TIME_FAST = 0.08
const COMBAT_TIME_ADVANTAGE = 0.12
const COMBAT_TIME_NORMAL = 0.17
const COMBAT_TIME_LONG = 0.25
const MINING_COMBAT_LOG_LIMIT = 120
const MINING_BASE_STAMINA_COST = 2
const MINE_GRID_SIZE = 6
const EXCAVATOR_BOMB_REFUND_CHANCE = 0.3
const DEEP_EXCAVATOR_BOMB_REFUND_CHANCE = 0.5
const ABYSS_MINER_GUARANTEED_REFUNDS_PER_FLOOR = 1
const ABYSS_MINER_EXTRA_REFUND_CHANCE = 0.6
const ROOT_GUARD_NODE_ID = 'body_low_hp_sense'
const ROOT_GUARD_EFFECT_KEY = 'potential_low_hp_hint'
const ROOT_GUARD_ITEM_SAFE_RANK = 10
const ROOT_GUARD_SHOCKWAVE_RANK = 20
const ROOT_GUARD_BOSS_WEAKEN_RANK = 30
const ROOT_GUARD_BOSS_STAT_MULTIPLIER = 0.8
const BOSS_POTENTIAL_REPLAY_MAX_CHANCE = 0.3
const BOSS_POTENTIAL_REPLAY_FULL_CHANCE_FLOOR = MAX_MINE_FLOOR
const SPIRIT_SLAYER_MONSTER_KEYWORDS = ['ghost', 'shadow', 'void', 'wraith', 'mummy', 'bone', 'skeleton', 'sovereign']
const BUG_SLAYER_MONSTER_KEYWORDS = ['worm', 'spider', 'crab', 'bug', 'insect', '蝎', '虫', '蛛', '蟹']
const EXORCIST_MONSTER_KEYWORDS = ['ghost', 'void', 'wraith', 'mummy', 'bone', 'skeleton', 'skull', '幽', '魂', '亡', '骨', '骷髅', '木乃伊']
const applySkillMasteryBonus = (value: number, bonus: number): number => Math.floor(value * (1 + bonus) + 1e-6)
const getMineBossPotentialReplayChance = (floorNum: number): number => {
  const safeFloor = Math.max(0, Math.floor(floorNum))
  const ramp = BOSS_POTENTIAL_REPLAY_FULL_CHANCE_FLOOR > 0
    ? safeFloor / BOSS_POTENTIAL_REPLAY_FULL_CHANCE_FLOOR
    : 0
  return Math.min(BOSS_POTENTIAL_REPLAY_MAX_CHANCE, Math.max(0, ramp * BOSS_POTENTIAL_REPLAY_MAX_CHANCE))
}
const RARE_TRANSMUTE_ORE_UPGRADES: Record<string, string> = {
  copper_ore: 'iron_ore',
  iron_ore: 'gold_ore',
  gold_ore: 'crystal_ore',
  crystal_ore: 'shadow_ore',
  shadow_ore: 'void_ore',
  void_ore: 'iridium_ore'
}
const getRareTransmuteOre = (oreId: string): string | null => RARE_TRANSMUTE_ORE_UPGRADES[oreId] ?? null
const TREASURE_SENSE_REWARDS = [
  'quartz',
  'jade',
  'ruby',
  'moonstone',
  'obsidian',
  'dragon_jade',
  'trilobite_fossil',
  'shell_fossil',
  'ammonite_fossil',
  'ancient_coin'
] as const
const rollTreasureSenseReward = (): string => TREASURE_SENSE_REWARDS[Math.floor(Math.random() * TREASURE_SENSE_REWARDS.length)]!
const cloneForgeAffixes = (affixes?: ForgeAffixRoll[] | null): ForgeAffixRoll[] =>
  (affixes ?? []).map(affix => ({ ...affix }))
const rollDroppedWeaponAffixes = (): ForgeAffixRoll[] =>
  Math.random() < 0.3 ? rollForgeAffixes({ target: 'weapon', workshopLevel: 7 }) : []
const MINING_ITEM_EXP: Record<string, number> = {
  copper_ore: 6,
  iron_ore: 8,
  gold_ore: 11,
  crystal_ore: 15,
  shadow_ore: 20,
  void_ore: 26,
  iridium_ore: 34,
  quartz: 8,
  jade: 12,
  ruby: 16,
  moonstone: 22,
  obsidian: 28,
  dragon_jade: 36,
  prismatic_shard: 60
}

const getMineTileValueScore = (tile: MineTile): number => {
  if (tile.type === 'treasure') return 100 + (tile.data?.treasureMoney ?? 0) / 20
  if (tile.type === 'mushroom') return 45
  if (tile.type !== 'ore') return 0
  const oreId = tile.data?.oreId ?? 'copper_ore'
  return (MINING_ITEM_EXP[oreId] ?? getItemById(oreId)?.sellPrice ?? 1) * (tile.data?.oreQuantity ?? 1)
}

const getMineTileValueLabel = (tile: MineTile): string => {
  if (tile.type === 'treasure') return '宝箱'
  if (tile.type === 'mushroom') return '菌菇'
  if (tile.type === 'ore') return getItemById(tile.data?.oreId ?? '')?.name ?? '矿石'
  return '高价值格子'
}

const getRelativeMineDirection = (fromIndex: number, toIndex: number): string => {
  const fromRow = Math.floor(fromIndex / MINE_GRID_SIZE)
  const fromCol = fromIndex % MINE_GRID_SIZE
  const toRow = Math.floor(toIndex / MINE_GRID_SIZE)
  const toCol = toIndex % MINE_GRID_SIZE
  const vertical = toRow < fromRow ? '北' : toRow > fromRow ? '南' : ''
  const horizontal = toCol < fromCol ? '西' : toCol > fromCol ? '东' : ''
  return `${vertical}${horizontal}` || '脚下'
}

type CombatActionResult = {
  message: string
  combatOver: boolean
  won: boolean
  timeCostHours: number
  dealtDamage?: number
  mainDamage?: number
  extraDamage?: number
  totalDamage?: number
  effectiveDamage?: number
  takenDamage?: number
  isCrit?: boolean
  rewards?: MineRewardDisplayEntry[]
}

type SessionLootEntry =
  | { kind: 'item'; itemId: string; quantity: number }
  | { kind: 'money'; amount: number }
  | { kind: 'weapon'; defId: string; enchantmentId: string | null; affixes?: ForgeAffixRoll[] }
  | { kind: 'ring'; defId: string }
  | { kind: 'hat'; defId: string }
  | { kind: 'shoe'; defId: string }

type InventoryRewardEntry = { itemId: string; quantity: number; quality?: Quality }

type MineRewardDisplayEntry = { itemId: string; quantity: number; quality?: Quality; label: string }

type MineActionResult = { success: boolean; message: string; startsCombat: boolean; rewards?: MineRewardDisplayEntry[] }

type MineUtilityResult = { success: boolean; message: string; rewards?: MineRewardDisplayEntry[] }

type PendingMineRewardKind = 'infested_clear' | 'main_mine_boss'

interface PendingMineRewardEntry {
  id: string
  kind: PendingMineRewardKind
  floorNum: number
  itemRewards: InventoryRewardEntry[]
  money: number
  weaponReward: { defId: string; enchantmentId: string | null; affixes?: ForgeAffixRoll[] } | null
  ringRewardId: string | null
  hatRewardId: string | null
  shoeRewardId: string | null
  message: string
}

type MineRewardClaimResult = { granted: boolean; pending: boolean; message: string }

export const useMiningStore = defineStore('mining', () => {
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const gameStore = useGameStore()
  const environmentWindow = computed(() =>
    resolveEnvironmentWindow({
      season: gameStore.season,
      weather: gameStore.weather,
      day: gameStore.day,
      year: gameStore.year
    })
  )

  /** 当前进度（主矿洞） */
  const currentFloor = ref(1)
  const safePointFloor = ref(0)
  const isExploring = ref(false)

  /** 骷髅矿穴状态 */
  const isInSkullCavern = ref(false)
  const skullCavernFloor = ref(0)
  const skullCavernBestFloor = ref(0)
  const skullSafePointFloor = ref(0)
  const cachedSkullFloorData = ref<SkullCavernFloorDef | null>(null)

  /** 战斗状态 */
  const inCombat = ref(false)
  const combatMonster = ref<MonsterDef | null>(null)
  const combatMonsterHp = ref(0)
  const combatRound = ref(0)
  const combatLog = ref<string[]>([])
  watch(
    () => combatLog.value.length,
    length => {
      const overflow = length - MINING_COMBAT_LOG_LIMIT
      if (overflow > 0) combatLog.value.splice(0, overflow)
    },
    { flush: 'sync' }
  )
  const combatIsBoss = ref(false)

  /** 已击败的 BOSS（首杀记录） */
  const defeatedBosses = ref<string[]>([])
  const potentialBossFirstRewardIds = ref<string[]>([])
  const mineBossPotentialRewardSequence = ref(0)

  /** 已领取过感染层清剿奖励的楼层 */
  const claimedInfestedRewardFloors = ref<number[]>([])

  /** 已领取过主矿洞BOSS楼层奖励的楼层 */
  const claimedBossRewardFloors = ref<number[]>([])
  /** 已领取过主矿洞 BOSS 戒指奖励的楼层 */
  const claimedBossRingRewardFloors = ref<number[]>([])
  /** 已领取过主矿洞 BOSS 帽子奖励的楼层 */
  const claimedBossHatRewardFloors = ref<number[]>([])
  /** 已领取过主矿洞 BOSS 鞋子奖励的楼层 */
  const claimedBossShoeRewardFloors = ref<number[]>([])

  /** 满包时保留的矿洞楼层奖励，避免卡死和重复发奖 */
  const pendingMineRewards = ref<PendingMineRewardEntry[]>([])
  const recentRewards = ref<MineRewardDisplayEntry[]>([])

  /** 本次探索收集的物品（离开时50%丢失用） */
  const sessionLoot = ref<SessionLootEntry[]>([])
  const miningStaminaDiscountCredit = ref(0)
  watch(
    () => `${gameStore.year}-${gameStore.season}-${gameStore.day}`,
    () => {
      miningStaminaDiscountCredit.value = 0
    }
  )

  /** 猎魔符效果：本次探索掉落率+20% */
  const slayerCharmActive = ref(false)
  /** 公会徽章累积攻击力加成（永久） */
  const guildBadgeBonusAttack = ref(0)
  /** 生命护符累积最大HP加成（永久） */
  const guildBonusMaxHp = ref(0)
  /** 幸运铜钱累积掉落率加成（永久，每次+0.05） */
  const guildBonusDropRate = ref(0)
  /** 守护符累积防御加成（永久，每次+0.03） */
  const guildBonusDefense = ref(0)

  // ==================== 格子探索状态 ====================

  /** 当前层的 6×6 格子 */
  const floorGrid = ref<MineTile[]>([])
  /** 入口格索引 */
  const entryIndex = ref(0)
  /** 是否已发现楼梯 */
  const stairsFound = ref(false)
  /** 楼梯是否可使用（感染/BOSS层需全清） */
  const stairsUsable = ref(false)
  /** 当前层怪物总数 */
  const totalMonstersOnFloor = ref(0)
  /** 已击败怪物数 */
  const monstersDefeatedCount = ref(0)
  /** 当前战斗对应的格子索引 */
  const _combatTileIndex = ref(-1)
  /** 当前楼层是否已使用过怪物诱饵 */
  const monsterLureUsedOnFloor = ref(false)
  /** 当前楼层深渊矿工已触发的保底炸弹返还次数 */
  const abyssMinerGuaranteedRefundsUsedOnFloor = ref(0)

  // ==================== 骷髅矿穴辅助 ====================

  /** 骷髅矿穴是否已解锁（击败60层BOSS） */
  const isSkullCavernUnlocked = (): boolean => {
    return defeatedBosses.value.includes('lava_lord')
  }

  /** 获取当前活跃楼层号 */
  const getActiveFloorNum = (): number => {
    return isInSkullCavern.value ? skullCavernFloor.value : currentFloor.value
  }

  /** 获取当前活跃楼层数据（兼容主矿洞与骷髅矿穴） */
  const getActiveFloorData = (): MineFloorDef | undefined => {
    if (isInSkullCavern.value) {
      const sc = cachedSkullFloorData.value
      if (!sc) return undefined
      return {
        floor: sc.floor,
        zone: 'abyss',
        ores: sc.ores,
        monsters: sc.monsters.map(m => scaleMonster(m, sc.scaleFactor)),
        isSafePoint: sc.isSafePoint,
        specialType: sc.specialType
      }
    }
    return getFloor(currentFloor.value)
  }

  const getFloorIntelMessage = (floor = getActiveFloorData()): string => {
    if (skillStore.getSkillMasteryEffectValue('floor_intel') <= 0 || !floor) return ''
    const specialLabels: Record<string, string> = {
      mushroom: '蘑菇洞穴',
      treasure: '宝箱层',
      infested: '感染层',
      dark: '暗河层',
      boss: 'BOSS层'
    }
    const lines: string[] = []
    const specialLabel = floor.specialType ? (specialLabels[floor.specialType] ?? '') : ''
    if (specialLabel) lines.push(`特殊层：${specialLabel}`)
    if (floor.ores.length > 0) {
      const oreNames = floor.ores.slice(0, 3).map(oreId => getItemById(oreId)?.name ?? oreId)
      lines.push(`主要矿石：${oreNames.join('、')}`)
    }
    return lines.length > 0 ? ` 层位情报：${lines.join('；')}。` : ''
  }

  const getVeinMarkerMessage = (): string => {
    if (skillStore.getSkillMasteryEffectValue('vein_marker') <= 0) return ''
    const candidates = floorGrid.value
      .filter(tile => tile.state === 'hidden' && (tile.type === 'ore' || tile.type === 'treasure' || tile.type === 'mushroom'))
      .map(tile => ({
        tile,
        score: getMineTileValueScore(tile),
        distance: Math.abs(Math.floor(tile.index / MINE_GRID_SIZE) - Math.floor(entryIndex.value / MINE_GRID_SIZE)) + Math.abs((tile.index % MINE_GRID_SIZE) - (entryIndex.value % MINE_GRID_SIZE))
      }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.distance - b.distance || a.tile.index - b.tile.index)
    const target = candidates[0]
    if (!target) return ''
    return ` 矿脉标记：入口${getRelativeMineDirection(entryIndex.value, target.tile.index)}方约${target.distance}步有${getMineTileValueLabel(target.tile)}反应。`
  }

  const getPotentialMineEntryHint = (floor = getActiveFloorData()): string => {
    if (usePotentialStore().getPotentialEffectValue('potential_mine_entry_hint') <= 0 || !floor) return ''
    const hints = [
      floor.isSafePoint ? '本层可作为落脚点。' : '先摸清楼梯或高威胁格再深推。',
      floor.specialType === 'boss' ? '首领层建议确认血量和补给。' : floor.specialType === 'infested' ? '怪物密集层优先清场。' : ''
    ].filter(Boolean)
    return ` 潜能感应：${hints.join('')}`
  }

  const getMineMasteryEntryHints = (floor = getActiveFloorData()): string => `${getFloorIntelMessage(floor)}${getVeinMarkerMessage()}${getPotentialMineEntryHint(floor)}`

  const getRootGuardRank = (): number => usePotentialStore().getNodeRank(ROOT_GUARD_NODE_ID)

  const getRootGuardDamageReduction = (): number =>
    usePotentialStore().getPotentialEffectValue(ROOT_GUARD_EFFECT_KEY)

  const applyRootGuardDamageReduction = (damage: number): number => {
    const reduction = getRootGuardDamageReduction()
    if (damage <= 0 || reduction <= 0) return damage
    return Math.max(1, Math.floor(damage * (1 - reduction)))
  }

  const getRootGuardReductionSuffix = (rawDamage: number, reducedDamage: number): string =>
    reducedDamage < rawDamage ? `（危息护命减免${rawDamage - reducedDamage}）` : ''

  const applyRootGuardBossWeakening = (monster: MonsterDef): MonsterDef => {
    if (getRootGuardRank() < ROOT_GUARD_BOSS_WEAKEN_RANK) return { ...monster }
    return {
      ...monster,
      hp: Math.max(1, Math.floor(monster.hp * ROOT_GUARD_BOSS_STAT_MULTIPLIER)),
      attack: Math.max(1, Math.floor(monster.attack * ROOT_GUARD_BOSS_STAT_MULTIPLIER)),
      defense: Math.max(0, Math.floor(monster.defense * ROOT_GUARD_BOSS_STAT_MULTIPLIER))
    }
  }

  const getRootGuardBossWeakenSuffix = (baseMonster: MonsterDef, runtimeMonster: MonsterDef): string =>
    runtimeMonster.hp < baseMonster.hp || runtimeMonster.attack < baseMonster.attack || runtimeMonster.defense < baseMonster.defense
      ? '（危息护命压制）'
      : ''

  const triggerRootGuardShockwave = (originIndex: number): number => {
    if (getRootGuardRank() < ROOT_GUARD_SHOCKWAVE_RANK || originIndex < 0) return 0
    let defeated = 0
    for (const adjacentIndex of getAdjacentIndices(originIndex)) {
      const adjacentTile = floorGrid.value[adjacentIndex]
      if (!adjacentTile || adjacentTile.type !== 'monster' || adjacentTile.state === 'defeated') continue
      adjacentTile.state = 'defeated'
      defeated++
      useAchievementStore().recordMonsterKill()
      const adjacentMonster = adjacentTile.data?.monster
      if (adjacentMonster) useGuildStore().recordKill(adjacentMonster.id)
    }
    return defeated
  }

  const getBossDossierMessage = (monster: MonsterDef, isFirstKill: boolean): string => {
    if (skillStore.getSkillMasteryEffectValue('boss_dossier') <= 0) return ''
    const weakPoint = monster.defense >= monster.attack ? '优先破防或使用高攻击武器' : '优先稳血，避免长回合换血'
    const rematchHint = isFirstKill ? '' : '；复战弱点：该首领已被记录，弱化版更适合速战'
    return ` 首领档案：生命${monster.hp}，攻击${monster.attack}，防御${monster.defense}；${weakPoint}${rematchHint}。`
  }

  const recordItemLoot = (itemId: string, quantity: number) => {
    if (quantity <= 0) return
    sessionLoot.value.push({ kind: 'item', itemId, quantity })
  }

  const mergeRewardEntries = (entries: InventoryRewardEntry[]): { itemId: string; quantity: number; quality?: Quality }[] => {
    const merged = new Map<string, { itemId: string; quantity: number; quality?: Quality }>()
    for (const entry of entries) {
      if (entry.quantity <= 0) continue
      const quality = entry.quality ?? 'normal'
      const key = `${entry.itemId}::${quality}`
      const current = merged.get(key)
      if (current) {
        current.quantity += entry.quantity
      } else {
        merged.set(key, { itemId: entry.itemId, quantity: entry.quantity, quality })
      }
    }
    return [...merged.values()]
  }

  const buildRewardDisplayEntries = (entries: InventoryRewardEntry[]): MineRewardDisplayEntry[] => {
    return mergeRewardEntries(entries).map(entry => {
      const name = getItemById(entry.itemId)?.name ?? entry.itemId
      return {
        itemId: entry.itemId,
        quantity: entry.quantity,
        quality: entry.quality,
        label: `${name}×${entry.quantity}`
      }
    })
  }

  const buildMoneyRewardDisplayEntry = (amount: number): MineRewardDisplayEntry | null => {
    if (amount <= 0) return null
    return { itemId: 'money', quantity: amount, label: `铜钱×${amount}` }
  }

  const setRecentRewards = (rewards: MineRewardDisplayEntry[]) => {
    recentRewards.value = rewards.slice(0, 12)
  }

  const clearRecentRewards = () => {
    recentRewards.value = []
  }

  const formatRewardLabels = (rewards: MineRewardDisplayEntry[]): string => rewards.map(reward => reward.label).join('、')

  const formatMiningStaminaCostTag = (staminaCost: number): string => {
    return staminaCost > 0 ? `-${staminaCost}体力` : '体力减免生效'
  }

  const calculateMiningExpForRewardEntries = (entries: InventoryRewardEntry[]): number => {
    return entries.reduce((total, entry) => {
      const itemExp = MINING_ITEM_EXP[entry.itemId] ?? 0
      return total + itemExp * Math.max(0, Math.floor(entry.quantity))
    }, 0)
  }

  const addMiningExpForRewardEntries = (entries: InventoryRewardEntry[]): number => {
    const baseExp = calculateMiningExpForRewardEntries(entries)
    if (baseExp <= 0) return 0
    const hilltopXpBonus = gameStore.farmMapType === 'hilltop' ? 1.25 : 1.0
    const exp = Math.floor(baseExp * hilltopXpBonus)
    if (exp > 0) skillStore.addExp('mining', exp)
    return exp
  }

  const calculateOreQuantityWithBonuses = (baseQuantity: number, oreMultiplier = 1): number => {
    let quantity = Math.max(1, Math.floor(baseQuantity * oreMultiplier))

    // 矿石数量加成统一走这里；稀矿转化等手动采矿专属额外奖励仍留在手动采矿流程。
    const miningSkill = skillStore.getSkill('mining')
    if (miningSkill.perk5 === 'miner' && Math.random() < 0.5) quantity += 1
    if (gameStore.farmMapType === 'hilltop' && Math.random() < 0.5) quantity += 1
    if (miningSkill.perk10 === 'prospector' && Math.random() < 0.15) quantity *= 2
    if ((miningSkill.perk15 === 'vein_seeker' || miningSkill.perk15 === 'master_smith') && Math.random() < 0.3) quantity *= 2
    if ((miningSkill.perk20 === 'earth_pulse' || miningSkill.perk20 === 'forge_god') && Math.random() < 0.5) quantity = Math.floor(quantity * 3)

    const ringOreBonus = inventoryStore.getRingEffectValue('ore_bonus')
    if (ringOreBonus > 0) {
      const fixedOreBonus = Math.floor(ringOreBonus)
      const fractionalOreBonus = ringOreBonus - fixedOreBonus
      quantity += fixedOreBonus
      if (fractionalOreBonus > 0 && Math.random() < fractionalOreBonus) quantity += 1
    }
    if (environmentWindow.value.mining.oreBonusChance > 0 && Math.random() < environmentWindow.value.mining.oreBonusChance) quantity += 1
    const generousPickChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_ore_bonus_chance')
    if (generousPickChance > 0 && Math.random() < generousPickChance) quantity += 1
    const cookingOreBonusChance = useCookingStore().getActiveMiningOreBonusChance()
    if (cookingOreBonusChance > 0 && Math.random() < cookingOreBonusChance) quantity += 1
    if (useHiddenNpcStore().isAbilityActive('hu_xian_2') && Math.random() < 0.15) quantity += 1

    return quantity
  }

  const canGrantRewardEntries = (entries: InventoryRewardEntry[]): boolean => {
    const merged = mergeRewardEntries(entries)
    if (merged.length === 0) return true
    return inventoryStore.canAddItems(merged)
  }

  const grantRewardEntries = (entries: InventoryRewardEntry[], discover: boolean = false): boolean => {
    const merged = mergeRewardEntries(entries)
    if (merged.length === 0) return true
    if (!inventoryStore.addItemsExact(merged)) return false
    for (const entry of merged) {
      recordItemLoot(entry.itemId, entry.quantity)
      if (discover) useAchievementStore().discoverItem(entry.itemId)
    }
    return true
  }

  const addAndRecordItemLoot = (itemId: string, quantity: number, quality: Quality = 'normal'): number => {
    if (quantity <= 0) return 0
    if (!inventoryStore.addItemExact(itemId, quantity, quality)) return 0
    recordItemLoot(itemId, quantity)
    return quantity
  }

  const recordMoneyLoot = (amount: number) => {
    if (amount <= 0) return
    sessionLoot.value.push({ kind: 'money', amount })
  }

  const recordWeaponLoot = (defId: string, enchantmentId: string | null, affixes?: ForgeAffixRoll[] | null) => {
    sessionLoot.value.push({ kind: 'weapon', defId, enchantmentId, affixes: cloneForgeAffixes(affixes) })
  }

  const recordRingLoot = (defId: string) => {
    sessionLoot.value.push({ kind: 'ring', defId })
  }

  const recordHatLoot = (defId: string) => {
    sessionLoot.value.push({ kind: 'hat', defId })
  }

  const recordShoeLoot = (defId: string) => {
    sessionLoot.value.push({ kind: 'shoe', defId })
  }

  const rollbackLootEntry = (entry: SessionLootEntry) => {
    switch (entry.kind) {
      case 'item':
        inventoryStore.removeItemAnywhere(entry.itemId, entry.quantity)
        break
      case 'money':
        playerStore.spendMoney(Math.min(playerStore.money, entry.amount))
        break
      case 'weapon':
        inventoryStore.removeWeapon(entry.defId, entry.enchantmentId, entry.affixes)
        break
      case 'ring':
        inventoryStore.removeRing(entry.defId)
        break
      case 'hat':
        inventoryStore.removeHat(entry.defId)
        break
      case 'shoe':
        inventoryStore.removeShoe(entry.defId)
        break
    }
  }

  const getPendingMineRewardId = (kind: PendingMineRewardKind, floorNum: number) => `${kind}:${floorNum}`

  const getPendingMineReward = (kind: PendingMineRewardKind, floorNum: number) =>
    pendingMineRewards.value.find(reward => reward.id === getPendingMineRewardId(kind, floorNum)) ?? null

  const queuePendingMineReward = (reward: PendingMineRewardEntry) => {
    if (pendingMineRewards.value.some(entry => entry.id === reward.id)) return
    pendingMineRewards.value.push(reward)
  }

  const removePendingMineReward = (rewardId: string) => {
    pendingMineRewards.value = pendingMineRewards.value.filter(reward => reward.id !== rewardId)
  }

  const grantPendingMineReward = (reward: PendingMineRewardEntry): MineRewardClaimResult => {
    if (!canGrantRewardEntries(reward.itemRewards) || !grantRewardEntries(reward.itemRewards, true)) {
      return {
        granted: false,
        pending: true,
        message: '背包空间不足，暂存矿洞奖励仍未领取。请先整理主背包或临时背包。'
      }
    }

    if (reward.weaponReward) {
      inventoryStore.addWeapon(reward.weaponReward.defId, reward.weaponReward.enchantmentId, reward.weaponReward.affixes)
      recordWeaponLoot(reward.weaponReward.defId, reward.weaponReward.enchantmentId, reward.weaponReward.affixes)
    }
    if (reward.ringRewardId) {
      inventoryStore.addRing(reward.ringRewardId)
      recordRingLoot(reward.ringRewardId)
    }
    if (reward.hatRewardId) {
      inventoryStore.addHat(reward.hatRewardId)
      recordHatLoot(reward.hatRewardId)
    }
    if (reward.shoeRewardId) {
      inventoryStore.addShoe(reward.shoeRewardId)
      recordShoeLoot(reward.shoeRewardId)
    }
    if (reward.money > 0) {
      playerStore.earnMoney(reward.money)
      recordMoneyLoot(reward.money)
    }

    removePendingMineReward(reward.id)
    return { granted: true, pending: false, message: reward.message }
  }

  const claimPendingMineRewards = (): { success: boolean; message: string } => {
    if (pendingMineRewards.value.length <= 0) {
      return { success: false, message: '当前没有暂存的矿洞奖励。' }
    }

    const messages: string[] = []
    for (const reward of [...pendingMineRewards.value]) {
      const result = grantPendingMineReward(reward)
      if (!result.granted) {
        const prefix = messages.length > 0 ? `${messages.join(' ')} ` : ''
        return { success: false, message: `${prefix}${result.message}`.trim() }
      }
      if (result.message) messages.push(result.message.trim())
    }

    return { success: true, message: messages.join(' ') || '已领取暂存的矿洞奖励。' }
  }

  const grantInfestedClearRewards = (floorNum: number): MineRewardClaimResult => {
    const pendingReward = getPendingMineReward('infested_clear', floorNum)
    if (pendingReward) {
      return grantPendingMineReward(pendingReward)
    }
    if (claimedInfestedRewardFloors.value.includes(floorNum)) {
      return { granted: false, pending: false, message: '' }
    }
    const clearRewards = getInfestedClearRewards(floorNum)
    const rewardEntries = clearRewards.items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    const message = ` 感染层清除完毕！获得${getRewardNames(clearRewards.items)}和${clearRewards.money}文！`
    if (!canGrantRewardEntries(rewardEntries)) {
      queuePendingMineReward({
        id: getPendingMineRewardId('infested_clear', floorNum),
        kind: 'infested_clear',
        floorNum,
        itemRewards: rewardEntries,
        money: clearRewards.money,
        weaponReward: null,
        ringRewardId: null,
        hatRewardId: null,
        shoeRewardId: null,
        message
      })
      claimedInfestedRewardFloors.value.push(floorNum)
      return {
        granted: false,
        pending: true,
        message: ' 背包空间不足，感染层奖励已暂存。可以先离开整理背包，再回到矿洞面板领取。'
      }
    }
    if (!grantRewardEntries(rewardEntries, true)) {
      queuePendingMineReward({
        id: getPendingMineRewardId('infested_clear', floorNum),
        kind: 'infested_clear',
        floorNum,
        itemRewards: rewardEntries,
        money: clearRewards.money,
        weaponReward: null,
        ringRewardId: null,
        hatRewardId: null,
        shoeRewardId: null,
        message
      })
      claimedInfestedRewardFloors.value.push(floorNum)
      return {
        granted: false,
        pending: true,
        message: ' 背包空间不足，感染层奖励已暂存。可以先离开整理背包，再回到矿洞面板领取。'
      }
    }
    playerStore.earnMoney(clearRewards.money)
    recordMoneyLoot(clearRewards.money)
    claimedInfestedRewardFloors.value.push(floorNum)
    return {
      granted: true,
      pending: false,
      message
    }
  }

  const hasPendingMainMineBossRewards = (floorNum: number): boolean => {
    if (getPendingMineReward('main_mine_boss', floorNum)) return true
    const bossId = BOSS_MONSTERS[floorNum]?.id
    if (bossId && !defeatedBosses.value.includes(bossId)) return true
    if (!claimedBossRewardFloors.value.includes(floorNum)) return true
    if (BOSS_DROP_RINGS[floorNum] && !claimedBossRingRewardFloors.value.includes(floorNum)) return true
    if (BOSS_DROP_HATS[floorNum] && !claimedBossHatRewardFloors.value.includes(floorNum)) return true
    if (BOSS_DROP_SHOES[floorNum] && !claimedBossShoeRewardFloors.value.includes(floorNum)) return true
    return false
  }

  const hasPendingInfestedClearRewards = (floorNum: number): boolean => {
    if (getPendingMineReward('infested_clear', floorNum)) return true
    return !claimedInfestedRewardFloors.value.includes(floorNum)
  }

  const reserveMainMineBossRewardState = ({
    floorNum,
    bossId,
    shouldGrantFirstKill,
    shouldGrantMainReward,
    bossRingId,
    bossHatId,
    bossShoeId
  }: {
    floorNum: number
    bossId: string | null
    shouldGrantFirstKill: boolean
    shouldGrantMainReward: boolean
    bossRingId: string | null
    bossHatId: string | null
    bossShoeId: string | null
  }) => {
    if (shouldGrantFirstKill && bossId && !defeatedBosses.value.includes(bossId)) {
      defeatedBosses.value.push(bossId)
    }
    if (shouldGrantMainReward && !claimedBossRewardFloors.value.includes(floorNum)) {
      claimedBossRewardFloors.value.push(floorNum)
    }
    if (bossRingId && !claimedBossRingRewardFloors.value.includes(floorNum)) {
      claimedBossRingRewardFloors.value.push(floorNum)
    }
    if (bossHatId && !claimedBossHatRewardFloors.value.includes(floorNum)) {
      claimedBossHatRewardFloors.value.push(floorNum)
    }
    if (bossShoeId && !claimedBossShoeRewardFloors.value.includes(floorNum)) {
      claimedBossShoeRewardFloors.value.push(floorNum)
    }
  }

  const claimMineBossPotentialReward = ({
    source,
    floorNum,
    bossId,
    reason
  }: {
    source: 'main' | 'skull'
    floorNum: number
    bossId: string | null
    reason: string
  }): string => {
    const normalizedBossId = bossId ?? 'boss'
    const shouldGuaranteePotential = !!bossId && !potentialBossFirstRewardIds.value.includes(bossId)
    const replayChance = getMineBossPotentialReplayChance(floorNum)
    if (!shouldGuaranteePotential && Math.random() >= replayChance) return ''

    const repeatSource = source === 'main' ? 'main-repeat' : 'skull-repeat'
    const eventKey = shouldGuaranteePotential
      ? `boss-first:${normalizedBossId}`
      : `${repeatSource}:${floorNum}:${normalizedBossId}:${mineBossPotentialRewardSequence.value + 1}`
    if (!shouldGuaranteePotential) mineBossPotentialRewardSequence.value += 1

    const potentialReward = usePotentialStore().claimPotentialSourceReward('mine_boss_clear', eventKey, { reason })
    if (!potentialReward.success) return ''
    if (shouldGuaranteePotential && bossId && !potentialBossFirstRewardIds.value.includes(bossId)) {
      potentialBossFirstRewardIds.value.push(bossId)
    }
    return ' 潜能材料有所沉淀。'
  }

  const grantMainMineBossRewards = (floorNum: number): MineRewardClaimResult => {
    const pendingReward = getPendingMineReward('main_mine_boss', floorNum)
    if (pendingReward) {
      return grantPendingMineReward(pendingReward)
    }
    const bossId = BOSS_MONSTERS[floorNum]?.id ?? null
    if (!hasPendingMainMineBossRewards(floorNum)) {
      const potentialMessage = claimMineBossPotentialReward({
        source: 'main',
        floorNum,
        bossId,
        reason: `矿洞第${floorNum}层首领复战`
      })
      return { granted: !!potentialMessage, pending: false, message: potentialMessage }
    }

    const shouldGrantFirstKill = !!bossId && !defeatedBosses.value.includes(bossId)
    const shouldGrantMainReward = !claimedBossRewardFloors.value.includes(floorNum)
    const weaponId = shouldGrantFirstKill ? (BOSS_DROP_WEAPONS[floorNum] ?? null) : null
    const bossRingId = !claimedBossRingRewardFloors.value.includes(floorNum) ? (BOSS_DROP_RINGS[floorNum] ?? null) : null
    const bossHatId = !claimedBossHatRewardFloors.value.includes(floorNum) ? (BOSS_DROP_HATS[floorNum] ?? null) : null
    const bossShoeId = !claimedBossShoeRewardFloors.value.includes(floorNum) ? (BOSS_DROP_SHOES[floorNum] ?? null) : null
    const oreRewards = shouldGrantMainReward ? BOSS_ORE_REWARDS[floorNum] : undefined
    const rewardEntries = oreRewards?.map(ore => ({ itemId: ore.itemId, quantity: ore.quantity })) ?? []

    let message = ''
    let oreRewardMessage = ''
    if (oreRewards) oreRewardMessage = ` 获得了${getRewardNames(oreRewards)}！`

    const fixedEnchantmentId = weaponId ? (getWeaponById(weaponId)?.fixedEnchantment ?? null) : null
    const weaponReward =
      shouldGrantFirstKill && weaponId
        ? {
            defId: weaponId,
            enchantmentId: null,
            affixes: migrateLegacyEnchantmentToAffixes('weapon', fixedEnchantmentId)
          }
        : null

    if (shouldGrantFirstKill && bossId) {
      if (weaponId) {
        const displayName = getWeaponDisplayName(weaponId, null, weaponReward?.affixes)
        message += ` 首次击败BOSS！获得了传说武器：${displayName}！`
      }
    }

    if (bossRingId) {
      const bossRingDef = getRingById(bossRingId)
      message += ` 获得了戒指：${bossRingDef?.name ?? bossRingId}！`
    }

    if (bossHatId) {
      const bossHatDef = getHatById(bossHatId)
      message += ` 获得了帽子：${bossHatDef?.name ?? bossHatId}！`
    }

    if (bossShoeId) {
      const bossShoeDef = getShoeById(bossShoeId)
      message += ` 获得了鞋子：${bossShoeDef?.name ?? bossShoeId}！`
    }

    const bossPressureBonus = skillStore.getSkillMasteryEffectValue('boss_pressure')
    const baseMoneyReward = shouldGrantMainReward ? (BOSS_MONEY_REWARDS[floorNum] ?? 0) : 0
    const moneyReward = applySkillMasteryBonus(baseMoneyReward, bossPressureBonus)
    if (moneyReward > 0) {
      message += ` 获得${moneyReward}文！`
      if (bossPressureBonus > 0 && moneyReward > baseMoneyReward) message += '（首领压制）'
    }
    message += claimMineBossPotentialReward({
      source: 'main',
      floorNum,
      bossId,
      reason: `矿洞第${floorNum}层首领`
    })

    if (oreRewardMessage) {
      message += oreRewardMessage
    }

    const pendingBossReward: PendingMineRewardEntry = {
      id: getPendingMineRewardId('main_mine_boss', floorNum),
      kind: 'main_mine_boss',
      floorNum,
      itemRewards: rewardEntries,
      money: moneyReward,
      weaponReward,
      ringRewardId: bossRingId,
      hatRewardId: bossHatId,
      shoeRewardId: bossShoeId,
      message
    }

    if (!canGrantRewardEntries(rewardEntries)) {
      reserveMainMineBossRewardState({ floorNum, bossId, shouldGrantFirstKill, shouldGrantMainReward, bossRingId, bossHatId, bossShoeId })
      queuePendingMineReward(pendingBossReward)
      return {
        granted: false,
        pending: true,
        message: ' 背包空间不足，BOSS 楼层奖励已暂存。可以先离开整理背包，再回到矿洞面板领取。'
      }
    }

    const claimResult = grantPendingMineReward(pendingBossReward)
    if (!claimResult.granted) {
      reserveMainMineBossRewardState({ floorNum, bossId, shouldGrantFirstKill, shouldGrantMainReward, bossRingId, bossHatId, bossShoeId })
      queuePendingMineReward(pendingBossReward)
      return {
        granted: false,
        pending: true,
        message: ' 背包空间不足，BOSS 楼层奖励已暂存。可以先离开整理背包，再回到矿洞面板领取。'
      }
    }

    reserveMainMineBossRewardState({ floorNum, bossId, shouldGrantFirstKill, shouldGrantMainReward, bossRingId, bossHatId, bossShoeId })
    return { granted: true, pending: false, message }
  }

  const ensureCurrentFloorRewardsClaimed = (options: { blockOnPending?: boolean } = {}): { success: boolean; message: string } => {
    const blockOnPending = options.blockOnPending ?? true
    if (!isExploring.value || isInSkullCavern.value) return { success: true, message: '' }
    const floor = getActiveFloorData()
    if (!floor) return { success: true, message: '' }

    if (floor.specialType === 'boss' && stairsUsable.value && hasPendingMainMineBossRewards(currentFloor.value)) {
      const result = grantMainMineBossRewards(currentFloor.value)
      if (!result.granted && (!result.pending || blockOnPending)) {
        return { success: false, message: result.message.trim() || '请先领取 BOSS 楼层奖励。' }
      }
      if (result.message && result.pending && !blockOnPending) return { success: true, message: result.message.trim() }
    }

    if (
      floor.specialType === 'infested' &&
      monstersDefeatedCount.value >= totalMonstersOnFloor.value &&
      totalMonstersOnFloor.value > 0 &&
      hasPendingInfestedClearRewards(getActiveFloorNum())
    ) {
      const result = grantInfestedClearRewards(getActiveFloorNum())
      if (!result.granted && (!result.pending || blockOnPending)) {
        return { success: false, message: result.message.trim() || '请先领取感染层清剿奖励。' }
      }
      if (result.message && result.pending && !blockOnPending) return { success: true, message: result.message.trim() }
    }

    return { success: true, message: '' }
  }

  const normalizeMainMineStartSafePoint = (startFromSafePoint?: number): number => {
    if (startFromSafePoint === undefined) return safePointFloor.value
    const requested = Math.floor(Number(startFromSafePoint))
    if (!Number.isFinite(requested) || requested < 0 || requested > safePointFloor.value || requested % 5 !== 0) {
      return safePointFloor.value
    }
    return requested
  }

  const getMainMineEntryFloor = (startFromSafePoint?: number): number => {
    return Math.min(normalizeMainMineStartSafePoint(startFromSafePoint) + 1, MAX_MINE_FLOOR)
  }

  const normalizeSkullCavernStartSafePoint = (startFromSafePoint?: number): number => {
    if (startFromSafePoint === undefined) return skullSafePointFloor.value
    const requested = Math.floor(Number(startFromSafePoint))
    if (!Number.isFinite(requested) || requested < 0 || requested > skullSafePointFloor.value || requested % 10 !== 0) {
      return skullSafePointFloor.value
    }
    return requested
  }

  const getSkullCavernEntryFloor = (startFromSafePoint?: number): number => {
    return normalizeSkullCavernStartSafePoint(startFromSafePoint) + 1
  }

  const canRecordMainMineSafePoint = (floor: MineFloorDef | undefined): floor is MineFloorDef => {
    if (!floor?.isSafePoint) return false
    if (floor.specialType !== 'boss') return true
    const bossId = BOSS_MONSTERS[floor.floor]?.id
    return stairsUsable.value && (!bossId || defeatedBosses.value.includes(bossId))
  }

  const recordMainMineSafePoint = (floor = getActiveFloorData()): boolean => {
    if (isInSkullCavern.value || !canRecordMainMineSafePoint(floor)) return false
    if (floor.floor <= safePointFloor.value) return false
    safePointFloor.value = floor.floor
    return true
  }

  const canRecordSkullCavernSafePoint = (floor: SkullCavernFloorDef | null | undefined): floor is SkullCavernFloorDef => {
    if (!floor?.isSafePoint) return false
    if (floor.specialType !== 'boss') return true
    return stairsUsable.value
  }

  const recordSkullCavernSafePoint = (floor = cachedSkullFloorData.value): boolean => {
    if (!isInSkullCavern.value || !canRecordSkullCavernSafePoint(floor)) return false
    if (floor.floor <= skullSafePointFloor.value) return false
    skullSafePointFloor.value = floor.floor
    return true
  }

  /** 生成并缓存骷髅矿穴当前层数据 */
  const cacheSkullFloor = (floor: number) => {
    cachedSkullFloorData.value = generateSkullCavernFloor(floor)
  }

  // ==================== 格子生成 ====================

  /** 生成当前层的 6×6 格子 */
  const _generateGrid = () => {
    const floor = getActiveFloorData()
    if (!floor) return

    abyssMinerGuaranteedRefundsUsedOnFloor.value = 0
    const floorNum = getActiveFloorNum()
    const scaleFactor = isInSkullCavern.value ? (cachedSkullFloorData.value?.scaleFactor ?? 1) : 1

    // BOSS 层首杀检测：替换 BOSS 数据
    let floorForGrid = floor
    if (floor.specialType === 'boss' && !isInSkullCavern.value) {
      const bossId = BOSS_MONSTERS[currentFloor.value]?.id
      const isFirstKill = bossId ? !defeatedBosses.value.includes(bossId) : true
      if (!isFirstKill) {
        // 弱化版 BOSS — 需要在格子生成后替换
        // generateFloorGrid 会使用原始 BOSS，我们在这里覆盖
        const result = generateFloorGrid(floorForGrid, floorNum, isInSkullCavern.value, scaleFactor)
        // 替换 BOSS 格的怪物为弱化版
        const weakBoss = getWeakenedBoss(currentFloor.value)
        if (weakBoss) {
          for (const tile of result.tiles) {
            if (tile.type === 'boss' && tile.data?.monster) {
              tile.data.monster = weakBoss
            }
          }
        }
        floorGrid.value = result.tiles
        entryIndex.value = result.entryIndex
        totalMonstersOnFloor.value = result.totalMonsters
        monstersDefeatedCount.value = 0
        stairsFound.value = false
        stairsUsable.value = result.stairsUsable
        _combatTileIndex.value = -1
        monsterLureUsedOnFloor.value = false
        return
      }
    }

    const result = generateFloorGrid(floorForGrid, floorNum, isInSkullCavern.value, scaleFactor)
    floorGrid.value = result.tiles
    entryIndex.value = result.entryIndex
    totalMonstersOnFloor.value = result.totalMonsters
    monstersDefeatedCount.value = 0
    stairsFound.value = false
    stairsUsable.value = result.stairsUsable
    _combatTileIndex.value = -1
    monsterLureUsedOnFloor.value = false
  }

  // ==================== 格子交互 ====================

  /** 与已揭示的怪物/BOSS重新交战（逃跑后或炸弹揭示后） */
  const engageRevealedMonster = (index: number): MineActionResult => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。', startsCombat: false }
    if (inCombat.value) return { success: false, message: '战斗中无法探索。', startsCombat: false }

    const tile = floorGrid.value[index]
    if (!tile || tile.state !== 'revealed') return { success: false, message: '无法交战。', startsCombat: false }
    if (tile.type !== 'monster' && tile.type !== 'boss') return { success: false, message: '该格子没有怪物。', startsCombat: false }

    const monster = tile.data?.monster
    if (!monster) return { success: false, message: '该格子没有怪物。', startsCombat: false }

    _combatTileIndex.value = tile.index
    const runtimeMonster = tile.type === 'boss' ? applyRootGuardBossWeakening(monster) : { ...monster }
    combatMonster.value = runtimeMonster
    combatMonsterHp.value = runtimeMonster.hp
    combatRound.value = 0

    if (tile.type === 'boss') {
      const isFirstKill = !defeatedBosses.value.includes(monster.id)
      combatLog.value = [`BOSS战！再次挑战${monster.name}！(HP: ${runtimeMonster.hp})${isFirstKill ? '' : '（弱化版）'}${getRootGuardBossWeakenSuffix(monster, runtimeMonster)}${getBossDossierMessage(monster, isFirstKill)}`]
      combatIsBoss.value = true
    } else {
      combatLog.value = [`再次遭遇${monster.name}！(HP: ${monster.hp})`]
      combatIsBoss.value = false
    }
    inCombat.value = true

    return { success: true, message: `与${monster.name}交战！`, startsCombat: true }
  }

  /** 检查格子是否可翻开 */
  const canRevealTile = (index: number): boolean => {
    const tile = floorGrid.value[index]
    if (!tile || tile.state !== 'hidden') return false
    // 必须有至少一个已翻开的邻格
    const adj = getAdjacentIndices(index)
    return adj.some(a => {
      const t = floorGrid.value[a]
      return t && t.state !== 'hidden'
    })
  }

  /** 翻开格子 — 核心交互入口 */
  const revealTile = (index: number): MineActionResult => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。', startsCombat: false }
    if (inCombat.value) return { success: false, message: '战斗中无法探索。', startsCombat: false }

    const tile = floorGrid.value[index]
    if (!tile || tile.state !== 'hidden') return { success: false, message: '无法翻开该格子。', startsCombat: false }
    if (!canRevealTile(index)) return { success: false, message: '只能翻开已探索格子的相邻位置。', startsCombat: false }

    // 检查镐是否可用（未在升级中）
    if (!inventoryStore.isToolAvailable('pickaxe')) {
      return { success: false, message: '镐正在升级中，无法探索矿洞。', startsCombat: false }
    }

    // 扣体力（1 点基础，受镐/技能/buff 减免）
    const pickaxeMultiplier = inventoryStore.getToolStaminaMultiplier('pickaxe')
    const cookingStore = useCookingStore()
    const miningBuff = cookingStore.getActiveMiningStaminaReduction()
    const alchemyMiningBuff = cookingStore.getActiveAlchemyMiningStaminaReduction()
    const walletStore = useWalletStore()
    const walletMiningReduction = walletStore.getMiningStaminaReduction()
    const ringMiningReduction = inventoryStore.getRingEffectValue('mining_stamina')
    const ringGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    const blessingMiningReduction = skillStore.getBlessingEffectValue('mining_stamina')
    // 仙缘能力：聚气（shan_weng_1）挖矿体力-15%
    const spiritMiningReduction = useHiddenNpcStore().getAbilityValue('shan_weng_1') / 100
    const rawStaminaCost =
      MINING_BASE_STAMINA_COST *
      environmentWindow.value.mining.staminaCostMultiplier *
      pickaxeMultiplier *
      (1 - skillStore.getStaminaReduction('mining')) *
      (1 - miningBuff) *
      (1 - alchemyMiningBuff) *
      (1 - walletMiningReduction) *
      (1 - ringMiningReduction) *
      (1 - ringGlobalReduction) *
      (1 - blessingMiningReduction) *
      (1 - spiritMiningReduction)
    const resolvedStaminaCost = resolveFractionalStaminaCost(rawStaminaCost, miningStaminaDiscountCredit.value)
    const staminaCost = resolvedStaminaCost.cost
    if (staminaCost > 0 && !playerStore.consumeStamina(staminaCost, { source: 'tool' })) {
      return { success: false, message: '体力不足，无法探索。', startsCombat: false }
    }
    miningStaminaDiscountCredit.value = resolvedStaminaCost.discountCredit
    if (staminaCost > 0) {
      useGoalStore().recordWeeklyActivityCounter('mining_stamina_spent', staminaCost)
    }

    // 3% 概率获得秘密笔记
    if (Math.random() < 0.03) {
      useSecretNoteStore().tryCollectNote('mining')
    }
    clearRecentRewards()

    // 根据类型处理
    switch (tile.type) {
      case 'empty':
        return _handleEmptyTile(tile, staminaCost)
      case 'ore':
        return _handleOreTile(tile, staminaCost)
      case 'monster':
        return _handleMonsterTile(tile, staminaCost)
      case 'boss':
        return _handleBossTile(tile, staminaCost)
      case 'stairs':
        return _handleStairsTile(tile, staminaCost)
      case 'trap':
        return _handleTrapTile(tile, staminaCost)
      case 'treasure':
        return _handleTreasureTile(tile, staminaCost)
      case 'mushroom':
        return _handleMushroomTile(tile, staminaCost)
      default:
        tile.state = 'revealed'
        return { success: true, message: '空无一物。', startsCombat: false }
    }
  }

  /** 处理空格子 */
  const _handleEmptyTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    tile.state = 'revealed'
    const stoneChipsChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_stone_chips_chance')
    if (stoneChipsChance > 0 && Math.random() < stoneChipsChance) {
      const rewards: InventoryRewardEntry[] = [{ itemId: 'stone', quantity: 1 }]
      if (canGrantRewardEntries(rewards) && grantRewardEntries(rewards, true)) {
        const rewardDisplays = buildRewardDisplayEntries(rewards)
        setRecentRewards(rewardDisplays)
        addMiningExpForRewardEntries(rewards)
        return {
          success: true,
          message: `探索了一个空区域，石屑附魔敲下了${formatRewardLabels(rewardDisplays)}。(${formatMiningStaminaCostTag(staminaCost)})`,
          startsCombat: false,
          rewards: rewardDisplays
        }
      }
    }
    return { success: true, message: `探索了一个空区域。(${formatMiningStaminaCostTag(staminaCost)})`, startsCombat: false }
  }

  /** 处理矿石格子 */
  const _handleOreTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const oreId = tile.data?.oreId ?? 'copper_ore'
    const quantity = calculateOreQuantityWithBonuses(tile.data?.oreQuantity ?? 1)

    const hiddenNpcStore = useHiddenNpcStore()
    const herbRewards: InventoryRewardEntry[] = []
    if (hiddenNpcStore.isAbilityActive('shan_weng_2') && Math.random() < 0.15) {
      const herbs = ['herb', 'ginseng'] as const
      const herbId = herbs[Math.floor(Math.random() * herbs.length)]!
      herbRewards.push({ itemId: herbId, quantity: 1 })
    }

    const rareTransmuteChance = skillStore.getSkillMasteryEffectValue('rare_transmute')
    const rareTransmuteOreId = rareTransmuteChance > 0 && Math.random() < rareTransmuteChance ? getRareTransmuteOre(oreId) : null
    const rareTransmuteRewards: InventoryRewardEntry[] = rareTransmuteOreId ? [{ itemId: rareTransmuteOreId, quantity: 1 }] : []
    const oreSmelterChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_ore_smelter_chance')
    const treasureSenseChance = inventoryStore.getToolAffixEffectValue('pickaxe', 'pickaxe_treasure_sense_chance')
    const oreSmelterOreId = oreSmelterChance > 0 && Math.random() < oreSmelterChance ? getRareTransmuteOre(oreId) : null
    const oreSmelterRewards: InventoryRewardEntry[] = oreSmelterOreId ? [{ itemId: oreSmelterOreId, quantity: 1 }] : []
    const treasureSenseItemId = treasureSenseChance > 0 && Math.random() < treasureSenseChance ? rollTreasureSenseReward() : null
    const treasureSenseRewards: InventoryRewardEntry[] = treasureSenseItemId ? [{ itemId: treasureSenseItemId, quantity: 1 }] : []
    const rewardEntries: InventoryRewardEntry[] = [
      { itemId: oreId, quantity },
      ...herbRewards,
      ...rareTransmuteRewards,
      ...oreSmelterRewards,
      ...treasureSenseRewards
    ]
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法收取矿石。', startsCombat: false }
    }
    const rewards = buildRewardDisplayEntries(rewardEntries)
    setRecentRewards(rewards)

    useQuestStore().onItemObtained(oreId, quantity)
    if (rareTransmuteOreId) useQuestStore().onItemObtained(rareTransmuteOreId, 1)

    addMiningExpForRewardEntries(rewardEntries)

    tile.state = 'collected'
    const windowSuffix = environmentWindow.value.mining.active ? ` ${environmentWindow.value.mining.label}：${environmentWindow.value.mining.summary}` : ''
    const rareTransmuteSuffix = rareTransmuteOreId ? '（稀矿转化）' : ''
    const oreSmelterSuffix = oreSmelterOreId ? '（炼矿附魔）' : ''
    const treasureSenseSuffix = treasureSenseItemId ? '（寻宝附魔）' : ''
    return {
      success: true,
      message: `挖到了${formatRewardLabels(rewards)}！(${formatMiningStaminaCostTag(staminaCost)})${windowSuffix}${rareTransmuteSuffix}${oreSmelterSuffix}${treasureSenseSuffix}`,
      startsCombat: false,
      rewards
    }
  }

  /** 处理怪物格子 */
  const _handleMonsterTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const monster = tile.data?.monster
    if (!monster) {
      tile.state = 'revealed'
      return { success: true, message: '空无一物。', startsCombat: false }
    }

    _combatTileIndex.value = tile.index
    const runtimeMonster = { ...monster }
    combatMonster.value = runtimeMonster
    combatMonsterHp.value = runtimeMonster.hp
    combatRound.value = 0
    combatLog.value = [`遭遇了${monster.name}！(HP: ${runtimeMonster.hp})  (${formatMiningStaminaCostTag(staminaCost)})`]
    combatIsBoss.value = false
    inCombat.value = true

    return { success: true, message: `遭遇了${monster.name}！`, startsCombat: true }
  }

  /** 处理 BOSS 格子 */
  const _handleBossTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const monster = tile.data?.monster
    if (!monster) {
      tile.state = 'revealed'
      return { success: true, message: '空无一物。', startsCombat: false }
    }

    _combatTileIndex.value = tile.index
    const runtimeMonster = applyRootGuardBossWeakening(monster)
    combatMonster.value = runtimeMonster
    combatMonsterHp.value = runtimeMonster.hp
    combatRound.value = 0

    const isFirstKill = !defeatedBosses.value.includes(monster.id)
    combatLog.value = [`BOSS战！遭遇了${monster.name}！(HP: ${runtimeMonster.hp})${isFirstKill ? '' : '（弱化版）'}${getRootGuardBossWeakenSuffix(monster, runtimeMonster)}  (${formatMiningStaminaCostTag(staminaCost)})${getBossDossierMessage(monster, isFirstKill)}`]
    combatIsBoss.value = true
    inCombat.value = true

    return { success: true, message: `BOSS层！${monster.name}挡住了去路！`, startsCombat: true }
  }

  /** 处理楼梯格子 */
  const _handleStairsTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    tile.state = 'revealed'
    stairsFound.value = true

    if (!stairsUsable.value) {
      const floor = getActiveFloorData()
      if (floor?.specialType === 'infested') {
        const remaining = totalMonstersOnFloor.value - monstersDefeatedCount.value
        return {
          success: true,
          message: `发现了楼梯！但需要先清除剩余${remaining}只怪物才能前进。(${formatMiningStaminaCostTag(staminaCost)})`,
          startsCombat: false
        }
      }
      if (floor?.specialType === 'boss') {
        return { success: true, message: `发现了楼梯！但需要先击败BOSS才能前进。(${formatMiningStaminaCostTag(staminaCost)})`, startsCombat: false }
      }
    }

    return { success: true, message: `发现了楼梯！可以前往下一层。(${formatMiningStaminaCostTag(staminaCost)})`, startsCombat: false }
  }

  /** 处理陷阱格子 */
  const _handleTrapTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const damage = tile.data?.trapDamage ?? 5
    playerStore.takeDamage(damage)
    tile.state = 'triggered'

    if (playerStore.hp <= 0) {
      const defeatResult = handleDefeat()
      return { success: true, message: `踩中了陷阱！受到${damage}点伤害。${defeatResult.message}`, startsCombat: false }
    }

    return { success: true, message: `踩中了陷阱！受到${damage}点伤害。(${formatMiningStaminaCostTag(staminaCost)})`, startsCombat: false }
  }

  /** 处理宝箱格子 */
  const _handleTreasureTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const items = tile.data?.treasureItems ?? []
    const money = tile.data?.treasureMoney ?? 0

    const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法开启宝箱。', startsCombat: false }
    }
    const rewards = buildRewardDisplayEntries(rewardEntries)
    const moneyReward = buildMoneyRewardDisplayEntry(money)
    if (moneyReward) rewards.push(moneyReward)
    if (money > 0) {
      playerStore.earnMoney(money)
      recordMoneyLoot(money)
    }
    addMiningExpForRewardEntries(rewardEntries)

    // 宝箱戒指掉落
    const floor = getActiveFloorData()
    const treasureRings = TREASURE_DROP_RINGS[floor?.zone ?? 'shallow']
    if (treasureRings) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find') + skillStore.getBlessingEffectValue('treasure_find')
      for (const tr of treasureRings) {
        if (Math.random() < Math.min(tr.chance + treasureBonus * tr.chance, 1)) {
          inventoryStore.addRing(tr.ringId)
          recordRingLoot(tr.ringId)
          const ringDef = getRingById(tr.ringId)
          items.push({ itemId: tr.ringId, quantity: 1 })
          if (ringDef) {
            if (money > 0 || items.length > 1) {
              // message will include ring name below
            }
          }
        }
      }
    }

    // 宝箱帽子掉落
    const treasureHats = TREASURE_DROP_HATS[floor?.zone ?? 'shallow']
    if (treasureHats) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find') + skillStore.getBlessingEffectValue('treasure_find')
      for (const th of treasureHats) {
        if (Math.random() < Math.min(th.chance + treasureBonus * th.chance, 1)) {
          inventoryStore.addHat(th.hatId)
          recordHatLoot(th.hatId)
          items.push({ itemId: th.hatId, quantity: 1 })
        }
      }
    }

    // 宝箱鞋子掉落
    const treasureShoes = TREASURE_DROP_SHOES[floor?.zone ?? 'shallow']
    if (treasureShoes) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find') + skillStore.getBlessingEffectValue('treasure_find')
      for (const ts of treasureShoes) {
        if (Math.random() < Math.min(ts.chance + treasureBonus * ts.chance, 1)) {
          inventoryStore.addShoe(ts.shoeId)
          recordShoeLoot(ts.shoeId)
          items.push({ itemId: ts.shoeId, quantity: 1 })
        }
      }
    }

    // 宝箱武器掉落
    const treasureWeapons = TREASURE_DROP_WEAPONS[floor?.zone ?? 'shallow']
    if (treasureWeapons) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find') + skillStore.getBlessingEffectValue('treasure_find')
      for (const tw of treasureWeapons) {
        if (Math.random() < Math.min(tw.chance + treasureBonus * tw.chance, 1)) {
          const affixes = rollDroppedWeaponAffixes()
          inventoryStore.addWeapon(tw.weaponId, null, affixes)
          recordWeaponLoot(tw.weaponId, null, affixes)
          items.push({ itemId: tw.weaponId, quantity: 1 })
        }
      }
    }

    tile.state = 'collected'
    setRecentRewards(rewards)

    let msg = '发现宝箱！'
    if (items.length > 0) msg += `获得了${getRewardNames(items)}`
    if (money > 0) msg += `${items.length > 0 ? '和' : '获得了'}${money}文`
    msg += `！(${formatMiningStaminaCostTag(staminaCost)})`
    const rewardSuffix = rewards.length > 0 ? ` 刚获得：${formatRewardLabels(rewards)}。` : ''
    return { success: true, message: `${msg}${rewardSuffix}`, startsCombat: false, rewards: rewards.length > 0 ? rewards : undefined }
  }

  /** 处理蘑菇格子 */
  const _handleMushroomTile = (tile: MineTile, staminaCost: number): MineActionResult => {
    const items = tile.data?.mushroomItems ?? []

    const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法采集蘑菇。', startsCombat: false }
    }
    const rewards = buildRewardDisplayEntries(rewardEntries)
    setRecentRewards(rewards)
    skillStore.addExp('foraging', 3)
    addMiningExpForRewardEntries(rewardEntries)

    tile.state = 'collected'
    return { success: true, message: `采集到了${formatRewardLabels(rewards)}！(+3采集经验, ${formatMiningStaminaCostTag(staminaCost)})`, startsCombat: false, rewards }
  }

  // ==================== 炸弹 ====================

  /** 在格子上使用炸弹 */
  const useBombOnGrid = (bombId: string, centerIndex: number): MineUtilityResult => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。' }
    if (inCombat.value) return { success: false, message: '战斗中无法使用炸弹。' }

    const bombDef = getBombById(bombId)
    if (!bombDef) return { success: false, message: '无效的炸弹。' }
    if (!inventoryStore.removeItem(bombId)) return { success: false, message: '背包中没有该炸弹。' }

    // 挖掘者系专精只提供受控返还，不再让高级炸弹无限连发。
    const _miningSkill = skillStore.getSkill('mining')
    const abyssMinerActive = _miningSkill.perk20 === 'abyss_miner'
    const deepExcavatorActive = _miningSkill.perk15 === 'deep_excavator'
    const abyssMinerGuaranteedSaved = abyssMinerActive && abyssMinerGuaranteedRefundsUsedOnFloor.value < ABYSS_MINER_GUARANTEED_REFUNDS_PER_FLOOR
    const abyssMinerChanceSaved = abyssMinerActive && !abyssMinerGuaranteedSaved && Math.random() < ABYSS_MINER_EXTRA_REFUND_CHANCE
    const deepExcavatorSaved = !abyssMinerActive && deepExcavatorActive && Math.random() < DEEP_EXCAVATOR_BOMB_REFUND_CHANCE
    const excavatorSaved =
      !abyssMinerActive &&
      !deepExcavatorActive &&
      _miningSkill.perk10 === 'excavator' &&
      Math.random() < EXCAVATOR_BOMB_REFUND_CHANCE
    const excavatorPerkSaved = abyssMinerGuaranteedSaved || abyssMinerChanceSaved || deepExcavatorSaved || excavatorSaved
    const excavatorRefundLabel = abyssMinerGuaranteedSaved || abyssMinerChanceSaved
      ? '深渊矿工'
      : deepExcavatorSaved
        ? '深渊挖掘者'
        : excavatorSaved
          ? '挖掘者'
          : ''
    const bombEfficiencyChance = skillStore.getSkillMasteryEffectValue('bomb_efficiency')
    const bombEfficiencySaved = !excavatorPerkSaved && bombEfficiencyChance > 0 && Math.random() < bombEfficiencyChance
    const bombSaved = excavatorPerkSaved || bombEfficiencySaved
    if (bombSaved) {
      inventoryStore.addItem(bombId, 1)
      if (abyssMinerGuaranteedSaved) abyssMinerGuaranteedRefundsUsedOnFloor.value++
    }

    const indices = getBombIndices(centerIndex, bombId)
    const floor = getActiveFloorData()

    let oreCollected = 0
    let monstersKilled = 0
    let utilityTargetsRevealed = 0
    let inventoryBlocked = false
    const bombRewardEntries: InventoryRewardEntry[] = []
    const bombMiningExpEntries: InventoryRewardEntry[] = []
    let bombMoney = 0

    for (const idx of indices) {
      const tile = floorGrid.value[idx]
      if (!tile || tile.state !== 'hidden') continue

      switch (tile.type) {
        case 'empty':
          tile.state = 'revealed'
          break
        case 'ore': {
          const oreId = tile.data?.oreId ?? 'copper_ore'
          const quantity = calculateOreQuantityWithBonuses(tile.data?.oreQuantity ?? 1, bombDef.oreMultiplier)
          const rewardEntries: InventoryRewardEntry[] = [{ itemId: oreId, quantity }]
          if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
            inventoryBlocked = true
            break
          }
          bombRewardEntries.push(...rewardEntries)
          bombMiningExpEntries.push(...rewardEntries)
          useAchievementStore().discoverItem(oreId)
          oreCollected++
          tile.state = 'collected'
          break
        }
        case 'monster': {
          if (bombDef.clearsMonster && tile.data?.monster && floor?.specialType !== 'infested') {
            // 炸弹击杀怪物：50% 经验
            const monster = tile.data.monster
            const wildernessXpBonus = useGameStore().farmMapType === 'wilderness' ? 1.5 : 1.0
            skillStore.addExp('combat', Math.floor(monster.expReward * 0.5 * wildernessXpBonus))
            // 普通掉落（概率减半）
            for (const drop of monster.drops) {
              if (Math.random() < drop.chance * 0.5) {
                if (addAndRecordItemLoot(drop.itemId, 1) > 0) {
                  bombRewardEntries.push({ itemId: drop.itemId, quantity: 1 })
                } else {
                  inventoryBlocked = true
                }
              }
            }
            tile.state = 'defeated'
            monstersDefeatedCount.value++
            useAchievementStore().recordMonsterKill()
            useGuildStore().recordKill(monster.id)
            monstersKilled++
          } else {
            // 爆竹和感染层怪物只翻开，不直接清除特殊层门槛
            tile.state = 'revealed'
            utilityTargetsRevealed++
          }
          break
        }
        case 'boss':
          // 炸弹不杀 BOSS，只翻开
          tile.state = 'revealed'
          utilityTargetsRevealed++
          break
        case 'trap':
          // 炸弹引爆陷阱，免伤
          tile.state = 'triggered'
          utilityTargetsRevealed++
          break
        case 'stairs':
          tile.state = 'revealed'
          stairsFound.value = true
          utilityTargetsRevealed++
          break
        case 'treasure': {
          const items = tile.data?.treasureItems ?? []
          const money = tile.data?.treasureMoney ?? 0
          const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
          if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
            inventoryBlocked = true
            break
          }
          if (money > 0) {
            playerStore.earnMoney(money)
            recordMoneyLoot(money)
            bombMoney += money
          }
          bombRewardEntries.push(...rewardEntries)
          bombMiningExpEntries.push(...rewardEntries)
          tile.state = 'collected'
          break
        }
        case 'mushroom': {
          const items = tile.data?.mushroomItems ?? []
          const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
          if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
            inventoryBlocked = true
            break
          }
          bombRewardEntries.push(...rewardEntries)
          bombMiningExpEntries.push(...rewardEntries)
          tile.state = 'collected'
          break
        }
      }
    }

    // 检查感染/BOSS层清除条件
    if (monstersDefeatedCount.value >= totalMonstersOnFloor.value && totalMonstersOnFloor.value > 0) {
      stairsUsable.value = true
      // 感染层清除奖励
      if (floor?.specialType === 'infested') {
        grantInfestedClearRewards(getActiveFloorNum())
      }
    }

    addMiningExpForRewardEntries(bombMiningExpEntries)
    const rewards = buildRewardDisplayEntries(bombRewardEntries)
    const moneyReward = buildMoneyRewardDisplayEntry(bombMoney)
    if (moneyReward) rewards.push(moneyReward)
    if (rewards.length > 0) setRecentRewards(rewards)
    const stabilizedBlastingSaved =
      !bombSaved &&
      skillStore.getSkillMasteryEffectValue('stabilized_blasting') > 0 &&
      oreCollected === 0 &&
      monstersKilled === 0 &&
      utilityTargetsRevealed === 0 &&
      rewards.length === 0
    if (stabilizedBlastingSaved) {
      inventoryStore.addItem(bombId, 1)
    }

    let msg = `${bombDef.name}爆炸了！`
    if (oreCollected > 0) msg += `采集了${oreCollected}份矿石`
    if (monstersKilled > 0) msg += `${oreCollected > 0 ? '，' : ''}击败了${monstersKilled}只怪物`
    if (oreCollected === 0 && monstersKilled === 0) msg += '翻开了一些区域'
    if (rewards.length > 0) msg += `，刚获得：${formatRewardLabels(rewards)}`
    msg += '！'
    if (bombSaved) msg += `（${bombEfficiencySaved ? '爆破效率' : excavatorRefundLabel}：炸弹未消耗！）`
    if (stabilizedBlastingSaved) msg += '（稳压爆破：空爆返还炸弹。）'
    if (inventoryBlocked) msg += '（部分奖励因背包空间不足未领取）'
    return { success: true, message: msg, rewards: rewards.length > 0 ? rewards : undefined }
  }

  // ==================== 进入 / 离开 ====================

  /** 进入矿洞（可选择起始安全点楼层） */
  const enterMine = (startFromSafePoint?: number): string => {
    isExploring.value = true
    isInSkullCavern.value = false
    currentFloor.value = getMainMineEntryFloor(startFromSafePoint)
    sessionLoot.value = []
    clearRecentRewards()

    _generateGrid()

    // BOSS 层自动进入战斗（如果格子中有 boss 且入口邻格就是 boss）
    _checkAutoBossCombat()

    return `进入云隐矿洞，当前第${currentFloor.value}层。${getMineMasteryEntryHints()}`
  }

  /** 进入骷髅矿穴（可选择起始安全点楼层） */
  const enterSkullCavern = (startFromSafePoint?: number): string => {
    if (!isSkullCavernUnlocked()) return '需要先击败60层BOSS才能进入骷髅矿穴。'
    isExploring.value = true
    isInSkullCavern.value = true
    skullCavernFloor.value = getSkullCavernEntryFloor(startFromSafePoint)
    cacheSkullFloor(skullCavernFloor.value)
    sessionLoot.value = []
    clearRecentRewards()

    _generateGrid()

    _checkAutoBossCombat()

    return `进入骷髅矿穴，当前第${skullCavernFloor.value}层。${getMineMasteryEntryHints()}`
  }

  /** 检查是否自动触发BOSS战（BOSS格在入口邻格时） */
  const _checkAutoBossCombat = () => {
    // BOSS 层不自动触发——玩家需要自己探索到 BOSS 格
  }

  /** 获取所有已解锁的安全点（用于楼层选择） */
  const getUnlockedSafePoints = (): number[] => {
    const points: number[] = [0] // 0 = 从第1层开始
    for (let f = 5; f <= safePointFloor.value; f += 5) {
      points.push(f)
    }
    return points
  }

  /** 获取骷髅矿穴已解锁的安全点 */
  const getUnlockedSkullSafePoints = (): number[] => {
    const points: number[] = [0] // 0 = 从第1层开始
    for (let f = 10; f <= skullSafePointFloor.value; f += 10) {
      points.push(f)
    }
    return points
  }

  // ==================== 战斗 ====================

  /** 战斗操作 */
  const buildMiningCombatRuntime = () => {
    const cookingStore = useCookingStore()
    const guildStore = useGuildStore()
    const owned = inventoryStore.getEquippedWeapon()
    const weaponDef = getWeaponById(owned.defId)
    const combatSkill = skillStore.getSkill('combat')
    const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0

    return {
      weaponDef,
      runtime: buildPlayerCombatRuntime({
        weaponAttack: inventoryStore.getWeaponAttack(),
        weaponCritRate: inventoryStore.getWeaponCritRate(),
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
        guildAttackBonus: guildStore.getGuildAttackBonus(),
        guildBadgeBonusAttack: guildBadgeBonusAttack.value,
        guildDefenseBonus: guildBonusDefense.value,
        cookingDefenseReduction: cookingStore.getActiveDefenseReduction() + cookingStore.getActiveAlchemyDefenseReduction(),
        cookingDefenseFlatBonus: cookingStore.getActiveDefenseFlatBonus(),
        perk5: combatSkill.perk5,
        perk10: combatSkill.perk10,
        perk15: combatSkill.perk15,
        perk20: combatSkill.perk20
      })
    }
  }

  const applyBossCombatTimeMinimum = (timeCostHours: number) =>
    combatIsBoss.value ? Math.max(timeCostHours, COMBAT_TIME_NORMAL) : timeCostHours

  const getWeaponCombatTimeMultiplier = (): number =>
    Math.max(0.1, 1 - inventoryStore.getWeaponAffixEffectValue('weapon_combat_time_reduction'))

  const isSpiritSlayerTarget = (monster: MonsterDef): boolean => {
    const key = `${monster.id} ${monster.name}`.toLowerCase()
    return SPIRIT_SLAYER_MONSTER_KEYWORDS.some(keyword => key.includes(keyword))
  }

  const isBugSlayerTarget = (monster: MonsterDef): boolean => {
    const key = `${monster.id} ${monster.name}`.toLowerCase()
    return BUG_SLAYER_MONSTER_KEYWORDS.some(keyword => key.includes(keyword))
  }

  const isExorcistTarget = (monster: MonsterDef): boolean => {
    const key = `${monster.id} ${monster.name}`.toLowerCase()
    return EXORCIST_MONSTER_KEYWORDS.some(keyword => key.includes(keyword))
  }

  const getAttackCombatTimeCost = (monsterHpBefore: number, totalDamage: number, expectedDamage: number): number => {
    const safeHpBefore = Math.max(1, monsterHpBefore)
    if (totalDamage >= safeHpBefore) {
      return combatIsBoss.value ? COMBAT_TIME_NORMAL : COMBAT_TIME_FAST
    }

    const damageRatio = Math.max(0, totalDamage) / safeHpBefore
    const roundsByActualHit = damageRatio > 0 ? Math.ceil(1 / damageRatio) : Number.POSITIVE_INFINITY
    const expectedRounds = Math.ceil(safeHpBefore / Math.max(1, expectedDamage))
    const estimatedRounds = Math.min(roundsByActualHit, expectedRounds)

    if (estimatedRounds <= 2) return applyBossCombatTimeMinimum(COMBAT_TIME_ADVANTAGE)
    if (estimatedRounds <= 4) return applyBossCombatTimeMinimum(COMBAT_TIME_NORMAL)
    return COMBAT_TIME_LONG
  }

  const combatAction = (action: CombatAction): CombatActionResult => combatActionRuntime(action)

  const combatActionRuntime = (action: CombatAction): CombatActionResult => {
    if (!inCombat.value || !combatMonster.value) {
      return { message: '不在战斗中。', combatOver: true, won: false, timeCostHours: 0 }
    }

    combatRound.value++
    const monster = combatMonster.value
    const { runtime } = buildMiningCombatRuntime()

    if (action === 'flee') {
      if (combatIsBoss.value) {
        combatLog.value.push('BOSS 战无法逃跑。')
        return { message: 'BOSS 战无法逃跑。', combatOver: false, won: false, timeCostHours: COMBAT_TIME_FAST }
      }
      inCombat.value = false
      if (_combatTileIndex.value >= 0) {
        const tile = floorGrid.value[_combatTileIndex.value]
        if (tile) tile.state = 'revealed'
        _combatTileIndex.value = -1
      }
      combatLog.value.push('你逃跑了。')
      return { message: '成功逃离了战斗。', combatOver: true, won: false, timeCostHours: COMBAT_TIME_FAST }
    }

    if (action === 'defend') {
      const timeCostHours = (combatIsBoss.value ? COMBAT_TIME_LONG : COMBAT_TIME_NORMAL) * getWeaponCombatTimeMultiplier()
      const rawDamage = calculateIncomingDamage({
        incomingAttack: monster.attack,
        flatReduction: runtime.defendDefense.flatReduction,
        modifiers: runtime.defendDefense.damageMultipliers
      })
      const damage = applyRootGuardDamageReduction(rawDamage)
      const actualDamage = playerStore.takeDamage(damage)

      let defendMsg = `你举盾防御，受到${damage}点伤害${getRootGuardReductionSuffix(rawDamage, damage)}。`
      if (playerStore.hp <= 0) {
        combatLog.value.push(defendMsg)
        return { ...handleDefeat(), timeCostHours, takenDamage: actualDamage }
      }

      const defendHealAmount = getDefendHeal({
        maxHp: playerStore.getMaxHp(),
        healFlat: runtime.defendHealFlat,
        healRatio: runtime.defendHealRatio
      })
      if (defendHealAmount > 0) {
        playerStore.restoreHealth(defendHealAmount)
        defendMsg += ` 防守回气，恢复${defendHealAmount}HP。`
      }

      combatLog.value.push(defendMsg)
      return { message: defendMsg, combatOver: false, won: false, timeCostHours, takenDamage: actualDamage }
    }

    const monsterHpBefore = combatMonsterHp.value
    const spiritSlayerBonus = isSpiritSlayerTarget(monster) ? inventoryStore.getWeaponAffixEffectValue('weapon_spirit_damage') : 0
    const bugSlayerBonus = isBugSlayerTarget(monster) ? inventoryStore.getWeaponAffixEffectValue('weapon_bug_damage') : 0
    const exorcistCritBonus = isExorcistTarget(monster) ? inventoryStore.getWeaponAffixEffectValue('weapon_exorcist_crit') : 0
    const targetDamageMultiplier = 1 + Math.max(spiritSlayerBonus, bugSlayerBonus)
    const targetCritBonus = exorcistCritBonus
    const attackProfile = targetDamageMultiplier > 1 || targetCritBonus > 0
      ? {
          ...runtime.attack,
          attackMultiplier: (runtime.attack.attackMultiplier ?? 1) * targetDamageMultiplier,
          critRate: runtime.attack.critRate + targetCritBonus
        }
      : runtime.attack
    const attackOutcome = rollAttackOutcome(attackProfile, monster.defense)
    const effectiveDamage = getEffectiveDamage(monsterHpBefore, attackOutcome.totalDamage)
    const attackDamageResult = {
      dealtDamage: attackOutcome.totalDamage,
      mainDamage: attackOutcome.damage,
      extraDamage: attackOutcome.extraDamage,
      totalDamage: attackOutcome.totalDamage,
      effectiveDamage,
      isCrit: attackOutcome.isCrit
    }
    const timeCostHours = getAttackCombatTimeCost(
      monsterHpBefore,
      attackOutcome.totalDamage,
      getExpectedAttackDamage(attackProfile, monster.defense)
    ) * getWeaponCombatTimeMultiplier()
    combatMonsterHp.value -= attackOutcome.damage
    combatMonsterHp.value -= attackOutcome.extraDamage

    // Equipment durability consumption on attack
    const equippedWeapon = inventoryStore.ownedWeapons[inventoryStore.equippedWeaponIndex]
    if (equippedWeapon) {
      const wAffixes = equippedWeapon.affixes ?? []
      const wReduction = calculateConsumptionReduction(wAffixes, equippedWeapon.enchantmentId, [])
      const wMax = inventoryStore.getWeaponMaxDurability?.() ?? 100
      consumeEquipmentDurability(equippedWeapon, wMax, 1, wReduction)
    }
    // Ring durability
    const ringSlots = [inventoryStore.equippedRingSlot1, inventoryStore.equippedRingSlot2]
    for (const slot of ringSlots) {
      if (slot >= 0) {
        const ring = inventoryStore.ownedRings[slot]
        if (ring) {
          const rReduction = calculateConsumptionReduction(ring.affixes ?? [], ring.enchantmentId, [])
          const rMax = inventoryStore.getRingMaxDurability?.(slot) ?? 100
          consumeEquipmentDurability(ring, rMax, 1, rReduction)
        }
      }
    }
    let msg = `你攻击${monster.name}，造成${attackOutcome.damage}点伤害。`
    if (attackOutcome.isCrit) {
      msg = `暴击！${msg}`
    }
    if (spiritSlayerBonus > 0) {
      msg += ' 镇魂附魔压制了目标。'
    }
    if (bugSlayerBonus > 0) {
      msg += ' 虫猎附魔命中了弱点。'
    }
    if (exorcistCritBonus > 0) {
      msg += ' 斩邪附魔撕开了邪祟。'
    }
    if (attackOutcome.didExtraStrike) {
      msg += ` 追击触发，额外造成${attackOutcome.extraDamage}点伤害。`
    }

    const lifestealHeal = getLifestealHeal(effectiveDamage, runtime.attack.lifesteal)
    if (lifestealHeal > 0) {
      playerStore.restoreHealth(lifestealHeal)
      msg += ` 吸血恢复${lifestealHeal}HP。`
    }

    if (combatMonsterHp.value <= 0) {
      return { ...handleMonsterDefeat(monster, msg, attackOutcome.totalDamage), timeCostHours, ...attackDamageResult }
    }

    if (attackOutcome.didStun) {
      msg += ` ${monster.name}被震晕了，没能反击。`
      combatLog.value.push(msg)
      return { message: msg, combatOver: false, won: false, timeCostHours, ...attackDamageResult }
    }

    const dodgeRate = runtime.defense.dodgeRate ?? 0
    if (dodgeRate > 0 && Math.random() < dodgeRate) {
      msg += ` 你灵巧地闪避了${monster.name}的反击。`
      combatLog.value.push(msg)
      return { message: msg, combatOver: false, won: false, timeCostHours, ...attackDamageResult }
    }

    const rawCounterDamage = calculateIncomingDamage({
      incomingAttack: monster.attack,
      flatReduction: runtime.defense.flatReduction,
      modifiers: runtime.defense.damageMultipliers
    })
    const counterDamage = applyRootGuardDamageReduction(rawCounterDamage)
    const actualCounterDamage = playerStore.takeDamage(counterDamage)
    msg += ` ${monster.name}反击，你受到${counterDamage}点伤害${getRootGuardReductionSuffix(rawCounterDamage, counterDamage)}。`
    combatLog.value.push(msg)

    if (playerStore.hp <= 0) {
      return { ...handleDefeat(), timeCostHours, ...attackDamageResult, takenDamage: actualCounterDamage }
    }

    return { message: msg, combatOver: false, won: false, timeCostHours, ...attackDamageResult, takenDamage: actualCounterDamage }
  }

  const handleMonsterDefeat = (
    monster: MonsterDef,
    msg: string,
    _totalDamage: number
  ): { message: string; combatOver: boolean; won: boolean; rewards?: MineRewardDisplayEntry[] } => {
    inCombat.value = false
    let inventoryBlocked = false
    const combatRewardEntries: InventoryRewardEntry[] = []
    const combatRewardDisplays: MineRewardDisplayEntry[] = []
    const addCombatRewardDisplay = (entry: MineRewardDisplayEntry) => {
      combatRewardDisplays.push(entry)
    }

    // 经验
    const floor = getActiveFloorData()
    const wildernessXpBonus = useGameStore().farmMapType === 'wilderness' ? 1.5 : 1.0
    const infestedXpBonus = floor?.specialType === 'infested' ? 1.5 : 1.0
    const bossPressureBonus = combatIsBoss.value ? skillStore.getSkillMasteryEffectValue('boss_pressure') : 0
    const combatExpGain = applySkillMasteryBonus(Math.floor(monster.expReward * wildernessXpBonus * infestedXpBonus), bossPressureBonus)
    skillStore.addExp('combat', combatExpGain)

    // 武器词条 + 戒指增加掉落率
    const ringDropBonus = inventoryStore.getRingEffectValue('monster_drop_bonus')
    const ringLuckBonus = inventoryStore.getRingEffectValue('luck')
    const blessingLuckBonus = skillStore.getBlessingEffectValue('luck')
    const luckyBonus =
      inventoryStore.getWeaponAffixEffectValue('monster_drop_bonus') +
      ringDropBonus +
      ringLuckBonus * 0.5 +
      blessingLuckBonus * 0.5 +
      (slayerCharmActive.value ? 0.2 : 0) +
      guildBonusDropRate.value

    // 普通掉落
    for (const drop of monster.drops) {
      if (Math.random() < Math.min(drop.chance + luckyBonus, 1)) {
        if (addAndRecordItemLoot(drop.itemId, 1) > 0) {
          useAchievementStore().discoverItem(drop.itemId)
          combatRewardEntries.push({ itemId: drop.itemId, quantity: 1 })
        } else {
          inventoryBlocked = true
        }
      }
    }

    // 宝石学家专精：怪物额外掉落当前层矿石
    const _killMiningSkill = skillStore.getSkill('mining')
    if (_killMiningSkill.perk10 === 'mineralogist' || _killMiningSkill.perk15 === 'deep_excavator' || _killMiningSkill.perk15 === 'gem_collector' || _killMiningSkill.perk20 === 'abyss_miner' || _killMiningSkill.perk20 === 'gem_emperor') {
      if (floor && floor.ores.length > 0) {
        const dropQty = (_killMiningSkill.perk20 === 'gem_emperor') ? 2 : 1
        const bonusOre = floor.ores[Math.floor(Math.random() * floor.ores.length)]!
        if (addAndRecordItemLoot(bonusOre, dropQty) > 0) {
          combatRewardEntries.push({ itemId: bonusOre, quantity: dropQty })
        } else {
          inventoryBlocked = true
        }
      }
    }

    // 屠杀之王/狂战士：击杀回血
    const killHealRatio = buildMiningCombatRuntime().runtime.killHealRatio
    if (killHealRatio > 0) {
      const healOnKill = Math.floor(playerStore.getMaxHp() * killHealRatio)
      if (healOnKill > 0) {
        playerStore.restoreHealth(healOnKill)
      }
    }

    // 武器掉落（普通怪物，非 BOSS）
    if (!combatIsBoss.value && floor) {
      const weaponDrops = MONSTER_DROP_WEAPONS[floor.zone]
      if (weaponDrops) {
        for (const wd of weaponDrops) {
          const dropChance = wd.chance + luckyBonus * wd.chance
          if (Math.random() < dropChance) {
            const affixes = rollDroppedWeaponAffixes()
            inventoryStore.addWeapon(wd.weaponId, null, affixes)
            recordWeaponLoot(wd.weaponId, null, affixes)
            const displayName = getWeaponDisplayName(wd.weaponId, null, affixes)
            msg += ` 获得了武器：${displayName}！`
            addCombatRewardDisplay({ itemId: wd.weaponId, quantity: 1, label: `武器：${displayName}×1` })
          }
        }
      }
      // 戒指掉落（普通怪物）
      const ringDrops = MONSTER_DROP_RINGS[floor.zone]
      if (ringDrops) {
        for (const rd of ringDrops) {
          if (Math.random() < rd.chance + luckyBonus * rd.chance) {
            inventoryStore.addRing(rd.ringId)
            recordRingLoot(rd.ringId)
            const ringDef = getRingById(rd.ringId)
            msg += ` 获得了戒指：${ringDef?.name ?? rd.ringId}！`
            addCombatRewardDisplay({ itemId: rd.ringId, quantity: 1, label: `戒指：${ringDef?.name ?? rd.ringId}×1` })
          }
        }
      }
      // 帽子掉落（普通怪物）
      const hatDrops = MONSTER_DROP_HATS[floor.zone]
      if (hatDrops) {
        for (const hd of hatDrops) {
          if (Math.random() < hd.chance + luckyBonus * hd.chance) {
            inventoryStore.addHat(hd.hatId)
            recordHatLoot(hd.hatId)
            const hatDef = getHatById(hd.hatId)
            msg += ` 获得了帽子：${hatDef?.name ?? hd.hatId}！`
            addCombatRewardDisplay({ itemId: hd.hatId, quantity: 1, label: `帽子：${hatDef?.name ?? hd.hatId}×1` })
          }
        }
      }
      // 鞋子掉落（普通怪物）
      const shoeDrops = MONSTER_DROP_SHOES[floor.zone]
      if (shoeDrops) {
        for (const sd of shoeDrops) {
          if (Math.random() < sd.chance + luckyBonus * sd.chance) {
            inventoryStore.addShoe(sd.shoeId)
            recordShoeLoot(sd.shoeId)
            const shoeDef = getShoeById(sd.shoeId)
            msg += ` 获得了鞋子：${shoeDef?.name ?? sd.shoeId}！`
            addCombatRewardDisplay({ itemId: sd.shoeId, quantity: 1, label: `鞋子：${shoeDef?.name ?? sd.shoeId}×1` })
          }
        }
      }
    }

    // BOSS 击败处理
    if (combatIsBoss.value) {
      if (isInSkullCavern.value) {
        // 骷髅矿穴BOSS：奖励铜钱和矿石（按深度缩放）
        const scFloor = skullCavernFloor.value
        const moneyReward = applySkillMasteryBonus(200 + scFloor * 20, bossPressureBonus)
        playerStore.earnMoney(moneyReward)
        recordMoneyLoot(moneyReward)
        msg += ` 获得${moneyReward}文！`
        const moneyDisplay = buildMoneyRewardDisplayEntry(moneyReward)
        if (moneyDisplay) addCombatRewardDisplay(moneyDisplay)
        const bonusOreCount = 3 + Math.floor(scFloor / 25)
        const orePool = ['iridium_ore', 'void_ore', 'shadow_ore']
        for (let i = 0; i < bonusOreCount; i++) {
          const oreId = orePool[Math.floor(Math.random() * orePool.length)]!
          if (addAndRecordItemLoot(oreId, 1) <= 0) {
            inventoryBlocked = true
          } else {
            combatRewardEntries.push({ itemId: oreId, quantity: 1 })
          }
        }
        msg += claimMineBossPotentialReward({
          source: 'skull',
          floorNum: scFloor,
          bossId: monster.id,
          reason: `骷髅矿穴第${scFloor}层首领`
        })
        msg += ` 获得了${bonusOreCount}个稀有矿石！`
      } else {
        // 主矿洞BOSS
        msg += grantMainMineBossRewards(currentFloor.value).message
      }
    }

    const rewards = [...buildRewardDisplayEntries(combatRewardEntries), ...combatRewardDisplays]
    if (rewards.length > 0) setRecentRewards(rewards)

    msg += ` ${monster.name}被击败了！(+${combatExpGain}经验)`
    if (bossPressureBonus > 0) msg += '（首领压制）'
    if (rewards.length > 0) msg += ` 掉落：${formatRewardLabels(rewards)}。`
    if (inventoryBlocked) msg += ' 部分掉落因背包空间不足未领取。'
    if (Math.random() < 0.05) {
      useSecretNoteStore().tryCollectNote('monster')
    }

    // === 更新格子状态 ===
    let rootGuardShockwaveDefeats = 0
    if (_combatTileIndex.value >= 0) {
      const tile = floorGrid.value[_combatTileIndex.value]
      if (tile) tile.state = 'defeated'
      rootGuardShockwaveDefeats = combatIsBoss.value ? 0 : triggerRootGuardShockwave(_combatTileIndex.value)
      _combatTileIndex.value = -1
    }
    if (rootGuardShockwaveDefeats > 0) {
      msg += ` 危息护命震波清退了${rootGuardShockwaveDefeats}只近身怪物。`
    }
    monstersDefeatedCount.value += 1 + rootGuardShockwaveDefeats
    useAchievementStore().recordMonsterKill()
    if (combatMonster.value) {
      useGuildStore().recordKill(combatMonster.value.id)
    }

    // 检查感染/BOSS层清除条件
    if (monstersDefeatedCount.value >= totalMonstersOnFloor.value && totalMonstersOnFloor.value > 0) {
      stairsUsable.value = true
      // 感染层清除奖励
      if (floor?.specialType === 'infested') {
        msg += grantInfestedClearRewards(getActiveFloorNum()).message
      } else if (floor?.specialType === 'boss') {
        if (isInSkullCavern.value) {
          recordSkullCavernSafePoint()
        } else {
          recordMainMineSafePoint(floor)
        }
      }
    } else if (floor?.specialType === 'infested') {
      const remaining = totalMonstersOnFloor.value - monstersDefeatedCount.value
      msg += ` 还剩${remaining}只怪物！`
    }

    combatIsBoss.value = false
    combatLog.value.push(msg)
    return { message: msg, combatOver: true, won: true, rewards: rewards.length > 0 ? rewards : undefined }
  }

  /** 战斗失败处理 */
  const handleDefeat = (): { message: string; combatOver: boolean; won: boolean } => {
    const wasBossFight = combatIsBoss.value
    const rootGuardRank = getRootGuardRank()
    const rootGuardKeepsBackpack = rootGuardRank >= ROOT_GUARD_ITEM_SAFE_RANK
    const rootGuardBossRetreat = wasBossFight && rootGuardRank >= ROOT_GUARD_BOSS_WEAKEN_RANK
    inCombat.value = false
    combatIsBoss.value = false
    clearRecentRewards()
    const wasInSkullCavern = isInSkullCavern.value
    isExploring.value = false
    monsterLureUsedOnFloor.value = false
    slayerCharmActive.value = false

    // 清空格子
    floorGrid.value = []
    _combatTileIndex.value = -1

    // 丢失50%本次探索物品；满阶危息护命在 Boss 战败时保留本次探索战利品。
    let lostSessionLoot = false
    if (!rootGuardBossRetreat) {
      const lostCount = Math.ceil(sessionLoot.value.length / 2)
      lostSessionLoot = lostCount > 0
      for (let i = 0; i < lostCount; i++) {
        if (sessionLoot.value.length === 0) break
        const idx = Math.floor(Math.random() * sessionLoot.value.length)
        const [entry] = sessionLoot.value.splice(idx, 1)
        if (entry) rollbackLootEntry(entry)
      }
    }

    // 随机丢失最多3件背包物品
    const droppedItems: string[] = []
    if (!rootGuardKeepsBackpack) {
      const availableItems = inventoryStore.items.filter(i => i.quantity > 0 && !i.locked)
      const dropCount = Math.min(DEFEAT_MAX_ITEM_LOSS, availableItems.length)
      for (let i = 0; i < dropCount; i++) {
        const candidates = inventoryStore.items.filter(i => i.quantity > 0 && !i.locked)
        if (candidates.length === 0) break
        const pick = candidates[Math.floor(Math.random() * candidates.length)]!
        droppedItems.push(pick.itemId)
        inventoryStore.removeUnlockedItem(pick.itemId, 1, pick.quality)
      }
    }

    // 扣除铜钱
    const moneyLost = Math.min(Math.floor(playerStore.money * DEFEAT_MONEY_PENALTY_RATE), DEFEAT_MONEY_PENALTY_CAP)
    if (moneyLost > 0) playerStore.spendMoney(moneyLost)

    // HP 恢复到50%（先扣至0再回血，确保结果精确）
    const maxHp = playerStore.getMaxHp()
    playerStore.takeDamage(maxHp)
    playerStore.restoreHealth(Math.floor(maxHp * 0.5))

    // 骷髅矿穴：重置
    if (wasInSkullCavern) {
      isInSkullCavern.value = false
      skullCavernFloor.value = 0
      cachedSkullFloorData.value = null
    }

    const location = wasInSkullCavern ? '骷髅矿穴' : '矿洞'
    const penaltyParts: string[] = []
    if (rootGuardBossRetreat) {
      penaltyParts.push('危息护命触发，保住了本次战利品')
    } else if (lostSessionLoot) {
      penaltyParts.push('丢失了一半战利品')
    } else {
      penaltyParts.push('没有可掉落的本次战利品')
    }
    if (rootGuardKeepsBackpack) {
      penaltyParts.push('背包物品没有掉落')
    } else if (droppedItems.length > 0) {
      penaltyParts.push(`丢失了${droppedItems.length}件背包物品`)
    }
    if (moneyLost > 0) penaltyParts.push(`损失${moneyLost}文`)
    const msg = `你在${location}中倒下了……${penaltyParts.join('，')}，被送回入口。`
    combatLog.value.push(msg)
    return { message: msg, combatOver: true, won: false }
  }

  // ==================== 楼层前进 ====================

  /** 前进到下一层 */
  const goNextFloor = (): { success: boolean; message: string } => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。' }
    if (!stairsFound.value) {
      return { success: false, message: '还没有找到楼梯，继续探索吧。' }
    }
    if (!stairsUsable.value) {
      const floor = getActiveFloorData()
      if (floor?.specialType === 'infested') {
        const remaining = totalMonstersOnFloor.value - monstersDefeatedCount.value
        return { success: false, message: `还有${remaining}只怪物未清除，无法前进！` }
      }
      if (floor?.specialType === 'boss') {
        return { success: false, message: '必须击败BOSS才能前进！' }
      }
      return { success: false, message: '楼梯暂时无法使用。' }
    }

    const pendingRewardCheck = ensureCurrentFloorRewardsClaimed()
    if (!pendingRewardCheck.success) {
      return { success: false, message: pendingRewardCheck.message }
    }

    if (isInSkullCavern.value) {
      recordSkullCavernSafePoint()
    } else {
      recordMainMineSafePoint()
    }

    if (isInSkullCavern.value) {
      // 骷髅矿穴：无上限，每10层安全点
      skullCavernFloor.value++
      cacheSkullFloor(skullCavernFloor.value)
      if (skullCavernFloor.value > skullCavernBestFloor.value) {
        skullCavernBestFloor.value = skullCavernFloor.value
        useAchievementStore().recordSkullCavernFloor(skullCavernFloor.value)
      }
    } else {
      // 主矿洞：最多 120 层
      if (currentFloor.value >= MAX_MINE_FLOOR) {
        // 到达120层后自动转入骷髅矿穴
        if (isSkullCavernUnlocked()) {
          isInSkullCavern.value = true
          skullCavernFloor.value = 1
          cacheSkullFloor(1)
          _generateGrid()
          return { success: true, message: `你穿过矿洞最深处的裂隙，进入了骷髅矿穴第1层！${getMineMasteryEntryHints()}` }
        }
        return { success: false, message: '已经到达矿洞最深处！（击败60层BOSS可解锁骷髅矿穴）' }
      }

      currentFloor.value++
      useAchievementStore().recordMineFloor(currentFloor.value)
    }
    useGoalStore().recordWeeklyActivityCounter('mine_floors_descended', 1)

    // 生成新层格子
    _generateGrid()
    if (isInSkullCavern.value) {
      recordSkullCavernSafePoint()
    } else {
      recordMainMineSafePoint()
    }

    const activeFloorNum = getActiveFloorNum()
    const newFloor = getActiveFloorData()
    const locationName = isInSkullCavern.value ? '骷髅矿穴' : ''
    const specialLabels: Record<string, string> = {
      mushroom: '蘑菇洞穴',
      treasure: '宝箱层',
      infested: '感染层',
      dark: '暗河层',
      boss: 'BOSS层'
    }
    const specialLabel = newFloor?.specialType ? (specialLabels[newFloor.specialType] ?? '') : ''
    let msg = `前进到${locationName}第${activeFloorNum}层。${newFloor?.isSafePoint ? '（安全点！）' : ''}`
    if (specialLabel) msg += ` [${specialLabel}]`
    msg += getMineMasteryEntryHints(newFloor)
    return { success: true, message: msg }
  }

  /** 离开矿洞 */
  const leaveMine = (): string => {
    const pendingRewardCheck = ensureCurrentFloorRewardsClaimed({ blockOnPending: false })
    if (!pendingRewardCheck.success) {
      return pendingRewardCheck.message
    }

    // 离开前保存安全点（防止玩家到达安全点楼层后直接离开）
    if (!isInSkullCavern.value) {
      recordMainMineSafePoint()
    }
    // 骷髅矿穴：离开前保存安全点
    if (isInSkullCavern.value) {
      recordSkullCavernSafePoint()
    }
    isExploring.value = false
    combatIsBoss.value = false
    clearRecentRewards()
    floorGrid.value = []
    _combatTileIndex.value = -1
    monsterLureUsedOnFloor.value = false
    slayerCharmActive.value = false
    if (isInSkullCavern.value) {
      isInSkullCavern.value = false
      cachedSkullFloorData.value = null
      return `${pendingRewardCheck.message ? `${pendingRewardCheck.message} ` : ''}你离开了骷髅矿穴。`
    }
    return `${pendingRewardCheck.message ? `${pendingRewardCheck.message} ` : ''}你离开了矿洞。`
  }

  // ==================== 道具使用 ====================

  /** 在战斗/探索中使用道具 */
  const forceLeaveMine = (): string => {
    isExploring.value = false
    inCombat.value = false
    combatMonster.value = null
    combatMonsterHp.value = 0
    combatRound.value = 0
    combatLog.value = []
    combatIsBoss.value = false
    clearRecentRewards()
    floorGrid.value = []
    _combatTileIndex.value = -1
    monsterLureUsedOnFloor.value = false
    slayerCharmActive.value = false
    if (isInSkullCavern.value) {
      isInSkullCavern.value = false
      cachedSkullFloorData.value = null
      return '已强制结束本次矿窟探索并退出。'
    }
    return '已强制结束本次矿洞探索并退出。'
  }

  const GUILD_GROWTH_ITEM_IDS = new Set(['guild_badge', 'life_talisman', 'lucky_coin', 'defense_charm'])

  const isGuildGrowthItem = (itemId: string): boolean => GUILD_GROWTH_ITEM_IDS.has(itemId)

  const useGuildGrowthItem = (itemId: string, quality?: Quality): { success: boolean; message: string } => {
    if (itemId === 'guild_badge') {
      if (!inventoryStore.removeUnlockedItem('guild_badge', 1, quality)) return { success: false, message: '没有公会徽章。' }
      guildBadgeBonusAttack.value += 3
      return { success: true, message: '使用了公会徽章，攻击力永久+3！' }
    }

    if (itemId === 'life_talisman') {
      if (!inventoryStore.removeUnlockedItem('life_talisman', 1, quality)) return { success: false, message: '没有生命护符。' }
      guildBonusMaxHp.value += 15
      return { success: true, message: '使用了生命护符，最大生命值永久+15！' }
    }

    if (itemId === 'lucky_coin') {
      if (!inventoryStore.removeUnlockedItem('lucky_coin', 1, quality)) return { success: false, message: '没有幸运铜钱。' }
      guildBonusDropRate.value += 0.05
      return { success: true, message: '使用了幸运铜钱，怪物掉落率永久+5%！' }
    }

    if (itemId === 'defense_charm') {
      if (!inventoryStore.removeUnlockedItem('defense_charm', 1, quality)) return { success: false, message: '没有守护符。' }
      guildBonusDefense.value += 0.03
      return { success: true, message: '使用了守护符，防御永久+3%！' }
    }

    return { success: false, message: '该道具不能在这里使用。' }
  }

  const useCombatItem = (itemId: string, quantity: number = 1, quality?: Quality): { success: boolean; message: string } => {
    if (!inCombat.value && !isExploring.value) return { success: false, message: '不在矿洞中。' }

    // 公会永久成长道具：背包和矿洞共用同一套加成落点
    if (isGuildGrowthItem(itemId)) {
      const result = useGuildGrowthItem(itemId, quality)
      if (result.success && inCombat.value) combatLog.value.push(result.message)
      return result
    }

    // 猎魔符：本次探索掉落率+20%
    if (itemId === 'slayer_charm') {
      if (slayerCharmActive.value) return { success: false, message: '猎魔符效果已激活。' }
      if (!inventoryStore.removeUnlockedItem('slayer_charm')) return { success: false, message: '没有猎魔符。' }
      slayerCharmActive.value = true
      const msg = '使用了猎魔符，本次探索怪物掉落率+20%！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 食物/药剂类道具
    const def = getItemById(itemId)
    if (!def) return { success: false, message: '未知物品。' }
    const requestedQuantity = Math.max(1, Math.floor(quantity))
    const hasHpRestore = Boolean(def.healthRestore && def.healthRestore > 0)
    const hasStaminaRestore = Boolean(def.staminaRestore && def.staminaRestore > 0)
    const isRestoreTargetFull = () => {
      const hpFull = playerStore.hp >= playerStore.getMaxHp()
      const staminaFull = playerStore.stamina >= playerStore.maxStamina
      if (hasHpRestore && hasStaminaRestore) return hpFull && staminaFull
      if (hasHpRestore) return hpFull
      if (hasStaminaRestore) return staminaFull
      return false
    }
    const restoreFullMessage = () => {
      if (hasHpRestore && hasStaminaRestore) return '体力和生命值都已满。'
      if (hasHpRestore) return '生命值已满。'
      if (hasStaminaRestore) return '体力已满。'
      return '该道具没有可用恢复效果。'
    }
    if (!hasHpRestore && !hasStaminaRestore) return { success: false, message: restoreFullMessage() }

    // 烹饪品走 cookingStore.eat()，以正确应用buff、厨房加成等
    if (itemId.startsWith('food_')) {
      const cookingStore = useCookingStore()
      if (isRestoreTargetFull()) return { success: false, message: restoreFullMessage() }
      const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
      let used = 0
      const messages: string[] = []

      for (let i = 0; i < requestedQuantity; i++) {
        if (isRestoreTargetFull()) break
        const foodQuality = qualityOrder.find(q => inventoryStore.getUnlockedItemCount(itemId, q) > 0) ?? null
        if (!foodQuality) break
        const result = cookingStore.eat(itemId.slice(5), foodQuality)
        if (!result.success) {
          if (used === 0) return result
          break
        }
        used++
        messages.push(result.message)
      }

      if (used <= 0) return { success: false, message: isRestoreTargetFull() ? restoreFullMessage() : `没有${def.name}。` }
      const msg = used === 1 ? messages[0]! : `连续使用${def.name}×${used}。${messages[messages.length - 1] ?? ''}`
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    if (isRestoreTargetFull()) return { success: false, message: restoreFullMessage() }

    // 炼金师专精：食物恢复+50%
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0
    let used = 0
    let totalHpRestore = 0
    let totalStaminaRestore = 0

    for (let i = 0; i < requestedQuantity; i++) {
      if (isRestoreTargetFull()) break
      if (!inventoryStore.removeUnlockedItem(itemId, 1, quality)) {
        if (used === 0) return { success: false, message: `没有${def.name}。` }
        break
      }

      const beforeHp = playerStore.hp
      const beforeStamina = playerStore.stamina
      if (hasHpRestore) {
        const restore = def.healthRestore! >= 999 ? playerStore.getMaxHp() : Math.floor(def.healthRestore! * alchemistBonus)
        playerStore.restoreHealth(restore)
      }
      if (hasStaminaRestore) {
        const restore = Math.floor(def.staminaRestore! * alchemistBonus)
        playerStore.restoreStamina(restore)
      }

      used++
      totalHpRestore += Math.max(0, playerStore.hp - beforeHp)
      totalStaminaRestore += Math.max(0, playerStore.stamina - beforeStamina)
    }

    if (used <= 0) return { success: false, message: isRestoreTargetFull() ? restoreFullMessage() : `没有${def.name}。` }

    const parts: string[] = []
    if (totalHpRestore > 0) parts.push(`恢复${totalHpRestore}HP`)
    if (totalStaminaRestore > 0) parts.push(`恢复${totalStaminaRestore}体力`)
    const msg = `使用了${def.name}×${used}，${parts.join('和') || '状态已满'}！`
    if (inCombat.value) combatLog.value.push(msg)
    return { success: true, message: msg }
  }

  /** 在探索中使用怪物诱饵（本层怪物数量翻倍） */
  const useMonsterLure = (): { success: boolean; message: string } => {
    if (!isExploring.value) return { success: false, message: '不在矿洞中。' }
    if (inCombat.value) return { success: false, message: '战斗中无法使用怪物诱饵。' }
    if (monsterLureUsedOnFloor.value) return { success: false, message: '本层已经使用过怪物诱饵了。' }
    if (!inventoryStore.removeUnlockedItem('monster_lure')) return { success: false, message: '没有怪物诱饵。' }

    const floor = getActiveFloorData()
    if (!floor) return { success: true, message: '使用了怪物诱饵，但本层无效。' }

    // 统计现有未击败的怪物数量
    const existingMonsters = floorGrid.value.filter(t => (t.type === 'monster' || t.type === 'boss') && t.state !== 'defeated').length

    // 找到所有隐藏的空格子
    const hiddenEmpty = floorGrid.value.filter(t => t.state === 'hidden' && t.type === 'empty')
    const monstersToAdd = Math.min(existingMonsters, hiddenEmpty.length)

    if (monstersToAdd === 0) {
      return { success: true, message: '使用了怪物诱饵，但本层没有空间放置更多怪物。' }
    }

    // 随机打乱并放置怪物
    const shuffled = [...hiddenEmpty].sort(() => Math.random() - 0.5)
    const monsterPool = floor.monsters
    for (let i = 0; i < monstersToAdd; i++) {
      const tile = shuffled[i]!
      const monster = monsterPool.length > 0 ? { ...monsterPool[Math.floor(Math.random() * monsterPool.length)]! } : undefined
      if (monster) {
        tile.type = 'monster'
        tile.data = { monster }
      }
    }

    totalMonstersOnFloor.value += monstersToAdd
    monsterLureUsedOnFloor.value = true
    return { success: true, message: `使用了怪物诱饵！本层增加了${monstersToAdd}只怪物。` }
  }

  // ==================== 序列化 ====================

  const serialize = () => {
    return {
      currentFloor: currentFloor.value,
      safePointFloor: safePointFloor.value,
      defeatedBosses: defeatedBosses.value,
      potentialBossFirstRewardIds: potentialBossFirstRewardIds.value,
      mineBossPotentialRewardSequence: mineBossPotentialRewardSequence.value,
      claimedInfestedRewardFloors: claimedInfestedRewardFloors.value,
      claimedBossRewardFloors: claimedBossRewardFloors.value,
      claimedBossRingRewardFloors: claimedBossRingRewardFloors.value,
      claimedBossHatRewardFloors: claimedBossHatRewardFloors.value,
      claimedBossShoeRewardFloors: claimedBossShoeRewardFloors.value,
      pendingMineRewards: pendingMineRewards.value.map(reward => ({
        ...reward,
        itemRewards: reward.itemRewards.map(entry => ({ ...entry })),
        weaponReward: reward.weaponReward
          ? { ...reward.weaponReward, affixes: cloneForgeAffixes(reward.weaponReward.affixes) }
          : null
      })),
      isInSkullCavern: isInSkullCavern.value,
      skullCavernFloor: skullCavernFloor.value,
      skullCavernBestFloor: skullCavernBestFloor.value,
      skullSafePointFloor: skullSafePointFloor.value,
      guildBadgeBonusAttack: guildBadgeBonusAttack.value,
      guildBonusMaxHp: guildBonusMaxHp.value,
      guildBonusDropRate: guildBonusDropRate.value,
      guildBonusDefense: guildBonusDefense.value
    }
  }

  const normalizeClaimedFloorArray = (value: unknown): number[] => {
    if (!Array.isArray(value)) return []
    return [...new Set(
      value
        .map(entry => Math.floor(Number(entry)))
        .filter(entry => Number.isFinite(entry) && entry > 0)
    )].sort((left, right) => left - right)
  }

  const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    return [...new Set(
      value
        .map(entry => String(entry || '').trim())
        .filter(Boolean)
    )]
  }

  const normalizePendingMineRewards = (value: unknown): PendingMineRewardEntry[] => {
    if (!Array.isArray(value)) return []
    const normalized: PendingMineRewardEntry[] = []
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue
      const raw = entry as Record<string, unknown>
      const kind = raw.kind === 'infested_clear' || raw.kind === 'main_mine_boss' ? raw.kind : null
      const floorNum = Math.floor(Number(raw.floorNum))
      if (!kind || !Number.isFinite(floorNum) || floorNum <= 0) continue
      const itemRewards: InventoryRewardEntry[] = Array.isArray(raw.itemRewards)
        ? raw.itemRewards.reduce<InventoryRewardEntry[]>((entries, item) => {
              if (!item || typeof item !== 'object') return entries
              const rawItem = item as Record<string, unknown>
              const itemId = typeof rawItem.itemId === 'string' ? rawItem.itemId : ''
              const quantity = Math.max(0, Math.floor(Number(rawItem.quantity)))
              const quality: Quality =
                rawItem.quality === 'fine' || rawItem.quality === 'excellent' || rawItem.quality === 'supreme'
                  ? rawItem.quality
                  : 'normal'
              if (!getItemById(itemId) || quantity <= 0) return entries
              entries.push({ itemId, quantity, quality })
              return entries
            }, [])
        : []
      const rawWeaponReward = raw.weaponReward && typeof raw.weaponReward === 'object'
        ? raw.weaponReward as Record<string, unknown>
        : null
      const weaponDefId = typeof rawWeaponReward?.defId === 'string' ? rawWeaponReward.defId : ''
      const weaponEnchantId = typeof rawWeaponReward?.enchantmentId === 'string' ? rawWeaponReward.enchantmentId : null
      const validWeaponEnchantId = weaponEnchantId && getEnchantmentById(weaponEnchantId) ? weaponEnchantId : null
      const weaponReward =
        weaponDefId && getWeaponById(weaponDefId) && (!weaponEnchantId || validWeaponEnchantId)
          ? {
              defId: weaponDefId,
              enchantmentId: null,
              affixes: sanitizeForgeAffixes('weapon', rawWeaponReward?.affixes, validWeaponEnchantId)
            }
          : null
      const ringRewardId = typeof raw.ringRewardId === 'string' && getRingById(raw.ringRewardId) ? raw.ringRewardId : null
      const hatRewardId = typeof raw.hatRewardId === 'string' && getHatById(raw.hatRewardId) ? raw.hatRewardId : null
      const shoeRewardId = typeof raw.shoeRewardId === 'string' && getShoeById(raw.shoeRewardId) ? raw.shoeRewardId : null
      const money = Math.max(0, Math.floor(Number(raw.money) || 0))
      if (itemRewards.length <= 0 && money <= 0 && !weaponReward && !ringRewardId && !hatRewardId && !shoeRewardId) continue
      normalized.push({
        id: getPendingMineRewardId(kind, floorNum),
        kind,
        floorNum,
        itemRewards,
        money,
        weaponReward,
        ringRewardId,
        hatRewardId,
        shoeRewardId,
        message: typeof raw.message === 'string' && raw.message.trim() ? raw.message : ' 已领取暂存矿洞奖励。'
      })
    }
    return normalized
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    defeatedBosses.value = normalizeStringArray((data as Record<string, unknown>).defeatedBosses)
    const hasPotentialBossFirstRewardIds = 'potentialBossFirstRewardIds' in data
    potentialBossFirstRewardIds.value = hasPotentialBossFirstRewardIds
      ? normalizeStringArray((data as Record<string, unknown>).potentialBossFirstRewardIds)
      : [...defeatedBosses.value]
    mineBossPotentialRewardSequence.value = Math.max(0, Math.floor(Number((data as Record<string, unknown>).mineBossPotentialRewardSequence) || 0))

    // 检测旧存档（30层系统）并迁移
    const rawSafePoint = ((data as Record<string, unknown>).safePointFloor as number) ?? 0
    const hasSkullCavern = 'isInSkullCavern' in data
    const isOldSave = rawSafePoint <= 30 && !hasSkullCavern

    if (isOldSave) {
      // 旧存档迁移：safePoint × 2（5→10, 10→20, 15→30, ..., 30→60）
      safePointFloor.value = rawSafePoint * 2
      currentFloor.value = safePointFloor.value > 0 ? safePointFloor.value + 1 : 1
    } else {
      safePointFloor.value = rawSafePoint
      currentFloor.value = data.currentFloor ?? 1
    }

    const progressFloor = Math.max(safePointFloor.value, data.currentFloor ?? 1)
    const legacyClaimedBossFloors = [...new Set([
      ...normalizeClaimedFloorArray((data as Record<string, unknown>).claimedBossRewardFloors),
      ...Object.entries(BOSS_MONSTERS)
        .filter(([, boss]) => defeatedBosses.value.includes(boss.id))
        .map(([floor]) => Number(floor))
    ])].sort((left, right) => left - right)

    claimedInfestedRewardFloors.value = normalizeClaimedFloorArray((data as Record<string, unknown>).claimedInfestedRewardFloors)
    if (claimedInfestedRewardFloors.value.length === 0) {
      claimedInfestedRewardFloors.value = Array.from({ length: progressFloor }, (_, i) => i + 1).filter(f => getFloor(f)?.specialType === 'infested')
    }
    claimedBossRewardFloors.value = legacyClaimedBossFloors
    claimedBossRingRewardFloors.value = [...new Set([
      ...legacyClaimedBossFloors,
      ...normalizeClaimedFloorArray((data as Record<string, unknown>).claimedBossRingRewardFloors)
    ])].sort((left, right) => left - right)
    claimedBossHatRewardFloors.value = [...new Set([
      ...legacyClaimedBossFloors,
      ...normalizeClaimedFloorArray((data as Record<string, unknown>).claimedBossHatRewardFloors)
    ])].sort((left, right) => left - right)
    claimedBossShoeRewardFloors.value = [...new Set([
      ...legacyClaimedBossFloors,
      ...normalizeClaimedFloorArray((data as Record<string, unknown>).claimedBossShoeRewardFloors)
    ])].sort((left, right) => left - right)
    pendingMineRewards.value = normalizePendingMineRewards((data as Record<string, unknown>).pendingMineRewards)
    for (const reward of pendingMineRewards.value) {
      if (reward.kind === 'infested_clear') {
        claimedInfestedRewardFloors.value = [...new Set([...claimedInfestedRewardFloors.value, reward.floorNum])].sort((left, right) => left - right)
      } else if (reward.kind === 'main_mine_boss') {
        const bossId = BOSS_MONSTERS[reward.floorNum]?.id
        if (bossId && !defeatedBosses.value.includes(bossId)) defeatedBosses.value.push(bossId)
        if (reward.itemRewards.length > 0 || reward.money > 0) {
          claimedBossRewardFloors.value = [...new Set([...claimedBossRewardFloors.value, reward.floorNum])].sort((left, right) => left - right)
        }
        if (reward.ringRewardId) {
          claimedBossRingRewardFloors.value = [...new Set([...claimedBossRingRewardFloors.value, reward.floorNum])].sort((left, right) => left - right)
        }
        if (reward.hatRewardId) {
          claimedBossHatRewardFloors.value = [...new Set([...claimedBossHatRewardFloors.value, reward.floorNum])].sort((left, right) => left - right)
        }
        if (reward.shoeRewardId) {
          claimedBossShoeRewardFloors.value = [...new Set([...claimedBossShoeRewardFloors.value, reward.floorNum])].sort((left, right) => left - right)
        }
      }
    }
    if (!hasPotentialBossFirstRewardIds) {
      potentialBossFirstRewardIds.value = [...new Set([...potentialBossFirstRewardIds.value, ...defeatedBosses.value])]
    }

    // 骷髅矿穴状态
    isInSkullCavern.value = ((data as Record<string, unknown>).isInSkullCavern as boolean) ?? false
    skullCavernFloor.value = ((data as Record<string, unknown>).skullCavernFloor as number) ?? 0
    skullCavernBestFloor.value = ((data as Record<string, unknown>).skullCavernBestFloor as number) ?? 0
    skullSafePointFloor.value = ((data as Record<string, unknown>).skullSafePointFloor as number) ?? 0

    // 格子状态不序列化——读档后玩家在矿洞外
    isExploring.value = false
    floorGrid.value = []

    // 公会徽章永久加成
    guildBadgeBonusAttack.value = ((data as Record<string, unknown>).guildBadgeBonusAttack as number) ?? 0
    guildBonusMaxHp.value = ((data as Record<string, unknown>).guildBonusMaxHp as number) ?? 0
    guildBonusDropRate.value = ((data as Record<string, unknown>).guildBonusDropRate as number) ?? 0
    guildBonusDefense.value = ((data as Record<string, unknown>).guildBonusDefense as number) ?? 0
  }

  return {
    environmentWindow,
    currentFloor,
    safePointFloor,
    isExploring,
    isInSkullCavern,
    skullCavernFloor,
    skullCavernBestFloor,
    skullSafePointFloor,
    inCombat,
    combatMonster,
    combatMonsterHp,
    combatRound,
    combatLog,
    combatIsBoss,
    defeatedBosses,
    claimedInfestedRewardFloors,
    claimedBossRewardFloors,
    pendingMineRewards,
    recentRewards,
    // 格子系统
    floorGrid,
    entryIndex,
    stairsFound,
    stairsUsable,
    totalMonstersOnFloor,
    monstersDefeatedCount,
    // 道具系统
    slayerCharmActive,
    guildBadgeBonusAttack,
    guildBonusMaxHp,
    guildBonusDropRate,
    guildBonusDefense,
    // 方法
    isSkullCavernUnlocked,
    getActiveFloorData,
    getMainMineEntryFloor,
    getSkullCavernEntryFloor,
    getUnlockedSafePoints,
    getUnlockedSkullSafePoints,
    canRevealTile,
    engageRevealedMonster,
    revealTile,
    useBombOnGrid,
    enterMine,
    enterSkullCavern,
    combatAction,
    claimPendingMineRewards,
    isGuildGrowthItem,
    useGuildGrowthItem,
    useCombatItem,
    useMonsterLure,
    goNextFloor,
    leaveMine,
    forceLeaveMine,
    serialize,
    deserialize
  }
})
