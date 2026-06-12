import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')

const checks = []

const addCheck = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail })
}

const regionTypes = read('src/types/region.ts')
const regionData = read('src/data/regions.ts')
const regionStore = read('src/stores/useRegionMapStore.ts')
const regionView = read('src/views/game/RegionMapView.vue')
const openWorldComponent = read('src/components/game/regionMap/RegionOpenWorldMap.vue')

addCheck('RegionMapSaveData has openWorld field', /interface RegionMapSaveData[\s\S]*openWorld:\s*RegionOpenWorldSaveData/.test(regionTypes))
addCheck('Open world save type exists', /interface RegionOpenWorldSaveData/.test(regionTypes))
addCheck('Open world defs exported', /export const REGION_OPEN_WORLD_DEFS/.test(regionData))

for (const regionId of ['taoyuan_outskirts', 'ancient_road', 'mirage_marsh', 'cloud_highland']) {
  addCheck(`Open world region exists: ${regionId}`, regionData.includes(`id: '${regionId}'`))
}

addCheck('Default region save includes openWorld', /openWorld:\s*createDefaultRegionOpenWorldSaveData\(\)/.test(regionData))
addCheck('createDefaultRegionOpenWorldSaveData exported', /export const createDefaultRegionOpenWorldSaveData/.test(regionData))
addCheck('Store imports open world defs', /REGION_OPEN_WORLD_DEFS/.test(regionStore))
addCheck('Store serializes openWorld', /openWorld:\s*cloneOpenWorldSaveData\(saveData\.value\.openWorld\)/.test(regionStore))
addCheck('Store normalizes missing openWorld on deserialize', /const openWorld = normalizeOpenWorldSaveData\(data\.openWorld\)/.test(regionStore))
addCheck('Store writes openWorld into saveData', /saveData\.value = \{[\s\S]*openWorld,[\s\S]*weeklyFocusState/.test(regionStore))
addCheck('Legacy progress migrates into open world', /migrateLegacyProgressIntoOpenWorld\(routeStates,\s*eventStates,\s*bossClearCounts,\s*campStates\)/.test(regionStore))

for (const api of [
  'ensureOpenWorldState',
  'setActiveOpenWorldRegion',
  'selectOpenWorldTile',
  'moveOpenWorldPlayer',
  'performOpenWorldAction',
  'refreshOpenWorldDailyEcology',
  'getOpenWorldRegionView',
  'getOpenWorldTileView'
]) {
  addCheck(`Store exposes ${api}`, new RegExp(`\\b${api}\\b`).test(regionStore))
}

addCheck('Daily ecology refresh is idempotent', /lastRefreshDayTag === dayTag/.test(regionStore))
addCheck('Reveal radius uses grid-neighbor distance', /Math\.max\(Math\.abs\(tile\.x - center\.x\), Math\.abs\(tile\.y - center\.y\)\) <= safeRadius/.test(regionData) && /Math\.max\(Math\.abs\(a\.x - b\.x\), Math\.abs\(a\.y - b\.y\)\)/.test(regionStore))
addCheck('Movement does not consume stamina', /const moveOpenWorldPlayer[\s\S]*移动不消耗体力和时间/.test(regionStore))
addCheck('Action checks stamina before consuming', /playerStore\.stamina < tile\.staminaCost[\s\S]*playerStore\.consumeStamina/.test(regionStore))
addCheck('Action checks inventory before rewards', /inventoryStore\.canAddItems\(rewardItems\)[\s\S]*inventoryStore\.addItemsExact\(rewardItems\)/.test(regionStore))
addCheck('Failed inventory action does not mark tile', /背包空间不足[\s\S]*没有标记格子完成/.test(regionStore))

for (const testId of [
  'region-open-world-map',
  'region-open-world-grid',
  'region-open-world-tile-',
  'region-open-world-player',
  'region-open-world-action-',
  'region-open-world-handbook',
  'region-open-world-log'
]) {
  addCheck(`Component has test id ${testId}`, openWorldComponent.includes(testId))
}

addCheck('RegionMapView imports RegionOpenWorldMap', /import RegionOpenWorldMap/.test(regionView))
addCheck('RegionMapView renders open world before old tabs', regionView.indexOf('<RegionOpenWorldMap') >= 0 && regionView.indexOf('<RegionOpenWorldMap') < regionView.indexOf('data-testid="region-map-tabs"'))
addCheck('RegionMapView allows outskirts before old unlock', /近郊 \/ 竹林已可探索/.test(regionView))
addCheck('RegionMapView refreshes open world by day', /ensureOpenWorldState\(currentDayTag\.value\)/.test(regionView))
addCheck('RegionMapView handles open world passout', /handlePerformOpenWorldAction[\s\S]*handleRegionActionEndDay\(result\)/.test(regionView))

const failed = checks.filter(check => !check.ok)

for (const check of checks) {
  const prefix = check.ok ? 'PASS' : 'FAIL'
  console.log(`${prefix} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length} open world guard check(s) failed.`)
  process.exit(1)
}

console.log(`\n${checks.length} open world guard checks passed.`)
