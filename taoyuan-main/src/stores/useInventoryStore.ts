import { calculateEffectiveMaxDurability, calculateEffectiveMaxSturdiness, repairEquipment, refurbishEquipment, getCurrentDurability, getCurrentSturdiness } from '@/composables/useDurability'
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ForgeAffixRoll, InventoryItem, InventoryPondFishMeta, Quality, Tool, ToolType, ToolTier, OwnedWeapon, OwnedRing, RingEffectType, OwnedHat, OwnedShoe } from '@/types'
import type { ForgeAffixEffectType, ForgeAffixTarget } from '@/data/forgeAffixes'
import type { RepairBenchEquipType, RepairBenchMode } from '@/utils/durability'

/** 装备方案 */
export interface EquipmentPreset {
  id: string
  name: string
  weaponDefId: string | null
  weaponEnchantmentId: string | null
  weaponAffixSignature?: string | null
  ringSlot1DefId: string | null
  ringSlot1EnchantmentId: string | null
  ringSlot1AffixSignature?: string | null
  ringSlot2DefId: string | null
  ringSlot2EnchantmentId: string | null
  ringSlot2AffixSignature?: string | null
  hatDefId: string | null
  hatEnchantmentId: string | null
  hatAffixSignature?: string | null
  shoeDefId: string | null
  shoeEnchantmentId: string | null
  shoeAffixSignature?: string | null
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
import { getToolEnchantmentById } from '@/data/toolEnchantments'
import { getEquipmentEnchantmentById, type EquipmentEnchantSlot } from '@/data/equipmentEnchantments'
import {
  getForgeAffixById,
  getForgeAffixEffectValue,
  getForgeAffixEquipmentEffects,
  getForgeAffixSignature,
  getLegacyAffixSignature,
  migrateLegacyEnchantmentToAffixes,
  rollForgeAffixes,
  sanitizeForgeAffixes
} from '@/data/forgeAffixes'
import { TRINKETS, getTrinketById, type TrinketDef } from '@/data/trinkets'
import { EQUIPMENT_SETS } from '@/data/equipmentSets'
import {
  EQUIPMENT_DURABILITY_BALANCE_VERSION,
  calculateLegacyMaxDurability,
  calculateLegacyMaxSturdiness,
  calculateRepairBenchModeCost,
  getAffixDurabilityBonus,
  getRepairBaseMaterial,
  getRepairQualityTier
} from '@/utils/durability'
import { usePlayerStore } from './usePlayerStore'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'
import { useNpcStore } from './useNpcStore'
import {
  INVENTORY_INITIAL_CAPACITY,
  INVENTORY_REGULAR_MAX_CAPACITY,
  INVENTORY_TEMP_CAPACITY,
  getNextInventoryCapacity
} from '@/utils/inventoryCapacity'

const INITIAL_CAPACITY = INVENTORY_INITIAL_CAPACITY
const MAX_CAPACITY = INVENTORY_REGULAR_MAX_CAPACITY
const MAX_STACK = 999
const TEMP_CAPACITY = INVENTORY_TEMP_CAPACITY
export const MAX_EQUIPMENT_PRESETS = 10
const INVENTORY_QUALITY_ORDER: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
const FIXED_NORMAL_QUALITY_ITEM_CATEGORIES = new Set(['ore', 'gem'])
type EquipmentLockTarget = 'weapon' | 'ring' | 'hat' | 'shoe'
type LockableEquipmentEntry = { locked?: boolean; durability?: number; sturdiness?: number }
type EnchantedEquipmentEntry = {
  defId: string
  enchantmentId?: string | null
  affixes?: ForgeAffixRoll[]
  durability?: number
  sturdiness?: number
  durabilityWearProgress?: number
  locked?: boolean
}
export type InventoryItemStackMeta = Pick<InventoryItem, 'origin' | 'purchaseDay' | 'purchaseUnitPrice' | 'pondFish'>
type InventoryAddEntry = { itemId: string; quantity: number; quality?: Quality } & InventoryItemStackMeta

export const normalizeInventoryItemQuality = (itemId: string, quality: Quality = 'normal'): Quality => {
  const def = getItemById(itemId)
  return def && FIXED_NORMAL_QUALITY_ITEM_CATEGORIES.has(def.category) ? 'normal' : quality
}

export const getInventoryQualitiesAtLeast = (minQuality: Quality = 'normal'): Quality[] => {
  const minIndex = INVENTORY_QUALITY_ORDER.indexOf(minQuality)
  return INVENTORY_QUALITY_ORDER.slice(Math.max(0, minIndex))
}

export const normalizeInventoryItemStackMeta = (source?: InventoryItemStackMeta | null): InventoryItemStackMeta => {
  if (!source) return {}
  const normalized: InventoryItemStackMeta = {}
  if (source.origin === 'shop') {
    const purchaseDay = typeof source.purchaseDay === 'string' ? source.purchaseDay : ''
    const purchaseUnitPrice = Math.max(0, Math.floor(Number(source.purchaseUnitPrice)))
    if (purchaseDay && Number.isFinite(purchaseUnitPrice)) {
      Object.assign(normalized, { origin: 'shop' as const, purchaseDay, purchaseUnitPrice })
    }
  }
  const pondFish = normalizeInventoryPondFishMeta(source.pondFish)
  if (pondFish) normalized.pondFish = pondFish
  return normalized
}

const clampInventoryNumber = (value: unknown, min: number, max: number): number => {
  const rounded = Math.round(Number(value))
  if (!Number.isFinite(rounded)) return min
  return Math.max(min, Math.min(max, rounded))
}

export const normalizeInventoryPondFishMeta = (source?: InventoryPondFishMeta | null): InventoryPondFishMeta | undefined => {
  if (!source || typeof source !== 'object') return undefined
  const instanceId = typeof source.instanceId === 'string' ? source.instanceId : ''
  const fishId = typeof source.fishId === 'string' ? source.fishId : ''
  if (!instanceId || !fishId) return undefined
  return {
    instanceId,
    fishId,
    name: typeof source.name === 'string' ? source.name : fishId,
    genetics: {
      weight: clampInventoryNumber(source.genetics?.weight, 0, 100),
      growthRate: clampInventoryNumber(source.genetics?.growthRate, 0, 100),
      diseaseRes: clampInventoryNumber(source.genetics?.diseaseRes, 0, 100),
      qualityGene: clampInventoryNumber(source.genetics?.qualityGene, 0, 100),
      mutationRate: clampInventoryNumber(source.genetics?.mutationRate, 1, 50)
    },
    daysInPond: Math.max(0, Math.floor(Number(source.daysInPond) || 0)),
    mature: source.mature === true,
    sick: source.sick === true,
    sickDays: Math.max(0, Math.floor(Number(source.sickDays) || 0)),
    breedId: typeof source.breedId === 'string' ? source.breedId : null
  }
}

const getInventoryPondFishStackKey = (source?: InventoryPondFishMeta | null): string => {
  const meta = normalizeInventoryPondFishMeta(source)
  return meta?.instanceId ?? ''
}

export const createInventoryItemSlot = (
  itemId: string,
  quantity: number,
  quality: Quality,
  meta?: InventoryItemStackMeta | null
): InventoryItem => {
  const slot: InventoryItem = { itemId, quantity, quality: normalizeInventoryItemQuality(itemId, quality) }
  const normalizedMeta = normalizeInventoryItemStackMeta(meta)
  if (normalizedMeta.pondFish?.fishId !== itemId) {
    delete normalizedMeta.pondFish
  }
  Object.assign(slot, normalizedMeta)
  return slot
}

export const cloneInventoryItemSlot = (slot: InventoryItem): InventoryItem => {
  const clone = createInventoryItemSlot(slot.itemId, slot.quantity, slot.quality, slot)
  if (slot.locked) clone.locked = true
  return clone
}

export const inventoryStacksMatch = (
  left: Pick<InventoryItem, 'itemId' | 'quality'> & InventoryItemStackMeta,
  right: Pick<InventoryItem, 'itemId' | 'quality'> & InventoryItemStackMeta
): boolean => {
  const leftMeta = normalizeInventoryItemStackMeta(left)
  const rightMeta = normalizeInventoryItemStackMeta(right)
  return (
    left.itemId === right.itemId &&
    left.quality === right.quality &&
    (leftMeta.origin ?? '') === (rightMeta.origin ?? '') &&
    (leftMeta.purchaseDay ?? '') === (rightMeta.purchaseDay ?? '') &&
    (leftMeta.purchaseUnitPrice ?? -1) === (rightMeta.purchaseUnitPrice ?? -1) &&
    getInventoryPondFishStackKey(leftMeta.pondFish) === getInventoryPondFishStackKey(rightMeta.pondFish)
  )
}

export type VisibleInventoryItemStack = Pick<InventoryItem, 'itemId' | 'quality' | 'quantity'> & { locked: boolean }

export const getVisibleInventoryItemKey = (item: Pick<InventoryItem, 'itemId' | 'quality'>): string => `${item.itemId}:${item.quality}`

export const mergeVisibleInventoryItems = (sourceItems: InventoryItem[]): VisibleInventoryItemStack[] => {
  const merged = new Map<string, VisibleInventoryItemStack>()
  for (const item of sourceItems) {
    const key = getVisibleInventoryItemKey(item)
    const existing = merged.get(key)
    if (existing) {
      existing.quantity += item.quantity
      existing.locked = existing.locked || !!item.locked
    } else {
      merged.set(key, {
        itemId: item.itemId,
        quality: item.quality,
        quantity: item.quantity,
        locked: !!item.locked
      })
    }
  }
  return [...merged.values()]
}

export const useInventoryStore = defineStore('inventory', () => {
  const playerStore = usePlayerStore()
  const items = ref<InventoryItem[]>([])
  const visibleItems = computed(() => mergeVisibleInventoryItems(items.value))
  const npcCustomEquipUnlocked = computed(() => useNpcStore().isNpcFunctionEffectUnlocked('custom_equip'))
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
  const ownedWeapons = ref<OwnedWeapon[]>([{ defId: 'wooden_stick', enchantmentId: null, affixes: [] }])
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

  const clearActivePreset = () => {
    activePresetId.value = null
  }

  /** 正在升级中的工具（2天等待期） */
  const pendingUpgrade = ref<{ toolType: ToolType; targetTier: ToolTier; daysRemaining: number } | null>(null)
  const TOOL_TIER_ORDER: ToolTier[] = ['basic', 'iron', 'steel', 'iridium']
  const TOOL_TYPES: ToolType[] = ['wateringCan', 'hoe', 'pickaxe', 'fishingRod', 'scythe', 'axe', 'pan']
  const IRON_TOOL_TYPES: ToolType[] = ['wateringCan', 'hoe', 'pickaxe', 'fishingRod', 'scythe', 'axe', 'pan']

  const isFull = computed(() => items.value.length >= capacity.value)

  /** 临时背包（溢出缓冲区） */
  const tempItems = ref<InventoryItem[]>([])
  const isTempFull = computed(() => tempItems.value.length >= TEMP_CAPACITY)
  /** 主背包+临时背包均满 */
  const isAllFull = computed(() => isFull.value && isTempFull.value)

  /** 获取当前装备的武器 */
  const getEquippedWeapon = (): OwnedWeapon => {
    return ownedWeapons.value[equippedWeaponIndex.value] ?? { defId: 'wooden_stick', enchantmentId: null, affixes: [] }
  }

  const findLastMatchingIndex = <T>(arr: T[], predicate: (value: T) => boolean): number => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i]!)) return i
    }
    return -1
  }

  type InventorySnapshotSlot = InventoryItem

  const cloneInventorySlots = (source: InventoryItem[]): InventorySnapshotSlot[] =>
    source.map(slot => cloneInventoryItemSlot(slot))

  const cloneForgeAffixes = (affixes?: ForgeAffixRoll[] | null): ForgeAffixRoll[] =>
    (affixes ?? []).map(affix => ({ ...affix }))
  const cloneTools = (source: Tool[]) => source.map(tool => ({ ...tool, affixes: cloneForgeAffixes(tool.affixes) }))
  const cloneOwnedWeapons = (source: OwnedWeapon[]) => source.map(weapon => ({ ...weapon, affixes: cloneForgeAffixes(weapon.affixes) }))
  const cloneOwnedRings = (source: OwnedRing[]) => source.map(ring => ({ ...ring, affixes: cloneForgeAffixes(ring.affixes) }))
  const cloneOwnedHats = (source: OwnedHat[]) => source.map(hat => ({ ...hat, affixes: cloneForgeAffixes(hat.affixes) }))
  const cloneOwnedShoes = (source: OwnedShoe[]) => source.map(shoe => ({ ...shoe, affixes: cloneForgeAffixes(shoe.affixes) }))
  const cloneEquipmentPresets = (source: EquipmentPreset[]) => source.map(preset => ({ ...preset }))
  const readLockedFlag = (entry: { locked?: unknown }): boolean | undefined => entry.locked === true ? true : undefined
  const readNumericField = (value: unknown): number | undefined => {
    const normalized = Math.floor(Number(value))
    return Number.isFinite(normalized) ? Math.max(0, normalized) : undefined
  }
  const readDurabilityWearProgress = (entry: { durabilityWearProgress?: unknown }): number | undefined => {
    const value = Number(entry.durabilityWearProgress)
    if (!Number.isFinite(value) || value <= 0) return undefined
    return value % 1
  }
  const pushEquipmentMigrationLog = (message: string) => {
    equipmentMigrationLogs.value.push(message)
  }
  const EQUIPMENT_SLOT_FORGE_TARGET: Record<EquipmentEnchantSlot, ForgeAffixTarget> = {
    ring: 'ring',
    hat: 'hat',
    shoe: 'shoe'
  }
  const hasDuplicateAffixIds = (affixes: ForgeAffixRoll[]) => new Set(affixes.map(affix => affix.id)).size !== affixes.length
  const validateForgeAffixesForTarget = (target: ForgeAffixTarget, affixes: ForgeAffixRoll[]): boolean =>
    !hasDuplicateAffixIds(affixes) && affixes.every(affix => getForgeAffixById(affix.id)?.target === target)
  const normalizeForgeAffixesForTarget = (
    target: ForgeAffixTarget,
    affixes?: unknown,
    legacyEnchantmentId?: string | null
  ): ForgeAffixRoll[] => sanitizeForgeAffixes(target, affixes ?? [], legacyEnchantmentId)
  const getEntryAffixSignature = (
    target: ForgeAffixTarget,
    entry?: { affixes?: ForgeAffixRoll[] | null; enchantmentId?: string | null } | null
  ): string | null => getForgeAffixSignature(entry?.affixes) ?? getLegacyAffixSignature(target, entry?.enchantmentId ?? null)
  const normalizePresetAffixSignature = (
    target: ForgeAffixTarget,
    rawSignature: unknown,
    rawEnchantmentId: unknown
  ): string | null => {
    if (typeof rawSignature === 'string' && rawSignature.length > 0) return rawSignature
    return getLegacyAffixSignature(target, typeof rawEnchantmentId === 'string' ? rawEnchantmentId : null)
  }
  const clampEquipmentValue = (value: number | undefined, max: number): number =>
    Math.max(0, Math.min(value ?? max, max))
  const shouldMigrateDurabilityBalance = (version: unknown): boolean =>
    Math.floor(Number(version) || 0) < EQUIPMENT_DURABILITY_BALANCE_VERSION
  const migrateEquipmentValueToNewMax = (
    value: number | undefined,
    oldMax: number,
    newMax: number,
    shouldMigrate: boolean
  ): number => {
    if (value == null) return newMax
    if (!shouldMigrate) return clampEquipmentValue(value, newMax)
    const safeOldMax = Math.max(1, Math.floor(oldMax))
    const safeNewMax = Math.max(1, Math.floor(newMax))
    const ratio = Math.max(0, Math.min(1, value / safeOldMax))
    return Math.max(0, Math.min(safeNewMax, Math.ceil(safeNewMax * ratio)))
  }
  const normalizeEquipmentEnchantmentId = (slot: EquipmentEnchantSlot, rawEnchantmentId: unknown, label: string): string | null => {
    if (typeof rawEnchantmentId !== 'string' || rawEnchantmentId.length <= 0) return null
    const enchantment = getEquipmentEnchantmentById(rawEnchantmentId)
    if (!enchantment || enchantment.slot !== slot) {
      pushEquipmentMigrationLog(`清空${label}的无效装备附魔：${rawEnchantmentId}。`)
      return null
    }
    return rawEnchantmentId
  }

  const setEquipmentAffixes = (
    slot: EquipmentEnchantSlot,
    index: number,
    affixes: ForgeAffixRoll[]
  ): { success: boolean; message: string } => {
    const sources: Record<EquipmentEnchantSlot, EnchantedEquipmentEntry[]> = {
      ring: ownedRings.value,
      hat: ownedHats.value,
      shoe: ownedShoes.value
    }
    const entry = sources[slot][index]
    if (!entry) return { success: false, message: '无效索引。' }
    if (entry.locked) return { success: false, message: '这件装备已锁定，先解锁才能附魔。' }
    const target = EQUIPMENT_SLOT_FORGE_TARGET[slot]
    const normalizedAffixes = normalizeForgeAffixesForTarget(target, affixes)
    if (normalizedAffixes.length !== affixes.length || !validateForgeAffixesForTarget(target, normalizedAffixes)) return { success: false, message: '无效装备词条。' }
    entry.affixes = cloneForgeAffixes(normalizedAffixes)
    entry.enchantmentId = null
    clearActivePreset()
    return { success: true, message: '装备词条已更新。' }
  }

  const setEquipmentEnchantment = (
    slot: EquipmentEnchantSlot,
    index: number,
    enchantmentId: string | null
  ): { success: boolean; message: string } => {
    if (enchantmentId) {
      const enchantment = getEquipmentEnchantmentById(enchantmentId)
      if (!enchantment || enchantment.slot !== slot) return { success: false, message: '无效装备附魔。' }
    }
    return setEquipmentAffixes(slot, index, migrateLegacyEnchantmentToAffixes(EQUIPMENT_SLOT_FORGE_TARGET[slot], enchantmentId))
  }

  const setRingEnchantment = (index: number, enchantmentId: string | null): { success: boolean; message: string } =>
    setEquipmentEnchantment('ring', index, enchantmentId)
  const setHatEnchantment = (index: number, enchantmentId: string | null): { success: boolean; message: string } =>
    setEquipmentEnchantment('hat', index, enchantmentId)
  const setShoeEnchantment = (index: number, enchantmentId: string | null): { success: boolean; message: string } =>
    setEquipmentEnchantment('shoe', index, enchantmentId)
  const setRingAffixes = (index: number, affixes: ForgeAffixRoll[]): { success: boolean; message: string } =>
    setEquipmentAffixes('ring', index, affixes)
  const setHatAffixes = (index: number, affixes: ForgeAffixRoll[]): { success: boolean; message: string } =>
    setEquipmentAffixes('hat', index, affixes)
  const setShoeAffixes = (index: number, affixes: ForgeAffixRoll[]): { success: boolean; message: string } =>
    setEquipmentAffixes('shoe', index, affixes)

  const addMatchingEquipmentEffects = (
    total: number,
    effects: { type: RingEffectType; value: number }[] | undefined,
    effectType: RingEffectType
  ): number => {
    if (!effects) return total
    for (const eff of effects) {
      if (eff.type === effectType) total += eff.value
    }
    return total
  }
  const ensureDefaultWeapon = (): number => {
    const existingIndex = ownedWeapons.value.findIndex(weapon => weapon.defId === 'wooden_stick' && !getEntryAffixSignature('weapon', weapon))
    if (existingIndex >= 0) return existingIndex
    ownedWeapons.value.unshift({ defId: 'wooden_stick', enchantmentId: null, affixes: [] })
    if (equippedWeaponIndex.value >= 0) equippedWeaponIndex.value += 1
    return 0
  }
  const equipFallbackWeapon = () => {
    const woodenStickIndex = ownedWeapons.value.findIndex(weapon => weapon.defId === 'wooden_stick' && !getEntryAffixSignature('weapon', weapon))
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
        case 'quarry_mine':
          return (
            playerStore.hasLifestyleDiscovery('lifestyleUnlocks', 'trinket_quarry_mine') ||
            playerStore.hasLifestyleDiscovery('masteryUnlocks', 'mastery_combat')
          )
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
    entries: (InventoryAddEntry & { quality: Quality })[],
    includeTemp: boolean
  ): boolean => {
    const fillExistingStacks = (slots: InventorySnapshotSlot[], entry: InventoryAddEntry & { quality: Quality }, remaining: number): number => {
      for (const slot of slots) {
        if (remaining <= 0) break
        if (inventoryStacksMatch(slot, entry) && slot.quantity < MAX_STACK) {
          const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
          slot.quantity += canAdd
          remaining -= canAdd
        }
      }
      return remaining
    }

    const createNewStacks = (slots: InventorySnapshotSlot[], slotCapacity: number, entry: InventoryAddEntry & { quality: Quality }, remaining: number): number => {
      while (remaining > 0 && slots.length < slotCapacity) {
        const batch = Math.min(remaining, MAX_STACK)
        slots.push(createInventoryItemSlot(entry.itemId, batch, entry.quality, entry))
        remaining -= batch
      }
      return remaining
    }

    for (const entry of entries) {
      if (!getItemById(entry.itemId)) return false

      let remaining = entry.quantity
      remaining = fillExistingStacks(mainSlots, entry, remaining)
      remaining = createNewStacks(mainSlots, mainCapacity, entry, remaining)

      if (includeTemp && remaining > 0) {
        remaining = fillExistingStacks(tempSlots, entry, remaining)
        remaining = createNewStacks(tempSlots, tempCapacity, entry, remaining)
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
    return def.attack + getForgeAffixEffectValue(owned.affixes, 'attack_bonus')
  }

  /** 获取武器暴击率（含附魔加成） */
  const getWeaponCritRate = (): number => {
    const owned = getEquippedWeapon()
    const def = getWeaponById(owned.defId)
    if (!def) return 0.02
    return def.critRate + getForgeAffixEffectValue(owned.affixes, 'crit_rate_bonus')
  }

  const getEquippedWeaponAffixes = (): ForgeAffixRoll[] => cloneForgeAffixes(getEquippedWeapon().affixes)

  const getWeaponAffixEffectValue = (effectType: ForgeAffixEffectType): number => {
    return getForgeAffixEffectValue(getEquippedWeapon().affixes, effectType)
  }



  /** 获取当前装备武器的最大耐久（含词条/附魔/NPC加成） */

  const getWeaponMaxDurability = (): number => {

    const owned = getEquippedWeapon()

    const def = getWeaponById(owned.defId)

    if (!def) return 100

    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []

    return calculateEffectiveMaxDurability(

      def.qualityTier,

      def.shopMaterials?.length ? def.shopMaterials : null,

      def.shopPrice ?? 0,

      owned.affixes,

      owned.enchantmentId,

      npcUnlocked

    )

  }



  /** 获取指定戒指的最大耐久（含词条/附魔/NPC加成） */

  const getRingMaxDurability = (index: number): number => {

    const ring = index >= 0 ? ownedRings.value[index] : null

    if (!ring) return 100

    const def = getRingById(ring.defId)

    if (!def) return 100

    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []

    return calculateEffectiveMaxDurability(

      def.qualityTier,

      def.recipe ?? null,

      def.recipeMoney ?? 0,

      ring.affixes,

      ring.enchantmentId,

      npcUnlocked

    )

  }



  /** 获取指定帽子的最大耐久 */

  const getHatMaxDurability = (index?: number): number => {

    const idx = index ?? equippedHatIndex.value

    const hat = idx >= 0 ? ownedHats.value[idx] : null

    if (!hat) return 100

    const def = getHatById(hat.defId)

    if (!def) return 100

    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []

    return calculateEffectiveMaxDurability(

      def.qualityTier,

      def.recipe ?? null,

      def.recipeMoney ?? 0,

      hat.affixes,

      hat.enchantmentId,

      npcUnlocked

    )

  }



  /** 获取指定鞋子的最大耐久 */

  const getShoeMaxDurability = (index?: number): number => {

    const idx = index ?? equippedShoeIndex.value

    const shoe = idx >= 0 ? ownedShoes.value[idx] : null

    if (!shoe) return 100

    const def = getShoeById(shoe.defId)

    if (!def) return 100

    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []

    return calculateEffectiveMaxDurability(

      def.qualityTier,

      def.recipe ?? null,

      def.recipeMoney ?? 0,

      shoe.affixes,

      shoe.enchantmentId,

      npcUnlocked

    )

  }

  const getOwnedEquipmentContext = (equipType: RepairBenchEquipType, index: number) => {
    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []
    if (equipType === 'weapon') {
      const entry = ownedWeapons.value[index]
      if (!entry) return null
      const def = getWeaponById(entry.defId)
      if (!def) return null
      const recipe = def.shopMaterials?.length ? def.shopMaterials : null
      const recipeMoney = def.shopPrice ?? 0
      const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, recipe, recipeMoney, entry.affixes, entry.enchantmentId, npcUnlocked)
      const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, recipe, recipeMoney, entry.affixes, entry.enchantmentId)
      return { entry, defId: entry.defId, recipe, recipeMoney, maxDurability, maxSturdiness }
    }
    if (equipType === 'ring') {
      const entry = ownedRings.value[index]
      if (!entry) return null
      const def = getRingById(entry.defId)
      if (!def) return null
      const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId, npcUnlocked)
      const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId)
      return { entry, defId: entry.defId, recipe: def.recipe ?? null, recipeMoney: def.recipeMoney ?? 0, maxDurability, maxSturdiness }
    }
    if (equipType === 'hat') {
      const entry = ownedHats.value[index]
      if (!entry) return null
      const def = getHatById(entry.defId)
      if (!def) return null
      const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId, npcUnlocked)
      const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId)
      return { entry, defId: entry.defId, recipe: def.recipe ?? null, recipeMoney: def.recipeMoney ?? 0, maxDurability, maxSturdiness }
    }
    const entry = ownedShoes.value[index]
    if (!entry) return null
    const def = getShoeById(entry.defId)
    if (!def) return null
    const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId, npcUnlocked)
    const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, entry.affixes, entry.enchantmentId)
    return { entry, defId: entry.defId, recipe: def.recipe ?? null, recipeMoney: def.recipeMoney ?? 0, maxDurability, maxSturdiness }
  }

  const isEquipmentBroken = (equipType: RepairBenchEquipType, index: number): boolean => {
    const context = getOwnedEquipmentContext(equipType, index)
    return !!context && getCurrentDurability(context.entry, context.maxDurability) <= 0
  }

  const isEquipmentUsableForPreset = (equipType: RepairBenchEquipType, index: number): boolean =>
    !isEquipmentBroken(equipType, index)

  /** 通过类型和索引修复装备（修理台使用） */
  const repairOwnedEquipment = (equipType: string, index: number, mode: RepairBenchMode = 'fine'): boolean => {
    if (!['weapon', 'ring', 'hat', 'shoe'].includes(equipType)) return false
    const type = equipType as RepairBenchEquipType
    if (mode === 'dismantle') {
      const result = dismantleOwnedEquipment(type, index)
      return result.success
    }
    const context = getOwnedEquipmentContext(type, index)
    if (!context) return false
    const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []
    const durability = { current: getCurrentDurability(context.entry, context.maxDurability), max: context.maxDurability }
    const sturdiness = { current: getCurrentSturdiness(context.entry, context.maxSturdiness), max: context.maxSturdiness }
    const preview = calculateRepairBenchModeCost(type, context.defId, npcUnlocked, durability, sturdiness, mode)
    if (!preview.canRepair) return false
    if (mode === 'refurbish') {
      refurbishEquipment(context.entry, context.maxDurability, context.maxSturdiness, preview.restoredSturdiness)
    } else {
      repairEquipment(context.entry, context.maxDurability, preview.sturdinessLoss, context.maxSturdiness)
    }
    clearActivePreset()
    return true
  }

  /** 获取装备当前耐久（修理台列表用） */
  const getOwnedEquipmentDurability = (equipType: string, index: number): { current: number; max: number } | null => {
    if (!['weapon', 'ring', 'hat', 'shoe'].includes(equipType)) return null
    const context = getOwnedEquipmentContext(equipType as RepairBenchEquipType, index)
    if (!context) return null
    return { current: getCurrentDurability(context.entry, context.maxDurability), max: context.maxDurability }
  }

  const getOwnedEquipmentSturdiness = (equipType: string, index: number): { current: number; max: number } | null => {
    if (!['weapon', 'ring', 'hat', 'shoe'].includes(equipType)) return null
    const context = getOwnedEquipmentContext(equipType as RepairBenchEquipType, index)
    if (!context) return null
    return { current: getCurrentSturdiness(context.entry, context.maxSturdiness), max: context.maxSturdiness }
  }

  const getDismantleReturnQuantity = (equipType: RepairBenchEquipType, defId: string): number => {
    const tier = getRepairQualityTier(equipType, defId) ?? 'common'
    const tierQuantity: Record<string, number> = { common: 1, fine: 1, excellent: 2, supreme: 3 }
    return tierQuantity[tier] ?? 1
  }

  const dismantleOwnedEquipment = (equipType: string, index: number): { success: boolean; message: string; itemId?: string; quantity?: number } => {
    if (!['weapon', 'ring', 'hat', 'shoe'].includes(equipType)) return { success: false, message: '无效装备类型。' }
    const type = equipType as RepairBenchEquipType
    const context = getOwnedEquipmentContext(type, index)
    if (!context) return { success: false, message: '找不到这件装备。' }
    const sturdiness = getCurrentSturdiness(context.entry, context.maxSturdiness)
    if (sturdiness > 0) return { success: false, message: '坚固值未耗尽，不能拆解。' }
    if (type === 'weapon' && ownedWeapons.value.length <= 1) return { success: false, message: '至少保留一把武器。' }

    const baseMaterial = getRepairBaseMaterial(type)
    const quantity = Math.max(1, getDismantleReturnQuantity(type, context.defId))
    const materialName = getItemById(baseMaterial.itemId)?.name ?? baseMaterial.itemId
    if (!canAddItem(baseMaterial.itemId, quantity)) {
      return { success: false, message: `背包空间不足，无法返还${materialName}×${quantity}。` }
    }
    const addReturn = () => addItem(baseMaterial.itemId, quantity)

    clearActivePreset()
    if (type === 'weapon') {
      if (equippedWeaponIndex.value === index) equippedWeaponIndex.value = 0
      ownedWeapons.value.splice(index, 1)
      if (equippedWeaponIndex.value > index) equippedWeaponIndex.value--
      if (equippedWeaponIndex.value >= ownedWeapons.value.length) equippedWeaponIndex.value = Math.max(0, ownedWeapons.value.length - 1)
    } else if (type === 'ring') {
      if (equippedRingSlot1.value === index) equippedRingSlot1.value = -1
      if (equippedRingSlot2.value === index) equippedRingSlot2.value = -1
      ownedRings.value.splice(index, 1)
      if (equippedRingSlot1.value > index) equippedRingSlot1.value--
      if (equippedRingSlot2.value > index) equippedRingSlot2.value--
    } else if (type === 'hat') {
      if (equippedHatIndex.value === index) equippedHatIndex.value = -1
      ownedHats.value.splice(index, 1)
      if (equippedHatIndex.value > index) equippedHatIndex.value--
    } else {
      if (equippedShoeIndex.value === index) equippedShoeIndex.value = -1
      ownedShoes.value.splice(index, 1)
      if (equippedShoeIndex.value > index) equippedShoeIndex.value--
    }
    addReturn()
    return { success: true, message: `拆解完成，返还${materialName}×${quantity}。`, itemId: baseMaterial.itemId, quantity }
  }

  const repairLowestDurabilityEquipment = (
    allowedTypes: string[] = ['weapon', 'ring', 'hat', 'shoe'],
    isRepairBlocked?: (type: RepairBenchEquipType, index: number) => boolean
  ): string | null => {
    const candidates: { type: RepairBenchEquipType; index: number; current: number; max: number; name: string }[] = []
    const pushCandidate = (type: string, index: number, defId: string) => {
      if (!allowedTypes.includes(type) || !['weapon', 'ring', 'hat', 'shoe'].includes(type)) return
      const repairType = type as RepairBenchEquipType
      if (isRepairBlocked?.(repairType, index)) return
      const durability = getOwnedEquipmentDurability(type, index)
      const sturdiness = getOwnedEquipmentSturdiness(type, index)
      if (!durability || durability.current >= durability.max) return
      if (!sturdiness) return
      const npcUnlocked = useNpcStore().isNpcFunctionEffectUnlocked('equip_durability') ? ['equip_durability'] : []
      const preview = calculateRepairBenchModeCost(repairType, defId, npcUnlocked, durability, sturdiness, 'fine')
      if (!preview.canRepair) return
      candidates.push({ type: repairType, index, current: durability.current, max: durability.max, name: defId })
    }
    ownedWeapons.value.forEach((entry, index) => pushCandidate('weapon', index, entry.defId))
    ownedRings.value.forEach((entry, index) => pushCandidate('ring', index, entry.defId))
    ownedHats.value.forEach((entry, index) => pushCandidate('hat', index, entry.defId))
    ownedShoes.value.forEach((entry, index) => pushCandidate('shoe', index, entry.defId))
    candidates.sort((a, b) => (a.current / Math.max(1, a.max)) - (b.current / Math.max(1, b.max)))
    const target = candidates[0]
    if (target && isRepairBlocked?.(target.type, target.index)) return null
    if (!target || !repairOwnedEquipment(target.type, target.index)) return null
    return target.name
  }

  /** 添加武器到收藏 */
  const addWeapon = (defId: string, enchantmentId: string | null = null, affixes?: ForgeAffixRoll[] | null): boolean => {
    const normalizedAffixes = normalizeForgeAffixesForTarget('weapon', affixes, enchantmentId)
    ownedWeapons.value.push({ defId, enchantmentId: null, affixes: normalizedAffixes })
    useAchievementStore().discoverItem(defId)
    return true
  }

  const setWeaponAffixes = (index: number, affixes: ForgeAffixRoll[]): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedWeapons.value.length) return { success: false, message: '无效索引。' }
    const weapon = ownedWeapons.value[index]!
    if (weapon.locked) return { success: false, message: '这件装备已锁定，先解锁才能铸魔。' }
    const normalizedAffixes = normalizeForgeAffixesForTarget('weapon', affixes)
    if (normalizedAffixes.length !== affixes.length || !validateForgeAffixesForTarget('weapon', normalizedAffixes)) return { success: false, message: '无效武器词条。' }
    weapon.affixes = cloneForgeAffixes(normalizedAffixes)
    weapon.enchantmentId = null
    clearActivePreset()
    return { success: true, message: '武器词条已更新。' }
  }

  /** 设置武器附魔（工坊铸魔 / 重铸使用） */
  const setWeaponEnchantment = (index: number, enchantmentId: string | null): { success: boolean; message: string } => {
    if (enchantmentId && !getEnchantmentById(enchantmentId)) return { success: false, message: '无效附魔。' }
    return setWeaponAffixes(index, migrateLegacyEnchantmentToAffixes('weapon', enchantmentId))
  }

  /** 检查是否已拥有某武器（不含附魔区分） */
  const hasWeapon = (defId: string): boolean => {
    return ownedWeapons.value.some(w => w.defId === defId)
  }

  /** 装备武器（按索引） */
  const equipWeapon = (index: number): boolean => {
    if (index < 0 || index >= ownedWeapons.value.length) return false
    if (isEquipmentBroken('weapon', index)) return false
    if (equippedWeaponIndex.value !== index) clearActivePreset()
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
    const price = getWeaponSellPrice(weapon.defId, weapon.enchantmentId, weapon.affixes)
    const playerStore = usePlayerStore()
    playerStore.earnMoney(price)
    clearActivePreset()
    ownedWeapons.value.splice(index, 1)
    // 修正装备索引
    if (equippedWeaponIndex.value > index) {
      equippedWeaponIndex.value--
    }
    const def = getWeaponById(weapon.defId)
    return { success: true, message: `卖出了${def?.name ?? '武器'}，获得${price}文。` }
  }

  /** 移除武器收藏中的一把（用于回滚战利品） */
  const removeWeapon = (defId: string, enchantmentId: string | null = null, affixes?: ForgeAffixRoll[] | null): boolean => {
    const targetSignature = getForgeAffixSignature(affixes) ?? getLegacyAffixSignature('weapon', enchantmentId)
    const index = findLastMatchingIndex(ownedWeapons.value, w => {
      if (w.defId !== defId) return false
      if (targetSignature) return getEntryAffixSignature('weapon', w) === targetSignature
      return !getEntryAffixSignature('weapon', w)
    })
    if (index < 0) return false
    if (ownedWeapons.value.length <= 1) return false
    clearActivePreset()
    ownedWeapons.value.splice(index, 1)
    if (equippedWeaponIndex.value === index) {
      equippedWeaponIndex.value = 0
    } else if (equippedWeaponIndex.value > index) {
      equippedWeaponIndex.value--
    }
    return true
  }

  /** 添加物品到背包 */
  const addItem = (itemId: string, quantity: number = 1, quality: Quality = 'normal', meta?: InventoryItemStackMeta | null): boolean => {
    // 校验物品是否存在
    if (!getItemById(itemId)) return false
    // 自动注册到图鉴
    useAchievementStore().discoverItem(itemId)
    const entry = createInventoryItemSlot(itemId, quantity, quality, meta)
    let remaining = quantity

    // 先填充已有的同类栈
    for (const slot of items.value) {
      if (remaining <= 0) break
      if (inventoryStacksMatch(slot, entry) && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    // 剩余部分创建新栈
    while (remaining > 0 && !isFull.value) {
      const batch = Math.min(remaining, MAX_STACK)
      items.value.push(createInventoryItemSlot(itemId, batch, quality, entry))
      remaining -= batch
    }

    // 溢出到临时背包
    if (remaining > 0) {
      for (const slot of tempItems.value) {
        if (remaining <= 0) break
        if (inventoryStacksMatch(slot, entry) && slot.quantity < MAX_STACK) {
          const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
          slot.quantity += canAdd
          remaining -= canAdd
        }
      }
      while (remaining > 0 && !isTempFull.value) {
        const batch = Math.min(remaining, MAX_STACK)
        tempItems.value.push(createInventoryItemSlot(itemId, batch, quality, entry))
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
  const canAddItem = (
    itemId: string,
    quantity: number = 1,
    quality: Quality = 'normal',
    includeTemp: boolean = true,
    meta?: InventoryItemStackMeta | null
  ): boolean => {
    return simulateAddToSlots(
      cloneInventorySlots(items.value),
      capacity.value,
      cloneInventorySlots(tempItems.value),
      TEMP_CAPACITY,
      [{ itemId, quantity, quality: normalizeInventoryItemQuality(itemId, quality), ...normalizeInventoryItemStackMeta(meta) }],
      includeTemp
    )
  }

  /** 检查一组物品是否可以完整放入背包（默认允许进入临时背包） */
  const canAddItems = (
    entries: InventoryAddEntry[],
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
        quality: normalizeInventoryItemQuality(entry.itemId, entry.quality ?? 'normal'),
        ...normalizeInventoryItemStackMeta(entry)
      })),
      includeTemp
    )
  }

  /** 仅在能够完整放入时才添加物品，避免部分入包 */
  const addItemExact = (
    itemId: string,
    quantity: number = 1,
    quality: Quality = 'normal',
    includeTemp: boolean = true,
    meta?: InventoryItemStackMeta | null
  ): boolean => {
    if (!canAddItem(itemId, quantity, quality, includeTemp, meta)) return false
    return addItem(itemId, quantity, quality, meta)
  }

  /** 仅在整组物品都能完整放入时才统一添加，避免部分入包 */
  const addItemsExact = (
    entries: InventoryAddEntry[],
    includeTemp: boolean = true
  ): boolean => {
    if (!canAddItems(entries, includeTemp)) return false
    for (const entry of entries) {
      if (!addItem(entry.itemId, entry.quantity, entry.quality ?? 'normal', entry)) return false
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

  const getUnlockedItemCount = (itemId: string, quality?: Quality): number => {
    return items.value
      .filter(i => !i.locked && i.itemId === itemId && (quality === undefined || i.quality === quality))
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  const removeUnlockedItem = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    const matchQuality = (i: { itemId: string; quality: Quality; locked?: boolean }) =>
      !i.locked && i.itemId === itemId && (quality === undefined || i.quality === quality)
    const total = items.value.filter(matchQuality).reduce((sum, i) => sum + i.quantity, 0)
    if (total < quantity) return false

    const qualityOrder: Quality[] = ['normal', 'fine', 'excellent', 'supreme']
    let remaining = quantity
    for (const q of quality !== undefined ? [quality] : qualityOrder) {
      for (let i = items.value.length - 1; i >= 0 && remaining > 0; i--) {
        const slot = items.value[i]!
        if (slot.locked || slot.itemId !== itemId || slot.quality !== q) continue
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

  const removeItemForEating = (itemId: string, quantity: number = 1, quality?: Quality): boolean => {
    return removeItem(itemId, quantity, quality)
  }

  const removeItemAtIndex = (index: number, quantity: number = 1): InventoryItem | null => {
    const slot = items.value[index]
    if (!slot) return null
    const take = Math.max(0, Math.floor(Number(quantity) || 0))
    if (take <= 0 || slot.quantity < take) return null
    const removed = cloneInventoryItemSlot(slot)
    removed.quantity = take
    slot.quantity -= take
    if (slot.quantity <= 0) {
      items.value.splice(index, 1)
    }
    return removed
  }

  const removeUnlockedItemAtIndex = (index: number, quantity: number = 1): InventoryItem | null => {
    const slot = items.value[index]
    if (!slot || slot.locked) return null
    return removeItemAtIndex(index, quantity)
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

  const getTotalItemCountAtLeast = (itemId: string, minQuality: Quality = 'normal'): number =>
    getInventoryQualitiesAtLeast(minQuality).reduce((sum, quality) => sum + getTotalItemCount(itemId, quality), 0)

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

  /** 切换同物品同品质的全部批次锁定状态 */
  const toggleLock = (itemId: string, quality: Quality) => {
    const slots = items.value.filter(i => i.itemId === itemId && i.quality === quality)
    if (slots.length <= 0) return
    const nextLocked = !slots.some(slot => slot.locked)
    for (const slot of slots) {
      slot.locked = nextLocked
    }
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

  const removeItemAnywhereAtLeast = (itemId: string, quantity: number = 1, minQuality: Quality = 'normal'): boolean => {
    if (getTotalItemCountAtLeast(itemId, minQuality) < quantity) return false
    let remaining = quantity
    for (const currentQuality of getInventoryQualitiesAtLeast(minQuality)) {
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

  /** 一键整理背包（按分类→物品ID→品质排序，合并同类栈） */
  const sortItems = () => {
    // 先合并同类栈（任一栈锁定则合并后保持锁定）
    const merged: InventoryItem[] = []
    for (const item of items.value) {
      const existing = merged.find(m => inventoryStacksMatch(m, item))
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
        const splitSlot = createInventoryItemSlot(item.itemId, batch, item.quality, item)
        if (item.locked) splitSlot.locked = true
        split.push(splitSlot)
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
      const qualityDelta = (qualityOrder[a.quality] ?? 0) - (qualityOrder[b.quality] ?? 0)
      if (qualityDelta !== 0) return qualityDelta
      if ((a.origin ?? '') !== (b.origin ?? '')) return (a.origin ?? '').localeCompare(b.origin ?? '')
      if ((a.purchaseDay ?? '') !== (b.purchaseDay ?? '')) return (a.purchaseDay ?? '').localeCompare(b.purchaseDay ?? '')
      return (a.purchaseUnitPrice ?? -1) - (b.purchaseUnitPrice ?? -1)
    })
    items.value = split
  }

  /** 扩容背包 */
  const expandCapacity = (): boolean => {
    const nextCapacity = getNextInventoryCapacity(capacity.value)
    if (nextCapacity <= capacity.value) return false
    capacity.value = nextCapacity
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
      if (inventoryStacksMatch(slot, source) && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }

    while (remaining > 0 && mainSlots.length < capacity.value) {
      const batch = Math.min(remaining, MAX_STACK)
      mainSlots.push(createInventoryItemSlot(source.itemId, batch, source.quality, source))
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
      if (inventoryStacksMatch(slot, tempSlot) && slot.quantity < MAX_STACK) {
        const canAdd = Math.min(remaining, MAX_STACK - slot.quantity)
        slot.quantity += canAdd
        remaining -= canAdd
      }
    }
    while (remaining > 0 && !isFull.value) {
      const batch = Math.min(remaining, MAX_STACK)
      items.value.push(createInventoryItemSlot(itemId, batch, quality, tempSlot))
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

  const normalizeToolEntry = (entry: unknown): Tool | null => {
    if (!entry || typeof entry !== 'object') return null
    const raw = entry as Partial<Tool>
    if (typeof raw.type !== 'string' || !TOOL_TYPES.includes(raw.type as ToolType)) return null
    const type = raw.type as ToolType
    const tier = TOOL_TIER_ORDER.includes(raw.tier as ToolTier) ? (raw.tier as ToolTier) : 'basic'
    const rawEnchantmentId = typeof raw.enchantmentId === 'string' ? raw.enchantmentId : null
    const enchantment = rawEnchantmentId ? getToolEnchantmentById(rawEnchantmentId) : null
    const enchantmentId = enchantment && enchantment.toolType === type ? rawEnchantmentId : null
    if (rawEnchantmentId && !enchantmentId) {
      pushEquipmentMigrationLog(`清空${type}的无效工具附魔：${rawEnchantmentId}。`)
    }
    const affixes = type === 'pickaxe' ? normalizeForgeAffixesForTarget('pickaxe', raw.affixes, enchantmentId) : []
    return { type, tier, enchantmentId: null, affixes }
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
    const reduction = type === 'pickaxe' ? getForgeAffixEffectValue(tool.affixes, 'pickaxe_stamina_reduction') : 0
    return multipliers[tool.tier] * Math.max(0.1, 1 - reduction)
  }

  /** 获取工具等级对应的工作耗时倍率 */
  const getToolWorkTimeMultiplier = (type: ToolType): number => {
    const tool = getTool(type)
    if (!tool) return 1
    const multipliers: Record<ToolTier, number> = { basic: 1.0, iron: 0.9, steel: 0.8, iridium: 0.7 }
    const reduction = type === 'pickaxe' ? getForgeAffixEffectValue(tool.affixes, 'pickaxe_time_reduction') : 0
    return multipliers[tool.tier] * Math.max(0.1, 1 - reduction)
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
    if (type === 'pickaxe' && useNpcStore().isNpcFunctionEffectUnlocked('tool_bonus_slot') && (!tool.affixes || tool.affixes.length <= 0)) {
      const bonusAffixes = rollForgeAffixes({ target: 'pickaxe', workshopLevel: 7 }).slice(0, 1)
      if (bonusAffixes.length > 0) tool.affixes = bonusAffixes
    }
    return true
  }

  const setToolAffixes = (type: ToolType, affixes: ForgeAffixRoll[]): { success: boolean; message: string } => {
    const tool = getTool(type)
    if (!tool) return { success: false, message: '工具不存在。' }
    if (type !== 'pickaxe' && affixes.length > 0) return { success: false, message: '当前仅镐子支持铸魔。' }
    const normalizedAffixes = type === 'pickaxe' ? normalizeForgeAffixesForTarget('pickaxe', affixes) : []
    if (normalizedAffixes.length !== affixes.length || !validateForgeAffixesForTarget('pickaxe', normalizedAffixes)) return { success: false, message: '无效工具词条。' }
    tool.affixes = cloneForgeAffixes(normalizedAffixes)
    tool.enchantmentId = null
    return { success: true, message: '工具词条已更新。' }
  }

  const setToolEnchantment = (type: ToolType, enchantmentId: string | null): { success: boolean; message: string } => {
    if (enchantmentId) {
      const enchantment = getToolEnchantmentById(enchantmentId)
      if (!enchantment || enchantment.toolType !== type) return { success: false, message: '无效工具附魔。' }
    }
    return setToolAffixes(type, type === 'pickaxe' ? migrateLegacyEnchantmentToAffixes('pickaxe', enchantmentId) : [])
  }

  const getToolEnchantmentId = (type: ToolType): string | null => {
    return getTool(type)?.enchantmentId ?? null
  }

  const getToolAffixes = (type: ToolType): ForgeAffixRoll[] => cloneForgeAffixes(getTool(type)?.affixes)

  const getToolAffixEffectValue = (type: ToolType, effectType: ForgeAffixEffectType): number => {
    if (type !== 'pickaxe') return 0
    return getForgeAffixEffectValue(getTool(type)?.affixes, effectType)
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
    const speedReduction = Math.max(0, Math.floor(useNpcStore().getNpcFunctionEffectValue('tool_upgrade_speed')))
    pendingUpgrade.value = { toolType: type, targetTier, daysRemaining: Math.max(1, 2 - speedReduction) }
    return true
  }

  const grantRandomIronToolUpgrade = (): ToolType | null => {
    const candidates = IRON_TOOL_TYPES.filter(type => getTool(type)?.tier === 'basic')
    const picked = candidates[Math.floor(Math.random() * candidates.length)]
    if (!picked) return null
    const tool = getTool(picked)
    if (!tool) return null
    tool.tier = 'iron'
    return picked
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
  const addRing = (defId: string, enchantmentId: string | null = null, affixes?: ForgeAffixRoll[] | null): boolean => {
    ownedRings.value.push({ defId, enchantmentId: null, affixes: normalizeForgeAffixesForTarget('ring', affixes, enchantmentId) })
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
    if (isEquipmentBroken('ring', ringIndex)) return false
    const targetSlot = slot === 0 ? equippedRingSlot1 : equippedRingSlot2
    const otherSlot = slot === 0 ? equippedRingSlot2 : equippedRingSlot1
    // 已在目标槽位，无操作
    if (targetSlot.value === ringIndex) return true
    // 同一枚戒指在另一个槽位 → 交换
    if (otherSlot.value === ringIndex) {
      clearActivePreset()
      otherSlot.value = targetSlot.value // 可能是 -1
      targetSlot.value = ringIndex
      return true
    }
    // 禁止两个槽位装备同defId戒指
    const targetDefId = ownedRings.value[ringIndex]!.defId
    if (otherSlot.value >= 0 && otherSlot.value < ownedRings.value.length && ownedRings.value[otherSlot.value]!.defId === targetDefId) {
      return false
    }
    if (targetSlot.value !== ringIndex) clearActivePreset()
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
    clearActivePreset()
    return true
  }

  /** 卖出戒指（自动卸下已装备的戒指） */
  const sellRing = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedRings.value.length) return { success: false, message: '无效索引。' }
    const ring = ownedRings.value[index]!
    if (ring.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getRingById(ring.defId)
    const price = def?.sellPrice ?? 0
    clearActivePreset()
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
    clearActivePreset()
    if (equippedRingSlot1.value === index) equippedRingSlot1.value = -1
    if (equippedRingSlot2.value === index) equippedRingSlot2.value = -1
    ownedRings.value.splice(index, 1)
    if (equippedRingSlot1.value > index) equippedRingSlot1.value--
    if (equippedRingSlot2.value > index) equippedRingSlot2.value--
    return true
  }

  /** 查询某种装备效果的合计值（戒指+帽子+鞋子+饰品叠加） */
  const getEquipmentBonus = (effectType: RingEffectType): number => {
    let total = 0
    // 戒指（2槽位）
    const ringIndices = [equippedRingSlot1.value, equippedRingSlot2.value]
    for (const idx of ringIndices) {
      if (idx < 0 || idx >= ownedRings.value.length) continue
      const ring = ownedRings.value[idx]!
      const def = getRingById(ring.defId)
      if (def) {
        total = addMatchingEquipmentEffects(total, def.effects, effectType)
      }
      total = addMatchingEquipmentEffects(total, getForgeAffixEquipmentEffects(ring.affixes), effectType)
    }
    // 帽子（1槽位）
    if (equippedHatIndex.value >= 0 && equippedHatIndex.value < ownedHats.value.length) {
      const hat = ownedHats.value[equippedHatIndex.value]!
      const def = getHatById(hat.defId)
      if (def) {
        total = addMatchingEquipmentEffects(total, def.effects, effectType)
      }
      total = addMatchingEquipmentEffects(total, getForgeAffixEquipmentEffects(hat.affixes), effectType)
    }
    // 鞋子（1槽位）
    if (equippedShoeIndex.value >= 0 && equippedShoeIndex.value < ownedShoes.value.length) {
      const shoe = ownedShoes.value[equippedShoeIndex.value]!
      const def = getShoeById(shoe.defId)
      if (def) {
        total = addMatchingEquipmentEffects(total, def.effects, effectType)
      }
      total = addMatchingEquipmentEffects(total, getForgeAffixEquipmentEffects(shoe.affixes), effectType)
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
    if (useNpcStore().isNpcFunctionEffectUnlocked('embroidery_craft')) {
      if (effectType === 'defense_bonus') total += 0.02
    }
    if (useNpcStore().isNpcFunctionEffectUnlocked('embroidery_boost')) {
      if (effectType === 'max_hp_bonus') total += 10
      if (effectType === 'defense_bonus') total += 0.03
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
  const addHat = (defId: string, enchantmentId: string | null = null, affixes?: ForgeAffixRoll[] | null): boolean => {
    ownedHats.value.push({ defId, enchantmentId: null, affixes: normalizeForgeAffixesForTarget('hat', affixes, enchantmentId) })
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
    if (isEquipmentBroken('hat', index)) return false
    if (equippedHatIndex.value !== index) clearActivePreset()
    equippedHatIndex.value = index
    return true
  }

  /** 卸下帽子 */
  const unequipHat = (): boolean => {
    if (equippedHatIndex.value < 0) return false
    equippedHatIndex.value = -1
    clearActivePreset()
    return true
  }

  /** 卖出帽子 */
  const sellHat = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedHats.value.length) return { success: false, message: '无效索引。' }
    const hat = ownedHats.value[index]!
    if (hat.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getHatById(hat.defId)
    const price = def?.sellPrice ?? 0
    clearActivePreset()
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
    clearActivePreset()
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
  const addShoe = (defId: string, enchantmentId: string | null = null, affixes?: ForgeAffixRoll[] | null): boolean => {
    ownedShoes.value.push({ defId, enchantmentId: null, affixes: normalizeForgeAffixesForTarget('shoe', affixes, enchantmentId) })
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
    if (isEquipmentBroken('shoe', index)) return false
    if (equippedShoeIndex.value !== index) clearActivePreset()
    equippedShoeIndex.value = index
    return true
  }

  /** 卸下鞋子 */
  const unequipShoe = (): boolean => {
    if (equippedShoeIndex.value < 0) return false
    equippedShoeIndex.value = -1
    clearActivePreset()
    return true
  }

  /** 卖出鞋子 */
  const sellShoe = (index: number): { success: boolean; message: string } => {
    if (index < 0 || index >= ownedShoes.value.length) return { success: false, message: '无效索引。' }
    const shoe = ownedShoes.value[index]!
    if (shoe.locked) return { success: false, message: '这件装备已锁定，先解锁才能卖出。' }
    const def = getShoeById(shoe.defId)
    const price = def?.sellPrice ?? 0
    clearActivePreset()
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
    clearActivePreset()
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
    if (equippedTrinketId.value !== defId) clearActivePreset()
    equippedTrinketId.value = defId
    playerStore.markLifestyleUnlock(`trinket_equipped_${defId}`)
    return true
  }

  const unequipTrinket = (): boolean => {
    if (!equippedTrinketId.value) return false
    equippedTrinketId.value = null
    clearActivePreset()
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
      weaponAffixSignature: null,
      ringSlot1DefId: null,
      ringSlot1EnchantmentId: null,
      ringSlot1AffixSignature: null,
      ringSlot2DefId: null,
      ringSlot2EnchantmentId: null,
      ringSlot2AffixSignature: null,
      hatDefId: null,
      hatEnchantmentId: null,
      hatAffixSignature: null,
      shoeDefId: null,
      shoeEnchantmentId: null,
      shoeAffixSignature: null,
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
    const weapon = ownedWeapons.value[equippedWeaponIndex.value] ?? null
    const ring1 = equippedRingSlot1.value >= 0 ? (ownedRings.value[equippedRingSlot1.value] ?? null) : null
    const ring2 = equippedRingSlot2.value >= 0 ? (ownedRings.value[equippedRingSlot2.value] ?? null) : null
    const hat = equippedHatIndex.value >= 0 ? (ownedHats.value[equippedHatIndex.value] ?? null) : null
    const shoe = equippedShoeIndex.value >= 0 ? (ownedShoes.value[equippedShoeIndex.value] ?? null) : null
    preset.weaponDefId = weapon?.defId ?? null
    preset.weaponEnchantmentId = null
    preset.weaponAffixSignature = getEntryAffixSignature('weapon', weapon)
    preset.ringSlot1DefId = ring1?.defId ?? null
    preset.ringSlot1EnchantmentId = null
    preset.ringSlot1AffixSignature = getEntryAffixSignature('ring', ring1)
    preset.ringSlot2DefId = ring2?.defId ?? null
    preset.ringSlot2EnchantmentId = null
    preset.ringSlot2AffixSignature = getEntryAffixSignature('ring', ring2)
    preset.hatDefId = hat?.defId ?? null
    preset.hatEnchantmentId = null
    preset.hatAffixSignature = getEntryAffixSignature('hat', hat)
    preset.shoeDefId = shoe?.defId ?? null
    preset.shoeEnchantmentId = null
    preset.shoeAffixSignature = getEntryAffixSignature('shoe', shoe)
    preset.trinketDefId = equippedTrinketId.value
  }

  const doesWeaponMatchPreset = (preset: EquipmentPreset): boolean => {
    if (!preset.weaponDefId) return false
    const weapon = ownedWeapons.value[equippedWeaponIndex.value]
    const expectedSignature = preset.weaponAffixSignature ?? getLegacyAffixSignature('weapon', preset.weaponEnchantmentId)
    return !!weapon && weapon.defId === preset.weaponDefId && getEntryAffixSignature('weapon', weapon) === expectedSignature
  }

  const doesRingSlotMatchPreset = (slotIndex: number, defId: string | null, affixSignature: string | null): boolean => {
    if (!defId) return slotIndex < 0
    const ring = slotIndex >= 0 && slotIndex < ownedRings.value.length ? ownedRings.value[slotIndex] : null
    return !!ring && ring.defId === defId && getEntryAffixSignature('ring', ring) === affixSignature
  }

  const doesSingleSlotMatchPreset = <T extends EnchantedEquipmentEntry>(
    entries: T[],
    slotIndex: number,
    defId: string | null,
    target: ForgeAffixTarget,
    affixSignature: string | null
  ): boolean => {
    if (!defId) return slotIndex < 0
    const entry = slotIndex >= 0 && slotIndex < entries.length ? entries[slotIndex] : null
    return !!entry && entry.defId === defId && getEntryAffixSignature(target, entry) === affixSignature
  }

  const doesCurrentEquipmentMatchPreset = (preset: EquipmentPreset): boolean => {
    return (
      doesWeaponMatchPreset(preset) &&
      doesRingSlotMatchPreset(equippedRingSlot1.value, preset.ringSlot1DefId, preset.ringSlot1AffixSignature ?? getLegacyAffixSignature('ring', preset.ringSlot1EnchantmentId)) &&
      doesRingSlotMatchPreset(equippedRingSlot2.value, preset.ringSlot2DefId, preset.ringSlot2AffixSignature ?? getLegacyAffixSignature('ring', preset.ringSlot2EnchantmentId)) &&
      doesSingleSlotMatchPreset(ownedHats.value, equippedHatIndex.value, preset.hatDefId, 'hat', preset.hatAffixSignature ?? getLegacyAffixSignature('hat', preset.hatEnchantmentId)) &&
      doesSingleSlotMatchPreset(ownedShoes.value, equippedShoeIndex.value, preset.shoeDefId, 'shoe', preset.shoeAffixSignature ?? getLegacyAffixSignature('shoe', preset.shoeEnchantmentId)) &&
      (equippedTrinketId.value ?? null) === (preset.trinketDefId ?? null)
    )
  }

  const isEquipmentPresetActive = (id: string): boolean => {
    const preset = equipmentPresets.value.find(p => p.id === id)
    return !!preset && doesCurrentEquipmentMatchPreset(preset)
  }

  const activeEquipmentPreset = computed(() => {
    const markedPreset = activePresetId.value ? equipmentPresets.value.find(p => p.id === activePresetId.value) : null
    if (markedPreset && doesCurrentEquipmentMatchPreset(markedPreset)) return markedPreset
    return equipmentPresets.value.find(preset => doesCurrentEquipmentMatchPreset(preset)) ?? null
  })

  const activeEquipmentPresetName = computed(() => activeEquipmentPreset.value?.name ?? null)

  /** 应用装备方案 */
  const applyEquipmentPreset = (id: string): { success: boolean; message: string } => {
    const preset = equipmentPresets.value.find(p => p.id === id)
    if (!preset) return { success: false, message: '方案不存在。' }

    const missing: string[] = []

    // 武器
    if (preset.weaponDefId) {
      const weaponSignature = preset.weaponAffixSignature ?? getLegacyAffixSignature('weapon', preset.weaponEnchantmentId)
      const idx = ownedWeapons.value.findIndex(
        (w, index) => w.defId === preset.weaponDefId && isEquipmentUsableForPreset('weapon', index) && getEntryAffixSignature('weapon', w) === weaponSignature
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
      const ring1Signature = preset.ringSlot1AffixSignature ?? getLegacyAffixSignature('ring', preset.ringSlot1EnchantmentId)
      ring1Idx = ownedRings.value.findIndex((r, index) => r.defId === preset.ringSlot1DefId && isEquipmentUsableForPreset('ring', index) && getEntryAffixSignature('ring', r) === ring1Signature)
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
        const ring2Signature = preset.ringSlot2AffixSignature ?? getLegacyAffixSignature('ring', preset.ringSlot2EnchantmentId)
        const idx = ownedRings.value.findIndex((r, index) => r.defId === preset.ringSlot2DefId && isEquipmentUsableForPreset('ring', index) && getEntryAffixSignature('ring', r) === ring2Signature)
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
      const hatSignature = preset.hatAffixSignature ?? getLegacyAffixSignature('hat', preset.hatEnchantmentId)
      const idx = ownedHats.value.findIndex((h, index) => h.defId === preset.hatDefId && isEquipmentUsableForPreset('hat', index) && getEntryAffixSignature('hat', h) === hatSignature)
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
      const shoeSignature = preset.shoeAffixSignature ?? getLegacyAffixSignature('shoe', preset.shoeEnchantmentId)
      const idx = ownedShoes.value.findIndex((s, index) => s.defId === preset.shoeDefId && isEquipmentUsableForPreset('shoe', index) && getEntryAffixSignature('shoe', s) === shoeSignature)
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

    activePresetId.value = missing.length === 0 && doesCurrentEquipmentMatchPreset(preset) ? id : null

    if (missing.length > 0) {
      return { success: true, message: `已应用方案「${preset.name}」，但${missing.join('、')}已不在背包中。` }
    }
    return { success: true, message: `已应用方案「${preset.name}」。` }
  }

  const serialize = () => {
    return {
      equipmentDurabilityBalanceVersion: EQUIPMENT_DURABILITY_BALANCE_VERSION,
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
    const migrateDurabilityBalance = shouldMigrateDurabilityBalance((data as { equipmentDurabilityBalanceVersion?: unknown }).equipmentDurabilityBalanceVersion)

    const migrateRecipeId = (id: string) => {
      if (id === 'mill_fish_feed' || id === 'recycle_fish_feed') return 'fish_feed'
      return id
    }

    const normalizeSlotIndex = (value: unknown, fallback = -1) => {
      const index = Math.floor(Number(value))
      return Number.isFinite(index) ? index : fallback
    }

    const normalizeInventorySlot = (entry: unknown): InventoryItem | null => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as Partial<InventoryItem>
      const itemId = typeof raw.itemId === 'string' ? migrateRecipeId(raw.itemId) : ''
      if (!getItemById(itemId)) return null
      const quality = INVENTORY_QUALITY_ORDER.includes(raw.quality as Quality) ? (raw.quality as Quality) : 'normal'
      const quantity = Math.max(0, Math.floor(Number(raw.quantity) || 0))
      if (quantity <= 0) return null
      const slot = createInventoryItemSlot(itemId, quantity, quality, raw)
      if (raw.locked === true) slot.locked = true
      return slot
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
        {
          const normalizedAffixes = normalizeForgeAffixesForTarget('weapon', rawWeapon.affixes, enchantmentId)
          const def = getWeaponById(defId)!
          const recipe = def.shopMaterials?.length ? def.shopMaterials : null
          const recipeMoney = def.shopPrice ?? 0
          const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, recipe, recipeMoney, normalizedAffixes, null, [])
          const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, recipe, recipeMoney, normalizedAffixes, null)
          const durabilityBonus = getAffixDurabilityBonus(normalizedAffixes)
          const oldMaxDurability = calculateLegacyMaxDurability(def.qualityTier, recipe, recipeMoney, 0, durabilityBonus)
          const oldMaxSturdiness = calculateLegacyMaxSturdiness(def.qualityTier, recipe, recipeMoney, durabilityBonus)
          const weaponDurability = readNumericField(rawWeapon.durability)
          const weaponSturdiness = readNumericField(rawWeapon.sturdiness)
          const wearProgress = readDurabilityWearProgress(rawWeapon)
          validWeapons.push({
            defId,
            enchantmentId: null,
            affixes: normalizedAffixes,
            locked: readLockedFlag(rawWeapon),
            durability: migrateEquipmentValueToNewMax(weaponDurability, oldMaxDurability, maxDurability, migrateDurabilityBalance),
            sturdiness: migrateEquipmentValueToNewMax(weaponSturdiness, oldMaxSturdiness, maxSturdiness, migrateDurabilityBalance),
            ...(wearProgress != null ? { durabilityWearProgress: wearProgress } : {}),
            rawIndex
          })
        }
      })

      if (validWeapons.length <= 0) {
        const fallbackDef = getWeaponById('wooden_stick')
        const fallbackDurability = fallbackDef ? calculateEffectiveMaxDurability(fallbackDef.qualityTier, fallbackDef.shopMaterials?.length ? fallbackDef.shopMaterials : null, fallbackDef.shopPrice ?? 0, [], null, []) : 50
        const fallbackSturdiness = fallbackDef ? calculateEffectiveMaxSturdiness(fallbackDef.qualityTier, fallbackDef.shopMaterials?.length ? fallbackDef.shopMaterials : null, fallbackDef.shopPrice ?? 0, [], null) : 80
        ownedWeapons.value = [{ defId: 'wooden_stick', enchantmentId: null, affixes: [], durability: fallbackDurability, sturdiness: fallbackSturdiness }]
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
        const enchantmentId = normalizeEquipmentEnchantmentId('ring', (entry as { enchantmentId?: unknown }).enchantmentId, `戒指 ${defId}`)
        {
          const normalizedAffixes = normalizeForgeAffixesForTarget('ring', (entry as { affixes?: unknown }).affixes, enchantmentId)
          const def = getRingById(defId)!
          const maxDurability = calculateEffectiveMaxDurability(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, normalizedAffixes, null, [])
          const maxSturdiness = calculateEffectiveMaxSturdiness(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, normalizedAffixes, null)
          const durabilityBonus = getAffixDurabilityBonus(normalizedAffixes)
          const oldMaxDurability = calculateLegacyMaxDurability(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, 0, durabilityBonus)
          const oldMaxSturdiness = calculateLegacyMaxSturdiness(def.qualityTier, def.recipe ?? null, def.recipeMoney ?? 0, durabilityBonus)
          const rawDurability = (entry as { durability?: unknown }).durability
          const ringDurability = readNumericField(rawDurability)
          const ringSturdiness = readNumericField((entry as { sturdiness?: unknown }).sturdiness)
          const wearProgress = readDurabilityWearProgress(entry as { durabilityWearProgress?: unknown })
          validRings.push({
            defId,
            enchantmentId: null,
            affixes: normalizedAffixes,
            locked: readLockedFlag(entry as { locked?: unknown }),
            durability: migrateEquipmentValueToNewMax(ringDurability, oldMaxDurability, maxDurability, migrateDurabilityBalance),
            sturdiness: migrateEquipmentValueToNewMax(ringSturdiness, oldMaxSturdiness, maxSturdiness, migrateDurabilityBalance),
            ...(wearProgress != null ? { durabilityWearProgress: wearProgress } : {}),
            rawIndex
          })
        }
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
      slot: EquipmentEnchantSlot,
      label: string
    ): { entries: EnchantedEquipmentEntry[]; equippedIndex: number } => {
      const rawEntries = Array.isArray(value) ? value : []
      const equippedRawIndex = normalizeSlotIndex(equippedIndexValue)
      const validEntries: Array<EnchantedEquipmentEntry & { rawIndex: number }> = []
      rawEntries.forEach((entry, rawIndex) => {
        if (!entry || typeof entry !== 'object') return
        const defId = typeof (entry as { defId?: unknown }).defId === 'string' ? (entry as { defId: string }).defId : ''
        if (!resolveDef(defId)) {
          pushEquipmentMigrationLog(`移除无效${label}：${defId || `#${rawIndex}`}。`)
          return
        }
        const enchantmentId = normalizeEquipmentEnchantmentId(slot, (entry as { enchantmentId?: unknown }).enchantmentId, `${label} ${defId}`)
        {
          const normalizedAffixes = normalizeForgeAffixesForTarget(EQUIPMENT_SLOT_FORGE_TARGET[slot], (entry as { affixes?: unknown }).affixes, enchantmentId)
          const equipmentDef = slot === 'hat' ? getHatById(defId) : getShoeById(defId)
          const maxDurability = equipmentDef
            ? calculateEffectiveMaxDurability(equipmentDef.qualityTier, equipmentDef.recipe ?? null, equipmentDef.recipeMoney ?? 0, normalizedAffixes, null, [])
            : 1
          const maxSturdiness = equipmentDef
            ? calculateEffectiveMaxSturdiness(equipmentDef.qualityTier, equipmentDef.recipe ?? null, equipmentDef.recipeMoney ?? 0, normalizedAffixes, null)
            : 1
          const durabilityBonus = getAffixDurabilityBonus(normalizedAffixes)
          const oldMaxDurability = equipmentDef
            ? calculateLegacyMaxDurability(equipmentDef.qualityTier, equipmentDef.recipe ?? null, equipmentDef.recipeMoney ?? 0, 0, durabilityBonus)
            : 1
          const oldMaxSturdiness = equipmentDef
            ? calculateLegacyMaxSturdiness(equipmentDef.qualityTier, equipmentDef.recipe ?? null, equipmentDef.recipeMoney ?? 0, durabilityBonus)
            : 1
          const rawDurability = (entry as { durability?: unknown }).durability
          const equipDurability = readNumericField(rawDurability)
          const equipSturdiness = readNumericField((entry as { sturdiness?: unknown }).sturdiness)
          const wearProgress = readDurabilityWearProgress(entry as { durabilityWearProgress?: unknown })
          validEntries.push({
            defId,
            enchantmentId: null,
            affixes: normalizedAffixes,
            locked: readLockedFlag(entry as { locked?: unknown }),
            durability: migrateEquipmentValueToNewMax(equipDurability, oldMaxDurability, maxDurability, migrateDurabilityBalance),
            sturdiness: migrateEquipmentValueToNewMax(equipSturdiness, oldMaxSturdiness, maxSturdiness, migrateDurabilityBalance),
            ...(wearProgress != null ? { durabilityWearProgress: wearProgress } : {}),
            rawIndex
          })
        }
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

    items.value = ((data.items ?? []) as unknown[]).map(normalizeInventorySlot).filter((i): i is InventoryItem => !!i)
    capacity.value = data.capacity ?? INITIAL_CAPACITY
    tempItems.value = (((data as any).tempItems ?? []) as unknown[]).map(normalizeInventorySlot).filter((i): i is InventoryItem => !!i)
    tools.value = Array.isArray((data as Record<string, unknown>).tools)
      ? ((data as Record<string, unknown>).tools as unknown[]).map(normalizeToolEntry).filter((tool): tool is Tool => !!tool)
      : [
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
      'hat',
      '帽子'
    )
    ownedHats.value = normalizedHats.entries
    equippedHatIndex.value = normalizedHats.equippedIndex

    // 鞋子系统（向后兼容旧存档）
    const normalizedShoes = normalizeSingleIndexedEquipment(
      (data as Record<string, unknown>).ownedShoes,
      (data as Record<string, unknown>).equippedShoeIndex,
      getShoeById,
      'shoe',
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
    equipmentPresets.value = equipmentPresets.value.map(preset => {
      const rawPreset = preset as EquipmentPreset & {
        weaponAffixSignature?: unknown
        ringSlot1AffixSignature?: unknown
        ringSlot2AffixSignature?: unknown
        hatAffixSignature?: unknown
        shoeAffixSignature?: unknown
        weaponEnchantmentId?: unknown
        ringSlot1EnchantmentId?: unknown
        ringSlot2EnchantmentId?: unknown
        hatEnchantmentId?: unknown
        shoeEnchantmentId?: unknown
        trinketDefId?: string | null
      }
      const weaponDefId = typeof rawPreset.weaponDefId === 'string' && getWeaponById(rawPreset.weaponDefId) ? rawPreset.weaponDefId : null
      const ringSlot1DefId = typeof rawPreset.ringSlot1DefId === 'string' && getRingById(rawPreset.ringSlot1DefId) ? rawPreset.ringSlot1DefId : null
      const ringSlot2DefId = typeof rawPreset.ringSlot2DefId === 'string' && getRingById(rawPreset.ringSlot2DefId) ? rawPreset.ringSlot2DefId : null
      const hatDefId = typeof rawPreset.hatDefId === 'string' && getHatById(rawPreset.hatDefId) ? rawPreset.hatDefId : null
      const shoeDefId = typeof rawPreset.shoeDefId === 'string' && getShoeById(rawPreset.shoeDefId) ? rawPreset.shoeDefId : null
      const weaponEnchantmentId = typeof rawPreset.weaponEnchantmentId === 'string' && getEnchantmentById(rawPreset.weaponEnchantmentId)
        ? rawPreset.weaponEnchantmentId
        : null
      const ringSlot1EnchantmentId = ringSlot1DefId ? normalizeEquipmentEnchantmentId('ring', rawPreset.ringSlot1EnchantmentId, `方案 ${preset.name} 戒指1`) : null
      const ringSlot2EnchantmentId = ringSlot2DefId ? normalizeEquipmentEnchantmentId('ring', rawPreset.ringSlot2EnchantmentId, `方案 ${preset.name} 戒指2`) : null
      const hatEnchantmentId = hatDefId ? normalizeEquipmentEnchantmentId('hat', rawPreset.hatEnchantmentId, `方案 ${preset.name} 帽子`) : null
      const shoeEnchantmentId = shoeDefId ? normalizeEquipmentEnchantmentId('shoe', rawPreset.shoeEnchantmentId, `方案 ${preset.name} 鞋子`) : null
      return {
        ...preset,
        weaponDefId,
        ringSlot1DefId,
        ringSlot2DefId,
        hatDefId,
        shoeDefId,
        weaponEnchantmentId: null,
        weaponAffixSignature: weaponDefId ? normalizePresetAffixSignature('weapon', rawPreset.weaponAffixSignature, weaponEnchantmentId) : null,
        ringSlot1EnchantmentId: null,
        ringSlot1AffixSignature: ringSlot1DefId ? normalizePresetAffixSignature('ring', rawPreset.ringSlot1AffixSignature, ringSlot1EnchantmentId) : null,
        ringSlot2EnchantmentId: null,
        ringSlot2AffixSignature: ringSlot2DefId ? normalizePresetAffixSignature('ring', rawPreset.ringSlot2AffixSignature, ringSlot2EnchantmentId) : null,
        hatEnchantmentId: null,
        hatAffixSignature: hatDefId ? normalizePresetAffixSignature('hat', rawPreset.hatAffixSignature, hatEnchantmentId) : null,
        shoeEnchantmentId: null,
        shoeAffixSignature: shoeDefId ? normalizePresetAffixSignature('shoe', rawPreset.shoeAffixSignature, shoeEnchantmentId) : null,
        trinketDefId: rawPreset.trinketDefId ?? null
      }
    })
    activePresetId.value = ((data as Record<string, unknown>).activePresetId as string | null | undefined) ?? null
    if (activePresetId.value && !equipmentPresets.value.some(preset => preset.id === activePresetId.value)) {
      pushEquipmentMigrationLog(`当前装备方案 ${activePresetId.value} 不存在，已清空激活状态。`)
      activePresetId.value = null
    }
    if (activePresetId.value && !isEquipmentPresetActive(activePresetId.value)) {
      pushEquipmentMigrationLog(`当前装备方案 ${activePresetId.value} 与实际装备不一致，已清空激活状态。`)
      activePresetId.value = null
    }
  }

  return {
    items,
    visibleItems,
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
    removeItemsWithRollback,
    getUnlockedItemCount,
    removeUnlockedItem,
    removeItemForEating,
    removeItemAtIndex,
    removeUnlockedItemAtIndex,
    removeItemFromTemp,
    removeItemAnywhere,
    removeItemAnywhereAtLeast,
    getItemCount,
    getTempItemCount,
    getTotalItemCount,
    getTotalItemCountAtLeast,
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
    setToolAffixes,
    setToolEnchantment,
    getToolEnchantmentId,
    getToolAffixes,
    getToolAffixEffectValue,
    upgradeTool,
    isToolAvailable,
    startUpgrade,
    dailyUpgradeUpdate,
    grantRandomIronToolUpgrade,
    getWeaponAttack,
    getWeaponCritRate,
    getEquippedWeaponAffixes,
    getWeaponAffixEffectValue,
    getWeaponMaxDurability,
    getRingMaxDurability,
    getHatMaxDurability,
    getShoeMaxDurability,
    npcCustomEquipUnlocked,
    getEquippedWeapon,
    addWeapon,
    setWeaponAffixes,
    setWeaponEnchantment,
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
    setRingAffixes,
    setRingEnchantment,
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
    setHatAffixes,
    setHatEnchantment,
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
    setShoeAffixes,
    setShoeEnchantment,
    sellShoe,
    removeShoe,
    craftShoe,
    equipTrinket,
    unequipTrinket,
    equipmentPresets,
    activePresetId,
    activeEquipmentPreset,
    activeEquipmentPresetName,
    isEquipmentPresetActive,
    createEquipmentPreset,
    deleteEquipmentPreset,
    renameEquipmentPreset,
    saveCurrentToPreset,
    applyEquipmentPreset,
    repairOwnedEquipment,
    getOwnedEquipmentDurability,
    getOwnedEquipmentSturdiness,
    dismantleOwnedEquipment,
    repairLowestDurabilityEquipment,
    serialize,
    deserialize
  }
})
