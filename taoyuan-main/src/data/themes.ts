export type ThemeKey = 'dark' | 'warm' | 'ink' | 'parchment' | 'contrast'

export interface ThemeDef {
  key: ThemeKey
  name: string
  bg: string
  panel: string
  text: string
  accent: string
  danger: string
  success: string
  warning: string
  water: string
  earth: string
  muted: string
  highlight: string
  surfaceMuted: string
  surfaceRaised: string
  borderSubtle: string
  border: string
  focusRing: string
  shadow: string
  overlay: string
  tone: 'dark' | 'light'
}

export const THEMES: ThemeDef[] = [
  {
    key: 'dark',
    name: '墨夜',
    bg: '#1a1a1a',
    panel: '#2b2d3c',
    text: '#e8e4d9',
    accent: '#c8a45c',
    danger: '#d15a5d',
    success: '#6fb982',
    warning: '#d7ad58',
    water: '#6d91b2',
    earth: '#a98024',
    muted: '#9ca3af',
    highlight: '#f0cf83',
    surfaceMuted: 'rgba(255, 255, 255, 0.055)',
    surfaceRaised: 'rgba(255, 255, 255, 0.085)',
    borderSubtle: 'rgba(200, 164, 92, 0.16)',
    border: 'rgba(200, 164, 92, 0.34)',
    focusRing: 'rgba(200, 164, 92, 0.36)',
    shadow: 'rgba(0, 0, 0, 0.22)',
    overlay: 'rgba(0, 0, 0, 0.68)',
    tone: 'dark'
  },
  {
    key: 'warm',
    name: '暖灯',
    bg: '#2a2318',
    panel: '#3d3528',
    text: '#efe6d0',
    accent: '#d1a65a',
    danger: '#d7675f',
    success: '#77b878',
    warning: '#e0b65f',
    water: '#7295a7',
    earth: '#b68a35',
    muted: '#b8aa96',
    highlight: '#f0cc76',
    surfaceMuted: 'rgba(255, 246, 225, 0.065)',
    surfaceRaised: 'rgba(255, 246, 225, 0.1)',
    borderSubtle: 'rgba(209, 166, 90, 0.17)',
    border: 'rgba(209, 166, 90, 0.35)',
    focusRing: 'rgba(209, 166, 90, 0.38)',
    shadow: 'rgba(0, 0, 0, 0.24)',
    overlay: 'rgba(0, 0, 0, 0.68)',
    tone: 'dark'
  },
  {
    key: 'ink',
    name: '水墨',
    bg: '#f4f1ea',
    panel: '#e8e1d4',
    text: '#263238',
    accent: '#3f6f7b',
    danger: '#a83f3f',
    success: '#367f53',
    warning: '#8b6f2f',
    water: '#3f7b8b',
    earth: '#816b3d',
    muted: '#647276',
    highlight: '#1f5c68',
    surfaceMuted: 'rgba(63, 111, 123, 0.075)',
    surfaceRaised: 'rgba(255, 255, 255, 0.44)',
    borderSubtle: 'rgba(63, 111, 123, 0.18)',
    border: 'rgba(63, 111, 123, 0.34)',
    focusRing: 'rgba(63, 111, 123, 0.28)',
    shadow: 'rgba(50, 58, 61, 0.12)',
    overlay: 'rgba(38, 45, 47, 0.42)',
    tone: 'light'
  },
  {
    key: 'parchment',
    name: '素笺',
    bg: '#f3eddf',
    panel: '#e6dcc8',
    text: '#342f28',
    accent: '#6f7a50',
    danger: '#a3483c',
    success: '#4f7f47',
    warning: '#84672d',
    water: '#557a86',
    earth: '#84663d',
    muted: '#6f675a',
    highlight: '#536937',
    surfaceMuted: 'rgba(111, 122, 80, 0.085)',
    surfaceRaised: 'rgba(255, 251, 240, 0.48)',
    borderSubtle: 'rgba(111, 122, 80, 0.18)',
    border: 'rgba(111, 122, 80, 0.34)',
    focusRing: 'rgba(111, 122, 80, 0.28)',
    shadow: 'rgba(60, 50, 36, 0.12)',
    overlay: 'rgba(45, 40, 32, 0.42)',
    tone: 'light'
  },
  {
    key: 'contrast',
    name: '澈',
    bg: '#f4f7f0',
    panel: '#e7ede2',
    text: '#1d2a25',
    accent: '#2c6f64',
    danger: '#9b3d42',
    success: '#36714e',
    warning: '#765f20',
    water: '#2f6f82',
    earth: '#74582a',
    muted: '#51615b',
    highlight: '#215e55',
    surfaceMuted: 'rgba(44, 111, 100, 0.1)',
    surfaceRaised: 'rgba(255, 255, 255, 0.72)',
    borderSubtle: 'rgba(44, 111, 100, 0.24)',
    border: 'rgba(44, 111, 100, 0.42)',
    focusRing: 'rgba(44, 111, 100, 0.36)',
    shadow: 'rgba(29, 42, 37, 0.15)',
    overlay: 'rgba(29, 42, 37, 0.26)',
    tone: 'light'
  }
]

/** 将 hex 颜色转换为空格分隔的 RGB 数值，用于 CSS 变量 + Tailwind 透明度支持 */
export const hexToRgb = (hex: string): string => {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`
}

export const getThemeByKey = (key: ThemeKey): ThemeDef => THEMES.find(t => t.key === key) ?? THEMES[0]!
