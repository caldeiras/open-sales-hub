// ===== RBAC Types =====
export interface RbacApp {
  id: string;
  app_code: string;
  app_name: string;
}

export interface RbacRole {
  id: string;
  app_id: string;
  role_code: string;
  role_name: string;
  description?: string;
}

export interface RbacPermission {
  id: string;
  app_id: string;
  permission_key: string;
  description?: string;
}

export interface RbacUserRole {
  id: string;
  user_id: string;
  role_id: string;
  app_id: string;
}

export interface RbacUserScope {
  id: string;
  user_id: string;
  app_id: string;
  scope_type: 'own' | 'team' | 'all';
}

// ===== Sales Types =====
export interface SalesAccount {
  id: string;
  company_name: string;
  trade_name?: string;
  cnpj?: string;
  website?: string;
  industry?: string;
  segment_id?: string;
  status: string;
  owner_user_id?: string;
  owner_team_id?: string;
  city?: string;
  state?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesContact {
  id: string;
  account_id?: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  job_title?: string;
  department?: string;
  influence_level?: string;
  is_primary: boolean;
  status: string;
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesLead {
  id: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  source_id?: string;
  segment_id?: string;
  status: string;
  temperature?: string;
  owner_user_id?: string;
  owner_team_id?: string;
  notes?: string;
  converted_at?: string;
  converted_opportunity_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesPipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  stage_code?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
}

export interface SalesLeadSource {
  id: string;
  source_name: string;
  source_code?: string;
  is_active: boolean;
}

export interface SalesSegment {
  id: string;
  segment_name: string;
  segment_code?: string;
  is_active: boolean;
}

export interface SalesLossReason {
  id: string;
  reason_name: string;
  reason_code?: string;
  is_active: boolean;
}

export interface SalesOpportunity {
  id: string;
  title: string;
  account_id?: string;
  contact_id?: string;
  owner_user_id?: string;
  owner_team_id?: string;
  source_id?: string;
  segment_id?: string;
  stage_id?: string;
  pipeline_status: string;
  estimated_mrr?: number;
  estimated_setup?: number;
  estimated_tcv?: number;
  probability?: number;
  expected_close_date?: string;
  competitor_name?: string;
  loss_reason_id?: string;
  strategic_notes?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  // Joined data
  account?: SalesAccount;
  contact?: SalesContact;
  stage?: SalesPipelineStage;
  source?: SalesLeadSource;
  segment?: SalesSegment;
  loss_reason?: SalesLossReason;
}

export interface SalesActivity {
  id: string;
  opportunity_id?: string;
  account_id?: string;
  contact_id?: string;
  activity_type: string;
  title: string;
  description?: string;
  priority?: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesNote {
  id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  author_user_id?: string;
  created_at: string;
}

export interface SalesOpportunityStageHistory {
  id: string;
  opportunity_id: string;
  from_stage_id?: string;
  to_stage_id: string;
  changed_by_user_id?: string;
  changed_at: string;
  notes?: string;
}

export interface SalesProposalLink {
  id: string;
  opportunity_id: string;
  proposal_number?: string;
  external_url?: string;
  status: string;
  monthly_value?: number;
  setup_value?: number;
  tcv?: number;
  contract_term_months?: number;
  sent_at?: string;
  expires_at?: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesTag {
  id: string;
  tag_name: string;
  color?: string;
}

export interface SalesEntityTag {
  id: string;
  tag_id: string;
  entity_type: string;
  entity_id: string;
}

export interface SalesOpportunityProduct {
  id: string;
  opportunity_id: string;
  product_name: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  recurrence?: string;
}

// ===== Aggregated/View Types =====
export interface DashboardKPIs {
  totalPipeline: number;
  potentialMRR: number;
  potentialTCV: number;
  opportunitiesByStage: { stage: string; count: number; value: number; color?: string }[];
  proposalsSent: number;
  proposalsApproved: number;
  proposalsRejected: number;
  todayActivities: number;
  overdueFollowups: number;
  noNextAction: number;
}

export type ScopeType = 'own' | 'team' | 'all';
export type PipelineStatus = 'open' | 'won' | 'lost' | 'hold';
