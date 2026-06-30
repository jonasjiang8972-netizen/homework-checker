import { getUserId } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { execute, getDb } from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  if (!checkRateLimit('questions', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { data } = await query.single();
  if (!data) {
    return NextResponse.json({ error: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再删除题目' }, { status: 401 });
  }

  if (!checkRateLimit('questions', getClientIp(request), 10, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  await getDb();
  execute('DELETE FROM questions WHERE id = ? AND user_id = ?', [id, userId]);
  return NextResponse.json({ ok: true });
}

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再删除题目' }, { status: 401 });
  }

  if (!checkRateLimit('questions', getClientIp(request), 10, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
