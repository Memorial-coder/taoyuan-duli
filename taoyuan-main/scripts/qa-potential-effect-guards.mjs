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
const journeyBuildSource = readSource('src/stores/journeyBuild.ts')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const shopStoreSource = readSource('src/stores/useShopStore.ts')
const questStoreSource = readSource('src/stores/useQuestStore.ts')
const regionMapStoreSource = readSource('src/stores/useRegionMapStore.ts')
const farmActionsSource = readSource('src/composables/useFarmActions.ts')
const farmViewSource = readSource('src/views/game/FarmView.vue')

const { POTENTIAL_EFFECT_VALUES, CONNECTED_POTENTIAL_EFFECT_KEYS } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)

const connectedKeys = Array.from(CONNECTED_POTENTIAL_EFFECT_KEYS)
assert(connectedKeys.length === 10, '潜能首版必须接入 10 个低风险效果。')
assert(POTENTIAL_EFFECT_VALUES.potential_max_hp_flat.cap === 30, '生命潜能上限必须保持 +30。')
assert(POTENTIAL_EFFECT_VALUES.potential_max_stamina_flat.cap === 9, '体力潜能上限必须保持 +9。')
assert(POTENTIAL_EFFECT_VALUES.potential_passout_loss_reduction.cap === 0.15, '昏倒损失降低必须封顶 15%。')
assert(POTENTIAL_EFFECT_VALUES.potential_processing_speed.cap === 0.1, '加工耗时潜能必须封顶 10%。')
assert(POTENTIAL_EFFECT_VALUES.potential_tool_stamina_save.cap === 0.06, '工具体力潜能必须封顶 6%。')
assert(POTENTIAL_EFFECT_VALUES.potential_journey_hazard_resist.cap === 9, '行旅压险潜能必须封顶 +9。')
assert(POTENTIAL_EFFECT_VALUES.potential_festival_bonus.cap === 0.09, '节庆收益潜能必须封顶 9%。')

assert(playerStoreSource.includes("getPotentialEffectValue('potential_max_hp_flat')"), '角色生命上限必须读取潜能生命效果。')
assert(playerStoreSource.includes("getPotentialEffectValue('potential_max_stamina_flat')"), '角色体力上限必须读取潜能体力效果。')
assert(playerStoreSource.includes("getPotentialEffectValue('potential_passout_loss_reduction')"), '昏倒结算必须读取潜能损失降低。')
assert(playerStoreSource.includes("options.source === 'tool'"), '工具体力潜能必须通过体力来源参数收窄。')
assert(farmActionsSource.includes("source: 'tool'"), '农场工具动作必须标记体力来源为工具。')
assert(farmViewSource.includes("source: 'tool'"), '农场页面工具动作必须标记体力来源为工具。')
assert(miningStoreSource.includes("consumeStamina(staminaCost, { source: 'tool' })"), '矿镐探索必须标记体力来源为工具。')
assert(processingStoreSource.includes("getPotentialEffectValue('potential_processing_speed')"), '加工耗时必须读取潜能加工效果。')
assert(processingStoreSource.includes('Math.max(1, Math.ceil(totalDays * (1 - potentialProcessingBonus)))'), '潜能加工耗时不得低于 1 天。')
assert(journeyBuildSource.includes("getPotentialEffectValue('potential_journey_hazard_resist')"), '行旅构筑必须读取潜能压险。')
assert(journeyBuildSource.includes('hazardResist: potentialHazardResist'), '潜能压险必须进入行旅 outcome。')
assert(miningStoreSource.includes("getPotentialEffectValue('potential_mine_entry_hint')"), '矿洞进层提示必须读取潜能信息型效果。')
assert(miningStoreSource.includes('潜能感应'), '矿洞潜能提示必须使用玩家态文案。')
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
