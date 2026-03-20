import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * SLA Engine — checks for SLA violations and generates alerts.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = getCommercialClient();
    const now = new Date();

    const { data: rules } = await db.from("sales_sla_rules")
      .select("*").eq("active", true);

    if (!rules || rules.length === 0) return jsonResponse({ processed: 0 });

    let alertsCreated = 0;

    for (const rule of rules) {
      const cutoffMs = now.getTime() - (rule.max_hours * 60 * 60 * 1000);
      const cutoff = new Date(cutoffMs).toISOString();

      let query = db.from("sales_opportunities")
        .select("id, title, owner_user_id, current_stage_id")
        .in("status", ["open", "active"])
        .lt("updated_at", cutoff);

      if (rule.stage_id) {
        query = query.eq("current_stage_id", rule.stage_id);
      }

      const { data: violating } = await query.limit(100);
      if (!violating || violating.length === 0) continue;

      for (const opp of violating) {
        // Check if alert already exists in last 24h
        const recentCutoff = new Date(now);
        recentCutoff.setHours(recentCutoff.getHours() - 24);
        const { data: existing } = await db.from("sales_alerts")
          .select("id")
          .eq("entity_id", opp.id)
          .eq("type", "sla_violation")
          .gte("created_at", recentCutoff.toISOString())
          .limit(1);

        if (existing && existing.length > 0) continue;

        await db.from("sales_alerts").insert({
          type: "sla_violation",
          title: `SLA violado: ${opp.title}`,
          message: `Oportunidade ultrapassou ${rule.max_hours}h sem avanço. Regra: ${rule.name}`,
          user_id: opp.owner_user_id,
          entity_type: "opportunity",
          entity_id: opp.id,
        });
        alertsCreated++;

        // If escalation is notify_manager, get manager and create alert for them too
        if (rule.escalation_action === "notify_manager") {
          const { data: membership } = await db.from("sales_team_members")
            .select("team_id").eq("user_id", opp.owner_user_id).eq("active", true).limit(1).single();
          if (membership) {
            const { data: team } = await db.from("sales_teams")
              .select("manager_user_id").eq("id", membership.team_id).single();
            if (team && team.manager_user_id !== opp.owner_user_id) {
              await db.from("sales_alerts").insert({
                type: "sla_escalation",
                title: `Escalação SLA: ${opp.title}`,
                message: `Vendedor ultrapassou ${rule.max_hours}h sem avanço. Regra: ${rule.name}`,
                user_id: team.manager_user_id,
                entity_type: "opportunity",
                entity_id: opp.id,
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return jsonResponse({ processed: alertsCreated });
  } catch (err: any) {
    console.error("sales-sla-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
