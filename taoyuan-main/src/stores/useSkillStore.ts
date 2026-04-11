import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { SkillType, SkillState, SkillPerk5, SkillPerk10, SkillPerk15, SkillPerk20 } from '@/types'
import { useInventoryStore } from './useInventoryStore'

/** 各等级所需累计经验 **/
const EXP_TABLE = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000, 21000, 28500, 37500, 48000, 60500, 75000, 91500, 110000, 131000, 155000]

/** 创建初始技能状态 */
const createSkill = (type: SkillType): SkillState => {
  return { type, exp: 0, level: 0, perk5: null, perk10: null, perk15: null, perk20: null }
}

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<SkillState[]>([
    createSkill('farming'),
    createSkill('foraging'),
    createSkill('fishing'),
    createSkill('mining'),
    createSkill('combat')
  ])

  const getSkill = (type: SkillType): SkillState => {
    return skills.value.find(s => s.type === type)!
  }

  const farmingLevel = computed(() => getSkill('farming').level)
  const fishingLevel = computed(() => getSkill('fishing').level)
  const miningLevel = computed(() => getSkill('mining').level)
  const foragingLevel = computed(() => getSkill('foraging').level)
  const combatLevel = computed(() => getSkill('combat').level)

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
    if (skill.level < 5 || skill.perk5 !== null) return false
    skill.perk5 = perk
    return true
  }

  /** 设置等级10专精 */
  const setPerk10 = (type: SkillType, perk: SkillPerk10): boolean => {
    const skill = getSkill(type)
    if (skill.level < 10 || skill.perk10 !== null) return false
    skill.perk10 = perk
    return true
  }

  /** 设置等级15专精 */
  const setPerk15 = (type: SkillType, perk: SkillPerk15): boolean => {
    const skill = getSkill(type)
    if (skill.level < 15 || skill.perk15 !== null) return false
    skill.perk15 = perk
    return true
  }

  /** 设置等级20专精 */
  const setPerk20 = (type: SkillType, perk: SkillPerk20): boolean => {
    const skill = getSkill(type)
    if (skill.level < 20 || skill.perk20 !== null) return false
    skill.perk20 = perk
    return true
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
    const arr: SkillState[] = data.skills ?? []
    // 确保 5 个技能都存在（旧存档可能没有 combat）
    const allTypes: SkillType[] = ['farming', 'foraging', 'fishing', 'mining', 'combat']
    for (const type of allTypes) {
      if (!arr.find(s => s.type === type)) {
        const newSkill = createSkill(type)
        // 旧存档迁移：mining 的 fighter/warrior/brute → combat
        if (type === 'combat') {
          const mining = arr.find(s => s.type === 'mining')
          if (mining && mining.perk5 === 'fighter') {
            newSkill.exp = mining.exp
            newSkill.level = mining.level
            newSkill.perk5 = 'fighter'
            newSkill.perk10 = mining.perk10
            mining.perk5 = null
            mining.perk10 = null
          }
        }
        arr.push(newSkill)
      }
    }
    // 旧存档迁移：补充 perk15/perk20 字段
    for (const s of arr) {
      if (!('perk15' in s)) (s as SkillState).perk15 = null
      if (!('perk20' in s)) (s as SkillState).perk20 = null
    }
    skills.value = arr
  }

  return {
    skills,
    farmingLevel,
    fishingLevel,
    miningLevel,
    foragingLevel,
    combatLevel,
    getSkill,
    addExp,
    getExpToNextLevel,
    getStaminaReduction,
    setPerk5,
    setPerk10,
    setPerk15,
    setPerk20,
    rollCropQuality,
    rollCropQualityWithBonus,
    rollFishQuality,
    rollForageQuality,
    serialize,
    deserialize
  }
})
