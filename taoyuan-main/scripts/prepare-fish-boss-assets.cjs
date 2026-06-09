const fs = require('node:fs')
const path = require('node:path')

const frontendRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(frontendRoot, 'public', 'asset_fish_boss')
const manifestPath = path.join(sourceDir, 'fish-boss-asset-manifest.json')
const qaReportPath = path.join(sourceDir, 'fish-boss-asset-qa-report.json')

const BASE_PATH = '/asset_fish_boss'
const VARIANT_RE = /^(?<base>.+)__(?<variant>0[1-9]\d*)\.webp$/i
const SIZE_DIRS = ['128', '256']
const DEFAULT_VARIANT = '01'

const readText = filePath => {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

const exportRegion = (text, exportName, nextExportName = '') => {
  const marker = new RegExp(`\\bexport\\s+const\\s+${exportName}\\b`).exec(text)
  if (!marker) return ''
  const start = marker.index
  const rest = text.slice(start)
  if (nextExportName) {
    const next = new RegExp(`\\bexport\\s+const\\s+${nextExportName}\\b`).exec(rest.slice(marker[0].length))
    if (next) return rest.slice(0, marker[0].length + next.index)
  }
  const next = /\nexport const\s+/.exec(rest.slice(marker[0].length))
  if (!next) return rest
  return rest.slice(0, marker[0].length + next.index)
}

const cloneEntry = (entry, extra = {}) => ({
  ...JSON.parse(JSON.stringify(entry)),
  ...extra,
})

const collectAssetGroups = () => {
  const groups = new Map()
  const missingSizeDirs = []

  for (const size of SIZE_DIRS) {
    const sizeDir = path.join(sourceDir, size)
    if (!fs.existsSync(sizeDir)) {
      missingSizeDirs.push(size)
      continue
    }

    for (const fileName of fs.readdirSync(sizeDir)) {
      const match = VARIANT_RE.exec(fileName)
      if (!match?.groups) continue
      const base = match.groups.base
      const variant = match.groups.variant
      if (!groups.has(base)) {
        groups.set(base, {
          assetBase: base,
          displayName: base,
          kind: 'asset',
          variants: {},
        })
      }
      const entry = groups.get(base)
      entry.variants[variant] = entry.variants[variant] || {}
      entry.variants[variant][size] = `${size}/${fileName}`
    }
  }

  return {
    groups: new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))),
    missingSizeDirs,
  }
}

const parseFishDefs = () => {
  const text = readText(path.join(frontendRoot, 'src', 'data', 'fish.ts'))
  const region = exportRegion(text, 'FISH', 'getFishById')
  const rows = []
  const blockRe = /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'(?<body>[\s\S]*?)\n\s*\},/g
  let match
  while ((match = blockRe.exec(region))) {
    const body = match.groups?.body || ''
    const difficulty = /\bdifficulty:\s*'([^']+)'/.exec(body)?.[1] || ''
    rows.push({
      id: match[1],
      name: match[2],
      difficulty,
    })
  }
  return rows
}

const parseMineBossDefs = () => {
  const text = readText(path.join(frontendRoot, 'src', 'data', 'mine.ts'))
  const start = text.indexOf('export const BOSS_MONSTERS')
  const end = text.indexOf('/** BOSS', start)
  const region = start >= 0 ? text.slice(start, end >= 0 ? end : undefined) : ''
  const rows = []
  const bossRe = /(\d+):\s*\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'/g
  let match
  while ((match = bossRe.exec(region))) {
    rows.push({
      floor: Number.parseInt(match[1], 10),
      id: match[2],
      name: match[3],
    })
  }
  return rows
}

const parseRegionBossDefs = () => {
  const text = readText(path.join(frontendRoot, 'src', 'data', 'regions.ts'))
  const region = exportRegion(text, 'REGION_BOSS_DEFS', 'REGION_ROUTE_DEFS')
  const rows = []
  const bossRe = /withJourneyBossMeta\(\{\s*id:\s*'([^']+)'\s*,\s*regionId:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'/g
  let match
  while ((match = bossRe.exec(region))) {
    rows.push({
      id: match[1],
      regionId: match[2],
      name: match[3],
    })
  }
  return rows
}

const addNameIndex = (manifest, entry) => {
  manifest.byName[entry.assetBase] = cloneEntry(entry)
  if (entry.displayName) manifest.byDisplayName[entry.displayName] = cloneEntry(entry)
}

const assignMappedEntry = (target, id, entry, extra) => {
  if (!id || !entry) return false
  target[id] = cloneEntry(entry, extra)
  return true
}

const buildMappings = (manifest, groups) => {
  const byAssetBase = Object.fromEntries(groups)
  const fishDefs = parseFishDefs()
  const mineBossDefs = parseMineBossDefs()
  const regionBossDefs = parseRegionBossDefs()
  const fishMapped = []
  const fishUnmapped = []
  const mineBossMapped = []
  const mineBossUnmapped = []
  const regionBossMapped = []
  const regionBossUnmapped = []

  for (const fish of fishDefs) {
    const entry = byAssetBase[fish.name]
    if (assignMappedEntry(manifest.byFishId, fish.id, entry, {
      kind: 'fish',
      fishId: fish.id,
      difficulty: fish.difficulty,
    })) {
      fishMapped.push(fish)
    } else {
      fishUnmapped.push(fish)
    }
  }

  for (const boss of mineBossDefs) {
    const entry = byAssetBase[boss.name]
    if (assignMappedEntry(manifest.byMineBossId, boss.id, entry, {
      kind: 'mineBoss',
      bossId: boss.id,
      floor: boss.floor,
    })) {
      mineBossMapped.push(boss)
    } else {
      mineBossUnmapped.push(boss)
    }
  }

  for (const boss of regionBossDefs) {
    const entry = byAssetBase[boss.name]
    if (assignMappedEntry(manifest.byRegionBossId, boss.id, entry, {
      kind: 'regionBoss',
      bossId: boss.id,
      regionId: boss.regionId,
    })) {
      regionBossMapped.push(boss)
    } else {
      regionBossUnmapped.push(boss)
    }
  }

  return {
    fish: {
      total: fishDefs.length,
      mapped: fishMapped.length,
      unmapped: fishUnmapped,
    },
    mineBoss: {
      total: mineBossDefs.length,
      mapped: mineBossMapped.length,
      unmapped: mineBossUnmapped,
    },
    regionBoss: {
      total: regionBossDefs.length,
      mapped: regionBossMapped.length,
      unmapped: regionBossUnmapped,
    },
  }
}

const main = () => {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`asset directory not found: ${sourceDir}`)
  }

  const { groups, missingSizeDirs } = collectAssetGroups()
  const generatedAt = new Date().toISOString()
  const version = generatedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
  const manifest = {
    version,
    generatedAt,
    basePath: BASE_PATH,
    defaultVariant: DEFAULT_VARIANT,
    sizes: SIZE_DIRS.map(Number),
    byAssetBase: {},
    byName: {},
    byDisplayName: {},
    byFishId: {},
    byMineBossId: {},
    byRegionBossId: {},
  }

  const missingVariants = {}
  const incompleteSizes = {}
  const variants = new Set()
  let runtimeFileRefs = 0

  for (const [base, entry] of groups.entries()) {
    manifest.byAssetBase[base] = cloneEntry(entry)
    addNameIndex(manifest, entry)

    const entryVariants = Object.keys(entry.variants).sort()
    for (const variant of entryVariants) {
      variants.add(variant)
      const sizes = Object.keys(entry.variants[variant]).sort()
      runtimeFileRefs += sizes.length
      const missingSizes = SIZE_DIRS.filter(size => !entry.variants[variant][size])
      if (missingSizes.length > 0) {
        incompleteSizes[`${base}__${variant}`] = missingSizes
      }
    }

    const missing = [DEFAULT_VARIANT, '02'].filter(variant => !entry.variants[variant])
    if (missing.length > 0) {
      missingVariants[base] = missing
    }
  }

  const mapping = buildMappings(manifest, groups)
  manifest.stats = {
    groups: groups.size,
    variants: [...variants].sort(),
    runtimeFileRefs,
    fishMapped: mapping.fish.mapped,
    fishTotal: mapping.fish.total,
    mineBossMapped: mapping.mineBoss.mapped,
    mineBossTotal: mapping.mineBoss.total,
    regionBossMapped: mapping.regionBoss.mapped,
    regionBossTotal: mapping.regionBoss.total,
    missingVariantGroups: Object.keys(missingVariants).length,
    incompleteSizeEntries: Object.keys(incompleteSizes).length,
  }

  const qaReport = {
    version,
    generatedAt,
    source: sourceDir,
    manifest: manifestPath,
    basePath: BASE_PATH,
    sizeDirs: SIZE_DIRS,
    missingSizeDirs,
    groups: groups.size,
    variants: [...variants].sort(),
    runtimeFileRefs,
    missingVariants,
    incompleteSizes,
    mapping,
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  fs.writeFileSync(qaReportPath, `${JSON.stringify(qaReport, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    manifest: manifestPath,
    qaReport: qaReportPath,
    groups: groups.size,
    fishMapped: `${mapping.fish.mapped}/${mapping.fish.total}`,
    mineBossMapped: `${mapping.mineBoss.mapped}/${mapping.mineBoss.total}`,
    regionBossMapped: `${mapping.regionBoss.mapped}/${mapping.regionBoss.total}`,
  }, null, 2))
}

main()
