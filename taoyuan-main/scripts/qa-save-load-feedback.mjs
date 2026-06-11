/* global clearTimeout, localStorage, setTimeout */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { stdout } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import CryptoJS from 'crypto-js'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const srcRoot = path.join(root, 'src')
const ENCRYPTION_KEY = 'taoyuanxiang_2024_secret'
const LOCAL_SAVE_SLOT_0 = 'taoyuanxiang_save_guest_0'

const readSource = file => readFile(path.join(root, file), 'utf8')

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
      // Candidate path does not exist.
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier === '@capacitor/core') return { url: 'qa:capacitor-core', shortCircuit: true }
    if (specifier === '@capacitor/filesystem') return { url: 'qa:capacitor-filesystem', shortCircuit: true }
    if (specifier === '@capacitor/share') return { url: 'qa:capacitor-share', shortCircuit: true }
    if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
    if (specifier === '@/composables/useAudio' || specifier === './useAudio') return { url: 'qa:audio', shortCircuit: true }
    if (specifier === '@/utils/serverSaveApi') return { url: 'qa:server-save-api', shortCircuit: true }
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
    if (url === 'qa:file-saver') {
      return {
        format: 'module',
        source: 'export const saveAs = () => {}',
        shortCircuit: true
      }
    }
    if (url === 'qa:qmsg') {
      return {
        format: 'module',
        source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
        shortCircuit: true
      }
    }
    if (url === 'qa:capacitor-core') {
      return {
        format: 'module',
        source: 'export const Capacitor = { isNativePlatform: () => false };',
        shortCircuit: true
      }
    }
    if (url === 'qa:capacitor-filesystem') {
      return {
        format: 'module',
        source: `
          export const Directory = { Cache: 'CACHE' };
          export const Encoding = { UTF8: 'utf8' };
          export const Filesystem = {
            writeFile: async () => ({}),
            getUri: async () => ({ uri: 'file://qa-save.tyx' })
          };
        `,
        shortCircuit: true
      }
    }
    if (url === 'qa:capacitor-share') {
      return {
        format: 'module',
        source: 'export const Share = { share: async () => ({}) };',
        shortCircuit: true
      }
    }
    if (url === 'qa:router') {
      return {
        format: 'module',
        source: `
          const currentRoute = { value: { name: 'main-menu', path: '/' } };
          const router = {
            currentRoute,
            push: async location => {
              currentRoute.value = { name: location?.name ?? currentRoute.value.name, path: '/game/mock' };
            },
            replace: async () => {},
            back: () => {},
            beforeEach: () => {},
            afterEach: () => {}
          };
          export default router;
        `,
        shortCircuit: true
      }
    }
    if (url === 'qa:audio') {
      return {
        format: 'module',
        source: `
          const noop = () => {};
          export const sfxClick = noop;
          export const sfxWater = noop;
          export const sfxPlant = noop;
          export const sfxHarvest = noop;
          export const sfxDig = noop;
          export const sfxBuy = noop;
          export const sfxCoin = noop;
          export const sfxLevelUp = noop;
          export const sfxAttack = noop;
          export const sfxHurt = noop;
          export const sfxEncounter = noop;
          export const sfxDefend = noop;
          export const sfxFlee = noop;
          export const sfxVictory = noop;
          export const sfxReel = noop;
          export const sfxFishCatch = noop;
          export const sfxLineBroken = noop;
          export const sfxMine = noop;
          export const sfxSleep = noop;
          export const sfxError = noop;
          export const sfxForage = noop;
          export const sfxGameStart = noop;
          export const sfxCountdownTick = noop;
          export const sfxCountdownFinal = noop;
          export const sfxGameAction = noop;
          export const sfxRewardClaim = noop;
          export const sfxMiniPerfect = noop;
          export const sfxMiniGood = noop;
          export const sfxMiniPoor = noop;
          export const sfxMiniFail = noop;
          export const sfxRankFirst = noop;
          export const sfxRankSecond = noop;
          export const sfxRankThird = noop;
          export const sfxRankLose = noop;
          export const sfxGameActionLight = noop;
          export const sfxFishBite = noop;
          export const sfxCastLine = noop;
          export const sfxPaddle = noop;
          export const sfxRaceFinish = noop;
          export const sfxRiddleReveal = noop;
          export const sfxRiddleWrong = noop;
          export const sfxTeaPour = noop;
          export const sfxTeaBell = noop;
          export const sfxItemSelect = noop;
          export const sfxJudging = noop;
          export const sfxArrowFly = noop;
          export const sfxPotClang = noop;
          export const sfxWindGust = noop;
          export const sfxKitePull = noop;
          export const sfxDoughStep = noop;
          export const sfxDumplingDone = noop;
          export const sfxFireworkLaunch = noop;
          export const sfxFireworkBoom = noop;
          export const sfxRouletteTick = noop;
          export const sfxRouletteSpin = noop;
          export const sfxRouletteStop = noop;
          export const sfxDiceTick = noop;
          export const sfxDiceRoll = noop;
          export const sfxDiceLand = noop;
          export const sfxCupTick = noop;
          export const sfxCupShuffle = noop;
          export const sfxCupReveal = noop;
          export const sfxCricketTick = noop;
          export const sfxCricketChirp = noop;
          export const sfxCricketClash = noop;
          export const sfxCardFlip = noop;
          export const sfxChipBet = noop;
          export const sfxFoldCards = noop;
          export const sfxGunshot = noop;
          export const sfxGunEmpty = noop;
          export const sfxCasinoWin = noop;
          export const sfxCasinoLose = noop;
          const makeRef = value => ({ value });
          const sfxEnabled = makeRef(true);
          const bgmEnabled = makeRef(true);
          export const useAudio = () => ({
            sfxEnabled,
            bgmEnabled,
            toggleSfx: noop,
            toggleBgm: noop,
            startBgm: noop,
            stopBgm: noop,
            startBattleBgm: noop,
            resumeNormalBgm: noop,
            switchToSeasonalBgm: noop,
            startFestivalBgm: noop,
            startMinigameBgm: noop,
            endFestivalBgm: noop,
            startHanhaiBgm: noop,
            endHanhaiBgm: noop
          });
        `,
        shortCircuit: true
      }
    }
    if (url === 'qa:server-save-api') {
      return {
        format: 'module',
        source: `
          const getState = () => globalThis.__QA_SERVER_SAVE_API_STATE__ ?? {
            rawBySlot: {},
            revisionBySlot: {},
            activeSlot: null,
            failActiveSlot: false,
            activeSlotFailureMessage: 'QA active slot failure'
          };
          export const fetchServerSlotEntries = async () => Array.from({ length: 3 }, (_, slot) => ({
            slot,
            raw: getState().rawBySlot?.[slot] ?? null,
            revision: getState().revisionBySlot?.[slot] ?? 0
          }));
          export const fetchServerSlotRaw = async slot => {
            const raw = getState().rawBySlot?.[slot] ?? null;
            if (!raw) return null;
            return { raw, revision: getState().revisionBySlot?.[slot] ?? 0 };
          };
          export const saveServerSlotRaw = async (slot, raw, baseRevision) => {
            const state = getState();
            const currentRevision = Math.max(0, Number(state.revisionBySlot?.[slot]) || 0);
            const normalizedBaseRevision = Math.max(0, Number(baseRevision) || 0);
            if (currentRevision !== normalizedBaseRevision) {
              return { stale: true, currentRevision, raw: state.rawBySlot?.[slot] ?? null };
            }
            state.rawBySlot = { ...(state.rawBySlot ?? {}), [slot]: raw };
            state.revisionBySlot = { ...(state.revisionBySlot ?? {}), [slot]: normalizedBaseRevision + 1 };
            return { stale: false, currentRevision: state.revisionBySlot[slot], raw };
          };
          export const setServerActiveSlot = async slot => {
            const state = getState();
            if (state.failActiveSlot) throw new Error(state.activeSlotFailureMessage || 'QA active slot failure');
            state.activeSlot = slot;
          };
          export const deleteServerSlotRaw = async slot => {
            const state = getState();
            const nextRawBySlot = { ...(state.rawBySlot ?? {}) };
            delete nextRawBySlot[slot];
            state.rawBySlot = nextRawBySlot;
          };
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      let source = fs.readFileSync(filePath, 'utf8').replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
      if (filePath.endsWith(path.join('src', 'stores', 'useSaveStore.ts'))) {
        source = source.replace(
          'const migrateSavePayload = (payload: Record<string, any>, _saveVersion: number): Record<string, any> => {',
          "const migrateSavePayload = (payload: Record<string, any>, _saveVersion: number): Record<string, any> => {\n  if ((globalThis as any).__QA_SAVE_LOAD_MIGRATION_FAULT__ && (payload as any).__qaMigrationFault) throw new Error('QA migration fault')"
        )
      }
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

const installBrowserShims = () => {
  globalThis.__QA_IMPORT_META_ENV__ = { DEV: true, PROD: false }
  const storage = new Map()
  const localStorageMock = {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  }
  const makeElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    cloneNode: () => makeElement(tag),
    firstChild: null,
    childNodes: [],
    innerHTML: '',
    content: { firstChild: null }
  })
  const documentObj = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: {
      style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} },
      setAttribute: () => {},
      removeAttribute: () => {}
    },
    body: makeElement('body'),
    createElement: tag => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    createTextNode: text => ({ nodeValue: String(text) }),
    createComment: text => ({ nodeValue: String(text) }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const locationObj = {
    hash: '#/',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    href: 'http://localhost:4013/#/',
    assign: () => {},
    replace: () => {}
  }
  const windowObj = {
    location: locationObj,
    history: { state: null, replaceState: () => {}, pushState: () => {}, back: () => {} },
    localStorage: localStorageMock,
    setTimeout,
    clearTimeout,
    addEventListener: () => {},
    removeEventListener: () => {},
    document: documentObj,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    })
  }
  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'self', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: locationObj, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: windowObj.history, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true, userAgent: 'qa-save-load-feedback' }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, user: { username: 'qa-save' }, csrf_token: 'qa-csrf' })
    }),
    configurable: true
  })
}

const encryptJson = value => CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString()

const decryptJson = raw => JSON.parse(CryptoJS.AES.decrypt(raw, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8))

const resetServerApiState = () => {
  globalThis.__QA_SERVER_SAVE_API_STATE__ = {
    rawBySlot: {},
    revisionBySlot: {},
    activeSlot: null,
    failActiveSlot: false,
    activeSlotFailureMessage: 'QA active slot failure'
  }
}

const expectLoadError = (saveStore, code, messagePart) => {
  assert.equal(saveStore.lastLoadError?.code, code, `expected ${code} load error`)
  assert.equal(typeof saveStore.lastLoadError?.occurredAt, 'string', `${code} must include occurredAt`)
  assert(saveStore.lastLoadErrorMessage.includes(messagePart), `${code} message should mention ${messagePart}`)
}

installBrowserShims()
resetServerApiState()

const { createPinia, setActivePinia } = await import('pinia')
const saveStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useSaveStore.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useGameStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/usePlayerStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  resetServerApiState()
  return {
    saveStore: saveStoreModule.useSaveStore(),
    gameStore: gameStoreModule.useGameStore(),
    playerStore: playerStoreModule.usePlayerStore()
  }
}

const makeValidRaw = async (money = 1200) => {
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setIdentity('验档', 'female')
  playerStore.setMoney(money)
  const saved = await saveStore.saveToSlot(0)
  assert.equal(saved, true, 'fixture save must succeed')
  const raw = localStorage.getItem(LOCAL_SAVE_SLOT_0) ?? localStorage.getItem('taoyuanxiang_save_qa-save_0')
  assert.equal(typeof raw, 'string', 'fixture raw must be stored')
  return raw
}

const saveStoreSource = await readSource('src/stores/useSaveStore.ts')
const mainMenuSource = await readSource('src/views/MainMenu.vue')
const saveManagerSource = await readSource('src/components/game/SaveManager.vue')

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
  assert(saveStoreSource.includes(`'${code}'`), `missing load failure code: ${code}`)
}

assert(saveStoreSource.includes('export interface SaveLoadErrorState'), 'load error state must be exported')
assert(saveStoreSource.includes('const lastLoadError = ref<SaveLoadErrorState | null>(null)'), 'lastLoadError ref is missing')
assert(saveStoreSource.includes('const lastLoadErrorMessage = computed'), 'lastLoadErrorMessage computed is missing')
assert(saveStoreSource.includes('const parseSaveDataForLoad'), 'structured load parser is missing')
assert(saveStoreSource.includes('setLoadError(parsed.code, slot, loadMode, parsed.detail)'), 'parse failures must set structured load error')
assert(saveStoreSource.includes("setLoadError('server_active_slot_failed'"), 'server active slot failure must set structured load error')
assert(saveStoreSource.includes("setLoadError('runtime_restore_failed'"), 'runtime restore failure must set structured load error')
assert(saveStoreSource.includes('lastLoadError,'), 'lastLoadError must be returned by the store')
assert(saveStoreSource.includes('lastLoadErrorMessage,'), 'lastLoadErrorMessage must be returned by the store')
assert(saveStoreSource.includes("'conflict'"), 'save store must expose a conflict save status')
assert(saveStoreSource.includes('export interface ServerSaveConflictState'), 'server save conflict state must be exported')
assert(saveStoreSource.includes('const serverSaveConflict = ref<ServerSaveConflictState | null>(null)'), 'server save conflict ref is missing')
assert(saveStoreSource.includes('resolveServerSaveConflict'), 'server save conflict resolver is missing')

assert(mainMenuSource.includes('saveStore.lastLoadErrorMessage'), 'main menu must read the load error message')
assert(mainMenuSource.includes("showFloat(message, 'danger')"), 'main menu must show load failure feedback')
assert(mainMenuSource.includes('addLog(message)'), 'main menu must log load failure feedback')
assert(mainMenuSource.includes('saveStore.lastSaveErrorMessage || saveStore.lastLoadErrorMessage'), 'main menu must show structured import failures before calling a save damaged')
assert(mainMenuSource.includes('main-menu-import-notice-panel'), 'main menu must keep import feedback visible on the home page')
assert(mainMenuSource.includes("setImportNotice({ tone: 'success'"), 'main menu must persist successful import feedback')
assert(mainMenuSource.includes("setImportNotice({\n              tone: saveStore.lastSaveResultStatus === 'conflict'"), 'main menu must persist conflict import feedback')
assert(mainMenuSource.includes('handleLoadImportedSlot'), 'main menu import success notice must offer a direct load action')
assert(mainMenuSource.includes('main-menu-server-save-conflict-panel'), 'main menu must render server import conflict panel')
assert(mainMenuSource.includes('main-menu-import-conflict-actions'), 'main menu import notice must expose conflict actions next to the import feedback')
assert(mainMenuSource.includes('main-menu-save-field-anomaly-modal'), 'main menu must render the save-field repair confirmation modal')
assert(mainMenuSource.includes('forceRepairServerSaveFieldAnomaly'), 'main menu must let players confirm repair and force-save field anomalies')
assert(mainMenuSource.includes('dismissServerSaveFieldAnomaly'), 'main menu must let players dismiss field anomaly repair')
assert(mainMenuSource.includes("handleResolveServerConflict('local')"), 'main menu must let players keep imported/local copy')
assert(mainMenuSource.includes("handleResolveServerConflict('remote')"), 'main menu must let players use server save')
assert(saveManagerSource.includes('server-save-conflict-panel'), 'save manager must render server conflict panel')
assert(saveManagerSource.includes("handleResolveServerConflict('local')"), 'save manager must let players keep current page')
assert(saveManagerSource.includes("handleResolveServerConflict('remote')"), 'save manager must let players use server save')
assert(saveManagerSource.includes('saveStore.lastSaveErrorMessage || saveStore.lastLoadErrorMessage'), 'save manager must show structured import failures before calling a save damaged')

{
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setMoney(777)
  localStorage.setItem(LOCAL_SAVE_SLOT_0, 'not-a-save')
  const loaded = await saveStore.loadFromSlot(0)
  assert.equal(loaded, false, 'invalid cipher must not load')
  expectLoadError(saveStore, 'decrypt_failed', '无法解密')
  assert.equal(playerStore.money, 777, 'invalid cipher must preserve current runtime state')
}

{
  const validRaw = await makeValidRaw(1500)
  const envelope = decryptJson(validRaw)
  envelope.data.__qaMigrationFault = true
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setMoney(888)
  globalThis.__QA_SAVE_LOAD_MIGRATION_FAULT__ = true
  try {
    localStorage.setItem(LOCAL_SAVE_SLOT_0, encryptJson(envelope))
    const loaded = await saveStore.loadFromSlot(0)
    assert.equal(loaded, false, 'migration fault must not load')
    expectLoadError(saveStore, 'migration_failed', '迁移失败')
    assert.equal(playerStore.money, 888, 'migration failure must preserve current runtime state')
  } finally {
    globalThis.__QA_SAVE_LOAD_MIGRATION_FAULT__ = false
  }
}

{
  const serverRaw = await makeValidRaw(2222)
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setMoney(999)
  saveStore.setStorageMode('server')
  globalThis.__QA_SERVER_SAVE_API_STATE__.rawBySlot = { 0: serverRaw }
  globalThis.__QA_SERVER_SAVE_API_STATE__.revisionBySlot = { 0: 7 }
  globalThis.__QA_SERVER_SAVE_API_STATE__.failActiveSlot = true
  globalThis.__QA_SERVER_SAVE_API_STATE__.activeSlotFailureMessage = 'active slot write failed'
  const loaded = await saveStore.loadFromSlot(0, { mode: 'server', allowPendingServerCopy: false })
  assert.equal(loaded, false, 'server active-slot failure must not complete load')
  expectLoadError(saveStore, 'server_active_slot_failed', '槽位切换失败')
  assert.equal(saveStore.lastLoadError?.detail, 'active slot write failed', 'active-slot detail should be preserved')
  assert.equal(playerStore.money, 999, 'server active-slot failure must roll back runtime store')
  assert.equal(saveStore.activeSlot, -1, 'server active-slot failure must restore active slot')
  assert.equal(saveStore.runtimeSessionSlot, -1, 'server active-slot failure must restore runtime session slot')
}

{
  const remoteRaw = await makeValidRaw(4444)
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setIdentity('本地页', 'female')
  playerStore.setMoney(3333)
  saveStore.setStorageMode('server')
  globalThis.__QA_SERVER_SAVE_API_STATE__.rawBySlot = { 0: remoteRaw }
  globalThis.__QA_SERVER_SAVE_API_STATE__.revisionBySlot = { 0: 2 }

  const saved = await saveStore.saveToSlot(0)
  assert.equal(saved, false, 'stale server revision must not silently overwrite remote save')
  assert.equal(saveStore.lastSaveResultStatus, 'conflict', 'stale server revision must expose conflict status')
  assert.equal(saveStore.serverSaveConflict?.slot, 0, 'conflict must identify slot')
  assert.equal(saveStore.serverSaveConflict?.localSummary.money, 3333, 'conflict must summarize current page copy')
  assert.equal(saveStore.serverSaveConflict?.remoteSummary.money, 4444, 'conflict must summarize remote copy')
  assert.deepEqual(saveStore.pendingServerSlots, [0], 'local copy must remain pending during conflict')

  const resolvedLocal = await saveStore.resolveServerSaveConflict('local')
  assert.equal(resolvedLocal, true, 'local conflict resolution should save current page')
  assert.equal(saveStore.serverSaveConflict, null, 'local resolution should clear conflict')
  assert.deepEqual(saveStore.pendingServerSlots, [], 'local resolution should clear pending copy')
  assert.equal(decryptJson(globalThis.__QA_SERVER_SAVE_API_STATE__.rawBySlot[0]).data.player.money, 3333, 'local resolution must overwrite remote only after explicit choice')
}

{
  const remoteRaw = await makeValidRaw(5555)
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  gameStore.startNewGame('standard')
  playerStore.setIdentity('本地页', 'female')
  playerStore.setMoney(6666)
  saveStore.setStorageMode('server')
  globalThis.__QA_SERVER_SAVE_API_STATE__.rawBySlot = { 0: remoteRaw }
  globalThis.__QA_SERVER_SAVE_API_STATE__.revisionBySlot = { 0: 4 }

  const saved = await saveStore.saveToSlot(0)
  assert.equal(saved, false, 'remote-choice fixture must create a conflict')
  const resolvedRemote = await saveStore.resolveServerSaveConflict('remote')
  assert.equal(resolvedRemote, true, 'remote conflict resolution should load server save')
  assert.equal(saveStore.serverSaveConflict, null, 'remote resolution should clear conflict')
  assert.deepEqual(saveStore.pendingServerSlots, [], 'remote resolution should discard pending local copy')
  assert.equal(playerStore.money, 5555, 'remote resolution must restore the server save data')
}

{
  const validRaw = await makeValidRaw(7777)
  localStorage.clear()
  const { saveStore } = freshStores()
  const imported = await saveStore.importSave(1, `\uFEFF${validRaw}\n`)
  assert.equal(imported, true, 'import should tolerate BOM and trailing whitespace around encrypted saves')
  assert.equal(typeof localStorage.getItem('taoyuanxiang_save_qa-save_1'), 'string', 'trimmed import should persist into target slot')
}

{
  const validRaw = await makeValidRaw(1919)
  const legacyEnvelope = decryptJson(validRaw)
  legacyEnvelope.meta = {
    ...(legacyEnvelope.meta ?? {}),
    saveVersion: 5,
    savedAt: '2026-05-23T05:22:14.405Z'
  }
  legacyEnvelope.savedAt = '2026-05-23T05:22:14.405Z'
  localStorage.clear()
  const { saveStore, gameStore, playerStore } = freshStores()
  const imported = await saveStore.importSave(1, encryptJson(legacyEnvelope))
  assert.equal(imported, true, 'v5 envelope saves should import without being reported as damaged')
  const loaded = await saveStore.loadFromSlot(1)
  assert.equal(loaded, true, 'v5 envelope saves should load after import')
  assert.equal(playerStore.money, 1919, 'v5 import/load should restore player money')
  assert.equal(Number.isInteger(gameStore.year), true, 'v5 import/load should restore game calendar')
}

{
  const remoteRaw = await makeValidRaw(8888)
  const importRaw = await makeValidRaw(9999)
  localStorage.clear()
  const { saveStore } = freshStores()
  saveStore.setStorageMode('server')
  globalThis.__QA_SERVER_SAVE_API_STATE__.rawBySlot = { 1: remoteRaw }
  globalThis.__QA_SERVER_SAVE_API_STATE__.revisionBySlot = { 1: 3 }
  const imported = await saveStore.importSave(1, importRaw)
  assert.equal(imported, false, 'server import with stale base revision should not silently overwrite remote save')
  assert.equal(saveStore.lastSaveResultStatus, 'conflict', 'server import conflict must expose conflict status')
  assert(saveStore.lastSaveErrorMessage.includes('云存档'), 'server import conflict should explain the cloud-save conflict')
  assert.equal(saveStore.serverSaveConflict?.localSummary.money, 9999, 'server import conflict must summarize imported save')
  assert.equal(saveStore.serverSaveConflict?.remoteSummary.money, 8888, 'server import conflict must summarize remote save')
}

stdout.write('qa-save-load-feedback passed\n')
