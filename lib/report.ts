import {
  errorTypeDistribution,
  parseDbTime,
  summarize,
  type ErrorTypeCount,
  type PeriodSummary,
  type QuestionRow,
} from './analytics';

/**
 * 家长周报：只含汇总信息（做题数、正确率变化、薄弱点、错误类型），不含题目原文与图片，
 * 与"家长通知仅汇总"的隐私约定一致。
 */

export interface WeakPoint {
  name: string;
  masteryLevel: number;
}

export interface WeeklyReport {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  thisWeek: PeriodSummary;
  lastWeek: PeriodSummary;
  /** 正确率变化（百分点），任一周无数据时为 null */
  accuracyChange: number | null;
  errorTypes: ErrorTypeCount[];
  weakPoints: WeakPoint[];
  reviewDue: number;
  suggestions: string[];
}

const WEEK_MS = 7 * 86_400_000;

function fmt(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function buildWeeklyReport(
  rows: QuestionRow[],
  weakPoints: WeakPoint[],
  reviewDue: number,
  now: number = Date.now(),
): WeeklyReport {
  const thisWeek = summarize(rows, now - WEEK_MS, now + 1);
  const lastWeek = summarize(rows, now - 2 * WEEK_MS, now - WEEK_MS);
  const accuracyChange =
    thisWeek.accuracy !== null && lastWeek.accuracy !== null ? thisWeek.accuracy - lastWeek.accuracy : null;

  const weekRows = rows.filter((r) => {
    const t = parseDbTime(r.created_at);
    return !Number.isNaN(t) && t >= now - WEEK_MS;
  });
  const errorTypes = errorTypeDistribution(weekRows).slice(0, 3);
  const weak = [...weakPoints].sort((a, b) => a.masteryLevel - b.masteryLevel).slice(0, 3);

  const suggestions: string[] = [];
  if (thisWeek.total === 0) {
    suggestions.push('本周还没有做题记录，建议每天安排 10~15 分钟的作业检查。');
  } else {
    if (thisWeek.total < 5) suggestions.push('本周练习量偏少，可以适当增加每日的练习题数。');
    if (accuracyChange !== null && accuracyChange <= -10) {
      suggestions.push(`正确率比上周下降了 ${Math.abs(accuracyChange)} 个百分点，建议和孩子一起回顾本周错题。`);
    }
    if (accuracyChange !== null && accuracyChange >= 10) {
      suggestions.push(`正确率比上周提升了 ${accuracyChange} 个百分点，别忘了鼓励孩子。`);
    }
    if (errorTypes[0]?.type === '计算失误') suggestions.push('错误多为计算失误，可以让孩子养成写完后检验的习惯。');
    if (errorTypes[0]?.type === '审题错误') suggestions.push('审题错误较多，建议做题前先圈出关键词与条件。');
    if (errorTypes[0]?.type === '概念不清') suggestions.push('概念性错误较多，建议先回顾课本例题再做练习。');
  }
  if (weak.length > 0) suggestions.push(`重点巩固：${weak.map((w) => w.name).join('、')}。`);
  if (reviewDue > 0) suggestions.push(`还有 ${reviewDue} 道错题到了复习时间，抽空复习效果最好。`);

  return {
    periodStart: fmt(now - WEEK_MS),
    periodEnd: fmt(now),
    thisWeek,
    lastWeek,
    accuracyChange,
    errorTypes,
    weakPoints: weak,
    reviewDue,
    suggestions,
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderReportText(r: WeeklyReport, studentName = '孩子'): string {
  const lines = [
    `${studentName}的学习周报（${r.periodStart} ~ ${r.periodEnd}）`,
    `本周做题 ${r.thisWeek.total} 道，正确率 ${r.thisWeek.accuracy ?? '-'}%` +
      (r.accuracyChange !== null ? `（较上周 ${r.accuracyChange >= 0 ? '+' : ''}${r.accuracyChange}%）` : ''),
  ];
  if (r.errorTypes.length) lines.push('主要错误类型：' + r.errorTypes.map((e) => `${e.type}×${e.count}`).join('、'));
  if (r.weakPoints.length) lines.push('薄弱知识点：' + r.weakPoints.map((w) => `${w.name}(${w.masteryLevel})`).join('、'));
  if (r.suggestions.length) lines.push('建议：', ...r.suggestions.map((s) => `- ${s}`));
  return lines.join('\n');
}

export function renderReportHtml(r: WeeklyReport, studentName = '孩子'): string {
  const acc = r.thisWeek.accuracy;
  const change =
    r.accuracyChange === null
      ? ''
      : `<span style="color:${r.accuracyChange >= 0 ? '#00b894' : '#d63031'};font-size:13px">较上周 ${
          r.accuracyChange >= 0 ? '+' : ''
        }${r.accuracyChange}%</span>`;
  const list = (items: string[]) =>
    items.length ? `<ul style="padding-left:18px;margin:6px 0">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';

  return `<div style="font-family:sans-serif;max-width:520px;padding:20px;color:#1a1a2e">
  <h2 style="margin:0 0 4px">作业小帮手 · 学习周报</h2>
  <p style="color:#8e95a2;font-size:13px;margin:0 0 16px">${esc(studentName)} · ${r.periodStart} ~ ${r.periodEnd}</p>
  <div style="display:flex;gap:12px;margin-bottom:16px">
    <div style="flex:1;background:#f5f7ff;border-radius:12px;padding:12px;text-align:center">
      <div style="font-size:26px;font-weight:700">${r.thisWeek.total}</div><div style="font-size:12px;color:#8e95a2">本周做题</div></div>
    <div style="flex:1;background:#f5f7ff;border-radius:12px;padding:12px;text-align:center">
      <div style="font-size:26px;font-weight:700">${acc === null ? '-' : acc + '%'}</div>
      <div style="font-size:12px;color:#8e95a2">正确率 ${change}</div></div>
  </div>
  ${r.errorTypes.length ? `<h4 style="margin:12px 0 4px">主要错误类型</h4>${list(r.errorTypes.map((e) => `${e.type}：${e.count} 题`))}` : ''}
  ${r.weakPoints.length ? `<h4 style="margin:12px 0 4px">薄弱知识点</h4>${list(r.weakPoints.map((w) => `${w.name}（掌握度 ${w.masteryLevel}）`))}` : ''}
  ${r.suggestions.length ? `<h4 style="margin:12px 0 4px">给家长的建议</h4>${list(r.suggestions)}` : ''}
  <p style="color:#8e95a2;font-size:12px;margin-top:20px">本邮件仅含汇总数据，不含题目与图片。可在「设置」中关闭周报。</p>
</div>`;
}
