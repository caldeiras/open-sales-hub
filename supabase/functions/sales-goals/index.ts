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
      const metric = url.searchParams.get("metric");
      const ownerId = url.searchParams.get("owner_user_id");

      let query = db.from("sales_goals").select("*");
      query = await applyOwnershipFilter(query, auth);

      if (periodMonth) query = query.eq("period_month", periodMonth);
      if (metric) query = query.eq("metric", metric);
      if (ownerId && (auth.isAdmin || auth.isManager)) query = query.eq("owner_user_id", ownerId);

      const { data, error } = await query.order("period_month", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      // Only admin/manager can create/update goals
      if (!auth.isAdmin && !auth.isManager) {
        return errorResponse(403, "Only managers can manage goals");
      }

      const body = await req.json();
      const { id, owner_user_id, period_month, metric, target_value, achieved_value } = body;

      if (!owner_user_id || !period_month || !metric) {
        return errorResponse(400, "owner_user_id, period_month and metric are required");
      }

      const record: any = {
        owner_user_id,
        period_month,
        metric,
        target_value: target_value ?? 0,
        achieved_value: achieved_value ?? 0,
        created_by: auth.userId,
      };

      if (id) record.id = id;

      const { data, error } = await db
        .from("sales_goals")
        .upsert(record, { onConflict: "owner_user_id,period_month,metric" })
        .select()
        .single();

      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-goals error:", err);
    return errorResponse(500, "Internal error");
  }
});
