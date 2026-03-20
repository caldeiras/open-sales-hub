import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let instance: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/**
 * Returns a Supabase client for the COMMERCIAL project (zkjrcenhemnnlmjiysbc).
 * Used for RBAC tables (roles, permissions, user_roles) and commercial data.
 * Credentials fetched from core-config Edge Function.
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

    instance = createClient(data.commercialUrl, data.commercialAnonKey);
    return instance;
  })();

  return pending;
}
