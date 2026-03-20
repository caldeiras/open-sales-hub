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

    if (req.method === "GET") {
      const url = new URL(req.url);
      const territoryId = url.searchParams.get("territory_id");

      let query = db.from("sales_territory_assignments").select("*");
      if (territoryId) query = query.eq("territory_id", territoryId);

      if (!auth.isAdmin && !auth.isManager) {
        query = query.eq("owner_user_id", auth.userId);
      }

      const { data, error } = await query.order("priority");
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      if (!auth.isAdmin && !auth.isManager) {
        return errorResponse(403, "Only admin/manager can assign territories");
      }

      const body = await req.json();
      const { territory_id, owner_user_id, team_id, priority, active } = body;

      if (!territory_id || !owner_user_id) {
        return errorResponse(400, "territory_id and owner_user_id are required");
      }

      const record: any = {
        territory_id, owner_user_id,
        team_id: team_id || null,
        priority: priority || 1,
        active: active !== false,
      };

      const { data, error } = await db.from("sales_territory_assignments")
        .insert(record).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-territory-assignments error:", err);
    return errorResponse(500, "Internal error");
  }
});
