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
      const id = url.searchParams.get("id");

      if (id) {
        // Single opportunity with joins
        let query = db.from("sales_opportunities").select(`
          *, account:sales_accounts(id, name),
          stage:sales_pipeline_stages(id, stage_name, stage_order, color),
          loss_reason:sales_loss_reasons(id, reason_name)
        `).eq("id", id);
        query = applyOwnershipFilter(query, auth);
        const { data, error } = await query.single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      // List
      let query = db.from("sales_opportunities").select(`
        *, account:sales_accounts(id, name),
        stage:sales_pipeline_stages(id, stage_name, stage_order, color)
      `);
      query = applyOwnershipFilter(query, auth);

      const stageId = url.searchParams.get("pipeline_stage_id");
      const status = url.searchParams.get("status");
      const accountId = url.searchParams.get("account_id");
      if (stageId) query = query.eq("pipeline_stage_id", stageId);
      if (status) query = query.eq("status", status);
      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const record = {
        account_id: body.account_id,
        title: body.title,
        pipeline_stage_id: body.pipeline_stage_id,
        owner_user_id: body.owner_user_id || auth.userId,
        amount: body.amount || null,
        monthly_value: body.monthly_value || null,
        close_date: body.close_date || null,
        status: body.status || "open",
        temperature: body.temperature || null,
        loss_reason_id: body.loss_reason_id || null,
        notes: body.notes || null,
      };

      if (body.id) {
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_opportunities").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        const { data, error } = await db.from("sales_opportunities").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_opportunities").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-opportunities error:", err);
    return errorResponse(500, "Internal error");
  }
});
