import { computed, type ComputedRef } from 'vue'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import type { Quality } from '@/types'

export interface CombinedItemRequirement {
  itemId: string
  quantity: number
  quality?: Quality
}

export const normalizeCombinedItemRequirements = (requirements: CombinedItemRequirement[]): CombinedItemRequirement[] => {
  const byKey = new Map<string, CombinedItemRequirement>()
  for (const requirement of requirements) {
    const quantity = Math.max(0, Math.floor(Number(requirement.quantity) || 0))
    if (!requirement.itemId || quantity <= 0) continue
    const key = `${requirement.itemId}::${requirement.quality ?? 'any'}`
    const existing = byKey.get(key)
    if (existing) {
      existing.quantity += quantity
    } else {
      byKey.set(key, {
        itemId: requirement.itemId,
        quantity,
        quality: requirement.quality
      })
    }
  }
  return [...byKey.values()]
}

interface CombinedItemCountIndex {
  totalByItemId: Map<string, number>
  totalByItemAndQuality: Map<string, number>
  signature: string
}

const getInventoryQualityKey = (itemId: string, quality: Quality) => `${itemId}::${quality}`

let combinedItemCountIndex: ComputedRef<CombinedItemCountIndex> | null = null

const getCombinedItemCountIndex = (): CombinedItemCountIndex => {
  if (!combinedItemCountIndex) {
    combinedItemCountIndex = computed(() => {
      const inv = useInventoryStore()
      const wh = useWarehouseStore()
      const totalByItemId = new Map<string, number>()
      const totalByItemAndQuality = new Map<string, number>()

      const addItemCount = (itemId: string, quantity: number, quality: Quality = 'normal') => {
        if (quantity <= 0) return
        totalByItemId.set(itemId, (totalByItemId.get(itemId) ?? 0) + quantity)
        const qualityKey = getInventoryQualityKey(itemId, quality)
        totalByItemAndQuality.set(qualityKey, (totalByItemAndQuality.get(qualityKey) ?? 0) + quantity)
      }

      for (const item of inv.items) {
        addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
      }
      for (const item of inv.tempItems) {
        addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
      }
      if (wh.unlocked) {
        for (const chest of wh.chests) {
          for (const item of chest.items) {
            addItemCount(item.itemId, item.quantity, item.quality ?? 'normal')
          }
        }
      }

      const signature = Array.from(totalByItemAndQuality.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => `${key}:${count}`)
        .join('|')

      return {
        totalByItemId,
        totalByItemAndQuality,
        signature
      }
    })
  }

  return combinedItemCountIndex.value
}

export const getCombinedItemCountSignature = (): string => getCombinedItemCountIndex().signature

/** 合计主背包 + 临时背包 + 仓库所有箱子中的某物品数量 */
export const getCombinedItemCount = (itemId: string, quality?: Quality): number => {
  const index = getCombinedItemCountIndex()
  if (quality) {
    return index.totalByItemAndQuality.get(getInventoryQualityKey(itemId, quality)) ?? 0
  }
  return index.totalByItemId.get(itemId) ?? 0
}

/** 主背包 + 临时背包 + 仓库所有箱子是否合计拥有足够数量 */
export const hasCombinedItem = (itemId: string, quantity: number = 1): boolean => getCombinedItemCount(itemId) >= quantity

export const hasCombinedItems = (requirements: CombinedItemRequirement[]): boolean =>
  normalizeCombinedItemRequirements(requirements).every(
    requirement => getCombinedItemCount(requirement.itemId, requirement.quality) >= requirement.quantity
  )

/** 优先从临时背包 + 主背包消耗，不足部分再从仓库箱子消耗（虚空原料箱优先） */
export const removeCombinedItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()

  const inventoryCount = inv.getTotalItemCount(itemId, quality)
  let warehouseTotal = 0
  const chestCounts: { id: string; count: number }[] = []
  if (wh.unlocked) {
    const voidInput = wh.getVoidInputChest()
    const ordered = voidInput ? [voidInput, ...wh.chests.filter(chest => chest.id !== voidInput.id)] : [...wh.chests]
    for (const chest of ordered) {
      const count = wh.getChestItemCount(chest.id, itemId, quality)
      if (count > 0) {
        chestCounts.push({ id: chest.id, count })
        warehouseTotal += count
      }
    }
  }

  if (inventoryCount + warehouseTotal < quantity) return false

  let remaining = quantity
  const fromInventory = Math.min(remaining, inventoryCount)
  if (fromInventory > 0) {
    inv.removeItemAnywhere(itemId, fromInventory, quality)
    remaining -= fromInventory
  }

  for (const chest of chestCounts) {
    if (remaining <= 0) break
    const take = Math.min(remaining, chest.count)
    wh.removeItemFromChest(chest.id, itemId, take, quality)
    remaining -= take
  }

  return true
}

export const removeCombinedItems = (requirements: CombinedItemRequirement[]): boolean => {
  const normalized = normalizeCombinedItemRequirements(requirements)
  if (!hasCombinedItems(normalized)) return false

  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const inventorySnapshot = inv.serialize()
  const warehouseSnapshot = wh.serialize()

  for (const requirement of normalized) {
    if (!removeCombinedItem(requirement.itemId, requirement.quantity, requirement.quality)) {
      inv.deserialize(inventorySnapshot)
      wh.deserialize(warehouseSnapshot)
      return false
    }
  }
  return true
}

/** 查找主背包 + 临时背包 + 仓库所有箱子中某物品的最低品质 */
export const getLowestCombinedQuality = (itemId: string): Quality => {
  const order: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  for (const quality of order) {
    if (getCombinedItemCount(itemId, quality) > 0) return quality
  }
  return 'normal'
}
