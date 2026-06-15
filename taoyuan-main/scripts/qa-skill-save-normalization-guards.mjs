/* global console, process, setTimeout, clearTimeout */

import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { registerHooks } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const moduleDataUrl = source => `data:text/javascript,${encodeURIComponent(source)}`

const skillStoreSource = readSource('src/stores/useSkillStore.ts')
const skillTypesSource = readSource('src/types/skill.ts')

assert(skillStoreSource.includes('const skillMigrationLogs = ref<string[]>([])'), '技能读档必须保留迁移日志。')
assert(skillStoreSource.includes('const normalizeSkillProgress = (skill: SkillState) =>'), '必须集中归一化技能等级和经验。')
assert(skillStoreSource.includes('const normalizeSkillMasteryState = (skill: SkillState) =>'), '必须集中归一化技能精研节点状态。')
assert(skillStoreSource.includes('const normalizeSkillMasteryPoolState = (rawPool?: Partial<SkillMasteryPoolState> | null): SkillMasteryPoolState'), '必须集中归一化通用精研池状态。')
assert(skillStoreSource.includes('const LEGACY_SKILL_MASTERY_EXP_PER_POINT = 5000'), '旧版后20级精研阈值必须保留给旧档迁移。')
assert(skillStoreSource.includes('const SKILL_MASTERY_EXP_PER_POINT = 60000'), '通用精研池点数兑换阈值必须稳定为 60000。')
assert(skillStoreSource.includes('const getLegacySkillMasteryTotalExp = (skill: SkillState, normalizedNodeIds: readonly SkillMasteryNodeId[]) =>'), '旧档每技能精研点必须先折算为总经验再迁移到通用精研池。')
assert(skillStoreSource.includes('const setSkillMasteryPoolFromTotalExp = (totalExp: number, spentPoints = 0) =>'), '通用精研池必须能按总经验和已花费点数重建。')
assert(skillStoreSource.includes('const clearSkillMasteryCarryover = (skill: SkillState) =>'), '旧字段迁移完成后必须清理每技能精研残留字段。')
assert(skillStoreSource.includes('skill.masteryExp += overflowExp'), '满级溢出经验必须转入待迁移精研经验，不能直接丢弃。')
assert(skillStoreSource.includes('unlockSkillMasteryNode'), 'store 必须暴露精研节点解锁入口。')
assert(skillStoreSource.includes('canUnlockSkillMasteryNode'), 'store 必须暴露精研节点解锁校验。')
assert(skillStoreSource.includes('skillMigrationLogs.value = []'), 'deserialize() 开始时必须清空本次迁移日志。')
assert(skillStoreSource.includes('normalizeSkillProgress(s)'), 'deserialize() 必须归一化每个技能的 level/exp。')
assert(skillStoreSource.includes('normalizeSkillMasteryState(s)'), 'deserialize() 必须归一化每个技能的精研状态。')
assert(skillStoreSource.includes('normalizePerkRespecState(s)'), 'deserialize() 必须归一化每个技能的专精重修季节记录。')
assert(skillStoreSource.includes('normalizePerks(s)'), 'deserialize() 必须归一化每个技能的专精链。')
assert(skillStoreSource.includes('setSkillMasteryPoolFromTotalExp(legacyTotalExp, spentPoints)'), '缺少通用精研池的旧档必须按旧总经验和已花费节点点数重建。')
assert(skillStoreSource.includes('addSkillMasteryPoolTotalExp(carryoverTotalExp)'), '已有通用精研池的存档必须合并旧技能字段残留经验。')
assert(skillStoreSource.includes('clearSkillMasteryCarryover(s)'), 'deserialize() 结束前必须清理每技能精研旧字段，避免下次重复迁移。')
assert(skillStoreSource.includes('移除 ${invalidSkillCount} 条非法技能类型记录。'), 'deserialize() 必须移除非法技能类型并记录日志。')
assert(skillStoreSource.includes('存档存在重复条目，已保留第一条。'), 'deserialize() 必须处理重复技能条目并记录日志。')
assert(skillStoreSource.includes('skills.value = uniqueSkills'), 'deserialize() 最终必须只写入唯一的 5 个技能。')
assert(skillStoreSource.includes('masteryPool,'), 'store 必须暴露 masteryPool，便于验证和诊断。')
assert(skillStoreSource.includes('skillMigrationLogs,'), 'store 必须暴露 skillMigrationLogs，便于验证和诊断。')
assert(skillTypesSource.includes('export interface SkillMasteryPoolState'), '技能存档类型必须包含通用精研池。')
assert(skillStoreSource.includes('masteryPool?: Partial<SkillMasteryPoolState> | null'), '技能存档反序列化类型必须兼容缺失或部分通用精研池。')

if (errors.length === 0) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '@/styles/tokens.css') {
        return {
          shortCircuit: true,
          url: moduleDataUrl('export default {}')
        }
      }

      if (specifier === 'qmsg') {
        return {
          shortCircuit: true,
          url: moduleDataUrl('const noop = () => {}; export default { config: noop, info: noop, error: noop, success: noop, warning: noop, closeAll: noop }')
        }
      }

      if (specifier === '@/router') {
        return {
          shortCircuit: true,
          url: moduleDataUrl('export const router = {}; export default router')
        }
      }

      if (specifier.startsWith('@/')) {
        const candidate = path.join(projectRoot, 'src', specifier.slice(2))
        if (!path.extname(candidate)) {
          for (const ext of ['.ts', '.js']) {
            if (fs.existsSync(candidate + ext)) {
              return {
                shortCircuit: true,
                url: pathToFileURL(candidate + ext).href
              }
            }
          }

          for (const ext of ['.ts', '.js']) {
            const indexPath = path.join(candidate, `index${ext}`)
            if (fs.existsSync(indexPath)) {
              return {
                shortCircuit: true,
                url: pathToFileURL(indexPath).href
              }
            }
          }
        }

        return {
          shortCircuit: true,
          url: pathToFileURL(candidate).href
        }
      }

      if (specifier.startsWith('.')) {
        const baseDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : projectRoot
        const candidate = path.resolve(baseDir, specifier)

        if (!path.extname(candidate)) {
          for (const ext of ['.ts', '.js']) {
            if (fs.existsSync(candidate + ext)) {
              return {
                shortCircuit: true,
                url: pathToFileURL(candidate + ext).href
              }
            }
          }

          for (const ext of ['.ts', '.js']) {
            const indexPath = path.join(candidate, `index${ext}`)
            if (fs.existsSync(indexPath)) {
              return {
                shortCircuit: true,
                url: pathToFileURL(indexPath).href
              }
            }
          }
        }
      }

      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url.endsWith('.ts')) {
        const filename = fileURLToPath(url)
        const source = fs.readFileSync(filename, 'utf8')
        const transpiled = ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            moduleResolution: ts.ModuleResolutionKind.NodeNext,
            importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
            verbatimModuleSyntax: false
          },
          fileName: filename
        })

        return {
          format: 'module',
          shortCircuit: true,
          source: transpiled.outputText
        }
      }

      return nextLoad(url, context)
    }
  })

  const installBrowserShims = () => {
    const makeStorage = () => {
      const store = new Map()
      return {
        get length() {
          return store.size
        },
        clear() {
          store.clear()
        },
        getItem(key) {
          return store.has(String(key)) ? store.get(String(key)) : null
        },
        key(index) {
          return Array.from(store.keys())[index] ?? null
        },
        removeItem(key) {
          store.delete(String(key))
        },
        setItem(key, value) {
          store.set(String(key), String(value))
        }
      }
    }

    const localStorage = makeStorage()
    const sessionStorage = makeStorage()
    const location = {
      assign() {},
      hash: '',
      host: 'localhost',
      hostname: 'localhost',
      href: 'http://localhost/',
      origin: 'http://localhost',
      pathname: '/',
      port: '',
      protocol: 'http:',
      reload() {},
      replace() {},
      search: ''
    }

    const listeners = new Map()
    const addEventListener = (type, listener) => {
      const key = String(type)
      const existing = listeners.get(key) ?? []
      existing.push(listener)
      listeners.set(key, existing)
    }
    const removeEventListener = (type, listener) => {
      const key = String(type)
      const existing = listeners.get(key) ?? []
      listeners.set(key, existing.filter(item => item !== listener))
    }

    const createElement = tagName => ({
      appendChild(child) {
        child.parentNode = this
        return child
      },
      children: [],
      classList: { add() {}, remove() {}, toggle() {} },
      cloneNode() {
        return createElement(tagName)
      },
      firstChild: null,
      getAttribute() {
        return null
      },
      innerHTML: '',
      insertBefore(child) {
        child.parentNode = this
        return child
      },
      nodeName: String(tagName).toUpperCase(),
      parentNode: null,
      removeAttribute() {},
      removeChild(child) {
        child.parentNode = null
        return child
      },
      setAttribute() {},
      style: {},
      tagName: String(tagName).toUpperCase()
    })
    const documentObj = {
      addEventListener,
      body: createElement('body'),
      createElement,
      createElementNS: (_namespace, tagName) => createElement(tagName),
      documentElement: createElement('html'),
      querySelector: () => null,
      removeEventListener
    }

    globalThis.window = {
      addEventListener,
      clearTimeout,
      dispatchEvent(event) {
        for (const listener of listeners.get(String(event?.type)) ?? []) listener(event)
        return true
      },
      document: documentObj,
      innerHeight: 720,
      innerWidth: 1280,
      localStorage,
      location,
      matchMedia: () => ({
        addEventListener() {},
        addListener() {},
        dispatchEvent: () => false,
        matches: false,
        media: '',
        onchange: null,
        removeEventListener() {},
        removeListener() {}
      }),
      navigator: { language: 'zh-CN', onLine: true, userAgent: 'node' },
      removeEventListener,
      scrollTo() {},
      sessionStorage,
      setTimeout
    }
    Object.defineProperty(globalThis, 'document', { value: globalThis.window.document, configurable: true })
    Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
    Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorage, configurable: true })
    Object.defineProperty(globalThis, 'location', { value: location, configurable: true })
    Object.defineProperty(globalThis, 'navigator', { value: globalThis.window.navigator, configurable: true })
    Object.defineProperty(globalThis, 'addEventListener', { value: addEventListener, configurable: true })
    Object.defineProperty(globalThis, 'removeEventListener', { value: removeEventListener, configurable: true })
  }

  installBrowserShims()

  const [{ createPinia, setActivePinia }, { useSkillStore }] = await Promise.all([
    import('pinia'),
    import(pathToFileURL(path.join(projectRoot, 'src/stores/useSkillStore.ts')).href)
  ])

  const freshSkillStore = () => {
    setActivePinia(createPinia())
    return useSkillStore()
  }

  const getSkill = (skillStore, type) => skillStore.skills.find(skill => skill.type === type)
  const hasLog = (skillStore, text) => skillStore.skillMigrationLogs.some(log => log.includes(text))
  const assertClearedCarryover = (skill, label) => {
    assert(skill.masteryExpPerPoint === 60000, `${label}：迁移后每技能精研阈值必须更新为通用阈值。`)
    assert(skill.masteryExp === 0, `${label}：迁移后每技能残留精研经验必须清空。`)
    assert(skill.masteryPoints === 0, `${label}：迁移后每技能残留精研点必须清空。`)
  }

  const normalizedStore = freshSkillStore()
  normalizedStore.deserialize({
    skills: [
      { type: 'farming', exp: -50, level: -3, perk5: 'harvester', perk10: 'artisan', masteryExp: 2000, masteryPoints: 4, unlockedMasteryNodeIds: ['farming_batch_irrigation'] },
      {
        type: 'mining',
        exp: 999999,
        level: 99,
        perk5: 'fighter',
        perk10: 'warrior',
        perk15: 'sword_saint',
        perk20: 'war_god',
        masteryExp: 1,
        masteryPoints: 2,
        unlockedMasteryNodeIds: ['mining_floor_intel', 'combat_boss_pressure', 'mining_floor_intel', 'unknown_node']
      },
      { type: 'combat', exp: 10000, level: 4, perk5: 'defender', perk10: 'acrobat' },
      { type: 'fishing', exp: 0, level: 10, perk5: 'fisher', perk10: 'angler' },
      { type: 'fishing', exp: 155000, level: 20, perk5: 'trapper' },
      { type: 'alchemy', exp: 100, level: 1, perk5: 'harvester' }
    ]
  })

  assert(normalizedStore.skills.length === 5, '模型用例：归一化后必须只保留 5 个技能。')
  assert(normalizedStore.masteryPool.expPerPoint === 60000, '模型用例：旧档迁移后通用精研池阈值必须为 60000。')
  assert(normalizedStore.masteryPool.points === 13 && normalizedStore.masteryPool.exp === 20000, '模型用例：满级溢出经验必须按通用 60000 阈值迁移到精研池，并扣除已解锁节点点数。')
  assert(hasLog(normalizedStore, '移除 1 条非法技能类型记录。'), '模型用例：非法技能类型必须被移除并记录日志。')
  assert(hasLog(normalizedStore, '存档存在重复条目，已保留第一条。'), '模型用例：重复技能条目必须记录日志。')

  const farming = getSkill(normalizedStore, 'farming')
  assert(farming.level === 0 && farming.exp === 0, '模型用例：负等级和负经验必须归零。')
  assert(farming.perk5 === null && farming.perk10 === null, '模型用例：等级不足的专精必须清空。')
  assert(farming.unlockedMasteryNodeIds.length === 0, '模型用例：未满级技能的精研节点必须清空。')
  assertClearedCarryover(farming, '模型用例：未满级技能')

  const mining = getSkill(normalizedStore, 'mining')
  assert(mining.level === 20 && mining.exp === 155000, '模型用例：超过 20 级后技能经验必须停在满级边界。')
  assert(mining.unlockedMasteryNodeIds.length === 1 && mining.unlockedMasteryNodeIds[0] === 'mining_floor_intel', '模型用例：非法、跨技能和重复精研节点必须移除。')
  assert(mining.perk5 === null && mining.perk10 === null, '模型用例：跨技能非法专精链必须清空。')
  assertClearedCarryover(mining, '模型用例：满级技能')

  const combat = getSkill(normalizedStore, 'combat')
  assert(combat.level === 9 && combat.exp === 10000, '模型用例：经验可推导出的等级必须补齐。')
  assert(combat.perk5 === 'defender' && combat.perk10 === null, '模型用例：补齐到 9 级后保留合法 5 级专精，但清空等级不足的 10 级专精。')

  const fishing = getSkill(normalizedStore, 'fishing')
  assert(fishing.level === 10 && fishing.exp === 15000, '模型用例：等级高于经验时必须补齐当前等级最低经验。')
  assert(fishing.perk5 === 'fisher' && fishing.perk10 === 'angler', '模型用例：等级和分支都合法的专精必须保留。')

  const legacyScreenshotStore = freshSkillStore()
  legacyScreenshotStore.deserialize({
    skills: [{ type: 'foraging', exp: 155000, level: 20, masteryExp: 1082, masteryPoints: 1883, unlockedMasteryNodeIds: [] }]
  })
  assert(legacyScreenshotStore.masteryPool.points === 156 && legacyScreenshotStore.masteryPool.exp === 56082, '模型用例：旧档 1883 点 + 1082 精研经验必须按 5000→60000 重新折算到通用精研池。')
  assertClearedCarryover(getSkill(legacyScreenshotStore, 'foraging'), '模型用例：旧档截图案例')

  const previousThresholdStore = freshSkillStore()
  previousThresholdStore.deserialize({
    skills: [{ type: 'fishing', exp: 155000, level: 20, masteryExpPerPoint: 24000, masteryExp: 25000, masteryPoints: 1, unlockedMasteryNodeIds: [] }]
  })
  assert(previousThresholdStore.masteryPool.points === 0 && previousThresholdStore.masteryPool.exp === 49000, '模型用例：已标记 24000 阈值的旧档必须按自身阈值折算，再迁移到 60000 通用池。')
  assertClearedCarryover(getSkill(previousThresholdStore, 'fishing'), '模型用例：24000 阈值旧档')

  const currentThresholdStore = freshSkillStore()
  currentThresholdStore.deserialize({
    skills: [{ type: 'combat', exp: 155000, level: 20, masteryExpPerPoint: 60000, masteryExp: 61000, masteryPoints: 1, unlockedMasteryNodeIds: [] }]
  })
  assert(currentThresholdStore.masteryPool.points === 2 && currentThresholdStore.masteryPool.exp === 1000, '模型用例：已标记 60000 阈值的新档不得再次按旧阈值缩水，只兑换新增精研经验。')
  assertClearedCarryover(getSkill(currentThresholdStore, 'combat'), '模型用例：60000 阈值新档')

  const persistedPoolStore = freshSkillStore()
  persistedPoolStore.deserialize({
    masteryPool: { expPerPoint: 24000, points: 2, exp: 25000 },
    skills: [{ type: 'mining', exp: 155000, level: 20, masteryExpPerPoint: 5000, masteryExp: 10000, masteryPoints: 1, unlockedMasteryNodeIds: [] }]
  })
  assert(persistedPoolStore.masteryPool.expPerPoint === 60000, '模型用例：已有通用池旧阈值必须升级到 60000。')
  assert(persistedPoolStore.masteryPool.points === 1 && persistedPoolStore.masteryPool.exp === 28000, '模型用例：已有通用池存档必须保留池内总经验，并合并旧技能字段残留经验。')
  assertClearedCarryover(getSkill(persistedPoolStore, 'mining'), '模型用例：已有通用池存档')
}

if (errors.length > 0) {
  console.error('技能读档归一化守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('技能读档归一化守卫通过：level/exp/perk/mastery 异常档会被归一化，旧技能精研字段会迁移到 60000 阈值通用精研池。')
