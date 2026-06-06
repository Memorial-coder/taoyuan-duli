import { createPinia, type Pinia } from 'pinia'
import { useAchievementStore } from '@/stores/useAchievementStore'
import { useAnimalStore } from '@/stores/useAnimalStore'
import { useBreedingStore } from '@/stores/useBreedingStore'
import { useCookingStore } from '@/stores/useCookingStore'
import { useDecorationStore } from '@/stores/useDecorationStore'
import { useFarmStore } from '@/stores/useFarmStore'
import { useFishPondStore } from '@/stores/useFishPondStore'
import { useFishingStore } from '@/stores/useFishingStore'
import { useGameStore } from '@/stores/useGameStore'
import { useGuildStore } from '@/stores/useGuildStore'
import { useHanhaiStore } from '@/stores/useHanhaiStore'
import { useHomeStore } from '@/stores/useHomeStore'
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { useMiningStore } from '@/stores/useMiningStore'
import { useMuseumStore } from '@/stores/useMuseumStore'
import { useNpcStore } from '@/stores/useNpcStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useProcessingStore } from '@/stores/useProcessingStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useRegionMapStore } from '@/stores/useRegionMapStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useSecretNoteStore } from '@/stores/useSecretNoteStore'
import { useShopStore } from '@/stores/useShopStore'
import { useSkillStore } from '@/stores/useSkillStore'
import { useFrontierChronicleStore } from '@/stores/useFrontierChronicleStore'
import { usePlayerRecordCenterStore } from '@/stores/usePlayerRecordCenterStore'
import { useTutorialStore } from '@/stores/useTutorialStore'
import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
import { useWalletStore } from '@/stores/useWalletStore'
import { useWarehouseStore } from '@/stores/useWarehouseStore'

/**
 * 重置所有游戏相关 store 到初始状态（开新游戏时调用）。
 * 不重置: useSettingsStore（跨存档设置）、useSaveStore（存档管理）。
 */
type ResettableGameStore = {
  reset?: () => void
  deserialize?: unknown
  serialize?: unknown
  $reset?: () => void
}

type ResettableGameStoreFactory = (pinia?: Pinia | null) => ResettableGameStore

const resetGameStore = (storeName: string, store: ResettableGameStore, useStore: ResettableGameStoreFactory) => {
  try {
    if (typeof store.reset === 'function') {
      store.reset()
      return
    }

    if (typeof store.deserialize === 'function') {
      const freshStore = useStore(createPinia())
      const deserialize = store.deserialize as (data: unknown) => void
      if (typeof freshStore.serialize === 'function') {
        const serialize = freshStore.serialize as () => unknown
        deserialize(serialize())
      } else {
        deserialize({})
      }
      return
    }

    if (typeof store.$reset === 'function') {
      store.$reset()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${storeName} 重置失败：${message}`)
  }
}

export const resetAllStoresForNewGame = () => {
  resetGameStore('game', useGameStore(), useGameStore)
  resetGameStore('player', usePlayerStore(), usePlayerStore)
  resetGameStore('inventory', useInventoryStore(), useInventoryStore)
  resetGameStore('farm', useFarmStore(), useFarmStore)
  resetGameStore('skill', useSkillStore(), useSkillStore)
  resetGameStore('npc', useNpcStore(), useNpcStore)
  resetGameStore('mining', useMiningStore(), useMiningStore)
  resetGameStore('cooking', useCookingStore(), useCookingStore)
  resetGameStore('processing', useProcessingStore(), useProcessingStore)
  resetGameStore('achievement', useAchievementStore(), useAchievementStore)
  resetGameStore('animal', useAnimalStore(), useAnimalStore)
  resetGameStore('home', useHomeStore(), useHomeStore)
  resetGameStore('fishing', useFishingStore(), useFishingStore)
  resetGameStore('wallet', useWalletStore(), useWalletStore)
  resetGameStore('goal', useGoalStore(), useGoalStore)
  resetGameStore('quest', useQuestStore(), useQuestStore)
  resetGameStore('shop', useShopStore(), useShopStore)
  resetGameStore('warehouse', useWarehouseStore(), useWarehouseStore)
  resetGameStore('breeding', useBreedingStore(), useBreedingStore)
  resetGameStore('museum', useMuseumStore(), useMuseumStore)
  resetGameStore('guild', useGuildStore(), useGuildStore)
  resetGameStore('secretNote', useSecretNoteStore(), useSecretNoteStore)
  resetGameStore('hanhai', useHanhaiStore(), useHanhaiStore)
  resetGameStore('fishPond', useFishPondStore(), useFishPondStore)
  resetGameStore('tutorial', useTutorialStore(), useTutorialStore)
  resetGameStore('hiddenNpc', useHiddenNpcStore(), useHiddenNpcStore)
  resetGameStore('decoration', useDecorationStore(), useDecorationStore)
  resetGameStore('villageProject', useVillageProjectStore(), useVillageProjectStore)
  resetGameStore('regionMap', useRegionMapStore(), useRegionMapStore)
  resetGameStore('frontierChronicle', useFrontierChronicleStore(), useFrontierChronicleStore)
  resetGameStore('playerRecordCenter', usePlayerRecordCenterStore(), usePlayerRecordCenterStore)
}
