import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  applyOwnershipFilter, validateTerritoryAccess, checkDuplicateAccount,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();
    const url = new URL(req.url);

    if (req.method === "GET") {
      let query = db.from("sales_accounts").select("*, segment:sales_segments(id, segment_name), source:sales_lead_sources(id, source_name)");
      query = await applyOwnershipFilter(query, auth);

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

      // Owner is always set — default to authenticated user
      const ownerUserId = body.owner_user_id || auth.userId;

      const record = {
        name: body.name,
        legal_name: body.legal_name || null,
        document_number: body.document_number || null,
        website: body.website || null,
        segment_id: body.segment_id || null,
        lead_source_id: body.lead_source_id || null,
        owner_user_id: ownerUserId,
        status: body.status || "active",
        notes: body.notes || null,
      };

      if (!record.name) return errorResponse(400, "name is required");

      if (body.id) {
        // UPDATE
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_accounts").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }

        // Check duplicate (excluding self)
        const dup = await checkDuplicateAccount(db, record.document_number, record.website, body.id);
        if (dup.isDuplicate) {
          return errorResponse(409, `DUPLICATE_ACCOUNT: ${dup.field} already exists (account ${dup.existingId})`);
        }

        const { data, error } = await db.from("sales_accounts").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        // CREATE — territory enforcement
        const territory = await validateTerritoryAccess(auth, { segment_id: body.segment_id });
        if (!territory.allowed) {
          return errorResponse(403, territory.reason || "FORBIDDEN_TERRITORY");
        }

        // Check duplicate
        const dup = await checkDuplicateAccount(db, record.document_number, record.website);
        if (dup.isDuplicate) {
          return errorResponse(409, `DUPLICATE_ACCOUNT: ${dup.field} already exists (account ${dup.existingId})`);
        }

        const { data, error } = await db.from("sales_accounts").insert({ ...record, created_by_user_id: auth.userId }).select().single();
        if (error) return errorResponse(400, error.message);

        // Auto-create ownership record
        await db.from("sales_account_ownership").insert({
          account_id: data.id,
          owner_user_id: ownerUserId,
          active: true,
        });

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
