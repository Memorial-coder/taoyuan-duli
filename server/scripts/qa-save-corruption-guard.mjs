import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, '.tmp-save-corruption-guard')
const storageFile = path.join(tempDir, '.storage.json')

process.env.DB_STORAGE = storageFile

const require = createRequire(import.meta.url)
const {
  TAOYUAN_SAVES_DIR,
  createEmptySlots,
  decryptTaoyuanRaw,
  encryptTaoyuanData,
  loadUserSaveSlots,
  prepareSlotEntryForSave,
  saveUserSaveSlots,
} = require('../src/taoyuanSaveRuntime')

await rm(tempDir, { recursive: true, force: true })
await mkdir(TAOYUAN_SAVES_DIR, { recursive: true })

const username = 'corrupt_guard_user'
const saveFile = path.join(TAOYUAN_SAVES_DIR, `${username}.json`)
await writeFile(saveFile, '{ broken json', 'utf8')

assert.throws(
  () => loadUserSaveSlots(username),
  error => error?.status === 500 && error?.code === 'TAOYUAN_SAVE_STORE_CORRUPTED',
  'corrupted save JSON should not be converted to empty slots'
)

assert.throws(
  () => saveUserSaveSlots(username, { slots: createEmptySlots() }),
  error => error?.status === 500 && error?.code === 'TAOYUAN_SAVE_STORE_CORRUPTED',
  'corrupted save JSON should block overwrite writes'
)

const after = await readFile(saveFile, 'utf8')
assert.equal(after, '{ broken json', 'corrupted save file must remain untouched after blocked write')

const validSaveRaw = encryptTaoyuanData({
  data: {
    player: { playerName: 'valid_guard_user', money: 120 },
    game: { year: 1, season: 'spring', day: 1 },
  },
})
const badRawUsername = 'bad_raw_guard_user'
saveUserSaveSlots(badRawUsername, {
  slots: {
    ...createEmptySlots(),
    0: { raw: validSaveRaw, revision: 7 },
  },
})

assert.throws(
  () => prepareSlotEntryForSave(badRawUsername, 0, 'not-a-save', 8),
  error =>
    error?.status === 422 &&
    error?.code === 'TAOYUAN_SAVE_RAW_INVALID' &&
    error?.details?.reason === 'decrypt_or_parse_failed' &&
    error?.details?.required_operation === 'resubmit_valid_save_raw',
  'undecryptable raw should be rejected before it can overwrite an existing cloud save'
)

const stillValid = loadUserSaveSlots(badRawUsername)
assert.equal(stillValid.slots[0].raw, validSaveRaw, 'old cloud raw should remain unchanged after rejected bad raw')
assert.equal(stillValid.slots[0].revision, 7, 'old cloud revision should remain unchanged after rejected bad raw')

const missingPlayerRaw = encryptTaoyuanData({
  data: {
    inventory: { items: [], tempItems: [] },
  },
})
assert.throws(
  () => prepareSlotEntryForSave('missing_player_guard_user', 0, missingPlayerRaw, 1),
  error =>
    error?.status === 422 &&
    error?.code === 'TAOYUAN_SAVE_RAW_INVALID' &&
    error?.details?.reason === 'missing_gameplay_player',
  'save raw without gameplayData.player should be rejected before overwrite'
)

const illegalSaveRaw = encryptTaoyuanData({
  data: {
    player: { playerName: 'illegal_guard_user', money: -1 },
    game: { year: 0, season: 'void', day: 99 },
    inventory: {
      items: [{ itemId: 'rice', quantity: -5 }],
      tempItems: [],
    },
    farm: {
      plots: [{ id: 0, state: 'teleport', growthDays: -1 }],
    },
  },
})

assert.throws(
  () => prepareSlotEntryForSave('illegal_guard_user', 0, illegalSaveRaw, 1),
  error =>
    error?.status === 422 &&
    error?.code === 'TAOYUAN_SAVE_FIELD_ANOMALY' &&
    error?.details?.anomalies?.some(entry => entry.field_path === 'player.money') &&
    error?.details?.anomalies?.some(entry => entry.field_path === 'game.season') &&
    error?.details?.required_operation === 'repair_save_fields_before_write',
  'out-of-range or illegal gameplay fields should block save writes before overwrite'
)

const repairedEntry = prepareSlotEntryForSave('illegal_guard_user', 0, illegalSaveRaw, 1, {
  repairFieldAnomalies: true,
})
assert.equal(repairedEntry.fieldRepair?.repaired, true, 'confirmed repair save should report repaired field anomalies')
assert.ok(repairedEntry.fieldRepair?.anomaly_count >= 6, 'confirmed repair save should report anomaly count')
const repairedPayload = decryptTaoyuanRaw(repairedEntry.raw)
assert.equal(repairedPayload.data.player.money, 0, 'confirmed repair save should clamp player money')
assert.equal(repairedPayload.data.game.year, 1, 'confirmed repair save should clamp year')
assert.equal(repairedPayload.data.game.day, 28, 'confirmed repair save should clamp day')
assert.equal(repairedPayload.data.game.season, 'spring', 'confirmed repair save should normalize illegal season')
assert.equal(repairedPayload.data.inventory.items[0].quantity, 0, 'confirmed repair save should clamp inventory quantity')
assert.equal(repairedPayload.data.farm.plots[0].state, 'wasteland', 'confirmed repair save should normalize farm plot state')
assert.equal(repairedPayload.data.farm.plots[0].growthDays, 0, 'confirmed repair save should clamp farm growth days')
assert.doesNotThrow(
  () => prepareSlotEntryForSave('illegal_guard_user', 0, repairedEntry.raw, 2),
  'repaired save should pass the normal write guard'
)

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-save-corruption-guard] passed')
