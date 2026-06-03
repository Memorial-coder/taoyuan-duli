<template>
  <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="online-cohabitation-governance-panel">
    <div class="game-panel-muted p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-accent">
          <ShieldCheck :size="13" />
          <p class="text-sm">成员权限</p>
        </div>
        <span class="text-[10px] text-muted">{{ editableByActor ? '可管理' : '只读' }}</span>
      </div>
      <div v-if="permissionMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有权限面板数据。</div>
      <div v-else class="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
        <div v-for="member in permissionMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
              <p class="mt-1 text-[10px] text-muted">{{ member.role }} · {{ member.manor_role || '无家族职位' }}</p>
            </div>
            <div class="flex shrink-0 flex-col items-start gap-2 md:items-end">
              <span class="w-fit text-[10px] text-accent">{{ enabledPermissionCount(member.permissions) }} 项已开</span>
              <span v-if="member.default_restore_changed_count" class="w-fit text-[10px] text-amber-100">
                偏离默认 {{ member.default_restore_changed_count }} 项
              </span>
              <button
                v-if="canManagePermissionPanel"
                type="button"
                class="online-action-btn online-action-btn--compact inline-flex items-center justify-center gap-1"
                :disabled="actionLoading || member.default_restore_available !== true"
                :data-testid="`online-cohabitation-permission-default-restore-${member.username}`"
                title="按当前契约或家族职位恢复默认权限"
                @click="emit('restore-default', member)"
              >
                <RotateCcw :size="12" />
                <span>恢复默认</span>
              </button>
            </div>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div v-for="group in permissionGroups(member.permissions)" :key="`${member.username}-${group.id}`" class="border border-accent/10 bg-bg/30 p-2">
              <p class="text-[10px] text-muted">{{ permissionGroupLabel(group.id) }}</p>
              <p class="mt-1 text-[10px] leading-4 text-accent">{{ group.enabled }}/{{ group.total }}</p>
            </div>
          </div>
          <div
            v-if="canManagePermissionPanel"
            class="mt-3 grid gap-2"
            data-testid="online-cohabitation-permission-grouped-toggles"
          >
            <div
              v-for="group in permissionToggleGroups(member.permissions)"
              :key="`${member.username}-toggle-group-${group.id}`"
              class="border border-accent/10 bg-bg/30 p-2"
              :data-testid="`online-cohabitation-permission-toggle-group-${group.id}`"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-accent">{{ permissionGroupLabel(group.id) }}</p>
                <span class="text-[10px] text-muted">{{ group.enabled }}/{{ group.total }}</span>
              </div>
              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  v-for="option in group.options"
                  :key="`${member.username}-${option.group}-${option.key}`"
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-between"
                  :disabled="actionLoading"
                  :data-testid="`online-cohabitation-permission-${member.username}-${option.group}-${option.key}`"
                  @click="emit('toggle-permission', member, option)"
                >
                  <span>{{ option.label }}</span>
                  <span>{{ member.permissions?.[option.group]?.[option.key] ? '开启' : '关闭' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-if="permissionActionMessage" class="mt-2 text-[10px] leading-4" :class="permissionActionOk ? 'text-emerald-200' : 'text-red-100'">
        {{ permissionActionMessage }}
      </p>
    </div>
    <div class="space-y-3">
      <div class="game-panel-muted p-3">
        <p class="text-sm text-accent">强制安全阀</p>
        <div class="mt-3 space-y-2">
          <div
            v-for="entry in safetyRailEntries"
            :key="entry.key"
            class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
          >
            <span class="text-muted">{{ safetyRailLabel(entry.key) }}</span>
            <span :class="entry.enabled ? 'text-emerald-200' : 'text-muted'">{{ entry.enabled ? '开启' : '关闭' }}</span>
          </div>
        </div>
      </div>
      <div class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">家族职位</p>
          <span class="text-[10px] text-muted">{{ roleManagementEnabled ? (canManageRolePanel ? '可管理' : '只读') : '未启用' }}</span>
        </div>
        <div v-if="roleMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">当前契约没有家族职位面板。</div>
        <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          <div v-for="member in roleMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
              </div>
              <span class="shrink-0 text-[10px] text-accent">{{ member.can_manage_roles ? '家主' : '成员' }}</span>
            </div>
            <p v-if="member.permission_focus?.length" class="mt-2 text-[10px] leading-4 text-muted">
              {{ member.permission_focus.map(familyRoleFocusLabel).join('、') }}
            </p>
            <div v-if="canManageRolePanel" class="mt-2 grid grid-cols-2 gap-2">
              <button
                v-for="option in roleOptions"
                :key="`${member.username}-${option.id}`"
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="actionLoading || member.manor_role === option.id"
                :data-testid="`online-cohabitation-role-${member.username}-${option.id}`"
                @click="emit('change-role', member, option)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="roleActionMessage" class="mt-2 text-[10px] leading-4" :class="roleActionOk ? 'text-emerald-200' : 'text-red-100'">
          {{ roleActionMessage }}
        </p>
      </div>
      <div class="game-panel-muted p-3">
        <p class="text-sm text-accent">权限审计</p>
        <div v-if="permissionAudits.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无权限变更审计。</div>
        <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          <div v-for="entry in permissionAudits" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-text">{{ entry.actor_display_name || entry.actor_username }}</p>
            <p class="mt-1 text-[10px] text-muted">{{ entry.action }} · {{ formatTime(entry.at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { RotateCcw, ShieldCheck } from 'lucide-vue-next'
  import type {
    CohabitationAuditEntry,
    CohabitationFamilyRoleOption,
    CohabitationMember,
  } from '@/utils/cohabitationApi'

  type PermissionMap = Record<string, Record<string, boolean>>
  type PermissionMember = CohabitationMember & {
    permissions: PermissionMap
    default_restore_available?: boolean
    default_restore_changed_count?: number
  }
  type RoleMember = CohabitationMember & {
    manor_role_label?: string
    can_manage_roles?: boolean
    permission_focus?: string[]
  }
  type PermissionGroupSummary = {
    id: string
    enabled: number
    total: number
  }
  type PermissionToggleOption = {
    group: string
    key: string
    label: string
  }
  type PermissionToggleGroup = PermissionGroupSummary & {
    options: PermissionToggleOption[]
  }
  type SafetyRailEntry = {
    key: string
    enabled: boolean
  }

  withDefaults(defineProps<{
    editableByActor?: boolean
    permissionMembers: PermissionMember[]
    actionLoading?: boolean
    canManagePermissionPanel?: boolean
    permissionActionMessage?: string
    permissionActionOk?: boolean
    enabledPermissionCount: (permissions: PermissionMap) => number
    permissionGroups: (permissions: PermissionMap) => PermissionGroupSummary[]
    permissionToggleGroups: (permissions: PermissionMap) => PermissionToggleGroup[]
    permissionGroupLabel: (value: string) => string
    safetyRailEntries: SafetyRailEntry[]
    safetyRailLabel: (value: string) => string
    roleManagementEnabled?: boolean
    canManageRolePanel?: boolean
    roleMembers: RoleMember[]
    roleOptions: CohabitationFamilyRoleOption[]
    familyRoleLabel: (value?: string) => string
    familyRoleFocusLabel: (value: string) => string
    roleActionMessage?: string
    roleActionOk?: boolean
    permissionAudits: CohabitationAuditEntry[]
    formatTime: (value: number) => string
  }>(), {
    editableByActor: false,
    actionLoading: false,
    canManagePermissionPanel: false,
    permissionActionMessage: '',
    permissionActionOk: false,
    roleManagementEnabled: false,
    canManageRolePanel: false,
    roleActionMessage: '',
    roleActionOk: false,
  })

  const emit = defineEmits<{
    'restore-default': [member: PermissionMember]
    'toggle-permission': [member: PermissionMember, option: PermissionToggleOption]
    'change-role': [member: RoleMember, option: CohabitationFamilyRoleOption]
  }>()
</script>
