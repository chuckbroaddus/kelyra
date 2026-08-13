export const appName = 'Kelyra';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 0;
}
