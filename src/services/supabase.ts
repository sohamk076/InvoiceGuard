import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase credentials are not configured or set to placeholder in .env.',
    };
  }

  try {
    const { error } = await supabase.from('vendors').select('count', { count: 'exact', head: true });
    if (error) {
      return {
        configured: true,
        connected: false,
        message: 'Connected to Supabase, but query to table "vendors" returned an error.',
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      message: 'Successfully verified live connection to Supabase PostgreSQL database.',
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      message: 'Network error connecting to Supabase host.',
      error: err?.message || String(err),
    };
  }
}
