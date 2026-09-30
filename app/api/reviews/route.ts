import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { getDb, queryAll, queryOne, execute } from '../../../lib/db';
import { nextReview } from '../../../lib/srs';
import { calculateNewMastery } from '../../../lib/mastery';

/** 待复习的错题列表 + 数量 */
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('reviews', getClientIp(request), 30, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  await getDb();
  const nowIso = new Date().toISOString();
  const items = queryAll(
    `SELECT r.id, r.question_id, r.stage, r.next_review_at, r.knowledge_point,
            q.question, q.subject, q.image_url, q.error_type, q.grading_data
       FROM review_items r JOIN questions q ON q.id = r.question_id
      WHERE r.user_id = ? AND r.done = 0 AND r.next_review_at <= ?
      ORDER BY r.next_review_at ASC LIMIT 50`,
    [userId, nowIso],
  );
  const upcoming = queryOne(
    'SELECT COUNT(*) AS n FROM review_items WHERE user_id = ? AND done = 0 AND next_review_at > ?',
    [userId, nowIso],
  );

  return NextResponse.json({
    dueCount: items.length,
    upcomingCount: (upcoming?.n as number) ?? 0,
    items: items.map((it) => {
      let grading: Record<string, unknown> = {};
      try { grading = JSON.parse((it.grading_data as string) || '{}'); } catch {}
      return {
        id: it.id,
        questionId: it.question_id,
        stage: it.stage,
        nextReviewAt: it.next_review_at,
        knowledgePoint: it.knowledge_point,
        question: it.question,
        subject: it.subject,
        imageUrl: it.image_url,
        errorType: it.error_type,
        guidance: grading.guidance ?? '',
        correctSolution: grading.correct_solution ?? '',
        analysis: grading.analysis ?? '',
      };
    }),
  });
}

/** 完成一次复习：{ id, remembered } */
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('reviews', getClientIp(request), 30, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  let body: { id?: string; remembered?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  if (!body.id || typeof body.remembered !== 'boolean') {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  await getDb();
  const item = queryOne(
    'SELECT id, stage, knowledge_point, done FROM review_items WHERE id = ? AND user_id = ?',
    [body.id, userId],
  );
  if (!item || item.done) return NextResponse.json({ error: '复习项不存在' }, { status: 404 });

  const state = nextReview(item.stage as number, body.remembered);
  execute(
    `UPDATE review_items SET stage = ?, next_review_at = ?, done = ?, last_result = ?, updated_at = datetime('now') WHERE id = ?`,
    [state.stage, state.nextReviewAt, state.done ? 1 : 0, body.remembered ? 1 : 0, item.id],
  );

  // 复习结果同步进掌握度
  if (item.knowledge_point) {
    const kp = queryOne(
      'SELECT id, mastery_level, total_count, correct_count FROM knowledge_points WHERE name = ? AND user_id = ?',
      [item.knowledge_point, userId],
    );
    if (kp) {
      const total = (kp.total_count as number) ?? 0;
      execute(
        `UPDATE knowledge_points SET mastery_level = ?, total_count = ?, correct_count = ?, last_practiced_at = datetime('now') WHERE id = ?`,
        [
          calculateNewMastery((kp.mastery_level as number) ?? 50, body.remembered, total),
          total + 1,
          ((kp.correct_count as number) ?? 0) + (body.remembered ? 1 : 0),
          kp.id,
        ],
      );
    }
  }

  return NextResponse.json({ ok: true, done: state.done, nextReviewAt: state.nextReviewAt, stage: state.stage });
}
