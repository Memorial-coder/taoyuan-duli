import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const themeSource = readSource('src/data/themes.ts')
const appCssSource = readSource('src/app.css')
const settingsDialogSource = readSource('src/components/game/SettingsDialog.vue')
const packageJson = JSON.parse(readSource('package.json'))

const contrastThemeBlock = themeSource.match(/\{\s*key: 'contrast',[\s\S]*?tone: 'light'\s*\}/)?.[0]
assert.ok(contrastThemeBlock, 'contrast theme should be registered as a light theme')

const color = name => {
  const match = contrastThemeBlock.match(new RegExp(`${name}: '([^']+)'`))
  assert.ok(match, `contrast theme should define ${name}`)
  return match[1]
}

const hexToRgb = hex => {
  const normalized = hex.replace('#', '')
  assert.match(normalized, /^[0-9a-fA-F]{6}$/, `${hex} should be a 6-digit hex color`)
  return [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16))
}

const toLinear = value => {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

const luminance = hex => {
  const [red, green, blue] = hexToRgb(hex).map(toLinear)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const contrastRatio = (foreground, background) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

assert.match(themeSource, /export type ThemeKey = 'dark' \| 'warm' \| 'ink' \| 'parchment' \| 'contrast'/, 'ThemeKey should include contrast')
assert.equal(color('name'), '高对比', 'contrast theme should have the expected player-facing label')

assert.ok(contrastRatio(color('text'), color('bg')) >= 7, 'contrast theme text should pass AAA contrast on background')
assert.ok(contrastRatio(color('muted'), color('bg')) >= 4.5, 'contrast theme muted text should pass AA contrast on background')
assert.ok(contrastRatio(color('accent'), color('bg')) >= 4.5, 'contrast theme accent text should pass AA contrast on background')
assert.ok(contrastRatio(color('text'), color('panel')) >= 7, 'contrast theme text should pass AAA contrast on panel')
assert.ok(contrastRatio(color('accent'), color('panel')) >= 4.5, 'contrast theme accent should pass AA contrast on panel')
assert.ok(contrastRatio(color('bg'), color('accent')) >= 4.5, 'contrast theme accent buttons should keep readable inverse text')

assert.match(settingsDialogSource, /v-for="t in THEMES"/, 'settings dialog should enumerate theme swatches from THEMES')
assert.match(settingsDialogSource, /settings-theme-\$\{t\.key\}/, 'settings dialog should expose stable theme test ids')
assert.ok(appCssSource.includes("html[data-theme='contrast'] .text-muted\\/50"), 'contrast theme should strengthen low-opacity muted text')
assert.ok(appCssSource.includes("html[data-theme='contrast'] .placeholder\\:text-muted\\/40::placeholder"), 'contrast theme should strengthen muted placeholders')
assert.equal(packageJson.scripts?.['qa:theme-contrast'], 'node scripts/qa-theme-contrast.mjs', 'package.json should register qa:theme-contrast')

console.log('qa-theme-contrast passed')
