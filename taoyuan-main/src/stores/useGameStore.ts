import { ref, computed } from 'vue'
import { defineStore, getActivePinia } from 'pinia'
import type { Season, Weather, Location, LocationGroup, FarmMapType, Quality } from '@/types'
import {
  DAY_START_HOUR,
  PASSOUT_HOUR,
  MIDNIGHT_HOUR,
  WEEKDAY_NAMES,
  getWeekday,
  formatTime,
  getTimePeriod,
  TAB_TO_LOCATION_GROUP,
  TRAVEL_TIME,
  TRAVEL_STAMINA,
  getLocationGroupName
} from '@/data/timeConstants'
import {
  buildRareVisitorSeasonVisitLedgerId,
  WANDERING_ARTIST_ACTION_SPEED_BONUS,
  WANDERING_ARTIST_VISITOR_ID
} from '@/data/rareVisitorBonuses'

const MAX_TRAVEL_SPEED_BONUS = 0.45
const MAX_FOOD_ACTION_SPEED_BONUS = 0.25
const MAX_ALCHEMY_ACTION_SPEED_BONUS = 0.1
const MAX_TOTAL_ACTION_SPEED_BONUS = 0.32
const MIN_SPEED_SAVE_MESSAGE_MINUTES = 2

type TravelCostDetails = {
  cost: number
  travelSpeedSavedMinutes: number
  actionSpeedSavedMinutes: number
}

type NpcEffectRuntimeStore = {
  isNpcFunctionEffectUnlocked?: (effectId: string) => boolean
}

type HiddenNpcRuntimeStore = {
  getAbilityValue?: (abilityId: string) => number
}

type LifestyleDiscoverySnapshot = {
  lifestyleUnlocks?: Record<string, { lastSeenDayTag?: string }>
}

type PlayerRuntimeStore = {
  consumeStamina?: (amount: number) => boolean
  getLifestyleDiscoverySnapshot?: () => LifestyleDiscoverySnapshot
}

type CookingRuntimeStore = {
  activeBuff?: { type?: string; value?: number } | null
  getActiveAlchemyActionSpeedBonus?: () => number
}

type AnimalRuntimeStore = {
  hasHorse?: boolean
  horseTravelMultiplier?: number
  horseStaminaMultiplier?: number
}

type InventoryRuntimeStore = {
  getRingEffectValue?: (effectId: string) => number
}

type VillageProjectRuntimeStore = {
  worldShortcutUnlocks?: Array<{ id: string; unlocked?: boolean }>
}

const getActiveRuntimeStore = <T>(storeId: string): T | undefined =>
  getActivePinia()?._s.get(storeId) as T | undefined

const isNpcFunctionEffectUnlocked = (effectId: string): boolean =>
  getActiveRuntimeStore<NpcEffectRuntimeStore>('npc')?.isNpcFunctionEffectUnlocked?.(effectId) === true

const getHiddenNpcAbilityValue = (abilityId: string): number => {
  const value = getActiveRuntimeStore<HiddenNpcRuntimeStore>('hiddenNpc')?.getAbilityValue?.(abilityId)
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

const getNumericRuntimeValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const getRingEffectValue = (effectId: string): number =>
  getNumericRuntimeValue(getActiveRuntimeStore<InventoryRuntimeStore>('inventory')?.getRingEffectValue?.(effectId), 0)

const processHiddenNpcDiscoverySoon = () => {
  void import('@/composables/useHiddenNpcDiscovery')
    .then(({ processHiddenNpcDiscovery }) => processHiddenNpcDiscovery())
    .catch(() => {})
}

/** 瀛ｈ妭椤哄簭 */
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** 瀛ｈ妭涓枃鍚?*/
export const SEASON_NAMES: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

/** 澶╂皵涓枃鍚?*/
export const WEATHER_NAMES: Record<Weather, string> = {
  sunny: '晴',
  rainy: '雨',
  stormy: '雷雨',
  snowy: '雪',
  windy: '大风',
  green_rain: '绿雨'
}

/** 鍥哄畾澶╂皵鏃?*/
const FIXED_WEATHER: Partial<Record<Season, Record<number, Weather>>> = {
  spring: { 1: 'sunny' },
  summer: { 13: 'stormy', 26: 'stormy' }
}

/** 鑺傛棩鏃ユ湡锛堟案杩滄櫞澶╋級 */
const FESTIVAL_DAYS: Record<Season, number[]> = {
  spring: [1, 8, 15, 24],
  summer: [5, 15, 22],
  autumn: [8, 15, 22],
  winter: [8, 15, 22, 28]
}

export const useGameStore = defineStore('game', () => {
  const year = ref(1)
  const season = ref<Season>('spring')
  const day = ref(1)
  const hour = ref(DAY_START_HOUR)
  const weather = ref<Weather>('sunny')
  const tomorrowWeather = ref<Weather>('sunny')
  const currentLocation = ref<Location>('farm')
  const currentLocationGroup = ref<LocationGroup>('farm')
  const isGameStarted = ref(false)
  const farmMapType = ref<FarmMapType>('standard')
  const midnightWarned = ref(false)
  const dailyLuck = ref(0)

  /** 灞变笜鐢板簞锛氬湴琛ㄧ熆鑴夛紙鏃ョ粨鐢熸垚锛屽湪鍐滃満闈㈡澘寮€閲囧悗娓呴櫎锛?*/
  const surfaceOrePatch = ref<{ oreId: string; quantity: number } | null>(null)

  /** 婧祦鐢板簞锛氭邯娴侀奔鑾凤紙鏃ョ粨鐢熸垚锛屽湪鍐滃満闈㈡澘鏀跺彇鍚庢竻闄わ級 */
  const creekCatch = ref<{ fishId: string; quality: Quality }[]>([])

  const seasonIndex = computed(() => SEASON_ORDER.indexOf(season.value))
  const seasonName = computed(() => SEASON_NAMES[season.value])
  const weatherName = computed(() => WEATHER_NAMES[weather.value])
  const isRainy = computed(() => weather.value === 'rainy' || weather.value === 'stormy' || weather.value === 'green_rain')

  // 鏃堕棿鐩稿叧 computed
  const weekday = computed(() => getWeekday(day.value))
  const weekdayName = computed(() => WEEKDAY_NAMES[weekday.value])
  const timeDisplay = computed(() => formatTime(hour.value))
  const timePeriod = computed(() => getTimePeriod(hour.value))
  const isLateNight = computed(() => hour.value >= MIDNIGHT_HOUR)
    const _hasExtraNightAction = computed(() => isNpcFunctionEffectUnlocked('extra_night_action'))
    const isPastBedtime = computed(() => hour.value >= (_hasExtraNightAction.value ? PASSOUT_HOUR + 1 : PASSOUT_HOUR))

  const getNextCalendarPoint = (baseYear = year.value, baseSeason = season.value, baseDay = day.value) => {
    let nextYear = baseYear
    let nextSeason = baseSeason
    let nextDay = baseDay + 1
    if (nextDay > 28) {
      nextDay = 1
      const nextIndex = SEASON_ORDER.indexOf(baseSeason) + 1
      if (nextIndex >= SEASON_ORDER.length) {
        nextSeason = 'spring'
        nextYear += 1
      } else {
        nextSeason = SEASON_ORDER[nextIndex]!
      }
    }
    return { year: nextYear, season: nextSeason, day: nextDay }
  }

  const getForcedWeather = (targetYear: number, targetSeason: Season, targetDay: number): Weather | null => {
    if (FESTIVAL_DAYS[targetSeason]?.includes(targetDay)) return 'sunny'
    const fixed = FIXED_WEATHER[targetSeason]?.[targetDay]
    if (fixed) return fixed
    if (targetYear === 1 && targetSeason === 'summer' && targetDay === 4) return 'green_rain'
    return null
  }

  /** 闅忔満鐢熸垚澶╂皵锛堟寜瀛ｈ妭姒傜巼 + 鍥哄畾澶╂皵鏃?+ 鑺傛棩鏅村ぉ锛?*/
  const rollWeather = (s?: Season, d?: number, y?: number): Weather => {
    const targetSeason = s ?? season.value
    const targetDay = d ?? day.value
    const targetYear = y ?? year.value

    const forced = getForcedWeather(targetYear, targetSeason, targetDay)
    if (forced) return forced

    // 按季节概率随机
    const roll = Math.random()
    // 浠欑紭鑳藉姏锛氬敜闆紙long_ling_2锛変笅闆ㄦ鐜?15%锛岄€氳繃鍘嬬缉鏅村ぉ姒傜巼瀹炵幇
    const rainBoost = getHiddenNpcAbilityValue('long_ling_2') / 100
    switch (targetSeason) {
      case 'spring':
        return roll < 0.5 - rainBoost ? 'sunny' : roll < 0.75 ? 'rainy' : roll < 0.85 ? 'stormy' : 'windy'
      case 'summer':
        // 缁块洦: 8% 姒傜巼 (浠呭瀛?
        return roll < 0.08 ? 'green_rain' : roll < 0.42 - rainBoost ? 'sunny' : roll < 0.68 ? 'rainy' : roll < 0.83 ? 'stormy' : 'windy'
      case 'autumn':
        return roll < 0.45 - rainBoost ? 'sunny' : roll < 0.7 ? 'rainy' : roll < 0.8 ? 'stormy' : 'windy'
      case 'winter':
        return roll < 0.5 - rainBoost ? 'sunny' : roll < 0.8 ? 'snowy' : 'windy'
    }
  }

  /** 鎺ㄨ繘鏃堕棿锛堝皬鏃讹級锛岃繑鍥炵粨鏋?*/
  const getRareVisitorActionSpeedBonus = (): number => {
    const playerStore = getActiveRuntimeStore<PlayerRuntimeStore>('player')
    const seasonVisitLedgerId = buildRareVisitorSeasonVisitLedgerId(WANDERING_ARTIST_VISITOR_ID, year.value, season.value)
    const seasonVisitEntry = playerStore?.getLifestyleDiscoverySnapshot?.()?.lifestyleUnlocks?.[seasonVisitLedgerId]
    const currentDayTag = `${year.value}-${season.value}-${day.value}`
    return seasonVisitEntry?.lastSeenDayTag === currentDayTag ? WANDERING_ARTIST_ACTION_SPEED_BONUS : 0
  }

  const getActionSpeedReduction = (): number => {
    const cookingStore = getActiveRuntimeStore<CookingRuntimeStore>('cooking')
    const activeBuff = cookingStore?.activeBuff
    const foodSpeedBuff = activeBuff?.type === 'speed'
      ? Math.min(MAX_FOOD_ACTION_SPEED_BONUS, Math.max(0, getNumericRuntimeValue(activeBuff.value, 0) / 100))
      : 0
    const alchemySpeedBuff = Math.min(
      MAX_ALCHEMY_ACTION_SPEED_BONUS,
      Math.max(0, getNumericRuntimeValue(cookingStore?.getActiveAlchemyActionSpeedBonus?.(), 0))
    )
    const rareVisitorSpeedBuff = getRareVisitorActionSpeedBonus()
    const combined = 1 - (1 - foodSpeedBuff) * (1 - alchemySpeedBuff) * (1 - rareVisitorSpeedBuff)
    return Math.min(MAX_TOTAL_ACTION_SPEED_BONUS, combined)
  }

  const getEffectiveActionHours = (hours: number): number => {
    if (hours <= 0) return 0
    return hours * (1 - getActionSpeedReduction())
  }

  const buildActionSpeedSaveMessage = (baseHours: number, effectiveHours: number): string => {
    const savedMinutes = Math.round(Math.max(0, baseHours - effectiveHours) * 60)
    return savedMinutes >= MIN_SPEED_SAVE_MESSAGE_MINUTES ? `行动速度节省${savedMinutes}分钟。` : ''
  }

  const advanceTime = (hours: number, options?: { skipSpeedBuff?: boolean }): { ok: boolean; passedOut: boolean; message: string } => {
    if (hours <= 0) return { ok: true, passedOut: false, message: '' }


    const effectiveHours = options?.skipSpeedBuff ? hours : getEffectiveActionHours(hours)
    const speedMessage = options?.skipSpeedBuff ? '' : buildActionSpeedSaveMessage(hours, effectiveHours)

    const prevHour = hour.value
    const newHour = hour.value + effectiveHours

    // NPC function: extra_night_action allows 1 extra action after midnight
    const _hasExtraNightAction = isNpcFunctionEffectUnlocked('extra_night_action')
    const _effectivePassout = _hasExtraNightAction ? PASSOUT_HOUR + 1 : PASSOUT_HOUR
    if (newHour >= _effectivePassout) {
      hour.value = PASSOUT_HOUR
      return {
        ok: true,
        passedOut: true,
        message: [speedMessage, '已经凌晨2点了，你撑不住倒下了……'].filter(Boolean).join(' ')
      }
    }

    hour.value = newHour
    processHiddenNpcDiscoverySoon()

    // 璺ㄥ崍澶滄彁绀猴紙浠呬竴娆★級
    if (!midnightWarned.value && prevHour < MIDNIGHT_HOUR && hour.value >= MIDNIGHT_HOUR) {
      midnightWarned.value = true
      return {
        ok: true,
        passedOut: false,
        message: [speedMessage, '已经过了午夜，你开始感到困倦……'].filter(Boolean).join(' ')
      }
    }

    return { ok: true, passedOut: false, message: speedMessage }
  }

  const getActiveShortcutIdsForTravel = (from: LocationGroup, to: LocationGroup): string[] => {
    const key = `${from}->${to}`
    const shortcutIds = (getActiveRuntimeStore<VillageProjectRuntimeStore>('villageProject')?.worldShortcutUnlocks ?? [])
      .filter(entry => entry.unlocked)
      .map(entry => entry.id)
    const matchesRoute = (id: string) => {
      if (id === 'support_shed_shortcut_unlock') {
        return ['farm->mine', 'mine->farm', 'village_area->mine', 'mine->village_area'].includes(key)
      }
      if (id === 'hot_spring_shortcut_unlock') {
        return ['farm->nature', 'nature->farm', 'village_area->nature', 'nature->village_area'].includes(key)
      }
      if (id === 'caravan_station_shortcut_unlock' || id === 'caravan_station_ii_shortcut_unlock') {
        return [
          'farm->village_area',
          'village_area->farm',
          'village_area->frontier',
          'frontier->village_area',
          'village_area->hanhai',
          'hanhai->village_area',
          'farm->frontier',
          'frontier->farm'
        ].includes(key)
      }
      return false
    }
    return shortcutIds.filter(matchesRoute)
  }

  const getShortcutTravelMultiplier = (from: LocationGroup, to: LocationGroup) => {
    const activeShortcutCount = getActiveShortcutIdsForTravel(from, to).length
    return activeShortcutCount > 0 ? 1 - Math.min(0.3, activeShortcutCount * 0.12) : 1
  }

  const getShortcutStaminaReduction = (from: LocationGroup, to: LocationGroup) =>
    Math.min(2, getActiveShortcutIdsForTravel(from, to).length)

  const getTravelCostDetails = (targetTab: string): TravelCostDetails => {
    const targetGroup = TAB_TO_LOCATION_GROUP[targetTab]
    if (!targetGroup) return { cost: 0, travelSpeedSavedMinutes: 0, actionSpeedSavedMinutes: 0 }
    if (targetGroup === currentLocationGroup.value) {
      return { cost: 0, travelSpeedSavedMinutes: 0, actionSpeedSavedMinutes: 0 }
    }
    const key = `${currentLocationGroup.value}->${targetGroup}`
    const baseCost = TRAVEL_TIME[key] ?? 0.5
    // 鎷ユ湁椹噺灏?0%鏃呰鏃堕棿
    const animalStore = getActiveRuntimeStore<AnimalRuntimeStore>('animal')
    const horseMultiplier = getNumericRuntimeValue(animalStore?.horseTravelMultiplier, 1)
    // 瑁呭鏃呰閫熷害鍔犳垚锛堜笌椹彔涔橈級
    const travelSpeedBonus = Math.min(
      MAX_TRAVEL_SPEED_BONUS,
      Math.max(0, getRingEffectValue('travel_speed'))
    )
    const shortcutMultiplier = getShortcutTravelMultiplier(currentLocationGroup.value, targetGroup)
    const costBeforeTravelSpeed = baseCost * horseMultiplier * shortcutMultiplier
    const costBeforeActionSpeed = costBeforeTravelSpeed * (1 - travelSpeedBonus)
    const cost = getEffectiveActionHours(costBeforeActionSpeed)
    return {
      cost,
      travelSpeedSavedMinutes: Math.round(Math.max(0, costBeforeTravelSpeed - costBeforeActionSpeed) * 60),
      actionSpeedSavedMinutes: Math.round(Math.max(0, costBeforeActionSpeed - cost) * 60)
    }
  }

  /** 鏌ヨ鍒囨崲鍒扮洰鏍?tab 鐨勭Щ鍔ㄨ€楁椂 */
  const getTravelCost = (targetTab: string): number => {
    return getTravelCostDetails(targetTab).cost
  }

  /** 绉诲姩鍒扮洰鏍?tab 瀵瑰簲鐨勫湴鐐圭粍 */
  const travelTo = (targetTab: string): { ok: boolean; timeCost: number; passedOut: boolean; message: string } => {
    const targetGroup = TAB_TO_LOCATION_GROUP[targetTab]
    if (!targetGroup) return { ok: true, timeCost: 0, passedOut: false, message: '' }
    if (targetGroup === currentLocationGroup.value) return { ok: true, timeCost: 0, passedOut: false, message: '' }

    const travelCostDetails = getTravelCostDetails(targetTab)
    const cost = travelCostDetails.cost
    const targetName = getLocationGroupName(targetGroup)

    // 浣撳姏娑堣€楋細鏈夐┈鍑忓崐锛堝悜涓嬪彇鏁达級
    const key = `${currentLocationGroup.value}->${targetGroup}`
    const baseStamina = TRAVEL_STAMINA[key] ?? 1
    const animalStore = getActiveRuntimeStore<AnimalRuntimeStore>('animal')
    const ringGlobalReduction = getRingEffectValue('stamina_reduction')
    const reducedBaseStamina = Math.max(1, Math.floor(baseStamina * (1 - ringGlobalReduction)))
    const shortcutReduction = getShortcutStaminaReduction(currentLocationGroup.value, targetGroup)
    const staminaAfterShortcut = Math.max(1, reducedBaseStamina - shortcutReduction)
    const staminaCost = animalStore?.hasHorse === true
      ? Math.max(1, Math.floor(staminaAfterShortcut * getNumericRuntimeValue(animalStore.horseStaminaMultiplier, 1)))
      : staminaAfterShortcut
    const playerStore = getActiveRuntimeStore<PlayerRuntimeStore>('player')
    if (playerStore?.consumeStamina && !playerStore.consumeStamina(staminaCost)) {
      return {
        ok: false,
        timeCost: 0,
        passedOut: false,
        message: `体力不足，无法前往${targetName}（需要${staminaCost}点体力）。`
      }
    }

    const result = advanceTime(cost, { skipSpeedBuff: true })
    currentLocationGroup.value = targetGroup

    const speedSaveParts = [
      travelCostDetails.travelSpeedSavedMinutes >= MIN_SPEED_SAVE_MESSAGE_MINUTES
        ? `旅行加速节省${travelCostDetails.travelSpeedSavedMinutes}分钟`
        : '',
      travelCostDetails.actionSpeedSavedMinutes >= MIN_SPEED_SAVE_MESSAGE_MINUTES
        ? `行动速度节省${travelCostDetails.actionSpeedSavedMinutes}分钟`
        : ''
    ].filter(Boolean)
    const speedSaveText = speedSaveParts.length > 0 ? `，${speedSaveParts.join('，')}` : ''
    const travelMsg = cost > 0 ? `前往${targetName}，路上花了${Math.round(cost * 60)}分钟${speedSaveText}，消耗${staminaCost}点体力。` : ''
    return {
      ok: true,
      timeCost: cost,
      passedOut: result.passedOut,
      message: travelMsg + (result.message ? ' ' + result.message : '')
    }
  }

  /** 鎺ㄨ繘鍒颁笅涓€澶╋紝杩斿洖鎹㈠淇℃伅 */
  const nextDay = (): { seasonChanged: boolean; oldSeason: Season } => {
    const oldSeason = season.value
    day.value++
    if (day.value > 28) {
      day.value = 1
      const nextIndex = seasonIndex.value + 1
      if (nextIndex >= 4) {
        season.value = 'spring'
        year.value++
      } else {
        season.value = SEASON_ORDER[nextIndex]!
      }
    }
    // 澶╂皵棰勬姤閾惧紡鎺ㄨ繘
    weather.value = tomorrowWeather.value
    const nextCalendar = getNextCalendarPoint(year.value, season.value, day.value)
    tomorrowWeather.value = rollWeather(nextCalendar.season, nextCalendar.day, nextCalendar.year)
    // 姣忔棩杩愬娍: -0.1 ~ +0.1
    dailyLuck.value = Math.random() * 0.2 - 0.1
    hour.value = DAY_START_HOUR
    midnightWarned.value = false
    currentLocationGroup.value = 'farm'
    return { seasonChanged: oldSeason !== season.value, oldSeason }
  }

  /** 绉诲姩鍒版寚瀹氬湴鐐?*/
  const goTo = (location: Location) => {
    currentLocation.value = location
  }

  /** 寮哄埗璁剧疆鏄庢棩澶╂皵锛堥洦鍥捐吘绛夛級 */
  const setTomorrowWeather = (w: Weather) => {
    const nextCalendar = getNextCalendarPoint()
    tomorrowWeather.value = getForcedWeather(nextCalendar.year, nextCalendar.season, nextCalendar.day) ?? w
  }

  const recalculateTomorrowWeather = () => {
    const nextCalendar = getNextCalendarPoint()
    tomorrowWeather.value = rollWeather(nextCalendar.season, nextCalendar.day, nextCalendar.year)
  }

  /** 开始新游戏 */
  const startNewGame = (mapType: FarmMapType = 'standard') => {
    year.value = 1
    season.value = 'spring'
    day.value = 1
    hour.value = DAY_START_HOUR
    midnightWarned.value = false
    weather.value = 'sunny'
    tomorrowWeather.value = rollWeather('spring', 2, 1)
    currentLocation.value = 'farm'
    currentLocationGroup.value = 'farm'
    farmMapType.value = mapType
    isGameStarted.value = true
  }

  /** 导出存档数据 */
  const serialize = () => {
    return {
      year: year.value,
      season: season.value,
      day: day.value,
      hour: hour.value,
      weather: weather.value,
      tomorrowWeather: tomorrowWeather.value,
      currentLocation: currentLocation.value,
      currentLocationGroup: currentLocationGroup.value,
      farmMapType: farmMapType.value,
      dailyLuck: dailyLuck.value,
      surfaceOrePatch: surfaceOrePatch.value,
      creekCatch: creekCatch.value
    }
  }

  /** 加载存档数据 */
  const deserialize = (data: any) => {
    year.value = data.year ?? 1
    season.value = data.season ?? 'spring'
    day.value = data.day ?? 1
    hour.value = data.hour ?? DAY_START_HOUR
    midnightWarned.value = (data.hour ?? DAY_START_HOUR) >= MIDNIGHT_HOUR
    weather.value = data.weather ?? 'sunny'
    if (data.tomorrowWeather != null) {
      tomorrowWeather.value = data.tomorrowWeather
    } else {
      const nextCalendar = getNextCalendarPoint(year.value, season.value, day.value)
      tomorrowWeather.value = rollWeather(nextCalendar.season, nextCalendar.day, nextCalendar.year)
    }
    currentLocation.value = data.currentLocation ?? 'farm'
    currentLocationGroup.value = data.currentLocationGroup ?? 'farm'
    farmMapType.value = data.farmMapType ?? 'standard'
    dailyLuck.value = data.dailyLuck ?? 0
    surfaceOrePatch.value = data.surfaceOrePatch ?? null
    creekCatch.value = data.creekCatch ?? []
    isGameStarted.value = true
  }

  return {
    year,
    season,
    day,
    hour,
    weather,
    tomorrowWeather,
    currentLocation,
    currentLocationGroup,
    isGameStarted,
    farmMapType,
    midnightWarned,
    dailyLuck,
    surfaceOrePatch,
    creekCatch,
    seasonIndex,
    seasonName,
    weatherName,
    isRainy,
    weekday,
    weekdayName,
    timeDisplay,
    timePeriod,
    isLateNight,
    isPastBedtime,
    nextDay,
    goTo,
    startNewGame,
    advanceTime,
    getTravelCost,
    travelTo,
    setTomorrowWeather,
    recalculateTomorrowWeather,
    serialize,
    deserialize
  }
})
