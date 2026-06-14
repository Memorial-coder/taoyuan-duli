/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

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
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const mineDataSource = readSource('src/data/mine.ts')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const processingSource = readSource('src/data/processing.ts')
const itemEncyclopediaSource = readSource('src/data/itemEncyclopedia.ts')
const perkSelectSource = readSource('src/components/game/PerkSelectDialog.vue')
const skillViewSource = readSource('src/views/game/SkillView.vue')

const { getBombIndices } = await import(pathToFileURL(path.join(srcRoot, 'data', 'mine.ts')).href)

const normalBombCenter = getBombIndices(14, 'bomb')
const megaBombCenter = getBombIndices(14, 'mega_bomb')

assert.equal(new Set(megaBombCenter).size, megaBombCenter.length, '雷火弹范围索引不应重复')
assert.ok(megaBombCenter.length > normalBombCenter.length, '雷火弹范围应大于火药包')
assert.ok(megaBombCenter.length < 36, '雷火弹不应再覆盖整层 36 格')
assert.ok(!mineDataSource.includes('if (bombId === \'mega_bomb\') {\n    // 全部 36 格'), '雷火弹不能回退为全层爆破')
assert.ok(mineDataSource.includes('manhattanDistance(center, i) <= 3'), '雷火弹范围应由有限距离控制')

assert.ok(miningStoreSource.includes('const DEEP_EXCAVATOR_BOMB_REFUND_CHANCE = 0.5'), '15级深渊挖掘者应保持 50% 返还')
assert.ok(miningStoreSource.includes('const ABYSS_MINER_GUARANTEED_REFUNDS_PER_FLOOR = 1'), '20级深渊矿工应按层限制保底返还次数')
assert.ok(miningStoreSource.includes('const ABYSS_MINER_EXTRA_REFUND_CHANCE = 0.6'), '20级深渊矿工后续返还应为受控概率')
assert.ok(miningStoreSource.includes('abyssMinerGuaranteedRefundsUsedOnFloor.value = 0'), '进入新层时必须重置深渊矿工保底返还计数')
assert.ok(!miningStoreSource.includes('const excavatorPerkSaved = abyssMinerActive || deepExcavatorActive'), '挖掘者系返还不得再因 15/20 级直接必定返还')
assert.ok(miningStoreSource.includes('floor?.specialType !== \'infested\''), '感染层怪物不应被炸弹直接计入清层门槛')
assert.ok(miningStoreSource.includes('爆竹和感染层怪物只翻开，不直接清除特殊层门槛'), '感染层炸弹行为应保留可读注释')
assert.ok(miningStoreSource.includes('utilityTargetsRevealed === 0 &&'), '稳压爆破不应把揭示怪物、BOSS、陷阱或楼梯当成空爆')

assert.ok(processingSource.includes('不会覆盖整层'), '雷火弹道具描述应说明不会覆盖整层')
assert.ok(processingSource.includes('感染层和BOSS仍需正面处理'), '炸弹道具描述应说明特殊层约束')
assert.ok(itemEncyclopediaSource.includes('清除普通怪物'), '百科详情不应把炸弹描述为清除所有怪物')
assert.ok(perkSelectSource.includes('炸弹50%概率不消耗'), '15级深渊挖掘者选择文案应与 50% 返还一致')
assert.ok(perkSelectSource.includes('每层首次炸弹必定返还，之后60%概率返还'), '20级深渊矿工选择文案应说明受控返还')
assert.ok(skillViewSource.includes('炸弹50%概率不消耗'), '技能页 15级深渊挖掘者文案应同步')
assert.ok(skillViewSource.includes('每层首次炸弹必定返还，之后60%概率返还'), '技能页 20级深渊矿工文案应同步')
assert.ok(!skillViewSource.includes('炸弹无限使用'), '技能页不应再承诺炸弹无限使用')
assert.ok(!skillViewSource.includes('范围最大化'), '技能页不应再承诺范围最大化')

console.log('[qa-mining-bomb-balance-guards] OK')
