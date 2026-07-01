import { getUserId } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { execute, getDb, queryOne } from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再查看题目' }, { status: 401 });
  }

  if (!checkRateLimit('questions', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  await getDb();
  const row = queryOne('SELECT id, question, error_analysis, subject, image_url, knowledge_point, error_type, is_correct, created_at FROM questions WHERE id = ? AND user_id = ?', [id, userId]);

  if (!row) {
    return NextResponse.json({ error: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json({ data: row });
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
