import { onBeforeUnmount, onMounted, ref } from 'vue'

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
}

export const getFullscreenTeleportTarget = (): HTMLElement | 'body' => {
  if (typeof document === 'undefined') return 'body'

  const fullscreenDocument = document as FullscreenDocument
  const activeFullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
  return activeFullscreenElement instanceof HTMLElement ? activeFullscreenElement : 'body'
}

export const useFullscreenTeleportTarget = () => {
  const teleportTarget = ref<HTMLElement | 'body'>('body')

  const syncTeleportTarget = () => {
    teleportTarget.value = getFullscreenTeleportTarget()
  }

  onMounted(() => {
    syncTeleportTarget()
    document.addEventListener('fullscreenchange', syncTeleportTarget)
    document.addEventListener('webkitfullscreenchange', syncTeleportTarget)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncTeleportTarget)
    document.removeEventListener('webkitfullscreenchange', syncTeleportTarget)
  })

  return {
    teleportTarget,
    syncTeleportTarget
  }
}
