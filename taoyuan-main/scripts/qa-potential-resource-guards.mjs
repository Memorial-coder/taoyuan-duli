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
const potentialStoreSource = readSource('src/stores/usePotentialStore.ts')
const gameplaySources = {
  mining: readSource('src/stores/useMiningStore.ts'),
  regionMap: readSource('src/stores/useRegionMapStore.ts'),
  quest: readSource('src/stores/useQuestStore.ts'),
  goal: readSource('src/stores/useGoalStore.ts'),
  museum: readSource('src/stores/useMuseumStore.ts'),
  hiddenNpc: readSource('src/stores/useHiddenNpcStore.ts'),
  shop: readSource('src/stores/useShopStore.ts')
}

const { POTENTIAL_RESOURCE_DEFS, POTENTIAL_SOURCE_RULES } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)

const expectedSourceIds = new Set([
  'mine_boss_clear',
  'journey_high_risk',
  'special_order_finish',
  'theme_week_settlement',
  'museum_hidden_sample',
  'festival_spirit_event'
])
const resourceIds = new Set(POTENTIAL_RESOURCE_DEFS.map(resource => resource.id))
const sourceIds = new Set(POTENTIAL_SOURCE_RULES.map(rule => rule.id))

assert(POTENTIAL_SOURCE_RULES.length === expectedSourceIds.size, '潜能首版应登记 6 条来源规则。')
for (const sourceId of expectedSourceIds) {
  assert(sourceIds.has(sourceId), `缺少潜能来源规则：${sourceId}`)
}

for (const rule of POTENTIAL_SOURCE_RULES) {
  assert(typeof rule.label === 'string' && rule.label.length > 0, `${rule.id} 必须有玩家可读名称。`)
  assert(typeof rule.summary === 'string' && rule.summary.length > 0, `${rule.id} 必须有玩家可读来源说明。`)
  assert(Array.isArray(rule.rewards) && rule.rewards.length > 0, `${rule.id} 必须配置奖励。`)
  assert(['daily', 'weekly', 'seasonal'].includes(rule.cap.period), `${rule.id} 必须配置日/周/季上限周期。`)
  assert(Number.isInteger(rule.cap.maxClaims) && rule.cap.maxClaims > 0, `${rule.id} 必须配置正整数领取次数上限。`)
  assert(Number.isInteger(rule.cap.maxResourceAmount) && rule.cap.maxResourceAmount > 0, `${rule.id} 必须配置正整数材料数量上限。`)
  for (const reward of rule.rewards) {
    assert(resourceIds.has(reward.resourceId), `${rule.id} 使用了未登记的潜能资源：${reward.resourceId}`)
    assert(Number.isInteger(reward.amount) && reward.amount > 0, `${rule.id} 奖励数量必须是正整数。`)
  }
}

assert(potentialDataSource.includes('cap: { period:'), '潜能来源必须在数据表集中配置上限。')
assert(potentialStoreSource.includes('claimPotentialSourceReward'), '潜能 store 必须提供统一来源发放 helper。')
assert(potentialStoreSource.includes('sourceReceipts'), '潜能来源发放必须记录结算凭据。')
assert(potentialStoreSource.includes('sourceCapProgress'), '潜能来源发放必须记录周期上限进度。')
assert(potentialStoreSource.includes('sourceReceipts.value[receiptId]'), '潜能来源发放必须阻止同一凭据重复领取。')
assert(potentialStoreSource.includes('currentProgress.claims >= rule.cap.maxClaims'), '潜能来源发放必须检查周期领取次数上限。')
assert(potentialStoreSource.includes('rule.cap.maxResourceAmount - used'), '潜能来源发放必须检查周期资源数量上限。')

assert(gameplaySources.mining.includes("claimPotentialSourceReward('mine_boss_clear'"), '矿洞首领结算必须接入潜能来源。')
assert(gameplaySources.regionMap.includes("claimPotentialSourceReward('journey_high_risk'"), '高风险行旅或区域首领必须接入潜能来源。')
assert(gameplaySources.quest.includes("claimPotentialSourceReward('special_order_finish'"), '特殊订单完成必须接入潜能来源。')
assert(gameplaySources.goal.includes("claimPotentialSourceReward('theme_week_settlement'"), '主题周结算必须接入潜能来源。')
assert(gameplaySources.museum.includes("claimPotentialSourceReward('museum_hidden_sample'"), '博物馆里程碑必须接入潜能来源。')
assert(gameplaySources.hiddenNpc.includes("claimPotentialSourceReward('festival_spirit_event'"), '仙灵记忆必须接入节庆灵息来源。')
assert(gameplaySources.shop.includes("claimPotentialSourceReward('festival_spirit_event'"), '节庆出货必须接入节庆灵息来源。')

const gameplayDirectGrants = Object.entries(gameplaySources).filter(([, source]) => source.includes('addPotentialResource('))
assert(gameplayDirectGrants.length === 0, `玩法侧不得绕过统一来源 helper 直接发潜能材料：${gameplayDirectGrants.map(([name]) => name).join(', ')}`)

if (errors.length > 0) {
  console.error(`qa-potential-resource-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-resource-guards passed')
