import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let coreClientInstance: SupabaseClient | null = null;
let coreClientPromise: Promise<SupabaseClient> | null = null;

/**
 * Returns a Supabase client configured to use the CORE project.
 * All auth operations (signIn, signOut, getSession, getUser) MUST use this client.
 * The local Lovable Cloud client is ONLY for sales_* data tables.
 */
export async function getCoreClient(): Promise<SupabaseClient> {
  if (coreClientInstance) return coreClientInstance;

  if (coreClientPromise) return coreClientPromise;

  coreClientPromise = (async () => {
    const { data, error } = await supabase.functions.invoke('core-config');

    if (error || !data?.url || !data?.anonKey) {
      throw new Error('Failed to load CORE Supabase config: ' + (error?.message || 'missing url/anonKey'));
    }

    coreClientInstance = createClient(data.url, data.anonKey, {
      auth: {
        storage: localStorage,
        storageKey: 'sales-core-auth',
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return coreClientInstance;
  })();

  return coreClientPromise;
}
