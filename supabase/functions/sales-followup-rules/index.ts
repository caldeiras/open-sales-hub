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
      const { data, error } = await db.from("sales_followup_rules").select("*").order("days_without_update", { ascending: true });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      if (!auth.isAdmin && !auth.isManager) return errorResponse(403, "Only admin/manager");
      const body = await req.json();
      const record: any = {
        name: body.name,
        days_without_update: body.days_without_update,
        action_type: body.action_type,
        target_stage_id: body.target_stage_id || null,
        active: body.active ?? true,
      };
      if (body.id) {
        const { data, error } = await db.from("sales_followup_rules").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_followup_rules").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    return errorResponse(500, "Internal error");
  }
});
