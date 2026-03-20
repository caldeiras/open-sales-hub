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

    // Fetch opportunities with ownership filter
    let oppQuery = db.from("sales_opportunities").select(
      "id, status, amount, monthly_value, probability_percent, weighted_amount, pipeline_stage_id, owner_user_id, expected_close_month, close_date"
    );
    oppQuery = applyOwnershipFilter(oppQuery, auth);
    const { data: opportunities = [], error: oppErr } = await oppQuery;
    if (oppErr) return errorResponse(400, oppErr.message);

    // Fetch stages
    const { data: stages = [] } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_name, stage_order, color")
      .eq("is_active", true)
      .order("stage_order");

    const open = opportunities.filter((o: any) => o.status === "open");
    const won = opportunities.filter((o: any) => o.status === "won");
    const lost = opportunities.filter((o: any) => o.status === "lost");

    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const wonThisMonth = won.filter((o: any) => {
      // Use close_date or expected_close_month
      const d = o.close_date || o.expected_close_month;
      return d && d.startsWith(thisMonthStr);
    });

    const lostThisMonth = lost.filter((o: any) => {
      const d = o.close_date || o.expected_close_month;
      return d && d.startsWith(thisMonthStr);
    });

    // Totals
    const totalOpenAmount = open.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
    const totalOpenMRR = open.reduce((s: number, o: any) => s + (Number(o.monthly_value) || 0), 0);
    const totalWeighted = open.reduce((s: number, o: any) => s + (Number(o.weighted_amount) || 0), 0);
    const totalWonAmount = won.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
    const totalLostAmount = lost.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
    const wonThisMonthAmount = wonThisMonth.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
    const lostThisMonthAmount = lostThisMonth.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);

    // By stage
    const byStage = stages.map((s: any) => {
      const stageOpps = open.filter((o: any) => o.pipeline_stage_id === s.id);
      return {
        stage_id: s.id,
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        color: s.color,
        count: stageOpps.length,
        amount: stageOpps.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0),
        weighted: stageOpps.reduce((sum: number, o: any) => sum + (Number(o.weighted_amount) || 0), 0),
      };
    });

    // By expected_close_month
    const monthMap: Record<string, { month: string; count: number; amount: number; weighted: number }> = {};
    for (const o of open) {
      const m = o.expected_close_month || "sem_previsao";
      if (!monthMap[m]) monthMap[m] = { month: m, count: 0, amount: 0, weighted: 0 };
      monthMap[m].count++;
      monthMap[m].amount += Number(o.amount) || 0;
      monthMap[m].weighted += Number(o.weighted_amount) || 0;
    }
    const byMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // By owner (only for managers)
    let byOwner: any[] = [];
    if (auth.isAdmin || auth.isManager) {
      const ownerMap: Record<string, { owner_user_id: string; count: number; amount: number; weighted: number }> = {};
      for (const o of open) {
        const oid = o.owner_user_id;
        if (!ownerMap[oid]) ownerMap[oid] = { owner_user_id: oid, count: 0, amount: 0, weighted: 0 };
        ownerMap[oid].count++;
        ownerMap[oid].amount += Number(o.amount) || 0;
        ownerMap[oid].weighted += Number(o.weighted_amount) || 0;
      }
      byOwner = Object.values(ownerMap);
    }

    return jsonResponse({
      open_count: open.length,
      won_count: won.length,
      lost_count: lost.length,
      total_open_amount: totalOpenAmount,
      total_open_mrr: totalOpenMRR,
      total_weighted: totalWeighted,
      total_won_amount: totalWonAmount,
      total_lost_amount: totalLostAmount,
      won_this_month: wonThisMonth.length,
      won_this_month_amount: wonThisMonthAmount,
      lost_this_month: lostThisMonth.length,
      lost_this_month_amount: lostThisMonthAmount,
      by_stage: byStage,
      by_month: byMonth,
      by_owner: byOwner,
      is_manager_view: auth.isAdmin || auth.isManager,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-forecast-summary error:", err);
    return errorResponse(500, "Internal error");
  }
});
