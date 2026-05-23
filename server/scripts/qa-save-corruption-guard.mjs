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
  loadUserSaveSlots,
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

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-save-corruption-guard] passed')
