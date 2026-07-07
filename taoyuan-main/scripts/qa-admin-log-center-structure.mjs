/* global console */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFile(path.join(projectRoot, file), 'utf8')

const [panel, adminContentApi, adminOnlineApi, userAdminApi] = await Promise.all([
  read('src/components/game/AdminLogCenterPanel.vue'),
  read('src/utils/adminContentApi.ts'),
  read('src/utils/adminOnlineApi.ts'),
  read('src/utils/userAdminApi.ts'),
])

assert.match(panel, /data-testid="admin-log-center-panel"/, 'log center panel should expose a stable QA root')
assert.match(panel, /data-testid="admin-log-overview"/, 'log center should render overview cards')
assert.match(panel, /data-testid="admin-log-tabs"/, 'log center should render tabs')
assert.match(panel, /data-testid="admin-log-filters"/, 'log center should render unified filters')
assert.match(panel, /data-testid="admin-log-results"/, 'log center should render unified results')
assert.match(panel, /data-testid="admin-log-pager"/, 'log center should render pagination controls')

for (const label of ['全部', '管理审计', '在线审计', '内容审核', '游戏日志', '私聊记录', '内容发布']) {
  assert.match(panel, new RegExp(label), `log center should include ${label} tab`)
}

for (const filter of ['用户名', '动作', '结果', '分类/场景', '开始时间', '结束时间', '关键词']) {
  assert.match(panel, new RegExp(filter), `log center should include ${filter} filter`)
}

assert.match(panel, /默认留存 30 天/, 'gameplay policy copy should state 30-day retention')
assert.match(panel, /1000000/, 'gameplay policy copy should state the 1000000 total cap')
assert.match(panel, /24000/, 'gameplay policy copy should state the 24000 per user-slot cap')
assert.match(panel, /最近写入/, 'overview cards should expose latest write time')
assert.match(panel, /activeFilterText/, 'results should expose current filters')
assert.match(panel, /activePageCount/, 'log center should calculate page count from total')
assert.match(panel, /formatCount\(activeTotal\)/, 'log center should display real total count')
assert.match(panel, /sourceTotal\(tab\.key\)/, 'overview cards should display real source totals')
assert.match(panel, /refreshAllLogs/, 'all tab should merge existing log sources')
assert.match(panel, /fetchAdminContentModerationEvents/, 'log center should fetch content moderation events')
assert.match(panel, /fetchAdminContentRiskSignals/, 'log center should fetch risk signals')
assert.match(panel, /fetchAdminOnlineAuditLogPage/, 'log center should fetch paged online audit logs')
assert.match(panel, /fetchAdminAuditLogs/, 'log center should fetch admin audit logs')
assert.match(panel, /fetchGameplayLogs/, 'log center should fetch gameplay logs')
assert.match(panel, /fetchAdminPrivateChatMessages/, 'log center should fetch admin private chat messages')
assert.match(panel, /fetchContentRevisions/, 'log center should fetch content revisions')
assert.match(panel, /normalizePrivateChat/, 'log center should normalize private chat rows')
assert.match(panel, /发送者/, 'private chat rows should expose sender copy')
assert.match(panel, /接收者/, 'private chat rows should expose recipient copy')
assert.match(panel, /announcementAuditActions/, 'content publishing tab should include announcement audit actions')
assert.match(panel, /normalizeAnnouncementAudit/, 'content publishing tab should normalize announcement audit logs')
assert.match(panel, /createdFrom: toTimestamp\(filters\.createdFrom\)/, 'log center should pass time filters to list APIs')
assert.match(panel, /operatorName: filters\.username\.trim\(\)/, 'content publishing logs should support operator filtering')
assert.match(panel, /keyword: filters\.keyword\.trim\(\)/, 'content publishing and gameplay logs should pass keyword filters')

assert.match(adminContentApi, /fetchAdminLogCenterOverview/, 'admin content API should expose log center overview')
assert.match(adminContentApi, /AdminLogCenterOverviewResult/, 'admin content API should type log center overview')
assert.match(adminContentApi, /retention\?:/, 'gameplay log list should expose retention metadata')
assert.match(adminContentApi, /AdminPrivateChatMessageEntry/, 'admin content API should type private chat messages')
assert.match(adminContentApi, /fetchAdminPrivateChatMessages/, 'admin content API should expose private chat message listing')
assert.match(adminContentApi, /sender_username/, 'private chat API should pass sender filter')
assert.match(adminContentApi, /recipient_username/, 'private chat API should pass recipient filter')
assert.match(adminContentApi, /operator_name/, 'content revision API should pass operator filter')
assert.match(adminContentApi, /keyword/, 'content revision API should pass keyword filter')
assert.match(adminContentApi, /created_from/, 'content revision and gameplay APIs should pass time filters')
assert.match(adminOnlineApi, /fetchAdminOnlineAuditLogPage/, 'admin online API should expose paged audit logs')
assert.match(adminOnlineApi, /created_from/, 'admin online API should pass time filters')
assert.match(userAdminApi, /operator_name/, 'admin audit API should pass operator filter')
assert.match(userAdminApi, /keyword/, 'admin audit API should pass keyword filter')
assert.match(userAdminApi, /created_from/, 'admin audit API should pass time filters')

console.log('qa-admin-log-center-structure passed')
