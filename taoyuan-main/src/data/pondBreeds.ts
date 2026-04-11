import type { PondBreedDef } from '@/types/fishPond'

// === 品种分布 ===
// 13个基础鱼种，共5代400品种
// Gen1=200, Gen2=100, Gen3=50, Gen4=30, Gen5=20
// 层级链条：Gen N 的亲本来自 Gen N-1，亲本组合无重复

// [baseFishId, suffix, gen1, gen2, gen3, gen4, gen5]
const SPECIES_CFG: [string, string, number, number, number, number, number][] = [
  ['crucian',        '鲫',   16, 8, 4, 3, 2],
  ['carp',           '鲤',   16, 8, 4, 3, 2],
  ['grass_carp',     '草鱼', 16, 8, 4, 3, 2],
  ['golden_carp',    '金鲤', 16, 8, 4, 3, 2],
  ['koi',            '锦鲤', 16, 8, 4, 3, 2],
  ['pond_turtle',    '龟',   15, 8, 4, 3, 2],
  ['bass',           '鲈',   15, 8, 4, 3, 2],
  ['catfish',        '鲶',   15, 8, 4, 3, 2],
  ['yellow_eel',     '鳝',   15, 8, 4, 3, 2],
  ['rainbow_trout',  '鳟',   15, 7, 4, 3, 2],
  ['mud_loach',      '泥鳅', 15, 7, 4, 0, 0],
  ['pond_snail',     '螺',   15, 7, 3, 0, 0],
  ['cave_blindfish', '盲鱼', 15, 7, 3, 0, 0],
]

// === 命名前缀 ===

const G1_PREFIXES = ['银', '金', '赤', '花', '墨', '翡', '月', '霜', '星', '云', '玉', '碧', '雪', '绯', '焰', '岚']
const G2_PREFIXES = ['灵', '仙', '瑶', '幻', '梦', '神', '圣', '天']
const G3_PREFIXES = ['琼光', '瑶华', '灵境', '仙域']
const G4_PREFIXES = ['太古', '鸿蒙', '混沌']
const G5_PREFIXES = ['化龙', '浴火']

// === 配对算法 ===
// 从 parentCount 个亲本中生成 childCount 个唯一配对

const makePairs = (parentCount: number, childCount: number): [number, number][] => {
  const pairs: [number, number][] = []

  // 策略1：连续配对 (0,1), (2,3), ...
  let i = 0
  while (pairs.length < childCount && i + 1 < parentCount) {
    pairs.push([i, i + 1])
    i += 2
  }

  // 策略2：与首个交叉配对
  let j = i
  while (pairs.length < childCount && j < parentCount) {
    pairs.push([0, j])
    j++
  }

  // 策略3：更多交叉配对
  for (let a = 0; a < parentCount && pairs.length < childCount; a++) {
    for (let b = a + 2; b < parentCount && pairs.length < childCount; b++) {
      if (!pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
        pairs.push([a, b])
      }
    }
  }

  return pairs
}

// === 构建全部品种 ===

const buildAllBreeds = (): PondBreedDef[] => {
  const all: PondBreedDef[] = []
  const counters = { g1: 0, g2: 0, g3: 0, g4: 0, g5: 0 }

  for (const [baseFish, suffix, g1n, g2n, g3n, g4n, g5n] of SPECIES_CFG) {
    const g1: PondBreedDef[] = []
    const g2: PondBreedDef[] = []
    const g3: PondBreedDef[] = []
    const g4: PondBreedDef[] = []
    const g5: PondBreedDef[] = []

    // Gen 1
    for (let i = 0; i < g1n; i++) {
      counters.g1++
      const b: PondBreedDef = {
        breedId: `g1_${String(counters.g1).padStart(3, '0')}`,
        name: G1_PREFIXES[i]! + suffix,
        generation: 1,
        baseFishId: baseFish,
        parentBreedA: null,
        parentBreedB: null
      }
      all.push(b)
      g1.push(b)
    }

    // Gen 2
    const g2Pairs = makePairs(g1n, g2n)
    for (const [a, b] of g2Pairs) {
      counters.g2++
      const breed: PondBreedDef = {
        breedId: `g2_${String(counters.g2).padStart(3, '0')}`,
        name: G2_PREFIXES[g2.length]! + suffix,
        generation: 2,
        baseFishId: baseFish,
        parentBreedA: g1[a]!.breedId,
        parentBreedB: g1[b]!.breedId
      }
      all.push(breed)
      g2.push(breed)
    }

    // Gen 3
    const g3Pairs = makePairs(g2n, g3n)
    for (const [a, b] of g3Pairs) {
      counters.g3++
      const breed: PondBreedDef = {
        breedId: `g3_${String(counters.g3).padStart(3, '0')}`,
        name: G3_PREFIXES[g3.length]! + suffix,
        generation: 3,
        baseFishId: baseFish,
        parentBreedA: g2[a]!.breedId,
        parentBreedB: g2[b]!.breedId
      }
      all.push(breed)
      g3.push(breed)
    }

    // Gen 4
    if (g4n > 0) {
      const g4Pairs = makePairs(g3n, g4n)
      for (const [a, b] of g4Pairs) {
        counters.g4++
        const breed: PondBreedDef = {
          breedId: `g4_${String(counters.g4).padStart(3, '0')}`,
          name: G4_PREFIXES[g4.length]! + suffix,
          generation: 4,
          baseFishId: baseFish,
          parentBreedA: g3[a]!.breedId,
          parentBreedB: g3[b]!.breedId
        }
        all.push(breed)
        g4.push(breed)
      }
    }

    // Gen 5
    if (g5n > 0) {
      const g5Pairs = makePairs(g4n, g5n)
      for (const [a, b] of g5Pairs) {
        counters.g5++
        const breed: PondBreedDef = {
          breedId: `g5_${String(counters.g5).padStart(3, '0')}`,
          name: G5_PREFIXES[g5.length]! + suffix,
          generation: 5,
          baseFishId: baseFish,
          parentBreedA: g4[a]!.breedId,
          parentBreedB: g4[b]!.breedId
        }
        all.push(breed)
        g5.push(breed)
      }
    }
  }

  return all
}

/** 全部品种定义（400条） */
export const POND_BREEDS: PondBreedDef[] = buildAllBreeds()

/** 根据品种ID查找 */
export const getBreedById = (breedId: string): PondBreedDef | undefined =>
  POND_BREEDS.find(b => b.breedId === breedId)

/** 获取指定代数的所有品种 */
export const getBreedsByGeneration = (gen: 1 | 2 | 3 | 4 | 5): PondBreedDef[] =>
  POND_BREEDS.filter(b => b.generation === gen)

/** 获取指定鱼种的所有品种 */
export const getBreedsBySpecies = (baseFishId: string): PondBreedDef[] =>
  POND_BREEDS.filter(b => b.baseFishId === baseFishId)

/** 获取指定鱼种的 Gen1 品种列表 */
export const getGen1BreedsForFish = (fishId: string): PondBreedDef[] =>
  POND_BREEDS.filter(b => b.generation === 1 && b.baseFishId === fishId)

/** 根据亲本品种ID查找子代品种（顺序无关） */
export const findBreedByParents = (breedIdA: string, breedIdB: string): PondBreedDef | undefined =>
  POND_BREEDS.find(b =>
    (b.parentBreedA === breedIdA && b.parentBreedB === breedIdB) ||
    (b.parentBreedA === breedIdB && b.parentBreedB === breedIdA)
  )

/** 各代品种数量 */
export const BREED_COUNTS: Record<number, number> = {
  1: 200,
  2: 100,
  3: 50,
  4: 30,
  5: 20
}
