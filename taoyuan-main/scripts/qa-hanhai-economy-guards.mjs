/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // keep trying
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Unable to resolve module: ${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
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

const hanhaiData = await import(pathToFileURL(path.join(srcRoot, 'data', 'hanhai.ts')).href)
const breedingData = await import(pathToFileURL(path.join(srcRoot, 'data', 'breeding.ts')).href)
const cropsData = await import(pathToFileURL(path.join(srcRoot, 'data', 'crops.ts')).href)
const itemsData = await import(pathToFileURL(path.join(srcRoot, 'data', 'items.ts')).href)
const cropUseProfiles = await import(pathToFileURL(path.join(srcRoot, 'data', 'cropUseProfiles.ts')).href)

const hanhaiStoreSource = readSource('src/stores/useHanhaiStore.ts')
const hanhaiViewSource = readSource('src/views/game/HanhaiView.vue')
const packageJsonSource = readSource('package.json')

const getShopItem = itemId => hanhaiData.HANHAI_SHOP_ITEMS.find(item => item.itemId === itemId)
const getCostQuantity = (item, itemId) => item?.costItems?.find(cost => cost.itemId === itemId)?.quantity ?? 0

for (const itemId of ['hanhai_cactus_seed', 'hanhai_date_seed']) {
  const item = getShopItem(itemId)
  assert(item, `${itemId} must remain on the Hanhai shop shelf.`)
  assert(getCostQuantity(item, 'hanhai_turquoise') === 1, `${itemId} must cost exactly 1 turquoise.`)
  assert((item?.price ?? 0) > 0 && (item?.price ?? 0) <= 150, `${itemId} should keep only a small money sink.`)
}

assert(getCostQuantity(getShopItem('bomb'), 'hanhai_turquoise') === 1, 'bomb should be a weekly turquoise exchange.')
assert(getCostQuantity(getShopItem('mega_bomb'), 'hanhai_turquoise') === 3, 'mega_bomb should cost 3 turquoise.')
assert(getCostQuantity(getShopItem('mega_bomb_recipe'), 'hanhai_turquoise') >= 8, 'mega_bomb_recipe should require a high turquoise cost.')
assert((getShopItem('bomb')?.weeklyLimit ?? 0) > 0, 'bomb exchange must stay weekly-limited.')
assert((getShopItem('mega_bomb')?.weeklyLimit ?? 0) === 1, 'mega_bomb exchange should be a tight weekly-limited supplement.')
for (const itemId of ['bomb', 'mega_bomb', 'mega_bomb_recipe']) {
  assert(itemsData.getItemById(itemId), `${itemId} shop exchange must point at a registered item.`)
}

const relicSites = [...hanhaiData.HANHAI_RELIC_SITES, ...hanhaiData.WS14_HANHAI_RELIC_SITES]
assert(relicSites.length >= 5, 'Hanhai relic site pool should be present.')
for (const site of relicSites) {
  assert(!site.rewards.money, `${site.id} should spend money without returning direct money.`)
  const ticketTotal = Object.values(site.rewards.ticketRewards ?? {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
  assert(ticketTotal > 0, `${site.id} should reward caravan/research/exhibit tickets.`)
}

assert(
  /const preparedRewards = getRelicPreparedRewardBundle\(siteId, travelPrep\?\.def\.id \?\? null\)/.test(hanhaiStoreSource) &&
    /const rewardSummary = grantRewardBundle\(preparedRewards, \{ ticketSource: 'hanhai_relic' \}\)/.test(hanhaiStoreSource),
  'exploreRelicSite() must settle prepared relic rewards through grantRewardBundle() with a relic ticket source.'
)
assert(
  /const ticketRewardMeta = rewardSummary\.tickets\.map/.test(hanhaiStoreSource) &&
    /ticketRewards: ticketRewardMeta \|\| undefined/.test(hanhaiStoreSource),
  'exploreRelicSite() should record granted ticket rewards in primitive log metadata.'
)

const totalWeight = hanhaiData.HANHAI_TREASURE_MAP_REWARDS.reduce((sum, bundle) => sum + bundle.weight, 0)
const expectedMoney = hanhaiData.HANHAI_TREASURE_MAP_REWARDS.reduce(
  (sum, bundle) => sum + bundle.weight * (bundle.rewards.money ?? 0),
  0
) / Math.max(1, totalWeight)
assert(expectedMoney >= 450 && expectedMoney <= 550, `treasure map expected money should be 450-550, got ${expectedMoney}.`)

assert(hanhaiViewSource.includes('formatShopCostLine'), 'Hanhai shop UI must display combined money/material cost.')
assert(hanhaiViewSource.includes('hasEnoughShopCostItems'), 'Hanhai shop UI must pre-disable missing turquoise/material exchanges.')
assert(hanhaiViewSource.includes('shopModalItem.costItems'), 'Hanhai shop modal must show extra cost item counts.')
assert(hanhaiViewSource.includes('REWARD_TICKET_LABELS'), 'Relic reward text must include ticket reward labels.')
assert(hanhaiViewSource.includes('hanhai-map-shell'), 'Hanhai page should keep the desert map shell as the primary unlocked layout.')
assert(hanhaiViewSource.includes('type HanhaiMapNodeId ='), 'Hanhai page should model map nodes locally instead of reverting to three plain tabs.')
for (const nodeId of ['shop', 'route', 'relic', 'casino', 'rotation']) {
  assert(hanhaiViewSource.includes(`id: '${nodeId}'`), `Hanhai desert map should keep the ${nodeId} node.`)
}
assert(hanhaiViewSource.includes('hanhaiIntelCards'), 'Hanhai page should keep the compact journey intel strip.')
assert(hanhaiViewSource.includes('selectedNodeHighlights'), 'Hanhai page should show selected-node decision highlights.')

const cactusHybrid = breedingData.findPossibleHybrid('hanhai_cactus', 'supreme_origin_melon')
const dateHybrid = breedingData.findPossibleHybrid('hanhai_date', 'vast_meng_melon')
assert(cactusHybrid?.id === 'sandglass_cactus', 'hanhai_cactus + supreme_origin_melon should discover sandglass_cactus.')
assert(dateHybrid?.id === 'oasis_star_date', 'hanhai_date + vast_meng_melon should discover oasis_star_date.')
assert(breedingData.getHybridTier('sandglass_cactus') === 10, 'sandglass_cactus should be a T10 side branch.')
assert(breedingData.getHybridTier('oasis_star_date') === 10, 'oasis_star_date should be a T10 side branch.')

for (const cropId of ['sandglass_cactus', 'oasis_star_date']) {
  const crop = cropsData.getCropById(cropId)
  assert(crop, `${cropId} crop definition must exist.`)
  assert(itemsData.getItemById(cropId), `${cropId} harvest item must be registered.`)
  assert(crop?.seedId && itemsData.getItemById(crop.seedId), `${cropId} seed item must be generated.`)
  assert(cropUseProfiles.getCropUseProfile(cropId), `${cropId} must have a crop use profile.`)
}

assert(
  packageJsonSource.includes('"qa:hanhai-economy-guards": "node scripts/qa-hanhai-economy-guards.mjs"'),
  'package.json should register qa:hanhai-economy-guards.'
)

if (errors.length > 0) {
  console.error('qa-hanhai-economy-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-hanhai-economy-guards: ok (treasure map expected money ${expectedMoney.toFixed(1)}文)`)
