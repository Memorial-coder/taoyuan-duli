import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { InventoryItem, Quality, Chest, ChestTier, VoidChestRole } from '@/types'
import { getItemById, CHEST_DEFS } from '@/data/items'
import { useInventoryStore } from './useInventoryStore'

const INITIAL_MAX_CHESTS = 3
const MAX_CHESTS_CAP = 10
const MAX_STACK = 999
const UNLOCK_COST = 50000
const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

type ChestConsumeEntry = {
  itemId: string
  quantity: number
  quality?: Quality
}

export const useWarehouseStore = defineStore('warehouse', () => {
  const unlocked = ref(false)
  const chests = ref<Chest[]>([])
  const maxChests = ref(INITIAL_MAX_CHESTS)

  const hasVoidChest = computed(() => chests.value.some(c => c.tier === 'void'))

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
  const canAddItemToChest = (chestId: string, itemId: string, quantity: number = 1, quality: Quality = 'normal'): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    const cap = CHEST_DEFS[chest.tier].capacity

    let simulatedRemaining = quantity
    for (const slot of chest.items) {
      if (simulatedRemaining <= 0) break
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(simulatedRemaining, MAX_STACK - slot.quantity)
        simulatedRemaining -= canAdd
      }
    }
    simulatedRemaining -= Math.max(0, cap - chest.items.length) * MAX_STACK
    return simulatedRemaining <= 0
  }

  /** 直接往箱子加物品（内部/自动路由用） */
  const addItemToChest = (chestId: string, itemId: string, quantity: number = 1, quality: Quality = 'normal'): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    const cap = CHEST_DEFS[chest.tier].capacity

    if (!canAddItemToChest(chestId, itemId, quantity, quality)) return false

    let remaining = quantity

    for (const slot of chest.items) {
      if (remaining <= 0) break
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    while (remaining > 0 && chest.items.length < cap) {
      const batch = Math.min(remaining, MAX_STACK)
      chest.items.push({ itemId, quantity: batch, quality })
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
  const canConsumeChestItems = (chestId: string, entries: ChestConsumeEntry[]): boolean => {
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false
    return entries.every(entry => getChestItemCount(chest.id, entry.itemId, entry.quality) >= entry.quantity)
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
  const depositToChest = (chestId: string, itemId: string, quantity: number, quality: Quality): number => {
    const inv = useInventoryStore()
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return 0

    // 计算箱子可容纳数量
    const cap = CHEST_DEFS[chest.tier].capacity
    let canStore = 0
    for (const slot of chest.items) {
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < MAX_STACK) {
        canStore += MAX_STACK - slot.quantity
      }
    }
    const freeSlots = cap - chest.items.length
    canStore += freeSlots * MAX_STACK

    const actual = Math.min(quantity, canStore)
    if (actual <= 0) return 0

    if (!inv.removeItem(itemId, actual, quality)) return 0
    addItemToChest(chestId, itemId, actual, quality)
    return actual
  }

  /** 从箱子取出到背包 */
  const withdrawFromChest = (chestId: string, itemId: string, quantity: number, quality: Quality): boolean => {
    const inv = useInventoryStore()
    const chest = chests.value.find(c => c.id === chestId)
    if (!chest) return false

    const available = getChestItemCount(chestId, itemId, quality)
    const actual = Math.min(quantity, available)
    if (actual <= 0) return false
    if (!inv.canAddItem(itemId, actual, quality)) return false

    // 先从箱子移除，再完整加入背包
    removeItemFromChest(chestId, itemId, actual, quality)
    return inv.addItemExact(itemId, actual, quality)
  }

  // ---- 仓库扩容 ----

  /** 扩容仓库（增加箱子槽位） */
  const expandMaxChests = (): boolean => {
    if (maxChests.value >= MAX_CHESTS_CAP) return false
    maxChests.value += 1
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
        items: chest.items.map(item => ({ ...item }))
      })),
      maxChests: maxChests.value
    }
  }

  const deserialize = (data: Record<string, unknown>) => {
    unlocked.value = (data.unlocked as boolean) ?? false
    maxChests.value = (data.maxChests as number) ?? INITIAL_MAX_CHESTS

    const migrateRecipeId = (id: string) => {
      if (id === 'mill_fish_feed' || id === 'recycle_fish_feed') return 'fish_feed'
      return id
    }

    // 旧存档迁移：有 items 无 chests
    if (data.items && !data.chests) {
      const oldItems = (data.items as InventoryItem[]).map(i => ({ ...i, itemId: migrateRecipeId(i.itemId) })).filter(i => getItemById(i.itemId))
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
        if (maxChests.value < migratedChests.length) {
          maxChests.value = migratedChests.length
        }
      } else {
        chests.value = []
      }
    } else {
      chests.value = ((data.chests as Chest[]) ?? []).map(chest => ({
        ...chest,
        items: chest.items.map(i => ({ ...i, itemId: migrateRecipeId(i.itemId) })).filter(i => getItemById(i.itemId))
      }))
    }

    // 兼容旧存档：如果有箱子但未标记解锁，自动解锁
    if (!unlocked.value && chests.value.length > 0) unlocked.value = true
  }

  return {
    unlocked,
    chests,
    maxChests,
    hasVoidChest,
    UNLOCK_COST,
    MAX_CHESTS_CAP,
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
