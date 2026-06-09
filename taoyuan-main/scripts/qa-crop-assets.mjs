import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cropDir = path.join(projectRoot, 'public', 'crop')
const manifestPath = path.join(cropDir, 'crop-asset-manifest.json')
const qaReportPath = path.join(cropDir, 'crop-asset-qa-report.json')

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'))
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const assertIncludes = (source, fragment, message) => assert(source.includes(fragment), message)

try {
  const manifest = readJson(manifestPath)
  const report = readJson(qaReportPath)
  const farmView = readSource('src/views/game/FarmView.vue')
  const settingsStore = readSource('src/stores/useSettingsStore.ts')
  const cropManifestSource = readSource('src/composables/useCropAssetManifest.ts')
  const cropImageSource = readSource('src/components/game/CropImage.vue')
  const cropPreferenceSource = readSource('src/composables/useCropImagePreferences.ts')
  const itemIconPreferenceSource = readSource('src/composables/useItemIconPreferences.ts')
  const npcPortraitPreferenceSource = readSource('src/composables/useNpcPortraitPreferences.ts')
  const variantPickerSource = readSource('src/components/game/CropImageVariantPicker.vue')
  const serverIndex = fs.readFileSync(path.resolve(projectRoot, '../server/src/index.js'), 'utf8')

  assert(manifest.basePath === '/crop', 'manifest basePath must be /crop')
  assert(manifest.defaultVariant === '01', 'manifest default variant must be 01')
  assert(Array.isArray(manifest.sizes) && manifest.sizes.includes(128) && manifest.sizes.includes(256), 'manifest must include 128 and 256 sizes')
  assert(Object.keys(manifest.byCropId || {}).length === report.cropDefs, `manifest must map all ${report.cropDefs} crop ids`)
  assert(Object.keys(manifest.byName || {}).length === report.cropDefs, `manifest must map all ${report.cropDefs} crop names`)
  assert(report.mappedCrops === report.cropDefs, `QA report must map all ${report.cropDefs} crops`)
  assert(report.unmappedCrops.length === 0, 'QA report must have no unmapped crops')
  assert(report.extraAssetNames.length === 0, 'QA report must have no extra asset names')
  assert(Object.keys(report.missingBasicStates).length === 0, 'QA report must have no missing basic states')
  assert(Object.values(report.specialStateMismatches).every(list => list.length === 0), 'QA report must have no special-state mismatches')

  assertIncludes(cropManifestSource, "if (plot.infested) return '虫害'", 'visual priority must put pest first')
  assertIncludes(cropManifestSource, "if (plot.weedy) return '杂草'", 'visual priority must put weed second')
  assertIncludes(cropManifestSource, "return '缺水'", 'visual priority must include water-missing before growth')
  assertIncludes(cropManifestSource, "return '已施肥'", 'visual priority must include fertilized before watered')
  assertIncludes(cropManifestSource, "return crop.deepWatering ? '深灌水泽' : '已浇水'", 'visual priority must include watered/deep watering state')
  assertIncludes(cropManifestSource, "return plot.giantCropGroup !== null ? '巨型成熟' : '成熟可收获'", 'visual priority must include mature fallback')

  assertIncludes(settingsStore, "export type FarmPlotDisplayMode = 'classic' | 'image'", 'settings store must define farm plot display mode')
  assertIncludes(settingsStore, 'farmPlotDisplayMode', 'settings store must serialize farm plot display mode')
  assertIncludes(farmView, 'CropImage', 'FarmView must render CropImage')
  assertIncludes(farmView, 'CropImageVariantPicker', 'FarmView must expose crop variant picker')
  assertIncludes(farmView, "settingsStore.farmPlotDisplayMode === 'image'", 'FarmView must branch on image display mode')
  assertIncludes(farmView, 'fallback-mode="label"', 'FarmView crop image tiles must keep readable fallback labels')
  assertIncludes(cropImageSource, 'loadCropAssetManifest', 'CropImage must load crop manifest')
  assertIncludes(cropImageSource, "fallbackMode?: 'glyph' | 'label'", 'CropImage must support readable fallback mode')
  assertIncludes(variantPickerSource, "const variants: CropAssetVariant[] = ['01', '02']", 'variant picker must expose 01 and 02')
  for (const [label, source] of [
    ['crop image preferences', cropPreferenceSource],
    ['item icon preferences', itemIconPreferenceSource],
    ['npc portrait preferences', npcPortraitPreferenceSource],
  ]) {
    assertIncludes(source, 'buildScopedSingleKey', `${label} must use account-scoped local storage`)
    assertIncludes(source, 'migrateLegacySingleValue', `${label} must migrate legacy unscoped preferences`)
    assertIncludes(source, 'replacePreferences', `${label} must replace server preferences instead of merging stale keys`)
    assertIncludes(source, 'loadedStorageKey', `${label} must reload when account scope changes`)
  }
  assertIncludes(serverIndex, "app.use('/crop'", 'server must mount /crop static assets')
  assertIncludes(serverIndex, 'TAOYUAN_CROP_ASSET_DIR', 'server must support TAOYUAN_CROP_ASSET_DIR')

  console.log('[qa-crop-assets] OK')
} catch (error) {
  console.error('[qa-crop-assets] FAILED')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
