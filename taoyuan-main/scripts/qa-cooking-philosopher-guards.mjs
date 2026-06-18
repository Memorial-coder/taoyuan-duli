/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const errors = []

const installBrowserShims = () => {
  if (!globalThis.window) globalThis.window = globalThis
  if (!globalThis.window.addEventListener) globalThis.window.addEventListener = () => {}
  if (!globalThis.window.removeEventListener) globalThis.window.removeEventListener = () => {}
  if (!globalThis.document) {
    globalThis.document = {
      addEventListener: () => {},
      removeEventListener: () => {},
      documentElement: {
        style: { setProperty: () => {} },
        setAttribute: () => {},
        removeAttribute: () => {}
      },
      createElement: () => ({
        getContext: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        play: async () => {},
        pause: () => {},
        style: {}
      }),
      body: { appendChild: () => {}, removeChild: () => {} }
    }
  }
  if (!globalThis.localStorage) {
    const storage = new Map()
    globalThis.localStorage = {
      getItem: key => storage.get(String(key)) ?? null,
      setItem: (key, value) => storage.set(String(key), String(value)),
      removeItem: key => storage.delete(String(key)),
      clear: () => storage.clear()
    }
  }
}

installBrowserShims()

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const near = (actual, expected) => Math.abs(actual - expected) < 1e-9

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
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
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
    if (url === 'qa:file-saver') {
      return {
        format: 'module',
        source: 'export const saveAs = () => {};',
        shortCircuit: true
      }
    }
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
      const outputText = transpiled.outputText.replaceAll(
        'import.meta.env',
        '({ DEV: false, PROD: true, MODE: "test", VITE_TAOYUAN_QA: "1" })'
      )
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const cookingStoreSource = readSource('src/stores/useCookingStore.ts')
const skillViewSource = readSource('src/views/game/SkillView.vue')
const perkSelectSource = readSource('src/components/game/PerkSelectDialog.vue')

assert(cookingStoreSource.includes('const PHILOSOPHER_FOOD_BUFF_MULTIPLIER = 1.25'), '哲学家料理增益强化倍率必须保持为受控的 25%。')
assert(cookingStoreSource.includes('const PHILOSOPHER_FOOD_BUFF_DURATION_DAYS = 2'), '哲学家料理增益持续时间必须保持为 2 天。')
assert(cookingStoreSource.includes('const enhanceCookingBuffForPhilosopher ='), '料理 store 必须集中处理哲学家料理增益强化。')
assert(cookingStoreSource.includes('activeBuffRemainingDays'), '料理 store 必须保存当前料理增益剩余天数。')
assert(cookingStoreSource.includes("buff.type === 'giftBonus'"), '哲学家强化送礼料理时必须只放大倍率超过 1 的增量。')
assert(!cookingStoreSource.includes("foragingSkill.perk20 !== 'philosopher'"), '哲学家不应再跳过料理日切清空。')
assert(
  /const dailyReset = \(\) => \{[\s\S]*activeBuffRemainingDays\.value > 1[\s\S]*activeBuffRemainingDays\.value -= 1[\s\S]*activeBuff\.value = null[\s\S]*activeBuffRemainingDays\.value = 0[\s\S]*activeElixir\.value = null[\s\S]*\}/.test(cookingStoreSource),
  '料理日切必须让哲学家增益先保留一天，再到期清空 activeBuff。'
)
assert(
  skillViewSource.includes("philosopher: '食物恢复效果+200%，料理增益强度+25%且持续2天'"),
  '技能页哲学家文案必须说明强化和持续 2 天。'
)
assert(
  perkSelectSource.includes("description: '食物恢复效果+200%，料理增益强度+25%且持续2天'"),
  '专精选择弹窗哲学家文案必须说明强化和持续 2 天。'
)

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useInventoryStore.ts')).href)
const cookingStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useCookingStore.ts')).href)
const skillStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useSkillStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    cookingStore: cookingStoreModule.useCookingStore(),
    skillStore: skillStoreModule.useSkillStore()
  }
}

{
  const { inventoryStore, cookingStore, skillStore } = freshStores()
  skillStore.getSkill('foraging').perk20 = 'philosopher'
  inventoryStore.items = [{ itemId: 'food_braised_carp', quantity: 1, quality: 'normal' }]

  const result = cookingStore.eat('braised_carp', 'normal')
  assert(result.success === true, '哲学家应能正常食用料理并获得当天增益。')
  assert(cookingStore.activeBuff?.type === 'fishing', '红烧鲤鱼应提供钓鱼料理增益。')
  assert(near(cookingStore.activeBuff?.value ?? 0, 1.25), '哲学家应把钓鱼技能料理增益从 +1 强化到 +1.25。')
  assert(cookingStore.activeBuff?.description.includes('哲学家：料理增益+25%'), '当前增益说明应提示哲学家强化。')
  assert(cookingStore.activeBuff?.description.includes('持续2天'), '当前增益说明应提示哲学家增益持续 2 天。')
  assert(cookingStore.activeBuffRemainingDays === 2, '哲学家料理增益应从 2 天剩余时间开始。')

  const saved = cookingStore.serialize()
  assert(saved.activeBuffRemainingDays === 2, '料理增益剩余天数必须写入存档。')

  const reloaded = freshStores()
  reloaded.cookingStore.deserialize(saved)
  assert(reloaded.cookingStore.activeBuffRemainingDays === 2, '读档后必须保留料理增益剩余天数。')
  assert(reloaded.cookingStore.activeBuff?.type === 'fishing', '读档后必须保留当前料理增益。')

  cookingStore.dailyReset()
  assert(cookingStore.activeBuff?.type === 'fishing', '哲学家料理增益第一次日切后应继续保留。')
  assert(cookingStore.activeBuffRemainingDays === 1, '哲学家料理增益第一次日切后剩余天数应变为 1。')

  cookingStore.dailyReset()
  assert(cookingStore.activeBuff === null, '哲学家料理增益第二次日切时必须清空。')
  assert(cookingStore.activeBuffRemainingDays === 0, '哲学家料理增益到期清空后剩余天数必须归零。')
}

{
  const { inventoryStore, cookingStore, skillStore } = freshStores()
  skillStore.getSkill('foraging').perk20 = 'philosopher'
  inventoryStore.items = [{ itemId: 'food_osmanthus_cake', quantity: 1, quality: 'normal' }]

  const result = cookingStore.eat('osmanthus_cake', 'normal')
  assert(result.success === true, '哲学家应能正常食用送礼增益料理。')
  assert(cookingStore.activeBuff?.type === 'giftBonus', '桂花糕应提供送礼料理增益。')
  assert(near(cookingStore.activeBuff?.value ?? 0, 2.25), '送礼料理增益应只放大超过 1 的倍率增量，x2 强化到 x2.25。')
}

if (errors.length > 0) {
  console.error(`qa-cooking-philosopher-guards failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-cooking-philosopher-guards passed')
