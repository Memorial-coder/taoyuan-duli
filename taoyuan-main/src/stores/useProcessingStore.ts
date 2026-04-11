import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { MachineType, ProcessingSlot, Quality } from '@/types'
import {
  PROCESSING_MACHINES,
  SPRINKLERS,
  FERTILIZERS,
  BAITS,
  TACKLES,
  TAPPER,
  CRAB_POT_CRAFT,
  BOMBS,
  getRecipesForMachine,
  getProcessingRecipeById
} from '@/data/processing'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSkillStore } from './useSkillStore'
import { useBreedingStore } from './useBreedingStore'
import { useWarehouseStore } from './useWarehouseStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { addLog } from '@/composables/useGameLog'
import { hasCombinedItem, removeCombinedItem, getLowestCombinedQuality, getCombinedItemCount } from '@/composables/useCombinedInventory'

/** 工坊升级定义 */
const WORKSHOP_UPGRADES = [
  {
    level: 1,
    cost: 10000,
    materials: [
      { itemId: 'iron_bar', quantity: 15 },
      { itemId: 'wood', quantity: 50 }
    ]
  },
  {
    level: 2,
    cost: 25000,
    materials: [
      { itemId: 'gold_bar', quantity: 10 },
      { itemId: 'wood', quantity: 80 }
    ]
  }
]

export const useProcessingStore = defineStore('processing', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()

  /** 已放置的加工机器（运行中的槽位） */
  const machines = ref<ProcessingSlot[]>([])

  const QUALITY_VALUES: Quality[] = ['normal', 'fine', 'excellent', 'supreme']

  const getIdleMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !slot.recipeId)
      .map(({ index }) => index)

  const getReadyMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !!slot.recipeId && slot.ready)
      .map(({ index }) => index)

  const getProcessingMachineIndicesByType = (machineType: MachineType) =>
    machines.value
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.machineType === machineType && !!slot.recipeId && !slot.ready)
      .map(({ index }) => index)

  const normalizeLegacyRecipeId = (machineType: MachineType, recipeId: string | null | undefined): string | null => {
    if (!recipeId) return null

    const directRecipe = getProcessingRecipeById(recipeId)
    if (directRecipe?.machineType === machineType) return recipeId

    if (recipeId === 'fish_feed') {
      if (machineType === 'mill') return 'mill_fish_feed'
      if (machineType === 'recycler') return 'recycle_fish_feed'
    }

    return null
  }

  const sanitizeProcessingSlot = (raw: unknown): ProcessingSlot | null => {
    if (!raw || typeof raw !== 'object') return null

    const slot = raw as Partial<ProcessingSlot>
    const machineType = typeof slot.machineType === 'string' ? (slot.machineType as MachineType) : null
    if (!machineType || !PROCESSING_MACHINES.some(machine => machine.id === machineType)) return null

    const recipeId = normalizeLegacyRecipeId(machineType, typeof slot.recipeId === 'string' ? slot.recipeId : null)
    const recipe = recipeId ? getProcessingRecipeById(recipeId) : null
    const rawQuality = typeof slot.inputQuality === 'string' ? slot.inputQuality : undefined
    const inputQuality = rawQuality && QUALITY_VALUES.includes(rawQuality as Quality) ? (rawQuality as Quality) : undefined

    const daysProcessed = Math.max(0, Number(slot.daysProcessed) || 0)
    const totalDays = recipe ? Math.max(1, Number(slot.totalDays) || recipe.processingDays) : 0
    const ready = !!recipe && !!slot.ready

    return {
      machineType,
      recipeId,
      inputItemId: recipe ? recipe.inputItemId : null,
      inputQuality,
      daysProcessed: recipe ? Math.min(daysProcessed, totalDays) : 0,
      totalDays,
      ready
    }
  }

  /** 工坊等级：0/1/2，对应 15/20/25 */
  const workshopLevel = ref(0)

  /** 最大放置机器数 */
  const maxMachines = computed(() => 15 + workshopLevel.value * 5)

  /** 当前放置数量 */
  const machineCount = computed(() => machines.value.length)

  // === 制造(Craft) ===

  /** 检查是否有足够材料制造某样东西 */
  const canCraft = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (playerStore.money < craftMoney) return false
    return craftCost.every(c => hasCombinedItem(c.itemId, c.quantity))
  }

  /** 消耗材料 */
  const consumeCraftMaterials = (craftCost: { itemId: string; quantity: number }[], craftMoney: number): boolean => {
    if (!canCraft(craftCost, craftMoney)) return false
    if (!playerStore.spendMoney(craftMoney)) return false
    const removed: { itemId: string; quantity: number }[] = []
    for (const c of craftCost) {
      if (!removeCombinedItem(c.itemId, c.quantity)) {
        // 回退：恢复已消耗的材料和金钱
        playerStore.earnMoney(craftMoney)
        for (const r of removed) {
          inventoryStore.addItem(r.itemId, r.quantity)
        }
        return false
      }
      removed.push({ itemId: c.itemId, quantity: c.quantity })
    }
    return true
  }

  /** 制造并放置一台加工机器 */
  const craftMachine = (machineType: MachineType): boolean => {
    if (machines.value.length >= maxMachines.value) return false
    const def = PROCESSING_MACHINES.find(m => m.id === machineType)
    if (!def) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    machines.value.push({
      machineType,
      recipeId: null,
      inputItemId: null,
      daysProcessed: 0,
      totalDays: 0,
      ready: false
    })
    return true
  }

  /** 制造洒水器（返回物品ID放入背包） */
  const craftSprinkler = (sprinklerId: string): boolean => {
    const def = SPRINKLERS.find(s => s.id === sprinklerId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造肥料 */
  const craftFertilizer = (fertilizerId: string): boolean => {
    const def = FERTILIZERS.find(f => f.id === fertilizerId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造鱼饵 */
  const craftBait = (baitId: string): boolean => {
    const def = BAITS.find(b => b.id === baitId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造浮漂 */
  const craftTackle = (tackleId: string): boolean => {
    const def = TACKLES.find(t => t.id === tackleId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  /** 制造采脂器 */
  const craftTapper = (): boolean => {
    if (!inventoryStore.canAddItem(TAPPER.id)) return false
    if (!consumeCraftMaterials(TAPPER.craftCost, TAPPER.craftMoney)) return false
    return inventoryStore.addItemExact(TAPPER.id)
  }

  /** 制造蟹笼 */
  const craftCrabPot = (): boolean => {
    if (!inventoryStore.canAddItem(CRAB_POT_CRAFT.id)) return false
    if (!consumeCraftMaterials(CRAB_POT_CRAFT.craftCost, CRAB_POT_CRAFT.craftMoney)) return false
    return inventoryStore.addItemExact(CRAB_POT_CRAFT.id)
  }

  /** 制造炸弹 */
  const craftBomb = (bombId: string): boolean => {
    const def = BOMBS.find(b => b.id === bombId)
    if (!def) return false
    if (!inventoryStore.canAddItem(def.id)) return false
    if (!consumeCraftMaterials(def.craftCost, def.craftMoney)) return false
    return inventoryStore.addItemExact(def.id)
  }

  // === 加工操作 ===

  /** 检测背包+仓库中某物品的最低品质（removeItem 默认消耗顺序） */
  const getLowestQuality = (itemId: string): Quality => {
    return getLowestCombinedQuality(itemId)
  }

  const getBatchProcessLimit = (machineType: MachineType, recipeId: string, specifiedQuality?: Quality): number => {
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== machineType) return 0

    let limit = getIdleMachineIndicesByType(machineType).length
    if (limit <= 0) return 0

    if (recipe.inputItemId !== null) {
      const availableInput = specifiedQuality ? getCombinedItemCount(recipe.inputItemId, specifiedQuality) : getCombinedItemCount(recipe.inputItemId)
      limit = Math.min(limit, Math.floor(availableInput / recipe.inputQuantity))
    }

    if (recipe.extraInputs?.length) {
      for (const extra of recipe.extraInputs) {
        limit = Math.min(limit, Math.floor(getCombinedItemCount(extra.itemId) / extra.quantity))
      }
    }

    return Math.max(limit, 0)
  }

  const canRefundItems = (entries: { itemId: string; quantity: number; quality?: Quality }[]): boolean => {
    if (entries.length === 0) return true
    return inventoryStore.canAddItems(entries.map(entry => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
      quality: entry.quality ?? 'normal'
    })))
  }

  const refundItemsExact = (entries: { itemId: string; quantity: number; quality?: Quality }[]): boolean => {
    if (entries.length === 0) return true
    return inventoryStore.addItemsExact(entries.map(entry => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
      quality: entry.quality ?? 'normal'
    })))
  }

  /** 向已放置的机器投入原料开始加工。specifiedQuality 可指定消耗的品质 */
  const startProcessing = (slotIndex: number, recipeId: string, specifiedQuality?: Quality): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || slot.recipeId !== null) return false // 正在加工中
    const recipe = getProcessingRecipeById(recipeId)
    if (!recipe || recipe.machineType !== slot.machineType) return false

    if (recipe.extraInputs && recipe.extraInputs.length > 0) {
      for (const extra of recipe.extraInputs) {
        if (!hasCombinedItem(extra.itemId, extra.quantity)) return false
      }
    }

    // 消耗输入材料（蜂箱无需输入），记录投入品质
    let quality: Quality = 'normal'
    if (recipe.inputItemId !== null) {
      if (specifiedQuality !== undefined) {
        quality = specifiedQuality
        if (!removeCombinedItem(recipe.inputItemId, recipe.inputQuantity, specifiedQuality)) return false
      } else {
        quality = getLowestQuality(recipe.inputItemId)
        if (!removeCombinedItem(recipe.inputItemId, recipe.inputQuantity)) return false
      }
    }
    // 消耗额外副材料（合金配方）
    if (recipe.extraInputs && recipe.extraInputs.length > 0) {
      for (const extra of recipe.extraInputs) {
        removeCombinedItem(extra.itemId, extra.quantity)
      }
    }

    slot.recipeId = recipeId
    slot.inputItemId = recipe.inputItemId
    slot.inputQuality = quality
    slot.daysProcessed = 0
    slot.totalDays = recipe.processingDays
    // 仙缘能力：织速（gui_nv_1）织布机加工时间-30%
    if (slot.machineType === 'loom' && useHiddenNpcStore().isAbilityActive('gui_nv_1')) {
      slot.totalDays = Math.max(1, Math.ceil(slot.totalDays * 0.7))
    }
    slot.ready = false
    return true
  }

  const startProcessingBatch = (machineType: MachineType, recipeId: string, quantity?: number, specifiedQuality?: Quality): number => {
    const maxCount = getBatchProcessLimit(machineType, recipeId, specifiedQuality)
    const targetCount = Math.min(quantity ?? maxCount, maxCount)
    if (targetCount <= 0) return 0

    let started = 0
    for (const slotIndex of getIdleMachineIndicesByType(machineType)) {
      if (started >= targetCount) break
      if (startProcessing(slotIndex, recipeId, specifiedQuality)) started++
    }
    return started
  }

  /** 收取加工产物 */
  const collectProduct = (slotIndex: number): string | null => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.ready || !slot.recipeId) return null

    const recipe = getProcessingRecipeById(slot.recipeId)
    if (!recipe) return null

    // 优先放入虚空成品箱，箱子满则回退到背包
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    const outputQuality = slot.inputQuality ?? 'normal'
    if (voidOutput) {
      if (!warehouseStore.addItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, outputQuality)) {
        if (!inventoryStore.canAddItem(recipe.outputItemId, recipe.outputQuantity, outputQuality)) return null
        if (!inventoryStore.addItemExact(recipe.outputItemId, recipe.outputQuantity, outputQuality)) return null
      }
    } else {
      if (!inventoryStore.canAddItem(recipe.outputItemId, recipe.outputQuantity, outputQuality)) return null
      if (!inventoryStore.addItemExact(recipe.outputItemId, recipe.outputQuantity, outputQuality)) return null
    }

    // 种子制造机额外触发育种种子生成
    if (slot.machineType === 'seed_maker' && slot.inputItemId) {
      const breedingStore = useBreedingStore()
      const farmingLevel = skillStore.farmingLevel
      if (breedingStore.trySeedMakerGeneticSeed(slot.inputItemId, farmingLevel)) {
        addLog('种子制造机额外产出了一颗育种种子！', {
          category: 'processing',
          tags: ['processing_seed_bonus'],
          meta: { machineType: 'seed_maker', inputItemId: slot.inputItemId ?? '' }
        })
      }
    }

    // 重置槽位
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false

    return recipe.outputItemId
  }

  const collectProductsByType = (machineType: MachineType): { collected: number; blocked: number; outputs: string[] } => {
    let collected = 0
    let blocked = 0
    const outputs: string[] = []

    for (const slotIndex of getReadyMachineIndicesByType(machineType)) {
      const outputId = collectProduct(slotIndex)
      if (outputId) {
        collected++
        outputs.push(outputId)
      } else {
        blocked++
      }
    }

    return { collected, blocked, outputs }
  }

  /** 拆除机器（退回加工原料 + 已完成产物 + 机器制作材料） */
  const removeMachine = (slotIndex: number): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot) return false

    const refundEntries: { itemId: string; quantity: number; quality?: Quality }[] = []
    const machineDef = PROCESSING_MACHINES.find(m => m.id === slot.machineType)
    const recipe = slot.recipeId ? getProcessingRecipeById(slot.recipeId) : null
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()

    if (slot.recipeId && slot.ready && recipe) {
      const outputQuality = slot.inputQuality ?? 'normal'
      const canUseVoidOutput = !!voidOutput && warehouseStore.canAddItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, outputQuality)
      if (!canUseVoidOutput) {
        refundEntries.push({ itemId: recipe.outputItemId, quantity: recipe.outputQuantity, quality: outputQuality })
      }
    } else if (slot.recipeId && !slot.ready && recipe) {
      if (recipe.extraInputs) {
        for (const extra of recipe.extraInputs) {
          refundEntries.push({ itemId: extra.itemId, quantity: extra.quantity })
        }
      }
      if (recipe.inputItemId) {
        refundEntries.push({ itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality: slot.inputQuality ?? 'normal' })
      }
    }

    if (machineDef) {
      for (const mat of machineDef.craftCost) {
        refundEntries.push({ itemId: mat.itemId, quantity: mat.quantity })
      }
    }

    if (!canRefundItems(refundEntries)) return false

    // 如果已完成：先收取产物
    if (slot.recipeId && slot.ready && recipe) {
      if (voidOutput && warehouseStore.canAddItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')) {
        warehouseStore.addItemToChest(voidOutput.id, recipe.outputItemId, recipe.outputQuantity, slot.inputQuality ?? 'normal')
      } else {
        refundItemsExact([{ itemId: recipe.outputItemId, quantity: recipe.outputQuantity, quality: slot.inputQuality ?? 'normal' }])
      }
    }
    // 如果正在加工：退回原料
    else if (slot.recipeId && !slot.ready && recipe) {
      const stagedRefunds: { itemId: string; quantity: number; quality?: Quality }[] = []
      if (recipe.extraInputs) {
        for (const extra of recipe.extraInputs) {
          stagedRefunds.push({ itemId: extra.itemId, quantity: extra.quantity })
        }
      }
      if (recipe.inputItemId) {
        const outputQuality = slot.inputQuality ?? 'normal'
        stagedRefunds.push({ itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality: outputQuality })
      }
      refundItemsExact(stagedRefunds)
    }

    // 退还机器制作材料
    if (machineDef) {
      refundItemsExact(machineDef.craftCost.map(mat => ({ itemId: mat.itemId, quantity: mat.quantity })))
      playerStore.earnMoney(machineDef.craftMoney)
    }

    machines.value.splice(slotIndex, 1)
    return true
  }

  /** 取消加工（退回原料，机器回到空闲状态） */
  const cancelProcessing = (slotIndex: number): boolean => {
    const slot = machines.value[slotIndex]
    if (!slot || !slot.recipeId) return false
    const recipe = getProcessingRecipeById(slot.recipeId)
    const refundEntries: { itemId: string; quantity: number; quality?: Quality }[] = []
    // 如果正在加工且有原料投入，退回原料
    if (!slot.ready && slot.inputItemId && recipe) {
      if (recipe.inputItemId) {
        refundEntries.push({ itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality: slot.inputQuality ?? 'normal' })
      }
      // 退回副材料
      if (recipe?.extraInputs) {
        for (const extra of recipe.extraInputs) {
          refundEntries.push({ itemId: extra.itemId, quantity: extra.quantity })
        }
      }
    }
    if (!canRefundItems(refundEntries)) return false
    refundItemsExact(refundEntries)
    // 重置为空闲
    slot.recipeId = null
    slot.inputItemId = null
    slot.inputQuality = undefined
    slot.daysProcessed = 0
    slot.totalDays = 0
    slot.ready = false
    return true
  }

  const cancelProcessingByType = (machineType: MachineType): number => {
    let canceled = 0
    for (const slotIndex of getProcessingMachineIndicesByType(machineType)) {
      if (cancelProcessing(slotIndex)) canceled++
    }
    return canceled
  }

  /** 获取某台机器可用的加工配方列表 */
  const getAvailableRecipes = (machineType: MachineType) => {
    return getRecipesForMachine(machineType)
  }

  // === 每日更新 ===

  const dailyUpdate = () => {
    const collected: string[] = []
    const readyNames: string[] = []
    const warehouseStore = useWarehouseStore()
    const voidOutput = warehouseStore.getVoidOutputChest()
    const resetSlotToIdle = (slot: ProcessingSlot) => {
      slot.recipeId = null
      slot.inputItemId = null
      slot.inputQuality = undefined
      slot.daysProcessed = 0
      slot.totalDays = 0
      slot.ready = false
    }

    const buildVoidRestartPlan = (voidInputId: string, recipeId: string) => {
      const recipe = getProcessingRecipeById(recipeId)
      if (!recipe || !recipe.inputItemId) return null

      const nextQuality = warehouseStore.findChestConsumableQuality(voidInputId, recipe.inputItemId, recipe.inputQuantity)
      if (!nextQuality) return null

      const entries: { itemId: string; quantity: number; quality?: Quality }[] = [
        { itemId: recipe.inputItemId, quantity: recipe.inputQuantity, quality: nextQuality }
      ]

      if (recipe.extraInputs?.length) {
        for (const extra of recipe.extraInputs) {
          entries.push({ itemId: extra.itemId, quantity: extra.quantity })
        }
      }

      if (!warehouseStore.canConsumeChestItems(voidInputId, entries)) return null
      return { nextQuality, entries }
    }

    for (const slot of machines.value) {
      if (!slot.recipeId || slot.ready) continue
      slot.daysProcessed++
      if (slot.daysProcessed >= slot.totalDays) {
        const recipe = getProcessingRecipeById(slot.recipeId)
        if (recipe) {
          const canStoreOutput = (itemId: string, quantity: number, quality: Quality) => {
            if (voidOutput && warehouseStore.addItemToChest(voidOutput.id, itemId, quantity, quality)) return true
            return inventoryStore.addItemExact(itemId, quantity, quality)
          }

          // 仙缘能力：梦织（gui_nv_2）织布机8%概率额外产出梦丝
          if (slot.machineType === 'loom' && useHiddenNpcStore().isAbilityActive('gui_nv_2') && Math.random() < 0.08) {
            if (canStoreOutput('dream_silk', 1, 'normal')) {
              collected.push('梦丝')
            }
          }
          const machineDef = PROCESSING_MACHINES.find(m => m.id === slot.machineType)
          if (recipe.inputItemId === null || machineDef?.autoCollect) {
            // 自动收取：无需原料的机器（蜂箱/蚯蚓箱）或标记了 autoCollect 的机器（熔炉）
            const outputQuality = slot.inputQuality ?? 'normal'
            if (!canStoreOutput(recipe.outputItemId, recipe.outputQuantity, outputQuality)) {
              slot.ready = true
              readyNames.push(recipe.name)
              continue
            }
            collected.push(recipe.name)
            // 无需原料的机器自动重启，有原料的机器回到空闲
            if (recipe.inputItemId === null) {
              slot.daysProcessed = 0
              slot.inputQuality = undefined
              slot.ready = false
            } else {
              slot.recipeId = null
              slot.inputItemId = null
              slot.inputQuality = undefined
              slot.daysProcessed = 0
              slot.totalDays = 0
              slot.ready = false
            }
          } else {
            // 需要原料的机器：检查虚空原料箱是否可自动续产
            const voidInput = warehouseStore.getVoidInputChest()
            if (voidInput && recipe.inputItemId) {
              // 自动收取当前产物
              const outputQuality = slot.inputQuality ?? 'normal'
              if (!canStoreOutput(recipe.outputItemId, recipe.outputQuantity, outputQuality)) {
                slot.ready = true
                readyNames.push(recipe.name)
                continue
              }
              collected.push(recipe.name)

              // 种子制造机额外触发育种种子生成
              if (slot.machineType === 'seed_maker' && slot.inputItemId) {
                const breedingStore = useBreedingStore()
                const farmingLevel = skillStore.farmingLevel
                if (breedingStore.trySeedMakerGeneticSeed(slot.inputItemId, farmingLevel)) {
                  addLog('种子制造机额外产出了一颗育种种子！', {
                    category: 'processing',
                    tags: ['processing_seed_bonus'],
                    meta: { machineType: 'seed_maker', inputItemId: slot.inputItemId ?? '' }
                  })
                }
              }

              // 尝试从虚空原料箱取材料开始下一轮
              const restartPlan = buildVoidRestartPlan(voidInput.id, slot.recipeId)
              if (restartPlan && warehouseStore.consumeChestItemsExact(voidInput.id, restartPlan.entries)) {
                slot.daysProcessed = 0
                slot.inputQuality = restartPlan.nextQuality
                slot.ready = false
              } else {
                // 虚空箱无足够原料，回到空闲
                resetSlotToIdle(slot)
              }
            } else {
              // 无虚空原料箱，保持原行为：标记为完成等待手动收取
              slot.ready = true
              readyNames.push(recipe.name)
            }
          }
        } else {
          slot.ready = true
        }
      }
    }
    if (collected.length > 0) {
      const counts = new Map<string, number>()
      for (const name of collected) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const summary = Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name}x${count}` : name))
        .join('、')
      addLog(`工坊自动收取了：${summary}。`)
    }
    if (readyNames.length > 0) {
      const counts = new Map<string, number>()
      for (const name of readyNames) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const summary = Array.from(counts.entries())
        .map(([name, count]) => (count > 1 ? `${name}x${count}` : name))
        .join('、')
      addLog(`加工完成：${summary}，去工坊收取吧。`)
    }
  }

  // === 工坊升级 ===

  /** 升级工坊（扩展机器上限） */
  const upgradeWorkshop = (): { success: boolean; message: string } => {
    const next = workshopLevel.value + 1
    const upgrade = WORKSHOP_UPGRADES.find(u => u.level === next)
    if (!upgrade) return { success: false, message: '工坊已达到最高等级。' }
    if (!consumeCraftMaterials(upgrade.materials, upgrade.cost)) return { success: false, message: '材料或铜钱不足。' }
    workshopLevel.value = next
    return { success: true, message: `工坊扩建完成！机器上限提升至${maxMachines.value}台。` }
  }

  /** 获取下一级升级信息 */
  const getNextUpgrade = () => {
    const next = workshopLevel.value + 1
    return WORKSHOP_UPGRADES.find(u => u.level === next) ?? null
  }

  // === 序列化 ===

  const serialize = () => {
    return { machines: machines.value, workshopLevel: workshopLevel.value }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    machines.value = Array.isArray(data?.machines) ? data.machines.map(sanitizeProcessingSlot).filter((slot): slot is ProcessingSlot => !!slot) : []
    workshopLevel.value = (data as any).workshopLevel ?? 0
  }

  return {
    machines,
    machineCount,
    maxMachines,
    workshopLevel,
    canCraft,
    consumeCraftMaterials,
    craftMachine,
    craftSprinkler,
    craftFertilizer,
    craftBait,
    craftTackle,
    craftTapper,
    craftCrabPot,
    craftBomb,
    getBatchProcessLimit,
    startProcessing,
    startProcessingBatch,
    collectProduct,
    collectProductsByType,
    cancelProcessing,
    cancelProcessingByType,
    removeMachine,
    getAvailableRecipes,
    dailyUpdate,
    upgradeWorkshop,
    getNextUpgrade,
    WORKSHOP_UPGRADES,
    serialize,
    deserialize
  }
})
