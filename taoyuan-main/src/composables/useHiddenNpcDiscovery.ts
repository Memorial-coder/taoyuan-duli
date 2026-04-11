import { showDiscoveryScene } from './useDialogs'
import { addLog } from './useGameLog'
import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'

/** 在地点/时间推进后立即检查隐藏 NPC 发现条件 */
export const processHiddenNpcDiscovery = () => {
  const hiddenNpcStore = useHiddenNpcStore()
  const discoveryTriggered = hiddenNpcStore.checkDiscoveryConditions()
  for (const { npcId, step } of discoveryTriggered) {
    if (step.logMessage) addLog(step.logMessage)
    if (step.scenes.length > 0) showDiscoveryScene(npcId, step)
  }
}
