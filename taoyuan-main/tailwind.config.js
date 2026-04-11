/** @type {import('tailwindcss').Config} */

const themeColor =
  name =>
  ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(--color-${name}) / ${opacityValue})`
    }
    return `rgb(var(--color-${name}))`
  }

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: themeColor('bg'),
        panel: themeColor('panel'),
        text: themeColor('text'),
        accent: '#c8a45c',
        danger: '#c34043',
        success: '#5a9e6f',
        water: '#4c6e8a',
        earth: '#8b6914',
        muted: '#6b7280',
        'quality-fine': '#d4976a',
        'quality-excellent': '#a8c4d4',
        'quality-supreme': '#ffd700'
      },
      fontFamily: {
        game: ['zpix', 'monospace']
      },
      spacing: {
        30: '7.5rem',
        62.5: '15.625rem',
        110: '27.5rem',
        150: '37.5rem'
      },
      flex: {
        32: '32',
        36: '36'
      },
      borderRadius: {
        xs: '0.125rem'
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90'
      }
    }
  },
  plugins: []
}
