'use client';

import { useEffect, useState } from 'react';

interface TrendPoint { date: string; total: number; correct: number; accuracy: number | null }
interface ErrorTypeCount { type: string; count: number }

const W = 320;
const H = 120;
const PAD = { l: 28, r: 8, t: 8, b: 20 };

export function TrendPanel({ subject }: { subject: string }) {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [errorTypes, setErrorTypes] = useState<ErrorTypeCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      days: range === 'week' ? '7' : '30',
      granularity: 'day',
    });
    if (subject && subject !== '全部') params.set('subject', subject);
    fetch(`/api/stats/trend?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || json.error) return;
        setTrend(json.trend || []);
        setErrorTypes(json.errorTypes || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, subject]);

  const total = trend.reduce((s, p) => s + p.total, 0);
  const correct = trend.reduce((s, p) => s + p.correct, 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : null;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (trend.length <= 1 ? plotW / 2 : (i / (trend.length - 1)) * plotW);
  const y = (v: number) => PAD.t + plotH - (v / 100) * plotH;

  // 无题目的日期断开折线，避免把空缺画成 0%
  const segments: string[] = [];
  let cur: string[] = [];
  trend.forEach((p, i) => {
    if (p.accuracy === null) {
      if (cur.length) segments.push(cur.join(' '));
      cur = [];
    } else {
      cur.push(`${x(i).toFixed(1)},${y(p.accuracy).toFixed(1)}`);
    }
  });
  if (cur.length) segments.push(cur.join(' '));

  const maxErr = Math.max(1, ...errorTypes.map((e) => e.count));

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <span style={styles.title}>学习趋势</span>
        <div style={styles.toggle}>
          {(['week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{ ...styles.toggleBtn, ...(range === r ? styles.toggleBtnActive : {}) }}
            >{r === 'week' ? '近 7 天' : '近 30 天'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.muted}>加载中...</div>
      ) : total === 0 ? (
        <div style={styles.muted}>这段时间还没有做题记录</div>
      ) : (
        <>
          <div style={styles.kpis}>
            <div><b style={styles.kpiNum}>{total}</b><span style={styles.kpiLabel}> 题</span></div>
            <div><b style={styles.kpiNum}>{acc}%</b><span style={styles.kpiLabel}> 正确率</span></div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="每日正确率折线图">
            {[0, 50, 100].map((g) => (
              <g key={g}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="#eef0f4" />
                <text x={PAD.l - 4} y={y(g) + 3} fontSize="9" fill="#8e95a2" textAnchor="end">{g}</text>
              </g>
            ))}
            {segments.map((pts, i) => (
              <polyline key={i} points={pts} fill="none" stroke="#4f6ef7" strokeWidth="2" strokeLinejoin="round" />
            ))}
            {trend.map((p, i) =>
              p.accuracy === null ? null : (
                <circle key={p.date} cx={x(i)} cy={y(p.accuracy)} r="3" fill="#4f6ef7">
                  <title>{`${p.date}：${p.correct}/${p.total}（${p.accuracy}%）`}</title>
                </circle>
              ),
            )}
            {[0, trend.length - 1].map((i) =>
              trend[i] ? (
                <text key={i} x={x(i)} y={H - 4} fontSize="9" fill="#8e95a2" textAnchor={i === 0 ? 'start' : 'end'}>
                  {trend[i].date.slice(5)}
                </text>
              ) : null,
            )}
          </svg>

          {errorTypes.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={styles.subTitle}>错误类型分布</div>
              {errorTypes.map((e) => (
                <div key={e.type} style={styles.errRow}>
                  <span style={styles.errName}>{e.type}</span>
                  <div style={styles.errBarBg}>
                    <div style={{ ...styles.errBar, width: `${(e.count / maxErr) * 100}%` }} />
                  </div>
                  <span style={styles.errCount}>{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: 'white', border: '1px solid #eef0f4', borderRadius: '12px', padding: '14px', marginBottom: '16px' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  title: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  toggle: { display: 'flex', gap: '4px' },
  toggleBtn: { padding: '3px 10px', fontSize: '11px', color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  toggleBtnActive: { color: 'white', background: '#4f6ef7' },
  muted: { color: '#8e95a2', fontSize: '13px', textAlign: 'center', padding: '16px 0' },
  kpis: { display: 'flex', gap: '20px', marginBottom: '4px' },
  kpiNum: { fontSize: '20px', color: '#1a1a2e' },
  kpiLabel: { fontSize: '11px', color: '#8e95a2' },
  subTitle: { fontSize: '12px', color: '#8e95a2', marginBottom: '6px' },
  errRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  errName: { width: '64px', fontSize: '12px', color: '#333' },
  errBarBg: { flex: 1, height: '8px', background: '#eef0f4', borderRadius: '4px', overflow: 'hidden' },
  errBar: { height: '100%', background: '#e17055', borderRadius: '4px' },
  errCount: { width: '20px', fontSize: '12px', color: '#8e95a2', textAlign: 'right' },
};
