/* global console */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

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
      // keep trying variants
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`)
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

const packageJson = JSON.parse(read('package.json'))
const hanhaiStore = read('src/stores/useHanhaiStore.ts')
const shopStore = read('src/stores/useShopStore.ts')

assert(
  packageJson.scripts?.['qa:market-commerce-relief'] === 'node scripts/qa-market-commerce-relief.mjs',
  'package.json must register qa:market-commerce-relief.'
)

assert(hanhaiStore.includes('const HANHAI_MARKET_PRESSURE_RELIEF_PER_ROUTE = 0.25'), 'Hanhai relief must stay at 25% per matching active route.')
assert(hanhaiStore.includes('const HANHAI_MARKET_PRESSURE_RELIEF_MAX = 0.5'), 'Hanhai relief must cap at 50%.')
assert(hanhaiStore.includes('const getMarketPressureRelief = (category: string)'), 'useHanhaiStore must expose getMarketPressureRelief(category).')
assert(hanhaiStore.includes('Object.keys(cycleState.value.routeInvestments)'), 'Market pressure relief must use invested active routes only.')
assert(hanhaiStore.includes('getMarketPressureRelief,'), 'useHanhaiStore must return getMarketPressureRelief.')

for (const snippet of [
  "westbound_silk_route: ['processed', 'crop', 'fruit']",
  "turquoise_exchange_route: ['ore', 'gem', 'processed']",
  "moon_sand_ceremony_route: ['processed', 'gem', 'fruit']",
  "oasis_exchange_route: ['processed', 'fish', 'gem']",
  "starfall_patron_route: ['processed', 'gem', 'fish']"
]) {
  assert(hanhaiStore.includes(snippet), `Missing route category mapping: ${snippet}`)
}

assert(shopStore.includes("import { useHanhaiStore } from './useHanhaiStore'"), 'useShopStore must read Hanhai route relief lazily.')
assert(
  shopStore.includes('getDailyMarketInfo(gameStore.year, gameStore.seasonIndex, gameStore.day, getMarketPressureAdjustedShipping(getRecentShipping()))'),
  'Current market board must use pressure-adjusted shipping.'
)
assert(
  /const rawRecentShipping = getRecentShipping\(\)[\s\S]*const recentShipping = getMarketPressureAdjustedShipping\(rawRecentShipping\)[\s\S]*getDailyMarketInfo\(gameStore\.year, gameStore\.seasonIndex, gameStore\.day, recentShipping\)/.test(shopStore),
  'Market dynamics tick must use pressure-adjusted shipping for price info.'
)
assert(shopStore.includes('const getMarketPressureAdjustedVolume = (category: MarketCategory, rawVolume: number)'), 'useShopStore must centralize adjusted-volume calculation.')
assert(shopStore.includes('formatMarketPressureDescription(pressureAdjustment, marketMultiplier)'), 'Sell price breakdown must include commerce relief text.')
assert(
  /const pressureAdjustment = getMarketPressureAdjustedVolume\(itemDef\.category, recentVolume\)[\s\S]*getMarketMultiplier\(itemDef\.category, gameStore\.year, gameStore\.seasonIndex, gameStore\.day, pressureAdjustment\.effectiveVolume\)/.test(shopStore),
  'Direct sell price calculation must use adjusted recent volume.'
)
assert(
  /const effectiveRecentVolume = isMarketCategory\(category\)[\s\S]*getMarketPressureAdjustedVolume\(category, projectedRecentVolume\)\.effectiveVolume[\s\S]*getMarketMultiplier\([\s\S]*effectiveRecentVolume/.test(shopStore),
  'Shipping-box settlement must use adjusted projected recent volume.'
)

const routeToCategories = {
  westbound_silk_route: ['processed', 'crop', 'fruit'],
  turquoise_exchange_route: ['ore', 'gem', 'processed'],
  moon_sand_ceremony_route: ['processed', 'gem', 'fruit'],
  oasis_exchange_route: ['processed', 'fish', 'gem'],
  starfall_patron_route: ['processed', 'gem', 'fish']
}

const getModelRelief = (category, activeRouteIds, unlocked = true) => {
  const matchingRoutes = unlocked
    ? activeRouteIds.filter(routeId => (routeToCategories[routeId] ?? []).includes(category))
    : []
  const reliefRate = Math.min(0.5, matchingRoutes.length * 0.25)
  return {
    activeRouteCount: matchingRoutes.length,
    reliefRate,
    volumeMultiplier: Number((1 - reliefRate).toFixed(2))
  }
}

const adjustVolume = (category, rawVolume, activeRouteIds, unlocked = true) => {
  const relief = getModelRelief(category, activeRouteIds, unlocked)
  return Math.min(rawVolume, Math.max(0, Math.round(rawVolume * relief.volumeMultiplier)))
}

assert(adjustVolume('processed', 30, []) === 30, 'No route must preserve original effective volume.')
assert(adjustVolume('processed', 30, ['westbound_silk_route']) === 23, 'Westbound route should reduce processed pressure by 25%.')
assert(adjustVolume('crop', 40, ['westbound_silk_route']) === 30, 'Westbound route should reduce crop pressure by 25%.')
assert(adjustVolume('fruit', 40, ['westbound_silk_route']) === 30, 'Westbound route should reduce fruit pressure by 25%.')
assert(adjustVolume('ore', 40, ['westbound_silk_route']) === 40, 'Westbound route must not reduce ore pressure.')
assert(adjustVolume('gem', 40, ['westbound_silk_route']) === 40, 'Westbound route must not reduce gem pressure.')
assert(
  adjustVolume('processed', 80, ['westbound_silk_route', 'turquoise_exchange_route', 'moon_sand_ceremony_route']) === 40,
  'Multiple routes must cap relief at a 50% effective-volume floor.'
)
assert(adjustVolume('processed', 80, ['westbound_silk_route'], false) === 80, 'Locked Hanhai must not grant route relief.')

const { getMarketMultiplier } = await import(pathToFileURL(path.join(srcRoot, 'data/market.ts')).href)
const rawProcessedMultiplier = getMarketMultiplier('processed', 1, 0, 7, 30)
const unchangedProcessedMultiplier = getMarketMultiplier('processed', 1, 0, 7, adjustVolume('processed', 30, []))
const relievedProcessedMultiplier = getMarketMultiplier('processed', 1, 0, 7, adjustVolume('processed', 30, ['westbound_silk_route']))

assert(rawProcessedMultiplier === unchangedProcessedMultiplier, 'No-route multiplier must equal the old raw-volume multiplier.')
assert(relievedProcessedMultiplier >= rawProcessedMultiplier, 'Route relief must not make matching-category market pressure worse.')

console.log('qa-market-commerce-relief: ok')
