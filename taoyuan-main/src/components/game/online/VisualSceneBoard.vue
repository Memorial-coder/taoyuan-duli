<template>
  <section class="visual-scene-board" data-testid="visual-scene-board">
    <div
      class="visual-scene-board__stage"
      role="group"
      aria-label="可视化场景点击热区"
      data-testid="visual-scene-hotzone-stage"
    >
      <button
        v-for="object in visibleObjects"
        :key="object.id"
        type="button"
        class="visual-scene-board__object visual-scene-board__object--hotzone"
        :class="[
          `visual-scene-board__object--${object.state}`,
          { 'visual-scene-board__object--selected': object.id === activeObjectId },
        ]"
        :style="{ left: `${object.x}%`, top: `${object.y}%` }"
        :data-testid="`visual-scene-object-${object.id}`"
        :title="objectTooltip(object)"
        @click="selectObject(object.id)"
      >
        <component :is="objectIcon(object)" :size="16" aria-hidden="true" />
        <span class="visual-scene-board__object-label">{{ object.label || object.kind || object.id }}</span>
        <span v-if="object.progress_target > 0" class="visual-scene-board__object-progress">
          {{ object.progress_value }}/{{ object.progress_target }}
        </span>
      </button>
    </div>

    <div class="visual-scene-board__side">
      <template v-if="!isCompactViewport">
        <div v-if="selectedObject" class="visual-scene-board__detail" data-testid="visual-scene-object-detail">
          <div class="visual-scene-board__detail-head">
            <div class="min-w-0">
              <p class="visual-scene-board__title">{{ selectedObject.label || selectedObject.id }}</p>
              <p class="visual-scene-board__meta">{{ stateLabel(selectedObject.state) }} · {{ selectedObject.kind || 'object' }}</p>
            </div>
            <span v-if="selectedObject.handled_by" class="visual-scene-board__handler">
              {{ selectedObject.handled_by }}
            </span>
          </div>

          <div v-if="selectedObject.progress_target > 0" class="visual-scene-board__progress" aria-label="物件进度">
            <div
              class="visual-scene-board__progress-bar"
              :style="{ width: `${objectProgressPercent(selectedObject)}%` }"
            />
          </div>

          <div v-if="selectedObject.requires_cooperation" class="visual-scene-board__cooperation">
            协作 {{ selectedObject.cooperation_current_count }} / {{ selectedObject.cooperation_required_count }}
          </div>

          <div
            v-if="selectedObjectFailureReason || selectedObjectImpactText"
            class="visual-scene-board__readable-feedback"
            data-testid="visual-scene-readable-feedback"
          >
            <p v-if="selectedObjectFailureReason" class="visual-scene-board__readable-line visual-scene-board__readable-line--warning">
              失败原因：{{ selectedObjectFailureReason }}
            </p>
            <p v-if="selectedObjectImpactText" class="visual-scene-board__readable-line">
              影响范围：{{ selectedObjectImpactText }}
            </p>
          </div>

          <OnlineTechnicalDetails
            v-if="selectedObjectTechnicalReason"
            class="visual-scene-board__technical-details"
            title="规则细节"
            summary="展开查看物件状态与协作判断。"
          >
            <p data-testid="visual-scene-technical-reason">{{ selectedObjectTechnicalReason }}</p>
          </OnlineTechnicalDetails>

          <div v-if="selectedObject.available_action_ids.length > 0" class="visual-scene-board__actions">
            <button
              v-for="actionId in selectedObject.available_action_ids"
              :key="`${selectedObject.id}-${actionId}`"
              type="button"
              class="visual-scene-board__action"
              :data-testid="`visual-scene-action-${actionId}`"
              :disabled="actionRunning"
              :title="actionId"
              @click="$emit('trigger-action', { objectId: selectedObject.id, actionId })"
            >
              <Play :size="13" aria-hidden="true" />
              <span>{{ actionLabel(actionId) }}</span>
            </button>
          </div>
        </div>

        <div v-else class="visual-scene-board__empty">
          <MapPin :size="16" aria-hidden="true" />
          <span>选择一个物件</span>
        </div>
      </template>

      <template v-else>
        <button
          v-if="selectedObject"
          type="button"
          class="visual-scene-board__mobile-detail-trigger"
          data-testid="visual-scene-detail-sheet-trigger"
          @click="openDetailSheet"
        >
          <span>已选择 {{ selectedObject.label || selectedObject.id }}</span>
          <small>{{ selectedObject.available_action_ids.length > 0 ? '查看详情和行动' : '查看详情' }}</small>
        </button>

        <div v-else class="visual-scene-board__empty">
          <MapPin :size="16" aria-hidden="true" />
          <span>选择一个物件</span>
        </div>
      </template>

      <div
        v-if="visibleObjects.length > 0"
        class="visual-scene-board__list"
        aria-label="场景物件列表"
        data-testid="visual-scene-object-list"
      >
        <button
          v-for="object in visibleObjects"
          :key="`list-${object.id}`"
          type="button"
          class="visual-scene-board__list-item"
          :class="{ 'visual-scene-board__list-item--selected': object.id === activeObjectId }"
          :data-testid="`visual-scene-list-object-${object.id}`"
          @click="selectObject(object.id)"
        >
          <span>{{ object.label || object.kind || object.id }}</span>
          <span>{{ stateLabel(object.state) }}</span>
        </button>
      </div>

      <p
        v-if="recentFeedback && !isCompactViewport"
        class="visual-scene-board__feedback"
        data-testid="visual-scene-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>

      <p
        v-if="recentFeedback && isCompactViewport"
        class="visual-scene-board__feedback"
        data-testid="visual-scene-mobile-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>
    </div>

    <OnlineBottomSheet
      v-if="selectedObject && isCompactViewport"
      :open="detailSheetOpen"
      :title="selectedObject.label || selectedObject.id"
      :description="`${stateLabel(selectedObject.state)} · ${selectedObject.kind || 'object'}`"
      side="bottom"
      initial-focus=".visual-scene-board__action"
      @close="closeDetailSheet"
    >
      <div class="visual-scene-board__detail visual-scene-board__detail--sheet" data-testid="visual-scene-object-detail">
        <div class="visual-scene-board__detail-head">
          <div class="min-w-0">
            <p class="visual-scene-board__title">{{ selectedObject.label || selectedObject.id }}</p>
            <p class="visual-scene-board__meta">{{ stateLabel(selectedObject.state) }} · {{ selectedObject.kind || 'object' }}</p>
          </div>
          <span v-if="selectedObject.handled_by" class="visual-scene-board__handler">
            {{ selectedObject.handled_by }}
          </span>
        </div>

        <div v-if="selectedObject.progress_target > 0" class="visual-scene-board__progress" aria-label="物件进度">
          <div
            class="visual-scene-board__progress-bar"
            :style="{ width: `${objectProgressPercent(selectedObject)}%` }"
          />
        </div>

        <div v-if="selectedObject.requires_cooperation" class="visual-scene-board__cooperation">
          协作 {{ selectedObject.cooperation_current_count }} / {{ selectedObject.cooperation_required_count }}
        </div>

        <div
          v-if="selectedObjectFailureReason || selectedObjectImpactText"
          class="visual-scene-board__readable-feedback"
          data-testid="visual-scene-readable-feedback"
        >
          <p v-if="selectedObjectFailureReason" class="visual-scene-board__readable-line visual-scene-board__readable-line--warning">
            失败原因：{{ selectedObjectFailureReason }}
          </p>
          <p v-if="selectedObjectImpactText" class="visual-scene-board__readable-line">
            影响范围：{{ selectedObjectImpactText }}
          </p>
        </div>

        <OnlineTechnicalDetails
          v-if="selectedObjectTechnicalReason"
          class="visual-scene-board__technical-details"
          title="规则细节"
          summary="展开查看物件状态与协作判断。"
        >
          <p data-testid="visual-scene-technical-reason">{{ selectedObjectTechnicalReason }}</p>
        </OnlineTechnicalDetails>

        <div v-if="selectedObject.available_action_ids.length > 0" class="visual-scene-board__actions">
          <button
            v-for="actionId in selectedObject.available_action_ids"
            :key="`${selectedObject.id}-${actionId}`"
            type="button"
            class="visual-scene-board__action"
            :data-testid="`visual-scene-action-${actionId}`"
            :disabled="actionRunning"
            :title="actionId"
            @click="$emit('trigger-action', { objectId: selectedObject.id, actionId })"
          >
            <Play :size="13" aria-hidden="true" />
            <span>{{ actionLabel(actionId) }}</span>
          </button>
        </div>
      </div>

      <p
        v-if="recentFeedback"
        class="visual-scene-board__feedback"
        data-testid="visual-scene-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>
    </OnlineBottomSheet>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { AlertTriangle, Circle, Flame, Lamp, MapPin, Play, Store, Trees, Utensils, Warehouse } from 'lucide-vue-next'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import type { Component } from 'vue'
  import type { OnlineVisualObject } from '@/types/onlineVisual'

  const props = withDefaults(defineProps<{
    objects: OnlineVisualObject[]
    selectedObjectId?: string
    recentFeedback?: string
    actionRunning?: boolean
    actionLabels?: Record<string, string>
  }>(), {
    selectedObjectId: '',
    recentFeedback: '',
    actionRunning: false,
    actionLabels: () => ({}),
  })

  const emit = defineEmits<{
    (event: 'select-object', objectId: string): void
    (event: 'trigger-action', payload: { objectId: string, actionId: string }): void
  }>()

  const visibleObjects = computed(() => props.objects)
  const objectById = computed(() => new Map(visibleObjects.value.map(object => [object.id, object])))
  const detailSheetOpen = ref(false)
  const isCompactViewport = ref(false)
  let viewportQuery: MediaQueryList | null = null
  const activeObjectId = computed(() => {
    if (props.selectedObjectId && objectById.value.has(props.selectedObjectId)) return props.selectedObjectId
    return visibleObjects.value[0]?.id || ''
  })
  const selectedObject = computed(() => objectById.value.get(activeObjectId.value) || null)
  const selectedObjectFailureReason = computed(() => {
    const object = selectedObject.value
    if (!object) return ''
    if (object.available_action_ids.length > 0) return ''
    if (object.state === 'complete') return '物件已经完成，当前不能重复行动。'
    if (object.state === 'blocked') return '物件当前受阻，需要先处理前置物件或等待权限恢复。'
    if (object.requires_cooperation && object.cooperation_current_count < object.cooperation_required_count) {
      return '协作人数未达到要求，需要更多成员处理同一物件。'
    }
    return '当前物件没有可用行动，需刷新房间或选择其它物件。'
  })
  const selectedObjectTechnicalReason = computed(() => {
    const object = selectedObject.value
    if (!object || object.available_action_ids.length > 0) return ''
    return [
      `state=${object.state}`,
      `available_action_ids=${object.available_action_ids.length}`,
      `requires_cooperation=${object.requires_cooperation ? 'true' : 'false'}`,
      `cooperation=${object.cooperation_current_count}/${object.cooperation_required_count}`,
      `progress=${object.progress_value}/${object.progress_target}`,
    ].join('; ')
  })
  const selectedObjectImpactText = computed(() => {
    const object = selectedObject.value
    if (!object) return ''
    const parts = [
      object.progress_target > 0 ? `进度 ${object.progress_value}/${object.progress_target}` : '',
      object.requires_cooperation ? `协作 ${object.cooperation_current_count}/${object.cooperation_required_count}` : '',
      object.state === 'overheated' ? '过热会提高现场压力，建议先稳住节奏。' : '',
      object.handled_by ? `最近处理人：${object.handled_by}` : '',
    ].filter(Boolean)
    return parts.join('；')
  })

  const selectObject = (objectId: string) => {
    emit('select-object', objectId)
    if (isCompactViewport.value) detailSheetOpen.value = true
  }

  const openDetailSheet = () => {
    detailSheetOpen.value = true
  }

  const closeDetailSheet = () => {
    detailSheetOpen.value = false
  }

  const updateViewportMode = () => {
    isCompactViewport.value = Boolean(viewportQuery?.matches)
    if (!isCompactViewport.value) closeDetailSheet()
  }

  const stateLabel = (state: OnlineVisualObject['state']) => ({
    idle: '待处理',
    needs_action: '需处理',
    busy: '处理中',
    complete: '已完成',
    overheated: '过热',
    blocked: '受阻',
  }[state] || state)

  const objectProgressPercent = (object: OnlineVisualObject) => {
    if (object.progress_target <= 0) return 0
    return Math.min(100, Math.round((object.progress_value / object.progress_target) * 100))
  }

  const objectIcon = (object: OnlineVisualObject): Component => {
    if (object.state === 'overheated') return Flame
    if (object.state === 'blocked') return AlertTriangle
    if (object.kind.includes('lantern')) return Lamp
    if (object.kind.includes('stall')) return Store
    if (object.kind.includes('field') || object.kind.includes('tree') || object.kind.includes('garden')) return Trees
    if (object.kind.includes('stove') || object.kind.includes('kitchen')) return Utensils
    if (object.kind.includes('warehouse')) return Warehouse
    return Circle
  }

  const objectTooltip = (object: OnlineVisualObject) => {
    const label = object.label || object.id
    const status = stateLabel(object.state)
    if (object.progress_target > 0) return `${label} · ${status} · ${object.progress_value}/${object.progress_target}`
    return `${label} · ${status}`
  }

  const actionLabel = (actionId: string) => props.actionLabels[actionId] || actionId.split('_').join(' ')

  onMounted(() => {
    if (typeof window === 'undefined') return
    viewportQuery = window.matchMedia('(max-width: 760px)')
    updateViewportMode()
    viewportQuery.addEventListener('change', updateViewportMode)
  })

  onBeforeUnmount(() => {
    viewportQuery?.removeEventListener('change', updateViewportMode)
  })
</script>

<style scoped>
  .visual-scene-board {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(14rem, 0.85fr);
    gap: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(var(--color-bg) / 0.16);
    padding: 0.75rem;
  }

  .visual-scene-board__stage {
    position: relative;
    min-height: 20rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 42%),
      linear-gradient(90deg, rgb(0 0 0 / 0.12), transparent 28%, rgb(0 0 0 / 0.12)),
      rgb(0 0 0 / 0.12);
  }

  .visual-scene-board__stage::before {
    position: absolute;
    inset: 12% 8% 18%;
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    content: '';
  }

  .visual-scene-board__object {
    position: absolute;
    z-index: 1;
    display: inline-flex;
    max-width: 8rem;
    min-width: 2.5rem;
    min-height: var(--online-visual-touch-target, 44px);
    translate: -50% -50%;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 34%, transparent);
    background: rgb(var(--color-bg) / 0.92);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.45rem;
    font-size: 0.68rem;
    line-height: 1;
    text-align: center;
    box-shadow: 0 0.4rem 1.2rem rgb(0 0 0 / 0.2);
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
  }

  .visual-scene-board__object:hover,
  .visual-scene-board__object:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent) 80%, transparent);
    transform: translateY(-1px);
    outline: none;
  }

  .visual-scene-board__object--selected {
    z-index: 4;
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  }

  .visual-scene-board__object--needs_action {
    z-index: 3;
    border-color: color-mix(in srgb, #d4976a 72%, transparent);
    color: #d4976a;
  }

  .visual-scene-board__object--busy {
    border-color: color-mix(in srgb, var(--color-accent) 72%, transparent);
  }

  .visual-scene-board__object--complete {
    border-color: color-mix(in srgb, var(--color-success) 72%, transparent);
    color: var(--color-success);
  }

  .visual-scene-board__object--overheated,
  .visual-scene-board__object--blocked {
    z-index: 3;
    border-color: color-mix(in srgb, #d4976a 82%, transparent);
    background: color-mix(in srgb, #d4976a 14%, rgb(var(--color-bg)));
    color: #d4976a;
  }

  .visual-scene-board__object-label,
  .visual-scene-board__title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visual-scene-board__object-progress {
    flex-shrink: 0;
    color: var(--color-muted);
    font-size: 0.62rem;
  }

  .visual-scene-board__side {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.5rem;
  }

  .visual-scene-board__detail,
  .visual-scene-board__empty,
  .visual-scene-board__feedback,
  .visual-scene-board__mobile-detail-trigger,
  .visual-scene-board__list {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.625rem;
  }

  .visual-scene-board__mobile-detail-trigger {
    display: flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: rgb(var(--color-text));
    text-align: left;
  }

  .visual-scene-board__mobile-detail-trigger small {
    flex-shrink: 0;
    color: var(--color-accent);
    font-size: 0.68rem;
    line-height: 1.2;
  }

  .visual-scene-board__detail-head,
  .visual-scene-board__list-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .visual-scene-board__title {
    color: var(--color-accent);
    font-size: 0.82rem;
    line-height: 1.25;
  }

  .visual-scene-board__meta,
  .visual-scene-board__handler,
  .visual-scene-board__cooperation,
  .visual-scene-board__feedback,
  .visual-scene-board__list-item {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-scene-board__handler {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  .visual-scene-board__progress {
    height: 0.42rem;
    margin-top: 0.625rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(0 0 0 / 0.16);
  }

  .visual-scene-board__progress-bar {
    height: 100%;
    background: color-mix(in srgb, var(--color-success) 64%, var(--color-accent));
  }

  .visual-scene-board__cooperation,
  .visual-scene-board__readable-feedback,
  .visual-scene-board__actions {
    margin-top: 0.625rem;
  }

  .visual-scene-board__readable-feedback {
    display: grid;
    gap: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.45rem;
  }

  .visual-scene-board__readable-line {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-scene-board__readable-line--warning {
    color: #d4976a;
  }

  .visual-scene-board__technical-details {
    margin-top: 0.625rem;
  }

  .visual-scene-board__actions {
    display: grid;
    gap: 0.5rem;
  }

  .visual-scene-board__action {
    display: inline-flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.1;
  }

  .visual-scene-board__action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .visual-scene-board__empty {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .visual-scene-board__list {
    display: none;
    gap: 0.35rem;
  }

  .visual-scene-board__list-item {
    width: 100%;
    align-items: center;
    min-height: var(--online-visual-touch-target, 44px);
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    background: transparent;
    padding: 0.35rem 0.45rem;
    text-align: left;
  }

  .visual-scene-board__list-item--selected {
    border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
    color: rgb(var(--color-text));
  }

  @media (max-width: 760px) {
    .visual-scene-board {
      grid-template-columns: 1fr;
    }

    .visual-scene-board__stage {
      min-height: 16rem;
      overflow-x: auto;
    }

    .visual-scene-board__list {
      display: grid;
    }
  }
</style>
