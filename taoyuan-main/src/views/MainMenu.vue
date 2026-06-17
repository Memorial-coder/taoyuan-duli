<template>
  <div
    class="main-menu-root flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-6 md:gap-8"
    data-testid="main-menu"
    @click.once="startBgm"
    :class="{ 'py-10': isNativePlatform }"
    @click="slotMenuOpen = null"
  >
    <!-- 标题 -->
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="flex items-center space-x-3">
      <button type="button" class="logo" aria-label="桃源乡徽记" @click="handleLogoClick" />
      <h1 class="text-accent text-2xl md:text-4xl tracking-widest">{{ pkg.title }}</h1>
      </div>
      <p class="text-[0.6875rem] md:text-xs text-muted leading-6 max-w-md">
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
            <p class="text-[0.6875rem] text-muted leading-5">登录与注册已拆分为独立页面，支持中文用户名与唯一校验。</p>
            <p class="text-[0.6875rem] leading-5 text-danger/90">未登录直接开始旅程时，存档无法保存，建议先注册账号后再游玩。</p>
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
          <template v-if="isDesktopMenu">
            <div class="space-y-1">
              <p class="text-xs text-accent">存档方式</p>
              <p class="text-[0.6875rem] text-muted leading-5">默认服务端持久化；需要离线游玩时可手动切换为本地存储。</p>
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
              <p class="text-[0.625rem] text-accent">当前模式</p>
              <p class="text-xs mt-1">{{ storageModeText }}</p>
              <p class="text-[0.625rem] text-muted mt-1 leading-5">{{ storageModeDesc }}</p>
              <p class="text-[0.625rem] text-muted mt-1 leading-5">{{ storageIdentityHint }}</p>
            </div>
          </template>
          <template v-else>
            <div class="space-y-1">
              <p class="text-xs text-accent">存档与继续旅程</p>
              <p class="text-[0.6875rem] text-muted leading-5">先选好存档方式，再直接查看这次要继续哪一档，会比来回滚动更方便。</p>
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
              <p class="text-[0.625rem] text-accent">当前模式</p>
              <p class="text-xs mt-1">{{ storageModeText }}</p>
              <p class="text-[0.625rem] text-muted mt-1 leading-5">{{ storageModeDesc }}</p>
              <p class="text-[0.625rem] text-muted mt-1 leading-5">{{ storageIdentityHint }}</p>
            </div>
            <div class="border-t border-accent/15 pt-3">
              <MainMenuContinueList
                :existing-slots="existingSlots"
                :slot-menu-open="slotMenuOpen"
                :is-native-platform="isNativePlatform"
                :slot-read-blocked="slotReadBlocked"
                @load-slot="handleLoadGame"
                @toggle-slot-menu="toggleSlotMenu"
                @export-slot="handleExportSlot"
                @delete-slot="handleDeleteSlot"
                @import-slot="triggerImport"
              >
                <template #header="{ count }">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-accent">继续旅程</p>
                    <span class="game-chip">已有 {{ count }} 个存档</span>
                  </div>
                </template>
              </MainMenuContinueList>
            </div>
          </template>
        </section>
      </div>

      <div
        v-if="importNotice"
        ref="importNoticePanelRef"
        class="rounded-xs border px-3 py-2 text-left text-[0.6875rem] leading-5"
        :class="importNotice.tone === 'danger'
          ? 'border-danger/30 bg-danger/10 text-danger'
          : importNotice.tone === 'success'
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-warning/35 bg-warning/10 text-warning'"
        data-testid="main-menu-import-notice-panel"
        @click.stop
      >
        <div class="flex items-start justify-between gap-3">
          <p>{{ importNotice.message }}</p>
          <Button class="shrink-0 px-2 py-1" :icon="X" :icon-size="12" @click="clearImportNotice" />
        </div>
        <div v-if="serverSaveConflict && importNotice.tone === 'accent'" class="mt-2 space-y-2" data-testid="main-menu-import-conflict-actions">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
              <p class="text-text">导入/本地副本</p>
              <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.localSummary) }}</p>
            </div>
            <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
              <p class="text-text">服务端现有</p>
              <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.remoteSummary) }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              class="justify-center text-xs"
              :icon="Save"
              :icon-size="12"
              :disabled="resolvingConflict"
              @click="handleResolveServerConflict('local')"
            >
              保存这份副本
            </Button>
            <Button
              class="justify-center text-xs"
              :icon="CloudDownload"
              :icon-size="12"
              :disabled="resolvingConflict"
              @click="handleResolveServerConflict('remote')"
            >
              改用服务端存档
            </Button>
          </div>
        </div>
        <div v-else-if="importNotice.tone === 'success' && importNotice.slot !== null" class="mt-2">
          <Button class="justify-center text-xs" :icon="Play" :icon-size="12" @click="handleLoadImportedSlot">
            载入这个存档
          </Button>
        </div>
      </div>

      <div
        v-if="serverSaveConflict && !importNotice"
        class="rounded-xs border border-warning/35 bg-warning/10 px-3 py-2 text-left text-[0.6875rem] leading-5 text-warning"
        data-testid="main-menu-server-save-conflict-panel"
        @click.stop
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs text-warning">云存档冲突</p>
          <span class="shrink-0 rounded-xs border border-warning/30 px-1.5 py-0.5">存档 {{ serverSaveConflict.slot + 1 }}</span>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
            <p class="text-text">导入/本地副本</p>
            <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.localSummary) }}</p>
          </div>
          <div class="rounded-xs border border-warning/20 bg-bg/25 px-2 py-1.5">
            <p class="text-text">服务端现有</p>
            <p class="mt-1 text-muted">{{ formatConflictSummary(serverSaveConflict.remoteSummary) }}</p>
          </div>
        </div>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            class="justify-center text-xs"
            :icon="Save"
            :icon-size="12"
            :disabled="resolvingConflict"
            @click="handleResolveServerConflict('local')"
          >
            保存这份副本
          </Button>
          <Button
            class="justify-center text-xs"
            :icon="CloudDownload"
            :icon-size="12"
            :disabled="resolvingConflict"
            @click="handleResolveServerConflict('remote')"
          >
            改用服务端存档
          </Button>
        </div>
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
          <Button class="text-center justify-center py-3 md:col-span-2" data-testid="new-journey-button" :icon="Play" @click="showPrivacy = true">新的旅程</Button>
          <Button class="text-center justify-center" :icon="BookOpen" @click="handleOpenGuide">新手教程</Button>
          <Button class="text-center justify-center" :icon="BookOpen" @click="handleOpenGuideBook">百科全书</Button>
          <Button class="text-center justify-center" :icon="Megaphone" data-testid="main-menu-announcements" @click="openAnnouncementHistory">更新公告</Button>
          <Button class="text-center justify-center" :icon="MessagesSquare" @click="handleOpenHall">交流大厅</Button>
          <Button v-if="showAdminEntry" class="text-center justify-center" :icon="KeyRound" @click="handleOpenAdmin">桃源管理</Button>
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
        <div class="border-t border-accent/15 pt-3 space-y-2">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="space-y-1">
              <p class="text-xs text-accent">联机世界</p>
              <p class="text-[0.6875rem] text-muted leading-5">
                带着已有旅程直接进入邻里、庄园、节会、村社与委托。
                <template v-if="!currentUser">未登录时，在线内容会受限。</template>
              </p>
            </div>
            <span class="game-chip">
              {{ preferredOnlineSlot ? `优先带入存档 ${preferredOnlineSlot.slot + 1}` : '需先开始旅程' }}
            </span>
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            <button
              v-for="entry in onlineMenuEntries"
              :key="entry.id"
              type="button"
              class="main-menu-online-entry text-left"
              :class="{ 'md:col-span-2': entry.featured }"
              :data-testid="`main-menu-online-entry-${entry.id}`"
              @click="openOnlinePanelFromMenu(entry)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="main-menu-online-entry-title">
                    <component :is="entry.icon" :size="14" class="inline mr-1.5" />
                    {{ entry.title }}
                  </p>
                  <p class="main-menu-online-entry-summary">{{ entry.summary }}</p>
                </div>
                <span class="main-menu-online-entry-chip">直达</span>
              </div>
            </button>
          </div>
        </div>
        </section>

        <section v-if="isDesktopMenu" class="game-panel main-menu-section main-menu-continue-section space-y-3">
          <MainMenuContinueList
            :existing-slots="existingSlots"
            :slot-menu-open="slotMenuOpen"
            :is-native-platform="isNativePlatform"
            :slot-read-blocked="slotReadBlocked"
            @load-slot="handleLoadGame"
            @toggle-slot-menu="toggleSlotMenu"
            @export-slot="handleExportSlot"
            @delete-slot="handleDeleteSlot"
            @import-slot="triggerImport"
          >
            <template #header="{ count }">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1">
                  <p class="game-section-title">继续旅程</p>
                  <p class="game-section-desc">如果你已经有存档，可以从这里继续，或导入以前的进度。</p>
                </div>
                <span class="game-chip">已有 {{ count }} 个存档</span>
              </div>
            </template>
          </MainMenuContinueList>
        </section>
      </div>
    </div>

    <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />

    <!-- 角色创建弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showCharCreate && !showFarmSelect" class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
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
                data-testid="char-name-input"
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
            <Button class="px-6" data-testid="char-create-next-button" :disabled="!charName.trim()" :icon-size="12" :icon="Play" @click="handleCharCreateNext">下一步</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 农场选择弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showFarmSelect" class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
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
                :data-testid="`farm-option-${farm.type}`"
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
            class="game-modal-overlay fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
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
                <Button class="px-6" data-testid="confirm-start-journey-button" :icon-size="12" :icon="Play" @click="handleNewGame">开始旅程</Button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 旧存档身份设置弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showIdentitySetup" class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
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
        class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
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

    <Transition name="panel-fade">
      <div
        v-if="serverSaveFieldAnomaly"
        class="game-modal-overlay fixed inset-0 z-60 flex items-center justify-center bg-bg/80 p-4"
        data-testid="main-menu-save-field-anomaly-modal"
        @click.self="saveStore.dismissServerSaveFieldAnomaly"
      >
        <div class="game-panel w-full max-w-sm text-left">
          <div class="mb-3 flex items-start gap-2">
            <AlertTriangle :size="16" class="mt-0.5 shrink-0 text-danger" />
            <div>
              <p class="text-sm text-danger">修复异常字段后强制保存？</p>
              <p class="mt-1 text-[0.6875rem] leading-5 text-muted">
                服务端检测到导入存档有越界或非法字段。确认后会先把这些字段修到合法范围，再覆盖服务端存档 {{ serverSaveFieldAnomaly.slot + 1 }}。
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
            <Button :disabled="repairingFieldAnomaly" @click="handleDismissServerFieldAnomaly">暂不处理</Button>
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

    <!-- 隐私协议弹窗 -->
    <Transition name="panel-fade">
      <div v-if="showPrivacy" class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80" @click.self="handlePrivacyDecline">
        <div class="game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          <h2 class="text-accent text-lg mb-3 text-center">
            <ShieldCheck :size="14" class="inline" />
            隐私协议
          </h2>
          <div class="flex-1 overflow-y-auto text-xs text-muted space-y-2 mb-4 pr-1">
            <p>欢迎来到桃源乡！在开始游戏之前，请阅读以下隐私协议：</p>
            <p class="text-text">1. 数据存储</p>
            <p>本游戏默认使用服务端持久化保存账号存档；切换为本地存储时，存档和设置会保存在您的浏览器本地存储（localStorage）中。</p>
            <p class="text-text">2. 流量统计</p>
            <p>
              本游戏使用第三方统计服务收集匿名访问数据（如页面浏览量、访问时间、设备类型、浏览器信息等），用于分析游戏使用情况和改进体验。这些数据不包含您的个人身份信息。
            </p>
            <p class="text-text">3. 网络通信</p>
            <p>使用服务端持久化、邮箱、交流大厅等在线功能时，会向服务器发送必要的账号、存档和操作数据；本地存储模式不会主动上传本地存档。</p>
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
            <Button class="!text-sm px-6" data-testid="privacy-agree-button" :icon="ShieldCheck" @click="handlePrivacyAgree">同意并继续</Button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <div v-if="showAbout" class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80" @click.self="showAbout = false">
        <div class="game-panel w-full max-w-md mx-4 max-h-[80vh] flex flex-col relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showAbout = false">
            <X :size="14" />
          </button>
          <Divider title class="my-4" :label="menuConfig.aboutDialogTitle" />
          <div class="flex-1 overflow-y-auto px-1 pb-3">
            <div class="main-menu-about-markdown taoyuan-rich-markdown text-xs text-muted leading-6" v-html="aboutDialogHtml" />
          </div>
          <div class="flex justify-center pb-2">
            <Button :icon="Info" :icon-size="12" @click="showAbout = false">我知道了</Button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <AnnouncementHistoryDialog
        :open="showAnnouncementHistory"
        :announcements="announcementStore.historyAnnouncements"
        :loading="announcementStore.loadingHistory"
        :error="announcementStore.historyError"
        @close="showAnnouncementHistory = false"
        @refresh="announcementStore.fetchHistory"
        @cta="handleAnnouncementHistoryCta"
      />
    </Transition>

  </div>
</template>

<script setup lang="ts">
  import { Play, ArrowLeft, ShieldCheck, X, CornerUpLeft, Info, BookOpen, MessagesSquare, KeyRound, LogIn, LogOut, UserPlus, Users, Home, CalendarDays, Save, CloudDownload, Megaphone, AlertTriangle } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import MainMenuContinueList from '@/components/game/MainMenuContinueList.vue'
  import AnnouncementHistoryDialog from '@/components/game/AnnouncementHistoryDialog.vue'
  import { renderRichContent } from '@/utils/safeMarkdown'
  import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
  import { useRouter } from 'vue-router'
  import type { PanelKey } from '@/composables/useNavigation'
  import { SEASON_NAMES, useGameStore } from '@/stores/useGameStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useAnnouncementStore } from '@/stores/useAnnouncementStore'
  import { FARM_MAP_DEFS } from '@/data/farmMaps'
  import _pkg from '../../package.json'
  import { useAudio } from '@/composables/useAudio'
  import { showFloat, addLog } from '@/composables/useGameLog'
  import { resetAllStoresForNewGame } from '@/composables/useResetGame'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import type { FarmMapType, Gender } from '@/types'
  import { Capacitor } from '@capacitor/core'
  import { buildScopedSingleKey, initCurrentAccount, migrateLegacySingleValue } from '@/utils/accountStorage'
  import type { OfficialManagedConfigKey, OfficialManagedConfigStatus } from '@/types'
  import type { TaoyuanAnnouncement } from '@/types/announcement'
  import { openAnnouncementTarget } from '@/utils/announcementApi'

  const router = useRouter()
  const { startBgm } = useAudio()
  const pkg = _pkg as typeof _pkg & { title: string }
  const isNativePlatform = Capacitor.isNativePlatform()
  const ADMIN_ENTRY_UNLOCK_CLICKS = 7

  const gameStore = useGameStore()
  const saveStore = useSaveStore()
  const farmStore = useFarmStore()
  const animalStore = useAnimalStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()
  const inventoryStore = useInventoryStore()
  const mailboxStore = useMailboxStore()
  const announcementStore = useAnnouncementStore()

  const slots = ref<Awaited<ReturnType<typeof saveStore.getSlots>>>([])
  type ImportNotice = {
    tone: 'success' | 'danger' | 'accent'
    message: string
    slot: number | null
  }
  const showCharCreate = ref(false)
  const showFarmSelect = ref(false)
  const showIdentitySetup = ref(false)
  const adminLogoClickCount = ref(0)
  const adminEntryUnlocked = ref(false)
  const slotMenuOpen = ref<number | null>(null)
  const resolvingConflict = ref(false)
  const repairingFieldAnomaly = ref(false)
  const importNotice = ref<ImportNotice | null>(null)
  const importNoticePanelRef = ref<HTMLElement | null>(null)
  const selectedMap = ref<FarmMapType>('standard')
  const charName = ref('')
  const charGender = ref<Gender>('male')
  const showPrivacy = ref(false)
  const showFarmConfirm = ref(false)
  const showAbout = ref(false)
  const showAnnouncementHistory = ref(false)
  const isDesktopMenu = ref(typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1280px)').matches)
  const menuConfig = ref({
    returnButtonEnabled: true,
    returnButtonText: '返回首页',
    returnButtonUrl: '/',
    aboutButtonEnabled: true,
    aboutButtonText: '关于游戏',
    aboutDialogTitle: '关于桃源乡',
    aboutDialogContent: '欢迎来到桃源乡。',
  })
  const publicConfigStatus = ref<OfficialManagedConfigStatus | null>(null)
  const publicConfigReadonlyFields = ref<OfficialManagedConfigKey[]>([])
  const publicConfigReturnUrlFallback = ref(false)
  const publicConfigFetchFallback = ref(false)
  const pendingPostLoadRoute = ref<string | null>(null)
  const pendingPostLoadNotice = ref<string | null>(null)
  const resolveSafeReturnButtonUrl = (rawValue: unknown): { url: string; fallback: boolean } => {
    const raw = String(rawValue || '').trim()
    if (!raw) return { url: '/', fallback: false }

    if (raw.startsWith('/') && !raw.startsWith('//')) {
      return { url: raw, fallback: false }
    }

    try {
      const parsed = new URL(raw, window.location.origin)
      if (parsed.origin === window.location.origin) {
        return { url: `${parsed.pathname}${parsed.search}${parsed.hash}` || '/', fallback: false }
      }
    } catch {
      // ignore and fallback below
    }

    return { url: '/', fallback: true }
  }

  const deleteTargetSlot = ref<number | null>(null)
  const showAdminEntry = computed(() => adminEntryUnlocked.value)

  const handleLogoClick = () => {
    if (adminEntryUnlocked.value) return
    adminLogoClickCount.value += 1
    if (adminLogoClickCount.value < ADMIN_ENTRY_UNLOCK_CLICKS) return
    adminEntryUnlocked.value = true
  }
  const currentUser = ref<null | { username: string; display_name?: string }>(null)
  let desktopMenuMediaQuery: MediaQueryList | null = null

  const existingSlots = computed(() => slots.value.filter(slot => slot.exists))
  const slotReadBlocked = computed(() => slots.value.some(slot => slot.readBlocked))
  const serverSaveConflict = computed(() => saveStore.serverSaveConflict)
  const serverSaveFieldAnomaly = computed(() => saveStore.serverSaveFieldAnomaly)
  const visibleFieldAnomalies = computed(() => serverSaveFieldAnomaly.value?.details.anomalies.slice(0, 5) ?? [])
  const hiddenFieldAnomalyCount = computed(() => Math.max(0, (serverSaveFieldAnomaly.value?.details.anomalies.length ?? 0) - visibleFieldAnomalies.value.length))
  const storageModeText = computed(() => (saveStore.storageMode === 'local' ? '本地存储（当前设备）' : '服务端持久化（当前账号）'))
  const storageModeDesc = computed(() =>
    saveStore.storageMode === 'local'
      ? '适合当前设备持续游玩，导入导出备份更直接。'
      : '适合登录账号后跨设备读取，并配合大厅、邮箱等在线功能。'
  )
  const storageIdentityHint = computed(() => {
    if (saveStore.storageMode === 'server') {
      const identity = saveStore.currentOnlineIdentity
      return identity?.save_id
        ? `当前运行存档 ID：${identity.save_id}，好友搜索会使用这个固定 ID。`
        : '服务端存档会在保存或载入时写入公开数字 ID；本地/导入档同步上来后即可参与好友搜索。'
    }
    return '本地存档不会生成公开数字 ID；如需好友搜索和邀请，请切换服务端持久化并保存或导入。'
  })
  const parseSavedAtTimestamp = (savedAt?: string) => {
    const timestamp = Date.parse(savedAt || '')
    return Number.isFinite(timestamp) ? timestamp : 0
  }
  const preferredOnlineSlot = computed(() =>
    [...existingSlots.value]
      .sort((left, right) => parseSavedAtTimestamp(right.savedAt) - parseSavedAtTimestamp(left.savedAt) || left.slot - right.slot)[0] ?? null
  )
  type MainMenuOnlineEntry = {
    id: string
    panel: PanelKey
    route: string
    title: string
    summary: string
    notice: string
    icon: Component
    featured?: boolean
  }
  const onlineMenuEntries = computed<MainMenuOnlineEntry[]>(() => [
    {
      id: 'friend-visits',
      panel: 'manor',
      route: '/game/manor',
      title: '好友来访',
      summary: '直接查看访客记录、留言墙和最近来访回声。',
      notice: '已带你进入庄园页，可继续查看来访记录与留言墙。',
      icon: Users
    },
    {
      id: 'neighbor-activity',
      panel: 'social',
      route: '/game/social',
      title: '邻里动态',
      summary: '查看邻里成员、公告、动态和待处理邀请。',
      notice: '已带你进入邻里面板，可继续查看成员、公告与动态。',
      icon: MessagesSquare
    },
    {
      id: 'today-festival',
      panel: 'festival',
      route: '/game/festival',
      title: '今日节会',
      summary: '查看当前节会、房间列表、邀请和活动奖励。',
      notice: '已带你进入节会面板，可继续查看房间、邀请与纪念册。',
      icon: CalendarDays
    },
    {
      id: 'society-bulletin',
      panel: 'society',
      route: '/game/society',
      title: '村社公告',
      summary: '直接查看村社公告、提案投票与公共建设进度。',
      notice: '已带你进入村社面板，可继续查看公告、会议与公共建设。',
      icon: ShieldCheck
    },
    {
      id: 'hot-manors',
      panel: 'manor',
      route: '/game/manor',
      title: '热门庄园',
      summary: '直接查看热门庄园榜、同主题收藏与公开展示。',
      notice: '已带你进入庄园页，可继续查看热门庄园榜与收藏列表。',
      icon: Home,
      featured: true
    }
  ])

  const selectedFarmDef = computed(() => FARM_MAP_DEFS.find(f => f.type === selectedMap.value))

  const clearPendingPostLoadState = () => {
    pendingPostLoadRoute.value = null
    pendingPostLoadNotice.value = null
  }

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
    publicConfigFetchFallback.value = false
    try {
      const res = await fetch('/api/public-config', { credentials: 'include' })
      const data = await res.json()
      if (!data?.ok) {
        publicConfigFetchFallback.value = true
        publicConfigStatus.value = null
        publicConfigReadonlyFields.value = []
        publicConfigReturnUrlFallback.value = false
        addLog('公共配置接口返回失败，继续使用本地默认菜单配置。')
        return
      }
      const safeReturnUrl = resolveSafeReturnButtonUrl(data.taoyuan_return_button_url)
      menuConfig.value = {
        returnButtonEnabled: data.taoyuan_return_button_enabled !== false,
        returnButtonText: data.taoyuan_return_button_text || '返回首页',
        returnButtonUrl: safeReturnUrl.url,
        aboutButtonEnabled: data.taoyuan_about_button_enabled !== false,
        aboutButtonText: data.taoyuan_about_button_text || '关于游戏',
        aboutDialogTitle: data.taoyuan_about_dialog_title || '关于桃源乡',
        aboutDialogContent: data.taoyuan_about_dialog_content || '欢迎来到桃源乡。',
      }
      publicConfigStatus.value = data.officialManagedStatus || null
      publicConfigReadonlyFields.value = Array.isArray(data.readonlyManagedFields) ? data.readonlyManagedFields : []
      publicConfigReturnUrlFallback.value = Boolean(data.taoyuan_return_button_url_fallback) || safeReturnUrl.fallback
      if (publicConfigReturnUrlFallback.value) {
        addLog('公共配置中的返回链接不安全，已自动回退为站内首页。')
      }
    } catch {
      publicConfigFetchFallback.value = true
      publicConfigStatus.value = null
      publicConfigReadonlyFields.value = []
      publicConfigReturnUrlFallback.value = false
      addLog('公共配置拉取失败，继续使用本地默认菜单配置。')
    }
  }

  const handleReturnToLottery = () => {
    const safeReturnUrl = resolveSafeReturnButtonUrl(menuConfig.value.returnButtonUrl)
    if (safeReturnUrl.fallback) {
      addLog('返回链接校验失败，已回退为站内首页。')
    }
    window.location.assign(safeReturnUrl.url)
  }

  const openAuth = (mode: 'login' | 'register') => {
    void router.push({ name: 'auth', query: { mode, redirect: '/' } })
  }

  const handleLogout = async () => {
    let logoutRequestFailed = false
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'include' })
      logoutRequestFailed = !response.ok
    } catch {
      logoutRequestFailed = true
      addLog('退出登录请求失败，已继续执行本地会话刷新。')
    }
    await initCurrentAccount()
    saveStore.reloadAccountScopedState()
    mailboxStore.resetForAccountChange()
    await loadCurrentUser()
    if (saveStore.storageMode === 'server') {
      await saveStore.syncPendingServerSaves()
    }
    saveStore.refreshPendingServerState()
    await refreshSlots()
    if (currentUser.value) {
      showFloat('退出登录未完成，请稍后重试。', 'danger')
      return
    }
    showFloat(logoutRequestFailed ? '本地状态已刷新，如仍显示已登录请重试。' : '已退出登录', logoutRequestFailed ? 'danger' : 'success')
  }

  const handleOpenGuide = () => {
    void router.push({ name: 'guide' })
  }

  const handleOpenGuideBook = () => {
    void router.push({ name: 'guide-book' })
  }

  const handleOpenHall = () => {
    void router.push('/hall')
  }

  const openAnnouncementHistory = () => {
    showAnnouncementHistory.value = true
    void announcementStore.fetchHistory()
  }

  const handleAnnouncementHistoryCta = async (announcement: TaoyuanAnnouncement) => {
    if (!announcement.cta_url) return
    try {
      await openAnnouncementTarget(announcement.cta_url, router)
      showAnnouncementHistory.value = false
    } catch {
      showFloat('公告链接暂时无法打开，请稍后重试。', 'danger')
    }
  }

  const handleOpenAdmin = () => {
    void router.push('/admin')
  }

  const aboutDialogHtml = computed(() => renderRichContent(menuConfig.value.aboutDialogContent || '欢迎来到桃源乡。'))

  const switchMode = async (mode: 'local' | 'server') => {
    saveStore.setStorageMode(mode)
    if (mode === 'server') {
      await saveStore.syncPendingServerSaves()
    }
    await refreshSlots()
  }

  const toggleSlotMenu = (slot: number) => {
    slotMenuOpen.value = slotMenuOpen.value === slot ? null : slot
  }

  const handleBackToMenu = () => {
    clearPendingPostLoadState()
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
    if (gameStore.currentLocationGroup === 'frontier') return '/game/region-map'
    return '/game/farm'
  }

  const navigateAfterLoad = () => {
    const targetRoute = pendingPostLoadRoute.value || resolveLoadedGameRoute()
    const notice = pendingPostLoadNotice.value
    clearPendingPostLoadState()
    if (notice) {
      addLog(notice)
    }
    void router.push(targetRoute)
  }

  const warnGuestSaveUnavailable = () => {
    if (currentUser.value) return
    const msg = saveStore.storageMode === 'server'
      ? '当前未登录，服务端存档需要先登录；也可以切换为本地存储后开始。'
      : '当前未登录，进度仅保存在当前浏览器本地；建议注册账号后使用服务端持久化。'
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
    clearPendingPostLoadState()
    if (!currentUser.value && saveStore.storageMode === 'server') {
      warnGuestSaveUnavailable()
      return
    }
    // 分配空闲存档槽位
    const slot = await saveStore.assignNewSlot()
    if (slot < 0) {
      showFloat(saveStore.getSlotAllocationBlockReason() || '存档槽位已满，请先删除一个旧存档。', 'danger')
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
          daysSinceAutoProduct: 0,
          daysSinceGrazingProduct: 0,
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
          daysSinceAutoProduct: 0,
          daysSinceGrazingProduct: 0,
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
    const targetStorageMode = saveStore.storageMode
    const savedInitialSlot = await saveStore.saveToSlot(slot)
    if (!savedInitialSlot || saveStore.lastSaveResultStatus === 'queued') {
      const fallbackMessage = targetStorageMode === 'server'
        ? '服务端首档暂未写入，公告和邮件奖励需要先保存到服务端存档后领取。'
        : '本地首档暂未保存，请进入游戏后尽快手动保存。'
      const message = saveStore.lastServerSyncMessage
        || saveStore.lastSaveErrorMessage
        || fallbackMessage
      showFloat(message, savedInitialSlot ? 'accent' : 'danger')
    }
    warnGuestSaveUnavailable()
    void router.push('/game')
  }

  const loadGameFromSlot = async (slot: number, options: { route?: string; notice?: string } = {}) => {
    pendingPostLoadRoute.value = options.route ?? null
    pendingPostLoadNotice.value = options.notice ?? null
    if (await saveStore.loadFromSlot(slot)) {
      if (playerStore.needsIdentitySetup) {
        // 旧存档没有性别/名字数据，先让玩家设置
        showIdentitySetup.value = true
      } else {
        navigateAfterLoad()
      }
      return
    }
    const message = saveStore.lastLoadErrorMessage || `存档 ${slot + 1} 加载失败，请刷新存档列表后重试。`
    showFloat(message, 'danger')
    addLog(message)
    clearPendingPostLoadState()
  }

  const handleLoadGame = async (slot: number) => {
    await loadGameFromSlot(slot)
  }

  /** 旧存档身份设置完成 */
  const handleIdentityConfirm = async () => {
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value)
    showIdentitySetup.value = false
    if (!(await saveStore.autoSave())) {
      showFloat('角色信息已更新，但当前存档写回失败，请尽快手动保存。', 'danger')
    }
    navigateAfterLoad()
  }

  const openOnlinePanelFromMenu = async (entry: MainMenuOnlineEntry) => {
    const targetSlot = preferredOnlineSlot.value
    if (!targetSlot) {
      const message = '当前还没有可带入联机世界的旅程，请先开始新的旅程。'
      showFloat(message, 'danger')
      addLog(message)
      return
    }
    await loadGameFromSlot(targetSlot.slot, {
      route: entry.route,
      notice: entry.notice
    })
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

  const handleDesktopMenuChange = (event: MediaQueryListEvent) => {
    isDesktopMenu.value = event.matches
    slotMenuOpen.value = null
  }

  const triggerImport = () => {
    clearImportNotice()
    fileInputRef.value?.click()
  }

  const revealImportNotice = () => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      importNoticePanelRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  const setImportNotice = (notice: ImportNotice) => {
    importNotice.value = notice
    revealImportNotice()
  }

  const clearImportNotice = () => {
    importNotice.value = null
  }

  const buildImportSuccessMessage = (slot: number) => {
    if (saveStore.storageMode === 'server') {
      return saveStore.lastSaveResultStatus === 'queued'
        ? `已导入到存档 ${slot + 1}，服务恢复后会补传并写入公开存档 ID。`
        : `已导入到服务端存档 ${slot + 1}，公开存档 ID 已随服务端保存写回。`
    }
    return `已导入到本地存档 ${slot + 1}；切到服务端保存后会生成公开存档 ID。`
  }

  const buildImportFailureMessage = () => {
    if (saveStore.serverSaveFieldAnomaly) {
      return '检测到云存档字段异常，请在弹窗中确认是否修复后强制保存。'
    }
    if (saveStore.lastSaveResultStatus === 'conflict') {
      return '云存档有新版本，请在上方比较后选择要保存哪一个。'
    }
    return saveStore.lastSaveErrorMessage || saveStore.lastLoadErrorMessage || '存档文件无效或已损坏。'
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
    const observed = entry.observed_value !== undefined && entry.observed_value !== null ? ` · 当前 ${String(entry.observed_value)}` : ''
    const limit = entry.limit !== undefined && entry.limit !== null ? ` · 限制 ${String(entry.limit)}` : ''
    const normalized = entry.normalized_value !== undefined && entry.normalized_value !== null
      ? ` -> ${String(entry.normalized_value)}`
      : ''
    return `${fieldPath}${action}${observed}${limit}${normalized}`
  }

  const handleResolveServerConflict = async (choice: 'local' | 'remote') => {
    if (resolvingConflict.value) return
    const conflictSlot = serverSaveConflict.value?.slot ?? null
    resolvingConflict.value = true
    const ok = await saveStore.resolveServerSaveConflict(choice)
    resolvingConflict.value = false
    await refreshSlots()

    const message = ok
      ? saveStore.lastServerSyncMessage || (choice === 'local' ? '已保存这份副本并覆盖服务端存档。' : '已改用服务端存档。')
      : saveStore.lastSaveErrorMessage || '处理云存档冲突失败。'
    showFloat(message, ok ? 'success' : 'danger')
    addLog(message)
    setImportNotice({
      tone: ok ? 'success' : 'danger',
      message,
      slot: ok ? conflictSlot : null
    })
  }

  const handleLoadImportedSlot = async () => {
    const slot = importNotice.value?.slot
    if (slot === null || slot === undefined) return
    clearImportNotice()
    await loadGameFromSlot(slot)
  }

  const handleDismissServerFieldAnomaly = () => {
    saveStore.dismissServerSaveFieldAnomaly()
    setImportNotice({
      tone: 'danger',
      message: '已暂不处理云存档字段异常，服务端旧档仍保留。',
      slot: null
    })
  }

  const handleRepairServerFieldAnomaly = async () => {
    if (repairingFieldAnomaly.value) return
    const anomalySlot = serverSaveFieldAnomaly.value?.slot ?? null
    repairingFieldAnomaly.value = true
    const ok = await saveStore.forceRepairServerSaveFieldAnomaly()
    repairingFieldAnomaly.value = false
    await refreshSlots()

    if (!ok) {
      const message = saveStore.lastSaveResultStatus === 'conflict'
        ? '云存档又有新版本，请先比较导入存档和服务端存档。'
        : saveStore.lastSaveErrorMessage || '修复并强制保存失败，服务端旧档仍保留。'
      showFloat(message, saveStore.lastSaveResultStatus === 'conflict' ? 'accent' : 'danger')
      addLog(message)
      setImportNotice({
        tone: saveStore.lastSaveResultStatus === 'conflict' ? 'accent' : 'danger',
        message,
        slot: null
      })
      return
    }

    const message = saveStore.lastServerSyncMessage || '已修复异常字段并保存到服务端存档。'
    showFloat(message, 'success')
    addLog(message)
    setImportNotice({
      tone: 'success',
      message,
      slot: anomalySlot
    })
  }

  const handleImportFile = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setImportNotice({ tone: 'accent', message: '正在导入存档...', slot: null })
      const slotAllocationBlockReason = saveStore.getSlotAllocationBlockReason()
      if (slotAllocationBlockReason) {
        showFloat(slotAllocationBlockReason, 'danger')
        setImportNotice({ tone: 'danger', message: slotAllocationBlockReason, slot: null })
        addLog(slotAllocationBlockReason)
        input.value = ''
        return
      }
      // 找到第一个空槽位导入，没有则提示
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        const message = '存档槽位已满，请先删除一个旧存档。'
        showFloat(message, 'danger')
        setImportNotice({ tone: 'danger', message, slot: null })
        addLog(message)
      } else {
        void (async () => {
          if (await saveStore.importSave(emptySlot.slot, content)) {
            await refreshSlots()
            const message = buildImportSuccessMessage(emptySlot.slot)
            showFloat(message, 'success')
            setImportNotice({ tone: 'success', message, slot: emptySlot.slot })
            addLog(message)
          } else {
            const message = buildImportFailureMessage()
            if (saveStore.lastSaveResultStatus === 'conflict' || saveStore.serverSaveFieldAnomaly) {
              await refreshSlots()
            }
            showFloat(message, saveStore.lastSaveResultStatus === 'conflict' || saveStore.serverSaveFieldAnomaly ? 'accent' : 'danger')
            setImportNotice({
              tone: saveStore.lastSaveResultStatus === 'conflict' || saveStore.serverSaveFieldAnomaly ? 'accent' : 'danger',
              message,
              slot: saveStore.lastSaveResultStatus === 'conflict' || saveStore.serverSaveFieldAnomaly ? emptySlot.slot : null
            })
            addLog(message)
          }
        })()
      }
      input.value = ''
    }
    reader.readAsText(file)
  }

  onMounted(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      desktopMenuMediaQuery = window.matchMedia('(min-width: 1280px)')
      isDesktopMenu.value = desktopMenuMediaQuery.matches
      if (typeof desktopMenuMediaQuery.addEventListener === 'function') {
        desktopMenuMediaQuery.addEventListener('change', handleDesktopMenuChange)
      } else {
        desktopMenuMediaQuery.addListener(handleDesktopMenuChange)
      }
    }
    void (async () => {
      await initCurrentAccount()
      saveStore.reloadAccountScopedState()
      mailboxStore.resetForAccountChange()
      if (saveStore.storageMode === 'server') {
        await saveStore.syncPendingServerSaves()
      }
      await refreshSlots()
      await loadCurrentUser()
    })()
    void loadMenuConfig()
  })

  onUnmounted(() => {
    if (!desktopMenuMediaQuery) return
    if (typeof desktopMenuMediaQuery.removeEventListener === 'function') {
      desktopMenuMediaQuery.removeEventListener('change', handleDesktopMenuChange)
    } else {
      desktopMenuMediaQuery.removeListener(handleDesktopMenuChange)
    }
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
    padding: 0;
    border: 0;
    appearance: none;
    background: url(@/assets/logo.png) center / contain no-repeat;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .logo:focus-visible {
    outline: 1px solid rgba(200, 164, 92, 0.55);
    outline-offset: 4px;
  }

  .main-menu-about-markdown :deep(p),
  .main-menu-about-markdown :deep(ul),
  .main-menu-about-markdown :deep(ol),
  .main-menu-about-markdown :deep(blockquote),
  .main-menu-about-markdown :deep(figure),
  .main-menu-about-markdown :deep(h1),
  .main-menu-about-markdown :deep(h2),
  .main-menu-about-markdown :deep(h3),
  .main-menu-about-markdown :deep(pre),
  .main-menu-about-markdown :deep(table) {
    margin: 0 0 10px;
  }

  .main-menu-about-markdown :deep(ul),
  .main-menu-about-markdown :deep(ol) {
    padding-left: 18px;
  }

  .main-menu-about-markdown :deep(a) {
    color: rgb(var(--color-accent));
    text-decoration: underline;
  }

  .main-menu-about-markdown :deep(blockquote) {
    padding-left: 10px;
    border-left: 2px solid rgba(200, 164, 92, 0.35);
    color: rgb(var(--color-text));
  }

  .main-menu-about-markdown :deep(figure) {
    margin-left: 0;
    margin-right: 0;
  }

  .main-menu-about-markdown :deep(figcaption) {
    margin-top: 6px;
    font-size: 0.6875rem;
    color: rgb(var(--color-muted));
    text-align: center;
  }

  .main-menu-about-markdown :deep(hr) {
    border: 0;
    border-top: 1px solid rgba(200, 164, 92, 0.16);
    margin: 12px 0;
  }

  .main-menu-about-markdown :deep(img) {
    display: block;
    max-width: 100%;
    border-radius: 4px;
    margin: 8px 0;
    border: 1px solid rgba(200, 164, 92, 0.12);
  }

  .main-menu-about-markdown :deep(table) {
    width: 100%;
    border-collapse: collapse;
  }

  .main-menu-about-markdown :deep(th),
  .main-menu-about-markdown :deep(td) {
    border: 1px solid rgba(200, 164, 92, 0.14);
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  .main-menu-online-entry {
    border: 1px solid var(--color-border-subtle);
    border-radius: 2px;
    padding: 10px 12px;
    background: rgb(var(--color-success-rgb) / 0.08);
    transition:
      border-color 0.15s,
      background-color 0.15s,
      transform 0.15s;
  }

  .main-menu-online-entry:hover {
    border-color: var(--color-border);
    background: rgb(var(--color-accent-rgb) / 0.1);
    transform: translateY(-1px);
  }

  .main-menu-online-entry-title {
    color: rgb(var(--color-accent));
    font-size: 0.75rem;
    line-height: 1.45;
  }

  .main-menu-online-entry-summary {
    margin-top: 6px;
    color: rgb(var(--color-muted));
    font-size: 0.625rem;
    line-height: 1.6;
  }

  .main-menu-online-entry-chip {
    flex-shrink: 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: 2px;
    padding: 2px 6px;
    color: rgb(var(--color-accent));
    background: rgb(var(--color-accent-rgb) / 0.06);
    font-size: 0.625rem;
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

  }
</style>
