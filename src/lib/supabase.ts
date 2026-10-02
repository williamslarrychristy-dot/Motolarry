import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = "oqzifncuhmahxjkrmdbl";
const PUBLISHABLE_KEY = "sb_publishable_gyvM3Tu67aGURaHScXTTGQ_PdHADGpV";

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
    if (error && error.message.includes('does not exist')) {
      console.warn('Database tables initialized or pending schema execution.');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
