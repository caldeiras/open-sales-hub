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
      const userId = url.searchParams.get("user_id");

      // Fetch scores with opportunity info for ownership filtering
      let query = db.from("sales_opportunity_scores")
        .select("*, opportunity:sales_opportunities(id, name, owner_user_id, stage_id, amount, mrr, status)")
        .order("score", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) return errorResponse(400, error.message);

      // Filter by ownership
      let filtered = data || [];
      if (!auth.isAdmin) {
        if (auth.isManager) {
          const { data: teams = [] } = await db.from("sales_teams")
            .select("id").eq("manager_user_id", auth.userId).eq("active", true);
          if (teams.length > 0) {
            const teamIds = teams.map((t: any) => t.id);
            const { data: members = [] } = await db.from("sales_team_members")
              .select("user_id").in("team_id", teamIds).eq("active", true);
            const visibleIds = new Set([auth.userId, ...members.map((m: any) => m.user_id)]);
            filtered = filtered.filter((s: any) => visibleIds.has(s.opportunity?.owner_user_id));
          } else {
            filtered = filtered.filter((s: any) => s.opportunity?.owner_user_id === auth.userId);
          }
        } else {
          filtered = filtered.filter((s: any) => s.opportunity?.owner_user_id === auth.userId);
        }
      }

      if (userId) filtered = filtered.filter((s: any) => s.opportunity?.owner_user_id === userId);

      return jsonResponse(filtered);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunity-scores error:", err);
    return errorResponse(500, "Internal error");
  }
});
