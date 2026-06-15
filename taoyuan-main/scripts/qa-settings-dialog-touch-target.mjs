import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const settingsDialogSource = readSource('src/components/game/SettingsDialog.vue')
const settingsStoreSource = readSource('src/stores/useSettingsStore.ts')
const desktopLayoutSmokeSource = readSource('scripts/qa-desktop-layout-smoke.mjs')
const packageJson = JSON.parse(readSource('package.json'))

const block = (selector, message) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = settingsDialogSource.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\s*\\}`))
  assert.ok(match, message)
  return match[0]
}

assert.match(settingsDialogSource, /data-testid="settings-dialog-close"/, 'settings close button should expose a stable test id')
assert.match(settingsDialogSource, /class="settings-dialog-close"/, 'settings close button should use the touch-target class')
assert.match(settingsDialogSource, /@click\.stop="\$emit\('close'\)"/, 'settings close button should stop click bubbling before close')
assert.match(settingsStoreSource, /export const PAGE_WIDTH_PERCENT_STEP = 1\b/, 'page width custom control should support 1% steps')
assert.match(settingsDialogSource, /@click="settingsStore\.changePageWidthPercent\(-PAGE_WIDTH_PERCENT_STEP\)"/, 'page width decrease button should use the shared step')
assert.match(settingsDialogSource, /@click="settingsStore\.changePageWidthPercent\(PAGE_WIDTH_PERCENT_STEP\)"/, 'page width increase button should use the shared step')
assert.match(settingsDialogSource, /:step="PAGE_WIDTH_PERCENT_STEP"/, 'page width range should use the shared step')

const closeButtonBlock = block('.settings-dialog-close', 'settings close button CSS should exist')
assert.match(closeButtonBlock, /width:\s*44px/, 'settings close button should be at least 44px wide')
assert.match(closeButtonBlock, /min-width:\s*44px/, 'settings close button should keep a 44px minimum width')
assert.match(closeButtonBlock, /height:\s*44px/, 'settings close button should be at least 44px tall')
assert.match(closeButtonBlock, /min-height:\s*44px/, 'settings close button should keep a 44px minimum height')
assert.match(closeButtonBlock, /z-index:\s*20/, 'settings close button should stay above dialog content')
assert.match(closeButtonBlock, /touch-action:\s*manipulation/, 'settings close button should avoid delayed or ambiguous mobile taps')

const shellBlock = block('.settings-dialog-shell', 'settings dialog shell CSS should exist')
assert.match(shellBlock, /display:\s*flex/, 'settings dialog shell should be a flex column')
assert.match(shellBlock, /max-height:\s*calc\(100dvh/, 'settings dialog shell should respect dynamic viewport height')
assert.match(shellBlock, /overflow:\s*hidden/, 'settings dialog shell should keep scrolling inside the body area')

const bodyBlock = block('.settings-dialog-body', 'settings dialog body CSS should exist')
assert.match(bodyBlock, /min-height:\s*0/, 'settings dialog body should be allowed to shrink in a flex shell')
assert.match(bodyBlock, /overflow-y:\s*auto/, 'settings dialog body should scroll instead of pushing the close button offscreen')

assert.match(desktopLayoutSmokeSource, /getByTestId\('settings-dialog-close'\)/, 'desktop layout smoke should click the stable close button target')
assert.equal(
  packageJson.scripts?.['qa:settings-dialog-touch-target'],
  'node scripts/qa-settings-dialog-touch-target.mjs',
  'package.json should register qa:settings-dialog-touch-target'
)

console.log('qa-settings-dialog-touch-target passed')
