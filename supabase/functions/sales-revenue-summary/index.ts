import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  applyOwnershipFilter, errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();

    if (req.method !== "GET") return errorResponse(405, "Method not allowed");

    // Fetch all revenue events
    let eventsQuery = db.from("sales_revenue_events").select("*");

    // Ownership filter via opportunities
    if (!auth.isAdmin && !auth.isManager) {
      const { data: userOpps = [] } = await db
        .from("sales_opportunities")
        .select("id")
        .eq("owner_user_id", auth.userId);
      const oppIds = userOpps.map((o: any) => o.id);
      if (oppIds.length === 0) {
        return jsonResponse({
          total_mrr: 0, total_arr: 0, total_tcv: 0,
          new_mrr_this_month: 0, expansion_mrr_this_month: 0,
          churn_mrr_this_month: 0, net_new_mrr_this_month: 0,
          by_month: [], by_owner: [], by_type: [],
          is_manager_view: false,
        });
      }
      eventsQuery = eventsQuery.in("opportunity_id", oppIds);
    }

    const { data: events = [], error: evErr } = await eventsQuery;
    if (evErr) return errorResponse(400, evErr.message);

    // Fetch won opportunities for current MRR/ARR
    let wonQuery = db.from("sales_opportunities")
      .select("id, mrr, arr, tcv, owner_user_id, account_id, is_expansion, is_renewal")
      .eq("status", "won");
    wonQuery = await applyOwnershipFilter(wonQuery, auth);
    const { data: wonOpps = [] } = await wonQuery;

    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Current totals from won opportunities
    const totalMRR = wonOpps.reduce((s: number, o: any) => s + (Number(o.mrr) || 0), 0);
    const totalARR = wonOpps.reduce((s: number, o: any) => s + (Number(o.arr) || 0), 0);
    const totalTCV = wonOpps.reduce((s: number, o: any) => s + (Number(o.tcv) || 0), 0);

    // This month events
    const thisMonthEvents = events.filter((e: any) => e.event_date?.startsWith(thisMonthStr));
    const newMRR = thisMonthEvents.filter((e: any) => e.event_type === "new").reduce((s: number, e: any) => s + (Number(e.mrr_delta) || 0), 0);
    const expansionMRR = thisMonthEvents.filter((e: any) => e.event_type === "expansion").reduce((s: number, e: any) => s + (Number(e.mrr_delta) || 0), 0);
    const churnMRR = thisMonthEvents.filter((e: any) => e.event_type === "churn").reduce((s: number, e: any) => s + (Number(e.mrr_delta) || 0), 0);
    const renewalMRR = thisMonthEvents.filter((e: any) => e.event_type === "renewal").reduce((s: number, e: any) => s + (Number(e.mrr_delta) || 0), 0);
    const netNewMRR = newMRR + expansionMRR + churnMRR + renewalMRR;

    // By month
    const monthMap: Record<string, { month: string; new_mrr: number; expansion_mrr: number; churn_mrr: number; renewal_mrr: number; net_mrr: number; tcv: number }> = {};
    for (const e of events) {
      const m = e.event_date?.substring(0, 7) || "unknown";
      if (!monthMap[m]) monthMap[m] = { month: m, new_mrr: 0, expansion_mrr: 0, churn_mrr: 0, renewal_mrr: 0, net_mrr: 0, tcv: 0 };
      const delta = Number(e.mrr_delta) || 0;
      const tcvD = Number(e.tcv_delta) || 0;
      if (e.event_type === "new") monthMap[m].new_mrr += delta;
      else if (e.event_type === "expansion") monthMap[m].expansion_mrr += delta;
      else if (e.event_type === "churn") monthMap[m].churn_mrr += delta;
      else if (e.event_type === "renewal") monthMap[m].renewal_mrr += delta;
      monthMap[m].net_mrr += delta;
      monthMap[m].tcv += tcvD;
    }
    const byMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // By type
    const typeMap: Record<string, { event_type: string; count: number; mrr: number; tcv: number }> = {};
    for (const e of events) {
      if (!typeMap[e.event_type]) typeMap[e.event_type] = { event_type: e.event_type, count: 0, mrr: 0, tcv: 0 };
      typeMap[e.event_type].count++;
      typeMap[e.event_type].mrr += Number(e.mrr_delta) || 0;
      typeMap[e.event_type].tcv += Number(e.tcv_delta) || 0;
    }
    const byType = Object.values(typeMap);

    // By owner (manager view)
    let byOwner: any[] = [];
    if (auth.isAdmin || auth.isManager) {
      const ownerMap: Record<string, { owner_user_id: string; mrr: number; arr: number; tcv: number; count: number }> = {};
      for (const o of wonOpps) {
        const oid = o.owner_user_id;
        if (!ownerMap[oid]) ownerMap[oid] = { owner_user_id: oid, mrr: 0, arr: 0, tcv: 0, count: 0 };
        ownerMap[oid].mrr += Number(o.mrr) || 0;
        ownerMap[oid].arr += Number(o.arr) || 0;
        ownerMap[oid].tcv += Number(o.tcv) || 0;
        ownerMap[oid].count++;
      }
      byOwner = Object.values(ownerMap).sort((a, b) => b.mrr - a.mrr);
    }

    return jsonResponse({
      total_mrr: Math.round(totalMRR * 100) / 100,
      total_arr: Math.round(totalARR * 100) / 100,
      total_tcv: Math.round(totalTCV * 100) / 100,
      new_mrr_this_month: Math.round(newMRR * 100) / 100,
      expansion_mrr_this_month: Math.round(expansionMRR * 100) / 100,
      churn_mrr_this_month: Math.round(churnMRR * 100) / 100,
      renewal_mrr_this_month: Math.round(renewalMRR * 100) / 100,
      net_new_mrr_this_month: Math.round(netNewMRR * 100) / 100,
      won_count: wonOpps.length,
      by_month: byMonth,
      by_type: byType,
      by_owner: byOwner,
      is_manager_view: auth.isAdmin || auth.isManager,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-revenue-summary error:", err);
    return errorResponse(500, "Internal error");
  }
});
