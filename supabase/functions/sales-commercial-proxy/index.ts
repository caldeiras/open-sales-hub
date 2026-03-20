import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, validateIdentityJwt, errorResponse, jsonResponse,
} from "../_shared/sales-auth.ts";

/**
 * Edge Function: sales-commercial-proxy
 * 
 * Proxies requests to the Commercial project for config tables (sales_pipeline_stages, etc.).
 * - Validates JWT from Identity project
 * - Uses COMMERCIAL_SERVICE_ROLE_KEY for operations
 * - Only allows sales_* tables
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate Identity JWT
    const auth = await validateIdentityJwt(req);

    // Parse request
    const body = await req.json();
    const { table, operation, filters, data, select, order } = body;

    if (!table || !operation) {
      return errorResponse(400, "Missing table or operation");
    }

    // Only allow sales_* tables
    if (!table.startsWith("sales_")) {
      return errorResponse(403, "Access denied: only sales_* tables allowed");
    }

    // Connect to Commercial project
    const commercialUrl = Deno.env.get("COMMERCIAL_SUPABASE_URL")!;
    const commercialServiceKey = Deno.env.get("COMMERCIAL_SERVICE_ROLE_KEY")!;

    const commercialClient = createClient(commercialUrl, commercialServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Execute operation
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
        if (!data) return errorResponse(400, "Missing data for insert");
        const insertData = { ...data, created_by: auth.userId };
        result = await commercialClient.from(table).insert(insertData).select();
        break;
      }

      case "update": {
        if (!data || !filters?.id) return errorResponse(400, "Missing data or id for update");
        result = await commercialClient.from(table).update(data).eq("id", filters.id).select();
        break;
      }

      case "delete": {
        if (!filters?.id) return errorResponse(400, "Missing id for delete");
        result = await commercialClient.from(table).delete().eq("id", filters.id);
        break;
      }

      default:
        return errorResponse(400, `Unknown operation: ${operation}`);
    }

    if (result.error) {
      return errorResponse(400, result.error.message);
    }

    return jsonResponse({ data: result.data, user_id: auth.userId, email: auth.email });
  } catch (err: any) {
    if (err.status) return errorResponse(err.status, err.message);
    console.error("sales-commercial-proxy error:", err);
    return errorResponse(500, "Internal error");
  }
});
