<template>
  <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]" data-testid="online-cohabitation-shared-map-panel">
    <div class="game-panel-muted p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-accent">
          <MapIcon :size="13" />
          <p class="text-sm">共同农田地图</p>
        </div>
        <span class="text-[10px] text-muted">{{ revisionLabel }}</span>
      </div>
      <div v-if="!hasMap" class="mt-3 border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted">
        选择一份已生效契约后会显示共同农田拼接地图。
      </div>
      <template v-else>
        <div class="mt-3 grid gap-2 md:grid-cols-4">
          <div v-for="stat in stats" :key="stat.label" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[10px] text-muted">{{ stat.label }}</p>
            <p class="mt-1 text-xs text-accent">{{ stat.value }}</p>
          </div>
        </div>
        <div
          v-if="regions.length > 0"
          class="mt-3 space-y-2"
          data-testid="online-cohabitation-shared-map-region-tabs"
        >
          <div class="overflow-x-auto pb-1">
            <div class="flex min-w-max gap-2">
              <button
                v-for="region in regions"
                :key="region.region_index"
                type="button"
                class="min-h-[2.75rem] border px-3 py-2 text-left text-[10px] leading-4 transition-colors"
                :class="activeRegion?.region_index === region.region_index ? 'border-accent/60 bg-accent/10 text-accent' : 'border-accent/10 bg-black/10 text-muted hover:border-accent/30'"
                :data-testid="`online-cohabitation-shared-map-region-tab-${region.region_index}`"
                @click="emit('select-region', region.region_index)"
              >
                <span class="block text-xs">第 {{ region.region_index + 1 }} 区</span>
                <span class="block max-w-28 truncate">{{ region.member_display_name || region.member_username }}</span>
              </button>
            </div>
          </div>
          <div
            v-if="activeRegion"
            class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted"
            data-testid="online-cohabitation-shared-map-region-page-summary"
          >
            当前显示第 {{ activeRegion.region_index + 1 }} 区 ·
            {{ activeRegion.member_display_name || activeRegion.member_username }} ·
            {{ pagedPlotCount }} / {{ activeRegion.field_plot_count }} 块 ·
            {{ activeRegion.permission_mode }}
          </div>
        </div>
        <div class="mt-3 overflow-x-auto pb-1">
          <div
            class="grid min-w-max gap-1"
            :style="gridStyle"
            data-testid="online-cohabitation-shared-map-page-grid"
          >
            <template v-for="cell in cells" :key="cell.key">
              <button
                v-if="cell.plot"
                class="flex h-9 w-9 flex-col items-center justify-center border text-[9px] leading-3 transition-colors"
                :class="[plotClass(cell.plot), selectedPlotId === cell.plot.id ? 'ring-1 ring-accent/70' : '', cell.regionIndex === activeRegion?.region_index ? 'outline outline-1 outline-accent/40' : '']"
                :title="plotTitle(cell.plot)"
                type="button"
                :data-testid="`online-cohabitation-shared-farm-plot-${cell.plot.id}`"
                @click="emit('select-plot', cell.plot)"
              >
                <span>{{ plotGlyph(cell.plot) }}</span>
                <span class="max-w-full truncate px-0.5">{{ cell.plot.plot_state.crop_id || plotStateLabel(cell.plot.plot_state.state) }}</span>
              </button>
              <span v-else class="h-9 w-9 border border-dashed border-accent/10 bg-black/5" aria-hidden="true" />
            </template>
          </div>
        </div>
      </template>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
  import { Map as MapIcon } from 'lucide-vue-next'
  import type {
    CohabitationSharedPlot,
    CohabitationSharedRegion,
  } from '@/utils/cohabitationApi'

  type SummaryCard = { label: string; value: string | number }
  type StitchedSharedFarmCell = {
    key: string
    plot: CohabitationSharedPlot | null
    regionIndex: number | null
  }
  type PlotClassResolver = (plot: CohabitationSharedPlot) => string
  type PlotTextResolver = (plot: CohabitationSharedPlot) => string
  type PlotStateLabelResolver = (state: string) => string

  defineProps<{
    hasMap: boolean
    revisionLabel: string
    stats: SummaryCard[]
    regions: CohabitationSharedRegion[]
    activeRegion: CohabitationSharedRegion | null
    pagedPlotCount: number
    cells: StitchedSharedFarmCell[]
    gridStyle: Record<string, string>
    selectedPlotId: string
    plotClass: PlotClassResolver
    plotTitle: PlotTextResolver
    plotGlyph: PlotTextResolver
    plotStateLabel: PlotStateLabelResolver
  }>()

  const emit = defineEmits<{
    'select-region': [regionIndex: number]
    'select-plot': [plot: CohabitationSharedPlot]
  }>()
</script>
