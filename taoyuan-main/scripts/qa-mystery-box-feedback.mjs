/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProjectFile = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const walletStore = readProjectFile('src/stores/useWalletStore.ts')
const walletView = readProjectFile('src/views/game/WalletView.vue')
const mysteryBoxes = readProjectFile('src/data/mysteryBoxes.ts')
const items = readProjectFile('src/data/items.ts')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const assertIncludes = (source, needle, message) => {
  assert(source.includes(needle), message)
}

const assertItemDef = ({ itemId, name, category }) => {
  const itemPattern = new RegExp(`id:\\s*'${itemId}'[\\s\\S]{0,260}?name:\\s*'${name}'[\\s\\S]{0,260}?category:\\s*'${category}'`)
  assert(itemPattern.test(items), `${itemId} should resolve to ${name} in the ${category} backpack category.`)
}

const expectedRewards = [
  {
    label: '珍礼匣',
    destination: '背包-礼物',
    items: [
      { itemId: 'camphor_incense', name: '樟脑香', quantity: 1, category: 'gift' },
      { itemId: 'silk_ribbon', name: '丝帕', quantity: 1, category: 'gift' }
    ]
  },
  {
    label: '战备匣',
    destination: '背包-材料',
    items: [
      { itemId: 'iron_bar', name: '铁锭', quantity: 2, category: 'material' },
      { itemId: 'charcoal', name: '木炭', quantity: 6, category: 'material' }
    ]
  }
]

assertIncludes(walletStore, 'formatMysteryBoxRewardPreview', 'Mystery box card preview should use a dedicated reward preview formatter.')
assertIncludes(walletStore, 'formatMysteryBoxRewardResult', 'Mystery box open result should use a dedicated reward result formatter.')
assertIncludes(walletStore, 'getMysteryBoxRewardItemSummary', 'Mystery box feedback should include actual item names and quantities.')
assertIncludes(walletStore, 'getMysteryBoxRewardDestination', 'Mystery box feedback should include the backpack destination.')
assertIncludes(walletStore, "gift: '礼物'", 'Mystery box destination should label gift rewards as 背包-礼物.')
assertIncludes(walletStore, "material: '材料'", 'Mystery box destination should label material rewards as 背包-材料.')
assertIncludes(walletStore, "rewardPreview: def.rewardEntries.map(formatMysteryBoxRewardPreview).join(' / ')", 'Wallet entries should show itemized mystery box reward previews.')
assertIncludes(walletStore, '获得${formatMysteryBoxRewardResult(reward)}', 'Open mystery box success text should include itemized reward details.')
assertIncludes(walletView, '{{ entry.rewardPreview }}', 'Wallet view should render the itemized mystery box reward preview from the store.')

for (const reward of expectedRewards) {
  assertIncludes(mysteryBoxes, `label: '${reward.label}'`, `${reward.label} should remain configured as a spirit seal crate reward entry.`)
  for (const item of reward.items) {
    assertIncludes(mysteryBoxes, `{ itemId: '${item.itemId}', quantity: ${item.quantity} }`, `${reward.label} should still award ${item.itemId}×${item.quantity}.`)
    assertItemDef(item)
  }
  const expectedPreview = `${reward.label}：${reward.items.map(item => `${item.name}×${item.quantity}`).join('、')}，入${reward.destination}`
  const expectedResult = `${reward.label}：${reward.items.map(item => `${item.name}×${item.quantity}`).join('、')}，已放入${reward.destination}`
  console.log(`expected preview: ${expectedPreview}`)
  console.log(`expected result: ${expectedResult}`)
}

if (errors.length > 0) {
  console.error('qa-mystery-box-feedback failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-mystery-box-feedback passed.')
