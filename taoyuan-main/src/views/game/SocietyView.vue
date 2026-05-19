<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] tracking-[0.24em] text-accent/70">村社</p>
          <p class="text-sm text-accent mt-1">从邻里互助推进到共治组织</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ societyStore.overview?.bulletin || '先把村社创建、公开展示和入社条件骨架搭起来，后续再继续补提案、投票与公共建设。' }}</p>
        </div>
        <Button class="shrink-0" :disabled="societyStore.loading || societyStore.actionRunning" @click="refreshOverview">
          刷新
        </Button>
      </div>
      <p v-if="societyStore.errorMessage" class="text-xs text-danger mt-3">{{ societyStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="space-y-3">
        <div v-if="societyStore.mySociety" class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ societyStore.mySociety.name }}</p>
              <p class="text-[10px] text-muted mt-1">{{ societyStore.mySociety.theme_label }} · {{ societyStore.mySociety.visibility_label }} · {{ societyStore.mySociety.member_count }}/{{ societyStore.mySociety.capacity }} 人</p>
            </div>
            <span class="text-[10px] text-accent">{{ societyStore.mySociety.my_role_label || '成员' }}</span>
          </div>
          <p class="text-xs text-muted mt-2 leading-5">{{ societyStore.mySociety.summary || '这个村社还没写简介。' }}</p>
          <div class="grid gap-2 md:grid-cols-2 mt-3">
            <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
              <p class="text-[10px] text-muted">徽记与主题</p>
              <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.emblem_label }} · {{ societyStore.mySociety.theme_label }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
              <p class="text-[10px] text-muted">入社条件</p>
              <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.join_requirement_label }}</p>
              <p v-if="societyStore.mySociety.join_requirement_note" class="text-[10px] text-muted mt-1">{{ societyStore.mySociety.join_requirement_note }}</p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 bg-bg/10 mt-3">
            <p class="text-[10px] text-muted mb-1">成员名单</p>
            <div v-if="societyStore.mySociety.members.length === 0" class="text-[10px] text-muted">当前还没有村社成员。</div>
            <div v-for="member in societyStore.mySociety.members" :key="`${societyStore.mySociety.id}-${member.username}`" class="flex items-center justify-between gap-2 py-1 border-b border-accent/5 last:border-b-0">
              <p class="text-xs text-text">{{ member.display_name }}</p>
              <span class="text-[10px] text-muted">{{ member.role_label }}</span>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 bg-bg/10 mt-3">
            <p class="text-[10px] text-muted mb-1">最近动态</p>
            <div v-if="societyStore.mySociety.activity_log.length === 0" class="text-[10px] text-muted">当前还没有新的村社动态。</div>
            <p v-for="entry in societyStore.mySociety.activity_log" :key="entry.id" class="text-[10px] text-muted leading-4 py-1 border-b border-accent/5 last:border-b-0">
              {{ entry.message }}
            </p>
          </div>
        </div>

        <div v-else class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-sm text-accent">创建村社</p>
            <span class="text-[10px] text-muted">L70 第一轮</span>
          </div>
          <div class="space-y-2">
            <label class="block">
              <span class="text-[10px] text-muted">村社名称</span>
              <input
                v-model="societyStore.draftName"
                maxlength="24"
                class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
                placeholder="例如：清溪灯社"
              />
            </label>
            <label class="block">
              <span class="text-[10px] text-muted">一句简介</span>
              <textarea
                v-model="societyStore.draftSummary"
                rows="3"
                maxlength="120"
                class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text resize-none"
                placeholder="写清楚这个村社想组织怎样的生活、节会和协作方式。"
              />
            </label>
            <div class="grid gap-2 md:grid-cols-2">
              <label class="block">
                <span class="text-[10px] text-muted">村社徽记</span>
                <select v-model="societyStore.draftEmblem" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                  <option v-for="entry in societyStore.emblemOptions" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">村社主题</span>
                <select v-model="societyStore.draftTheme" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                  <option v-for="entry in societyStore.themeOptions" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <label class="block">
                <span class="text-[10px] text-muted">公开范围</span>
                <select v-model="societyStore.draftVisibility" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                  <option v-for="entry in societyStore.visibilityOptions" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">成员容量</span>
                <select v-model="societyStore.draftCapacity" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                  <option v-for="entry in societyStore.capacityOptions" :key="entry.value" :value="entry.value">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
            </div>
            <label class="block">
              <span class="text-[10px] text-muted">入社条件</span>
              <select v-model="societyStore.draftJoinRequirementId" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                <option v-for="entry in societyStore.joinRequirementOptions" :key="entry.id" :value="entry.id">
                  {{ entry.label }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="text-[10px] text-muted">补充说明</span>
              <input
                v-model="societyStore.draftJoinRequirementNote"
                maxlength="80"
                class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
                placeholder="例如：希望先有公开名片和稳定经营节奏。"
              />
            </label>
            <Button class="w-full justify-center" :disabled="societyStore.actionRunning" @click="createSociety">
              创建村社
            </Button>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">公开村社</p>
        <div v-if="societyStore.visibleSocieties.length === 0" class="text-xs text-muted leading-5">当前还没有可公开查看的村社。等第一批村社建立起来后，这里会用来筛选和比较不同组织方向。</div>
        <div v-else class="space-y-2">
          <div v-for="society in societyStore.visibleSocieties" :key="society.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-text">{{ society.name }}</p>
                <p class="text-[10px] text-muted mt-1">{{ society.theme_label }} · {{ society.visibility_label }} · {{ society.member_count }}/{{ society.capacity }} 人</p>
              </div>
              <span class="text-[10px] text-accent">{{ society.emblem_label }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2 leading-4">{{ society.summary || '这个村社还没写简介。' }}</p>
            <p class="text-[10px] text-muted mt-1">入社条件：{{ society.join_requirement_label }}</p>
            <p v-if="society.join_requirement_note" class="text-[10px] text-muted mt-1">{{ society.join_requirement_note }}</p>
            <p class="text-[10px] text-muted mt-1">发起人：{{ society.leader_display_name }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import { useSocietyStore } from '@/stores/useSocietyStore'

  const societyStore = useSocietyStore()

  const refreshOverview = async () => {
    await societyStore.refreshOverview().catch(() => {})
  }

  const createSociety = async () => {
    await societyStore.submitSociety().catch(() => {})
  }

  onMounted(() => {
    void refreshOverview()
  })
</script>
