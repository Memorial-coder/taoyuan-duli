import { getActivePinia } from 'pinia'
import type { Season, Weather } from '@/types'

export interface ExistingGameStoreSnapshot {
  year: number
  season: Season
  day: number
  hour: number
  weather: Weather
  tomorrowWeather: Weather
  dailyLuck: number
}

const DEFAULT_GAME_STORE_SNAPSHOT: ExistingGameStoreSnapshot = {
  year: 1,
  season: 'spring',
  day: 1,
  hour: 6,
  weather: 'sunny',
  tomorrowWeather: 'sunny',
  dailyLuck: 0
}

const normalizeNumber = (value: unknown, fallback: number): number => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const normalizeString = <T extends string>(value: unknown, fallback: T): T =>
  typeof value === 'string' && value.length > 0 ? value as T : fallback

export const getExistingGameStoreSnapshot = (): ExistingGameStoreSnapshot => {
  const store = getActivePinia()?._s.get('game') as Partial<ExistingGameStoreSnapshot> | undefined
  const weather = normalizeString<Weather>(store?.weather, DEFAULT_GAME_STORE_SNAPSHOT.weather)
  return {
    year: normalizeNumber(store?.year, DEFAULT_GAME_STORE_SNAPSHOT.year),
    season: normalizeString<Season>(store?.season, DEFAULT_GAME_STORE_SNAPSHOT.season),
    day: normalizeNumber(store?.day, DEFAULT_GAME_STORE_SNAPSHOT.day),
    hour: normalizeNumber(store?.hour, DEFAULT_GAME_STORE_SNAPSHOT.hour),
    weather,
    tomorrowWeather: normalizeString<Weather>(store?.tomorrowWeather, weather),
    dailyLuck: normalizeNumber(store?.dailyLuck, DEFAULT_GAME_STORE_SNAPSHOT.dailyLuck)
  }
}
