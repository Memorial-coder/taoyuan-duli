<template>
  <span
    class="crop-image"
    :class="[
      `crop-image--${size}`,
      {
        'crop-image--empty': !imageUrl || loadFailed,
        'crop-image--tile': size === 'tile',
      },
    ]"
    :style="imageStyle"
  >
    <img
      v-if="imageUrl && !loadFailed"
      class="crop-image__image"
      :src="imageUrl"
      :alt="altText"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="loadFailed = true"
    />
    <span v-else class="crop-image__fallback" aria-hidden="true">
      {{ fallbackGlyph }}
    </span>
  </span>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import type { FarmPlot } from '@/types'
  import { getCropById } from '@/data'
  import {
    getCropAssetUrl,
    loadCropAssetManifest,
    resolveCropVisualState,
    warmCropAssetCache,
    type CropAssetSize,
    type CropAssetVariant,
    type CropVisualState,
  } from '@/composables/useCropAssetManifest'
  import { getCropImageVariant, loadCropImagePreferences } from '@/composables/useCropImagePreferences'

  const props = withDefaults(defineProps<{
    cropId?: string | null
    cropName?: string | null
    plot?: FarmPlot | null
    state?: CropVisualState | null
    variant?: CropAssetVariant
    resolution?: CropAssetSize
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'tile'
    fallbackMode?: 'glyph' | 'label'
    fallbackText?: string | null
  }>(), {
    cropId: null,
    cropName: null,
    plot: null,
    state: null,
    variant: undefined,
    resolution: 128,
    size: 'md',
    fallbackMode: 'glyph',
    fallbackText: null,
  })

  const loadFailed = ref(false)
  const resolvedCropId = computed(() => props.cropId || props.plot?.cropId || '')
  const cropDef = computed(() => (resolvedCropId.value ? getCropById(resolvedCropId.value) : null))
  const resolvedCropName = computed(() => props.cropName || cropDef.value?.name || '')
  const resolvedState = computed(() => props.state || resolveCropVisualState(props.plot, cropDef.value))
  const selectedVariant = computed<CropAssetVariant>(() => props.variant ?? getCropImageVariant(resolvedCropId.value))
  const lookupTarget = computed(() => ({
    cropId: resolvedCropId.value,
    cropName: resolvedCropName.value,
    state: resolvedState.value,
  }))
  const imageUrl = computed(() => getCropAssetUrl(lookupTarget.value, selectedVariant.value, props.resolution))
  const altText = computed(() => resolvedCropName.value && resolvedState.value ? `${resolvedCropName.value} ${resolvedState.value}` : 'crop image')
  const fallbackGlyph = computed(() => {
    const source = (props.fallbackText || resolvedCropName.value || resolvedCropId.value || '?').trim() || '?'
    return props.fallbackMode === 'label' || props.size === 'tile' ? source : source.slice(0, 1)
  })

  const pixelSize = computed(() => {
    if (props.size === 'xs') return 34
    if (props.size === 'sm') return 44
    if (props.size === 'lg') return 88
    if (props.size === 'tile') return 128
    return 58
  })

  const imageStyle = computed(() => ({
    width: `${pixelSize.value}px`,
    height: `${pixelSize.value}px`,
  }))

  const handleLoad = () => {
    if (imageUrl.value) warmCropAssetCache(imageUrl.value)
  }

  watch(imageUrl, () => {
    loadFailed.value = false
  })

  onMounted(() => {
    void loadCropAssetManifest()
    void loadCropImagePreferences()
  })
</script>

<style scoped>
  .crop-image {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-radius: 4px;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-success) 12%, transparent), transparent),
      rgb(var(--color-bg) / 0.46);
  }

  .crop-image__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .crop-image__fallback {
    color: var(--color-muted);
    font-size: 0.75rem;
    line-height: 1;
  }

  .crop-image--empty {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent),
      rgb(var(--color-bg) / 0.72);
  }

  .crop-image--tile {
    border-color: color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: transparent;
  }

  .crop-image--lg .crop-image__fallback {
    font-size: 1rem;
  }

  .crop-image--tile .crop-image__fallback {
    max-width: 92%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.625rem;
    line-height: 1.15;
  }
</style>
