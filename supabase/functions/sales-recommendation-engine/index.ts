import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * Recommendation Engine — generates actionable suggestions for sellers.
 * Deterministic rules based on scores, activity, and pipeline state.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = getCommercialClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Fetch scored opportunities with stage info
    const { data: opps } = await db
      .from("sales_opportunities")
      .select("id, owner_user_id, pipeline_stage_id, amount, mrr, monthly_value, priority_score, updated_at, status, proposal_id")
      .in("status", ["open", "negotiation", "proposal"])
      .order("priority_score", { ascending: false })
      .limit(500);

    if (!opps || opps.length === 0) return jsonResponse({ processed: 0 });

    // 2. Get recent activity per opportunity
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const { data: recentActs } = await db
      .from("sales_activities")
      .select("opportunity_id")
      .gte("created_at", sevenDaysAgo)
      .not("opportunity_id", "is", null);

    const hasRecentActivity = new Set((recentActs || []).map((a: any) => a.opportunity_id));

    // 3. Get stages for advanced detection
    const { data: stages } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_order, stage_name")
      .order("stage_order", { ascending: true });

    const stageOrderMap: Record<string, number> = {};
    const maxOrder = Math.max(...(stages || []).map((s: any) => s.stage_order), 1);
    (stages || []).forEach((s: any) => { stageOrderMap[s.id] = s.stage_order; });

    // 4. Clear old undismissed recommendations (keep last 24h)
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    await db.from("sales_recommendations").delete().eq("dismissed", false).lt("created_at", yesterday);

    // 5. Generate recommendations + risk flags
    const recs: any[] = [];
    const risks: any[] = [];
    let processed = 0;

    for (const opp of opps) {
      const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000);
      const hasActivity = hasRecentActivity.has(opp.id);
      const stageOrder = stageOrderMap[opp.stage_id] || 0;
      const isAdvanced = stageOrder / maxOrder > 0.6;
      const value = opp.mrr || opp.monthly_value || opp.amount || 0;
      const isHighValue = value > 5000;

      // Rule 1: High score + no recent activity → follow-up urgente
      if ((opp.priority_score || 0) > 50 && !hasActivity) {
        recs.push({
          user_id: opp.owner_user_id,
          opportunity_id: opp.id,
          type: "followup_urgente",
          message: `Oportunidade com score ${opp.priority_score} sem atividade há ${daysSinceUpdate} dias. Follow-up urgente recomendado.`,
          priority: 3,
          created_at: nowIso,
        });
      }

      // Rule 2: Advanced stage + high value → ligar agora
      if (isAdvanced && isHighValue) {
        recs.push({
          user_id: opp.owner_user_id,
          opportunity_id: opp.id,
          type: "ligar_agora",
          message: `Oportunidade de alto valor (R$ ${value.toLocaleString()}) em estágio avançado. Ligar agora.`,
          priority: 4,
          created_at: nowIso,
        });
      }

      // Rule 3: Advanced stage + no proposal → enviar proposta
      if (isAdvanced && !opp.proposal_id) {
        recs.push({
          user_id: opp.owner_user_id,
          opportunity_id: opp.id,
          type: "enviar_proposta",
          message: `Oportunidade em estágio avançado sem proposta vinculada. Enviar proposta.`,
          priority: 2,
          created_at: nowIso,
        });
      }

      // Risk: no activity > 14 days
      if (daysSinceUpdate > 14) {
        risks.push({
          opportunity_id: opp.id,
          type: "sem_atividade",
          severity: daysSinceUpdate > 30 ? "high" : "medium",
          message: `Sem atividade há ${daysSinceUpdate} dias.`,
          detected_at: nowIso,
        });
      }

      // Risk: excessive time in stage (> 21 days)
      if (daysSinceUpdate > 21) {
        risks.push({
          opportunity_id: opp.id,
          type: "tempo_excessivo_estagio",
          severity: "high",
          message: `Parada no estágio atual há ${daysSinceUpdate} dias.`,
          detected_at: nowIso,
        });
      }

      processed++;
    }

    // 6. Batch insert recommendations
    if (recs.length > 0) {
      await db.from("sales_recommendations").insert(recs);
    }

    // 7. Upsert risk flags (resolve old ones first)
    const oppIds = [...new Set(risks.map(r => r.opportunity_id))];
    if (oppIds.length > 0) {
      await db.from("sales_risk_flags")
        .update({ resolved: true, resolved_at: nowIso })
        .in("opportunity_id", oppIds)
        .eq("resolved", false);
    }
    if (risks.length > 0) {
      await db.from("sales_risk_flags").insert(risks);
    }

    return jsonResponse({ processed, recommendations: recs.length, risks: risks.length });
  } catch (err: any) {
    console.error("sales-recommendation-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
