/* global console */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')

const readAppSource = relativePath => readFile(path.join(appRoot, relativePath), 'utf8')
const readRepoSource = relativePath => readFile(path.join(repoRoot, relativePath), 'utf8')

const extractBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`)
  const end = source.indexOf(endMarker, start)
  assert(end > start, `missing end marker: ${endMarker}`)
  return source.slice(start, end)
}

const [
  festivalStallStore,
  festivalStallApi,
  festivalStallRuntime,
  festivalStallPanel,
  shopView,
] = await Promise.all([
  readAppSource(path.join('src', 'stores', 'useFestivalStallStore.ts')),
  readAppSource(path.join('src', 'utils', 'festivalStallApi.ts')),
  readRepoSource(path.join('server', 'src', 'taoyuanFestivalStall.js')),
  readAppSource(path.join('src', 'components', 'game', 'FestivalStallPanel.vue')),
  readAppSource(path.join('src', 'views', 'game', 'ShopView.vue')),
])

const syncAfterPurchase = extractBetween(
  festivalStallStore,
  'const syncAfterPurchase = async',
  'const refreshStall = async'
)
const buyOffer = extractBetween(
  festivalStallStore,
  'const buyOffer = async',
  'return {'
)
const buildOfferSummary = extractBetween(
  festivalStallRuntime,
  'function buildOfferSummary',
  'function listFestivalStall'
)
const finalizeCatalog = extractBetween(
  festivalStallRuntime,
  'function finalizeCatalog',
  'function getFestivalCatalog'
)
const purchaseFestivalStallOffer = extractBetween(
  festivalStallRuntime,
  'function purchaseFestivalStallOffer',
  'module.exports = {'
)

assert(
  syncAfterPurchase.includes('const syncCurrentSessionByDelta = async'),
  'festival stall purchases must merge the purchase delta into the current runtime session'
)
assert(
  !syncAfterPurchase.includes('loadFromSlot('),
  'festival stall purchases must not reload the whole server slot after purchase'
)
assert(
  syncAfterPurchase.includes('applyPurchaseDeltaToCurrentSession(result)'),
  'festival stall sync must apply only the purchase delta to the current runtime'
)
assert(
  syncAfterPurchase.includes('result.idempotency_replayed === true'),
  'festival stall sync must detect idempotency replay receipts'
)
assert(
  syncAfterPurchase.indexOf('result.idempotency_replayed === true') < syncAfterPurchase.indexOf('applyPurchaseDeltaToCurrentSession(result)'),
  'festival stall idempotency replay receipts must skip duplicate reward delta application'
)
assert(
  syncAfterPurchase.includes('acknowledgeServerSlotRevision(currentSessionSlot, saveRevision)'),
  'festival stall sync must acknowledge the server revision returned by the purchase write'
)
assert(
  syncAfterPurchase.includes('saveStore.saveToSlot(currentSessionSlot)'),
  'festival stall sync must save the merged current runtime instead of replacing it'
)
assert(
  syncAfterPurchase.includes('const playerSnapshot = playerStore.serialize()') &&
    syncAfterPurchase.includes('const inventorySnapshot = inventoryStore.serialize()') &&
    syncAfterPurchase.includes('const walletSnapshot = walletStore.serialize()'),
  'festival stall sync must snapshot mutable local stores before applying the purchase delta'
)
assert(
  syncAfterPurchase.includes('playerStore.deserialize(playerSnapshot)') &&
    syncAfterPurchase.includes('inventoryStore.deserialize(inventorySnapshot)') &&
    syncAfterPurchase.includes('walletStore.deserialize(walletSnapshot)'),
  'festival stall sync must roll back the local delta if the merged save cannot be persisted'
)
assert(
  festivalStallStore.includes('const ensureServerRuntimeSyncedBeforePurchase = async') &&
    buyOffer.includes('await ensureServerRuntimeSyncedBeforePurchase()') &&
    buyOffer.indexOf('await ensureServerRuntimeSyncedBeforePurchase()') < buyOffer.indexOf('purchaseFestivalStallOffer(offerId)'),
  'festival stall purchases must sync the current server runtime before the purchase POST derives the game-week limit window'
)
assert(
  festivalStallStore.includes('const mergePurchaseResultIntoStall = (result: FestivalStallActionResponse) =>') &&
    buyOffer.includes('mergePurchaseResultIntoStall(result)') &&
    buyOffer.indexOf('mergePurchaseResultIntoStall(result)') < buyOffer.indexOf('refreshStall().catch(() => {})'),
  'festival stall purchases must merge the returned purchase receipt into the current stall snapshot before refetching'
)

assert(
  festivalStallApi.includes('save_revision?: number'),
  'festival stall API response type must expose save_revision'
)
assert(
  festivalStallApi.includes("'supply'"),
  'festival stall API types must expose the supply booth category'
)
assert(
  festivalStallRuntime.includes('let saveRevision = 0') &&
    festivalStallRuntime.includes('saveRevision = persistGameplayData(context)'),
  'festival stall runtime must capture the server save revision created by purchase persistence'
)
assert(
  festivalStallRuntime.includes('save_revision: saveRevision'),
  'festival stall purchase response and idempotency receipt must include save_revision'
)
assert(
  festivalStallRuntime.includes('function countUserOfferClaims') &&
    festivalStallRuntime.includes('function countGlobalOfferClaims'),
  'festival stall runtime must reconstruct purchase limits from records and receipts'
)
assert(
  festivalStallRuntime.includes('const claimedByUser = countUserOfferClaims(weekState, username, offer.id)') &&
    festivalStallRuntime.includes('const claimedGlobal = countGlobalOfferClaims(weekState, offer.id)'),
  'festival stall purchase checks must not rely only on user_usage and offer_claims'
)
assert(
  buildOfferSummary.indexOf('claimedByUser >= clampPositiveInt(offer.weekly_limit_per_user, 1)') <
    buildOfferSummary.indexOf('marketGovernance.ensureUserRateLimit'),
  'festival stall snapshots must show personal purchase-limit exhaustion before operation cooldown governance'
)
assert(
  finalizeCatalog.includes('Array.isArray(entry.costs)') &&
    finalizeCatalog.includes('entry.costs.map(normalizeBundleCostEntry)') &&
    !finalizeCatalog.includes("costs: [{ type: 'money', amount: entry.price_money }]"),
  'festival stall catalog finalization must preserve custom item costs for supply offers'
)
assert(
  festivalStallRuntime.includes("id: 'festival_lantern_oil_supply'") &&
    festivalStallRuntime.includes("id: 'festival_banquet_flour_supply'") &&
    festivalStallRuntime.includes("id: 'festival_hearth_dried_supply'") &&
    festivalStallRuntime.includes("categories: ['supply']") &&
    festivalStallRuntime.includes("tags: ['节会备料', '加工品消耗池'"),
  'festival stall runtime must expose supply offers that consume processed item groups'
)
assert(
  buildOfferSummary.includes('const moneyCost = getOfferMoneyCost(offer)') &&
    buildOfferSummary.includes('if (moneyCost > 0)') &&
    buildOfferSummary.includes('money_volume: moneyCost'),
  'festival stall snapshots must use real money costs for governance and allow item-only supply offers'
)
assert(
  purchaseFestivalStallOffer.indexOf('claimedByUser >= clampPositiveInt(offer.weekly_limit_per_user, 1)') <
    purchaseFestivalStallOffer.indexOf('marketGovernance.ensureUserRateLimit'),
  'festival stall purchase attempts must reject exhausted personal limits before operation cooldown governance'
)
assert(
  purchaseFestivalStallOffer.includes('const moneyCost = getOfferMoneyCost(offer)') &&
    purchaseFestivalStallOffer.includes('if (moneyCost > 0)') &&
    purchaseFestivalStallOffer.includes('applyCostsToSave(context.data, offer.costs)') &&
    purchaseFestivalStallOffer.includes('costs: offer.costs') &&
    purchaseFestivalStallOffer.includes('money_volume: moneyCost') &&
    !purchaseFestivalStallOffer.includes('context.data.player.money = previousMainMoney - offer.price_money'),
  'festival stall purchase path must deduct the generic offer costs and record item-cost supply submissions'
)
assert(
  festivalStallStore.includes('const getItemCosts = (costs: FestivalStallBundleEntry[])') &&
    festivalStallStore.includes('hasCombinedItems(itemCosts)') &&
    festivalStallStore.includes('removeCombinedItems(itemCosts)') &&
    festivalStallStore.includes('const warehouseSnapshot = warehouseStore.serialize()') &&
    festivalStallStore.includes('warehouseStore.deserialize(warehouseSnapshot)') &&
    festivalStallStore.indexOf('removeCombinedItems(itemCosts)') <
      festivalStallStore.indexOf('inventoryStore.addItemsExact(itemRewards)'),
  'festival stall current-session delta merge must remove combined item costs before adding rewards'
)
assert(
  festivalStallPanel.includes('festival-stall-submit-supply') &&
    festivalStallPanel.includes('提交备料') &&
    festivalStallPanel.includes('个人{{ isSupplyOffer(offer) ?') &&
    festivalStallPanel.includes('本周摊位记录'),
  'festival stall panel must present supply offers as submissions instead of 0-money purchases'
)
assert(
  shopView.includes('const isIdempotencyReplay = result.idempotency_replayed === true') &&
    shopView.includes("本次未重复${isSupplyOffer ? '提交备料或发放回礼' : '发放奖励'}"),
  'festival stall UI must label idempotency replay as confirmation instead of a fresh purchase'
)
assert(
  shopView.includes('const isSupplyOffer = isFestivalStallSupplyOffer(result.offer)') &&
    shopView.includes('提交成功') &&
    shopView.includes('【节庆备料】已提交') &&
    shopView.includes('交出${formatExchangeBundle(result.record.costs)}'),
  'festival stall UI must log supply submissions with submitted costs and return gifts'
)

console.log('qa-festival-stall-save-sync: ok')
