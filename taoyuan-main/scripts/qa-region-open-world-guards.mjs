/* global process, console */
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

const readNumberConst = name => Number(regionData.match(new RegExp(`const ${name} = (\\d+)`))?.[1] ?? 0)

addCheck('RegionMapSaveData has openWorld field', /interface RegionMapSaveData[\s\S]*openWorld:\s*RegionOpenWorldSaveData/.test(regionTypes))
addCheck('Open world save type exists', /interface RegionOpenWorldSaveData/.test(regionTypes))
addCheck('Open world camera type exists', /interface RegionOpenWorldViewportCamera[\s\S]*x:\s*number[\s\S]*y:\s*number/.test(regionTypes))
addCheck('Open world viewport size type exists', /interface RegionOpenWorldViewportSize[\s\S]*columns:\s*number[\s\S]*rows:\s*number/.test(regionTypes))
addCheck('Open world tile view exposes boss CTA state', /interface RegionOpenWorldBossCta[\s\S]*bossId:\s*string[\s\S]*available:\s*boolean[\s\S]*actionLabel:\s*string/.test(regionTypes) && /interface RegionOpenWorldTileView[\s\S]*bossCta:\s*RegionOpenWorldBossCta \| null/.test(regionTypes))
addCheck('Open world window view exposes camera and visible size', /interface RegionOpenWorldRegionWindowView[\s\S]*camera:\s*RegionOpenWorldViewportCamera[\s\S]*visibleColumnCount:\s*number[\s\S]*visibleRowCount:\s*number/.test(regionTypes))
const openWorldSaveType = regionTypes.match(/interface RegionOpenWorldSaveData \{[\s\S]*?\n\}/)?.[0] ?? ''
addCheck('Open world camera stays out of save data', !/\bcamera\b/.test(openWorldSaveType) && !/\bviewport\b/.test(openWorldSaveType))
addCheck('Open world defs exported', /export const REGION_OPEN_WORLD_DEFS/.test(regionData))

for (const regionId of ['taoyuan_outskirts', 'ancient_road', 'mirage_marsh', 'cloud_highland']) {
  addCheck(`Open world region exists: ${regionId}`, regionData.includes(`id: '${regionId}'`))
}

const largeMapWidth = readNumberConst('OPEN_WORLD_LARGE_MAP_WIDTH')
const largeMapHeight = readNumberConst('OPEN_WORLD_LARGE_MAP_HEIGHT')
addCheck('Open world grids have at least 100 selectable slots', largeMapWidth * largeMapHeight >= 100, `${largeMapWidth}x${largeMapHeight}`)
addCheck('Open world uses generated empty tiles', /const createOpenWorldEmptyTile/.test(regionData) && /createOpenWorldLargeRegionTiles/.test(regionData))
addCheck('Outskirts uses large generated map', /id:\s*'taoyuan_outskirts'[\s\S]*width:\s*OPEN_WORLD_LARGE_MAP_WIDTH[\s\S]*height:\s*OPEN_WORLD_LARGE_MAP_HEIGHT[\s\S]*tiles:\s*createOpenWorldLargeRegionTiles/.test(regionData))
addCheck('Outskirts keeps legacy key tile ids', [
  'outskirts:village_gate',
  'outskirts:bamboo_1',
  'outskirts:herb_1',
  'outskirts:wild_tree',
  'outskirts:shallow_chest',
  'outskirts:hare_trace',
  'outskirts:fallen_branch',
  'outskirts:quiet_outpost',
  'outskirts:story_bamboo_path',
  'outskirts:forest_edge'
].every(tileId => regionData.includes(tileId)))

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
addCheck('Daily ecology refresh only walks sparse tile states', /Object\.entries\(regionState\.tileStates\)/.test(regionStore) && !/const refreshOpenWorldDailyEcology[\s\S]*for \(const tile of def\.tiles\)/.test(regionStore))
addCheck('Reveal radius uses bounded grid-neighbor lookup', /getOpenWorldTileDefAtCoord\(regionId,\s*x,\s*y\)/.test(regionStore) && /Math\.max\(Math\.abs\(a\.x - b\.x\), Math\.abs\(a\.y - b\.y\)\)/.test(regionStore))
const moveOpenWorldPlayerBlock = regionStore.match(/const moveOpenWorldPlayer[\s\S]*?\n {2}const performOpenWorldAction/)?.[0] ?? ''
addCheck('Movement consumes distance-based stamina', /OPEN_WORLD_MOVE_TILES_PER_STAMINA\s*=\s*5/.test(regionStore) && /Math\.hypot\(a\.x - b\.x,\s*a\.y - b\.y\)/.test(regionStore) && /Math\.ceil\(distance \/ OPEN_WORLD_MOVE_TILES_PER_STAMINA\)/.test(regionStore))
addCheck('Movement consumes stamina before changing player tile', moveOpenWorldPlayerBlock.includes('playerStore.consumeStamina(staminaCost)') && moveOpenWorldPlayerBlock.indexOf('playerStore.consumeStamina(staminaCost)') < moveOpenWorldPlayerBlock.indexOf('regionState.playerTileId = tileId'))
addCheck('Tile view exposes move stamina preview', /moveDistance/.test(regionTypes) && /moveStaminaCost/.test(regionTypes) && /moveStaminaCost/.test(regionStore))
addCheck('Tile view builds boss CTA from boss landmark', /getOpenWorldBossCta/.test(regionStore) && /tile\.objectType !== 'boss_landmark'/.test(regionStore) && /getBossExpeditionStatus\(region\.id\)/.test(regionStore) && /actionLabel: status\.available \?/.test(regionStore))
addCheck('Open world view uses overscan render bounds', /OPEN_WORLD_VIEWPORT_OVERSCAN\s*=\s*1/.test(regionStore) && /Math\.floor\(cameraX\) - OPEN_WORLD_VIEWPORT_OVERSCAN/.test(regionStore) && /Math\.ceil\(cameraX \+ visibleColumnCount\) \+ OPEN_WORLD_VIEWPORT_OVERSCAN/.test(regionStore))
addCheck('Open world view accepts measured viewport size', /RegionOpenWorldViewportSize/.test(regionStore) && /normalizeOpenWorldViewportCount/.test(regionStore) && /viewportSize\?\.columns/.test(regionStore) && /viewportSize\?\.rows/.test(regionStore))
addCheck('Open world region view returns bounded tile window', /for \(let y = bounds\.minY; y <= bounds\.maxY; y \+= 1\)/.test(regionStore) && /for \(let x = bounds\.minX; x <= bounds\.maxX; x \+= 1\)/.test(regionStore) && !/visibleTiles\s*=\s*def\.tiles/.test(regionStore))
addCheck('Action checks stamina before consuming', /playerStore\.stamina < tile\.staminaCost[\s\S]*playerStore\.consumeStamina/.test(regionStore))
addCheck('Action checks inventory before rewards', /inventoryStore\.canAddItems\(rewardItems\)[\s\S]*inventoryStore\.addItemsExact\(rewardItems\)/.test(regionStore))
addCheck('Failed inventory action does not mark tile', /背包空间不足[\s\S]*没有标记格子完成/.test(regionStore))

for (const testId of [
  'region-open-world-map',
  'region-open-world-grid',
  'region-open-world-tile-',
  'region-open-world-player',
  'region-open-world-player-indicator',
  'region-open-world-focus-current',
  'region-open-world-zoom-in',
  'region-open-world-zoom-out',
  'region-open-world-tile-dialog',
  'region-open-world-tile-dialog-close',
  'region-open-world-tile-dialog-move',
  'region-open-world-tile-dialog-action-',
  'region-open-world-action-',
  'region-open-world-boss-action-',
  'region-open-world-tile-dialog-boss-action-',
  'region-open-world-handbook',
  'region-open-world-log'
]) {
  addCheck(`Component has test id ${testId}`, openWorldComponent.includes(testId))
}
addCheck('Component emits viewport pan from pointer drag', /@pointerdown="handleGridPointerDown"/.test(openWorldComponent) && /emit\('pan-viewport'/.test(openWorldComponent))
addCheck('Component uses continuous camera viewport shell', /data-testid="region-open-world-viewport"/.test(openWorldComponent) && /class="region-open-world-grid"[\s\S]*:style="gridStyle"/.test(openWorldComponent) && /transform:\s*`translate3d/.test(openWorldComponent))
addCheck('Component derives viewport size from scaled tile dimensions', /TILE_WIDTH_PX/.test(openWorldComponent) && /TILE_HEIGHT_PX/.test(openWorldComponent) && /zoomedTileStepX/.test(openWorldComponent) && /ResizeObserver/.test(openWorldComponent) && /emit\('viewport-size'/.test(openWorldComponent))
addCheck('Component drag pan emits float tile deltas', /const deltaX = -dragX \/ cell\.width/.test(openWorldComponent) && /const deltaY = -dragY \/ cell\.height/.test(openWorldComponent) && /emit\('pan-viewport', \{ deltaX, deltaY \}\)/.test(openWorldComponent))
addCheck('Component no longer truncates drag to full tiles', !/Math\.trunc\([^)]*cell\.(width|height)/.test(openWorldComponent) && !/\bpendingX\b/.test(openWorldComponent) && !/\bpendingY\b/.test(openWorldComponent))
addCheck('Component suppresses drag click selection', /handleGridClickCapture/.test(openWorldComponent) && /suppressNextClick/.test(openWorldComponent))
addCheck('Component renders animated player marker overlay', /playerTokenStyle/.test(openWorldComponent) && /transition:\s*left 0\.26s ease,\s*top 0\.26s ease/.test(openWorldComponent))
addCheck('Component renders offscreen current-position affordance', /playerOffscreenIndicatorVisible/.test(openWorldComponent) && /playerOffscreenIndicatorStyle/.test(openWorldComponent) && /focus-current/.test(openWorldComponent))
addCheck('Component keeps offscreen current-position indicator clear of zoom controls', /PLAYER_INDICATOR_ZOOM_COLLISION_X_PERCENT/.test(openWorldComponent) && /PLAYER_INDICATOR_ZOOM_COLLISION_Y_PERCENT/.test(openWorldComponent) && /PLAYER_INDICATOR_ZOOM_CONTROL_CLEARANCE/.test(openWorldComponent) && /calc\(100% - \$\{PLAYER_INDICATOR_ZOOM_CONTROL_CLEARANCE\}\)/.test(openWorldComponent))
addCheck('Component shows move stamina on move button', /selectedTile\.moveStaminaCost > 0/.test(openWorldComponent) && /selectedTile\.moveStaminaCost/.test(openWorldComponent))
addCheck('Component opens tile detail dialog from tile clicks', /@click="handleTileClick\(tile\.id\)"/.test(openWorldComponent) && /const handleTileClick = \(tileId: string\)/.test(openWorldComponent) && /emit\('select-tile', tileId\)/.test(openWorldComponent) && /tileDetailDialogOpen\.value = true/.test(openWorldComponent))
addCheck('Component renders accessible tile detail dialog', /v-if="tileDetailDialogOpen && selectedTile"/.test(openWorldComponent) && /data-testid="region-open-world-tile-dialog"/.test(openWorldComponent) && /role="dialog"/.test(openWorldComponent) && /aria-modal="true"/.test(openWorldComponent) && /:aria-labelledby="tileDetailDialogTitleId"/.test(openWorldComponent) && /@click\.self="closeTileDetailDialog"/.test(openWorldComponent) && /handleTileDetailDialogKeydown/.test(openWorldComponent))
addCheck('Component keeps tile dialog actions on existing event contract', /const handleTileDialogMove = \(\) => \{[\s\S]*emit\('move', tile\.id\)[\s\S]*closeTileDetailDialog\(\)/.test(openWorldComponent) && /const handleTileDialogAction = \(\) => \{[\s\S]*emit\('perform-action', tile\.id, tile\.actionId\)[\s\S]*closeTileDetailDialog\(\)/.test(openWorldComponent))
addCheck('Component routes boss landmark CTA through challenge-boss event', /bossCta/.test(openWorldComponent) && /event: 'challenge-boss'/.test(openWorldComponent) && /region-open-world-boss-action-/.test(openWorldComponent) && /handleTileDialogBossAction/.test(openWorldComponent) && /emit\('challenge-boss', tile\.id, tile\.bossCta\.bossId\)/.test(openWorldComponent))
addCheck('Component styles tile dialog for desktop and mobile', /\.region-open-world-tile-dialog-shell/.test(openWorldComponent) && /@media \(max-width: 767px\)[\s\S]*\.region-open-world-tile-dialog-overlay[\s\S]*align-items: flex-end/.test(openWorldComponent))
addCheck('Component imports zoom and dialog icons', /MapPin,\s*Minus,\s*Plus,\s*X/.test(openWorldComponent))
addCheck('Component exposes bounded open world zoom state', /const ZOOM_MIN\s*=\s*0\.5/.test(openWorldComponent) && /const ZOOM_MAX\s*=\s*1\.6/.test(openWorldComponent) && /const ZOOM_STEP\s*=\s*0\.15/.test(openWorldComponent) && /const zoomLevel = ref\(1\)/.test(openWorldComponent) && /const canZoomIn/.test(openWorldComponent) && /const canZoomOut/.test(openWorldComponent))
addCheck('Component renders desktop and mobile zoom buttons', /class="region-open-world-zoom-controls"/.test(openWorldComponent) && /data-testid="region-open-world-zoom-in"/.test(openWorldComponent) && /data-testid="region-open-world-zoom-out"/.test(openWorldComponent) && /:disabled="!canZoomIn"/.test(openWorldComponent) && /:disabled="!canZoomOut"/.test(openWorldComponent) && /\.region-open-world-zoom-button:focus-visible/.test(openWorldComponent) && /@media \(max-width: 767px\)[\s\S]*\.region-open-world-zoom-button/.test(openWorldComponent))
addCheck('Component zooms open world viewport with desktop wheel', /@wheel="handleGridWheel"/.test(openWorldComponent) && /const handleGridWheel = \(event: WheelEvent\)/.test(openWorldComponent) && /event\.deltaY === 0/.test(openWorldComponent) && /event\.preventDefault\(\)/.test(openWorldComponent) && /setZoomLevel\(zoomLevel\.value \+ \(event\.deltaY < 0 \? ZOOM_STEP : -ZOOM_STEP\)\)/.test(openWorldComponent))
addCheck('Component applies zoomed tile metrics to grid and viewport', /gridTemplateColumns:[\s\S]*zoomedTileWidth\.value/.test(openWorldComponent) && /gridTemplateRows:[\s\S]*zoomedTileHeight\.value/.test(openWorldComponent) && /getVisibleTileCount\(rect\.width,\s*zoomedTileStepX\.value,\s*zoomedTileGap\.value/.test(openWorldComponent) && /width:\s*zoomedTileStepX\.value/.test(openWorldComponent))
addCheck('Component scales tile contents with zoom level', /'--region-open-world-zoom': `\$\{zoomLevel\.value\}`/.test(openWorldComponent) && /padding:\s*calc\(0\.25rem \* var\(--region-open-world-zoom, 1\)\)/.test(openWorldComponent) && /font-size:\s*calc\(0\.625rem \* var\(--region-open-world-zoom, 1\)\)/.test(openWorldComponent) && /font-size:\s*calc\(0\.55rem \* var\(--region-open-world-zoom, 1\)\)/.test(openWorldComponent))
addCheck('Component keeps player marker aligned to zoomed grid', /playerTokenStyle[\s\S]*zoomedTileStepX\.value[\s\S]*zoomedTileWidth\.value \/ 2[\s\S]*zoomedTileStepY\.value[\s\S]*zoomedTileHeight\.value \/ 2/.test(openWorldComponent))
addCheck('Component handles pinch zoom without tile selection', /activePointerPositions/.test(openWorldComponent) && /pinchState/.test(openWorldComponent) && /startPinchGesture/.test(openWorldComponent) && /handlePinchMove/.test(openWorldComponent) && /setZoomLevel\(state\.startZoom \* \(distance \/ state\.startDistance\)\)/.test(openWorldComponent) && /suppressNextClick\.value = true/.test(openWorldComponent))

addCheck('RegionMapView imports RegionOpenWorldMap', /import RegionOpenWorldMap/.test(regionView))
addCheck('RegionMapView renders open world before old tabs', regionView.indexOf('<RegionOpenWorldMap') >= 0 && regionView.indexOf('<RegionOpenWorldMap') < regionView.indexOf('data-testid="region-map-tabs"'))
addCheck('RegionMapView handles viewport pan event', /@pan-viewport="handlePanOpenWorldViewport"/.test(regionView) && /const handlePanOpenWorldViewport/.test(regionView))
addCheck('RegionMapView handles measured viewport size event', /@viewport-size="handleOpenWorldViewportSize"/.test(regionView) && /openWorldViewportSizes/.test(regionView) && /getOpenWorldViewportSize/.test(regionView))
addCheck('RegionMapView handles focus current event', /@focus-current="handleFocusCurrentOpenWorldTile"/.test(regionView) && /const handleFocusCurrentOpenWorldTile/.test(regionView) && /view\.state\.playerTileId/.test(regionView))
addCheck('RegionMapView starts boss expedition from open world boss landmark', /@challenge-boss="handleOpenWorldBossChallenge"/.test(regionView) && /const handleOpenWorldBossChallenge/.test(regionView) && /startBossExpeditionSession\(bossRegion/.test(regionView))
addCheck('RegionMapView no longer exposes old primary boss button copy', !/>\s*发起首领远征\s*<\/button>/.test(regionView) && /请在上方开放行旅地图中点选“首”地标/.test(regionView))
addCheck('RegionMapView allows outskirts before old unlock', /近郊 \/ 竹林已可探索/.test(regionView))
addCheck('RegionMapView keeps temporary float cameras', /openWorldViewportCameras/.test(regionView) && /RegionOpenWorldViewportCamera/.test(regionView) && /view\.camera\.x \+ delta\.deltaX/.test(regionView) && !/openWorldViewportOrigins/.test(regionView))
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
