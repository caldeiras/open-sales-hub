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
      const { data, error } = await db.from("sales_territories").select("*").order("name");
      if (error) return errorResponse(400, error.message);

      // Filter for non-admin: show territories assigned to user
      if (!auth.isAdmin && !auth.isManager) {
        const { data: assignments = [] } = await db
          .from("sales_territory_assignments").select("territory_id")
          .eq("owner_user_id", auth.userId).eq("active", true);
        const assignedIds = new Set(assignments.map((a: any) => a.territory_id));
        return jsonResponse(data?.filter((t: any) => assignedIds.has(t.id)) || []);
      }
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      if (!auth.isAdmin && !auth.isManager) {
        return errorResponse(403, "Only admin/manager can manage territories");
      }

      const body = await req.json();
      const { id, name, type, description, active } = body;

      if (!name || !type) return errorResponse(400, "name and type are required");

      const record: any = { name, type, description, created_by: auth.userId };
      if (id) record.id = id;
      if (active !== undefined) record.active = active;

      const { data, error } = await db.from("sales_territories")
        .upsert(record, { onConflict: "id" }).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-territories error:", err);
    return errorResponse(500, "Internal error");
  }
});
