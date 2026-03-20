import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * Priority Engine — recalculates opportunity scores and rankings.
 * Deterministic rules: stage weight + value weight + recency + activity.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = getCommercialClient();
    const now = new Date();

    // 1. Fetch all open opportunities with stage info
    const { data: opps, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, owner_user_id, pipeline_stage_id, amount, monthly_value, mrr, updated_at, created_at")
      .in("status", ["open", "negotiation", "proposal"])
      .limit(1000);

    if (oppErr) return errorResponse(500, oppErr.message);
    if (!opps || opps.length === 0) return jsonResponse({ processed: 0 });

    // 2. Fetch stages for weight mapping
    const { data: stages } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_order")
      .eq("is_active", true)
      .order("stage_order", { ascending: true });

    const stageMap: Record<string, number> = {};
    const maxStageOrder = Math.max(...(stages || []).map((s: any) => s.stage_order), 1);
    (stages || []).forEach((s: any) => {
      stageMap[s.id] = Math.round((s.stage_order / maxStageOrder) * 30); // max 30 pts
    });

    // 3. Fetch recent activity counts per opportunity (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const { data: activities } = await db
      .from("sales_activities")
      .select("opportunity_id")
      .gte("created_at", thirtyDaysAgo)
      .not("opportunity_id", "is", null);

    const activityCount: Record<string, number> = {};
    (activities || []).forEach((a: any) => {
      if (a.opportunity_id) activityCount[a.opportunity_id] = (activityCount[a.opportunity_id] || 0) + 1;
    });

    // 4. Score each opportunity
    let processed = 0;
    const scores: any[] = [];

    for (const opp of opps) {
      const stageWeight = stageMap[opp.stage_id] || 0;
      const value = opp.mrr || opp.monthly_value || opp.amount || 0;
      const valueWeight = Math.min(Math.round(Math.log10(Math.max(value, 1)) * 8), 30); // max 30 pts
      const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000);
      const recencyWeight = Math.max(20 - daysSinceUpdate, 0); // max 20 pts, decays
      const actWeight = Math.min((activityCount[opp.id] || 0) * 4, 20); // max 20 pts
      const totalScore = stageWeight + valueWeight + recencyWeight + actWeight;

      scores.push({
        opportunity_id: opp.id,
        owner_user_id: opp.owner_user_id,
        score: totalScore,
        stage_weight: stageWeight,
        value_weight: valueWeight,
        recency_weight: recencyWeight,
        activity_weight: actWeight,
      });
    }

    // Sort by score DESC
    scores.sort((a, b) => b.score - a.score);

    // 5. Upsert scores and update priority on opportunities
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      const rank = i + 1;

      // Upsert score record
      const { error: upsertErr } = await db
        .from("sales_opportunity_scores")
        .upsert({
          opportunity_id: s.opportunity_id,
          score: s.score,
          stage_weight: s.stage_weight,
          value_weight: s.value_weight,
          recency_weight: s.recency_weight,
          activity_weight: s.activity_weight,
          last_calculated_at: now.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: "opportunity_id" });

      if (upsertErr) continue;

      // Update priority on opportunity
      await db.from("sales_opportunities").update({
        priority_score: s.score,
        priority_rank: rank,
      }).eq("id", s.opportunity_id);

      processed++;
    }

    return jsonResponse({ processed, total: scores.length });
  } catch (err: any) {
    console.error("sales-priority-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
