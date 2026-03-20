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

    if (req.method !== "GET") return errorResponse(405, "Method not allowed");

    const url = new URL(req.url);
    const opportunityId = url.searchParams.get("opportunity_id");
    const accountId = url.searchParams.get("account_id");
    const eventType = url.searchParams.get("event_type");

    let query = db.from("sales_revenue_events").select("*");

    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (accountId) query = query.eq("account_id", accountId);
    if (eventType) query = query.eq("event_type", eventType);

    // Ownership: filter by opportunities the user owns
    if (!auth.isAdmin && !auth.isManager) {
      // Get user's opportunity IDs
      const { data: userOpps = [] } = await db
        .from("sales_opportunities")
        .select("id")
        .eq("owner_user_id", auth.userId);
      const oppIds = userOpps.map((o: any) => o.id);
      if (oppIds.length === 0) return jsonResponse([]);
      query = query.in("opportunity_id", oppIds);
    }

    const { data, error } = await query.order("event_date", { ascending: false });
    if (error) return errorResponse(400, error.message);
    return jsonResponse(data);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-revenue-events-list error:", err);
    return errorResponse(500, "Internal error");
  }
});
