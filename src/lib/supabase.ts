import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = "oqzifncuhmahxjkrmdbl";
const PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xemlmbmN1aG1haHhqa3JtZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTcxNzYsImV4cCI6MjEwNTM3MzE3Nn0.-nyTJXlgqcIrgRBDh6pNzLdxA2Zp0S4WRZR_unQbcCc";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  `https://${PROJECT_ID}.supabase.co`;

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function ensureTablesExist(): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error && (error.message?.includes('does not exist') || error.code === 'PGRST205')) {
      console.warn('Database tables initialized or pending schema execution.');
      return false;
    }
    return !error;
  } catch {
    return false;
  }
}
