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
    const { opportunity_id, proposal_id, proposal_external_id, proposal_number } = body;

    if (!opportunity_id) return errorResponse(400, "opportunity_id is required");
    if (!proposal_id && !proposal_external_id && !proposal_number) {
      return errorResponse(400, "At least one proposal identifier is required");
    }

    // Fetch opportunity
    const { data: opp, error: oppErr } = await db
      .from("sales_opportunities")
      .select("id, owner_user_id")
      .eq("id", opportunity_id)
      .single();

    if (oppErr || !opp) return errorResponse(404, "Opportunity not found");

    // Ownership check
    if (!auth.isAdmin && !auth.isManager && opp.owner_user_id !== auth.userId) {
      return errorResponse(403, "Not your opportunity");
    }

    const update: Record<string, any> = {};
    if (proposal_id !== undefined) update.proposal_id = proposal_id || null;
    if (proposal_external_id !== undefined) update.proposal_external_id = proposal_external_id || null;
    if (proposal_number !== undefined) update.proposal_number = proposal_number || null;

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
    console.error("sales-opportunity-link-proposal error:", err);
    return errorResponse(500, "Internal error");
  }
});
