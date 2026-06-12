<template>
  <div
    v-if="gameStore.isGameStarted"
    ref="gameLayoutRoot"
    class="game-layout-root flex h-screen flex-col gap-1 p-1.5 md:gap-4 md:p-4"
    data-testid="game-layout"
    :class="{ 'py-10': Capacitor.isNativePlatform() }"
  >
    <!-- 状态栏 -->
    <StatusBar @request-sleep="showSleepConfirm = true" @request-save-prompt="openSavePrompt" />

    <div class="game-layout-header-actions">
      <Button class="game-layout-sleep-btn text-center justify-center !text-sm" :icon="Moon" :icon-size="12" @click.stop="showSleepConfirm = true">
        {{ sleepLabel }}
      </Button>
    </div>

    <!-- 内容 -->
    <div
      ref="contentViewport"
      class="game-panel game-layout-content flex-1 min-h-0 overflow-y-auto"
      @touchstart.passive="handleContentTouchStart"
      @touchmove.passive="handleContentTouchMove"
      @touchend.passive="releaseBottomReveal"
      @touchcancel.passive="releaseBottomReveal"
    >
      <div class="game-layout-body">
        <div ref="sceneContentAnchor">
          <router-view v-slot="{ Component }">
            <Transition name="panel-fade" mode="out-in">
              <component :is="Component" :key="$route.path" />
            </Transition>
          </router-view>
        </div>
      </div>
    </div>

    <!-- 移动端总入口 -->
    <div class="game-side-actions">
      <button class="mobile-hub-btn" data-testid="mobile-hub-button" @click="showMobileMap = true">
        <Map :size="20" />
        <span v-if="mailboxStore.unreadCount > 0" class="mail-badge">{{ mailboxStore.unreadCount > 99 ? '99+' : mailboxStore.unreadCount }}</span>
      </button>
      <button
        v-if="isFullscreenSupported"
        class="game-floating-btn"
        data-testid="fullscreen-button"
        type="button"
        :aria-label="isFullscreen ? '退出全屏' : '进入全屏'"
        :title="isFullscreen ? '退出全屏' : '进入全屏'"
        @click="toggleFullscreen"
      >
        <Minimize2 v-if="isFullscreen" :size="20" />
        <Maximize2 v-else :size="20" />
      </button>
    </div>

    <SettingsDialog :open="showSettings" @close="closeSettings" />

    <Transition name="panel-fade">
      <SaveManager
        v-if="showSaveManager"
        :save-intent="saveIntent"
        :return-url="saveReturnUrl"
        @close="showSaveManager = false"
      />
    </Transition>

    <Transition name="panel-fade">
      <AnnouncementDialog
        v-if="announcementStore.popupQueue.length > 0 && !blockAnnouncementDialogs"
        :announcements="announcementStore.popupQueue"
        :closing="announcementClosing"
        @close="handleAnnouncementClose"
        @cta="handleAnnouncementCta"
        @save-update="handleAnnouncementSaveUpdate"
      />
    </Transition>

    <Transition name="panel-fade">
      <div
        v-if="showSavePrompt"
        class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        @click.self="showSavePrompt = false"
      >
        <div class="game-panel w-full max-w-xs text-center">
          <Divider title class="my-4" label="保存进度" />
          <p class="text-xs text-muted leading-5 mb-4">这次保存后，要直接返回吗？</p>
          <div class="flex flex-col space-y-1.5">
            <Button class="w-full justify-center !bg-accent !text-bg" @click="confirmSavePrompt('save')">仅保存</Button>
            <Button class="w-full justify-center" @click="confirmSavePrompt('save-return')">保存并返回</Button>
            <Button class="w-full justify-center text-muted" @click="showSavePrompt = false">取消</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 移动端地图菜单 -->
    <MobileMapMenu
      :open="showMobileMap"
      :current="currentPanel"
      :has-void-chest="warehouseStore.hasVoidChest"
      @close="showMobileMap = false"
      @open-settings="openSettingsFromMenu"
      @open-log="openLogFromMenu"
      @open-void="openVoidFromMenu"
    />

    <!-- 季节事件弹窗 -->
    <Transition name="panel-fade">
    <EventDialog v-if="currentEvent && !blockFollowupDialogs" :event="currentEvent" @close="closeEvent" />
    </Transition>

    <!-- 心事件弹窗 -->
    <Transition name="panel-fade">
    <HeartEventDialog v-if="pendingHeartEvent && !blockFollowupDialogs" :event="pendingHeartEvent" @close="closeHeartEvent" />
    </Transition>

    <!-- 仙灵发现场景弹窗 -->
    <Transition name="panel-fade">
      <DiscoveryScene
        v-if="pendingDiscoveryScene && !blockFollowupDialogs"
        :key="`${pendingDiscoveryScene.npcId}:${pendingDiscoveryScene.step.id}`"
        :npc-id="pendingDiscoveryScene.npcId"
        :step="pendingDiscoveryScene.step"
        @close="closeDiscoveryScene"
      />
    </Transition>

    <!-- 互动节日 -->
    <Transition name="panel-fade">
        <div v-if="currentFestival && !blockFollowupDialogs" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <FishingContestView v-if="currentFestival === 'fishing_contest'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <HarvestFairView v-if="currentFestival === 'harvest_fair'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <DragonBoatView v-if="currentFestival === 'dragon_boat'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <LanternRiddleView v-if="currentFestival === 'lantern_riddle'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <PotThrowingView v-if="currentFestival === 'pot_throwing'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <DumplingMakingView v-if="currentFestival === 'dumpling_making'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <FireworkShowView v-if="currentFestival === 'firework_show'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <TeaContestView v-if="currentFestival === 'tea_contest'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
        <KiteFlyingView v-if="currentFestival === 'kite_flying'" :bonus-money="festivalBonusMoney" @complete="closeFestival" />
      </div>
    </Transition>

    <!-- 技能专精选择弹窗 -->
    <Transition name="panel-fade">
      <PerkSelectDialog v-if="pendingPerk && !blockFollowupDialogs" :skill-type="pendingPerk.skillType" :level="pendingPerk.level" @select="handlePerkSelect" />
    </Transition>

    <!-- 宠物领养弹窗 -->
    <Transition name="panel-fade">
      <div v-if="pendingPetAdoption && !blockFollowupDialogs" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title label="小动物来访" />
          <p class="text-xs leading-relaxed mb-3">一只小动物在你家门口徘徊，看起来很想有个家。你要收养它吗？</p>
          <div class="flex space-x-3 justify-center mb-3">
            <Button :class="petChoice === 'cat' ? '!bg-accent !text-bg' : ''" @click="petChoice = 'cat'">猫</Button>
            <Button :class="petChoice === 'dog' ? '!bg-accent !text-bg' : ''" @click="petChoice = 'dog'">狗</Button>
          </div>
          <div v-if="petChoice" class="mb-3">
            <p class="text-xs text-muted mb-1">给它取个名字：</p>
            <input
              v-model="petNameInput"
              class="w-full bg-bg border border-accent/30 rounded-xs px-2 py-1 text-xs text-text focus:border-accent accent outline-none placeholder:text-muted/40 transition-colors"
              :placeholder="petChoice === 'cat' ? '小花' : '旺财'"
              maxlength="8"
            />
          </div>
          <Button :disabled="!petChoice" @click="confirmPetAdoption">领养</Button>
        </div>
      </div>
    </Transition>

    <!-- 子女提议弹窗 -->
    <Transition name="panel-fade">
      <div v-if="childProposalVisible && !blockFollowupDialogs" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title label="家庭提议" />
          <p class="text-xs leading-relaxed mb-4">{{ proposalSpouseName }}轻声说道：「{{ npcStore.getChildProposalPrompt() }}」</p>
          <div class="flex flex-col space-y-1.5">
            <Button class="w-full justify-center" @click="handleChildProposalResponse('accept')">「我也这么想。」</Button>
            <Button class="w-full justify-center" @click="handleChildProposalResponse('wait')">「再等等吧。」</Button>
            <Button class="w-full justify-center text-muted" @click="handleChildProposalResponse('decline')">「现在还不是时候。」</Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 晨间选项事件弹窗 -->
    <Transition name="panel-fade">
      <div v-if="pendingFarmEvent && !blockFollowupDialogs" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <p class="text-xs leading-relaxed mb-4">{{ pendingFarmEvent.message }}</p>
          <div class="flex flex-col space-y-1.5">
            <Button v-for="(c, i) in pendingFarmEvent.choices" :key="i" class="w-full justify-center" @click="handleFarmEventChoice(c)">
              {{ c.label }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱远程存取弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">
              <Archive :size="14" class="inline" />
              虚空箱
            </p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showVoidModal = false" />
          </div>

          <!-- 虚空箱列表 -->
          <div class="flex flex-col space-y-1.5">
            <div
              v-for="vc in voidChests"
              :key="vc.id"
              @click="toggleVoidChest(vc.id)"
              class="border border-accent/10 rounded-xs p-2 cursor-pointer"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs text-quality-supreme">{{ vc.label }}</span>
                  <span v-if="vc.voidRole === 'input'" class="text-[0.625rem] px-1 border border-accent/30 rounded-xs text-accent">原料箱</span>
                  <span v-if="vc.voidRole === 'output'" class="text-[0.625rem] px-1 border border-accent/30 rounded-xs text-accent">
                    成品箱
                  </span>
                </div>
                <span class="text-[0.625rem] text-muted">{{ vc.items.length }}/{{ voidChestCapacity }}</span>
              </div>

              <!-- 展开的物品列表 -->
              <template v-if="expandedVoidChestId === vc.id">
                <div v-if="vc.items.length > 0" class="flex flex-col space-y-0.5 mb-1.5 max-h-36 overflow-y-auto">
                  <div
                    v-for="(item, idx) in vc.items"
                    :key="idx"
                    class="flex items-center justify-between px-2 py-0.5 border border-accent/5 rounded-xs mr-1"
                    @click.stop="voidItemDetail = { itemId: item.itemId, quality: item.quality, quantity: item.quantity }"
                  >
                    <span class="flex min-w-0 items-center gap-1.5 text-[0.625rem] truncate mr-2 cursor-pointer hover:underline" :class="voidQualityClass(item.quality)">
                      <ItemIcon :item="getItemById(item.itemId)" size="xs" :quality="item.quality" />
                      <span class="min-w-0 truncate">
                        {{ getItemName(item.itemId) }}
                        <span class="text-[0.625rem] text-muted">&times;{{ item.quantity }}</span>
                      </span>
                    </span>
                    <div class="flex items-center space-x-1">
                      <Button
                        class="py-0 px-1 text-[0.625rem]"
                        @click.stop="openVoidQtyModal('withdraw', vc.id, item.itemId, item.quality, item.quantity)"
                      >
                        取出
                      </Button>
                    </div>
                  </div>
                </div>
                <div v-else class="flex flex-col items-center justify-center py-4">
                  <Archive :size="28" class="text-accent/20 mb-1.5" />
                  <p class="text-[0.625rem] text-muted">箱子是空的</p>
                  <p class="text-[0.625rem] text-muted/50 mt-0.5">点击下方「存入」添加</p>
                </div>
                <Button
                  v-if="voidDuplicateDepositItems.length > 0"
                  class="w-full text-[0.625rem] mb-1"
                  :icon="ArrowDownToLine"
                  :icon-size="10"
                  @click.stop="handleVoidDepositDuplicates"
                >
                  一键存入重复物品
                </Button>
                <Button
                  v-if="voidDepositableItems.length > 0"
                  class="w-full text-[0.625rem]"
                  :icon="ArrowDown"
                  :icon-size="10"
                  @click.stop="openVoidDeposit(vc.id)"
                >
                  存入
                </Button>
              </template>
            </div>
          </div>
          <div v-if="voidChests.length === 0" class="flex flex-col items-center justify-center py-8">
            <Archive :size="40" class="text-accent/20 mb-2" />
            <p class="text-xs text-muted">还没有虚空箱</p>
            <p class="text-[0.625rem] text-muted/50 mt-0.5">在仓库中制作虚空箱后即可远程存取</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱存入弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="showVoidDepositModal && voidDepositChestId"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showVoidDepositModal = false"
      >
        <div class="game-panel max-w-sm w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">存入物品</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="showVoidDepositModal = false" />
          </div>
          <div class="flex flex-col space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="item in voidDepositableItems"
              :key="item.itemId + item.quality"
              class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
              @click="openVoidQtyModal('deposit', voidDepositChestId!, item.itemId, item.quality, item.quantity)"
            >
              <span class="flex min-w-0 items-center gap-1.5 text-xs truncate mr-2" :class="voidQualityClass(item.quality)">
                <ItemIcon :item="getItemById(item.itemId)" size="xs" :quality="item.quality" />
                <span class="min-w-0 truncate">
                  {{ getItemName(item.itemId) }}
                  <span v-if="item.quality !== 'normal'" class="text-[0.625rem]">({{ VOID_QUALITY_LABEL[item.quality] }})</span>
                </span>
              </span>
              <span class="text-xs text-muted">&times;{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱数量选择弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="voidQtyModal"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
        @click.self="voidQtyModal = null"
      >
        <div class="game-panel max-w-xs w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-accent">{{ voidQtyModal.mode === 'withdraw' ? '取出' : '存入' }}</p>
            <Button class="py-0 px-1" :icon="X" :icon-size="12" @click="voidQtyModal = null" />
          </div>
          <div class="flex items-center gap-2 mb-2" :class="voidQualityClass(voidQtyModal.quality)">
            <ItemIcon :item="getItemById(voidQtyModal.itemId)" size="sm" :quality="voidQtyModal.quality" />
            <p class="min-w-0 text-xs">
              <span class="block truncate">{{ getItemName(voidQtyModal.itemId) }}</span>
              <span v-if="voidQtyModal.quality !== 'normal'" class="block text-[0.625rem]">({{ VOID_QUALITY_LABEL[voidQtyModal.quality] }})</span>
            </p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-muted">数量</span>
              <div class="flex items-center space-x-1">
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="voidQty <= 1" @click="addVoidQty(-1)">-</Button>
                <input
                  type="number"
                  :value="voidQty"
                  min="1"
                  :max="voidQtyModal.max"
                  class="w-24 h-6 px-2 py-0.5 bg-bg border border-accent/30 rounded-xs text-xs text-center text-accent outline-none"
                  @input="onVoidQtyInput"
                />
                <Button class="h-6 px-1.5 py-0.5 text-xs justify-center" :disabled="voidQty >= voidQtyModal.max" @click="addVoidQty(1)">
                  +
                </Button>
              </div>
            </div>
            <div class="flex space-x-1">
              <Button class="flex-1 justify-center" :disabled="voidQty <= 1" @click="setVoidQty(1)">最少</Button>
              <Button class="flex-1 justify-center" :disabled="voidQty >= voidQtyModal.max" @click="setVoidQty(voidQtyModal!.max)">
                最多
              </Button>
            </div>
          </div>
          <Button class="w-full justify-center !bg-accent !text-bg" @click="confirmVoidQty">
            {{ voidQtyModal.mode === 'withdraw' ? '取出' : '存入' }} &times;{{ voidQty }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- 虚空箱道具信息弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="voidItemDetail && voidItemDef"
        class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="voidItemDetail = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="voidItemDetail = null">
            <X :size="14" />
          </button>
          <div class="flex items-start gap-2 mb-2 pr-5">
            <ItemIcon :item="voidItemDef" size="lg" :resolution="256" :quality="voidItemDetail.quality" />
            <p class="min-w-0 text-sm" :class="voidQualityClass(voidItemDetail.quality) || 'text-accent'">
              <span class="block truncate">{{ voidItemDef.name }}</span>
            </p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ voidItemDef.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ voidItemDetail.quantity }}</span>
            </div>
            <div v-if="voidItemDetail.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span class="text-xs" :class="voidQualityClass(voidItemDetail.quality)">
                {{ VOID_QUALITY_LABEL[voidItemDetail.quality] }}
              </span>
            </div>
            <div v-if="voidItemDef.sellPrice" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ voidItemDef.sellPrice }}文</span>
            </div>
            <div v-if="voidItemDef.staminaRestore" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">恢复</span>
              <span class="text-xs text-success">
                +{{ voidItemDef.staminaRestore }}体力
                <template v-if="voidItemDef.healthRestore">/ +{{ voidItemDef.healthRestore }}HP</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 记录中心 -->
    <Transition name="panel-fade">
      <div
        v-if="showRecordCenter"
        class="game-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 md:p-4"
        @click.self="showRecordCenter = false"
      >
        <div class="game-panel flex w-full max-w-6xl flex-col max-h-[92vh]">
          <PlayerRecordCenterPanel :initial-tab="recordCenterInitialTab" @close="showRecordCenter = false" />
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <DailyDigestSummaryDialog
        v-if="showDailyDigestSummary && latestUnreadDailyDigest"
        :digest="latestUnreadDailyDigest"
        @close="closeDailyDigestSummary"
        @open-record-center="openRecordCenterFromDigest"
      />
    </Transition>

    <!-- 休息确认 -->
    <Transition name="panel-fade">
      <div v-if="showSleepConfirm" class="game-modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div class="game-panel max-w-xs w-full text-center">
          <Divider title>{{ sleepLabel }}</Divider>
          <p class="text-xs leading-relaxed mb-1">{{ sleepSummary }}</p>
          <p v-for="(warn, wi) in sleepWarning.split('\n').filter(Boolean)" :key="wi" class="text-danger text-xs mb-1">{{ warn }}</p>
          <div class="grid grid-cols-2 gap-1.5 mt-4">
            <Button
              v-for="option in SHORT_REST_OPTIONS"
              :key="option.id"
              class="w-full justify-center"
              :icon="Moon"
              :icon-size="12"
              @click="handleShortRest(option)"
            >
              {{ getShortRestButtonLabel(option) }}
            </Button>
          </div>
          <div class="flex space-x-3 justify-center mt-2">
            <Button :icon="X" :icon-size="12" @click="showSleepConfirm = false">再等等</Button>
            <Button class="btn-danger" :icon="Moon" :icon-size="12" @click="confirmSleep">{{ sleepLabel }}</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
  <div
    v-else-if="deepLinkRecoveryInProgress"
    class="game-layout-root flex h-screen flex-col items-center justify-center gap-3 p-4 text-center"
    data-testid="game-deeplink-restore"
  >
    <div class="game-panel w-full max-w-xs">
      <Divider title label="恢复旅程" />
      <p class="text-xs text-muted leading-5">正在恢复最近的存档…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useHomeStore } from '@/stores/useHomeStore'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useWarehouseStore } from '@/stores/useWarehouseStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useRealtimeStore } from '@/stores/useRealtimeStore'
  import { useAnnouncementStore } from '@/stores/useAnnouncementStore'
  import { useFarmStore } from '@/stores/useFarmStore'
  import { useDialogs } from '@/composables/useDialogs'
  import type { MorningChoiceEvent } from '@/data/farmEvents'
  import { handleEndDay } from '@/composables/useEndDay'
  import { addLog, showFloat, setQmsgParent, _registerDayLabelGetter } from '@/composables/useGameLog'
  import {
    LATE_NIGHT_RECOVERY_MAX,
    LATE_NIGHT_RECOVERY_MIN,
    PASSOUT_STAMINA_RECOVERY,
    PASSOUT_MONEY_PENALTY_RATE,
    PASSOUT_MONEY_PENALTY_CAP,
    SHORT_REST_OPTIONS
  } from '@/data/timeConstants'
  import { getNpcById, getItemById, getCropById } from '@/data'
  import { CHEST_DEFS } from '@/data/items'
  import { useGameClock } from '@/composables/useGameClock'
  import { syncNavigationClockPauseForRoute } from '@/composables/useNavigation'
  import { useAudio } from '@/composables/useAudio'
  import type { Quality, RecordCenterTabId } from '@/types'
  import type { SaveSlotInfo } from '@/stores/useSaveStore'
  import type { TaoyuanAnnouncement } from '@/types/announcement'
  import { Moon, X, Map, ArrowDown, ArrowDownToLine, Maximize2, Minimize2 } from 'lucide-vue-next'
  import { usePlayerRecordCenterStore } from '@/stores/usePlayerRecordCenterStore'
  import Button from '@/components/game/Button.vue'
  import Divider from '@/components/game/Divider.vue'
  import DailyDigestSummaryDialog from '@/components/game/DailyDigestSummaryDialog.vue'
  import AnnouncementDialog from '@/components/game/AnnouncementDialog.vue'
  import MobileMapMenu from '@/components/game/MobileMapMenu.vue'
  import PlayerRecordCenterPanel from '@/components/game/PlayerRecordCenterPanel.vue'
  import StatusBar from '@/components/game/StatusBar.vue'
  import EventDialog from '@/components/game/EventDialog.vue'
  import HeartEventDialog from '@/components/game/HeartEventDialog.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import PerkSelectDialog from '@/components/game/PerkSelectDialog.vue'
  import FishingContestView from '@/components/game/FishingContestView.vue'
  import HarvestFairView from '@/components/game/HarvestFairView.vue'
  import DragonBoatView from '@/components/game/DragonBoatView.vue'
  import LanternRiddleView from '@/components/game/LanternRiddleView.vue'
  import PotThrowingView from '@/components/game/PotThrowingView.vue'
  import DumplingMakingView from '@/components/game/DumplingMakingView.vue'
  import FireworkShowView from '@/components/game/FireworkShowView.vue'
  import TeaContestView from '@/components/game/TeaContestView.vue'
  import KiteFlyingView from '@/components/game/KiteFlyingView.vue'
  import SettingsDialog from '@/components/game/SettingsDialog.vue'
  import SaveManager from '@/components/game/SaveManager.vue'
  import DiscoveryScene from '@/components/game/DiscoveryScene.vue'
  import { openAnnouncementTarget } from '@/utils/announcementApi'
  import { Capacitor } from '@capacitor/core'

  const BACKGROUND_AUTOSAVE_INTERVAL_MS = 60_000
  const MOBILE_BOTTOM_REVEAL_MAX_PX = 150
  const MOBILE_BOTTOM_REVEAL_DAMPING = 0.5
  const MOBILE_BOTTOM_REVEAL_EDGE_PX = 4
  const MOBILE_BOTTOM_REVEAL_REBOUND_MS = 160
  type ShortRestOption = (typeof SHORT_REST_OPTIONS)[number]

  type FullscreenDocument = Document & {
    webkitFullscreenElement?: Element | null
    webkitFullscreenEnabled?: boolean
    webkitExitFullscreen?: () => Promise<void> | void
  }

  type FullscreenTarget = HTMLDivElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
    webkitRequestFullScreen?: () => Promise<void> | void
  }

  const router = useRouter()
  const route = useRoute()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const playerRecordCenterStore = usePlayerRecordCenterStore()
  const farmStore = useFarmStore()
  const mailboxStore = useMailboxStore()
  const saveStore = useSaveStore()
  const realtimeStore = useRealtimeStore()
  const announcementStore = useAnnouncementStore()
  const { switchToSeasonalBgm } = useAudio()
  const gameLayoutRoot = ref<HTMLDivElement | null>(null)
  const contentViewport = ref<HTMLDivElement | null>(null)
  const sceneContentAnchor = ref<HTMLDivElement | null>(null)
  const isFullscreen = ref(false)
  const isFullscreenSupported = ref(false)
  const deepLinkRecoveryInProgress = ref(!gameStore.isGameStarted)
  let bottomRevealOffset = 0
  let bottomRevealPendingOffset = 0
  let bottomRevealStartY = 0
  let bottomRevealTouchId: number | null = null
  let bottomRevealTracking = false
  let bottomRevealReleaseTimer: number | null = null
  let bottomRevealFrame: number | null = null

  const {
    currentEvent,
    pendingHeartEvent,
    currentFestival,
    currentFestivalEvent,
    pendingPerk,
    pendingPetAdoption,
    childProposalVisible,
    pendingFarmEvent,
    pendingDiscoveryScene,
    closeEvent,
    closeHeartEvent,
    closeFestival,
    handlePerkSelect,
    closePetAdoption,
    closeChildProposal,
    closeFarmEvent,
    closeDiscoveryScene
  } = useDialogs()

  const festivalBonusMoney = computed(() => currentFestivalEvent.value?.effects.moneyReward ?? 0)

  const npcStore = useNpcStore()

  const { startClock, stopClock, pauseClock, resumeClock, applySettingsPauseOnOpen } = useGameClock()

  /** 移动端地图菜单 */
  const showMobileMap = ref(false)

  /** 休息确认弹窗 */
  const showSleepConfirm = ref(false)

  /** 设置弹窗 */
  const showSettings = ref(false)
  const showSavePrompt = ref(false)
  const showSaveManager = ref(false)
  const saveIntent = ref<'manage' | 'save' | 'save-return' | 'save-refresh'>('manage')
  const saveReturnUrl = ref('/')

  const openSettings = () => {
    applySettingsPauseOnOpen()
    showSettings.value = true
  }

  const closeSettings = () => {
    resumeClock('settings')
    showSettings.value = false
  }

  const openSavePrompt = (returnUrl: string) => {
    saveReturnUrl.value = returnUrl || '/'
    showSavePrompt.value = true
  }

  const openSaveManager = (payload: { intent: 'save' | 'save-return' | 'save-refresh'; returnUrl: string }) => {
    saveIntent.value = payload.intent
    saveReturnUrl.value = payload.returnUrl || '/'
    showSavePrompt.value = false
    showSaveManager.value = true
  }

  const confirmSavePrompt = (intent: 'save' | 'save-return') => {
    openSaveManager({ intent, returnUrl: saveReturnUrl.value || '/' })
  }

  const openSettingsFromMenu = () => {
    showMobileMap.value = false
    openSettings()
  }

  const openLogFromMenu = () => {
    showMobileMap.value = false
    recordCenterInitialTab.value = playerRecordCenterStore.getPreferredOpenTab()
    showRecordCenter.value = true
  }

  const openVoidFromMenu = () => {
    showMobileMap.value = false
    showVoidModal.value = true
  }

  const getActiveFullscreenElement = () => {
    const fullscreenDocument = document as FullscreenDocument
    return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
  }

  const syncGameLogToastParent = () => {
    if (typeof document === 'undefined') return
    const root = gameLayoutRoot.value
    const shouldMountInGameRoot = root && getActiveFullscreenElement() === root
    setQmsgParent(shouldMountInGameRoot ? root : null)
  }

  const supportsGameFullscreen = () => {
    if (typeof document === 'undefined') return false
    const fullscreenDocument = document as FullscreenDocument
    const target = gameLayoutRoot.value as FullscreenTarget | null
    return Boolean(
      document.fullscreenEnabled ||
      fullscreenDocument.webkitFullscreenEnabled ||
      target?.requestFullscreen ||
      target?.webkitRequestFullscreen ||
      target?.webkitRequestFullScreen
    )
  }

  const requestGameFullscreen = async () => {
    const target = gameLayoutRoot.value as FullscreenTarget | null
    if (!target) return

    if (typeof target.requestFullscreen === 'function') {
      await target.requestFullscreen()
      return
    }

    const requestWebkitFullscreen = target.webkitRequestFullscreen ?? target.webkitRequestFullScreen
    if (typeof requestWebkitFullscreen === 'function') {
      await requestWebkitFullscreen.call(target)
    }
  }

  const exitGameFullscreen = async () => {
    const fullscreenDocument = document as FullscreenDocument
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen()
      return
    }

    if (fullscreenDocument.webkitFullscreenElement && typeof fullscreenDocument.webkitExitFullscreen === 'function') {
      await fullscreenDocument.webkitExitFullscreen()
    }
  }

  const syncFullscreenState = () => {
    if (typeof document === 'undefined') return
    const isGameRootFullscreen = getActiveFullscreenElement() === gameLayoutRoot.value
    isFullscreen.value = isGameRootFullscreen
    syncGameLogToastParent()
  }

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return

    try {
      if (getActiveFullscreenElement()) {
        await exitGameFullscreen()
        syncFullscreenState()
        return
      }

      await requestGameFullscreen()
      syncFullscreenState()
    } catch {
      addLog('浏览器暂时无法切换全屏，请检查权限或使用系统全屏。')
    }
  }

  const isMobileBottomRevealViewport = () => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 767px)').matches
  )

  const isContentViewportAtBottom = () => {
    const viewport = contentViewport.value
    if (!viewport) return false
    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= MOBILE_BOTTOM_REVEAL_EDGE_PX
  }

  const clearBottomRevealTimer = () => {
    if (bottomRevealReleaseTimer === null) return
    window.clearTimeout(bottomRevealReleaseTimer)
    bottomRevealReleaseTimer = null
  }

  const clearBottomRevealFrame = () => {
    if (bottomRevealFrame === null) return
    window.cancelAnimationFrame(bottomRevealFrame)
    bottomRevealFrame = null
  }

  const flushBottomRevealOffset = () => {
    bottomRevealFrame = null
    bottomRevealOffset = bottomRevealPendingOffset
    const viewport = contentViewport.value
    if (!viewport) return
    viewport.style.setProperty('--game-bottom-reveal-offset', `${bottomRevealOffset}px`)
    viewport.classList.toggle('game-layout-content--revealing', bottomRevealOffset > 0)
  }

  const setBottomRevealOffset = (value: number, immediate = false) => {
    bottomRevealPendingOffset = Math.round(Math.max(0, Math.min(MOBILE_BOTTOM_REVEAL_MAX_PX, value)))
    if (immediate) {
      clearBottomRevealFrame()
      flushBottomRevealOffset()
      return
    }
    if (bottomRevealFrame !== null) return
    bottomRevealFrame = window.requestAnimationFrame(flushBottomRevealOffset)
  }

  const findBottomRevealTouch = (touchList: TouchList) => {
    if (bottomRevealTouchId === null) return touchList[0] ?? null
    for (let index = 0; index < touchList.length; index += 1) {
      const touch = touchList.item(index)
      if (touch?.identifier === bottomRevealTouchId) return touch
    }
    return null
  }

  const handleContentTouchStart = (event: TouchEvent) => {
    clearBottomRevealTimer()
    contentViewport.value?.classList.remove('game-layout-content--rebounding')
    setBottomRevealOffset(0, true)

    if (!isMobileBottomRevealViewport() || event.touches.length !== 1) {
      bottomRevealTracking = false
      bottomRevealTouchId = null
      return
    }

    const touch = event.touches.item(0)
    if (!touch) return
    bottomRevealStartY = touch.clientY
    bottomRevealTouchId = touch.identifier
    bottomRevealTracking = isContentViewportAtBottom()
  }

  const handleContentTouchMove = (event: TouchEvent) => {
    if (!isMobileBottomRevealViewport() || event.touches.length !== 1) {
      releaseBottomReveal()
      return
    }

    const touch = findBottomRevealTouch(event.touches)
    if (!touch) return

    const dragUpDistance = bottomRevealStartY - touch.clientY
    if (!bottomRevealTracking) {
      if (dragUpDistance <= 0 || !isContentViewportAtBottom()) return
      bottomRevealStartY = touch.clientY
      bottomRevealTracking = true
      return
    }

    if (dragUpDistance <= 0) {
      setBottomRevealOffset(0)
      return
    }

    setBottomRevealOffset(dragUpDistance * MOBILE_BOTTOM_REVEAL_DAMPING)
  }

  const releaseBottomReveal = () => {
    bottomRevealTracking = false
    bottomRevealTouchId = null
    clearBottomRevealTimer()

    if (bottomRevealOffset <= 0 && bottomRevealPendingOffset <= 0) {
      contentViewport.value?.classList.remove('game-layout-content--rebounding', 'game-layout-content--revealing')
      return
    }

    clearBottomRevealFrame()
    const viewport = contentViewport.value
    viewport?.classList.add('game-layout-content--rebounding')
    window.requestAnimationFrame(() => {
      setBottomRevealOffset(0, true)
      bottomRevealReleaseTimer = window.setTimeout(() => {
        viewport?.classList.remove('game-layout-content--rebounding', 'game-layout-content--revealing')
        bottomRevealReleaseTimer = null
      }, MOBILE_BOTTOM_REVEAL_REBOUND_MS)
    })
  }

  /** 日志弹窗 */
  const showRecordCenter = ref(false)
  /** 日志清空确认：undefined=不显示, null=清空全部, string=清空指定天 */
  const showDailyDigestSummary = ref(false)
  const latestUnreadDailyDigest = computed(() => (playerRecordCenterStore.hasUnreadDailyDigest ? playerRecordCenterStore.latestDailyDigest : null))
  const recordCenterInitialTab = ref<RecordCenterTabId>(playerRecordCenterStore.getPreferredOpenTab())
  const announcementClosing = ref(false)
  const currentAnnouncement = computed(() => announcementStore.currentAnnouncement)
  const blockAnnouncementDialogs = computed(() => showDailyDigestSummary.value || showRecordCenter.value || showSaveManager.value || showSavePrompt.value)
  const blockFollowupDialogs = computed(() => blockAnnouncementDialogs.value || !!currentAnnouncement.value)

  const closeAnnouncementsWithRewards = async () => {
    if (announcementClosing.value) return false
    announcementClosing.value = true
    try {
      const result = await announcementStore.closeCurrent()
      if (result.claimedCount > 0) {
        showFloat(`公告奖励已领取 ${result.claimedCount} 份`, 'success')
      }
      return true
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '公告奖励领取失败，请稍后重试', 'danger')
      return false
    } finally {
      announcementClosing.value = false
    }
  }

  const handleAnnouncementClose = async () => {
    await closeAnnouncementsWithRewards()
  }

  const handleAnnouncementCta = async (selectedAnnouncement: TaoyuanAnnouncement) => {
    const announcement = announcementStore.clickAnnouncementCta(selectedAnnouncement.id) || selectedAnnouncement
    if (!announcement?.cta_url) return
    try {
      await openAnnouncementTarget(announcement.cta_url, router)
    } catch {
      addLog('公告链接暂时无法打开，请稍后从首页公告入口重试。')
    }
  }

  const handleAnnouncementSaveUpdate = async () => {
    if (!(await closeAnnouncementsWithRewards())) return
    openSaveManager({
      intent: 'save-refresh',
      returnUrl: window.location.href,
    })
  }

  const closeDailyDigestSummary = () => {
    const latestDayTag = playerRecordCenterStore.latestDailyDigest?.dayTag
    if (latestDayTag) playerRecordCenterStore.markDailyDigestRead(latestDayTag)
    showDailyDigestSummary.value = false
  }

  const openRecordCenterFromDigest = () => {
    const latestDayTag = playerRecordCenterStore.latestDailyDigest?.dayTag
    if (latestDayTag) playerRecordCenterStore.markDailyDigestRead(latestDayTag)
    recordCenterInitialTab.value = 'daily'
    showDailyDigestSummary.value = false
    showRecordCenter.value = true
  }

  watch(
    latestUnreadDailyDigest,
    digest => {
      if (!digest) return
      showDailyDigestSummary.value = true
    },
    { immediate: true }
  )

  // 注册天数标签获取器
  _registerDayLabelGetter(() => `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]} 第${gameStore.day}天`)

  /** 按天分组的日志（最新天在前，每天内也倒序） */
  const groupedLogs = computed(() => {
    return [] as Array<{ label: string; messages: string[] }>
  })
  void groupedLogs

  // 实时时钟生命周期
  const backgroundAutoSaveTimer = ref<number | null>(null)
  const backgroundAutoSaveInFlight = ref(false)
  const pendingSaveSyncTimer = ref<number | null>(null)
  let mailboxVisibilityHandler: (() => void) | null = null

  const refreshMailboxOnResume = () => {
    void mailboxStore.refreshList({ silent: true }).catch(() => {})
  }

  const runBackgroundAutoSave = async () => {
    if (backgroundAutoSaveInFlight.value) return
    if (showSaveManager.value || showSavePrompt.value) return
    if (saveStore.getSaveBlockReason()) return

    backgroundAutoSaveInFlight.value = true
    try {
      await saveStore.autoSave()
    } finally {
      backgroundAutoSaveInFlight.value = false
    }
  }

  const getSavedAtTimestamp = (slot: SaveSlotInfo) => {
    const timestamp = Date.parse(slot.savedAt ?? '')
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const resolveDeepLinkRecoverySlot = async () => {
    if (saveStore.activeSlot >= 0 && saveStore.activeSlotMode === saveStore.storageMode) {
      return saveStore.activeSlot
    }

    const slots = await saveStore.getSlots()
    const latestSlot = slots
      .filter(slot => slot.exists && !slot.readBlocked)
      .sort((left, right) => getSavedAtTimestamp(right) - getSavedAtTimestamp(left) || left.slot - right.slot)[0]
    return latestSlot?.slot ?? -1
  }

  const recoverGameDeepLink = async () => {
    if (gameStore.isGameStarted) {
      deepLinkRecoveryInProgress.value = false
      return true
    }

    deepLinkRecoveryInProgress.value = true
    const requestedFullPath = route.fullPath || '/game/farm'
    const recoverySlot = await resolveDeepLinkRecoverySlot()
    if (recoverySlot >= 0 && await saveStore.loadFromSlot(recoverySlot)) {
      addLog(`已从存档 ${recoverySlot + 1} 恢复当前页面。`)
      deepLinkRecoveryInProgress.value = false
      return true
    }

    const redirectQuery = requestedFullPath.startsWith('/game')
      ? { redirect: requestedFullPath }
      : undefined
    await router.replace({ name: 'menu', query: redirectQuery })
    return false
  }

  const startGameLayoutRuntime = () => {
    startClock()
    isFullscreenSupported.value = supportsGameFullscreen()
    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    void realtimeStore.start()
    void announcementStore.fetchActive()
    void saveStore.syncPendingServerSaves()
    void mailboxStore.refreshList().catch(() => {})
    mailboxVisibilityHandler = () => {
      if (document.visibilityState !== 'visible') return
      refreshMailboxOnResume()
    }
    document.addEventListener('visibilitychange', mailboxVisibilityHandler)
    pendingSaveSyncTimer.value = window.setInterval(() => {
      void saveStore.syncPendingServerSaves()
    }, 15000)
    backgroundAutoSaveTimer.value = window.setInterval(() => {
      void runBackgroundAutoSave()
    }, BACKGROUND_AUTOSAVE_INTERVAL_MS)
  }

  onMounted(async () => {
    if (!(await recoverGameDeepLink())) return
    startGameLayoutRuntime()
  })
  onUnmounted(() => {
    clearBottomRevealTimer()
    clearBottomRevealFrame()
    stopClock()
    realtimeStore.stop()
    document.removeEventListener('fullscreenchange', syncFullscreenState)
    document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
    setQmsgParent(null)
    if (backgroundAutoSaveTimer.value !== null) {
      window.clearInterval(backgroundAutoSaveTimer.value)
      backgroundAutoSaveTimer.value = null
    }
    if (mailboxVisibilityHandler !== null) {
      document.removeEventListener('visibilitychange', mailboxVisibilityHandler)
      mailboxVisibilityHandler = null
    }
    if (pendingSaveSyncTimer.value !== null) {
      window.clearInterval(pendingSaveSyncTimer.value)
      pendingSaveSyncTimer.value = null
    }
  })

  /** 从路由名称获取当前面板标识 */
  const currentPanel = computed(() => {
    return (route.name as string) ?? 'farm'
  })

  const getSceneAnchorScrollTop = () => {
    const viewport = contentViewport.value
    const anchor = sceneContentAnchor.value
    if (!viewport || !anchor) return null

    const viewportRect = viewport.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    return Math.max(0, viewport.scrollTop + (anchorRect.top - viewportRect.top) - 6)
  }

  const scrollSceneIntoView = async () => {
    const viewport = contentViewport.value
    const nextTop = getSceneAnchorScrollTop()
    if (!viewport || nextTop === null) return

    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    viewport.scrollTo({
      top: nextTop,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    })
  }

  const sleepLabel = computed(() => {
    if (gameStore.hour >= 24) return '倒头就睡'
    if (gameStore.hour >= 20) return '回家休息'
    return '休息'
  })

  const sleepSummary = computed(() => {
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
      return '你已经精疲力竭……将在原地昏倒。'
    }
    if (gameStore.hour >= 24) {
      return '已经过了午夜，拖着疲惫的身体回家……'
    }
    return '回到家中，安稳入睡。明日又是新的一天。'
  })

  const sleepWarning = computed(() => {
    const warnings: string[] = []
    const homeStore = useHomeStore()
    const staminaBonus = homeStore.getStaminaRecoveryBonus()
    const villageBonus = useVillageProjectStore().getDailyRecoveryBonus()
    if (playerStore.stamina <= 0 || gameStore.hour >= 26) {
      const pct = Math.round(Math.min(PASSOUT_STAMINA_RECOVERY + staminaBonus + villageBonus, 1) * 100)
      const penaltyPct = Math.round(PASSOUT_MONEY_PENALTY_RATE * 100)
      if (pct < 100) {
        warnings.push(`体力仅恢复${pct}%，并损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`)
      } else {
        warnings.push(`损失${penaltyPct}%铜钱（上限${PASSOUT_MONEY_PENALTY_CAP}文）`)
      }
    } else if (gameStore.hour >= 24) {
      const t = Math.min(Math.max(gameStore.hour - 24, 0), 1)
      const pct = Math.round(
        Math.min(LATE_NIGHT_RECOVERY_MAX - t * (LATE_NIGHT_RECOVERY_MAX - LATE_NIGHT_RECOVERY_MIN) + staminaBonus + villageBonus, 1) * 100
      )
      if (pct < 100) {
        warnings.push(`体力仅恢复${pct}%`)
      }
    }
    // 第28天换季警告：统计将枯萎的作物
    if (gameStore.day === 28) {
      const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const
      const nextSeason = SEASON_ORDER[(SEASON_ORDER.indexOf(gameStore.season) + 1) % 4]!
      let willWitherCount = 0
      let harvestableCount = 0
      for (const plot of farmStore.plots) {
        if ((plot.state === 'planted' || plot.state === 'growing' || plot.state === 'harvestable') && plot.cropId) {
          const crop = getCropById(plot.cropId)
          if (crop && !crop.season.includes(nextSeason)) {
            willWitherCount++
            if (plot.state === 'harvestable') harvestableCount++
          }
        }
      }
      if (willWitherCount > 0) {
        const nextName = SEASON_NAMES[nextSeason]
        let msg = `明天进入${nextName}季，${willWitherCount}株作物将会枯萎！`
        if (harvestableCount > 0) {
          msg += `（其中${harvestableCount}株已可收获）`
        }
        warnings.push(msg)
      }
    }
    return warnings.join('\n')
  })

  /** 短睡恢复 */
  const getShortRestPreviewRecover = (option: ShortRestOption): number =>
    Math.min(
      option.staminaRestore,
      Math.max(0, playerStore.maxStamina - playerStore.stamina),
      playerStore.shortRestRecoveryRemaining
    )

  const getShortRestButtonLabel = (option: ShortRestOption): string => {
    const recover = getShortRestPreviewRecover(option)
    return recover > 0 ? `${option.label} +${recover}体力` : option.label
  }

  const handleShortRest = (option: ShortRestOption) => {
    showSleepConfirm.value = false
    const tr = gameStore.advanceTime(option.timeHours, { skipSpeedBuff: true })
    if (tr.passedOut) {
      if (tr.message) addLog(tr.message)
      pauseClock('endday')
      try {
        handleEndDay()
      } finally {
        resumeClock('endday')
      }
      switchToSeasonalBgm()
      return
    }

    const recovered = playerStore.recoverShortRestStamina(option.staminaRestore)
    if (recovered > 0) {
      addLog(`${option.label}，恢复了${recovered}点体力。`)
    } else if (playerStore.stamina >= playerStore.maxStamina) {
      addLog(`${option.label}，精神没有更多恢复。`)
    } else {
      addLog(`${option.label}，今天小睡恢复已经到上限。`)
    }
    if (tr.message) addLog(tr.message)
  }

  /** 宠物领养 */
  const petChoice = ref<'cat' | 'dog' | null>(null)
  const petNameInput = ref('')

  const confirmPetAdoption = () => {
    if (!petChoice.value) return
    const animalStore = useAnimalStore()
    const defaultName = petChoice.value === 'cat' ? '小花' : '旺财'
    const name = petNameInput.value.trim() || defaultName
    const adopted = animalStore.adoptPet(petChoice.value, name)
    if (!adopted) {
      addLog('现在还不能收养新的小动物，先把家里安顿得更周全一些。')
      return
    }
    closePetAdoption()
    petChoice.value = null
    petNameInput.value = ''
  }

  /** 子女提议回应 */
  const proposalSpouseName = computed(() => {
    const spouse = npcStore.getSpouse()
    if (!spouse) return '配偶'
    return getNpcById(spouse.npcId)?.name ?? '配偶'
  })

  const handleChildProposalResponse = (response: 'accept' | 'decline' | 'wait') => {
    const result = npcStore.respondToChildProposal(response)
    addLog(result.message)
    if (result.friendshipChange !== 0) {
      addLog(`(好感${result.friendshipChange > 0 ? '+' : ''}${result.friendshipChange})`)
    }
    closeChildProposal()
  }

  const inventoryStore = useInventoryStore()
  const warehouseStore = useWarehouseStore()

  const handleFarmEventChoice = (choice: MorningChoiceEvent['choices'][number]) => {
    addLog(choice.result)
    if (choice.effect) {
      switch (choice.effect.type) {
        case 'gainItem':
          if (!getItemById(choice.effect.itemId)) {
            addLog(`晨间事件奖励配置异常：${choice.effect.itemId} 不存在。`)
          } else if (!inventoryStore.addItem(choice.effect.itemId, choice.effect.qty)) {
            addLog(`未能领取${getItemName(choice.effect.itemId)}，请先整理背包。`)
          }
          break
        case 'gainMoney':
          playerStore.earnMoney(choice.effect.amount)
          break
        case 'gainFriendship':
          for (const s of npcStore.npcStates) {
            const cap = s.married ? 4000 : 2500
            s.friendship = Math.min(s.friendship + choice.effect.amount, cap)
          }
          break
      }
    }
    closeFarmEvent()
  }

  // === 虚空箱远程访问 ===
  const showVoidModal = ref(false)
  const showVoidDepositModal = ref(false)
  const expandedVoidChestId = ref<string | null>(null)
  const voidDepositChestId = ref<string | null>(null)

  const voidChests = computed(() => warehouseStore.getVoidChests())
  const voidChestCapacity = CHEST_DEFS.void.capacity

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId

  const VOID_QUALITY_LABEL: Record<Quality, string> = {
    normal: '普通',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
  }

  const voidQualityClass = (q: Quality): string => {
    if (q === 'fine') return 'text-quality-fine'
    if (q === 'excellent') return 'text-quality-excellent'
    if (q === 'supreme') return 'text-quality-supreme'
    return ''
  }

  const toggleVoidChest = (chestId: string) => {
    expandedVoidChestId.value = expandedVoidChestId.value === chestId ? null : chestId
  }

  const openVoidDeposit = (chestId: string) => {
    voidDepositChestId.value = chestId
    showVoidDepositModal.value = true
  }

  const voidDepositableItems = computed(() =>
    inventoryStore.items.filter(i => {
      if (i.locked) return false
      const def = getItemById(i.itemId)
      return def && def.category !== 'seed'
    })
  )

  /** 背包中可一键存入的重复物品（虚空箱中已有且未锁定、非种子） */
  const voidDuplicateDepositItems = computed(() => {
    if (!expandedVoidChestId.value) return []
    const chest = warehouseStore.getChest(expandedVoidChestId.value)
    if (!chest) return []
    const chestItemIds = new Set(chest.items.map(i => i.itemId))
    return inventoryStore.items.filter(i => {
      if (i.locked) return false
      const def = getItemById(i.itemId)
      if (!def || def.category === 'seed') return false
      return chestItemIds.has(i.itemId)
    })
  })

  /** 一键存入重复物品到虚空箱 */
  const handleVoidDepositDuplicates = () => {
    if (!expandedVoidChestId.value) return
    const chestId = expandedVoidChestId.value
    const snapshot = voidDuplicateDepositItems.value.map(i => ({ itemId: i.itemId, quality: i.quality, quantity: i.quantity }))
    let totalDeposited = 0
    let kindCount = 0
    for (const item of snapshot) {
      const actual = warehouseStore.depositToChest(chestId, item.itemId, item.quantity, item.quality)
      if (actual > 0) {
        totalDeposited += actual
        kindCount++
      }
    }
    if (totalDeposited > 0) {
      addLog(`一键存入了${kindCount}种物品，共${totalDeposited}个到虚空箱。`)
    } else {
      addLog('虚空箱已满，无法存入。')
    }
  }

  /** 虚空箱道具信息弹窗 */
  const voidItemDetail = ref<{ itemId: string; quality: Quality; quantity: number } | null>(null)
  const voidItemDef = computed(() => {
    if (!voidItemDetail.value) return null
    return getItemById(voidItemDetail.value.itemId) ?? null
  })

  // === 虚空箱数量选择 ===
  interface VoidQtyModalData {
    mode: 'withdraw' | 'deposit'
    chestId: string
    itemId: string
    quality: Quality
    max: number
  }
  const voidQtyModal = ref<VoidQtyModalData | null>(null)
  const voidQty = ref(1)

  watch(
    () =>
      !!(
        currentEvent.value ||
        pendingHeartEvent.value ||
        currentFestival.value ||
        pendingPerk.value ||
        pendingPetAdoption.value ||
        childProposalVisible.value ||
        pendingFarmEvent.value ||
        pendingDiscoveryScene.value ||
        showMobileMap.value ||
        showSleepConfirm.value ||
        showSaveManager.value ||
        showRecordCenter.value ||
        showDailyDigestSummary.value ||
        showVoidModal.value ||
        showVoidDepositModal.value ||
        !!voidQtyModal.value ||
        !!voidItemDetail.value
      ),
    hasModal => {
      if (hasModal) {
        pauseClock('modal')
        return
      }

      resumeClock('modal')
    }
  )

  watch(
    () => route.name,
    async (newRouteName, oldRouteName) => {
      syncNavigationClockPauseForRoute(newRouteName, { pauseClock, resumeClock })
      if (!newRouteName || !oldRouteName || newRouteName === oldRouteName) return
      await nextTick()
      requestAnimationFrame(() => {
        void scrollSceneIntoView()
      })
    },
    { immediate: true }
  )

  const openVoidQtyModal = (mode: 'withdraw' | 'deposit', chestId: string, itemId: string, quality: Quality, max: number) => {
    if (max <= 1) {
      // 数量为1时直接执行，不弹窗
      if (mode === 'withdraw') executeVoidWithdraw(chestId, itemId, quality, 1)
      else executeVoidDeposit(chestId, itemId, quality, 1)
      return
    }
    voidQtyModal.value = { mode, chestId, itemId, quality, max }
    voidQty.value = max
  }

  const setVoidQty = (val: number) => {
    if (!voidQtyModal.value) return
    voidQty.value = Math.max(1, Math.min(val, voidQtyModal.value.max))
  }
  const addVoidQty = (delta: number) => setVoidQty(voidQty.value + delta)
  const onVoidQtyInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10)
    if (!isNaN(val)) setVoidQty(val)
  }

  const executeVoidWithdraw = (chestId: string, itemId: string, quality: Quality, qty: number) => {
    if (!warehouseStore.withdrawFromChest(chestId, itemId, qty, quality)) {
      addLog('背包已满，无法取出。')
      return
    }
    addLog(`从虚空箱取出了${getItemName(itemId)}×${qty}。`)
  }

  const executeVoidDeposit = (chestId: string, itemId: string, quality: Quality, qty: number) => {
    const actualQty = warehouseStore.depositToChest(chestId, itemId, qty, quality)
    if (actualQty <= 0) {
      addLog('虚空箱已满，无法存入。')
      return
    }
    addLog(`存入了${getItemName(itemId)}×${actualQty}到虚空箱。`)
    if (voidDepositableItems.value.length === 0 || warehouseStore.isChestFull(chestId)) {
      showVoidDepositModal.value = false
    }
  }

  const confirmVoidQty = () => {
    if (!voidQtyModal.value) return
    const { mode, chestId, itemId, quality } = voidQtyModal.value
    if (mode === 'withdraw') executeVoidWithdraw(chestId, itemId, quality, voidQty.value)
    else executeVoidDeposit(chestId, itemId, quality, voidQty.value)
    voidQtyModal.value = null
  }

  const confirmSleep = () => {
    showSleepConfirm.value = false
    pauseClock('endday')
    try {
      handleEndDay()
    } finally {
      resumeClock('endday')
    }
    switchToSeasonalBgm()
  }
</script>

<style scoped>
  .game-layout-header-actions {
    display: flex;
    justify-content: stretch;
    width: 100%;
  }

  .game-layout-sleep-btn {
    width: 100%;
    min-width: 0;
  }

  .game-side-actions {
    position: fixed;
    right: 12px;
    bottom: calc(calc(0.35rem * 10) + constant(safe-area-inset-bottom, 0px));
    bottom: calc(calc(0.35rem * 10) + env(safe-area-inset-bottom, 0px));
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .game-floating-btn,
  .mobile-hub-btn {
    position: relative;
    z-index: 40;
    width: 46px;
    height: 46px;
    border-radius: 2px;
    background: rgb(var(--color-panel));
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  @media (min-width: 768px) {
    .game-side-actions {
      right: 18px;
      bottom: 18px;
    }

    .game-floating-btn,
    .mobile-hub-btn {
      width: 48px;
      height: 48px;
    }
  }

  .game-floating-btn:hover,
  .game-floating-btn:active,
  .mobile-hub-btn:hover,
  .mobile-hub-btn:active {
    background: var(--color-accent);
    color: rgb(var(--color-bg));
  }

  .game-layout-root:fullscreen,
  .game-layout-root:-webkit-full-screen {
    width: 100vw;
    height: 100dvh;
    max-width: none;
    margin: 0;
    background: rgb(var(--color-bg));
    overflow: hidden;
    padding: var(--spacing-2);
  }

  @media (min-width: 768px) {
    .game-layout-root:fullscreen,
    .game-layout-root:-webkit-full-screen {
      padding: var(--spacing-4);
    }
  }

  .mail-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 0.625rem;
    line-height: 18px;
    text-align: center;
    border: 1px solid rgba(15, 18, 30, 0.8);
  }

  .game-layout-content {
    --game-bottom-reveal-offset: 0px;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .game-layout-body {
    width: 100%;
    max-width: 100%;
  }

  @media (max-width: 767px) {
    .game-layout-root {
      height: 100vh;
      height: 100dvh;
      min-height: 100dvh;
    }

    .game-layout-body::after {
      content: '';
      display: block;
      height: 0;
      pointer-events: none;
    }

    .game-layout-content--revealing .game-layout-body,
    .game-layout-content--rebounding .game-layout-body {
      will-change: transform;
    }

    .game-layout-content--revealing .game-layout-body,
    .game-layout-content--rebounding .game-layout-body {
      transform: translate3d(0, calc(var(--game-bottom-reveal-offset, 0px) * -1), 0);
    }

    .game-layout-content--rebounding .game-layout-body::after {
      transition: none;
    }

    .game-layout-content--rebounding .game-layout-body {
      transition: transform 160ms ease-out;
    }
  }
</style>
