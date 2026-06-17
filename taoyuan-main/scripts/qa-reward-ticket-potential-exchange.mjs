/* global clearTimeout, console, process, setTimeout */

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
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const tryResolveFile = candidate => {
  const variants = [candidate, `${candidate}.ts`, `${candidate}.js`, path.join(candidate, 'index.ts'), path.join(candidate, 'index.js')]
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
    if (specifier === '@/composables/useAudio' || specifier === './useAudio') return { url: 'qa:audio', shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const resolved = tryResolveFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
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
          const currentRoute = { value: { name: 'wallet', path: '/game/wallet' } }
          export default {
            currentRoute,
            push: async () => {},
            replace: async () => {},
            back: () => {},
            beforeEach: () => {},
            afterEach: () => {}
          }
        `,
        shortCircuit: true
      }
    }
    if (url === 'qa:audio') {
      return {
        format: 'module',
        source: `
          const noop = () => {}
          const asyncNoop = async () => {}
          const makeRef = value => ({ value })
          const sfxEnabled = makeRef(false)
          const bgmEnabled = makeRef(false)
          export const useAudio = () => ({
            sfxEnabled,
            bgmEnabled,
            toggleSfx: noop,
            toggleBgm: noop,
            startBgm: asyncNoop,
            stopBgm: noop,
            switchToSeasonalBgm: asyncNoop
          })
          export const sfxClick = noop
          export const sfxBuy = noop
          export const sfxCoin = noop
          export const sfxError = noop
          export const sfxLevelUp = noop
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8').replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
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
    hash: '#/game/wallet',
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

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const packageJson = JSON.parse(readSource('package.json'))
const economyTypesSource = readSource('src/types/economy.ts')
const rewardTicketsSource = readSource('src/data/rewardTickets.ts')
const walletStoreSource = readSource('src/stores/useWalletStore.ts')
const walletViewSource = readSource('src/views/game/WalletView.vue')
const potentialDataSource = readSource('src/data/potential.ts')
const potentialViewSource = readSource('src/views/game/PotentialView.vue')

const artisanNotesOfferMatch = rewardTicketsSource.match(/\{\s*id:\s*'research_artisan_notes_case'[\s\S]*?\n\s{2}\}/)
const artisanNotesOffer = artisanNotesOfferMatch?.[0] ?? ''

assert(
  packageJson.scripts?.['qa:reward-ticket-potential-exchange'] === 'node scripts/qa-reward-ticket-potential-exchange.mjs',
  'package.json should register qa:reward-ticket-potential-exchange.'
)
assert(
  economyTypesSource.includes("import type { PotentialResourceCost } from './potential'") &&
    economyTypesSource.includes('rewardPotentialResources?: PotentialResourceCost[]'),
  'RewardTicketExchangeOffer must support potential resource rewards through PotentialResourceCost.'
)
assert(artisanNotesOffer.length > 0, '研究券兑换必须包含 research_artisan_notes_case。')
assert(/ticketType:\s*'research'/.test(artisanNotesOffer), '百工札记兑换必须消耗研究券。')
assert(/label:\s*'匠作研修札匣'/.test(artisanNotesOffer), '百工札记兑换应使用玩家可读的匠作研修札匣名称。')
assert(/costTickets:\s*5/.test(artisanNotesOffer), '百工札记兑换成本必须保持为 5 张研究券。')
assert(/rewardItems:\s*\[\s*\]/.test(artisanNotesOffer), '百工札记兑换不得伪装成背包物品奖励。')
assert(
  artisanNotesOffer.includes("rewardPotentialResources: [{ resourceId: 'artisan_notes', amount: 1 }]"),
  '百工札记兑换必须奖励潜能资源 artisan_notes×1。'
)
assert(!/itemId:\s*'artisan_notes'/.test(artisanNotesOffer), 'artisan_notes 不得作为背包 itemId 发放。')
assert(
  /id:\s*'artisan_notes'[\s\S]*?label:\s*'百工札记'/.test(potentialDataSource),
  '潜能资源 artisan_notes 必须继续显示为百工札记。'
)
assert(
  walletStoreSource.includes("import { getPotentialResourceDef } from '@/data/potential'") &&
    walletStoreSource.includes("import { usePotentialStore } from './usePotentialStore'"),
  '钱包 store 必须读取潜能资源定义并写入潜能 store。'
)
assert(walletStoreSource.includes('potentialResourceSummary'), '钱包兑换列表必须生成潜能材料摘要。')
assert(walletStoreSource.includes('rewardContentSummary'), '钱包兑换列表必须合并背包、密匣和潜能材料摘要。')
assert(
  walletStoreSource.includes('potentialStore.addPotentialResource(reward.resourceId, reward.amount)'),
  '钱包兑换必须通过 potentialStore.addPotentialResource 发放百工札记。'
)
assert(
  walletStoreSource.includes("source: 'ticket_refund'") && walletStoreSource.includes('grantedPotentialResources.length === 0'),
  '潜能材料兑换失败时必须返还票券。'
)
assert(
  walletViewSource.includes('offer.rewardContentSummary') && walletViewSource.includes('offer.potentialResourceSummary'),
  '钱包页必须展示潜能材料兑换内容。'
)
assert(walletViewSource.includes('潜能材料：'), '钱包页必须明确标注百工札记为潜能材料。')
assert(
  potentialViewSource.includes('resource.landingText') &&
    potentialViewSource.includes('getResourceLandingText') &&
    potentialViewSource.includes('可参悟：') &&
    potentialViewSource.includes('可用于：'),
  '潜能页资源格必须提示百工札记等材料最近可投入的节点。'
)

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
const [{ useWalletStore }, { usePotentialStore }] = await Promise.all([
  import(pathToFileURL(path.join(srcRoot, 'stores/useWalletStore.ts')).href),
  import(pathToFileURL(path.join(srcRoot, 'stores/usePotentialStore.ts')).href)
])

setActivePinia(createPinia())
const walletStore = useWalletStore()
const potentialStore = usePotentialStore()
const craftNodeId = 'craft_processing_flow'
const initialCraftCosts = potentialStore.getNodeNextCost(craftNodeId)

for (const cost of initialCraftCosts) {
  if (cost.resourceId !== 'artisan_notes') potentialStore.addPotentialResource(cost.resourceId, cost.amount)
}

assert(
  potentialStore.getPotentialNodeUpgradeReason(craftNodeId).includes('百工札记不足'),
  '运行态样例应先证明百工札记是巧作节点的缺口。'
)

walletStore.addRewardTickets({ research: 5 }, { applyMultiplier: false, source: 'qa_reward_ticket_potential_exchange' })
const offerCard = walletStore.ticketExchangeOffers.find(offer => offer.id === 'research_artisan_notes_case')
assert(offerCard?.potentialResourceSummary === '百工札记×1', '钱包兑换卡运行态应展示潜能材料：百工札记×1。')
assert(offerCard?.rewardContentSummary?.includes('百工札记×1'), '钱包兑换卡运行态应把百工札记并入兑换内容摘要。')

const redeemResult = walletStore.redeemRewardTicketOffer('research_artisan_notes_case')
assert(redeemResult.success, `研究券兑换百工札记运行态应成功：${redeemResult.message}`)
assert(walletStore.getRewardTicketBalance('research') === 0, '兑换后研究券余额应扣到 0。')
assert(potentialStore.getPotentialResource('artisan_notes') === 1, '兑换后百工札记必须进入潜能资源余额。')
assert(potentialStore.canUpgradePotentialNode(craftNodeId), '补齐百工札记后巧作根节点必须可参悟。')

const beforeEffect = potentialStore.getPotentialEffectValue('potential_processing_speed')
const upgradeResult = potentialStore.upgradePotentialNode(craftNodeId)
assert(upgradeResult.success, `巧作根节点应可用兑换来的百工札记升阶：${upgradeResult.message}`)
assert(potentialStore.getPotentialResource('artisan_notes') === 0, '巧作升阶应消耗兑换得到的百工札记。')
assert(
  potentialStore.getPotentialEffectValue('potential_processing_speed') > beforeEffect,
  '巧作升阶后加工耗时潜能必须产生实际效果提升。'
)

if (errors.length > 0) {
  console.error('[qa-reward-ticket-potential-exchange] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-reward-ticket-potential-exchange] passed')
