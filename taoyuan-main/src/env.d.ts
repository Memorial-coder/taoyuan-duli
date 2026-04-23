interface Window {
  __WEBVIEW__?: boolean
}

interface ImportMetaEnv {
  readonly VITE_ANDROID_API_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
