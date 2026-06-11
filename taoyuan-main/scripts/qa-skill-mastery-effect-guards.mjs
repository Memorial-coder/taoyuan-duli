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
const countOccurrences = (source, pattern) => source.split(pattern).length - 1

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const skillMasterySource = readSource('src/data/skillMastery.ts')
const skillStoreSource = readSource('src/stores/useSkillStore.ts')
const forageViewSource = readSource('src/views/game/ForageView.vue')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const processingStoreSource = readSource('src/stores/useProcessingStore.ts')
const fishPondStoreSource = readSource('src/stores/useFishPondStore.ts')
const journeyBuildSource = readSource('src/stores/journeyBuild.ts')
const fishingStoreSource = readSource('src/stores/useFishingStore.ts')
const fishingViewSource = readSource('src/views/game/FishingView.vue')
const farmActionsSource = readSource('src/composables/useFarmActions.ts')
const shopStoreSource = readSource('src/stores/useShopStore.ts')
const inventoryStoreSource = readSource('src/stores/useInventoryStore.ts')

assert(skillMasterySource.includes('export const SKILL_MASTERY_EFFECT_VALUES'), '精研效果数值表必须显式导出。')
assert(skillMasterySource.includes('batch_irrigation: 0.5'), '批量灌溉必须提供 50% 一键浇水体力减免。')
assert(skillMasterySource.includes('festival_supply: 0.15'), '节庆供货必须提供 15% 节庆日出货加成。')
assert(skillMasterySource.includes('rare_signal: 0.2'), '稀有信号必须提供 20% 概率加成。')
assert(skillMasterySource.includes('weather_window: 0.15'), '天候窗口必须提供 15% 概率加成。')
assert(skillMasterySource.includes('journey_scout: 8'), '旅途侦察必须提供 8 点远行侦察加成。')
assert(skillMasterySource.includes('tide_marker: 1'), '潮汐标记必须提供提示开关。')
assert(skillMasterySource.includes('legend_weight: 0.25'), '传奇称重必须提供 25% 传说鱼经验加成。')
assert(skillMasterySource.includes('processing_flow: 0.25'), '加工流线必须提供 25% 加工耗时缩短。')
assert(skillMasterySource.includes('pond_link: 0.1'), '鱼塘联动必须提供 10 个百分点产出概率加成。')
assert(skillMasterySource.includes('floor_intel: 1'), '层位情报必须提供提示开关。')
assert(skillMasterySource.includes('bomb_efficiency: 0.2'), '爆破效率必须提供 20% 炸弹返还概率。')
assert(skillMasterySource.includes('rare_transmute: 0.15'), '稀矿转化必须提供 15% 转化概率。')
assert(skillMasterySource.includes('boss_pressure: 0.15'), '首领压制必须提供 15% Boss 奖励加成。')
assert(skillMasterySource.includes('escort_margin: 10'), '护送余裕必须提供 10 点远行压险加成。')
assert(skillMasterySource.includes('trinket_tuning: 0.1'), '饰品调校必须提供 10% 饰品效果加成。')

assert(skillStoreSource.includes('getSkillMasteryEffectValue'), '技能 store 必须暴露 effectKey 读取函数。')
assert(skillStoreSource.includes('SKILL_MASTERY_EFFECT_VALUES[effectKey]'), 'effectKey 读取必须来自统一数值表。')
assert(skillStoreSource.includes('hasSkillMasteryNode(node.id)'), '未解锁节点不得提供精研效果值。')

assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('rare_signal')"), '采集页必须读取稀有信号效果。')
assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('weather_window')"), '采集页必须读取天候窗口效果。')
assert(forageViewSource.includes('item.chance <= 0.12 ? 1 + rareSignalBonus.value : 1'), '稀有信号只应加成低基础概率采集物。')
assert(forageViewSource.includes('environmentWindow.value.forage.active ? 1 + weatherWindowBonus.value : 1'), '天候窗口只应在环境窗口激活时加成。')
assert(forageViewSource.includes('rareSignalMult *'), '采集概率公式必须乘入稀有信号倍率。')
assert(forageViewSource.includes('weatherWindowMult *'), '采集概率公式必须乘入天候窗口倍率。')

assert(journeyBuildSource.includes("skillStore.getSkillMasteryEffectValue('journey_scout')"), '远行构筑必须读取旅途侦察效果。')
assert(journeyBuildSource.includes("skillStore.getSkillMasteryEffectValue('escort_margin')"), '远行构筑必须读取护送余裕效果。')
assert(journeyBuildSource.includes('scoutBonus: journeyScoutBonus'), '旅途侦察必须加到远行侦察值。')
assert(journeyBuildSource.includes('hazardResist: escortMarginBonus'), '护送余裕必须加到远行压险值。')

assert(fishingStoreSource.includes("skillStore.getSkillMasteryEffectValue('tide_marker')"), '钓鱼流程必须读取潮汐标记效果。')
assert(fishingStoreSource.includes('const tideMarkerHint = computed(() =>'), '钓鱼 store 必须集中生成潮汐标记提示。')
assert(fishingStoreSource.includes("fish.difficulty === 'legendary'"), '潮汐标记必须只关注传说鱼窗口。')
assert(fishingStoreSource.includes('FISHING_LOCATION_NAME_BY_ID'), '潮汐标记必须显示传说鱼所在钓点。')
assert(fishingViewSource.includes('fishingStore.tideMarkerHint'), '钓鱼页必须展示潮汐标记提示。')
assert(fishingStoreSource.includes("skillStore.getSkillMasteryEffectValue('legend_weight')"), '钓鱼结算必须读取传奇称重效果。')
assert(fishingStoreSource.includes('Math.floor(expGain * riverlandBonus * perfectMult * (1 + legendWeightBonus))'), '传说鱼经验公式必须乘入传奇称重。')
assert(fishingStoreSource.includes("message += '（传奇称重）'"), '传奇称重触发时必须在钓鱼结果中提示。')

assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('bomb_efficiency')"), '挖矿炸弹流程必须读取爆破效率效果。')
assert(miningStoreSource.includes('!excavatorPerkSaved && bombEfficiencyChance > 0'), '爆破效率不得和旧挖掘者返还重复判定。')
assert(miningStoreSource.includes('bombEfficiencySaved ? \'爆破效率\' : \'挖掘者\''), '炸弹返还消息必须区分精研与旧专精。')
assert(miningStoreSource.includes('const calculateOreQuantityWithBonuses = (baseQuantity: number, oreMultiplier = 1): number =>'), '矿石数量加成必须集中到统一 helper。')
assert(miningStoreSource.includes('let quantity = Math.max(1, Math.floor(baseQuantity * oreMultiplier))'), '矿石数量 helper 必须先应用基础矿石倍率。')
assert(miningStoreSource.includes('const quantity = calculateOreQuantityWithBonuses(tile.data?.oreQuantity ?? 1)'), '手动采矿必须使用统一矿石数量加成 helper。')
assert(miningStoreSource.includes('const quantity = calculateOreQuantityWithBonuses(tile.data?.oreQuantity ?? 1, bombDef.oreMultiplier)'), '炸弹采矿必须应用炸弹矿石倍率并共享矿石数量加成。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('boss_pressure')"), 'Boss 战奖励必须读取首领压制效果。')
assert(miningStoreSource.includes('combatIsBoss.value ? skillStore.getSkillMasteryEffectValue(\'boss_pressure\') : 0'), '首领压制经验加成只能应用于 Boss。')
assert(miningStoreSource.includes('const applySkillMasteryBonus = (value: number, bonus: number): number => Math.floor(value * (1 + bonus) + 1e-6)'), '奖励倍率必须使用带容差的 helper，避免 1.15 浮点下取整少 1。')
assert(miningStoreSource.includes('applySkillMasteryBonus(Math.floor(monster.expReward * wildernessXpBonus * infestedXpBonus), bossPressureBonus)'), '战斗经验公式必须乘入首领压制。')
assert(miningStoreSource.includes('applySkillMasteryBonus(baseMoneyReward, bossPressureBonus)'), '主矿洞 Boss 铜钱奖励必须乘入首领压制。')
assert(miningStoreSource.includes('applySkillMasteryBonus(200 + scFloor * 20, bossPressureBonus)'), '骷髅矿穴 Boss 铜钱奖励必须乘入首领压制。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('floor_intel')"), '矿洞流程必须读取层位情报效果。')
assert(miningStoreSource.includes('const getFloorIntelMessage = (floor = getActiveFloorData()): string =>'), '矿洞流程必须集中生成层位情报消息。')
assert(miningStoreSource.includes('层位情报：${lines.join'), '层位情报消息必须包含可读提示。')
assert(miningStoreSource.includes('主要矿石：${oreNames.join'), '层位情报必须提示主要矿石。')
assert(miningStoreSource.includes('msg += getFloorIntelMessage(newFloor)'), '前进到新层时必须追加层位情报。')
assert(miningStoreSource.includes('RARE_TRANSMUTE_ORE_UPGRADES'), '挖矿流程必须集中定义稀矿转化链。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('rare_transmute')"), '手动采矿必须读取稀矿转化效果。')
assert(miningStoreSource.includes('const rareTransmuteRewards: InventoryRewardEntry[] = rareTransmuteOreId ? [{ itemId: rareTransmuteOreId, quantity: 1 }] : []'), '稀矿转化必须追加为额外奖励项。')
assert(miningStoreSource.includes('if (rareTransmuteOreId) useQuestStore().onItemObtained(rareTransmuteOreId, 1)'), '稀矿转化奖励必须通知任务获得。')
assert(miningStoreSource.includes('（稀矿转化）'), '稀矿转化触发时必须在采矿消息中提示。')

assert(processingStoreSource.includes("skillStore.getSkillMasteryEffectValue('processing_flow')"), '加工流程必须读取加工流线效果。')
assert(processingStoreSource.includes('const getEffectiveProcessingDays = (recipe: ProcessingRecipeDef, machineType: MachineType): number =>'), '加工耗时必须集中计算。')
assert(processingStoreSource.includes('Math.ceil(totalDays * (1 - processingFlowBonus))'), '加工流线必须缩短加工耗时。')
assert(countOccurrences(processingStoreSource, 'slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)') >= 3, '手工投产、炼丹投产和虚空原料箱自动续产都必须使用有效加工耗时。')

assert(fishPondStoreSource.includes("skillStore.getSkillMasteryEffectValue('pond_link')"), '鱼塘每日更新必须读取鱼塘联动效果。')
assert(fishPondStoreSource.includes('const rate = Math.min(1, def.baseProductionRate + weightBonus + pondLinkBonus)'), '鱼塘产出概率必须加上鱼塘联动并封顶。')

assert(farmActionsSource.includes("skillStore.getSkillMasteryEffectValue('batch_irrigation')"), '一键浇水必须读取批量灌溉效果。')
assert(farmActionsSource.includes('(1 - batchIrrigationReduction)'), '一键浇水体力公式必须乘入批量灌溉减免。')
assert(farmActionsSource.includes('（批量灌溉）'), '批量灌溉生效时必须在一键浇水日志中提示。')

assert(shopStoreSource.includes("skillStore.getSkillMasteryEffectValue('festival_supply')"), '出货箱结算必须读取节庆供货效果。')
assert(shopStoreSource.includes('hasCurrentFestivalSupplyWindow'), '节庆供货必须只在当天存在节庆事件时生效。')
assert(shopStoreSource.includes('isFestivalSupplyCategory'), '节庆供货必须限制到作物和加工品分类。')
assert(shopStoreSource.includes('festivalSupplyMultiplier'), '出货箱结算必须把节庆供货倍率乘入收入公式。')

assert(inventoryStoreSource.includes("getSkillMasteryEffectValue('trinket_tuning')"), '装备加成汇总必须读取饰品调校效果。')
assert(inventoryStoreSource.includes('eff.value * trinketTuningMultiplier'), '饰品调校必须只放大已装备饰品的效果值。')

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

const getEffectiveProcessingDaysModel = (baseDays, processingFlowBonus, loomSpeedActive = false) => {
  let totalDays = baseDays
  if (processingFlowBonus > 0) totalDays = Math.max(1, Math.ceil(totalDays * (1 - processingFlowBonus)))
  if (loomSpeedActive) totalDays = Math.max(1, Math.ceil(totalDays * 0.7))
  return totalDays
}
assert(getEffectiveProcessingDaysModel(4, 0.25) === 3, '模型用例：4 天加工在加工流线下应缩短到 3 天。')
assert(getEffectiveProcessingDaysModel(1, 0.25) === 1, '模型用例：加工流线不得把 1 天加工降到 0 天。')
assert(getEffectiveProcessingDaysModel(4, 0.25, true) === 3, '模型用例：加工流线和织速应按当前顺序叠加且不低于 1 天。')

const getPondRateModel = (baseProductionRate, weight, pondLinkBonus) => Math.min(1, baseProductionRate + weight / 200 + pondLinkBonus)
assert(near(getPondRateModel(0.35, 50, 0.1), 0.7), '模型用例：鱼塘联动应为每日产出判定增加 10 个百分点。')
assert(near(getPondRateModel(0.9, 50, 0.1), 1), '模型用例：鱼塘联动后的产出率必须封顶到 100%。')

const applyJourneyMasteryModel = (baseScout, baseHazard, journeyScoutBonus, escortMarginBonus) => ({
  scoutBonus: Math.round(baseScout + journeyScoutBonus),
  hazardResist: Math.max(0, Math.round(baseHazard + escortMarginBonus))
})
const journeyMasteryModel = applyJourneyMasteryModel(22, 35, 8, 10)
assert(journeyMasteryModel.scoutBonus === 30, '模型用例：旅途侦察应为远行侦察值增加 8 点。')
assert(journeyMasteryModel.hazardResist === 45, '模型用例：护送余裕应为远行压险值增加 10 点。')

const getTideMarkerModel = (fishList, season, weather) =>
  fishList.filter(fish => fish.difficulty === 'legendary' && fish.season.includes(season) && (fish.weather.includes('any') || fish.weather.includes(weather)))
const tideMarkerFish = getTideMarkerModel(
  [
    { difficulty: 'legendary', season: ['summer'], weather: ['stormy'] },
    { difficulty: 'hard', season: ['summer'], weather: ['stormy'] },
    { difficulty: 'legendary', season: ['winter'], weather: ['snowy'] }
  ],
  'summer',
  'stormy'
)
assert(tideMarkerFish.length === 1, '模型用例：潮汐标记只应列出当前季节天气可遇到的传说鱼。')

const applyLegendWeightExpModel = (baseExp, legendWeightBonus) => Math.floor(baseExp * (1 + legendWeightBonus))
assert(applyLegendWeightExpModel(1500, 0.25) === 1875, '模型用例：传奇称重应把传说鱼经验提高 25%。')

const rareTransmuteUpgradeModel = {
  copper_ore: 'iron_ore',
  iron_ore: 'gold_ore',
  gold_ore: 'crystal_ore',
  crystal_ore: 'shadow_ore',
  shadow_ore: 'void_ore',
  void_ore: 'iridium_ore'
}
assert(rareTransmuteUpgradeModel.gold_ore === 'crystal_ore', '模型用例：稀矿转化应将金矿转成水晶矿。')
assert(!('iridium_ore' in rareTransmuteUpgradeModel), '模型用例：最高阶矿石不应继续转化。')

const applyBatchWaterCostModel = (baseCost, batchIrrigationReduction) =>
  Math.max(1, Math.ceil(baseCost * (1 - batchIrrigationReduction)))
assert(applyBatchWaterCostModel(2, 0.5) === 1, '模型用例：2 点基础一键浇水体力在批量灌溉下应降到 1 点。')
assert(applyBatchWaterCostModel(1, 0.5) === 1, '模型用例：批量灌溉不得突破 1 点最低体力消耗。')

const applyFestivalSupplyPriceModel = (basePrice, category, festivalSupplyBonus, festivalSupplyActive) => {
  const festivalSupplyMultiplier = festivalSupplyActive && (category === 'crop' || category === 'processed') ? 1 + festivalSupplyBonus : 1
  return Math.floor(basePrice * festivalSupplyMultiplier)
}
assert(applyFestivalSupplyPriceModel(1000, 'crop', 0.15, true) === 1150, '模型用例：节庆日作物出货 1000 应提高到 1150。')
assert(applyFestivalSupplyPriceModel(1000, 'processed', 0.15, true) === 1150, '模型用例：节庆日加工品出货 1000 应提高到 1150。')
assert(applyFestivalSupplyPriceModel(1000, 'ore', 0.15, true) === 1000, '模型用例：节庆供货不得加成矿石分类。')
assert(applyFestivalSupplyPriceModel(1000, 'crop', 0.15, false) === 1000, '模型用例：非节庆日不得触发节庆供货。')

const applyTrinketTuningModel = (effectValue, trinketTuningBonus) => effectValue * (1 + trinketTuningBonus)
assert(near(applyTrinketTuningModel(0.08, 0.1), 0.088), '模型用例：8% 饰品效果在饰品调校下应提高到 8.8%。')

if (errors.length > 0) {
  console.error('技能精研效果接线守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('技能精研效果接线守卫通过：15 个 effectKey 已完成四批接线，全部接入实际玩法公式。')
