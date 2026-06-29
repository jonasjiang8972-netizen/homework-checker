import { getSupabase } from '../../../../lib/supabase';
import { getUserId } from '../../../../lib/auth-utils';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库' }, { status: 503 });
  }

  const userId = await getUserId();
  let query = supabase.from('questions').select('*').eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: '题目不存在' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
