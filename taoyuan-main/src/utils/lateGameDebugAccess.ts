import {
  getAdminSessionToken,
  setAdminSessionToken,
  verifyAdminSession,
  type AdminSessionInfo,
} from '@/utils/userAdminApi'

export const LATE_GAME_DEBUG_AUTH_QUERY_KEY = 'late_game_debug_auth'

export const LATE_GAME_DEBUG_SUPER_ADMIN_ERROR = '后期调试仅限超级管理员口令进入'

export const getStoredLateGameDebugToken = () => getAdminSessionToken()

export const ensureLateGameDebugAccess = async (
  tokenOverride?: string,
  persistToken = false,
): Promise<AdminSessionInfo> => {
  const token = String(tokenOverride || '').trim() || getStoredLateGameDebugToken()
  if (!token) {
    throw new Error('请先填写管理员口令')
  }

  const session = await verifyAdminSession(token, false)
  if (session.role !== 'super_admin') {
    throw new Error(LATE_GAME_DEBUG_SUPER_ADMIN_ERROR)
  }

  if (persistToken) {
    setAdminSessionToken(token)
  }

  return session
}
