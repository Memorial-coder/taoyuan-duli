const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'images', 'item', 'supplemental-asset-prompts.md')

const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const commonIconPrompt =
  '清晰游戏资产图标，1:1 方形构图，透明背景或纯净空白背景，画面除主体外不放任何背景物件，单个主体居中，主体占画布约 72%，边缘留白，国风田园幻想 RPG，美术风格统一，精致手绘半写实小图标，干净轮廓，柔和体积光，轻微投影，适合 64px/128px/256px 缩略图'
const negativePrompt =
  '文字、汉字、英文、数字、价格、星级、UI 边框、卡牌框、按钮、水印、logo、签名、复杂背景、场景、桌面、地面、手、人物、重复主体、多个主体、裁切、低清晰度、噪点、过度写实摄影、3D 塑料感、夸张霓虹、脏污背景、错误透视、畸形结构'

const stripCell = value =>
  String(value || '')
    .replace(/[\r\n|]+/g, '，')
    .replace(/\s+/g, ' ')
    .trim()

const filenameRange = (prefix, name) => `\`${prefix}__${name}__01.png\` 到 \`${prefix}__${name}__02.png\``

const makeRow = (index, category, name, files, prompt) =>
  `| [ ] | ${String(index).padStart(4, '0')} | ${category} | ${name} | 2 | ${files} | ${stripCell(prompt)} |`

const exportRegion = (text, exportName, nextMarker) => {
  const startNeedle = `export const ${exportName}`
  const start = text.indexOf(startNeedle)
  if (start < 0) return ''
  if (!nextMarker) return text.slice(start)
  const end = text.indexOf(nextMarker, start + startNeedle.length)
  return text.slice(start, end > start ? end : text.length)
}

const parseDefs = region =>
  [...region.matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?description:\s*'([^']*)'/g)].map(match => ({
    id: match[1],
    name: match[2],
    description: match[3],
  }))

const parseStringArray = (source, name) => {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([^\\]]+)\\]`))
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]) : []
}

const makePairs = (parentCount, childCount) => {
  const pairs = []
  let i = 0
  while (pairs.length < childCount && i + 1 < parentCount) {
    pairs.push([i, i + 1])
    i += 2
  }

  let j = i
  while (pairs.length < childCount && j < parentCount) {
    pairs.push([0, j])
    j += 1
  }

  for (let a = 0; a < parentCount && pairs.length < childCount; a += 1) {
    for (let b = a + 2; b < parentCount && pairs.length < childCount; b += 1) {
      if (!pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
        pairs.push([a, b])
      }
    }
  }

  return pairs
}

const buildPondBreeds = pondText => {
  const cfgMatch = pondText.match(/const SPECIES_CFG:[\s\S]*?= \[([\s\S]*?)\]\n/)
  const species = []
  if (cfgMatch) {
    for (const match of cfgMatch[1].matchAll(/\['([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\]/g)) {
      species.push({
        fishId: match[1],
        suffix: match[2],
        counts: [Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]), Number(match[7])],
      })
    }
  }

  const prefixes = {
    g1: parseStringArray(pondText, 'G1_PREFIXES'),
    g2: parseStringArray(pondText, 'G2_PREFIXES'),
    g3: parseStringArray(pondText, 'G3_PREFIXES'),
    g4: parseStringArray(pondText, 'G4_PREFIXES'),
    g5: parseStringArray(pondText, 'G5_PREFIXES'),
  }
  const counters = { g1: 0, g2: 0, g3: 0, g4: 0, g5: 0 }
  const breeds = []

  for (const item of species) {
    const [g1n, g2n, g3n, g4n, g5n] = item.counts
    const g1 = []
    const g2 = []
    const g3 = []
    const g4 = []
    const g5 = []

    for (let i = 0; i < g1n; i += 1) {
      counters.g1 += 1
      const breed = {
        breedId: `g1_${String(counters.g1).padStart(3, '0')}`,
        name: `${prefixes.g1[i]}${item.suffix}`,
        generation: 1,
        baseFishId: item.fishId,
      }
      breeds.push(breed)
      g1.push(breed)
    }

    for (const [a, b] of makePairs(g1n, g2n)) {
      counters.g2 += 1
      const breed = {
        breedId: `g2_${String(counters.g2).padStart(3, '0')}`,
        name: `${prefixes.g2[g2.length]}${item.suffix}`,
        generation: 2,
        baseFishId: item.fishId,
        parentA: g1[a]?.name,
        parentB: g1[b]?.name,
      }
      breeds.push(breed)
      g2.push(breed)
    }

    for (const [a, b] of makePairs(g2n, g3n)) {
      counters.g3 += 1
      const breed = {
        breedId: `g3_${String(counters.g3).padStart(3, '0')}`,
        name: `${prefixes.g3[g3.length]}${item.suffix}`,
        generation: 3,
        baseFishId: item.fishId,
        parentA: g2[a]?.name,
        parentB: g2[b]?.name,
      }
      breeds.push(breed)
      g3.push(breed)
    }

    for (const [a, b] of makePairs(g3n, g4n)) {
      counters.g4 += 1
      const breed = {
        breedId: `g4_${String(counters.g4).padStart(3, '0')}`,
        name: `${prefixes.g4[g4.length]}${item.suffix}`,
        generation: 4,
        baseFishId: item.fishId,
        parentA: g3[a]?.name,
        parentB: g3[b]?.name,
      }
      breeds.push(breed)
      g4.push(breed)
    }

    for (const [a, b] of makePairs(g4n, g5n)) {
      counters.g5 += 1
      const breed = {
        breedId: `g5_${String(counters.g5).padStart(3, '0')}`,
        name: `${prefixes.g5[g5.length]}${item.suffix}`,
        generation: 5,
        baseFishId: item.fishId,
        parentA: g4[a]?.name,
        parentB: g4[b]?.name,
      }
      breeds.push(breed)
      g5.push(breed)
    }
  }

  return breeds
}

const traitHints = [
  ['银', '银白鳞片与清亮高光'],
  ['金', '金色鳞片与温润反光'],
  ['赤', '赤红体色'],
  ['花', '花斑纹理'],
  ['墨', '墨色背脊'],
  ['翡', '翡翠绿色'],
  ['月', '月白银辉'],
  ['霜', '霜白边缘'],
  ['星', '星点鳞光'],
  ['云', '云纹渐变'],
  ['玉', '玉质光泽'],
  ['碧', '碧绿色泽'],
  ['雪', '雪白鳞片'],
  ['绯', '绯红鳍尾'],
  ['焰', '火焰色鳍缘'],
  ['岚', '青岚雾蓝色'],
  ['灵', '轻微灵光纹路'],
  ['仙', '仙气飘逸的鳍形'],
  ['瑶', '瑶玉般清透鳞光'],
  ['幻', '梦幻渐变色'],
  ['梦', '柔和梦境色泽'],
  ['神', '庄重神性纹样'],
  ['圣', '圣洁亮边'],
  ['天', '天青色高光'],
  ['琼光', '琼玉光晕'],
  ['瑶华', '瑶华花纹'],
  ['灵境', '灵境涟漪纹'],
  ['仙域', '仙域云纹'],
  ['太古', '古老厚重鳞甲纹'],
  ['鸿蒙', '紫金混沌纹'],
  ['混沌', '深浅交错的混沌斑纹'],
  ['化龙', '龙须般细长鳍条但保持鱼类主体'],
  ['浴火', '浴火重生的红金鳍尾但保持鱼类主体'],
]

const hintForName = name =>
  traitHints
    .filter(([key]) => name.includes(key))
    .map(([, hint]) => hint)
    .join('，') || '按品系名称表现颜色与纹路差异'

const fishText = read('taoyuan-main/src/data/fish.ts')
const fish = parseDefs(exportRegion(fishText, 'FISH: FishDef[]', '/** 根据ID获取鱼 */'))
const fishMap = new Map(fish.map(item => [item.id, item]))

const weaponsText = read('taoyuan-main/src/data/weapons.ts')
const weapons = parseDefs(exportRegion(weaponsText, 'WEAPONS', 'export const SHOP_WEAPONS'))

const mineText = read('taoyuan-main/src/data/mine.ts')
const monsters = [
  ...parseDefs(exportRegion(mineText, 'MONSTERS', '/** 骷髅矿穴专属怪物 */')),
  ...parseDefs(exportRegion(mineText, 'SKULL_CAVERN_MONSTERS', '/** 区域怪物映射 */')),
  ...parseDefs(exportRegion(mineText, 'BOSS_MONSTERS', '/** BOSS 额外掉落铜钱 */')),
]

const pondBreeds = buildPondBreeds(read('taoyuan-main/src/data/pondBreeds.ts'))

const rows = []
let index = 1

for (const monster of monsters) {
  rows.push(
    makeRow(
      index,
      '怪物',
      monster.name,
      filenameRange('怪物', monster.name),
      `${commonIconPrompt}；${monster.name}，矿洞战斗怪物单体，姿态可读，轮廓明确，体现设定：${monster.description}；不要人物，不要武器持有者，不要血腥，不要场景背景，不要文字，输出透明 PNG 优先。负面提示词：${negativePrompt}`,
    ),
  )
  index += 1
}

for (const breed of pondBreeds) {
  const baseFish = fishMap.get(breed.baseFishId)
  const parents = breed.parentA && breed.parentB ? `，亲本视觉可轻微融合 ${breed.parentA} 与 ${breed.parentB}` : ''
  rows.push(
    makeRow(
      index,
      '鱼塘品系',
      breed.name,
      filenameRange('鱼塘品系', breed.name),
      `${commonIconPrompt}；${breed.name}，鱼塘杂交品系鱼，基于${baseFish?.name || breed.baseFishId}的体型特征，第 ${breed.generation} 代品系，${hintForName(breed.name)}${parents}，侧身或三分之二侧身展示，鱼鳍和鳞片清楚，保持单条鱼主体，不画水面与池塘背景；不要文字，不要标签，不要边框，不要场景背景，输出透明 PNG 优先。负面提示词：${negativePrompt}`,
    ),
  )
  index += 1
}

for (const item of fish) {
  rows.push(
    makeRow(
      index,
      '鱼类',
      item.name,
      filenameRange('鱼类', item.name),
      `${commonIconPrompt}；${item.name}，可钓鱼类单体图标，侧身展示，鱼鳍、鳞片、体型特征清楚，体现设定：${item.description}；不画水面、鱼钩、渔具、盘子或料理形态，保持单条鱼主体；不要文字，不要标签，不要边框，不要场景背景，输出透明 PNG 优先。负面提示词：${negativePrompt}`,
    ),
  )
  index += 1
}

for (const weapon of weapons) {
  rows.push(
    makeRow(
      index,
      '武器',
      weapon.name,
      filenameRange('武器', weapon.name),
      `${commonIconPrompt}；${weapon.name}，单件武器装备图标，三分之二角度悬浮展示，材质和刃口、锤头、匕首轮廓清楚，体现设定：${weapon.description}；不出现手、人物、战斗场景或展示架，保持单件武器主体；不要文字，不要标签，不要边框，不要场景背景，输出透明 PNG 优先。负面提示词：${negativePrompt}`,
    ),
  )
  index += 1
}

const markdown = `# 桃源乡补充资产绘图提示词

生成日期：2026-06-06

此文件按照 \`images/item/物品提示词.md\` 的格式补充非标准或易遗漏资产，仅提供提示词，不代表已经生成图片。每个资产默认出 2 张候选图。

## 覆盖结论

- 作物杂交育种：\`HYBRID_DEFS\` 共 400 个，全部有对应 \`resultCropId\`，且对应作物和种子已经进入 \`ITEMS\` 图标体系；不在本文件重复列出。
- 鱼塘杂交品系：\`POND_BREEDS\` 共 400 个，不属于 \`ITEMS\`，原 \`物品提示词.md\` 未覆盖；本文件补齐。
- 怪物与 BOSS：普通矿洞、骷髅矿穴、BOSS 合计 ${monsters.length} 个，不属于 \`ITEMS\`，原 \`物品提示词.md\` 未覆盖；本文件补齐。
- 鱼类：\`FISH\` 共 ${fish.length} 个，作为背包鱼物品已进入 \`ITEMS\`；本文件额外给可钓鱼类单体图提示词，方便需要非背包图标的界面使用。
- 武器：\`WEAPONS\` 共 34 个，作为背包装备已进入 \`ITEMS\`；本文件额外给装备单体图提示词，方便需要非背包图标的界面使用。

## 统一规格

- 画幅：1:1 方形，建议 1024x1024 或 768x768 出图，再压到游戏实际尺寸。
- 背景：优先透明 PNG；如果工具不支持透明，就用纯净空白背景，后期抠图。
- 构图：单个主体居中，主体占画布约 72%，四周留白，避免贴边裁切。
- 风格：国风田园幻想 RPG，精致手绘半写实小图标，轮廓清楚，缩到 64px 仍能识别。
- 禁止：图内文字、数字、价格、logo、水印、UI 边框、复杂背景、人物或手拿道具。

## 分类数量

| 分类 | 数量 | 每个出图 |
| --- | ---: | ---: |
| 怪物 | ${monsters.length} | 2 |
| 鱼塘品系 | ${pondBreeds.length} | 2 |
| 鱼类 | ${fish.length} | 2 |
| 武器 | ${weapons.length} | 2 |
| 合计 | ${monsters.length + pondBreeds.length + fish.length + weapons.length} | 2 |

## 批量提示词清单

批量生成时，每一行的“提示词”可直接使用；文件名按“分类__名称__01.png”“分类__名称__02.png”导出。完成后把对应行的 \`[ ]\` 改成 \`[x]\`。

| 完成 | 序号 | 分类 | 名称 | 出图数量 | 输出文件名 | 提示词 |
| --- | ---: | --- | --- | ---: | --- | --- |
${rows.join('\n')}
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, markdown, 'utf8')

console.log(
  JSON.stringify(
    {
      outputPath,
      counts: {
        monsters: monsters.length,
        pondBreeds: pondBreeds.length,
        fish: fish.length,
        weapons: weapons.length,
        total: rows.length,
      },
    },
    null,
    2,
  ),
)
