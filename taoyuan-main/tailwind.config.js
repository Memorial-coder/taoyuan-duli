/** @type {import('tailwindcss').Config} */

const themeColor =
  name =>
  ({ opacityValue }) => {
    const token = `var(--color-${name}-rgb, var(--color-${name}))`
    if (opacityValue !== undefined) {
      return `rgb(${token} / ${opacityValue})`
    }
    return `rgb(${token})`
  }

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: themeColor('bg'),
        background: themeColor('background'),
        panel: themeColor('panel'),
        text: themeColor('text'),
        accent: themeColor('accent'),
        danger: themeColor('danger'),
        success: themeColor('success'),
        warning: themeColor('warning'),
        water: themeColor('water'),
        earth: themeColor('earth'),
        muted: themeColor('muted'),
        highlight: themeColor('highlight'),
        'quality-fine': themeColor('quality-fine'),
        'quality-excellent': themeColor('quality-excellent'),
        'quality-supreme': themeColor('quality-supreme')
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
