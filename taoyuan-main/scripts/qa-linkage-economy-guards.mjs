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
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.tsx'),
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
const quarryData = await import(pathToFileURL(path.join(srcRoot, 'data', 'quarry.ts')).href)

const packageJson = JSON.parse(read('package.json'))
const onlineOrdersSource = read('src/views/game/online/OnlineOrdersView.vue')
const questStoreSource = read('src/stores/useQuestStore.ts')
const shopStoreSource = read('src/stores/useShopStore.ts')
const farmViewSource = read('src/views/game/FarmView.vue')
const inventoryStoreSource = read('src/stores/useInventoryStore.ts')
const npcStoreSource = read('src/stores/useNpcStore.ts')
const museumStoreSource = read('src/stores/useMuseumStore.ts')
const hanhaiStoreSource = read('src/stores/useHanhaiStore.ts')
const quarryStoreSource = read('src/stores/useQuarryStore.ts')
const questsSource = read('src/data/quests.ts')

const ticketTotal = ledger =>
  Object.values(ledger ?? {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0)

const itemValue = (itemId, quantity = 1) =>
  Math.max(0, data.getItemById(itemId)?.sellPrice ?? 0) * Math.max(0, Math.floor(Number(quantity) || 0))

const rewardItemValue = items =>
  (items ?? []).reduce((sum, item) => sum + itemValue(item.itemId, item.quantity), 0)

const getBlock = (source, marker, nextMarker) => {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const end = nextMarker ? source.indexOf(nextMarker, start + marker.length) : -1
  return end > start ? source.slice(start, end) : source.slice(start)
}

const highAccessOptions = {
  discoveredHybridIds: ['sandglass_cactus', 'oasis_star_date', 'supreme_origin_melon', 'vast_meng_melon'],
  discoveredPondBreedIds: ['sturgeon', 'dragonfish', 'golden_carp'],
  completedVillageProjectIds: ['support_shed', 'festival_greenhouse', 'caravan_station', 'caravan_station_ii', 'village_school', 'village_school_ii'],
  collectedSecretNoteIds: Array.from({ length: 30 }, (_, index) => index + 1),
  npcFriendshipLevels: Object.fromEntries(data.NPCS.map(npc => [npc.id, 'bonded'])),
  breedingCompendiumEntries: [
    {
      hybridId: 'sandglass_cactus',
      lineageCropIds: ['hanhai_cactus', 'supreme_origin_melon'],
      bestSweetness: 90,
      bestYield: 90,
      bestResistance: 90,
      bestGeneration: 9,
      bestTotalStats: 270
    },
    {
      hybridId: 'oasis_star_date',
      lineageCropIds: ['hanhai_date', 'vast_meng_melon'],
      bestSweetness: 90,
      bestYield: 90,
      bestResistance: 90,
      bestGeneration: 9,
      bestTotalStats: 270
    }
  ]
}

assert(
  packageJson.scripts?.['qa:linkage-economy-guards'] === 'node scripts/qa-linkage-economy-guards.mjs',
  'package.json must register qa:linkage-economy-guards.'
)

// 商店买入 -> 回购/订单：商店来源物品要保留 purchaseUnitPrice，并至少不能走出货箱高倍率套利。
assert(inventoryStoreSource.includes("origin === 'shop'"), 'Inventory stacks must preserve shop origin metadata.')
assert(inventoryStoreSource.includes('purchaseUnitPrice'), 'Inventory stacks must preserve purchase unit price.')
assert(shopStoreSource.includes('const SHOP_BUYBACK_RATE = 0.8'), 'Shop buyback must stay below purchase price.')
assert(
  shopStoreSource.includes("playerStore.earnMoney(totalPrice, { countAsEarned: false, system: 'shop' })"),
  'Shop buyback must not count as earned economy income.'
)
assert(farmViewSource.includes("item.origin !== 'shop'"), 'Shipping box must hide shop-origin items from normal market shipping.')
assert(farmViewSource.includes('商圈购入品只能商店回购'), 'Shipping box must explain shop-origin item rejection.')
assert(
  questStoreSource.includes('specialOrderSettlementReceipts.value.includes(quest.id)'),
  'Special orders must keep duplicate settlement receipt checks before paying rewards.'
)

// 普通订单和特殊订单：奖励倍率允许有成就感，但不能无上限叠加。
for (const template of data.QUEST_TEMPLATES) {
  assert(template.rewardMultiplier <= 5, `Quest template reward multiplier too high: ${template.type} x${template.rewardMultiplier}.`)
  for (const target of template.targets) {
    assert(target.unitPrice <= Math.max(1, itemValue(target.itemId, 1) * 3), `Quest target unit price greatly exceeds sell value: ${target.itemId}.`)
  }
}
for (const profileId of ['standard_cash', 'operations_mix', 'trade_mix', 'research_mix', 'exhibit_mix', 'pond_premium_mix']) {
  const profile = data.getSpecialOrderRewardProfile(profileId)
  assert(profile, `Missing special order reward profile: ${profileId}.`)
  assert((profile?.cashRatio ?? 0) <= 1, `${profileId} cash ratio must not exceed full cash payout.`)
  assert(ticketTotal(profile?.ticketReward) <= 2, `${profileId} ticket reward must stay capped at 2.`)
}
for (const season of ['spring', 'summer', 'autumn', 'winter']) {
  for (let tier = 1; tier <= 4; tier += 1) {
    const order = data.generateSpecialOrder(season, tier, highAccessOptions)
    if (!order) continue
    assert(order.targetQuantity > 0, `Generated special order must request real materials: ${season} tier ${tier}.`)
    assert(order.moneyReward <= itemValue(order.targetItemId, order.targetQuantity) * 8 + 1000, `Generated special order cash is too far above item value: ${order.targetItemId}.`)
    assert(ticketTotal(order.ticketReward) <= 3, `Generated special order has too many base tickets: ${order.targetItemId}.`)
    for (const threshold of order.orderScoreRule?.thresholds ?? []) {
      assert((threshold.rewardMoneyMultiplier ?? 1) <= 1.15, `Special order score money multiplier too high: ${order.targetItemId} ${threshold.rank}.`)
      assert((threshold.rewardTicketMultiplier ?? 1) <= 1.35, `Special order score ticket multiplier too high: ${order.targetItemId} ${threshold.rank}.`)
    }
  }
}
assert(
  questStoreSource.includes('processedOrderSubmissionCountSnapshot') &&
    questStoreSource.includes('npcFunctionAdvancedOrderCompletionCountSnapshot') &&
    questStoreSource.includes('specialOrderSettlementReceiptsSnapshot'),
  'Quest submission rollback must include processed/NPC counters and settlement receipts.'
)

// 线上弱用途订单：必须是周轮换、周锁、温和票券奖励，且不发直接铜钱。
const weakOrderPool = data.getOnlineWeakItemOrderPool()
assert(weakOrderPool.length >= data.ONLINE_WEAK_ITEM_ORDER_ITEM_IDS.length, 'Weak item online order pool must cover all configured weak item ids.')
for (const order of weakOrderPool) {
  const demand = data.LINKAGE_DEMAND_POOL.find(entry => entry.id === order.demandId)
  assert(demand?.repeatWindow === 'weekly', `Weak item online order must be weekly-limited: ${order.id}.`)
  assert(demand?.systems.includes('onlineOrder'), `Weak item online order demand must belong to onlineOrder: ${order.id}.`)
  assert(demand?.tags.includes('weak_item_sink'), `Weak item online order demand must keep weak_item_sink tag: ${order.id}.`)
  assert(order.quantity >= 1, `Weak item online order must consume at least one item: ${order.id}.`)
  assert(ticketTotal(order.ticketReward) > 0 && ticketTotal(order.ticketReward) <= 1, `Weak item online order ticket reward must be exactly small-scale: ${order.id}.`)
  assert(order.antiRepeatTags.includes(order.itemId), `Weak item online order must anti-repeat by item id: ${order.id}.`)
  assert(order.antiRepeatTags.includes('public_storage'), `Weak item online order must anti-repeat by public storage: ${order.id}.`)
}
const weakSubmitBlock = getBlock(onlineOrdersSource, 'const submitWeakItemOrder = () =>', '\n  const getRouteQueryText')
assert(weakSubmitBlock.includes('weakItemOrderCompleted.value'), 'Weak item online order must reject duplicate weekly submission.')
assert(weakSubmitBlock.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'), 'Weak item online order must consume unlocked inventory items.')
assert(weakSubmitBlock.includes("source: 'online_weak_item_order'"), 'Weak item online order tickets must have a stable source.')
assert(weakSubmitBlock.includes('playerStore.markLifestyleUnlock(weakItemOrderLockId.value'), 'Weak item online order must write the weekly lock.')
assert(!weakSubmitBlock.includes('earnMoney('), 'Weak item online order must not grant direct money.')

// 家庭心愿：低价材料可以换生活反馈，但必须一次性、真实扣物，且不能产出票券。
const familyWishes = [...data.WS09_FAMILY_WISH_DEFS, ...data.WS15_FAMILY_WISH_DEFS]
assert(familyWishes.length >= 7, 'Family wish pool must stay populated.')
for (const wish of familyWishes) {
  const requirements = wish.itemRequirements ?? []
  assert(requirements.length > 0, `Family wish must consume real items: ${wish.id}.`)
  const costValue = requirements.reduce((sum, requirement) => sum + itemValue(requirement.itemId, requirement.quantity), 0)
  const rewardMoney = Math.max(0, Math.floor(Number(wish.reward?.money) || 0))
  const totalRewardValue = rewardMoney + rewardItemValue(wish.reward?.items)
  assert(rewardMoney <= 2600, `Family wish direct money reward too high: ${wish.id}.`)
  assert(totalRewardValue <= Math.max(3200, costValue * 12), `Family wish reward value too high versus consumed items: ${wish.id}.`)
  assert(!('ticketReward' in (wish.reward ?? {})), `Family wish must not mint reward tickets: ${wish.id}.`)
}
const completeFamilyWishBlock = getBlock(npcStoreSource, 'const completeFamilyWish =', '\n  const getEligibleFamilyWishDefs')
assert(completeFamilyWishBlock.includes('familyWishBoard.value.rewardClaimed'), 'Family wish completion must guard rewardClaimed.')
assert(completeFamilyWishBlock.includes('familyWishBoard.value.completedWishIds.includes(wishId)'), 'Family wish completion must guard completedWishIds.')
assert(completeFamilyWishBlock.includes('consumeFamilyWishItemRequirements(wishDef)'), 'Family wish completion must consume item requirements.')
assert(completeFamilyWishBlock.includes('inventoryStore.deserialize(inventorySnapshot)'), 'Family wish completion must rollback consumed items on reward failure.')

// 博物馆专题展组：长期展示奖励只能是一次性经营收益，不能变成直接发钱循环。
for (const set of data.MUSEUM_EXHIBIT_SETS) {
  assert(set.repeatable === false, `Museum exhibit set must be one-time: ${set.id}.`)
  assert(set.requirements.length > 0, `Museum exhibit set must consume real requirements: ${set.id}.`)
  assert(set.rewards.every(reward => reward.kind !== 'money'), `Museum exhibit set must not grant direct money: ${set.id}.`)
  assert(set.rewards.every(reward => reward.value > 0 && reward.value <= 20), `Museum exhibit set reward value out of bounded range: ${set.id}.`)
}
assert(museumStoreSource.includes('if (set.state.rewardClaimed)'), 'Museum exhibit set rewards must guard rewardClaimed.')
assert(museumStoreSource.includes('setExhibitSetState(setId, { rewardClaimed: true })'), 'Museum exhibit set rewards must mark rewardClaimed.')

// 瀚海准备物：奖励可增强探索手感，但不能把单次出行变成现金/票券套利器。
for (const prep of data.HANHAI_TRAVEL_PREP_DEFS) {
  assert(prep.costItems.length > 0, `Hanhai travel prep must consume real items: ${prep.id}.`)
  for (const cost of prep.costItems) {
    assert(data.getItemById(cost.itemId), `Hanhai travel prep cost item missing: ${prep.id}:${cost.itemId}.`)
    assert(cost.quantity > 0, `Hanhai travel prep cost must be positive: ${prep.id}:${cost.itemId}.`)
  }
  assert(prep.successRateBonus <= 25, `Hanhai travel prep success bonus too high: ${prep.id}.`)
  assert(prep.riskReduction <= 25, `Hanhai travel prep risk reduction too high: ${prep.id}.`)
  assert((prep.rewardItemMultiplier ?? 1) <= 1.35, `Hanhai travel prep item multiplier too high: ${prep.id}.`)
  assert((prep.moneyMultiplier ?? 1) <= 1.1, `Hanhai travel prep money multiplier too high: ${prep.id}.`)
  assert(ticketTotal(prep.extraTicketRewards) <= 2, `Hanhai travel prep extra tickets too high: ${prep.id}.`)
}
const relicSites = [...data.HANHAI_RELIC_SITES, ...data.WS14_HANHAI_RELIC_SITES]
for (const site of relicSites) {
  assert(!site.rewards.money, `Hanhai relic site should not return direct base money: ${site.id}.`)
}
assert(hanhaiStoreSource.includes('Math.min(0.8, prep.riskReduction / 100)'), 'Hanhai prep risk reduction must be clamped.')
assert(hanhaiStoreSource.includes('removeItemAnywhere(cost.itemId, cost.quantity)'), 'Hanhai prep must remove real item costs.')

// 采石场丹药准备：必须每段真实消耗 1 个丹药，只减损耗，不直接加钱或刷奖励。
for (const prep of data.QUARRY_MINE_ELIXIR_PREP_OPTIONS) {
  assert(data.getItemById(prep.itemId), `Quarry elixir prep item missing: ${prep.itemId}.`)
  assert(prep.staminaReduction >= 0 && prep.staminaReduction <= 1, `Quarry elixir prep stamina reduction too high: ${prep.itemId}.`)
  assert(prep.monsterDamageMultiplier >= 0.4 && prep.monsterDamageMultiplier <= 1, `Quarry elixir prep damage multiplier out of bounds: ${prep.itemId}.`)
}
const quarryMineBlock = getBlock(quarryStoreSource, 'const resolveQuarryMineNode =', '\n  const claimQuarryMineFinalReward')
assert(quarryMineBlock.includes('inventoryStore.removeItemAnywhere(elixirPrep.itemId, 1)'), 'Quarry elixir prep must consume exactly one elixir per node.')
assert(quarryMineBlock.includes('getQuarryMineElixirPrepOption(prepItemId)'), 'Quarry mine node settlement must resolve configured elixir prep.')
assert(!quarryMineBlock.includes('earnMoney('), 'Quarry elixir prep path must not grant direct money.')
assert(
  quarryData.QUARRY_MINE_REPEAT_FINAL_REWARDS.reduce((sum, reward) => sum + itemValue(reward.itemId, reward.quantity), 0) <= 600,
  'Quarry repeat final reward value must stay bounded.'
)

// 源码中这些经济倍率/结算配置是套利护栏的事实来源，避免后续误删。
assert(questsSource.includes('rewardMoneyMultiplier: 1.12'), 'Special order S-rank money multiplier ceiling should remain visible in data.')
assert(questsSource.includes('rewardTicketMultiplier: 1.3'), 'Special order S-rank ticket multiplier ceiling should remain visible in data.')
assert(questsSource.includes('antiRepeatCooldownWeeks: 2'), 'Processed special order templates must keep anti-repeat cooldowns.')

if (errors.length > 0) {
  console.error('qa-linkage-economy-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-linkage-economy-guards passed (${weakOrderPool.length} online orders, ${familyWishes.length} family wishes, ${data.HANHAI_TRAVEL_PREP_DEFS.length} Hanhai prep sinks).`)
