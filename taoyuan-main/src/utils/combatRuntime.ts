export interface CombatAttackProfile {
  attack: number
  critRate: number
  critMultiplier?: number
  attackMultiplier?: number
  extraStrikeChance?: number
  extraStrikeMultiplier?: number
  stunChance?: number
  lifesteal?: number
}

export interface CombatDefenseProfile {
  flatReduction?: number
  damageMultipliers?: number[]
  dodgeRate?: number
}

export interface PlayerCombatBuildInput {
  weaponAttack: number
  weaponCritRate: number
  weaponType?: string | null
  enchantSpecial?: string | null
  combatLevel: number
  allSkillsBuff: number
  ringAttackBonus: number
  ringCritBonus: number
  ringLuck: number
  ringDefenseBonus: number
  ringVampiric: number
  guildAttackBonus: number
  guildBadgeBonusAttack: number
  guildDefenseBonus: number
  cookingDefenseReduction: number
  cookingDefenseFlatBonus: number
  perk5?: string | null
  perk10?: string | null
  perk15?: string | null
  perk20?: string | null
}

export interface BuiltPlayerCombatRuntime {
  attack: CombatAttackProfile
  defense: CombatDefenseProfile
  defendDefense: CombatDefenseProfile
  defendHealFlat: number
  defendHealRatio: number
  killHealRatio: number
}

export interface CombatAttackOutcome {
  damage: number
  extraDamage: number
  totalDamage: number
  isCrit: boolean
  didExtraStrike: boolean
  didStun: boolean
}

const toFiniteNumber = (value: number | undefined | null, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback

export const clampChance = (value: number | undefined | null) => Math.min(1, Math.max(0, toFiniteNumber(value, 0)))

export const multiplyDamageModifiers = (modifiers: Array<number | undefined | null>): number =>
  modifiers.reduce<number>((product, modifier) => product * Math.max(0, toFiniteNumber(modifier, 1)), 1)

export const calculateAttackDamage = ({
  attack,
  defense,
  modifiers = [],
  minimumDamage = 1
}: {
  attack: number
  defense: number
  modifiers?: Array<number | undefined | null>
  minimumDamage?: number
}): number => Math.max(minimumDamage ?? 1, Math.floor(Math.max(0, attack - defense) * multiplyDamageModifiers(modifiers)))

export const calculateIncomingDamage = ({
  incomingAttack,
  flatReduction = 0,
  modifiers = [],
  minimumDamage = 1
}: {
  incomingAttack: number
  flatReduction?: number
  modifiers?: Array<number | undefined | null>
  minimumDamage?: number
}): number => Math.max(minimumDamage ?? 1, Math.floor(Math.max(0, incomingAttack - flatReduction) * multiplyDamageModifiers(modifiers)))

export const rollAttackOutcome = (
  attacker: CombatAttackProfile,
  targetDefense: number,
  rng: () => number = Math.random
): CombatAttackOutcome => {
  const didCrit = rng() < clampChance(attacker.critRate)
  const critMultiplier = Math.max(1, toFiniteNumber(attacker.critMultiplier, 1.5))
  const attackMultiplier = Math.max(0, toFiniteNumber(attacker.attackMultiplier, 1))
  const damage = calculateAttackDamage({
    attack: attacker.attack,
    defense: targetDefense,
    modifiers: [attackMultiplier, didCrit ? critMultiplier : 1]
  })
  const didExtraStrike = rng() < clampChance(attacker.extraStrikeChance)
  const extraStrikeMultiplier = Math.max(0, toFiniteNumber(attacker.extraStrikeMultiplier, 0.5))
  const extraDamage = didExtraStrike ? Math.max(1, Math.floor(damage * extraStrikeMultiplier)) : 0
  return {
    damage,
    extraDamage,
    totalDamage: damage + extraDamage,
    isCrit: didCrit,
    didExtraStrike,
    didStun: rng() < clampChance(attacker.stunChance)
  }
}

export const getExpectedAttackDamage = (attacker: CombatAttackProfile, targetDefense: number) => {
  const attackMultiplier = Math.max(0, toFiniteNumber(attacker.attackMultiplier, 1))
  const critRate = clampChance(attacker.critRate)
  const critMultiplier = Math.max(1, toFiniteNumber(attacker.critMultiplier, 1.5))
  const baseDamage = calculateAttackDamage({
    attack: attacker.attack,
    defense: targetDefense,
    modifiers: [attackMultiplier]
  })
  const critDamage = calculateAttackDamage({
    attack: attacker.attack,
    defense: targetDefense,
    modifiers: [attackMultiplier, critMultiplier]
  })
  const averageMainHit = baseDamage * (1 - critRate) + critDamage * critRate
  return averageMainHit * (1 + clampChance(attacker.extraStrikeChance) * Math.max(0, toFiniteNumber(attacker.extraStrikeMultiplier, 0.5)))
}

export const getExpectedIncomingDamage = (
  incomingAttack: number,
  defense: CombatDefenseProfile,
  hitCountMultiplier = 1
) => {
  const baseDamage = calculateIncomingDamage({
    incomingAttack,
    flatReduction: defense.flatReduction,
    modifiers: defense.damageMultipliers ?? []
  })
  const dodgeMitigation = 1 - clampChance(defense.dodgeRate) * 0.75
  return Math.max(1, Math.ceil(baseDamage * Math.max(0, hitCountMultiplier) * dodgeMitigation))
}

export const getLifestealHeal = (damage: number, lifesteal: number | undefined | null) =>
  Math.max(0, Math.floor(Math.max(0, damage) * clampChance(lifesteal)))

export const getDefendHeal = ({
  maxHp,
  healFlat,
  healRatio
}: {
  maxHp: number
  healFlat?: number
  healRatio?: number
}) => Math.max(0, Math.floor(Math.max(0, maxHp) * Math.max(0, toFiniteNumber(healRatio, 0))) + Math.max(0, Math.floor(toFiniteNumber(healFlat, 0))))

export const buildPlayerCombatRuntime = (input: PlayerCombatBuildInput): BuiltPlayerCombatRuntime => {
  const perk5 = input.perk5 ?? ''
  const perk10 = input.perk10 ?? ''
  const perk15 = input.perk15 ?? ''
  const perk20 = input.perk20 ?? ''
  const enchantSpecial = input.enchantSpecial ?? ''
  const weaponType = input.weaponType ?? ''

  const attack = Math.max(
    0,
    input.weaponAttack +
      (input.combatLevel + input.allSkillsBuff) * 2 +
      input.ringAttackBonus +
      input.guildBadgeBonusAttack +
      input.guildAttackBonus
  )

  const attackMultiplier =
    perk20 === 'war_god' || perk20 === 'slaughter_king'
      ? 2
      : perk15 === 'berserker' || perk15 === 'sword_saint'
        ? 1.55
        : perk10 === 'brute'
          ? 1.25
          : 1

  const dodgeRate =
    perk20 === 'shadow_sovereign'
      ? 0.8
      : perk15 === 'phantom_blade'
        ? 0.4
        : perk10 === 'acrobat'
          ? 0.25
          : 0

  const sturdyMultiplier = enchantSpecial === 'sturdy' ? 0.85 : 1
  const baseDefenseMultipliers = [
    1 - input.cookingDefenseReduction,
    sturdyMultiplier,
    1 - input.ringDefenseBonus,
    1 - input.guildDefenseBonus
  ]
  const attackDefenseReduction =
    perk5 === 'fighter' ||
    perk15 === 'sword_saint' ||
    perk15 === 'berserker' ||
    perk20 === 'war_god' ||
    perk20 === 'slaughter_king'
      ? 0.15
      : 0
  const defendReduction =
    perk20 === 'indestructible' || perk20 === 'shadow_sovereign'
      ? 0.95
      : perk15 === 'iron_fortress' || perk15 === 'phantom_blade'
        ? 0.85
        : perk10 === 'tank'
          ? 0.7
          : 0.6

  return {
    attack: {
      attack,
      critRate: Math.max(0, input.weaponCritRate + input.ringCritBonus + input.ringLuck * 0.5),
      critMultiplier: 1.5,
      attackMultiplier,
      extraStrikeChance: weaponType === 'dagger' ? 0.25 : 0,
      extraStrikeMultiplier: weaponType === 'dagger' ? 0.5 : 0,
      stunChance: weaponType === 'club' ? 0.2 : 0,
      lifesteal: (enchantSpecial === 'vampiric' ? 0.15 : 0) + input.ringVampiric
    },
    defense: {
      flatReduction: input.cookingDefenseFlatBonus,
      damageMultipliers: [1 - attackDefenseReduction, ...baseDefenseMultipliers],
      dodgeRate
    },
    defendDefense: {
      flatReduction: input.cookingDefenseFlatBonus,
      damageMultipliers: [1 - defendReduction, ...baseDefenseMultipliers],
      dodgeRate
    },
    defendHealFlat:
      perk20 === 'indestructible' || perk20 === 'shadow_sovereign'
        ? 0
        : perk15 === 'iron_fortress' || perk15 === 'phantom_blade'
          ? 15
          : perk5 === 'defender'
            ? 5
            : 0,
    defendHealRatio: perk20 === 'indestructible' || perk20 === 'shadow_sovereign' ? 0.15 : 0,
    killHealRatio:
      perk20 === 'slaughter_king' || perk20 === 'war_god'
        ? 0.2
        : perk15 === 'berserker' || perk15 === 'sword_saint'
          ? 0.1
          : 0
  }
}
