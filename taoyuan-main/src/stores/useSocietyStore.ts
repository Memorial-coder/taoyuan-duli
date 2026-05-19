import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  acceptSocietyRequest,
  applyToSociety,
  closeSocietyProposal,
  contributeSocietyPublicProject,
  createSociety,
  createSocietyProposal,
  fetchSocietyOverview,
  inviteToSociety,
  rejectSocietyRequest,
  updateSocietyMemberRole,
  updateSocietyNotice,
  voteSocietyProposal,
  type SocietyOverviewResponse,
  type SocietyProposalChoice,
  type SocietyRole,
  type SocietySnapshot,
  type SocietyVisibility,
} from '@/utils/societyApi'

export const useSocietyStore = defineStore('onlineSociety', () => {
  const overview = ref<SocietyOverviewResponse | null>(null)
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')

  const draftName = ref('')
  const draftSummary = ref('')
  const draftNotice = ref('')
  const draftEmblem = ref('')
  const draftTheme = ref('')
  const draftVisibility = ref<SocietyVisibility>('public')
  const draftCapacity = ref(24)
  const draftJoinRequirementId = ref('')
  const draftJoinRequirementNote = ref('')

  const draftInviteUsername = ref('')
  const draftProposalTitle = ref('')
  const draftProposalSummary = ref('')
  const draftProposalKind = ref('')

  const mySociety = computed<SocietySnapshot | null>(() => overview.value?.my_society ?? null)
  const visibleSocieties = computed(() => overview.value?.visible_societies ?? [])
  const incomingInvites = computed(() => overview.value?.incoming_invites ?? [])
  const myPendingRequests = computed(() => overview.value?.my_pending_requests ?? [])
  const managedRequests = computed(() => overview.value?.managed_requests ?? [])
  const visibilityOptions = computed(() => overview.value?.visibility_options ?? [])
  const themeOptions = computed(() => overview.value?.theme_options ?? [])
  const emblemOptions = computed(() => overview.value?.emblem_options ?? [])
  const capacityOptions = computed(() => overview.value?.capacity_options ?? [])
  const joinRequirementOptions = computed(() => overview.value?.join_requirement_options ?? [])
  const roleOptions = computed(() => overview.value?.role_options ?? [])
  const proposalKindOptions = computed(() => overview.value?.proposal_kind_options ?? [])

  const ensureDraftDefaults = () => {
    if (!draftEmblem.value) draftEmblem.value = emblemOptions.value[0]?.id ?? 'plum_seal'
    if (!draftTheme.value) draftTheme.value = themeOptions.value[0]?.id ?? 'harvest_union'
    if (!draftJoinRequirementId.value) draftJoinRequirementId.value = joinRequirementOptions.value[0]?.id ?? 'open'
    if (!draftProposalKind.value) draftProposalKind.value = proposalKindOptions.value[0]?.id ?? 'governance'
    if (!capacityOptions.value.some(entry => entry.value === draftCapacity.value)) {
      draftCapacity.value = capacityOptions.value[0]?.value ?? 24
    }
  }

  const hydrateOverview = (data: SocietyOverviewResponse | null) => {
    overview.value = data
    draftNotice.value = data?.my_society?.notice ?? ''
    ensureDraftDefaults()
  }

  const resolveOverview = async (nextOverview?: Omit<SocietyOverviewResponse, 'ok'> | null) => {
    const data = nextOverview ? { ok: true, ...nextOverview } : await fetchSocietyOverview()
    hydrateOverview(data)
    return overview.value
  }

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchSocietyOverview()
      hydrateOverview(data)
      return overview.value
    } catch (error) {
      overview.value = null
      errorMessage.value = error instanceof Error ? error.message : '获取村社信息失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const runAction = async <T>(runner: () => Promise<T>) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      return await runner()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '村社操作失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const submitSociety = async () => {
    return runAction(async () => {
      const result = await createSociety({
        name: draftName.value,
        summary: draftSummary.value,
        notice: draftNotice.value,
        emblem: draftEmblem.value,
        theme: draftTheme.value,
        visibility: draftVisibility.value,
        capacity: draftCapacity.value,
        join_requirement_id: draftJoinRequirementId.value,
        join_requirement_note: draftJoinRequirementNote.value,
      })
      draftName.value = ''
      draftSummary.value = ''
      draftJoinRequirementNote.value = ''
      await resolveOverview(result?.overview ?? null)
      return mySociety.value
    })
  }

  const applySociety = async (societyId: string) => {
    return runAction(async () => {
      const result = await applyToSociety(societyId)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const inviteMember = async () => {
    const target = draftInviteUsername.value.trim()
    if (!target) return null
    return runAction(async () => {
      const result = await inviteToSociety(target)
      draftInviteUsername.value = ''
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const acceptRequest = async (requestId: string) => {
    return runAction(async () => {
      const result = await acceptSocietyRequest(requestId)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const rejectRequest = async (requestId: string) => {
    return runAction(async () => {
      const result = await rejectSocietyRequest(requestId)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const changeMemberRole = async (targetUsername: string, role: Exclude<SocietyRole, 'president'>) => {
    return runAction(async () => {
      const result = await updateSocietyMemberRole(targetUsername, role)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const saveNotice = async () => {
    return runAction(async () => {
      const result = await updateSocietyNotice(draftNotice.value)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const submitProposal = async () => {
    return runAction(async () => {
      const result = await createSocietyProposal({
        title: draftProposalTitle.value,
        summary: draftProposalSummary.value,
        kind: draftProposalKind.value,
      })
      draftProposalTitle.value = ''
      draftProposalSummary.value = ''
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const castProposalVote = async (proposalId: string, choice: SocietyProposalChoice) => {
    return runAction(async () => {
      const result = await voteSocietyProposal(proposalId, choice)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const archiveProposal = async (proposalId: string, resolutionNote = '') => {
    return runAction(async () => {
      const result = await closeSocietyProposal(proposalId, resolutionNote)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  const contributeProject = async (projectId: string, packageId: string) => {
    return runAction(async () => {
      const result = await contributeSocietyPublicProject(projectId, packageId)
      await resolveOverview(result?.overview ?? null)
      return result
    })
  }

  return {
    overview,
    loading,
    actionRunning,
    errorMessage,
    draftName,
    draftSummary,
    draftNotice,
    draftEmblem,
    draftTheme,
    draftVisibility,
    draftCapacity,
    draftJoinRequirementId,
    draftJoinRequirementNote,
    draftInviteUsername,
    draftProposalTitle,
    draftProposalSummary,
    draftProposalKind,
    mySociety,
    visibleSocieties,
    incomingInvites,
    myPendingRequests,
    managedRequests,
    visibilityOptions,
    themeOptions,
    emblemOptions,
    capacityOptions,
    joinRequirementOptions,
    roleOptions,
    proposalKindOptions,
    refreshOverview,
    submitSociety,
    applySociety,
    inviteMember,
    acceptRequest,
    rejectRequest,
    changeMemberRole,
    saveNotice,
    submitProposal,
    castProposalVote,
    archiveProposal,
    contributeProject,
  }
})
