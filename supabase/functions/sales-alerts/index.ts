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
      let query = db.from("sales_alerts").select("*");

      // Users see only their alerts; admin sees all
      if (!auth.isAdmin) {
        query = query.eq("user_id", auth.userId);
      } else {
        const userId = url.searchParams.get("user_id");
        if (userId) query = query.eq("user_id", userId);
      }

      const unreadOnly = url.searchParams.get("unread");
      if (unreadOnly === "true") query = query.eq("read", false);

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Mark as read
      if (body.action === "mark_read" && body.id) {
        const { data, error } = await db.from("sales_alerts")
          .update({ read: true }).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      // Mark all as read
      if (body.action === "mark_all_read") {
        const { error } = await db.from("sales_alerts")
          .update({ read: true }).eq("user_id", auth.userId).eq("read", false);
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ success: true });
      }

      return errorResponse(400, "Invalid action");
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-alerts error:", err);
    return errorResponse(500, "Internal error");
  }
});
