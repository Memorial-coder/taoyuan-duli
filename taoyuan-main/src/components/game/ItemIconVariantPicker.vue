<template>
  <div class="item-icon-variant-picker" role="group" :aria-label="`${item?.name || ''} icon variant`">
    <button
      v-for="option in variants"
      :key="option"
      type="button"
      class="item-icon-variant-picker__button"
      :class="{ 'item-icon-variant-picker__button--active': selectedVariant === option }"
      :aria-label="`use icon ${option}`"
      @click="setItemIconVariant(item?.id, option)"
    >
      <ItemIcon :item="item" :variant="option" size="xs" :show-badge="false" />
      <span>{{ option }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import type { ItemDef } from '@/types'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { getItemIconVariant, loadItemIconPreferences, setItemIconVariant } from '@/composables/useItemIconPreferences'
  import type { ItemIconVariant } from '@/composables/useItemIconManifest'

  const props = defineProps<{
    item?: ItemDef | null
  }>()

  const variants: ItemIconVariant[] = ['01', '02', '03']
  const selectedVariant = computed(() => getItemIconVariant(props.item?.id))

  onMounted(() => {
    void loadItemIconPreferences()
  })
</script>

<style scoped>
  .item-icon-variant-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .item-icon-variant-picker__button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 54px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-radius: 4px;
    padding: 3px 4px;
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1;
    transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
  }

  .item-icon-variant-picker__button--active {
    border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
</style>
