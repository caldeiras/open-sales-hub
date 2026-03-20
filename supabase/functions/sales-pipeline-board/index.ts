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
    const statusFilter = url.searchParams.get("status") || "open";

    // Fetch stages
    const { data: stages = [] } = await db
      .from("sales_pipeline_stages")
      .select("id, stage_name, stage_order, color")
      .eq("is_active", true)
      .order("stage_order");

    // Fetch opportunities with ownership filter
    let oppQuery = db.from("sales_opportunities").select(`
      id, title, amount, monthly_value, close_date, status, temperature, owner_user_id, pipeline_stage_id,
      account:sales_accounts(id, name)
    `);
    oppQuery = await applyOwnershipFilter(oppQuery, auth);
    if (statusFilter) oppQuery = oppQuery.eq("status", statusFilter);

    const { data: opportunities = [], error } = await oppQuery.order("created_at", { ascending: false });
    if (error) return errorResponse(400, error.message);

    // Group by stage
    const columns = stages.map((s: any) => ({
      ...s,
      opportunities: opportunities.filter((o: any) => o.pipeline_stage_id === s.id),
      total_amount: opportunities
        .filter((o: any) => o.pipeline_stage_id === s.id)
        .reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0),
      count: opportunities.filter((o: any) => o.pipeline_stage_id === s.id).length,
    }));

    return jsonResponse({
      columns,
      total_opportunities: opportunities.length,
      total_amount: opportunities.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0),
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-pipeline-board error:", err);
    return errorResponse(500, "Internal error");
  }
});
