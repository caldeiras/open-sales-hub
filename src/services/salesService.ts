import { supabase } from '@/integrations/supabase/client';
import { getIdentityClient } from '@/lib/identityClient';

/**
 * All commercial data flows through dedicated Edge Functions that:
 * 1. Validate the Identity JWT
 * 2. Check roles (admin/gerente_comercial see all, comercial sees own)
 * 3. Use COMMERCIAL_SERVICE_ROLE_KEY to operate on the Commercial DB
 */

async function getAuthHeaders(): Promise<Record<string, string>> {
  const identityClient = await getIdentityClient();
  const { data: { session } } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function invokeFunction(name: string, options?: { body?: any; method?: string; params?: Record<string, string> }) {
  const headers = await getAuthHeaders();
  
  // For GET requests with params, we pass them in the body since supabase.functions.invoke uses POST
  // The Edge Function reads URL params for GET, so we simulate by sending method info
  const { data, error } = await supabase.functions.invoke(name, {
    body: { ...options?.body, _method: options?.method || 'GET', _params: options?.params },
    headers,
  });

  if (error) throw new Error(error.message || `${name} error`);
  if (data?.error) throw new Error(data.error);
  return data;
}

// We need to adjust: supabase.functions.invoke always sends POST.
// Our Edge Functions use req.method. Let's use a wrapper that handles this.
async function salesGet(functionName: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  
  // Build URL with query params for GET
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
    headers: {
      ...headers,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
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
    headers: {
      ...headers,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} POST failed`);
  return data;
}

// ===== Pipeline Stages (config — read via generic proxy) =====
export async function fetchPipelineStages() {
  return salesGet('sales-commercial-proxy', undefined).catch(() => {
    // Fallback: use dedicated proxy body
    return invokeFunction('sales-commercial-proxy', {
      body: { table: 'sales_pipeline_stages', operation: 'select', select: '*', order: { column: 'stage_order', ascending: true } },
    });
  });
}

// ===== Accounts =====
export async function fetchAccounts(filters?: Record<string, any>) {
  return salesGet('sales-accounts', filters as any);
}

export async function fetchAccountById(id: string) {
  const accounts = await salesGet('sales-accounts', { id } as any);
  // The Edge Function returns a list filtered by ownership; find the one
  return Array.isArray(accounts) ? accounts.find((a: any) => a.id === id) || null : accounts;
}

export async function upsertAccount(data: any) {
  return salesPost('sales-accounts', data);
}

// ===== Contacts =====
export async function fetchContacts(filters?: Record<string, any>) {
  return salesGet('sales-contacts', filters as any);
}

export async function upsertContact(data: any) {
  return salesPost('sales-contacts', data);
}

// ===== Opportunities =====
export async function fetchOpportunities(filters?: Record<string, any>) {
  return salesGet('sales-opportunities', filters as any);
}

export async function fetchOpportunityById(id: string) {
  return salesGet('sales-opportunities', { id });
}

export async function upsertOpportunity(data: any) {
  return salesPost('sales-opportunities', data);
}

// ===== Activities =====
export async function fetchActivities(filters?: Record<string, any>) {
  return salesGet('sales-activities', filters as any);
}

export async function upsertActivity(data: any) {
  return salesPost('sales-activities', data);
}

// ===== Config tables (via commercial proxy) =====
async function fetchConfigTable(table: string, orderColumn: string) {
  return invokeFunction('sales-commercial-proxy', {
    body: { table, operation: 'select', select: '*', order: { column: orderColumn, ascending: true } },
  });
}

export async function fetchLeadSources() {
  return fetchConfigTable('sales_lead_sources', 'sort_order');
}

export async function fetchSegments() {
  return fetchConfigTable('sales_segments', 'sort_order');
}

export async function fetchLossReasons() {
  return fetchConfigTable('sales_loss_reasons', 'sort_order');
}

// ===== Stubs for future features (not in Phase 2 scope) =====
export async function fetchLeads(_filters?: Record<string, any>) { return []; }
export async function fetchProposals() { return []; }
export async function fetchNotes(_entityType: string, _entityId: string) { return []; }
export async function fetchStageHistory(_opportunityId: string) { return []; }
export async function fetchTags() { return []; }
export async function fetchOpportunityProducts(_opportunityId: string) { return []; }
