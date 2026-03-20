import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * Follow-up Engine — checks for stale opportunities and creates
 * automatic follow-up activities + alerts based on sales_followup_rules.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = getCommercialClient();
    const now = new Date();

    // Get active rules
    const { data: rules } = await db.from("sales_followup_rules")
      .select("*").eq("active", true);

    if (!rules || rules.length === 0) return jsonResponse({ processed: 0, message: "No active rules" });

    let totalCreated = 0;

    for (const rule of rules) {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - rule.days_without_update);

      // Find opportunities not updated since cutoff with open status
      let query = db.from("sales_opportunities")
        .select("id, title, owner_user_id, account_id")
        .lt("updated_at", cutoff.toISOString())
        .in("status", ["open", "active"]);

      if (rule.target_stage_id) {
        query = query.eq("current_stage_id", rule.target_stage_id);
      }

      const { data: staleOpps } = await query.limit(100);
      if (!staleOpps || staleOpps.length === 0) continue;

      for (const opp of staleOpps) {
        // Check if we already created a follow-up for this opp recently (last 24h)
        const recentCutoff = new Date(now);
        recentCutoff.setHours(recentCutoff.getHours() - 24);

        const { data: existing } = await db.from("sales_activities")
          .select("id")
          .eq("opportunity_id", opp.id)
          .eq("auto_generated", true)
          .gte("created_at", recentCutoff.toISOString())
          .limit(1);

        if (existing && existing.length > 0) continue;

        if (rule.action_type === "task" || rule.action_type === "email") {
          await db.from("sales_activities").insert({
            activity_type: rule.action_type === "task" ? "task" : "email",
            subject: `Follow-up obrigatório: ${opp.title}`,
            description: `Oportunidade sem atualização há ${rule.days_without_update} dias. Ação requerida.`,
            status: "pending",
            owner_user_id: opp.owner_user_id,
            created_by_user_id: opp.owner_user_id,
            opportunity_id: opp.id,
            account_id: opp.account_id || null,
            auto_generated: true,
            due_at: now.toISOString(),
          });
          totalCreated++;
        }

        if (rule.action_type === "alert") {
          await db.from("sales_alerts").insert({
            type: "opp_stale",
            title: `Oportunidade parada: ${opp.title}`,
            message: `Sem atualização há ${rule.days_without_update} dias.`,
            user_id: opp.owner_user_id,
            entity_type: "opportunity",
            entity_id: opp.id,
          });
          totalCreated++;
        }
      }
    }

    return jsonResponse({ processed: totalCreated });
  } catch (err: any) {
    console.error("sales-followup-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
