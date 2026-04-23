/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
<template>
  <div class="min-h-screen px-1 py-4 md:px-2 md:py-5 xl:px-3 2xl:px-4" :class="{ 'pt-10': Capacitor.isNativePlatform() }">
    <div class="w-full space-y-4">
      <div class="game-panel space-y-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <button class="btn" @click="goBack">
              <ArrowLeft :size="14" />
              <span>返回首页</span>
            </button>
            <div>
              <h1 class="text-accent text-lg md:text-xl mb-2 flex items-center gap-2">
                <ShieldCheck :size="18" />
                桃源管理
              </h1>
              <p class="text-xs text-muted leading-6">
                桃源乡独立版的管理入口，当前已接入邮箱发奖、首页公告和 AI 助手配置。管理员口令需要由部署者在后端环境变量中单独配置，
                前端不会内置默认口令。
              </p>
            </div>
          </div>

          <div class="admin-top-actions">
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'mail' }" @click="switchAdminTab('mail')">
              <span>邮件管理</span>
            </button>
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'content' }" @click="switchAdminTab('content')">
              <span>首页关于</span>
            </button>
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'android' }" @click="switchAdminTab('android')">
              <span>安卓发布</span>
            </button>
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'logs' }" @click="switchAdminTab('logs')">
              <span>日志中心</span>
            </button>
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'ai' }" @click="switchAdminTab('ai')">
              <span>AI 助手</span>
            </button>
            <button
              v-if="hasAdminAccess && officialControlTabVisible"
              class="btn"
              :class="{ '!bg-accent !text-bg': activeAdminTab === 'cloud' }"
              @click="switchAdminTab('cloud')"
            >
              <span>云控平台</span>
            </button>
            <button class="btn" :class="{ '!bg-accent !text-bg': activeAdminTab === 'debug' }" @click="switchAdminTab('debug')">
              <Bug :size="14" />
              <span>后期调试</span>
            </button>
            <button class="btn" @click="openUserAdmin">
              <Users :size="14" />
              <span>用户管理</span>
            </button>
            <button class="btn" @click="handleRefreshClick" :disabled="loadingCampaigns || !hasToken || activeAdminTab !== 'mail'">
              <RefreshCw :size="14" />
              <span>{{ loadingCampaigns ? '刷新中...' : '刷新记录' }}</span>
            </button>
            <button class="btn" @click="handleCreateNewMail" :disabled="activeAdminTab !== 'mail'">
              <Plus :size="14" />
              <span>新建邮件</span>
            </button>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label class="admin-label">
            <span>管理员口令</span>
            <input
              v-model="adminTokenInput"
              type="password"
              class="admin-input"
              placeholder="填写管理员口令"
              @keydown.enter.prevent="saveAdminTokenAndReload"
            />
          </label>
          <button class="btn" @click="saveAdminTokenAndReload" :disabled="savingToken || !adminTokenInput.trim()">
            <KeyRound :size="14" />
            <span>{{ savingToken ? '验证中...' : '保存并验证' }}</span>
          </button>
          <button class="btn" @click="clearAdminTokenValue" :disabled="savingToken && !adminTokenInput">
            <Trash2 :size="14" />
            <span>清空口令</span>
          </button>
        </div>

        <div class="text-xs leading-6">
          <span v-if="adminSession" class="text-success">
            已连接 {{ adminSession.role_label }} 权限。{{ canManageMail ? '可直接发送桃源乡邮件。' : '当前口令不具备邮件运营权限，但可查看内容、AI、日志与基础后台模块。' }}
          </span>
          <span v-else-if="tokenError" class="text-danger">{{ tokenError }}</span>
          <span v-else class="text-muted">填写管理员口令后即可进入桃源管理，查看邮件、内容、AI、日志与后期调试入口。</span>
        </div>
      </div>

      <div v-if="hasToken && activeAdminTab === 'mail' && canManageMail" class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.85fr)]">
        <div class="game-panel space-y-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">{{ composer.id ? `编辑草稿 #${composer.id}` : '新建邮箱邮件' }}</p>
            <div class="admin-composer-actions">
              <button class="btn !px-2 !py-1" @click="useHasSaveRecipients">
                <span>仅发给有服务端存档的账号</span>
              </button>
              <button class="btn !px-2 !py-1" @click="handleClearComposer">
                <span>清空表单</span>
              </button>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="admin-label">
              <span>内置模板</span>
              <select class="admin-select" :value="composer.template_type" @change="handleTemplateSelectChange">
                <option v-for="item in templateOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>

            <label class="admin-label">
              <span>收件范围</span>
              <select class="admin-select" v-model="composer.recipient_rule.mode">
                <option v-for="item in recipientOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="admin-tip-card text-xs leading-6">
            <div class="text-accent">当前发送对象：{{ recipientSummary }}</div>
            <div class="text-muted">发送前请再次确认收件范围，避免误发。</div>
          </div>

          <label class="admin-label">
            <span>邮件标题</span>
            <input v-model="composer.title" type="text" maxlength="60" class="admin-input" />
          </label>

          <label class="admin-label">
            <span>邮件正文</span>
            <textarea v-model="composer.content" rows="5" class="admin-textarea" />
          </label>

          <div v-if="composer.recipient_rule.mode === 'single'" class="admin-label">
            <span>选择收件账号</span>
            <div class="recipient-search-row">
              <input
                v-model="recipientSearchKeyword"
                type="text"
                class="admin-input"
                placeholder="输入用户名或显示名后查找"
                @keydown.enter.prevent="searchRecipients()"
              />
              <button class="btn recipient-search-row__action" type="button" :disabled="recipientSearchLoading" @click="searchRecipients()">
                <Search :size="14" />
                <span>{{ recipientSearchLoading ? '查找中...' : '查找用户' }}</span>
              </button>
            </div>
            <div v-if="composer.recipient_rule.username" class="recipient-picked-list">
              <span class="recipient-picked-chip recipient-picked-chip--single">
                已选：{{ composer.recipient_rule.username }}（{{ formatTargetSlot(composer.recipient_rule.target_slot) }}）
                <button type="button" class="recipient-chip-remove" @click="clearSingleRecipient()">×</button>
              </span>
            </div>
            <div v-if="recipientSearchLoading" class="text-xs text-muted">正在查找用户...</div>
            <div v-else-if="recipientSearchResults.length" class="recipient-search-results">
              <div v-for="user in recipientSearchResults" :key="user.username" class="recipient-search-item recipient-search-item--block">
                <div>
                  <div class="text-sm text-text">{{ user.display_name || user.username }}</div>
                  <div class="text-[11px] text-muted">@{{ user.username }}</div>
                </div>
                <div class="recipient-slot-actions">
                  <button
                    v-for="slotOption in getRecipientSlotOptions(user)"
                    :key="`${user.username}_${slotOption.target_slot ?? 'account'}`"
                    type="button"
                    class="btn !px-2 !py-1"
                    @click="selectSingleRecipient(user.username, slotOption.target_slot)"
                  >
                    {{ slotOption.label }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="recipientSearchPerformed" class="text-xs text-muted">没有找到匹配用户。</div>
          </div>

          <div v-if="composer.recipient_rule.mode === 'batch'" class="admin-label">
            <span>选择批量收件账号</span>
            <div class="recipient-search-row">
              <input
                v-model="recipientSearchKeyword"
                type="text"
                class="admin-input"
                placeholder="输入用户名或显示名后查找"
                @keydown.enter.prevent="searchRecipients()"
              />
              <button class="btn recipient-search-row__action" type="button" :disabled="recipientSearchLoading" @click="searchRecipients()">
                <Search :size="14" />
                <span>{{ recipientSearchLoading ? '查找中...' : '查找用户' }}</span>
              </button>
            </div>
            <div class="recipient-picked-list">
              <span v-if="!batchRecipientList.length" class="text-xs text-muted">还未选择任何账号。</span>
              <span
                v-for="target in batchRecipientList"
                :key="`${target.username}_${target.target_slot ?? 'account'}`"
                class="recipient-picked-chip"
              >
                {{ target.username }}（{{ formatTargetSlot(target.target_slot) }}）
                <button type="button" class="recipient-chip-remove" @click="removeBatchRecipient(target.username, target.target_slot)">×</button>
              </span>
            </div>
            <div v-if="recipientSearchLoading" class="text-xs text-muted">正在查找用户...</div>
            <div v-else-if="recipientSearchResults.length" class="recipient-search-results">
              <div v-for="user in recipientSearchResults" :key="user.username" class="recipient-search-item recipient-search-item--block">
                <div>
                  <div class="text-sm text-text">{{ user.display_name || user.username }}</div>
                  <div class="text-[11px] text-muted">@{{ user.username }}</div>
                </div>
                <div class="recipient-slot-actions">
                  <button
                    v-for="slotOption in getRecipientSlotOptions(user)"
                    :key="`${user.username}_${slotOption.target_slot ?? 'account'}`"
                    type="button"
                    class="btn !px-2 !py-1"
                    :disabled="isBatchRecipientSelected(user.username, slotOption.target_slot)"
                    @click="addBatchRecipient(user.username, slotOption.target_slot)"
                  >
                    {{ isBatchRecipientSelected(user.username, slotOption.target_slot) ? `${slotOption.label} 已添加` : `添加 ${slotOption.label}` }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="recipientSearchPerformed" class="text-xs text-muted">没有找到匹配用户。</div>
          </div>

          <label v-if="composer.recipient_rule.mode === 'keyword'" class="admin-label">
            <span>用户名关键词</span>
            <input v-model="composer.recipient_rule.keyword" type="text" class="admin-input" />
          </label>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="admin-label">
              <span>过期规则</span>
              <select class="admin-select" v-model="composer.expire_mode">
                <option value="never">永不过期</option>
                <option value="datetime">指定过期时间</option>
              </select>
            </label>

            <label class="admin-label">
              <span>过期时间</span>
              <input
                v-model="composer.expires_at"
                type="datetime-local"
                class="admin-input"
                :disabled="composer.expire_mode !== 'datetime'"
              />
            </label>

            <label class="admin-label">
              <span>定时发送</span>
              <input v-model="composer.scheduled_at" type="datetime-local" class="admin-input" />
            </label>

            <label class="admin-label">
              <span>重复装备补偿</span>
              <input v-model.number="composer.duplicate_compensation_money" type="number" min="0" class="admin-input" />
            </label>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-accent">奖励配置</p>
              <button class="btn !px-2 !py-1" @click="addReward">
                <Plus :size="14" />
                <span>添加奖励</span>
              </button>
            </div>

            <div v-if="!composer.rewards.length" class="text-xs text-muted">当前是纯文字公告，不附带奖励。</div>

            <div v-for="(reward, index) in composer.rewards" :key="reward.uid" class="admin-reward-card">
              <div class="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-end">
                <label class="admin-label">
                  <span>奖励类型</span>
                  <select class="admin-select" :value="reward.type" @change="handleRewardTypeSelectChange(index, $event)">
                    <option v-for="item in rewardTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </label>

                <template v-if="reward.type === 'money'">
                  <label class="admin-label">
                    <span>桃源乡 money</span>
                    <input v-model.number="reward.amount" type="number" min="1" class="admin-input" />
                  </label>
                </template>

                <template v-else>
                  <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
                    <label class="admin-label">
                      <span>搜索奖励</span>
                      <input
                        v-model="reward.filterKeyword"
                        type="text"
                        class="admin-input"
                        placeholder="按名称、ID 或描述筛选"
                      />
                    </label>

                    <label class="admin-label">
                      <span>{{ getRewardFilterLabel(reward.type) }}</span>
                      <select class="admin-select" v-model="reward.filterValue">
                        <option v-for="item in getFilterOptions(reward.type)" :key="item.value" :value="item.value">{{ item.label }}</option>
                      </select>
                    </label>
                  </div>
                </template>

              </div>

              <div class="flex justify-end mt-3">
                <button class="btn btn-danger !px-3 !py-2 w-full md:w-auto" @click="removeReward(index)">
                  <span>删除</span>
                </button>
              </div>

              <template v-if="reward.type !== 'money'">
                <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-end mt-3">
                  <label class="admin-label">
                    <span>奖励条目</span>
                    <select class="admin-select" v-model="reward.id">
                      <option value="">{{ getRewardSelectPlaceholder(reward.type) }}</option>
                      <option
                        v-for="item in getRewardEntries(reward)"
                        :key="`${reward.type}-${item.id}`"
                        :value="item.id"
                      >
                        {{ `${item.name} (${item.id})` }}
                      </option>
                    </select>
                  </label>

                  <label class="admin-label">
                    <span>数量</span>
                    <input v-model.number="reward.quantity" type="number" min="1" class="admin-input" />
                  </label>

                  <label v-if="reward.type === 'item' || reward.type === 'seed'" class="admin-label">
                    <span>品质</span>
                    <select class="admin-select" v-model="reward.quality">
                      <option v-for="item in qualityOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                    </select>
                  </label>
                </div>

                <div class="mt-2 text-xs text-muted leading-6">
                  <template v-if="getSelectedRewardEntry(reward)">
                    {{ getSelectedRewardEntry(reward)?.subtitle }}<br />
                    {{ getSelectedRewardEntry(reward)?.description }}
                  </template>
                  <template v-else>
                    当前筛选下没有命中条目，可以调整关键词或筛选条件。
                  </template>
                </div>
              </template>
            </div>

            <div class="text-xs text-muted leading-6">
              奖励条目现在直接来自桃源乡数据表，不再手填内部 ID。装备重复时按上面的补偿金额自动转为
              `money`，没填补偿则跳过并记入发放结果。
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn" @click="submitCampaign('draft')" :disabled="!!submittingCampaign || !isAuthorized">
              <span>{{ submittingCampaign === 'draft' ? '保存中...' : '保存草稿' }}</span>
            </button>
            <button class="btn" @click="submitCampaign('schedule')" :disabled="!!submittingCampaign || !isAuthorized">
              <span>{{ submittingCampaign === 'schedule' ? '处理中...' : '定时发送' }}</span>
            </button>
            <button class="btn btn-primary" @click="submitCampaign('send')" :disabled="!!submittingCampaign || !isAuthorized">
              <span>{{ submittingCampaign === 'send' ? '发送中...' : '立即发送' }}</span>
            </button>
          </div>
        </div>

        <div class="game-panel space-y-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">邮件记录</p>
            <span class="text-xs text-muted">共 {{ campaigns.length }} 封</span>
          </div>

          <div v-if="campaignListError" class="text-xs text-danger">{{ campaignListError }}</div>
          <div v-if="loadingCampaigns" class="text-xs text-muted">邮件记录加载中...</div>
          <div v-else-if="!campaignListError && !campaigns.length" class="text-xs text-muted">还没有邮件记录。</div>
          <div v-else class="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
            <div v-for="campaign in campaigns" :key="campaign.id" class="admin-record-card">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm text-text break-all">{{ campaign.title }}</div>
                  <div class="text-[11px] text-muted mt-1">#{{ campaign.id }}</div>
                </div>
                <span class="admin-status" :class="`admin-status--${campaign.status}`">{{ formatCampaignStatus(campaign.status) }}</span>
              </div>

              <div class="mt-3 grid gap-2 text-xs text-muted md:grid-cols-2">
                <div>投递 {{ campaign.delivery_count || 0 }} / {{ campaign.recipient_count_preview || 0 }}</div>
                <div>领取 {{ campaign.claimed_count || 0 }} / {{ campaign.delivery_count || 0 }}</div>
                <div>待领 {{ campaign.pending_claim_count || 0 }}</div>
                <div>{{ campaign.sent_at ? `发送 ${formatTime(campaign.sent_at)}` : `更新 ${formatTime(campaign.updated_at)}` }}</div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" @click="openDetail(campaign.id)" :disabled="loadingDetailId === campaign.id">
                  <span>{{ loadingDetailId === campaign.id ? '读取中...' : '查看详情' }}</span>
                </button>
                <button
                  v-if="campaign.status !== 'sent'"
                  class="btn !px-2 !py-1"
                  @click="loadCampaignIntoComposer(campaign.id)"
                  :disabled="loadingComposerId === campaign.id"
                >
                  <span>{{ loadingComposerId === campaign.id ? '载入中...' : '载入编辑' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="detail" class="game-panel space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm text-accent">邮件详情</p>
            <p class="text-xs text-muted mt-1">#{{ detail.campaign.id }} · {{ detail.campaign.title }}</p>
          </div>
          <button class="btn !px-2 !py-1" @click="detail = null">
            <span>关闭详情</span>
          </button>
        </div>

        <div class="grid gap-2 text-xs text-muted md:grid-cols-2">
          <div>状态：{{ formatCampaignStatus(detail.campaign.status) }}</div>
          <div>模板：{{ formatTemplate(detail.campaign.template_type) }}</div>
          <div>投递：{{ detail.campaign.delivery_count || 0 }}</div>
          <div>领取：{{ detail.campaign.claimed_count || 0 }}</div>
          <div>发送时间：{{ formatTime(detail.campaign.sent_at) }}</div>
          <div>最后更新：{{ formatTime(detail.campaign.updated_at) }}</div>
        </div>

        <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3 text-sm leading-7 whitespace-pre-wrap">
          {{ detail.campaign.content || '纯奖励邮件，无正文。' }}
        </div>

        <div class="flex flex-wrap gap-2">
          <span
            v-for="(reward, index) in detail.campaign.rewards || []"
            :key="`${detail.campaign.id}-${index}`"
            class="admin-chip"
          >
            {{ formatRewardSummary(reward) }}
          </span>
          <span v-if="!(detail.campaign.rewards || []).length" class="admin-chip">纯文字公告</span>
        </div>

        <div>
          <Divider :label="`玩家投递明细（${detail.deliveries.length}）`" />
          <div v-if="!detail.deliveries.length" class="text-xs text-muted">当前没有玩家投递记录。</div>
          <div v-else class="admin-delivery-list">
            <div class="admin-delivery-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>状态</th>
                    <th>已读</th>
                    <th>领取</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="delivery in detail.deliveries" :key="delivery.id">
                    <td>
                      {{ delivery.recipient_display_name || delivery.username }}
                      <span class="block text-[11px] text-muted mt-1">{{ formatTargetSlot(delivery.target_slot) }}</span>
                    </td>
                    <td>{{ formatClaimStatus(delivery.claim_status) }}</td>
                    <td>{{ formatTime(delivery.read_at) }}</td>
                    <td>{{ formatTime(delivery.claimed_at) }}</td>
                    <td>
                      <template v-if="delivery.claim_result">
                        入账 {{ delivery.claim_result.money_added || 0 }}，
                        跳过 {{ delivery.claim_result.skipped_rewards?.length || 0 }}
                      </template>
                      <template v-else>-</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="admin-delivery-cards">
              <div v-for="delivery in detail.deliveries" :key="`card_${delivery.id}`" class="admin-delivery-card">
                <div class="admin-delivery-card__row">
                  <span class="admin-delivery-card__label">玩家</span>
                  <div class="admin-delivery-card__value">
                    <div>{{ delivery.recipient_display_name || delivery.username }}</div>
                    <div class="text-[11px] text-muted mt-1">{{ formatTargetSlot(delivery.target_slot) }}</div>
                  </div>
                </div>
                <div class="admin-delivery-card__row">
                  <span class="admin-delivery-card__label">状态</span>
                  <span class="admin-delivery-card__value">{{ formatClaimStatus(delivery.claim_status) }}</span>
                </div>
                <div class="admin-delivery-card__row">
                  <span class="admin-delivery-card__label">已读</span>
                  <span class="admin-delivery-card__value">{{ formatTime(delivery.read_at) }}</span>
                </div>
                <div class="admin-delivery-card__row">
                  <span class="admin-delivery-card__label">领取</span>
                  <span class="admin-delivery-card__value">{{ formatTime(delivery.claimed_at) }}</span>
                </div>
                <div class="admin-delivery-card__row">
                  <span class="admin-delivery-card__label">结果</span>
                  <span class="admin-delivery-card__value">
                    <template v-if="delivery.claim_result">
                      入账 {{ delivery.claim_result.money_added || 0 }}，跳过 {{ delivery.claim_result.skipped_rewards?.length || 0 }}
                    </template>
                    <template v-else>-</template>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminHomepageAboutPanel v-if="hasToken && activeAdminTab === 'content'" :can-load="hasAdminAccess" />

      <AdminAndroidReleasePanel v-if="hasToken && activeAdminTab === 'android'" :can-load="hasAdminAccess" />

      <AdminLogCenterPanel
        v-if="hasToken && activeAdminTab === 'logs'"
        :can-load="hasAdminAccess"
        :can-view-audit="canManageMail"
      />

      <div v-if="hasToken && activeAdminTab === 'ai' && hasAdminAccess" class="game-panel">
        <AiAssistantAdminPanel />
      </div>

      <div v-if="hasToken && activeAdminTab === 'cloud' && hasAdminAccess && officialControlTabVisible" class="game-panel">
        <OfficialControlAdminPanel :can-load="hasAdminAccess" />
      </div>

      <div v-if="activeAdminTab === 'debug'" class="game-panel space-y-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-1">
            <p class="text-sm text-accent flex items-center gap-2">
              <Bug :size="16" />
              <span>后期调试工作台</span>
            </p>
            <p class="text-xs text-muted leading-6">
              这里负责进入后期样例与周循环调试页面。该入口现在不再依赖开发态构建，但仍只允许超级管理员口令使用。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="game-chip">样例总数 {{ lateGameDebugSamples.length }}</span>
            <span class="game-chip">主样例 {{ lateGameDebugFlagshipCount }}</span>
            <span class="game-chip">回归样例 {{ lateGameDebugRegressionCount }}</span>
          </div>
        </div>

        <div v-if="lateGameDebugRequiresAuthHint && !canManageLateGameDebug" class="text-xs text-danger leading-6">
          检测到你尝试直接打开后期调试，请先在本页填写超级管理员口令，再进入调试工作台。
        </div>

        <div v-if="!hasToken" class="text-xs text-muted leading-6">
          先填写管理员口令并完成验证，后期调试入口会根据权限自动开放。
        </div>

        <div v-else-if="hasAdminAccess && !canManageLateGameDebug" class="text-xs text-muted leading-6">
          当前口令只有普通管理员权限，不能进入后期调试。请改用超级管理员口令。
        </div>

        <template v-else-if="canManageLateGameDebug">
          <div class="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]">
            <div class="space-y-3">
              <div class="rounded-xs border border-accent/15 bg-bg/15 p-3 space-y-2">
                <p class="text-xs text-accent">入口说明</p>
                <p class="text-[11px] text-muted leading-5">
                  进入后可直接载入主样例或回归样例，验证周切换、育种周赛、鱼塘周赛和主题周刷新边界。
                </p>
                <div class="flex flex-wrap gap-2">
                  <button class="btn" @click="openLateGameDebug">
                    <Play :size="14" />
                    <span>进入后期调试</span>
                  </button>
                </div>
              </div>

              <div class="rounded-xs border border-accent/15 bg-bg/15 p-3 space-y-2">
                <p class="text-xs text-accent">主样例</p>
                <div class="grid gap-2 md:grid-cols-2">
                  <div v-for="sample in lateGameDebugFlagshipSamples" :key="sample.id" class="rounded-xs border border-accent/10 px-3 py-2 bg-bg/10">
                    <div class="text-[11px] text-text">{{ sample.label }}</div>
                    <div class="text-[10px] text-muted mt-1">推荐落点：{{ lateGameDebugRouteLabel(sample.recommendedRouteName) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-xs border border-accent/15 bg-bg/15 p-3 space-y-2">
              <p class="text-xs text-accent">回归样例</p>
              <div class="space-y-2">
                <div v-for="sample in lateGameDebugRegressionSamples" :key="sample.id" class="rounded-xs border border-accent/10 px-3 py-2 bg-bg/10">
                  <div class="text-[11px] text-text">{{ sample.label }}</div>
                  <div class="text-[10px] text-muted mt-1">{{ sample.smokeChecks[0]?.label || sample.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="hasToken && activeAdminTab === 'mail' && !canManageMail" class="game-panel text-xs text-muted leading-6">
        当前口令无邮件运营权限，请使用超级管理员口令后再查看邮件记录。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { Capacitor } from '@capacitor/core'
  import { ArrowLeft, Bug, KeyRound, Play, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-vue-next'
  import Divider from '@/components/game/Divider.vue'
  import AdminHomepageAboutPanel from '@/components/game/AdminHomepageAboutPanel.vue'
  import AdminAndroidReleasePanel from '@/components/game/AdminAndroidReleasePanel.vue'
  import AdminLogCenterPanel from '@/components/game/AdminLogCenterPanel.vue'
  import AiAssistantAdminPanel from '@/components/game/AiAssistantAdminPanel.vue'
  import OfficialControlAdminPanel from '@/components/game/OfficialControlAdminPanel.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { useSaveStore } from '@/stores/useSaveStore'
  import {
    clearStoredAdminToken,
    fetchTaoyuanMailCampaignDetail,
    fetchTaoyuanMailCampaigns,
    getStoredAdminToken,
    saveTaoyuanMailCampaign,
    setStoredAdminToken,
    type TaoyuanMailCampaignDetail,
    type TaoyuanMailCampaignPayload,
    type TaoyuanMailCampaignSummary,
    type TaoyuanMailRewardPayload,
    type TaoyuanMailTemplateType,
    type TaoyuanRecipientMode,
    type TaoyuanRewardType,
  } from '@/utils/taoyuanMailboxAdminApi'
  import { fetchAdminUsers, verifyAdminSession, type AdminSessionInfo, type UserAdminSummary } from '@/utils/userAdminApi'
  import { fetchOfficialControlPlatformStatus } from '@/utils/officialControlApi'
  import { LATE_GAME_DEBUG_AUTH_QUERY_KEY } from '@/utils/lateGameDebugAccess'
  import {
    filterRewardCatalog,
    getRewardCatalogEntry,
    getRewardFilterOptions,
    type RewardCatalogEntry,
    type RewardCatalogType,
  } from '@/utils/taoyuanRewardCatalog'
  import type { OfficialControlPlatformStatus } from '@/types'

  interface ComposerReward {
    uid: string
    type: TaoyuanRewardType
    id: string
    quantity: number
    amount: number
    quality: 'normal' | 'fine' | 'excellent' | 'supreme'
    filterKeyword: string
    filterValue: string
  }

  interface RecipientTargetSelection {
    username: string
    target_slot: number | null
  }

  interface ComposerState {
    id: string
    template_type: TaoyuanMailTemplateType
    title: string
    content: string
    recipient_rule: {
      mode: TaoyuanRecipientMode
      username: string
      target_slot: number | null
      usernames_text: string
      targets: RecipientTargetSelection[]
      keyword: string
    }
    expire_mode: 'never' | 'datetime'
    expires_at: string
    scheduled_at: string
    duplicate_compensation_money: number
    rewards: ComposerReward[]
  }

  const router = useRouter()
  const route = useRoute()

  const templatePresets: Record<TaoyuanMailTemplateType, { label: string; title: string; content: string }> = {
    compensation: {
      label: '补偿邮件',
      title: '桃源乡补偿奖励',
      content: '因异常情况为你补发奖励，请前往邮箱查收。',
    },
    activity_reward: {
      label: '活动奖励邮件',
      title: '桃源乡活动奖励',
      content: '你在活动中的奖励已经发放，请及时领取。',
    },
    maintenance_notice: {
      label: '维护公告邮件',
      title: '桃源乡维护公告',
      content: '本次维护内容如下，请留意更新说明。',
    },
  }

  const templateOptions = (Object.keys(templatePresets) as TaoyuanMailTemplateType[]).map(value => ({
    value,
    label: templatePresets[value].label,
  }))

  const recipientOptions: Array<{ value: TaoyuanRecipientMode; label: string }> = [
    { value: 'all', label: '全服' },
    { value: 'single', label: '单个玩家' },
    { value: 'batch', label: '批量用户名' },
    { value: 'keyword', label: '用户名关键词' },
    { value: 'has_save', label: '仅发送给已有服务端存档的账号' },
  ]

  const rewardTypeOptions: Array<{ value: TaoyuanRewardType; label: string }> = [
    { value: 'money', label: 'money' },
    { value: 'item', label: '道具' },
    { value: 'seed', label: '种子' },
    { value: 'weapon', label: '武器' },
    { value: 'ring', label: '戒指' },
    { value: 'hat', label: '帽子' },
    { value: 'shoe', label: '鞋子' },
  ]

  const qualityOptions = [
    { value: 'normal', label: '普通' },
    { value: 'fine', label: '优良' },
    { value: 'excellent', label: '精品' },
    { value: 'supreme', label: '极品' },
  ] as const

  const createRewardUid = () => `reward_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const createReward = (type: TaoyuanRewardType = 'money'): ComposerReward => ({
    uid: createRewardUid(),
    type,
    id: '',
    quantity: 1,
    amount: 0,
    quality: 'normal',
    filterKeyword: '',
    filterValue: '',
  })

  const createComposer = (): ComposerState => ({
    id: '',
    template_type: 'compensation',
    title: templatePresets.compensation.title,
    content: templatePresets.compensation.content,
    recipient_rule: {
      mode: 'all',
      username: '',
      target_slot: null,
      usernames_text: '',
      targets: [],
      keyword: '',
    },
    expire_mode: 'never',
    expires_at: '',
    scheduled_at: '',
    duplicate_compensation_money: 0,
    rewards: [],
  })

  const adminTokenInput = ref(getStoredAdminToken())
  const savingToken = ref(false)
  const tokenError = ref('')
  const appliedRoutePresetSignature = ref('')
  const saveStore = useSaveStore()

  const campaigns = ref<TaoyuanMailCampaignSummary[]>([])
  const detail = ref<TaoyuanMailCampaignDetail | null>(null)
  const composer = ref<ComposerState>(createComposer())
  const adminSession = ref<AdminSessionInfo | null>(null)
  const isAuthorized = ref(false)
  const activeAdminTab = ref<'mail' | 'content' | 'android' | 'logs' | 'ai' | 'cloud' | 'debug'>('mail')
  const officialControlPlatformStatus = ref<OfficialControlPlatformStatus | null>(null)

  const loadingCampaigns = ref(false)
  const loadingDetailId = ref('')
  const loadingComposerId = ref('')
  const submittingCampaign = ref<'draft' | 'schedule' | 'send' | ''>('')
  const campaignListError = ref('')
  const campaignListRequestId = ref(0)
  const campaignDetailRequestId = ref(0)
  const composerLoadRequestId = ref(0)
  const recipientSearchRequestId = ref(0)
  const recipientSearchKeyword = ref('')
  const recipientSearchLoading = ref(false)
  const recipientSearchResults = ref<UserAdminSummary[]>([])
  const recipientSearchPerformed = ref(false)

  const hasToken = computed(() => adminTokenInput.value.trim().length > 0)
  const hasAdminAccess = computed(() => !!adminSession.value)
  const canManageMail = computed(() => adminSession.value?.role === 'super_admin')
  const canManageLateGameDebug = computed(() => adminSession.value?.role === 'super_admin')
  const officialControlTabVisible = computed(() => !!officialControlPlatformStatus.value?.enabled && officialControlPlatformStatus.value.hostAllowed)
  const lateGameDebugRequiresAuthHint = computed(() => route.query[LATE_GAME_DEBUG_AUTH_QUERY_KEY] === '1')
  const lateGameDebugSamples = computed(() => saveStore.getBuiltInSampleSaves())
  const lateGameDebugFlagshipSamples = computed(() => lateGameDebugSamples.value.filter(sample => sample.tier === 'flagship'))
  const lateGameDebugRegressionSamples = computed(() => lateGameDebugSamples.value.filter(sample => sample.tier === 'regression'))
  const lateGameDebugFlagshipCount = computed(() => lateGameDebugFlagshipSamples.value.length)
  const lateGameDebugRegressionCount = computed(() => lateGameDebugRegressionSamples.value.length)
  const recipientSummary = computed(() => {
    const rule = composer.value.recipient_rule
    if (rule.mode === 'single') {
      return rule.username.trim()
        ? `单个目标：${rule.username.trim()}（${formatTargetSlot(rule.target_slot)}）`
        : '单个目标（待选择账号和槽位）'
    }
    if (rule.mode === 'batch') {
      const count = rule.targets.length || rule.usernames_text.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean).length
      return count ? `批量目标：已选择 ${count} 个账号/槽位` : '批量目标（待选择账号和槽位）'
    }
    if (rule.mode === 'keyword') {
      return rule.keyword.trim() ? `用户名关键词：${rule.keyword.trim()}` : '用户名关键词（待填写筛选词）'
    }
    if (rule.mode === 'has_save') {
      return '仅发送给已有服务端存档的账号'
    }
    return '全服账号'
  })

  const batchRecipientList = computed(() => {
    if (composer.value.recipient_rule.targets.length) return composer.value.recipient_rule.targets
    return composer.value.recipient_rule.usernames_text
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(username => ({ username, target_slot: null }))
  })

  const formatTargetSlot = (slot: number | null | undefined) => {
    return slot === null || slot === undefined ? '账号级' : `槽位${slot + 1}`
  }

  const getRecipientSlotOptions = (user: UserAdminSummary) => {
    const slotOptions = (user.save_file?.slots || [])
      .filter(slot => slot.exists)
      .map(slot => ({ label: `槽位${slot.slot + 1}`, target_slot: slot.slot }))
    return [{ label: '账号级', target_slot: null }, ...slotOptions]
  }

  const isBatchRecipientSelected = (username: string, targetSlot: number | null) => {
    return composer.value.recipient_rule.targets.some(item => item.username === username && item.target_slot === targetSlot)
  }

  const goBack = () => {
    void router.push('/')
  }

  const switchAdminTab = (tab: 'mail' | 'content' | 'android' | 'logs' | 'ai' | 'cloud' | 'debug') => {
    activeAdminTab.value = tab
    const nextQuery = { ...route.query }
    if (tab === 'mail') {
      delete nextQuery.tab
    } else {
      nextQuery.tab = tab
    }
    void router.replace({ path: '/admin', query: nextQuery })
  }

  const syncAdminTabFromRoute = () => {
    const routeTab = route.query.tab
    if (routeTab === 'content' || routeTab === 'android' || routeTab === 'logs' || routeTab === 'ai' || routeTab === 'cloud' || routeTab === 'debug' || routeTab === 'mail') {
      activeAdminTab.value = routeTab
      return
    }
    if (route.query.mode === 'single' || route.query.mode === 'has_save') {
      activeAdminTab.value = 'mail'
      return
    }
    if (!route.query.tab) {
      activeAdminTab.value = 'mail'
    }
  }

  const refreshOfficialControlPlatformVisibility = async () => {
    if (!adminSession.value || !adminTokenInput.value.trim()) {
      officialControlPlatformStatus.value = null
      if (activeAdminTab.value === 'cloud') {
        switchAdminTab('mail')
      }
      return
    }
    try {
      officialControlPlatformStatus.value = await fetchOfficialControlPlatformStatus()
      if (!officialControlTabVisible.value && activeAdminTab.value === 'cloud') {
        switchAdminTab('mail')
      }
    } catch {
      officialControlPlatformStatus.value = null
      if (activeAdminTab.value === 'cloud') {
        switchAdminTab('mail')
      }
    }
  }

  const openUserAdmin = () => {
    void router.push('/admin/users')
  }

  const lateGameDebugRouteLabel = (routeName: string) => {
    const routeLabels: Record<string, string> = {
      farm: '农场',
      village: '村庄',
      'village-projects': '村庄建设',
      shop: '商店',
      forage: '采集',
      fishing: '钓鱼',
      mining: '矿洞',
      cooking: '烹饪',
      workshop: '工坊',
      inventory: '背包',
      wallet: '钱包',
      quest: '任务',
      mail: '邮箱',
      breeding: '育种',
      museum: '博物馆',
      guild: '公会',
      hanhai: '瀚海',
      fishpond: '鱼塘',
    }
    return routeLabels[routeName] ?? routeName
  }

  const openLateGameDebug = () => {
    if (!canManageLateGameDebug.value) {
      showFloat('后期调试仅限超级管理员口令进入', 'danger')
      return
    }
    void router.push({ name: 'late-game-debug' })
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

  const pad2 = (value: number) => String(value).padStart(2, '0')

  const formatDateTimeLocal = (timestamp?: number | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  }

  const formatCampaignStatus = (status?: string) => {
    const mapping: Record<string, string> = {
      draft: '草稿',
      scheduled: '定时中',
      sent: '已发送',
      cancelled: '已取消',
    }
    return mapping[String(status)] || String(status || '-')
  }

  const formatClaimStatus = (status?: string) => {
    const mapping: Record<string, string> = {
      claimable: '可领取',
      claimed: '已领取',
      expired: '已过期',
      notice: '公告',
    }
    return mapping[String(status)] || String(status || '-')
  }

  const formatTemplate = (templateType?: string | null) => {
    if (!templateType) return '无'
    return templatePresets[templateType as TaoyuanMailTemplateType]?.label || templateType
  }

  const formatRewardSummary = (reward: TaoyuanMailRewardPayload) => {
    if (reward.type === 'money') return `money x${reward.amount || 0}`
    return `${reward.type}:${reward.id || '-'} x${reward.quantity || 0}`
  }

  const clearRecipientSearch = () => {
    recipientSearchKeyword.value = ''
    recipientSearchResults.value = []
    recipientSearchPerformed.value = false
  }

  const isAdminCredentialError = (message: string) => /管理员口令无效|权限不足|管理员信息不完整/.test(message)

  const searchRecipients = async () => {
    const keyword = recipientSearchKeyword.value.trim()
    if (!keyword) {
      clearRecipientSearch()
      return
    }
    const activeRequestId = ++recipientSearchRequestId.value
    recipientSearchLoading.value = true
    try {
      const result = await fetchAdminUsers({ keyword, status: 'active', page: 1, pageSize: 20 })
      if (activeRequestId !== recipientSearchRequestId.value || recipientSearchKeyword.value.trim() !== keyword) return
      recipientSearchResults.value = result.users.filter(user => user.status === 'active')
      recipientSearchPerformed.value = true
    } catch (error) {
      if (activeRequestId !== recipientSearchRequestId.value || recipientSearchKeyword.value.trim() !== keyword) return
      showFloat(error instanceof Error ? error.message : '查找用户失败', 'danger')
    } finally {
      if (activeRequestId === recipientSearchRequestId.value) {
        recipientSearchLoading.value = false
      }
    }
  }

  const clearSingleRecipient = () => {
    composer.value.recipient_rule.username = ''
    composer.value.recipient_rule.target_slot = null
  }

  const selectSingleRecipient = (username: string, targetSlot: number | null) => {
    composer.value.recipient_rule.username = username
    composer.value.recipient_rule.target_slot = targetSlot
    clearRecipientSearch()
  }

  const syncBatchRecipients = (targets: RecipientTargetSelection[]) => {
    const deduped: RecipientTargetSelection[] = []
    const seen = new Set<string>()
    for (const target of targets) {
      const username = target.username.trim()
      if (!username) continue
      const key = `${username}#${target.target_slot === null ? 'account' : target.target_slot}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push({ username, target_slot: target.target_slot })
    }
    composer.value.recipient_rule.targets = deduped
    composer.value.recipient_rule.usernames_text = deduped.map(item => item.username).join('\n')
  }

  const addBatchRecipient = (username: string, targetSlot: number | null) => {
    syncBatchRecipients([...batchRecipientList.value, { username, target_slot: targetSlot }])
  }

  const removeBatchRecipient = (username: string, targetSlot: number | null) => {
    syncBatchRecipients(batchRecipientList.value.filter(item => !(item.username === username && item.target_slot === targetSlot)))
  }

  const getRewardFilterLabel = (type: TaoyuanRewardType) => {
    return type === 'item' ? '分类筛选' : '来源筛选'
  }

  const getRewardSelectPlaceholder = (type: TaoyuanRewardType) => {
    const mapping: Record<string, string> = {
      item: '选择道具',
      seed: '选择种子',
      weapon: '选择武器',
      ring: '选择戒指',
      hat: '选择帽子',
      shoe: '选择鞋子',
    }
    return mapping[type] || '选择奖励'
  }

  const getFilterOptions = (type: TaoyuanRewardType) => {
    if (type === 'money') return [{ value: '', label: '全部' }]
    return getRewardFilterOptions(type as RewardCatalogType)
  }

  const getRewardEntries = (reward: ComposerReward) => {
    if (reward.type === 'money') return []
    const entries = filterRewardCatalog(reward.type as RewardCatalogType, reward.filterKeyword, reward.filterValue)
    if (!reward.id) return entries
    const selected = getRewardCatalogEntry(reward.type as RewardCatalogType, reward.id)
    if (!selected || entries.some(item => item.id === selected.id)) return entries
    return [selected, ...entries]
  }

  const getSelectedRewardEntry = (reward: ComposerReward): RewardCatalogEntry | null => {
    if (reward.type === 'money' || !reward.id) return null
    return getRewardCatalogEntry(reward.type as RewardCatalogType, reward.id)
  }

  const getSelectEventValue = (event: Event) => {
    return event.target instanceof HTMLSelectElement ? event.target.value : ''
  }

  const applyTemplate = (templateType: string) => {
    const nextType = templateType as TaoyuanMailTemplateType
    const previousPreset = templatePresets[composer.value.template_type]
    const nextPreset = templatePresets[nextType]
    composer.value.template_type = nextType
    if (composer.value.title === previousPreset.title || !composer.value.id) {
      composer.value.title = nextPreset.title
    }
    if (composer.value.content === previousPreset.content || !composer.value.id) {
      composer.value.content = nextPreset.content
    }
  }

  const addReward = () => {
    composer.value.rewards.push(createReward('money'))
  }

  const removeReward = (index: number) => {
    composer.value.rewards.splice(index, 1)
  }

  const changeRewardType = (index: number, nextType: string) => {
    composer.value.rewards[index] = createReward(nextType as TaoyuanRewardType)
  }

  const handleTemplateSelectChange = (event: Event) => {
    applyTemplate(getSelectEventValue(event))
  }

  const handleRewardTypeSelectChange = (index: number, event: Event) => {
    changeRewardType(index, getSelectEventValue(event))
  }

  const clearRoutePresetQuery = () => {
    const nextQuery = { ...route.query }
    delete nextQuery.mode
    delete nextQuery.username
    void router.replace({ path: route.path, query: nextQuery, hash: route.hash })
  }

  const resetComposer = (options?: { preserveRecipient?: boolean; clearRoutePreset?: boolean }) => {
    const currentMode = composer.value.recipient_rule.mode
    const currentRule = { ...composer.value.recipient_rule }
    composer.value = createComposer()
    if (options?.preserveRecipient) {
      applyRecipientPreset(currentMode, currentRule)
    }
    if (options?.clearRoutePreset) {
      clearRoutePresetQuery()
    }
    clearRecipientSearch()
  }

  const handleCreateNewMail = () => {
    resetComposer({ clearRoutePreset: true })
  }

  const handleClearComposer = () => {
    resetComposer({ preserveRecipient: true, clearRoutePreset: true })
  }

  const applyRecipientPreset = (
    mode: TaoyuanRecipientMode,
    options?: { username?: string; target_slot?: number | null; usernames_text?: string; targets?: RecipientTargetSelection[]; keyword?: string }
  ) => {
    composer.value.recipient_rule.mode = mode
    composer.value.recipient_rule.username = mode === 'single' ? (options?.username || '') : ''
    composer.value.recipient_rule.target_slot = mode === 'single' ? (options?.target_slot ?? null) : null
    composer.value.recipient_rule.usernames_text = mode === 'batch' ? (options?.usernames_text || '') : ''
    composer.value.recipient_rule.targets = mode === 'batch' ? (options?.targets || []) : []
    composer.value.recipient_rule.keyword = mode === 'keyword' ? (options?.keyword || '') : ''
  }

  const getRoutePresetSignature = () => {
    const mode = route.query.mode === 'single' || route.query.mode === 'has_save'
      ? route.query.mode
      : ''
    if (!mode) return ''
    const username = typeof route.query.username === 'string' ? route.query.username.trim() : ''
    return mode === 'single' ? `${mode}:${username}` : mode
  }

  const applyComposerPresetFromRoute = () => {
    const signature = getRoutePresetSignature()
    if (!signature) {
      appliedRoutePresetSignature.value = ''
      return
    }
    if (appliedRoutePresetSignature.value === signature) return

    const mode = route.query.mode === 'single' || route.query.mode === 'has_save'
      ? route.query.mode
      : ''
    if (!mode) return

    if (mode === 'single') {
      activeAdminTab.value = 'mail'
      const username = typeof route.query.username === 'string' ? route.query.username.trim() : ''
      if (!username) return
      applyRecipientPreset('single', { username })
      appliedRoutePresetSignature.value = signature
      showFloat(`已切换为给账号 ${username} 发邮件`, 'success')
      clearRoutePresetQuery()
      return
    }

    applyRecipientPreset('has_save')
    activeAdminTab.value = 'mail'
    appliedRoutePresetSignature.value = signature
    showFloat('已切换为仅发送给已有服务端存档的账号', 'success')
    clearRoutePresetQuery()
  }

  const buildPayload = (action: 'draft' | 'schedule' | 'send'): TaoyuanMailCampaignPayload => {
    const rewards = composer.value.rewards
      .filter(reward => {
        if (reward.type === 'money') return Number(reward.amount) > 0
        return !!reward.id
      })
      .map(reward => {
        if (reward.type === 'money') {
          return { type: 'money' as const, amount: Number(reward.amount) || 0 }
        }
        const payload: TaoyuanMailRewardPayload = {
          type: reward.type,
          id: reward.id.trim(),
          quantity: Number(reward.quantity) || 1,
        }
        if (reward.type === 'item' || reward.type === 'seed') {
          payload.quality = reward.quality
        }
        return payload
      })

    const recipientRule = (() => {
      const mode = composer.value.recipient_rule.mode
      if (mode === 'single') {
        return {
          mode,
          username: composer.value.recipient_rule.username,
          target_slot: composer.value.recipient_rule.target_slot,
        }
      }
      if (mode === 'batch') {
        return {
          mode,
          targets: composer.value.recipient_rule.targets.map(item => ({
            username: item.username,
            target_slot: item.target_slot,
          })),
        }
      }
      if (mode === 'keyword') {
        return {
          mode,
          keyword: composer.value.recipient_rule.keyword,
        }
      }
      return { mode }
    })()

    return {
      id: composer.value.id || undefined,
      action,
      template_type: composer.value.template_type,
      title: composer.value.title,
      content: composer.value.content,
      expire_mode: composer.value.expire_mode,
      expires_at: composer.value.expires_at || undefined,
      scheduled_at: composer.value.scheduled_at || undefined,
      duplicate_compensation_money: Number(composer.value.duplicate_compensation_money) || 0,
      recipient_rule: recipientRule,
      rewards,
    }
  }

  const refreshCampaigns = async (tokenOverride?: string, persistToken = false) => {
    const token = String(tokenOverride || adminTokenInput.value || '').trim()
    if (!token) {
      campaignListError.value = ''
      campaigns.value = []
      detail.value = null
      return
    }

    const activeRequestId = ++campaignListRequestId.value
    loadingCampaigns.value = true
    tokenError.value = ''
    campaignListError.value = ''
    try {
      const nextCampaigns = await fetchTaoyuanMailCampaigns(token)
      if (activeRequestId !== campaignListRequestId.value) return
      campaigns.value = nextCampaigns
      isAuthorized.value = true
      if (persistToken) {
        setStoredAdminToken(token)
        adminTokenInput.value = token
      }
    } catch (error) {
      if (activeRequestId !== campaignListRequestId.value) return
      tokenError.value = error instanceof Error ? error.message : '获取桃源乡邮件记录失败'
      campaignListError.value = tokenError.value
      if (isAdminCredentialError(tokenError.value)) {
        campaigns.value = []
        detail.value = null
        isAuthorized.value = false
      }
    } finally {
      if (activeRequestId === campaignListRequestId.value) {
        loadingCampaigns.value = false
      }
    }
  }

  const handleRefreshClick = () => {
    void (async () => {
      await refreshCampaigns()
      if (campaignListError.value) {
        showFloat(campaignListError.value, 'danger')
      }
    })()
  }

  const useHasSaveRecipients = () => {
    applyRecipientPreset('has_save')
    clearRoutePresetQuery()
    clearRecipientSearch()
    showFloat('已切换为仅发送给已有服务端存档的账号', 'success')
  }

  const saveAdminTokenAndReload = async () => {
    const candidateToken = adminTokenInput.value.trim()
    if (!candidateToken) {
      tokenError.value = '请先填写管理员口令'
      return
    }
    savingToken.value = true
    tokenError.value = ''
    try {
      adminSession.value = await verifyAdminSession(candidateToken, true)
      if (adminSession.value.role === 'super_admin') {
        await refreshCampaigns(candidateToken, true)
        if (campaignListError.value) {
          showFloat(campaignListError.value, 'danger')
          return
        }
      } else {
        campaignListError.value = ''
        campaigns.value = []
        detail.value = null
        isAuthorized.value = false
      }
      if (!tokenError.value) {
        showFloat('管理员口令已保存', 'success')
      }
      await refreshOfficialControlPlatformVisibility()
      if (activeAdminTab.value === 'debug' && canManageLateGameDebug.value && lateGameDebugRequiresAuthHint.value) {
        void router.push({ name: 'late-game-debug' })
      }
    } catch (error) {
      adminSession.value = null
      isAuthorized.value = false
      campaigns.value = []
      detail.value = null
      officialControlPlatformStatus.value = null
      tokenError.value = error instanceof Error ? error.message : '管理员验证失败'
      showFloat(tokenError.value, 'danger')
    } finally {
      savingToken.value = false
    }
  }

  const clearAdminTokenValue = () => {
    adminTokenInput.value = ''
    clearStoredAdminToken()
    tokenError.value = ''
    campaignListError.value = ''
    campaigns.value = []
    detail.value = null
    isAuthorized.value = false
    adminSession.value = null
    officialControlPlatformStatus.value = null
    if (activeAdminTab.value === 'cloud') {
      switchAdminTab('mail')
    }
    showFloat('管理员口令已清空', 'success')
  }

  const openDetail = async (campaignId: string) => {
    const activeRequestId = ++campaignDetailRequestId.value
    loadingDetailId.value = campaignId
    tokenError.value = ''
    try {
      const nextDetail = await fetchTaoyuanMailCampaignDetail(campaignId)
      if (activeRequestId !== campaignDetailRequestId.value) return
      detail.value = nextDetail
    } catch (error) {
      if (activeRequestId !== campaignDetailRequestId.value) return
      tokenError.value = error instanceof Error ? error.message : '读取邮件详情失败'
      showFloat(tokenError.value, 'danger')
    } finally {
      if (activeRequestId === campaignDetailRequestId.value) {
        loadingDetailId.value = ''
      }
    }
  }

  const mapRewardToComposerReward = (reward: TaoyuanMailRewardPayload): ComposerReward => {
    const base = createReward(reward.type)
    base.id = reward.id || ''
    base.quantity = reward.quantity || 1
    base.amount = reward.amount || 0
    base.quality = reward.quality || 'normal'
    if (reward.type !== 'money' && reward.id) {
      const entry = getRewardCatalogEntry(reward.type as RewardCatalogType, reward.id)
      if (entry) {
        base.filterValue = entry.primaryFilterKey
      }
    }
    return base
  }

  const loadCampaignIntoComposer = async (campaignId: string) => {
    const activeRequestId = ++composerLoadRequestId.value
    loadingComposerId.value = campaignId
    tokenError.value = ''
    try {
      const result = await fetchTaoyuanMailCampaignDetail(campaignId)
      if (activeRequestId !== composerLoadRequestId.value) return
      composer.value = {
        id: result.campaign.id,
        template_type: (result.campaign.template_type as TaoyuanMailTemplateType) || 'compensation',
        title: result.campaign.title || '',
        content: result.campaign.content || '',
        recipient_rule: {
          mode: (result.campaign.recipient_rule?.mode as TaoyuanRecipientMode) || 'all',
          username: result.campaign.recipient_rule?.username || '',
          target_slot: result.campaign.recipient_rule?.target_slot ?? null,
          usernames_text: Array.isArray(result.campaign.recipient_rule?.usernames) ? result.campaign.recipient_rule!.usernames!.join('\n') : '',
          targets: Array.isArray(result.campaign.recipient_rule?.targets)
            ? result.campaign.recipient_rule.targets
              .map(item => ({ username: String(item?.username || '').trim(), target_slot: item?.target_slot ?? null }))
              .filter(item => item.username)
            : (Array.isArray(result.campaign.recipient_rule?.usernames)
              ? result.campaign.recipient_rule.usernames
                .map(username => ({ username: String(username || '').trim(), target_slot: null }))
                .filter(item => item.username)
              : []),
          keyword: result.campaign.recipient_rule?.keyword || '',
        },
        expire_mode: result.campaign.expires_at ? 'datetime' : 'never',
        expires_at: formatDateTimeLocal(result.campaign.expires_at),
        scheduled_at: formatDateTimeLocal(result.campaign.scheduled_at),
        duplicate_compensation_money: result.campaign.duplicate_compensation_money || 0,
        rewards: (result.campaign.rewards || []).map(mapRewardToComposerReward),
      }
      if (!composer.value.rewards.length) {
        composer.value.rewards = []
      }
      showFloat('邮件草稿已载入', 'success')
    } catch (error) {
      if (activeRequestId !== composerLoadRequestId.value) return
      tokenError.value = error instanceof Error ? error.message : '载入邮件草稿失败'
      showFloat(tokenError.value, 'danger')
    } finally {
      if (activeRequestId === composerLoadRequestId.value) {
        loadingComposerId.value = ''
      }
    }
  }

  const submitCampaign = async (action: 'draft' | 'schedule' | 'send') => {
    if (!composer.value.title.trim()) {
      showFloat('请先填写邮件标题', 'danger')
      return
    }

    const hasReward = composer.value.rewards.some(reward => (reward.type === 'money' ? reward.amount > 0 : !!reward.id))
    if (!composer.value.content.trim() && !hasReward) {
      showFloat('正文和奖励不能同时为空', 'danger')
      return
    }

    if (action === 'schedule' && !composer.value.scheduled_at) {
      showFloat('请先填写定时发送时间', 'danger')
      return
    }

    if (action === 'send' || action === 'schedule') {
      const message = action === 'send'
        ? '确认立即发送这封邮件吗？发送后将无法继续编辑该邮件。'
        : '确认按当前设置保存为定时发送吗？'
      if (typeof window !== 'undefined' && !window.confirm(message)) {
        return
      }
    }

    submittingCampaign.value = action
    tokenError.value = ''
    try {
      await saveTaoyuanMailCampaign(buildPayload(action))
      showFloat(action === 'send' ? '邮件已发送' : action === 'schedule' ? '邮件已定时保存' : '草稿已保存', 'success')
      if (action !== 'draft') {
        resetComposer({ preserveRecipient: true, clearRoutePreset: true })
      }
      await refreshCampaigns()
    } catch (error) {
      tokenError.value = error instanceof Error ? error.message : '保存邮件失败'
      showFloat(tokenError.value, 'danger')
    } finally {
      submittingCampaign.value = ''
    }
  }

  onMounted(async () => {
    syncAdminTabFromRoute()
    if (adminTokenInput.value.trim()) {
      try {
        adminSession.value = await verifyAdminSession(adminTokenInput.value.trim())
        await refreshOfficialControlPlatformVisibility()
        if (adminSession.value.role === 'super_admin') {
          await refreshCampaigns(adminTokenInput.value.trim())
        }
      } catch (error) {
        adminSession.value = null
        isAuthorized.value = false
        officialControlPlatformStatus.value = null
        tokenError.value = error instanceof Error ? error.message : '管理员验证失败'
      }
    }
    applyComposerPresetFromRoute()
  })

  watch(
    () => [route.query.mode, route.query.username, route.query.tab],
    () => {
      syncAdminTabFromRoute()
      applyComposerPresetFromRoute()
    }
  )

  watch(
    () => composer.value.recipient_rule.mode,
    mode => {
      applyRecipientPreset(mode, composer.value.recipient_rule)
      clearRecipientSearch()
    }
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
  .admin-select,
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

  .admin-input:focus,
  .admin-select:focus,
  .admin-textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .admin-textarea {
    resize: vertical;
    min-height: 96px;
  }

  .admin-top-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .admin-top-actions :deep(.btn) {
    width: 100%;
  }

  .admin-composer-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    width: 100%;
  }

  .admin-composer-actions :deep(.btn) {
    width: 100%;
  }

  .recipient-search-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .recipient-search-row__action {
    width: 100%;
  }

  .recipient-search-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .recipient-search-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    background: rgba(14, 18, 28, 0.5);
    transition: border-color 0.15s, background-color 0.15s;
  }

  .recipient-search-item--block {
    flex-direction: column;
    align-items: stretch;
  }

  .recipient-slot-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .recipient-search-item:hover:not(:disabled) {
    border-color: rgba(200, 164, 92, 0.45);
    background: rgba(200, 164, 92, 0.08);
  }

  .recipient-search-item:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .recipient-picked-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .recipient-picked-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 999px;
    background: rgba(200, 164, 92, 0.08);
    font-size: 12px;
    color: rgb(var(--color-text));
  }

  .recipient-picked-chip--single {
    border-radius: 2px;
  }

  .recipient-chip-remove {
    border: none;
    background: transparent;
    color: rgb(var(--color-muted));
    cursor: pointer;
    padding: 0;
    line-height: 1;
    font-size: 14px;
  }

  .recipient-chip-remove:hover {
    color: rgb(var(--color-danger));
  }

  .admin-reward-card,
  .admin-record-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .admin-tip-card {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    background: rgba(200, 164, 92, 0.08);
    padding: 10px 12px;
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

  .admin-status--scheduled {
    color: #8fd0ff;
    background: rgba(53, 124, 186, 0.14);
    border-color: rgba(53, 124, 186, 0.32);
  }

  .admin-status--sent {
    color: #96deac;
    background: rgba(72, 146, 95, 0.14);
    border-color: rgba(72, 146, 95, 0.3);
  }

  .admin-status--cancelled {
    color: #ff9f9f;
    background: rgba(184, 70, 70, 0.14);
    border-color: rgba(184, 70, 70, 0.3);
  }

  .admin-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: 4px 8px;
    background: rgba(200, 164, 92, 0.08);
    font-size: 12px;
    color: rgb(var(--color-text));
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 720px;
    font-size: 12px;
  }

  .admin-table th,
  .admin-table td {
    border-bottom: 1px solid rgba(200, 164, 92, 0.12);
    padding: 10px 8px;
    text-align: left;
    color: rgb(var(--color-text));
    vertical-align: top;
  }

  .admin-table th {
    color: rgb(var(--color-muted));
    font-weight: 500;
  }

  .admin-delivery-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .admin-delivery-table-wrap {
    overflow-x: auto;
  }

  .admin-delivery-cards {
    display: none;
  }

  .admin-delivery-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .admin-delivery-card__row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .admin-delivery-card__row + .admin-delivery-card__row {
    margin-top: 10px;
  }

  .admin-delivery-card__label {
    font-size: 11px;
    color: rgb(var(--color-muted));
  }

  .admin-delivery-card__value {
    font-size: 12px;
    color: rgb(var(--color-text));
    line-height: 1.6;
    word-break: break-word;
  }

  @media (min-width: 768px) {
    .admin-top-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .admin-top-actions :deep(.btn) {
      width: auto;
    }

    .admin-composer-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .admin-composer-actions :deep(.btn) {
      width: auto;
    }

    .recipient-search-row__action {
      width: auto;
    }
  }

  @media (max-width: 767px) {
    .recipient-search-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .admin-delivery-table-wrap {
      display: none;
    }

    .admin-delivery-cards {
      display: grid;
      gap: 10px;
    }
  }

  @media (max-width: 480px) {
    .admin-top-actions {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  :deep(.btn-primary) {
    background: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
    border-color: rgba(200, 164, 92, 0.92);
  }
</style>

