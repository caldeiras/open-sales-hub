import { getIdentityClient } from "@/lib/identityClient";

// Aponta para core-open (zkjrcenhemnnlmjiysbc) — não mais para o Lovable Cloud
const CORE_OPEN_URL = import.meta.env.VITE_CORE_OPEN_URL;
const CORE_OPEN_ANON_KEY = import.meta.env.VITE_CORE_OPEN_ANON_KEY;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const identityClient = await getIdentityClient();
  const {
    data: { session },
  } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function salesGet(functionName: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  const url = new URL(`${CORE_OPEN_URL}/functions/v1/${functionName}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...headers, apikey: CORE_OPEN_ANON_KEY, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} GET failed`);
  return data;
}

async function salesPost(functionName: string, body: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${CORE_OPEN_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: { ...headers, apikey: CORE_OPEN_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${functionName} POST failed`);
  return data;
}

// ===== Scores =====
export async function fetchOpportunityScores(userId?: string) {
  return salesGet("sales-opportunity-scores", userId ? { user_id: userId } : undefined);
}

// ===== Recommendations =====
export async function fetchRecommendations() {
  return salesGet("sales-recommendations");
}

export async function dismissRecommendation(id: string) {
  return salesPost("sales-recommendations", { action: "dismiss", id });
}

export async function dismissAllRecommendations() {
  return salesPost("sales-recommendations", { action: "dismiss_all" });
}

// ===== Risk Flags =====
export async function fetchRiskFlags(resolved?: boolean) {
  return salesGet("sales-risk-flags", resolved !== undefined ? { resolved: String(resolved) } : undefined);
}

export async function resolveRiskFlag(id: string) {
  return salesPost("sales-risk-flags", { action: "resolve", id });
}

// ===== Scoring Rules =====
export async function fetchScoringRules() {
  return salesGet("sales-scoring-rules");
}

export async function upsertScoringRule(data: any) {
  return salesPost("sales-scoring-rules", data);
}

// ===== Engines =====
export async function runPriorityEngine() {
  return salesPost("sales-priority-engine", {});
}

export async function runRecommendationEngine() {
  return salesPost("sales-recommendation-engine", {});
}
