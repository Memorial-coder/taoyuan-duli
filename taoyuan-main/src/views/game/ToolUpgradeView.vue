<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Wrench :size="14" />
        <span>工具升级</span>
      </div>
      <span class="text-xs text-muted">木匠学徒·小满</span>
    </div>
    <p class="text-xs text-muted mb-3">消耗金属锭和铜钱升级工具，锻造完成后会自动归还；水壶可加急立即完成。</p>

    <!-- 正在升级提示 -->
    <div v-if="inventoryStore.pendingUpgrade" class="border border-accent/30 rounded-xs px-3 py-2 mb-3 flex items-center justify-between">
      <div class="flex items-center space-x-1.5">
        <Clock :size="12" class="text-accent shrink-0" />
        <span class="text-xs text-accent">
          锻造中「{{ TOOL_NAMES[inventoryStore.pendingUpgrade.toolType] }}」→ {{ TIER_NAMES[inventoryStore.pendingUpgrade.targetTier] }}
        </span>
      </div>
      <span class="text-xs text-muted whitespace-nowrap ml-2">剩{{ inventoryStore.pendingUpgrade.daysRemaining }}天</span>
    </div>

    <div class="desktop-adaptive-grid--cards" data-testid="tool-upgrade-list">
      <div
        v-for="tool in inventoryStore.tools"
        :key="tool.type"
        class="flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        data-testid="tool-upgrade-card"
        :class="isUpgrading(tool.type) ? 'border-accent/30' : 'border-accent/20'"
        @click="selectedTool = tool.type"
      >
        <div class="min-w-0">
          <span class="text-sm" :class="isUpgrading(tool.type) ? 'text-accent' : ''">{{ TOOL_NAMES[tool.type] }}</span>
          <p class="text-xs text-muted">{{ TIER_NAMES[tool.tier] }}</p>
        </div>
        <span v-if="isUpgrading(tool.type)" class="text-xs text-accent whitespace-nowrap ml-2">锻造中</span>
        <span v-else-if="getUpgradeCost(tool.type, tool.tier)" class="text-xs text-muted whitespace-nowrap ml-2">
          → {{ TIER_NAMES[getUpgradeCost(tool.type, tool.tier)!.toTier] }}
        </span>
        <CircleCheck v-else :size="14" class="text-success shrink-0 ml-2" />
      </div>
    </div>

    <section class="mt-4 border border-accent/15 rounded-xs p-3" data-testid="smithy-repair-section">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-1.5 text-sm text-accent">
          <Shield :size="14" />
          <span>装备修理</span>
        </div>
        <div class="flex flex-wrap gap-1 text-[0.625rem] text-muted">
          <span class="border border-accent/10 rounded-xs px-1.5 py-0.5">磨损 {{ repairDamagedCount }}</span>
          <span class="border border-accent/10 rounded-xs px-1.5 py-0.5">失固 {{ repairBrokenSturdinessCount }}</span>
          <span v-if="processingStore.isFreeToolRepairAvailable()" class="border border-success/30 text-success rounded-xs px-1.5 py-0.5">阿铁本周免料</span>
        </div>
      </div>

      <div v-if="processingStore.smithyRepairJobs.length > 0" class="mb-3 space-y-1.5">
        <div
          v-for="job in processingStore.smithyRepairJobs"
          :key="job.id"
          class="flex flex-wrap items-center justify-between gap-2 border border-accent/10 rounded-xs px-2 py-1.5 bg-bg/50"
          :data-testid="`smithy-repair-job-${job.id}`"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <Clock :size="12" :class="job.ready ? 'text-success' : 'text-accent'" />
              <span class="text-xs truncate">{{ formatSmithyJobMode(job.mode) }} · {{ getSmithyJobName(job) }}</span>
            </div>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-1.5 flex-1 rounded-xs border border-accent/10 bg-bg">
                <div class="h-full rounded-xs bg-accent transition-all" :style="{ width: `${getSmithyJobProgress(job)}%` }" />
              </div>
              <span class="text-[0.625rem] text-muted whitespace-nowrap">{{ job.ready ? '可领取' : `${job.daysProcessed}/${job.totalDays}天` }}</span>
            </div>
          </div>
          <button
            class="btn text-xs justify-center"
            :class="{ '!bg-accent !text-bg': job.ready }"
            :disabled="!job.ready"
            :data-testid="`smithy-repair-job-collect-${job.id}`"
            @click="handleCollectSmithyRepair(job.id)"
          >
            <PackageCheck :size="12" />
            领取
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3">
        <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          <button
            v-for="target in repairTargets"
            :key="target.key"
            class="w-full border rounded-xs px-2 py-2 text-left hover:bg-accent/5"
            :class="selectedRepairTargetKey === target.key ? 'border-accent/40 bg-accent/10' : 'border-accent/10'"
            :data-testid="`smithy-repair-target-${target.key}`"
            @click="selectedRepairTargetKey = target.key"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs truncate" :class="target.isBroken ? 'text-danger' : ''">{{ target.name }}</p>
                <p class="text-[0.625rem] text-muted">
                  {{ target.typeLabel }}
                  <template v-if="target.equipped"> · 已装备</template>
                  <template v-if="target.busy"> · 修理中</template>
                </p>
              </div>
              <span class="text-[0.625rem] whitespace-nowrap" :class="target.statusClass">{{ target.statusLabel }}</span>
            </div>
            <div class="mt-1.5 space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="w-7 text-[0.625rem] text-muted">耐久</span>
                <div class="h-1.5 flex-1 rounded-xs border border-accent/10 bg-bg">
                  <div class="h-full rounded-xs bg-success transition-all" :style="{ width: `${getPercent(target.current, target.max)}%` }" />
                </div>
                <span class="w-16 text-right text-[0.625rem] text-muted">{{ target.current }}/{{ target.max }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-7 text-[0.625rem] text-muted">坚固</span>
                <div class="h-1.5 flex-1 rounded-xs border border-accent/10 bg-bg">
                  <div class="h-full rounded-xs bg-accent transition-all" :style="{ width: `${getPercent(target.sturdinessCurrent, target.sturdinessMax)}%` }" />
                </div>
                <span class="w-16 text-right text-[0.625rem] text-muted">{{ target.sturdinessCurrent }}/{{ target.sturdinessMax }}</span>
              </div>
            </div>
          </button>
          <p v-if="repairTargets.length <= 0" class="text-xs text-muted border border-accent/10 rounded-xs px-2 py-3 text-center">
            暂无可修理或可翻新的装备。
          </p>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 bg-bg/50 min-h-72">
          <template v-if="selectedRepairTarget">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="min-w-0">
                <p class="text-sm truncate">{{ selectedRepairTarget.name }}</p>
                <p class="text-[0.625rem] text-muted">{{ selectedRepairTarget.typeLabel }} · 缺耐久 {{ selectedRepairTarget.missingDurability }} · 损耗 {{ selectedRepairTarget.damagePercent }}%</p>
              </div>
              <span class="text-[0.625rem] whitespace-nowrap" :class="selectedRepairTarget.statusClass">{{ selectedRepairTarget.statusLabel }}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-2">
              <div class="border border-accent/10 rounded-xs px-2 py-1.5">
                <p class="text-[0.625rem] text-muted mb-1">耐久</p>
                <p class="text-xs">{{ selectedRepairTarget.current }}/{{ selectedRepairTarget.max }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs px-2 py-1.5">
                <p class="text-[0.625rem] text-muted mb-1">坚固</p>
                <p class="text-xs">{{ selectedRepairTarget.sturdinessCurrent }}/{{ selectedRepairTarget.sturdinessMax }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-1 mb-2">
              <button
                v-for="mode in repairModeOptions"
                :key="mode.id"
                class="btn text-xs flex-col items-start"
                :class="{ '!bg-accent !text-bg': selectedRepairMode === mode.id }"
                :data-testid="`smithy-repair-mode-${mode.id}`"
                @click="selectedRepairMode = mode.id"
              >
                <span>{{ mode.label }}</span>
                <span class="text-[0.625rem] opacity-70">{{ mode.hint }}</span>
              </button>
            </div>

            <div v-if="selectedRepairPreview" class="border border-accent/10 rounded-xs p-2 mb-2">
              <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[0.625rem] text-muted">耗时</span>
                  <span class="text-xs">{{ selectedRepairPreview.processingDays }}天</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[0.625rem] text-muted">坚固</span>
                  <span class="text-xs">
                    <template v-if="selectedRepairPreview.sturdinessLoss > 0">-{{ selectedRepairPreview.sturdinessLoss }}</template>
                    <template v-else-if="selectedRepairPreview.restoredSturdiness > 0">+{{ selectedRepairPreview.restoredSturdiness }}</template>
                    <template v-else>无变化</template>
                  </span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[0.625rem] text-muted">铜钱</span>
                  <span class="text-xs" :class="playerStore.money >= selectedRepairPreview.money ? '' : 'text-danger'">{{ selectedRepairPreview.money }}文</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[0.625rem] text-muted">材料</span>
                  <span class="text-xs" :class="selectedRepairPreview.materialCount >= selectedRepairPreview.materialQuantity ? '' : 'text-danger'">
                    <template v-if="selectedRepairPreview.mode === 'dismantle'">返材</template>
                    <template v-else-if="selectedRepairPreview.freeByNpc">阿铁免料</template>
                    <template v-else>{{ selectedRepairPreview.materialName }}×{{ selectedRepairPreview.materialQuantity }}</template>
                  </span>
                </div>
              </div>
              <p v-if="!selectedRepairPreview.canRepair" class="text-[0.625rem] text-danger mt-1.5">
                {{ selectedRepairPreview.disabledReason }}
              </p>
            </div>

            <p v-if="repairActionBlockReason" class="text-[0.625rem] text-danger mb-2">{{ repairActionBlockReason }}</p>
            <button
              class="btn text-xs w-full justify-center"
              :class="{ '!bg-accent !text-bg': canStartSelectedRepair }"
              :disabled="!canStartSelectedRepair"
              data-testid="smithy-repair-start"
              @click="handleStartSmithyRepair"
            >
              <Wrench :size="12" />
              {{ selectedRepairMode === 'dismantle' ? '拆解返材' : `开始${selectedRepairModeLabel}` }}
            </button>
          </template>
          <p v-else class="text-xs text-muted text-center py-10">选择一件装备查看修理方案。</p>
        </div>
      </div>
    </section>

    <section class="mt-4 border border-accent/15 rounded-xs p-3" data-testid="smithy-forge-section">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-1.5 text-sm text-accent">
          <Sparkles :size="14" />
          <span>装备铸魔</span>
        </div>
        <span class="text-[0.625rem] text-muted">铁匠铺服务 · 不占工坊机器格</span>
      </div>

      <p v-if="forgeServiceLockedReason" class="border border-danger/20 rounded-xs px-2 py-1.5 text-xs text-danger mb-2">
        {{ forgeServiceLockedReason }}
      </p>

      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
        <div class="space-y-2">
          <div>
            <p class="text-[0.625rem] text-muted mb-1">类型</p>
            <div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-2 gap-1">
              <button
                v-for="option in forgeTargetTypeOptions"
                :key="option.id"
                class="btn text-xs justify-between"
                :class="{ '!bg-accent !text-bg': selectedForgeTarget === option.id }"
                :data-testid="`smithy-forge-target-${option.id}`"
                @click="selectedForgeTarget = option.id"
              >
                <span>{{ option.label }}</span>
                <span class="text-[0.625rem] opacity-70">{{ option.count }}</span>
              </button>
            </div>
          </div>

          <div>
            <p class="text-[0.625rem] text-muted mb-1">目标</p>
            <div v-if="forgeItemOptions.length > 0" class="space-y-1 max-h-60 overflow-y-auto pr-1">
              <div v-for="option in forgeItemOptions" :key="option.key" class="flex items-stretch gap-1">
                <button
                  class="min-w-0 flex-1 border rounded-xs px-2 py-1.5 text-left hover:bg-accent/5"
                  :class="selectedForgeItemIndex === option.index ? 'border-accent/40 bg-accent/10' : 'border-accent/10'"
                  :data-testid="`smithy-forge-item-${option.key}`"
                  @click="selectedForgeItemIndex = option.index"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs truncate">{{ option.name }}</span>
                    <span v-if="option.equipped" class="text-[0.625rem] text-accent shrink-0">已装备</span>
                  </div>
                  <p class="text-[0.625rem] text-muted truncate">{{ option.affixSummary || '无词条' }}</p>
                  <p v-if="option.disabled" class="text-[0.625rem] text-danger">{{ option.disabledReason }}</p>
                </button>
                <button
                  v-if="option.locked && option.lockTarget"
                  class="btn px-2 text-[0.625rem]"
                  :data-testid="`smithy-forge-unlock-${option.key}`"
                  @click.stop="handleUnlockForgeTarget(option)"
                >
                  <Unlock :size="11" />
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-muted border border-accent/10 rounded-xs px-2 py-3 text-center">没有可铸魔目标。</p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 bg-bg/50">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-1 mb-2">
            <button
              v-for="mode in forgeModeOptions"
              :key="mode.id"
              class="btn text-xs flex-col items-start"
              :class="{ '!bg-accent !text-bg': selectedForgeMode === mode.id, 'opacity-50': !mode.unlocked }"
              :data-testid="`smithy-forge-mode-${mode.id}`"
              @click="selectedForgeMode = mode.id"
            >
              <span>{{ mode.label }}</span>
              <span class="text-[0.625rem] opacity-70">Lv.{{ mode.minLevel }} · {{ mode.cost }}文</span>
            </button>
          </div>

          <div v-if="selectedForgeMode === 'directed'" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-[0.625rem] text-muted mb-1">方向</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-1">
              <button
                v-for="direction in forgeDirectionOptions"
                :key="direction.id"
                class="btn text-xs flex-col items-start"
                :class="{ '!bg-accent !text-bg': selectedForgeDirectionId === direction.id }"
                :data-testid="`smithy-forge-direction-${direction.id}`"
                @click="selectedForgeDirectionId = direction.id"
              >
                <span>{{ direction.label }}</span>
                <span class="text-[0.625rem] opacity-70">{{ direction.description }}</span>
              </button>
            </div>
            <p v-if="forgeDirectedTopUpHint" class="text-[0.625rem] text-muted mt-1">{{ forgeDirectedTopUpHint }}</p>
          </div>

          <p v-if="forgeDeepRefineHint" class="mb-2 rounded-xs border border-accent/10 px-2 py-1 text-[0.625rem] text-accent">
            {{ forgeDeepRefineHint }}
          </p>

          <div v-if="selectedForgeMode === 'protected'" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-[0.625rem] text-muted mb-1">保留词条</p>
            <div v-if="forgePreserveOptions.length > 0" class="space-y-1">
              <button
                v-for="option in forgePreserveOptions"
                :key="option.id"
                class="btn text-xs justify-start"
                :class="{ '!bg-accent !text-bg': selectedForgePreserveId === option.id }"
                :data-testid="`smithy-forge-preserve-${option.id}`"
                @click="selectedForgePreserveId = option.id"
              >
                {{ option.label }}
              </button>
            </div>
            <p v-else class="text-xs text-muted">当前目标没有可保留的词条。</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-[0.625rem] text-muted">范围与消耗</p>
              <span class="text-[0.625rem] text-accent">{{ forgeCountHint }}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-28 overflow-y-auto mb-2">
              <div v-for="line in forgeRangeLines" :key="line.id" class="rounded-xs border border-accent/10 px-2 py-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs truncate">{{ line.name }}</span>
                  <span class="text-[0.625rem] text-muted shrink-0">{{ line.range }}</span>
                </div>
                <p class="text-[0.625rem] text-muted truncate">{{ line.description }}</p>
              </div>
            </div>
            <div class="space-y-0.5">
              <div v-for="mat in forgeMaterialLines" :key="mat.itemId" class="flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <ItemIcon :item="mat.item" size="xs" :show-badge="false" />
                  <span class="truncate">{{ mat.itemName }}</span>
                </span>
                <span class="text-xs" :class="mat.count >= mat.quantity ? '' : 'text-danger'">{{ mat.count }}/{{ mat.quantity }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">铜钱</span>
                <span class="text-xs" :class="playerStore.money >= selectedForgeModeDef.cost ? '' : 'text-danger'">{{ selectedForgeModeDef.cost }}文</span>
              </div>
            </div>
          </div>

          <div v-if="forgeResultLines.length > 0" class="border border-success/20 rounded-xs p-2 mb-2">
            <p class="text-xs text-success mb-1">本次结果 · {{ forgeResultLines.length }} 条</p>
            <p v-for="line in forgeResultLines" :key="line" class="text-[0.625rem] text-muted">{{ line }}</p>
          </div>

          <p v-if="forgeBlockReason" class="text-[0.625rem] text-danger mb-2">{{ forgeBlockReason }}</p>
          <button
            class="btn text-xs w-full justify-center"
            :class="{ '!bg-accent !text-bg': canConfirmForge }"
            :disabled="!canConfirmForge"
            data-testid="smithy-forge-confirm"
            @click="handleConfirmForge"
          >
            <Sparkles :size="12" />
            开始铸魔
          </button>
        </div>
      </div>
    </section>

    <!-- 工具详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedTool"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedTool = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedTool = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="isUpgrading(selectedTool) ? 'text-accent' : 'text-text'">
            {{ TOOL_NAMES[selectedTool] }}
          </p>

          <!-- 当前状态 -->
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ toolUpgradeEffectLabel(selectedTool) }}</span>
              <span class="text-xs">{{ selectedTool === 'scythe' ? `${inventoryStore.getToolBatchCount('scythe')}格` : staminaText(selectedToolObj!.tier) }}</span>
            </div>
            <template v-if="selectedTool === 'fishingRod'">
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">钩子范围</span>
                <span class="text-xs">{{ ROD_HOOK[selectedToolObj!.tier] }}</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">钓鱼时限</span>
                <span class="text-xs">{{ ROD_TIME[selectedToolObj!.tier] }}秒</span>
              </div>
            </template>
            <div v-if="isUpgrading(selectedTool)" class="flex items-center justify-between mt-1">
              <span class="text-xs text-muted">锻造目标</span>
              <span class="text-xs text-accent">{{ TIER_NAMES[inventoryStore.pendingUpgrade!.targetTier] }}</span>
            </div>
            <div v-if="isUpgrading(selectedTool)" class="flex items-center space-x-2 mt-1.5">
              <span class="text-xs text-muted shrink-0">进度</span>
              <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
                <div
                  class="h-full rounded-xs bg-accent transition-all"
                  :style="{ width: ((2 - inventoryStore.pendingUpgrade!.daysRemaining) / 2) * 100 + '%' }"
                />
              </div>
              <span class="text-xs text-muted whitespace-nowrap">{{ 2 - inventoryStore.pendingUpgrade!.daysRemaining }}/2天</span>
            </div>
          </div>

          <!-- 升级信息 -->
          <template v-if="!isUpgrading(selectedTool) && selectedUpgradeCost">
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">升级至 {{ TIER_NAMES[selectedUpgradeCost.toTier] }}</p>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">{{ toolUpgradeEffectLabel(selectedTool) }}</span>
                <span class="text-xs">
                  <template v-if="selectedTool === 'scythe'">
                    {{ inventoryStore.getToolBatchCount('scythe') }}格 →
                    <span class="text-success">{{ selectedUpgradeCost.toTier === 'basic' ? 1 : selectedUpgradeCost.toTier === 'iron' ? 3 : selectedUpgradeCost.toTier === 'steel' ? 5 : 9 }}格</span>
                  </template>
                  <template v-else>
                    {{ staminaText(selectedToolObj!.tier) }} →
                    <span class="text-success">{{ staminaText(selectedUpgradeCost.toTier) }}</span>
                  </template>
                </span>
              </div>
              <template v-if="selectedTool === 'fishingRod'">
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">钩子范围</span>
                  <span class="text-xs">
                    {{ ROD_HOOK[selectedToolObj!.tier] }} →
                    <span class="text-success">{{ ROD_HOOK[selectedUpgradeCost.toTier] }}</span>
                  </span>
                </div>
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">钓鱼时限</span>
                  <span class="text-xs">
                    {{ ROD_TIME[selectedToolObj!.tier] }}秒 →
                    <span class="text-success">{{ ROD_TIME[selectedUpgradeCost.toTier] }}秒</span>
                  </span>
                </div>
              </template>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">所需材料</p>
              <div v-for="mat in selectedUpgradeCost.materials" :key="mat.itemId" class="flex items-center justify-between gap-2 mt-0.5">
                <span class="flex min-w-0 items-center gap-1 text-xs text-muted">
                  <ItemIcon :item="getItemById(mat.itemId)" size="xs" :show-badge="false" />
                  <span class="truncate">{{ getItemById(mat.itemId)?.name ?? mat.itemId }}</span>
                </span>
                <span class="text-xs" :class="getCombinedItemCount(mat.itemId) >= mat.quantity ? 'text-success' : 'text-danger'">
                  {{ getCombinedItemCount(mat.itemId) }}/{{ mat.quantity }}
                </span>
              </div>
            </div>

            <p v-if="getUpgradeBlockReason(selectedTool)" class="text-xs text-danger mb-2">
              {{ getUpgradeBlockReason(selectedTool) }}
            </p>

            <button
              class="btn text-xs w-full justify-center"
              :class="{ '!bg-accent !text-bg': canUpgrade(selectedTool) }"
              :disabled="!canUpgrade(selectedTool)"
              @click="handleUpgradeAndClose(selectedTool)"
            >
              <ArrowUp :size="12" />
              升级 {{ selectedUpgradeCost.money }}文
            </button>

            <div v-if="selectedTool === 'wateringCan'" class="border border-accent/10 rounded-xs p-2 mt-2">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-xs text-accent">加急锻造</span>
                <span class="text-xs text-muted whitespace-nowrap">立即完成</span>
              </div>
              <p class="text-[0.6875rem] text-muted leading-5 mb-2">
                多付一倍铜钱，不进入 2 天等待队列。
              </p>
              <p v-if="getRushUpgradeBlockReason(selectedTool)" class="text-xs text-danger mb-2">
                {{ getRushUpgradeBlockReason(selectedTool) }}
              </p>
              <button
                class="btn text-xs w-full justify-center"
                :class="{ '!bg-accent !text-bg': canRushUpgrade(selectedTool) }"
                :disabled="!canRushUpgrade(selectedTool)"
                @click="handleRushUpgradeAndClose(selectedTool)"
              >
                <Zap :size="12" />
                加急 {{ getRushUpgradeMoney(selectedUpgradeCost.money) }}文
              </button>
            </div>
          </template>

          <!-- 满级 -->
          <div v-else-if="!isUpgrading(selectedTool)" class="border border-success/30 rounded-xs p-2">
            <div class="flex items-center justify-center space-x-1">
              <CircleCheck :size="12" class="text-success" />
              <span class="text-xs text-success">已达到最高等级</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ArrowUp, Wrench, Clock, CircleCheck, X, Zap, Shield, PackageCheck, Sparkles, Unlock } from 'lucide-vue-next'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { useGameStore } from '@/stores/useGameStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useProcessingStore } from '@/stores/useProcessingStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { getCombinedItemCount, hasCombinedItems, removeCombinedItems } from '@/composables/useCombinedInventory'
  import { getUpgradeCost, TOOL_NAMES, TIER_NAMES, getItemById } from '@/data'
  import type { ItemDef } from '@/types/item'
  import type { ForgeAffixRoll, FriendshipLevel, OwnedHat, OwnedRing, OwnedShoe, Tool, ToolTier, ToolType } from '@/types'
  import type { SmithyRepairJob } from '@/types/processing'
  import { getWeaponById, getWeaponDisplayName } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import type { RepairBenchEquipType, RepairBenchMode } from '@/utils/durability'
  import {
    FORGE_AFFIX_MODE_DEFS,
    FORGE_AFFIX_TARGET_LABELS,
    formatForgeAffixRange,
    formatForgeAffixRoll,
    formatForgeAffixSummary,
    getForgeAffixById,
    getForgeAffixesForTarget,
    getForgeAffixModeById,
    getForgeDirectionsForTarget,
    rollForgeAffixes,
    type ForgeAffixDirectionId,
    type ForgeAffixMode,
    type ForgeAffixTarget
  } from '@/data/forgeAffixes'
  import { ACTION_TIME_COSTS, isShopOpen } from '@/data/timeConstants'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDayLazy'

  /** 升级目标等级 → 所需小满好感 */
  const TIER_FRIENDSHIP_REQ: Partial<Record<ToolTier, FriendshipLevel>> = {
    iron: 'acquaintance',
    steel: 'friendly',
    iridium: 'bestFriend'
  }

  /** 各等级体力消耗倍率（与 useInventoryStore 一致） */
  const STAMINA_MULTIPLIERS: Record<ToolTier, number> = { basic: 1.0, iron: 0.8, steel: 0.6, iridium: 0.4 }
  const ROD_HOOK: Record<ToolTier, number> = { basic: 40, iron: 45, steel: 50, iridium: 60 }
  const ROD_TIME: Record<ToolTier, number> = { basic: 30, iron: 33, steel: 36, iridium: 40 }
  const RUSH_UPGRADE_MONEY_MULTIPLIER = 2
  const TOOL_UPGRADE_EFFECT_LABELS: Record<ToolType, string> = {
    wateringCan: '浇水体力减免',
    hoe: '开垦/播种体力减免',
    pickaxe: '挖矿体力减免',
    fishingRod: '钓鱼体力减免',
    scythe: '批量收割范围',
    axe: '采集/砍树体力减免',
    pan: '淘金体力减免'
  }

  const toolUpgradeEffectLabel = (type: ToolType): string => TOOL_UPGRADE_EFFECT_LABELS[type]

  const staminaText = (tier: ToolTier): string => {
    const r = Math.round((1 - STAMINA_MULTIPLIERS[tier]) * 100)
    return r > 0 ? `-${r}%` : '无加成'
  }
  const LEVEL_ORDER: FriendshipLevel[] = ['stranger', 'acquaintance', 'friendly', 'bestFriend']
  const LEVEL_NAMES: Record<FriendshipLevel, string> = {
    stranger: '陌生',
    acquaintance: '相识',
    friendly: '熟识',
    bestFriend: '挚友'
  }
  const meetsLevel = (current: FriendshipLevel, required: FriendshipLevel): boolean =>
    LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required)

  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const warehouseStore = useWarehouseStore()
  const npcStore = useNpcStore()
  const gameStore = useGameStore()
  const processingStore = useProcessingStore()

  // === 弹窗状态 ===

  const selectedTool = ref<ToolType | null>(null)

  const selectedToolObj = computed(() => {
    if (!selectedTool.value) return null
    return inventoryStore.getTool(selectedTool.value) ?? null
  })

  const selectedUpgradeCost = computed(() => {
    if (!selectedToolObj.value) return null
    return getUpgradeCost(selectedToolObj.value.type, selectedToolObj.value.tier) ?? null
  })

  // === 铁匠铺修理 ===

  const REPAIR_TYPE_LABELS: Record<RepairBenchEquipType, string> = {
    weapon: '武器',
    ring: '戒指',
    hat: '帽子',
    shoe: '鞋子'
  }

  const REPAIR_MODE_LABELS: Record<RepairBenchMode, string> = {
    fine: '精修',
    simple: '简修',
    refurbish: '翻新',
    dismantle: '拆解'
  }

  const repairModeOptions: { id: RepairBenchMode; label: string; hint: string }[] = [
    { id: 'fine', label: '精修', hint: '材料+铜钱，少耗坚固' },
    { id: 'simple', label: '简修', hint: '只花铜钱，多耗坚固' },
    { id: 'refurbish', label: '翻新', hint: '昂贵，补回坚固' },
    { id: 'dismantle', label: '拆解', hint: '失固后返材' }
  ]

  interface RepairTargetView {
    key: string
    type: RepairBenchEquipType
    typeLabel: string
    index: number
    defId: string
    name: string
    current: number
    max: number
    sturdinessCurrent: number
    sturdinessMax: number
    missingDurability: number
    damagePercent: number
    equipped: boolean
    busy: boolean
    isBroken: boolean
    isSturdinessBroken: boolean
    statusLabel: string
    statusClass: string
  }

  interface RepairPreviewView {
    mode: RepairBenchMode
    materialItemId: string
    materialName: string
    materialQuantity: number
    materialCount: number
    money: number
    missingDurability: number
    damageRatio: number
    sturdinessLoss: number
    restoredSturdiness: number
    processingDays: number
    canRepair: boolean
    disabledReason: string
    freeByNpc: boolean
  }

  const selectedRepairTargetKey = ref('')
  const selectedRepairMode = ref<RepairBenchMode>('fine')

  const getPercent = (current: number, max: number): number => {
    if (max <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)))
  }

  const getItemName = (id: string): string => getItemById(id)?.name ?? id

  const formatRepairDisabledReason = (reason: string): string => {
    const labels: Record<string, string> = {
      durability_full: '耐久已满',
      sturdiness_insufficient: '坚固不足',
      fully_restored: '耐久和坚固已满',
      sturdiness_remaining: '坚固未耗尽'
    }
    return labels[reason] ?? reason
  }

  const getRepairDisplayName = (
    type: RepairBenchEquipType,
    defId: string,
    enchantmentId?: string | null,
    affixes?: ForgeAffixRoll[] | null
  ): string => {
    if (type === 'weapon') return getWeaponDisplayName(defId, enchantmentId ?? null, affixes ?? [])
    if (type === 'ring') return getRingById(defId)?.name ?? defId
    if (type === 'hat') return getHatById(defId)?.name ?? defId
    return getShoeById(defId)?.name ?? defId
  }

  const getRepairStatus = (current: number, max: number, sturdinessCurrent: number, sturdinessMax: number, busy: boolean) => {
    if (busy) return { label: '修理中', className: 'text-accent' }
    if (current <= 0 && sturdinessCurrent <= 0) return { label: '失固', className: 'text-danger' }
    if (current <= 0) return { label: '破损', className: 'text-danger' }
    if (sturdinessCurrent <= 0) return { label: '坚固耗尽', className: 'text-danger' }
    if (current < max || sturdinessCurrent < sturdinessMax) return { label: '可维护', className: 'text-accent' }
    return { label: '完好', className: 'text-muted' }
  }

  const buildRepairTarget = (
    type: RepairBenchEquipType,
    index: number,
    defId: string,
    equipped: boolean,
    enchantmentId?: string | null,
    affixes?: ForgeAffixRoll[] | null
  ): RepairTargetView | null => {
    const durability = inventoryStore.getOwnedEquipmentDurability(type, index)
    const sturdiness = inventoryStore.getOwnedEquipmentSturdiness(type, index)
    if (!durability || !sturdiness) return null
    const busy = processingStore.isSmithyRepairTargetBusy(type, index)
    const status = getRepairStatus(durability.current, durability.max, sturdiness.current, sturdiness.max, busy)
    const missingDurability = Math.max(0, durability.max - durability.current)
    return {
      key: `${type}-${index}`,
      type,
      typeLabel: REPAIR_TYPE_LABELS[type],
      index,
      defId,
      name: getRepairDisplayName(type, defId, enchantmentId, affixes),
      current: durability.current,
      max: durability.max,
      sturdinessCurrent: sturdiness.current,
      sturdinessMax: sturdiness.max,
      missingDurability,
      damagePercent: durability.max > 0 ? Math.ceil((missingDurability / durability.max) * 100) : 0,
      equipped,
      busy,
      isBroken: durability.current <= 0,
      isSturdinessBroken: sturdiness.current <= 0,
      statusLabel: status.label,
      statusClass: status.className
    }
  }

  const repairTargets = computed<RepairTargetView[]>(() => {
    const targets: RepairTargetView[] = []
    inventoryStore.ownedWeapons.forEach((entry, index) => {
      const target = buildRepairTarget('weapon', index, entry.defId, index === inventoryStore.equippedWeaponIndex, entry.enchantmentId, entry.affixes)
      if (target) targets.push(target)
    })
    inventoryStore.ownedRings.forEach((entry, index) => {
      const target = buildRepairTarget('ring', index, entry.defId, index === inventoryStore.equippedRingSlot1 || index === inventoryStore.equippedRingSlot2, entry.enchantmentId, entry.affixes)
      if (target) targets.push(target)
    })
    inventoryStore.ownedHats.forEach((entry, index) => {
      const target = buildRepairTarget('hat', index, entry.defId, index === inventoryStore.equippedHatIndex, entry.enchantmentId, entry.affixes)
      if (target) targets.push(target)
    })
    inventoryStore.ownedShoes.forEach((entry, index) => {
      const target = buildRepairTarget('shoe', index, entry.defId, index === inventoryStore.equippedShoeIndex, entry.enchantmentId, entry.affixes)
      if (target) targets.push(target)
    })
    return targets.sort((a, b) => {
      if (a.busy !== b.busy) return a.busy ? 1 : -1
      if (a.isBroken !== b.isBroken) return a.isBroken ? -1 : 1
      if (a.isSturdinessBroken !== b.isSturdinessBroken) return a.isSturdinessBroken ? -1 : 1
      return (a.current / Math.max(1, a.max)) - (b.current / Math.max(1, b.max))
    })
  })

  const selectedRepairTarget = computed(() =>
    repairTargets.value.find(target => target.key === selectedRepairTargetKey.value) ?? repairTargets.value[0] ?? null
  )

  const buildRepairPreview = (target: RepairTargetView, mode: RepairBenchMode): RepairPreviewView => {
    const cost = processingStore.getRepairBenchCostPreview(
      target.type,
      target.defId,
      { current: target.current, max: target.max },
      { current: target.sturdinessCurrent, max: target.sturdinessMax },
      mode
    )
    return {
      mode,
      materialItemId: cost.materialItemId,
      materialName: getItemName(cost.materialItemId),
      materialQuantity: cost.materialQuantity,
      materialCount: getCombinedItemCount(cost.materialItemId),
      money: cost.money,
      missingDurability: cost.missingDurability,
      damageRatio: cost.damageRatio,
      sturdinessLoss: cost.sturdinessLoss,
      restoredSturdiness: cost.restoredSturdiness,
      processingDays: cost.processingDays,
      canRepair: cost.canRepair,
      disabledReason: formatRepairDisabledReason(cost.disabledReason),
      freeByNpc: cost.freeByNpc
    }
  }

  const selectedRepairPreview = computed(() => {
    const target = selectedRepairTarget.value
    return target ? buildRepairPreview(target, selectedRepairMode.value) : null
  })

  const selectedRepairModeLabel = computed(() => REPAIR_MODE_LABELS[selectedRepairMode.value])
  const repairDamagedCount = computed(() => repairTargets.value.filter(target => target.current < target.max).length)
  const repairBrokenSturdinessCount = computed(() => repairTargets.value.filter(target => target.sturdinessCurrent <= 0).length)

  const repairActionBlockReason = computed(() => {
    const target = selectedRepairTarget.value
    const preview = selectedRepairPreview.value
    if (!target || !preview) return repairTargets.value.length > 0 ? '请选择装备。' : '没有可处理的装备。'
    if (target.busy) return '这件装备正在铁匠铺修理。'
    if (!preview.canRepair) return preview.disabledReason || '当前修理方式不可用。'
    if (!preview.freeByNpc && selectedRepairMode.value !== 'dismantle' && preview.materialCount < preview.materialQuantity) return `${preview.materialName}不足。`
    if (playerStore.money < preview.money) return '铜钱不足。'
    return ''
  })

  const canStartSelectedRepair = computed(() => !repairActionBlockReason.value)

  watch(repairTargets, targets => {
    if (targets.length <= 0) {
      selectedRepairTargetKey.value = ''
      return
    }
    if (!targets.some(target => target.key === selectedRepairTargetKey.value)) {
      selectedRepairTargetKey.value = targets[0]!.key
    }
  }, { immediate: true })

  watch(selectedRepairTarget, target => {
    if (!target) return
    const modes: RepairBenchMode[] = target.sturdinessCurrent <= 0 ? ['refurbish', 'dismantle', 'fine', 'simple'] : ['fine', 'simple', 'refurbish']
    const firstAvailable = modes.find(mode => buildRepairPreview(target, mode).canRepair)
    if (firstAvailable && firstAvailable !== selectedRepairMode.value) selectedRepairMode.value = firstAvailable
  })

  const handleStartSmithyRepair = () => {
    const target = selectedRepairTarget.value
    if (!target || !canStartSelectedRepair.value) {
      if (repairActionBlockReason.value) addLog(repairActionBlockReason.value)
      return
    }
    if (!processingStore.startSmithyRepair(target.type, target.index, target.defId, selectedRepairMode.value)) {
      addLog('铁匠铺修理开工失败，请检查材料、铜钱或装备状态。')
      return
    }
    if (selectedRepairMode.value === 'dismantle') {
      addLog(`${target.name}已拆解返材。`)
    } else {
      const preview = selectedRepairPreview.value
      addLog(preview?.freeByNpc ? `阿铁本周帮你免料${selectedRepairModeLabel.value}${target.name}。` : `铁匠铺开始${selectedRepairModeLabel.value}${target.name}。`)
    }
  }

  const handleCollectSmithyRepair = (jobId: string) => {
    if (!processingStore.collectSmithyRepairJob(jobId)) {
      addLog('这项修理暂时无法领取。')
    }
  }

  const formatSmithyJobMode = (mode: SmithyRepairJob['mode']): string => REPAIR_MODE_LABELS[mode]

  const getSmithyJobName = (job: SmithyRepairJob): string => getRepairDisplayName(job.equipType, job.defId)

  const getSmithyJobProgress = (job: SmithyRepairJob): number =>
    job.totalDays > 0 ? Math.max(0, Math.min(100, Math.round((job.daysProcessed / job.totalDays) * 100))) : 100

  // === 铁匠铺铸魔 ===

  interface ForgeTargetTypeOption {
    id: ForgeAffixTarget
    label: string
    count: number
  }

  type ForgeLockTarget = 'weapon' | 'ring' | 'hat' | 'shoe'

  interface ForgeTargetOption {
    key: string
    target: ForgeAffixTarget
    index: number
    name: string
    affixSummary: string
    affixes: ForgeAffixRoll[]
    equipped: boolean
    locked: boolean
    lockTarget: ForgeLockTarget | null
    disabled: boolean
    disabledReason: string
  }

  interface ForgeMaterialLine {
    itemId: string
    item: ItemDef | null
    itemName: string
    quantity: number
    count: number
  }

  interface ForgeRangeLine {
    id: string
    name: string
    range: string
    description: string
  }

  const BASE_FORGE_TARGETS: ForgeAffixTarget[] = ['weapon', 'pickaxe']
  const CUSTOM_EQUIP_FORGE_TARGETS: ForgeAffixTarget[] = ['ring', 'hat', 'shoe']
  const selectedForgeTarget = ref<ForgeAffixTarget>('weapon')
  const selectedForgeItemIndex = ref(0)
  const selectedForgeMode = ref<ForgeAffixMode>('random')
  const selectedForgeDirectionId = ref<ForgeAffixDirectionId | ''>(getForgeDirectionsForTarget('weapon')[0]?.id ?? '')
  const selectedForgePreserveId = ref('')
  const forgeResult = ref<ForgeAffixRoll[]>([])

  const cloneForgeAffixRolls = (affixes?: ForgeAffixRoll[] | null): ForgeAffixRoll[] =>
    (affixes ?? []).map(roll => ({ id: roll.id, value: roll.value, quality: roll.quality }))

  const forgeServiceLockedReason = computed(() => processingStore.getEnchantingForgeServiceLockedReason())
  const forgeTargets = computed<ForgeAffixTarget[]>(() =>
    inventoryStore.npcCustomEquipUnlocked
      ? [...BASE_FORGE_TARGETS, ...CUSTOM_EQUIP_FORGE_TARGETS]
      : BASE_FORGE_TARGETS
  )

  const getForgeTargetCount = (target: ForgeAffixTarget): number => {
    if (target === 'weapon') return inventoryStore.ownedWeapons.length
    if (target === 'pickaxe') return inventoryStore.getTool('pickaxe') ? 1 : 0
    if (target === 'ring') return inventoryStore.ownedRings.length
    if (target === 'hat') return inventoryStore.ownedHats.length
    return inventoryStore.ownedShoes.length
  }

  const forgeTargetTypeOptions = computed<ForgeTargetTypeOption[]>(() =>
    forgeTargets.value.map(id => ({
      id,
      label: FORGE_AFFIX_TARGET_LABELS[id],
      count: getForgeTargetCount(id)
    }))
  )

  const getDefaultForgeDirectionId = (target: ForgeAffixTarget): ForgeAffixDirectionId | '' =>
    getForgeDirectionsForTarget(target)[0]?.id ?? ''

  const getEquipmentForgeBaseName = (target: ForgeAffixTarget, defId: string): string => {
    if (target === 'ring') return getRingById(defId)?.name ?? defId
    if (target === 'hat') return getHatById(defId)?.name ?? defId
    if (target === 'shoe') return getShoeById(defId)?.name ?? defId
    return defId
  }

  const equipmentForgeDefExists = (target: ForgeAffixTarget, defId: string): boolean => {
    if (target === 'ring') return !!getRingById(defId)
    if (target === 'hat') return !!getHatById(defId)
    if (target === 'shoe') return !!getShoeById(defId)
    return false
  }

  const buildEquipmentForgeOptions = (
    target: 'ring' | 'hat' | 'shoe',
    entries: (OwnedRing | OwnedHat | OwnedShoe)[]
  ): ForgeTargetOption[] =>
    entries.map((entry, index) => {
      const affixes = cloneForgeAffixRolls(entry.affixes)
      const equipped = target === 'ring'
        ? index === inventoryStore.equippedRingSlot1 || index === inventoryStore.equippedRingSlot2
        : target === 'hat'
          ? index === inventoryStore.equippedHatIndex
          : index === inventoryStore.equippedShoeIndex
      return {
        key: `${target}-${index}`,
        target,
        index,
        name: getEquipmentForgeBaseName(target, entry.defId),
        affixSummary: formatForgeAffixSummary(affixes),
        affixes,
        equipped,
        locked: !!entry.locked,
        lockTarget: target,
        disabled: !!entry.locked || !equipmentForgeDefExists(target, entry.defId),
        disabledReason: entry.locked ? '已锁定' : equipmentForgeDefExists(target, entry.defId) ? '' : '定义缺失'
      }
    })

  const buildPickaxeForgeOption = (tool: Tool): ForgeTargetOption => {
    const affixes = inventoryStore.getToolAffixes('pickaxe')
    const upgrading = !inventoryStore.isToolAvailable('pickaxe')
    return {
      key: 'pickaxe-0',
      target: 'pickaxe',
      index: 0,
      name: `${TOOL_NAMES.pickaxe} · ${TIER_NAMES[tool.tier]}`,
      affixSummary: formatForgeAffixSummary(affixes),
      affixes,
      equipped: true,
      locked: false,
      lockTarget: null,
      disabled: upgrading,
      disabledReason: upgrading ? '升级中' : ''
    }
  }

  const forgeItemOptions = computed<ForgeTargetOption[]>(() => {
    if (selectedForgeTarget.value === 'weapon') {
      return inventoryStore.ownedWeapons.map((weapon, index) => {
        const affixes = cloneForgeAffixRolls(weapon.affixes)
        const def = getWeaponById(weapon.defId)
        return {
          key: `weapon-${index}`,
          target: 'weapon',
          index,
          name: def ? getWeaponDisplayName(weapon.defId, weapon.enchantmentId, affixes) : weapon.defId,
          affixSummary: formatForgeAffixSummary(affixes),
          affixes,
          equipped: index === inventoryStore.equippedWeaponIndex,
          locked: !!weapon.locked,
          lockTarget: 'weapon',
          disabled: !!weapon.locked || !def,
          disabledReason: weapon.locked ? '已锁定' : def ? '' : '定义缺失'
        }
      })
    }
    if (selectedForgeTarget.value === 'pickaxe') {
      const tool = inventoryStore.getTool('pickaxe')
      return tool ? [buildPickaxeForgeOption(tool)] : []
    }
    if (selectedForgeTarget.value === 'ring') return buildEquipmentForgeOptions('ring', inventoryStore.ownedRings)
    if (selectedForgeTarget.value === 'hat') return buildEquipmentForgeOptions('hat', inventoryStore.ownedHats)
    return buildEquipmentForgeOptions('shoe', inventoryStore.ownedShoes)
  })

  const selectedForgeItem = computed<ForgeTargetOption | null>(() =>
    forgeItemOptions.value.find(option => option.index === selectedForgeItemIndex.value) ?? null
  )

  const forgeModeOptions = computed(() =>
    FORGE_AFFIX_MODE_DEFS
      .filter(mode => mode.id !== 'deep_refine' || selectedForgeTarget.value === 'pickaxe')
      .map(mode => ({
        ...mode,
        unlocked: processingStore.workshopLevel >= mode.minLevel
      }))
  )

  const selectedForgeModeDef = computed(() => getForgeAffixModeById(selectedForgeMode.value))
  const forgeDirectionOptions = computed(() => getForgeDirectionsForTarget(selectedForgeTarget.value))
  const selectedForgeDirection = computed(() =>
    forgeDirectionOptions.value.find(direction => direction.id === selectedForgeDirectionId.value) ?? null
  )
  const forgePreserveOptions = computed(() =>
    (selectedForgeItem.value?.affixes ?? []).flatMap(roll => {
      const def = getForgeAffixById(roll.id)
      return def
        ? [{
            id: roll.id,
            label: formatForgeAffixRoll(roll),
            name: def.name
          }]
        : []
    })
  )

  const forgeMaterialLines = computed<ForgeMaterialLine[]>(() =>
    selectedForgeModeDef.value.materials.map(mat => ({
      itemId: mat.itemId,
      item: getItemById(mat.itemId) ?? null,
      itemName: getItemName(mat.itemId),
      quantity: mat.quantity,
      count: getCombinedItemCount(mat.itemId)
    }))
  )

  const forgeRangeLines = computed<ForgeRangeLine[]>(() => {
    const target = selectedForgeTarget.value
    const directionIds = selectedForgeMode.value === 'deep_refine'
      ? ['quarry_resonance', 'deep_vein_grip', 'relic_sense']
      : selectedForgeMode.value === 'directed' && selectedForgeDirection.value
        ? selectedForgeDirection.value.affixIds
        : []
    const ids = directionIds.length > 0
      ? [...directionIds, ...getForgeAffixesForTarget(target).map(affix => affix.id)]
      : getForgeAffixesForTarget(target).map(affix => affix.id)
    const seen = new Set<string>()
    return ids.flatMap(id => {
      if (seen.has(id)) return []
      seen.add(id)
      const def = getForgeAffixById(id)
      return def && def.target === target
        ? [{
            id,
            name: def.name,
            range: formatForgeAffixRange(def),
            description: def.description
          }]
        : []
    })
  })

  const forgeCountHint = computed(() => {
    if (processingStore.workshopLevel >= 15) return '最终词条数：1/2/3（50%/38%/12%）'
    if (processingStore.workshopLevel >= 10) return '最终词条数：1/2（70%/30%）'
    return '最终词条数：1'
  })

  const forgeDirectedTopUpHint = computed(() => {
    if (selectedForgeMode.value !== 'directed') return ''
    const directionSize = selectedForgeDirection.value?.affixIds.length ?? 0
    return processingStore.workshopLevel >= 15 && directionSize < 3
      ? '若最终条数超过方向池容量，额外词条从同类型池补足。'
      : ''
  })

  const forgeDeepRefineHint = computed(() =>
    selectedForgeMode.value === 'deep_refine'
      ? '深脉精锻只作用于镐子，消耗旧采石场深脉稀材与守息丹，结果会写入镐子词条并影响采石场收取。'
      : ''
  )

  const forgeResultLines = computed(() => forgeResult.value.map(formatForgeAffixRoll))

  const forgeBlockReason = computed(() => {
    if (forgeServiceLockedReason.value) return forgeServiceLockedReason.value
    const target = selectedForgeTarget.value
    const item = selectedForgeItem.value
    const mode = selectedForgeModeDef.value
    if (!item) return `缺少可铸魔的${FORGE_AFFIX_TARGET_LABELS[target]}。`
    if (item.locked && target === 'weapon') return '这件武器已锁定，先解锁才能铸魔。'
    if (item.locked) return '这件装备已锁定，先解锁才能铸魔。'
    if (target === 'pickaxe' && item.disabledReason === '升级中') return '镐子正在升级，完成后才能铸魔。'
    if (item.disabled) return item.disabledReason ? `${item.name}${item.disabledReason}，无法铸魔。` : `${item.name}无法铸魔。`
    if (processingStore.workshopLevel < mode.minLevel) return `工坊 Lv.${mode.minLevel} 后开放${mode.label}。`
    if (mode.id === 'deep_refine' && target !== 'pickaxe') return '深脉精锻只能用于镐子。'
    if (mode.id === 'directed' && !selectedForgeDirection.value) return '请选择定向方向。'
    if (mode.id === 'protected') {
      if (item.affixes.length <= 0) return '保留重铸需要目标已有词条。'
      if (!forgePreserveOptions.value.some(option => option.id === selectedForgePreserveId.value)) return '请选择要保留的词条。'
    }
    if (playerStore.money < mode.cost) return '铜钱不足。'
    if (!hasCombinedItems(mode.materials)) return '材料不足。'
    return ''
  })

  const canConfirmForge = computed(() => !forgeBlockReason.value)

  watch(selectedForgeTarget, target => {
    if (!forgeTargets.value.includes(target)) {
      selectedForgeTarget.value = forgeTargets.value[0] ?? 'weapon'
      return
    }
    selectedForgeItemIndex.value = 0
    selectedForgeDirectionId.value = getDefaultForgeDirectionId(target)
    selectedForgePreserveId.value = ''
    forgeResult.value = []
  })

  watch(forgeItemOptions, options => {
    if (options.length <= 0) {
      selectedForgeItemIndex.value = 0
      selectedForgePreserveId.value = ''
      return
    }
    if (!options.some(option => option.index === selectedForgeItemIndex.value)) {
      selectedForgeItemIndex.value = options[0]!.index
    }
  })

  watch(forgeTargets, targets => {
    if (!targets.includes(selectedForgeTarget.value)) {
      selectedForgeTarget.value = targets[0] ?? 'weapon'
    }
  })

  watch(selectedForgeMode, () => {
    forgeResult.value = []
  })

  watch(forgeModeOptions, options => {
    if (!options.some(option => option.id === selectedForgeMode.value)) {
      selectedForgeMode.value = 'random'
    }
  })

  watch(forgeDirectionOptions, options => {
    if (options.length <= 0) {
      selectedForgeDirectionId.value = ''
      return
    }
    if (!options.some(option => option.id === selectedForgeDirectionId.value)) {
      selectedForgeDirectionId.value = options[0]!.id
    }
  })

  watch(forgePreserveOptions, options => {
    if (options.length <= 0) {
      selectedForgePreserveId.value = ''
      return
    }
    if (!options.some(option => option.id === selectedForgePreserveId.value)) {
      selectedForgePreserveId.value = options[0]!.id
    }
  })

  const handleUnlockForgeTarget = (option: ForgeTargetOption) => {
    if (!option.lockTarget) return
    selectedForgeItemIndex.value = option.index
    if (inventoryStore.toggleEquipmentLock(option.lockTarget, option.index)) {
      forgeResult.value = []
      addLog(`已解锁${option.name}，可以在铁匠铺继续铸魔。`)
    } else {
      addLog('解锁失败，目标不存在。')
    }
  }

  const setForgeAffixes = (
    target: ForgeAffixTarget,
    index: number,
    affixes: ForgeAffixRoll[]
  ): { success: boolean; message: string } => {
    if (target === 'weapon') return inventoryStore.setWeaponAffixes(index, affixes)
    if (target === 'pickaxe') return inventoryStore.setToolAffixes('pickaxe', affixes)
    if (target === 'ring') return inventoryStore.setRingAffixes(index, affixes)
    if (target === 'hat') return inventoryStore.setHatAffixes(index, affixes)
    return inventoryStore.setShoeAffixes(index, affixes)
  }

  const handleConfirmForge = () => {
    if (!canConfirmForge.value) {
      if (forgeBlockReason.value) addLog(forgeBlockReason.value)
      return
    }

    const item = selectedForgeItem.value
    if (!item) return
    const mode = selectedForgeModeDef.value
    const directionId: ForgeAffixDirectionId | null =
      selectedForgeMode.value === 'deep_refine'
        ? 'pickaxe_quarry_deep'
        : selectedForgeMode.value === 'directed' && selectedForgeDirectionId.value
          ? selectedForgeDirectionId.value
          : null
    const preserveId = selectedForgeMode.value === 'protected' ? selectedForgePreserveId.value : null
    const resultAffixes = rollForgeAffixes({
      target: item.target,
      workshopLevel: processingStore.workshopLevel,
      directionId,
      preserveId
    })

    if (resultAffixes.length <= 0) {
      addLog('铸魔失败：没有可用词条。')
      return
    }

    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()

    if (!playerStore.spendMoney(mode.cost)) {
      addLog('铜钱不足。')
      return
    }
    if (!removeCombinedItems(mode.materials)) {
      playerStore.earnMoney(mode.cost, { countAsEarned: false })
      addLog('材料不足。')
      return
    }

    const result = setForgeAffixes(item.target, item.index, resultAffixes)
    if (!result.success) {
      playerStore.earnMoney(mode.cost, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog(result.message)
      return
    }

    const resultSummary = formatForgeAffixSummary(resultAffixes)
    forgeResult.value = cloneForgeAffixRolls(resultAffixes)
    addLog(`铁匠铺铸魔完成：${item.name} 获得 ${resultSummary}。`)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.craftMachine)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }

  /** 该工具是否正在升级中 */
  const isUpgrading = (type: ToolType): boolean => {
    return inventoryStore.pendingUpgrade?.toolType === type
  }

  const canUpgrade = (type: ToolType): boolean => {
    if (!isShopOpen('upgrade', gameStore.day, gameStore.hour).open) return false
    // 已有工具在升级中，不能再升级
    if (inventoryStore.pendingUpgrade) return false

    const tool = inventoryStore.getTool(type)
    if (!tool) return false
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return false

    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier]
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) return false

    if (playerStore.money < cost.money) return false
    for (const mat of cost.materials) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const getRushUpgradeMoney = (baseMoney: number): number => baseMoney * RUSH_UPGRADE_MONEY_MULTIPLIER

  const canRushUpgrade = (type: ToolType): boolean => {
    if (type !== 'wateringCan') return false
    if (!isShopOpen('upgrade', gameStore.day, gameStore.hour).open) return false
    if (inventoryStore.pendingUpgrade) return false

    const tool = inventoryStore.getTool(type)
    if (!tool) return false
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return false

    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier]
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) return false

    if (playerStore.money < getRushUpgradeMoney(cost.money)) return false
    for (const mat of cost.materials) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  /** 返回升级被阻止的原因（用于 UI 提示），可升级时返回空字符串 */
  const getUpgradeBlockReason = (type: ToolType): string => {
    if (inventoryStore.pendingUpgrade) return '小满正在锻造其他工具'

    const tool = inventoryStore.getTool(type)
    if (!tool) return ''
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return ''
    const shopAccess = isShopOpen('upgrade', gameStore.day, gameStore.hour)
    if (!shopAccess.open) {
      return shopAccess.reason || '铁匠铺当前未营业'
    }

    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier]
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) {
      return `需要小满好感达到「${LEVEL_NAMES[requiredLevel]}」`
    }

    if (playerStore.money < cost.money) return '铜钱不足'
    for (const mat of cost.materials) {
      if (getCombinedItemCount(mat.itemId) < mat.quantity) {
        const itemName = getItemById(mat.itemId)?.name ?? mat.itemId
        return `${itemName}不足（${getCombinedItemCount(mat.itemId)}/${mat.quantity}）`
      }
    }
    return ''
  }

  const getRushUpgradeBlockReason = (type: ToolType): string => {
    if (type !== 'wateringCan') return ''

    const baseReason = getUpgradeBlockReason(type)
    const tool = inventoryStore.getTool(type)
    const cost = tool ? getUpgradeCost(type, tool.tier) : null
    if (!cost || baseReason) return baseReason

    const rushMoney = getRushUpgradeMoney(cost.money)
    if (playerStore.money < rushMoney) return `加急需要 ${rushMoney} 文铜钱`
    return ''
  }

  const handleUpgradeAndClose = (type: ToolType) => {
    const tool = inventoryStore.getTool(type)
    if (!tool) return
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return
    if (!canUpgrade(type)) {
      addLog(getUpgradeBlockReason(type) || '条件不足，无法升级。')
      return
    }

    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()
    if (!playerStore.spendMoney(cost.money)) {
      addLog('铜钱不足，无法升级。')
      return
    }
    if (!removeCombinedItems(cost.materials)) {
      playerStore.earnMoney(cost.money, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog('材料不足，无法升级。')
      return
    }
    if (!inventoryStore.startUpgrade(type, cost.toTier)) {
      playerStore.earnMoney(cost.money, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog('工具暂时无法进入升级队列。')
      return
    }

    addLog(`你把${TOOL_NAMES[type]}和材料交给了小满，${cost.money}文。2天后会自动完成并归还。`)
    selectedTool.value = null
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.toolUpgrade)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) {
      handleEndDay()
      return
    }
  }

  const handleRushUpgradeAndClose = (type: ToolType) => {
    const tool = inventoryStore.getTool(type)
    if (!tool) return
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return
    if (!canRushUpgrade(type)) {
      addLog(getRushUpgradeBlockReason(type) || getUpgradeBlockReason(type) || '条件不足，无法加急升级。')
      return
    }

    const rushMoney = getRushUpgradeMoney(cost.money)
    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()
    if (!playerStore.spendMoney(rushMoney)) {
      addLog('铜钱不足，无法加急升级。')
      return
    }
    if (!removeCombinedItems(cost.materials)) {
      playerStore.earnMoney(rushMoney, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog('材料不足，无法加急升级。')
      return
    }
    if (!inventoryStore.upgradeTool(type)) {
      playerStore.earnMoney(rushMoney, { countAsEarned: false })
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      addLog('水壶已无法继续升级。')
      return
    }

    addLog(`你请小满加急锻造${TOOL_NAMES[type]}，支付${rushMoney}文，水壶立即升级为${TIER_NAMES[cost.toTier]}。`)
    selectedTool.value = null
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.toolUpgrade)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) {
      handleEndDay()
      return
    }
  }
</script>

