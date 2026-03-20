import { supabase } from '@/integrations/supabase/client';

/**
 * LOCAL client — used ONLY for sales_* tables owned by SALES OPEN.
 * 
 * Client map:
 *  - identityClient  → auth, profiles, user_roles, roles (macmkfoknhofnwhizsqc)
 *  - commercialClient → proposals, contracts, pricing from CORE (zkjrcenhemnnlmjiysbc)
 *  - localClient (this) → sales_* domain tables in Lovable Cloud
 */
const localClient = supabase as any;

// ===== Pipeline Stages =====
export async function fetchPipelineStages() {
  const { data, error } = await client.from('sales_pipeline_stages').select('*').order('stage_order');
  if (error) throw error;
  return data || [];
}

// ===== Opportunities =====
export async function fetchOpportunities(filters?: Record<string, any>) {
  let query = client.from('sales_opportunities').select(`
    *,
    account:sales_accounts(id, company_name),
    contact:sales_contacts(id, first_name, last_name),
    stage:sales_pipeline_stages(id, stage_name, stage_order, color),
    source:sales_lead_sources(id, source_name),
    segment:sales_segments(id, segment_name)
  `).order('created_at', { ascending: false });

  if (filters?.stage_id) query = query.eq('stage_id', filters.stage_id);
  if (filters?.pipeline_status) query = query.eq('pipeline_status', filters.pipeline_status);
  if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  if (filters?.segment_id) query = query.eq('segment_id', filters.segment_id);
  if (filters?.source_id) query = query.eq('source_id', filters.source_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchOpportunityById(id: string) {
  const { data, error } = await client.from('sales_opportunities').select(`
    *,
    account:sales_accounts(*),
    contact:sales_contacts(*),
    stage:sales_pipeline_stages(*),
    source:sales_lead_sources(*),
    segment:sales_segments(*),
    loss_reason:sales_loss_reasons(*)
  `).eq('id', id).single();
  if (error) throw error;
  return data;
}

// ===== Leads =====
export async function fetchLeads(filters?: Record<string, any>) {
  let query = client.from('sales_leads').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.source_id) query = query.eq('source_id', filters.source_id);
  if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ===== Accounts =====
export async function fetchAccounts(filters?: Record<string, any>) {
  let query = client.from('sales_accounts').select('*').order('company_name');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.segment_id) query = query.eq('segment_id', filters.segment_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAccountById(id: string) {
  const { data, error } = await client.from('sales_accounts').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ===== Contacts =====
export async function fetchContacts(filters?: Record<string, any>) {
  let query = client.from('sales_contacts').select(`*, account:sales_accounts(id, company_name)`).order('first_name');
  if (filters?.account_id) query = query.eq('account_id', filters.account_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ===== Activities =====
export async function fetchActivities(filters?: Record<string, any>) {
  let query = client.from('sales_activities').select(`
    *,
    opportunity:sales_opportunities(id, title),
    account:sales_accounts(id, company_name),
    contact:sales_contacts(id, first_name, last_name)
  `).order('due_date', { ascending: true });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ===== Proposals =====
export async function fetchProposals() {
  const { data, error } = await client.from('sales_proposals_links').select(`
    *,
    opportunity:sales_opportunities(id, title, account:sales_accounts(id, company_name))
  `).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== Notes =====
export async function fetchNotes(entityType: string, entityId: string) {
  const { data, error } = await client.from('sales_notes')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== Stage History =====
export async function fetchStageHistory(opportunityId: string) {
  const { data, error } = await client.from('sales_opportunity_stage_history').select(`
    *,
    from_stage:sales_pipeline_stages!from_stage_id(stage_name, color),
    to_stage:sales_pipeline_stages!to_stage_id(stage_name, color)
  `).eq('opportunity_id', opportunityId).order('changed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== Tags =====
export async function fetchTags() {
  const { data, error } = await client.from('sales_tags').select('*').order('tag_name');
  if (error) throw error;
  return data || [];
}

// ===== Lead Sources =====
export async function fetchLeadSources() {
  const { data, error } = await client.from('sales_lead_sources').select('*').order('source_name');
  if (error) throw error;
  return data || [];
}

// ===== Segments =====
export async function fetchSegments() {
  const { data, error } = await client.from('sales_segments').select('*').order('segment_name');
  if (error) throw error;
  return data || [];
}

// ===== Loss Reasons =====
export async function fetchLossReasons() {
  const { data, error } = await client.from('sales_loss_reasons').select('*').order('reason_name');
  if (error) throw error;
  return data || [];
}

// ===== Opportunity Products =====
export async function fetchOpportunityProducts(opportunityId: string) {
  const { data, error } = await client.from('sales_opportunity_products')
    .select('*')
    .eq('opportunity_id', opportunityId);
  if (error) throw error;
  return data || [];
}
