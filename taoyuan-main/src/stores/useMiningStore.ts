import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { MonsterDef, CombatAction, MineFloorDef, MineTile, Quality } from '@/types'
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
import { getItemById } from '@/data/items'
import {
  getWeaponById,
  getEnchantmentById,
  MONSTER_DROP_WEAPONS,
  BOSS_DROP_WEAPONS,
  TREASURE_DROP_WEAPONS,
  rollRandomEnchantment,
  getWeaponDisplayName
} from '@/data/weapons'
import { getRingById, MONSTER_DROP_RINGS, BOSS_DROP_RINGS, TREASURE_DROP_RINGS } from '@/data/rings'
import { getHatById, MONSTER_DROP_HATS, BOSS_DROP_HATS, TREASURE_DROP_HATS } from '@/data/hats'
import { getShoeById, MONSTER_DROP_SHOES, BOSS_DROP_SHOES, TREASURE_DROP_SHOES } from '@/data/shoes'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useSkillStore } from './useSkillStore'
import { useAchievementStore } from './useAchievementStore'
import { useGuildStore } from './useGuildStore'
import { useQuestStore } from './useQuestStore'
import { useCookingStore } from './useCookingStore'
import { useGameStore } from './useGameStore'
import { useWalletStore } from './useWalletStore'
import { useSecretNoteStore } from './useSecretNoteStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import type { SkullCavernFloorDef } from '@/data/mine'

const DEFEAT_MONEY_PENALTY_RATE = 0.1
const DEFEAT_MONEY_PENALTY_CAP = 15000
const DEFEAT_MAX_ITEM_LOSS = 3

type SessionLootEntry =
  | { kind: 'item'; itemId: string; quantity: number }
  | { kind: 'money'; amount: number }
  | { kind: 'weapon'; defId: string; enchantmentId: string | null }
  | { kind: 'ring'; defId: string }
  | { kind: 'hat'; defId: string }
  | { kind: 'shoe'; defId: string }

type InventoryRewardEntry = { itemId: string; quantity: number; quality?: Quality }

export const useMiningStore = defineStore('mining', () => {
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()

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
  const combatIsBoss = ref(false)

  /** 已击败的 BOSS（首杀记录） */
  const defeatedBosses = ref<string[]>([])

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

  /** 本次探索收集的物品（离开时50%丢失用） */
  const sessionLoot = ref<SessionLootEntry[]>([])

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

  const recordWeaponLoot = (defId: string, enchantmentId: string | null) => {
    sessionLoot.value.push({ kind: 'weapon', defId, enchantmentId })
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
        inventoryStore.removeWeapon(entry.defId, entry.enchantmentId)
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

  const grantInfestedClearRewards = (floorNum: number): { granted: boolean; message: string } => {
    if (claimedInfestedRewardFloors.value.includes(floorNum)) {
      return { granted: false, message: '' }
    }
    const clearRewards = getInfestedClearRewards(floorNum)
    const rewardEntries = clearRewards.items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    if (!canGrantRewardEntries(rewardEntries)) {
      return {
        granted: false,
        message: ' 背包空间不足，感染层奖励暂未领取。请先整理背包后再尝试前进或离开。'
      }
    }
    if (!grantRewardEntries(rewardEntries, true)) {
      return {
        granted: false,
        message: ' 背包空间不足，感染层奖励暂未领取。请先整理背包后再尝试前进或离开。'
      }
    }
    playerStore.earnMoney(clearRewards.money)
    recordMoneyLoot(clearRewards.money)
    claimedInfestedRewardFloors.value.push(floorNum)
    return {
      granted: true,
      message: ` 感染层清除完毕！获得${getRewardNames(clearRewards.items)}和${clearRewards.money}文！`
    }
  }

  const grantMainMineBossRewards = (floorNum: number): { granted: boolean; message: string } => {
    if (claimedBossRewardFloors.value.includes(floorNum)) {
      return { granted: false, message: '' }
    }

    const oreRewards = BOSS_ORE_REWARDS[floorNum]
    if (oreRewards) {
      const rewardEntries = oreRewards.map(ore => ({ itemId: ore.itemId, quantity: ore.quantity }))
      if (!canGrantRewardEntries(rewardEntries)) {
        return {
          granted: false,
          message: ' 背包空间不足，BOSS 楼层奖励暂未领取。请先整理背包后再尝试前进或离开。'
        }
      }
    }

    let message = ''
    const moneyReward = BOSS_MONEY_REWARDS[floorNum] ?? 0
    if (moneyReward > 0) {
      playerStore.earnMoney(moneyReward)
      recordMoneyLoot(moneyReward)
      message += ` 获得${moneyReward}文！`
    }
    if (oreRewards) {
      const rewardEntries = oreRewards.map(ore => ({ itemId: ore.itemId, quantity: ore.quantity }))
      if (!grantRewardEntries(rewardEntries, true)) {
        return {
          granted: false,
          message: ' 背包空间不足，BOSS 楼层奖励暂未领取。请先整理背包后再尝试前进或离开。'
        }
      }
      message += ` 获得了${getRewardNames(oreRewards)}！`
    }
    claimedBossRewardFloors.value.push(floorNum)
    return { granted: true, message }
  }

  const ensureCurrentFloorRewardsClaimed = (): { success: boolean; message: string } => {
    if (!isExploring.value || isInSkullCavern.value) return { success: true, message: '' }
    const floor = getActiveFloorData()
    if (!floor) return { success: true, message: '' }

    if (floor.specialType === 'boss' && stairsUsable.value && !claimedBossRewardFloors.value.includes(currentFloor.value)) {
      const result = grantMainMineBossRewards(currentFloor.value)
      if (!result.granted) {
        return { success: false, message: result.message.trim() || '请先领取 BOSS 楼层奖励。' }
      }
    }

    if (
      floor.specialType === 'infested' &&
      monstersDefeatedCount.value >= totalMonstersOnFloor.value &&
      totalMonstersOnFloor.value > 0 &&
      !claimedInfestedRewardFloors.value.includes(getActiveFloorNum())
    ) {
      const result = grantInfestedClearRewards(getActiveFloorNum())
      if (!result.granted) {
        return { success: false, message: result.message.trim() || '请先领取感染层清剿奖励。' }
      }
    }

    return { success: true, message: '' }
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
  const engageRevealedMonster = (index: number): { success: boolean; message: string; startsCombat: boolean } => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。', startsCombat: false }
    if (inCombat.value) return { success: false, message: '战斗中无法探索。', startsCombat: false }

    const tile = floorGrid.value[index]
    if (!tile || tile.state !== 'revealed') return { success: false, message: '无法交战。', startsCombat: false }
    if (tile.type !== 'monster' && tile.type !== 'boss') return { success: false, message: '该格子没有怪物。', startsCombat: false }

    const monster = tile.data?.monster
    if (!monster) return { success: false, message: '该格子没有怪物。', startsCombat: false }

    _combatTileIndex.value = tile.index
    combatMonster.value = { ...monster }
    combatMonsterHp.value = monster.hp
    combatRound.value = 0

    if (tile.type === 'boss') {
      const isFirstKill = !defeatedBosses.value.includes(monster.id)
      combatLog.value = [`BOSS战！再次挑战${monster.name}！(HP: ${monster.hp})${isFirstKill ? '' : '（弱化版）'}`]
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
  const revealTile = (index: number): { success: boolean; message: string; startsCombat: boolean } => {
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
    const walletStore = useWalletStore()
    const walletMiningReduction = walletStore.getMiningStaminaReduction()
    const ringMiningReduction = inventoryStore.getRingEffectValue('mining_stamina')
    const ringGlobalReduction = inventoryStore.getRingEffectValue('stamina_reduction')
    // 仙缘能力：聚气（shan_weng_1）挖矿体力-15%
    const spiritMiningReduction = useHiddenNpcStore().getAbilityValue('shan_weng_1') / 100
    const staminaCost = Math.max(
      1,
      Math.floor(
        2 *
          pickaxeMultiplier *
          (1 - skillStore.getStaminaReduction('mining')) *
          (1 - miningBuff) *
          (1 - walletMiningReduction) *
          (1 - ringMiningReduction) *
          (1 - ringGlobalReduction) *
          (1 - spiritMiningReduction)
      )
    )
    if (!playerStore.consumeStamina(staminaCost)) {
      return { success: false, message: '体力不足，无法探索。', startsCombat: false }
    }

    // 3% 概率获得秘密笔记
    if (Math.random() < 0.03) {
      useSecretNoteStore().tryCollectNote()
    }

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
  const _handleEmptyTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    tile.state = 'revealed'
    return { success: true, message: `探索了一个空区域。(-${staminaCost}体力)`, startsCombat: false }
  }

  /** 处理矿石格子 */
  const _handleOreTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const oreId = tile.data?.oreId ?? 'copper_ore'
    let quantity = tile.data?.oreQuantity ?? 1

    // 矿工专精：50%概率+1
    const miningSkill = skillStore.getSkill('mining')
    if (miningSkill.perk5 === 'miner' && Math.random() < 0.5) quantity += 1
    // 山丘农场加成：50%概率+1
    const gameStore = useGameStore()
    if (gameStore.farmMapType === 'hilltop' && Math.random() < 0.5) quantity += 1
    // 探矿者专精：15% 概率双倍
    if (miningSkill.perk10 === 'prospector' && Math.random() < 0.15) quantity *= 2
    // perk15 矿石加成：矿脉探寻者/宗师铁匠 30%概率双倍
    if ((miningSkill.perk15 === 'vein_seeker' || miningSkill.perk15 === 'master_smith') && Math.random() < 0.3) quantity *= 2
    // perk20 矿石加成：大地脉动/锻造神 50%概率×3
    if ((miningSkill.perk20 === 'earth_pulse' || miningSkill.perk20 === 'forge_god') && Math.random() < 0.5) quantity = Math.floor(quantity * 3)
    // 戒指矿石加成
    const ringOreBonus = inventoryStore.getRingEffectValue('ore_bonus')
    if (ringOreBonus > 0) quantity += Math.floor(ringOreBonus)
    // 仙缘能力：灵狐眼（hu_xian_2）15%概率额外掉落矿石
    if (useHiddenNpcStore().isAbilityActive('hu_xian_2') && Math.random() < 0.15) quantity += 1

    const hiddenNpcStore = useHiddenNpcStore()
    const herbRewards: InventoryRewardEntry[] = []
    if (hiddenNpcStore.isAbilityActive('shan_weng_2') && Math.random() < 0.15) {
      const herbs = ['herb', 'ginseng'] as const
      const herbId = herbs[Math.floor(Math.random() * herbs.length)]!
      herbRewards.push({ itemId: herbId, quantity: 1 })
    }

    const rewardEntries: InventoryRewardEntry[] = [{ itemId: oreId, quantity }, ...herbRewards]
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法收取矿石。', startsCombat: false }
    }

    useQuestStore().onItemObtained(oreId, quantity)

    // 经验
    const hilltopXpBonus = gameStore.farmMapType === 'hilltop' ? 1.25 : 1.0
    skillStore.addExp('mining', Math.floor(5 * hilltopXpBonus))

    tile.state = 'collected'
    return { success: true, message: `挖到了${quantity}个矿石！(-${staminaCost}体力)`, startsCombat: false }
  }

  /** 处理怪物格子 */
  const _handleMonsterTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const monster = tile.data?.monster
    if (!monster) {
      tile.state = 'revealed'
      return { success: true, message: '空无一物。', startsCombat: false }
    }

    _combatTileIndex.value = tile.index
    combatMonster.value = { ...monster }
    combatMonsterHp.value = monster.hp
    combatRound.value = 0
    combatLog.value = [`遭遇了${monster.name}！(HP: ${monster.hp})  (-${staminaCost}体力)`]
    combatIsBoss.value = false
    inCombat.value = true

    return { success: true, message: `遭遇了${monster.name}！`, startsCombat: true }
  }

  /** 处理 BOSS 格子 */
  const _handleBossTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const monster = tile.data?.monster
    if (!monster) {
      tile.state = 'revealed'
      return { success: true, message: '空无一物。', startsCombat: false }
    }

    _combatTileIndex.value = tile.index
    combatMonster.value = { ...monster }
    combatMonsterHp.value = monster.hp
    combatRound.value = 0

    const isFirstKill = !defeatedBosses.value.includes(monster.id)
    combatLog.value = [`BOSS战！遭遇了${monster.name}！(HP: ${monster.hp})${isFirstKill ? '' : '（弱化版）'}  (-${staminaCost}体力)`]
    combatIsBoss.value = true
    inCombat.value = true

    return { success: true, message: `BOSS层！${monster.name}挡住了去路！`, startsCombat: true }
  }

  /** 处理楼梯格子 */
  const _handleStairsTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    tile.state = 'revealed'
    stairsFound.value = true

    if (!stairsUsable.value) {
      const floor = getActiveFloorData()
      if (floor?.specialType === 'infested') {
        const remaining = totalMonstersOnFloor.value - monstersDefeatedCount.value
        return {
          success: true,
          message: `发现了楼梯！但需要先清除剩余${remaining}只怪物才能前进。(-${staminaCost}体力)`,
          startsCombat: false
        }
      }
      if (floor?.specialType === 'boss') {
        return { success: true, message: `发现了楼梯！但需要先击败BOSS才能前进。(-${staminaCost}体力)`, startsCombat: false }
      }
    }

    return { success: true, message: `发现了楼梯！可以前往下一层。(-${staminaCost}体力)`, startsCombat: false }
  }

  /** 处理陷阱格子 */
  const _handleTrapTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const damage = tile.data?.trapDamage ?? 5
    playerStore.takeDamage(damage)
    tile.state = 'triggered'

    if (playerStore.hp <= 0) {
      const defeatResult = handleDefeat()
      return { success: true, message: `踩中了陷阱！受到${damage}点伤害。${defeatResult.message}`, startsCombat: false }
    }

    return { success: true, message: `踩中了陷阱！受到${damage}点伤害。(-${staminaCost}体力)`, startsCombat: false }
  }

  /** 处理宝箱格子 */
  const _handleTreasureTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const items = tile.data?.treasureItems ?? []
    const money = tile.data?.treasureMoney ?? 0

    const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法开启宝箱。', startsCombat: false }
    }
    if (money > 0) {
      playerStore.earnMoney(money)
      recordMoneyLoot(money)
    }

    // 宝箱戒指掉落
    const floor = getActiveFloorData()
    const treasureRings = TREASURE_DROP_RINGS[floor?.zone ?? 'shallow']
    if (treasureRings) {
      const ringTreasureBonus = inventoryStore.getRingEffectValue('treasure_find')
      for (const tr of treasureRings) {
        if (Math.random() < tr.chance + ringTreasureBonus * tr.chance) {
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
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find')
      for (const th of treasureHats) {
        if (Math.random() < th.chance + treasureBonus * th.chance) {
          inventoryStore.addHat(th.hatId)
          recordHatLoot(th.hatId)
          items.push({ itemId: th.hatId, quantity: 1 })
        }
      }
    }

    // 宝箱鞋子掉落
    const treasureShoes = TREASURE_DROP_SHOES[floor?.zone ?? 'shallow']
    if (treasureShoes) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find')
      for (const ts of treasureShoes) {
        if (Math.random() < ts.chance + treasureBonus * ts.chance) {
          inventoryStore.addShoe(ts.shoeId)
          recordShoeLoot(ts.shoeId)
          items.push({ itemId: ts.shoeId, quantity: 1 })
        }
      }
    }

    // 宝箱武器掉落
    const treasureWeapons = TREASURE_DROP_WEAPONS[floor?.zone ?? 'shallow']
    if (treasureWeapons) {
      const treasureBonus = inventoryStore.getRingEffectValue('treasure_find')
      for (const tw of treasureWeapons) {
        if (Math.random() < tw.chance + treasureBonus * tw.chance) {
          const enchantId = rollRandomEnchantment()
          inventoryStore.addWeapon(tw.weaponId, enchantId)
          recordWeaponLoot(tw.weaponId, enchantId)
          items.push({ itemId: tw.weaponId, quantity: 1 })
        }
      }
    }

    tile.state = 'collected'

    let msg = '发现宝箱！'
    if (items.length > 0) msg += `获得了${getRewardNames(items)}`
    if (money > 0) msg += `${items.length > 0 ? '和' : '获得了'}${money}文`
    msg += `！(-${staminaCost}体力)`
    return { success: true, message: msg, startsCombat: false }
  }

  /** 处理蘑菇格子 */
  const _handleMushroomTile = (tile: MineTile, staminaCost: number): { success: boolean; message: string; startsCombat: boolean } => {
    const items = tile.data?.mushroomItems ?? []

    const rewardEntries = items.map(r => ({ itemId: r.itemId, quantity: r.quantity }))
    if (!canGrantRewardEntries(rewardEntries) || !grantRewardEntries(rewardEntries, true)) {
      playerStore.restoreStamina(staminaCost)
      return { success: false, message: '背包空间不足，无法采集蘑菇。', startsCombat: false }
    }
    skillStore.addExp('foraging', 3)

    tile.state = 'collected'
    return { success: true, message: `采集到了${getRewardNames(items)}！(+3采集经验, -${staminaCost}体力)`, startsCombat: false }
  }

  // ==================== 炸弹 ====================

  /** 在格子上使用炸弹 */
  const useBombOnGrid = (bombId: string, centerIndex: number): { success: boolean; message: string } => {
    if (!isExploring.value) return { success: false, message: '你不在矿洞中。' }
    if (inCombat.value) return { success: false, message: '战斗中无法使用炸弹。' }

    const bombDef = getBombById(bombId)
    if (!bombDef) return { success: false, message: '无效的炸弹。' }
    if (!inventoryStore.removeItem(bombId)) return { success: false, message: '背包中没有该炸弹。' }

    // 挖掘者专精：30%概率不消耗炸弹；perk15深渊挖掘者/perk20深渊矿工：必定不消耗
    const _miningSkill = skillStore.getSkill('mining')
    const abyssMinerActive = _miningSkill.perk20 === 'abyss_miner'
    const deepExcavatorActive = _miningSkill.perk15 === 'deep_excavator'
    const excavatorSaved = abyssMinerActive || deepExcavatorActive || (_miningSkill.perk10 === 'excavator' && Math.random() < 0.3)
    if (excavatorSaved) {
      inventoryStore.addItem(bombId, 1)
    }

    const indices = getBombIndices(centerIndex, bombId)
    const floor = getActiveFloorData()

    let oreCollected = 0
    let monstersKilled = 0
    const collectedOres: string[] = []
    let inventoryBlocked = false

    for (const idx of indices) {
      const tile = floorGrid.value[idx]
      if (!tile || tile.state !== 'hidden') continue

      switch (tile.type) {
        case 'empty':
          tile.state = 'revealed'
          break
        case 'ore': {
          const oreId = tile.data?.oreId ?? 'copper_ore'
          // 炸弹采矿不享受矿工专精/地形/探矿者加成，仅给基础数量
          const quantity = tile.data?.oreQuantity ?? 1
          if (!canGrantRewardEntries([{ itemId: oreId, quantity }]) || !grantRewardEntries([{ itemId: oreId, quantity }], true)) {
            inventoryBlocked = true
            break
          }
          useAchievementStore().discoverItem(oreId)
          collectedOres.push(oreId)
          oreCollected++
          tile.state = 'collected'
          break
        }
        case 'monster': {
          if (bombDef.clearsMonster && tile.data?.monster) {
            // 炸弹击杀怪物：50% 经验
            const monster = tile.data.monster
            const wildernessXpBonus = useGameStore().farmMapType === 'wilderness' ? 1.5 : 1.0
            skillStore.addExp('combat', Math.floor(monster.expReward * 0.5 * wildernessXpBonus))
            // 普通掉落（概率减半）
            for (const drop of monster.drops) {
              if (Math.random() < drop.chance * 0.5) {
                addAndRecordItemLoot(drop.itemId, 1)
              }
            }
            tile.state = 'defeated'
            monstersDefeatedCount.value++
            useAchievementStore().recordMonsterKill()
            useGuildStore().recordKill(monster.id)
            monstersKilled++
          } else {
            // 爆竹只翻开，不杀怪物
            tile.state = 'revealed'
          }
          break
        }
        case 'boss':
          // 炸弹不杀 BOSS，只翻开
          tile.state = 'revealed'
          break
        case 'trap':
          // 炸弹引爆陷阱，免伤
          tile.state = 'triggered'
          break
        case 'stairs':
          tile.state = 'revealed'
          stairsFound.value = true
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
          }
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

    if (oreCollected > 0) skillStore.addExp('mining', 5 * oreCollected)

    let msg = `${bombDef.name}爆炸了！`
    if (oreCollected > 0) msg += `采集了${oreCollected}份矿石`
    if (monstersKilled > 0) msg += `${oreCollected > 0 ? '，' : ''}击败了${monstersKilled}只怪物`
    if (oreCollected === 0 && monstersKilled === 0) msg += '翻开了一些区域'
    msg += '！'
    if (excavatorSaved) msg += '（挖掘者：炸弹未消耗！）'
    if (inventoryBlocked) msg += '（部分奖励因背包空间不足未领取）'
    return { success: true, message: msg }
  }

  // ==================== 进入 / 离开 ====================

  /** 进入矿洞（可选择起始安全点楼层） */
  const enterMine = (startFromSafePoint?: number): string => {
    isExploring.value = true
    isInSkullCavern.value = false
    const baseFloor = startFromSafePoint ?? safePointFloor.value
    currentFloor.value = baseFloor + 1
    sessionLoot.value = []

    _generateGrid()

    // BOSS 层自动进入战斗（如果格子中有 boss 且入口邻格就是 boss）
    _checkAutoBossCombat()

    return `进入云隐矿洞，当前第${currentFloor.value}层。`
  }

  /** 进入骷髅矿穴（可选择起始安全点楼层） */
  const enterSkullCavern = (startFromSafePoint?: number): string => {
    if (!isSkullCavernUnlocked()) return '需要先击败60层BOSS才能进入骷髅矿穴。'
    isExploring.value = true
    isInSkullCavern.value = true
    const baseFloor = startFromSafePoint ?? skullSafePointFloor.value
    skullCavernFloor.value = baseFloor + 1
    cacheSkullFloor(skullCavernFloor.value)
    sessionLoot.value = []

    _generateGrid()

    _checkAutoBossCombat()

    return `进入骷髅矿穴，当前第${skullCavernFloor.value}层。`
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
  const combatAction = (action: CombatAction): { message: string; combatOver: boolean; won: boolean } => {
    if (!inCombat.value || !combatMonster.value) {
      return { message: '不在战斗中。', combatOver: true, won: false }
    }

    combatRound.value++
    const monster = combatMonster.value

    // BOSS 战不可逃跑
    if (action === 'flee') {
      if (combatIsBoss.value) {
        combatLog.value.push('BOSS战无法逃跑！')
        return { message: 'BOSS战无法逃跑！', combatOver: false, won: false }
      }
      inCombat.value = false
      // 逃跑时格子标记为 revealed（怪物还在但已翻开）
      if (_combatTileIndex.value >= 0) {
        const tile = floorGrid.value[_combatTileIndex.value]
        if (tile) tile.state = 'revealed'
        _combatTileIndex.value = -1
      }
      combatLog.value.push('你逃跑了！')
      return { message: '成功逃离了战斗。', combatOver: true, won: false }
    }

    if (action === 'defend') {
      // 防御减少受到的伤害（重甲者专精：70%减伤，默认60%）
      const cookingStore = useCookingStore()
      const defenseReduction = cookingStore.getActiveDefenseReduction()
      const defenseFlatBonus = cookingStore.getActiveDefenseFlatBonus()
      const _combatSkillD = skillStore.getSkill('combat')
      const tankReduction = _combatSkillD.perk20 === 'indestructible' || _combatSkillD.perk20 === 'shadow_sovereign' ? 0.95
        : _combatSkillD.perk15 === 'iron_fortress' || _combatSkillD.perk15 === 'phantom_blade' ? 0.85
        : _combatSkillD.perk10 === 'tank' ? 0.7 : 0.6
      // 坚韧附魔
      const owned = inventoryStore.getEquippedWeapon()
      const enchant = owned.enchantmentId ? getEnchantmentById(owned.enchantmentId) : null
      const sturdyReduction = enchant?.special === 'sturdy' ? 0.85 : 1.0
      const ringDefenseBonus = inventoryStore.getRingEffectValue('defense_bonus')
      const damage = Math.max(
        1,
        Math.floor(
          Math.max(0, monster.attack - defenseFlatBonus) *
            (1 - tankReduction) *
            (1 - defenseReduction) *
            sturdyReduction *
            (1 - ringDefenseBonus) *
            (1 - guildBonusDefense.value)
        )
      )
      playerStore.takeDamage(damage)
      let defendMsg = `你举盾防御，受到${damage}点伤害。`

      // 守护者专精：防御回合回血；perk15/perk20 回血量更多
      const _combatSkillDef = skillStore.getSkill('combat')
      if (_combatSkillDef.perk20 === 'indestructible' || _combatSkillDef.perk20 === 'shadow_sovereign') {
        const healAmt = Math.floor(playerStore.getMaxHp() * 0.15)
        playerStore.restoreHealth(healAmt)
        defendMsg += `（铁壁：回复${healAmt}HP）`
      } else if (_combatSkillDef.perk15 === 'iron_fortress' || _combatSkillDef.perk15 === 'phantom_blade') {
        playerStore.restoreHealth(15)
        defendMsg += '（精英防御：回复15HP）'
      } else if (_combatSkillDef.perk5 === 'defender') {
        playerStore.restoreHealth(5)
        defendMsg += '（守护者回复5HP）'
      }

      combatLog.value.push(defendMsg)

      if (playerStore.hp <= 0) {
        return handleDefeat()
      }
      return { message: `防御！受到${damage}点伤害。`, combatOver: false, won: false }
    }

    // === 攻击 ===
    const cookingStore = useCookingStore()
    const owned = inventoryStore.getEquippedWeapon()
    const weaponDef = getWeaponById(owned.defId)
    const enchant = owned.enchantmentId ? getEnchantmentById(owned.enchantmentId) : null

    // 基础攻击力（含戒指加成 + 料理全技能加成）
    const ringAttackBonus = inventoryStore.getRingEffectValue('attack_bonus')
    const allSkillsBuff = cookingStore.activeBuff?.type === 'all_skills' ? cookingStore.activeBuff.value : 0
    const guildStore = useGuildStore()
    const baseAttack =
      inventoryStore.getWeaponAttack() +
      (skillStore.combatLevel + allSkillsBuff) * 2 +
      ringAttackBonus +
      guildBadgeBonusAttack.value +
      guildStore.getGuildAttackBonus()
    const _combatSkillA = skillStore.getSkill('combat')
    const bruteBonus = (_combatSkillA.perk20 === 'war_god' || _combatSkillA.perk20 === 'slaughter_king') ? 2.0
      : (_combatSkillA.perk15 === 'berserker' || _combatSkillA.perk15 === 'sword_saint') ? 1.55
      : _combatSkillA.perk10 === 'brute' ? 1.25 : 1.0

    // 暴击判定（含戒指加成 + 幸运加成）
    const ringCritBonus = inventoryStore.getRingEffectValue('crit_rate_bonus')
    const ringLuck = inventoryStore.getRingEffectValue('luck')
    const critRate = inventoryStore.getWeaponCritRate() + ringCritBonus + ringLuck * 0.5
    const isCrit = Math.random() < critRate
    const critMult = isCrit ? 1.5 : 1.0

    const damageToMonster = Math.max(1, Math.floor((baseAttack - monster.defense) * bruteBonus * critMult))
    combatMonsterHp.value -= damageToMonster
    const totalDamageDealt = damageToMonster

    let msg = `你攻击${monster.name}，造成${damageToMonster}点伤害。`
    if (isCrit) msg = `暴击！${msg}`

    // 匕首追加攻击（25%概率，造成50%伤害）
    let extraDamage = 0
    if (weaponDef?.type === 'dagger' && Math.random() < 0.25) {
      const bonusDamage = Math.max(1, Math.floor(damageToMonster * 0.5))
      combatMonsterHp.value -= bonusDamage
      extraDamage = bonusDamage
      msg += ` 追加攻击！额外造成${bonusDamage}点伤害！`
    }

    // 锤眩晕判定（20%概率跳过怪物反击）
    const isStunned = weaponDef?.type === 'club' && Math.random() < 0.2

    // 吸血（附魔 + 戒指叠加）
    const ringVampiric = inventoryStore.getRingEffectValue('vampiric')
    const totalVampiric = (enchant?.special === 'vampiric' ? 0.15 : 0) + ringVampiric
    if (totalVampiric > 0) {
      const healAmount = Math.floor((totalDamageDealt + extraDamage) * totalVampiric)
      if (healAmount > 0) {
        playerStore.restoreHealth(healAmount)
        msg += ` 吸血回复${healAmount}HP！`
      }
    }

    if (combatMonsterHp.value <= 0) {
      // 怪物被击败
      return handleMonsterDefeat(monster, msg, totalDamageDealt + extraDamage)
    }

    if (isStunned) {
      msg += ` ${monster.name}被震晕了！`
      combatLog.value.push(msg)
      return { message: msg, combatOver: false, won: false }
    }

    // 闪避判定（杂技师25%，幻影剑客40%，暗影霸主80%）
    const _combatSkillE = skillStore.getSkill('combat')
    const dodgeRate = _combatSkillE.perk20 === 'shadow_sovereign' ? 0.80
      : _combatSkillE.perk15 === 'phantom_blade' ? 0.40
      : _combatSkillE.perk10 === 'acrobat' ? 0.25 : 0
    if (dodgeRate > 0 && Math.random() < dodgeRate) {
      msg += ` 你灵巧地闪避了${monster.name}的反击！`
      combatLog.value.push(msg)
      return { message: msg, combatOver: false, won: false }
    }

    // 怪物反击（含戒指减伤）
    const defenseReduction = cookingStore.getActiveDefenseReduction()
    const defenseFlatBonus = cookingStore.getActiveDefenseFlatBonus()
    const fighterReduction = (_combatSkillE.perk5 === 'fighter' || _combatSkillE.perk15 === 'sword_saint' || _combatSkillE.perk15 === 'berserker' || _combatSkillE.perk20 === 'war_god' || _combatSkillE.perk20 === 'slaughter_king') ? 0.15 : 0
    const sturdyReduction = enchant?.special === 'sturdy' ? 0.85 : 1.0
    const ringDefenseBonus = inventoryStore.getRingEffectValue('defense_bonus')
    const monsterDamage = Math.max(
      1,
      Math.floor(
        Math.max(0, monster.attack - defenseFlatBonus) *
          (1 - fighterReduction) *
          (1 - defenseReduction) *
          sturdyReduction *
          (1 - ringDefenseBonus) *
          (1 - guildBonusDefense.value)
      )
    )
    playerStore.takeDamage(monsterDamage)
    msg += ` ${monster.name}反击，你受到${monsterDamage}点伤害。`
    combatLog.value.push(msg)

    if (playerStore.hp <= 0) {
      return handleDefeat()
    }

    return { message: msg, combatOver: false, won: false }
  }

  /** 处理怪物击败（普通怪和 BOSS 共用） */
  const handleMonsterDefeat = (
    monster: MonsterDef,
    msg: string,
    _totalDamage: number
  ): { message: string; combatOver: boolean; won: boolean } => {
    inCombat.value = false
    let inventoryBlocked = false

    // 经验
    const floor = getActiveFloorData()
    const wildernessXpBonus = useGameStore().farmMapType === 'wilderness' ? 1.5 : 1.0
    const infestedXpBonus = floor?.specialType === 'infested' ? 1.5 : 1.0
    skillStore.addExp('combat', Math.floor(monster.expReward * wildernessXpBonus * infestedXpBonus))

    // 幸运附魔 + 戒指增加掉落率
    const owned = inventoryStore.getEquippedWeapon()
    const enchant = owned.enchantmentId ? getEnchantmentById(owned.enchantmentId) : null
    const ringDropBonus = inventoryStore.getRingEffectValue('monster_drop_bonus')
    const ringLuckBonus = inventoryStore.getRingEffectValue('luck')
    const luckyBonus =
      (enchant?.special === 'lucky' ? 0.2 : 0) +
      ringDropBonus +
      ringLuckBonus * 0.5 +
      (slayerCharmActive.value ? 0.2 : 0) +
      guildBonusDropRate.value

    // 普通掉落
    const drops: string[] = []
    for (const drop of monster.drops) {
      if (Math.random() < Math.min(drop.chance + luckyBonus, 1)) {
        if (addAndRecordItemLoot(drop.itemId, 1) > 0) {
          useAchievementStore().discoverItem(drop.itemId)
          drops.push(drop.itemId)
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
          drops.push(bonusOre)
        } else {
          inventoryBlocked = true
        }
      }
    }

    // 屠杀之王/狂战士：击杀回血
    const _combatSkillK = skillStore.getSkill('combat')
    if (_combatSkillK.perk20 === 'slaughter_king' || _combatSkillK.perk20 === 'war_god') {
      const healOnKill = Math.floor(playerStore.getMaxHp() * 0.2)
      playerStore.restoreHealth(healOnKill)
    } else if (_combatSkillK.perk15 === 'berserker' || _combatSkillK.perk15 === 'sword_saint') {
      const healOnKill = Math.floor(playerStore.getMaxHp() * 0.1)
      playerStore.restoreHealth(healOnKill)
    }

    // 武器掉落（普通怪物，非 BOSS）
    if (!combatIsBoss.value && floor) {
      const weaponDrops = MONSTER_DROP_WEAPONS[floor.zone]
      if (weaponDrops) {
        for (const wd of weaponDrops) {
          const dropChance = wd.chance + luckyBonus * wd.chance
          if (Math.random() < dropChance) {
            const enchantId = rollRandomEnchantment()
            inventoryStore.addWeapon(wd.weaponId, enchantId)
            recordWeaponLoot(wd.weaponId, enchantId)
            const displayName = getWeaponDisplayName(wd.weaponId, enchantId)
            msg += ` 获得了武器：${displayName}！`
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
          }
        }
      }
    }

    // BOSS 击败处理
    if (combatIsBoss.value) {
      if (isInSkullCavern.value) {
        // 骷髅矿穴BOSS：奖励铜钱和矿石（按深度缩放）
        const scFloor = skullCavernFloor.value
        const moneyReward = 200 + scFloor * 20
        playerStore.earnMoney(moneyReward)
        recordMoneyLoot(moneyReward)
        msg += ` 获得${moneyReward}文！`
        const bonusOreCount = 3 + Math.floor(scFloor / 25)
        const orePool = ['iridium_ore', 'void_ore', 'shadow_ore']
        for (let i = 0; i < bonusOreCount; i++) {
          const oreId = orePool[Math.floor(Math.random() * orePool.length)]!
          if (addAndRecordItemLoot(oreId, 1) <= 0) {
            inventoryBlocked = true
          }
        }
        msg += ` 获得了${bonusOreCount}个稀有矿石！`
      } else {
        // 主矿洞BOSS
        const bossId = monster.id
        const isFirstKill = !defeatedBosses.value.includes(bossId)

        if (isFirstKill) {
          defeatedBosses.value.push(bossId)
          // 首杀掉落武器
          const weaponId = BOSS_DROP_WEAPONS[currentFloor.value]
          if (weaponId) {
            const bossWeaponDef = getWeaponById(weaponId)
            const fixedEnchant = bossWeaponDef?.fixedEnchantment ?? null
            inventoryStore.addWeapon(weaponId, fixedEnchant)
            recordWeaponLoot(weaponId, fixedEnchant)
            const displayName = getWeaponDisplayName(weaponId, fixedEnchant)
            msg += ` 首次击败BOSS！获得了传说武器：${displayName}！`
          }
        }
        // 装备掉落（独立于首杀，使用 has* 去重，兼容旧存档补发）
        const bossRingId = BOSS_DROP_RINGS[currentFloor.value]
        if (bossRingId && !claimedBossRingRewardFloors.value.includes(currentFloor.value)) {
          inventoryStore.addRing(bossRingId)
          recordRingLoot(bossRingId)
          claimedBossRingRewardFloors.value.push(currentFloor.value)
          const bossRingDef = getRingById(bossRingId)
          msg += ` 获得了戒指：${bossRingDef?.name ?? bossRingId}！`
        }
        const bossHatId = BOSS_DROP_HATS[currentFloor.value]
        if (bossHatId && !claimedBossHatRewardFloors.value.includes(currentFloor.value)) {
          inventoryStore.addHat(bossHatId)
          recordHatLoot(bossHatId)
          claimedBossHatRewardFloors.value.push(currentFloor.value)
          const bossHatDef = getHatById(bossHatId)
          msg += ` 获得了帽子：${bossHatDef?.name ?? bossHatId}！`
        }
        const bossShoeId = BOSS_DROP_SHOES[currentFloor.value]
        if (bossShoeId && !claimedBossShoeRewardFloors.value.includes(currentFloor.value)) {
          inventoryStore.addShoe(bossShoeId)
          recordShoeLoot(bossShoeId)
          claimedBossShoeRewardFloors.value.push(currentFloor.value)
          const bossShoeDef = getShoeById(bossShoeId)
          msg += ` 获得了鞋子：${bossShoeDef?.name ?? bossShoeId}！`
        }

        msg += grantMainMineBossRewards(currentFloor.value).message
      }
    }

    msg += ` ${monster.name}被击败了！(+${monster.expReward}经验)`
    if (drops.length > 0) msg += ` 掉落了物品。`
    if (inventoryBlocked) msg += ' 部分掉落因背包空间不足未领取。'
    combatLog.value.push(msg)

    // === 更新格子状态 ===
    if (_combatTileIndex.value >= 0) {
      const tile = floorGrid.value[_combatTileIndex.value]
      if (tile) tile.state = 'defeated'
      _combatTileIndex.value = -1
    }
    monstersDefeatedCount.value++
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
      }
    } else if (floor?.specialType === 'infested') {
      const remaining = totalMonstersOnFloor.value - monstersDefeatedCount.value
      msg += ` 还剩${remaining}只怪物！`
    }

    combatIsBoss.value = false
    return { message: msg, combatOver: true, won: true }
  }

  /** 战斗失败处理 */
  const handleDefeat = (): { message: string; combatOver: boolean; won: boolean } => {
    inCombat.value = false
    combatIsBoss.value = false
    const wasInSkullCavern = isInSkullCavern.value
    isExploring.value = false
    monsterLureUsedOnFloor.value = false
    slayerCharmActive.value = false

    // 清空格子
    floorGrid.value = []
    _combatTileIndex.value = -1

    // 丢失50%本次探索物品
    const lostCount = Math.ceil(sessionLoot.value.length / 2)
    for (let i = 0; i < lostCount; i++) {
      if (sessionLoot.value.length === 0) break
      const idx = Math.floor(Math.random() * sessionLoot.value.length)
      const [entry] = sessionLoot.value.splice(idx, 1)
      if (entry) rollbackLootEntry(entry)
    }

    // 随机丢失最多3件背包物品
    const droppedItems: string[] = []
    const availableItems = inventoryStore.items.filter(i => i.quantity > 0 && !i.locked)
    const dropCount = Math.min(DEFEAT_MAX_ITEM_LOSS, availableItems.length)
    for (let i = 0; i < dropCount; i++) {
      const candidates = inventoryStore.items.filter(i => i.quantity > 0 && !i.locked)
      if (candidates.length === 0) break
      const pick = candidates[Math.floor(Math.random() * candidates.length)]!
      droppedItems.push(pick.itemId)
      inventoryStore.removeItem(pick.itemId, 1, pick.quality)
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
    const parts: string[] = [`你在${location}中倒下了……`]
    parts.push('丢失了一半战利品')
    if (droppedItems.length > 0) parts.push(`和${droppedItems.length}件背包物品`)
    if (moneyLost > 0) parts.push(`及${moneyLost}文`)
    parts.push('，被送回入口。')
    const msg = parts.join('')
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
      // 骷髅矿穴：无上限，每10层安全点
      skullCavernFloor.value++
      cacheSkullFloor(skullCavernFloor.value)
      if (skullCavernFloor.value > skullCavernBestFloor.value) {
        skullCavernBestFloor.value = skullCavernFloor.value
        useAchievementStore().recordSkullCavernFloor(skullCavernFloor.value)
      }
      // 到达新安全点时保存
      const skullFloor = cachedSkullFloorData.value
      if (skullFloor?.isSafePoint && skullFloor.specialType !== 'boss' && skullCavernFloor.value > skullSafePointFloor.value) {
        skullSafePointFloor.value = skullCavernFloor.value
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
          return { success: true, message: '你穿过矿洞最深处的裂隙，进入了骷髅矿穴第1层！' }
        }
        return { success: false, message: '已经到达矿洞最深处！（击败60层BOSS可解锁骷髅矿穴）' }
      }

      currentFloor.value++
      useAchievementStore().recordMineFloor(currentFloor.value)

      // 到达新的安全点时保存（只在到达更高层时更新，避免电梯返回低层后覆盖进度）
      const newFloorData = getFloor(currentFloor.value)
      if (newFloorData?.isSafePoint && newFloorData.specialType !== 'boss' && currentFloor.value > safePointFloor.value) {
        safePointFloor.value = currentFloor.value
      }
    }

    // 生成新层格子
    _generateGrid()

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
    return { success: true, message: msg }
  }

  /** 离开矿洞 */
  const leaveMine = (): string => {
    const pendingRewardCheck = ensureCurrentFloorRewardsClaimed()
    if (!pendingRewardCheck.success) {
      return pendingRewardCheck.message
    }

    // 离开前保存安全点（防止玩家到达安全点楼层后直接离开）
    if (!isInSkullCavern.value) {
      const floor = getActiveFloorData()
      if (floor?.isSafePoint && floor.specialType !== 'boss' && currentFloor.value > safePointFloor.value) {
        safePointFloor.value = currentFloor.value
      }
    }
    // 骷髅矿穴：离开前保存安全点
    if (isInSkullCavern.value) {
      const skullFloor = cachedSkullFloorData.value
      if (skullFloor?.isSafePoint && skullFloor.specialType !== 'boss' && skullCavernFloor.value > skullSafePointFloor.value) {
        skullSafePointFloor.value = skullCavernFloor.value
      }
    }
    isExploring.value = false
    combatIsBoss.value = false
    floorGrid.value = []
    _combatTileIndex.value = -1
    monsterLureUsedOnFloor.value = false
    slayerCharmActive.value = false
    if (isInSkullCavern.value) {
      isInSkullCavern.value = false
      cachedSkullFloorData.value = null
      return '你离开了骷髅矿穴。'
    }
    return '你离开了矿洞。'
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

  const useCombatItem = (itemId: string): { success: boolean; message: string } => {
    if (!inCombat.value && !isExploring.value) return { success: false, message: '不在矿洞中。' }

    // 公会徽章：永久+3攻击力
    if (itemId === 'guild_badge') {
      if (!inventoryStore.removeItem('guild_badge')) return { success: false, message: '没有公会徽章。' }
      guildBadgeBonusAttack.value += 3
      const msg = '使用了公会徽章，攻击力永久+3！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 生命护符：永久+15最大HP
    if (itemId === 'life_talisman') {
      if (!inventoryStore.removeItem('life_talisman')) return { success: false, message: '没有生命护符。' }
      guildBonusMaxHp.value += 15
      const msg = '使用了生命护符，最大生命值永久+15！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 幸运铜钱：永久掉落率+5%
    if (itemId === 'lucky_coin') {
      if (!inventoryStore.removeItem('lucky_coin')) return { success: false, message: '没有幸运铜钱。' }
      guildBonusDropRate.value += 0.05
      const msg = '使用了幸运铜钱，怪物掉落率永久+5%！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 守护符：永久防御+3%
    if (itemId === 'defense_charm') {
      if (!inventoryStore.removeItem('defense_charm')) return { success: false, message: '没有守护符。' }
      guildBonusDefense.value += 0.03
      const msg = '使用了守护符，防御永久+3%！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 猎魔符：本次探索掉落率+20%
    if (itemId === 'slayer_charm') {
      if (slayerCharmActive.value) return { success: false, message: '猎魔符效果已激活。' }
      if (!inventoryStore.removeItem('slayer_charm')) return { success: false, message: '没有猎魔符。' }
      slayerCharmActive.value = true
      const msg = '使用了猎魔符，本次探索怪物掉落率+20%！'
      if (inCombat.value) combatLog.value.push(msg)
      return { success: true, message: msg }
    }

    // 食物/药剂类道具
    const def = getItemById(itemId)
    if (!def) return { success: false, message: '未知物品。' }

    // 烹饪品走 cookingStore.eat()，以正确应用buff、厨房加成等
    if (itemId.startsWith('food_')) {
      const cookingStore = useCookingStore()
      const hpFull = playerStore.hp >= playerStore.getMaxHp()
      const staminaFull = playerStore.stamina >= playerStore.maxStamina
      if (hpFull && staminaFull) {
        return { success: false, message: '体力和生命值都已满。' }
      }
      // 查找背包中该食物的最低品质
      const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
      const foodQuality = qualityOrder.find(q => inventoryStore.getItemCount(itemId, q) > 0) ?? 'normal'
      const result = cookingStore.eat(itemId.slice(5), foodQuality)
      if (result.success && inCombat.value) combatLog.value.push(result.message)
      return result
    }

    const hpFull = playerStore.hp >= playerStore.getMaxHp()
    const staminaFull = playerStore.stamina >= playerStore.maxStamina
    const hasHpRestore = def.healthRestore && def.healthRestore > 0
    const hasStaminaRestore = def.staminaRestore && def.staminaRestore > 0

    if (hasHpRestore && !hasStaminaRestore && hpFull) {
      return { success: false, message: '生命值已满。' }
    }
    if (hasStaminaRestore && !hasHpRestore && staminaFull) {
      return { success: false, message: '体力已满。' }
    }
    if (hpFull && staminaFull && (hasHpRestore || hasStaminaRestore)) {
      return { success: false, message: '体力和生命值都已满。' }
    }

    if (!inventoryStore.removeItem(itemId)) return { success: false, message: `没有${def.name}。` }

    // 炼金师专精：食物恢复+50%
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0
    const parts: string[] = []
    if (hasHpRestore) {
      const restore = def.healthRestore! >= 999 ? playerStore.getMaxHp() : Math.floor(def.healthRestore! * alchemistBonus)
      playerStore.restoreHealth(restore)
      parts.push(`恢复${def.healthRestore! >= 999 ? '全部' : restore}HP`)
    }
    if (hasStaminaRestore) {
      const restore = Math.floor(def.staminaRestore! * alchemistBonus)
      playerStore.restoreStamina(restore)
      parts.push(`恢复${restore}体力`)
    }

    const msg = `使用了${def.name}，${parts.join('和')}！`
    if (inCombat.value) combatLog.value.push(msg)
    return { success: true, message: msg }
  }

  /** 在探索中使用怪物诱饵（本层怪物数量翻倍） */
  const useMonsterLure = (): { success: boolean; message: string } => {
    if (!isExploring.value) return { success: false, message: '不在矿洞中。' }
    if (inCombat.value) return { success: false, message: '战斗中无法使用怪物诱饵。' }
    if (monsterLureUsedOnFloor.value) return { success: false, message: '本层已经使用过怪物诱饵了。' }
    if (!inventoryStore.removeItem('monster_lure')) return { success: false, message: '没有怪物诱饵。' }

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
      claimedInfestedRewardFloors: claimedInfestedRewardFloors.value,
      claimedBossRewardFloors: claimedBossRewardFloors.value,
      claimedBossRingRewardFloors: claimedBossRingRewardFloors.value,
      claimedBossHatRewardFloors: claimedBossHatRewardFloors.value,
      claimedBossShoeRewardFloors: claimedBossShoeRewardFloors.value,
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

  const deserialize = (data: ReturnType<typeof serialize>) => {
    defeatedBosses.value = ((data as Record<string, unknown>).defeatedBosses as string[]) ?? []

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
    getUnlockedSafePoints,
    getUnlockedSkullSafePoints,
    canRevealTile,
    engageRevealedMonster,
    revealTile,
    useBombOnGrid,
    enterMine,
    enterSkullCavern,
    combatAction,
    useCombatItem,
    useMonsterLure,
    goNextFloor,
    leaveMine,
    forceLeaveMine,
    serialize,
    deserialize
  }
})
