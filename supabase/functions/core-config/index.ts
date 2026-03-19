import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const coreUrl = Deno.env.get("CORE_SUPABASE_URL");
  const coreAnonKey = Deno.env.get("CORE_SUPABASE_ANON_KEY");

  if (!coreUrl || !coreAnonKey) {
    return new Response(JSON.stringify({ error: "CORE credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Anon keys are publishable/public — safe to return to the frontend
  return new Response(JSON.stringify({ url: coreUrl, anonKey: coreAnonKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
