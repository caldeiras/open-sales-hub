import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  isManager: boolean;
  isCommercial: boolean;
}

const COMMERCIAL_ROLES = ["admin", "gerente_comercial", "comercial"];

/**
 * Validates the Identity JWT and fetches roles from the Identity project.
 */
export async function validateIdentityJwt(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing authorization header" };
  }

  const identityUrl = Deno.env.get("IDENTITY_SUPABASE_URL")!;
  const identityAnonKey = Deno.env.get("IDENTITY_SUPABASE_ANON_KEY")!;

  // Client with user's JWT for getUser validation
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
  console.log("[sales-auth] User authenticated:", user.id, user.email);

  // Fetch roles — use service_role if available to bypass RLS on identity tables
  let roles: string[] = [];
  const identityServiceKey = Deno.env.get("IDENTITY_SERVICE_ROLE_KEY");
  const roleClient = identityServiceKey
    ? createClient(identityUrl, identityServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : identityClient;

  try {
    // Try profile lookup by auth user id first, then by email
    let profileId: string | null = null;

    const { data: profileById } = await roleClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileById) {
      profileId = profileById.id;
    } else {
      const { data: profileByEmail } = await roleClient
        .from("profiles")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      profileId = profileByEmail?.id || null;
    }

    console.log("[sales-auth] Profile lookup result:", profileId);

    if (profileId) {
      const { data: userRoles, error: rolesError } = await roleClient
        .from("user_roles")
        .select("role:roles(slug)")
        .eq("user_id", profileId);

      if (rolesError) {
        console.error("[sales-auth] Roles query error:", rolesError.message);
      } else {
        console.log("[sales-auth] Raw userRoles:", JSON.stringify(userRoles));
        roles = (userRoles || []).map((ur: any) => ur.role?.slug).filter(Boolean);
      }
    }
  } catch (err: any) {
    console.error("[sales-auth] Roles fetch exception:", err?.message || err);
  }

  console.log("[sales-auth] Resolved roles:", roles);

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("gerente_comercial");
  const isCommercial = roles.includes("comercial");

  if (!COMMERCIAL_ROLES.some((r) => roles.includes(r))) {
    console.error("[sales-auth] BLOCKED - no commercial role. User:", user.id, "Roles:", roles);
    throw {
      status: 403,
      message: `User lacks commercial role. Found roles: [${roles.join(", ")}]. Required: ${COMMERCIAL_ROLES.join(", ")}`,
    };
  }

  return { userId: user.id, email: user.email!, roles, isAdmin, isManager, isCommercial };
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
 * Applies ownership filter with team-based visibility for managers.
 * - admin: sees all
 * - gerente_comercial: sees own records + team members' records
 * - comercial: sees only own records
 */
export async function applyOwnershipFilter(
  query: any,
  auth: AuthContext,
  ownerColumn = "owner_user_id"
) {
  if (auth.isAdmin) return query;

  if (auth.isManager) {
    // Get team member user IDs managed by this manager
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
    // Manager with no teams: see own only
    return query.eq(ownerColumn, auth.userId);
  }

  return query.eq(ownerColumn, auth.userId);
}

/**
 * Check if user has territory access for a given account/segment.
 * Returns true if admin/manager or if user is assigned to a territory.
 * For comercial users, validates against sales_territory_assignments.
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

  // User has at least one territory assigned — allowed
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
