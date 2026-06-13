const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const taoyuanMailbox = require('./taoyuanMailbox');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const { moderateText } = require('./taoyuanTextModeration');
const { writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_PRIVATE_CHAT_FILE = path.join(DATA_DIR, 'taoyuan_private_chat.json');
const MAX_MESSAGE_CONTENT_LENGTH = 1200;
const MAX_PHOTO_URL_LENGTH = 300;
const MAX_PHOTO_ALT_LENGTH = 80;
const MAX_MESSAGES_PER_CONVERSATION = 500;
const MAX_CONVERSATIONS = 2000;

let _chatLockTail = Promise.resolve();

function createError(message, status = 400, code = '') {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeText(value, maxLength = 2000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, Math.max(0, Number(maxLength) || 0));
}

function clampTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : Math.floor(Date.now() / 1000);
}

function normalizeReadTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : 0;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildParticipantKey(left, right) {
  return [normalizeUsername(left), normalizeUsername(right)].sort((a, b) => a.localeCompare(b, 'zh-CN')).join(':');
}

function buildConversationId(left, right) {
  const digest = crypto.createHash('sha1').update(buildParticipantKey(left, right)).digest('hex').slice(0, 16);
  return `chat_${digest}`;
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== 'object') return null;
  const participants = Array.isArray(conversation.participants)
    ? conversation.participants.map(normalizeUsername).filter(Boolean)
    : [];
  const uniqueParticipants = [...new Set(participants)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  if (uniqueParticipants.length !== 2) return null;
  const [left, right] = uniqueParticipants;
  const now = Math.floor(Date.now() / 1000);
  return {
    id: String(conversation.id || buildConversationId(left, right)),
    participants: uniqueParticipants,
    participant_key: buildParticipantKey(left, right),
    created_at: clampTimestamp(conversation.created_at || now),
    updated_at: clampTimestamp(conversation.updated_at || conversation.created_at || now),
    last_message_id: String(conversation.last_message_id || ''),
    read_at_by_username: conversation.read_at_by_username && typeof conversation.read_at_by_username === 'object'
      ? Object.fromEntries(Object.entries(conversation.read_at_by_username)
        .map(([username, value]) => [normalizeUsername(username), normalizeReadTimestamp(value)])
        .filter(([username]) => !!username))
      : {},
  };
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const conversationId = String(message.conversation_id || '').trim();
  const senderUsername = normalizeUsername(message.sender_username);
  const recipientUsername = normalizeUsername(message.recipient_username);
  if (!conversationId || !senderUsername || !recipientUsername) return null;
  const type = ['text', 'photo', 'gift'].includes(String(message.type)) ? String(message.type) : 'text';
  return {
    id: String(message.id || makeId('chat_msg')),
    conversation_id: conversationId,
    sender_username: senderUsername,
    sender_display_name: sanitizeText(message.sender_display_name || senderUsername, 60),
    recipient_username: recipientUsername,
    recipient_display_name: sanitizeText(message.recipient_display_name || recipientUsername, 60),
    type,
    content: sanitizeText(message.content, MAX_MESSAGE_CONTENT_LENGTH),
    photo_url: sanitizeText(message.photo_url, MAX_PHOTO_URL_LENGTH),
    photo_alt: sanitizeText(message.photo_alt, MAX_PHOTO_ALT_LENGTH),
    gift_delivery_id: sanitizeText(message.gift_delivery_id, 80),
    gift_reward_count: Math.max(0, Math.floor(Number(message.gift_reward_count) || 0)),
    gift_claimed_at: Number(message.gift_claimed_at) || null,
    created_at: clampTimestamp(message.created_at),
    deleted_at: Number(message.deleted_at) || null,
  };
}

function defaultChatData() {
  return {
    conversations: [],
    messages: [],
  };
}

function loadChatData() {
  try {
    if (!fs.existsSync(TAOYUAN_PRIVATE_CHAT_FILE)) return defaultChatData();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_PRIVATE_CHAT_FILE, 'utf8'));
    return {
      conversations: Array.isArray(raw?.conversations) ? raw.conversations.map(normalizeConversation).filter(Boolean) : [],
      messages: Array.isArray(raw?.messages) ? raw.messages.map(normalizeMessage).filter(Boolean) : [],
    };
  } catch {
    return defaultChatData();
  }
}

function saveChatData(data) {
  const conversations = (Array.isArray(data?.conversations) ? data.conversations : [])
    .map(normalizeConversation)
    .filter(Boolean)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0))
    .slice(0, MAX_CONVERSATIONS);
  const activeConversationIds = new Set(conversations.map(item => item.id));
  const messages = (Array.isArray(data?.messages) ? data.messages : [])
    .map(normalizeMessage)
    .filter(item => activeConversationIds.has(item.conversation_id))
    .sort((left, right) => (left.created_at || 0) - (right.created_at || 0));
  const limitedMessages = [];
  const counts = new Map();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const count = counts.get(message.conversation_id) || 0;
    if (count >= MAX_MESSAGES_PER_CONVERSATION) continue;
    counts.set(message.conversation_id, count + 1);
    limitedMessages.push(message);
  }
  writeJsonFileAtomic(TAOYUAN_PRIVATE_CHAT_FILE, {
    conversations,
    messages: limitedMessages.reverse(),
  });
}

function withChatLock(task) {
  const prev = _chatLockTail;
  let release;
  _chatLockTail = new Promise(resolve => {
    release = resolve;
  });
  return prev
    .catch(() => {})
    .then(task)
    .finally(() => release());
}

function getConversationPeer(conversation, username) {
  const viewer = normalizeUsername(username);
  return conversation.participants.find(item => item !== viewer) || '';
}

function assertConversationParticipant(conversation, username) {
  const viewer = normalizeUsername(username);
  if (!conversation?.participants?.includes(viewer)) throw createError('私聊会话不存在', 404);
}

function findConversation(data, left, right) {
  const key = buildParticipantKey(left, right);
  return data.conversations.find(item => item.participant_key === key) || null;
}

function upsertConversation(data, left, right, timestamp) {
  const participants = [normalizeUsername(left), normalizeUsername(right)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  let conversation = findConversation(data, participants[0], participants[1]);
  if (!conversation) {
    conversation = normalizeConversation({
      id: buildConversationId(participants[0], participants[1]),
      participants,
      participant_key: buildParticipantKey(participants[0], participants[1]),
      created_at: timestamp,
      updated_at: timestamp,
      read_at_by_username: {},
    });
    data.conversations.push(conversation);
  }
  conversation.updated_at = timestamp;
  return conversation;
}

function assertCanChat(username, targetPayload) {
  const target = taoyuanSocialRuntime.resolveChatTargetForUser(username, targetPayload);
  if (target.relation_status === 'blocked') throw createError('已拉黑或被对方拉黑，暂时不能私聊', 403);
  if (target.relation_status !== 'friend') throw createError('只能和好友私聊', 403);
  return target;
}

function buildRewardSummary(reward) {
  if (!reward || typeof reward !== 'object') return null;
  const type = sanitizeText(reward.type, 40);
  if (!type) return null;
  const summary = { type };
  const id = sanitizeText(reward.id, 80);
  const quality = sanitizeText(reward.quality, 20);
  const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
  const quantity = Math.max(0, Math.floor(Number(reward.quantity) || 0));
  if (id) summary.id = id;
  if (amount > 0) summary.amount = amount;
  if (quantity > 0) summary.quantity = quantity;
  if (quality) summary.quality = quality;
  const source = sanitizeText(reward.source, 80);
  if (source) summary.source = source;
  const targetRewardType = sanitizeText(reward.target_reward_type, 40);
  const targetRewardId = sanitizeText(reward.target_reward_id, 80);
  if (targetRewardType) summary.target_reward_type = targetRewardType;
  if (targetRewardId) summary.target_reward_id = targetRewardId;
  return summary;
}

function buildRewardSummaries(rewards) {
  if (!Array.isArray(rewards)) return [];
  return rewards.map(buildRewardSummary).filter(Boolean).slice(0, 20);
}

function buildGiftState(message, viewerUsername) {
  if (message.type !== 'gift' || !message.gift_delivery_id) return null;
  const isRecipient = normalizeUsername(viewerUsername) === message.recipient_username;
  const mail = taoyuanMailbox.getUserMail(message.recipient_username, message.gift_delivery_id, { includeChatSurface: true });
  const claimedAt = Number(mail?.claimed_at || message.gift_claimed_at) || null;
  return {
    delivery_id: message.gift_delivery_id,
    reward_count: Math.max(0, Number(mail?.reward_count ?? message.gift_reward_count) || 0),
    can_claim: isRecipient && !!mail?.can_claim,
    is_claimed: !!claimedAt,
    claimed_at: claimedAt,
    claim_status: mail?.claim_status || (claimedAt ? 'claimed' : 'claimable'),
    rewards: buildRewardSummaries(mail?.rewards),
    claimed_rewards: buildRewardSummaries(mail?.claim_result?.applied_rewards),
  };
}

function summarizeMessage(message) {
  if (!message) return '';
  if (message.type === 'gift') return message.content || '送来一份礼物';
  if (message.type === 'photo') return message.content || message.photo_alt || '发来一张图片';
  return message.content;
}

async function buildConversationSummary(conversation, messages, viewerUsername) {
  const viewer = normalizeUsername(viewerUsername);
  const peerUsername = getConversationPeer(conversation, viewer);
  const lastMessage = [...messages]
    .filter(item => item.conversation_id === conversation.id && !item.deleted_at)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))[0] || null;
  const readAt = Number(conversation.read_at_by_username?.[viewer]) || 0;
  const unreadCount = messages.filter(item =>
    item.conversation_id === conversation.id &&
    item.recipient_username === viewer &&
    !item.deleted_at &&
    item.created_at > readAt
  ).length;
  let peerProfile = null;
  try {
    peerProfile = await taoyuanSocialRuntime.buildRelationCard(peerUsername, viewer);
  } catch {
    peerProfile = {
      username: peerUsername,
      display_name: peerUsername,
      avatar_image_url: '',
      avatar_image_alt: '',
      public_title: '',
      manor_name: '',
      recent_activity: '',
      primary_route_label: '',
    };
  }
  return {
    id: conversation.id,
    peer_username: peerUsername,
    peer_profile: peerProfile,
    updated_at: conversation.updated_at,
    last_message: lastMessage ? buildMessageForUser(lastMessage, viewer) : null,
    last_message_preview: summarizeMessage(lastMessage),
    unread_count: unreadCount,
  };
}

function buildMessageForUser(message, viewerUsername) {
  const viewer = normalizeUsername(viewerUsername);
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_username: message.sender_username,
    sender_display_name: message.sender_display_name,
    recipient_username: message.recipient_username,
    recipient_display_name: message.recipient_display_name,
    type: message.type,
    content: message.content,
    photo_url: message.photo_url,
    photo_alt: message.photo_alt,
    gift: buildGiftState(message, viewer),
    is_own: message.sender_username === viewer,
    created_at: message.created_at,
  };
}

async function listConversations(username) {
  const viewer = normalizeUsername(username);
  const data = loadChatData();
  const conversations = data.conversations
    .filter(item => item.participants.includes(viewer))
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));
  return {
    conversations: await Promise.all(conversations.map(item => buildConversationSummary(item, data.messages, viewer))),
  };
}

async function listMessages(username, conversationId, options = {}) {
  const viewer = normalizeUsername(username);
  const data = loadChatData();
  const conversation = data.conversations.find(item => item.id === String(conversationId || '').trim());
  assertConversationParticipant(conversation, viewer);
  const safeLimit = Math.max(1, Math.min(80, Math.floor(Number(options.limit) || 50)));
  const before = Number(options.before) || 0;
  const messages = data.messages
    .filter(item => item.conversation_id === conversation.id && !item.deleted_at)
    .filter(item => !before || item.created_at < before)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .slice(0, safeLimit)
    .reverse()
    .map(item => buildMessageForUser(item, viewer));
  return {
    conversation: await buildConversationSummary(conversation, data.messages, viewer),
    messages,
  };
}

async function sendMessage(username, payload = {}, actor = {}) {
  return withChatLock(async () => {
    const sender = normalizeUsername(username);
    const target = assertCanChat(sender, payload);
    const recipient = normalizeUsername(target.username);
    const content = moderateText(payload?.content, {
      label: '私聊内容',
      field: 'content',
      scene: 'private_chat',
      maxLength: MAX_MESSAGE_CONTENT_LENGTH,
      storageMaxLength: MAX_MESSAGE_CONTENT_LENGTH,
      auditContext: actor.auditContext,
    });
    const photoUrl = sanitizeText(payload?.photo_url, MAX_PHOTO_URL_LENGTH);
    const photoAlt = photoUrl
      ? moderateText(payload?.photo_alt, {
        label: '私聊图片说明',
        field: 'photo_alt',
        scene: 'private_chat',
        maxLength: MAX_PHOTO_ALT_LENGTH,
        storageMaxLength: MAX_PHOTO_ALT_LENGTH,
        auditContext: actor.auditContext,
      })
      : '';
    if (!content && !photoUrl) throw createError('请输入要发送的私聊内容');

    const now = Math.floor(Date.now() / 1000);
    const data = loadChatData();
    const conversation = upsertConversation(data, sender, recipient, now);
    const message = normalizeMessage({
      id: makeId('chat_msg'),
      conversation_id: conversation.id,
      sender_username: sender,
      sender_display_name: actor.displayName || sender,
      recipient_username: recipient,
      recipient_display_name: target.identity?.nickname_snapshot || recipient,
      type: photoUrl ? 'photo' : 'text',
      content,
      photo_url: photoUrl,
      photo_alt: photoAlt,
      created_at: now,
    });
    data.messages.push(message);
    conversation.last_message_id = message.id;
    conversation.updated_at = now;
    conversation.read_at_by_username[sender] = now;
    saveChatData(data);
    return {
      conversation: await buildConversationSummary(conversation, data.messages, sender),
      message: buildMessageForUser(message, sender),
      recipient_username: recipient,
    };
  });
}

async function sendGift(username, payload = {}, actor = {}) {
  return withChatLock(async () => {
    const sender = normalizeUsername(username);
    const target = assertCanChat(sender, payload);
    const recipient = normalizeUsername(target.username);
    const content = moderateText(payload?.content || payload?.message || '送来一份礼物', {
      label: '礼物留言',
      field: 'content',
      scene: 'private_chat_gift',
      maxLength: 240,
      storageMaxLength: 240,
      auditContext: actor.auditContext,
    });
    const now = Math.floor(Date.now() / 1000);
    const data = loadChatData();
    const conversation = upsertConversation(data, sender, recipient, now);
    const messageId = makeId('chat_msg');
    const giftMail = await taoyuanMailbox.sendChatGiftPackage({
      target_username: recipient,
      target_save_id: payload.target_save_id,
      title: payload.title || '好友聊天礼物',
      content,
      template_type: payload.template_type || 'material_package',
      rewards: payload.rewards,
      chat_message_id: messageId,
    }, {
      username: sender,
      displayName: actor.displayName || sender,
      auditContext: actor.auditContext,
    }, {
      chat_message_id: messageId,
    });
    const message = normalizeMessage({
      id: messageId,
      conversation_id: conversation.id,
      sender_username: sender,
      sender_display_name: actor.displayName || sender,
      recipient_username: recipient,
      recipient_display_name: giftMail.recipient_display_name || recipient,
      type: 'gift',
      content,
      gift_delivery_id: giftMail.id,
      gift_reward_count: giftMail.reward_count,
      created_at: now,
    });
    data.messages.push(message);
    conversation.last_message_id = message.id;
    conversation.updated_at = now;
    conversation.read_at_by_username[sender] = now;
    saveChatData(data);
    return {
      conversation: await buildConversationSummary(conversation, data.messages, sender),
      message: buildMessageForUser(message, sender),
      recipient_username: recipient,
    };
  });
}

async function markConversationRead(username, conversationId) {
  return withChatLock(async () => {
    const viewer = normalizeUsername(username);
    const data = loadChatData();
    const conversation = data.conversations.find(item => item.id === String(conversationId || '').trim());
    assertConversationParticipant(conversation, viewer);
    conversation.read_at_by_username[viewer] = Math.floor(Date.now() / 1000);
    saveChatData(data);
    return {
      conversation: await buildConversationSummary(conversation, data.messages, viewer),
    };
  });
}

async function claimGiftMessage(username, messageId) {
  return withChatLock(async () => {
    const viewer = normalizeUsername(username);
    const data = loadChatData();
    const message = data.messages.find(item => item.id === String(messageId || '').trim() && !item.deleted_at);
    if (!message || message.type !== 'gift') throw createError('聊天礼物不存在', 404);
    if (message.recipient_username !== viewer) throw createError('只能领取发给你的聊天礼物', 403);
    if (!message.gift_delivery_id) throw createError('聊天礼物缺少领取凭证', 409);
    const claim = await taoyuanMailbox.claimUserMail(viewer, message.gift_delivery_id, {
      skipPendingCampaigns: true,
      includeChatSurface: true,
    });
    message.gift_claimed_at = Number(claim?.mail?.claimed_at) || Math.floor(Date.now() / 1000);
    const conversation = data.conversations.find(item => item.id === message.conversation_id);
    if (conversation) conversation.read_at_by_username[viewer] = Math.floor(Date.now() / 1000);
    saveChatData(data);
    return {
      message: buildMessageForUser(message, viewer),
      claim,
      conversation: conversation ? await buildConversationSummary(conversation, data.messages, viewer) : null,
    };
  });
}

module.exports = {
  listConversations,
  listMessages,
  sendMessage,
  sendGift,
  markConversationRead,
  claimGiftMessage,
};
