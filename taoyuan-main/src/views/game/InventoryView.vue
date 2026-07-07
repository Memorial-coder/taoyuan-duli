<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Package :size="14" />
        <span>背包</span>
      </div>
      <span class="text-xs text-muted">
        {{ inventoryStore.items.length }}/{{ inventoryStore.capacity }}
        <span v-if="inventoryStore.tempItems.length > 0" class="text-danger">+{{ inventoryStore.tempItems.length }}溢出</span>
      </span>
    </div>

    <!-- 页签切换 -->
    <div class="flex space-x-1 mb-3">
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'items' }" @click="tab = 'items'">物品</Button>
      <Button class="flex-1 justify-center" :class="{ '!bg-accent !text-bg': tab === 'tools' }" @click="tab = 'tools'">装备</Button>
      <Button
        class="flex-1 justify-center"
        :class="{ '!bg-danger !text-text': tab === 'temp', 'text-danger': tab !== 'temp' && inventoryStore.tempItems.length > 0 }"
        @click="tab = 'temp'"
      >
        临时{{ inventoryStore.tempItems.length > 0 ? `(${inventoryStore.tempItems.length})` : '' }}
      </Button>
    </div>

    <!-- 物品页 -->
    <template v-if="tab === 'items'">
      <div v-if="inventoryStore.items.length > 1" class="flex justify-end mb-1.5 space-x-1">
        <Button
          class="py-0 px-1.5"
          :class="{ '!bg-accent !text-bg': isFilterActive }"
          :icon="Filter"
          :icon-size="12"
          @click="openFilterModal"
        >
          筛选
        </Button>
        <Button class="py-0 px-1.5" :icon="ArrowDown01" :icon-size="12" @click="inventoryStore.sortItems()">整理</Button>
      </div>
      <div v-if="cropUseRecommendations.length > 0" class="border border-accent/20 rounded-xs px-2 py-1.5 mb-2">
        <p class="text-[0.625rem] text-accent mb-1">库存用途建议</p>
        <div
          v-for="entry in cropUseRecommendations"
          :key="`${entry.itemId}-${entry.quality}`"
          class="flex items-start justify-between gap-2 py-0.5"
        >
          <div class="min-w-0">
            <p class="text-xs text-text truncate">
              {{ entry.name }}
              <span v-if="entry.quality !== 'normal'" class="text-muted">({{ QUALITY_NAMES[entry.quality] }})</span>
              ×{{ entry.quantity }}
            </p>
            <p class="text-[0.625rem] text-muted leading-snug">{{ entry.text }}</p>
          </div>
          <button class="text-[0.625rem] text-accent/80 shrink-0" @click="openInventoryItem(entry.itemId, entry.quality)">查看</button>
        </div>
      </div>
      <div
        v-if="filteredItems.length > 0"
        ref="inventoryItemsViewportRef"
        class="inventory-items-viewport"
        @scroll="onInventoryItemsScroll"
      >
        <div :style="{ paddingTop: inventoryTopPad + 'px', paddingBottom: inventoryBottomPad + 'px' }">
          <div class="inventory-adaptive-item-grid inventory-items-virtual-grid">
            <ItemCard
              v-for="item in virtualFilteredItems"
              :key="`${item.itemId}-${item.quality}`"
              :item="getItemById(item.itemId) ?? null"
              :quantity="item.quantity"
              :quality="item.quality"
              :locked="item.locked"
              show-usage-tags
              @usage-click="handleInventoryUsageTagClick"
              @click="openVisibleInventoryItem(item)"
            />

        <!-- 空格子 -->
        <div
          v-for="slot in virtualEmptyInventorySlots"
          :key="'empty-' + slot"
          class="inventory-empty-slot border border-accent/10 rounded-xs p-1.5 text-center text-xs text-muted/30"
        >
          空
        </div>
          </div>
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
        <Package :size="24" />
        <p class="text-xs mt-1">背包是空的</p>
      </div>
    </template>

    <!-- 临时背包页 -->
    <template v-if="tab === 'temp'">
      <div v-if="inventoryStore.tempItems.length > 0">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[0.625rem] text-muted">背包满时溢出的物品，请及时取回</span>
          <Button class="py-0 px-1.5" :disabled="!canMoveAnyTempItem" @click="handleMoveAllFromTemp">
            {{ tempMoveAllLabel }}
          </Button>
        </div>
        <div class="inventory-adaptive-item-grid grid grid-cols-3 md:grid-cols-5 gap-1.5">
          <ItemCard
            v-for="(item, idx) in inventoryStore.tempItems"
            :key="'temp-' + idx"
            :item="getItemById(item.itemId) ?? null"
            :quantity="item.quantity"
            :quality="item.quality"
            tone="danger"
            show-usage-tags
            @usage-click="handleInventoryUsageTagClick"
            @click="activeTempIdx = idx"
          />

          <!-- 空格子 -->
          <div
            v-for="i in Math.max(0, 10 - inventoryStore.tempItems.length)"
            :key="'temp-empty-' + i"
            class="border border-danger/10 rounded-xs p-1.5 text-center text-xs text-muted/30"
          >
            空
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-4 text-muted">
        <Archive :size="24" />
        <p class="text-xs mt-1">临时背包是空的</p>
      </div>
    </template>

    <!-- 装备页 -->
    <template v-if="tab === 'tools'">
      <div class="inventory-equipment-layout desktop-adaptive-grid" data-testid="inventory-equipment-layout">
      <!-- 方案按钮 -->
      <div class="desktop-adaptive-span-all flex items-center justify-end mb-1.5 space-x-1.5">
        <span v-if="activePresetName" class="text-[0.625rem] text-success truncate">{{ activePresetName }}</span>
        <Button class="py-0 px-1.5" :icon="BookMarked" :icon-size="12" @click="showPresetModal = true">方案</Button>
      </div>

      <!-- 武器 -->
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-muted mb-1">武器</p>
        <div v-if="equippedWeaponName" class="border border-accent/10 rounded-xs px-2 py-1 text-center mb-1">
          <p class="text-[0.625rem] text-muted">装备中</p>
          <p class="text-xs text-accent">{{ equippedWeaponName }}</p>
          <p v-if="equippedWeaponDurability" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
            <span>耐 {{ equippedWeaponDurability.current }}/{{ equippedWeaponDurability.max }}</span>
            <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
              <span class="block h-full rounded-full" :class="getDurabilityColor(equippedWeaponDurability.current, equippedWeaponDurability.max)" :style="{ width: getDurabilityPercent(equippedWeaponDurability) + '%' }"></span>
            </span>
          </p>
          <p v-if="equippedWeaponSturdiness" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
            <span>固 {{ equippedWeaponSturdiness.current }}/{{ equippedWeaponSturdiness.max }}</span>
            <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
              <span class="block h-full rounded-full" :class="getSturdinessStateColor(equippedWeaponSturdiness)" :style="{ width: getSturdinessPercent(equippedWeaponSturdiness) + '%' }"></span>
            </span>
          </p>
        </div>
        <div class="flex flex-col space-y-1 max-h-40 overflow-y-auto">
          <div
            v-for="(weapon, idx) in inventoryStore.ownedWeapons"
            :key="idx"
            class="inventory-equipment-row flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5"
            :class="idx === inventoryStore.equippedWeaponIndex ? 'border-accent/30' : 'border-accent/10'"
            @click="activeWeaponIdx = idx"
          >
            <div class="inventory-equipment-info flex min-w-0 flex-1 items-center gap-1.5">
              <ItemIcon :item="getItemById(weapon.defId)" size="xs" :show-badge="false" />
              <span class="inventory-equipment-copy flex items-center gap-1 min-w-0 text-xs" :class="idx === inventoryStore.equippedWeaponIndex ? 'text-accent' : ''">
                <Lock v-if="weapon.locked" :size="11" class="shrink-0 text-accent/70" />
                <span class="truncate">{{ getWeaponDisplayName(weapon.defId, weapon.enchantmentId, weapon.affixes) }}</span>
              </span>
            </div>
            <span v-if="idx === inventoryStore.equippedWeaponIndex" class="text-xs text-accent">装备中</span>
            <span v-else-if="weapon.locked" class="text-xs text-accent">已锁定</span>
            <span v-else class="text-xs text-muted">{{ getWeaponSellPrice(weapon.defId, weapon.enchantmentId, weapon.affixes) }}文</span>
            <!-- 耐久条 -->
            <div v-if="getWeaponDurability(idx)" class="inventory-equipment-actions inventory-equipment-durability flex flex-col gap-0.5 ml-2 shrink-0">
              <div class="flex items-center gap-1">
                <span class="text-[0.5rem] text-muted w-12 text-right">耐 {{ formatDurability(getWeaponDurability(idx)) }}</span>
                <div class="w-12 h-1 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getDurabilityStateColor(getWeaponDurability(idx))" :style="{ width: getDurabilityPercent(getWeaponDurability(idx)) + '%' }"></div>
                </div>
                <span v-if="isDurabilityBroken(getWeaponDurability(idx))" class="text-[0.5rem] text-danger font-bold">破损</span>
              </div>
              <div v-if="getWeaponSturdiness(idx)" class="flex items-center gap-1">
                <span class="text-[0.5rem] text-muted w-12 text-right">固 {{ formatSturdiness(getWeaponSturdiness(idx)) }}</span>
                <div class="w-12 h-1 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(getWeaponSturdiness(idx))" :style="{ width: getSturdinessPercent(getWeaponSturdiness(idx)) + '%' }"></div>
                </div>
                <span v-if="isSturdinessDepleted(getWeaponSturdiness(idx))" class="text-[0.5rem] text-danger font-bold">失固</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 帽子 -->
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-muted mb-1">帽子</p>
        <div v-if="inventoryStore.ownedHats.length > 0" class="flex flex-col space-y-1">
          <!-- 槽位 -->
          <div class="border border-accent/10 rounded-xs px-2 py-1 text-center mb-1">
            <p class="text-[0.625rem] text-muted">装备中</p>
            <p class="text-xs" :class="equippedHatName ? 'text-accent' : 'text-muted/40'">
              {{ equippedHatName ?? '空' }}
            </p>
            <p v-if="equippedHatDurability" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
              <span>耐 {{ equippedHatDurability.current }}/{{ equippedHatDurability.max }}</span>
              <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
                <span class="block h-full rounded-full" :class="getDurabilityColor(equippedHatDurability.current, equippedHatDurability.max)" :style="{ width: getDurabilityPercent(equippedHatDurability) + '%' }"></span>
              </span>
            </p>
            <p v-if="equippedHatSturdiness" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
              <span>固 {{ equippedHatSturdiness.current }}/{{ equippedHatSturdiness.max }}</span>
              <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
                <span class="block h-full rounded-full" :class="getSturdinessStateColor(equippedHatSturdiness)" :style="{ width: getSturdinessPercent(equippedHatSturdiness) + '%' }"></span>
              </span>
            </p>
          </div>
          <!-- 拥有的帽子列表 -->
          <div class="max-h-40 overflow-y-auto flex flex-col space-y-1">
            <div
              v-for="(hat, idx) in inventoryStore.ownedHats"
              :key="idx"
              class="inventory-equipment-row flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5"
              :class="inventoryStore.equippedHatIndex === idx ? 'border-accent/30' : 'border-accent/10'"
              @click="activeHatIdx = idx"
            >
              <div class="inventory-equipment-info flex min-w-0 flex-1 items-center gap-1.5">
                <ItemIcon :item="getItemById(hat.defId)" size="xs" :show-badge="false" />
                <div class="inventory-equipment-copy min-w-0 flex-1">
                <span class="flex items-center gap-1 min-w-0 text-xs" :class="inventoryStore.equippedHatIndex === idx ? 'text-accent' : ''">
                  <Lock v-if="hat.locked" :size="11" class="shrink-0 text-accent/70" />
                  <span class="truncate">{{ getHatById(hat.defId)?.name ?? hat.defId }}</span>
                </span>
                <p class="text-[0.625rem] text-muted truncate">
                  {{ getHatById(hat.defId)?.description }}
                  <template v-if="formatForgeAffixSummary(hat.affixes)"> · {{ formatForgeAffixSummary(hat.affixes) }}</template>
                </p>
                </div>
              </div>
              <div class="inventory-equipment-actions flex items-center gap-1 shrink-0 ml-2">
                <div v-if="getHatDurability(idx)" class="inventory-equipment-durability flex flex-col gap-0.5">
                  <div class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">耐 {{ formatDurability(getHatDurability(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getDurabilityStateColor(getHatDurability(idx))" :style="{ width: getDurabilityPercent(getHatDurability(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isDurabilityBroken(getHatDurability(idx))" class="text-[0.5rem] text-danger font-bold">破损</span>
                  </div>
                  <div v-if="getHatSturdiness(idx)" class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">固 {{ formatSturdiness(getHatSturdiness(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(getHatSturdiness(idx))" :style="{ width: getSturdinessPercent(getHatSturdiness(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isSturdinessDepleted(getHatSturdiness(idx))" class="text-[0.5rem] text-danger font-bold">失固</span>
                  </div>
                </div>
                <Button
                  class="py-0 px-1.5"
                  :class="inventoryStore.equippedHatIndex === idx ? '!bg-accent !text-bg' : ''"
                  @click.stop="handleToggleHat(idx)"
                >
                  {{ inventoryStore.equippedHatIndex === idx ? '卸下' : '装备' }}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted/40 text-center py-2">暂无帽子</p>
      </div>

      <!-- 鞋子 -->
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-muted mb-1">鞋子</p>
        <div v-if="inventoryStore.ownedShoes.length > 0" class="flex flex-col space-y-1">
          <!-- 槽位 -->
          <div class="border border-accent/10 rounded-xs px-2 py-1 text-center mb-1">
            <p class="text-[0.625rem] text-muted">装备中</p>
            <p class="text-xs" :class="equippedShoeName ? 'text-accent' : 'text-muted/40'">
              {{ equippedShoeName ?? '空' }}
            </p>
            <p v-if="equippedShoeDurability" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
              <span>耐 {{ equippedShoeDurability.current }}/{{ equippedShoeDurability.max }}</span>
              <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
                <span class="block h-full rounded-full" :class="getDurabilityColor(equippedShoeDurability.current, equippedShoeDurability.max)" :style="{ width: getDurabilityPercent(equippedShoeDurability) + '%' }"></span>
              </span>
            </p>
            <p v-if="equippedShoeSturdiness" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
              <span>固 {{ equippedShoeSturdiness.current }}/{{ equippedShoeSturdiness.max }}</span>
              <span class="h-1 w-12 overflow-hidden rounded-full bg-accent/10">
                <span class="block h-full rounded-full" :class="getSturdinessStateColor(equippedShoeSturdiness)" :style="{ width: getSturdinessPercent(equippedShoeSturdiness) + '%' }"></span>
              </span>
            </p>
          </div>
          <!-- 拥有的鞋子列表 -->
          <div class="max-h-40 overflow-y-auto flex flex-col space-y-1">
            <div
              v-for="(shoe, idx) in inventoryStore.ownedShoes"
              :key="idx"
              class="inventory-equipment-row flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5"
              :class="inventoryStore.equippedShoeIndex === idx ? 'border-accent/30' : 'border-accent/10'"
              @click="activeShoeIdx = idx"
            >
              <div class="inventory-equipment-info flex min-w-0 flex-1 items-center gap-1.5">
                <ItemIcon :item="getItemById(shoe.defId)" size="xs" :show-badge="false" />
                <div class="inventory-equipment-copy min-w-0 flex-1">
                <span class="flex items-center gap-1 min-w-0 text-xs" :class="inventoryStore.equippedShoeIndex === idx ? 'text-accent' : ''">
                  <Lock v-if="shoe.locked" :size="11" class="shrink-0 text-accent/70" />
                  <span class="truncate">{{ getShoeById(shoe.defId)?.name ?? shoe.defId }}</span>
                </span>
                <p class="text-[0.625rem] text-muted truncate">
                  {{ getShoeById(shoe.defId)?.description }}
                  <template v-if="formatForgeAffixSummary(shoe.affixes)"> · {{ formatForgeAffixSummary(shoe.affixes) }}</template>
                </p>
                </div>
              </div>
              <div class="inventory-equipment-actions flex items-center gap-1 shrink-0 ml-2">
                <div v-if="getShoeDurability(idx)" class="inventory-equipment-durability flex flex-col gap-0.5">
                  <div class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">耐 {{ formatDurability(getShoeDurability(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getDurabilityStateColor(getShoeDurability(idx))" :style="{ width: getDurabilityPercent(getShoeDurability(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isDurabilityBroken(getShoeDurability(idx))" class="text-[0.5rem] text-danger font-bold">破损</span>
                  </div>
                  <div v-if="getShoeSturdiness(idx)" class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">固 {{ formatSturdiness(getShoeSturdiness(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(getShoeSturdiness(idx))" :style="{ width: getSturdinessPercent(getShoeSturdiness(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isSturdinessDepleted(getShoeSturdiness(idx))" class="text-[0.5rem] text-danger font-bold">失固</span>
                  </div>
                </div>
                <Button
                  class="py-0 px-1.5"
                  :class="inventoryStore.equippedShoeIndex === idx ? '!bg-accent !text-bg' : ''"
                  @click.stop="handleToggleShoe(idx)"
                >
                  {{ inventoryStore.equippedShoeIndex === idx ? '卸下' : '装备' }}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted/40 text-center py-2">暂无鞋子</p>
      </div>

      <!-- 戒指 -->
      <div class="border border-accent/20 rounded-xs p-2">
        <p class="text-xs text-muted mb-1">戒指</p>
        <div v-if="inventoryStore.ownedRings.length > 0" class="flex flex-col space-y-1">
          <!-- 槽位 -->
          <div class="flex space-x-1 mb-1">
            <div class="flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center">
              <p class="text-[0.625rem] text-muted">槽位1</p>
              <p class="text-xs" :class="equippedRing1Name ? 'text-accent' : 'text-muted/40'">
                {{ equippedRing1Name ?? '空' }}
              </p>
              <p v-if="equippedRing1Durability" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
                <span>耐 {{ equippedRing1Durability.current }}/{{ equippedRing1Durability.max }}</span>
                <span class="h-1 w-10 overflow-hidden rounded-full bg-accent/10">
                  <span class="block h-full rounded-full" :class="getDurabilityColor(equippedRing1Durability.current, equippedRing1Durability.max)" :style="{ width: getDurabilityPercent(equippedRing1Durability) + '%' }"></span>
                </span>
              </p>
              <p v-if="equippedRing1Sturdiness" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
                <span>固 {{ equippedRing1Sturdiness.current }}/{{ equippedRing1Sturdiness.max }}</span>
                <span class="h-1 w-10 overflow-hidden rounded-full bg-accent/10">
                  <span class="block h-full rounded-full" :class="getSturdinessStateColor(equippedRing1Sturdiness)" :style="{ width: getSturdinessPercent(equippedRing1Sturdiness) + '%' }"></span>
                </span>
              </p>
            </div>
            <div class="flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center">
              <p class="text-[0.625rem] text-muted">槽位2</p>
              <p class="text-xs" :class="equippedRing2Name ? 'text-accent' : 'text-muted/40'">
                {{ equippedRing2Name ?? '空' }}
              </p>
              <p v-if="equippedRing2Durability" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
                <span>耐 {{ equippedRing2Durability.current }}/{{ equippedRing2Durability.max }}</span>
                <span class="h-1 w-10 overflow-hidden rounded-full bg-accent/10">
                  <span class="block h-full rounded-full" :class="getDurabilityColor(equippedRing2Durability.current, equippedRing2Durability.max)" :style="{ width: getDurabilityPercent(equippedRing2Durability) + '%' }"></span>
                </span>
              </p>
              <p v-if="equippedRing2Sturdiness" class="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] text-muted">
                <span>固 {{ equippedRing2Sturdiness.current }}/{{ equippedRing2Sturdiness.max }}</span>
                <span class="h-1 w-10 overflow-hidden rounded-full bg-accent/10">
                  <span class="block h-full rounded-full" :class="getSturdinessStateColor(equippedRing2Sturdiness)" :style="{ width: getSturdinessPercent(equippedRing2Sturdiness) + '%' }"></span>
                </span>
              </p>
            </div>
          </div>
          <!-- 拥有的戒指列表 -->
          <div class="max-h-40 overflow-y-auto flex flex-col space-y-1">
            <div
              v-for="(ring, idx) in inventoryStore.ownedRings"
              :key="idx"
              class="inventory-equipment-row flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5"
              :class="isRingEquipped(idx) ? 'border-accent/30' : 'border-accent/10'"
              @click="activeRingIdx = idx"
            >
              <div class="inventory-equipment-info flex min-w-0 flex-1 items-center gap-1.5">
                <ItemIcon :item="getItemById(ring.defId)" size="xs" :show-badge="false" />
                <div class="inventory-equipment-copy min-w-0 flex-1">
                <span class="flex items-center gap-1 min-w-0 text-xs" :class="isRingEquipped(idx) ? 'text-accent' : ''">
                  <Lock v-if="ring.locked" :size="11" class="shrink-0 text-accent/70" />
                  <span class="truncate">{{ getRingById(ring.defId)?.name ?? ring.defId }}</span>
                </span>
                <p class="text-[0.625rem] text-muted truncate">
                  {{ getRingById(ring.defId)?.description }}
                  <template v-if="formatForgeAffixSummary(ring.affixes)"> · {{ formatForgeAffixSummary(ring.affixes) }}</template>
                </p>
                </div>
              </div>
              <div class="inventory-equipment-actions flex items-center gap-1 shrink-0 ml-2">
                <div v-if="getRingDurability(idx)" class="inventory-equipment-durability flex flex-col gap-0.5">
                  <div class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">耐 {{ formatDurability(getRingDurability(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getDurabilityStateColor(getRingDurability(idx))" :style="{ width: getDurabilityPercent(getRingDurability(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isDurabilityBroken(getRingDurability(idx))" class="text-[0.5rem] text-danger font-bold">破损</span>
                  </div>
                  <div v-if="getRingSturdiness(idx)" class="flex items-center gap-1">
                    <span class="text-[0.5rem] text-muted w-12 text-right">固 {{ formatSturdiness(getRingSturdiness(idx)) }}</span>
                    <div class="w-10 h-1 bg-accent/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(getRingSturdiness(idx))" :style="{ width: getSturdinessPercent(getRingSturdiness(idx)) + '%' }"></div>
                    </div>
                    <span v-if="isSturdinessDepleted(getRingSturdiness(idx))" class="text-[0.5rem] text-danger font-bold">失固</span>
                  </div>
                </div>
                <div class="inventory-equipment-action-buttons flex space-x-1">
                <Button
                  class="py-0 px-1.5"
                  :class="
                    inventoryStore.equippedRingSlot1 === idx
                      ? '!bg-accent !text-bg'
                      : isRingBlockedForSlot(idx, 0)
                        ? 'opacity-30 cursor-not-allowed'
                        : ''
                  "
                  :disabled="isRingBlockedForSlot(idx, 0)"
                  @click.stop="handleToggleRingSlot(idx, 0)"
                >
                  槽1
                </Button>
                <Button
                  class="py-0 px-1.5"
                  :class="
                    inventoryStore.equippedRingSlot2 === idx
                      ? '!bg-accent !text-bg'
                      : isRingBlockedForSlot(idx, 1)
                        ? 'opacity-30 cursor-not-allowed'
                        : ''
                  "
                  :disabled="isRingBlockedForSlot(idx, 1)"
                  @click.stop="handleToggleRingSlot(idx, 1)"
                >
                  槽2
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted/40 text-center py-2">暂无戒指</p>
      </div>

      <!-- 饰品 -->
      <div class="border border-accent/20 rounded-xs p-2">
        <div class="mb-1 flex items-center justify-between gap-2">
          <p class="text-xs text-muted">护符 / 饰物</p>
          <span class="text-[0.625rem]" :class="isTrinketSlotUnlocked ? 'text-success' : 'text-muted/50'">
            {{ isTrinketSlotUnlocked ? '已解锁' : '战斗20级' }}
          </span>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-1 text-center mb-1">
          <p class="text-[0.625rem] text-muted">饰品栏</p>
          <p class="text-xs truncate" :class="isTrinketSlotUnlocked ? 'text-accent' : 'text-muted/40'">
            {{ isTrinketSlotUnlocked ? equippedTrinketName ?? '已解锁，选择饰物' : '战斗20级解锁' }}
          </p>
        </div>
        <div v-if="isTrinketSlotUnlocked && unlockedTrinketList.length > 0" class="max-h-40 overflow-y-auto flex flex-col space-y-1">
          <div
            v-for="trinket in unlockedTrinketList"
            :key="trinket.id"
            class="inventory-equipment-row flex items-center justify-between border rounded-xs px-2 py-1 mr-1 cursor-pointer hover:bg-accent/5"
            :class="trinket.id === inventoryStore.equippedTrinketId ? 'border-accent/30' : 'border-accent/10'"
            @click="handleToggleTrinket(trinket.id)"
          >
            <div class="inventory-equipment-info inventory-equipment-copy min-w-0 flex-1">
              <span class="text-xs truncate" :class="trinket.id === inventoryStore.equippedTrinketId ? 'text-accent' : ''">
                {{ trinket.name }}
              </span>
              <p class="text-[0.625rem] text-muted truncate">{{ formatEquipEffects(trinket.effects) }}</p>
              <p class="text-[0.625rem] text-muted/80 truncate">{{ trinket.sourceSummary }}</p>
            </div>
            <Button
              class="inventory-equipment-actions py-0 px-1.5 shrink-0 ml-2"
              :class="trinket.id === inventoryStore.equippedTrinketId ? '!bg-accent !text-bg' : ''"
              @click.stop="handleToggleTrinket(trinket.id)"
            >
              {{ trinket.id === inventoryStore.equippedTrinketId ? '卸下' : '装备' }}
            </Button>
          </div>
        </div>
        <p v-else-if="isTrinketSlotUnlocked" class="text-xs text-muted/40 text-center py-2">还没有解锁可装备的饰物</p>
        <p v-else class="text-xs text-muted/40 text-center py-2">战斗达到20级后开放饰品栏</p>
      </div>

      <!-- 套装效果 -->
      <div v-if="inventoryStore.equipmentSetCatalog.length > 0" class="desktop-adaptive-span-all border border-accent/20 rounded-xs p-2 mt-3">
        <p class="text-xs text-muted mb-1">套装效果</p>
        <div class="max-h-80 overflow-y-auto pr-1 space-y-1.5">
          <div
            v-for="set in inventoryStore.equipmentSetCatalog"
            :key="set.id"
            class="border rounded-xs p-2"
            :class="set.equippedCount > 0 ? 'border-accent/20 bg-accent/5' : 'border-accent/10'"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs text-accent truncate">{{ set.name }}</span>
              <span class="text-[0.625rem] text-muted whitespace-nowrap">拥有 {{ set.ownedCount }}/{{ set.totalPieces }} · 装备 {{ set.equippedCount }}/{{ set.totalPieces }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mb-1 leading-4">{{ set.description }}</p>
            <div class="flex flex-wrap gap-1 mb-1.5">
              <span
                v-for="piece in set.pieces"
                :key="piece.slot + ':' + piece.defId"
                class="border rounded-xs px-1.5 py-0.5 text-[0.625rem] leading-4"
                :class="
                  piece.equipped
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : piece.owned
                      ? 'border-success/30 text-success'
                      : 'border-accent/10 text-muted/50'
                "
              >
                {{ piece.slotLabel }}：{{ piece.name }}
              </span>
            </div>
            <div
              v-for="bonus in set.bonuses"
              :key="bonus.count"
              class="text-[0.625rem] leading-4"
              :class="bonus.active ? 'text-success' : 'text-muted/50'"
            >
              ({{ bonus.count }}件) {{ bonus.description }}
            </div>
          </div>
        </div>
      </div>
      </div>
    </template>

    <!-- 装备方案弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showPresetModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="closePresetModal"
      >
        <div class="game-panel relative flex max-h-[82vh] w-full max-w-md flex-col">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closePresetModal">
            <X :size="14" />
          </button>
          <p class="mb-3 pr-6 text-sm text-accent">装备方案</p>
          <div
            v-if="inventoryStore.equipmentPresets.length > 0"
            data-testid="inventory-equipment-preset-grid"
            class="mb-3 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 touch-pan-y"
          >
            <div
              v-for="preset in inventoryStore.equipmentPresets"
              :key="preset.id"
              class="relative flex min-w-0 flex-col border rounded-xs p-2.5"
              :class="isPresetActive(preset.id) ? 'border-accent/40' : 'border-accent/10'"
            >
              <div class="mb-2 flex min-h-8 items-start justify-between gap-1.5">
                <span class="min-w-0 truncate text-xs text-accent">{{ preset.name }}</span>
                <span v-if="isPresetActive(preset.id)" class="text-[0.625rem] text-success shrink-0 ml-1">使用中</span>
              </div>
              <div class="mt-auto grid grid-cols-2 gap-1.5">
                <Button
                  class="min-h-8 min-w-0 justify-center px-1.5 py-1 text-xs whitespace-nowrap"
                  :disabled="isPresetActive(preset.id)"
                  @click="handleApplyPreset(preset.id)"
                >
                  使用
                </Button>
                <Button
                  class="min-h-8 min-w-0 justify-center px-1.5 py-1 text-xs whitespace-nowrap"
                  @click="openPresetActions(preset.id)"
                >
                  操作
                </Button>
              </div>
            </div>
          </div>
          <div v-else class="mb-3 flex flex-col items-center justify-center py-6">
            <BookMarked :size="24" class="text-muted/30" />
            <p class="text-xs text-muted mt-1">暂无方案</p>
            <p class="text-[0.625rem] text-muted/60 mt-0.5">创建方案后可快速切换装备配置</p>
          </div>
          <Button
            class="w-full shrink-0 justify-center"
            :disabled="inventoryStore.equipmentPresets.length >= inventoryStore.MAX_EQUIPMENT_PRESETS"
            @click="handleCreatePreset"
          >
            新建方案
          </Button>
        </div>
        <Transition name="dialog-pop">
          <div
            v-if="actionPreset"
            data-testid="inventory-preset-actions-dialog"
            class="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
            @click.self="closePresetActions"
          >
            <div class="game-panel relative w-full max-w-xs p-3" @click.stop>
              <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closePresetActions">
                <X :size="14" />
              </button>
              <p class="mb-3 pr-6 text-sm text-accent">方案操作</p>
              <label class="mb-3 block">
                <span class="mb-1 block text-[0.625rem] text-muted">方案名称</span>
                <input
                  v-model="actionPresetNameDraft"
                  data-testid="inventory-preset-actions-name-input"
                  class="w-full rounded-xs border border-accent/30 bg-transparent px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                  @keyup.enter="handleSavePresetName(actionPreset.id)"
                />
              </label>
              <div class="grid gap-2">
                <Button
                  class="min-h-9 justify-center px-3 py-1.5 text-sm whitespace-nowrap"
                  :disabled="actionPresetNameDraft.trim().length === 0"
                  @click="handleSavePresetName(actionPreset.id)"
                >
                  保存名称
                </Button>
                <Button class="min-h-9 justify-center px-3 py-1.5 text-sm whitespace-nowrap" @click="handleSaveToPreset(actionPreset.id)">保存装备</Button>
                <Button
                  class="min-h-9 justify-center px-3 py-1.5 text-sm whitespace-nowrap text-danger"
                  :disabled="isPresetActive(actionPreset.id)"
                  @click="handleDeletePreset(actionPreset.id)"
                >
                  删除方案
                </Button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 临时背包物品详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showFilterModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showFilterModal = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showFilterModal = false">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2">物品筛选</p>
          <p class="text-[0.625rem] text-muted mb-2">选择要显示的分类或作物用途，不选则显示全部</p>
          <p class="text-xs text-muted mb-1">分类</p>
          <div class="grid grid-cols-3 gap-1.5 mb-3">
            <div
              v-for="cat in FILTER_CATEGORIES"
              :key="cat"
              class="border rounded-xs px-1.5 py-1 text-center text-xs cursor-pointer transition-colors"
              :class="tempFilter.has(cat) ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/20 text-muted hover:bg-accent/5'"
              @click="toggleCategory(cat)"
            >
              {{ CATEGORY_NAMES[cat] }}
            </div>
          </div>
          <p class="text-xs text-muted mb-1">作物用途</p>
          <div class="grid grid-cols-3 gap-1.5 mb-3">
            <div
              v-for="tag in CROP_USE_FILTER_TAGS"
              :key="tag"
              class="border rounded-xs px-1.5 py-1 text-center text-xs cursor-pointer transition-colors"
              :class="tempCropUseFilter.has(tag) ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/20 text-muted hover:bg-accent/5'"
              :title="getCropUseFilterHint(tag)"
              @click="toggleCropUseTag(tag)"
            >
              <span class="block">{{ CROP_USE_TAG_LABELS[tag] }}</span>
              <span class="block truncate text-[0.5625rem] opacity-70">{{ CROP_USE_TAG_FILTER_HINTS[tag] }}</span>
            </div>
          </div>
          <div class="flex space-x-1.5">
            <Button class="flex-1 justify-center" @click="handleClearFilter">全部显示</Button>
            <Button class="flex-1 justify-center !bg-accent !text-bg" @click="handleSaveFilter">保存</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 临时背包物品详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeTempItem"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeTempIdx = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeTempIdx = null">
            <X :size="14" />
          </button>
          <p
            class="text-sm mb-2"
            :class="{
              'text-quality-fine': activeTempItem.quality === 'fine',
              'text-quality-excellent': activeTempItem.quality === 'excellent',
              'text-quality-supreme': activeTempItem.quality === 'supreme',
              'text-accent': activeTempItem.quality === 'normal'
            }"
          >
            {{ activeTempItemDef?.name }}
            <span class="text-xs text-danger ml-1">（临时）</span>
          </p>
          <div v-if="activeTempItemDef" class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="activeTempItemDef" :quality="activeTempItem.quality" size="lg" :resolution="256" />
            <div class="min-w-0 flex-1 space-y-1">
              <ItemIconVariantPicker :item="activeTempItemDef" />
            </div>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeTempItemDef?.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ activeTempItem.quantity }}</span>
            </div>
            <div v-if="activeTempItem.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span
                class="text-xs"
                :class="{
                  'text-quality-fine': activeTempItem.quality === 'fine',
                  'text-quality-excellent': activeTempItem.quality === 'excellent',
                  'text-quality-supreme': activeTempItem.quality === 'supreme'
                }"
              >
                {{ QUALITY_NAMES[activeTempItem.quality] }}
              </span>
            </div>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :class="''"
              :icon="ArrowRight"
              :icon-size="12"
              :disabled="activeTempMovableQuantity <= 0"
              @click="handleMoveFromTemp"
            >
              {{ activeTempMoveButtonLabel }}
            </Button>
            <Button class="w-full justify-center text-danger border-danger/40" @click="handleDiscardTemp">丢弃</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 物品详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="activeItem" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="closeActiveItem">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="closeActiveItem">
            <X :size="14" />
          </button>

          <p
            class="text-sm mb-2"
            :class="{
              'text-quality-fine': activeItem.quality === 'fine',
              'text-quality-excellent': activeItem.quality === 'excellent',
              'text-quality-supreme': activeItem.quality === 'supreme',
              'text-accent': activeItem.quality === 'normal'
            }"
          >
            {{ activeItemDef?.name }}
          </p>

          <div v-if="activeItemDef" class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="activeItemDef" :quality="activeItem.quality" size="lg" :resolution="256" />
            <div class="min-w-0 flex-1 space-y-1">
              <ItemIconVariantPicker :item="activeItemDef" />
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeItemDef?.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ activeItem.quantity }}</span>
            </div>
            <div v-if="activeItem.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span
                class="text-xs"
                :class="{
                  'text-quality-fine': activeItem.quality === 'fine',
                  'text-quality-excellent': activeItem.quality === 'excellent',
                  'text-quality-supreme': activeItem.quality === 'supreme'
                }"
              >
                {{ QUALITY_NAMES[activeItem.quality] }}
              </span>
            </div>
            <div v-if="activeItemDef?.sellPrice" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeItemDef.sellPrice }}文</span>
            </div>
            <div v-if="activeSeedCrop" class="flex items-center justify-between gap-2 mt-0.5">
              <span class="text-xs text-muted shrink-0">适宜季节</span>
              <span class="text-xs text-accent text-right">{{ activeSeedSeasonLabel }}</span>
            </div>
            <div v-if="activeSeedCrop" class="flex items-center justify-between gap-2 mt-0.5">
              <span class="text-xs text-muted shrink-0">成熟天数</span>
              <span class="text-xs text-accent text-right">{{ activeSeedGrowthLabel }}</span>
            </div>
            <div v-if="activeSeedRegrowthLabel" class="flex items-center justify-between gap-2 mt-0.5">
              <span class="text-xs text-muted shrink-0">再收周期</span>
              <span class="text-xs text-accent text-right">{{ activeSeedRegrowthLabel }}</span>
            </div>
            <div v-if="activeItemRecoveryParts.length > 0" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">恢复</span>
              <span class="text-xs text-success">{{ activeItemRecoveryParts.join(' / ') }}</span>
            </div>
            <div v-if="activeItemBuff" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">增益</span>
              <span class="text-xs text-accent">{{ activeItemBuff.description }}</span>
            </div>
            <div v-if="activeItemElixirEffect" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">丹药效果</span>
              <span class="text-xs text-accent">{{ activeItemElixirEffect.description }}</span>
            </div>
            <div v-if="activeItemElixirEffect && activeElixirName" class="flex items-center justify-between gap-2 mt-0.5">
              <span class="text-xs text-muted shrink-0">今日丹药</span>
              <span class="text-xs text-water text-right">{{ activeElixirName }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">来源</span>
              <span class="text-xs text-muted">{{ getItemSource(activeItem.itemId) }}</span>
            </div>
          </div>

          <div v-if="activeCropUseProfile" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">作物用途</p>
            <div class="flex flex-wrap gap-1 mb-1">
              <span
                v-for="label in activeCropUseTagLabels"
                :key="label"
                class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent"
              >
                {{ label }}
              </span>
            </div>
            <div class="grid grid-cols-1 gap-y-0.5">
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs text-muted shrink-0">风味</span>
                <span class="text-xs text-right">{{ activeCropUseProfile.flavor.join('、') }}</span>
              </div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs text-muted shrink-0">药性</span>
                <span class="text-xs text-right">{{ CROP_USE_NATURE_LABELS[activeCropUseProfile.nature] }}</span>
              </div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs text-muted shrink-0">灵性</span>
                <span class="text-xs text-right">{{ CROP_USE_SPIRITUALITY_LABELS[activeCropUseProfile.spirituality] }}</span>
              </div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs text-muted shrink-0">消耗定位</span>
                <span class="text-xs text-right">{{ CROP_USE_RARITY_LABELS[activeCropUseProfile.rarityUse] }}</span>
              </div>
            </div>
            <p class="text-xs text-text leading-relaxed mt-1">{{ activeCropUseProfile.recommendedUses.join('、') }}</p>
            <p v-if="activeCropUseRecommendationText" class="text-xs text-accent/80 leading-relaxed mt-1">
              {{ activeCropUseRecommendationText }}
            </p>
          </div>

          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :icon="activeItem.locked ? LockOpen : Lock"
              :icon-size="12"
              @click="handleToggleActiveItemLock"
            >
              {{ activeItem.locked ? '解锁' : '锁定' }}
            </Button>
            <Button
              v-if="isEdible(activeItem.itemId)"
              class="w-full justify-center"
              :icon="Apple"
              :icon-size="12"
              :disabled="isEatBlocked(activeItem.itemId)"
              @click="handleEat(activeItem.itemId, activeItem.quality)"
            >
              食用
            </Button>
            <Button
              v-if="isUsable(activeItem.itemId)"
              class="w-full justify-center"
              :icon="Zap"
              :icon-size="12"
              :disabled="activeItem.locked || isUseBlocked(activeItem.itemId)"
              @click="handleUse(activeItem.itemId, activeItem.quality)"
            >
              {{ getUseButtonLabel(activeItem.itemId) }}
            </Button>
            <!-- 丢弃 -->
            <template v-if="!activeItem.locked">
              <div v-if="discardMode" class="flex items-center space-x-1">
                <input
                  v-model.number="discardQty"
                  type="number"
                  :min="1"
                  :max="activeItem.quantity"
                  class="flex-1 bg-bg border border-accent/20 rounded-xs px-1.5 py-0.5 text-xs text-text w-12 text-center"
                />
                <Button class="flex-1 justify-center !bg-danger !text-text" @click="confirmDiscard">确认丢弃</Button>
                <Button class="flex-1 justify-center" @click="cancelDiscard">取消</Button>
              </div>
              <Button
                v-else
                class="w-full justify-center text-danger border-danger/40"
                :icon="Trash2"
                :icon-size="12"
                @click="enterDiscardMode"
              >
                丢弃
              </Button>
            </template>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 武器详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeWeaponIdx !== null && activeWeaponDef"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeWeaponIdx = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeWeaponIdx = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2 flex items-center gap-1">
            <span class="truncate">{{ activeWeaponName }}</span>
            <span v-if="activeWeaponLocked" class="text-[0.625rem] text-accent/80 shrink-0">已锁定</span>
          </p>
          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="getItemById(activeWeaponDef.id)" size="lg" :resolution="256" :show-badge="false" />
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeWeaponDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">类型</span>
              <span class="text-xs">{{ WEAPON_TYPE_NAMES[activeWeaponDef.type] }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">攻击力</span>
              <span class="text-xs">{{ activeWeaponStats.attack }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">暴击率</span>
              <span class="text-xs">{{ Math.round(activeWeaponStats.critRate * 100) }}%</span>
            </div>
            <div v-if="activeWeaponAffixSummary" class="flex items-start justify-between gap-2 mt-0.5">
              <span class="text-xs text-muted shrink-0">词条</span>
              <span class="text-xs text-accent text-right">{{ activeWeaponAffixSummary }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeWeaponPrice }}文</span>
            </div>
            <div v-if="activeWeaponDurability" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">耐久</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getDurabilityColor(activeWeaponDurability.current, activeWeaponDurability.max)" :style="{ width: getDurabilityPercent(activeWeaponDurability) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeWeaponDurability.current }}/{{ activeWeaponDurability.max }}</span>
                <span v-if="isDurabilityBroken(activeWeaponDurability)" class="text-xs text-danger font-bold">破损</span>
              </div>
            </div>
            <div v-if="activeWeaponSturdiness" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">坚固</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(activeWeaponSturdiness)" :style="{ width: getSturdinessPercent(activeWeaponSturdiness) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeWeaponSturdiness.current }}/{{ activeWeaponSturdiness.max }}</span>
                <span v-if="isSturdinessDepleted(activeWeaponSturdiness)" class="text-xs text-danger font-bold">失固</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :icon="activeWeaponLocked ? LockOpen : Lock"
              :icon-size="12"
              @click="handleToggleWeaponLock"
            >
              {{ activeWeaponLocked ? '解锁装备' : '锁定装备' }}
            </Button>
            <Button v-if="activeWeaponIdx !== inventoryStore.equippedWeaponIndex" class="w-full justify-center" @click="handleEquipWeapon">
              装备
            </Button>
            <Button
              v-if="activeWeaponIdx !== inventoryStore.equippedWeaponIndex && inventoryStore.ownedWeapons.length > 1"
              class="w-full justify-center text-danger border-danger/40"
              :disabled="activeWeaponLocked"
              @click="handleSellWeapon"
            >
              {{ activeWeaponLocked ? '已锁定，不能卖出' : `卖出 · ${activeWeaponPrice}文` }}
            </Button>
            <p v-if="activeWeaponIdx === inventoryStore.equippedWeaponIndex" class="text-[0.625rem] text-muted text-center">
              当前装备中，请先切换其他武器再卖出
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 戒指详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeRingIdx !== null && activeRingDef"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeRingIdx = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeRingIdx = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2 flex items-center gap-1">
            <span class="truncate">{{ activeRingDef.name }}</span>
            <span v-if="activeRingLocked" class="text-[0.625rem] text-accent/80 shrink-0">已锁定</span>
          </p>
          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="getItemById(activeRingDef.id)" size="lg" :resolution="256" :show-badge="false" />
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeRingDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div v-for="(eff, effIdx) in activeRingEffects" :key="`${eff.type}:${effIdx}`" class="flex items-center justify-between mt-0.5 first:mt-0">
              <span class="text-xs text-muted">{{ RING_EFFECT_NAMES[eff.type] }}</span>
              <span class="text-xs text-success">+{{ formatEffectValue(eff) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeRingDef.sellPrice }}文</span>
            </div>
            <div v-if="activeRingDurability" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">耐久</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getDurabilityColor(activeRingDurability.current, activeRingDurability.max)" :style="{ width: getDurabilityPercent(activeRingDurability) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeRingDurability.current }}/{{ activeRingDurability.max }}</span>
                <span v-if="isDurabilityBroken(activeRingDurability)" class="text-xs text-danger font-bold">破损</span>
              </div>
            </div>
            <div v-if="activeRingSturdiness" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">坚固</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(activeRingSturdiness)" :style="{ width: getSturdinessPercent(activeRingSturdiness) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeRingSturdiness.current }}/{{ activeRingSturdiness.max }}</span>
                <span v-if="isSturdinessDepleted(activeRingSturdiness)" class="text-xs text-danger font-bold">失固</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :icon="activeRingLocked ? LockOpen : Lock"
              :icon-size="12"
              @click="handleToggleRingLock"
            >
              {{ activeRingLocked ? '解锁装备' : '锁定装备' }}
            </Button>
            <div class="flex space-x-1.5">
              <Button
                class="flex-1 justify-center"
                :class="activeRingIdx !== null && isRingBlockedForSlot(activeRingIdx, 0) ? 'opacity-30 cursor-not-allowed' : ''"
                :disabled="activeRingIdx !== null && isRingBlockedForSlot(activeRingIdx, 0)"
                @click="handleEquipRingFromPopup(0)"
              >
                {{ inventoryStore.equippedRingSlot1 === activeRingIdx ? '卸下槽1' : '装备槽1' }}
              </Button>
              <Button
                class="flex-1 justify-center"
                :class="activeRingIdx !== null && isRingBlockedForSlot(activeRingIdx, 1) ? 'opacity-30 cursor-not-allowed' : ''"
                :disabled="activeRingIdx !== null && isRingBlockedForSlot(activeRingIdx, 1)"
                @click="handleEquipRingFromPopup(1)"
              >
                {{ inventoryStore.equippedRingSlot2 === activeRingIdx ? '卸下槽2' : '装备槽2' }}
              </Button>
            </div>
            <Button class="w-full justify-center text-danger border-danger/40" :disabled="activeRingLocked" @click="handleSellRing">
              {{ activeRingLocked ? '已锁定，不能卖出' : `卖出 · ${activeRingDef.sellPrice}文` }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 帽子详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeHatIdx !== null && activeHatDef"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeHatIdx = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeHatIdx = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2 flex items-center gap-1">
            <span class="truncate">{{ activeHatDef.name }}</span>
            <span v-if="activeHatLocked" class="text-[0.625rem] text-accent/80 shrink-0">已锁定</span>
          </p>
          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="getItemById(activeHatDef.id)" size="lg" :resolution="256" :show-badge="false" />
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeHatDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div v-for="(eff, effIdx) in activeHatEffects" :key="`${eff.type}:${effIdx}`" class="flex items-center justify-between mt-0.5 first:mt-0">
              <span class="text-xs text-muted">{{ RING_EFFECT_NAMES[eff.type] }}</span>
              <span class="text-xs text-success">+{{ formatEffectValue(eff) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeHatDef.sellPrice }}文</span>
            </div>
            <div v-if="activeHatDurability" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">耐久</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getDurabilityColor(activeHatDurability.current, activeHatDurability.max)" :style="{ width: getDurabilityPercent(activeHatDurability) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeHatDurability.current }}/{{ activeHatDurability.max }}</span>
                <span v-if="isDurabilityBroken(activeHatDurability)" class="text-xs text-danger font-bold">破损</span>
              </div>
            </div>
            <div v-if="activeHatSturdiness" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">坚固</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(activeHatSturdiness)" :style="{ width: getSturdinessPercent(activeHatSturdiness) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeHatSturdiness.current }}/{{ activeHatSturdiness.max }}</span>
                <span v-if="isSturdinessDepleted(activeHatSturdiness)" class="text-xs text-danger font-bold">失固</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :icon="activeHatLocked ? LockOpen : Lock"
              :icon-size="12"
              @click="handleToggleHatLock"
            >
              {{ activeHatLocked ? '解锁装备' : '锁定装备' }}
            </Button>
            <Button class="w-full justify-center" @click="handleToggleHatFromPopup">
              {{ inventoryStore.equippedHatIndex === activeHatIdx ? '卸下' : '装备' }}
            </Button>
            <Button class="w-full justify-center text-danger border-danger/40" :disabled="activeHatLocked" @click="handleSellHat">
              {{ activeHatLocked ? '已锁定，不能卖出' : `卖出 · ${activeHatDef.sellPrice}文` }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 鞋子详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeShoeIdx !== null && activeShoeDef"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeShoeIdx = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeShoeIdx = null">
            <X :size="14" />
          </button>
          <p class="text-sm text-accent mb-2 flex items-center gap-1">
            <span class="truncate">{{ activeShoeDef.name }}</span>
            <span v-if="activeShoeLocked" class="text-[0.625rem] text-accent/80 shrink-0">已锁定</span>
          </p>
          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="getItemById(activeShoeDef.id)" size="lg" :resolution="256" :show-badge="false" />
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeShoeDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div v-for="(eff, effIdx) in activeShoeEffects" :key="`${eff.type}:${effIdx}`" class="flex items-center justify-between mt-0.5 first:mt-0">
              <span class="text-xs text-muted">{{ RING_EFFECT_NAMES[eff.type] }}</span>
              <span class="text-xs text-success">+{{ formatEffectValue(eff) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeShoeDef.sellPrice }}文</span>
            </div>
            <div v-if="activeShoeDurability" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">耐久</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getDurabilityColor(activeShoeDurability.current, activeShoeDurability.max)" :style="{ width: getDurabilityPercent(activeShoeDurability) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeShoeDurability.current }}/{{ activeShoeDurability.max }}</span>
                <span v-if="isDurabilityBroken(activeShoeDurability)" class="text-xs text-danger font-bold">破损</span>
              </div>
            </div>
            <div v-if="activeShoeSturdiness" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">坚固</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="getSturdinessStateColor(activeShoeSturdiness)" :style="{ width: getSturdinessPercent(activeShoeSturdiness) + '%' }"></div>
                </div>
                <span class="text-xs">{{ activeShoeSturdiness.current }}/{{ activeShoeSturdiness.max }}</span>
                <span v-if="isSturdinessDepleted(activeShoeSturdiness)" class="text-xs text-danger font-bold">失固</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Button
              class="w-full justify-center"
              :icon="activeShoeLocked ? LockOpen : Lock"
              :icon-size="12"
              @click="handleToggleShoeLock"
            >
              {{ activeShoeLocked ? '解锁装备' : '锁定装备' }}
            </Button>
            <Button class="w-full justify-center" @click="handleToggleShoeFromPopup">
              {{ inventoryStore.equippedShoeIndex === activeShoeIdx ? '卸下' : '装备' }}
            </Button>
            <Button class="w-full justify-center text-danger border-danger/40" :disabled="activeShoeLocked" @click="handleSellShoe">
              {{ activeShoeLocked ? '已锁定，不能卖出' : `卖出 · ${activeShoeDef.sellPrice}文` }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { Apple, Archive, ArrowDown01, ArrowRight, BookMarked, Filter, Lock, LockOpen, Package, Trash2, X, Zap } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import ItemCard from '@/components/game/ItemCard.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import ItemIconVariantPicker from '@/components/game/ItemIconVariantPicker.vue'
  import { SEASON_NAMES } from '@/data/calendarLabels'
  import { getVisibleInventoryItemKey, mergeVisibleInventoryItems, useInventoryStore, type VisibleInventoryItemStack } from '@/stores/useInventoryStore'
  import { useSettingsStore } from '@/stores/useSettingsStore'
  import { getCropBySeedId } from '@/data/crops'
  import { getItemById, getItemSource } from '@/data/items'
  import { CROP_USE_NATURE_LABELS, CROP_USE_RARITY_LABELS, CROP_USE_SPIRITUALITY_LABELS, CROP_USE_TAG_FILTER_HINTS, CROP_USE_TAG_LABELS, getCropUseProfile, getCropUseTagLabels, type CropUseTag } from '@/data/cropUseProfiles'
  import { getAlchemyRecipeByOutputItemId } from '@/data/processing'
  import { getRecipeById } from '@/data/recipes'
  import { getWeaponById, getWeaponDisplayName, getWeaponSellPrice, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import { formatForgeAffixSummary, getForgeAffixEffectValue, getForgeAffixEquipmentEffects } from '@/data/forgeAffixes'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import { getTrinketById } from '@/data/trinkets'
  import { QUALITY_NAMES } from '@/data/qualityLabels'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { scrollByViewport, useKeyboardShortcutTabActions } from '@/composables/useKeyboardShortcutContextActions'
  import type { PanelKey } from '@/composables/useNavigation'
  import { applyInventoryRecoveryItem, getItemRecoveryDisplayParts, getItemRecoveryPlan, hasItemRecovery } from '@/utils/inventoryUseRules'
  import type { ItemLinkageUseTag } from '@/data/itemLinkage'
  import type { Quality, RingEffectType, ItemCategory, InventoryItem } from '@/types'

  const MOON_RABBIT_TEA_MEDICINE_ITEM_IDS = new Set([
    'green_tea_drink',
    'guest_green_tea',
    'chrysanthemum_tea',
    'processed_osmanthus_tea',
    'ginseng_tea',
    'herbal_tea_blend',
    'fine_herbal_tea_blend',
    'spirit_herbal_tea_blend',
    'celestial_herbal_tea_blend',
    'tavern_herbal_brew'
  ])

  const inventoryStore = useInventoryStore()

  type CookingStore = ReturnType<(typeof import('@/stores/useCookingStore'))['useCookingStore']>
  type MiningStore = ReturnType<(typeof import('@/stores/useMiningStore'))['useMiningStore']>
  type PlayerStore = ReturnType<(typeof import('@/stores/usePlayerStore'))['usePlayerStore']>
  type SkillStore = ReturnType<(typeof import('@/stores/useSkillStore'))['useSkillStore']>
  type HiddenNpcStore = ReturnType<(typeof import('@/stores/useHiddenNpcStore'))['useHiddenNpcStore']>

  let cookingStorePromise: Promise<CookingStore> | null = null
  let miningStorePromise: Promise<MiningStore> | null = null
  let playerStorePromise: Promise<PlayerStore> | null = null
  let skillStorePromise: Promise<SkillStore> | null = null
  let hiddenNpcStorePromise: Promise<HiddenNpcStore> | null = null

  const getCookingStore = () => {
    cookingStorePromise ??= import('@/stores/useCookingStore').then(module => module.useCookingStore())
    return cookingStorePromise
  }

  const getMiningStore = () => {
    miningStorePromise ??= import('@/stores/useMiningStore').then(module => module.useMiningStore())
    return miningStorePromise
  }

  const getPlayerStore = () => {
    playerStorePromise ??= import('@/stores/usePlayerStore').then(module => module.usePlayerStore())
    return playerStorePromise
  }

  const getSkillStore = () => {
    skillStorePromise ??= import('@/stores/useSkillStore').then(module => module.useSkillStore())
    return skillStorePromise
  }

  const getHiddenNpcStore = () => {
    hiddenNpcStorePromise ??= import('@/stores/useHiddenNpcStore').then(module => module.useHiddenNpcStore())
    return hiddenNpcStorePromise
  }

  type EquipmentDurabilityType = 'weapon' | 'ring' | 'hat' | 'shoe'
  type EquipmentDurabilityState = { current: number; max: number }
  type EquipmentSturdinessState = { current: number; max: number }

  /** 获取耐久条颜色 */
  const getDurabilityColor = (current: number, max: number): string => {
    if (max <= 0) return 'bg-gray-400'
    const ratio = current / max
    if (ratio > 0.6) return 'bg-green-500'
    if (ratio > 0.2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getDurabilityPercent = (durability: EquipmentDurabilityState | null): number => {
    if (!durability || durability.max <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((durability.current / durability.max) * 100)))
  }

  const getDurabilityStateColor = (durability: EquipmentDurabilityState | null): string =>
    durability ? getDurabilityColor(durability.current, durability.max) : getDurabilityColor(0, 1)

  const formatDurability = (durability: EquipmentDurabilityState | null): string =>
    durability ? `${durability.current}/${durability.max}` : ''

  const isDurabilityBroken = (durability: EquipmentDurabilityState | null): boolean =>
    !!durability && durability.current <= 0

  const getSturdinessPercent = (sturdiness: EquipmentSturdinessState | null): number => {
    if (!sturdiness || sturdiness.max <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((sturdiness.current / sturdiness.max) * 100)))
  }

  const getSturdinessStateColor = (sturdiness: EquipmentSturdinessState | null): string =>
    sturdiness ? getDurabilityColor(sturdiness.current, sturdiness.max) : getDurabilityColor(0, 1)

  const formatSturdiness = (sturdiness: EquipmentSturdinessState | null): string =>
    sturdiness ? `${sturdiness.current}/${sturdiness.max}` : ''

  const isSturdinessDepleted = (sturdiness: EquipmentSturdinessState | null): boolean =>
    !!sturdiness && sturdiness.current <= 0

  const getEquipmentDurability = (type: EquipmentDurabilityType, idx: number | null): EquipmentDurabilityState | null => {
    if (idx === null || idx < 0) return null
    return inventoryStore.getOwnedEquipmentDurability(type, idx)
  }

  const getEquipmentSturdiness = (type: EquipmentDurabilityType, idx: number | null): EquipmentSturdinessState | null => {
    if (idx === null || idx < 0) return null
    return inventoryStore.getOwnedEquipmentSturdiness(type, idx)
  }

  /** 获取武器耐久 */
  const getWeaponDurability = (idx: number | null): EquipmentDurabilityState | null => getEquipmentDurability('weapon', idx)
  const getWeaponSturdiness = (idx: number | null): EquipmentSturdinessState | null => getEquipmentSturdiness('weapon', idx)

  /** 获取戒指耐久 */
  const getRingDurability = (idx: number | null): EquipmentDurabilityState | null => getEquipmentDurability('ring', idx)
  const getRingSturdiness = (idx: number | null): EquipmentSturdinessState | null => getEquipmentSturdiness('ring', idx)

  /** 获取帽子耐久 */
  const getHatDurability = (idx: number | null): EquipmentDurabilityState | null => getEquipmentDurability('hat', idx)
  const getHatSturdiness = (idx: number | null): EquipmentSturdinessState | null => getEquipmentSturdiness('hat', idx)

  /** 获取鞋子耐久 */
  const getShoeDurability = (idx: number | null): EquipmentDurabilityState | null => getEquipmentDurability('shoe', idx)
  const getShoeSturdiness = (idx: number | null): EquipmentSturdinessState | null => getEquipmentSturdiness('shoe', idx)
  const settingsStore = useSettingsStore()

  // === 页签 ===

  const tab = ref<'items' | 'tools' | 'temp'>('items')
  const inventoryTabs = ['items', 'tools', 'temp'] as const

  watch(tab, value => {
    if (value === 'tools') void refreshTrinketSlotUnlock()
  }, { immediate: true })

  // === 物品筛选 ===

  const FILTER_CATEGORIES: ItemCategory[] = [
    'seed',
    'crop',
    'fruit',
    'fish',
    'animal_product',
    'processed',
    'elixir',
    'food',
    'ore',
    'gem',
    'material',
    'machine',
    'sprinkler',
    'fertilizer',
    'bait',
    'tackle',
    'bomb',
    'sapling',
    'gift',
    'fossil',
    'artifact',
    'misc'
  ]

  const CATEGORY_NAMES: Partial<Record<ItemCategory, string>> = {
    seed: '种子',
    crop: '作物',
    fruit: '水果',
    fish: '鱼类',
    animal_product: '畜产',
    processed: '加工品',
    elixir: '丹药',
    food: '料理',
    ore: '矿石',
    gem: '宝石',
    material: '材料',
    machine: '机器',
    sprinkler: '洒水器',
    fertilizer: '肥料',
    bait: '鱼饵',
    tackle: '钓具',
    bomb: '炸弹',
    sapling: '树苗',
    gift: '礼物',
    fossil: '化石',
    artifact: '文物',
    misc: '杂货'
  }

  const showFilterModal = ref(false)
  const tempFilter = ref<Set<ItemCategory>>(new Set())
  const tempCropUseFilter = ref<Set<CropUseTag>>(new Set())

  const CROP_USE_FILTER_TAGS = Object.keys(CROP_USE_TAG_LABELS) as CropUseTag[]
  const getCropUseFilterHint = (tag: CropUseTag): string => `${CROP_USE_TAG_LABELS[tag]}：${CROP_USE_TAG_FILTER_HINTS[tag]}`
  const CROP_USE_RECOMMENDATION_PRIORITY: CropUseTag[] = ['food', 'alchemy', 'pet_feed', 'animal_feed', 'order', 'gift', 'festival', 'online_cost', 'oil', 'flour', 'wine', 'pickle', 'medicine']
  const MAX_RENDERED_EMPTY_INVENTORY_SLOTS = 45
  const INVENTORY_ITEM_ROW_HEIGHT = 70
  const INVENTORY_ROW_BUFFER = 3

  interface CropUseInventoryRecommendation {
    itemId: string
    quality: Quality
    name: string
    quantity: number
    text: string
  }

  type ActiveInventoryItemKey = Pick<VisibleInventoryItemStack, 'itemId' | 'quality'>

  const isFilterActive = computed(() => settingsStore.inventoryFilter.length > 0 || settingsStore.inventoryCropUseFilter.length > 0)

  const getVisibleInventoryKey = (item: ActiveInventoryItemKey): string => getVisibleInventoryItemKey(item)

  const visibleInventoryItems = computed(() => inventoryStore.visibleItems)

  const isItemAllowedByFilters = (
    item: InventoryItem,
    allowedCategories: Set<ItemCategory>,
    allowedCropUseTags: Set<CropUseTag>,
  ): boolean => {
    const def = getItemById(item.itemId)
    if (!def) return false
    const categoryMatched = allowedCategories.size === 0 || allowedCategories.has(def.category)
    if (!categoryMatched) return false
    if (allowedCropUseTags.size === 0) return true
    if (def.category !== 'crop') return false
    const profile = getCropUseProfile(def.id)
    return !!profile && profile.tags.some(tag => allowedCropUseTags.has(tag))
  }

  const filteredItems = computed(() => {
    if (!isFilterActive.value) return visibleInventoryItems.value
    const allowedCategories = new Set(settingsStore.inventoryFilter)
    const allowedCropUseTags = new Set(settingsStore.inventoryCropUseFilter)
    return mergeVisibleInventoryItems(inventoryStore.items.filter(item => isItemAllowedByFilters(item, allowedCategories, allowedCropUseTags)))
  })

  const emptyInventorySlotCount = computed(() => {
    if (isFilterActive.value) return 0
    return Math.min(MAX_RENDERED_EMPTY_INVENTORY_SLOTS, Math.max(0, inventoryStore.capacity - filteredItems.value.length))
  })

  const inventoryItemsViewportRef = ref<HTMLElement | null>(null)
  const inventoryItemsScrollTop = ref(0)
  const inventoryItemsViewportHeight = ref(360)
  const inventoryItemsColumnCount = ref(3)
  let inventoryItemsScrollRaf = 0

  const getInventoryGridColumnCount = () => {
    if (typeof window === 'undefined') return inventoryItemsColumnCount.value
    const grid = inventoryItemsViewportRef.value?.querySelector<HTMLElement>('.inventory-items-virtual-grid')
    const templateColumns = grid ? window.getComputedStyle(grid).gridTemplateColumns : ''
    const columnCount = templateColumns.split(' ').filter(Boolean).length
    if (columnCount > 0) return columnCount
    return window.matchMedia('(min-width: 768px)').matches ? 5 : 3
  }

  const inventoryVirtualCellCount = computed(() => filteredItems.value.length + emptyInventorySlotCount.value)
  const inventoryVirtualRowCount = computed(() => Math.ceil(inventoryVirtualCellCount.value / inventoryItemsColumnCount.value))
  const inventoryVisibleRowRange = computed(() => {
    const start = Math.max(0, Math.floor(inventoryItemsScrollTop.value / INVENTORY_ITEM_ROW_HEIGHT) - INVENTORY_ROW_BUFFER)
    const end = Math.min(
      inventoryVirtualRowCount.value,
      Math.ceil((inventoryItemsScrollTop.value + inventoryItemsViewportHeight.value) / INVENTORY_ITEM_ROW_HEIGHT) + INVENTORY_ROW_BUFFER
    )
    return { start, end }
  })

  const inventoryVisibleStartCell = computed(() => inventoryVisibleRowRange.value.start * inventoryItemsColumnCount.value)
  const inventoryVisibleEndCell = computed(() => Math.min(inventoryVirtualCellCount.value, inventoryVisibleRowRange.value.end * inventoryItemsColumnCount.value))
  const virtualFilteredItems = computed(() =>
    filteredItems.value.slice(inventoryVisibleStartCell.value, Math.min(inventoryVisibleEndCell.value, filteredItems.value.length))
  )
  const virtualEmptyInventorySlotStart = computed(() => Math.max(0, inventoryVisibleStartCell.value - filteredItems.value.length))
  const virtualEmptyInventorySlots = computed(() => {
    const visibleEmptyCount = Math.max(0, inventoryVisibleEndCell.value - Math.max(inventoryVisibleStartCell.value, filteredItems.value.length))
    return Array.from({ length: visibleEmptyCount }, (_, index) => virtualEmptyInventorySlotStart.value + index + 1)
  })
  const inventoryTopPad = computed(() => inventoryVisibleRowRange.value.start * INVENTORY_ITEM_ROW_HEIGHT)
  const inventoryBottomPad = computed(() => Math.max(0, (inventoryVirtualRowCount.value - inventoryVisibleRowRange.value.end) * INVENTORY_ITEM_ROW_HEIGHT))

  const syncInventoryViewportMetrics = () => {
    const element = inventoryItemsViewportRef.value
    if (element) {
      inventoryItemsViewportHeight.value = Math.max(160, element.clientHeight || inventoryItemsViewportHeight.value)
      inventoryItemsScrollTop.value = element.scrollTop
    }
    inventoryItemsColumnCount.value = getInventoryGridColumnCount()
  }

  const resetInventoryVirtualScroll = () => {
    inventoryItemsScrollTop.value = 0
    if (inventoryItemsViewportRef.value) inventoryItemsViewportRef.value.scrollTop = 0
    syncInventoryViewportMetrics()
  }

  const onInventoryItemsScroll = (event: Event) => {
    if (inventoryItemsScrollRaf) return
    const target = event.target as HTMLElement
    inventoryItemsScrollRaf = window.requestAnimationFrame(() => {
      inventoryItemsScrollTop.value = target.scrollTop
      inventoryItemsScrollRaf = 0
    })
  }

  onMounted(() => {
    syncInventoryViewportMetrics()
    window.addEventListener('resize', syncInventoryViewportMetrics)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', syncInventoryViewportMetrics)
    if (inventoryItemsScrollRaf) window.cancelAnimationFrame(inventoryItemsScrollRaf)
  })

  const scrollInventoryItemsByViewport = (direction: -1 | 1) => {
    const element = inventoryItemsViewportRef.value
    if (tab.value !== 'items' || !element) {
      scrollByViewport(direction)
      return
    }
    element.scrollBy({
      top: Math.max(160, element.clientHeight * 0.85) * direction,
      behavior: 'smooth'
    })
  }

  watch(
    () => [
      tab.value,
      settingsStore.inventoryFilter.join('|'),
      settingsStore.inventoryCropUseFilter.join('|'),
      filteredItems.value.length,
    ],
    () => {
      resetInventoryVirtualScroll()
    },
    { flush: 'post' }
  )

  const buildCropUseRecommendationText = (tags: CropUseTag[]): string => {
    if (tags.includes('food') && tags.includes('alchemy')) return '推荐：料理 / 炼丹双路径作物，先按今日目标决定灶台或丹炉消耗。'
    if (tags.includes('food')) return '推荐：灶台料理食材，可优先转成剧情料理或订单备餐。'
    if (tags.includes('alchemy') || tags.includes('medicine')) return '推荐：丹炉药材，可留作主材 / 辅材和短效经营丹。'
    if (tags.includes('pet_feed')) return '推荐：宠物特别喂食或高阶点心材料，适合灵宠反馈线。'
    if (tags.includes('animal_feed')) return '推荐：牧场补料，可作为动物饲料储备。'
    if (tags.includes('order')) return '推荐：订单交付储备，适合告示板或特殊订单。'
    if (tags.includes('gift')) return '推荐：村民赠礼或关系话题材料。'
    if (tags.includes('festival')) return '推荐：节会供品 / 宴席备菜，适合节前留存。'
    if (tags.includes('online_cost')) return '推荐：公共仓、公共订单或联机消耗储备。'
    return `推荐：${tags.map(tag => CROP_USE_TAG_LABELS[tag]).join('、')}用途储备。`
  }

  const cropUseRecommendations = computed<CropUseInventoryRecommendation[]>(() => {
    const selectedTags = settingsStore.inventoryCropUseFilter.length > 0
      ? settingsStore.inventoryCropUseFilter
      : CROP_USE_RECOMMENDATION_PRIORITY
    const selectedTagSet = new Set(selectedTags)

    return visibleInventoryItems.value
      .map(item => {
        const def = getItemById(item.itemId)
        if (def?.category !== 'crop') return null
        const profile = getCropUseProfile(def.id)
        if (!profile) return null
        const matchedTags = CROP_USE_RECOMMENDATION_PRIORITY.filter(tag => selectedTagSet.has(tag) && profile.tags.includes(tag))
        if (matchedTags.length === 0) return null
        return {
          itemId: item.itemId,
          quality: item.quality,
          name: def.name,
          quantity: item.quantity,
          text: buildCropUseRecommendationText(matchedTags)
        }
      })
      .filter((entry): entry is CropUseInventoryRecommendation => !!entry)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
  })

  const openInventoryItem = (itemId: string, quality?: Quality) => {
    const item = visibleInventoryItems.value.find(entry => entry.itemId === itemId && (quality === undefined || entry.quality === quality))
    if (item) openVisibleInventoryItem(item)
  }

  const handleInventoryUsageTagClick = async (tag: ItemLinkageUseTag) => {
    if (!tag.panelKey) return
    const { navigateToPanel } = await import('@/composables/useNavigation')
    navigateToPanel(tag.panelKey as PanelKey)
  }

  const openFilterModal = () => {
    tempFilter.value = new Set(settingsStore.inventoryFilter)
    tempCropUseFilter.value = new Set(settingsStore.inventoryCropUseFilter)
    showFilterModal.value = true
  }

  const toggleCategory = (cat: ItemCategory) => {
    if (tempFilter.value.has(cat)) {
      tempFilter.value.delete(cat)
    } else {
      tempFilter.value.add(cat)
    }
  }

  const toggleCropUseTag = (tag: CropUseTag) => {
    if (tempCropUseFilter.value.has(tag)) {
      tempCropUseFilter.value.delete(tag)
    } else {
      tempCropUseFilter.value.add(tag)
    }
  }

  const handleSaveFilter = () => {
    settingsStore.inventoryFilter = [...tempFilter.value]
    settingsStore.inventoryCropUseFilter = [...tempCropUseFilter.value]
    showFilterModal.value = false
  }

  const handleClearFilter = () => {
    tempFilter.value = new Set()
    tempCropUseFilter.value = new Set()
  }

  // === 装备方案 ===

  const showPresetModal = ref(false)
  const openPresetActionId = ref<string | null>(null)
  const actionPresetNameDraft = ref('')

  const activePresetName = computed(() => inventoryStore.activeEquipmentPresetName)
  const isPresetActive = (id: string) => inventoryStore.isEquipmentPresetActive(id)

  const actionPreset = computed(() => {
    if (!openPresetActionId.value) return null
    return inventoryStore.equipmentPresets.find(p => p.id === openPresetActionId.value) ?? null
  })

  const closePresetModal = () => {
    showPresetModal.value = false
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
  }

  const openPresetActions = (id: string) => {
    const preset = inventoryStore.equipmentPresets.find(p => p.id === id)
    openPresetActionId.value = id
    actionPresetNameDraft.value = preset?.name ?? ''
  }

  const closePresetActions = () => {
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
  }

  const handleCreatePreset = () => {
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
    inventoryStore.createEquipmentPreset('方案' + (inventoryStore.equipmentPresets.length + 1))
  }

  const handleSavePresetName = (id: string) => {
    const nextName = actionPresetNameDraft.value.trim()
    if (!nextName) return
    inventoryStore.renameEquipmentPreset(id, nextName)
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
  }

  const handleSaveToPreset = (id: string) => {
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
    inventoryStore.saveCurrentToPreset(id)
    addLog('已保存当前装备到方案。')
  }

  const handleApplyPreset = (id: string) => {
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
    const result = inventoryStore.applyEquipmentPreset(id)
    addLog(result.message)
  }

  const handleDeletePreset = (id: string) => {
    openPresetActionId.value = null
    actionPresetNameDraft.value = ''
    inventoryStore.deleteEquipmentPreset(id)
  }

  // === 饰品辅助 ===

  const trinketSlotUnlockedBySkill = ref(false)
  async function refreshTrinketSlotUnlock() {
    const skillStore = await getSkillStore()
    trinketSlotUnlockedBySkill.value = !!skillStore.masteryRewards.find(entry => entry.id === 'trinket_slot')?.unlocked
  }
  const isTrinketSlotUnlocked = computed(() => trinketSlotUnlockedBySkill.value || inventoryStore.unlockedTrinkets.length > 0)
  const equippedTrinketName = computed(() => inventoryStore.equippedTrinket?.name ?? null)
  const unlockedTrinketList = computed(() => inventoryStore.unlockedTrinkets)

  const handleToggleTrinket = (defId: string) => {
    if (inventoryStore.equippedTrinketId === defId) {
      const def = inventoryStore.equippedTrinket
      if (inventoryStore.unequipTrinket()) addLog(`卸下了${def?.name ?? '饰物'}。`)
      return
    }
    if (inventoryStore.equipTrinket(defId)) {
      const def = getTrinketById(defId)
      addLog(`装备了${def?.name ?? '饰物'}。`)
    }
  }

  // === 戒指辅助 ===

  const equippedRing1Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot1
    const ring = inventoryStore.ownedRings[idx]
    if (!ring) return null
    return getRingById(ring.defId)?.name ?? null
  })

  const equippedRing1Durability = computed(() => getRingDurability(inventoryStore.equippedRingSlot1))
  const equippedRing1Sturdiness = computed(() => getRingSturdiness(inventoryStore.equippedRingSlot1))

  const equippedRing2Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot2
    const ring = inventoryStore.ownedRings[idx]
    if (!ring) return null
    return getRingById(ring.defId)?.name ?? null
  })

  const equippedRing2Durability = computed(() => getRingDurability(inventoryStore.equippedRingSlot2))
  const equippedRing2Sturdiness = computed(() => getRingSturdiness(inventoryStore.equippedRingSlot2))

  const isRingEquipped = (idx: number): boolean => {
    return inventoryStore.equippedRingSlot1 === idx || inventoryStore.equippedRingSlot2 === idx
  }

  /** 检查戒指是否因同defId冲突被另一槽位阻止 */
  const isRingBlockedForSlot = (ringIdx: number, slot: 0 | 1): boolean => {
    const otherSlotIdx = slot === 0 ? inventoryStore.equippedRingSlot2 : inventoryStore.equippedRingSlot1
    if (otherSlotIdx < 0 || otherSlotIdx === ringIdx) return false
    if (otherSlotIdx >= inventoryStore.ownedRings.length) return false
    return inventoryStore.ownedRings[ringIdx]?.defId === inventoryStore.ownedRings[otherSlotIdx]?.defId
  }

  /** 切换戒指槽位（点击高亮按钮 → 卸下；点击非高亮按钮 → 装备/换位） */
  const handleToggleRingSlot = (ringIdx: number, slot: 0 | 1) => {
    const slotRef = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2
    if (slotRef === ringIdx) {
      inventoryStore.unequipRing(slot)
    } else {
      if (isRingBlockedForSlot(ringIdx, slot)) return
      inventoryStore.equipRing(ringIdx, slot)
    }
  }

  // === 戒指效果显示 ===

  const RING_EFFECT_NAMES: Record<RingEffectType, string> = {
    attack_bonus: '攻击力',
    crit_rate_bonus: '暴击率',
    defense_bonus: '防御',
    vampiric: '吸血',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗',
    mining_stamina: '采矿体力',
    farming_stamina: '农作体力',
    fishing_stamina: '钓鱼体力',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '作物生长',
    fish_quality_bonus: '鱼类品质',
    fishing_calm: '钓鱼稳定',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '掉落率',
    exp_bonus: '经验加成',
    treasure_find: '宝箱概率',
    ore_bonus: '矿石加成',
    luck: '幸运',
    travel_speed: '旅行加速',
    journey_stamina_reduction: '远征减耗',
    journey_scout_bonus: '远征侦察',
    journey_carry_bonus: '远征负重',
    journey_hazard_resist: '远征压险',
    journey_event_bonus: '远征事件',
    camp_recovery_bonus: '扎营恢复',
    boss_pressure_resist: '首领抗压',
    resource_find_bonus: '资源回收',
    durability_bonus: '耐久上限',
    durability_consumption_reduction: '耐久减耗'
  }

  const PERCENTAGE_EFFECTS: Set<RingEffectType> = new Set([
    'crit_rate_bonus',
    'vampiric',
    'stamina_reduction',
    'mining_stamina',
    'farming_stamina',
    'fishing_stamina',
    'crop_quality_bonus',
    'crop_growth_bonus',
    'fish_quality_bonus',
    'fishing_calm',
    'sell_price_bonus',
    'shop_discount',
    'gift_friendship',
    'monster_drop_bonus',
    'exp_bonus',
    'treasure_find',
    'ore_bonus',
    'luck',
    'travel_speed',
    'journey_stamina_reduction',
    'journey_event_bonus',
    'boss_pressure_resist',
    'resource_find_bonus'
  ])

  const formatEffectValue = (eff: { type: RingEffectType; value: number }): string => {
    if (PERCENTAGE_EFFECTS.has(eff.type)) return `${Math.round(eff.value * 100)}%`
    return `${eff.value}`
  }

  const formatEquipEffects = (effects: { type: RingEffectType; value: number }[]): string => {
    return effects.map(eff => `${RING_EFFECT_NAMES[eff.type]}${eff.value > 0 ? '+' : ''}${formatEffectValue(eff)}`).join(' ')
  }

  // === 武器弹窗 ===

  const activeWeaponIdx = ref<number | null>(null)

  const activeWeaponDef = computed(() => {
    if (activeWeaponIdx.value === null) return null
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value]
    if (!weapon) return null
    return getWeaponById(weapon.defId) ?? null
  })

  const activeWeaponName = computed(() => {
    if (activeWeaponIdx.value === null) return ''
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value]
    if (!weapon) return ''
    return getWeaponDisplayName(weapon.defId, weapon.enchantmentId, weapon.affixes)
  })

  const activeWeaponAffixSummary = computed(() => {
    if (activeWeaponIdx.value === null) return null
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value]
    if (!weapon) return null
    return formatForgeAffixSummary(weapon.affixes) || null
  })

  const activeWeaponStats = computed(() => {
    if (activeWeaponIdx.value === null) return { attack: 0, critRate: 0 }
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value]
    const def = weapon ? getWeaponById(weapon.defId) : null
    if (!weapon || !def) return { attack: 0, critRate: 0 }
    return {
      attack: def.attack + getForgeAffixEffectValue(weapon.affixes, 'attack_bonus'),
      critRate: def.critRate + getForgeAffixEffectValue(weapon.affixes, 'crit_rate_bonus')
    }
  })

  const activeWeaponPrice = computed(() => {
    if (activeWeaponIdx.value === null) return 0
    const weapon = inventoryStore.ownedWeapons[activeWeaponIdx.value]
    if (!weapon) return 0
    return getWeaponSellPrice(weapon.defId, weapon.enchantmentId, weapon.affixes)
  })

  const equippedWeaponName = computed(() => {
    const weapon = inventoryStore.ownedWeapons[inventoryStore.equippedWeaponIndex]
    if (!weapon) return null
    return getWeaponDisplayName(weapon.defId, weapon.enchantmentId, weapon.affixes)
  })

  const equippedWeaponDurability = computed(() => getWeaponDurability(inventoryStore.equippedWeaponIndex))
  const equippedWeaponSturdiness = computed(() => getWeaponSturdiness(inventoryStore.equippedWeaponIndex))

  const activeWeaponLocked = computed(() => {
    if (activeWeaponIdx.value === null) return false
    return !!inventoryStore.ownedWeapons[activeWeaponIdx.value]?.locked
  })

  const activeWeaponDurability = computed(() => getWeaponDurability(activeWeaponIdx.value))
  const activeWeaponSturdiness = computed(() => getWeaponSturdiness(activeWeaponIdx.value))

  const handleToggleWeaponLock = () => {
    if (activeWeaponIdx.value === null) return
    inventoryStore.toggleEquipmentLock('weapon', activeWeaponIdx.value)
  }

  const handleEquipWeapon = () => {
    if (activeWeaponIdx.value === null) return
    inventoryStore.equipWeapon(activeWeaponIdx.value)
    activeWeaponIdx.value = null
  }

  const handleSellWeapon = () => {
    if (activeWeaponIdx.value === null) return
    const result = inventoryStore.sellWeapon(activeWeaponIdx.value)
    addLog(result.message)
    if (result.success) activeWeaponIdx.value = null
  }

  // === 戒指弹窗 ===

  const activeRingIdx = ref<number | null>(null)

  const activeRingDef = computed(() => {
    if (activeRingIdx.value === null) return null
    const ring = inventoryStore.ownedRings[activeRingIdx.value]
    if (!ring) return null
    return getRingById(ring.defId) ?? null
  })

  const activeRingEffects = computed(() => {
    if (activeRingIdx.value === null || !activeRingDef.value) return []
    const ring = inventoryStore.ownedRings[activeRingIdx.value]
    return [...activeRingDef.value.effects, ...getForgeAffixEquipmentEffects(ring?.affixes)]
  })

  const activeRingLocked = computed(() => {
    if (activeRingIdx.value === null) return false
    return !!inventoryStore.ownedRings[activeRingIdx.value]?.locked
  })

  const activeRingDurability = computed(() => getRingDurability(activeRingIdx.value))
  const activeRingSturdiness = computed(() => getRingSturdiness(activeRingIdx.value))

  const handleToggleRingLock = () => {
    if (activeRingIdx.value === null) return
    inventoryStore.toggleEquipmentLock('ring', activeRingIdx.value)
  }

  const handleEquipRingFromPopup = (slot: 0 | 1) => {
    if (activeRingIdx.value === null) return
    if (isRingBlockedForSlot(activeRingIdx.value, slot)) return
    const slotRef = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2
    if (slotRef === activeRingIdx.value) {
      inventoryStore.unequipRing(slot)
    } else {
      inventoryStore.equipRing(activeRingIdx.value, slot)
    }
  }

  const handleSellRing = () => {
    if (activeRingIdx.value === null) return
    const result = inventoryStore.sellRing(activeRingIdx.value)
    addLog(result.message)
    if (result.success) activeRingIdx.value = null
  }

  // === 帽子辅助 ===

  const equippedHatName = computed(() => {
    const idx = inventoryStore.equippedHatIndex
    const hat = inventoryStore.ownedHats[idx]
    if (!hat) return null
    return getHatById(hat.defId)?.name ?? null
  })

  const equippedHatDurability = computed(() => getHatDurability(inventoryStore.equippedHatIndex))
  const equippedHatSturdiness = computed(() => getHatSturdiness(inventoryStore.equippedHatIndex))

  const handleToggleHat = (idx: number) => {
    if (inventoryStore.equippedHatIndex === idx) {
      inventoryStore.unequipHat()
    } else {
      inventoryStore.equipHat(idx)
    }
  }

  // === 帽子弹窗 ===

  const activeHatIdx = ref<number | null>(null)

  const activeHatDef = computed(() => {
    if (activeHatIdx.value === null) return null
    const hat = inventoryStore.ownedHats[activeHatIdx.value]
    if (!hat) return null
    return getHatById(hat.defId) ?? null
  })

  const activeHatEffects = computed(() => {
    if (activeHatIdx.value === null || !activeHatDef.value) return []
    const hat = inventoryStore.ownedHats[activeHatIdx.value]
    return [...activeHatDef.value.effects, ...getForgeAffixEquipmentEffects(hat?.affixes)]
  })

  const activeHatLocked = computed(() => {
    if (activeHatIdx.value === null) return false
    return !!inventoryStore.ownedHats[activeHatIdx.value]?.locked
  })

  const activeHatDurability = computed(() => getHatDurability(activeHatIdx.value))
  const activeHatSturdiness = computed(() => getHatSturdiness(activeHatIdx.value))

  const handleToggleHatLock = () => {
    if (activeHatIdx.value === null) return
    inventoryStore.toggleEquipmentLock('hat', activeHatIdx.value)
  }

  const handleToggleHatFromPopup = () => {
    if (activeHatIdx.value === null) return
    handleToggleHat(activeHatIdx.value)
  }

  const handleSellHat = () => {
    if (activeHatIdx.value === null) return
    const result = inventoryStore.sellHat(activeHatIdx.value)
    addLog(result.message)
    if (result.success) activeHatIdx.value = null
  }

  // === 鞋子辅助 ===

  const equippedShoeName = computed(() => {
    const idx = inventoryStore.equippedShoeIndex
    const shoe = inventoryStore.ownedShoes[idx]
    if (!shoe) return null
    return getShoeById(shoe.defId)?.name ?? null
  })

  const equippedShoeDurability = computed(() => getShoeDurability(inventoryStore.equippedShoeIndex))
  const equippedShoeSturdiness = computed(() => getShoeSturdiness(inventoryStore.equippedShoeIndex))

  const handleToggleShoe = (idx: number) => {
    if (inventoryStore.equippedShoeIndex === idx) {
      inventoryStore.unequipShoe()
    } else {
      inventoryStore.equipShoe(idx)
    }
  }

  // === 鞋子弹窗 ===

  const activeShoeIdx = ref<number | null>(null)

  const activeShoeDef = computed(() => {
    if (activeShoeIdx.value === null) return null
    const shoe = inventoryStore.ownedShoes[activeShoeIdx.value]
    if (!shoe) return null
    return getShoeById(shoe.defId) ?? null
  })

  const activeShoeEffects = computed(() => {
    if (activeShoeIdx.value === null || !activeShoeDef.value) return []
    const shoe = inventoryStore.ownedShoes[activeShoeIdx.value]
    return [...activeShoeDef.value.effects, ...getForgeAffixEquipmentEffects(shoe?.affixes)]
  })

  const activeShoeLocked = computed(() => {
    if (activeShoeIdx.value === null) return false
    return !!inventoryStore.ownedShoes[activeShoeIdx.value]?.locked
  })

  const activeShoeDurability = computed(() => getShoeDurability(activeShoeIdx.value))
  const activeShoeSturdiness = computed(() => getShoeSturdiness(activeShoeIdx.value))

  const handleToggleShoeLock = () => {
    if (activeShoeIdx.value === null) return
    inventoryStore.toggleEquipmentLock('shoe', activeShoeIdx.value)
  }

  const handleToggleShoeFromPopup = () => {
    if (activeShoeIdx.value === null) return
    handleToggleShoe(activeShoeIdx.value)
  }

  const handleSellShoe = () => {
    if (activeShoeIdx.value === null) return
    const result = inventoryStore.sellShoe(activeShoeIdx.value)
    addLog(result.message)
    if (result.success) activeShoeIdx.value = null
  }

  // === 临时背包 ===

  const activeTempIdx = ref<number | null>(null)

  useKeyboardShortcutTabActions({
    tabs: inventoryTabs,
    current: tab,
    hasBlockingModal: () => (
      showFilterModal.value ||
      showPresetModal.value ||
      openPresetActionId.value !== null ||
      activeWeaponIdx.value !== null ||
      activeRingIdx.value !== null ||
      activeHatIdx.value !== null ||
      activeShoeIdx.value !== null ||
      activeTempIdx.value !== null
    ),
    onPageUp: () => scrollInventoryItemsByViewport(-1),
    onPageDown: () => scrollInventoryItemsByViewport(1)
  })

  const activeTempItem = computed(() => {
    if (activeTempIdx.value === null) return null
    return inventoryStore.tempItems[activeTempIdx.value] ?? null
  })

  const activeTempItemDef = computed(() => {
    if (!activeTempItem.value) return null
    return getItemById(activeTempItem.value.itemId) ?? null
  })

  const totalTempItemQuantity = computed(() => inventoryStore.tempItems.reduce((sum, item) => sum + item.quantity, 0))
  const movableTempItemCount = computed(() => inventoryStore.getMovableTempItemCount())
  const canMoveAnyTempItem = computed(() => movableTempItemCount.value > 0)
  const activeTempMovableQuantity = computed(() => {
    if (activeTempIdx.value === null) return 0
    return inventoryStore.getMovableTempItemCount(activeTempIdx.value)
  })

  const getTempMoveButtonLabel = (movableQuantity: number, totalQuantity: number, fullLabel: string) => {
    if (movableQuantity <= 0) return '背包已满'
    if (movableQuantity < totalQuantity) return `取回可合并部分（${movableQuantity}/${totalQuantity}）`
    return fullLabel
  }

  const tempMoveAllLabel = computed(() =>
    getTempMoveButtonLabel(movableTempItemCount.value, totalTempItemQuantity.value, '全部取回')
  )
  const activeTempMoveButtonLabel = computed(() =>
    getTempMoveButtonLabel(activeTempMovableQuantity.value, activeTempItem.value?.quantity ?? 0, '放入背包')
  )

  const handleMoveFromTemp = () => {
    if (activeTempIdx.value === null) return
    const item = activeTempItem.value
    if (!item) return
    const movableQuantity = activeTempMovableQuantity.value
    if (movableQuantity <= 0) {
      addLog('背包已满，无法取回该物品。')
      return
    }
    const beforeQuantity = item.quantity
    const success = inventoryStore.moveFromTemp(activeTempIdx.value)
    const movedQuantity = Math.min(movableQuantity, beforeQuantity)
    if (success) {
      addLog(`已将${movedQuantity}件物品放入背包。`)
      activeTempIdx.value = null
    } else {
      addLog(`已取回可合并的${movedQuantity}件，剩余物品仍在临时背包中。`)
    }
  }

  const handleMoveAllFromTemp = () => {
    if (movableTempItemCount.value <= 0) {
      addLog('背包已满，无法从临时背包取回物品。')
      return
    }
    const moved = inventoryStore.moveAllFromTemp()
    if (moved > 0) {
      addLog(`已取回${moved}件临时背包物品。`)
    } else {
      addLog('背包已满，无法从临时背包取回物品。')
    }
    if (inventoryStore.tempItems.length > 0) {
      addLog('部分物品因空间不足仍在临时背包中。')
    }
  }

  const handleDiscardTemp = () => {
    if (activeTempIdx.value === null) return
    const item = inventoryStore.tempItems[activeTempIdx.value]
    const name = getItemById(item?.itemId ?? '')?.name ?? ''
    inventoryStore.discardTempItem(activeTempIdx.value)
    addLog(`丢弃了${name}。`)
    activeTempIdx.value = null
  }

  // === 物品弹窗 ===

  const discardMode = ref(false)
  const discardQty = ref(1)

  const resetActiveItemInteractionState = () => {
    discardMode.value = false
    discardQty.value = 1
  }

  const activeItemKey = ref<ActiveInventoryItemKey | null>(null)

  const openVisibleInventoryItem = (item: ActiveInventoryItemKey) => {
    activeItemKey.value = { itemId: item.itemId, quality: item.quality }
    resetActiveItemInteractionState()
  }

  const closeActiveItem = () => {
    activeItemKey.value = null
    resetActiveItemInteractionState()
  }

  const hasVisibleInventoryItem = (itemId: string, quality: Quality): boolean =>
    visibleInventoryItems.value.some(item => item.itemId === itemId && item.quality === quality)

  const isVisibleInventoryItemLocked = (itemId: string, quality: Quality): boolean =>
    visibleInventoryItems.value.find(item => item.itemId === itemId && item.quality === quality)?.locked ?? false

  const activeItem = computed(() => {
    if (!activeItemKey.value) return null
    return visibleInventoryItems.value.find(item => getVisibleInventoryKey(item) === getVisibleInventoryKey(activeItemKey.value!)) ?? null
  })

  watch(activeItem, item => {
    if (activeItemKey.value && !item) {
      closeActiveItem()
    }
  })

  const handleToggleActiveItemLock = () => {
    if (!activeItem.value) return
    inventoryStore.toggleLock(activeItem.value.itemId, activeItem.value.quality)
    resetActiveItemInteractionState()
  }

  const activeItemDef = computed(() => {
    if (!activeItem.value) return null
    return getItemById(activeItem.value.itemId) ?? null
  })

  const activeSeedCrop = computed(() => {
    if (activeItemDef.value?.category !== 'seed' || !activeItem.value) return null
    return getCropBySeedId(activeItem.value.itemId) ?? null
  })

  const activeSeedSeasonLabel = computed(() => {
    const crop = activeSeedCrop.value
    if (!crop) return ''
    return `${crop.season.map(season => SEASON_NAMES[season] ?? season).join('/')}季`
  })

  const activeSeedGrowthLabel = computed(() => {
    const crop = activeSeedCrop.value
    return crop ? `${crop.growthDays}天` : ''
  })

  const activeSeedRegrowthLabel = computed(() => {
    const crop = activeSeedCrop.value
    if (!crop?.regrowth || !crop.regrowthDays) return ''
    return crop.maxHarvests ? `每${crop.regrowthDays}天，可收${crop.maxHarvests}次` : `每${crop.regrowthDays}天再收`
  })

  const activeCropUseProfile = computed(() => {
    if (activeItemDef.value?.category !== 'crop') return null
    return getCropUseProfile(activeItemDef.value.id) ?? null
  })

  const activeCropUseTagLabels = computed(() => {
    if (!activeCropUseProfile.value) return []
    return getCropUseTagLabels(activeCropUseProfile.value)
  })

  const activeCropUseRecommendationText = computed(() => {
    if (!activeCropUseProfile.value) return ''
    const matchedTags = CROP_USE_RECOMMENDATION_PRIORITY.filter(tag => activeCropUseProfile.value?.tags.includes(tag))
    return matchedTags.length > 0 ? buildCropUseRecommendationText(matchedTags) : ''
  })

  const getFoodBuff = (itemId: string) => {
    if (!itemId.startsWith('food_')) return null
    const recipe = getRecipeById(itemId.slice(5))
    return recipe?.effect.buff ?? null
  }

  const canEatForFoodBuff = (itemId: string): boolean => !!getFoodBuff(itemId)

  /** 烹饪品的buff描述 */
  const activeItemBuff = computed(() => {
    if (!activeItem.value) return null
    return getFoodBuff(activeItem.value.itemId)
  })

  const activeItemElixirRecipe = computed(() => {
    if (!activeItem.value) return null
    return getAlchemyRecipeByOutputItemId(activeItem.value.itemId) ?? null
  })

  const activeItemElixirEffect = computed(() => activeItemElixirRecipe.value?.alchemy?.effect ?? null)

  const activeItemRecoveryParts = computed(() => getItemRecoveryDisplayParts(activeItemDef.value))

  const activeElixirName = ref('')
  const recoveryRuntime = ref({
    loaded: false,
    stamina: 0,
    maxStamina: 0,
    hp: 0,
    maxHp: 0,
    alchemistBonus: 1,
    moonRabbitMedicineActive: false
  })

  const refreshActiveElixirSnapshot = async () => {
    if (!activeItemElixirEffect.value) {
      activeElixirName.value = ''
      return
    }
    const cookingStore = await getCookingStore()
    activeElixirName.value = cookingStore.activeElixir?.name ?? ''
  }

  const refreshRecoveryRuntime = async () => {
    if (!activeItem.value) {
      recoveryRuntime.value = { ...recoveryRuntime.value, loaded: false }
      activeElixirName.value = ''
      return
    }

    const [playerStore, skillStore, hiddenNpcStore] = await Promise.all([
      getPlayerStore(),
      getSkillStore(),
      getHiddenNpcStore()
    ])
    recoveryRuntime.value = {
      loaded: true,
      stamina: playerStore.stamina,
      maxStamina: playerStore.maxStamina,
      hp: playerStore.hp,
      maxHp: playerStore.getMaxHp(),
      alchemistBonus: skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0,
      moonRabbitMedicineActive: hiddenNpcStore.isAbilityActive('yue_tu_2')
    }
    await refreshActiveElixirSnapshot()
  }

  watch(activeItem, () => {
    void refreshRecoveryRuntime()
  }, { immediate: true })

  const getRecoveryVitals = () => ({
    stamina: recoveryRuntime.value.stamina,
    maxStamina: recoveryRuntime.value.maxStamina,
    hp: recoveryRuntime.value.hp,
    maxHp: recoveryRuntime.value.maxHp
  })

  const getInventoryRecoveryMultiplier = (itemId?: string) => {
    const alchemistBonus = recoveryRuntime.value.alchemistBonus
    const moonRabbitBonus =
      itemId && MOON_RABBIT_TEA_MEDICINE_ITEM_IDS.has(itemId) && recoveryRuntime.value.moonRabbitMedicineActive ? 1.5 : 1.0
    return alchemistBonus * moonRabbitBonus
  }

  const getEatRecoveryPlan = (itemId: string) =>
    getItemRecoveryPlan(getItemById(itemId), getRecoveryVitals(), getInventoryRecoveryMultiplier(itemId))

  const isEdible = (itemId: string): boolean => {
    const def = getItemById(itemId)
    return hasItemRecovery(def)
  }

  const isEatBlocked = (itemId: string): boolean => {
    if (!recoveryRuntime.value.loaded) return false
    const plan = getEatRecoveryPlan(itemId)
    return plan.hasRecovery && !plan.canUse && !canEatForFoodBuff(itemId)
  }

  const handleEat = async (itemId: string, quality: Quality) => {
    const def = getItemById(itemId)
    if (!def || !hasItemRecovery(def)) return
    const playerStore = await getPlayerStore()
    await refreshRecoveryRuntime()
    const plan = getEatRecoveryPlan(itemId)
    if (!plan.canUse && !canEatForFoodBuff(itemId)) {
      addLog(plan.blockedMessage)
      return
    }

    // 烹饪品走 cookingStore.eat()，以正确应用buff、厨房加成等
    if (itemId.startsWith('food_')) {
      const recipeId = itemId.slice(5) // 去掉 'food_' 前缀
      const cookingStore = await getCookingStore()
      const result = cookingStore.eat(recipeId, quality)
      if (result.success) {
        addLog(result.message)
      } else {
        addLog(result.message)
      }
      // 物品消耗完则关闭弹窗
      if (!hasVisibleInventoryItem(itemId, quality)) {
        closeActiveItem()
      }
      void refreshRecoveryRuntime()
      return
    }

    const result = applyInventoryRecoveryItem({
      def,
      vitals: getRecoveryVitals(),
      multiplier: getInventoryRecoveryMultiplier(itemId),
      removeItem: () => inventoryStore.removeItemForEating(itemId, 1, quality),
      restoreStamina: amount => playerStore.restoreStamina(amount),
      restoreHealth: amount => playerStore.restoreHealth(amount)
    })
    addLog(result.message)
    // 物品消耗完则关闭弹窗
    if (!hasVisibleInventoryItem(itemId, quality)) {
      closeActiveItem()
    }
    void refreshRecoveryRuntime()
  }

  /** 可使用的特殊物品 */
  const USABLE_ITEMS = new Set(['rain_totem', 'stamina_fruit'])
  const GUILD_GROWTH_ITEM_IDS = new Set(['guild_badge', 'life_talisman', 'lucky_coin', 'defense_charm'])

  const isUsable = (itemId: string): boolean => {
    return USABLE_ITEMS.has(itemId) || GUILD_GROWTH_ITEM_IDS.has(itemId) || !!getAlchemyRecipeByOutputItemId(itemId)
  }

  const isAlchemyElixirItem = (itemId: string): boolean => !!getAlchemyRecipeByOutputItemId(itemId)

  const isUseBlocked = (itemId: string): boolean => isAlchemyElixirItem(itemId) && !!activeElixirName.value

  const getUseButtonLabel = (itemId: string): string => (isUseBlocked(itemId) ? '今日已服丹' : '使用')

  const handleUse = async (itemId: string, quality: Quality) => {
    if (isVisibleInventoryItemLocked(itemId, quality)) {
      addLog('物品已锁定，先解锁才能使用。')
      return
    }
    const alchemyRecipe = getAlchemyRecipeByOutputItemId(itemId)
    if (alchemyRecipe?.alchemy) {
      const cookingStore = await getCookingStore()
      const result = cookingStore.useElixir(itemId, quality)
      addLog(result.message)
      activeElixirName.value = cookingStore.activeElixir?.name ?? ''
      if (result.success && !hasVisibleInventoryItem(itemId, quality)) {
        closeActiveItem()
      }
      return
    }

    if (GUILD_GROWTH_ITEM_IDS.has(itemId)) {
      const miningStore = await getMiningStore()
      const result = miningStore.useGuildGrowthItem(itemId, quality)
      addLog(result.message)
      if (result.success && !hasVisibleInventoryItem(itemId, quality)) {
        closeActiveItem()
      }
      return
    }

    if (itemId === 'rain_totem') {
      if (!inventoryStore.removeUnlockedItem(itemId, 1, quality)) return
      const { useGameStore } = await import('@/stores/useGameStore')
      useGameStore().setTomorrowWeather('rainy')
      addLog('你使用了雨图腾，明天将会下雨。')
    }
    if (itemId === 'stamina_fruit') {
      const playerStore = await getPlayerStore()
      if (playerStore.staminaCapLevel >= 4) {
        addLog('体力上限已达到最高，无法再使用仙桃。')
        return
      }
      if (!inventoryStore.removeUnlockedItem(itemId, 1, quality)) return
      playerStore.upgradeMaxStamina()
      addLog(`食用了仙桃，体力上限永久提升至${playerStore.maxStamina}！`)
    }
    // 物品消耗完则关闭弹窗
    if (!hasVisibleInventoryItem(itemId, quality)) {
      closeActiveItem()
    }
  }

  // === 丢弃物品 ===

  watch(activeItemKey, () => {
    resetActiveItemInteractionState()
  })

  /** 进入丢弃模式 */
  const enterDiscardMode = () => {
    discardMode.value = true
    discardQty.value = 1
  }

  /** 确认丢弃 */
  const confirmDiscard = () => {
    if (!activeItem.value) return
    const { itemId, quality } = activeItem.value
    const name = activeItemDef.value?.name ?? ''
    const requestedQty = Math.floor(Number(discardQty.value))
    if (!Number.isFinite(requestedQty) || requestedQty < 1) {
      showFloat('请输入有效的正整数数量。', 'danger')
      return
    }
    const qty = Math.min(requestedQty, activeItem.value.quantity)
    if (!inventoryStore.removeUnlockedItem(itemId, qty, quality)) return
    addLog(`丢弃了${name}×${qty}。`)
    discardMode.value = false
    // 物品消耗完则关闭弹窗
    if (!hasVisibleInventoryItem(itemId, quality)) {
      closeActiveItem()
    }
  }

  /** 取消丢弃 */
  const cancelDiscard = () => {
    discardMode.value = false
  }
</script>

<style scoped>
  .inventory-items-viewport {
    max-height: clamp(10rem, calc(100vh - 15rem), 32rem);
    min-height: 10rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 0.125rem;
  }

  .inventory-items-virtual-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
    align-items: stretch;
  }

  .inventory-items-virtual-grid :deep(.item-card),
  .inventory-empty-slot {
    height: 64px;
    min-height: 64px;
  }

  .inventory-empty-slot {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .inventory-items-virtual-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  .inventory-equipment-row {
    min-width: 0;
    max-width: 100%;
    gap: 0.5rem;
  }

  .inventory-equipment-layout,
  .inventory-equipment-layout > * {
    min-width: 0;
    max-width: 100%;
  }

  .inventory-equipment-info,
  .inventory-equipment-copy,
  .inventory-equipment-actions {
    min-width: 0;
  }

  .inventory-equipment-copy {
    overflow: hidden;
  }

  .inventory-equipment-actions {
    max-width: min(48%, 9rem);
  }

  .inventory-equipment-durability,
  .inventory-equipment-action-buttons {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  @media (max-width: 420px) {
    .inventory-equipment-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .inventory-equipment-info {
      flex: 1 1 10rem;
    }

    .inventory-equipment-actions {
      flex-shrink: 1;
      margin-left: auto;
      max-width: 100%;
    }

    .inventory-equipment-durability {
      row-gap: 0.125rem;
    }

    .inventory-equipment-action-buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: 3.25rem;
    }

    .inventory-equipment-action-buttons :deep(.btn) {
      min-width: 0;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
  }
</style>
