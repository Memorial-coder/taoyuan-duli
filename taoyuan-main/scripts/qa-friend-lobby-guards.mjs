import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(appRoot, '..')

const files = new Map([
  ['src/views/game/FriendStationView.vue', path.join(appRoot, 'src', 'views', 'game', 'FriendStationView.vue')],
  ['src/stores/useSocialStore.ts', path.join(appRoot, 'src', 'stores', 'useSocialStore.ts')],
  ['src/utils/onlineProfileApi.ts', path.join(appRoot, 'src', 'utils', 'onlineProfileApi.ts')],
  ['server/src/routes/api.js', path.join(workspaceRoot, 'server', 'src', 'routes', 'api.js')],
  ['server/src/taoyuanSocialRuntime.js', path.join(workspaceRoot, 'server', 'src', 'taoyuanSocialRuntime.js')],
  ['server/src/taoyuanRealtimeRuntime.js', path.join(workspaceRoot, 'server', 'src', 'taoyuanRealtimeRuntime.js')],
  ['server/src/taoyuanSaveRuntime.js', path.join(workspaceRoot, 'server', 'src', 'taoyuanSaveRuntime.js')],
])

const sources = new Map()
const failures = []

for (const [label, filePath] of files.entries()) {
  sources.set(label, await readFile(filePath, 'utf8'))
}

const expectContains = (label, needle, message) => {
  if (!sources.get(label)?.includes(needle)) failures.push(`${label}: ${message}`)
}

const expectPattern = (label, pattern, message) => {
  if (!pattern.test(sources.get(label) || '')) failures.push(`${label}: ${message}`)
}

expectContains('src/views/game/FriendStationView.vue', 'data-testid="friend-lobby-panel"', 'friend lobby panel entry is missing')
expectContains('src/views/game/FriendStationView.vue', 'data-testid="friend-lobby-search-input"', 'friend lobby nickname/id search input is missing')
expectContains('src/views/game/FriendStationView.vue', 'data-testid="friend-lobby-profile-modal"', 'friend lobby profile modal is missing')
expectContains('src/views/game/FriendStationView.vue', "value: 'online'", 'online filter option is missing')
expectContains('src/views/game/FriendStationView.vue', "value: 'recent'", 'recently-active filter option is missing')
expectContains('src/views/game/FriendStationView.vue', 'refreshFriendLobby(true)', 'random refresh action is missing')
expectContains('src/views/game/FriendStationView.vue', 'openDiscoveryMail', 'private message action is missing')
expectContains('src/views/game/FriendStationView.vue', 'sendDiscoveryFriendRequest', 'friend request action is missing')
expectContains('src/views/game/FriendStationView.vue', 'blockDiscoveryPlayer', 'block action is missing')
expectContains('src/views/game/FriendStationView.vue', 'reportDiscoveryPlayer', 'report action is missing')

expectContains('src/stores/useSocialStore.ts', 'friendDiscoveryPlayers', 'friend discovery player state is missing')
expectContains('src/stores/useSocialStore.ts', 'friendDiscoveryMode', 'friend discovery mode state is missing')
expectContains('src/stores/useSocialStore.ts', 'friendDiscoverySearchDraft', 'friend discovery search draft is missing')
expectContains('src/stores/useSocialStore.ts', 'refreshFriendDiscovery', 'friend discovery refresh action is missing')
expectContains('src/stores/useSocialStore.ts', 'setFriendDiscoveryMode', 'friend discovery filter action is missing')
expectContains('src/stores/useSocialStore.ts', 'reportTargetBySaveId', 'friend discovery report action is missing')

expectContains('src/utils/onlineProfileApi.ts', "export type OnlineFriendDiscoveryMode = 'all' | 'online' | 'recent'", 'friend discovery mode type is missing')
expectContains('src/utils/onlineProfileApi.ts', 'export interface OnlineFriendDiscoveryCard', 'friend discovery card type is missing')
expectContains('src/utils/onlineProfileApi.ts', 'fetchFriendDiscovery', 'friend discovery API client is missing')
expectContains('src/utils/onlineProfileApi.ts', 'reportPlayer', 'friend lobby report API client is missing')
expectContains('src/utils/onlineProfileApi.ts', '/api/taoyuan/online/social/discover', 'friend discovery endpoint path is missing')
expectContains('src/utils/onlineProfileApi.ts', '/api/taoyuan/online/social/reports', 'friend report endpoint path is missing')

expectContains('server/src/routes/api.js', "router.get('/taoyuan/online/social/discover'", 'friend discovery route is missing')
expectContains('server/src/routes/api.js', 'taoyuanRealtimeRuntime.getPresenceRecords()', 'friend discovery route does not pass realtime presence')
expectContains('server/src/routes/api.js', "router.post('/taoyuan/online/social/reports'", 'friend report route is missing')

expectContains('server/src/taoyuanSocialRuntime.js', 'async function listFriendDiscovery', 'friend discovery runtime is missing')
expectContains('server/src/taoyuanSocialRuntime.js', 'async function reportPlayer', 'friend report runtime is missing')
expectContains('server/src/taoyuanSocialRuntime.js', 'FRIEND_DISCOVERY_ONLINE_WINDOW_SECONDS', 'online priority window is missing')
expectContains('server/src/taoyuanSocialRuntime.js', 'FRIEND_DISCOVERY_RECENT_WINDOW_SECONDS', 'recent activity window is missing')
expectContains('server/src/taoyuanSocialRuntime.js', 'countMutualFriends', 'mutual friend count support is missing')
expectContains('server/src/taoyuanSocialRuntime.js', "relationStatus === 'blocked'", 'blocked players should be hidden from discovery')
expectContains('server/src/taoyuanSocialRuntime.js', 'recommendation_reasons', 'recommendation reason payload is missing')
expectPattern('server/src/taoyuanSocialRuntime.js', /try\s*{\s*profile\s*=\s*await buildRelationCard/s, 'candidate profile build should be isolated per player')

expectContains('server/src/taoyuanRealtimeRuntime.js', 'function getPresenceRecords', 'realtime presence export is missing')
expectContains('server/src/taoyuanSaveRuntime.js', 'function listSaveIdentities', 'save identity listing is missing')

if (failures.length > 0) {
  console.error('[qa-friend-lobby-guards] FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[qa-friend-lobby-guards] passed (${files.size} files checked)`)
