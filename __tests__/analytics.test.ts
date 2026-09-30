import { describe, it, expect } from 'vitest';
import { buildTrend, errorTypeDistribution, summarize } from '../lib/analytics';
import { buildWeeklyReport, renderReportHtml, renderReportText } from '../lib/report';

const NOW = Date.parse('2026-08-05T12:00:00Z'); // 周三
const iso = (d: string) => `${d}T10:00:00Z`;

describe('buildTrend', () => {
  const rows = [
    { created_at: iso('2026-08-05'), is_correct: 1 },
    { created_at: iso('2026-08-05'), is_correct: 0 },
    { created_at: '2026-08-03 08:00:00', is_correct: 1 }, // SQLite UTC 格式
    { created_at: iso('2026-07-01'), is_correct: 1 }, // 窗口外
  ];
  it('按天聚合并补齐空桶', () => {
    const t = buildTrend(rows, 7, 'day', NOW);
    expect(t).toHaveLength(7);
    expect(t.at(-1)).toMatchObject({ date: '2026-08-05', total: 2, correct: 1, accuracy: 50 });
    expect(t.find((p) => p.date === '2026-08-03')).toMatchObject({ total: 1, accuracy: 100 });
    expect(t.find((p) => p.date === '2026-08-04')).toMatchObject({ total: 0, accuracy: null });
  });
  it('按周聚合以周一为起点', () => {
    const t = buildTrend(rows, 14, 'week', NOW);
    expect(t.every((p) => new Date(p.date).getUTCDay() === 1)).toBe(true);
    expect(t.reduce((s, p) => s + p.total, 0)).toBe(3);
  });
});

describe('errorTypeDistribution', () => {
  it('只统计答错题并降序', () => {
    const d = errorTypeDistribution([
      { created_at: '', is_correct: 0, error_type: '计算失误' },
      { created_at: '', is_correct: 0, error_type: '计算失误' },
      { created_at: '', is_correct: 0, error_type: '审题错误' },
      { created_at: '', is_correct: 1, error_type: '概念不清' },
      { created_at: '', is_correct: 0, error_type: '' },
    ]);
    expect(d).toEqual([{ type: '计算失误', count: 2 }, { type: '审题错误', count: 1 }]);
  });
});

describe('summarize / 周报', () => {
  const rows = [
    ...Array.from({ length: 4 }, () => ({ created_at: iso('2026-08-04'), is_correct: 1, error_type: '' })),
    { created_at: iso('2026-08-04'), is_correct: 0, error_type: '计算失误' },
    { created_at: iso('2026-08-04'), is_correct: 0, error_type: '计算失误' },
    { created_at: iso('2026-07-28'), is_correct: 1, error_type: '' },
    { created_at: iso('2026-07-28'), is_correct: 1, error_type: '' },
  ];
  it('summarize 区间与正确率', () => {
    expect(summarize(rows, NOW - 7 * 86_400_000, NOW + 1)).toEqual({ total: 6, correct: 4, accuracy: 67 });
  });
  it('周报包含对比、错误类型、薄弱点与建议', () => {
    const r = buildWeeklyReport(rows, [{ name: '一元二次方程', masteryLevel: 30 }], 2, NOW);
    expect(r.thisWeek.total).toBe(6);
    expect(r.lastWeek.accuracy).toBe(100);
    expect(r.accuracyChange).toBe(-33);
    expect(r.errorTypes[0]).toEqual({ type: '计算失误', count: 2 });
    expect(r.suggestions.join('')).toContain('一元二次方程');
    expect(r.suggestions.join('')).toContain('2 道错题');
  });
  it('无数据时给出鼓励做题的建议，渲染不含题目内容', () => {
    const r = buildWeeklyReport([], [], 0, NOW);
    expect(r.suggestions[0]).toContain('没有做题记录');
    expect(renderReportText(r)).toContain('学习周报');
    expect(renderReportHtml(r, '<b>小明</b>')).toContain('&lt;b&gt;小明&lt;/b&gt;');
  });
});
