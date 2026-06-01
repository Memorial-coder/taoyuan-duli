import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

const featureFlagSource = await readFile(
  path.join(appRoot, 'src', 'data', 'onlineVisualFeatureFlags.ts'),
  'utf8',
)
const onlineViewSource = await readFile(path.join(appRoot, 'src', 'views', 'game', 'OnlineView.vue'), 'utf8')
const activityScheduleSource = await readFile(
  path.join(appRoot, 'src', 'data', 'onlineVisualActivitySchedule.ts'),
  'utf8',
)
const packageJson = JSON.parse(await readFile(path.join(appRoot, 'package.json'), 'utf8'))

const requiredFlagKeys = [
  'visual_state',
  'expedition_cavern',
  'lantern_fair',
  'dragon_boat',
  'manor_care',
  'manor_steal',
  'crop_alchemy',
  'crop_cooking',
  'crop_processing',
  'pet_feeding',
  'random_npc',
  'romance_system',
  'family_system',
  'child_system',
  'cohabitation_duo',
  'shared_warehouse',
  'shared_fund',
  'separation_simulation',
]

const getFlagBlock = key => {
  const keyIndex = featureFlagSource.indexOf(`key: '${key}'`)
  assert.notEqual(keyIndex, -1, `${key} flag should be defined`)
  const blockStart = featureFlagSource.lastIndexOf('  {', keyIndex)
  const blockEnd = featureFlagSource.indexOf('\n  },', keyIndex)
  assert.notEqual(blockStart, -1, `${key} flag block start should be found`)
  assert.notEqual(blockEnd, -1, `${key} flag block end should be found`)
  return featureFlagSource.slice(blockStart, blockEnd)
}

for (const key of requiredFlagKeys) {
  const block = getFlagBlock(key)
  assert.ok(block.includes('fallbackLabel:'), `${key} should keep a fallback label`)
  assert.ok(block.includes('fallbackRouteName:'), `${key} should keep a fallback route`)
  assert.ok(block.includes('fallbackTestId:'), `${key} should keep a fallback test id`)
  assert.ok(block.includes('activeRoomClosePolicy:'), `${key} should describe active-room safe close`)
  assert.ok(block.includes('missingConfigFallback:'), `${key} should describe missing-config fallback`)
  assert.match(block, /旧|只读|回看|结算|访客记录/, `${key} fallback should preserve an old or read-only path`)
  assert.match(
    block,
    /统一房间状态机|服务端|轻采权限|照料次数|本地存档|共同仓库|共同基金|ledger|审计/,
    `${key} safe close should preserve authoritative or bounded persisted state`,
  )
  assert.match(block, /缺失配置时按关闭处理|缺失配置时隐藏/, `${key} missing config should use conservative fallback`)
}

assert.equal(
  (featureFlagSource.match(/activeRoomClosePolicy: '/g) || []).length,
  requiredFlagKeys.length,
  'each visual feature flag should define an active-room safe close policy',
)
assert.equal(
  (featureFlagSource.match(/missingConfigFallback: '/g) || []).length,
  requiredFlagKeys.length,
  'each visual feature flag should define a missing-config fallback',
)
assert.ok(
  featureFlagSource.includes('normalizeOnlineVisualFeatureFlagState'),
  'feature flags should expose a conservative normalizer for untrusted config',
)
assert.ok(
  featureFlagSource.includes('hasOwnProperty.call(state ?? {}, flag.key)'),
  'feature flag normalizer should distinguish missing config from explicit true',
)
assert.ok(
  featureFlagSource.includes(': false'),
  'missing feature flag config should normalize to disabled',
)
assert.ok(
  featureFlagSource.includes('state[key] !== true'),
  'feature enable check should require explicit true',
)
assert.ok(
  featureFlagSource.includes('ONLINE_VISUAL_SCENE_FEATURE_FLAG_KEYS'),
  'feature flags should expose sceneSpecId to feature-flag mapping',
)
for (const key of ['expedition_cavern', 'lantern_fair', 'dragon_boat', 'manor_care', 'manor_steal']) {
  assert.ok(
    featureFlagSource.includes(`${key}: '${key}'`),
    `${key} sceneSpecId should map to the matching feature flag`,
  )
}
for (const key of ['expedition_cavern', 'lantern_fair', 'dragon_boat', 'manor_care']) {
  assert.ok(
    activityScheduleSource.includes(`sceneSpecId: '${key}'`),
    `${key} schedule entry should carry a sceneSpecId for fallback routing`,
  )
}
for (const key of ['shared_warehouse', 'shared_fund', 'separation_simulation']) {
  assert.ok(
    getFlagBlock(key).includes("requires: ['cohabitation_duo']"),
    `${key} should depend on the cohabitation master switch`,
  )
}
for (const key of ['crop_alchemy', 'crop_cooking', 'crop_processing', 'pet_feeding']) {
  assert.ok(featureFlagSource.includes(`fallbackTestId: 'online-visual-feature-flag-${key.replaceAll('_', '-')}'`), `${key} should expose a stable fallback test id`)
}
assert.ok(
  onlineViewSource.includes('online-visual-feature-flag-safe-close'),
  'online center should display active-room safe close policy',
)
assert.ok(
  onlineViewSource.includes('featureFlag.activeRoomClosePolicy'),
  'online center should read the safe close policy from flag config',
)
assert.ok(
  onlineViewSource.includes('online-visual-feature-flag-missing-config'),
  'online center should display missing-config fallback policy',
)
assert.ok(
  onlineViewSource.includes('featureFlag.missingConfigFallback'),
  'online center should read missing-config fallback from flag config',
)
assert.ok(
  onlineViewSource.includes('getOnlineVisualFeatureFlagKeyForSceneSpec'),
  'online center should resolve schedule entries through sceneSpecId feature flags',
)
assert.ok(
  onlineViewSource.includes('resolveVisualFeatureFallback'),
  'online center should share one fallback resolver for visual entries and schedules',
)
assert.ok(
  onlineViewSource.includes('targetRoute: enabled ? primaryRoute : fallbackRoute ?? primaryRoute'),
  'online center should route disabled or missing-config features to the old fallback route',
)
assert.ok(
  onlineViewSource.includes(':to="activity.targetRoute"'),
  'visual activity cards should use resolved fallback-aware routes',
)
assert.ok(
  onlineViewSource.includes(':to="entry.targetRoute"'),
  'visual schedule cards should use resolved fallback-aware routes',
)
assert.ok(
  onlineViewSource.includes('online-visual-activity-fallback'),
  'visual activity cards should display the fallback path readback',
)
assert.ok(
  onlineViewSource.includes('online-visual-schedule-fallback'),
  'visual schedules should display the fallback path readback',
)
assert.equal(
  packageJson.scripts['qa:online-visual-feature-flags'],
  'node scripts/qa-online-visual-feature-flags.mjs',
  'package script should expose the visual feature flag QA',
)

console.log('[qa-online-visual-feature-flags] passed')
