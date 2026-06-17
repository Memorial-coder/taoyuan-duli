/* global console */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const themeSource = readSource('src/data/themes.ts')
const appCssSource = readSource('src/app.css')
const settingsDialogSource = readSource('src/components/game/SettingsDialog.vue')
const mobileMapMenuSource = readSource('src/components/game/MobileMapMenu.vue')
const dailyDigestSource = readSource('src/components/game/DailyDigestSummaryDialog.vue')
const aiAssistantWidgetSource = readSource('src/components/game/AiAssistantWidget.vue')
const hallViewSource = readSource('src/views/HallView.vue')
const mailViewSource = readSource('src/views/game/MailView.vue')
const announcementDialogSource = readSource('src/components/game/AnnouncementDialog.vue')
const announcementHistorySource = readSource('src/components/game/AnnouncementHistoryDialog.vue')
const playerRecordCenterSource = readSource('src/components/game/PlayerRecordCenterPanel.vue')
const mainMenuSource = readSource('src/views/MainMenu.vue')
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
assert.equal(color('name'), '澈', 'contrast theme should have the expected player-facing label')

assert.ok(contrastRatio(color('text'), color('bg')) >= 7, 'contrast theme text should pass AAA contrast on background')
assert.ok(contrastRatio(color('muted'), color('bg')) >= 4.5, 'contrast theme muted text should pass AA contrast on background')
assert.ok(contrastRatio(color('accent'), color('bg')) >= 4.5, 'contrast theme accent text should pass AA contrast on background')
assert.ok(contrastRatio(color('text'), color('panel')) >= 7, 'contrast theme text should pass AAA contrast on panel')
assert.ok(contrastRatio(color('accent'), color('panel')) >= 4.5, 'contrast theme accent should pass AA contrast on panel')
assert.ok(contrastRatio(color('bg'), color('accent')) >= 4.5, 'contrast theme accent buttons should keep readable inverse text')
assert.match(color('overlay'), /^rgba\(29,\s*42,\s*37,\s*0\.26\)$/, 'contrast theme overlay should be soft enough for light backgrounds')

assert.match(settingsDialogSource, /v-for="t in THEMES"/, 'settings dialog should enumerate theme swatches from THEMES')
assert.match(settingsDialogSource, /settings-theme-\$\{t\.key\}/, 'settings dialog should expose stable theme test ids')
assert.doesNotMatch(mobileMapMenuSource, /rgba\(255,\s*248,\s*226/, 'mobile map captions should not use hard-coded pale text on light themes')
assert.match(mobileMapMenuSource, /\.map-area-caption\s*\{[\s\S]*color:\s*rgb\(var\(--color-muted-rgb\) \/ 0\.95\)/, 'mobile map captions should use theme-muted text')
assert.match(mobileMapMenuSource, /\.map-loc-active\s*\{[\s\S]*color:\s*rgb\(var\(--color-bg\)\)/, 'mobile map active tiles should keep inverse text readable')
assert.doesNotMatch(dailyDigestSource, /rgba\(18,\s*21,\s*31,\s*0\.92\)/, 'daily digest secondary action should not keep a fixed dark background')
assert.match(dailyDigestSource, /daily-digest-action-btn--secondary[\s\S]*background:\s*var\(--color-surface-raised\)/, 'daily digest secondary action should use theme surface color')
assert.doesNotMatch(aiAssistantWidgetSource, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.(14|18|24|26|32)\)/, 'AI assistant surfaces should not keep fixed black backgrounds')
assert.match(aiAssistantWidgetSource, /\.ai-msg__bubble\s*\{[\s\S]*background:\s*var\(--color-surface-muted\)/, 'AI assistant bubbles should use theme surface color')
assert.doesNotMatch(hallViewSource, /background:\s*(?:rgb\(38,\s*40,\s*56\)|rgba\(26,\s*26,\s*26,\s*0\.(14|18|2)\)|rgba\(0,\s*0,\s*0,\s*0\.15\)|rgba\(43,\s*45,\s*60,\s*0\.65\))/, 'hall surfaces should not keep fixed dark backgrounds')
assert.match(hallViewSource, /\.hall-dropdown-panel\s*\{[\s\S]*background:\s*rgb\(var\(--color-panel\)\)/, 'hall dropdown should use theme panel color')
assert.doesNotMatch(mailViewSource, /background:\s*rgba\(15,\s*18,\s*30,\s*0\.(?:36|4|96)\)/, 'mailbox panels should not keep fixed dark backgrounds on light themes')
assert.match(mailViewSource, /--mail-panel-bg:\s*rgb\(var\(--color-panel\) \/ 0\.72\)/, 'mailbox panel surface should use theme panel color')
assert.match(mailViewSource, /--mail-card-bg:\s*var\(--color-surface-muted\)/, 'mailbox cards should use theme surface color')
assert.match(mailViewSource, /\.mail-toolbar\s*\{[\s\S]*background:\s*var\(--mail-toolbar-bg\)/, 'mailbox sticky toolbar should use theme surface color')
assert.doesNotMatch(announcementDialogSource, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.(?:08|14|18)\)/, 'announcement dialog surfaces should not keep fixed black backgrounds')
assert.match(announcementDialogSource, /\.announcement-item\s*\{[\s\S]*background:\s*var\(--color-surface-raised\)/, 'announcement dialog cards should use raised theme surface')
assert.match(announcementDialogSource, /\.announcement-item--collapsed\s*\{[\s\S]*background:\s*var\(--color-surface-muted\)/, 'collapsed announcement cards should use muted theme surface')
assert.match(announcementDialogSource, /\.announcement-image\s*\{[\s\S]*background:\s*var\(--color-surface-muted\)/, 'announcement images should use muted theme surface')
assert.doesNotMatch(announcementHistorySource, /background:\s*rgba\(16,\s*20,\s*30,\s*0\.(?:28|42)\)/, 'announcement history should not keep fixed dark backgrounds')
assert.match(announcementHistorySource, /\.announcement-history-item\s*\{[\s\S]*background:\s*var\(--color-surface-raised\)/, 'announcement history cards should use raised theme surface')
assert.match(announcementHistorySource, /\.announcement-history-item--collapsed\s*\{[\s\S]*background:\s*var\(--color-surface-muted\)/, 'collapsed announcement history cards should use muted theme surface')
assert.doesNotMatch(playerRecordCenterSource, /background:\s*rgba\(14,\s*18,\s*28,\s*0\.45\)/, 'record center empty state should not keep a fixed dark background')
assert.match(playerRecordCenterSource, /\.record-empty\s*\{[\s\S]*background:\s*var\(--color-surface-muted\)/, 'record center empty state should use muted theme surface')
assert.doesNotMatch(mainMenuSource, /background:\s*rgba\(18,\s*26,\s*18,\s*0\.22\)/, 'main menu online entry should not keep a fixed dark green background')
assert.match(mainMenuSource, /\.main-menu-online-entry\s*\{[\s\S]*background:\s*rgb\(var\(--color-success-rgb\) \/ 0\.08\)/, 'main menu online entry should use theme success tint')
assert.ok(appCssSource.includes("html[data-theme='contrast'] .text-muted\\/50"), 'contrast theme should strengthen low-opacity muted text')
assert.ok(appCssSource.includes("html[data-theme='contrast'] .placeholder\\:text-muted\\/40::placeholder"), 'contrast theme should strengthen muted placeholders')
for (const utility of [
  'bg-black\\/5',
  'bg-black\\/45',
  'bg-bg\\/70',
  'bg-bg\\/80',
  'bg-bg\\/90',
  'bg-bg\\/95'
]) {
  assert.ok(appCssSource.includes(`html[data-theme-tone='light'] .${utility}`), `light themes should soften ${utility}`)
}
assert.equal(packageJson.scripts?.['qa:theme-contrast'], 'node scripts/qa-theme-contrast.mjs', 'package.json should register qa:theme-contrast')

console.log('qa-theme-contrast passed')
