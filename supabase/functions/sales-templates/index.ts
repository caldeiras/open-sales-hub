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
      let query = db.from("sales_templates").select("*");
      const type = url.searchParams.get("type");
      const active = url.searchParams.get("active");
      if (type) query = query.eq("type", type);
      if (active !== null) query = query.eq("active", active === "true");
      const { data, error } = await query.order("name", { ascending: true });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      if (!auth.isAdmin && !auth.isManager) return errorResponse(403, "Only admin/manager can manage templates");
      const body = await req.json();

      const record: any = {
        type: body.type,
        name: body.name,
        subject: body.subject || null,
        body: body.body,
        variables: body.variables || [],
        active: body.active ?? true,
        updated_at: new Date().toISOString(),
      };

      if (body.id) {
        const { data, error } = await db.from("sales_templates").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        record.created_by_user_id = auth.userId;
        const { data, error } = await db.from("sales_templates").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-templates error:", err);
    return errorResponse(500, "Internal error");
  }
});
