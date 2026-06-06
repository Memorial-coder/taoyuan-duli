<template>
  <span
    class="fish-boss-image"
    :class="[
      `fish-boss-image--${size}`,
      {
        'fish-boss-image--boss': kind === 'mineBoss' || kind === 'regionBoss',
        'fish-boss-image--silhouette': silhouette,
        'fish-boss-image--empty': !imageUrl || loadFailed,
      },
    ]"
    :style="imageStyle"
  >
    <img
      v-if="imageUrl && !loadFailed"
      class="fish-boss-image__image"
      :src="imageUrl"
      :alt="altText"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="loadFailed = true"
    />
    <span v-else class="fish-boss-image__fallback" aria-hidden="true">
      {{ fallbackGlyph }}
    </span>
  </span>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import {
    getFishBossAssetUrl,
    loadFishBossAssetManifest,
    warmFishBossAssetCache,
    type FishBossAssetKind,
    type FishBossAssetSize,
    type FishBossAssetVariant,
  } from '@/composables/useFishBossAssetManifest'

  const props = withDefaults(defineProps<{
    kind?: FishBossAssetKind
    id?: string | null
    name?: string | null
    assetBase?: string | null
    variant?: FishBossAssetVariant
    resolution?: FishBossAssetSize
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    silhouette?: boolean
  }>(), {
    kind: 'asset',
    id: null,
    name: null,
    assetBase: null,
    variant: '01',
    resolution: 128,
    size: 'md',
    silhouette: false,
  })

  const loadFailed = ref(false)

  const lookupTarget = computed(() => ({
    kind: props.kind,
    id: props.id,
    name: props.name,
    assetBase: props.assetBase,
  }))

  const imageUrl = computed(() => getFishBossAssetUrl(lookupTarget.value, props.variant, props.resolution))
  const altText = computed(() => props.name ? `${props.name} image` : 'fish boss image')
  const fallbackGlyph = computed(() => {
    const source = props.name || props.assetBase || props.id || '?'
    return source.trim().slice(0, 1) || '?'
  })

  const pixelSize = computed(() => {
    if (props.size === 'xs') return 34
    if (props.size === 'sm') return 44
    if (props.size === 'lg') return 88
    if (props.size === 'xl') return 120
    return 58
  })

  const imageStyle = computed(() => ({
    width: `${pixelSize.value}px`,
    height: `${pixelSize.value}px`,
  }))

  const handleLoad = () => {
    if (imageUrl.value) warmFishBossAssetCache(imageUrl.value)
  }

  watch(imageUrl, () => {
    loadFailed.value = false
  })

  onMounted(() => {
    void loadFishBossAssetManifest()
  })
</script>

<style scoped>
  .fish-boss-image {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 4px;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-water) 16%, transparent), transparent),
      rgb(var(--color-bg) / 0.52);
  }

  .fish-boss-image__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .fish-boss-image__fallback {
    color: var(--color-muted);
    font-size: 0.75rem;
    line-height: 1;
  }

  .fish-boss-image--boss {
    border-color: color-mix(in srgb, var(--color-danger) 36%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 12%, transparent), transparent),
      rgb(var(--color-bg) / 0.58);
  }

  .fish-boss-image--empty {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent),
      rgb(var(--color-bg) / 0.74);
  }

  .fish-boss-image--silhouette .fish-boss-image__image {
    filter: grayscale(1) contrast(0.72) brightness(0.52);
    opacity: 0.62;
  }

  .fish-boss-image--lg .fish-boss-image__fallback,
  .fish-boss-image--xl .fish-boss-image__fallback {
    font-size: 1rem;
  }
</style>
