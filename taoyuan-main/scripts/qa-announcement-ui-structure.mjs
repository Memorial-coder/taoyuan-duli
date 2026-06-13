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

for (const field of ['impression_count', 'close_count', 'cta_click_count', 'read_count']) {
  assert.match(adminPanel, new RegExp(field), `admin stats field ${field} should be rendered`)
}
assert.match(adminPanel, /announcement-reward-config/, 'admin panel should render reward configuration')
assert.match(adminPanel, /duplicate_compensation_money/, 'admin panel should configure duplicate equipment compensation')
assert.match(adminPanel, /v\{\{ announcement\.version \}\}/, 'admin list should display announcement version')
assert.match(adminPanel, /reward_claim_count/, 'admin stats should include reward claim count')
assert.match(adminPanel, /previewCloseButtonLabel/, 'admin preview should derive reward-aware close button text')
assert.match(adminPanel, /知道并领取/, 'admin preview/help text should show reward claim wording')

assert.match(dialog, /announcements: TaoyuanAnnouncement\[\]/, 'player popup should receive the full announcement batch')
assert.match(dialog, /announcement-popup-item/, 'player popup should render batched announcement items')
assert.match(dialog, /announcement-popup-rewards/, 'player popup should render announcement reward previews')
assert.match(dialog, /hasAnnouncementRewards/, 'player popup should derive reward-aware close button text')
assert.match(dialog, /知道并领取/, 'player popup should label reward acknowledgement as claim action')
assert.match(dialog, /expandedAnnouncementIds/, 'player popup should track expanded announcement ids')
assert.match(dialog, /aria-expanded/, 'player popup items should expose expandable state')
assert.match(dialog, /props\.announcements\[0\]/, 'player popup should default to the first announcement')
assert.match(dialog, /saveUpdate/, 'player popup should expose save-and-update action')
assert.doesNotMatch(dialog, /suppress/, 'player popup should not render a separate suppress button')

assert.match(gameLayout, /AnnouncementDialog/, 'game layout should mount announcement dialog')
assert.match(gameLayout, /fetchActive\(\)/, 'game layout should fetch active announcements after entering save')
assert.match(gameLayout, /:announcements="announcementStore\.popupQueue"/, 'game layout should pass the full popup queue to announcement dialog')
assert.match(gameLayout, /:closing="announcementClosing"/, 'game layout should pass announcement closing state')
assert.match(gameLayout, /handleAnnouncementClose/, 'game layout should handle reward-aware announcement closing')
assert.match(gameLayout, /isMissingAnnouncementRewardSaveError/, 'game layout should detect missing service save during reward close')
assert.match(gameLayout, /promptAnnouncementRewardServerSave/, 'game layout should prompt save before retrying announcement rewards')
assert.match(gameLayout, /intent: 'save'/, 'missing-save announcement reward flow should open save manager without refresh')
assert.match(gameLayout, /服务端持久化/, 'missing-save announcement reward prompt should tell local-save players to switch server persistence')
assert.doesNotMatch(gameLayout, /:announcement="currentAnnouncement"/, 'game layout should not pass a single announcement to popup')
assert.match(gameLayout, /@save-update="handleAnnouncementSaveUpdate"/, 'game layout should wire save-and-update announcement action')
assert.match(gameLayout, /save-refresh/, 'game layout should open save manager in save-refresh mode')
assert.doesNotMatch(gameLayout, /@suppress=/, 'game layout should not wire a separate suppress announcement action')

assert.match(mainMenu, /main-menu-announcements/, 'main menu should expose announcement history entry')
assert.match(mainMenu, /saveStore\.storageMode === 'server'/, 'new game flow should branch on server persistence mode')
assert.match(mainMenu, /saveStore\.saveToSlot\(slot\)/, 'new server-mode game should immediately write the first service save')
assert.match(mainMenu, /lastSaveResultStatus === 'queued'/, 'new server-mode game should surface queued first-save status')
assert.match(historyDialog, /announcement-history-item/, 'history dialog should render announcement list items')
assert.match(historyDialog, /announcement-history-rewards/, 'history dialog should render reward previews')
assert.match(historyDialog, /expandedAnnouncementIds/, 'history dialog should track expanded announcement ids')
assert.match(historyDialog, /aria-expanded/, 'history dialog items should expose expandable state')
assert.match(historyDialog, /syncExpandedAnnouncements\(true\)/, 'history dialog should default to latest announcement on open')

assert.match(store, /taoyuan_announcement_suppressed_/, 'announcement suppress state should be persisted locally')
assert.match(store, /recordQueueImpressions/, 'announcement store should record impressions for the popup batch')
assert.match(store, /clickAnnouncementCta/, 'announcement store should record cta clicks for a selected batched announcement')
assert.match(store, /claimAnnouncementReward/, 'announcement store should claim rewards before marking announcements read')
assert.match(adminPanel, /deleteAdminAnnouncement/, 'admin panel should call delete announcement API helper')

console.log('qa-announcement-ui-structure passed')
