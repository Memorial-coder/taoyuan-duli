<template>
  <span class="item-bundle-inline">
    <span v-if="displayEntries.length === 0" class="item-bundle-inline__entry">-</span>
    <span v-for="entry in displayEntries" :key="entry.key" class="item-bundle-inline__entry">
      <ItemIcon v-if="entry.item" :item="entry.item" size="xs" :show-badge="false" />
      <span class="item-bundle-inline__label">{{ entry.label }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { getItemById } from '@/data'
  import type { ItemDef } from '@/types'
  import ItemIcon from '@/components/game/ItemIcon.vue'

  type BundleEntry = {
    type?: string
    item_id?: string
    itemId?: string
    quantity?: number
    amount?: number
    ticket_type?: string
  }

  const props = withDefaults(defineProps<{
    entries?: BundleEntry[]
  }>(), {
    entries: () => [],
  })

  const multiply = '\u00d7'
  const moneyUnit = '\u6587'
  const ticketUnit = '\u5238'

  const displayEntries = computed(() => props.entries
    .filter(entry => entry && typeof entry === 'object')
    .map((entry, index) => {
      if (entry.type === 'money') {
        return {
          key: `money-${index}-${entry.amount ?? 0}`,
          item: null as ItemDef | null,
          label: `${entry.amount ?? 0}${moneyUnit}`,
        }
      }
      if (entry.type === 'ticket') {
        return {
          key: `ticket-${index}-${entry.ticket_type ?? 'ticket'}-${entry.quantity ?? 0}`,
          item: null as ItemDef | null,
          label: `${entry.ticket_type ?? 'ticket'}${ticketUnit}${multiply}${entry.quantity ?? 0}`,
        }
      }

      const itemId = entry.item_id ?? entry.itemId ?? ''
      const item = getItemById(itemId) ?? null
      return {
        key: `item-${index}-${itemId}-${entry.quantity ?? 0}`,
        item,
        label: `${item?.name ?? itemId}${multiply}${entry.quantity ?? 0}`,
      }
    }))
</script>

<style scoped>
  .item-bundle-inline {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    min-width: 0;
  }

  .item-bundle-inline__entry {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
  }

  .item-bundle-inline__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
