<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <BookOpen :size="14" />
        <span>收藏与资料</span>
      </div>
      <span class="text-xs text-muted">{{ achievementStore.perfectionPercent }}%</span>
    </div>

    <!-- 标签切换 -->
    <div class="flex space-x-1 mb-3 overflow-x-auto pb-0.5" style="scrollbar-width:none;-ms-overflow-style:none">
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'medals' }" @click="tab = 'medals'">大奖章</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'collection' }" @click="tab = 'collection'">图鉴</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'achievements' }" @click="tab = 'achievements'">成就</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'bundles' }" @click="tab = 'bundles'">祠堂</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'shipping' }" @click="tab = 'shipping'">出货</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'notes' }" @click="tab = 'notes'">笔记</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'chronicle' }" @click="tab = 'chronicle'">见闻册</Button>
      <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': tab === 'glossary' }" @click="openGlossaryTab">百科</Button>
    </div>

    <p class="text-[10px] text-muted mb-3">{{ currentTabHint }}</p>

    <!-- 收集大奖章 -->
    <template v-if="tab === 'medals'">
      <div class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div>
            <p class="text-sm text-accent">桃源大奖章</p>
            <p class="text-[10px] text-muted mt-0.5">把长期收集、秘藏验证、精通成长和特殊事件收进同一张补完账。</p>
          </div>
          <span class="text-xs text-accent whitespace-nowrap">{{ grandMedalOverallPercent }}%</span>
        </div>
        <div class="h-1.5 bg-bg rounded-xs border border-accent/10 mb-2">
          <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: grandMedalOverallPercent + '%' }" />
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div v-for="line in grandMedalSummaryLines" :key="line.label" class="border border-accent/10 rounded-xs px-2 py-1.5">
            <p class="text-[10px] text-muted">{{ line.label }}</p>
            <p class="text-xs text-text mt-0.5">{{ line.value }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button
          v-for="track in grandMedalTracks"
          :key="track.id"
          type="button"
          class="border border-accent/20 rounded-xs p-3 text-left hover:bg-accent/5 transition-colors"
          @click="tab = track.tabTarget"
        >
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="min-w-0">
              <p class="text-sm" :class="track.toneClass">{{ track.label }}</p>
              <p class="text-[10px] text-muted mt-0.5 leading-4">{{ track.summary }}</p>
            </div>
            <span class="text-xs whitespace-nowrap" :class="track.toneClass">{{ track.current }}/{{ track.target }}</span>
          </div>
          <div class="h-1.5 bg-bg rounded-xs border border-accent/10 mb-2">
            <div class="h-full rounded-xs transition-all" :class="track.barClass" :style="{ width: track.percent + '%' }" />
          </div>
          <div class="space-y-1">
            <p v-for="line in track.focusLines" :key="`${track.id}-${line}`" class="text-[10px] text-muted leading-4">- {{ line }}</p>
          </div>
          <p class="text-[10px] text-accent mt-2 leading-4">{{ track.rewardHint }}</p>
        </button>
      </div>

      <div class="border border-accent/10 rounded-xs p-3 mt-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-accent">下一枚会改变什么</p>
          <span class="text-[10px]" :class="nextGrandMedalFocus.toneClass">{{ nextGrandMedalFocus.label }}</span>
        </div>
        <p class="text-[10px] text-muted mt-1 leading-4">{{ nextGrandMedalFocus.hint }}</p>
        <p class="text-[10px] text-muted mt-1 leading-4">奖励保持为回看、标签、入口提示和轻功能反馈，不额外堆叠爆炸数值。</p>
      </div>
    </template>

    <!-- 物品图鉴 -->
    <ItemCollectionTab v-if="tab === 'collection'" @open-glossary="handleOpenGlossary" />



    <!-- 成就列表 -->
    <template v-if="tab === 'achievements'">
      <p class="text-xs text-muted mb-2">已完成 {{ achievementStore.completedAchievements.length }}/{{ ACHIEVEMENTS.length }}</p>
      <!-- 普通成就 -->
      <div class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-60 overflow-y-auto mb-3">
        <div
          v-for="a in ACHIEVEMENTS.filter(a => !a.hidden)"
          :key="a.id"
          class="border rounded-xs p-1.5 text-xs text-center transition-colors truncate mr-1"
          :class="isCompleted(a.id) ? 'border-accent/20 cursor-pointer hover:bg-accent/5 text-success' : 'border-accent/10 text-muted/30'"
          @click="isCompleted(a.id) && (activeAchievement = a)"
        >
          <template v-if="isCompleted(a.id)">{{ a.name }}</template>
          <Lock v-else :size="12" class="mx-auto text-muted/30" />
        </div>
      </div>
      <!-- 隐藏成就 -->
      <div class="flex items-center space-x-1.5 mb-1.5">
        <span class="text-xs text-muted">隐藏成就</span>
        <span class="text-xs text-muted/50">{{ ACHIEVEMENTS.filter(a => a.hidden && isCompleted(a.id)).length }}/{{ ACHIEVEMENTS.filter(a => a.hidden).length }}</span>
      </div>
      <div class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-32 overflow-y-auto">
        <div
          v-for="a in ACHIEVEMENTS.filter(a => a.hidden)"
          :key="a.id"
          class="border rounded-xs p-1.5 text-xs text-center transition-colors truncate mr-1"
          :class="isCompleted(a.id) ? 'border-warning/30 cursor-pointer hover:bg-warning/5 text-warning' : 'border-accent/10 text-muted/30'"
          @click="isCompleted(a.id) && (activeAchievement = a)"
        >
          <template v-if="isCompleted(a.id)">{{ a.name }}</template>
          <span v-else class="text-muted/30">???</span>
        </div>
      </div>
    </template>

    <!-- 成就详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeAchievement"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeAchievement = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeAchievement = null">
            <X :size="14" />
          </button>

          <!-- 标题 + 完成状态 -->
          <div class="flex items-center space-x-1.5 mb-2">
            <CircleCheck v-if="isCompleted(activeAchievement.id)" :size="14" class="text-success shrink-0" />
            <Circle v-else :size="14" class="text-muted/40 shrink-0" />
            <span class="text-sm" :class="isCompleted(activeAchievement.id) ? 'text-success' : 'text-text'">
              {{ activeAchievement.name }}
            </span>
          </div>

          <!-- 描述 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeAchievement.description }}</p>
          </div>

          <!-- 进度条 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-muted">进度</span>
              <span class="text-xs" :class="isCompleted(activeAchievement.id) ? 'text-success' : 'text-text'">
                {{ getProgressText(activeAchievement) }}
              </span>
            </div>
            <div class="h-1.5 bg-bg rounded-xs border border-accent/10">
              <div
                class="h-full rounded-xs transition-all"
                :class="isCompleted(activeAchievement.id) ? 'bg-success' : 'bg-accent'"
                :style="{ width: getProgressPercent(activeAchievement) + '%' }"
              />
            </div>
          </div>

          <!-- 称号 -->
          <div v-if="activeAchievement.title" class="border border-warning/30 rounded-xs p-2 mb-2 flex items-center justify-between">
            <span class="text-xs text-muted">专属称号</span>
            <span class="text-xs text-warning">「{{ activeAchievement.title }}」</span>
          </div>

          <!-- 奖励 -->
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">奖励</p>
            <div class="flex flex-wrap space-x-3">
              <span v-if="activeAchievement.reward.money" class="text-xs text-accent">{{ activeAchievement.reward.money }}文</span>
              <span v-for="ri in activeAchievement.reward.items ?? []" :key="ri.itemId" class="text-xs text-text">
                {{ getItemName(ri.itemId) }}×{{ ri.quantity }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 祠堂任务板 -->
    <template v-if="tab === 'bundles'">
      <div class="flex flex-col space-y-1.5 max-h-72 overflow-y-auto">
        <div
          v-for="bundle in COMMUNITY_BUNDLES"
          :key="bundle.id"
          class="border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5 mr-1"
          :class="achievementStore.isBundleComplete(bundle.id) ? 'border-success/30' : 'border-accent/20'"
          @click="activeBundle = bundle"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1.5">
              <CircleCheck v-if="achievementStore.isBundleComplete(bundle.id)" :size="12" class="text-success shrink-0" />
              <Circle v-else :size="12" class="text-muted shrink-0" />
              <span class="text-xs" :class="achievementStore.isBundleComplete(bundle.id) ? 'text-success' : 'text-accent'">
                {{ bundle.name }}
              </span>
            </div>
            <span class="text-xs text-muted whitespace-nowrap ml-2">
              {{ getBundleProgress(bundle) }}
            </span>
          </div>
          <p class="text-xs text-muted mt-0.5 pl-4.5">{{ bundle.description }}</p>
        </div>
      </div>
    </template>

    <!-- 祠堂任务详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeBundle"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeBundle = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeBundle = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="achievementStore.isBundleComplete(activeBundle.id) ? 'text-success' : 'text-accent'">
            {{ activeBundle.name }}
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeBundle.description }}</p>
          </div>

          <!-- 需求物品 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">所需物品</p>
            <div v-for="req in activeBundle.requiredItems" :key="req.itemId" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">{{ getItemName(req.itemId) }}</span>
              <span class="text-xs" :class="getSubmittedCount(activeBundle.id, req.itemId) >= req.quantity ? 'text-success' : ''">
                {{ getSubmittedCount(activeBundle.id, req.itemId) }}/{{ req.quantity }}
              </span>
            </div>
          </div>

          <!-- 奖励 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">奖励</p>
            <p class="text-xs text-accent">{{ activeBundle.reward.description }}</p>
          </div>

          <div v-if="getBundleVillageProjectLinks(activeBundle).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">推荐承接建设</p>
            <div v-for="entry in getBundleVillageProjectLinks(activeBundle)" :key="`${activeBundle.id}-${entry.projectId}`" class="mt-1 first:mt-0">
              <p class="text-xs text-accent">{{ entry.projectName }}</p>
              <p class="text-[10px] text-muted leading-4">{{ entry.summary }}</p>
            </div>
          </div>

          <!-- 提交按钮 -->
          <div v-if="!achievementStore.isBundleComplete(activeBundle.id)" class="flex flex-col space-y-1">
            <Button
              v-for="req in activeBundle.requiredItems.filter(r => getSubmittedCount(activeBundle!.id, r.itemId) < r.quantity)"
              :key="'submit_' + req.itemId"
              class="w-full justify-center"
              :icon="Send"
              :icon-size="12"
              :disabled="!inventoryStore.hasItem(req.itemId)"
              @click="handleSubmit(activeBundle!.id, req.itemId)"
            >
              提交{{ getItemName(req.itemId) }}
            </Button>
          </div>

          <!-- 已完成 -->
          <div v-else class="border border-success/30 rounded-xs p-2">
            <div class="flex items-center space-x-1">
              <CircleCheck :size="12" class="text-success" />
              <span class="text-xs text-success">已完成</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 出货收集 -->
    <template v-if="tab === 'shipping'">
      <p class="text-xs text-muted mb-2">出货记录 {{ shopStore.shippedItems.length }}/{{ shippableItems.length }}</p>
      <div class="flex flex-col space-y-2 max-h-72 overflow-y-auto">
        <div v-for="(items, category) in itemsByCategory" :key="category" class="border border-accent/20 rounded-xs p-2">
          <p class="text-xs text-muted mb-1">{{ CATEGORY_NAMES[category] ?? category }}</p>
          <div class="grid grid-cols-3 md:grid-cols-5 gap-1">
            <div
              v-for="item in items"
              :key="item.id"
              class="border rounded-xs p-1 text-xs text-center truncate"
              :class="
                shopStore.shippedItems.includes(item.id)
                  ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + getCategoryColor(item.category)
                  : 'border-accent/10 text-muted/30'
              "
              @click="shopStore.shippedItems.includes(item.id) && (activeShippingId = item.id)"
            >
              <template v-if="shopStore.shippedItems.includes(item.id)">{{ item.name }}</template>
              <Lock v-else :size="12" class="mx-auto text-muted/30" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 出货详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeShippingItem"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeShippingId = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeShippingId = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="getCategoryColor(activeShippingItem.category)">{{ activeShippingItem.name }}</p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeShippingItem.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">分类</span>
              <span class="text-xs">{{ CATEGORY_NAMES[activeShippingItem.category] ?? activeShippingItem.category }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeShippingItem.sellPrice }}文</span>
            </div>
            <div v-if="activeShippingItem.edible && activeShippingItem.staminaRestore" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">恢复</span>
              <span class="text-xs text-success">
                +{{ activeShippingItem.staminaRestore }}体力
                <template v-if="activeShippingItem.healthRestore">/ +{{ activeShippingItem.healthRestore }}HP</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 秘密笔记 -->
    <template v-if="tab === 'notes'">
      <div v-if="secretNoteStore.collectedCount === 0" class="flex flex-col items-center justify-center py-10 space-y-3">
        <ScrollText :size="48" class="text-accent/30" />
        <p class="text-sm text-muted">尚未收集到秘密笔记</p>
        <p class="text-xs text-muted/60 text-center max-w-60">挖矿、钓鱼、挖地、伐木、采集、击败怪物和特殊资源点都有机会带回秘密笔记。</p>
      </div>
      <template v-else>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-muted">收集进度</span>
          <span class="text-xs text-accent">{{ secretNoteStore.collectedCount }}/{{ secretNoteStore.totalNotes }}</span>
        </div>
        <div class="grid grid-cols-3 md:grid-cols-5 gap-1 max-h-72 overflow-y-auto mb-3">
          <div
            v-for="note in SECRET_NOTES"
            :key="note.id"
            class="border rounded-xs p-1.5 text-center text-xs transition-colors truncate mr-1"
            :class="
              secretNoteStore.isCollected(note.id)
                ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + noteTypeColor(note)
                : 'border-accent/10 text-muted/30'
            "
            @click="secretNoteStore.isCollected(note.id) ? (activeNote = note) : null"
          >
            <template v-if="secretNoteStore.isCollected(note.id)">#{{ note.id }} {{ note.title }}</template>
            <template v-else>
              #{{ note.id }}
              <Lock :size="10" class="inline text-muted/30" />
            </template>
          </div>
        </div>
      </template>
    </template>

    <!-- 秘密笔记详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="activeNote" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="activeNote = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeNote = null">
            <X :size="14" />
          </button>

          <div class="flex items-center space-x-1.5 mb-2">
            <ScrollText :size="14" class="text-accent" />
            <p class="text-sm text-accent">#{{ activeNote.id }} {{ activeNote.title }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs mb-1" :class="noteTypeColor(activeNote)">{{ NOTE_TYPE_LABELS[getNoteCategory(activeNote)] ?? getNoteCategory(activeNote) }}</p>
            <p class="text-xs">{{ activeNote.content }}</p>
          </div>

          <div v-if="activeNotePreview" class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted">线索状态</span>
              <span class="text-xs" :class="NOTE_STATUS_CLASS[activeNotePreview.status]">{{ NOTE_STATUS_LABELS[activeNotePreview.status] }}</span>
            </div>
            <p class="text-xs text-accent mt-1">{{ activeNotePreview.summary }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              {{ activeNotePreview.readable ? activeNotePreview.hint : activeNotePreview.readableReason }}
            </p>
            <div v-if="activeNotePreview.unmetConditions.length > 0" class="mt-2 flex flex-wrap gap-1">
              <span v-for="condition in activeNotePreview.unmetConditions" :key="condition" class="text-[10px] border border-warning/20 text-warning rounded-xs px-1 py-0.5">
                {{ condition }}
              </span>
            </div>
            <p v-if="activeNotePreview.resolvedDayTag" class="text-[10px] text-success mt-2">已于 {{ activeNotePreview.resolvedDayTag }} 验证</p>
          </div>

          <div v-if="activeNotePreview && activeNotePreview.status !== 'resolved' && (activeNote.verification || activeNote.usable)" class="mt-2">
            <Button class="w-full justify-center !bg-accent !text-bg" @click="handleUseNote(activeNote.id)">
              {{ activeNote.verification ? '验证线索' : '使用笔记' }}
            </Button>
          </div>
          <div v-else-if="activeNotePreview?.status === 'resolved'" class="border border-success/30 rounded-xs p-2">
            <div class="flex items-center space-x-1">
              <CircleCheck :size="12" class="text-success" />
              <span class="text-xs text-success">已验证</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <template v-if="tab === 'chronicle'">
      <div class="flex flex-wrap gap-1 mb-2">
        <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': chronicleRegionFilter === 'all' }" @click="chronicleRegionFilter = 'all'">
          全区域
        </Button>
        <Button
          v-for="regionId in chronicleOverview.regionOptions"
          :key="`chronicle-region-${regionId}`"
          class="shrink-0 justify-center"
          :class="{ '!bg-accent !text-bg': chronicleRegionFilter === regionId }"
          @click="chronicleRegionFilter = regionId"
        >
          {{ getChronicleRegionLabel(regionId) }}
        </Button>
      </div>

      <div class="flex flex-wrap gap-1 mb-2">
        <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': chronicleSeasonFilter === 'all' }" @click="chronicleSeasonFilter = 'all'">
          全季节
        </Button>
        <Button
          v-for="seasonOption in chronicleOverview.seasonOptions"
          :key="`chronicle-season-${seasonOption}`"
          class="shrink-0 justify-center"
          :class="{ '!bg-accent !text-bg': chronicleSeasonFilter === seasonOption }"
          @click="chronicleSeasonFilter = seasonOption"
        >
          {{ SEASON_LABELS[seasonOption] }}
        </Button>
      </div>

      <div class="flex flex-wrap gap-1 mb-2">
        <Button class="shrink-0 justify-center" :class="{ '!bg-accent !text-bg': chronicleTypeFilter === 'all' }" @click="chronicleTypeFilter = 'all'">
          全类型
        </Button>
        <Button
          v-for="typeOption in CHRONICLE_TYPE_OPTIONS"
          :key="`chronicle-type-${typeOption}`"
          class="shrink-0 justify-center"
          :class="{ '!bg-accent !text-bg': chronicleTypeFilter === typeOption }"
          @click="chronicleTypeFilter = typeOption"
        >
          {{ getChronicleTypeLabel(typeOption) }}
        </Button>
      </div>

      <p class="text-xs text-muted mb-2">已收录 {{ chronicleOverview.filteredCount }}/{{ chronicleOverview.totalEntries }} 条见闻</p>

      <div v-if="chronicleOverview.entries.length === 0" class="border border-accent/10 rounded-xs p-3">
        <p class="text-sm text-muted">当前筛选条件下还没有见闻条目。</p>
        <p class="text-xs text-muted mt-1">继续远征、兑现传闻、触发区域变体或结算同伴合同后，这里会开始沉淀记录。</p>
      </div>

      <div v-else class="space-y-2 max-h-72 overflow-y-auto">
        <div v-for="entry in chronicleOverview.entries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">{{ entry.title }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.summary }}</p>
            </div>
            <span class="text-[10px] text-muted shrink-0">{{ entry.lastRecordedDayTag || '未标记日期' }}</span>
          </div>
          <p class="text-[10px] text-muted mt-2 leading-4">
            {{ getChronicleRegionLabel(entry.regionId) }} / {{ getChronicleTypeLabel(entry.type) }} /
            {{ entry.season ? SEASON_LABELS[entry.season] : '无季节' }}
            <template v-if="entry.weather"> / {{ WEATHER_LABELS[entry.weather] }}</template>
            <template v-if="entry.companionName"> / {{ entry.companionName }}</template>
          </p>
          <div v-if="entry.detailLines.length > 0" class="space-y-1 mt-2">
            <p v-for="line in entry.detailLines" :key="`${entry.id}-${line}`" class="text-[10px] text-muted leading-4">- {{ line }}</p>
          </div>
          <p v-if="entry.discoverCount > 1" class="text-[10px] text-warning mt-2">同源条目已合并 {{ entry.discoverCount }} 次，保留首次与最近一次记录。</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <div class="border border-accent/10 rounded-xs px-3 py-2">
          <p class="text-[10px] text-muted mb-2">最近传闻回执</p>
          <div v-if="chronicleOverview.recentRumorReceipts.length === 0" class="text-[10px] text-muted">还没有传闻被兑现。</div>
          <div v-else class="space-y-1">
            <p v-for="receipt in chronicleOverview.recentRumorReceipts" :key="receipt.id" class="text-[10px] text-muted leading-4">
              {{ receipt.title }} / {{ receipt.sourceNpcName }} / {{ receipt.resolvedDayTag || '未标记' }}
            </p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs px-3 py-2">
          <p class="text-[10px] text-muted mb-2">留影卡</p>
          <div v-if="chronicleOverview.recentPhotoMoments.length === 0" class="text-[10px] text-muted">留影卡会随着见闻沉淀一起生成。</div>
          <div v-else class="space-y-1">
            <p v-for="moment in chronicleOverview.recentPhotoMoments" :key="moment.id" class="text-[10px] text-muted leading-4">
              {{ moment.label }} / {{ moment.frameHint }} / {{ moment.capturedDayTag || '未标记' }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- 图鉴百科 -->
    <template v-if="tab === 'glossary'">
      <GlossaryTab :preset="glossaryPreset" @preset-applied="glossaryPreset = null" />
    </template>

    <!-- 完成度 -->
    <div class="mt-3 border border-accent/20 rounded-xs p-2">
      <div class="flex items-center space-x-2 text-xs mb-1.5">
        <span class="text-xs text-muted shrink-0">完成度</span>
        <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
          <div class="h-full bg-accent rounded-xs transition-all" :style="{ width: achievementStore.perfectionPercent + '%' }" />
        </div>
        <span class="text-xs text-accent whitespace-nowrap">{{ achievementStore.perfectionPercent }}%</span>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">作物收获</span>
          <span class="text-xs">{{ achievementStore.stats.totalCropsHarvested }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">钓鱼</span>
          <span class="text-xs">{{ achievementStore.stats.totalFishCaught }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">烹饪</span>
          <span class="text-xs">{{ achievementStore.stats.totalRecipesCooked }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">累计收入</span>
          <span class="text-xs">{{ achievementStore.stats.totalMoneyEarned }}文</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">矿洞最深</span>
          <span class="text-xs">{{ achievementStore.stats.highestMineFloor }}层</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">怪物击杀</span>
          <span class="text-xs">{{ achievementStore.stats.totalMonstersKilled }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">育种次数</span>
          <span class="text-xs">{{ achievementStore.stats.totalBreedingsDone }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">杂交发现</span>
          <span class="text-xs">{{ achievementStore.stats.totalHybridsDiscovered }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">最高代数</span>
          <span class="text-xs">
            {{ achievementStore.stats.highestHybridTier > 0 ? achievementStore.stats.highestHybridTier + '代' : '-' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { BookOpen, CircleCheck, Circle, Send, X, ScrollText, Lock } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import GlossaryTab from '@/components/game/GlossaryTab.vue'
  import ItemCollectionTab from '@/components/game/ItemCollectionTab.vue'
  import { ref, computed } from 'vue'
  import { useAchievementStore } from '@/stores/useAchievementStore'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useMuseumStore } from '@/stores/useMuseumStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useSecretNoteStore } from '@/stores/useSecretNoteStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useSkillStore } from '@/stores/useSkillStore'
  import { useFrontierChronicleStore } from '@/stores/useFrontierChronicleStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { ACHIEVEMENTS, COMMUNITY_BUNDLES } from '@/data/achievements'
  import { ITEMS, getItemById } from '@/data/items'
  import { HYBRID_DEFS } from '@/data/breeding'
  import { FISH } from '@/data/fish'
  import { SECRET_NOTES } from '@/data/secretNotes'
  import type { GlossaryOpenPreset } from '@/data/glossary'
  import { COLLECTION_CATEGORY_NAMES, COLLECTION_CATEGORY_COLORS } from '@/data/collectionRegistry'
  import { sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import type { ItemCategory, AchievementDef, CommunityBundleDef, SecretNoteDef, RegionId, Season, Weather } from '@/types'

  const achievementStore = useAchievementStore()
  const inventoryStore = useInventoryStore()
  const shopStore = useShopStore()
  const animalStore = useAnimalStore()
  const secretNoteStore = useSecretNoteStore()
  const skillStore = useSkillStore()
  const npcStore = useNpcStore()
  const goalStore = useGoalStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()
  const museumStore = useMuseumStore()
  const guildStore = useGuildStore()
  const frontierChronicleStore = useFrontierChronicleStore()
  const villageProjectStore = useVillageProjectStore()

  type Tab = 'medals' | 'collection' | 'achievements' | 'bundles' | 'shipping' | 'notes' | 'chronicle' | 'glossary'
  const tab = ref<Tab>('medals')
  const glossaryPreset = ref<GlossaryOpenPreset | null>(null)
  const chronicleRegionFilter = ref<RegionId | 'all'>('all')
  const chronicleSeasonFilter = ref<Season | 'all'>('all')
  const chronicleTypeFilter = ref<'all' | 'journey' | 'rumor' | 'variant' | 'companion' | 'photo'>('all')

  const TAB_HINTS: Record<Tab, string> = {
    medals: '大奖章把图鉴、秘藏、精通和特殊事件合成一张长期补完页。想看细项时，再回到对应页签。',
    collection: '图鉴负责看收录、缺口和解锁进度；百科负责查机制、条件和路线。',
    achievements: '成就更适合回看长期目标、奖励和完成节奏。',
    bundles: '祠堂页适合集中查看提交需求和阶段奖励。',
    shipping: '出货页适合检查你还没卖过的条目和分类空缺。',
    notes: '笔记页适合查剧情线索、藏宝提示和世界观碎片。',
    chronicle: '见闻册适合回看区域、季节、传闻和同伴远行沉淀下来的行旅条目。',
    glossary: '百科适合按“怎么获得 / 有什么用 / 怎么解锁”来查资料。',
  }

  const currentTabHint = computed(() => TAB_HINTS[tab.value])

  const CHRONICLE_TYPE_OPTIONS = ['journey', 'rumor', 'variant', 'companion', 'photo'] as const
  const CHRONICLE_TYPE_LABELS: Record<(typeof CHRONICLE_TYPE_OPTIONS)[number], string> = {
    journey: '行旅',
    rumor: '传闻',
    variant: '变体',
    companion: '同伴',
    photo: '留影'
  }
  const SEASON_LABELS: Record<Season, string> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬'
  }
  const WEATHER_LABELS: Record<Weather, string> = {
    sunny: '晴',
    rainy: '雨',
    stormy: '雷雨',
    snowy: '雪',
    windy: '大风',
    green_rain: '绿雨'
  }
  const chronicleOverview = computed(() =>
    frontierChronicleStore.getChronicleOverview({
      regionId: chronicleRegionFilter.value,
      season: chronicleSeasonFilter.value,
      type: chronicleTypeFilter.value
    })
  )
  const getChronicleRegionLabel = (regionId: RegionId | null) =>
    regionId === 'ancient_road' ? '古驿荒道' : regionId === 'mirage_marsh' ? '蜃潮泽地' : regionId === 'cloud_highland' ? '云岚高地' : '无区域'
  const getChronicleTypeLabel = (type: (typeof CHRONICLE_TYPE_OPTIONS)[number] | 'all') =>
    type === 'all' ? '全部' : CHRONICLE_TYPE_LABELS[type]

  const openGlossaryTab = () => {
    glossaryPreset.value = null
    tab.value = 'glossary'
  }

  const handleOpenGlossary = (preset: GlossaryOpenPreset) => {
    glossaryPreset.value = preset
    tab.value = 'glossary'
  }

  /** 成就详情弹窗 */
  const activeAchievement = ref<AchievementDef | null>(null)

  /** 祠堂任务弹窗 */
  const activeBundle = ref<CommunityBundleDef | null>(null)

  /** 祠堂任务完成进度文本 */
  const getBundleProgress = (bundle: CommunityBundleDef): string => {
    const done = bundle.requiredItems.filter(r => getSubmittedCount(bundle.id, r.itemId) >= r.quantity).length
    return `${done}/${bundle.requiredItems.length}`
  }
  const getBundleVillageProjectLinks = (bundle: CommunityBundleDef) =>
    villageProjectStore.bundleProjectMappings.filter(entry => entry.bundleId === bundle.id)

  /** 秘密笔记弹窗 */
  const activeNote = ref<SecretNoteDef | null>(null)

  /** 出货详情弹窗 */
  const activeShippingId = ref<string | null>(null)
  const activeShippingItem = computed(() => {
    if (!activeShippingId.value) return null
    return getItemById(activeShippingId.value) ?? null
  })

  const getNoteCategory = (note: SecretNoteDef) => {
    if (note.category) return note.category
    if (note.type === 'treasure') return 'treasure'
    if (note.type === 'npc') return 'gift'
    if (note.type === 'story') return 'rumor'
    return 'location'
  }

  const NOTE_TYPE_COLORS: Record<string, string> = {
    gift: 'text-water',
    treasure: 'text-success',
    location: 'text-accent',
    rumor: 'text-warning',
    character: 'text-danger'
  }

  const NOTE_TYPE_LABELS: Record<string, string> = {
    gift: '礼物线索',
    treasure: '宝藏',
    location: '地点谜题',
    rumor: '世界传闻',
    character: '人物秘闻'
  }

  const NOTE_STATUS_LABELS: Record<string, string> = {
    untracked: '未追踪',
    tracked: '待验证',
    ready: '可验证',
    resolved: '已验证'
  }

  const NOTE_STATUS_CLASS: Record<string, string> = {
    untracked: 'text-muted',
    tracked: 'text-warning',
    ready: 'text-accent',
    resolved: 'text-success'
  }

  const noteTypeColor = (note: SecretNoteDef): string => NOTE_TYPE_COLORS[getNoteCategory(note)] ?? 'text-accent'
  const activeNotePreview = computed(() => (activeNote.value ? secretNoteStore.getVerificationPreview(activeNote.value.id) : null))

  const handleUseNote = (noteId: number) => {
    const result = secretNoteStore.useNote(noteId)
    if (result.success) {
      addLog(result.message)
    }
  }

  /** 按分类给物品名称上色 */
  const getCategoryColor = (category: ItemCategory): string => {
    return COLLECTION_CATEGORY_COLORS[category] ?? 'text-accent'
  }

  // === 出货收集 ===

  const CATEGORY_NAMES = COLLECTION_CATEGORY_NAMES

  /** 可出货的类别（排除种子、机器、工具类） */
  const SHIPPABLE_CATEGORIES = ['crop', 'fish', 'animal_product', 'processed', 'fruit', 'ore', 'gem', 'material', 'misc', 'food', 'gift']

  const shippableItems = computed(() => ITEMS.filter(i => SHIPPABLE_CATEGORIES.includes(i.category)))

  const hybridItemIds = new Set(HYBRID_DEFS.map(h => h.resultCropId))

  const itemsByCategory = computed(() => {
    const groups: Record<string, typeof ITEMS> = {}
    for (const item of shippableItems.value) {
      const cat = item.category === 'crop' && hybridItemIds.has(item.id) ? 'hybrid' : item.category
      if (!groups[cat]) groups[cat] = []
      groups[cat]!.push(item)
    }
    return groups
  })

  type GrandMedalTrack = {
    id: 'collection' | 'secret' | 'mastery' | 'event'
    label: string
    current: number
    target: number
    percent: number
    toneClass: string
    barClass: string
    summary: string
    focusLines: string[]
    rewardHint: string
    tabTarget: Tab
  }

  const percentOf = (current: number, target: number) => {
    if (target <= 0) return 0
    return Math.min(100, Math.round((Math.max(0, current) / target) * 100))
  }

  const getMedalTone = (percent: number) => {
    if (percent >= 100) return { toneClass: 'text-success', barClass: 'bg-success' }
    if (percent >= 60) return { toneClass: 'text-accent', barClass: 'bg-accent' }
    if (percent >= 30) return { toneClass: 'text-warning', barClass: 'bg-warning' }
    return { toneClass: 'text-muted', barClass: 'bg-muted/50' }
  }

  const buildGrandMedalTrack = (track: Omit<GrandMedalTrack, 'percent' | 'toneClass' | 'barClass'>): GrandMedalTrack => {
    const percent = percentOf(track.current, track.target)
    return { ...track, percent, ...getMedalTone(percent) }
  }

  const verifiableSecretNotes = computed(() => SECRET_NOTES.filter(note => note.verification || note.usable))
  const verifiedSecretNoteCount = computed(() => verifiableSecretNotes.value.filter(note => secretNoteStore.isUsed(note.id)).length)
  const primaryMasteryUnlockedCount = computed(() => skillStore.primaryMasteries.filter(entry => entry.unlocked).length)
  const hybridMasteryUnlockedCount = computed(() => skillStore.hybridMasteries.filter(entry => entry.unlocked).length)
  const masteryRewardUnlockedCount = computed(() => skillStore.masteryRewards.filter(entry => entry.unlocked).length)
  const masteryMedalTarget = computed(() => skillStore.primaryMasteries.length + skillStore.hybridMasteries.length + skillStore.masteryRewards.length)
  const masteryMedalCurrent = computed(() => primaryMasteryUnlockedCount.value + hybridMasteryUnlockedCount.value + masteryRewardUnlockedCount.value)
  const completedSpecialOrderCount = computed(() => questStore.completedQuestHistory.filter(entry => entry.isSpecialOrder).length)
  const completedActivityWindowCount = computed(() => questStore.activityQuestWindowState.completedWindowIds.length)
  const completedEventCampaignCount = computed(
    () => goalStore.eventOperationsState.completedCampaignIds.length + goalStore.eventOperationsState.completedThemeWeekIds.length
  )
  const specialEventSurfaceCount = computed(
    () =>
      [
        completedSpecialOrderCount.value,
        completedActivityWindowCount.value,
        completedEventCampaignCount.value,
        chronicleOverview.value.totalEntries
      ].filter(count => count > 0).length
  )

  const grandMedalTracks = computed<GrandMedalTrack[]>(() => [
    buildGrandMedalTrack({
      id: 'collection',
      label: '图鉴大奖章',
      current: achievementStore.discoveredCount + shopStore.shippedItems.length,
      target: ITEMS.length + shippableItems.value.length,
      summary: '把物品发现和出货补完合在一起看，避免图鉴、商店和出货记录分散。',
      focusLines: [
        `物品图鉴 ${achievementStore.discoveredCount}/${ITEMS.length}`,
        `出货记录 ${shopStore.shippedItems.length}/${shippableItems.value.length}`,
        `仍有 ${Math.max(0, ITEMS.length - achievementStore.discoveredCount)} 件物品等待首次发现`
      ],
      rewardHint: '轻奖励：点亮分类回看、出货缺口提示和百科跳转，不额外推高收益倍率。',
      tabTarget: 'collection'
    }),
    buildGrandMedalTrack({
      id: 'secret',
      label: '秘藏大奖章',
      current: secretNoteStore.collectedCount + verifiedSecretNoteCount.value,
      target: secretNoteStore.totalNotes + verifiableSecretNotes.value.length,
      summary: '把秘密笔记、藏宝线索和可验证纸条合成同一条秘藏进度。',
      focusLines: [
        `已收集纸条 ${secretNoteStore.collectedCount}/${secretNoteStore.totalNotes}`,
        `已验证秘藏 ${verifiedSecretNoteCount.value}/${verifiableSecretNotes.value.length}`,
        `生活账本线索 ${Object.keys(playerStore.getLifestyleDiscoverySnapshot().secretLeads).length} 条`
      ],
      rewardHint: '轻奖励：优先给验证状态、地点回忆和线索归档，不用堆叠大额奖励。',
      tabTarget: 'notes'
    }),
    buildGrandMedalTrack({
      id: 'mastery',
      label: '精通大奖章',
      current: masteryMedalCurrent.value,
      target: masteryMedalTarget.value,
      summary: '把主技能精通、混合精通和功能性精通奖励收进同一张成长证书。',
      focusLines: [
        `主技能精通 ${primaryMasteryUnlockedCount.value}/${skillStore.primaryMasteries.length}`,
        `混合精通 ${hybridMasteryUnlockedCount.value}/${skillStore.hybridMasteries.length}`,
        `功能奖励 ${masteryRewardUnlockedCount.value}/${skillStore.masteryRewards.length}`
      ],
      rewardHint: '轻奖励：显示祝福、饰物位、工台和地图标记的解锁回看，避免新增强数值堆叠。',
      tabTarget: 'achievements'
    }),
    buildGrandMedalTrack({
      id: 'event',
      label: '特殊事件大奖章',
      current: specialEventSurfaceCount.value,
      target: 4,
      summary: '把特殊订单、短活动窗口、活动周和行旅见闻作为特殊事件的四个收集面。',
      focusLines: [
        `特殊订单回执 ${completedSpecialOrderCount.value} 条`,
        `限时活动窗口 ${completedActivityWindowCount.value} 个`,
        `活动周 / 主题周记录 ${completedEventCampaignCount.value} 条`,
        `见闻册条目 ${chronicleOverview.value.totalEntries} 条`
      ],
      rewardHint: goalStore.currentEventCampaign
        ? `轻奖励：当前活动「${goalStore.currentEventCampaign.label}」会优先沉淀为回看与路线提示。`
        : '轻奖励：优先沉淀回执、照片、路线提示和活动摘要，而不是额外数值膨胀。',
      tabTarget: 'chronicle'
    })
  ])

  const grandMedalOverallPercent = computed(() => {
    if (grandMedalTracks.value.length === 0) return 0
    return Math.round(grandMedalTracks.value.reduce((sum, track) => sum + track.percent, 0) / grandMedalTracks.value.length)
  })

  const grandMedalSummaryLines = computed(() => [
    { label: '总完成', value: `${grandMedalOverallPercent.value}%` },
    { label: '图鉴 / 出货', value: `${achievementStore.discoveredCount + shopStore.shippedItems.length}/${ITEMS.length + shippableItems.value.length}` },
    { label: '秘藏 / 验证', value: `${secretNoteStore.collectedCount + verifiedSecretNoteCount.value}/${secretNoteStore.totalNotes + verifiableSecretNotes.value.length}` },
    { label: '事件面', value: `${specialEventSurfaceCount.value}/4` }
  ])

  const nextGrandMedalFocus = computed(() => {
    const pendingTrack = grandMedalTracks.value
      .filter(track => track.percent < 100)
      .sort((left, right) => left.percent - right.percent)[0]
    if (!pendingTrack) {
      return {
        label: '全部点亮',
        toneClass: 'text-success',
        hint: '四条大奖章线都已经点亮，后续可以继续等待新图鉴、新秘藏或新活动扩容。'
      }
    }
    return {
      label: pendingTrack.label,
      toneClass: pendingTrack.toneClass,
      hint: pendingTrack.focusLines[0] ?? pendingTrack.summary
    }
  })

  const isCompleted = (id: string): boolean => {
    return achievementStore.completedAchievements.includes(id)
  }

  const getItemName = (id: string): string => {
    return getItemById(id)?.name ?? id
  }

  const getSubmittedCount = (bundleId: string, itemId: string): number => {
    return achievementStore.getBundleProgress(bundleId)[itemId] ?? 0
  }

  /** 计算成就进度百分比（用于进度条） */
  const getProgressPercent = (a: (typeof ACHIEVEMENTS)[number]): number => {
    if (isCompleted(a.id)) return 100
    const c = a.condition
    const s = achievementStore.stats
    let current = 0
    let target = 1
    switch (c.type) {
      case 'itemCount':
        current = achievementStore.discoveredCount
        target = c.count
        break
      case 'cropHarvest':
        current = s.totalCropsHarvested
        target = c.count
        break
      case 'fishCaught':
        current = s.totalFishCaught
        target = c.count
        break
      case 'moneyEarned':
        current = s.totalMoneyEarned
        target = c.amount
        break
      case 'mineFloor':
        current = s.highestMineFloor
        target = c.floor
        break
      case 'skullCavernFloor':
        current = s.skullCavernBestFloor
        target = c.floor
        break
      case 'recipesCooked':
        current = s.totalRecipesCooked
        target = c.count
        break
      case 'monstersKilled':
        current = s.totalMonstersKilled
        target = c.count
        break
      case 'shippedCount':
        current = shopStore.shippedItems.length
        target = c.count
        break
      case 'fullShipment':
        current = shopStore.shippedItems.length
        target = shippableItems.value.length
        break
      case 'animalCount':
        current = animalStore.animals.length
        target = c.count
        break
      case 'questsCompleted':
        current = questStore.completedQuestCount
        target = c.count
        break
      case 'hybridsDiscovered':
        current = s.totalHybridsDiscovered
        target = c.count
        break
      case 'breedingsDone':
        current = s.totalBreedingsDone
        target = c.count
        break
      case 'hybridTier':
        current = s.highestHybridTier
        target = c.tier
        break
      case 'hybridsShipped': {
        const hIds = new Set(HYBRID_DEFS.map(h => h.resultCropId))
        current = shopStore.shippedItems.filter((id: string) => hIds.has(id)).length
        target = c.count
        break
      }
      case 'skillLevel': {
        const skill = skillStore.skills.find(sk => sk.type === c.skillType)
        current = skill?.level ?? 0
        target = c.level
        break
      }
      case 'allSkillsMax':
        current = skillStore.skills.filter(sk => sk.level === 20).length
        target = skillStore.skills.length
        break
      case 'npcFriendship': {
        const LEVEL_RANK: Record<string, number> = { stranger: 0, acquaintance: 1, friendly: 2, bestFriend: 3 }
        const requiredRank = LEVEL_RANK[c.level] ?? 0
        current = npcStore.npcStates.filter(n => (LEVEL_RANK[npcStore.getFriendshipLevel(n.npcId)] ?? 0) >= requiredRank).length
        target = npcStore.npcStates.length
        break
      }
      case 'npcBestFriend':
        current = npcStore.npcStates.filter(n => npcStore.getFriendshipLevel(n.npcId) === 'bestFriend').length
        target = c.count
        break
      case 'npcAllFriendly':
        current = npcStore.npcStates.filter(n => {
          const l = npcStore.getFriendshipLevel(n.npcId)
          return l === 'friendly' || l === 'bestFriend'
        }).length
        target = npcStore.npcStates.length
        break
      case 'married':
        return npcStore.getSpouse() ? 100 : 0
      case 'hasChild':
        return npcStore.children.length > 0 ? 100 : 0
      case 'allBundlesComplete':
        current = achievementStore.completedBundles.length
        target = COMMUNITY_BUNDLES.length
        break
      case 'museumDonations':
        current = museumStore.donatedCount
        target = c.count
        break
      case 'guildGoalsCompleted':
        current = guildStore.completedGoalCount
        target = c.count
        break
      case 'fullFishCollection': {
        const fishDiscovered = FISH.filter(f => achievementStore.discoveredItems.includes(f.id)).length
        return Math.round((fishDiscovered / FISH.length) * 100)
      }
      default:
        return 0
    }
    return target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
  }

  const getProgressText = (a: (typeof ACHIEVEMENTS)[number]): string => {
    const c = a.condition
    const s = achievementStore.stats
    switch (c.type) {
      case 'itemCount':
        return `${achievementStore.discoveredCount}/${c.count}`
      case 'cropHarvest':
        return `${s.totalCropsHarvested}/${c.count}`
      case 'fishCaught':
        return `${s.totalFishCaught}/${c.count}`
      case 'moneyEarned':
        return `${s.totalMoneyEarned}/${c.amount}`
      case 'mineFloor':
        return `${s.highestMineFloor}/${c.floor}`
      case 'skullCavernFloor':
        return `${s.skullCavernBestFloor}/${c.floor}`
      case 'recipesCooked':
        return `${s.totalRecipesCooked}/${c.count}`
      case 'monstersKilled':
        return `${s.totalMonstersKilled}/${c.count}`
      case 'shippedCount':
        return `${shopStore.shippedItems.length}/${c.count}`
      case 'fullShipment':
        return `${shopStore.shippedItems.length}/${shippableItems.value.length}`
      case 'animalCount':
        return `${animalStore.animals.length}/${c.count}`
      case 'questsCompleted':
        return `${questStore.completedQuestCount}/${c.count}`
      case 'hybridsDiscovered':
        return `${s.totalHybridsDiscovered}/${c.count}`
      case 'breedingsDone':
        return `${s.totalBreedingsDone}/${c.count}`
      case 'hybridTier':
        return `${s.highestHybridTier}/${c.tier}`
      case 'hybridsShipped': {
        const hIds = new Set(HYBRID_DEFS.map(h => h.resultCropId))
        return `${shopStore.shippedItems.filter((id: string) => hIds.has(id)).length}/${c.count}`
      }
      case 'skillLevel': {
        const skill = skillStore.skills.find(sk => sk.type === c.skillType)
        return `${skill?.level ?? 0}/${c.level}`
      }
      case 'allSkillsMax': {
        const maxCount = skillStore.skills.filter(sk => sk.level === 20).length
        return `${maxCount}/${skillStore.skills.length}`
      }
      case 'npcFriendship': {
        const LEVEL_RANK: Record<string, number> = { stranger: 0, acquaintance: 1, friendly: 2, bestFriend: 3 }
        const requiredRank = LEVEL_RANK[c.level] ?? 0
        const metCount = npcStore.npcStates.filter(n => (LEVEL_RANK[npcStore.getFriendshipLevel(n.npcId)] ?? 0) >= requiredRank).length
        return `${metCount}/${npcStore.npcStates.length}`
      }
      case 'npcBestFriend': {
        const bestCount = npcStore.npcStates.filter(n => npcStore.getFriendshipLevel(n.npcId) === 'bestFriend').length
        return `${bestCount}/${c.count}`
      }
      case 'npcAllFriendly': {
        const friendlyCount = npcStore.npcStates.filter(n => {
          const level = npcStore.getFriendshipLevel(n.npcId)
          return level === 'friendly' || level === 'bestFriend'
        }).length
        return `${friendlyCount}/${npcStore.npcStates.length}`
      }
      case 'married':
        return npcStore.getSpouse() ? '已完成' : '未完成'
      case 'hasChild':
        return npcStore.children.length > 0 ? '已完成' : '未完成'
      case 'allBundlesComplete':
        return `${achievementStore.completedBundles.length}/${COMMUNITY_BUNDLES.length}`
      case 'museumDonations':
        return `${museumStore.donatedCount}/${c.count}`
      case 'guildGoalsCompleted':
        return `${guildStore.completedGoalCount}/${c.count}`
      case 'fullFishCollection': {
        const fishDiscovered = FISH.filter(f => achievementStore.discoveredItems.includes(f.id)).length
        return `${fishDiscovered}/${FISH.length}`
      }
      default:
        return ''
    }
  }

  const handleSubmit = (bundleId: string, itemId: string) => {
    const bundle = COMMUNITY_BUNDLES.find(b => b.id === bundleId)
    const req = bundle?.requiredItems.find(r => r.itemId === itemId)
    if (!req) return

    const submitted = getSubmittedCount(bundleId, itemId)
    const needed = req.quantity - submitted
    const available = inventoryStore.getItemCount(itemId)
    const toSubmit = Math.min(needed, available)
    if (toSubmit <= 0) return

    if (achievementStore.submitToBundle(bundleId, itemId, toSubmit)) {
      sfxClick()
      addLog(`向「${bundle?.name}」提交了${getItemName(itemId)}×${toSubmit}。`)
      if (achievementStore.isBundleComplete(bundleId)) {
        addLog(`「${bundle?.name}」完成！获得了奖励！`)
      }
    } else {
      addLog('提交失败。')
    }
  }
</script>
