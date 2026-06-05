import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { stdout } from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const readSource = file => readFile(path.join(root, file), 'utf8')

const saveStore = await readSource('src/stores/useSaveStore.ts')
const mainMenu = await readSource('src/views/MainMenu.vue')

for (const code of [
  'decrypt_failed',
  'json_parse_failed',
  'migration_failed',
  'incompatible_schema',
  'apply_failed',
  'server_active_slot_failed',
  'runtime_restore_failed',
  'server_read_failed',
]) {
  assert(saveStore.includes(`'${code}'`), `missing load failure code: ${code}`)
}

assert(saveStore.includes('export interface SaveLoadErrorState'), 'load error state must be exported')
assert(saveStore.includes('const lastLoadError = ref<SaveLoadErrorState | null>(null)'), 'lastLoadError ref is missing')
assert(saveStore.includes('const lastLoadErrorMessage = computed'), 'lastLoadErrorMessage computed is missing')
assert(saveStore.includes('const parseSaveDataForLoad'), 'structured load parser is missing')
assert(saveStore.includes('setLoadError(parsed.code, slot, loadMode, parsed.detail)'), 'parse failures must set structured load error')
assert(saveStore.includes("setLoadError('server_active_slot_failed'"), 'server active slot failure must set structured load error')
assert(saveStore.includes("setLoadError('runtime_restore_failed'"), 'runtime restore failure must set structured load error')
assert(saveStore.includes('lastLoadError,'), 'lastLoadError must be returned by the store')
assert(saveStore.includes('lastLoadErrorMessage,'), 'lastLoadErrorMessage must be returned by the store')

assert(mainMenu.includes('saveStore.lastLoadErrorMessage'), 'main menu must read the load error message')
assert(mainMenu.includes("showFloat(message, 'danger')"), 'main menu must show load failure feedback')
assert(mainMenu.includes('addLog(message)'), 'main menu must log load failure feedback')

stdout.write('qa-save-load-feedback passed\n')
