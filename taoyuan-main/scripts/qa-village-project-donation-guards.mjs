/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const villageStoreSource = readSource('src/stores/useVillageProjectStore.ts')

const claimMatch = villageStoreSource.match(
  /const claimDonationMilestone = \(projectId: string, milestoneId: string\) => \{([\s\S]*?)\n\s{2}const processOperationalTick =/
)
assert(claimMatch, '未找到 claimDonationMilestone() 实现。')

const claimSource = claimMatch?.[1] ?? ''
const snapshotIndex = claimSource.indexOf('const inventorySnapshot = inventoryStore.serialize()')
const rewardIndex = claimSource.indexOf('const rewardResult = grantDonationMilestoneReward(projectId, milestoneId)')
const updateIndex = claimSource.indexOf('const nextState = updateDonationState(projectId, {')
const rollbackIndex = claimSource.indexOf('if (!nextState) {')

assert(snapshotIndex >= 0, '里程碑发奖前必须创建背包快照。')
assert(claimSource.includes('const playerSnapshot = playerStore.serialize()'), '里程碑发奖前必须创建玩家快照。')
assert(
  claimSource.includes('const achievementSnapshot = JSON.parse(JSON.stringify(achievementStore.serialize()))'),
  '里程碑发奖前必须深拷贝成就快照，避免铜钱奖励统计残留。'
)
assert(rewardIndex > snapshotIndex, '快照必须早于 grantDonationMilestoneReward()。')
assert(updateIndex > rewardIndex, '里程碑状态标记必须发生在发奖之后，QA 才能覆盖标记失败回滚路径。')
assert(rollbackIndex > updateIndex, 'updateDonationState() 失败分支必须位于状态标记之后。')

const failureBranch = claimSource.slice(rollbackIndex, claimSource.indexOf('addLog(', rollbackIndex))
assert(failureBranch.includes('inventoryStore.deserialize(inventorySnapshot)'), '标记失败时必须回滚背包奖励。')
assert(failureBranch.includes('playerStore.deserialize(playerSnapshot)'), '标记失败时必须回滚铜钱奖励。')
assert(failureBranch.includes('achievementStore.deserialize(achievementSnapshot)'), '标记失败时必须回滚铜钱奖励产生的成就统计。')
assert(failureBranch.includes("return { success: false, message: '更新捐赠里程碑状态失败。' }"), '标记失败分支必须返回失败，不能继续写日志或提示领取成功。')

const simulateMilestoneClaim = ({ updateSucceeds }) => {
  const state = {
    inventory: { herb: 1 },
    money: 100,
    totalMoneyEarned: 1000,
    claimedMilestoneIds: []
  }
  const snapshots = {
    inventory: { ...state.inventory },
    money: state.money,
    totalMoneyEarned: state.totalMoneyEarned
  }

  state.inventory.reward_tea = (state.inventory.reward_tea ?? 0) + 2
  state.money += 50
  state.totalMoneyEarned += 50

  if (!updateSucceeds) {
    state.inventory = { ...snapshots.inventory }
    state.money = snapshots.money
    state.totalMoneyEarned = snapshots.totalMoneyEarned
    return { success: false, state }
  }

  state.claimedMilestoneIds.push('sample_milestone')
  return { success: true, state }
}

const failedClaim = simulateMilestoneClaim({ updateSucceeds: false })
assert(!failedClaim.success, '模型用例：状态标记失败时领取结果应失败。')
assert(failedClaim.state.money === 100, '模型用例：状态标记失败时铜钱必须回滚。')
assert(failedClaim.state.totalMoneyEarned === 1000, '模型用例：状态标记失败时成就铜钱统计必须回滚。')
assert(!('reward_tea' in failedClaim.state.inventory), '模型用例：状态标记失败时物品奖励必须回滚。')
assert(failedClaim.state.claimedMilestoneIds.length === 0, '模型用例：状态标记失败时不得写入已领取里程碑。')

const successfulClaim = simulateMilestoneClaim({ updateSucceeds: true })
assert(successfulClaim.success, '模型用例：状态标记成功时领取结果应成功。')
assert(successfulClaim.state.money === 150, '模型用例：状态标记成功时铜钱奖励应保留。')
assert(successfulClaim.state.inventory.reward_tea === 2, '模型用例：状态标记成功时物品奖励应保留。')
assert(successfulClaim.state.claimedMilestoneIds.includes('sample_milestone'), '模型用例：状态标记成功时必须写入已领取里程碑。')

if (errors.length > 0) {
  console.error('村庄捐赠里程碑守卫失败：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('村庄捐赠里程碑守卫通过：发奖后标记失败会回滚背包、铜钱和成就统计。')
