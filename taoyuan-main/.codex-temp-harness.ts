
import { createPinia, setActivePinia } from 'pinia'
import { useSaveStore } from '@/stores/useSaveStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useQuestStore } from '@/stores/useQuestStore'
import { useNpcStore } from '@/stores/useNpcStore'
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'

async function main() {
  setActivePinia(createPinia())
  const saveStore = useSaveStore()
  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const npcStore = useNpcStore()
  const hiddenNpcStore = useHiddenNpcStore()

  const ok = await saveStore.loadBuiltInSampleSave('late_economy_foundation')
  console.log(JSON.stringify({
    ok,
    currentThemeWeek: goalStore.currentThemeWeek?.id ?? null,
    currentEventCampaign: goalStore.currentEventCampaign?.id ?? null,
    currentLimitedTimeQuestCampaign: questStore.currentLimitedTimeQuestCampaign?.id ?? null,
    relationshipSnapshot: npcStore.getRelationshipDebugSnapshot(),
    spiritSnapshot: hiddenNpcStore.spiritBondAuditSnapshot
  }, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
