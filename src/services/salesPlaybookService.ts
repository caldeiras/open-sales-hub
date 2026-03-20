import { getIdentityClient } from '@/lib/identityClient';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const identityClient = await getIdentityClient();
  const { data: { session } } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function salesGet(functionName: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/${functionName}`;
  const url = new URL(baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...headers, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} GET failed`);
  return data;
}

async function salesPost(functionName: string, body: any) {
  const headers = await getAuthHeaders();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/${functionName}`;
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { ...headers, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} POST failed`);
  return data;
}

// ===== Playbooks =====
export async function fetchPlaybooks(filters?: Record<string, string>) {
  return salesGet('sales-playbooks', filters);
}

export async function upsertPlaybook(data: { id?: string; name: string; description?: string; segment?: string; active?: boolean }) {
  return salesPost('sales-playbooks', data);
}

export async function fetchPlaybookSteps(playbookId: string) {
  return salesGet('sales-playbook-steps', { playbook_id: playbookId });
}

export async function upsertPlaybookSteps(data: { playbook_id: string; steps: any[] }) {
  return salesPost('sales-playbook-steps', data);
}

// ===== Templates =====
export async function fetchTemplates(filters?: Record<string, string>) {
  return salesGet('sales-templates', filters);
}

export async function upsertTemplate(data: { id?: string; type: string; name: string; subject?: string; body: string; variables?: any[]; active?: boolean }) {
  return salesPost('sales-templates', data);
}

// ===== Executions =====
export async function fetchPlaybookExecutions(filters?: Record<string, string>) {
  return salesGet('sales-playbook-executions', filters);
}

export async function startPlaybookExecution(data: { playbook_id: string; opportunity_id?: string; account_id?: string; contact_id?: string; owner_user_id?: string }) {
  return salesPost('sales-playbook-executions', data);
}

export async function managePlaybookExecution(data: { id: string; action: 'pause' | 'resume' | 'cancel' }) {
  return salesPost('sales-playbook-executions', data);
}

// ===== Alerts =====
export async function fetchAlerts(unread?: boolean) {
  return salesGet('sales-alerts', unread ? { unread: 'true' } : undefined);
}

export async function markAlertRead(id: string) {
  return salesPost('sales-alerts', { action: 'mark_read', id });
}

export async function markAllAlertsRead() {
  return salesPost('sales-alerts', { action: 'mark_all_read' });
}

// ===== Rules =====
export async function fetchFollowupRules() {
  return salesGet('sales-followup-rules');
}

export async function upsertFollowupRule(data: any) {
  return salesPost('sales-followup-rules', data);
}

export async function fetchSlaRules() {
  return salesGet('sales-sla-rules');
}

export async function upsertSlaRule(data: any) {
  return salesPost('sales-sla-rules', data);
}

// ===== Engines =====
export async function runPlaybookEngine() {
  return salesPost('sales-playbook-engine', {});
}

export async function runFollowupEngine() {
  return salesPost('sales-followup-engine', {});
}

export async function runSlaEngine() {
  return salesPost('sales-sla-engine', {});
}
