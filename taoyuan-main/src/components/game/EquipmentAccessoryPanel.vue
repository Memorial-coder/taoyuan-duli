<template>
  <section class="accessory-panel" data-testid="equipment-accessory-panel">
    <div class="accessory-panel__header">
      <div class="min-w-0">
        <p class="accessory-panel__title">
          <Sparkles :size="15" />
          配件调校
        </p>
        <p class="accessory-panel__subtitle">九槽生效，三件成套；升品产物固定 1 级，已投入调校材料会返还。</p>
      </div>
      <div class="accessory-panel__pace">
        <span>20级目标</span>
        <strong>{{ annualPace.totalAccessoryMaterial }}</strong>
        <span>材料 / {{ annualPace.days }}天</span>
      </div>
    </div>

    <div class="accessory-panel__tabs" data-testid="equipment-accessory-tabs">
      <Button
        class="justify-center"
        :class="{ '!bg-accent !text-bg': activeMode === 'equip' }"
        :icon="ShieldCheck"
        :icon-size="13"
        data-testid="equipment-accessory-tab-equip"
        @click="activeMode = 'equip'"
      >
        装配
      </Button>
      <Button
        class="justify-center"
        :class="{ '!bg-accent !text-bg': activeMode === 'craft' }"
        :icon="Hammer"
        :icon-size="13"
        data-testid="equipment-accessory-tab-craft"
        @click="activeMode = 'craft'"
      >
        打造
      </Button>
      <Button
        class="justify-center"
        :class="{ '!bg-accent !text-bg': activeMode === 'fusion' }"
        :icon="Gem"
        :icon-size="13"
        data-testid="equipment-accessory-tab-fusion"
        @click="activeMode = 'fusion'"
      >
        合成
      </Button>
    </div>

    <div v-if="activeMode === 'equip'" class="accessory-layout accessory-layout--equip">
      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>槽位</span>
          <span>{{ accessoryStore.equippedAccessories.length }}/9</span>
        </div>
        <div class="accessory-family-list">
          <div v-for="family in familyRows" :key="family.id" class="accessory-family">
            <div class="accessory-family__head">
              <component :is="family.icon" :size="14" />
              <span>{{ family.label }}</span>
              <span>{{ family.setSummary.active ? setLabel(family.setSummary) : `${family.setSummary.equippedCount}/3` }}</span>
            </div>
            <div class="accessory-slot-grid">
              <button
                v-for="slot in family.slots"
                :key="slot.id"
                class="accessory-slot"
                :class="{ 'accessory-slot--empty': !slot.accessory, 'accessory-slot--selected': slot.accessory?.instanceId === selectedInstanceId }"
                :data-testid="`equipment-accessory-slot-${slot.id}`"
                @click="slot.accessory ? selectAccessory(slot.accessory.instanceId) : selectFirstByDef(slot.id)"
              >
                <span class="accessory-slot__icon" :class="slot.accessory ? qualityClass(slot.accessory.quality) : ''">
                  <img v-if="accessoryIconUrl(slot.def.id)" :src="accessoryIconUrl(slot.def.id)" :alt="slot.def.shortName" loading="lazy" decoding="async" />
                  <span v-else>{{ slot.def.shortName.slice(0, 1) }}</span>
                </span>
                <span class="accessory-slot__copy">
                  <span>{{ slot.def.shortName }}</span>
                  <small v-if="slot.accessory">{{ tierLabel(slot.accessory.tier) }} {{ qualityLabel(slot.accessory.quality) }} Lv.{{ slot.accessory.level }}</small>
                  <small v-else>未装配</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>配件库</span>
          <span>{{ accessoryStore.ownedAccessories.length }}件</span>
        </div>
        <div v-if="accessoryStore.sortedOwnedAccessories.length === 0" class="accessory-empty">
          <PackageOpen :size="26" />
          <span>还没有配件，可在打造或矿洞中获得。</span>
        </div>
        <div v-else class="accessory-card-grid">
          <button
            v-for="accessory in accessoryStore.sortedOwnedAccessories"
            :key="accessory.instanceId"
            class="accessory-card"
            :class="{ 'accessory-card--selected': accessory.instanceId === selectedInstanceId }"
            :data-testid="`equipment-accessory-card-${accessory.instanceId}`"
            @click="selectAccessory(accessory.instanceId)"
          >
            <span class="accessory-card__mark" :class="qualityClass(accessory.quality)">
              <img v-if="accessoryIconUrl(accessory.defId)" :src="accessoryIconUrl(accessory.defId)" :alt="defName(accessory.defId)" loading="lazy" decoding="async" />
              <span v-else>{{ defName(accessory.defId).slice(0, 1) }}</span>
            </span>
            <span class="accessory-card__body">
              <span class="accessory-card__name">{{ tierLabel(accessory.tier) }}{{ qualityLabel(accessory.quality) }}{{ defName(accessory.defId) }}</span>
              <span class="accessory-card__meta">
                Lv.{{ accessory.level }}
                <span v-if="accessory.locked"> · 已锁</span>
                <span v-if="accessoryStore.isAccessoryEquipped(accessory.instanceId)"> · 装配中</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <div class="accessory-section accessory-detail" data-testid="equipment-accessory-detail">
        <template v-if="selectedAccessory">
          <div class="accessory-detail__top">
            <span class="accessory-detail__mark" :class="qualityClass(selectedAccessory.quality)">
              <img v-if="accessoryIconUrl(selectedAccessory.defId, 256)" :src="accessoryIconUrl(selectedAccessory.defId, 256)" :alt="defName(selectedAccessory.defId)" loading="lazy" decoding="async" />
              <span v-else>{{ defName(selectedAccessory.defId).slice(0, 1) }}</span>
            </span>
            <div class="min-w-0">
              <p>{{ accessoryTitle(selectedAccessory) }}</p>
              <small>{{ sourceLabel(selectedAccessory.source) }} · Lv.{{ selectedAccessory.level }}/20</small>
            </div>
          </div>

          <div class="accessory-progress">
            <span :style="{ width: `${Math.min(100, selectedAccessory.level * 5)}%` }" />
          </div>

          <div class="accessory-effect-list">
            <div v-for="line in selectedEffectLines" :key="line.key" class="accessory-effect-row">
              <span>{{ line.label }}</span>
              <strong>{{ line.current }}</strong>
            </div>
          </div>

          <div class="accessory-action-row">
            <Button
              class="flex-1 justify-center"
              :icon="accessoryStore.isAccessoryEquipped(selectedAccessory.instanceId) ? X : ShieldCheck"
              :icon-size="12"
              @click="handleEquipToggle(selectedAccessory)"
            >
              {{ accessoryStore.isAccessoryEquipped(selectedAccessory.instanceId) ? '卸下' : '装配' }}
            </Button>
            <Button class="justify-center" :icon="selectedAccessory.locked ? LockOpen : Lock" :icon-size="12" @click="handleToggleLock(selectedAccessory.instanceId)">
              {{ selectedAccessory.locked ? '解锁' : '锁定' }}
            </Button>
          </div>

          <div class="accessory-subpanel">
            <div class="accessory-section__head">
              <span>升级</span>
              <span>{{ selectedAccessory.level >= 20 ? '已满级' : `下一阶 Lv.${selectedAccessory.level + 1}` }}</span>
            </div>
            <p class="accessory-subpanel__text">{{ upgradePreview.message }}</p>
            <p v-if="!canUpgradeSelected.success && upgradePreview.success" class="accessory-warning">{{ canUpgradeSelected.message }}</p>
            <div v-if="upgradeCostLines.length > 0" class="accessory-cost-list">
              <div v-for="line in upgradeCostLines" :key="line.key" :class="{ 'accessory-cost-row--missing': line.missing > 0 }" class="accessory-cost-row">
                <span>{{ line.label }}</span>
                <strong>{{ line.owned }}/{{ line.quantity }}</strong>
              </div>
              <div class="accessory-cost-row" :class="{ 'accessory-cost-row--missing': playerStore.money < (upgradePreview.cost?.money ?? 0) }">
                <span>铜钱</span>
                <strong>{{ playerStore.money }}/{{ upgradePreview.cost?.money ?? 0 }}</strong>
              </div>
            </div>
            <Button
              class="w-full justify-center"
              :icon="ArrowUpCircle"
              :icon-size="12"
              :disabled="!canUpgradeSelected.success"
              data-testid="equipment-accessory-upgrade"
              @click="handleUpgrade(selectedAccessory.instanceId)"
            >
              调校升级
            </Button>
          </div>

          <div class="accessory-subpanel">
            <div class="accessory-section__head">
              <span>拆解返还</span>
              <span>不返还铜钱</span>
            </div>
            <p class="accessory-subpanel__text">{{ dismantlePreview.message }}</p>
            <div v-if="dismantlePreview.refundItems.length > 0" class="accessory-cost-list">
              <div v-for="item in dismantlePreview.refundItems" :key="item.itemId" class="accessory-cost-row">
                <span>{{ itemName(item.itemId) }}</span>
                <strong>+{{ item.quantity }}</strong>
              </div>
            </div>
            <Button
              class="w-full justify-center"
              :icon="Trash2"
              :icon-size="12"
              :disabled="!dismantlePreview.success"
              data-testid="equipment-accessory-dismantle"
              @click="handleDismantle(selectedAccessory.instanceId)"
            >
              拆解
            </Button>
          </div>
        </template>
        <div v-else class="accessory-empty">
          <MousePointer2 :size="24" />
          <span>选择一件配件查看调校和拆解。</span>
        </div>
      </div>

      <div class="accessory-section accessory-set-summary">
        <div class="accessory-section__head">
          <span>套装</span>
          <span>按最低阶生效</span>
        </div>
        <div v-for="summary in accessoryStore.setSummaries" :key="summary.familyId" class="accessory-set-row">
          <div>
            <p>{{ summary.label }}</p>
            <small>{{ setAdvice(summary) }}</small>
          </div>
          <strong>{{ summary.active ? setLabel(summary) : `${summary.equippedCount}/3` }}</strong>
        </div>
      </div>
    </div>

    <div v-else-if="activeMode === 'craft'" class="accessory-layout accessory-layout--craft">
      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>选择配件</span>
          <span>一阶起步</span>
        </div>
        <div class="accessory-def-grid">
          <button
            v-for="def in EQUIPMENT_ACCESSORY_DEFS"
            :key="def.id"
            class="accessory-def-card"
            :class="{ 'accessory-def-card--selected': selectedCraftDefId === def.id }"
            @click="selectedCraftDefId = def.id"
          >
            <span>{{ def.shortName.slice(0, 1) }}</span>
            <strong>{{ def.name }}</strong>
            <small>{{ familyLabel(def.familyId) }}</small>
          </button>
        </div>
      </div>

      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>打造阶级</span>
          <span>{{ craftUnlockText }}</span>
        </div>
        <div class="accessory-tier-row">
          <Button
            v-for="tier in craftableTiers"
            :key="tier"
            class="justify-center"
            :class="{
              '!bg-accent !text-bg': selectedCraftTier === tier,
              'accessory-tier-button--locked': !isCraftTierUnlocked(tier)
            }"
            @click="selectedCraftTier = tier"
          >
            {{ tierLabel(tier) }}
            <span>{{ craftTierStatus(tier) }}</span>
          </Button>
        </div>

        <div v-if="selectedRecipe" class="accessory-subpanel">
          <p class="accessory-subpanel__title">{{ tierLabel(selectedRecipe.tier) }}{{ defName(selectedRecipe.defId) }}</p>
          <p class="accessory-subpanel__text">默认普通品质，小概率精良；三阶来自深层矿洞，四阶需要高级蓝图。</p>
          <div class="accessory-cost-list">
            <div v-for="line in craftCostLines" :key="line.key" :class="{ 'accessory-cost-row--missing': line.missing > 0 }" class="accessory-cost-row">
              <span>{{ line.label }}</span>
              <strong>{{ line.owned }}/{{ line.quantity }}</strong>
            </div>
            <div class="accessory-cost-row" :class="{ 'accessory-cost-row--missing': playerStore.money < selectedRecipe.moneyCost }">
              <span>铜钱</span>
              <strong>{{ playerStore.money }}/{{ selectedRecipe.moneyCost }}</strong>
            </div>
          </div>
          <Button
            class="w-full justify-center"
            :icon="Hammer"
            :icon-size="12"
            :disabled="!canCraftSelected.success"
            data-testid="equipment-accessory-craft"
            @click="handleCraft"
          >
            打造配件
          </Button>
          <p v-if="!canCraftSelected.success" class="accessory-warning">{{ canCraftSelected.message }}</p>
        </div>
      </div>

      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>每日限购</span>
          <span>补充材料</span>
        </div>
        <div class="accessory-shop-list">
          <div v-for="offer in EQUIPMENT_ACCESSORY_DAILY_PURCHASES" :key="offer.id" class="accessory-shop-row">
            <div>
              <p>{{ offer.label }}</p>
              <small>{{ offer.unitPrice }}文 · 今日 {{ dailyRemaining(offer.id) }}/{{ offer.dailyLimit }}</small>
            </div>
            <Button :icon="ShoppingBag" :icon-size="12" :disabled="dailyRemaining(offer.id) <= 0" @click="handleDailyBuy(offer.id)">买1份</Button>
          </div>
        </div>
      </div>

      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>协助来源</span>
          <span>NPC</span>
        </div>
        <div class="accessory-npc-list">
          <div class="accessory-npc-row" :class="{ 'accessory-npc-row--active': npcStore.isNpcFunctionEffectUnlocked('forge_success_boost') }">
            <Hammer :size="14" />
            <span>孙铁匠·锻造指导</span>
            <strong>{{ npcStore.isNpcFunctionEffectUnlocked('forge_success_boost') ? '二阶已开' : '可解锁二阶打造' }}</strong>
          </div>
          <div class="accessory-npc-row" :class="{ 'accessory-npc-row--active': npcStore.isNpcFunctionEffectUnlocked('mine_floor_hint') }">
            <Pickaxe :size="14" />
            <span>阿石·矿脉指引</span>
            <strong>{{ npcStore.isNpcFunctionEffectUnlocked('mine_floor_hint') ? '深层加成' : '提示材料与稀有配件' }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="accessory-layout accessory-layout--fusion">
      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>可合成组</span>
          <span>同名同阶同品质</span>
        </div>
        <div v-if="fusionGroups.length === 0" class="accessory-empty">
          <Gem :size="24" />
          <span>暂无满足三合一的配件。</span>
        </div>
        <div v-else class="accessory-fusion-group-list">
          <button
            v-for="group in fusionGroups"
            :key="group.key"
            class="accessory-fusion-group"
            :class="{ 'accessory-fusion-group--selected': selectedFusionKey === group.key }"
            @click="selectFusionGroup(group.key)"
          >
            <span>{{ tierLabel(group.tier) }}{{ qualityLabel(group.quality) }}{{ defName(group.defId) }}</span>
            <strong>{{ group.items.length }}件</strong>
          </button>
        </div>
      </div>

      <div class="accessory-section accessory-fusion-stage" :class="`accessory-fusion-stage--${fusionAnimationState}`" data-testid="equipment-accessory-fusion-stage">
        <div class="accessory-section__head">
          <span>合成台</span>
          <span>{{ fusionPreview.success ? `${Math.round((fusionPreview.successRate ?? 0) * 100)}%` : '待选择' }}</span>
        </div>
        <div class="accessory-fusion-slots">
          <div v-for="index in 3" :key="index" class="accessory-fusion-slot">
            <template v-if="selectedFusionAccessories[index - 1]">
              <span class="accessory-card__mark" :class="qualityClass(selectedFusionAccessories[index - 1]!.quality)">
                <img
                  v-if="accessoryIconUrl(selectedFusionAccessories[index - 1]!.defId)"
                  :src="accessoryIconUrl(selectedFusionAccessories[index - 1]!.defId)"
                  :alt="defName(selectedFusionAccessories[index - 1]!.defId)"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else>{{ defName(selectedFusionAccessories[index - 1]!.defId).slice(0, 1) }}</span>
              </span>
              <small>Lv.{{ selectedFusionAccessories[index - 1]!.level }}</small>
            </template>
            <span v-else class="accessory-fusion-slot__empty">+</span>
          </div>
        </div>
        <div class="accessory-fusion-arrow">
          <ArrowRight :size="18" />
        </div>
        <div class="accessory-fusion-target">
          <span v-if="fusionPreview.success && selectedFusionBase" class="accessory-card__mark" :class="qualityClass(fusionPreview.targetQuality ?? 'fine')">
            <img v-if="accessoryIconUrl(selectedFusionBase.defId)" :src="accessoryIconUrl(selectedFusionBase.defId)" :alt="defName(selectedFusionBase.defId)" loading="lazy" decoding="async" />
            <span v-else>{{ defName(selectedFusionBase.defId).slice(0, 1) }}</span>
          </span>
          <strong v-if="fusionPreview.success && selectedFusionBase">
            {{ tierLabel(selectedFusionBase.tier) }}{{ qualityLabel(fusionPreview.targetQuality ?? 'fine') }}{{ defName(selectedFusionBase.defId) }}
          </strong>
          <small>产物固定 Lv.1</small>
        </div>
      </div>

      <div class="accessory-section">
        <div class="accessory-section__head">
          <span>预览</span>
          <span>{{ fusionPreview.success ? `保底 ${fusionPreview.pity}/${fusionPreview.pityThreshold}` : '未就绪' }}</span>
        </div>
        <p class="accessory-subpanel__text">{{ fusionPreview.message }}</p>
        <label class="accessory-toggle">
          <input v-model="fusionUseProtection" type="checkbox" />
          <span>使用稳固石，失败时保住 1 件材料配件</span>
          <strong>{{ getCombinedItemCount(EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID) }}</strong>
        </label>
        <div v-if="fusionPreview.refundOnSuccess?.length" class="accessory-cost-list">
          <div v-for="item in fusionPreview.refundOnSuccess" :key="item.itemId" class="accessory-cost-row">
            <span>{{ itemName(item.itemId) }}</span>
            <strong>返还 {{ item.quantity }}</strong>
          </div>
        </div>
        <Button
          class="w-full justify-center"
          :icon="Sparkles"
          :icon-size="12"
          :disabled="!fusionPreview.success"
          data-testid="equipment-accessory-fusion"
          @click="handleFusion"
        >
          开始合成
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    ArrowRight,
    ArrowUpCircle,
    Gem,
    Hammer,
    Lock,
    LockOpen,
    MousePointer2,
    PackageOpen,
    Pickaxe,
    Shield,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Sword,
    Trash2,
    X
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import {
    EQUIPMENT_ACCESSORY_DAILY_PURCHASES,
    EQUIPMENT_ACCESSORY_DEFS,
    EQUIPMENT_ACCESSORY_FAMILIES,
    EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID,
    EQUIPMENT_ACCESSORY_QUALITY_LABELS,
    EQUIPMENT_ACCESSORY_TIER_LABELS,
    getEquipmentAccessoryAnnualPace,
    getEquipmentAccessoryDef,
    getEquipmentAccessoryEffectValue,
    getEquipmentAccessoryFamily,
    getEquipmentAccessoryRecipe
  } from '@/data/equipmentAccessories'
  import { getItemById } from '@/data/items'
  import { getCombinedItemCount } from '@/composables/useCombinedInventory'
  import { addLog } from '@/composables/useGameLog'
  import { getItemIconUrl, loadItemIconManifest, type ItemIconSize } from '@/composables/useItemIconManifest'
  import { useEquipmentAccessoryStore } from '@/stores/useEquipmentAccessoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import type {
    EquipmentAccessoryEffectKey,
    EquipmentAccessoryFamilyId,
    EquipmentAccessoryQuality,
    EquipmentAccessorySetSummary,
    EquipmentAccessorySlotId,
    EquipmentAccessoryTier,
    OwnedEquipmentAccessory
  } from '@/types/equipmentAccessory'

  type AccessoryPanelMode = 'equip' | 'craft' | 'fusion'
  type CostLine = { key: string; label: string; quantity: number; owned: number; missing: number }

  const accessoryStore = useEquipmentAccessoryStore()
  const playerStore = usePlayerStore()
  const npcStore = useNpcStore()

  const activeMode = ref<AccessoryPanelMode>('equip')
  const selectedInstanceId = ref<string | null>(null)
  const selectedCraftDefId = ref<EquipmentAccessorySlotId>('weaponry_blade_core')
  const selectedCraftTier = ref<EquipmentAccessoryTier>(1)
  const selectedFusionKey = ref('')
  const selectedFusionIds = ref<string[]>([])
  const fusionUseProtection = ref(false)
  const fusionAnimationState = ref<'idle' | 'success' | 'failure'>('idle')
  const annualPace = getEquipmentAccessoryAnnualPace()

  void loadItemIconManifest()

  const selectedAccessory = computed(() =>
    selectedInstanceId.value ? accessoryStore.getAccessoryByInstanceId(selectedInstanceId.value) : null
  )

  watch(
    () => accessoryStore.sortedOwnedAccessories.map(accessory => accessory.instanceId).join('|'),
    () => {
      if (!selectedInstanceId.value || !accessoryStore.getAccessoryByInstanceId(selectedInstanceId.value)) {
        selectedInstanceId.value = accessoryStore.sortedOwnedAccessories[0]?.instanceId ?? null
      }
    },
    { immediate: true }
  )

  const familyIcons: Record<EquipmentAccessoryFamilyId, typeof Sword> = {
    weaponry: Sword,
    armor: Shield,
    gathering: Pickaxe
  }

  const familyRows = computed(() =>
    EQUIPMENT_ACCESSORY_FAMILIES.map(family => ({
      ...family,
      icon: familyIcons[family.id],
      setSummary: accessoryStore.getAccessorySetSummary(family.id),
      slots: family.slotIds.map(slotId => ({
        id: slotId,
        def: getEquipmentAccessoryDef(slotId)!,
        accessory: accessoryStore.equippedAccessories.find(accessory => accessory.defId === slotId) ?? null
      }))
    }))
  )

  const selectedEffectLines = computed(() => {
    if (!selectedAccessory.value) return []
    const def = getEquipmentAccessoryDef(selectedAccessory.value.defId)
    return (def?.effects ?? []).map(effect => ({
      key: effect.key,
      label: effect.label,
      current: formatEffectValue(effect.key, getEquipmentAccessoryEffectValue(selectedAccessory.value!, effect.key))
    }))
  })

  const upgradePreview = computed(() =>
    selectedAccessory.value
      ? accessoryStore.previewAccessoryUpgrade(selectedAccessory.value.instanceId)
      : { success: false, message: '选择配件后可查看升级。', currentValue: {}, nextValue: {} }
  )

  const upgradeCostLines = computed(() => {
    const cost = upgradePreview.value.cost
    if (!cost) return []
    return materialCostLines([
      { itemId: 'accessory_material', quantity: cost.accessoryMaterial },
      { itemId: 'accessory_tuning_stone', quantity: cost.tuningStone },
      ...cost.extraItems
    ])
  })
  const canUpgradeSelected = computed(() =>
    selectedAccessory.value
      ? accessoryStore.canUpgradeAccessory(selectedAccessory.value.instanceId)
      : { success: false, message: '选择配件后可查看升级。' }
  )

  const dismantlePreview = computed(() =>
    selectedAccessory.value
      ? accessoryStore.previewAccessoryDismantle(selectedAccessory.value.instanceId)
      : { success: false, message: '选择配件后可查看拆解返还。', refundItems: [] }
  )

  const craftableTiers: EquipmentAccessoryTier[] = [1, 2, 4]
  const selectedRecipe = computed(() => getEquipmentAccessoryRecipe(selectedCraftDefId.value, selectedCraftTier.value))
  const craftCostLines = computed(() => selectedRecipe.value ? materialCostLines(selectedRecipe.value.materialCosts) : [])

  const craftUnlockText = computed(() => {
    if (selectedCraftTier.value === 1) return '默认开放'
    if (selectedCraftTier.value === 2) return npcStore.isNpcFunctionEffectUnlocked('forge_success_boost') || accessoryStore.unlockedBlueprints.includes(2) ? '已开放' : '孙铁匠可协助'
    return accessoryStore.unlockedBlueprints.includes(4) ? '高级蓝图已开' : '需要高级蓝图'
  })

  const isCraftTierUnlocked = (tier: EquipmentAccessoryTier): boolean => {
    if (tier === 1) return true
    if (tier === 2) return npcStore.isNpcFunctionEffectUnlocked('forge_success_boost') || accessoryStore.unlockedBlueprints.includes(2)
    if (tier === 4) return accessoryStore.unlockedBlueprints.includes(4)
    return false
  }

  const craftTierStatus = (tier: EquipmentAccessoryTier): string => {
    if (tier === 1) return '可做'
    if (isCraftTierUnlocked(tier)) return '已开'
    return '未开'
  }

  const canCraftSelected = computed(() => {
    const recipe = selectedRecipe.value
    if (!recipe) return { success: false, message: '暂时不能打造这阶配件。' }
    if (recipe.tier === 2 && !npcStore.isNpcFunctionEffectUnlocked('forge_success_boost') && !accessoryStore.unlockedBlueprints.includes(2)) {
      return { success: false, message: '需要孙铁匠协助或二阶蓝图。' }
    }
    if (recipe.tier === 4 && !accessoryStore.unlockedBlueprints.includes(4)) return { success: false, message: '需要高级蓝图。' }
    if (craftCostLines.value.some(line => line.missing > 0)) return { success: false, message: '打造材料不足。' }
    if (playerStore.money < recipe.moneyCost) return { success: false, message: `铜钱不足，需要${recipe.moneyCost}文。` }
    return { success: true, message: '可以打造。' }
  })

  const fusionGroups = computed(() => {
    const groups = new Map<string, {
      key: string
      defId: EquipmentAccessorySlotId
      tier: EquipmentAccessoryTier
      quality: Exclude<EquipmentAccessoryQuality, 'supreme'>
      items: OwnedEquipmentAccessory[]
    }>()
    for (const accessory of accessoryStore.sortedOwnedAccessories) {
      if (accessory.quality === 'supreme' || accessory.locked || accessoryStore.isAccessoryEquipped(accessory.instanceId)) continue
      const key = `${accessory.defId}:${accessory.tier}:${accessory.quality}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          defId: accessory.defId,
          tier: accessory.tier,
          quality: accessory.quality,
          items: []
        })
      }
      groups.get(key)!.items.push(accessory)
    }
    return [...groups.values()].filter(group => group.items.length >= 3)
  })

  watch(
    fusionGroups,
    groups => {
      if (!groups.some(group => group.key === selectedFusionKey.value)) {
        const first = groups[0]
        selectedFusionKey.value = first?.key ?? ''
        selectedFusionIds.value = first?.items.slice(0, 3).map(accessory => accessory.instanceId) ?? []
      }
    },
    { immediate: true }
  )

  const selectedFusionAccessories = computed(() =>
    selectedFusionIds.value.map(id => accessoryStore.getAccessoryByInstanceId(id)).filter((item): item is OwnedEquipmentAccessory => !!item)
  )
  const selectedFusionBase = computed(() => selectedFusionAccessories.value[0] ?? null)
  const fusionPreview = computed(() => accessoryStore.previewAccessoryFusion(selectedFusionIds.value))

  const selectAccessory = (instanceId: string) => {
    selectedInstanceId.value = instanceId
  }

  const selectFirstByDef = (defId: EquipmentAccessorySlotId) => {
    selectedInstanceId.value = accessoryStore.sortedOwnedAccessories.find(accessory => accessory.defId === defId)?.instanceId ?? selectedInstanceId.value
  }

  const selectFusionGroup = (key: string) => {
    const group = fusionGroups.value.find(entry => entry.key === key)
    if (!group) return
    selectedFusionKey.value = key
    selectedFusionIds.value = group.items.slice(0, 3).map(accessory => accessory.instanceId)
    fusionAnimationState.value = 'idle'
  }

  const handleEquipToggle = (accessory: OwnedEquipmentAccessory) => {
    const result = accessoryStore.isAccessoryEquipped(accessory.instanceId)
      ? accessoryStore.unequipAccessory(accessory.defId)
      : accessoryStore.equipAccessory(accessory.instanceId)
    addLog(result.message)
  }

  const handleToggleLock = (instanceId: string) => {
    const result = accessoryStore.toggleAccessoryLock(instanceId)
    addLog(result.message)
  }

  const handleUpgrade = (instanceId: string) => {
    const result = accessoryStore.upgradeAccessory(instanceId)
    addLog(result.message)
  }

  const handleDismantle = (instanceId: string) => {
    const result = accessoryStore.dismantleAccessory(instanceId)
    addLog(result.message)
    if (result.success) selectedInstanceId.value = accessoryStore.sortedOwnedAccessories[0]?.instanceId ?? null
  }

  const handleCraft = () => {
    const result = accessoryStore.craftAccessory(selectedCraftDefId.value, selectedCraftTier.value)
    addLog(result.message)
    if (result.accessory) {
      selectedInstanceId.value = result.accessory.instanceId
      activeMode.value = 'equip'
    }
  }

  const handleDailyBuy = (offerId: string) => {
    const result = accessoryStore.buyDailyAccessoryMaterial(offerId, 1)
    addLog(result.message)
  }

  const handleFusion = () => {
    const result = accessoryStore.fuseAccessories(selectedFusionIds.value, { useProtection: fusionUseProtection.value })
    addLog(result.message)
    fusionAnimationState.value = result.accessory ? 'success' : result.success ? 'failure' : 'idle'
    if (result.accessory) {
      selectedInstanceId.value = result.accessory.instanceId
      activeMode.value = 'equip'
    }
  }

  const dailyRemaining = (offerId: string): number => {
    const offer = EQUIPMENT_ACCESSORY_DAILY_PURCHASES.find(entry => entry.id === offerId)
    if (!offer) return 0
    const purchased = accessoryStore.dailyPurchaseState.purchased[offerId] ?? 0
    return Math.max(0, offer.dailyLimit - purchased)
  }

  const materialCostLines = (entries: Array<{ itemId: string; quantity: number }>): CostLine[] =>
    entries
      .filter(entry => entry.quantity > 0)
      .map(entry => {
        const owned = getCombinedItemCount(entry.itemId)
        return {
          key: entry.itemId,
          label: itemName(entry.itemId),
          quantity: entry.quantity,
          owned,
          missing: Math.max(0, entry.quantity - owned)
        }
      })

  const itemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId
  const defName = (defId: EquipmentAccessorySlotId): string => getEquipmentAccessoryDef(defId)?.name ?? defId
  const familyLabel = (familyId: EquipmentAccessoryFamilyId): string => getEquipmentAccessoryFamily(familyId)?.label ?? familyId
  const tierLabel = (tier: EquipmentAccessoryTier): string => EQUIPMENT_ACCESSORY_TIER_LABELS[tier]
  const qualityLabel = (quality: EquipmentAccessoryQuality): string => EQUIPMENT_ACCESSORY_QUALITY_LABELS[quality]
  const accessoryTitle = (accessory: OwnedEquipmentAccessory): string =>
    `${tierLabel(accessory.tier)}${qualityLabel(accessory.quality)}${defName(accessory.defId)}`
  const accessoryIconUrl = (defId: EquipmentAccessorySlotId, size: ItemIconSize = 128): string => {
    const name = defName(defId)
    return getItemIconUrl({ id: defId, name, category: 'material', description: '', sellPrice: 0, edible: false }, '01', size)
  }

  const sourceLabel = (source: OwnedEquipmentAccessory['source']): string => ({
    workshop: '工坊打造',
    mine: '矿洞拾得',
    deep_mine: '深层矿洞',
    blueprint: '蓝图制作',
    npc: '村民协助',
    guild: '公会奖励',
    debug: '调试获得',
    fusion: '合成升品'
  })[source] ?? '未知来源'

  const qualityClass = (quality: EquipmentAccessoryQuality): string => ({
    normal: 'accessory-quality--normal',
    fine: 'accessory-quality--fine',
    excellent: 'accessory-quality--excellent',
    supreme: 'accessory-quality--supreme'
  })[quality]

  const formatEffectValue = (effectKey: EquipmentAccessoryEffectKey, value: number): string => {
    const effect = EQUIPMENT_ACCESSORY_DEFS.flatMap(def => def.effects).find(entry => entry.key === effectKey)
    if (effect?.unit === 'percent') return `${Math.round(value * 1000) / 10}%`
    if (effect?.unit === 'hint') return value > 0 ? '已增强' : '未触发'
    return `+${Math.round(value * 10) / 10}`
  }

  const setLabel = (summary: EquipmentAccessorySetSummary): string =>
    summary.active && summary.setTier && summary.setQuality
      ? `${tierLabel(summary.setTier)}${qualityLabel(summary.setQuality)} Lv.${summary.averageLevel}`
      : `${summary.equippedCount}/3`

  const setAdvice = (summary: EquipmentAccessorySetSummary): string => {
    if (!summary.active) return '补齐三件后激活套装效果。'
    if (summary.setTier && summary.setTier < 4) return '提升三件中最低阶，可提高套装阶级。'
    if (summary.setQuality && summary.setQuality !== 'supreme') return '继续升品可提高套装品质。'
    return '升级三件配件，可继续增强套装表现。'
  }
</script>

<style scoped>
  .accessory-panel {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.75rem;
  }

  .accessory-panel__header {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    padding: 0.75rem;
  }

  .accessory-panel__title {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-accent);
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .accessory-panel__subtitle {
    margin-top: 0.125rem;
    color: var(--color-muted);
    font-size: 0.6875rem;
    line-height: 1.4;
  }

  .accessory-panel__pace {
    display: grid;
    flex: 0 0 auto;
    min-width: 5.5rem;
    justify-items: end;
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1.15;
  }

  .accessory-panel__pace strong {
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.2;
  }

  .accessory-panel__tabs,
  .accessory-tier-row,
  .accessory-action-row {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .accessory-action-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .accessory-tier-row :deep(.btn > span) {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    white-space: nowrap;
  }

  .accessory-tier-row :deep(.btn > span > span) {
    color: currentColor;
    font-size: 0.5625rem;
    opacity: 0.7;
  }

  .accessory-tier-button--locked {
    opacity: 0.62;
  }

  .accessory-layout {
    display: grid;
    min-width: 0;
    gap: 0.625rem;
  }

  .accessory-layout--equip {
    grid-template-columns: minmax(13rem, 1fr) minmax(14rem, 1.1fr) minmax(14rem, 1fr);
  }

  .accessory-layout--craft,
  .accessory-layout--fusion {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .accessory-set-summary {
    grid-column: 1 / -1;
  }

  .accessory-section {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-bg) 86%, var(--color-accent) 4%);
    padding: 0.625rem;
  }

  .accessory-section__head {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-muted);
    font-size: 0.6875rem;
  }

  .accessory-section__head span:first-child {
    color: var(--color-accent);
    font-size: 0.75rem;
  }

  .accessory-family-list,
  .accessory-shop-list,
  .accessory-npc-list,
  .accessory-fusion-group-list {
    display: grid;
    min-width: 0;
    gap: 0.5rem;
  }

  .accessory-family {
    min-width: 0;
  }

  .accessory-family__head,
  .accessory-npc-row,
  .accessory-shop-row,
  .accessory-set-row,
  .accessory-fusion-group {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .accessory-family__head {
    margin-bottom: 0.375rem;
    color: var(--color-muted);
    font-size: 0.6875rem;
  }

  .accessory-family__head span:nth-child(2) {
    flex: 1 1 auto;
    color: var(--color-text);
  }

  .accessory-slot-grid {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .accessory-slot,
  .accessory-card,
  .accessory-def-card,
  .accessory-fusion-group {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-bg) 82%, transparent);
    color: var(--color-text);
    transition: border-color 0.16s ease, background-color 0.16s ease, transform 0.16s ease;
  }

  .accessory-slot {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 3.75rem;
    padding: 0.375rem;
    text-align: left;
  }

  .accessory-slot:hover,
  .accessory-card:hover,
  .accessory-def-card:hover,
  .accessory-fusion-group:hover {
    border-color: color-mix(in srgb, var(--color-accent) 44%, transparent);
    background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  }

  .accessory-slot--selected,
  .accessory-card--selected,
  .accessory-def-card--selected,
  .accessory-fusion-group--selected {
    border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .accessory-slot__icon,
  .accessory-card__mark,
  .accessory-detail__mark {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 24%, transparent);
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    color: var(--color-text);
    font-size: 0.75rem;
  }

  .accessory-slot__icon img,
  .accessory-card__mark img,
  .accessory-detail__mark img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .accessory-slot__copy,
  .accessory-card__body {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
  }

  .accessory-slot__copy span,
  .accessory-card__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
  }

  .accessory-slot__copy small,
  .accessory-card__meta,
  .accessory-subpanel__text,
  .accessory-set-row small,
  .accessory-shop-row small {
    color: var(--color-muted);
    font-size: 0.625rem;
    line-height: 1.35;
  }

  .accessory-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr));
    gap: 0.375rem;
    max-height: 28rem;
    overflow-y: auto;
  }

  .accessory-card {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 3.5rem;
    padding: 0.375rem;
    text-align: left;
  }

  .accessory-detail__top {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .accessory-detail__top p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
    font-size: 0.875rem;
  }

  .accessory-detail__top small {
    color: var(--color-muted);
    font-size: 0.6875rem;
  }

  .accessory-detail__mark {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.875rem;
  }

  .accessory-progress {
    height: 0.375rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-muted) 12%, transparent);
  }

  .accessory-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--color-accent);
  }

  .accessory-effect-list,
  .accessory-cost-list {
    display: grid;
    min-width: 0;
    gap: 0.25rem;
    margin: 0.5rem 0;
  }

  .accessory-effect-row,
  .accessory-cost-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.6875rem;
  }

  .accessory-effect-row span,
  .accessory-cost-row span {
    color: var(--color-muted);
  }

  .accessory-effect-row strong,
  .accessory-cost-row strong {
    color: var(--color-text);
    font-weight: 500;
  }

  .accessory-cost-row--missing span,
  .accessory-cost-row--missing strong,
  .accessory-warning {
    color: var(--color-danger);
  }

  .accessory-subpanel {
    min-width: 0;
    margin-top: 0.625rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .accessory-subpanel__title {
    margin-bottom: 0.25rem;
    color: var(--color-text);
    font-size: 0.75rem;
  }

  .accessory-def-grid {
    display: grid;
    min-width: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .accessory-def-card {
    display: grid;
    min-height: 4.5rem;
    justify-items: center;
    gap: 0.125rem;
    padding: 0.5rem 0.375rem;
  }

  .accessory-def-card span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-accent) 9%, transparent);
    color: var(--color-accent);
    font-size: 0.75rem;
  }

  .accessory-def-card strong {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .accessory-def-card small {
    color: var(--color-muted);
    font-size: 0.625rem;
  }

  .accessory-shop-row,
  .accessory-npc-row,
  .accessory-set-row {
    min-height: 3rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .accessory-shop-row p,
  .accessory-set-row p {
    color: var(--color-text);
    font-size: 0.75rem;
  }

  .accessory-npc-row {
    color: var(--color-muted);
    font-size: 0.6875rem;
  }

  .accessory-npc-row--active {
    border-color: color-mix(in srgb, var(--color-success) 35%, transparent);
    color: var(--color-success);
  }

  .accessory-fusion-group {
    min-height: 2.75rem;
    padding: 0.5rem;
    text-align: left;
  }

  .accessory-fusion-group span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
  }

  .accessory-fusion-stage {
    position: relative;
  }

  .accessory-fusion-slots {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .accessory-fusion-slot,
  .accessory-fusion-target {
    display: grid;
    min-height: 5rem;
    place-items: center;
    border: 1px dashed color-mix(in srgb, var(--color-accent) 24%, transparent);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .accessory-fusion-slot small,
  .accessory-fusion-target small {
    color: var(--color-muted);
    font-size: 0.625rem;
  }

  .accessory-fusion-slot__empty {
    color: var(--color-muted);
    font-size: 1.5rem;
  }

  .accessory-fusion-arrow {
    display: flex;
    justify-content: center;
    margin: 0.375rem 0;
    color: var(--color-accent);
  }

  .accessory-fusion-target strong {
    margin-top: 0.25rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .accessory-fusion-stage--success {
    animation: accessory-success 620ms ease;
  }

  .accessory-fusion-stage--failure {
    animation: accessory-failure 520ms ease;
  }

  .accessory-toggle {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.375rem;
    margin: 0.5rem 0;
    color: var(--color-muted);
    font-size: 0.6875rem;
  }

  .accessory-empty {
    display: grid;
    min-height: 6rem;
    place-items: center;
    gap: 0.375rem;
    color: var(--color-muted);
    text-align: center;
    font-size: 0.75rem;
  }

  .accessory-warning {
    margin-top: 0.375rem;
    font-size: 0.625rem;
  }

  .accessory-quality--normal {
    border-color: color-mix(in srgb, var(--color-muted) 35%, transparent);
  }

  .accessory-quality--fine {
    border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
    color: var(--color-success);
  }

  .accessory-quality--excellent {
    border-color: color-mix(in srgb, var(--color-water) 55%, transparent);
    color: var(--color-water);
  }

  .accessory-quality--supreme {
    border-color: color-mix(in srgb, var(--color-accent) 75%, transparent);
    color: var(--color-accent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 16%, transparent);
  }

  @keyframes accessory-success {
    0% { transform: scale(1); border-color: color-mix(in srgb, var(--color-accent) 16%, transparent); }
    45% { transform: scale(1.015); border-color: color-mix(in srgb, var(--color-success) 70%, transparent); }
    100% { transform: scale(1); border-color: color-mix(in srgb, var(--color-accent) 16%, transparent); }
  }

  @keyframes accessory-failure {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    50% { transform: translateX(3px); }
    75% { transform: translateX(-2px); }
  }

  @media (max-width: 980px) {
    .accessory-layout--equip,
    .accessory-layout--craft,
    .accessory-layout--fusion {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 420px) {
    .accessory-panel__header {
      align-items: flex-start;
      flex-direction: column;
    }

    .accessory-panel__pace {
      justify-items: start;
    }

    .accessory-def-grid,
    .accessory-slot-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .accessory-fusion-stage--success,
    .accessory-fusion-stage--failure {
      animation: none;
    }
  }
</style>
