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
      let query = db.from("sales_contacts").select("*, account:sales_accounts(id, name)");
      query = await applyOwnershipFilter(query, auth);

      const accountId = url.searchParams.get("account_id");
      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query.order("full_name");
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const record = {
        account_id: body.account_id,
        full_name: body.full_name,
        email: body.email || null,
        phone: body.phone || null,
        job_title: body.job_title || null,
        is_primary: body.is_primary ?? false,
        owner_user_id: body.owner_user_id || auth.userId,
      };

      if (body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_contacts").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        const { data, error } = await db.from("sales_contacts").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_contacts").insert({ ...record, created_by_user_id: auth.userId }).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-contacts error:", err);
    return errorResponse(500, "Internal error");
  }
});
