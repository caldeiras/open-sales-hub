import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  isAdmin: boolean;
  isManager: boolean;
  isCommercial: boolean;
}

const COMMERCIAL_ROLES = ["admin", "gerente_comercial", "comercial"];

/**
 * Decode JWT payload without verification (validation is done by getUser).
 */
function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload || {};
  } catch {
    return {};
  }
}

/**
 * Returns a Supabase client for the local Lovable Cloud project (RBAC tables).
 */
function getLocalClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Resolve roles from multiple sources:
 * 1. Local RBAC tables (canonical source)
 * 2. app_metadata.roles (fallback)
 * 3. JWT custom claims (fallback)
 */
async function resolveRoles(
  user: any,
  jwtPayload: Record<string, any>
): Promise<{ roles: string[]; permissions: string[] }> {
  // Source 1: Local RBAC tables (canonical)
  try {
    const localDb = getLocalClient();
    const { data: localRoles, error: rolesErr } = await localDb.rpc("rbac_get_user_roles", { p_user_id: user.id });

    if (!rolesErr && Array.isArray(localRoles) && localRoles.length > 0) {
      console.log("[sales-auth] Roles from local RBAC:", localRoles);
      const { data: localPerms } = await commercialDb.rpc("rbac_get_user_permissions", { p_user_id: user.id });
      return { roles: localRoles, permissions: Array.isArray(localPerms) ? localPerms : [] };
    }
    console.log("[sales-auth] No local RBAC roles found, checking fallbacks");
  } catch (err: any) {
    console.warn("[sales-auth] Local RBAC lookup failed:", err?.message);
  }

  // Source 2: app_metadata
  const meta = user.app_metadata || {};
  if (Array.isArray(meta.roles) && meta.roles.length > 0) {
    console.log("[sales-auth] Roles from app_metadata.roles:", meta.roles);
    return { roles: meta.roles, permissions: [] };
  }
  if (typeof meta.role === "string" && meta.role) {
    console.log("[sales-auth] Role from app_metadata.role:", meta.role);
    return { roles: [meta.role], permissions: [] };
  }

  // Source 3: JWT custom claims
  const claimRoles = jwtPayload.user_roles || jwtPayload.roles;
  if (Array.isArray(claimRoles) && claimRoles.length > 0) {
    console.log("[sales-auth] Roles from JWT claims:", claimRoles);
    return { roles: claimRoles, permissions: [] };
  }
  if (typeof claimRoles === "string" && claimRoles) {
    return { roles: [claimRoles], permissions: [] };
  }

  return { roles: [], permissions: [] };
}

/**
 * Validates the Identity JWT and resolves roles from local RBAC.
 */
export async function validateIdentityJwt(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing authorization header" };
  }

  const identityUrl = Deno.env.get("IDENTITY_SUPABASE_URL")!;
  const identityAnonKey = Deno.env.get("IDENTITY_SUPABASE_ANON_KEY")!;

  const identityClient = createClient(identityUrl, identityAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error } = await identityClient.auth.getUser(token);
  if (error || !userData?.user) {
    console.error("[sales-auth] getUser failed:", error?.message);
    throw { status: 401, message: "Invalid identity token" };
  }

  const user = userData.user;
  const jwtPayload = decodeJwtPayload(token);
  console.log("[sales-auth] User authenticated:", user.id, user.email);

  const { roles, permissions } = await resolveRoles(user, jwtPayload);
  console.log("[sales-auth] Final resolved roles:", roles, "permissions:", permissions.length);

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("gerente_comercial");
  const isCommercial = roles.includes("comercial");

  if (!COMMERCIAL_ROLES.some((r) => roles.includes(r))) {
    console.error("[sales-auth] BLOCKED - no commercial role. User:", user.id, "Roles:", roles);
    throw {
      status: 403,
      message: `User lacks commercial role. Found roles: [${roles.join(", ")}]. Required one of: ${COMMERCIAL_ROLES.join(", ")}`,
    };
  }

  return { userId: user.id, email: user.email!, roles, permissions, isAdmin, isManager, isCommercial };
}

/**
 * Returns a Supabase client for the Commercial project using service_role_key.
 */
export function getCommercialClient() {
  return createClient(
    Deno.env.get("COMMERCIAL_SUPABASE_URL")!,
    Deno.env.get("COMMERCIAL_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Check if user has a specific permission via local RBAC.
 */
export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const commercialDb = getCommercialClient();
    const { data } = await commercialDb.rpc("rbac_user_has_permission", {
      p_user_id: userId,
      p_permission: permission,
    });
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Log an audit event.
 */
export async function logAudit(
  userId: string,
  entityType: string,
  action: string,
  opts?: { entityId?: string; description?: string; meta?: Record<string, any> }
) {
  try {
    const localDb = getLocalClient();
    await localDb.from("audit_logs").insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: opts?.entityId || null,
      action,
      description: opts?.description || null,
      meta: opts?.meta || {},
    });
  } catch (err: any) {
    console.error("[sales-auth] Audit log failed:", err?.message);
  }
}

/**
 * Applies ownership filter with team-based visibility for managers.
 */
export async function applyOwnershipFilter(
  query: any,
  auth: AuthContext,
  ownerColumn = "owner_user_id"
) {
  if (auth.isAdmin) return query;

  if (auth.isManager) {
    const db = getCommercialClient();
    const { data: teams = [] } = await db.from("sales_teams")
      .select("id").eq("manager_user_id", auth.userId).eq("active", true);
    
    if (teams.length > 0) {
      const teamIds = teams.map((t: any) => t.id);
      const { data: members = [] } = await db.from("sales_team_members")
        .select("user_id").in("team_id", teamIds).eq("active", true);
      
      const visibleIds = [auth.userId, ...members.map((m: any) => m.user_id)];
      const uniqueIds = [...new Set(visibleIds)];
      return query.in(ownerColumn, uniqueIds);
    }
    return query.eq(ownerColumn, auth.userId);
  }

  return query.eq(ownerColumn, auth.userId);
}

/**
 * Check if user has territory access.
 */
export async function validateTerritoryAccess(
  auth: AuthContext,
  _context?: { segment_id?: string }
): Promise<{ allowed: boolean; reason?: string }> {
  if (auth.isAdmin || auth.isManager) return { allowed: true };

  const db = getCommercialClient();
  const { data: assignments = [] } = await db.from("sales_territory_assignments")
    .select("territory_id, priority")
    .eq("owner_user_id", auth.userId)
    .eq("active", true);

  if (assignments.length === 0) {
    return { allowed: false, reason: "FORBIDDEN_TERRITORY" };
  }

  return { allowed: true };
}

/**
 * Check for duplicate account by document_number or website.
 */
export async function checkDuplicateAccount(
  db: any,
  documentNumber?: string | null,
  website?: string | null,
  excludeId?: string
): Promise<{ isDuplicate: boolean; field?: string; existingId?: string }> {
  if (documentNumber && documentNumber.trim()) {
    let q = db.from("sales_accounts").select("id").eq("document_number", documentNumber.trim());
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (data) return { isDuplicate: true, field: "document_number", existingId: data.id };
  }

  if (website && website.trim()) {
    let q = db.from("sales_accounts").select("id").eq("website", website.trim());
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (data) return { isDuplicate: true, field: "website", existingId: data.id };
  }

  return { isDuplicate: false };
}

export function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
