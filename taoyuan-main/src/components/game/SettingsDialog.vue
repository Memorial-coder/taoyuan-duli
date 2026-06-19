<template>
  <Transition name="panel-fade">
    <div
      v-if="open"
      class="game-modal-overlay settings-dialog-overlay fixed inset-0 bg-black/70 flex items-start md:items-center justify-center z-50 p-4 overflow-y-auto"
      data-testid="settings-dialog-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="game-panel settings-dialog-shell w-full text-center relative"
        :class="activeTab === 'shortcuts' ? 'max-w-lg' : 'max-w-xs'"
        data-testid="settings-dialog"
      >
        <button
          type="button"
          class="settings-dialog-close"
          aria-label="关闭设置"
          data-testid="settings-dialog-close"
          @click.stop="$emit('close')"
        >
          <X :size="18" aria-hidden="true" />
        </button>
        <Divider title class="settings-dialog-title my-4" label="设置" />
        <!-- 分类导航 -->
        <div class="settings-dialog-tabs grid grid-cols-4 justify-center gap-1 mb-3">
          <button
            v-for="tab in SETTINGS_TABS"
            :key="tab.key"
            class="settings-dialog-tab text-xs py-1 px-3 border rounded-xs transition-colors"
            :class="activeTab === tab.key ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted hover:text-text'"
            :data-testid="`settings-tab-${tab.key}`"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" :size="12" class="inline-block align-[-2px] mr-1" />
            {{ tab.label }}
          </button>
        </div>

        <div class="settings-dialog-body flex flex-col space-y-3">
          <Transition name="tab-panel-switch" mode="out-in">
          <div :key="activeTab" class="settings-dialog-tab-panel">
          <!-- ===== 通用 ===== -->
          <template v-if="activeTab === 'general'">
            <div class="settings-dialog-scroll max-h-[40vh] overflow-y-auto">
              <!-- 时间控制 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1 mb-2">
                <p class="text-xs text-muted mb-2">时间控制</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button :icon="isManualPaused ? Play : Pause" :icon-size="12" class="py-1 px-3" @click="toggleManualPause">
                    {{ isManualPaused ? '继续' : '暂停' }}
                  </Button>
                  <Button class="py-1 px-3" @click="cycleSpeed">速度 {{ gameSpeed }}×</Button>
                </div>
              </div>

              <!-- 音频控制 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1 mb-2">
                <p class="text-xs text-muted mb-2">音频</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button :icon="sfxEnabled ? Volume2 : VolumeX" :icon-size="12" class="py-1 px-3" @click="toggleSfx">音效</Button>
                  <Button :icon="bgmEnabled ? Headphones : HeadphoneOff" :icon-size="12" class="py-1 px-3" @click="toggleBgm">音乐</Button>
                </div>
              </div>

              <!-- 新手提示 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1 mb-2">
                <p class="text-xs text-muted mb-2">新手提示</p>
                <p class="text-[0.625rem] text-muted/50 mb-2">柳村长的晨间建议和面板引导文字</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button class="py-1 px-3" :class="{ '!bg-accent !text-bg': tutorialStore.enabled }" @click="tutorialStore.enabled = true">
                    开
                  </Button>
                  <Button
                    class="py-1 px-3"
                    :class="{ '!bg-accent !text-bg': !tutorialStore.enabled }"
                    @click="tutorialStore.enabled = false"
                  >
                    关
                  </Button>
                </div>
              </div>

              <!-- WebDAV 云同步 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs text-muted">WebDAV 云同步</p>
                  <div class="flex space-x-1">
                    <Button
                      class="py-0.5 px-2 text-[0.625rem]"
                      :class="{ '!bg-accent !text-bg': webdavConfig.enabled }"
                      @click="setWebdavEnabled(true)"
                    >
                      开
                    </Button>
                    <Button
                      class="py-0.5 px-2 text-[0.625rem]"
                      :class="{ '!bg-accent !text-bg': !webdavConfig.enabled }"
                      @click="setWebdavEnabled(false)"
                    >
                      关
                    </Button>
                  </div>
                </div>
                <template v-if="webdavConfig.enabled">
                  <div class="flex flex-col space-y-2">
                    <div>
                      <label class="text-[0.625rem] text-muted mb-0.5 block">服务器地址</label>
                      <input
                        v-model="webdavConfig.serverUrl"
                        placeholder="请输入WebDAV云同步服务器地址"
                        class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors"
                        @change="saveWebdavConfig"
                      />
                    </div>
                    <div>
                      <label class="text-[0.625rem] text-muted mb-0.5 block">存储路径</label>
                      <input
                        v-model="webdavConfig.path"
                        placeholder="如果没有路径需求的话可以为空"
                        class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors"
                        @change="saveWebdavConfig"
                      />
                      <p class="text-[0.625rem] text-muted/50 mt-0.5">填写网盘中已有的文件夹名，留空则存到根目录</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[0.625rem] text-muted mb-0.5 block">用户名</label>
                        <input
                          v-model="webdavConfig.username"
                          placeholder="请输入用户名"
                          class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors"
                          @change="saveWebdavConfig"
                        />
                      </div>
                      <div>
                        <label class="text-[0.625rem] text-muted mb-0.5 block">密码</label>
                        <input
                          v-model="webdavConfig.password"
                          type="password"
                          placeholder="请输入密码"
                          class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none placeholder:text-muted/40 transition-colors"
                          @change="saveWebdavConfig"
                        />
                      </div>
                    </div>
                    <Button
                      class="py-1 px-3 text-xs w-full justify-center"
                      :disabled="webdavTestStatus === 'testing' || !webdavConfig.serverUrl"
                      @click="handleTestWebdav"
                    >
                      {{ webdavTestStatus === 'testing' ? '测试中...' : '测试连接' }}
                    </Button>
                    <p v-if="webdavTestStatus === 'success'" class="text-success text-xs text-center mt-1 break-words">连接成功</p>
                    <p v-if="webdavTestStatus === 'failed'" class="text-danger text-xs text-center mt-1 break-words">
                      {{ webdavTestError || '连接失败' }}
                    </p>
                    <div v-if="webdavTraceLogs.length" class="border border-accent/20 rounded-xs p-2 bg-bg/40">
                      <div class="flex items-center justify-between mb-1">
                        <p class="text-[0.625rem] text-muted">请求流程日志</p>
                        <button class="text-[0.625rem] text-muted hover:text-text" @click="clearWebdavTrace">清空</button>
                      </div>
                      <div class="max-h-28 overflow-y-auto text-left">
                        <p v-for="(line, idx) in webdavTraceLogs" :key="idx" class="text-[0.625rem] text-muted/80 leading-4 break-all">
                          {{ line }}
                        </p>
                      </div>
                      <button class="webdav-log-copy text-[0.625rem] text-muted hover:text-text">复制日志</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- ===== 外观 ===== -->
          <template v-if="activeTab === 'display'">
            <!-- 字体大小 -->
            <div class="settings-dialog-card border border-accent/20 rounded-xs" data-testid="settings-font-size-card">
              <p class="text-xs text-muted mb-2">字体大小</p>
              <div class="settings-dialog-stepper flex items-center justify-center space-x-3">
                <Button
                  class="settings-stepper-btn py-1 px-3"
                  :icon="Minus"
                  :icon-size="12"
                  :disabled="settingsStore.fontSize <= MIN_FONT_SIZE"
                  data-testid="settings-font-size-decrease"
                  @click="settingsStore.changeFontSize(-1)"
                />
                <span class="settings-stepper-value text-sm w-8 text-center" data-testid="settings-font-size-value">{{ settingsStore.fontSize }}</span>
                <Button
                  class="settings-stepper-btn py-1 px-3"
                  :icon="Plus"
                  :icon-size="12"
                  :disabled="settingsStore.fontSize >= MAX_FONT_SIZE"
                  data-testid="settings-font-size-increase"
                  @click="settingsStore.changeFontSize(1)"
                />
              </div>
            </div>

            <!-- 页面宽度 -->
            <div class="settings-dialog-card border border-accent/20 rounded-xs" data-testid="settings-page-width-card">
              <p class="text-xs text-muted mb-2">页面宽度</p>
              <div class="settings-segmented-control" role="group" aria-label="页面宽度模式">
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.pageWidthMode === 'responsive' }"
                  data-testid="settings-page-width-responsive"
                  @click="settingsStore.setPageWidthMode('responsive')"
                >
                  <Maximize2 :size="12" />
                  <span>响应式</span>
                </button>
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.pageWidthMode === 'custom' }"
                  data-testid="settings-page-width-custom"
                  @click="settingsStore.setPageWidthMode('custom')"
                >
                  <Percent :size="12" />
                  <span>自定义</span>
                </button>
              </div>
              <template v-if="settingsStore.pageWidthMode === 'custom'">
                <div class="settings-dialog-stepper settings-page-width-stepper flex items-center justify-center space-x-3 mt-3">
                  <Button
                    class="settings-stepper-btn py-1 px-3"
                    :icon="Minus"
                    :icon-size="12"
                    :disabled="settingsStore.pageWidthPercent <= MIN_PAGE_WIDTH_PERCENT"
                    data-testid="settings-page-width-decrease"
                    @click="settingsStore.changePageWidthPercent(-PAGE_WIDTH_PERCENT_STEP)"
                  />
                  <span class="settings-stepper-value text-sm text-center" data-testid="settings-page-width-value">{{ settingsStore.pageWidthPercent }}%</span>
                  <Button
                    class="settings-stepper-btn py-1 px-3"
                    :icon="Plus"
                    :icon-size="12"
                    :disabled="settingsStore.pageWidthPercent >= MAX_PAGE_WIDTH_PERCENT"
                    data-testid="settings-page-width-increase"
                    @click="settingsStore.changePageWidthPercent(PAGE_WIDTH_PERCENT_STEP)"
                  />
                </div>
                <input
                  class="settings-page-width-range mt-3"
                  type="range"
                  :min="MIN_PAGE_WIDTH_PERCENT"
                  :max="MAX_PAGE_WIDTH_PERCENT"
                  :step="PAGE_WIDTH_PERCENT_STEP"
                  :value="settingsStore.pageWidthPercent"
                  data-testid="settings-page-width-range"
                  @input="handlePageWidthInput"
                />
              </template>
            </div>

            <div class="settings-dialog-card border border-accent/20 rounded-xs" data-testid="settings-desktop-layout-card">
              <p class="text-xs text-muted mb-2">桌面布局</p>
              <div class="settings-segmented-control" role="group" aria-label="桌面布局模式">
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.desktopLayoutMode === 'adaptive' }"
                  data-testid="settings-desktop-layout-adaptive"
                  @click="settingsStore.setDesktopLayoutMode('adaptive')"
                >
                  <LayoutGrid :size="12" />
                  <span>多列</span>
                </button>
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.desktopLayoutMode === 'classic' }"
                  data-testid="settings-desktop-layout-classic"
                  @click="settingsStore.setDesktopLayoutMode('classic')"
                >
                  <Rows3 :size="12" />
                  <span>旧版</span>
                </button>
              </div>
            </div>

            <!-- 配色主题 -->
            <div class="settings-dialog-card border border-accent/20 rounded-xs">
              <p class="text-xs text-muted mb-2">配色主题</p>
              <div class="flex items-center justify-center space-x-2">
                <button
                  v-for="t in THEMES"
                  :key="t.key"
                  class="settings-theme-swatch border rounded-xs flex items-center justify-center text-[0.625rem] transition-colors"
                  :class="settingsStore.theme === t.key ? 'border-accent' : 'border-accent/20'"
                  :style="{ backgroundColor: t.bg, color: t.text }"
                  :title="t.name"
                  :data-testid="`settings-theme-${t.key}`"
                  @click="settingsStore.changeTheme(t.key)"
                >
                  {{ t.name.charAt(0) }}
                </button>
              </div>
            </div>

            <!-- NPC 照片 -->
            <div class="settings-dialog-card border border-accent/20 rounded-xs" data-testid="settings-npc-portraits-card">
              <p class="text-xs text-muted mb-2">人物照片</p>
              <div class="flex items-center justify-center space-x-2">
                <Button
                  class="py-1 px-3"
                  :class="{ '!bg-accent !text-bg': settingsStore.npcPortraitsEnabled }"
                  data-testid="settings-npc-portraits-on"
                  @click="settingsStore.npcPortraitsEnabled = true"
                >
                  开
                </Button>
                <Button
                  class="py-1 px-3"
                  :class="{ '!bg-accent !text-bg': !settingsStore.npcPortraitsEnabled }"
                  data-testid="settings-npc-portraits-off"
                  @click="settingsStore.npcPortraitsEnabled = false"
                >
                  关
                </Button>
              </div>
            </div>

            <!-- 田地显示 -->
            <div class="settings-dialog-card border border-accent/20 rounded-xs" data-testid="settings-farm-display-card">
              <p class="text-xs text-muted mb-2">田地显示</p>
              <div class="settings-segmented-control" role="group" aria-label="田地显示形式">
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.farmPlotDisplayMode === 'classic' }"
                  data-testid="settings-farm-display-classic"
                  @click="settingsStore.farmPlotDisplayMode = 'classic'"
                >
                  <Square :size="12" />
                  <span>原版</span>
                </button>
                <button
                  type="button"
                  class="settings-segmented-control__button"
                  :class="{ 'settings-segmented-control__button--active': settingsStore.farmPlotDisplayMode === 'image' }"
                  data-testid="settings-farm-display-image"
                  @click="settingsStore.farmPlotDisplayMode = 'image'"
                >
                  <Sprout :size="12" />
                  <span>图片</span>
                </button>
              </div>
            </div>
          </template>

          <!-- ===== 通知 ===== -->
          <template v-if="activeTab === 'notification'">
            <div class="settings-dialog-scroll max-h-[40vh] overflow-y-auto flex flex-col space-y-3">
              <!-- 通知位置 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1">
                <p class="text-xs text-muted mb-2">弹出位置</p>
                <div class="grid grid-cols-3 gap-1 w-24 mx-auto">
                  <button
                    v-for="pos in QMSG_POSITIONS"
                    :key="pos.value"
                    class="w-8 h-6 border rounded-xs transition-colors flex items-center justify-center"
                    :class="
                      settingsStore.qmsgPosition === pos.value ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted'
                    "
                    :title="pos.label"
                    @click="settingsStore.changeQmsgPosition(pos.value)"
                  >
                    <component :is="pos.icon" :size="10" />
                  </button>
                </div>
              </div>

              <!-- 持续时间 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1">
                <p class="text-xs text-muted mb-2">持续时间</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    class="py-0 px-1.5"
                    :icon="Minus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgTimeout <= 500"
                    @click="changeTimeout(-500)"
                  />
                  <span class="text-xs w-12 text-center">{{ (settingsStore.qmsgTimeout / 1000).toFixed(1) }}s</span>
                  <Button
                    class="py-0 px-1.5"
                    :icon="Plus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgTimeout >= 10000"
                    @click="changeTimeout(500)"
                  />
                </div>
              </div>

              <!-- 最大数量 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1">
                <p class="text-xs text-muted mb-2">最大数量</p>
                <div class="flex items-center justify-center space-x-2">
                  <Button
                    class="py-0 px-1.5"
                    :icon="Minus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgMaxNums <= 1"
                    @click="changeMaxNums(-1)"
                  />
                  <span class="text-xs w-6 text-center">{{ settingsStore.qmsgMaxNums }}</span>
                  <Button
                    class="py-0 px-1.5"
                    :icon="Plus"
                    :icon-size="10"
                    :disabled="settingsStore.qmsgMaxNums >= 20"
                    @click="changeMaxNums(1)"
                  />
                </div>
              </div>

              <!-- 宽度限制 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1">
                <p class="text-xs text-muted mb-2">限制宽度</p>
                <div class="flex items-center justify-center space-x-1 mb-2">
                  <Button
                    class="py-0 px-2"
                    :class="settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : ''"
                    @click="setBool('qmsgIsLimitWidth', true)"
                  >
                    开
                  </Button>
                  <Button
                    class="py-0 px-2"
                    :class="!settingsStore.qmsgIsLimitWidth ? '!bg-accent/20 !text-accent !border-accent' : ''"
                    @click="setBool('qmsgIsLimitWidth', false)"
                  >
                    关
                  </Button>
                </div>
                <template v-if="settingsStore.qmsgIsLimitWidth">
                  <p class="text-xs text-muted mb-2">宽度(px)</p>
                  <div class="flex items-center justify-center space-x-2 mb-2">
                    <Button
                      class="py-0 px-1.5"
                      :icon="Minus"
                      :icon-size="10"
                      :disabled="settingsStore.qmsgLimitWidthNum <= 100"
                      @click="changeLimitWidth(-50)"
                    />
                    <span class="text-xs w-10 text-center">{{ settingsStore.qmsgLimitWidthNum }}</span>
                    <Button
                      class="py-0 px-1.5"
                      :icon="Plus"
                      :icon-size="10"
                      :disabled="settingsStore.qmsgLimitWidthNum >= 800"
                      @click="changeLimitWidth(50)"
                    />
                  </div>
                  <p class="text-xs text-muted mb-2">超出处理</p>
                  <div class="flex items-center justify-center space-x-1">
                    <Button
                      v-for="opt in WRAP_OPTIONS"
                      :key="opt.value"
                      class="!text-[0.625rem] py-0 px-1.5"
                      :class="settingsStore.qmsgLimitWidthWrap === opt.value ? '!bg-accent/20 !text-accent !border-accent' : ''"
                      @click="changeWrap(opt.value)"
                    >
                      {{ opt.label }}
                    </Button>
                  </div>
                </template>
              </div>

              <!-- 开关选项 -->
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1 flex flex-col space-y-2">
                <div v-for="opt in TOGGLE_OPTIONS" :key="opt.key" class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-muted">{{ opt.label }}</span>
                  <div class="flex items-center space-x-1">
                    <Button
                      class="py-0 px-2"
                      :class="settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : ''"
                      @click="setBool(opt.key, true)"
                    >
                      开
                    </Button>
                    <Button
                      class="py-0 px-2"
                      :class="!settingsStore[opt.key] ? '!bg-accent/20 !text-accent !border-accent' : ''"
                      @click="setBool(opt.key, false)"
                    >
                      关
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== 快捷键 ===== -->
          <template v-if="activeTab === 'shortcuts'">
            <div class="settings-dialog-scroll settings-shortcuts-panel flex flex-col space-y-2" data-testid="settings-shortcuts-panel">
              <div class="settings-dialog-card border border-accent/20 rounded-xs mr-1" data-testid="settings-shortcuts-toggle-card">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-muted">键盘快捷键</p>
                  <div class="flex shrink-0 items-center gap-1">
                    <Button
                      class="py-0.5 px-2 text-[0.625rem]"
                      :class="{ '!bg-accent !text-bg': settingsStore.keyboardShortcutsEnabled }"
                      data-testid="settings-shortcuts-enabled-on"
                      @click="settingsStore.keyboardShortcutsEnabled = true"
                    >
                      开
                    </Button>
                    <Button
                      class="py-0.5 px-2 text-[0.625rem]"
                      :class="{ '!bg-accent !text-bg': !settingsStore.keyboardShortcutsEnabled }"
                      data-testid="settings-shortcuts-enabled-off"
                      @click="settingsStore.keyboardShortcutsEnabled = false"
                    >
                      关
                    </Button>
                    <Button
                      class="py-0.5 px-2 text-[0.625rem]"
                      data-testid="settings-shortcuts-reset-all"
                      @click="resetAllShortcutBindings"
                    >
                      默认
                    </Button>
                  </div>
                </div>
              </div>

              <p
                v-if="shortcutCaptureMessage"
                class="settings-shortcut-message text-[0.625rem] leading-5"
                :class="shortcutCaptureTone === 'danger' ? 'text-danger' : 'text-accent'"
                data-testid="settings-shortcut-capture-message"
              >
                {{ shortcutCaptureMessage }}
              </p>

              <section
                v-for="group in shortcutGroups"
                :key="group.category"
                class="settings-dialog-card border border-accent/20 rounded-xs mr-1 text-left"
                :data-testid="`settings-shortcuts-group-${group.category}`"
              >
                <div class="mb-2 flex items-center justify-between">
                  <p class="text-xs text-accent">{{ group.label }}</p>
                  <span class="text-[0.625rem] text-muted">{{ group.actions.length }}</span>
                </div>
                <div class="flex flex-col divide-y divide-accent/10">
                  <div
                    v-for="action in group.actions"
                    :key="action.id"
                    class="settings-shortcut-row"
                    :data-testid="`settings-shortcut-row-${action.id}`"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ action.label }}</p>
                      <p class="truncate text-[0.625rem] text-muted">{{ action.description }}</p>
                    </div>
                    <div class="settings-shortcut-row-actions">
                      <button
                        type="button"
                        class="settings-shortcut-key"
                        :class="{ 'settings-shortcut-key--recording': editingShortcutId === action.id }"
                        :data-testid="`settings-shortcut-bind-${action.id}`"
                        @click="beginShortcutCapture(action.id)"
                      >
                        {{ editingShortcutId === action.id ? '录入中' : getShortcutBindingLabel(action.id) }}
                      </button>
                      <button
                        type="button"
                        class="settings-shortcut-mini"
                        :disabled="isShortcutAtDefault(action.id)"
                        :data-testid="`settings-shortcut-reset-${action.id}`"
                        @click="resetShortcutBinding(action.id)"
                      >
                        默认
                      </button>
                      <button
                        type="button"
                        class="settings-shortcut-mini"
                        :disabled="!settingsStore.getKeyboardShortcutBinding(action.id)"
                        :data-testid="`settings-shortcut-clear-${action.id}`"
                        @click="clearShortcutBinding(action.id)"
                      >
                        清除
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </template>
          </div>
          </Transition>
        </div>

        <!-- 存档管理（全局底部） -->
        <Button
          :icon="FolderOpen"
          :icon-size="12"
          class="settings-save-button py-1 px-3 w-full justify-center mt-3"
          data-testid="settings-save-manager-button"
          @click="showSaveManager = true"
        >
          存档管理
        </Button>
      </div>
    </div>
  </Transition>

  <!-- 存档管理弹窗 -->
  <Transition name="panel-fade">
    <SaveManager v-if="showSaveManager" @close="showSaveManager = false" />
  </Transition>
</template>

<script setup lang="ts">
  import { computed, ref, onMounted, onBeforeUnmount, type Component } from 'vue'
  import {
    X,
    Pause,
    Play,
    Volume2,
    VolumeX,
    Headphones,
    HeadphoneOff,
    FolderOpen,
    Minus,
    Plus,
    ArrowUpLeft,
    ArrowUp,
    ArrowUpRight,
    ArrowLeft,
    Circle,
    ArrowRight,
    ArrowDownLeft,
    ArrowDown,
    ArrowDownRight,
    Settings,
    Palette,
    Bell,
    Keyboard,
    Sprout,
    Square,
    Maximize2,
    Percent,
    LayoutGrid,
    Rows3
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import { useAudio } from '@/composables/useAudio'
  import { useGameClock } from '@/composables/useGameClock'
  import { useGameLog } from '@/composables/useGameLog'
  import {
    MAX_FONT_SIZE,
    MAX_PAGE_WIDTH_PERCENT,
    MIN_FONT_SIZE,
    MIN_PAGE_WIDTH_PERCENT,
    PAGE_WIDTH_PERCENT_STEP,
    useSettingsStore,
    type QmsgPosition,
    type QmsgLimitWidthWrap
  } from '@/stores/useSettingsStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useWebdav } from '@/composables/useWebdav'
  import { THEMES } from '@/data/themes'
  import SaveManager from '@/components/game/SaveManager.vue'
  import ClipboardJS from 'clipboard'
  import {
    KEYBOARD_SHORTCUT_CATEGORY_LABELS,
    KEYBOARD_SHORTCUT_DEFINITION_BY_ID,
    KEYBOARD_SHORTCUT_DEFINITIONS,
    areKeyboardShortcutBindingsEqual,
    formatKeyboardShortcutBinding,
    getKeyboardEventBinding,
    isReservedKeyboardShortcutBinding,
    type KeyboardShortcutActionId,
    type KeyboardShortcutBinding,
    type KeyboardShortcutCategory
  } from '@/data/keyboardShortcuts'
  import { setKeyboardShortcutCaptureActive } from '@/composables/useKeyboardShortcuts'

  type SettingsTab = 'general' | 'display' | 'notification' | 'shortcuts'
  type ShortcutCaptureTone = 'accent' | 'danger'

  type BoolSettingKey = 'qmsgIsLimitWidth' | 'qmsgAnimation' | 'qmsgAutoClose' | 'qmsgShowClose' | 'qmsgShowIcon' | 'qmsgShowReverse'

  const SETTINGS_TABS: { key: SettingsTab; label: string; icon: Component }[] = [
    { key: 'general', label: '通用', icon: Settings },
    { key: 'display', label: '外观', icon: Palette },
    { key: 'notification', label: '通知', icon: Bell },
    { key: 'shortcuts', label: '快捷键', icon: Keyboard }
  ]

  const SHORTCUT_GROUP_ORDER: KeyboardShortcutCategory[] = ['system', 'navigation', 'tool', 'ui', 'miningCombat', 'movement']

  const QMSG_POSITIONS: { value: QmsgPosition; label: string; icon: Component }[] = [
    { value: 'topleft', label: '左上', icon: ArrowUpLeft },
    { value: 'top', label: '上', icon: ArrowUp },
    { value: 'topright', label: '右上', icon: ArrowUpRight },
    { value: 'left', label: '左', icon: ArrowLeft },
    { value: 'center', label: '中', icon: Circle },
    { value: 'right', label: '右', icon: ArrowRight },
    { value: 'bottomleft', label: '左下', icon: ArrowDownLeft },
    { value: 'bottom', label: '下', icon: ArrowDown },
    { value: 'bottomright', label: '右下', icon: ArrowDownRight }
  ]

  const WRAP_OPTIONS: { value: QmsgLimitWidthWrap; label: string }[] = [
    { value: 'no-wrap', label: '不处理' },
    { value: 'wrap', label: '换行' },
    { value: 'ellipsis', label: '省略号' }
  ]

  const TOGGLE_OPTIONS: { key: BoolSettingKey; label: string }[] = [
    { key: 'qmsgAnimation', label: '弹出动画' },
    { key: 'qmsgAutoClose', label: '自动关闭' },
    { key: 'qmsgShowClose', label: '显示关闭图标' },
    { key: 'qmsgShowIcon', label: '显示左侧图标' },
    { key: 'qmsgShowReverse', label: '弹出方向逆反' }
  ]

  defineProps<{ open: boolean }>()
  defineEmits<{ close: [] }>()

  const activeTab = ref<SettingsTab>('general')
  const { sfxEnabled, bgmEnabled, toggleSfx, toggleBgm } = useAudio()
  const { isManualPaused, gameSpeed, togglePause, cycleSpeed } = useGameClock()
  const { showFloat } = useGameLog()
  const settingsStore = useSettingsStore()
  const tutorialStore = useTutorialStore()
  const {
    webdavConfig,
    webdavTestStatus,
    webdavTestError,
    webdavTraceLogs,
    saveConfig: saveWebdavConfig,
    clearTrace: clearWebdavTrace,
    testConnection
  } = useWebdav()

  const showSaveManager = ref(false)
  const editingShortcutId = ref<KeyboardShortcutActionId | null>(null)
  const shortcutCaptureMessage = ref('')
  const shortcutCaptureTone = ref<ShortcutCaptureTone>('accent')
  let clipboard: ClipboardJS | null = null
  let shortcutCaptureListenerActive = false

  const shortcutGroups = computed(() => SHORTCUT_GROUP_ORDER.map(category => ({
    category,
    label: KEYBOARD_SHORTCUT_CATEGORY_LABELS[category],
    actions: KEYBOARD_SHORTCUT_DEFINITIONS.filter(action => action.category === category)
  })).filter(group => group.actions.length > 0))

  onMounted(() => {
    clipboard = new ClipboardJS('.webdav-log-copy', {
      text: () => webdavTraceLogs.value.join('\n')
    })
    clipboard.on('success', e => {
      e.clearSelection()
      showFloat('日志已复制', 'success')
    })
    clipboard.on('error', () => {
      document.body.classList.remove('select-none')
      showFloat('复制失败，请手动复制', 'danger')
    })
  })

  onBeforeUnmount(() => {
    stopShortcutCapture()
    clipboard?.destroy()
    clipboard = null
  })

  const handleTestWebdav = async () => {
    await testConnection()
  }

  const toggleManualPause = () => {
    togglePause()
  }

  const setWebdavEnabled = (val: boolean) => {
    webdavConfig.value.enabled = val
    saveWebdavConfig()
  }

  const changeTimeout = (delta: number) => {
    settingsStore.qmsgTimeout = Math.min(10000, Math.max(500, settingsStore.qmsgTimeout + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeMaxNums = (delta: number) => {
    settingsStore.qmsgMaxNums = Math.min(20, Math.max(1, settingsStore.qmsgMaxNums + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeLimitWidth = (delta: number) => {
    settingsStore.qmsgLimitWidthNum = Math.min(800, Math.max(100, settingsStore.qmsgLimitWidthNum + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeWrap = (value: QmsgLimitWidthWrap) => {
    settingsStore.qmsgLimitWidthWrap = value
    settingsStore.syncQmsgConfig()
  }

  const handlePageWidthInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    settingsStore.setPageWidthPercent(Number(target?.value ?? settingsStore.pageWidthPercent))
  }

  const setBool = (key: BoolSettingKey, value: boolean) => {
    settingsStore[key] = value
    settingsStore.syncQmsgConfig()
  }

  const getShortcutBindingLabel = (actionId: KeyboardShortcutActionId) => (
    formatKeyboardShortcutBinding(settingsStore.getKeyboardShortcutBinding(actionId))
  )

  const isShortcutAtDefault = (actionId: KeyboardShortcutActionId) => (
    areKeyboardShortcutBindingsEqual(
      settingsStore.getKeyboardShortcutBinding(actionId),
      KEYBOARD_SHORTCUT_DEFINITION_BY_ID[actionId].defaultBinding
    )
  )

  const findShortcutConflict = (actionId: KeyboardShortcutActionId, binding: KeyboardShortcutBinding) => (
    KEYBOARD_SHORTCUT_DEFINITIONS.find(action => (
      action.id !== actionId &&
      areKeyboardShortcutBindingsEqual(settingsStore.getKeyboardShortcutBinding(action.id), binding)
    )) ?? null
  )

  const stopShortcutCapture = () => {
    editingShortcutId.value = null
    setKeyboardShortcutCaptureActive(false)
    if (shortcutCaptureListenerActive && typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleShortcutCaptureKeydown, true)
      shortcutCaptureListenerActive = false
    }
  }

  const beginShortcutCapture = (actionId: KeyboardShortcutActionId) => {
    if (editingShortcutId.value === actionId) {
      stopShortcutCapture()
      shortcutCaptureMessage.value = ''
      return
    }

    stopShortcutCapture()
    editingShortcutId.value = actionId
    shortcutCaptureTone.value = 'accent'
    shortcutCaptureMessage.value = '录入中'
    setKeyboardShortcutCaptureActive(true)
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleShortcutCaptureKeydown, true)
      shortcutCaptureListenerActive = true
    }
  }

  const clearShortcutBinding = (actionId: KeyboardShortcutActionId) => {
    settingsStore.clearKeyboardShortcutBinding(actionId)
    shortcutCaptureTone.value = 'accent'
    shortcutCaptureMessage.value = `${KEYBOARD_SHORTCUT_DEFINITION_BY_ID[actionId].label} 已清除`
    showFloat('快捷键已清除', 'success')
  }

  const resetShortcutBinding = (actionId: KeyboardShortcutActionId) => {
    settingsStore.resetKeyboardShortcutBinding(actionId)
    shortcutCaptureTone.value = 'accent'
    shortcutCaptureMessage.value = `${KEYBOARD_SHORTCUT_DEFINITION_BY_ID[actionId].label} 已恢复默认`
    showFloat('快捷键已恢复默认', 'success')
  }

  const resetAllShortcutBindings = () => {
    settingsStore.resetKeyboardShortcutBindings()
    shortcutCaptureTone.value = 'accent'
    shortcutCaptureMessage.value = '已恢复全部默认键位'
    showFloat('快捷键已恢复默认', 'success')
  }

  function handleShortcutCaptureKeydown(event: KeyboardEvent) {
    if (!editingShortcutId.value) return
    event.preventDefault()
    event.stopPropagation()

    const actionId = editingShortcutId.value
    if (event.key === 'Escape') {
      shortcutCaptureTone.value = 'accent'
      shortcutCaptureMessage.value = '已取消录入'
      stopShortcutCapture()
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      clearShortcutBinding(actionId)
      stopShortcutCapture()
      return
    }

    const binding = getKeyboardEventBinding(event)
    if (!binding) {
      shortcutCaptureTone.value = 'danger'
      shortcutCaptureMessage.value = '这个键不能单独绑定'
      return
    }

    if (isReservedKeyboardShortcutBinding(binding)) {
      shortcutCaptureTone.value = 'danger'
      shortcutCaptureMessage.value = '该键位已被系统或浏览器保留'
      return
    }

    const conflict = findShortcutConflict(actionId, binding)
    if (conflict) {
      shortcutCaptureTone.value = 'danger'
      shortcutCaptureMessage.value = `已被「${conflict.label}」占用`
      return
    }

    settingsStore.setKeyboardShortcutBinding(actionId, binding)
    shortcutCaptureTone.value = 'accent'
    shortcutCaptureMessage.value = `${KEYBOARD_SHORTCUT_DEFINITION_BY_ID[actionId].label}：${formatKeyboardShortcutBinding(binding)}`
    showFloat('快捷键已更新', 'success')
    stopShortcutCapture()
  }
</script>

<style scoped>
  .settings-dialog-overlay {
    padding: calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .settings-dialog-shell {
    display: flex;
    max-height: calc(100vh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    max-height: calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .settings-dialog-close {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 20;
    display: inline-flex;
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 4px;
    color: rgb(var(--color-muted));
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .settings-dialog-close:hover,
  .settings-dialog-close:focus-visible {
    border-color: rgb(var(--color-accent) / 0.28);
    background: rgb(var(--color-accent) / 0.12);
    color: rgb(var(--color-text));
    outline: none;
  }

  .settings-dialog-title {
    min-height: 44px;
    padding-right: 44px;
    padding-left: 44px;
  }

  .settings-dialog-body {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding-right: 4px;
  }

  .settings-dialog-tabs {
    gap: 4px;
    margin-bottom: 12px;
  }

  .settings-dialog-tab {
    min-height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .settings-dialog-card {
    padding: 12px;
  }

  .settings-dialog-scroll {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }

  .settings-dialog-stepper {
    gap: 12px;
  }

  .settings-stepper-btn {
    min-width: 68px;
    min-height: 44px;
    padding: 0 12px;
  }

  .settings-stepper-value {
    min-width: 44px;
    flex-shrink: 0;
  }

  .settings-theme-swatch {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  .settings-page-width-stepper .settings-stepper-value {
    min-width: 56px;
  }

  .settings-page-width-range {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .settings-segmented-control {
    display: inline-flex;
    width: 100%;
    align-items: center;
    gap: 4px;
    padding: 3px;
    border: 1px solid rgb(var(--color-accent) / 0.18);
    border-radius: 4px;
    background: rgb(var(--color-bg) / 0.32);
  }

  .settings-segmented-control__button {
    display: inline-flex;
    flex: 1 1 0;
    min-height: 34px;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    color: rgb(var(--color-muted));
    font-size: 0.75rem;
    line-height: 1;
    transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease;
  }

  .settings-segmented-control__button:hover,
  .settings-segmented-control__button--active {
    border-color: rgb(var(--color-accent) / 0.48);
    background: rgb(var(--color-accent) / 0.14);
    color: rgb(var(--color-accent));
  }

  .settings-save-button {
    flex-shrink: 0;
    min-height: 40px;
  }

  .settings-shortcuts-panel {
    padding-right: 0;
  }

  .settings-shortcut-message {
    min-height: 20px;
    text-align: center;
  }

  .settings-shortcut-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 9px 0;
  }

  .settings-shortcut-row:first-child {
    padding-top: 0;
  }

  .settings-shortcut-row:last-child {
    padding-bottom: 0;
  }

  .settings-shortcut-row-actions {
    display: grid;
    grid-template-columns: minmax(86px, 1fr) 46px 46px;
    gap: 4px;
    min-width: 0;
  }

  .settings-shortcut-key,
  .settings-shortcut-mini {
    min-height: 32px;
    border: 1px solid rgb(var(--color-accent) / 0.2);
    border-radius: 3px;
    color: rgb(var(--color-text));
    font-size: 0.625rem;
    line-height: 1;
    transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease;
  }

  .settings-shortcut-key {
    padding: 0 8px;
    background: rgb(var(--color-bg) / 0.48);
    color: rgb(var(--color-accent));
    white-space: nowrap;
  }

  .settings-shortcut-key:hover,
  .settings-shortcut-key--recording {
    border-color: rgb(var(--color-accent) / 0.55);
    background: rgb(var(--color-accent) / 0.14);
  }

  .settings-shortcut-mini {
    padding: 0 4px;
    color: rgb(var(--color-muted));
  }

  .settings-shortcut-mini:hover:not(:disabled) {
    border-color: rgb(var(--color-accent) / 0.45);
    color: rgb(var(--color-accent));
  }

  .settings-shortcut-mini:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  @media (min-width: 520px) {
    .settings-shortcut-row {
      grid-template-columns: minmax(0, 1fr) minmax(190px, 0.72fr);
      align-items: center;
    }
  }

  @media (min-width: 768px) {
    .settings-dialog-overlay {
      padding: calc(24px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px));
    }

    .settings-dialog-shell {
      max-height: calc(100vh - 48px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
      max-height: calc(100dvh - 48px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    }
  }

  .yes-select {
    -webkit-user-select: unset;
    user-select: unset;
    -webkit-touch-callout: unset;
  }
</style>
