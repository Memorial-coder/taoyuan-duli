<template>
  <button
    type="button"
    class="item-card"
    :class="[
      toneClass,
      {
        'item-card--undiscovered': !discovered,
      },
    ]"
    @click="emit('click')"
  >
    <Lock v-if="locked" :size="10" class="item-card__lock" />
    <ItemIcon :item="item" size="sm" :quality="quality" :silhouette="resolvedSilhouette" />
    <span class="item-card__copy">
      <span class="item-card__name" :class="resolvedNameClass">{{ displayName }}</span>
      <span v-if="secondaryLine" class="item-card__meta">{{ secondaryLine }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Lock } from 'lucide-vue-next'
  import type { ItemDef, Quality } from '@/types'
  import ItemIcon from '@/components/game/ItemIcon.vue'

  const props = withDefaults(defineProps<{
    item?: ItemDef | null
    quantity?: number | string | null
    quality?: Quality
    locked?: boolean
    discovered?: boolean
    silhouette?: boolean
    secondary?: string
    tone?: 'normal' | 'danger'
    nameClass?: string
  }>(), {
    item: null,
    quantity: null,
    quality: 'normal',
    locked: false,
    discovered: true,
    silhouette: undefined,
    secondary: '',
    tone: 'normal',
    nameClass: '',
  })

  const emit = defineEmits<{
    (e: 'click'): void
  }>()

  const displayName = computed(() => {
    if (!props.discovered) return '未发现'
    return props.item?.name || '未知物品'
  })

  const secondaryLine = computed(() => {
    if (props.quantity !== null && props.quantity !== undefined && props.quantity !== '') return `×${props.quantity}`
    return props.secondary
  })

  const nameClass = computed(() => {
    if (!props.discovered) return 'text-muted'
    if (props.nameClass) return ''
    if (props.quality === 'fine') return 'text-quality-fine'
    if (props.quality === 'excellent') return 'text-quality-excellent'
    if (props.quality === 'supreme') return 'text-quality-supreme'
    return ''
  })

  const resolvedNameClass = computed(() => [nameClass.value, props.nameClass].filter(Boolean))

  const resolvedSilhouette = computed(() => props.silhouette ?? !props.discovered)

  const toneClass = computed(() => props.tone === 'danger' ? 'item-card--danger' : 'item-card--normal')
</script>

<style scoped>
  .item-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 58px;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
    border-radius: 4px;
    padding: 6px;
    text-align: left;
    transition: border-color 0.16s ease, background-color 0.16s ease;
  }

  .item-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 44%, transparent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .item-card--danger {
    border-color: color-mix(in srgb, var(--color-danger) 36%, transparent);
  }

  .item-card--danger:hover {
    border-color: color-mix(in srgb, var(--color-danger) 58%, transparent);
    background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  }

  .item-card--undiscovered {
    border-color: color-mix(in srgb, var(--color-muted) 24%, transparent);
  }

  .item-card__lock {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 1;
    color: color-mix(in srgb, var(--color-accent) 68%, transparent);
  }

  .item-card__copy {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
  }

  .item-card__name,
  .item-card__meta {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-card__name {
    color: rgb(var(--color-text));
    font-size: 0.6875rem;
    line-height: 1.2;
  }

  .item-card__name.text-muted {
    color: var(--color-muted);
  }

  .item-card__name.text-quality-fine {
    color: var(--color-quality-fine);
  }

  .item-card__name.text-quality-excellent {
    color: var(--color-quality-excellent);
  }

  .item-card__name.text-quality-supreme {
    color: var(--color-quality-supreme);
  }

  .item-card__name.text-accent {
    color: var(--color-accent);
  }

  .item-card__name.text-success,
  .item-card__name.text-success\/60 {
    color: var(--color-success);
  }

  .item-card__name.text-water {
    color: var(--color-water);
  }

  .item-card__name.text-earth {
    color: var(--color-earth);
  }

  .item-card__name.text-danger {
    color: var(--color-danger);
  }

  .item-card__meta {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1;
  }
</style>
