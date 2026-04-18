<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="game-panel w-full max-w-md text-center relative max-h-[80vh] flex flex-col">
      <button class="absolute top-2 right-2 text-muted hover:text-text" @click="$emit('close')">
        <X :size="14" />
      </button>
      <Divider title class="my-4" :label="props.saveIntent === 'save-return' ? '保存并返回' : props.saveIntent === 'save' ? '保存进度' : '存档管理'" />
      <div class="flex items-center justify-center space-x-2 mb-3">
        <Button class="py-1 px-3 text-xs" :class="saveStore.storageMode === 'local' ? '!bg-accent !text-bg' : ''" @click="switchMode('local')">
          本地存储
        </Button>
        <Button class="py-1 px-3 text-xs" :class="saveStore.storageMode === 'server' ? '!bg-accent !text-bg' : ''" @click="switchMode('server')">
          服务端持久化
        </Button>
      </div>
      <div class="mb-3 space-y-2 text-left">
        <p v-if="props.saveIntent === 'save' || props.saveIntent === 'save-return'" class="text-[11px] text-muted leading-5 text-center">
          请选择存储方式后再保存。不同方式各有优点，你可以按自己的使用习惯选择。
        </p>
        <div class="grid grid-cols-1 gap-2 text-[10px] text-muted">
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-2">
            <p class="text-text mb-1">本地存储</p>
            <p>优点：保存速度快、无需联网、离线也能用，适合单设备游玩。</p>
          </div>
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-2">
            <p class="text-text mb-1">服务端持久化</p>
            <p>优点：存档绑定当前账号，换设备也更容易继续，浏览器清缓存时更稳妥。</p>
          </div>
        </div>
      </div>
      <div
        v-if="saveStore.storageMode === 'server' && saveStore.pendingServerSlots.length > 0"
        class="mb-3 rounded-xs border border-warning/30 bg-warning/10 px-3 py-2 text-left text-[10px] text-warning"
      >
        当前账号有 {{ saveStore.pendingServerSlots.length }} 个待同步服务端存档，服务恢复后会自动补传。
      </div>
      <div class="mb-3">
        <Button
          class="text-center justify-center text-sm w-full"
          :icon="Save"
          :icon-size="12"
          :disabled="savingCurrent || saveStore.activeSlot < 0"
          @click="handleSaveCurrent"
        >
          {{ savingCurrent ? '保存中...' : saveStore.activeSlot >= 0 ? `保存当前进度到存档 ${saveStore.activeSlot + 1}` : '当前没有可保存的活跃存档' }}
        </Button>
      </div>
      <div class="flex-1 flex flex-col space-y-2 mb-3" @click="menuOpen = null">
        <div v-for="info in slots" :key="info.slot">
          <div v-if="info.exists" class="flex space-x-1 w-full">
            <button v-if="props.allowLoad" class="btn flex-1 !justify-between text-xs" @click="$emit('load', info.slot)">
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
                <span v-if="info.pendingSync" class="rounded-xs border border-warning/40 px-1 text-[10px] text-warning">待同步</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </button>
            <div v-else class="btn flex-1 !justify-between text-xs cursor-default">
              <span class="inline-flex items-center space-x-1">
                <FolderOpen :size="12" />
                <span>存档 {{ info.slot + 1 }}</span>
                <span v-if="info.pendingSync" class="rounded-xs border border-warning/40 px-1 text-[10px] text-warning">待同步</span>
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </div>
            <div class="relative">
              <Button
                class="px-2 h-full"
                :icon="Settings"
                :icon-size="12"
                @click.stop="menuOpen = menuOpen === info.slot ? null : info.slot"
              />
              <div
                v-if="menuOpen === info.slot"
                class="absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30"
              >
                <Button
                  v-if="webdavReady && saveStore.storageMode === 'local'"
                  :icon="CloudUpload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="uploading"
                  @click="handleUpload(info.slot)"
                >
                  {{ uploading ? '上传中...' : '上传云端' }}
                </Button>
                <Button
                  v-if="webdavReady && saveStore.storageMode === 'local'"
                  :icon="CloudDownload"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  :disabled="downloading"
                  @click="handleDownload(info.slot)"
                >
                  {{ downloading ? '下载中...' : '云端下载' }}
                </Button>
                <Button
                  v-if="!Capacitor.isNativePlatform()"
                  :icon="Download"
                  :icon-size="12"
                  class="text-center !rounded-none justify-center text-sm"
                  @click="handleExport(info.slot)"
                >
                  导出存档
                </Button>
                <Button
                  :icon="Trash2"
                  :icon-size="12"
                  class="btn-danger !rounded-none text-center justify-center text-sm"
                  @click="handleDelete(info.slot)"
                >
                  删除存档
                </Button>
              </div>
            </div>
          </div>
          <div v-else class="flex space-x-1 w-full">
            <div class="text-xs text-muted border border-accent/10 rounded-xs px-3 py-2 flex-1">存档 {{ info.slot + 1 }} — 空</div>
            <Button
              v-if="webdavReady && saveStore.storageMode === 'local'"
              :icon="CloudDownload"
              :icon-size="12"
              class="px-2"
              :disabled="downloading"
              @click="handleDownload(info.slot)"
            >
              <span class="text-xs">{{ downloading ? '下载中...' : '云端' }}</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- 导入存档 -->
      <template v-if="!Capacitor.isNativePlatform()">
        <Button :icon="Upload" class="text-center justify-center text-sm w-full" @click="triggerImport">导入存档</Button>
        <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />
      </template>

      <!-- 删除存档确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="deleteTargetSlot !== null"
          class="fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
          @click.self="deleteTargetSlot = null"
        >
          <div class="game-panel w-full max-w-xs mx-4 text-center">
            <p class="text-danger text-sm mb-3">确定删除存档 {{ deleteTargetSlot + 1 }}？</p>
            <p class="text-xs text-muted mb-4">此操作不可恢复。</p>
            <div class="flex space-x-3 justify-center">
              <Button @click="deleteTargetSlot = null">取消</Button>
              <Button class="btn-danger" @click="confirmDelete">确认删除</Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { X, FolderOpen, Settings, Download, Trash2, Upload, CloudUpload, CloudDownload, Save } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import { SEASON_NAMES } from '@/stores/useGameStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { useWebdav } from '@/composables/useWebdav'
  import { Capacitor } from '@capacitor/core'

  const props = withDefaults(defineProps<{ allowLoad?: boolean; saveIntent?: 'manage' | 'save' | 'save-return'; returnUrl?: string }>(), {
    allowLoad: false,
    saveIntent: 'manage',
    returnUrl: '/'
  })
  const emit = defineEmits<{ close: []; load: [slot: number]; change: []; saved: [intent: 'save' | 'save-return'] }>()

  const saveStore = useSaveStore()
  const { webdavReady, uploadSave, downloadSave } = useWebdav()

  const slots = ref<Awaited<ReturnType<typeof saveStore.getSlots>>>([])
  const menuOpen = ref<number | null>(null)
  const uploading = ref(false)
  const downloading = ref(false)
  const savingCurrent = ref(false)

  const refreshSlots = async () => {
    slots.value = await saveStore.getSlots()
  }

  const switchMode = async (mode: 'local' | 'server') => {
    saveStore.setStorageMode(mode)
    await refreshSlots()
  }

  const handleSaveCurrent = async () => {
    if (saveStore.activeSlot < 0) {
      showFloat('当前还没有活跃存档槽位。', 'danger')
      return
    }
    savingCurrent.value = true
    const ok = await saveStore.saveToSlot(saveStore.activeSlot)
    savingCurrent.value = false
    if (ok) {
      await refreshSlots()
      emit('change')
      const queued = saveStore.lastSaveResultStatus === 'queued'
      const savedMessage = saveStore.lastServerSyncMessage || `已保存到存档 ${saveStore.activeSlot + 1}。`
      if (props.saveIntent === 'save-return') {
        showFloat(
          queued ? '已本地保底，服务恢复后会自动同步，正在返回。' : `已保存到存档 ${saveStore.activeSlot + 1}，正在返回。`,
          queued ? 'accent' : 'success'
        )
        window.location.href = props.returnUrl || '/'
        return
      }
      showFloat(savedMessage, queued ? 'accent' : 'success')
      if (props.saveIntent === 'save') {
        emit('saved', 'save')
        emit('close')
      }
    } else {
      showFloat(saveStore.lastSaveErrorMessage || '保存失败。', 'danger')
    }
  }

  const handleExport = async (slot: number) => {
    if (!(await saveStore.exportSave(slot))) {
      showFloat('导出失败。', 'danger')
    }
  }

  const deleteTargetSlot = ref<number | null>(null)

  const handleDelete = (slot: number) => {
    deleteTargetSlot.value = slot
  }

  const confirmDelete = async () => {
    if (deleteTargetSlot.value !== null) {
      const ok = await saveStore.deleteSlot(deleteTargetSlot.value)
      if (ok) {
        await refreshSlots()
        emit('change')
      }
      deleteTargetSlot.value = null
      menuOpen.value = null
    }
  }

  const fileInputRef = ref<HTMLInputElement | null>(null)

  const triggerImport = () => {
    fileInputRef.value?.click()
  }

  const handleImportFile = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        showFloat('存档槽位已满，请先删除一个旧存档。')
      } else {
        void (async () => {
          if (await saveStore.importSave(emptySlot.slot, content)) {
            await refreshSlots()
            emit('change')
            showFloat(`已导入到存档 ${emptySlot.slot + 1}。`, 'success')
          } else {
            showFloat('存档文件无效或已损坏。', 'danger')
          }
        })()
      }
      input.value = ''
    }
    reader.readAsText(file)
  }

  const handleUpload = async (slot: number) => {
    uploading.value = true
    const result = await uploadSave(slot)
    uploading.value = false
    showFloat(result.message, result.success ? 'success' : 'danger')
    menuOpen.value = null
  }

  const handleDownload = async (slot: number) => {
    downloading.value = true
    const result = await downloadSave(slot)
    downloading.value = false
    if (result.success) {
      await refreshSlots()
      emit('change')
    }
    showFloat(result.message, result.success ? 'success' : 'danger')
    menuOpen.value = null
  }

  onMounted(() => {
    void saveStore.syncPendingServerSaves().finally(() => {
      void refreshSlots()
    })
  })

  watch(
    () => saveStore.storageMode,
    () => {
      void refreshSlots()
    }
  )
</script>
