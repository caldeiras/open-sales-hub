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
    const url = new URL(req.url);

    if (req.method === "GET") {
      let query = db.from("sales_accounts").select("*, segment:sales_segments(id, segment_name), source:sales_lead_sources(id, source_name)");
      query = applyOwnershipFilter(query, auth);

      const status = url.searchParams.get("status");
      const segmentId = url.searchParams.get("segment_id");
      if (status) query = query.eq("status", status);
      if (segmentId) query = query.eq("segment_id", segmentId);

      const { data, error } = await query.order("name");
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const record = {
        name: body.name,
        legal_name: body.legal_name || null,
        document_number: body.document_number || null,
        website: body.website || null,
        segment_id: body.segment_id || null,
        lead_source_id: body.lead_source_id || null,
        owner_user_id: body.owner_user_id || auth.userId,
        status: body.status || "active",
        notes: body.notes || null,
      };

      if (body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_accounts").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        const { data, error } = await db.from("sales_accounts").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_accounts").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-accounts error:", err);
    return errorResponse(500, "Internal error");
  }
});
