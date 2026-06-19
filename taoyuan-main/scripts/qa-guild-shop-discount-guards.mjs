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
      // Try the next candidate.
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

const guildData = await import(pathToFileURL(path.join(srcRoot, 'data', 'guild.ts')).href)

const {
  GUILD_LEVELS,
  GUILD_SHOP_DISCOUNT_TIERS,
  getGuildShopDiscountRateForLevel,
  getGuildShopPriceAfterDiscount
} = guildData

const levelByNumber = new Map(GUILD_LEVELS.map(level => [level.level, level.expRequired]))
assert(GUILD_LEVELS.length === 13, '公会等级上限应扩展到 13 级。')
assert(levelByNumber.get(10) === 7500, '10 级经验门槛应保持 7500。')
assert(levelByNumber.get(11) === 11000, '11 级经验门槛应为 11000。')
assert(levelByNumber.get(12) === 16000, '12 级经验门槛应为 16000。')
assert(levelByNumber.get(13) === 23000, '13 级经验门槛应为 23000。')

assert(
  JSON.stringify(GUILD_SHOP_DISCOUNT_TIERS) ===
    JSON.stringify([
      { minLevel: 11, discountRate: 0.05 },
      { minLevel: 12, discountRate: 0.08 },
      { minLevel: 13, discountRate: 0.1 }
    ]),
  '公会商店折扣档位应为 11/12/13 级累计 5%/8%/10%。'
)

for (const [level, expectedRate] of [
  [0, 0],
  [10, 0],
  [11, 0.05],
  [12, 0.08],
  [13, 0.1],
  [99, 0.1]
]) {
  assert(getGuildShopDiscountRateForLevel(level) === expectedRate, `Lv.${level} 折扣率应为 ${expectedRate}。`)
}

assert(getGuildShopPriceAfterDiscount(1000, 10) === 1000, '10 级不应享受公会采购折扣。')
assert(getGuildShopPriceAfterDiscount(1000, 11) === 950, '11 级 1000 文商品应折后 950 文。')
assert(getGuildShopPriceAfterDiscount(1000, 12) === 920, '12 级 1000 文商品应折后 920 文。')
assert(getGuildShopPriceAfterDiscount(1000, 13) === 900, '13 级 1000 文商品应折后 900 文。')
assert(getGuildShopPriceAfterDiscount(999, 12) === 919, '折后价格应向下取整。')

const guildStoreSource = fs.readFileSync(path.join(srcRoot, 'stores', 'useGuildStore.ts'), 'utf8')
assert(guildStoreSource.includes('getGuildShopDiscountRateForLevel'), '公会 store 应接入等级折扣函数。')
assert(guildStoreSource.includes('getGuildShopPriceAfterDiscount'), '公会 store 应接入折后价格函数。')
assert(guildStoreSource.includes('const moneyPrice = getGuildShopItemMoneyPrice(item)'), '铜钱商品扣款前应计算折后单价。')
assert(guildStoreSource.includes('playerStore.spendMoney(moneyPrice)'), '铜钱商品应按折后单价扣款。')
assert(guildStoreSource.includes('contributionPoints.value -= item.contributionCost'), '贡献点兑换仍应按贡献点原价扣款。')

const guildViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'GuildView.vue'), 'utf8')
const itemCardSource = fs.readFileSync(path.join(srcRoot, 'components', 'game', 'ItemCard.vue'), 'utf8')
assert(guildViewSource.includes('荣誉采购折扣 -{{ guildShopDiscountPercent }}%'), '公会商店应展示荣誉采购折扣提示。')
assert(guildViewSource.includes('formatShopItemCost(item)'), '公会商店列表应显示折后价格。')
assert(guildViewSource.includes('formatShopItemCost(shopModalItem, true)'), '购买弹窗应显示折后单价。')
assert(guildViewSource.includes('playerStore.money >= shopBuyTotalCost'), '购买弹窗持有铜钱判断应使用折后合计。')
assert(guildViewSource.includes('getShopItemMoneyPrice(item) * safeQty'), '购买阻塞判断应使用折后单价。')
assert(guildViewSource.includes("import ItemCard from '@/components/game/ItemCard.vue'"), 'Guild shop should reuse the backpack ItemCard component.')
assert(guildViewSource.includes('v-for="item in visibleGuildShopItems"'), 'Guild shop list should render filtered visibleGuildShopItems.')
assert(!guildViewSource.includes('v-for="item in GUILD_SHOP_ITEMS"'), 'Guild shop template must not render the raw unfiltered shop list.')
assert(
  guildViewSource.includes('const visibleGuildShopItems = computed(() =>') &&
    guildViewSource.includes('GUILD_SHOP_ITEMS.filter(item => !isGuildShopItemLimitReached(item))'),
  'Guild shop visible list should hide items that reached their limit.'
)
assert(
  guildViewSource.includes('const isGuildShopItemLimitReached = (item: GuildShopItemDef): boolean =>') &&
    guildViewSource.includes('item.dailyLimit && guildStore.getDailyRemaining(item.itemId, item.dailyLimit) <= 0') &&
    guildViewSource.includes('item.weeklyLimit && guildStore.getWeeklyRemaining(item.itemId, item.weeklyLimit) <= 0') &&
    guildViewSource.includes('item.totalLimit && guildStore.getTotalRemaining(item.itemId, item.totalLimit) <= 0'),
  'Guild shop limit hiding must cover daily, weekly, and total purchase caps.'
)
assert(guildViewSource.includes(':secondary="formatShopItemCost(item)"'), 'Guild shop ItemCard should show the cost on the secondary line.')
assert(guildViewSource.includes(':locked="!guildStore.isShopItemUnlocked(item.itemId)"'), 'Locked guild shop cards should keep a lock marker.')
assert(guildViewSource.includes(':silhouette="!guildStore.isShopItemUnlocked(item.itemId)"'), 'Locked guild shop cards should keep the silhouette treatment.')
assert(guildViewSource.includes('当前可兑换商品已购完或尚未解锁'), 'Guild shop should show an empty state when every visible offer is filtered out.')
assert(
  itemCardSource.includes('silhouette?: boolean') &&
    itemCardSource.includes('const resolvedSilhouette = computed(() => props.silhouette ?? !props.discovered)') &&
    itemCardSource.includes(':silhouette="resolvedSilhouette"'),
  'ItemCard should support explicit silhouettes without hiding known item names.'
)

if (errors.length > 0) {
  console.error('qa:guild-shop-discount-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa:guild-shop-discount-guards passed')
