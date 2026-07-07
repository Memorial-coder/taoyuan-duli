import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-private-chat-admin-log-${process.pid}`)
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
const saveRuntime = require('../src/taoyuanSaveRuntime')

const now = Math.floor(Date.now() / 1000)
const sender = 'admin_chat_sender'
const recipient = 'admin_chat_recipient'
const other = 'admin_chat_other'

const seedSave = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: username,
        money: 100,
      },
      inventory: {
        items: [],
        tempItems: [],
        ownedWeapons: [],
        ownedRings: [],
        ownedHats: [],
        ownedShoes: [],
        capacity: 24,
      },
    }),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
  return saveRuntime.getActiveSaveContext(username, 0).identity
}

const registerAndSeed = async (username, displayName) => {
  const registered = await db.registerUser(username, 'secret123', displayName)
  assert.equal(registered.ok, true, `${username} should register`)
  return seedSave(username)
}

const senderIdentity = await registerAndSeed(sender, '后台发送者')
const recipientIdentity = await registerAndSeed(recipient, '后台接收者')
const otherIdentity = await registerAndSeed(other, '后台其他人')

await writeFile(socialFile, JSON.stringify({
  profiles: {},
  friend_requests: [],
  friendships: [
    {
      id: 'qa_private_chat_admin_main',
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
      id: 'qa_private_chat_admin_other',
      username_a: other,
      username_b: recipient,
      save_id_a: otherIdentity.save_id,
      save_id_b: recipientIdentity.save_id,
      save_slot_a: otherIdentity.save_slot,
      save_slot_b: recipientIdentity.save_slot,
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

await chatRuntime.sendMessage(sender, {
  target_username: recipient,
  content: '管理员需要看到这条私聊。',
}, {
  username: sender,
  displayName: '后台发送者',
})

await chatRuntime.sendMessage(other, {
  target_username: recipient,
  content: '另一条不该被发送者筛选命中。',
}, {
  username: other,
  displayName: '后台其他人',
})

const adminList = await chatRuntime.listAdminPrivateChatMessages({
  page: 1,
  pageSize: 20,
})
assert.equal(adminList.total, 2, 'admin private chat list should expose all private chat messages')
assert.ok(adminList.messages[0].created_at >= adminList.messages[1].created_at, 'admin private chat messages should sort newest first')
const targetMessage = adminList.messages.find(message => message.sender_username === sender)
assert.ok(targetMessage, 'admin private chat list should include the sender message')
assert.equal(targetMessage.recipient_username, recipient, 'admin private chat list should expose the recipient username')
assert.equal(targetMessage.content, '管理员需要看到这条私聊。', 'admin private chat list should expose message content')
assert.equal(typeof targetMessage.created_at, 'number', 'admin private chat list should expose message time')

const senderFiltered = await chatRuntime.listAdminPrivateChatMessages({
  senderUsername: sender,
  pageSize: 10,
})
assert.equal(senderFiltered.total, 1, 'admin private chat list should filter by sender')
assert.equal(senderFiltered.messages[0]?.sender_username, sender, 'sender filter should return the expected sender')

const recipientFiltered = await chatRuntime.listAdminPrivateChatMessages({
  recipientUsername: recipient,
  keyword: '私聊',
  createdFrom: now - 10,
  createdTo: now + 10,
  pageSize: 10,
})
assert.equal(recipientFiltered.total, 1, 'admin private chat list should combine recipient, keyword, and time filters')
assert.equal(recipientFiltered.messages[0]?.content, '管理员需要看到这条私聊。', 'combined filters should return the expected message')

const overview = chatRuntime.getAdminPrivateChatOverview()
assert.equal(overview.total, 2, 'admin private chat overview should expose total private chat messages')
assert.equal(typeof overview.latest_created_at, 'number', 'admin private chat overview should expose latest message time')

const routeSource = await readFile(path.join(serverRoot, 'src', 'routes', 'api.js'), 'utf8')
assert.match(routeSource, /router\.get\('\/admin\/private-chat\/messages'/, 'admin private chat API route should be registered')
assert.match(routeSource, /listAdminPrivateChatMessages/, 'admin private chat API route should call the runtime list function')

await rm(tempDir, { recursive: true, force: true })
console.log('[qa-private-chat-admin-log] OK')
