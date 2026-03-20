import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/salesIntelligenceService';

export function useOpportunityScores(userId?: string) {
  return useQuery({ queryKey: ['opportunity-scores', userId], queryFn: () => svc.fetchOpportunityScores(userId) });
}

export function useRecommendations() {
  return useQuery({ queryKey: ['recommendations'], queryFn: svc.fetchRecommendations });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.dismissRecommendation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recommendations'] }); },
  });
}

export function useDismissAllRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.dismissAllRecommendations,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recommendations'] }); },
  });
}

export function useRiskFlags(resolved?: boolean) {
  return useQuery({ queryKey: ['risk-flags', resolved], queryFn: () => svc.fetchRiskFlags(resolved) });
}

export function useResolveRiskFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.resolveRiskFlag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-flags'] }); },
  });
}

export function useScoringRules() {
  return useQuery({ queryKey: ['scoring-rules'], queryFn: svc.fetchScoringRules });
}

export function useUpsertScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.upsertScoringRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scoring-rules'] }); },
  });
}
