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
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const potentialDataSource = readSource('src/data/potential.ts')
const playerStoreSource = readSource('src/stores/usePlayerStore.ts')
const processingStoreSource = readSource('src/stores/useProcessingStore.ts')
const warehouseStoreSource = readSource('src/stores/useWarehouseStore.ts')
const journeyBuildSource = readSource('src/stores/journeyBuild.ts')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const shopStoreSource = readSource('src/stores/useShopStore.ts')
const questStoreSource = readSource('src/stores/useQuestStore.ts')
const regionMapStoreSource = readSource('src/stores/useRegionMapStore.ts')
const farmActionsSource = readSource('src/composables/useFarmActions.ts')
const farmViewSource = readSource('src/views/game/FarmView.vue')
const homeViewSource = readSource('src/views/game/HomeView.vue')

const { POTENTIAL_EFFECT_VALUES, CONNECTED_POTENTIAL_EFFECT_KEYS } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)

const connectedKeys = Array.from(CONNECTED_POTENTIAL_EFFECT_KEYS)
assert(connectedKeys.length === 20, '潜能正式版必须接入全部 20 个效果。')
assert(Object.values(POTENTIAL_EFFECT_VALUES).every(effect => effect.firstVersionConnected), '潜能正式版不得保留未接入效果。')
assert(!potentialDataSource.includes("mode: 'reserved'"), '潜能正式版不得保留 reserved 效果模式。')
assert(POTENTIAL_EFFECT_VALUES.potential_max_hp_flat.cap === 60, '生命潜能上限必须保持 +60。')
assert(POTENTIAL_EFFECT_VALUES.potential_max_stamina_flat.cap === 30, '体力潜能上限必须保持 +30。')
assert(POTENTIAL_EFFECT_VALUES.potential_passout_loss_reduction.cap === 0.15, '昏倒损失降低必须封顶 15%。')
assert(POTENTIAL_EFFECT_VALUES.potential_processing_speed.cap === 0.12, '加工耗时潜能必须封顶 12%。')
assert(POTENTIAL_EFFECT_VALUES.potential_tool_stamina_save.cap === 0.09, '工具体力潜能必须封顶 9%。')
assert(POTENTIAL_EFFECT_VALUES.potential_alchemy_tolerance.cap === 0.3, '炼丹容错潜能必须封顶 30%。')
assert(POTENTIAL_EFFECT_VALUES.potential_storage_efficiency.cap === 30, '仓库箱位潜能必须封顶 +30。')
assert(POTENTIAL_EFFECT_VALUES.potential_workshop_hint.cap === 0.3, '工坊手记原料返还必须封顶 30%。')
assert(POTENTIAL_EFFECT_VALUES.potential_journey_hazard_resist.cap === 30, '行旅压险潜能必须封顶 +30。')
assert(POTENTIAL_EFFECT_VALUES.potential_festival_bonus.cap === 0.12, '节庆收益潜能必须封顶 12%。')
assert(POTENTIAL_EFFECT_VALUES.potential_low_hp_hint.valuePerRank === 0.004, '根骨危息护命每阶减伤必须保持 0.4%。')
assert(POTENTIAL_EFFECT_VALUES.potential_low_hp_hint.cap === 0.12, '根骨危息护命减伤必须封顶 12%。')
assert(POTENTIAL_EFFECT_VALUES.potential_low_hp_hint.unit === 'percent', '根骨危息护命必须以百分比显示。')

assert(playerStoreSource.includes("getPotentialEffectValue('potential_max_hp_flat')"), '角色生命上限必须读取潜能生命效果。')
assert(playerStoreSource.includes("getPotentialEffectValue('potential_max_stamina_flat')"), '角色体力上限必须读取潜能体力效果。')
assert(playerStoreSource.includes("getPotentialEffectValue('potential_passout_loss_reduction')"), '昏倒结算必须读取潜能损失降低。')
assert(playerStoreSource.includes("options.source === 'tool'"), '工具体力潜能必须通过体力来源参数收窄。')
assert(farmActionsSource.includes("source: 'tool'"), '农场工具动作必须标记体力来源为工具。')
assert(farmViewSource.includes("source: 'tool'"), '农场页面工具动作必须标记体力来源为工具。')
assert(miningStoreSource.includes("consumeStamina(staminaCost, { source: 'tool' })"), '矿镐探索必须标记体力来源为工具。')
assert(processingStoreSource.includes("getPotentialEffectValue('potential_processing_speed')"), '加工耗时必须读取潜能加工效果。')
assert(processingStoreSource.includes('Math.max(1, Math.ceil(totalDays * (1 - potentialProcessingBonus)))'), '潜能加工耗时不得低于 1 天。')
assert(processingStoreSource.includes("getPotentialEffectValue('potential_alchemy_tolerance')"), '炼丹结果权重必须读取潜能容错效果。')
assert(processingStoreSource.includes('ALCHEMY_TOLERANCE_WEIGHT_BONUS'), '炼丹容错必须通过专用权重表影响成丹/废丹/奇丹。')
assert(warehouseStoreSource.includes("getPotentialEffectValue('potential_storage_efficiency')"), '仓库箱位上限必须读取潜能仓储效果。')
assert(warehouseStoreSource.includes('POTENTIAL_MAX_CHESTS_CAP = MAX_CHESTS_CAP + 30'), '潜能仓储箱位必须在基础上限外额外开放 30 格。')
assert(homeViewSource.includes('基础 {{ warehouseStore.baseMaxChests }} + 潜能'), '仓库页必须显示潜能箱位来源。')
assert(shopStoreSource.includes('warehouseStore.baseMaxChests'), '商店仓库扩容必须按基础箱位判断，不能被潜能箱位误卡。')
assert(processingStoreSource.includes("getPotentialEffectValue('potential_workshop_hint')"), '工坊手记必须读取潜能原料返还概率。')
assert(processingStoreSource.includes('potential_workshop_refund'), '工坊手记触发时必须记录玩家可见日志标签。')
assert((processingStoreSource.match(/tryPotentialRawMaterialReturn\(slot, recipe\)/g) ?? []).length >= 3, '手动收取、自动收取和虚空原料箱续产都必须尝试潜能原料返还。')
assert(journeyBuildSource.includes("getPotentialEffectValue('potential_journey_hazard_resist')"), '行旅构筑必须读取潜能压险。')
assert(journeyBuildSource.includes('hazardResist: potentialHazardResist'), '潜能压险必须进入行旅 outcome。')
assert(miningStoreSource.includes("getPotentialEffectValue('potential_mine_entry_hint')"), '矿洞进层提示必须读取潜能信息型效果。')
assert(miningStoreSource.includes('潜能感应'), '矿洞潜能提示必须使用玩家态文案。')
assert(miningStoreSource.includes("const ROOT_GUARD_NODE_ID = 'body_low_hp_sense'"), '根骨危息护命必须绑定 body_low_hp_sense 节点。')
assert(miningStoreSource.includes("const ROOT_GUARD_EFFECT_KEY = 'potential_low_hp_hint'"), '根骨危息护命必须绑定 potential_low_hp_hint 效果。')
assert(miningStoreSource.includes('ROOT_GUARD_ITEM_SAFE_RANK = 10'), '根骨危息护命 10 阶必须守护背包掉落。')
assert(miningStoreSource.includes('ROOT_GUARD_SHOCKWAVE_RANK = 20'), '根骨危息护命 20 阶必须解锁近身震波。')
assert(miningStoreSource.includes('ROOT_GUARD_BOSS_WEAKEN_RANK = 30'), '根骨危息护命 30 阶必须解锁 Boss 护命效果。')
assert(miningStoreSource.includes('ROOT_GUARD_BOSS_STAT_MULTIPLIER = 0.8'), '根骨危息护命 Boss 压制必须保持 20% 削弱。')
assert(miningStoreSource.includes('getNodeRank(ROOT_GUARD_NODE_ID)'), '矿洞必须读取根骨危息护命节点阶数。')
assert(miningStoreSource.includes('getPotentialEffectValue(ROOT_GUARD_EFFECT_KEY)'), '矿洞受击减伤必须读取根骨危息护命效果值。')
assert(miningStoreSource.includes('applyRootGuardDamageReduction'), '矿洞受击流程必须应用根骨危息护命减伤。')
assert(miningStoreSource.includes('triggerRootGuardShockwave'), '怪物击杀必须保留根骨危息护命震波入口。')
assert(miningStoreSource.includes('applyRootGuardBossWeakening'), 'Boss 开战必须保留根骨危息护命压制入口。')
assert(miningStoreSource.includes('if (!rootGuardKeepsBackpack)'), '矿洞失败随机背包掉落必须受根骨危息护命护包门槛保护。')
assert(miningStoreSource.includes('if (!rootGuardBossRetreat)'), 'Boss 战败战利品回滚必须受满阶危息护命撤离保护。')
assert(shopStoreSource.includes("getPotentialEffectValue('potential_festival_bonus')"), '节庆出货必须读取潜能节庆收益。')
assert(shopStoreSource.includes('1 + festivalSupplyBonus + potentialFestivalSupplyBonus'), '节庆天赋与潜能应在限定窗口内合并小倍率。')
assert(questStoreSource.includes("getPotentialEffectValue('potential_quest_bias')"), '任务板必须读取潜能委托偏向提示。')
assert(questStoreSource.includes('潜能识人'), '委托偏向必须显示玩家态提示。')
assert(regionMapStoreSource.includes("getPotentialEffectValue('potential_region_marker')"), '区域图必须读取潜能区域标记。')
assert(regionMapStoreSource.includes('潜能山图'), '区域图标记必须显示玩家态提示。')
assert(!potentialDataSource.includes('attack') && !potentialDataSource.includes('crit'), '潜能首版不得加入攻击或暴击数值方向。')

if (errors.length > 0) {
  console.error(`qa-potential-effect-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-effect-guards passed')
