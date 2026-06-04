<template>
  <div class="npc-portrait-variant-picker" role="group" :aria-label="`${props.name || props.displayName || props.assetBase || props.id || ''} portrait variant`">
    <button
      v-for="option in variants"
      :key="option"
      type="button"
      class="npc-portrait-variant-picker__button"
      :class="{ 'npc-portrait-variant-picker__button--active': selectedVariant === option }"
      :aria-label="`use portrait ${option}`"
      @click="selectVariant(option)"
    >
      <NpcPortrait
        :id="props.id"
        :name="props.name"
        :display-name="props.displayName"
        :template-id="props.templateId"
        :asset-base="props.assetBase"
        :fallback-text="props.fallbackText || props.name || props.displayName || props.assetBase || props.id"
        :variant="option"
        size="sm"
      />
      <span>{{ option }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import NpcPortrait from '@/components/game/NpcPortrait.vue'
  import type { NpcPortraitLookup, NpcPortraitVariant } from '@/composables/useNpcPortraitManifest'
  import { getNpcPortraitVariant, loadNpcPortraitPreferences, setNpcPortraitVariant } from '@/composables/useNpcPortraitPreferences'

  const props = withDefaults(defineProps<{
    id?: string | null
    name?: string | null
    displayName?: string | null
    templateId?: string | null
    assetBase?: string | null
    fallbackText?: string | null
  }>(), {
    id: null,
    name: null,
    displayName: null,
    templateId: null,
    assetBase: null,
    fallbackText: null,
  })

  const emit = defineEmits<{
    selected: [variant: NpcPortraitVariant]
  }>()

  const variants: NpcPortraitVariant[] = ['01', '02', '03', '04', '05']
  const lookupTarget = computed<NpcPortraitLookup>(() => ({
    id: props.id,
    name: props.name,
    displayName: props.displayName,
    templateId: props.templateId,
    assetBase: props.assetBase,
  }))
  const selectedVariant = computed(() => getNpcPortraitVariant(lookupTarget.value))

  const selectVariant = (variant: NpcPortraitVariant) => {
    setNpcPortraitVariant(lookupTarget.value, variant)
    emit('selected', variant)
  }

  onMounted(() => {
    void loadNpcPortraitPreferences()
  })
</script>

<style scoped>
  .npc-portrait-variant-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: max-content;
    max-width: min(320px, calc(100vw - 32px));
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 6px;
    padding: 5px;
    background: rgb(var(--color-bg) / 0.96);
    box-shadow: 0 10px 28px rgb(0 0 0 / 0.32);
  }

  .npc-portrait-variant-picker__button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 58px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-radius: 4px;
    padding: 3px 4px;
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1;
    transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
  }

  .npc-portrait-variant-picker__button--active {
    border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
</style>
