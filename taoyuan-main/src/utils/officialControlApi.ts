import { getStoredAdminToken } from '@/utils/taoyuanMailboxAdminApi'
import type {
  OfficialControlInstanceRecord,
  OfficialControlPlatformStatus,
  OfficialControlReleaseRecord,
  OfficialManagedConfigValues,
} from '@/types'

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const getAdminHeaders = () => {
  const token = getStoredAdminToken()
  if (!token) throw new Error('请先填写管理员口令')
  return {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
  }
}

const mapPlatformStatus = (data: any): OfficialControlPlatformStatus => ({
  enabled: data?.enabled === true,
  hostAllowed: data?.hostAllowed === true || data?.host_allowed === true,
  requiresSecondAuth: data?.requiresSecondAuth !== false && data?.requires_second_auth !== false,
  secondAuthVerified: data?.secondAuthVerified === true || data?.second_auth_verified === true,
  allowedHosts: Array.isArray(data?.allowedHosts)
    ? data.allowedHosts.map((item: unknown) => String(item))
    : Array.isArray(data?.allowed_hosts)
      ? data.allowed_hosts.map((item: unknown) => String(item))
      : [],
  profileId: String(data?.profileId || data?.profile_id || ''),
  currentVersion: String(data?.currentVersion || data?.current_version || ''),
  currentIssuedAt: Number(data?.currentIssuedAt || data?.current_issued_at) || 0,
  currentExpiresAt: Number(data?.currentExpiresAt || data?.current_expires_at) || 0,
  releaseCount: Number(data?.releaseCount || data?.release_count) || 0,
  instanceCount: Number(data?.instanceCount || data?.instance_count) || 0,
})

const mapReleaseRecord = (data: any): OfficialControlReleaseRecord => ({
  id: String(data?.id || ''),
  profileId: String(data?.profileId || data?.profile_id || ''),
  version: String(data?.version || ''),
  issuedAt: Number(data?.issuedAt || data?.issued_at) || 0,
  expiresAt: Number(data?.expiresAt || data?.expires_at) || 0,
  createdAt: Number(data?.createdAt || data?.created_at) || 0,
  operatorName: String(data?.operatorName || data?.operator_name || ''),
  operatorRole: String(data?.operatorRole || data?.operator_role || ''),
  values: (data?.values && typeof data.values === 'object') ? data.values as OfficialManagedConfigValues : {},
  signature: String(data?.signature || ''),
})

const mapInstanceRecord = (data: any): OfficialControlInstanceRecord => ({
  id: String(data?.id || ''),
  instanceId: String(data?.instanceId || data?.instance_id || ''),
  label: String(data?.label || ''),
  enabled: data?.enabled !== false,
  allowedOrigins: Array.isArray(data?.allowedOrigins)
    ? data.allowedOrigins.map((item: unknown) => String(item))
    : Array.isArray(data?.allowed_origins)
      ? data.allowed_origins.map((item: unknown) => String(item))
      : [],
  createdAt: Number(data?.createdAt || data?.created_at) || 0,
  updatedAt: Number(data?.updatedAt || data?.updated_at) || 0,
  lastResetAt: Number(data?.lastResetAt || data?.last_reset_at) || 0,
})

export const fetchOfficialControlPlatformStatus = async (): Promise<OfficialControlPlatformStatus> => {
  const res = await fetch('/api/admin/official-control/platform-status', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getStoredAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '获取官方云控平台状态失败')
  }
  return mapPlatformStatus(data.status)
}

export const loginOfficialControlSecondAuth = async (password: string): Promise<OfficialControlPlatformStatus> => {
  const res = await fetch('/api/admin/official-control/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({ password }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '云控二次密码验证失败')
  }
  return mapPlatformStatus(data.status)
}

export const logoutOfficialControlSecondAuth = async (): Promise<OfficialControlPlatformStatus> => {
  const res = await fetch('/api/admin/official-control/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '退出云控平台失败')
  }
  return mapPlatformStatus(data.status)
}

export const fetchOfficialControlCurrentConfig = async (): Promise<{
  current: OfficialControlReleaseRecord | null
  releases: OfficialControlReleaseRecord[]
  managedKeys: string[]
}> => {
  const res = await fetch('/api/admin/official-control/config/current', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getStoredAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '读取官方云控配置失败')
  }
  return {
    current: data?.current ? mapReleaseRecord(data.current) : null,
    releases: Array.isArray(data?.releases) ? data.releases.map(mapReleaseRecord) : [],
    managedKeys: Array.isArray(data?.managedKeys) ? data.managedKeys.map((item: unknown) => String(item)) : [],
  }
}

export const publishOfficialControlConfig = async (values: OfficialManagedConfigValues): Promise<{
  current: OfficialControlReleaseRecord
  releases: OfficialControlReleaseRecord[]
}> => {
  const res = await fetch('/api/admin/official-control/config/publish', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({ values }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.current) {
    throw new Error(data?.msg || '发布官方云控配置失败')
  }
  return {
    current: mapReleaseRecord(data.current),
    releases: Array.isArray(data?.releases) ? data.releases.map(mapReleaseRecord) : [],
  }
}

export const fetchOfficialControlInstances = async (): Promise<OfficialControlInstanceRecord[]> => {
  const res = await fetch('/api/admin/official-control/instances', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getStoredAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '读取实例列表失败')
  }
  return Array.isArray(data?.instances) ? data.instances.map(mapInstanceRecord) : []
}

export const createOfficialControlInstance = async (payload: {
  label: string
  instanceId: string
  allowedOrigins: string[]
  enabled?: boolean
}): Promise<{ instance: OfficialControlInstanceRecord; licenseKey: string }> => {
  const res = await fetch('/api/admin/official-control/instances', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.instance || !data?.licenseKey) {
    throw new Error(data?.msg || '创建实例失败')
  }
  return {
    instance: mapInstanceRecord(data.instance),
    licenseKey: String(data.licenseKey),
  }
}

export const updateOfficialControlInstance = async (id: string, payload: {
  enabled?: boolean
  allowedOrigins?: string[]
}): Promise<OfficialControlInstanceRecord> => {
  const res = await fetch(`/api/admin/official-control/instances/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.instance) {
    throw new Error(data?.msg || '更新实例失败')
  }
  return mapInstanceRecord(data.instance)
}

export const resetOfficialControlInstanceLicense = async (id: string): Promise<{ instance: OfficialControlInstanceRecord; licenseKey: string }> => {
  const res = await fetch(`/api/admin/official-control/instances/${encodeURIComponent(id)}/reset-license`, {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.instance || !data?.licenseKey) {
    throw new Error(data?.msg || '重置实例密钥失败')
  }
  return {
    instance: mapInstanceRecord(data.instance),
    licenseKey: String(data.licenseKey),
  }
}
