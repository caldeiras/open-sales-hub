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

    if (req.method === "GET") {
      const url = new URL(req.url);
      const periodMonth = url.searchParams.get("period_month");
      const source = url.searchParams.get("source");

      let query = db.from("sales_commissions").select("*");
      query = applyOwnershipFilter(query, auth);

      if (periodMonth) query = query.eq("commission_period_month", periodMonth);
      if (source) query = query.eq("source", source);

      const { data, error } = await query.order("commission_period_month", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    return errorResponse(405, "Method not allowed — commissions are synced from CORE");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-commissions error:", err);
    return errorResponse(500, "Internal error");
  }
});
