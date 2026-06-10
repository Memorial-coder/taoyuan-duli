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
  inventoryStore.ownedWeapons = [
    { defId: 'wooden_stick', enchantmentId: null },
    { defId: 'copper_sword', enchantmentId: null }
  ]
  inventoryStore.equippedWeaponIndex = 1
  inventoryStore.ownedRings = [{ defId: 'miners_ring' }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet' }]
  inventoryStore.ownedShoes = [{ defId: 'miner_boots' }]
  inventoryStore.equippedRingSlot1 = 0
  inventoryStore.equippedHatIndex = 0
  inventoryStore.equippedShoeIndex = 0
  assert(inventoryStore.getEquipmentBonus('mining_stamina') > 0, '测试前矿工套应提供采矿体力加成。')
  assert(inventoryStore.activeSets.some(set => set.id === 'miner_set'), '测试前矿工套装奖励应激活。')
  const minerCatalog = inventoryStore.equipmentSetCatalog.find(set => set.id === 'miner_set')
  assert(minerCatalog?.ownedCount === 3 && minerCatalog?.equippedCount === 3, '套装目录应显示矿工套已拥有并已装备。')
  assert(minerCatalog?.pieces.every(piece => piece.owned), '套装目录应列出已拥有的矿工套组成件。')

  inventoryStore.equipmentPresets.push({
    id: 'qa-missing-preset',
    name: '缺失装备方案',
    weaponDefId: 'deleted_weapon',
    weaponEnchantmentId: null,
    ringSlot1DefId: 'deleted_ring',
    ringSlot2DefId: null,
    hatDefId: 'deleted_hat',
    shoeDefId: 'deleted_shoe',
    trinketDefId: 'deleted_trinket'
  })

  const result = inventoryStore.applyEquipmentPreset('qa-missing-preset')
  assert(result.success === true, '缺失装备方案仍应应用并返回可读提示。')
  assert(result.message.includes('武器') && result.message.includes('戒指1') && result.message.includes('帽子') && result.message.includes('鞋子'), '缺失装备方案应列出缺失槽位。')
  assert(inventoryStore.getEquippedWeapon().defId === 'wooden_stick', '方案目标武器缺失时应回退到木棍。')
  assert(inventoryStore.equippedRingSlot1 === -1, '方案目标戒指缺失时应清空戒指槽1。')
  assert(inventoryStore.equippedHatIndex === -1, '方案目标帽子缺失时应清空帽子槽。')
  assert(inventoryStore.equippedShoeIndex === -1, '方案目标鞋子缺失时应清空鞋子槽。')
  assert(inventoryStore.getEquipmentBonus('mining_stamina') === 0, '缺失方案不得保留旧矿工套属性。')
  assert(!inventoryStore.activeSets.some(set => set.id === 'miner_set'), '缺失方案不得保留旧矿工套装奖励。')
}

{
  const inventoryStore = freshInventoryStore()
  const minerCatalog = inventoryStore.equipmentSetCatalog.find(set => set.id === 'miner_set')
  assert(minerCatalog, '套装目录应在未获得装备前显示矿工套。')
  assert(minerCatalog?.ownedCount === 0 && minerCatalog?.equippedCount === 0, '未获得装备前套装目录应显示0件拥有/装备。')
  assert(minerCatalog?.bonuses.some(bonus => bonus.count === 2 && bonus.description.includes('矿石加成') && bonus.active === false), '未激活套装仍应展示奖励档位。')
  assert(inventoryStore.activeSets.length === 0, '套装预览不应改变激活套装列表语义。')
}

{
  const inventoryStore = freshInventoryStore()
  const save = inventoryStore.serialize()
  inventoryStore.deserialize({
    ...save,
    ownedWeapons: [
      { defId: 'missing_weapon', enchantmentId: 'ghost_enchant' },
      { defId: 'copper_sword', enchantmentId: 'ghost_enchant' }
    ],
    equippedWeaponIndex: 1,
    ownedRings: [
      { defId: 'missing_ring' },
      { defId: 'miners_ring' },
      { defId: 'miners_ring' }
    ],
    equippedRingSlot1: 0,
    equippedRingSlot2: 1,
    ownedHats: [
      { defId: 'missing_hat' },
      { defId: 'miner_helmet' }
    ],
    equippedHatIndex: 1,
    ownedShoes: [{ defId: 'missing_shoe' }],
    equippedShoeIndex: 0,
    equippedTrinketId: 'missing_trinket',
    equipmentPresets: [],
    activePresetId: 'deleted-preset'
  })

  assert(inventoryStore.ownedWeapons.length === 1 && inventoryStore.ownedWeapons[0].defId === 'copper_sword', '读档应过滤无效武器定义。')
  assert(inventoryStore.ownedWeapons[0].enchantmentId === null, '读档应清空无效武器附魔。')
  assert(inventoryStore.equippedWeaponIndex === 0, '读档应把武器索引重映射到有效武器。')
  assert(inventoryStore.getWeaponAttack() > 5, '有效武器读档后攻击不应静默回退为木棍默认值。')
  assert(inventoryStore.ownedRings.length === 2 && inventoryStore.ownedRings.every(ring => ring.defId === 'miners_ring'), '读档应过滤无效戒指定义并保留有效戒指。')
  assert(inventoryStore.equippedRingSlot1 === -1, '读档应清空指向无效戒指的槽位。')
  assert(inventoryStore.equippedRingSlot2 === 0, '读档应重映射仍有效的戒指槽位。')
  assert(inventoryStore.ownedHats.length === 1 && inventoryStore.equippedHatIndex === 0, '读档应过滤无效帽子并重映射有效帽子索引。')
  assert(inventoryStore.ownedShoes.length === 0 && inventoryStore.equippedShoeIndex === -1, '读档应过滤无效鞋子并清空鞋子槽。')
  assert(inventoryStore.equippedTrinketId === null, '读档应清空无效饰物。')
  assert(inventoryStore.activePresetId === null, '读档应清空不存在的激活装备方案。')
  assert(inventoryStore.equipmentMigrationLogs.length > 0, '读档装备归一化应记录迁移日志。')
}

{
  const inventoryStore = freshInventoryStore()
  const save = inventoryStore.serialize()
  inventoryStore.deserialize({
    ...save,
    ownedWeapons: [],
    equippedWeaponIndex: 3
  })
  assert(inventoryStore.ownedWeapons.length === 1 && inventoryStore.ownedWeapons[0].defId === 'wooden_stick', '空武器列表读档应回退到木棍。')
  assert(inventoryStore.equippedWeaponIndex === 0, '空武器列表读档后武器索引应有效。')
  assert(inventoryStore.getWeaponAttack() === 5, '空武器列表回退后攻击应使用明确的木棍定义。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedWeapons = [
    { defId: 'wooden_stick', enchantmentId: null },
    { defId: 'copper_sword', enchantmentId: null }
  ]
  inventoryStore.equippedWeaponIndex = 0
  inventoryStore.createEquipmentPreset('qa-loadout-a')
  const preset = inventoryStore.equipmentPresets[inventoryStore.equipmentPresets.length - 1]
  inventoryStore.saveCurrentToPreset(preset.id)

  assert(inventoryStore.equipWeapon(1), 'QA setup should switch to loadout B weapon.')
  const sellResult = inventoryStore.sellWeapon(0)
  assert(sellResult.success === true, 'QA setup should sell the weapon saved in loadout A.')
  assert(
    inventoryStore.ownedWeapons.length === 1 && inventoryStore.ownedWeapons[0].defId === 'copper_sword',
    'QA setup should only keep loadout B weapon after selling A weapon.'
  )

  const applyResult = inventoryStore.applyEquipmentPreset(preset.id)
  assert(applyResult.success === true, 'Applying a preset with a sold weapon should return a readable result.')
  assert(inventoryStore.ownedWeapons.length === 1, 'Applying a preset with a sold weapon must not create a replacement weapon.')
  assert(!inventoryStore.ownedWeapons.some(weapon => weapon.defId === 'wooden_stick'), 'Sold wooden stick must not reappear after applying the old preset.')
  assert(inventoryStore.getEquippedWeapon().defId === 'copper_sword', 'Missing preset weapon should fall back to an existing weapon.')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedWeapons = [
    { defId: 'wooden_stick', enchantmentId: null },
    { defId: 'copper_sword', enchantmentId: null, locked: true }
  ]
  inventoryStore.equippedWeaponIndex = 0
  inventoryStore.ownedRings = [{ defId: 'miners_ring', locked: true }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet', locked: true }]
  inventoryStore.ownedShoes = [{ defId: 'miner_boots', locked: true }]

  const lockedWeaponSell = inventoryStore.sellWeapon(1)
  const lockedRingSell = inventoryStore.sellRing(0)
  const lockedHatSell = inventoryStore.sellHat(0)
  const lockedShoeSell = inventoryStore.sellShoe(0)
  assert(lockedWeaponSell.success === false && lockedWeaponSell.message.includes('锁定'), '锁定武器不得卖出。')
  assert(lockedRingSell.success === false && lockedRingSell.message.includes('锁定'), '锁定戒指不得卖出。')
  assert(lockedHatSell.success === false && lockedHatSell.message.includes('锁定'), '锁定帽子不得卖出。')
  assert(lockedShoeSell.success === false && lockedShoeSell.message.includes('锁定'), '锁定鞋子不得卖出。')
  assert(inventoryStore.ownedWeapons.length === 2, '锁定武器卖出失败时不得从列表移除。')
  assert(inventoryStore.ownedRings.length === 1, '锁定戒指卖出失败时不得从列表移除。')
  assert(inventoryStore.ownedHats.length === 1, '锁定帽子卖出失败时不得从列表移除。')
  assert(inventoryStore.ownedShoes.length === 1, '锁定鞋子卖出失败时不得从列表移除。')

  assert(inventoryStore.toggleEquipmentLock('weapon', 1), '武器锁定开关应返回成功。')
  assert(inventoryStore.toggleEquipmentLock('ring', 0), '戒指锁定开关应返回成功。')
  assert(inventoryStore.toggleEquipmentLock('hat', 0), '帽子锁定开关应返回成功。')
  assert(inventoryStore.toggleEquipmentLock('shoe', 0), '鞋子锁定开关应返回成功。')
  assert(inventoryStore.sellWeapon(1).success === true, '武器解锁后应允许卖出。')
  assert(inventoryStore.sellRing(0).success === true, '戒指解锁后应允许卖出。')
  assert(inventoryStore.sellHat(0).success === true, '帽子解锁后应允许卖出。')
  assert(inventoryStore.sellShoe(0).success === true, '鞋子解锁后应允许卖出。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedWeapons = [{ defId: 'wooden_stick', enchantmentId: null, locked: true }]
  inventoryStore.ownedRings = [{ defId: 'miners_ring', locked: true }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet', locked: true }]
  inventoryStore.ownedShoes = [{ defId: 'miner_boots', locked: true }]
  const save = inventoryStore.serialize()

  const restoredStore = freshInventoryStore()
  restoredStore.deserialize(save)
  assert(restoredStore.ownedWeapons[0]?.locked === true, '武器锁定状态应随存档保留。')
  assert(restoredStore.ownedRings[0]?.locked === true, '戒指锁定状态应随存档保留。')
  assert(restoredStore.ownedHats[0]?.locked === true, '帽子锁定状态应随存档保留。')
  assert(restoredStore.ownedShoes[0]?.locked === true, '鞋子锁定状态应随存档保留。')
}

if (errors.length > 0) {
  console.error('Equipment guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Equipment guard passed.')
