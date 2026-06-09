<template>
  <div v-if="cropId" class="crop-image-variant-picker" role="group" :aria-label="`${cropName || cropId} crop image variant`">
    <button
      v-for="option in variants"
      :key="option"
      type="button"
      class="crop-image-variant-picker__button"
      :class="{ 'crop-image-variant-picker__button--active': selectedVariant === option }"
      @click="setCropImageVariant(cropId, option)"
    >
      <CropImage :crop-id="cropId" :crop-name="cropName" :plot="plot" :variant="option" size="xs" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import type { FarmPlot } from '@/types'
  import CropImage from '@/components/game/CropImage.vue'
  import type { CropAssetVariant } from '@/composables/useCropAssetManifest'
  import { getCropImageVariant, loadCropImagePreferences, setCropImageVariant } from '@/composables/useCropImagePreferences'

  const props = withDefaults(defineProps<{
    cropId?: string | null
    cropName?: string | null
    plot?: FarmPlot | null
  }>(), {
    cropId: null,
    cropName: null,
    plot: null,
  })

  const variants: CropAssetVariant[] = ['01', '02']
  const selectedVariant = computed(() => getCropImageVariant(props.cropId))

  onMounted(() => {
    void loadCropImagePreferences()
  })
</script>

<style scoped>
  .crop-image-variant-picker {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .crop-image-variant-picker__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-radius: 4px;
    background: rgb(var(--color-bg) / 0.36);
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  .crop-image-variant-picker__button--active {
    border-color: color-mix(in srgb, var(--color-accent) 78%, transparent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
</style>
