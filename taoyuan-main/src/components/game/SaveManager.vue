<template>
  <div class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="handleCloseRequest">
    <div class="game-panel save-manager-panel w-full max-w-md min-w-0 text-center relative max-h-[80vh] flex flex-col">
      <button class="absolute top-2 right-2 text-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-40" :disabled="savingCurrent" @click="handleCloseRequest">
        <X :size="14" />
      </button>
      <Divider title class="my-4" :label="saveIntentTitle" />
      <div class="save-manager-storage-toggle mb-3 grid gap-2">
        <Button class="save-manager-storage-button min-w-0 justify-center py-1 px-2 text-xs leading-5" :class="saveStore.storageMode === 'local' ? '!bg-accent !text-bg' : ''" :disabled="savingCurrent" @click="switchMode('local')">
          本地存储
        </Button>
        <Button class="save-manager-storage-button min-w-0 justify-center py-1 px-2 text-xs leading-5" :class="saveStore.storageMode === 'server' ? '!bg-accent !text-bg' : ''" :disabled="savingCurrent" @click="switchMode('server')">
          服务端持久化
        </Button>
      </div>
      <div class="mb-3 space-y-2 text-left">
        <p v-if="isSaveIntentAction" class="break-words text-[0.6875rem] text-muted leading-5 text-center">
          {{ saveIntentHelp }}
        </p>
        <div class="grid grid-cols-1 gap-2 text-[0.625rem] text-muted">
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
        v-if="saveStore.storageMode === 'server' && saveStore.pendingServerSlots.length > 0 && !serverSaveConflict"
        class="mb-3 rounded-xs border border-warning/30 bg-warning/10 px-3 py-2 text-left text-[0.625rem] text-warning"
      >
        当前账号有 {{ saveStore.pendingServerSlots.length }} 个待同步服务端存档，服务恢复后会自动补传。
      </div>
      <div
        v-if="saveStore.storageMode === 'server' && serverSaveConflict"
        class="mb-3 rounded-xs border border-warning/35 bg-warning/10 px-3 py-2 text-left text-[0.625rem] leading-5 text-warning"
        data-testid="server-save-conflict-panel"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs text-warning">云存档冲突</p>
          <span class="shrink-0 rounded-xs border border-warning/30 px-1.5 py-0.5">存档 {{ serverSaveConflict.slot + 1 }}</span>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
            <p class="text-text">当前页面</p>
            <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.localSummary) }}</p>
          </div>
          <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
            <p class="text-text">服务端</p>
            <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.remoteSummary) }}</p>
          </div>
        </div>
        <div class="mt-2 flex flex-col gap-1 sm:flex-row">
          <Button
            class="flex-1 justify-center text-xs"
            :icon="Save"
            :icon-size="12"
            :disabled="resolvingConflict"
            @click="handleResolveServerConflict('local')"
          >
            保存当前进度
          </Button>
          <Button
            class="flex-1 justify-center text-xs"
            :icon="CloudDownload"
            :icon-size="12"
            :disabled="resolvingConflict"
            @click="handleResolveServerConflict('remote')"
          >
            改用服务端存档
          </Button>
        </div>
      </div>
      <div class="mb-3 rounded-xs border border-accent/15 bg-accent/5 px-3 py-2 text-left text-[0.625rem] leading-5 break-words">
        <p class="text-accent">联机存档身份</p>
        <p class="mt-1 text-muted">{{ saveIdentityHint }}</p>
      </div>
      <div
        v-if="slotReadBlocked"
        class="mb-3 rounded-xs border border-danger/30 bg-danger/10 px-3 py-2 text-left text-[0.625rem] leading-5 text-danger"
      >
        服务端槽位暂时不可读取，当前无法确认云端是否已有真实存档。为避免误覆盖，这些槽位不会再显示成“空槽位”。
      </div>
      <div
        v-if="serverSaveFieldAnomaly"
        class="mb-3 rounded-xs border border-danger/30 bg-danger/10 px-3 py-2 text-left text-[0.625rem] leading-5 text-danger"
      >
        云存档字段异常，服务端已保留远端旧档。你可以在弹窗中确认修复字段后强制保存当前进度。
      </div>
      <div class="mb-3">
        <Button
          class="save-manager-primary-action min-w-0 text-center justify-center text-sm w-full leading-5"
          :class="{ 'save-manager-primary-action--busy': savingCurrent }"
          :icon="savingCurrent ? LoaderCircle : Save"
          :icon-size="12"
          :disabled="savingCurrent || saveStore.activeSlot < 0"
          @click="handleSaveCurrent"
        >
          {{ savingCurrent ? '保存中...' : saveStore.activeSlot >= 0 ? `保存当前进度到存档 ${saveStore.activeSlot + 1}` : '当前没有可保存的活跃存档' }}
        </Button>
        <Transition name="panel-fade">
          <div
            v-if="savingCurrent"
            class="mt-2 flex items-start gap-2 rounded-xs border border-accent/25 bg-accent/10 px-3 py-2 text-left text-[0.625rem] leading-5"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle class="save-manager-loading-spin mt-0.5 shrink-0 text-accent" :size="14" />
            <div class="min-w-0">
              <p class="text-text">正在保存当前进度</p>
              <p class="mt-0.5 text-muted">{{ saveLoadingDescription }}</p>
            </div>
          </div>
        </Transition>
      </div>
      <div class="flex-1 flex min-h-0 min-w-0 flex-col space-y-2 mb-3" @click="menuOpen = null">
        <div v-for="info in slots" :key="info.slot">
          <div v-if="info.exists" class="save-manager-slot-row flex w-full min-w-0 gap-1">
            <button v-if="props.allowLoad" class="btn save-manager-slot-button min-w-0 flex-1 text-xs" :disabled="savingCurrent" @click="$emit('load', info.slot)">
              <span class="save-manager-slot-label inline-flex min-w-0 items-center space-x-1">
                <FolderOpen class="shrink-0" :size="12" />
                <span class="shrink-0">存档 {{ info.slot + 1 }}</span>
                <span v-if="info.pendingSync" class="shrink-0 rounded-xs border border-warning/40 px-1 text-[0.625rem] text-warning">待同步</span>
              </span>
              <span class="save-manager-slot-meta text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </button>
            <div v-else class="btn save-manager-slot-button min-w-0 flex-1 text-xs cursor-default">
              <span class="save-manager-slot-label inline-flex min-w-0 items-center space-x-1">
                <FolderOpen class="shrink-0" :size="12" />
                <span class="shrink-0">存档 {{ info.slot + 1 }}</span>
                <span v-if="info.pendingSync" class="shrink-0 rounded-xs border border-warning/40 px-1 text-[0.625rem] text-warning">待同步</span>
              </span>
              <span class="save-manager-slot-meta text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </div>
            <div class="relative shrink-0">
              <Button
                class="h-full min-w-10 shrink-0 px-2"
                :icon="Settings"
                :icon-size="12"
                :disabled="savingCurrent"
                @click.stop="menuOpen = menuOpen === info.slot ? null : info.slot"
              />
              <Transition name="menu-pop">
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
              </Transition>
            </div>
          </div>
          <div v-else-if="info.readBlocked" class="flex w-full min-w-0 gap-1">
            <div class="min-w-0 flex-1 rounded-xs border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger break-words">
              存档 {{ info.slot + 1 }} — 状态未知，等待服务端恢复后再确认。
            </div>
          </div>
          <div v-else class="flex w-full min-w-0 gap-1">
            <div class="min-w-0 flex-1 truncate rounded-xs border border-accent/10 px-3 py-2 text-xs text-muted">存档 {{ info.slot + 1 }} — 空</div>
            <Button
              v-if="webdavReady && saveStore.storageMode === 'local'"
              :icon="CloudDownload"
              :icon-size="12"
              class="shrink-0 px-2"
              :disabled="downloading"
              @click="handleDownload(info.slot)"
            >
              <span class="text-xs">{{ downloading ? '下载中...' : '云端' }}</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- 导入存档 -->
      <template>
        <Button :icon="Upload" class="text-center justify-center text-sm w-full" :disabled="savingCurrent" @click="triggerImport">导入存档</Button>
        <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />
      </template>

      <!-- 删除存档确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="deleteTargetSlot !== null"
          class="game-modal-overlay fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
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
      <Transition name="panel-fade">
        <div
          v-if="serverSaveFieldAnomaly"
          class="game-modal-overlay fixed inset-0 z-60 flex items-center justify-center bg-bg/80 p-4"
          @click.self="saveStore.dismissServerSaveFieldAnomaly"
        >
          <div class="game-panel w-full max-w-sm text-left">
            <div class="mb-3 flex items-start gap-2">
              <AlertTriangle :size="16" class="mt-0.5 shrink-0 text-danger" />
              <div>
                <p class="text-sm text-danger">修复异常字段后强制保存？</p>
                <p class="mt-1 text-[0.6875rem] leading-5 text-muted">
                  服务端检测到当前页面存档有越界或非法字段。确认后会先把这些字段修到合法范围，再覆盖服务端存档 {{ serverSaveFieldAnomaly.slot + 1 }}。
                </p>
              </div>
            </div>
            <div class="mb-3 rounded-xs border border-danger/20 bg-bg/25 px-3 py-2 text-[0.625rem] leading-5">
              <p class="text-text">{{ formatConflictSummary(serverSaveFieldAnomaly.summary) }}</p>
              <p class="mt-1 text-muted">异常 {{ serverSaveFieldAnomaly.details.anomaly_count }} 项，远端旧档会在确认后被覆盖。</p>
            </div>
            <div v-if="visibleFieldAnomalies.length > 0" class="mb-4 space-y-1 text-[0.625rem] leading-5 text-muted">
              <p v-for="(entry, index) in visibleFieldAnomalies" :key="entry.id || entry.field_path || index">
                {{ formatSaveFieldAnomaly(entry) }}
              </p>
              <p v-if="hiddenFieldAnomalyCount > 0">还有 {{ hiddenFieldAnomalyCount }} 项未展开。</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button :disabled="repairingFieldAnomaly" @click="saveStore.dismissServerSaveFieldAnomaly">暂不处理</Button>
              <Button
                class="btn-danger justify-center"
                :icon="Save"
                :icon-size="12"
                :disabled="repairingFieldAnomaly"
                @click="handleRepairServerFieldAnomaly"
              >
                {{ repairingFieldAnomaly ? '修复保存中...' : '修复并强制保存' }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { X, FolderOpen, Settings, Download, Trash2, Upload, CloudUpload, CloudDownload, Save, AlertTriangle, LoaderCircle } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import { SEASON_NAMES } from '@/stores/useGameStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { useWebdav } from '@/composables/useWebdav'

  type SaveIntent = 'manage' | 'save' | 'save-return' | 'save-refresh'

  const props = withDefaults(defineProps<{ allowLoad?: boolean; saveIntent?: SaveIntent; returnUrl?: string }>(), {
    allowLoad: false,
    saveIntent: 'manage',
    returnUrl: '/'
  })
  const emit = defineEmits<{ close: []; load: [slot: number]; change: []; saved: [intent: Exclude<SaveIntent, 'manage'>] }>()

  const saveStore = useSaveStore()
  const { webdavReady, uploadSave, downloadSave } = useWebdav()

  const slots = ref<Awaited<ReturnType<typeof saveStore.getSlots>>>([])
  const menuOpen = ref<number | null>(null)
  const uploading = ref(false)
  const downloading = ref(false)
  const savingCurrent = ref(false)
  const saveSlowHint = ref('')
  const resolvingConflict = ref(false)
  const repairingFieldAnomaly = ref(false)
  let saveSlowHintTimer: ReturnType<typeof window.setTimeout> | null = null
  let saveVerySlowHintTimer: ReturnType<typeof window.setTimeout> | null = null
  const slotReadBlocked = computed(() => slots.value.some(slot => slot.readBlocked))
  const serverSaveConflict = computed(() => saveStore.serverSaveConflict)
  const serverSaveFieldAnomaly = computed(() => saveStore.serverSaveFieldAnomaly)
  const saveLoadingDescription = computed(() => {
    if (saveSlowHint.value) return saveSlowHint.value
    return saveStore.storageMode === 'server'
      ? '正在写入服务端存档，请不要关闭页面。'
      : '正在写入本地存档，请稍等。'
  })
  const isSaveIntentAction = computed(() => props.saveIntent === 'save' || props.saveIntent === 'save-return' || props.saveIntent === 'save-refresh')
  const saveIntentTitle = computed(() => {
    if (props.saveIntent === 'save-refresh') return '保存并更新'
    if (props.saveIntent === 'save-return') return '保存并返回'
    if (props.saveIntent === 'save') return '保存进度'
    return '存档管理'
  })
  const saveIntentHelp = computed(() => {
    if (props.saveIntent === 'save-refresh') {
      return '请选择存储方式后保存当前进度。保存成功后会自动刷新当前页面，加载刚推送的新内容。'
    }
    return '请选择存储方式后再保存。不同方式各有优点，你可以按自己的使用习惯选择。'
  })
  const visibleFieldAnomalies = computed(() => serverSaveFieldAnomaly.value?.details.anomalies.slice(0, 5) ?? [])
  const hiddenFieldAnomalyCount = computed(() => Math.max(0, (serverSaveFieldAnomaly.value?.details.anomalies.length ?? 0) - visibleFieldAnomalies.value.length))
  const saveIdentityHint = computed(() => {
    const identity = saveStore.currentOnlineIdentity
    if (saveStore.storageMode === 'server') {
      if (identity?.save_id) {
        const slotLabel = identity.save_slot !== null && identity.save_slot !== undefined
          ? ` · 槽位 ${Number(identity.save_slot) + 1}`
          : ''
        return `当前服务端存档 ID：${identity.save_id}${slotLabel}。好友搜索和邀请会使用这个固定 ID。`
      }
      return '保存、导入或载入服务端存档后，服务端会自动写入固定数字 ID，供好友搜索和邀请使用。'
    }
    return '本地存储不会生成公开数字 ID；需要好友搜索或邀请时，请切换到服务端持久化并保存当前进度。'
  })

  const buildImportSuccessMessage = (slot: number) => {
    if (saveStore.storageMode === 'server') {
      return saveStore.lastSaveResultStatus === 'queued'
        ? `已导入到存档 ${slot + 1}，服务恢复后会补传并写入公开存档 ID。`
        : `已导入到服务端存档 ${slot + 1}，公开存档 ID 已随服务端保存写回。`
    }
    return `已导入到本地存档 ${slot + 1}；切到服务端保存后会生成公开存档 ID。`
  }

  const formatConflictSummary = (info: {
    exists?: boolean
    playerName?: string
    year?: number
    season?: string
    day?: number
    money?: number
  } | null | undefined) => {
    if (!info?.exists) return '空槽位'
    const playerName = info.playerName || '未命名'
    const season = info.season ? (SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] ?? info.season) : '?'
    const dayText = Number.isFinite(Number(info.year)) && Number.isFinite(Number(info.day))
      ? `第${Number(info.year)}年 ${season} 第${Number(info.day)}天`
      : '时间未知'
    const moneyText = Number.isFinite(Number(info.money)) ? ` · ${Math.floor(Number(info.money))} 铜钱` : ''
    return `${playerName} · ${dayText}${moneyText}`
  }

  const formatSaveFieldAnomaly = (entry: { field_path?: string; action?: string; observed_value?: unknown; normalized_value?: unknown; limit?: unknown }) => {
    const fieldPath = entry.field_path || 'unknown_field'
    const action = entry.action ? ` · ${entry.action}` : ''
    const observed = entry.observed_value !== undefined && entry.observed_value !== null ? ` · observed ${String(entry.observed_value)}` : ''
    const limit = entry.limit !== undefined && entry.limit !== null ? ` · limit ${String(entry.limit)}` : ''
    const normalized = entry.normalized_value !== undefined && entry.normalized_value !== null
      ? ` -> ${String(entry.normalized_value)}`
      : ''
    return `${fieldPath}${action}${observed}${limit}${normalized}`
  }

  const clearSaveLoadingTimers = () => {
    if (saveSlowHintTimer !== null) {
      window.clearTimeout(saveSlowHintTimer)
      saveSlowHintTimer = null
    }
    if (saveVerySlowHintTimer !== null) {
      window.clearTimeout(saveVerySlowHintTimer)
      saveVerySlowHintTimer = null
    }
  }

  const beginSaveLoading = () => {
    clearSaveLoadingTimers()
    saveSlowHint.value = ''
    savingCurrent.value = true
    saveSlowHintTimer = window.setTimeout(() => {
      saveSlowHint.value = saveStore.storageMode === 'server'
        ? '服务端响应较慢，仍在保存中。'
        : '本地写入耗时较久，仍在保存中。'
    }, 3000)
    saveVerySlowHintTimer = window.setTimeout(() => {
      saveSlowHint.value = saveStore.storageMode === 'server'
        ? '这次保存比平时更久，可以继续等待；失败时会保留错误提示。'
        : '这次本地写入比平时更久，可以继续等待。'
    }, 8000)
  }

  const endSaveLoading = () => {
    clearSaveLoadingTimers()
    savingCurrent.value = false
    saveSlowHint.value = ''
  }

  const handleCloseRequest = () => {
    if (savingCurrent.value) {
      showFloat('正在保存中，请稍等。', 'accent')
      return
    }
    emit('close')
  }

  const refreshSlots = async () => {
    slots.value = await saveStore.getSlots()
  }

  const switchMode = async (mode: 'local' | 'server') => {
    saveStore.setStorageMode(mode)
    await refreshSlots()
  }

  const reloadCurrentPageForUpdate = () => {
    window.location.reload()
  }

  const handleSaveCurrent = async () => {
    const targetSlot = saveStore.activeSlot
    if (targetSlot < 0) {
      showFloat('当前还没有活跃存档槽位。', 'danger')
      return
    }
    beginSaveLoading()
    let ok = false
    try {
      ok = await saveStore.saveToSlot(targetSlot)
    } catch (error) {
      console.error('Failed to save current slot', error)
      showFloat(saveStore.lastSaveErrorMessage || '保存失败。', 'danger')
      return
    } finally {
      endSaveLoading()
    }
    if (ok) {
      await refreshSlots()
      emit('change')
      const queued = saveStore.lastSaveResultStatus === 'queued'
      const savedMessage = saveStore.lastServerSyncMessage || `已保存到存档 ${targetSlot + 1}。`
      if (props.saveIntent === 'save-refresh') {
        showFloat(
          queued ? '已本地保底，服务恢复后会自动同步，正在刷新。' : `已保存到存档 ${targetSlot + 1}，正在刷新。`,
          queued ? 'accent' : 'success'
        )
        reloadCurrentPageForUpdate()
        return
      }
      if (props.saveIntent === 'save-return') {
        showFloat(
          queued ? '已本地保底，服务恢复后会自动同步，正在返回。' : `已保存到存档 ${targetSlot + 1}，正在返回。`,
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
      if (saveStore.lastSaveResultStatus === 'conflict') {
        await refreshSlots()
        showFloat('云存档有新版本，请选择保存当前页面或改用服务端存档。', 'accent')
        return
      }
      if (saveStore.serverSaveFieldAnomaly?.slot === targetSlot) {
        showFloat('检测到云存档字段异常，请在弹窗中确认是否修复后强制保存。', 'accent')
        return
      }
      showFloat(saveStore.lastSaveErrorMessage || '保存失败。', 'danger')
    }
  }

  const handleResolveServerConflict = async (choice: 'local' | 'remote') => {
    if (resolvingConflict.value) return
    resolvingConflict.value = true
    const ok = await saveStore.resolveServerSaveConflict(choice)
    resolvingConflict.value = false
    await refreshSlots()
    if (!ok) {
      if (saveStore.serverSaveFieldAnomaly) {
        showFloat('检测到云存档字段异常，请在弹窗中确认是否修复后强制保存。', 'accent')
        return
      }
      showFloat(saveStore.lastSaveErrorMessage || '处理云存档冲突失败。', 'danger')
      return
    }

    emit('change')
    if (choice === 'local') {
      showFloat(saveStore.lastServerSyncMessage || '已保存当前进度。', 'success')
      if (props.saveIntent === 'save-refresh') {
        reloadCurrentPageForUpdate()
        return
      }
      if (props.saveIntent === 'save-return') {
        window.location.href = props.returnUrl || '/'
        return
      }
      if (props.saveIntent === 'save') {
        emit('saved', 'save')
        emit('close')
      }
      return
    }
    showFloat(saveStore.lastServerSyncMessage || '已改用服务端存档。', 'success')
    if (props.saveIntent === 'save-refresh') {
      reloadCurrentPageForUpdate()
    }
  }

  const handleRepairServerFieldAnomaly = async () => {
    if (repairingFieldAnomaly.value) return
    repairingFieldAnomaly.value = true
    const ok = await saveStore.forceRepairServerSaveFieldAnomaly()
    repairingFieldAnomaly.value = false
    await refreshSlots()
    if (!ok) {
      if (saveStore.lastSaveResultStatus === 'conflict') {
        showFloat('云存档又有新版本，请先比较当前页面和服务端存档。', 'accent')
        return
      }
      showFloat(saveStore.lastSaveErrorMessage || '修复并强制保存失败。', 'danger')
      return
    }

    emit('change')
    showFloat(saveStore.lastServerSyncMessage || '已修复异常字段并保存到服务端。', 'success')
    if (props.saveIntent === 'save-refresh') {
      reloadCurrentPageForUpdate()
      return
    }
    if (props.saveIntent === 'save-return') {
      window.location.href = props.returnUrl || '/'
      return
    }
    if (props.saveIntent === 'save') {
      emit('saved', 'save')
      emit('close')
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
      const slotAllocationBlockReason = saveStore.getSlotAllocationBlockReason()
      if (slotAllocationBlockReason) {
        showFloat(slotAllocationBlockReason, 'danger')
        input.value = ''
        return
      }
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        showFloat('存档槽位已满，请先删除一个旧存档。')
      } else {
        void (async () => {
          if (await saveStore.importSave(emptySlot.slot, content)) {
            await refreshSlots()
            emit('change')
            showFloat(buildImportSuccessMessage(emptySlot.slot), 'success')
          } else {
            const message = saveStore.lastSaveResultStatus === 'conflict'
              ? '云存档有新版本，请选择保存导入存档或改用服务端存档。'
              : saveStore.lastSaveErrorMessage || saveStore.lastLoadErrorMessage || '存档文件无效或已损坏。'
            if (saveStore.lastSaveResultStatus === 'conflict') {
              await refreshSlots()
            }
            showFloat(message, saveStore.lastSaveResultStatus === 'conflict' ? 'accent' : 'danger')
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

  onBeforeUnmount(() => {
    clearSaveLoadingTimers()
  })

  watch(
    () => saveStore.storageMode,
    () => {
      void refreshSlots()
    }
  )
</script>

<style scoped>
  .save-manager-panel {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .save-manager-storage-toggle {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .save-manager-storage-button :deep(span),
  .save-manager-primary-action :deep(span) {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .save-manager-primary-action--busy :deep(svg),
  .save-manager-loading-spin {
    animation: save-manager-spin 0.9s linear infinite;
  }

  @keyframes save-manager-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .save-manager-primary-action--busy :deep(svg),
    .save-manager-loading-spin {
      animation: none;
    }
  }

  .save-manager-slot-row {
    align-items: stretch;
  }

  .save-manager-slot-button {
    justify-content: space-between;
    gap: 0.5rem;
    overflow: hidden;
  }

  .save-manager-slot-button > :not([hidden]) ~ :not([hidden]) {
    margin-left: 0;
  }

  .save-manager-slot-label {
    max-width: 50%;
    overflow: hidden;
  }

  .save-manager-slot-meta {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 420px) {
    .save-manager-slot-button {
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.125rem;
    }

    .save-manager-slot-label {
      max-width: 100%;
    }

    .save-manager-slot-meta {
      width: 100%;
      text-align: left;
    }
  }
</style>
