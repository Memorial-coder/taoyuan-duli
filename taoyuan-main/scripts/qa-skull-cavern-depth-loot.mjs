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

const {
  BOSS_MONSTERS,
  generateFloorGrid,
  generateSkullCavernFloor,
  getSkullCavernBossPressureMultiplier,
  getSkullCavernDepthLootProfile,
  scaleMonster
} = await import(pathToFileURL(path.join(srcRoot, 'data', 'mine.ts')).href)

const withMockRandom = (value, fn) => {
  const originalRandom = Math.random
  Math.random = () => value
  try {
    return fn()
  } finally {
    Math.random = originalRandom
  }
}

const asMineFloor = floor => ({
  floor: floor.floor,
  zone: 'abyss',
  ores: floor.ores,
  monsters: floor.monsters,
  isSafePoint: floor.isSafePoint,
  specialType: floor.specialType
})

const countItem = (items, itemId) => items.filter(item => item === itemId).length
const oreTiles = result => result.tiles.filter(tile => tile.type === 'ore')
const bossScore = boss => boss.hp + boss.attack * 20 + boss.defense * 10
const scaledSkullBoss = (sourceBossFloor, skullFloor) => {
  const boss = BOSS_MONSTERS[sourceBossFloor]
  assert.ok(boss, `${sourceBossFloor}层 Boss 必须存在`)
  const scaleFactor = 2 * (1 + (skullFloor - 1) * 0.03) * getSkullCavernBossPressureMultiplier(sourceBossFloor, skullFloor)
  return scaleMonster(boss, scaleFactor)
}

const floor1 = getSkullCavernDepthLootProfile(1)
assert.equal(floor1.tierStartFloor, 1, '1层应落在 1-50 档')
assert.equal(floor1.tierEndFloor, 50, '1层档位应结束于50层')
assert.equal(floor1.extraOreCount, 0, '1-50 档不应增加普通矿格')
assert.equal(floor1.oreQuantityBonusChance, 0, '1-50 档不应增加单块矿数量概率')
assert.equal(floor1.iridiumWeightBonus, 0, '1-50 档不应额外叠铱矿权重')
assert.equal(floor1.prismaticShardWeightChance, 0, '30层前不应把五彩碎片放进矿石池')

const floor50 = getSkullCavernDepthLootProfile(50)
assert.equal(floor50.tierStartFloor, 1, '50层仍应属于 1-50 档')
assert.equal(floor50.tierEndFloor, 50, '50层不应提前进入下一档')
assert.equal(floor50.extraOreCount, 0, '50层不应获得下一档矿格奖励')
assert.equal(floor50.prismaticShardWeightChance, 0.06, '31-50层只给低概率五彩微光')

const floor51 = getSkullCavernDepthLootProfile(51)
assert.equal(floor51.tierStartFloor, 51, '51层应进入 51-100 档')
assert.equal(floor51.tierEndFloor, 100, '51层档位应结束于100层')
assert.equal(floor51.extraOreCount, 1, '51-100 档普通层应额外 +1 矿格')
assert.equal(floor51.oreQuantityBonusChance, 0.08, '51-100 档应有小概率矿量+1')
assert.equal(floor51.iridiumWeightBonus, 2, '51-100 档应保持明显铱矿富集')

const floor100 = getSkullCavernDepthLootProfile(100)
assert.equal(floor100.tierStartFloor, 51, '100层仍应属于 51-100 档')

const floor101 = getSkullCavernDepthLootProfile(101)
assert.equal(floor101.tierStartFloor, 101, '101层应进入 101-150 档')
assert.equal(floor101.extraOreCount, 1, '101-150 档仍控制在 +1 矿格，避免120层附近过快封顶')
assert.equal(floor101.oreQuantityBonusChance, 0.14, '101-150 档应提高矿量+1概率')
assert.equal(floor101.iridiumWeightBonus, 3, '101-150 档应进一步提高铱矿权重')

const floor151 = getSkullCavernDepthLootProfile(151)
assert.equal(floor151.tierStartFloor, 151, '151层应进入 151-200 档')
assert.equal(floor151.extraOreCount, 2, '151-200 档才应增加到 +2 矿格')

const floor201 = getSkullCavernDepthLootProfile(201)
assert.equal(floor201.tierStartFloor, 201, '201层应进入封顶档')
assert.equal(floor201.tierEndFloor, null, '201层后应使用开放封顶档')
assert.equal(floor201.extraOreCount, 2, '封顶档普通层矿格应控制在 +2')
assert.equal(floor201.oreQuantityBonusChance, 0.25, '封顶档矿量+1概率应受控')
assert.equal(floor201.prismaticShardWeightChance, 0.14, '封顶档五彩碎片权重概率应封顶')

const floor500 = getSkullCavernDepthLootProfile(500)
assert.deepEqual(floor500, floor201, '500层应沿用201+封顶档，不能无限抬高产出')

assert.equal(getSkullCavernBossPressureMultiplier(20, 25), 1, '25层骷髅矿穴 Boss 不应立刻吃满深层压力倍率')
assert.equal(getSkullCavernBossPressureMultiplier(120, 300), 1, '深渊龙王应保持顶格基准，不再额外加压')
assert.equal(getSkullCavernBossPressureMultiplier(20, 300), 4.4, '深层泥岩巨兽应获得完整骷髅矿穴压力倍率')

const dragon300Score = bossScore(scaledSkullBoss(120, 300))
const floor300MinimumRatios = new Map([
  [20, 0.55],
  [40, 0.6],
  [60, 0.65],
  [80, 0.75],
  [100, 0.85]
])
for (const [sourceBossFloor, minimumRatio] of floor300MinimumRatios) {
  const score = bossScore(scaledSkullBoss(sourceBossFloor, 300))
  assert.ok(
    score >= dragon300Score * minimumRatio,
    `${sourceBossFloor}层 Boss 的300层骷髅矿穴强度至少应达到深渊龙王的 ${Math.round(minimumRatio * 100)}%`
  )
}

const generated51 = withMockRandom(1, () => generateSkullCavernFloor(51))
assert.equal(countItem(generated51.ores, 'iridium_ore'), 3, '51层矿池应含基础铱矿 + 2 个档位权重')
assert.equal(generated51.ores.includes('prismatic_shard'), false, '五彩碎片应受概率门控，不应无条件进入矿池')

const generated101 = withMockRandom(1, () => generateSkullCavernFloor(101))
assert.equal(countItem(generated101.ores, 'iridium_ore'), 4, '101层矿池应含基础铱矿 + 3 个档位权重')

const generated201 = withMockRandom(1, () => generateSkullCavernFloor(201))
assert.equal(countItem(generated201.ores, 'iridium_ore'), 6, '201+矿池应含基础铱矿 + 5 个封顶权重')

const generatedPrismatic = withMockRandom(0, () => generateSkullCavernFloor(101))
assert.equal(generatedPrismatic.ores.includes('prismatic_shard'), true, '概率命中时五彩碎片应能进入深层矿池')

const grid1 = withMockRandom(0, () => {
  const floor = generateSkullCavernFloor(1)
  return generateFloorGrid(asMineFloor(floor), 1, true, floor.scaleFactor)
})
assert.equal(oreTiles(grid1).length, 3, '1层普通层最低矿格数应保持3')
assert.ok(oreTiles(grid1).every(tile => tile.data?.oreQuantity === 1), '1层矿格数量不应额外+1')

const grid51 = withMockRandom(0, () => {
  const floor = generateSkullCavernFloor(51)
  return generateFloorGrid(asMineFloor(floor), 51, true, floor.scaleFactor)
})
assert.equal(oreTiles(grid51).length, 4, '51层普通层最低矿格数应从3提高到4')
assert.ok(oreTiles(grid51).every(tile => tile.data?.oreQuantity === 2), '51层概率命中时每块矿应可额外+1')

const grid201 = withMockRandom(0, () => {
  const floor = generateSkullCavernFloor(201)
  return generateFloorGrid(asMineFloor(floor), 201, true, floor.scaleFactor)
})
assert.equal(oreTiles(grid201).length, 5, '201+普通层最低矿格数应封顶在5')
assert.ok(oreTiles(grid201).every(tile => tile.data?.oreQuantity === 2), '201+概率命中时每块矿应可额外+1')

const mineSource = fs.readFileSync(path.join(srcRoot, 'data', 'mine.ts'), 'utf8')
assert.match(mineSource, /SKULL_CAVERN_DEPTH_TIER_SIZE = 50/, '骷髅矿穴深度收益必须保持50层一档')
assert.match(mineSource, /Math\.min\(rawTier, SKULL_CAVERN_DEPTH_LOOT_TIERS\.length - 1\)/, '深度收益档位必须有封顶保护')
assert.doesNotMatch(mineSource, /0\.05 \+ floor \* 0\.001/, '五彩碎片权重不能再随楼层无限增长')
assert.match(mineSource, /SKULL_CAVERN_BOSS_PRESSURE_MULTIPLIERS/, '骷髅矿穴 Boss 必须保留低阶首领深层压力倍率表')
assert.match(mineSource, /getSkullCavernBossPressureMultiplier\(randomFloor, floor\)/, '骷髅矿穴 Boss 缩放必须乘入深层压力倍率')

console.log('[qa-skull-cavern-depth-loot] OK')
