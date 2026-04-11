import { useInventoryStore } from '@/stores/useInventoryStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'
import type { Quality } from '@/types'

/** 合计背包 + 仓库所有箱子中某物品数量 */
export const getCombinedItemCount = (itemId: string, quality?: Quality): number => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  let total = inv.getItemCount(itemId, quality)
  if (wh.unlocked) {
    for (const chest of wh.chests) {
      total += wh.getChestItemCount(chest.id, itemId, quality)
    }
  }
  return total
}

/** 背包+仓库所有箱子是否合计拥有足够数量 */
export const hasCombinedItem = (itemId: string, quantity: number = 1): boolean => getCombinedItemCount(itemId) >= quantity

/** 优先从背包消耗，不足部分从仓库箱子消耗（虚空原料箱优先） */
export const removeCombinedItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()

  // 统计总数
  const invCount = inv.getItemCount(itemId, quality)
  let warehouseTotal = 0
  const chestCounts: { id: string; count: number }[] = []
  if (wh.unlocked) {
    // 虚空原料箱排在最前面优先消耗
    const voidInput = wh.getVoidInputChest()
    const ordered = voidInput ? [voidInput, ...wh.chests.filter(c => c.id !== voidInput.id)] : [...wh.chests]
    for (const chest of ordered) {
      const cnt = wh.getChestItemCount(chest.id, itemId, quality)
      if (cnt > 0) {
        chestCounts.push({ id: chest.id, count: cnt })
        warehouseTotal += cnt
      }
    }
  }

  if (invCount + warehouseTotal < quantity) return false

  let remaining = quantity
  // 先从背包消耗
  const fromInv = Math.min(remaining, invCount)
  if (fromInv > 0) {
    inv.removeItem(itemId, fromInv, quality)
    remaining -= fromInv
  }
  // 再从箱子消耗（虚空原料箱已排在前面）
  for (const cc of chestCounts) {
    if (remaining <= 0) break
    const take = Math.min(remaining, cc.count)
    wh.removeItemFromChest(cc.id, itemId, take, quality)
    remaining -= take
  }

  return true
}

/** 查找背包+仓库所有箱子中某物品的最低品质 */
export const getLowestCombinedQuality = (itemId: string): Quality => {
  const inv = useInventoryStore()
  const wh = useWarehouseStore()
  const order: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
  for (const q of order) {
    if (inv.getItemCount(itemId, q) > 0) return q
    if (wh.unlocked) {
      for (const chest of wh.chests) {
        if (wh.getChestItemCount(chest.id, itemId, q) > 0) return q
      }
    }
  }
  return 'normal'
}
