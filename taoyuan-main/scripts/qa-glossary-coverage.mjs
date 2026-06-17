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

const resolveSourceFile = candidate => {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.mjs`]
  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return pathToFileURL(filePath).href
    }
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const indexName of ['index.ts', 'index.tsx', 'index.js', 'index.mjs']) {
      const indexPath = path.join(candidate, indexName)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return pathToFileURL(indexPath).href
      }
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = resolveSourceFile(path.join(srcRoot, specifier.slice(2)))
      if (resolved) return { url: resolved, shortCircuit: true }
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = resolveSourceFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: resolved, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
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
const normalize = value => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

const [
  glossaryModule,
  rewardTicketsModule,
  prizeTicketsModule,
  mysteryBoxesModule,
  potentialModule,
  walletModule,
  weeklyBudgetsModule,
  villageProjectsModule
] = await Promise.all([
  import(pathToFileURL(path.join(srcRoot, 'data/glossary.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/rewardTickets.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/prizeTickets.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/mysteryBoxes.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/wallet.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/weeklyBudgets.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'data/villageProjects.ts')).href)
])

const { GLOSSARY, GLOSSARY_CATEGORY_LABELS } = glossaryModule
const { REWARD_TICKET_DEFS, REWARD_TICKET_EXCHANGE_OFFERS } = rewardTicketsModule
const { PRIZE_TICKET_NAMING_LAYERS, REWARD_TICKET_PRIZE_STAGES } = prizeTicketsModule
const { MYSTERY_BOX_DEFS } = mysteryBoxesModule
const { POTENTIAL_BRANCH_DEFS, POTENTIAL_NODE_DEFS, POTENTIAL_RESOURCE_DEFS, POTENTIAL_SOURCE_RULES } = potentialModule
const { WALLET_ARCHETYPES, WALLET_ITEMS } = walletModule
const { WEEKLY_BUDGET_CHANNELS } = weeklyBudgetsModule
const { VILLAGE_PROJECT_DEFS } = villageProjectsModule

const glossaryTabSource = readSource('src/components/game/GlossaryTab.vue')
const packageJson = JSON.parse(readSource('package.json'))
const entryById = new Map(GLOSSARY.map(entry => [entry.id, entry]))

const isSearchable = value => {
  const query = normalize(value)
  return GLOSSARY.some(entry => normalize(entry.name).includes(query) || entry.searchText.includes(query))
}

const assertEntry = (id, label) => {
  assert(entryById.has(id), `百科缺少 ${label} 词条：${id}`)
}

const assertSearchable = (value, label) => {
  assert(isSearchable(value), `百科搜索不到 ${label}：“${value}”`)
}

assert(GLOSSARY_CATEGORY_LABELS.currency === '票券', '百科分类必须包含票券。')
assert(GLOSSARY_CATEGORY_LABELS.system === '机制', '百科分类必须包含机制。')
assert(glossaryTabSource.includes("currency: 'text-warning'"), 'GlossaryTab 必须给票券分类配置颜色。')
assert(glossaryTabSource.includes("system: 'text-accent'"), 'GlossaryTab 必须给机制分类配置颜色。')
assert(
  glossaryTabSource.includes('getCommonTicketTypoQuery') &&
    glossaryTabSource.includes('isGlossaryQueryMatch') &&
    glossaryTabSource.includes("endsWith('券')") &&
    glossaryTabSource.includes("endsWith('卷')"),
  'GlossaryTab 必须把“券/卷”常见误写纳入过滤和排序。'
)
assert(packageJson.scripts?.['qa:glossary-coverage'] === 'node scripts/qa-glossary-coverage.mjs', 'package.json 必须注册 qa:glossary-coverage。')

assertEntry('system_reward_ticket_prize_pool', '奖券命名与奖池阶段')
assertEntry('system_mayor_ticket_conversion', '村务票据转换')
for (const layer of PRIZE_TICKET_NAMING_LAYERS) {
  assertSearchable(layer.label, `奖券命名层 ${layer.id}`)
}
for (const stage of REWARD_TICKET_PRIZE_STAGES) {
  assertEntry(`reward_ticket_stage_${stage.id}`, stage.label)
  assertSearchable(stage.label, `奖池阶段 ${stage.id}`)
}
for (const ticket of REWARD_TICKET_DEFS) {
  assertEntry(`reward_ticket_${ticket.id}`, ticket.label)
  assertSearchable(ticket.label, `票券 ${ticket.id}`)
  if (ticket.label.endsWith('券')) {
    assertSearchable(ticket.label.replace(/券$/, '卷'), `${ticket.label} 常见误输入`)
  }
}
assertSearchable('研究卷', '研究券常见误输入')
assertSearchable('建设卷', '建设券常见误输入')
assertSearchable('展陈卷', '展陈券常见误输入')
assertSearchable('票卷', '票券通用误输入')
assertSearchable('资源卷', '资源券通用误输入')
for (const offer of REWARD_TICKET_EXCHANGE_OFFERS) {
  assertEntry(`reward_ticket_offer_${offer.id}`, offer.label)
  assertSearchable(offer.label, `票券兑换 ${offer.id}`)
}

assertEntry('system_weekly_budget', '周预算')
assertSearchable('周预算', '周预算系统')
assertSearchable('商路预算', '商路预算')
assertSearchable('学舍预算', '学舍预算')
for (const channel of WEEKLY_BUDGET_CHANNELS) {
  assertEntry(`weekly_budget_channel_${channel.channelId}`, channel.label)
  assertSearchable(channel.label, `周预算渠道 ${channel.channelId}`)
  assertSearchable(channel.shortLabel, `周预算简称 ${channel.channelId}`)
  for (const tier of channel.tiers) {
    assertEntry(`weekly_budget_tier_${tier.id}`, `${channel.label} ${tier.label}`)
    assertSearchable(tier.label, `周预算档位 ${tier.id}`)
  }
}

assertEntry('system_mystery_box_reward_pool', '密匣与神秘箱奖池')
for (const box of MYSTERY_BOX_DEFS) {
  assertEntry(`mystery_box_${box.id}`, box.label)
  assertSearchable(box.label, `神秘箱 ${box.id}`)
  assertSearchable(box.aliasLabel, `神秘箱别名 ${box.id}`)
  for (const reward of box.rewardEntries) {
    assertSearchable(reward.label, `神秘箱奖励 ${reward.id}`)
  }
}

for (const branch of POTENTIAL_BRANCH_DEFS) {
  assertEntry(`potential_branch_${branch.id}`, branch.label)
  assertSearchable(branch.label, `潜能分支 ${branch.id}`)
}
for (const resource of POTENTIAL_RESOURCE_DEFS) {
  assertEntry(`potential_resource_${resource.id}`, resource.label)
  assertSearchable(resource.label, `潜能材料 ${resource.id}`)
}
for (const node of POTENTIAL_NODE_DEFS) {
  assertEntry(`potential_node_${node.id}`, node.label)
  assertSearchable(node.label, `潜能节点 ${node.id}`)
}
for (const source of POTENTIAL_SOURCE_RULES) {
  assertEntry(`potential_source_${source.id}`, source.label)
  assertSearchable(source.label, `潜能来源 ${source.id}`)
}

assertEntry('system_village_projects', '村庄建设')
assertSearchable('村庄建设', '村庄建设系统')
assertSearchable('建设项目', '村庄建设通用关键词')
assertSearchable('工台角', '村庄建设首个项目')
for (const project of VILLAGE_PROJECT_DEFS) {
  assertEntry(`village_project_${project.id}`, project.name)
  assertSearchable(project.name, `村庄建设项目 ${project.id}`)
  if (project.requiredClueText) {
    assertSearchable(project.requiredClueText, `村庄建设线索 ${project.id}`)
  }
}

for (const walletItem of WALLET_ITEMS) {
  assertEntry(`wallet_item_${walletItem.id}`, walletItem.name)
  assertSearchable(walletItem.name, `钱包物 ${walletItem.id}`)
}
for (const archetype of WALLET_ARCHETYPES) {
  assertEntry(`wallet_archetype_${archetype.id}`, archetype.name)
  assertSearchable(archetype.name, `钱包流派 ${archetype.id}`)
  for (const node of archetype.nodes) {
    assertEntry(`wallet_node_${node.id}`, node.name)
    assertSearchable(node.name, `钱包节点 ${node.id}`)
  }
}

if (errors.length > 0) {
  console.error(`[qa-glossary-coverage] failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-glossary-coverage] passed')
