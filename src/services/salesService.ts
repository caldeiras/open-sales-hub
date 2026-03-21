import { getIdentityClient } from "@/lib/identityClient";

/**
 * All commercial data flows through dedicated Edge Functions that:
 * 1. Validate the Identity JWT
 * 2. Check roles (admin/gerente_comercial see all, comercial sees own)
 * 3. Use COMMERCIAL_SERVICE_ROLE_KEY to operate on the Commercial DB
 *
 * Edge Functions comerciais agora vivem no core-open (zkjrcenhemnnlmjiysbc).
 * Auth continua no identity (macmkfoknhofnwhizsqc) via getIdentityClient().
 */

// ─── URLs dos projetos ────────────────────────────────────────────────────────

// Lovable Cloud — mantido apenas para funções que ainda não foram migradas
const LOVABLE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const LOVABLE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// core-open — destino final de todas as Edge Functions comerciais
const CORE_OPEN_URL = import.meta.env.VITE_CORE_OPEN_URL;
const CORE_OPEN_ANON_KEY = import.meta.env.VITE_CORE_OPEN_ANON_KEY;

// Funções já migradas para o core-open
const MIGRATED_TO_CORE_OPEN = new Set([
  "sales-contacts",
  "sales-accounts",
  // adicione aqui as próximas à medida que forem migradas:
  "sales-opportunities",
  "sales-commercial-proxy",
  "sales-activities",
  "sales-forecast-summary",
  "sales-ranking-summary",
  "sales-revenue-summary",
  "sales-goal-performance",
  "sales-pipeline-board",
  "sales-alerts",
  "sales-goals",
  "sales-commissions",
  "sales-leads", // ← adicionar
  "sales-playbooks", // ← adicionar
  "sales-templates", // ← adicionar
  "sales-risk-flags", // ← adicionar
  "sales-opportunity-scores", // ← adicionar
  "sales-recommendations", // ← adicionar
  "sales-territories", // ← adicionar
  "sales-territory-assignments", // ← adicionar
  "sales-teams", // ← adicionar
  "sales-team-summary", // ← adicionar
  "sales-account-ownership", // ← adicionar
]);

// ─── Auth headers ─────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const identityClient = await getIdentityClient();
  const {
    data: { session },
  } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function resolveEndpoint(functionName: string): { baseUrl: string; anonKey: string } {
  if (MIGRATED_TO_CORE_OPEN.has(functionName)) {
    return {
      baseUrl: `${CORE_OPEN_URL}/functions/v1/${functionName}`,
      anonKey: CORE_OPEN_ANON_KEY,
    };
  }
  return {
    baseUrl: `https://${LOVABLE_PROJECT_ID}.supabase.co/functions/v1/${functionName}`,
    anonKey: LOVABLE_ANON_KEY,
  };
}

async function salesGet(functionName: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  const { baseUrl, anonKey } = resolveEndpoint(functionName);

  const url = new URL(baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...headers,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} GET failed`);
  return data;
}

async function salesPost(functionName: string, body: any) {
  const headers = await getAuthHeaders();
  const { baseUrl, anonKey } = resolveEndpoint(functionName);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      ...headers,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} POST failed`);
  return data;
}

// ===== Pipeline Stages (via commercial proxy POST) =====
export async function fetchPipelineStages() {
  return salesPost("sales-commercial-proxy", {
    table: "sales_pipeline_stages",
    operation: "select",
    select: "*",
    order: { column: "stage_order", ascending: true },
  }).then((res) => res.data || res);
}

// ===== Accounts =====
export async function fetchAccounts(filters?: Record<string, any>) {
  return salesGet("sales-accounts", filters as any);
}

export async function fetchAccountById(id: string) {
  const accounts = await salesGet("sales-accounts", { id } as any);
  return Array.isArray(accounts) ? accounts.find((a: any) => a.id === id) || null : accounts;
}

export async function upsertAccount(data: any) {
  return salesPost("sales-accounts", data);
}

// ===== Contacts =====
export async function fetchContacts(filters?: Record<string, any>) {
  return salesGet("sales-contacts", filters as any);
}

export async function upsertContact(data: any) {
  return salesPost("sales-contacts", data);
}

// ===== Opportunities =====
export async function fetchOpportunities(filters?: Record<string, any>) {
  return salesGet("sales-opportunities", filters as any);
}

export async function fetchOpportunityById(id: string) {
  return salesGet("sales-opportunities", { id });
}

export async function upsertOpportunity(data: any) {
  return salesPost("sales-opportunities", data);
}

// ===== Activities =====
export async function fetchActivities(filters?: Record<string, any>) {
  return salesGet("sales-activities", filters as any);
}

export async function upsertActivity(data: any) {
  return salesPost("sales-activities", data);
}

// ===== Config tables (via commercial proxy POST) =====
async function fetchConfigTable(table: string, orderColumn: string) {
  return salesPost("sales-commercial-proxy", {
    table,
    operation: "select",
    select: "*",
    order: { column: orderColumn, ascending: true },
  }).then((res) => res.data || res);
}

export async function fetchLeadSources() {
  return fetchConfigTable("sales_lead_sources", "sort_order");
}

export async function fetchSegments() {
  return fetchConfigTable("sales_segments", "sort_order");
}

export async function fetchLossReasons() {
  return fetchConfigTable("sales_loss_reasons", "sort_order");
}

// ===== Phase 3: Pipeline Engine =====
export async function moveOpportunityStage(data: {
  opportunity_id: string;
  to_stage_id: string;
  notes?: string;
  status?: string;
  loss_reason_id?: string;
  amount?: number;
  monthly_value?: number;
}) {
  return salesPost("sales-opportunity-move-stage", data);
}

export async function fetchStageHistory(opportunityId: string) {
  return salesGet("sales-opportunity-history", { opportunity_id: opportunityId });
}

export async function fetchDashboardSummary() {
  return salesGet("sales-dashboard-summary");
}

export async function fetchPipelineBoard(status?: string) {
  return salesGet("sales-pipeline-board", status ? { status } : undefined);
}

// ===== Phase 4: Forecast & Proposal =====
export async function upsertForecast(data: {
  opportunity_id: string;
  probability_percent?: number;
  expected_close_month?: string;
}) {
  return salesPost("sales-opportunity-forecast-upsert", data);
}

export async function linkProposal(data: {
  opportunity_id: string;
  proposal_id?: string;
  proposal_external_id?: string;
  proposal_number?: string;
}) {
  return salesPost("sales-opportunity-link-proposal", data);
}

export async function fetchForecastSummary() {
  return salesGet("sales-forecast-summary");
}

// ===== Phase 5: Revenue Engine =====
export async function markOpportunityWon(data: {
  opportunity_id: string;
  amount?: number;
  monthly_value?: number;
  mrr?: number;
  tcv?: number;
  contract_type?: string;
  billing_cycle?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  notes?: string;
}) {
  return salesPost("sales-opportunity-mark-won", data);
}

export async function markOpportunityLost(data: { opportunity_id: string; loss_reason_id: string; notes?: string }) {
  return salesPost("sales-opportunity-mark-lost", data);
}

export async function fetchRevenueSummary() {
  return salesGet("sales-revenue-summary");
}

export async function fetchRevenueEvents(filters?: Record<string, string>) {
  return salesGet("sales-revenue-events-list", filters);
}

// ===== Phase 6: Goals, Commissions & Ranking =====
export async function fetchGoals(filters?: Record<string, string>) {
  return salesGet("sales-goals", filters);
}

export async function upsertGoal(data: {
  owner_user_id: string;
  period_month: string;
  metric: string;
  target_value: number;
  achieved_value?: number;
}) {
  return salesPost("sales-goals", data);
}

export async function fetchCommissions(filters?: Record<string, string>) {
  return salesGet("sales-commissions", filters);
}

export async function syncCommissionsFromCore(periodMonth?: string) {
  return salesPost("sales-sync-commissions-from-core", { period_month: periodMonth });
}

export async function fetchRankingSummary(periodMonth?: string) {
  return salesGet("sales-ranking-summary", periodMonth ? { period_month: periodMonth } : undefined);
}

export async function fetchGoalPerformance(periodMonth?: string) {
  return salesGet("sales-goal-performance", periodMonth ? { period_month: periodMonth } : undefined);
}

// ===== Phase 7: Commercial Structure =====
export async function fetchTeams() {
  return salesGet("sales-teams");
}

export async function upsertTeam(data: {
  id?: string;
  name: string;
  description?: string;
  manager_user_id: string;
  active?: boolean;
}) {
  return salesPost("sales-teams", data);
}

export async function fetchTeamMembers(teamId?: string) {
  return salesGet("sales-team-members", teamId ? { team_id: teamId } : undefined);
}

export async function manageTeamMember(data: {
  team_id: string;
  user_id: string;
  role?: string;
  active?: boolean;
  action?: string;
}) {
  return salesPost("sales-team-members", data);
}

export async function fetchTerritories() {
  return salesGet("sales-territories");
}

export async function upsertTerritory(data: {
  id?: string;
  name: string;
  type: string;
  description?: string;
  active?: boolean;
}) {
  return salesPost("sales-territories", data);
}

export async function fetchTerritoryAssignments(territoryId?: string) {
  return salesGet("sales-territory-assignments", territoryId ? { territory_id: territoryId } : undefined);
}

export async function assignTerritory(data: {
  territory_id: string;
  owner_user_id: string;
  team_id?: string;
  priority?: number;
}) {
  return salesPost("sales-territory-assignments", data);
}

export async function fetchAccountOwnerships(filters?: Record<string, string>) {
  return salesGet("sales-account-ownership", filters);
}

export async function assignAccountOwner(data: { account_id: string; owner_user_id: string; team_id?: string }) {
  return salesPost("sales-account-ownership", data);
}

export async function transferAccount(data: {
  account_id: string;
  new_owner_user_id: string;
  team_id?: string;
  reason?: string;
}) {
  return salesPost("sales-account-ownership", { ...data, action: "transfer" });
}

export async function fetchTeamSummary(teamId?: string) {
  return salesGet("sales-team-summary", teamId ? { team_id: teamId } : undefined);
}

// ===== Leads =====
export async function fetchLeads(filters?: Record<string, any>) {
  return salesGet("sales-leads", filters as any);
}

export async function upsertLead(data: any) {
  return salesPost("sales-leads", data);
}

// ===== Stubs for future features =====
export async function fetchProposals() {
  return [];
}
export async function fetchNotes(_entityType: string, _entityId: string) {
  return [];
}
export async function fetchTags() {
  return [];
}
export async function fetchOpportunityProducts(_opportunityId: string) {
  return [];
}
