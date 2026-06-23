import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  EQUIPMENT_ACCESSORY_DAILY_PURCHASES,
  EQUIPMENT_ACCESSORY_DEFS,
  EQUIPMENT_ACCESSORY_FAMILIES,
  EQUIPMENT_ACCESSORY_MAX_LEVEL,
  EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
  EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
  EQUIPMENT_ACCESSORY_QUALITIES,
  EQUIPMENT_ACCESSORY_QUALITY_LABELS,
  EQUIPMENT_ACCESSORY_SLOT_IDS,
  EQUIPMENT_ACCESSORY_TIER_LABELS,
  EQUIPMENT_ACCESSORY_TIERS,
  EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
  buildEquipmentAccessoryPityKey,
  createDefaultEquipmentAccessorySaveData,
  createEmptyAccessoryInvestment,
  getEquipmentAccessoryBaseDismantleRefund,
  getEquipmentAccessoryDef,
  getEquipmentAccessoryEffectSummary,
  getEquipmentAccessoryFusionRule,
  getEquipmentAccessoryRecipe,
  getEquipmentAccessorySetSummary,
  getEquipmentAccessoryUpgradeCost,
  normalizeEquipmentAccessoryInvestment,
  normalizeEquipmentAccessoryLevel,
  normalizeEquipmentAccessoryQuality,
  normalizeEquipmentAccessoryTier
} from '@/data/equipmentAccessories'
import { getItemById } from '@/data/items'
import type {
  EquipmentAccessoryEffectKey,
  EquipmentAccessoryFamilyId,
  EquipmentAccessoryMaterialCost,
  EquipmentAccessoryQuality,
  EquipmentAccessorySaveData,
  EquipmentAccessorySlotId,
  EquipmentAccessorySource,
  EquipmentAccessoryTier,
  EquipmentAccessoryUpgradeInvestment,
  EquippedEquipmentAccessorySlots,
  OwnedEquipmentAccessory
} from '@/types/equipmentAccessory'
import { useGameStore } from './useGameStore'
import { useInventoryStore } from './useInventoryStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'

type Result<T = undefined> = T extends undefined
  ? { success: boolean; message: string }
  : { success: boolean; message: string } & T

type FusionOutcome = 'success' | 'failure'

const cloneInvestment = (investment?: Partial<EquipmentAccessoryUpgradeInvestment>): EquipmentAccessoryUpgradeInvestment => ({
  accessoryMaterial: Math.max(0, Math.floor(Number(investment?.accessoryMaterial) || 0)),
  tuningStone: Math.max(0, Math.floor(Number(investment?.tuningStone) || 0))
})

const mergeMaterialCosts = (entries: EquipmentAccessoryMaterialCost[]): EquipmentAccessoryMaterialCost[] => {
  const map = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.itemId) continue
    const quantity = Math.max(0, Math.floor(Number(entry.quantity) || 0))
    if (quantity <= 0) continue
    map.set(entry.itemId, (map.get(entry.itemId) ?? 0) + quantity)
  }
  return [...map.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
}

const formatMaterialList = (entries: EquipmentAccessoryMaterialCost[]): string =>
  mergeMaterialCosts(entries)
    .map(entry => `${getItemById(entry.itemId)?.name ?? entry.itemId}×${entry.quantity}`)
    .join('、')

const rollWeightedQuality = (rolls: Array<{ quality: EquipmentAccessoryQuality; weight: number }>): EquipmentAccessoryQuality => {
  const normalized = rolls.filter(roll => roll.weight > 0)
  const total = normalized.reduce((sum, roll) => sum + roll.weight, 0)
  if (total <= 0) return 'normal'
  let cursor = Math.random() * total
  for (const roll of normalized) {
    cursor -= roll.weight
    if (cursor <= 0) return roll.quality
  }
  return normalized[normalized.length - 1]?.quality ?? 'normal'
}

export const useEquipmentAccessoryStore = defineStore('equipmentAccessory', () => {
  const ownedAccessories = ref<OwnedEquipmentAccessory[]>([])
  const equippedSlots = ref<EquippedEquipmentAccessorySlots>(
    Object.fromEntries(EQUIPMENT_ACCESSORY_SLOT_IDS.map(slotId => [slotId, null])) as EquippedEquipmentAccessorySlots
  )
  const unlockedBlueprints = ref<EquipmentAccessoryTier[]>([1])
  const fusionPityState = ref<EquipmentAccessorySaveData['fusionPityState']>({})
  const dailyPurchaseState = ref<EquipmentAccessorySaveData['dailyPurchaseState']>({
    dayTag: '',
    purchased: {}
  })
  const nextInstanceSeq = ref(1)

  const currentDayTag = computed(() => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  })

  const sortedOwnedAccessories = computed(() =>
    [...ownedAccessories.value].sort((left, right) => {
      const defOrder = EQUIPMENT_ACCESSORY_SLOT_IDS.indexOf(left.defId) - EQUIPMENT_ACCESSORY_SLOT_IDS.indexOf(right.defId)
      if (defOrder !== 0) return defOrder
      if (left.tier !== right.tier) return right.tier - left.tier
      const leftQuality = EQUIPMENT_ACCESSORY_QUALITIES.indexOf(left.quality)
      const rightQuality = EQUIPMENT_ACCESSORY_QUALITIES.indexOf(right.quality)
      if (leftQuality !== rightQuality) return rightQuality - leftQuality
      return right.level - left.level
    })
  )

  const equippedAccessories = computed(() =>
    EQUIPMENT_ACCESSORY_SLOT_IDS
      .map(slotId => ownedAccessories.value.find(accessory => accessory.instanceId === equippedSlots.value[slotId]) ?? null)
      .filter((accessory): accessory is OwnedEquipmentAccessory => !!accessory)
  )

  const effectSummary = computed(() => {
    const singleValues = getEquipmentAccessoryEffectSummary(equippedAccessories.value)
    const setValues = EQUIPMENT_ACCESSORY_FAMILIES
      .map(family => getEquipmentAccessorySetSummary(family.id, equippedAccessories.value))
      .reduce<Partial<Record<EquipmentAccessoryEffectKey, number>>>((totals, summary) => {
        for (const [effectKey, value] of Object.entries(summary.effectValues)) {
          totals[effectKey as EquipmentAccessoryEffectKey] = (totals[effectKey as EquipmentAccessoryEffectKey] ?? 0) + Number(value || 0)
        }
        return totals
      }, {})

    const merged: Partial<Record<EquipmentAccessoryEffectKey, number>> = { ...singleValues }
    for (const [effectKey, value] of Object.entries(setValues)) {
      merged[effectKey as EquipmentAccessoryEffectKey] = (merged[effectKey as EquipmentAccessoryEffectKey] ?? 0) + Number(value || 0)
    }
    return merged
  })

  const setSummaries = computed(() => EQUIPMENT_ACCESSORY_FAMILIES.map(family => getEquipmentAccessorySetSummary(family.id, equippedAccessories.value)))

  const ensureDailyPurchaseDay = () => {
    if (dailyPurchaseState.value.dayTag === currentDayTag.value) return
    dailyPurchaseState.value = { dayTag: currentDayTag.value, purchased: {} }
  }

  const nextInstanceId = () => {
    const id = `acc-${Date.now().toString(36)}-${nextInstanceSeq.value.toString(36)}`
    nextInstanceSeq.value += 1
    return id
  }

  const getAccessoryByInstanceId = (instanceId: string): OwnedEquipmentAccessory | null =>
    ownedAccessories.value.find(accessory => accessory.instanceId === instanceId) ?? null

  const isAccessoryEquipped = (instanceId: string): boolean =>
    Object.values(equippedSlots.value).some(value => value === instanceId)

  const clampPlayerHpToCurrentMax = () => {
    const playerStore = usePlayerStore()
    playerStore.hp = Math.min(playerStore.hp, playerStore.getMaxHp())
  }

  const normalizeAccessory = (entry: unknown): OwnedEquipmentAccessory | null => {
    if (!entry || typeof entry !== 'object') return null
    const raw = entry as Partial<OwnedEquipmentAccessory>
    const defId = typeof raw.defId === 'string' ? raw.defId as EquipmentAccessorySlotId : ''
    const def = getEquipmentAccessoryDef(defId)
    if (!def) return null
    const tier = normalizeEquipmentAccessoryTier(raw.tier)
    const quality = normalizeEquipmentAccessoryQuality(raw.quality)
    const level = normalizeEquipmentAccessoryLevel(raw.level)
    const instanceId = typeof raw.instanceId === 'string' && raw.instanceId ? raw.instanceId : nextInstanceId()
    const source = typeof raw.source === 'string' ? raw.source as EquipmentAccessorySource : 'debug'
    return {
      instanceId,
      defId: def.id,
      tier,
      quality,
      level,
      source,
      locked: raw.locked === true ? true : undefined,
      upgradeInvestment: normalizeEquipmentAccessoryInvestment(raw.upgradeInvestment, level),
      createdAtDayTag: typeof raw.createdAtDayTag === 'string' ? raw.createdAtDayTag : ''
    }
  }

  const addAccessory = (
    defId: EquipmentAccessorySlotId,
    tier: EquipmentAccessoryTier = 1,
    quality: EquipmentAccessoryQuality = 'normal',
    source: EquipmentAccessorySource = 'debug',
    options: { level?: number; locked?: boolean; investment?: Partial<EquipmentAccessoryUpgradeInvestment> } = {}
  ): OwnedEquipmentAccessory | null => {
    const def = getEquipmentAccessoryDef(defId)
    if (!def) return null
    const level = normalizeEquipmentAccessoryLevel(options.level ?? 1)
    const accessory: OwnedEquipmentAccessory = {
      instanceId: nextInstanceId(),
      defId: def.id,
      tier: normalizeEquipmentAccessoryTier(tier),
      quality: normalizeEquipmentAccessoryQuality(quality),
      level,
      source,
      locked: options.locked === true ? true : undefined,
      upgradeInvestment: normalizeEquipmentAccessoryInvestment(options.investment ?? createEmptyAccessoryInvestment(), level),
      createdAtDayTag: currentDayTag.value
    }
    ownedAccessories.value.push(accessory)
    return accessory
  }

  const removeAccessoryByInstanceId = (instanceId: string): OwnedEquipmentAccessory | null => {
    const index = ownedAccessories.value.findIndex(accessory => accessory.instanceId === instanceId)
    if (index < 0) return null
    const [removed] = ownedAccessories.value.splice(index, 1)
    if (!removed) return null
    let removedEquippedAccessory = false
    for (const slotId of EQUIPMENT_ACCESSORY_SLOT_IDS) {
      if (equippedSlots.value[slotId] === instanceId) {
        equippedSlots.value[slotId] = null
        removedEquippedAccessory = true
      }
    }
    if (removedEquippedAccessory) clampPlayerHpToCurrentMax()
    return removed
  }

  const equipAccessory = (instanceId: string, slotId?: EquipmentAccessorySlotId): Result => {
    const accessory = getAccessoryByInstanceId(instanceId)
    if (!accessory) return { success: false, message: '找不到这件配件。' }
    const targetSlot = slotId ?? accessory.defId
    if (targetSlot !== accessory.defId) return { success: false, message: '这件配件不能装在这个槽位。' }
    equippedSlots.value[targetSlot] = instanceId
    clampPlayerHpToCurrentMax()
    return { success: true, message: `已装配${getEquipmentAccessoryDef(accessory.defId)?.name ?? '配件'}。` }
  }

  const unequipAccessory = (slotId: EquipmentAccessorySlotId): Result => {
    if (!EQUIPMENT_ACCESSORY_SLOT_IDS.includes(slotId)) return { success: false, message: '配件槽位不存在。' }
    equippedSlots.value[slotId] = null
    clampPlayerHpToCurrentMax()
    return { success: true, message: '已卸下配件。' }
  }

  const toggleAccessoryLock = (instanceId: string): Result => {
    const accessory = getAccessoryByInstanceId(instanceId)
    if (!accessory) return { success: false, message: '找不到这件配件。' }
    accessory.locked = accessory.locked ? undefined : true
    return { success: true, message: accessory.locked ? '已锁定配件。' : '已解除配件锁定。' }
  }

  const getAccessoryUpgradeInvestment = (instanceId: string): EquipmentAccessoryUpgradeInvestment =>
    cloneInvestment(getAccessoryByInstanceId(instanceId)?.upgradeInvestment)

  const refundUpgradeInvestment = (accessories: OwnedEquipmentAccessory[]): EquipmentAccessoryMaterialCost[] => mergeMaterialCosts(
    accessories.flatMap(accessory => [
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: accessory.upgradeInvestment.accessoryMaterial },
      { itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: accessory.upgradeInvestment.tuningStone }
    ])
  )

  const refundItems = (entries: EquipmentAccessoryMaterialCost[]): boolean => {
    const inventoryStore = useInventoryStore()
    const refunds = mergeMaterialCosts(entries)
    if (refunds.length === 0) return true
    return inventoryStore.addItemsExact(refunds.map(entry => ({ ...entry, quality: 'normal' as const })))
  }

  const hasMaterials = (entries: EquipmentAccessoryMaterialCost[]): boolean => {
    const inventoryStore = useInventoryStore()
    return mergeMaterialCosts(entries).every(entry => inventoryStore.getTotalItemCount(entry.itemId) >= entry.quantity)
  }

  const consumeMaterials = (entries: EquipmentAccessoryMaterialCost[]): boolean => {
    const inventoryStore = useInventoryStore()
    const normalized = mergeMaterialCosts(entries)
    if (!hasMaterials(normalized)) return false
    for (const entry of normalized) {
      if (!inventoryStore.removeItemAnywhere(entry.itemId, entry.quantity)) return false
    }
    return true
  }

  const previewAccessoryUpgrade = (instanceId: string): Result<{ cost?: ReturnType<typeof getEquipmentAccessoryUpgradeCost>; currentValue: Partial<Record<EquipmentAccessoryEffectKey, number>>; nextValue: Partial<Record<EquipmentAccessoryEffectKey, number>> }> => {
    const accessory = getAccessoryByInstanceId(instanceId)
    if (!accessory) return { success: false, message: '找不到这件配件。', currentValue: {}, nextValue: {} }
    if (accessory.level >= EQUIPMENT_ACCESSORY_MAX_LEVEL) {
      return { success: false, message: '这件配件已经调校到 20 级。', currentValue: getEquipmentAccessoryEffectSummary([accessory]), nextValue: getEquipmentAccessoryEffectSummary([accessory]) }
    }
    const cost = getEquipmentAccessoryUpgradeCost(accessory.level + 1)
    if (!cost) return { success: false, message: '缺少下一等级调校成本。', currentValue: {}, nextValue: {} }
    const nextAccessory = { ...accessory, level: accessory.level + 1 }
    return {
      success: true,
      message: `调校至 ${accessory.level + 1} 级需要${formatMaterialList([
        { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: cost.accessoryMaterial },
        { itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: cost.tuningStone },
        ...cost.extraItems
      ]) || '材料'}，另需${cost.money}文。`,
      cost,
      currentValue: getEquipmentAccessoryEffectSummary([accessory]),
      nextValue: getEquipmentAccessoryEffectSummary([nextAccessory])
    }
  }

  const canUpgradeAccessory = (instanceId: string): Result => {
    const preview = previewAccessoryUpgrade(instanceId)
    if (!preview.success || !preview.cost) return { success: false, message: preview.message }
    const playerStore = usePlayerStore()
    const costEntries = [
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: preview.cost.accessoryMaterial },
      { itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: preview.cost.tuningStone },
      ...preview.cost.extraItems
    ]
    if (playerStore.money < preview.cost.money) return { success: false, message: `铜钱不足，需要${preview.cost.money}文。` }
    if (!hasMaterials(costEntries)) return { success: false, message: '调校材料不足。' }
    return { success: true, message: '可以调校。' }
  }

  const upgradeAccessory = (instanceId: string): Result => {
    const accessory = getAccessoryByInstanceId(instanceId)
    if (!accessory) return { success: false, message: '找不到这件配件。' }
    const check = canUpgradeAccessory(instanceId)
    if (!check.success) return check
    const cost = getEquipmentAccessoryUpgradeCost(accessory.level + 1)
    if (!cost) return { success: false, message: '缺少下一等级调校成本。' }
    const playerStore = usePlayerStore()
    const entries = [
      { itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: cost.accessoryMaterial },
      { itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: cost.tuningStone },
      ...cost.extraItems
    ]
    if (!consumeMaterials(entries)) return { success: false, message: '调校材料不足。' }
    if (!playerStore.spendMoney(cost.money, 'system')) {
      refundItems(entries)
      return { success: false, message: `铜钱不足，需要${cost.money}文。` }
    }
    accessory.level += 1
    accessory.upgradeInvestment = {
      accessoryMaterial: accessory.upgradeInvestment.accessoryMaterial + cost.accessoryMaterial,
      tuningStone: accessory.upgradeInvestment.tuningStone + cost.tuningStone
    }
    return { success: true, message: `${getEquipmentAccessoryDef(accessory.defId)?.name ?? '配件'}已调校至 ${accessory.level} 级。` }
  }

  const previewAccessoryDismantle = (instanceId: string): Result<{ refundItems: EquipmentAccessoryMaterialCost[] }> => {
    const accessory = getAccessoryByInstanceId(instanceId)
    if (!accessory) return { success: false, message: '找不到这件配件。', refundItems: [] }
    if (accessory.locked) return { success: false, message: '锁定的配件不能拆解。', refundItems: [] }
    if (isAccessoryEquipped(instanceId)) return { success: false, message: '已装配的配件不能拆解。', refundItems: [] }
    const refunds = mergeMaterialCosts([
      ...refundUpgradeInvestment([accessory]),
      ...getEquipmentAccessoryBaseDismantleRefund(accessory.tier, accessory.quality)
    ])
    return {
      success: true,
      message: refunds.length > 0 ? `拆解可返还${formatMaterialList(refunds)}。` : '拆解不会返还材料。',
      refundItems: refunds
    }
  }

  const dismantleAccessory = (instanceId: string): Result<{ refundItems: EquipmentAccessoryMaterialCost[] }> => {
    const preview = previewAccessoryDismantle(instanceId)
    if (!preview.success) return preview
    const removed = removeAccessoryByInstanceId(instanceId)
    if (!removed) return { success: false, message: '拆解失败，配件已不存在。', refundItems: [] }
    if (!refundItems(preview.refundItems)) {
      ownedAccessories.value.push(removed)
      return { success: false, message: '背包空间不足，拆解返材失败。', refundItems: [] }
    }
    return { success: true, message: preview.message, refundItems: preview.refundItems }
  }

  const isRecipeUnlocked = (tier: EquipmentAccessoryTier): boolean => {
    const npcStore = useNpcStore()
    if (tier === 1) return true
    if (tier === 2) return unlockedBlueprints.value.includes(2) || npcStore.isNpcFunctionEffectUnlocked('forge_success_boost')
    if (tier === 4) return unlockedBlueprints.value.includes(4)
    return false
  }

  const craftAccessory = (defId: EquipmentAccessorySlotId, tier: EquipmentAccessoryTier = 1): Result<{ accessory?: OwnedEquipmentAccessory }> => {
    const recipe = getEquipmentAccessoryRecipe(defId, tier)
    if (!recipe) return { success: false, message: '暂时不能打造这件配件。' }
    if (!isRecipeUnlocked(recipe.tier)) return { success: false, message: '还没有解锁这阶配件的打造蓝图。' }
    const playerStore = usePlayerStore()
    if (playerStore.money < recipe.moneyCost) return { success: false, message: `铜钱不足，需要${recipe.moneyCost}文。` }
    if (!hasMaterials(recipe.materialCosts)) return { success: false, message: '打造材料不足。' }
    if (!consumeMaterials(recipe.materialCosts)) return { success: false, message: '打造材料不足。' }
    if (!playerStore.spendMoney(recipe.moneyCost, 'system')) {
      refundItems(recipe.materialCosts)
      return { success: false, message: `铜钱不足，需要${recipe.moneyCost}文。` }
    }
    const quality = rollWeightedQuality(recipe.qualityRolls)
    const source: EquipmentAccessorySource = recipe.unlock === 'blueprint' ? 'blueprint' : 'workshop'
    const accessory = addAccessory(defId, recipe.tier, quality, source)
    if (!accessory) {
      refundItems(recipe.materialCosts)
      return { success: false, message: '打造失败，配件配置不存在。' }
    }
    return { success: true, message: `打造出${EQUIPMENT_ACCESSORY_TIER_LABELS[accessory.tier]}${EQUIPMENT_ACCESSORY_QUALITY_LABELS[accessory.quality]}${getEquipmentAccessoryDef(accessory.defId)?.name ?? '配件'}。`, accessory }
  }

  const rollMineAccessoryDrop = (floor: number): OwnedEquipmentAccessory | null => {
    const safeFloor = Math.max(1, Math.floor(Number(floor) || 1))
    let tier: EquipmentAccessoryTier | null = null
    if (safeFloor >= 95 && Math.random() < 0.025) tier = 3
    else if (safeFloor >= 45 && Math.random() < 0.08) tier = 2
    else if (safeFloor >= 10 && Math.random() < 0.12) tier = 1
    const npcStore = useNpcStore()
    if (!tier && npcStore.isNpcFunctionEffectUnlocked('mine_floor_hint')) {
      if (safeFloor >= 95 && Math.random() < 0.01) tier = 3
      else if (safeFloor >= 45 && Math.random() < 0.02) tier = 2
    }
    if (!tier) return null
    const def = EQUIPMENT_ACCESSORY_DEFS[Math.floor(Math.random() * EQUIPMENT_ACCESSORY_DEFS.length)]
    if (!def) return null
    const quality: EquipmentAccessoryQuality = Math.random() < (tier === 1 ? 0.18 : 0.1) ? 'fine' : 'normal'
    return addAccessory(def.id, tier, quality, tier === 3 ? 'deep_mine' : 'mine')
  }

  const grantMineAccessoryMaterials = (floor: number): EquipmentAccessoryMaterialCost[] => {
    const safeFloor = Math.max(1, Math.floor(Number(floor) || 1))
    const quantity = safeFloor >= 90 ? 7 : safeFloor >= 50 ? 5 : safeFloor >= 20 ? 3 : 1
    const npcBonus = useNpcStore().isNpcFunctionEffectUnlocked('mine_floor_hint') && safeFloor >= 45 ? 1 : 0
    const entries: EquipmentAccessoryMaterialCost[] = [{ itemId: EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: quantity + npcBonus }]
    if (safeFloor >= 80 && Math.random() < 0.35) entries.push({ itemId: EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: 1 })
    refundItems(entries)
    return entries
  }

  const unlockBlueprintTier = (tier: EquipmentAccessoryTier): Result => {
    if (!EQUIPMENT_ACCESSORY_TIERS.includes(tier)) return { success: false, message: '蓝图阶级不存在。' }
    if (unlockedBlueprints.value.includes(tier)) return { success: true, message: '这张蓝图已经解锁。' }
    unlockedBlueprints.value = [...unlockedBlueprints.value, tier].sort((left, right) => left - right)
    return { success: true, message: `已解锁${EQUIPMENT_ACCESSORY_TIER_LABELS[tier]}配件蓝图。` }
  }

  const buyDailyAccessoryMaterial = (purchaseId: string, quantity = 1): Result => {
    ensureDailyPurchaseDay()
    const offer = EQUIPMENT_ACCESSORY_DAILY_PURCHASES.find(entry => entry.id === purchaseId)
    if (!offer) return { success: false, message: '今日没有这项配件材料。' }
    const amount = Math.max(1, Math.floor(Number(quantity) || 1))
    const used = dailyPurchaseState.value.purchased[purchaseId] ?? 0
    const available = Math.max(0, offer.dailyLimit - used)
    if (amount > available) return { success: false, message: `今日${offer.label}还可购买 ${available} 份。` }
    const totalPrice = offer.unitPrice * amount
    const playerStore = usePlayerStore()
    if (playerStore.money < totalPrice) return { success: false, message: `铜钱不足，需要${totalPrice}文。` }
    const inventoryStore = useInventoryStore()
    if (!inventoryStore.canAddItem(offer.itemId, amount)) return { success: false, message: '背包空间不足。' }
    if (!playerStore.spendMoney(totalPrice, 'system')) return { success: false, message: `铜钱不足，需要${totalPrice}文。` }
    if (!inventoryStore.addItemExact(offer.itemId, amount)) {
      playerStore.earnMoney(totalPrice, { countAsEarned: false, system: 'system' })
      return { success: false, message: '购买失败，已返还铜钱。' }
    }
    dailyPurchaseState.value.purchased[purchaseId] = used + amount
    return { success: true, message: `购入${offer.label}×${amount}。` }
  }

  const canFuseAccessories = (instanceIds: string[]): Result<{ materials?: OwnedEquipmentAccessory[] }> => {
    const ids = [...new Set(instanceIds)]
    if (ids.length !== 3) return { success: false, message: '需要选择 3 件不同的同名配件。' }
    const materials = ids.map(getAccessoryByInstanceId)
    if (materials.some(accessory => !accessory)) return { success: false, message: '合成材料不存在。' }
    const list = materials as OwnedEquipmentAccessory[]
    if (list.some(accessory => accessory.locked)) return { success: false, message: '锁定的配件不能参与合成。' }
    if (list.some(accessory => isAccessoryEquipped(accessory.instanceId))) return { success: false, message: '已装配的配件不能参与合成。' }
    const first = list[0]!
    if (first.quality === 'supreme') return { success: false, message: '极品配件已经不能继续升品。' }
    if (!list.every(accessory => accessory.defId === first.defId && accessory.tier === first.tier && accessory.quality === first.quality)) {
      return { success: false, message: '必须选择同名、同阶、同品质的 3 件配件。' }
    }
    const rule = getEquipmentAccessoryFusionRule(first.tier, first.quality)
    if (!rule) return { success: false, message: '缺少这组配件的合成规则。' }
    return { success: true, message: '可以合成。', materials: list }
  }

  const previewAccessoryFusion = (instanceIds: string[]): Result<{
    materials?: OwnedEquipmentAccessory[]
    targetQuality?: EquipmentAccessoryQuality
    successRate?: number
    pity?: number
    pityThreshold?: number
    refundOnSuccess?: EquipmentAccessoryMaterialCost[]
  }> => {
    const check = canFuseAccessories(instanceIds)
    if (!check.success || !check.materials) return check
    const first = check.materials[0]!
    const rule = getEquipmentAccessoryFusionRule(first.tier, first.quality)
    if (!rule) return { success: false, message: '缺少这组配件的合成规则。' }
    const pityKey = buildEquipmentAccessoryPityKey(first.defId, first.tier, rule.toQuality)
    const pity = fusionPityState.value[pityKey] ?? 0
    return {
      success: true,
      message: `目标：${EQUIPMENT_ACCESSORY_TIER_LABELS[first.tier]}${EQUIPMENT_ACCESSORY_QUALITY_LABELS[rule.toQuality]}${getEquipmentAccessoryDef(first.defId)?.name ?? '配件'}。`,
      materials: check.materials,
      targetQuality: rule.toQuality,
      successRate: pity >= rule.pityThreshold ? 1 : rule.successRate,
      pity,
      pityThreshold: rule.pityThreshold,
      refundOnSuccess: refundUpgradeInvestment(check.materials)
    }
  }

  const refundFusionConsumedUpgradeMaterials = (materials: OwnedEquipmentAccessory[]): EquipmentAccessoryMaterialCost[] => {
    const refunds = refundUpgradeInvestment(materials)
    refundItems(refunds)
    return refunds
  }

  const fuseAccessories = (
    instanceIds: string[],
    options: { useProtection?: boolean; forceOutcome?: FusionOutcome } = {}
  ): Result<{ accessory?: OwnedEquipmentAccessory; consumed: string[]; returned?: OwnedEquipmentAccessory; refunds: EquipmentAccessoryMaterialCost[] }> => {
    const preview = previewAccessoryFusion(instanceIds)
    if (!preview.success || !preview.materials || !preview.targetQuality) {
      return { success: false, message: preview.message, consumed: [], refunds: [] }
    }
    const first = preview.materials[0]!
    const rule = getEquipmentAccessoryFusionRule(first.tier, first.quality)
    if (!rule) return { success: false, message: '缺少这组配件的合成规则。', consumed: [], refunds: [] }
    const inventoryStore = useInventoryStore()
    if (options.useProtection && inventoryStore.getTotalItemCount(EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID) < 1) {
      return { success: false, message: '稳固石不足。', consumed: [], refunds: [] }
    }

    const pityKey = buildEquipmentAccessoryPityKey(first.defId, first.tier, rule.toQuality)
    const pity = fusionPityState.value[pityKey] ?? 0
    const success = options.forceOutcome
      ? options.forceOutcome === 'success'
      : pity >= rule.pityThreshold || Math.random() < rule.successRate

    if (options.useProtection && !inventoryStore.removeItemAnywhere(EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID, 1)) {
      return { success: false, message: '稳固石不足。', consumed: [], refunds: [] }
    }

    const consumedMaterials = success || !options.useProtection
      ? preview.materials
      : preview.materials.slice(0, 2)
    const returned = success || !options.useProtection ? undefined : preview.materials[2]
    const consumedIds = consumedMaterials.map(accessory => accessory.instanceId)
    const refunds = refundFusionConsumedUpgradeMaterials(consumedMaterials)
    for (const id of consumedIds) removeAccessoryByInstanceId(id)

    if (success) {
      fusionPityState.value[pityKey] = 0
      const accessory = addAccessory(first.defId, first.tier, rule.toQuality, 'fusion', { level: 1 })
      return {
        success: true,
        message: `合成成功，获得${EQUIPMENT_ACCESSORY_QUALITY_LABELS[rule.toQuality]}${getEquipmentAccessoryDef(first.defId)?.name ?? '配件'}。${refunds.length ? `返还${formatMaterialList(refunds)}。` : ''}`,
        accessory: accessory ?? undefined,
        consumed: consumedIds,
        refunds
      }
    }

    fusionPityState.value[pityKey] = Math.min(rule.pityThreshold, pity + 1)
    return {
      success: true,
      message: options.useProtection
        ? `合成失败，稳固石保住了 1 件材料配件。${refunds.length ? `返还${formatMaterialList(refunds)}。` : ''}`
        : `合成失败，3 件材料配件已消耗。${refunds.length ? `返还${formatMaterialList(refunds)}。` : ''}`,
      consumed: consumedIds,
      returned,
      refunds
    }
  }

  const getAccessoryEffectValue = (effectKey: EquipmentAccessoryEffectKey): number => effectSummary.value[effectKey] ?? 0

  const getAccessorySetSummary = (familyId: EquipmentAccessoryFamilyId) =>
    setSummaries.value.find(summary => summary.familyId === familyId) ?? getEquipmentAccessorySetSummary(familyId, [])

  const serialize = (): EquipmentAccessorySaveData => ({
    saveVersion: 1,
    ownedAccessories: ownedAccessories.value.map(accessory => ({
      ...accessory,
      upgradeInvestment: cloneInvestment(accessory.upgradeInvestment)
    })),
    equippedSlots: { ...equippedSlots.value },
    unlockedBlueprints: [...unlockedBlueprints.value],
    fusionPityState: { ...fusionPityState.value },
    dailyPurchaseState: {
      dayTag: dailyPurchaseState.value.dayTag,
      purchased: { ...dailyPurchaseState.value.purchased }
    },
    nextInstanceSeq: nextInstanceSeq.value
  })

  const deserialize = (data?: Partial<EquipmentAccessorySaveData> | null) => {
    const defaults = createDefaultEquipmentAccessorySaveData()
    const normalizedAccessories = Array.isArray(data?.ownedAccessories)
      ? data.ownedAccessories.map(normalizeAccessory).filter((accessory): accessory is OwnedEquipmentAccessory => !!accessory)
      : []
    const seenIds = new Set<string>()
    ownedAccessories.value = normalizedAccessories.map(accessory => {
      let instanceId = accessory.instanceId
      while (seenIds.has(instanceId)) instanceId = nextInstanceId()
      seenIds.add(instanceId)
      return { ...accessory, instanceId }
    })

    const nextSlots = { ...defaults.equippedSlots }
    const rawSlots = data?.equippedSlots && typeof data.equippedSlots === 'object' ? data.equippedSlots : {}
    for (const slotId of EQUIPMENT_ACCESSORY_SLOT_IDS) {
      const instanceId = rawSlots[slotId]
      const accessory = typeof instanceId === 'string' ? getAccessoryByInstanceId(instanceId) : null
      nextSlots[slotId] = accessory?.defId === slotId ? instanceId : null
    }
    equippedSlots.value = nextSlots

    unlockedBlueprints.value = [...new Set(
      (Array.isArray(data?.unlockedBlueprints) ? data!.unlockedBlueprints : [1])
        .map(tier => normalizeEquipmentAccessoryTier(tier))
    )].sort((left, right) => left - right)
    if (!unlockedBlueprints.value.includes(1)) unlockedBlueprints.value.unshift(1)

    const rawPity = data?.fusionPityState && typeof data.fusionPityState === 'object' ? data.fusionPityState : {}
    fusionPityState.value = Object.fromEntries(
      Object.entries(rawPity)
        .filter(([key]) => {
          const [defId, tier, quality] = key.split(':')
          return !!getEquipmentAccessoryDef(defId ?? '') &&
            EQUIPMENT_ACCESSORY_TIERS.includes(Number(tier) as EquipmentAccessoryTier) &&
            EQUIPMENT_ACCESSORY_QUALITIES.includes(quality as EquipmentAccessoryQuality)
        })
        .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))])
    )

    const rawDaily = data?.dailyPurchaseState
    dailyPurchaseState.value = {
      dayTag: typeof rawDaily?.dayTag === 'string' ? rawDaily.dayTag : '',
      purchased: rawDaily?.purchased && typeof rawDaily.purchased === 'object'
        ? Object.fromEntries(
            Object.entries(rawDaily.purchased)
              .filter(([purchaseId]) => EQUIPMENT_ACCESSORY_DAILY_PURCHASES.some(offer => offer.id === purchaseId))
              .map(([purchaseId, amount]) => [purchaseId, Math.max(0, Math.floor(Number(amount) || 0))])
          )
        : {}
    }
    nextInstanceSeq.value = Math.max(defaults.nextInstanceSeq, Math.floor(Number(data?.nextInstanceSeq) || defaults.nextInstanceSeq), ownedAccessories.value.length + 1)
  }

  const $reset = () => {
    deserialize(createDefaultEquipmentAccessorySaveData())
  }

  return {
    ownedAccessories,
    sortedOwnedAccessories,
    equippedSlots,
    equippedAccessories,
    unlockedBlueprints,
    fusionPityState,
    dailyPurchaseState,
    effectSummary,
    setSummaries,
    currentDayTag,
    addAccessory,
    getAccessoryByInstanceId,
    isAccessoryEquipped,
    equipAccessory,
    unequipAccessory,
    toggleAccessoryLock,
    getAccessoryUpgradeInvestment,
    refundUpgradeInvestment,
    previewAccessoryUpgrade,
    canUpgradeAccessory,
    upgradeAccessory,
    previewAccessoryDismantle,
    dismantleAccessory,
    craftAccessory,
    rollMineAccessoryDrop,
    grantMineAccessoryMaterials,
    unlockBlueprintTier,
    buyDailyAccessoryMaterial,
    canFuseAccessories,
    previewAccessoryFusion,
    refundFusionConsumedUpgradeMaterials,
    fuseAccessories,
    getAccessoryEffectValue,
    getAccessorySetSummary,
    serialize,
    deserialize,
    $reset
  }
})
