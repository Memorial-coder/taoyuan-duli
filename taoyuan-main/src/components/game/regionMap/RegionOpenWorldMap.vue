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
            <p class="text-xs text-accent mt-0.5">{{ discoveredCount }}/{{ activeRegion.totalTileCount }}</p>
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
        <div class="region-open-world-map-toolbar">
          <button
            type="button"
            class="region-open-world-focus-button"
            :disabled="!playerTile || isPlayerInVisibleViewport"
            data-testid="region-open-world-focus-current"
            @click="$emit('focus-current')"
          >
            <MapPin :size="13" />
            <span>返回当前位置</span>
          </button>
        </div>
        <div
          ref="viewportRef"
          class="region-open-world-viewport"
          :class="{ 'is-dragging': isDragging }"
          data-testid="region-open-world-viewport"
          @pointerdown="handleGridPointerDown"
          @pointermove="handleGridPointerMove"
          @pointerup="handleGridPointerEnd"
          @pointercancel="handleGridPointerEnd"
          @lostpointercapture="handleGridPointerEnd"
          @wheel="handleGridWheel"
          @click.capture="handleGridClickCapture"
        >
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
            :style="tileGridStyle(tile)"
            :disabled="tile.locked && !tile.discovered"
            :data-testid="`region-open-world-tile-${tile.id}`"
            @click="$emit('select-tile', tile.id)"
          >
            <span class="region-open-world-object">{{ tileIcon(tile) }}</span>
            <span class="region-open-world-label">{{ tile.discovered ? tile.label : '迷雾' }}</span>
            <span v-if="tile.discovered && tile.status !== 'fresh'" class="region-open-world-mark">{{ tile.statusLabel }}</span>
          </button>
          <span
            v-if="playerTokenVisible"
            class="region-open-world-player"
            data-testid="region-open-world-player"
            :style="playerTokenStyle"
            aria-hidden="true"
          >
            ●
          </span>
          </div>
          <button
            v-if="playerOffscreenIndicatorVisible"
            type="button"
            class="region-open-world-player-indicator"
            data-testid="region-open-world-player-indicator"
            :style="playerOffscreenIndicatorStyle"
            @click.stop="$emit('focus-current')"
          >
            <span
              class="region-open-world-player-indicator-arrow"
              :style="playerOffscreenIndicatorArrowStyle"
              aria-hidden="true"
            ></span>
            <span class="region-open-world-player-indicator-label">当前位置</span>
          </button>
          <div class="region-open-world-zoom-controls" aria-label="地图缩放控制">
            <button
              type="button"
              class="region-open-world-zoom-button"
              :disabled="!canZoomIn"
              aria-label="放大地图"
              data-testid="region-open-world-zoom-in"
              @click.stop="handleZoomIn"
            >
              <Plus :size="16" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="region-open-world-zoom-button"
              :disabled="!canZoomOut"
              aria-label="缩小地图"
              data-testid="region-open-world-zoom-out"
              @click.stop="handleZoomOut"
            >
              <Minus :size="16" aria-hidden="true" />
            </button>
          </div>
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
              <span v-if="selectedTile.moveStaminaCost > 0" class="text-[0.625rem] text-muted ml-1">
                {{ selectedTile.moveStaminaCost }}体
              </span>
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
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import type { CSSProperties } from 'vue'
  import { MapPin, Minus, Plus } from 'lucide-vue-next'
  import type {
    RegionOpenWorldActionId,
    RegionOpenWorldId,
    RegionOpenWorldLogEntry,
    RegionOpenWorldRegionEntry,
    RegionOpenWorldRegionWindowView,
    RegionOpenWorldTileDef,
    RegionOpenWorldTileView,
    RegionOpenWorldViewportSize
  } from '@/types/region'

  const props = defineProps<{
    regions: RegionOpenWorldRegionEntry[]
    activeRegion: RegionOpenWorldRegionWindowView
    selectedTile: RegionOpenWorldTileView | null
    dayTag: string
    logs: RegionOpenWorldLogEntry[]
    repairedOutpostCount: number
  }>()

  const emit = defineEmits<{
    (event: 'select-region', regionId: RegionOpenWorldId): void
    (event: 'select-tile', tileId: string): void
    (event: 'pan-viewport', delta: { deltaX: number; deltaY: number }): void
    (event: 'viewport-size', size: RegionOpenWorldViewportSize): void
    (event: 'focus-current'): void
    (event: 'move', tileId: string): void
    (event: 'perform-action', tileId: string, actionId: RegionOpenWorldActionId): void
  }>()

  type DragState = {
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    didDrag: boolean
  }

  type PointerPosition = {
    x: number
    y: number
  }

  type PinchState = {
    startDistance: number
    startZoom: number
  }

  const DRAG_THRESHOLD_PX = 6
  const TILE_WIDTH_PX = 118
  const TILE_HEIGHT_PX = 58
  const TILE_GAP_PX = 6
  const MIN_VISIBLE_COLUMNS = 3
  const MIN_VISIBLE_ROWS = 4
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 1.6
  const ZOOM_STEP = 0.15
  const ZOOM_PRECISION = 100
  const PLAYER_INDICATOR_EDGE_MIN_PERCENT = 6
  const PLAYER_INDICATOR_EDGE_MAX_PERCENT = 94
  const PLAYER_INDICATOR_ZOOM_COLLISION_X_PERCENT = 58
  const PLAYER_INDICATOR_ZOOM_COLLISION_Y_PERCENT = 82
  const PLAYER_INDICATOR_ZOOM_CONTROL_CLEARANCE = '5.25rem'
  const viewportRef = ref<HTMLElement | null>(null)
  const dragState = ref<DragState | null>(null)
  const pinchState = ref<PinchState | null>(null)
  const isDragging = ref(false)
  const suppressNextClick = ref(false)
  const zoomLevel = ref(1)
  const activePointerPositions = new Map<number, PointerPosition>()
  let viewportResizeObserver: ResizeObserver | null = null

  const renderColumnCount = computed(() => Math.max(1, props.activeRegion.bounds.maxX - props.activeRegion.bounds.minX + 1))
  const renderRowCount = computed(() => Math.max(1, props.activeRegion.bounds.maxY - props.activeRegion.bounds.minY + 1))
  const visibleColumnCount = computed(() => Math.max(1, props.activeRegion.visibleColumnCount))
  const visibleRowCount = computed(() => Math.max(1, props.activeRegion.visibleRowCount))
  const cameraOffsetX = computed(() => props.activeRegion.camera.x - props.activeRegion.bounds.minX)
  const cameraOffsetY = computed(() => props.activeRegion.camera.y - props.activeRegion.bounds.minY)
  const zoomedTileWidth = computed(() => TILE_WIDTH_PX * zoomLevel.value)
  const zoomedTileHeight = computed(() => TILE_HEIGHT_PX * zoomLevel.value)
  const zoomedTileGap = computed(() => TILE_GAP_PX * zoomLevel.value)
  const zoomedTileStepX = computed(() => zoomedTileWidth.value + zoomedTileGap.value)
  const zoomedTileStepY = computed(() => zoomedTileHeight.value + zoomedTileGap.value)
  const canZoomIn = computed(() => zoomLevel.value < ZOOM_MAX)
  const canZoomOut = computed(() => zoomLevel.value > ZOOM_MIN)
  const toPx = (value: number) => `${Math.round(value * 1000) / 1000}px`
  const gridStyle = computed<CSSProperties>(() => ({
    gridTemplateColumns: `repeat(${renderColumnCount.value}, ${toPx(zoomedTileWidth.value)})`,
    gridTemplateRows: `repeat(${renderRowCount.value}, ${toPx(zoomedTileHeight.value)})`,
    gap: toPx(zoomedTileGap.value),
    width: toPx(renderColumnCount.value * zoomedTileWidth.value + Math.max(0, renderColumnCount.value - 1) * zoomedTileGap.value),
    height: toPx(renderRowCount.value * zoomedTileHeight.value + Math.max(0, renderRowCount.value - 1) * zoomedTileGap.value),
    transform: `translate3d(${toPx(-cameraOffsetX.value * zoomedTileStepX.value)}, ${toPx(-cameraOffsetY.value * zoomedTileStepY.value)}, 0)`,
    '--region-open-world-zoom': `${zoomLevel.value}`
  }))

  const discoveredCount = computed(() => props.activeRegion.discoveredCount)
  const handbookSummary = computed(() => `${discoveredCount.value}/${props.activeRegion.totalTileCount}`)
  const tileGridStyle = (tile: RegionOpenWorldTileView) => ({
    gridColumn: `${tile.x - props.activeRegion.bounds.minX + 1}`,
    gridRow: `${tile.y - props.activeRegion.bounds.minY + 1}`
  })
  const playerTile = computed<RegionOpenWorldTileDef | RegionOpenWorldTileView | null>(() =>
    props.activeRegion.tiles.find(tile => tile.current) ??
    props.activeRegion.def.tiles.find(tile => tile.id === props.activeRegion.state.playerTileId) ??
    null
  )
  const playerInRenderBounds = computed(() => {
    const tile = playerTile.value
    if (!tile) return false
    return (
      tile.x >= props.activeRegion.bounds.minX &&
      tile.x <= props.activeRegion.bounds.maxX &&
      tile.y >= props.activeRegion.bounds.minY &&
      tile.y <= props.activeRegion.bounds.maxY
    )
  })
  const playerViewportPosition = computed(() => {
    const tile = playerTile.value
    if (!tile) return null
    return {
      x: ((tile.x + 0.5 - props.activeRegion.camera.x) / visibleColumnCount.value) * 100,
      y: ((tile.y + 0.5 - props.activeRegion.camera.y) / visibleRowCount.value) * 100
    }
  })
  const isPlayerInVisibleViewport = computed(() => {
    const position = playerViewportPosition.value
    return Boolean(position && position.x >= 0 && position.x <= 100 && position.y >= 0 && position.y <= 100)
  })
  const playerTokenVisible = computed(() => playerInRenderBounds.value)
  const playerTokenStyle = computed<CSSProperties>(() => {
    const tile = playerTile.value
    if (!tile) return {}
    const localX = tile.x - props.activeRegion.bounds.minX
    const localY = tile.y - props.activeRegion.bounds.minY
    return {
      left: toPx(localX * zoomedTileStepX.value + zoomedTileWidth.value / 2),
      top: toPx(localY * zoomedTileStepY.value + zoomedTileHeight.value / 2)
    }
  })
  const playerOffscreenIndicatorVisible = computed(() => Boolean(playerViewportPosition.value && !isPlayerInVisibleViewport.value))
  const clampIndicatorPercent = (value: number) => Math.min(PLAYER_INDICATOR_EDGE_MAX_PERCENT, Math.max(PLAYER_INDICATOR_EDGE_MIN_PERCENT, value))
  const playerOffscreenIndicatorStyle = computed<CSSProperties>(() => {
    const position = playerViewportPosition.value
    if (!position) return {}
    const left = clampIndicatorPercent(position.x)
    const top = clampIndicatorPercent(position.y)
    const shouldClearZoomControls = left >= PLAYER_INDICATOR_ZOOM_COLLISION_X_PERCENT && top >= PLAYER_INDICATOR_ZOOM_COLLISION_Y_PERCENT
    return {
      left: `${left}%`,
      top: shouldClearZoomControls ? `min(${top}%, calc(100% - ${PLAYER_INDICATOR_ZOOM_CONTROL_CLEARANCE}))` : `${top}%`
    }
  })
  const playerOffscreenIndicatorArrowStyle = computed<CSSProperties>(() => {
    const position = playerViewportPosition.value
    if (!position) return {}
    const rotation = Math.atan2(position.y - 50, position.x - 50) * 180 / Math.PI + 90
    return {
      transform: `rotate(${rotation}deg)`
    }
  })

  const getVisibleTileCount = (availablePx: number, stepPx: number, gapPx: number, minCount: number, maxCount: number) => {
    const measuredCount = Math.floor((Math.max(1, availablePx) + gapPx) / stepPx)
    const safeMax = Math.max(1, maxCount)
    return Math.min(safeMax, Math.max(Math.min(minCount, safeMax), measuredCount))
  }

  const updateViewportSize = () => {
    const rect = viewportRef.value?.getBoundingClientRect()
    if (!rect) return
    const columns = getVisibleTileCount(rect.width, zoomedTileStepX.value, zoomedTileGap.value, MIN_VISIBLE_COLUMNS, props.activeRegion.def.width)
    const rows = getVisibleTileCount(rect.height, zoomedTileStepY.value, zoomedTileGap.value, MIN_VISIBLE_ROWS, props.activeRegion.def.height)
    if (columns === props.activeRegion.visibleColumnCount && rows === props.activeRegion.visibleRowCount) return
    emit('viewport-size', { columns, rows })
  }

  const getViewportCellSize = () => {
    return {
      width: zoomedTileStepX.value,
      height: zoomedTileStepY.value
    }
  }

  const clampZoomLevel = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(value) ? value : 1))

  const setZoomLevel = (value: number) => {
    const nextZoomLevel = Math.round(clampZoomLevel(value) * ZOOM_PRECISION) / ZOOM_PRECISION
    if (nextZoomLevel === zoomLevel.value) return
    zoomLevel.value = nextZoomLevel
  }

  const handleZoomIn = () => {
    setZoomLevel(zoomLevel.value + ZOOM_STEP)
  }

  const handleZoomOut = () => {
    setZoomLevel(zoomLevel.value - ZOOM_STEP)
  }

  const handleGridWheel = (event: WheelEvent) => {
    if (event.deltaY === 0) return
    event.preventDefault()
    setZoomLevel(zoomLevel.value + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
  }

  const scheduleClickSuppressionReset = () => {
    if (!suppressNextClick.value || typeof window === 'undefined') return
    window.setTimeout(() => {
      suppressNextClick.value = false
    }, 0)
  }

  const updatePointerPosition = (event: PointerEvent) => {
    activePointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    })
  }

  const getActivePinchPointers = () => Array.from(activePointerPositions.values()).slice(0, 2)

  const getPointerDistance = (first: PointerPosition, second: PointerPosition) =>
    Math.max(1, Math.hypot(first.x - second.x, first.y - second.y))

  const startPinchGesture = () => {
    const pointers = getActivePinchPointers()
    if (pointers.length < 2) return
    pinchState.value = {
      startDistance: getPointerDistance(pointers[0]!, pointers[1]!),
      startZoom: zoomLevel.value
    }
    dragState.value = null
    isDragging.value = false
  }

  const handlePinchMove = (event: PointerEvent) => {
    if (activePointerPositions.size < 2) return false
    if (!pinchState.value) startPinchGesture()
    const state = pinchState.value
    const pointers = getActivePinchPointers()
    if (!state || pointers.length < 2) return false
    const distance = getPointerDistance(pointers[0]!, pointers[1]!)
    setZoomLevel(state.startZoom * (distance / state.startDistance))
    event.preventDefault()
    return true
  }

  onMounted(() => {
    void nextTick(updateViewportSize)
    if (typeof ResizeObserver === 'undefined' || !viewportRef.value) return
    viewportResizeObserver = new ResizeObserver(updateViewportSize)
    viewportResizeObserver.observe(viewportRef.value)
  })

  onBeforeUnmount(() => {
    viewportResizeObserver?.disconnect()
    viewportResizeObserver = null
  })

  watch(
    () => props.activeRegion.def.id,
    () => {
      void nextTick(updateViewportSize)
    }
  )

  watch(zoomLevel, () => {
    void nextTick(updateViewportSize)
  })

  const handleGridPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    updatePointerPosition(event)
    if (event.pointerType !== 'mouse') {
      const target = event.currentTarget as HTMLElement | null
      target?.setPointerCapture?.(event.pointerId)
    }
    if (activePointerPositions.size >= 2) {
      startPinchGesture()
      return
    }
    dragState.value = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      didDrag: false
    }
  }

  const handleGridPointerMove = (event: PointerEvent) => {
    if (activePointerPositions.has(event.pointerId)) updatePointerPosition(event)
    if (pinchState.value || activePointerPositions.size >= 2) {
      if (handlePinchMove(event)) return
    }
    const state = dragState.value
    if (!state || state.pointerId !== event.pointerId) return
    const wasDragging = state.didDrag
    const stepX = event.clientX - state.lastX
    const stepY = event.clientY - state.lastY
    const totalX = event.clientX - state.startX
    const totalY = event.clientY - state.startY
    if (!state.didDrag && Math.hypot(totalX, totalY) >= DRAG_THRESHOLD_PX) {
      state.didDrag = true
      isDragging.value = true
      const target = event.currentTarget as HTMLElement | null
      target?.setPointerCapture?.(event.pointerId)
    }
    state.lastX = event.clientX
    state.lastY = event.clientY
    if (!state.didDrag) return

    event.preventDefault()
    const cell = getViewportCellSize()
    const dragX = wasDragging ? stepX : totalX
    const dragY = wasDragging ? stepY : totalY
    const deltaX = -dragX / cell.width
    const deltaY = -dragY / cell.height
    if (deltaX === 0 && deltaY === 0) return
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return

    emit('pan-viewport', { deltaX, deltaY })
  }

  const handleGridPointerEnd = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null
    if (target?.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId)
    activePointerPositions.delete(event.pointerId)
    if (pinchState.value) {
      suppressNextClick.value = true
      pinchState.value = null
      dragState.value = null
      isDragging.value = false
      scheduleClickSuppressionReset()
      return
    }
    const state = dragState.value
    if (!state || state.pointerId !== event.pointerId) return
    suppressNextClick.value = state.didDrag
    dragState.value = null
    isDragging.value = false
    scheduleClickSuppressionReset()
  }

  const handleGridClickCapture = (event: MouseEvent) => {
    if (!suppressNextClick.value) return
    event.preventDefault()
    event.stopPropagation()
    suppressNextClick.value = false
  }

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

  .region-open-world-map-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
  }

  .region-open-world-focus-button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.85rem;
    border: 1px solid rgba(168, 138, 86, 0.24);
    border-radius: 0.125rem;
    padding: 0.3rem 0.55rem;
    color: rgb(168, 138, 86);
    font-size: 0.7rem;
    background: rgba(15, 17, 22, 0.72);
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }

  .region-open-world-focus-button:hover:not(:disabled) {
    border-color: rgba(168, 138, 86, 0.6);
    background: rgba(168, 138, 86, 0.08);
  }

  .region-open-world-focus-button:disabled {
    cursor: default;
    color: rgba(220, 220, 220, 0.42);
    border-color: rgba(220, 220, 220, 0.12);
  }

  .region-open-world-viewport {
    position: relative;
    height: clamp(24rem, 58vh, 40rem);
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .region-open-world-viewport.is-dragging {
    cursor: grabbing;
  }

  .region-open-world-grid {
    display: grid;
    position: relative;
    transform-origin: top left;
    will-change: transform;
  }

  .region-open-world-tile {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(168, 138, 86, 0.2);
    border-radius: 0.125rem;
    padding: calc(0.25rem * var(--region-open-world-zoom, 1));
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
    width: calc(1.35rem * var(--region-open-world-zoom, 1));
    height: calc(1.35rem * var(--region-open-world-zoom, 1));
    line-height: calc(1.35rem * var(--region-open-world-zoom, 1));
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.18);
    color: currentColor;
    font-size: calc(0.7rem * var(--region-open-world-zoom, 1));
  }

  .region-open-world-label {
    display: block;
    margin-top: calc(0.3rem * var(--region-open-world-zoom, 1));
    font-size: calc(0.625rem * var(--region-open-world-zoom, 1));
    line-height: calc(0.85rem * var(--region-open-world-zoom, 1));
    color: currentColor;
  }

  .region-open-world-mark {
    position: absolute;
    right: calc(0.2rem * var(--region-open-world-zoom, 1));
    bottom: calc(0.15rem * var(--region-open-world-zoom, 1));
    font-size: calc(0.55rem * var(--region-open-world-zoom, 1));
    color: rgba(255, 255, 255, 0.72);
  }

  .region-open-world-player {
    position: absolute;
    z-index: 5;
    width: calc(1rem * var(--region-open-world-zoom, 1));
    height: calc(1rem * var(--region-open-world-zoom, 1));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: 1px solid rgba(104, 211, 145, 0.75);
    background: rgba(10, 18, 14, 0.86);
    box-shadow: 0 0 0 2px rgba(104, 211, 145, 0.2), 0 0 10px rgba(104, 211, 145, 0.35);
    color: rgb(104, 211, 145);
    font-size: calc(0.55rem * var(--region-open-world-zoom, 1));
    line-height: 1;
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: left 0.26s ease, top 0.26s ease;
  }

  .region-open-world-viewport.is-dragging .region-open-world-player {
    transition: none;
  }

  .region-open-world-player-indicator {
    position: absolute;
    z-index: 7;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 1.6rem;
    max-width: 7rem;
    border: 1px solid rgba(104, 211, 145, 0.48);
    border-radius: 0.125rem;
    padding: 0.25rem 0.45rem;
    background: rgba(8, 15, 12, 0.92);
    color: rgb(104, 211, 145);
    font-size: 0.625rem;
    box-shadow: 0 0 0 1px rgba(104, 211, 145, 0.15), 0 0 12px rgba(104, 211, 145, 0.22);
    transform: translate(-50%, -50%);
  }

  .region-open-world-player-indicator-arrow {
    width: 0;
    height: 0;
    border-left: 0.24rem solid transparent;
    border-right: 0.24rem solid transparent;
    border-bottom: 0.46rem solid currentColor;
    transform-origin: 50% 60%;
  }

  .region-open-world-player-indicator-label {
    white-space: nowrap;
  }

  .region-open-world-zoom-controls {
    position: absolute;
    right: 0.65rem;
    bottom: 0.65rem;
    z-index: 8;
    display: inline-flex;
    gap: 0.35rem;
    padding: 0.25rem;
    border: 1px solid rgba(168, 138, 86, 0.28);
    border-radius: 0.25rem;
    background: rgba(10, 12, 16, 0.9);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.28), 0 0.5rem 1.4rem rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .region-open-world-zoom-button {
    width: 2.1rem;
    height: 2.1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(168, 138, 86, 0.36);
    border-radius: 0.2rem;
    color: rgb(236, 207, 153);
    background: rgba(25, 28, 35, 0.92);
    pointer-events: auto;
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }

  .region-open-world-zoom-button:hover:not(:disabled) {
    border-color: rgba(236, 207, 153, 0.72);
    background: rgba(168, 138, 86, 0.18);
    transform: translateY(-1px);
  }

  .region-open-world-zoom-button:focus-visible {
    outline: 2px solid rgba(236, 207, 153, 0.86);
    outline-offset: 2px;
  }

  .region-open-world-zoom-button:disabled {
    cursor: default;
    color: rgba(220, 220, 220, 0.32);
    border-color: rgba(220, 220, 220, 0.14);
    background: rgba(17, 19, 24, 0.82);
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
    .region-open-world-viewport {
      height: clamp(22rem, 62vh, 36rem);
    }

    .region-open-world-zoom-controls {
      right: 0.55rem;
      bottom: 0.55rem;
      gap: 0.45rem;
      padding: 0.3rem;
    }

    .region-open-world-zoom-button {
      width: 2.6rem;
      height: 2.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .region-open-world-player {
      transition: none;
    }
  }
</style>
