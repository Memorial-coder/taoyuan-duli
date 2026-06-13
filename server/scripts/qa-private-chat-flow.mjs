import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-private-chat-flow-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const socialFile = path.join(tempDir, 'taoyuan_social_profiles.json')

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

const require = createRequire(import.meta.url)
const db = require('../src/db')
const chatRuntime = require('../src/taoyuanChatRuntime')
const mailbox = require('../src/taoyuanMailbox')
const saveRuntime = require('../src/taoyuanSaveRuntime')
const socialRuntime = require('../src/taoyuanSocialRuntime')

const now = Math.floor(Date.now() / 1000)
const sender = 'chat_sender_0613'
const recipient = 'chat_recipient_0613'
const stranger = 'chat_stranger_0613'
const blockedSender = 'chat_blocker_0613'
const blockedRecipient = 'chat_blocked_0613'

const seedSave = (username, money = 100, items = []) => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: username,
        money,
      },
      inventory: {
        items,
        tempItems: [],
        ownedWeapons: [],
        ownedRings: [],
        ownedHats: [],
        ownedShoes: [],
        capacity: 24,
      },
      decoration: {
        owned: {},
      },
    }),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
  return saveRuntime.getActiveSaveContext(username, 0).identity
}

const readItemQuantity = (username, itemId) => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const decrypted = saveRuntime.decryptTaoyuanRaw(slots.slots[0]?.raw || '')
  const data = decrypted?.data?.player
    ? decrypted.data
    : decrypted?.gameplayData?.player
      ? decrypted.gameplayData
      : decrypted?.player
        ? decrypted
        : {}
  const items = Array.isArray(data?.inventory?.items) ? data.inventory.items : []
  return items
    .filter(item => String(item?.itemId || item?.id || '') === itemId)
    .reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
}

const registerAndSeed = async (username, displayName, items = []) => {
  const registered = await db.registerUser(username, 'secret123', displayName)
  assert.equal(registered.ok, true, `${username} should register`)
  return seedSave(username, 100, items)
}

const expectRejected = async (label, runner, expectedStatus) => {
  try {
    await runner()
  } catch (error) {
    assert.equal(error.status || 400, expectedStatus, `${label} should reject with ${expectedStatus}`)
    return error
  }
  assert.fail(`${label} should reject`)
}

const senderIdentity = await registerAndSeed(sender, '聊天发送者', [
  { itemId: 'wood', quality: 'normal', quantity: 5, locked: false },
])
const recipientIdentity = await registerAndSeed(recipient, '聊天接收者')
await registerAndSeed(stranger, '聊天陌生人')
const blockedSenderIdentity = await registerAndSeed(blockedSender, '拉黑发起者')
const blockedRecipientIdentity = await registerAndSeed(blockedRecipient, '拉黑接收者')

await writeFile(socialFile, JSON.stringify({
  profiles: {},
  friend_requests: [],
  friendships: [
    {
      id: 'qa_chat_friendship_main',
      username_a: sender,
      username_b: recipient,
      save_id_a: senderIdentity.save_id,
      save_id_b: recipientIdentity.save_id,
      save_slot_a: senderIdentity.save_slot,
      save_slot_b: recipientIdentity.save_slot,
      created_at: now,
      updated_at: now,
      last_interaction_at: now,
    },
    {
      id: 'qa_chat_friendship_blocked',
      username_a: blockedSender,
      username_b: blockedRecipient,
      save_id_a: blockedSenderIdentity.save_id,
      save_id_b: blockedRecipientIdentity.save_id,
      save_slot_a: blockedSenderIdentity.save_slot,
      save_slot_b: blockedRecipientIdentity.save_slot,
      created_at: now,
      updated_at: now,
      last_interaction_at: now,
    },
  ],
  blocks: [],
  neighbor_groups: [],
  neighbor_join_requests: [],
  subscriptions: [],
}, null, 2), 'utf8')

const textResult = await chatRuntime.sendMessage(sender, {
  target_username: recipient,
  content: '今天去竹林采了些材料。',
}, {
  username: sender,
  displayName: '聊天发送者',
})
assert.equal(textResult.message.type, 'text', 'friend text message should be stored as text')
assert.equal(textResult.recipient_username, recipient, 'text recipient should match target')

const photoResult = await chatRuntime.sendMessage(sender, {
  target_save_id: recipientIdentity.save_id,
  content: '给你看新布置。',
  photo_url: 'https://example.test/chat/photo.webp',
  photo_alt: '庄园新布置',
}, {
  username: sender,
  displayName: '聊天发送者',
})
assert.equal(photoResult.message.type, 'photo', 'photo URL should create photo message')
assert.equal(photoResult.message.photo_url, 'https://example.test/chat/photo.webp', 'photo URL should be preserved')

const recipientConversations = await chatRuntime.listConversations(recipient)
const recipientConversation = recipientConversations.conversations.find(item => item.peer_username === sender)
assert.ok(recipientConversation?.id, 'recipient should see friend conversation')
assert.equal(recipientConversation.unread_count, 2, 'recipient should see unread text and photo messages')

const recipientMessages = await chatRuntime.listMessages(recipient, recipientConversation.id)
assert.equal(recipientMessages.messages.length, 2, 'recipient message stream should include text and photo')
await chatRuntime.markConversationRead(recipient, recipientConversation.id)
const readConversations = await chatRuntime.listConversations(recipient)
assert.equal(
  readConversations.conversations.find(item => item.id === recipientConversation.id)?.unread_count,
  0,
  'mark read should clear unread count for current user',
)

await expectRejected('non-friend chat', () => chatRuntime.sendMessage(sender, {
  target_username: stranger,
  content: '不能绕过好友关系。',
}, {
  username: sender,
  displayName: '聊天发送者',
}), 403)

await expectRejected('self chat by username', () => chatRuntime.sendMessage(sender, {
  target_username: sender,
  content: '不能给自己发。',
}, {
  username: sender,
  displayName: '聊天发送者',
}), 400)

await socialRuntime.blockPlayer(blockedSender, { target_username: blockedRecipient })
await expectRejected('blocked chat', () => chatRuntime.sendMessage(blockedSender, {
  target_username: blockedRecipient,
  content: '拉黑后不能发送。',
}, {
  username: blockedSender,
  displayName: '拉黑发起者',
}), 403)

const senderWoodBeforeGift = readItemQuantity(sender, 'wood')
const giftResult = await chatRuntime.sendGift(sender, {
  target_username: recipient,
  content: '送你两块木材。',
  rewards: [
    { type: 'item', id: 'wood', quantity: 2, quality: 'normal' },
  ],
}, {
  username: sender,
  displayName: '聊天发送者',
})
assert.equal(giftResult.message.type, 'gift', 'friend gift should be stored as gift message')
assert.ok(giftResult.message.gift?.delivery_id, 'gift message should expose hidden delivery id')
assert.equal(giftResult.message.gift?.rewards?.[0]?.id, 'wood', 'gift message should expose reward summary id')
assert.equal(giftResult.message.gift?.rewards?.[0]?.quantity, 2, 'gift message should expose reward summary quantity')
assert.equal(readItemQuantity(sender, 'wood'), senderWoodBeforeGift - 2, 'chat gift should deduct sender inventory')

const hiddenDeliveryId = giftResult.message.gift.delivery_id
const recipientMailList = await mailbox.listUserMails(recipient, { skipPendingCampaigns: true })
assert.equal(recipientMailList.mails.some(mail => mail.id === hiddenDeliveryId), false, 'chat gift delivery should not appear in inbox')
assert.equal(mailbox.getUserMail(recipient, hiddenDeliveryId), null, 'chat gift delivery should be hidden from mailbox detail API')
await expectRejected('direct mailbox claim for chat gift', () => mailbox.claimUserMail(recipient, hiddenDeliveryId, { skipPendingCampaigns: true }), 404)

const recipientWoodBeforeClaim = readItemQuantity(recipient, 'wood')
const claimed = await chatRuntime.claimGiftMessage(recipient, giftResult.message.id)
assert.equal(claimed.claim.result.applied_rewards[0]?.id, 'wood', 'chat gift claim should reuse mailbox reward application')
assert.equal(readItemQuantity(recipient, 'wood'), recipientWoodBeforeClaim + 2, 'chat gift claim should grant reward once')
assert.equal(claimed.message.gift?.is_claimed, true, 'claimed chat gift should update message gift state')
assert.equal(claimed.message.gift?.claimed_rewards?.[0]?.id, 'wood', 'claimed chat gift should expose applied reward summary')
assert.equal(claimed.message.gift?.claimed_rewards?.[0]?.quantity, 2, 'claimed chat gift should expose applied reward quantity')

await expectRejected('second chat gift claim', () => chatRuntime.claimGiftMessage(recipient, giftResult.message.id), 400)
assert.equal(readItemQuantity(recipient, 'wood'), recipientWoodBeforeClaim + 2, 'second claim must not duplicate reward')

const receipts = await mailbox.listUserMailReceipts(recipient)
assert.equal(receipts.receipts.some(receipt => receipt.delivery_id === hiddenDeliveryId), false, 'chat gift claim receipt should not appear in mailbox receipts')
await mailbox.clearClaimedUserMails(recipient)
assert.ok(
  mailbox.getUserMail(recipient, hiddenDeliveryId, { includeChatSurface: true }),
  'clear claimed mailbox action should not delete hidden chat gift deliveries',
)

const rawChatStore = JSON.parse(await readFile(path.join(tempDir, 'taoyuan_private_chat.json'), 'utf8'))
assert.equal(rawChatStore.messages.length, 3, 'chat store should persist text, photo, and gift messages')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-private-chat-flow] OK')
