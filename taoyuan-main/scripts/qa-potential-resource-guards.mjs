/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const potentialDataSource = readSource('src/data/potential.ts')
const questDataSource = readSource('src/data/quests.ts')
const potentialStoreSource = readSource('src/stores/usePotentialStore.ts')
const gameplaySources = {
  mining: readSource('src/stores/useMiningStore.ts'),
  quarry: readSource('src/stores/useQuarryStore.ts'),
  regionMap: readSource('src/stores/useRegionMapStore.ts'),
  quest: readSource('src/stores/useQuestStore.ts'),
  goal: readSource('src/stores/useGoalStore.ts'),
  museum: readSource('src/stores/useMuseumStore.ts'),
  hiddenNpc: readSource('src/stores/useHiddenNpcStore.ts'),
  shop: readSource('src/stores/useShopStore.ts'),
  dialogs: readSource('src/composables/useDialogs.ts')
}

const { POTENTIAL_RESOURCE_DEFS, POTENTIAL_SOURCE_RULES } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)

const expectedSourceIds = new Set([
  'mine_boss_clear',
  'quarry_stewardship',
  'journey_high_risk',
  'special_order_finish',
  'theme_week_settlement',
  'museum_hidden_sample',
  'festival_spirit_event',
  'festival_minigame_clear',
  'child_spirit_sweets'
])
const resourceIds = new Set(POTENTIAL_RESOURCE_DEFS.map(resource => resource.id))
const sourceIds = new Set(POTENTIAL_SOURCE_RULES.map(rule => rule.id))

assert(POTENTIAL_SOURCE_RULES.length === expectedSourceIds.size, `潜能来源应登记 ${expectedSourceIds.size} 条规则。`)
for (const sourceId of expectedSourceIds) {
  assert(sourceIds.has(sourceId), `缺少潜能来源规则：${sourceId}`)
}

for (const rule of POTENTIAL_SOURCE_RULES) {
  assert(typeof rule.label === 'string' && rule.label.length > 0, `${rule.id} 必须有玩家可读名称。`)
  assert(typeof rule.summary === 'string' && rule.summary.length > 0, `${rule.id} 必须有玩家可读来源说明。`)
  assert(Array.isArray(rule.rewards) && rule.rewards.length > 0, `${rule.id} 必须配置奖励。`)
  assert(['daily', 'weekly', 'seasonal'].includes(rule.cap.period), `${rule.id} 必须配置日/周/季上限周期。`)
  assert(Number.isInteger(rule.cap.maxClaims) && rule.cap.maxClaims > 0, `${rule.id} 必须配置正整数领取次数上限。`)
  assert(Number.isInteger(rule.cap.maxResourceAmount) && rule.cap.maxResourceAmount > 0, `${rule.id} 必须配置正整数材料数量上限。`)
  for (const reward of rule.rewards) {
    assert(resourceIds.has(reward.resourceId), `${rule.id} 使用了未登记的潜能资源：${reward.resourceId}`)
    assert(Number.isInteger(reward.amount) && reward.amount > 0, `${rule.id} 奖励数量必须是正整数。`)
  }
}

assert(potentialDataSource.includes('cap: { period:'), '潜能来源必须在数据表集中配置上限。')
assert(potentialStoreSource.includes('claimPotentialSourceReward'), '潜能 store 必须提供统一来源发放 helper。')
assert(potentialStoreSource.includes('sourceReceipts'), '潜能来源发放必须记录结算凭据。')
assert(potentialStoreSource.includes('sourceCapProgress'), '潜能来源发放必须记录周期上限进度。')
assert(potentialStoreSource.includes('sourceReceipts.value[receiptId]'), '潜能来源发放必须阻止同一凭据重复领取。')
assert(potentialStoreSource.includes('currentProgress.claims >= rule.cap.maxClaims'), '潜能来源发放必须检查周期领取次数上限。')
assert(potentialStoreSource.includes('rule.cap.maxResourceAmount - used'), '潜能来源发放必须检查周期资源数量上限。')

assert(gameplaySources.mining.includes("claimPotentialSourceReward('mine_boss_clear'"), '矿洞首领结算必须接入潜能来源。')
assert(gameplaySources.mining.includes('BOSS_POTENTIAL_REPLAY_MAX_CHANCE = 0.3'), '矿洞首领复战潜能材料概率必须封顶 30%。')
assert(gameplaySources.mining.includes('getMineBossPotentialReplayChance'), '矿洞首领复战潜能材料必须按层数计算概率。')
assert(gameplaySources.mining.includes('safeFloor / BOSS_POTENTIAL_REPLAY_FULL_CHANCE_FLOOR'), '矿洞首领复战潜能材料概率必须随层数爬升。')
assert(gameplaySources.mining.includes('potentialBossFirstRewardIds'), '矿洞首领潜能首获必须独立记录，避免影响主矿首杀奖励。')
assert(gameplaySources.mining.includes('boss-first:') && gameplaySources.mining.includes("'main-repeat'") && gameplaySources.mining.includes("'skull-repeat'"), '矿洞首领潜能结算必须区分首获、主矿复战与骷髅矿穴复战凭据。')
assert(gameplaySources.mining.includes('Math.random() >= replayChance'), '矿洞首领复战潜能材料必须通过概率门槛发放。')
assert(potentialDataSource.includes('随层数有一定概率'), '矿洞首领来源说明只能展示随层数一定概率，不应暴露精确复战概率。')
assert(gameplaySources.quarry.includes('claimPotentialSourceReward') && gameplaySources.quarry.includes("'quarry_stewardship'"), '旧采石场周清理必须接入采石场管护潜能来源。')
assert(gameplaySources.quarry.includes('QUARRY_WEEKLY_STEWARDSHIP_TARGET') && gameplaySources.quarry.includes('QUARRY_WEEKLY_STEWARDSHIP_MAX_CLAIMS'), '旧采石场周清理必须使用固定周目标与周领取上限。')
assert(potentialDataSource.includes("id: 'quarry_stewardship'") && potentialDataSource.includes("cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 4 }"), '采石场管护潜能来源必须有每周 2 次、最多 4 份材料的上限。')
assert(potentialDataSource.includes("id: 'quarry_stewardship'") && potentialDataSource.includes("{ resourceId: 'potential_insight', amount: 1 }") && potentialDataSource.includes("{ resourceId: 'mountain_jade', amount: 1 }"), '采石场管护潜能来源必须奖励潜能心得和山野玉各 1。')
assert(potentialDataSource.includes("id: 'quarry_stewardship'") && potentialDataSource.includes("routeName: 'quarry'"), '采石场管护潜能来源必须能从潜能页指向旧采石场。')
assert(gameplaySources.quarry.includes('if (result.success)') && gameplaySources.quarry.includes('nextClaimedKeys.add(milestoneKey)'), '采石场周清理只有潜能发奖成功时才能标记里程碑已领取。')
assert(gameplaySources.regionMap.includes("claimPotentialSourceReward('journey_high_risk'"), '高风险行旅或区域首领必须接入潜能来源。')
assert(gameplaySources.quest.includes("claimPotentialSourceReward('special_order_finish'"), '特殊订单完成必须接入潜能来源。')
assert(gameplaySources.goal.includes("claimPotentialSourceReward('theme_week_settlement'"), '主题周结算必须接入潜能来源。')
assert(gameplaySources.museum.includes("claimPotentialSourceReward('museum_hidden_sample', `milestone:${count}`"), '博物馆里程碑必须接入潜能来源。')
assert(gameplaySources.museum.includes('const scholarPotentialEventKey = `scholar:${commission.id}:${commission.state.acceptedDayTag'), '学者委托领奖必须使用按委托和接取日去重的博物馆考据凭据。')
assert(gameplaySources.museum.includes("claimPotentialSourceReward('museum_hidden_sample', scholarPotentialEventKey"), '学者委托领奖必须接入博物馆考据潜能来源，避免满捐后来源断供。')
assert(gameplaySources.hiddenNpc.includes("claimPotentialSourceReward('festival_spirit_event'"), '仙灵记忆必须接入灵息机缘来源。')
assert(gameplaySources.shop.includes("claimPotentialSourceReward('festival_spirit_event'"), '节庆出货必须接入灵息机缘来源。')
assert(gameplaySources.dialogs.includes("claimPotentialSourceReward('festival_minigame_clear', `festival-mini:${rewardKey}`"), '节会小游戏完成必须接入独立潜能来源。')
assert(gameplaySources.dialogs.includes('if (prize > 0 && !claimedFestivalRewardKeys.value.includes(rewardKey))'), '节会小游戏潜能材料必须只在有效结算且未重复领奖时发放。')
assert(potentialDataSource.includes("id: 'festival_minigame_clear'") && potentialDataSource.includes("label: '节会小游戏'"), '节会小游戏必须登记为独立潜能来源。')
assert(potentialDataSource.includes("id: 'festival_minigame_clear'") && potentialDataSource.includes("cap: { period: 'weekly', maxClaims: 2, maxResourceAmount: 4 }"), '节会小游戏潜能来源必须有独立周上限。')
assert(potentialDataSource.includes("id: 'festival_minigame_clear'") && potentialDataSource.includes("{ resourceId: 'potential_insight', amount: 1 }") && potentialDataSource.includes("{ resourceId: 'spirit_breath', amount: 1 }"), '节会小游戏潜能来源必须奖励潜能心得和灵息各1。')
assert(gameplaySources.quest.includes("claimPotentialSourceReward('child_spirit_sweets', `child-spirit-order:${quest.id}`"), '童心灵息委托必须通过统一潜能来源发放。')
assert(potentialDataSource.includes('完成学者委托考据'), '博物馆考据来源说明必须包含后期可重复的学者委托路径。')
assert(potentialDataSource.includes('阿花或石头达到挚友后') && potentialDataSource.includes('童心甜点委托'), '童心灵息来源说明必须写明阿花/石头挚友甜点委托。')
assert(potentialDataSource.includes("id: 'child_spirit_sweets'") && potentialDataSource.includes("rewards: [{ resourceId: 'spirit_breath', amount: 1 }]"), '童心灵息委托来源必须只奖励灵息×1。')
assert(questDataSource.includes("activitySourceLabel: '童心灵息委托'"), '特殊订单池必须登记童心灵息委托。')
assert(questDataSource.includes("npcId: 'a_hua'") && questDataSource.includes("targetItemId: 'food_osmanthus_cake'"), '阿花童心委托必须提交桂花糕。')
assert(questDataSource.includes("npcId: 'shi_tou'") && questDataSource.includes("targetItemId: 'food_jujube_cake'"), '石头童心委托必须提交红枣糕。')
assert(questDataSource.includes("requiredNpcFriendshipLevel: 'bestFriend'"), '童心灵息委托必须要求孩童挚友后才进池。')
assert(questDataSource.includes('matchesNpcFriendshipRequirement'), '特殊订单生成必须按 NPC 好感门槛过滤候选池。')
assert(questDataSource.includes('spiritBreathReward: true'), '童心灵息委托必须标记额外灵息奖励。')

const gameplayDirectGrants = Object.entries(gameplaySources).filter(([, source]) => source.includes('addPotentialResource('))
assert(gameplayDirectGrants.length === 0, `玩法侧不得绕过统一来源 helper 直接发潜能材料：${gameplayDirectGrants.map(([name]) => name).join(', ')}`)

if (errors.length > 0) {
  console.error(`qa-potential-resource-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-resource-guards passed')
