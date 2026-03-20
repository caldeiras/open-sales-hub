import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Team summary: members, accounts, revenue by team.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();

    if (req.method !== "GET") return errorResponse(405, "Method not allowed");

    const url = new URL(req.url);
    const teamId = url.searchParams.get("team_id");

    // Fetch teams
    let teamsQuery = db.from("sales_teams").select("*").eq("active", true);
    if (teamId) teamsQuery = teamsQuery.eq("id", teamId);

    // Manager: only own teams. Admin: all.
    if (!auth.isAdmin && !auth.isManager) {
      return errorResponse(403, "Only managers can view team summaries");
    }
    if (auth.isManager && !auth.isAdmin) {
      teamsQuery = teamsQuery.eq("manager_user_id", auth.userId);
    }

    const { data: teams = [], error: teamsErr } = await teamsQuery;
    if (teamsErr) return errorResponse(400, teamsErr.message);

    const summaries = [];

    for (const team of teams) {
      // Members
      const { data: members = [] } = await db.from("sales_team_members")
        .select("*").eq("team_id", team.id).eq("active", true);

      const memberUserIds = members.map((m: any) => m.user_id);

      // Accounts owned by team members
      let accountCount = 0;
      let wonOpps = 0;
      let totalMRR = 0;
      let totalTCV = 0;

      if (memberUserIds.length > 0) {
        const { data: ownerships = [] } = await db.from("sales_account_ownership")
          .select("id").eq("active", true).in("owner_user_id", memberUserIds);
        accountCount = ownerships.length;

        // Won opportunities by team members
        const { data: opps = [] } = await db.from("sales_opportunities")
          .select("mrr, tcv").eq("status", "won").in("owner_user_id", memberUserIds);
        wonOpps = opps.length;
        totalMRR = opps.reduce((s: number, o: any) => s + (Number(o.mrr) || 0), 0);
        totalTCV = opps.reduce((s: number, o: any) => s + (Number(o.tcv) || 0), 0);
      }

      summaries.push({
        team_id: team.id,
        team_name: team.name,
        manager_user_id: team.manager_user_id,
        member_count: members.length,
        members: members.map((m: any) => ({ user_id: m.user_id, role: m.role })),
        account_count: accountCount,
        won_opportunities: wonOpps,
        total_mrr: Math.round(totalMRR * 100) / 100,
        total_tcv: Math.round(totalTCV * 100) / 100,
      });
    }

    return jsonResponse(summaries);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-team-summary error:", err);
    return errorResponse(500, "Internal error");
  }
});
