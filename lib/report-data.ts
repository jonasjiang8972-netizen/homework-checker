import { getDb, queryAll, queryOne } from './db';
import { buildWeeklyReport, type WeeklyReport } from './report';
import type { QuestionRow } from './analytics';

/** 从数据库为某个学生生成周报（user_id 为 users.id） */
export async function loadWeeklyReport(userId: string, now: number = Date.now()): Promise<WeeklyReport> {
  await getDb();
  const since = new Date(now - 14 * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  const rows = queryAll(
    'SELECT created_at, is_correct, error_type, knowledge_point, subject FROM questions WHERE user_id = ? AND created_at >= ?',
    [userId, since],
  ) as unknown as QuestionRow[];

  const weak = queryAll(
    'SELECT name, mastery_level FROM knowledge_points WHERE user_id = ? AND mastery_level < 40 ORDER BY mastery_level ASC LIMIT 3',
    [userId],
  ).map((r) => ({ name: r.name as string, masteryLevel: r.mastery_level as number }));

  const due = queryOne(
    'SELECT COUNT(*) AS n FROM review_items WHERE user_id = ? AND done = 0 AND next_review_at <= ?',
    [userId, new Date(now).toISOString()],
  );

  return buildWeeklyReport(rows, weak, (due?.n as number) ?? 0, now);
}
