<template>
  <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
    <div class="game-panel space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm text-accent">首页「关于游戏」内容管理</p>
          <p class="text-xs text-muted mt-1">支持像交流大厅一样分段编辑图文内容，每个文字段可混用 Markdown 与安全 HTML。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn !px-3 !py-2" @click="loadContent" :disabled="loading">
            {{ loading ? '加载中...' : '刷新内容' }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <div class="admin-managed-banner" :class="`admin-managed-banner--${officialManagedStatus?.source || 'local_default'}`">
        <div class="text-xs leading-6">
          官方文案状态：{{ getOfficialManagedSourceLabel(officialManagedStatus?.source) }}
          <span v-if="officialManagedStatus?.profileId"> · {{ officialManagedStatus.profileId }}</span>
          <span v-if="officialManagedStatus?.version"> · v{{ officialManagedStatus.version }}</span>
        </div>
        <div class="text-[11px] text-muted leading-5">
          “弹窗标题”和“内容正文”已改为官方云控只读，本地后台只能查看当前生效内容，不能再把它们写入本地配置。
        </div>
        <div v-if="officialManagedStatus?.lastError" class="text-[11px] text-muted leading-5">
          最近同步信息：{{ officialManagedStatus.lastError }}
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>按钮文案</span>
          <input v-model="form.aboutButtonText" type="text" maxlength="20" class="admin-input" />
        </label>

        <label class="admin-label">
          <span>弹窗标题</span>
          <input v-model="form.aboutDialogTitle" type="text" maxlength="40" class="admin-input" :disabled="aboutTitleReadonly" readonly />
        </label>
      </div>

      <label class="inline-flex items-center gap-2 text-xs text-muted">
        <input v-model="form.aboutButtonEnabled" type="checkbox" />
        <span>显示首页「关于游戏」按钮</span>
      </label>

      <label class="admin-label">
        <span>版本备注</span>
        <input v-model="summary" type="text" maxlength="120" class="admin-input" placeholder="例如：补充玩法介绍与两张配图" />
      </label>

      <div class="admin-label">
        <div class="flex items-center justify-between gap-3">
          <span>内容正文（图文块）</span>
          <span class="text-[11px] text-muted">共 {{ aboutBlocks.length }} 段</span>
        </div>
        <p class="text-[11px] text-muted leading-5">可像交流大厅发帖一样插入图片、调整段落顺序；文字段内支持标题、列表、链接等 Markdown，也支持安全 HTML 片段，如 <code>&lt;img&gt;</code>、<code>&lt;br&gt;</code>、<code>&lt;a&gt;</code>。</p>

        <div class="space-y-3">
          <div
            v-for="(block, index) in aboutBlocks"
            :key="block.id"
            class="admin-content-block"
          >
            <div class="admin-content-block__header">
              <p class="text-xs text-muted">
                {{ block.type === 'text' ? `文字段 ${index + 1}` : `图片段 ${index + 1}` }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" @click="moveBlock(index, -1)" :disabled="aboutContentReadonly || index === 0">
                  上移
                </button>
                <button class="btn !px-2 !py-1" @click="moveBlock(index, 1)" :disabled="aboutContentReadonly || index === aboutBlocks.length - 1">
                  下移
                </button>
                <button class="btn !px-2 !py-1" @click="addTextBlock(index)" :disabled="aboutContentReadonly">
                  后面加文字
                </button>
                <button class="btn !px-2 !py-1" @click="triggerInsertImage(index)" :disabled="aboutContentReadonly || uploadingImage">
                  {{ uploadingImage && pendingInsertIndex === index ? '上传中...' : '后面插图' }}
                </button>
                <button class="btn btn-danger !px-2 !py-1" @click="removeBlock(index)" :disabled="aboutContentReadonly">
                  删除
                </button>
              </div>
            </div>

            <textarea
              v-if="block.type === 'text'"
              v-model="block.text"
              rows="6"
              maxlength="6000"
              class="admin-textarea"
              :disabled="aboutContentReadonly"
              readonly
              placeholder="输入这一段正文。支持 Markdown，也支持安全 HTML，如 <img>、<br>、<a>。"
            />

            <div v-else class="space-y-2">
              <img :src="block.url" :alt="block.alt || '插图'" class="admin-editor-image" />
              <div class="text-[11px] text-muted break-all">{{ block.alt || '图片' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleImageSelected" />
        <button class="btn !px-3 !py-2" @click="addTextBlock()" :disabled="aboutContentReadonly">
          新增文字段
        </button>
        <button class="btn !px-3 !py-2" :disabled="aboutContentReadonly || uploadingImage" @click="triggerInsertImage()">
          {{ uploadingImage ? '上传中...' : '插入图片' }}
        </button>
        <button class="btn !px-3 !py-2" :disabled="savingAction !== '' || uploadingImage" @click="saveAsDraft">
          {{ savingAction === 'draft' ? '保存中...' : uploadingImage ? '等待图片上传...' : '保存草稿' }}
        </button>
        <button class="btn btn-primary !px-3 !py-2" :disabled="savingAction !== '' || uploadingImage" @click="publishContent">
          {{ savingAction === 'publish' ? '发布中...' : uploadingImage ? '等待图片上传...' : '发布到首页' }}
        </button>
      </div>

      <div class="text-xs text-muted leading-6">
        文字段支持示例：<code>## 二级标题</code>、<code>- 列表项</code>、<code>[链接](https://...)</code>、<code>&lt;img src="/api/..." width="320" alt="配图" /&gt;</code>；图片仍建议优先通过上方“插入图片”按钮上传。
      </div>
    </div>

    <div class="space-y-4">
      <div class="game-panel space-y-4">
        <div>
          <p class="text-sm text-accent">实时预览</p>
          <p class="text-xs text-muted mt-1">按首页弹窗样式近似渲染。</p>
        </div>
        <div class="admin-preview-card">
          <p class="text-[11px] text-accent mb-2">按钮文案：{{ form.aboutButtonText || '关于游戏' }}</p>
          <div class="admin-preview-body">
            <h3 class="text-sm text-accent mb-3">{{ form.aboutDialogTitle || '关于桃源乡' }}</h3>
            <div class="admin-markdown-preview" v-html="previewHtml" />
          </div>
        </div>
      </div>

      <div class="game-panel space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">版本记录</p>
          <span class="text-xs text-muted">{{ revisions.length }} 条</span>
        </div>
        <div v-if="!revisions.length" class="text-xs text-muted">暂无版本记录。</div>
        <div v-else class="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
          <div v-for="revision in revisions" :key="revision.id" class="admin-record-card text-xs text-muted space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-text">{{ revision.title || '未命名版本' }}</div>
                <div class="text-[11px] text-muted mt-1">#{{ revision.id }} · {{ revision.action }}</div>
              </div>
              <span class="admin-status" :class="revision.published ? 'admin-status--sent' : 'admin-status--draft'">
                {{ revision.published ? '已发布' : '草稿' }}
              </span>
            </div>
            <div>{{ formatTime(revision.created_at) }} · {{ revision.operator_name || revision.operator_role || '管理员' }}</div>
            <div>{{ revision.summary || '无备注' }}</div>
            <div class="flex flex-wrap gap-2">
              <button class="btn !px-2 !py-1" @click="applyRevisionToEditor(revision)">载入编辑</button>
              <button class="btn !px-2 !py-1" @click="restoreRevision(revision.id)">恢复并发布</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { renderSafeMarkdown } from '@/utils/safeMarkdown'
  import {
    fetchHomepageAboutContent,
    restoreHomepageAboutRevision,
    saveHomepageAboutContent,
    uploadAdminContentImage,
    type ContentRevisionEntry,
    type HomepageAboutContentPayload,
  } from '@/utils/adminContentApi'
  import { showFloat } from '@/composables/useGameLog'
  import type { HallContentBlock, OfficialManagedConfigKey, OfficialManagedConfigStatus } from '@/types'

  const props = defineProps<{
    canLoad: boolean
  }>()

  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024

  const form = ref<HomepageAboutContentPayload>({
    aboutButtonEnabled: true,
    aboutButtonText: '关于游戏',
    aboutDialogTitle: '关于桃源乡',
    aboutDialogContent: '',
  })
  const revisions = ref<ContentRevisionEntry[]>([])
  const loading = ref(false)
  const savingAction = ref<'draft' | 'publish' | ''>('')
  const uploadingImage = ref(false)
  const summary = ref('')
  const errorMessage = ref('')
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const pendingInsertIndex = ref<number | null>(null)
  const aboutBlocks = ref<HallContentBlock[]>([])
  const officialManagedStatus = ref<OfficialManagedConfigStatus | undefined>(undefined)
  const readonlyManagedFields = ref<OfficialManagedConfigKey[]>([])

  const createTempId = () => `about_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const createTextBlock = (text = ''): HallContentBlock => ({ id: createTempId(), type: 'text', text })
  const IMAGE_MARKDOWN_RE = /!\[([^\]]*?)\]\(([^)]+?)\)/g

  const pushTextBlock = (blocks: HallContentBlock[], rawText: string) => {
    const cleaned = rawText.replace(/^\n+|\n+$/g, '')
    if (cleaned.trim()) {
      blocks.push(createTextBlock(cleaned))
    }
  }

  const parseMarkdownToBlocks = (markdown: string) => {
    const normalized = String(markdown || '').replace(/\r\n/g, '\n')
    const blocks: HallContentBlock[] = []
    let lastIndex = 0

    for (const match of normalized.matchAll(IMAGE_MARKDOWN_RE)) {
      const index = match.index ?? 0
      pushTextBlock(blocks, normalized.slice(lastIndex, index))
      blocks.push({
        id: createTempId(),
        type: 'image',
        url: String(match[2] || '').trim(),
        alt: String(match[1] || '').trim() || '图片',
      })
      lastIndex = index + match[0].length
    }

    pushTextBlock(blocks, normalized.slice(lastIndex))
    return blocks.length ? blocks : [createTextBlock()]
  }

  const serializeBlocksToMarkdown = (blocks: HallContentBlock[]) => {
    const normalized = blocks
      .map(block => {
        if (block.type === 'image') {
          return block.url ? `![${block.alt || '图片'}](${block.url})` : ''
        }
        return block.text.trim()
      })
      .filter(Boolean)
    return normalized.join('\n\n')
  }

  const syncBlocksFromMarkdown = (markdown: string) => {
    aboutBlocks.value = parseMarkdownToBlocks(markdown)
    pendingInsertIndex.value = null
  }

  const serializedContent = computed(() => serializeBlocksToMarkdown(aboutBlocks.value))
  const previewHtml = computed(() => renderSafeMarkdown(serializedContent.value || '欢迎来到桃源乡。'))

  const readonlyManagedFieldSet = computed(() => new Set(readonlyManagedFields.value))
  const aboutTitleReadonly = computed(() => readonlyManagedFieldSet.value.has('taoyuan_about_dialog_title'))
  const aboutContentReadonly = computed(() => readonlyManagedFieldSet.value.has('taoyuan_about_dialog_content'))

  const getOfficialManagedSourceLabel = (source?: OfficialManagedConfigStatus['source']) => {
    if (source === 'official_live') return '官方云控生效中'
    if (source === 'official_cached') return '官方缓存回退中'
    return '仓库默认文案'
  }

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const loadContent = async () => {
    if (!props.canLoad) return
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await fetchHomepageAboutContent()
      form.value = { ...result.content }
      syncBlocksFromMarkdown(result.content.aboutDialogContent || '')
      revisions.value = result.revisions.revisions
      officialManagedStatus.value = result.officialManagedStatus
      readonlyManagedFields.value = result.readonlyManagedFields
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取首页关于内容失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      loading.value = false
    }
  }

  const saveContent = async (action: 'draft' | 'publish') => {
    if (!props.canLoad) return
    if (uploadingImage.value) {
      showFloat('仍有图片上传中，请等待上传完成后再保存或发布。', 'danger')
      return
    }
    savingAction.value = action
    errorMessage.value = ''
    try {
      const result = await saveHomepageAboutContent({
        ...form.value,
        aboutDialogContent: serializedContent.value,
        action,
        summary: summary.value.trim(),
      })
      form.value = { ...result.content }
      syncBlocksFromMarkdown(result.content.aboutDialogContent || '')
      summary.value = ''
      showFloat(action === 'publish' ? '首页关于内容已发布' : '草稿已保存', 'success')
      await loadContent()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存首页关于内容失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      savingAction.value = ''
    }
  }

  const saveAsDraft = () => void saveContent('draft')
  const publishContent = () => void saveContent('publish')

  const applyRevisionToEditor = (revision: ContentRevisionEntry) => {
    const currentDialogTitle = form.value.aboutDialogTitle
    const currentDialogContent = form.value.aboutDialogContent
    form.value = {
      aboutButtonEnabled: revision.payload?.aboutButtonEnabled !== false,
      aboutButtonText: revision.payload?.aboutButtonText || '关于游戏',
      aboutDialogTitle: revision.payload?.aboutDialogTitle || '关于桃源乡',
      aboutDialogContent: revision.payload?.aboutDialogContent || '',
    }
    syncBlocksFromMarkdown(revision.payload?.aboutDialogContent || '')
    if (aboutTitleReadonly.value) {
      form.value.aboutDialogTitle = currentDialogTitle
    }
    if (aboutContentReadonly.value) {
      form.value.aboutDialogContent = currentDialogContent
      syncBlocksFromMarkdown(currentDialogContent)
    }
    summary.value = revision.summary || ''
    showFloat(`已载入版本 ${revision.id}`, 'success')
  }

  const restoreRevision = async (revisionId: string) => {
    if (!props.canLoad) return
    if (typeof window !== 'undefined' && !window.confirm('确认恢复该版本并立即发布到首页吗？')) return
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await restoreHomepageAboutRevision(revisionId)
      form.value = { ...result.content }
      showFloat(`已恢复版本 ${result.restored_from}`, 'success')
      await loadContent()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '恢复内容版本失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      loading.value = false
    }
  }

  const addTextBlock = (afterIndex?: number) => {
    const block = createTextBlock()
    if (typeof afterIndex === 'number' && afterIndex >= 0) {
      aboutBlocks.value.splice(afterIndex + 1, 0, block)
    } else {
      aboutBlocks.value.push(block)
    }
  }

  const moveBlock = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= aboutBlocks.value.length) return
    const next = [...aboutBlocks.value]
    const current = next[index]
    if (!current) return
    next.splice(index, 1)
    next.splice(target, 0, current)
    aboutBlocks.value = next
  }

  const removeBlock = (index: number) => {
    aboutBlocks.value.splice(index, 1)
    if (!aboutBlocks.value.length) {
      aboutBlocks.value = [createTextBlock()]
    }
  }

  const triggerInsertImage = (afterIndex?: number) => {
    pendingInsertIndex.value = typeof afterIndex === 'number' ? afterIndex : aboutBlocks.value.length - 1
    imageInputRef.value?.click()
  }

  const handleImageSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      errorMessage.value = '仅支持 JPG、PNG、WEBP、GIF 图片'
      showFloat(errorMessage.value, 'danger')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      errorMessage.value = '单张图片不能超过 5MB'
      showFloat(errorMessage.value, 'danger')
      return
    }
    uploadingImage.value = true
    errorMessage.value = ''
    try {
      const uploaded = await uploadAdminContentImage(file)
      const insertAt = pendingInsertIndex.value !== null ? pendingInsertIndex.value + 1 : aboutBlocks.value.length
      aboutBlocks.value.splice(insertAt, 0, {
        id: createTempId(),
        type: 'image',
        url: uploaded.url,
        alt: uploaded.alt || file.name,
      })
      const nextBlock = aboutBlocks.value[insertAt + 1]
      if (!nextBlock || nextBlock.type !== 'text') {
        aboutBlocks.value.splice(insertAt + 1, 0, createTextBlock())
      }
      showFloat('图片已上传并插入内容', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '上传图片失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      uploadingImage.value = false
      pendingInsertIndex.value = null
    }
  }

  watch(
    serializedContent,
    value => {
      form.value.aboutDialogContent = value
    },
    { immediate: true }
  )

  watch(
    () => props.canLoad,
    value => {
      if (value) {
        void loadContent()
      }
    },
    { immediate: true }
  )
</script>

<style scoped>
  .admin-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: rgb(var(--color-muted));
  }

  .admin-input,
  .admin-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 2px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 13px;
  }

  .admin-textarea {
    resize: vertical;
    min-height: 180px;
  }

  .admin-record-card,
  .admin-preview-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .admin-preview-body {
    border: 1px solid rgba(200, 164, 92, 0.14);
    background: rgba(14, 18, 28, 0.46);
    border-radius: 2px;
    padding: 12px;
    min-height: 180px;
  }

  .admin-markdown-preview {
    font-size: 12px;
    line-height: 1.75;
    color: rgb(var(--color-text));
    word-break: break-word;
  }

  .admin-markdown-preview :deep(p),
  .admin-markdown-preview :deep(ul),
  .admin-markdown-preview :deep(ol),
  .admin-markdown-preview :deep(blockquote),
  .admin-markdown-preview :deep(figure),
  .admin-markdown-preview :deep(h1),
  .admin-markdown-preview :deep(h2),
  .admin-markdown-preview :deep(h3),
  .admin-markdown-preview :deep(pre),
  .admin-markdown-preview :deep(table) {
    margin: 0 0 10px;
  }

  .admin-markdown-preview :deep(ul),
  .admin-markdown-preview :deep(ol) {
    padding-left: 18px;
  }

  .admin-markdown-preview :deep(a) {
    color: rgb(var(--color-accent));
    text-decoration: underline;
  }

  .admin-markdown-preview :deep(blockquote) {
    padding-left: 10px;
    border-left: 2px solid rgba(200, 164, 92, 0.35);
    color: rgb(var(--color-text));
  }

  .admin-markdown-preview :deep(figure) {
    margin-left: 0;
    margin-right: 0;
  }

  .admin-markdown-preview :deep(figcaption) {
    margin-top: 6px;
    font-size: 11px;
    color: rgb(var(--color-muted));
    text-align: center;
  }

  .admin-markdown-preview :deep(hr) {
    border: 0;
    border-top: 1px solid rgba(200, 164, 92, 0.16);
    margin: 12px 0;
  }

  .admin-markdown-preview :deep(img) {
    display: block;
    max-width: 100%;
    border-radius: 4px;
    margin: 8px 0;
    border: 1px solid rgba(200, 164, 92, 0.12);
  }

  .admin-markdown-preview :deep(table) {
    width: 100%;
    border-collapse: collapse;
  }

  .admin-markdown-preview :deep(th),
  .admin-markdown-preview :deep(td) {
    border: 1px solid rgba(200, 164, 92, 0.14);
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  .admin-content-block {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .admin-content-block__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .admin-editor-image {
    display: block;
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    border-radius: 2px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    background: rgba(0, 0, 0, 0.16);
  }

  .admin-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .admin-status--draft {
    color: #c9ced9;
    background: rgba(120, 130, 150, 0.14);
    border-color: rgba(120, 130, 150, 0.25);
  }

  .admin-status--sent {
    color: #96deac;
    background: rgba(72, 146, 95, 0.14);
    border-color: rgba(72, 146, 95, 0.3);
  }

  .admin-managed-banner {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    padding: 10px 12px;
    background: rgba(200, 164, 92, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .admin-managed-banner--official_live {
    border-color: rgba(72, 146, 95, 0.3);
    background: rgba(72, 146, 95, 0.1);
  }

  .admin-managed-banner--official_cached {
    border-color: rgba(200, 164, 92, 0.26);
    background: rgba(200, 164, 92, 0.12);
  }

  .admin-managed-banner--local_default {
    border-color: rgba(120, 130, 150, 0.24);
    background: rgba(120, 130, 150, 0.1);
  }

  :deep(.btn-primary) {
    background: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
    border-color: rgba(200, 164, 92, 0.92);
  }

  @media (max-width: 768px) {
    .admin-content-block__header {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
