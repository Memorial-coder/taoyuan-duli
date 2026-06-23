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

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

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
      // try the next candidate
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`Cannot resolve module: ${specifier}`)
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

const data = await import(pathToFileURL(path.join(srcRoot, 'data', 'index.ts')).href)

const {
  LINKAGE_DEMAND_POOL,
  ONLINE_WEAK_ITEM_ORDER_ITEM_IDS,
  getOnlineWeakItemOrderForCalendar,
  getOnlineWeakItemOrderPool,
  getOnlineWeakItemOrderWeekIndex,
  getItemLinkageDef,
  getItemLinkageUseLabels,
  getItemLinkageUseTags
} = data

const packageJson = JSON.parse(read('package.json'))
assert(
  packageJson.scripts?.['qa:online-order-consumption'] === 'node scripts/qa-online-order-consumption.mjs',
  'package.json must register qa:online-order-consumption'
)

assert(ONLINE_WEAK_ITEM_ORDER_ITEM_IDS.includes('manor_edge_bundle'), 'online weak order rotation must include manor_edge_bundle')

const manorDemand = LINKAGE_DEMAND_POOL.find(entry => entry.id === 'manor_edge_bundle_online_order')
assert(!!manorDemand, 'demand pool must include manor_edge_bundle_online_order')
assert(manorDemand?.itemId === 'manor_edge_bundle', 'manor_edge_bundle online order demand must consume manor_edge_bundle')
assert(manorDemand?.systems.includes('onlineOrder'), 'manor_edge_bundle online demand must target onlineOrder')
assert(manorDemand?.tags.includes('weak_item_sink'), 'manor_edge_bundle online demand must carry weak_item_sink')
assert(manorDemand?.tags.includes('public_storage'), 'manor_edge_bundle online demand must carry public_storage')
assert(manorDemand?.repeatWindow === 'weekly', 'manor_edge_bundle online demand must be weekly limited')
assert((manorDemand?.minQuantity ?? 0) >= 3, 'manor_edge_bundle online demand must consume a meaningful quantity')
assert(Object.values(manorDemand?.ticketReward ?? {}).some(amount => amount > 0), 'manor_edge_bundle online demand must grant only small ticket rewards')

const orderPool = getOnlineWeakItemOrderPool()
const manorOrder = orderPool.find(order => order.itemId === 'manor_edge_bundle')
assert(!!manorOrder, 'online weak order pool must generate manor_edge_bundle order')
assert(manorOrder?.id === 'online_weak_item_order_manor_edge_bundle', 'manor_edge_bundle order must use stable weak-order id')
assert(manorOrder?.demandId === 'manor_edge_bundle_online_order', 'manor_edge_bundle order must reference demand id')
assert((manorOrder?.quantity ?? 0) >= 3, 'manor_edge_bundle order must consume 3+ items')
assert((manorOrder?.title.length ?? 0) > 0, 'manor_edge_bundle order must have player-facing title')
assert((manorOrder?.summary.length ?? 0) > 0, 'manor_edge_bundle order must have player-facing summary')
assert((manorOrder?.publicFeedback.length ?? 0) > 0, 'manor_edge_bundle order must log public feedback')
assert((manorOrder?.antiRepeatTags ?? []).includes('manor_edge_bundle'), 'manor_edge_bundle order must anti-repeat by item')
assert((manorOrder?.antiRepeatTags ?? []).includes('public_storage'), 'manor_edge_bundle order must anti-repeat by public storage')
assert(Object.values(manorOrder?.ticketReward ?? {}).some(amount => amount > 0), 'manor_edge_bundle order must grant tickets')

const firstWeekOrder = getOnlineWeakItemOrderForCalendar(1, 'spring', 1)
assert(firstWeekOrder?.itemId === 'manor_edge_bundle', 'spring year 1 week 1 should expose manor_edge_bundle order')
assert(getOnlineWeakItemOrderWeekIndex(1) === 1, 'day 1 should be week 1')
assert(getOnlineWeakItemOrderWeekIndex(8) === 2, 'day 8 should be week 2')

const linkage = getItemLinkageDef('manor_edge_bundle')
assert(linkage?.currentUseSystems.includes('onlineOrder'), 'manor_edge_bundle linkage must include onlineOrder current use')
assert(linkage?.repeatableSinks.includes('onlineOrder'), 'manor_edge_bundle linkage must include onlineOrder repeatable sink')
assert(linkage?.demandTags.includes('weekly_order'), 'manor_edge_bundle linkage must carry weekly_order tag')
assert(getItemLinkageUseLabels('manor_edge_bundle').includes('线上订单'), 'manor_edge_bundle labels must show online order use')
assert(
  getItemLinkageUseTags('manor_edge_bundle').some(tag => tag.label === '线上订单' && tag.panelKey === 'online'),
  'manor_edge_bundle online usage tag must jump to the online route'
)

const onlineOrdersSource = read('src/views/game/online/OnlineOrdersView.vue')
assert(onlineOrdersSource.includes("from '@/data/onlineOrders'"), 'OnlineOrdersView must read the shared online order data source')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-board"'), 'online orders page must render the weak item board')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-current"'), 'weak item board must show the current order item')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-submit"'), 'weak item board must expose the submit action')
assert(onlineOrdersSource.includes('weakItemOrderLockId'), 'weak item orders must have a weekly lock id')
assert(onlineOrdersSource.includes('online_weak_item_order:${gameStore.year}:${gameStore.season}:w${weakItemOrderWeekIndex.value}:${currentWeakItemOrder.value.itemId}'), 'weekly lock id must include year, season, week, and item')
assert(onlineOrdersSource.includes('weakItemOrderCompleted'), 'weak item orders must check completion state')
assert(onlineOrdersSource.includes('!weakItemOrderCompleted.value'), 'submit availability must block repeated weekly completion')
assert(onlineOrdersSource.includes('currentWeakItemOrderMissingQuantity.value <= 0'), 'submit availability must require enough inventory')
assert(
  onlineOrdersSource.includes('inventoryStore.getUnlockedItemCount(currentWeakItemOrder.value.itemId)'),
  'weak item stock must count the current unlocked item'
)
assert(
  onlineOrdersSource.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'),
  'weak item submission must remove the exact order item and quantity'
)
assert(onlineOrdersSource.includes('walletStore.addRewardTickets('), 'weak item submission must grant ticket rewards')
assert(onlineOrdersSource.includes("source: 'online_weak_item_order'"), 'weak item ticket reward must use a stable source')
assert(onlineOrdersSource.includes('playerStore.markLifestyleUnlock(weakItemOrderLockId.value'), 'weak item submission must mark the weekly lock')
assert(onlineOrdersSource.includes('order.publicFeedback'), 'weak item success log must include public feedback')
assert(!onlineOrdersSource.includes('MANOR_EDGE_ORDER_ITEM_ID'), 'online orders page must not use the old single-item manor constant')
assert(!onlineOrdersSource.includes('online_manor_edge_bundle_order'), 'online orders page must not use the old single-order reward source')

const submitStart = onlineOrdersSource.indexOf('const submitWeakItemOrder')
const submitEnd = onlineOrdersSource.indexOf('const getRouteQueryText', submitStart)
const submitBlock = submitStart >= 0 && submitEnd > submitStart ? onlineOrdersSource.slice(submitStart, submitEnd) : ''
assert(submitBlock.includes('if (weakItemOrderCompleted.value)'), 'submit block must reject repeated completion')
assert(submitBlock.includes('if (currentWeakItemOrderStock.value < order.quantity)'), 'submit block must reject missing inventory')
assert(submitBlock.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'), 'submit block must consume inventory')
assert(submitBlock.includes('walletStore.addRewardTickets('), 'submit block must grant ticket reward')
assert(submitBlock.includes('playerStore.markLifestyleUnlock(weakItemOrderLockId.value'), 'submit block must mark completion')
assert(
  submitBlock.indexOf('if (weakItemOrderCompleted.value)') >= 0 &&
    submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)') >= 0 &&
    submitBlock.indexOf('if (weakItemOrderCompleted.value)') < submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'),
  'repeat-completion guard must run before item removal'
)
assert(
  submitBlock.indexOf('if (currentWeakItemOrderStock.value < order.quantity)') >= 0 &&
    submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)') >= 0 &&
    submitBlock.indexOf('if (currentWeakItemOrderStock.value < order.quantity)') < submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'),
  'inventory guard must run before item removal'
)
assert(
  submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)') >= 0 &&
    submitBlock.indexOf('playerStore.markLifestyleUnlock(weakItemOrderLockId.value') >= 0 &&
    submitBlock.indexOf('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)') < submitBlock.indexOf('playerStore.markLifestyleUnlock(weakItemOrderLockId.value'),
  'weekly completion lock must be marked only after item removal'
)

if (errors.length > 0) {
  console.error('qa-online-order-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-online-order-consumption passed (${orderPool.length} weak orders, manor_edge_bundle weekly sink).`)
