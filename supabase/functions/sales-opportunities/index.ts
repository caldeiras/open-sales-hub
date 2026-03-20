import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  applyOwnershipFilter, validateTerritoryAccess,
  errorResponse, jsonResponse,
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
        let query = db.from("sales_opportunities").select(`
          *, account:sales_accounts(id, name),
          stage:sales_pipeline_stages(id, stage_name, stage_order, color),
          loss_reason:sales_loss_reasons(id, reason_name)
        `).eq("id", id);
        query = await applyOwnershipFilter(query, auth);
        const { data, error } = await query.single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      let query = db.from("sales_opportunities").select(`
        *, account:sales_accounts(id, name),
        stage:sales_pipeline_stages(id, stage_name, stage_order, color)
      `);
      query = await applyOwnershipFilter(query, auth);

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

      // Validate probability
      if (body.probability_percent !== undefined && body.probability_percent !== null) {
        if (body.probability_percent < 0 || body.probability_percent > 100) {
          return errorResponse(400, "probability_percent must be between 0 and 100");
        }
      }

      let probability = body.probability_percent ?? null;
      if (body.status === "won") probability = 100;
      if (body.status === "lost") probability = 0;

      if (body.status === "lost" && !body.loss_reason_id) {
        return errorResponse(400, "loss_reason_id is required when status is lost");
      }

      const amount = body.amount ? Number(body.amount) : null;
      const weighted = (amount && probability !== null) ? Math.round(amount * probability / 100 * 100) / 100 : null;

      let expectedCloseMonth = body.expected_close_month || null;
      if (expectedCloseMonth) {
        const d = new Date(expectedCloseMonth);
        if (!isNaN(d.getTime())) {
          expectedCloseMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        }
      }

      // Owner: inherit from account if not set, fallback to auth user
      let ownerUserId = body.owner_user_id || auth.userId;
      if (!body.owner_user_id && body.account_id) {
        const { data: acc } = await db.from("sales_accounts").select("owner_user_id").eq("id", body.account_id).single();
        if (acc?.owner_user_id) ownerUserId = acc.owner_user_id;
      }

      const record = {
        account_id: body.account_id,
        title: body.title,
        pipeline_stage_id: body.pipeline_stage_id,
        owner_user_id: ownerUserId,
        amount,
        monthly_value: body.monthly_value || null,
        close_date: body.close_date || null,
        status: body.status || "open",
        temperature: body.temperature || null,
        loss_reason_id: body.loss_reason_id || null,
        notes: body.notes || null,
        probability_percent: probability,
        weighted_amount: weighted,
        expected_close_month: expectedCloseMonth,
        proposal_id: body.proposal_id || null,
        proposal_external_id: body.proposal_external_id || null,
        proposal_number: body.proposal_number || null,
        contract_type: body.contract_type || null,
        billing_cycle: body.billing_cycle || null,
        mrr: body.mrr !== undefined ? (body.mrr ? Number(body.mrr) : null) : undefined,
        tcv: body.tcv !== undefined ? (body.tcv ? Number(body.tcv) : null) : undefined,
        contract_start_date: body.contract_start_date || null,
        contract_end_date: body.contract_end_date || null,
        is_expansion: body.is_expansion || false,
        is_renewal: body.is_renewal || false,
        is_churn: body.is_churn || false,
      };

      if (body.id) {
        // UPDATE
        if (!auth.isAdmin && !auth.isManager) {
          const { data: existing } = await db.from("sales_opportunities").select("owner_user_id").eq("id", body.id).single();
          if (existing?.owner_user_id !== auth.userId) return errorResponse(403, "Not your record");
        }
        const { data, error } = await db.from("sales_opportunities").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        // CREATE — territory enforcement
        const territory = await validateTerritoryAccess(auth);
        if (!territory.allowed) {
          return errorResponse(403, territory.reason || "FORBIDDEN_TERRITORY");
        }

        if (!record.title) return errorResponse(400, "title is required");
        if (!record.account_id) return errorResponse(400, "account_id is required");

        const { data, error } = await db.from("sales_opportunities").insert({ ...record, created_by_user_id: auth.userId }).select().single();
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
