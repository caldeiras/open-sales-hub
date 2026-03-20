import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Returns ranking data based on revenue_events, goals and commissions.
 * Managers see all; comercial sees only self.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();

    if (req.method !== "GET") return errorResponse(405, "Method not allowed");

    const url = new URL(req.url);
    const periodMonth = url.searchParams.get("period_month");

    const now = new Date();
    const currentMonth = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. Revenue events for the period
    let eventsQuery = db.from("sales_revenue_events").select("*");
    if (periodMonth) {
      const startDate = currentMonth;
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = nextMonth.toISOString().substring(0, 10);
      eventsQuery = eventsQuery.gte("event_date", startDate).lt("event_date", endDate);
    }

    const { data: events = [] } = await eventsQuery;

    // 2. Goals for the period
    let goalsQuery = db.from("sales_goals").select("*");
    if (periodMonth) goalsQuery = goalsQuery.eq("period_month", currentMonth);

    const { data: goals = [] } = await goalsQuery;

    // 3. Commissions for the period
    let commissionsQuery = db.from("sales_commissions").select("*");
    if (periodMonth) commissionsQuery = commissionsQuery.eq("commission_period_month", currentMonth);

    const { data: commissions = [] } = await commissionsQuery;

    // Build ranking by owner
    const ownerMap: Record<string, {
      owner_user_id: string;
      new_mrr: number;
      total_mrr_delta: number;
      total_tcv: number;
      event_count: number;
      commission_total: number;
      goals: Array<{ metric: string; target: number; achieved: number; pct: number }>;
    }> = {};

    const ensureOwner = (oid: string) => {
      if (!ownerMap[oid]) {
        ownerMap[oid] = {
          owner_user_id: oid,
          new_mrr: 0, total_mrr_delta: 0, total_tcv: 0, event_count: 0,
          commission_total: 0, goals: [],
        };
      }
    };

    // Map events to owner via opportunities
    // We need to know which owner each event belongs to
    const oppIds = [...new Set(events.map((e: any) => e.opportunity_id).filter(Boolean))];
    let oppOwnerMap: Record<string, string> = {};
    if (oppIds.length > 0) {
      const { data: opps = [] } = await db
        .from("sales_opportunities")
        .select("id, owner_user_id")
        .in("id", oppIds);
      for (const o of opps) {
        oppOwnerMap[o.id] = o.owner_user_id;
      }
    }

    for (const e of events) {
      const oid = oppOwnerMap[e.opportunity_id] || e.created_by_user_id;
      if (!oid) continue;

      // Ownership filter for comercial
      if (!auth.isAdmin && !auth.isManager && oid !== auth.userId) continue;

      ensureOwner(oid);
      ownerMap[oid].event_count++;
      ownerMap[oid].total_mrr_delta += Number(e.mrr_delta) || 0;
      ownerMap[oid].total_tcv += Number(e.tcv_delta) || 0;
      if (e.event_type === "new") ownerMap[oid].new_mrr += Number(e.mrr_delta) || 0;
    }

    // Add goals
    for (const g of goals) {
      if (!auth.isAdmin && !auth.isManager && g.owner_user_id !== auth.userId) continue;
      ensureOwner(g.owner_user_id);
      const pct = g.target_value > 0 ? Math.round((g.achieved_value / g.target_value) * 100) : 0;
      ownerMap[g.owner_user_id].goals.push({
        metric: g.metric,
        target: Number(g.target_value),
        achieved: Number(g.achieved_value),
        pct,
      });
    }

    // Add commissions
    for (const c of commissions) {
      if (!auth.isAdmin && !auth.isManager && c.owner_user_id !== auth.userId) continue;
      ensureOwner(c.owner_user_id);
      ownerMap[c.owner_user_id].commission_total += Number(c.commission_amount) || 0;
    }

    const ranking = Object.values(ownerMap).sort((a, b) => b.new_mrr - a.new_mrr);

    return jsonResponse({
      period_month: currentMonth,
      ranking,
      is_manager_view: auth.isAdmin || auth.isManager,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-ranking-summary error:", err);
    return errorResponse(500, "Internal error");
  }
});
