const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取设置
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // 保存设置
  setSettings: settings => ipcRenderer.invoke('set-settings', settings),

  // 重启窗口（用于切换边框模式）
  restartWindow: () => ipcRenderer.invoke('restart-window'),

  // 退出应用
  quitApp: () => ipcRenderer.invoke('quit-app')
})
