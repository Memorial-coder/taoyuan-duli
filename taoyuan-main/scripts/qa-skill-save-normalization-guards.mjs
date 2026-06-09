/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const source = fs.readFileSync(path.join(projectRoot, 'src/stores/useSkillStore.ts'), 'utf8')

assert(source.includes('const skillMigrationLogs = ref<string[]>([])'), '技能读档必须保留迁移日志。')
assert(source.includes('const normalizeSkillProgress = (skill: SkillState) =>'), '必须集中归一化技能等级和经验。')
assert(source.includes('const normalizeSkillMasteryState = (skill: SkillState) =>'), '必须集中归一化后20级精研状态。')
assert(source.includes('const SKILL_MASTERY_EXP_PER_POINT = 5000'), '后20级精研点兑换阈值必须显式定义。')
assert(source.includes('addSkillMasteryExp(skill, overflowExp)'), '满级溢出经验必须转入精研经验，不能直接丢弃。')
assert(source.includes('unlockSkillMasteryNode'), 'store 必须暴露精研节点解锁入口。')
assert(source.includes('canUnlockSkillMasteryNode'), 'store 必须暴露精研节点解锁校验。')
assert(source.includes('skillMigrationLogs.value = []'), 'deserialize() 开始时必须清空本次迁移日志。')
assert(source.includes('normalizeSkillProgress(s)'), 'deserialize() 必须归一化每个技能的 level/exp。')
assert(source.includes('normalizeSkillMasteryState(s)'), 'deserialize() 必须归一化每个技能的精研状态。')
assert(source.includes('normalizePerks(s)'), 'deserialize() 必须归一化每个技能的专精链。')
assert(source.includes('移除 ${invalidSkillCount} 条非法技能类型记录。'), 'deserialize() 必须移除非法技能类型并记录日志。')
assert(source.includes('存档存在重复条目，已保留第一条。'), 'deserialize() 必须处理重复技能条目并记录日志。')
assert(source.includes('skills.value = uniqueSkills'), 'deserialize() 最终必须只写入唯一的 5 个技能。')
assert(source.includes('skillMigrationLogs,'), 'store 必须暴露 skillMigrationLogs，便于验证和诊断。')

const expTable = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000, 21000, 28500, 37500, 48000, 60500, 75000, 91500, 110000, 131000, 155000]
const masteryExpPerPoint = 5000
const skillTypes = ['farming', 'foraging', 'fishing', 'mining', 'combat']
const perk5Options = {
  farming: ['harvester', 'rancher'],
  foraging: ['lumberjack', 'herbalist'],
  fishing: ['fisher', 'trapper'],
  mining: ['miner', 'geologist'],
  combat: ['fighter', 'defender']
}
const perk10Branches = {
  farming: { harvester: ['artisan', 'intensive'], rancher: ['coopmaster', 'shepherd'] },
  fishing: { fisher: ['angler', 'aquaculture'], trapper: ['mariner', 'luremaster'] },
  mining: { miner: ['prospector', 'blacksmith'], geologist: ['excavator', 'mineralogist'] },
  combat: { fighter: ['warrior', 'brute'], defender: ['acrobat', 'tank'] }
}
const masteryNodeSkillById = {
  farming_batch_irrigation: 'farming',
  farming_festival_supply: 'farming',
  farming_processing_flow: 'farming',
  foraging_rare_signal: 'foraging',
  foraging_journey_scout: 'foraging',
  foraging_weather_window: 'foraging',
  fishing_tide_marker: 'fishing',
  fishing_pond_link: 'fishing',
  fishing_legend_weight: 'fishing',
  mining_floor_intel: 'mining',
  mining_bomb_efficiency: 'mining',
  mining_rare_transmute: 'mining',
  combat_boss_pressure: 'combat',
  combat_escort_margin: 'combat',
  combat_trinket_tuning: 'combat'
}

const createSkill = type => ({ type, exp: 0, level: 0, perk5: null, perk10: null, perk15: null, perk20: null, masteryExp: 0, masteryPoints: 0, unlockedMasteryNodeIds: [] })

const normalizeMasteryNumbers = skill => {
  skill.masteryExp = Number.isFinite(Math.floor(Number(skill.masteryExp))) ? Math.max(0, Math.floor(Number(skill.masteryExp))) : 0
  skill.masteryPoints = Number.isFinite(Math.floor(Number(skill.masteryPoints))) ? Math.max(0, Math.floor(Number(skill.masteryPoints))) : 0
  if (!Array.isArray(skill.unlockedMasteryNodeIds)) skill.unlockedMasteryNodeIds = []
}

const convertMasteryExp = skill => {
  if (skill.masteryExp < masteryExpPerPoint) return
  skill.masteryPoints += Math.floor(skill.masteryExp / masteryExpPerPoint)
  skill.masteryExp %= masteryExpPerPoint
}

const addMasteryExp = (skill, amount) => {
  normalizeMasteryNumbers(skill)
  const normalizedAmount = Math.floor(Number(amount))
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return
  skill.masteryExp += normalizedAmount
  convertMasteryExp(skill)
}

const normalizeProgress = skill => {
  normalizeMasteryNumbers(skill)
  skill.level = Number.isFinite(Math.floor(Number(skill.level))) ? Math.max(0, Math.min(20, Math.floor(Number(skill.level)))) : 0
  skill.exp = Number.isFinite(Math.floor(Number(skill.exp))) ? Math.max(0, Math.floor(Number(skill.exp))) : 0
  while (skill.level < 20 && skill.exp >= expTable[skill.level + 1]) skill.level += 1
  if (skill.exp < expTable[skill.level]) skill.exp = expTable[skill.level]
  if (skill.level >= 20 && skill.exp > expTable[20]) {
    const overflowExp = skill.exp - expTable[20]
    skill.exp = expTable[20]
    addMasteryExp(skill, overflowExp)
  }
}

const normalizeMasteryState = skill => {
  normalizeMasteryNumbers(skill)
  if (skill.level < 20) {
    skill.masteryExp = 0
    skill.masteryPoints = 0
    skill.unlockedMasteryNodeIds = []
    return
  }
  convertMasteryExp(skill)
  const normalizedNodeIds = []
  for (const nodeId of skill.unlockedMasteryNodeIds) {
    if (masteryNodeSkillById[nodeId] !== skill.type) continue
    if (normalizedNodeIds.includes(nodeId)) continue
    normalizedNodeIds.push(nodeId)
  }
  skill.unlockedMasteryNodeIds = normalizedNodeIds
}

const normalizePerks = skill => {
  if (skill.level < 5 || !perk5Options[skill.type]?.includes(skill.perk5)) skill.perk5 = null
  const perk10Options = skill.perk5 ? perk10Branches[skill.type]?.[skill.perk5] : undefined
  if (skill.level < 10 || !perk10Options?.includes(skill.perk10)) skill.perk10 = null
  if (skill.level < 15) skill.perk15 = null
  if (skill.level < 20) skill.perk20 = null
}

const normalizeSave = rawSkills => {
  const arr = [...rawSkills]
  for (const type of skillTypes) {
    if (!arr.find(skill => skill.type === type)) arr.push(createSkill(type))
  }
  const uniqueSkills = skillTypes.map(type => arr.filter(skill => skill.type === type)[0] ?? createSkill(type))
  for (const skill of uniqueSkills) {
    if (!('perk15' in skill)) skill.perk15 = null
    if (!('perk20' in skill)) skill.perk20 = null
    if (!('masteryExp' in skill)) skill.masteryExp = 0
    if (!('masteryPoints' in skill)) skill.masteryPoints = 0
    if (!('unlockedMasteryNodeIds' in skill)) skill.unlockedMasteryNodeIds = []
    normalizeProgress(skill)
    normalizeMasteryState(skill)
    normalizePerks(skill)
  }
  return uniqueSkills
}

const normalized = normalizeSave([
  { type: 'farming', exp: -50, level: -3, perk5: 'harvester', perk10: 'artisan', masteryExp: 2000, masteryPoints: 4, unlockedMasteryNodeIds: ['farming_batch_irrigation'] },
  {
    type: 'mining',
    exp: 999999,
    level: 99,
    perk5: 'fighter',
    perk10: 'warrior',
    perk15: 'sword_saint',
    perk20: 'war_god',
    masteryExp: 1,
    masteryPoints: 2,
    unlockedMasteryNodeIds: ['mining_floor_intel', 'combat_boss_pressure', 'mining_floor_intel', 'unknown_node']
  },
  { type: 'combat', exp: 10000, level: 4, perk5: 'defender', perk10: 'acrobat' },
  { type: 'fishing', exp: 0, level: 10, perk5: 'fisher', perk10: 'angler' },
  { type: 'fishing', exp: 155000, level: 20, perk5: 'trapper' },
  { type: 'alchemy', exp: 100, level: 1, perk5: 'harvester' }
])

assert(normalized.length === 5, '模型用例：归一化后必须只保留 5 个技能。')
const farming = normalized.find(skill => skill.type === 'farming')
assert(farming.level === 0 && farming.exp === 0, '模型用例：负等级和负经验必须归零。')
assert(farming.perk5 === null && farming.perk10 === null, '模型用例：等级不足的专精必须清空。')
assert(farming.masteryExp === 0 && farming.masteryPoints === 0 && farming.unlockedMasteryNodeIds.length === 0, '模型用例：未满级技能的精研状态必须清空。')

const mining = normalized.find(skill => skill.type === 'mining')
assert(mining.level === 20 && mining.exp === 155000, '模型用例：超过 20 级后技能经验必须停在满级边界。')
assert(mining.masteryPoints === 171 && mining.masteryExp === 0, '模型用例：满级溢出经验必须转入精研点和剩余精研经验。')
assert(mining.unlockedMasteryNodeIds.length === 1 && mining.unlockedMasteryNodeIds[0] === 'mining_floor_intel', '模型用例：非法、跨技能和重复精研节点必须移除。')
assert(mining.perk5 === null && mining.perk10 === null, '模型用例：跨技能非法专精链必须清空。')

const combat = normalized.find(skill => skill.type === 'combat')
assert(combat.level === 9 && combat.exp === 10000, '模型用例：经验可推导出的等级必须补齐。')
assert(combat.perk5 === 'defender' && combat.perk10 === null, '模型用例：补齐到 9 级后保留合法 5 级专精，但清空等级不足的 10 级专精。')

const fishing = normalized.find(skill => skill.type === 'fishing')
assert(fishing.level === 10 && fishing.exp === 15000, '模型用例：等级高于经验时必须补齐当前等级最低经验。')
assert(fishing.perk5 === 'fisher' && fishing.perk10 === 'angler', '模型用例：等级和分支都合法的专精必须保留。')

const maxedCombat = normalizeSave([{ type: 'combat', exp: 155000, level: 20, perk5: 'defender', perk10: 'tank', perk15: 'iron_fortress', perk20: 'indestructible', masteryExp: 10000, masteryPoints: 0, unlockedMasteryNodeIds: ['combat_boss_pressure'] }]).find(skill => skill.type === 'combat')
assert(maxedCombat.masteryPoints === 2 && maxedCombat.masteryExp === 0, '模型用例：已有精研经验读档时也必须兑换成精研点。')
assert(maxedCombat.unlockedMasteryNodeIds[0] === 'combat_boss_pressure', '模型用例：满级技能的合法精研节点必须保留。')

if (errors.length > 0) {
  console.error('技能读档归一化守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('技能读档归一化守卫通过：level/exp/perk/mastery 异常档会被归一化，满级溢出经验会转入后20级精研。')
