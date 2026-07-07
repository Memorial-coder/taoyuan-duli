import type { Component } from 'vue'
import { getActivePinia } from 'pinia'
import router from '@/router'
import { useGameStore } from '@/stores/useGameStore'
import { isShopOpen, TAB_TO_LOCATION_GROUP } from '@/data/timeConstants'
import { addLog, showFloat } from './useGameLog'
import { sfxClick, useAudio } from './useAudio'
import { useGameClock } from './useGameClock'
import {
  Map,
  Wheat,
  Egg,
  Home,
  Heart,
  Building,
  Users,
  Wifi,
  Store,
  Calendar,
  TreePine,
  Fish,
  Pickaxe,
  Flame,
  Cog,
  Wrench,
  Package,
  Star,
  Sparkles,
  BookOpen,
  Wallet,
  ScrollText,
  Mail,
  User,
  BookMarked,
  FlaskConical,
  Landmark,
  Swords,
  ShieldCheck,
  Tent,
  Waves,
  Palette,
  Mountain,
  Target,
  MessageCircle
} from 'lucide-vue-next'

export type PanelKey =
  | 'farm'
  | 'shop'
  | 'inventory'
  | 'fishing'
  | 'mining'
  | 'village'
  | 'online'
  | 'social'
  | 'friend-station'
  | 'friend-chat'
  | 'manor'
  | 'festival'
  | 'society'
  | 'cooking'
  | 'forage'
  | 'upgrade'
  | 'skills'
  | 'potential'
  | 'workshop'
  | 'achievement'
  | 'glossary'
  | 'animal'
  | 'home'
  | 'wallet'
  | 'goals'
  | 'quest'
  | 'mail'
  | 'charinfo'
  | 'breeding'
  | 'museum'
  | 'guild'
  | 'hanhai'
  | 'region-map'
  | 'fishpond'
  | 'cottage'
  | 'decoration'
  | 'quarry'

type NpcNavigationRuntimeStore = {
  getSpouse?: () => unknown
}

type MiningNavigationRuntimeStore = {
  isExploring?: boolean
}

type HanhaiNavigationRuntimeStore = {
  hasActiveCasinoSession?: boolean
}

const getNavigationRuntimeStore = <T>(storeId: string): T | undefined =>
  getActivePinia()?._s.get(storeId) as T | undefined

const hasActiveSpouse = (): boolean =>
  !!getNavigationRuntimeStore<NpcNavigationRuntimeStore>('npc')?.getSpouse?.()

export const TABS: { key: PanelKey; label: string; icon: Component; getIcon?: () => Component }[] = [
  { key: 'farm', label: '农场', icon: Wheat },
  { key: 'animal', label: '牧场', icon: Egg },
  { key: 'cottage', label: '小屋', icon: Home, getIcon: () => (hasActiveSpouse() ? Heart : Home) },
  { key: 'home', label: '设施', icon: Building },
  { key: 'breeding', label: '育种', icon: FlaskConical },
  { key: 'fishpond', label: '鱼塘', icon: Waves },
  { key: 'decoration', label: '装饰', icon: Palette },
  { key: 'online', label: '联机', icon: Wifi },
  { key: 'social', label: '邻里', icon: Users },
  { key: 'friend-station', label: '好友', icon: Users },
  { key: 'friend-chat', label: '私聊', icon: MessageCircle },
  { key: 'manor', label: '庄园', icon: Home },
  { key: 'festival', label: '节会', icon: Calendar },
  { key: 'society', label: '村社', icon: ShieldCheck },
  { key: 'village', label: '桃源村', icon: Users },
  { key: 'shop', label: '商圈', icon: Store },
  { key: 'forage', label: '竹林', icon: TreePine },
  { key: 'fishing', label: '清溪', icon: Fish },
  { key: 'mining', label: '矿洞', icon: Pickaxe },
  { key: 'cooking', label: '灶台', icon: Flame },
  { key: 'workshop', label: '工坊', icon: Cog },
  { key: 'upgrade', label: '铁匠铺', icon: Wrench },
  { key: 'charinfo', label: '角色', icon: User },
  { key: 'inventory', label: '背包', icon: Package },
  { key: 'skills', label: '技能', icon: Star },
  { key: 'potential', label: '潜能', icon: Sparkles },
  { key: 'achievement', label: '图鉴', icon: BookOpen },
  { key: 'glossary', label: '百科', icon: BookMarked },
  { key: 'wallet', label: '钱包', icon: Wallet },
  { key: 'goals', label: '目标', icon: Target },
  { key: 'quest', label: '告示板', icon: ScrollText },
  { key: 'mail', label: '邮箱', icon: Mail },
  { key: 'museum', label: '博物馆', icon: Landmark },
  { key: 'guild', label: '公会', icon: Swords },
  { key: 'hanhai', label: '瀚海', icon: Tent },
  { key: 'region-map', label: '行旅图', icon: Map }
,
  { key: 'quarry', label: '采石场', icon: Mountain }
]

type NavigationClockSync = Pick<ReturnType<typeof useGameClock>, 'pauseClock' | 'resumeClock'>

const PAUSED_ROUTE_NAMES = new Set([
  'online',
  'online-manor',
  'online-cohabitation',
  'online-neighbor',
  'online-orders',
  'online-festival',
  'online-society',
  'expedition',
  'expedition-room'
])

const ROUTE_PANEL_ALIASES: Record<string, PanelKey> = {
  'village-projects': 'village',
  npc: 'village',
  processing: 'workshop'
}

export const isNavigationClockPausedRoute = (routeName: unknown): boolean => {
  const normalizedRouteName = typeof routeName === 'string' ? routeName : ''
  if (!normalizedRouteName) return true
  if (PAUSED_ROUTE_NAMES.has(normalizedRouteName)) return true

  const panelKey = ROUTE_PANEL_ALIASES[normalizedRouteName] ?? normalizedRouteName
  const targetGroup = TAB_TO_LOCATION_GROUP[panelKey]
  return targetGroup === null || targetGroup === undefined
}

export const syncNavigationClockPauseForRoute = (routeName: unknown, clock: NavigationClockSync = useGameClock()) => {
  if (isNavigationClockPausedRoute(routeName)) {
    clock.pauseClock('navigation')
    return
  }

  clock.resumeClock('navigation')
}

const runEndDayWithClockPause = async () => {
  const { pauseClock, resumeClock } = useGameClock()
  pauseClock('endday')
  try {
    const { handleEndDay } = await import('./useEndDay')
    handleEndDay()
  } finally {
    resumeClock('endday')
  }
}

const processHiddenNpcDiscoverySoon = () => {
  void import('./useHiddenNpcDiscovery')
    .then(({ processHiddenNpcDiscovery }) => processHiddenNpcDiscovery())
    .catch(() => {})
}

const markPanelVisitedSoon = (panelKey: PanelKey) => {
  void import('@/stores/useTutorialStore')
    .then(({ useTutorialStore }) => useTutorialStore().markPanelVisited(panelKey))
    .catch(() => {})
}

export const navigateToPanel = (panelKey: PanelKey) => {
  const gameStore = useGameStore()
  const { startBgm } = useAudio()
  const currentRouteName = router.currentRoute.value.name
  const miningStore = getNavigationRuntimeStore<MiningNavigationRuntimeStore>('mining')
  const hanhaiStore = getNavigationRuntimeStore<HanhaiNavigationRuntimeStore>('hanhai')

  if (currentRouteName === 'mining' && panelKey !== 'mining' && miningStore?.isExploring) {
    showFloat('请先离开矿洞后再切换页面。', 'danger')
    return false
  }

  if (currentRouteName === 'hanhai' && panelKey !== 'hanhai' && hanhaiStore?.hasActiveCasinoSession) {
    showFloat('当前有进行中的瀚海牌局，请先完成当前牌局。', 'danger')
    return false
  }

  if (gameStore.isPastBedtime) {
    addLog('已经凌晨 2 点了，你必须休息。')
    void runEndDayWithClockPause().catch(() => {})
    return false
  }

  const arrivalHour = gameStore.hour + gameStore.getTravelCost(panelKey)
  const shopCheck = isShopOpen(panelKey, gameStore.day, arrivalHour)
  if (!shopCheck.open) {
    showFloat(shopCheck.reason!, 'danger')
    return false
  }

  const travelResult = gameStore.travelTo(panelKey)
  if (!travelResult.ok) {
    if (travelResult.message) showFloat(travelResult.message, 'danger')
    return false
  }
  if (travelResult.timeCost > 0) {
    addLog(travelResult.message)
  }
  if (travelResult.passedOut) {
    void runEndDayWithClockPause().catch(() => {})
    return false
  }

  sfxClick()
  startBgm()
  void router.push({ name: panelKey }).then(() => {
    markPanelVisitedSoon(panelKey)
    processHiddenNpcDiscoverySoon()
  })

  syncNavigationClockPauseForRoute(panelKey)

  return true
}

export const useNavigation = () => {
  return {
    TABS,
    navigateToPanel
  }
}
