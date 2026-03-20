import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // IDENTITY project: macmkfoknhofnwhizsqc — auth, profiles, user_roles
  const identityUrl = Deno.env.get("IDENTITY_SUPABASE_URL");
  const identityAnonKey = Deno.env.get("IDENTITY_SUPABASE_ANON_KEY");

  // COMMERCIAL project: zkjrcenhemnnlmjiysbc — proposals, contracts, pricing
  const commercialUrl = Deno.env.get("COMMERCIAL_SUPABASE_URL");
  const commercialAnonKey = Deno.env.get("COMMERCIAL_SUPABASE_ANON_KEY");

  if (!identityUrl || !identityAnonKey) {
    return new Response(JSON.stringify({ error: "Identity credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    identityUrl,
    identityAnonKey,
    commercialUrl: commercialUrl || null,
    commercialAnonKey: commercialAnonKey || null,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
