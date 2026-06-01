import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')

const readAppSource = relativePath => readFile(path.join(appRoot, relativePath), 'utf8')
const readRepoSource = relativePath => readFile(path.join(repoRoot, relativePath), 'utf8')

const [
  rewardControlSource,
  cropUseProfilesSource,
  combinedInventorySource,
  cookingStoreSource,
  processingDataSource,
  animalStoreSource,
  cohabitationRuntimeSource,
  todoSource,
] = await Promise.all([
  readAppSource('src/data/onlineVisualRewardControl.ts'),
  readAppSource('src/data/cropUseProfiles.ts'),
  readAppSource('src/composables/useCombinedInventory.ts'),
  readAppSource('src/stores/useCookingStore.ts'),
  readAppSource('src/data/processing.ts'),
  readAppSource('src/stores/useAnimalStore.ts'),
  readRepoSource('server/src/taoyuanCohabitationRuntime.js'),
  readRepoSource('0523游戏拓展todo.md'),
])

const requiredRewardPolicyKeys = [
  'visual_mini_games',
  'manor_care',
  'manor_steal',
  'coop_order_relay',
  'society_async_projects',
  'festival_memorials',
  'shared_manor_weekly_goal',
  'crop_secondary_inventory_sinks',
  'crafting_convenience_rewards',
  'family_manor_reward_mix',
]

const requiredPolicyFields = [
  'baseReward',
  'performanceReward',
  'collaborationReward',
  'memorialReward',
  'serverAuthority',
  'capSummary',
  'antiInflationRule',
  'soloParityRule',
  'testId',
]

const getPolicyBlock = key => {
  const keyIndex = rewardControlSource.indexOf(`key: '${key}'`)
  assert.notEqual(keyIndex, -1, `${key} reward policy should be defined`)
  const blockStart = rewardControlSource.lastIndexOf('  {', keyIndex)
  const blockEnd = rewardControlSource.indexOf('\n  },', keyIndex)
  assert.notEqual(blockStart, -1, `${key} reward policy block start should be found`)
  assert.notEqual(blockEnd, -1, `${key} reward policy block end should be found`)
  return rewardControlSource.slice(blockStart, blockEnd)
}

for (const key of requiredRewardPolicyKeys) {
  const block = getPolicyBlock(key)
  for (const field of requiredPolicyFields) {
    assert.ok(block.includes(`${field}:`), `${key} should declare ${field}`)
  }
}

assert.match(
  getPolicyBlock('shared_manor_weekly_goal'),
  /体验改善|流程减负|个人基础产量|个人铜币|稀有材料/,
  'shared manor bonuses should stay experience-first and not outpace solo rewards',
)
assert.match(
  getPolicyBlock('crop_secondary_inventory_sinks'),
  /优先消耗既有背包、仓库或公共仓库存|不凭空生成等价铜币|换皮铜币/,
  'crop secondary uses should be inventory sinks, not new inflation sources',
)
assert.match(
  getPolicyBlock('crafting_convenience_rewards'),
  /主丹每日 1 次、辅丹每日 2 次|宠物稀有发现受好感门槛、冷却和概率封顶约束|不得稳定堆高宠物成长/,
  'alchemy, cooking and pet feeding should expose convenience caps',
)
assert.match(
  getPolicyBlock('family_manor_reward_mix'),
  /外观、称号、纪念|不发个人铜币最优解|硬资源只走共享池|每周上限/,
  'family manor rewards should favor cosmetics, memorials, efficiency and capped shared resources',
)

for (const guardrail of [
  '作物二级用途必须优先消耗既有库存',
  '炼丹、料理和宠物喂食只给差异化便利',
  '共同庄园和家族庄园硬资源奖励只走共享池',
]) {
  assert.ok(rewardControlSource.includes(guardrail), `global guardrail should include: ${guardrail}`)
}

for (const tag of ['food', 'alchemy', 'pet_feed', 'animal_feed', 'festival', 'order', 'online_cost', 'medicine']) {
  assert.ok(cropUseProfilesSource.includes(`${tag}:`), `crop use labels should include ${tag}`)
}
assert.ok(
  combinedInventorySource.includes('主背包 + 临时背包 + 仓库') && combinedInventorySource.includes('removeCombinedItem'),
  'secondary uses should have a shared inventory + warehouse consumption helper',
)
assert.ok(
  cookingStoreSource.includes('removeCombinedItem') && cookingStoreSource.includes('storyTriggerRecords'),
  'cooking should consume existing inventory and convert results into story or convenience hooks',
)
assert.ok(
  processingDataSource.includes('ALCHEMY_MAIN_DAILY_LIMIT = 1')
    && processingDataSource.includes('ALCHEMY_SUPPORT_DAILY_LIMIT = 2'),
  'alchemy should keep daily main/support limits',
)
assert.ok(
  animalStoreSource.includes('specialFedToday')
    && animalStoreSource.includes('rareFindCooldownDays')
    && animalStoreSource.includes('Math.min(0.085'),
  'pet feeding should keep daily feeding, cooldown and rare-find probability caps',
)
assert.ok(
  cohabitationRuntimeSource.includes('FAMILY_REPUTATION_WEEKLY_CAP')
    && cohabitationRuntimeSource.includes('personal_reward_enabled: false')
    && cohabitationRuntimeSource.includes('shared_fund_reward_enabled')
    && cohabitationRuntimeSource.includes('family_reputation_reward')
    && cohabitationRuntimeSource.includes('family_festival_reward'),
  'family manor rewards should route through capped shared-fund/server ledger paths instead of personal rewards',
)
assert.ok(
  todoSource.includes('### 17.3 奖励与投放控制'),
  '17.3 TODO section should remain discoverable',
)

console.log('qa-reward-delivery-control: ok')
