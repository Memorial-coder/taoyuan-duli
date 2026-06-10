import type { PanelKey } from '@/composables/useNavigation'
import type { RegionId } from '@/types/region'

type StatusChip = { statusLabel: string; statusToneClass: string }
type SettlementDialogAction = { key: PanelKey; label: string }
type SettlementDialogActionCard = SettlementDialogAction & { summary: string; reason: string } & StatusChip
type JourneyHandoffReceiptSection = { title: string; lines: string[] } & StatusChip
export type JourneyHandoffBoard = {
  headline: string
  resourceLines: string[]
  actionCards: SettlementDialogActionCard[]
  whyNowLines: string[]
  receiptSections: JourneyHandoffReceiptSection[]
}

type RegionJourneyHandoffModelDeps = {
  regionMapStore: any
  shopStore: any
  hanhaiStore: any
  fishPondStore: any
  museumStore: any
  questStore: any
  goalStore: any
  guildStore: any
  villageProjectStore: any
  buildSettlementActionPanels: (regionId: RegionId | null) => SettlementDialogAction[]
  getRegionRoutes: (regionId: RegionId) => Array<{ id: string; name?: string }>
  isRouteUnlocked: (routeId: string) => boolean
  getUnlockSummary: (regionId: RegionId) => string
}

export function useRegionJourneyHandoffModel(deps: RegionJourneyHandoffModelDeps) {
  const {
    regionMapStore,
    shopStore,
    hanhaiStore,
    fishPondStore,
    museumStore,
    questStore,
    goalStore,
    guildStore,
    villageProjectStore,
    buildSettlementActionPanels,
    getRegionRoutes,
    isRouteUnlocked,
    getUnlockSummary
  } = deps

  function createStatusChip(ready: boolean, readyLabel = '已满足', pendingLabel = '待推进'): StatusChip {
    return {
      statusLabel: ready ? readyLabel : pendingLabel,
      statusToneClass: ready ? 'text-success' : 'text-muted'
    }
  }

  function createJourneyReceiptSection(
    title: string,
    lines: string[],
    ready: boolean,
    readyLabel = '已形成回执',
    pendingLabel = '待继续推进'
  ): JourneyHandoffReceiptSection {
    return {
      title,
      lines: lines.filter(Boolean),
      ...createStatusChip(ready, readyLabel, pendingLabel)
    }
  }

  function buildJourneyReceiptSections(regionId: RegionId | null): JourneyHandoffReceiptSection[] {
    if (!regionId) return []

    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      const specialOrderLabel = questStore.specialOrder?.targetItemName ?? questStore.specialOrder?.description ?? ''
      const campaignLabel = questStore.currentLimitedTimeQuestCampaign?.label ?? ''
      const campaignRemainingDays = questStore.currentLimitedTimeQuestRemainingDays ?? 0

      return [
        createJourneyReceiptSection(
          '交差回执',
          [
            questStore.boardQuests.length > 0
              ? `任务板：当前告示栏仍有 ${questStore.boardQuests.length} 条委托待接。`
              : '任务板：当前告示栏暂时没有常规委托堆积。',
            questStore.activeQuests.length > 0 ? `进行中：你手头还有 ${questStore.activeQuests.length} 条任务可一起承接这趟回城结果。` : ''
          ],
          questStore.boardQuests.length > 0 || questStore.activeQuests.length > 0 || archiveStock > 0,
          '可立刻交差',
          '待补委托条件'
        ),
        createJourneyReceiptSection(
          '变现回执',
          [
            archiveStock > 0 ? `库存确认：古迹残卷 ${archiveStock} 份，可立刻转成交付或后续调查。` : '',
            shopFocus ? `商圈周转：当前优先货架是「${shopFocus}」，可直接把荒道收益换成下一趟补给。` : '商圈周转：可先把荒道回收物换成补给、口粮和行装。'
          ],
          archiveStock > 0 || Boolean(shopFocus),
          '可立刻变现',
          '待补可卖收益'
        ),
        createJourneyReceiptSection(
          '解锁后续',
          [
            specialOrderLabel ? `特殊订单：当前可继续承接「${specialOrderLabel}」。` : '',
            campaignLabel ? `活动窗口：${campaignRemainingDays > 0 ? `「${campaignLabel}」剩余 ${campaignRemainingDays} 天。` : `「${campaignLabel}」当前已开启。`}` : '',
            hanhaiHint ? `瀚海延伸：${hanhaiHint}` : ''
          ],
          Boolean(specialOrderLabel) || Boolean(campaignLabel) || Boolean(hanhaiHint),
          '后续已打开',
          '待触发后续'
        )
      ].filter(section => section.lines.length > 0)
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''

      return [
        createJourneyReceiptSection(
          '交差回执',
          [
            museumStore.availableScholarCommissionCount > 0
              ? `博物馆：当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接。`
              : '博物馆：当前暂无堆积中的学者委托。',
            museumFocus ? `馆务重点：目前优先处理「${museumFocus}」。` : ''
          ],
          museumStore.availableScholarCommissionCount > 0 || Boolean(museumFocus),
          '可立刻交付',
          '待馆务刷新'
        ),
        createJourneyReceiptSection(
          '变现回执',
          [
            specimenStock > 0 ? `样本库存：生态样本 ${specimenStock} 份，可先转展示池或研究交付。` : '',
            pondContest ? `鱼塘周赛：当前「${pondContest}」能立刻消化这趟泽地收获。` : '鱼塘周赛：本周暂无特别点名的周赛承接。'
          ],
          specimenStock > 0 || Boolean(pondContest),
          '可立刻承接',
          '待样本回流'
        ),
        createJourneyReceiptSection(
          '解锁后续',
          [
            fishPondStore.displayOverview.entryCount > 0
              ? `展示池：当前已有 ${fishPondStore.displayOverview.entryCount} 条高光样本在展陈。`
              : '展示池：当前仍可继续把泽地样本推入展示池。',
            goalStore.currentEventCampaign ? `活动承接：当前「${goalStore.currentEventCampaign.label}」也能接住这批样本。` : ''
          ],
          fishPondStore.displayOverview.entryCount > 0 || Boolean(goalStore.currentEventCampaign),
          '后续已打开',
          '待继续沉淀'
        )
      ].filter(section => section.lines.length > 0)
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter((project: any) => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''

    return [
      createJourneyReceiptSection(
        '交差回执',
        [
          `公会战备：当前位于 ${guildStore.crossSystemOverview.currentRankBandLabel}。`,
          villageProjectStore.overviewSummary.availableProjects > 0
            ? `建设排队：当前仍有 ${villageProjectStore.overviewSummary.availableProjects} 项村庄建设可继续推进。`
            : '建设排队：当前可见建设项已基本处理完毕。'
        ],
        true,
        '可立刻交差',
        '待战备提升'
      ),
      createJourneyReceiptSection(
        '变现回执',
        [
          crystalStock > 0 ? `灵脉结晶：当前库存 ${crystalStock}，可继续转成战备、建设与高阶准备。` : '',
          goalStore.currentThemeWeek?.name ? `主题周放大：本周「${goalStore.currentThemeWeek.name}」会提高高地回流价值。` : ''
        ],
        crystalStock > 0 || Boolean(goalStore.currentThemeWeek?.name),
        '可立刻转化',
        '待形成库存'
      ),
      createJourneyReceiptSection(
        '解锁后续',
        [
          projectName ? `建设前置：下一步可继续推进「${projectName}」。` : '',
          '下一轮：高地成果会优先回灌到公会远征准备与后续建设链。'
        ],
        Boolean(projectName) || villageProjectStore.overviewSummary.availableProjects > 0,
        '建设可继续',
        '待建设解锁'
      )
    ].filter(section => section.lines.length > 0)
  }

  function buildJourneyHandoffBoard(regionId: RegionId | null): JourneyHandoffBoard | null {
    if (!regionId) return null

    const allowedKeys = new Set(buildSettlementActionPanels(regionId).map(action => action.key))
    const createActionCard = (
      key: PanelKey,
      label: string,
      summary: string,
      reason: string,
      ready: boolean,
      readyLabel = '可立刻处理',
      pendingLabel = '待准备'
    ): SettlementDialogActionCard => ({
      key,
      label,
      summary,
      reason,
      ...createStatusChip(ready, readyLabel, pendingLabel)
    })

    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      const questReady = questStore.boardQuests.length > 0 || questStore.activeQuests.length > 0 || archiveStock > 0
      const shopReady = archiveStock > 0 || Boolean(shopFocus)
      const hanhaiReady = Boolean(hanhaiHint)
      const actionCards = [
        createActionCard(
          'quest',
          '任务板',
          archiveStock > 0 ? `先把古迹残卷 ${archiveStock} 份转成交付、委托或调查线索。` : '先检查有没有可承接的残卷交付与调查委托。',
          goalStore.currentEventCampaign
            ? `当前活动「${goalStore.currentEventCampaign.label}」也能直接接住这趟荒道回流。`
            : '任务板最容易把本趟荒道见闻立刻变成明确进度。',
          questReady,
          '现在就去',
          '先补委托条件'
        ),
        createActionCard(
          'shop',
          '商圈',
          shopFocus ? `围绕「${shopFocus}」补货，把这趟回城收益转成下一趟远行准备。` : '把荒道回收物换成补给、口粮和下一趟远行物资。',
          shopFocus ? `商圈当前就有「${shopFocus}」这类重点承接。` : '回城后立刻补货，能最快改善下一次出发质量。',
          shopReady,
          '随后处理',
          '待补可卖收益'
        ),
        createActionCard(
          'hanhai',
          '瀚海',
          hanhaiHint ? `把荒道带回的路引与线索接进瀚海：${hanhaiHint}` : '把荒道回流继续接成更远的商路、合同或遗迹线。',
          hanhaiHint ? '瀚海当前已经给出了明确的后续动作。' : '荒道最自然的长线出口，就是把线索继续推向瀚海。',
          hanhaiReady,
          '可稍后去',
          '待触发后续'
        )
      ].filter(action => allowedKeys.has(action.key))

      return {
        headline: '荒道回流会优先拆进任务板、商圈与瀚海。',
        resourceLines: [
          archiveStock > 0
            ? `古迹残卷 ${archiveStock} 份 -> 先交任务板，再延伸成商圈补给与瀚海线索。`
            : '荒道文书、残卷和路引会优先流向任务板与瀚海合同链。',
          shopFocus ? `周转物资 -> 商圈优先看「${shopFocus}」，把收益转成补给。` : '补给与周转品可先送去商圈，换成下一趟行囊。'
        ],
        actionCards,
        whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
        receiptSections: buildJourneyReceiptSections(regionId)
      }
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''
      const fishpondReady = specimenStock > 0 || Boolean(pondContest)
      const museumReady = museumStore.availableScholarCommissionCount > 0 || Boolean(museumFocus)
      const actionCards = [
        createActionCard(
          'fishpond',
          '鱼塘',
          specimenStock > 0 ? `先把生态样本 ${specimenStock} 份转进展示池、周赛养成或素材整理。` : '先看鱼塘周赛和展示池，把泽地回流变成持续收益。',
          pondContest ? `本周周赛「${pondContest}」正好能消化这趟泽地收获。` : '鱼塘通常是蜃潮泽地样本最先落地的地方。',
          fishpondReady,
          '现在就去',
          '待样本回流'
        ),
        createActionCard(
          'museum',
          '博物馆',
          museumStore.availableScholarCommissionCount > 0
            ? `当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接，能立刻消化样本和见闻。`
            : '先检查馆务和学者委托，把这趟样本变成收藏与研究推进。',
          museumFocus ? `馆务重点「${museumFocus}」和这趟泽地素材高度匹配。` : '蜃潮泽地的样本与异闻，最容易直接长进博物馆价值。',
          museumReady,
          '随后处理',
          '待馆务刷新'
        )
      ].filter(action => allowedKeys.has(action.key))

      return {
        headline: '泽地回流会优先拆进鱼塘与博物馆。',
        resourceLines: [
          specimenStock > 0
            ? `生态样本 ${specimenStock} 份 -> 先投鱼塘展示 / 周赛，再转博物馆委托。`
            : '泽地带回的样本、藻材和生态线索会优先流向鱼塘与博物馆。',
          museumFocus ? `研究重点 -> 当前馆务「${museumFocus}」可直接承接这趟泽地见闻。` : '研究与展陈需求，通常会吃到泽地带回的样本。'
        ],
        actionCards,
        whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
        receiptSections: buildJourneyReceiptSections(regionId)
      }
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter((project: any) => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''
    const guildReady = true
    const villageReady = Boolean(projectName) || villageProjectStore.overviewSummary.availableProjects > 0
    const walletReady = crystalStock > 0 || Boolean(goalStore.currentThemeWeek?.name)
    const actionCards = [
      createActionCard(
        'guild',
        '公会',
        '先去公会把高地推进成果接进战备与下一轮远征准备。',
        `当前公会战备位于 ${guildStore.crossSystemOverview.currentRankBandLabel}，现在最容易承接高地回流。`,
        guildReady,
        '现在就去',
        '待战备提升'
      ),
      createActionCard(
        'village',
        '村庄',
        projectName ? `继续推进「${projectName}」等高地建设前置。` : '把高地带回的成果继续投进村庄建设与长期前置。',
        projectName ? `当前就有「${projectName}」这类建设项可继续接力。` : '高地回流和村庄建设的联动最容易形成长期收益。',
        villageReady,
        '随后处理',
        '待建设解锁'
      ),
      createActionCard(
        'wallet',
        '钱包',
        crystalStock > 0 ? `把灵脉结晶 ${crystalStock} 份继续转成高阶准备、预算与后续投入。` : '把高地回流继续转成高阶准备与预算安排。',
        goalStore.currentThemeWeek?.name ? `本周「${goalStore.currentThemeWeek.name}」会放大这部分高地回流价值。` : '高地收益最怕压仓，尽快转成准备更值。',
        walletReady,
        '可稍后去',
        '待形成库存'
      )
    ].filter(action => allowedKeys.has(action.key))

    return {
      headline: '高地回流会优先拆进公会、村庄与钱包。',
      resourceLines: [
        crystalStock > 0
          ? `灵脉结晶 ${crystalStock} 份 -> 先补公会战备，再转建设与高阶准备。`
          : '高地带回的晶体、军备和前哨成果会优先流向公会与建设线。',
        projectName ? `建设前置 -> 当前可继续推进「${projectName}」。` : '建设前置会持续消化高地带回的阶段成果。'
      ],
      actionCards,
      whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
      receiptSections: buildJourneyReceiptSections(regionId)
    }
  }

  function getJourneyFollowUpNotes(regionId: RegionId): string[] {
    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      return [
        archiveStock > 0 ? `任务板：当前古迹残卷 ${archiveStock} 份，可优先转成交付、委托或后续线索。` : '',
        shopFocus ? `商圈：可先围绕「${shopFocus}」补货，把荒道收获变成下一趟远行准备。` : '',
        hanhaiHint ? `瀚海：${hanhaiHint}` : '',
        goalStore.currentEventCampaign ? `活动：当前「${goalStore.currentEventCampaign.label}」也能承接这趟荒道回流。` : ''
      ].filter(Boolean)
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''
      return [
        specimenStock > 0 ? `鱼塘/博物馆：当前生态样本 ${specimenStock} 份，可优先转成展示池与学者委托。` : '',
        pondContest ? `鱼塘：本周周赛「${pondContest}」可继续吃到这趟泽地带回的样本与素材。` : '',
        museumStore.availableScholarCommissionCount > 0 ? `博物馆：当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接。` : '',
        museumFocus ? `馆务重点：可优先处理「${museumFocus}」。` : ''
      ].filter(Boolean)
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter((project: any) => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''
    return [
      crystalStock > 0 ? `公会/钱包：当前灵脉结晶 ${crystalStock} 份，可继续转成高地战备与高阶准备。` : '',
      `公会：当前战备位于 ${guildStore.crossSystemOverview.currentRankBandLabel}，可继续承接高地推进结果。`,
      projectName ? `村庄：可继续推进「${projectName}」等高地建设前置。` : '',
      goalStore.currentThemeWeek?.name ? `主题周：本周「${goalStore.currentThemeWeek.name}」会放大高地回流价值。` : ''
    ].filter(Boolean)
  }

  function getRegionHandoffSummary(regionId: RegionId) {
    const regionSummary = regionMapStore.regionSummaries.find((region: any) => region.id === regionId) ?? null
    const unlockedRouteCount = getRegionRoutes(regionId).filter(route => isRouteUnlocked(route.id)).length

    if (!regionSummary?.unlocked) {
      return {
        headline: '先推进解锁',
        detailLines: [`当前解锁条件：${getUnlockSummary(regionId)}`]
      }
    }

    if (regionId === 'ancient_road') {
      const detailLines = [
        `荒道节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('ancient_road')}/${unlockedRouteCount} 条，可继续补护送线和残卷线。`,
        goalStore.currentEventCampaign ? `活动承接：${goalStore.currentEventCampaign.label}` : '',
        hanhaiStore.crossSystemOverview.featuredCaravanContracts.length > 0
          ? `瀚海合同：${hanhaiStore.crossSystemOverview.featuredCaravanContracts.slice(0, 2).map((contract: any) => contract.label).join('、')}`
          : '',
        hanhaiStore.crossSystemOverview.activeBossCycle
          ? `瀚海焦点首领：${hanhaiStore.crossSystemOverview.activeBossCycle.label}`
          : '',
        shopStore.activityCampaignOfferRecommendations.length > 0
          ? `商圈补给：${shopStore.activityCampaignOfferRecommendations.slice(0, 2).map((offer: any) => offer.name).join('、')}`
          : shopStore.recommendedCatalogOffers.length > 0
            ? `商圈推荐：${shopStore.recommendedCatalogOffers.slice(0, 2).map((offer: any) => offer.name).join('、')}`
            : '',
        regionMapStore.getFamilyResourceQuantity('ancient_archive') > 0
          ? `当前已持有古迹残卷 ${regionMapStore.getFamilyResourceQuantity('ancient_archive')} 份，可先回任务板、商圈或瀚海消化。`
          : ''
      ].filter(Boolean)

      return {
        headline: '任务板 -> 商圈 -> 瀚海',
        detailLines
      }
    }

    if (regionId === 'mirage_marsh') {
      const detailLines = [
        `泽地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('mirage_marsh')}/${unlockedRouteCount} 条，可继续补夜游、样本和异常线。`,
        fishPondStore.currentPondContestDef ? `鱼塘周赛：${fishPondStore.currentPondContestDef.label}` : '',
        fishPondStore.displayOverview.entryCount > 0
          ? `展示池：已摆入 ${fishPondStore.displayOverview.entryCount} 条高光样本，总观赏值 ${fishPondStore.displayOverview.totalShowValue}`
          : '',
        museumStore.availableScholarCommissionCount > 0
          ? `馆务委托：当前可承接 ${museumStore.availableScholarCommissionCount} 条学者委托`
          : '',
        museumStore.featuredScholarCommissionOverview.length > 0
          ? `重点馆务：${museumStore.featuredScholarCommissionOverview.slice(0, 2).map((commission: any) => commission.title).join('、')}`
          : '',
        goalStore.currentEventCampaign ? `邮件/活动承接：${goalStore.currentEventCampaign.label}` : '',
        regionMapStore.getFamilyResourceQuantity('ecology_specimen') > 0
          ? `当前生态样本库存 ${regionMapStore.getFamilyResourceQuantity('ecology_specimen')} 份，可优先转成鱼塘展示或馆务委托。`
          : ''
      ].filter(Boolean)

      return {
        headline: '鱼塘 -> 博物馆 -> 邮箱',
        detailLines
      }
    }

    const highlandProjectNames = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter((project: any) => project.available || project.completed)
      .slice(0, 2)
      .map((project: any) => project.name)
    const detailLines = [
      goalStore.currentThemeWeek?.name ? `主题周承接：${goalStore.currentThemeWeek.name}` : '',
      `高地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('cloud_highland')}/${unlockedRouteCount} 条。`,
      `公会战备：Lv.${guildStore.guildLevel} / ${guildStore.crossSystemOverview.currentRankBandLabel}。`,
      highlandProjectNames.length > 0 ? `建设前置：${highlandProjectNames.join('、')}` : '',
      regionMapStore.getFamilyResourceQuantity('ley_crystal') > 0
        ? `灵脉结晶：当前库存 ${regionMapStore.getFamilyResourceQuantity('ley_crystal')}，可继续接公会、建设与高阶准备。`
        : ''
    ].filter(Boolean)
    return {
      headline: '公会 -> 村庄 -> 钱包',
      detailLines
    }
  }

  return {
    buildJourneyHandoffBoard,
    buildJourneyReceiptSections,
    getJourneyFollowUpNotes,
    getRegionHandoffSummary
  }
}
