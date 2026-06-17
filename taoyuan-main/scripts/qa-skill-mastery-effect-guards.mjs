/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const near = (actual, expected) => Math.abs(actual - expected) < 1e-9
const countOccurrences = (source, pattern) => source.split(pattern).length - 1

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const skillMasterySource = readSource('src/data/skillMastery.ts')
const masterySource = readSource('src/data/mastery.ts')
const skillStoreSource = readSource('src/stores/useSkillStore.ts')
const skillViewSource = readSource('src/views/game/SkillView.vue')
const storyQuestsSource = readSource('src/data/storyQuests.ts')
const processingDataSource = readSource('src/data/processing.ts')
const cottageViewSource = readSource('src/views/game/CottageView.vue')
const charInfoViewSource = readSource('src/views/game/CharInfoView.vue')
const inventoryViewSource = readSource('src/views/game/InventoryView.vue')
const forageViewSource = readSource('src/views/game/ForageView.vue')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const processingStoreSource = readSource('src/stores/useProcessingStore.ts')
const processingViewSource = readSource('src/views/game/ProcessingView.vue')
const fishPondStoreSource = readSource('src/stores/useFishPondStore.ts')
const fishPondViewSource = readSource('src/views/game/FishPondView.vue')
const guideViewSource = readSource('src/views/GuideView.vue')
const journeyBuildSource = readSource('src/stores/journeyBuild.ts')
const fishingStoreSource = readSource('src/stores/useFishingStore.ts')
const fishingViewSource = readSource('src/views/game/FishingView.vue')
const farmActionsSource = readSource('src/composables/useFarmActions.ts')
const questStoreSource = readSource('src/stores/useQuestStore.ts')
const questViewSource = readSource('src/views/game/QuestView.vue')
const shopStoreSource = readSource('src/stores/useShopStore.ts')
const inventoryStoreSource = readSource('src/stores/useInventoryStore.ts')
const regionMapStoreSource = readSource('src/stores/useRegionMapStore.ts')
const {
  FISHING_DIFFICULTY_EXP_MULTIPLIER,
  FISHING_QUALITY_EXP_MULTIPLIER,
  getFishingCatchExperience
} = await import(pathToFileURL(path.join(srcRoot, 'utils', 'fishingExperience.ts')).href)

assert(skillMasterySource.includes('export const SKILL_MASTERY_EFFECT_VALUES'), '精研效果数值表必须显式导出。')
assert(countOccurrences(skillMasterySource, "skillType: 'farming'") >= 7, '农耕精研必须至少扩到 7 个节点。')
assert(countOccurrences(skillMasterySource, "skillType: 'foraging'") >= 7, '采集精研必须至少扩到 7 个节点。')
assert(countOccurrences(skillMasterySource, "skillType: 'fishing'") >= 7, '钓鱼精研必须至少扩到 7 个节点。')
assert(countOccurrences(skillMasterySource, "skillType: 'mining'") >= 7, '挖矿精研必须至少扩到 7 个节点。')
assert(countOccurrences(skillMasterySource, "skillType: 'combat'") >= 7, '战斗精研必须至少扩到 7 个节点。')
assert(skillMasterySource.includes('batch_irrigation: 0.5'), '批量灌溉必须提供 50% 一键浇水体力减免。')
assert(skillMasterySource.includes('festival_supply: 0.15'), '节庆供货必须提供 15% 节庆日出货加成。')
assert(skillMasterySource.includes('seed_recovery: 1'), '良种回收必须提供收获返种开关。')
assert(skillMasterySource.includes('order_deed: 1'), '订单田契必须提供任务页信息开关。')
assert(skillMasterySource.includes('rare_signal: 0.2'), '稀有信号必须提供 20% 概率加成。')
assert(skillMasterySource.includes('weather_window: 0.15'), '天候窗口必须提供 15% 概率加成。')
assert(skillMasterySource.includes('mountain_hunch: 1'), '山路预感必须提供信息型提示开关。')
assert(skillMasterySource.includes('herb_sample: 1'), '药材留样必须提供见闻留样开关。')
assert(skillMasterySource.includes('journey_scout: 8'), '旅途侦察必须提供 8 点远行侦察加成。')
assert(skillMasterySource.includes('tide_marker: 1'), '潮汐标记必须提供提示开关。')
assert(skillMasterySource.includes('legend_weight: 0.25'), '传奇称重必须提供 25% 传说鱼经验加成。')
assert(skillMasterySource.includes('tide_notebook: 0.25'), '鱼汛笔记必须提供有封顶的同水域权重加成。')
assert(skillMasterySource.includes('processing_flow: 0.25'), '加工流线必须提供 25% 加工耗时缩短。')
assert(skillMasterySource.includes('pond_link: 0.1'), '鱼塘联动必须提供 10 个百分点产出概率加成。')
assert(skillMasterySource.includes('pond_pedigree: 1'), '鱼塘谱系必须提供信息型谱系开关。')
assert(skillMasterySource.includes('floor_intel: 1'), '层位情报必须提供提示开关。')
assert(skillMasterySource.includes('bomb_efficiency: 0.2'), '爆破效率必须提供 20% 炸弹返还概率。')
assert(skillMasterySource.includes('rare_transmute: 0.15'), '稀矿转化必须提供 15% 转化概率。')
assert(skillMasterySource.includes('vein_marker: 1'), '矿脉标记必须提供信息型矿洞提示开关。')
assert(skillMasterySource.includes('stabilized_blasting: 1'), '稳压爆破必须提供空爆返还开关。')
assert(skillMasterySource.includes('boss_pressure: 0.15'), '首领压制必须提供 15% Boss 奖励加成。')
assert(skillMasterySource.includes('escort_margin: 10'), '护送余裕必须提供 10 点远行压险加成。')
assert(skillMasterySource.includes('trinket_tuning: 0.1'), '饰品调校必须提供 10% 饰品效果加成。')
assert(skillMasterySource.includes('boss_dossier: 1'), '首领档案必须提供 Boss 信息提示开关。')
assert(skillMasterySource.includes('escort_discipline: 0.08'), '护送纪律必须提供有封顶的失败减损比例。')
assert(skillMasterySource.includes("id: 'farming_soil_calendar'"), '农耕精研必须包含地力历法预留节点。')
assert(skillMasterySource.includes("id: 'foraging_specimen_map'"), '采集精研必须包含样本地图预留节点。')
assert(skillMasterySource.includes("id: 'fishing_contest_prep'"), '钓鱼精研必须包含赛前备钓预留节点。')
assert(skillMasterySource.includes("id: 'mining_safety_rope'"), '挖矿精研必须包含安绳记号预留节点。')
assert(skillMasterySource.includes("id: 'combat_supply_route'"), '战斗精研必须包含补给路线预留节点。')
assert(skillMasterySource.includes('storage_plan: 1'), '新增预留精研节点必须只提供信息型开关值。')
assert(masterySource.includes("id: 'mastery_ricefish_loop'"), '混合精通必须补入农耕 + 钓鱼的水田/鱼肥循环方向。')
assert(masterySource.includes("id: 'mastery_artisan_foundry'"), '混合精通必须补入农耕 + 挖矿的高级工台方向。')
assert(masterySource.includes("id: 'mastery_wild_frontier'"), '混合精通必须补入采集 + 战斗的危险区域探索方向。')
assert(masterySource.includes("id: 'mastery_subterranean_tide'"), '混合精通必须补入钓鱼 + 挖矿的地下水域方向。')
assert(masterySource.includes("id: 'mastery_taoyuan_allrounder'"), '混合精通必须补入全五系 20 级的终局证书方向。')
assert(masterySource.includes('不提供巨额倍率'), '全五系 20 精通必须明确不提供巨额倍率奖励。')
assert(masterySource.includes("id: 'blessing_altar'"), '功能性精通奖励必须包含每日祝福神像。')
assert(masterySource.includes("id: 'trinket_slot'"), '功能性精通奖励必须包含护符 / 饰物位。')
assert(masterySource.includes("id: 'advanced_workbench'"), '功能性精通奖励必须包含高级工台权限。')
assert(masterySource.includes("unlockMasteryId: 'mastery_artisan_foundry'"), '高级工台权限必须绑定农耕 + 挖矿混合精通。')
assert(masterySource.includes("id: 'transmutation_recipe'"), '功能性精通奖励必须包含稀有资源转化配方。')
assert(masterySource.includes("id: 'journey_map_markers'"), '功能性精通奖励必须包含特殊地图标记能力。')

assert(skillStoreSource.includes('getSkillMasteryEffectValue'), '技能 store 必须暴露 effectKey 读取函数。')
assert(skillStoreSource.includes('SKILL_MASTERY_EFFECT_VALUES[effectKey]'), 'effectKey 读取必须来自统一数值表。')
assert(skillStoreSource.includes('hasSkillMasteryNode(node.id)'), '未解锁节点不得提供精研效果值。')
assert(skillStoreSource.includes('const isMasteryRewardUnlocked = (rewardId: string): boolean'), '技能 store 必须暴露功能性精通奖励解锁查询。')
assert(skillStoreSource.includes("masteryRewards.value.find(entry => entry.id === 'blessing_altar' && entry.unlocked)"), '每日祝福必须受祝福神像解锁控制。')
assert(skillStoreSource.includes('const getBlessingEffectValue = (effectType: RingEffectType): number =>'), '技能 store 必须提供每日祝福效果查询。')
assert(storyQuestsSource.includes('所有技能达到大师门槛（10级）'), '主线最终挑战必须把 10 级目标写成大师门槛，避免和 20 级满级混淆。')
assert(skillViewSource.includes('SKILL_MASTERY_NODE_SURFACES'), '技能页必须把精研节点显示为玩家可读的玩法落点。')
assert(skillViewSource.includes('已接入：{{ SKILL_MASTERY_NODE_SURFACES[node.id] }}'), '技能页必须显示精研节点的玩法接线位置。')
assert(skillViewSource.includes('farming_seed_recovery: \'作物收获返种\''), '技能页必须展示良种回收的玩法落点。')
assert(skillViewSource.includes('combat_escort_discipline: \'远征失败结算\''), '技能页必须展示护送纪律的玩法落点。')
assert(skillViewSource.includes('farming_storage_plan: \'仓储整理预留\''), '技能页必须展示新增农耕预留节点落点。')
assert(skillViewSource.includes('combat_supply_route: \'补给检查预留\''), '技能页必须展示新增战斗预留节点落点。')
assert(!skillViewSource.includes('{{ node.effectKey }}'), '技能页不得向玩家显示 effectKey 开发字段。')
assert(skillViewSource.includes('今日祝福预告'), '技能页必须解释每日祝福来源。')
assert(skillViewSource.includes('skillStore.dailyBlessingPreview.sourceLabel'), '技能页每日祝福必须显示来源标签。')
assert(cottageViewSource.includes('精通神像'), '小屋必须把每日祝福来源标为精通神像。')
assert(cottageViewSource.includes('dailyBlessingPreview.sourceSummary'), '小屋每日祝福必须显示来源说明。')

assert(farmActionsSource.includes("skillStore.getSkillMasteryEffectValue('seed_recovery')"), '收获流程必须读取良种回收效果。')
assert(farmActionsSource.includes('const SEED_RECOVERY_CHANCE = 0.08'), '良种回收概率必须保持为低风险小概率。')
assert(farmActionsSource.includes("const SEED_RECOVERY_EXCLUDED_CROP_IDS = new Set(['ancient_fruit'])"), '良种回收必须排除远古果。')
assert(farmActionsSource.includes('crop.seedPrice <= 0'), '良种回收必须排除不可购种或高阶活动种子。')
assert(farmActionsSource.includes('inventoryStore.canAddItem(cropDef!.seedId, 1)'), '良种回收必须先检查背包空间再返种。')

assert(questViewSource.includes("skillStore.getSkillMasteryEffectValue('order_deed')"), '任务页必须读取订单田契效果。')
assert(questViewSource.includes('itemDef?.category !== \'crop\''), '订单田契只应提示作物委托。')
assert(questViewSource.includes('订单田契：需求'), '订单田契必须向玩家显示作物需求提示。')

assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('rare_signal')"), '采集页必须读取稀有信号效果。')
assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('weather_window')"), '采集页必须读取天候窗口效果。')
assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('mountain_hunch')"), '采集页必须读取山路预感效果。')
assert(forageViewSource.includes("skillStore.getSkillMasteryEffectValue('herb_sample')"), '采集页必须读取药材留样效果。')
assert(forageViewSource.includes('山路预感'), '采集页必须显示山路预感提示。')
assert(forageViewSource.includes('不会额外抬高产出'), '山路预感必须明确是不抬高产出的信息型精研。')
assert(forageViewSource.includes('const firstDiscovery = !achievementStore.isDiscovered(itemId)'), '药材留样必须只在首次发现时触发。')
assert(forageViewSource.includes('药材留样：'), '药材留样必须在采集结果中提示见闻记录。')
assert(forageViewSource.includes('不额外产出'), '药材留样必须明确不额外产出。')
assert(forageViewSource.includes('item.chance <= 0.12 ? 1 + rareSignalBonus.value : 1'), '稀有信号只应加成低基础概率采集物。')
assert(forageViewSource.includes('environmentWindow.value.forage.active ? 1 + weatherWindowBonus.value : 1'), '天候窗口只应在环境窗口激活时加成。')
assert(forageViewSource.includes('rareSignalMult *'), '采集概率公式必须乘入稀有信号倍率。')
assert(forageViewSource.includes('weatherWindowMult *'), '采集概率公式必须乘入天候窗口倍率。')
assert(!skillStoreSource.includes("if (skill.perk10 === 'botanist') return 'fine'"), 'Foraging botanist must not short-circuit excellent/supreme rolls.')
assert(skillStoreSource.includes("return skill.perk10 === 'botanist' && quality === 'normal' ? 'fine' : quality"), 'Foraging botanist should act as a minimum-quality floor.')

assert(journeyBuildSource.includes("skillStore.getSkillMasteryEffectValue('journey_scout')"), '远行构筑必须读取旅途侦察效果。')
assert(journeyBuildSource.includes("skillStore.getSkillMasteryEffectValue('escort_margin')"), '远行构筑必须读取护送余裕效果。')
assert(journeyBuildSource.includes('scoutBonus: journeyScoutBonus'), '旅途侦察必须加到远行侦察值。')
assert(journeyBuildSource.includes('hazardResist: escortMarginBonus'), '护送余裕必须加到远行压险值。')
assert(regionMapStoreSource.includes("useSkillStore().getSkillMasteryEffectValue('escort_discipline')"), '远征结算必须读取护送纪律效果。')
assert(regionMapStoreSource.includes('const getEscortDisciplineReserve = (cap: number) =>'), '护送纪律必须集中计算失败保全量。')
assert(regionMapStoreSource.includes('getEscortDisciplineReserve(2)'), '护送纪律在 Boss 失败中必须有小额封顶。')
assert(regionMapStoreSource.includes('getEscortDisciplineReserve(5)'), '护送纪律在路线失败中必须有路线封顶。')
assert(regionMapStoreSource.includes('护送纪律减少损失'), '护送纪律生效时必须在失败结算中提示。')

assert(fishingStoreSource.includes("skillStore.getSkillMasteryEffectValue('tide_marker')"), '钓鱼流程必须读取潮汐标记效果。')
assert(fishingStoreSource.includes('const tideMarkerHint = computed(() =>'), '钓鱼 store 必须集中生成潮汐标记提示。')
assert(fishingStoreSource.includes("fish.difficulty === 'legendary'"), '潮汐标记必须只关注传说鱼窗口。')
assert(fishingStoreSource.includes('FISHING_LOCATION_NAME_BY_ID'), '潮汐标记必须显示传说鱼所在钓点。')
assert(fishingViewSource.includes('fishingStore.tideMarkerHint'), '钓鱼页必须展示潮汐标记提示。')
assert(fishingStoreSource.includes("skillStore.getSkillMasteryEffectValue('legend_weight')"), '钓鱼结算必须读取传奇称重效果。')
assert(fishingStoreSource.includes("from '@/utils/fishingExperience'"), 'Fishing store must use the shared fishing XP formula utility.')
assert(fishingStoreSource.includes('getFishingCatchExperience({'), 'Fishing success settlement must call getFishingCatchExperience.')
assert(fishingStoreSource.includes('quantity: catchQty'), 'Fishing XP must include wild-bait double-catch quantity.')
assert(fishingStoreSource.includes('quality,'), 'Fishing XP must include caught fish quality.')
assert(fishingStoreSource.includes('riverlandBonus,'), 'Fishing XP must keep riverland farm multiplier.')
assert(fishingStoreSource.includes('perfectMult,'), 'Fishing XP must keep perfect-catch multiplier.')
assert(fishingStoreSource.includes('legendWeightBonus'), 'Fishing XP must keep legendary weight multiplier.')
assert(fishingStoreSource.includes("message += '（传奇称重）'"), '传奇称重触发时必须在钓鱼结果中提示。')
assert(fishingStoreSource.includes("skillStore.getSkillMasteryEffectValue('tide_notebook')"), '钓鱼流程必须读取鱼汛笔记效果。')
assert(fishingStoreSource.includes('const recordTideNotebookCast = (): number =>'), '鱼汛笔记必须集中记录同水域连续抛竿。')
assert(fishingStoreSource.includes('(tideNotebookCastStreak.value - 1) * 0.05'), '鱼汛笔记必须按每次 5% 递增。')
assert(fishingStoreSource.includes('Math.min(cap, Math.max(0, (tideNotebookCastStreak.value - 1) * 0.05))'), '鱼汛笔记必须按 effect 值封顶。')
assert(fishingStoreSource.includes('const tideNotebookMult = 1 + getTideNotebookWeightBonus(f)'), '鱼汛笔记必须进入上钩权重公式。')
assert(fishingStoreSource.includes('鱼汛笔记：同水域目标鱼权重+'), '鱼汛笔记生效时必须在抛竿消息中提示。')
assert(fishingStoreSource.includes('export const FISH_GOD_BASE_LEGENDARY_WEIGHT = 3.5'), '鱼神传说鱼基础权重必须从原 5.0 下调到可控基准。')
assert(fishingStoreSource.includes('export const FISH_GOD_LEGENDARY_SHARE_CAP = 0.45'), '鱼神传说鱼占比必须有默认封顶。')
assert(fishingStoreSource.includes('export const FISH_GOD_TARGETED_LEGENDARY_SHARE_CAP = 0.5'), '定向鱼饵下鱼神传说鱼占比也必须封顶。')
assert(fishingStoreSource.includes('export const FISH_GOD_COOLDOWN_MULTIPLIER = 0.45'), '鱼神连续钓上传说鱼后必须有短暂权重冷却。')
assert(fishingStoreSource.includes("const hasFishGod = fishingSkill.perk20 === 'fish_god'"), '海洋商人不得再被当作鱼神参与传说鱼权重。')
assert(!fishingStoreSource.includes("fishingSkill.perk20 === 'fish_god' || fishingSkill.perk20 === 'ocean_trader'"), '鱼神权重判断不得包含海洋商人。')
assert(fishingStoreSource.includes('capLegendaryWeightShare('), '鱼神传说鱼权重必须经过占比封顶 helper。')
assert(fishingStoreSource.includes('recordFishGodFishSelection(selectedFish, hasEligibleLegendaryFish)'), '鱼神必须记录传说鱼命中/未命中状态。')
assert(fishingStoreSource.includes('fishGodLegendaryMissStreak'), '鱼神必须保存未命中保底进度。')
assert(fishingStoreSource.includes('fishGodLegendaryCooldownCasts'), '鱼神必须保存连续传说鱼冷却进度。')
assert(!skillViewSource.includes("fish_god: '任何时间任何天气均可钓到传说鱼'"), '技能页鱼神文案不得承诺任何时间任何天气。')
assert(!readSource('src/components/game/PerkSelectDialog.vue').includes('传说鱼必定出现，钓鱼体力消耗清零'), '技能选择弹窗鱼神文案不得承诺传说鱼必定出现。')
assert(fishingStoreSource.includes('export const LUREMASTER_BAIT_EFFECT_MULTIPLIER = 2'), '诱饵师必须显式把鱼饵效果放大到 2 倍。')
assert(fishingStoreSource.includes('export const BAIT_MASTER_BAIT_EFFECT_MULTIPLIER = 4'), '诱饵宗师必须显式把鱼饵效果放大到 4 倍。')
assert(fishingStoreSource.includes('export const LURE_DEITY_BAIT_EFFECT_MULTIPLIER = 8'), '诱饵神必须显式把鱼饵效果放大到 8 倍。')
assert(fishingStoreSource.includes('const hardMult = applyFishingBaitWeightMultiplier(activeBaitDef.value?.hardWeightMult, baitEffectMultiplier)'), '困难鱼权重鱼饵必须吃到诱饵线倍率。')
assert(fishingStoreSource.includes('const legendaryMult = applyFishingBaitWeightMultiplier(activeBaitDef.value?.legendaryWeightMult, baitEffectMultiplier)'), '传说鱼权重鱼饵必须吃到诱饵线倍率。')
assert(fishingStoreSource.includes('const doubleCatchChance = Math.min(1, (activeBaitDef.value?.doubleCatchChance ?? 0) * baitEffectMultiplier)'), '野生鱼饵双倍鱼获概率必须吃到诱饵线倍率并封顶。')
assert(!skillViewSource.includes("lure_deity: '无需鱼饵，自动吸引最稀有的鱼'"), '技能页诱饵神文案不得承诺无需鱼饵或自动锁定最稀有鱼。')
assert(skillViewSource.includes("livestock_baron: '牲畜大亨'"), '技能页必须沿用农耕15级选择弹窗里的牲畜大亨名称。')
assert(skillViewSource.includes("livestock_baron: '动物产品售价+30%'"), '技能页牲畜大亨说明必须展示真实售价+30%效果。')
assert(shopStoreSource.includes("label: `技能：${sellPricePerkLabel(farmSkill.perk15, '农耕15级')}`"), '售价明细必须按已选农耕15级专精显示名称，不得回退成高阶牧养。')
assert(!shopStoreSource.includes("label: '技能：高阶牧养'"), '售价明细不得用高阶牧养替代牲畜大亨/动物语者。')
assert(skillViewSource.includes("aquatic_merchant: '水产巨商'"), '技能页必须沿用钓鱼15级选择弹窗里的水产巨商名称。')
assert(skillViewSource.includes("ocean_trader: '海洋贸易商'"), '技能页必须沿用钓鱼20级选择弹窗里的海洋贸易商名称。')
assert(skillViewSource.includes("ocean_trader: '所有鱼售价+100%'"), '技能页海洋贸易商说明必须展示真实售价+100%效果。')
assert(shopStoreSource.includes("label: `技能：${sellPricePerkLabel(fishSkill.perk15, '钓鱼15级')}`"), '售价明细必须按已选钓鱼15级专精显示名称，不得回退成高阶渔业。')
assert(!shopStoreSource.includes("label: '技能：高阶渔业'"), '售价明细不得用高阶渔业替代传说垂钓者/水产巨商。')

assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('bomb_efficiency')"), '挖矿炸弹流程必须读取爆破效率效果。')
assert(miningStoreSource.includes('!excavatorPerkSaved && bombEfficiencyChance > 0'), '爆破效率不得和旧挖掘者返还重复判定。')
assert(miningStoreSource.includes('const DEEP_EXCAVATOR_BOMB_REFUND_CHANCE = 0.5'), '15级深渊挖掘者必须保持 50% 炸弹返还。')
assert(miningStoreSource.includes('const ABYSS_MINER_GUARANTEED_REFUNDS_PER_FLOOR = 1'), '20级深渊矿工必须按层限制保底返还。')
assert(miningStoreSource.includes('const ABYSS_MINER_EXTRA_REFUND_CHANCE = 0.6'), '20级深渊矿工后续返还必须是受控概率。')
assert(miningStoreSource.includes('bombEfficiencySaved ? \'爆破效率\' : excavatorRefundLabel'), '炸弹返还消息必须区分精研与挖掘者系专精。')
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
assert(miningStoreSource.includes('msg += getMineMasteryEntryHints(newFloor)'), '前进到新层时必须追加精研进层提示。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('vein_marker')"), '矿洞流程必须读取矿脉标记效果。')
assert(miningStoreSource.includes('const getVeinMarkerMessage = (): string =>'), '矿脉标记必须集中生成方向提示。')
assert(miningStoreSource.includes('getRelativeMineDirection(entryIndex.value, target.tile.index)'), '矿脉标记必须只显示相对方向。')
assert(miningStoreSource.includes('getMineMasteryEntryHints'), '层位情报和矿脉标记必须共享进层提示入口。')
assert(miningStoreSource.includes('RARE_TRANSMUTE_ORE_UPGRADES'), '挖矿流程必须集中定义稀矿转化链。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('rare_transmute')"), '手动采矿必须读取稀矿转化效果。')
assert(miningStoreSource.includes('const rareTransmuteRewards: InventoryRewardEntry[] = rareTransmuteOreId ? [{ itemId: rareTransmuteOreId, quantity: 1 }] : []'), '稀矿转化必须追加为额外奖励项。')
assert(miningStoreSource.includes('if (rareTransmuteOreId) useQuestStore().onItemObtained(rareTransmuteOreId, 1)'), '稀矿转化奖励必须通知任务获得。')
assert(miningStoreSource.includes('（稀矿转化）'), '稀矿转化触发时必须在采矿消息中提示。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('stabilized_blasting')"), '炸弹流程必须读取稳压爆破效果。')
assert(miningStoreSource.includes('oreCollected === 0 &&'), '稳压爆破必须只在未采到矿石时触发。')
assert(miningStoreSource.includes('monstersKilled === 0 &&'), '稳压爆破必须只在未击杀怪物时触发。')
assert(miningStoreSource.includes('utilityTargetsRevealed === 0 &&'), '稳压爆破必须只在没有揭示怪物、BOSS、陷阱或楼梯时触发。')
assert(miningStoreSource.includes('rewards.length === 0'), '稳压爆破必须只在没有任何奖励时触发。')
assert(miningStoreSource.includes('稳压爆破：空爆返还炸弹'), '稳压爆破触发时必须提示返还原因。')
assert(miningStoreSource.includes("skillStore.getSkillMasteryEffectValue('boss_dossier')"), 'Boss 战流程必须读取首领档案效果。')
assert(miningStoreSource.includes('const getBossDossierMessage = (monster: MonsterDef, isFirstKill: boolean): string =>'), '首领档案必须集中生成 Boss 提示。')
assert(miningStoreSource.includes('getBossDossierMessage(monster, isFirstKill)'), '首领档案必须进入 Boss 战开场日志。')
assert(miningStoreSource.includes('首领档案：生命'), '首领档案必须展示生命、攻击和防御摘要。')

assert(processingStoreSource.includes("skillStore.getSkillMasteryEffectValue('processing_flow')"), '加工流程必须读取加工流线效果。')
assert(processingStoreSource.includes('const getEffectiveProcessingDays = (recipe: ProcessingRecipeDef, machineType: MachineType): number =>'), '加工耗时必须集中计算。')
assert(processingStoreSource.includes('Math.ceil(totalDays * (1 - processingFlowBonus))'), '加工流线必须缩短加工耗时。')
assert(countOccurrences(processingStoreSource, 'slot.totalDays = getEffectiveProcessingDays(recipe, slot.machineType)') >= 3, '手工投产、炼丹投产和虚空原料箱自动续产都必须使用有效加工耗时。')
assert(processingDataSource.includes("masteryRewardId: 'advanced_workbench'"), '仙灵炉必须绑定高级工台权限。')
assert(processingStoreSource.includes('const isMachineCraftUnlocked = (machineType: MachineType): boolean =>'), '加工 store 必须集中判断高阶机器制作权限。')
assert(processingStoreSource.includes('if (!isMachineCraftUnlocked(machineType)) return false'), '制作机器时必须在 store 层拦截未解锁的高级工台。')
assert(processingViewSource.includes('processingStore.isMachineCraftUnlocked(m.id)'), '加工页制作按钮必须读取高级工台权限。')
assert(processingViewSource.includes('processingStore.getMachineCraftLockedReason(m.id)'), '加工页必须显示高级工台锁定原因。')
assert(processingDataSource.includes("id: 'alchemy_ley_prismatic_transmutation'"), '稀有资源转化配方必须落到真实炼丹配方。')
assert(processingDataSource.includes("gate: { masteryRewardId: 'transmutation_recipe' }"), '稀有资源转化配方必须受功能性精通奖励 gate 控制。')
assert(processingDataSource.includes("{ itemId: 'rare_elixir_crystal', quantity: 1 }"), '稀有资源转化配方必须消耗奇丹晶，避免无成本转化。')
assert(processingDataSource.includes("results: buildAlchemyResultRules('prismatic_shard')"), '稀有资源转化配方必须使用炼丹结果表，允许失败消耗。')
assert(processingStoreSource.includes('gate?.masteryRewardId && !skillStore.isMasteryRewardUnlocked(gate.masteryRewardId)'), '隐藏配方访问必须检查功能性精通奖励 gate。')

assert(fishPondStoreSource.includes("skillStore.getSkillMasteryEffectValue('pond_link')"), '鱼塘每日更新必须读取鱼塘联动效果。')
assert(fishPondStoreSource.includes('const skillBonus = pondLinkBonus * (def.productionSkillBonusMultiplier ?? 1)'), '鱼塘联动必须支持按鱼种缩放或关闭精研概率加成。')
assert(fishPondStoreSource.includes('const uncappedRate = def.baseProductionRate + weightBonus + skillBonus'), '鱼塘产出概率必须加上鱼塘联动后的技能加成。')
assert(fishPondStoreSource.includes('const rate = Math.min(1, def.maxProductionRate ?? 1, uncappedRate)'), '鱼塘产出概率必须同时受全局和鱼种封顶保护。')
assert(fishPondViewSource.includes("skillStore.getSkillMasteryEffectValue('pond_pedigree')"), '鱼塘页必须读取鱼塘谱系效果。')
assert(fishPondViewSource.includes('鱼塘谱系'), '鱼塘页必须显示鱼塘谱系详情。')
assert(fishPondViewSource.includes('productionWeightBonusMultiplier'), '鱼塘谱系必须展示体重基因对产率的影响。')
assert(fishPondViewSource.includes('def.maxProductionRate ?? 1'), '鱼塘谱系必须展示受保护鱼种的产率封顶。')

assert(farmActionsSource.includes("skillStore.getSkillMasteryEffectValue('batch_irrigation')"), '一键浇水必须读取批量灌溉效果。')
assert(farmActionsSource.includes('(1 - batchIrrigationReduction)'), '一键浇水体力公式必须乘入批量灌溉减免。')
assert(farmActionsSource.includes('（批量灌溉）'), '批量灌溉生效时必须在一键浇水日志中提示。')

assert(shopStoreSource.includes("skillStore.getSkillMasteryEffectValue('festival_supply')"), '出货箱结算必须读取节庆供货效果。')
assert(shopStoreSource.includes('hasCurrentFestivalSupplyWindow'), '节庆供货必须只在当天存在节庆事件时生效。')
assert(shopStoreSource.includes('isFestivalSupplyCategory'), '节庆供货必须限制到作物和加工品分类。')
assert(shopStoreSource.includes('festivalSupplyMultiplier'), '出货箱结算必须把节庆供货倍率乘入收入公式。')

assert(shopStoreSource.includes("skillStore.getBlessingEffectValue('sell_price_bonus')"), '每日祝福必须接入出货售价效果入口。')
assert(questStoreSource.includes('activeDailyBlessing?.preferredMarketCategories'), '每日祝福必须接入告示板 / 订单偏向。')
assert(questStoreSource.includes('【今日祝福】'), '任务提示必须解释每日祝福对委托偏向的来源。')
assert(fishingStoreSource.includes("skillStore.getBlessingEffectValue('fishing_stamina')"), '每日祝福必须接入钓鱼体力效果入口。')
assert(miningStoreSource.includes("skillStore.getBlessingEffectValue('mining_stamina')"), '每日祝福必须接入挖矿体力效果入口。')

assert(inventoryStoreSource.includes("getSkillMasteryEffectValue('trinket_tuning')"), '装备加成汇总必须读取饰品调校效果。')
assert(inventoryStoreSource.includes('eff.value * trinketTuningMultiplier'), '饰品调校必须只放大已装备饰品的效果值。')
assert(charInfoViewSource.includes("activeSlot = 'trinket'"), '角色信息页必须允许已解锁护符 / 饰物位后进入选择。')
assert(inventoryViewSource.includes('isTrinketSlotUnlocked'), '背包装备页必须读取护符 / 饰物位解锁状态。')
assert(regionMapStoreSource.includes("isMasteryRewardUnlocked('journey_map_markers')"), '行旅图必须读取特殊地图标记能力解锁状态。')
assert(regionMapStoreSource.includes('精通地图标记'), '特殊地图标记必须进入行旅图摘要。')
assert(guideViewSource.includes('regionMapStore.frontierDigest.nextHookSummaries.find'), '新手路线页必须复用行旅图精通标记摘要。')

const applyForageChance = ({ baseChance, rareBonus, weatherBonus, windowActive }) => {
  const rareSignalMult = baseChance <= 0.12 ? 1 + rareBonus : 1
  const weatherWindowMult = windowActive ? 1 + weatherBonus : 1
  return Math.min(1, baseChance * rareSignalMult * weatherWindowMult)
}

assert(near(applyForageChance({ baseChance: 0.1, rareBonus: 0.2, weatherBonus: 0, windowActive: false }), 0.12), '模型用例：10% 稀有采集物应被稀有信号提高到 12%。')
assert(near(applyForageChance({ baseChance: 0.5, rareBonus: 0.2, weatherBonus: 0, windowActive: false }), 0.5), '模型用例：普通采集物不应吃到稀有信号。')
assert(near(applyForageChance({ baseChance: 0.1, rareBonus: 0.2, weatherBonus: 0.15, windowActive: true }), 0.138), '模型用例：稀有信号和天候窗口应可叠乘。')

const applyForageQualityFloorModel = (rolledQuality, hasBotanist, walletBoost = 0) => {
  const qualityOrder = ['normal', 'fine', 'excellent', 'supreme']
  const flooredQuality = hasBotanist && rolledQuality === 'normal' ? 'fine' : rolledQuality
  return qualityOrder[Math.min(qualityOrder.indexOf(flooredQuality) + walletBoost, qualityOrder.length - 1)]
}
assert(applyForageQualityFloorModel('supreme', true, 1) === 'supreme', 'Foraging botanist plus wallet boost must preserve supreme rolls.')
assert(applyForageQualityFloorModel('excellent', true, 1) === 'supreme', 'Foraging botanist plus wallet boost should allow excellent rolls to upgrade to supreme.')
assert(applyForageQualityFloorModel('normal', true, 1) === 'excellent', 'Foraging botanist plus wallet boost should still floor normal rolls to excellent.')

const applyBossReward = (baseValue, bossPressureBonus) => Math.floor(baseValue * (1 + bossPressureBonus) + 1e-6)
assert(applyBossReward(100, 0.15) === 115, '模型用例：100 点基础 Boss 奖励应正确提高到 115。')
assert(applyBossReward(200, 0.15) === 230, '模型用例：200 文基础 Boss 奖励应正确提高到 230。')

const getBossDossierModel = ({ hp, attack, defense, firstKill }) =>
  `生命${hp}/攻击${attack}/防御${defense}${firstKill ? '' : '/复战弱化'}`
assert(getBossDossierModel({ hp: 800, attack: 30, defense: 12, firstKill: true }).includes('生命800'), '模型用例：首领档案必须包含生命摘要。')
assert(getBossDossierModel({ hp: 800, attack: 30, defense: 12, firstKill: false }).includes('复战弱化'), '模型用例：首领档案必须区分复战弱化提示。')

const getEffectiveProcessingDaysModel = (baseDays, processingFlowBonus, loomSpeedActive = false) => {
  let totalDays = baseDays
  if (processingFlowBonus > 0) totalDays = Math.max(1, Math.ceil(totalDays * (1 - processingFlowBonus)))
  if (loomSpeedActive) totalDays = Math.max(1, Math.ceil(totalDays * 0.7))
  return totalDays
}
assert(getEffectiveProcessingDaysModel(4, 0.25) === 3, '模型用例：4 天加工在加工流线下应缩短到 3 天。')
assert(getEffectiveProcessingDaysModel(1, 0.25) === 1, '模型用例：加工流线不得把 1 天加工降到 0 天。')
assert(getEffectiveProcessingDaysModel(4, 0.25, true) === 3, '模型用例：加工流线和织速应按当前顺序叠加且不低于 1 天。')

const canAccessMasteryGateModel = ({ unlockedRewardIds, gate }) =>
  !gate?.masteryRewardId || unlockedRewardIds.includes(gate.masteryRewardId)
assert(!canAccessMasteryGateModel({ unlockedRewardIds: [], gate: { masteryRewardId: 'transmutation_recipe' } }), '模型用例：未解锁稀有资源转化配方时不得看到隐藏转化丹方。')
assert(canAccessMasteryGateModel({ unlockedRewardIds: ['transmutation_recipe'], gate: { masteryRewardId: 'transmutation_recipe' } }), '模型用例：解锁稀有资源转化配方后才能访问隐藏转化丹方。')
assert(canAccessMasteryGateModel({ unlockedRewardIds: [], gate: undefined }), '模型用例：没有精通 gate 的加工配方不应被误锁。')

const canCraftMasteryMachineModel = ({ masteryRewardId, unlockedRewardIds }) =>
  !masteryRewardId || unlockedRewardIds.includes(masteryRewardId)
assert(!canCraftMasteryMachineModel({ masteryRewardId: 'advanced_workbench', unlockedRewardIds: [] }), '模型用例：未解锁高级工台权限时不得制作仙灵炉。')
assert(canCraftMasteryMachineModel({ masteryRewardId: 'advanced_workbench', unlockedRewardIds: ['advanced_workbench'] }), '模型用例：解锁高级工台权限后可制作仙灵炉。')

const getPondRateModel = (baseProductionRate, weight, pondLinkBonus, productionSkillBonusMultiplier = 1, maxProductionRate = 1) =>
  Math.min(1, maxProductionRate, baseProductionRate + weight / 200 + pondLinkBonus * productionSkillBonusMultiplier)
assert(near(getPondRateModel(0.35, 50, 0.1), 0.7), '模型用例：鱼塘联动应为每日产出判定增加 10 个百分点。')
assert(near(getPondRateModel(0.9, 50, 0.1), 1), '模型用例：鱼塘联动后的产出率必须封顶到 100%。')
assert(near(getPondRateModel(0.02, 1, 0.1, 0, 0.025), 0.025), '模型用例：受保护稀有鱼产物不得吃到鱼塘联动加成，并必须受鱼种封顶保护。')

const getMountainHunchModel = (items, daySeed) => {
  const candidates = items.filter(item => item.chance <= 0.12).sort((a, b) => a.chance - b.chance || a.itemId.localeCompare(b.itemId))
  const fallback = items.slice().sort((a, b) => a.chance - b.chance || a.itemId.localeCompare(b.itemId))
  const pool = candidates.length > 0 ? candidates : fallback
  return pool.length > 0 ? pool[Math.abs(daySeed) % pool.length] : null
}
assert(getMountainHunchModel([{ itemId: 'common', chance: 0.5 }, { itemId: 'rare', chance: 0.08 }], 0)?.itemId === 'rare', '模型用例：山路预感应优先提示低基础概率采集物。')

const canRecoverSeedModel = ({ cropId, quality, seedPrice }) =>
  quality !== 'normal' && cropId !== 'ancient_fruit' && seedPrice > 0
assert(canRecoverSeedModel({ cropId: 'cabbage', quality: 'fine', seedPrice: 10 }), '模型用例：优质普通作物可以进入良种回收判定。')
assert(!canRecoverSeedModel({ cropId: 'cabbage', quality: 'normal', seedPrice: 10 }), '模型用例：普通品质作物不得触发良种回收。')
assert(!canRecoverSeedModel({ cropId: 'ancient_fruit', quality: 'supreme', seedPrice: 100 }), '模型用例：远古果不得触发良种回收。')
assert(!canRecoverSeedModel({ cropId: 'golden_melon', quality: 'supreme', seedPrice: 0 }), '模型用例：不可购种高阶作物不得触发良种回收。')

const herbSampleModel = ({ firstDiscovery, sampleEligible }) =>
  firstDiscovery && sampleEligible ? { journal: true, extraQuantity: 0 } : { journal: false, extraQuantity: 0 }
assert(herbSampleModel({ firstDiscovery: true, sampleEligible: true }).journal, '模型用例：首次稀有采集物应记录药材留样。')
assert(herbSampleModel({ firstDiscovery: true, sampleEligible: true }).extraQuantity === 0, '模型用例：药材留样不得额外给产物。')
assert(!herbSampleModel({ firstDiscovery: false, sampleEligible: true }).journal, '模型用例：重复采集不得重复触发药材留样。')

const getPondPedigreeRateModel = ({ baseRate, weight, pondLinkBonus, skillMultiplier = 1, weightMultiplier = 1, maxRate = 1 }) =>
  Math.min(1, maxRate, baseRate + (weight / 200) * weightMultiplier + pondLinkBonus * skillMultiplier)
assert(near(getPondPedigreeRateModel({ baseRate: 0.35, weight: 50, pondLinkBonus: 0.1 }), 0.7), '模型用例：鱼塘谱系应展示和每日产出一致的最终产率。')
assert(near(getPondPedigreeRateModel({ baseRate: 0.02, weight: 100, pondLinkBonus: 0.1, skillMultiplier: 0, weightMultiplier: 0, maxRate: 0.025 }), 0.02), '模型用例：鱼塘谱系应尊重稀有鱼的倍率关闭和封顶。')

const applyJourneyMasteryModel = (baseScout, baseHazard, journeyScoutBonus, escortMarginBonus) => ({
  scoutBonus: Math.round(baseScout + journeyScoutBonus),
  hazardResist: Math.max(0, Math.round(baseHazard + escortMarginBonus))
})
const journeyMasteryModel = applyJourneyMasteryModel(22, 35, 8, 10)
assert(journeyMasteryModel.scoutBonus === 30, '模型用例：旅途侦察应为远行侦察值增加 8 点。')
assert(journeyMasteryModel.hazardResist === 45, '模型用例：护送余裕应为远行压险值增加 10 点。')

const getEscortDisciplineReserveModel = (pendingReward, bonusReward, bonus, cap) =>
  Math.min(cap, Math.max(0, Math.floor((pendingReward + bonusReward) * bonus)))
assert(getEscortDisciplineReserveModel(40, 0, 0.08, 5) === 3, '模型用例：护送纪律应按失败时暂存资源小比例保全。')
assert(getEscortDisciplineReserveModel(200, 0, 0.08, 5) === 5, '模型用例：路线失败护送纪律必须受 5 份封顶。')
assert(getEscortDisciplineReserveModel(200, 0, 0.08, 2) === 2, '模型用例：Boss 失败护送纪律必须受 2 份封顶。')

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

assert(FISHING_DIFFICULTY_EXP_MULTIPLIER.easy === 1, 'Fishing XP easy difficulty multiplier must be 1.')
assert(FISHING_DIFFICULTY_EXP_MULTIPLIER.normal === 1.5, 'Fishing XP normal difficulty multiplier must be 1.5.')
assert(FISHING_DIFFICULTY_EXP_MULTIPLIER.hard === 2, 'Fishing XP hard difficulty multiplier must be 2.')
assert(FISHING_DIFFICULTY_EXP_MULTIPLIER.legendary === 3, 'Fishing XP legendary difficulty multiplier must be 3.')
assert(FISHING_QUALITY_EXP_MULTIPLIER.normal === 1, 'Fishing XP normal quality multiplier must be 1.')
assert(FISHING_QUALITY_EXP_MULTIPLIER.fine === 1.25, 'Fishing XP fine quality multiplier must be 1.25.')
assert(FISHING_QUALITY_EXP_MULTIPLIER.excellent === 1.5, 'Fishing XP excellent quality multiplier must be 1.5.')
assert(FISHING_QUALITY_EXP_MULTIPLIER.supreme === 2, 'Fishing XP supreme quality multiplier must be 2.')

const normalFishExp = getFishingCatchExperience({
  fish: { difficulty: 'normal', sellPrice: 100 },
  quantity: 1,
  quality: 'normal'
})
assert(normalFishExp === 150, `Fishing XP normal single catch should preserve old base: ${normalFishExp}`)
assert(getFishingCatchExperience({ fish: { difficulty: 'normal', sellPrice: 100 }, quantity: 2, quality: 'normal' }) === 300, 'Fishing XP must double when wild bait catches two fish.')
assert(getFishingCatchExperience({ fish: { difficulty: 'easy', sellPrice: 100 }, quality: 'fine' }) === 125, 'Fishing XP fine quality should use 1.25x.')
assert(getFishingCatchExperience({ fish: { difficulty: 'easy', sellPrice: 100 }, quality: 'excellent' }) === 150, 'Fishing XP excellent quality should use 1.5x.')
assert(getFishingCatchExperience({ fish: { difficulty: 'easy', sellPrice: 100 }, quality: 'supreme' }) === 200, 'Fishing XP supreme quality should use 2x.')
assert(getFishingCatchExperience({
  fish: { difficulty: 'legendary', sellPrice: 500 },
  quantity: 2,
  quality: 'supreme',
  riverlandBonus: 1.25,
  perfectMult: 2,
  legendWeightBonus: 0.25
}) === 18750, 'Fishing XP must stack quantity, quality, riverland, perfect catch, and legendary weight.')

const getTideNotebookBonusModel = (streak, cap = 0.25) => Math.min(cap, Math.max(0, (streak - 1) * 0.05))
assert(near(getTideNotebookBonusModel(1), 0), '模型用例：鱼汛笔记首次同水域抛竿不应加权。')
assert(near(getTideNotebookBonusModel(3), 0.1), '模型用例：鱼汛笔记连续第三竿应提供 10% 权重。')
assert(near(getTideNotebookBonusModel(12), 0.25), '模型用例：鱼汛笔记必须封顶到 25%。')

const getFishGodLegendaryShareCapModel = (hasTargetedBait, missStreak) => {
  const baseCap = hasTargetedBait ? 0.5 : 0.45
  const pitySteps = Math.max(0, Math.floor(missStreak) - 4 + 1)
  const pityBonus = Math.min(0.16, pitySteps * 0.08)
  return Math.min(0.58, baseCap + pityBonus)
}
const getFishGodLegendaryPressureMultiplierModel = (cooldownCasts, missStreak) => {
  const cooldownMult = cooldownCasts > 0 ? 0.45 : 1
  const pitySteps = Math.max(0, Math.floor(missStreak) - 4 + 1)
  const pityMult = 1 + Math.min(0.48, pitySteps * 0.12)
  return cooldownMult * pityMult
}
const capLegendaryWeightShareModel = (fishPool, weights, shareCap) => {
  const cap = Math.min(1, Math.max(0, shareCap))
  let legendaryWeight = 0
  let otherWeight = 0
  weights.forEach((weight, index) => {
    if (fishPool[index].difficulty === 'legendary') legendaryWeight += Math.max(0, weight)
    else otherWeight += Math.max(0, weight)
  })
  if (cap >= 1 || legendaryWeight <= 0 || otherWeight <= 0) return [...weights]
  const maxLegendaryWeight = otherWeight * (cap / (1 - cap))
  if (legendaryWeight <= maxLegendaryWeight) return [...weights]
  const scale = maxLegendaryWeight / legendaryWeight
  return weights.map((weight, index) => (fishPool[index].difficulty === 'legendary' ? weight * scale : weight))
}
const fishGodCapPool = [{ difficulty: 'legendary' }, { difficulty: 'easy' }, { difficulty: 'normal' }, { difficulty: 'hard' }]
const fishGodCappedWeights = capLegendaryWeightShareModel(fishGodCapPool, [12, 3, 2, 1], getFishGodLegendaryShareCapModel(false, 0))
const fishGodCappedShare = fishGodCappedWeights[0] / fishGodCappedWeights.reduce((sum, weight) => sum + weight, 0)
assert(near(fishGodCappedShare, 0.45), '模型用例：鱼神传说鱼权重应被压到默认 45% 占比上限。')
assert(near(getFishGodLegendaryShareCapModel(true, 0), 0.5), '模型用例：定向鱼饵下鱼神传说鱼占比上限应为 50%。')
assert(near(getFishGodLegendaryShareCapModel(false, 4), 0.53), '模型用例：鱼神连续未中传说鱼后应开始提高占比上限。')
assert(near(getFishGodLegendaryShareCapModel(true, 8), 0.58), '模型用例：鱼神保底占比必须受硬上限保护。')
assert(near(getFishGodLegendaryPressureMultiplierModel(2, 0), 0.45), '模型用例：鱼神刚钓上传说鱼后应短暂冷却。')
assert(near(getFishGodLegendaryPressureMultiplierModel(0, 6), 1.36), '模型用例：鱼神连续未中传说鱼后应提高传说鱼权重。')
const getFishingBaitEffectMultiplierModel = ({ perk10 = null, perk15 = null, perk20 = null }) => {
  if (perk20 === 'lure_deity') return 8
  if (perk15 === 'bait_master') return 4
  if (perk10 === 'luremaster') return 2
  return 1
}
const applyFishingBaitWeightMultiplierModel = (baseMultiplier, baitEffectMultiplier) => 1 + Math.max(0, baseMultiplier - 1) * Math.max(1, baitEffectMultiplier)
assert(getFishingBaitEffectMultiplierModel({ perk10: 'luremaster' }) === 2, '模型用例：诱饵师应提供 2 倍鱼饵效果。')
assert(getFishingBaitEffectMultiplierModel({ perk15: 'bait_master' }) === 4, '模型用例：诱饵宗师应提供 4 倍鱼饵效果。')
assert(getFishingBaitEffectMultiplierModel({ perk20: 'lure_deity' }) === 8, '模型用例：诱饵神应提供 8 倍鱼饵效果。')
assert(near(applyFishingBaitWeightMultiplierModel(2, 8), 9), '模型用例：诱饵神应把定向鱼饵困难鱼权重从 ×2 放大到 ×9。')
assert(near(applyFishingBaitWeightMultiplierModel(1.5, 8), 5), '模型用例：诱饵神应把定向鱼饵传说鱼权重从 ×1.5 放大到 ×5。')
assert(near(Math.min(1, 0.25 * getFishingBaitEffectMultiplierModel({ perk20: 'lure_deity' })), 1), '模型用例：诱饵神应让野生鱼饵双倍鱼获概率封顶到 100%。')

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

const getVeinMarkerModel = (tiles, entryIndex) => {
  const score = tile => (tile.type === 'treasure' ? 100 : tile.type === 'mushroom' ? 45 : tile.type === 'ore' ? tile.value : 0)
  return tiles
    .filter(tile => tile.hidden && score(tile) > 0)
    .map(tile => ({ ...tile, score: score(tile), distance: Math.abs(Math.floor(tile.index / 6) - Math.floor(entryIndex / 6)) + Math.abs((tile.index % 6) - (entryIndex % 6)) }))
    .sort((a, b) => b.score - a.score || a.distance - b.distance || a.index - b.index)[0] ?? null
}
assert(getVeinMarkerModel([{ index: 2, type: 'ore', hidden: true, value: 6 }, { index: 20, type: 'treasure', hidden: true }], 0)?.type === 'treasure', '模型用例：矿脉标记应优先提示高价值格子。')

const stabilizedBlastingModel = ({ alreadySaved, ores, monsters, rewards }) =>
  !alreadySaved && ores === 0 && monsters === 0 && rewards === 0
assert(stabilizedBlastingModel({ alreadySaved: false, ores: 0, monsters: 0, rewards: 0 }), '模型用例：完全空爆应返还炸弹。')
assert(!stabilizedBlastingModel({ alreadySaved: true, ores: 0, monsters: 0, rewards: 0 }), '模型用例：稳压爆破不得和其他返还重复。')
assert(!stabilizedBlastingModel({ alreadySaved: false, ores: 1, monsters: 0, rewards: 1 }), '模型用例：有实际收益时稳压爆破不得返还。')

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

console.log('技能精研效果接线守卫通过：25 个 effectKey 已完成接线，全部接入实际玩法公式或信息型玩法提示。')
