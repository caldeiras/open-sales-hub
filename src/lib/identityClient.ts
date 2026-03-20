import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let instance: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/**
 * Returns a Supabase client for the CORE IDENTITY project (macmkfoknhofnwhizsqc).
 * 
 * ALL auth operations MUST use this client:
 *  - signInWithPassword / signUp / signOut
 *  - getSession / getUser
 *  - profiles table
 *  - user_roles / roles tables
 *  - RBAC helpers (hasRole, hasAnyRole)
 * 
 * NEVER use this client for sales_* or commercial domain tables.
 */
export async function getIdentityClient(): Promise<SupabaseClient> {
  if (instance) return instance;
  if (pending) return pending;

  pending = (async () => {
    const { data, error } = await supabase.functions.invoke('core-config');

    if (error || !data?.identityUrl || !data?.identityAnonKey) {
      throw new Error(
        'Failed to load IDENTITY config: ' + (error?.message || 'missing identityUrl/identityAnonKey')
      );
    }

    instance = createClient(data.identityUrl, data.identityAnonKey, {
      auth: {
        storage: localStorage,
        storageKey: 'sales-identity-auth',
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return instance;
  })();

  return pending;
}
