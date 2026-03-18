import { useQuery } from '@tanstack/react-query';
import * as salesService from '@/services/salesService';

export function usePipelineStages() {
  return useQuery({ queryKey: ['pipeline-stages'], queryFn: salesService.fetchPipelineStages });
}

export function useOpportunities(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['opportunities', filters], queryFn: () => salesService.fetchOpportunities(filters) });
}

export function useOpportunity(id: string) {
  return useQuery({ queryKey: ['opportunity', id], queryFn: () => salesService.fetchOpportunityById(id), enabled: !!id });
}

export function useLeads(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['leads', filters], queryFn: () => salesService.fetchLeads(filters) });
}

export function useAccounts(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['accounts', filters], queryFn: () => salesService.fetchAccounts(filters) });
}

export function useAccount(id: string) {
  return useQuery({ queryKey: ['account', id], queryFn: () => salesService.fetchAccountById(id), enabled: !!id });
}

export function useContacts(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['contacts', filters], queryFn: () => salesService.fetchContacts(filters) });
}

export function useActivities(filters?: Record<string, any>) {
  return useQuery({ queryKey: ['activities', filters], queryFn: () => salesService.fetchActivities(filters) });
}

export function useProposals() {
  return useQuery({ queryKey: ['proposals'], queryFn: salesService.fetchProposals });
}

export function useNotes(entityType: string, entityId: string) {
  return useQuery({ queryKey: ['notes', entityType, entityId], queryFn: () => salesService.fetchNotes(entityType, entityId), enabled: !!entityId });
}

export function useStageHistory(opportunityId: string) {
  return useQuery({ queryKey: ['stage-history', opportunityId], queryFn: () => salesService.fetchStageHistory(opportunityId), enabled: !!opportunityId });
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: salesService.fetchTags });
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

export function useOpportunityProducts(opportunityId: string) {
  return useQuery({ queryKey: ['opportunity-products', opportunityId], queryFn: () => salesService.fetchOpportunityProducts(opportunityId), enabled: !!opportunityId });
}
