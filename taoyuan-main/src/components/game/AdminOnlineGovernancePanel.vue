<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-accent">联机治理总览</p>
        <p class="text-xs text-muted mt-1">把委托补偿、误封恢复、举报与联机运行态收口到同一页，优先处理待补偿和待审核事故。</p>
      </div>
      <button class="btn" :disabled="loading" @click="void refresh()">
        <span>{{ loading ? '刷新中...' : '刷新联机治理' }}</span>
      </button>
    </div>

    <div v-if="error" class="text-xs text-danger">{{ error }}</div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in summaryCards" :key="card.label" class="admin-summary-card">
        <p class="text-[0.625rem] text-muted">{{ card.label }}</p>
        <p class="mt-2 text-lg text-accent">{{ card.value }}</p>
      </div>
    </div>

    <div class="game-panel space-y-4" data-testid="admin-content-governance-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm text-accent">内容治理闭环</p>
          <p class="text-xs text-muted mt-1">集中处理举报、风险信号、审核事件、误伤恢复和规则版本。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <input
            v-model="governanceUserFilter"
            class="online-input w-44"
            type="text"
            placeholder="用户 / ID"
          />
          <button class="btn" :disabled="loading" @click="void refresh()">
            <span>{{ loading ? '刷新中...' : '刷新治理' }}</span>
          </button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div v-for="card in contentGovernanceCards" :key="card.label" class="admin-summary-card">
          <p class="text-[0.625rem] text-muted">{{ card.label }}</p>
          <p class="mt-2 text-lg text-accent">{{ card.value }}</p>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div class="space-y-4">
          <div class="admin-record-card space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-accent">待处理治理项</p>
              <span class="text-xs text-muted">{{ filteredPendingReports.length }} / {{ pendingUnifiedReports.length }}</span>
            </div>
            <div v-if="!filteredPendingReports.length" class="text-xs text-muted">当前没有匹配的待处理治理项。</div>
            <div v-else class="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
              <div v-for="report in filteredPendingReports" :key="`${report.governance_kind}-${report.id}`" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-3 text-xs text-muted space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-accent">{{ report.governance_label }}</span>
                  <span>{{ formatTime(report.created_at) }}</span>
                </div>
                <div>对象：{{ reportTargetLabel(report) }}</div>
                <div>来源：{{ report.reporter_display_name || report.reporter || '-' }}</div>
                <div class="leading-5">原因：{{ report.reason || '-' }}</div>
                <div
                  :data-testid="`governance-report-evidence-${report.governance_kind}-${report.id}`"
                  class="rounded-xs border border-accent/10 bg-bg/20 px-3 py-2 space-y-1"
                >
                  <div class="flex flex-wrap gap-2">
                    <span class="game-chip">证据面板</span>
                    <span class="game-chip">审核事件 {{ reportRelatedModerationEvents(report).length }}</span>
                    <span class="game-chip">历史处置 {{ reportGovernanceHistory(report).length }}</span>
                    <span class="game-chip">相关风险 {{ reportRelatedRiskSignals(report).length }}</span>
                  </div>
                  <div class="leading-5">内容摘要：{{ reportEvidenceSummary(report) }}</div>
                  <div>命中类别：{{ reportEvidenceCategories(report).join('、') || '-' }}</div>
                  <div>历史处置：{{ reportGovernanceHistoryLabels(report).join('；') || '-' }}</div>
                  <div>相关风险：{{ reportRiskEvidenceLabels(report).join('；') || '-' }}</div>
                </div>
                <textarea
                  v-model="governanceNotes[governanceReportNoteKey(report)]"
                  :data-testid="`governance-report-note-${report.governance_kind}-${report.id}`"
                  class="online-input min-h-[3.25rem] w-full resize-y"
                  maxlength="160"
                  placeholder="处置备注"
                ></textarea>
                <div class="flex flex-wrap gap-2">
                  <span class="game-chip">状态 {{ report.status }}</span>
                  <span v-if="report.auto_action" class="game-chip">自动处置 {{ report.auto_action }}</span>
                  <span class="game-chip">相关风险 {{ relatedRiskCount(reportTargetUsername(report)) }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button v-if="report.governance_kind === 'hall_post_report'" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void hidePostReport(report)">
                    隐藏帖子
                  </button>
                  <button v-if="report.governance_kind === 'hall_reply_report'" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void deleteReplyReport(report)">
                    删除回复
                  </button>
                  <button v-if="report.governance_kind === 'image_report'" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void hideImageReport(report)">
                    隐藏图片
                  </button>
                  <button v-if="report.governance_kind === 'image_report'" class="btn btn-danger !px-2 !py-1" :disabled="busyId === report.id || !report.target_username" @click="void banImageUploader(report)">
                    封禁上传
                  </button>
                  <button class="btn btn-danger !px-2 !py-1" :disabled="busyId === report.id || !reportTargetUsername(report)" @click="void banReportTargetUser(report)">
                    封禁账号
                  </button>
                  <button v-if="isImageGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void resolveImageReport(report)">
                    已处置
                  </button>
                  <button v-if="isHallGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void resolveHallReport(report)">
                    已处置
                  </button>
                  <button v-if="isRiskSignalGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void updateRiskSignalReportStatus(report, 'reviewing')">
                    加入观察
                  </button>
                  <button v-if="isRiskSignalGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void updateRiskSignalReportStatus(report, 'resolved')">
                    标记处置
                  </button>
                  <span v-if="report.governance_kind === 'system_moderation_event'" class="game-chip">审核事件待复核</span>
                  <button v-if="isImageGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void dismissImageReport(report)">
                    驳回
                  </button>
                  <button v-if="isHallGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void dismissHallReport(report)">
                    驳回
                  </button>
                  <button v-if="isRiskSignalGovernanceReport(report)" class="btn !px-2 !py-1" :disabled="busyId === report.id" @click="void updateRiskSignalReportStatus(report, 'dismissed')">
                    误伤关闭
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="admin-record-card space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-accent">复核恢复</p>
              <span class="text-xs text-muted">{{ recoveryCandidateCount }} 个候选</span>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="post in hiddenPosts" :key="`post-${post.id}`" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-2 text-xs text-muted space-y-2">
                <div class="text-accent">隐藏帖子</div>
                <div>{{ post.title || post.id }}</div>
                <div>{{ post.hidden_reason || '-' }}</div>
                <input
                  v-model="governanceNotes[governanceRecoveryNoteKey('post', post.id)]"
                  :data-testid="`governance-recovery-note-post-${post.id}`"
                  class="online-input w-full"
                  maxlength="160"
                  placeholder="恢复备注"
                />
                <button class="btn !px-2 !py-1" :disabled="busyId === post.id" @click="void restoreHiddenPost(post)">恢复帖子</button>
              </div>
              <div v-for="asset in hiddenImages" :key="`asset-${asset.id || asset.url}`" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-2 text-xs text-muted space-y-2">
                <div class="text-accent">隐藏图片</div>
                <div>{{ asset.uploader_display_name || asset.uploader_username || asset.id }}</div>
                <div>{{ asset.hidden_reason || '-' }}</div>
                <input
                  v-model="governanceNotes[governanceRecoveryNoteKey('image', asset.id || asset.url)]"
                  :data-testid="`governance-recovery-note-image-${asset.id || asset.stored_name || 'asset'}`"
                  class="online-input w-full"
                  maxlength="160"
                  placeholder="恢复备注"
                />
                <button class="btn !px-2 !py-1" :disabled="busyId === (asset.id || asset.url)" @click="void restoreHiddenImage(asset)">恢复图片</button>
              </div>
              <div v-for="entry in imageBlacklist" :key="`blacklist-${entry.username}`" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-2 text-xs text-muted space-y-2">
                <div class="text-accent">图片黑名单</div>
                <div>{{ entry.display_name || entry.username }}</div>
                <div>{{ entry.reason || '-' }}</div>
                <input
                  v-model="governanceNotes[governanceRecoveryNoteKey('blacklist', entry.username)]"
                  :data-testid="`governance-recovery-note-blacklist-${entry.username}`"
                  class="online-input w-full"
                  maxlength="160"
                  placeholder="恢复备注"
                />
                <button class="btn !px-2 !py-1" :disabled="busyId === entry.username" @click="void restoreImageBlacklist(entry)">恢复上传</button>
              </div>
              <div v-for="player in bannedPlayers" :key="`banned-${player.username}`" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-2 text-xs text-muted space-y-2">
                <div class="text-accent">封禁账号</div>
                <div>{{ player.display_name || player.username }}</div>
                <div>{{ formatTime(player.banned_at || player.updated_at || player.created_at) }}</div>
                <input
                  v-model="governanceNotes[governanceRecoveryNoteKey('user', player.username)]"
                  :data-testid="`governance-recovery-note-user-${player.username}`"
                  class="online-input w-full"
                  maxlength="160"
                  placeholder="恢复备注"
                />
                <button class="btn !px-2 !py-1" :disabled="busyId === player.username" @click="void unbanUser(player.username)">恢复账号</button>
              </div>
            </div>
            <div v-if="!recoveryCandidateCount" class="text-xs text-muted">当前没有恢复候选。</div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="admin-record-card space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-accent">风险命中</p>
              <span class="text-xs text-muted">{{ filteredRiskSignals.length }} / {{ riskSignalSource.length }}</span>
            </div>
            <div class="grid gap-2 md:grid-cols-5">
              <select v-model="riskStatusFilter" class="online-select">
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="reviewing">观察中</option>
                <option value="resolved">已处置</option>
                <option value="dismissed">已关闭</option>
              </select>
              <select v-model="riskTypeFilter" class="online-select">
                <option value="all">全部类型</option>
                <option v-for="type in riskTypeOptions" :key="type" :value="type">{{ signalTypeLabel(type) }}</option>
              </select>
              <select v-model="riskSceneFilter" class="online-select">
                <option value="all">全部场景</option>
                <option v-for="scene in riskSceneOptions" :key="scene" :value="scene">{{ scene }}</option>
              </select>
              <select v-model="riskSeverityFilter" class="online-select">
                <option value="all">全部严重度</option>
                <option value="high">高风险</option>
                <option value="medium">中风险</option>
                <option value="low">低风险</option>
              </select>
              <select v-model="riskTimeFilter" class="online-select">
                <option value="all">全部时间</option>
                <option value="today">今日</option>
                <option value="24h">近 24 小时</option>
              </select>
            </div>
            <div v-if="!filteredRiskSignals.length" class="text-xs text-muted">当前没有匹配的风险信号。</div>
            <div v-else class="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              <div v-for="signal in filteredRiskSignals" :key="signal.id" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-3 text-xs text-muted space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-accent">{{ signalTypeLabel(signal.signal_type) }}</span>
                  <span>{{ formatTime(signal.updated_at || signal.created_at) }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span class="game-chip">分值 {{ signal.risk_score }}</span>
                  <span class="game-chip">严重度 {{ riskSeverityLabel(signal.risk_score) }}</span>
                  <span class="game-chip">{{ riskStatusLabel(signal.status) }}</span>
                  <span v-if="signal.scene" class="game-chip">场景 {{ signal.scene }}</span>
                </div>
                <div>对象：{{ signal.username || signal.target_id || signal.target_type }}</div>
                <div>计数：事件 {{ signal.event_count }} / 举报 {{ signal.report_count }} / 举报人 {{ signal.reporter_count }}</div>
                <div v-if="signal.matched_categories?.length">类别：{{ signal.matched_categories.join('、') }}</div>
                <div v-if="signal.image_hash_prefix">图片 hash：{{ signal.image_hash_prefix }}</div>
                <textarea
                  v-model="governanceNotes[governanceRiskNoteKey(signal)]"
                  :data-testid="`governance-risk-note-${signal.id}`"
                  class="online-input min-h-[3.25rem] w-full resize-y"
                  maxlength="160"
                  placeholder="复核备注"
                ></textarea>
                <div class="flex flex-wrap gap-2">
                  <button class="btn !px-2 !py-1" :disabled="busyId === signal.id || signal.status === 'reviewing'" @click="void updateRiskSignalStatus(signal, 'reviewing')">
                    加入观察
                  </button>
                  <button class="btn !px-2 !py-1" :disabled="busyId === signal.id || signal.status === 'resolved'" @click="void updateRiskSignalStatus(signal, 'resolved')">
                    标记处置
                  </button>
                  <button class="btn !px-2 !py-1" :disabled="busyId === signal.id || signal.status === 'dismissed'" @click="void updateRiskSignalStatus(signal, 'dismissed')">
                    误伤关闭
                  </button>
                  <button class="btn btn-danger !px-2 !py-1" :disabled="busyId === signal.id || !riskSignalTargetUsername(signal)" @click="void banRiskSignalUser(signal)">
                    封禁账号
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="admin-record-card space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-accent">审核事件</p>
              <span class="text-xs text-muted">{{ filteredModerationEvents.length }} / {{ moderationEventSource.length }}</span>
            </div>
            <div class="grid gap-2 md:grid-cols-4">
              <select v-model="eventSceneFilter" class="online-select">
                <option value="all">全部场景</option>
                <option v-for="scene in eventSceneOptions" :key="scene" :value="scene">{{ scene }}</option>
              </select>
              <select v-model="eventActionFilter" class="online-select">
                <option value="all">全部动作</option>
                <option v-for="action in eventActionOptions" :key="action" :value="action">{{ action }}</option>
              </select>
              <select v-model="eventTimeFilter" class="online-select">
                <option value="all">全部时间</option>
                <option value="today">今日</option>
                <option value="24h">近 24 小时</option>
              </select>
              <select v-model="eventOutcomeFilter" class="online-select">
                <option value="all">全部结果</option>
                <option v-for="outcome in eventOutcomeOptions" :key="outcome" :value="outcome">{{ outcome }}</option>
              </select>
            </div>
            <div v-if="!filteredModerationEvents.length" class="text-xs text-muted">当前没有匹配的审核事件。</div>
            <div v-else class="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              <div v-for="event in filteredModerationEvents" :key="event.id" class="rounded-xs border border-accent/10 bg-bg/10 px-3 py-3 text-xs text-muted space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-accent">{{ event.scene || event.content_type }}</span>
                  <span>{{ formatTime(event.created_at) }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span class="game-chip">{{ event.action }}</span>
                  <span class="game-chip">{{ event.severity || '-' }}</span>
                  <span class="game-chip">结果 {{ event.outcome || '-' }}</span>
                  <span class="game-chip">规则 {{ event.rule_version || '-' }}</span>
                </div>
                <div>用户：{{ event.username || '-' }} / 字段：{{ event.field || '-' }}</div>
                <div>类别：{{ event.matched_category || '-' }}</div>
                <div class="leading-5">摘要：{{ event.content_excerpt || '-' }}</div>
              </div>
            </div>
          </div>

          <div class="admin-record-card space-y-2 text-xs text-muted">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-accent">规则 metadata</p>
              <span>{{ rulesMetadata?.source || '-' }}</span>
            </div>
            <div>版本：{{ rulesMetadata?.version || '-' }}</div>
            <div>更新时间：{{ formatTime(rulesMetadata?.updated_at) }}</div>
            <div>硬拦截分类 {{ rulesMetadata?.hard_block_category_count || 0 }} / 词条 {{ rulesMetadata?.hard_block_term_count || 0 }}</div>
            <div>软拦截分类 {{ rulesMetadata?.soft_block_category_count || 0 }} / 词条 {{ rulesMetadata?.soft_block_term_count || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm text-accent">联机发布控制</p>
          <p class="text-xs text-muted mt-1 leading-5">把内测环境、灰度通道、模块开关、样板和发布说明收口到同一页；默认 stable 全开，不会主动影响现有玩家。</p>
        </div>
        <button class="btn" :disabled="savingReleaseConfig || !releaseConfigDraft" @click="void saveReleaseConfig()">
          <span>{{ savingReleaseConfig ? '保存中...' : '保存发布配置' }}</span>
        </button>
      </div>

      <div v-if="releaseConfigDraft" class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="admin-record-card space-y-3 text-xs text-muted">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">联机测试环境</span>
                <button class="btn !px-2 !py-1" @click="releaseConfigDraft.enabled = !releaseConfigDraft.enabled">
                  {{ releaseConfigDraft.enabled ? '关闭' : '开启' }}
                </button>
              </div>
              <div>当前状态：{{ releaseConfigDraft.enabled ? '已启用' : '已关闭' }}</div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="btn !px-2 !py-1"
                  :class="{ '!bg-success !text-bg': releaseConfigDraft.grayChannel === 'stable' }"
                  @click="releaseConfigDraft.grayChannel = 'stable'"
                >
                  稳定
                </button>
                <button
                  class="btn !px-2 !py-1"
                  :class="{ '!bg-warning !text-bg': releaseConfigDraft.grayChannel === 'canary' }"
                  @click="releaseConfigDraft.grayChannel = 'canary'"
                >
                  灰度
                </button>
              </div>
              <div>白名单 {{ releaseConfigDraft.whitelistUsernames.length }} 个账号。</div>
            </div>

            <div class="admin-record-card space-y-3 text-xs text-muted">
              <div class="text-accent">测试账号白名单</div>
              <textarea
                v-model="releaseConfigDraft.testWhitelist"
                rows="5"
                class="online-textarea w-full"
                placeholder="一行一个用户名，或使用逗号分隔"
              />
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div v-for="moduleCard in releaseModuleCards" :key="moduleCard.key" class="admin-record-card space-y-2 text-xs text-muted">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">{{ moduleCard.label }}</span>
                <button class="btn !px-2 !py-1" @click="toggleReleaseModule(moduleCard.key)">
                  {{ moduleCard.enabled ? '关闭' : '开放' }}
                </button>
              </div>
              <div>{{ moduleCard.summary }}</div>
              <div>状态：{{ moduleCard.enabled ? '已开放' : '已关闭' }}</div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">内测庄园样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.manor" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试村社样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.society" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试节会样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.festival" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试远征样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.expedition" type="text" class="online-input w-full" />
            </label>
          </div>
        </div>

        <div class="space-y-4">
          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">事故预案</p>
            <div v-for="plan in incidentPlaybooks" :key="plan.title" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2">
              <div class="text-accent">{{ plan.title }}</div>
              <div class="mt-1 leading-5">{{ plan.summary }}</div>
            </div>
          </div>

          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">发布说明</p>
            <label class="space-y-1 block">
              <span>新功能说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.features" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>可见变化说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.visibleChanges" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>玩家注意事项</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.playerNotice" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>已知问题说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.knownIssues" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>回退策略说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.rollbackPlan" rows="5" class="online-textarea w-full" />
            </label>
          </div>

          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">发布闸门</p>
            <div v-for="item in releaseChecklistItems" :key="item.id" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">{{ item.label }}</span>
                <span>{{ item.owner }}</span>
              </div>
            </div>
            <div class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
              <div class="text-accent">默认公告模板</div>
              <div v-for="line in releaseAnnouncementLines" :key="line" class="mt-1">{{ line }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div>
        <p class="text-sm text-accent">联机扩展模板</p>
        <p class="text-xs text-muted mt-1 leading-5">把后续新内容接入约束先写死：默认复用现有 runtime、状态机、结算凭证和五大面板，不另起第二套底层。</p>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div v-for="template in expansionTemplates" :key="template.id" class="admin-record-card space-y-2 text-xs text-muted">
          <div class="flex items-center justify-between gap-2">
            <span class="text-accent">{{ template.label }}</span>
            <span>{{ template.module }}</span>
          </div>
          <div>挂点：{{ template.anchors }}</div>
          <div>交付：{{ template.delivery }}</div>
          <div>验收：{{ template.acceptance }}</div>
        </div>
      </div>
      <div class="grid gap-3 xl:grid-cols-3">
        <div v-for="group in expansionSlotGroups" :key="group.id" class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">{{ group.label }}</p>
          <div v-for="item in group.items" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div>
        <p class="text-sm text-accent">联机版本整理</p>
        <p class="text-xs text-muted mt-1 leading-5">把当前已落地功能、待补项、风险、灰度口径和最终验收条件汇总到一个后台可读页面，方便后续继续扩线时对照。</p>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div v-for="section in versionHandoffSections" :key="section.id" class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">{{ section.label }}</p>
          <div v-for="item in section.items" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">阶段检查点</p>
          <div v-for="item in stageCheckpoints" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
        <div class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">最终验收口径</p>
          <div v-for="item in finalAcceptanceItems" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
      <div class="space-y-4">
        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">委托补偿</p>
            <span class="text-xs text-muted">{{ pendingCompensations.length }} 条待处理</span>
          </div>
          <div v-if="!pendingCompensations.length" class="text-xs text-muted">当前没有待处理的委托补偿。</div>
          <div v-else class="space-y-2">
            <div
              v-for="entry in pendingCompensations"
              :key="entry.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">#{{ entry.id }}</span>
                <span>{{ formatTime(entry.updated_at || entry.created_at) }}</span>
              </div>
              <div>单号：{{ entry.order_id }}{{ entry.stage_id ? ` / 阶段 ${entry.stage_id}` : '' }}</div>
              <div>发布人：{{ entry.owner_username }} · 承接人：{{ entry.assignee_username }}</div>
              <div>原因：{{ entry.reason || entry.last_error || '待补偿' }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === entry.id" @click="void retryCompensation(entry.id)">
                  {{ busyId === entry.id ? '处理中...' : '重放补偿' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">委托回滚</p>
            <span class="text-xs text-muted">仅允许回滚仍处于 open、尚未交付的委托</span>
          </div>
          <div v-if="!rollbackableOrders.length" class="text-xs text-muted">当前没有可安全回滚的委托。</div>
          <div v-else class="space-y-2">
            <div
              v-for="order in rollbackableOrders"
              :key="order.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ order.title || order.id }}</span>
                <span>{{ order.scope }} / {{ order.delivery_status }}</span>
              </div>
              <div>发布人：{{ order.owner_display_name || order.owner_username }}</div>
              <div>承接人：{{ order.assignee_display_name || order.assignee_username || '未接单' }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-danger !px-2 !py-1" :disabled="busyId === order.id" @click="void rollbackOrder(order.id)">
                  {{ busyId === order.id ? '处理中...' : '回滚委托' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">结算重放</p>
            <span class="text-xs text-muted">{{ retryableRooms.length }} 个房间仍在结算中</span>
          </div>
          <div v-if="!retryableRooms.length" class="text-xs text-muted">当前没有需要重放结算的活动房间。</div>
          <div v-else class="space-y-2">
            <div
              v-for="room in retryableRooms"
              :key="room.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ room.title || room.id }}</span>
                <span>{{ room.activity_domain }} / {{ room.state }}</span>
              </div>
              <div>房主：{{ room.host_display_name || room.host_username }}</div>
              <div>成员：{{ room.members?.length || 0 }} 人</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === room.id" @click="void retryRoomSettlement(room.id)">
                  {{ busyId === room.id ? '处理中...' : '重放结算' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">误封恢复</p>
            <span class="text-xs text-muted">最近封禁账号</span>
          </div>
          <div v-if="!bannedPlayers.length" class="text-xs text-muted">当前没有可恢复的封禁账号。</div>
          <div v-else class="space-y-2">
            <div
              v-for="player in bannedPlayers"
              :key="player.username"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ player.display_name || player.username }}</span>
                <span>@{{ player.username }}</span>
              </div>
              <div>封禁时间：{{ formatTime(player.banned_at || player.updated_at || player.created_at) }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === player.username" @click="void unbanUser(player.username)">
                  {{ busyId === player.username ? '处理中...' : '恢复正常' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">联机模块概览</p>
            <span class="text-xs text-muted">当前快照</span>
          </div>
          <div class="text-xs text-muted space-y-2">
            <div>最近玩家：{{ recentPlayerCount }} 个</div>
            <div>村社：{{ societyCount }} 个</div>
            <div>活动房间：{{ activeRoomCount }} 个</div>
            <div>热门庄园：{{ hotManorCount }} 个</div>
            <div>图片黑名单：{{ imageBlacklistCount }} 条</div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">待处理举报</p>
            <span class="text-xs text-muted">帖子 {{ hallReports.length }} / 图片 {{ imageReports.length }}</span>
          </div>
          <div v-if="!hallReports.length && !imageReports.length" class="text-xs text-muted">当前没有待处理举报。</div>
          <div v-else class="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
            <div v-for="report in hallReports" :key="report.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">帖子举报</span>
                <span>{{ formatTime(report.created_at) }}</span>
              </div>
              <div>{{ report.target_author_display_name || report.target_author || report.post_id }}</div>
              <div>{{ report.reason }}</div>
            </div>
            <div v-for="report in imageReports" :key="report.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">图片举报</span>
                <span>{{ formatTime(report.created_at) }}</span>
              </div>
              <div>{{ report.target_display_name || report.target_username }}</div>
              <div>{{ report.reason }}</div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">联机审计</p>
            <span class="text-xs text-muted">最近 {{ auditLogs.length }} 条</span>
          </div>
          <div v-if="!auditLogs.length" class="text-xs text-muted">当前没有在线审计日志。</div>
          <div v-else class="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
            <div v-for="log in auditLogs" :key="log.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ log.action || log.route_key || 'online' }}</span>
                <span>{{ formatTime(log.created_at) }}</span>
              </div>
              <div>玩家：{{ log.username || '-' }} → {{ log.target_username || '-' }}</div>
              <div>结果：{{ log.outcome || '-' }} / {{ log.status_code || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showFloat } from '@/composables/useGameLog'
import { WS12_COMPENSATION_PLANS, WS12_RELEASE_ANNOUNCEMENT, WS12_RELEASE_CHECKLIST } from '@/data/goals'
import {
  ONLINE_EXPANSION_SLOT_GROUPS,
  ONLINE_EXPANSION_TEMPLATES,
  ONLINE_FINAL_ACCEPTANCE,
  ONLINE_STAGE_CHECKPOINTS,
  ONLINE_VERSION_HANDOFF_SECTIONS,
} from '@/data/onlineExpansion'
import type {
  AdminContentModerationEvent,
  AdminContentModerationRulesMetadata,
  AdminContentRiskSignal,
  AdminOnlineOverviewPayload,
  OnlineReleaseConfig,
} from '@/types'
import {
  banAdminOnlineUser,
  fetchAdminContentModerationEvents,
  fetchAdminContentModerationRulesMetadata,
  fetchAdminContentRiskSignals,
  fetchAdminGovernanceAuditLogs,
  fetchAdminOnlineAuditLogs,
  fetchAdminOnlineOverview,
  fetchAdminOnlineReleaseConfig,
  retryAdminActivitySettlement,
  rollbackAdminCoopOrder,
  retryAdminCoopCompensation,
  saveAdminOnlineReleaseConfig,
  updateAdminContentRiskSignalStatus,
  unbanAdminOnlineUser,
} from '@/utils/adminOnlineApi'
import {
  deleteHallReplyByAdmin,
  fetchHallAdminImageReports,
  hideHallImageByAdmin,
  hideHallPostByAdmin,
  setHallImageAssetVisibility,
  setHallImageBlacklist,
  updateHallAdminImageReportStatus,
  updateHallAdminReportStatus,
} from '@/utils/taoyuanHallApi'
const props = defineProps<{
  canLoad: boolean
}>()

interface AdminGovernanceReport extends Record<string, any> {
  id: string
  governance_kind: 'hall_post_report' | 'hall_reply_report' | 'image_report' | 'user_risk_signal' | 'system_risk_signal' | 'system_moderation_event'
  governance_label: string
  target_username: string
  target_display_name: string
  reporter?: string
  reporter_display_name?: string
  reason?: string
  status?: string
  auto_action?: string
  created_at?: number
  post_id?: string
  reply_id?: string | null
  image_url?: string
  risk_signal_id?: string
  moderation_event_id?: string
  request_id?: string
  scene?: string
  content_id?: string
}

const loading = ref(false)
const busyId = ref('')
const error = ref('')
const savingReleaseConfig = ref(false)
const createDefaultReleaseConfig = (): OnlineReleaseConfig => ({
  enabled: true,
  grayChannel: 'stable',
  featureFlags: {
    socialFriendsEnabled: true,
    manorVisitEnabled: true,
    coopOrderEnabled: true,
    festivalRoomEnabled: true,
    expeditionRoomEnabled: true,
  },
  moduleSwitches: {
    social: true,
    manor: true,
    order: true,
    festival: true,
    expedition: true,
    society: true,
  },
  testWhitelist: '',
  whitelistUsernames: [],
  betaTemplates: {
    manor: '桃源联机内测样板庄园',
    society: '桃源联机测试村社',
    festival: '桃源联机测试节会',
    expedition: '桃源联机测试远征',
  },
  releaseNotes: {
    features: '',
    visibleChanges: '',
    playerNotice: '',
    knownIssues: '',
    rollbackPlan: '',
  },
})

const cloneReleaseConfig = (config: OnlineReleaseConfig): OnlineReleaseConfig => JSON.parse(JSON.stringify(config))
const overview = ref<AdminOnlineOverviewPayload | null>(null)
const auditLogs = ref<Array<Record<string, any>>>([])
const governanceAuditLogs = ref<Array<Record<string, any>>>([])
const moderationEvents = ref<AdminContentModerationEvent[]>([])
const riskSignals = ref<AdminContentRiskSignal[]>([])
const rulesMetadata = ref<AdminContentModerationRulesMetadata | null>(null)
const adminImageReports = ref<Array<Record<string, any>>>([])
const adminImageAssets = ref<Array<Record<string, any>>>([])
const adminImageBlacklist = ref<Array<Record<string, any>>>([])
const releaseConfigDraft = ref<OnlineReleaseConfig>(createDefaultReleaseConfig())
const governanceUserFilter = ref('')
const riskStatusFilter = ref<'pending' | 'reviewing' | 'resolved' | 'dismissed' | 'all'>('all')
const riskTypeFilter = ref('all')
const riskSceneFilter = ref('all')
const riskSeverityFilter = ref<'all' | 'high' | 'medium' | 'low'>('all')
const riskTimeFilter = ref<'all' | 'today' | '24h'>('all')
const eventSceneFilter = ref('all')
const eventActionFilter = ref('all')
const eventOutcomeFilter = ref('all')
const eventTimeFilter = ref<'all' | 'today' | '24h'>('all')
const governanceNotes = ref<Record<string, string>>({})

const summaryCards = computed(() => {
  const summary = overview.value?.summary
  if (!summary) return []
  return [
    { label: '活动房间', value: summary.active_room_count },
    { label: '活动待补偿', value: summary.pending_activity_receipt_count },
    { label: '委托待补偿', value: summary.pending_coop_compensation_count },
    { label: '待审核举报', value: summary.pending_hall_report_count + summary.pending_image_report_count },
  ]
})

const pendingCompensations = computed(() => (overview.value?.coop.compensations || []) as Array<Record<string, any>>)
const rollbackableOrders = computed(() => ((overview.value?.coop.orders || []) as Array<Record<string, any>>)
  .filter(order => order.status === 'open' && order.delivery_status === 'none' && !order.assignee_username))
const retryableRooms = computed(() => ((overview.value?.activities.rooms || []) as Array<Record<string, any>>)
  .filter(room => room.state === 'settling'))
const bannedPlayers = computed(() => ((overview.value?.recent_players || []) as Array<Record<string, any>>)
  .filter(player => player.status === 'banned'))
const hallReports = computed(() => ((overview.value?.hall.reports || []) as Array<Record<string, any>>)
  .filter(report => report.status === 'pending'))
const imageReports = computed(() => ((adminImageReports.value.length ? adminImageReports.value : overview.value?.hall.image_reports || []) as Array<Record<string, any>>)
  .filter(report => report.status === 'pending'))
const societyCount = computed(() => (overview.value?.societies || []).length)
const activeRoomCount = computed(() => (overview.value?.activities.rooms || []).length)
const hotManorCount = computed(() => (overview.value?.manor.hot_manors || []).length)
const recentPlayerCount = computed(() => (overview.value?.recent_players || []).length)
const imageBlacklist = computed(() => adminImageBlacklist.value.length ? adminImageBlacklist.value : (overview.value?.hall.image_blacklist || []))
const imageBlacklistCount = computed(() => imageBlacklist.value.length)
const hiddenPosts = computed(() => ((overview.value?.hall.recent_posts || []) as Array<Record<string, any>>)
  .filter(post => post.hidden === true))
const hiddenImages = computed(() => adminImageAssets.value.filter(asset => asset.status === 'hidden'))
const moderationEventSource = computed(() => moderationEvents.value.length ? moderationEvents.value : (overview.value?.hall.moderation_events || []))
const riskSignalSource = computed(() => riskSignals.value.length ? riskSignals.value : (overview.value?.hall.risk_signals || []))
const normalizedUserFilter = computed(() => governanceUserFilter.value.trim().toLocaleLowerCase('zh-CN'))
const isPendingModerationEventForUnifiedList = (event: AdminContentModerationEvent) => {
  const scene = String(event.scene || '').toLocaleLowerCase('zh-CN')
  const action = String(event.action || '').toLocaleLowerCase('zh-CN')
  const outcome = String(event.outcome || '').toLocaleLowerCase('zh-CN')
  if (scene.startsWith('hall_') || scene.startsWith('image_')) return false
  return action === 'soft_block' || outcome === 'pending_review' || outcome === 'queued_for_review'
}
const pendingModerationEventReports = computed<AdminGovernanceReport[]>(() => moderationEventSource.value
  .filter(isPendingModerationEventForUnifiedList)
  .map(event => ({
    id: event.id,
    governance_kind: 'system_moderation_event',
    governance_label: event.username ? '用户入口待审' : '系统入口待审',
    target_username: event.username || '',
    target_display_name: event.username || event.scene || event.content_type || event.id,
    reporter: 'content_moderation_event',
    reporter_display_name: '审核事件流水',
    reason: event.matched_category || event.action || '内容审核命中',
    status: event.outcome || event.action || 'pending',
    auto_action: '',
    created_at: event.created_at,
    moderation_event_id: event.id,
    request_id: event.request_id,
    scene: event.scene,
    content_id: event.content_id,
    content_type: event.content_type,
    content_excerpt: event.content_excerpt,
    matched_categories: event.matched_category ? [event.matched_category] : [],
  } as AdminGovernanceReport)))
const pendingRiskSignalReports = computed<AdminGovernanceReport[]>(() => riskSignalSource.value
  .filter(signal => signal.status === 'pending' && signal.signal_type !== 'multi_report_auto_hide')
  .map(signal => {
    const username = riskSignalTargetUsername(signal)
    return {
      id: signal.id,
      governance_kind: username ? 'user_risk_signal' : 'system_risk_signal',
      governance_label: username ? '用户风险待审' : '系统风险待审',
      target_username: username,
      target_display_name: username || signal.target_id || signal.signal_type,
      reporter: 'content_risk_signal',
      reporter_display_name: '风险自动发现',
      reason: signal.reason_code || signalTypeLabel(signal.signal_type),
      status: riskStatusLabel(signal.status),
      auto_action: signal.outcome,
      created_at: signal.updated_at || signal.created_at,
      risk_signal_id: signal.id,
      request_id: signal.request_id,
      scene: signal.scene,
      content_id: signal.content_id,
      content_type: signal.content_type,
      image_hash_prefix: signal.image_hash_prefix,
      matched_categories: signal.matched_categories,
    } as AdminGovernanceReport
  }))
const pendingUnifiedReports = computed<AdminGovernanceReport[]>(() => [
  ...hallReports.value.map(report => ({
    ...report,
    governance_kind: report.type === 'reply' ? 'hall_reply_report' : 'hall_post_report',
    governance_label: report.type === 'reply' ? '回复举报' : '帖子举报',
    target_username: report.target_author || report.author || '',
    target_display_name: report.target_author_display_name || report.target_author || report.post_id,
  } as AdminGovernanceReport)),
  ...imageReports.value.map(report => ({
    ...report,
    governance_kind: 'image_report',
    governance_label: '图片举报',
    target_username: report.target_username || '',
    target_display_name: report.target_display_name || report.target_username || report.image_url,
  } as AdminGovernanceReport)),
  ...pendingModerationEventReports.value,
  ...pendingRiskSignalReports.value,
].sort((left, right) => (Number(right.created_at) || 0) - (Number(left.created_at) || 0)))
const filteredPendingReports = computed<AdminGovernanceReport[]>(() => {
  const keyword = normalizedUserFilter.value
  if (!keyword) return pendingUnifiedReports.value
  return pendingUnifiedReports.value.filter(report => [
    report.reporter,
    report.reporter_display_name,
    report.target_username,
    report.target_display_name,
    report.post_id,
    report.reply_id,
    report.image_url,
    report.request_id,
    report.risk_signal_id,
    report.moderation_event_id,
    report.scene,
    report.content_id,
    report.governance_label,
    report.reason,
  ].some(value => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword)))
})
const riskTypeOptions = computed(() => Array.from(new Set(riskSignalSource.value.map(signal => signal.signal_type).filter(Boolean))))
const riskSceneOptions = computed(() => Array.from(new Set(riskSignalSource.value.map(signal => signal.scene).filter(Boolean))))
const eventSceneOptions = computed(() => Array.from(new Set(moderationEventSource.value.map(event => event.scene).filter(Boolean))))
const eventActionOptions = computed(() => Array.from(new Set(moderationEventSource.value.map(event => event.action).filter(Boolean))))
const eventOutcomeOptions = computed(() => Array.from(new Set(moderationEventSource.value.map(event => event.outcome).filter(Boolean))))
const riskScoreInSeverity = (score: number) => {
  if (riskSeverityFilter.value === 'high') return score >= 70
  if (riskSeverityFilter.value === 'medium') return score >= 40 && score < 70
  if (riskSeverityFilter.value === 'low') return score < 40
  return true
}
const riskInTimeFilter = (timestamp: number) => {
  const seconds = Number(timestamp) || 0
  if (!seconds || riskTimeFilter.value === 'all') return true
  const now = Math.floor(Date.now() / 1000)
  if (riskTimeFilter.value === '24h') return seconds >= now - 86400
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return seconds >= Math.floor(today.getTime() / 1000)
}
const filteredRiskSignals = computed(() => {
  const keyword = normalizedUserFilter.value
  return riskSignalSource.value.filter(signal => {
    if (riskStatusFilter.value !== 'all' && signal.status !== riskStatusFilter.value) return false
    if (riskTypeFilter.value !== 'all' && signal.signal_type !== riskTypeFilter.value) return false
    if (riskSceneFilter.value !== 'all' && signal.scene !== riskSceneFilter.value) return false
    if (!riskScoreInSeverity(Number(signal.risk_score) || 0)) return false
    if (!riskInTimeFilter(Number(signal.updated_at || signal.created_at) || 0)) return false
    if (keyword) {
      const users = [signal.username, signal.target_id, ...(Array.isArray(signal.usernames) ? signal.usernames : [])]
      if (!users.some(value => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))) return false
    }
    return true
  })
})
const eventInTimeFilter = (timestamp: number) => {
  const seconds = Number(timestamp) || 0
  if (!seconds || eventTimeFilter.value === 'all') return true
  const now = Math.floor(Date.now() / 1000)
  if (eventTimeFilter.value === '24h') return seconds >= now - 86400
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return seconds >= Math.floor(today.getTime() / 1000)
}
const filteredModerationEvents = computed(() => {
  const keyword = normalizedUserFilter.value
  return moderationEventSource.value.filter(event => {
    if (eventSceneFilter.value !== 'all' && event.scene !== eventSceneFilter.value) return false
    if (eventActionFilter.value !== 'all' && event.action !== eventActionFilter.value) return false
    if (eventOutcomeFilter.value !== 'all' && event.outcome !== eventOutcomeFilter.value) return false
    if (!eventInTimeFilter(event.created_at)) return false
    if (keyword && ![event.username, event.content_id, event.request_id].some(value => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))) {
      return false
    }
    return true
  })
})
const todayModerationEventCount = computed(() => moderationEventSource.value.filter(event => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Number(event.created_at) >= Math.floor(today.getTime() / 1000)
}).length)
const autoTemporaryHiddenCount = computed(() => {
  const reportCount = pendingUnifiedReports.value.filter(report => !!report.auto_action).length
  const signalCount = riskSignalSource.value.filter(signal => signal.outcome === 'auto_temporarily_hidden').length
  return reportCount + signalCount
})
const repeatRiskUserCount = computed(() => new Set(
  riskSignalSource.value
    .filter(signal => signal.signal_type === 'repeat_hard_block' && signal.username)
    .map(signal => signal.username),
).size)
const recoveryCandidateCount = computed(() => hiddenPosts.value.length + hiddenImages.value.length + bannedPlayers.value.length + imageBlacklist.value.length)
const contentGovernanceCards = computed(() => [
  { label: '今日命中', value: todayModerationEventCount.value },
  { label: '待处理', value: pendingUnifiedReports.value.length },
  { label: '自动临时隐藏', value: autoTemporaryHiddenCount.value },
  { label: '重复风险用户', value: repeatRiskUserCount.value },
  { label: '恢复候选', value: recoveryCandidateCount.value },
  { label: '规则版本', value: rulesMetadata.value?.version || '-' },
])
const releaseChecklistItems = computed(() => WS12_RELEASE_CHECKLIST)
const releaseAnnouncementLines = computed(() => [...WS12_RELEASE_ANNOUNCEMENT])
const expansionTemplates = computed(() => ONLINE_EXPANSION_TEMPLATES)
const expansionSlotGroups = computed(() => ONLINE_EXPANSION_SLOT_GROUPS)
const versionHandoffSections = computed(() => ONLINE_VERSION_HANDOFF_SECTIONS)
const stageCheckpoints = computed(() => ONLINE_STAGE_CHECKPOINTS)
const finalAcceptanceItems = computed(() => ONLINE_FINAL_ACCEPTANCE)
const releaseModuleCards = computed(() => {
  const draft = releaseConfigDraft.value
  if (!draft) return []
  return [
    {
      key: 'social' as const,
      label: '好友功能',
      enabled: draft.moduleSwitches.social && draft.featureFlags.socialFriendsEnabled,
      summary: '对应好友关系、申请、接受和拒绝链路，可单独小范围灰度。'
    },
    {
      key: 'manor' as const,
      label: '庄园互访',
      enabled: draft.moduleSwitches.manor && draft.featureFlags.manorVisitEnabled,
      summary: '对应庄园公开页、留言、来访记录与收藏关注读写。'
    },
    {
      key: 'order' as const,
      label: '求助单',
      enabled: draft.moduleSwitches.order && draft.featureFlags.coopOrderEnabled,
      summary: '对应委托发布、接单、交付、确认和补偿重试链路。'
    },
    {
      key: 'festival' as const,
      label: '节会房间',
      enabled: draft.moduleSwitches.festival && draft.featureFlags.festivalRoomEnabled,
      summary: '对应房间创建、邀请、准备、断线恢复、结算和关闭链路。'
    },
    {
      key: 'expedition' as const,
      label: '远征房间',
      enabled: draft.moduleSwitches.expedition && draft.featureFlags.expeditionRoomEnabled,
      summary: '对应远征房间创建、邀请、准备、玩法动作、结算和关闭链路。'
    },
  ]
})
const incidentPlaybooks = computed(() => [
  {
    title: '结算失败回滚',
    summary: `当前可直接处理委托回滚 ${rollbackableOrders.value.length} 条、结算重放 ${retryableRooms.value.length} 个房间。`
  },
  {
    title: '送礼失败补发',
    summary: `通过邮件管理页的补偿 / 活动奖励模板补发玩家礼物或说明；当前可复用 ${WS12_COMPENSATION_PLANS.length} 条既有补偿预案，不改原有结算口径。`
  },
  {
    title: '房间断线补偿',
    summary: '节会与远征房间已支持 disconnect / reconnect；若房间停在 settling，可在本页继续执行结算重放。'
  },
  {
    title: '公共事件重算',
    summary: '世界事件以实时总览为准，先切回 stable，再按当前世界事件总览与 smoke 链路复核公共进度与纪年快照。'
  },
  {
    title: '审核误伤恢复',
    summary: `当前可直接恢复误封账号；若涉及图片 / 大厅误伤，再结合现有举报与黑名单面板回滚可见性。最近封禁 ${bannedPlayers.value.length} 个账号。`
  },
])

const formatTime = (timestamp?: number | null) => {
  if (!timestamp) return '-'
  return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const riskStatusLabel = (status?: string) => {
  if (status === 'reviewing') return '观察中'
  if (status === 'resolved') return '已处置'
  if (status === 'dismissed') return '已关闭'
  return '待处理'
}

const riskSeverityLabel = (score?: number) => {
  const value = Number(score) || 0
  if (value >= 70) return '高'
  if (value >= 40) return '中'
  return '低'
}

const signalTypeLabel = (type?: string) => {
  if (type === 'repeat_hard_block') return '短时多次命中'
  if (type === 'multi_report_auto_hide') return '多人举报隐藏'
  if (type === 'duplicate_image_hash_reuse') return '重复图片 hash'
  if (type === 'multi_account_ip_publish') return '同 IP hash 多账号'
  return type || '风险信号'
}

const findReportPost = (report: Record<string, any>) => {
  const postId = String(report.post_id || '')
  return ((overview.value?.hall.recent_posts || []) as Array<Record<string, any>>).find(post => String(post.id || '') === postId) || null
}

const findReportReply = (report: Record<string, any>) => {
  const post = findReportPost(report)
  const replyId = String(report.reply_id || '')
  if (!post || !replyId || !Array.isArray(post.replies)) return null
  return post.replies.find((reply: Record<string, any>) => String(reply.id || '') === replyId) || null
}

const reportTargetUsername = (report: Record<string, any>) => {
  if (report.governance_kind === 'user_risk_signal' || report.governance_kind === 'system_risk_signal' || report.governance_kind === 'system_moderation_event') {
    return String(report.target_username || '')
  }
  if (report.governance_kind === 'image_report') return String(report.target_username || '')
  const reply = findReportReply(report)
  if (reply?.author) return String(reply.author)
  const post = findReportPost(report)
  return String(report.target_author || post?.author || '')
}

const isHallGovernanceReport = (report: Record<string, any>) => (
  report.governance_kind === 'hall_post_report' || report.governance_kind === 'hall_reply_report'
)
const isImageGovernanceReport = (report: Record<string, any>) => report.governance_kind === 'image_report'
const isRiskSignalGovernanceReport = (report: Record<string, any>) => (
  report.governance_kind === 'user_risk_signal' || report.governance_kind === 'system_risk_signal'
)

const riskSignalTargetUsername = (signal: AdminContentRiskSignal) => {
  if (signal.username) return signal.username
  if (signal.target_type === 'user' && signal.target_id) return signal.target_id
  return ''
}

const reportTargetLabel = (report: Record<string, any>) => {
  if (report.governance_kind === 'image_report') {
    return String(report.target_display_name || report.target_username || report.image_url || '-')
  }
  const reply = findReportReply(report)
  if (reply) return String(reply.author_display_name || reply.author || report.reply_id || '-')
  const post = findReportPost(report)
  return String(report.target_display_name || report.target_author_display_name || post?.author_display_name || post?.author || report.post_id || '-')
}

const compactEvidenceText = (value: unknown, maxLength = 80) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return '-'
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const reportEvidenceIds = (report: Record<string, any>) => Array.from(new Set([
  report.id,
  report.post_id,
  report.reply_id,
  report.image_url,
  report.stored_name,
  report.content_id,
  report.request_id,
  report.risk_signal_id,
  report.moderation_event_id,
].map(value => String(value || '').trim()).filter(Boolean)))

const reportEvidenceUsers = (report: Record<string, any>) => Array.from(new Set([
  reportTargetUsername(report),
  report.target_username,
  report.target_author,
  report.author,
  report.reporter,
].map(value => String(value || '').trim().toLocaleLowerCase('zh-CN')).filter(Boolean)))

const reportEvidenceMatches = (report: Record<string, any>, values: unknown[]) => {
  const ids = reportEvidenceIds(report).map(value => value.toLocaleLowerCase('zh-CN'))
  const users = reportEvidenceUsers(report)
  const haystack = values
    .map(value => String(value || '').toLocaleLowerCase('zh-CN'))
    .join('|')
  return [...ids, ...users].some(value => value && haystack.includes(value))
}

const reportRelatedModerationEvents = (report: Record<string, any>) => moderationEventSource.value
  .filter(event => reportEvidenceMatches(report, [
    event.request_id,
    event.id,
    event.username,
    event.content_type,
    event.content_id,
    event.content_hash,
  ]))
  .slice(0, 3)

const reportRelatedRiskSignals = (report: Record<string, any>) => riskSignalSource.value
  .filter(signal => reportEvidenceMatches(report, [
    signal.id,
    signal.username,
    signal.target_id,
    signal.content_id,
    signal.request_id,
    ...(Array.isArray(signal.report_ids) ? signal.report_ids : []),
    ...(Array.isArray(signal.usernames) ? signal.usernames : []),
  ]))
  .slice(0, 3)

const reportGovernanceHistory = (report: Record<string, any>) => governanceAuditLogs.value
  .filter(log => reportEvidenceMatches(report, [
    log.id,
    log.target_username,
    log.target_id,
    log.action,
    log.reason,
    JSON.stringify(log.detail || {}),
  ]))
  .slice(0, 3)

const reportPostText = (post: Record<string, any> | null) => {
  if (!post) return ''
  if (Array.isArray(post.blocks)) {
    return post.blocks
      .map((block: Record<string, any>) => block.text || block.caption || block.alt || '')
      .filter(Boolean)
      .join(' ')
  }
  return post.content || post.summary || post.title || ''
}

const reportEvidenceSummary = (report: Record<string, any>) => {
  const event = reportRelatedModerationEvents(report)[0]
  if (report.governance_kind === 'image_report') {
    return compactEvidenceText(
      event?.content_excerpt
        || report.reason
        || report.image_hash_prefix
        || report.stored_name
        || report.image_url,
    )
  }
  const reply = findReportReply(report)
  const post = findReportPost(report)
  return compactEvidenceText(
    event?.content_excerpt
      || reply?.content
      || report.content_excerpt
      || reportPostText(post)
      || report.reason,
  )
}

const reportEvidenceCategories = (report: Record<string, any>) => Array.from(new Set([
  ...reportRelatedModerationEvents(report).map(event => event.matched_category),
  ...reportRelatedRiskSignals(report).flatMap(signal => signal.matched_categories || []),
].map(value => String(value || '').trim()).filter(Boolean))).slice(0, 5)

const reportGovernanceHistoryLabels = (report: Record<string, any>) => reportGovernanceHistory(report)
  .map(log => compactEvidenceText(`${log.action || '治理动作'} ${log.outcome || ''} ${formatTime(log.created_at)}`, 60))

const reportRiskEvidenceLabels = (report: Record<string, any>) => reportRelatedRiskSignals(report)
  .map(signal => compactEvidenceText(`${signalTypeLabel(signal.signal_type)} / ${riskStatusLabel(signal.status)} / 分值 ${signal.risk_score}`, 60))

const relatedRiskCount = (username: string) => {
  const normalized = username.trim().toLocaleLowerCase('zh-CN')
  if (!normalized) return 0
  return riskSignalSource.value.filter(signal => {
    const users = [signal.username, signal.target_id, ...(Array.isArray(signal.usernames) ? signal.usernames : [])]
    return users.some(value => String(value || '').toLocaleLowerCase('zh-CN') === normalized)
  }).length
}

const governanceReportNoteKey = (report: Record<string, any>) => `report:${report.governance_kind || 'report'}:${report.id || ''}`
const governanceRiskNoteKey = (signal: AdminContentRiskSignal) => `risk:${signal.id}`
const governanceRecoveryNoteKey = (kind: string, id: unknown) => `recovery:${kind}:${String(id || '')}`
const governanceNote = (key: string) => String(governanceNotes.value[key] || '').trim().slice(0, 160)
const reportAdminNote = (report: Record<string, any>) => governanceNote(governanceReportNoteKey(report))
const riskAdminNote = (signal: AdminContentRiskSignal) => governanceNote(governanceRiskNoteKey(signal))
const recoveryAdminNote = (kind: string, id: unknown) => governanceNote(governanceRecoveryNoteKey(kind, id))

const withGovernanceBusy = async (id: string, successMessage: string, runner: () => Promise<void>) => {
  await withBusy(id, async () => {
    await runner()
    showFloat(successMessage, 'success')
  })
}

const resolveHallReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '举报已标记为已处理', async () => {
    await updateHallAdminReportStatus(String(report.id), 'resolved', String(report.reason || ''), {
      adminNote: reportAdminNote(report),
    })
  })
}

const dismissHallReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '举报已驳回', async () => {
    await updateHallAdminReportStatus(String(report.id), 'dismissed', String(report.reason || ''), {
      adminNote: reportAdminNote(report),
    })
  })
}

const hidePostReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '帖子已隐藏并处理举报', async () => {
    const adminNote = reportAdminNote(report)
    await hideHallPostByAdmin(String(report.post_id), true, String(report.reason || '举报处置'), {
      reportId: String(report.id),
      adminNote,
    })
    await updateHallAdminReportStatus(String(report.id), 'resolved', String(report.reason || '举报处置'), {
      adminNote,
    })
  })
}

const deleteReplyReport = async (report: Record<string, any>) => {
  if (!report.reply_id) return
  await withGovernanceBusy(report.id, '回复已删除并处理举报', async () => {
    const adminNote = reportAdminNote(report)
    await deleteHallReplyByAdmin(String(report.post_id), String(report.reply_id), {
      reason: String(report.reason || '举报处置'),
      reportId: String(report.id),
      adminNote,
    })
    await updateHallAdminReportStatus(String(report.id), 'resolved', String(report.reason || '举报处置'), {
      adminNote,
    })
  })
}

const resolveImageReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '图片举报已标记为已处理', async () => {
    await updateHallAdminImageReportStatus(String(report.id), 'resolved', String(report.reason || ''), {
      adminNote: reportAdminNote(report),
    })
  })
}

const dismissImageReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '图片举报已驳回', async () => {
    await updateHallAdminImageReportStatus(String(report.id), 'dismissed', String(report.reason || ''), {
      adminNote: reportAdminNote(report),
    })
  })
}

const hideImageReport = async (report: Record<string, any>) => {
  await withGovernanceBusy(report.id, '图片已隐藏并处理举报', async () => {
    await hideHallImageByAdmin(String(report.id), String(report.reason || '举报处置'), {
      adminNote: reportAdminNote(report),
    })
  })
}

const banImageUploader = async (report: Record<string, any>) => {
  const username = String(report.target_username || '').trim()
  if (!username) return
  await withGovernanceBusy(report.id, '上传者已加入图片黑名单', async () => {
    const adminNote = reportAdminNote(report)
    await setHallImageBlacklist(username, true, String(report.reason || '图片违规处理'), { adminNote })
    await hideHallImageByAdmin(String(report.id), String(report.reason || '图片违规处理'), { adminNote })
  })
}

const banReportTargetUser = async (report: Record<string, any>) => {
  const username = reportTargetUsername(report).trim()
  if (!username) return
  if (typeof window !== 'undefined' && !window.confirm(`确认封禁账号 ${username} 吗？`)) return
  await withGovernanceBusy(report.id, '账号已封禁', async () => {
    await banAdminOnlineUser(username, {
      reason: String(report.reason || '内容举报处置'),
      adminNote: reportAdminNote(report),
    })
  })
}

const banRiskSignalUser = async (signal: AdminContentRiskSignal) => {
  const username = riskSignalTargetUsername(signal).trim()
  if (!username) return
  if (typeof window !== 'undefined' && !window.confirm(`确认封禁账号 ${username} 吗？`)) return
  await withGovernanceBusy(signal.id, '账号已封禁', async () => {
    await banAdminOnlineUser(username, {
      reason: signal.reason_code || signalTypeLabel(signal.signal_type),
      adminNote: riskAdminNote(signal),
    })
  })
}

const restoreHiddenPost = async (post: Record<string, any>) => {
  await withGovernanceBusy(post.id, '帖子已恢复', async () => {
    await hideHallPostByAdmin(String(post.id), false, '误伤恢复', {
      adminNote: recoveryAdminNote('post', post.id),
    })
  })
}

const restoreHiddenImage = async (asset: Record<string, any>) => {
  await withGovernanceBusy(asset.id || asset.url, '图片已恢复', async () => {
    await setHallImageAssetVisibility(String(asset.url), false, '误伤恢复', {
      adminNote: recoveryAdminNote('image', asset.id || asset.url),
    })
  })
}

const restoreImageBlacklist = async (entry: Record<string, any>) => {
  const username = String(entry.username || '').trim()
  if (!username) return
  await withGovernanceBusy(username, '图片上传限制已解除', async () => {
    await setHallImageBlacklist(username, false, '误伤恢复', {
      adminNote: recoveryAdminNote('blacklist', username),
    })
  })
}

const updateRiskSignalStatus = async (signal: AdminContentRiskSignal, status: AdminContentRiskSignal['status']) => {
  await withGovernanceBusy(signal.id, '风险信号已更新', async () => {
    await updateAdminContentRiskSignalStatus(signal.id, status, status === 'reviewing' ? '加入观察' : '人工复核', {
      adminNote: riskAdminNote(signal),
    })
  })
}

const updateRiskSignalReportStatus = async (report: AdminGovernanceReport, status: AdminContentRiskSignal['status']) => {
  const signalId = String(report.risk_signal_id || report.id || '').trim()
  if (!signalId) return
  await withGovernanceBusy(report.id, '风险信号已更新', async () => {
    await updateAdminContentRiskSignalStatus(signalId, status, status === 'reviewing' ? '加入观察' : '统一列表复核', {
      adminNote: reportAdminNote(report),
    })
  })
}

const refresh = async () => {
  if (!props.canLoad) return
  loading.value = true
  error.value = ''
  try {
    const [nextOverview, nextAudit, nextGovernanceAudit, nextReleaseConfig, nextEvents, nextSignals, nextRules, nextImageModeration] = await Promise.all([
      fetchAdminOnlineOverview(),
      fetchAdminOnlineAuditLogs(),
      fetchAdminGovernanceAuditLogs({ pageSize: 120 }),
      fetchAdminOnlineReleaseConfig(),
      fetchAdminContentModerationEvents({ pageSize: 80 }),
      fetchAdminContentRiskSignals({ status: 'all', pageSize: 80 }),
      fetchAdminContentModerationRulesMetadata(),
      fetchHallAdminImageReports(),
    ])
    overview.value = nextOverview
    auditLogs.value = Array.isArray(nextAudit.logs) ? nextAudit.logs : []
    governanceAuditLogs.value = Array.isArray(nextGovernanceAudit.logs) ? nextGovernanceAudit.logs : []
    releaseConfigDraft.value = cloneReleaseConfig(nextReleaseConfig)
    moderationEvents.value = Array.isArray(nextEvents.events) ? nextEvents.events : []
    riskSignals.value = Array.isArray(nextSignals.signals) ? nextSignals.signals : []
    rulesMetadata.value = nextRules
    adminImageReports.value = Array.isArray(nextImageModeration.reports) ? nextImageModeration.reports : []
    adminImageAssets.value = Array.isArray(nextImageModeration.assets) ? nextImageModeration.assets : []
    adminImageBlacklist.value = Array.isArray(nextImageModeration.blacklist) ? nextImageModeration.blacklist : []
  } catch (err) {
    releaseConfigDraft.value = createDefaultReleaseConfig()
    error.value = err instanceof Error ? err.message : '获取联机治理数据失败'
  } finally {
    loading.value = false
  }
}

const normalizeWhitelistDraft = (draft: OnlineReleaseConfig) => {
  draft.testWhitelist = draft.testWhitelist
    .split(/\r?\n|,/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join('\n')
  draft.whitelistUsernames = draft.testWhitelist
    ? draft.testWhitelist.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
    : []
}

const toggleReleaseModule = (moduleKey: 'social' | 'manor' | 'order' | 'festival' | 'expedition') => {
  if (!releaseConfigDraft.value) return
  if (moduleKey === 'social') {
    releaseConfigDraft.value.moduleSwitches.social = !releaseConfigDraft.value.moduleSwitches.social
    releaseConfigDraft.value.featureFlags.socialFriendsEnabled = releaseConfigDraft.value.moduleSwitches.social
    return
  }
  if (moduleKey === 'manor') {
    releaseConfigDraft.value.moduleSwitches.manor = !releaseConfigDraft.value.moduleSwitches.manor
    releaseConfigDraft.value.featureFlags.manorVisitEnabled = releaseConfigDraft.value.moduleSwitches.manor
    return
  }
  if (moduleKey === 'order') {
    releaseConfigDraft.value.moduleSwitches.order = !releaseConfigDraft.value.moduleSwitches.order
    releaseConfigDraft.value.featureFlags.coopOrderEnabled = releaseConfigDraft.value.moduleSwitches.order
    return
  }
  if (moduleKey === 'expedition') {
    releaseConfigDraft.value.moduleSwitches.expedition = !releaseConfigDraft.value.moduleSwitches.expedition
    releaseConfigDraft.value.featureFlags.expeditionRoomEnabled = releaseConfigDraft.value.moduleSwitches.expedition
    return
  }
  releaseConfigDraft.value.moduleSwitches.festival = !releaseConfigDraft.value.moduleSwitches.festival
  releaseConfigDraft.value.featureFlags.festivalRoomEnabled = releaseConfigDraft.value.moduleSwitches.festival
}

const saveReleaseConfig = async () => {
  savingReleaseConfig.value = true
  try {
    normalizeWhitelistDraft(releaseConfigDraft.value)
    const saved = await saveAdminOnlineReleaseConfig(releaseConfigDraft.value)
    releaseConfigDraft.value = cloneReleaseConfig(saved)
    showFloat('联机发布配置已保存', 'success')
  } catch (err) {
    showFloat(err instanceof Error ? err.message : '保存联机发布配置失败', 'danger')
  } finally {
    savingReleaseConfig.value = false
  }
}

const withBusy = async (id: string, runner: () => Promise<void>) => {
  busyId.value = id
  try {
    await runner()
    await refresh()
  } finally {
    busyId.value = ''
  }
}

const retryCompensation = async (compensationId: string) => {
  await withBusy(compensationId, async () => {
    await retryAdminCoopCompensation(compensationId)
    showFloat('补偿已重放', 'success')
  })
}

const rollbackOrder = async (orderId: string) => {
  if (typeof window !== 'undefined' && !window.confirm('确认回滚这条未交付委托吗？')) return
  await withBusy(orderId, async () => {
    await rollbackAdminCoopOrder(orderId)
    showFloat('委托已回滚', 'success')
  })
}

const retryRoomSettlement = async (roomId: string) => {
  await withBusy(roomId, async () => {
    await retryAdminActivitySettlement(roomId)
    showFloat('活动结算已重放', 'success')
  })
}

const unbanUser = async (username: string) => {
  if (typeof window !== 'undefined' && !window.confirm(`确认恢复账号 ${username} 为正常状态吗？`)) return
  await withBusy(username, async () => {
    await unbanAdminOnlineUser(username, {
      reason: '误伤恢复',
      adminNote: recoveryAdminNote('user', username),
    })
    showFloat('账号已恢复正常', 'success')
  })
}

onMounted(() => {
  void refresh()
})
</script>

<style scoped>
.admin-summary-card {
  border: 1px solid rgba(227, 179, 65, 0.16);
  background: rgba(12, 16, 24, 0.22);
  border-radius: 10px;
  padding: 0.9rem 1rem;
}
</style>
