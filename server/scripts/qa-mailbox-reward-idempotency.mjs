import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-mailbox-idempotency-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const mailboxFile = path.join(tempDir, 'taoyuan_mailbox.json')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const mailbox = require('../src/taoyuanMailbox')
const saveRuntime = require('../src/taoyuanSaveRuntime')

const username = 'mail_idem_0605'
const claimAllUsername = 'mail_idem_all_0605'
const targetSlotSender = 'mail_slot_s0612'
const targetSlotRecipient = 'mail_slot_r0612'

const seedSave = (account, money = 100) => {
  const slots = saveRuntime.loadUserSaveSlots(account)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: account,
        money,
      },
      inventory: {
        items: [],
        tempItems: [],
        capacity: 24,
      },
    }),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(account, slots)
  saveRuntime.setActiveSaveSlot(account, 0)
}

const seedSaveSlot = (account, slot, money = 100, items = []) => {
  const slots = saveRuntime.loadUserSaveSlots(account)
  slots.slots[slot] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: account,
        money,
      },
      inventory: {
        items,
        tempItems: [],
        capacity: 24,
      },
    }),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(account, slots)
}

const readRewardState = (account, slot = 0) => {
  const slots = saveRuntime.loadUserSaveSlots(account)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[slot]?.raw || '')
  const data = decrypted?.data?.player
    ? decrypted.data
    : decrypted?.gameplayData?.player
      ? decrypted.gameplayData
      : decrypted?.player
        ? decrypted
        : {}
  const items = Array.isArray(data?.inventory?.items) ? data.inventory.items : Array.isArray(data?.items) ? data.items : []
  const ownedWeapons = Array.isArray(data?.inventory?.ownedWeapons) ? data.inventory.ownedWeapons : []
  return {
    money: Number(data?.player?.money || 0),
    appliedDeliveries: data?.onlineMailRewards?.appliedDeliveries || {},
    wood: items
      .filter(item => String(item?.itemId || item?.id || '') === 'wood')
      .reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    stone: items
      .filter(item => String(item?.itemId || item?.id || '') === 'stone')
      .reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    woodenSticks: ownedWeapons.filter(item => String(item?.defId || '') === 'wooden_stick').length,
  }
}

const registerAndSeed = async (account, nickname, money = 100) => {
  const registered = await db.registerUser(account, nickname, account)
  assert.equal(registered.ok, true, `${account} should register`)
  seedSave(account, money)
}

const sendRewardMail = async (account, title, rewards) => {
  await mailbox.saveAdminCampaign({
    title,
    content: 'claim once even if mailbox state write is lost',
    template_type: 'activity_reward',
    recipient_rule: {
      mode: 'single',
      username: account,
    },
    rewards: Array.isArray(rewards) ? rewards : [{ type: 'money', amount: rewards }],
  }, {
    username: 'qa_admin',
    displayName: 'QA Admin',
  }, 'send', {
    skipPendingCampaigns: true,
  })
}

await registerAndSeed(username, 'MailIdem_0605', 100)
await sendRewardMail(username, 'mail idempotency reward', [
  { type: 'money', amount: 25 },
  { type: 'item', id: 'wood', quantity: 2 },
  { type: 'weapon', id: 'wooden_stick', quantity: 1 },
])

const beforeClaimMailbox = await readFile(mailboxFile, 'utf8')
const list = await mailbox.listUserMails(username, { skipPendingCampaigns: true })
const delivery = list.mails.find(entry => entry.can_claim)
assert.ok(delivery?.id, 'claimable reward delivery should exist')

const firstClaim = await mailbox.claimUserMail(username, delivery.id, { skipPendingCampaigns: true })
assert.equal(firstClaim.result.money_added, 25, 'first claim should grant money')
assert.ok(firstClaim.result.save_revision > 0, 'first claim should return save revision')
assert.equal(readRewardState(username).money, 125, 'first claim should persist money')
assert.equal(readRewardState(username).wood, 2, 'first claim should persist item reward')
assert.equal(readRewardState(username).woodenSticks, 1, 'first claim should persist equipment reward')
assert.ok(readRewardState(username).appliedDeliveries[delivery.id], 'first claim should write save-side delivery ledger')

await writeFile(mailboxFile, beforeClaimMailbox, 'utf8')
const replayClaim = await mailbox.claimUserMail(username, delivery.id, { skipPendingCampaigns: true })
assert.equal(replayClaim.result.money_added, 25, 'replay should return the original claim result')
assert.ok(replayClaim.result.save_revision > 0, 'replay should preserve save revision evidence')
assert.equal(readRewardState(username).money, 125, 'replay after mailbox rollback must not grant money twice')
assert.equal(readRewardState(username).wood, 2, 'replay after mailbox rollback must not grant item twice')
assert.equal(readRewardState(username).woodenSticks, 1, 'replay after mailbox rollback must not grant equipment twice')

const finalList = await mailbox.listUserMails(username, { skipPendingCampaigns: true })
const finalDelivery = finalList.mails.find(entry => entry.id === delivery.id)
assert.equal(finalDelivery.is_claimed, true, 'replay should repair mailbox claimed state')

await registerAndSeed(claimAllUsername, 'MailIdemAll_0605', 200)
await sendRewardMail(claimAllUsername, 'mail idempotency claim all reward a', [
  { type: 'money', amount: 12 },
  { type: 'item', id: 'stone', quantity: 3 },
])
await sendRewardMail(claimAllUsername, 'mail idempotency claim all reward b', [
  { type: 'money', amount: 8 },
  { type: 'weapon', id: 'wooden_stick', quantity: 1 },
])

const unreadBeforeReadAll = await mailbox.listUserMails(claimAllUsername, { skipPendingCampaigns: true })
assert.equal(unreadBeforeReadAll.unread_count, 2, 'claim-all scenario should start with two unread deliveries')
const markAllRead = await mailbox.markAllUserMailsRead(claimAllUsername)
assert.equal(markAllRead.count, 2, 'mark-all-read should mark all unread mailbox deliveries')
assert.equal(markAllRead.unread_count, 0, 'mark-all-read should return zero remaining unread deliveries')
const markAllReadAgain = await mailbox.markAllUserMailsRead(claimAllUsername)
assert.equal(markAllReadAgain.count, 0, 'mark-all-read should be idempotent when nothing is unread')
const afterReadAllList = await mailbox.listUserMails(claimAllUsername, { skipPendingCampaigns: true })
assert.equal(afterReadAllList.unread_count, 0, 'mail list should reflect all deliveries as read')
assert.ok(afterReadAllList.mails.every(entry => !entry.unread), 'mail summaries should no longer be unread after mark-all-read')
assert.equal(afterReadAllList.mails.filter(entry => entry.can_claim).length, 2, 'mark-all-read must not consume claimable rewards')

const beforeClaimAllMailbox = await readFile(mailboxFile, 'utf8')
const claimAllList = afterReadAllList
const claimAllDeliveries = claimAllList.mails.filter(entry => entry.can_claim)
assert.equal(claimAllDeliveries.length, 2, 'claim-all scenario should have two claimable deliveries')

const firstClaimAll = await mailbox.claimAllUserMails(claimAllUsername, { skipPendingCampaigns: true })
const firstClaimAllMoney = firstClaimAll.claimed.reduce((sum, entry) => sum + Number(entry.result?.money_added || 0), 0)
assert.equal(firstClaimAll.claimed.length, 2, 'first claim-all should claim both deliveries')
assert.equal(firstClaimAllMoney, 20, 'first claim-all should grant both rewards')
assert.equal(readRewardState(claimAllUsername).money, 220, 'first claim-all should persist money once')
assert.equal(readRewardState(claimAllUsername).stone, 3, 'first claim-all should persist item reward once')
assert.equal(readRewardState(claimAllUsername).woodenSticks, 1, 'first claim-all should persist equipment reward once')
for (const deliveryEntry of claimAllDeliveries) {
  assert.ok(readRewardState(claimAllUsername).appliedDeliveries[deliveryEntry.id], 'claim-all should write save-side delivery ledger')
}

await writeFile(mailboxFile, beforeClaimAllMailbox, 'utf8')
const replayClaimAll = await mailbox.claimAllUserMails(claimAllUsername, { skipPendingCampaigns: true })
const replayClaimAllMoney = replayClaimAll.claimed.reduce((sum, entry) => sum + Number(entry.result?.money_added || 0), 0)
assert.equal(replayClaimAll.claimed.length, 2, 'claim-all replay should repair both mailbox deliveries')
assert.equal(replayClaimAllMoney, 20, 'claim-all replay should return original claim results')
assert.equal(readRewardState(claimAllUsername).money, 220, 'claim-all replay after mailbox rollback must not grant money twice')
assert.equal(readRewardState(claimAllUsername).stone, 3, 'claim-all replay after mailbox rollback must not grant item twice')
assert.equal(readRewardState(claimAllUsername).woodenSticks, 1, 'claim-all replay after mailbox rollback must not grant equipment twice')

const finalClaimAllList = await mailbox.listUserMails(claimAllUsername, { skipPendingCampaigns: true })
for (const deliveryEntry of claimAllDeliveries) {
  const finalClaimAllDelivery = finalClaimAllList.mails.find(entry => entry.id === deliveryEntry.id)
  assert.equal(finalClaimAllDelivery.is_claimed, true, 'claim-all replay should repair mailbox claimed state')
}

await registerAndSeed(targetSlotSender, 'MailTargetSlotSender_0612', 100)
seedSaveSlot(targetSlotSender, 0, 100, [
  { itemId: 'wood', quality: 'normal', quantity: 5, locked: false },
])
saveRuntime.setActiveSaveSlot(targetSlotSender, 0)

const registeredTargetSlotRecipient = await db.registerUser(targetSlotRecipient, 'MailTargetSlotRecipient_0612', targetSlotRecipient)
assert.equal(registeredTargetSlotRecipient.ok, true, 'target slot recipient should register')
seedSaveSlot(targetSlotRecipient, 0, 100)
seedSaveSlot(targetSlotRecipient, 1, 200)
saveRuntime.setActiveSaveSlot(targetSlotRecipient, 0)
saveRuntime.getActiveSaveContext(targetSlotRecipient, 0)
const targetSlotIdentity = saveRuntime.getActiveSaveContext(targetSlotRecipient, 1).identity
assert.equal(targetSlotIdentity.save_slot, 1, 'target save identity should point at slot 1')

await mailbox.sendPlayerGiftPackage({
  target_save_id: targetSlotIdentity.save_id,
  title: 'target save slot gift',
  content: 'claim should land in the save id slot, not the current active slot',
  template_type: 'material_package',
  rewards: [
    { type: 'item', id: 'wood', quantity: 2, quality: 'normal' },
  ],
}, {
  username: targetSlotSender,
  displayName: 'Mail Target Slot Sender',
}, {
  skipPendingCampaigns: true,
})

const targetSlotList = await mailbox.listUserMails(targetSlotRecipient, { skipPendingCampaigns: true })
const targetSlotDelivery = targetSlotList.mails.find(entry => entry.title === 'target save slot gift')
assert.ok(targetSlotDelivery?.id, 'target save id gift should be delivered')
assert.equal(targetSlotDelivery.target_save_slot, 1, 'gift mail should expose target save slot 1')

const targetSlotClaim = await mailbox.claimUserMail(targetSlotRecipient, targetSlotDelivery.id, { skipPendingCampaigns: true })
assert.equal(targetSlotClaim.result.save_slot, 1, 'gift claim should write to target save slot, not active slot')
assert.ok(targetSlotClaim.result.save_revision > 0, 'target slot gift claim should return save revision')
assert.equal(readRewardState(targetSlotRecipient, 0).wood, 0, 'gift claim must not write to recipient active slot')
assert.equal(readRewardState(targetSlotRecipient, 1).wood, 2, 'gift claim should persist item reward in target save id slot')
assert.ok(readRewardState(targetSlotRecipient, 1).appliedDeliveries[targetSlotDelivery.id], 'target slot claim should write save-side delivery ledger')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-mailbox-reward-idempotency] OK')
