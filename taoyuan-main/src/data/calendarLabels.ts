import type { Season, Weather } from '@/types'

export const SEASON_NAMES: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

export const WEATHER_NAMES: Record<Weather, string> = {
  sunny: '晴',
  rainy: '雨',
  stormy: '雷雨',
  snowy: '雪',
  windy: '大风',
  green_rain: '绿雨'
}
