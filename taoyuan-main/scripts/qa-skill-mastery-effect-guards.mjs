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
const near = (actual, expected) => Math.abs(actual - expected) < 1e-9

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const skillMasterySource = readSource('src/data/skillMastery.ts')
const skillStoreSource = readSource('src/stores/useSkillStore.ts')
const forageViewSource = readSource('src/views/game/ForageView.vue')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')

assert(skillMasterySource.includes('export const SKILL_MASTERY_EFFECT_VALUES'), '精研效果数值表必须显式导出。')
assert(skillMasterySource.includes('rare_signal: 0.2'), '稀有信号必须提供 20% 概率加成。')
assert(skillMasterySource.includes('weather_window: 0.15'), '天候窗口必须提供 15% 概率加成。')
assert(skillMasterySource.includes('bomb_efficiency: 0.2'), '爆破效率必须提供 20% 炸弹返还概率。')
assert(skillMasterySource.includes('boss_pressure: 0.15'), '首领压制必须提供 15% Boss 奖励加成。')

assert(skillStoreSource.includes('getSkillMasteryEffectValue'), '技能 store 必须暴露 effectKey 读取函数。')
assert(skillStoreSource.includes('SKILL_MASTERY_EFFECT_VALUES[effectKey]'), 'effectKey 读取必须来自统一数值表。')
assert(skillStoreSource.includes('hasSkillMasteryNode(node.id)'), '未解锁节点不得提供精研效果值。')

assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('rare_signal')"), '采集页必须读取稀有信号效果。')
assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('weather_window')"), '采集页必须读取天候窗口效果。')
assert(forageViewSource.includes('item.chance <= 0.12 ? 1 + rareSignalBonus.value : 1'), '稀有信号只应加成低基础概率采集物。')
assert(forageViewSource.includes('environmentWindow.value.forage.active ? 1 + weatherWindowBonus.value : 1'), '天候窗口只应在环境窗口激活时加成。')
assert(forageViewSource.includes('rareSignalMult *'), '采集概率公式必须乘入稀有信号倍率。')
assert(forageViewSource.includes('weatherWindowMult *'), '采集概率公式必须乘入天候窗口倍率。')

assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('bomb_efficiency')"), '挖矿炸弹流程必须读取爆破效率效果。')
assert(miningStoreSource.includes('!excavatorPerkSaved && bombEfficiencyChance > 0'), '爆破效率不得和旧挖掘者返还重复判定。')
assert(miningStoreSource.includes('bombEfficiencySaved ? \'爆破效率\' : \'挖掘者\''), '炸弹返还消息必须区分精研与旧专精。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('boss_pressure')"), 'Boss 战奖励必须读取首领压制效果。')
assert(miningStoreSource.includes('combatIsBoss.value ? skillStore.getSkillMasteryEffectValue(\'boss_pressure\') : 0'), '首领压制经验加成只能应用于 Boss。')
assert(miningStoreSource.includes('const applySkillMasteryBonus = (value: number, bonus: number): number => Math.floor(value * (1 + bonus) + 1e-6)'), '奖励倍率必须使用带容差的 helper，避免 1.15 浮点下取整少 1。')
assert(miningStoreSource.includes('applySkillMasteryBonus(Math.floor(monster.expReward * wildernessXpBonus * infestedXpBonus), bossPressureBonus)'), '战斗经验公式必须乘入首领压制。')
assert(miningStoreSource.includes('applySkillMasteryBonus(baseMoneyReward, bossPressureBonus)'), '主矿洞 Boss 铜钱奖励必须乘入首领压制。')
assert(miningStoreSource.includes('applySkillMasteryBonus(200 + scFloor * 20, bossPressureBonus)'), '骷髅矿穴 Boss 铜钱奖励必须乘入首领压制。')

const applyForageChance = ({ baseChance, rareBonus, weatherBonus, windowActive }) => {
  const rareSignalMult = baseChance <= 0.12 ? 1 + rareBonus : 1
  const weatherWindowMult = windowActive ? 1 + weatherBonus : 1
  return Math.min(1, baseChance * rareSignalMult * weatherWindowMult)
}

assert(near(applyForageChance({ baseChance: 0.1, rareBonus: 0.2, weatherBonus: 0, windowActive: false }), 0.12), '模型用例：10% 稀有采集物应被稀有信号提高到 12%。')
assert(near(applyForageChance({ baseChance: 0.5, rareBonus: 0.2, weatherBonus: 0, windowActive: false }), 0.5), '模型用例：普通采集物不应吃到稀有信号。')
assert(near(applyForageChance({ baseChance: 0.1, rareBonus: 0.2, weatherBonus: 0.15, windowActive: true }), 0.138), '模型用例：稀有信号和天候窗口应可叠乘。')

const applyBossReward = (baseValue, bossPressureBonus) => Math.floor(baseValue * (1 + bossPressureBonus) + 1e-6)
assert(applyBossReward(100, 0.15) === 115, '模型用例：100 点基础 Boss 奖励应正确提高到 115。')
assert(applyBossReward(200, 0.15) === 230, '模型用例：200 文基础 Boss 奖励应正确提高到 230。')

if (errors.length > 0) {
  console.error('技能精研效果接线守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('技能精研效果接线守卫通过：4 个第一批 effectKey 已接入采集、炸弹和 Boss 奖励公式。')
