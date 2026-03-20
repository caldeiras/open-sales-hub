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
    const { opportunity_id, to_stage_id, notes, loss_reason_id, amount, monthly_value } = body;

    if (!opportunity_id || !to_stage_id) {
      return errorResponse(400, "opportunity_id and to_stage_id are required");
    }

    // Fetch opportunity
    const { data: opp, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, pipeline_stage_id, status, owner_user_id")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) return errorResponse(404, "Opportunity not found");

    // Ownership check
    if (!auth.isAdmin && !auth.isManager && opp.owner_user_id !== auth.userId) {
      return errorResponse(403, "Not your opportunity");
    }

    // Business rules: can't move won/lost unless reopening
    if (opp.status === "won" || opp.status === "lost") {
      return errorResponse(400, `Cannot move a ${opp.status} opportunity. Reopen it first.`);
    }

    // Validate target stage exists
    const { data: targetStage, error: stageErr } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_name")
      .eq("id", to_stage_id)
      .eq("is_active", true)
      .single();

    if (stageErr || !targetStage) return errorResponse(400, "Invalid or inactive target stage");

    // Same stage? No-op
    if (opp.pipeline_stage_id === to_stage_id) {
      return errorResponse(400, "Opportunity is already in this stage");
    }

    // Build update
    const update: Record<string, any> = { pipeline_stage_id: to_stage_id };

    // If body includes status change
    if (body.status === "won") {
      update.status = "won";
      if (amount !== undefined) update.amount = amount;
      if (monthly_value !== undefined) update.monthly_value = monthly_value;
    } else if (body.status === "lost") {
      if (!loss_reason_id) return errorResponse(400, "loss_reason_id is required when marking as lost");
      update.status = "lost";
      update.loss_reason_id = loss_reason_id;
    } else if (body.status === "hold") {
      update.status = "hold";
    }

    // Update opportunity
    const { error: updateErr } = await db
      .from("sales_opportunities")
      .update(update)
      .eq("id", opportunity_id);

    if (updateErr) return errorResponse(400, updateErr.message);

    // Record history
    const { error: histErr } = await db
      .from("sales_opportunity_stage_history")
      .insert({
        opportunity_id,
        from_stage_id: opp.pipeline_stage_id,
        to_stage_id,
        changed_by_user_id: auth.userId,
        notes: notes || null,
      });

    if (histErr) console.error("History insert failed:", histErr);

    return jsonResponse({ success: true, from_stage_id: opp.pipeline_stage_id, to_stage_id });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-move-stage error:", err);
    return errorResponse(500, "Internal error");
  }
});
