export const INVENTORY_INITIAL_CAPACITY = 24
export const INVENTORY_REGULAR_MAX_CAPACITY = 500
export const INVENTORY_EXPAND_STEP = 4
export const INVENTORY_TEMP_CAPACITY = 10

const BASE_EXPANSION_PRICE = 500
const BASE_EXPANSION_PRICE_STEP = 500

const normalizeCapacity = (capacity: number): number => {
  const normalized = Number(capacity)
  return Number.isFinite(normalized) ? normalized : INVENTORY_INITIAL_CAPACITY
}

const getStageStep = (capacity: number, stageStart: number): number => {
  return Math.floor((Math.max(stageStart, capacity) - stageStart) / INVENTORY_EXPAND_STEP) + 1
}

export const getNextInventoryCapacity = (capacity: number): number => {
  const current = Math.max(0, Math.floor(normalizeCapacity(capacity)))
  if (current >= INVENTORY_REGULAR_MAX_CAPACITY) return current
  return Math.min(INVENTORY_REGULAR_MAX_CAPACITY, current + INVENTORY_EXPAND_STEP)
}

export const getInventoryExpansionSurcharge = (capacity: number): number => {
  const current = Math.floor(Math.max(INVENTORY_INITIAL_CAPACITY, normalizeCapacity(capacity)))
  if (current >= 400) return 37500 + getStageStep(current, 400) * 2000
  if (current >= 300) return 12500 + getStageStep(current, 300) * 1000
  if (current >= 200) return getStageStep(current, 200) * 500
  return 0
}

export const getInventoryExpansionPrice = (capacity: number): number => {
  const current = Math.max(INVENTORY_INITIAL_CAPACITY, normalizeCapacity(capacity))
  const level = (current - INVENTORY_INITIAL_CAPACITY) / INVENTORY_EXPAND_STEP
  return BASE_EXPANSION_PRICE + level * BASE_EXPANSION_PRICE_STEP + getInventoryExpansionSurcharge(current)
}
