/* global console, process, setTimeout, clearTimeout */

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
      // keep trying
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
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
    if (url === 'qa:qmsg') {
      return {
        format: 'module',
        source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
        shortCircuit: true
      }
    }
    if (url === 'qa:router') {
      return {
        format: 'module',
        source: `
          const currentRoute = { value: { name: 'museum', path: '/game/museum' } }
          const router = {
            currentRoute,
            push: async () => {},
            replace: async () => {},
            back: () => {},
            beforeEach: () => {},
            afterEach: () => {}
          }
          export default router
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs
        .readFileSync(filePath, 'utf8')
        .replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
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
  const localStorage = {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  }
  const locationObj = {
    hash: '#/game/museum',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign: () => {},
    replace: () => {}
  }
  const documentObj = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: { style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} } },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const windowObj = {
    location: locationObj,
    history: { state: null, replaceState: () => {}, pushState: () => {} },
    localStorage,
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
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useInventoryStore.ts')).href)
const museumStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useMuseumStore.ts')).href)
const processingDataModule = await import(pathToFileURL(path.join(srcRoot, 'data', 'processing.ts')).href)

setActivePinia(createPinia())

const inventoryStore = inventoryStoreModule.useInventoryStore()
const museumStore = museumStoreModule.useMuseumStore()

inventoryStore.capacity = 1
inventoryStore.items = [{ itemId: 'ancient_seed', quantity: 999, quality: 'normal' }]

assert(inventoryStore.getItemCount('ancient_seed') === 999, '测试前应持有一组满栈远古种子。')
assert(museumStore.donateItem('ancient_seed') === true, '远古种子首次捐赠应成功。')
assert(museumStore.isDonated('ancient_seed') === true, '远古种子捐赠后应写入博物馆捐赠记录。')
assert(inventoryStore.getItemCount('ancient_seed') === 999, '远古种子捐赠后应即时返还 1 粒，不应减少持有数量。')
assert(museumStore.donateItem('ancient_seed') === false, '远古种子已捐赠后不应重复捐赠或重复领奖。')
assert(inventoryStore.getItemCount('ancient_seed') === 999, '重复点击捐赠不应重复返还远古种子。')

const ancientSeedRecipe = processingDataModule.getProcessingRecipeById('seed_from_ancient_fruit')
assert(!!ancientSeedRecipe, '应存在远古水果制远古种子的加工配方 seed_from_ancient_fruit。')
assert(ancientSeedRecipe?.machineType === 'seed_maker', '远古种子续种配方应由种子制造机处理。')
assert(ancientSeedRecipe?.inputItemId === 'ancient_fruit', '远古种子续种配方输入应为远古水果。')
assert(ancientSeedRecipe?.outputItemId === 'ancient_seed', '远古种子续种配方输出应为远古种子。')

if (errors.length > 0) {
  console.error('远古种子博物馆捐赠 QA 失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('远古种子博物馆捐赠 QA 通过：捐赠即时返还种子，并保留远古水果制种配方。')
