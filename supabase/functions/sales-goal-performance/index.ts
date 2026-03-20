import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  applyOwnershipFilter, errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Returns goal performance for a given period.
 * Auto-calculates achieved values from revenue_events + won opportunities.
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
    const monthStr = currentMonth.substring(0, 7); // YYYY-MM

    // Fetch goals
    let goalsQuery = db.from("sales_goals").select("*").eq("period_month", currentMonth);
    goalsQuery = applyOwnershipFilter(goalsQuery, auth);
    const { data: goals = [] } = await goalsQuery;

    // Fetch revenue events for the month to calculate actuals
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().substring(0, 10);

    let eventsQuery = db.from("sales_revenue_events")
      .select("*, opportunity:sales_opportunities!inner(owner_user_id)")
      .gte("event_date", currentMonth)
      .lt("event_date", endDate);

    const { data: events = [] } = await eventsQuery;

    // Fetch won opportunities this month
    let wonQuery = db.from("sales_opportunities")
      .select("id, owner_user_id, mrr, tcv, status")
      .eq("status", "won");
    wonQuery = applyOwnershipFilter(wonQuery, auth);
    const { data: wonOpps = [] } = await wonQuery;

    // Calculate actuals per owner
    const actuals: Record<string, { mrr: number; tcv: number; won_count: number }> = {};

    for (const e of events) {
      const oid = (e as any).opportunity?.owner_user_id;
      if (!oid) continue;
      if (!auth.isAdmin && !auth.isManager && oid !== auth.userId) continue;
      if (!actuals[oid]) actuals[oid] = { mrr: 0, tcv: 0, won_count: 0 };
      if (e.event_type === "new" || e.event_type === "expansion") {
        actuals[oid].mrr += Number(e.mrr_delta) || 0;
      }
      actuals[oid].tcv += Number(e.tcv_delta) || 0;
    }

    // Count wins per owner (this month)
    for (const o of wonOpps) {
      if (!actuals[o.owner_user_id]) actuals[o.owner_user_id] = { mrr: 0, tcv: 0, won_count: 0 };
      actuals[o.owner_user_id].won_count++;
    }

    // Combine goals with actuals
    const performance = goals.map((g: any) => {
      const ownerActuals = actuals[g.owner_user_id] || { mrr: 0, tcv: 0, won_count: 0 };
      let achievedFromData = g.achieved_value;

      // Auto-fill from revenue data if metric matches
      if (g.metric === "mrr") achievedFromData = ownerActuals.mrr;
      else if (g.metric === "tcv") achievedFromData = ownerActuals.tcv;
      else if (g.metric === "won_count") achievedFromData = ownerActuals.won_count;

      const pct = g.target_value > 0 ? Math.round((achievedFromData / g.target_value) * 100) : 0;
      const gap = g.target_value - achievedFromData;

      return {
        ...g,
        achieved_from_data: Math.round(achievedFromData * 100) / 100,
        percent_achieved: pct,
        gap: Math.round(gap * 100) / 100,
      };
    });

    return jsonResponse({
      period_month: currentMonth,
      performance,
      actuals_by_owner: auth.isAdmin || auth.isManager ? actuals : undefined,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-goal-performance error:", err);
    return errorResponse(500, "Internal error");
  }
});
