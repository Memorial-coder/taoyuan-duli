import type { Component } from 'vue'
import router from '@/router'
import { useGameStore } from '@/stores/useGameStore'
import { isShopOpen, TAB_TO_LOCATION_GROUP } from '@/data/timeConstants'
import { addLog, showFloat } from './useGameLog'
import { handleEndDay } from './useEndDay'
import { sfxClick, useAudio } from './useAudio'
import { useGameClock } from './useGameClock'
import { processHiddenNpcDiscovery } from './useHiddenNpcDiscovery'
import { useTutorialStore } from '@/stores/useTutorialStore'
import {
  Wheat,
  Egg,
  Home,
  Heart,
  Building,
  Users,
  Store,
  TreePine,
  Fish,
  Pickaxe,
  Flame,
  Cog,
  Wrench,
  Package,
  Star,
  BookOpen,
  Wallet,
  ScrollText,
  Mail,
  User,
  BookMarked,
  FlaskConical,
  Landmark,
  Swords,
  Tent,
  Waves,
  Palette
} from 'lucide-vue-next'
import { useNpcStore } from '@/stores/useNpcStore'

export type PanelKey =
  | 'farm'
  | 'shop'
  | 'inventory'
  | 'fishing'
  | 'mining'
  | 'village'
  | 'cooking'
  | 'forage'
  | 'upgrade'
  | 'skills'
  | 'workshop'
  | 'achievement'
  | 'glossary'
  | 'animal'
  | 'home'
  | 'wallet'
  | 'quest'
  | 'mail'
  | 'charinfo'
  | 'breeding'
  | 'museum'
  | 'guild'
  | 'hanhai'
  | 'fishpond'
  | 'cottage'
  | 'decoration'

export const TABS: { key: PanelKey; label: string; icon: Component; getIcon?: () => Component }[] = [
  { key: 'farm', label: '农场', icon: Wheat },
  { key: 'animal', label: '牧场', icon: Egg },
  { key: 'cottage', label: '小屋', icon: Home, getIcon: () => (useNpcStore().getSpouse() ? Heart : Home) },
  { key: 'home', label: '设施', icon: Building },
  { key: 'breeding', label: '育种', icon: FlaskConical },
  { key: 'fishpond', label: '鱼塘', icon: Waves },
  { key: 'decoration', label: '装饰', icon: Palette },
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
  { key: 'achievement', label: '图鉴', icon: BookOpen },
  { key: 'glossary', label: '百科', icon: BookMarked },
  { key: 'wallet', label: '钱包', icon: Wallet },
  { key: 'quest', label: '告示板', icon: ScrollText },
  { key: 'mail', label: '邮箱', icon: Mail },
  { key: 'museum', label: '博物馆', icon: Landmark },
  { key: 'guild', label: '公会', icon: Swords },
  { key: 'hanhai', label: '瀚海', icon: Tent }
]

export const navigateToPanel = (panelKey: PanelKey) => {
  const gameStore = useGameStore()
  const { startBgm } = useAudio()

  if (gameStore.isPastBedtime) {
    addLog('已经凌晨 2 点了，你必须休息。')
    const { pauseClock: pauseForEnd, resumeClock: resumeAfterEnd } = useGameClock()
    pauseForEnd('endday')
    try {
      handleEndDay()
    } finally {
      resumeAfterEnd('endday')
    }
    return
  }

  const arrivalHour = gameStore.hour + gameStore.getTravelCost(panelKey)
  const shopCheck = isShopOpen(panelKey, gameStore.day, arrivalHour)
  if (!shopCheck.open) {
    showFloat(shopCheck.reason!, 'danger')
    return
  }

  const travelResult = gameStore.travelTo(panelKey)
  if (!travelResult.ok) {
    if (travelResult.message) showFloat(travelResult.message, 'danger')
    return
  }
  if (travelResult.timeCost > 0) {
    addLog(travelResult.message)
  }
  if (travelResult.passedOut) {
    handleEndDay()
    return
  }

  sfxClick()
  startBgm()
  void router.push({ name: panelKey }).then(() => {
    useTutorialStore().markPanelVisited(panelKey)
    processHiddenNpcDiscovery()
  })

  const { pauseClock, resumeClock } = useGameClock()
  const targetGroup = TAB_TO_LOCATION_GROUP[panelKey]
  if (targetGroup === null || targetGroup === undefined) {
    pauseClock('navigation')
  } else {
    resumeClock('navigation')
  }
}

export const useNavigation = () => {
  return {
    TABS,
    navigateToPanel
  }
}
