import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseAnonKey, supabaseUrl } from '@/constants/config';
import type { Database } from '@/lib/supabase/types';

let client: SupabaseClient<Database> | null = null;

/** Browser/device client. Uses the anon key only. AI keys never live here. */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
