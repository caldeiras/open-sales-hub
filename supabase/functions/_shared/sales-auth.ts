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
 * Returns the authenticated user context or throws.
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
    throw { status: 401, message: "Invalid identity token" };
  }

  const user = userData.user;

  // Fetch roles from Identity project
  let roles: string[] = [];
  try {
    const { data: profile } = await identityClient
      .from("profiles")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (profile) {
      const { data: userRoles } = await identityClient
        .from("user_roles")
        .select("role:roles(slug)")
        .eq("user_id", profile.id);

      if (userRoles) {
        roles = userRoles.map((ur: any) => ur.role?.slug).filter(Boolean);
      }
    }
  } catch {
    // Roles fetch failed — proceed with empty roles
  }

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("gerente_comercial");
  const isCommercial = roles.includes("comercial");

  // Block users without any commercial role
  if (!COMMERCIAL_ROLES.some((r) => roles.includes(r))) {
    throw { status: 403, message: "No commercial access" };
  }

  return {
    userId: user.id,
    email: user.email!,
    roles,
    isAdmin,
    isManager,
    isCommercial,
  };
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
 * Applies ownership filter: commercial users see only their own records.
 * admin and gerente_comercial see everything.
 */
export function applyOwnershipFilter(
  query: any,
  auth: AuthContext,
  ownerColumn = "owner_user_id"
) {
  if (auth.isAdmin || auth.isManager) return query;
  return query.eq(ownerColumn, auth.userId);
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
