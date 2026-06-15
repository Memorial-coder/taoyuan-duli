/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const readSource = (...segments) => fs.readFileSync(path.join(srcRoot, ...segments), 'utf8')

const farmViewSource = readSource('views', 'game', 'FarmView.vue')
const farmActionsSource = readSource('composables', 'useFarmActions.ts')

assert.match(
  farmViewSource,
  /目前季节剩余天数不足以成熟，是否确认种植？/,
  'FarmView should show the pre-planting season risk confirmation copy'
)
assert.match(
  farmViewSource,
  /const plantSeasonRiskConfirm = ref<PlantSeasonRiskConfirm \| null>\(null\)/,
  'FarmView should keep a pending season-risk confirmation state'
)
assert.match(
  farmViewSource,
  /const getOutdoorCropMaturityDays = \([\s\S]*getFertilizerById\(plot\.fertilizer\)[\s\S]*currentCropGrowthBonus\.value[\s\S]*Math\.floor\(crop\.growthDays \* \(1 - speedup\)\)/,
  'season risk should use the same fertilizer and growth-bonus maturity days as the field UI'
)
assert.match(
  farmViewSource,
  /const doBatchPlant = \(cropId: string\) => \{[\s\S]*requestPlantSeasonRiskConfirm\(cropId, targets, \{ type: 'batch', cropId \}\)[\s\S]*handleBatchPlant\(cropId\)/,
  'field batch planting should request confirmation before planting'
)
assert.match(
  farmViewSource,
  /const doBatchPlantBreeding = \(cropId: string\) => \{[\s\S]*requestPlantSeasonRiskConfirm\(cropId, targets\.slice\(0, seeds\.length\), \{ type: 'batchBreeding', cropId \}\)[\s\S]*let planted = 0/,
  'field breeding batch planting should request confirmation before stamina or seed consumption'
)
assert.match(
  farmViewSource,
  /const doPlant = \(cropId: string, quality\?: Quality\) => \{[\s\S]*requestPlantSeasonRiskConfirm\(cropId, \[plot\], \{ type: 'single', plotId, cropId, quality \}\)[\s\S]*handlePlotClick\(plotId\)/,
  'single field planting should request confirmation before handlePlotClick consumes resources'
)
assert.match(
  farmViewSource,
  /const doPlantGeneticSeed = \(seedId: string\) => \{[\s\S]*requestPlantSeasonRiskConfirm\(seed\.genetics\.cropId, \[plot\], \{ type: 'singleBreeding', plotId, seedId \}\)[\s\S]*playerStore\.consumeStamina\(cost/,
  'single breeding seed planting should request confirmation before stamina consumption'
)
assert.doesNotMatch(
  farmActionsSource,
  /本季仅剩|换季后将枯萎|种植预警：作物可能无法在本季成熟/,
  'post-planting season risk warning should not remain in useFarmActions'
)

console.log('qa-farm-season-risk-confirm passed')
