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
      let query = db.from("sales_leads").select("*");
      query = await applyOwnershipFilter(query, auth);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const record = {
        company_name: body.company_name || null,
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        status: body.status || "new",
        temperature: body.temperature || null,
        source: body.source || null,
        notes: body.notes || null,
        owner_user_id: body.owner_user_id || auth.userId,
        created_by_user_id: auth.userId,
      };

      if (body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_leads").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        const { created_by_user_id, ...updateRecord } = record;
        const { data, error } = await db.from("sales_leads").update(updateRecord).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_leads").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-leads error:", err);
    return errorResponse(500, "Internal error");
  }
});
