import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    if (!auth.isAdmin && !auth.isManager) return errorResponse(403, "Admin or manager only");

    const db = getCommercialClient();

    if (req.method === "GET") {
      const { data, error } = await db.from("sales_scoring_rules")
        .select("*").order("created_at", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (body.id) {
        const { data, error } = await db.from("sales_scoring_rules")
          .update(body).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }
      const { data, error } = await db.from("sales_scoring_rules")
        .insert(body).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-scoring-rules error:", err);
    return errorResponse(500, "Internal error");
  }
});
