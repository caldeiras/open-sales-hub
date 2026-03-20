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
      const { data, error } = await db.from("sales_teams").select("*").order("name");
      if (error) return errorResponse(400, error.message);
      
      // Filter: manager sees own teams, admin sees all
      if (!auth.isAdmin) {
        const filtered = data?.filter((t: any) => t.manager_user_id === auth.userId) || [];
        // Also include teams where user is a member
        const { data: memberships = [] } = await db
          .from("sales_team_members").select("team_id").eq("user_id", auth.userId).eq("active", true);
        const memberTeamIds = new Set(memberships.map((m: any) => m.team_id));
        const all = data?.filter((t: any) => t.manager_user_id === auth.userId || memberTeamIds.has(t.id)) || [];
        return jsonResponse(all);
      }
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      if (!auth.isAdmin && !auth.isManager) {
        return errorResponse(403, "Only admin/manager can manage teams");
      }

      const body = await req.json();
      const { id, name, description, manager_user_id, active } = body;

      if (!name || !manager_user_id) {
        return errorResponse(400, "name and manager_user_id are required");
      }

      const record: any = { name, description, manager_user_id, created_by: auth.userId };
      if (id) record.id = id;
      if (active !== undefined) record.active = active;

      const { data, error } = await db.from("sales_teams")
        .upsert(record, { onConflict: "id" }).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-teams error:", err);
    return errorResponse(500, "Internal error");
  }
});
