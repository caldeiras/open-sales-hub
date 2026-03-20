import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders, validateIdentityJwt, getCommercialClient,
  errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * RBAC Management Edge Function — calls RPCs on commercial/core-open project.
 *
 * Actions (POST body.action):
 *   my-context        — returns current user's roles + permissions (local RBAC)
 *   list-roles        — get_roles() on commercial DB
 *   list-permissions   — get_permissions() on commercial DB
 *   list-users-roles   — get_user_roles_raw() on commercial DB
 *   role-permissions   — permissions for a specific role (commercial DB)
 *   assign-role        — assign_role(user_id, role_id) on commercial DB
 *   remove-role        — remove_role(user_id, role_id) on commercial DB
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getCommercialClient();
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || "my-context";

    // ===== MY CONTEXT (any authenticated user) =====
    if (action === "my-context") {
      return jsonResponse({
        user_id: auth.userId,
        email: auth.email,
        roles: auth.roles,
        permissions: auth.permissions,
      });
    }

    // ===== Permission checks =====
    const isAdmin = auth.roles.includes("admin");
    const hasRbacView = isAdmin || auth.permissions.includes("rbac.view");
    const hasRbacManage = isAdmin || auth.permissions.includes("rbac.manage");

    if (["list-roles", "list-permissions", "list-users-roles", "role-permissions"].includes(action)) {
      if (!hasRbacView) return errorResponse(403, "User lacks permission: rbac.view");
    }

    if (["assign-role", "remove-role"].includes(action)) {
      if (!hasRbacManage) return errorResponse(403, "User lacks permission: rbac.manage");
    }

    // ===== LIST ROLES (RPC on commercial) =====
    if (action === "list-roles") {
      const { data, error } = await db.rpc("get_roles");
      if (error) {
        console.error("[sales-rbac] get_roles error:", error.message);
        return errorResponse(400, error.message);
      }
      return jsonResponse(data || []);
    }

    // ===== LIST PERMISSIONS (RPC on commercial) =====
    if (action === "list-permissions") {
      const { data, error } = await db.rpc("get_permissions");
      if (error) {
        console.error("[sales-rbac] get_permissions error:", error.message);
        return errorResponse(400, error.message);
      }
      return jsonResponse(data || []);
    }

    // ===== LIST USERS WITH ROLES (RPC on commercial) =====
    if (action === "list-users-roles") {
      const { data, error } = await db.rpc("get_user_roles_raw");
      if (error) {
        console.error("[sales-rbac] get_user_roles_raw error:", error.message);
        return errorResponse(400, error.message);
      }
      // Group by user_id for the frontend
      const raw = data || [];
      const userMap: Record<string, any> = {};
      for (const row of raw) {
        const uid = row.user_id;
        if (!userMap[uid]) {
          userMap[uid] = { user_id: uid, roles: [] };
        }
        userMap[uid].roles.push({
          id: row.role_id,
          name: row.role_name,
          label: row.role_label || row.role_name,
        });
      }
      return jsonResponse(Object.values(userMap));
    }

    // ===== ROLE PERMISSIONS =====
    if (action === "role-permissions") {
      const roleId = body.role_id;
      if (!roleId) return errorResponse(400, "role_id required");
      // Try RPC first, fallback to table query
      const { data, error } = await db.rpc("get_role_permissions", { p_role_id: roleId });
      if (error) {
        console.error("[sales-rbac] get_role_permissions error:", error.message);
        return errorResponse(400, error.message);
      }
      return jsonResponse(data || []);
    }

    // ===== ASSIGN ROLE (RPC on commercial) =====
    if (action === "assign-role") {
      const { target_user_id, role_id, role_name } = body;
      if (!target_user_id) return errorResponse(400, "target_user_id required");
      if (!role_id && !role_name) return errorResponse(400, "role_id or role_name required");

      const { error } = await db.rpc("assign_role", {
        p_user_id: target_user_id,
        p_role_id: role_id || null,
      });
      if (error) {
        console.error("[sales-rbac] assign_role error:", error.message);
        return errorResponse(400, error.message);
      }
      return jsonResponse({ success: true, message: "Role assigned" });
    }

    // ===== REMOVE ROLE (RPC on commercial) =====
    if (action === "remove-role") {
      const { target_user_id, role_id, role_name } = body;
      if (!target_user_id) return errorResponse(400, "target_user_id required");
      if (!role_id && !role_name) return errorResponse(400, "role_id or role_name required");

      const { error } = await db.rpc("remove_role", {
        p_user_id: target_user_id,
        p_role_id: role_id || null,
      });
      if (error) {
        console.error("[sales-rbac] remove_role error:", error.message);
        return errorResponse(400, error.message);
      }
      return jsonResponse({ success: true, message: "Role removed" });
    }

    return errorResponse(400, `Unknown action: ${action}`);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-rbac error:", err);
    return errorResponse(500, "Internal error");
  }
});
