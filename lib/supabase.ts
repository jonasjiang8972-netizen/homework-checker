import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

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

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.startsWith('your_')) {
    return null;
  }
  adminClient = createClient(url, key);
  return adminClient;
}

const STORAGE_BUCKET = 'question-images';

export async function uploadImage(bytes: Buffer, filename: string, contentType: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const path = `${Date.now()}_${filename}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
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