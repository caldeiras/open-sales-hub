import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as salesService from '@/services/salesService';

// ===== Config =====
export function usePipelineStages() {
  return useQuery({ queryKey: ['pipeline-stages'], queryFn: salesService.fetchPipelineStages });
}

export function useLeadSources() {
  return useQuery({ queryKey: ['lead-sources'], queryFn: salesService.fetchLeadSources });
}

export function useSegments() {
  return useQuery({ queryKey: ['segments'], queryFn: salesService.fetchSegments });
}

export function useLossReasons() {
  return useQuery({ queryKey: ['loss-reasons'], queryFn: salesService.fetchLossReasons });
}

// ===== Accounts =====
export function useAccounts(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['accounts', filters], queryFn: () => salesService.fetchAccounts(filters) });
}

export function useAccount(id: string) {
  return useQuery({ queryKey: ['account', id], queryFn: () => salesService.fetchAccountById(id), enabled: !!id });
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });
}

// ===== Contacts =====
export function useContacts(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['contacts', filters], queryFn: () => salesService.fetchContacts(filters) });
}

export function useUpsertContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
}

// ===== Opportunities =====
export function useOpportunities(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['opportunities', filters], queryFn: () => salesService.fetchOpportunities(filters) });
}

export function useOpportunity(id: string) {
  return useQuery({ queryKey: ['opportunity', id], queryFn: () => salesService.fetchOpportunityById(id), enabled: !!id });
}

export function useUpsertOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertOpportunity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
    },
  });
}

// ===== Activities =====
export function useActivities(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['activities', filters], queryFn: () => salesService.fetchActivities(filters) });
}

export function useUpsertActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertActivity,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); },
  });
}

// ===== Phase 3: Pipeline Engine =====
export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard-summary'], queryFn: salesService.fetchDashboardSummary });
}

export function usePipelineBoard(status?: string) {
  return useQuery({ queryKey: ['pipeline-board', status], queryFn: () => salesService.fetchPipelineBoard(status) });
}

export function useStageHistory(opportunityId: string) {
  return useQuery({ queryKey: ['stage-history', opportunityId], queryFn: () => salesService.fetchStageHistory(opportunityId), enabled: !!opportunityId });
}

export function useMoveOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.moveOpportunityStage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['stage-history'] });
    },
  });
}

// ===== Phase 4: Forecast & Proposal =====
export function useForecastSummary() {
  return useQuery({ queryKey: ['forecast-summary'], queryFn: salesService.fetchForecastSummary });
}

export function useUpsertForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertForecast,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
      qc.invalidateQueries({ queryKey: ['forecast-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useLinkProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.linkProposal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
    },
  });
}

// ===== Phase 5: Revenue Engine =====
export function useRevenueSummary() {
  return useQuery({ queryKey: ['revenue-summary'], queryFn: salesService.fetchRevenueSummary });
}

export function useRevenueEvents(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['revenue-events', filters], queryFn: () => salesService.fetchRevenueEvents(filters) });
}

export function useMarkWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.markOpportunityWon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['forecast-summary'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      qc.invalidateQueries({ queryKey: ['revenue-events'] });
    },
  });
}

export function useMarkLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.markOpportunityLost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['forecast-summary'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      qc.invalidateQueries({ queryKey: ['revenue-events'] });
    },
  });
}

// ===== Phase 6: Goals, Commissions & Ranking =====
export function useGoals(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['goals', filters], queryFn: () => salesService.fetchGoals(filters) });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.upsertGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goal-performance'] });
      qc.invalidateQueries({ queryKey: ['ranking-summary'] });
    },
  });
}

export function useCommissions(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['commissions', filters], queryFn: () => salesService.fetchCommissions(filters) });
}

export function useSyncCommissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (periodMonth?: string) => salesService.syncCommissionsFromCore(periodMonth),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['ranking-summary'] });
    },
  });
}

export function useRankingSummary(periodMonth?: string) {
  return useQuery({ queryKey: ['ranking-summary', periodMonth], queryFn: () => salesService.fetchRankingSummary(periodMonth) });
}

export function useGoalPerformance(periodMonth?: string) {
  return useQuery({ queryKey: ['goal-performance', periodMonth], queryFn: () => salesService.fetchGoalPerformance(periodMonth) });
}

// ===== Stubs =====
export function useLeads(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['leads', filters], queryFn: () => salesService.fetchLeads(filters) });
}

export function useProposals() {
  return useQuery({ queryKey: ['proposals'], queryFn: salesService.fetchProposals });
}

export function useNotes(entityType: string, entityId: string) {
  return useQuery({ queryKey: ['notes', entityType, entityId], queryFn: () => salesService.fetchNotes(entityType, entityId), enabled: !!entityId });
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: salesService.fetchTags });
}

export function useOpportunityProducts(opportunityId: string) {
  return useQuery({ queryKey: ['opportunity-products', opportunityId], queryFn: () => salesService.fetchOpportunityProducts(opportunityId), enabled: !!opportunityId });
}
