import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as pbService from '@/services/salesPlaybookService';

// ===== Playbooks =====
export function usePlaybooks(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['playbooks', filters], queryFn: () => pbService.fetchPlaybooks(filters) });
}

export function useUpsertPlaybook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.upsertPlaybook,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playbooks'] }); },
  });
}

export function usePlaybookSteps(playbookId: string) {
  return useQuery({ queryKey: ['playbook-steps', playbookId], queryFn: () => pbService.fetchPlaybookSteps(playbookId), enabled: !!playbookId });
}

export function useUpsertPlaybookSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.upsertPlaybookSteps,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playbook-steps'] }); },
  });
}

// ===== Templates =====
export function useTemplates(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['templates', filters], queryFn: () => pbService.fetchTemplates(filters) });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.upsertTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); },
  });
}

// ===== Executions =====
export function usePlaybookExecutions(filters?: Record<string, string>) {
  return useQuery({ queryKey: ['playbook-executions', filters], queryFn: () => pbService.fetchPlaybookExecutions(filters) });
}

export function useStartPlaybookExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.startPlaybookExecution,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playbook-executions'] }); qc.invalidateQueries({ queryKey: ['activities'] }); },
  });
}

export function useManagePlaybookExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.managePlaybookExecution,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['playbook-executions'] }); },
  });
}

// ===== Alerts =====
export function useAlerts(unreadOnly?: boolean) {
  return useQuery({ queryKey: ['alerts', unreadOnly], queryFn: () => pbService.fetchAlerts(unreadOnly) });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.markAlertRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.markAllAlertsRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

// ===== Rules =====
export function useFollowupRules() {
  return useQuery({ queryKey: ['followup-rules'], queryFn: pbService.fetchFollowupRules });
}

export function useUpsertFollowupRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.upsertFollowupRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['followup-rules'] }); },
  });
}

export function useSlaRules() {
  return useQuery({ queryKey: ['sla-rules'], queryFn: pbService.fetchSlaRules });
}

export function useUpsertSlaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pbService.upsertSlaRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sla-rules'] }); },
  });
}
