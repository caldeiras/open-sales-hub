import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  applyOwnershipFilter, errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Account ownership: list, assign, transfer with strong audit.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();

    if (req.method === "GET") {
      const url = new URL(req.url);
      const accountId = url.searchParams.get("account_id");

      let query = db.from("sales_account_ownership").select("*");
      if (accountId) query = query.eq("account_id", accountId);

      if (!auth.isAdmin && !auth.isManager) {
        query = query.eq("owner_user_id", auth.userId);
      }

      const onlyActive = url.searchParams.get("active") !== "false";
      if (onlyActive) query = query.eq("active", true);

      const { data, error } = await query.order("assigned_at", { ascending: false });
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "transfer") {
        const { account_id, new_owner_user_id, team_id, reason } = body;
        if (!account_id || !new_owner_user_id) {
          return errorResponse(400, "account_id and new_owner_user_id required");
        }

        // HARDENING: transfer_reason is mandatory
        if (!reason || !reason.trim()) {
          return errorResponse(400, "transfer_reason is required for transfers");
        }

        const { data: current } = await db.from("sales_account_ownership")
          .select("*").eq("account_id", account_id).eq("active", true).maybeSingle();

        if (current && !auth.isAdmin && !auth.isManager && current.owner_user_id !== auth.userId) {
          return errorResponse(403, "Not authorized to transfer this account");
        }

        // Cannot transfer to self
        if (current && current.owner_user_id === new_owner_user_id) {
          return errorResponse(400, "Cannot transfer account to current owner");
        }

        const record = {
          account_id,
          owner_user_id: new_owner_user_id,
          team_id: team_id || null,
          transferred_from: current?.owner_user_id || null,
          transfer_reason: reason.trim(),
          transferred_at: new Date().toISOString(),
          active: true,
        };

        const { data, error } = await db.from("sales_account_ownership")
          .insert(record).select().single();
        if (error) return errorResponse(400, error.message);

        // Sync owner_user_id on account
        await db.from("sales_accounts")
          .update({ owner_user_id: new_owner_user_id })
          .eq("id", account_id);

        return jsonResponse(data, 201);
      }

      // Assign (initial ownership)
      if (!auth.isAdmin && !auth.isManager) {
        return errorResponse(403, "Only admin/manager can assign ownership");
      }

      const { account_id, owner_user_id, team_id } = body;
      if (!account_id || !owner_user_id) {
        return errorResponse(400, "account_id and owner_user_id required");
      }

      const record = {
        account_id,
        owner_user_id,
        team_id: team_id || null,
        active: true,
      };

      const { data, error } = await db.from("sales_account_ownership")
        .insert(record).select().single();
      if (error) return errorResponse(400, error.message);

      await db.from("sales_accounts")
        .update({ owner_user_id }).eq("id", account_id);

      return jsonResponse(data, 201);
    }

    return errorResponse(405, "Method not allowed");
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-account-ownership error:", err);
    return errorResponse(500, "Internal error");
  }
});
