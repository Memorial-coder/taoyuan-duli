const fs = require('node:fs')
const path = require('node:path')

const frontendRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(frontendRoot, 'public', 'crop')
const manifestPath = path.join(sourceDir, 'crop-asset-manifest.json')
const qaReportPath = path.join(sourceDir, 'crop-asset-qa-report.json')

const BASE_PATH = '/crop'
const SIZE_DIRS = ['128', '256']
const DEFAULT_VARIANT = '01'
const SEP = String.fromCharCode(0x00b7)
const VARIANT_RE = /__(0[1-9]\d*)\.webp$/i

const CROP_STATES = [
  '播种',
  '发芽',
  '幼苗',
  '生长期',
  '花苞抽穗',
  '结果结实',
  '成熟可收获',
  '已浇水',
  '已施肥',
  '缺水',
  '虫害',
  '杂草',
  '枯萎',
  '深灌水泽',
  '再生期',
  '巨型成熟',
]

const BASIC_STATES = [
  '播种',
  '发芽',
  '幼苗',
  '生长期',
  '花苞抽穗',
  '结果结实',
  '成熟可收获',
  '已浇水',
  '已施肥',
  '缺水',
  '虫害',
  '杂草',
  '枯萎',
]

const readText = filePath => {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

const clone = value => JSON.parse(JSON.stringify(value))

const parseCropDefs = () => {
  const text = readText(path.join(frontendRoot, 'src', 'data', 'crops.ts'))
  const rows = []
  const blockRe = /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*seedId:\s*'([^']+)'(?<body>[\s\S]*?)\n\s*\}(?=,|\s*\])/g
  let match
  while ((match = blockRe.exec(text))) {
    const body = match.groups?.body || ''
    rows.push({
      id: match[1],
      name: match[2],
      seedId: match[3],
      deepWatering: /\bdeepWatering:\s*true\b/.test(body),
      regrowth: /\bregrowth:\s*true\b/.test(body),
      giantCropEligible: /\bgiantCropEligible:\s*true\b/.test(body),
    })
  }
  return rows
}

const parseCropAssetName = fileName => {
  const normalized = fileName.normalize('NFC')
  const variantMatch = VARIANT_RE.exec(normalized)
  if (!variantMatch) return null
  const baseName = normalized.slice(0, variantMatch.index)
  const variant = variantMatch[1]

  for (const state of CROP_STATES) {
    const suffix = `${SEP}${state}`
    if (!baseName.endsWith(suffix)) continue
    const cropName = baseName.slice(0, -suffix.length)
    if (!cropName) return null
    return { cropName, state, variant, fileName: normalized }
  }

  return null
}

const ensureAssetEntry = (groups, cropName) => {
  if (!groups.has(cropName)) {
    groups.set(cropName, {
      name: cropName,
      states: {},
    })
  }
  return groups.get(cropName)
}

const collectAssetGroups = () => {
  const groups = new Map()
  const missingSizeDirs = []
  const invalidFiles = []
  const duplicates = []
  let totalFiles = 0

  for (const size of SIZE_DIRS) {
    const sizeDir = path.join(sourceDir, size)
    if (!fs.existsSync(sizeDir)) {
      missingSizeDirs.push(size)
      continue
    }

    for (const fileName of fs.readdirSync(sizeDir)) {
      const filePath = path.join(sizeDir, fileName)
      if (!fs.statSync(filePath).isFile()) continue
      if (!fileName.toLowerCase().endsWith('.webp')) continue
      totalFiles += 1

      const parsed = parseCropAssetName(fileName)
      if (!parsed) {
        invalidFiles.push(`${size}/${fileName}`)
        continue
      }

      const entry = ensureAssetEntry(groups, parsed.cropName)
      entry.states[parsed.state] = entry.states[parsed.state] || {}
      entry.states[parsed.state][parsed.variant] = entry.states[parsed.state][parsed.variant] || {}
      if (entry.states[parsed.state][parsed.variant][size]) {
        duplicates.push({
          cropName: parsed.cropName,
          state: parsed.state,
          variant: parsed.variant,
          size,
          previous: entry.states[parsed.state][parsed.variant][size],
          next: `${size}/${parsed.fileName}`,
        })
      }
      entry.states[parsed.state][parsed.variant][size] = `${size}/${parsed.fileName}`
    }
  }

  return {
    groups: new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))),
    missingSizeDirs,
    invalidFiles,
    duplicates,
    totalFiles,
  }
}

const stateHasVariantSizes = (entry, state, variant) => {
  const sizes = entry.states?.[state]?.[variant] || {}
  return SIZE_DIRS.every(size => Boolean(sizes[size]))
}

const stateExists = (entry, state) => Boolean(entry.states?.[state])

const main = () => {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`crop asset directory not found: ${sourceDir}`)
  }

  const cropDefs = parseCropDefs()
  const cropByName = new Map(cropDefs.map(crop => [crop.name, crop]))
  const { groups, missingSizeDirs, invalidFiles, duplicates, totalFiles } = collectAssetGroups()
  const generatedAt = new Date().toISOString()
  const version = generatedAt.replace(/[-:TZ.]/g, '').slice(0, 14)

  const manifest = {
    version,
    generatedAt,
    basePath: BASE_PATH,
    defaultVariant: DEFAULT_VARIANT,
    sizes: SIZE_DIRS.map(Number),
    states: CROP_STATES,
    byCropId: {},
    byName: {},
  }

  const unmappedCrops = []
  const extraAssetNames = []
  const missingBasicStates = {}
  const missingVariants = {}
  const specialStateMismatches = {
    deepWateringMissing: [],
    deepWateringUnexpected: [],
    regrowthMissing: [],
    regrowthUnexpected: [],
    giantMissing: [],
    giantUnexpected: [],
  }
  let runtimeFileRefs = 0

  for (const [cropName, assetEntry] of groups.entries()) {
    const crop = cropByName.get(cropName)
    if (!crop) {
      extraAssetNames.push(cropName)
      continue
    }

    const entry = {
      cropId: crop.id,
      name: crop.name,
      seedId: crop.seedId,
      deepWatering: crop.deepWatering,
      regrowth: crop.regrowth,
      giantCropEligible: crop.giantCropEligible,
      states: clone(assetEntry.states),
    }

    manifest.byCropId[crop.id] = clone(entry)
    manifest.byName[crop.name] = clone(entry)

    const missingStates = BASIC_STATES.filter(state => !stateExists(entry, state))
    if (missingStates.length > 0) missingBasicStates[crop.id] = missingStates

    for (const [state, variants] of Object.entries(entry.states)) {
      for (const [variant, sizes] of Object.entries(variants)) {
        runtimeFileRefs += Object.keys(sizes).length
        if (!stateHasVariantSizes(entry, state, variant)) {
          missingVariants[`${crop.id}:${state}:${variant}`] = SIZE_DIRS.filter(size => !sizes[size])
        }
      }
      for (const variant of ['01', '02']) {
        if (!variants[variant]) {
          missingVariants[`${crop.id}:${state}:${variant}`] = SIZE_DIRS
        }
      }
    }

    if (crop.deepWatering && !stateExists(entry, '深灌水泽')) specialStateMismatches.deepWateringMissing.push(crop.id)
    if (!crop.deepWatering && stateExists(entry, '深灌水泽')) specialStateMismatches.deepWateringUnexpected.push(crop.id)
    if (crop.regrowth && !stateExists(entry, '再生期')) specialStateMismatches.regrowthMissing.push(crop.id)
    if (!crop.regrowth && stateExists(entry, '再生期')) specialStateMismatches.regrowthUnexpected.push(crop.id)
    if (crop.giantCropEligible && !stateExists(entry, '巨型成熟')) specialStateMismatches.giantMissing.push(crop.id)
    if (!crop.giantCropEligible && stateExists(entry, '巨型成熟')) specialStateMismatches.giantUnexpected.push(crop.id)
  }

  for (const crop of cropDefs) {
    if (!groups.has(crop.name)) unmappedCrops.push(crop)
  }

  manifest.stats = {
    totalFiles,
    runtimeFileRefs,
    cropDefs: cropDefs.length,
    assetCropNames: groups.size,
    mappedCrops: Object.keys(manifest.byCropId).length,
    missingBasicStateCrops: Object.keys(missingBasicStates).length,
    missingVariantEntries: Object.keys(missingVariants).length,
    invalidFiles: invalidFiles.length,
    duplicates: duplicates.length,
  }

  const qaReport = {
    version,
    generatedAt,
    source: sourceDir,
    manifest: manifestPath,
    basePath: BASE_PATH,
    sizeDirs: SIZE_DIRS,
    totalFiles,
    runtimeFileRefs,
    missingSizeDirs,
    cropDefs: cropDefs.length,
    assetCropNames: groups.size,
    mappedCrops: Object.keys(manifest.byCropId).length,
    unmappedCrops,
    extraAssetNames,
    missingBasicStates,
    missingVariants,
    specialStateMismatches,
    invalidFiles,
    duplicates,
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  fs.writeFileSync(qaReportPath, `${JSON.stringify(qaReport, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    manifest: manifestPath,
    qaReport: qaReportPath,
    files: totalFiles,
    cropMapped: `${Object.keys(manifest.byCropId).length}/${cropDefs.length}`,
    missingBasicStateCrops: Object.keys(missingBasicStates).length,
    missingVariantEntries: Object.keys(missingVariants).length,
    specialStateMismatches: Object.values(specialStateMismatches).reduce((sum, list) => sum + list.length, 0),
  }, null, 2))
}

main()
