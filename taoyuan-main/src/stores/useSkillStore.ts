import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { SkillType, SkillState, SkillPerk5, SkillPerk10, SkillPerk15, SkillPerk20, RingEffectType } from '@/types'
import { HYBRID_MASTERY_DEFS, MASTERY_REWARD_DEFS, PRIMARY_MASTERY_DEFS } from '@/data/mastery'
import { BLESSINGS } from '@/data/blessings'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'

/** 各等级所需累计经验 **/
const EXP_TABLE = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000, 21000, 28500, 37500, 48000, 60500, 75000, 91500, 110000, 131000, 155000]

/** 创建初始技能状态 */
const createSkill = (type: SkillType): SkillState => {
  return { type, exp: 0, level: 0, perk5: null, perk10: null, perk15: null, perk20: null }
}

type SkillPerk = SkillPerk5 | SkillPerk10 | SkillPerk15 | SkillPerk20
type SkillPerkLevel = 5 | 10 | 15 | 20

const PERK5_OPTIONS: Record<SkillType, readonly SkillPerk5[]> = {
  farming: ['harvester', 'rancher'],
  foraging: ['lumberjack', 'herbalist'],
  fishing: ['fisher', 'trapper'],
  mining: ['miner', 'geologist'],
  combat: ['fighter', 'defender']
}

const PERK10_BRANCHES: Record<SkillType, Partial<Record<SkillPerk5, readonly SkillPerk10[]>>> = {
  farming: {
    harvester: ['artisan', 'intensive'],
    rancher: ['coopmaster', 'shepherd']
  },
  foraging: {
    lumberjack: ['forester', 'tracker'],
    herbalist: ['botanist', 'alchemist']
  },
  fishing: {
    fisher: ['angler', 'aquaculture'],
    trapper: ['mariner', 'luremaster']
  },
  mining: {
    miner: ['prospector', 'blacksmith'],
    geologist: ['excavator', 'mineralogist']
  },
  combat: {
    fighter: ['warrior', 'brute'],
    defender: ['acrobat', 'tank']
  }
}

const PERK15_BRANCHES: Record<SkillType, Partial<Record<SkillPerk10, readonly SkillPerk15[]>>> = {
  farming: {
    intensive: ['grandmaster_farmer', 'estate_owner'],
    artisan: ['grandmaster_farmer', 'estate_owner'],
    coopmaster: ['livestock_baron', 'animal_whisperer'],
    shepherd: ['livestock_baron', 'animal_whisperer']
  },
  foraging: {
    botanist: ['ancient_botanist', 'grand_alchemist'],
    alchemist: ['ancient_botanist', 'grand_alchemist'],
    forester: ['forest_guardian', 'wilderness_expert'],
    tracker: ['forest_guardian', 'wilderness_expert']
  },
  fishing: {
    angler: ['legendary_angler', 'aquatic_merchant'],
    aquaculture: ['legendary_angler', 'aquatic_merchant'],
    mariner: ['sea_captain', 'bait_master'],
    luremaster: ['sea_captain', 'bait_master']
  },
  mining: {
    prospector: ['vein_seeker', 'master_smith'],
    blacksmith: ['vein_seeker', 'master_smith'],
    excavator: ['deep_excavator', 'gem_collector'],
    mineralogist: ['deep_excavator', 'gem_collector']
  },
  combat: {
    warrior: ['sword_saint', 'berserker'],
    brute: ['sword_saint', 'berserker'],
    acrobat: ['phantom_blade', 'iron_fortress'],
    tank: ['phantom_blade', 'iron_fortress']
  }
}

const PERK20_BRANCHES: Record<SkillType, Partial<Record<SkillPerk15, readonly SkillPerk20[]>>> = {
  farming: {
    grandmaster_farmer: ['deity_of_harvest', 'land_god'],
    estate_owner: ['deity_of_harvest', 'land_god'],
    livestock_baron: ['beast_sovereign', 'nature_bond'],
    animal_whisperer: ['beast_sovereign', 'nature_bond']
  },
  foraging: {
    ancient_botanist: ['world_tree', 'philosopher'],
    grand_alchemist: ['world_tree', 'philosopher'],
    forest_guardian: ['forest_spirit', 'primal_tracker'],
    wilderness_expert: ['forest_spirit', 'primal_tracker']
  },
  fishing: {
    legendary_angler: ['fish_god', 'ocean_trader'],
    aquatic_merchant: ['fish_god', 'ocean_trader'],
    sea_captain: ['sea_sovereign', 'lure_deity'],
    bait_master: ['sea_sovereign', 'lure_deity']
  },
  mining: {
    vein_seeker: ['earth_pulse', 'forge_god'],
    master_smith: ['earth_pulse', 'forge_god'],
    deep_excavator: ['abyss_miner', 'gem_emperor'],
    gem_collector: ['abyss_miner', 'gem_emperor']
  },
  combat: {
    sword_saint: ['war_god', 'slaughter_king'],
    berserker: ['war_god', 'slaughter_king'],
    phantom_blade: ['shadow_sovereign', 'indestructible'],
    iron_fortress: ['shadow_sovereign', 'indestructible']
  }
}

const includesPerk = <T extends SkillPerk>(options: readonly T[] | undefined, perk: SkillPerk | null): perk is T =>
  !!perk && !!options?.includes(perk as T)

const SKILL_TYPES: SkillType[] = ['farming', 'foraging', 'fishing', 'mining', 'combat']
const MAX_SKILL_LEVEL = 20
const MAX_SKILL_EXP = EXP_TABLE[MAX_SKILL_LEVEL]!

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<SkillState[]>([
    createSkill('farming'),
    createSkill('foraging'),
    createSkill('fishing'),
    createSkill('mining'),
    createSkill('combat')
  ])
  const skillMigrationLogs = ref<string[]>([])

  const getSkill = (type: SkillType): SkillState => {
    return skills.value.find(s => s.type === type)!
  }

  const farmingLevel = computed(() => getSkill('farming').level)
  const fishingLevel = computed(() => getSkill('fishing').level)
  const miningLevel = computed(() => getSkill('mining').level)
  const foragingLevel = computed(() => getSkill('foraging').level)
  const combatLevel = computed(() => getSkill('combat').level)
  const primaryMasteries = computed(() =>
    PRIMARY_MASTERY_DEFS.map(def => {
      const skill = getSkill(def.skillType)
      return {
        ...def,
        level: skill.level,
        unlocked: skill.level >= def.requirementLevel
      }
    })
  )
  const hybridMasteries = computed(() =>
    HYBRID_MASTERY_DEFS.map(def => ({
      ...def,
      unlocked: Object.entries(def.skillRequirements).every(([skillType, requiredLevel]) => getSkill(skillType as SkillType).level >= (requiredLevel ?? 0)),
      progressLines: Object.entries(def.skillRequirements).map(
        ([skillType, requiredLevel]) => `${skillType === 'farming' ? '农耕' : skillType === 'foraging' ? '采集' : skillType === 'fishing' ? '钓鱼' : skillType === 'mining' ? '挖矿' : '战斗'} Lv.${getSkill(skillType as SkillType).level}/${requiredLevel}`
      )
    }))
  )
  const masteryPoints = computed(
    () => primaryMasteries.value.filter(entry => entry.unlocked).length + hybridMasteries.value.filter(entry => entry.unlocked).length * 2
  )
  const unlockedMasteryIds = computed(() => [
    ...primaryMasteries.value.filter(entry => entry.unlocked).map(entry => entry.id),
    ...hybridMasteries.value.filter(entry => entry.unlocked).map(entry => entry.id)
  ])
  const masteryRewards = computed(() =>
    MASTERY_REWARD_DEFS.map(def => ({
      ...def,
      unlocked: unlockedMasteryIds.value.includes(def.unlockMasteryId)
    }))
  )
  const dailyBlessingPreview = computed(() => {
    const blessingReward = masteryRewards.value.find(entry => entry.id === 'blessing_altar' && entry.unlocked)
    if (!blessingReward) return null
    const gameStore = useGameStore()
    const seasonOffset = gameStore.season === 'spring' ? 3 : gameStore.season === 'summer' ? 7 : gameStore.season === 'autumn' ? 11 : 17
    const blessing = BLESSINGS[(gameStore.year * 37 + gameStore.day * 13 + seasonOffset) % BLESSINGS.length]
    return blessing
  })
  const getBlessingEffectValue = (effectType: RingEffectType): number => {
    const blessing = dailyBlessingPreview.value
    if (!blessing) return 0
    return blessing.effects.filter(effect => effect.type === effectType).reduce((sum, effect) => sum + effect.value, 0)
  }

  const refreshMasteryUnlocks = () => {
    const playerStore = usePlayerStore()
    for (const entry of primaryMasteries.value) {
      if (entry.unlocked) {
        playerStore.markMasteryUnlocked(entry.id)
      }
    }
    for (const entry of hybridMasteries.value) {
      if (entry.unlocked) {
        playerStore.markMasteryUnlocked(entry.id)
      }
    }
  }

  /** 增加经验并自动升级（含戒指经验加成） */
  const addExp = (type: SkillType, amount: number): { leveledUp: boolean; newLevel: number } => {
    const ringExpBonus = useInventoryStore().getRingEffectValue('exp_bonus')
    const adjustedAmount = Math.floor(amount * (1 + ringExpBonus))

    const skill = getSkill(type)
    skill.exp += adjustedAmount
    let leveledUp = false

    while (skill.level < 20) {
      const nextLevelExp = EXP_TABLE[skill.level + 1]!
      if (skill.exp >= nextLevelExp) {
        skill.level++
        leveledUp = true
      } else {
        break
      }
    }

    refreshMasteryUnlocks()

    return { leveledUp, newLevel: skill.level }
  }

  /** 获取升级到下一级所需经验 */
  const getExpToNextLevel = (type: SkillType): { current: number; required: number } | null => {
    const skill = getSkill(type)
    if (skill.level >= 20) return null
    return { current: skill.exp, required: EXP_TABLE[skill.level + 1]! }
  }

  /** 计算技能对体力消耗的减免 (每级减少1%，20级共减少20%) */
  const getStaminaReduction = (type: SkillType): number => {
    return getSkill(type).level * 0.01
  }

  /** 设置等级5专精 */
  const setPerk5 = (type: SkillType, perk: SkillPerk5): boolean => {
    const skill = getSkill(type)
    if (skill.level < 5 || skill.perk5 !== null || !includesPerk(PERK5_OPTIONS[type], perk)) return false
    skill.perk5 = perk
    return true
  }

  /** 设置等级10专精 */
  const setPerk10 = (type: SkillType, perk: SkillPerk10): boolean => {
    const skill = getSkill(type)
    const options = skill.perk5 ? PERK10_BRANCHES[type][skill.perk5] : undefined
    if (skill.level < 10 || skill.perk10 !== null || !includesPerk(options, perk)) return false
    skill.perk10 = perk
    return true
  }

  /** 设置等级15专精 */
  const setPerk15 = (type: SkillType, perk: SkillPerk15): boolean => {
    const skill = getSkill(type)
    const options = skill.perk10 ? PERK15_BRANCHES[type][skill.perk10] : undefined
    if (skill.level < 15 || skill.perk15 !== null || !includesPerk(options, perk)) return false
    skill.perk15 = perk
    return true
  }

  /** 设置等级20专精 */
  const setPerk20 = (type: SkillType, perk: SkillPerk20): boolean => {
    const skill = getSkill(type)
    const options = skill.perk15 ? PERK20_BRANCHES[type][skill.perk15] : undefined
    if (skill.level < 20 || skill.perk20 !== null || !includesPerk(options, perk)) return false
    skill.perk20 = perk
    return true
  }

  const getAvailablePerks = (type: SkillType, level: SkillPerkLevel): SkillPerk[] => {
    const skill = getSkill(type)
    if (level === 5) return [...PERK5_OPTIONS[type]]
    if (level === 10 && skill.perk5) return [...(PERK10_BRANCHES[type][skill.perk5] ?? [])]
    if (level === 15 && skill.perk10) return [...(PERK15_BRANCHES[type][skill.perk10] ?? [])]
    if (level === 20 && skill.perk15) return [...(PERK20_BRANCHES[type][skill.perk15] ?? [])]
    return []
  }

  const normalizePerks = (skill: SkillState) => {
    if (skill.level < 5 || !includesPerk(PERK5_OPTIONS[skill.type], skill.perk5)) {
      if (skill.perk5) skillMigrationLogs.value.push(`${skill.type} 清空无效或等级不足的 5 级专精。`)
      skill.perk5 = null
    }
    const perk10Options = skill.perk5 ? PERK10_BRANCHES[skill.type][skill.perk5] : undefined
    if (skill.level < 10 || !includesPerk(perk10Options, skill.perk10)) {
      if (skill.perk10) skillMigrationLogs.value.push(`${skill.type} 清空无效或等级不足的 10 级专精。`)
      skill.perk10 = null
    }
    const perk15Options = skill.perk10 ? PERK15_BRANCHES[skill.type][skill.perk10] : undefined
    if (skill.level < 15 || !includesPerk(perk15Options, skill.perk15)) {
      if (skill.perk15) skillMigrationLogs.value.push(`${skill.type} 清空无效或等级不足的 15 级专精。`)
      skill.perk15 = null
    }
    const perk20Options = skill.perk15 ? PERK20_BRANCHES[skill.type][skill.perk15] : undefined
    if (skill.level < 20 || !includesPerk(perk20Options, skill.perk20)) {
      if (skill.perk20) skillMigrationLogs.value.push(`${skill.type} 清空无效或等级不足的 20 级专精。`)
      skill.perk20 = null
    }
  }

  const normalizeSkillProgress = (skill: SkillState) => {
    const rawLevel = Math.floor(Number(skill.level))
    const normalizedLevel = Number.isFinite(rawLevel) ? Math.max(0, Math.min(MAX_SKILL_LEVEL, rawLevel)) : 0
    const rawExp = Math.floor(Number(skill.exp))
    const normalizedExp = Number.isFinite(rawExp) ? Math.max(0, rawExp) : 0
    if (skill.level !== normalizedLevel) {
      skillMigrationLogs.value.push(`${skill.type} 等级从 ${String(skill.level)} 修正为 ${normalizedLevel}。`)
    }
    if (skill.exp !== normalizedExp) {
      skillMigrationLogs.value.push(`${skill.type} 经验从 ${String(skill.exp)} 修正为 ${normalizedExp}。`)
    }

    skill.level = normalizedLevel
    skill.exp = normalizedExp

    while (skill.level < MAX_SKILL_LEVEL && skill.exp >= EXP_TABLE[skill.level + 1]!) {
      skill.level += 1
    }
    const minimumExpForLevel = EXP_TABLE[skill.level] ?? 0
    if (skill.exp < minimumExpForLevel) {
      skillMigrationLogs.value.push(`${skill.type} 经验低于当前等级门槛，已补齐到 ${minimumExpForLevel}。`)
      skill.exp = minimumExpForLevel
    }
    if (skill.level >= MAX_SKILL_LEVEL && skill.exp > MAX_SKILL_EXP) {
      skillMigrationLogs.value.push(`${skill.type} 满级经验超过上限，已裁剪到 ${MAX_SKILL_EXP}。`)
      skill.exp = MAX_SKILL_EXP
    }
  }

  /** 判断作物品质（基于农耕等级） */
  const rollCropQuality = (): 'normal' | 'fine' | 'excellent' | 'supreme' => {
    return rollCropQualityWithBonus(0)
  }

  /** 判断作物品质（带肥料加成 + 可选技能等级加成） */
  const rollCropQualityWithBonus = (qualityBonus: number, levelBonus: number = 0): 'normal' | 'fine' | 'excellent' | 'supreme' => {
    const level = farmingLevel.value + levelBonus
    const roll = Math.random()

    if (level >= 9 && roll < 0.05 + qualityBonus * 0.5) return 'supreme'
    if (level >= 6 && roll < 0.15 + qualityBonus) return 'excellent'
    if (level >= 3 && roll < 0.3 + qualityBonus) return 'fine'
    return 'normal'
  }

  /** 判断钓鱼品质（基于钓鱼等级） */
  const rollFishQuality = (): 'normal' | 'fine' | 'excellent' | 'supreme' => {
    const level = fishingLevel.value
    const roll = Math.random()
    if (level >= 9 && roll < 0.05) return 'supreme'
    if (level >= 6 && roll < 0.15) return 'excellent'
    if (level >= 3 && roll < 0.3) return 'fine'
    return 'normal'
  }

  /** 判断采集物品质（基于采集等级和专精 + 可选技能等级加成） */
  const rollForageQuality = (levelBonus: number = 0): 'normal' | 'fine' | 'excellent' | 'supreme' => {
    const skill = getSkill('foraging')
    // perk20: 世界之树 必定神圣品质
    if (skill.perk20 === 'world_tree') return 'supreme'
    // perk15: 上古植物学家 50%概率神圣，否则必定极品
    if (skill.perk15 === 'ancient_botanist') return Math.random() < 0.5 ? 'supreme' : 'excellent'
    if (skill.perk10 === 'botanist') return 'excellent'
    const level = skill.level + levelBonus
    const roll = Math.random()

    if (level >= 9 && roll < 0.05) return 'supreme'
    if (level >= 6 && roll < 0.12) return 'excellent'
    if (level >= 3 && roll < 0.25) return 'fine'
    return 'normal'
  }

  const serialize = () => {
    return { skills: skills.value }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    skillMigrationLogs.value = []
    const arr: SkillState[] = data.skills ?? []
    // 确保 5 个技能都存在（旧存档可能没有 combat）
    const allTypes: SkillType[] = SKILL_TYPES
    for (const type of allTypes) {
      if (!arr.find(s => s.type === type)) {
        const newSkill = createSkill(type)
        // 旧存档迁移：mining 上误存的战斗分支 → combat
        if (type === 'combat') {
          const mining = arr.find(s => s.type === 'mining')
          if (mining && (mining.perk5 === 'fighter' || mining.perk5 === 'defender')) {
            newSkill.exp = mining.exp
            newSkill.level = mining.level
            newSkill.perk5 = mining.perk5
            newSkill.perk10 = mining.perk10
            mining.perk5 = null
            mining.perk10 = null
          }
        }
        arr.push(newSkill)
      }
    }
    const uniqueSkills: SkillState[] = []
    for (const type of allTypes) {
      const matching = arr.filter(s => s.type === type)
      if (matching.length > 1) {
        skillMigrationLogs.value.push(`${type} 存档存在重复条目，已保留第一条。`)
      }
      uniqueSkills.push(matching[0] ?? createSkill(type))
    }
    const invalidSkillCount = arr.filter(s => !SKILL_TYPES.includes(s.type)).length
    if (invalidSkillCount > 0) {
      skillMigrationLogs.value.push(`移除 ${invalidSkillCount} 条非法技能类型记录。`)
    }
    // 旧存档迁移：补充 perk15/perk20 字段
    for (const s of uniqueSkills) {
      if (!('perk15' in s)) (s as SkillState).perk15 = null
      if (!('perk20' in s)) (s as SkillState).perk20 = null
      normalizeSkillProgress(s)
      normalizePerks(s)
    }
    skills.value = uniqueSkills
    refreshMasteryUnlocks()
  }

  return {
    skills,
    skillMigrationLogs,
    farmingLevel,
    fishingLevel,
    miningLevel,
    foragingLevel,
    combatLevel,
    primaryMasteries,
    hybridMasteries,
    masteryPoints,
    masteryRewards,
    dailyBlessingPreview,
    getBlessingEffectValue,
    getSkill,
    addExp,
    getExpToNextLevel,
    getStaminaReduction,
    setPerk5,
    setPerk10,
    setPerk15,
    setPerk20,
    getAvailablePerks,
    rollCropQuality,
    rollCropQualityWithBonus,
    rollFishQuality,
    rollForageQuality,
    refreshMasteryUnlocks,
    serialize,
    deserialize
  }
})
/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
