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

    if (req.method !== "POST") return errorResponse(405, "Method not allowed");

    const body = await req.json();
    const { opportunity_id, probability_percent, expected_close_month } = body;

    if (!opportunity_id) return errorResponse(400, "opportunity_id is required");

    // Fetch opportunity
    const { data: opp, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, status, amount, owner_user_id")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) return errorResponse(404, "Opportunity not found");

    // Ownership check
    if (!auth.isAdmin && !auth.isManager && opp.owner_user_id !== auth.userId) {
      return errorResponse(403, "Not your opportunity");
    }

    // Validate probability
    if (probability_percent !== undefined && probability_percent !== null) {
      if (probability_percent < 0 || probability_percent > 100) {
        return errorResponse(400, "probability_percent must be between 0 and 100");
      }
    }

    // Business rules by status
    let finalProbability = probability_percent;
    if (opp.status === "won") finalProbability = 100;
    if (opp.status === "lost") finalProbability = 0;

    // Calculate weighted_amount
    const amount = Number(opp.amount) || 0;
    const prob = finalProbability !== undefined && finalProbability !== null ? Number(finalProbability) : null;
    const weighted = prob !== null && amount ? Math.round(amount * prob / 100 * 100) / 100 : null;

    // Validate expected_close_month format (should be first day of month)
    let finalCloseMonth = expected_close_month || null;
    if (finalCloseMonth) {
      const d = new Date(finalCloseMonth);
      if (isNaN(d.getTime())) return errorResponse(400, "Invalid expected_close_month date");
      // Normalize to first day of month
      finalCloseMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }

    const update: Record<string, any> = {};
    if (finalProbability !== undefined) update.probability_percent = finalProbability;
    if (finalCloseMonth !== undefined) update.expected_close_month = finalCloseMonth;
    update.weighted_amount = weighted;

    const { data, error } = await db
      .from("sales_opportunities")
      .update(update)
      .eq("id", opportunity_id)
      .select()
      .single();

    if (error) return errorResponse(400, error.message);
    return jsonResponse(data);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-forecast-upsert error:", err);
    return errorResponse(500, "Internal error");
  }
});
