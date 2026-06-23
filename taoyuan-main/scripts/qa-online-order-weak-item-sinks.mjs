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
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
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
  ITEMS,
  LINKAGE_DEMAND_POOL,
  ONLINE_WEAK_ITEM_ORDER_ITEM_IDS,
  getOnlineWeakItemOrderPool,
  getOnlineWeakItemOrderForCalendar,
  getOnlineWeakItemOrderWeekIndex,
  getOnlineWeakItemOrderConflictTagsForFamilyWish,
  getItemLinkageUseLabels,
  getItemLinkageUseTags,
  getItemLinkageDef
} = data

const requiredWeakOrderItems = [
  'manor_edge_bundle',
  'mixed_seed_oil',
  'rice_flour',
  'dried_crop_bundle',
  'dried_fruit_mix',
  'fish_feed',
  'standard_bait'
]

const itemIds = new Set(ITEMS.map(item => item.id))
const configuredOrderItems = [...ONLINE_WEAK_ITEM_ORDER_ITEM_IDS]
const orderPool = getOnlineWeakItemOrderPool()
const orderPoolItemIds = orderPool.map(order => order.itemId)

for (const itemId of requiredWeakOrderItems) {
  assert(itemIds.has(itemId), `弱用途线上订单引用了不存在的物品：${itemId}`)
  assert(configuredOrderItems.includes(itemId), `线上弱用途轮换配置缺少：${itemId}`)
  assert(orderPoolItemIds.includes(itemId), `线上弱用途订单池缺少：${itemId}`)

  const demandEntries = LINKAGE_DEMAND_POOL.filter(entry =>
    entry.itemId === itemId &&
    entry.systems.includes('onlineOrder') &&
    entry.tags.includes('weak_item_sink')
  )
  assert(demandEntries.length >= 1, `需求池缺少线上弱用途入口：${itemId}`)
  assert(demandEntries.every(entry => entry.repeatWindow === 'weekly'), `线上弱用途入口必须是周重复窗口：${itemId}`)
  assert(demandEntries.every(entry => (entry.minQuantity ?? 0) >= 1), `线上弱用途入口数量必须为正：${itemId}`)
  assert(demandEntries.every(entry => entry.tags.includes('public_storage')), `线上弱用途入口必须带 public_storage 标签：${itemId}`)
  assert(demandEntries.every(entry => (entry.antiRepeatTags ?? []).length >= 2), `线上弱用途入口必须带反重复标签：${itemId}`)

  const linkage = getItemLinkageDef(itemId)
  assert(linkage?.currentUseSystems.includes('onlineOrder'), `联动矩阵未标记线上订单当前用途：${itemId}`)
  assert(linkage?.repeatableSinks.includes('onlineOrder'), `联动矩阵未标记线上订单重复消耗口：${itemId}`)
  assert(getItemLinkageUseLabels(itemId, 6).includes('线上订单'), `物品卡用途标签未登记线上订单：${itemId}`)
  assert(
    getItemLinkageUseTags(itemId, 6).some(tag => tag.label === '线上订单' && tag.panelKey === 'online'),
    `物品卡线上订单标签没有跳转在线入口：${itemId}`
  )
}

assert(orderPool.length >= requiredWeakOrderItems.length, '线上弱用途订单池规模不足')
assert(new Set(orderPoolItemIds).size === orderPoolItemIds.length, '线上弱用途订单池存在重复物品')

for (const order of orderPool) {
  assert(order.quantity >= 1, `线上弱用途订单数量非法：${order.id}`)
  assert(order.title.length > 0, `线上弱用途订单缺少标题：${order.id}`)
  assert(order.summary.length > 0, `线上弱用途订单缺少摘要：${order.id}`)
  assert(order.publicFeedback.length > 0, `线上弱用途订单缺少公共仓反馈：${order.id}`)
  assert(order.rotationReason.length > 0, `线上弱用途订单缺少轮换原因：${order.id}`)
  assert(Object.values(order.ticketReward).some(amount => amount > 0), `线上弱用途订单缺少票券奖励：${order.id}`)
  assert(order.antiRepeatTags.includes(order.itemId), `线上弱用途订单缺少物品反重复标签：${order.id}`)
  assert(order.antiRepeatTags.includes('public_storage'), `线上弱用途订单缺少公共仓反重复标签：${order.id}`)
}

const seenCalendarItems = []
for (let week = 0; week < orderPool.length * 2; week += 1) {
  const day = (week % 4) * 7 + 1
  const season = ['spring', 'summer', 'autumn', 'winter'][Math.floor(week / 4) % 4]
  const year = 1 + Math.floor(week / 16)
  const order = getOnlineWeakItemOrderForCalendar(year, season, day)
  assert(!!order, `轮换日历未生成订单：year=${year} season=${season} day=${day}`)
  if (order) {
    if (seenCalendarItems.length > 0) {
      assert(order.itemId !== seenCalendarItems[seenCalendarItems.length - 1], `线上订单连续重复同一物品：${order.itemId}`)
    }
    seenCalendarItems.push(order.itemId)
  }
}
assert(getOnlineWeakItemOrderWeekIndex(1) === 1, '第 1 天应属于第 1 周')
assert(getOnlineWeakItemOrderWeekIndex(8) === 2, '第 8 天应属于第 2 周')
assert(new Set(seenCalendarItems).size >= requiredWeakOrderItems.length, '轮换日历没有覆盖完整弱用途池')
const breakfastBlockedTags = getOnlineWeakItemOrderConflictTagsForFamilyWish('wish_shared_breakfast')
assert(breakfastBlockedTags.includes('family_breakfast'), '家庭早餐心愿必须生成 family_breakfast 反重复标签')
assert(breakfastBlockedTags.includes('mixed_seed_oil'), '家庭早餐心愿必须生成具体物品反重复标签')
for (let week = 0; week < requiredWeakOrderItems.length; week += 1) {
  const day = (week % 4) * 7 + 1
  const season = ['spring', 'summer', 'autumn', 'winter'][Math.floor(week / 4) % 4]
  const order = getOnlineWeakItemOrderForCalendar(1, season, day, 0, breakfastBlockedTags)
  assert(order?.itemId !== 'mixed_seed_oil', '线上订单反重复不应与家庭早餐同周索要 mixed_seed_oil')
}

const onlineOrdersSource = read('src/views/game/online/OnlineOrdersView.vue')
assert(onlineOrdersSource.includes("from '@/data/onlineOrders'"), '在线委托页必须从线上订单数据模块读取弱用途池')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-board"'), '在线委托页缺少弱用途订单板')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-current"'), '弱用途订单板缺少当前物品行')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-rotation-reason"'), '弱用途订单板缺少轮换原因')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-next"'), '弱用途订单板缺少下周预告')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-submit"'), '弱用途订单板缺少提交按钮')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-anti-repeat"'), '弱用途订单板缺少家庭心愿反重复提示')
assert(onlineOrdersSource.includes('useNpcStore'), '弱用途订单页必须读取当前家庭心愿')
assert(onlineOrdersSource.includes('getOnlineWeakItemOrderConflictTagsForFamilyWish'), '弱用途订单页必须读取家庭心愿反重复标签')
assert(onlineOrdersSource.includes('weakItemOrderBlockedTags.value'), '弱用途订单轮换必须传入反重复标签')
assert(
  onlineOrdersSource.includes('inventoryStore.getUnlockedItemCount(currentWeakItemOrder.value.itemId)'),
  '弱用途订单库存口径必须读取当前轮换物品且排除锁定物品'
)
assert(
  onlineOrdersSource.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'),
  '弱用途订单必须真实扣除当前轮换物品'
)
assert(onlineOrdersSource.includes("source: 'online_weak_item_order'"), '弱用途订单票券奖励必须有稳定来源标记')
assert(onlineOrdersSource.includes('playerStore.markLifestyleUnlock(weakItemOrderLockId.value'), '弱用途订单缺少周锁记录')
assert(onlineOrdersSource.includes('weakItemOrderCompleted'), '弱用途订单缺少重复提交保护')
assert(onlineOrdersSource.includes('currentWeakItemOrderMissingQuantity'), '弱用途订单缺少库存不足保护')
assert(onlineOrdersSource.includes('order.publicFeedback'), '弱用途订单成功日志必须写入公共仓反馈')
assert(!onlineOrdersSource.includes('MANOR_EDGE_ORDER_ITEM_ID'), '在线委托页不应再使用单物品边角菜包常量')
assert(!onlineOrdersSource.includes('online_manor_edge_bundle_order'), '在线委托页不应再使用单物品奖励来源')

const demandPoolSource = read('src/data/linkageDemandPools.ts')
assert(demandPoolSource.includes('getPublicStorageDemandEntries'), '需求池必须提供公共仓共享查询')
for (const itemId of requiredWeakOrderItems) {
  assert(demandPoolSource.includes(`itemId: '${itemId}'`), `需求池源码缺少弱用途物品：${itemId}`)
}

if (errors.length > 0) {
  console.error('qa-online-order-weak-item-sinks failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-online-order-weak-item-sinks passed (${orderPool.length} weak item orders, ${seenCalendarItems.length} calendar checks).`)
