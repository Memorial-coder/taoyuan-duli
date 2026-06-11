import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { InventoryItem, Quality, Tool, ToolType, ToolTier, OwnedWeapon, OwnedRing, RingEffectType, OwnedHat, OwnedShoe } from '@/types'

/** 装备方案 */
export interface EquipmentPreset {
  id: string
  name: string
  weaponDefId: string | null
  weaponEnchantmentId: string | null
  ringSlot1DefId: string | null
  ringSlot2DefId: string | null
  hatDefId: string | null
  shoeDefId: string | null
  trinketDefId: string | null
}

export interface EquipmentSetCatalogPiece {
  slot: 'weapon' | 'ring' | 'hat' | 'shoe'
  slotLabel: string
  defId: string
  name: string
  owned: boolean
  equipped: boolean
}

export interface EquipmentSetCatalogEntry {
  id: string
  name: string
  description: string
  totalPieces: number
  ownedCount: number
  equippedCount: number
  pieces: EquipmentSetCatalogPiece[]
  bonuses: {
    count: 2 | 3 | 4
    description: string
    active: boolean
  }[]
}
import { showFloat } from '@/composables/useGameLog'
import { getItemById } from '@/data/items'
import { getWeaponById, getEnchantmentById, getWeaponSellPrice } from '@/data/weapons'
import { getRingById } from '@/data/rings'
import { getHatById } from '@/data/hats'
import { getShoeById } from '@/data/shoes'
import { TRINKETS, getTrinketById, type TrinketDef } from '@/data/trinkets'
import { EQUIPMENT_SETS } from '@/data/equipmentSets'
import { usePlayerStore } from './usePlayerStore'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'

const INITIAL_CAPACITY = 24
const MAX_CAPACITY = 120
const MAX_STACK = 999
const TEMP_CAPACITY = 10
export const MAX_EQUIPMENT_PRESETS = 10
type EquipmentLockTarget = 'weapon' | 'ring' | 'hat' | 'shoe'
type LockableEquipmentEntry = { locked?: boolean }

export const useInventoryStore = defineStore('inventory', () => {
  const playerStore = usePlayerStore()
  const items = ref<InventoryItem[]>([])
  const capacity = ref(INITIAL_CAPACITY)
  const tools = ref<Tool[]>([
    { type: 'wateringCan', tier: 'basic' },
    { type: 'hoe', tier: 'basic' },
    { type: 'pickaxe', tier: 'basic' },
    { type: 'fishingRod', tier: 'basic' },
    { type: 'scythe', tier: 'basic' },
    { type: 'axe', tier: 'basic' },
    { type: 'pan', tier: 'basic' }
  ])

  /** 拥有的武器列表 */
  const ownedWeapons = ref<OwnedWeapon[]>([{ defId: 'wooden_stick', enchantmentId: null }])
  /** 当前装备的武器索引 */
  const equippedWeaponIndex = ref(0)

  /** 拥有的戒指列表 */
  const ownedRings = ref<OwnedRing[]>([])
  /** 装备的戒指索引（2个槽位，-1 = 空） */
  const equippedRingSlot1 = ref(-1)
  const equippedRingSlot2 = ref(-1)

  /** 拥有的帽子列表 */
  const ownedHats = ref<OwnedHat[]>([])
  /** 当前装备的帽子索引（-1 = 空） */
  const equippedHatIndex = ref(-1)

  /** 拥有的鞋子列表 */
  const ownedShoes = ref<OwnedShoe[]>([])
  /** 当前装备的鞋子索引（-1 = 空） */
  const equippedShoeIndex = ref(-1)
  /** 当前装备的护符 / 饰物 */
  const equippedTrinketId = ref<string | null>(null)

  /** 装备方案列表 */
  const equipmentPresets = ref<EquipmentPreset[]>([])
  /** 当前使用的方案ID */
  const activePresetId = ref<string | null>(null)
  /** 最近一次读档装备迁移记录 */
  const equipmentMigrationLogs = ref<string[]>([])

  /** 正在升级中的工具（2天等待期） */
  const pendingUpgrade = ref<{ toolType: ToolType; targetTier: ToolTier; daysRemaining: number } | null>(null)
  const TOOL_TIER_ORDER: ToolTier[] = ['basic', 'iron', 'steel', 'iridium']
  const TOOL_TYPES: ToolType[] = ['wateringCan', 'hoe', 'pickaxe', 'fishingRod', 'scythe', 'axe', 'pan']

  const isFull = computed(() => items.value.length >= capacity.value)

  /** 临时背包（溢出缓冲区） */
  const tempItems = ref<InventoryItem[]>([])
  const isTempFull = computed(() => tempItems.value.length >= TEMP_CAPACITY)
  /** 主背包+临时背包均满 */
  const isAllFull = computed(() => isFull.value && isTempFull.value)

  /** 获取当前装备的武器 */
  const getEquippedWeapon = (): OwnedWeapon => {
    return ownedWeapons.value[equippedWeaponIndex.value] ?? { defId: 'wooden_stick', enchantmentId: null }
  }

  const findLastMatchingIndex = <T>(arr: T[], predicate: (value: T) => boolean): number => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i]!)) return i
    }
    return -1
  }

  type InventorySnapshotSlot = Pick<InventoryItem, 'itemId' | 'quality' | 'quantity'>

  const cloneInventorySlots = (source: InventoryItem[]): InventorySnapshotSlot[] =>
    source.map(slot => ({ itemId: slot.itemId, quality: slot.quality, quantity: slot.quantity }))

  const cloneTools = (source: Tool[]) => source.map(tool => ({ ...tool }))
  const cloneOwnedWeapons = (source: OwnedWeapon[]) => source.map(weapon => ({ ...weapon }))
  const cloneOwnedRings = (source: OwnedRing[]) => source.map(ring => ({ ...ring }))
  const cloneOwnedHats = (source: OwnedHat[]) => source.map(hat => ({ ...hat }))
  const cloneOwnedShoes = (source: OwnedShoe[]) => source.map(shoe => ({ ...shoe }))
  const cloneEquipmentPresets = (source: EquipmentPreset[]) => source.map(preset => ({ ...preset }))
  const readLockedFlag = (entry: { locked?: unknown }): boolean | undefined => entry.locked === true ? true : undefined
  const pushEquipmentMigrationLog = (message: string) => {
    equipmentMigrationLogs.value.push(message)
  }
  const ensureDefaultWeapon = (): number => {
    const existingIndex = ownedWeapons.value.findIndex(weapon => weapon.defId === 'wooden_stick' && weapon.enchantmentId === null)
    if (existingIndex >= 0) return existingIndex
    ownedWeapons.value.unshift({ defId: 'wooden_stick', enchantmentId: null })
    if (equippedWeaponIndex.value >= 0) equippedWeaponIndex.value += 1
    return 0
  }
  const equipFallbackWeapon = () => {
    const woodenStickIndex = ownedWeapons.value.findIndex(weapon => weapon.defId === 'wooden_stick' && weapon.enchantmentId === null)
    if (woodenStickIndex >= 0) {
      equippedWeaponIndex.value = woodenStickIndex
      return
    }
    if (ownedWeapons.value.length > 0) {
      equippedWeaponIndex.value = 0
      return
    }
    equippedWeaponIndex.value = ensureDefaultWeapon()
  }
  const isTrinketSlotUnlocked = computed(() => playerStore.hasLifestyleDiscovery('masteryUnlocks', 'mastery_combat'))
  const unlockedTrinkets = computed<TrinketDef[]>(() => {
    if (!isTrinketSlotUnlocked.value) return []
    const snapshot = playerStore.getLifestyleDiscoverySnapshot()
    return TRINKETS.filter(def => {
      switch (def.unlockRule) {
        case 'prize_progress':
          return Object.keys(snapshot.prizeProgress).length > 0
        case 'mystery_box':
          return Object.keys(snapshot.mysteryBoxes).length > 0
        case 'combat_mastery':
          return playerStore.hasLifestyleDiscovery('masteryUnlocks', 'mastery_combat')
        default:
          return false
      }
    })
  })
  const equippedTrinket = computed(() => (equippedTrinketId.value ? getTrinketById(equippedTrinketId.value) ?? null : null))

  const simulateAddToSlots = (
    mainSlots: InventorySnapshotSlot[],
    mainCapacity: number,
    tempSlots: InventorySnapshotSlot[],
    tempCapacity: number,
    entries: { itemId: string; quantity: number; quality: Quality }[],
    includeTemp: boolean
  ): boolean => {
    const fillExistingStacks = (slots: InventorySnapshotSlot[], itemId: string, quality: Quality, remaining: number): number => {
      for (const slot of slots) {
        if (remaining <= 0) break
        if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
          const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
          slot.quantity += canAdd
          remaining -= canAdd
        }
      }
      return remaining
    }

    const createNewStacks = (slots: InventorySnapshotSlot[], slotCapacity: number, itemId: string, quality: Quality, remaining: number): number => {
      while (remaining > 0 && slots.length < slotCapacity) {
        const batch = Math.min(remaining, MAX_STACK)
        slots.push({ itemId, quality, quantity: batch })
        remaining -= batch
      }
      return remaining
    }

    for (const entry of entries) {
      if (!getItemById(entry.itemId)) return false

      let remaining = entry.quantity
      remaining = fillExistingStacks(mainSlots, entry.itemId, entry.quality, remaining)
      remaining = createNewStacks(mainSlots, mainCapacity, entry.itemId, entry.quality, remaining)

      if (includeTemp && remaining > 0) {
        remaining = fillExistingStacks(tempSlots, entry.itemId, entry.quality, remaining)
        remaining = createNewStacks(tempSlots, tempCapacity, entry.itemId, entry.quality, remaining)
      }

      if (remaining > 0) return false
    }

    return true
  }

  /** 获取武器攻击力（含附魔加成） */
  const getWeaponAttack = (): number => {
    const owned = getEquippedWeapon()
    const def = getWeaponById(owned.defId)
    if (!def) return 5
    let attack = def.attack
    if (owned.enchantmentId) {
      const enchant = getEnchantmentById(owned.enchantmentId)
      if (enchant) attack += enchant.attackBonus
    }
    return attack
  }

  /** 获取武器暴击率（含附魔加成） */
  const getWeaponCritRate = (): number => {
    const owned = getEquippedWeapon()
    const def = getWeaponById(owned.defId)
    if (!def) return 0.02
    let critRate = def.critRate
    if (owned.enchantmentId) {
      const enchant = getEnchantmentById(owned.enchantmentId)
      if (enchant) critRate += enchant.critBonus
    }
    return critRate
  }

  /** 添加武器到收藏 */
  const addWeapon = (defId: string, enchantmentId: string | null = null): boolean => {
    ownedWeapons.value.push({ defId, enchantmentId })
    useAchievementStore().discoverItem(defId)
    return true
  }

  /** 检查是否已拥有某武器（不含附魔区分） */
  const hasWeapon = (defId: string): boolean => {
    return ownedWeapons.value.some(w => w.defId === defId)
  }

  /** 装备武器（按索引） */
  const equipWeapon = (index: number): boolean => {
    if (index < 0 || index >= ownedWeapons.value.length) return false
    equippedWeaponIndex.value = index
    return true
  }

  /** 卖出武器（不能卖装备中的武器，不能卖唯一武器） */
  const sellWeapon = (index: number): { success: boolean; message: string } => {
    if (ownedWeapons.value.length <= 1) return { success: false, message: '至少保留一把武器。' }
    if (index === equippedWeaponIndex.value) return { success: false, message: '不能卖出装备中的武器，请先切换。' }
    if (index < 0 || index >= ownedWeapons.value.length) return { success: false, message: '无效索引。' }
    const weapon = ownedWeapons.value[index]!
    if (weapon.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const price = getWeaponSellPrice(weapon.defId, weapon.enchantmentId)
    const playerStore = usePlayerStore()
    playerStore.earnMoney(price)
    ownedWeapons.value.splice(index, 1)
    // 修正装备索引
    if (equippedWeaponIndex.value > index) {
      equippedWeaponIndex.value--
    }
    const def = getWeaponById(weapon.defId)
    return { success: true, message: `卖出了${def?.name ?? '武器'}，获得${price}文。` }
  }

  /** 移除武器收藏中的一把（用于回滚战利品） */
  const removeWeapon = (defId: string, enchantmentId: string | null = null): boolean => {
    const index = findLastMatchingIndex(ownedWeapons.value, w => w.defId === defId && w.enchantmentId === enchantmentId)
    if (index < 0) return false
    if (ownedWeapons.value.length <= 1) return false
    ownedWeapons.value.splice(index, 1)
    if (equippedWeaponIndex.value === index) {
      equippedWeaponIndex.value = 0
    } else if (equippedWeaponIndex.value > index) {
      equippedWeaponIndex.value--
    }
    return true
  }

  /** 添加物品到背包 */
  const addItem = (itemId: string, quantity: number = 1, quality: Quality = 'normal'): boolean => {
    // 校验物品是否存在
    if (!getItemById(itemId)) return false
    // 自动注册到图鉴
    useAchievementStore().discoverItem(itemId)
    let remaining = quantity

    // 先填充已有的同类栈
    for (const slot of items.value) {
      if (remaining <= 0) break
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    // 剩余部分创建新栈
    while (remaining > 0 && !isFull.value) {
      const batch = Math.min(remaining, MAX_STACK)
      items.value.push({ itemId, quantity: batch, quality })
      remaining -= batch
    }

    // 溢出到临时背包
    if (remaining > 0) {
      for (const slot of tempItems.value) {
        if (remaining <= 0) break
        if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
          const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
          slot.quantity += canAdd
          remaining -= canAdd
        }
      }
      while (remaining > 0 && !isTempFull.value) {
        const batch = Math.min(remaining, MAX_STACK)
        tempItems.value.push({ itemId, quantity: batch, quality })
        remaining -= batch
      }
    }

    if (remaining > 0) {
      const name = getItemById(itemId)?.name ?? itemId
      showFloat(`背包已满！${name}×${remaining}丢失了`, 'danger')
    } else {
      // 背包快满预警：剩余格数 ≤ 3 时提示一次
      const freeSlots = capacity.value - items.value.length
      if (freeSlots <= 3) {
        showFloat(`背包快满了！剩余${freeSlots}格`, 'accent')
      }
    }

    return remaining <= 0
  }

  /** 检查物品是否可以完整放入背包（默认允许进入临时背包） */
  const canAddItem = (itemId: string, quantity: number = 1, quality: Quality = 'normal', includeTemp: boolean = true): boolean => {
    return simulateAddToSlots(
      cloneInventorySlots(items.value),
      capacity.value,
      cloneInventorySlots(tempItems.value),
      TEMP_CAPACITY,
      [{ itemId, quantity, quality }],
      includeTemp
    )
  }

  /** 检查一组物品是否可以完整放入背包（默认允许进入临时背包） */
  const canAddItems = (
    entries: { itemId: string; quantity: number; quality?: Quality }[],
    includeTemp: boolean = true
  ): boolean => {
    return simulateAddToSlots(
      cloneInventorySlots(items.value),
      capacity.value,
      cloneInventorySlots(tempItems.value),
      TEMP_CAPACITY,
      entries.map(entry => ({
        itemId: entry.itemId,
        quantity: entry.quantity,
        quality: entry.quality ?? 'normal'
      })),
      includeTemp
    )
  }

  /** 仅在能够完整放入时才添加物品，避免部分入包 */
  const addItemExact = (itemId: string, quantity: number = 1, quality: Quality = 'normal', includeTemp: boolean = true): boolean => {
    if (!canAddItem(itemId, quantity, quality, includeTemp)) return false
    return addItem(itemId, quantity, quality)
  }

  /** 仅在整组物品都能完整放入时才统一添加，避免部分入包 */
  const addItemsExact = (
    entries: { itemId: string; quantity: number; quality?: Quality }[],
    includeTemp: boolean = true
  ): boolean => {
    if (!canAddItems(entries, includeTemp)) return false
    for (const entry of entries) {
      if (!addItem(entry.itemId, entry.quantity, entry.quality ?? 'normal')) return false
    }
    return true
  }

  /** 移除物品（支持跨栈删除）。quality 不传时优先消耗低品质 */
  const removeItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    // 先检查总数是否足够
    const matchQuality = (i: { itemId: string; quality: Quality }) =>
      i.itemId === itemId && (quality === undefined || i.quality === quality)
    const total = items.value.filter(matchQuality).reduce((sum, i) => sum + i.quantity, 0)
    if (total < quantity) return false

    // 不指定品质时按 normal → fine → excellent → supreme 顺序消耗
    const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
    let remaining = quantity
    for (const q of quality !== undefined ? [quality] : qualityOrder) {
      for (let i = items.value.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = items.value[i]!
        if (slot.itemId !== itemId || slot.quality !== q) continue
        const take = Math.min(remaining, slot.quantity)
        slot.quantity -= take
        remaining -= take
        if (slot.quantity <= 0) {
          items.value.splice(i, 1)
        }
      }
    }
    return true
  }

  const normalizeItemRequirements = (requirements: { itemId: string; quantity: number }[]) => {
    const totals = new Map<string, number>()
    for (const requirement of requirements) {
      const quantity = Math.max(0, Math.floor(Number(requirement.quantity) || 0))
      if (!requirement.itemId || quantity <= 0) continue
      totals.set(requirement.itemId, (totals.get(requirement.itemId) ?? 0) + quantity)
    }
    return [...totals.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
  }

  const removeItemsWithRollback = (requirements: { itemId: string; quantity: number }[]): boolean => {
    const normalized = normalizeItemRequirements(requirements)
    if (normalized.some(requirement => getItemCount(requirement.itemId) < requirement.quantity)) return false
    const inventorySnapshot = serialize()
    for (const requirement of normalized) {
      if (!removeItem(requirement.itemId, requirement.quantity)) {
        deserialize(inventorySnapshot)
        return false
      }
    }
    return true
  }

  /** 查询物品数量 */
  const getItemCount = (itemId: string, quality?: Quality): number => {
    return items.value
      .filter(i => i.itemId === itemId && (quality === undefined || i.quality === quality))
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  /** 查询临时背包物品数量 */
  const getTempItemCount = (itemId: string, quality?: Quality): number => {
    return tempItems.value
      .filter(i => i.itemId === itemId && (quality === undefined || i.quality === quality))
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  /** 查询主背包 + 临时背包总数量 */
  const getTotalItemCount = (itemId: string, quality?: Quality): number => {
    return getItemCount(itemId, quality) + getTempItemCount(itemId, quality)
  }

  /** 检查是否拥有足够数量 */
  const hasItem = (itemId: string, quantity: number = 1): boolean => {
    return getItemCount(itemId) >= quantity
  }

  /** 从临时背包移除物品 */
  const removeItemFromTemp = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    const matchQuality = (i: { itemId: string; quality: Quality }) =>
      i.itemId === itemId && (quality === undefined || i.quality === quality)
    const total = tempItems.value.filter(matchQuality).reduce((sum, i) => sum + i.quantity, 0)
    if (total < quantity) return false

    const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
    let remaining = quantity
    for (const q of quality !== undefined ? [quality] : qualityOrder) {
      for (let i = tempItems.value.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = tempItems.value[i]!
        if (slot.itemId !== itemId || slot.quality !== q) continue
        const take = Math.min(remaining, slot.quantity)
        slot.quantity -= take
        remaining -= take
        if (slot.quantity <= 0) {
          tempItems.value.splice(i, 1)
        }
      }
    }
    return true
  }

  /** 从主背包或临时背包移除物品（优先移除临时背包） */
  const removeItemAnywhere = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    if (getTotalItemCount(itemId, quality) < quantity) return false
    let remaining = quantity
    if (quality === undefined) {
      const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
      for (const currentQuality of qualityOrder) {
        if (remaining <= 0) break
        const fromTempAtQuality = Math.min(remaining, getTempItemCount(itemId, currentQuality))
        if (fromTempAtQuality > 0) {
          removeItemFromTemp(itemId, fromTempAtQuality, currentQuality)
          remaining -= fromTempAtQuality
        }
        const fromMainAtQuality = Math.min(remaining, getItemCount(itemId, currentQuality))
        if (fromMainAtQuality > 0) {
          removeItem(itemId, fromMainAtQuality, currentQuality)
          remaining -= fromMainAtQuality
        }
      }
      return remaining <= 0
    }

    const fromTemp = Math.min(remaining, getTempItemCount(itemId, quality))
    if (fromTemp > 0) {
      removeItemFromTemp(itemId, fromTemp, quality)
      remaining -= fromTemp
    }
    if (remaining > 0) {
      removeItem(itemId, remaining, quality)
    }
    return true
  }

  /** 物品分类排序优先级 */
  const CATEGORY_ORDER: Record<string, number> = {
    seed: 0,
    crop: 1,
    fruit: 2,
    fish: 3,
    animal_product: 4,
    processed: 5,
    food: 6,
    ore: 7,
    gem: 8,
    material: 9,
    machine: 10,
    sprinkler: 11,
    fertilizer: 12,
    bait: 13,
    tackle: 14,
    bomb: 15,
    sapling: 16,
    gift: 17,
    fossil: 18,
    artifact: 19,
    misc: 20
  }

  /** 切换物品锁定状态 */
  const toggleLock = (itemId: string, quality: Quality) => {
    const slot = items.value.find(i => i.itemId === itemId && i.quality === quality)
    if (slot) slot.locked = !slot.locked
  }

  /** 切换装备锁定状态（锁定后禁止出售） */
  const toggleEquipmentLock = (kind: EquipmentLockTarget, index: number): boolean => {
    const sources: Record<EquipmentLockTarget, LockableEquipmentEntry[]> = {
      weapon: ownedWeapons.value,
      ring: ownedRings.value,
      hat: ownedHats.value,
      shoe: ownedShoes.value
    }
    const entry = sources[kind][index]
    if (!entry) return false
    entry.locked = !entry.locked
    return true
  }

  /** 一键整理背包（按分类→物品ID→品质排序，合并同类栈） */
  const sortItems = () => {
    // 先合并同类栈（任一栈锁定则合并后保持锁定）
    const merged: InventoryItem[] = []
    for (const item of items.value) {
      const existing = merged.find(m => m.itemId === item.itemId && m.quality === item.quality)
      if (existing) {
        existing.quantity += item.quantity
        if (item.locked) existing.locked = true
      } else {
        merged.push({ ...item })
      }
    }
    // 拆分超过 MAX_STACK 的栈（保留锁定状态）
    const split: InventoryItem[] = []
    for (const item of merged) {
      let remaining = item.quantity
      while (remaining > 0) {
        const batch = Math.min(remaining, MAX_STACK)
        split.push({ itemId: item.itemId, quantity: batch, quality: item.quality, locked: item.locked })
        remaining -= batch
      }
    }
    // 按分类 → 物品ID → 品质排序
    const qualityOrder: Record<string, number> = { normal: 0, fine: 1, excellent: 2, supreme: 3 }
    split.sort((a, b) => {
      const defA = getItemById(a.itemId)
      const defB = getItemById(b.itemId)
      const catA = CATEGORY_ORDER[defA?.category ?? 'misc'] ?? 20
      const catB = CATEGORY_ORDER[defB?.category ?? 'misc'] ?? 20
      if (catA !== catB) return catA - catB
      if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId)
      return (qualityOrder[a.quality] ?? 0) - (qualityOrder[b.quality] ?? 0)
    })
    items.value = split
  }

  /** 扩容背包 */
  const expandCapacity = (): boolean => {
    if (capacity.value >= MAX_CAPACITY) return false
    capacity.value += 4
    return true
  }

  /** 超限扩容背包（+1格，突破 MAX_CAPACITY） */
  const expandCapacityExtra = (): boolean => {
    capacity.value += 1
    return true
  }

  const moveIntoMainSlotSnapshot = (mainSlots: InventorySnapshotSlot[], source: InventorySnapshotSlot): number => {
    const requestedQuantity = Math.max(0, Math.floor(source.quantity))
    let remaining = requestedQuantity

    for (const slot of mainSlots) {
      if (remaining <= 0) break
      if (slot.itemId === source.itemId && slot.quality === source.quality && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    while (remaining > 0 && mainSlots.length < capacity.value) {
      const batch = Math.min(remaining, MAX_STACK)
      mainSlots.push({ itemId: source.itemId, quantity: batch, quality: source.quality })
      remaining -= batch
    }

    return requestedQuantity - remaining
  }

  /** 计算临时背包指定格或一键取回时实际能移入主背包的数量 */
  const getMovableTempItemCount = (index?: number): number => {
    const mainSlots = cloneInventorySlots(items.value)
    if (typeof index === 'number') {
      if (index < 0 || index >= tempItems.value.length) return 0
      return moveIntoMainSlotSnapshot(mainSlots, tempItems.value[index]!)
    }

    let totalMovable = 0
    for (let i = tempItems.value.length - 1; i >= 0; i--) {
      totalMovable += moveIntoMainSlotSnapshot(mainSlots, tempItems.value[i]!)
    }
    return totalMovable
  }

  /** 检查临时背包指定格是否至少有一件可移入主背包 */
  const canMoveFromTemp = (index: number): boolean => {
    return getMovableTempItemCount(index) > 0
  }

  /** 将临时背包中的物品转移到主背包 */
  const moveFromTemp = (index: number): boolean => {
    if (index < 0 || index >= tempItems.value.length) return false
    if (!canMoveFromTemp(index)) return false
    const tempSlot = tempItems.value[index]!
    const { itemId, quality } = tempSlot
    let remaining = tempSlot.quantity

    for (const slot of items.value) {
      if (remaining <= 0) break
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }
    while (remaining > 0 && !isFull.value) {
      const batch = Math.min(remaining, MAX_STACK)
      items.value.push({ itemId, quantity: batch, quality })
      remaining -= batch
    }

    if (remaining <= 0) {
      tempItems.value.splice(index, 1)
      return true
    }
    tempSlot.quantity = remaining
    return false
  }

  /** 一键将所有可转移的临时背包物品移入主背包 */
  const moveAllFromTemp = (): number => {
    let movedQuantity = 0
    for (let i = tempItems.value.length - 1; i >= 0; i--) {
      const beforeQuantity = tempItems.value[i]?.quantity ?? 0
      if (beforeQuantity <= 0 || !canMoveFromTemp(i)) continue
      if (moveFromTemp(i)) {
        movedQuantity += beforeQuantity
        continue
      }
      const afterQuantity = tempItems.value[i]?.quantity ?? 0
      if (afterQuantity < beforeQuantity) {
        movedQuantity += beforeQuantity - afterQuantity
      }
    }
    return movedQuantity
  }

  /** 丢弃临时背包中的物品 */
  const discardTempItem = (index: number): boolean => {
    if (index < 0 || index >= tempItems.value.length) return false
    tempItems.value.splice(index, 1)
    return true
  }

  /** 获取工具 */
  const getTool = (type: ToolType): Tool | undefined => {
    return tools.value.find(t => t.type === type)
  }

  const getNextToolTier = (tier: ToolTier): ToolTier | null => {
    const currentIndex = TOOL_TIER_ORDER.indexOf(tier)
    if (currentIndex < 0 || currentIndex >= TOOL_TIER_ORDER.length - 1) return null
    return TOOL_TIER_ORDER[currentIndex + 1]!
  }

  const normalizePendingToolUpgrade = (value: unknown) => {
    if (!value || typeof value !== 'object') return null
    const raw = value as { toolType?: unknown; targetTier?: unknown; daysRemaining?: unknown }
    if (typeof raw.toolType !== 'string' || !TOOL_TYPES.includes(raw.toolType as ToolType)) {
      pushEquipmentMigrationLog('工具升级队列的工具类型无效，已清空。')
      return null
    }
    const toolType = raw.toolType as ToolType
    const tool = getTool(toolType)
    const nextTier = tool ? getNextToolTier(tool.tier) : null
    if (!nextTier) {
      pushEquipmentMigrationLog(`工具升级队列中的${toolType}已无法继续升级，已清空。`)
      return null
    }
    if (raw.targetTier !== nextTier) {
      pushEquipmentMigrationLog(`工具升级目标从 ${String(raw.targetTier)} 修正为 ${nextTier}。`)
    }
    const daysRemaining = Math.max(1, Math.min(2, Math.ceil(Number(raw.daysRemaining) || 1)))
    return { toolType, targetTier: nextTier, daysRemaining }
  }

  /** 获取工具等级对应的体力消耗倍率 */
  const getToolStaminaMultiplier = (type: ToolType): number => {
    const tool = getTool(type)
    if (!tool) return 1
    const multipliers: Record<ToolTier, number> = { basic: 1.0, iron: 0.8, steel: 0.6, iridium: 0.4 }
    return multipliers[tool.tier]
  }

  /** 获取工具等级对应的工作耗时倍率 */
  const getToolWorkTimeMultiplier = (type: ToolType): number => {
    const tool = getTool(type)
    if (!tool) return 1
    const multipliers: Record<ToolTier, number> = { basic: 1.0, iron: 0.9, steel: 0.8, iridium: 0.7 }
    return multipliers[tool.tier]
  }

  /** 获取工具等级对应的批量操作数量（蓄力机制） */
  const getToolBatchCount = (type: ToolType): number => {
    const tool = getTool(type)
    if (!tool) return 1
    const counts: Record<ToolTier, number> = { basic: 1, iron: 2, steel: 4, iridium: 8 }
    return counts[tool.tier]
  }

  /** 升级工具 */
  const upgradeTool = (type: ToolType): boolean => {
    const tool = getTool(type)
    if (!tool) return false
    const nextTier = getNextToolTier(tool.tier)
    if (!nextTier) return false
    tool.tier = nextTier
    return true
  }

  /** 检查工具是否可用（未在升级中） */
  const isToolAvailable = (type: ToolType): boolean => {
    return !pendingUpgrade.value || pendingUpgrade.value.toolType !== type
  }

  /** 开始升级工具（进入2天等待期） */
  const startUpgrade = (type: ToolType, targetTier: ToolTier): boolean => {
    if (pendingUpgrade.value) return false
    const tool = getTool(type)
    const nextTier = tool ? getNextToolTier(tool.tier) : null
    if (!nextTier || targetTier !== nextTier) return false
    pendingUpgrade.value = { toolType: type, targetTier, daysRemaining: 2 }
    return true
  }

  /** 每日升级进度更新，返回完成的工具名（若有） */
  const dailyUpgradeUpdate = (): { completed: boolean; toolType: ToolType; targetTier: ToolTier } | null => {
    if (!pendingUpgrade.value) return null
    pendingUpgrade.value.daysRemaining--
    if (pendingUpgrade.value.daysRemaining <= 0) {
      const { toolType } = pendingUpgrade.value
      const tool = getTool(toolType)
      const completedTier = tool ? getNextToolTier(tool.tier) : null
      if (!completedTier || !upgradeTool(toolType)) {
        pendingUpgrade.value = null
        return null
      }
      pendingUpgrade.value = null
      return { completed: true, toolType, targetTier: completedTier }
    }
    return null
  }

  // ============================================================
  // 戒指系统
  // ============================================================

  /** 添加戒指到收藏 */
  const addRing = (defId: string): boolean => {
    ownedRings.value.push({ defId })
    useAchievementStore().discoverItem(defId)
    return true
  }

  /** 检查是否已拥有某戒指 */
  const hasRing = (defId: string): boolean => {
    return ownedRings.value.some(r => r.defId === defId)
  }

  /** 装备戒指到指定槽位（0 或 1），禁止两个槽位装备同defId戒指 */
  const equipRing = (ringIndex: number, slot: 0 | 1): boolean => {
    if (ringIndex < 0 || ringIndex >= ownedRings.value.length) return false
    const targetSlot = slot === 0 ? equippedRingSlot1 : equippedRingSlot2
    const otherSlot = slot === 0 ? equippedRingSlot2 : equippedRingSlot1
    // 已在目标槽位，无操作
    if (targetSlot.value === ringIndex) return true
    // 同一枚戒指在另一个槽位 → 交换
    if (otherSlot.value === ringIndex) {
      otherSlot.value = targetSlot.value // 可能是 -1
      targetSlot.value = ringIndex
      return true
    }
    // 禁止两个槽位装备同defId戒指
    const targetDefId = ownedRings.value[ringIndex]!.defId
    if (otherSlot.value >= 0 && otherSlot.value < ownedRings.value.length && ownedRings.value[otherSlot.value]!.defId === targetDefId) {
      return false
    }
    targetSlot.value = ringIndex
    return true
  }

  /** 卸下戒指（指定槽位） */
  const unequipRing = (slot: 0 | 1): boolean => {
    if (slot === 0) {
      if (equippedRingSlot1.value < 0) return false
      equippedRingSlot1.value = -1
    } else {
      if (equippedRingSlot2.value < 0) return false
      equippedRingSlot2.value = -1
    }
    return true
  }

  /** 卖出戒指（自动卸下已装备的戒指） */
  const sellRing = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedRings.value.length) return { success: false, message: '无效索引。' }
    const ring = ownedRings.value[index]!
    if (ring.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getRingById(ring.defId)
    const price = def?.sellPrice ?? 0
    // 自动卸下
    if (equippedRingSlot1.value === index) equippedRingSlot1.value = -1
    if (equippedRingSlot2.value === index) equippedRingSlot2.value = -1
    const playerStore = usePlayerStore()
    playerStore.earnMoney(price)
    ownedRings.value.splice(index, 1)
    // 修正装备索引
    if (equippedRingSlot1.value > index) equippedRingSlot1.value--
    if (equippedRingSlot2.value > index) equippedRingSlot2.value--
    return { success: true, message: `卖出了${def?.name ?? '戒指'}，获得${price}文。` }
  }

  /** 移除戒指收藏中的一个（用于回滚战利品） */
  const removeRing = (defId: string): boolean => {
    const index = findLastMatchingIndex(ownedRings.value, r => r.defId === defId)
    if (index < 0) return false
    if (equippedRingSlot1.value === index) equippedRingSlot1.value = -1
    if (equippedRingSlot2.value === index) equippedRingSlot2.value = -1
    ownedRings.value.splice(index, 1)
    if (equippedRingSlot1.value > index) equippedRingSlot1.value--
    if (equippedRingSlot2.value > index) equippedRingSlot2.value--
    return true
  }

  /** 查询某种装备效果的合计值（戒指+帽子+鞋子叠加） */
  const getEquipmentBonus = (effectType: RingEffectType): number => {
    let total = 0
    // 戒指（2槽位）
    const ringIndices = [equippedRingSlot1.value, equippedRingSlot2.value]
    for (const idx of ringIndices) {
      if (idx < 0 || idx >= ownedRings.value.length) continue
      const ring = ownedRings.value[idx]!
      const def = getRingById(ring.defId)
      if (def) {
        for (const eff of def.effects) {
          if (eff.type === effectType) total += eff.value
        }
      }
    }
    // 帽子（1槽位）
    if (equippedHatIndex.value >= 0 && equippedHatIndex.value < ownedHats.value.length) {
      const hat = ownedHats.value[equippedHatIndex.value]!
      const def = getHatById(hat.defId)
      if (def) {
        for (const eff of def.effects) {
          if (eff.type === effectType) total += eff.value
        }
      }
    }
    // 鞋子（1槽位）
    if (equippedShoeIndex.value >= 0 && equippedShoeIndex.value < ownedShoes.value.length) {
      const shoe = ownedShoes.value[equippedShoeIndex.value]!
      const def = getShoeById(shoe.defId)
      if (def) {
        for (const eff of def.effects) {
          if (eff.type === effectType) total += eff.value
        }
      }
    }
    if (equippedTrinket.value) {
      const trinketTuningMultiplier = 1 + useSkillStore().getSkillMasteryEffectValue('trinket_tuning')
      for (const eff of equippedTrinket.value.effects) {
        if (eff.type === effectType) total += eff.value * trinketTuningMultiplier
      }
    }
    // 套装奖励
    for (const b of activeSetBonuses.value) {
      if (b.type === effectType) total += b.value
    }
    return total
  }

  /** 查询某种戒指效果的合计值（代理到 getEquipmentBonus，包含帽子/鞋子加成） */
  const getRingEffectValue = (effectType: RingEffectType): number => {
    return getEquipmentBonus(effectType)
  }

  // ============================================================
  // 套装系统
  // ============================================================

  /** 计算当前装备中每个套装的激活件数 */
  const _getSetPieceCount = (set: (typeof EQUIPMENT_SETS)[number]): number => {
    let count = 0
    // 武器（可选字段）
    if (set.pieces.weapon) {
      const w = ownedWeapons.value[equippedWeaponIndex.value]
      if (w && w.defId === set.pieces.weapon) count++
    }
    // 戒指：两个槽位只算一次（避免两个同ID戒指重复计数）
    let ringMatched = false
    for (const idx of [equippedRingSlot1.value, equippedRingSlot2.value]) {
      if (!ringMatched && idx >= 0 && idx < ownedRings.value.length && ownedRings.value[idx]!.defId === set.pieces.ring) {
        ringMatched = true
        count++
      }
    }
    if (
      equippedHatIndex.value >= 0 &&
      equippedHatIndex.value < ownedHats.value.length &&
      ownedHats.value[equippedHatIndex.value]!.defId === set.pieces.hat
    )
      count++
    if (
      equippedShoeIndex.value >= 0 &&
      equippedShoeIndex.value < ownedShoes.value.length &&
      ownedShoes.value[equippedShoeIndex.value]!.defId === set.pieces.shoe
    )
      count++
    return count
  }

  /** 当前激活的套装奖励效果列表 */
  const activeSetBonuses = computed(() => {
    const bonuses: { type: RingEffectType; value: number }[] = []
    for (const set of EQUIPMENT_SETS) {
      const count = _getSetPieceCount(set)
      for (const bonus of set.bonuses) {
        if (count >= bonus.count) bonuses.push(...bonus.effects)
      }
    }
    return bonuses
  })

  /** 套装激活状态（供UI显示） */
  const activeSets = computed(() => {
    return EQUIPMENT_SETS.map(set => {
      const equippedCount = _getSetPieceCount(set)
      return {
        id: set.id,
        name: set.name,
        description: set.description,
        equippedCount,
        bonuses: set.bonuses.map(b => ({
          count: b.count,
          description: b.description,
          active: equippedCount >= b.count
        }))
      }
    }).filter(s => s.equippedCount > 0)
  })

  /** 合成戒指 */
  const craftRing = (defId: string): { success: boolean; message: string } => {
    const def = getRingById(defId)
    if (!def || !def.recipe) return { success: false, message: '该戒指无法合成。' }
    if (hasRing(defId)) return { success: false, message: `已拥有${def.name}，无需重复合成。` }

    const recipe = normalizeItemRequirements(def.recipe)
    // 检查材料
    for (const mat of recipe) {
      if (getItemCount(mat.itemId) < mat.quantity) {
        const matName = getItemById(mat.itemId)?.name ?? mat.itemId
        return { success: false, message: `材料不足：${matName}。` }
      }
    }

    // 检查铜钱（延迟导入避免循环依赖）
    const playerStore = usePlayerStore()
    if (playerStore.money < def.recipeMoney) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }

    if (!playerStore.spendMoney(def.recipeMoney)) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }
    // 消耗材料
    if (!removeItemsWithRollback(recipe)) {
      playerStore.earnMoney(def.recipeMoney, { countAsEarned: false })
      return { success: false, message: '材料不足。' }
    }

    // 添加戒指
    addRing(defId)
    return { success: true, message: `合成了${def.name}！` }
  }

  // ============================================================
  // 帽子系统
  // ============================================================

  /** 添加帽子到收藏 */
  const addHat = (defId: string): boolean => {
    ownedHats.value.push({ defId })
    useAchievementStore().discoverItem(defId)
    return true
  }

  /** 检查是否已拥有某帽子 */
  const hasHat = (defId: string): boolean => {
    return ownedHats.value.some(h => h.defId === defId)
  }

  /** 装备帽子 */
  const equipHat = (index: number): boolean => {
    if (index < 0 || index >= ownedHats.value.length) return false
    equippedHatIndex.value = index
    return true
  }

  /** 卸下帽子 */
  const unequipHat = (): boolean => {
    if (equippedHatIndex.value < 0) return false
    equippedHatIndex.value = -1
    return true
  }

  /** 卖出帽子 */
  const sellHat = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedHats.value.length) return { success: false, message: '无效索引。' }
    const hat = ownedHats.value[index]!
    if (hat.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getHatById(hat.defId)
    const price = def?.sellPrice ?? 0
    // 自动卸下
    if (equippedHatIndex.value === index) equippedHatIndex.value = -1
    const playerStore = usePlayerStore()
    playerStore.earnMoney(price)
    ownedHats.value.splice(index, 1)
    // 修正装备索引
    if (equippedHatIndex.value > index) equippedHatIndex.value--
    return { success: true, message: `卖出了${def?.name ?? '帽子'}，获得${price}文。` }
  }

  /** 移除帽子收藏中的一个（用于回滚战利品） */
  const removeHat = (defId: string): boolean => {
    const index = findLastMatchingIndex(ownedHats.value, h => h.defId === defId)
    if (index < 0) return false
    if (equippedHatIndex.value === index) equippedHatIndex.value = -1
    ownedHats.value.splice(index, 1)
    if (equippedHatIndex.value > index) equippedHatIndex.value--
    return true
  }

  /** 合成帽子 */
  const craftHat = (defId: string): { success: boolean; message: string } => {
    const def = getHatById(defId)
    if (hasHat(defId)) return { success: false, message: '你已经拥有这顶帽子了。' }
    if (!def || !def.recipe) return { success: false, message: '该帽子无法合成。' }
    const recipe = normalizeItemRequirements(def.recipe)
    for (const mat of recipe) {
      if (getItemCount(mat.itemId) < mat.quantity) {
        const matName = getItemById(mat.itemId)?.name ?? mat.itemId
        return { success: false, message: `材料不足：${matName}。` }
      }
    }
    const playerStore = usePlayerStore()
    if (playerStore.money < def.recipeMoney) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }
    if (!playerStore.spendMoney(def.recipeMoney)) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }
    if (!removeItemsWithRollback(recipe)) {
      playerStore.earnMoney(def.recipeMoney, { countAsEarned: false })
      return { success: false, message: '材料不足。' }
    }
    addHat(defId)
    return { success: true, message: `合成了${def.name}！` }
  }

  // ============================================================
  // 鞋子系统
  // ============================================================

  /** 添加鞋子到收藏 */
  const addShoe = (defId: string): boolean => {
    ownedShoes.value.push({ defId })
    useAchievementStore().discoverItem(defId)
    return true
  }

  /** 检查是否已拥有某鞋子 */
  const hasShoe = (defId: string): boolean => {
    return ownedShoes.value.some(s => s.defId === defId)
  }

  /** 装备鞋子 */
  const equipShoe = (index: number): boolean => {
    if (index < 0 || index >= ownedShoes.value.length) return false
    equippedShoeIndex.value = index
    return true
  }

  /** 卸下鞋子 */
  const unequipShoe = (): boolean => {
    if (equippedShoeIndex.value < 0) return false
    equippedShoeIndex.value = -1
    return true
  }

  /** 卖出鞋子 */
  const sellShoe = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedShoes.value.length) return { success: false, message: '无效索引。' }
    const shoe = ownedShoes.value[index]!
    if (shoe.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getShoeById(shoe.defId)
    const price = def?.sellPrice ?? 0
    // 自动卸下
    if (equippedShoeIndex.value === index) equippedShoeIndex.value = -1
    const playerStore = usePlayerStore()
    playerStore.earnMoney(price)
    ownedShoes.value.splice(index, 1)
    // 修正装备索引
    if (equippedShoeIndex.value > index) equippedShoeIndex.value--
    return { success: true, message: `卖出了${def?.name ?? '鞋子'}，获得${price}文。` }
  }

  /** 移除鞋子收藏中的一个（用于回滚战利品） */
  const removeShoe = (defId: string): boolean => {
    const index = findLastMatchingIndex(ownedShoes.value, s => s.defId === defId)
    if (index < 0) return false
    if (equippedShoeIndex.value === index) equippedShoeIndex.value = -1
    ownedShoes.value.splice(index, 1)
    if (equippedShoeIndex.value > index) equippedShoeIndex.value--
    return true
  }

  /** 合成鞋子 */
  const craftShoe = (defId: string): { success: boolean; message: string } => {
    const def = getShoeById(defId)
    if (hasShoe(defId)) return { success: false, message: '你已经拥有这双鞋子了。' }
    if (!def || !def.recipe) return { success: false, message: '该鞋子无法合成。' }
    const recipe = normalizeItemRequirements(def.recipe)
    for (const mat of recipe) {
      if (getItemCount(mat.itemId) < mat.quantity) {
        const matName = getItemById(mat.itemId)?.name ?? mat.itemId
        return { success: false, message: `材料不足：${matName}。` }
      }
    }
    const playerStore = usePlayerStore()
    if (playerStore.money < def.recipeMoney) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }
    if (!playerStore.spendMoney(def.recipeMoney)) {
      return { success: false, message: `铜钱不足（需要${def.recipeMoney}文）。` }
    }
    if (!removeItemsWithRollback(recipe)) {
      playerStore.earnMoney(def.recipeMoney, { countAsEarned: false })
      return { success: false, message: '材料不足。' }
    }
    addShoe(defId)
    return { success: true, message: `合成了${def.name}！` }
  }

  /** 全部套装目录（含未拥有装备，供 UI 预览套装效果） */
  const equipmentSetCatalog = computed<EquipmentSetCatalogEntry[]>(() => {
    const isWeaponEquipped = (defId: string): boolean => ownedWeapons.value[equippedWeaponIndex.value]?.defId === defId
    const isRingEquipped = (defId: string): boolean => {
      return [equippedRingSlot1.value, equippedRingSlot2.value].some(idx => idx >= 0 && idx < ownedRings.value.length && ownedRings.value[idx]?.defId === defId)
    }
    const isHatEquipped = (defId: string): boolean => equippedHatIndex.value >= 0 && ownedHats.value[equippedHatIndex.value]?.defId === defId
    const isShoeEquipped = (defId: string): boolean => equippedShoeIndex.value >= 0 && ownedShoes.value[equippedShoeIndex.value]?.defId === defId

    return EQUIPMENT_SETS.map(set => {
      const pieces: EquipmentSetCatalogPiece[] = []
      if (set.pieces.weapon) {
        pieces.push({
          slot: 'weapon',
          slotLabel: '武器',
          defId: set.pieces.weapon,
          name: getWeaponById(set.pieces.weapon)?.name ?? set.pieces.weapon,
          owned: hasWeapon(set.pieces.weapon),
          equipped: isWeaponEquipped(set.pieces.weapon)
        })
      }
      pieces.push(
        {
          slot: 'ring',
          slotLabel: '戒指',
          defId: set.pieces.ring,
          name: getRingById(set.pieces.ring)?.name ?? set.pieces.ring,
          owned: hasRing(set.pieces.ring),
          equipped: isRingEquipped(set.pieces.ring)
        },
        {
          slot: 'hat',
          slotLabel: '帽子',
          defId: set.pieces.hat,
          name: getHatById(set.pieces.hat)?.name ?? set.pieces.hat,
          owned: hasHat(set.pieces.hat),
          equipped: isHatEquipped(set.pieces.hat)
        },
        {
          slot: 'shoe',
          slotLabel: '鞋子',
          defId: set.pieces.shoe,
          name: getShoeById(set.pieces.shoe)?.name ?? set.pieces.shoe,
          owned: hasShoe(set.pieces.shoe),
          equipped: isShoeEquipped(set.pieces.shoe)
        }
      )
      const equippedCount = pieces.filter(piece => piece.equipped).length
      return {
        id: set.id,
        name: set.name,
        description: set.description,
        totalPieces: pieces.length,
        ownedCount: pieces.filter(piece => piece.owned).length,
        equippedCount,
        pieces,
        bonuses: set.bonuses.map(b => ({
          count: b.count,
          description: b.description,
          active: equippedCount >= b.count
        }))
      }
    })
  })

  // ============================================================
  // 饰物系统
  // ============================================================

  const equipTrinket = (defId: string): boolean => {
    if (!isTrinketSlotUnlocked.value) return false
    if (!unlockedTrinkets.value.some(def => def.id === defId)) return false
    equippedTrinketId.value = defId
    playerStore.markLifestyleUnlock(`trinket_equipped_${defId}`)
    return true
  }

  const unequipTrinket = (): boolean => {
    if (!equippedTrinketId.value) return false
    equippedTrinketId.value = null
    return true
  }

  // ============================================================
  // 装备方案系统
  // ============================================================

  /** 创建空方案 */
  const createEquipmentPreset = (name: string): boolean => {
    if (equipmentPresets.value.length >= MAX_EQUIPMENT_PRESETS) return false
    equipmentPresets.value.push({
      id: Date.now().toString(),
      name,
      weaponDefId: null,
      weaponEnchantmentId: null,
      ringSlot1DefId: null,
      ringSlot2DefId: null,
      hatDefId: null,
      shoeDefId: null,
      trinketDefId: null
    })
    return true
  }

  /** 删除方案 */
  const deleteEquipmentPreset = (id: string) => {
    const idx = equipmentPresets.value.findIndex(p => p.id === id)
    if (idx >= 0) equipmentPresets.value.splice(idx, 1)
    if (activePresetId.value === id) activePresetId.value = null
  }

  /** 重命名方案 */
  const renameEquipmentPreset = (id: string, name: string) => {
    const preset = equipmentPresets.value.find(p => p.id === id)
    if (preset) preset.name = name.trim() || preset.name
  }

  /** 将当前装备保存到方案 */
  const saveCurrentToPreset = (id: string) => {
    const preset = equipmentPresets.value.find(p => p.id === id)
    if (!preset) return
    preset.weaponDefId = ownedWeapons.value[equippedWeaponIndex.value]?.defId ?? null
    preset.weaponEnchantmentId = ownedWeapons.value[equippedWeaponIndex.value]?.enchantmentId ?? null
    preset.ringSlot1DefId = equippedRingSlot1.value >= 0 ? (ownedRings.value[equippedRingSlot1.value]?.defId ?? null) : null
    preset.ringSlot2DefId = equippedRingSlot2.value >= 0 ? (ownedRings.value[equippedRingSlot2.value]?.defId ?? null) : null
    preset.hatDefId = equippedHatIndex.value >= 0 ? (ownedHats.value[equippedHatIndex.value]?.defId ?? null) : null
    preset.shoeDefId = equippedShoeIndex.value >= 0 ? (ownedShoes.value[equippedShoeIndex.value]?.defId ?? null) : null
    preset.trinketDefId = equippedTrinketId.value
  }

  /** 应用装备方案 */
  const applyEquipmentPreset = (id: string): { success: boolean; message: string } => {
    const preset = equipmentPresets.value.find(p => p.id === id)
    if (!preset) return { success: false, message: '方案不存在。' }

    const missing: string[] = []

    // 武器
    if (preset.weaponDefId) {
      const idx = ownedWeapons.value.findIndex(
        w => w.defId === preset.weaponDefId && (preset.weaponEnchantmentId == null || w.enchantmentId === preset.weaponEnchantmentId)
      )
      if (idx >= 0) equipWeapon(idx)
      else {
        equipFallbackWeapon()
        missing.push('武器')
      }
    }

    // 戒指槽1
    let ring1Idx = -1
    if (preset.ringSlot1DefId) {
      ring1Idx = ownedRings.value.findIndex(r => r.defId === preset.ringSlot1DefId)
      if (ring1Idx >= 0) {
        if (!equipRing(ring1Idx, 0)) {
          unequipRing(0)
          missing.push('戒指1')
        }
      } else {
        unequipRing(0)
        missing.push('戒指1')
      }
    } else {
      unequipRing(0)
    }

    // 戒指槽2（禁止与槽1装备同defId戒指）
    if (preset.ringSlot2DefId) {
      if (preset.ringSlot2DefId === preset.ringSlot1DefId) {
        // 旧方案中两个槽保存了同defId戒指，现已禁止，跳过槽2
        unequipRing(1)
        missing.push('戒指2（不可与槽1相同）')
      } else {
        const idx = ownedRings.value.findIndex(r => r.defId === preset.ringSlot2DefId)
        if (idx >= 0) {
          if (!equipRing(idx, 1)) {
            unequipRing(1)
            missing.push('戒指2')
          }
        } else {
          unequipRing(1)
          missing.push('戒指2')
        }
      }
    } else {
      unequipRing(1)
    }

    // 帽子
    if (preset.hatDefId) {
      const idx = ownedHats.value.findIndex(h => h.defId === preset.hatDefId)
      if (idx >= 0) equipHat(idx)
      else {
        unequipHat()
        missing.push('帽子')
      }
    } else {
      unequipHat()
    }

    // 鞋子
    if (preset.shoeDefId) {
      const idx = ownedShoes.value.findIndex(s => s.defId === preset.shoeDefId)
      if (idx >= 0) equipShoe(idx)
      else {
        unequipShoe()
        missing.push('鞋子')
      }
    } else {
      unequipShoe()
    }

    if (preset.trinketDefId) {
      if (!equipTrinket(preset.trinketDefId)) {
        unequipTrinket()
        missing.push('饰物')
      }
    } else {
      unequipTrinket()
    }

    activePresetId.value = id

    if (missing.length > 0) {
      return { success: true, message: `已应用方案「${preset.name}」，但${missing.join('、')}已不在背包中。` }
    }
    return { success: true, message: `已应用方案「${preset.name}」。` }
  }

  const serialize = () => {
    return {
      items: cloneInventorySlots(items.value),
      capacity: capacity.value,
      tempItems: cloneInventorySlots(tempItems.value),
      tools: cloneTools(tools.value),
      ownedWeapons: cloneOwnedWeapons(ownedWeapons.value),
      equippedWeaponIndex: equippedWeaponIndex.value,
      pendingUpgrade: pendingUpgrade.value ? { ...pendingUpgrade.value } : null,
      ownedRings: cloneOwnedRings(ownedRings.value),
      equippedRingSlot1: equippedRingSlot1.value,
      equippedRingSlot2: equippedRingSlot2.value,
      ownedHats: cloneOwnedHats(ownedHats.value),
      equippedHatIndex: equippedHatIndex.value,
      ownedShoes: cloneOwnedShoes(ownedShoes.value),
      equippedShoeIndex: equippedShoeIndex.value,
      equippedTrinketId: equippedTrinketId.value,
      equipmentPresets: cloneEquipmentPresets(equipmentPresets.value),
      activePresetId: activePresetId.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    equipmentMigrationLogs.value = []

    const migrateRecipeId = (id: string) => {
      if (id === 'mill_fish_feed' || id === 'recycle_fish_feed') return 'fish_feed'
      return id
    }

    const normalizeSlotIndex = (value: unknown, fallback = -1) => {
      const index = Math.floor(Number(value))
      return Number.isFinite(index) ? index : fallback
    }

    const normalizeOwnedWeaponEntries = (value: unknown, equippedIndexValue: unknown) => {
      const rawWeapons = Array.isArray(value) ? value : []
      const equippedRawIndex = normalizeSlotIndex(equippedIndexValue, 0)
      const validWeapons: Array<OwnedWeapon & { rawIndex: number }> = []
      rawWeapons.forEach((entry, rawIndex) => {
        if (!entry || typeof entry !== 'object') return
        const rawWeapon = entry as Partial<OwnedWeapon>
        const defId = typeof rawWeapon.defId === 'string' ? rawWeapon.defId : ''
        if (!getWeaponById(defId)) {
          pushEquipmentMigrationLog(`移除无效武器：${defId || `#${rawIndex}`}。`)
          return
        }
        const rawEnchantmentId = typeof rawWeapon.enchantmentId === 'string' ? rawWeapon.enchantmentId : null
        const enchantmentId = rawEnchantmentId && getEnchantmentById(rawEnchantmentId) ? rawEnchantmentId : null
        if (rawEnchantmentId && !enchantmentId) {
          pushEquipmentMigrationLog(`清空武器 ${defId} 的无效附魔：${rawEnchantmentId}。`)
        }
        validWeapons.push({ defId, enchantmentId, locked: readLockedFlag(rawWeapon), rawIndex })
      })

      if (validWeapons.length <= 0) {
        ownedWeapons.value = [{ defId: 'wooden_stick', enchantmentId: null }]
        equippedWeaponIndex.value = 0
        pushEquipmentMigrationLog('武器列表为空或全部无效，已回退到木棍。')
        return
      }

      const remappedIndex = validWeapons.findIndex(weapon => weapon.rawIndex === equippedRawIndex)
      ownedWeapons.value = validWeapons.map(({ rawIndex: _rawIndex, ...weapon }) => weapon)
      equippedWeaponIndex.value = remappedIndex >= 0 ? remappedIndex : 0
      if (remappedIndex < 0) {
        pushEquipmentMigrationLog('当前武器索引无效或目标武器已移除，已回退到第一把有效武器。')
      }
    }

    const normalizeOwnedRings = (value: unknown, slot1Value: unknown, slot2Value: unknown) => {
      const rawRings = Array.isArray(value) ? value : []
      const validRings: Array<OwnedRing & { rawIndex: number }> = []
      rawRings.forEach((entry, rawIndex) => {
        if (!entry || typeof entry !== 'object') return
        const defId = typeof (entry as Partial<OwnedRing>).defId === 'string' ? (entry as Partial<OwnedRing>).defId! : ''
        if (!getRingById(defId)) {
          pushEquipmentMigrationLog(`移除无效戒指：${defId || `#${rawIndex}`}。`)
          return
        }
        validRings.push({ defId, locked: readLockedFlag(entry as { locked?: unknown }), rawIndex })
      })

      const remapRingSlot = (slotValue: unknown, label: string) => {
        const rawSlot = normalizeSlotIndex(slotValue)
        if (rawSlot < 0) return -1
        const index = validRings.findIndex(ring => ring.rawIndex === rawSlot)
        if (index < 0) pushEquipmentMigrationLog(`${label}目标戒指无效，已清空。`)
        return index
      }

      ownedRings.value = validRings.map(({ rawIndex: _rawIndex, ...ring }) => ring)
      equippedRingSlot1.value = remapRingSlot(slot1Value, '戒指槽1')
      equippedRingSlot2.value = remapRingSlot(slot2Value, '戒指槽2')
      if (equippedRingSlot1.value >= 0 && equippedRingSlot2.value >= 0) {
        const slot1 = ownedRings.value[equippedRingSlot1.value] ?? null
        const slot2 = ownedRings.value[equippedRingSlot2.value] ?? null
        if (equippedRingSlot1.value === equippedRingSlot2.value || (slot1 && slot2 && slot1.defId === slot2.defId)) {
          equippedRingSlot2.value = -1
          pushEquipmentMigrationLog('戒指槽2与槽1重复，已清空槽2。')
        }
      }
    }

    const normalizeSingleIndexedEquipment = (
      value: unknown,
      equippedIndexValue: unknown,
      resolveDef: (defId: string) => unknown,
      label: string
    ): { entries: Array<{ defId: string; locked?: boolean }>; equippedIndex: number } => {
      const rawEntries = Array.isArray(value) ? value : []
      const equippedRawIndex = normalizeSlotIndex(equippedIndexValue)
      const validEntries: Array<{ defId: string; locked?: boolean; rawIndex: number }> = []
      rawEntries.forEach((entry, rawIndex) => {
        if (!entry || typeof entry !== 'object') return
        const defId = typeof (entry as { defId?: unknown }).defId === 'string' ? (entry as { defId: string }).defId : ''
        if (!resolveDef(defId)) {
          pushEquipmentMigrationLog(`移除无效${label}：${defId || `#${rawIndex}`}。`)
          return
        }
        validEntries.push({ defId, locked: readLockedFlag(entry as { locked?: unknown }), rawIndex })
      })
      const remappedIndex = validEntries.findIndex(entry => entry.rawIndex === equippedRawIndex)
      if (equippedRawIndex >= 0 && remappedIndex < 0) {
        pushEquipmentMigrationLog(`当前${label}无效，已清空槽位。`)
      }
      return {
        entries: validEntries.map(({ rawIndex: _rawIndex, ...entry }) => entry),
        equippedIndex: remappedIndex >= 0 ? remappedIndex : -1
      }
    }

    items.value = (data.items ?? []).map(i => ({ ...i, itemId: migrateRecipeId(i.itemId) })).filter(i => getItemById(i.itemId))
    capacity.value = data.capacity ?? INITIAL_CAPACITY
    tempItems.value = ((data as any).tempItems ?? []).map((i: InventoryItem) => ({ ...i, itemId: migrateRecipeId(i.itemId) })).filter((i: InventoryItem) => getItemById(i.itemId))
    tools.value = data.tools ?? [
      { type: 'wateringCan', tier: 'basic' },
      { type: 'hoe', tier: 'basic' },
      { type: 'pickaxe', tier: 'basic' },
      { type: 'fishingRod', tier: 'basic' },
      { type: 'scythe', tier: 'basic' },
      { type: 'axe', tier: 'basic' },
      { type: 'pan', tier: 'basic' }
    ]
    // 向后兼容：旧存档可能缺少新工具
    const requiredTools: ToolType[] = ['wateringCan', 'hoe', 'pickaxe', 'fishingRod', 'scythe', 'axe', 'pan']
    for (const rt of requiredTools) {
      if (!tools.value.find(t => t.type === rt)) {
        tools.value.push({ type: rt, tier: 'basic' })
      }
    }

    // 新版武器系统
    if ((data as any).ownedWeapons) {
      normalizeOwnedWeaponEntries((data as any).ownedWeapons, (data as any).equippedWeaponIndex)
    } else {
      // 旧存档迁移：weapon: { tier: 'copper' } → ownedWeapons
      const oldWeapon = (data as any).weapon
      if (oldWeapon?.tier) {
        const tierMap: Record<string, string> = {
          wood: 'wooden_stick',
          copper: 'copper_sword',
          iron: 'iron_blade',
          gold: 'gold_halberd'
        }
        const defId = tierMap[oldWeapon.tier as string] ?? 'wooden_stick'
        normalizeOwnedWeaponEntries([{ defId, enchantmentId: null }], 0)
      } else {
        normalizeOwnedWeaponEntries([{ defId: 'wooden_stick', enchantmentId: null }], 0)
      }
    }

    pendingUpgrade.value = normalizePendingToolUpgrade((data as any).pendingUpgrade)

    // 戒指系统（向后兼容旧存档）
    normalizeOwnedRings(
      (data as Record<string, unknown>).ownedRings,
      (data as Record<string, unknown>).equippedRingSlot1,
      (data as Record<string, unknown>).equippedRingSlot2
    )

    // 帽子系统（向后兼容旧存档）
    const normalizedHats = normalizeSingleIndexedEquipment(
      (data as Record<string, unknown>).ownedHats,
      (data as Record<string, unknown>).equippedHatIndex,
      getHatById,
      '帽子'
    )
    ownedHats.value = normalizedHats.entries
    equippedHatIndex.value = normalizedHats.equippedIndex

    // 鞋子系统（向后兼容旧存档）
    const normalizedShoes = normalizeSingleIndexedEquipment(
      (data as Record<string, unknown>).ownedShoes,
      (data as Record<string, unknown>).equippedShoeIndex,
      getShoeById,
      '鞋子'
    )
    ownedShoes.value = normalizedShoes.entries
    equippedShoeIndex.value = normalizedShoes.equippedIndex
    equippedTrinketId.value = typeof (data as Record<string, unknown>).equippedTrinketId === 'string' ? ((data as Record<string, unknown>).equippedTrinketId as string) : null
    if (equippedTrinketId.value && !getTrinketById(equippedTrinketId.value)) {
      pushEquipmentMigrationLog(`清空无效饰物：${equippedTrinketId.value}。`)
      equippedTrinketId.value = null
    }
    if (equippedTrinketId.value && !unlockedTrinkets.value.some(def => def.id === equippedTrinketId.value)) {
      pushEquipmentMigrationLog(`饰物 ${equippedTrinketId.value} 尚未解锁，已清空槽位。`)
      equippedTrinketId.value = null
    }

    // 装备方案（向后兼容旧存档）
    equipmentPresets.value = ((data as Record<string, unknown>).equipmentPresets as EquipmentPreset[] | undefined) ?? []
    equipmentPresets.value = equipmentPresets.value.map(preset => ({
      ...preset,
      weaponEnchantmentId: (preset as EquipmentPreset & { weaponEnchantmentId?: string | null }).weaponEnchantmentId ?? null,
      trinketDefId: (preset as EquipmentPreset & { trinketDefId?: string | null }).trinketDefId ?? null
    }))
    activePresetId.value = ((data as Record<string, unknown>).activePresetId as string | null | undefined) ?? null
    if (activePresetId.value && !equipmentPresets.value.some(preset => preset.id === activePresetId.value)) {
      pushEquipmentMigrationLog(`当前装备方案 ${activePresetId.value} 不存在，已清空激活状态。`)
      activePresetId.value = null
    }
  }

  return {
    items,
    capacity,
    tools,
    ownedWeapons,
    equippedWeaponIndex,
    equipmentMigrationLogs,
    pendingUpgrade,
    isFull,
    tempItems,
    isTempFull,
    isAllFull,
    addItem,
    addItemExact,
    addItemsExact,
    canAddItem,
    canAddItems,
    removeItem,
    removeItemFromTemp,
    removeItemAnywhere,
    getItemCount,
    getTempItemCount,
    getTotalItemCount,
    hasItem,
    expandCapacity,
    expandCapacityExtra,
    MAX_CAPACITY,
    getMovableTempItemCount,
    canMoveFromTemp,
    moveFromTemp,
    moveAllFromTemp,
    discardTempItem,
    sortItems,
    toggleLock,
    toggleEquipmentLock,
    MAX_EQUIPMENT_PRESETS,
    getTool,
    getToolStaminaMultiplier,
    getToolWorkTimeMultiplier,
    getToolBatchCount,
    upgradeTool,
    isToolAvailable,
    startUpgrade,
    dailyUpgradeUpdate,
    getWeaponAttack,
    getWeaponCritRate,
    getEquippedWeapon,
    addWeapon,
    hasWeapon,
    equipWeapon,
    sellWeapon,
    removeWeapon,
    ownedRings,
    equippedRingSlot1,
    equippedRingSlot2,
    addRing,
    hasRing,
    equipRing,
    unequipRing,
    sellRing,
    removeRing,
    getRingEffectValue,
    getEquipmentBonus,
    craftRing,
    activeSets,
    equipmentSetCatalog,
    ownedHats,
    equippedHatIndex,
    addHat,
    hasHat,
    equipHat,
    unequipHat,
    sellHat,
    removeHat,
    craftHat,
    ownedShoes,
    equippedShoeIndex,
    unlockedTrinkets,
    equippedTrinket,
    equippedTrinketId,
    addShoe,
    hasShoe,
    equipShoe,
    unequipShoe,
    sellShoe,
    removeShoe,
    craftShoe,
    equipTrinket,
    unequipTrinket,
    equipmentPresets,
    activePresetId,
    createEquipmentPreset,
    deleteEquipmentPreset,
    renameEquipmentPreset,
    saveCurrentToPreset,
    applyEquipmentPreset,
    serialize,
    deserialize
  }
})
