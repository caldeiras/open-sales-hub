import { createClient } from '@supabase/supabase-js';

const CORE_OPEN_URL = import.meta.env.VITE_CORE_OPEN_URL;
const CORE_OPEN_ANON_KEY = import.meta.env.VITE_CORE_OPEN_ANON_KEY;

export const coreOpen = createClient(CORE_OPEN_URL, CORE_OPEN_ANON_KEY, {
  auth: { persistSession: false },
});
