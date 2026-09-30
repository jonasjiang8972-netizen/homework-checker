import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { getDb, queryAll } from '../../../../lib/db';

/** 导出错题（供打印/另存 PDF）：?days=30&kp=知识点&subject=数学&limit=100 */
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('export-wrong', getClientIp(request), 10, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '0', 10) || 0;
  const kp = searchParams.get('kp');
  const subject = searchParams.get('subject');
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100));

  let sql = `SELECT id, question, subject, image_url, knowledge_point, error_type, grading_data, created_at
               FROM questions WHERE user_id = ? AND is_correct = 0`;
  const params: unknown[] = [userId];
  if (days > 0) {
    sql += ' AND created_at >= ?';
    params.push(new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace('T', ' '));
  }
  if (kp) { sql += ' AND knowledge_point = ?'; params.push(kp); }
  if (subject && subject !== '全部') { sql += ' AND subject = ?'; params.push(subject); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  await getDb();
  const rows = queryAll(sql, params).map((r) => {
    let g: Record<string, unknown> = {};
    try { g = JSON.parse((r.grading_data as string) || '{}'); } catch {}
    return {
      id: r.id,
      subject: r.subject,
      imageUrl: r.image_url,
      knowledgePoint: r.knowledge_point,
      errorType: r.error_type,
      createdAt: r.created_at,
      guidance: g.guidance ?? '',
      errorSpot: g.error_spot ?? '',
      correctSolution: g.correct_solution ?? '',
      analysis: g.analysis ?? '',
    };
  });

  return NextResponse.json({ items: rows, count: rows.length });
}
