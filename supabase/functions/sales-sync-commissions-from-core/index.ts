import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Syncs commissions from CORE into sales_commissions (cache/mirror).
 * Only admin/manager can trigger.
 * Uses external_reference for deduplication.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);

    if (!auth.isAdmin && !auth.isManager) {
      return errorResponse(403, "Only admin/manager can sync commissions");
    }

    if (req.method !== "POST") return errorResponse(405, "Method not allowed");

    const body = await req.json();
    const { period_month } = body;

    // Connect to CORE project to read commissions
    const coreUrl = Deno.env.get("CORE_SUPABASE_URL");
    const coreAnonKey = Deno.env.get("CORE_SUPABASE_ANON_KEY");

    if (!coreUrl || !coreAnonKey) {
      return errorResponse(500, "CORE credentials not configured");
    }

    const coreClient = createClient(coreUrl, coreAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch commissions from CORE
    // Adapt this query to the actual CORE commissions table schema
    let coreQuery = coreClient.from("commissions").select("*");
    if (period_month) {
      coreQuery = coreQuery.eq("period_month", period_month);
    }

    const { data: coreCommissions, error: coreErr } = await coreQuery;

    if (coreErr) {
      console.error("Failed to fetch CORE commissions:", coreErr);
      return errorResponse(502, "Failed to fetch commissions from CORE: " + coreErr.message);
    }

    if (!coreCommissions || coreCommissions.length === 0) {
      return jsonResponse({ synced: 0, skipped: 0, message: "No commissions found in CORE" });
    }

    const db = getCommercialClient();
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const cc of coreCommissions) {
      const extRef = `core_${cc.id}`;

      // Check if already synced
      const { data: existing } = await db
        .from("sales_commissions")
        .select("id")
        .eq("external_reference", extRef)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const record: any = {
        owner_user_id: cc.user_id || cc.owner_user_id,
        commission_period_month: cc.period_month || cc.commission_period_month,
        commission_amount: cc.amount || cc.commission_amount || 0,
        commission_type: cc.commission_type || cc.type || "new",
        source: "core",
        external_reference: extRef,
        status: "synced",
        opportunity_id: cc.opportunity_id || null,
        revenue_event_id: cc.revenue_event_id || null,
      };

      const { error: insertErr } = await db
        .from("sales_commissions")
        .insert(record);

      if (insertErr) {
        errors.push(`${extRef}: ${insertErr.message}`);
      } else {
        synced++;
      }
    }

    return jsonResponse({
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total_core: coreCommissions.length,
    });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-sync-commissions-from-core error:", err);
    return errorResponse(500, "Internal error");
  }
});
