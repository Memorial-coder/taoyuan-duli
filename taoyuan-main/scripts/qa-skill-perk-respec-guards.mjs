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

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

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
      if (!resolved) throw new Error(`Unable to resolve module: ${specifier}`)
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
          const currentRoute = { value: { name: 'skills', path: '/game/skills' } }
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
  const makeElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    dataset: {},
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  })
  const documentObj = {
    body: makeElement('body'),
    documentElement: makeElement('html'),
    createElement: makeElement,
    createElementNS: (_namespace, tag) => makeElement(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null
  }
  const windowObj = {
    document: documentObj,
    localStorage,
    navigator: { sendBeacon: () => true },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame: callback => setTimeout(callback, 0),
    cancelAnimationFrame: clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  }
  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: windowObj.navigator, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const skillStoreSource = readSource('src/stores/useSkillStore.ts')
const skillTypesSource = readSource('src/types/skill.ts')
const skillViewSource = readSource('src/views/game/SkillView.vue')
const dialogsSource = readSource('src/composables/useDialogs.ts')

assert(skillTypesSource.includes('export type SkillPerkLevel = 5 | 10 | 15 | 20'), 'SkillPerkLevel must be a shared type for respec UI and store.')
assert(skillTypesSource.includes('perkRespecUsedSeasonKeys: string[]'), 'SkillState must persist seasonal perk respec usage.')
assert(skillStoreSource.includes('PERK_RESPEC_COST_BY_LEVEL'), 'Skill store must define explicit perk respec costs.')
assert(skillStoreSource.includes('5: 12000') && skillStoreSource.includes('10: 18000') && skillStoreSource.includes('15: 28000') && skillStoreSource.includes('20: 40000'), 'Perk respec costs must stay at the approved non-trivial values.')
assert(skillStoreSource.includes('clearSkillPerksFromLevel'), 'Skill store must clear the selected perk level and downstream levels.')
assert(skillStoreSource.includes('recordSinkSpend(preview.costMoney, \'service\')'), 'Perk respec spending must be recorded as a service sink.')
assert(skillStoreSource.includes('normalizePerkRespecState(s)'), 'Deserialize must normalize perk respec state for old or malformed saves.')
assert(skillViewSource.includes('openPerkRespec(skill.type, 5)') && skillViewSource.includes('openPerkRespec(skill.type, 20)'), 'Skill page must expose respec buttons on chosen perk rows.')
assert(skillViewSource.includes('respecPreview.costMoney') && skillViewSource.includes('respecAffectedLevelLabel'), 'Skill page confirm panel must preview cost and affected levels.')
assert(skillViewSource.includes('requestPerkSelection(request.skillType, result.nextPendingLevel)'), 'Successful respec must reopen the normal perk selection flow.')
assert(dialogsSource.includes('export const requestPerkSelection'), 'Dialog module must expose an explicit perk selection request helper.')
assert(dialogsSource.includes("addLog('") && dialogsSource.includes('_registerPerkChecker(checkAllPerks)'), 'Successful perk selection must keep using addLog so downstream empty perk tiers are checked.')

const { createPinia, setActivePinia } = await import('pinia')
const skillStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useSkillStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/usePlayerStore.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useGameStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    gameStore: gameStoreModule.useGameStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    skillStore: skillStoreModule.useSkillStore()
  }
}

{
  const { playerStore, skillStore } = freshStores()
  playerStore.setMoney(200000)
  const mining = skillStore.getSkill('mining')
  mining.level = 20
  mining.exp = 155000
  assert(skillStore.setPerk5('mining', 'geologist'), 'QA setup should choose mining Lv5.')
  assert(skillStore.setPerk10('mining', 'excavator'), 'QA setup should choose mining Lv10.')
  assert(skillStore.setPerk15('mining', 'deep_excavator'), 'QA setup should choose mining Lv15.')
  assert(skillStore.setPerk20('mining', 'abyss_miner'), 'QA setup should choose mining Lv20.')

  const preview = skillStore.getSkillPerkRespecPreview('mining', 10)
  assert(preview.canRespec, 'Lv10 mining respec should be available before use.')
  assert(preview.costMoney === 86000, 'Lv10 mining respec should charge Lv10+Lv15+Lv20 costs.')
  assert(preview.affectedLevels.join(',') === '10,15,20', 'Lv10 respec should affect only Lv10 and downstream levels.')

  const beforeMoney = playerStore.money
  const result = skillStore.respecPerks('mining', 10)
  assert(result.success, 'Lv10 mining respec should succeed with enough money.')
  assert(playerStore.money === beforeMoney - 86000, 'Successful respec should spend the previewed money.')
  assert(mining.perk5 === 'geologist', 'Lv10 respec must preserve upstream Lv5 perk.')
  assert(mining.perk10 === null && mining.perk15 === null && mining.perk20 === null, 'Lv10 respec must clear Lv10/Lv15/Lv20 perks.')
  assert(mining.perkRespecUsedSeasonKeys.includes('y1-spring'), 'Successful respec must mark the current season.')
  assert(!skillStore.getSkillPerkRespecPreview('mining', 5).canRespec, 'The same skill cannot be respeced twice in one season.')
}

{
  const { playerStore, skillStore } = freshStores()
  playerStore.setMoney(17000)
  const fishing = skillStore.getSkill('fishing')
  fishing.level = 10
  fishing.exp = 15000
  assert(skillStore.setPerk5('fishing', 'fisher'), 'QA setup should choose fishing Lv5.')
  assert(skillStore.setPerk10('fishing', 'angler'), 'QA setup should choose fishing Lv10.')
  const result = skillStore.respecPerks('fishing', 10)
  assert(!result.success, 'Respec should fail when money is below the Lv10 cost.')
  assert(fishing.perk10 === 'angler', 'Failed respec must not clear the chosen perk.')
  assert(playerStore.money === 17000, 'Failed respec must not spend money.')
}

{
  const { gameStore, playerStore, skillStore } = freshStores()
  playerStore.setMoney(250000)
  const combat = skillStore.getSkill('combat')
  combat.level = 20
  combat.exp = 155000
  assert(skillStore.setPerk5('combat', 'defender'), 'QA setup should choose combat Lv5.')
  assert(skillStore.setPerk10('combat', 'tank'), 'QA setup should choose combat Lv10.')
  assert(skillStore.setPerk15('combat', 'iron_fortress'), 'QA setup should choose combat Lv15.')
  assert(skillStore.setPerk20('combat', 'indestructible'), 'QA setup should choose combat Lv20.')
  const result = skillStore.respecPerks('combat', 5)
  assert(result.success && result.costMoney === 98000, 'Lv5 full-chain respec should charge all selected perk tiers.')
  gameStore.season = 'summer'
  assert(skillStore.setPerk5('combat', 'defender'), 'Combat Lv5 can be reselected after respec.')
  assert(skillStore.getSkillPerkRespecPreview('combat', 5).canRespec, 'The same skill should be respecable again in a new season.')
}

if (errors.length > 0) {
  console.error(`qa-skill-perk-respec-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-skill-perk-respec-guards passed')
