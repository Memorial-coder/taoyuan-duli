<template>
  <div class="space-y-3">
    <slot name="header" :count="existingSlots.length">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="game-section-title">继续旅程</p>
          <p class="game-section-desc">如果你已经有存档，可以从这里继续，或导入以前的进度。</p>
        </div>
        <span class="game-chip">已有 {{ existingSlots.length }} 个存档</span>
      </div>
    </slot>

    <div v-if="slotReadBlocked" class="main-menu-empty-state rounded-xs border border-danger/30 bg-danger/10 px-3 py-5 text-center">
      <p class="text-xs text-danger">服务端存档暂时不可读取，当前无法确认云端槽位是否已有进度。</p>
      <p class="text-[10px] text-danger/80 mt-1 leading-5">为避免把真实云档误当成空槽覆盖，本页已暂停把它们显示成“空存档”。</p>
    </div>

    <div v-else-if="existingSlots.length === 0" class="main-menu-empty-state game-panel-muted px-3 py-5 text-center">
      <p class="text-xs text-muted">当前还没有可继续的旅程。</p>
      <p class="text-[10px] text-muted mt-1">点击上方「新的旅程」，或导入已有存档。</p>
    </div>

    <div v-for="info in existingSlots" :key="info.slot" class="w-full">
      <div class="flex w-full space-x-1">
        <button class="btn main-menu-continue-slot flex-1 !justify-between" @click="$emit('load-slot', info.slot)">
          <span class="inline-flex min-w-0 items-center space-x-2">
            <FolderOpen :size="14" class="shrink-0" />
            <span class="truncate">存档 {{ info.slot + 1 }} · {{ info.playerName ?? '未命名' }}</span>
            <span v-if="info.pendingSync" class="rounded-xs border border-warning/40 px-1 text-[10px] text-warning">待同步</span>
          </span>
          <span class="shrink-0 text-right text-[11px] text-muted md:text-xs">
            第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{ info.day }}天
          </span>
        </button>
        <div class="relative">
          <Button
            class="h-full px-2"
            :icon="Settings"
            :icon-size="12"
            @click.stop="$emit('toggle-slot-menu', info.slot)"
          />
          <div
            v-if="slotMenuOpen === info.slot"
            class="absolute right-0 top-full z-10 mt-1 flex w-30 flex-col overflow-hidden rounded-xs border border-accent/30"
          >
            <Button
              class="text-center !rounded-none justify-center !text-sm"
              :icon="Download"
              :icon-size="12"
              @click="$emit('export-slot', info.slot)"
            >
              导出
            </Button>
            <Button
              class="btn-danger !rounded-none text-center justify-center !text-sm"
              :icon="Trash2"
              :icon-size="12"
              @click="$emit('delete-slot', info.slot)"
            >
              删除
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Button class="text-center justify-center" :icon="Upload" @click="$emit('import-slot')">
      导入存档
    </Button>
  </div>
</template>

<script setup lang="ts">
  import { Download, FolderOpen, Settings, Trash2, Upload } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { SEASON_NAMES } from '@/stores/useGameStore'
  import type { SaveSlotInfo } from '@/stores/useSaveStore'

  defineProps<{
    existingSlots: SaveSlotInfo[]
    slotMenuOpen: number | null
    isNativePlatform: boolean
    slotReadBlocked?: boolean
  }>()

  defineEmits<{
    (e: 'load-slot', slot: number): void
    (e: 'toggle-slot-menu', slot: number): void
    (e: 'export-slot', slot: number): void
    (e: 'delete-slot', slot: number): void
    (e: 'import-slot'): void
  }>()
</script>

<style scoped>
  .main-menu-continue-slot {
    min-height: 48px;
    gap: 10px;
  }

  @media (min-width: 1280px) {
    .main-menu-empty-state {
      min-height: 112px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .main-menu-continue-slot {
      min-height: 54px;
      padding-inline: 14px;
    }
  }
</style>
