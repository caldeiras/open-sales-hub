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
    let oppQuery = db.from("sales_opportunities").select("id, status, amount, monthly_value, pipeline_stage_id, owner_user_id, close_date");
    oppQuery = await applyOwnershipFilter(oppQuery, auth);
    const { data: opportunities = [], error: oppErr } = await oppQuery;
    if (oppErr) return errorResponse(400, oppErr.message);

    // Fetch activities with ownership filter
    let actQuery = db.from("sales_activities").select("id, status, due_at, owner_user_id, opportunity_id");
    actQuery = applyOwnershipFilter(actQuery, auth);
    const { data: activities = [], error: actErr } = await actQuery;
    if (actErr) return errorResponse(400, actErr.message);

    // Fetch stages
    const { data: stages = [] } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_name, stage_order, color")
      .eq("is_active", true)
      .order("stage_order");

    const open = opportunities.filter((o: any) => o.status === "open");
    const won = opportunities.filter((o: any) => o.status === "won");
    const lost = opportunities.filter((o: any) => o.status === "lost");

    const totalOpenAmount = open.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
    const totalOpenMRR = open.reduce((s: number, o: any) => s + (Number(o.monthly_value) || 0), 0);
    const totalWonAmount = won.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);

    const now = new Date().toISOString();
    const todayStart = now.split("T")[0];
    const pendingActivities = activities.filter((a: any) => a.status === "pending");
    const overdueActivities = pendingActivities.filter((a: any) => a.due_at && a.due_at < now);
    const todayActivities = pendingActivities.filter((a: any) => a.due_at?.startsWith(todayStart));

    // Opportunities without pending activities
    const oppsWithActivity = new Set(pendingActivities.map((a: any) => a.opportunity_id).filter(Boolean));
    const noNextAction = open.filter((o: any) => !oppsWithActivity.has(o.id)).length;

    // Pipeline by stage
    const pipelineByStage = stages.map((s: any) => {
      const stageOpps = open.filter((o: any) => o.pipeline_stage_id === s.id);
      return {
        stage_id: s.id,
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        color: s.color,
        count: stageOpps.length,
        amount: stageOpps.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0),
        monthly_value: stageOpps.reduce((sum: number, o: any) => sum + (Number(o.monthly_value) || 0), 0),
      };
    });

    return jsonResponse({
      open_count: open.length,
      won_count: won.length,
      lost_count: lost.length,
      total_open_amount: totalOpenAmount,
      total_open_mrr: totalOpenMRR,
      total_won_amount: totalWonAmount,
      today_activities: todayActivities.length,
      overdue_activities: overdueActivities.length,
      no_next_action: noNextAction,
      pipeline_by_stage: pipelineByStage,
      is_manager_view: auth.isAdmin || auth.isManager,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-dashboard-summary error:", err);
    return errorResponse(500, "Internal error");
  }
});
