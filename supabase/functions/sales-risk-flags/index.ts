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
      const resolved = url.searchParams.get("resolved");

      // Join opportunity to filter by ownership
      let query = db.from("sales_risk_flags")
        .select("*, opportunity:sales_opportunities(id, name, owner_user_id)")
        .order("detected_at", { ascending: false })
        .limit(100);

      if (resolved === "false") query = query.eq("resolved", false);
      else if (resolved === "true") query = query.eq("resolved", true);

      const { data, error } = await query;
      if (error) return errorResponse(400, error.message);

      // Filter by ownership
      let filtered = data || [];
      if (!auth.isAdmin && !auth.isManager) {
        filtered = filtered.filter((r: any) => r.opportunity?.owner_user_id === auth.userId);
      } else if (auth.isManager && !auth.isAdmin) {
        // Get team member IDs
        const { data: teams = [] } = await db.from("sales_teams")
          .select("id").eq("manager_user_id", auth.userId).eq("active", true);
        if (teams.length > 0) {
          const teamIds = teams.map((t: any) => t.id);
          const { data: members = [] } = await db.from("sales_team_members")
            .select("user_id").in("team_id", teamIds).eq("active", true);
          const visibleIds = new Set([auth.userId, ...members.map((m: any) => m.user_id)]);
          filtered = filtered.filter((r: any) => visibleIds.has(r.opportunity?.owner_user_id));
        } else {
          filtered = filtered.filter((r: any) => r.opportunity?.owner_user_id === auth.userId);
        }
      }

      return jsonResponse(filtered);
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (body.action === "resolve" && body.id) {
        const { data, error } = await db.from("sales_risk_flags")
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }
      return errorResponse(400, "Invalid action");
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-risk-flags error:", err);
    return errorResponse(500, "Internal error");
  }
});
