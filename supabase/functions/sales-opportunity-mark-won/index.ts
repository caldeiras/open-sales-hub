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
    const {
      opportunity_id, amount, monthly_value, mrr, tcv,
      contract_type, billing_cycle,
      contract_start_date, contract_end_date,
      notes,
    } = body;

    if (!opportunity_id) return errorResponse(400, "opportunity_id is required");

    // Fetch opportunity
    const { data: opp, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, status, account_id, owner_user_id, amount, monthly_value, mrr, tcv, is_expansion, is_renewal")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) return errorResponse(404, "Opportunity not found");

    // Ownership check
    if (!auth.isAdmin && !auth.isManager && opp.owner_user_id !== auth.userId) {
      return errorResponse(403, "Not your opportunity");
    }

    if (opp.status === "won") return errorResponse(400, "Opportunity is already won");
    if (opp.status === "lost") return errorResponse(400, "Cannot mark a lost opportunity as won. Reopen first.");

    // Build final values
    const finalAmount = amount !== undefined ? Number(amount) : (Number(opp.amount) || null);
    const finalMRR = mrr !== undefined ? Number(mrr) : (Number(opp.mrr) || null);
    const finalTCV = tcv !== undefined ? Number(tcv) : (Number(opp.tcv) || finalAmount);
    const finalContractType = contract_type || "one_time";

    // Validate: recurring needs mrr
    if (finalContractType === "recurring" && (!finalMRR || finalMRR <= 0)) {
      return errorResponse(400, "Recurring contracts require mrr > 0");
    }

    const finalARR = finalMRR ? Math.round(finalMRR * 12 * 100) / 100 : null;
    const finalWeighted = finalAmount ? Math.round(finalAmount * 100) / 100 : null;

    // Update opportunity
    const update: Record<string, any> = {
      status: "won",
      probability_percent: 100,
      weighted_amount: finalWeighted,
    };
    if (amount !== undefined) update.amount = finalAmount;
    if (monthly_value !== undefined) update.monthly_value = Number(monthly_value);
    if (mrr !== undefined) update.mrr = finalMRR;
    update.arr = finalARR;
    if (tcv !== undefined) update.tcv = finalTCV;
    if (contract_type) update.contract_type = contract_type;
    if (billing_cycle) update.billing_cycle = billing_cycle;
    if (contract_start_date) update.contract_start_date = contract_start_date;
    if (contract_end_date) update.contract_end_date = contract_end_date;

    const { data: updatedOpp, error: updateErr } = await db
      .from("sales_opportunities")
      .update(update)
      .eq("id", opportunity_id)
      .select()
      .single();

    if (updateErr) return errorResponse(400, updateErr.message);

    // Determine event type
    let eventType = "new";
    if (opp.is_expansion) eventType = "expansion";
    else if (opp.is_renewal) eventType = "renewal";

    const eventDate = contract_start_date || new Date().toISOString().split("T")[0];

    // Create revenue event (upsert by unique constraint)
    const { error: eventErr } = await db
      .from("sales_revenue_events")
      .upsert({
        opportunity_id,
        account_id: opp.account_id,
        event_type: eventType,
        mrr_delta: finalMRR || 0,
        arr_delta: finalARR || 0,
        tcv_delta: finalTCV || finalAmount || 0,
        event_date: eventDate,
        notes: notes || null,
        created_by_user_id: auth.userId,
      }, { onConflict: "opportunity_id,event_type,event_date" });

    if (eventErr) console.error("Revenue event insert failed:", eventErr);

    return jsonResponse({ opportunity: updatedOpp, revenue_event_type: eventType });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-mark-won error:", err);
    return errorResponse(500, "Internal error");
  }
});
