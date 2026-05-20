export interface OnlineReleaseNotes {
  features: string
  visibleChanges: string
  playerNotice: string
  knownIssues: string
  rollbackPlan: string
}

export interface OnlineReleaseFeatureFlags {
  socialFriendsEnabled: boolean
  manorVisitEnabled: boolean
  coopOrderEnabled: boolean
  festivalRoomEnabled: boolean
}

export interface OnlineReleaseModuleSwitches {
  social: boolean
  manor: boolean
  order: boolean
  festival: boolean
  society: boolean
}

export interface OnlineReleaseConfig {
  enabled: boolean
  grayChannel: 'stable' | 'canary'
  featureFlags: OnlineReleaseFeatureFlags
  moduleSwitches: OnlineReleaseModuleSwitches
  testWhitelist: string
  whitelistUsernames: string[]
  betaTemplates: {
    manor: string
    society: string
    festival: string
  }
  releaseNotes: OnlineReleaseNotes
}
