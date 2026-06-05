import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.join(serverRoot, `.tmp-cohabitation-stale-merge-${process.pid}`)

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = path.join(tempDir, '.storage.json')
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const socialRuntime = require('../src/taoyuanSocialRuntime')
const runtime = require('../src/taoyuanCohabitationRuntime')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const owner = 'qa_v10_owner'
const partner = 'qa_v10_partner'
const actor = username => ({ username, displayName: username, userAgent: 'qa-cohabitation-stale-merge-policy' })

const createPlots = () => Array.from({ length: 16 }, (_, id) => ({
  id,
  state: 'wasteland',
  cropId: null,
  growthDays: 0,
  watered: false,
  unwateredDays: 0,
  fertilizer: null,
  harvestCount: 0,
  giantCropGroup: null,
  seedGenetics: null,
  infested: false,
  infestedDays: 0,
  weedy: false,
  weedyDays: 0,
}))

const buildSaveData = username => ({
  meta: { saveVersion: 1, savedAt: '2026-06-05T00:00:00.000Z' },
  savedAt: '2026-06-05T00:00:00.000Z',
  data: {
    player: { playerName: username, money: 1000 },
    game: { year: 1, season: 'spring', day: 12 },
    farm: { farmSize: 4, plots: createPlots(), fruitTrees: [], greenhousePlots: [], nextFruitTreeId: 0 },
    inventory: {
      items: username === owner
        ? [{ itemId: 'vitality_feed', quantity: 3, quality: 'normal', locked: false }]
        : [],
      tempItems: [],
      capacity: 24,
    },
    home: { farmhouseLevel: 1, caveChoice: 'none', caveUnlocked: false, greenhouseUnlocked: false },
    decoration: { owned: {}, placed: {} },
    animal: {
      animals: [],
      pets: username === owner
        ? [
            { id: 'qa_v10_cat', type: 'cat', name: 'V10 Cat', friendship: 20, mood: 30 },
            { id: 'qa_v10_dog', type: 'dog', name: 'V10 Dog', friendship: 20, mood: 30 },
          ]
        : [],
    },
  },
})

const seedSave = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const preparedSlot = saveRuntime.prepareSlotEntryForSave(
    username,
    0,
    saveRuntime.encryptTaoyuanData(buildSaveData(username)),
    1,
  )
  slots.slots[0] = {
    raw: preparedSlot.raw,
    revision: preparedSlot.revision,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

try {
  assert.equal((await db.registerUser(owner, 'SmokePass_v10', 'V10 Owner')).ok, true)
  assert.equal((await db.registerUser(partner, 'SmokePass_v10', 'V10 Partner')).ok, true)
  seedSave(owner)
  seedSave(partner)
  const friendship = await socialRuntime.requestFriendship(owner, { target_username: partner })
  await socialRuntime.acceptFriendRequest(partner, friendship.id)

  const created = await runtime.createCohabitationContract({
    type: 'lover_cohabitation',
    target_username: partner,
    idempotency_key: 'qa-v10-contract',
  }, actor(owner))
  const accepted = await runtime.acceptCohabitationContract(created.contract.id, actor(partner))
  const contractId = accepted.contract.id

  const deposit = await runtime.depositCohabitationWarehouseItem(contractId, {
    item_id: 'vitality_feed',
    quantity: 3,
    idempotency_key: 'qa-v10-vitality-feed-deposit',
    save_slot: 0,
  }, actor(owner))
  assert.equal(deposit.warehouse.items.find(item => item.item_id === 'vitality_feed')?.quantity, 3)
  const sharedPets = await runtime.getCohabitationSharedPets(contractId, actor(owner))
  const cat = sharedPets.shared_pets.pets.find(pet => pet.source_pet_id === 'qa_v10_cat')
  const dog = sharedPets.shared_pets.pets.find(pet => pet.source_pet_id === 'qa_v10_dog')
  assert.ok(cat?.id, 'shared cat should be materialized for stale merge QA')
  assert.ok(dog?.id, 'shared dog should be materialized for stale merge QA')

  const stalePreflight = await runtime.preflightCohabitationOfflineConflicts(contractId, {
    idempotency_key: 'qa-v10-stale-preflight',
    client_queue_revision: 1,
    actions: ['care_shared_pet'],
  }, actor(owner))
  assert.equal(stalePreflight.offline_conflict_preflight.client_queue_stale, true)
  assert.equal(stalePreflight.offline_conflict_preflight.conflict_policy, 'server_authoritative_refresh_required')
  assert.equal(stalePreflight.offline_conflict_preflight.personal_save_changed, false)
  assert.equal(stalePreflight.offline_conflict_preflight.shared_warehouse_changed, false)

  const directMerge = await runtime.mergeCohabitationOfflineQueue(contractId, {
    idempotency_key: 'qa-v10-direct-stale-merge',
    client_queue_revision: 1,
    operations: [{
      action: 'care_shared_pet',
      operation_id: 'qa-v10-direct-cat-care',
      idempotency_key: 'qa-v10-direct-cat-care',
      client_base_revision: 1,
      pet_id: cat.id,
      care_item_id: 'vitality_feed',
    }],
  }, actor(owner))
  assert.equal(directMerge.offline_queue_merge.client_queue_stale, true)
  assert.equal(directMerge.offline_queue_merge.accepted_count, 1)
  assert.equal(directMerge.offline_queue_merge.results[0]?.status, 'committed')
  assert.equal(directMerge.offline_queue_merge.results[0]?.client_base_stale, true)

  const autoResolve = await runtime.resolveCohabitationOfflineConflicts(contractId, {
    idempotency_key: 'qa-v10-auto-resolve-stale',
    client_queue_revision: 1,
    resolution_strategy: 'server_authoritative_auto_merge',
    operations: [{
      action: 'care_shared_pet',
      operation_id: 'qa-v10-auto-dog-care',
      idempotency_key: 'qa-v10-auto-dog-care',
      client_base_revision: 1,
      pet_id: dog.id,
      care_item_id: 'vitality_feed',
    }],
  }, actor(owner))
  assert.equal(autoResolve.offline_conflict_preflight.client_queue_stale, true)
  assert.equal(autoResolve.offline_conflict_auto_resolution.client_queue_stale, true)
  assert.equal(autoResolve.offline_conflict_auto_resolution.strategy, 'server_authoritative_auto_merge')
  assert.equal(autoResolve.offline_conflict_auto_resolution.accepted_count, 1)
  assert.equal(autoResolve.offline_queue_merge.results[0]?.status, 'committed')

  console.log('[qa-cohabitation-stale-merge-policy] OK')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
