<template>
  <span
    class="npc-portrait"
    :class="[
      `npc-portrait--${size}`,
      {
        'npc-portrait--disabled': !portraitsEnabled,
        'npc-portrait--silhouette': silhouette,
        'npc-portrait--empty': !portraitUrl || loadFailed,
      },
    ]"
    :style="portraitStyle"
  >
    <img
      v-if="portraitsEnabled && portraitUrl && !loadFailed"
      class="npc-portrait__image"
      :src="portraitUrl"
      :alt="altText"
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="loadFailed = true"
    />
    <span v-else class="npc-portrait__fallback" aria-hidden="true">
      {{ fallbackGlyph }}
    </span>
  </span>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useSettingsStore } from '@/stores/useSettingsStore'
  import {
    getNpcPortraitUrl,
    loadNpcPortraitManifest,
    warmNpcPortraitCache,
    type NpcPortraitSize,
    type NpcPortraitVariant,
  } from '@/composables/useNpcPortraitManifest'
  import { getNpcPortraitVariant, loadNpcPortraitPreferences } from '@/composables/useNpcPortraitPreferences'

  const props = withDefaults(defineProps<{
    id?: string | null
    name?: string | null
    displayName?: string | null
    templateId?: string | null
    assetBase?: string | null
    variant?: NpcPortraitVariant
    resolution?: NpcPortraitSize
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    fallbackText?: string | null
    silhouette?: boolean
  }>(), {
    id: null,
    name: null,
    displayName: null,
    templateId: null,
    assetBase: null,
    resolution: 128,
    size: 'md',
    fallbackText: null,
    silhouette: false,
  })

  const settingsStore = useSettingsStore()
  const loadFailed = ref(false)

  const portraitsEnabled = computed(() => settingsStore.npcPortraitsEnabled)
  const lookupTarget = computed(() => ({
    id: props.id,
    name: props.name,
    displayName: props.displayName,
    templateId: props.templateId,
    assetBase: props.assetBase,
  }))
  const selectedVariant = computed<NpcPortraitVariant>(() => props.variant ?? getNpcPortraitVariant(lookupTarget.value))
  const portraitUrl = computed(() => portraitsEnabled.value ? getNpcPortraitUrl(lookupTarget.value, selectedVariant.value, props.resolution) : '')
  const altText = computed(() => props.name ? `${props.name} portrait` : 'npc portrait')
  const fallbackGlyph = computed(() => {
    const source = props.fallbackText || props.name || props.displayName || props.assetBase || props.id || '?'
    return source.trim().slice(0, 1) || '?'
  })

  const pixelSize = computed(() => {
    if (props.size === 'xs') return 32
    if (props.size === 'sm') return 42
    if (props.size === 'lg') return 78
    if (props.size === 'xl') return 112
    return 56
  })

  const portraitStyle = computed(() => ({
    width: `${pixelSize.value}px`,
    height: `${pixelSize.value}px`,
  }))

  const handleLoad = () => {
    if (portraitUrl.value) warmNpcPortraitCache(portraitUrl.value)
  }

  watch(portraitUrl, () => {
    loadFailed.value = false
  })

  watch(portraitsEnabled, enabled => {
    if (enabled) void loadNpcPortraitManifest()
  })

  onMounted(() => {
    void loadNpcPortraitPreferences()
    if (portraitsEnabled.value) void loadNpcPortraitManifest()
  })
</script>

<style scoped>
  .npc-portrait {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 6px;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent),
      rgb(var(--color-bg) / 0.68);
  }

  .npc-portrait__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .npc-portrait__fallback {
    color: var(--color-muted);
    font-size: 0.75rem;
    line-height: 1;
  }

  .npc-portrait--xs .npc-portrait__fallback,
  .npc-portrait--sm .npc-portrait__fallback {
    font-size: 0.6875rem;
  }

  .npc-portrait--lg .npc-portrait__fallback,
  .npc-portrait--xl .npc-portrait__fallback {
    font-size: 1rem;
  }

  .npc-portrait--disabled {
    border-color: color-mix(in srgb, var(--color-muted) 16%, transparent);
  }

  .npc-portrait--empty {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent),
      rgb(var(--color-bg) / 0.74);
  }

  .npc-portrait--silhouette .npc-portrait__image {
    filter: grayscale(1) contrast(0.72) brightness(0.52);
    opacity: 0.62;
  }
</style>
