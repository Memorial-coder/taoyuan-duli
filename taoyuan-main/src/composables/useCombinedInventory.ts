import { useInventoryStore } from '@/stores/useInventoryStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import type { Quality } from '@/types'

/** 合计主背包 + 临时背包 + 仓库所有箱子中的某物品数量 */
export const getCombinedItemCount = (itemId: string, quality?: Quality): number => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  let total = inv.getTotalItemCount(itemId, quality)
  if (wh.unlocked) {
    for (const chest of wh.chests) {
      total += wh.getChestItemCount(chest.id, itemId, quality)
    }
  }
  return total
}

/** 主背包 + 临时背包 + 仓库所有箱子是否合计拥有足够数量 */
export const hasCombinedItem = (itemId: string, quantity: number = 1): boolean => getCombinedItemCount(itemId) >= quantity

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

/** 查找主背包 + 临时背包 + 仓库所有箱子中某物品的最低品质 */
export const getLowestCombinedQuality = (itemId: string): Quality => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const order: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  for (const quality of order) {
    if (inv.getTotalItemCount(itemId, quality) > 0) return quality
    if (wh.unlocked) {
      for (const chest of wh.chests) {
        if (wh.getChestItemCount(chest.id, itemId, quality) > 0) return quality
      }
    }
  }
  return 'normal'
}
