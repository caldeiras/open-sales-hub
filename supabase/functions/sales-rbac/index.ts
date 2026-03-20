import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, validateIdentityJwt, errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * RBAC Management Edge Function
 * 
 * Actions (POST body.action):
 *   my-context       — returns current user's roles + permissions
 *   list-roles       — list all roles (admin/rbac.view)
 *   list-permissions  — list all permissions (admin/rbac.view)
 *   list-users-roles  — list users with their roles (admin/rbac.view)
 *   role-permissions  — list permissions for a role (admin/rbac.view)
 *   assign-role       — assign role to user (admin only)
 *   remove-role       — remove role from user (admin only)
 * 
 * All operations validate Identity JWT first.
 * Admin check uses local RBAC RPCs (SECURITY DEFINER).
 */

function getLocalClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await validateIdentityJwt(req);
    const db = getLocalClient();
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || "my-context";

    // ===== MY CONTEXT (any authenticated user) =====
    if (action === "my-context") {
      const { data: roles } = await db.rpc("rbac_get_user_roles", { p_user_id: auth.userId });
      const { data: permissions } = await db.rpc("rbac_get_user_permissions", { p_user_id: auth.userId });
      return jsonResponse({
        user_id: auth.userId,
        email: auth.email,
        roles: roles || [],
        permissions: permissions || [],
      });
    }

    // ===== ADMIN-ONLY ACTIONS =====
    const hasRbacView = await db.rpc("rbac_user_has_permission", { p_user_id: auth.userId, p_permission: "rbac.view" });
    const hasRbacManage = await db.rpc("rbac_user_has_permission", { p_user_id: auth.userId, p_permission: "rbac.manage" });

    // Read operations require rbac.view
    if (["list-roles", "list-permissions", "list-users-roles", "role-permissions"].includes(action)) {
      if (!hasRbacView.data) {
        return errorResponse(403, "User lacks permission: rbac.view");
      }
    }

    // Write operations require rbac.manage
    if (["assign-role", "remove-role"].includes(action)) {
      if (!hasRbacManage.data) {
        return errorResponse(403, "User lacks permission: rbac.manage");
      }
    }

    // ===== LIST ROLES =====
    if (action === "list-roles") {
      const { data, error } = await db.from("roles").select("*").order("name");
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    // ===== LIST PERMISSIONS =====
    if (action === "list-permissions") {
      const { data, error } = await db.from("permissions").select("*").order("module, key");
      if (error) return errorResponse(400, error.message);
      return jsonResponse(data);
    }

    // ===== LIST USERS WITH ROLES =====
    if (action === "list-users-roles") {
      const { data, error } = await db
        .from("user_roles")
        .select("id, user_id, is_active, assigned_at, assigned_by, role:roles(id, name, label)")
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      if (error) return errorResponse(400, error.message);

      // Group by user_id
      const userMap: Record<string, any> = {};
      for (const ur of data || []) {
        if (!userMap[ur.user_id]) {
          userMap[ur.user_id] = { user_id: ur.user_id, roles: [] };
        }
        userMap[ur.user_id].roles.push(ur.role);
      }
      return jsonResponse(Object.values(userMap));
    }

    // ===== ROLE PERMISSIONS =====
    if (action === "role-permissions") {
      const roleId = body.role_id;
      if (!roleId) return errorResponse(400, "role_id required");
      const { data, error } = await db
        .from("role_permissions")
        .select("permission:permissions(id, key, label, module)")
        .eq("role_id", roleId);
      if (error) return errorResponse(400, error.message);
      return jsonResponse((data || []).map((rp: any) => rp.permission));
    }

    // ===== ASSIGN ROLE =====
    if (action === "assign-role") {
      const { target_user_id, role_name } = body;
      if (!target_user_id || !role_name) return errorResponse(400, "target_user_id and role_name required");

      const { error } = await db.rpc("rbac_assign_role", {
        p_actor_user_id: auth.userId,
        p_target_user_id: target_user_id,
        p_role: role_name,
      });
      if (error) return errorResponse(400, error.message);
      return jsonResponse({ success: true, message: `Role ${role_name} assigned` });
    }

    // ===== REMOVE ROLE =====
    if (action === "remove-role") {
      const { target_user_id, role_name } = body;
      if (!target_user_id || !role_name) return errorResponse(400, "target_user_id and role_name required");

      const { error } = await db.rpc("rbac_remove_role", {
        p_actor_user_id: auth.userId,
        p_target_user_id: target_user_id,
        p_role: role_name,
      });
      if (error) return errorResponse(400, error.message);
      return jsonResponse({ success: true, message: `Role ${role_name} removed` });
    }

    return errorResponse(400, `Unknown action: ${action}`);
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-rbac error:", err);
    return errorResponse(500, "Internal error");
  }
});
