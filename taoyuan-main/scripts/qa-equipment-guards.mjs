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
        source: 'export const saveAs = () => {}; export default { saveAs };',
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
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
const forgeAffixesModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/forgeAffixes.ts')).href)
const inventoryStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useInventoryStore.ts'), 'utf8')
const inventoryViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/InventoryView.vue'), 'utf8')
const miningViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/MiningView.vue'), 'utf8')
const processingViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/ProcessingView.vue'), 'utf8')
const forgeAffixesSource = fs.readFileSync(path.join(projectRoot, 'src/data/forgeAffixes.ts'), 'utf8')
const itemTypesSource = fs.readFileSync(path.join(projectRoot, 'src/types/item.ts'), 'utf8')
const ringTypesSource = fs.readFileSync(path.join(projectRoot, 'src/types/ring.ts'), 'utf8')
const equipmentTypesSource = fs.readFileSync(path.join(projectRoot, 'src/types/equipment.ts'), 'utf8')

const freshInventoryStore = () => {
  setActivePinia(createPinia())
  return inventoryStoreModule.useInventoryStore()
}

assert(inventoryViewSource.includes('护符 / 饰物'), '背包装备页应显示护符 / 饰物栏。')
assert(inventoryViewSource.includes('战斗达到20级后开放饰品栏'), '背包装备页饰品栏未解锁时应提示战斗20级解锁。')
assert(inventoryViewSource.includes('handleToggleTrinket'), '背包装备页饰品栏应接入饰品装备/卸下操作。')
assert(/data-testid="inventory-equipment-preset-grid"[\s\S]{0,180}grid-cols-2/.test(inventoryViewSource), 'Inventory equipment preset candidates should use a two-column grid.')
assert(!inventoryViewSource.includes('getPresetEquipmentSummaries'), 'Inventory preset cards should not render inline equipment summaries.')
assert(inventoryViewSource.includes('openPresetActionId') && inventoryViewSource.includes('openPresetActions') && inventoryViewSource.includes('closePresetActions'), 'Inventory preset action dialog state should be wired locally.')
assert(!inventoryViewSource.includes('data-testid="inventory-preset-actions-menu"'), 'Inventory preset actions should not render as an inline dropdown inside the scroll grid.')
assert(/<Transition name="dialog-pop">[\s\S]*data-testid="inventory-preset-actions-dialog"/.test(inventoryViewSource), 'Inventory preset action dialog should use the shared pop transition.')
assert(inventoryViewSource.includes('data-testid="inventory-preset-actions-name-input"') && inventoryViewSource.includes('handleSavePresetName'), 'Inventory preset action dialog should edit and save the preset name directly.')
assert(/data-testid="inventory-preset-actions-dialog"[\s\S]*保存名称[\s\S]*保存装备[\s\S]*删除方案/.test(inventoryViewSource), 'Inventory preset save-name/save-equipment/delete actions should live in the action dialog.')
assert(/data-testid="mining-equipment-preset-grid"[\s\S]{0,180}grid-cols-2/.test(miningViewSource), 'Mining equipment preset candidates should use a two-column grid.')
assert(inventoryStoreSource.includes('doesCurrentEquipmentMatchPreset') && inventoryStoreSource.includes('isEquipmentPresetActive'), 'Equipment presets should expose a real current-equipment match guard.')
assert(inventoryViewSource.includes('isPresetActive(preset.id)') && inventoryViewSource.includes('activeEquipmentPresetName'), 'Inventory preset UI should use real equipment matches instead of stale activePresetId flags.')
assert(miningViewSource.includes('inventoryStore.isEquipmentPresetActive(preset.id)') && miningViewSource.includes('inventoryStore.activeEquipmentPresetName'), 'Mining preset UI should use real equipment matches instead of stale activePresetId flags.')
assert(ringTypesSource.includes('enchantmentId?: string | null'), 'OwnedRing should retain optional legacy equipment enchantment ids.')
assert(ringTypesSource.includes('affixes?: ForgeAffixRoll[]'), 'OwnedRing should persist rolled affixes.')
assert((equipmentTypesSource.match(/enchantmentId\?: string \| null/g) ?? []).length >= 2, 'OwnedHat and OwnedShoe should retain optional legacy equipment enchantment ids.')
assert((equipmentTypesSource.match(/affixes\?: ForgeAffixRoll\[\]/g) ?? []).length >= 2, 'OwnedHat and OwnedShoe should persist rolled affixes.')
assert(itemTypesSource.includes('export interface Tool') && itemTypesSource.includes('affixes?: ForgeAffixRoll[]'), 'Tool and weapon save shape should persist rolled affixes.')
for (const field of [
  'weaponAffixSignature',
  'ringSlot1AffixSignature',
  'ringSlot2AffixSignature',
  'hatAffixSignature',
  'shoeAffixSignature'
]) {
  assert(inventoryStoreSource.includes(field), `Equipment presets should persist ${field}.`)
}
for (const marker of [
  'sanitizeForgeAffixes',
  'migrateLegacyEnchantmentToAffixes',
  'getForgeAffixSignature',
  'getLegacyAffixSignature',
  'normalizePresetAffixSignature',
  'getEntryAffixSignature',
  'setWeaponAffixes',
  'setToolAffixes',
  'setRingAffixes',
  'setHatAffixes',
  'setShoeAffixes',
  'addMatchingEquipmentEffects',
  'getForgeAffixEquipmentEffects',
  'getForgeAffixEffectValue'
]) {
  assert(inventoryStoreSource.includes(marker), `Inventory store should wire forge affix marker ${marker}.`)
}
for (const id of [
  'ring_focus',
  'ring_fortune',
  'ring_treasure',
  'ring_battle',
  'ring_vampiric',
  'ring_luck',
  'hat_guard',
  'hat_herbal',
  'hat_clear_mind',
  'hat_resolve',
  'hat_growth',
  'hat_scholar',
  'shoe_swift',
  'shoe_fleet',
  'shoe_surefoot',
  'shoe_breath',
  'shoe_mine_step',
  'shoe_cavern_grip'
]) {
  assert(forgeAffixesSource.includes(id), `Forge affix data should include ${id}.`)
}
assert(processingViewSource.includes('processing-enchanting-forge-modal'), 'Processing view should expose the enchanting forge modal.')
assert(!processingViewSource.includes('processing-equipment-enchant-panel'), 'Processing view should remove the old direct equipment enchant panel.')
assert(!processingViewSource.includes('processing-weapon-enchant-panel'), 'Processing view should remove the old direct weapon enchant panel.')
assert(!processingViewSource.includes('processing-tool-enchant-panel'), 'Processing view should remove the old direct tool enchant panel.')

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedRings = [{ defId: 'miners_ring' }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet' }]
  inventoryStore.ownedShoes = [{ defId: 'leather_boots' }]
  inventoryStore.equippedRingSlot1 = 0
  inventoryStore.equippedHatIndex = 0
  inventoryStore.equippedShoeIndex = 0

  const baseTravelSpeed = inventoryStore.getEquipmentBonus('travel_speed')
  const shoeSwift = forgeAffixesModule.createForgeAffixRoll('shoe_swift', 0.14)
  const ringFocus = forgeAffixesModule.createForgeAffixRoll('ring_focus', 0.1)
  const hatGuard = forgeAffixesModule.createForgeAffixRoll('hat_guard', 0.08)
  const wrongSlot = forgeAffixesModule.createForgeAffixRoll('ring_focus', 0.1)
  assert(shoeSwift && ringFocus && hatGuard && wrongSlot, 'QA forge affix setup should create equipment rolls.')
  const shoeResult = inventoryStore.setShoeAffixes(0, [shoeSwift])
  assert(shoeResult.success === true, 'Shoes should accept matching shoe affixes.')
  assert(inventoryStore.ownedShoes[0].enchantmentId === null, 'Writing new shoe affixes should clear legacy enchantmentId.')
  assert(Math.abs(inventoryStore.getEquipmentBonus('travel_speed') - (baseTravelSpeed + 0.14)) < 0.0001, 'shoe_swift should apply its rolled travel speed value.')
  assert(inventoryStore.setShoeAffixes(0, [wrongSlot]).success === false, 'Shoes must reject ring-only affixes.')
  assert(inventoryStore.setRingAffixes(0, [ringFocus]).success === true, 'Rings should accept matching ring affixes.')
  assert(inventoryStore.setHatAffixes(0, [hatGuard]).success === true, 'Hats should accept matching hat affixes.')
  assert(inventoryStore.getEquipmentBonus('exp_bonus') >= 0.1, 'ring_focus should contribute its rolled exp bonus.')
  assert(inventoryStore.getEquipmentBonus('defense_bonus') >= 0.08, 'hat_guard should contribute its rolled defense bonus.')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedShoes = [{ defId: 'leather_boots', enchantmentId: null }]
  inventoryStore.equippedShoeIndex = 0
  const legacyResult = inventoryStore.setShoeEnchantment(0, 'shoe_swift')
  assert(legacyResult.success === true, 'Legacy shoe enchantment writes should remain accepted.')
  assert(inventoryStore.ownedShoes[0].enchantmentId === null, 'Legacy shoe enchantment writes should migrate away from enchantmentId.')
  assert(inventoryStore.ownedShoes[0].affixes?.[0]?.id === 'shoe_swift', 'Legacy shoe enchantment writes should migrate to a single matching affix.')
  assert(inventoryStore.getEquipmentBonus('travel_speed') > 0, 'Migrated legacy shoe affixes should affect equipment bonuses.')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedWeapons = [{ defId: 'wooden_stick', enchantmentId: null }]
  inventoryStore.equippedWeaponIndex = 0
  const supremeShoe = forgeAffixesModule.createForgeAffixRoll('shoe_swift', 0.14)
  const normalShoe = forgeAffixesModule.createForgeAffixRoll('shoe_swift', 0.05)
  assert(supremeShoe && normalShoe, 'QA setup should create exact shoe affix rolls.')
  inventoryStore.ownedShoes = [
    { defId: 'leather_boots', enchantmentId: null, affixes: [supremeShoe] },
    { defId: 'leather_boots', enchantmentId: null, affixes: [normalShoe] }
  ]
  inventoryStore.equippedShoeIndex = 0
  inventoryStore.createEquipmentPreset('qa-enchanted-shoe')
  const preset = inventoryStore.equipmentPresets[inventoryStore.equipmentPresets.length - 1]
  inventoryStore.saveCurrentToPreset(preset.id)
  assert(preset.shoeEnchantmentId === null, 'Equipment presets should stop saving new shoe enchantment ids.')
  assert(preset.shoeAffixSignature === forgeAffixesModule.getForgeAffixSignature([supremeShoe]), 'Equipment presets should save exact shoe affix signatures.')

  assert(inventoryStore.equipShoe(1), 'QA setup should switch to a same-def shoe with a different roll.')
  assert(inventoryStore.isEquipmentPresetActive(preset.id) === false, 'A preset should not match a same-def shoe with a different affix value or quality.')

  const applyResult = inventoryStore.applyEquipmentPreset(preset.id)
  assert(applyResult.success === true, 'Applying an enchanted shoe preset should succeed.')
  assert(inventoryStore.equippedShoeIndex === 0, 'Applying a preset should restore the same-def shoe with the saved affix signature.')
  assert(inventoryStore.isEquipmentPresetActive(preset.id) === true, 'A restored enchanted shoe preset should be active only after exact affix signature match.')
}

{
  const inventoryStore = freshInventoryStore()
  const save = inventoryStore.serialize()
  inventoryStore.deserialize({
    ...save,
    ownedWeapons: [{ defId: 'wooden_stick', enchantmentId: 'sharp' }],
    equippedWeaponIndex: 0,
    equipmentPresets: [
      {
        id: 'legacy-affix-preset',
        name: 'legacy affix preset',
        weaponDefId: 'wooden_stick',
        weaponEnchantmentId: 'sharp',
        ringSlot1DefId: null,
        ringSlot1EnchantmentId: null,
        ringSlot2DefId: null,
        ringSlot2EnchantmentId: null,
        hatDefId: null,
        hatEnchantmentId: null,
        shoeDefId: 'leather_boots',
        shoeEnchantmentId: 'shoe_swift',
        trinketDefId: null
      }
    ]
  })
  assert(inventoryStore.ownedWeapons[0].enchantmentId === null, 'Legacy weapon enchantmentId should migrate out of the owned weapon save shape.')
  assert(inventoryStore.ownedWeapons[0].affixes?.[0]?.id === 'sharp', 'Legacy weapon enchantmentId should migrate to a matching weapon affix.')
  const preset = inventoryStore.equipmentPresets.find(entry => entry.id === 'legacy-affix-preset')
  assert(preset?.weaponEnchantmentId === null, 'Legacy preset weaponEnchantmentId should migrate away from the active preset shape.')
  assert(preset?.weaponAffixSignature === forgeAffixesModule.getLegacyAffixSignature('weapon', 'sharp'), 'Legacy preset weapon enchantment should migrate to a weapon affix signature.')
  assert(preset?.shoeEnchantmentId === null, 'Legacy preset shoeEnchantmentId should migrate away from the active preset shape.')
  assert(preset?.shoeAffixSignature === forgeAffixesModule.getLegacyAffixSignature('shoe', 'shoe_swift'), 'Legacy preset shoe enchantment should migrate to a shoe affix signature.')
}

{
  const inventoryStore = freshInventoryStore()
  const sharp = forgeAffixesModule.createForgeAffixRoll('sharp', 6)
  assert(sharp, 'QA setup should create a sharp weapon affix.')
  inventoryStore.ownedWeapons = [{ defId: 'wooden_stick', enchantmentId: null, affixes: [sharp] }]
  const serialized = inventoryStore.serialize()
  serialized.ownedWeapons[0].affixes[0].value = 2
  assert(inventoryStore.ownedWeapons[0].affixes?.[0]?.value === 6, 'Serializing inventory should deep-clone weapon affixes.')
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
  assert(inventoryStore.activePresetId === null, 'Missing-equipment preset application must not keep a stale active marker.')
  assert(inventoryStore.isEquipmentPresetActive('qa-missing-preset') === false, 'Missing-equipment preset must not be treated as active.')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.ownedWeapons = [
    { defId: 'wooden_stick', enchantmentId: null },
    { defId: 'copper_sword', enchantmentId: null }
  ]
  inventoryStore.equippedWeaponIndex = 1
  inventoryStore.createEquipmentPreset('qa-combat')
  const preset = inventoryStore.equipmentPresets[inventoryStore.equipmentPresets.length - 1]
  inventoryStore.saveCurrentToPreset(preset.id)

  assert(inventoryStore.isEquipmentPresetActive(preset.id) === true, 'A preset saved from current equipment should be considered active.')
  assert(inventoryStore.activeEquipmentPresetName === 'qa-combat', 'The active preset display name should come from the real current equipment match.')

  assert(inventoryStore.equipWeapon(0), 'QA setup should switch away from the saved preset weapon.')
  assert(inventoryStore.isEquipmentPresetActive(preset.id) === false, 'Changing equipment should make the saved preset inactive.')
  assert(inventoryStore.activePresetId === null, 'Changing equipment should clear the stale active preset marker.')

  const applyResult = inventoryStore.applyEquipmentPreset(preset.id)
  assert(applyResult.success === true, 'Applying a complete preset should succeed.')
  assert(inventoryStore.getEquippedWeapon().defId === 'copper_sword', 'Applying a complete preset should switch the current weapon.')
  assert(inventoryStore.isEquipmentPresetActive(preset.id) === true, 'Applying a complete preset should mark only real matching equipment as active.')
  assert(inventoryStore.activePresetId === preset.id, 'A fully applied preset may keep its active marker.')
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
  inventoryStore.ownedRings = [{ defId: 'fortune_ring' }]
  inventoryStore.ownedHats = [{ defId: 'phoenix_crown' }]
  inventoryStore.ownedShoes = [{ defId: 'phoenix_boots' }]
  inventoryStore.equippedRingSlot1 = 0
  inventoryStore.equippedHatIndex = 0
  inventoryStore.equippedShoeIndex = 0

  const phoenixCatalog = inventoryStore.equipmentSetCatalog.find(set => set.id === 'phoenix_set')
  const phoenixSet = inventoryStore.activeSets.find(set => set.id === 'phoenix_set')
  assert(Math.abs(inventoryStore.getEquipmentBonus('exp_bonus') - 0.18) < 0.0001, 'Phoenix full set should only keep item exp bonuses, not a set exp bonus.')
  assert(inventoryStore.getEquipmentBonus('luck') >= 0.27, 'Phoenix full set should keep its set luck bonus.')
  assert(!phoenixCatalog?.bonuses.some(bonus => bonus.description.includes('经验')), 'Phoenix set catalog should not advertise an exp set bonus.')
  assert(!phoenixSet?.bonuses.some(bonus => bonus.description.includes('经验')), 'Phoenix active set should not display an exp set bonus.')
}

{
  setActivePinia(createPinia())
  const playerStore = playerStoreModule.usePlayerStore()
  playerStore.markMasteryUnlocked('mastery_combat')
  playerStore.markPrizeProgress('qa-market-talisman')
  const inventoryStore = inventoryStoreModule.useInventoryStore()

  assert(inventoryStore.unlockedTrinkets.some(trinket => trinket.id === 'trinket_market_talisman'), '市场护符应在战斗精通和奖券进度后解锁。')
  assert(inventoryStore.equipTrinket('trinket_market_talisman'), '已解锁的市场护符应可装备。')
  assert(inventoryStore.getEquipmentBonus('shop_discount') >= 0.05, '已装备护符应计入商店折扣装备加成。')
  assert(inventoryStore.getRingEffectValue('sell_price_bonus') >= 0.08, '已装备护符应计入售价装备加成。')

  inventoryStore.createEquipmentPreset('qa-trinket-preset')
  const preset = inventoryStore.equipmentPresets[inventoryStore.equipmentPresets.length - 1]
  inventoryStore.saveCurrentToPreset(preset.id)
  assert(preset.trinketDefId === 'trinket_market_talisman', '装备方案保存时应记录当前护符。')
  assert(inventoryStore.unequipTrinket(), 'QA setup should remove equipped trinket before applying preset.')
  const applyResult = inventoryStore.applyEquipmentPreset(preset.id)
  assert(applyResult.success === true, '带护符的装备方案应可正常应用。')
  assert(inventoryStore.equippedTrinketId === 'trinket_market_talisman', '装备方案应用时应恢复保存的护符。')
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
  const save = inventoryStore.serialize()
  inventoryStore.deserialize({
    ...save,
    ownedWeapons: [
      { defId: 'wooden_stick', enchantmentId: null },
      { defId: 'copper_sword', enchantmentId: null }
    ],
    equippedWeaponIndex: 0,
    equipmentPresets: [
      {
        id: 'stale-combat',
        name: 'stale combat',
        weaponDefId: 'copper_sword',
        weaponEnchantmentId: null,
        ringSlot1DefId: null,
        ringSlot2DefId: null,
        hatDefId: null,
        shoeDefId: null,
        trinketDefId: null
      }
    ],
    activePresetId: 'stale-combat'
  })

  assert(inventoryStore.activePresetId === null, 'Deserializing a stale active preset marker should clear it when equipment does not match.')
  assert(inventoryStore.isEquipmentPresetActive('stale-combat') === false, 'A deserialized stale preset marker must not make the preset active.')
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
  assert(inventoryStore.activePresetId === null, 'A partially applied preset with missing equipment must not keep a stale active marker.')
  assert(inventoryStore.isEquipmentPresetActive(preset.id) === false, 'A partially applied preset with missing equipment must not be treated as active.')
}

{
  const inventoryStore = freshInventoryStore()
  const sharp = forgeAffixesModule.createForgeAffixRoll('sharp', 6)
  const ringFocus = forgeAffixesModule.createForgeAffixRoll('ring_focus', 0.1)
  const hatGuard = forgeAffixesModule.createForgeAffixRoll('hat_guard', 0.08)
  const shoeSwift = forgeAffixesModule.createForgeAffixRoll('shoe_swift', 0.14)
  assert(sharp && ringFocus && hatGuard && shoeSwift, 'QA setup should create locked equipment affixes.')
  inventoryStore.ownedWeapons = [
    { defId: 'wooden_stick', enchantmentId: null },
    { defId: 'copper_sword', enchantmentId: null, affixes: sharp ? [sharp] : [], locked: true }
  ]
  inventoryStore.equippedWeaponIndex = 0
  inventoryStore.ownedRings = [{ defId: 'miners_ring', affixes: ringFocus ? [ringFocus] : [], locked: true }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet', affixes: hatGuard ? [hatGuard] : [], locked: true }]
  inventoryStore.ownedShoes = [{ defId: 'miner_boots', affixes: shoeSwift ? [shoeSwift] : [], locked: true }]

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
  assert(inventoryStore.ownedWeapons[1]?.affixes?.[0]?.id === 'sharp', '锁定武器卖出失败时不得丢失词条。')
  assert(inventoryStore.ownedRings[0]?.affixes?.[0]?.id === 'ring_focus', '锁定戒指卖出失败时不得丢失词条。')
  assert(inventoryStore.ownedHats[0]?.affixes?.[0]?.id === 'hat_guard', '锁定帽子卖出失败时不得丢失词条。')
  assert(inventoryStore.ownedShoes[0]?.affixes?.[0]?.id === 'shoe_swift', '锁定鞋子卖出失败时不得丢失词条。')

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
  const sharp = forgeAffixesModule.createForgeAffixRoll('sharp', 6)
  const ringFocus = forgeAffixesModule.createForgeAffixRoll('ring_focus', 0.1)
  const hatGuard = forgeAffixesModule.createForgeAffixRoll('hat_guard', 0.08)
  const shoeSwift = forgeAffixesModule.createForgeAffixRoll('shoe_swift', 0.14)
  assert(sharp && ringFocus && hatGuard && shoeSwift, 'QA setup should create serialized equipment affixes.')
  inventoryStore.ownedWeapons = [{ defId: 'wooden_stick', enchantmentId: null, affixes: sharp ? [sharp] : [], locked: true }]
  inventoryStore.ownedRings = [{ defId: 'miners_ring', affixes: ringFocus ? [ringFocus] : [], locked: true }]
  inventoryStore.ownedHats = [{ defId: 'miner_helmet', affixes: hatGuard ? [hatGuard] : [], locked: true }]
  inventoryStore.ownedShoes = [{ defId: 'miner_boots', affixes: shoeSwift ? [shoeSwift] : [], locked: true }]
  const save = inventoryStore.serialize()

  const restoredStore = freshInventoryStore()
  restoredStore.deserialize(save)
  assert(restoredStore.ownedWeapons[0]?.locked === true, '武器锁定状态应随存档保留。')
  assert(restoredStore.ownedRings[0]?.locked === true, '戒指锁定状态应随存档保留。')
  assert(restoredStore.ownedHats[0]?.locked === true, '帽子锁定状态应随存档保留。')
  assert(restoredStore.ownedShoes[0]?.locked === true, '鞋子锁定状态应随存档保留。')
  assert(restoredStore.ownedWeapons[0]?.affixes?.[0]?.id === 'sharp', '武器词条应随存档保留。')
  assert(restoredStore.ownedRings[0]?.affixes?.[0]?.id === 'ring_focus', '戒指词条应随存档保留。')
  assert(restoredStore.ownedHats[0]?.affixes?.[0]?.id === 'hat_guard', '帽子词条应随存档保留。')
  assert(restoredStore.ownedShoes[0]?.affixes?.[0]?.id === 'shoe_swift', '鞋子词条应随存档保留。')
}

if (errors.length > 0) {
  console.error('Equipment guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Equipment guard passed.')
