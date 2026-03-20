import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let instance: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/**
 * Returns a Supabase client for the CORE COMMERCIAL project (zkjrcenhemnnlmjiysbc).
 * 
 * Use this client for commercial domain data owned by the CORE:
 *  - proposals / contracts / pricing (when consuming from CORE)
 * 
 * ⚠️ IMPORTANT: The JWT from the identity project does NOT automatically
 * authenticate on this project. Operations that require auth on the commercial
 * project must go through Edge Functions that use a service role key.
 * 
 * For SALES-owned tables (sales_*), use the LOCAL supabase client instead.
 */
export async function getCommercialClient(): Promise<SupabaseClient> {
  if (instance) return instance;
  if (pending) return pending;

  pending = (async () => {
    const { data, error } = await supabase.functions.invoke('core-config');

    if (error || !data?.commercialUrl || !data?.commercialAnonKey) {
      throw new Error(
        'Failed to load COMMERCIAL config: ' + (error?.message || 'missing commercialUrl/commercialAnonKey')
      );
    }

    instance = createClient(data.commercialUrl, data.commercialAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return instance;
  })();

  return pending;
}
