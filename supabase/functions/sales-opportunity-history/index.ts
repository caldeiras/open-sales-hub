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

    const url = new URL(req.url);
    const opportunityId = url.searchParams.get("opportunity_id");
    if (!opportunityId) return errorResponse(400, "opportunity_id is required");

    // Verify ownership of the opportunity
    let oppQuery = db.from("sales_opportunities").select("id, owner_user_id").eq("id", opportunityId);
    oppQuery = applyOwnershipFilter(oppQuery, auth);
    const { data: opp } = await oppQuery.single();
    if (!opp) return errorResponse(404, "Opportunity not found or not accessible");

    const { data, error } = await db
      .from("sales_opportunity_stage_history")
      .select(`
        *,
        from_stage:sales_pipeline_stages!sales_opportunity_stage_history_from_stage_id_fkey(id, stage_name, color),
        to_stage:sales_pipeline_stages!sales_opportunity_stage_history_to_stage_id_fkey(id, stage_name, color)
      `)
      .eq("opportunity_id", opportunityId)
      .order("changed_at", { ascending: false });

    if (error) return errorResponse(400, error.message);
    return jsonResponse(data);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-history error:", err);
    return errorResponse(500, "Internal error");
  }
});
