/**
 * 学习趋势与周报所需的纯函数统计
 */

export interface QuestionRow {
  created_at: string; // ISO 或 SQLite "YYYY-MM-DD HH:MM:SS"（UTC）
  is_correct: number | boolean | null;
  error_type?: string | null;
  knowledge_point?: string | null;
  subject?: string | null;
}

export interface TrendPoint {
  /** 桶起始日期 YYYY-MM-DD（UTC） */
  date: string;
  total: number;
  correct: number;
  /** 0~100，无题目时为 null */
  accuracy: number | null;
}

export interface ErrorTypeCount {
  type: string;
  count: number;
}

const DAY_MS = 86_400_000;

export function parseDbTime(value: string): number {
  if (!value) return NaN;
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  return Date.parse(iso);
}

function dayStart(ts: number): number {
  return Math.floor(ts / DAY_MS) * DAY_MS;
}

function fmt(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * 按天或按周把最近 `days` 天的做题记录聚合成趋势点（包含没有题目的空桶，方便画连续折线）。
 * 周桶以周一为起点。
 */
export function buildTrend(
  rows: QuestionRow[],
  days: number,
  granularity: 'day' | 'week',
  now: number = Date.now(),
): TrendPoint[] {
  const end = dayStart(now);
  const start = end - (days - 1) * DAY_MS;

  const bucketOf = (ts: number): number => {
    const d = dayStart(ts);
    if (granularity === 'day') return d;
    const weekday = (new Date(d).getUTCDay() + 6) % 7; // 周一 = 0
    return d - weekday * DAY_MS;
  };

  const buckets = new Map<number, { total: number; correct: number }>();
  const step = granularity === 'day' ? DAY_MS : 7 * DAY_MS;
  for (let b = bucketOf(start); b <= bucketOf(end); b += step) {
    buckets.set(b, { total: 0, correct: 0 });
  }

  for (const row of rows) {
    const ts = parseDbTime(row.created_at);
    if (Number.isNaN(ts) || ts < start || ts >= end + DAY_MS) continue;
    const b = buckets.get(bucketOf(ts));
    if (!b) continue;
    b.total++;
    if (row.is_correct) b.correct++;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, v]) => ({
      date: fmt(ts),
      total: v.total,
      correct: v.correct,
      accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : null,
    }));
}

/** 错误类型分布（仅统计答错且有类型的题），按次数降序 */
export function errorTypeDistribution(rows: QuestionRow[]): ErrorTypeCount[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.is_correct) continue;
    const t = (r.error_type || '').trim();
    if (!t || t === '全部正确') continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export interface PeriodSummary {
  total: number;
  correct: number;
  accuracy: number | null;
}

export function summarize(rows: QuestionRow[], fromTs: number, toTs: number): PeriodSummary {
  let total = 0;
  let correct = 0;
  for (const r of rows) {
    const ts = parseDbTime(r.created_at);
    if (Number.isNaN(ts) || ts < fromTs || ts >= toTs) continue;
    total++;
    if (r.is_correct) correct++;
  }
  return { total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : null };
}
