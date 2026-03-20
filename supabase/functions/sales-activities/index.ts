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
      let query = db.from("sales_activities").select(`
        *, account:sales_accounts(id, name),
        opportunity:sales_opportunities(id, title),
        contact:sales_contacts(id, full_name)
      `);
      query = applyOwnershipFilter(query, auth);

      const status = url.searchParams.get("status");
      const accountId = url.searchParams.get("account_id");
      const opportunityId = url.searchParams.get("opportunity_id");
      if (status) query = query.eq("status", status);
      if (accountId) query = query.eq("account_id", accountId);
      if (opportunityId) query = query.eq("opportunity_id", opportunityId);

      const { data, error } = await query.order("due_at", { ascending: true });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const record = {
        account_id: body.account_id || null,
        opportunity_id: body.opportunity_id || null,
        contact_id: body.contact_id || null,
        activity_type: body.activity_type,
        subject: body.subject,
        description: body.description || null,
        due_at: body.due_at || null,
        completed_at: body.completed_at || null,
        status: body.status || "pending",
        owner_user_id: body.owner_user_id || auth.userId,
        created_by_user_id: auth.userId,
      };

      if (body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_activities").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        // Don't overwrite created_by on update
        const { created_by_user_id, ...updateRecord } = record;
        const { data, error } = await db.from("sales_activities").update(updateRecord).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_activities").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-activities error:", err);
    return errorResponse(500, "Internal error");
  }
});
