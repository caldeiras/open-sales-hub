import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCommercialClient, errorResponse, jsonResponse } from "../_shared/sales-auth.ts";

/**
 * Playbook Execution Engine — runs on schedule or on-demand.
 * Processes active executions where next_execution_at <= now().
 * Creates activities, advances steps, schedules next execution.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // This function can be called by cron (no auth) or by admin (with auth)
    const db = getCommercialClient();
    const now = new Date().toISOString();

    // Fetch due executions
    const { data: dueExecs, error: fetchErr } = await db
      .from("sales_playbook_executions")
      .select("*")
      .eq("status", "active")
      .lte("next_execution_at", now)
      .limit(50);

    if (fetchErr) return errorResponse(500, fetchErr.message);
    if (!dueExecs || dueExecs.length === 0) return jsonResponse({ processed: 0 });

    let processed = 0;
    const errors: string[] = [];

    for (const exec of dueExecs) {
      try {
        // Get current step
        const { data: step } = await db.from("sales_playbook_steps")
          .select("*")
          .eq("playbook_id", exec.playbook_id)
          .eq("step_order", exec.current_step)
          .single();

        if (!step) {
          // No more steps — complete
          await db.from("sales_playbook_executions").update({
            status: "completed",
            completed_at: now,
          }).eq("id", exec.id);
          processed++;
          continue;
        }

        // Create activity from step
        const activity: any = {
          activity_type: step.type,
          subject: step.subject || `Playbook step ${step.step_order}: ${step.type}`,
          description: step.description || null,
          status: "pending",
          owner_user_id: exec.owner_user_id,
          created_by_user_id: exec.owner_user_id,
          execution_id: exec.id,
          step_id: step.id,
          auto_generated: true,
          due_at: now,
        };
        if (exec.account_id) activity.account_id = exec.account_id;
        if (exec.opportunity_id) activity.opportunity_id = exec.opportunity_id;
        if (exec.contact_id) activity.contact_id = exec.contact_id;

        await db.from("sales_activities").insert(activity);

        // Check next step
        const { data: nextStep } = await db.from("sales_playbook_steps")
          .select("step_order, delay_days")
          .eq("playbook_id", exec.playbook_id)
          .gt("step_order", exec.current_step)
          .order("step_order", { ascending: true })
          .limit(1)
          .single();

        if (nextStep) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (nextStep.delay_days || 0));
          await db.from("sales_playbook_executions").update({
            current_step: nextStep.step_order,
            next_execution_at: nextDate.toISOString(),
          }).eq("id", exec.id);
        } else {
          // Last step executed — complete
          await db.from("sales_playbook_executions").update({
            status: "completed",
            completed_at: now,
            current_step: exec.current_step + 1,
          }).eq("id", exec.id);
        }

        processed++;
      } catch (stepErr: any) {
        errors.push(`exec ${exec.id}: ${stepErr.message}`);
      }
    }

    return jsonResponse({ processed, errors: errors.length > 0 ? errors : undefined });
  } catch (err: any) {
    console.error("sales-playbook-engine error:", err);
    return errorResponse(500, "Internal error");
  }
});
