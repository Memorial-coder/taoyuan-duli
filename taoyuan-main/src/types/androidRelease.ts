export interface AndroidAppReleaseConfig {
  enabled: boolean
  latestVersionName: string
  latestVersionCode: number
  minSupportedVersionCode: number
  downloadUrl: string
  releaseNotes: string
  forceUpdateMessage: string
}
