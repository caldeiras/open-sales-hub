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
          const { data: exec } = await db.from("sales_playbook_executions")
            .select("playbook_id, current_step").eq("id", body.id).single();
          if (exec) {
            const { data: step } = await db.from("sales_playbook_steps")
              .select("delay_days, delay_hours")
              .eq("playbook_id", exec.playbook_id).eq("step_order", exec.current_step).single();
            if (step) {
              const next = new Date();
              next.setTime(next.getTime() + ((step.delay_days || 0) * 24 + (step.delay_hours || 0)) * 3600000);
              updates.next_execution_at = next.toISOString();
            }
          }
        } else if (body.action === "cancel") {
          updates.status = "cancelled";
          updates.completed_at = new Date().toISOString();
        }

        if (!auth.isAdmin && !auth.isManager) {
          const { data: ex } = await db.from("sales_playbook_executions")
            .select("owner_user_id").eq("id", body.id).single();
          if (ex?.owner_user_id !== auth.userId) return errorResponse(403, "Not your execution");
        }

        const { data, error } = await db.from("sales_playbook_executions")
          .update(updates).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      }

      // Start new execution — opportunity_id required
      if (!body.playbook_id) return errorResponse(400, "playbook_id required");
      if (!body.opportunity_id) return errorResponse(400, "opportunity_id required");

      // Inherit owner from opportunity
      const { data: opp } = await db.from("sales_opportunities")
        .select("owner_user_id, account_id")
        .eq("id", body.opportunity_id).single();
      if (!opp) return errorResponse(404, "Opportunity not found");

      const ownerUserId = opp.owner_user_id || auth.userId;

      // Get first step and snapshot templates
      const { data: steps } = await db.from("sales_playbook_steps")
        .select("*, template:sales_templates(subject, body)")
        .eq("playbook_id", body.playbook_id)
        .order("step_order", { ascending: true });

      // Snapshot templates into steps
      if (steps && steps.length > 0) {
        for (const step of steps) {
          if (step.template && (!step.snapshot_subject || !step.snapshot_body)) {
            await db.from("sales_playbook_steps").update({
              snapshot_subject: step.template.subject || step.subject,
              snapshot_body: step.template.body || step.description,
            }).eq("id", step.id);
          }
        }
      }

      const firstStep = steps?.[0];
      const delayMs = firstStep
        ? ((firstStep.delay_days || 0) * 24 + (firstStep.delay_hours || 0)) * 3600000
        : 0;
      const nextExec = new Date(Date.now() + delayMs);

      const record = {
        playbook_id: body.playbook_id,
        opportunity_id: body.opportunity_id,
        account_id: body.account_id || opp.account_id || null,
        contact_id: body.contact_id || null,
        owner_user_id: ownerUserId,
        current_step: 1,
        status: "active",
        priority: body.priority || 1,
        next_execution_at: nextExec.toISOString(),
      };

      const { data, error } = await db.from("sales_playbook_executions")
        .insert(record).select().single();
      if (error) {
        // Unique violation = duplicate active playbook
        if (error.code === "23505") return errorResponse(409, "DUPLICATE_ACTIVE_PLAYBOOK");
        return errorResponse(400, error.message);
      }
      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-playbook-executions error:", err);
    return errorResponse(500, "Internal error");
  }
});
