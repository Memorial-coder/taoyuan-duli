export type FractionalStaminaCostResult = {
  cost: number
  discountCredit: number
}

const normalizeFiniteNumber = (value: number, fallback = 0): number => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

export const normalizeFractionalStaminaDiscountCredit = (value: number): number => {
  return Math.max(0, Math.min(0.999999, normalizeFiniteNumber(value)))
}

export const resolveFractionalStaminaCost = (
  rawCost: number,
  discountCredit: number = 0
): FractionalStaminaCostResult => {
  const normalizedCost = Math.max(0, normalizeFiniteNumber(rawCost))
  if (normalizedCost <= 0) {
    return { cost: 0, discountCredit: 0 }
  }

  const integerCost = Math.max(1, Math.ceil(normalizedCost))
  const nextCredit = normalizeFractionalStaminaDiscountCredit(discountCredit) + (integerCost - normalizedCost)
  const discount = Math.min(integerCost, Math.floor(nextCredit + 1e-9))

  return {
    cost: integerCost - discount,
    discountCredit: normalizeFractionalStaminaDiscountCredit(nextCredit - discount)
  }
}
