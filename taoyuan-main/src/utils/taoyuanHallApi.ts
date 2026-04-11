import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import type { HallAdminReport, HallCategory, HallContentBlock, HallMineFilter, HallPostDetail, HallPostListResult, HallPostType, HallReportResult, HallSort, HallViewer } from '@/types'

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const ensureInteractionContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录游戏账号后再发帖或回复')
  }
  const csrfToken = await ensureCurrentCsrfToken()
  if (!csrfToken) {
    throw new Error('登录状态已失效，请重新登录')
  }
  return csrfToken
}

export const fetchHallViewer = async (): Promise<HallViewer> => {
  const res = await fetch('/api/me', { credentials: 'include' })
  const data = await parseJsonSafe(res)
  const adminToken = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') || '' : ''
  if (!res.ok || !data?.ok) {
    return { loggedIn: false, username: null, displayName: null, isAdmin: !!adminToken }
  }
  return {
    loggedIn: true,
    username: data.user?.username || null,
    displayName: data.user?.display_name || data.user?.username || null,
    isAdmin: !!adminToken,
  }
}

export const fetchHallPosts = async (params: {
  category: HallCategory
  sort: HallSort
  mine: HallMineFilter
  keyword: string
  page: number
  pageSize: number
}): Promise<HallPostListResult> => {
  const search = new URLSearchParams({
    category: params.category,
    sort: params.sort,
    mine: params.mine,
    keyword: params.keyword,
    page: String(params.page),
    page_size: String(params.pageSize),
  })
  const res = await fetch(`/api/taoyuan/hall/posts?${search.toString()}`, { credentials: 'include' })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '获取帖子列表失败')
  }
  return {
    posts: Array.isArray(data.posts) ? data.posts : [],
    total: Number(data.total) || 0,
    page: Number(data.page) || params.page,
    page_size: Number(data.page_size) || params.pageSize,
    has_more: data.has_more === true,
  }
}

export const fetchHallPostDetail = async (postId: string): Promise<HallPostDetail> => {
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}`, { credentials: 'include' })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '获取帖子详情失败')
  }
  return data.post
}

export const createHallPost = async (payload: {
  title: string
  blocks: HallContentBlock[]
  type: HallPostType
  rewardAmount?: number
}): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch('/api/taoyuan/hall/posts', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      ...payload,
      reward_amount: payload.rewardAmount,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '发帖失败')
  }
  return data.post
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export const uploadHallImage = async (file: File): Promise<{ url: string; alt: string }> => {
  const csrfToken = await ensureInteractionContext()
  const dataUrl = await readFileAsDataUrl(file)
  const res = await fetch('/api/taoyuan/hall/upload-image', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      data_url: dataUrl,
      filename: file.name,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.url) {
    throw new Error(data?.msg || '上传图片失败')
  }
  return {
    url: String(data.url),
    alt: String(data.alt || file.name.replace(/\.[^.]+$/, '') || '图片'),
  }
}

export const createHallReply = async (postId: string, content: string, replyToId?: string | null): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ content, reply_to_id: replyToId || undefined }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '回复失败')
  }
  return data.post
}

export const reportHallPost = async (postId: string, reason: string): Promise<HallReportResult> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/report`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ reason }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.report) {
    throw new Error(data?.msg || '举报帖子失败')
  }
  return data.report
}

export const reportHallReply = async (postId: string, replyId: string, reason: string): Promise<HallReportResult> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}/report`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ reason }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.report) {
    throw new Error(data?.msg || '举报回复失败')
  }
  return data.report
}

const getAdminToken = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('admin_token') || ''
}

const ensureAdminToken = () => {
  const token = getAdminToken()
  if (!token) throw new Error('请先以管理员身份登录后台')
  return token
}

export const fetchHallAdminReports = async (): Promise<HallAdminReport[]> => {
  const token = ensureAdminToken()
  const res = await fetch('/api/admin/taoyuan/hall/reports', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': token,
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '获取举报列表失败')
  }
  return Array.isArray(data.reports) ? data.reports : []
}

export const updateHallAdminReportStatus = async (reportId: string, status: 'dismissed' | 'resolved'): Promise<HallAdminReport> => {
  const token = ensureAdminToken()
  const res = await fetch(`/api/admin/taoyuan/hall/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ status }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.report) {
    throw new Error(data?.msg || '更新举报状态失败')
  }
  return data.report
}

export const hideHallPostByAdmin = async (postId: string, hidden: boolean, reason: string): Promise<{ id: string; hidden: boolean }> => {
  const token = ensureAdminToken()
  const res = await fetch(`/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/hide`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ hidden, reason }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '隐藏帖子失败')
  }
  return { id: String(data.id || postId), hidden: data.hidden === true }
}

export const deleteHallReplyByAdmin = async (postId: string, replyId: string): Promise<HallPostDetail> => {
  const token = ensureAdminToken()
  const res = await fetch(`/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-Admin-Token': token,
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '删除回复失败')
  }
  return data.post
}

export const solveHallPost = async (postId: string, solved: boolean): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/solve`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ solved }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '更新求助状态失败')
  }
  return data.post
}

export const deleteHallPost = async (postId: string): Promise<void> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '删帖失败')
  }
}

export const selectHallBestReply = async (postId: string, replyId: string): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/best-reply`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ reply_id: replyId }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) {
    throw new Error(data?.msg || '设置最佳回复失败')
  }
  return data.post
}

export const likeHallPost = async (postId: string): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) throw new Error(data?.msg || '操作失败')
  return data.post
}

export const dislikeHallPost = async (postId: string): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(`/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/dislike`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) throw new Error(data?.msg || '操作失败')
  return data.post
}

export const likeHallReply = async (postId: string, replyId: string): Promise<HallPostDetail> => {
  const csrfToken = await ensureInteractionContext()
  const res = await fetch(
    `/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}/like`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrfToken },
    },
  )
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) throw new Error(data?.msg || '操作失败')
  return data.post
}

export const pinHallPost = async (postId: string, pinned: boolean): Promise<HallPostDetail> => {
  const token = ensureAdminToken()
  const res = await fetch(`/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/pin`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ pinned }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) throw new Error(data?.msg || '操作失败')
  return data.post
}

export const featureHallPost = async (postId: string, featured: boolean): Promise<HallPostDetail> => {
  const token = ensureAdminToken()
  const res = await fetch(`/api/admin/taoyuan/hall/posts/${encodeURIComponent(postId)}/feature`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({ featured }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.post) throw new Error(data?.msg || '操作失败')
  return data.post
}