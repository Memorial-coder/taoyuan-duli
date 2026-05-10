import { getEnchantmentById, getWeaponById } from '@/data/weapons'
import { JOURNEY_AWAKENINGS, JOURNEY_CAMP_MODULES, JOURNEY_ROUTE_PERMITS } from '@/data/journeyHub'
import type {
  EquipmentEffectType,
  JourneyBuildSnapshot,
  JourneyOutcomeModifiers,
  JourneyRequiredStats,
  RegionId,
  SkillType,
  WeaponType
} from '@/types'
import { useCookingStore } from './useCookingStore'
import { useGuildStore } from './useGuildStore'
import { useInventoryStore } from './useInventoryStore'
import { useMiningStore } from './useMiningStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'

type JourneyBuildTarget = {
  regionId: RegionId
  label: string
  journeyAffinities: SkillType[]
  weaponBias: WeaponType[]
  requiredStats: JourneyRequiredStats
}

type JourneyProgressionState = {
  journeyAwakenings: Record<string, boolean>
  journeyCampModules: Record<string, number>
  journeyRouteLicenses: Record<string, number>
}

type SkillPerkState = {
  perk5: unknown
  perk10: unknown
  perk15: unknown
  perk20: unknown
}

const JOURNEY_EFFECT_KEYS: EquipmentEffectType[] = [
  'attack_bonus',
  'crit_rate_bonus',
  'defense_bonus',
  'vampiric',
  'max_hp_bonus',
  'stamina_reduction',
  'exp_bonus',
  'luck',
  'travel_speed',
  'journey_stamina_reduction',
  'journey_scout_bonus',
  'journey_carry_bonus',
  'journey_hazard_resist',
  'journey_event_bonus',
  'camp_recovery_bonus',
  'boss_pressure_resist',
  'resource_find_bonus'
]

export const createEmptyJourneyOutcomeModifiers = (): JourneyOutcomeModifiers => ({
  staminaCostReduction: 0,
  scoutBonus: 0,
  carryBonus: 0,
  hazardResist: 0,
  eventBonus: 0,
  campRecoveryBonus: 0,
  bossPressureResist: 0,
  resourceFindBonus: 0,
  rewardMultiplier: 0,
  knowledgeBonus: 0,
  experienceMultiplier: 0,
  supplyBonus: {
    rations: 0,
    medicine: 0,
    utility: 0
  }
})

const mergeOutcome = (
  base: JourneyOutcomeModifiers,
  patch: Partial<JourneyOutcomeModifiers>
): JourneyOutcomeModifiers => ({
  ...base,
  ...patch,
  supplyBonus: {
    ...base.supplyBonus,
    ...(patch.supplyBonus ?? {})
  }
})

const addOutcome = (
  base: JourneyOutcomeModifiers,
  patch: Partial<JourneyOutcomeModifiers>
): JourneyOutcomeModifiers => ({
  ...base,
  staminaCostReduction: base.staminaCostReduction + (patch.staminaCostReduction ?? 0),
  scoutBonus: base.scoutBonus + (patch.scoutBonus ?? 0),
  carryBonus: base.carryBonus + (patch.carryBonus ?? 0),
  hazardResist: base.hazardResist + (patch.hazardResist ?? 0),
  eventBonus: base.eventBonus + (patch.eventBonus ?? 0),
  campRecoveryBonus: base.campRecoveryBonus + (patch.campRecoveryBonus ?? 0),
  bossPressureResist: base.bossPressureResist + (patch.bossPressureResist ?? 0),
  resourceFindBonus: base.resourceFindBonus + (patch.resourceFindBonus ?? 0),
  rewardMultiplier: base.rewardMultiplier + (patch.rewardMultiplier ?? 0),
  knowledgeBonus: base.knowledgeBonus + (patch.knowledgeBonus ?? 0),
  experienceMultiplier: base.experienceMultiplier + (patch.experienceMultiplier ?? 0),
  supplyBonus: {
    rations: base.supplyBonus.rations + (patch.supplyBonus?.rations ?? 0),
    medicine: base.supplyBonus.medicine + (patch.supplyBonus?.medicine ?? 0),
    utility: base.supplyBonus.utility + (patch.supplyBonus?.utility ?? 0)
  }
})

const countUnlockedPerks = (skill: SkillPerkState): number =>
  [skill.perk5, skill.perk10, skill.perk15, skill.perk20].filter(Boolean).length

const normalizeSupplyBonus = (supplyBonus?: Partial<JourneyOutcomeModifiers['supplyBonus']>) => ({
  rations: supplyBonus?.rations ?? 0,
  medicine: supplyBonus?.medicine ?? 0,
  utility: supplyBonus?.utility ?? 0
})

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const buildEquipmentBonuses = () => {
  const inventoryStore = useInventoryStore()
  return JOURNEY_EFFECT_KEYS.reduce<Partial<Record<EquipmentEffectType, number>>>((bucket, key) => {
    bucket[key] = inventoryStore.getRingEffectValue(key)
    return bucket
  }, {})
}

export const buildJourneyBuildSnapshot = (
  target: JourneyBuildTarget,
  progression: JourneyProgressionState
): JourneyBuildSnapshot => {
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const playerStore = usePlayerStore()
  const cookingStore = useCookingStore()
  const guildStore = useGuildStore()
  const miningStore = useMiningStore()

  const ownedWeapon = inventoryStore.getEquippedWeapon()
  const weaponDef = getWeaponById(ownedWeapon.defId)
  const enchantment = ownedWeapon.enchantmentId ? getEnchantmentById(ownedWeapon.enchantmentId) : null
  const weaponType = weaponDef?.type ?? 'club'
  const matchedWeaponBias = target.weaponBias.includes(weaponType)
  const equipmentBonuses = buildEquipmentBonuses()
  const outcomeBase = createEmptyJourneyOutcomeModifiers()
  let outcome = mergeOutcome(outcomeBase, {})

  const skillLevels: Record<SkillType, number> = {
    farming: skillStore.getSkill('farming').level,
    foraging: skillStore.getSkill('foraging').level,
    fishing: skillStore.getSkill('fishing').level,
    mining: skillStore.getSkill('mining').level,
    combat: skillStore.getSkill('combat').level
  }

  const skillContribution = (skillType: SkillType, favoredWeight: number, fallbackWeight: number) => {
    const skill = skillStore.getSkill(skillType)
    const affinityWeight = target.journeyAffinities.includes(skillType) ? favoredWeight : fallbackWeight
    const perkWeight = countUnlockedPerks(skill) * (target.journeyAffinities.includes(skillType) ? 1.8 : 0.75)
    return skill.level * affinityWeight + perkWeight
  }

  const combatValue = skillContribution('combat', 2.4, 1.1)
  const foragingValue = skillContribution('foraging', 2.2, 1)
  const fishingValue = skillContribution('fishing', 2.1, 0.9)
  const miningValue = skillContribution('mining', 2.3, 1)
  const farmingValue = skillContribution('farming', 2, 0.95)

  outcome = addOutcome(outcome, {
    staminaCostReduction: clamp(farmingValue / 220, 0, 0.18),
    scoutBonus: Math.floor(foragingValue * 0.9 + fishingValue * 0.55),
    carryBonus: Math.floor((miningValue + combatValue * 0.45 + farmingValue * 0.3) / 24),
    hazardResist: Math.floor(combatValue * 0.55 + miningValue * 0.45 + fishingValue * 0.25),
    eventBonus: clamp((foragingValue + fishingValue) / 220, 0, 0.18),
    campRecoveryBonus: Math.floor(farmingValue * 0.45 + fishingValue * 0.35 + combatValue * 0.2),
    bossPressureResist: clamp((combatValue + miningValue * 0.6) / 320, 0, 0.18),
    resourceFindBonus: clamp((foragingValue + miningValue + fishingValue * 0.35) / 260, 0, 0.22),
    rewardMultiplier: clamp((farmingValue + foragingValue * 0.5) / 320, 0, 0.12),
    knowledgeBonus: clamp((foragingValue + fishingValue * 0.4) / 360, 0, 0.16),
    experienceMultiplier: clamp((countUnlockedPerks(skillStore.getSkill('foraging')) + countUnlockedPerks(skillStore.getSkill('farming'))) / 60, 0, 0.08),
    supplyBonus: {
      rations: Math.floor(farmingValue / 36),
      medicine: Math.floor((fishingValue + combatValue * 0.3) / 52),
      utility: Math.floor(miningValue / 42)
    }
  })

  if (weaponType === 'sword') {
    outcome = addOutcome(outcome, {
      hazardResist: 4,
      bossPressureResist: 0.05,
      rewardMultiplier: 0.04
    })
  } else if (weaponType === 'dagger') {
    outcome = addOutcome(outcome, {
      scoutBonus: 8,
      eventBonus: 0.08,
      resourceFindBonus: 0.08
    })
  } else {
    outcome = addOutcome(outcome, {
      carryBonus: 1,
      hazardResist: 6,
      campRecoveryBonus: 6,
      bossPressureResist: 0.06
    })
  }

  if (matchedWeaponBias) {
    outcome = addOutcome(outcome, {
      scoutBonus: weaponType === 'dagger' ? 4 : 0,
      carryBonus: weaponType === 'club' ? 1 : 0,
      hazardResist: weaponType !== 'dagger' ? 3 : 0,
      bossPressureResist: weaponType !== 'dagger' ? 0.03 : 0,
      eventBonus: weaponType === 'dagger' ? 0.04 : 0,
      rewardMultiplier: weaponType === 'sword' ? 0.04 : 0
    })
  }

  outcome = addOutcome(outcome, {
    staminaCostReduction:
      (equipmentBonuses.stamina_reduction ?? 0) * 0.45 +
      (equipmentBonuses.journey_stamina_reduction ?? 0) +
      (equipmentBonuses.travel_speed ?? 0) * 0.12,
    scoutBonus:
      (equipmentBonuses.journey_scout_bonus ?? 0) +
      Math.round((equipmentBonuses.luck ?? 0) * 42 + (equipmentBonuses.crit_rate_bonus ?? 0) * 20),
    carryBonus: Math.floor((equipmentBonuses.journey_carry_bonus ?? 0) + (equipmentBonuses.attack_bonus ?? 0) / 8),
    hazardResist:
      (equipmentBonuses.journey_hazard_resist ?? 0) +
      Math.round((equipmentBonuses.defense_bonus ?? 0) * 38 + (equipmentBonuses.max_hp_bonus ?? 0) / 5),
    eventBonus:
      (equipmentBonuses.journey_event_bonus ?? 0) +
      (equipmentBonuses.luck ?? 0) * 0.14 +
      (equipmentBonuses.exp_bonus ?? 0) * 0.08,
    campRecoveryBonus:
      (equipmentBonuses.camp_recovery_bonus ?? 0) +
      Math.round((equipmentBonuses.vampiric ?? 0) * 95),
    bossPressureResist:
      (equipmentBonuses.boss_pressure_resist ?? 0) +
      (equipmentBonuses.defense_bonus ?? 0) * 0.16 +
      (equipmentBonuses.vampiric ?? 0) * 0.08 +
      ((equipmentBonuses.attack_bonus ?? 0) + (weaponDef?.attack ?? 0)) / 450,
    resourceFindBonus:
      (equipmentBonuses.resource_find_bonus ?? 0) +
      (equipmentBonuses.luck ?? 0) * 0.22 +
      (equipmentBonuses.exp_bonus ?? 0) * 0.06,
    rewardMultiplier: (equipmentBonuses.attack_bonus ?? 0) / 180 + (equipmentBonuses.luck ?? 0) * 0.08,
    knowledgeBonus: (equipmentBonuses.exp_bonus ?? 0) * 0.2,
    experienceMultiplier: equipmentBonuses.exp_bonus ?? 0
  })

  if (enchantment?.special === 'lucky') {
    outcome = addOutcome(outcome, { eventBonus: 0.05, resourceFindBonus: 0.08, scoutBonus: 4 })
  } else if (enchantment?.special === 'sturdy') {
    outcome = addOutcome(outcome, { hazardResist: 4, bossPressureResist: 0.04 })
  } else if (enchantment?.special === 'vampiric') {
    outcome = addOutcome(outcome, { campRecoveryBonus: 10, bossPressureResist: 0.03 })
  }

  if (cookingStore.activeBuff?.type === 'all_skills') {
    outcome = addOutcome(outcome, {
      scoutBonus: cookingStore.activeBuff.value * 2,
      resourceFindBonus: cookingStore.activeBuff.value * 0.01,
      knowledgeBonus: cookingStore.activeBuff.value * 0.01
    })
  }
  if (cookingStore.activeBuff?.type === 'luck') {
    outcome = addOutcome(outcome, {
      scoutBonus: cookingStore.activeBuff.value * 5,
      eventBonus: cookingStore.activeBuff.value * 0.01,
      resourceFindBonus: cookingStore.activeBuff.value * 0.015
    })
  }
  if (cookingStore.activeBuff?.type === 'defense') {
    outcome = addOutcome(outcome, {
      hazardResist: Math.round(cookingStore.activeBuff.value * 20),
      bossPressureResist: cookingStore.activeBuff.value * 0.08
    })
  }

  outcome = addOutcome(outcome, {
    bossPressureResist:
      outcome.bossPressureResist +
      guildStore.getGuildAttackBonus() / 120 +
      miningStore.guildBadgeBonusAttack / 220 +
      miningStore.guildBonusDefense * 0.16,
    rewardMultiplier: guildStore.getGuildAttackBonus() / 200,
    carryBonus: Math.floor(miningStore.guildBadgeBonusAttack / 10)
  })

  for (const awakening of JOURNEY_AWAKENINGS) {
    if (awakening.regionId === target.regionId && progression.journeyAwakenings[awakening.id]) {
      outcome = addOutcome(outcome, awakening.modifiers)
    }
  }

  for (const moduleDef of JOURNEY_CAMP_MODULES) {
    if (moduleDef.regionId === target.regionId && (progression.journeyCampModules[moduleDef.id] ?? 0) > 0) {
      outcome = addOutcome(outcome, {
        ...moduleDef.modifiers,
        supplyBonus: normalizeSupplyBonus(moduleDef.supplyBonus)
      })
    }
  }

  for (const permit of JOURNEY_ROUTE_PERMITS) {
    if (permit.regionId === target.regionId && (progression.journeyRouteLicenses[permit.id] ?? 0) > 0) {
      outcome = addOutcome(outcome, permit.modifiers)
    }
  }

  outcome = mergeOutcome(outcome, {
    staminaCostReduction: clamp(outcome.staminaCostReduction, 0, 0.45),
    carryBonus: Math.max(0, Math.floor(outcome.carryBonus)),
    hazardResist: Math.max(0, Math.round(outcome.hazardResist)),
    scoutBonus: Math.round(outcome.scoutBonus),
    campRecoveryBonus: Math.max(0, Math.round(outcome.campRecoveryBonus)),
    bossPressureResist: clamp(outcome.bossPressureResist, 0, 0.35),
    resourceFindBonus: clamp(outcome.resourceFindBonus, 0, 0.45),
    eventBonus: clamp(outcome.eventBonus, 0, 0.35),
    rewardMultiplier: clamp(outcome.rewardMultiplier, 0, 0.3),
    knowledgeBonus: clamp(outcome.knowledgeBonus, 0, 0.25),
    experienceMultiplier: clamp(outcome.experienceMultiplier, 0, 0.35),
    supplyBonus: {
      rations: clamp(Math.floor(outcome.supplyBonus.rations), 0, 3),
      medicine: clamp(Math.floor(outcome.supplyBonus.medicine), 0, 2),
      utility: clamp(Math.floor(outcome.supplyBonus.utility), 0, 3)
    }
  })

  const affinityScore = target.journeyAffinities.reduce((total, skillType) => total + skillLevels[skillType], 0)
  const buildScore = Math.round(
    affinityScore * 1.8 +
      (matchedWeaponBias ? 12 : 0) +
      outcome.scoutBonus * 0.35 +
      outcome.carryBonus * 4 +
      outcome.hazardResist * 0.5 +
      outcome.campRecoveryBonus * 0.3 +
      outcome.bossPressureResist * 40 +
      outcome.resourceFindBonus * 45 +
      outcome.rewardMultiplier * 35
  )

  const hpPercent = playerStore.getMaxHp() > 0 ? playerStore.hp / playerStore.getMaxHp() : 0
  const missingStats: string[] = []
  if (hpPercent < target.requiredStats.minHpPercent) {
    missingStats.push(`生命建议至少保持在 ${Math.round(target.requiredStats.minHpPercent * 100)}% 以上。`)
  }
  if (playerStore.stamina < target.requiredStats.minStamina) {
    missingStats.push(`当前体力偏低，建议至少准备 ${target.requiredStats.minStamina} 点体力。`)
  }
  if (buildScore < target.requiredStats.minBuildScore) {
    missingStats.push(`当前构筑分 ${buildScore}，低于建议值 ${target.requiredStats.minBuildScore}。`)
  }
  if (!matchedWeaponBias) {
    missingStats.push(`这条线更吃 ${target.weaponBias.join(' / ')}，当前武器是 ${weaponType}。`)
  }

  const strengths = [
    { label: '侦察', value: outcome.scoutBonus },
    { label: '负重', value: outcome.carryBonus * 10 },
    { label: '压险', value: outcome.hazardResist },
    { label: '扎营恢复', value: outcome.campRecoveryBonus },
    { label: '首领抗压', value: outcome.bossPressureResist * 100 },
    { label: '资源回收', value: outcome.resourceFindBonus * 100 }
  ]
    .sort((left, right) => right.value - left.value)
    .slice(0, 2)
    .map(entry => entry.label)

  const summaryLines = [
    `${target.label} 当前吃 ${target.journeyAffinities.join(' / ')}，你的主武器是 ${weaponDef?.name ?? ownedWeapon.defId}。`,
    matchedWeaponBias ? `当前武器类型 ${weaponType} 与这条线匹配。` : `当前武器类型 ${weaponType} 不完全贴合这条线。`,
    strengths.length > 0 ? `当前最强的是 ${strengths.join(' / ')}。` : '当前没有明显突出的远征优势。',
    ...target.requiredStats.focusLines,
    ...missingStats.slice(0, 2)
  ].filter(Boolean)

  return {
    weaponType,
    weaponLabel: weaponDef?.name ?? ownedWeapon.defId,
    matchedWeaponBias,
    skillLevels,
    equipmentBonuses,
    affinityScore,
    buildScore,
    outcome,
    missingStats,
    summaryLines
  }
}
