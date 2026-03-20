import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    if (!auth.isAdmin && !auth.isManager) return errorResponse(403, "Only admin/manager can manage playbook steps");

    const db = getCommercialClient();

    if (req.method === "GET") {
      const url = new URL(req.url);
      const playbookId = url.searchParams.get("playbook_id");
      if (!playbookId) return errorResponse(400, "playbook_id required");

      const { data, error } = await db.from("sales_playbook_steps")
        .select("*, template:sales_templates(id, name, type)")
        .eq("playbook_id", playbookId)
        .order("step_order", { ascending: true });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Batch upsert: if body.steps is an array, replace all steps for the playbook
      if (body.steps && Array.isArray(body.steps) && body.playbook_id) {
        // Delete existing and re-insert
        await db.from("sales_playbook_steps").delete().eq("playbook_id", body.playbook_id);
        const records = body.steps.map((s: any, i: number) => ({
          playbook_id: body.playbook_id,
          step_order: i + 1,
          type: s.type,
          delay_days: s.delay_days ?? 0,
          delay_hours: s.delay_hours ?? 0,
          template_id: s.template_id || null,
          subject: s.subject || null,
          description: s.description || null,
          required: s.required ?? true,
        }));
        const { data, error } = await db.from("sales_playbook_steps").insert(records).select();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }

      // Single upsert
      const record: any = {
        playbook_id: body.playbook_id,
        step_order: body.step_order || 1,
        type: body.type,
        delay_days: body.delay_days ?? 0,
        template_id: body.template_id || null,
        subject: body.subject || null,
        description: body.description || null,
        required: body.required ?? true,
      };

      if (body.id) {
        const { data, error } = await db.from("sales_playbook_steps").update(record).eq("id", body.id).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data);
      } else {
        const { data, error } = await db.from("sales_playbook_steps").insert(record).select().single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse(data, 201);
      }
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-playbook-steps error:", err);
    return errorResponse(500, "Internal error");
  }
});
