<template>
  <section class="region-open-world-shell border border-accent/20 rounded-xs bg-bg/80" data-testid="region-open-world-map">
    <div class="region-open-world-header border-b border-accent/10 px-3 py-3">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[0.625rem] tracking-[0.22em] text-accent/70">开放行旅</p>
          <h2 class="text-base text-accent mt-1">{{ activeRegion.def.name }}</h2>
          <p class="text-xs text-muted mt-1 leading-5">{{ activeRegion.def.description }}</p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center shrink-0">
          <div class="border border-accent/10 rounded-xs px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">压力</p>
            <p class="text-xs text-accent mt-0.5">{{ activeRegion.def.pressureLabel }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">发现</p>
            <p class="text-xs text-accent mt-0.5">{{ discoveredCount }}/{{ activeRegion.def.tiles.length }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-1.5">
            <p class="text-[0.625rem] text-muted">日期</p>
            <p class="text-xs text-accent mt-0.5">{{ dayTag || '今日' }}</p>
          </div>
        </div>
      </div>

      <div class="region-open-world-region-row mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="region in regions"
          :key="region.id"
          class="region-open-world-region-button min-w-[8rem] border rounded-xs px-3 py-2 text-left transition-colors"
          :class="region.active ? 'border-accent bg-accent/10 text-accent' : region.unlocked ? 'border-accent/15 text-muted hover:bg-accent/5' : 'border-muted/20 text-muted/60'"
          :disabled="!region.unlocked"
          :aria-pressed="region.active"
          :data-testid="`region-open-world-region-${region.id}`"
          @click="$emit('select-region', region.id)"
        >
          <span class="block text-xs truncate">{{ region.name }}</span>
          <span class="block text-[0.625rem] mt-1 truncate">{{ region.unlocked ? region.pressureLabel : '未开放' }}</span>
        </button>
      </div>
    </div>

    <div class="region-open-world-body grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-3 p-3">
      <div class="region-open-world-map-panel">
        <div
          class="region-open-world-grid"
          data-testid="region-open-world-grid"
          :style="gridStyle"
        >
          <button
            v-for="tile in activeRegion.tiles"
            :key="tile.id"
            class="region-open-world-tile"
            :class="tileClass(tile)"
            :style="{ gridColumn: `${tile.x + 1}`, gridRow: `${tile.y + 1}` }"
            :disabled="tile.locked && !tile.discovered"
            :data-testid="`region-open-world-tile-${tile.id}`"
            @click="$emit('select-tile', tile.id)"
          >
            <span v-if="tile.current" class="region-open-world-player" data-testid="region-open-world-player">●</span>
            <span class="region-open-world-object">{{ tileIcon(tile) }}</span>
            <span class="region-open-world-label">{{ tile.discovered ? tile.label : '迷雾' }}</span>
            <span v-if="tile.discovered && tile.status !== 'fresh'" class="region-open-world-mark">{{ tile.statusLabel }}</span>
          </button>
        </div>
        <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ activeRegion.def.pressureDescription }}</p>
      </div>

      <aside class="region-open-world-side space-y-3">
        <div class="border border-accent/15 rounded-xs p-3 bg-bg/70">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[0.625rem] text-muted">当前格</p>
              <p class="text-sm text-accent mt-1">{{ selectedTile?.discovered ? selectedTile.label : '未发现区域' }}</p>
            </div>
            <span class="text-[0.625rem] shrink-0" :class="selectedTile?.current ? 'text-success' : 'text-muted'">
              {{ selectedTile?.current ? '脚下' : selectedTile?.discovered ? '已发现' : '迷雾' }}
            </span>
          </div>
          <p class="text-xs text-muted leading-5 mt-2">{{ selectedTile?.discovered ? selectedTile.description : '靠近这片区域后才会显形。' }}</p>
          <div v-if="selectedTile?.discovered" class="mt-3 grid grid-cols-2 gap-2 text-[0.625rem]">
            <div class="border border-accent/10 rounded-xs px-2 py-1.5">
              <span class="text-muted">对象</span>
              <p class="text-accent mt-0.5">{{ selectedTile.objectLabel }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-1.5">
              <span class="text-muted">状态</span>
              <p class="text-accent mt-0.5">{{ selectedTile.statusLabel }}</p>
            </div>
          </div>
          <div v-if="selectedTile?.discovered" class="mt-3 flex flex-col gap-2">
            <button
              class="border border-accent/20 rounded-xs px-3 py-2 text-xs text-accent hover:bg-accent/5 disabled:text-muted disabled:hover:bg-transparent"
              :disabled="!selectedTile.canMove"
              @click="$emit('move', selectedTile.id)"
            >
              前往
            </button>
            <button
              v-if="selectedTile.actionId"
              class="border border-success/30 rounded-xs px-3 py-2 text-xs text-success hover:bg-success/10 disabled:text-muted disabled:border-muted/20 disabled:hover:bg-transparent"
              :disabled="!selectedTile.canAct"
              :data-testid="`region-open-world-action-${selectedTile.actionId}`"
              @click="$emit('perform-action', selectedTile.id, selectedTile.actionId)"
            >
              {{ selectedTile.actionLabel }}
              <span v-if="selectedTile.staminaCost > 0 || selectedTile.timeCostHours > 0" class="text-[0.625rem] text-muted ml-1">
                {{ selectedTile.staminaCost }}体 / {{ selectedTile.timeCostHours }}h
              </span>
            </button>
            <p v-if="selectedTile.disabledReason" class="text-[0.625rem] text-muted leading-4">{{ selectedTile.disabledReason }}</p>
          </div>
        </div>

        <div class="border border-accent/15 rounded-xs p-3 bg-bg/70" data-testid="region-open-world-handbook">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">区域手册</p>
            <span class="text-[0.625rem] text-muted">{{ handbookSummary }}</span>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-[0.625rem]">
            <div class="border border-accent/10 rounded-xs px-2 py-1.5">
              <span class="text-muted">地块</span>
              <p class="text-accent mt-0.5">{{ discoveredCount }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-1.5">
              <span class="text-muted">据点</span>
              <p class="text-accent mt-0.5">{{ repairedOutpostCount }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/15 rounded-xs p-3 bg-bg/70" data-testid="region-open-world-log">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">行旅日志</p>
            <span class="text-[0.625rem] text-muted">{{ logs.length }} 条</span>
          </div>
          <div class="mt-2 space-y-2">
            <div v-for="entry in logs.slice(0, 4)" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
              <p class="text-[0.625rem]" :class="entry.tone === 'success' ? 'text-success' : entry.tone === 'danger' ? 'text-danger' : 'text-accent'">
                {{ entry.title }}
              </p>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
            </div>
            <p v-if="logs.length <= 0" class="text-[0.625rem] text-muted leading-4">还没有新的行旅记录。</p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type {
    RegionOpenWorldActionId,
    RegionOpenWorldId,
    RegionOpenWorldLogEntry,
    RegionOpenWorldRegionEntry,
    RegionOpenWorldTileView
  } from '@/types/region'

  const props = defineProps<{
    regions: RegionOpenWorldRegionEntry[]
    activeRegion: {
      def: {
        id: RegionOpenWorldId
        name: string
        description: string
        width: number
        height: number
        pressureLabel: string
        pressureDescription: string
        tiles: unknown[]
      }
      tiles: RegionOpenWorldTileView[]
    }
    selectedTile: RegionOpenWorldTileView | null
    dayTag: string
    logs: RegionOpenWorldLogEntry[]
    repairedOutpostCount: number
  }>()

  defineEmits<{
    (event: 'select-region', regionId: RegionOpenWorldId): void
    (event: 'select-tile', tileId: string): void
    (event: 'move', tileId: string): void
    (event: 'perform-action', tileId: string, actionId: RegionOpenWorldActionId): void
  }>()

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${props.activeRegion.def.width}, minmax(2.5rem, 1fr))`,
    gridTemplateRows: `repeat(${props.activeRegion.def.height}, minmax(2.5rem, 1fr))`
  }))

  const discoveredCount = computed(() => props.activeRegion.tiles.filter(tile => tile.discovered).length)
  const handbookSummary = computed(() => `${discoveredCount.value}/${props.activeRegion.tiles.length}`)

  const tileIcon = (tile: RegionOpenWorldTileView) => {
    if (!tile.discovered) return '？'
    if (tile.current) return '◎'
    switch (tile.objectType) {
      case 'tree':
        return '木'
      case 'bamboo':
        return '竹'
      case 'herb':
        return '草'
      case 'chest':
        return '箱'
      case 'animal':
        return '兽'
      case 'monster':
        return '战'
      case 'story':
        return '事'
      case 'route_landmark':
        return '路'
      case 'event_landmark':
        return '奇'
      case 'boss_landmark':
        return '首'
      case 'outpost':
        return '营'
      case 'shortcut':
        return '捷'
      case 'roadblock':
        return '障'
      default:
        return '·'
    }
  }

  const tileClass = (tile: RegionOpenWorldTileView) => [
    `terrain-${tile.terrain}`,
    tile.discovered ? 'is-discovered' : 'is-hidden',
    tile.current ? 'is-current' : '',
    tile.selected ? 'is-selected' : '',
    tile.status !== 'fresh' ? 'is-spent' : '',
    tile.canAct ? 'is-actionable' : ''
  ]
</script>

<style scoped>
  .region-open-world-region-row {
    scrollbar-width: thin;
  }

  .region-open-world-grid {
    display: grid;
    gap: 0.35rem;
    width: 100%;
    min-height: 23rem;
    overflow-x: auto;
  }

  .region-open-world-tile {
    position: relative;
    min-width: 2.5rem;
    min-height: 3.25rem;
    border: 1px solid rgba(168, 138, 86, 0.2);
    border-radius: 0.125rem;
    padding: 0.25rem;
    text-align: left;
    overflow: hidden;
    transition: border-color 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
  }

  .region-open-world-tile:hover:not(:disabled) {
    border-color: rgba(168, 138, 86, 0.7);
    transform: translateY(-1px);
  }

  .region-open-world-tile.is-hidden {
    background: repeating-linear-gradient(135deg, rgba(39, 42, 50, 0.9), rgba(39, 42, 50, 0.9) 6px, rgba(24, 26, 32, 0.9) 6px, rgba(24, 26, 32, 0.9) 12px);
    color: rgba(220, 220, 220, 0.45);
  }

  .region-open-world-tile.is-current {
    border-color: rgba(104, 211, 145, 0.85);
    box-shadow: inset 0 0 0 1px rgba(104, 211, 145, 0.35);
  }

  .region-open-world-tile.is-selected {
    outline: 2px solid rgba(168, 138, 86, 0.55);
    outline-offset: 1px;
  }

  .region-open-world-tile.is-spent {
    filter: saturate(0.75);
  }

  .region-open-world-tile.is-actionable {
    border-color: rgba(104, 211, 145, 0.45);
  }

  .region-open-world-object {
    display: block;
    width: 1.35rem;
    height: 1.35rem;
    line-height: 1.35rem;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.18);
    color: currentColor;
    font-size: 0.7rem;
  }

  .region-open-world-label {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.625rem;
    line-height: 0.85rem;
    color: currentColor;
  }

  .region-open-world-mark {
    position: absolute;
    right: 0.2rem;
    bottom: 0.15rem;
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.72);
  }

  .region-open-world-player {
    position: absolute;
    top: 0.15rem;
    right: 0.25rem;
    color: rgb(104, 211, 145);
    font-size: 0.7rem;
  }

  .terrain-grass {
    background: linear-gradient(135deg, rgba(55, 112, 73, 0.34), rgba(39, 69, 54, 0.65));
    color: rgb(205, 232, 196);
  }

  .terrain-bamboo {
    background: linear-gradient(135deg, rgba(78, 142, 83, 0.42), rgba(33, 78, 63, 0.72));
    color: rgb(198, 239, 175);
  }

  .terrain-forest {
    background: linear-gradient(135deg, rgba(45, 91, 61, 0.55), rgba(30, 49, 42, 0.8));
    color: rgb(188, 225, 188);
  }

  .terrain-road {
    background: linear-gradient(135deg, rgba(134, 112, 74, 0.45), rgba(72, 58, 48, 0.78));
    color: rgb(229, 212, 178);
  }

  .terrain-ruin {
    background: linear-gradient(135deg, rgba(112, 106, 101, 0.5), rgba(52, 50, 56, 0.82));
    color: rgb(217, 207, 196);
  }

  .terrain-water {
    background: linear-gradient(135deg, rgba(56, 116, 140, 0.48), rgba(35, 61, 88, 0.82));
    color: rgb(194, 228, 238);
  }

  .terrain-marsh {
    background: linear-gradient(135deg, rgba(67, 111, 91, 0.5), rgba(47, 58, 71, 0.84));
    color: rgb(197, 226, 205);
  }

  .terrain-ridge {
    background: linear-gradient(135deg, rgba(115, 122, 130, 0.52), rgba(52, 60, 74, 0.84));
    color: rgb(218, 226, 236);
  }

  .terrain-camp {
    background: linear-gradient(135deg, rgba(137, 113, 70, 0.52), rgba(58, 67, 58, 0.82));
    color: rgb(237, 218, 176);
  }

  .terrain-gate {
    background: linear-gradient(135deg, rgba(160, 137, 91, 0.55), rgba(64, 67, 84, 0.78));
    color: rgb(241, 222, 179);
  }

  @media (max-width: 767px) {
    .region-open-world-grid {
      min-height: 18rem;
      gap: 0.25rem;
    }

    .region-open-world-tile {
      min-width: 2.25rem;
      min-height: 3rem;
    }
  }
</style>
