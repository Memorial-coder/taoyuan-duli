let endDayModulePromise: Promise<typeof import('./useEndDay')> | null = null

const loadEndDayModule = () => {
  endDayModulePromise ??= import('./useEndDay')
  return endDayModulePromise
}

export const handleEndDay = () => {
  void loadEndDayModule().then(module => {
    module.handleEndDay()
  })
}
