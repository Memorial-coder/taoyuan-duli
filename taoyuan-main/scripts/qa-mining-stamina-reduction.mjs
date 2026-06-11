import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.ts$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022
        },
        fileName: filePath
      })
      return {
        format: 'module',
        source: transpiled.outputText,
        shortCircuit: true
      }
    }

    return nextLoad(url, context)
  }
})

const { resolveFractionalStaminaCost } = await import(pathToFileURL(path.join(projectRoot, 'src/utils/fractionalStamina.ts')).href)

const resolveSeries = (rawCost, times) => {
  let discountCredit = 0
  const costs = []
  for (let i = 0; i < times; i++) {
    const result = resolveFractionalStaminaCost(rawCost, discountCredit)
    costs.push(result.cost)
    discountCredit = result.discountCredit
  }
  return { costs, total: costs.reduce((sum, cost) => sum + cost, 0), discountCredit }
}

const noReduction = resolveSeries(2, 50)
assert(noReduction.total === 100, '无减免的 2 点基础成本，50 次应消耗 100 体力')
assert(noReduction.costs.every(cost => cost === 2), '无减免时不应出现折扣扣体力')

const onePercentFromTwo = resolveSeries(1.98, 50)
assert(onePercentFromTwo.total === 99, '2 点基础成本 -1% 时，50 次应累计节省 1 体力')
assert(onePercentFromTwo.costs.includes(1), '2 点基础成本 -1% 应出现一次 1 点扣体力')
assert(onePercentFromTwo.costs[0] === 2, '小数减免不应让第一次挖矿立刻跳到低档成本')

const lowCostOnePercent = resolveSeries(0.99, 100)
assert(lowCostOnePercent.total === 99, '1 点附近成本 -1% 时，100 次应累计节省 1 体力')
assert(lowCostOnePercent.costs.includes(0), '1 点附近成本 -1% 应通过累计减免出现免体力行动')

const lowCostTwoPercent = resolveSeries(0.98, 50)
assert(lowCostTwoPercent.total === 49, '1 点附近成本 -2% 时，50 次应累计节省 1 体力')
assert(lowCostTwoPercent.costs.includes(0), '1 点附近成本 -2% 应通过累计减免出现免体力行动')

const toolAdjusted = resolveSeries(1.2, 5)
assert(toolAdjusted.total === 6, '工具和技能把成本压到 1.2 时，5 次平均成本应保持 1.2')
assert(toolAdjusted.costs[0] === 2 && toolAdjusted.costs.slice(1).every(cost => cost === 1), '1.2 成本应先扣 2，再用折扣信用补回')

const zeroCost = resolveFractionalStaminaCost(0, 0.8)
assert(zeroCost.cost === 0 && zeroCost.discountCredit === 0, '0 成本应清空折扣信用并返回 0')

const miningStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useMiningStore.ts'), 'utf8')
const recipesSource = fs.readFileSync(path.join(projectRoot, 'src/data/recipes.ts'), 'utf8')
assert(miningStoreSource.includes('resolveFractionalStaminaCost(rawStaminaCost'), '挖矿扣体力必须使用小数减免累计器')
assert(miningStoreSource.includes('formatMiningStaminaCostTag'), '挖矿日志必须避免显示 -0体力')
assert(!/挖矿体力消耗-[12]%/.test(recipesSource), '挖矿体力料理不应再出现 1%/2% 这类无体感减免')

const miningFoodBuffValues = [...recipesSource.matchAll(/buff:\s*\{\s*type:\s*'mining',\s*value:\s*(\d+)/g)].map(match => Number(match[1]))
assert(miningFoodBuffValues.length > 0, '必须能扫描到挖矿料理 buff')
for (const value of miningFoodBuffValues) {
  assert(value >= 5, `挖矿料理体力减免下限应为 5%，当前发现 ${value}%`)
}

if (errors.length > 0) {
  console.error('[qa-mining-stamina-reduction] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-mining-stamina-reduction] OK')
