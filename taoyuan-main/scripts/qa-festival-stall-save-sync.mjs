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
] = await Promise.all([
  readAppSource(path.join('src', 'stores', 'useFestivalStallStore.ts')),
  readAppSource(path.join('src', 'utils', 'festivalStallApi.ts')),
  readRepoSource(path.join('server', 'src', 'taoyuanFestivalStall.js')),
])

const syncAfterPurchase = extractBetween(
  festivalStallStore,
  'const syncAfterPurchase = async',
  'const refreshStall = async'
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
  festivalStallApi.includes('save_revision?: number'),
  'festival stall API response type must expose save_revision'
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

console.log('qa-festival-stall-save-sync: ok')
