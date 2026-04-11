import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { DECORATIONS } from '@/data/decorations'
import { usePlayerStore } from './usePlayerStore'

/** 已购买的装饰实例 { decorId: count } */
export const useDecorationStore = defineStore('decoration', () => {
  const playerStore = usePlayerStore()

  /** 已购买数量 { decorId: count } */
  const owned = ref<Record<string, number>>({})

  /** 已放置数量 { decorId: count } */
  const placed = ref<Record<string, number>>({})

  /** 总美观度 */
  const beautyScore = computed(() => {
    let total = 0
    for (const [id, count] of Object.entries(placed.value)) {
      const def = DECORATIONS.find(d => d.id === id)
      if (def) total += def.beautyScore * count
    }
    return total
  })

  /** 美观度等级 0-4 */
  const beautyLevel = computed(() => {
    const score = beautyScore.value
    if (score >= 200) return 4
    if (score >= 100) return 3
    if (score >= 50) return 2
    if (score >= 20) return 1
    return 0
  })

  /** NPC每日好感加成（由 useNpcStore dailyUpdate 读取） */
  const dailyFriendshipBonus = computed(() => {
    if (beautyScore.value >= 50) return 1
    return 0
  })

  /** 商店折扣加成（百分比，如 5 = 5%） */
  const shopDiscountBonus = computed(() => {
    if (beautyScore.value >= 200) return 5
    return 0
  })

  /** 获取某装饰已放置数量 */
  const getPlacedCount = (id: string) => placed.value[id] ?? 0

  /** 获取某装饰已购买数量 */
  const getOwnedCount = (id: string) => owned.value[id] ?? 0

  /** 由其他系统直接授予装饰，不额外扣钱 */
  const grantDecoration = (id: string, count = 1): { success: boolean; message: string } => {
    const def = DECORATIONS.find(d => d.id === id)
    if (!def) return { success: false, message: '装饰不存在。' }
    const safeCount = Math.max(1, Math.floor(count))
    owned.value[id] = (owned.value[id] ?? 0) + safeCount
    return { success: true, message: `获得了${def.name}。` }
  }

  /** 购买装饰 */
  const buyDecoration = (id: string): { success: boolean; message: string } => {
    const def = DECORATIONS.find(d => d.id === id)
    if (!def) return { success: false, message: '装饰不存在。' }
    if (beautyScore.value < def.unlockBeauty) {
      return { success: false, message: `需要美观度达到 ${def.unlockBeauty} 才能购买。` }
    }
    if (!playerStore.spendMoney(def.price)) {
      return { success: false, message: '金钱不足。' }
    }
    owned.value[id] = (owned.value[id] ?? 0) + 1
    return { success: true, message: `购买了${def.name}。` }
  }

  /** 放置装饰 */
  const placeDecoration = (id: string): { success: boolean; message: string } => {
    const def = DECORATIONS.find(d => d.id === id)
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

  /** 收起装饰（放回仓库） */
  const removeDecoration = (id: string): { success: boolean; message: string } => {
    const def = DECORATIONS.find(d => d.id === id)
    if (!def) return { success: false, message: '装饰不存在。' }
    if (getPlacedCount(id) <= 0) return { success: false, message: '没有已放置的该装饰。' }
    placed.value[id] = getPlacedCount(id) - 1
    return { success: true, message: `收起了${def.name}。` }
  }

  const serialize = () => ({
    owned: owned.value,
    placed: placed.value
  })

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    if (!data) return
    owned.value = data.owned ?? {}
    placed.value = data.placed ?? {}
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
    grantDecoration,
    buyDecoration,
    placeDecoration,
    removeDecoration,
    serialize,
    deserialize
  }
})
