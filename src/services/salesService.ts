import { supabase } from '@/integrations/supabase/client';
import { getIdentityClient } from '@/lib/identityClient';

/**
 * Commercial proxy — calls Edge Function to access CORE Commercial project.
 * 
 * Client map:
 *  - identityClient  → auth, profiles, user_roles, roles (macmkfoknhofnwhizsqc)
 *  - commercialProxy → sales_* tables on CORE Commercial (zkjrcenhemnnlmjiysbc) via Edge Function
 *  - localClient     → NOT used for commercial domain anymore
 */

interface ProxyRequest {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  filters?: Record<string, any>;
  data?: Record<string, any>;
  select?: string;
  order?: { column: string; ascending?: boolean };
}

async function commercialQuery(request: ProxyRequest) {
  // Get Identity session token to authenticate the proxy call
  const identityClient = await getIdentityClient();
  const { data: { session } } = await identityClient.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated — no identity session');
  }

  const { data, error } = await supabase.functions.invoke('sales-commercial-proxy', {
    body: request,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw new Error(error.message || 'Commercial proxy error');
  if (data?.error) throw new Error(data.error);

  return data?.data || [];
}

// ===== Pipeline Stages =====
export async function fetchPipelineStages() {
  return commercialQuery({
    table: 'sales_pipeline_stages',
    operation: 'select',
    select: '*',
    order: { column: 'stage_order', ascending: true },
  });
}

// ===== Opportunities =====
export async function fetchOpportunities(filters?: Record<string, any>) {
  return commercialQuery({
    table: 'sales_opportunities',
    operation: 'select',
    select: '*, account:sales_accounts(id, company_name), contact:sales_contacts(id, first_name, last_name), stage:sales_pipeline_stages(id, stage_name, stage_order, color), source:sales_lead_sources(id, source_name), segment:sales_segments(id, segment_name)',
    filters,
    order: { column: 'created_at', ascending: false },
  });
}

export async function fetchOpportunityById(id: string) {
  const data = await commercialQuery({
    table: 'sales_opportunities',
    operation: 'select',
    select: '*, account:sales_accounts(*), contact:sales_contacts(*), stage:sales_pipeline_stages(*), source:sales_lead_sources(*), segment:sales_segments(*), loss_reason:sales_loss_reasons(*)',
    filters: { id },
  });
  return data?.[0] || null;
}

// ===== Leads =====
export async function fetchLeads(filters?: Record<string, any>) {
  return commercialQuery({
    table: 'sales_leads',
    operation: 'select',
    select: '*',
    filters,
    order: { column: 'created_at', ascending: false },
  });
}

// ===== Accounts =====
export async function fetchAccounts(filters?: Record<string, any>) {
  return commercialQuery({
    table: 'sales_accounts',
    operation: 'select',
    select: '*',
    filters,
    order: { column: 'company_name', ascending: true },
  });
}

export async function fetchAccountById(id: string) {
  const data = await commercialQuery({
    table: 'sales_accounts',
    operation: 'select',
    select: '*',
    filters: { id },
  });
  return data?.[0] || null;
}

// ===== Contacts =====
export async function fetchContacts(filters?: Record<string, any>) {
  return commercialQuery({
    table: 'sales_contacts',
    operation: 'select',
    select: '*, account:sales_accounts(id, company_name)',
    filters,
    order: { column: 'first_name', ascending: true },
  });
}

// ===== Activities =====
export async function fetchActivities(filters?: Record<string, any>) {
  return commercialQuery({
    table: 'sales_activities',
    operation: 'select',
    select: '*, opportunity:sales_opportunities(id, title), account:sales_accounts(id, company_name), contact:sales_contacts(id, first_name, last_name)',
    filters,
    order: { column: 'due_date', ascending: true },
  });
}

// ===== Proposals =====
export async function fetchProposals() {
  return commercialQuery({
    table: 'sales_proposals_links',
    operation: 'select',
    select: '*, opportunity:sales_opportunities(id, title, account:sales_accounts(id, company_name))',
    order: { column: 'created_at', ascending: false },
  });
}

// ===== Notes =====
export async function fetchNotes(entityType: string, entityId: string) {
  return commercialQuery({
    table: 'sales_notes',
    operation: 'select',
    select: '*',
    filters: { entity_type: entityType, entity_id: entityId },
    order: { column: 'created_at', ascending: false },
  });
}

// ===== Stage History =====
export async function fetchStageHistory(opportunityId: string) {
  return commercialQuery({
    table: 'sales_opportunity_stage_history',
    operation: 'select',
    select: '*, from_stage:sales_pipeline_stages!from_stage_id(stage_name, color), to_stage:sales_pipeline_stages!to_stage_id(stage_name, color)',
    filters: { opportunity_id: opportunityId },
    order: { column: 'changed_at', ascending: false },
  });
}

// ===== Tags =====
export async function fetchTags() {
  return commercialQuery({
    table: 'sales_tags',
    operation: 'select',
    select: '*',
    order: { column: 'tag_name', ascending: true },
  });
}

// ===== Lead Sources =====
export async function fetchLeadSources() {
  return commercialQuery({
    table: 'sales_lead_sources',
    operation: 'select',
    select: '*',
    order: { column: 'source_name', ascending: true },
  });
}

// ===== Segments =====
export async function fetchSegments() {
  return commercialQuery({
    table: 'sales_segments',
    operation: 'select',
    select: '*',
    order: { column: 'segment_name', ascending: true },
  });
}

// ===== Loss Reasons =====
export async function fetchLossReasons() {
  return commercialQuery({
    table: 'sales_loss_reasons',
    operation: 'select',
    select: '*',
    order: { column: 'reason_name', ascending: true },
  });
}

// ===== Opportunity Products =====
export async function fetchOpportunityProducts(opportunityId: string) {
  return commercialQuery({
    table: 'sales_opportunity_products',
    operation: 'select',
    select: '*',
    filters: { opportunity_id: opportunityId },
  });
}
