<template>
  <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="online-cohabitation-family-festival-panel">
    <div class="game-panel-muted p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-accent">
          <CalendarDays :size="13" />
          <p class="text-sm">家族节会席位</p>
        </div>
        <span class="text-[10px] text-muted">{{ panel?.festival_seats_enabled ? '已启用预览' : '未启用' }}</span>
      </div>
      <div v-if="!panel" class="mt-3 text-xs leading-5 text-muted">当前没有家族节会席位预备面板数据。</div>
      <div v-else>
        <div class="mt-3 grid gap-2 md:grid-cols-4">
          <div v-for="item in summaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[10px] text-muted">{{ item.label }}</p>
            <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
          </div>
        </div>
        <p v-if="panel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
          {{ panel.summary.disabled_reason }}
        </p>
        <p class="mt-3 text-[10px] leading-4 text-muted">{{ panel.visual_state_preview.recent_feedback }}</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-4">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-cohabitation-family-festival-reserve-confirm-trigger"
            :disabled="actionLoading || !panel.seat_reservation_enabled"
            @click="emit('reserve')"
          >
            锁席
          </button>
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-cohabitation-family-festival-room-confirm-trigger"
            :disabled="actionLoading || !panel.festival_room_binding_enabled"
            @click="emit('create-room')"
          >
            开房
          </button>
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-cohabitation-family-festival-supplies-confirm-trigger"
            :disabled="actionLoading || !panel.summary.shared_warehouse_consume_enabled"
            @click="emit('consume-supplies')"
          >
            供品
          </button>
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-cohabitation-family-festival-settle-confirm-trigger"
            :disabled="actionLoading || !panel.summary.settlement_enabled"
            @click="emit('settle-rewards')"
          >
            结算
          </button>
        </div>
        <p
          v-if="actionMessage"
          class="mt-2 text-[10px] leading-4"
          :class="actionOk ? 'text-emerald-200' : 'text-red-100'"
        >
          {{ actionMessage }}
        </p>
        <div class="relative mt-3 h-72 overflow-hidden border border-accent/10 bg-black/10">
          <div
            v-for="object in sceneObjects"
            :key="object.id"
            class="absolute min-h-10 w-24 -translate-x-1/2 -translate-y-1/2 border px-2 py-1 text-center shadow-sm"
            :class="sceneObjectClass(object.kind, object.state)"
            :style="{ left: `${object.x}%`, top: `${object.y}%` }"
          >
            <p class="truncate text-[10px] text-text">{{ object.label || object.id }}</p>
            <p class="mt-0.5 truncate text-[9px] text-muted">{{ objectKindLabel(object.kind) }} · {{ seatStateLabel(object.state) }}</p>
          </div>
        </div>
        <div class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          <div v-for="template in templates" :key="template.id" class="border border-accent/10 bg-black/10 p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ template.label }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ template.summary }}</p>
              </div>
              <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px]" :class="template.available ? 'text-accent' : 'text-muted'">
                {{ template.available ? '可预排' : '不适配' }}
              </span>
            </div>
            <p class="mt-2 text-[10px] text-muted">
              {{ visualTypeLabel(template.visual_type) }} · 上限 {{ template.member_limit }} 人 · 推荐 {{ template.recommended_roles.map(familyRoleLabel).join('、') || '暂无' }}
            </p>
            <p v-if="template.disabled_reason" class="mt-1 text-[10px] leading-4 text-muted">{{ template.disabled_reason }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="space-y-3">
      <div class="game-panel-muted p-3">
        <p class="text-sm text-accent">成员席位</p>
        <div v-if="members.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员席位。</div>
        <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          <div v-for="member in members" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ member.seat_label || '未分配席位' }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ member.display_name || member.username }} · {{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
              </div>
              <span class="shrink-0 text-[10px] text-accent">{{ seatStateLabel(member.seat_state) }}</span>
            </div>
            <p v-if="member.seat_summary" class="mt-2 text-[10px] leading-4 text-muted">{{ member.seat_summary }}</p>
            <div class="mt-2 grid gap-2 text-[10px] text-muted">
              <span>供给预览：{{ member.seat_permissions.can_prepare_supplies_preview ? '可看' : '不可用' }}</span>
              <span>开房：{{ member.seat_permissions.can_open_festival_room ? '开放' : '暂缓' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="game-panel-muted p-3">
        <p class="text-sm text-accent">结算护栏</p>
        <div class="mt-3 space-y-2">
          <div
            v-for="item in guardCards"
            :key="item.label"
            class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
          >
            <span class="text-muted">{{ item.label }}</span>
            <span class="text-accent">{{ item.value }}</span>
          </div>
        </div>
      </div>
      <div class="game-panel-muted p-3">
        <p class="text-sm text-accent">暂缓能力</p>
        <div v-if="deferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
        <div v-else class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="item in deferredOperations"
            :key="item"
            class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
          >
            {{ deferredOperationLabel(item) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { CalendarDays } from 'lucide-vue-next'
  import type {
    CohabitationFamilyFestivalSeatMember,
    CohabitationFamilyFestivalSeatSceneObject,
    CohabitationFamilyFestivalSeatTemplate,
    CohabitationFamilyFestivalSeatsPanel,
  } from '@/utils/cohabitationApi'

  type SummaryCard = { label: string; value: string | number }
  type LabelResolver = (value: string) => string
  type SceneObjectClassResolver = (kind: string, state: string) => string

  withDefaults(defineProps<{
    panel: CohabitationFamilyFestivalSeatsPanel | null
    summaryCards: SummaryCard[]
    sceneObjects: CohabitationFamilyFestivalSeatSceneObject[]
    templates: CohabitationFamilyFestivalSeatTemplate[]
    members: CohabitationFamilyFestivalSeatMember[]
    guardCards: SummaryCard[]
    deferredOperations: string[]
    actionLoading?: boolean
    actionMessage?: string
    actionOk?: boolean
    visualTypeLabel: LabelResolver
    familyRoleLabel: LabelResolver
    objectKindLabel: LabelResolver
    seatStateLabel: LabelResolver
    deferredOperationLabel: LabelResolver
    sceneObjectClass: SceneObjectClassResolver
  }>(), {
    actionLoading: false,
    actionMessage: '',
    actionOk: false,
  })

  const emit = defineEmits<{
    reserve: []
    'create-room': []
    'consume-supplies': []
    'settle-rewards': []
  }>()
</script>
