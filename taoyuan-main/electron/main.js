import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import pkg from '../package.json'

// 应用根目录（开发时是项目根目录，打包后是 app.asar）
const appRoot = app.getAppPath()

// preload 路径
const preloadPath = path.join(appRoot, 'dist-electron', 'preload.js')

// 构建产物路径（Vite 输出到 docs/）
const docsPath = path.join(appRoot, 'docs')

// 静态资源路径
const publicPath = path.join(appRoot, 'public')

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json')

// 默认设置
const defaultSettings = {
  closeToTray: false, // 关闭窗口时隐藏到托盘
  autoLaunch: false // 开机自启动
}

// 读取设置
const loadSettings = () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return { ...defaultSettings }
}

// 保存设置
const saveSettings = s => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

let settings = loadSettings()
let win = null
let tray = null
let isQuitting = false

// 销毁托盘
const destroyTray = () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

// 设置开机自启动
const setAutoLaunch = enable => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  })
}

// 创建托盘
const createTray = () => {
  if (tray) return

  const iconPath = path.join(publicPath, 'favicon.ico')
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()

  tray = new Tray(trayIcon)
  tray.setToolTip(pkg.title)

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => win?.show() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => win?.show())
}

// 创建应用菜单
const createAppMenu = () => {
  const template = [
    {
      label: '设置',
      submenu: [
        {
          label: '关闭时最小化到托盘',
          type: 'checkbox',
          checked: settings.closeToTray,
          click: menuItem => {
            settings.closeToTray = menuItem.checked
            saveSettings(settings)
            if (settings.closeToTray) {
              createTray()
            } else {
              destroyTray()
            }
          }
        },
        {
          label: '开机自动启动',
          type: 'checkbox',
          checked: settings.autoLaunch,
          click: menuItem => {
            settings.autoLaunch = menuItem.checked
            saveSettings(settings)
            setAutoLaunch(settings.autoLaunch)
          }
        },
        {
          label: '退出游戏',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: '开发',
      submenu: [
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => win?.webContents.toggleDevTools()
        },
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => win?.webContents.reload()
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 创建窗口
const createWindow = () => {
  win = new BrowserWindow({
    title: pkg.title,
    icon: path.join(publicPath, 'favicon.ico'),
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  })

  createAppMenu()
  win.loadFile(path.join(docsPath, 'index.html'))

  // WebDAV CORS 绕过：对所有非同源请求注入 CORS 响应头
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    headers['access-control-allow-origin'] = ['*']
    headers['access-control-allow-methods'] = ['GET, PUT, DELETE, PROPFIND, HEAD, OPTIONS']
    headers['access-control-allow-headers'] = ['Authorization, Content-Type, Depth']
    // 剥离 WWW-Authenticate 防止浏览器弹出原生认证对话框（由应用自行处理认证错误）
    delete headers['www-authenticate']
    delete headers['WWW-Authenticate']
    callback({ responseHeaders: headers })
  })

  // 窗口关闭事件
  win.on('close', e => {
    if (settings.closeToTray && !isQuitting) {
      e.preventDefault()
      win.hide()
      createTray()
    }
  })
}

// IPC 处理
ipcMain.handle('get-settings', () => settings)

ipcMain.handle('set-settings', (_, newSettings) => {
  settings = { ...settings, ...newSettings }
  saveSettings(settings)

  // 处理开机自启动
  setAutoLaunch(settings.autoLaunch)

  // 处理托盘
  if (settings.closeToTray) {
    createTray()
  } else {
    destroyTray()
  }

  return { needRestart: false }
})

ipcMain.handle('restart-window', () => {
  if (win) {
    const bounds = win.getBounds()
    win.destroy()
    createWindow()
    win.setBounds(bounds)
  }
})

ipcMain.handle('quit-app', () => {
  isQuitting = true
  app.quit()
})

app.whenReady().then(() => {
  createWindow()

  // 如果启用了托盘功能，创建托盘
  if (settings.closeToTray) {
    createTray()
  }

  // 应用开机自启动设置
  setAutoLaunch(settings.autoLaunch)
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win) {
    win.show()
  } else {
    createWindow()
  }
})
