<template>
  <div
    class="main-menu-root flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-6 md:gap-8"
    @click.once="startBgm"
    :class="{ 'py-10': Capacitor.isNativePlatform() }"
    @click="slotMenuOpen = null"
  >
    <!-- 标题 -->
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex items-center space-x-3">
      <div class="logo" />
      <h1 class="text-accent text-2xl md:text-4xl tracking-widest">{{ pkg.title }}</h1>
      </div>
      <p class="text-[11px] md:text-xs text-muted leading-6 max-w-md">
        开始前先选好账号和存档方式，这样以后继续游戏会更方便。
      </p>
    </div>

    <div class="main-menu-shell w-full game-panel space-y-4">
      <div class="space-y-1">
        <p class="game-section-title">开始前确认</p>
        <p class="game-section-desc">先确认账号和存档方式，开始后会更顺手。</p>
      </div>

      <div class="main-menu-preflight-grid grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <section class="game-panel-muted main-menu-preflight-card p-3 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-xs text-accent">账号状态</p>
              <div class="text-xs text-muted leading-6">
                <template v-if="currentUser">
                  当前账号：<span class="text-accent">{{ currentUser.display_name || currentUser.username }}</span>
                  <span class="text-muted">（{{ currentUser.username }}）</span>
                </template>
                <template v-else>
                  当前未登录。前往独立登录页后，可使用账号云存档、交流大厅互动、额度兑换和邮箱功能。
                </template>
              </div>
            </div>
            <Button v-if="currentUser" class="text-center justify-center !text-xs shrink-0" :icon="LogOut" @click="handleLogout">退出</Button>
          </div>

          <div v-if="!currentUser" class="space-y-3 border border-accent/15 rounded-xs p-3 bg-bg/15">
            <p class="text-[11px] text-muted leading-5">登录与注册已拆分为独立页面，支持中文用户名与唯一校验。</p>
            <p class="text-[11px] leading-5 text-danger/90">未登录直接开始旅程时，存档无法保存，建议先注册账号后再游玩。</p>
            <div class="main-menu-auth-actions grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button class="justify-center py-2 text-xs" :icon="LogIn" @click="openAuth('login')">
                前往登录页
              </Button>
              <Button class="justify-center py-2 text-xs" :icon="UserPlus" @click="openAuth('register')">
                前往注册页
              </Button>
            </div>
          </div>
        </section>

        <section class="game-panel-muted main-menu-preflight-card p-3 space-y-3">
          <div class="space-y-1">
            <p class="text-xs text-accent">存档方式</p>
            <p class="text-[11px] text-muted leading-5">默认本地存储；切换后将按当前登录账号读取对应存档。</p>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <Button class="justify-center py-2 text-xs" :class="saveStore.storageMode === 'local' ? '!bg-accent !text-bg' : ''" @click="switchMode('local')">
              本地存储
            </Button>
            <Button class="justify-center py-2 text-xs" :class="saveStore.storageMode === 'server' ? '!bg-accent !text-bg' : ''" @click="switchMode('server')">
              服务端持久化
            </Button>
          </div>
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-2">
            <p class="text-[10px] text-accent">当前模式</p>
            <p class="text-xs mt-1">{{ storageModeText }}</p>
            <p class="text-[10px] text-muted mt-1 leading-5">{{ storageModeDesc }}</p>
          </div>
        </section>
      </div>
    </div>

    <!-- 主菜单 -->
    <div class="main-menu-shell w-full">
      <div class="main-menu-lower-grid space-y-3 xl:space-y-0">
        <section class="game-panel main-menu-section space-y-3">
        <div class="space-y-1">
          <p class="game-section-title">开始与入口</p>
          <p class="game-section-desc">从这里开始新旅程，或进入常用功能。</p>
        </div>
        <div class="main-menu-entry-grid grid grid-cols-1 gap-2 md:grid-cols-2">
          <Button class="text-center justify-center py-3 md:col-span-2" :icon="Play" @click="showPrivacy = true">新的旅程</Button>
          <Button class="text-center justify-center" :icon="BookOpen" @click="handleOpenGuide">新手教程</Button>
          <Button class="text-center justify-center" :icon="BookOpen" @click="handleOpenGuideBook">百科全书</Button>
          <Button class="text-center justify-center" :icon="MessagesSquare" @click="handleOpenHall">交流大厅</Button>
          <Button class="text-center justify-center" :icon="KeyRound" @click="handleOpenAdmin">桃源管理</Button>
          <Button v-if="isDev" class="text-center justify-center" :icon="Bug" @click="handleOpenLateGameDebug">后期调试</Button>
          <Button
            v-if="menuConfig.returnButtonEnabled"
            class="text-center justify-center"
            :icon="CornerUpLeft"
            @click="handleReturnToLottery"
          >
            {{ menuConfig.returnButtonText }}
          </Button>
          <Button
            v-if="menuConfig.aboutButtonEnabled"
            class="text-center justify-center"
            :icon="Info"
            @click="showAbout = true"
          >
            {{ menuConfig.aboutButtonText }}
          </Button>
        </div>
        </section>

        <section class="game-panel main-menu-section main-menu-continue-section space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="game-section-title">继续旅程</p>
            <p class="game-section-desc">如果你已经有存档，可以从这里继续，或导入以前的进度。</p>
          </div>
          <span class="game-chip">已有 {{ existingSlots.length }} 个存档</span>
        </div>

        <div v-if="existingSlots.length === 0" class="game-panel-muted main-menu-empty-state px-3 py-5 text-center">
          <p class="text-xs text-muted">当前还没有可继续的旅程。</p>
          <p class="text-[10px] text-muted mt-1">点击上方「新的旅程」，或导入已有存档。</p>
        </div>

        <div v-for="info in existingSlots" :key="info.slot" class="w-full">
          <div class="flex space-x-1 w-full">
            <button class="btn main-menu-slot flex-1 !justify-between" @click="handleLoadGame(info.slot)">
              <span class="inline-flex items-center space-x-2 min-w-0">
                <FolderOpen :size="14" class="shrink-0" />
                <span class="truncate">存档 {{ info.slot + 1 }} · {{ info.playerName ?? '未命名' }}</span>
              </span>
              <span class="text-muted text-[11px] md:text-xs text-right shrink-0">
                第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{ info.day }}天
              </span>
            </button>
            <div class="relative">
              <Button
                class="px-2 h-full"
                :icon="Settings"
                :icon-size="12"
                @click.stop="slotMenuOpen = slotMenuOpen === info.slot ? null : info.slot"
              />
              <div
                v-if="slotMenuOpen === info.slot"
                class="absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30"
              >
                <Button
                  v-if="!Capacitor.isNativePlatform()"
                  class="text-center !rounded-none justify-center !text-sm"
                  :icon="Download"
                  :icon-size="12"
                  @click="handleExportSlot(info.slot)"
                >
                  导出
                </Button>
                <Button
                  class="btn-danger !rounded-none text-center justify-center !text-sm"
                  :icon="Trash2"
                  :icon-size="12"
                  @click="handleDeleteSlot(info.slot)"
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        </div>

        <template v-if="!Capacitor.isNativePlatform()">
          <Button class="text-center justify-center" :icon="Upload" @click="triggerImport">导入存档</Button>
          <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />
        </template>
        </section>
      </div>
    </div>

    <!-- 角色创建弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showCharCreate && !showFarmSelect" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
        <div class="game-panel w-full max-w-xs mx-4 relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="handleBackToMenu">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-4 text-center">创建你的角色</p>
          <div class="flex flex-col space-y-4">
            <!-- 名字输入 -->
            <div>
              <label class="text-xs text-muted mb-1 block">你的名字</label>
              <input
                v-model="charName"
                type="text"
                maxlength="4"
                placeholder="请输入你的名字"
                class="w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none"
              />
            </div>
            <!-- 性别选择 -->
            <div>
              <label class="text-xs text-muted mb-1 block">性别</label>
              <div class="flex space-x-3">
                <Button
                  class="flex-1 justify-center py-2"
                  :class="charGender === 'male' ? '!border-accent !bg-accent/10' : ''"
                  @click="charGender = 'male'"
                >
                  男
                </Button>
                <Button
                  class="flex-1 justify-center py-2"
                  :class="charGender === 'female' ? '!border-accent !bg-accent/10' : ''"
                  @click="charGender = 'female'"
                >
                  女
                </Button>
              </div>
            </div>
          </div>
          <div class="flex space-x-3 justify-center mt-4">
            <Button :icon-size="12" :icon="ArrowLeft" @click="handleBackToMenu">返回</Button>
            <Button class="px-6" :disabled="!charName.trim()" :icon-size="12" :icon="Play" @click="handleCharCreateNext">下一步</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 农场选择弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showFarmSelect" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
        <div class="game-panel w-full max-w-xl max-h-[80vh] flex flex-col relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text z-10" @click="handleBackToCharCreate">
            <X :size="14" />
          </button>
          <p class="text-accent text-sm mb-3 text-center shrink-0">选择你的田庄类型</p>
          <div class="flex-1 overflow-y-auto min-h-0">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                v-for="farm in FARM_MAP_DEFS"
                :key="farm.type"
                class="border border-accent/20 rounded-xs p-3 text-left transition-all cursor-pointer hover:border-accent/50"
                @click="handleSelectFarm(farm.type)"
              >
                <div class="text-sm mb-0.5">{{ farm.name }}</div>
                <div class="text-muted text-xs mb-1">{{ farm.description }}</div>
                <div class="text-accent text-xs">{{ farm.bonus }}</div>
              </button>
            </div>
          </div>
          <div class="flex justify-center mt-3 shrink-0">
            <Button :icon-size="12" :icon="ArrowLeft" @click="handleBackToCharCreate">返回</Button>
          </div>
        </div>

        <!-- 田庄确认弹窗 -->
        <Transition name="panel-fade">
          <div
            v-if="showFarmConfirm"
            class="fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
            @click.self="showFarmConfirm = false"
          >
            <div class="game-panel w-full max-w-xs mx-4 text-center relative">
              <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showFarmConfirm = false">
                <X :size="14" />
              </button>
              <Divider title>{{ selectedFarmDef?.name }}</Divider>
              <p class="text-xs text-muted mb-2">{{ selectedFarmDef?.description }}</p>
              <p class="text-xs text-accent mb-4">{{ selectedFarmDef?.bonus }}</p>
              <div class="flex space-x-3 justify-center">
                <Button :icon-size="12" :icon="ArrowLeft" @click="showFarmConfirm = false">取消</Button>
                <Button class="px-6" :icon-size="12" :icon="Play" @click="handleNewGame">开始旅程</Button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 旧存档身份设置弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showIdentitySetup" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
        <div class="game-panel w-full max-w-xs mx-4 relative">
          <p class="text-accent text-sm mb-2 text-center">设置角色信息</p>
          <p class="text-xs text-muted mb-4 text-center">检测到角色信息为空，请设置你的角色信息</p>
          <div class="flex flex-col space-y-4">
            <div>
              <label class="text-xs text-muted mb-1 block">你的名字</label>
              <input
                v-model="charName"
                type="text"
                maxlength="4"
                placeholder="请输入你的名字"
                class="w-full px-3 py-2 bg-bg border border-accent/30 rounded-xs text-sm focus:border-accent outline-none"
              />
            </div>
            <div>
              <label class="text-xs text-muted mb-1 block">性别</label>
              <div class="flex space-x-3">
                <Button
                  class="flex-1 justify-center py-2"
                  :class="charGender === 'male' ? '!border-accent !bg-accent/10' : ''"
                  @click="charGender = 'male'"
                >
                  男
                </Button>
                <Button
                  class="flex-1 justify-center py-2"
                  :class="charGender === 'female' ? '!border-accent !bg-accent/10' : ''"
                  @click="charGender = 'female'"
                >
                  女
                </Button>
              </div>
            </div>
          </div>
          <div class="flex justify-center mt-4">
            <Button class="px-6" :disabled="!charName.trim()" :icon-size="12" :icon="Play" @click="handleIdentityConfirm">
              确认并继续
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 删除存档确认弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="deleteTargetSlot !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
        @click.self="deleteTargetSlot = null"
      >
        <div class="game-panel w-full max-w-xs mx-4 text-center">
          <p class="text-danger text-sm mb-3">确定删除存档 {{ deleteTargetSlot + 1 }}？</p>
          <p class="text-xs text-muted mb-4">此操作不可恢复。</p>
          <div class="flex space-x-3 justify-center">
            <Button @click="deleteTargetSlot = null">取消</Button>
            <Button class="btn-danger" @click="confirmDeleteSlot">确认删除</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 隐私协议弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showPrivacy" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" @click.self="handlePrivacyDecline">
        <div class="game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          <h2 class="text-accent text-lg mb-3 text-center">
            <ShieldCheck :size="14" class="inline" />
            隐私协议
          </h2>
          <div class="flex-1 overflow-y-auto text-xs text-muted space-y-2 mb-4 pr-1">
            <p>欢迎来到桃源乡！在开始游戏之前，请阅读以下隐私协议：</p>
            <p class="text-text">1. 数据存储</p>
            <p>本游戏的存档、设置等数据保存在您的浏览器本地存储（localStorage）中。存档数据不会上传至服务器。</p>
            <p class="text-text">2. 流量统计</p>
            <p>
              本游戏使用第三方统计服务收集匿名访问数据（如页面浏览量、访问时间、设备类型、浏览器信息等），用于分析游戏使用情况和改进体验。这些数据不包含您的个人身份信息。
            </p>
            <p class="text-text">3. 网络通信</p>
            <p>除流量统计外，游戏核心功能均在本地运行，不会将您的游戏存档或操作数据发送至任何服务器。</p>
            <p class="text-text">4. 数据安全</p>
            <p>清除浏览器数据或更换设备可能导致存档丢失，建议定期使用导出功能备份存档。</p>
            <p class="text-text">5. 第三方服务</p>
            <p>
              本游戏使用的第三方统计服务有其独立的隐私政策，我们不对其数据处理方式负责。游戏中的外部链接指向的第三方网站亦不受本协议约束。
            </p>
            <p class="text-text">6. 协议变更</p>
            <p>本协议可能随版本更新而调整，届时将在游戏内重新提示。继续使用即视为同意最新版本的协议。</p>
          </div>
          <div class="flex space-x-3 justify-center">
            <Button class="!text-sm" :icon="ArrowLeft" @click="handlePrivacyDecline">不同意</Button>
            <Button class="!text-sm px-6" :icon="ShieldCheck" @click="handlePrivacyAgree">同意并继续</Button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <div v-if="showAbout" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" @click.self="showAbout = false">
        <div class="game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showAbout = false">
            <X :size="14" />
          </button>
          <Divider title class="my-4" :label="menuConfig.aboutDialogTitle" />
          <div class="flex-1 overflow-y-auto text-xs text-muted whitespace-pre-wrap leading-6 px-1 pb-3">
            {{ menuConfig.aboutDialogContent }}
          </div>
          <div class="flex justify-center pb-2">
            <Button :icon="Info" :icon-size="12" @click="showAbout = false">我知道了</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { Play, FolderOpen, ArrowLeft, Trash2, Download, Upload, Settings, ShieldCheck, X, CornerUpLeft, Info, BookOpen, MessagesSquare, KeyRound, LogIn, LogOut, UserPlus, Bug } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { FARM_MAP_DEFS } from '@/data/farmMaps'
  import _pkg from '../../package.json'
  import { useAudio } from '@/composables/useAudio'
  import { showFloat, addLog } from '@/composables/useGameLog'
  import { resetAllStoresForNewGame } from '@/composables/useResetGame'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import type { FarmMapType, Gender } from '@/types'
  import { Capacitor } from '@capacitor/core'
  import { buildScopedSingleKey, initCurrentAccount, migrateLegacySingleValue } from '@/utils/accountStorage'

  const router = useRouter()
  const { startBgm } = useAudio()
  const pkg = _pkg as typeof _pkg & { title: string }

  const gameStore = useGameStore()
  const saveStore = useSaveStore()
  const farmStore = useFarmStore()
  const animalStore = useAnimalStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()
  const inventoryStore = useInventoryStore()

  const slots = ref<Awaited<ReturnType<typeof saveStore.getSlots>>>([])
  const showCharCreate = ref(false)
  const showFarmSelect = ref(false)
  const showIdentitySetup = ref(false)
  const slotMenuOpen = ref<number | null>(null)
  const selectedMap = ref<FarmMapType>('standard')
  const charName = ref('')
  const charGender = ref<Gender>('male')
  const showPrivacy = ref(false)
  const showFarmConfirm = ref(false)
  const showAbout = ref(false)
  const menuConfig = ref({
    returnButtonEnabled: true,
    returnButtonText: '返回首页',
    returnButtonUrl: '/',
    aboutButtonEnabled: true,
    aboutButtonText: '关于游戏',
    aboutDialogTitle: '关于桃源乡',
    aboutDialogContent: '欢迎来到桃源乡。',
  })

  const deleteTargetSlot = ref<number | null>(null)
  const currentUser = ref<null | { username: string; display_name?: string }>(null)

  const existingSlots = computed(() => slots.value.filter(slot => slot.exists))
  const storageModeText = computed(() => (saveStore.storageMode === 'local' ? '本地存储（当前设备）' : '服务端持久化（当前账号）'))
  const storageModeDesc = computed(() =>
    saveStore.storageMode === 'local'
      ? '适合当前设备持续游玩，导入导出备份更直接。'
      : '适合登录账号后跨设备读取，并配合大厅、邮箱等在线功能。'
  )

  const selectedFarmDef = computed(() => FARM_MAP_DEFS.find(f => f.type === selectedMap.value))

  const handleSelectFarm = (type: FarmMapType) => {
    selectedMap.value = type
    showFarmConfirm.value = true
  }

  const handlePrivacyAgree = () => {
    const scopedPrivacyKey = buildScopedSingleKey('taoyuan_privacy_agreed_')
    migrateLegacySingleValue('taoyuan_privacy_agreed', scopedPrivacyKey)
    localStorage.setItem(scopedPrivacyKey, '1')
    showPrivacy.value = false
    showCharCreate.value = true
  }

  const handlePrivacyDecline = () => {
    showPrivacy.value = false
  }

  const refreshSlots = async () => {
    slots.value = await saveStore.getSlots()
  }

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      const data = await res.json().catch(() => null)
      currentUser.value = res.ok && data?.ok && data?.user
        ? {
            username: data.user.username,
            display_name: data.user.display_name,
          }
        : null
    } catch {
      currentUser.value = null
    }
  }

  const loadMenuConfig = async () => {
    try {
      const res = await fetch('/api/public-config', { credentials: 'include' })
      const data = await res.json()
      if (!data?.ok) return
      menuConfig.value = {
        returnButtonEnabled: data.taoyuan_return_button_enabled !== false,
        returnButtonText: data.taoyuan_return_button_text || '返回首页',
        returnButtonUrl: data.taoyuan_return_button_url || '/',
        aboutButtonEnabled: data.taoyuan_about_button_enabled !== false,
        aboutButtonText: data.taoyuan_about_button_text || '关于游戏',
        aboutDialogTitle: data.taoyuan_about_dialog_title || '关于桃源乡',
        aboutDialogContent: data.taoyuan_about_dialog_content || '欢迎来到桃源乡。',
      }
    } catch {}
  }

  const handleReturnToLottery = () => {
    window.location.href = menuConfig.value.returnButtonUrl || '/'
  }

  const openAuth = (mode: 'login' | 'register') => {
    void router.push({ name: 'auth', query: { mode, redirect: '/' } })
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    await initCurrentAccount()
    await loadCurrentUser()
    await refreshSlots()
    showFloat('已退出登录', 'success')
  }

  const handleOpenGuide = () => {
    window.location.href = new URL('./guide.html', window.location.href).toString()
  }

  const handleOpenGuideBook = () => {
    window.location.href = new URL('./guide-book.html', window.location.href).toString()
  }

  const handleOpenHall = () => {
    void router.push('/hall')
  }

  const handleOpenAdmin = () => {
    void router.push('/admin/users')
  }

  const isDev = import.meta.env.DEV

  const handleOpenLateGameDebug = () => {
    void router.push('/dev/late-game')
  }

  const switchMode = async (mode: 'local' | 'server') => {
    saveStore.setStorageMode(mode)
    await refreshSlots()
  }

  const handleBackToMenu = () => {
    showCharCreate.value = false
    showFarmSelect.value = false
    selectedMap.value = 'standard'
    charName.value = ''
    charGender.value = 'male'
  }

  const resolveLoadedGameRoute = () => {
    if (gameStore.currentLocationGroup === 'village_area') return '/game/village'
    if (gameStore.currentLocationGroup === 'nature') return '/game/forage'
    if (gameStore.currentLocationGroup === 'mine') return '/game/mining'
    if (gameStore.currentLocationGroup === 'hanhai') return '/game/hanhai'
    return '/game/farm'
  }

  const warnGuestSaveUnavailable = () => {
    if (currentUser.value) return
    const msg = '当前未登录，游客模式下存档无法保存，建议先注册账号后再开始长期游玩。'
    showFloat(msg, 'danger')
    addLog(msg)
  }

  const handleCharCreateNext = () => {
    showFarmSelect.value = true
  }

  const handleBackToCharCreate = () => {
    showFarmSelect.value = false
    showFarmConfirm.value = false
  }

  const handleNewGame = async () => {
    // 分配空闲存档槽位
    const slot = await saveStore.assignNewSlot()
    if (slot < 0) {
      showFloat('存档槽位已满，请先删除一个旧存档。')
      return
    }
    // 重置所有游戏 store 到初始状态，防止上一个存档数据残留
    resetAllStoresForNewGame()
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value)
    gameStore.startNewGame(selectedMap.value)
    // 标准农场初始6×6，其余4×4
    farmStore.resetFarm(selectedMap.value === 'standard' ? 6 : 4)
    // 新手赠送：10个青菜种子
    inventoryStore.addItem('seed_cabbage', 10)
    // 草地农场：免费鸡舍 + 2只鸡
    if (selectedMap.value === 'meadowlands') {
      const coop = animalStore.buildings.find(b => b.type === 'coop')
      if (coop) {
        coop.built = true
        coop.level = 1
      }
      animalStore.animals.push(
        {
          id: 'chicken_init_1',
          type: 'chicken',
          name: '小花',
          friendship: 100,
          mood: 200,
          daysOwned: 0,
          daysSinceProduct: 0,
          wasFed: false,
          fedWith: null,
          wasPetted: false,
          hunger: 0,
          sick: false,
          sickDays: 0
        },
        {
          id: 'chicken_init_2',
          type: 'chicken',
          name: '小白',
          friendship: 100,
          mood: 200,
          daysOwned: 0,
          daysSinceProduct: 0,
          wasFed: false,
          fedWith: null,
          wasPetted: false,
          hunger: 0,
          sick: false,
          sickDays: 0
        }
      )
    }
    questStore.initMainQuest()
    // 新手引导：游戏开始时立即显示欢迎提示
    const tutorialStore = useTutorialStore()
    if (tutorialStore.enabled) {
      addLog('柳村长说：「欢迎来到桃源乡！背包里有白菜种子，去农场开垦土地、播种吧。」')
      tutorialStore.markTipShown('tip_welcome')
    }
    warnGuestSaveUnavailable()
    void router.push('/game')
  }

  const handleLoadGame = async (slot: number) => {
    if (await saveStore.loadFromSlot(slot)) {
      if (playerStore.needsIdentitySetup) {
        // 旧存档没有性别/名字数据，先让玩家设置
        showIdentitySetup.value = true
      } else {
        void router.push(resolveLoadedGameRoute())
      }
    }
  }

  /** 旧存档身份设置完成 */
  const handleIdentityConfirm = () => {
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value)
    showIdentitySetup.value = false
    void router.push(resolveLoadedGameRoute())
  }

  const handleDeleteSlot = (slot: number) => {
    deleteTargetSlot.value = slot
  }

  const confirmDeleteSlot = async () => {
    if (deleteTargetSlot.value !== null) {
      await saveStore.deleteSlot(deleteTargetSlot.value)
      await refreshSlots()
      deleteTargetSlot.value = null
      slotMenuOpen.value = null
    }
  }

  const handleExportSlot = async (slot: number) => {
    if (!(await saveStore.exportSave(slot))) {
      showFloat('导出失败。', 'danger')
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
      // 找到第一个空槽位导入，没有则提示
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        showFloat('存档槽位已满，请先删除一个旧存档。')
      } else {
        void (async () => {
          if (await saveStore.importSave(emptySlot.slot, content)) {
            await refreshSlots()
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

  onMounted(() => {
    void refreshSlots()
    void loadMenuConfig()
    void loadCurrentUser()
  })

  watch(
    () => saveStore.storageMode,
    () => {
      void refreshSlots()
    }
  )
</script>

<style scoped>
  .main-menu-root {
    max-width: 980px;
    margin: 0 auto;
  }

  .main-menu-shell {
    max-width: 980px;
    margin: 0 auto;
  }

  .logo {
    width: 50px;
    height: 50px;
    background: url(@/assets/logo.png) center / contain no-repeat;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .main-menu-slot {
    min-height: 48px;
    gap: 10px;
  }

  @media (min-width: 1280px) {
    .main-menu-root {
      max-width: 1160px;
      align-items: stretch;
      justify-content: flex-start;
      gap: 20px;
      padding-top: 28px;
      padding-bottom: 32px;
    }

    .main-menu-shell {
      max-width: 1120px;
    }

    .main-menu-preflight-grid {
      grid-template-columns: minmax(0, 1.55fr) minmax(340px, 0.95fr);
      gap: 16px;
    }

    .main-menu-preflight-card {
      min-height: 100%;
      padding: 16px;
    }

    .main-menu-auth-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .main-menu-lower-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.98fr) minmax(0, 1.02fr);
      gap: 16px;
      align-items: start;
    }

    .main-menu-section {
      min-height: 100%;
    }

    .main-menu-entry-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .main-menu-entry-grid > :first-child {
      min-height: 56px;
      font-size: 0.875rem;
      letter-spacing: 0.04em;
    }

    .main-menu-continue-section {
      display: flex;
      flex-direction: column;
    }

    .main-menu-empty-state {
      min-height: 112px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .main-menu-slot {
      min-height: 54px;
      padding-inline: 14px;
    }
  }
</style>
