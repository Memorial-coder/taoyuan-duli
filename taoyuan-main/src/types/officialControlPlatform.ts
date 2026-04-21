import type { OfficialManagedConfigValues } from './officialManaged'

export interface OfficialControlPlatformStatus {
  enabled: boolean
  hostAllowed: boolean
  requiresSecondAuth: boolean
  secondAuthVerified: boolean
  allowedHosts: string[]
  profileId: string
  currentVersion: string
  currentIssuedAt: number
  currentExpiresAt: number
  releaseCount: number
  instanceCount: number
}

export interface OfficialControlReleaseRecord {
  id: string
  profileId: string
  version: string
  issuedAt: number
  expiresAt: number
  createdAt: number
  operatorName: string
  operatorRole: string
  values: OfficialManagedConfigValues
  signature: string
}

export interface OfficialControlInstanceRecord {
  id: string
  instanceId: string
  label: string
  enabled: boolean
  allowedOrigins: string[]
  createdAt: number
  updatedAt: number
  lastResetAt: number
}
