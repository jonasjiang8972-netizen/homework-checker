import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.startsWith('your_')) {
    return null;
  }
  client = createClient(url, key);
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getSupabase();
    if (!c) {
      throw new Error('未配置 Supabase，请在 .env.local 填写 NEXT_PUBLIC_SUPABASE_URL 与 ANON_KEY');
    }
    return Reflect.get(c, prop);
  },
});