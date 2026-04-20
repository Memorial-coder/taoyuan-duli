export type OfficialManagedConfigSource = 'official_live' | 'official_cached' | 'local_default'

export type OfficialManagedConfigKey =
  | 'ai_assistant_console_credit'
  | 'ai_assistant_name'
  | 'ai_assistant_welcome'
  | 'taoyuan_about_dialog_title'
  | 'taoyuan_about_dialog_content'

export interface OfficialManagedConfigValues {
  ai_assistant_console_credit?: string
  ai_assistant_name?: string
  ai_assistant_welcome?: string
  taoyuan_about_dialog_title?: string
  taoyuan_about_dialog_content?: string
}

export interface OfficialManagedConfigEnvelope {
  profileId: string
  version: string
  issuedAt: number
  expiresAt: number
  values: OfficialManagedConfigValues
  signature: string
}

export interface OfficialManagedConfigStatus {
  enabled: boolean
  configured: boolean
  source: OfficialManagedConfigSource
  profileId: string
  version: string
  issuedAt: number
  expiresAt: number
  lastFetchedAt: number
  lastVerifiedAt: number
  lastError: string
  managedKeys: OfficialManagedConfigKey[]
}
