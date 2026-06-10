/* global console */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const read = relativePath => readFileSync(path.join(projectRoot, relativePath), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const storeSource = read('src/stores/useSecretNoteStore.ts')
const noteSource = read('src/data/secretNotes.ts')
const timeSource = read('src/data/timeConstants.ts')

assert(
  /TAB_TO_LOCATION_GROUP/.test(storeSource),
  'Secret note verification must use the shared navigation panel -> location-group map.'
)
assert(
  /getRequiredPanelLocationGroup/.test(storeSource),
  'Secret note verification must normalize requiredPanel before checking currentLocationGroup.'
)
assert(
  !/currentLocationGroup\s*!==\s*verification\.requiredPanel/.test(storeSource),
  'Secret note verification must not compare currentLocationGroup directly with requiredPanel.'
)

const requiredPanels = [...noteSource.matchAll(/requiredPanel:\s*'([^']+)'/g)].map(match => match[1])
assert(requiredPanels.length > 0, 'Secret note data must contain requiredPanel verification cases.')

const mappedPanels = new Set(
  [...timeSource.matchAll(/^\s*'?([a-zA-Z0-9_-]+)'?:\s*'(farm|village_area|nature|mine|hanhai|frontier)'/gm)]
    .map(match => match[1])
)

for (const panel of new Set(requiredPanels)) {
  assert(mappedPanels.has(panel), `requiredPanel "${panel}" must exist in TAB_TO_LOCATION_GROUP.`)
}

for (const panel of ['forage', 'fishing', 'mining', 'village']) {
  assert(requiredPanels.includes(panel), `Secret note QA should keep coverage for "${panel}" verification.`)
}

console.log('qa-secret-note-verification-guards: ok')
