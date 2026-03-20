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
      let query = db.from("sales_recommendations")
        .select("*")
        .eq("dismissed", false)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      query = await applyOwnershipFilter(query, auth, "user_id");
      const { data, error } = await query;
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Dismiss recommendation
      if (body.action === "dismiss" && body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: rec } = await db.from("sales_recommendations")
            .select("user_id").eq("id", body.id).single();
          if (rec?.user_id !== auth.userId) return errorResponse(403, "Forbidden");
        }
        const { data, error } = await db.from("sales_recommendations")
          .update({ dismissed: true }).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      // Dismiss all
      if (body.action === "dismiss_all") {
        const { error } = await db.from("sales_recommendations")
          .update({ dismissed: true })
          .eq("user_id", auth.userId)
          .eq("dismissed", false);
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ ok: true });
      }

      return errorResponse(400, "Invalid action");
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-recommendations error:", err);
    return errorResponse(500, "Internal error");
  }
});
