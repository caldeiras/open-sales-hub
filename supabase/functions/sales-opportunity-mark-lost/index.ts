import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();

    if (req.method !== "POST") return errorResponse(405, "Method not allowed");

    const body = await req.json();
    const { opportunity_id, loss_reason_id, notes } = body;

    if (!opportunity_id) return errorResponse(400, "opportunity_id is required");
    if (!loss_reason_id) return errorResponse(400, "loss_reason_id is required");

    // Fetch opportunity
    const { data: opp, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, status, account_id, owner_user_id, mrr, is_churn")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) return errorResponse(404, "Opportunity not found");

    if (!auth.isAdmin && !auth.isManager && opp.owner_user_id !== auth.userId) {
      return errorResponse(403, "Not your opportunity");
    }

    if (opp.status === "lost") return errorResponse(400, "Opportunity is already lost");

    const update: Record<string, any> = {
      status: "lost",
      probability_percent: 0,
      weighted_amount: 0,
      loss_reason_id,
    };

    const { data: updatedOpp, error: updateErr } = await db
      .from("sales_opportunities")
      .update(update)
      .eq("id", opportunity_id)
      .select()
      .single();

    if (updateErr) return errorResponse(400, updateErr.message);

    // If marked as churn, create churn revenue event
    if (opp.is_churn && opp.mrr) {
      const { error: eventErr } = await db
        .from("sales_revenue_events")
        .upsert({
          opportunity_id,
          account_id: opp.account_id,
          event_type: "churn",
          mrr_delta: -Math.abs(Number(opp.mrr)),
          arr_delta: -Math.abs(Number(opp.mrr) * 12),
          tcv_delta: 0,
          event_date: new Date().toISOString().split("T")[0],
          notes: notes || null,
          created_by_user_id: auth.userId,
        }, { onConflict: "opportunity_id,event_type,event_date" });

      if (eventErr) console.error("Churn event insert failed:", eventErr);
    }

    return jsonResponse({ opportunity: updatedOpp, churn_recorded: !!(opp.is_churn && opp.mrr) });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-mark-lost error:", err);
    return errorResponse(500, "Internal error");
  }
});
