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
      const teamId = url.searchParams.get("team_id");

      let query = db.from("sales_team_members").select("*");
      if (teamId) query = query.eq("team_id", teamId);

      // Manager sees own team members, admin sees all
      if (!auth.isAdmin) {
        // Check if user is manager of the team
        if (teamId) {
          const { data: team } = await db.from("sales_teams").select("manager_user_id").eq("id", teamId).single();
          if (!team || (team.manager_user_id !== auth.userId && !auth.isManager)) {
            // Only show own membership
            query = query.eq("user_id", auth.userId);
          }
        } else if (!auth.isManager) {
          query = query.eq("user_id", auth.userId);
        }
      }

      const { data, error } = await query;
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, team_id, user_id, role, active } = body;

      if (!team_id || !user_id) {
        return errorResponse(400, "team_id and user_id are required");
      }

      // Verify caller can manage this team
      if (!auth.isAdmin) {
        const { data: team } = await db.from("sales_teams").select("manager_user_id").eq("id", team_id).single();
        if (!team || (team.manager_user_id !== auth.userId && !auth.isManager)) {
          return errorResponse(403, "Not authorized to manage this team");
        }
      }

      if (action === "remove") {
        const { error } = await db.from("sales_team_members")
          .update({ active: false }).eq("team_id", team_id).eq("user_id", user_id);
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ success: true });
      }

      // Add/update member
      const record: any = { team_id, user_id, role: role || "sales_rep", active: active !== false };
      const { data, error } = await db.from("sales_team_members")
        .upsert(record, { onConflict: "team_id,user_id" }).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-team-members error:", err);
    return errorResponse(500, "Internal error");
  }
});
