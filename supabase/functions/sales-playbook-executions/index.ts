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
      const url = new URL(req.url);
      let query = db.from("sales_playbook_executions")
        .select("*, playbook:sales_playbooks(id, name)");
      query = await applyOwnershipFilter(query, auth);

      const status = url.searchParams.get("status");
      const opportunityId = url.searchParams.get("opportunity_id");
      if (status) query = query.eq("status", status);
      if (opportunityId) query = query.eq("opportunity_id", opportunityId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Action: pause / resume / cancel
      if (body.action && body.id) {
        const updates: any = {};
        if (body.action === "pause") updates.status = "paused";
        else if (body.action === "resume") {
          updates.status = "active";
          // Recalculate next_execution_at
          const { data: exec } = await db.from("sales_playbook_executions").select("playbook_id, current_step").eq("id", body.id).single();
          if (exec) {
            const { data: step } = await db.from("sales_playbook_steps")
              .select("delay_days").eq("playbook_id", exec.playbook_id).eq("step_order", exec.current_step).single();
            if (step) {
              const next = new Date();
              next.setDate(next.getDate() + (step.delay_days || 0));
              updates.next_execution_at = next.toISOString();
            }
          }
        } else if (body.action === "cancel") {
          updates.status = "cancelled";
          updates.completed_at = new Date().toISOString();
        }

        if (!auth.isAdmin && !auth.isManager) {
          const { data: ex } = await db.from("sales_playbook_executions").select("owner_user_id").eq("id", body.id).single();
          if (ex?.owner_user_id !== auth.userId) return errorResponse(403, "Not your execution");
        }

        const { data, error } = await db.from("sales_playbook_executions").update(updates).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      // Start new execution
      if (!body.playbook_id) return errorResponse(400, "playbook_id required");

      // Get first step to set next_execution_at
      const { data: firstStep } = await db.from("sales_playbook_steps")
        .select("delay_days").eq("playbook_id", body.playbook_id).order("step_order", { ascending: true }).limit(1).single();

      const nextExec = new Date();
      if (firstStep) nextExec.setDate(nextExec.getDate() + (firstStep.delay_days || 0));

      const record = {
        playbook_id: body.playbook_id,
        opportunity_id: body.opportunity_id || null,
        account_id: body.account_id || null,
        contact_id: body.contact_id || null,
        owner_user_id: body.owner_user_id || auth.userId,
        current_step: 1,
        status: "active",
        next_execution_at: nextExec.toISOString(),
      };

      const { data, error } = await db.from("sales_playbook_executions").insert(record).select().single();
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-playbook-executions error:", err);
    return errorResponse(500, "Internal error");
  }
});
