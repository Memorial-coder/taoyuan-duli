/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const museumViewPath = path.join(projectRoot, 'src', 'views', 'game', 'MuseumView.vue')
const source = fs.readFileSync(museumViewPath, 'utf8')
const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

assert(
  source.includes('getScholarCommissionUnlockHint(commission)'),
  'MuseumView must render scholar commission unlock hints for locked commissions.'
)
assert(
  source.includes('开放条件：展陈等级 ${museumStore.exhibitLevel}/${commission.unlockExhibitLevel}'),
  'Scholar commission unlock hints must include current and required exhibit level.'
)
assert(
  source.includes('捐赠 ${museumStore.donatedCount}/${commission.requiredDonationCount}'),
  'Scholar commission unlock hints must include current and required donation count.'
)
assert(
  source.includes('${getHallLabel(commission.hallZoneId)} Lv.${commission.hallLevel}/${commission.requiredHallLevel}'),
  'Scholar commission unlock hints must include current and required hall level.'
)
assert(
  source.includes('!commission.isAvailable && !commission.isAccepted && !commission.isRewardPending'),
  'Scholar commission unlock hints should only show for locked commissions.'
)

if (errors.length > 0) {
  console.error('Museum scholar commission unlock hint QA failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Museum scholar commission unlock hint QA passed.')
