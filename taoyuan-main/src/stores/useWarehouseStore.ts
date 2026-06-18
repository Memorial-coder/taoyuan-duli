import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { InventoryItem, Quality, Chest, ChestTier, VoidChestRole } from '@/types'
import { getItemById, CHEST_DEFS } from '@/data/items'
import { usePotentialStore } from './usePotentialStore'
import {
  cloneInventoryItemSlot,
  createInventoryItemSlot,
  inventoryStacksMatch,
  type InventoryItemStackMeta,
  useInventoryStore
} from './useInventoryStore'

const INITIAL_MAX_CHESTS = 3
const MAX_CHESTS_CAP = 10
const POTENTIAL_MAX_CHESTS_CAP = MAX_CHESTS_CAP + 30
const MAX_STACK = 999
const UNLOCK_COST = 50000
const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

type ChestConsumeEntry = {
  itemId: string
  quantity: number
  quality?: Quality
}

const normalizeChestConsumeQuantity = (quantity: number): number => Math.max(0, Math.floor(Number(quantity) || 0))

export const useWarehouseStore = defineStore('warehouse', () => {
  const unlocked = ref(false)
  const chests = ref<Chest[]>([])
  const baseMaxChests = ref(INITIAL_MAX_CHESTS)

  const hasVoidChest = computed(() => chests.value.some(c => c.tier === 'void'))
  const potentialChestBonus = computed(() => Math.floor(usePotentialStore().getPotentialEffectValue('potential_storage_efficiency')))
  const maxChests = computed({
    get: () => Math.min(POTENTIAL_MAX_CHESTS_CAP, baseMaxChests.value + potentialChestBonus.value),
    set: value => {
      const normalized = Math.max(INITIAL_MAX_CHESTS, Math.floor(Number(value) || INITIAL_MAX_CHESTS))
      baseMaxChests.value = Math.min(MAX_CHESTS_CAP, normalized)
    }
  })

  // ---- 箱子管理 ----

  /** 创建箱子 */
  const addChest = (tier: ChestTier, label?: string): boolean => {
    if (chests.value.length >= maxChests.value) return false
    const def = CHEST_DEFS[tier]
    chests.value.push({
      id: `chest_${Date.now()}`,
      tier,
      label: label ?? def.name,
      items: [],
      voidRole: 'none'
    })
    return true
  }

  /** 删除空箱子 */
  const removeChest = (chestId: string): boolean => {
    const idx = chests.value.findIndex(c => c.id === chestId)
    if (idx === -1) return false
    if (chests.value[idx]!.items.length > 0) return false
    chests.value.splice(idx, 1)
    return true
  }

  /** 重命名箱子 */
  const renameChest = (chestId: string, label: string): boolean => {
    const trimmed = label.trim()
    if (!trimmed || trimmed.length > 8) return false
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    chest.label = trimmed
    return true
  }

  /** 获取箱子引用 */
  const getChest = (chestId: string): Chest | undefined => {
    return chests.value.find(c => c.id === chestId)
  }

  /** 获取箱子容量 */
  const getChestCapacity = (chestId: string): number => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return 0
    return CHEST_DEFS[chest.tier].capacity
  }

  /** 箱子是否已满 */
  const isChestFull = (chestId: string): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return true
    return chest.items.length >= CHEST_DEFS[chest.tier].capacity
  }

  // ---- 物品操作 ----

  /** 直接往箱子加物品（内部/自动路由用） */
  const canAddItemToChest = (
    chestId: string,
    itemId: string,
    quantity: number = 1,
    quality: Quality = 'normal',
    meta?: InventoryItemStackMeta | null
  ): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    const cap = CHEST_DEFS[chest.tier].capacity
    const incoming = createInventoryItemSlot(itemId, quantity, quality, meta)

    let simulatedRemaining = quantity
    for (const slot of chest.items) {
      if (simulatedRemaining <= 0) break
      if (inventoryStacksMatch(slot, incoming) && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(simulatedRemaining, MAX_STACK - slot.quantity)
        simulatedRemaining -= canAdd
      }
    }
    simulatedRemaining -= Math.max(0, cap - chest.items.length) * MAX_STACK
    return simulatedRemaining <= 0
  }

  /** 直接往箱子加物品（内部/自动路由用） */
  const addItemToChest = (
    chestId: string,
    itemId: string,
    quantity: number = 1,
    quality: Quality = 'normal',
    meta?: InventoryItemStackMeta | null
  ): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    const cap = CHEST_DEFS[chest.tier].capacity
    const incoming = createInventoryItemSlot(itemId, quantity, quality, meta)

    if (!canAddItemToChest(chestId, itemId, quantity, quality, meta)) return false

    let remaining = quantity

    for (const slot of chest.items) {
      if (remaining <= 0) break
      if (inventoryStacksMatch(slot, incoming) && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    while (remaining > 0 && chest.items.length < cap) {
      const batch = Math.min(remaining, MAX_STACK)
      chest.items.push(createInventoryItemSlot(itemId, batch, quality, incoming))
      remaining -= batch
    }

    return remaining <= 0
  }

  /** 直接从箱子移除物品 */
  const removeItemFromChest = (chestId: string, itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false

    const matchQuality = (i: { itemId: string; quality: Quality }) =>
      i.itemId === itemId && (quality === undefined || i.quality === quality)
    const total = chest.items.filter(matchQuality).reduce((sum, i) => sum + i.quantity, 0)
    if (total < quantity) return false

    let remaining = quantity
    for (const q of quality !== undefined ? [quality] : QUALITY_ORDER) {
      for (let i = chest.items.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = chest.items[i]!
        if (slot.itemId !== itemId || slot.quality !== q) continue
        const take = Math.min(remaining, slot.quantity)
        slot.quantity -= take
        remaining -= take
        if (slot.quantity <= 0) {
          chest.items.splice(i, 1)
        }
      }
    }
    return true
  }

  const removeItemFromChestAtIndex = (chestId: string, index: number, quantity: number = 1): InventoryItem | null => {
    const chest = chests.value.find(c => c.id === chestId)
    const slot = chest?.items[index]
    if (!chest || !slot) return null
    const take = Math.max(0, Math.floor(Number(quantity) || 0))
    if (take <= 0 || slot.quantity < take) return null
    const removed = cloneInventoryItemSlot(slot)
    removed.quantity = take
    slot.quantity -= take
    if (slot.quantity <= 0) {
      chest.items.splice(index, 1)
    }
    return removed
  }

  /** 查询箱子内物品数量 */
  const getChestItemCount = (chestId: string, itemId: string, quality?: Quality): number => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return 0
    return chest.items
      .filter(i => i.itemId === itemId && (quality === undefined || i.quality === quality))
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  /** 查找能够一次性满足需求的最低品质 */
  const findChestConsumableQuality = (chestId: string, itemId: string, quantity: number): Quality | null => {
    for (const quality of QUALITY_ORDER) {
      if (getChestItemCount(chestId, itemId, quality) >= quantity) {
        return quality
      }
    }
    return null
  }

  /** 检查箱子是否能完整扣除一组物品 */
  const canRemoveFromItemSnapshot = (items: InventoryItem[], entry: ChestConsumeEntry): boolean => {
    const quantity = normalizeChestConsumeQuantity(entry.quantity)
    if (!entry.itemId || quantity <= 0) return true

    const total = items
      .filter(item => item.itemId === entry.itemId && (entry.quality === undefined || item.quality === entry.quality))
      .reduce((sum, item) => sum + item.quantity, 0)
    if (total < quantity) return false

    let remaining = quantity
    for (const q of entry.quality !== undefined ? [entry.quality] : QUALITY_ORDER) {
      for (let i = items.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = items[i]!
        if (slot.itemId !== entry.itemId || slot.quality !== q) continue
        const take = Math.min(remaining, slot.quantity)
        slot.quantity -= take
        remaining -= take
        if (slot.quantity <= 0) items.splice(i, 1)
      }
    }
    return remaining <= 0
  }

  const canConsumeChestItems = (chestId: string, entries: ChestConsumeEntry[]): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    const simulatedItems = chest.items.map(item => ({ ...item }))
    return entries.every(entry => canRemoveFromItemSnapshot(simulatedItems, entry))
  }

  /** 仅在整组物品都足够时才统一扣除，避免部分扣料 */
  const consumeChestItemsExact = (chestId: string, entries: ChestConsumeEntry[]): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    if (!canConsumeChestItems(chestId, entries)) return false

    const snapshot = chest.items.map(item => ({ ...item }))
    for (const entry of entries) {
      if (!removeItemFromChest(chestId, entry.itemId, entry.quantity, entry.quality)) {
        chest.items = snapshot
        return false
      }
    }
    return true
  }

  // ---- 存取操作（背包 ↔ 箱子）----

  /** 从背包存入箱子，返回实际存入数量（0 = 失败） */
  const depositInventorySlotToChest = (chestId: string, inventoryIndex: number, quantity: number): number => {
    const inv = useInventoryStore()
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return 0
    const slot = inv.items[inventoryIndex]
    if (!slot) return 0

    let canStore = 0
    for (const chestSlot of chest.items) {
      if (inventoryStacksMatch(chestSlot, slot) && chestSlot.quantity < MAX_STACK) {
        canStore += MAX_STACK - chestSlot.quantity
      }
    }
    const cap = CHEST_DEFS[chest.tier].capacity
    const freeSlots = cap - chest.items.length
    canStore += freeSlots * MAX_STACK

    const actual = Math.min(Math.max(0, Math.floor(Number(quantity) || 0)), slot.quantity, canStore)
    if (actual <= 0) return 0

    const removed = inv.removeItemAtIndex(inventoryIndex, actual)
    if (!removed) return 0
    if (!addItemToChest(chestId, removed.itemId, removed.quantity, removed.quality, removed)) {
      inv.addItemExact(removed.itemId, removed.quantity, removed.quality, true, removed)
      return 0
    }
    return actual
  }

  const depositToChest = (chestId: string, itemId: string, quantity: number, quality: Quality): number => {
    const inv = useInventoryStore()
    const requestedQuantity = Math.max(0, Math.floor(Number(quantity) || 0))
    let remaining = requestedQuantity
    let deposited = 0
    for (let i = inv.items.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = inv.items[i]!
      if (slot.itemId !== itemId || slot.quality !== quality) continue
      const actual = depositInventorySlotToChest(chestId, i, remaining)
      deposited += actual
      remaining -= actual
    }
    return deposited
  }

  /** 从箱子取出到背包 */
  const withdrawFromChest = (chestId: string, itemId: string, quantity: number, quality: Quality): boolean => {
    const inv = useInventoryStore()
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false

    const requestedQuantity = Math.max(0, Math.floor(Number(quantity) || 0))
    if (requestedQuantity <= 0) return false
    let remaining = Math.min(requestedQuantity, getChestItemCount(chestId, itemId, quality))
    if (remaining <= 0) return false
    const withdrawalPlan: Array<{ index: number; quantity: number; slot: InventoryItem }> = []
    for (let i = chest.items.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = chest.items[i]!
      if (slot.itemId !== itemId || slot.quality !== quality) continue
      const take = Math.min(remaining, slot.quantity)
      withdrawalPlan.push({ index: i, quantity: take, slot: cloneInventoryItemSlot(slot) })
      remaining -= take
    }
    if (withdrawalPlan.length <= 0) return false
    if (!inv.canAddItems(withdrawalPlan.map(entry => ({ ...entry.slot, quantity: entry.quantity })))) return false

    const inventorySnapshot = inv.serialize()
    const chestItemsSnapshot = chest.items.map(item => cloneInventoryItemSlot(item))
    for (const entry of withdrawalPlan) {
      const removed = removeItemFromChestAtIndex(chestId, entry.index, entry.quantity)
      if (!removed || !inv.addItemExact(removed.itemId, removed.quantity, removed.quality, true, removed)) {
        inv.deserialize(inventorySnapshot)
        chest.items = chestItemsSnapshot
        return false
      }
    }
    return true
  }

  // ---- 仓库扩容 ----

  /** 扩容仓库（增加箱子槽位） */
  const expandMaxChests = (): boolean => {
    if (baseMaxChests.value >= MAX_CHESTS_CAP) return false
    baseMaxChests.value += 1
    return true
  }

  // ---- 虚空箱管理 ----

  /** 设置虚空箱角色（同角色互斥） */
  const setVoidRole = (chestId: string, role: VoidChestRole): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest || chest.tier !== 'void') return false

    // 清除同角色的其他箱子
    if (role !== 'none') {
      for (const c of chests.value) {
        if (c.id !== chestId && c.tier === 'void' && c.voidRole === role) {
          c.voidRole = 'none'
        }
      }
    }
    chest.voidRole = role
    return true
  }

  /** 获取虚空原料箱 */
  const getVoidInputChest = (): Chest | null => {
    return chests.value.find(c => c.tier === 'void' && c.voidRole === 'input') ?? null
  }

  /** 获取虚空成品箱 */
  const getVoidOutputChest = (): Chest | null => {
    return chests.value.find(c => c.tier === 'void' && c.voidRole === 'output') ?? null
  }

  /** 获取所有虚空箱 */
  const getVoidChests = (): Chest[] => {
    return chests.value.filter(c => c.tier === 'void')
  }

  // ---- 序列化 ----

  const serialize = () => {
    return {
      unlocked: unlocked.value,
      chests: chests.value.map(chest => ({
        ...chest,
        items: chest.items.map(item => cloneInventoryItemSlot(item))
      })),
      maxChests: baseMaxChests.value
    }
  }

  const deserialize = (data: Record<string, unknown>) => {
    unlocked.value = (data.unlocked as boolean) ?? false
    baseMaxChests.value = Math.min(MAX_CHESTS_CAP, Math.max(INITIAL_MAX_CHESTS, Math.floor(Number(data.maxChests) || INITIAL_MAX_CHESTS)))

    const migrateRecipeId = (id: string) => {
      if (id === 'mill_fish_feed' || id === 'recycle_fish_feed') return 'fish_feed'
      return id
    }

    const normalizeChestItem = (entry: unknown): InventoryItem | null => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as Partial<InventoryItem>
      const itemId = typeof raw.itemId === 'string' ? migrateRecipeId(raw.itemId) : ''
      if (!getItemById(itemId)) return null
      const quality = QUALITY_ORDER.includes(raw.quality as Quality) ? (raw.quality as Quality) : 'normal'
      const quantity = Math.max(0, Math.floor(Number(raw.quantity) || 0))
      if (quantity <= 0) return null
      const slot = createInventoryItemSlot(itemId, quantity, quality, raw)
      if (raw.locked === true) slot.locked = true
      return slot
    }

    // 旧存档迁移：有 items 无 chests
    if (data.items && !data.chests) {
      const oldItems = (Array.isArray(data.items) ? data.items : []).map(normalizeChestItem).filter((item): item is InventoryItem => !!item)
      if (oldItems.length > 0) {
        // 金箱容量36，超出时分多个箱子
        const goldCap = CHEST_DEFS.gold.capacity
        const migratedChests: Chest[] = []
        for (let i = 0; i < oldItems.length; i += goldCap) {
          migratedChests.push({
            id: `migrated_chest_${migratedChests.length + 1}`,
            tier: 'gold',
            label: migratedChests.length === 0 ? '旧仓库' : `旧仓库${migratedChests.length + 1}`,
            items: oldItems.slice(i, i + goldCap),
            voidRole: 'none'
          })
        }
        chests.value = migratedChests
        // 确保箱子槽位足够容纳迁移的箱子
        if (baseMaxChests.value < migratedChests.length) {
          baseMaxChests.value = Math.min(MAX_CHESTS_CAP, migratedChests.length)
        }
      } else {
        chests.value = []
      }
    } else {
      chests.value = ((data.chests as Chest[]) ?? []).map(chest => ({
        ...chest,
        items: (Array.isArray(chest.items) ? chest.items : []).map(normalizeChestItem).filter((item): item is InventoryItem => !!item)
      }))
    }

    // 兼容旧存档：如果有箱子但未标记解锁，自动解锁
    if (!unlocked.value && chests.value.length > 0) unlocked.value = true
  }

  return {
    unlocked,
    chests,
    baseMaxChests,
    maxChests,
    hasVoidChest,
    UNLOCK_COST,
    MAX_CHESTS_CAP,
    POTENTIAL_MAX_CHESTS_CAP,
    addChest,
    removeChest,
    renameChest,
    getChest,
    getChestCapacity,
    isChestFull,
    canAddItemToChest,
    addItemToChest,
    removeItemFromChest,
    getChestItemCount,
    findChestConsumableQuality,
    canConsumeChestItems,
    consumeChestItemsExact,
    depositInventorySlotToChest,
    depositToChest,
    withdrawFromChest,
    expandMaxChests,
    setVoidRole,
    getVoidInputChest,
    getVoidOutputChest,
    getVoidChests,
    serialize,
    deserialize
  }
})
