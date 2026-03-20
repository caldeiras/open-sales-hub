import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the LOCAL Supabase to validate the JWT (user is authenticated here)
    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const localClient = createClient(localUrl, localServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await localClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect to CORE Supabase to read profiles/roles
    const coreUrl = Deno.env.get("IDENTITY_SUPABASE_URL");
    const coreAnonKey = Deno.env.get("IDENTITY_SUPABASE_ANON_KEY");

    if (!coreUrl || !coreAnonKey) {
      // Fallback: if CORE credentials not set, return minimal context
      return new Response(JSON.stringify({
        user_id: user.id,
        email: user.email,
        profile: null,
        roles: [],
        core_connected: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coreClient = createClient(coreUrl, coreAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Read profile from CORE by user email (cross-project lookup)
    const { data: profile } = await coreClient
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    let roles: string[] = [];

    if (profile) {
      // Read user_roles from CORE using the CORE profile's user_id
      const { data: userRoles } = await coreClient
        .from("user_roles")
        .select("role:roles(slug, name)")
        .eq("user_id", profile.id || profile.user_id);

      if (userRoles) {
        roles = userRoles
          .map((ur: any) => ur.role?.slug || ur.role?.name)
          .filter(Boolean);
      }
    }

    return new Response(JSON.stringify({
      user_id: user.id,
      email: user.email,
      profile: profile || null,
      roles,
      core_connected: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("core-auth-context error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
