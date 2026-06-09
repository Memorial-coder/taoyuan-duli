<template>
  <section class="ai-knowledge-admin" data-testid="ai-knowledge-admin-panel">
    <div class="ai-knowledge-admin__toolbar">
      <div>
        <p class="ai-knowledge-admin__label">知识库管理</p>
        <p class="text-[0.6875rem] text-muted leading-5">
          管理 AI 助手的人工知识条目；内置条目只读，草稿发布后才会进入公开问答召回。
        </p>
      </div>
      <div class="ai-knowledge-admin__actions">
        <button class="btn" :disabled="isLoadingEntries" @click="void loadEntries()">
          <RefreshCw :size="12" />
          <span>{{ isLoadingEntries ? '刷新中...' : '刷新' }}</span>
        </button>
        <button class="btn" @click="startNewEntry">
          <FilePlus2 :size="12" />
          <span>新建</span>
        </button>
      </div>
    </div>

    <div class="ai-knowledge-admin__filters" data-testid="ai-knowledge-admin-filters">
      <input
        v-model="filters.keyword"
        class="ai-knowledge-admin__input"
        placeholder="搜索标题、关键词或正文"
        @keydown.enter.prevent="void loadEntries()"
      />
      <select v-model="filters.reviewStatus" class="ai-knowledge-admin__select" @change="void loadEntries()">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="published">已发布</option>
        <option value="archived">已归档</option>
      </select>
      <select v-model="filters.sourceType" class="ai-knowledge-admin__select" @change="void loadEntries()">
        <option value="">全部来源</option>
        <option value="manual">人工</option>
        <option value="source">源码草稿</option>
        <option value="source-auto">源码自动</option>
        <option value="built-in">内置</option>
      </select>
    </div>

    <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

    <div class="ai-knowledge-admin__layout">
      <div class="ai-knowledge-admin__list" data-testid="ai-knowledge-admin-list">
        <button
          v-for="entry in visibleEntries"
          :key="entry.id"
          type="button"
          class="ai-knowledge-admin__entry"
          :class="{ 'ai-knowledge-admin__entry--active': entry.id === selectedEntryId }"
          @click="selectEntry(entry)"
        >
          <span>{{ entry.title || '未命名知识条目' }}</span>
          <small>
            {{ reviewStatusLabel(entry.reviewStatus) }} · {{ sourceTypeLabel(entry.sourceType) }} · {{ entry.enabled ? '启用' : '停用' }}
          </small>
        </button>
        <p v-if="!visibleEntries.length && !isLoadingEntries" class="text-xs text-muted leading-6">
          暂无匹配条目。
        </p>
      </div>

      <form class="ai-knowledge-admin__editor" data-testid="ai-knowledge-admin-editor" @submit.prevent="void saveDraft()">
        <div class="ai-knowledge-admin__editor-header">
          <div>
            <p class="ai-knowledge-admin__label">{{ selectedEntryId ? '编辑知识条目' : '新建知识条目' }}</p>
            <p class="text-[0.6875rem] text-muted leading-5">
              {{ selectedEntry?.readonly ? '内置条目只读，可作为人工条目的参考。' : '保存后会写入管理知识库；发布按钮会把草稿转为公开可召回。' }}
            </p>
          </div>
          <span class="ai-knowledge-admin__status" :class="{ 'ai-knowledge-admin__status--readonly': selectedEntry?.readonly }">
            {{ selectedEntry?.readonly ? '只读' : draft.reviewStatus === 'published' ? '已发布' : draft.reviewStatus === 'archived' ? '已归档' : '草稿' }}
          </span>
        </div>

        <label class="ai-knowledge-admin__field">
          <span>标题</span>
          <input v-model="draft.title" class="ai-knowledge-admin__input" :disabled="isReadonlyEntry" maxlength="120" />
        </label>

        <div class="ai-knowledge-admin__grid">
          <label class="ai-knowledge-admin__field">
            <span>访问级别</span>
            <select v-model="draft.access" class="ai-knowledge-admin__select" :disabled="isReadonlyEntry">
              <option value="public">公开问答</option>
              <option value="standard">标准模式</option>
            </select>
          </label>
          <label class="ai-knowledge-admin__field">
            <span>审核状态</span>
            <select v-model="draft.reviewStatus" class="ai-knowledge-admin__select" :disabled="isReadonlyEntry">
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </label>
          <label class="ai-knowledge-admin__field">
            <span>来源类型</span>
            <select v-model="draft.sourceType" class="ai-knowledge-admin__select" :disabled="isReadonlyEntry">
              <option value="manual">人工</option>
              <option value="source">源码草稿</option>
              <option value="source-auto">源码自动</option>
            </select>
          </label>
          <label class="ai-knowledge-admin__toggle">
            <input v-model="draft.enabled" type="checkbox" :disabled="isReadonlyEntry" />
            <span>启用条目</span>
          </label>
        </div>

        <label class="ai-knowledge-admin__field">
          <span>关联页面（逗号分隔 routeName）</span>
          <input v-model="draft.routeNamesText" class="ai-knowledge-admin__input" :disabled="isReadonlyEntry" placeholder="farm, quests, shop" />
        </label>

        <label class="ai-knowledge-admin__field">
          <span>关键词（逗号或换行分隔）</span>
          <textarea v-model="draft.keywordsText" rows="2" class="ai-knowledge-admin__textarea" :disabled="isReadonlyEntry" />
        </label>

        <label class="ai-knowledge-admin__field">
          <span>知识正文</span>
          <textarea v-model="draft.content" rows="8" class="ai-knowledge-admin__textarea" :disabled="isReadonlyEntry" />
        </label>

        <label class="ai-knowledge-admin__field">
          <span>来源引用（可选，逗号或换行分隔）</span>
          <textarea v-model="draft.sourceRefsText" rows="2" class="ai-knowledge-admin__textarea" :disabled="isReadonlyEntry" />
        </label>

        <div class="ai-knowledge-admin__actions ai-knowledge-admin__actions--end">
          <button class="btn" type="submit" :disabled="isReadonlyEntry || isSaving || !draft.title.trim() || !draft.content.trim()">
            <Save :size="12" />
            <span>{{ isSaving ? '保存中...' : '保存条目' }}</span>
          </button>
          <button class="btn" type="button" :disabled="isReadonlyEntry || !selectedEntryId || isPublishing" @click="void publishDraft()">
            <UploadCloud :size="12" />
            <span>{{ isPublishing ? '发布中...' : '发布' }}</span>
          </button>
          <button class="btn" type="button" :disabled="isReadonlyEntry || !selectedEntryId || isDeleting" @click="void deleteDraft()">
            <Trash2 :size="12" />
            <span>{{ isDeleting ? '删除中...' : '删除' }}</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { FilePlus2, RefreshCw, Save, Trash2, UploadCloud } from 'lucide-vue-next'
  import { showFloat } from '@/composables/useGameLog'
  import {
    createAiKnowledgeEntry,
    deleteAiKnowledgeEntry,
    fetchAiKnowledgeEntries,
    publishAiKnowledgeEntry,
    updateAiKnowledgeEntry,
  } from '@/utils/taoyuanAiApi'
  import type { AiKnowledgeAccess, AiKnowledgeEntry, AiKnowledgeReviewStatus } from '@/types'

  type KnowledgeDraft = {
    title: string
    routeNamesText: string
    keywordsText: string
    content: string
    access: AiKnowledgeAccess
    enabled: boolean
    sourceType: string
    sourceRefsText: string
    reviewStatus: AiKnowledgeReviewStatus
  }

  const createEmptyDraft = (): KnowledgeDraft => ({
    title: '',
    routeNamesText: '',
    keywordsText: '',
    content: '',
    access: 'public',
    enabled: true,
    sourceType: 'manual',
    sourceRefsText: '',
    reviewStatus: 'draft',
  })

  const entries = ref<AiKnowledgeEntry[]>([])
  const selectedEntryId = ref('')
  const draft = ref<KnowledgeDraft>(createEmptyDraft())
  const isLoadingEntries = ref(false)
  const isSaving = ref(false)
  const isPublishing = ref(false)
  const isDeleting = ref(false)
  const errorMessage = ref('')
  const filters = ref({
    keyword: '',
    reviewStatus: '',
    sourceType: '',
  })

  const selectedEntry = computed(() => entries.value.find(entry => entry.id === selectedEntryId.value) || null)
  const isReadonlyEntry = computed(() => selectedEntry.value?.readonly === true)

  const parseListText = (value: string) => (
    [...new Set(
      String(value || '')
        .split(/\r?\n|,|，|;|；/)
        .map(item => item.trim())
        .filter(Boolean)
    )]
  )

  const syncDraftFromEntry = (entry: AiKnowledgeEntry) => {
    draft.value = {
      title: entry.title,
      routeNamesText: entry.routeNames.join(', '),
      keywordsText: entry.keywords.join('\n'),
      content: entry.content,
      access: entry.access,
      enabled: entry.enabled,
      sourceType: entry.sourceType || 'manual',
      sourceRefsText: entry.sourceRefs.join('\n'),
      reviewStatus: entry.reviewStatus,
    }
  }

  const buildPayloadFromDraft = (): Partial<AiKnowledgeEntry> => ({
    title: draft.value.title.trim(),
    routeNames: parseListText(draft.value.routeNamesText),
    keywords: parseListText(draft.value.keywordsText),
    content: draft.value.content.trim(),
    access: draft.value.access,
    enabled: draft.value.enabled,
    sourceType: draft.value.sourceType || 'manual',
    sourceRefs: parseListText(draft.value.sourceRefsText),
    reviewStatus: draft.value.reviewStatus,
  })

  const entryMatchesFilters = (entry: AiKnowledgeEntry) => {
    const keyword = filters.value.keyword.trim().toLowerCase()
    const reviewStatus = filters.value.reviewStatus
    const sourceType = filters.value.sourceType
    if (reviewStatus && entry.reviewStatus !== reviewStatus) return false
    if (sourceType && entry.sourceType !== sourceType) return false
    if (!keyword) return true
    const haystack = [
      entry.title,
      entry.content,
      ...entry.keywords,
      ...entry.routeNames,
      entry.sourceType,
      entry.reviewStatus,
    ].join('\n').toLowerCase()
    return haystack.includes(keyword)
  }

  const visibleEntries = computed(() => entries.value.filter(entryMatchesFilters))

  const reviewStatusLabel = (status: string) => {
    if (status === 'published') return '已发布'
    if (status === 'archived') return '已归档'
    return '草稿'
  }

  const sourceTypeLabel = (sourceType: string) => {
    if (sourceType === 'built-in') return '内置'
    if (sourceType === 'source') return '源码草稿'
    if (sourceType === 'source-auto') return '源码自动'
    return '人工'
  }

  const selectEntry = (entry: AiKnowledgeEntry) => {
    selectedEntryId.value = entry.id
    syncDraftFromEntry(entry)
  }

  const startNewEntry = () => {
    selectedEntryId.value = ''
    draft.value = createEmptyDraft()
  }

  const loadEntries = async () => {
    isLoadingEntries.value = true
    errorMessage.value = ''
    try {
      entries.value = await fetchAiKnowledgeEntries({
        keyword: filters.value.keyword,
        reviewStatus: filters.value.reviewStatus,
        sourceType: filters.value.sourceType,
      })
      if (selectedEntryId.value) {
        const nextSelected = entries.value.find(entry => entry.id === selectedEntryId.value)
        if (nextSelected) syncDraftFromEntry(nextSelected)
        else startNewEntry()
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取 AI 知识库失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      isLoadingEntries.value = false
    }
  }

  const saveDraft = async () => {
    if (isReadonlyEntry.value) return
    isSaving.value = true
    errorMessage.value = ''
    try {
      const payload = buildPayloadFromDraft()
      const saved = selectedEntryId.value
        ? await updateAiKnowledgeEntry(selectedEntryId.value, payload)
        : await createAiKnowledgeEntry(payload)
      selectedEntryId.value = saved.id
      await loadEntries()
      showFloat('AI 知识条目已保存', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存 AI 知识条目失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      isSaving.value = false
    }
  }

  const publishDraft = async () => {
    if (isReadonlyEntry.value || !selectedEntryId.value) return
    isPublishing.value = true
    errorMessage.value = ''
    try {
      const published = await publishAiKnowledgeEntry(selectedEntryId.value)
      selectedEntryId.value = published.id
      await loadEntries()
      showFloat('AI 知识条目已发布', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发布 AI 知识条目失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      isPublishing.value = false
    }
  }

  const deleteDraft = async () => {
    if (isReadonlyEntry.value || !selectedEntryId.value) return
    if (typeof window !== 'undefined' && !window.confirm('确认删除这条 AI 知识条目吗？')) return
    isDeleting.value = true
    errorMessage.value = ''
    try {
      await deleteAiKnowledgeEntry(selectedEntryId.value)
      startNewEntry()
      await loadEntries()
      showFloat('AI 知识条目已删除', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除 AI 知识条目失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      isDeleting.value = false
    }
  }

  onMounted(() => {
    void loadEntries()
  })
</script>

<style scoped>
  .ai-knowledge-admin {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ai-knowledge-admin__toolbar,
  .ai-knowledge-admin__actions,
  .ai-knowledge-admin__editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-knowledge-admin__filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(120px, auto) minmax(120px, auto);
    gap: 8px;
  }

  .ai-knowledge-admin__layout {
    display: grid;
    grid-template-columns: minmax(180px, 0.75fr) minmax(0, 1.35fr);
    gap: 12px;
    align-items: start;
  }

  .ai-knowledge-admin__list,
  .ai-knowledge-admin__editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-knowledge-admin__entry {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(255, 255, 255, 0.03);
    color: rgb(var(--color-text));
    text-align: left;
    cursor: pointer;
  }

  .ai-knowledge-admin__entry:hover,
  .ai-knowledge-admin__entry--active {
    border-color: rgba(200, 164, 92, 0.4);
    background: rgba(200, 164, 92, 0.08);
  }

  .ai-knowledge-admin__entry small,
  .ai-knowledge-admin__label,
  .ai-knowledge-admin__field span,
  .ai-knowledge-admin__status {
    font-size: 0.75rem;
  }

  .ai-knowledge-admin__entry small {
    color: rgb(var(--color-muted));
  }

  .ai-knowledge-admin__label {
    color: rgb(var(--color-text));
    opacity: 0.84;
  }

  .ai-knowledge-admin__field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .ai-knowledge-admin__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .ai-knowledge-admin__input,
  .ai-knowledge-admin__select,
  .ai-knowledge-admin__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 10px;
    border: 1px solid rgba(200, 164, 92, 0.25);
    border-radius: 2px;
    background: rgb(var(--color-bg));
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    outline: none;
  }

  .ai-knowledge-admin__textarea {
    resize: vertical;
    min-height: 64px;
  }

  .ai-knowledge-admin__input:focus,
  .ai-knowledge-admin__select:focus,
  .ai-knowledge-admin__textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .ai-knowledge-admin__toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    color: rgb(var(--color-text));
    font-size: 0.75rem;
  }

  .ai-knowledge-admin__toggle input {
    width: 16px;
    height: 16px;
    accent-color: rgb(var(--color-accent));
  }

  .ai-knowledge-admin__status {
    padding: 2px 8px;
    border: 1px solid rgba(72, 146, 95, 0.3);
    background: rgba(72, 146, 95, 0.12);
    color: rgb(var(--color-text));
  }

  .ai-knowledge-admin__status--readonly {
    border-color: rgba(200, 164, 92, 0.22);
    background: rgba(200, 164, 92, 0.08);
  }

  .ai-knowledge-admin__actions--end {
    justify-content: flex-end;
  }

  @media (max-width: 760px) {
    .ai-knowledge-admin__filters,
    .ai-knowledge-admin__layout,
    .ai-knowledge-admin__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
