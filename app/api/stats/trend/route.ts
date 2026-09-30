import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { getDb, queryAll } from '../../../../lib/db';
import { buildTrend, errorTypeDistribution, type QuestionRow } from '../../../../lib/analytics';

/** 学习趋势：?days=30&granularity=day|week&subject=数学 */
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: '请先登录后再查看学习统计' }, { status: 401 });

  if (!(await checkRateLimit('stats-trend', getClientIp(request), 20, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(180, Math.max(7, parseInt(searchParams.get('days') || '30', 10) || 30));
  const granularity = searchParams.get('granularity') === 'week' ? 'week' : 'day';
  const subject = searchParams.get('subject');

  await getDb();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  let sql = 'SELECT created_at, is_correct, error_type, knowledge_point, subject FROM questions WHERE user_id = ? AND created_at >= ?';
  const params: unknown[] = [userId, since];
  if (subject && subject !== '全部') {
    sql += ' AND subject = ?';
    params.push(subject);
  }
  const rows = queryAll(sql, params) as unknown as QuestionRow[];

  return NextResponse.json({
    days,
    granularity,
    trend: buildTrend(rows, days, granularity),
    errorTypes: errorTypeDistribution(rows),
    total: rows.length,
  });
}
