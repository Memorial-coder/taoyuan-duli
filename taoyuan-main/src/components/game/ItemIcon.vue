<template>
  <span
    class="item-icon"
    :class="[
      `item-icon--${size}`,
      qualityClass,
      {
        'item-icon--silhouette': silhouette,
        'item-icon--empty': !iconUrl || loadFailed,
      },
    ]"
    :style="iconStyle"
  >
    <img
      v-if="iconUrl && !loadFailed"
      class="item-icon__image"
      :src="iconUrl"
      :alt="altText"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="loadFailed = true"
    />
    <span v-else class="item-icon__fallback" aria-hidden="true">
      {{ fallbackText }}
    </span>
    <span v-if="showQualityBadge" class="item-icon__badge" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import type { ItemDef, Quality } from '@/types'
  import { getItemIconUrl, loadItemIconManifest, warmItemIconCache, type ItemIconSize, type ItemIconVariant } from '@/composables/useItemIconManifest'
  import { getItemIconVariant, loadItemIconPreferences } from '@/composables/useItemIconPreferences'

  const props = withDefaults(defineProps<{
    item?: ItemDef | null
    variant?: ItemIconVariant
    resolution?: ItemIconSize
    size?: 'xs' | 'sm' | 'md' | 'lg'
    quality?: Quality
    silhouette?: boolean
    showBadge?: boolean
  }>(), {
    item: null,
    variant: undefined,
    resolution: 128,
    size: 'md',
    quality: 'normal',
    silhouette: false,
    showBadge: true,
  })

  const loadFailed = ref(false)

  const pixelSize = computed(() => {
    if (props.size === 'xs') return 34
    if (props.size === 'sm') return 44
    if (props.size === 'lg') return 88
    return 56
  })

  const selectedVariant = computed<ItemIconVariant>(() => props.variant ?? getItemIconVariant(props.item?.id))
  const iconUrl = computed(() => getItemIconUrl(props.item, selectedVariant.value, props.resolution))
  const altText = computed(() => props.item?.name ? `${props.item.name} icon` : 'item icon')
  const fallbackText = computed(() => props.item?.name?.trim().slice(0, 1) || '?')
  const iconStyle = computed(() => ({
    width: `${pixelSize.value}px`,
    height: `${pixelSize.value}px`,
  }))

  const qualityClass = computed(() => {
    if (props.quality === 'fine') return 'item-icon--fine'
    if (props.quality === 'excellent') return 'item-icon--excellent'
    if (props.quality === 'supreme') return 'item-icon--supreme'
    return 'item-icon--normal'
  })

  const showQualityBadge = computed(() => props.showBadge && props.quality !== 'normal')

  const handleLoad = () => {
    if (iconUrl.value) warmItemIconCache(iconUrl.value)
  }

  watch(iconUrl, () => {
    loadFailed.value = false
  })

  onMounted(() => {
    void loadItemIconManifest()
    void loadItemIconPreferences()
  })
</script>

<style scoped>
  .item-icon {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 4px;
    background: rgb(var(--color-bg) / 0.42);
  }

  .item-icon__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-icon__fallback {
    color: var(--color-muted);
    font-size: 0.75rem;
    line-height: 1;
  }

  .item-icon--empty {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent),
      rgb(var(--color-bg) / 0.7);
  }

  .item-icon--silhouette .item-icon__image {
    filter: grayscale(1) contrast(0.72) brightness(0.52);
    opacity: 0.62;
  }

  .item-icon--fine {
    border-color: color-mix(in srgb, var(--color-quality-fine) 66%, transparent);
  }

  .item-icon--excellent {
    border-color: color-mix(in srgb, var(--color-quality-excellent) 72%, transparent);
  }

  .item-icon--supreme {
    border-color: color-mix(in srgb, var(--color-quality-supreme) 76%, transparent);
  }

  .item-icon__badge {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 8px;
    height: 8px;
    border: 1px solid rgb(var(--color-bg));
    border-radius: 999px;
    background: var(--color-accent);
  }

  .item-icon--fine .item-icon__badge {
    background: var(--color-quality-fine);
  }

  .item-icon--excellent .item-icon__badge {
    background: var(--color-quality-excellent);
  }

  .item-icon--supreme .item-icon__badge {
    background: var(--color-quality-supreme);
  }
</style>
