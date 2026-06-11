import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')

const read = file => fs.readFile(path.join(projectRoot, file), 'utf8')

const [
  adminView,
  adminPanel,
  gameLayout,
  mainMenu,
  dialog,
  historyDialog,
  store,
] = await Promise.all([
  read('src/views/TaoyuanAdminView.vue'),
  read('src/components/game/AdminAnnouncementPanel.vue'),
  read('src/views/GameLayout.vue'),
  read('src/views/MainMenu.vue'),
  read('src/components/game/AnnouncementDialog.vue'),
  read('src/components/game/AnnouncementHistoryDialog.vue'),
  read('src/stores/useAnnouncementStore.ts'),
])

assert.match(adminView, /activeAdminTab === 'announcements'/, 'admin announcements tab should be wired')
assert.match(adminView, /AdminAnnouncementPanel/, 'admin announcement panel should be rendered')

for (const templateId of ['version_update', 'maintenance', 'hotfix', 'event_preview', 'compensation']) {
  assert.match(adminPanel, new RegExp(templateId), `admin template ${templateId} should be available`)
}

for (const label of ['曝光数', '关闭数', '点击数', '已读人数']) {
  assert.match(adminPanel, new RegExp(label), `admin stats field ${label} should be rendered`)
}

for (const label of ['知道了', '保存存档并更新', '查看详情']) {
  assert.match(dialog, new RegExp(label), `player popup button ${label} should be present`)
}
assert.doesNotMatch(dialog, /本条不再提示/, 'player popup should not render a separate suppress button')

assert.match(gameLayout, /AnnouncementDialog/, 'game layout should mount announcement dialog')
assert.match(gameLayout, /fetchActive\(\)/, 'game layout should fetch active announcements after entering save')
assert.match(gameLayout, /@save-update="handleAnnouncementSaveUpdate"/, 'game layout should wire save-and-update announcement action')
assert.match(gameLayout, /save-refresh/, 'game layout should open save manager in save-refresh mode')
assert.doesNotMatch(gameLayout, /@suppress=/, 'game layout should not wire a separate suppress announcement action')
assert.match(mainMenu, /main-menu-announcements/, 'main menu should expose announcement history entry')
assert.match(historyDialog, /announcement-history-item/, 'history dialog should render announcement list items')
assert.match(store, /taoyuan_announcement_suppressed_/, 'announcement suppress state should be persisted locally')
assert.match(adminPanel, /已推送/, 'admin panel should surface realtime push count')
assert.match(adminPanel, /删除公告/, 'admin panel should render delete announcement button')
assert.match(adminPanel, /deleteAdminAnnouncement/, 'admin panel should call delete announcement API helper')

console.log('qa-announcement-ui-structure passed')
