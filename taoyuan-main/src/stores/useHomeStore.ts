import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { FarmhouseLevel, CaveChoice, Quality } from '@/types'
import {
  FARMHOUSE_UPGRADES,
  CAVE_MUSHROOM_DAILY_CHANCE,
  CAVE_FRUIT_BAT_DAILY_CHANCE,
  GREENHOUSE_UNLOCK_COST,
  GREENHOUSE_MATERIAL_COST,
  CELLAR_AGING_DAYS,
  CELLAR_MAX_SLOTS
} from '@/data/buildings'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useFarmStore } from './useFarmStore'
import { useNpcStore } from './useNpcStore'
import { getCombinedItemCount, removeCombinedItem } from '@/composables/useCombinedInventory'

/** 酒窖陈酿槽 */
interface CellarSlot {
  itemId: string
  quality: Quality
  daysAging: number
}

type RemoveAgingResult =
  | { success: true; itemId: string; quality: Quality }
  | { success: false; reason: 'invalid_slot' | 'inventory_full' }

/** 品质升级顺序 */
const QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

/** 可陈酿的物品ID（酒类） */
const AGEABLE_ITEMS = ['watermelon_wine', 'osmanthus_wine', 'peach_wine', 'jujube_wine', 'corn_wine', 'rice_vinegar']

export const useHomeStore = defineStore('home', () => {
  const npcStore = useNpcStore()
  const farmhouseLevel = ref<FarmhouseLevel>(0)
  const caveChoice = ref<CaveChoice>('none')
  const caveUnlocked = ref(false)
  const greenhouseUnlocked = ref(false)
  const cellarSlots = ref<CellarSlot[]>([])

  const farmhouseName = computed(() => {
    const names: Record<FarmhouseLevel, string> = { 0: '茅屋', 1: '砖房', 2: '宅院', 3: '酒窖宅院' }
    return names[farmhouseLevel.value]
  })

  const nextUpgrade = computed(() => {
    const nextLevel = (farmhouseLevel.value + 1) as FarmhouseLevel
    return FARMHOUSE_UPGRADES.find(u => u.level === nextLevel) ?? null
  })

  const hasCellar = computed(() => farmhouseLevel.value >= 3)
  const companionHomeOverview = computed(() => {
    const relationshipSnapshot = npcStore.getRelationshipDebugSnapshot()
    const familyWishOverview = npcStore.getFamilyWishOverview()
    const activeFamilyWish = familyWishOverview.defs.find(def => def.id === familyWishOverview.state.activeWishId) ?? null
    return {
      farmhouseLevel: farmhouseLevel.value,
      hasCellar: hasCellar.value,
      greenhouseUnlocked: greenhouseUnlocked.value,
      activeFamilyWish,
      householdAssignments: relationshipSnapshot.householdAssignments,
      summary:
        activeFamilyWish?.id === 'wish_shared_breakfast'
          ? '当前家庭心愿更偏向宅院照料、厨房与生活化准备。'
          : relationshipSnapshot.householdAssignments.some(entry => entry.roleId === 'home_care')
            ? '已安排宅院照料分工，可优先处理温室、酒窖与日常家务事项。'
            : '当前宅院尚未承接明显的家庭经营压力，可按农舍升级与设施节奏推进。'
    }
  })

  /** 升级农舍 */
  const upgradeFarmhouse = (): boolean => {
    const playerStore = usePlayerStore()

    const upgrade = nextUpgrade.value
    if (!upgrade) return false

    // 检查材料
    for (const mat of upgrade.materialCost) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    if (!playerStore.spendMoney(upgrade.cost)) return false

    // 扣除材料
    for (const mat of upgrade.materialCost) {
      removeCombinedItem(mat.itemId, mat.quantity)
    }

    farmhouseLevel.value = upgrade.level
    return true
  }

  /** 解锁山洞 */
  const unlockCave = (): boolean => {
    if (caveUnlocked.value) return false
    caveUnlocked.value = true
    return true
  }

  /** 选择山洞类型 */
  const chooseCave = (choice: 'mushroom' | 'fruit_bat'): boolean => {
    if (!caveUnlocked.value) return false
    if (caveChoice.value !== 'none') return false
    caveChoice.value = choice
    return true
  }

  /** 山洞每日产出 */
  const dailyCaveUpdate = (): { itemId: string; quantity: number }[] => {
    if (caveChoice.value === 'none') return []
    const results: { itemId: string; quantity: number }[] = []

    if (caveChoice.value === 'mushroom') {
      if (Math.random() < CAVE_MUSHROOM_DAILY_CHANCE) {
        results.push({ itemId: 'wild_mushroom', quantity: 1 })
      }
    } else if (caveChoice.value === 'fruit_bat') {
      if (Math.random() < CAVE_FRUIT_BAT_DAILY_CHANCE) {
        const fruits = ['tree_peach', 'lychee', 'mandarin', 'plum_blossom']
        const pick = fruits[Math.floor(Math.random() * fruits.length)]!
        results.push({ itemId: pick, quantity: 1 })
      }
    }

    return results
  }

  /** 解锁温室 */
  const unlockGreenhouse = (): boolean => {
    const playerStore = usePlayerStore()

    if (greenhouseUnlocked.value) return false

    for (const mat of GREENHOUSE_MATERIAL_COST) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    if (!playerStore.spendMoney(GREENHOUSE_UNLOCK_COST)) return false

    for (const mat of GREENHOUSE_MATERIAL_COST) {
      removeCombinedItem(mat.itemId, mat.quantity)
    }

    greenhouseUnlocked.value = true
    // 初始化温室地块
    const farmStore = useFarmStore()
    farmStore.initGreenhouse()
    return true
  }

  /** 使用特许状直接解锁温室 */
  const unlockGreenhouseByPermit = (): boolean => {
    if (greenhouseUnlocked.value) return false
    greenhouseUnlocked.value = true
    const farmStore = useFarmStore()
    farmStore.initGreenhouse()
    return true
  }

  /** 酒窖放入陈酿 */
  const startAging = (itemId: string, quality: Quality): boolean => {
    if (!hasCellar.value) return false
    if (cellarSlots.value.length >= CELLAR_MAX_SLOTS) return false
    if (!AGEABLE_ITEMS.includes(itemId)) return false
    if (quality === 'supreme') return false

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem(itemId, 1, quality)) return false

    cellarSlots.value.push({ itemId, quality, daysAging: 0 })
    return true
  }

  /** 酒窖取出陈酿 */
  const removeAging = (index: number): RemoveAgingResult => {
    if (index < 0 || index >= cellarSlots.value.length) {
      return { success: false, reason: 'invalid_slot' }
    }

    const slot = cellarSlots.value[index]!
    const inventoryStore = useInventoryStore()

    if (!inventoryStore.canAddItem(slot.itemId, 1, slot.quality)) {
      return { success: false, reason: 'inventory_full' }
    }

    if (!inventoryStore.addItemExact(slot.itemId, 1, slot.quality)) {
      return { success: false, reason: 'inventory_full' }
    }

    cellarSlots.value.splice(index, 1)
    return { success: true, itemId: slot.itemId, quality: slot.quality }
  }

  /** 酒窖每日更新 */
  const dailyCellarUpdate = (): { ready: { itemId: string; newQuality: Quality }[] } => {
    const ready: { itemId: string; newQuality: Quality }[] = []

    for (const slot of cellarSlots.value) {
      slot.daysAging++
      if (slot.daysAging >= CELLAR_AGING_DAYS) {
        const currentIdx = QUALITY_ORDER.indexOf(slot.quality)
        if (currentIdx < QUALITY_ORDER.length - 1) {
          slot.quality = QUALITY_ORDER[currentIdx + 1]!
          slot.daysAging = 0
          ready.push({ itemId: slot.itemId, newQuality: slot.quality })
        }
      }
    }

    return { ready }
  }

  /** 获取厨房加成（Level 1+） */
  const getKitchenBonus = (): number => {
    return farmhouseLevel.value >= 1 ? 1.2 : 1.0
  }

  /** 获取睡眠恢复加成（Level 2+） */
  const getStaminaRecoveryBonus = (): number => {
    return farmhouseLevel.value >= 2 ? 0.1 : 0
  }

  const serialize = () => {
    return {
      farmhouseLevel: farmhouseLevel.value,
      caveChoice: caveChoice.value,
      caveUnlocked: caveUnlocked.value,
      greenhouseUnlocked: greenhouseUnlocked.value,
      cellarSlots: cellarSlots.value
    }
  }

  const resolveLegacyGreenhouseUnlocked = (data: any): boolean => {
    if (typeof data?.greenhouseUnlocked === 'boolean') return data.greenhouseUnlocked
    const farmStore = useFarmStore()
    return farmStore.greenhousePlots.length > 0 || farmStore.greenhouseLevel > 0
  }

  const deserialize = (data: any) => {
    farmhouseLevel.value = data.farmhouseLevel ?? 0
    caveChoice.value = data.caveChoice ?? 'none'
    caveUnlocked.value = data.caveUnlocked ?? false
    greenhouseUnlocked.value = resolveLegacyGreenhouseUnlocked(data)
    cellarSlots.value = data.cellarSlots ?? []
    // 加载后如果温室已解锁，确保温室地块初始化
    if (greenhouseUnlocked.value) {
      const farmStore = useFarmStore()
      farmStore.initGreenhouse()
    }
  }

  return {
    farmhouseLevel,
    caveChoice,
    caveUnlocked,
    greenhouseUnlocked,
    cellarSlots,
    farmhouseName,
    nextUpgrade,
    hasCellar,
    companionHomeOverview,
    upgradeFarmhouse,
    unlockCave,
    chooseCave,
    dailyCaveUpdate,
    unlockGreenhouse,
    unlockGreenhouseByPermit,
    startAging,
    removeAging,
    dailyCellarUpdate,
    getKitchenBonus,
    getStaminaRecoveryBonus,
    serialize,
    deserialize
  }
})
