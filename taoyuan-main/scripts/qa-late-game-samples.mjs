import { BUILT_IN_SAMPLE_SAVES } from '../src/data/sampleSaves.ts'

const REQUIRED_SAMPLE_IDS = [
  'late_economy_foundation',
  'breeding_specialist',
  'fishpond_operator',
  'endgame_showcase'
]

const errors = []
const infos = []

const assertCheck = (condition, message) => {
  if (!condition) {
    errors.push(message)
  }
}

const sampleMap = new Map(BUILT_IN_SAMPLE_SAVES.map(sample => [sample.id, sample]))

for (const sampleId of REQUIRED_SAMPLE_IDS) {
  const sample = sampleMap.get(sampleId)
  assertCheck(!!sample, `缺少内置样例档：${sampleId}`)
  if (!sample) continue

  const envelope = sample.envelope ?? {}
  const meta = envelope.meta ?? {}
  const data = envelope.data ?? {}
  const game = data.game ?? {}
  const player = data.player ?? {}
  const goal = data.goal ?? {}

  assertCheck(meta.saveVersion === 3, `${sampleId} 的 saveVersion 不是 3。`)
  assertCheck(Number.isFinite(game.year) && game.year >= 1, `${sampleId} 缺少有效的 game.year。`)
  assertCheck(['spring', 'summer', 'autumn', 'winter'].includes(game.season), `${sampleId} 缺少有效的 game.season。`)
  assertCheck(Number.isFinite(game.day) && game.day >= 1 && game.day <= 28, `${sampleId} 缺少有效的 game.day。`)
  assertCheck(typeof player.playerName === 'string' && player.playerName.length > 0, `${sampleId} 缺少玩家名。`)
  assertCheck(Number.isFinite(player.money) && player.money >= 0, `${sampleId} 缺少有效的玩家金钱。`)
  assertCheck(Array.isArray(goal.dailyGoals), `${sampleId} 缺少 goal.dailyGoals。`)
  assertCheck(Array.isArray(goal.longTermGoals), `${sampleId} 缺少 goal.longTermGoals。`)
  assertCheck(goal.currentThemeWeekState && typeof goal.currentThemeWeekState === 'object', `${sampleId} 缺少 currentThemeWeekState。`)
  assertCheck(Array.isArray(goal.weeklyMetricArchive?.snapshots), `${sampleId} 缺少 weeklyMetricArchive.snapshots。`)
  assertCheck(Array.isArray(player.economyTelemetry?.recentSnapshots), `${sampleId} 缺少 economyTelemetry.recentSnapshots。`)

  if (sampleId === 'late_economy_foundation') {
    assertCheck(data.villageProject?.projectStates && Object.keys(data.villageProject.projectStates).length >= 3, 'late_economy_foundation 未覆盖足够的村庄建设状态。')
    assertCheck(Array.isArray(data.museum?.donatedItems) && data.museum.donatedItems.length >= 10, 'late_economy_foundation 的博物馆样例过弱。')
    assertCheck(data.hanhai?.unlocked === true, 'late_economy_foundation 没有启用瀚海样例。')
  }

  if (sampleId === 'breeding_specialist') {
    assertCheck(data.breeding?.unlocked === true, 'breeding_specialist 没有启用育种系统。')
    assertCheck(Array.isArray(data.breeding?.breedingBox) && data.breeding.breedingBox.length >= 1, 'breeding_specialist 缺少育种箱样例。')
    assertCheck(Array.isArray(data.breeding?.stations) && data.breeding.stations.length >= 1, 'breeding_specialist 缺少育种站样例。')
  }

  if (sampleId === 'fishpond_operator') {
    assertCheck(data.fishPond?.pond?.built === true, 'fishpond_operator 没有启用鱼塘。')
    assertCheck(Array.isArray(data.fishPond?.pond?.fish) && data.fishPond.pond.fish.length >= 2, 'fishpond_operator 缺少鱼塘存鱼样例。')
    assertCheck(Array.isArray(data.fishPond?.pendingProducts) && data.fishPond.pendingProducts.length >= 1, 'fishpond_operator 缺少待领取产物样例。')
  }

  if (sampleId === 'endgame_showcase') {
    assertCheck(data.breeding?.unlocked === true, 'endgame_showcase 没有启用育种系统。')
    assertCheck(data.fishPond?.pond?.built === true, 'endgame_showcase 没有启用鱼塘系统。')
    assertCheck(data.hanhai?.unlocked === true, 'endgame_showcase 没有启用瀚海系统。')
    assertCheck(data.villageProject?.projectStates && Object.keys(data.villageProject.projectStates).length >= 5, 'endgame_showcase 的村庄建设覆盖不足。')
    assertCheck(Array.isArray(data.museum?.donatedItems) && data.museum.donatedItems.length >= 10, 'endgame_showcase 的博物馆样例过弱。')
  }

  infos.push(`${sampleId}: Y${game.year} ${game.season} Day${game.day}, money=${player.money}`)
}

if (errors.length > 0) {
  console.error('[qa-late-game-samples] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-late-game-samples] OK')
for (const info of infos) {
  console.log(`- ${info}`)
}
