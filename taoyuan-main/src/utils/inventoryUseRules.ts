import type { ItemDef } from '@/types'

type RecoverableItemDef = Pick<ItemDef, 'edible' | 'name' | 'staminaRestore' | 'healthRestore'>

export interface ItemRecoveryVitals {
  stamina: number
  maxStamina: number
  hp: number
  maxHp: number
}

export interface ItemRecoveryPlan {
  hasRecovery: boolean
  hasStaminaRestore: boolean
  hasHealthRestore: boolean
  staminaRestore: number
  healthRestore: number
  actualStaminaRestore: number
  actualHealthRestore: number
  canUse: boolean
  blockedMessage: string
}

const normalizeRecoveryAmount = (value: number | undefined): number => Math.max(0, Math.floor(value ?? 0))

const getBaseRecovery = (def: RecoverableItemDef | null | undefined) => {
  if (!def?.edible) {
    return { staminaRestore: 0, healthRestore: 0 }
  }
  return {
    staminaRestore: normalizeRecoveryAmount(def.staminaRestore),
    healthRestore: normalizeRecoveryAmount(def.healthRestore)
  }
}

export const hasItemRecovery = (def: RecoverableItemDef | null | undefined): boolean => {
  const recovery = getBaseRecovery(def)
  return recovery.staminaRestore > 0 || recovery.healthRestore > 0
}

export const getItemRecoveryDisplayParts = (def: RecoverableItemDef | null | undefined): string[] => {
  const recovery = getBaseRecovery(def)
  const parts: string[] = []
  if (recovery.staminaRestore > 0) parts.push(`+${recovery.staminaRestore}体力`)
  if (recovery.healthRestore > 0) parts.push(recovery.healthRestore >= 999 ? '+全部HP' : `+${recovery.healthRestore}HP`)
  return parts
}

export const getItemRecoveryPlan = (
  def: RecoverableItemDef | null | undefined,
  vitals: ItemRecoveryVitals,
  multiplier = 1
): ItemRecoveryPlan => {
  const recovery = getBaseRecovery(def)
  const hasStaminaRestore = recovery.staminaRestore > 0
  const hasHealthRestore = recovery.healthRestore > 0
  const staminaRestore = hasStaminaRestore ? Math.floor(recovery.staminaRestore * multiplier) : 0
  const healthRestore = hasHealthRestore
    ? recovery.healthRestore >= 999
      ? Math.max(0, Math.floor(vitals.maxHp))
      : Math.floor(recovery.healthRestore * multiplier)
    : 0
  const staminaMissing = Math.max(0, Math.floor(vitals.maxStamina) - Math.floor(vitals.stamina))
  const hpMissing = Math.max(0, Math.floor(vitals.maxHp) - Math.floor(vitals.hp))
  const actualStaminaRestore = Math.min(staminaRestore, staminaMissing)
  const actualHealthRestore = Math.min(healthRestore, hpMissing)
  const canUse =
    (hasStaminaRestore && actualStaminaRestore > 0) ||
    (hasHealthRestore && actualHealthRestore > 0)

  let blockedMessage = ''
  if (hasStaminaRestore && hasHealthRestore) {
    blockedMessage = '体力和生命值都已满，不需要食用。'
  } else if (hasStaminaRestore) {
    blockedMessage = '体力已满，不需要食用。'
  } else if (hasHealthRestore) {
    blockedMessage = '生命值已满，不需要食用。'
  }

  return {
    hasRecovery: hasStaminaRestore || hasHealthRestore,
    hasStaminaRestore,
    hasHealthRestore,
    staminaRestore,
    healthRestore,
    actualStaminaRestore,
    actualHealthRestore,
    canUse,
    blockedMessage
  }
}

export interface ApplyInventoryRecoveryItemOptions {
  def: RecoverableItemDef
  vitals: ItemRecoveryVitals
  multiplier?: number
  removeItem: () => boolean
  restoreStamina: (amount: number) => void
  restoreHealth: (amount: number) => void
}

export const applyInventoryRecoveryItem = ({
  def,
  vitals,
  multiplier = 1,
  removeItem,
  restoreStamina,
  restoreHealth
}: ApplyInventoryRecoveryItemOptions): { success: boolean; consumed: boolean; message: string; plan: ItemRecoveryPlan } => {
  const plan = getItemRecoveryPlan(def, vitals, multiplier)
  if (!plan.hasRecovery) {
    return { success: false, consumed: false, message: '这个物品不能食用。', plan }
  }
  if (!plan.canUse) {
    return { success: false, consumed: false, message: plan.blockedMessage, plan }
  }
  if (!removeItem()) {
    return { success: false, consumed: false, message: '背包中没有这个物品。', plan }
  }

  const recoveredParts: string[] = []
  if (plan.hasStaminaRestore) {
    restoreStamina(plan.staminaRestore)
    if (plan.actualStaminaRestore > 0) recoveredParts.push(`${plan.actualStaminaRestore}体力`)
  }
  if (plan.hasHealthRestore) {
    restoreHealth(plan.healthRestore)
    if (plan.actualHealthRestore > 0) recoveredParts.push(`${plan.actualHealthRestore}生命值`)
  }

  return {
    success: true,
    consumed: true,
    message: `食用了${def.name}，恢复${recoveredParts.join('、')}。`,
    plan
  }
}
