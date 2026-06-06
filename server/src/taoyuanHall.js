const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const {
  createError,
  setActiveSaveSlot,
  clearActiveSaveSlotIfMatches,
  getActiveSaveContext,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime')
const taoyuanImageModeration = require('./taoyuanImageModeration')
const { moderateText } = require('./taoyuanTextModeration')
const { recordContentModerationRiskSignal } = require('./taoyuanContentModerationAudit')

const TAOYUAN_HALL_FILE = path.join(
  process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data'),
  'taoyuan_hall.json'
)

const HALL_UPLOADS_DIR = path.join(
  process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data'),
  'taoyuan_hall_uploads'
)

const IMAGE_MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50
const MAX_REPORT_REASON_LENGTH = 200
const MAX_BLOCK_IMAGE_COUNT = 6
const MULTI_REPORT_AUTO_HIDE_THRESHOLD = 3

let _taoyuanHallLockTail = Promise.resolve()

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function ensureHallDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_HALL_FILE), { recursive: true })
}

function ensureUploadsDir() {
  fs.mkdirSync(HALL_UPLOADS_DIR, { recursive: true })
}

function updateActiveSaveMoney(username, delta) {
  const context = getActiveSaveContext(username, null, '当前账号没有可用的桃源服务端存档，无法进行悬赏结算')
  context.username = username
  const currentMoney = Math.max(0, Math.floor(Number(context.data?.player?.money) || 0))
  const normalizedDelta = Math.floor(Number(delta) || 0)
  const nextMoney = currentMoney + normalizedDelta
  if (nextMoney < 0) throw createError('桃源货币不足，无法完成悬赏操作')
  context.data.player.money = nextMoney
  const revision = persistGameplayData(context)
  return {
    slot: context.slot,
    money: nextMoney,
    revision,
  }
}

function sanitizeFilenameBase(value) {
  return String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    .slice(0, 60)
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null
  if (block.type === 'image') {
    const url = String(block.url || '').trim()
    if (!url) return null
    return {
      id: String(block.id || makeId('hall_block')),
      type: 'image',
      url,
      alt: String(block.alt || '图片').trim().slice(0, 120),
      width: Number.isFinite(Number(block.width)) ? Number(block.width) : null,
      height: Number.isFinite(Number(block.height)) ? Number(block.height) : null,
    }
  }
  const text = String(block.text || '').replace(/\r\n/g, '\n').trim()
  if (!text) return null
  return {
    id: String(block.id || makeId('hall_block')),
    type: 'text',
    text: text.slice(0, 5000),
  }
}

function normalizeBlocks(blocks, legacyContent = '') {
  if (Array.isArray(blocks) && blocks.length) {
    const normalized = blocks.map(normalizeBlock).filter(Boolean)
    if (normalized.length) return normalized
  }
  const text = String(legacyContent || '').replace(/\r\n/g, '\n').trim()
  if (!text) return []
  return [{ id: makeId('hall_block'), type: 'text', text: text.slice(0, 5000) }]
}

function normalizeReply(reply) {
  if (!reply || typeof reply !== 'object') return null
  const createdAt = Number(reply.created_at) || Math.floor(Date.now() / 1000)
  return {
    id: String(reply.id || makeId('hall_reply')),
    content: String(reply.content || '').trim(),
    author: String(reply.author || ''),
    author_display_name: String(reply.author_display_name || reply.author || '匿名'),
    created_at: createdAt,
    reply_to_id: reply.reply_to_id ? String(reply.reply_to_id) : null,
    reply_to_author_display_name: reply.reply_to_author_display_name ? String(reply.reply_to_author_display_name) : null,
    reply_to_excerpt: reply.reply_to_excerpt ? String(reply.reply_to_excerpt).slice(0, 120) : null,
    hidden: reply.hidden === true,
    hidden_reason: reply.hidden_reason ? String(reply.hidden_reason).slice(0, 120) : null,
    hidden_at: Number(reply.hidden_at) || null,
    likes: Array.isArray(reply.likes) ? reply.likes.map(String) : [],
  }
}

function normalizeReport(report) {
  if (!report || typeof report !== 'object') return null
  return {
    id: String(report.id || makeId('hall_report')),
    type: report.type === 'reply' ? 'reply' : 'post',
    post_id: String(report.post_id || ''),
    reply_id: report.reply_id ? String(report.reply_id) : null,
    reason: String(report.reason || '').trim().slice(0, MAX_REPORT_REASON_LENGTH),
    reporter: String(report.reporter || ''),
    reporter_display_name: String(report.reporter_display_name || report.reporter || '匿名'),
    status: ['pending', 'dismissed', 'resolved'].includes(String(report.status)) ? String(report.status) : 'pending',
    auto_action: report.auto_action ? String(report.auto_action).slice(0, 80) : '',
    auto_action_at: Number(report.auto_action_at) || null,
    created_at: Number(report.created_at) || Math.floor(Date.now() / 1000),
    resolved_at: Number(report.resolved_at) || null,
  }
}

function normalizePost(post) {
  if (!post || typeof post !== 'object') return null
  const createdAt = Number(post.created_at) || Math.floor(Date.now() / 1000)
  const updatedAt = Number(post.updated_at) || createdAt
  const blocks = normalizeBlocks(post.blocks, post.content)
  const replies = Array.isArray(post.replies)
    ? post.replies.map(normalizeReply).filter(Boolean)
    : []

  return {
    id: String(post.id || makeId('hall_post')),
    title: String(post.title || '').trim(),
    content: blocks.filter(block => block.type === 'text').map(block => block.text).join('\n\n'),
    blocks,
    type: post.type === 'help' ? 'help' : 'discussion',
    solved: post.type === 'help' ? post.solved === true : false,
    reward_enabled: post.type === 'help' ? (Number(post.reward_amount) || 0) > 0 : false,
    reward_amount: post.type === 'help' ? Math.max(0, Math.floor(Number(post.reward_amount) || 0)) : 0,
    reward_status: post.type === 'help'
      ? (['open', 'closed', 'paid'].includes(String(post.reward_status)) ? String(post.reward_status) : ((Number(post.reward_amount) || 0) > 0 ? 'open' : 'none'))
      : 'none',
    best_reply_id: post.best_reply_id ? String(post.best_reply_id) : null,
    reward_paid_to: post.reward_paid_to ? String(post.reward_paid_to) : null,
    reward_paid_at: Number(post.reward_paid_at) || null,
    is_official: post.is_official === true,
    official_template_type: post.official_template_type ? String(post.official_template_type).slice(0, 40) : null,
    activity_source_id: post.activity_source_id ? String(post.activity_source_id).slice(0, 64) : null,
    activity_source_label: post.activity_source_label ? String(post.activity_source_label).slice(0, 80) : null,
    related_route_labels: Array.isArray(post.related_route_labels) ? post.related_route_labels.map(String).slice(0, 6) : [],
    weekly_plan_id: post.weekly_plan_id ? String(post.weekly_plan_id).slice(0, 120) : null,
    primary_route_label: post.primary_route_label ? String(post.primary_route_label).slice(0, 40) : null,
    secondary_route_labels: Array.isArray(post.secondary_route_labels) ? post.secondary_route_labels.map(String).slice(0, 4) : [],
    claimable_node_labels: Array.isArray(post.claimable_node_labels) ? post.claimable_node_labels.map(String).slice(0, 4) : [],
    next_week_prep_summary: post.next_week_prep_summary ? String(post.next_week_prep_summary).slice(0, 240) : null,
    weekly_chronicle_week_id: post.weekly_chronicle_week_id ? String(post.weekly_chronicle_week_id).slice(0, 64) : null,
    chronicle_source_labels: Array.isArray(post.chronicle_source_labels) ? post.chronicle_source_labels.map(String).slice(0, 6) : [],
    hidden: post.hidden === true,
    hidden_reason: post.hidden_reason ? String(post.hidden_reason).slice(0, 120) : null,
    author: String(post.author || ''),
    author_display_name: String(post.author_display_name || post.author || '匿名'),
    created_at: createdAt,
    updated_at: updatedAt,
    replies,
    likes: Array.isArray(post.likes) ? post.likes.map(String) : [],
    dislikes: Array.isArray(post.dislikes) ? post.dislikes.map(String) : [],
    pinned: post.pinned === true,
    featured: post.featured === true,
  }
}

function loadHallData() {
  try {
    if (!fs.existsSync(TAOYUAN_HALL_FILE)) return { posts: [], reports: [] }
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_HALL_FILE, 'utf8'))
    const posts = Array.isArray(raw?.posts)
      ? raw.posts.map(normalizePost).filter(Boolean)
      : Array.isArray(raw)
        ? raw.map(normalizePost).filter(Boolean)
        : []
    const reports = Array.isArray(raw?.reports) ? raw.reports.map(normalizeReport).filter(Boolean) : []
    return { posts, reports }
  } catch {
    return { posts: [], reports: [] }
  }
}

function saveHallData(data) {
  ensureHallDir()
  writeJsonFileAtomic(TAOYUAN_HALL_FILE, data)
}

async function withHallLock(fn) {
  let resolve
  const prev = _taoyuanHallLockTail
  _taoyuanHallLockTail = new Promise(r => { resolve = r })
  await prev
  try {
    return await fn()
  } finally {
    resolve()
  }
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength)
}

function buildFieldAuditContext(auditContext = {}, overrides = {}) {
  return {
    ...(auditContext && typeof auditContext === 'object' ? auditContext : {}),
    ...overrides,
  }
}

function getPendingReportsForTarget(data, report) {
  return (Array.isArray(data.reports) ? data.reports : [])
    .map(normalizeReport)
    .filter(item => (
      item.status === 'pending'
      && item.type === report.type
      && item.post_id === report.post_id
      && (item.reply_id || null) === (report.reply_id || null)
      && item.reporter
    ))
}

function countDistinctReporters(reports) {
  return new Set((Array.isArray(reports) ? reports : []).map(report => report.reporter).filter(Boolean)).size
}

function buildMultiReportRiskScore(reporterCount) {
  return Math.min(100, 45 + Math.max(0, Math.floor(Number(reporterCount) || 0)) * 10)
}

function applyMultiReportAutoHide(data, report) {
  const pendingReports = getPendingReportsForTarget(data, report)
  const reporterCount = countDistinctReporters(pendingReports)
  if (reporterCount < MULTI_REPORT_AUTO_HIDE_THRESHOLD) return null
  const post = (data.posts || []).find(item => item.id === report.post_id)
  if (!post) return null
  const now = Math.floor(Date.now() / 1000)
  const reportIds = pendingReports.map(item => item.id)
  if (report.type === 'reply') {
    const reply = (post.replies || []).find(item => item.id === report.reply_id)
    if (!reply || reply.hidden === true) return null
    reply.hidden = true
    reply.hidden_reason = '多人举报自动临时隐藏，等待管理员复核'
    reply.hidden_at = now
    post.updated_at = now
    recordContentModerationRiskSignal({
      signal_type: 'multi_report_auto_hide',
      username: reply.author,
      target_type: 'hall_reply',
      target_id: `${post.id}:${reply.id}`,
      content_type: 'hall_reply',
      content_id: reply.id,
      scene: 'hall_reply_report',
      reason_code: 'multi_report_threshold',
      outcome: 'auto_temporarily_hidden',
      report_count: pendingReports.length,
      reporter_count: reporterCount,
      report_ids: reportIds,
      risk_score: buildMultiReportRiskScore(reporterCount),
      created_at: now,
      updated_at: now,
    })
    return { action: 'auto_hide_hall_reply', target_type: 'hall_reply', reporter_count: reporterCount }
  }

  if (post.hidden === true) return null
  post.hidden = true
  post.hidden_reason = '多人举报自动临时隐藏，等待管理员复核'
  post.updated_at = now
  recordContentModerationRiskSignal({
    signal_type: 'multi_report_auto_hide',
    username: post.author,
    target_type: 'hall_post',
    target_id: post.id,
    content_type: 'hall_post',
    content_id: post.id,
    scene: 'hall_post_report',
    reason_code: 'multi_report_threshold',
    outcome: 'auto_temporarily_hidden',
    report_count: pendingReports.length,
    reporter_count: reporterCount,
    report_ids: reportIds,
    risk_score: buildMultiReportRiskScore(reporterCount),
    created_at: now,
    updated_at: now,
  })
  return { action: 'auto_hide_hall_post', target_type: 'hall_post', reporter_count: reporterCount }
}

function sanitizeBlocksForStorage(blocks, legacyContent = '', auditContext = {}) {
  const normalized = normalizeBlocks(blocks, legacyContent)
  const imageBlocks = normalized.filter(block => block?.type === 'image')
  if (imageBlocks.length > MAX_BLOCK_IMAGE_COUNT) {
    throw createError(`单条内容最多只能插入 ${MAX_BLOCK_IMAGE_COUNT} 张图片`)
  }
  const sanitized = normalized.map(block => {
    if (block.type === 'image') {
      taoyuanImageModeration.ensureUsableUploadedImageUrl(block.url, ['hall_post', 'admin_content'])
      return {
        id: String(block.id || makeId('hall_block')),
        type: 'image',
        url: String(block.url || '').trim().slice(0, 500),
        alt: moderateText(block.alt || '图片', {
          label: '图片说明',
          maxLength: 120,
          maxLineBreaks: 1,
          field: 'blocks.image.alt',
          scene: auditContext.scene || 'hall_post',
          auditContext: buildFieldAuditContext(auditContext, {
            field: 'blocks.image.alt',
            content_type: 'hall_image_alt',
            content_id: block.id,
          }),
        }) || '图片',
        width: Number.isFinite(Number(block.width)) ? Number(block.width) : null,
        height: Number.isFinite(Number(block.height)) ? Number(block.height) : null,
      }
    }
    return {
      id: String(block.id || makeId('hall_block')),
      type: 'text',
      text: moderateText(block.text || '', {
        label: '正文段落',
        maxLength: 5000,
        maxLineBreaks: 80,
        field: 'blocks.text',
        scene: auditContext.scene || 'hall_post',
        auditContext: buildFieldAuditContext(auditContext, {
          field: 'blocks.text',
          content_type: 'hall_post',
          content_id: block.id,
        }),
      }),
    }
  }).filter(block => (block.type === 'image' ? !!block.url : !!block.text))

  if (!sanitized.length) throw createError('正文至少需要一段文字或一张图片')
  return sanitized
}

function blocksToPreview(blocks, maxLength = 120) {
  let preview = ''
  for (const block of blocks || []) {
    const text = block.type === 'image' ? '[图片]' : block.text
    if (!text) continue
    preview += preview ? ` ${text}` : text
    if (preview.length >= maxLength) break
  }
  preview = preview.trim()
  if (!preview) return '【图片帖】'
  return preview.length > maxLength ? `${preview.slice(0, maxLength)}…` : preview
}

function getLastActivityAt(post) {
  const lastReplyAt = Array.isArray(post.replies) && post.replies.length
    ? Math.max(...post.replies.map(reply => Number(reply.created_at) || 0))
    : 0
  return Math.max(Number(post.updated_at) || 0, Number(post.created_at) || 0, lastReplyAt)
}

function buildSummary(post, viewerUsername = '') {
  const lastActivityAt = getLastActivityAt(post)
  const preview = blocksToPreview(post.blocks, 120)
  return {
    id: post.id,
    title: post.title,
    preview,
    type: post.type,
    is_official: post.is_official === true,
    official_template_type: post.official_template_type || null,
    activity_source_id: post.activity_source_id || null,
    activity_source_label: post.activity_source_label || null,
    related_route_labels: Array.isArray(post.related_route_labels) ? [...post.related_route_labels] : [],
    weekly_plan_id: post.weekly_plan_id || null,
    primary_route_label: post.primary_route_label || null,
    secondary_route_labels: Array.isArray(post.secondary_route_labels) ? [...post.secondary_route_labels] : [],
    claimable_node_labels: Array.isArray(post.claimable_node_labels) ? [...post.claimable_node_labels] : [],
    next_week_prep_summary: post.next_week_prep_summary || null,
    weekly_chronicle_week_id: post.weekly_chronicle_week_id || null,
    chronicle_source_labels: Array.isArray(post.chronicle_source_labels) ? [...post.chronicle_source_labels] : [],
    solved: post.type === 'help' ? post.solved === true : false,
    reward_enabled: post.reward_enabled === true,
    reward_amount: Math.max(0, Math.floor(Number(post.reward_amount) || 0)),
    reward_status: post.reward_status || 'none',
    author: post.author,
    author_display_name: post.author_display_name,
    created_at: post.created_at,
    updated_at: post.updated_at,
    last_activity_at: lastActivityAt,
    reply_count: Array.isArray(post.replies) ? post.replies.length : 0,
    is_mine: !!viewerUsername && viewerUsername === post.author,
    like_count: Array.isArray(post.likes) ? post.likes.length : 0,
    dislike_count: Array.isArray(post.dislikes) ? post.dislikes.length : 0,
    viewer_liked: !!viewerUsername && Array.isArray(post.likes) && post.likes.includes(viewerUsername),
    viewer_disliked: !!viewerUsername && Array.isArray(post.dislikes) && post.dislikes.includes(viewerUsername),
    pinned: post.pinned === true,
    featured: post.featured === true,
  }
}

function buildDetail(post, viewerUsername = '') {
  const summary = buildSummary(post, viewerUsername)
  const blocks = (post.blocks || []).map(block => {
    if (!block || block.type !== 'image') {
      return block
    }
    const imageState = taoyuanImageModeration.getUploadedImagePublicState(block.url)
    if (imageState.visible) {
      return {
        ...block,
        is_hidden: false,
        hidden_reason: '',
      }
    }
    return {
      ...block,
      url: '',
      is_hidden: true,
      hidden_reason: imageState.hidden_reason || '这张图片已被管理员隐藏。',
    }
  })
  return {
    ...summary,
    content: post.content,
    blocks,
    replies: (post.replies || []).map(reply => ({
      ...reply,
      content: reply.hidden === true ? '' : reply.content,
      is_hidden: reply.hidden === true,
      hidden_reason: reply.hidden === true ? (reply.hidden_reason || '该回复已被临时隐藏。') : '',
      is_mine: !!viewerUsername && viewerUsername === reply.author,
      is_best: !!post.best_reply_id && post.best_reply_id === reply.id,
      like_count: Array.isArray(reply.likes) ? reply.likes.length : 0,
      viewer_liked: !!viewerUsername && Array.isArray(reply.likes) && reply.likes.includes(viewerUsername),
    })),
    best_reply_id: post.best_reply_id || null,
    reward_paid_to: post.reward_paid_to || null,
    reward_paid_at: post.reward_paid_at || null,
    viewer_can_reply: !!viewerUsername,
    viewer_is_author: !!viewerUsername && viewerUsername === post.author,
    viewer_can_solve: post.type === 'help' && !!viewerUsername && viewerUsername === post.author,
    viewer_can_delete: !!viewerUsername && viewerUsername === post.author,
    viewer_can_pick_best: post.type === 'help' && post.reward_enabled === true && !!viewerUsername && viewerUsername === post.author && (post.replies || []).some(reply => reply.author !== viewerUsername) && post.reward_status !== 'paid',
  }
}

function listPosts({ category = 'all', sort = 'latest', mine = 'all', viewerUsername = '', keyword = '', activitySourceId = '', page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const data = loadHallData()
  let posts = [...data.posts].filter(post => post.hidden !== true)
  const normalizedKeyword = sanitizeText(keyword, 50).toLowerCase()
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE))
  const safePage = Math.max(1, parseInt(page, 10) || 1)

  if (category === 'discussion') posts = posts.filter(post => post.type === 'discussion')
  else if (category === 'help') posts = posts.filter(post => post.type === 'help')
  else if (category === 'solved') posts = posts.filter(post => post.type === 'help' && post.solved === true)

  if (mine === 'posts') {
    posts = posts.filter(post => post.author === viewerUsername)
  } else if (mine === 'replies') {
    posts = posts.filter(post => (post.replies || []).some(reply => reply.author === viewerUsername))
  } else if (mine === 'help') {
    posts = posts.filter(post => post.author === viewerUsername && post.type === 'help')
  }

  if (normalizedKeyword) {
    posts = posts.filter(post => {
      const haystack = `${post.title}\n${post.content}`.toLowerCase()
      return haystack.includes(normalizedKeyword)
    })
  }

  if (activitySourceId) {
    posts = posts.filter(post => String(post.activity_source_id || '') === String(activitySourceId))
  }

  posts.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    const aLast = getLastActivityAt(a)
    const bLast = getLastActivityAt(b)
    if (sort === 'reward') {
      const rewardGap = (Number(b.reward_amount) || 0) - (Number(a.reward_amount) || 0)
      if (rewardGap !== 0) return rewardGap
    }
    if (sort === 'hot') {
      const replyGap = (b.replies?.length || 0) - (a.replies?.length || 0)
      if (replyGap !== 0) return replyGap
    }
    return bLast - aLast
  })

  const total = posts.length
  const start = (safePage - 1) * safePageSize
  const paged = posts.slice(start, start + safePageSize)

  return {
    posts: paged.map(post => buildSummary(post, viewerUsername)),
    total,
    page: safePage,
    page_size: safePageSize,
    has_more: start + safePageSize < total,
  }
}

function getPost(postId, viewerUsername = '') {
  const data = loadHallData()
  const post = data.posts.find(item => item.id === String(postId))
  if (!post || post.hidden === true) return null
  return buildDetail(post, viewerUsername)
}

async function createPost({
  title,
  content,
  blocks,
  type,
  author,
  authorDisplayName,
  rewardAmount,
  isOfficial = false,
  officialTemplateType = '',
  activitySourceId = '',
  activitySourceLabel = '',
  relatedRouteLabels = [],
  weeklyPlanId = '',
  primaryRouteLabel = '',
  secondaryRouteLabels = [],
  claimableNodeLabels = [],
  nextWeekPrepSummary = '',
  weeklyChronicleWeekId = '',
  chronicleSourceLabels = [],
  auditContext = {},
}) {
  const cleanType = type === 'help' ? 'help' : 'discussion'
  const baseAuditContext = buildFieldAuditContext(auditContext, {
    scene: auditContext.scene || (isOfficial === true ? 'admin_hall_post' : 'hall_post'),
    username: author,
    content_type: 'hall_post',
  })
  const cleanTitle = moderateText(title, {
    label: '标题',
    minLength: 2,
    maxLength: 60,
    maxLineBreaks: 1,
    field: 'title',
    scene: baseAuditContext.scene,
    auditContext: buildFieldAuditContext(baseAuditContext, { field: 'title' }),
  })
  const cleanBlocks = sanitizeBlocksForStorage(blocks, content, baseAuditContext)
  const normalizedRewardAmount = cleanType === 'help' ? Math.max(0, Math.floor(Number(rewardAmount) || 0)) : 0

  if (cleanType !== 'help' && normalizedRewardAmount > 0) throw createError('只有求助帖可以设置悬赏')

  return withHallLock(async () => {
    let deductedReward = false
    try {
      if (normalizedRewardAmount > 0) {
        updateActiveSaveMoney(author, -normalizedRewardAmount)
        deductedReward = true
      }

      const data = loadHallData()
      const now = Math.floor(Date.now() / 1000)
      const post = {
        id: makeId('hall_post'),
        title: cleanTitle,
        content: cleanBlocks.filter(block => block.type === 'text').map(block => block.text).join('\n\n'),
        blocks: cleanBlocks,
        type: cleanType,
        solved: false,
        reward_enabled: normalizedRewardAmount > 0,
        reward_amount: normalizedRewardAmount,
        reward_status: normalizedRewardAmount > 0 ? 'open' : 'none',
        best_reply_id: null,
        reward_paid_to: null,
        reward_paid_at: null,
        is_official: isOfficial === true,
        official_template_type: officialTemplateType ? String(officialTemplateType).slice(0, 40) : null,
        activity_source_id: activitySourceId ? String(activitySourceId).slice(0, 64) : null,
        activity_source_label: activitySourceLabel ? String(activitySourceLabel).slice(0, 80) : null,
        related_route_labels: Array.isArray(relatedRouteLabels) ? relatedRouteLabels.map(item => String(item).slice(0, 40)).slice(0, 6) : [],
        weekly_plan_id: weeklyPlanId ? String(weeklyPlanId).slice(0, 120) : null,
        primary_route_label: primaryRouteLabel ? String(primaryRouteLabel).slice(0, 40) : null,
        secondary_route_labels: Array.isArray(secondaryRouteLabels) ? secondaryRouteLabels.map(item => String(item).slice(0, 40)).slice(0, 4) : [],
        claimable_node_labels: Array.isArray(claimableNodeLabels) ? claimableNodeLabels.map(item => String(item).slice(0, 60)).slice(0, 4) : [],
        next_week_prep_summary: nextWeekPrepSummary ? String(nextWeekPrepSummary).slice(0, 240) : null,
        weekly_chronicle_week_id: weeklyChronicleWeekId ? String(weeklyChronicleWeekId).slice(0, 64) : null,
        chronicle_source_labels: Array.isArray(chronicleSourceLabels) ? chronicleSourceLabels.map(item => String(item).slice(0, 40)).slice(0, 6) : [],
        author: String(author || ''),
        author_display_name: String(authorDisplayName || author || '匿名'),
        created_at: now,
        updated_at: now,
        replies: [],
      }
      data.posts.unshift(post)
      saveHallData(data)
      return buildDetail(post, author)
    } catch (error) {
      if (deductedReward) {
        try { updateActiveSaveMoney(author, normalizedRewardAmount) } catch {}
      }
      throw error
    }
  })
}

async function addReply({ postId, content, author, authorDisplayName, replyToId, auditContext = {} }) {
  const cleanContent = moderateText(content, {
    label: '回复内容',
    minLength: 1,
    maxLength: 1000,
    maxLineBreaks: 30,
    field: 'content',
    scene: auditContext.scene || 'hall_reply',
    auditContext: buildFieldAuditContext(auditContext, {
      field: 'content',
      username: author,
      content_type: 'hall_reply',
      content_id: replyToId || '',
    }),
  })

  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post || post.hidden === true) throw createError('帖子不存在', 404)

    let quotedReply = null
    if (replyToId) {
      quotedReply = (post.replies || []).find(item => item.id === String(replyToId))
      if (!quotedReply) throw createError('引用的回复不存在', 404)
    }

    const now = Math.floor(Date.now() / 1000)
    post.replies.push({
      id: makeId('hall_reply'),
      content: cleanContent,
      author: String(author || ''),
      author_display_name: String(authorDisplayName || author || '匿名'),
      created_at: now,
      reply_to_id: quotedReply ? quotedReply.id : null,
      reply_to_author_display_name: quotedReply ? quotedReply.author_display_name : null,
      reply_to_excerpt: quotedReply ? sanitizeText(quotedReply.content || '', 60) : null,
    })
    post.updated_at = now
    saveHallData(data)
    return buildDetail(post, author)
  })
}

async function createReport({ type, postId, replyId, reason, reporter, reporterDisplayName, auditContext = {} }) {
  const cleanReason = moderateText(reason, {
    label: '举报原因',
    minLength: 2,
    maxLength: MAX_REPORT_REASON_LENGTH,
    maxLineBreaks: 8,
    field: 'reason',
    scene: auditContext.scene || 'hall_report',
    auditContext: buildFieldAuditContext(auditContext, {
      field: 'reason',
      username: reporter,
      content_type: type === 'reply' ? 'hall_reply_report' : 'hall_post_report',
      content_id: type === 'reply' ? `${postId}:${replyId}` : String(postId || ''),
    }),
  })

  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    if (type === 'reply') {
      const reply = (post.replies || []).find(item => item.id === String(replyId))
      if (!reply) throw createError('回复不存在', 404)
    }

    const existed = (data.reports || []).find(item => item.type === type && item.post_id === String(postId) && item.reply_id === (type === 'reply' ? String(replyId) : null) && item.reporter === reporter && item.status === 'pending')
    if (existed) {
      return { id: existed.id, status: existed.status }
    }

    const report = {
      id: makeId('hall_report'),
      type,
      post_id: String(postId),
      reply_id: type === 'reply' ? String(replyId) : null,
      reason: cleanReason,
      reporter: String(reporter || ''),
      reporter_display_name: String(reporterDisplayName || reporter || '匿名'),
      status: 'pending',
      created_at: Math.floor(Date.now() / 1000),
      resolved_at: null,
    }
    data.reports = Array.isArray(data.reports) ? data.reports : []
    data.reports.unshift(report)
    const autoAction = applyMultiReportAutoHide(data, report)
    if (autoAction) {
      report.auto_action = autoAction.action
      report.auto_action_at = Math.floor(Date.now() / 1000)
    }
    saveHallData(data)
    return { id: report.id, status: report.status, auto_action: report.auto_action || '' }
  })
}

function listReports() {
  const data = loadHallData()
  return (data.reports || []).slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
}

function listAdminPosts() {
  const data = loadHallData()
  return (data.posts || [])
    .map(item => normalizePost(item))
    .sort((left, right) => (right.last_activity_at || 0) - (left.last_activity_at || 0))
}

async function setReportStatus({ reportId, status }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const report = (data.reports || []).find(item => item.id === String(reportId))
    if (!report) throw createError('举报记录不存在', 404)
    report.status = status === 'resolved' ? 'resolved' : 'dismissed'
    report.resolved_at = Math.floor(Date.now() / 1000)
    saveHallData(data)
    return report
  })
}

async function hidePost({ postId, hidden = true, reason = '' }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    post.hidden = hidden === true
    post.hidden_reason = post.hidden ? sanitizeText(reason, 120) || '管理员隐藏' : null
    post.updated_at = Math.floor(Date.now() / 1000)
    saveHallData(data)
    return { id: post.id, hidden: post.hidden }
  })
}

async function deleteReplyByAdmin({ postId, replyId }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    const index = (post.replies || []).findIndex(item => item.id === String(replyId))
    if (index < 0) throw createError('回复不存在', 404)
    const [removed] = post.replies.splice(index, 1)
    if (post.best_reply_id === removed.id) {
      post.best_reply_id = null
      if (post.reward_status === 'closed') {
        post.solved = false
        post.reward_status = 'open'
      }
    }
    post.updated_at = Math.floor(Date.now() / 1000)
    saveHallData(data)
    return buildDetail(post, '')
  })
}

async function setSolved({ postId, actor, solved = true }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    if (post.type !== 'help') throw createError('只有求助帖可以设置解决状态')
    if (post.author !== actor) throw createError('只有楼主可以修改求助状态', 403)
    if (post.reward_enabled && solved !== false && !post.best_reply_id) {
      throw createError('带悬赏的求助帖请先选择最佳回复后再结帖')
    }
    if (post.reward_status === 'paid' && solved === false) {
      throw createError('悬赏已发放，不能重新打开该求助帖')
    }

    post.solved = solved !== false
    if (post.reward_enabled) {
      if (post.reward_status !== 'paid') {
        post.reward_status = post.solved ? 'closed' : 'open'
      }
    }
    post.updated_at = Math.floor(Date.now() / 1000)
    saveHallData(data)
    return buildDetail(post, actor)
  })
}

async function deletePost({ postId, actor }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const index = data.posts.findIndex(item => item.id === String(postId))
    if (index < 0) throw createError('帖子不存在', 404)
    const post = data.posts[index]
    if (post.author !== actor) throw createError('只有楼主可以删除自己的帖子', 403)

    let refunded = false
    try {
      if (post.reward_enabled && post.reward_status === 'open' && post.reward_amount > 0) {
        updateActiveSaveMoney(actor, post.reward_amount)
        refunded = true
      }
      data.posts.splice(index, 1)
      saveHallData(data)
      return { refunded }
    } catch (error) {
      if (refunded) {
        try { updateActiveSaveMoney(actor, -post.reward_amount) } catch {}
      }
      throw error
    }
  })
}

async function selectBestReply({ postId, replyId, actor }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    if (post.type !== 'help') throw createError('只有求助帖可以选择最佳回复')
    if (post.author !== actor) throw createError('只有楼主可以选择最佳回复', 403)
    if (post.reward_status === 'paid') throw createError('悬赏已经发放，不能重复选择最佳回复')

    const reply = (post.replies || []).find(item => item.id === String(replyId))
    if (!reply) throw createError('回复不存在', 404)
    if (reply.author === actor) throw createError('不能将自己的回复设为最佳回复')

    let paid = false
    try {
      if (post.reward_enabled && post.reward_amount > 0) {
        updateActiveSaveMoney(reply.author, post.reward_amount)
        paid = true
        post.reward_status = 'paid'
        post.reward_paid_to = reply.author
        post.reward_paid_at = Math.floor(Date.now() / 1000)
      }
      post.best_reply_id = reply.id
      post.solved = true
      post.updated_at = Math.floor(Date.now() / 1000)
      saveHallData(data)
      return buildDetail(post, actor)
    } catch (error) {
      if (paid) {
        try { updateActiveSaveMoney(reply.author, -post.reward_amount) } catch {}
      }
      throw error
    }
  })
}

async function saveUploadedImage({ dataUrl, filename = '', author = '', authorDisplayName = '', usage = 'hall_post', auditContext = {} }) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) throw createError('图片数据格式无效')

  const mime = match[1].toLowerCase()
  const base64 = match[2]
  const ext = IMAGE_MIME_EXT[mime]
  if (!ext) throw createError('仅支持 JPG、PNG、WEBP、GIF 图片')

  taoyuanImageModeration.assertImageUploadAllowed(author)
  const uploadRule = taoyuanImageModeration.getUploadRule(usage)
  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) throw createError('图片内容为空')
  if (buffer.length > Math.min(MAX_IMAGE_SIZE, uploadRule.max_bytes)) {
    throw createError(`${uploadRule.label}不能超过 ${Math.floor(uploadRule.max_bytes / 1024 / 1024)}MB`)
  }

  ensureUploadsDir()
  const fileBase = moderateText(sanitizeFilenameBase(filename) || sanitizeFilenameBase(author) || 'hall_image', {
    label: '图片说明',
    maxLength: 60,
    maxLineBreaks: 1,
    field: 'image_alt',
    scene: auditContext.scene || 'hall_image_upload',
    auditContext: buildFieldAuditContext(auditContext, {
      field: 'image_alt',
      username: author,
      content_type: 'hall_image_alt',
    }),
  })
  const savedName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileBase}.${ext}`
  const savePath = path.join(HALL_UPLOADS_DIR, savedName)
  fs.writeFileSync(savePath, buffer)

  const url = `/api/taoyuan/hall/uploads/${savedName}`
  await taoyuanImageModeration.registerUploadedImage({
    url,
    stored_name: savedName,
    filename,
    alt: fileBase,
    mime,
    size_bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    usage,
    uploader_username: author,
    uploader_display_name: authorDisplayName,
  })

  return {
    url,
    alt: fileBase,
    usage: taoyuanImageModeration.getUploadRule(usage).id,
    max_bytes: taoyuanImageModeration.getUploadRule(usage).max_bytes,
  }
}

async function togglePostLike({ postId, username, action }) {
  if (!username) throw createError('请先登录', 401)
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post || post.hidden === true) throw createError('帖子不存在', 404)
    if (!Array.isArray(post.likes)) post.likes = []
    if (!Array.isArray(post.dislikes)) post.dislikes = []
    if (action === 'like') {
      if (post.likes.includes(username)) {
        post.likes = post.likes.filter(u => u !== username)
      } else {
        post.likes.push(username)
        post.dislikes = post.dislikes.filter(u => u !== username)
      }
    } else {
      if (post.dislikes.includes(username)) {
        post.dislikes = post.dislikes.filter(u => u !== username)
      } else {
        post.dislikes.push(username)
        post.likes = post.likes.filter(u => u !== username)
      }
    }
    saveHallData(data)
    return buildDetail(post, username)
  })
}

async function toggleReplyLike({ postId, replyId, username }) {
  if (!username) throw createError('请先登录', 401)
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post || post.hidden === true) throw createError('帖子不存在', 404)
    const reply = (post.replies || []).find(r => r.id === String(replyId))
    if (!reply) throw createError('回复不存在', 404)
    if (!Array.isArray(reply.likes)) reply.likes = []
    if (reply.likes.includes(username)) {
      reply.likes = reply.likes.filter(u => u !== username)
    } else {
      reply.likes.push(username)
    }
    saveHallData(data)
    return buildDetail(post, username)
  })
}

async function setPinned({ postId, pinned }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    post.pinned = !!pinned
    saveHallData(data)
    return buildDetail(post, '')
  })
}

async function setFeatured({ postId, featured }) {
  return withHallLock(async () => {
    const data = loadHallData()
    const post = data.posts.find(item => item.id === String(postId))
    if (!post) throw createError('帖子不存在', 404)
    post.featured = !!featured
    saveHallData(data)
    return buildDetail(post, '')
  })
}

module.exports = {
  HALL_UPLOADS_DIR,
  setActiveSaveSlot,
  clearActiveSaveSlotIfMatches,
  updateActiveSaveMoney,
  listPosts,
  getPost,
  listAdminPosts,
  createPost,
  addReply,
  createReport,
  listReports,
  setReportStatus,
  hidePost,
  deleteReplyByAdmin,
  setSolved,
  deletePost,
  selectBestReply,
  saveUploadedImage,
  togglePostLike,
  toggleReplyLike,
  setPinned,
  setFeatured,
}
