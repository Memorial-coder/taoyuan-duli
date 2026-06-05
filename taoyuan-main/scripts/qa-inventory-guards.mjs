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
      // Candidate path does not exist.
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
          const currentRoute = { value: { name: 'inventory', path: '/game/inventory' } }
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
  const locationObj = {
    hash: '#/game/inventory',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign: () => {},
    replace: () => {}
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
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)

const freshInventoryStore = () => {
  setActivePinia(createPinia())
  return inventoryStoreModule.useInventoryStore()
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'wood', quantity: 999, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 3, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 0, '主背包满且无同类可合并时，单格可移动数量应为 0。')
  assert(inventoryStore.getMovableTempItemCount() === 0, '主背包满且无同类可合并时，一键可移动数量应为 0。')
  assert(inventoryStore.canMoveFromTemp(0) === false, '主背包满且无同类可合并时，单格按钮应不可移动。')
  assert(inventoryStore.moveFromTemp(0) === false, '主背包满且无同类可合并时，单格取回应失败。')
  assert(inventoryStore.moveAllFromTemp() === 0, '主背包满且无同类可合并时，一键取回应返回 0 件。')
  assert(inventoryStore.tempItems[0]?.quantity === 3, '不可移动的临时背包物品数量不应变化。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'stone', quantity: 997, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 5, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 2, '主背包满但同类栈有余量时，应只预测可合并数量。')
  assert(inventoryStore.canMoveFromTemp(0) === true, '主背包满但同类栈有余量时，单格按钮应可用。')
  assert(inventoryStore.moveFromTemp(0) === false, '部分取回后仍有剩余时，单格取回应返回未完整移动。')
  assert(inventoryStore.items[0]?.quantity === 999, '部分取回应填满主背包同类栈。')
  assert(inventoryStore.tempItems[0]?.quantity === 3, '部分取回应保留临时背包剩余数量。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 2
  inventoryStore.items = [{ itemId: 'wood', quantity: 999, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 5, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 5, '主背包有空槽时，应预测完整取回。')
  assert(inventoryStore.moveFromTemp(0) === true, '主背包有空槽时，单格取回应完整成功。')
  assert(inventoryStore.tempItems.length === 0, '完整取回后临时背包格应移除。')
  assert(inventoryStore.items.some(item => item.itemId === 'stone' && item.quantity === 5), '完整取回后物品应进入主背包。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = []
  inventoryStore.tempItems = [
    { itemId: 'wood', quantity: 1, quality: 'normal' },
    { itemId: 'stone', quantity: 1000, quality: 'normal' }
  ]

  assert(inventoryStore.getMovableTempItemCount() === 999, '一键可移动数量应按实际倒序取回模拟，不能把单格预测直接相加。')
  assert(inventoryStore.moveAllFromTemp() === 999, '一键取回应返回真实移动件数。')
  assert(inventoryStore.items.length === 1 && inventoryStore.items[0]?.itemId === 'stone' && inventoryStore.items[0]?.quantity === 999, '一键取回应按实际顺序占用主背包空槽。')
  assert(inventoryStore.tempItems.length === 2 && inventoryStore.tempItems[1]?.quantity === 1, '一键取回后未能进入主背包的数量应留在临时背包。')
}

if (errors.length > 0) {
  console.error('Inventory guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Inventory guard passed.')
