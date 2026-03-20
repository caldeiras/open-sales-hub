import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function: sales-commercial-proxy
 * 
 * Proxies requests to the CORE Commercial project (zkjrcenhemnnlmjiysbc).
 * - Validates JWT from Identity project (macmkfoknhofnwhizsqc)
 * - Uses service_role_key of Commercial project for writes
 * - Uses anon key for reads (RLS allows anon SELECT)
 * 
 * Request body:
 *   { table: string, operation: "select"|"insert"|"update"|"delete", filters?: object, data?: object, select?: string, order?: { column: string, ascending?: boolean } }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate Identity JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const identityUrl = Deno.env.get("IDENTITY_SUPABASE_URL")!;
    const identityAnonKey = Deno.env.get("IDENTITY_SUPABASE_ANON_KEY")!;
    const identityClient = createClient(identityUrl, identityAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await identityClient.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Invalid identity token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.user.id;
    const userEmail = claims.user.email;

    // 2. Parse request
    const body = await req.json();
    const { table, operation, filters, data, select, order } = body;

    if (!table || !operation) {
      return new Response(JSON.stringify({ error: "Missing table or operation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow sales_* tables
    if (!table.startsWith("sales_")) {
      return new Response(JSON.stringify({ error: "Access denied: only sales_* tables allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Connect to Commercial project
    const commercialUrl = Deno.env.get("COMMERCIAL_SUPABASE_URL")!;
    const commercialServiceKey = Deno.env.get("COMMERCIAL_SERVICE_ROLE_KEY")!;

    // Use service role for writes, anon for reads
    const commercialKey = operation === "select"
      ? Deno.env.get("COMMERCIAL_SUPABASE_ANON_KEY")!
      : commercialServiceKey;

    const commercialClient = createClient(commercialUrl, commercialKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4. Execute operation
    let result: any;

    switch (operation) {
      case "select": {
        let query = commercialClient.from(table).select(select || "*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        result = await query;
        break;
      }

      case "insert": {
        if (!data) {
          return new Response(JSON.stringify({ error: "Missing data for insert" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Inject owner context
        const insertData = { ...data, created_by: userId };
        result = await commercialClient.from(table).insert(insertData).select();
        break;
      }

      case "update": {
        if (!data || !filters?.id) {
          return new Response(JSON.stringify({ error: "Missing data or id for update" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await commercialClient.from(table).update(data).eq("id", filters.id).select();
        break;
      }

      case "delete": {
        if (!filters?.id) {
          return new Response(JSON.stringify({ error: "Missing id for delete" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await commercialClient.from(table).delete().eq("id", filters.id);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown operation: ${operation}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message, details: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result.data, user_id: userId, email: userEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sales-commercial-proxy error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
