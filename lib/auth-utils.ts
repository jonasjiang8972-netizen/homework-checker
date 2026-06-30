import { getServerSession } from 'next-auth';
import { getSupabaseAdmin } from './supabase';
import { decrypt } from './encryption';

export async function getApiKey(): Promise<string | null> {
  const session = await getServerSession();
  if (!session?.user?.email) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from('user_settings')
    .select('anthropic_key_encrypted')
    .eq('user_id', session.user.email)
    .single();

  if (!data?.anthropic_key_encrypted) return null;

  return decrypt(data.anthropic_key_encrypted);
}

export async function getUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.email || null;
}
