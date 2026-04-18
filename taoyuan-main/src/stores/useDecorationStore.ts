import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DECORATIONS } from '@/data/decorations'
import type { DecorationDef } from '@/data/decorations'
import { usePlayerStore } from './usePlayerStore'

const decorationById = new Map<string, DecorationDef>(DECORATIONS.map(def => [def.id, def]))

export const useDecorationStore = defineStore('decoration', () => {
  const playerStore = usePlayerStore()

  const owned = ref<Record<string, number>>({})
  const placed = ref<Record<string, number>>({})

  const getDecorationDef = (id: string): DecorationDef | undefined => decorationById.get(id)
  const getPlacedCount = (id: string) => placed.value[id] ?? 0
  const getOwnedCount = (id: string) => owned.value[id] ?? 0

  const isCatalogDecoration = (id: string) => getDecorationDef(id)?.purchaseMode === 'catalog'

  const hasReachedMaxCount = (id: string) => {
    const def = getDecorationDef(id)
    return !!def && getOwnedCount(id) >= def.maxCount
  }

  const beautyScore = computed(() => {
    let total = 0
    for (const [id, count] of Object.entries(placed.value)) {
      const def = getDecorationDef(id)
      if (def) total += def.beautyScore * count
    }
    return total
  })

  const isUnlockedForDirectPurchase = (id: string) => {
    const def = getDecorationDef(id)
    if (!def || def.purchaseMode === 'catalog') return false
    return beautyScore.value >= def.unlockBeauty
  }

  const canBuyDecoration = (id: string) => {
    const def = getDecorationDef(id)
    if (!def || def.purchaseMode === 'catalog') return false
    if (!isUnlockedForDirectPurchase(id)) return false
    if (hasReachedMaxCount(id)) return false
    return playerStore.money >= def.price
  }

  const beautyLevel = computed(() => {
    const score = beautyScore.value
    if (score >= 200) return 4
    if (score >= 100) return 3
    if (score >= 50) return 2
    if (score >= 20) return 1
    return 0
  })

  const dailyFriendshipBonus = computed(() => (beautyScore.value >= 50 ? 1 : 0))
  const shopDiscountBonus = computed(() => (beautyScore.value >= 200 ? 5 : 0))

  const grantDecoration = (id: string, count = 1): { success: boolean; message: string } => {
    const def = getDecorationDef(id)
    if (!def) return { success: false, message: '装饰不存在。' }

    const safeCount = Math.max(1, Math.floor(count))
    const remainingCount = Math.max(0, def.maxCount - getOwnedCount(id))
    const grantedCount = Math.min(safeCount, remainingCount)

    if (grantedCount <= 0) {
      return { success: false, message: `${def.name}已达到拥有上限。` }
    }

    owned.value[id] = getOwnedCount(id) + grantedCount
    return {
      success: true,
      message: grantedCount > 1 ? `获得了${grantedCount}个${def.name}。` : `获得了${def.name}。`
    }
  }

  const buyDecoration = (id: string): { success: boolean; message: string } => {
    const def = getDecorationDef(id)
    if (!def) return { success: false, message: '装饰不存在。' }

    if (def.purchaseMode === 'catalog') {
      return { success: false, message: `${def.name}需要通过商店目录解锁。` }
    }

    if (beautyScore.value < def.unlockBeauty) {
      return { success: false, message: `需要美观度达到 ${def.unlockBeauty} 才能购买。` }
    }

    if (hasReachedMaxCount(id)) {
      return { success: false, message: `${def.name}最多只能购买${def.maxCount}个，再买将无法使用。` }
    }

    if (!playerStore.spendMoney(def.price)) {
      return { success: false, message: '金钱不足。' }
    }

    owned.value[id] = getOwnedCount(id) + 1
    return { success: true, message: `购买了${def.name}。` }
  }

  const placeDecoration = (id: string): { success: boolean; message: string } => {
    const def = getDecorationDef(id)
    if (!def) return { success: false, message: '装饰不存在。' }

    const currentOwned = getOwnedCount(id)
    const currentPlaced = getPlacedCount(id)

    if (currentOwned <= currentPlaced) {
      return { success: false, message: `没有可放置的${def.name}，请先购买。` }
    }

    if (currentPlaced >= def.maxCount) {
      return { success: false, message: `${def.name}最多放置${def.maxCount}个。` }
    }

    placed.value[id] = currentPlaced + 1
    return { success: true, message: `放置了${def.name}，美观度+${def.beautyScore}。` }
  }

  const removeDecoration = (id: string): { success: boolean; message: string } => {
    const def = getDecorationDef(id)
    if (!def) return { success: false, message: '装饰不存在。' }
    if (getPlacedCount(id) <= 0) return { success: false, message: '没有已放置的该装饰。' }
    placed.value[id] = getPlacedCount(id) - 1
    return { success: true, message: `收起了${def.name}。` }
  }

  const cloneDecorationCounts = (value?: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(value ?? {}).map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))])
    )

  const serialize = () => ({
    owned: cloneDecorationCounts(owned.value),
    placed: cloneDecorationCounts(placed.value)
  })

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    if (!data) return
    owned.value = cloneDecorationCounts(data.owned)
    placed.value = cloneDecorationCounts(data.placed)
  }

  return {
    owned,
    placed,
    beautyScore,
    beautyLevel,
    dailyFriendshipBonus,
    shopDiscountBonus,
    getPlacedCount,
    getOwnedCount,
    isCatalogDecoration,
    hasReachedMaxCount,
    isUnlockedForDirectPurchase,
    canBuyDecoration,
    grantDecoration,
    buyDecoration,
    placeDecoration,
    removeDecoration,
    serialize,
    deserialize
  }
})
