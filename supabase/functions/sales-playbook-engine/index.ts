import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * Playbook Execution Engine — runs on schedule or on-demand.
 * Processes active executions ordered by priority DESC, next_execution_at ASC.
 * Uses last_execution_at as a lock to prevent race conditions.
 * Creates activities using snapshot templates, advances steps.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = getCommercialClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // Fetch due executions ordered by priority then time
    const { data: dueExecs, error: fetchErr } = await db
      .from("sales_playbook_executions")
      .select("*")
      .eq("status", "active")
      .lte("next_execution_at", nowIso)
      .order("priority", { ascending: false })
      .order("next_execution_at", { ascending: true })
      .limit(50);

    if (fetchErr) return errorResponse(500, fetchErr.message);
    if (!dueExecs || dueExecs.length === 0) return jsonResponse({ processed: 0 });

    let processed = 0;
    const errors: string[] = [];

    for (const exec of dueExecs) {
      try {
        // Race-condition lock: skip if already processed within last 60s
        if (exec.last_execution_at) {
          const lastExec = new Date(exec.last_execution_at).getTime();
          if (now.getTime() - lastExec < 60_000) continue;
        }

        // Mark as being processed (optimistic lock)
        const { error: lockErr } = await db.from("sales_playbook_executions")
          .update({ last_execution_at: nowIso })
          .eq("id", exec.id)
          .eq("status", "active");
        if (lockErr) { errors.push(`lock ${exec.id}: ${lockErr.message}`); continue; }

        // Get current step with snapshot
        const { data: step } = await db.from("sales_playbook_steps")
          .select("*")
          .eq("playbook_id", exec.playbook_id)
          .eq("step_order", exec.current_step)
          .single();

        if (!step) {
          await db.from("sales_playbook_executions").update({
            status: "completed", completed_at: nowIso,
          }).eq("id", exec.id);
          processed++;
          continue;
        }

        // Use snapshot if available, fall back to step fields
        const actSubject = step.snapshot_subject || step.subject || `Playbook step ${step.step_order}: ${step.type}`;
        const actDesc = step.snapshot_body || step.description || null;

        // Create activity
        const activity: any = {
          activity_type: step.type,
          subject: actSubject,
          description: actDesc,
          status: "pending",
          owner_user_id: exec.owner_user_id,
          created_by_user_id: exec.owner_user_id,
          execution_id: exec.id,
          step_id: step.id,
          auto_generated: true,
          due_at: nowIso,
          opportunity_id: exec.opportunity_id,
        };
        if (exec.account_id) activity.account_id = exec.account_id;
        if (exec.contact_id) activity.contact_id = exec.contact_id;

        const { error: actErr } = await db.from("sales_activities").insert(activity);
        if (actErr) {
          // Mark as failed if activity creation fails
          await db.from("sales_playbook_executions").update({ status: "failed" }).eq("id", exec.id);
          errors.push(`activity ${exec.id}: ${actErr.message}`);
          continue;
        }

        // Advance to next step
        const { data: nextStep } = await db.from("sales_playbook_steps")
          .select("step_order, delay_days, delay_hours")
          .eq("playbook_id", exec.playbook_id)
          .gt("step_order", exec.current_step)
          .order("step_order", { ascending: true })
          .limit(1)
          .single();

        if (nextStep) {
          const delayMs = ((nextStep.delay_days || 0) * 24 + (nextStep.delay_hours || 0)) * 3600000;
          const nextDate = new Date(now.getTime() + delayMs);
          await db.from("sales_playbook_executions").update({
            current_step: nextStep.step_order,
            next_execution_at: nextDate.toISOString(),
          }).eq("id", exec.id);
        } else {
          await db.from("sales_playbook_executions").update({
            status: "completed",
            completed_at: nowIso,
            current_step: exec.current_step + 1,
          }).eq("id", exec.id);
        }

        processed++;
      } catch (stepErr: any) {
        errors.push(`exec ${exec.id}: ${stepErr.message}`);
        // Mark failed on unexpected errors
        try {
          await db.from("sales_playbook_executions").update({ status: "failed" }).eq("id", exec.id);
        } catch (_) { /* best effort */ }
      }
    }

    return jsonResponse({ processed, errors: errors.length > 0 ? errors : undefined });
  } catch (err: any) {
    console.error("sales-playbook-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
