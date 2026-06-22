/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const walletViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/WalletView.vue'), 'utf8')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const requiredSectionKeys = [
  'overview',
  'weekly-budget',
  'reward-ticket',
  'quota-exchange',
  'archetype-overview',
  'passive-items'
]

for (const key of requiredSectionKeys) {
  assert(walletViewSource.includes(`'${key}'`), `Wallet section key "${key}" is missing.`)
}

assert(walletViewSource.includes('data-testid="wallet-primary-action-card"'), 'Mobile primary action card test id must remain available.')
assert(walletViewSource.includes('data-testid="wallet-section-tabs"'), 'Wallet section tab container is missing.')
assert(walletViewSource.includes('`wallet-section-tab-${tab.key}`'), 'Wallet section tabs need stable data-testid generation.')
assert(walletViewSource.includes('data-testid="wallet-passive-items"'), 'Passive wallet item section test id is missing.')
assert(walletViewSource.includes("const activeWalletSection = ref<WalletSectionKey>('overview')"), 'Wallet should default to overview section.')
assert(walletViewSource.includes('const walletSectionTabs = computed<WalletSectionTab[]>'), 'Wallet tab summaries should be computed from live state.')
assert(walletViewSource.includes("setActiveWalletSection(WALLET_FOCUS_SECTION_MAP[focusKey] ?? 'overview')"), 'Prompt CTA should select the matching wallet tab before focusing.')
assert(walletViewSource.includes("usePromptFocusPanel('wallet', {"), 'Wallet prompt focus handlers must open hidden tabbed sections.')

for (const key of requiredSectionKeys) {
  assert(walletViewSource.includes(`isWalletSectionVisible('${key}')`), `Wallet section "${key}" is not wired to tab visibility.`)
}

for (const focusKey of ['economy-overview', 'recommended-consumption', 'weekly-budget', 'reward-ticket', 'quota-exchange', 'archetype-overview']) {
  assert(walletViewSource.includes(`'${focusKey}': () => setActiveWalletSection`), `Prompt focus handler for "${focusKey}" is missing.`)
}

for (const staleSnippet of ['walletPreludeExpanded', 'walletSectionExpandedState', 'isWalletSectionOpen', 'toggleWalletSection']) {
  assert(!walletViewSource.includes(staleSnippet), `Stale wallet mobile folding snippet remains: ${staleSnippet}.`)
}

if (errors.length > 0) {
  console.error('[qa-wallet-ui-structure] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-wallet-ui-structure] passed')
