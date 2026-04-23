import type { AndroidAppReleaseConfig } from '@/types/androidRelease'

const toNonNegativeInt = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export const createDefaultAndroidAppReleaseConfig = (): AndroidAppReleaseConfig => ({
  enabled: false,
  latestVersionName: '',
  latestVersionCode: 0,
  minSupportedVersionCode: 0,
  downloadUrl: '',
  releaseNotes: '',
  forceUpdateMessage: '当前安卓版本过旧，请先更新到最新安装包后再继续游玩。',
})

export const normalizeAndroidAppReleaseConfig = (value: unknown): AndroidAppReleaseConfig => {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const base = createDefaultAndroidAppReleaseConfig()
  return {
    enabled: raw.enabled === true,
    latestVersionName: String(raw.latestVersionName || raw.latest_version_name || '').trim(),
    latestVersionCode: toNonNegativeInt(raw.latestVersionCode ?? raw.latest_version_code),
    minSupportedVersionCode: toNonNegativeInt(raw.minSupportedVersionCode ?? raw.min_supported_version_code),
    downloadUrl: String(raw.downloadUrl || raw.download_url || '').trim(),
    releaseNotes: String(raw.releaseNotes || raw.release_notes || '').trim(),
    forceUpdateMessage: String(raw.forceUpdateMessage || raw.force_update_message || '').trim() || base.forceUpdateMessage,
  }
}
